/**
 * THE LEDGER DOOR — pushes finished takes into the live voice ledger.
 *
 *   npx tsx tools/voice/import.mts                 every actor with files
 *   npx tsx tools/voice/import.mts tinker_fen ...  just these actors
 *     --api <url>   game server dev API (default http://localhost:8790)
 *     --dry         say what would happen, touch nothing
 *
 * For each manifest line it looks for a take in voicework/ — a human
 * recording in recorded/<actor>/ ALWAYS outranks the Chatterbox file in
 * generated/<actor>/ — and then:
 *   clips   PUT /dev/content/voice/clips/<id>   (content-addressed, deduped)
 *   banks   PUT /dev/content/voice/banks/actor/<id>  from the quip slate
 *   lines   node.voice refs written INTO the authored dialogue JSON defs
 *           (packages/content/src/dialogues/defs) as one-line inserts —
 *           never through the dialogue dev route, which would raise a
 *           tool-owned twin over every shipped tree and shadow future
 *           authored edits. The watching dev server reseeds on save.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest, orderedActors, REPO, type ManifestLine, type QuipSlot } from './lib.mts';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const dry = ((): boolean => {
  const i = args.indexOf('--dry');
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
})();
const api = flag('--api') ?? 'http://localhost:8790';

const VOICEWORK = join(REPO, 'voicework');
const EXTS = ['wav', 'ogg', 'opus', 'mp3', 'm4a', 'webm'];
const m = buildManifest();
const wanted = args.length > 0 ? args : orderedActors(m);

interface Take {
  path: string;
  ext: string;
  lane: 'recorded' | 'generated';
}
function findTake(l: ManifestLine): Take | undefined {
  for (const lane of ['recorded', 'generated'] as const) {
    for (const ext of EXTS) {
      const p = join(VOICEWORK, lane, l.actor, `${l.clipId}.${ext}`);
      if (existsSync(p)) return { path: p, ext, lane };
    }
  }
  return undefined;
}

function probeDurMs(path: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path,
  ]).toString().trim();
  const sec = Number(out);
  if (!Number.isFinite(sec) || sec <= 0) throw new Error(`ffprobe found no duration in ${path}`);
  return Math.round(sec * 1000);
}

async function putJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${api}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${await res.text()}`);
}

// Is the game server home?
try {
  await fetch(`${api}/dev/content/voice`);
} catch {
  console.error(`no game server dev API at ${api} — start the server first`);
  process.exit(1);
}

// ---- clips ---------------------------------------------------------
const uploaded = new Set<string>();
let humanTakes = 0;
for (const actor of wanted) {
  const lines = m.byActor.get(actor);
  if (!lines) {
    console.error(`unknown or lineless actor '${actor}'`);
    process.exit(1);
  }
  for (const line of lines) {
    const take = findTake(line);
    if (!take) continue;
    if (take.lane === 'recorded') humanTakes++;
    if (dry) {
      console.log(`would upload ${line.clipId} (${take.lane}/${take.ext})`);
      uploaded.add(line.clipId);
      continue;
    }
    const buf = readFileSync(take.path);
    await putJson(`/dev/content/voice/clips/${line.clipId}`, {
      id: line.clipId,
      ext: take.ext,
      durMs: probeDurMs(take.path),
      transcript: line.text,
      actor: line.actor,
      tags: [line.kind],
      dataB64: buf.toString('base64'),
    });
    uploaded.add(line.clipId);
    console.log(`✓ clip ${line.clipId} (${take.lane}, ${(buf.length / 1024).toFixed(0)}kB)`);
  }
}
if (uploaded.size === 0) {
  console.log('no takes found in voicework/ for the requested cast — nothing to import.');
  process.exit(0);
}

// ---- banks ---------------------------------------------------------
// The quip slate becomes the actor's fallback throat. The bark slot
// carries only the 'fill' breaths — verbatim ambient-line clips are
// found by transcript at the moment they're barked, never drawn blind.
for (const actor of wanted) {
  const slate = m.quips[actor];
  if (!slate) continue;
  const slots: Partial<Record<QuipSlot, Array<{ clip: string }>>> = {};
  for (const line of m.byActor.get(actor)!) {
    if (line.kind !== 'quip' || !uploaded.has(line.clipId)) continue;
    (slots[line.slot!] ??= []).push({ clip: line.clipId });
  }
  if (Object.keys(slots).length === 0) continue;
  if (dry) {
    console.log(`would save bank actor:${actor} (${Object.keys(slots).join(', ')})`);
    continue;
  }
  await putJson(`/dev/content/voice/banks/actor/${actor}`, {
    owner: { kind: 'actor', id: actor },
    slots,
  });
  console.log(`✓ bank actor:${actor} — slots ${Object.keys(slots).join(', ')}`);
}

// ---- authored voice refs -------------------------------------------
const DLG_DIR = join(REPO, 'packages/content/src/dialogues/defs');
const byDialogue = new Map<string, ManifestLine[]>();
for (const actor of wanted) {
  for (const line of m.byActor.get(actor)!) {
    if (line.kind !== 'node' || !uploaded.has(line.clipId)) continue;
    const bucket = byDialogue.get(line.dialogue!) ?? [];
    bucket.push(line);
    byDialogue.set(line.dialogue!, bucket);
  }
}
for (const [dlgId, lines] of byDialogue) {
  const file = join(DLG_DIR, `${dlgId}.json`);
  let content = readFileSync(file, 'utf8');
  // Idempotent: strip every voice ref we may have written before, then
  // lay the current set down fresh after each node's "id" line. Two
  // shapes exist in the wild: the importer's own (after "id", trailing
  // comma) and hand-placed refs sitting as a node's LAST key (no trailing
  // comma, a comma before it). Missing the second once laid a duplicate
  // "voice" key beside every hand-placed ref — strip both.
  content = content.replace(/\n\s*"voice": "[a-z0-9_]+",/g, '');
  content = content.replace(/,\n\s*"voice": "[a-z0-9_]+"(?=\s*\n\s*\})/g, '');
  const nodesAt = content.indexOf('"nodes"');
  let placed = 0;
  for (const line of lines) {
    const idMark = `"id": "${line.node}",`;
    const at = content.indexOf(idMark, nodesAt);
    if (at < 0) {
      console.error(`✗ ${dlgId}: node "${line.node}" id line not found — add "voice": "${line.clipId}" by hand`);
      continue;
    }
    const indent = /[ \t]*$/.exec(content.slice(0, at))?.[0] ?? '      ';
    content =
      content.slice(0, at + idMark.length) +
      `\n${indent}"voice": "${line.clipId}",` +
      content.slice(at + idMark.length);
    placed++;
  }
  const parsed = JSON.parse(content) as { nodes: Array<{ id: string; voice?: string }> };
  for (const line of lines) {
    const node = parsed.nodes.find((n) => n.id === line.node);
    if (node && node.voice !== line.clipId) throw new Error(`${dlgId}/${line.node}: voice ref landed wrong`);
  }
  if (dry) {
    console.log(`would write ${placed} voice refs into ${dlgId}.json`);
    continue;
  }
  writeFileSync(file, content);
  console.log(`✓ ${dlgId}.json — ${placed} voice refs`);
}

console.log(
  `\nimported ${uploaded.size} clips (${humanTakes} human takes)${dry ? ' [dry run]' : ''}.`,
);
if (!dry && byDialogue.size > 0) {
  console.log('Authored defs changed — the watching dev server reseeds on save; commit the JSON edits.');
}

/**
 * THE STANDING AUDIT — what the voice pipeline would do if you ran it now.
 *
 *   npx tsx tools/voice/audit.mts            the report
 *     --json           machine-readable, for a future contract test
 *     --service <url>  TTS service base (default http://localhost:5002)
 *
 * Exits non-zero when a BLOCKER is present: something that makes a wave pass
 * fail or lie, rather than merely leave work undone.
 *
 * WHY. Every other tool in this folder is a doer, and each one is honest only
 * about its own step: generate.mts skips an uncast character with a friendly
 * '~' and moves on, sheet.mts prints whoever it was handed, and the driver
 * trusts a stamp. Nothing has ever compared the roster the service actually
 * serves against the casting the repo actually names, or the cast against the
 * speaking roll. Drift therefore accumulated silently and was only discovered
 * by reading four files side by side. This is that reading, made repeatable.
 *
 * Run it before a wave, after adding characters, and after touching the pool.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  buildManifest,
  deliverySignature,
  loadTuning,
  loadVoiceTuning,
  orderedActors,
  REGION_ORDER,
  REPO,
  resolveDelivery,
} from './lib.mts';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const si = args.indexOf('--service');
const service = si >= 0 ? args[si + 1] : 'http://localhost:5002';

const VOICEWORK = join(REPO, 'voicework');
const GEN = join(VOICEWORK, 'generated');
const POOL_DIR = join(homedir(), 'code', 'voicelab', 'voices');

const TUNING = loadTuning();
const voiceTuning = loadVoiceTuning();

const m = buildManifest();
const speakers = orderedActors(m);

// ---- the roster, live if we can get it, from disk if we cannot ----------
// A down service must not turn the audit into a false alarm, so fall back to
// walking the sample directory and say which source the answer came from.
let roster: string[] = [];
let rosterFrom = 'live service';
try {
  // The service is single-threaded: mid-batch it will not answer until the
  // take in flight lands, and a wedged one never answers at all. Neither is a
  // reason for the audit to hang, so time out and read the disk instead.
  const res = (await (
    await fetch(`${service}/voices`, { signal: AbortSignal.timeout(15000) })
  ).json()) as { voices?: string[] };
  roster = (res.voices ?? []).filter((v) => v !== 'default' && !v.startsWith('test/'));
} catch {
  rosterFrom = 'sample directory (service down)';
  const walk = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${prefix}${e.name}/`);
      else if (e.name.endsWith('.wav')) roster.push(`${prefix}${e.name.slice(0, -4)}`);
    }
  };
  walk(POOL_DIR, '');
  roster = roster.filter((v) => !v.startsWith('test/'));
}
const rosterSet = new Set(roster);

// ---- findings ------------------------------------------------------------
interface Finding {
  level: 'BLOCKER' | 'GAP' | 'NOTE';
  title: string;
  detail: string;
  items: string[];
}
const findings: Finding[] = [];

// 1. Casting that names a voice nobody serves. generate.mts validates the
//    voice against the roster and process.exit(1)s, so this does not degrade
//    to a default take — it kills the pass at that actor.
const castOn = new Map<string, string[]>();
for (const [id, note] of Object.entries(m.notes)) {
  if (!note.ttsVoice) continue;
  const bucket = castOn.get(note.ttsVoice) ?? [];
  bucket.push(id);
  castOn.set(note.ttsVoice, bucket);
}
const deadCast = [...castOn.entries()].filter(([v]) => !rosterSet.has(v));
if (deadCast.length > 0) {
  findings.push({
    level: 'BLOCKER',
    title: `${deadCast.length} cast voice(s) are not in the roster`,
    detail:
      'generate.mts exits 1 on an unknown voice, so a wave pass dies at the first '
      + 'character cast on these. Recast them, or restore the samples.',
    items: deadCast
      .sort((a, b) => b[1].length - a[1].length)
      .map(([v, ids]) => `${v}  ->  ${ids.length} character(s): ${ids.sort().join(', ')}`),
  });
}

// 2. Speaking characters with no direction card. generate.mts logs '~ no
//    ttsVoice cast' and moves on, so these are silent forever without ever
//    failing anything.
const uncast = speakers.filter((id) => !m.notes[id]);
if (uncast.length > 0) {
  findings.push({
    level: 'GAP',
    title: `${uncast.length} of ${speakers.length} speaking characters have no entry in characters.json`,
    detail:
      'They have lines in the game and no direction, no casting and no quips. '
      + 'The generator skips them quietly, so they stay mute with no error.',
    items: uncast.map((id) => {
      const lines = m.byActor.get(id)!;
      return `${id.padEnd(24)} ${String(lines.length).padStart(3)} lines  ${m.actors.get(id)!.name}`;
    }),
  });
}

// 3. Direction cards for characters that no longer speak.
const ghosts = Object.keys(m.notes).filter((id) => !m.byActor.has(id));
if (ghosts.length > 0) {
  findings.push({
    level: 'NOTE',
    title: `${ghosts.length} direction card(s) name a character with no lines`,
    detail: 'Renamed or retired since the card was written.',
    items: ghosts,
  });
}

// 4. Pool voices nobody is cast on — the casting headroom.
const unusedVoices = roster.filter((v) => !castOn.has(v));
if (unusedVoices.length > 0) {
  findings.push({
    level: 'NOTE',
    title: `${unusedVoices.length} voice(s) in the pool are cast on nobody`,
    detail: `Roster read from the ${rosterFrom}. Audition them: npx tsx tools/voice/audition.mts`,
    items: unusedVoices,
  });
}

// 5. Regions the sheet cannot title or sort. An unknown region indexOf()s to
//    -1, which sorts it ABOVE every known one, so a typo silently reorders the
//    recording sheet.
const badRegions = [...new Set(
  Object.entries(m.notes)
    .filter(([, n]) => !REGION_ORDER.includes(n.where))
    .map(([id, n]) => `${id}: '${n.where}'`),
)];
if (badRegions.length > 0) {
  findings.push({
    level: 'GAP',
    title: `${badRegions.length} character(s) sit in a region the sheet does not know`,
    detail: `REGION_ORDER is [${REGION_ORDER.join(', ')}]. An unknown region sorts to the top.`,
    items: badRegions,
  });
}

// 6. Takes on disk in a voice or delivery the repo no longer asks for. This is
//    the wave_driver's stamp check, read across the whole cast at once: it is
//    the honest answer to "how much would a pass actually re-speak".
const stale: string[] = [];
const unspoken: string[] = [];
for (const id of speakers) {
  const note = m.notes[id];
  if (!note?.ttsVoice) continue;
  const dir = join(GEN, id);
  const want = deliverySignature(
    note.ttsVoice,
    resolveDelivery(note.ttsVoice, note, TUNING, voiceTuning),
    TUNING,
  );
  const stampFile = join(dir, '.voice');
  if (!existsSync(stampFile)) {
    unspoken.push(`${id} (${m.byActor.get(id)!.length} lines)`);
    continue;
  }
  const have = readFileSync(stampFile, 'utf8').trim();
  if (have !== want) stale.push(`${id}\n      on disk: ${have}\n      wanted:  ${want}`);
}
if (unspoken.length > 0) {
  findings.push({
    level: 'GAP',
    title: `${unspoken.length} cast character(s) have never been spoken through`,
    detail: 'Cast in characters.json but carrying no finished .voice stamp.',
    items: unspoken,
  });
}
if (stale.length > 0) {
  findings.push({
    level: 'GAP',
    title: `${stale.length} character(s) hold takes in a stale voice or delivery`,
    detail: 'The driver will clear and re-speak these on the next pass.',
    items: stale,
  });
}

// 7. Generated directories for characters the game no longer has.
if (existsSync(GEN)) {
  const orphanDirs = readdirSync(GEN, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !m.byActor.has(e.name))
    .map((e) => e.name);
  if (orphanDirs.length > 0) {
    findings.push({
      level: 'NOTE',
      title: `${orphanDirs.length} generated take folder(s) belong to no current character`,
      detail: 'Safe to delete; import never looks at them.',
      items: orphanDirs,
    });
  }
}

// 8. Characters that pin both knobs are immune to their voice's tuning. This
//    is legitimate — a pinned value is authored intent — but it is invisible
//    at the point of use, so retuning a voice and seeing nothing change is
//    otherwise a mystery. Name the shadowing rather than let it puzzle anyone.
const tunedVoices = Object.entries(voiceTuning)
  .filter(([, v]) => v.exaggeration !== undefined || v.cfgWeight !== undefined)
  .map(([id]) => id);
if (tunedVoices.length > 0) {
  const shadowed: string[] = [];
  for (const v of tunedVoices) {
    const pinned = (castOn.get(v) ?? []).filter((id) => {
      const n = m.notes[id];
      const t = voiceTuning[v];
      return (t.exaggeration !== undefined && n?.exaggeration !== undefined)
        || (t.cfgWeight !== undefined && n?.cfgWeight !== undefined);
    });
    if (pinned.length > 0) shadowed.push(`${v} -> pinned by ${pinned.sort().join(', ')}`);
  }
  findings.push({
    level: shadowed.length > 0 ? 'GAP' : 'NOTE',
    title: `${tunedVoices.length} voice(s) carry their own tuning in voices.json`,
    detail:
      shadowed.length > 0
        ? 'These characters pin the same knob on their own card, so the voice tuning does '
          + 'NOT reach them. Drop the knob from the character card to let the voice speak for it.'
        : 'Nothing shadows them; every character cast on these inherits the voice tuning.',
    items: shadowed.length > 0 ? shadowed : tunedVoices,
  });
}

// 9. Quip slates. Only the first wave ever got one, so everyone else falls
//    through to whatever the generic bank offers for their voice.
const withQuips = Object.keys(m.quips).length;
findings.push({
  level: 'NOTE',
  title: `${withQuips} of ${speakers.length} characters have an authored quip slate`,
  detail:
    'The rest rely on the generic bank (voicework/generic), which is indexed by '
    + 'voice rather than by character.',
  items: [],
});

// ---- report --------------------------------------------------------------
if (asJson) {
  console.log(JSON.stringify({ rosterFrom, roster, speakers: speakers.length, findings }, null, 2));
} else {
  const totals = {
    node: m.lines.filter((l) => l.kind === 'node').length,
    bark: m.lines.filter((l) => l.kind === 'bark').length,
    quip: m.lines.filter((l) => l.kind === 'quip').length,
  };
  console.log('ARX VOICE AUDIT');
  console.log('='.repeat(72));
  console.log(`speaking characters   ${speakers.length}`);
  console.log(`direction cards       ${Object.keys(m.notes).length}`);
  console.log(`lines                 ${totals.node} dialogue, ${totals.bark} barks, ${totals.quip} quips`);
  console.log(`voice pool            ${roster.length}  (${rosterFrom})`);
  console.log(`voices cast on        ${castOn.size}`);
  console.log('');
  for (const f of findings) {
    console.log(`${f.level}  ${f.title}`);
    console.log(`  ${f.detail}`);
    for (const it of f.items) console.log(`    ${it}`);
    console.log('');
  }
  const blockers = findings.filter((f) => f.level === 'BLOCKER').length;
  console.log('='.repeat(72));
  console.log(
    blockers === 0
      ? 'no blockers — a wave pass would run to completion.'
      : `${blockers} BLOCKER(S) — fix before running a wave pass.`,
  );
}
process.exit(findings.some((f) => f.level === 'BLOCKER') ? 1 : 0);

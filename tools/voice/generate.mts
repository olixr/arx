/**
 * THE CHATTERBOX LANE — batch-speaks the manifest through the local
 * voicelab TTS service (~/code/voicelab, `./voicelab.sh start`) into
 * voicework/generated/<actor>/<clipId>.ogg (mono Ogg/Opus, 48k).
 *
 *   npx tsx tools/voice/generate.mts                 every cast character
 *   npx tsx tools/voice/generate.mts tinker_fen ...  just these actors
 *     --voice <id>    override the character's ttsVoice for this run
 *     --force         re-speak lines that already have a generated file
 *     --service <url> TTS service base (default http://localhost:5002)
 *
 * Casting lives in tools/voice/characters.json (`ttsVoice`, per the
 * samples in ~/code/voicelab/voices/); characters cast null are skipped.
 * A human take in voicework/recorded/ always outranks this lane — the
 * generator politely steps around any line that already has one.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest, orderedActors, REPO, type ManifestLine } from './lib.mts';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const force = ((): boolean => {
  const i = args.indexOf('--force');
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
})();
const voiceOverride = flag('--voice');
const service = flag('--service') ?? 'http://localhost:5002';

const VOICEWORK = join(REPO, 'voicework');
const m = buildManifest();
const wanted = args.length > 0 ? args : orderedActors(m);
for (const id of wanted) {
  if (!m.byActor.has(id)) {
    console.error(`unknown or lineless actor '${id}'`);
    process.exit(1);
  }
}

// The service must be up and both models warm before we queue an hour of audio.
try {
  const health = (await (await fetch(`${service}/health`)).json()) as Record<string, unknown>;
  console.log(`voicelab up: ${JSON.stringify(health)}`);
} catch {
  console.error(`no TTS service at ${service} — run ~/code/voicelab/voicelab.sh start`);
  process.exit(1);
}
const voices = new Set<string>(
  ((await (await fetch(`${service}/voices`)).json()) as { voices?: string[] }).voices ?? [],
);

function recordedTake(l: ManifestLine): string | undefined {
  for (const ext of ['wav', 'ogg', 'opus', 'mp3', 'm4a', 'webm']) {
    const p = join(VOICEWORK, 'recorded', l.actor, `${l.clipId}.${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

let spoken = 0;
let skipped = 0;
for (const actor of wanted) {
  const note = m.notes[actor];
  const voice = voiceOverride ?? note?.ttsVoice ?? null;
  if (voice === null) {
    console.log(`~ ${actor}: no ttsVoice cast (characters.json), skipping`);
    continue;
  }
  if (voices.size > 0 && !voices.has(voice)) {
    console.error(`voice '${voice}' is not in the voicelab roster (${[...voices].join(', ')})`);
    process.exit(1);
  }
  const dir = join(VOICEWORK, 'generated', actor);
  mkdirSync(dir, { recursive: true });
  for (const line of m.byActor.get(actor)!) {
    const dest = join(dir, `${line.clipId}.ogg`);
    if (!force && existsSync(dest)) {
      skipped++;
      continue;
    }
    if (recordedTake(line)) {
      console.log(`~ ${line.clipId}: human take exists, not generating over it`);
      skipped++;
      continue;
    }
    const res = await fetch(`${service}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: line.text,
        voice,
        exaggeration: note?.exaggeration ?? 0.5,
        cfg_weight: note?.cfgWeight ?? 0.5,
        temperature: 0.6,
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${line.clipId}: TTS ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const wav = Buffer.from(await res.arrayBuffer());
    const tmp = `${dest}.tmp.wav`;
    writeFileSync(tmp, wav);
    // Mono Opus-in-Ogg at 48k: the web-native speech codec, ~6x smaller
    // than WAV, and the ledger's preferred food.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', dest]);
    rmSync(tmp);
    spoken++;
    console.log(`✓ ${line.clipId} (${(wav.length / 1024).toFixed(0)}kB wav → ogg) — "${line.text.slice(0, 60)}"`);
  }
}
console.log(`\nspoke ${spoken} lines, skipped ${skipped}. Files in voicework/generated/.`);
console.log('Next: npx tsx tools/voice/import.mts to push both lanes into the live ledger.');

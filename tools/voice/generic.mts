/**
 * THE GENERIC BANK — short fallback quips, one set per voice in the pool.
 *
 *   npx tsx tools/voice/generic.mts                every voice slot
 *   npx tsx tools/voice/generic.mts male_1 ...     just these slots
 *     --force         re-speak clips that already exist
 *     --service <url> TTS service base (default http://localhost:5002)
 *
 * Re-runs are resumable: without --force, clips already on disk are skipped,
 * so an interrupted batch picks up where it stopped.
 *
 * There is deliberately no restart-voicelab option here (the character lane's
 * wave_driver.sh has one). Restarting the service from inside this process
 * tears down the whole process group mid-restart when the batch itself is
 * running detached — it killed a run at slot 5. These clips are ~1s each, so
 * MPS drift over a full bank is not worth that risk; restart between runs
 * from the shell instead.
 *
 * These are NOT character lines. They are indexed by *voice*, not by actor,
 * so any NPC without authored dialogue can fall back to a generic take that
 * at least matches its cast voice. That is why this lane does not ride
 * buildManifest(): quips.json may only speak for actors that exist in
 * packages/content/src/actors/defs, and a voice slot is not a game entity.
 *
 * Output: voicework/generic/<slot>/<slot_slug>.ogg  + manifest.json
 * (mono Ogg/Opus 48k, same as the character lane).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTuning, loadVoiceTuning, resolveDelivery } from './lib.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(REPO, 'voicework', 'generic');

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
const service = flag('--service') ?? 'http://localhost:5002';

/**
 * Slot → voice. EXPLICIT on purpose: deriving the numbering from a directory
 * listing would renumber every existing clip the moment a voice is added.
 * Append new slots, never reorder. Ordered deepest-first within each gender.
 */
const SLOTS: Record<string, string> = {
  male_1: 'rpg_fantasy/male/veil_ethan',      //  89 Hz  bass, grave
  male_2: 'rpg_fantasy/male/ember_tadhg',     // 110 Hz  quick, Irish
  male_3: 'rpg_fantasy/male/ilidan_m',        // 129 Hz  terse, soldier-dark
  male_4: 'rpg_fantasy/male/dwarf_g_m',       // 134 Hz  gruff folksy cheer
  male_5: 'rpg_fantasy/male/court_phil',      // 134 Hz  courtly, measured
  male_6: 'rpg_fantasy/male/grand_mag_m',     // 114 Hz  measured storyteller
  male_7: 'rpg_fantasy/male/king_bob',        // 170 Hz  warm elder
  male_8: 'rpg_fantasy/male/telemancer_m',    // 203 Hz  wry, bright, precise
  male_9: 'rpg_fantasy/male/rune_phineas',    // 222 Hz  bright, young
  // self-recorded; all sit ~109-119 Hz but are timbrally distinct
  male_10: 'rpg_fantasy/male/frank',          // 109 Hz  deepest of the self-recorded
  male_11: 'rpg_fantasy/male/jeff',           // 119 Hz  plain
  male_12: 'rpg_fantasy/male/george',         // 119 Hz  plain
  male_13: 'rpg_fantasy/male/edder',          // 118 Hz  plain, even
  male_14: 'rpg_fantasy/male/larry',          // 113 Hz  fastest delivery
  female_1: 'rpg_fantasy/female/orc_f',       // 176 Hz  firm, commanding
  female_2: 'rpg_fantasy/female/elf_sentinel_f', // 182 Hz  clear, command
  female_3: 'rpg_fantasy/female/garrif_f',    // 225 Hz  bright, busy
  female_4: 'rpg_fantasy/female/witherbard_f', // 193 Hz  weathered elder
  female_5: 'rpg_fantasy/female/hush_morrow', // 162 Hz  low, conspiratorial
  female_6: 'rpg_fantasy/female/dour_mabel',  // 170 Hz  flat, unbothered
  female_7: 'rpg_fantasy/female/flint_greta', // 178 Hz  hard, transactional
  female_8: 'rpg_fantasy/female/trade_nell',  // 200 Hz  plain shopkeep
  female_9: 'rpg_fantasy/female/spite_vex',   // 219 Hz  gleeful menace
  female_10: 'rpg_fantasy/female/sunny_posy', // 242 Hz  bright, sing-song
  female_11: 'rpg_fantasy/female/spark_wren', // 254 Hz  fast, energetic
  female_12: 'rpg_fantasy/female/perky_tilly', // 258 Hz  chirpy, eager
  // Appended for the 2026-08-11 casting pass so every cast voice has a
  // fallback bank. APPEND ONLY -- renumbering these would silently
  // change the voice of every clip already on disk.
  male_15: 'rpg_fantasy/male/draven_m',       //  82 Hz  deep, slow, unhurried
  male_16: 'rpg_fantasy/male/guldan_m',       //  83 Hz  grave, ominous weight
  male_17: 'rpg_fantasy/male/narrator_m',     //  98 Hz  low, calm, still
  male_18: 'rpg_fantasy/male/solder_m',       // 108 Hz  flat soldier, dutiful
  male_19: 'rpg_fantasy/male/arathi_m',       // 109 Hz  plain outdoor working
  male_20: 'rpg_fantasy/male/lorewake_m',     // 113 Hz  storyteller, wandering
  male_21: 'rpg_fantasy/male/hald_m',         // 117 Hz  plain, careful
  female_13: 'rpg_fantasy/female/highmountain_f', // 118 Hz  deep, flat, low
  male_22: 'rpg_fantasy/male/belf_m',         // 118 Hz  lighter, gentler
  male_23: 'rpg_fantasy/male/garrosh_m',      // 119 Hz  gruff authority
  female_14: 'rpg_fantasy/female/xalath_f',   // 152 Hz  low, controlled, final
  male_24: 'rpg_fantasy/male/murozond_m',     // 176 Hz  resonant, declamatory
  male_25: 'rpg_fantasy/male/flynn_m',        // 180 Hz  bright, carrying
  male_26: 'rpg_fantasy/male/gazlow_m',       // 190 Hz  smooth trader patter
  male_27: 'rpg_fantasy/male/bran_m',         // 222 Hz  light, soft, hesitant
  male_28: 'rpg_fantasy/male/grif_m',         // 246 Hz  high, gleeful showman
  female_15: 'rpg_fantasy/female/faerin_f',   // 262 Hz  precise, light, amused
  female_16: 'rpg_fantasy/female/nightborne_f', // 281 Hz  soft, floating
};

/**
 * One or two words each. Deliberately character-neutral — no names, no place
 * references, nothing that presumes a mood — because one take has to sit under
 * any NPC cast to that voice.
 */
const QUIPS: Record<string, string[]> = {
  greet: ['Well met.', 'Aye?'],
  ack: ['Mm.', 'Go on.'],
  yes: ['Aye.', 'It is so.'],
  no: ['No.', 'Afraid not.'],
  farewell: ['Safe roads.', 'Good day.'],
  hm: ['Hm.'],
};

/**
 * These sit under many characters, so no strong *character* colouring — but
 * "neutral" was previously read as "low exaggeration", which just made them
 * slow and flat. Exaggeration is the pace and expression knob on this pool
 * (0.45 -> 0.75 measured +11% words/sec, +44% pitch range); cfg_weight is not
 * a speed control despite the folk wisdom, and dropping it actively slows
 * delivery. Sit a touch under the character lane so a fallback quip reads
 * brisk and alive without out-acting the authored line it stands in for.
 * Shared tuning (tempo, temperature) comes from tools/voice/tuning.json.
 */
const TUNING = loadTuning();
const VOICE_TUNING = loadVoiceTuning();
const TEMPERATURE = TUNING.temperature;

/**
 * Generic quips sit a touch under the character lane so a fallback never
 * out-acts the authored line it stands in for. That nudge now applies to the
 * VOICE'S OWN resolved exaggeration rather than to the global default, so a
 * sample tuned in voices.json carries its correction into this bank too — the
 * fallback and the character lane should never disagree about how a voice
 * paces.
 *
 * Rounded: binary float leaves 0.7 - 0.02 as 0.6799999999999999, which would
 * land in the stamp verbatim and churn on any re-derivation.
 */
const GENERIC_NUDGE = 0.02;
function deliveryFor(voice: string): { exaggeration: number; cfgWeight: number } {
  const base = resolveDelivery(voice, undefined, TUNING, VOICE_TUNING);
  return {
    exaggeration: Math.round((base.exaggeration - GENERIC_NUDGE) * 1000) / 1000,
    cfgWeight: base.cfgWeight,
  };
}

/** Ceiling at -1 dBFS so Opus intersample overshoot stays under full scale. */
export const PEAK_LIMIT = 'alimiter=level_in=1:level_out=1:limit=0.891:attack=5:release=50:level=disabled';

const wanted = args.length > 0 ? args : Object.keys(SLOTS);
for (const s of wanted) {
  if (!(s in SLOTS)) {
    console.error(`unknown slot '${s}' — known: ${Object.keys(SLOTS).join(', ')}`);
    process.exit(1);
  }
}

try {
  const health = (await (await fetch(`${service}/health`)).json()) as Record<string, unknown>;
  console.log(`voicelab up: ${JSON.stringify(health)}`);
} catch {
  console.error(`no TTS service at ${service} — run ~/code/voicelab/voicelab.sh start`);
  process.exit(1);
}

const roster = new Set<string>(
  ((await (await fetch(`${service}/voices`)).json()) as { voices?: string[] }).voices ?? [],
);
const missing = wanted.map((s) => SLOTS[s]).filter((v) => roster.size > 0 && !roster.has(v));
if (missing.length > 0) {
  console.error(`voices not in the voicelab roster: ${[...new Set(missing)].join(', ')}`);
  process.exit(1);
}

interface Entry { slot: string; voice: string; kind: string; index: number; text: string; file: string }

// The manifest describes the whole bank, not just this run — building it from
// `wanted` would drop every slot not regenerated this time.
const manifest: Entry[] = Object.entries(SLOTS).flatMap(([slot, voice]) =>
  Object.entries(QUIPS).flatMap(([kind, texts]) =>
    texts.map((text, i) => ({
      slot, voice, kind, index: i + 1, text, file: `${slot}/${kind}_${i + 1}.ogg`,
    })),
  ),
);

let spoke = 0;
let skipped = 0;

for (const slot of wanted) {
  const voice = SLOTS[slot];
  console.log(`=============== ${slot}  (${voice}) ===============`);
  const dir = join(OUT, slot);
  mkdirSync(dir, { recursive: true });

  // A slot's voice can change when the pool is re-sorted, and the tuning can
  // change when the bank is retuned. Either way the clips on disk still look
  // complete, so an unforced run would keep them and the slot would quietly
  // hold the wrong voice or the old delivery. The stamp records the full
  // signature of what the clips are actually in; on mismatch, clear them.
  const { exaggeration, cfgWeight } = deliveryFor(voice);
  const sig = `${voice} ex=${exaggeration} cfg=${cfgWeight} `
    + `tempo=${TUNING.tempo} temp=${TEMPERATURE}`;
  const stampFile = join(dir, '.voice');
  const stamp = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : null;
  if (stamp !== null && stamp !== sig) {
    const stale = readdirSync(dir).filter((f) => f.endsWith('.ogg'));
    console.log(`  changed (${stamp} -> ${sig}); clearing ${stale.length} stale clip(s)`);
    for (const f of stale) rmSync(join(dir, f));
  }

  for (const [kind, texts] of Object.entries(QUIPS)) {
    texts.forEach((text, i) => {
      const stem = `${kind}_${i + 1}`;
      const dest = join(dir, `${stem}.ogg`);
      if (!force && existsSync(dest)) {
        skipped++;
        return;
      }
      const tmp = `${dest}.tmp.wav`;
      execFileSync('curl', [
        '-sf', '--max-time', '900', '-X', 'POST', `${service}/v1/audio/speech`,
        '-H', 'Content-Type: application/json',
        '--data-binary', JSON.stringify({
          model: 'tts-1', input: text, voice,
          exaggeration, cfg_weight: cfgWeight, temperature: TEMPERATURE,
        }),
        '-o', tmp,
      ]);
      // Chatterbox regularly returns takes that sit on 0 dBFS; Opus then
      // reconstructs intersample peaks above full scale (measured up to
      // +1.7 dB) and the clip distorts on any integer output path. Cap it.
      // atempo before the limiter so the limiter sees the final waveform; it is
      // pitch-preserving, and buys the pace the model's own timing won't.
      const af = TUNING.tempo === 1 ? PEAK_LIMIT : `atempo=${TUNING.tempo},${PEAK_LIMIT}`;
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp,
        '-af', af, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', dest]);
      rmSync(tmp);
      spoke++;
      console.log(`  ✓ ${slot}/${stem}  "${text}"`);
    });
  }
  writeFileSync(stampFile, `${sig}\n`);
}

writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nspoke ${spoke}, skipped ${skipped}. ${manifest.length} clips in voicework/generic/.`);
console.log('Transcripts + slot→voice map: voicework/generic/manifest.json');

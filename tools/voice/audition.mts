/**
 * THE AUDITION ROOM — one take per voice in the pool, before an hour of takes.
 *
 *   npx tsx tools/voice/audition.mts                  every voice in the roster
 *   npx tsx tools/voice/audition.mts female/ king_bob just these (substring match)
 *     --say "<text>"   audition line (default: THE SIDES, below)
 *     --tune ex,cfg    pin both knobs for this run, e.g. --tune 0.78,0.55;
 *                      the way to A/B a candidate before writing voices.json
 *     --as <actorId>   speak in that character's tuning, using one of THEIR lines
 *     --force          re-speak takes that already exist
 *     --service <url>  TTS service base (default http://localhost:5002)
 *     --open           open the contact sheet when it finishes
 *
 * WHY THIS EXISTS. Casting used to be a blind write into characters.json
 * followed by an hour-long wave pass, and the first time anyone heard a voice
 * was after 1600 clips had been spoken in it. This lane speaks ONE line per
 * voice — the whole pool in about five minutes — and lays them out in a
 * playable contact sheet, so the ear picks the cast and the long pass only ever
 * confirms a decision already made.
 *
 * IT IS THE SAME MOUTH. Each voice is spoken at its OWN resolved delivery
 * (voices.json over tuning.json, through the one resolver in lib.mts), with the
 * same atempo stage and peak limiter generate.mts uses, so an audition is a
 * true preview of the wave and not a prettier cousin of it.
 *
 * IT ALSO READS THE ROSTER LIVE. The pool is whatever `GET /voices` reports,
 * minus the SFX shelf — a sample dropped into voicelab shows up here with no
 * edit to this file. Every other lane in this folder carries a hardcoded voice
 * list, which is how seven cast voices went missing from disk without anything
 * noticing; the sheet calls those out at the top.
 *
 * Output: voicework/audition/<voice_slug>.ogg + index.html + audition.json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  buildManifest,
  loadTuning,
  loadVoiceTuning,
  REPO,
  resolveDelivery,
  type CharacterNote,
} from './lib.mts';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const bool = (name: string): boolean => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const force = bool('--force');
const open = bool('--open');
const sayFlag = flag('--say');
const tuneFlag = flag('--tune');
const asActor = flag('--as');
const service = flag('--service') ?? 'http://localhost:5002';

const OUT = join(REPO, 'voicework', 'audition');
const VOICE_POOL = join(homedir(), 'code', 'voicelab', 'voices');

/**
 * The default audition line. It has to do a lot of work in six seconds, so it
 * carries: a greeting (the greet slot is the most-heard clip in the game), a
 * flat declarative, and a withheld reason — which is where a voice either finds
 * a colour or stays a reader. Place and name are deliberately absent so the
 * same take reads fairly for a dock hand and a queen.
 */
const THE_SIDES = 'Well met, traveler. The road north is shut past the ford, and the watch will not say why.';

const TUNING = loadTuning();
const VOICE_TUNING = loadVoiceTuning();

const PEAK_LIMIT =
  'alimiter=level_in=1:level_out=1:limit=0.891:attack=5:release=50:level=disabled';

/** Per-take ceiling. See the note at the curl call for why it is not 900. */
const REQUEST_TIMEOUT_S = 150;

// ---- the roster ------------------------------------------------------
try {
  const health = (await (await fetch(`${service}/health`)).json()) as Record<string, unknown>;
  console.log(`voicelab up: ${JSON.stringify(health)}`);
} catch {
  console.error(`no TTS service at ${service} — run ~/code/voicelab/voicelab.sh start`);
  process.exit(1);
}
const roster = ((await (await fetch(`${service}/voices`)).json()) as { voices?: string[] }).voices ?? [];
// 'default' is an alias, not a sample; test/ is the game-SFX shelf, not speech.
const pool = roster.filter((v) => v !== 'default' && !v.startsWith('test/')).sort();
if (pool.length === 0) {
  console.error('the roster came back empty — nothing to audition');
  process.exit(1);
}

// A bare argument matches any voice whose id contains it, so `female/`,
// `court`, and the full path all work.
const wanted = args.length === 0 ? pool : pool.filter((v) => args.some((a) => v.includes(a)));
if (wanted.length === 0) {
  console.error(`no voice matches ${args.join(', ')}\nroster:\n  ${pool.join('\n  ')}`);
  process.exit(1);
}

// ---- what gets said, and how -----------------------------------------
const m = buildManifest();
let line = sayFlag ?? THE_SIDES;
// Per-voice by default, so the sheet previews what a real pass would speak.
// --tune pins both knobs across every voice in the run, which is how you A/B a
// candidate setting: audition one voice at two values, keep the better number,
// then write it into voices.json.
let tuneOverride: { exaggeration: number; cfgWeight: number } | undefined;
if (tuneFlag !== undefined) {
  const [ex, cfg] = tuneFlag.split(',').map(Number);
  if (!Number.isFinite(ex) || !Number.isFinite(cfg) || ex < 0 || ex > 1 || cfg < 0 || cfg > 1) {
    console.error(`--tune wants two 0..1 numbers like 0.78,0.55 (got '${tuneFlag}')`);
    process.exit(1);
  }
  tuneOverride = { exaggeration: ex, cfgWeight: cfg };
  console.log(`--tune: every voice at ex=${ex} cfg=${cfg}`);
}
let actorNote: { exaggeration?: number; cfgWeight?: number } | undefined;
if (asActor !== undefined) {
  const note: CharacterNote | undefined = m.notes[asActor];
  const theirs = m.byActor.get(asActor);
  if (!theirs) {
    console.error(`'${asActor}' has no lines — cannot audition in their voice`);
    process.exit(1);
  }
  actorNote = note;
  if (sayFlag === undefined) {
    // Their longest node line: the one with enough words to judge a read by.
    const spoken = theirs.filter((l) => l.kind === 'node');
    const pick = (spoken.length > 0 ? spoken : theirs)
      .slice()
      .sort((a, b) => b.text.length - a.text.length)[0];
    line = pick.text.slice(0, 240);
  }
  console.log(`auditioning as ${asActor}`);
}
console.log(`line: "${line}"\n`);

/** Voice id → file stem. Slashes are the only illegal character here. */
const slugOf = (voice: string): string => voice.replace(/\//g, '__');

/**
 * Each voice is auditioned at ITS OWN resolved delivery, so the sheet previews
 * what a real pass would speak rather than a flattened average of the pool.
 * --tune pins both knobs instead, and --as borrows a character's performance.
 */
function deliveryFor(voice: string): { exaggeration: number; cfgWeight: number } {
  if (tuneOverride !== undefined) return tuneOverride;
  const d = resolveDelivery(voice, actorNote, TUNING, VOICE_TUNING);
  return { exaggeration: d.exaggeration, cfgWeight: d.cfgWeight };
}

/**
 * The stamp covers the line AND the delivery, because both change what you
 * hear. Retuning a voice in voices.json therefore re-auditions exactly that
 * voice on the next run; leaving it alone costs nothing.
 */
function sigFor(voice: string): string {
  const d = deliveryFor(voice);
  return `${line} :: ex=${d.exaggeration} cfg=${d.cfgWeight}`
    + ` tempo=${TUNING.tempo} temp=${TUNING.temperature}`;
}

// ---- median F0, measured off the conditioning sample -------------------
/**
 * The pool is sorted by depth in every doc and casting note, but F0 was
 * hand-recorded for the original 26 and never measured for anything added
 * since. Autocorrelation over the conditioning WAV recovers it for the whole
 * pool at no cost, so the sheet can sort by ear-order rather than alphabet.
 * Cheap and approximate on purpose: it is a sort key, not a measurement.
 */
const F0_CACHE = join(OUT, '.f0.json');
const f0Cache: Record<string, number | null> = existsSync(F0_CACHE)
  ? (JSON.parse(readFileSync(F0_CACHE, 'utf8')) as Record<string, number | null>)
  : {};

function medianF0(voice: string): number | null {
  if (voice in f0Cache) return f0Cache[voice];
  const wav = join(VOICE_POOL, `${voice}.wav`);
  let pcm: Buffer;
  try {
    pcm = execFileSync(
      'ffmpeg',
      ['-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
      { maxBuffer: 1 << 28 },
    );
  } catch {
    f0Cache[voice] = null;
    return null;
  }
  const n = pcm.length >> 1;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = pcm.readInt16LE(i * 2) / 32768;

  const SR = 16000;
  const LO = Math.floor(SR / 400); //  40 -> 400 Hz ceiling
  const HI = Math.floor(SR / 60); // 266 ->  60 Hz floor
  const FRAME = 1024;
  const HOP = 512;
  const pitches: number[] = [];
  for (let start = 0; start + FRAME + HI < n; start += HOP) {
    let energy = 0;
    for (let i = 0; i < FRAME; i++) energy += x[start + i] * x[start + i];
    const rms = Math.sqrt(energy / FRAME);
    if (rms < 0.01) continue; // silence and room tone carry no pitch
    let bestLag = 0;
    let best = 0;
    for (let lag = LO; lag <= HI; lag++) {
      let sum = 0;
      let norm = 0;
      for (let i = 0; i < FRAME; i++) {
        sum += x[start + i] * x[start + i + lag];
        norm += x[start + i + lag] * x[start + i + lag];
      }
      // Normalised so a loud late frame cannot outvote a quiet early one.
      const r = norm > 0 ? sum / Math.sqrt(energy * norm) : 0;
      if (r > best) {
        best = r;
        bestLag = lag;
      }
    }
    if (best > 0.45 && bestLag > 0) pitches.push(SR / bestLag);
  }
  if (pitches.length < 8) {
    f0Cache[voice] = null;
    return null;
  }
  pitches.sort((a, b) => a - b);
  const med = Math.round(pitches[pitches.length >> 1]);
  f0Cache[voice] = med;
  return med;
}

// ---- casting, as it currently stands ----------------------------------
const castOn = new Map<string, string[]>();
for (const [id, note] of Object.entries(m.notes)) {
  if (!note.ttsVoice) continue;
  const arr = castOn.get(note.ttsVoice) ?? [];
  arr.push(id);
  castOn.set(note.ttsVoice, arr);
}
// A voice named in characters.json that the service does not serve is a hard
// 400 mid-wave, and it kills the whole run at that actor. Surface it here,
// where it is cheap to fix, instead of forty minutes into a pass.
const rosterSet = new Set(pool);
const brokenCasting = [...castOn.entries()]
  .filter(([v]) => !rosterSet.has(v))
  .map(([voice, ids]) => ({ voice, ids: ids.sort() }))
  .sort((a, b) => b.ids.length - a.ids.length);

// ---- speak -------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
interface Card {
  voice: string;
  slug: string;
  file: string;
  group: string;
  f0: number | null;
  durMs: number | null;
  cast: string[];
  exaggeration: number;
  cfgWeight: number;
  /** True when voices.json supplies either knob — the sheet marks it. */
  tuned: boolean;
}
const cards: Card[] = [];
let spoke = 0;
let skipped = 0;

// The sheet describes the whole POOL, not just this run. Building it from
// `wanted` alone would mean `audition.mts garrosh_m` republished a contact
// sheet holding one card and silently dropped the other fifty-nine. Speak the
// subset; card everything that has a take on disk.
const wantedSet = new Set(wanted);
let absent = 0;
for (const voice of pool) {
  const slug = slugOf(voice);
  const dest = join(OUT, `${slug}.ogg`);
  const stampFile = join(OUT, `${slug}.sig`);
  const stamp = existsSync(stampFile) ? readFileSync(stampFile, 'utf8') : null;
  const sig = sigFor(voice);
  const fresh = existsSync(dest) && stamp === sig && !force;
  if (!wantedSet.has(voice)) {
    // Not in this run: card it if it has a take, otherwise leave it off.
    if (!existsSync(dest)) {
      absent++;
      continue;
    }
  } else if (fresh) {
    skipped++;
  } else {
    const tmp = `${dest}.tmp.wav`;
    try {
      // 900s is the character lane's ceiling, sized for 400-character speeches.
      // One audition line is ~10s of work, and the thing that actually takes
      // longer than a minute here is a wedged service, not a slow take: a
      // long-lived voicelab has been seen to stop answering entirely, at zero
      // CPU, after which every request hangs until the ceiling. Fail fast and
      // let the sheet finish without it.
      execFileSync('curl', [
        '-sf', '--max-time', String(REQUEST_TIMEOUT_S), '-X', 'POST', `${service}/v1/audio/speech`,
        '-H', 'Content-Type: application/json',
        '--data-binary', JSON.stringify({
          model: 'tts-1', input: line, voice,
          exaggeration: deliveryFor(voice).exaggeration,
          cfg_weight: deliveryFor(voice).cfgWeight,
          temperature: TUNING.temperature,
        }),
        '-o', tmp,
      ]);
    } catch {
      // One bad sample must not cost the other forty-six their audition.
      console.error(`✗ ${voice} — service refused the take, skipping`);
      rmSync(tmp, { force: true });
      continue;
    }
    const af = TUNING.tempo === 1 ? PEAK_LIMIT : `atempo=${TUNING.tempo},${PEAK_LIMIT}`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp,
      '-af', af, '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', dest]);
    rmSync(tmp);
    writeFileSync(stampFile, sig);
    spoke++;
    console.log(`✓ ${voice}`);
  }
  let durMs: number | null = null;
  try {
    const sec = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
      'format=duration', '-of', 'csv=p=0', dest]).toString().trim());
    durMs = Number.isFinite(sec) ? Math.round(sec * 1000) : null;
  } catch { /* a duration is a nicety, not a reason to fail */ }
  cards.push({
    voice,
    slug,
    file: `${slug}.ogg`,
    group: voice.split('/').slice(0, -1).join('/') || 'root',
    f0: medianF0(voice),
    durMs,
    cast: (castOn.get(voice) ?? []).sort(),
    ...deliveryFor(voice),
    tuned:
      VOICE_TUNING[voice]?.exaggeration !== undefined
      || VOICE_TUNING[voice]?.cfgWeight !== undefined,
  });
}

writeFileSync(F0_CACHE, `${JSON.stringify(f0Cache, null, 2)}\n`);

// Deepest first inside each group — the order the ear wants, and the order
// every casting table in VOICES.md is already written in.
cards.sort((a, b) =>
  a.group.localeCompare(b.group) || (a.f0 ?? 9999) - (b.f0 ?? 9999) || a.voice.localeCompare(b.voice),
);

writeFileSync(
  join(OUT, 'audition.json'),
  `${JSON.stringify({ line, tune: tuneOverride ?? null, tuning: TUNING, brokenCasting, cards }, null, 2)}\n`,
);

// ---- the contact sheet -------------------------------------------------
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Arx voice audition</title>
<style>
  :root { color-scheme: dark; --bg:#14120f; --card:#1e1b16; --line:#2f2a22;
          --ink:#e8e2d6; --dim:#9c9384; --hot:#d9a441; --bad:#c8563c; }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px; background:var(--bg); color:var(--ink);
         font:15px/1.5 ui-sans-serif,system-ui,sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; letter-spacing:.02em; }
  .sub { color:var(--dim); margin:0 0 20px; }
  .line { background:var(--card); border:1px solid var(--line); border-left:3px solid var(--hot);
          border-radius:6px; padding:12px 16px; margin:0 0 20px; font-style:italic; }
  .bad { background:#2a1713; border:1px solid var(--bad); border-radius:6px;
         padding:12px 16px; margin:0 0 20px; }
  .bad h2 { font-size:14px; margin:0 0 8px; color:var(--bad); letter-spacing:.06em;
            text-transform:uppercase; }
  .bad li { margin:2px 0; color:var(--ink); }
  .bad code { color:var(--bad); }
  .bar { display:flex; gap:10px; align-items:center; margin:0 0 18px; flex-wrap:wrap; }
  input[type=search] { flex:1; min-width:220px; background:var(--card); color:var(--ink);
         border:1px solid var(--line); border-radius:6px; padding:9px 12px; font:inherit; }
  button { background:var(--card); color:var(--ink); border:1px solid var(--line);
           border-radius:6px; padding:9px 14px; font:inherit; cursor:pointer; }
  button:hover { border-color:var(--hot); color:var(--hot); }
  h2.group { font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim);
             margin:26px 0 10px; border-bottom:1px solid var(--line); padding-bottom:6px; }
  .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:14px; }
  .card.playing { border-color:var(--hot); }
  .name { font-weight:600; }
  .meta { color:var(--dim); font-size:13px; margin:2px 0 10px; }
  .meta b { color:var(--hot); font-weight:600; }
  audio { width:100%; height:34px; }
  .cast { margin-top:9px; font-size:12px; color:var(--dim); }
  .cast span { display:inline-block; background:#282218; border-radius:4px;
               padding:1px 6px; margin:2px 3px 0 0; }
  .free { color:var(--hot); font-size:12px; margin-top:9px; }
  .hidden { display:none; }
</style>
<h1>Arx voice audition</h1>
<p class="sub">${cards.length} voices &middot; ${
  tuneOverride
    ? `pinned at ex ${tuneOverride.exaggeration} / cfg ${tuneOverride.cfgWeight}`
    : 'each at its own tuning from voices.json'
} &middot; tempo ${TUNING.tempo} &middot; temp ${TUNING.temperature} &middot;
   the same chain <code>generate.mts</code> speaks the wave through</p>
<p class="line">&ldquo;${esc(line)}&rdquo;</p>
${brokenCasting.length === 0 ? '' : `<div class="bad">
  <h2>Cast on voices the service does not serve</h2>
  <ul>${brokenCasting.map((b) => `<li><code>${esc(b.voice)}</code> &mdash; ${b.ids.length} character(s): ${esc(b.ids.join(', '))}</li>`).join('')}</ul>
</div>`}
<div class="bar">
  <input type="search" id="q" placeholder="filter by voice, group or cast character">
  <button id="all">Play all in order</button>
  <button id="stop">Stop</button>
  <button id="uncast">Only uncast</button>
</div>
<div id="sheet"></div>
<script>
const CARDS = ${JSON.stringify(cards)};
const sheet = document.getElementById('sheet');
let groups = [...new Set(CARDS.map(c => c.group))];
for (const g of groups) {
  const h = document.createElement('h2'); h.className = 'group'; h.textContent = g;
  h.dataset.group = g; sheet.appendChild(h);
  const grid = document.createElement('div'); grid.className = 'grid'; grid.dataset.group = g;
  for (const c of CARDS.filter(x => x.group === g)) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.hay = (c.voice + ' ' + c.group + ' ' + c.cast.join(' ')).toLowerCase();
    el.dataset.cast = c.cast.length ? '1' : '0';
    el.innerHTML =
      '<div class="name">' + c.voice.split('/').pop() + '</div>' +
      '<div class="meta">' + (c.f0 ? '<b>' + c.f0 + ' Hz</b>' : 'F0 unknown') +
        (c.durMs ? ' &middot; ' + (c.durMs / 1000).toFixed(1) + 's' : '') +
        ' &middot; ex ' + c.exaggeration + ' / cfg ' + c.cfgWeight +
        (c.tuned ? ' <b>tuned</b>' : '') + '</div>' +
      '<audio controls preload="none" src="' + c.file + '"></audio>' +
      (c.cast.length
        ? '<div class="cast">' + c.cast.map(x => '<span>' + x + '</span>').join('') + '</div>'
        : '<div class="free">uncast</div>');
    grid.appendChild(el);
  }
  sheet.appendChild(grid);
}
const audios = () => [...document.querySelectorAll('audio')];
// One voice at a time: overlapping takes tell you nothing about either.
sheet.addEventListener('play', e => {
  for (const a of audios()) if (a !== e.target) a.pause();
  document.querySelectorAll('.card').forEach(c => c.classList.remove('playing'));
  e.target.closest('.card').classList.add('playing');
}, true);
let chain = null;
document.getElementById('all').onclick = () => {
  const q = audios().filter(a => !a.closest('.card').classList.contains('hidden'));
  let i = 0;
  const next = () => { if (i < q.length) { chain = q[i++]; chain.play(); } };
  for (const a of q) a.onended = next;
  next();
};
document.getElementById('stop').onclick = () => { for (const a of audios()) a.pause(); };
let uncastOnly = false;
const apply = () => {
  const q = document.getElementById('q').value.toLowerCase();
  for (const c of document.querySelectorAll('.card')) {
    const hit = c.dataset.hay.includes(q) && (!uncastOnly || c.dataset.cast === '0');
    c.classList.toggle('hidden', !hit);
  }
  for (const g of groups) {
    const grid = document.querySelector('.grid[data-group="' + g + '"]');
    const any = [...grid.children].some(c => !c.classList.contains('hidden'));
    grid.classList.toggle('hidden', !any);
    document.querySelector('h2[data-group="' + g + '"]').classList.toggle('hidden', !any);
  }
};
document.getElementById('q').oninput = apply;
document.getElementById('uncast').onclick = e => {
  uncastOnly = !uncastOnly;
  e.target.textContent = uncastOnly ? 'Show all' : 'Only uncast';
  apply();
};
</script>
`;
const sheetPath = join(OUT, 'index.html');
writeFileSync(sheetPath, html);

console.log(
  `\nspoke ${spoke}, reused ${skipped}. ${cards.length} voices on the sheet`
  + `${absent > 0 ? `, ${absent} in the pool not yet auditioned` : ''}.`,
);
if (brokenCasting.length > 0) {
  console.log(`\n!! ${brokenCasting.length} cast voice(s) are NOT in the roster — a wave pass dies on these:`);
  for (const b of brokenCasting) console.log(`   ${b.voice}  (${b.ids.length}) ${b.ids.join(', ')}`);
}
console.log(`\ncontact sheet: ${sheetPath}`);
if (open) execFileSync('open', [sheetPath]);

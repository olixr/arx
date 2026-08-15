/**
 * SOUND LAB — the audition bench for everything the world SOUNDS like
 * outside the streamed music library: the ambience system's beds and
 * one-shot voices (all synthesized in audio/ambience.ts), the world
 * SFX most often mistaken for them (footsteps, foraging — the usual
 * "what is that rustling?" suspects, audio/sfx.ts), and the recorded
 * shelf (/public/sfx samples).
 *
 * Beds (wind rustle, cave rumble, waterfall, riftgate drone, cricket
 * carriers) are continuous and gated by place/hour/field state, so
 * the lab drives the REAL AmbienceSystem.update() with scenario
 * presets instead of faking the graph — what you hear is exactly the
 * game's voice. One-shots are private methods on the system; the lab
 * reaches them through a structural cast (dev bench privilege).
 */

import { AudioEngine } from '../audio/engine.js';
import { Sfx, SAMPLE_NAMES, type SampleName } from '../audio/sfx.js';
import { AmbienceSystem } from '../audio/ambience.js';
import { SILENT_EAR, type FallEar } from '../audio/falls.js';
import type { ZoneWeights } from '../audio/zones.js';

const engine = new AudioEngine();
const sfx = new Sfx(engine);
const ambience = new AmbienceSystem(engine);

/** The bench key to the ambience system's private one-shot voices. */
interface AmbienceVoices {
  birdPhrase(ctx: AudioContext, bus: GainNode, t: number, gate: number): void;
  dove(ctx: AudioContext, bus: GainNode, t: number): void;
  woodpecker(ctx: AudioContext, bus: GainNode, t: number): void;
  cricketBurst(ctx: AudioContext, voice: number, t: number): void;
  drip(ctx: AudioContext, bus: GainNode, t: number): void;
  dogBark(ctx: AudioContext, bus: GainNode, t: number): void;
  owlHoot(ctx: AudioContext, bus: GainNode, t: number): void;
  portalMood(ctx: AudioContext, bus: GainNode, t: number, near: number): void;
  cricketGains: GainNode[];
}
const voices = ambience as unknown as AmbienceVoices;

// ---- scenarios driving the continuous beds --------------------------

interface Scenario {
  label: string;
  w: ZoneWeights;
  hours: number;
  portalNear: number;
  fall: FallEar;
  note: string;
}

const SCENARIOS: Scenario[] = [
  {
    label: 'Silent',
    w: { town: 0, wild: 0, cave: 0 },
    hours: 12,
    portalNear: 0,
    fall: SILENT_EAR,
    note: 'all beds gated shut — the bench floor',
  },
  {
    label: 'Wild, day',
    w: { town: 0, wild: 1, cave: 0 },
    hours: 12,
    portalNear: 0,
    fall: SILENT_EAR,
    note: 'leaf-rustle gusts + songbirds + dove + rare woodpecker',
  },
  {
    label: 'Wild, night',
    w: { town: 0, wild: 1, cave: 0 },
    hours: 23,
    portalNear: 0,
    fall: SILENT_EAR,
    note: 'the two cricket voices + a rare owl; wind gusts stay (quieter register)',
  },
  {
    label: 'Town, day',
    w: { town: 1, wild: 0, cave: 0 },
    hours: 12,
    portalNear: 0,
    fall: SILENT_EAR,
    note: 'half-strength rustle + birds + a far-off dog now and then',
  },
  {
    label: 'Cave',
    w: { town: 0, wild: 0, cave: 1 },
    hours: 12,
    portalNear: 0,
    fall: SILENT_EAR,
    note: 'low rumble bed + echoing drips',
  },
  {
    label: 'Waterfall, close',
    w: { town: 0, wild: 1, cave: 0 },
    hours: 12,
    portalNear: 0,
    fall: { near: 0.95, pan: 0.25, heft: 0.8 },
    note: 'the roil body + tall-drop rumble, seated right of center',
  },
  {
    label: 'Waterfall, far',
    w: { town: 0, wild: 1, cave: 0 },
    hours: 12,
    portalNear: 0,
    fall: { near: 0.35, pan: -0.4, heft: 0.3 },
    note: 'the dark far hush the lowpass makes of distance',
  },
  {
    label: 'Riftgate',
    w: { town: 0, wild: 1, cave: 0 },
    hours: 12,
    portalNear: 0.95,
    fall: SILENT_EAR,
    note: 'beating drone + wobbling shimmer + eerie whines/womps',
  },
];

let scenario = SCENARIOS[0]!;

// ---- the bench rows -------------------------------------------------

interface Row {
  name: string;
  src: string;
  desc: string;
  play: () => void;
}

/** Fire a private one-shot with the graph warm (first update builds it). */
function shot(body: (ctx: AudioContext, bus: GainNode, t: number) => void): void {
  const ctx = engine.ctx;
  const bus = engine.ambience;
  if (!ctx || !bus) return;
  body(ctx, bus, ctx.currentTime + 0.03);
}

const ONE_SHOTS: Row[] = [
  {
    name: 'Songbird phrase',
    src: 'ambience.ts · birdPhrase()',
    desc: '2–5 warbles from one spot in the canopy; some singers far off',
    play: () => shot((ctx, bus, t) => voices.birdPhrase(ctx, bus, t, 1)),
  },
  {
    name: 'Mourning dove',
    src: 'ambience.ts · dove()',
    desc: 'the rising coo-ah-OOO, then low even coos',
    play: () => shot((ctx, bus, t) => voices.dove(ctx, bus, t)),
  },
  {
    name: 'Woodpecker',
    src: 'ambience.ts · woodpecker()',
    desc: 'a fast decaying drum roll on a far snag',
    play: () => shot((ctx, bus, t) => voices.woodpecker(ctx, bus, t)),
  },
  {
    name: 'Cricket chirp',
    src: 'ambience.ts · cricketBurst()',
    desc: 'one three-pulse chirp (the night bed is many of these)',
    play: () =>
      shot((ctx, _bus, t) => {
        // The carrier is gated by the night — hold it open for the burst.
        const g = voices.cricketGains[0];
        if (g) {
          g.gain.setValueAtTime(0.038, t);
          g.gain.setTargetAtTime(0, t + 0.15, 0.2);
        }
        voices.cricketBurst(ctx, 0, t);
      }),
  },
  {
    name: 'Cave drip',
    src: 'ambience.ts · drip()',
    desc: 'a single water drip off in the dark (bus reverb makes the cavern)',
    play: () => shot((ctx, bus, t) => voices.drip(ctx, bus, t)),
  },
  {
    name: 'Town dog bark',
    src: 'ambience.ts · dogBark()',
    desc: 'a dog somewhere behind the houses — wuff, ruff-ruff, or a short string',
    play: () => shot((ctx, bus, t) => voices.dogBark(ctx, bus, t)),
  },
  {
    name: 'Owl hoot',
    src: 'ambience.ts · owlHoot()',
    desc: 'the low four-note night call, off in the dark',
    play: () => shot((ctx, bus, t) => voices.owlHoot(ctx, bus, t)),
  },
  {
    name: 'Riftgate mood',
    src: 'ambience.ts · portalMood()',
    desc: 'a warped whine gliss (or, sometimes, a deep womp) near a portal',
    play: () => shot((ctx, bus, t) => voices.portalMood(ctx, bus, t, 1)),
  },
];

const SFX_SUSPECTS: Row[] = [
  {
    name: 'Footstep — grass',
    src: 'sfx.ts · footstep(grass)',
    desc: 'a muted low crush, nearly silent — one whisper of blade-tips under it',
    play: () => sfx.footstep('grass', 0.5),
  },
  {
    name: 'Footstep — dirt',
    src: 'sfx.ts · footstep(dirt)',
    desc: 'the soft default thud',
    play: () => sfx.footstep('dirt', 0.5),
  },
  {
    name: 'Forage pluck',
    src: 'sfx.ts · forage()',
    desc: 'a stem snapping free — leafy brush with a soft pop',
    play: () => sfx.forage(),
  },
  {
    name: 'Bird flutter',
    src: 'sfx.ts · birdFlutter()',
    desc: 'a flock flushing off the turf — feathered wing puffs + alarm chips',
    play: () => sfx.birdFlutter(),
  },
  {
    name: 'Bird chip',
    src: 'sfx.ts · birdChip()',
    desc: 'one idle chip from a grounded bird',
    play: () => sfx.birdChip(),
  },
  {
    name: 'Grass swing',
    src: 'sfx.ts · swing()',
    desc: 'the weapon whoosh — short breathy noise, sometimes read as leaves',
    play: () => sfx.swing(),
  },
];

/** A cold sample warms on first ask — retry briefly so the button lands. */
function playSample(name: SampleName): void {
  if (sfx.sample(name)) return;
  const iv = window.setInterval(() => {
    if (sfx.sample(name)) window.clearInterval(iv);
  }, 200);
  window.setTimeout(() => window.clearInterval(iv), 3000);
}

const SAMPLE_ROWS: Row[] = SAMPLE_NAMES.map((n) => ({
  name: n,
  src: `public/sfx/${n}.mp3`,
  desc: '',
  play: () => playSample(n),
}));

// ---- DOM ------------------------------------------------------------

const root = document.getElementById('lab')!;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}

function section(title: string): HTMLElement {
  const s = h('h2', '', title);
  root.appendChild(s);
  return s;
}

function addRows(rows: Row[]): void {
  for (const r of rows) {
    const row = h('div', 'row');
    const btn = h('button', '', 'Play');
    btn.addEventListener('click', () => {
      sfx.unlock();
      r.play();
    });
    row.appendChild(btn);
    row.appendChild(h('span', 'name', r.name));
    row.appendChild(h('span', 'src', r.src));
    row.appendChild(h('span', 'desc', r.desc));
    root.appendChild(row);
  }
}

// Scenario picker for the continuous beds.
section('Continuous beds — pick a scenario, the real ambience system plays it');
const scen = h('div', 'scen');
const scenNote = h('p', 'note');
const scenBtns: HTMLButtonElement[] = [];
for (const s of SCENARIOS) {
  const b = h('button', '', s.label);
  b.addEventListener('click', () => {
    sfx.unlock();
    scenario = s;
    scenNote.textContent = s.note;
    for (const o of scenBtns) o.classList.toggle('on', o === b);
  });
  scenBtns.push(b);
  scen.appendChild(b);
}
scenBtns[0]!.classList.add('on');
scenNote.textContent = SCENARIOS[0]!.note;
root.appendChild(scen);
root.appendChild(scenNote);

// The wind lever: gusts are a field in the game — force one here.
const windCtl = h('div', 'ctl');
const windCheck = h('input', '');
windCheck.type = 'checkbox';
const windSlider = h('input', '');
windSlider.type = 'range';
windSlider.min = '0';
windSlider.max = '1';
windSlider.step = '0.01';
windSlider.value = '0.9';
const windLabel = h('span', '', 'Force wind gust (leaf rustle) — strength:');
const syncWind = (): void => {
  ambience.devWindOverride = windCheck.checked ? Number(windSlider.value) : null;
};
windCheck.addEventListener('change', () => {
  sfx.unlock();
  syncWind();
});
windSlider.addEventListener('input', syncWind);
windCtl.appendChild(windCheck);
windCtl.appendChild(windLabel);
windCtl.appendChild(windSlider);
root.appendChild(windCtl);
const rustleNote = h(
  'p',
  'note',
  'The leaf rustle (ambience.ts · makeRustleBuffer — granular flutter grains, bandpassed ~4 kHz) sounds ' +
    'ONLY while a gust crests. Pick "Wild, day" and tick the force-gust box to hold it open.',
);
root.appendChild(rustleNote);
const gates = h('div', 'gates');
root.appendChild(gates);

section('Ambience one-shots — the event voices the beds deal out');
addRows(ONE_SHOTS);

section('World SFX often mistaken for ambience (the rustling suspects)');
addRows(SFX_SUSPECTS);

section('The recorded shelf — mastered samples in public/sfx');
addRows(SAMPLE_ROWS);

// ---- the loop -------------------------------------------------------

const unlockVeil = document.getElementById('unlock')!;
unlockVeil.addEventListener('pointerdown', () => {
  sfx.unlock();
  unlockVeil.remove();
});

function frame(now: number): void {
  // A fixed wild spot; real time walks the wind field so gusts breathe.
  ambience.update(300, 48, scenario.w, scenario.hours, now / 1000, scenario.portalNear, scenario.fall);
  const g = ambience.gates;
  gates.textContent =
    `gates — wind ${g.wind.toFixed(3)} · birds ${g.birds.toFixed(2)} · crickets ${g.crickets.toFixed(2)}` +
    ` · cave ${g.cave.toFixed(2)} · portal ${g.portal.toFixed(3)} · fall ${g.fall.toFixed(3)}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

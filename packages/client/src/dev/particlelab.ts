/**
 * THE PARTICLE LAB (particles v6, phase 4) — fxlab.html.
 *
 * A standalone stage for mastering composed effects: a grass ground
 * with a tile grid (the body ruler), a standing figure at true scale
 * so every effect is judged against the thing it wraps, the whole
 * effect roster, LIVE knobs over every numeric field of every layer
 * (edits mutate the definition in place, so what you tune is what
 * ships), time scale for slow-motion audit, the governor's dial, a
 * stress receipt (N casts at once, update/draw ms), and JSON export.
 *
 * Deterministic by construction: a seeded PRNG drives the engine, so
 * a screenshot at frame N is the same screenshot tomorrow. The
 * Playwright harness drives it through `window.fxlab`:
 *   cast(id?, params?)   step(frames, dt = 1/60)   render()
 *   stats()              select(id)               stress(n)
 *
 * Levers: ?fx=<id>  ?k=<px/tile>  ?auto=0 (no rAF — harness stepping)
 *         ?seed=<n>  ?t=<time scale>
 */

import { LAYER_GROUND, LAYER_OVERLAY, LAYER_WORLD, Particles, type BurstOpts } from '../render/particles.js';
import { EffectSystem, type CastParams, type EffectDef, type Layer } from '../render/fx/effects.js';
import { GroundMarks } from '../render/fx/groundMarks.js';
import { EFFECTS, EFFECT_LIST } from '../render/fx/library/index.js';
import { curveKeyOf, rampKeyOf } from '../render/fx/curves.js';

const q = new URLSearchParams(location.search);
const K0 = Number(q.get('k') ?? 72);
const AUTO = q.get('auto') !== '0';
const SEED = Number(q.get('seed') ?? 7);
let timeScale = Number(q.get('t') ?? 1);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const panel = document.getElementById('panel')!;

let K = K0;
const particles = new Particles(mulberry32(SEED));
const marks = new GroundMarks();
interface Glow { x: number; y: number; r: number; rgb: string; a: number }
const glows: Glow[] = [];
const effects = new EffectSystem(particles, (x, y, r, rgb, a) => glows.push({ x, y, r, rgb, a }));

/** The stage camera: world tile (0,0) sits left-center; y is 1:1. */
let W = 0;
let H = 0;
let camX = 0;
let camY = 0;
const scratch = { x: 0, y: 0 };
const worldToScreen = (wx: number, wy: number): { x: number; y: number } => {
  scratch.x = (W - 340) * 0.5 + (wx - camX) * K;
  scratch.y = H * 0.55 + (wy - camY) * K;
  return scratch;
};

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- state

let current: EffectDef = EFFECTS[q.get('fx') ?? 'fire.burst'] ?? EFFECT_LIST[0]!;
let repeat = false;
let repeatAt = 0;
let simTime = 0;
const params: CastParams = { scale: 1, radius: 1, dir: 0 };
const stats = { update: 0, draw: 0, frame: 0, casts: 0 };
/** The stage: cast point (the figure stands 1.1 tiles west of it). */
const CAST_X = 0.6;
const CAST_Y = 0.1;
const FIGURE_X = -0.7;
const FIGURE_Y = 0.35;

function cast(id?: string, p?: CastParams): void {
  const def = id ? EFFECTS[id] : current;
  if (!def) return;
  const pp = { ...params, ...p, x2: CAST_X + 2.0, y2: CAST_Y - 0.7 };
  effects.cast(def, CAST_X, CAST_Y, pp);
  stats.casts++;
}

function stress(n: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.4 + (i % 5) * 0.5;
    effects.cast(current, CAST_X + Math.cos(a) * r, CAST_Y + Math.sin(a) * r * 0.7, { ...params, x2: CAST_X + 2, y2: CAST_Y - 0.7 });
  }
  stats.casts += n;
}

function step(dt: number): void {
  const t0 = performance.now();
  simTime += dt;
  glows.length = 0;
  effects.update(dt);
  particles.update(dt);
  particles.drainLandings((l) => marks.ingest(l, simTime));
  marks.prune(simTime);
  if (repeat && simTime >= repeatAt) {
    cast();
    repeatAt = simTime + 3.0;
  }
  stats.update += (performance.now() - t0 - stats.update) * 0.1;
}

// ---------------------------------------------------------------- draw

const GRASS = '#4a5d3a';
const GRASS_LINE = '#3f5031';
const INK = '#241a2e';

function drawGround(): void {
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GRASS_LINE;
  ctx.lineWidth = 1;
  const o = worldToScreen(0, 0);
  const ox = o.x % K;
  const oy = o.y % K;
  ctx.beginPath();
  for (let x = ox; x < W; x += K) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = oy; y < H; y += K) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

/** A standing figure at the body ruler's scale (~1.15 tiles tall). */
function drawFigure(): void {
  const p = worldToScreen(FIGURE_X, FIGURE_Y);
  const x = p.x;
  const y = p.y;
  const h = K * 1.15;
  // contact shadow
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, K * 0.3, K * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // legs, torso, head — flat vector blocks in the game's ink + cloth
  ctx.fillStyle = '#3a3442';
  ctx.fillRect(x - K * 0.16, y - h * 0.42, K * 0.13, h * 0.42);
  ctx.fillRect(x + K * 0.03, y - h * 0.42, K * 0.13, h * 0.42);
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(x - K * 0.2, y - h * 0.78, K * 0.4, h * 0.38);
  ctx.fillStyle = '#e8c39e';
  ctx.fillRect(x - K * 0.12, y - h, K * 0.24, h * 0.2);
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(x - K * 0.13, y - h - K * 0.03, K * 0.26, h * 0.08);
}

function drawGlows(): void {
  if (glows.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const g of glows) {
    const p = worldToScreen(g.x, g.y);
    // Three flat rings — a posterized halo, no gradient.
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = g.a * 0.13 * (4 - i) / 3;
      ctx.fillStyle = `rgb(${g.rgb})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, g.r * K * 0.75 * (i / 3), g.r * K * 0.75 * (i / 3) * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

interface Item { y: number; kind: number; idx: number }
const items: Item[] = [];

function render(): void {
  const t0 = performance.now();
  drawGround();
  marks.draw(ctx, worldToScreen, K, simTime);
  drawGlows();
  const pool = particles.livePool();
  // Ground layer first, then the world y-sort with the figure inside it.
  particles.beginRun();
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (p.layer === LAYER_GROUND) particles.drawOne(ctx, p, worldToScreen, K);
  }
  particles.endRun();
  items.length = 0;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (p.layer === LAYER_WORLD) items.push({ y: p.y, kind: 1, idx: i });
  }
  items.push({ y: FIGURE_Y, kind: 0, idx: -1 });
  items.sort((a, b) => a.y - b.y);
  particles.beginRun();
  for (const it of items) {
    if (it.kind === 0) {
      particles.endRun();
      drawFigure();
      particles.beginRun();
    } else {
      particles.drawOne(ctx, pool[it.idx]!, worldToScreen, K);
    }
  }
  particles.endRun();
  particles.draw(ctx, worldToScreen, K, W, H);
  // The overlay layer count for the stats line.
  let overlay = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i]!.layer === LAYER_OVERLAY) overlay++;
  stats.draw += (performance.now() - t0 - stats.draw) * 0.1;
  statsEl.textContent =
    `effect  ${current.id}\n` +
    `grains  ${particles.count()}  (overlay ${overlay})\n` +
    `emit    ${particles.emitterCount()}   fields ${particles.fieldCount()}   marks ${marks.count()}\n` +
    `casts   ${effects.castCount()} live · ${effects.pendingCount()} pending · ${stats.casts} total\n` +
    `update  ${stats.update.toFixed(2)} ms   draw ${stats.draw.toFixed(2)} ms\n` +
    `quality ${particles.quality.toFixed(2)}   time ×${timeScale.toFixed(2)}   sim ${simTime.toFixed(2)}s`;
}

// ---------------------------------------------------------------- panel

panel.innerHTML = `
  <h1>Particle Lab</h1>
  <select id="fx"></select>
  <p class="story" id="story"></p>
  <div class="row">
    <button id="cast">Cast (space)</button>
    <button id="repeat">Repeat (r)</button>
    <button id="stress">Stress ×24</button>
    <button id="clear">Clear</button>
  </div>
  <h2>Stage</h2>
  <label>time scale <input id="tscale" type="range" min="0.05" max="1" step="0.05"><input id="tscaleN" type="number" step="0.05"></label>
  <label>px / tile <input id="kpx" type="range" min="24" max="160" step="4"><input id="kpxN" type="number" step="4"></label>
  <label>quality <input id="quality" type="range" min="0.35" max="1" step="0.05"><input id="qualityN" type="number" step="0.05"></label>
  <h2>Cast params</h2>
  <label>scale <input id="pscale" type="range" min="0.25" max="3" step="0.05"><input id="pscaleN" type="number" step="0.05"></label>
  <label>radius <input id="pradius" type="range" min="0.2" max="3" step="0.1"><input id="pradiusN" type="number" step="0.1"></label>
  <label>aim <input id="pdir" type="range" min="-3.14" max="3.14" step="0.05"><input id="pdirN" type="number" step="0.05"></label>
  <h2>Stats</h2>
  <div id="stats"></div>
  <h2>Layers</h2>
  <div id="layers"></div>
  <h2>Export</h2>
  <button id="export">Export JSON</button>
  <textarea id="exportOut"></textarea>
`;

const statsEl = document.getElementById('stats')!;
const fxSel = document.getElementById('fx') as HTMLSelectElement;
for (const e of EFFECT_LIST) {
  const o = document.createElement('option');
  o.value = e.id;
  o.textContent = e.name;
  fxSel.appendChild(o);
}
fxSel.value = current.id;

function bindRange(id: string, get: () => number, set: (v: number) => void): void {
  const r = document.getElementById(id) as HTMLInputElement;
  const n = document.getElementById(id + 'N') as HTMLInputElement;
  const sync = () => { r.value = String(get()); n.value = String(get()); };
  r.addEventListener('input', () => { set(Number(r.value)); sync(); });
  n.addEventListener('change', () => { set(Number(n.value)); sync(); });
  sync();
}

bindRange('tscale', () => timeScale, (v) => { timeScale = v; });
bindRange('kpx', () => K, (v) => { K = v; });
bindRange('quality', () => particles.quality, (v) => { particles.quality = v; effects.governor.quality = v; });
bindRange('pscale', () => params.scale ?? 1, (v) => { params.scale = v; });
bindRange('pradius', () => params.radius ?? 1, (v) => { params.radius = v; });
bindRange('pdir', () => params.dir ?? 0, (v) => { params.dir = v; });

/** The numeric knobs of a recipe worth a slider, in reading order. */
const OPT_KEYS: Array<keyof BurstOpts> = [
  'speed', 'speedVar', 'life', 'lifeVar', 'size', 'sizeVar', 'gravity', 'drag', 'grow',
  'z', 'vz', 'zg', 'bounce', 'spin', 'flicker', 'trail', 'wobble',
  'waveHz', 'waveAmp', 'jitter', 'mass', 'coreK', 'shedRate', 'markLife', 'spread',
  'boltRate', 'boltBranch',
];

function knob(label: string, get: () => number, set: (v: number) => void, stepV = 0.01): HTMLElement {
  const row = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = label;
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.step = String(stepV);
  inp.value = String(get());
  inp.addEventListener('change', () => set(Number(inp.value)));
  row.appendChild(span);
  row.appendChild(inp);
  return row;
}

function optsKnobs(opts: BurstOpts, into: HTMLElement): void {
  const o = opts as unknown as Record<string, unknown>;
  const info = document.createElement('div');
  info.style.cssText = 'color:#8a8394;font-size:11px;margin:2px 0 4px';
  info.textContent =
    `${opts.shape ?? 'square'} · ${opts.layer ?? 'overlay'}` +
    (opts.sizeCurve ? ` · size ${curveKeyOf(opts.sizeCurve)}` : '') +
    (opts.alphaCurve ? ` · alpha ${curveKeyOf(opts.alphaCurve)}` : '') +
    (opts.ramp ? ` · ramp ${rampKeyOf(opts.ramp).split('@')[0]}` : '') +
    (opts.wave ? ` · wave ${opts.wave}/${opts.waveAxis ?? 'x'}` : '') +
    (opts.land ? ` · land ${opts.land}` : '') +
    (opts.mark ? ` · mark ${opts.mark}` : '');
  into.appendChild(info);
  for (const k of OPT_KEYS) {
    if (typeof o[k] !== 'number') continue;
    into.appendChild(knob(k, () => o[k] as number, (v) => { o[k] = v; }));
  }
}

function layerCard(L: Layer, i: number): HTMLElement {
  const d = document.createElement('details');
  d.className = 'layer';
  const s = document.createElement('summary');
  s.innerHTML = `${i + 1}. ${L.name}<span class="kind">${L.kind}${L.at ? ` @${L.at}s` : ''}${L.tier ? ` · ${L.tier}` : ''}</span>`;
  d.appendChild(s);
  const Lr = L as unknown as Record<string, unknown>;
  d.appendChild(knob('at (s)', () => (L.at ?? 0), (v) => { Lr.at = v; }));
  if (L.every !== undefined) {
    d.appendChild(knob('every (s)', () => L.every ?? 0, (v) => { Lr.every = v; }));
    d.appendChild(knob('times', () => L.times ?? 0, (v) => { Lr.times = v; }, 1));
  }
  if (L.kind === 'burst') {
    d.appendChild(knob('count', () => L.count, (v) => { L.count = v; }, 1));
    if (L.radius !== undefined) d.appendChild(knob('radius', () => L.radius ?? 0, (v) => { L.radius = v; }));
    if (L.dz !== undefined) d.appendChild(knob('dz', () => L.dz ?? 0, (v) => { L.dz = v; }));
    if (L.spread !== undefined) d.appendChild(knob('spread', () => L.spread ?? 0, (v) => { L.spread = v; }));
    optsKnobs(L.recipe.opts, d);
  } else if (L.kind === 'emit') {
    d.appendChild(knob('rate', () => L.rate, (v) => { L.rate = v; }, 1));
    d.appendChild(knob('dur', () => L.dur, (v) => { L.dur = v; }, 0.1));
    d.appendChild(knob('attack', () => L.attack ?? 0.06, (v) => { L.attack = v; }));
    d.appendChild(knob('release', () => L.release ?? 0.2, (v) => { L.release = v; }));
    if (L.radius !== undefined) d.appendChild(knob('radius', () => L.radius ?? 0, (v) => { L.radius = v; }));
    L.pops.forEach((pop, pi) => {
      const h = document.createElement('div');
      h.style.cssText = 'margin-top:6px;color:#c9a76a';
      h.textContent = `pop ${pi + 1}${pop.tier ? ` · ${pop.tier}` : ''} · weight ${pop.weight ?? 1}`;
      d.appendChild(h);
      optsKnobs(pop.opts, d);
    });
  } else if (L.kind === 'field') {
    const f = L.field as unknown as Record<string, unknown>;
    d.appendChild(knob('radius', () => L.field.radius, (v) => { f.radius = v; }));
    d.appendChild(knob('strength', () => L.field.strength, (v) => { f.strength = v; }));
    d.appendChild(knob('dur', () => L.field.dur, (v) => { f.dur = v; }, 0.1));
    if (L.field.height !== undefined) d.appendChild(knob('height', () => L.field.height ?? 0, (v) => { f.height = v; }));
  } else {
    d.appendChild(knob('r', () => L.r, (v) => { L.r = v; }));
    d.appendChild(knob('a', () => L.a, (v) => { L.a = v; }));
    d.appendChild(knob('dur', () => L.dur ?? 0, (v) => { L.dur = v; }, 0.1));
    if (L.flicker !== undefined) d.appendChild(knob('flicker', () => L.flicker ?? 0, (v) => { L.flicker = v; }));
  }
  return d;
}

function showLayers(): void {
  const host = document.getElementById('layers')!;
  host.innerHTML = '';
  current.layers.forEach((L, i) => host.appendChild(layerCard(L, i)));
  document.getElementById('story')!.textContent = current.story ?? '';
}

function select(id: string): void {
  const def = EFFECTS[id];
  if (!def) return;
  current = def;
  fxSel.value = id;
  showLayers();
}

fxSel.addEventListener('change', () => select(fxSel.value));
document.getElementById('cast')!.addEventListener('click', () => cast());
document.getElementById('repeat')!.addEventListener('click', () => { repeat = !repeat; repeatAt = simTime; });
document.getElementById('stress')!.addEventListener('click', () => stress(24));
document.getElementById('clear')!.addEventListener('click', () => { particles.clear(); effects.clear(); marks.clear(); });

/** Export the definition with curve/ramp ids resolved to their keys. */
function exportJson(): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(current, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[shared]';
      seen.add(value);
    }
    if ((key === 'sizeCurve' || key === 'alphaCurve') && typeof value === 'number') return curveKeyOf(value);
    if (key === 'ramp' && typeof value === 'number') return rampKeyOf(value);
    return value;
  }, 2);
}
document.getElementById('export')!.addEventListener('click', () => {
  (document.getElementById('exportOut') as HTMLTextAreaElement).value = exportJson();
});

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
  if (e.key === ' ') { cast(); e.preventDefault(); }
  else if (e.key === 'r') { repeat = !repeat; repeatAt = simTime; }
  else if (e.key === '[' || e.key === ']') {
    const i = EFFECT_LIST.findIndex((d) => d.id === current.id);
    const n = EFFECT_LIST.length;
    select(EFFECT_LIST[(i + (e.key === ']' ? 1 : n - 1)) % n]!.id);
  }
});

showLayers();

// ---------------------------------------------------------------- loop

let last = performance.now();
function frame(now: number): void {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(raw * timeScale);
  render();
  if (AUTO) requestAnimationFrame(frame);
}
if (AUTO) requestAnimationFrame(frame);
else render();

/**
 * THE CONTACT SHEET: one fresh cast, N moments, each cropped around
 * the cast point into a strip canvas the harness can screenshot as a
 * single image — the master-pass audit reads a whole life at once.
 */
function contact(moments: number[], cw = 420, ch = 340, label = ''): HTMLCanvasElement {
  const old = document.getElementById('contact');
  if (old) old.remove();
  particles.clear();
  effects.clear();
  marks.clear();
  simTime = 0;
  const cols = Math.min(4, moments.length);
  const rows = Math.ceil(moments.length / cols);
  const strip = document.createElement('canvas');
  strip.id = 'contact';
  strip.width = cols * cw;
  strip.height = rows * ch;
  strip.style.cssText = 'position:fixed;left:0;top:0;z-index:10;background:#000';
  const sctx = strip.getContext('2d')!;
  const dpr = canvas.width / W;
  cast();
  let t = 0;
  moments.forEach((m, i) => {
    const frames = Math.max(0, Math.round((m - t) * 60));
    for (let f = 0; f < frames; f++) step(1 / 60);
    t = m;
    render();
    const c = worldToScreen(CAST_X, CAST_Y - 0.55);
    const sx = (c.x - cw / 2) * dpr;
    const sy = (c.y - ch / 2) * dpr;
    const dx = (i % cols) * cw;
    const dy = Math.floor(i / cols) * ch;
    sctx.drawImage(canvas, sx, sy, cw * dpr, ch * dpr, dx, dy, cw, ch);
    sctx.fillStyle = 'rgba(0,0,0,0.55)';
    sctx.fillRect(dx, dy, 150, 18);
    sctx.fillStyle = '#f2c94c';
    sctx.font = '12px ui-monospace, monospace';
    sctx.fillText(`${label || current.id} ${m.toFixed(2)}s · ${particles.count()}g ${marks.count()}m`, dx + 4, dy + 13);
    sctx.strokeStyle = '#000';
    sctx.strokeRect(dx + 0.5, dy + 0.5, cw - 1, ch - 1);
  });
  document.body.appendChild(strip);
  return strip;
}

(window as unknown as { fxlab: unknown }).fxlab = {
  cast,
  contact,
  select,
  stress,
  step(frames: number, dt = 1 / 60): void {
    for (let i = 0; i < frames; i++) step(dt);
    render();
  },
  render,
  stats: () => ({
    grains: particles.count(),
    emitters: particles.emitterCount(),
    fields: particles.fieldCount(),
    marks: marks.count(),
    update: stats.update,
    draw: stats.draw,
    quality: particles.quality,
    sim: simTime,
  }),
  effects: EFFECT_LIST.map((d) => d.id),
  exportJson,
  setTimeScale(v: number): void { timeScale = v; },
};

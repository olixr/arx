// TEMPORARY verification harness (checked-in tooling, the grasslab /
// hoblab precedent): THE FOLD LAB — the screenshot-judged acceptance
// rig for THE LIVING GROUND's palette (docs/contested-lands-plan.md
// §12.6, §12.8 LG-1). One meadow, four looks (the turn, the flush,
// blight, burn), each as a 0→1 RAMP STRIP (a soft-1 rect stroke: the
// field climbs from nothing at the west edge to the plateau at the
// east, so every band and its hem stand in a line) and ONE LIVE DISC
// (a circle stroke with the plan's soft/grain, the ONION AUDIT's
// subject: three bands must read as a country, never as contour
// rings), at NOON and at MIDNIGHT (the frame's own multiply ambient
// at hour 0), with the BODY RULER standing on the held ground so
// every mark is judged against the 1.15-tile rig. A fifth block, THE
// HEM, overlaps burn, blight and the turn in one cell: precedence is
// decided per corner, so the washes overlap and the higher look paints
// on top — no gap, no seam.
//
// The bakes are THE GAME'S OWN: bakeChunk over a synthetic meadow
// (grass, a wandering road, a dirt yard) with the stroke registry
// stamped through render/fold.ts's setSpectrum — the very door the
// wire feeds — so the sheet renders exactly what lands in the field.
// The unfolded twin of every chunk is baked too, and the cost ratio
// (folded / unfolded, interleaved A/B, median of 15) is printed: LG-1's ≤ 1.25× gate.
//
// Levers:
//   ?s=px        tile scale (default 32, the shipping tier; 64 = hi-res)
//   ?look=name   one block only (autumn | spring | blight | burn | hem)
//   ?fold=SPEC   stamp a TEST STROKE REGISTRY into the disc cell and
//                render it as its own block: SPEC is either a JSON
//                array of wire strokes (x, y in the disc cell's own
//                0..31 tile space) or a compact list
//                `axis:amp[:soft[:grain[:r]]];axis:amp...`
//                e.g. ?fold=blight:1:0.5:0.6:10;burn:0.7:0.4:0.3:6
import { Detail, PoseState, Tile, daylightAt } from '@arx/shared';
import { band, BAND_HELD, BAND_TAKEN, BAND_TOUCHED, type SpectrumAxis, type SpectrumStroke } from '@arx/content';
import { bakeChunk, foldSigFor, foldHaloSigFor, startChunkBake } from '../render/terrain.js';
import { resetSpectrum, setSpectrum } from '../render/fold.js';
import {
  FOLD_AUTUMN,
  FOLD_BLIGHT,
  FOLD_BURN,
  FOLD_LOOK_NAMES,
  FOLD_SPRING,
  FRINGE_ALT,
  SUBSTRATE_FOLD,
  foldLaneSeed,
} from '../render/foldSkins.js';
import { drawHumanoid, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const q = new URLSearchParams(location.search);
const PX = Math.max(16, Math.min(64, parseInt(q.get('s') ?? '32', 10) || 32));
const ONLY = q.get('look');
const CUSTOM = q.get('fold');

// ------------------------------------------------------- the meadow

const CHUNK = 32;
/** The strip lives in chunk row 0 (world y 0..7 shown); the disc in
 *  chunk (0, 4) (world y 128..159). Separate rows so one registry can
 *  carry both strokes without their reaches meeting. */
const DISC_CY = 4;
const DISC_Y0 = DISC_CY * CHUNK;
const STRIP_TILES = 56; // 48 of ramp + 8 of plateau
const STRIP_ROWS = 8;
const DISC_TILES = 26; // the cell is cropped around the disc (r 10 + hem)
const DISC_OFF = (CHUNK - DISC_TILES) / 2;

function ground(tx: number, ty: number): number {
  if (ty >= DISC_Y0) {
    const roadY = 143 + Math.round(Math.sin(tx * 0.4) * 1.2);
    if (ty === roadY || ty === roadY + 1) return Tile.Path;
    if (Math.hypot(tx - 9, ty - 149) < 2.4) return Tile.Dirt;
    return Tile.Grass;
  }
  const roadY = 5 + Math.round(Math.sin(tx * 0.35) * 1.4);
  if (ty === roadY) return Tile.Path;
  if (Math.hypot(tx - 30, ty - 1.5) < 2.1) return Tile.Dirt;
  return Tile.Grass;
}
const detail = (): number => Detail.None;
const elev = (): number => 0;

// ------------------------------------------------------ the strokes

interface Look {
  key: string;
  look: number;
  axis: SpectrumAxis;
  amp: number;
}
const LOOKS: Look[] = [
  { key: 'autumn', look: FOLD_AUTUMN, axis: 'season', amp: 1 },
  { key: 'spring', look: FOLD_SPRING, axis: 'season', amp: -1 },
  { key: 'blight', look: FOLD_BLIGHT, axis: 'blight', amp: 1 },
  { key: 'burn', look: FOLD_BURN, axis: 'burn', amp: 1 },
];

/** The ramp: a rect whose soft-1 hem climbs 0→amp across 48 tiles. */
function rampStroke(l: Look): SpectrumStroke {
  return {
    id: `lab_ramp_${l.key}`,
    axis: l.axis,
    shape: { kind: 'rect', x: 48, y: -64, w: 128, h: 136, pad: 48 },
    amp: l.amp,
    soft: 1,
    grain: 0,
    mode: 'max',
  };
}
/** The live disc: the plan's country — held at the heart, taken through, touched into the meadow. */
function discStroke(l: Look, r = 10, soft = 0.5, grain = 0.6, dx = 0, dy = 0): SpectrumStroke {
  return {
    id: `lab_disc_${l.key}_${dx}_${dy}`,
    axis: l.axis,
    shape: { kind: 'circle', x: 16 + dx, y: DISC_Y0 + 16 + dy, r },
    amp: l.amp,
    soft,
    grain,
    mode: 'max',
  };
}

interface Block {
  title: string;
  look: number | null;
  strip: boolean;
  strokes: SpectrumStroke[];
  note: string;
}

const blocks: Block[] = [];
for (const l of LOOKS) {
  if (ONLY && ONLY !== l.key) continue;
  const name = FOLD_LOOK_NAMES[l.look]!;
  blocks.push({
    title: `${name.toUpperCase()} — ${l.axis} ${l.amp > 0 ? '+' : ''}${l.amp}`,
    look: l.look,
    strip: true,
    strokes: [rampStroke(l), discStroke(l)],
    note:
      l.look === FOLD_AUTUMN
        ? 'the turn: olive (touched) → straw / ochre (taken) → the cold (held = winter)'
        : l.look === FOLD_SPRING
          ? 'the flush: a half-step lighter and greener; no wash marks (the blades and flowers are LG-3)'
          : l.look === FOLD_BLIGHT
            ? 'grey-green → bruise-grey → grey-violet, never black; grey rings; stubble and tufts thin'
            : 'scorched straw → dust → ash-grey; soot smuts and charcoal chips; stubble and tufts thin',
  });
}
if (!ONLY || ONLY === 'hem') {
  const burn = LOOKS[3]!;
  const blight = LOOKS[2]!;
  const autumn = LOOKS[0]!;
  blocks.push({
    title: 'THE HEM — burn over blight over the turn, one cell',
    look: null,
    strip: false,
    strokes: [
      discStroke(autumn, 13, 0.45, 0.5, -2, 1),
      discStroke(blight, 9, 0.5, 0.6, 5, -4),
      discStroke(burn, 6, 0.45, 0.5, -5, 5),
    ],
    note: 'precedence per corner: each wash interpolates toward the other look’s true weight and the higher one paints on top',
  });
}
if (CUSTOM) {
  const strokes = parseCustom(CUSTOM);
  if (strokes.length > 0) {
    blocks.push({
      title: `?fold= — ${strokes.length} test stroke${strokes.length === 1 ? '' : 's'}`,
      look: null,
      strip: false,
      strokes,
      note: strokes.map((s) => `${s.axis} ${s.amp} soft ${s.soft} grain ${s.grain} ${JSON.stringify(s.shape)}`).join(' · '),
    });
  }
}

function parseCustom(spec: string): SpectrumStroke[] {
  const out: SpectrumStroke[] = [];
  const shift = (s: SpectrumStroke): SpectrumStroke => {
    // The spec speaks in the disc cell's own 0..31 space.
    const sh = s.shape;
    if (sh.kind === 'circle') sh.y += DISC_Y0;
    else if (sh.kind === 'rect') sh.y += DISC_Y0;
    else {
      sh.y0 += DISC_Y0;
      sh.y1 += DISC_Y0;
    }
    return s;
  };
  if (spec.trim().startsWith('[')) {
    try {
      const raw = JSON.parse(spec) as SpectrumStroke[];
      for (const s of raw) out.push(shift(s));
    } catch (e) {
      console.error('foldlab: bad ?fold= JSON', e);
    }
    return out;
  }
  let n = 0;
  for (const part of spec.split(';')) {
    const f = part.split(':');
    const axis = f[0] as SpectrumAxis;
    if (!['season', 'blight', 'burn', 'wear'].includes(axis)) continue;
    const amp = Number(f[1] ?? 1);
    const soft = Number(f[2] ?? 0.5);
    const grain = Number(f[3] ?? 0.5);
    const r = Math.round(Number(f[4] ?? 10));
    out.push(
      shift({
        id: `lab_custom_${n++}`,
        axis,
        shape: { kind: 'circle', x: 16, y: 16, r },
        amp,
        soft,
        grain,
        mode: 'max',
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------- baking

interface Bake {
  canvas: HTMLCanvasElement;
  gutter: number;
  ms: number;
}

function bakeOnce(cx: number, cy: number): Bake {
  const t0 = performance.now();
  const c = bakeChunk(ground, detail, elev, cx, cy, PX);
  return { canvas: c, gutter: Math.max(4, PX >> 3), ms: performance.now() - t0 };
}

/**
 * THE A/B: the same chunk baked bare and folded in alternation, REPS
 * times, medians of each — interleaving cancels JIT warm-up and
 * thermal drift, which a bare-then-folded pair cannot (the first
 * sheet read 1.39× on a cold JIT and 1.13× a second later).
 */
const REPS = 15;
function abBake(cx: number, cy: number, strokes: SpectrumStroke[]): { bare: Bake; fold: Bake } {
  const bareT: number[] = [];
  const foldT: number[] = [];
  let bare: Bake | null = null;
  let fold: Bake | null = null;
  for (let i = 0; i < REPS; i++) {
    resetSpectrum();
    bare = bakeOnce(cx, cy);
    bareT.push(bare.ms);
    setSpectrum(strokes, []);
    fold = bakeOnce(cx, cy);
    foldT.push(fold.ms);
  }
  resetSpectrum();
  bareT.sort((a, b) => a - b);
  foldT.sort((a, b) => a - b);
  const mid = (REPS - 1) >> 1;
  return { bare: { ...bare!, ms: bareT[mid]! }, fold: { ...fold!, ms: foldT[mid]! } };
}

interface Baked {
  strip: [Bake, Bake] | null;
  disc: Bake;
  bare: { strip: [Bake, Bake] | null; disc: Bake };
  sig: number;
  haloSig: number;
  /** Per-step medians of the disc chunk, unfolded and folded. */
  bareSteps: number[];
  foldSteps: number[];
}

/** Per-step cost of the disc chunk (median of 5 runs), for the confession. */
function stepCosts(cx: number, cy: number): number[] {
  const runs: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const job = startChunkBake(ground, detail, elev, cx, cy, PX, undefined, false, null);
    const ms: number[] = [];
    for (let i = 0; i < job.steps.length; i++) {
      const t0 = performance.now();
      job.steps[i]!();
      ms.push(performance.now() - t0);
    }
    runs.push(ms);
  }
  const n = runs[0]!.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = runs.map((r) => r[i]!).sort((a, b) => a - b);
    out.push(Math.round(v[4]! * 100) / 100);
  }
  return out;
}

function bakeBlock(b: Block): Baked {
  const disc = abBake(0, DISC_CY, b.strokes);
  const s0 = b.strip ? abBake(0, 0, b.strokes) : null;
  const s1 = b.strip ? abBake(1, 0, b.strokes) : null;
  resetSpectrum();
  const bareSteps = stepCosts(0, DISC_CY);
  setSpectrum(b.strokes, []);
  const foldSteps = stepCosts(0, DISC_CY);
  const sig = foldSigFor(0, DISC_CY);
  const haloSig = foldHaloSigFor(0, DISC_CY);
  resetSpectrum();
  return {
    strip: s0 && s1 ? [s0.fold, s1.fold] : null,
    disc: disc.fold,
    bare: { strip: s0 && s1 ? [s0.bare, s1.bare] : null, disc: disc.bare },
    sig,
    haloSig,
    bareSteps,
    foldSteps,
  };
}

// ---------------------------------------------------------- drawing

const NIGHT = daylightAt(0).ambient;
const NIGHT_CSS = `rgb(${NIGHT[0] | 0}, ${NIGHT[1] | 0}, ${NIGHT[2] | 0})`;

/** Blit a bake's tile window at (dx, dy); midnight multiplies the frame's own ambient. */
function blit(b: Bake, tx0: number, ty0: number, tw: number, th: number, dx: number, dy: number, night: boolean): void {
  ctx.drawImage(b.canvas, b.gutter + tx0 * PX, b.gutter + ty0 * PX, tw * PX, th * PX, dx, dy, tw * PX, th * PX);
  if (night) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = NIGHT_CSS;
    ctx.fillRect(dx, dy, tw * PX, th * PX);
    ctx.restore();
  }
}

const RULER_KNEES: number[] = [0, 0];
const RULER_DEPTH: NonNullable<RigPose['depthMemory']> = { mainBehind: false };
function drawRuler(cx: number, gy: number, scale: number): void {
  const rig: RigPose = {
    x: cx,
    y: gy - 0.44 * scale,
    scale,
    size: 1,
    dir: Math.PI / 2,
    pose: PoseState.Idle,
    poseT: 0,
    drawT: 0,
    restT: 1,
    nowMs: 0,
    feet: [0, 1].map((leg) => ({
      x: cx + (leg === 0 ? -1 : 1) * 0.1 * scale,
      y: gy,
      lift: 0,
    })),
    bob: 0,
    rise: 0,
    wScale: 1,
    poleX: 0,
    poleY: 0,
    poleStrength: 0,
    runF: 0,
    align: 1,
    kneeMemory: RULER_KNEES,
    depthMemory: RULER_DEPTH,
    bodyColor: '#3f5d8e',
    hurt: false,
    isOwn: false,
    gatherPhase: 0,
  };
  drawHumanoid(ctx, rig);
}

function text(s: string, x: number, y: number, size = 13, color = '#e8e4d8', align: CanvasTextAlign = 'left'): void {
  ctx.fillStyle = color;
  ctx.font = `${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

function swatches(look: number, x: number, y: number): void {
  const names = ['touched', 'taken', 'held'];
  const thr = [BAND_TOUCHED, BAND_TAKEN, BAND_HELD];
  for (let b = 0; b < 3; b++) {
    const tones = SUBSTRATE_FOLD[look]![b]!;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = tones[i]!;
      ctx.fillRect(x + i * 22, y + b * 34, 22, 22);
    }
    ctx.fillStyle = FRINGE_ALT[look]![b]!;
    ctx.fillRect(x + 4 * 22 + 6, y + b * 34, 14, 22);
    text(`${names[b]} ≥${thr[b]} · lane ${b >= 1 ? foldLaneSeed(look, b + 1) : '—'}`, x + 5 * 22 + 8, y + b * 34 + 16, 12, '#cfc8b8');
  }
}

const MARGIN = 24;
const STRIP_W = STRIP_TILES * PX;
const DISC_W = DISC_TILES * PX;
const LINE_H = Math.max(DISC_TILES, STRIP_ROWS * 2 + 5) * PX;
const RULER_W = 4 * PX;
const BLOCK_H = 2 * LINE_H + 130;
const CANVAS_W = MARGIN * 4 + STRIP_W + DISC_W + RULER_W + 260;

function drawBlock(b: Block, baked: Baked, y0: number): void {
  text(b.title, MARGIN, y0 + 22, 18, '#f2ead6');
  text(b.note, MARGIN, y0 + 44, 12, '#cfc8b8');
  const stripMs = baked.strip ? baked.strip[0].ms + baked.strip[1].ms : 0;
  const bareStripMs = baked.bare.strip ? baked.bare.strip[0].ms + baked.bare.strip[1].ms : 0;
  const ratioDisc = baked.disc.ms / Math.max(0.01, baked.bare.disc.ms);
  const ratioStrip = baked.strip ? stripMs / Math.max(0.01, bareStripMs) : 0;
  text(
    `disc bake ${baked.disc.ms.toFixed(1)}ms vs bare ${baked.bare.disc.ms.toFixed(1)}ms = ${ratioDisc.toFixed(2)}×` +
      (baked.strip ? ` · strip (2 chunks) ${stripMs.toFixed(1)}ms vs ${bareStripMs.toFixed(1)}ms = ${ratioStrip.toFixed(2)}×` : '') +
      ` · disc sig ${baked.sig.toString(16)} halo ${baked.haloSig.toString(16)} · px ${PX} · gate ≤ 1.25× (browser-timed, interleaved A/B, median of 15)`,
    MARGIN,
    y0 + 62,
    12,
    ratioDisc <= 1.25 ? '#9fd18c' : '#e0a06a',
  );
  const lines: Array<[string, boolean]> = [
    ['NOON', false],
    ['MIDNIGHT', true],
  ];
  lines.forEach(([label, night], li) => {
    const ly = y0 + 80 + li * LINE_H;
    let x = MARGIN;
    text(label, x, ly - 4, 12, '#cfc8b8');
    if (baked.strip && baked.bare.strip) {
      // The ramp: chunk 0 whole, chunk 1's first 24 tiles.
      blit(baked.strip[0], 0, 0, CHUNK, STRIP_ROWS, x, ly, night);
      blit(baked.strip[1], 0, 0, STRIP_TILES - CHUNK, STRIP_ROWS, x + CHUNK * PX, ly, night);
      // The unfolded twin beneath it, for the eye's own diff.
      const by = ly + (STRIP_ROWS + 1) * PX;
      blit(baked.bare.strip[0], 0, 0, CHUNK, STRIP_ROWS, x, by, night);
      blit(baked.bare.strip[1], 0, 0, STRIP_TILES - CHUNK, STRIP_ROWS, x + CHUNK * PX, by, night);
      text('0 → 1 across 48 tiles, plateau past 48 (above); the same ground unfolded (below)', x, by + STRIP_ROWS * PX + 16, 12, '#cfc8b8');
      // Threshold ticks along the ramp: where band() steps.
      for (const [thr, name] of [[BAND_TOUCHED, 'touched'], [BAND_TAKEN, 'taken'], [BAND_HELD, 'held']] as const) {
        // weight = 1 − smooth(d/48) with d = 48 − (tx+0.5): invert smoothstep by bisection.
        const target = thr / 255;
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 40; i++) {
          const m = (lo + hi) / 2;
          const w = 1 - m * m * (3 - 2 * m);
          if (w > target) lo = m;
          else hi = m;
        }
        const tx = 48 - lo * 48 - 0.5;
        const sx = x + tx * PX;
        ctx.fillStyle = '#f2ead6';
        ctx.fillRect(sx, ly - 14, 1, 10);
        text(name, sx + 3, ly - 6, 10, '#f2ead6');
      }
      // The ruler on the plateau.
      drawRuler(x + (STRIP_TILES - 3) * PX, ly + 6 * PX, PX);
      x += STRIP_W + MARGIN;
    }
    // The disc, cropped to its country, the ruler standing at the heart.
    blit(baked.disc, DISC_OFF, DISC_OFF, DISC_TILES, DISC_TILES, x, ly, night);
    drawRuler(x + (16 - DISC_OFF) * PX, ly + (16.5 - DISC_OFF) * PX, PX);
    if (b.look !== null) {
      // The bare disc's heart beside it, same crop, for the diff.
      const bx = x + DISC_W + MARGIN;
      blit(baked.bare.disc, DISC_OFF + 6, DISC_OFF + 6, 12, 12, bx, ly, night);
      text('unfolded heart', bx, ly + 12 * PX + 14, 11, '#cfc8b8');
      if (li === 0) swatches(b.look, bx, ly + 12 * PX + 30);
    }
    x += DISC_W + MARGIN;
  });
}

// --------------------------------------------------------- the sheet

const bakedBlocks = blocks.map((b) => bakeBlock(b));
canvas.width = CANVAS_W;
canvas.height = MARGIN + blocks.length * BLOCK_H + 40;
ctx.fillStyle = '#241a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
text(
  `THE FOLD LAB — the substrate folds · px ${PX} · bands touched ≥${BAND_TOUCHED} taken ≥${BAND_TAKEN} held ≥${BAND_HELD} (u8) · band(255) = ${band(255)}`,
  MARGIN,
  18,
  13,
  '#cfc8b8',
);
blocks.forEach((b, i) => drawBlock(b, bakedBlocks[i]!, MARGIN + 10 + i * BLOCK_H));

// A confession for the probe: every block's timings and sigs.
(globalThis as unknown as { FOLDLAB?: unknown }).FOLDLAB = blocks.map((b, i) => ({
  title: b.title,
  discMs: bakedBlocks[i]!.disc.ms,
  bareDiscMs: bakedBlocks[i]!.bare.disc.ms,
  stripMs: bakedBlocks[i]!.strip ? bakedBlocks[i]!.strip![0].ms + bakedBlocks[i]!.strip![1].ms : null,
  bareStripMs: bakedBlocks[i]!.bare.strip ? bakedBlocks[i]!.bare.strip![0].ms + bakedBlocks[i]!.bare.strip![1].ms : null,
  sig: bakedBlocks[i]!.sig,
  haloSig: bakedBlocks[i]!.haloSig,
  bareSteps: bakedBlocks[i]!.bareSteps,
  foldSteps: bakedBlocks[i]!.foldSteps,
  bareStepsTotal: bakedBlocks[i]!.bareSteps.reduce((a, b) => a + b, 0),
  foldStepsTotal: bakedBlocks[i]!.foldSteps.reduce((a, b) => a + b, 0),
}));

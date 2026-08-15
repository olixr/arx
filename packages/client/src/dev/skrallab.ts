// TEMPORARY rig verification harness (checked-in tooling): THE SKRAL
// SHEET — the brine-folk audit (docs/skral-plan.md, THE BRINE
// DIALECT). All four bodies across the eight facing bands at idle,
// walk, and the STRIKE loop (the gape + crest flare beat is the whole
// point — shoot the strike rows animated, not just settled), plus the
// hurt-flash silhouette rows, a water-cluster seed-spread row (the
// shoal must sort into family banners, never one body stamped eight
// times), and BODY-RULER cells standing the player rig beside the
// wader and the deepking. Every figure owns a live biped LegSolver
// AND a live EarSim crest — the sheet plays the same physics the game
// does: walk rows breathe, strike rows flare, stops settle the sail.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?only=id    one body huge (skral, skral_harpooner, ...)
//   ?ol=1       OUTLINE mode: every figure rings through a faithful
//               simulation of the renderer's dilate (radius law
//               max(1.25, s*0.04), integer 8-tap, ink under art)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { LegSolver, drawHumanoid, type RigPose } from '../render/rig.js';
import { skralLook } from '../render/skral.js';
import { EarSim } from '../render/earPhysics.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
// `let`, never `const`: outline mode swaps the sheet's ctx out from
// under the painters mid-cell, exactly the way paintOutlineScratch
// does it live.
let ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const S = Math.max(50, parseInt(q.get('s') ?? (ONLY ? '220' : '110'), 10) || 110);
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale
const OL = q.get('ol') === '1'; // ring every figure with the renderer's dilate

// The outline simulation scratches (renderer's paintOutlineScratch,
// at the lab's 1× dpr): art into A believing it is the frame, B
// becomes the dilated tinted silhouette, ring first then art on top.
const olA = document.createElement('canvas');
const olB = document.createElement('canvas');
const olACtx = olA.getContext('2d')!;
const olBCtx = olB.getContext('2d')!;
const OL_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.71, 0.71],
  [-0.71, 0.71],
  [0.71, -0.71],
  [-0.71, -0.71],
];

function paintCellOutlined(x0: number, y0: number, w0: number, h0: number, paint: () => void): void {
  const r = Math.max(1.25, S * 0.04); // the renderer's radius law
  const m = Math.ceil(r) + 2;
  const w = w0 + m * 2;
  const h = h0 + m * 2;
  if (olA.width !== w || olA.height !== h) {
    olA.width = olB.width = w;
    olA.height = olB.height = h;
  }
  olACtx.setTransform(1, 0, 0, 1, 0, 0);
  olACtx.clearRect(0, 0, w, h);
  olACtx.setTransform(1, 0, 0, 1, m - x0, m - y0);
  const prev = ctx;
  ctx = olACtx;
  try {
    paint();
  } finally {
    ctx = prev;
    olACtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const ri = Math.max(1, Math.round(r));
  const rd = Math.max(1, Math.round(r * 0.71));
  olBCtx.setTransform(1, 0, 0, 1, 0, 0);
  olBCtx.clearRect(0, 0, w, h);
  for (const [tx, ty] of OL_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    olBCtx.drawImage(olA, Math.sign(tx) * (diag ? rd : ri), Math.sign(ty) * (diag ? rd : ri));
  }
  olBCtx.globalCompositeOperation = 'source-in';
  olBCtx.fillStyle = '#241a2e';
  olBCtx.fillRect(0, 0, w, h);
  olBCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(olB, x0 - m, y0 - m);
  ctx.drawImage(olA, x0 - m, y0 - m);
}

const DIRS = [
  ['S', Math.PI / 2],
  ['SE', Math.PI / 4],
  ['E', 0],
  ['NE', -Math.PI / 4],
  ['N', -Math.PI / 2],
  ['NW', (-3 * Math.PI) / 4],
  ['W', Math.PI],
  ['SW', (3 * Math.PI) / 4],
] as const;

/** Renderer SKRAL_SIZE mirror — keep in step when retuning. */
const SIZE: Record<string, number> = {
  skral: 0.86,
  skral_harpooner: 0.84,
  skral_tidecaller: 0.9,
  skral_champion: 1.25,
};
/** Bestiary walk speeds, mirrored. */
const SPEED: Record<string, number> = {
  skral: 3.4,
  skral_harpooner: 3.2,
  skral_tidecaller: 3.1,
  skral_champion: 3.7,
};

type Mode = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the skral body. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
  crest?: EarSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — the strike rows are where the gape and
// the crest flare read; the hurt rows are the silhouette truth.
row('skral idle', 'skral', 'idle');
row('skral walk', 'skral', 'walk');
row('skral strike', 'skral', 'strike');
row('skral hurt', 'skral', 'hurt');
row('harpoon idle', 'skral_harpooner', 'idle', 11);
row('harpoon walk', 'skral_harpooner', 'walk', 11);
row('tidecall idle', 'skral_tidecaller', 'idle');
row('tidecall cast', 'skral_tidecaller', 'cast');
row('deepking idle', 'skral_champion', 'idle');
row('deepking walk', 'skral_champion', 'walk');
row('deepking strike', 'skral_champion', 'strike');
row('deepking hurt', 'skral_champion', 'hurt');
// THE WATER SPREAD: eight consecutive seeds on the wader — the shoal
// must sort into the four family banners (seeded determinism, and the
// hash-first law: consecutive eids must scatter, never clump).
for (let k = 0; k < 8; k++) {
  figs.push({ label: `skral seed ${900 + k}`, defId: 'skral', dir: Math.PI / 2, mode: 'idle', seed: 900 + k });
}
// THE BODY RULER: the player rig beside the wader and the deepking —
// the waist-high claim proven on screen.
figs.push({ label: 'ruler: player+skral', defId: 'skral', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+tidecall', defId: 'skral_tidecaller', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+deepking', defId: 'skral_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
const CW = Math.round(S * 2.2);
const CH = Math.round(S * 2.7);

let rowFrom = 0;
let rowTo = Math.ceil(kept.length / COLS) - 1;
const rowsQ = q.get('rows');
if (rowsQ) {
  const m = rowsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    rowFrom = parseInt(m[1]!, 10);
    rowTo = parseInt(m[2]!, 10);
  }
}
let colFrom = 0;
let colTo = COLS - 1;
const colsQ = q.get('cols');
if (colsQ) {
  const m = colsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    colFrom = parseInt(m[1]!, 10);
    colTo = parseInt(m[2]!, 10);
  }
}

const DET = q.get('det') === '1';
const DET_FRAMES = Math.max(1, parseInt(q.get('detn') ?? '240', 10) || 240);
let frameIdx = 0;
let lastNow = 0;

/** One skral through drawHumanoid with live legs and live crest. */
function drawSkral(f: Fig, x: number, y: number, now: number, dt: number): void {
  const size = SIZE[f.defId] ?? 0.86;
  if (!f.legs) {
    f.legs = new LegSolver(1);
    f.knee = [0, 0];
    f.depth = { mainBehind: false };
    f.crest = new EarSim(f.seed);
    f.wx = 0;
    f.wy = 0;
  }
  const speed = f.mode === 'walk' ? (SPEED[f.defId] ?? 3.4) : 0;
  if (speed > 0) {
    f.wx! += Math.cos(f.dir) * speed * dt;
    f.wy! += Math.sin(f.dir) * speed * dt;
  }
  const wx = f.wx!;
  const wy = f.wy!;
  const lp = f.legs.update(wx, wy, f.dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  const look = skralLook(f.defId, f.seed);
  const striking = f.mode === 'strike' || f.mode === 'cast';
  const poseT = striking ? ((now / 1000) * 1.4) % 1 : 1;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size,
    dir: f.dir,
    pose:
      f.mode === 'strike'
        ? PoseState.Attack
        : f.mode === 'cast'
          ? PoseState.Cast
          : f.mode === 'walk'
            ? PoseState.Walk
            : PoseState.Idle,
    poseT,
    drawT: 0,
    restT: f.mode === 'idle' || f.mode === 'hurt' ? 1 : 0,
    nowMs: now,
    feet,
    bob: lp.bob,
    rise: lp.rise,
    wScale: lp.wScale,
    poleX: lp.poleX,
    poleY: lp.poleY,
    poleStrength: lp.poleStrength,
    runF: lp.runF,
    align: lp.align,
    kneeMemory: f.knee!,
    depthMemory: f.depth,
    bodyColor: look.hide,
    skinColor: look.hide,
    hurt: f.mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    skral: look,
    earSim: f.crest,
  });
}

/** The ruler player, on the game's own biped solver. */
function drawMan(f: Fig, x: number, y: number, now: number, dt: number): void {
  if (!f.manLegs) {
    f.manLegs = new LegSolver(1);
    f.manKnee = [0, 0];
    f.manDepth = { mainBehind: false };
  }
  const lp = f.manLegs.update(0, 0, Math.PI / 2, dt);
  const feet = lp.feet.map((ft) => ({ x: x + ft.x * S, y: y + ft.y * S * YS, lift: ft.lift }));
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: 1,
    dir: Math.PI / 2,
    pose: PoseState.Idle,
    poseT: 1,
    drawT: 0,
    restT: 1,
    nowMs: now,
    feet,
    bob: lp.bob,
    rise: lp.rise,
    wScale: lp.wScale,
    poleX: lp.poleX,
    poleY: lp.poleY,
    poleStrength: lp.poleStrength,
    runF: lp.runF,
    align: lp.align,
    kneeMemory: f.manKnee!,
    depthMemory: f.manDepth,
    bodyColor: '#3f5d8e',
    hurt: false,
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
  });
}

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  drawSheet(now, dt);
  requestAnimationFrame(frame);
}

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = (colTo - colFrom + 1) * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  kept.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.05) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.0 * S, homeY);
    ctx.lineTo(homeX + 1.0 * S, homeY);
    ctx.stroke();

    const paint = (): void => {
      if (f.ruler) {
        drawMan(f, homeX - 0.85 * S, homeY, now, dt);
        drawSkral(f, homeX + 0.5 * S, homeY, now, dt);
      } else {
        drawSkral(f, homeX, homeY, now, dt);
      }
    };
    if (OL) {
      paintCellOutlined(homeX - CW / 2, homeY - Math.round(S * 2.05), CW, CH, paint);
    } else {
      paint();
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.85 * S);
  });
  if (DET) {
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`det frame ${frameIdx}`, 8, 20);
  }
  frameIdx++;
}

if (DET) {
  requestAnimationFrame(() => {
    for (let i = 0; i < DET_FRAMES; i++) drawSheet(i * (1000 / 60), 1 / 60);
  });
} else {
  requestAnimationFrame(frame);
}

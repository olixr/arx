// TEMPORARY rig verification harness (checked-in tooling): THE
// TURTLE SHEET — the shell walks' ground-up audit. Both bodies
// (giant turtle / colossus turtle) across the eight facing bands at
// idle, the shuffle walk, the looping SNAP (the neck must coil home
// and fire while the feet stay planted), and the hurt flash;
// reference cells standing the bear and the giant beetle beside them
// (the keep must never read as a beetle's elytra or a boulder);
// BODY-RULER cells with the player rig; and bare close-up cells for
// the beak, the rim teeth, and the stern. Each figure owns a live
// LegRig AND a live BobtailSim trailer, so gait, feet, and the tail
// run exactly the physics the game plays. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups (E/W cells)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
//   ?ol=1       OUTLINE mode: every figure rings through a faithful
//               simulation of the renderer's 8-tap dilate (same
//               radius law r = max(1.25, s·0.04), integer taps,
//               the world's #241a2e ink, ring UNDER the art) — the
//               in-game silhouette read without launching the game.
import {
  COLOSSUS_LOOK,
  LegSolver,
  TURTLE_LOOK,
  beastSpec,
  drawBeast,
  drawHumanoid,
  type RigPose,
} from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';
import { BobtailSim, drawTurtleTail } from '../render/tail.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
// `let`, never `const`: outline mode swaps the sheet's ctx out from
// under the painters mid-cell — the exact contract the renderer's
// paintOutlineScratch runs on the live game's draw closures.
let ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110); // scale px per tile (?s= zoom lever)
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
  // INTEGER taps, same law as the renderer (fractional offsets
  // bilinear-soften the ring).
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

/** Content-def mirrors: radius/speed feed beastSpec, sized as in game. */
const BODIES: Record<string, { radius: number; speed: number; color: string }> = {
  giant_turtle: { radius: 0.46, speed: 2.2, color: '#5d6b46' },
  colossus_turtle: { radius: 0.62, speed: 1.7, color: '#59604f' },
  bear: { radius: 0.42, speed: 4.0, color: '#3d332a' },
  giant_beetle: { radius: 0.3, speed: 2.6, color: '#42527a' },
};

type Mode = 'idle' | 'walk' | 'snap' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the subject. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegRig;
  knee?: number[];
  walkPhase?: number;
  /** THE TAIL TRAILS THE KEEP: live low-carriage stub per turtle fig. */
  stub?: BobtailSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom.
row('turtle idle', 'giant_turtle', 'idle');
row('turtle walk', 'giant_turtle', 'walk');
row('turtle snap', 'giant_turtle', 'snap');
row('turtle hurt', 'giant_turtle', 'hurt');
row('colossus idle', 'colossus_turtle', 'idle');
row('colossus walk', 'colossus_turtle', 'walk');
row('colossus snap', 'colossus_turtle', 'snap');
row('colossus hurt', 'colossus_turtle', 'hurt');
// References + rulers + bare close-ups (one row of eight): the keep
// must never read as a beetle's dome or a walking boulder, and the
// colossus must stand clearly APART from its own tameable cousin.
figs.push({ label: 'bear (reference)', defId: 'bear', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'beetle (reference)', defId: 'giant_beetle', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'ruler: player+turtle', defId: 'giant_turtle', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+colossus', defId: 'colossus_turtle', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'turtle S (face)', defId: 'giant_turtle', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'turtle E (profile)', defId: 'giant_turtle', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'turtle N (back)', defId: 'giant_turtle', dir: -Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'colossus E (profile)', defId: 'colossus_turtle', dir: 0, mode: 'idle', seed: 5 });

const COLS = 8;
const CW = Math.round(S * 2.6);
const CH = Math.round(S * 3.0);

let rowFrom = 0;
let rowTo = Math.ceil(figs.length / COLS) - 1;
const rowsQ = q.get('rows');
if (rowsQ) {
  const m = rowsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    rowFrom = parseInt(m[1]!, 10);
    rowTo = parseInt(m[2]!, 10);
  }
}
// ?cols=a-b — column banding for close-up screenshots (E/W cells).
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

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  drawSheet(now, dt);
  requestAnimationFrame(frame);
}

/** One beast through drawBeast with a live LegRig and live trailer. */
function drawQuad(
  f: Fig,
  x: number,
  y: number,
  dir: number,
  mode: Mode,
  seed: number,
  now: number,
  dt: number,
): void {
  const info = BODIES[f.defId]!;
  const spec = beastSpec(f.defId, info.radius, info.speed);
  if (!f.legs) {
    f.legs = new LegRig(spec.rig);
    f.knee = [];
    f.walkPhase = 0;
    f.wx = 0;
    f.wy = 0;
  }
  // The turtles own one gait — the shuffle at species speed. The
  // references walk at their own pace.
  if (mode === 'walk') {
    f.wx! += Math.cos(dir) * info.speed * dt;
    f.wy! += Math.sin(dir) * info.speed * dt;
    f.walkPhase = (f.walkPhase! + dt * info.speed * 0.55) % 1;
  }
  const wx = f.wx!;
  const wy = f.wy!;
  const lp: LegPose = f.legs.update(wx, wy, dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  // The looping snap beat, slow enough that the coil, the fire, and
  // the clamp all read.
  const attackT = mode === 'snap' ? (now * 0.0011) % 1 : 0;
  const hurt = mode === 'hurt';
  // THE TAIL TRAILS THE KEEP: turtle figs run the live low-carriage
  // stub the game runs — the renderer's exact dials.
  let tail: (() => void) | undefined;
  if (f.defId === 'giant_turtle' || f.defId === 'colossus_turtle') {
    const colossus = f.defId === 'colossus_turtle';
    f.stub ??= new BobtailSim(colossus ? 2.1 : 1.6, seed, 0.3);
    f.stub.update(
      wx,
      wy,
      (colossus ? 0.24 : 0.12) + lp.bob * 0.35,
      lp.dir,
      dt,
      now / 1000,
      colossus ? 1.8 : 1.35,
      0,
    );
    const st = colossus
      ? { skin: COLOSSUS_LOOK.skin, spike: COLOSSUS_LOOK.spike, heavy: 1.3 }
      : { skin: TURTLE_LOOK.skin, spike: TURTLE_LOOK.spike, heavy: 1.05 };
    const stub = f.stub;
    tail = () => {
      const pts = stub.nodes.map((nd) => ({
        x: x + (nd.x - wx) * S,
        y: y + (nd.y - wy) * S * YS - nd.z * S,
      }));
      drawTurtleTail(ctx, pts, st, S, { hurt, back: Math.sin(lp.dir) < -0.2 });
    };
  }
  drawBeast(ctx, {
    x,
    y,
    scale: S,
    dir: lp.dir,
    radius: info.radius,
    color: info.color,
    defId: f.defId,
    spec,
    pose: lp,
    feet,
    yScale: YS,
    walkPhase: f.walkPhase!,
    hurt,
    kneeMemory: f.knee!,
    attackT,
    seed,
    nowMs: now,
    tail,
  });
}

/** The player rig for ruler cells — the body the world is measured by. */
function drawMan(f: Fig, x: number, y: number, now: number, dt: number): void {
  if (!f.manLegs) {
    f.manLegs = new LegSolver();
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

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = (colTo - colFrom + 1) * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.4) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 1.2 * S, homeY);
    ctx.lineTo(homeX + 1.2 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the shell.
    const paintFig = (): void => {
      if (f.ruler) {
        drawMan(f, homeX - 0.95 * S, homeY, now, dt);
        drawQuad(f, homeX + 0.45 * S, homeY, f.dir, f.mode, f.seed, now, dt);
      } else {
        drawQuad(f, homeX, homeY, f.dir, f.mode, f.seed, now, dt);
      }
    };
    if (OL) {
      // THE SNAP LEAVES THE BOX, lab edition: the outline scratch
      // pads a full stride past the cell bounds — the colossus'
      // telescoping strike reaches ~2 tiles past center, and a
      // scratch cropped at the cell edge guillotines the skull
      // mid-extension (the same law the renderer's body-sprite
      // cache pays with snapRoom).
      const pad = Math.round(S * 1.0);
      paintCellOutlined(
        homeX - CW / 2 - pad,
        homeY - Math.round(S * 2.4) - pad,
        CW + pad * 2,
        CH + pad * 2,
        paintFig,
      );
    } else paintFig();
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.3 * S);
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

// TEMPORARY rig verification harness (checked-in tooling): THE CAT
// SHEET — the house cat's ground-up audit. The shorthair tabby and
// the longhair across the eight facing bands at idle, walk, the run
// (the dart must read), THE SIT (the settle eased live, exactly the
// renderer's dial), and the hurt flash; THE CABINET — all sixteen
// curated coats face-on (the brief's capped white with the ringed
// tail and the grey-over-white among them); a SPREAD row proving
// eight consecutive town eids scatter across the cabinet; reference
// cells standing the lynx cub, the fox, and the lynx beside the cat
// (a house cat must never read as a small lynx); BODY-RULER cells
// with the player rig; and bare close-ups for the face. Each figure
// owns a live LegRig, a live perked TailSim flag, and a live EarSim
// pair — the sheet runs exactly the physics the game plays. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups (E/W cells)
//   ?det=1      DETERMINISTIC mode; ?detn=N sets the step count.
import {
  LegSolver,
  beastSpec,
  drawBeast,
  drawHumanoid,
  housecatLook,
  type RigPose,
} from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';
import { TailSim, drawHousecatTail } from '../render/tail.js';
import { EarSim } from '../render/earPhysics.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '130', 10) || 130);
const YS = 0.6;

const WALK_SPEED = 1.1;
const RUN_SPEED = 3.8;

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
  cat: { radius: 0.16, speed: 3.6, color: '#8d8478' },
  lynx_young: { radius: 0.2, speed: 4.6, color: '#9c7f55' },
  lynx: { radius: 0.36, speed: 4.7, color: '#9c7f55' },
  fox: { radius: 0.28, speed: 5.0, color: '#b4622a' },
};

type Mode = 'idle' | 'walk' | 'run' | 'sit' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  ruler?: boolean;
  wx?: number;
  wy?: number;
  legs?: LegRig;
  knee?: number[];
  walkPhase?: number;
  /** THE RAISED FLAG: live perked tail per cat fig. */
  flag?: TailSim;
  /** THE EAR IS A SIMULATION: live elastic pair per cat fig. */
  earSim?: EarSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 0): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom. Seed 0 pins the dun mackerel tabby
// (cabinet 0) on the shorthair rows; seed 31 pins the ginger
// longhair (cabinet 13) on the longhair rows.
row('cat idle', 'cat', 'idle');
row('cat walk', 'cat', 'walk');
row('cat run', 'cat', 'run');
row('cat sit', 'cat', 'sit');
row('cat hurt', 'cat', 'hurt');
row('longhair idle', 'cat', 'idle', 3);
row('longhair walk', 'cat', 'walk', 3);
row('longhair sit', 'cat', 'sit', 3);
// THE CABINET: all sixteen coats face-on — seeds chosen so each
// cabinet index hangs exactly once, 0..15 in order.
const CABINET_SEEDS = [0, 15, 25, 2, 12, 22, 4, 9, 19, 1, 6, 16, 31, 3, 18, 28];
CABINET_SEEDS.forEach((seed, i) => {
  figs.push({ label: `coat ${i}`, defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed });
});
// THE SPREAD: eight consecutive town eids facing the camera — the
// hash must scatter a square across the cabinet, never stamp it.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `town eid ${400 + k}`, defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// References + rulers + bare close-ups: the cat must read KEPT next
// to the wild bodies, and small against every one of them.
figs.push({ label: 'lynx cub (reference)', defId: 'lynx_young', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'lynx (reference)', defId: 'lynx', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'fox (reference)', defId: 'fox', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'ruler: player+cat', defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 0, ruler: true });
figs.push({ label: 'ruler: player+sit', defId: 'cat', dir: Math.PI / 2, mode: 'sit', seed: 0, ruler: true });
figs.push({ label: 'cat S (face)', defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 0 });
figs.push({ label: 'cat E (profile)', defId: 'cat', dir: 0, mode: 'idle', seed: 0 });
figs.push({ label: 'cat N (back)', defId: 'cat', dir: -Math.PI / 2, mode: 'idle', seed: 0 });
// The brief's own cats, close: the capped white with the ringed
// raccoon tail (cabinet 5) and the grey over white (cabinet 6).
figs.push({ label: 'capped S (face)', defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 22 });
figs.push({ label: 'capped E (profile)', defId: 'cat', dir: 0, mode: 'idle', seed: 22 });
figs.push({ label: 'grey bicolor E', defId: 'cat', dir: 0, mode: 'idle', seed: 4 });
figs.push({ label: 'tuxedo S (face)', defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 12 });
figs.push({ label: 'points S (face)', defId: 'cat', dir: Math.PI / 2, mode: 'idle', seed: 1 });
figs.push({ label: 'black E (profile)', defId: 'cat', dir: 0, mode: 'idle', seed: 2 });

const COLS = 8;
const CW = Math.round(S * 2.1);
const CH = Math.round(S * 2.5);

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

/** One body through drawBeast with a live LegRig, flag, and ears. */
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
  const moving = mode === 'walk' || mode === 'run';
  const spd = mode === 'run' ? RUN_SPEED : WALK_SPEED;
  if (moving) {
    f.wx! += Math.cos(dir) * spd * dt;
    f.wy! += Math.sin(dir) * spd * dt;
    f.walkPhase = (f.walkPhase! + dt * spd * 0.55) % 1;
  }
  const wx = f.wx!;
  const wy = f.wy!;
  const lp: LegPose = f.legs.update(wx, wy, dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  const hurt = mode === 'hurt';
  // THE SIT eases in live, holds, and stands back up — the renderer's
  // own dial, looped so both transitions stay auditable.
  let sitK = 0;
  if (mode === 'sit') {
    // One ease, then HOLD: screenshots always catch the seat; the
    // stand-up transition is proven live (the renderer's own dial).
    sitK = Math.min(1, now / 1400);
  }
  let tail: (() => void) | undefined;
  let ears: EarSim | undefined;
  if (f.defId === 'cat') {
    const catL = housecatLook('cat', seed);
    f.flag ??= new TailSim(0.72, seed, Math.min(0.2, spec.bodyLen - 0.04));
    f.flag.update(
      wx,
      wy,
      0.27 - 0.11 * sitK + lp.bob * 0.35 * (1 - sitK * 0.7),
      lp.dir,
      dt,
      now / 1000,
      1,
      1 - sitK * 0.72,
    );
    const st = {
      coat: catL.coat,
      under: catL.under,
      mark: catL.mark,
      kind: catL.tail,
      longhair: catL.longhair,
    };
    const flag = f.flag;
    tail = () => {
      const pts = flag.nodes.map((nd) => ({
        x: x + (nd.x - wx) * S,
        y: y + (nd.y - wy) * S * YS - nd.z * S,
      }));
      drawHousecatTail(ctx, pts, st, S, { hurt, back: Math.sin(lp.dir) < -0.2 });
    };
    ears = f.earSim ??= new EarSim(seed);
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
    attackT: 0,
    seed,
    nowMs: now,
    tail,
    ears,
    sit: sitK > 0 ? sitK : undefined,
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
  ctx.fillStyle = '#2f3a2c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 1.9) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 0.9 * S, homeY);
    ctx.lineTo(homeX + 0.9 * S, homeY);
    ctx.stroke();

    if (f.ruler) {
      drawMan(f, homeX - 0.7 * S, homeY, now, dt);
      drawQuad(f, homeX + 0.4 * S, homeY, f.dir, f.mode, f.seed, now, dt);
    } else {
      drawQuad(f, homeX, homeY, f.dir, f.mode, f.seed, now, dt);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.75 * S);
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

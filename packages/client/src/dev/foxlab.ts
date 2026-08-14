// TEMPORARY rig verification harness (checked-in tooling): THE FOX
// SHEET — the red skulk's ground-up audit. Both bodies (fox /
// smokebrush vixen) across the eight facing bands at idle, walk, the
// full run (the prance must read), the looping pounce (the mousing
// dive), and the hurt flash; a COAT CLUSTER row proving eight
// consecutive spawn eids scatter the skulk across all four coats
// (ember / frost / dusk / sable); reference cells standing the wolf,
// the lynx, and the dire wolf beside the foxes (the fox must never
// read as a small wolf); BODY-RULER cells with the player rig; and a
// bare close-up band for the face. Each figure owns a live LegRig AND
// a live TailSim brush, so gait, feet, and the flag run exactly the
// physics the game plays. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups (E/W cells)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  DIREWOLF_LOOK,
  LegSolver,
  WOLF_LOOK,
  beastSpec,
  drawBeast,
  drawHumanoid,
  foxLook,
  type RigPose,
} from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';
import { TailSim, drawFoxBrush, drawWolfBrush } from '../render/tail.js';
import { EarSim } from '../render/earPhysics.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110); // scale px per tile (?s= zoom lever)
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const WALK_SPEED = 1.3;
const RUN_SPEED = 4.4;

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
  fox: { radius: 0.28, speed: 5.0, color: '#b4622a' },
  fox_champion: { radius: 0.4, speed: 5.2, color: '#6b3226' },
  wolf: { radius: 0.34, speed: 4.6, color: '#6a6f7d' },
  lynx: { radius: 0.36, speed: 4.7, color: '#9c7f55' },
  dire_wolf: { radius: 0.44, speed: 4.8, color: '#4b4854' },
};

type Mode = 'idle' | 'walk' | 'run' | 'pounce' | 'hurt';

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
  /** THE BRUSH IS A SIMULATION: live verlet plume per fox fig. */
  brush?: TailSim;
  /** THE EAR IS A SIMULATION: live elastic pair per fox fig. */
  earSim?: EarSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom. Seed 5 pins the EMBER coat on main rows.
row('fox idle', 'fox', 'idle');
row('fox walk', 'fox', 'walk');
row('fox run', 'fox', 'run');
row('fox pounce', 'fox', 'pounce');
row('fox hurt', 'fox', 'hurt');
row('vixen idle', 'fox_champion', 'idle');
row('vixen walk', 'fox_champion', 'walk');
row('vixen run', 'fox_champion', 'run');
row('vixen pounce', 'fox_champion', 'pounce');
// THE COAT CLUSTER SPREAD: eight consecutive spawn eids facing the
// camera — the hash must scatter a skulk across all four coats.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `skulk eid ${400 + k}`, defId: 'fox', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// References + rulers + bare close-ups (one row of eight):
// the fox must never read as a small wolf, and the vixen must stand
// clearly APART from the dire wolf she out-runs.
figs.push({ label: 'wolf (reference)', defId: 'wolf', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'lynx (reference)', defId: 'lynx', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'dire wolf (reference)', defId: 'dire_wolf', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'ruler: player+fox', defId: 'fox', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+vixen', defId: 'fox_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'fox S (face)', defId: 'fox', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'fox E (profile)', defId: 'fox', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'fox N (back)', defId: 'fox', dir: -Math.PI / 2, mode: 'idle', seed: 5 });
// THE WOLFKIN BANDS: the premium polish audit — wolf and matriarch on
// the same physics kit, every facing, idle through the pounce.
row('wolf idle', 'wolf', 'idle');
row('wolf run', 'wolf', 'run');
row('wolf pounce', 'wolf', 'pounce');
row('dire idle', 'dire_wolf', 'idle');
row('dire run', 'dire_wolf', 'run');
row('dire pounce', 'dire_wolf', 'pounce');

const COLS = 8;
const CW = Math.round(S * 2.3);
const CH = Math.round(S * 2.9);

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

/** One quadruped through drawBeast with a live LegRig and live brush. */
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
  // The looping pounce beat, slow enough that the crouch, the dive,
  // and the brush's answer all read.
  const attackT = mode === 'pounce' ? (now * 0.0011) % 1 : 0;
  const hurt = mode === 'hurt';
  // THE BRUSH + THE EARS: canid figs run the live sims the game runs —
  // rump-rooted brush fed the LUNGED anchor (the tail rides the
  // pounce), and the elastic ear pair ticked inside the head painter.
  const CANID: Record<string, { rootOff: number; rumpH: number; sizeK: number; heavy: number }> = {
    fox: { rootOff: 0.3, rumpH: 0.32, sizeK: 0.95, heavy: 0.9 },
    fox_champion: { rootOff: 0.4, rumpH: 0.46, sizeK: 1.3, heavy: 1.15 },
    wolf: { rootOff: 0.38, rumpH: 0.44, sizeK: 1.0, heavy: 1.0 },
    dire_wolf: { rootOff: 0.5, rumpH: 0.52, sizeK: 1.2, heavy: 1.25 },
  };
  let tail: (() => void) | undefined;
  let ears: EarSim | undefined;
  const canid = CANID[f.defId];
  if (canid) {
    f.brush ??= new TailSim(canid.heavy, seed, canid.rootOff);
    let lunge = 0;
    if (attackT > 0) {
      lunge =
        attackT < 0.7
          ? -0.12 * (attackT / 0.7)
          : 0.3 * Math.sin(Math.PI * Math.min(1, (attackT - 0.7) / 0.3));
    }
    const lwx = wx + Math.cos(lp.dir) * lunge;
    const lwy = wy + Math.sin(lp.dir) * lunge;
    f.brush.update(lwx, lwy, canid.rumpH + lp.bob * 0.35, lp.dir, dt, now / 1000, canid.sizeK);
    const isFox = f.defId.startsWith('fox');
    const foxL = isFox ? foxLook(f.defId, seed) : undefined;
    const wolfSt = isFox
      ? undefined
      : f.defId === 'dire_wolf'
        ? { coat: DIREWOLF_LOOK.coat, under: DIREWOLF_LOOK.under, tip: DIREWOLF_LOOK.grizzle, heavy: 1.15 }
        : { coat: WOLF_LOOK.coat, under: WOLF_LOOK.under, tip: WOLF_LOOK.saddle, heavy: 1.0 };
    const brush = f.brush;
    tail = () => {
      const pts = brush.nodes.map((nd) => ({
        x: x + (nd.x - wx) * S,
        y: y + (nd.y - wy) * S * YS - nd.z * S,
      }));
      const back = Math.sin(lp.dir) < -0.2;
      if (foxL) drawFoxBrush(ctx, pts, foxL, S, { hurt, back });
      else drawWolfBrush(ctx, pts, wolfSt!, S, { hurt, back });
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
    attackT,
    seed,
    nowMs: now,
    tail,
    ears,
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
    const homeY = Math.round(S * 2.3) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 1.0 * S, homeY);
    ctx.lineTo(homeX + 1.0 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the fox.
    if (f.ruler) {
      drawMan(f, homeX - 0.82 * S, homeY, now, dt);
      drawQuad(f, homeX + 0.38 * S, homeY, f.dir, f.mode, f.seed, now, dt);
    } else {
      drawQuad(f, homeX, homeY, f.dir, f.mode, f.seed, now, dt);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.2 * S);
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

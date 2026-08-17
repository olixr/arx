// TEMPORARY rig verification harness (checked-in tooling): THE
// BASILISK SHEET — the stone court, ground-up audit. All three
// bodies (fen lurker / basilisk / elder) across the eight facing
// bands at idle, the sprawled tripod march, the looping BITE (the
// trunk must surge at half mass while the neck coils, drives, and
// clamps), and the hurt flash; a CLUSTER-SPREAD row (consecutive
// seeds must scatter coats — the anti-twin law); the giant turtle
// and giant crab beside them as references (the court must never
// read as a keep or a rampart); and BODY-RULER cells with the
// player rig. Each basilisk figure owns a live LegRig AND a live
// TailSim dragon trailer, so gait, feet, and the tail run exactly
// the physics the game plays. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  LegSolver,
  basiliskLook,
  beastSpec,
  drawBasiliskTail,
  drawBeast,
  drawHumanoid,
  type RigPose,
} from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';
import { CrocTailSim } from '../render/tail.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110);
const YS = 0.6;

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
  fen_basilisk: { radius: 0.45, speed: 2.3, color: '#5c6644' },
  basilisk: { radius: 0.5, speed: 1.8, color: '#6b6a52' },
  elder_basilisk: { radius: 0.62, speed: 1.7, color: '#5e6157' },
  giant_turtle: { radius: 0.46, speed: 2.2, color: '#5d6b46' },
  giant_crab: { radius: 0.5, speed: 1.9, color: '#46655c' },
};

type Mode = 'idle' | 'walk' | 'bite' | 'hurt';

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
  /** THE WEAPON OFF THE STERN: live CrocTailSim per basilisk fig. */
  tail?: CrocTailSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom.
row('basilisk idle', 'basilisk', 'idle');
row('basilisk walk', 'basilisk', 'walk');
row('basilisk bite', 'basilisk', 'bite');
row('basilisk hurt', 'basilisk', 'hurt');
row('fen idle', 'fen_basilisk', 'idle');
row('fen walk', 'fen_basilisk', 'walk');
row('fen bite', 'fen_basilisk', 'bite');
row('elder idle', 'elder_basilisk', 'idle');
row('elder walk', 'elder_basilisk', 'walk');
row('elder bite', 'elder_basilisk', 'bite');
// The cluster spread: consecutive seeds must scatter coats — four
// wild basilisks, four fen lurkers, no twins side by side.
for (let k = 0; k < 4; k++) {
  figs.push({ label: `spread b${400 + k}`, defId: 'basilisk', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
for (let k = 0; k < 4; k++) {
  figs.push({ label: `spread f${400 + k}`, defId: 'fen_basilisk', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// References + rulers + bare close-up seeds: the court must never
// read as a keep or a rampart, and the player ruler proves the size
// promise for all three bodies.
figs.push({ label: 'turtle (reference)', defId: 'giant_turtle', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'crab (reference)', defId: 'giant_crab', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'ruler: player+fen', defId: 'fen_basilisk', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+basilisk', defId: 'basilisk', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+elder', defId: 'elder_basilisk', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'basilisk S (bow)', defId: 'basilisk', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'basilisk E (profile)', defId: 'basilisk', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'elder SW (quarter)', defId: 'elder_basilisk', dir: (3 * Math.PI) / 4, mode: 'bite', seed: 5 });

const COLS = 8;
const CW = Math.round(S * 3.8);
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

/** One beast through drawBeast with a live LegRig (+ live trailer). */
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
  // The looping bite beat, slow enough that the coil, the drive, and
  // the clamp all read.
  const attackT = mode === 'bite' ? (now * 0.0011) % 1 : 0;
  const hurt = mode === 'hurt';
  // THE DRAGON TRAILER: basilisk figs run the live sim the game
  // runs — anchored on the LUNGED position at the court's own
  // damped mass, exactly the renderer's contract.
  let paintTail: (() => void) | undefined;
  if (f.defId.endsWith('basilisk')) {
    const bl = basiliskLook(f.defId, seed);
    if (!f.tail) {
      const rootOff = Math.min(spec.bodyLen - 0.04, spec.bodyLen * 0.92);
      f.tail = new CrocTailSim(seed, rootOff, {
        len: bl.tailLen,
        heavy: bl.tailHeavy,
        stiff: bl.tailStiff,
        wave: bl.tailWave,
      });
    }
    let lunge = 0;
    if (attackT > 0) {
      lunge =
        (attackT < 0.7
          ? -0.12 * (attackT / 0.7)
          : 0.3 * Math.sin(Math.PI * Math.min(1, (attackT - 0.7) / 0.3))) * 0.45;
    }
    f.tail.update(
      wx + Math.cos(lp.dir) * lunge,
      wy + Math.sin(lp.dir) * lunge,
      bl.bodyH * 0.45 + lp.bob * 0.35,
      lp.dir,
      dt,
      now / 1000,
      1,
    );
    const st = { hide: bl.hide, horn: bl.horn, belly: bl.belly, rootW: bl.tailRootW, heavy: bl.tailHeavy * 0.55, fin: bl.fin };
    const sim = f.tail;
    paintTail = () => {
      const pts = sim.nodes.map((nd) => ({
        x: x + (nd.x - wx) * S,
        y: y + (nd.y - wy) * S * YS - nd.z * S,
      }));
      drawBasiliskTail(ctx, pts, st, S, { hurt, back: Math.sin(lp.dir) < -0.2 });
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
    tail: paintTail,
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
  ctx.fillStyle = '#33382c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.4) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.8 * S, homeY);
    ctx.lineTo(homeX + 1.8 * S, homeY);
    ctx.stroke();

    if (f.ruler) {
      drawMan(f, homeX - 1.0 * S, homeY, now, dt);
      drawQuad(f, homeX + 0.5 * S, homeY, f.dir, f.mode, f.seed, now, dt);
    } else {
      drawQuad(f, homeX, homeY, f.dir, f.mode, f.seed, now, dt);
    }
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

// TEMPORARY rig verification harness (checked-in tooling): THE DEPTH
// WHEEL — the arm-LAYER audit at fine rotation. The eight-band sheets
// (wieldlab) can never catch a depth flip that lands BETWEEN bands, so
// this sheet walks the full circle in 15° steps and sweeps the
// south-of-profile arc — the band where "running sideways, slightly
// toward camera" lives — in 6° steps. THE PRIMARY-COLOR ARMS: the
// main arm paints solid RED, the off arm solid BLUE (RIG_DEBUG tint
// channels, labs only), so which arm is on which layer is a glance,
// not a squint. Each cell prints its heading in degrees and the live
// layer verdict its own depthMemory settled on: F = offFront (far arm
// joined the front layer), B = far arm behind the torso, MB = the
// dual-wield mainBehind flip. Every figure owns persistent LegSolver +
// kneeMemory + depthMemory (THE LAB LESSON: stateless figures judge
// dead hysteresis).
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?tint=0     natural colors (tint off)
//   ?gait=walk  run rows amble at walk speed
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { LegSolver, RIG_DEBUG, drawHumanoid, type RigPose } from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(40, parseInt(q.get('s') ?? '95', 10) || 95);
const YS = 0.6; // camera y foreshorten, the renderer's yScale
const GAIT_SPEED = q.get('gait') === 'walk' ? 1.5 : 4.6; // tiles/sec

if (q.get('tint') !== '0') {
  RIG_DEBUG.tintMain = '#d92b2b'; // main arm: red
  RIG_DEBUG.tintOff = '#2451e8'; // off arm: blue
}

interface Fig {
  label: string;
  dir: number;
  mode: 'idle' | 'move';
  weapon?: string;
  // live sim state (persistent — the hysteresis must run as in game)
  legs?: LegSolver;
  wx?: number;
  wy?: number;
  kneeMemory?: number[];
  depthMemory?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const deg = (d: number): number => (d * Math.PI) / 180;
/** One wheel band: the full circle in `step`° increments. Headings in
 *  SCREEN degrees — 0 = E, 90 = S (toward camera), 180 = W, 270 = N. */
const wheel = (label: string, mode: Fig['mode'], step: number, weapon?: string): void => {
  for (let d = 0; d < 360; d += step) {
    figs.push({ label: `${label} ${d}°`, dir: deg(d), mode, weapon });
  }
};
/** One fan band: dirs listed explicitly (the fine boundary sweeps). */
const fan = (label: string, dirs: number[], mode: Fig['mode'], weapon?: string): void => {
  for (const d of dirs) figs.push({ label: `${label} ${d}°`, dir: deg(d), mode, weapon });
};

// Sheet bands, top to bottom (12 figs per sheet row):
wheel('idle', 'idle', 15); // rows 0-1: bare idle, full circle
wheel('run', 'move', 15); // rows 2-3: bare run, full circle
wheel('sword run', 'move', 15, 'bronze_sword'); // rows 4-5
// THE COMPLAINT ARC: south-of-profile at 6° — the exact band the
// screenshot lives in, both hemispheres (mirror law on |fx|).
fan('E-fan run', Array.from({ length: 12 }, (_, k) => 12 + 6 * k), 'move'); // row 6: 12°..78°
fan('W-fan run', Array.from({ length: 12 }, (_, k) => 168 - 6 * k), 'move'); // row 7: 168°..102°
fan('E-fan idle', Array.from({ length: 12 }, (_, k) => 12 + 6 * k), 'idle'); // row 8
fan('W-fan idle', Array.from({ length: 12 }, (_, k) => 168 - 6 * k), 'idle'); // row 9

const COLS = 12;
const CW = 170;
const CH = 250;

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

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = COLS * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const homeX = CW / 2 + (i % COLS) * CW;
    const homeY = 175 + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(homeX - 0.72 * S, homeY);
    ctx.lineTo(homeX + 0.72 * S, homeY);
    ctx.stroke();

    if (!f.legs) {
      f.legs = new LegSolver();
      f.wx = 0;
      f.wy = 0;
      f.kneeMemory = [0, 0];
      f.depthMemory = { mainBehind: false };
    }
    const moving = f.mode === 'move';
    if (moving) {
      f.wx! += Math.cos(f.dir) * GAIT_SPEED * dt;
      f.wy! += Math.sin(f.dir) * GAIT_SPEED * dt;
    }
    const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
    const feet = lp.feet.map((ft) => ({
      x: homeX + (ft.x - f.wx!) * S,
      y: homeY + (ft.y - f.wy!) * S * YS,
      lift: ft.lift,
    }));
    const rig: RigPose = {
      x: homeX,
      y: homeY,
      scale: S,
      size: 1,
      dir: f.dir,
      pose: moving ? PoseState.Walk : PoseState.Idle,
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
      kneeMemory: f.kneeMemory!,
      depthMemory: f.depthMemory,
      bodyColor: '#6b4a9e',
      hurt: false,
      isOwn: false,
      gatherPhase: 0,
      weaponItem: f.weapon,
    };
    drawHumanoid(ctx, rig);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.62 * S);
    // The layer verdict the figure's own memory settled on — printed
    // from the same bits the painter consumed, so the caption can
    // never lie about the cell above it.
    const mem = f.depthMemory;
    const verdict = mem?.mainBehind ? 'MB' : mem?.offFront ? 'F: off arm FRONT' : 'B: off arm behind';
    ctx.fillStyle = mem?.offFront ? '#8fd0ff' : '#b9d8a8';
    ctx.fillText(verdict, homeX, homeY + 0.46 * S);
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
  // All steps synchronously inside the first rAF (headless capture
  // fires at page idle — see wieldlab's det law), every step drawn so
  // the caller-owned memories evolve exactly as live.
  requestAnimationFrame(() => {
    for (let i = 0; i < DET_FRAMES; i++) drawSheet(i * (1000 / 60), 1 / 60);
  });
} else {
  requestAnimationFrame(frame);
}

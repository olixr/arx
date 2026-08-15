// TEMPORARY rig verification harness (checked-in tooling): THE FOOT
// SHEET — every foot type the beast walkers wear, across the eight
// facing bands, live. THE FOOT KNOWS THE GROUND audit surface: feet
// must bear the body's facing (plus their species splay — bears
// pigeon-toed, turtles sprawled, hooves near-true), never whip with
// the shin, and every pad/claw/hoof must foreshorten with the ground
// plane. Rows cover the bearpaw (bear), the paw chip (wolf), the
// cloven and whole hoofs (stag, cow, boar, sheep), and the bird claw
// (chicken); the turtleclaw rows live on THE TURTLE SHEET
// (turtlelab.html). Each figure owns a live LegRig, so gait and feet
// run exactly the physics the game plays. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups (E/W cells)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { beastSpec, drawBeast } from '../render/rig.js';
import { LegRig, type LegPose } from '../render/legs.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110); // scale px per tile (?s= zoom lever)
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

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
  bear: { radius: 0.42, speed: 4.0, color: '#3d332a' },
  wolf: { radius: 0.34, speed: 4.6, color: '#6a6f7d' },
  stag: { radius: 0.3, speed: 4.4, color: '#a67c52' },
  cow: { radius: 0.34, speed: 1.8, color: '#e7ddca' },
  boar: { radius: 0.3, speed: 3.8, color: '#5c4a3a' },
  sheep: { radius: 0.26, speed: 2.4, color: '#e6dfcd' },
  chicken: { radius: 0.22, speed: 2, color: '#f4efe4' },
};

type Mode = 'idle' | 'walk' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegRig;
  knee?: number[];
  walkPhase?: number;
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom: the plantigrade paw at both gaits (the
// pigeon-toe must read standing AND mid-stride), then one walk row
// per remaining foot word.
row('bear idle', 'bear', 'idle');
row('bear walk', 'bear', 'walk');
row('wolf walk', 'wolf', 'walk');
row('stag walk', 'stag', 'walk');
row('cow walk', 'cow', 'walk');
row('boar walk', 'boar', 'walk');
row('sheep walk', 'sheep', 'walk');
row('chicken walk', 'chicken', 'walk');

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

/** One beast through drawBeast with a live LegRig. */
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
    hurt: mode === 'hurt',
    kneeMemory: f.knee!,
    attackT: 0,
    seed,
    nowMs: now,
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
    drawQuad(f, homeX, homeY, f.dir, f.mode, f.seed, now, dt);
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

// TEMPORARY rig verification harness (checked-in tooling): THE DOLMEN
// SHEET — the Course-dialect audit (docs/contested-lands-plan.md §11,
// band 9a: THE MARL). One body across the eight facing bands at idle,
// walk (THE LEVEL GAIT: the yoke line level while the legs roll under
// it, the plumb swinging with the stride), and the hurt-flash
// silhouette row, plus BODY-RULER cells standing the player rig, the
// rock golem (the strongest "reads as golem" failure argued on the
// sheet), and the hobgoblin (the nearest carriage twin) beside the
// Marl. Every figure owns a live biped LegSolver AND a live PendantSim
// — the sheet plays the same physics the game does: walks swing the
// bob, stops settle it to THE ONE REST. No seed-spread row (a design)
// and no strike row (the overhead SET wants a fightable body: 9b).
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (N/E/W close-ups)
//   ?only=id    one body huge (dolmen)
//   ?ol=1       OUTLINE mode: every figure rings through a faithful
//               simulation of the renderer's dilate (radius law
//               max(1.25, s*0.04), integer 8-tap, ink under art)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
//   ?head=1     THE TURN STRIP: sixteen evenly-spaced headings of one
//               bare body — the standing procedure for vetting the
//               head as a TURNED VOLUME: keel and shelf must travel
//               as one object across all sixteen, the small head must
//               never leave the yoke, and from the north band the
//               back plate must hide the head to the crown and read
//               as a hood.
//   ?probe=1    the head's own geometry overlay (DOLMEN_HEAD_DEBUG):
//               magenta = the painter's true silhouette sampling,
//               cyan = the yoke ring's rim, green/red dots = the
//               load-bearing feature stations on camera-side /
//               turned-away. Judge geometry first, art second.
//   ?dbg=1      SKELETON overlay (don't combine with ?ol=1): the
//               rig's hand-orbit ring, hip line, shoulder roots, arm
//               chains, fist targets, and head hull off RIG_DEBUG.
import { LegSolver, RIG_DEBUG, drawHumanoid, type RigPose } from '../render/rig.js';
import { DOLMEN_HEAD_DEBUG, dolmenLook } from '../render/dolmen.js';
import { PendantSim } from '../render/ogre.js';
import { golemLook } from '../render/golems.js';
import { hobgoblinLook } from '../render/hobgoblin.js';
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
const DBG = q.get('dbg') === '1';

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

/** Renderer DOLMEN_SIZE / GOLEM_SIZE / HOB_SIZE mirror — keep in step. */
const SIZE: Record<string, number> = {
  dolmen: 1.02,
  rock_golem: 1.55,
  hobgoblin: 1.02,
};
/** Bestiary walk speeds, mirrored (the setter's pace = ROUTINE_WALK_SPEED). */
const SPEED: Record<string, number> = {
  dolmen: 1.8,
};

type Mode = 'idle' | 'walk' | 'hurt';
type Ruler = 'player' | 'rock_golem' | 'hobgoblin';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand another body beside the Dolmen. */
  ruler?: Ruler;
  /** Bare cells (the strip) — the Dolmen is always bare; kept for parity. */
  bare?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
  plumb?: PendantSim;
  // the ruler body's own sims
  rLegs?: LegSolver;
  rKnee?: number[];
  rDepth?: RigPose['depthMemory'];
  rEars?: EarSim;
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — the walk row is where THE LEVEL GAIT and
// the swinging plumb read; the hurt row is the silhouette truth.
row('dolmen idle', 'dolmen', 'idle');
row('dolmen walk', 'dolmen', 'walk');
row('dolmen hurt', 'dolmen', 'hurt');
// THE BODY RULERS: the player rig (1.02 against the rig, shoulders
// 1.30x, hands forward of the thighs), the rock golem (flesh hide and
// a swinging plumb against stone), the hobgoblin (the parade frame
// against the yoke's hunch).
figs.push({ label: 'ruler: player+dolmen', defId: 'dolmen', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: 'player' });
figs.push({ label: 'ruler: rock_golem+dolmen', defId: 'dolmen', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: 'rock_golem' });
figs.push({ label: 'ruler: hobgoblin+dolmen', defId: 'dolmen', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: 'hobgoblin' });

// THE TURN STRIP: ?head=1 swaps the roster for sixteen headings of
// one bare body — the head-vetting procedure's own sheet.
if (q.get('head') === '1') {
  figs.length = 0;
  const id = ONLY ?? 'dolmen';
  for (let i = 0; i < 16; i++) {
    const a = Math.PI / 2 + (i / 16) * Math.PI * 2;
    figs.push({ label: `turn ${i}/16`, defId: id, dir: a, mode: 'idle', seed: 5, bare: true });
  }
}
DOLMEN_HEAD_DEBUG.on = q.get('probe') === '1';

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
const CW = Math.round(S * 2.2);
const CH = Math.round(S * 2.9);

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

/**
 * THE HUNCH AUDIT overlay: the rig's own solved frame, straight off
 * RIG_DEBUG, in unmistakable colors — drawn right after the figure it
 * measures so ruler cells overlay each body separately.
 */
function drawDbg(): void {
  const d = RIG_DEBUG;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.armY);
  ctx.lineTo(d.x + 0.7 * d.s, d.armY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190,190,190,0.4)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.hipY);
  ctx.lineTo(d.x + 0.7 * d.s, d.hipY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(90,230,110,0.95)';
  ctx.beginPath();
  ctx.moveTo(d.mainShX, d.mainShY);
  ctx.lineTo(d.offShX, d.offShY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,230,110,0.95)';
  for (const [px, py] of [
    [d.mainShX, d.mainShY],
    [d.offShX, d.offShY],
  ] as const) {
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const armInk = ['rgba(240,210,60,0.95)', 'rgba(80,220,235,0.95)'];
  d.arms.forEach((a, i) => {
    ctx.strokeStyle = armInk[i % 2]!;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(a.kx, a.ky);
    ctx.lineTo(a.ex, a.ey);
    ctx.stroke();
    ctx.fillStyle = armInk[i % 2]!;
    ctx.beginPath();
    ctx.arc(a.kx, a.ky, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  const cross = (px: number, py: number, ink: string): void => {
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(px - 4, py - 4);
    ctx.lineTo(px + 4, py + 4);
    ctx.moveTo(px - 4, py + 4);
    ctx.lineTo(px + 4, py - 4);
    ctx.stroke();
  };
  cross(d.mainFistX, d.mainFistY, 'rgba(235,80,80,0.95)');
  cross(d.offFistX, d.offFistY, 'rgba(90,140,255,0.95)');
  ctx.strokeStyle = 'rgba(235,80,225,0.9)';
  ctx.beginPath();
  ctx.arc(d.headX, d.headY, d.headR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** One Dolmen through drawHumanoid with live legs and a live plumb. */
function drawDol(f: Fig, x: number, y: number, now: number, dt: number): void {
  const size = SIZE[f.defId] ?? 1.02;
  if (!f.legs) {
    f.legs = new LegSolver(1);
    f.knee = [0, 0];
    f.depth = { mainBehind: false };
    f.plumb = new PendantSim(f.seed);
    f.wx = 0;
    f.wy = 0;
  }
  const speed = f.mode === 'walk' ? (SPEED[f.defId] ?? 1.8) : 0;
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
  const look = dolmenLook(f.defId, f.seed);
  RIG_DEBUG.on = DBG;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size,
    dir: f.dir,
    pose: f.mode === 'walk' ? PoseState.Walk : PoseState.Idle,
    poseT: 1,
    drawT: 0,
    // Walk is a RESTFUL pose in the game (renderer restfulPose set:
    // Idle/Walk/Sneak → restT rides to 1) — the sheet shows the true
    // walk CARRIAGE.
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
    kneeMemory: f.knee!,
    depthMemory: f.depth,
    bodyColor: look.hide,
    skinColor: look.palm,
    hurt: f.mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    dolmen: look,
    dolmenPlumb: f.plumb,
  });
  if (DBG) drawDbg();
  RIG_DEBUG.on = false;
}

/** The ruler body: the player rig, the rock golem, or a bare hobgoblin
 *  — each on the game's own biped solver with its own sims. */
function drawRuler(f: Fig, kind: Ruler, x: number, y: number, now: number, dt: number): void {
  if (!f.rLegs) {
    f.rLegs = new LegSolver(1);
    f.rKnee = [0, 0];
    f.rDepth = { mainBehind: false };
    f.rEars = new EarSim(5);
  }
  const lp = f.rLegs.update(0, 0, Math.PI / 2, dt);
  const feet = lp.feet.map((ft) => ({ x: x + ft.x * S, y: y + ft.y * S * YS, lift: ft.lift }));
  const gol = kind === 'rock_golem' ? golemLook('rock_golem', 5) : undefined;
  const hob = kind === 'hobgoblin' ? hobgoblinLook('hobgoblin', 5) : undefined;
  RIG_DEBUG.on = DBG;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: kind === 'player' ? 1 : (SIZE[kind] ?? 1),
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
    kneeMemory: f.rKnee!,
    depthMemory: f.rDepth,
    bodyColor: gol ? gol.shell : hob ? hob.hide : '#3f5d8e',
    skinColor: gol ? gol.shell : hob ? hob.hide : undefined,
    hurt: false,
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    golem: gol,
    hobgoblin: hob,
    earSim: hob ? f.rEars : undefined,
  });
  if (DBG) drawDbg();
  RIG_DEBUG.on = false;
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
  ctx.fillStyle = '#33302a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  kept.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.25) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.0 * S, homeY);
    ctx.lineTo(homeX + 1.0 * S, homeY);
    ctx.stroke();

    const paint = (): void => {
      if (f.ruler) {
        drawRuler(f, f.ruler, homeX - 0.85 * S, homeY, now, dt);
        drawDol(f, homeX + 0.5 * S, homeY, now, dt);
      } else {
        drawDol(f, homeX, homeY, now, dt);
      }
    };
    if (OL) {
      paintCellOutlined(homeX - CW / 2, homeY - Math.round(S * 2.25), CW, CH, paint);
    } else {
      paint();
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.05 * S);
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

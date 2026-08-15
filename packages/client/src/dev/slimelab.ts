// TEMPORARY rig verification harness (checked-in tooling): THE OOZE
// SHEET — the formless family's ground-up audit
// (docs/ooze-family-plan.md). Every body plan across the eight facing
// bands at idle, travel, the looping STRIKE (gather → spring), and the
// hurt flash; a family LINE-UP row (all nine bodies at S — the
// variants must read apart at a glance); BODY-RULER cells standing the
// player rig beside the giant, the cube, and the pudding; and a trail
// preview strip (the dabs the renderer's shadow pass prints). Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding for close-ups
//   ?ol=1       OUTLINE mode: ring every figure through a faithful
//               simulation of the renderer's 8-tap dilate (same
//               radius law, integer taps, #241a2e ink, ring UNDER
//               the art) — the in-game silhouette read without
//               launching the game.
import {
  LegSolver,
  drawHumanoid,
  drawOoze,
  drawOozeTrailDab,
  oozeLook,
  shade,
  type OozeLook,
  type RigPose,
} from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
// `let`, never `const`: outline mode swaps the sheet's ctx out from
// under the painters mid-cell — the exact contract the renderer's
// paintOutlineScratch runs on the live game's draw closures.
let ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110);
const YS = 0.6; // renderer's yScale
const OL = q.get('ol') === '1';

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
  const r = Math.max(1.25, S * 0.04);
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

/** Content-def mirrors: radius/color/speed sized exactly as in game. */
const BODIES: Record<string, { radius: number; speed: number; color: string }> = {
  slime: { radius: 0.32, speed: 2.6, color: '#6fbf4e' },
  slime_small: { radius: 0.18, speed: 3.0, color: '#8fd46a' },
  giant_slime: { radius: 0.55, speed: 2.2, color: '#5cae44' },
  gray_ooze: { radius: 0.4, speed: 2.0, color: '#8b8d90' },
  ochre_jelly: { radius: 0.46, speed: 2.3, color: '#c8973a' },
  ochre_half: { radius: 0.3, speed: 2.7, color: '#d4a54e' },
  gelatinous_cube: { radius: 0.6, speed: 1.6, color: '#9fd8c8' },
  black_pudding: { radius: 0.42, speed: 2.4, color: '#2e2a33' },
  pudding_half: { radius: 0.28, speed: 2.8, color: '#3a3542' },
};

type Mode = 'idle' | 'move' | 'strike' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  ruler?: boolean;
  trail?: boolean;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 11): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom: each body plan earns idle/move/strike;
// hurt rides the line-up row (the flash is one law family-wide).
row('slime idle', 'slime', 'idle');
row('slime move', 'slime', 'move');
row('slime strike', 'slime', 'strike');
row('giant idle', 'giant_slime', 'idle');
row('giant move', 'giant_slime', 'move');
row('giant strike', 'giant_slime', 'strike');
row('gray idle', 'gray_ooze', 'idle');
row('gray move', 'gray_ooze', 'move');
row('gray strike', 'gray_ooze', 'strike');
row('ochre idle', 'ochre_jelly', 'idle');
row('ochre move', 'ochre_jelly', 'move');
row('ochre strike', 'ochre_jelly', 'strike');
row('cube idle', 'gelatinous_cube', 'idle');
row('cube move', 'gelatinous_cube', 'move');
row('cube strike', 'gelatinous_cube', 'strike');
row('pudding idle', 'black_pudding', 'idle');
row('pudding move', 'black_pudding', 'move');
row('pudding strike', 'black_pudding', 'strike');
// THE LINE-UP: all nine bodies south-facing — the family must read
// apart at a glance, and the halves must read as their parents' kin.
for (const id of Object.keys(BODIES)) {
  figs.push({ label: id, defId: id, dir: Math.PI / 2, mode: 'idle', seed: 11 });
}
// hurt flashes: one per plan (a white mass must keep its silhouette).
figs.push({ label: 'hurt slime', defId: 'slime', dir: Math.PI / 2, mode: 'hurt', seed: 11 });
figs.push({ label: 'hurt gray', defId: 'gray_ooze', dir: Math.PI / 2, mode: 'hurt', seed: 11 });
figs.push({ label: 'hurt ochre', defId: 'ochre_jelly', dir: Math.PI / 2, mode: 'hurt', seed: 11 });
figs.push({ label: 'hurt cube', defId: 'gelatinous_cube', dir: Math.PI / 2, mode: 'hurt', seed: 11 });
figs.push({ label: 'hurt pudding', defId: 'black_pudding', dir: Math.PI / 2, mode: 'hurt', seed: 11 });
// Body rulers: the player rig beside the landmark bodies.
figs.push({ label: 'ruler: giant', defId: 'giant_slime', dir: Math.PI / 2, mode: 'idle', seed: 11, ruler: true });
figs.push({ label: 'ruler: cube', defId: 'gelatinous_cube', dir: Math.PI / 2, mode: 'idle', seed: 11, ruler: true });
figs.push({ label: 'ruler: pudding', defId: 'black_pudding', dir: Math.PI / 2, mode: 'idle', seed: 11, ruler: true });
// Seed spread: same body, five seeds — anti-rubber-stamp row.
for (let k = 0; k < 5; k++) {
  figs.push({ label: `giant seed ${k}`, defId: 'giant_slime', dir: Math.PI / 2, mode: 'idle', seed: 3 + k * 17 });
}
// Trail preview: the dabs the shadow pass prints, at three ages.
figs.push({ label: 'trail: slime', defId: 'slime', dir: 0, mode: 'move', seed: 11, trail: true });
figs.push({ label: 'trail: cube', defId: 'gelatinous_cube', dir: 0, mode: 'move', seed: 11, trail: true });
figs.push({ label: 'trail: pudding', defId: 'black_pudding', dir: 0, mode: 'move', seed: 11, trail: true });

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

let lastNow = 0;

function fallbackLook(): OozeLook {
  return { plan: 'hopper', giant: false, nuclei: 1 };
}

/** One ooze through the game's own painter, on the lab's clocks. */
function drawBody(f: Fig, x: number, y: number, now: number): void {
  const info = BODIES[f.defId]!;
  const look = oozeLook(f.defId) ?? fallbackLook();
  const moveK = f.mode === 'move' ? 1 : 0;
  // Travel phase from a distance clock, exactly the anim map's law
  // (walkPhase advances with tiles crossed).
  const walkPhase = f.mode === 'move' ? (now / 1000) * info.speed * 0.5 : 0;
  const attackT = f.mode === 'strike' ? ((now / 1000) * 1.4) % 1 : 0;
  drawOoze(ctx, look, {
    x,
    y,
    s: S,
    dir: f.dir,
    radius: info.radius,
    color: info.color,
    hurt: f.mode === 'hurt',
    walkPhase,
    nowMs: now,
    seed: f.seed,
    moveK,
    attackT,
    ys: YS,
  });
}

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
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.2 * S, homeY);
    ctx.lineTo(homeX + 1.2 * S, homeY);
    ctx.stroke();

    const paintFig = (): void => {
      if (f.trail) {
        // The renderer's shadow-pass dabs, three ages old → fresh,
        // leading to the body — the print spacing story in one cell.
        const info = BODIES[f.defId]!;
        const look = oozeLook(f.defId) ?? fallbackLook();
        const spacing = (look.plan === 'hopper' ? 0.52 : 0.32) * S;
        const ink = look.plan === 'cube' ? shade(info.color, 10) : shade(info.color, -8);
        for (let k = 0; k < 4; k++) {
          const age = (3 - k) / 4 + (((now / 1000) * 0.4) % 0.25);
          if (age >= 1) continue;
          drawOozeTrailDab(
            ctx,
            homeX - S * 0.9 - (3 - k) * spacing * 0.55,
            homeY + S * 0.04,
            info.radius * S * (0.5 - age * 0.14),
            f.seed * 31 + k * 0x9e37,
            ink,
            (1 - age) * 0.26,
          );
        }
        drawBody(f, homeX + S * 0.55, homeY, now);
      } else if (f.ruler) {
        drawMan(f, homeX - 0.95 * S, homeY, now, dt);
        drawBody(f, homeX + 0.45 * S, homeY, now);
      } else {
        drawBody(f, homeX, homeY, now);
      }
    };
    if (OL) {
      // The strike leaves the box: the scratch pads a full stride
      // past the cell bounds so the spring and the pseudopod are
      // never guillotined mid-extension.
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
}

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  drawSheet(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

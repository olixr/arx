// TEMPORARY sapling-art verification harness (farmlab's sibling):
// THE NURSERY SHEET — every tree species' juvenile at working scale,
// all three structural variants, hash-spread anti-twin cells, and the
// grow-in ease stages, with the player rig first in every row for the
// body-ruler audit. Below it THE PROMISE SHEET: each variant's
// sapling standing beside the exact adult its tile hash grows into,
// at one shared scale — the juvenile must read as the SAME tree,
// young. Wind runs live off the one field; ?t=<sec> freezes the
// clock for deterministic screenshots.
import { PoseState, Tile } from '@arx/shared';
import { paintTree, saplingModel, treeModel, type TreeModel } from '../render/trees.js';
import { drawHumanoid, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const params = new URLSearchParams(location.search);
const FROZEN = params.get('t') !== null ? Number(params.get('t')) : null;

interface SpeciesRow {
  name: string;
  tile: Tile; // ADULT tile (saplingModel's contract)
  si: number; // species index — commons pin h % 5
}

const ROWS: SpeciesRow[] = [
  { name: 'maple', tile: Tile.Tree, si: 0 },
  { name: 'birch', tile: Tile.Tree, si: 1 },
  { name: 'twin', tile: Tile.Tree, si: 2 },
  { name: 'windswept', tile: Tile.Tree, si: 3 },
  { name: 'broadleaf', tile: Tile.Tree, si: 4 },
  { name: 'oak', tile: Tile.TreeOak, si: 5 },
  { name: 'willow', tile: Tile.TreeWillow, si: 6 },
  { name: 'yew', tile: Tile.TreeYew, si: 7 },
  { name: 'pine', tile: Tile.TreePine, si: 8 },
];

/** Find world hashes whose sapling lands on species si + variant v.
 *  `skip` walks past earlier finds so spread cells get distinct trees. */
function hashFor(row: SpeciesRow, v: number, skip = 0): number {
  let found = 0;
  for (let h = 1; h < 60000; h++) {
    if (row.tile === Tile.Tree && h % 5 !== row.si) continue;
    const m = saplingModel(row.tile, h);
    if (m.variant !== v) continue;
    if (found++ === skip) return h;
  }
  return 1;
}

// --- Sheet A: the nursery (close-up work scale).
const S_A = 140;
const CW_A = 250;
const CH_A = 380;
// --- Sheet B: the promise (sapling beside its adult, shared scale).
const S_B = 56;
const CW_B = 470;
const CH_B = 420;

interface CellA {
  row: SpeciesRow;
  h: number;
  grow: number;
  label: string;
}

const sheetA: CellA[][] = ROWS.map((row) => {
  const cells: CellA[] = [];
  for (const [v, skip, tag] of [
    [0, 0, 'v0'], [0, 1, 'v0 b'], [0, 2, 'v0 c'],
    [1, 0, 'v1'], [2, 0, 'v2'],
  ] as const) {
    cells.push({ row, h: hashFor(row, v, skip), grow: 1, label: `${row.name} ${tag}` });
  }
  cells.push({ row, h: hashFor(row, 0, 0), grow: 0.45, label: `${row.name} grow .45` });
  cells.push({ row, h: hashFor(row, 0, 0), grow: 0.7, label: `${row.name} grow .7` });
  return cells;
});

const RULER_KNEES: number[] = [0, 0];
const RULER_DEPTH: NonNullable<RigPose['depthMemory']> = { mainBehind: false };

function drawRuler(cx: number, gy: number, scale: number, now: number): void {
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
    nowMs: now,
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

function ground(cx: number, gy: number, s: number): void {
  ctx.fillStyle = '#31502c';
  ctx.beginPath();
  ctx.ellipse(cx, gy + 2, s * 0.62, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b5f33';
  ctx.beginPath();
  ctx.ellipse(cx, gy, s * 0.55, s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintAt(
  m: TreeModel, cx: number, gy: number, s: number,
  wx: number, wy: number, t: number, grow: number,
): void {
  paintTree(ctx, m, {
    bx: cx,
    groundY: gy,
    s,
    syT: s * 0.6,
    wx,
    wy,
    tSec: t,
    grow,
  });
}

function label(text: string, cx: number, y: number): void {
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y);
}

function frame(now: number): void {
  const t = FROZEN ?? now * 0.001;
  const colsA = 1 + sheetA[0]!.length; // ruler + cells
  const wA = colsA * CW_A;
  const wB = 3 * CW_B;
  canvas.width = Math.max(wA, wB);
  canvas.height = ROWS.length * CH_A + 70 + ROWS.length * CH_B;
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Sheet A: the nursery.
  sheetA.forEach((cells, r) => {
    const gy = CH_A * (r + 1) - 90;
    ground(CW_A / 2, gy, S_A);
    drawRuler(CW_A / 2, gy, S_A, now);
    label('player (ruler)', CW_A / 2, gy + 46);
    cells.forEach((c, i) => {
      const cx = CW_A / 2 + (i + 1) * CW_A;
      ground(cx, gy, S_A);
      paintAt(
        saplingModel(c.row.tile, c.h), cx, gy, S_A,
        (i + 1) * 3.1, r * 2.7, t, c.grow,
      );
      label(c.label, cx, gy + 46);
    });
  });

  // --- Sheet B: the promise (adult beside its own sapling).
  const yB0 = ROWS.length * CH_A + 60;
  ctx.fillStyle = '#cfc8b8';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('THE PROMISE SHEET — each sapling beside the adult its hash grows', 20, yB0 - 22);
  ROWS.forEach((row, r) => {
    const gy = yB0 + CH_B * (r + 1) - 70;
    for (let v = 0; v < 3; v++) {
      const h = hashFor(row, v, 0);
      const cx = CW_B * v + CW_B * 0.38;
      ground(cx, gy, S_B * 2.2);
      paintAt(treeModel(row.tile, h), cx, gy, S_B, v * 5.3, r * 4.9, t, 1);
      const sx = CW_B * v + CW_B * 0.8;
      paintAt(saplingModel(row.tile, h), sx, gy, S_B, v * 5.3 + 2, r * 4.9, t, 1);
      drawRuler(CW_B * v + CW_B * 0.94, gy, S_B, now);
      label(`${row.name} v${v}`, CW_B * v + CW_B / 2, gy + 34);
    }
  });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

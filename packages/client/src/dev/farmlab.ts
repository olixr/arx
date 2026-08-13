// TEMPORARY farm-art verification harness (riglab's sibling): THE
// CROP SHEET — every farmed species at mid and ripe, close up, with
// the player rig standing first for the body-ruler audit. Wind runs
// live; ripe payloads should twinkle; moonbell/dawnveil get a second
// night cell so the lantern glow can be judged after dark.
import { PoseState, Tile } from '@arx/shared';
import { paintPlant, plantModel } from '../render/crops.js';
import { drawHumanoid, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 120; // px per tile — roughly 3x game scale for detail work
const COLS = 10;
const CW = 160;
const CH = 240;

interface Cell {
  label: string;
  tile?: Tile;
  seed: number;
  flame?: number;
  rig?: boolean;
}

const cells: Cell[] = [{ label: 'player (ruler)', seed: 0, rig: true }];

const pair = (name: string, mid: Tile, ripe: Tile, seed = 101): void => {
  cells.push({ label: `${name} mid`, tile: mid, seed });
  cells.push({ label: `${name} ripe`, tile: ripe, seed });
};

cells.push({ label: 'sprout', tile: Tile.CropSprout, seed: 101 });
pair('carrot', Tile.CarrotMid, Tile.CarrotRipe);
pair('sagewort', Tile.SagewortMid, Tile.SagewortRipe);
pair('sunflower', Tile.SunflowerMid, Tile.SunflowerRipe);
pair('wheat', Tile.WheatMid, Tile.WheatRipe);
pair('cotton', Tile.CottonMid, Tile.CottonRipe);
pair('moonbell', Tile.MoonbellMid, Tile.MoonbellRipe);
cells.push({ label: 'moonbell NIGHT', tile: Tile.MoonbellRipe, seed: 101, flame: 1 });
pair('potato', Tile.PotatoMid, Tile.PotatoRipe);
pair('onion', Tile.OnionMid, Tile.OnionRipe);
pair('redroot', Tile.RedrootMid, Tile.RedrootRipe);
pair('cabbage', Tile.CabbageMid, Tile.CabbageRipe);
pair('pumpkin', Tile.PumpkinMid, Tile.PumpkinRipe);
pair('kingsquash', Tile.KingsquashMid, Tile.KingsquashRipe);
pair('barley', Tile.BarleyMid, Tile.BarleyRipe);
pair('bittercress', Tile.BittercressMid, Tile.BittercressRipe);
pair('silverleaf', Tile.SilverleafMid, Tile.SilverleafRipe);
pair('duskthorn', Tile.DuskthornMid, Tile.DuskthornRipe);
pair('dawnveil', Tile.DawnveilMid, Tile.DawnveilRipe);
cells.push({ label: 'dawnveil NIGHT', tile: Tile.DawnveilRipe, seed: 101, flame: 1 });
pair('adderstongue', Tile.AdderstongueMid, Tile.AdderstongueRipe);
pair('apple', Tile.AppleTreeMid, Tile.AppleTreeRipe);
pair('plum', Tile.PlumTreeMid, Tile.PlumTreeRipe);
pair('mirefig', Tile.MirefigMid, Tile.MirefigRipe);
pair('bramble', Tile.BrambleMid, Tile.BrambleRipe);
cells.push({ label: 'log seeded', tile: Tile.MushroomLogSeeded, seed: 101 });
pair('palegill', Tile.PalegillMid, Tile.PalegillRipe);
// Variant spread: the anti-rubber-stamp row. Same species, three
// hashes — silhouettes must differ without breaking the identity.
for (const [name, tile] of [
  ['carrot', Tile.CarrotRipe],
  ['wheat', Tile.WheatRipe],
  ['pumpkin', Tile.PumpkinRipe],
  ['apple', Tile.AppleTreeRipe],
] as const) {
  for (const seed of [7, 40, 77]) cells.push({ label: `${name} v${seed}`, tile, seed });
}

// THE RULER'S PERSISTENT MEMORY (arms-v3 Phase 1): fresh per-frame
// memory objects silently disabled every stateful arm law in the dev
// labs — the sheets were judging a rig the game never runs. One
// module-level memory keeps the ruler honest.
const RULER_KNEES: number[] = [0, 0];
const RULER_DEPTH: NonNullable<RigPose['depthMemory']> = { mainBehind: false };

function drawRuler(cx: number, gy: number, now: number): void {
  const rig: RigPose = {
    x: cx,
    y: gy - 0.44 * S,
    scale: S,
    size: 1,
    dir: Math.PI / 2,
    pose: PoseState.Idle,
    poseT: 0,
    drawT: 0,
    restT: 1,
    nowMs: now,
    feet: [0, 1].map((leg) => ({
      x: cx + (leg === 0 ? -1 : 1) * 0.1 * S,
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

function frame(now: number): void {
  canvas.width = COLS * CW;
  canvas.height = Math.ceil(cells.length / COLS) * CH;
  const t = now * 0.001;
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  cells.forEach((c, i) => {
    const cx = CW / 2 + (i % COLS) * CW;
    const gy = 150 + Math.floor(i / COLS) * CH;
    // Night cells keep their own sky so the glow reads honestly.
    if (c.flame) {
      ctx.fillStyle = '#141022';
      ctx.fillRect(cx - CW / 2 + 2, gy - 148, CW - 4, CH - 30);
    }
    // A tilled-row band underfoot, matching the Tilled palette lane.
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.ellipse(cx, gy + 4, S * 0.55, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57422a';
    ctx.beginPath();
    ctx.ellipse(cx, gy, S * 0.5, S * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    if (c.rig) {
      drawRuler(cx, gy, now);
    } else if (c.tile !== undefined) {
      const m = plantModel(c.tile, c.seed);
      paintPlant(ctx, m, {
        bx: cx,
        groundY: gy,
        s: S,
        wx: (i % COLS) * 3.1,
        wy: Math.floor(i / COLS) * 2.7,
        tSec: t,
        flame: c.flame ?? 0,
      });
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.label, cx, gy + 48);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

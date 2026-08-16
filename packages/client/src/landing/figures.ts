/**
 * THE HEAVY PAINTERS — the landing page's lazy chunk.
 *
 * rig.ts (the humanoid painter) and trees.ts both pull the full armor
 * and weapon libraries through their import graphs (~2 MB minified),
 * so the landing scene starts without them: meadow, wind, fire, and
 * sky paint on the first frame, and the travelers and trees arrive a
 * beat later through this dynamic import. Everything here is a thin
 * adapter over the game's own draw calls — the bodies on the landing
 * page are the bodies in the game, drawn by the same code.
 */
import { PoseState, Tile } from '@arx/shared';
import { LegSolver, drawHumanoid, type RigPose } from '../render/rig.js';
import { paintTree, treeModel, type TreeModel } from '../render/trees.js';

type WTS = (wx: number, wy: number) => { x: number; y: number };

export interface Figure {
  legs: LegSolver;
  /** Caller-owned hysteresis — persists across frames or knees pop. */
  knee: number[];
  depth: RigPose['depthMemory'];
  cloth: string;
}

export function makeFigure(cloth: string): Figure {
  return { legs: new LegSolver(1), knee: [0, 0], depth: { mainBehind: false }, cloth };
}

/**
 * The ground shadow the renderer would cast — drawn OUTSIDE the
 * outline pass, exactly like the game's shadow layer: the ring wraps
 * the body's silhouette, never its shadow.
 */
export function drawFigureShadow(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  wts: WTS,
  s: number,
  ys: number,
  shadowAlpha: number,
): void {
  if (shadowAlpha <= 0.01) return;
  const p = wts(wx, wy);
  ctx.fillStyle = `rgba(20, 16, 26, ${shadowAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.34, s * 0.34 * ys * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * One body through the game's own biped solver, painted FLAT — the
 * caller runs it through the outline shader. Feet come back in
 * absolute world tiles (the solver plants them); we project each
 * through the caller's camera exactly like the renderer does.
 */
export function drawFigure(
  ctx: CanvasRenderingContext2D,
  fig: Figure,
  wx: number,
  wy: number,
  dir: number,
  moving: boolean,
  nowMs: number,
  dt: number,
  wts: WTS,
  s: number,
): void {
  const lp = fig.legs.update(wx, wy, dir, dt);
  const p = wts(wx, wy);
  const feet = lp.feet.map((f) => {
    const fp = wts(f.x, f.y);
    return { x: fp.x, y: fp.y, lift: f.lift };
  });
  drawHumanoid(ctx, {
    x: p.x,
    y: p.y,
    scale: s,
    size: 1,
    dir,
    pose: moving ? PoseState.Walk : PoseState.Idle,
    poseT: 1,
    drawT: 0,
    restT: moving ? 0 : 1,
    nowMs,
    feet,
    bob: lp.bob,
    rise: lp.rise,
    wScale: lp.wScale,
    poleX: lp.poleX,
    poleY: lp.poleY,
    poleStrength: lp.poleStrength,
    runF: lp.runF,
    align: lp.align,
    kneeMemory: fig.knee,
    depthMemory: fig.depth,
    bodyColor: fig.cloth,
    hurt: false,
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
  });
}

export interface SceneTree {
  model: TreeModel;
  wx: number;
  wy: number;
  /** Outline-region half-width, tiles (crown reach at full sway). */
  olHalfW: number;
  /** Outline-region height above the trunk base, tiles. */
  olUp: number;
}

const TREE_TILES: Record<string, Tile> = {
  wild: Tile.Tree,
  oak: Tile.TreeOak,
  pine: Tile.TreePine,
  willow: Tile.TreeWillow,
};

/** Generous crown-reach bounds per kind, for the outline scratch. */
const TREE_BOUNDS: Record<string, { halfW: number; up: number }> = {
  wild: { halfW: 2.3, up: 4.4 },
  oak: { halfW: 2.6, up: 4.8 },
  pine: { halfW: 1.8, up: 5.4 },
  willow: { halfW: 2.6, up: 4.2 },
};

export function makeTree(kind: string, seed: number, wx: number, wy: number): SceneTree {
  const b = TREE_BOUNDS[kind] ?? TREE_BOUNDS['wild']!;
  return { model: treeModel(TREE_TILES[kind] ?? Tile.Tree, seed), wx, wy, olHalfW: b.halfW, olUp: b.up };
}

/** Paint a grown tree through the game's own painter (shared wind). */
export function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: SceneTree,
  wts: WTS,
  s: number,
  ys: number,
  tSec: number,
): void {
  const p = wts(tree.wx, tree.wy);
  paintTree(ctx, tree.model, {
    bx: p.x,
    groundY: p.y,
    s,
    syT: s * ys,
    wx: tree.wx,
    wy: tree.wy,
    tSec,
  });
}

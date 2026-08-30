import { LegSolver, type RigPose } from '../render/rig.js';
import { type TreeModel } from '../render/trees.js';
type WTS = (wx: number, wy: number) => {
    x: number;
    y: number;
};
export interface Figure {
    legs: LegSolver;
    /** Caller-owned hysteresis — persists across frames or knees pop. */
    knee: number[];
    depth: RigPose['depthMemory'];
    cloth: string;
}
export declare function makeFigure(cloth: string): Figure;
/**
 * The ground shadow the renderer would cast — drawn OUTSIDE the
 * outline pass, exactly like the game's shadow layer: the ring wraps
 * the body's silhouette, never its shadow.
 */
export declare function drawFigureShadow(ctx: CanvasRenderingContext2D, wx: number, wy: number, wts: WTS, s: number, ys: number, shadowAlpha: number): void;
/**
 * One body through the game's own biped solver, painted FLAT — the
 * caller runs it through the outline shader. Feet come back in
 * absolute world tiles (the solver plants them); we project each
 * through the caller's camera exactly like the renderer does.
 */
export declare function drawFigure(ctx: CanvasRenderingContext2D, fig: Figure, wx: number, wy: number, dir: number, moving: boolean, nowMs: number, dt: number, wts: WTS, s: number): void;
export interface SceneTree {
    model: TreeModel;
    wx: number;
    wy: number;
    /** Outline-region half-width, tiles (crown reach at full sway). */
    olHalfW: number;
    /** Outline-region height above the trunk base, tiles. */
    olUp: number;
}
export declare function makeTree(kind: string, seed: number, wx: number, wy: number): SceneTree;
/** Paint a grown tree through the game's own painter (shared wind). */
export declare function drawTree(ctx: CanvasRenderingContext2D, tree: SceneTree, wts: WTS, s: number, ys: number, tSec: number): void;
export {};
//# sourceMappingURL=figures.d.ts.map
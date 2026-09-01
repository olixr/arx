/**
 * THE SHELF'S FACE — cliff faces and side runs, their memo, and the
 * budget-honest run bakes.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import type { DrawItem } from './renderer.js';
import type { CliffRunBake, Renderer } from './renderer.js';
import type { PaintHost } from './paintHost.js';
/** Chunk revs over the padded scan window — the memo's world key. */
export declare function cliffRevKey(rend: PaintHost, game: ClientGame, b: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}): string;
export declare function collectCliffFaces(rend: PaintHost, game: ClientGame, items: DrawItem[]): void;
export declare function buildCliffMemo(rend: PaintHost, game: ClientGame, b: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}, key: string): NonNullable<Renderer['cliffMemo']>;
/**
 * One merged side run, emitted per world row with live water-fall
 * probing — the scan's old emitRun closure, verbatim. Falls stay
 * fully live: their clips and race read the world each frame.
 */
export declare function emitCliffSideRun(rend: PaintHost, game: ClientGame, items: DrawItem[], level: number, nx: number, x: number, a: number, b: number): void;
/** One contour segment extruded into a face curtain (level -> level-1). */
export declare function cliffFaceItem(rend: PaintHost, game: ClientGame, ax: number, ay: number, bx: number, by: number, nx: number, level: number, ci: number, cj: number): DrawItem;
/**
 * One straight rim run as a single DrawItem. Strat, sortY and the
 * contact shadow reproduce cliffFaceItem's own formulas exactly —
 * members of a straight run share ay === by, so min(ay, by) is ay
 * for every member and one item sorts precisely where its members
 * did. The contact quad over the whole span is the union of the
 * members' colinear quads, pixel for pixel.
 */
export declare function cliffRunItem(rend: PaintHost, game: ClientGame, level: number, faces: number[], o0: number, o1: number, rev: number): DrawItem;
/**
 * Blit the run's cached curtain; bake it through the shared sprite
 * admission lanes when missing; and when no bake stands (declined,
 * mid-glide, layer off) fall back to the members' own live paint —
 * THE STILL-WORLD BARGAIN: a bake is a cache, never a mode.
 */
export declare function drawCliffRun(rend: PaintHost, game: ClientGame, level: number, faces: number[], o0: number, o1: number, rev: number): void;
/**
 * Bake one run (THE SAME-BRUSH LAW): the ctx, camera, snap lattice
 * and viewport swap to the curtain canvas, and the members' items
 * are constructed AGAIN under the swap and draw themselves — the
 * bake is byte-for-byte the live painter's own work. Anchor pads
 * round to whole device pixels (THE ANCHOR SITS ON THE LATTICE).
 */
export declare function bakeCliffRun(rend: PaintHost, game: ClientGame, level: number, faces: number[], o0: number, o1: number, gridPx: number): CliffRunBake | null;
/**
 * Wall THICKNESS for one row-slice of a north-south rim run (world
 * x, world y s0..s1, flags marking the run's true ends). The plane
 * itself is edge-on to the orthographic camera, so we cheat a strip
 * of the wall's outward flank into view: faces terminate into it and
 * jogged rims read as one continuous mass. Slices partition the
 * run's screen extent exactly (each covers [wts(s0)-topLift,
 * wts(s1)-topLift]; the bottom slice extends to the base), so the
 * flat fill tiles seamlessly. Each slice sorts EARLY — a zero-width
 * plane must lose every overlap contest against rocks, props and
 * entities standing beside it; only the sky above them shows wall.
 * EVERY slice sorts at the RUN's north end (runTop), not its own
 * row: a per-slice sort let a southern slice beat a body standing
 * north of it and crop the blade it swung past the rim (the
 * armory-crop fix) — the strip never honestly occludes anything,
 * so the whole run loses together.
 */
export declare function cliffSideItem(rend: PaintHost, x: number, s0: number, s1: number, nx: number, level: number, runTop: number, isTop: boolean, isBottom: boolean): DrawItem;
//# sourceMappingURL=cliffArt.d.ts.map
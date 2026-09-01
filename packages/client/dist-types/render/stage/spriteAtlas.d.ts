/**
 * THE SPRITE ATLAS (painted-stage, Epic A's closer) — small sprite
 * bakes pack into shared 2048² pages so the GL lane binds a handful of
 * textures instead of thousands, and a cadence re-bake uploads a
 * dirty RECT instead of a page. The measured case (crown, 20×): 581
 * draws over 2,221 textures, 5MB/frame of texImage2D — switch- and
 * upload-bound. The atlas is the cure the plan deferred until the
 * numbers ordered it; the numbers have ordered it.
 *
 * Laws:
 * - THE GUTTER IS EDGE-REPLICATED. Two texels of breathing room per
 *   side, filled by stretching the sprite's own 1px edges (and
 *   corners) outward — linear sampling under zoom glide reads the
 *   sprite's rim, never a neighbor and never transparent black. A
 *   halo'd edge is exactly the "weird edge" the style forbids.
 * - REPAINT IN PLACE when the rebake keeps its size (the cadence
 *   case); reallocate when it grows. Every repaint pushes a dirty
 *   rect onto the page's StageTexture — the GL backend consumes rects
 *   with texSubImage2D and only falls back to a full upload when the
 *   dirt covers most of the page.
 * - THE PAGE FORGETS THE COLD. A page more than half-stale (slots
 *   untouched ~30s) is wiped whole and refills lazily — allocation
 *   stays a bump pointer, never a free-list.
 * - TOO BIG RIDES ALONE. Anything over MAX_SIDE keeps its solo
 *   texture; bands, layers and chunk bakes were never atlas material.
 */
import type { StageTexture } from './stageTypes.js';
export declare const ATLAS_PAGE = 2048;
export declare const ATLAS_MAX_SIDE = 512;
export interface AtlasSlot {
    readonly page: AtlasPage;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    rev: number;
    /** THE SHADOW IS KEYED BY THE CANVAS, TWO-AXIS (A2's hard lesson):
     *  a pooled canvas handed to a new owner repaints unconditionally. */
    owner: object;
    used: number;
}
export interface AtlasPage {
    readonly cv: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly tex: StageTexture;
    shelves: Array<{
        y: number;
        h: number;
        x: number;
    }>;
    top: number;
    slots: number;
    stale: number;
}
export interface AtlasPlacement {
    tex: StageTexture;
    ox: number;
    oy: number;
}
export declare class SpriteAtlas {
    private readonly mkCanvas;
    private readonly pages;
    private readonly slots;
    /** Live slot list per page for the sweep (WeakRef so a dead sprite
     *  canvas never pins its slot). */
    private readonly ledger;
    private revSeq;
    private frameNo;
    constructor(mkCanvas?: (w: number, h: number) => HTMLCanvasElement);
    /** Advance the atlas clock; sweep cold pages on cadence. */
    frame(): void;
    /** Place (or refresh) a sprite canvas; null = rides alone. */
    place(canvas: HTMLCanvasElement, rev: number, owner: object): AtlasPlacement | null;
    /** Paint the sprite into its cell with edge-replicated gutters and
     *  hand the backend the dirty rect. */
    private paint;
    private alloc;
    private allocIn;
    /** Forget everything on a mostly-cold page; residents re-place lazily. */
    private wipe;
    /** Confession counters. */
    stats(): {
        pages: number;
        slots: number;
    };
}
//# sourceMappingURL=spriteAtlas.d.ts.map
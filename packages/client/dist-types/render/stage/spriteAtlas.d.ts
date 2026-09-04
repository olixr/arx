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
 * - THE PAGE FORGETS THE COLD. A page whose reclaimable area (stale
 *   slots + dead cells) outweighs its live area is wiped whole and
 *   refills lazily — allocation stays a bump pointer, never a
 *   free-list. Dead cells are FIRST-CLASS: a slot abandoned by a
 *   size change (and a GC'd sprite canvas) leaves area the bump
 *   pointer can never reuse; the sweep tallies it by AREA via the
 *   ledger's slot handles, so a fragmented page reclaims instead of
 *   silently exhausting the atlas into the solo-texture regime.
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
    /** Area (px²) of cells no live canvas maps to — unreachable until a
     *  wipe. Accrued by the sweep as it compacts the ledger. */
    deadPx: number;
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
    /** Per-page slot list for the sweep (WeakRef so a dead sprite canvas
     *  never pins its slot). Each entry carries ITS slot so a GC'd or
     *  superseded (re-sized) placement still confesses its area as dead
     *  space — and the sweep compacts stale entries instead of letting
     *  the list grow one duplicate per re-size forever. */
    private readonly ledger;
    private revSeq;
    private frameNo;
    constructor(mkCanvas?: (w: number, h: number) => HTMLCanvasElement);
    /** Advance the atlas clock; sweep cold pages on cadence.
     *
     *  The sweep judges by AREA, not entry count: an entry whose canvas
     *  is gone or whose slot was superseded by a re-size is dead space
     *  (compacted out of the ledger, its area banked in page.deadPx);
     *  the rest split stale/live on the ~30s touch clock. A page is
     *  wiped when the cold outweighs the warm — stale area past live
     *  area, or a substantially-allocated page more than half
     *  reclaimable — so fragmentation can never permanently exhaust
     *  the atlas. */
    frame(): void;
    /** Place (or refresh) a sprite canvas; null = rides alone.
     *  THE USED REGION: `uw`/`uh` name the sprite's actual ink rect in
     *  device px — pooled canvases are size-class rounded (and a pool
     *  hit can be oversized), so fitness and packing judge the ink,
     *  never the backing store. Omitted = the whole canvas. */
    place(canvas: HTMLCanvasElement, rev: number, owner: object, uw?: number, uh?: number): AtlasPlacement | null;
    /** Paint the sprite into its cell with edge-replicated gutters and
     *  hand the backend the dirty rect. */
    private paint;
    private alloc;
    private allocIn;
    /** Forget everything on a mostly-cold page; residents re-place lazily. */
    private wipe;
    /** Forget every page — the plane-cross broom (consumers re-place
     *  lazily, exactly like a page wipe). */
    clear(): void;
    /** Confession counters. */
    stats(): {
        pages: number;
        slots: number;
        deadPx: number;
    };
}
//# sourceMappingURL=spriteAtlas.d.ts.map
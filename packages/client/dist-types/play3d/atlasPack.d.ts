/**
 * THE SHELF (play3d S1) — a pure shelf packer for sprite atlas pages.
 *
 * Sprites arrive in whatever order the world streams them, so the
 * packer is ONLINE: it never reorders, never rejects a page-fitting
 * rect for the sake of a tighter layout, and never moves a placed rect
 * (its UVs are already baked into instance buffers). Shelves are rows;
 * a rect opens a new shelf when the current one cannot take it. The
 * waste is bounded and the law is simple — the right trade for art
 * that is painted once and uploaded once.
 */
export interface PackedRect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export declare class ShelfPacker {
    readonly width: number;
    readonly height: number;
    /** Transparent margin kept around every rect (bilinear bleed guard). */
    readonly pad: number;
    private shelfY;
    private shelfH;
    private cursorX;
    /** Pixels placed (for the fill-rate confession in the HUD). */
    used: number;
    constructor(width: number, height: number, 
    /** Transparent margin kept around every rect (bilinear bleed guard). */
    pad?: number);
    /** Place a w×h rect; null when the page cannot take it. */
    insert(w: number, h: number): PackedRect | null;
    /** Fraction of the page area consumed by placed rects (incl. pads). */
    get fill(): number;
}
//# sourceMappingURL=atlasPack.d.ts.map
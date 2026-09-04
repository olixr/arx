/** A world row's projection captured as an affine x-map + a constant y. */
export interface RowProj {
    /** Screen-y of every tile in this world row (constant along the row). */
    y: number;
    /** Screen-x at wx=0. */
    xa: number;
    /** Screen-x per unit wx (the row's affine slope). */
    xb: number;
}
/**
 * Capture the projection of world row `wy` into `out` (alloc-free). After
 * this, `rowProjectX(out, wx)` gives the exact `projectWorld(...).x` for any
 * `wx` on the row, and `out.y` is its `projectWorld(...).y`.
 */
export declare function rowProject(scale: number, yScale: number, camX: number, camY: number, q: number, snapDpr: number, wy: number, w: number, h: number, out: RowProj): RowProj;
/** Screen-x of world column `wx` on a captured row — one multiply-add. */
export declare function rowProjectX(rp: RowProj, wx: number): number;
//# sourceMappingURL=rowProject.d.ts.map
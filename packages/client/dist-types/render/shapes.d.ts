/**
 * The Arx shape language: sharp-angle brutalism. Forms are blocks
 * with 45° chamfered corners and low-poly facets — never soft pills.
 * Every painter builds from these two primitives so the whole world
 * speaks one dialect.
 */
/**
 * Adds a chamfered-rectangle subpath: a block with its corners cut at
 * 45°. Per-corner sizes follow CSS order [tl, tr, br, bl]; pass a
 * single number for a uniform cut.
 */
export declare function chamferRect(ctx: CanvasRenderingContext2D | Path2D, x: number, y: number, w: number, h: number, cut: number | [number, number, number, number]): void;
/**
 * Adds a faceted "circle" subpath: a regular polygon standing in for a
 * disc. `squashY` flattens it into a ground ellipse; `rot` picks which
 * facet faces up so repeated shapes don't tile visibly.
 */
export declare function facetCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides?: number, rot?: number, squashY?: number): void;
/**
 * Adds a jittered low-poly blob subpath — the rock/canopy silhouette.
 * `seed` deterministically varies the radii so no two blobs match.
 */
export declare function facetBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, sides?: number, squashY?: number, rot?: number): void;
export declare function unitBlob(seed: number, sides: number): Path2D;
/**
 * Shared scratch matrix for unitBlob stamps: addPath consumes the dict
 * synchronously, so one mutable object serves every stamp with no GC.
 */
export declare const BLOB_M: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
};
//# sourceMappingURL=shapes.d.ts.map
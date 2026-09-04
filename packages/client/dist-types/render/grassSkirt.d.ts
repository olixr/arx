/** A grass tile the meadow coat grows on (short coat or tall thicket). */
export declare function isGrassTile(t: number | undefined): boolean;
/**
 * Is this object KIND one that should nestle into the meadow? Trees,
 * saplings, rocks, stumps, and the wild bushes/plants are the natural
 * wilds; other free-standing props on grass qualify too (a lamp post or
 * cairn embedded in the field reads better than one stickered on it). A
 * CROP is excluded — a planted row is deliberately tilled earth, not wild
 * meadow, so wild grass climbing it would read as a weed problem.
 */
export declare function isSkirtEligibleTile(tile: number): boolean;
/** Convenience membership for the clearly-natural wilds (used by tests and
 *  callers that want to restrict the skirt to trees/rocks/bushes only). */
export declare function isNaturalWild(tile: number): boolean;
/** Minimum grassy orthogonal neighbours to count an object as meadow-rooted.
 *  Two of four keeps a field-edge tree (grass on the meadow side, path on
 *  the other) skirted while excluding a lone object in mostly-stone ground. */
export declare const SKIRT_MIN_GRASS_NEIGHBORS = 2;
/**
 * True when a skirt-eligible object at (tx,ty) stands in the meadow: at
 * least SKIRT_MIN_GRASS_NEIGHBORS of its four orthogonal neighbours are
 * grass tiles. `sample` returns the ground tile id (undefined off-map).
 */
export declare function grassRootedSkirtAt(sample: (tx: number, ty: number) => number | undefined, tx: number, ty: number, tile: number): boolean;
//# sourceMappingURL=grassSkirt.d.ts.map
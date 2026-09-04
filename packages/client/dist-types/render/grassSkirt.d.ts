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
/**
 * SIDE BITS for a skirt's grass-adjacent edges (used to bias a wall/building
 * skirt onto only its grass-facing feet). N/S/W/E are the four orthogonal
 * neighbours; a full ring (0b1111) means "scatter freely all round" — the
 * look natural wilds (trees/rocks) always want, since they replace their own
 * tile and are ringed by meadow.
 */
export declare const SIDE_N = 1;
export declare const SIDE_S = 2;
export declare const SIDE_W = 4;
export declare const SIDE_E = 8;
export declare const SIDE_ALL: number;
/**
 * THE OVER-FOOT SKIRT, TUNED BY HEIGHT. Not every object should wear the same
 * grass collar: a TALL tree can carry a full base skirt that climbs the bark,
 * but a LOW rock is buried and obscured by the same tuft — the owner's note
 * ("the skirts are covering up the rocks and looking weird"). So the skirt's
 * strength is scaled per object kind, standing in for its height:
 *
 *   - rocks & spent formations → 0.22: a bare few short wisps at the very
 *     base, never a collar that swallows the stone.
 *   - buildings / wall feet    → 0.5 : a subtle, low nestle where a wall's
 *     foot meets grass, softening the ground contact without climbing the
 *     face or masking a doorway (also drawn edge-biased, grass-side only).
 *   - trees / saplings / bushes / wild plants → 1.0: the full embedded look
 *     G4 shipped — a lush tuft with a few climbers up the trunk.
 *   - any other free-standing prop on grass → 0.7: a modest nestle.
 *
 * 0 means "no skirt at all". Strength scales blade count, height, radius and
 * whether climbers appear (see generateSkirtBlades).
 */
export declare function skirtStrengthForTile(tile: number): number;
/**
 * The grass-adjacent side bitmask for an object at (tx,ty): which of its four
 * orthogonal neighbours are grass. Buildings/walls use this to skirt ONLY the
 * feet that meet meadow (never the stone/path/interior sides).
 */
export declare function grassSidesMask(sample: (tx: number, ty: number) => number | undefined, tx: number, ty: number): number;
/**
 * A wall/building foot gets a skirt when at least ONE of its orthogonal
 * neighbours is grass — a single grass-facing edge is enough for the foot to
 * nestle into the meadow (unlike a free-standing object, which wants a
 * meadow ring). Returns the grass-side mask (0 = no grass-adjacent edge, so
 * no skirt: a wall in a courtyard or between other walls gets nothing).
 */
export declare function wallSkirtSidesAt(sample: (tx: number, ty: number) => number | undefined, tx: number, ty: number, tile: number): number;
//# sourceMappingURL=grassSkirt.d.ts.map
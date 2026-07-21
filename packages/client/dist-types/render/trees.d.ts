/**
 * The tree grower — DevCraft's forests, grown not authored.
 *
 * Every tree on the map is GROWN from a species grammar + the tile's
 * hash: a deterministic skeleton (trunk spine, short boughs) under a
 * DOME CANOPY — packed tiers of heavily-overlapping low-poly
 * clusters that read as ONE solid mass. The same tile always grows
 * the same tree, on every client, with no stored geometry.
 *
 * Species are GRAMMARS, not sprites: each defines growth ranges
 * (height, trunk width, crown dome shape, bough habit) plus three
 * bespoke structural VARIANTS, so a stand reads as siblings, never
 * clones. Adding a tree type = one new species entry.
 *
 * THE CANOPY LAWS (learned from the lanky first draft):
 * - Trees stand UPRIGHT. Bow and gnarl are seasoning, never posture;
 *   only the windswept species leans, and moderately.
 * - The crown is a MASS, not scattered balls: tiers of clusters
 *   spaced ~one radius apart so silhouettes fuse, dome-profiled
 *   (full at the shoulders, tapering to a cap). Nothing floats.
 * - Light is BANDED: dark underside tier -> mid body -> lit crown,
 *   painted as batched tone masses (one Path2D fill per tone per
 *   tree). That is what makes it read as one solid sculpted volume —
 *   and it is also ~5 fills per canopy instead of ~30.
 * - Branches never show their seams: boughs are short, fill-only
 *   (no edge strokes), painted BEFORE the trunk so the trunk body
 *   covers every join, and their tips end INSIDE the canopy.
 *
 * Scale law: the player reads ~1.2 tiles tall. Commons stand 3-4x
 * that, oaks and yews 4-5x. Trunk base half-widths are the physical
 * truth: `tileColliderRadius` in shared tiles.ts must stay a whisker
 * wider than the fattest variant's flared base (test-pinned via
 * maxTrunkBaseRadius; fillLimb's 0.4 flare factor is load-bearing).
 *
 * Wind: the whole tree bends as a cantilever on the ONE shared wind
 * field (grass.ts windScalarAt). Every cluster re-samples the field
 * at ITS OWN world offset with a height lag, so segments of one
 * crown rustle independently while neighbouring trees stay coherent.
 * All phase comes from world position — never per-tree randomness.
 *
 * Model space: tiles, origin at the trunk base, +x screen-right,
 * +y UP. Verticals paint at full tile scale (projection law).
 */
import { Tile } from '@devcraft/shared';
export interface TreeBranch {
    /** Polyline base→tip, model tiles (y up from the ground). */
    pts: Array<[number, number]>;
    /** Half-widths at base and tip, tiles. */
    w0: number;
    w1: number;
    /** Root-flare boost over the first fifth of the run. */
    flare: number;
    /** Cluster index whose rustle drags this branch's tip, or -1. */
    tip: number;
    /** 0 = trunk/fork arm (edges + painted last), 1 = bough (fill-only). */
    level: number;
}
export interface TreeCluster {
    x: number;
    y: number;
    r: number;
    /** Height fraction 0..1 — drives the cantilever displacement. */
    hf: number;
    seed: number;
    /** Light band: 0 = shaded underside, 1 = body, 2 = lit crown. */
    tone: number;
    /** Carries a bright top facet in the lit pass. */
    lit: boolean;
    /** Interior filler — young trees haven't grown these yet. */
    extra: boolean;
    /** Hangs curtain strands below itself (willow). */
    droop: boolean;
}
export interface TreeModel {
    species: number;
    variant: number;
    /** Ground → crown top, tiles. */
    height: number;
    /** Max |x| + r across the crown — shadow and culling. */
    spread: number;
    bark: string;
    barkLit: string;
    barkDark: string;
    /** Light-band palette, dark → mid → lit. */
    leaves: [string, string, string];
    sides: number;
    /** Curtain strands per drooping cluster (willow), 0 = none. */
    strands: number;
    branches: TreeBranch[];
    clusters: TreeCluster[];
}
export declare function speciesOf(tile: Tile, h: number): number;
/**
 * The widest flared trunk base any variant can grow, per tree tile —
 * tested against `tileColliderRadius` so physics never drifts from
 * the art. Flare widens the very base by up to (1 + flare * 0.4).
 */
export declare function maxTrunkBaseRadius(tile: Tile): number;
/** Grow (or recall) the tree standing on a tile with world-hash `h`. */
export declare function treeModel(tile: Tile, h: number): TreeModel;
export interface TreeFrame {
    bx: number;
    groundY: number;
    s: number;
    syT: number;
    wx: number;
    wy: number;
    tSec: number;
    /** Felling override: replaces the sampled wind bend. */
    windOverride?: number;
    /** 0..1 growth: saplings ~0.45, grow-in eases to 1. Default 1. */
    grow?: number;
}
/**
 * Paint a grown tree. Returns the sampled wind value so the caller
 * can gate ambient leaf-shed on gust strength.
 */
export declare function paintTree(ctx: CanvasRenderingContext2D, m: TreeModel, f: TreeFrame): number;
//# sourceMappingURL=trees.d.ts.map
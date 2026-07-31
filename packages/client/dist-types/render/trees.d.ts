/**
 * The tree grower — Arx's forests, grown not authored.
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
 * THE WILLOW REBUILT (the weeping species' own law — supersedes
 * every skirt-on-a-crown draft):
 * - The willow has its OWN anatomy, not a shrunken dome with
 *   dressing: trunk → arching LIMBS → fronds pouring off the arcs.
 *   Four or five real wooden limbs rise from the upper trunk, arc
 *   outward and droop at the ends; every streamer is anchored at an
 *   actual point ALONG a limb, so the cascade hangs from the wood
 *   that carries it.
 * - The crown is a BROKEN crown: an apex knot on the trunk top plus
 *   small tufts riding each limb — never one fused dome. Tufts bury
 *   every streamer anchor and every limb tip (seam law, both ways).
 * - Hem law: anchors nearer the center hang longest, tips are
 *   STAGGERED chisel points, and daylight opens between the outer
 *   hems. A willow you cannot see through at the fringe is a blob
 *   wearing a skirt. The bole shows only LOW through the front
 *   parting — never a bare pole up the tree.
 * - Depth is layered back to front, one batched fill per tone: the
 *   rear limbs' dark streamers paint BEHIND the trunk, mid
 *   streamers over it, the sun-side limb carries the lit fronds,
 *   bright escaped withies fly off the limb tips last.
 * - EVERY section moves on the ONE wind field, independently: tufts
 *   rustle per-cluster, limbs flex with their tuft (anchoring law),
 *   and each streamer pendulums at its own lag AND carries a
 *   traveling ripple down its length (dropF phase) — cloth waving
 *   from the arc, not a rigid flag. Strand part-lines (one batched
 *   stroke) keep same-tone fronds reading combed, never a slab.
 *
 * THE PINE (the cold-country species' own law):
 * - A pine is TIERS, not a dome: downswept chevron plates stacked up
 *   a straight spire trunk, each hem cut into serrated teeth, bare
 *   bole and daylight under the lowest tier, a pointed spire cap.
 *   The silhouette is the species — nothing round anywhere.
 * - Light is banded by tier (dark low band, mid above) and every
 *   plate wears a WEST-LIT facet — the one sun, sculpting the cone.
 *   Tier separation is a single batched hem stroke (the shingle
 *   line), never per-plate strokes.
 * - Plates are near-rigid: the trunk cantilever carries them, the
 *   hem teeth flutter barely at all (drop weights ~0.2). Ridge
 *   tufts and the spire tuft add the soft mass over the crisp
 *   plates; dead whorl stubs stand on the bare bole.
 * - Tone indices are per-species SEMANTICS, not colors: the pine
 *   paints lower band / upper band / lit facets in its own order,
 *   all still one batched fill per tone.
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
import { Tile } from '@arx/shared';
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
}
/**
 * One curtain of weeping foliage (the willow's skirt). The polygon
 * is final model-space geometry — faceted flanks and a chisel-cut
 * fringe — plus a per-vertex swing weight so the paint pass can hang
 * it like cloth off the wind field.
 */
export interface TreeCurtain {
    /** Polygon in model tiles (y up), fringe cut into the hem. */
    pts: Array<[number, number]>;
    /** Per-vertex swing weight: 0 anchored top → ~1 free hem. */
    drop: number[];
    /** Raw drop FRACTION per vertex (0 anchor → 1 hem) — the phase
     *  rail the traveling ripple runs down. */
    dropF: number[];
    /** Vertex index range [from, to] to lay into the batched part
     *  stroke — the willow's comb lines. */
    part?: [number, number];
    /** Carries no mass for the shadow projection (hem-shadow ribbons,
     *  facet overlays) — the shadow pass walks every curtain of every
     *  tree every frame, so decorative geometry must opt out. */
    noShadow?: boolean;
    /** Simplified outline for the shadow projection (a sheared-flat
     *  shadow can't show hem teeth — a dense stand shouldn't pay to
     *  project them). Falls back to `pts`. */
    shadowHull?: Array<[number, number]>;
    /** 0 = deep backdrop (paints BEHIND the trunk), 1 = mid fall,
     *  2 = lit fall, 3 = bright withy streak. */
    tone: number;
    /** Anchor height fraction — rides the crown cantilever. */
    hf: number;
    seed: number;
    /** Anchor x — wind-sampling offset (world phase, never screen). */
    x0: number;
    /** Anchor→hem drop, tiles — scales the swing throw. */
    len: number;
}
export interface TreeModel {
    species: number;
    variant: number;
    /**
     * THE RIGID SWAY: a stiff species (the pine) whose only real
     * motion is the trunk cantilever. The renderer bakes it ONCE in a
     * neutral pose and sways the cached sprite with a ground-pivot
     * SHEAR each frame — full-framerate wind at zero re-bake cost,
     * where cadence re-baking a dense taiga cost whole frames.
     */
    rigid?: boolean;
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
    branches: TreeBranch[];
    clusters: TreeCluster[];
    /** The weeping skirt — empty for every species but the willow. */
    curtains: TreeCurtain[];
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
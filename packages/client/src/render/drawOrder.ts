/**
 * THE ONE RENDER — the single world painter's-order comparator.
 *
 * A VALID TOTAL ORDER. The prior key had a front-base EXCEPTION that
 * switched the compare term per pair (a ground volume in front of a
 * raised base compared by near-row, everything else by shelf). That
 * made the comparator INTRANSITIVE: `cmp(a,b)`, `cmp(b,c)` and
 * `cmp(a,c)` could disagree, so V8's sort produced order that depended
 * on the incidental input order — the z-flicker and the trees stacking
 * wrong as the camera panned. This module replaces it with a strict
 * lexicographic key over totally-ordered numeric terms — no pair-
 * dependent term, no epsilons — so the sort is deterministic and
 * flicker-free.
 *
 * THE KEY (ascending):
 *
 *   (layer, screenFootY, classRank, stableId)
 *
 *   1. `layer` — the coarse painter's BAND (see Layer). PRIMARY: ground
 *      draws under decals, decals under world objects, world objects
 *      under overhead FX, overhead under UI. Only ONE band interleaves
 *      by depth (WORLD): trees, walls, hedges, buildings, rocks, props,
 *      entities, tall grass. Default WORLD when unset.
 *
 *   2. `screenFootY` — the SCREEN-Y of the item's ground-contact point,
 *      elevation folded IN (`worldToScreen(foot).y − elevationLift`).
 *      This ONE term replaces the old (SHELF, sortY, nearRow) triple and
 *      the front-base exception: a raised item's contact point is lifted
 *      up-screen (smaller screenFootY ⇒ drawn earlier/behind), a ground
 *      hedge planted in front of a raised base is lower on screen
 *      (larger screenFootY ⇒ drawn later/in front) — the correct
 *      occlusion falls straight out of the screen row, no exception.
 *      Derived centrally by `stampDrawKeys` from the fields an item
 *      already carries. THE ALGEBRAIC COLLAPSE: on flat ground every
 *      item's strat is 0, so screenFootY = depthRow·(scale·yScale) + oy
 *      is a strictly-monotone affine image of the world row — the WORLD
 *      band's order is byte-identical to the old raw-row (sortY) order
 *      (the golden gate).
 *
 *   3. `classRank` — volume(0) before billboard(1) at an EXACT
 *      screenFootY tie. A world-geometry VOLUME (wall/hedge/building run
 *      — it carries `nearRow`) draws BEFORE a billboard at the same
 *      contact row, so a body whose foot lands on a wall's near edge
 *      draws IN FRONT of it (billboards paint no pixels below their feet,
 *      so a body at a wall's base must win).
 *
 *   4. `stableId` — the final, CAMERA-INVARIANT tiebreak for an exact
 *      (layer, screenFootY, classRank) tie, so a tie resolves the same
 *      way every frame regardless of collect order. Falls back to `seq`
 *      (the per-frame collect index) when an item carries no stable id;
 *      `seq` is deterministic within a frame and, because collectors run
 *      in a fixed spatial/roster scan, the RELATIVE order of two
 *      co-visible items is stable frame-to-frame in practice. Whatever
 *      the mix, each item reduces to ONE number, so the order is total.
 */

/** THE PAINTER'S BANDS. Ascending = drawn first (behind) → last (front). */
export enum Layer {
  /** Elevated ground surfaces (raised terrace rows, sunken pit floors).
   *  Base ground is drawn in a pre-pass and is not in the sorted list. */
  Ground = 0,
  /** Ground-hugging marks: raised grass coats, ground glows/halos, and
   *  the ground-mark particle layer. (Footprints, blood/decals, contact
   *  shadows and ground combat-FX draw in the ground pre-pass, not here.) */
  GroundDecal = 1,
  /** THE ONE INTERLEAVING BAND: trees, walls, hedges, buildings, rocks,
   *  props, entities, tall grass, world-anchored matter. The default. */
  World = 2,
  /** Airborne / overhead FX that ride over the world. (Most draw in
   *  dedicated passes after the sort; this band is for any that sort.) */
  Overhead = 3,
  /** Screen-space UI. (Not currently emitted into the sorted list.) */
  Ui = 4,
}

/** The minimal shape the comparator reads — the stamped total-order key.
 *  The real DrawItem carries these fields, so it passes through unchanged. */
export interface DrawOrderItem {
  /** PRIMARY band (see Layer). Default World when unset. */
  layer?: Layer;
  /** SCREEN-Y of the ground-contact point, elevation folded in. Stamped
   *  by `stampDrawKeys`; absent ⇒ 0. */
  screenFootY?: number;
  /** volume(0) before billboard(1) at an exact screenFootY tie. Stamped
   *  by `stampDrawKeys` from `nearRow` presence; absent ⇒ 1 (billboard). */
  classRank?: number;
  /** Camera-invariant final tiebreak. Absent ⇒ `seq`. A future emitter
   *  MAY stamp a world-anchored id here for a class prone to exact
   *  screenFootY ties — but ONLY where every item in the potential tie
   *  group carries one, so a group never mixes a world id with a `seq`. */
  stableId?: number;
  /** Per-frame collect index — the fallback final tiebreak. */
  seq?: number;
}

export const DRAW_ORDER = (a: DrawOrderItem, b: DrawOrderItem): number => {
  const la = a.layer ?? Layer.World;
  const lb = b.layer ?? Layer.World;
  if (la !== lb) return la - lb;
  const ay = a.screenFootY ?? 0;
  const by = b.screenFootY ?? 0;
  if (ay !== by) return ay < by ? -1 : 1;
  const ar = a.classRank ?? 1;
  const br = b.classRank ?? 1;
  if (ar !== br) return ar - br;
  const ai = a.stableId ?? a.seq ?? 0;
  const bi = b.stableId ?? b.seq ?? 0;
  return ai < bi ? -1 : ai > bi ? 1 : 0;
};

/** The fields `stampDrawKeys` reads to derive the key, plus the key
 *  fields it writes. A structural subset of DrawItem. */
export interface DrawKeyItem extends DrawOrderItem {
  /** A billboard's foot row / a baked layer's row (the raw world row). */
  sortY: number;
  /** The elevation shelf the item stands on (0 / undefined ⇒ ground). */
  strat?: number;
  /** A world-geometry VOLUME's near (south) ground-edge row — the foot
   *  used for its depth; absent ⇒ billboard (depth = sortY). */
  nearRow?: number;
}

/**
 * THE CENTRAL DERIVATION. Stamp every item's total-order key from the
 * fields it already carries, then the caller sorts by DRAW_ORDER. Runs
 * once per frame over the whole draw list.
 *
 *   `sYS`   = camera.scale · camera.yScale  (world-row → screen-y slope)
 *   `oy`    = camera.originY(h)             (screen-y of world row 0)
 *   `elevPx`= ELEV_H · camera.scale         (screen lift per elevation level)
 *
 * screenFootY = depthRow·sYS + oy − strat·elevPx, where depthRow is the
 * volume's near edge (nearRow) or the billboard's foot (sortY). `oy` is a
 * per-frame constant so it does not affect ordering — it is included so
 * screenFootY is an honest screen coordinate.
 */
export function stampDrawKeys(
  items: DrawKeyItem[],
  sYS: number,
  oy: number,
  elevPx: number,
): void {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    it.seq = i;
    if (it.layer === undefined) it.layer = Layer.World;
    const depthRow = it.nearRow ?? it.sortY;
    it.screenFootY = depthRow * sYS + oy - (it.strat ?? 0) * elevPx;
    it.classRank = it.nearRow !== undefined ? 0 : 1;
  }
}

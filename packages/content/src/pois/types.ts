/**
 * THE POI GRAMMAR — what a point of interest IS, as data.
 *
 * A PoiDef is the system-of-systems recipe: a pool of hand-authored
 * prefabs (the curated footprint), a garrison recipe scaled by the
 * danger tier, and a strongbox law. The scaffold picks WHERE and
 * WHICH; the def says what stands there. Code never draws a tent —
 * new variety ships as prefabs and defs, not painters.
 *
 * Phase 1 keeps these as TS consts (the bestiary precedent); phase 2
 * moves them under the content-docs two-hash law and gives them a
 * Content Studio bench.
 */

export interface PoiGarrisonEntry {
  /** Bestiary id. */
  npc: string;
  /** Bodies rolled in [min, max] — the site hash picks, tier biases up. */
  count: readonly [number, number];
  /**
   * holdfast = lives inside the footprint; sentry = posted on the
   * approach ring OUTSIDE it, on high ground and the townward bearing —
   * the semantic layer that lets a player read the camp before walking
   * into it.
   */
  role: 'holdfast' | 'sentry';
  /** Entry only musters at this danger tier and above. */
  minTier?: number;
  /** Levels above the tier band's roll — champions ride this. */
  levelOffset?: number;
  /** Display-name override (named champions). */
  name?: string;
}

export interface PoiDef {
  id: string;
  name: string;
  /** Danger tiers this archetype can roll at, inclusive. */
  tiers: readonly [number, number];
  /** Pick weight among archetypes eligible at a tier. */
  weight: number;
  /** Prefab pool (data/prefabs ids) — the site hash picks one. */
  prefabs: readonly string[];
  garrison: readonly PoiGarrisonEntry[];
  /**
   * Chest-upgrade law: any closed chest tile in the stamped prefab is
   * re-keyed to dangerLaw(tier + chestTierBonus).chest. Absent = the
   * prefab's authored chest stands as drawn.
   */
  chestTierBonus?: number;
}

/**
 * THE FINDS GRAMMAR — the third placement layer (docs/lived-in-land-plan.md
 * Phase 2). A MinorDef is texture, not landmark: a hunter's cold fire,
 * a snare line, a den mouth, a leaning cairn — the small discoveries
 * that make the walk BETWEEN sites pay. Several stand per cell on a
 * sub-lattice, and by law they carry none of a site's weight:
 *
 * - no havens, no boldness, no satellites, no clearedFlag, no actors;
 * - no chart markers and no discovery ceremony (THE QUIET CHART LAW —
 *   the player's map stays a map of landmarks);
 * - at most a whisper of a garrison (THE TEXTURE-IS-NOT-TREASURE LAW:
 *   three bodies, ever) and at most one humble cache;
 * - `habitat` is the one thread outward: wild knots of the matching
 *   kind prefer to stand near it (THE DEN IS THE SOURCE), and clearing
 *   the find quiets that pull.
 */

export interface MinorGarrisonEntry {
  /** Bestiary id. */
  npc: string;
  /** Bodies rolled in [min, max] — the slot hash picks. */
  count: readonly [number, number];
  /** Entry only musters at this danger tier and above. */
  minTier?: number;
  /** Levels above the tier band's roll. */
  levelOffset?: number;
  /** Activity window in game hours [0, 24), from > to wraps midnight. */
  hours?: { from: number; to: number };
}

export interface MinorDef {
  /** 'find_*' — the prefix is law (shelves, sweeps, and greps rely on it). */
  id: string;
  name: string;
  /** One-line story for the bench — what this small thing IS. */
  description?: string;
  /** Danger tiers this find can deal at, inclusive (slot's own tier). */
  tiers: readonly [number, number];
  /** Pick weight among finds eligible at a slot's tier. */
  weight: number;
  /** Prefab pool (data/prefabs ids, small footprints) — the slot hash picks one. */
  prefabs: readonly string[];
  /**
   * The whisper of a garrison — scavengers on the bones, the wolf at
   * the den mouth. Total possible bodies across all entries is capped
   * at 3 by the validator; wipe them all and the find is cleared for
   * the cell's whole epoch (the ledger bit), which also quiets its
   * habitat pull.
   */
  garrison?: readonly MinorGarrisonEntry[];
  /**
   * THE DEN IS THE SOURCE: the habitat slug WildEntry.habitat answers
   * to ('den', 'warren', 'glade', 'barrow'). While this find stands
   * uncleared, wild knots of the matching kind prefer to muster near
   * it.
   */
  habitat?: string;
  /**
   * The humble cache: any closed chest tile in the stamped prefab
   * SURVIVES with this probability (else it composes away to grass) —
   * and when it survives it re-keys ONE TIER HUMBLE
   * (dangerLaw(tier - 1).chest, floor tier 1). Texture is not
   * treasure: the chance is capped at 0.35 and the kind never reaches
   * the tier's own law. No loot-table overrides, no wards — the chest
   * kind's own table and the standing danger wages do the paying.
   */
  cache?: { chance: number };
  /**
   * Felled-clearing radius 0..2 (tiles past the footprint edge) —
   * the one approach cue small enough for a find. Forest inside it
   * cuts to stumps and trampled grass.
   */
  clearing?: number;
}

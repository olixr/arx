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
  /**
   * THE WILD CROWN (docs/boss-system-plan.md): forge this row's
   * champion into a boss variant. The composer stamps a site-hashed
   * seed, so the crown is stable per camp and different across camps.
   * Only meaningful on a row whose npc a crown pool claims; an
   * unforgeable base simply stands unforged.
   */
  crowned?: boolean;
  /**
   * Sentries only: instead of holding a post, the body walks the
   * perimeter — the composer lays a waypoint loop around the footprint
   * and the idle brain paces it (combat and chase own the body; the
   * patrol resumes when they let go).
   */
  patrol?: boolean;
  /**
   * Activity window in game hours [0, 24), from > to wrapping
   * midnight: the entry musters only inside it — skeletons that walk
   * after dusk, hounds that hunt at night. Absent = round the clock.
   */
  hours?: { from: number; to: number };
  /**
   * Champion name pool: the site hash picks ONE display name from it
   * (stable per site, forever — the champion of that hill has always
   * been Korga Hillbreaker). Wins over `name`. Meant for count [1,1]
   * entries — a pool names one body per site, not a platoon.
   */
  names?: readonly string[];
  /**
   * THE WILD TAKES SIDES: per-def tribe override for every body this
   * row musters — rides the composed ZoneSpawn (maps/types.ts) so a
   * whole camp family can wear a sub-faction banner and feud through
   * the stances matrix. Absent = the bestiary's own tribe.
   */
  tribe?: string;
}

/**
 * Friendly staff placed at compose time — the waystation vocabulary.
 * Identity stays in NpcActorDef (the actor/archetype/placement split);
 * this is pure placement: WHO (hash-picked from a pool, so two
 * waystations keep different traders) and WHERE (semantic posts, not
 * coordinates — the composer knows the site's shape and the townward
 * bearing, the def only states intent).
 */
export interface PoiActorEntry {
  /** Actor slugs — the site hash picks ONE identity per entry. */
  pool: readonly string[];
  /**
   * hearth = beside the anchor (the fire, the stall — the heart of
   * the site); watch = posted on the approach ring facing the
   * townward road, the way players come.
   */
  post: 'hearth' | 'watch';
  /** RoutineDef id bound at the placement (post-is-the-origin law). */
  routine?: string;
}

/**
 * The warning vocabulary — approach cues stamped OUTSIDE the prefab at
 * compose time, so a player reads the site before they're in it. All
 * cues land in the composed zone's transparent fringe and only ever
 * replace natural ground (trees/grass), never rock, water, or another
 * zone's work.
 */
export interface PoiCues {
  /**
   * Felled-clearing radius (tiles past the footprint edge): forest
   * inside it is cut to stumps and trampled grass — a camp burns wood,
   * and the wood came from somewhere.
   */
  clearing?: number;
  /**
   * Wear a dirt path stub from the footprint edge outward on the
   * townward bearing — the direction players arrive from.
   */
  approachPath?: boolean;
  /**
   * Cue tiles scattered on the approach bearings (bone piles before a
   * ruin, a banner before a warcamp). Tile is a Tile enum NAME so the
   * JSON reads as content, not magic numbers.
   */
  scatter?: ReadonlyArray<{ tile: string; count: number }>;
}

/**
 * One rung of the boldness ladder (the living frontier, phase 2) — what
 * a site ADDS when it has stood discovered and unanswered long enough
 * to grow bolder. Rungs are cumulative: a stage-2 site musters the base
 * garrison plus rungs 1 and 2. THE FREQUENCY LAW: boldness adds bodies,
 * patrols, and dressing — never levels past the def's own ceiling (the
 * validator holds it); an emboldened camp is BUSIER, not silently
 * deadlier at the same map dot.
 */
export interface PoiBoldnessStage {
  /** Extra muster — same grammar as the base garrison. */
  garrison?: readonly PoiGarrisonEntry[];
  /** Extra approach dressing (more banners, more bones — the camp reads bolder). */
  scatter?: ReadonlyArray<{ tile: string; count: number }>;
}

export interface PoiBoldness {
  /** Rungs 1..3, in order; stage N applies stages[0..N-1]. */
  stages: readonly PoiBoldnessStage[];
  /**
   * At stage 2+ the core may seed satellite camps of the same
   * archetype in adjacent cells, biased townward — the pressure
   * visibly creeps. Breaking the CORE scatters the whole family
   * (source-and-kill-switch).
   */
  satellites?: boolean;
  /**
   * The archetype the satellites stand as, when it isn't this def
   * itself — a WAR-HOLD (Phase 4 compound) seeds ordinary warcamps
   * townward, never sibling holds (the region law would refuse them
   * anyway; the hold is the heart, the camps are its reach). Absent =
   * same-archetype satellites, exactly as before.
   */
  satelliteDef?: string;
}

/**
 * THE WAR-GROUND (lived-in-land Phase 4): a compound hold — the def's
 * own prefab pool is the COURT (the heart: the named chief, the warded
 * cache, the last stand), and wings muster around it on ring bearings,
 * each with its own garrison chapter. A failed wing footprint is
 * SKIPPED, never forced — the land decides how big the hold got to be.
 * Compound defs never roll on the ordinary KIND stream: they arrive by
 * PROMOTION (DANGER_LAWS.holdChance at tier 3+) under the region law —
 * one hold per neighborhood, the landmark the region steers by.
 */
export interface PoiCompound {
  /** Wing prefab pool + how many wings muster [min, max] (site hash). */
  wings: { pool: readonly string[]; count: readonly [number, number] };
  /**
   * Garrison stamped PER WING at the wing's heart — the pull-able
   * chapter. Wing spawns carry ZoneSpawn.wing so a falling wing reads
   * as its own beat before the court's last stand.
   */
  wingGarrison: readonly PoiGarrisonEntry[];
}

export interface PoiDef {
  id: string;
  name: string;
  /** One-line story for the bench — what this place IS. */
  description?: string;
  /**
   * THE TERRITORY FIELD (lived-in-land Phase 5): the family this
   * archetype belongs to ('goblin', 'wolfkin', 'dead', …). Inside the
   * family's own country the KIND pick multiplies this def's weight
   * by FRONTIER.territoryBias — a lean, never a cage. Absent = the
   * def belongs to no country and rolls evenly everywhere (friendly
   * and neutral sites usually should).
   */
  family?: string;
  /**
   * THE SHORE CAMP (skral epic): true = this archetype only stands on
   * a bank — every candidate anchor must pass shoreProbeAt (open
   * water within a stone's throw), and a cell whose ground shows no
   * water never offers the def in its kind pool. The POI cousin of
   * the wilds' 'shore' refinement, honoring the same elevation truth,
   * so a fishing camp can never roll in a dry meadow.
   */
  shore?: boolean;
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
  /** Approach cues stamped around the footprint at compose time. */
  cues?: PoiCues;
  /**
   * The boldness ladder — how this archetype grows when discovered and
   * left unanswered (absent = the site never escalates). Only hostile
   * defs with a garrison may carry it.
   */
  boldness?: PoiBoldness;
  /**
   * Friendly staff — placed semantically at compose time (hearth
   * cluster, townward watch posts). A def with actors is a civilized
   * site; its bodies come from the actor registry with all its laws
   * (disposition, protection, dialogue bindings, shops) intact.
   */
  actors?: readonly PoiActorEntry[];
  /**
   * A materialized site with a haven becomes a runtime danger anchor
   * (DangerAnchor.haven — the lamp, not the hearth): tier 0 inside
   * safeR, graded relief on the rim, no reach beyond it. Civilization
   * genuinely pushes the danger back, and the field stays the single
   * source of truth.
   */
  haven?: { safeR: number };
  /**
   * Loot-table override for the site's strongboxes — the dungeon-mouth
   * key faucet rides this. Absent = the chest kind's own table.
   */
  chestLoot?: string;
  /**
   * Words for the boards in this site's prefab — a POOL, hash-picked
   * once per site so two crofts on the same road read differently and
   * each keeps its own line forever. Absent = the boards stand blank,
   * which reads as weathered, unlettered plank.
   */
  signs?: Array<{ title: string; lines?: string[] }>;
  /**
   * The strongbox stays WARDED while any garrison body stands — the
   * champion's cache cannot be sneaked out from under him. Cleared
   * garrison = the ward breaks until the respawn clock refills it.
   */
  chestWarded?: boolean;
  /**
   * character_flags key stamped on the player who fells the LAST
   * garrison body — the hook that turns a broken warcamp into story
   * (dialogue requires/forbids read the same ledger). Never 'dlg:'
   * (the dialogue system owns that namespace).
   */
  clearedFlag?: string;
  /**
   * THE WAR-GROUND: this def composes as a compound hold — court plus
   * wings, cleared in chapters. See PoiCompound. Mutually exclusive
   * with actors/haven (a hold is hostile by definition; the validator
   * refuses the contradiction).
   */
  compound?: PoiCompound;
}

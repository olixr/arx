import type { PostKind } from '../../maps/types.js';

/**
 * THE STRONGHOLD GRAMMAR (docs/strongholds-plan.md Phase 1) — what a
 * capital IS, as data.
 *
 * A StrongholdDef is a LAYOUT: one mega-prefab (the walls, gates,
 * wards, and dressing — static, curated geometry) plus the muster
 * plan that brings it to life. THE WALLS ARE AUTHORED, THE WAR IS
 * DEALT: everything alive rides streams at compose time (Phase 4);
 * the def only states intent — where the knots stand, who they are,
 * which ward is the last stand.
 *
 * THE FOUNDRY LAW: the generator (generate.ts) PROPOSES layouts in
 * this grammar; the bench curates them; the repository (this registry
 * + the shared prefab library) serves them. Nothing generated ships
 * sight-unseen — the shipped roster in defs.ts is generator output at
 * pinned seeds, validated at build and walked by the test suite.
 */

/**
 * THE POST LAW (Third Charter): what a body is DOING where it stands.
 * The generator derives posts from the stamped furniture; the bench
 * and the ward fiction read them — and since THE PEOPLED LANDMARKS,
 * the RUNTIME does too: compose passes the post through ZoneSpawn and
 * the idle brain walks the body to its work. One vocabulary, both
 * lanes (maps/types.ts owns it).
 */
export type KnotPost = PostKind;

export interface StrongholdKnot {
  /** Anchor, prefab-local. The knot's bodies scatter ≤2.5 around it. */
  at: readonly [number, number];
  /** Bestiary id. */
  npc: string;
  /**
   * Bodies in [min, max], 1..3 — THE PULL LAW's upper bound. A bigger
   * fight is more knots, never a bigger knot.
   */
  band: readonly [number, number];
  /**
   * holdfast = lives at the anchor; sentry = watches (gate posts,
   * wall eyes — the composer faces them outward).
   */
  role: 'holdfast' | 'sentry';
  /** Entry only musters at this danger tier and above. */
  minTier?: number;
  /** Levels above the tier band's roll (honor guard rides this). */
  levelOffset?: number;
  /** Activity window, game hours [0, 24), from > to wraps midnight. */
  hours?: { from: number; to: number };
  /** THE POST LAW: the work this knot stands at (bench + runtime). */
  post?: KnotPost;
  /**
   * The furniture cell the post serves (prefab-local) — the fire the
   * cook faces, the dummy the drill swings at. Compose aims the
   * body's held facing here. Absent = the body faces its anchor's
   * outward bearing.
   */
  postAt?: readonly [number, number];
  /**
   * THE CAPTAIN LAW: a titled knot composes as a NAMED spawn ("Warden
   * of the Inner Gate") — placed authority, worth killing.
   */
  title?: string;
}

export interface StrongholdWard {
  /** Slug, unique within the def — the chapter ledger's key. */
  key: string;
  /** The chapter's name in the ward-break line ("the west pens"). */
  name: string;
  /** Prefab-local rect the chapter owns (knots + break detection). */
  rect: { x: number; y: number; w: number; h: number };
  /**
   * The ward's muster. Knot anchors are pairwise ≥ KNOT_SPACING
   * apart ACROSS THE WHOLE LAYOUT (validator law) — spacing is the
   * strategy; a careful player takes a ward one knot at a time.
   */
  knots: readonly StrongholdKnot[];
  /**
   * An optional ward may roll unmanned per epoch (THE WAR IS DEALT —
   * same walls, never the same siege). The boss ward never may.
   */
  optional?: boolean;
  /**
   * Patrol intent Phase 4 consumes: 'wall' walks the nearest wall
   * run, 'lane' walks the worn lanes between wards. Absent = the
   * knots keep their posts.
   */
  patrol?: 'wall' | 'lane';
  /**
   * THE ROADS ARE WALKED (Third Charter): authored patrol waypoints,
   * prefab-local, sampled along the ACTUAL worn lanes — the composer
   * deals these verbatim to the ward's sentry knots. Absent = the
   * patrol kind's synthetic loop (wall rounds) serves.
   */
  route?: ReadonlyArray<readonly [number, number]>;
}

export interface StrongholdBoss {
  /** The last-stand ward's key. */
  ward: string;
  /** Bestiary id of the chief. */
  npc: string;
  /**
   * Champion name pool — the seat hash crowns ONE, stable per site
   * forever (the names-pool law; the chief of that hill has always
   * been the chief of that hill).
   */
  names: readonly string[];
  /** Anchor, prefab-local — beside the drum, before the cache. */
  at: readonly [number, number];
  /** Levels above the tier band's roll, 0..20. */
  levelOffset?: number;
}

export interface StrongholdDef {
  /** stronghold_-prefixed id; doubles as the layout prefab's id. */
  id: string;
  /** Bench label ("Goblin moot-citadel"). */
  name: string;
  /** One-line story for the bench — what this place IS. */
  description?: string;
  /**
   * REQUIRED — a capital is a family's seat (THE CAPITAL LAW deals
   * layouts by the territory field's family).
   */
  family: string;
  /**
   * Danger tiers this layout deals at, min ≥ 3 — a stronghold is
   * deep frontier by law; settled countries keep no capital.
   */
  tiers: readonly [number, number];
  /** Pick weight within the family's layout pool. */
  weight: number;
  /** The mega-prefab (shared library id — by convention === id). */
  prefab: string;
  /**
   * Seat-name pool (strongholds Phase 5): the settled world knows a
   * capital by ITS name, not its layout's — the seat hash picks ONE
   * title per standing ("The Splitfang Ring"), stable until the epoch
   * turns and new walls take a new name. Absent = the layout's own
   * bench name serves.
   */
  titles?: readonly string[];
  /** The chapters. ≥ 2 (a gate yard and a last stand at minimum). */
  wards: readonly StrongholdWard[];
  /** The last stand. */
  boss: StrongholdBoss;
}

/** THE PULL LAW: minimum tile distance between any two knot anchors. */
export const KNOT_SPACING = 10;

/** A knot is 1..3 bodies — busier is more knots, never bigger ones. */
export const KNOT_BAND_MAX = 3;

/**
 * Layout prefab dimension envelope — THE ZONE LAW (Second Charter): a
 * citadel is 2.5-3 max-zoom-out screens across (~57 tiles each), a
 * hold 1.5-2. The prefab carries the approach ground too (outer
 * works), so the ceiling sits above the wall envelope.
 */
export const STRONGHOLD_MIN_DIM = 64;
export const STRONGHOLD_MAX_DIM = 184;

/**
 * Lawful muster envelope, counted in maximum bodies (knot band maxes
 * + the boss): below it the walls outsize the war; above it the tick
 * pays for a parade. Shipped citadels aim for ~45-60 (a 20-30 pull
 * clear), holds ~28-38.
 */
export const STRONGHOLD_BODIES_MIN = 16;
export const STRONGHOLD_BODIES_MAX = 84;

/** Ward count envelope (districts + pickets grew the ceiling). */
export const STRONGHOLD_WARDS_MIN = 2;
export const STRONGHOLD_WARDS_MAX = 16;

/**
 * THE BREATHING LAW (Second Charter), in its two enforceable halves:
 * every ward rect keeps ≥ this share of its cells walkable (a ward is
 * a place you walk THROUGH, not a stamp)…
 */
export const STRONGHOLD_WARD_OPEN_FLOOR = 0.55;

/**
 * …and the ward rects together may claim at most this share of the
 * prefab's ground (the stamps never crowd the yard — the zone is
 * mostly open country inside walls).
 */
export const STRONGHOLD_WARD_AREA_SHARE_MAX = 0.3;

export const STRONGHOLD_ID_RE = /^stronghold_[a-z0-9_]{1,50}$/;

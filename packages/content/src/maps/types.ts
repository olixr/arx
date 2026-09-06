import type { Vec2 } from '@arx/shared';
import type { PlaneId } from '../planes.js';

export interface PortalDef {
  /** World-tile position of the portal tile. */
  x: number;
  y: number;
  /** Where it drops you (world coords, on `destPlane`). */
  dest?: Vec2;
  /**
   * The plane `dest` lives on. Absent = the legacy derivation
   * (legacyPlaneOfY of dest.y — valid exactly because no portal
   * authored before the split pointed at what is now open southern
   * wilderness). New authoring states it explicitly; the editor's
   * portal inspector offers the picker.
   */
  destPlane?: PlaneId;
  /** Instead of a fixed dest, generate a personal delve instance. */
  delve?: boolean;
}

/**
 * THE PEOPLED LANDMARKS — the post vocabulary, shared by both compose
 * lanes (ordinary POIs derive posts from stamped furniture; stronghold
 * knots carry them authored). The kind picks the held behavior at the
 * spot; it never changes combat.
 */
export type PostKind = 'cook' | 'drill' | 'rest' | 'vigil' | 'keeper' | 'watch';

/**
 * A patrol waypoint — THE ROUND HAS STATIONS: a stop may hold the
 * walker for a spell (`dwell`, ticks) and seat it (`sit`) — the round
 * that walks, sits down at the fire, and moves on.
 */
export interface PatrolPt {
  x: number;
  y: number;
  /** Linger at this stop, in ticks (absent = the short default linger). */
  dwell?: number;
  /** Take a seat for the linger — the fireside stop. */
  sit?: boolean;
}

export interface ZoneSpawn {
  npc: string;
  x: number;
  y: number;
  radius: number;
  count: number;
  /**
   * Scale the def to this combat level (dungeon garrisons). Absent =
   * the def's authored level, exactly as before.
   */
  level?: number;
  /** Display-name override — how a scaled troll becomes a Hold-Warden. */
  name?: string;
  /**
   * THE WILD CROWN (docs/boss-system-plan.md): forge seed. A seeded
   * seat crowns its champion at spawn — a boss VARIANT composed from
   * the family's authored parts, deterministic in the seed (the same
   * seat forges the same tyrant forever). The `name` above survives
   * as the crown's given name; the forge signs with its epithet.
   */
  crown?: number;
  /**
   * THE COURT HOLDS THE CROWN: per-seat arena radius override. A
   * crown's authored `boss.arenaR` is sized for open ground; a seat
   * inside a stamped room passes the room's own reach here so the
   * leash and the rim guard hold the fight where the author put it.
   */
  arenaR?: number;
  /**
   * A waypoint loop the body paces while idle (POI sentry rounds).
   * World coords; the idle brain walks leg to leg with the steering
   * fan and lingers at each stop. Combat and chase own the body as
   * ever — the round resumes when they let go. Only meaningful with
   * count 1 (each patroller gets its own rotated loop).
   */
  patrol?: ReadonlyArray<PatrolPt>;
  /**
   * THE POST COMES ALIVE: a furniture-anchored idle behavior — walk
   * to the spot, plant, face `dir`, hold the kind's pose (cook seats
   * and stirs, drill swings at the dummy, vigil stands its ground).
   * `hours` gates the BEHAVIOR, never existence: off-window the body
   * falls through to the ordinary wander. Only meaningful with
   * count 1 (a post is one body's charge).
   */
  post?: { kind: PostKind; x: number; y: number; dir: number; hours?: { from: number; to: number } };
  /**
   * THE DARKNESS LEDGER's spawn gate (lighting v4 phase 5): minimum
   * DARKNESS (1 − lightLevelAt, 0..1) at the seat before the body may
   * stand. A seat at 0.75 spawns only in true dark — night reaches it,
   * a placed torch denies it: player light is territory. Absent = the
   * clock alone decides (the `hours` window below).
   */
  minDark?: number;
  /**
   * Activity window in game-clock hours [0, 24), from > to wrapping
   * midnight (the routine-slot law). Outside it the point neither
   * spawns nor respawns, and a standing body slips away once nothing
   * is watching — nocturnal predators, daylight traders. Absent =
   * always active, exactly as before.
   */
  hours?: { from: number; to: number };
  /**
   * THE WAR-GROUND (lived-in-land Phase 4): which wing of a compound
   * hold this spawn belongs to. Rides into the spawn record so the
   * server can detect a WING falling as its own chapter (the
   * wing-break line) separately from the full clear. Absent = court,
   * sentry, or an ordinary site's body.
   */
  wing?: number;
  /**
   * THE WILD TAKES SIDES (docs/npc-hostility-plan.md): per-placement
   * tribe override — the sub-faction door. Two camps of the same
   * bestiary become 'goblin_redfang' and 'goblin_mosstooth' here, and
   * one stances-doc matrix row makes them feud. Absent = the def's
   * own tribe (claim → faction prefix → implicit), exactly as before.
   */
  tribe?: string;
  /**
   * THE MOUTH ON THE ROW (contested lands, band 7): the actor slug
   * this seat's one named crowned body speaks through (composed from
   * PoiGarrisonEntry.actor; see pois/types.ts). The server registers
   * the standing body in its actor table under the slug, so its
   * lines, examine and bound trees resolve through the shipped talk
   * path; the body keeps the bestiary's art, level and crown, and it
   * never opens a fight of its own. Only meaningful with count 1.
   */
  mouth?: string;
}

/**
 * THE ZONE'S WARDED CHEST (contested lands, band 7; site-grammar
 * G-6): a strongbox binding for an authored zone, addressed by the
 * chest's WORLD tile. `table` re-keys the loot; `wardedBy` names a
 * pinned authored site (geography AUTHORED_WILD_SITES id) whose
 * standing garrison holds the lid shut — the server registers the
 * override exactly as the POI materialise path does (`{ cell, table,
 * warded: true }`), so the Charter's coin box at the ford opens for
 * the character who broke the Company's bar, and for nobody else
 * while the crew stands. A zone has no garrison of its own; the ward
 * is always another site's.
 */
export interface ZoneChest {
  /** World-tile position of a closed chest tile in this zone. */
  x: number;
  y: number;
  /** Loot table id (loot/tables). */
  table: string;
  /** Authored wild site id whose garrison wards the lid. */
  wardedBy: string;
}

/**
 * A placed NPC actor (actors/types.ts) — the PLACEMENT layer of the
 * actor system: which named individual stands where in this zone.
 * Identity stays in the actor def, never here.
 */
export interface ZoneActorSpawn {
  /** NpcActorDef slug. */
  actor: string;
  x: number;
  y: number;
  /** Resting facing in radians (absent = facing south). */
  dir?: number;
  /**
   * RoutineDef id (routines/types.ts) — the daily life this body
   * keeps. Routine coordinates are offsets from THIS placement (the
   * post-is-the-origin law), which is why the routine reference lives
   * here and not on the actor: the same routine paces two different
   * gates, and the same actor keeps different hours in different
   * zones. Absent = the actor simply holds its post.
   */
  routine?: string;
}

/**
 * WORDS ON A BOARD — the text a sign tile in this zone carries.
 *
 * The placement layer for signage, exactly parallel to ZoneActorSpawn:
 * the tile (HangingSign / Signpost) is the furniture, this record is
 * what it says. Coordinates are WORLD tiles and must land on a sign
 * tile of this zone; a record without a tile under it is dead copy and
 * the builder refuses it.
 *
 * Player-written signs never appear here — those live in the server's
 * `signs` table, keyed the same way and owned by their builder.
 */
export interface ZoneSign {
  /** World-tile position of the sign tile these words belong to. */
  x: number;
  y: number;
  /** The heading, painted large (may be empty for an all-body note). */
  title: string;
  /** Body lines beneath it. Absent = a title-only board. */
  lines?: string[];
}

/**
 * An authored zone: a rectangle of tiles stamped over the procedural
 * world. The overlay clips per chunk, so origin and size need no chunk
 * alignment — small zones stamp only their own rectangle.
 */
export interface ZoneDef {
  id: string;
  name: string;
  /**
   * THE WORLDS APART: which plane this zone's rectangle stamps.
   * Absent = 'surface'. Coordinates are plane-local world tiles —
   * a plane is a tag, not a translation, so the authored underground
   * kept its long-standing coordinates when it moved off the surface.
   */
  plane?: PlaneId;
  /** World-tile coordinates of the top-left corner. */
  origin: Vec2;
  /** Size in tiles. */
  width: number;
  height: number;
  ground: Uint16Array;
  detail: Uint16Array;
  /**
   * Signed elevation levels (−2..3), same semantics as ChunkData.elev.
   * Absent ⇒ the zone is flat ground at level 0 (existing zones carry
   * no layer and stamp flat). ZoneBuilder validates at build time that
   * every level change is fenced by Cliff/Ramp, so the overlay can
   * stamp it verbatim.
   */
  elev?: Int8Array;
  /** World-tile spawn point, if this zone hosts one. */
  spawn?: Vec2;
  /**
   * THE KEPT AND THE WILD (second-growth Phase 1): which growth domain
   * this zone's owned tiles belong to. Absent ⇒ 'kept' — authored
   * ground is tended ground, and its resources respawn fast and in
   * place as they always have. 'wild' hands the zone's resources to
   * the growth ledger (slow, persistent, organic regrowth) — for
   * authored wilderness that should feel untended. TILE_SKIP cells are
   * transparent here exactly as in the overlay: the ground beneath
   * keeps its own domain.
   */
  growth?: 'kept' | 'wild';
  portals?: PortalDef[];
  spawns?: ZoneSpawn[];
  /** Placed NPC actors — the who-stands-where layer. */
  actorSpawns?: ZoneActorSpawn[];
  /** What this zone's sign tiles say — the what-is-written-where layer. */
  signs?: ZoneSign[];
  /**
   * THE ZONE'S WARDED CHEST: loot-table and ward bindings for this
   * zone's strongboxes (see ZoneChest). Absent = every chest stands
   * as drawn, a plain strongchest of its tile's kind.
   */
  chests?: ZoneChest[];
}

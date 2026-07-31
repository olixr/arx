import type { Vec2 } from '@arx/shared';

export interface PortalDef {
  /** World-tile position of the portal tile. */
  x: number;
  y: number;
  /** Where it drops you (world coords). */
  dest?: Vec2;
  /** Instead of a fixed dest, generate a personal delve instance. */
  delve?: boolean;
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
   * A waypoint loop the body paces while idle (POI sentry rounds).
   * World coords; the idle brain walks leg to leg with the steering
   * fan and lingers at each stop. Combat and chase own the body as
   * ever — the round resumes when they let go. Only meaningful with
   * count 1 (each patroller gets its own rotated loop).
   */
  patrol?: ReadonlyArray<{ x: number; y: number }>;
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
  portals?: PortalDef[];
  spawns?: ZoneSpawn[];
  /** Placed NPC actors — the who-stands-where layer. */
  actorSpawns?: ZoneActorSpawn[];
  /** What this zone's sign tiles say — the what-is-written-where layer. */
  signs?: ZoneSign[];
}

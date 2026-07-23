import type { Vec2 } from '@devcraft/shared';

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
}

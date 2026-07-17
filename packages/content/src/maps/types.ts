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
}

/**
 * An authored zone: a rectangle of tiles stamped over the procedural
 * world. Origin must be chunk-aligned so zones overlay cleanly.
 */
export interface ZoneDef {
  id: string;
  name: string;
  /** World-tile coordinates of the top-left corner (chunk-aligned). */
  origin: Vec2;
  /** Size in tiles (multiples of CHUNK_SIZE). */
  width: number;
  height: number;
  ground: Uint16Array;
  detail: Uint16Array;
  /** World-tile spawn point, if this zone hosts one. */
  spawn?: Vec2;
  portals?: PortalDef[];
  spawns?: ZoneSpawn[];
}

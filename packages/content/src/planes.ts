import type { Vec2 } from '@arx/shared';

/**
 * THE WORLDS APART — planes: separate coordinate spaces a player is
 * TRANSPORTED between, never walked between (docs/planes-plan.md).
 *
 * A plane is a tag, not a translation: authored zones keep their
 * long-standing coordinates and only carry a plane identity. The
 * surface is the one worldgen plane (endless on every compass point);
 * the underworld is solid rock the authored underground carves into;
 * dungeon runs mint scratch `rift:<slot>` planes that live exactly as
 * long as the run and unload wholesale when it ends.
 */

export type PlaneId = string;

export interface PlaneDef {
  id: PlaneId;
  /** Herald copy — what the crossing veil announces. */
  name: string;
  /**
   * Base terrain law: 'worldgen' planes deal the procedural fields;
   * 'cave' planes deal solid rock and let authored zones carve rooms.
   */
  base: 'worldgen' | 'cave';
  /**
   * Cave law: underground ambience and cutaway, no sky, no mounts,
   * no danger field — the one flag every "am I underground" reader
   * consults instead of a y-line.
   */
  underground: boolean;
  /**
   * Persistent planes keep fog, builds, and ledgers across sessions;
   * scratch planes (dungeon runs) are per-run and never touch the DB.
   */
  persistent: boolean;
}

export const SURFACE_PLANE_ID: PlaneId = 'surface';
export const UNDERWORLD_PLANE_ID: PlaneId = 'underworld';

export const SURFACE_PLANE: PlaneDef = {
  id: SURFACE_PLANE_ID,
  name: 'The Dawnlands',
  base: 'worldgen',
  underground: false,
  persistent: true,
};

export const UNDERWORLD_PLANE: PlaneDef = {
  id: UNDERWORLD_PLANE_ID,
  name: 'The Underworld',
  base: 'cave',
  underground: true,
  persistent: true,
};

/** The planes that exist at boot; rift planes are minted per run. */
export const STATIC_PLANES: readonly PlaneDef[] = [SURFACE_PLANE, UNDERWORLD_PLANE];

/**
 * THE PROP MUSEUM — the developer's review hall. NOT a static plane:
 * the server stands it only when dev commands are on, so production
 * never holds it (a character saved inside rescues home through the
 * ordinary does-not-stand law). Daylight in a carved shell: 'cave'
 * base keeps worldgen out, underground:false keeps the review light
 * honest, and scratch persistence keeps the DB untouched.
 */
export const MUSEUM_PLANE_ID: PlaneId = 'museum';

export const MUSEUM_PLANE: PlaneDef = {
  id: MUSEUM_PLANE_ID,
  name: 'The Prop Museum',
  base: 'cave',
  underground: false,
  persistent: false,
};

/** The plane a dungeon run lives on — the slot IS the isolation now. */
export function riftPlaneId(slot: number): PlaneId {
  return `rift:${slot}`;
}

export function isRiftPlane(id: PlaneId): boolean {
  return id.startsWith('rift:');
}

/** Mint the runtime PlaneDef for a dungeon run. */
export function riftPlaneDef(id: PlaneId, name: string): PlaneDef {
  return { id, name, base: 'cave', underground: true, persistent: false };
}

/**
 * THE FROZEN LAW — the one-plane world's y-treaty, kept ONLY to read
 * legacy data authored before the split (zone JSONs and DB rows tagged
 * by migration, portals without an explicit destPlane). Never consult
 * it for live positions: after the south opened, surface ground exists
 * below y=512 and only the explicit plane tag is truth.
 */
export function legacyPlaneOfY(y: number): PlaneId {
  return y >= 512 ? UNDERWORLD_PLANE_ID : SURFACE_PLANE_ID;
}

/**
 * The plane a portal's destination lives on: the explicit tag when the
 * author stated it, else the frozen legacy law (exact for every portal
 * authored before the split). A destless (delve) portal answers
 * surface — its dest is minted at run time and never read here.
 */
export function portalDestPlane(portal: { dest?: Vec2; destPlane?: PlaneId }): PlaneId {
  if (portal.destPlane) return portal.destPlane;
  return portal.dest ? legacyPlaneOfY(portal.dest.y) : SURFACE_PLANE_ID;
}

/** A position with the plane that gives its coordinates meaning. */
export interface PlanePos {
  plane: PlaneId;
  x: number;
  y: number;
}

export function planePos(plane: PlaneId, pos: Vec2): PlanePos {
  return { plane, x: pos.x, y: pos.y };
}

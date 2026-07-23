/**
 * ROUTINES — the daily lives of placed NPC actors.
 *
 * A routine is a STANDALONE schedule of movement and behaviour that a
 * PLACEMENT (ZoneActorSpawn) points at — never the actor def itself.
 * Identity stays in NpcActorDef; where a body stands is the placement
 * layer's business, and how it spends the day is the routine's. One
 * routine can drive many placements (both gate guards pace the same
 * patrol at their own arches), and the same actor can keep different
 * hours in different zones.
 *
 * THE POST IS THE ORIGIN (the law of this system): every coordinate
 * in a routine — post offsets, waypoints, wander centres — is an
 * OFFSET FROM THE PLACEMENT, in world tiles. Routines carry no
 * absolute positions, which is exactly what makes them reusable and
 * lets a zone move without rewriting the lives inside it.
 *
 * THE CLOCK IS THE TICK (sim/daylight): schedule slots are windows in
 * game-clock hours [0, 24). A slot whose `from` is later than its
 * `to` wraps midnight (21 → 6 is a night watch). Hours no slot claims
 * fall to the `base` task, so every routine answers "what should this
 * body be doing right now" at any hour, always.
 *
 * INTERCHANGE FORMAT: one routine per JSON file in routines/defs/,
 * filename = id (test-enforced), registered in registry.ts, seeded
 * DB-first (server/db/routines.ts) under the same two-hash truth law
 * as dialogues — the DB is what the game reads and what the content
 * tooling will edit; shipped JSON is the seed and the envelope.
 */

/** One stop on a path, offset from the post. */
export interface RoutineWaypoint {
  /** Offset from the placement, world tiles. */
  x: number;
  y: number;
  /** Linger here this many real seconds before moving on (0 = pass through). */
  waitSec?: number;
  /** Facing while lingering, radians (absent = keep the arrival heading). */
  dir?: number;
  /**
   * Work while lingering: the body plays the station-work pose, and
   * the client squares it up to the nearest station tile with the
   * full choreography — hammer-and-tongs at an anvil, stoking at a
   * furnace. Author the stop beside the station it should work.
   */
  work?: boolean;
}

/** Stand at one spot (the post itself unless offset), optionally working. */
export interface RoutineTaskPost {
  kind: 'post';
  /** Offset from the placement (absent = the post itself). */
  x?: number;
  y?: number;
  /** Facing while posted, radians (absent = the placement's dir). */
  dir?: number;
  /** Work the nearest station the whole time (see RoutineWaypoint.work). */
  work?: boolean;
}

/**
 * Walk a waypoint route. 'loop' returns to the first stop after the
 * last, 'bounce' retraces the route backwards, 'once' holds at the
 * final stop until the schedule changes tasks.
 */
export interface RoutineTaskPath {
  kind: 'path';
  mode?: 'loop' | 'bounce' | 'once';
  waypoints: RoutineWaypoint[];
}

/**
 * Aimless liveliness: drift between random walkable spots inside a
 * radius, pausing between legs — the townsfolk-milling-about task for
 * bodies that should feel present without a scripted errand.
 */
export interface RoutineTaskWander {
  kind: 'wander';
  /** Centre offset from the placement (absent = the post itself). */
  x?: number;
  y?: number;
  radius: number;
}

export type RoutineTask = RoutineTaskPost | RoutineTaskPath | RoutineTaskWander;

/** One schedule window: `task` owns the body from `from` until `to`. */
export interface RoutineSlot {
  /** Game-clock hours [0, 24). from > to wraps past midnight. */
  from: number;
  to: number;
  task: RoutineTask;
}

/**
 * A defined routine — the unit of content this system exists for.
 * Placements reference routines by `id`.
 */
export interface RoutineDef {
  /** Unique slug: ^[a-z][a-z0-9_]*$ — the reference key placements use. */
  id: string;
  /** What fills every hour no slot claims (and the whole day slotless). */
  base: RoutineTask;
  /** Schedule windows; the FIRST slot containing the hour wins. */
  slots?: RoutineSlot[];
}

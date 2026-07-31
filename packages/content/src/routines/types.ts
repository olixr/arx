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
  /**
   * Rest seated while lingering — the wayside sit (stretched-out RPG
   * rest, never cross-legged). A bandit off the patrol rotation parks
   * by the campfire with this. THE SEAT UNDER THE STOP: a sit stop
   * whose target lands ON a chair, bench, or throne tile mounts the
   * furniture — the body settles onto the seat itself, facing the way
   * the furniture does (authored `dir` overrides where the seat
   * allows). Mutually exclusive with `work`.
   */
  sit?: boolean;
  /**
   * Lie down while lingering — author the stop ON a Tile.Bed and the
   * body climbs in (head on the pillow, axis from the bed itself).
   * Off a bed this falls back to the wayside sit. Mutually exclusive
   * with `work` and `sit`.
   */
  lie?: boolean;
  /**
   * Stride for the leg INTO this stop, tiles/sec — overrides the
   * task's speed for that one segment (a dash across the yard on an
   * otherwise ambling round). Absent = the task's pace.
   */
  speed?: number;
}

/**
 * How fast a body travels its legs, tiles/sec. THE PACE IS AUTHORED
 * CHARACTER: old Maren shuffles at 1.2, a guard marches at 1.6, a
 * hungry smith jogs to lunch at 2.8 — varied strides are what keep a
 * street of walkers from reading as one clockwork. Layering: a
 * waypoint's speed rules its own leg, else the task's speed, else the
 * default townsfolk stride (1.8). Reference points: bestiary walkers
 * sit around 1.8-3.6, the player runs at 5.
 */
export type RoutineSpeed = number;

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
  /** Rest seated the whole time (see RoutineWaypoint.sit). */
  sit?: boolean;
  /** Lie in the bed under the post the whole time (see RoutineWaypoint.lie). */
  lie?: boolean;
  /** Stride when traveling to (or back to) the post, tiles/sec. */
  speed?: RoutineSpeed;
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
  /** Default stride for every leg, tiles/sec (waypoint speed overrides). */
  speed?: RoutineSpeed;
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
  /** Drift stride, tiles/sec. */
  speed?: RoutineSpeed;
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

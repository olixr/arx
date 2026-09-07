/**
 * THE SERVER'S PACE LAWS (foundations F4) — tick-count tuning shared by
 * the class and its split systems. A leaf on purpose: constants flow
 * downhill, so no system needs a value edge back into gameServer.ts to
 * read a number.
 */
import { TICK_RATE } from '@arx/shared';

/** Seconds of authored dial → whole ticks of the server clock. */
export function secToTicks(sec: number): number {
  return Math.round(sec * TICK_RATE);
}

/** No gather resolves faster than this, whatever the speedups say. */
export const MIN_GATHER_TICKS = 60;
/** The milking stool's base sit, before gather speed. */
export const MILK_TICKS = 60;
/** How long suspicion keeps a hunter dwelling on a last-known spot. */
export const SUS_DWELL_TICKS = 24;

/** How far a chaining working looks for its next foe, tiles. */
export const CHAIN_PROC_RANGE = 5;

  /** How long the hearth rests between recalls. */
export const HEARTH_CD_MS = 10 * 60 * 1000;
export const WILD_MAX_R = 56;

/**
 * THE CAPITAL LAW's dignity: the citadel lanes (ember dissolve, fallow
 * wake, stage-up) pad the frontier's dignityTiles by this much — nobody
 * within the walls' reach watches a capital turn.
 */
export const CAPITAL_DIGNITY_PAD = 64;

/**
 * POI ZONES RETIRE ON DISTANCE (core audit 2026-09, debt 12): a
 * materialized cell nobody has stood within the interest pad plus
 * this hysteresis of, for this many tickPois beats running, retires
 * behind the players (poiLive/zoneDefs/spawnPoints shrink again). The
 * pad keeps a scout pacing the edge of a cell from thrashing it; the
 * beat count (tickPois runs once a second) keeps a short errand from
 * costing a re-stand.
 */
export const POI_RETIRE_PAD_TILES = 64;
export const POI_RETIRE_BEATS = 60;

/**
 * THE THROW IS COUNTED (core audit 2026-09, Band B): the tick loop
 * survives a throwing system, so /healthz must read the throws or a
 * broken release passes the deploy poll. Throws are kept in a sliding
 * window this wide; more than the cap inside it answers 503 `tick
 * throwing` — one bad tick a minute is a log line, a system that
 * throws every second is a release to roll back.
 */
export const TICK_THROW_WINDOW_MS = 60_000;
export const TICK_THROWS_MAX_PER_MIN = 20;

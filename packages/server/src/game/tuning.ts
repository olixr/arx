/**
 * THE SERVER'S PACE LAWS (foundations F4) — tick-count tuning shared by
 * the class and its split systems. A leaf on purpose: constants flow
 * downhill, so no system needs a value edge back into gameServer.ts to
 * read a number.
 */

/** No gather resolves faster than this, whatever the speedups say. */
export const MIN_GATHER_TICKS = 60;
/** The milking stool's base sit, before gather speed. */
export const MILK_TICKS = 60;
/** How long suspicion keeps a hunter dwelling on a last-known spot. */
export const SUS_DWELL_TICKS = 24;

export const PROTOCOL_VERSION = 1;

/** Server simulation ticks per second. */
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const TICK_DT = 1 / TICK_RATE;

/** World distances are measured in tiles (floating point). */
export const CHUNK_SIZE = 32;

/** Client rendering: pixels per tile at zoom 1. */
export const TILE_PX = 32;

/** Base player movement speed, tiles per second. */
export const PLAYER_SPEED = 5;

/**
 * Walk mode scales the input axes to this fraction of full tilt —
 * movement stays one analog quantity end to end, so prediction and
 * server agree for free. A future forced-walk zone (towns) enforces
 * the same factor by clamping input magnitude server-side.
 */
export const WALK_FACTOR = 0.34;

/** Collision radius for humanoid entities, in tiles. */
export const BODY_RADIUS = 0.35;

/** Interest window half-size in chunks (1 => 3x3 chunk subscription). */
export const INTEREST_CHUNK_RADIUS = 1;

/** Fixed-point scale for positions in binary snapshots. */
export const POS_SCALE = 256;

/** How long a disconnected player's entity lingers awaiting reconnect (ms). */
export const RECONNECT_GRACE_MS = 30_000;

/** Interpolation delay target for remote entities (ms). */
export const INTERP_DELAY_MS = 120;

export const MAX_CHAT_LENGTH = 200;
export const MAX_NAME_LENGTH = 16;

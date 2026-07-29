// v3: chunk elev bytes became SIGNED (Int8, sunken levels) — old clients
// would misread −1 as 255, so the bump rejects them cleanly.
// v4: S2CEquipment slots became EquippedItem objects and inventory/bank
// carry per-instance ItemRolls — v3 clients would read worn items as
// strings and render nothing, so the bump rejects them cleanly.
// v5: S2CFx grew per-ability identity (id/dir/segment endpoints) and six
// new kinds (arc/dash/bolt/beam/buff/field) — v4 clients would drop the
// new kinds silently and miss most combat feedback, so reject cleanly.
// v6: AppearanceData grew per-slot enchant ids — v5 clients would show
// enchanted blades bare and miss tier-3 auras entirely, so reject cleanly.
// v7: grips became per-hand (AppearanceData.carryOff, C2SCarryStyle.hand)
// — v6 clients would render a dual wielder's off blade in the wrong grip
// for every watcher, so reject cleanly.
// v8: projectile meta carries ownerEid + firing seq (client-predicted
// tracers hand off to the real entity) and C2SInput reports viewMs for
// exact melee lag compensation — a v7 client would neither predict nor
// be rewound correctly, so reject cleanly.
// v10: signs speak — S2CSigns streams the words on every board with the
// chunk that carries it, and C2SSignEdit rewrites a player's own. A v9
// client would show blank boards it can never read, so reject cleanly.
// v11: the world learns to be charted — S2CExplored carries the login
// fog-of-war snapshot, S2CDiscoveries/S2CDiscovery/S2CDiscoveryFade the
// per-player place ledger, C2SWaypoint the one active waypoint, and
// welcome grows waypoint + geo. A v10 client would strike out sending
// waypoint and chart nothing, so reject cleanly.
// v12: the hand learns its Callings — S2CCallings carries the answered
// toggleable skill passives on join + change, C2SCalling flips one.
// A v11 client would never see the passive layer it is being served,
// so reject cleanly. (Same release: S2CTechniques grows `earned` for
// THE UNWRITTEN PAGE's deed-earned hidden arts.)
// v13: THE FREE HAND — the technique slot unbinds from the equipped
// weapon. S2CTechniques.chosen becomes one ability id (was a per-style
// record) and C2STechnique drops `style`; a v12 client would render an
// empty R slot forever, so reject cleanly.
// v14: THE BOLDNESS LADDER — DiscoveryWire carries the site's live
// stage and S2CDiscoveryStage pushes rung climbs to marker holders.
// A v13 client would drop the push unrecognized and draw stale pips
// against a bolder world, so reject cleanly.
// v15: THE TOWN FEELS IT — S2CWaypoint lets the server plant the one
// waypoint (a guard's bounty mark lands on the chart mid-conversation).
// A v14 client would drop the push and stand there unmarked while the
// guard says "your chart takes it", so reject cleanly.
export const PROTOCOL_VERSION = 15;

/** Server simulation ticks per second. */
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const TICK_DT = 1 / TICK_RATE;

/** World distances are measured in tiles (floating point). */
export const CHUNK_SIZE = 32;

/**
 * Signed terrain level range. DOWN is the same law as UP, relative: for
 * every boundary the higher side owns the crown and the faces, and the
 * Cliff-ring + Ramp collision story is identical for sinks and
 * plateaus. Positive levels are plateaus/mesas, negative are dells and
 * quarries sunk below the meadow. (TERRAIN in the name: MAX_LEVEL is
 * already the skill cap in skills.ts.)
 */
export const MIN_TERRAIN_LEVEL = -2;
export const MAX_TERRAIN_LEVEL = 3;

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

/**
 * Interest window half-size in chunks (2 => 5x5 chunk subscription).
 * The window is centered on the player's CHUNK, so worst-case coverage
 * from the player is (radius × 32) + 1 tiles. The zoomed-out camera
 * (0.85×) sees ~37 tiles half-width — radius 1's 33-tile worst case put
 * entity pop-in and chunk seams ON SCREEN while walking; radius 2's
 * 65-tile margin keeps streaming comfortably outside any viewport.
 */
export const INTEREST_CHUNK_RADIUS = 2;

/**
 * The world's Y-bands. One continuous tile plane holds them all: the
 * surface, the dark band (authored underground + delve mouths), and the
 * far-off per-player dungeon instance slots. Map layers, respawn law,
 * and fog persistence all split on these two lines.
 */
export const UNDERGROUND_Y = 512;
export const DUNGEON_MIN_Y = 8192;

/** Fixed-point scale for positions in binary snapshots. */
export const POS_SCALE = 256;

/** How long a disconnected player's entity lingers awaiting reconnect (ms). */
export const RECONNECT_GRACE_MS = 30_000;

/** Interpolation delay target for remote entities (ms). */
export const INTERP_DELAY_MS = 120;

export const MAX_CHAT_LENGTH = 200;
export const MAX_NAME_LENGTH = 16;

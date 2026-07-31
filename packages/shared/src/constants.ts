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
// v16: THE HEARTH WATCH — S2CFx grows the 'horn' kind (the covetous
// camp's fuse). A v15 client would render an unknown fx as a mute
// color puff and the raid telegraph would lose its voice, so reject
// cleanly.
// v18: THE SHIELD SKILL — S2CFx grows the 'block' kind (the rim spark
// when a raised shield turns a blow). A v17 client would render it as
// a mute color puff and the wall would block in silence, so reject
// cleanly.
// v19: THE PARTY — party membership/invite messages, the partypos
// ticker, and riftgate partyRuns. A v18 client would drop every party
// push and stand deaf to its own fellowship, so reject cleanly.
// v20: THE QUEST LEDGER — the quests/questupd/questevent family,
// C2SQuestAbandon, the quest chip on S2CDialogueNode, and
// EntityMeta.actor (the slug quest marks resolve against). A v19
// client would drop every quest push and see no "!" over any head,
// so reject cleanly.
// v21: THE LEDGER OF NAMES — the rep/repupd/repevent family (faction
// standing full push at bind + quiet patches + band ceremonies) and
// the live membership tables riding S2CRep. A v20 client would drop
// every standing push and read no bands, so reject cleanly.
// (Same-day extensions, still v21: S2CShopOpen.priceMult, S2CRep
// prices/enforcers/peaceBand, and InvSlot.stolen — the Phase-5 theft
// facet; all additive optionals an early v21 client simply ignores.)
// (Voiceover Phase 3, still v21: S2CDialogueNode.voice and
// S2CDialogueOpen.prefetch/voiceDials — additive optionals; an
// unvoiced client reads the same conversation in silence.)
// (Voiceover Phase 4, still v21: the S2CVoiceQuip 'vq' family. A new
// family normally bumps, but the bump law guards MATERIAL state a
// deaf client would corrupt (parties, quests, standing); 'vq' is a
// bark's cosmetic breath — an old client drops it and loses nothing
// but air, so it rides v21. The judgment is recorded here on purpose.)
// (v22 ARX WIELDING: the caster school's id becomes 'arx', which the
// projectile defId carries on the wire as `arx:<element>` /
// `arx_heavy:<element>`. A v21 client matches neither prefix, so its
// staff bolts would draw as arrows and its predicted tracers would
// never marry the real ones — cosmetic, but wrong in the hand, and a
// v21 skills panel would show an empty school. Bumped so old clients
// are turned away cleanly instead of playing a half-wrong game.)
// v23: THE DEEPER SIGIL — S2CFx grows the 'proc' kind (an enchanted
// working waking). By the bump law this is cosmetic breath and could
// have ridden v22 like 'vq' does v21 — but unlike a bark, a proc IS
// the feedback for a mechanic that is also changing the player's
// damage, wards, and cooldowns. A v22 client would take the hits and
// the healing with no idea what caused either, which is not a lost
// bark, it is an unreadable fight. Bumped on that reasoning.
export const PROTOCOL_VERSION = 23;

/** The most souls one party can hold. */
export const PARTY_CAP = 10;

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

/**
 * THE PROP HALL's shared inks — palette constants spoken by more than
 * one prop family but by nothing outside the hall.
 */

// THE GARDEN DYES: the human towns' curated bloom triads — every
// cottage planter, box, and barrel deals ONE of these three dye-house
// palettes by world hash, so a street of planters varies but never
// clashes (madder/weld/chalk, woad/chalk/rose, rose/cream/violet).
export const GARDEN_DYES: ReadonlyArray<readonly [string, string, string]> = [
  ['#c95a74', '#d8c454', '#f0ede4'],
  ['#8f9ed6', '#f0ede4', '#d977a8'],
  ['#d977a8', '#e8dcc4', '#8a7aa8'],
];
// THE LONG DARK FURNISHED: the dungeon kit's materials. Old iron in
// the CaveWall's own cold family (fixtures must read GROWN INTO the
// stone, not shipped down from a smithy), rust where water found it,
// carved kingdom-stone a half step paler than the cave so worked
// pieces separate from raw rock, grave clay the one warm voice in
// the dark, damp moss, and the bone tones the BonePile already owns.
export const DGN_IRON = '#3a3444';
export const DGN_IRON_LIT = '#5d5670';
export const DGN_RUST_LIT = '#a06840';
export const DGN_BONE = '#cfc7ae';
export const DGN_BONE_DIM = '#b5ac91';
// THE TOWN KEEPS ITS DAY — the town-life kit's warm keys: kept
// limestone, kept bronze, and the joinery timber the streets already
// speak. This is the LIVED street — never the fair house's moonlight,
// never the long dark's cold gray.
export const TWN_STONE = '#a39a86';
export const TWN_STONE_LIT = '#c6bda6';
export const TWN_STONE_DARK = '#78705d';
export const TWN_PAPER = '#e2d9c4';
export const TWN_BURLAP = '#b89a68';
export const TWN_BURLAP_LIT = '#d8c49a';
export const TRD_LEATHER = '#8a5a36';
export const TRD_WAX = '#e8d9b0';
export const TRD_WAX_LIT = '#f6ecd2';
// The common flame — every open fire's two inks (was street-local;
// the candle painters speak it too).
export const CMN_FLAME = '#e8a13c';
export const CMN_FLAME_CORE = '#f8e8b0';
// THE SCARRED LAND — the contested-lands kit's shared inks (plan
// §6.2). LEFT BURNING is the shelf voice: char is a cold violet-black
// (never warm brown — burnt wood drinks the light), ash the pale
// grey that sits ON char, ember the one hot note (night-only by the
// flame gate), gloom the Riftgate apron's bruised blue-violet (cold,
// never green — the shroom already owns green), rag red the reavers'
// dye gone dull in weather, Legion crimson a half step deeper and
// bluer than any dye band (never a DYE — a faction's cloth is its
// own ink), and charter brass the fordgate's plate.
export const SCAR_CHAR = '#2a2529';
export const SCAR_ASH = '#8d8a90';
export const SCAR_EMBER = '#e0622a';
export const SCAR_GLOOM = '#7f8cc4';
export const SCAR_RAG_RED = '#a8323a';
export const LEGION_CRIMSON = '#8a1f2a';
export const CHARTER_BRASS = '#c9a14a';

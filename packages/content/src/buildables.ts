import { DYE_COUNT, Tile, awningInfo, diagWallInfo, type SkillId } from '@arx/shared';

/**
 * THE DYE LAW's roster — the ten cloths of the Dawnlands, index-married
 * to the shared id bands (shared DYE_COUNT pins the length; a content
 * test refuses drift). Index order is FOREVER: rename a dye in place,
 * never reorder — the index is baked into world tiles and details.
 * Dye 0 is the undyed default every dyeable piece falls back to.
 */
export const DYES: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'linen', name: 'Linen' },
  { id: 'madder', name: 'Madder' },
  { id: 'woad', name: 'Woad' },
  { id: 'weld', name: 'Weld' },
  { id: 'ivy', name: 'Ivy' },
  { id: 'mulberry', name: 'Mulberry' },
  { id: 'ochre', name: 'Ochre' },
  { id: 'charcoal', name: 'Charcoal' },
  { id: 'moss', name: 'Moss' },
  { id: 'rose', name: 'Rose' },
];
if (DYES.length !== DYE_COUNT) {
  throw new Error(`DYES roster (${DYES.length}) must match shared DYE_COUNT (${DYE_COUNT})`);
}

/**
 * What each dye costs at placement, over the piece's own materials —
 * the cloth-colorway pigment precedent (berries stew madder, moonbell
 * steeps woad) walked onto the build lane. Index-married to DYES;
 * null = the undyed default asks nothing. The server validates and
 * consumes these beside def.materials, so dye choice feeds the
 * foraging and farming loops instead of being a free menu.
 */
export const DYE_PIGMENTS: ReadonlyArray<{ item: string; qty: number } | null> = [
  null, // linen — undyed
  { item: 'berries', qty: 2 }, // madder
  { item: 'moonbell', qty: 1 }, // woad
  { item: 'sunflower', qty: 1 }, // weld
  { item: 'sagewort', qty: 2 }, // ivy
  { item: 'berries', qty: 3 }, // mulberry — stewed deep
  { item: 'pine_resin', qty: 2 }, // ochre
  { item: 'coal', qty: 1 }, // charcoal
  { item: 'sagewort', qty: 1 }, // moss
  { item: 'berries', qty: 1 }, // rose — a pale wash
];
if (DYE_PIGMENTS.length !== DYE_COUNT) {
  throw new Error(`DYE_PIGMENTS (${DYE_PIGMENTS.length}) must match shared DYE_COUNT (${DYE_COUNT})`);
}

/** The palette's shelves — every buildable sits on exactly one. */
export type BuildCategory =
  | 'foundation'
  | 'wall'
  | 'furnishing'
  | 'station'
  | 'decor'
  | 'defense'
  | 'waymark';

/** Shelf order + player-facing names, shared by every palette reader. */
export const BUILD_CATEGORIES: ReadonlyArray<{ id: BuildCategory; label: string }> = [
  { id: 'foundation', label: 'Foundations' },
  { id: 'wall', label: 'Walls & Openings' },
  { id: 'station', label: 'Stations' },
  { id: 'furnishing', label: 'Furnishings' },
  { id: 'decor', label: 'Decor' },
  { id: 'defense', label: 'Defenses' },
  { id: 'waymark', label: 'Waymarks' },
];

/** Something a player can construct in the open world. */
export interface BuildableDef {
  id: string;
  name: string;
  tile: Tile;
  levelReq: number;
  xp: number;
  materials: Array<{ item: string; qty: number }>;
  ticks: number;
  /** Which palette shelf the piece lives on. */
  cat: BuildCategory;
  /** Which skill gates and earns the build (default: construction). */
  skill?: SkillId;
  /**
   * Per-buildable placement allowlist. Absent = the global outdoor
   * BUILDABLE_GROUND. Furniture wants floors; walls want both, so a
   * new wall can extend a house you already floored.
   */
  ground?: readonly Tile[];
}

/** Ground that may be built on when a def doesn't say otherwise. */
export const BUILDABLE_GROUND: readonly Tile[] = [
  Tile.Grass,
  Tile.GrassTall,
  Tile.Dirt,
  Tile.Sand,
];

/** The placement allowlist for a def — its own, or the global one. */
export function buildableGround(def: BuildableDef): readonly Tile[] {
  return def.ground ?? BUILDABLE_GROUND;
}

/** Indoor furniture: only stands on a laid floor. */
const FLOORS: readonly Tile[] = [Tile.WoodFloor, Tile.StoneFloor];

/**
 * Structural and civic pieces: open ground OR a laid floor, so walls,
 * windows and doorways can be cut into an existing house, and porch
 * railings / pillars can rise from a finished deck.
 */
const OUTDOOR_AND_FLOORS: readonly Tile[] = [...BUILDABLE_GROUND, ...FLOORS];

// Ordered by levelReq so the build panel reads as a progression.
//
// THE MILLED-AND-WHOLE LAW (building v2): milled surfaces — floors,
// walls, openings, furniture, station casework — cost stackable
// boards sawn at the sawhorse (1 log → 3 boards; milled prices land
// under raw board-parity as the reward for processing). WHOLE TIMBER
// stays logs: the campfire burns trunks, posts and poles are driven
// whole, the garrison gate hangs on real beams, and the sawhorse
// itself costs logs because no one saws boards before owning a saw
// stand. The content test pins which defs may touch raw logs.
const defs: BuildableDef[] = [
  {
    // The bootstrap: the board station itself, raised from whole
    // logs at the treeline so the loop starts where the chopping is.
    id: 'sawhorse',
    cat: 'station',
    name: 'Sawhorse',
    tile: Tile.Sawhorse,
    levelReq: 1,
    xp: 20,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 25,
  },
  {
    // THE THREE STALLS (beastcraft v2): the household's own stable
    // door — a keeper rotates companions from home. Boards and twine;
    // the craft is in the keeping, not the carpentry.
    id: 'beast_pen',
    cat: 'station',
    name: 'Beast pen',
    tile: Tile.BeastPen,
    skill: 'beastcraft',
    levelReq: 10,
    xp: 30,
    materials: [
      { item: 'board', qty: 4 },
      { item: 'twine', qty: 2 },
    ],
    ticks: 30,
  },
  {
    id: 'wood_floor',
    cat: 'foundation',
    name: 'Wood floor',
    tile: Tile.WoodFloor,
    levelReq: 1,
    xp: 15,
    materials: [{ item: 'board', qty: 2 }],
    ticks: 20,
  },
  {
    id: 'wood_wall',
    cat: 'wall',
    name: 'Wood wall',
    tile: Tile.WallWood,
    levelReq: 1,
    xp: 25,
    materials: [{ item: 'board', qty: 4 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // Auto-orients to span the corner between the two perpendicular
    // wall neighbours present at placement — build those runs first.
    id: 'wood_wall_corner',
    cat: 'wall',
    name: 'Wood wall corner',
    tile: Tile.WallWoodDiagNE,
    levelReq: 4,
    xp: 30,
    materials: [{ item: 'board', qty: 4 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'garden_plot',
    cat: 'foundation',
    name: 'Garden plot',
    tile: Tile.Tilled,
    levelReq: 1,
    xp: 3,
    materials: [],
    ticks: 30,
    skill: 'farming',
  },
  {
    id: 'barrel',
    cat: 'furnishing',
    name: 'Barrel',
    tile: Tile.Barrel,
    levelReq: 2,
    xp: 18,
    materials: [{ item: 'board', qty: 2 }, { item: 'twine', qty: 1 }],
    ticks: 20,
    ground: FLOORS,
  },
  {
    id: 'crate',
    cat: 'furnishing',
    name: 'Crate',
    tile: Tile.Crate,
    levelReq: 2,
    xp: 18,
    materials: [{ item: 'board', qty: 4 }],
    ticks: 20,
    ground: FLOORS,
  },
  {
    id: 'fence',
    cat: 'defense',
    name: 'Fence',
    tile: Tile.Fence,
    levelReq: 3,
    xp: 20,
    materials: [{ item: 'board', qty: 2 }],
    ticks: 20,
  },
  {
    // Auto-orients to join whichever diagonal already carries
    // fencing — build the adjoining runs first, then the turn.
    id: 'fence_corner',
    cat: 'defense',
    name: 'Fence corner',
    tile: Tile.FenceDiagNE,
    levelReq: 3,
    xp: 20,
    materials: [{ item: 'board', qty: 2 }],
    ticks: 20,
  },
  {
    // Placed standing open; walk through, or close it to pen the
    // herd — the gate rides the whole door law (locks included).
    id: 'fence_gate',
    cat: 'defense',
    name: 'Fence gate',
    tile: Tile.FenceGate,
    levelReq: 4,
    xp: 26,
    materials: [{ item: 'board', qty: 3 }, { item: 'twine', qty: 1 }],
    ticks: 25,
  },
  {
    id: 'wood_window',
    cat: 'wall',
    name: 'Wood wall window',
    tile: Tile.WallWoodWindow,
    levelReq: 4,
    xp: 30,
    materials: [{ item: 'board', qty: 4 }, { item: 'twine', qty: 1 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'campfire',
    cat: 'station',
    name: 'Campfire',
    tile: Tile.Campfire,
    levelReq: 5,
    xp: 40,
    materials: [{ item: 'log', qty: 3 }],
    ticks: 40,
  },
  {
    id: 'chair',
    cat: 'furnishing',
    name: 'Chair',
    tile: Tile.Chair,
    levelReq: 5,
    xp: 30,
    materials: [{ item: 'board', qty: 3 }],
    ticks: 25,
    ground: FLOORS,
  },
  {
    id: 'wood_doorway',
    cat: 'wall',
    name: 'Wood doorway',
    tile: Tile.DoorwayWood,
    levelReq: 6,
    xp: 35,
    materials: [{ item: 'board', qty: 5 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // Place two side by side and they merge into ONE full-width
    // opening; the plain doorway never merges.
    id: 'wood_doorway_wide',
    cat: 'wall',
    name: 'Wide wood doorway',
    tile: Tile.DoorwayWoodWide,
    levelReq: 7,
    xp: 40,
    materials: [{ item: 'board', qty: 7 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'table',
    cat: 'furnishing',
    name: 'Table',
    tile: Tile.Table,
    levelReq: 7,
    xp: 42,
    materials: [{ item: 'board', qty: 6 }],
    ticks: 30,
    ground: FLOORS,
  },
  {
    id: 'bench',
    cat: 'furnishing',
    name: 'Bench',
    tile: Tile.Bench,
    levelReq: 7,
    xp: 42,
    materials: [{ item: 'board', qty: 5 }],
    ticks: 30,
    ground: FLOORS,
  },
  {
    id: 'lamp_post',
    cat: 'waymark',
    name: 'Lamp post',
    tile: Tile.LampPost,
    levelReq: 8,
    xp: 35,
    materials: [{ item: 'log', qty: 1 }, { item: 'coal', qty: 1 }],
    ticks: 30,
  },
  {
    id: 'alembic',
    cat: 'station',
    name: 'Alembic bench',
    tile: Tile.Alembic,
    levelReq: 8,
    xp: 90,
    materials: [
      { item: 'board', qty: 4 },
      { item: 'bronze_bar', qty: 1 },
      { item: 'cloth', qty: 1 },
    ],
    ticks: 60,
  },
  {
    id: 'stone_window',
    cat: 'wall',
    name: 'Stone wall window',
    tile: Tile.WallStoneWindow,
    levelReq: 8,
    xp: 45,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'board', qty: 2 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'flower_box',
    cat: 'furnishing',
    name: 'Flower box',
    tile: Tile.FlowerBox,
    levelReq: 9,
    xp: 48,
    materials: [{ item: 'board', qty: 3 }],
    ticks: 25,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'stone_doorway',
    cat: 'wall',
    name: 'Stone doorway',
    tile: Tile.DoorwayStone,
    levelReq: 10,
    xp: 50,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'board', qty: 2 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'stone_doorway_wide',
    cat: 'wall',
    name: 'Wide stone doorway',
    tile: Tile.DoorwayStoneWide,
    levelReq: 11,
    xp: 55,
    materials: [{ item: 'copper_ore', qty: 2 }, { item: 'board', qty: 2 }],
    ticks: 40,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'wood_railing',
    cat: 'wall',
    name: 'Wood railing',
    tile: Tile.RailWood,
    levelReq: 10,
    xp: 50,
    materials: [{ item: 'board', qty: 3 }],
    ticks: 25,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'workbench',
    cat: 'station',
    name: 'Workbench',
    tile: Tile.Workbench,
    levelReq: 10,
    xp: 80,
    materials: [{ item: 'oak_board', qty: 4 }, { item: 'board', qty: 4 }],
    ticks: 50,
  },
  {
    // THE OUTWARD FACE: awnings bolt to a wall face and shade the
    // street row south of it (the server holds the wall-north footing
    // law). Dye is chosen at placement (THE DYE LAW) and pigment is
    // paid beside the materials — see DYE_PIGMENTS. Tiles land as
    // shape anchor + dye; salvage folds every dyed id back to its one
    // def through buildableForTile's awning fold.
    id: 'awning_shed',
    cat: 'decor',
    name: 'Shed awning',
    tile: Tile.AwningShed,
    levelReq: 10,
    xp: 55,
    materials: [{ item: 'board', qty: 2 }, { item: 'cloth', qty: 2 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // All timber, no cloth: the rain roof for smokehouses and wood
    // shops. It takes the host wall's own wood; dye paints the trim.
    id: 'awning_board',
    cat: 'decor',
    name: 'Board awning',
    tile: Tile.AwningBoard,
    levelReq: 12,
    xp: 62,
    materials: [{ item: 'board', qty: 5 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // The stall's scalloped valance, re-cut for a shopfront.
    id: 'awning_market',
    cat: 'decor',
    name: 'Market awning',
    tile: Tile.AwningMarket,
    levelReq: 14,
    xp: 72,
    materials: [{ item: 'board', qty: 2 }, { item: 'cloth', qty: 3 }],
    ticks: 32,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // The grand shopfront: a barrel-bowed canvas over real framing.
    id: 'awning_bowed',
    cat: 'decor',
    name: 'Bowed awning',
    tile: Tile.AwningBowed,
    levelReq: 20,
    xp: 130,
    materials: [{ item: 'board', qty: 3 }, { item: 'cloth', qty: 4 }],
    ticks: 40,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'tanning_rack',
    cat: 'station',
    name: 'Tanning rack',
    tile: Tile.TanningRack,
    levelReq: 9,
    xp: 70,
    materials: [
      { item: 'board', qty: 5 },
      { item: 'twine', qty: 2 },
      { item: 'cowhide', qty: 1 },
    ],
    ticks: 50,
  },
  {
    id: 'loom',
    cat: 'station',
    name: 'Loom',
    tile: Tile.Loom,
    levelReq: 11,
    xp: 85,
    materials: [
      { item: 'board', qty: 4 },
      { item: 'oak_board', qty: 2 },
      { item: 'twine', qty: 3 },
    ],
    ticks: 55,
  },
  {
    id: 'carving_bench',
    cat: 'station',
    name: 'Carving bench',
    tile: Tile.CarvingBench,
    levelReq: 12,
    xp: 90,
    materials: [
      { item: 'oak_board', qty: 4 },
      { item: 'board', qty: 4 },
      { item: 'iron_bar', qty: 1 },
    ],
    ticks: 55,
  },
  {
    id: 'enchanting_table',
    cat: 'station',
    name: 'Enchanting table',
    tile: Tile.EnchantingTable,
    levelReq: 14,
    xp: 100,
    materials: [
      { item: 'oak_board', qty: 5 },
      { item: 'gold_bar', qty: 1 },
      { item: 'arcane_dust', qty: 4 },
    ],
    ticks: 60,
  },
  {
    id: 'bed',
    cat: 'furnishing',
    name: 'Bed',
    tile: Tile.Bed,
    levelReq: 12,
    xp: 70,
    materials: [{ item: 'board', qty: 4 }, { item: 'cloth', qty: 2 }],
    ticks: 45,
    ground: FLOORS,
  },
  {
    id: 'stone_floor',
    cat: 'foundation',
    name: 'Stone floor',
    tile: Tile.StoneFloor,
    levelReq: 12,
    xp: 40,
    materials: [{ item: 'copper_ore', qty: 1 }],
    ticks: 25,
  },
  {
    id: 'hanging_sign',
    cat: 'waymark',
    name: 'Hanging sign',
    tile: Tile.HangingSign,
    levelReq: 13,
    xp: 65,
    materials: [{ item: 'board', qty: 2 }, { item: 'twine', qty: 1 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // The roadside post: cheap and early on purpose. Labelling your
    // own ground — a homestead, a stash, a fork in the trail — is
    // wayfinding the world can't author for you, so the gate is a
    // beginner's one. A driven whole-timber post wearing two sawn
    // boards — exactly what the art draws.
    id: 'signpost',
    cat: 'waymark',
    name: 'Signpost',
    tile: Tile.Signpost,
    levelReq: 3,
    xp: 30,
    materials: [{ item: 'log', qty: 1 }, { item: 'board', qty: 2 }],
    ticks: 25,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'counter',
    cat: 'furnishing',
    name: 'Counter',
    tile: Tile.Counter,
    levelReq: 14,
    xp: 80,
    materials: [{ item: 'oak_board', qty: 4 }, { item: 'board', qty: 2 }],
    ticks: 40,
    ground: FLOORS,
  },
  {
    id: 'stone_wall',
    cat: 'wall',
    name: 'Stone wall',
    tile: Tile.WallStone,
    levelReq: 15,
    xp: 45,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'board', qty: 2 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // Auto-orients to span the corner between the two perpendicular
    // wall neighbours present at placement — build those runs first.
    id: 'stone_wall_corner',
    cat: 'wall',
    name: 'Stone wall corner',
    tile: Tile.WallStoneDiagNE,
    levelReq: 16,
    xp: 50,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'board', qty: 2 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'bookshelf',
    cat: 'furnishing',
    name: 'Bookshelf',
    tile: Tile.Bookshelf,
    levelReq: 16,
    xp: 95,
    materials: [{ item: 'oak_board', qty: 6 }, { item: 'leather', qty: 1 }],
    ticks: 45,
    ground: FLOORS,
  },
  {
    id: 'banner_pole',
    cat: 'waymark',
    name: 'Banner pole',
    tile: Tile.BannerPole,
    levelReq: 18,
    xp: 115,
    materials: [{ item: 'log', qty: 2 }, { item: 'cloth', qty: 2 }],
    ticks: 40,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'furnace',
    cat: 'station',
    name: 'Furnace',
    tile: Tile.Furnace,
    levelReq: 20,
    xp: 150,
    materials: [{ item: 'iron_bar', qty: 2 }, { item: 'copper_ore', qty: 4 }],
    ticks: 70,
  },
  {
    id: 'stone_pillar',
    cat: 'wall',
    name: 'Stone pillar',
    tile: Tile.PillarStone,
    levelReq: 22,
    xp: 150,
    materials: [{ item: 'copper_ore', qty: 4 }],
    ticks: 50,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'stone_arch',
    cat: 'wall',
    name: 'Stone arch',
    tile: Tile.ArchStone,
    levelReq: 24,
    xp: 170,
    materials: [{ item: 'copper_ore', qty: 4 }, { item: 'iron_bar', qty: 1 }],
    ticks: 55,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'anvil',
    cat: 'station',
    name: 'Anvil',
    tile: Tile.Anvil,
    levelReq: 25,
    xp: 200,
    materials: [{ item: 'iron_bar', qty: 4 }],
    ticks: 80,
  },
  {
    id: 'hearth',
    cat: 'furnishing',
    name: 'Hearth',
    tile: Tile.Hearth,
    levelReq: 30,
    xp: 260,
    materials: [
      { item: 'copper_ore', qty: 6 },
      { item: 'iron_bar', qty: 2 },
      { item: 'coal', qty: 2 },
    ],
    ticks: 80,
    ground: FLOORS,
  },
  // THE GARRISON TIER — fortification is late-construction mastery:
  // siege masonry costs real stone and real iron, and the wall it
  // raises stands half again over any house.
  {
    id: 'garrison_wall',
    cat: 'defense',
    name: 'Garrison wall',
    tile: Tile.WallGarrison,
    levelReq: 28,
    xp: 220,
    materials: [{ item: 'copper_ore', qty: 4 }, { item: 'iron_bar', qty: 1 }],
    ticks: 70,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // Auto-orients to span the corner between the two perpendicular
    // GARRISON neighbours present at placement (the separate-masonry
    // law: building walls never orient a curtain) — raise the
    // adjoining runs first, then turn the corner.
    id: 'garrison_wall_corner',
    cat: 'defense',
    name: 'Garrison wall corner',
    tile: Tile.WallGarrisonDiagNE,
    levelReq: 30,
    xp: 240,
    materials: [{ item: 'copper_ore', qty: 4 }, { item: 'iron_bar', qty: 1 }],
    ticks: 70,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    // Placed standing open. Lay two or three side by side in a
    // curtain run and they merge into ONE arched gatehouse passage —
    // portcullis in the soffit, iron-bound leaves, the whole door
    // law (locks, occupancy, auto-close) riding underneath.
    id: 'garrison_gate',
    cat: 'defense',
    name: 'Garrison gate',
    tile: Tile.GateGarrison,
    levelReq: 32,
    xp: 320,
    materials: [
      { item: 'copper_ore', qty: 3 },
      { item: 'iron_bar', qty: 2 },
      { item: 'oak_log', qty: 2 },
    ],
    ticks: 90,
    ground: OUTDOOR_AND_FLOORS,
  },
];

export const BUILDABLES: ReadonlyMap<string, BuildableDef> = new Map(defs.map((d) => [d.id, d]));

const BY_TILE: ReadonlyMap<Tile, BuildableDef> = new Map(defs.map((d) => [d.tile, d]));

/** Corner defs by wall material — auto-orient scatters one def across
 *  four placed tiles, and salvage must find its way back. */
const DIAG_CORNER_ID: Record<string, string> = {
  wood: 'wood_wall_corner',
  stone: 'stone_wall_corner',
  garrison: 'garrison_wall_corner',
};

/**
 * The def that placed this tile — the demolisher's reverse ledger.
 * Callers pass the BUILT record's tile (always the canonical/open
 * variant); oriented diagonal walls and fence turns resolve to their
 * single corner def. Undefined = not a player-buildable tile.
 */
export function buildableForTile(tile: Tile): BuildableDef | undefined {
  const dw = diagWallInfo(tile);
  if (dw) return BUILDABLES.get(DIAG_CORNER_ID[dw.material] ?? '');
  if (tile === Tile.FenceDiagNE || tile === Tile.FenceDiagNW) return BUILDABLES.get('fence_corner');
  // THE DYE LAW's reverse: every dyed awning id folds to its shape's
  // one def, so salvage and the own-work overlay never care about dye.
  const awn = awningInfo(tile);
  if (awn) return BUILDABLES.get(`awning_${awn.shape}`);
  return BY_TILE.get(tile);
}

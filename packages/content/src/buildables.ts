import { Tile, type SkillId } from '@devcraft/shared';

/** Something a player can construct in the open world. */
export interface BuildableDef {
  id: string;
  name: string;
  tile: Tile;
  levelReq: number;
  xp: number;
  materials: Array<{ item: string; qty: number }>;
  ticks: number;
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
const defs: BuildableDef[] = [
  {
    id: 'wood_floor',
    name: 'Wood floor',
    tile: Tile.WoodFloor,
    levelReq: 1,
    xp: 15,
    materials: [{ item: 'log', qty: 1 }],
    ticks: 20,
  },
  {
    id: 'wood_wall',
    name: 'Wood wall',
    tile: Tile.WallWood,
    levelReq: 1,
    xp: 25,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'garden_plot',
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
    name: 'Barrel',
    tile: Tile.Barrel,
    levelReq: 2,
    xp: 18,
    materials: [{ item: 'log', qty: 1 }, { item: 'twine', qty: 1 }],
    ticks: 20,
    ground: FLOORS,
  },
  {
    id: 'crate',
    name: 'Crate',
    tile: Tile.Crate,
    levelReq: 2,
    xp: 18,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 20,
    ground: FLOORS,
  },
  {
    id: 'fence',
    name: 'Fence',
    tile: Tile.Fence,
    levelReq: 3,
    xp: 20,
    materials: [{ item: 'log', qty: 1 }],
    ticks: 20,
  },
  {
    id: 'wood_window',
    name: 'Wood wall window',
    tile: Tile.WallWoodWindow,
    levelReq: 4,
    xp: 30,
    materials: [{ item: 'log', qty: 2 }, { item: 'twine', qty: 1 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'campfire',
    name: 'Campfire',
    tile: Tile.Campfire,
    levelReq: 5,
    xp: 40,
    materials: [{ item: 'log', qty: 3 }],
    ticks: 40,
  },
  {
    id: 'chair',
    name: 'Chair',
    tile: Tile.Chair,
    levelReq: 5,
    xp: 30,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 25,
    ground: FLOORS,
  },
  {
    id: 'wood_doorway',
    name: 'Wood doorway',
    tile: Tile.DoorwayWood,
    levelReq: 6,
    xp: 35,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'table',
    name: 'Table',
    tile: Tile.Table,
    levelReq: 7,
    xp: 42,
    materials: [{ item: 'log', qty: 3 }],
    ticks: 30,
    ground: FLOORS,
  },
  {
    id: 'bench',
    name: 'Bench',
    tile: Tile.Bench,
    levelReq: 7,
    xp: 42,
    materials: [{ item: 'log', qty: 3 }],
    ticks: 30,
    ground: FLOORS,
  },
  {
    id: 'lamp_post',
    name: 'Lamp post',
    tile: Tile.LampPost,
    levelReq: 8,
    xp: 35,
    materials: [{ item: 'log', qty: 1 }, { item: 'coal', qty: 1 }],
    ticks: 30,
  },
  {
    id: 'alembic',
    name: 'Alembic bench',
    tile: Tile.Alembic,
    levelReq: 8,
    xp: 90,
    materials: [
      { item: 'log', qty: 2 },
      { item: 'bronze_bar', qty: 1 },
      { item: 'cloth', qty: 1 },
    ],
    ticks: 60,
  },
  {
    id: 'stone_window',
    name: 'Stone wall window',
    tile: Tile.WallStoneWindow,
    levelReq: 8,
    xp: 45,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'log', qty: 1 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'flower_box',
    name: 'Flower box',
    tile: Tile.FlowerBox,
    levelReq: 9,
    xp: 48,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 25,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'stone_doorway',
    name: 'Stone doorway',
    tile: Tile.DoorwayStone,
    levelReq: 10,
    xp: 50,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'log', qty: 1 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'wood_railing',
    name: 'Wood railing',
    tile: Tile.RailWood,
    levelReq: 10,
    xp: 50,
    materials: [{ item: 'log', qty: 2 }],
    ticks: 25,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'workbench',
    name: 'Workbench',
    tile: Tile.Workbench,
    levelReq: 10,
    xp: 80,
    materials: [{ item: 'oak_log', qty: 2 }, { item: 'log', qty: 2 }],
    ticks: 50,
  },
  {
    id: 'tanning_rack',
    name: 'Tanning rack',
    tile: Tile.TanningRack,
    levelReq: 9,
    xp: 70,
    materials: [
      { item: 'log', qty: 3 },
      { item: 'twine', qty: 2 },
      { item: 'cowhide', qty: 1 },
    ],
    ticks: 50,
  },
  {
    id: 'loom',
    name: 'Loom',
    tile: Tile.Loom,
    levelReq: 11,
    xp: 85,
    materials: [
      { item: 'log', qty: 2 },
      { item: 'oak_log', qty: 1 },
      { item: 'twine', qty: 3 },
    ],
    ticks: 55,
  },
  {
    id: 'carving_bench',
    name: 'Carving bench',
    tile: Tile.CarvingBench,
    levelReq: 12,
    xp: 90,
    materials: [
      { item: 'oak_log', qty: 2 },
      { item: 'log', qty: 2 },
      { item: 'iron_bar', qty: 1 },
    ],
    ticks: 55,
  },
  {
    id: 'bed',
    name: 'Bed',
    tile: Tile.Bed,
    levelReq: 12,
    xp: 70,
    materials: [{ item: 'log', qty: 2 }, { item: 'cloth', qty: 2 }],
    ticks: 45,
    ground: FLOORS,
  },
  {
    id: 'stone_floor',
    name: 'Stone floor',
    tile: Tile.StoneFloor,
    levelReq: 12,
    xp: 40,
    materials: [{ item: 'copper_ore', qty: 1 }],
    ticks: 25,
  },
  {
    id: 'hanging_sign',
    name: 'Hanging sign',
    tile: Tile.HangingSign,
    levelReq: 13,
    xp: 65,
    materials: [{ item: 'log', qty: 1 }, { item: 'twine', qty: 1 }],
    ticks: 30,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'counter',
    name: 'Counter',
    tile: Tile.Counter,
    levelReq: 14,
    xp: 80,
    materials: [{ item: 'oak_log', qty: 2 }, { item: 'log', qty: 1 }],
    ticks: 40,
    ground: FLOORS,
  },
  {
    id: 'stone_wall',
    name: 'Stone wall',
    tile: Tile.WallStone,
    levelReq: 15,
    xp: 45,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'log', qty: 1 }],
    ticks: 35,
    ground: OUTDOOR_AND_FLOORS,
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    tile: Tile.Bookshelf,
    levelReq: 16,
    xp: 95,
    materials: [{ item: 'oak_log', qty: 3 }, { item: 'leather', qty: 1 }],
    ticks: 45,
    ground: FLOORS,
  },
  {
    id: 'banner_pole',
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
    name: 'Furnace',
    tile: Tile.Furnace,
    levelReq: 20,
    xp: 150,
    materials: [{ item: 'iron_bar', qty: 2 }, { item: 'copper_ore', qty: 4 }],
    ticks: 70,
  },
  {
    id: 'stone_pillar',
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
    name: 'Anvil',
    tile: Tile.Anvil,
    levelReq: 25,
    xp: 200,
    materials: [{ item: 'iron_bar', qty: 4 }],
    ticks: 80,
  },
  {
    id: 'hearth',
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
];

export const BUILDABLES: ReadonlyMap<string, BuildableDef> = new Map(defs.map((d) => [d.id, d]));

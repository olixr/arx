import { Tile } from '@devcraft/shared';

/** Something a player can construct in the open world. */
export interface BuildableDef {
  id: string;
  name: string;
  tile: Tile;
  levelReq: number;
  xp: number;
  materials: Array<{ item: string; qty: number }>;
  ticks: number;
}

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
    id: 'campfire',
    name: 'Campfire',
    tile: Tile.Campfire,
    levelReq: 5,
    xp: 40,
    materials: [{ item: 'log', qty: 3 }],
    ticks: 40,
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
    id: 'stone_wall',
    name: 'Stone wall',
    tile: Tile.WallStone,
    levelReq: 15,
    xp: 45,
    materials: [{ item: 'copper_ore', qty: 1 }, { item: 'log', qty: 1 }],
    ticks: 35,
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
    id: 'anvil',
    name: 'Anvil',
    tile: Tile.Anvil,
    levelReq: 25,
    xp: 200,
    materials: [{ item: 'iron_bar', qty: 4 }],
    ticks: 80,
  },
];

export const BUILDABLES: ReadonlyMap<string, BuildableDef> = new Map(defs.map((d) => [d.id, d]));

/** Ground that may be built on. */
export const BUILDABLE_GROUND: readonly Tile[] = [
  Tile.Grass,
  Tile.GrassTall,
  Tile.Dirt,
  Tile.Sand,
];

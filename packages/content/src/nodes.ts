import { Tile, type SkillId } from '@devcraft/shared';
import type { ToolType } from './items.js';

/** A gatherable world tile: what it needs, gives, and becomes. */
export interface NodeDef {
  tile: Tile;
  name: string;
  skill: SkillId;
  levelReq: number;
  xp: number;
  yieldItem: string;
  tool: ToolType | null;
  /** Base ticks per gather attempt at power-1 tool. */
  baseTicks: number;
  /** Chance the node depletes after a successful gather. */
  depleteChance: number;
  /** What the tile becomes while depleted (null = never depletes). */
  depletedTile: Tile | null;
  respawnSec: number;
  /** Occasional extra find alongside the main yield (e.g. seeds). */
  bonusYield?: { item: string; chance: number };
}

export const NODES: readonly NodeDef[] = [
  {
    tile: Tile.Tree,
    name: 'Tree',
    skill: 'woodcutting',
    levelReq: 1,
    xp: 25,
    yieldItem: 'log',
    tool: 'axe',
    baseTicks: 50, // 2.5s
    depleteChance: 1,
    depletedTile: Tile.Stump,
    respawnSec: 12,
  },
  {
    tile: Tile.TreeOak,
    name: 'Oak tree',
    skill: 'woodcutting',
    levelReq: 15,
    xp: 60,
    yieldItem: 'oak_log',
    tool: 'axe',
    baseTicks: 70,
    depleteChance: 0.4,
    depletedTile: Tile.Stump,
    respawnSec: 20,
  },
  {
    tile: Tile.RockCopper,
    name: 'Copper rock',
    skill: 'mining',
    levelReq: 1,
    xp: 30,
    yieldItem: 'copper_ore',
    tool: 'pickaxe',
    baseTicks: 60,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 15,
  },
  {
    tile: Tile.RockTin,
    name: 'Tin rock',
    skill: 'mining',
    levelReq: 1,
    xp: 30,
    yieldItem: 'tin_ore',
    tool: 'pickaxe',
    baseTicks: 60,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 15,
  },
  {
    tile: Tile.RockIron,
    name: 'Iron rock',
    skill: 'mining',
    levelReq: 15,
    xp: 70,
    yieldItem: 'iron_ore',
    tool: 'pickaxe',
    baseTicks: 80,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 25,
  },
  {
    tile: Tile.RockCoal,
    name: 'Coal seam',
    skill: 'mining',
    levelReq: 20,
    xp: 85,
    yieldItem: 'coal',
    tool: 'pickaxe',
    baseTicks: 90,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 35,
  },
  {
    tile: Tile.RockGold,
    name: 'Gold vein',
    skill: 'mining',
    levelReq: 40,
    xp: 130,
    yieldItem: 'gold_ore',
    tool: 'pickaxe',
    baseTicks: 110,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 60,
  },
  {
    tile: Tile.FishingSpot,
    name: 'Fishing spot',
    skill: 'fishing',
    levelReq: 1,
    xp: 35,
    yieldItem: 'raw_trout',
    tool: 'rod',
    baseTicks: 80,
    depleteChance: 0,
    depletedTile: null,
    respawnSec: 0,
  },
  {
    tile: Tile.BerryBush,
    name: 'Berry bush',
    skill: 'foraging',
    levelReq: 1,
    xp: 20,
    yieldItem: 'berries',
    tool: null,
    baseTicks: 45,
    depleteChance: 1,
    depletedTile: Tile.Grass,
    respawnSec: 60,
  },
  {
    tile: Tile.FibrePlant,
    name: 'Fibre plant',
    skill: 'foraging',
    levelReq: 1,
    xp: 22,
    yieldItem: 'plant_fibre',
    tool: null,
    baseTicks: 45,
    depleteChance: 1,
    depletedTile: Tile.Grass,
    respawnSec: 60,
  },
  {
    tile: Tile.WildSagewort,
    name: 'Wild sagewort',
    skill: 'foraging',
    levelReq: 5,
    xp: 40,
    yieldItem: 'sagewort',
    tool: null,
    baseTicks: 55,
    depleteChance: 1,
    depletedTile: Tile.Grass,
    respawnSec: 75,
    bonusYield: { item: 'sagewort_seed', chance: 0.35 },
  },
  {
    tile: Tile.WildMoonbell,
    name: 'Wild moonbell',
    skill: 'foraging',
    levelReq: 20,
    xp: 75,
    yieldItem: 'moonbell',
    tool: null,
    baseTicks: 65,
    depleteChance: 1,
    depletedTile: Tile.Grass,
    respawnSec: 90,
    bonusYield: { item: 'moonbell_seed', chance: 0.35 },
  },
];

export const NODES_BY_TILE: ReadonlyMap<Tile, NodeDef> = new Map(NODES.map((n) => [n.tile, n]));

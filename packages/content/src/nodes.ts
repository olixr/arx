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
  /**
   * Minimum tool power (metal tier) the node accepts — a cheap tool
   * simply can't bite this material. THE BOOTSTRAP LAW: the ore a
   * tier's tool is forged from must be workable with the PREVIOUS
   * tier's tool (content.test pins it), so the ladder never deadlocks.
   * Omitted = 1 (any tool of the right type).
   */
  minPower?: number;
  /** Base ticks per gather attempt at power-1 tool. */
  baseTicks: number;
  /** Chance the node depletes after a successful gather. */
  depleteChance: number;
  /** What the tile becomes while depleted (null = never depletes). */
  depletedTile: Tile | null;
  respawnSec: number;
  /**
   * Occasional extra find alongside the main yield: a single item, or a
   * loot table rolled at this node's levelReq — the interaction-loot
   * hook (chests and other lootable props resolve the same way).
   */
  bonusYield?: { item?: string; table?: string; chance: number };
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
    // Regrowth is staged (stump -> sapling -> tree), so the wait reads
    // as growth, not a pop-in refresh.
    respawnSec: 18,
  },
  {
    tile: Tile.TreeOak,
    name: 'Oak tree',
    skill: 'woodcutting',
    levelReq: 15,
    xp: 60,
    yieldItem: 'oak_log',
    tool: 'axe',
    minPower: 2, // iron — bronze bounces off seasoned oak
    baseTicks: 70,
    depleteChance: 0.4,
    depletedTile: Tile.Stump,
    respawnSec: 32,
  },
  {
    tile: Tile.TreeWillow,
    name: 'Willow tree',
    skill: 'woodcutting',
    levelReq: 30,
    xp: 95,
    yieldItem: 'willow_log',
    tool: 'axe',
    minPower: 3, // steel
    baseTicks: 85,
    depleteChance: 0.35,
    depletedTile: Tile.Stump,
    respawnSec: 45,
  },
  {
    tile: Tile.TreeYew,
    name: 'Yew tree',
    skill: 'woodcutting',
    levelReq: 45,
    xp: 150,
    yieldItem: 'yew_log',
    tool: 'axe',
    minPower: 4, // mithril — yew heartwood eats lesser edges
    baseTicks: 110,
    depleteChance: 0.3,
    depletedTile: Tile.Stump,
    respawnSec: 75,
  },
  {
    tile: Tile.RockCopper,
    name: 'Copper rock',
    skill: 'mining',
    levelReq: 1,
    xp: 30,
    yieldItem: 'copper_ore',
    bonusYield: { item: 'emberstone', chance: 0.05 }, // warm seams hide warm stones
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
    bonusYield: { item: 'frostshard', chance: 0.05 }, // cold metal weeps cold glass
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
    minPower: 2, // iron — the seam that pays for the pick that opened it
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
    bonusYield: { item: 'stormpearl', chance: 0.06 }, // lightning finds gold first
    tool: 'pickaxe',
    minPower: 3, // steel
    baseTicks: 110,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 60,
  },
  {
    tile: Tile.RockSilver,
    name: 'Silver lode',
    skill: 'mining',
    levelReq: 30,
    xp: 105,
    yieldItem: 'silver_ore',
    bonusYield: { item: 'frostshard', chance: 0.05 }, // moon-metal sweats cold glass
    tool: 'pickaxe',
    minPower: 2, // iron
    baseTicks: 100,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 45,
  },
  {
    tile: Tile.RockMithril,
    name: 'Mithril spire',
    skill: 'mining',
    levelReq: 50,
    xp: 165,
    yieldItem: 'mithril_ore',
    bonusYield: { item: 'stormpearl', chance: 0.05 }, // the sky pays its debts
    tool: 'pickaxe',
    minPower: 3, // steel — bootstrap: steel frees the ore that forges the mithril pick
    baseTicks: 130,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 90,
  },
  {
    tile: Tile.RockAdamant,
    name: 'Adamant horns',
    skill: 'mining',
    levelReq: 65,
    xp: 210,
    yieldItem: 'adamant_ore',
    bonusYield: { item: 'bloomstone', chance: 0.05 }, // green stone keeps green company
    tool: 'pickaxe',
    minPower: 4, // mithril
    baseTicks: 150,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 120,
  },
  {
    tile: Tile.RockObsidian,
    name: 'Obsidian flow',
    skill: 'mining',
    levelReq: 78,
    xp: 260,
    yieldItem: 'obsidian_shard',
    bonusYield: { item: 'emberstone', chance: 0.07 }, // the flow never quite cooled
    tool: 'pickaxe',
    minPower: 5, // adamant
    baseTicks: 160,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 150,
  },
  {
    tile: Tile.RockStarfall,
    name: 'Starfall crater',
    skill: 'mining',
    levelReq: 90,
    xp: 330,
    yieldItem: 'starmetal_ore',
    bonusYield: { item: 'arcane_dust', chance: 0.2 }, // starlight rubs off
    tool: 'pickaxe',
    minPower: 5, // adamant — bootstrap: adamant digs the star that forges the starsteel pick
    baseTicks: 190,
    depleteChance: 1,
    depletedTile: Tile.RockDepleted,
    respawnSec: 240,
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
    bonusYield: { item: 'bloomstone', chance: 0.04 }, // a seed that chose stone
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
    bonusYield: { item: 'verdant_essence', chance: 0.08 }, // the wild's vigor, pressed green
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

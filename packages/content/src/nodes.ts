import { Tile, type SkillId } from '@arx/shared';
import { itemDef, type ToolType } from './items.js';

/** The growth dialects a node may claim (see growth.ts). */
export type NodeRenewal = 'tree' | 'ore' | 'bush' | 'forage';

/** A gatherable world tile: what it needs, gives, and becomes. */
export interface NodeDef {
  /** Content-doc slug (THE ROSTER SPEAKS — the Studio's handle). */
  id: string;
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
  /**
   * THE SPILLED SEED (second-growth Phase 4): rolled ONCE, on the
   * swing that fells the node — a falling wood sheds its seed, a
   * picked cane can be struck. The seed item plants back into WILD
   * ground through the seed picker (the sown line).
   */
  seedYield?: { item: string; chance: number };
  /**
   * Explicit growth-dialect override (second-growth Phase 5): absent,
   * the dialect derives from the skill (woodcutting = tree, mining =
   * ore, foraging = forage). The berry bush's bush-succession is DATA
   * now, not a hardcoded tile check — and the Studio can hand any
   * forage the same treatment.
   */
  renewal?: NodeRenewal;
}

/**
 * THE ROSTER SPEAKS (second-growth Phase 5): the node roster is a live
 * content registry under the two-hash law — this array is the shipped
 * seed AND the live table, swapped in place by replaceNodes. Read
 * NODES / NODES_BY_TILE at CALL TIME, never destructure into
 * long-lived state.
 */
export const NODES: NodeDef[] = [
  {
    id: 'tree',
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
    seedYield: { item: 'tree_seed', chance: 0.3 },
  },
  {
    id: 'tree_oak',
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
    seedYield: { item: 'acorn', chance: 0.35 },
  },
  {
    id: 'tree_pine',
    tile: Tile.TreePine,
    name: 'Pine tree',
    skill: 'woodcutting',
    levelReq: 22,
    xp: 75,
    yieldItem: 'pine_log',
    bonusYield: { item: 'pine_resin', chance: 0.3 }, // cut pine bleeds amber
    tool: 'axe',
    minPower: 2, // iron — resin gums a bronze edge to uselessness
    baseTicks: 78,
    depleteChance: 0.38,
    depletedTile: Tile.Stump,
    respawnSec: 38,
    seedYield: { item: 'pine_cone', chance: 0.35 },
  },
  {
    id: 'tree_willow',
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
    seedYield: { item: 'willow_cutting', chance: 0.35 },
  },
  {
    id: 'tree_yew',
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
    seedYield: { item: 'yew_seed', chance: 0.35 },
  },
  {
    id: 'rock_copper',
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
    id: 'rock_tin',
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
    id: 'rock_iron',
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
    id: 'rock_coal',
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
    id: 'rock_gold',
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
    id: 'rock_silver',
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
    id: 'rock_mithril',
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
    id: 'rock_adamant',
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
    id: 'rock_obsidian',
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
    id: 'rock_starfall',
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
    id: 'fishing_spot',
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
    id: 'berry_bush',
    tile: Tile.BerryBush,
    renewal: 'bush',
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
    seedYield: { item: 'bush_cutting', chance: 0.3 },
  },
  {
    id: 'fibre_plant',
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
    id: 'wild_sagewort',
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
    id: 'wild_moonbell',
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

const nodesByTile = new Map<Tile, NodeDef>(NODES.map((n) => [n.tile, n]));
export const NODES_BY_TILE: ReadonlyMap<Tile, NodeDef> = nodesByTile;

/** The shipped roster exactly as authored — the CMS revert target. */
export const AUTHORED_NODES: ReadonlyMap<string, NodeDef> = new Map(
  NODES.map((n) => [n.id, JSON.parse(JSON.stringify(n)) as NodeDef]),
);

export type ValidateNodeResult = { ok: true; def: NodeDef } | { ok: false; errors: string[] };

const NODE_SKILLS = new Set<SkillId>(['woodcutting', 'mining', 'fishing', 'foraging']);
const NODE_TOOLS = new Set<ToolType>(['axe', 'pickaxe', 'rod']);
const NODE_RENEWALS = new Set<NodeRenewal>(['tree', 'ore', 'bush', 'forage']);

/**
 * THE ONE VALIDATOR for the roster: every field bounds-checked, every
 * reference resolved (items by def, loot tables via the caller's
 * context), every cross-law named. Runs on DB rows at boot and on
 * every Studio save — a node that could orphan a yield or stall the
 * growth engine never reaches the live table.
 */
export function validateNodeDoc(
  raw: unknown,
  ctx: { lootTables: ReadonlySet<string> },
): ValidateNodeResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['node doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const id = typeof doc.id === 'string' ? doc.id : '';
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(id)) errors.push('id must be a lowercase slug');
  const tile = doc.tile;
  if (typeof tile !== 'number' || !Number.isInteger(tile) || Tile[tile as number] === undefined) {
    errors.push('tile must be a known tile id');
  }
  const name = typeof doc.name === 'string' ? doc.name : '';
  if (name.length < 2 || name.length > 40) errors.push('name must be 2-40 characters');
  if (!NODE_SKILLS.has(doc.skill as SkillId)) errors.push('skill must be a gathering skill');
  const num = (key: string, lo: number, hi: number, int = false): number => {
    const v = doc[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (int && !Number.isInteger(v)) errors.push(`${key} must be an integer`);
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };
  num('levelReq', 1, 99, true);
  num('xp', 1, 2000);
  num('baseTicks', 10, 2000, true);
  num('depleteChance', 0, 1);
  num('respawnSec', 0, 3600);
  if (doc.minPower !== undefined) num('minPower', 1, 6, true);
  if (typeof doc.yieldItem !== 'string' || !itemDef(doc.yieldItem)) {
    errors.push('yieldItem must name a real item');
  }
  if (doc.tool !== null && !NODE_TOOLS.has(doc.tool as ToolType)) {
    errors.push('tool must be axe, pickaxe, rod, or null');
  }
  if (doc.depletedTile !== null) {
    const dt = doc.depletedTile;
    if (typeof dt !== 'number' || !Number.isInteger(dt) || Tile[dt as number] === undefined) {
      errors.push('depletedTile must be a known tile id or null');
    }
  }
  const by = doc.bonusYield as { item?: unknown; table?: unknown; chance?: unknown } | undefined;
  if (by !== undefined) {
    if (typeof by !== 'object' || by === null) errors.push('bonusYield must be an object');
    else {
      if (typeof by.chance !== 'number' || by.chance <= 0 || by.chance > 1) {
        errors.push('bonusYield.chance must be in (0, 1]');
      }
      if (by.item !== undefined && (typeof by.item !== 'string' || !itemDef(by.item))) {
        errors.push('bonusYield.item must name a real item');
      }
      if (by.table !== undefined && (typeof by.table !== 'string' || !ctx.lootTables.has(by.table))) {
        errors.push('bonusYield.table must name a real loot table');
      }
      if (by.item === undefined && by.table === undefined) {
        errors.push('bonusYield needs an item or a table');
      }
    }
  }
  const sy = doc.seedYield as { item?: unknown; chance?: unknown } | undefined;
  if (sy !== undefined) {
    if (typeof sy !== 'object' || sy === null) errors.push('seedYield must be an object');
    else {
      if (typeof sy.item !== 'string' || !itemDef(sy.item as string)) {
        errors.push('seedYield.item must name a real item');
      }
      if (typeof sy.chance !== 'number' || sy.chance <= 0 || sy.chance > 1) {
        errors.push('seedYield.chance must be in (0, 1]');
      }
    }
  }
  if (doc.renewal !== undefined && !NODE_RENEWALS.has(doc.renewal as NodeRenewal)) {
    errors.push('renewal must be tree, ore, bush, or forage');
  }
  // Cross-laws, named:
  if (doc.depletedTile === null && (doc.depleteChance as number) > 0) {
    errors.push('a node with no depleted tile must never deplete (chance 0)');
  }
  const known = new Set([
    'id', 'tile', 'name', 'skill', 'levelReq', 'xp', 'yieldItem', 'tool', 'minPower',
    'baseTicks', 'depleteChance', 'depletedTile', 'respawnSec', 'bonusYield', 'seedYield',
    'renewal',
  ]);
  for (const key of Object.keys(doc)) {
    if (!known.has(key)) errors.push(`unknown field '${key}'`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def: doc as unknown as NodeDef };
}

/**
 * THE CMS HOOK: swap the live roster in place — NODES and
 * NODES_BY_TILE keep their identities, so every call-time reader sees
 * the Studio's edit on the very next gather. Duplicate tiles refuse
 * wholesale (two defs on one tile would make interact() a coin toss).
 */
export function replaceNodes(defs: readonly NodeDef[]): void {
  const tiles = new Set<Tile>();
  for (const d of defs) {
    if (tiles.has(d.tile)) throw new Error(`duplicate node tile ${Tile[d.tile]}`);
    tiles.add(d.tile);
  }
  NODES.length = 0;
  NODES.push(...defs);
  nodesByTile.clear();
  for (const d of defs) nodesByTile.set(d.tile, d);
}

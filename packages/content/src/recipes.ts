import type { SkillId, StationType } from '@devcraft/shared';

export interface RecipeDef {
  id: string;
  name: string;
  skill: SkillId;
  levelReq: number;
  xp: number;
  /** Required adjacent station; null = craftable anywhere. */
  station: StationType | null;
  inputs: Array<{ item: string; qty: number }>;
  output: { item: string; qty: number };
  /** Ticks per craft. */
  ticks: number;
  /** Cooking-style failure chance at the required level (fades with levels). */
  burnChance?: number;
  burnResult?: string;
}

const defs: RecipeDef[] = [
  // ------------------------------------------------ cooking (fire)
  {
    id: 'cook_trout',
    name: 'Trout',
    skill: 'cooking',
    levelReq: 1,
    xp: 30,
    station: 'fire',
    inputs: [{ item: 'raw_trout', qty: 1 }],
    output: { item: 'trout', qty: 1 },
    ticks: 30,
    burnChance: 0.3,
    burnResult: 'burnt_food',
  },
  {
    id: 'cook_chicken',
    name: 'Cooked chicken',
    skill: 'cooking',
    levelReq: 1,
    xp: 25,
    station: 'fire',
    inputs: [{ item: 'raw_chicken', qty: 1 }],
    output: { item: 'cooked_chicken', qty: 1 },
    ticks: 30,
    burnChance: 0.25,
    burnResult: 'burnt_food',
  },
  {
    id: 'cook_beef',
    name: 'Cooked beef',
    skill: 'cooking',
    levelReq: 1,
    xp: 28,
    station: 'fire',
    inputs: [{ item: 'raw_beef', qty: 1 }],
    output: { item: 'cooked_beef', qty: 1 },
    ticks: 30,
    burnChance: 0.25,
    burnResult: 'burnt_food',
  },

  // ------------------------------------------------ smithing
  {
    id: 'smelt_bronze',
    name: 'Bronze bar',
    skill: 'smithing',
    levelReq: 1,
    xp: 25,
    station: 'furnace',
    // The classic alloy: one copper, one tin.
    inputs: [
      { item: 'copper_ore', qty: 1 },
      { item: 'tin_ore', qty: 1 },
    ],
    output: { item: 'bronze_bar', qty: 1 },
    ticks: 40,
  },
  {
    id: 'smelt_iron',
    name: 'Iron bar',
    skill: 'smithing',
    levelReq: 15,
    xp: 50,
    station: 'furnace',
    inputs: [{ item: 'iron_ore', qty: 1 }],
    output: { item: 'iron_bar', qty: 1 },
    ticks: 50,
  },
  {
    id: 'smelt_steel',
    name: 'Steel bar',
    skill: 'smithing',
    levelReq: 30,
    xp: 80,
    station: 'furnace',
    inputs: [
      { item: 'iron_ore', qty: 1 },
      { item: 'coal', qty: 2 },
    ],
    output: { item: 'steel_bar', qty: 1 },
    ticks: 60,
  },
  {
    id: 'smelt_gold',
    name: 'Gold bar',
    skill: 'smithing',
    levelReq: 40,
    xp: 90,
    station: 'furnace',
    inputs: [{ item: 'gold_ore', qty: 1 }],
    output: { item: 'gold_bar', qty: 1 },
    ticks: 50,
  },
  {
    id: 'smith_bronze_sword',
    name: 'Bronze sword',
    skill: 'smithing',
    levelReq: 4,
    xp: 60,
    station: 'anvil',
    inputs: [{ item: 'bronze_bar', qty: 2 }],
    output: { item: 'bronze_sword', qty: 1 },
    ticks: 60,
  },
  {
    id: 'smith_iron_sword',
    name: 'Iron sword',
    skill: 'smithing',
    levelReq: 18,
    xp: 130,
    station: 'anvil',
    inputs: [{ item: 'iron_bar', qty: 2 }],
    output: { item: 'iron_sword', qty: 1 },
    ticks: 70,
  },
  {
    id: 'smith_steel_sword',
    name: 'Steel sword',
    skill: 'smithing',
    levelReq: 33,
    xp: 250,
    station: 'anvil',
    inputs: [{ item: 'steel_bar', qty: 2 }],
    output: { item: 'steel_sword', qty: 1 },
    ticks: 80,
  },
  {
    id: 'smith_gold_ring',
    name: 'Gold ring',
    skill: 'smithing',
    levelReq: 42,
    xp: 160,
    station: 'anvil',
    inputs: [{ item: 'gold_bar', qty: 1 }],
    output: { item: 'gold_ring', qty: 1 },
    ticks: 60,
  },

  // ------------------------------------------------ crafting
  {
    id: 'craft_leather',
    name: 'Leather',
    skill: 'crafting',
    levelReq: 1,
    xp: 20,
    station: 'workbench',
    inputs: [{ item: 'cowhide', qty: 1 }],
    output: { item: 'leather', qty: 1 },
    ticks: 30,
  },
  {
    id: 'craft_leather_body',
    name: 'Leather body',
    skill: 'crafting',
    levelReq: 8,
    xp: 75,
    station: 'workbench',
    inputs: [{ item: 'leather', qty: 3 }],
    output: { item: 'leather_body', qty: 1 },
    ticks: 60,
  },
  {
    id: 'fletch_arrows',
    name: 'Arrows (x10)',
    skill: 'crafting',
    levelReq: 1,
    xp: 25,
    station: null,
    inputs: [
      { item: 'log', qty: 1 },
      { item: 'feather', qty: 5 },
    ],
    output: { item: 'arrow', qty: 10 },
    ticks: 40,
  },
  {
    id: 'fletch_oak_shortbow',
    name: 'Oak shortbow',
    skill: 'crafting',
    levelReq: 10,
    xp: 80,
    station: null,
    inputs: [{ item: 'oak_log', qty: 2 }],
    output: { item: 'oak_shortbow', qty: 1 },
    ticks: 60,
  },
];

export const RECIPES: ReadonlyMap<string, RecipeDef> = new Map(defs.map((d) => [d.id, d]));

export function recipesForStation(station: StationType | null): RecipeDef[] {
  return [...RECIPES.values()].filter((r) => r.station === station);
}

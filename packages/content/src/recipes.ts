import type { SkillId, StationType } from '@devcraft/shared';
import { COMPILED_EQUIPMENT } from './equipment/defs.js';
import { ELEMENT_GEM, ELEMENT_REAGENT, ENCHANT_DEFS } from './equipment/enchants.js';

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
  // Sword and dagger recipes are generated from the blade/rogue rosters
  // in equipment/defs.ts (craft_<itemId>) — smithing lines, bespoke crafts.
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

  // ------------------------------------------------ leatherworking / woodworking / tailoring basics
  {
    id: 'craft_leather',
    name: 'Leather',
    skill: 'leatherworking',
    levelReq: 1,
    xp: 20,
    station: 'tanning_rack',
    inputs: [{ item: 'cowhide', qty: 1 }],
    output: { item: 'leather', qty: 1 },
    ticks: 30,
  },
  // (leather_body's recipe now generates from equipment/defs.ts)
  {
    id: 'craft_leather_scraps',
    name: 'Leather (from scraps)',
    skill: 'leatherworking',
    levelReq: 3,
    xp: 24,
    station: 'tanning_rack',
    inputs: [{ item: 'scrap_hide', qty: 3 }],
    output: { item: 'leather', qty: 1 },
    ticks: 35,
  },
  {
    id: 'craft_hardened_leather',
    name: 'Hardened leather',
    skill: 'leatherworking',
    levelReq: 20,
    xp: 90,
    station: 'tanning_rack',
    inputs: [
      { item: 'leather', qty: 2 },
      { item: 'oak_log', qty: 1 },
    ],
    output: { item: 'hardened_leather', qty: 1 },
    ticks: 55,
  },
  {
    id: 'weave_linen',
    name: 'Linen',
    skill: 'tailoring',
    levelReq: 6,
    xp: 30,
    station: 'loom',
    inputs: [{ item: 'linen_scrap', qty: 3 }],
    output: { item: 'linen', qty: 1 },
    ticks: 35,
  },
  {
    id: 'weave_gloomsilk',
    name: 'Gloomsilk',
    skill: 'tailoring',
    levelReq: 30,
    xp: 150,
    station: 'loom',
    inputs: [{ item: 'gloomsilk_thread', qty: 2 }],
    output: { item: 'gloomsilk', qty: 1 },
    ticks: 60,
  },
  {
    id: 'fletch_arrows',
    name: 'Arrows (x10)',
    skill: 'woodworking',
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
  // (bow recipes now generate from equipment/defs.ts — the archer's roster)

  // Passive gear — craftable builds, not just lucky drops.
  {
    id: 'smith_spiked_buckler',
    name: 'Spiked buckler',
    skill: 'smithing',
    levelReq: 18,
    xp: 120,
    station: 'anvil',
    inputs: [{ item: 'iron_bar', qty: 2 }],
    output: { item: 'spiked_buckler', qty: 1 },
    ticks: 70,
  },
  {
    id: 'craft_wolf_pelt_cloak',
    name: 'Wolf-pelt cloak',
    skill: 'leatherworking',
    levelReq: 14,
    xp: 110,
    station: 'tanning_rack',
    inputs: [
      { item: 'wolf_fur', qty: 3 },
      { item: 'leather', qty: 1 },
    ],
    output: { item: 'wolf_pelt_cloak', qty: 1 },
    ticks: 70,
  },
  {
    id: 'craft_frost_quiver',
    name: 'Frost quiver',
    skill: 'leatherworking',
    levelReq: 20,
    xp: 140,
    station: 'tanning_rack',
    inputs: [
      { item: 'leather', qty: 2 },
      { item: 'gold_bar', qty: 1 },
    ],
    output: { item: 'frost_quiver', qty: 1 },
    ticks: 80,
  },
  {
    id: 'craft_cape_traveler',
    name: "Traveler's cape",
    skill: 'leatherworking',
    levelReq: 8,
    xp: 80,
    station: 'tanning_rack',
    inputs: [
      { item: 'leather', qty: 2 },
      { item: 'wolf_fur', qty: 1 },
    ],
    output: { item: 'cape_traveler', qty: 1 },
    ticks: 60,
  },
  {
    id: 'craft_cape_ragged',
    name: 'Ragged cloak',
    skill: 'leatherworking',
    levelReq: 2,
    xp: 30,
    station: 'tanning_rack',
    inputs: [{ item: 'leather', qty: 2 }],
    output: { item: 'cape_ragged', qty: 1 },
    ticks: 40,
  },
  {
    id: 'craft_cape_huntsman',
    name: "Huntsman's drape",
    skill: 'leatherworking',
    levelReq: 20,
    xp: 150,
    station: 'tanning_rack',
    inputs: [
      { item: 'leather', qty: 3 },
      { item: 'wolf_fur', qty: 2 },
    ],
    output: { item: 'cape_huntsman', qty: 1 },
    ticks: 80,
  },
  {
    id: 'craft_cape_gilded',
    name: 'Gilded cape',
    skill: 'leatherworking',
    levelReq: 26,
    xp: 210,
    station: 'tanning_rack',
    inputs: [
      { item: 'leather', qty: 2 },
      { item: 'gold_bar', qty: 2 },
    ],
    output: { item: 'cape_gilded', qty: 1 },
    ticks: 90,
  },

  // ------------------------------------------------ homestead cooking
  {
    id: 'mill_flour',
    name: 'Flour',
    skill: 'cooking',
    levelReq: 5,
    xp: 15,
    station: 'workbench',
    inputs: [{ item: 'wheat', qty: 2 }],
    output: { item: 'flour', qty: 1 },
    ticks: 25,
  },
  {
    id: 'cook_bread',
    name: 'Bread',
    skill: 'cooking',
    levelReq: 8,
    xp: 40,
    station: 'fire',
    inputs: [{ item: 'flour', qty: 1 }],
    output: { item: 'bread', qty: 1 },
    ticks: 35,
    burnChance: 0.25,
    burnResult: 'burnt_food',
  },
  {
    id: 'cook_fried_egg',
    name: 'Fried egg',
    skill: 'cooking',
    levelReq: 1,
    xp: 20,
    station: 'fire',
    inputs: [{ item: 'egg', qty: 1 }],
    output: { item: 'fried_egg', qty: 1 },
    ticks: 25,
    burnChance: 0.25,
    burnResult: 'burnt_food',
  },
  {
    id: 'cook_hearty_stew',
    name: 'Hearty stew',
    skill: 'cooking',
    levelReq: 12,
    xp: 65,
    station: 'fire',
    inputs: [
      { item: 'carrot', qty: 1 },
      { item: 'raw_beef', qty: 1 },
    ],
    output: { item: 'hearty_stew', qty: 1 },
    ticks: 45,
    burnChance: 0.2,
    burnResult: 'burnt_food',
  },
  {
    id: 'cook_cake',
    name: 'Cake',
    skill: 'cooking',
    levelReq: 15,
    xp: 90,
    station: 'fire',
    inputs: [
      { item: 'flour', qty: 1 },
      { item: 'egg', qty: 1 },
      { item: 'milk', qty: 1 },
    ],
    output: { item: 'cake', qty: 1 },
    ticks: 55,
    burnChance: 0.2,
    burnResult: 'burnt_food',
  },

  // ------------------------------------------------ homestead crafting
  {
    id: 'craft_twine',
    name: 'Twine',
    skill: 'tailoring',
    levelReq: 1,
    xp: 12,
    station: null,
    inputs: [{ item: 'plant_fibre', qty: 2 }],
    output: { item: 'twine', qty: 1 },
    ticks: 20,
  },
  {
    id: 'craft_cloth',
    name: 'Cloth',
    skill: 'tailoring',
    levelReq: 10,
    xp: 40,
    station: 'loom',
    inputs: [{ item: 'cotton', qty: 2 }],
    output: { item: 'cloth', qty: 1 },
    ticks: 35,
  },
  // (flower_crown's recipe now generates from equipment/defs.ts)
  {
    id: 'smith_watering_can',
    name: 'Watering can',
    skill: 'smithing',
    levelReq: 5,
    xp: 40,
    station: 'anvil',
    inputs: [{ item: 'bronze_bar', qty: 1 }],
    output: { item: 'watering_can', qty: 1 },
    ticks: 40,
  },

  // ------------------------------------------------ herbalism (alembic)
  {
    id: 'brew_healing_tincture',
    name: 'Healing tincture',
    skill: 'herbalism',
    levelReq: 1,
    xp: 30,
    station: 'alembic',
    inputs: [
      { item: 'sagewort', qty: 1 },
      { item: 'berries', qty: 1 },
    ],
    output: { item: 'healing_tincture', qty: 1 },
    ticks: 35,
  },
  {
    id: 'brew_gatherers_brew',
    name: 'Gatherer\'s brew',
    skill: 'herbalism',
    levelReq: 5,
    xp: 45,
    station: 'alembic',
    inputs: [
      { item: 'sagewort', qty: 1 },
      { item: 'carrot', qty: 1 },
    ],
    output: { item: 'gatherers_brew', qty: 1 },
    ticks: 40,
  },
  {
    id: 'brew_swiftness_tonic',
    name: 'Swiftness tonic',
    skill: 'herbalism',
    levelReq: 10,
    xp: 60,
    station: 'alembic',
    inputs: [
      { item: 'sunflower', qty: 1 },
      { item: 'sagewort', qty: 1 },
    ],
    output: { item: 'swiftness_tonic', qty: 1 },
    ticks: 45,
  },
  {
    id: 'brew_ironbark_tonic',
    name: 'Ironbark tonic',
    skill: 'herbalism',
    levelReq: 15,
    xp: 80,
    station: 'alembic',
    inputs: [
      { item: 'moonbell', qty: 1 },
      { item: 'milk', qty: 1 },
    ],
    output: { item: 'ironbark_tonic', qty: 1 },
    ticks: 50,
  },
  {
    id: 'brew_mending_salve',
    name: 'Mending salve',
    skill: 'herbalism',
    levelReq: 25,
    xp: 120,
    station: 'alembic',
    inputs: [
      { item: 'moonbell', qty: 2 },
      { item: 'milk', qty: 1 },
    ],
    output: { item: 'mending_salve', qty: 1 },
    ticks: 60,
  },

  // ------------------------------- poison-making (alembic, dark branch)
  {
    id: 'brew_adderfang_oil',
    name: 'Adderfang oil',
    skill: 'herbalism',
    levelReq: 8,
    xp: 50,
    station: 'alembic',
    inputs: [
      { item: 'venom_gland', qty: 1 },
      { item: 'sagewort', qty: 1 },
    ],
    output: { item: 'adderfang_oil', qty: 1 },
    ticks: 45,
  },
  {
    id: 'brew_hobble_brew',
    name: 'Hobblebrew',
    skill: 'herbalism',
    levelReq: 14,
    xp: 70,
    station: 'alembic',
    inputs: [
      { item: 'moonbell', qty: 1 },
      { item: 'berries', qty: 2 },
    ],
    output: { item: 'hobble_brew', qty: 1 },
    ticks: 50,
  },
  {
    id: 'brew_vipers_kiss',
    name: 'Viper\'s kiss',
    skill: 'herbalism',
    levelReq: 22,
    xp: 110,
    station: 'alembic',
    inputs: [
      { item: 'venom_gland', qty: 2 },
      { item: 'moonbell', qty: 1 },
    ],
    output: { item: 'vipers_kiss', qty: 1 },
    ticks: 55,
  },
  {
    id: 'brew_leadfoot_oil',
    name: 'Leadfoot oil',
    skill: 'herbalism',
    levelReq: 30,
    xp: 150,
    station: 'alembic',
    inputs: [
      { item: 'venom_gland', qty: 1 },
      { item: 'moonbell', qty: 2 },
    ],
    output: { item: 'leadfoot_oil', qty: 1 },
    ticks: 60,
  },
  {
    id: 'brew_wyrmtongue_oil',
    name: 'Wyrmtongue oil',
    skill: 'herbalism',
    levelReq: 40,
    xp: 220,
    station: 'alembic',
    inputs: [
      { item: 'venom_gland', qty: 3 },
      { item: 'moonbell', qty: 2 },
    ],
    output: { item: 'wyrmtongue_oil', qty: 1 },
    ticks: 70,
  },
];

/**
 * Enchanting recipes, generated from the enchant roster. Reagent law:
 * every scroll takes arcane dust (the universal binder, scaling by
 * tier), elemental scrolls add their element's essence, and tier-3
 * capstones demand the element's gem (or a gold bar where no gem
 * exists) — the dungeon-chase ingredient.
 */
const DUST_BY_TIER: Record<1 | 2 | 3, number> = { 1: 2, 2: 4, 3: 8 };
const ESSENCE_BY_TIER: Record<1 | 2 | 3, number> = { 1: 1, 2: 2, 3: 4 };
const XP_BY_TIER: Record<1 | 2 | 3, number> = { 1: 30, 2: 75, 3: 150 };
const TICKS_BY_TIER: Record<1 | 2 | 3, number> = { 1: 35, 2: 50, 3: 65 };

const enchantRecipes: RecipeDef[] = ENCHANT_DEFS.map((e) => {
  const inputs: Array<{ item: string; qty: number }> = [
    { item: 'arcane_dust', qty: DUST_BY_TIER[e.tier] },
  ];
  const reagent = ELEMENT_REAGENT[e.element];
  if (reagent) inputs.push({ item: reagent, qty: ESSENCE_BY_TIER[e.tier] });
  if (e.tier === 3) inputs.push({ item: ELEMENT_GEM[e.element] ?? 'gold_bar', qty: 1 });
  return {
    id: `inscribe_${e.id}`,
    name: `${e.name} Scroll`,
    skill: 'enchanting' as SkillId,
    levelReq: e.level,
    xp: XP_BY_TIER[e.tier],
    station: 'enchanting_table' as StationType,
    inputs,
    output: { item: `scroll_${e.id}`, qty: 1 },
    ticks: TICKS_BY_TIER[e.tier],
  };
});

// Gem grinding — the entry rung and the gem sink: any element gem
// crushes into binder dust.
const grindRecipes: RecipeDef[] = Object.entries(ELEMENT_GEM).map(([, gem]) => ({
  id: `grind_${gem}`,
  name: `Grind ${gem.replace(/_/g, ' ')}`,
  skill: 'enchanting' as SkillId,
  levelReq: 1,
  xp: 15,
  station: 'enchanting_table' as StationType,
  inputs: [{ item: gem, qty: 1 }],
  output: { item: 'arcane_dust', qty: 3 },
  ticks: 25,
}));

const allRecipes: RecipeDef[] = [...defs, ...enchantRecipes, ...grindRecipes, ...COMPILED_EQUIPMENT.recipes];

export const RECIPES: ReadonlyMap<string, RecipeDef> = new Map(allRecipes.map((d) => [d.id, d]));

if (RECIPES.size !== allRecipes.length) {
  throw new Error('duplicate recipe id between inline defs and compiled equipment');
}

export function recipesForStation(station: StationType | null): RecipeDef[] {
  return [...RECIPES.values()].filter((r) => r.station === station);
}

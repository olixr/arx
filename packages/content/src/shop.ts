/**
 * THE SHOPS OF THE REALM. Each shop is a stock list with fixed prices
 * and infinite supply; selling anything anywhere pays half its item
 * value. 'general_store' is the counter-tile shop the starter town has
 * always had; the trainer shops hang off ACTORS (NpcActorDef.shop) —
 * talk to the profession's trainer and their wares open.
 *
 * Trainer stock is GENERATED: every trainer-unlock recipe's scroll,
 * sold by the profession that teaches it, priced by the recipe's
 * level. Drop-unlock recipes never reach a shelf — the world hides
 * those on purpose.
 */
import type { SkillId } from '@devcraft/shared';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';

export interface ShopEntry {
  item: string;
  /** Purchase price; selling anything pays half its item value. */
  price: number;
}

export interface ShopDef {
  id: string;
  /** Shelf-board title shown at the top of the store screen. */
  name: string;
  stock: readonly ShopEntry[];
}

/** What the guild charges to put its knowledge on paper. */
export function trainerPrice(levelReq: number): number {
  // Steepens with the ladder: lvl 12 ≈ 300c, lvl 30 ≈ 900c, lvl 39 ≈ 1.3k.
  return Math.round((60 + levelReq * 20 + levelReq * levelReq * 0.5) / 5) * 5;
}

/** Every trainer-taught scroll for the given professions, by level. */
function trainerStock(skills: SkillId[]): ShopEntry[] {
  return UNLOCKABLE_RECIPES.filter((r) => r.unlock === 'trainer' && skills.includes(r.skill))
    .sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name))
    .map((r) => ({ item: recipeScrollId(r.id), price: trainerPrice(r.levelReq) }));
}

export const GENERAL_STORE: readonly ShopEntry[] = [
  { item: 'bronze_axe', price: 25 },
  { item: 'bronze_pickaxe', price: 25 },
  { item: 'fishing_rod', price: 20 },
  { item: 'bronze_sword', price: 40 },
  { item: 'shortbow', price: 45 },
  { item: 'arrow', price: 3 },
  { item: 'apprentice_staff', price: 55 },
  // One starter relic on the shelf so the E slot is discoverable
  // without a lucky drop; the rest are monster-hunted.
  { item: 'snare_kit', price: 300 },
  // Starter farming: herb seeds are foraging-only finds.
  { item: 'carrot_seed', price: 5 },
  { item: 'sunflower_seed', price: 15 },
  { item: 'wheat_seed', price: 20 },
  { item: 'cotton_seed', price: 30 },
  { item: 'watering_can', price: 30 },
  // Basic outfitting — always the fixed common baseline; better rolls
  // come from the anvil, the workbench, or the wilds.
  { item: 'leather_boots', price: 60 },
  { item: 'woven_trousers', price: 55 },
  // Tobbin's cookbook shelf — the town's two taught dishes live at
  // the general counter; there is no separate cooking trainer yet.
  ...trainerStock(['cooking']),
];

/**
 * The frontier counter: everything a road asks of you, at a frontier
 * markup — the waystation is a lifeline, not a bargain. Brass keys on
 * the shelf close the strongbox economy's loop: the deep-band iron
 * chests always have an answer, if you can pay for it.
 */
export const WAYSTATION_SUPPLIES: readonly ShopEntry[] = [
  { item: 'bread', price: 25 },
  { item: 'cooked_beef', price: 15 },
  { item: 'hearty_stew', price: 45 },
  { item: 'healing_tincture', price: 55 },
  { item: 'mending_salve', price: 165 },
  { item: 'swiftness_tonic', price: 110 },
  { item: 'ironbark_tonic', price: 130 },
  { item: 'arrow', price: 5 },
  { item: 'brass_key', price: 240 },
];

/**
 * The hamlet larder — what a croft can spare, priced like the
 * neighbors you are: food off the land, nothing exotic.
 */
export const HAMLET_LARDER: readonly ShopEntry[] = [
  { item: 'bread', price: 18 },
  { item: 'egg', price: 8 },
  { item: 'milk', price: 12 },
  { item: 'cooked_beef', price: 14 },
  { item: 'hearty_stew', price: 40 },
];

/**
 * Edda's stores at the Last Lamp — the final resupply before the
 * Silverspine climb. Everything the dark ahead will ask of you,
 * priced like the last chance it is.
 */
export const LAST_LAMP_STORES: readonly ShopEntry[] = [
  { item: 'bread', price: 30 },
  { item: 'hearty_stew', price: 55 },
  { item: 'healing_tincture', price: 60 },
  { item: 'mending_salve', price: 175 },
  { item: 'swiftness_tonic', price: 120 },
  { item: 'ironbark_tonic', price: 140 },
  { item: 'arrow', price: 6 },
  { item: 'brass_key', price: 260 },
];

const defs: ShopDef[] = [
  { id: 'general_store', name: 'General Store', stock: GENERAL_STORE },
  { id: 'waystation_supplies', name: "The Wayfarer's Pack", stock: WAYSTATION_SUPPLIES },
  { id: 'hamlet_larder', name: 'The Croft Larder', stock: HAMLET_LARDER },
  { id: 'last_lamp_stores', name: "Edda's Stores", stock: LAST_LAMP_STORES },
  // Amberford's counters — every shopkeeper a person, every shelf a
  // livelihood (Epic 6: the people pass).
  {
    id: 'merra_goods',
    name: "Merra's Provisions",
    stock: [
      { item: 'bread', price: 10 },
      { item: 'egg', price: 6 },
      { item: 'milk', price: 8 },
      { item: 'berries', price: 4 },
      { item: 'carrot', price: 5 },
      { item: 'flour', price: 9 },
      { item: 'twine', price: 7 },
      { item: 'plant_fibre', price: 4 },
    ],
  },
  {
    id: 'dunna_board',
    name: "The Wanderer's Table",
    stock: [
      { item: 'hearty_stew', price: 26 },
      { item: 'bread', price: 10 },
      { item: 'cooked_beef', price: 22 },
      { item: 'fried_egg', price: 12 },
      { item: 'cake', price: 45 },
      { item: 'milk', price: 8 },
    ],
  },
  {
    id: 'garton_mill',
    name: 'The Millstone',
    stock: [
      { item: 'flour', price: 8 },
      { item: 'wheat', price: 5 },
      { item: 'bread', price: 9 },
    ],
  },
  {
    id: 'peld_catch',
    name: "Peld's Catch",
    stock: [
      { item: 'raw_trout', price: 14 },
      { item: 'trout', price: 24 },
      { item: 'fishing_rod', price: 60 },
    ],
  },
  {
    id: 'hask_outfitting',
    name: "Hask's Outfitting",
    stock: [
      { item: 'arrow', price: 6 },
      { item: 'snare_kit', price: 90 },
      { item: 'straw_decoy', price: 70 },
      { item: 'bronze_axe', price: 55 },
      { item: 'bronze_pickaxe', price: 55 },
      { item: 'fishing_rod', price: 60 },
      { item: 'leather_hood', price: 48 },
      { item: 'leather_body', price: 80 },
      { item: 'leather_boots', price: 40 },
      { item: 'leather_gloves', price: 36 },
      { item: 'cape_traveler', price: 120 },
      { item: 'healing_tincture', price: 65 },
    ],
  },
  // Silverfall's counters — the mountain trades at mountain prices.
  {
    id: 'balla_stock',
    name: 'The Grand Rack',
    stock: [
      { item: 'bronze_bar', price: 30 },
      { item: 'iron_bar', price: 60 },
      { item: 'steel_bar', price: 130 },
      { item: 'silver_bar', price: 180 },
      { item: 'coal', price: 18 },
    ],
  },
  {
    id: 'ottilie_bolts',
    name: "Ottilie's Bolts",
    stock: [
      { item: 'cloth', price: 20 },
      { item: 'linen', price: 46 },
      { item: 'cotton', price: 8 },
      { item: 'twine', price: 7 },
      { item: 'leather', price: 26 },
    ],
  },
  {
    id: 'wyn_remedies',
    name: "Wyn's Remedies",
    stock: [
      { item: 'healing_tincture', price: 60 },
      { item: 'mending_salve', price: 85 },
      { item: 'gatherers_brew', price: 95 },
      { item: 'swiftness_tonic', price: 110 },
      { item: 'ironbark_tonic', price: 130 },
      { item: 'sagewort', price: 10 },
      { item: 'moonbell', price: 16 },
    ],
  },
  {
    id: 'signy_board',
    name: "Signy's Terrace Kitchen",
    stock: [
      { item: 'hearty_stew', price: 24 },
      { item: 'bread', price: 9 },
      { item: 'cooked_beef', price: 22 },
      { item: 'trout', price: 20 },
      { item: 'fried_egg', price: 11 },
      { item: 'milk', price: 8 },
    ],
  },
  {
    id: 'galleria_stalls',
    name: 'The Galleria',
    stock: [
      { item: 'cloth', price: 22 },
      { item: 'leather', price: 28 },
      { item: 'silver_ring', price: 220 },
      { item: 'gold_ring', price: 320 },
      { item: 'arcane_dust', price: 90 },
      { item: 'cape_traveler', price: 130 },
    ],
  },
  {
    id: 'gate_market_stock',
    name: 'The Gate Market',
    stock: [
      { item: 'raw_trout', price: 12 },
      { item: 'trout', price: 22 },
      { item: 'coal', price: 16 },
      { item: 'iron_ore', price: 30 },
      { item: 'silver_ore', price: 70 },
      { item: 'bread', price: 11 },
    ],
  },
  // The Deep Market's counters.
  {
    id: 'varga_ore',
    name: "Varga's Scales",
    stock: [
      { item: 'copper_ore', price: 12 },
      { item: 'tin_ore', price: 12 },
      { item: 'iron_ore', price: 28 },
      { item: 'coal', price: 15 },
      { item: 'gold_ore', price: 90 },
      { item: 'silver_ore', price: 65 },
      { item: 'iron_bar', price: 62 },
    ],
  },
  {
    id: 'ninebrass_curios',
    name: "Ninebrass's Curios",
    stock: [
      { item: 'emberstone', price: 240 },
      { item: 'frostshard', price: 240 },
      { item: 'stormpearl', price: 260 },
      { item: 'bloomstone', price: 240 },
      { item: 'arcane_dust', price: 85 },
      { item: 'silver_ring', price: 210 },
      { item: 'brass_key', price: 250 },
    ],
  },
  // Bretta sells the forge's knowledge: every guild-taught schematic
  // in the smithing line, jewellery to platebodies.
  { id: 'trainer_smithing', name: 'Ironhewn Schematics', stock: trainerStock(['smithing']) },
  // Tilo's hall covers the soft trades: leather, cloth, and carved wood.
  {
    id: 'trainer_artisan',
    name: "Tilo's Patterns",
    stock: trainerStock(['leatherworking', 'tailoring', 'woodworking']),
  },
  // Elowen keeps the brewing formulas and the enchanter's treatises.
  {
    id: 'trainer_sage',
    name: "Elowen's Folios",
    stock: trainerStock(['herbalism', 'enchanting']),
  },
];

export const SHOPS: ReadonlyMap<string, ShopDef> = new Map(defs.map((d) => [d.id, d]));

export function shopDef(id: string): ShopDef | undefined {
  return SHOPS.get(id);
}

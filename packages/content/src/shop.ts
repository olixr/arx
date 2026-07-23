/**
 * THE SHOPS OF THE REALM. Each shop is a stock list with fixed prices
 * and infinite supply; selling anything anywhere pays half its item
 * value. 'general_store' is the counter-tile shop Bramblewick has
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

const defs: ShopDef[] = [
  { id: 'general_store', name: 'General Store', stock: GENERAL_STORE },
  // Brannock sells the forge's knowledge: every guild-taught schematic
  // in the smithing line, jewellery to platebodies.
  { id: 'trainer_smithing', name: "Brannock's Schematics", stock: trainerStock(['smithing']) },
  // The crafters' yard artisan covers the soft trades: leather,
  // cloth, and carved wood.
  {
    id: 'trainer_artisan',
    name: "The Artisan's Patterns",
    stock: trainerStock(['leatherworking', 'tailoring', 'woodworking']),
  },
  // The Arcanum sage keeps the brewing formulas and the enchanter's
  // journeyman treatises.
  {
    id: 'trainer_sage',
    name: "The Sage's Folios",
    stock: trainerStock(['herbalism', 'enchanting']),
  },
];

export const SHOPS: ReadonlyMap<string, ShopDef> = new Map(defs.map((d) => [d.id, d]));

export function shopDef(id: string): ShopDef | undefined {
  return SHOPS.get(id);
}

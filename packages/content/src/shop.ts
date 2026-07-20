/** The Bramblewick general store's stock (infinite supply, fixed prices). */
export interface ShopEntry {
  item: string;
  /** Purchase price; selling anything pays half its item value. */
  price: number;
}

export const GENERAL_STORE: readonly ShopEntry[] = [
  { item: 'bronze_axe', price: 25 },
  { item: 'bronze_pickaxe', price: 25 },
  { item: 'fishing_rod', price: 20 },
  { item: 'bronze_sword', price: 40 },
  { item: 'oak_shortbow', price: 50 },
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
];

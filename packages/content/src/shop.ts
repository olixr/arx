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
];

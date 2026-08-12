/**
 * THE LARDER BOARD (farming v2 Phase 5) — the towns come to market.
 *
 * Each hosting counter posts ONE standing order at a time: an item
 * its town wants, in quantity, at a real premium over the universal
 * half-value law (which stays untouched everywhere else — this board
 * is the ONE premium-price site in the game). Orders derive from the
 * WORLD CLOCK and the town's own tastes — pure world-state, hashed
 * from (shop, epoch), never from who is selling (the flood law).
 * First come, first paid: the remaining count is the only server
 * state, and when the epoch turns, the board turns with it.
 */

export interface LarderHost {
  /** The shop whose counter posts the order (an existing counter). */
  shop: string;
  /** The town's name, for the spoken line and the banner. */
  town: string;
  /** What this town's larder asks for — its tastes ARE its story. */
  pool: readonly string[];
}

export const LARDER_HOSTS: readonly LarderHost[] = [
  {
    // The starter county eats plainly and generously.
    shop: 'general_store',
    town: 'Dawnmead',
    pool: ['carrot', 'potato', 'egg', 'bread', 'milk', 'cabbage', 'onion_soup', 'butter'],
  },
  {
    // The road buys what travels: cures, hard cheese, and bottles.
    shop: 'waystation_supplies',
    town: 'the Waystation',
    pool: ['smoked_beef', 'hard_cheese', 'pickled_cabbage', 'healing_tincture', 'farmhouse_ale', 'travelers_draught'],
  },
  {
    // The hamlet wants the pantry staples it cannot grow enough of.
    shop: 'hamlet_larder',
    town: 'the Hamlet',
    pool: ['flour', 'wheat', 'soft_cheese', 'pumpkin', 'honey', 'barley'],
  },
  {
    // The last lamp burns for warmth and long-keeping food.
    shop: 'last_lamp_stores',
    town: 'the Last Lamp',
    pool: ['hearty_stew', 'smoked_eel', 'honeybrew', 'mending_salve', 'wool'],
  },
  {
    // Pinewatch wants what the cold asks for.
    shop: 'pinewatch_stores',
    town: 'Pinewatch',
    pool: ['barley_porridge', 'wool', 'smoked_beef', 'hard_cheese', 'ironbark_tonic', 'buttered_potatoes'],
  },
  {
    // Maren buys what the pens run short of — the yard feeds the yard.
    shop: 'drover_yard',
    town: "Maren's pens",
    pool: ['egg', 'milk', 'wool', 'barley', 'carrot'],
  },
];

/** How long one order stands, in ms of real time (two hours). */
export const LARDER_PERIOD_MS = 2 * 60 * 60 * 1000;

/** The premium over ITEM VALUE (half-value is the everywhere law;
 * an order pays value x mult — several times the ordinary counter). */
export const LARDER_MULT_MIN = 2.5;
export const LARDER_MULT_MAX = 3.5;

export const LARDER_QTY_MIN = 10;
export const LARDER_QTY_MAX = 30;

/** The current epoch for a wall-clock instant. */
export function larderEpoch(nowMs: number): number {
  return Math.floor(nowMs / LARDER_PERIOD_MS);
}

/** A tiny deterministic hash — the board's whole dice cup. */
function larderHash(shop: string, epoch: number, salt: number): number {
  let h = (epoch * 2654435761) ^ (salt * 0x9e3779b9);
  for (let i = 0; i < shop.length; i++) h = ((h * 31) + shop.charCodeAt(i)) | 0;
  h ^= h >>> 15;
  h = (h * 0x85ebca6b) | 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export interface LarderOrder {
  shop: string;
  town: string;
  epoch: number;
  item: string;
  qty: number;
  /** Sell price per unit = floor(itemValue x mult). */
  mult: number;
}

/**
 * The order a counter posts for an epoch — a pure function of world
 * clock and town taste, so every client and the server agree without
 * a wire (only the FILLED count travels).
 */
export function larderOrder(host: LarderHost, epoch: number): LarderOrder {
  const pick = host.pool[larderHash(host.shop, epoch, 1) % host.pool.length]!;
  const qty =
    LARDER_QTY_MIN + (larderHash(host.shop, epoch, 2) % (LARDER_QTY_MAX - LARDER_QTY_MIN + 1));
  const mult =
    LARDER_MULT_MIN +
    ((larderHash(host.shop, epoch, 3) % 101) / 100) * (LARDER_MULT_MAX - LARDER_MULT_MIN);
  return { shop: host.shop, town: host.town, epoch, item: pick, qty, mult: Math.round(mult * 100) / 100 };
}

export function larderHost(shop: string): LarderHost | undefined {
  return LARDER_HOSTS.find((h) => h.shop === shop);
}

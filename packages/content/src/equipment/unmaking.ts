import type { ItemRoll, RarityTier } from '@arx/shared';
import { rarityIndex } from '@arx/shared';
import { itemDef } from '../items.js';
import { enchantDef, ELEMENT_REAGENT, ESSENCE_BY_TIER } from './enchants.js';
import { effectiveReq } from './roll.js';

/**
 * THE UNMAKING — taking a thing apart for what is in it.
 *
 * Enchanting was the only trade in the game with no way of GETTING
 * anything. Every other profession has a gathering half: the smith has
 * seams, the cook has fields, the tailor has hides. The enchanter had
 * loot tables and other people's leftovers, which meant the trade could
 * only ever be practiced by someone already doing something else.
 *
 * The same act fixes three separate problems, which is why it is the
 * keystone of this epic rather than a convenience:
 *
 *  - the enchanter gets a gathering loop of their own;
 *  - every junk drop in the world becomes worth carrying home, because
 *    the pile of unwanted gear IS the ore seam;
 *  - the item economy's only open end closes. Gear used to flow in and
 *    never out, so a bank filled with things nobody would wear and
 *    nobody would sell.
 *
 * ------------------------------------------------------------------
 * THE UNMAKING IS NOT A REFUND. What comes back is dust and, if the
 * piece carried a working, a little of that working's essence — always
 * strictly less than inscribing cost. There is no cycle to farm here:
 * bond a scroll, break the item, and you are down on the deal every
 * time. What you get is the thing you would otherwise have thrown away.
 */

/** What a piece comes apart into. */
export interface Unmaking {
  yields: Array<{ item: string; qty: number }>;
  /** Enchanting xp for the work. */
  xp: number;
}

/**
 * Rarity pays in dust, because a finer piece had more Arx bound into
 * it. The curve is deliberately gentler than the VALUE curve (7x at
 * legendary): dust is a bulk reagent and a 7x swing on it would make
 * every enchanter a vendor-trash farmer instead of an adventurer.
 */
const RARITY_DUST_MULT: Record<RarityTier, number> = {
  common: 1,
  uncommon: 1.35,
  rare: 1.8,
  epic: 2.4,
  legendary: 3.2,
};

/** Nothing worth breaking comes back with less than this. */
const MIN_DUST = 1;

/**
 * Can this be taken apart at all? Only real GEAR: the trinkets, tools,
 * and stackable goods of the world are somebody else's trade, and a
 * table that ate everything would quietly become the answer to every
 * inventory problem in the game.
 */
export function canUnmake(itemId: string): boolean {
  return itemDef(itemId)?.gear !== undefined;
}

/**
 * What a piece comes apart into. Pure and shared, so the bench can show
 * the player exactly what they are about to get BEFORE they destroy
 * something, and the server can pay out the identical thing. A preview
 * that disagreed with the payout on a destructive action would be the
 * worst bug in this whole system.
 */
export function unmakingOf(itemId: string, roll?: ItemRoll): Unmaking | null {
  const def = itemDef(itemId);
  if (!def?.gear) return null;
  const rar: RarityTier = roll?.rar ?? 'common';
  // A re-issued piece carries the power it dropped at, not its native
  // floor, so a heirloom Thistledown robe breaks like the endgame item
  // it actually is.
  const level = effectiveReq(itemId, roll)?.level ?? def.gear.levelReq?.level ?? 1;

  const dust = Math.max(
    MIN_DUST,
    Math.round((1 + level * 0.16) * RARITY_DUST_MULT[rar]),
  );
  const yields: Array<{ item: string; qty: number }> = [{ item: 'arcane_dust', qty: dust }];

  // A bonded working gives some of its essence back. Half of what the
  // scroll asked for, rounded DOWN, so the humblest workings return
  // nothing at all and no tier is ever worth bonding to break.
  const ench = enchantDef(roll?.ench);
  if (ench) {
    const reagent = ELEMENT_REAGENT[ench.element];
    const spent = ESSENCE_BY_TIER[ench.tier];
    // Half, rounded down, and quality does NOT lift it: what comes back
    // is a share of the reagents the scroll ate, and a finer hand did
    // not use finer reagents. Letting quality raise the return would
    // hand a master a way to profit by breaking their own work.
    const back = Math.floor(spent / 2);
    if (reagent && back > 0) yields.push({ item: reagent, qty: back });
  }

  // Xp follows the same two axes as the dust. Breaking things is a real
  // way to train the trade from level 1, which is the point: an
  // enchanter should be able to start by taking apart their own
  // starting kit rather than waiting on someone else's essences.
  const xp = Math.round((6 + level * 1.9) * RARITY_DUST_MULT[rar]);

  return { yields, xp };
}

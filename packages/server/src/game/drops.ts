import { sameRoll } from '@arx/shared';
import type { EntityId, InvSlot, ItemRoll, SkillId } from '@arx/shared';

/**
 * How far (tiles) a landing drop reaches to join an existing pile.
 * Wide enough to gather one kill's scatter (±0.4 per axis) and bags
 * dropped while standing at a pile; narrow enough that two camps of
 * loot across a room stay separate piles.
 */
export const DROP_MERGE_RADIUS = 1.05;

/** The merge-relevant face of a ground drop (structural DropComp subset). */
export interface DropLike {
  item: string;
  ownerEid: EntityId | null;
  /** When the owner claim lapses (epoch ms); 0 = never claimed. */
  ownerUntil: number;
  xpOnPickup?: { skill: SkillId; xp: number };
  roll?: ItemRoll;
  /** The theft facet survives the ground (Phase 5). */
  stolen?: true;
}

/**
 * How long a fallen player's spilled pack holds the ground. Long
 * enough for the walk back from any hearth; short enough that a
 * plundered camp doesn't wear yesterday's losses forever. The defeat
 * message promises "a quarter hour" — keep the two in step.
 */
export const DEATH_SPILL_TTL_MS = 15 * 60_000;

/** One parcel of a spilled pack, ready for the ground. */
export interface SpilledSlot {
  item: string;
  qty: number;
  roll?: ItemRoll;
  stolen?: true;
}

/**
 * THE PACK SPILLS: defeat empties every carried slot onto the ground.
 * Worn equipment never spills (the kit on your back is yours to keep);
 * the pack is the stake. Slots are cleared IN PLACE and returned as
 * parcels carrying their instance rolls and theft facets whole, so a
 * rolled sword hits the dirt as the same sword and stolen goods keep
 * their history through the fall.
 */
export function spillInventory(slots: InvSlot[]): SpilledSlot[] {
  const out: SpilledSlot[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    out.push({
      item: slot.item,
      qty: slot.qty,
      ...(slot.roll ? { roll: slot.roll } : {}),
      ...(slot.stolen ? { stolen: true as const } : {}),
    });
    slots[i] = null;
  }
  return out;
}

/**
 * May a landing drop fold into this existing pile? Only true twins
 * merge: same item, same instance roll (two rolled swords are two
 * swords), same provenance (a stolen loaf never hides in an honest
 * pile). XP-bearing drops (laid eggs) never merge — each egg is its
 * own find and its own reward. Owner claims split piles while they
 * are LIVE (merging would otherwise transfer or launder loot locks) —
 * but THE PATIENT PILE (looting v2): once BOTH claims have lapsed a
 * lock has no force left to launder, and a battlefield's leftovers
 * tidy themselves into one pile instead of wearing every kill's
 * paperwork forever.
 */
export function canMergeDrop(existing: DropLike, incoming: DropLike, now: number): boolean {
  if (existing.item !== incoming.item) return false;
  if (existing.xpOnPickup || incoming.xpOnPickup) return false;
  if (!existing.stolen !== !incoming.stolen) return false;
  if (existing.ownerEid !== incoming.ownerEid) {
    const existingLive = existing.ownerEid !== null && existing.ownerUntil > now;
    const incomingLive = incoming.ownerEid !== null && incoming.ownerUntil > now;
    if (existingLive || incomingLive) return false;
  }
  return sameRoll(existing.roll, incoming.roll);
}

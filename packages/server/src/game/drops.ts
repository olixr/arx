import { sameRoll } from '@arx/shared';
import type { EntityId, ItemRoll, SkillId } from '@arx/shared';

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
  xpOnPickup?: { skill: SkillId; xp: number };
  roll?: ItemRoll;
  /** The theft facet survives the ground (Phase 5). */
  stolen?: true;
}

/**
 * May a landing drop fold into this existing pile? Only true twins
 * merge: same item, same instance roll (two rolled swords are two
 * swords), same owner claim (merging would otherwise transfer or
 * launder loot locks), same provenance (a stolen loaf never hides in
 * an honest pile). XP-bearing drops (laid eggs) never merge — each
 * egg is its own find and its own reward.
 */
export function canMergeDrop(
  existing: DropLike,
  item: string,
  roll: ItemRoll | undefined,
  ownerEid: EntityId | null,
  xpOnPickup: DropLike['xpOnPickup'],
  stolen?: boolean,
): boolean {
  if (existing.item !== item) return false;
  if (existing.xpOnPickup || xpOnPickup) return false;
  if (existing.ownerEid !== ownerEid) return false;
  if (!existing.stolen !== !stolen) return false;
  return sameRoll(existing.roll, roll);
}

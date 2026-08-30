import type { InvSlot, ItemRoll } from '@arx/shared';
import { canUnmake, unmakingOf, enchantDef, instanceName, type ArxElement } from '@arx/content';
import { addItem, takeSlot } from './inventory.js';

/**
 * THE BULK BREAKING — the batch arbitration for the Unmaking, held
 * PURE (the procWakes law): the whole judgment runs against a copy of
 * the pack and returns a plan, so every law here is testable without
 * standing up a server, and the door in gameServer stays thin.
 *
 * ALL OR NOTHING. A destructive action that half-happens is worse than
 * one that refuses and names the reason: the first refused piece stops
 * the batch whole, before anything is destroyed.
 *
 * THE FREED SLOTS COUNT. The old single-piece door proved pack space
 * per yield against the pack as it stood, which carried two wounds:
 * a full pack refused an unmaking whose own broken piece would have
 * freed the room, and a deepened piece paying two new essence schools
 * into one free slot passed the check and silently lost the second
 * yield. The simulation takes every piece FIRST, then lands every
 * yield, exactly as the payout will — the plan and the payout can
 * never disagree, which on a destructive action is the law that
 * matters most (the unmakingOf preview law, extended to the pack).
 */

/**
 * The batch speaks its size in words where words read naturally
 * (docs/VOICE.md) and falls back to the numeral past twelve — "Seven
 * pieces come apart", but "23 pieces come apart". Index = count.
 */
export const COUNT_WORDS: readonly string[] = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

export interface UnmakePiece {
  index: number;
  item: string;
  name: string;
  roll?: ItemRoll;
}

export type UnmakePlan =
  | {
      ok: true;
      pieces: UnmakePiece[];
      /** Aggregated across the batch, same-item lines merged. */
      yields: Array<{ item: string; qty: number }>;
      xp: number;
      /**
       * The one school the batch speaks in, when every working in it
       * agrees — the moment of light borrows it. Mixed batches and
       * bare steel stay arcane.
       */
      element: ArxElement | 'arcane';
    }
  | { ok: false; reason: 'nothing' | 'no-arx' | 'stolen' | 'full'; name?: string };

/** Deep-enough copy for the simulation: slots and rolls are mutated. */
function cloneSlots(slots: readonly InvSlot[]): InvSlot[] {
  return slots.map((s) => (s ? { ...s, roll: s.roll && { ...s.roll } } : null));
}

export function planUnmaking(inventory: readonly InvSlot[], indexes: readonly number[]): UnmakePlan {
  const pieces: UnmakePiece[] = [];
  const seen = new Set<number>();
  for (const index of indexes) {
    if (seen.has(index)) continue; // the wire refuses dupes; a direct caller gets one piece once
    seen.add(index);
    const slot = index >= 0 && index < inventory.length ? inventory[index] : null;
    if (!slot) continue; // an empty slot in a batch is a stale bench, not an offense
    const name = instanceName(slot.item, slot.roll);
    if (!canUnmake(slot.item)) return { ok: false, reason: 'no-arx', name };
    // NO LAUNDERING, batch edition: one hot piece refuses the lot —
    // quietly dropping it would let a marked batch fence by accident.
    if (slot.stolen) return { ok: false, reason: 'stolen', name };
    pieces.push({ index, item: slot.item, name, roll: slot.roll });
  }
  if (pieces.length === 0) return { ok: false, reason: 'nothing' };

  // Aggregate the payout: one merged line per yield item, xp summed.
  const yields: Array<{ item: string; qty: number }> = [];
  let xp = 0;
  const schools = new Set<ArxElement>();
  for (const p of pieces) {
    const result = unmakingOf(p.item, p.roll);
    if (!result) return { ok: false, reason: 'no-arx', name: p.name };
    xp += result.xp;
    for (const y of result.yields) {
      const line = yields.find((l) => l.item === y.item);
      if (line) line.qty += y.qty;
      else yields.push({ item: y.item, qty: y.qty });
    }
    const ward = enchantDef(p.roll?.ench);
    const art = enchantDef(p.roll?.ench2);
    if (ward) schools.add(ward.element);
    if (art) schools.add(art.element);
  }

  // The simulation IS the space proof: take everything, then land
  // everything, on a copy — the identical sequence the payout runs.
  const sim = cloneSlots(inventory);
  for (const p of pieces) takeSlot(sim, p.index, 1);
  for (const y of yields) {
    if (addItem(sim, y.item, y.qty) !== y.qty) return { ok: false, reason: 'full' };
  }

  const element = schools.size === 1 ? [...schools][0]! : 'arcane';
  return { ok: true, pieces, yields, xp, element };
}

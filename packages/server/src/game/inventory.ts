import type { InvSlot, ItemRoll } from '@arx/shared';
import { itemDef, type ToolType } from '@arx/content';

export const INVENTORY_SIZE = 28;

export function emptyInventory(): InvSlot[] {
  return new Array<InvSlot>(INVENTORY_SIZE).fill(null);
}

/**
 * Add items; returns the quantity that actually fit. `roll` stamps the
 * instance identity onto non-stackable slots (gear is compile-checked
 * non-stackable, so a roll can never be smeared across a stack).
 */
export function addItem(slots: InvSlot[], itemId: string, qty: number, roll?: ItemRoll): number {
  const def = itemDef(itemId);
  if (!def || qty <= 0) return 0;
  let remaining = qty;

  if (def.stackable) {
    for (const slot of slots) {
      if (slot && slot.item === itemId) {
        slot.qty += remaining;
        return qty;
      }
    }
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return 0;
    slots[idx] = { item: itemId, qty: remaining };
    return qty;
  }

  for (let i = 0; i < slots.length && remaining > 0; i++) {
    if (slots[i] === null) {
      slots[i] = { item: itemId, qty: 1, roll };
      remaining--;
    }
  }
  return qty - remaining;
}

/**
 * INSTANCE-ADDRESSING LAW: any removal that can touch rolled gear must
 * name the slot INDEX, not the item id — removeItem-by-id grabs the
 * first same-id slot and would happily destroy a different instance's
 * roll. Returns what was taken (with its roll), or null.
 */
export function takeSlot(
  slots: InvSlot[],
  index: number,
  qty: number,
): { item: string; qty: number; roll?: ItemRoll } | null {
  const slot = slots[index];
  if (!slot || qty <= 0) return null;
  const take = Math.min(slot.qty, qty);
  const out = { item: slot.item, qty: take, roll: slot.roll };
  slot.qty -= take;
  if (slot.qty === 0) slots[index] = null;
  return out;
}

/**
 * Remove up to qty of an item; returns how many were removed.
 * Id-addressed — for stackable materials/ammo/coins ONLY (see takeSlot).
 */
export function removeItem(slots: InvSlot[], itemId: string, qty: number): number {
  let remaining = qty;
  for (let i = 0; i < slots.length && remaining > 0; i++) {
    const slot = slots[i];
    if (!slot || slot.item !== itemId) continue;
    const take = Math.min(slot.qty, remaining);
    slot.qty -= take;
    remaining -= take;
    if (slot.qty === 0) slots[i] = null;
  }
  return qty - remaining;
}

export function countItem(slots: InvSlot[], itemId: string): number {
  let n = 0;
  for (const slot of slots) if (slot?.item === itemId) n += slot.qty;
  return n;
}

export function hasSpaceFor(slots: InvSlot[], itemId: string): boolean {
  const def = itemDef(itemId);
  if (!def) return false;
  if (def.stackable && slots.some((s) => s?.item === itemId)) return true;
  return slots.some((s) => s === null);
}

/** Best tool of a type carried, or null. */
export function bestTool(slots: InvSlot[], type: ToolType): { item: string; power: number } | null {
  let best: { item: string; power: number } | null = null;
  for (const slot of slots) {
    if (!slot) continue;
    const def = itemDef(slot.item);
    if (def?.tool?.type === type && (!best || def.tool.power > best.power)) {
      best = { item: slot.item, power: def.tool.power };
    }
  }
  return best;
}

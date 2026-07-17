import type { InvSlot } from '@devcraft/shared';
import { itemDef, type ToolType } from '@devcraft/content';

export const INVENTORY_SIZE = 28;

export function emptyInventory(): InvSlot[] {
  return new Array<InvSlot>(INVENTORY_SIZE).fill(null);
}

/** Add items; returns the quantity that actually fit. */
export function addItem(slots: InvSlot[], itemId: string, qty: number): number {
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
      slots[i] = { item: itemId, qty: 1 };
      remaining--;
    }
  }
  return qty - remaining;
}

/** Remove up to qty of an item; returns how many were removed. */
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

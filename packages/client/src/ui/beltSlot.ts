import type { InvSlot } from '@arx/shared';
import { itemDef } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import { itemIconUrl } from '../render/icons.js';
import { bindings } from '../input/bindings.js';

/**
 * THE BELT — a fifth well on the hotbar holding one consumable, fired
 * by a single press (1 on keys, d-pad ▼ on a pad) so a dire moment
 * never costs a trip into the pack.
 *
 * Laws:
 * - THE PIN IS A PREFERENCE, NOT A PROMISE. "Set on belt" pins an item
 *   ID (never a slot index — the server replaces the inventory array
 *   whole, and tidy-sorts reorder it). While any of that item remains
 *   in the pack, the belt serves it.
 * - THE BELT REFILLS ITSELF. With the pin absent (or none set), the
 *   belt falls forward to the heartiest meal in the pack — highest
 *   heals wins, lowest slot breaks ties. Tonics with no heal are never
 *   auto-picked; a buff is a plan, a meal is a rescue.
 * - THE PIN SURVIVES THE FAMINE. Running dry does not clear the pin;
 *   restock the item and the belt goes back to serving it.
 */

/** What the belt would serve right now, or null for an empty belt. */
export interface BeltPick {
  /** Inventory slot index to send in the use message. */
  slot: number;
  item: string;
  /** Total quantity across every stack of the item, for the badge. */
  qty: number;
  /** True when the fallback stepped in for an absent pinned item. */
  fallback: boolean;
}

/** A thing the belt may hold: it heals or it grants a consumed buff. */
export function beltEligible(id: string): boolean {
  const def = itemDef(id);
  if (!def) return false;
  if (def.equipSlot || def.teaches || def.startsQuest || def.coating) return false;
  return def.heals !== undefined || def.buff !== undefined;
}

/**
 * Resolve the belt against the live pack. Pure — the widget, the use
 * press, and the tests all ask this one question.
 */
export function resolveBelt(inventory: readonly InvSlot[], pinned: string | null): BeltPick | null {
  const countOf = (id: string): number => {
    let n = 0;
    for (const s of inventory) if (s && s.item === id) n += s.qty;
    return n;
  };
  if (pinned && beltEligible(pinned)) {
    const at = inventory.findIndex((s) => s !== null && s.item === pinned);
    if (at >= 0) return { slot: at, item: pinned, qty: countOf(pinned), fallback: false };
  }
  // The fallback: the heartiest meal standing in the pack.
  let best = -1;
  let bestHeals = 0;
  for (let i = 0; i < inventory.length; i++) {
    const s = inventory[i];
    if (!s || !beltEligible(s.item)) continue;
    const heals = itemDef(s.item)?.heals ?? 0;
    if (heals > bestHeals) {
      best = i;
      bestHeals = heals;
    }
  }
  if (best < 0) return null;
  const item = inventory[best]!.item;
  return { slot: best, item, qty: countOf(item), fallback: pinned !== null };
}

const PIN_KEY = 'arx.belt';

/** The pinned item id, or null when the belt trusts the fallback. */
export function beltPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function setBeltPin(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(PIN_KEY);
    else localStorage.setItem(PIN_KEY, id);
  } catch {
    /* storage-less contexts keep the session default */
  }
}

const EMPTY_HINT = 'Your belt is empty. Set a meal on it from your pack.';

/**
 * The belt well itself: rides the hotbar row a breath after the sigil,
 * wearing the same smoked-glass socket, an item icon, a count, and the
 * device-aware key badge. Pressing it is the same as pressing the key.
 */
export class BeltSlot {
  private readonly root: HTMLButtonElement;
  private readonly icon: HTMLElement;
  private readonly count: HTMLElement;
  private renderedKey = '';

  constructor(onUse: () => void) {
    const bar = document.getElementById('hotbar')!;
    this.root = document.createElement('button');
    this.root.className = 'hotbar-slot belt-slot empty';
    this.root.type = 'button';
    this.root.title = EMPTY_HINT;

    this.icon = document.createElement('div');
    this.icon.className = 'hotbar-icon';
    this.root.appendChild(this.icon);

    this.count = document.createElement('span');
    this.count.className = 'belt-qty';
    this.root.appendChild(this.count);

    // Device-aware key badge, redrawn on every rebind and pad-family
    // change — the same discipline as the ability wells beside it.
    const key = document.createElement('span');
    key.className = 'hotbar-key';
    const renderBadge = (): void => {
      key.innerHTML = '';
      const kbText = bindings.kbBadge('quickUse');
      if (kbText) {
        const kb = document.createElement('span');
        kb.className = 'kb-glyph small';
        kb.textContent = kbText;
        key.appendChild(kb);
      }
      const g = bindings.padBadge('quickUse');
      if (g) {
        const pad = document.createElement('span');
        pad.className = `pad-glyph ${g.cls}`;
        pad.textContent = g.text;
        key.appendChild(pad);
      }
    };
    renderBadge();
    bindings.onChange(renderBadge);
    this.root.appendChild(key);

    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onUse();
    });

    bar.appendChild(this.root);
  }

  /** Called once per frame — DOM writes only when the pick changes. */
  update(game: ClientGame): void {
    const pick = resolveBelt(game.inventory, beltPin());
    const k = pick ? `${pick.item}:${pick.qty}` : '';
    if (k === this.renderedKey) return;
    this.renderedKey = k;
    if (!pick) {
      this.root.classList.add('empty');
      this.icon.replaceChildren();
      this.count.textContent = '';
      this.root.title = EMPTY_HINT;
      return;
    }
    const def = itemDef(pick.item);
    this.root.classList.remove('empty');
    const img = document.createElement('img');
    img.src = itemIconUrl(pick.item, 60);
    img.draggable = false;
    this.icon.replaceChildren(img);
    this.count.textContent = String(pick.qty);
    this.root.title = pick.fallback
      ? `${def?.name ?? pick.item}, standing in for your pinned pick. Press to use.`
      : `${def?.name ?? pick.item}. Press to use.`;
  }
}

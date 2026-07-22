import { RARITY_COLORS } from '@devcraft/shared';
import type { EntityId } from '@devcraft/shared';
import { instanceName } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';
import { bigButton, iconTile } from './panel.js';
import { rarityColor } from './rarity.js';
import type { ClientGame } from '../game/clientGame.js';

/** How far the panel reaches — a shade past the 2.2 interact radius. */
const REACH = 2.4;

/**
 * The ground manager: everything lying within reach, as a list you
 * can actually choose from — the answer to a battlefield of
 * overlapping bags. Each row is one pile (the server already merged
 * twins): icon, rarity-tinted instance name, count, and a Take
 * button; Take All sweeps the lot. Rows carry the same inspect
 * dataset as pack cells, so hover (mouse) and focus (pad) raise the
 * full item card — rolled affixes, enchants and all — for gear you
 * haven't picked up yet.
 *
 * The list is LIVE (drops land, merge, get taken by someone else) but
 * row ORDER is sticky: existing piles keep their place, newcomers
 * append, so a pad cursor never has the list reshuffled under it.
 */
export class LootPanel {
  private readonly panel = document.getElementById('loot-panel')!;
  private readonly list = document.getElementById('loot-list')!;
  /** Where the panel was opened — walking away from here closes it. */
  private anchor: { x: number; y: number } | null = null;
  /** Sticky row order: pile eid → row rank. */
  private order = new Map<EntityId, number>();
  private nextRank = 0;
  private sig = '';

  // The close chip + header dressing come from dressPanel in main.
  constructor(private readonly game: ClientGame) {}

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    const pos = this.game.predictor.pos;
    this.anchor = { x: pos.x, y: pos.y };
    this.order.clear();
    this.nextRank = 0;
    this.sig = '';
    this.panel.classList.remove('hidden');
    this.refresh();
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.anchor = null;
  }

  /** Called every frame with the player's position (anchor law). */
  update(px: number, py: number): void {
    if (!this.isOpen || !this.anchor) return;
    const dx = this.anchor.x - px;
    const dy = this.anchor.y - py;
    if (dx * dx + dy * dy > 3 * 3) {
      this.close();
      return;
    }
    this.refresh();
  }

  private refresh(): void {
    const loot = this.game.nearbyLoot(REACH);
    // Everything picked clean: the conversation is over.
    if (loot.length === 0) {
      this.close();
      return;
    }
    for (const l of loot) {
      if (!this.order.has(l.eid)) this.order.set(l.eid, this.nextRank++);
    }
    loot.sort((a, b) => this.order.get(a.eid)! - this.order.get(b.eid)!);
    const sig = loot.map((l) => `${l.eid}:${l.qty}`).join(',');
    if (sig === this.sig) return;
    this.sig = sig;

    this.list.innerHTML = '';
    if (loot.length > 1) {
      const all = document.createElement('div');
      all.className = 'loot-row loot-all';
      const mid = document.createElement('div');
      mid.className = 'loot-mid';
      const total = loot.reduce((n, l) => n + l.qty, 0);
      const name = document.createElement('div');
      name.className = 'loot-name';
      name.textContent = 'Everything here';
      const sub = document.createElement('span');
      sub.className = 'loot-sub';
      sub.textContent = `${loot.length} piles · ${total.toLocaleString()} items`;
      mid.append(name, sub);
      all.appendChild(mid);
      const actions = document.createElement('div');
      actions.className = 'loot-actions';
      actions.appendChild(
        bigButton('Take all', 'loot:all', () => {
          for (const l of this.game.nearbyLoot(REACH)) this.game.pickup(l.eid);
        }),
      );
      all.appendChild(actions);
      this.list.appendChild(all);
    }
    for (const l of loot) {
      const row = document.createElement('div');
      row.className = 'loot-row';
      // The pile's rarity paints the row's leading edge.
      const tint = (l.roll ? RARITY_COLORS[l.roll.rar] : rarityColor(l.itemId)) ?? '';
      if (tint) row.style.setProperty('--loot-tint', tint);
      // The inspect dataset: hover and pad focus raise the item card.
      row.dataset.lootitem = l.itemId;
      row.dataset.lootqty = String(l.qty);
      if (l.roll) row.dataset.lootroll = JSON.stringify(l.roll);
      row.appendChild(iconTile(itemIconUrl(l.itemId, 40), 'sm'));
      const mid = document.createElement('div');
      mid.className = 'loot-mid';
      const name = document.createElement('div');
      name.className = 'loot-name';
      name.textContent = instanceName(l.itemId, l.roll);
      if (tint) name.style.color = tint;
      const sub = document.createElement('span');
      sub.className = 'loot-sub';
      sub.textContent = l.qty > 1 ? `× ${l.qty.toLocaleString()}` : (l.roll?.rar ?? '');
      mid.append(name, sub);
      row.appendChild(mid);
      const actions = document.createElement('div');
      actions.className = 'loot-actions';
      actions.appendChild(
        bigButton('Take', `loot:${l.eid}`, () => this.game.pickup(l.eid)),
      );
      row.appendChild(actions);
      this.list.appendChild(row);
    }
  }
}

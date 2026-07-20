import { RARITY_COLORS } from '@devcraft/shared';
import type { EntityId } from '@devcraft/shared';
import { instanceName } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';
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

  constructor(private readonly game: ClientGame) {
    const btn = document.createElement('button');
    btn.className = 'panel-close';
    btn.textContent = '✕';
    btn.title = 'Close (Esc)';
    btn.dataset.nav = '';
    btn.dataset.navkey = 'close:loot-panel';
    btn.dataset.acta = 'Close';
    btn.addEventListener('click', () => this.close());
    this.panel.querySelector('h3')!.appendChild(btn);
  }

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
      all.className = 'list-row';
      const name = document.createElement('div');
      name.className = 'row-name';
      const total = loot.reduce((n, l) => n + l.qty, 0);
      name.innerHTML = `Everything here<span class="row-sub">${loot.length} piles · ${total.toLocaleString()} items</span>`;
      all.appendChild(name);
      const btn = document.createElement('button');
      btn.textContent = 'Take all';
      btn.dataset.nav = '';
      btn.dataset.navkey = 'loot:all';
      btn.dataset.acta = 'Take all';
      btn.addEventListener('click', () => {
        for (const l of this.game.nearbyLoot(REACH)) this.game.pickup(l.eid);
      });
      all.appendChild(btn);
      this.list.appendChild(all);
    }
    for (const l of loot) {
      const row = document.createElement('div');
      row.className = 'list-row';
      // The inspect dataset: hover and pad focus raise the item card.
      row.dataset.lootitem = l.itemId;
      row.dataset.lootqty = String(l.qty);
      if (l.roll) row.dataset.lootroll = JSON.stringify(l.roll);
      const swatch = document.createElement('img');
      swatch.className = 'swatch-mini';
      swatch.src = itemIconUrl(l.itemId, 32);
      swatch.draggable = false;
      const name = document.createElement('div');
      name.className = 'row-name';
      const tint = (l.roll ? RARITY_COLORS[l.roll.rar] : rarityColor(l.itemId)) ?? '';
      const label = instanceName(l.itemId, l.roll);
      const sub = l.qty > 1 ? `× ${l.qty.toLocaleString()}` : (l.roll?.rar ?? '');
      name.innerHTML = `${tint ? `<span style="color:${tint}">${label}</span>` : label}<span class="row-sub">${sub}</span>`;
      row.append(swatch, name);
      const btn = document.createElement('button');
      btn.textContent = 'Take';
      btn.dataset.nav = '';
      btn.dataset.navkey = `loot:${l.eid}`;
      btn.dataset.acta = 'Take';
      btn.addEventListener('click', () => this.game.pickup(l.eid));
      row.appendChild(btn);
      this.list.appendChild(row);
    }
  }
}

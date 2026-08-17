import { RARITY_COLORS, RARITY_TIERS, rarityIndex } from '@arx/shared';
import type { EntityId, ItemRoll, RarityTier } from '@arx/shared';
import { instanceName } from '@arx/content';
import { itemIconUrl } from '../render/icons.js';
import { bigButton, iconTile } from './panel.js';
import { rarityOfInstance } from './rarity.js';

/**
 * THE GILDED HAND — the one ground ledger (looting v2).
 *
 * Both rooms that talk about loot lying at your feet — the quick tray
 * and the inventory's "On the ground" pane — render through this one
 * component, so the laws live once:
 *
 * - THE RARITY LEDGER: rows read best-first — rarity band descending,
 *   sticky first-seen order inside a band. The pad cursor is never
 *   reshuffled under the hand; a newcomer enters its band, animated,
 *   and everyone else keeps their seat.
 * - THE HERO ROW: with more than one pile, "Everything here" leads the
 *   list — the biggest button, the pad's landing spot, one press.
 * - THE HAND MOVES ON: rows are KEYED DOM. A taken row retires with a
 *   motion (its nav seat vacates instantly, so the ring slides to the
 *   next take without a beat), a landing row slides in, a growing
 *   stack pulses its count. The list never rebuilds wholesale.
 * - ONWARD: when the reach is picked clean but more lies within the
 *   horizon, the list offers the walk as a single focused act.
 */

export interface GroundLoot {
  eid: EntityId;
  x: number;
  y: number;
  /** Distance from the player, tiles. */
  d: number;
  itemId: string;
  qty: number;
  roll?: ItemRoll;
}

/** The tier a pile speaks with (instance roll wins; else value-derived). */
export function groundTier(l: Pick<GroundLoot, 'itemId' | 'roll'>): RarityTier {
  return rarityOfInstance(l.itemId, l.roll);
}

/**
 * THE RARITY LEDGER's whole law, pure: assign sticky first-seen ranks
 * to newcomers (mutating `sticky` in arrival order), then sort rarity
 * band descending with sticky rank breaking ties. Re-running with the
 * same survivors never reorders them.
 */
export function arrangeLoot(loot: GroundLoot[], sticky: Map<EntityId, number>): GroundLoot[] {
  let next = 0;
  for (const r of sticky.values()) next = Math.max(next, r + 1);
  for (const l of loot) {
    if (!sticky.has(l.eid)) sticky.set(l.eid, next++);
  }
  return [...loot].sort((a, b) => {
    const t = rarityIndex(groundTier(b)) - rarityIndex(groundTier(a));
    if (t !== 0) return t;
    return sticky.get(a.eid)! - sticky.get(b.eid)!;
  });
}

/**
 * ONWARD, pure: the next stop past arm's reach — the nearest far pile
 * carries the walk, the count tells what's waiting out there.
 */
export function onwardSummary(
  far: GroundLoot[],
): { eid: EntityId; count: number; dist: number } | null {
  if (far.length === 0) return null;
  let nearest = far[0]!;
  for (const l of far) if (l.d < nearest.d) nearest = l;
  return { eid: nearest.eid, count: far.length, dist: nearest.d };
}

export interface GroundListHooks {
  pickup: (eid: EntityId) => void;
  takeAll: () => void;
  /** Present = the list may offer the ONWARD walk. */
  onward?: (eid: EntityId) => void;
}

/** Motion is a courtesy, never a wait — skip the exit beat when off. */
function motionOff(): boolean {
  return (
    document.body.classList.contains('no-ui-motion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

interface RowSeat {
  el: HTMLElement;
  btn: HTMLButtonElement;
  sub: HTMLElement;
  qty: number;
}

export class GroundList {
  private rows = new Map<EntityId, RowSeat>();
  private sticky = new Map<EntityId, number>();
  private hero: { el: HTMLElement; sub: HTMLElement; pips: HTMLElement } | null = null;
  private onwardRow: { el: HTMLElement; sub: HTMLElement; eid: EntityId } | null = null;
  /** Last render's ledger order — the focus laws read the TOP row. */
  private ordered: EntityId[] = [];
  private sig = '';

  constructor(
    private readonly list: HTMLElement,
    /** Nav-key prefix ('loot' for the tray, 'gnd' for the pane). */
    private readonly prefix: string,
    private readonly hooks: GroundListHooks,
    private readonly opts: { dragToPack?: boolean } = {},
  ) {}

  /** The pad's landing spot when this ledger opens fresh. */
  get takeAllKey(): string {
    return `${this.prefix}:all`;
  }

  /** Default focus for the current shape: the sweep, or the one take. */
  bestFocusKey(): string | null {
    if (this.hero) return this.takeAllKey;
    if (this.ordered.length > 0) return `${this.prefix}:${this.ordered[0]}`;
    if (this.onwardRow) return `${this.prefix}:onward`;
    return null;
  }

  /** Forget everything (a fresh open animates a fresh arrival). */
  reset(): void {
    this.rows.clear();
    this.sticky.clear();
    this.hero = null;
    this.onwardRow = null;
    this.ordered = [];
    this.sig = '';
    this.list.innerHTML = '';
  }

  /** Live refresh: `loot` within reach, `far` between reach and horizon. */
  update(loot: GroundLoot[], far: GroundLoot[] = []): void {
    const arranged = arrangeLoot(loot, this.sticky);
    const onward = this.hooks.onward ? onwardSummary(far) : null;
    const sig =
      arranged.map((l) => `${l.eid}:${l.qty}`).join(',') +
      '|' +
      (onward ? `${onward.eid}:${onward.count}:${onward.dist.toFixed(1)}` : '');
    if (sig === this.sig) return;
    this.sig = sig;
    this.render(arranged, onward);
  }

  private render(
    arranged: GroundLoot[],
    onward: { eid: EntityId; count: number; dist: number } | null,
  ): void {
    this.ordered = arranged.map((l) => l.eid);
    // Retire rows whose piles are gone (taken, despawned, or walked
    // from). The nav seat vacates NOW — the ring's next landing must
    // never wait on a farewell animation.
    const live = new Set(arranged.map((l) => l.eid));
    for (const [eid, seat] of this.rows) {
      if (live.has(eid)) continue;
      this.rows.delete(eid);
      this.sticky.delete(eid);
      this.retire(seat.el);
    }

    // The hero row leads while there is a crowd to sweep.
    if (arranged.length > 1) {
      if (!this.hero) this.hero = this.buildHero();
      const total = arranged.reduce((n, l) => n + l.qty, 0);
      this.hero.sub.textContent = `${arranged.length} piles · ${total.toLocaleString()} items`;
      this.paintPips(this.hero.pips, arranged);
    } else if (this.hero) {
      this.retire(this.hero.el);
      this.hero = null;
    }

    // Arrivals and count changes, in ledger order.
    let batch = 0;
    for (const l of arranged) {
      const seat = this.rows.get(l.eid);
      if (!seat) {
        this.rows.set(l.eid, this.buildRow(l, batch++));
      } else if (seat.qty !== l.qty) {
        seat.qty = l.qty;
        this.paintSub(seat.sub, l);
        // Restart the pulse so back-to-back growth still speaks.
        seat.sub.classList.remove('qty-pulse');
        void seat.sub.offsetWidth;
        seat.sub.classList.add('qty-pulse');
      }
    }

    // ONWARD: the walk to the next find, one focused act.
    if (onward) {
      if (!this.onwardRow) this.onwardRow = this.buildOnward(onward.eid);
      this.onwardRow.eid = onward.eid;
      const piles = onward.count === 1 ? 'pile' : 'piles';
      this.onwardRow.sub.textContent = `${onward.count} more ${piles} · ${Math.round(onward.dist)} tiles on`;
    } else if (this.onwardRow) {
      this.retire(this.onwardRow.el);
      this.onwardRow = null;
    }

    // Seat everyone in ledger order (retired rows hold their place
    // while they fade — the flow walks around them).
    const desired: HTMLElement[] = [];
    if (this.hero) desired.push(this.hero.el);
    for (const l of arranged) desired.push(this.rows.get(l.eid)!.el);
    if (this.onwardRow) desired.push(this.onwardRow.el);
    let cursor: ChildNode | null = this.list.firstChild;
    for (const el of desired) {
      while (cursor && (cursor as HTMLElement).dataset?.retired) cursor = cursor.nextSibling;
      if (cursor === el) {
        cursor = el.nextSibling;
      } else {
        this.list.insertBefore(el, cursor);
      }
    }
  }

  /** A row's farewell: nav seat gone now, body fades, then leaves. */
  private retire(el: HTMLElement): void {
    el.dataset.retired = '1';
    el.querySelectorAll<HTMLElement>('[data-nav]').forEach((b) => {
      delete b.dataset.nav;
      delete b.dataset.navkey;
      b.style.pointerEvents = 'none';
    });
    if (motionOff()) {
      el.remove();
      return;
    }
    el.classList.add('loot-out');
    window.setTimeout(() => el.remove(), 220);
  }

  private paintSub(sub: HTMLElement, l: GroundLoot): void {
    const tier = groundTier(l);
    const parts: string[] = [];
    if (l.qty > 1) parts.push(`× ${l.qty.toLocaleString()}`);
    if (tier !== 'common') parts.push(tier);
    sub.textContent = parts.join(' · ');
  }

  /** The rarity census dots on the hero row — the sweep's promise. */
  private paintPips(pips: HTMLElement, arranged: GroundLoot[]): void {
    const present = new Set(arranged.map((l) => groundTier(l)));
    pips.innerHTML = '';
    for (let i = RARITY_TIERS.length - 1; i >= 0; i--) {
      const tier = RARITY_TIERS[i]!;
      if (!present.has(tier)) continue;
      const dot = document.createElement('span');
      dot.className = 'loot-pip';
      dot.style.background = RARITY_COLORS[tier] ?? 'var(--parchment-dim)';
      dot.title = tier;
      pips.appendChild(dot);
    }
  }

  private buildHero(): { el: HTMLElement; sub: HTMLElement; pips: HTMLElement } {
    const el = document.createElement('div');
    el.className = 'loot-row loot-all loot-in';
    const mid = document.createElement('div');
    mid.className = 'loot-mid';
    const name = document.createElement('div');
    name.className = 'loot-name';
    name.textContent = 'Everything here';
    const sub = document.createElement('span');
    sub.className = 'loot-sub';
    const pips = document.createElement('span');
    pips.className = 'loot-pips';
    name.appendChild(pips);
    mid.append(name, sub);
    el.appendChild(mid);
    const actions = document.createElement('div');
    actions.className = 'loot-actions';
    actions.appendChild(bigButton('Take all', this.takeAllKey, () => this.hooks.takeAll()));
    el.appendChild(actions);
    return { el, sub, pips };
  }

  private buildOnward(eid: EntityId): { el: HTMLElement; sub: HTMLElement; eid: EntityId } {
    const el = document.createElement('div');
    el.className = 'loot-row loot-onward loot-in';
    const mid = document.createElement('div');
    mid.className = 'loot-mid';
    const name = document.createElement('div');
    name.className = 'loot-name';
    name.textContent = 'Onward';
    const sub = document.createElement('span');
    sub.className = 'loot-sub';
    mid.append(name, sub);
    el.appendChild(mid);
    const actions = document.createElement('div');
    actions.className = 'loot-actions';
    actions.appendChild(
      bigButton(
        'Walk',
        `${this.prefix}:onward`,
        () => {
          const seat = this.onwardRow;
          if (seat) this.hooks.onward?.(seat.eid);
        },
        { acta: 'Walk over' },
      ),
    );
    el.appendChild(actions);
    return { el, sub, eid };
  }

  private buildRow(l: GroundLoot, batch: number): RowSeat {
    const el = document.createElement('div');
    el.className = 'loot-row loot-in';
    el.style.setProperty('--in-delay', `${Math.min(batch, 6) * 26}ms`);
    const tier = groundTier(l);
    const tint = RARITY_COLORS[tier];
    if (tint) el.style.setProperty('--loot-tint', tint);
    // The inspect dataset: hover and pad focus raise the full item card.
    el.dataset.lootitem = l.itemId;
    el.dataset.lootqty = String(l.qty);
    if (l.roll) el.dataset.lootroll = JSON.stringify(l.roll);
    el.appendChild(iconTile(itemIconUrl(l.itemId, 40), 'sm'));
    const mid = document.createElement('div');
    mid.className = 'loot-mid';
    const name = document.createElement('div');
    name.className = 'loot-name';
    name.textContent = instanceName(l.itemId, l.roll);
    if (tint) name.style.color = tint;
    const sub = document.createElement('span');
    sub.className = 'loot-sub';
    this.paintSub(sub, l);
    mid.append(name, sub);
    el.appendChild(mid);
    const actions = document.createElement('div');
    actions.className = 'loot-actions';
    const btn = bigButton('Take', `${this.prefix}:${l.eid}`, () => this.hooks.pickup(l.eid));
    actions.appendChild(btn);
    el.appendChild(actions);
    if (this.opts.dragToPack) this.armDrag(el, l.eid);
    return { el, btn, sub, qty: l.qty };
  }

  /**
   * THE OPEN GROUND's forward gesture: drag a ground row into the
   * pack column and the take is the drop. The ghost is the row's own
   * icon; releasing anywhere else just sets it back down.
   */
  private armDrag(row: HTMLElement, eid: EntityId): void {
    row.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button')) return;
      const startX = e.clientX;
      const startY = e.clientY;
      let ghost: HTMLElement | null = null;
      const move = (ev: PointerEvent): void => {
        if (!ghost) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 7) return;
          ghost = document.createElement('div');
          ghost.className = 'ground-ghost';
          const img = row.querySelector('img');
          if (img) ghost.appendChild(img.cloneNode(true));
          document.body.appendChild(ghost);
          row.classList.add('drag-src');
        }
        ghost.style.transform = `translate(${ev.clientX - 26}px, ${ev.clientY - 26}px)`;
        const pack = this.packUnder(ev);
        ghost.classList.toggle('drop-armed', pack !== null);
      };
      const up = (ev: PointerEvent): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        row.classList.remove('drag-src');
        if (!ghost) return;
        ghost.remove();
        if (this.packUnder(ev)) this.hooks.pickup(eid);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private packUnder(e: PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return (el?.closest('.char-pack-col') as HTMLElement | null) ?? null;
  }
}

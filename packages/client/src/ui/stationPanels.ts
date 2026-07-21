import {
  RARITY_COLORS,
  levelForXp,
  tileDef,
  type InvSlot,
  type ItemRoll,
  type SkillXp,
  type StationType,
} from '@devcraft/shared';
import {
  BUILDABLES,
  CROP_BY_SEED,
  GENERAL_STORE,
  instanceName,
  itemDef,
  recipesForStation,
} from '@devcraft/content';
import { buildableIconUrl, itemIconUrl } from '../render/icons.js';
import { bigButton, iconTile, levelBadge, needChip } from './panel.js';

/**
 * Craft / bank / shop / build panels. Opened by interacting with the
 * matching world tile; every action is validated server-side — these
 * are views.
 *
 * Design laws:
 * - EVERY RECIPE IS A CARD. Output portrait, name, level badge, then
 *   the material story as have/need chips — green when your pack
 *   covers it, ember when short. No more mystery ingredient prose.
 * - COUNTS ARE LIVE. The pack feeds the chips through `getInventory`;
 *   `refreshOpen` re-renders the open maker panel whenever the pack
 *   changes, so crafting five arrows watches the feather chip fall.
 *   Focus survives the re-render by nav key (the pad law).
 * - A world-anchored panel (bank chest, station, shop counter) belongs
 *   to its tile: walk out of reach and it closes itself, exactly when
 *   the server would start refusing its actions. Every panel also
 *   closes from its ✕ chip and from clicking the world.
 */
export class StationPanels {
  private readonly craftPanel = document.getElementById('craft-panel')!;
  private readonly craftTitle = document.getElementById('craft-title')!;
  private readonly craftList = document.getElementById('craft-list')!;
  private readonly bankPanel = document.getElementById('bank-panel')!;
  private readonly bankList = document.getElementById('bank-list')!;
  private readonly shopPanel = document.getElementById('shop-panel')!;
  private readonly shopList = document.getElementById('shop-list')!;
  private readonly buildPanel = document.getElementById('build-panel')!;
  private readonly buildList = document.getElementById('build-list')!;

  private lastBank: Record<string, number> = {};
  /** Rolled gear instances stored in the vault (withdraw by row id). */
  private lastBankGear: Array<{ id: number; item: string; roll: ItemRoll }> = [];
  /** World tile center the open panel is bound to (null = untethered). */
  private anchor: { x: number; y: number } | null = null;
  /** What the open maker panel is showing — refreshOpen re-renders it. */
  private showing:
    | { kind: 'craft'; station: StationType | null; skills: SkillXp }
    | { kind: 'plant'; tx: number; ty: number; skills: SkillXp }
    | { kind: 'build'; skills: SkillXp }
    | null = null;

  constructor(
    private readonly onCraft: (recipe: string, qty: number) => void,
    private readonly onBank: (
      op: 'deposit' | 'withdraw',
      item: string,
      qty: number,
      gearId?: number,
    ) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number) => void,
    private readonly onPickBuildable: (id: string) => void,
    /** The live pack — feeds every have/need chip. */
    private readonly getInventory: () => InvSlot[] = () => [],
  ) {}
  // Close chips + header dressing come from ui/panel.ts (dressPanel),
  // wired in main — one anatomy for every panel in the game.

  get bankOpen(): boolean {
    return !this.bankPanel.classList.contains('hidden');
  }

  get shopOpen(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }

  get anyOpen(): boolean {
    return (
      this.bankOpen ||
      this.shopOpen ||
      !this.craftPanel.classList.contains('hidden') ||
      !this.buildPanel.classList.contains('hidden')
    );
  }

  /**
   * The open panel's anchor tile — the station being talked to. The
   * renderer heats that station's interaction choreography off this
   * (chest lid open, furnace stoked) for exactly as long as the
   * conversation lasts.
   */
  get anchorTile(): { tx: number; ty: number } | null {
    if (!this.anchor || !this.anyOpen) return null;
    return { tx: Math.floor(this.anchor.x), ty: Math.floor(this.anchor.y) };
  }

  closeAll(): void {
    this.craftPanel.classList.add('hidden');
    this.bankPanel.classList.add('hidden');
    this.shopPanel.classList.add('hidden');
    this.buildPanel.classList.add('hidden');
    this.anchor = null;
    this.showing = null;
  }

  /**
   * Called every frame with the player's position: an anchored panel
   * closes once its station is out of reach (a little past the 2.2
   * interaction radius, so standing at the edge doesn't flicker it).
   */
  enforceAnchor(px: number, py: number): void {
    if (!this.anchor || !this.anyOpen) return;
    const dx = this.anchor.x - px;
    const dy = this.anchor.y - py;
    if (dx * dx + dy * dy > 3 * 3) this.closeAll();
  }

  /** The pack changed — keep the open maker panel's chips honest. */
  refreshOpen(): void {
    if (!this.showing) return;
    if (this.showing.kind === 'craft') this.renderCraft();
    else if (this.showing.kind === 'plant') this.renderPlant();
    else this.renderBuild();
  }

  /** Total of an item across the pack — the "have" in have/need. */
  private countOf(item: string): number {
    let n = 0;
    for (const slot of this.getInventory()) {
      if (slot && slot.item === item) n += slot.qty;
    }
    return n;
  }

  /** The card every maker row shares: portrait · name+badge · chips. */
  private makeCard(opts: {
    iconUrl: string | null;
    swatchColor?: string;
    name: string;
    badge?: { level: number; skill: string; met: boolean };
    chips: Array<{ item: string; need: number }>;
    locked: boolean;
    outQty?: number;
  }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'make-card' + (opts.locked ? ' disabled' : '');
    let tile: HTMLElement;
    if (opts.iconUrl) {
      tile = iconTile(opts.iconUrl, 'sm');
    } else {
      tile = document.createElement('div');
      tile.className = 'icon-tile sm';
      const sw = document.createElement('div');
      sw.className = 'tile-swatch';
      sw.style.cssText = `width:70%;height:70%;background:${opts.swatchColor ?? '#666'}`;
      tile.appendChild(sw);
    }
    if (opts.outQty && opts.outQty > 1) {
      const q = document.createElement('span');
      q.className = 'out-qty';
      q.textContent = `×${opts.outQty}`;
      tile.appendChild(q);
    }
    card.appendChild(tile);

    const mid = document.createElement('div');
    mid.className = 'make-mid';
    const head = document.createElement('div');
    head.className = 'make-name';
    head.textContent = opts.name;
    mid.appendChild(head);
    const chips = document.createElement('div');
    chips.className = 'make-chips';
    for (const c of opts.chips) {
      const def = itemDef(c.item);
      chips.appendChild(
        needChip(itemIconUrl(c.item, 24), this.countOf(c.item), c.need, def?.name ?? c.item),
      );
    }
    if (opts.badge) {
      chips.appendChild(levelBadge(opts.badge.level, opts.badge.skill, opts.badge.met));
    }
    mid.appendChild(chips);
    card.appendChild(mid);

    const actions = document.createElement('div');
    actions.className = 'make-actions';
    card.appendChild(actions);
    return card;
  }

  private static actionsOf(card: HTMLElement): HTMLElement {
    return card.querySelector('.make-actions')!;
  }

  // ------------------------------------------------------------ build

  openBuild(skills: SkillXp): void {
    this.closeAll();
    this.showing = { kind: 'build', skills };
    this.renderBuild();
    this.buildPanel.classList.remove('hidden');
  }

  private renderBuild(): void {
    if (this.showing?.kind !== 'build') return;
    const { skills } = this.showing;
    this.buildList.innerHTML = '';
    for (const def of BUILDABLES.values()) {
      const skill = def.skill ?? 'construction';
      const level = levelForXp(skills[skill] ?? 0);
      const locked = level < def.levelReq;
      const card = this.makeCard({
        iconUrl: buildableIconUrl(def.id, 40),
        swatchColor: tileDef(def.tile).topColor ?? tileDef(def.tile).color,
        name: def.name,
        badge: { level: def.levelReq, skill, met: !locked },
        chips: def.materials.map((m) => ({ item: m.item, need: m.qty })),
        locked,
      });
      if (!locked) {
        StationPanels.actionsOf(card).appendChild(
          bigButton('Place', `build:${def.id}`, () => this.onPickBuildable(def.id)),
        );
      }
      this.buildList.appendChild(card);
    }
  }

  // ------------------------------------------------------------ plant

  /** Set by main: sends the plant intent for a chosen seed. */
  onPlant: ((tx: number, ty: number, seed: string) => void) | null = null;

  /** Seed picker for a tilled plot: lists the seeds you carry. */
  openPlant(
    tx: number,
    ty: number,
    inventory: InvSlot[],
    skills: SkillXp,
    at?: { tx: number; ty: number },
  ): void {
    void inventory; // counts come live from getInventory now
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'plant', tx, ty, skills };
    this.craftTitle.textContent = 'Planting';
    this.renderPlant();
    this.craftPanel.classList.remove('hidden');
  }

  private renderPlant(): void {
    if (this.showing?.kind !== 'plant') return;
    const { tx, ty, skills } = this.showing;
    this.craftList.innerHTML = '';
    const level = levelForXp(skills.farming ?? 0);

    // Tally the seed pouches in the pack.
    const held = new Map<string, number>();
    for (const slot of this.getInventory()) {
      if (slot && CROP_BY_SEED.has(slot.item)) {
        held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
      }
    }
    if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'No seeds in your pack — buy some at the shop, or forage wild herbs.';
      this.craftList.appendChild(empty);
    }
    for (const [seed] of held) {
      const crop = CROP_BY_SEED.get(seed)!;
      const locked = level < crop.levelReq;
      const card = this.makeCard({
        iconUrl: itemIconUrl(seed, 40),
        name: `${crop.name} · ~${crop.growMinutes} min`,
        badge: { level: crop.levelReq, skill: 'farming', met: !locked },
        chips: [{ item: seed, need: 1 }],
        locked,
      });
      if (!locked) {
        StationPanels.actionsOf(card).appendChild(
          bigButton('Plant', `plant:${seed}`, () => {
            this.onPlant?.(tx, ty, seed);
            this.closeAll();
          }),
        );
      }
      this.craftList.appendChild(card);
    }
  }

  // ------------------------------------------------------------ craft

  openCraft(station: StationType | null, skills: SkillXp, at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    const labels: Record<string, string> = {
      fire: 'Cooking',
      furnace: 'Smelting',
      anvil: 'Smithing',
      workbench: 'Handiwork',
      alembic: 'Herbalism',
      tanning_rack: 'Leatherworking',
      loom: 'Tailoring',
      carving_bench: 'Woodworking',
      enchanting_table: 'Enchanting',
    };
    this.craftTitle.textContent = station ? labels[station]! : 'Handiwork';
    this.showing = { kind: 'craft', station, skills };
    this.renderCraft();
    this.craftPanel.classList.remove('hidden');
  }

  private renderCraft(): void {
    if (this.showing?.kind !== 'craft') return;
    const { station, skills } = this.showing;
    this.craftList.innerHTML = '';
    for (const recipe of recipesForStation(station)) {
      const level = levelForXp(skills[recipe.skill] ?? 0);
      const locked = level < recipe.levelReq;
      const card = this.makeCard({
        iconUrl: itemIconUrl(recipe.output.item, 40),
        name: recipe.name,
        badge: { level: recipe.levelReq, skill: recipe.skill, met: !locked },
        chips: recipe.inputs.map((i) => ({ item: i.item, need: i.qty })),
        locked,
        outQty: recipe.output.qty,
      });
      if (!locked) {
        const actions = StationPanels.actionsOf(card);
        for (const qty of [1, 5, 28]) {
          actions.appendChild(
            bigButton(
              qty === 28 ? 'All' : `×${qty}`,
              `craft:${recipe.id}:${qty}`,
              () => this.onCraft(recipe.id, qty),
              { acta: 'Craft', minor: qty !== 1 },
            ),
          );
        }
      }
      this.craftList.appendChild(card);
    }
  }

  // ------------------------------------------------------------- bank

  openBank(
    items: Record<string, number>,
    at?: { tx: number; ty: number },
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.renderBank();
    this.bankPanel.classList.remove('hidden');
  }

  refreshBank(
    items: Record<string, number>,
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    if (this.bankOpen) this.renderBank();
  }

  private renderBank(): void {
    this.bankList.innerHTML = '';
    const entries = Object.entries(this.lastBank).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0 && this.lastBankGear.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Your vault is empty.';
      this.bankList.appendChild(empty);
    }
    // Rolled gear first — each row is one exact instance, tinted by its
    // rarity, withdrawn by its stable row id.
    for (const g of this.lastBankGear) {
      const card = this.makeCard({
        iconUrl: itemIconUrl(g.item, 40),
        name: instanceName(g.item, g.roll),
        chips: [],
        locked: false,
      });
      const nameEl = card.querySelector<HTMLElement>('.make-name')!;
      const tint = RARITY_COLORS[g.roll.rar];
      if (tint) nameEl.style.color = tint;
      const sub = document.createElement('span');
      sub.className = 'make-sub';
      sub.textContent = g.roll.rar;
      nameEl.insertAdjacentElement('afterend', sub);
      StationPanels.actionsOf(card).appendChild(
        bigButton('Take', `bankgear:${g.id}`, () => this.onBank('withdraw', g.item, 1, g.id), {
          acta: 'Withdraw',
        }),
      );
      this.bankList.appendChild(card);
    }
    for (const [item, qty] of entries) {
      const def = itemDef(item);
      const card = this.makeCard({
        iconUrl: itemIconUrl(item, 40),
        name: def?.name ?? item,
        chips: [],
        locked: false,
      });
      const sub = document.createElement('span');
      sub.className = 'make-sub';
      sub.textContent = `${qty.toLocaleString()} stored`;
      card.querySelector('.make-name')!.insertAdjacentElement('afterend', sub);
      const actions = StationPanels.actionsOf(card);
      for (const [label, n] of [['×1', 1], ['×5', 5], ['All', qty]] as const) {
        actions.appendChild(
          bigButton(label, `bank:${item}:${label}`, () => this.onBank('withdraw', item, n), {
            acta: 'Withdraw',
            minor: label !== '×1',
          }),
        );
      }
      this.bankList.appendChild(card);
    }
  }

  // ------------------------------------------------------------- shop

  openShop(at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.shopList.innerHTML = '';
    for (const entry of GENERAL_STORE) {
      const def = itemDef(entry.item);
      const card = this.makeCard({
        iconUrl: itemIconUrl(entry.item, 40),
        name: def?.name ?? entry.item,
        chips: [],
        locked: false,
      });
      // The price, clearly labeled in coin.
      const sub = document.createElement('span');
      sub.className = 'make-sub coin-sub';
      const coin = document.createElement('img');
      coin.src = itemIconUrl('coins', 18);
      coin.draggable = false;
      const amount = document.createElement('span');
      amount.textContent = `${entry.price.toLocaleString()} each`;
      sub.append(coin, amount);
      card.querySelector('.make-name')!.insertAdjacentElement('afterend', sub);
      const actions = StationPanels.actionsOf(card);
      for (const [label, n] of [['Buy 1', 1], ['Buy 5', 5]] as const) {
        actions.appendChild(
          bigButton(label, `shop:${entry.item}:${n}`, () => this.onShop('buy', entry.item, n), {
            acta: 'Buy',
            minor: n !== 1,
          }),
        );
      }
      this.shopList.appendChild(card);
    }
    this.shopPanel.classList.remove('hidden');
  }
}

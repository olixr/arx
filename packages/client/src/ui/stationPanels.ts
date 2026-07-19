import { levelForXp, tileDef, type InvSlot, type SkillXp, type StationType } from '@devcraft/shared';
import { BUILDABLES, CROP_BY_SEED, GENERAL_STORE, itemDef, recipesForStation } from '@devcraft/content';
import { buildableIconUrl, itemIconUrl } from '../render/icons.js';

function iconEl(itemId: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'swatch-mini';
  img.src = itemIconUrl(itemId, 32);
  img.draggable = false;
  return img;
}

/**
 * Craft / bank / shop panels. Opened by interacting with the matching
 * world tile; every action is validated server-side — these are views.
 *
 * A world-anchored panel (bank chest, station, shop counter) belongs
 * to its tile: walk out of reach and it closes itself, exactly when
 * the server would start refusing its actions — a panel must never
 * outlive the interaction it fronts. Every panel also closes from a
 * ✕ button and from clicking the world.
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
  /** World tile center the open panel is bound to (null = untethered). */
  private anchor: { x: number; y: number } | null = null;

  constructor(
    private readonly onCraft: (recipe: string, qty: number) => void,
    private readonly onBank: (op: 'deposit' | 'withdraw', item: string, qty: number) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number) => void,
    private readonly onPickBuildable: (id: string) => void,
  ) {
    for (const panel of [this.craftPanel, this.bankPanel, this.shopPanel, this.buildPanel]) {
      const btn = document.createElement('button');
      btn.className = 'panel-close';
      btn.textContent = '✕';
      btn.title = 'Close (Esc)';
      btn.dataset.nav = '';
      btn.dataset.navkey = `close:${panel.id}`;
      btn.dataset.acta = 'Close';
      btn.addEventListener('click', () => this.closeAll());
      panel.querySelector('h3')!.appendChild(btn);
    }
  }

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

  closeAll(): void {
    this.craftPanel.classList.add('hidden');
    this.bankPanel.classList.add('hidden');
    this.shopPanel.classList.add('hidden');
    this.buildPanel.classList.add('hidden');
    this.anchor = null;
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

  // ------------------------------------------------------------ build

  openBuild(skills: SkillXp): void {
    this.closeAll();
    this.buildList.innerHTML = '';
    for (const def of BUILDABLES.values()) {
      const skill = def.skill ?? 'construction';
      const level = levelForXp(skills[skill] ?? 0);
      const locked = level < def.levelReq;
      const row = document.createElement('div');
      row.className = 'list-row' + (locked ? ' disabled' : '');
      // Real art for every buildable; the tile-color swatch survives as
      // the fallback so an unmapped buildable still shows something.
      const iconUrl = buildableIconUrl(def.id, 32);
      let swatch: HTMLElement;
      if (iconUrl) {
        const img = document.createElement('img');
        img.className = 'swatch-mini';
        img.src = iconUrl;
        img.draggable = false;
        swatch = img;
      } else {
        swatch = document.createElement('div');
        swatch.className = 'swatch-mini tile-swatch';
        swatch.style.background = tileDef(def.tile).topColor ?? tileDef(def.tile).color;
      }
      const name = document.createElement('div');
      name.className = 'row-name';
      const mats = def.materials
        .map((m) => `${m.qty}× ${itemDef(m.item)?.name ?? m.item}`)
        .join(', ');
      name.innerHTML = `${def.name}<span class="row-sub">${
        mats ? `${mats} · ` : ''
      }lvl ${def.levelReq} ${skill}</span>`;
      row.append(swatch, name);
      if (!locked) {
        const btn = document.createElement('button');
        btn.textContent = 'Place';
        btn.dataset.nav = '';
        btn.dataset.navkey = `build:${def.id}`;
        btn.dataset.acta = 'Place';
        btn.addEventListener('click', () => this.onPickBuildable(def.id));
        row.appendChild(btn);
      }
      this.buildList.appendChild(row);
    }
    this.buildPanel.classList.remove('hidden');
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
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.craftTitle.textContent = 'Planting';
    this.craftList.innerHTML = '';
    const level = levelForXp(skills.farming ?? 0);

    // Tally the seed pouches in the pack.
    const held = new Map<string, number>();
    for (const slot of inventory) {
      if (slot && CROP_BY_SEED.has(slot.item)) {
        held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
      }
    }
    if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'list-row';
      empty.textContent = 'No seeds in your pack — buy some at the shop, or forage wild herbs.';
      this.craftList.appendChild(empty);
    }
    for (const [seed, qty] of held) {
      const crop = CROP_BY_SEED.get(seed)!;
      const locked = level < crop.levelReq;
      const row = document.createElement('div');
      row.className = 'list-row' + (locked ? ' disabled' : '');
      const swatch = iconEl(seed);
      const name = document.createElement('div');
      name.className = 'row-name';
      name.innerHTML =
        `${crop.name}<span class="row-sub">×${qty} · ~${crop.growMinutes} min · lvl ${crop.levelReq} farming</span>`;
      row.append(swatch, name);
      if (!locked) {
        const btn = document.createElement('button');
        btn.textContent = 'Plant';
        btn.dataset.nav = '';
        btn.dataset.navkey = `plant:${seed}`;
        btn.dataset.acta = 'Plant';
        btn.addEventListener('click', () => {
          this.onPlant?.(tx, ty, seed);
          this.closeAll();
        });
        row.appendChild(btn);
      }
      this.craftList.appendChild(row);
    }
    this.craftPanel.classList.remove('hidden');
  }

  // ------------------------------------------------------------ craft

  openCraft(station: StationType | null, skills: SkillXp, at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    const labels: Record<string, string> = {
      fire: 'Cooking',
      furnace: 'Smelting',
      anvil: 'Smithing',
      workbench: 'Crafting',
      alembic: 'Herbalism',
    };
    this.craftTitle.textContent = station ? labels[station]! : 'Handiwork';
    this.craftList.innerHTML = '';
    for (const recipe of recipesForStation(station)) {
      const level = levelForXp(skills[recipe.skill] ?? 0);
      const locked = level < recipe.levelReq;
      const row = document.createElement('div');
      row.className = 'list-row' + (locked ? ' disabled' : '');

      const swatch = iconEl(recipe.output.item);

      const name = document.createElement('div');
      name.className = 'row-name';
      const inputs = recipe.inputs
        .map((i) => `${i.qty}× ${itemDef(i.item)?.name ?? i.item}`)
        .join(', ');
      name.innerHTML = `${recipe.name}<span class="row-sub">${inputs} · lvl ${recipe.levelReq} ${recipe.skill}</span>`;

      row.append(swatch, name);
      if (!locked) {
        for (const qty of [1, 5, 28]) {
          const btn = document.createElement('button');
          btn.textContent = qty === 28 ? 'All' : `×${qty}`;
          btn.dataset.nav = '';
          btn.dataset.navkey = `craft:${recipe.id}:${qty}`;
          btn.dataset.acta = 'Craft';
          btn.addEventListener('click', () => this.onCraft(recipe.id, qty));
          row.appendChild(btn);
        }
      }
      this.craftList.appendChild(row);
    }
    this.craftPanel.classList.remove('hidden');
  }

  // ------------------------------------------------------------- bank

  openBank(items: Record<string, number>, at?: { tx: number; ty: number }): void {
    this.lastBank = items;
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.renderBank();
    this.bankPanel.classList.remove('hidden');
  }

  refreshBank(items: Record<string, number>): void {
    this.lastBank = items;
    if (this.bankOpen) this.renderBank();
  }

  private renderBank(): void {
    this.bankList.innerHTML = '';
    const entries = Object.entries(this.lastBank).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'list-row';
      empty.textContent = 'Your vault is empty.';
      this.bankList.appendChild(empty);
    }
    for (const [item, qty] of entries) {
      const def = itemDef(item);
      const row = document.createElement('div');
      row.className = 'list-row';
      const swatch = iconEl(item);
      const name = document.createElement('div');
      name.className = 'row-name';
      name.innerHTML = `${def?.name ?? item}<span class="row-sub">${qty.toLocaleString()} stored</span>`;
      row.append(swatch, name);
      for (const [label, n] of [['×1', 1], ['×5', 5], ['All', qty]] as const) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.nav = '';
        btn.dataset.navkey = `bank:${item}:${label}`;
        btn.dataset.acta = 'Withdraw';
        btn.addEventListener('click', () => this.onBank('withdraw', item, n));
        row.appendChild(btn);
      }
      this.bankList.appendChild(row);
    }
  }

  // ------------------------------------------------------------- shop

  openShop(at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.shopList.innerHTML = '';
    for (const entry of GENERAL_STORE) {
      const def = itemDef(entry.item);
      const row = document.createElement('div');
      row.className = 'list-row';
      const swatch = iconEl(entry.item);
      const name = document.createElement('div');
      name.className = 'row-name';
      name.innerHTML = `${def?.name ?? entry.item}<span class="row-sub">${entry.price} coins</span>`;
      row.append(swatch, name);
      for (const [label, n] of [['Buy 1', 1], ['Buy 5', 5]] as const) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.nav = '';
        btn.dataset.navkey = `shop:${entry.item}:${n}`;
        btn.dataset.acta = 'Buy';
        btn.addEventListener('click', () => this.onShop('buy', entry.item, n));
        row.appendChild(btn);
      }
      this.shopList.appendChild(row);
    }
    this.shopPanel.classList.remove('hidden');
  }
}

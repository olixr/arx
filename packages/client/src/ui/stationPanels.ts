import { levelForXp, tileDef, type SkillXp, type StationType } from '@devcraft/shared';
import { BUILDABLES, GENERAL_STORE, itemDef, recipesForStation } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';

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

  constructor(
    private readonly onCraft: (recipe: string, qty: number) => void,
    private readonly onBank: (op: 'deposit' | 'withdraw', item: string, qty: number) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number) => void,
    private readonly onPickBuildable: (id: string) => void,
  ) {}

  get bankOpen(): boolean {
    return !this.bankPanel.classList.contains('hidden');
  }

  get shopOpen(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }

  closeAll(): void {
    this.craftPanel.classList.add('hidden');
    this.bankPanel.classList.add('hidden');
    this.shopPanel.classList.add('hidden');
    this.buildPanel.classList.add('hidden');
  }

  // ------------------------------------------------------------ build

  openBuild(skills: SkillXp): void {
    this.closeAll();
    this.buildList.innerHTML = '';
    const level = levelForXp(skills.construction ?? 0);
    for (const def of BUILDABLES.values()) {
      const locked = level < def.levelReq;
      const row = document.createElement('div');
      row.className = 'list-row' + (locked ? ' disabled' : '');
      const swatch = document.createElement('div');
      swatch.className = 'swatch-mini tile-swatch';
      swatch.style.background = tileDef(def.tile).topColor ?? tileDef(def.tile).color;
      const name = document.createElement('div');
      name.className = 'row-name';
      const mats = def.materials
        .map((m) => `${m.qty}× ${itemDef(m.item)?.name ?? m.item}`)
        .join(', ');
      name.innerHTML = `${def.name}<span class="row-sub">${mats} · lvl ${def.levelReq}</span>`;
      row.append(swatch, name);
      if (!locked) {
        const btn = document.createElement('button');
        btn.textContent = 'Place';
        btn.addEventListener('click', () => this.onPickBuildable(def.id));
        row.appendChild(btn);
      }
      this.buildList.appendChild(row);
    }
    this.buildPanel.classList.remove('hidden');
  }

  // ------------------------------------------------------------ craft

  openCraft(station: StationType | null, skills: SkillXp): void {
    this.closeAll();
    const labels: Record<string, string> = {
      fire: 'Cooking',
      furnace: 'Smelting',
      anvil: 'Smithing',
      workbench: 'Crafting',
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
          btn.addEventListener('click', () => this.onCraft(recipe.id, qty));
          row.appendChild(btn);
        }
      }
      this.craftList.appendChild(row);
    }
    this.craftPanel.classList.remove('hidden');
  }

  // ------------------------------------------------------------- bank

  openBank(items: Record<string, number>): void {
    this.lastBank = items;
    this.closeAll();
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
        btn.addEventListener('click', () => this.onBank('withdraw', item, n));
        row.appendChild(btn);
      }
      this.bankList.appendChild(row);
    }
  }

  // ------------------------------------------------------------- shop

  openShop(): void {
    this.closeAll();
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
        btn.addEventListener('click', () => this.onShop('buy', entry.item, n));
        row.appendChild(btn);
      }
      this.shopList.appendChild(row);
    }
    this.shopPanel.classList.remove('hidden');
  }
}

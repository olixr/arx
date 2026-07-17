import {
  EQUIP_SLOTS,
  SKILL_IDS,
  levelForXp,
  xpForLevel,
  type EquipSlot,
  type InvSlot,
  type SkillXp,
} from '@devcraft/shared';
import { itemDef } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';

/** Inventory + skills side panels (DOM overlay UI). */
export class Panels {
  private readonly invPanel = document.getElementById('inventory-panel')!;
  private readonly invGrid = document.getElementById('inventory-grid')!;
  private readonly equipRow = document.getElementById('equipment-row')!;
  private readonly skillsPanel = document.getElementById('skills-panel')!;
  private readonly skillsList = document.getElementById('skills-list')!;

  constructor(
    private readonly onUseSlot: (slot: number) => void,
    private readonly onUnequip: (slot: EquipSlot) => void,
  ) {
    document.getElementById('btn-inventory')!.addEventListener('click', () => this.toggleInventory());
    document.getElementById('btn-skills')!.addEventListener('click', () => this.toggleSkills());
  }

  toggleInventory(): void {
    this.invPanel.classList.toggle('hidden');
    this.skillsPanel.classList.add('hidden');
  }

  showInventory(): void {
    this.invPanel.classList.remove('hidden');
    this.skillsPanel.classList.add('hidden');
  }

  toggleSkills(): void {
    this.skillsPanel.classList.toggle('hidden');
    this.invPanel.classList.add('hidden');
  }

  renderInventory(slots: InvSlot[]): void {
    this.invGrid.innerHTML = '';
    const count = Math.max(28, slots.length);
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      const slot = slots[i];
      if (slot) {
        const def = itemDef(slot.item);
        cell.classList.add('clickable');
        cell.addEventListener('click', () => this.onUseSlot(i));
        const item = document.createElement('img');
        item.className = 'inv-item';
        item.src = itemIconUrl(slot.item, 44);
        item.draggable = false;
        item.title = def
          ? def.equipSlot
            ? `${def.name} — click to equip`
            : def.heals
              ? `${def.name} — click to eat`
              : def.name
          : slot.item;
        cell.appendChild(item);
        if (slot.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'inv-qty';
          qty.textContent = slot.qty > 9999 ? `${Math.floor(slot.qty / 1000)}k` : String(slot.qty);
          cell.appendChild(qty);
        }
      }
      this.invGrid.appendChild(cell);
    }
  }

  renderEquipment(equipment: Partial<Record<string, string>>): void {
    this.equipRow.innerHTML = '';
    for (const slot of EQUIP_SLOTS) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      const label = document.createElement('span');
      label.className = 'equip-label';
      label.textContent = slot.slice(0, 4);
      cell.appendChild(label);
      const worn = equipment[slot];
      if (worn) {
        const def = itemDef(worn);
        cell.classList.add('clickable');
        cell.title = `${def?.name ?? worn} — click to remove`;
        cell.addEventListener('click', () => this.onUnequip(slot));
        const item = document.createElement('img');
        item.className = 'inv-item';
        item.src = itemIconUrl(worn, 36);
        item.draggable = false;
        cell.appendChild(item);
      }
      this.equipRow.appendChild(cell);
    }
  }

  renderSkills(xp: SkillXp): void {
    this.skillsList.innerHTML = '';
    for (const skill of SKILL_IDS) {
      const value = xp[skill] ?? 0;
      const level = levelForXp(value);
      const floor = xpForLevel(level);
      const ceil = xpForLevel(level + 1);
      const frac = level >= 99 ? 1 : (value - floor) / Math.max(1, ceil - floor);

      const row = document.createElement('div');
      row.className = 'skill-row';
      row.title = `${value.toLocaleString()} xp`;

      const name = document.createElement('span');
      name.className = 'skill-name';
      name.textContent = skill;
      const bar = document.createElement('div');
      bar.className = 'skill-bar';
      const fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.width = `${Math.round(frac * 100)}%`;
      bar.appendChild(fill);
      const lvl = document.createElement('span');
      lvl.className = 'skill-level';
      lvl.textContent = String(level);

      row.append(name, bar, lvl);
      this.skillsList.appendChild(row);
    }
  }
}

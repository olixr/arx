import {
  EQUIP_SLOTS,
  SKILL_IDS,
  levelForXp,
  xpForLevel,
  type EquipSlot,
  type InvSlot,
  type SkillXp,
} from '@devcraft/shared';
import { abilityDef, itemDef, techniquesFor } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';

/** Inventory + skills side panels (DOM overlay UI). */
export class Panels {
  private readonly invPanel = document.getElementById('inventory-panel')!;
  private readonly invGrid = document.getElementById('inventory-grid')!;
  private readonly equipRow = document.getElementById('equipment-row')!;
  private readonly skillsPanel = document.getElementById('skills-panel')!;
  private readonly skillsList = document.getElementById('skills-list')!;
  /** The chosen technique per style, mirrored from the server. */
  private techniques: Record<string, string> = {};
  private lastSkills: SkillXp = {};

  // ---- pointer drag state (mouse drag & drop between pack slots).
  private drag: {
    from: number;
    startX: number;
    startY: number;
    active: boolean;
    ghost: HTMLElement | null;
  } | null = null;

  constructor(
    private readonly onUseSlot: (slot: number) => void,
    private readonly onUnequip: (slot: EquipSlot) => void,
    private readonly onTechnique: (style: string, ability: string) => void = () => {},
    private readonly onInvMove: (from: number, to: number) => void = () => {},
    private readonly onDropToWorld: (slot: number) => void = () => {},
  ) {
    document.getElementById('btn-inventory')!.addEventListener('click', () => this.toggleInventory());
    document.getElementById('btn-skills')!.addEventListener('click', () => this.toggleSkills());
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
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

  closeAll(): void {
    this.invPanel.classList.add('hidden');
    this.skillsPanel.classList.add('hidden');
  }

  get anyOpen(): boolean {
    return (
      !this.invPanel.classList.contains('hidden') ||
      !this.skillsPanel.classList.contains('hidden')
    );
  }

  // ---- drag & drop --------------------------------------------------

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 7) return;
      // Threshold crossed: this press is a DRAG, not a click.
      d.active = true;
      const src = this.invGrid.querySelector<HTMLElement>(`[data-invslot="${d.from}"]`);
      const img = src?.querySelector('img');
      src?.classList.add('drag-src');
      const ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      if (img) {
        const copy = img.cloneNode(true) as HTMLImageElement;
        ghost.appendChild(copy);
      }
      document.body.appendChild(ghost);
      d.ghost = ghost;
    }
    d.ghost!.style.transform = `translate(${e.clientX - 26}px, ${e.clientY - 26}px)`;
    // Highlight the slot under the pointer.
    this.invGrid
      .querySelectorAll('.drop-hover')
      .forEach((el) => el.classList.remove('drop-hover'));
    this.slotUnder(e)?.classList.add('drop-hover');
    // Over open world the ghost arms itself: release here drops the
    // item on the ground at your feet.
    d.ghost!.classList.toggle('drop-armed', this.overWorld(e));
  }

  /** True when the pointer floats over the game canvas, not any UI. */
  private overWorld(e: PointerEvent): boolean {
    return (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.id === 'game';
  }

  private dragEnd(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (!d.active) {
      // A plain click: the contextual use/deposit/sell action.
      this.onUseSlot(d.from);
      return;
    }
    d.ghost?.remove();
    this.invGrid.querySelectorAll('.drag-src, .drop-hover').forEach((el) => {
      el.classList.remove('drag-src');
      el.classList.remove('drop-hover');
    });
    const target = this.slotUnder(e);
    if (target) {
      const to = Number(target.dataset.invslot);
      if (to !== d.from) this.onInvMove(d.from, to);
    } else if (this.overWorld(e)) {
      // Dragged out of the pack onto the world: let it go.
      this.onDropToWorld(d.from);
    }
  }

  private slotUnder(e: PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return (el?.closest('[data-invslot]') as HTMLElement | null) ?? null;
  }

  // ---- rendering ----------------------------------------------------

  renderInventory(slots: InvSlot[]): void {
    this.invGrid.innerHTML = '';
    const count = Math.max(28, slots.length);
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      cell.dataset.nav = '';
      cell.dataset.navkey = `inv:${i}`;
      cell.dataset.invslot = String(i);
      const slot = slots[i];
      if (slot) {
        const def = itemDef(slot.item);
        cell.classList.add('clickable');
        cell.dataset.filled = '1';
        cell.dataset.tipname = def?.name ?? slot.item;
        cell.dataset.tipsub = def?.equipSlot
          ? `Equip · ${def.equipSlot}`
          : def?.heals
            ? `Eat — restores ${def.heals} HP`
            : slot.qty > 1
              ? `${slot.qty.toLocaleString()} in pack`
              : '';
        cell.dataset.acta = def?.equipSlot ? 'Equip' : def?.heals ? 'Eat' : 'Use';
        // Click (no drag) fires in dragEnd; pointerdown arms both paths.
        cell.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          this.drag = { from: i, startX: e.clientX, startY: e.clientY, active: false, ghost: null };
        });
        const item = document.createElement('img');
        item.className = 'inv-item';
        item.src = itemIconUrl(slot.item, 44);
        item.draggable = false;
        cell.appendChild(item);
        if (slot.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'inv-qty';
          qty.textContent = slot.qty > 9999 ? `${Math.floor(slot.qty / 1000)}k` : String(slot.qty);
          cell.appendChild(qty);
        }
        // Pad Ⓐ path: a real click event lands here.
        cell.addEventListener('click', (e) => {
          // Pointer-driven clicks are handled by dragEnd; synthetic
          // (pad) clicks carry no pointer state.
          if (e.detail === 0) this.onUseSlot(i);
        });
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
        cell.dataset.nav = '';
        cell.dataset.navkey = `equip:${slot}`;
        cell.dataset.tipname = def?.name ?? worn;
        cell.dataset.tipsub = `Worn · ${slot}`;
        cell.dataset.acta = 'Remove';
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

  /** Server-confirmed technique choices; re-renders the picker. */
  setTechniques(chosen: Record<string, string>): void {
    this.techniques = chosen;
    this.renderSkills(this.lastSkills);
  }

  renderSkills(xp: SkillXp): void {
    this.lastSkills = xp;
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

      // Combat skills carry their Technique ladder: pick your R.
      const techs = techniquesFor(skill);
      if (techs.length > 0) {
        const techRow = document.createElement('div');
        techRow.className = 'technique-row';
        for (const tech of techs) {
          const ab = abilityDef(tech.ability);
          if (!ab) continue;
          const chip = document.createElement('span');
          chip.className = 'technique-chip';
          const unlocked = level >= tech.unlockLevel;
          if (!unlocked) {
            chip.classList.add('locked');
            chip.textContent = `${ab.name} (lv ${tech.unlockLevel})`;
            // Navigable even though locked: pad players can focus it to
            // read what it does and what unlocks it.
            chip.dataset.nav = '';
            chip.dataset.navkey = `tech:${skill}:${tech.ability}`;
            chip.dataset.acta = 'Locked';
            chip.dataset.tipname = ab.name;
            chip.dataset.tipsub = `${ab.desc} — unlocks at ${skill} level ${tech.unlockLevel}`;
          } else {
            chip.textContent = ab.name;
            chip.dataset.nav = '';
            chip.dataset.navkey = `tech:${skill}:${tech.ability}`;
            chip.dataset.tipname = ab.name;
            chip.dataset.tipsub = ab.desc;
            chip.dataset.acta = 'Equip';
            if (this.techniques[skill] === tech.ability) chip.classList.add('active');
            chip.addEventListener('click', () => this.onTechnique(skill, tech.ability));
          }
          techRow.appendChild(chip);
        }
        this.skillsList.appendChild(techRow);
      }
    }
  }
}

import {
  EQUIP_SLOTS,
  PASSIVES,
  SKILL_IDS,
  levelForXp,
  xpForLevel,
  type EquipSlot,
  type InvSlot,
  type SkillXp,
} from '@devcraft/shared';
import { abilityDef, itemDef, techniquesFor, type ItemDef } from '@devcraft/content';
import { itemIconUrl, slotGlyphUrl } from '../render/icons.js';
import { RARITY_COLORS, rarityOf } from './rarity.js';

/** Explicit verbs the item context menu can dispatch. */
export type SlotAction = 'use' | 'deposit' | 'sell' | 'drop';

/**
 * Inventory + skills side panels (DOM overlay UI), plus the two pieces
 * of the item-inspection layer that ride with them:
 * - the INSPECT CARD: a detail pane pinned beside the pack that names
 *   whatever item the mouse hovers or the pad focuses — stats, granted
 *   abilities, passives, flavor, value;
 * - the CONTEXT MENU: right-click (or Ⓨ on pad) opens the item's verb
 *   list — Equip/Eat, Deposit/Sell in a station, Drop.
 */
export class Panels {
  private readonly invPanel = document.getElementById('inventory-panel')!;
  private readonly invGrid = document.getElementById('inventory-grid')!;
  private readonly equipDoll = document.getElementById('equip-doll')!;
  private readonly coinReadout = document.getElementById('coin-readout')!;
  private readonly skillsPanel = document.getElementById('skills-panel')!;
  private readonly skillsList = document.getElementById('skills-list')!;
  private readonly card: HTMLElement;
  private readonly menu: HTMLElement;
  /** The chosen technique per style, mirrored from the server. */
  private techniques: Record<string, string> = {};
  private lastSkills: SkillXp = {};
  private lastSlots: InvSlot[] = [];
  private lastEquipment: Partial<Record<string, string>> = {};
  /** What the inspect card currently shows (to refresh on re-render). */
  private cardSource: { kind: 'inv'; slot: number } | { kind: 'equip'; slot: string } | null = null;

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
    private readonly onSlotAction: (slot: number, action: SlotAction) => void = () => {},
    /** Which station conversation is open — labels the menu verbs. */
    private readonly stationContext: () => 'bank' | 'shop' | null = () => null,
    /** Active input device — the card's action hints speak its glyphs. */
    private readonly deviceMode: () => 'kb' | 'pad' = () => 'kb',
  ) {
    document.getElementById('btn-inventory')!.addEventListener('click', () => this.toggleInventory());
    document.getElementById('btn-skills')!.addEventListener('click', () => this.toggleSkills());
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));

    this.card = document.createElement('div');
    this.card.id = 'item-card';
    this.card.className = 'hidden';
    document.body.appendChild(this.card);
    this.menu = document.createElement('div');
    this.menu.id = 'item-menu';
    this.menu.className = 'hidden';
    document.body.appendChild(this.menu);
    // A click anywhere outside the menu dismisses it.
    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.classList.contains('hidden') && !this.menu.contains(e.target as Node)) {
        this.closeMenu();
      }
    });
  }

  toggleInventory(): void {
    this.invPanel.classList.toggle('hidden');
    this.skillsPanel.classList.add('hidden');
    if (this.invPanel.classList.contains('hidden')) this.closeInspect();
  }

  showInventory(): void {
    this.invPanel.classList.remove('hidden');
    this.skillsPanel.classList.add('hidden');
  }

  toggleSkills(): void {
    this.skillsPanel.classList.toggle('hidden');
    this.invPanel.classList.add('hidden');
    this.closeInspect();
  }

  closeAll(): void {
    this.invPanel.classList.add('hidden');
    this.skillsPanel.classList.add('hidden');
    this.closeInspect();
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
      this.closeMenu();
      this.hideCard();
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

  // ---- inspect card -------------------------------------------------

  /**
   * Show the detail card for a pack/equipment cell. One path serves
   * both devices: the mouse calls it from hover, the pad from focus.
   * Returns false when the element isn't an inspectable item.
   */
  showCardFor(el: HTMLElement | null): boolean {
    if (!el || el.dataset.filled !== '1') {
      this.hideCard();
      return false;
    }
    if (el.dataset.invslot !== undefined) {
      const idx = Number(el.dataset.invslot);
      const slot = this.lastSlots[idx];
      if (!slot) {
        this.hideCard();
        return false;
      }
      this.cardSource = { kind: 'inv', slot: idx };
      this.renderCard(slot.item, slot.qty, null);
      return true;
    }
    if (el.dataset.equipslot !== undefined) {
      const worn = this.lastEquipment[el.dataset.equipslot];
      if (!worn) {
        this.hideCard();
        return false;
      }
      this.cardSource = { kind: 'equip', slot: el.dataset.equipslot };
      this.renderCard(worn, 1, el.dataset.equipslot);
      return true;
    }
    this.hideCard();
    return false;
  }

  hideCard(): void {
    this.cardSource = null;
    this.card.classList.add('hidden');
  }

  /** Close every transient inspect element (menu + card). */
  closeInspect(): void {
    this.hideCard();
    this.closeMenu();
  }

  /** A speed word beats raw ticks for at-a-glance weapon reads. */
  private static speedWord(cooldownTicks: number): string {
    if (cooldownTicks <= 7) return 'Quick';
    if (cooldownTicks <= 8) return 'Steady';
    return 'Deliberate';
  }

  private static categoryLine(def: ItemDef): string {
    if (def.id === 'coins') return 'Currency';
    if (def.weapon) {
      const style = def.weapon.style;
      return `Weapon · ${style.charAt(0).toUpperCase()}${style.slice(1)}`;
    }
    if (def.tool) return `Tool · ${def.tool.type.charAt(0).toUpperCase()}${def.tool.type.slice(1)}`;
    if (def.equipSlot === 'cape') return 'Cape';
    if (def.equipSlot === 'relic') return 'Relic';
    if (def.equipSlot === 'sigil') return 'Boss Sigil';
    if (def.equipSlot === 'offhand') return 'Offhand';
    if (def.equipSlot) return 'Armor';
    if (def.heals) return 'Food';
    return 'Material';
  }

  private renderCard(itemId: string, qty: number, wornSlot: string | null): void {
    const def = itemDef(itemId);
    if (!def) {
      this.hideCard();
      return;
    }
    this.card.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'card-head';
    const icon = document.createElement('img');
    icon.src = itemIconUrl(itemId, 64);
    icon.draggable = false;
    const title = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = def.name;
    // Rarity speaks through the nameplate; legendary keeps the molten
    // gold treatment from the stylesheet.
    const tier = rarityOf(itemId);
    const rc = RARITY_COLORS[tier];
    if (tier !== 'legendary' && rc) {
      name.classList.add('rarity-name');
      name.style.color = rc;
    } else if (tier === 'common') {
      name.classList.add('rarity-name');
      name.style.color = 'var(--parchment)';
    }
    const cat = document.createElement('div');
    cat.className = 'card-cat';
    cat.textContent = wornSlot
      ? `${Panels.categoryLine(def)} · worn (${wornSlot}) · ${tier}`
      : `${Panels.categoryLine(def)} · ${tier}`;
    title.append(name, cat);
    head.append(icon, title);
    this.card.appendChild(head);

    const stat = (label: string, text: string, color?: string): void => {
      const row = document.createElement('div');
      row.className = 'card-stat';
      const chip = document.createElement('span');
      chip.className = 'stat-chip';
      chip.style.background = color ?? 'var(--gold)';
      const lab = document.createElement('span');
      lab.className = 'stat-label';
      lab.textContent = label;
      const val = document.createElement('span');
      val.textContent = text;
      row.append(chip, lab, val);
      this.card.appendChild(row);
    };

    const w = def.weapon;
    if (w) {
      stat('Damage', `${w.damage} · ${Panels.speedWord(w.cooldownTicks)}`, '#c4553d');
      stat(w.style === 'melee' ? 'Reach' : 'Range', `${w.range} tiles`, '#c9a23c');
      if (w.ammo) stat('Ammo', itemDef(w.ammo)?.name ?? w.ammo, '#c4b590');
      const art = w.art ? abilityDef(w.art) : undefined;
      if (art) stat('Art (Q)', art.name, '#9a7ae0');
    }
    if (def.tool) stat('Power', `${def.tool.power}`, '#c9a23c');
    if (def.armor) stat('Armor', `+${def.armor}`, '#8ac4e8');
    if (def.heals) stat('Heals', `${def.heals} HP`, '#4fc06a');
    const relicAb = def.relic ? abilityDef(def.relic) : undefined;
    if (relicAb) stat('Relic (E)', relicAb.name, '#7ac47a');
    const sigilAb = def.sigil ? abilityDef(def.sigil) : undefined;
    if (sigilAb) stat('Sigil (T)', sigilAb.name, '#e8e2d0');
    if (def.passive) {
      const p = PASSIVES[def.passive];
      stat('Passive', p.name, p.color);
      const pd = document.createElement('div');
      pd.className = 'card-passive-desc';
      pd.textContent = p.desc;
      this.card.appendChild(pd);
    }

    if (def.desc) {
      const flavor = document.createElement('div');
      flavor.className = 'card-flavor';
      flavor.textContent = def.desc;
      this.card.appendChild(flavor);
    }

    const foot = document.createElement('div');
    foot.className = 'card-foot';
    const value = document.createElement('span');
    value.className = 'card-value';
    value.textContent =
      qty > 1
        ? `${qty.toLocaleString()} in pack · ${def.value.toLocaleString()}c each`
        : `Value ${def.value.toLocaleString()}c`;
    foot.appendChild(value);
    this.card.appendChild(foot);

    // Device-aware action hints — the card teaches its own controls.
    const hints = document.createElement('div');
    hints.className = 'card-hints';
    const pad = this.deviceMode() === 'pad';
    const hint = (glyph: string, cls: string, label: string): void => {
      const item = document.createElement('span');
      item.className = 'hint-item';
      const g = document.createElement('span');
      g.className = cls;
      g.textContent = glyph;
      const t = document.createElement('span');
      t.textContent = label;
      item.append(g, t);
      hints.appendChild(item);
    };
    const primary = wornSlot ? 'Remove' : def.equipSlot ? 'Equip' : def.heals ? 'Eat' : null;
    if (pad) {
      if (primary) hint('A', 'pad-glyph a', primary);
      hint('Y', 'pad-glyph y', 'Options');
      if (!wornSlot) hint('X', 'pad-glyph x', 'Move');
    } else {
      if (primary) hint('Click', 'kb-glyph', primary);
      hint('R-Click', 'kb-glyph', 'Options');
      if (!wornSlot) hint('Drag', 'kb-glyph', 'Move / drop out');
    }
    this.card.appendChild(hints);

    // Pin beside the inventory panel's outer edge.
    this.card.classList.remove('hidden');
    const pr = this.invPanel.getBoundingClientRect();
    const cw = this.card.offsetWidth;
    const x = Math.max(8, pr.left - cw - 12);
    const y = Math.min(Math.max(8, pr.top), window.innerHeight - this.card.offsetHeight - 8);
    this.card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ---- context menu -------------------------------------------------

  /** Open the verb menu for a pack slot or a worn equipment slot. */
  openMenuFor(el: HTMLElement, at?: { x: number; y: number }): boolean {
    if (el.dataset.filled !== '1') return false;
    const entries: Array<{ label: string; act: () => void; danger?: boolean }> = [];

    if (el.dataset.invslot !== undefined) {
      const idx = Number(el.dataset.invslot);
      const slot = this.lastSlots[idx];
      if (!slot) return false;
      const def = itemDef(slot.item);
      const station = this.stationContext();
      if (def?.equipSlot) entries.push({ label: 'Equip', act: () => this.onSlotAction(idx, 'use') });
      else if (def?.heals) entries.push({ label: 'Eat', act: () => this.onSlotAction(idx, 'use') });
      if (station === 'bank') {
        entries.push({ label: `Deposit ${slot.qty > 1 ? 'all' : ''}`.trim(), act: () => this.onSlotAction(idx, 'deposit') });
      } else if (station === 'shop') {
        entries.push({ label: 'Sell one', act: () => this.onSlotAction(idx, 'sell') });
      }
      entries.push({ label: 'Drop', act: () => this.onSlotAction(idx, 'drop'), danger: true });
    } else if (el.dataset.equipslot !== undefined) {
      const slot = el.dataset.equipslot as EquipSlot;
      if (!this.lastEquipment[slot]) return false;
      entries.push({ label: 'Remove', act: () => this.onUnequip(slot) });
    } else {
      return false;
    }

    this.menu.innerHTML = '';
    entries.forEach((entry, i) => {
      const btn = document.createElement('button');
      btn.className = 'menu-item';
      if (entry.danger) btn.classList.add('danger');
      btn.textContent = entry.label;
      btn.dataset.nav = '';
      btn.dataset.navkey = `menu:${i}`;
      btn.dataset.acta = entry.label;
      btn.addEventListener('click', () => {
        this.closeMenu();
        entry.act();
      });
      this.menu.appendChild(btn);
    });
    this.menu.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    const x = at?.x ?? r.left - this.menu.offsetWidth - 6;
    const y = at?.y ?? r.top;
    const cx = Math.max(6, Math.min(window.innerWidth - this.menu.offsetWidth - 6, x));
    const cy = Math.max(6, Math.min(window.innerHeight - this.menu.offsetHeight - 6, y));
    this.menu.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    return true;
  }

  /** Close the verb menu. Returns true if one was open (Ⓑ backstop). */
  closeMenu(): boolean {
    if (this.menu.classList.contains('hidden')) return false;
    this.menu.classList.add('hidden');
    return true;
  }

  get menuOpen(): boolean {
    return !this.menu.classList.contains('hidden');
  }

  // ---- rendering ----------------------------------------------------

  renderInventory(slots: InvSlot[]): void {
    this.lastSlots = slots;
    this.invGrid.innerHTML = '';
    const count = Math.max(28, slots.length);
    let coins = 0;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      cell.dataset.nav = '';
      cell.dataset.navkey = `inv:${i}`;
      cell.dataset.invslot = String(i);
      const slot = slots[i];
      if (slot) {
        const def = itemDef(slot.item);
        if (slot.item === 'coins') coins += slot.qty;
        cell.classList.add('clickable');
        const tier = rarityOf(slot.item);
        if (tier !== 'common') cell.classList.add(`rarity-${tier}`);
        cell.dataset.filled = '1';
        cell.dataset.tipname = def?.name ?? slot.item;
        cell.dataset.acta = def?.equipSlot ? 'Equip' : def?.heals ? 'Eat' : 'Use';
        // Click (no drag) fires in dragEnd; pointerdown arms both paths.
        cell.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          this.drag = { from: i, startX: e.clientX, startY: e.clientY, active: false, ghost: null };
        });
        // Right-click: the item's verb menu, at the pointer.
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.openMenuFor(cell, { x: e.clientX, y: e.clientY });
        });
        const item = document.createElement('img');
        item.className = 'inv-item';
        item.src = itemIconUrl(slot.item, 52);
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
    this.coinReadout.innerHTML = '';
    const coinIcon = document.createElement('img');
    coinIcon.src = itemIconUrl('coins', 20);
    coinIcon.draggable = false;
    const coinText = document.createElement('span');
    coinText.textContent = coins.toLocaleString();
    this.coinReadout.append(coinIcon, coinText);

    // The card may be describing a slot that just changed — refresh it.
    if (this.cardSource?.kind === 'inv') {
      const src = this.lastSlots[this.cardSource.slot];
      if (src) this.renderCard(src.item, src.qty, null);
      else this.hideCard();
    }
  }

  renderEquipment(equipment: Partial<Record<string, string>>): void {
    this.lastEquipment = equipment;
    this.equipDoll.innerHTML = '';
    // Paper-doll order: the grid areas lay the body out — head crowned,
    // weapon hand left, offhand right, trinkets on the flanks.
    for (const slot of EQUIP_SLOTS) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot equip-cell';
      cell.style.gridArea = slot;
      cell.dataset.equipslot = slot;
      const worn = equipment[slot];
      if (worn) {
        const def = itemDef(worn);
        cell.classList.add('clickable', 'equipped');
        const tier = rarityOf(worn);
        if (tier !== 'common') cell.classList.add(`rarity-${tier}`);
        cell.dataset.filled = '1';
        cell.dataset.nav = '';
        cell.dataset.navkey = `equip:${slot}`;
        cell.dataset.tipname = def?.name ?? worn;
        cell.dataset.acta = 'Remove';
        cell.addEventListener('click', () => this.onUnequip(slot));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.openMenuFor(cell, { x: e.clientX, y: e.clientY });
        });
        const item = document.createElement('img');
        item.className = 'inv-item';
        item.src = itemIconUrl(worn, 44);
        item.draggable = false;
        cell.appendChild(item);
      } else {
        // An empty socket shows its purpose as a dim glyph.
        cell.dataset.tipname = slot.charAt(0).toUpperCase() + slot.slice(1);
        const ghost = document.createElement('img');
        ghost.className = 'slot-ghost';
        ghost.src = slotGlyphUrl(slot, 40);
        ghost.draggable = false;
        cell.appendChild(ghost);
      }
      this.equipDoll.appendChild(cell);
    }

    if (this.cardSource?.kind === 'equip') {
      const worn = this.lastEquipment[this.cardSource.slot];
      if (worn) this.renderCard(worn, 1, this.cardSource.slot);
      else this.hideCard();
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

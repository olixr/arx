import { EQUIP_SLOTS, PASSIVES, type AbilitySlot } from '@arx/shared';
import { ENCHANTS, itemDef, tameDef } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import { itemIconUrl, sneakEyeUrl } from '../render/icons.js';
import { petPortraitUrl } from '../render/petPortrait.js';
import { abilityIconUrl, passiveIconUrl } from '../render/abilityIcons.js';
import { bindings, type ActionId } from '../input/bindings.js';
import { elementTint } from '../render/wornLight.js';

/**
 * THE METER SHOWS ITS HAND: the wire carries only (id, have, need) for
 * a stacking working; the roster answers everything else. Built once.
 * ONE ID = ONE TIMER = ONE METER means a proc id names one working
 * across the whole roster, so the map cannot be ambiguous.
 */
let procHomes: Map<string, { ench: string; name: string; element: string }> | null = null;
function procHome(id: string) {
  if (!procHomes) {
    procHomes = new Map();
    for (const e of ENCHANTS.values()) {
      for (const fx of e.effects) {
        if (fx.kind === 'proc') {
          procHomes.set(fx.id, { ench: e.id, name: fx.name, element: fx.element ?? e.element });
        }
      }
    }
  }
  return procHomes.get(id);
}

/** Per-SLOT action ids and empty hints (indexed by slot, not bar order). */
const SLOT_ACTIONS: readonly ActionId[] = ['ability1', 'ability2', 'ability3', 'ability4'];
const EMPTY_HINTS = [
  'Seat your first art in the codex',
  'Wear a relic to gain its power',
  'Seat your second art in the codex',
  'Claim a Sigil from a fallen boss',
] as const;

/**
 * THE PAIRED HAND: the bar shows the two technique seats TOGETHER,
 * arts first, trinkets after — [Q] first art, [E] second art, then a
 * breath of space, [R] relic, [T] Sigil. Display order only; slot
 * INDICES are wire truth and never move (relic stays slot 1, second
 * seat stays slot 2).
 */
const BAR_ORDER = [0, 2, 1, 3] as const;

/**
 * The combat hotbar: four ability slots — [Q] first art, [E] second
 * art (THE SECOND HAND: both free technique seats, side by side),
 * [R] relic, [T] boss Sigil — each with a radial cooldown wipe, a
 * ready flash, and a tooltip, plus a tray of the passives your worn
 * gear grants. A seat holding a lent secret art dims while its
 * teaching weapon is away (THE LOAN LAW). Slots are also buttons:
 * pressing one casts, so touch and mouse players get abilities
 * without a keyboard.
 */
export class Hotbar {
  /**
   * THE COMPANION CHIP (beastcraft v2 Phase 5): the heel friend's
   * face, name, and health beside the buff chips — one glance says
   * fighting fit, wounded, downed, resting, or catching up. A
   * permanent tray resident on the sneak-eye pattern; DOM writes only
   * on change (the perf law of this file).
   */
  private readonly petChip = document.createElement('div');
  private readonly petFace = document.createElement('img');
  private readonly petName = document.createElement('div');
  private readonly petHpFill = document.createElement('div');
  private petKey = '';

  private readonly root = document.getElementById('hotbar')!;
  private readonly tray = document.getElementById('passive-tray')!;
  private readonly buffTray = document.getElementById('buff-tray')!;
  private buffKey = '';
  private readonly buffSecsEls: HTMLElement[] = [];
  /** Stealth-state eye chip (sneaking / hidden / detected). */
  private readonly sneakChip = document.createElement('div');
  private readonly sneakEye = document.createElement('img');
  private sneakState = '';
  private readonly slots: HTMLElement[] = [];
  private readonly wipes: HTMLElement[] = [];
  private readonly icons: HTMLElement[] = [];
  private readonly names: string[] = ['', '', '', ''];
  private readonly wasReady: boolean[] = [true, true, true, true];
  private readonly wasDormant: boolean[] = [false, false, false, false];
  private trayKey = '';
  /** Fires when a slot transitions to ready (for the soft tick). */
  onReady: (() => void) | null = null;

  constructor(input: InputManager) {
    for (const i of BAR_ORDER) {
      const slot = document.createElement('button');
      slot.className = 'hotbar-slot empty';
      // The trinket pair stands a breath apart from the art pair.
      if (i === 1) slot.classList.add('trinket-lead');
      // The empty-state hint is painted here and on empty TRANSITIONS
      // only — update() must never write styles on unchanged frames.
      slot.title = EMPTY_HINTS[i]!;
      slot.type = 'button';

      const icon = document.createElement('div');
      icon.className = 'hotbar-icon';
      slot.appendChild(icon);

      const wipe = document.createElement('div');
      wipe.className = 'hotbar-wipe';
      slot.appendChild(wipe);

      // Device-aware key badge: keyboard letter or pad glyph, swapped
      // by body.pad-mode so the HUD always speaks the player's device.
      // Read from the one keymap and redrawn on every rebind.
      const key = document.createElement('span');
      key.className = 'hotbar-key';
      const renderBadge = (): void => {
        key.innerHTML = '';
        const kbText = bindings.kbBadge(SLOT_ACTIONS[i]!);
        if (kbText) {
          const kb = document.createElement('span');
          kb.className = 'kb-glyph small';
          kb.textContent = kbText;
          key.appendChild(kb);
        }
        const g = bindings.padBadge(SLOT_ACTIONS[i]!);
        if (g) {
          const pad = document.createElement('span');
          pad.className = `pad-glyph ${g.cls}`;
          pad.textContent = g.text;
          key.appendChild(pad);
        }
      };
      renderBadge();
      bindings.onChange(renderBadge);
      slot.appendChild(key);

      // Press-and-release drives the same input bit the keyboard does;
      // the server's edge detection turns it into exactly one cast.
      const set = (down: boolean) => {
        if (i === 0) input.touchAbility1 = down;
        else if (i === 1) input.touchAbility2 = down;
        else if (i === 2) input.touchAbility3 = down;
        else input.touchAbility4 = down;
      };
      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        set(true);
      });
      slot.addEventListener('pointerup', () => set(false));
      slot.addEventListener('pointercancel', () => set(false));
      slot.addEventListener('pointerleave', () => set(false));

      this.root.appendChild(slot);
      // Indexed by SLOT, not by bar position — update()/setAiming()
      // speak slot numbers and must land on the right well.
      this.slots[i] = slot;
      this.wipes[i] = wipe;
      this.icons[i] = icon;
    }

    // The stealth eye lives beside the buff chips, shown only while the
    // sneak latch is on: half-lidded = sneaking, closed = hidden, open
    // red = an NPC has you.
    this.sneakChip.className = 'buff-chip sneak-eye';
    this.sneakChip.style.display = 'none';
    this.sneakEye.draggable = false;
    this.sneakChip.appendChild(this.sneakEye);
    this.buffTray.appendChild(this.sneakChip);

    // The companion chip: portrait, name, and a health sliver.
    this.petChip.className = 'buff-chip pet-chip';
    this.petChip.style.display = 'none';
    this.petFace.className = 'pet-chip-face';
    this.petFace.draggable = false;
    this.petName.className = 'pet-chip-name';
    const hpBar = document.createElement('div');
    hpBar.className = 'pet-chip-hp';
    this.petHpFill.className = 'pet-chip-hp-fill';
    hpBar.appendChild(this.petHpFill);
    const col = document.createElement('div');
    col.className = 'pet-chip-col';
    col.appendChild(this.petName);
    col.appendChild(hpBar);
    this.petChip.appendChild(this.petFace);
    this.petChip.appendChild(col);
    // THE QUIET HEEL: the chip is the always-there hand — clicking it
    // pats the friend at your side (the world prompt stays quiet).
    this.petChip.addEventListener('click', () => this.onPetChip?.());
    this.buffTray.appendChild(this.petChip);
  }

  /** Fires when the companion chip is clicked (the pat channel). */
  onPetChip: (() => void) | null = null;

  /** THE HELD SIGIL: the slot whose ring is being aimed right now. */
  private aimingSlot: AbilitySlot | null = null;

  setAiming(slot: AbilitySlot | null): void {
    if (slot === this.aimingSlot) return;
    if (this.aimingSlot !== null) this.slots[this.aimingSlot]?.classList.remove('aiming');
    if (slot !== null) this.slots[slot]?.classList.add('aiming');
    this.aimingSlot = slot;
  }

  /** Called once per frame — cheap DOM writes only on change. */
  update(game: ClientGame): void {
    const now = performance.now();
    for (const slot of [0, 1, 2, 3] as const) {
      const ab = game.slotAbilityDef(slot as AbilitySlot);
      const el = this.slots[slot]!;
      const icon = this.icons[slot]!;

      if (!ab) {
        if (this.names[slot] !== '') {
          this.names[slot] = '';
          this.wasDormant[slot] = false;
          el.classList.add('empty');
          el.classList.remove('dormant');
          icon.replaceChildren();
          el.title = EMPTY_HINTS[slot]!;
          this.wipes[slot]!.style.background = 'none';
        }
        continue;
      }

      // THE LOAN LAW on the tray: a lent secret sleeps while its
      // teacher is away — dimmed plate, honest tooltip, no radial lie.
      const dormant = game.seatDormant(slot as AbilitySlot);
      if (this.names[slot] !== ab.name || dormant !== this.wasDormant[slot]) {
        this.names[slot] = ab.name;
        this.wasDormant[slot] = dormant;
        el.classList.remove('empty');
        el.classList.toggle('dormant', dormant);
        el.title = dormant
          ? `${ab.name} sleeps. Hold a weapon that teaches it.`
          : `${ab.name} — ${ab.desc}`;
        // The spell-plate: a bespoke painted icon, not a lettered chip.
        const img = document.createElement('img');
        img.src = abilityIconUrl(ab.id, 60);
        img.draggable = false;
        icon.replaceChildren(img);
      }

      const frac = game.abilityCdFraction(slot as AbilitySlot, now);
      const ready = frac <= 0;
      if (!ready) {
        // Radial wipe: the covered sector shrinks as the cooldown runs.
        const deg = Math.round(frac * 360);
        this.wipes[slot]!.style.background =
          `conic-gradient(rgba(12, 9, 20, 0.78) ${deg}deg, transparent ${deg}deg)`;
        el.classList.add('cooling');
      } else if (!this.wasReady[slot]) {
        // One clearing write on the ready EDGE — a steady-state ready
        // slot pays zero style writes per frame.
        this.wipes[slot]!.style.background = 'none';
        el.classList.remove('cooling');
      }

      if (ready && !this.wasReady[slot]) {
        // Snap-flash the moment it comes back — the "go" signal.
        el.classList.remove('flash');
        void el.offsetWidth; // restart the animation
        el.classList.add('flash');
        this.onReady?.();
      }
      this.wasReady[slot] = ready;
    }

    // Passive tray: the quiet half of the build, rebuilt only when the
    // worn passives actually change.
    let key = '';
    for (const slot of EQUIP_SLOTS) {
      const p = itemDef(game.equipment[slot]?.id ?? '')?.passive;
      if (p) key += p + '|';
    }
    if (key !== this.trayKey) {
      this.trayKey = key;
      this.tray.innerHTML = '';
      for (const id of key.split('|')) {
        if (!id) continue;
        const meta = PASSIVES[id as keyof typeof PASSIVES];
        if (!meta) continue;
        const chip = document.createElement('div');
        chip.className = 'passive-chip';
        chip.title = `${meta.name}: ${meta.desc}`;
        const img = document.createElement('img');
        img.src = passiveIconUrl(id, 26);
        img.draggable = false;
        chip.appendChild(img);
        this.tray.appendChild(chip);
      }
    }

    // Consumable buff chips + the equipped weapon's oil (which lives on
    // the weapon INSTANCE, not on the player): rebuilt on list change,
    // countdown every frame. The oil chip vanishes when the coat dries
    // or a clean weapon is drawn.
    const coat = game.equipment.weapon?.roll?.coat;
    const oil = coat && coat.until > Date.now() ? coat : undefined;
    const bKey =
      game.buffs.map((b) => `${b.id}:${b.channel}`).join('|') +
      (oil ? `|oil:${oil.id}` : '') +
      game.charges.map((c) => `|chg:${c.id}:${c.have}`).join('');
    if (bKey !== this.buffKey) {
      this.buffKey = bKey;
      this.buffTray.innerHTML = '';
      // The eye and companion chips are permanent residents — survive
      // the rebuild.
      this.buffTray.appendChild(this.sneakChip);
      this.buffTray.appendChild(this.petChip);
      this.buffSecsEls.length = 0;
      for (const b of game.buffs) {
        const chip = document.createElement('div');
        chip.className = `buff-chip ${b.channel}`;
        chip.title = `${b.name}: ${b.channel === 'food' ? 'well fed' : 'tonic'}`;
        const img = document.createElement('img');
        img.src = itemIconUrl(b.id, 34);
        img.draggable = false;
        const secs = document.createElement('span');
        secs.className = 'buff-secs';
        chip.append(img, secs);
        this.buffTray.appendChild(chip);
        this.buffSecsEls.push(secs);
      }
      if (oil) {
        const c = itemDef(oil.id)?.coating;
        const chip = document.createElement('div');
        chip.className = 'buff-chip coating';
        chip.title = `${c?.name ?? 'Weapon oil'}: on your equipped weapon`;
        const img = document.createElement('img');
        img.src = itemIconUrl(oil.id, 34);
        img.draggable = false;
        const secs = document.createElement('span');
        secs.className = 'buff-secs';
        chip.append(img, secs);
        this.buffTray.appendChild(chip);
        this.buffSecsEls.push(secs);
      }
      // Stacking-working meters (THE METER SHOWS ITS HAND). The count
      // is baked into the rebuild key, so the text never needs the
      // per-frame countdown walk — these spans stay OUT of buffSecsEls.
      for (const c of game.charges) {
        const home = procHome(c.id);
        if (!home) continue;
        const chip = document.createElement('div');
        chip.className = 'buff-chip charge' + (c.have >= c.need - 1 ? ' primed' : '');
        const tint = elementTint(home.element);
        chip.style.boxShadow = `inset 0 0 0 1.5px rgba(${tint.glow}, 0.55), 0 2px 4px rgba(6, 4, 2, 0.45)`;
        chip.title =
          c.have >= c.need - 1
            ? `${home.name}: one moment from answering`
            : `${home.name}: ${c.have} of ${c.need} banked`;
        const img = document.createElement('img');
        img.src = itemIconUrl(`scroll_${home.ench}`, 34);
        img.draggable = false;
        const count = document.createElement('span');
        count.className = 'buff-secs';
        count.textContent = `${c.have}/${c.need}`;
        chip.append(img, count);
        this.buffTray.appendChild(chip);
      }
    }
    for (let i = 0; i < this.buffSecsEls.length; i++) {
      const b = game.buffs[i];
      const left = b
        ? Math.max(0, Math.round(b.secsLeft - (now - game.buffsAt) / 1000))
        : Math.max(0, Math.round(((oil?.until ?? 0) - Date.now()) / 1000));
      const text = left >= 60 ? `${Math.floor(left / 60)}m${String(left % 60).padStart(2, '0')}` : `${left}s`;
      if (this.buffSecsEls[i]!.textContent !== text) this.buffSecsEls[i]!.textContent = text;
    }

    // Stealth eye chip — state changes are rare; DOM writes only then.
    const state = !game.isSneaking
      ? ''
      : game.isDetected
        ? 'detected'
        : game.isHidden
          ? 'hidden'
          : 'sneaking';
    if (state !== this.sneakState) {
      this.sneakState = state;
      if (state === '') {
        this.sneakChip.style.display = 'none';
      } else {
        this.sneakChip.style.display = '';
        this.sneakChip.classList.toggle('hidden-pulse', state === 'hidden');
        this.sneakEye.src = sneakEyeUrl(state as 'sneaking' | 'hidden' | 'detected');
        this.sneakChip.title =
          state === 'hidden'
            ? 'Hidden: no one can see you'
            : state === 'detected'
              ? 'Detected: a hostile has found you'
              : 'Sneaking: harder to notice (lvl 50: vanish while still; lvl 90: vanish while moving)';
      }
    }

    // The companion chip: the active friend (heel, trailing, downed)
    // or the nearest resting one — one truth per frame, written only
    // on change.
    const active =
      game.ownPets.find((pp) => pp.state === 'heel' || pp.state === 'trailing' || pp.state === 'downed') ??
      game.ownPets.find((pp) => pp.state === 'resting');
    // THE QUIET HEEL: a soft glint when the bond moment reopens — the
    // chip carries the care-loop reminder so the world prompt never
    // has to. The glint asks for the treat; holding it is your side.
    const bond = active !== undefined && active.state === 'heel' && game.petBondReady(active.slot);
    const pKey = active
      ? `${active.slot}:${active.species}:${active.name}:${active.state}:${active.hp}:${active.maxHp}:${active.restSec ?? ''}:${bond ? 'B' : ''}`
      : '';
    if (pKey !== this.petKey) {
      this.petKey = pKey;
      if (!active) {
        this.petChip.style.display = 'none';
      } else {
        this.petChip.style.display = '';
        this.petFace.src = petPortraitUrl(active.species, 40);
        this.petName.textContent =
          active.state === 'resting'
            ? `${active.name} · rests ${Math.max(1, active.restSec ?? 0)}s`
            : active.state === 'downed'
              ? `${active.name} · down`
              : active.state === 'trailing'
                ? `${active.name} · behind`
                : active.name;
        this.petChip.classList.toggle('pet-downed', active.state === 'downed');
        this.petChip.classList.toggle('pet-resting', active.state === 'resting');
        this.petChip.classList.toggle('pet-bond', bond);
        this.petHpFill.style.width = `${Math.round((100 * active.hp) / Math.max(1, active.maxHp))}%`;
        const lureName = itemDef(tameDef(active.species)?.lure ?? '')?.name.toLowerCase();
        this.petChip.title =
          active.state === 'downed'
            ? `${active.name} is down. Kneel to it before it drags itself home.`
            : bond && lureName
              ? `${active.name} watches your hands. ${lureName.charAt(0).toUpperCase()}${lureName.slice(1)} offered by hand would deepen the bond.`
              : `${active.name}, your companion. Click to give it a pat.`;
      }
    }
  }
}

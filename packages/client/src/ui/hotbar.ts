import { EQUIP_SLOTS, PASSIVES, type AbilitySlot } from '@arx/shared';
import { itemDef } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import { itemIconUrl, sneakEyeUrl } from '../render/icons.js';
import { abilityIconUrl, passiveIconUrl } from '../render/abilityIcons.js';

const SLOT_KEYS = ['Q', 'E', 'R', 'T'] as const;
/** Pad bindings for the same four slots: LB, RB, Y, d-pad up. */
const SLOT_PAD = [
  ['lb', 'LB'],
  ['rb', 'RB'],
  ['y', 'Y'],
  ['dup', '▲'],
] as const;
const EMPTY_HINTS = [
  'Equip a weapon to gain its Art',
  'Wear a relic to gain its power',
  'Choose a Technique in the codex (V)',
  'Claim a Sigil from a fallen boss',
] as const;

/**
 * The combat hotbar: four ability slots — [Q] weapon Art, [E] relic,
 * [R] learned Technique, [T] boss Sigil — each with a radial cooldown
 * wipe, a ready flash, and a tooltip, plus a tray of the passives your
 * worn gear grants. Slots are also buttons: pressing one casts, so
 * touch and mouse players get abilities without a keyboard.
 */
export class Hotbar {
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
  private trayKey = '';
  /** Fires when a slot transitions to ready (for the soft tick). */
  onReady: (() => void) | null = null;

  constructor(input: InputManager) {
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('button');
      slot.className = 'hotbar-slot empty';
      slot.type = 'button';

      const icon = document.createElement('div');
      icon.className = 'hotbar-icon';
      slot.appendChild(icon);

      const wipe = document.createElement('div');
      wipe.className = 'hotbar-wipe';
      slot.appendChild(wipe);

      // Device-aware key badge: keyboard letter or pad glyph, swapped
      // by body.pad-mode so the HUD always speaks the player's device.
      const key = document.createElement('span');
      key.className = 'hotbar-key';
      const kb = document.createElement('span');
      kb.className = 'kb-glyph small';
      kb.textContent = SLOT_KEYS[i]!;
      const [padCls, padLabel] = SLOT_PAD[i]!;
      const pad = document.createElement('span');
      pad.className = `pad-glyph ${padCls}`;
      pad.textContent = padLabel;
      key.append(kb, pad);
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
      this.slots.push(slot);
      this.wipes.push(wipe);
      this.icons.push(icon);
    }

    // The stealth eye lives beside the buff chips, shown only while the
    // sneak latch is on: half-lidded = sneaking, closed = hidden, open
    // red = an NPC has you.
    this.sneakChip.className = 'buff-chip sneak-eye';
    this.sneakChip.style.display = 'none';
    this.sneakEye.draggable = false;
    this.sneakChip.appendChild(this.sneakEye);
    this.buffTray.appendChild(this.sneakChip);
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
          el.classList.add('empty');
          icon.replaceChildren();
        }
        el.title = EMPTY_HINTS[slot]!;
        this.wipes[slot]!.style.background = 'none';
        continue;
      }

      if (this.names[slot] !== ab.name) {
        this.names[slot] = ab.name;
        el.classList.remove('empty');
        el.title = `${ab.name} — ${ab.desc}`;
        // The spell-plate: a bespoke painted icon, not a lettered chip.
        const img = document.createElement('img');
        img.src = abilityIconUrl(ab.id, 60);
        img.draggable = false;
        icon.replaceChildren(img);
      }

      const frac = game.abilityCdFraction(slot as AbilitySlot, now);
      const ready = frac <= 0;
      if (ready) {
        this.wipes[slot]!.style.background = 'none';
      } else {
        // Radial wipe: the covered sector shrinks as the cooldown runs.
        const deg = Math.round(frac * 360);
        this.wipes[slot]!.style.background =
          `conic-gradient(rgba(12, 9, 20, 0.78) ${deg}deg, transparent ${deg}deg)`;
      }
      el.classList.toggle('cooling', !ready);

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
        chip.title = `${meta.name} — ${meta.desc}`;
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
      game.buffs.map((b) => `${b.id}:${b.channel}`).join('|') + (oil ? `|oil:${oil.id}` : '');
    if (bKey !== this.buffKey) {
      this.buffKey = bKey;
      this.buffTray.innerHTML = '';
      // The eye chip is a permanent resident — survive the rebuild.
      this.buffTray.appendChild(this.sneakChip);
      this.buffSecsEls.length = 0;
      for (const b of game.buffs) {
        const chip = document.createElement('div');
        chip.className = `buff-chip ${b.channel}`;
        chip.title = `${b.name} — ${b.channel === 'food' ? 'well fed' : 'tonic'}`;
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
        chip.title = `${c?.name ?? 'Weapon oil'} — on your equipped weapon`;
        const img = document.createElement('img');
        img.src = itemIconUrl(oil.id, 34);
        img.draggable = false;
        const secs = document.createElement('span');
        secs.className = 'buff-secs';
        chip.append(img, secs);
        this.buffTray.appendChild(chip);
        this.buffSecsEls.push(secs);
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
            ? 'Hidden — no one can see you'
            : state === 'detected'
              ? 'Detected — a hostile has found you'
              : 'Sneaking — harder to notice (lvl 50: vanish while still; lvl 90: vanish while moving)';
      }
    }
  }
}

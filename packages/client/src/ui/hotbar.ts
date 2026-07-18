import { EQUIP_SLOTS, PASSIVES, type AbilitySlot } from '@devcraft/shared';
import { itemDef } from '@devcraft/content';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';

const SLOT_KEYS = ['Q', 'E', 'R', 'T'] as const;
const EMPTY_HINTS = [
  'Equip a weapon to gain its Art',
  'Wear a relic to gain its power',
  'Learn a Technique in the Skills panel (K)',
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

      const key = document.createElement('span');
      key.className = 'hotbar-key';
      key.textContent = SLOT_KEYS[i]!;
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
          icon.textContent = '';
          icon.style.background = 'transparent';
        }
        el.title = EMPTY_HINTS[slot]!;
        this.wipes[slot]!.style.background = 'none';
        continue;
      }

      if (this.names[slot] !== ab.name) {
        this.names[slot] = ab.name;
        el.classList.remove('empty');
        el.title = `${ab.name} — ${ab.desc}`;
        icon.textContent = ab.code;
        icon.style.background = ab.color;
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
      const p = itemDef(game.equipment[slot] ?? '')?.passive;
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
        chip.textContent = meta.code;
        chip.style.background = meta.color;
        this.tray.appendChild(chip);
      }
    }
  }
}

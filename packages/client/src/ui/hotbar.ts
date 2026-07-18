import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';

/**
 * The combat hotbar: two ability slots — [Q] weapon Art, [E] relic —
 * each with a radial cooldown wipe, a ready flash, and a tooltip.
 * Slots are also buttons: pressing one casts, so touch and mouse
 * players get abilities without a keyboard.
 */
export class Hotbar {
  private readonly root = document.getElementById('hotbar')!;
  private readonly slots: HTMLElement[] = [];
  private readonly wipes: HTMLElement[] = [];
  private readonly icons: HTMLElement[] = [];
  private readonly names: string[] = ['', ''];
  private readonly wasReady: boolean[] = [true, true];
  /** Fires when a slot transitions to ready (for the soft tick). */
  onReady: (() => void) | null = null;

  constructor(input: InputManager) {
    for (let i = 0; i < 2; i++) {
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
      key.textContent = i === 0 ? 'Q' : 'E';
      slot.appendChild(key);

      // Press-and-release drives the same input bit the keyboard does;
      // the server's edge detection turns it into exactly one cast.
      const set = (down: boolean) => {
        if (i === 0) input.touchAbility1 = down;
        else input.touchAbility2 = down;
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
    for (const slot of [0, 1] as const) {
      const ab = game.slotAbilityDef(slot);
      const el = this.slots[slot]!;
      const icon = this.icons[slot]!;

      if (!ab) {
        if (this.names[slot] !== '') {
          this.names[slot] = '';
          el.classList.add('empty');
          el.title = slot === 0 ? 'Equip a weapon to gain its Art' : 'Wear a relic to gain its power';
          icon.textContent = '';
          icon.style.background = 'transparent';
        }
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

      const frac = game.abilityCdFraction(slot, now);
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
  }
}

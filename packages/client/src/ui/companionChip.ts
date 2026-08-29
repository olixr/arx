/**
 * THE COMPANY CHIP (docs/companions-plan.md) — the afield companion's
 * one quiet mark on the HUD. It seats itself in the northwest column
 * (THE NORTHWEST COLUMN law: every top-left chip JOINS #hud-northwest
 * via hudNorthwest(), CSS `order` decides the stack — never a bare
 * pinned corner), below the danger gauge and the beast plaque.
 *
 * Deliberately smaller than the beast plaque beside it: no vigor bar
 * (company cannot be hurt), no level gem (company has no ladder), no
 * ring clocks (company keeps no clocks). A portrait, a name, and a
 * state word only when it has news — trailing is the whole roster of
 * news a companion can have. Idle motion: none (THE QUIET CREST law).
 * Click = the pat, exactly like the friend's own body.
 */

import type { ClientGame } from '../game/clientGame.js';
import { petPlaquePortraitUrl } from '../render/petPortrait.js';
import { hudNorthwest } from './dangerGauge.js';

export class CompanionChip {
  private readonly root: HTMLButtonElement;
  private readonly face: HTMLImageElement;
  private readonly name: HTMLElement;
  private readonly state: HTMLElement;
  private key = '';

  /** The pat — wired in main.ts to the friend's own interact. */
  onPat: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('button');
    this.root.id = 'companion-chip';
    this.root.hidden = true;
    this.root.addEventListener('click', () => this.onPat?.());
    const medal = document.createElement('span');
    medal.className = 'cchip-medal';
    this.face = document.createElement('img');
    this.face.className = 'cchip-face';
    this.face.alt = '';
    this.face.draggable = false;
    medal.appendChild(this.face);
    const card = document.createElement('span');
    card.className = 'cchip-card';
    this.name = document.createElement('span');
    this.name.className = 'cchip-name';
    this.state = document.createElement('span');
    this.state.className = 'cchip-state';
    card.append(this.name, this.state);
    this.root.append(medal, card);
    hudNorthwest().appendChild(this.root);
  }

  update(game: ClientGame): void {
    const active =
      game.ownCompanions.find((c) => c.state === 'heel') ??
      game.ownCompanions.find((c) => c.state === 'trailing') ??
      null;
    const key = active ? `${active.slot}:${active.name}:${active.state}:${active.lookSeed ?? ''}` : '';
    if (key === this.key) return;
    this.key = key;
    if (!active) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    this.face.src = petPlaquePortraitUrl(active.species, 96, active.lookSeed);
    this.name.textContent = active.name;
    const trailing = active.state === 'trailing';
    this.state.textContent = trailing ? 'Catching up' : '';
    this.state.hidden = !trailing;
    this.root.classList.toggle('state-trailing', trailing);
    this.root.title = trailing
      ? `${active.name} is somewhere behind you, taking its own route.`
      : `${active.name}, keeping you company. Click to give it a pat.`;
    this.root.setAttribute('aria-label', `${active.name}, your companion`);
  }
}

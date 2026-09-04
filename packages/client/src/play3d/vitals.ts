/**
 * THE VITALS (play3d S2) — the own body's health and level as a DOM
 * strip above the hotbar. The 2D client paints its vitals on the
 * canvas; the 3D door has no canvas2d HUD layer, so the same two
 * facts (hp fraction, combat level from the skill ledger) stand as
 * chrome, styled from the one token set. Written only on change.
 */
import { levelForXp } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';

export class Vitals {
  private readonly el = document.createElement('div');
  private readonly fill = document.createElement('div');
  private readonly text = document.createElement('span');
  private readonly level = document.createElement('span');
  private lastPct = -1;
  private lastLevel = -1;

  constructor(parent: HTMLElement) {
    this.el.id = 'vitals3d';
    const bar = document.createElement('div');
    bar.className = 'vitals-bar';
    this.fill.className = 'vitals-fill';
    bar.append(this.fill, this.text);
    this.level.className = 'vitals-level';
    this.el.append(this.level, bar);
    parent.appendChild(this.el);
  }

  update(game: ClientGame): void {
    if (game.ownEid === null) {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    const pct = Math.round((game.ownHpPct / 255) * 100);
    if (pct !== this.lastPct) {
      this.lastPct = pct;
      this.fill.style.width = `${pct}%`;
      this.text.textContent = `${pct}%`;
      this.el.classList.toggle('low', pct < 30);
    }
    const lvl = levelForXp(game.skills.combat ?? 0);
    if (lvl !== this.lastLevel) {
      this.lastLevel = lvl;
      this.level.textContent = `Lv ${lvl}`;
    }
  }

  dispose(): void {
    this.el.remove();
  }
}

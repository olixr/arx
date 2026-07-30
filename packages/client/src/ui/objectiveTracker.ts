import type { QuestObjectiveWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { itemIconUrl, uiIconUrl } from '../render/icons.js';

/**
 * THE ERRAND CARD — the tracked quest's live face on the HUD.
 *
 * Smoked-glass tier (the live HUD only whispers): a small top-right
 * card with the quest's name and each ask as "label n/m", counts in
 * tabular figures so a ticking number never jitters the line. Ready
 * flips the name gold and says where to go. Pure presentation of the
 * pushed ledger — it holds no truth of its own.
 */
export class ObjectiveTracker {
  private readonly el: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly rows: HTMLElement;
  private renderedVersion = -1;
  private renderedId: string | null = null;

  constructor(private readonly game: ClientGame, private readonly tracked: () => string | null) {
    this.el = document.createElement('div');
    this.el.id = 'objective-tracker';
    this.el.classList.add('hidden');
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'obj-quest-name';
    this.rows = document.createElement('div');
    this.rows.className = 'obj-rows';
    this.el.append(this.nameEl, this.rows);
    document.getElementById('hud')!.appendChild(this.el);
  }

  /** Per-frame from the main loop. hidden=true suppresses (screens, cinema, build). */
  update(hidden: boolean): void {
    const id = this.tracked();
    const q = id ? this.game.quests.get(id) : undefined;
    if (!q || hidden || this.game.ownEid === null) {
      this.el.classList.add('hidden');
      return;
    }
    this.el.classList.remove('hidden');
    if (this.renderedVersion === this.game.questVersion && this.renderedId === q.id) return;
    this.renderedVersion = this.game.questVersion;
    this.renderedId = q.id;

    this.nameEl.textContent = q.status === 'ready' ? `${q.name} — see ${q.turnInName}` : q.name;
    this.el.classList.toggle('obj-ready', q.status === 'ready');
    this.rows.innerHTML = '';
    for (const o of q.objectives) {
      const row = document.createElement('div');
      row.className = `obj-row${o.have >= o.need ? ' met' : ''}`;
      const img = document.createElement('img');
      img.src = iconFor(o);
      img.draggable = false;
      const label = document.createElement('span');
      label.className = 'obj-label';
      label.textContent = o.label;
      const count = document.createElement('span');
      count.className = 'obj-count';
      count.textContent = `${o.have}/${o.need}`;
      row.append(img, label, count);
      this.rows.appendChild(row);
    }
  }
}

function iconFor(o: QuestObjectiveWire): string {
  switch (o.kind) {
    case 'collect':
      return itemIconUrl(o.item ?? '', 32);
    case 'kill':
      return uiIconUrl('attack', 32);
    case 'discover':
      return uiIconUrl('signpost', 32);
    case 'talk':
      return uiIconUrl('bell', 32);
  }
}

import type { QuestHintWire, QuestObjectiveWire, QuestWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { dockGlyphUrl, itemIconUrl, uiIconUrl } from '../render/icons.js';

/**
 * THE ERRAND CARD — the followed quest's live face on the HUD.
 *
 * Smoked-glass tier (the live HUD only whispers), but a card that
 * answers the three questions a walker actually has: WHAT is left
 * (asks with meters, met asks checked off), WHERE it is (a live
 * compass needle and paces toward the current ask's neighborhood),
 * and WHO settles it (the return line turns gold and names them the
 * moment the work is done). The card is a door, not a poster: press
 * it to open the journal at this errand, press the chart glyph to
 * ring the ask's whereabouts on the map.
 *
 * Structure repaints only when the ledger moves (questVersion); the
 * compass line alone breathes per frame, on cached writes.
 */
export class ObjectiveTracker {
  private readonly el: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly partEl: HTMLElement;
  private readonly chartBtn: HTMLButtonElement;
  private readonly rows: HTMLElement;
  private readonly foot: HTMLElement;
  private readonly needle: HTMLElement;
  private readonly bearEl: HTMLElement;
  private renderedVersion = -1;
  private renderedId: string | null = null;
  /** The compass line's cached words — write DOM only on change. */
  private lastBearWord = '';
  private lastNeedleShown = true;

  constructor(
    private readonly game: ClientGame,
    private readonly tracked: () => string | null,
    private readonly hooks: {
      /** Open the journal at this errand's page. */
      onOpen(questId: string): void;
      /** Ring an ask's neighborhood on the chart. */
      onShowArea(ring: { x: number; y: number; r: number; label: string; quest: string }): void;
    },
  ) {
    this.el = document.createElement('div');
    this.el.id = 'objective-tracker';
    this.el.classList.add('hidden');
    this.el.title = 'Open the journal';

    const head = document.createElement('div');
    head.className = 'obj-head';
    const names = document.createElement('div');
    names.className = 'obj-names';
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'obj-quest-name';
    this.partEl = document.createElement('div');
    this.partEl.className = 'obj-part';
    names.append(this.nameEl, this.partEl);
    this.chartBtn = document.createElement('button');
    this.chartBtn.className = 'obj-chart';
    this.chartBtn.title = 'Show on the chart';
    const chartImg = document.createElement('img');
    chartImg.src = dockGlyphUrl('map', 22);
    chartImg.draggable = false;
    this.chartBtn.appendChild(chartImg);
    head.append(names, this.chartBtn);

    this.rows = document.createElement('div');
    this.rows.className = 'obj-rows';

    this.foot = document.createElement('div');
    this.foot.className = 'obj-foot';
    this.needle = document.createElement('span');
    this.needle.className = 'obj-needle';
    this.bearEl = document.createElement('span');
    this.bearEl.className = 'obj-bearing';
    this.foot.append(this.needle, this.bearEl);

    this.el.append(head, this.rows, this.foot);
    document.getElementById('hud')!.appendChild(this.el);

    // The card is a door into the journal; the chart glyph is its own.
    this.el.addEventListener('click', () => {
      const id = this.renderedId;
      if (id) this.hooks.onOpen(id);
    });
    this.chartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const q = this.renderedId ? this.game.quests.get(this.renderedId) : undefined;
      if (!q) return;
      const t = currentTarget(q);
      if (t) this.hooks.onShowArea({ x: t.hint.x, y: t.hint.y, r: t.hint.r, label: t.label, quest: q.id });
    });
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
    if (this.renderedVersion !== this.game.questVersion || this.renderedId !== q.id) {
      this.renderedVersion = this.game.questVersion;
      this.renderedId = q.id;
      this.renderStructure(q);
    }
    this.updateCompass(q);
  }

  /** The card's bones — only when the ledger moves. */
  private renderStructure(q: QuestWire): void {
    this.nameEl.textContent = q.name;
    this.partEl.textContent = q.stages > 1 ? `Part ${q.stage + 1} of ${q.stages}` : '';
    this.partEl.classList.toggle('hidden', q.stages <= 1);
    this.el.classList.toggle('obj-ready', q.status === 'ready');
    this.chartBtn.classList.toggle('hidden', currentTarget(q) === null);

    this.rows.innerHTML = '';
    for (const o of q.objectives) {
      const met = o.have >= o.need;
      const row = document.createElement('div');
      row.className = `obj-row${met ? ' met' : ''}`;
      const line = document.createElement('div');
      line.className = 'obj-line';
      const img = document.createElement('img');
      img.src = iconFor(o);
      img.draggable = false;
      const label = document.createElement('span');
      label.className = 'obj-label';
      label.textContent = o.label;
      const count = document.createElement('span');
      count.className = 'obj-count';
      count.textContent = met ? '✓' : `${o.have}/${o.need}`;
      line.append(img, label, count);
      row.appendChild(line);
      if (o.need > 1 && !met) {
        const track = document.createElement('div');
        track.className = 'obj-meter';
        const fill = document.createElement('div');
        fill.className = 'obj-meter-fill';
        fill.style.width = `${Math.round((o.have / o.need) * 100)}%`;
        track.appendChild(fill);
        row.appendChild(track);
      }
      this.rows.appendChild(row);
    }
  }

  /**
   * The breathing line: needle and paces toward the current ask, or
   * the gold return word once every ask is answered. Cached writes —
   * the needle turns every frame, the words only when they change.
   */
  private updateCompass(q: QuestWire): void {
    const t = currentTarget(q);
    if (!t) {
      this.lastBearWord = '';
      this.foot.classList.add('hidden');
      return;
    }
    this.foot.classList.remove('hidden');
    const pos = this.game.predictor.pos;
    const lead = q.status === 'ready' ? `Return to ${q.turnInName}` : t.label;
    // THE WORLDS APART: a needle never points across planes — a hint
    // in another world gets its name and the honest word "elsewhere".
    if ((t.hint.plane ?? 'surface') !== this.game.plane.id) {
      const word = `${lead} · another realm`;
      if (word !== this.lastBearWord) {
        this.lastBearWord = word;
        this.bearEl.textContent = word;
      }
      if (this.lastNeedleShown) {
        this.lastNeedleShown = false;
        this.needle.classList.add('hidden');
      }
      return;
    }
    const dx = t.hint.x - pos.x;
    const dy = t.hint.y - pos.y;
    const dist = Math.hypot(dx, dy);
    const near = dist <= t.hint.r;
    const word = near ? `${lead} · hereabouts` : `${lead} · ${Math.round(dist)} paces ${wind(dx, dy)}`;
    if (word !== this.lastBearWord) {
      this.lastBearWord = word;
      this.bearEl.textContent = word;
    }
    if (near !== !this.lastNeedleShown) {
      this.lastNeedleShown = !near;
      this.needle.classList.toggle('hidden', near);
    }
    if (!near) this.needle.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }
}

/**
 * What the card points at right now: the turn-in door once the work
 * is done, else the first unanswered ask the world could place.
 */
function currentTarget(q: QuestWire): { hint: QuestHintWire; label: string } | null {
  if (q.status === 'ready') {
    return q.turnInHint ? { hint: q.turnInHint, label: q.turnInName } : null;
  }
  for (const o of q.objectives) {
    if (o.have < o.need && o.hint) return { hint: o.hint, label: o.label };
  }
  return null;
}

/** The eight winds, y-down world: which way the walker should lean. */
function wind(dx: number, dy: number): string {
  const WINDS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return WINDS[oct]!;
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

import { itemIconUrl, uiIconUrl } from '../render/icons.js';

/**
 * THE WORK CARD — the craft batch's voice on the live HUD.
 *
 * Starting a craft closes the Workshop and hands the moment to the
 * world: you watch your character work the station while this card
 * rides above the hotbar carrying the recipe's face, a fill bar timed
 * to the exact item duration, and the batch tally the server now
 * shares ("4 of 28"). Two bars, two truths: the bright bar is THIS
 * item (the hammer's rhythm), the thin bar under it is the whole
 * batch (the journey). Both animate by CSS transition — one style
 * write per item, never a per-frame write (HUD write-on-edge law).
 *
 * Ends wear a face: done flips to "Work done" with the tally and a
 * gold breath; setting the tools down says "Work set down"; running
 * dry says "Out of materials" in ember. A card with nothing to say
 * (stopped at zero made) simply leaves.
 *
 * The card ducks while any screen owns the stage — the reopened
 * Workshop's own busy strip speaks for the work there.
 */
export interface WorkBeat {
  /** Recipe display name — "Bronze bar". */
  name: string;
  /** Output item id for the plaque icon; null falls back to the hammer glyph. */
  icon: string | null;
  /** The station face's label — "Smelting". */
  label: string;
  /** The station face's accent color. */
  accent: string;
  /** Items finished before this one began. */
  made: number;
  /** Batch size asked for. */
  total: number;
  /** Items each run of the recipe yields. */
  outQty: number;
  /** This item's duration. */
  durationMs: number;
}

const HOLD_DONE_MS = 2100;
const HOLD_SET_DOWN_MS = 1400;
const HOLD_HALT_MS = 1900;
const LEAVE_MS = 320;

export class CraftHud {
  private root: HTMLElement;
  private plaque: HTMLElement;
  private img: HTMLImageElement;
  private kicker: HTMLElement;
  private nameEl: HTMLElement;
  private countEl: HTMLElement;
  private fill: HTMLElement;
  private batchBar: HTMLElement;
  private batchFill: HTMLElement;
  private hint: HTMLElement;

  private visible = false;
  private holdTimer = 0;
  private leaveTimer = 0;
  /** The last beat's face — the end ceremony reads its tally from this. */
  private cur: WorkBeat | null = null;
  /** Write-on-edge caches: only touch the DOM when the value moves. */
  private wroteIcon = '';
  private wroteKicker = '';
  private wroteName = '';
  private wroteCount = '';

  constructor(onStop: () => void) {
    this.root = document.createElement('div');
    this.root.id = 'work-card';
    this.root.classList.add('hidden');

    this.plaque = document.createElement('div');
    this.plaque.className = 'wc-plaque';
    this.img = document.createElement('img');
    this.img.draggable = false;
    this.img.alt = '';
    this.plaque.appendChild(this.img);
    this.root.appendChild(this.plaque);

    const body = document.createElement('div');
    body.className = 'wc-body';
    const top = document.createElement('div');
    top.className = 'wc-top';
    this.kicker = document.createElement('span');
    this.kicker.className = 'wc-kicker';
    this.countEl = document.createElement('span');
    this.countEl.className = 'wc-count';
    top.appendChild(this.kicker);
    top.appendChild(this.countEl);
    body.appendChild(top);

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'wc-name';
    body.appendChild(this.nameEl);

    const bar = document.createElement('div');
    bar.className = 'wc-bar';
    this.fill = document.createElement('div');
    this.fill.className = 'wc-fill';
    bar.appendChild(this.fill);
    body.appendChild(bar);

    this.batchBar = document.createElement('div');
    this.batchBar.className = 'wc-batch';
    this.batchFill = document.createElement('div');
    this.batchFill.className = 'wc-batch-fill';
    this.batchBar.appendChild(this.batchFill);
    body.appendChild(this.batchBar);

    this.hint = document.createElement('div');
    this.hint.className = 'wc-hint';
    this.hint.textContent = 'Step away to stop';
    body.appendChild(this.hint);
    this.root.appendChild(body);

    const stop = document.createElement('button');
    stop.className = 'wc-stop';
    stop.type = 'button';
    stop.title = 'Stop';
    stop.setAttribute('aria-label', 'Stop crafting');
    stop.textContent = '✕';
    stop.addEventListener('click', onStop);
    this.root.appendChild(stop);

    document.body.appendChild(this.root);
  }

  /** An item began — raise the card if needed and wind the bars. */
  beat(b: WorkBeat): void {
    this.clearTimers();
    this.cur = b;
    this.root.classList.remove('wc-done', 'wc-halt', 'wc-leave');
    this.root.style.setProperty('--wc-accent', b.accent);

    const iconUrl = b.icon ? itemIconUrl(b.icon, 40) : uiIconUrl('hammer', 40);
    if (iconUrl !== this.wroteIcon) {
      this.img.src = iconUrl;
      this.wroteIcon = iconUrl;
    }
    this.write(this.kicker, 'wroteKicker', b.label);
    this.write(this.nameEl, 'wroteName', b.name);
    this.write(this.countEl, 'wroteCount', b.total > 1 ? `${b.made + 1} of ${b.total}` : '');
    this.batchBar.classList.toggle('hidden', b.total <= 1);
    this.hint.classList.remove('hidden');

    if (!this.visible) {
      this.visible = true;
      this.root.classList.remove('hidden');
      this.root.classList.remove('wc-enter');
      void this.root.offsetWidth;
      this.root.classList.add('wc-enter');
    }

    // The item bar: snap to empty, then let one linear transition
    // carry it the whole duration — the write happens here, once.
    this.fill.style.transition = 'none';
    this.fill.style.width = '0%';
    void this.fill.offsetWidth;
    this.fill.style.transition = `width ${b.durationMs}ms linear`;
    this.fill.style.width = '100%';

    // The batch bar advances in step with the item above it.
    if (b.total > 1) {
      this.batchFill.style.transition = 'none';
      this.batchFill.style.width = `${(b.made / b.total) * 100}%`;
      void this.batchFill.offsetWidth;
      this.batchFill.style.transition = `width ${b.durationMs}ms linear`;
      this.batchFill.style.width = `${((b.made + 1) / b.total) * 100}%`;
    }

    // A finished item just landed under this beat — pulse the plaque.
    if (b.made > 0) {
      this.plaque.classList.remove('wc-tick');
      void this.plaque.offsetWidth;
      this.plaque.classList.add('wc-tick');
    }
  }

  /** The batch ended — wear the right face, then leave the stage. */
  end(reason: string | undefined, made: number | undefined): void {
    if (!this.visible || !this.cur) return;
    this.clearTimers();
    const runs = made ?? 0;
    const items = runs * this.cur.outQty;

    // Nothing finished and the player chose the stop: no face, just go.
    if (runs === 0 && (reason === 'stopped' || reason === 'moved' || reason === undefined)) {
      this.leave();
      return;
    }

    this.fill.style.transition = 'none';
    this.fill.style.width = reason === 'done' ? '100%' : this.fill.style.width;
    this.hint.classList.add('hidden');
    this.write(this.countEl, 'wroteCount', '');
    if (runs > 0) {
      this.write(this.nameEl, 'wroteName', items > 1 ? `${this.cur.name} × ${items}` : this.cur.name);
    }

    let holdMs = HOLD_SET_DOWN_MS;
    if (reason === 'done') {
      this.write(this.kicker, 'wroteKicker', 'Work done');
      this.root.classList.add('wc-done');
      this.batchFill.style.transition = 'none';
      this.batchFill.style.width = '100%';
      holdMs = HOLD_DONE_MS;
    } else if (reason === 'materials') {
      this.write(this.kicker, 'wroteKicker', 'Out of materials');
      this.root.classList.add('wc-halt');
      holdMs = HOLD_HALT_MS;
    } else if (reason === 'station') {
      this.write(this.kicker, 'wroteKicker', 'Too far from the work');
      this.root.classList.add('wc-halt');
      holdMs = HOLD_HALT_MS;
    } else {
      this.write(this.kicker, 'wroteKicker', 'Work set down');
    }
    this.holdTimer = window.setTimeout(() => this.leave(), holdMs);
  }

  /** Screens own the stage — the card steps aside while one is open. */
  duck(hidden: boolean): void {
    this.root.classList.toggle('wc-duck', hidden);
  }

  private leave(): void {
    if (!this.visible) return;
    this.root.classList.add('wc-leave');
    this.leaveTimer = window.setTimeout(() => {
      this.visible = false;
      this.cur = null;
      this.root.classList.add('hidden');
      this.root.classList.remove('wc-leave', 'wc-done', 'wc-halt', 'wc-enter');
    }, LEAVE_MS);
  }

  private clearTimers(): void {
    if (this.holdTimer) window.clearTimeout(this.holdTimer);
    if (this.leaveTimer) window.clearTimeout(this.leaveTimer);
    this.holdTimer = 0;
    this.leaveTimer = 0;
  }

  private write(
    el: HTMLElement,
    cache: 'wroteKicker' | 'wroteName' | 'wroteCount',
    text: string,
  ): void {
    if (this[cache] === text) return;
    el.textContent = text;
    this[cache] = text;
  }
}

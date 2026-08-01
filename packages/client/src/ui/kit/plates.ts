/**
 * PLATES, SOCKETS, THE INSPECTOR — the kit's physical pieces
 * (The Grand Refit, Phase 2).
 *
 * - A PLATE is the big graphical unit collections are made of: a cut
 *   piece of stock carrying a portrait, a name, and small seals. It
 *   is what a "row of text" becomes when a room is gamified.
 * - A SOCKET is a painted recessed well something can seat into —
 *   the loadout altar's language. It shows its button chip, its
 *   occupant, and flashes when something lands.
 * - The INSPECTOR is the fixed-anatomy detail card: it renders on
 *   focus, in place, so inspection never costs travel.
 * - An EMPTY STATE is one warm quartermaster line with an emblem —
 *   a blank well is a defect.
 */

import type { ActionId } from '../../input/bindings.js';
import { seatChip } from './glyphs.js';

/** A cut plate: portrait + name + sub, pad-navigable. */
export function plate(opts: {
  icon?: string;
  name: string;
  sub?: string;
  navkey: string;
  acta?: string;
  onPick?: () => void;
}): HTMLElement {
  const el = document.createElement('button');
  el.className = 'kit-plate';
  el.dataset.nav = '';
  el.dataset.navkey = opts.navkey;
  el.dataset.acta = opts.acta ?? 'Select';
  if (opts.icon) {
    const well = document.createElement('span');
    well.className = 'plate-well';
    const img = document.createElement('img');
    img.src = opts.icon;
    img.draggable = false;
    well.appendChild(img);
    el.appendChild(well);
  }
  const text = document.createElement('span');
  text.className = 'plate-text';
  const name = document.createElement('span');
  name.className = 'plate-name';
  name.textContent = opts.name;
  text.appendChild(name);
  if (opts.sub) {
    const sub = document.createElement('span');
    sub.className = 'plate-sub';
    sub.textContent = opts.sub;
    text.appendChild(sub);
  }
  el.appendChild(text);
  if (opts.onPick) el.addEventListener('click', opts.onPick);
  return el;
}

export interface Socket {
  root: HTMLElement;
  /** Seat an occupant (icon url) or empty it (null). */
  fill(icon: string | null, name?: string): void;
  /** The landing flash — call when something seats. */
  flash(): void;
}

/** A painted seat: recessed well + its button chip pinned below. */
export function socket(opts: { action?: ActionId; label?: string; size?: string } = {}): Socket {
  const root = document.createElement('div');
  root.className = 'kit-socket';
  if (opts.size) root.style.setProperty('--socket-size', opts.size);

  const well = document.createElement('div');
  well.className = 'socket-well';
  const img = document.createElement('img');
  img.draggable = false;
  img.className = 'hidden';
  well.appendChild(img);
  root.appendChild(well);

  if (opts.action) {
    const chip = seatChip(opts.action);
    chip.classList.add('socket-chip');
    root.appendChild(chip);
  }
  if (opts.label) {
    const lab = document.createElement('span');
    lab.className = 'socket-label';
    lab.textContent = opts.label;
    root.appendChild(lab);
  }

  return {
    root,
    fill(icon, name): void {
      if (icon) {
        img.src = icon;
        img.classList.remove('hidden');
        root.classList.add('filled');
      } else {
        img.classList.add('hidden');
        root.classList.remove('filled');
      }
      well.title = name ?? '';
    },
    flash(): void {
      well.classList.remove('landed');
      /* restart the landing animation */
      void well.offsetWidth;
      well.classList.add('landed');
    },
  };
}

/** One warm line + an emblem where a blank would have been. */
export function emptyState(line: string, icon?: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'kit-empty';
  if (icon) {
    const img = document.createElement('img');
    img.src = icon;
    img.draggable = false;
    el.appendChild(img);
  }
  const text = document.createElement('span');
  text.textContent = line;
  el.appendChild(text);
  return el;
}

export interface InspectorData {
  icon?: string;
  name: string;
  kicker?: string;
  /** Small seal nodes set beside the name (rank seals, tier marks). */
  seals?: HTMLElement[];
  /** Stat runes: label + value pairs told as plaques. */
  stats?: Array<{ label: string; value: string; tone?: string }>;
  /** One line of meaning. */
  story?: string;
  /** Verb buttons the caller wires (bigButton output). */
  actions?: HTMLElement[];
}

export interface Inspector {
  root: HTMLElement;
  set(data: InspectorData | null): void;
}

/** The fixed-anatomy detail card. Renders on focus, never travels. */
export function inspector(): Inspector {
  const root = document.createElement('div');
  root.className = 'kit-inspector';

  return {
    root,
    set(data): void {
      root.innerHTML = '';
      if (!data) {
        root.classList.add('hidden');
        return;
      }
      root.classList.remove('hidden');

      const head = document.createElement('div');
      head.className = 'insp-head';
      if (data.icon) {
        const well = document.createElement('span');
        well.className = 'insp-well';
        const img = document.createElement('img');
        img.src = data.icon;
        img.draggable = false;
        well.appendChild(img);
        head.appendChild(well);
      }
      const title = document.createElement('div');
      title.className = 'insp-title';
      if (data.kicker) {
        const kicker = document.createElement('div');
        kicker.className = 'insp-kicker';
        kicker.textContent = data.kicker;
        title.appendChild(kicker);
      }
      const name = document.createElement('div');
      name.className = 'insp-name';
      name.textContent = data.name;
      title.appendChild(name);
      if (data.seals?.length) {
        const seals = document.createElement('div');
        seals.className = 'insp-seals';
        seals.append(...data.seals);
        title.appendChild(seals);
      }
      head.appendChild(title);
      root.appendChild(head);

      if (data.stats?.length) {
        const grid = document.createElement('div');
        grid.className = 'insp-stats';
        for (const s of data.stats) {
          const plaque = document.createElement('div');
          plaque.className = 'stat-plaque';
          const v = document.createElement('div');
          v.className = 'stat-plaque-value';
          v.textContent = s.value;
          if (s.tone) v.style.color = s.tone;
          const l = document.createElement('div');
          l.className = 'stat-plaque-label';
          l.textContent = s.label;
          plaque.append(v, l);
          grid.appendChild(plaque);
        }
        root.appendChild(grid);
      }

      if (data.story) {
        const story = document.createElement('div');
        story.className = 'insp-story';
        story.textContent = data.story;
        root.appendChild(story);
      }

      if (data.actions?.length) {
        const acts = document.createElement('div');
        acts.className = 'insp-acts';
        acts.append(...data.actions);
        root.appendChild(acts);
      }
    },
  };
}

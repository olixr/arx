/**
 * The Content Studio control library — rich, informative controls in
 * place of bare text inputs: searchable icon comboboxes, sliders that
 * show where a value sits in the whole registry, element-colored
 * status chips, and comparison bars. Every widget reports through a
 * plain onChange so editors stay simple.
 */

export const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ----------------------------------------------------------- combobox

export interface ComboOption {
  id: string;
  label: string;
  sub?: string;
  icon?: string; // data URL
}

/**
 * A searchable picker with icons — the answer to 1000-option selects.
 * Click opens a filtered popover; type to narrow; Enter takes the top
 * hit; Esc closes. The trigger shows the current pick with its icon.
 */
export function combobox(
  options: () => ComboOption[],
  value: string | undefined,
  onPick: (id: string) => void,
  placeholder = 'choose…',
): HTMLElement {
  const wrap = el('div', 'combo');
  const trigger = el('button', 'combo-trigger') as HTMLButtonElement;
  trigger.type = 'button';

  const renderTrigger = (): void => {
    trigger.innerHTML = '';
    const current = value ? options().find((o) => o.id === value) : undefined;
    if (current?.icon) {
      const img = document.createElement('img');
      img.src = current.icon;
      img.width = 20;
      img.height = 20;
      trigger.appendChild(img);
    }
    trigger.appendChild(
      el('span', 'combo-label' + (current ? '' : ' placeholder'), current?.label ?? placeholder),
    );
    trigger.appendChild(el('span', 'combo-caret', '▾'));
  };
  renderTrigger();

  let pop: HTMLElement | null = null;
  const close = (): void => {
    pop?.remove();
    pop = null;
    document.removeEventListener('mousedown', onOutside, true);
  };
  const onOutside = (e: MouseEvent): void => {
    if (pop && !pop.contains(e.target as Node) && !trigger.contains(e.target as Node)) close();
  };

  const open = (): void => {
    if (pop) {
      close();
      return;
    }
    pop = el('div', 'combo-pop');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'type to filter…';
    pop.appendChild(search);
    const list = el('div', 'combo-list');
    pop.appendChild(list);

    const rebuild = (): void => {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      const hits = options()
        .filter((o) => !q || o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
        .slice(0, 60);
      if (hits.length === 0) list.appendChild(el('p', 'muted empty', 'no matches'));
      for (const o of hits) {
        const row = el('button', 'combo-row' + (o.id === value ? ' active' : ''));
        (row as HTMLButtonElement).type = 'button';
        if (o.icon) {
          const img = document.createElement('img');
          img.src = o.icon;
          img.width = 22;
          img.height = 22;
          row.appendChild(img);
        }
        const txt = el('span', 'combo-txt');
        txt.appendChild(el('b', '', o.label));
        if (o.sub) txt.appendChild(el('span', '', o.sub));
        row.appendChild(txt);
        row.addEventListener('click', () => {
          value = o.id;
          onPick(o.id);
          renderTrigger();
          close();
        });
        list.appendChild(row);
      }
    };
    search.addEventListener('input', rebuild);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        (list.querySelector('.combo-row') as HTMLButtonElement | null)?.click();
      } else if (e.key === 'Escape') {
        close();
      }
      e.stopPropagation();
    });
    rebuild();
    wrap.appendChild(pop);
    search.focus();
    document.addEventListener('mousedown', onOutside, true);
  };

  trigger.addEventListener('click', open);
  wrap.appendChild(trigger);
  return wrap;
}

// -------------------------------------------------------- stat slider

export interface StatDistribution {
  min: number;
  max: number;
  median: number;
}

/**
 * A slider + number pairing that also SHOWS the value: the fill bar
 * is the position inside the registry's real range, the tick is the
 * registry median — "is 36 hp a lot?" answers itself.
 */
export function statSlider(opts: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  note?: string;
  dist?: StatDistribution;
  onInput: (v: number) => void;
}): HTMLElement {
  const step = opts.step ?? 1;
  const wrap = el('div', 'stat-field');
  const head = el('div', 'stat-head');
  head.appendChild(el('span', 'stat-label', opts.label));
  const num = document.createElement('input');
  num.type = 'number';
  num.step = String(step);
  num.value = String(opts.value);
  num.className = 'stat-num';
  head.appendChild(num);
  if (opts.unit) head.appendChild(el('span', 'stat-unit', opts.unit));
  wrap.appendChild(head);

  const track = el('div', 'stat-track');
  const fill = el('div', 'stat-fill');
  track.appendChild(fill);
  let medianTick: HTMLElement | null = null;
  if (opts.dist) {
    medianTick = el('div', 'stat-median');
    medianTick.title = `registry median ${opts.dist.median}`;
    track.appendChild(medianTick);
  }
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(step);
  range.value = String(opts.value);
  range.className = 'stat-range';
  track.appendChild(range);
  wrap.appendChild(track);
  if (opts.note) wrap.appendChild(el('span', 'note', opts.note));

  const paint = (v: number): void => {
    const pct = Math.max(0, Math.min(1, (v - opts.min) / (opts.max - opts.min)));
    fill.style.width = `${pct * 100}%`;
    if (medianTick && opts.dist) {
      const mp = Math.max(0, Math.min(1, (opts.dist.median - opts.min) / (opts.max - opts.min)));
      medianTick.style.left = `${mp * 100}%`;
    }
  };
  paint(opts.value);

  const commit = (v: number): void => {
    const clamped = Math.max(opts.min, Math.min(opts.max, v));
    num.value = String(clamped);
    range.value = String(clamped);
    paint(clamped);
    opts.onInput(clamped);
  };
  range.addEventListener('input', () => commit(Number(range.value)));
  num.addEventListener('input', () => {
    const v = Number(num.value);
    if (Number.isFinite(v)) {
      range.value = String(Math.max(opts.min, Math.min(opts.max, v)));
      paint(v);
      opts.onInput(v);
    }
  });
  num.addEventListener('change', () => commit(Number(num.value) || opts.min));
  return wrap;
}

/**
 * The marquee slider — a tall, generous track with a live fill, a big
 * formatted readout, and an optional fine-tune number box. Built for
 * the values a designer drags by feel (drop chances, pool weights)
 * rather than types by hand.
 */
export function bigSlider(opts: {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Large readout, e.g. (v) => `${v}%` or (v) => `×${v}`. */
  format: (v: number) => string;
  hint?: string;
  /** Show a fine-tune number input beside the readout. */
  fine?: boolean;
  onInput: (v: number) => void;
  /** Called on release — rebuild-heavy work goes here, not onInput. */
  onCommit?: () => void;
}): HTMLElement {
  const step = opts.step ?? 1;
  const wrap = el('div', 'big-slider');
  const track = el('div', 'big-track');
  const fill = el('div', 'big-fill');
  track.appendChild(fill);
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(step);
  range.value = String(opts.value);
  range.className = 'big-range';
  if (opts.hint) range.title = opts.hint;
  track.appendChild(range);
  wrap.appendChild(track);

  const readout = el('span', 'big-readout', opts.format(opts.value));
  wrap.appendChild(readout);

  let fine: HTMLInputElement | null = null;
  if (opts.fine) {
    fine = document.createElement('input');
    fine.type = 'number';
    fine.step = String(step);
    fine.min = String(opts.min);
    fine.max = String(opts.max);
    fine.value = String(opts.value);
    fine.className = 'big-fine';
    wrap.appendChild(fine);
  }

  const paint = (v: number): void => {
    const pct = Math.max(0, Math.min(1, (v - opts.min) / (opts.max - opts.min)));
    fill.style.width = `${pct * 100}%`;
    readout.textContent = opts.format(v);
  };
  paint(opts.value);

  range.addEventListener('input', () => {
    const v = Number(range.value);
    if (fine) fine.value = range.value;
    paint(v);
    opts.onInput(v);
  });
  range.addEventListener('change', () => opts.onCommit?.());
  fine?.addEventListener('input', () => {
    const v = Math.max(opts.min, Math.min(opts.max, Number(fine!.value) || opts.min));
    range.value = String(v);
    paint(v);
    opts.onInput(v);
  });
  fine?.addEventListener('change', () => opts.onCommit?.());
  return wrap;
}

/** A labeled stepper pair for ranged quantities (min–max). */
export function rangePair(
  lo: number,
  hi: number,
  min: number,
  max: number,
  onInput: (lo: number, hi: number) => void,
): HTMLElement {
  const wrap = el('div', 'range-pair');
  const loIn = document.createElement('input');
  loIn.type = 'number';
  loIn.min = String(min);
  loIn.max = String(max);
  loIn.value = String(lo);
  const dash = el('span', 'range-dash', '–');
  const hiIn = document.createElement('input');
  hiIn.type = 'number';
  hiIn.min = String(min);
  hiIn.max = String(max);
  hiIn.value = String(hi);
  const clamp = (): void => {
    let a = Math.max(min, Number(loIn.value) || min);
    let b = Math.max(min, Number(hiIn.value) || min);
    if (b < a) b = a;
    onInput(a, b);
  };
  loIn.addEventListener('input', clamp);
  hiIn.addEventListener('input', clamp);
  wrap.append(loIn, dash, hiIn);
  return wrap;
}

// ----------------------------------------------------- status chips

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  burn: { color: '#e8823d', label: 'burn' },
  chill: { color: '#7fb8e8', label: 'chill' },
  shock: { color: '#e8d44c', label: 'shock' },
  bleed: { color: '#d4544a', label: 'bleed' },
  venom: { color: '#7fc95a', label: 'venom' },
};

/** Element-colored multi-select chips (resistances, weaknesses). */
export function statusChips(
  active: readonly string[],
  onToggle: (id: string, on: boolean) => void,
): HTMLElement {
  const row = el('div', 'chip-row');
  for (const [id, style] of Object.entries(STATUS_STYLE)) {
    const on = active.includes(id);
    const chip = el('button', 'chip' + (on ? ' on' : ''), style.label) as HTMLButtonElement;
    chip.type = 'button';
    chip.style.setProperty('--chip', style.color);
    chip.addEventListener('click', () => {
      const now = !chip.classList.contains('on');
      chip.classList.toggle('on', now);
      onToggle(id, now);
    });
    row.appendChild(chip);
  }
  return row;
}

/** One on/off feature chip with an explanation tooltip. */
export function featureChip(
  label: string,
  on: boolean,
  title: string,
  onToggle: (on: boolean) => void,
): HTMLElement {
  const chip = el('button', 'chip feature' + (on ? ' on' : ''), label) as HTMLButtonElement;
  chip.type = 'button';
  chip.title = title;
  chip.addEventListener('click', () => {
    const now = !chip.classList.contains('on');
    chip.classList.toggle('on', now);
    onToggle(now);
  });
  return chip;
}

// -------------------------------------------------------- info pieces

/** A labeled horizontal bar — comparisons at a glance. */
export function bar(label: string, value: number, max: number, color: string, meta?: string): HTMLElement {
  const row = el('div', 'bar-row');
  row.appendChild(el('span', 'bar-label', label));
  const track = el('div', 'bar-track');
  const fill = el('div', 'bar-fill');
  fill.style.width = `${Math.max(2, Math.min(100, (value / Math.max(1, max)) * 100))}%`;
  fill.style.background = color;
  track.appendChild(fill);
  row.appendChild(track);
  row.appendChild(el('span', 'bar-meta', meta ?? String(value)));
  return row;
}

/** A small stat pill for derived facts (DPS, temperament, reach). */
export function pill(text: string, title = '', tone: 'ink' | 'brass' | 'ok' | 'danger' = 'ink'): HTMLElement {
  const p = el('span', `stat-pill ${tone}`, text);
  if (title) p.title = title;
  return p;
}

/** Distribution over a numeric field of a registry. */
export function distribution(values: number[]): StatDistribution {
  if (values.length === 0) return { min: 0, max: 1, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    median: sorted[Math.floor(sorted.length / 2)]!,
  };
}

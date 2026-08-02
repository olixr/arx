/**
 * STUDIO2 KIT — the one place a studio control is born (ONE KIT, ONE
 * TOKEN FILE law). Small typed factories returning plain DOM, styled
 * by kit.css. No framework, no virtual anything — the studio's
 * existing idiom, matured.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface BtnOpts {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  dense?: boolean;
  title?: string;
  icon?: HTMLElement;
  onClick?: (e: MouseEvent) => void;
}

export function btn(label: string, opts: BtnOpts = {}): HTMLButtonElement {
  const b = el('button');
  const classes: string[] = [];
  if (opts.variant && opts.variant !== 'default') classes.push(opts.variant);
  if (opts.dense) classes.push('mini');
  b.className = classes.join(' ');
  if (opts.icon) b.appendChild(opts.icon);
  if (label) b.append(label);
  if (opts.title) b.title = opts.title;
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
}

export interface SegOption<T extends string> {
  id: T;
  label: string;
  title?: string;
}

export interface SegHandle<T extends string> {
  root: HTMLElement;
  set(active: T): void;
}

export function seg<T extends string>(
  options: ReadonlyArray<SegOption<T>>,
  active: T,
  onPick: (id: T) => void,
): SegHandle<T> {
  const root = el('div', 'k-seg');
  root.setAttribute('role', 'tablist');
  const buttons = new Map<T, HTMLButtonElement>();
  for (const o of options) {
    const b = el('button');
    b.textContent = o.label;
    if (o.title) b.title = o.title;
    b.setAttribute('role', 'tab');
    b.onclick = () => onPick(o.id);
    buttons.set(o.id, b);
    root.appendChild(b);
  }
  const set = (id: T): void => {
    for (const [oid, b] of buttons) {
      b.classList.toggle('active', oid === id);
      b.setAttribute('aria-selected', String(oid === id));
    }
  };
  set(active);
  return { root, set };
}

/** A stateful toggle chip (lenses, view toggles). */
export function chip(
  label: string,
  active: boolean,
  onToggle: (on: boolean) => void,
  title?: string,
): HTMLButtonElement {
  const b = el('button', 'k-chip' + (active ? ' active' : ''), label);
  if (title) b.title = title;
  b.setAttribute('aria-pressed', String(active));
  b.onclick = () => {
    const on = !b.classList.contains('active');
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
    onToggle(on);
  };
  return b;
}

export interface SliderHandle {
  root: HTMLElement;
  set(v: number): void;
}

/** Label · track · live numeric readout. onInput fires while dragging. */
export function sliderRow(
  label: string,
  min: number,
  max: number,
  value: number,
  onInput: (v: number) => void,
): SliderHandle {
  const root = el('label', 'k-slider');
  root.append(label);
  const range = el('input');
  range.type = 'range';
  range.min = String(min);
  range.max = String(max);
  range.value = String(value);
  const out = el('output', undefined, String(value));
  range.oninput = () => {
    out.textContent = range.value;
    onInput(Number(range.value));
  };
  root.append(range, out);
  return {
    root,
    set(v) {
      range.value = String(v);
      out.textContent = String(v);
    },
  };
}

/** Key caps: kbd('⌘S') → ⌘ + S caps; kbd('B') → one cap. */
export function kbd(keys: string): HTMLElement {
  const root = el('span', 'k-kbd');
  // Split a leading modifier run (⌘⇧⌥⌃) from the key itself.
  const parts: string[] = [];
  let rest = keys;
  while (rest.length > 1 && '⌘⇧⌥⌃'.includes(rest[0]!)) {
    parts.push(rest[0]!);
    rest = rest.slice(1);
  }
  if (rest) parts.push(rest);
  for (const p of parts) root.appendChild(el('i', undefined, p));
  return root;
}

// -------------------------------------------------------- hour ring

export interface HourRingHandle {
  root: HTMLElement;
  set(win: { from: number; to: number } | null): void;
}

/**
 * THE HOURS DIAL — a 24h ring with two draggable handles. The lit arc
 * is the active window (from → to clockwise, midnight at the top,
 * wrap supported); null = always. Drag a handle to move it (snaps to
 * half hours); the center reads the window; the small button clears
 * it back to "always".
 */
export function hourRing(
  win: { from: number; to: number } | null,
  onCommit: (win: { from: number; to: number } | null) => void,
): HourRingHandle {
  const SIZE = 108;
  const R = 40;
  const root = el('div', 'k-hourring');
  const canvas = el('canvas');
  canvas.width = SIZE * 2;
  canvas.height = SIZE * 2;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  canvas.setAttribute('role', 'slider');
  canvas.setAttribute('aria-label', 'Active hours window');
  root.appendChild(canvas);
  const clear = btn('always', {
    dense: true,
    title: 'Clear the window — active around the clock',
    onClick: () => {
      current = null;
      paint();
      onCommit(null);
    },
  });
  clear.classList.add('k-hourring-clear');
  root.appendChild(clear);

  let current = win ? { ...win } : null;
  let dragging: 'from' | 'to' | null = null;

  const hourToAngle = (h: number): number => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const angleToHour = (a: number): number => {
    let h = ((a + Math.PI / 2) / (Math.PI * 2)) * 24;
    h = Math.round(h * 2) / 2; // half-hour snap
    return ((h % 24) + 24) % 24;
  };
  const fmt = (h: number): string => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm === 0 ? String(hh) : `${hh}:${String(mm).padStart(2, '0')}`;
  };

  const paint = (): void => {
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const styles = getComputedStyle(document.documentElement);
    const edge = styles.getPropertyValue('--edge').trim() || '#262c3b';
    const accent = styles.getPropertyValue('--accent').trim() || '#5e9bf5';
    const ink1 = styles.getPropertyValue('--ink1').trim() || '#a7aebf';
    const ink2 = styles.getPropertyValue('--ink2').trim() || '#687183';
    // The full day track.
    ctx.strokeStyle = edge;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // Hour ticks at the quarters, midnight told.
    ctx.fillStyle = ink2;
    ctx.font = '600 8.5px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [h, label] of [[0, '0'], [6, '6'], [12, '12'], [18, '18']] as const) {
      const a = hourToAngle(h);
      ctx.fillText(label, cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12));
    }
    if (current) {
      // The lit window, from → to clockwise (wrap rides through 2π).
      const a0 = hourToAngle(current.from);
      let a1 = hourToAngle(current.to);
      if (a1 <= a0) a1 += Math.PI * 2;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.stroke();
      // Handles: from = filled, to = hollow (reads direction).
      for (const [h, filled] of [[current.from, true], [current.to, false]] as const) {
        const a = hourToAngle(h);
        const hx = cx + Math.cos(a) * R;
        const hy = cy + Math.sin(a) * R;
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fillStyle = filled ? accent : '#0b0d13';
        ctx.fill();
        ctx.strokeStyle = filled ? '#0b0d13' : accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // The center reads the window.
    ctx.fillStyle = current ? ink1 : ink2;
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.fillText(current ? `${fmt(current.from)}–${fmt(current.to)}` : 'always', cx, cy - 5);
    ctx.font = '500 8.5px system-ui, sans-serif';
    ctx.fillStyle = ink2;
    ctx.fillText(current ? 'active hours' : 'around the clock', cx, cy + 9);
  };

  const handleAt = (mx: number, my: number): 'from' | 'to' | null => {
    if (!current) return null;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    for (const [h, which] of [[current.from, 'from'], [current.to, 'to']] as const) {
      const a = hourToAngle(h);
      if (Math.hypot(mx - (cx + Math.cos(a) * R), my - (cy + Math.sin(a) * R)) < 10) return which;
    }
    return null;
  };

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = handleAt(mx, my);
    if (hit) {
      dragging = hit;
    } else {
      // Click the bare track: start a fresh 12h window at the click.
      const h = angleToHour(Math.atan2(my - SIZE / 2, mx - SIZE / 2));
      current = current ?? { from: h, to: (h + 12) % 24 };
      dragging = 'from';
      current.from = h;
      paint();
    }
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging || !current) return;
    const rect = canvas.getBoundingClientRect();
    const h = angleToHour(
      Math.atan2(e.clientY - rect.top - SIZE / 2, e.clientX - rect.left - SIZE / 2),
    );
    current[dragging] = h;
    paint();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging || !current) {
      dragging = null;
      return;
    }
    dragging = null;
    if (current.from === current.to) current = null; // degenerate = always
    paint();
    onCommit(current ? { ...current } : null);
  });

  paint();
  return {
    root,
    set(w) {
      current = w ? { ...w } : null;
      paint();
    },
  };
}

// ------------------------------------------------------------ toast

let toastTimer = 0;

export type ToastKind = 'info' | 'success' | 'error';

export function toast(text: string, ms = 2600, kind: ToastKind = 'info'): void {
  const host = document.getElementById('toast');
  if (!host) return;
  host.textContent = text;
  host.className = `show ${kind}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => host.classList.remove('show'), ms);
}

// ---------------------------------------------------------- confirm

/**
 * Promise-based confirm dialog — the studio never window.confirm()s.
 * Returns true when the (optionally destructive) action is chosen.
 */
export function confirmDialog(
  message: string,
  opts: { title?: string; action?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    let dlg = document.getElementById('k-confirm') as HTMLDialogElement | null;
    if (!dlg) {
      dlg = el('dialog');
      dlg.id = 'k-confirm';
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    dlg.appendChild(el('h2', undefined, opts.title ?? 'Are you sure?'));
    const p = el('p', 'muted', message);
    p.style.margin = '0 0 var(--s4)';
    dlg.appendChild(p);
    const row = el('div', 'dialog-actions');
    const done = (ok: boolean): void => {
      dlg!.close();
      resolve(ok);
    };
    row.appendChild(btn('Cancel', { onClick: () => done(false) }));
    const go = btn(opts.action ?? 'Confirm', {
      variant: opts.danger ? 'danger' : 'primary',
      onClick: () => done(true),
    });
    row.appendChild(go);
    dlg.appendChild(row);
    dlg.addEventListener('cancel', () => resolve(false), { once: true });
    dlg.showModal();
    go.focus();
  });
}

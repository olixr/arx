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

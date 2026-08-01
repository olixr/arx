/**
 * THE CONTEXT SHEET — the one grammar for secondary verbs
 * (The Grand Refit, Phase 2; wired game-wide in Phase 3).
 *
 * Today the item verb menu exists only for pack cells; the bank, the
 * store, the codex and every other collection improvise inline
 * buttons instead. The sheet generalizes it: ANY focusable can offer
 * verbs, Ⓨ (or right-click) opens them AT the element, and the ring
 * is modal inside until a verb lands or Ⓑ closes it.
 *
 * Laws:
 * - THE VERB COMES TO THE HAND. The sheet opens beside its anchor,
 *   clamped on-screen — focus never travels to reach it.
 * - ONE SHEET. A singleton: opening it anywhere closes it everywhere.
 * - IT HAS A FLOOR. Max height and a scroll region are defined —
 *   the one thing the old menu never had.
 */

export interface SheetVerb {
  /** Text, or a node (a glyphLine with seat chips set into it). */
  label: string | HTMLElement;
  act: () => void;
  /** Ember-tinted, set apart at the bottom (Drop, Abandon…). */
  danger?: boolean;
  disabled?: boolean;
  /**
   * THE SEAT ANSWERS ITS OWN BUTTON: while the sheet is open,
   * pressing this raw pad button index chooses this verb directly —
   * the menu teaches the fight control by using it.
   */
  padButton?: number;
}

/**
 * Verb providers, keyed by navkey prefix (`art`, `bank`, …): any
 * focusable whose navkey starts with a registered prefix offers a
 * sheet on Ⓨ / right-click. One grammar, every collection.
 */
const providers = new Map<string, (el: HTMLElement) => SheetVerb[]>();

export function registerSheetProvider(
  prefix: string,
  provide: (el: HTMLElement) => SheetVerb[],
): void {
  providers.set(prefix, provide);
}

/** Whether a focusable would offer verbs — the action strip's read. */
export function hasSheetVerbs(el: HTMLElement): boolean {
  const prefix = (el.dataset.navkey ?? '').split(':')[0] ?? '';
  const provide = providers.get(prefix);
  return !!provide && provide(el).length > 0;
}

/** Open the sheet for a focusable via its provider. True if it did. */
export function openSheetFor(el: HTMLElement): boolean {
  const key = el.dataset.navkey ?? '';
  const prefix = key.split(':')[0] ?? '';
  const provide = providers.get(prefix);
  if (!provide) return false;
  const verbs = provide(el);
  if (verbs.length === 0) return false;
  openSheet(el, verbs);
  return true;
}

let sheet: HTMLElement | null = null;
let onCloseCb: (() => void) | null = null;
let padVerbs = new Map<number, HTMLButtonElement>();

function ensure(): HTMLElement {
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.id = 'ctx-sheet';
  sheet.className = 'ui-tray hidden';
  document.body.appendChild(sheet);
  /* A click anywhere else folds the sheet away. */
  document.addEventListener('pointerdown', (e) => {
    if (sheet && !sheet.classList.contains('hidden') && !sheet.contains(e.target as Node)) {
      closeSheet();
    }
  });
  return sheet;
}

export function sheetOpen(): boolean {
  return sheet !== null && !sheet.classList.contains('hidden');
}

/** Open the sheet beside `anchor`. Verbs in order; dangers sink. */
export function openSheet(
  anchor: HTMLElement,
  verbs: SheetVerb[],
  opts: { onClose?: () => void } = {},
): void {
  const el = ensure();
  closeSheet();
  if (verbs.length === 0) return;
  onCloseCb = opts.onClose ?? null;

  el.innerHTML = '';
  padVerbs = new Map();
  const list = document.createElement('div');
  list.className = 'ctx-verbs';
  const ordered = [...verbs.filter((v) => !v.danger), ...verbs.filter((v) => v.danger)];
  ordered.forEach((verb, i) => {
    const btn = document.createElement('button');
    btn.className = verb.danger ? 'ctx-verb danger' : 'ctx-verb';
    if (typeof verb.label === 'string') btn.textContent = verb.label;
    else btn.appendChild(verb.label);
    btn.disabled = verb.disabled ?? false;
    btn.dataset.nav = '';
    btn.dataset.navkey = `ctx:${i}`;
    btn.dataset.acta = typeof verb.label === 'string' ? verb.label : 'Choose';
    btn.addEventListener('click', () => {
      closeSheet();
      verb.act();
    });
    if (verb.padButton !== undefined && !verb.disabled) padVerbs.set(verb.padButton, btn);
    list.appendChild(btn);
  });
  el.appendChild(list);
  el.classList.remove('hidden');

  /* Beside the anchor: prefer left, clamped fully on-screen. */
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let x = r.left - w - 6;
  if (x < 6) x = Math.min(window.innerWidth - w - 6, r.right + 6);
  const y = Math.max(6, Math.min(window.innerHeight - h - 6, r.top));
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

/** Close it. Returns true if a sheet was open (Ⓑ eats the press). */
export function closeSheet(): boolean {
  if (!sheet || sheet.classList.contains('hidden')) return false;
  sheet.classList.add('hidden');
  padVerbs = new Map();
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
  return true;
}

/**
 * The verb standing on a raw pad button while the sheet is open, or
 * null. The pad grammar presses it INSTEAD of navigating.
 */
export function sheetPadVerb(btnIndex: number): HTMLButtonElement | null {
  if (!sheetOpen()) return null;
  return padVerbs.get(btnIndex) ?? null;
}

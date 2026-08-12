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
 * - VERBS FAN OUT. On a pad, a short list of verbs is a WHEEL around
 *   the anchor: flick the stick at one, release Ⓐ. A list is the
 *   slowest shape a stick can read; a wheel is one motion, and the
 *   DOM, the buttons and the clicks are identical either way.
 */

/** Most verbs a wheel can hold before the sheet falls back to a list. */
const RADIAL_MAX = 8;
/** Fewer than this and the wheel is sillier than the column — one or
 * two verbs fan into orphaned plates floating far off their anchor. */
const RADIAL_MIN = 3;
/** How far the wheel's verbs stand from the hub, in rem. */
const RADIAL_RADIUS_REM = 8.5;

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
/** Verbs on the open wheel, in wheel order. 0 = the sheet is a list. */
let radialCount = 0;

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

/**
 * How many verbs the open sheet fans around its hub, or 0 when it is a
 * plain list. The pad grammar reads this to steer by stick angle.
 */
export function sheetRadialCount(): number {
  return sheetOpen() ? radialCount : 0;
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
  // A pad gets the wheel whenever the verbs fit one; every other
  // device, and any long list, keeps the column.
  const radial =
    document.body.classList.contains('pad-mode') &&
    ordered.length >= RADIAL_MIN &&
    ordered.length <= RADIAL_MAX;
  radialCount = radial ? ordered.length : 0;
  el.classList.toggle('radial', radial);
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
    if (radial) {
      btn.style.setProperty('--ring-angle', `${(i * 360) / ordered.length}deg`);
    }
    if (verb.padButton !== undefined && !verb.disabled) padVerbs.set(verb.padButton, btn);
    list.appendChild(btn);
  });
  el.appendChild(list);
  el.classList.remove('hidden');

  const r = anchor.getBoundingClientRect();
  if (radial) {
    /* The wheel hubs ON the anchor, pulled in far enough that no verb
       falls off the edge — the thing you chose stays under the hub. */
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const pad = RADIAL_RADIUS_REM * rem + 2.5 * rem;
    const hx = Math.max(pad, Math.min(window.innerWidth - pad, r.left + r.width / 2));
    const hy = Math.max(pad, Math.min(window.innerHeight - pad, r.top + r.height / 2));
    el.style.transform = `translate(${Math.round(hx)}px, ${Math.round(hy)}px)`;
    return;
  }
  /* Beside the anchor: prefer left, clamped fully on-screen. */
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
  radialCount = 0;
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

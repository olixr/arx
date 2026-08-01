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
  label: string;
  act: () => void;
  /** Ember-tinted, set apart at the bottom (Drop, Abandon…). */
  danger?: boolean;
  disabled?: boolean;
}

let sheet: HTMLElement | null = null;
let onCloseCb: (() => void) | null = null;

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
  const list = document.createElement('div');
  list.className = 'ctx-verbs';
  const ordered = [...verbs.filter((v) => !v.danger), ...verbs.filter((v) => v.danger)];
  ordered.forEach((verb, i) => {
    const btn = document.createElement('button');
    btn.className = verb.danger ? 'ctx-verb danger' : 'ctx-verb';
    btn.textContent = verb.label;
    btn.disabled = verb.disabled ?? false;
    btn.dataset.nav = '';
    btn.dataset.navkey = `ctx:${i}`;
    btn.dataset.acta = verb.label;
    btn.addEventListener('click', () => {
      closeSheet();
      verb.act();
    });
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
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
  return true;
}

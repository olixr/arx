/**
 * THE ONE RULER — the interface's single scale (The Grand Refit, Ph 1).
 *
 * The UI is designed on a 1920×1080 reference canvas. At boot and on
 * every resize this module measures the real viewport against that
 * canvas and sets the root font size, so every rem in the stylesheet —
 * which is every size there is — renders the same COMPOSITION on a
 * 1080p TV, a 1440p desk, or a 4K panel. Nothing is ever px-capped
 * into a corner of a big display again.
 *
 * Laws:
 * - THE COMPOSITION IS THE CONSTANT. Scale follows min(vw/1920,
 *   vh/1080): the whole design grows together, never one axis.
 * - EIGHTH STEPS. Scale snaps to 1/8 so the painted 9-slice chrome
 *   (drawn 5× oversampled) lands on clean device pixels and stays
 *   crisp to the 2.75 ceiling.
 * - THE COUCH GETS A SAY. The player's `Interface size` setting
 *   (Snug / Standard / Grand) multiplies the automatic scale — the
 *   ten-foot answer without a special TV mode.
 *
 * The world canvas is untouched: `arx.zoom` frames the WORLD, this
 * frames the INTERFACE, and the two never meet.
 */

const REF_W = 1920;
const REF_H = 1080;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.75;
const BASE_PX = 16;

const STORE_KEY = 'arx.uisize';

/** The player's hand on the ruler. */
export const UI_SIZES = [
  { id: 'snug', label: 'Snug', mult: 0.9 },
  { id: 'standard', label: 'Standard', mult: 1 },
  { id: 'grand', label: 'Grand', mult: 1.15 },
] as const;

export type UiSizeId = (typeof UI_SIZES)[number]['id'];

let current: UiSizeId = 'standard';

function apply(): void {
  const size = UI_SIZES.find((s) => s.id === current) ?? UI_SIZES[1];
  const fit = Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H);
  const raw = fit * size.mult;
  const snapped = Math.round(raw * 8) / 8;
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, snapped));
  const root = document.documentElement;
  root.style.fontSize = `${BASE_PX * scale}px`;
  root.style.setProperty('--ui-scale', String(scale));
}

/** Restore the saved size and take up the ruler. Call once at boot. */
export function installScale(): void {
  const stored = localStorage.getItem(STORE_KEY);
  if (stored && UI_SIZES.some((s) => s.id === stored)) current = stored as UiSizeId;
  apply();
  window.addEventListener('resize', apply);
}

export function uiSize(): UiSizeId {
  return current;
}

export function setUiSize(id: UiSizeId): void {
  current = id;
  localStorage.setItem(STORE_KEY, id);
  apply();
}

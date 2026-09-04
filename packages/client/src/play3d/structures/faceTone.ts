/**
 * LAMBERT EATS A STOP (play3d W2 scaffold) — the July spike's lesson
 * (spike3d/buildings.ts:93): a 2D palette tone painted onto a LIT
 * vertical face comes out a stop darker than the 2D painter ever paid,
 * because Lambert multiplies it by N·L + fill. Every lane lifts the
 * paintVocab / woodSkins / garrisonArt / barrierArt tones it borrows
 * through `litTone` before painting a face tile, so the 3D wall reads
 * the 2D wall's colour under the sun rig.
 *
 * PURE. Hex in, hex out; the lift is a lerp toward white in sRGB (the
 * painters' own `shade` is an additive nudge — this one is a fraction
 * so dark stone and pale limewash both gain the same visual stop).
 */

/** Default lift: about one photographic stop on a mid tone. */
export const FACE_LIFT = 0.18;

/** Lift a `#rrggbb` toward white by fraction `k` (0 = unchanged, 1 = white). */
export function litTone(hex: string, k = FACE_LIFT): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb[0] + (255 - rgb[0]) * k);
  const g = Math.round(rgb[1] + (255 - rgb[1]) * k);
  const b = Math.round(rgb[2] + (255 - rgb[2]) * k);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** The back/side faces the 2D never painted: the REAR RISER's shade(-14) restated as a fraction. */
export function shadedTone(hex: string, k = 0.12): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb[0] * (1 - k));
  const g = Math.round(rgb[1] * (1 - k));
  const b = Math.round(rgb[2] * (1 - k));
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1]!, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function hex2(v: number): string {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
}

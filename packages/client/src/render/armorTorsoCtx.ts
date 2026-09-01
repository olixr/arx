/**
 * THE GARMENT'S GRIP — the context one torso layer receives (foundations
 * F3.3). drawTorsoGarment fills it once per body on a module scratch
 * (the WIND_TMP idiom) and armorTorsoLayers' ordered array reads it. The
 * two plane helpers ARE the per-call closures the old blocks shared.
 */
import type { TorsoFrame } from './armor.js';
import type { BodyStyle } from './armorStyles.js';

export interface TorsoCtx {
  ctx: CanvasRenderingContext2D;
  st: BodyStyle;
  f: TorsoFrame;
  s: number;
  /** Shoulder / waist half-widths and hip→shoulder height (see TorsoFrame). */
  tw: number;
  ww: number;
  th: number;
  /** Widened shoulder half-width the garment quad actually uses. */
  tww: number;
  hurt: boolean;
  nowMs: number;
  runF: number;
  /** True past the shoulder — the back-facing read. */
  back: boolean;
  /** The set's metal ink (st.metal, else the shaded base). */
  metal: string;
  /** Which side leads the turn, and how far through it the body is. */
  leadSign: number;
  turnK: number;
  frontPlaneOn(): void;
  frontPlaneOff(): void;
}

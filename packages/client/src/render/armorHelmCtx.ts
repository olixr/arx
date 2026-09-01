/**
 * THE CROWN'S GRIP — the context one helm painter receives (foundations
 * F3.2). drawHelmet assembles it once per call on a module scratch (the
 * WIND_TMP idiom: zero new allocations against the old closure form) and
 * the registries in armorHelmsCloth/-Metal read it. The helper members
 * ARE per-call closures, exactly the ones the old branches shared.
 */
import type { HeadFrame } from './armor.js';
import type { HelmStyle } from './armorStyles.js';

export interface HelmCtx {
  ctx: CanvasRenderingContext2D;
  st: HelmStyle;
  f: HeadFrame;
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  /** hurt ? white-flash : the style's own color. */
  mc: string;
  drawGlyphOrbit(pass: 'far' | 'near'): void;
  drawSideFins(lift?: number, out?: number): void;
  drawSpikesCrown(lift?: number): void;
}

/** The metal path's extra measures (see drawHelmet's forge preamble). */
export interface MetalHelmCtx extends HelmCtx {
  ld: number;
  vx: number;
  sw: number;
  front: boolean;
  shellLight(shell: () => void, topY: number, botY: number): void;
}

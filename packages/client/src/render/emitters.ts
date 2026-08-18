/**
 * The standing-emitter evaluator: turns a shared EmitterSpec row into
 * this frame's glow (bloom) and light (lightmap punch) entries.
 *
 * THE LIGHT IS CONTENT (lighting v4, phase 1): the specs live in
 * @arx/shared (world/lights.ts) — WHICH tiles emit and at what values
 * is data. This module is the client's half of the contract: HOW a row
 * becomes screen work, in exactly the arithmetic the renderer's old
 * hardcoded chain used. The parity test in emitters.test.ts holds both
 * halves to the original bit-for-bit; keep the operation ORDER here
 * stable (float multiplication is commutative but not associative —
 * reordering a product is a parity break even when the algebra agrees).
 *
 * Pure and renderer-free by design: the renderer feeds it the frame
 * environment (clock, flame gate, darkness boost, camera squash, deck
 * lift, palette roll) and the two output arrays; nothing here reads
 * globals or the DOM.
 */
import {
  hashCoords,
  lightCurveAt,
  type EmitterSpec,
} from '@arx/shared';
import type { WorldLight } from './lighting.js';

/** The renderer's bloom-queue entry shape (renderer.ts `glows`). */
export interface EmitterGlowOut {
  x: number;
  y: number;
  r: number;
  rgb: string;
  a: number;
}

/**
 * Evaluate one standing emitter at tile (tx, ty).
 *
 * - `t`: seconds (performance.now()/1000 — the frame's flicker clock).
 * - `flame`/`boost`: the sky's man-made-flame gate and darkness bloom
 *   boost, sampled once per frame.
 * - `yScale`: camera squash — divides `air` heights so blooms ride
 *   raised fixtures (the projAir law).
 * - `deckLift`: porch board lift for `porch` fixtures (THE PORCH
 *   LIGHT), 0 elsewhere.
 *
 * Returns false when the fixture stands down (its day gate holds).
 */
export function collectEmitter(
  spec: EmitterSpec,
  tx: number,
  ty: number,
  t: number,
  flame: number,
  boost: number,
  yScale: number,
  deckLift: number,
  glows: EmitterGlowOut[],
  lights: WorldLight[],
): boolean {
  if (spec.flameGate && flame <= 0.05) return false;
  const k = lightCurveAt(spec.curve, t, tx, ty);
  // The palette roll: the SAME hash the tile's painter makes, so glow
  // and paint always agree (the RunePillar law).
  const alt = spec.palette !== undefined && (hashCoords(spec.palette.salt, tx, ty) & 1) === 0;
  for (const g of spec.glows) {
    const airH = (g.air ?? 0) + (spec.porch ? deckLift : 0);
    glows.push({
      x: tx + g.dx,
      y: airH !== 0 ? ty + g.dy - airH / yScale : ty + g.dy,
      r: g.rRide ? g.r * k : g.r,
      rgb: alt && g.altRgb !== undefined ? g.altRgb : g.rgb,
      a: g.gate === 'flame' ? g.a * flame * k : g.a * k * boost,
    });
  }
  for (const l of spec.lights) {
    const light: WorldLight = {
      x: tx + l.dx,
      y: ty + l.dy,
      r: l.rRide ? l.r * k : l.r,
      rgb: alt && l.altRgb !== undefined ? l.altRgb : l.rgb,
      intensity: l.flameGated ? l.intensity * flame * k : l.intensity * k,
    };
    // Set only when true — the original pushes omitted the key, and
    // the parity gate compares object shapes deep-strictly.
    if (l.occlude) light.occlude = true;
    lights.push(light);
  }
  return true;
}

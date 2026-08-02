/**
 * THE MATTER LIBRARY — shared vocabulary.
 *
 * A material is the MASTERED voice of one kind of matter: its cooling
 * ramp, its grain populations (THE FINE GRAIN LAW: fines carry the
 * texture, body grains the mass, sparse heroes the story), its weight
 * and buoyancy, its silhouettes, its glow. Each material file masters
 * that voice ONCE; every ability that speaks it inherits the mastery.
 *
 * A deployment is that voice arranged in space — burst / plume /
 * ring / path / field and the material's own verbs (venom drips,
 * storm arcs, dust slams). Deployments compose 3-5 particle
 * populations plus glow; they never blur, never gradient, and they
 * respect the pool caps by construction (one-shot ≤ ~50 grains at
 * scale 1, sustained rates ≤ ~140/s).
 *
 * THE ONE-VOICE LAW (binds Phase 3+): no signature may hand-mix a
 * material this library owns. Bespoke choreography composes
 * deployments; it does not re-roll fire from raw bursts.
 */

import type { Emitter, Particles } from '../particles.js';

/**
 * What a deployment needs from its host. `SigCtx` satisfies this
 * shape directly; the `?fx` lab passes a shim. `glow` is the
 * renderer's additive glow queue — optional because tests and
 * headless hosts have none.
 */
export interface MatterCtx {
  particles: Particles;
  glow?: (x: number, y: number, r: number, rgb: string, a: number) => void;
}

export interface MatterOpts {
  /** Size-and-count multiplier. Counts scale linearly, sizes by √. */
  scale?: number;
  /** Sustained deployments: seconds of life (each has its own default). */
  dur?: number;
  /** Aimed deployments: heading in radians. */
  dir?: number;
  /** Far anchor for path/arc deployments. */
  x2?: number;
  y2?: number;
  /** Rings and fields: radius in tiles. */
  radius?: number;
  /** Spawn altitude in tiles, for deployments released from a height. */
  z?: number;
}

/**
 * One arrangement of a material's voice. One-shot deployments return
 * nothing; sustained ones return the live emitter handle (move it,
 * stop() it) — a second handle, when a deployment runs two emitters,
 * dies on its own clock.
 */
export type Deployment = (c: MatterCtx, x: number, y: number, o?: MatterOpts) => Emitter | void;

export interface Material {
  id: string;
  /** The lab label. */
  name: string;
  /**
   * Identity palette, hot-to-cool — the material's fingerprint. Used
   * by the contract tests (no two materials may share a fingerprint)
   * and later by icons/UI accents.
   */
  palette: string[];
  deployments: Record<string, Deployment>;
}

/**
 * Bridge a signature context (or anything shaped like one) to a
 * MatterCtx. Structural on purpose — no import of SigCtx, no module
 * cycle. The material's default glow color yields to the host's own
 * style glow.
 */
export function asMatter(host: {
  particles: Particles;
  glow(x: number, y: number, r: number, a: number): void;
}): MatterCtx {
  return {
    particles: host.particles,
    glow: (x, y, r, _rgb, a) => host.glow(x, y, r, a),
  };
}

/** Count scaling: linear, floored at 1 grain. */
export function nOf(base: number, scale: number): number {
  return Math.max(1, Math.round(base * scale));
}

/** Size scaling: by √scale so a doubled cast doesn't read cartoonish. */
export function sOf(base: number, scale: number): number {
  return base * Math.sqrt(scale);
}

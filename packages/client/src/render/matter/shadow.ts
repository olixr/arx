/**
 * SHADOW — the dark that moves on purpose.
 *
 * The story: shadow is smoke's sinister cousin, and the difference
 * is INTENT. Smoke drifts; shadow reaches. Its tongues curl along
 * the ground toward things, its veils hang without dispersing, and
 * its heart is the world's own ink — the exact outline color every
 * body already wears, so shadow reads as the drawing itself come
 * loose. It runs violet at the edges (the bruise between dark and
 * lit) and it NEVER glows: shadow's voice is the deliberate absence
 * where a glow would be.
 *
 * Physics temperament: creeping. Ground-hugging reach, slow hangs,
 * nothing ballistic; what rises rises reluctantly.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

/** The world's ink — shadow IS the outline come loose. */
const INK = '#241a2e';
const DEEP = '#332742';
const BRUISE = '#3f3154';
const EDGE = '#574a6e';
const PALE = '#6e6084';

/** The reaching tongue — a lick, inverted to crawl instead of burn. */
const TENDRIL: BurstOpts = {
  shape: 'lick', speed: 1.0, life: 0.9, gravity: 0, size: 0.12,
  z: 0.04, drag: 1.6, layer: 'world', shadow: 0,
  fade: DEEP, fadeAt: 0.5, fade2: INK, fade2At: 0.8,
};

/** The hanging mass — dark that does not disperse. Audit law: the
 * dark must be BIG — small ink blots read as litter, and shadow on
 * dark ground survives only by mass and its violet edge. */
const MASS: BurstOpts = {
  shape: 'puff', speed: 0.18, life: 2.2, gravity: 0, size: 0.15,
  vz: 0.28, zg: -0.08, grow: 0.06, wobble: 0.18, layer: 'world',
  shadow: 0, fade: INK, fadeAt: 0.6,
};

/** Void motes — the fines of the dark, wearing the bruise-violet
 * edge that keeps shadow legible on dark ground. */
const VOID_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.1, life: 1.9, gravity: 0, size: 0.07,
  vz: 0.18, zg: -0.05, wobble: 0.12, layer: 'world', shadow: 0,
  fade: INK, fadeAt: 0.55,
};

const VEIL_POPS: EmitterPop[] = [
  { colors: [INK, DEEP], opts: MASS, weight: 1.8 },
  { colors: [BRUISE, EDGE], opts: VOID_MOTE, weight: 1.4 },
];

const BLOOM_POPS: EmitterPop[] = [
  { colors: [INK, DEEP], opts: MASS, weight: 2 },
  { colors: [EDGE], opts: VOID_MOTE, weight: 1 },
];

/** The dark blooms — a smoke-bomb heart with violet edges. NO glow. */
const bloom: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(14, k), [INK, DEEP], {
    ...MASS, size: sOf(0.15, k), speed: 0.35, z: 0.15,
  });
  // The bruise edge — violet where dark meets lit.
  ps.burst(x, y, nOf(9, k), [BRUISE, EDGE], { ...VOID_MOTE, size: sOf(0.075, k), speed: 0.3 });
  ps.emit({
    x, y, rate: 22 * k, dur: 1.0, attack: 0.05, release: 0.45,
    pops: BLOOM_POPS,
  });
};

/** The reach — tongues of dark crawling outward along the floor. */
const tendrils: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  const aimed = o.dir !== undefined;
  ps.burst(x, y, nOf(aimed ? 7 : 10, k), [INK, DEEP, BRUISE], {
    ...TENDRIL, size: sOf(0.09, k),
    ...(aimed ? { dir: o.dir, spread: 0.6 } : {}),
  });
  ps.burst(x, y, nOf(5, k), [EDGE], {
    ...VOID_MOTE, size: sOf(0.05, k), z: 0.03,
  });
};

/** A hanging veil — bodies inside it belong to the dark. */
const veil: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 1.0,
    rate: 44 * k, dur: o.dur ?? 2.6, attack: 0.25, release: 0.8,
    pops: VEIL_POPS,
  });
};

/** The door — a brief standing slit of dark, arrivals and exits. */
const door: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  // A tight column: masses stacked on z, born and gone quickly.
  for (let i = 0; i < nOf(6, k); i++) {
    ps.burst(x, y, 1, [INK, DEEP], {
      ...MASS, size: sOf(0.1, k), speed: 0.1, z: 0.12 + i * 0.16,
      life: 0.7, grow: 0.02,
    });
  }
  ps.burst(x, y, nOf(6, k), [BRUISE, EDGE], {
    ...VOID_MOTE, size: sOf(0.055, k), z: 0.4, speed: 0.25,
  });
};

export const shadow: Material = {
  id: 'shadow',
  name: 'Shadow',
  palette: [INK, DEEP, BRUISE, EDGE, PALE],
  deployments: { bloom, tendrils, veil, door },
};

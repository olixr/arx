/**
 * SMOKE — what remains when matter gives up.
 *
 * The story: smoke is born dark and dense at the source, billows as
 * it climbs, staggers off its rails, and THINS — the ramp runs dark
 * to pale, the inverse of fire, because dispersing smoke lets the
 * sky through. Volume comes from the three-lobe puff silhouette and
 * slow growth; conviction comes from wobble (rising smoke never
 * rides rails) and from the world layer, so a smoke screen actually
 * swallows the bodies inside it.
 *
 * Physics temperament: weightless and slow. Nothing ballistic,
 * nothing landing — smoke only ever leaves.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const BORN = '#3f3945';
const DENSE = '#5a5560';
const MID = '#6e6878';
const THIN = '#8a8394';
const GHOST = '#a39cae';

/**
 * The billow body — born dark, thinning pale as it climbs. Audit
 * law: smoke masses must be BIG enough that the three lobes merge
 * into one cloud — small puffs read as rubble, not vapour.
 */
const BILLOW: BurstOpts = {
  shape: 'puff', speed: 0.16, life: 2.0, gravity: 0, size: 0.145,
  vz: 0.5, zg: -0.18, grow: 0.09, wobble: 0.24, layer: 'world',
  shadow: 0, fade: MID, fadeAt: 0.35, fade2: THIN, fade2At: 0.7,
};

/** Haze fines — round-lobed motes, the smoke between the smoke. */
const HAZE: BurstOpts = {
  shape: 'mote', speed: 0.12, life: 2.6, gravity: 0, size: 0.07,
  vz: 0.22, zg: -0.06, grow: 0.05, wobble: 0.16, layer: 'world',
  shadow: 0, fade: GHOST, fadeAt: 0.6,
};

/** Low crawler — smoke that hugs the floor before it remembers up. */
const CREEPER: BurstOpts = {
  shape: 'puff', speed: 0.4, life: 1.7, gravity: 0, size: 0.125,
  z: 0.04, vz: 0.12, zg: -0.05, grow: 0.08, drag: 1.4, wobble: 0.1,
  layer: 'world', shadow: 0, fade: THIN, fadeAt: 0.45,
};

const PLUME_POPS: EmitterPop[] = [
  { colors: [BORN, DENSE], opts: BILLOW, weight: 2 },
  { colors: [MID, THIN], opts: HAZE, weight: 1.2 },
];

const VEIL_POPS: EmitterPop[] = [
  { colors: [DENSE, MID], opts: { ...BILLOW, vz: 0.3, grow: 0.05 }, weight: 1.4 },
  { colors: [MID, THIN], opts: HAZE, weight: 2 },
];

const CREEP_POPS: EmitterPop[] = [
  { colors: [DENSE, MID], opts: CREEPER, weight: 2.2 },
  { colors: [MID, THIN], opts: { ...HAZE, z: 0.03, vz: 0.1 }, weight: 1 },
];

/** The bomb bloom: a dense instant sphere that hangs, then thins. */
const billow: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  // The dense birth — dark hearts shoulder-to-shoulder, COHERENT:
  // slow enough that the bloom stays one mass, not a scatter.
  ps.burst(x, y, nOf(12, k), [BORN, DENSE], {
    ...BILLOW, size: sOf(0.15, k), speed: 0.3, z: 0.2,
  });
  // The haze shell around them.
  ps.burst(x, y, nOf(10, k), [MID, THIN], { ...HAZE, size: sOf(0.075, k), speed: 0.35 });
  // A short exhale keeps the bloom alive past its first breath.
  ps.emit({
    x, y, rate: 26 * k, dur: 1.1, attack: 0.05, release: 0.5,
    pops: PLUME_POPS,
  });
};

/** A standing column — chimney, doused fire, burning building. */
const plume: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    x, y, rate: 40 * k, dur: o.dur ?? 2.6, attack: 0.25, release: 0.6,
    pops: PLUME_POPS,
  });
};

/** A hanging screen over an area — bodies inside are swallowed. */
const veil: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 1.1,
    rate: 48 * k, dur: o.dur ?? 2.4, attack: 0.2, release: 0.7,
    pops: VEIL_POPS,
  });
};

/** Floor-hugging crawl — smoke sliding out of a doorway. */
const creep: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.8,
    rate: 40 * k, dur: o.dur ?? 2.2, attack: 0.15, release: 0.6,
    pops: CREEP_POPS,
  });
};

export const smoke: Material = {
  id: 'smoke',
  name: 'Smoke',
  palette: [BORN, DENSE, MID, THIN, GHOST],
  deployments: { billow, plume, veil, creep },
};

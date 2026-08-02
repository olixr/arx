/**
 * VENOM — the liquid that means you harm.
 *
 * The story: venom is WET. It lobs in fat drops that stretch as they
 * fly and SPLAT where they land, leaving flecks that dry dark. Its
 * cloud is not smoke — it's heavier than air, barely lifting off the
 * floor, and it bubbles: tiny bright motes rise through the mass and
 * pop. Everything venomous runs the fresh-to-dried ramp, bright
 * sickly green to the near-black of an old stain, because poison
 * that stays bright reads as paint, not fluid.
 *
 * Physics temperament: heavy liquid. Drops arc low and land hard
 * (THE LIQUID LAW's splat chain does the spatter); the cloud sinks
 * and clings; only the bubbles ever rise.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const FRESH = '#8fd968';
const BRIGHT = '#6dbf4a';
const TOXIN = '#4c8c33';
const MURK = '#3a6626';
const DRIED = '#2b4a1d';

/** The drop — venom's hero. Flies fat and SLOW, lands as spatter. */
const DROP: BurstOpts = {
  shape: 'drop', speed: 1.0, life: 2.4, gravity: 0, size: 0.1,
  vz: 2.2, zg: 8, land: 'splat', layer: 'world',
  fade: TOXIN, fadeAt: 0.5, fade3: DRIED, fade3At: 0.9,
};

/** The cloud mass — heavier than air, clinging to the floor. Leads
 * with the BRIGHT greens; murk is where it ends, not where it lives
 * (dark-on-stone vanished in the audit). */
const MIASMA: BurstOpts = {
  shape: 'puff', speed: 0.16, life: 2.2, gravity: 0, size: 0.125,
  z: 0.1, vz: 0.14, zg: 0.12, land: 'settle', grow: 0.06,
  wobble: 0.14, layer: 'world', shadow: 0,
  fade: MURK, fadeAt: 0.6, fade2: DRIED, fade2At: 0.88,
};

/** Bubbles — small bright motes that rise through the mass and pop. */
const BUBBLE: BurstOpts = {
  shape: 'mote', speed: 0.06, life: 0.7, gravity: 0, size: 0.045,
  vz: 0.5, zg: -0.2, layer: 'world', shadow: 0, flicker: 0.3,
};

const CLOUD_POPS: EmitterPop[] = [
  { colors: [BRIGHT, TOXIN], opts: MIASMA, weight: 2.4 },
  { colors: [FRESH], opts: BUBBLE, weight: 1 },
  { colors: [TOXIN, MURK], opts: { ...DROP, speed: 0.35, vz: 0.4, z: 0.3, size: 0.06 }, weight: 0.5 },
];

const POOL_POPS: EmitterPop[] = [
  { colors: [TOXIN, MURK], opts: { ...MIASMA, size: 0.085, z: 0.03, vz: 0.06 }, weight: 2 },
  { colors: [FRESH, BRIGHT], opts: BUBBLE, weight: 1.3 },
];

/** A spat cone of drops — the envenomed strike, the serpent's gift. */
const spit: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(9, k), [FRESH, BRIGHT, TOXIN], {
    ...DROP, size: sOf(0.085, k),
    dir: o.dir ?? 0, spread: 0.7, z: 0.45,
  });
  // The fine mist that rides every wet spray.
  ps.burst(x, y, nOf(6, k), [BRIGHT, TOXIN], {
    shape: 'mote', speed: 0.9, life: 0.5, gravity: 0, size: sOf(0.05, k),
    dir: o.dir ?? 0, spread: 0.8, z: 0.45, vz: 0.3, zg: 2, land: 'die',
    layer: 'world', shadow: 0,
  });
};

/** The burst-at-the-body: drops flung all ways, landing as stains. */
const burst: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  c.particles.burst(x, y, nOf(12, k), [FRESH, BRIGHT, TOXIN], {
    ...DROP, size: sOf(0.085, k), z: 0.35,
  });
  c.particles.burst(x, y, nOf(7, k), [BRIGHT, TOXIN], {
    ...MIASMA, size: sOf(0.095, k), speed: 0.4,
  });
};

/** The cloud of death — low, clinging, bubbling. Not smoke. */
const cloud: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.9,
    rate: 64 * k, dur: o.dur ?? 2.6, attack: 0.15, release: 0.7,
    pops: CLOUD_POPS,
  });
};

/** A dripping point — the envenomed blade, the leaking sac. */
const drip: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    x, y, z: 0.75, rate: 7 * k, dur: o.dur ?? 2.2, attack: 0.02, release: 0.1,
    pops: [{
      colors: [BRIGHT, TOXIN],
      opts: { ...DROP, speed: 0.12, vz: -0.1, zg: 6, size: 0.065 },
    }],
  });
};

/**
 * One bead — a single fat drop released from a held height, falling
 * straight to its splat. The envenomed edge's tear; anything that
 * drips one deliberate drop reuses it.
 */
const bead: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  c.particles.burst(x, y, 1, [BRIGHT, TOXIN], {
    ...DROP, size: sOf(0.075, k), speed: 0.05,
    z: Math.max(0.2, o.z ?? 0.55), vz: -0.15, zg: 7,
  });
};

/** The standing puddle — a floor that bubbles and stains. */
const pool: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.6,
    rate: 34 * k, dur: o.dur ?? 2.8, attack: 0.15, release: 0.6,
    pops: POOL_POPS,
  });
};

export const venom: Material = {
  id: 'venom',
  name: 'Venom',
  palette: [FRESH, BRIGHT, TOXIN, MURK, DRIED],
  deployments: { spit, burst, cloud, drip, pool, bead },
};

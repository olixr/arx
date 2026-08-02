/**
 * DUST — the earth speaks when struck.
 *
 * The story: dust has no life of its own. Every grain was THROWN —
 * it flies ballistic, hangs one beat at the top of its arc, and
 * always comes back to the dirt it came from. A ground smash is
 * four voices at once: the flat shock skirt racing out along the
 * floor, the chunk heroes lofted spinning, the billow that swallows
 * the strike point, and the fines that rain back down and LIE THERE.
 * The settling is the signature — dust that vanishes mid-air is
 * just gray fire.
 *
 * Physics temperament: heavy. Everything lands; nothing rises that
 * wasn't thrown.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const SAND = '#d8b06a';
const PALE = '#b89468';
const LOAM = '#a8825a';
const SHADE = '#8a6f4d';
const DEEP = '#6e5a44';

/** The shock skirt — flat slivers racing out along the floor. */
const SKIRT: BurstOpts = {
  shape: 'streak', speed: 3.2, life: 0.55, gravity: 0, size: 0.055,
  drag: 4.5, layer: 'ground',
};

/** Lofted chunk heroes — they spin, land, hop once, and lie. */
const CHUNK: BurstOpts = {
  shape: 'shard', speed: 1.1, life: 2.2, gravity: 0, size: 0.065,
  spin: 9, vz: 2.6, zg: 8, land: 'bounce', bounce: 0.45,
  layer: 'world', fade: SHADE, fadeAt: 0.6,
};

/** The billow — thrown dust hanging in the air before it settles. */
const BILLOW: BurstOpts = {
  shape: 'puff', speed: 0.55, life: 1.4, gravity: 0, size: 0.11,
  z: 0.12, vz: 0.5, zg: 1.1, land: 'settle', grow: 0.06, drag: 1.2,
  layer: 'world', shadow: 0, fade: SHADE, fadeAt: 0.55,
};

/** Falling fines — the rain of earth that ends every throw. */
const FINES: BurstOpts = {
  speed: 0.9, life: 1.6, gravity: 0, size: 0.038,
  vz: 2.0, zg: 7.5, land: 'settle', layer: 'world',
  fade: DEEP, fadeAt: 0.65,
};

const BILLOW_POPS: EmitterPop[] = [
  { colors: [PALE, LOAM], opts: BILLOW, weight: 2 },
  { colors: [SAND, PALE], opts: FINES, weight: 1.4 },
];

const SKIRT_POPS: EmitterPop[] = [
  { colors: [SAND, PALE], opts: { ...SKIRT, speed: 1 }, weight: 2 },
  { colors: [PALE, LOAM], opts: { ...BILLOW, size: 0.09, vz: 0.4 }, weight: 1 },
];

/**
 * THE GROUND SMASH — the deployment this material exists for. Four
 * layers land in order: skirt, chunks, billow, and the fines that
 * rain back and lie on the dirt where they fell.
 */
const slam: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  // 1. The shock skirt races flat along the floor.
  ps.burst(x, y, nOf(20, k), [SAND, PALE], { ...SKIRT, size: sOf(0.055, k) });
  // 2. Chunk heroes loft, tumble, land, and hop.
  ps.burst(x, y, nOf(8, k), [LOAM, SHADE], { ...CHUNK, size: sOf(0.07, k) });
  // 3. The billow swallows the strike point.
  ps.burst(x, y, nOf(12, k), [PALE, LOAM], { ...BILLOW, size: sOf(0.12, k) });
  // 4. Fines arc high and rain back down to lie there.
  ps.burst(x, y, nOf(15, k), [SAND, PALE], { ...FINES, size: sOf(0.04, k) });
};

/**
 * The gouge — earth thrown ALONG a blow. A directional cone of
 * hopping chunks and low billow with fines raining after: the heavy
 * swing's wake, the lodged edge's grit. The slam's aimed sibling.
 */
const gouge: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const d = o.dir ?? 0;
  const ps = c.particles;
  ps.burst(x, y, nOf(6, k), [LOAM, SHADE], {
    ...CHUNK, size: sOf(0.06, k), speed: 1.4, vz: 1.9,
    dir: d, spread: 0.7,
  });
  ps.burst(x, y, nOf(8, k), [PALE, LOAM], {
    ...BILLOW, size: sOf(0.1, k), speed: 0.7, dir: d, spread: 0.9,
  });
  ps.burst(x, y, nOf(8, k), [SAND, PALE], {
    ...FINES, size: sOf(0.036, k), vz: 1.6, dir: d, spread: 1.0,
  });
};

/** A footfall / small strike — one breath of earth. */
const kick: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(4, k), [PALE, LOAM], {
    ...BILLOW, size: sOf(0.08, k), vz: 0.35, life: 0.9,
  });
  ps.burst(x, y, nOf(3, k), [SAND], { ...FINES, size: sOf(0.034, k), vz: 1.1, life: 0.9 });
};

/** A rolling cloud — collapse aftermath, dragged cargo, stampede. */
const billow: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.6,
    rate: 54 * k, dur: o.dur ?? 1.8, attack: 0.08, release: 0.5,
    pops: BILLOW_POPS,
  });
};

/** An expanding shock rim — the shockwave's dust skirt, driven out. */
const skirt: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'rim', x, y, radius: o.radius ?? 0.5, outward: 2.6,
    rate: 130 * k, dur: o.dur ?? 0.45, attack: 0.02, release: 0.2,
    pops: SKIRT_POPS,
  });
};

export const dust: Material = {
  id: 'dust',
  name: 'Dust',
  palette: [SAND, PALE, LOAM, SHADE, DEEP],
  deployments: { slam, gouge, kick, billow, skirt },
};

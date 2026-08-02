/**
 * WATER — the honest liquid.
 *
 * The story: water tells the truth about physics harder than any
 * other matter. It jets, it arcs, it SPLASHES — drops fly with real
 * ballistics and die into spatter at the dirt, foam motes ride
 * every violent surface, and mist hangs where water has just been
 * violent. Palette runs deep channel blue to foam white; the mist
 * uses the round 'mote' lobes (vapour has no corners — the
 * waterfall law, honored here).
 *
 * Physics temperament: true ballistic liquid. Everything that goes
 * up comes down; everything that comes down splats.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const DEEP = '#5b8fb8';
const CHANNEL = '#7db3d8';
const LIGHT = '#9cc9e8';
const FOAM = '#d8ecf7';
const WHITE = '#f0f8fc';

/** The drop — water's body, honest ballistics, splat landing. */
const DROP: BurstOpts = {
  shape: 'drop', speed: 1.3, life: 2.0, gravity: 0, size: 0.07,
  vz: 2.4, zg: 9, land: 'splat', layer: 'world',
  fade: DEEP, fadeAt: 0.6,
};

/** Foam — the white of violence on water. */
const FOAM_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.5, life: 0.7, gravity: 0, size: 0.055,
  vz: 0.9, zg: 5, land: 'die', layer: 'world', shadow: 0,
};

/** Mist — hangs where water was just violent. Round lobes only. */
const MIST: BurstOpts = {
  shape: 'mote', speed: 0.15, life: 1.6, gravity: 0, size: 0.075,
  z: 0.2, vz: 0.15, zg: 0.3, land: 'die', grow: 0.04, wobble: 0.1,
  layer: 'world', shadow: 0, fade: FOAM, fadeAt: 0.55,
};

/** The jet — a pressured streak, the hose-line of a geyser. */
const JET: BurstOpts = {
  shape: 'streak', speed: 2.2, life: 0.5, gravity: 0, size: 0.05,
  vz: 1.2, zg: 8, land: 'die', layer: 'world', shadow: 0,
  fade: LIGHT, fadeAt: 0.5,
};

const SPRAY_POPS: EmitterPop[] = [
  { colors: [LIGHT, CHANNEL], opts: DROP, weight: 1.6 },
  { colors: [FOAM, WHITE], opts: FOAM_MOTE, weight: 1.4 },
  { colors: [FOAM], opts: MIST, weight: 0.8 },
];

const RAIN_POPS: EmitterPop[] = [
  { colors: [LIGHT, CHANNEL], opts: { ...DROP, speed: 0.1, vz: -0.4, zg: 6, size: 0.055 }, weight: 2.2 },
  { colors: [FOAM], opts: { ...MIST, z: 0.05, vz: 0.1 }, weight: 0.7 },
];

/** The splash: drops up and out, foam ring, mist hanging after. */
const splash: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(12, k), [LIGHT, CHANNEL, DEEP], { ...DROP, size: sOf(0.08, k) });
  ps.burst(x, y, nOf(11, k), [FOAM, WHITE], { ...FOAM_MOTE, size: sOf(0.06, k) });
  ps.burst(x, y, nOf(7, k), [FOAM], { ...MIST, size: sOf(0.08, k) });
};

/** The pressured cone — geyser mouth, burst pipe, tide spell. */
const spray: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const d = o.dir ?? 0;
  const ps = c.particles;
  ps.burst(x, y, nOf(8, k), [WHITE, FOAM], {
    ...JET, size: sOf(0.05, k), dir: d, spread: 0.4, z: 0.3,
  });
  return ps.emit({
    kind: 'cone', x, y, z: 0.3, dir: d, spread: 0.5,
    rate: 60 * k, dur: o.dur ?? 1.0, attack: 0.04, release: 0.25,
    pops: SPRAY_POPS,
  });
};

/** Honest rain over an area — every drop lands and splats. */
const rain: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, z: 1.6, radius: o.radius ?? 1.1,
    rate: 40 * k, dur: o.dur ?? 2.4, attack: 0.3, release: 0.6,
    pops: RAIN_POPS,
  });
};

/**
 * The undertow — water hauled the wrong way: foam and mist dragged
 * out of a circle INTO the eye. The maelstrom's verb; every drag
 * and drowning pull reuses it.
 */
const undertow: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'rim', x, y, radius: o.radius ?? 1.0, outward: -2.0,
    rate: 54 * k, dur: o.dur ?? 1.2, attack: 0.1, release: 0.3,
    pops: [
      { colors: [FOAM, WHITE], opts: { ...FOAM_MOTE, vz: 0.2, zg: 0, land: 'none', life: 0.6, drag: 0.5 }, weight: 1.8 },
      { colors: [LIGHT, CHANNEL], opts: { ...MIST, z: 0.06, vz: 0.1, zg: 0, land: 'none', drag: 0.6 }, weight: 1 },
    ],
  });
};

/** The churn — standing white violence, rapids over a body. */
const churn: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.5,
    rate: 56 * k, dur: o.dur ?? 1.8, attack: 0.1, release: 0.4,
    pops: [
      { colors: [FOAM, WHITE], opts: { ...FOAM_MOTE, vz: 1.3 }, weight: 2 },
      { colors: [LIGHT, CHANNEL], opts: { ...DROP, vz: 1.2, size: 0.055 }, weight: 1 },
      { colors: [FOAM], opts: MIST, weight: 0.7 },
    ],
  });
};

export const water: Material = {
  id: 'water',
  name: 'Water',
  palette: [DEEP, CHANNEL, LIGHT, FOAM, WHITE],
  deployments: { splash, spray, rain, churn, undertow },
};

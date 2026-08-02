/**
 * BLOOD — the wound made visible.
 *
 * The story: blood is a liquid with a direction. It leaves a body
 * ALONG the blow — streaks first (the fast red line of the cut),
 * then the heavy drops that arc low, land, and STAY, drying from
 * wet crimson to the near-black every fighter knows. Blood never
 * rises, never drifts, never glows. Its whole voice is weight and
 * consequence: what hit, where it flew, where it dried.
 *
 * Physics temperament: the heaviest liquid. Low arcs, hard
 * landings, splat flecks that outlive the fight.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts } from '../particles.js';

const WET = '#d84a3a';
const RED = '#b8362a';
const DARK = '#8e2a20';
const CLOT = '#63201a';
const DRIED = '#421410';

/** The heavy drop — arcs low, splats, dries near-black. */
const DROP: BurstOpts = {
  shape: 'drop', speed: 1.4, life: 2.0, gravity: 0, size: 0.085,
  vz: 1.4, zg: 9, land: 'splat', layer: 'world',
  fade: DARK, fadeAt: 0.45, fade3: DRIED, fade3At: 0.85,
};

/** The cut line — fast red streaks along the blow. */
const STREAK: BurstOpts = {
  shape: 'streak', speed: 2.6, life: 0.4, gravity: 0, size: 0.05,
  z: 0.45, vz: 0.6, zg: 7, land: 'die', layer: 'world', shadow: 0,
  fade: DARK, fadeAt: 0.6,
};

/** The directed spray — blood leaves along the blow. */
const spray: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const d = o.dir ?? 0;
  const ps = c.particles;
  ps.burst(x, y, nOf(10, k), [WET, RED], {
    ...STREAK, size: sOf(0.05, k), dir: d, spread: 0.55,
  });
  ps.burst(x, y, nOf(6, k), [RED, DARK], {
    ...DROP, size: sOf(0.075, k), dir: d, spread: 0.7, z: 0.45,
  });
};

/** The gush — a grave wound, every direction at once. */
const gush: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(9, k), [WET, RED], { ...STREAK, size: sOf(0.05, k), z: 0.5 });
  ps.burst(x, y, nOf(9, k), [WET, RED, DARK], { ...DROP, size: sOf(0.08, k), z: 0.5, vz: 1.8 });
};

/** Lobbed spatter over an area — the aftermath written on the floor. */
const spatter: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  c.particles.burst(x, y, nOf(10, k), [RED, DARK, CLOT], {
    ...DROP, size: sOf(0.065, k), speed: 0.9 * (o.radius ?? 1), vz: 2.2,
  });
};

/** A wound that keeps giving — drops falling from a carried hurt. */
const drip: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    x, y, z: 0.6, rate: 5 * k, dur: o.dur ?? 2.4, attack: 0.02, release: 0.1,
    pops: [{
      colors: [RED, DARK],
      opts: { ...DROP, speed: 0.1, vz: -0.1, zg: 7, size: 0.06 },
    }],
  });
};

export const blood: Material = {
  id: 'blood',
  name: 'Blood',
  palette: [WET, RED, DARK, CLOT, DRIED],
  deployments: { spray, gush, spatter, drip },
};

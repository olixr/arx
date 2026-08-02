/**
 * RADIANCE — light behaving like a blessing.
 *
 * The story: radiance is the one matter with no weight at all. It
 * rises because up is where it belongs — motes float free, glints
 * pulse like small annunciations, and shafts stand TALL (streaks
 * with real altitude, holding their vertical). It cools from white
 * heat through gold to warm amber, never to gray: light doesn't
 * die, it departs. Radiance leans on the glow queue harder than any
 * other material — it is the glow, made grain.
 *
 * Physics temperament: weightless ascent. Nothing lands. Ever.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const WHITE = '#fff7dc';
const GOLD = '#ffd27a';
const AMBER = '#e8a94e';
const WARM = '#c98a3e';
const EMBER = '#a86f33';

const GLOW_RGB = '255, 220, 140';

/** Rising motes — the congregation. */
const MOTE: BurstOpts = {
  shape: 'mote', speed: 0.12, life: 1.8, gravity: 0, size: 0.065,
  vz: 0.55, zg: -0.2, wobble: 0.08, layer: 'world', shadow: 0,
  fade: AMBER, fadeAt: 0.6,
};

/** Annunciation glints — pulsing on their own clocks. */
const SPARK: BurstOpts = {
  shape: 'glint', speed: 0.3, life: 1.2, gravity: 0, size: 0.095,
  z: 0.35, vz: 0.4, zg: -0.15, layer: 'world', shadow: 0, flicker: 0.3,
  fade: GOLD, fadeAt: 0.55,
};

/**
 * The standing shaft — light with a vertical to hold. Audit lesson:
 * a streak's length comes from its VELOCITY, so a slow streak is a
 * sliver; the tall tongue of light is a LICK riding its climb —
 * tapered, breathing, unmistakably a shaft.
 */
const SHAFT: BurstOpts = {
  shape: 'lick', speed: 0.05, life: 1.1, gravity: 0, size: 0.15,
  z: 0.35, vz: 1.3, zg: 0, layer: 'world', shadow: 0,
  fade: GOLD, fadeAt: 0.55, fade2: AMBER, fade2At: 0.85,
};

const BLOOM_POPS: EmitterPop[] = [
  { colors: [WHITE, GOLD], opts: MOTE, weight: 2 },
  { colors: [WHITE, GOLD], opts: SPARK, weight: 1.2 },
];

const HALO_POPS: EmitterPop[] = [
  { colors: [WHITE, GOLD], opts: { ...SPARK, vz: 0.15, z: 0 }, weight: 1.6 },
  { colors: [GOLD, AMBER], opts: { ...MOTE, vz: 0.3 }, weight: 1 },
];

/** The blessing lands: a rising congregation of light. */
const bloom: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(12, k), [WHITE, GOLD], { ...MOTE, size: sOf(0.065, k) });
  ps.burst(x, y, nOf(9, k), [WHITE, GOLD], { ...SPARK, size: sOf(0.095, k) });
  ps.emit({
    x, y, rate: 26 * k, dur: 0.9, attack: 0.05, release: 0.4,
    pops: BLOOM_POPS,
  });
  c.glow?.(x, y, 1.4 * Math.sqrt(k), GLOW_RGB, 0.3);
};

/** Standing shafts — the sky reaching down, judgment or grace. */
const shafts: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 0.5;
  c.glow?.(x, y, r + 0.6, GLOW_RGB, 0.2);
  return c.particles.emit({
    kind: 'disc', x, y, radius: r,
    rate: 26 * k, dur: o.dur ?? 1.6, attack: 0.12, release: 0.4,
    pops: [
      { colors: [WHITE, GOLD], opts: SHAFT, weight: 1.6 },
      { colors: [GOLD], opts: MOTE, weight: 1 },
    ],
  });
};

/** The crown — a revolving ring of light at head height. */
const halo: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  c.glow?.(x, y, 0.9, GLOW_RGB, 0.18);
  return c.particles.emit({
    kind: 'orbit', x, y, z: 0.95, radius: o.radius ?? 0.42, orbitSpeed: 6,
    rate: 30 * k, dur: o.dur ?? 2.0, attack: 0.1, release: 0.4,
    pops: HALO_POPS,
  });
};

/** Gentle fall of light over an area — mercy, not weather. */
const rain: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, z: 1.5, radius: o.radius ?? 1.0,
    rate: 30 * k, dur: o.dur ?? 2.0, attack: 0.2, release: 0.5,
    pops: [{
      colors: [WHITE, GOLD, AMBER],
      opts: {
        shape: 'glint', speed: 0.05, life: 1.4, gravity: 0, size: 0.06,
        vz: -0.5, zg: 0.4, land: 'die', layer: 'world', shadow: 0, flicker: 0.25,
      },
    }],
  });
};

export const radiance: Material = {
  id: 'radiance',
  name: 'Radiance',
  palette: [WHITE, GOLD, AMBER, WARM, EMBER],
  deployments: { bloom, shafts, halo, rain },
};

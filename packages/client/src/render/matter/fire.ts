/**
 * FIRE — the first mastered voice, the standard the rest are held to.
 *
 * The story fire tells: a white-hot heart you can barely look at,
 * tongues that BURN upward through orange into dark red, sparks that
 * scratch the air and die on the dirt, coals that lie where they
 * fall and cool through red to soot, and above it all the gray-
 * violet smoke of everything fire has finished with. Four color
 * bands, three grain sizes, real height — one plume tells the whole
 * combustion story with no gradients and no blur.
 *
 * Physics temperament: buoyant. Licks rise on z with gentle negative
 * z-gravity (hot air accelerates them); sparks fly ballistic and die
 * on landing; coals are the only fire matter heavy enough to settle.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const HEART = '#fff3c4';
const BRIGHT = '#ffe9a3';
const FLAME = '#ffca66';
const EMBER = '#e8823a';
const COAL = '#c9541f';
const DEEP = '#8c3a26';
const SOOT = '#4a4248';
const SMOKE = '#5a5560';

const GLOW_RGB = '255, 170, 80';

/** The burning tongue — fire's body grain, full four-band ramp. */
const LICK: BurstOpts = {
  shape: 'lick', speed: 0.55, life: 1.0, gravity: 0, size: 0.1,
  vz: 0.95, zg: -0.35, layer: 'world', shadow: 0, flicker: 0.3,
  fade: EMBER, fadeAt: 0.42, fade2: DEEP, fade2At: 0.7,
  fade3: SOOT, fade3At: 0.88,
};

/** Spark fines — ballistic scratches that die on the dirt. */
const SPARK: BurstOpts = {
  shape: 'streak', speed: 1.6, life: 0.55, gravity: 0, size: 0.042,
  vz: 2.2, zg: 6.5, land: 'die', layer: 'world', shadow: 0,
  flicker: 0.5, trail: 7, trailColor: DEEP,
};

/** Soot — what fire is finished with. Rises, staggers, disperses. */
const SOOT_PUFF: BurstOpts = {
  shape: 'puff', speed: 0.14, life: 1.8, gravity: 0, size: 0.095,
  vz: 0.65, zg: -0.25, grow: 0.055, wobble: 0.2, layer: 'world',
  shadow: 0, fade: SOOT, fadeAt: 0.5,
};

const PLUME_POPS: EmitterPop[] = [
  { colors: [BRIGHT, FLAME], opts: LICK, weight: 2.2 },
  { colors: [SMOKE, SOOT], opts: SOOT_PUFF, weight: 1 },
  { colors: ['#ffd27a', BRIGHT], opts: SPARK, weight: 0.7 },
];

/** Ring fire burns shorter tongues — a hoop, not a bonfire wall. */
const RING_LICK: BurstOpts = { ...LICK, size: 0.085, vz: 0.75, life: 0.85 };

const RING_POPS: EmitterPop[] = [
  { colors: [BRIGHT, FLAME], opts: RING_LICK, weight: 2.5 },
  { colors: [SMOKE, SOOT], opts: { ...SOOT_PUFF, size: 0.08 }, weight: 1 },
];

/** Ground-crawling flame for burning floors — low, hungry, dense. */
const POOL_LICK: BurstOpts = {
  ...LICK, size: 0.075, speed: 0.3, vz: 0.35, zg: -0.15, life: 0.8,
};

const POOL_POPS: EmitterPop[] = [
  { colors: [FLAME, EMBER], opts: POOL_LICK, weight: 2.5 },
  { colors: [SMOKE], opts: { ...SOOT_PUFF, size: 0.075, vz: 0.5 }, weight: 0.8 },
];

const PATH_POPS: EmitterPop[] = [
  { colors: [BRIGHT, FLAME], opts: RING_LICK, weight: 2.4 },
  { colors: [SMOKE, SOOT], opts: { ...SOOT_PUFF, size: 0.08 }, weight: 1 },
  { colors: ['#ffd27a'], opts: { ...SPARK, vz: 1.6 }, weight: 0.5 },
];

/**
 * The detonation: heart-flash, tongue crown, spark scatter, coal
 * throw, and a self-terminating soot bloom. The one-shot every fire
 * ability's impact beat builds on.
 *
 * ONE-SHOT COHORTS DIE BRIGHT (audit law, 2026-08-01): a burst's
 * grains all age together, so a full four-band ramp puts the WHOLE
 * cohort in its dark band at once — which reads as debris, not
 * flame. Burst tongues run two hot bands and die; the full
 * combustion story belongs to sustained mixed-age populations
 * (plume/ring/pool), where every band is on stage simultaneously.
 */
const burst: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  // The heart: too hot to have color, gone before it can cool.
  ps.burst(x, y, nOf(6, k), [HEART, BRIGHT], {
    shape: 'lick', speed: 2.1, life: 0.22, gravity: 0, size: sOf(0.1, k),
    z: 0.22, layer: 'world', shadow: 0,
  });
  // The crown of tongues — hot bands only, gone before they sadden.
  ps.burst(x, y, nOf(14, k), [HEART, BRIGHT, FLAME], {
    ...LICK, size: sOf(0.1, k), speed: 0.4, life: 0.55,
    fade: EMBER, fadeAt: 0.5, fade2: DEEP, fade2At: 0.85,
    fade3: '', fade3At: 0.92,
  });
  // Sparks scratch out and die on the dirt.
  ps.burst(x, y, nOf(8, k), ['#ffd27a', BRIGHT], { ...SPARK, size: sOf(0.042, k) });
  // Coals: the heroes. They land, lie, and cool through red to soot.
  ps.burst(x, y, nOf(4, k), [EMBER, COAL], {
    speed: 0.9, life: 2.1, gravity: 0, size: sOf(0.055, k),
    vz: 1.8, zg: 7, land: 'settle', layer: 'world', flicker: 0.55,
    fade: DEEP, fadeAt: 0.5, fade2: SOOT, fade2At: 0.85,
  });
  // The aftermath breathes out on its own clock — smaller than the
  // standing plume's smoke, this is one exhale, not a chimney.
  ps.emit({
    x, y, rate: 18 * k, dur: 0.7, attack: 0.05, release: 0.3,
    pops: [{ colors: [SMOKE, SOOT], opts: { ...SOOT_PUFF, size: 0.08, grow: 0.045 } }],
  });
  c.glow?.(x, y, 1.5 * Math.sqrt(k), GLOW_RGB, 0.34);
};

/** A standing burn — campfire, brazier, burning body. */
const plume: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  c.glow?.(x, y, 1.2 * Math.sqrt(k), GLOW_RGB, 0.26);
  return c.particles.emit({
    x, y, rate: 62 * k, dur: o.dur ?? 2.2, attack: 0.12, release: 0.35,
    pops: PLUME_POPS,
  });
};

/** A hoop of flame that WRAPS its center — the world layer at work. */
const ring: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 0.9;
  const ps = c.particles;
  // Ignition: the hoop lights all at once, then the emitter feeds it.
  for (let i = 0; i < nOf(10, k); i++) {
    const a = (i / nOf(10, k)) * Math.PI * 2;
    ps.burst(x + Math.cos(a) * r, y + Math.sin(a) * r, 1, [BRIGHT, FLAME], {
      ...RING_LICK, size: sOf(0.085, k),
    });
  }
  c.glow?.(x, y, r + 0.6, GLOW_RGB, 0.22);
  return ps.emit({
    kind: 'ring', x, y, radius: r,
    rate: 70 * k, dur: o.dur ?? 1.6, attack: 0.05, release: 0.4,
    pops: RING_POPS,
  });
};

/** A burning line — wall of fire, flame trail, ignited fuse. */
const path: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const x2 = o.x2 ?? x + 2;
  const y2 = o.y2 ?? y;
  c.glow?.((x + x2) / 2, (y + y2) / 2, Math.hypot(x2 - x, y2 - y) * 0.6 + 0.5, GLOW_RGB, 0.2);
  return c.particles.emit({
    kind: 'path', x, y, x2, y2,
    rate: 80 * k, dur: o.dur ?? 1.2, attack: 0.06, release: 0.35,
    pops: PATH_POPS,
  });
};

/** Burning ground — low, hungry flame carpeting a disc. */
const pool: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 0.7;
  c.glow?.(x, y, r + 0.5, GLOW_RGB, 0.2);
  return c.particles.emit({
    kind: 'disc', x, y, radius: r,
    rate: 60 * k, dur: o.dur ?? 2.5, attack: 0.1, release: 0.45,
    pops: POOL_POPS,
  });
};

export const fire: Material = {
  id: 'fire',
  name: 'Fire',
  palette: [HEART, FLAME, EMBER, DEEP, SOOT],
  deployments: { burst, plume, ring, path, pool },
};

/**
 * FROST — cold is stillness arriving.
 *
 * The story: frost doesn't billow or race, it CRYSTALLIZES. Shards
 * snap outward tumbling, catch the light as glints, land and lie a
 * moment before steaming off into pale mist — the ramp runs blue-
 * white to mist-gray because dying frost becomes weather. Between
 * the shards hangs the cold itself: slow round motes that sink
 * rather than rise (cold air falls), and the sparkle of ice dust
 * pulsing on its own clocks.
 *
 * Physics temperament: brittle and heavy-aired. Shards are
 * ballistic and settle; mist SINKS with gentle positive z-gravity;
 * nothing here is buoyant.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const CORE = '#eaf6ff';
const PALE = '#b8dcf2';
const ICE = '#7db3d8';
const DEEP = '#4d7fa6';
const MIST = '#cfe0ea';

const GLOW_RGB = '150, 200, 240';

/** The shard — frost's hero grain. Tumbles, lands, lies, steams off. */
const SHARD: BurstOpts = {
  shape: 'shard', speed: 1.3, life: 1.6, gravity: 0, size: 0.085,
  spin: 7, vz: 1.5, zg: 6, land: 'settle', layer: 'world',
  fade: PALE, fadeAt: 0.55, fade2: MIST, fade2At: 0.85,
};

/** Ice-dust glints — the sparkle that makes cold read as crystal. */
const GLINT: BurstOpts = {
  shape: 'glint', speed: 0.35, life: 1.1, gravity: 0, size: 0.075,
  z: 0.25, vz: 0.1, zg: 0.5, land: 'die', layer: 'world', shadow: 0,
  flicker: 0.25,
};

/** The cold itself — mist that SINKS, because cold air falls. */
const COLD_MOTE: BurstOpts = {
  shape: 'mote', speed: 0.14, life: 2.2, gravity: 0, size: 0.08,
  z: 0.35, vz: -0.04, zg: 0.25, land: 'settle', grow: 0.04,
  wobble: 0.1, layer: 'world', shadow: 0, fade: MIST, fadeAt: 0.55,
};

const FOG_POPS: EmitterPop[] = [
  { colors: [MIST, PALE], opts: COLD_MOTE, weight: 2.2 },
  { colors: [CORE, PALE], opts: { ...GLINT, z: 0.15 }, weight: 1 },
];

const LANCE_POPS: EmitterPop[] = [
  { colors: [PALE, ICE], opts: { ...SHARD, speed: 0.5, vz: 0.9 }, weight: 1.8 },
  { colors: [CORE], opts: GLINT, weight: 1.2 },
  { colors: [MIST], opts: { ...COLD_MOTE, size: 0.065 }, weight: 0.8 },
];

/** The nova shatter: shards out, glint veil, cold settling after. */
const shatter: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  // The pane breaks: shard heroes snap outward tumbling.
  ps.burst(x, y, nOf(12, k), [PALE, ICE, DEEP], { ...SHARD, size: sOf(0.085, k) });
  // Crystal dust flashes where it broke.
  ps.burst(x, y, nOf(9, k), [CORE, PALE], { ...GLINT, size: sOf(0.075, k) });
  // The cold arrives after the break and sinks to the floor.
  ps.emit({
    x, y, rate: 26 * k, dur: 1.0, attack: 0.1, release: 0.5,
    pops: [{ colors: [MIST, PALE], opts: COLD_MOTE }],
  });
  c.glow?.(x, y, 1.3 * Math.sqrt(k), GLOW_RGB, 0.22);
};

/** Ground fog with sparkle — a frozen field, a cold-holding floor. */
const fog: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 1.1,
    rate: 44 * k, dur: o.dur ?? 2.6, attack: 0.25, release: 0.7,
    pops: FOG_POPS,
  });
};

/** A freezing line — ice lance wake, frozen rail, cold-drawn border. */
const lance: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const x2 = o.x2 ?? x + 2;
  const y2 = o.y2 ?? y;
  return c.particles.emit({
    kind: 'path', x, y, x2, y2,
    rate: 66 * k, dur: o.dur ?? 1.1, attack: 0.04, release: 0.3,
    pops: LANCE_POPS,
  });
};

/** A slow cold bloom — the quiet nova, frost arriving as weather. */
const bloom: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 0.8;
  c.glow?.(x, y, r + 0.4, GLOW_RGB, 0.16);
  return c.particles.emit({
    kind: 'rim', x, y, radius: Math.max(0.3, r - 0.3), outward: 0.7,
    rate: 60 * k, dur: o.dur ?? 1.4, attack: 0.1, release: 0.5,
    pops: FOG_POPS,
  });
};

export const frost: Material = {
  id: 'frost',
  name: 'Frost',
  palette: [CORE, PALE, ICE, DEEP, MIST],
  deployments: { shatter, fog, lance, bloom },
};

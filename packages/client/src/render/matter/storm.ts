/**
 * STORM — electricity is a decision the air makes suddenly.
 *
 * The story: storm matter never drifts. It STRIKES — the bolt forms
 * whole, hangs one readable beat, and re-forms somewhere else (THE
 * ARC LAW: geometry re-seeds on the strike beat, never per frame).
 * Around the strikes lives the charge: ionized glints popping on
 * their own clocks, hair-thin static scratches, and before a big
 * discharge the air visibly GATHERS — motes converging into the
 * heart on the rim emitter's inward flow.
 *
 * Physics temperament: instantaneous. Nothing ballistic, nothing
 * settling — storm matter exists, snaps, and is gone.
 */

import type { Deployment, Material, MatterCtx, MatterOpts } from './types.js';
import { nOf, sOf } from './types.js';
import type { BurstOpts, EmitterPop } from '../particles.js';

const CORE = '#f2f8ff';
const HOT = '#cfe8ff';
const CHARGE = '#9db8e8';
const HALO = '#6f86c9';
const FADEOUT = '#4d5a8c';

const GLOW_RGB = '160, 190, 255';

/** Ionized glints — the crackle around every discharge. */
const ION: BurstOpts = {
  shape: 'glint', speed: 0.4, life: 0.7, gravity: 0, size: 0.075,
  z: 0.3, layer: 'world', shadow: 0, flicker: 0.5,
  fade: CHARGE, fadeAt: 0.6,
};

/** Static scratches — hair-thin, gone in a blink. */
const STATIC: BurstOpts = {
  shape: 'streak', speed: 1.8, life: 0.34, gravity: 0, size: 0.038,
  z: 0.25, layer: 'world', shadow: 0, flicker: 0.6,
};

/** The gathering charge — air deciding, drawn INTO the heart. */
const GATHER: BurstOpts = {
  shape: 'glint', speed: 1, life: 0.5, gravity: 0, size: 0.055,
  z: 0.2, drag: 0.5, layer: 'world', shadow: 0, flicker: 0.35,
};

const STATIC_POPS: EmitterPop[] = [
  { colors: [HOT, CHARGE], opts: ION, weight: 1.6 },
  { colors: [CORE, HOT], opts: STATIC, weight: 1 },
];

const CHARGE_POPS: EmitterPop[] = [
  { colors: [HOT, CHARGE], opts: GATHER, weight: 2 },
  { colors: [CORE], opts: { ...STATIC, speed: 0.7 }, weight: 0.8 },
];

/**
 * The strike: one main bolt from here to there, impact crackle at
 * the far end, ionization along the channel. `dir`-less — a bolt
 * knows exactly where it's going.
 */
const arc: Deployment = (c: MatterCtx, x: number, y: number, o: MatterOpts = {}) => {
  const k = o.scale ?? 1;
  const x2 = o.x2 ?? x + 1.8;
  const y2 = o.y2 ?? y;
  const ps = c.particles;
  // The bolt itself — re-striking on its own beat while it lives.
  ps.burst(x, y, 1, [CORE], {
    shape: 'bolt', life: 0.55, gravity: 0, size: sOf(0.055, k),
    z: 0.85, x2, y2, z2: 0.1, fade: HALO, boltRate: 9, boltBranch: 0.8,
    flicker: 0.3, layer: 'overlay',
  });
  // Impact crackle where it lands.
  ps.burst(x2, y2, nOf(8, k), [CORE, HOT], { ...STATIC, size: sOf(0.04, k), z: 0.1 });
  ps.burst(x2, y2, nOf(6, k), [HOT, CHARGE], { ...ION, size: sOf(0.07, k), z: 0.12 });
  // Ionization hangs along the channel.
  const mx = (x + x2) / 2;
  const my = (y + y2) / 2;
  ps.burst(mx, my, nOf(3, k), [CHARGE], { ...ION, z: 0.5 });
  c.glow?.(x2, y2, 1.0 * Math.sqrt(k), GLOW_RGB, 0.3);
  c.glow?.(x, y, 0.7 * Math.sqrt(k), GLOW_RGB, 0.22);
};

/**
 * Ground crackle around a point: short bolts snapping to the dirt
 * at staggered beats — each lives on its own strike clock, so the
 * cluster reads sustained without any per-frame authoring.
 */
const crackle: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 0.9;
  const ps = c.particles;
  const n = nOf(4, k);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 1.2;
    ps.burst(x, y, 1, [HOT], {
      shape: 'bolt', life: 0.45 + Math.random() * 0.45, gravity: 0,
      size: sOf(0.045, k), z: 0.55,
      x2: x + Math.cos(a) * r, y2: y + Math.sin(a) * r * 0.7, z2: 0,
      fade: HALO, boltRate: 7 + Math.random() * 4, boltBranch: 0.5,
      flicker: 0.35, layer: 'overlay',
    });
  }
  ps.burst(x, y, nOf(7, k), [CORE, HOT, CHARGE], { ...ION, size: sOf(0.07, k) });
  c.glow?.(x, y, r + 0.3, GLOW_RGB, 0.2);
};

/**
 * The impact — one discharge's worth of crackle at a point: ion
 * glints popping on their own clocks over hair-thin scratches.
 * Every electric arrival reuses this; the bolt itself is the arc's
 * (or a signature's painted) business.
 */
const impact: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const ps = c.particles;
  ps.burst(x, y, nOf(6, k), [CORE, HOT], { ...STATIC, size: sOf(0.04, k), z: 0.12 });
  ps.burst(x, y, nOf(5, k), [HOT, CHARGE], { ...ION, size: sOf(0.07, k), z: 0.15 });
  c.glow?.(x, y, 0.9 * Math.sqrt(k), GLOW_RGB, 0.24);
};

/** The gather — air converging into the heart before the discharge. */
const charge: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  const r = o.radius ?? 1.0;
  c.glow?.(x, y, 0.8, GLOW_RGB, 0.14);
  return c.particles.emit({
    kind: 'rim', x, y, radius: r, outward: -2.2,
    rate: 60 * k, dur: o.dur ?? 0.9, attack: 0.15, release: 0.15,
    pops: CHARGE_POPS,
  });
};

/** Standing static — a charged body, a humming ward, live wire air. */
const staticField: Deployment = (c, x, y, o = {}) => {
  const k = o.scale ?? 1;
  return c.particles.emit({
    kind: 'disc', x, y, radius: o.radius ?? 0.45,
    rate: 30 * k, dur: o.dur ?? 1.8, attack: 0.1, release: 0.4,
    pops: STATIC_POPS,
  });
};

export const storm: Material = {
  id: 'storm',
  name: 'Storm',
  palette: [CORE, HOT, CHARGE, HALO, FADEOUT],
  deployments: { arc, crackle, charge, impact, static: staticField },
};

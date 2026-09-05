/**
 * THE DUALWIELD SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4: THE VOICE). Each voice composes
 * matter-library deployments under ONE VOICE; the contract in
 * breathFx.test.ts holds every breath art to a curated entry here or in
 * the founding table — this table outranks the founding one by id.
 *
 * THE SECOND CADENCE gave the weave rare, QUICK breaths (knife draws of
 * 14–20 ticks) and the loom's 12-tick note. So every charge here is a
 * knife hand's gather — small, close to the body, two of everything
 * (two wicks, two moons, two hands) — and every note is the loom
 * working: matter at the feet and the hands, never a scholar's column.
 * The charge's `radius` contracts 1.5 → 0.5 as the draw completes.
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, dust, fire, frost, radiance, storm } from '../matter/index.js';

/** 0 at the start of the draw, 1 as the wind-up completes. */
const drawn = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const DUALWIELD_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the knife draws
  // Two Bells: THE SECOND CADENCE took its breath — it is a press now.
  // An empty entry outranks the founding table's orphan charge so the
  // contract sees no wind-up voice on an art that no longer winds.
  two_bells: {},

  // Twin Moons: two pale moons rise, one over each hand, and tighten
  // toward the body as the throw is drawn.
  twin_moons: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      const off = 0.42 - k * 0.18;
      radiance.deployments.halo!(c, x - off, y, { radius: 0.3, scale: 1.1 + k * 0.6, dur: 0.7 });
      radiance.deployments.halo!(c, x + off, y, { radius: 0.3, scale: 1.1 + k * 0.6, dur: 0.7 });
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.3, scale: 0.55 + k * 0.4, dur: 0.6 });
    },
  },
  // Matched Flame: two wicks catch, one on each edge, and gobbets
  // sputter off them while the short breath is held.
  matched_flame: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      fire.deployments.plume!(c, x - 0.3, y, { scale: 0.5 + k * 0.4, dur: 0.6 });
      fire.deployments.plume!(c, x + 0.3, y, { scale: 0.5 + k * 0.4, dur: 0.6 });
      fire.deployments.gobbets!(c, x, y, { radius: o.radius * 0.4, scale: 0.6 + k * 0.4, dur: 0.6 });
    },
  },
  // Mirrorfall: the gather before the leap — rime blooms at the feet
  // where the reflection is being made, and a cold mist tightens in.
  mirrorfall: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      frost.deployments.bloom!(c, x, y, { radius: 0.35 + k * 0.2, scale: 0.8 + k * 0.6, dur: 0.7 });
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.5, scale: 0.7, dur: 0.7 });
    },
  },
  // First and Last: the door is found before it is opened — thin
  // shafts of light find the threshold and the halo tightens on it.
  first_and_last: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.5, scale: 0.7 + k * 0.5, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.55, scale: 0.9 + k * 0.7, dur: 0.7 });
    },
  },
  // Storm of Two: the spin-up — the feet turn a skirt of yard grit and
  // the storm crackles on both edges, harder as the spin completes.
  storm_of_two: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.5), scale: 0.8 + k * 0.4, dur: 0.6 });
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.45, scale: 0.8 + k * 0.7, dur: 0.6 });
    },
  },

  // ------------------------------------------------- the loom's notes
  // Ribbonwork: the ribbons trail red off both hands while the crossing
  // holds, and the feet work the loom in the dust.
  ribbonwork: {
    note: (c, x, y, o) => {
      blood.deployments.drip!(c, x - 0.3, y, { radius: 0.2, scale: 1.1, dur: 1.2 });
      blood.deployments.drip!(c, x + 0.3, y, { radius: 0.2, scale: 1.1, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.7, dur: 1.2 });
    },
  },
  // Silver Reel: rime gathers on the spinning circle and a cold fog
  // sits on the ring the turns keep chilled.
  silver_reel: {
    note: (c, x, y, o) => {
      frost.deployments.bloom!(c, x, y, { radius: o.radius * 0.7, scale: 1.1, dur: 1.2 });
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.9, scale: 0.8, dur: 1.2 });
    },
  },
  // Stormstitch: the seam arcs from the left hand to the right while
  // it is sewn — the thread is never off the needle.
  stormstitch: {
    note: (c, x, y, o) => {
      storm.deployments.arc!(c, x - 0.35, y, { x2: x + 0.35, y2: y, radius: o.radius * 0.5, scale: 0.9, dur: 1.2 });
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.4, scale: 0.7, dur: 1.2 });
    },
  },
  // The Weave: the loom works — grit stirs under the turning feet and
  // the threads bleed off both hands for as long as the count holds.
  the_weave: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.6, scale: 0.8, dur: 1.2 });
      blood.deployments.drip!(c, x - 0.3, y, { radius: 0.2, scale: 0.9, dur: 1.2 });
      blood.deployments.drip!(c, x + 0.3, y, { radius: 0.2, scale: 0.9, dur: 1.2 });
    },
  },
  // Hummingbird: the wind of wings too fast to see — a tight skirt at
  // the feet and a pale blur of light where the hands are.
  hummingbird: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.45), scale: 0.9, dur: 1.2 });
      radiance.deployments.halo!(c, x, y, { radius: 0.3, scale: 0.7, dur: 1.0 });
    },
  },
};

/**
 * THE ONEHAND SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE DUELIST'S TEMPO breathes STANCE AND EDGE: a sword's wind is the
 * feet set and the grit pulling in under the plant, the raised edge
 * catching one light at the top of the raise, the heel lifted off a
 * floor that tenses; its held notes are the wheel turning — chaff and
 * red off the sweep, the garden's petals falling round the feet. The
 * founding table keeps the rungs it already voiced (ember_edge,
 * levinstroke, cold_iron, first_light, gloomfall, the five held notes);
 * this file adds the arts the rebuild gave a breath to and outranks
 * the founding table by id. Every gather TIGHTENS with the wire's
 * contracting reach (1.5 → 0.5 as the wind-up completes).
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, dust, frost, radiance, shadow, venom } from '../matter/index.js';

/** 0 at the start of the wind-up, 1 as it completes. */
const done = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const ONEHAND_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the casted gathers
  // Heavy Slam (rung 5, the first word): the blade is RAISED — the grit
  // pulls in tight under the planted feet, and at the top of the raise the
  // edge catches one light overhead that brightens as the blow commits.
  heavy_slam: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.45), scale: 0.4 + k * 0.4, dur: 0.6 });
      if (k > 0.3) radiance.deployments.halo!(c, x, y, { radius: 0.3, scale: 0.2 + k * 0.4, dur: 0.5, z: 1.25 });
    },
  },
  // Stagger Stomp (rung 62): the heel comes UP — the floor under it tenses
  // in a low flat thud that pumps harder as the heel climbs, and the skirt
  // of grit locks in round the standing foot.
  stagger_stomp: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.slam!(c, x, y, { radius: Math.max(0.4, o.radius * 0.5), scale: 0.35 + k * 0.5, dur: 0.6 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.4), scale: 0.3 + k * 0.3, dur: 0.5 });
    },
  },
  // Warlord's Descent (rung 90, the crown): the BANNER is raised — gold
  // blooms up the arm and a halo tightens high over the head as the ring
  // decides where it will land; the heels dig in for the leap.
  warlords_descent: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.5, dur: 0.8 });
      radiance.deployments.halo!(c, x, y, { radius: Math.max(0.3, o.radius * 0.5), scale: 0.3 + k * 0.5, dur: 0.6, z: 1.3 });
      if (k > 0.5) dust.deployments.kick!(c, x, y, { scale: 0.4, dir: Math.PI, dur: 0.4 });
    },
  },
  // Shockwave (the shelf's stagger): the same raised heel as the school's,
  // but the floor answers WIDER — a billow of earth breathes up round the
  // stance and the thud beneath it pumps harder as the heel climbs.
  shockwave: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.4 + k * 0.4, dur: 0.7 });
      if (k > 0.4) dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.3 + k * 0.5, dur: 0.5 });
    },
  },
  // Sundering Chop (the shelf's crack): the committed overhead — the front
  // foot SCORES the lane the crack will take, the seam drawn shorter and
  // harder as the blade comes over, the grit pulling in behind it.
  sundering_chop: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.55, scale: 0.35 + k * 0.5, dur: 0.6 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.4), scale: 0.3 + k * 0.3, dur: 0.6 });
    },
  },
  // Still Air (the shelf's root): the blade is held STILL and the air
  // learns it — cold fog gathers in round the stance and stops moving, the
  // veil thickening exactly as the ring is about to be stopped.
  still_air: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      frost.deployments.fog!(c, x, y, { radius: Math.max(0.4, o.radius * 0.7), scale: 0.35 + k * 0.5, dur: 0.8 });
      if (k > 0.45) frost.deployments.bloom!(c, x, y, { radius: 0.35, scale: 0.25 + k * 0.35, dur: 0.5, z: 0.9 });
    },
  },

  // --------------------------------------------------- the held notes
  // Reaper's Arc: the scythe sweeps at the hip — chaff kicks off every
  // sweep, the heel keeps its skirt, and the tithe drips red off the edge
  // between swings.
  reapers_arc: {
    note: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.1 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.35), scale: 0.3, dur: 1.0 });
      blood.deployments.drip!(c, x, y, { radius: 0.4, scale: 0.4, dur: 1.0, z: 0.8 });
    },
  },
  // Garden Close: the bloom is HELD — venom beads keep welling round the
  // feet while the note holds, and the dark's tendrils reach low through
  // the hedge between petal-falls.
  garden_close: {
    note: (c, x, y, o) => {
      venom.deployments.bead!(c, x, y, { radius: Math.max(0.4, o.radius * 0.6), scale: 0.5, dur: 1.1 });
      shadow.deployments.tendrils!(c, x, y, { radius: Math.max(0.4, o.radius * 0.55), scale: 0.35, dur: 1.0 });
    },
  },
};

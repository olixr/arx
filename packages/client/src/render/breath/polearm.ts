/**
 * THE POLEARM SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE REACH breathes GROUND AND GLINT: a haft's wind is the butt spike
 * set, the heels grinding, the drill-yard grit answering; the held
 * notes are the station — dirt re-driven, cold standing, the far end
 * of the haft patrolled. Only the sky's pin borrows weather and only
 * the banner gathers light. Every gather TIGHTENS with the wire's
 * contracting reach (1.5 → 0.5 as the wind-up completes).
 */
import type { BreathDialect } from '../breathFx.js';
import { dust, frost, radiance, storm } from '../matter/index.js';

/** 0 at the start of the wind-up, 1 as it completes. */
const done = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const POLEARM_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the casted gathers
  // Perfect Thrust: one drawn breath — the whole body agrees on a single
  // line. The skirt of grit pulls in tight around the planted stance and,
  // as the breath completes, the front foot scores the lane the point will
  // take.
  perfect_thrust: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.45), scale: 0.4 + k * 0.45, dur: 0.7 });
      if (k > 0.5) dust.deployments.kick!(c, x, y, { scale: 0.35, dir: 0, dur: 0.4 });
    },
  },
  // Impaling Drive: the corridor is scored before the point takes it —
  // the butt spike drags the lane, harder and shorter as the drive loads.
  impaling_drive: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.5, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.4), scale: 0.3 + k * 0.3, dur: 0.6 });
    },
  },
  // Rampart Breaker: the haft butt is SET and the shoulder loads behind
  // it — flat thuds of dirt off the brace, closing to one hard stamp as the
  // seam is found.
  rampart_breaker: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.5, scale: 0.4 + k * 0.5, dur: 0.7 });
      if (k > 0.6) dust.deployments.kick!(c, x, y, { scale: 0.4, dir: Math.PI, dur: 0.4 });
    },
  },
  // Banner Advance: the rally gathers as LIGHT, not dust — gold blooms up
  // the raised haft and a halo tightens at its head as the line decides to
  // move.
  banner_advance: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.65, scale: 0.4 + k * 0.45, dur: 0.8 });
      radiance.deployments.halo!(c, x, y, { radius: Math.max(0.3, o.radius * 0.5), scale: 0.3 + k * 0.4, dur: 0.6, z: 0.9 });
    },
  },
  // Stormpoint: the point is raised and the sky takes an interest — the
  // school's one borrowed weather converges on the head of the haft,
  // tightening exactly as it commits, crackle riding the shaft at the end.
  stormpoint: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      storm.deployments.charge!(c, x, y, { radius: o.radius, scale: 0.5 + k * 0.5, dur: 0.7 });
      if (k > 0.4) storm.deployments.crackle!(c, x, y, { radius: 0.4, scale: 0.35 + k * 0.3, dur: 0.5, z: 0.8 });
    },
  },
  // The Sundering Lance: couched — the longest wind in the school. The
  // heels dig the road's first yard, the skirt of grit locks tight around
  // the plant, and gold gathers at the couched point as the crown commits.
  sundering_lance: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.7, scale: 0.45 + k * 0.5, dur: 0.8 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.45), scale: 0.35 + k * 0.4, dur: 0.7 });
      if (k > 0.35) radiance.deployments.halo!(c, x, y, { radius: 0.35, scale: 0.25 + k * 0.45, dur: 0.6, z: 0.6 });
    },
  },

  // --------------------------------------------------- the held notes
  // Haft Strike: the butt end beats at the hip — the ground answers each
  // beat with a flat thud and the cold sits low where the knees were.
  haft_strike: {
    note: (c, x, y, o) => {
      dust.deployments.slam!(c, x, y, { radius: Math.max(0.5, o.radius * 0.5), scale: 0.45, dur: 1.0 });
      frost.deployments.fog!(c, x, y, { radius: Math.max(0.6, o.radius * 0.6), scale: 0.3, dur: 1.1 });
    },
  },
  // Flurry of Points: the front foot re-drives on every stab — dirt kicked
  // forward, beat after beat, for as long as the needle works.
  flurry_of_points: {
    note: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.35), scale: 0.3, dur: 1.0 });
    },
  },
  // Serpent's Tongue: the point glints at full reach — small crackling
  // ticks patrolling the far end of the haft between tastes, the heel
  // held in its skirt.
  serpents_tongue: {
    note: (c, x, y, o) => {
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.9, scale: 0.5, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.3), scale: 0.25, dur: 1.0 });
    },
  },
  // Moulinet Guard: the turning haft scours its own ring — a standing
  // skirt of torn ground at exactly the reach it defends, the wheel's
  // wind rolling low.
  moulinet_guard: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius + 0.3, scale: 0.65, dur: 1.2 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.6, scale: 0.25, dur: 1.0 });
    },
  },
  // Hold the Line: the cold stands where the heels are set — lances of
  // winter holding the corridor for as long as the stance does, the brace
  // grinding grit at the feet.
  hold_the_line_polearm: {
    note: (c, x, y, o) => {
      frost.deployments.lance!(c, x, y, { radius: o.radius * 0.85, scale: 0.55, dur: 1.3 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.35), scale: 0.3, dur: 1.0 });
    },
  },
  // Wall of Points is HELD GROUND now (a planted field, no held note): the
  // founding table's note is retired here so the contract sees no orphan.
  wall_of_points: {},
};

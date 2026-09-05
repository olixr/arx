/**
 * THE SHIELD SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE HELD LINE breathes like a wall: every charge PLANTS first (the
 * boots dig in — a dust skirt at the feet that tightens as the wire's
 * radius contracts 1.5 → 0.5), and over the planted feet the art's own
 * matter gathers on the boss: brass light for the bell and the sun, the
 * lifted wall's dust for the door, the sea for the anchor, the cold line
 * for the ground the wall marks. Every note is the wall at work: grit off
 * a turning rim, rime growing along a braced lane, water churned at the
 * mill, the slow dust of the advance, spears of cold standing watch.
 *
 * `k` below is the wind-up's completion (0 at the first window, 1 as the
 * reach closes) — the gather brightens and tightens with it.
 */
import type { BreathDialect } from '../breathFx.js';
import { dust, fire, frost, radiance, storm, water } from '../matter/index.js';

/** The wind-up's completion from the wire's contracting reach (1.5 → 0.5). */
const done = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const SHIELD_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the casted gathers

  // Iron Toll: the boots plant and the boss is drawn back — brass light
  // gathers on it and tightens to the mouth as the bell is about to ring.
  iron_toll: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: 0.35 + o.radius * 0.2, scale: 0.4 + k * 0.2, dur: 0.6 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.55, scale: 0.35 + k * 0.55, dur: 0.7 });
    },
  },
  // Doorfall: the wall is LIFTED — the dust of its footing billows up and
  // the feet brace under the weight as it comes overhead.
  doorfall: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: 0.4, scale: 0.45 + k * 0.25, dur: 0.6 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.45, dur: 0.7 });
    },
  },
  // Sunbrass: noon is CAUGHT on the boss — shafts assemble on it and the
  // brass bloom brightens toward white as the reach closes.
  sunbrass: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.5, scale: 0.35 + k * 0.35, dur: 0.7 });
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.6, dur: 0.7 });
    },
  },
  // Anchorfall: the sea readies to part — water churns at the feet as the
  // anchor crouches, and the dust of the launch gathers under the boots.
  anchorfall: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      water.deployments.churn!(c, x, y, { radius: o.radius * 0.6, scale: 0.45 + k * 0.4, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: 0.35, scale: 0.35 + k * 0.4, dur: 0.6 });
    },
  },
  // The Standing Sun: the standard is raised — thin shafts stand on the
  // planting ground and a small true flame catches at the pole's head.
  standing_sun: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.4, dur: 0.7 });
      fire.deployments.plume!(c, x, y, { scale: 0.3 + k * 0.35, dur: 0.6 });
    },
  },
  // Draw Iron: a breath drawn with iron in it — the yard's dust is pulled
  // in on the intake, and a charge hums on the boss about to be shouted.
  draw_iron: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: 0.5 + o.radius * 0.3, scale: 0.4 + k * 0.3, dur: 0.6 });
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.5, scale: 0.35 + k * 0.4, dur: 0.7 });
    },
  },
  // Hold the Line: the ground is MARKED — a skirt of grit is drawn at the
  // line's own reach and a cold breath lies down along it before it holds.
  hold_the_line: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: 0.6 + o.radius * 0.5, scale: 0.45 + k * 0.3, dur: 0.7 });
      frost.deployments.fog!(c, x, y, { radius: 0.5 + o.radius * 0.4, scale: 0.3 + k * 0.3, dur: 0.8 });
    },
  },
  // Unbroken: the great stand gathers — the boots plant hard, brass light
  // climbs the boss, and a charge hums on the iron until the yard rings.
  unbroken: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: 0.45 + o.radius * 0.25, scale: 0.5 + k * 0.3, dur: 0.6 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.7, scale: 0.45 + k * 0.6, dur: 0.7 });
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.45, scale: 0.3 + k * 0.4, dur: 0.7 });
    },
  },
  // Champion's Wall: the wall no champion carried past you is raised — the
  // brass blooms on it and the yard's dust rises to answer.
  champions_wall: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + k * 0.5, dur: 0.7 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.35 + k * 0.3, dur: 0.7 });
    },
  },

  // --------------------------------------------------- the held notes

  // Grindstone: grit torn off the turning rim pass after pass, and hot
  // curls thrown off it — the stone at work.
  grindstone: {
    note: (c, x, y, o) => {
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.6, scale: 0.55, dur: 1.2 });
      fire.deployments.gobbets!(c, x, y, { radius: o.radius * 0.4, scale: 0.3, dur: 1.0 });
    },
  },
  // Held Gate: rime grows along the braced lane and the cold rails stand
  // at the gate while the line is held.
  held_gate: {
    note: (c, x, y, o) => {
      frost.deployments.bloom!(c, x, y, { radius: o.radius * 0.7, scale: 0.55, dur: 1.2 });
      frost.deployments.lance!(c, x, y, { radius: o.radius * 0.5, scale: 0.35, dur: 1.0 });
    },
  },
  // Millwall: the thrown water churns at the wall's rim and the mill's
  // grit skirts the feet as the wheel turns.
  millwall: {
    note: (c, x, y, o) => {
      water.deployments.churn!(c, x, y, { radius: o.radius * 0.8, scale: 0.55, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: 0.4, scale: 0.35, dur: 0.9 });
    },
  },
  // The Patient Wall: the slow dust of the advance and the grit under the
  // boots that keep every tile they take.
  patient_wall: {
    note: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: 0.4, scale: 0.4, dur: 0.9 });
    },
  },
  // Winterhold: spears of cold stand watch and a low fog keeps the court
  // while the keep is held from behind the boss.
  winterhold: {
    note: (c, x, y, o) => {
      frost.deployments.lance!(c, x, y, { radius: o.radius * 0.8, scale: 0.55, dur: 1.2 });
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.6, scale: 0.35, dur: 1.2 });
    },
  },
};

/**
 * THE TWOHAND SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4: THE VOICE). Each voice composes
 * matter-library deployments under ONE VOICE; the contract in
 * breathFx.test.ts holds every breath art to a curated entry here or
 * in the founding table (this table outranks it by id).
 *
 * THE FALLING WEIGHT winds up FEWER times and HEAVIER (five casted
 * openers and two crowns, 20–36 ticks — the longest in the game), so
 * every charge here is a GATHERING OF WEIGHT: the ground under the
 * caster strains first (a skirt of grit), then something is RAISED
 * (a billow, a halo, a bloom) that thickens as the wire's radius
 * contracts 1.5 → 0.5, and in the last third — radius under 0.8 —
 * the earth already answers (a kick, a small slam) before the blow.
 * Every held note is the grind itself: the seam thudded, the lane
 * shoved, the rim turned — earth spoken on every re-emit.
 *
 * THE VOICE IS ONE EMISSION (the renderer speaks each window ONCE and
 * the next re-emit overlaps its tail), and the in-world proof showed
 * the founding weights swallowed by meadow grass — so every gather
 * here throws HEROES that fly (slam chunks on true height, a rising
 * billow, sparks and halos over the body), never only a floor skirt.
 */
import type { BreathDialect } from '../breathFx.js';
import { dust, fire, frost, radiance, shadow, storm } from '../matter/index.js';

/** How far the wind-up has come: 0 at radius 1.5, 1 at radius 0.5. */
const done = (r: number): number => Math.max(0, Math.min(1, (1.5 - r) / 1.0));

export const TWOHAND_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the casted gathers
  // Fell Timber (28t, stagger): the axe winds all the way back — the
  // stance strains the dirt (chunks jump off the boots), the billow
  // climbs as the tree leans, and in the last third the ground already
  // flinches with a full slam.
  fell_timber: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.45 + k * 0.5, dur: 0.7 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.6, scale: 0.7 + k * 0.6, dur: 0.8 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.4, o.radius * 0.6), scale: 0.8 + k * 0.6, dur: 0.7 });
      if (k > 0.66) dust.deployments.slam!(c, x, y, { radius: 0.6, scale: 0.9, dur: 0.5 });
    },
  },
  // Gravedigger (32t, the grave PULLS): the grave is dug slowly — the
  // dark reaches out of the plot first, the earth is gouged up around
  // the caster and thrown (chunks), and the pull tightens as the reach
  // contracts; a dark bloom stands over the pit in the last third.
  gravedigger: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      shadow.deployments.tendrils!(c, x, y, { radius: o.radius * 0.9, scale: 0.8 + k * 0.7, dur: 0.8 });
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.6, scale: 0.8 + k * 0.6, dur: 0.7 });
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.4 + k * 0.4, dur: 0.6 });
      if (k > 0.66) shadow.deployments.bloom!(c, x, y, { radius: 0.6, scale: 0.8, dur: 0.6 });
    },
  },
  // Skyweight (32t, the sky lifted all the way up): the whole yard's
  // grit is RAISED — chunks thrown up and up, the billow climbing and
  // thickening, and near the top the first stones already drop.
  skyweight: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.6, scale: 0.6 + k * 0.6, dur: 0.7 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.9, scale: 0.9 + k * 0.8, dur: 0.8 });
      if (k > 0.66) dust.deployments.kick!(c, x, y, { radius: 0.5, scale: 1.4, dur: 0.5 });
    },
  },
  // Sunhammer (36t, the heaviest wind-up in the game — you are swinging
  // the noon): a fire ring lights around the stance, a warm halo
  // assembles over the caster and brightens as the noon is raised, and
  // in the last third the ground under the boots pools with heat.
  sunhammer: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      fire.deployments.ring!(c, x, y, { radius: o.radius * 0.6, scale: 0.9 + k * 0.7, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.7, scale: 0.8 + k * 0.8, dur: 0.7 });
      fire.deployments.plume!(c, x, y, { radius: 0.3, scale: 0.4 + k * 0.5, dur: 0.6 });
      if (k > 0.66) fire.deployments.pool!(c, x, y, { radius: 0.5, scale: 0.8, dur: 0.6 });
    },
  },
  // Titan's Verdict (30t, the crown raised slowly, tolls once): the
  // whole yard's dust is drawn up around the raised maul (chunks and a
  // billow), a gold word gathers over it, and the earth already rings
  // once under the caster before the toll.
  titans_verdict: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.5 + k * 0.6, dur: 0.7 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.8, scale: 0.8 + k * 0.8, dur: 0.8 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.5, scale: 0.6 + k * 0.8, dur: 0.6 });
      if (k > 0.66) dust.deployments.slam!(c, x, y, { radius: 0.7, scale: 1.1, dur: 0.5 });
    },
  },
  // Pale Crescent (20t, the moon rises before it falls): the quietest
  // wind-up in the school — cold fogs the feet, and a pale bloom of
  // rime climbs the raised blade and brightens as the moon rises.
  pale_crescent: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.6, scale: 0.8 + k * 0.5, dur: 0.8 });
      frost.deployments.bloom!(c, x, y, { radius: 0.5, scale: 0.8 + k * 0.8, dur: 0.7 });
    },
  },
  // Last Toll (24t, the bell raised before it rings): the storm is
  // INVITED onto the raised bell — charge converges as the reach
  // tightens, arcs jump the stance — while the dirt strains, and in
  // the last third the static already crackles.
  last_toll: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      storm.deployments.charge!(c, x, y, { radius: o.radius, scale: 0.9 + k * 0.8, dur: 0.7 });
      storm.deployments.crackle!(c, x, y, { radius: 0.5, scale: 0.4 + k * 0.5, dur: 0.6 });
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.35 + k * 0.4, dur: 0.6 });
      if (k > 0.66) storm.deployments.crackle!(c, x, y, { radius: 0.7, scale: 1.0, dur: 0.5 });
    },
  },
  // The Standing Stone (24t, the kerb decides to rise): the old ground
  // stirs — earth gouges up where the stone will stand, chunks jump,
  // and the yard's dust breathes up around the caster, thicker as the
  // reach closes.
  standing_stone: {
    charge: (c, x, y, o) => {
      const k = done(o.radius);
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.6, scale: 0.8 + k * 0.7, dur: 0.7 });
      dust.deployments.slam!(c, x, y, { radius: 0.45, scale: 0.4 + k * 0.5, dur: 0.6 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.8 + k * 0.7, dur: 0.8 });
    },
  },
  // Forgefall LOST its breath (THE SECOND CADENCE: the felling already
  // drew it; the hammer is the instant answer). The founding table's
  // charge is retired here so no orphan dialect stands once IN_FLIGHT
  // empties.
  forgefall: {},

  // ------------------------------------------------- the held notes
  // Quarry Work (arc ×3, sunder): the pick thuds into the same seam on
  // every beat — a slam, chunks off it, and the seam's dust rolling.
  quarry_work: {
    note: (c, x, y, o) => {
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.7, scale: 1.0, dur: 1.2 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.5, scale: 0.7, dur: 1.0 });
    },
  },
  // The Wheelbreaker (beam ×3): the ram's dust rolls ahead of it, the
  // lane is gouged under the haft, and the wheel throws chunks on
  // every beat.
  wheelbreaker: {
    note: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.8, scale: 1.0, dur: 1.2 });
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.6, scale: 0.9, dur: 1.0 });
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.6, dur: 0.8 });
    },
  },
  // Ore Song (nova ×4, sunder): the vein sings — chunks ring off the
  // seam and a gold shimmer stands over the planted maul.
  ore_song: {
    note: (c, x, y, o) => {
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.6, scale: 0.8, dur: 1.0 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.5, scale: 0.8, dur: 1.0 });
      radiance.deployments.bloom!(c, x, y, { radius: 0.4, scale: 0.5, dur: 0.8 });
    },
  },
  // The Long Lever (beam ×4): the bar bears down — the ground gouges
  // where it bites, chunks jump, and the stance strains a skirt of grit.
  long_lever: {
    note: (c, x, y, o) => {
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.7, scale: 1.0, dur: 1.2 });
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.7, dur: 0.9 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.4, o.radius * 0.6), scale: 0.9, dur: 1.0 });
    },
  },
  // World's Rim (blast ×4, chill): the cold of the far edge fogs the
  // field it grinds, rime blooms on the line, and the grind's worn
  // grains are thrown off the rim.
  worlds_rim: {
    note: (c, x, y, o) => {
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.8, scale: 1.0, dur: 1.2 });
      frost.deployments.bloom!(c, x, y, { radius: 0.5, scale: 0.7, dur: 1.0 });
      dust.deployments.slam!(c, x, y, { radius: 0.5, scale: 0.6, dur: 0.9 });
    },
  },
  // Whirling Ruin (arc ×6, the full turn): the steel weather — the spin
  // scours a wider ring than the body (a standing skirt of torn ground,
  // chunks flung off it) and a bank of dust rides the turn.
  whirling_ruin: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius + 0.4, scale: 1.5, dur: 1.2 });
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.8, scale: 0.8, dur: 1.0 });
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.8, dur: 1.0 });
    },
  },
};

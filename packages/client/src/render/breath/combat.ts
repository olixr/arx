/**
 * THE COMBAT SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE VETERAN'S ROAD in two instruments. The CHARGE is the stance
 * taken: the yard's grit gathers to the planted feet (dust.skirt, its
 * reach contracting with the wire's radius) and the school's second
 * voice climbs as the wind-up completes — the horn's warm gold for a
 * shout (radiance, the GOLD family's brass), the heel's kick for a
 * run, the old wounds for the scars. The NOTE is the held ground: the
 * drum thuds through the floor, the winter fogs the lane, the storm
 * hums, the watch settles low, the chalk dust sifts off the board.
 * Radius law: the charge's `radius` contracts 1.5 → 0.5 as the wind-up
 * completes, so `(1.5 - r)` is the intensity ramp 0 → 1.
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, dust, frost, radiance, smoke, storm } from '../matter/index.js';

/** The wind-up's completion, 0 → 1, read off the contracting reach. */
const done = (r: number): number => Math.max(0, Math.min(1, (1.5 - r)));

export const COMBAT_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the gathers
  // Measured Blow (18t): the planted stance takes its measure — grit
  // gathers to the feet, and the heel sets harder as the measure is
  // found.
  measured_blow: {
    charge: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.55), scale: 0.5 + done(o.radius) * 0.3, dur: 0.7 });
      if (done(o.radius) > 0.4) dust.deployments.kick!(c, x, y, { radius: 0.3, scale: 0.35, dur: 0.5 });
    },
  },
  // Shoulder Check (10t): the run-up dug in — the heel throws earth
  // backward and a low bank stands up behind the planted foot.
  shoulder_check: {
    charge: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius * 0.5, scale: 0.8 + done(o.radius) * 0.5, dur: 0.6 });
      dust.deployments.billow!(c, x, y, { radius: Math.max(0.3, o.radius * 0.45), scale: 0.55, dur: 0.6 });
    },
  },
  // War Shout (16t): the breath drawn — the yard stills to the feet and
  // the horn's warm brass gathers at the chest, brightening as the
  // lungs fill.
  war_shout: {
    charge: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.45, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.6, scale: 0.4 + done(o.radius) * 0.6, dur: 0.7, z: 0.6 });
    },
  },
  // Break the Line (14t): the wind-up — a low bank of yard dust stands
  // up behind the blow and the grit gathers to the heels.
  break_the_line: {
    charge: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.4 + done(o.radius) * 0.4, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.5), scale: 0.45, dur: 0.7 });
    },
  },
  // Thrown Iron (20t): scrap scuffed up into the throwing hand — the
  // heel kicks the yard and a little brass glint of the bundle climbs
  // as the arm comes back.
  thrown_iron: {
    charge: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius * 0.5, scale: 0.45 + done(o.radius) * 0.4, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: 0.35, scale: 0.25 + done(o.radius) * 0.3, dur: 0.6, z: 0.7 });
    },
  },
  // The Fifth Road (22t): the run gathered — grit to the feet, and the
  // heel digs a longer trench the nearer the road is to being run.
  fifth_road: {
    charge: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.55), scale: 0.5, dur: 0.7 });
      dust.deployments.kick!(c, x, y, { radius: 0.4, scale: 0.4 + done(o.radius) * 0.5, dur: 0.6 });
    },
  },
  // The Gathered Breath (24t): all of it held — the warm gold blooms
  // as the chest fills and the ground he gathers on tightens to him.
  gathered_breath: {
    charge: (c, x, y, o) => {
      radiance.deployments.bloom!(c, x, y, { radius: o.radius * 0.7, scale: 0.45 + done(o.radius) * 0.5, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.5 + done(o.radius) * 0.3, dur: 0.7 });
    },
  },
  // Scarworn (24t): the old wounds open first — spatter at the stance,
  // and a slow drip as the receipts are shown.
  scarworn: {
    charge: (c, x, y, o) => {
      blood.deployments.spatter!(c, x, y, { radius: o.radius * 0.5, scale: 0.45 + done(o.radius) * 0.3, dur: 0.7 });
      blood.deployments.drip!(c, x, y, { radius: 0.3, scale: 0.4, dur: 0.7, z: 0.7 });
    },
  },
  // The Long Fight (16t): he has been here before — the horn's gold
  // stands at the chest and the ground he will keep gathers to him.
  the_long_fight: {
    charge: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.7, scale: 0.45 + done(o.radius) * 0.55, dur: 0.7, z: 0.6 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.65), scale: 0.55, dur: 0.7 });
    },
  },
  // Four Roads (12t): every road at once — shafts of the school's gold
  // stand up around the stance while the grit gathers to the feet.
  four_roads: {
    charge: (c, x, y, o) => {
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.6, scale: 0.7 + done(o.radius) * 0.5, dur: 0.6 });
      radiance.deployments.halo!(c, x, y, { radius: 0.4, scale: 0.3 + done(o.radius) * 0.4, dur: 0.6, z: 0.6 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.55), scale: 0.6, dur: 0.6 });
    },
  },

  // ------------------------------------------------- the held notes
  // Drumbeat: the beat thuds through the floor on the count and the
  // grit shivers at the heels between beats.
  drumbeat: {
    note: (c, x, y, o) => {
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.7, scale: 0.45, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.5), scale: 0.4, dur: 1.2 });
    },
  },
  // Ironbreath: the exhale fogs the lane for as long as it lasts, and
  // the cold blooms at the mouth.
  ironbreath: {
    note: (c, x, y, o) => {
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.2 });
      frost.deployments.bloom!(c, x, y, { radius: 0.35, scale: 0.35, dur: 1.0, z: 0.6 });
    },
  },
  // Old Thunder: the joints hum with the remembered storm — a standing
  // static around the swing, crackle skipping across it.
  old_thunder: {
    note: (c, x, y, o) => {
      storm.deployments.static!(c, x, y, { radius: o.radius * 0.8, scale: 0.55, dur: 1.2 });
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.5, scale: 0.35, dur: 1.0 });
    },
  },
  // The Long Watch: the certainty settles low over the marked ground,
  // the grit stirring at the edge of the stake.
  long_watch: {
    note: (c, x, y, o) => {
      smoke.deployments.creep!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.6), scale: 0.4, dur: 1.2 });
    },
  },
  // Last Lesson: chalk dust sifts off the board between words while
  // the teacher holds the room — a dim board light, never lightning.
  last_lesson: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.3, o.radius * 0.6), scale: 0.65, dur: 1.2 });
      radiance.deployments.halo!(c, x, y, { radius: 0.4, scale: 0.4, dur: 1.2, z: 0.8 });
    },
  },
};

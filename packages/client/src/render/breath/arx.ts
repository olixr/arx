/**
 * THE ARX SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE ELEMENTAL LEDGER's breath is the ASKING: the scholar does not
 * throw an element, they petition it, and the petition shows — the
 * element gathers around the caster in its own material and TIGHTENS
 * as the reach contracts (1.5 → 0.5 while the wind-up completes),
 * then a second, sharper matter arrives past the halfway mark (in-world the
 * probe showed one window at the founding table's weight reads as a few
 * grains beside the figure — every voice here speaks half again louder) (the
 * spark the art will lay: fire ring, static, rime, the door). The
 * held notes are the element being HELD OPEN at the caster while the
 * shape does its work at the mark. Fifteen gathers, ten notes; every
 * entry here outranks the founding table's shorter voice (the Phase 3
 * casts are longer — 20–32 t — and earn the second act).
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, dust, fire, frost, radiance, shadow, smoke, storm, water } from '../matter/index.js';

/** How far the asking has come: 0 at the first breath, 1 at the release. */
const asked = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const ARX_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------ the casted gathers
  // Wickfire: the wick takes — a small true plume climbs the lit hand,
  // and as the long wick burns down a thread of smoke leans off it.
  wickfire: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      fire.deployments.plume!(c, x, y, { scale: 0.52 + k * 0.75, dur: 0.6 });
      if (k > 0.5) smoke.deployments.plume!(c, x, y, { scale: 0.38 + k * 0.3, dur: 0.6, z: 0.8 });
    },
  },
  // Frost Lance: a full second of gathered winter — the cold pools at
  // the feet as fog, then the gathered ice HARDENS: a frost bloom
  // tightening to the spear-point the line will be.
  frost_lance: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      frost.deployments.fog!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.6 + k * 0.45, dur: 0.7 });
      if (k > 0.35) frost.deployments.bloom!(c, x, y, { scale: 0.45 + k * 0.75, dur: 0.6 });
    },
  },
  // Meteor Shard: the sky is far and asked properly — a pall gathers
  // overhead as the stone is called, and near the release a ring of
  // heat tightens on the ground where the caller stands.
  meteor_shard: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      dust.deployments.billow!(c, x, y, { radius: 0.5 + k * 0.4, scale: 0.52 + k * 0.68, dur: 0.8, z: 1.6 });
      if (k > 0.45) fire.deployments.ring!(c, x, y, { radius: Math.max(0.3, o.radius * 0.7), scale: 0.52 + k * 0.6, dur: 0.6 });
    },
  },
  // Windshear: the indraw — loose ground breathes UP around the caster
  // while the whole sky is borrowed, and static rides the gale as the
  // last of it comes in.
  windshear: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.8, scale: 0.6 + k * 0.68, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.6 + k * 0.45, dur: 0.6 });
      if (k > 0.55) storm.deployments.crackle!(c, x, y, { radius: 0.4, scale: 0.45 + k * 0.6, dur: 0.5 });
    },
  },
  // Geyser: the deep takes a long asking — an undertow turns beneath
  // the stance, and as the water agrees the first spray breaks up
  // through the ground at the caller's feet.
  geyser: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      water.deployments.undertow!(c, x, y, { radius: o.radius * 0.6, scale: 0.68 + k * 0.6, dur: 0.7 });
      if (k > 0.5) water.deployments.spray!(c, x, y, { scale: 0.45 + k * 0.6, dur: 0.5 });
    },
  },
  // Hollowcall: a nothing is slow to open — the dark's own doorway
  // grammar at the caller's hand, and past the halfway mark tendrils
  // reach out of it and feel for the yard.
  hollowcall: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      shadow.deployments.door!(c, x, y, { radius: o.radius * 0.6, scale: 0.83 + k * 0.68, dur: 0.8 });
      if (k > 0.5) shadow.deployments.tendrils!(c, x, y, { radius: 0.5 + k * 0.4, scale: 0.6 + k * 0.45, dur: 0.6 });
    },
  },
  // Moonrise: the moon is raised, not thrown — silver gathers as a
  // quiet bloom of kept light, and the chill it brings settles as fog
  // at the raiser's feet before the disc comes up.
  moonrise: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      radiance.deployments.bloom!(c, x, y, { scale: 0.52 + k * 0.68, dur: 0.8 });
      if (k > 0.4) frost.deployments.fog!(c, x, y, { radius: Math.max(0.35, o.radius * 0.7), scale: 0.45 + k * 0.45, dur: 0.7 });
    },
  },
  // Stormcall: the sky is petitioned, not snapped at — the storm's
  // charge draws in around the petitioner, and the answer starts to
  // crackle at the hand as the appointment is granted.
  stormcall: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.8, scale: 0.68 + k * 0.6, dur: 0.7 });
      if (k > 0.5) storm.deployments.crackle!(c, x, y, { radius: 0.35, scale: 0.52 + k * 0.6, dur: 0.5 });
    },
  },
  // Daybreak: the longest breath in the school — dawn assembles around
  // the caster, the halo brightens and tightens, shafts of the coming
  // noon stand up through it, and the ground under the crown catches.
  daybreak: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.68 + k * 0.83, dur: 0.7 });
      if (k > 0.4) radiance.deployments.shafts!(c, x, y, { radius: 0.5, scale: 0.52 + k * 0.6, dur: 0.6 });
      if (k > 0.75) fire.deployments.ring!(c, x, y, { radius: Math.max(0.3, o.radius * 0.8), scale: 0.52 + k * 0.45, dur: 0.5 });
    },
  },

  // ------------------------------------------- the shelf's drawn arts
  // Solar Lance: a DRAWN spear of noon — shafts of light come down on
  // the drawer and the halo narrows to the point the line will leave.
  solar_lance: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      radiance.deployments.shafts!(c, x, y, { radius: 0.5 + k * 0.2, scale: 0.6 + k * 0.6, dur: 0.7 });
      if (k > 0.35) radiance.deployments.halo!(c, x, y, { radius: Math.max(0.3, o.radius * 0.7), scale: 0.52 + k * 0.68, dur: 0.6 });
    },
  },
  // Realm Rend: the legendary, drawn — the charge of every spark draws
  // in, a door of the dark opens at the hand where the seam will start,
  // and static rides the last of the draw.
  realm_rend: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.8, scale: 0.6 + k * 0.68, dur: 0.7 });
      if (k > 0.3) shadow.deployments.door!(c, x, y, { radius: 0.35 + k * 0.2, scale: 0.52 + k * 0.52, dur: 0.7 });
      if (k > 0.6) storm.deployments.crackle!(c, x, y, { radius: 0.4, scale: 0.6 + k * 0.6, dur: 0.5 });
    },
  },
  // Wild Root: the forest is asked to hold — the soil stirs and turns
  // around the caster's feet, then heaves up as the roots find purchase.
  wild_root: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.6), scale: 0.68 + k * 0.52, dur: 0.6 });
      if (k > 0.45) dust.deployments.gouge!(c, x, y, { radius: 0.4 + k * 0.3, scale: 0.6 + k * 0.45, dur: 0.5 });
    },
  },
  // Day Breaks: dawn drawn in a line — a bloom of light fills at the
  // hand and shafts stand up through it as the sun clears the rim.
  day_breaks: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      radiance.deployments.bloom!(c, x, y, { scale: 0.52 + k * 0.75, dur: 0.7 });
      if (k > 0.45) radiance.deployments.shafts!(c, x, y, { radius: 0.45, scale: 0.52 + k * 0.6, dur: 0.6 });
    },
  },
  // Shearwind: the coil winds — grit is dragged into a tightening ring
  // at the feet and the last of the wind kicks up before it lets go.
  shearwind: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.7), scale: 0.75 + k * 0.6, dur: 0.6 });
      if (k > 0.5) dust.deployments.kick!(c, x, y, { radius: 0.5, scale: 0.6 + k * 0.6, dur: 0.5 });
    },
  },
  // Perihelion: the comet's closest pass, drawn — star-fall drifts down
  // around the caller as the visitor nears, and its heat tightens to a
  // ring on the ground just before the pass.
  perihelion: {
    charge: (c, x, y, o) => {
      const k = asked(o.radius);
      radiance.deployments.rain!(c, x, y, { radius: 0.5 + k * 0.4, scale: 0.6 + k * 0.6, dur: 0.8 });
      if (k > 0.5) fire.deployments.ring!(c, x, y, { radius: Math.max(0.3, o.radius * 0.7), scale: 0.52 + k * 0.6, dur: 0.6 });
    },
  },

  // ------------------------------------------------- the held notes
  // Maelstrom: the sea churns underfoot and an undertow turns beneath
  // the churn for as long as the drain is held open.
  maelstrom: {
    note: (c, x, y, o) => {
      water.deployments.churn!(c, x, y, { radius: o.radius, scale: 1.05, dur: 1.2 });
      water.deployments.undertow!(c, x, y, { radius: o.radius * 0.7, scale: 0.6, dur: 1.2 });
    },
  },
  // Rime River: the pour itself — a line of cold leaving the hand for
  // as long as the river is held, and the cold pooling as fog at the
  // source. The one note that IS its shape.
  rime_river: {
    note: (c, x, y, o) => {
      frost.deployments.lance!(c, x, y, { radius: o.radius, scale: 0.83, dur: 1.2 });
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.6, scale: 0.52, dur: 1.2 });
    },
  },
  // Stonerise: the quarry works — the ground near the caller tears and
  // gouges and a skirt of grit shivers off the stance while rows keep
  // answering at the mark.
  stonerise: {
    note: (c, x, y, o) => {
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.7, scale: 0.9, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.6, dur: 1.2 });
    },
  },
  // Anvil Sky: the forge cloud stands over the singer — a low pall at
  // hammer height — and the cloud keeps charging between the falls.
  anvil_sky: {
    note: (c, x, y, o) => {
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.8, scale: 1.12, dur: 1.2 });
      smoke.deployments.veil!(c, x, y, { radius: o.radius * 0.9, scale: 0.6, dur: 1.2, z: 1.5 });
    },
  },
  // Burning Glass: the lens hums — a held halo of narrowed noon on the
  // singer, and the shafts it is gathering standing up through it.
  burning_glass: {
    note: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.75, dur: 1.2 });
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.5, scale: 0.52, dur: 1.2 });
    },
  },
  // Cometfall: the far sky answers — faint star-fall drifts down around
  // the asker, and the static of the visitors' passage crackles at the
  // hand for as long as the asking holds.
  cometfall: {
    note: (c, x, y, o) => {
      radiance.deployments.rain!(c, x, y, { radius: o.radius * 0.8, scale: 0.75, dur: 1.3 });
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.4, scale: 0.45, dur: 1.0 });
    },
  },
  // Winter's Fall: winter is held over the staked patch — the cold
  // pools as fog at the holder's feet and a frost bloom keeps opening
  // in the hand between volleys.
  winters_fall: {
    note: (c, x, y, o) => {
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.8, scale: 0.68, dur: 1.2 });
      frost.deployments.bloom!(c, x, y, { scale: 0.6, dur: 1.0 });
    },
  },
  // Eye of the Storm: the weather walks around the singer — the charge
  // rings the still center, the band's rain falls around it, and the
  // static of the coming thunderclap crackles at the hand.
  eye_of_the_storm: {
    note: (c, x, y, o) => {
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.9, scale: 0.9, dur: 1.2 });
      water.deployments.rain!(c, x, y, { radius: o.radius * 1.1, scale: 0.6, dur: 1.2, z: 1.6 });
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.4, scale: 0.45, dur: 1.0 });
    },
  },
  // Red Thread: the spool winds — the thread's take is drunk in at the
  // hand and what it bleeds drips off the winding. Never glows.
  red_thread: {
    note: (c, x, y, o) => {
      blood.deployments.drink!(c, x, y, { radius: o.radius * 0.8, scale: 0.83, dur: 1.2 });
      blood.deployments.drip!(c, x, y, { scale: 0.52, dur: 1.2 });
    },
  },
  // Vigil: the candle keeps — a held halo of kept light on the keeper,
  // and the mend blooming softly in the hand as the watch goes on.
  vigil: {
    note: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.7, scale: 0.68, dur: 1.2 });
      radiance.deployments.bloom!(c, x, y, { scale: 0.45, dur: 1.0 });
    },
  },
};

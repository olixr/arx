/**
 * THE ARCHERY SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts, rungs and secrets
 * alike (THE MASTERED HAND, Phase 4). Each voice composes matter-library
 * deployments under ONE VOICE; the contract in breathFx.test.ts holds
 * every breath art to a curated entry here or in the founding table.
 *
 * THE PATIENT EYE's breath is the DRAW: planted feet, grit shivering off
 * the stance, and the thing the shaft will carry gathering at the nock
 * as the reach contracts (1.5 → 0.5 while the wind-up completes). The
 * held notes are the string's work: weather at the feet, the sky's
 * darkening overhead, the wing's circuit — never lightning for its own
 * sake. Twelve drawn shots, six held notes.
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, dust, fire, frost, radiance, shadow, smoke, storm } from '../matter/index.js';

/** How far the draw has come: 0 at the first breath, 1 at the loose. */
const drawn = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const ARCHERY_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------------- the drawn shots
  // Kingshot: the planted draw — grit shivers off the stance while the
  // string comes all the way back, and as it settles the king's gold
  // gathers at the nock.
  kingshot: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.5), scale: 0.5 + k * 0.3, dur: 0.7 });
      if (k > 0.4) radiance.deployments.halo!(c, x, y, { radius: 0.3, scale: 0.3 + k * 0.3, dur: 0.6 });
    },
  },
  // Rain of Arrows: the CALL — the sky over the archer darkens as she
  // holds it (a dust pall gathering overhead), the feet planted below.
  rain_of_arrows: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      dust.deployments.billow!(c, x, y, { radius: 0.5 + k * 0.4, scale: 0.35 + k * 0.45, dur: 0.8, z: 1.5 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.45), scale: 0.4, dur: 0.6 });
    },
  },
  // Hawk's Hour: the light comes down first — a thin rain of it over
  // the field, and the hawk's eye tightens to a gold halo at the chest.
  hawks_hour: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      radiance.deployments.rain!(c, x, y, { radius: o.radius * 0.7, scale: 0.7 + k * 0.25, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: 0.25 + (1 - k) * 0.3, scale: 0.7 + k * 0.6, dur: 0.6 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.45), scale: 0.4, dur: 0.6 });
    },
  },
  // Winterflight: the cold is DRAWN IN — rime blooms on the nocked shaft
  // and a low fog gathers at the feet as the draw settles.
  winterflight: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      frost.deployments.bloom!(c, x, y, { radius: 0.45, scale: 0.4 + k * 0.5, dur: 0.7 });
      frost.deployments.fog!(c, x, y, { radius: Math.max(0.4, o.radius * 0.5), scale: 0.35 + k * 0.2, dur: 0.8 });
    },
  },
  // Emberhead: the tips take fire — a fan of small flame off the nocked
  // pair, a thread of smoke climbing off it as the draw settles.
  emberhead: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      fire.deployments.fan!(c, x, y, { radius: o.radius * 0.5, scale: 0.7 + k * 0.4, dur: 0.7 });
      if (k > 0.2) smoke.deployments.plume!(c, x, y, { scale: 0.35 + k * 0.2, dur: 0.6 });
    },
  },
  // Gloamshaft: the last light is drawn in — the dark gathers along the
  // line and tendrils creep up the stance as the reach tightens.
  gloamshaft: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.7, scale: 0.6 + k * 0.4, dur: 0.7 });
      if (k > 0.35) shadow.deployments.tendrils!(c, x, y, { radius: 0.5, scale: 0.35 + k * 0.3, dur: 0.6 });
    },
  },
  // Phantom Flight: the ghost is drawn — a pale smoke stands on the
  // nocked shaft, and as the draw completes the ghost remembers it
  // comes home red: a bead of blood at the nock.
  phantom_flight: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      smoke.deployments.veil!(c, x, y, { radius: 0.35 + (1 - k) * 0.3, scale: 0.55 + k * 0.3, dur: 0.7 });
      if (k > 0.6) blood.deployments.drip!(c, x, y, { scale: 0.35, dur: 0.5 });
    },
  },
  // Zenith: noon assembles overhead — shafts of light find the stance,
  // the halo tightens, and the point catches fire as the loose nears.
  zenith: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.6, scale: 0.7 + k * 0.4, dur: 0.7 });
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.7, scale: 0.7 + k * 0.5, dur: 0.7 });
      if (k > 0.55) fire.deployments.plume!(c, x, y, { scale: 0.3 + k * 0.25, dur: 0.6 });
    },
  },
  // Arrow Tempest: the whole storm is drawn — charge converges on the
  // nocked five, grit shivers off the stance under it.
  arrow_tempest: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      storm.deployments.charge!(c, x, y, { radius: o.radius, scale: 0.8 + k * 0.5, dur: 0.7 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.5), scale: 0.45, dur: 0.6 });
    },
  },
  // Windsong: the bow is drawn until it sings — wind rolls off the
  // stance and the string's hum crackles at the nock as the note rises.
  windsong: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      dust.deployments.billow!(c, x, y, { radius: Math.max(0.4, o.radius * 0.55), scale: 0.4 + k * 0.3, dur: 0.7 });
      storm.deployments.crackle!(c, x, y, { radius: 0.35, scale: 0.3 + k * 0.4, dur: 0.6 });
    },
  },
  // Skyrend: the railshot is drawn — static stands on the ground under
  // the stance and the charge converges on the shaft as the line is
  // chosen.
  skyrend: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      storm.deployments.static!(c, x, y, { radius: 0.5, scale: 0.6 + k * 0.3, dur: 0.7 });
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.9, scale: 0.7 + k * 0.5, dur: 0.7 });
    },
  },
  // The Full Draw: past the ear — the planted feet drive in (a kick of
  // earth) and the skirt of grit pulls close as the longest string on
  // the shelf comes back.
  full_draw: {
    charge: (c, x, y, o) => {
      const k = drawn(o.radius);
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.55), scale: 0.55 + k * 0.35, dur: 0.7 });
      if (k > 0.5) dust.deployments.kick!(c, x, y, { radius: 0.4, scale: 0.45, dur: 0.5 });
    },
  },

  // -------------------------------------------------- the held notes
  // Stringsong: the string hums — crackle ticking the bow's reach and
  // grit shivering off the planted feet for as long as the note holds.
  stringsong: {
    note: (c, x, y, o) => {
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.7, scale: 0.55, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.45), scale: 0.35, dur: 1.0 });
    },
  },
  // Skyloom: the shuttle flies — wind at the feet and static standing
  // on the ground where the thread is anchored.
  skyloom: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.2 });
      storm.deployments.static!(c, x, y, { radius: o.radius * 0.5, scale: 0.4, dur: 1.2 });
    },
  },
  // Harrier: the wing's circuit — a halo of light circling the archer
  // at the reach the wing flies, wind at the feet beneath it.
  harrier: {
    note: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.7, dur: 1.2 });
      dust.deployments.skirt!(c, x, y, { radius: Math.max(0.35, o.radius * 0.5), scale: 0.35, dur: 1.0 });
    },
  },
  // Storm of Shafts: the sky is kept black — a pall churning overhead
  // and wind gusting at the planted feet; the archer's note is weather.
  storm_of_shafts: {
    note: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.8, dur: 1.2, z: 1.5 });
      dust.deployments.kick!(c, x, y, { radius: o.radius, scale: 0.7, dur: 1.2 });
    },
  },
  // Crowsong: the flock's shadow reaches the field before they do —
  // tendrils creeping the floor under a standing veil of the murder.
  crowsong: {
    note: (c, x, y, o) => {
      shadow.deployments.tendrils!(c, x, y, { radius: o.radius * 0.8, scale: 0.75, dur: 1.2 });
      shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 1.2 });
    },
  },
  // Starfall Arrows: points of light leave the string on every beat —
  // a thin rain of radiance falls around the archer and the halo holds.
  starfall_arrows: {
    note: (c, x, y, o) => {
      radiance.deployments.rain!(c, x, y, { radius: o.radius * 0.8, scale: 0.7, dur: 1.2 });
      radiance.deployments.halo!(c, x, y, { radius: 0.35, scale: 0.55, dur: 1.2 });
    },
  },
};

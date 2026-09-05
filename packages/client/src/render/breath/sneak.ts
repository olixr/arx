/**
 * THE SNEAK SCHOOL'S BREATH — the charge (wind-up) and note (held
 * hum) dialects of its casted and channeled arts (THE MASTERED HAND,
 * Phase 4: THE VOICE). Each voice composes matter-library deployments
 * under ONE VOICE; the contract in breathFx.test.ts holds every breath
 * art to a curated entry here or in the founding table (this table
 * outranks it by id).
 *
 * The school's breath grammar: a knife does not GATHER, it WEEPS. The
 * casted gathers are a blade that beads (blood or venom) while the
 * reach tightens; the held notes are the taking — the drink, the
 * steady drop, the veil the work is done under. `radius` on a charge
 * contracts 1.5 → 0.5 as the wind-up completes: the bead fattens and
 * the pull tightens exactly as the dodge window closes.
 */
import type { BreathDialect } from '../breathFx.js';
import { blood, frost, shadow, smoke, venom } from '../matter/index.js';

/** How far a wind-up has come: 0 at the first frame, 1 at release. */
const done = (radius: number): number => Math.max(0, Math.min(1, (1.5 - radius) / 1.0));

export const SNEAK_BREATH: Record<string, BreathDialect> = {
  // ------------------------------------------- the casted gathers
  // Opened Vein: the artery is FOUND before it is opened — the blade
  // weeps, and as the reach tightens a pulse of spray breaks off the
  // held point (the vein under the skin already answering the steel).
  opened_vein: {
    charge: (c, x, y, o) => {
      const t = done(o.radius);
      blood.deployments.drip!(c, x, y, { scale: 0.8 + t * 0.6, dur: 0.7 });
      blood.deployments.spatter!(c, x, y, { radius: 0.25 + t * 0.1, scale: 0.35 + t * 0.3 });
      if (t > 0.45) blood.deployments.spray!(c, x, y, { scale: 0.5 + t * 0.4, dir: 0 });
    },
  },
  // Nightshade Kiss: venom beads at the dart's tip as the breath holds
  // — one deliberate drop released from a height that LOWERS as the
  // arm comes down to throw, and the point sweats.
  nightshade_kiss: {
    charge: (c, x, y, o) => {
      const t = done(o.radius);
      venom.deployments.bead!(c, x, y, { scale: 0.9 + t * 0.7, z: 0.75 - t * 0.3 });
      venom.deployments.drip!(c, x, y, { scale: 0.6 + t * 0.4, dur: 0.7 });
      venom.deployments.cloud!(c, x, y, { radius: 0.35 + t * 0.15, scale: 0.3 + t * 0.25, dur: 0.7 });
    },
  },
  // Redwork: the slow inhale — the room's blood is DRAWN toward the
  // caster while the breath is held, the ring tightening with the
  // reach, so the bloom that follows reads as the exhale.
  redwork: {
    charge: (c, x, y, o) => {
      const t = done(o.radius);
      blood.deployments.drink!(c, x, y, { radius: Math.max(0.5, o.radius * 0.85), scale: 0.9 + t * 0.7, dur: 0.7 });
      blood.deployments.spatter!(c, x, y, { radius: 0.4, scale: 0.4 + t * 0.4 });
    },
  },
  // Widow's Draw: three needles dealt — three beads sweat off the fan
  // at once, the hand tightening as it draws, and the steeped edge
  // drips between them.
  widows_draw: {
    charge: (c, x, y, o) => {
      const t = done(o.radius);
      const spread = 0.32 - t * 0.14;
      venom.deployments.bead!(c, x - spread, y + 0.05, { scale: 0.8 + t * 0.5, z: 0.6 });
      venom.deployments.bead!(c, x, y - 0.05, { scale: 0.9 + t * 0.6, z: 0.7 });
      venom.deployments.bead!(c, x + spread, y + 0.05, { scale: 0.8 + t * 0.5, z: 0.6 });
      venom.deployments.drip!(c, x, y, { radius: spread, scale: 0.7, dur: 0.7 });
    },
  },
  // Lights Out: the wick is being PINCHED — the dark blooms where the
  // light was and the cold comes in under it, both tightening on the
  // caster as the reach closes toward the throw.
  lights_out: {
    charge: (c, x, y, o) => {
      const t = done(o.radius);
      shadow.deployments.bloom!(c, x, y, { radius: o.radius * 0.7, scale: 0.9 + t * 0.7, dur: 0.7 });
      shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.5, scale: 0.5 + t * 0.3, dur: 0.7 });
      frost.deployments.fog!(c, x, y, { radius: Math.max(0.4, o.radius * 0.5), scale: 0.5 + t * 0.3, dur: 0.7 });
    },
  },

  // ------------------------------------------- the held notes
  // Threadwork: the quiet work under its veil — the needle's thread
  // pulls red behind it, drop by drop, while the dark hides the hands.
  threadwork: {
    note: (c, x, y, o) => {
      shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.6, scale: 0.8, dur: 1.2 });
      blood.deployments.drip!(c, x, y, { scale: 0.8, dur: 1.1 });
      blood.deployments.spatter!(c, x, y, { radius: 0.3, scale: 0.35 });
    },
  },
  // The Quiet Knife: hush creeping the corridor floor while the line
  // is held, and the edge that lays it sweating venom.
  quiet_knife: {
    note: (c, x, y, o) => {
      smoke.deployments.creep!(c, x, y, { radius: o.radius * 0.8, scale: 0.9, dur: 1.2 });
      venom.deployments.drip!(c, x, y, { scale: 0.8, dur: 1.1 });
      venom.deployments.cloud!(c, x, y, { radius: 0.4, scale: 0.4, dur: 1.1 });
    },
  },
  // Gallows Thread: the drop opens under the held knot and the rope
  // sweats venom — the noose is a wet thing while it is held.
  gallows_thread: {
    note: (c, x, y, o) => {
      shadow.deployments.door!(c, x, y, { radius: o.radius * 0.6, scale: 0.9, dur: 1.2 });
      venom.deployments.drip!(c, x, y, { radius: 0.25, scale: 0.7, dur: 1.1 });
      venom.deployments.bead!(c, x, y, { scale: 0.7, z: 0.65 });
    },
  },
  // Bloodletting: the steady taking — blood flows the WRONG way into
  // the surgeon on a tight ring, and the counted drops fall between.
  bloodletting: {
    note: (c, x, y, o) => {
      blood.deployments.drink!(c, x, y, { radius: Math.max(0.6, o.radius * 0.7), scale: 1.0, dur: 1.1 });
      blood.deployments.drip!(c, x, y, { scale: 0.8, dur: 1.1 });
      blood.deployments.spatter!(c, x, y, { radius: 0.3, scale: 0.35 });
    },
  },
  // The Red Hour: the hour drinks the whole room for as long as it is
  // held — a wide ring flowing inward — and the room's blood is
  // lobbed back out on every breath between beats.
  red_hour: {
    note: (c, x, y, o) => {
      blood.deployments.drink!(c, x, y, { radius: o.radius * 0.9, scale: 1.1, dur: 1.2 });
      blood.deployments.spatter!(c, x, y, { radius: Math.max(0.5, o.radius * 0.7), scale: 0.6 });
      blood.deployments.drip!(c, x, y, { radius: 0.3, scale: 0.6, dur: 1.1 });
    },
  },
};

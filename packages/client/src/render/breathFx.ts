/**
 * THE BREATH SPEAKS — the charge and held-note matter dialects.
 *
 * THE DRAWN BREATH gave arts two commitment grammars: the casted
 * wind-up (run while it draws, plant to quicken it) and the held
 * channel (still, or silent). This registry gives each grammar its
 * MATTER voice, composed from the mastered library per THE ONE-VOICE
 * LAW — no dialect hand-mixes a material the library owns.
 *
 * The wire carries two fx kinds (additive, `messages.ts`):
 *  - `charge`: matter gathering on a winding caster. The server
 *    re-emits it at the LIVE position on an overlapping window (the
 *    tame re-emit law), so a running caster trails the gather; the
 *    wire's contracting `radius` IS the intensity ramp — the reach
 *    tightens exactly as the dodge window closes.
 *  - `note`: a held channel's sustained hum, re-emitted between
 *    pulse beats so long notes never gutter (THE GATE RETIRES: the
 *    library emitter is the one voice; nothing else wisps).
 *
 * Each emission window spawns its deployment ONCE (the renderer's
 * spawn-once flag); the deployment's own attack/sustain/release
 * carries the window, and the next re-emit overlaps the tail.
 *
 * CURATED VOICES: every shipped breath art speaks a hand-picked
 * dialect below, grammar first — the vigil's candle blooms, it does
 * not burn; the archer's note is wind at the feet, never lightning.
 * Unknown breath arts (future waves) fall back to a material derived
 * from their FX face's debris family, so a new casted art is never
 * voiceless while it waits for its curated entry.
 */
import type { DebrisKind, FxStyle } from './abilityFx.js';
import {
  blood,
  dust,
  fire,
  frost,
  radiance,
  shadow,
  storm,
  venom,
  water,
  type MatterCtx,
} from './matter/index.js';

type Voice = (c: MatterCtx, x: number, y: number, o: { radius: number }) => void;

interface BreathDialect {
  /** The winding gather — `radius` is the wire's contracting reach. */
  charge?: Voice;
  /** The held hum — one overlapping window per re-emit. */
  note?: Voice;
}

/** The curated table: one voice per shipped breath art. */
export const BREATH_DIALECTS: Record<string, BreathDialect> = {
  // ------------------------------------------- the casted gathers
  // Daybreak: dawn assembles around the caster — the halo brightens
  // and tightens as the reach contracts toward the fire.
  daybreak: {
    charge: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, {
        radius: o.radius * 0.8,
        scale: 0.45 + (1.5 - o.radius) * 0.55,
        dur: 0.7,
      });
    },
  },
  // The Full Draw: planted strain — a low skirt of grit shivers off
  // the archer's stance and pulls close as the string comes back.
  full_draw: {
    charge: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, {
        radius: Math.max(0.35, o.radius * 0.55),
        scale: 0.55,
        dur: 0.7,
      });
    },
  },
  // The Standing Stone: the old ground stirs — earth breathes up
  // around the caster while the kerb decides to rise.
  standing_stone: {
    charge: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, {
        radius: o.radius * 0.7,
        scale: 0.45 + (1.5 - o.radius) * 0.4,
        dur: 0.7,
      });
    },
  },

  // -------------------------------------------- the held notes
  // Maelstrom: the sea churns underfoot for as long as the vortex
  // is held open.
  maelstrom: {
    note: (c, x, y, o) => {
      water.deployments.churn!(c, x, y, { radius: o.radius, scale: 0.7, dur: 1.2 });
    },
  },
  // Storm of Shafts: wind gusts at the planted feet — the sky's work
  // shows at the mark; the archer's note is weather, not lightning.
  storm_of_shafts: {
    note: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.2 });
    },
  },
  // Whirling Ruin: the spin scours a wider ring than the body — a
  // standing skirt of torn ground.
  whirling_ruin: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius + 0.4, scale: 0.8, dur: 1.2 });
    },
  },
  // Winter's Fall: cold pools at the caster while the sky delivers —
  // true frost fog, sinking, patient.
  winters_fall: {
    note: (c, x, y, o) => {
      frost.deployments.fog!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.3 });
    },
  },
  // Red Thread: the drink — matter streams INTO the spinner on the
  // rim's inward flow for as long as the thread winds.
  red_thread: {
    note: (c, x, y, o) => {
      blood.deployments.drink!(c, x, y, { radius: o.radius + 0.3, scale: 0.8, dur: 1.2 });
    },
  },
  // Vigil: the candle blooms once per window — a quiet pulse of kept
  // light. It mends; it does not burn.
  vigil: {
    note: (c, x, y) => {
      radiance.deployments.bloom!(c, x, y, { scale: 0.35 });
    },
  },
  // Kept Ground: the warded ring hums with standing static — the
  // doorwarden's line, charged and held.
  kept_ground: {
    note: (c, x, y, o) => {
      storm.deployments.static!(c, x, y, { radius: o.radius, scale: 0.5, dur: 1.3 });
    },
  },
};

/**
 * The face-derived fallback: an unknown breath art borrows the idle
 * voice of its debris family's material, at a modest scale. One verb
 * per material, chosen once — the fallback never surprises.
 */
const FALLBACK: Record<DebrisKind, Voice> = {
  ember: (c, x, y) => fire.deployments.plume!(c, x, y, { scale: 0.4, dur: 0.8 }),
  ice: (c, x, y, o) => frost.deployments.fog!(c, x, y, { radius: o.radius, scale: 0.5, dur: 1.0 }),
  spark: (c, x, y, o) =>
    storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 0.9 }),
  star: (c, x, y, o) =>
    radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.5, dur: 0.9 }),
  shadow: (c, x, y, o) =>
    shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.0 }),
  blood: (c, x, y) => blood.deployments.drip!(c, x, y, { scale: 0.5, dur: 1.0 }),
  leaf: (c, x, y, o) =>
    venom.deployments.cloud!(c, x, y, { radius: o.radius * 0.6, scale: 0.4, dur: 1.0 }),
  rock: (c, x, y, o) =>
    dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 0.9 }),
  bone: (c, x, y, o) =>
    dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.4, dur: 0.9 }),
};

/** One door for the renderer: resolve the dialect and speak it. */
export function speakBreath(
  kind: 'charge' | 'note',
  id: string | undefined,
  st: FxStyle,
  c: MatterCtx,
  x: number,
  y: number,
  radius: number,
): void {
  const voice = (id ? BREATH_DIALECTS[id]?.[kind] : undefined) ?? FALLBACK[st.debris];
  voice(c, x, y, { radius });
}

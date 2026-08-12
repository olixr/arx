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
import type { FxStyle } from './abilityFx.js';
import { type MatterCtx } from './matter/index.js';
type Voice = (c: MatterCtx, x: number, y: number, o: {
    radius: number;
}) => void;
interface BreathDialect {
    /** The winding gather — `radius` is the wire's contracting reach. */
    charge?: Voice;
    /** The held hum — one overlapping window per re-emit. */
    note?: Voice;
}
/** The curated table: one voice per shipped breath art. */
export declare const BREATH_DIALECTS: Record<string, BreathDialect>;
/** One door for the renderer: resolve the dialect and speak it. */
export declare function speakBreath(kind: 'charge' | 'note', id: string | undefined, st: FxStyle, c: MatterCtx, x: number, y: number, radius: number): void;
export {};
//# sourceMappingURL=breathFx.d.ts.map
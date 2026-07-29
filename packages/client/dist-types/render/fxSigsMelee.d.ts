/**
 * THE SIGNATURE LAW — the melee wave.
 *
 * Twelve bespoke set-pieces for the warrior roster, composed on top
 * of the v3 grammar in the renderer's three strata. Same binding laws
 * as fxSignatures.ts: hard edges, save/restore hygiene, squash on the
 * ground, srand-deterministic geometry, frameDt-gated emission, ≤60
 * path ops per hook per frame. The signature must SAY the mechanic —
 * a knockback plows, an execute lodges, a stun makes the floor ring.
 * No centerpiece here repeats another's, nor any exemplar's.
 */
import type { AbilitySig } from './fxSignatures.js';
/**
 * The melee wave of THE SIGNATURE LAW — merged into the master
 * registry by the integrator. Keys are ability ids.
 */
export declare const MELEE_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsMelee.d.ts.map
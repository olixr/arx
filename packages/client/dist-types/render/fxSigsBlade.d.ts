/**
 * THE SIGNATURE LAW — the blade wave.
 *
 * Thirteen bespoke set-pieces for the sword-art roster, composed on
 * top of the v3 grammar in the renderer's three strata. Same binding
 * laws as fxSignatures.ts: hard edges, save/restore hygiene, squash
 * on the ground, srand-deterministic geometry, frameDt-gated emission,
 * ≤60 path ops per hook per frame. The signature must SAY the
 * mechanic — a stagger splits, a bleed leaves barbs, an oath cinches.
 * No centerpiece here repeats another's, nor any other file's.
 *
 * Wire kinds served: the arc arts read c.dir; Riptide rides 'dash'
 * (heart = departure, far end = arrival); Storm Brand rides 'bolt'
 * (far end = the strike point, one fx per hop); Quicksilver's flurry
 * arrives as three 'arc' beats, so its signature is one beat's worth;
 * Starfall lands as 'blast' after its telegraph; the vow is a 'buff'.
 * Every hook stays graceful for any kind — far-end fields collapse
 * to the heart when a cast carries no second point.
 */
import type { AbilitySig } from './fxSignatures.js';
export declare const BLADE_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsBlade.d.ts.map
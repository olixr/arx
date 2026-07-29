/**
 * THE SIGNATURE LAW — the ARCHERY wave.
 *
 * Twelve bespoke set-pieces for the bow arts. The school's identity
 * is the ARROW ITSELF: flight lines you can read, fletching you can
 * count, shafts left standing in the earth. An archery impact is
 * never a pop — it is a THUNK with a feathered tail, and what the
 * world remembers is wood and vane, not light.
 *
 * Kind map (how the wire feeds these hooks): fan/projectile impacts
 * arrive as small-radius 'blast's; ground arts telegraph first (the
 * registry skips it) then 'blast'; storm_of_shafts lives as a long
 * 'field'; tumble_shot rides a 'dash' whose far end is the arrival;
 * snare_shot plants as a 'summon'; ricochet writes one 'bolt' per
 * hop, heart→far-end. Every hook stays graceful for any kind.
 *
 * All authoring laws of fxSignatures.ts bind here: hard edges,
 * save/restore hygiene, squash on ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤~60 path ops per hook.
 */
import type { AbilitySig } from './fxSignatures.js';
/**
 * The archery wave of THE SIGNATURE LAW — merged into the master
 * SIGNATURES table by the integrating lead.
 */
export declare const ARCHERY_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsArchery.d.ts.map
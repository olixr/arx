/**
 * THE SIGNATURE LAW — the ARCHER weapon-art wave.
 *
 * Twelve bespoke set-pieces for the signature bows' Arts. Where the
 * archery technique ladder (fxSigsArchery.ts) speaks in wood and
 * fletching, this roster speaks in what each named bow DOES to the
 * world: a butcher's wake, a gull's bank, a hedge sown from a seed,
 * a note that passes through, winter locking shut, a sky torn open.
 * No standing shafts, no fletch-fans — those words are taken.
 *
 * Kind map (how the wire feeds these hooks): the fans and single
 * shots arrive as small-radius 'blast's per impact; verdant_burst
 * telegraphs (the registry skips it) then 'blast's; hoarfrost is a
 * 'nova'; cinder_rain lives as a long 'field'; skyrend rides a
 * 'beam' whose far end is the wall the ray died on. Every hook
 * stays graceful for any kind.
 *
 * All authoring laws of fxSignatures.ts bind here: hard edges,
 * save/restore hygiene, squash on ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤~60 path ops per hook.
 *
 * FX v5 wave 3c: dust, blood, frost, and fire route through the
 * MATTER LIBRARY (ONE-VOICE LAW); cinder_rain fires the library's
 * new fire.rain volley on its own strike beats. Seven stay lawfully
 * bespoke — wind, sound, sap, ghost, gold, star-stuff, and thunder
 * own no material.
 */
import type { AbilitySig } from './fxSignatures.js';
/**
 * The archer weapon-art wave of THE SIGNATURE LAW — merged into the
 * master SIGNATURES table by the integrating lead.
 */
export declare const ARCHER_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsArcher.d.ts.map
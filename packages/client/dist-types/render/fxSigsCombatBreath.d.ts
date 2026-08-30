/**
 * THE SECOND BREATH SPEAKS — the combat wave.
 *
 * Ten set-pieces for the veteran's between-rung breath arts, five
 * casted and five channeled. Same binding laws as every wave (hard
 * edges, save/restore hygiene, squash on ground y-radii, srand
 * geometry with frameDt-gated emission, ≤ ~60 path ops per hook per
 * frame), and the school doctrine on top:
 *
 *  ROAD-WORN GRIT. Combat's breath arts are dust, iron, and the
 *  veteran's economy — nothing ornamental, everything paid for. The
 *  strike is plain and the aftermath is honest: junk lies where it
 *  fell, roads stay rutted, chalk stays on the slate. Iron shards,
 *  chalk, and copper glints are the school's own unowned matter;
 *  dust, storm, water, blood, and frost speak only through the
 *  matter library (ONE-VOICE LAW).
 *
 * Channel signatures are ONE BEAT'S WORTH: the server re-broadcasts
 * the wire per beat with a fresh seed, so geometry that must hold
 * still or accumulate derives from POSITION, never the beat's seed —
 * and cross-beat growth lives in laid grains, because the world
 * keeps what landed.
 *
 * No signature here shares a centerpiece with any other, in this
 * file or any other wave — loose_iron owns the camp-iron wounds, so
 * thrown_iron's bundle is the junk that ARRIVES and LIES; stormcall
 * owns the sky, so old_thunder's bolt never gets off the ground.
 */
import type { AbilitySig } from './fxSignatures.js';
export declare const COMBAT_BREATH_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsCombatBreath.d.ts.map
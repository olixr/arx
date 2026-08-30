/**
 * THE SIGNATURE LAW — the wall's voice.
 *
 * Eleven bespoke set-pieces for the shield school plus the block law's
 * own rim spark, rebuilt to the breath-wave bar: real masonry with
 * side faces and foreshortened top planes, forged iron with heat in
 * it, ceremonies that build something and strike moments that land
 * like doors. Same binding laws as fxSignatures.ts: hard edges,
 * save/restore hygiene, squash on the ground, srand-deterministic
 * geometry, frameDt-gated emission, ≤60 path ops per hook per frame.
 *
 * The school's grammar is MASONRY AND IRON: laid courses, drawn
 * lines, flat planes with honest thickness — nothing here billows;
 * walls do not billow. The one library voice is set_the_wall's mortar
 * grit (small on purpose). rampart_break's stone keeps its dry v5
 * loft-land-hop physics without joining the library.
 *
 * WIRE-LIFETIME LAW: 'buff' fx live a FIXED 750ms — set_the_wall,
 * shield_roof, turned_blow, and unbroken are ONE-CEREMONY rites.
 * hold_the_line rides a real ticks-based 'field' wire and may hold.
 * wheel_of_iron speaks at its WOUND ('blast', no dir). shield_block's
 * 'block' wire lives 380ms and scales its radius by damage blocked.
 * champions_wall's pulse index reads off bornAt (c.now - c.age).
 */
import type { AbilitySig } from './fxSignatures.js';
export declare const SHIELD_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsShield.d.ts.map
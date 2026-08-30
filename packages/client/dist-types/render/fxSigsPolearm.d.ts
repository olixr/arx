/**
 * THE SIGNATURE LAW — the long steel's voice.
 *
 * THE POINT AND THE LINE. Twenty bespoke set-pieces for the polearm
 * school, built from one vocabulary and never two alike:
 *
 *  - THE THRUST CORRIDOR — a needle seam driven down the aim, laid in
 *    three strata (deep sleeve, bright core, hairline heart) with a
 *    small leaf-point HEAD at its far end. Every pierce in the school
 *    is ONE LINE DRIVEN THROUGH — never a starburst, never a ring
 *    flash. Depth over breadth is the whole fantasy.
 *  - THE HAFT'S DUST — the butt of an ash-wood pole is a blunt
 *    instrument and the ground knows it: planted butts, braced feet,
 *    and heel trenches all speak dust.kick / dust.gouge / dust.slam
 *    through the library. The wood and the steel stay the school's
 *    own unowned matter (no material owns a spear).
 *  - THE GOLD OF THE KNIGHT — gold appears in exactly three arts
 *    (knights_charge, banner_advance, sundering_lance) and nowhere
 *    else. It means MOMENTUM AND STATION, the school's two poles;
 *    spent on anything cheaper it stops meaning anything.
 *
 * THE SWEEP EXEMPTION: crescent_reap, sweeping_gyre and reapers_turn
 * are the hafted-blade's three lawful sweeps. They read as a swept
 * EDGE — a hard leading line — never as the ring flashes the nova
 * schools own, and no two carry the same second idea. crescent_reap
 * takes a partial arc with a trailing WAKE of receding edge-ghosts;
 * sweeping_gyre takes the FULL lap with an opposed counterweight;
 * reapers_turn (THE ARMORY, the glaive's own art) takes the arc as a
 * spoked WHEEL that ends in a SHOVE — one bar struck square off the
 * end of the turn, the furrows thrown outward from it. Nothing else
 * in the school swings.
 *
 * Same binding laws as every wave: hard edges only (no blur, no
 * gradients), save/restore around every hook body, squash on ground
 * y-radii, srand-deterministic geometry with frameDt-gated emission,
 * ≤ ~60 path ops per hook per frame. Melee answers land in ~300ms,
 * novas ~680, blasts ~780, beams ~480, dashes as trail + arrival —
 * the signature owns the ANSWER, never the anticipation (the breath
 * dialect owns the wind-up, and no hook here paints a telegraph).
 *
 * CHANNEL LAW: the five channels re-emit their wire per beat, so any
 * geometry that must hold still across beats is hashed from POSITION
 * (posSeed), never from the per-beat seed; growth accumulates only
 * through settled grains the world keeps — never through painted
 * state a wire cannot own.
 *
 * ID NOTE: the school's rooted-cone channel is registered as
 * `hold_the_line_polearm` — `hold_the_line` is the shield school's
 * standing art and its signature (fxSigsShield.ts) is untouched.
 */
import type { AbilitySig } from './fxSignatures.js';
/**
 * THE TWENTY — the polearm school's bespoke set-pieces. No centerpiece
 * repeats another's, in this file or any wave: the withdraw, the
 * ferruled butt, the hook come home, the planted lever, the measured
 * line, the stuttering pricks, the trailing edge, the travelling bead,
 * the standing picket, the gold lane, the peeled plate, the forked
 * tongue, the plumb fall, the pennon, the bar through the body, the
 * standing rod, the parting gate, the full lap, the held bar, and the
 * lance that says all of it at once.
 */
export declare const POLEARM_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsPolearm.d.ts.map
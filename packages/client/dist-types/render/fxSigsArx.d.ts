/**
 * THE SIGNATURE LAW — the ARX wave.
 *
 * Eleven bespoke set-pieces for the caster roster. Arx here is not
 * decoration on a hit: each element is a WORLD given one sentence to
 * speak — the sky falls, the sea drowns a circle, dawn is delivered
 * early. Every signature layers a primary read (the impact), a
 * secondary read (its aftermath), and a lingering read (what the
 * world remembers), all in the grammar's three strata.
 *
 * Same binding laws as the founding wave: hard edges only, save/
 * restore discipline, squash on ground y-radii, srand-deterministic
 * geometry with frameDt-gated emission as the only per-frame chance,
 * ≤ ~60 path ops per hook per frame. 120fps is a law. No signature
 * shares a centerpiece with any other, in this file or the founding
 * one.
 */
import type { AbilitySig } from './fxSignatures.js';
/**
 * The ARX roster's bespoke crowns. The lead wires this table into
 * the master SIGNATURES registry — keys must match ability ids and
 * FX_STYLES faces exactly.
 */
export declare const ARX_SIGS: Record<string, AbilitySig>;
//# sourceMappingURL=fxSigsArx.d.ts.map
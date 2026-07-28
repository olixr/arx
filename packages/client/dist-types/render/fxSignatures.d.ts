/**
 * THE SIGNATURE LAW — per-ability bespoke choreography.
 *
 * The v3 grammar (rings, debris families, motifs) guarantees every
 * ability a coherent face. This registry is the tier above it: a
 * hand-authored set-piece NO OTHER ABILITY SHARES, composed on top
 * of the grammar in the same three strata the renderer already
 * paints. An ability with a signature stops being "a fire nova" and
 * becomes THE fireburst.
 *
 * Three hooks per ability:
 *  - spawn(c):  fires ONCE, the frame the fx arrives — the bespoke
 *               detonation matter (the grammar's debris still runs).
 *  - ground(c): every frame, painted UNDER the y-sorted world —
 *               flat set-pieces bodies stand on.
 *  - air(c):    every frame, painted OVER the scene — standing
 *               flourishes, crowns, shimmer, canopies.
 *
 * Authoring laws (binding):
 *  1. Hard edges only — no blur, no gradients, no shadowBlur.
 *  2. Alpha discipline: save/restore around every hook body.
 *  3. Ground ellipses squash by c.squash; air pieces lift ~0.4·sc.
 *  4. Geometry comes from srand(c.seed ^ salt) — a cast re-renders
 *     identically every frame. Per-frame randomness ONLY through
 *     frameDt-gated emission (the rim-shed pattern).
 *  5. Bounded: ≤ ~60 path ops per hook per frame; emission rates
 *     that respect the particle cap. 120fps is a law.
 *  6. The signature must SAY the mechanic — meaning first.
 *  7. No two signatures share their centerpiece.
 */
import { type FxStyle } from './abilityFx.js';
import type { Particles } from './particles.js';
export interface SigCtx {
    ctx: CanvasRenderingContext2D;
    st: FxStyle;
    /** The wire kind that carried this cast (nova/blast/arc/dash/…). */
    kind: string;
    /** Life fraction 0..1. */
    t: number;
    /** Age in ms, and the wall clock. */
    age: number;
    now: number;
    /** Stable per-cast seed — walk it with srand(seed ^ salt). */
    seed: number;
    /** Camera scale (px/tile), ground squash, and the frame's dt (s). */
    sc: number;
    squash: number;
    frameDt: number;
    /** The heart: world coords + lift-corrected screen coords. */
    wx: number;
    wy: number;
    px: number;
    py: number;
    /** The far end (dash/bolt/beam); equals the heart otherwise. */
    wx2: number;
    wy2: number;
    px2: number;
    py2: number;
    /** Radius in tiles and pixels; aim angle for arcs (else 0). */
    radius: number;
    rPx: number;
    dir: number;
    particles: Particles;
    /** Queue an emissive wash at world (x,y), r tiles, strength a. */
    glow(x: number, y: number, r: number, a: number): void;
}
export interface AbilitySig {
    spawn?(c: SigCtx): void;
    ground?(c: SigCtx): void;
    air?(c: SigCtx): void;
}
/**
 * Every ability with a bespoke signature. The grammar keeps abilities
 * without an entry fully dressed — this table is the crown, added
 * wave by wave until the whole roster owns one.
 */
export declare const SIGNATURES: Record<string, AbilitySig>;
//# sourceMappingURL=fxSignatures.d.ts.map
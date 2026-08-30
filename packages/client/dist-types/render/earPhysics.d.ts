/**
 * THE EAR IS A SIMULATION — the tail contract at head height.
 *
 * Big ears stopped being rigged geometry and became elastic bodies: a
 * short verlet chain per ear, anchored to the SKULL'S OWN AZIMUTH and
 * projected through the game's fixed bird's-eye camera. The rest pose
 * is not authored per facing band — it is the projection of one 3D
 * carriage (root orbiting the skull, membrane swept out-and-up, tips
 * raking back), so every one of the eight bands, the in-betweens, the
 * foreshortening, and the near/far draw order fall out of the same
 * arithmetic BY CONSTRUCTION. No band ever gets its own blend to rot.
 *
 * The physics adds what rigging never could: the ears LAG the turn and
 * swing home, stream on a sprint, flap with the gait bob, overshoot on
 * a hard stop, and settle — secondary motion with real inertia. But an
 * ear is cartilage and muscle, not cloth: tone is high, damping heavy,
 * and every node lives inside a hard deviation cap around its rest
 * seat, so an ear BENDS and never folds over the face (THE STRENGTH
 * LAW). A settled sim is bit-identical to the stateless rest chain —
 * THE ONE REST — so audit sheets and static previews paint the exact
 * silhouette the live game relaxes to.
 *
 * The module is species-agnostic on purpose: chains are shaped by an
 * EarCarriage (azimuth, orbit, length, spread, rise, curl) and painted
 * through an EarStyle of pre-resolved colors, so any big-eared body —
 * goblin wings today, kobold dishes tomorrow — can join the system
 * without this file learning a species name.
 */
export interface EarCarriage {
    /** Root azimuth off the facing (radians) — how far around the skull
     *  the ear roots. ~2.0 puts it wide at the temples face-on and walks
     *  it to the occiput at profile, where a turned head keeps it. */
    azimuth: number;
    /** Skull orbit radius the root rides (tiles). */
    rootR: number;
    /** How high on the skull the root sits (tiles above head center). */
    rootLift: number;
    /** Full spine length (tiles). */
    length: number;
    /** Outward (radial) component of the rest direction. */
    spread: number;
    /** Upward component of the rest direction — the standing rake. */
    rise: number;
    /** Per-segment extra rake (radians): the tip's back-hook. */
    curl: readonly [number, number, number];
}
/** Per-frame drive shared by the sim and the stateless fallback. */
export interface EarBeat {
    dir: number;
    /** 0..1 pin-back — the jeer sweeps the ears around toward the rear. */
    pin: number;
    /** The listening sway (radians) — the caller's clock, per side. */
    sway: number;
}
export interface EarChain {
    /** Spine offsets from the head anchor, in tiles (screen plane). */
    pts: Array<{
        x: number;
        y: number;
    }>;
    /** Camera-side term: >0 the ear roots on the viewer's side of the
     *  skull (paint over the head), <0 it roots behind (paint under). */
    depth: number;
}
/**
 * THE ONE REST — the projected rest chain both the sim's muscle pulls
 * toward and the stateless fallback paints outright. All eight facing
 * bands come out of this one projection; nothing here is per-band.
 */
export declare function earRestChain(side: number, c: EarCarriage, beat: EarBeat): EarChain;
/**
 * The elastic pair. Simulated in ANCHOR-LOCAL tile space: the chains
 * ride wherever the painter seats the skull (never a re-anchoring
 * seam), the anchor's own screen travel arrives as an inertial shove
 * (zoom-independent — pixels normalize through the scale), and the
 * camera never enters the math.
 */
export declare class EarSim {
    private readonly chains;
    private lastMs;
    private lastAx;
    private lastAy;
    private live;
    private restlessUntil;
    /** True while the ears genuinely move — the renderer's full-rate
     *  re-bake cue, exactly the tail's contract. */
    restless: boolean;
    /** Per-body phase — a warband never flicks in sync. */
    readonly phase: number;
    constructor(seed: number);
    /**
     * Advance both ears one frame. (axPx, ayPx) is the head anchor in
     * screen pixels (bob and lunge included), sPx the pixels-per-tile
     * scale, `pin` the 0..1 jeer pin-back.
     */
    update(axPx: number, ayPx: number, sPx: number, c: EarCarriage, dir: number, pin: number, nowMs: number): void;
    /** The simulated chain for one side, with the frame's depth term. */
    chain(side: number, c: EarCarriage, dir: number, pin: number): EarChain;
}
/** Pre-resolved colors — the painter never learns a species. */
export interface EarStyle {
    skin: string;
    outline: string;
    membrane: string;
    rib: string;
    seam: string;
}
export interface EarDrawOpts {
    hurt: boolean;
    /** True when the head faces away: backs show (seam, no membrane). */
    back: boolean;
    /** Scarred trailing edge — the healed bite out of the blade. */
    notch: boolean;
    /** Screen position of the head center — picks the outward edge. */
    headX: number;
    headY: number;
}
/**
 * Paint one projected ear: a tapered wing ribbon through the chain —
 * convex leading edge bowed out, concave trailing edge, pointed tip —
 * with the pale membrane and two fanned ribs on the forward face, a
 * single cartilage seam on the back, and the optional healed notch.
 * Plain path calls so painter tests can walk every coordinate.
 */
export declare function drawWingEar(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, w0: number, st: EarStyle, opts: EarDrawOpts): void;
//# sourceMappingURL=earPhysics.d.ts.map
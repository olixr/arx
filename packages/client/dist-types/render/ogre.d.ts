export type OgreDesign = 'brute' | 'hurler' | 'bellower' | 'champion';
export interface OgreLook {
    design: OgreDesign;
    /** The hide — most of the painted area. */
    hide: string;
    /** The front plane: belly, jaw underside, palm. */
    belly: string;
    /** The greasy mat: crown fall, hump drape, sideburn. */
    hair: string;
    /** The pelt wrap at the hips. */
    wrap: string;
    /** The rope that cinches it (and hangs the trophies). */
    rope: string;
    /** Worn tooth and toenail ivory. */
    teeth: string;
    /** War-paint / accent: the bellower's drum ring, the champion's ash. */
    paint: string;
    /** Frame multiplier: gut girth, fist size, jaw weight. */
    heavy: number;
    /** One torn ear and an old face scar — rolled, never authored. */
    scarred: boolean;
    /** Spawn seed — warts, patches, trophy kind, nothing else. */
    seed?: number;
}
export declare const OGRE_LOOKS: Record<string, OgreLook>;
/**
 * Resolve a def's look. Rank-and-file roll the hide cluster and the
 * scar; designs keep their coat and roll only warts and the trophy.
 */
export declare function ogreLook(defId: string, seed?: number): OgreLook;
/**
 * THE GUT KEEPS ITS OWN TIME — a one-mass spring in anchor-local TILE
 * space (the ear-sim contract: the camera never enters the math, zoom
 * normalizes through the scale). The mass lags the painted anchor's
 * travel, so the walk bob, the strike lunge, and the sudden stop all
 * arrive as honest jiggle — heavy-flesh tier: ONE bounce, then home.
 * Never a pose.
 */
export declare class GutSim {
    private readonly seed;
    private dx;
    private dy;
    private vx;
    private vy;
    private ax0;
    private ay0;
    private t0;
    /** Renderer full-rate cue — true while the mass is visibly moving. */
    restless: boolean;
    constructor(seed: number);
    /** Tick at the painted torso anchor (screen px) — returns px offsets.
     *  Timing rides the wall clock (the ear-sim contract: RigPose has no
     *  dt, and a sim that trusts frame cadence stutters on a dropped
     *  frame anyway). */
    update(ax: number, ay: number, sPx: number, nowMs: number): {
        dx: number;
        dy: number;
    };
}
/** THE ONE REST — what a settled gut is: exactly nothing. */
export declare const GUT_REST: {
    readonly dx: 0;
    readonly dy: 0;
};
/** Trophy pendant chain: root + two free nodes, anchor-local px. */
export interface PendantChain {
    pts: Array<{
        x: number;
        y: number;
    }>;
}
/** THE ONE REST — the thong hangs straight down, knot to trophy. */
export declare function pendantRest(lenPx: number): PendantChain;
/**
 * THE TROPHY RIDES THE STRIDE — a two-segment verlet pendant on the
 * cape contract: anchor-local, gravity down the screen, the anchor's
 * travel arriving as an inertial shove. Damping sits between cloth
 * and tail — a knotted skull flutters less than a hem and settles
 * faster than a brush comes home.
 */
export declare class PendantSim {
    private readonly nx;
    private readonly ny;
    private readonly px;
    private readonly py;
    private ax0;
    private ay0;
    private t0;
    restless: boolean;
    readonly phase: number;
    constructor(seed: number);
    /** Tick at the knot's painted position (screen px); wall-clock time. */
    update(ax: number, ay: number, lenPx: number, nowMs: number): PendantChain;
    private chainPts;
}
export interface OgreBodyFrame {
    s: number;
    tw: number;
    ww: number;
    th: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    runF: number;
    /** 0..1 menace ramp (Cast/Attack wind) — the bellows fill. */
    flare: number;
    /**
     * THE WEIGHT CROSSES (−1..1): the walk's lateral rock — the mass
     * moves onto the planted column each stride (the heaviest walkers
     * sway; a bounce would lie about the tonnage). Derived from the
     * live foot lifts by the rig; 0 at rest and in stateless callers.
     */
    sway: number;
    /** GutSim output in px, or null → THE ONE REST (posters, sheets). */
    gut: {
        dx: number;
        dy: number;
    } | null;
    /** PendantSim chain, or null → the rest hang. */
    pendant: PendantChain | null;
}
/**
 * The giant's torso — called from drawHumanoid's dialect switch in the
 * torso-local frame (origin at the hip line). Stations are projected;
 * paint order is depth order; the rig paints arms and head after.
 */
export declare function paintOgreBody(ctx: CanvasRenderingContext2D, ogr: OgreLook, f: OgreBodyFrame): void;
/** The head frame is the shared dialect contract (KoboldHeadFrame). */
interface OgreHeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    fx: number;
    fy: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    nowMs: number;
    gape: number;
}
/**
 * THE SLOPE AND THE UNDERBITE. Face-on through ¾: the small skull
 * falls back from the brow ledge; the jaw out-widths it and leads it;
 * two lower teeth stand proud. Past profileK 0.9 the head swaps for
 * the AUTHORED TRUE PROFILE (one closed silhouette, one ear, one eye,
 * one tusk). From behind: hair mat, ear backs, occiput — no face.
 */
export declare function paintOgreHead(ctx: CanvasRenderingContext2D, ogr: OgreLook, f: OgreHeadFrame, seed: number): void;
/**
 * THE KNUCKLE HANG — called from drawArm's dialect switch with joints
 * the rig solved on the ogre's UNEQUAL bones. The taper is inverted:
 * the forearm out-girths the upper arm (the ape read), and the hand
 * is a ham with knuckle ticks, not a mitt.
 */
export declare function drawOgreArm(ctx: CanvasRenderingContext2D, ogr: OgreLook, sx: number, sy: number, kx: number, ky: number, ex: number, ey: number, s: number, hurt: boolean, nowMs: number): void;
/**
 * The giant footing: a bare flat slab a size past even the golem's,
 * four toe seams and three worn nail chips — the calluses of a body
 * that never met a boot it couldn't split.
 */
export declare function paintOgreFoot(ctx: CanvasRenderingContext2D, ogr: OgreLook, fxx: number, fyy: number, s: number, lead: number, hurt: boolean): void;
export {};
//# sourceMappingURL=ogre.d.ts.map
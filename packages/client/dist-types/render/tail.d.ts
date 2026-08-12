import { type GnollLook } from './rig.js';
/**
 * THE TAIL IS A SIMULATION, NOT A POSE — the cape contract in muscle.
 * A world-space verlet chain (x, y in tiles + a height axis) hangs off
 * the back of the hips and is PULLED behind the body: run and it
 * streams out and lags the turn, stop and it swings past and settles,
 * spin and it wraps around the torso column and recovers. Where cloth
 * obeys wind and gravity, a tail has TONE: every node carries a spring
 * toward the species' rest carriage (low, sunk, behind the facing), so
 * the brush always comes home to the hyena's flag instead of hanging
 * like a rope. The renderer ticks it once per frame beside the cape
 * sim and projects the nodes; depth follows the cape's facing law, so
 * the z-order is right at every one of the eight bands by
 * construction.
 */
interface TailNode {
    x: number;
    y: number;
    z: number;
    px: number;
    py: number;
    pz: number;
}
export declare class TailSim {
    private readonly heavy;
    readonly nodes: TailNode[];
    /** Per-body phase — a warband never wags in sync. */
    readonly phase: number;
    private readonly segLen;
    private readonly segs;
    private lastAx;
    private lastAy;
    private live;
    private isFront;
    private restlessUntil;
    /**
     * True while the brush genuinely moves (anchor travel or a tip still
     * swinging after a stop) — the renderer's cue to re-bake the body
     * sprite at full rate. Calm tails fall back to the idle cadence,
     * whose ~8-frame resample is exactly right for the resting wag.
     */
    restless: boolean;
    /** Tip speed (tiles/s) — the settle detector. */
    tipSpd: number;
    constructor(heavy: number, seed: number);
    /**
     * Advance the tail one frame. (ax, ay) is the body's world position
     * (lunge included), az the HIP height in tile units, dir the facing
     * in radians. sizeK scales the whole appendage (the packlord 1.42).
     */
    update(ax: number, ay: number, az: number, dir: number, dt: number, tSec: number, sizeK: number): void;
    /**
     * Paint side is a FACING law, not a tail-position law — the cape's
     * exact hysteresis. The tail lives on the back, and the back is
     * toward the camera exactly when the facing points up-screen.
     */
    front(fy: number): boolean;
}
export interface TailDrawOpts {
    hurt: boolean;
}
/**
 * Paint the projected brush: a tapered ribbon through the simulated
 * nodes with the bushy mid-length bulge, the trailing-half form shade,
 * pale underfur along the low edge, two mask rings that WRAP the
 * volume (rungs, not blobs), and the mask-dipped tip. `pts` are the
 * nodes projected to screen by the caller; `wk` is the width scale
 * (camera scale × body size). Built with plain path calls — no Path2D
 * — so the node-side painter tests can walk every coordinate.
 */
export declare function drawTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, gn: GnollLook, wk: number, opts: TailDrawOpts): void;
export {};
//# sourceMappingURL=tail.d.ts.map
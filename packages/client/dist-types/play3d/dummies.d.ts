/**
 * THE WALKING DUMMIES (play3d S1) — stand-ins for ClientGame entities
 * until S2's LiveWorld arrives. Each Walker is a world position with a
 * wander target (or the WASD-driven player), stepped at the FIXED sim
 * rate; the render loop interpolates between the last two sim states
 * so the rig (which derives its gait from position deltas, exactly as
 * the live game does) sees smooth motion whatever the display rate.
 *
 * Collision is the world's own: axis-separated slides against
 * isSolid, the same shape the spike and the 2D client use.
 */
import type { EntityBillboard } from './sprites.js';
import type { WorldSource3D } from './world.js';
export declare class Walker {
    readonly sprite: EntityBillboard;
    readonly speed: number;
    readonly home: {
        x: number;
        y: number;
        r: number;
    } | null;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    dir: number;
    /** Wander target (ignored for the player). */
    tx: number;
    ty: number;
    /** Per-walker wander clock so the flock never turns in lockstep. */
    private nextPickAt;
    constructor(sprite: EntityBillboard, x: number, y: number, speed: number, home: {
        x: number;
        y: number;
        r: number;
    } | null);
    /** One fixed sim step. `mx, mz` is the player's unit move (or 0). */
    step(dt: number, world: WorldSource3D, nowMs: number, mx?: number, mz?: number, rand?: () => number): void;
    private slide;
    /** Interpolated render position. */
    lerpX(alpha: number): number;
    lerpY(alpha: number): number;
}
//# sourceMappingURL=dummies.d.ts.map
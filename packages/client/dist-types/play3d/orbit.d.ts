/**
 * THE ORBIT (play3d S1, Workstream 4 seed) — pure camera-rig math.
 *
 * The camera orbits the player: yaw is free (rotation is the 3D win),
 * pitch is clamped to a band (top-down-ish to a low look across the
 * land — never under the ground, never a flat horizon that would ask
 * the billboards to be sides they do not have), and zoom is a dolly
 * along the view ray. Every input lands on a TARGET; the live rig
 * eases toward it with a frame-rate-independent exponential, so a
 * wheel notch or a drag never snaps.
 *
 * Coordinate law: world tile (wx, wy) → Three (x = wx, y = up, z = wy).
 * Yaw 0 puts the camera SOUTH of the target looking north — the 2D
 * game's one viewpoint — so every painter's "south is the presented
 * face" assumption is the yaw-0 frame, and a body's facing relative to
 * the camera is simply `dir + yaw` (see sprites.ts).
 */
export interface OrbitPose {
    yaw: number;
    pitch: number;
    dist: number;
}
export declare const ORBIT_LIMITS: {
    readonly pitchMin: 0.3;
    readonly pitchMax: 1.2;
    readonly distMin: 5;
    readonly distMax: 44;
};
/** Clamp a pose into the band; yaw wraps to (-π, π]. */
export declare function clampOrbit(p: OrbitPose): OrbitPose;
/**
 * Frame-rate-independent ease: after `1/rate` seconds the gap has
 * closed to 1/e. Returns the new value; never overshoots.
 */
export declare function easeTowards(cur: number, target: number, rate: number, dt: number): number;
/** Shortest-arc angular ease (yaw wraps). */
export declare function easeAngle(cur: number, target: number, rate: number, dt: number): number;
export interface Vec3Like {
    x: number;
    y: number;
    z: number;
}
/** Camera offset from the target for a pose (allocation-free). */
export declare function orbitOffset(p: OrbitPose, out: Vec3Like): Vec3Like;
/**
 * Camera-relative move axes on the ground plane: forward is where the
 * camera looks (north at yaw 0), right is screen-right. Returns unit
 * (x, z) world deltas for a (strafe, advance) input pair.
 */
export declare function moveOnGround(yaw: number, strafe: number, advance: number, out: {
    x: number;
    z: number;
}): void;
/** Wheel notches → multiplicative dolly (feels even at any distance). */
export declare function dollyBy(dist: number, notches: number): number;
//# sourceMappingURL=orbit.d.ts.map
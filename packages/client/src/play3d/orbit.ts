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

export const ORBIT_LIMITS = {
  pitchMin: 0.3,
  // Above ~1.2 rad a yaw-only billboard is seen edge-on and flattens
  // to a sliver: the pitch ceiling is the billboard's honesty.
  pitchMax: 1.2,
  distMin: 5,
  distMax: 44,
} as const;

/** Clamp a pose into the band; yaw wraps to (-π, π]. */
export function clampOrbit(p: OrbitPose): OrbitPose {
  p.pitch = Math.min(ORBIT_LIMITS.pitchMax, Math.max(ORBIT_LIMITS.pitchMin, p.pitch));
  p.dist = Math.min(ORBIT_LIMITS.distMax, Math.max(ORBIT_LIMITS.distMin, p.dist));
  if (p.yaw > Math.PI || p.yaw <= -Math.PI) {
    p.yaw = Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw));
  }
  return p;
}

/**
 * Frame-rate-independent ease: after `1/rate` seconds the gap has
 * closed to 1/e. Returns the new value; never overshoots.
 */
export function easeTowards(cur: number, target: number, rate: number, dt: number): number {
  const k = 1 - Math.exp(-rate * dt);
  return cur + (target - cur) * k;
}

/** Shortest-arc angular ease (yaw wraps). */
export function easeAngle(cur: number, target: number, rate: number, dt: number): number {
  const d = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
  return cur + d * (1 - Math.exp(-rate * dt));
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** Camera offset from the target for a pose (allocation-free). */
export function orbitOffset(p: OrbitPose, out: Vec3Like): Vec3Like {
  const horiz = Math.cos(p.pitch) * p.dist;
  out.x = Math.sin(p.yaw) * horiz;
  out.y = Math.sin(p.pitch) * p.dist;
  out.z = Math.cos(p.yaw) * horiz;
  return out;
}

/**
 * Camera-relative move axes on the ground plane: forward is where the
 * camera looks (north at yaw 0), right is screen-right. Returns unit
 * (x, z) world deltas for a (strafe, advance) input pair.
 */
export function moveOnGround(yaw: number, strafe: number, advance: number, out: { x: number; z: number }): void {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  let x = fx * advance + rx * strafe;
  let z = fz * advance + rz * strafe;
  const len = Math.hypot(x, z);
  if (len > 1e-6) {
    x /= len;
    z /= len;
  } else {
    x = 0;
    z = 0;
  }
  out.x = x;
  out.z = z;
}

/** Wheel notches → multiplicative dolly (feels even at any distance). */
export function dollyBy(dist: number, notches: number): number {
  return dist * Math.pow(1.12, notches);
}

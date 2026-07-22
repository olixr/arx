import { BODY_RADIUS } from '../constants.js';
import type { Vec2 } from '../math/vec.js';
import { circleHitsSolid, type CollisionSource } from '../world/collision.js';
import { isWadeTile, WADE_SPEED_FACTOR } from '../world/tiles.js';
import type { InputFrame } from './input.js';

/** Dodge dash: distance covered and the seq-based cooldown (in ticks). */
export const DODGE_DIST = 0.85;
export const DODGE_COOLDOWN_SEQ = 24; // 1.2s at 20Hz

/**
 * Apply a dodge impulse along (mx, my). Pure and shared — the client
 * predicts it and the server applies it from the same input frame, and
 * because the cooldown is sequence-number based both sides agree without
 * any extra state in snapshots. Substepped so walls stop (and slide)
 * the dash instead of letting it clip through.
 */
export function applyDodge(
  pos: Vec2,
  mx: number,
  my: number,
  collision: CollisionSource,
  radius = BODY_RADIUS,
): Vec2 {
  const len = Math.hypot(mx, my);
  if (len < 1e-6) return { x: pos.x, y: pos.y };
  let out = { x: pos.x, y: pos.y };
  const input = { mx: mx / len, my: my / len };
  // 5 slide-aware substeps of DODGE_DIST/5 each.
  for (let i = 0; i < 5; i++) {
    out = stepMovement(out, input, DODGE_DIST, 1 / 5, collision, radius);
  }
  return out;
}

/**
 * Advance a body one tick from an input frame. Pure and shared: the server
 * runs it authoritatively, the client runs the identical code for
 * prediction, so reconciliation corrections stay tiny.
 *
 * Axis-separated moves give free wall sliding.
 */
export function stepMovement(
  pos: Vec2,
  input: Pick<InputFrame, 'mx' | 'my'>,
  speed: number,
  dt: number,
  collision: CollisionSource,
  radius = BODY_RADIUS,
): Vec2 {
  let { mx, my } = input;
  const len = Math.hypot(mx, my);
  if (len < 1e-6) return { x: pos.x, y: pos.y };
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  // THE WADE LAW: knee-deep water drags every stride. Sampled at the
  // body's current tile, inside the shared step, so prediction and the
  // authoritative sim slow down in perfect lockstep (dodge substeps
  // shorten through a ford the same way).
  const wade =
    collision.tileAt && isWadeTile(collision.tileAt(Math.floor(pos.x), Math.floor(pos.y)))
      ? WADE_SPEED_FACTOR
      : 1;
  const stepX = mx * speed * wade * dt;
  const stepY = my * speed * wade * dt;
  let x = pos.x;
  let y = pos.y;

  if (stepX !== 0 && !circleHitsSolid(collision, x + stepX, y, radius)) {
    x += stepX;
  }
  if (stepY !== 0 && !circleHitsSolid(collision, x, y + stepY, radius)) {
    y += stepY;
  }
  return { x, y };
}

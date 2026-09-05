import { BODY_RADIUS } from '../constants.js';
import type { Vec2 } from '../math/vec.js';
import { circleHitsSolid, type CollisionSource } from '../world/collision.js';
import { isWadeTile, WADE_SPEED_FACTOR } from '../world/tiles.js';
import type { InputFrame } from './input.js';

// (The pressed dodge dash — applyDodge and its seq cooldown — was
// retired 2026-09-05; the body's defensive slip is THE SLIPPED BLOW
// in sim/evasion.ts now, a chance rolled where the blow lands, not a
// keypress that moved the feet.)

/**
 * THE TORN VEIL (THE CROSSING, docs/transport-arts-plan.md): resolve
 * where a blink actually lands. The wish is `dist` tiles along
 * (dirX, dirY); the march takes quarter-tile steps out from the
 * caster, keeps the last spot the body fit, and ENDS at the first
 * obstruction — the veil never opens past stone, so a locked gate
 * is exactly as locked to a blink as to a stride. Pure and shared:
 * the server relocates with it and the predictor mirrors it, so a
 * blink against a cliff face lands on the same stone for both.
 * Returns the caster's own spot when nothing past the feet fits.
 */
export function resolveTeleport(
  pos: Vec2,
  dirX: number,
  dirY: number,
  dist: number,
  collision: CollisionSource,
  radius = BODY_RADIUS,
): Vec2 {
  const len = Math.hypot(dirX, dirY);
  if (len < 1e-6 || dist <= 0) return { x: pos.x, y: pos.y };
  const nx = dirX / len;
  const ny = dirY / len;
  // March the line OUT from the caster, keeping the last spot the
  // body fit; the FIRST obstruction ends the march — the veil never
  // opens past stone (a blink through a locked gate would sell the
  // key ring for a keypress). The wish is simply the farthest fit
  // before the first refusal, capped at the asked distance.
  let lx = pos.x;
  let ly = pos.y;
  const marchSteps = Math.ceil(dist / 0.25);
  for (let i = 1; i <= marchSteps; i++) {
    const d = Math.min(i * 0.25, dist);
    const x = pos.x + nx * d;
    const y = pos.y + ny * d;
    if (circleHitsSolid(collision, x, y, radius)) break;
    lx = x;
    ly = y;
  }
  return { x: lx, y: ly };
}

/**
 * THE TRAVELED ROAD: advance a transiting body one tick's worth of
 * road. Substepped at ≤0.4 tiles through the one stepMovement door
 * (walls stop and slide the crossing exactly as they stop a stride);
 * `onSubstep` fires after each resolved substep so the server can
 * sweep the corridor without forking the walk the predictor mirrors.
 * Returns the resolved position and whether the road is BLOCKED —
 * a body that covered almost none of the asked step has met a wall
 * face-on, and the transit should end where it stands.
 */
export function transitStep(
  pos: Vec2,
  dirX: number,
  dirY: number,
  step: number,
  collision: CollisionSource,
  onSubstep?: (x: number, y: number) => void,
): { x: number; y: number; blocked: boolean } {
  let out = { x: pos.x, y: pos.y };
  const steps = Math.max(1, Math.ceil(step / 0.4));
  const input = { mx: dirX, my: dirY };
  for (let i = 0; i < steps; i++) {
    out = stepMovement(out, input, step / steps, 1, collision);
    onSubstep?.(out.x, out.y);
  }
  const covered = Math.hypot(out.x - pos.x, out.y - pos.y);
  return { x: out.x, y: out.y, blocked: covered < step * 0.05 };
}

/**
 * THE SADDLE OUTRANKS THE SOLES: a mounted body moves at the mount's
 * multiplier OR the foot stack (tonics, stride enchants, passives,
 * gear), whichever is greater — never the product. Stacking would let
 * a tonic ride the saddle past the remote-smoothing ceiling the
 * netcode reserved for mounts (12 t/s); the max keeps the fastest
 * possible body provable from this one site, and tonics stay worth
 * drinking on foot.
 */
export function rideSpeedMult(mountMult: number | null, footMult: number): number {
  return mountMult == null ? footMult : Math.max(mountMult, footMult);
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
  // authoritative sim slow down in perfect lockstep (a transit's
  // substeps shorten through a ford the same way).
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

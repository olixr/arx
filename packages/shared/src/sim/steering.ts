import type { Vec2 } from '../math/vec.js';
import { circleHitsSolid, type CollisionSource } from '../world/collision.js';

/**
 * Local obstacle-avoidance steering — the organic middle ground between
 * "walk straight at the target" and a real pathfinder. A mover probes
 * the direct heading a stride or two ahead; when it's blocked, it fans
 * out in 30° steps and takes the SMALLEST clear deflection, remembering
 * which way it swung so consecutive ticks wall-follow around the
 * obstacle instead of dithering back and forth at a corner.
 *
 * This is deliberately not A*: it costs a handful of circle tests per
 * moving body per tick (zero extra when the way is clear) and it can
 * still lose against deep concave pockets — the caller's stall watchdog
 * (closest-approach, never step distance) owns that escalation.
 */

/** Per-body steering memory: which side we swung, and for how long. */
export interface SteerMemory {
  /** Committed swerve side: -1 clockwise, 1 counter-clockwise, 0 free. */
  side: number;
  /** Ticks of commitment left before the side preference is dropped. */
  ticks: number;
}

export function newSteerMemory(): SteerMemory {
  return { side: 0, ticks: 0 };
}

/** How far ahead the body looks for trouble, in tiles. */
const LOOKAHEAD = 1.2;
/** Ticks a chosen swerve side stays sticky (0.6s at 20Hz). */
const COMMIT_TICKS = 12;
/** The fan: smallest deflection first; past 90° we're backtracking. */
const FAN = [Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, (5 * Math.PI) / 6];

/** Is the straight run from `pos` along (ux, uy) clear for `ahead` tiles? */
function headingClear(
  collision: CollisionSource,
  pos: Vec2,
  ux: number,
  uy: number,
  ahead: number,
  radius: number,
): boolean {
  // Four samples overlap for any body radius ≥ 0.15 at full lookahead.
  for (let i = 1; i <= 4; i++) {
    const d = (ahead * i) / 4;
    if (circleHitsSolid(collision, pos.x + ux * d, pos.y + uy * d, radius)) return false;
  }
  return true;
}

/**
 * Can a body of `radius` walk the straight line from (x0,y0) to
 * (x1,y1)? Samples every 0.35 tiles but never AT the endpoint — the
 * target itself may stand hard against a wall, and that wall is not
 * on our path. This is walk-clearance, not sight: solids that could
 * be seen past (a fence, a boulder) still block it.
 */
export function lineClear(
  collision: CollisionSource,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const ux = dx / dist;
  const uy = dy / dist;
  for (let d = 0.35; d < dist - 0.05; d += 0.35) {
    if (circleHitsSolid(collision, x0 + ux * d, y0 + uy * d, radius)) return false;
  }
  return true;
}

/**
 * The unit heading toward (goalX, goalY), deflected just enough to miss
 * whatever stands in the way. Returns {0,0} at the goal. Mutates `mem`.
 */
export function steerToward(
  pos: Vec2,
  goalX: number,
  goalY: number,
  collision: CollisionSource,
  radius: number,
  mem: SteerMemory,
): { mx: number; my: number } {
  const dx = goalX - pos.x;
  const dy = goalY - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { mx: 0, my: 0 };
  const ux = dx / dist;
  const uy = dy / dist;
  // Never probe past the goal — the target itself may stand hard
  // against a wall, and that wall is not on our path.
  const ahead = Math.min(LOOKAHEAD, dist);

  if (headingClear(collision, pos, ux, uy, ahead, radius)) {
    if (mem.ticks > 0 && --mem.ticks === 0) mem.side = 0;
    return { mx: ux, my: uy };
  }

  // Blocked: swing off the desired line, committed side first so a
  // corner is rounded in one motion instead of oscillated against.
  const firstSide = mem.side !== 0 ? mem.side : 1;
  for (const a of FAN) {
    for (const s of [firstSide, -firstSide]) {
      const cos = Math.cos(a * s);
      const sin = Math.sin(a * s);
      const rx = ux * cos - uy * sin;
      const ry = ux * sin + uy * cos;
      if (headingClear(collision, pos, rx, ry, ahead, radius)) {
        mem.side = s;
        mem.ticks = COMMIT_TICKS;
        return { mx: rx, my: ry };
      }
    }
  }

  // Boxed in on every heading: push the desired line and let the
  // wall-slide creep — the caller's stall watchdog takes it from here.
  return { mx: ux, my: uy };
}

/**
 * THE ROUTINE INTERPRETER — Map Studio v2 Phase 3. A pure, client-side
 * reading of RoutineDef: given the placement (THE POST IS THE ORIGIN),
 * the scrubbed hour, and a time parameter, where does the body stand
 * and which way does it face? No server sim — waypoint legs are
 * parametrized by seconds so path walkers move along their rounds and
 * wanderers drift, deterministically per post (two guards on the same
 * round never sync-step).
 *
 * Faithful to the schedule law: the FIRST slot containing the hour
 * wins, `from > to` wraps midnight, the base task fills unclaimed
 * hours. Position truth only — work/sit/lie POSES are a later phase
 * (bodies stand at their stops).
 */

import type {
  RoutineDef,
  RoutineTask,
  RoutineTaskPath,
  RoutineTaskWander,
} from '@arx/content';

export interface RoutinePose {
  /** WORLD tile coords (post-relative offsets already applied). */
  x: number;
  y: number;
  /** Facing, radians. */
  dir: number;
  /** True mid-leg — the body is walking (drives the gait). */
  moving: boolean;
  kind: RoutineTask['kind'];
}

const DEFAULT_STRIDE = 1.8;
const SOUTH = Math.PI / 2;

/** Does an [from,to) hours window contain this hour? from>to wraps. */
export function hoursContain(from: number, to: number, hour: number): boolean {
  if (from === to) return true; // a degenerate window claims the day
  if (from < to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}

/** The task owning this hour — first matching slot, else base. */
export function activeTask(def: RoutineDef, hour: number): RoutineTask {
  for (const slot of def.slots ?? []) {
    if (hoursContain(slot.from, slot.to, hour)) return slot.task;
  }
  return def.base;
}

/** Small deterministic hash → [0,1). */
function hash01(a: number, b: number, c = 0): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Post {
  x: number;
  y: number;
  dir?: number;
}

function pathPose(task: RoutineTaskPath, post: Post, tSec: number): RoutinePose {
  const wps = task.waypoints;
  if (wps.length === 0) {
    return { x: post.x, y: post.y, dir: post.dir ?? SOUTH, moving: false, kind: 'path' };
  }
  // Build the route in world coords; a loop returns to the first stop.
  const mode = task.mode ?? 'loop';
  const pts = wps.map((w) => ({ ...w, wx: post.x + w.x, wy: post.y + w.y }));
  interface Leg {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    walk: number; // seconds walking this leg
    wait: number; // seconds lingering at the leg's END
    dir?: number; // authored facing while lingering
  }
  const legs: Leg[] = [];
  const seq = mode === 'bounce' ? [...pts, ...pts.slice(0, -1).reverse()] : pts;
  const closed = mode === 'loop';
  for (let i = 0; i < seq.length; i++) {
    const a = seq[i]!;
    const b = seq[(i + 1) % seq.length]!;
    const last = i === seq.length - 1;
    if (last && !closed) {
      // 'once'/'bounce' final stop: an open end (bounce closed by mirror).
      legs.push({ x0: a.wx, y0: a.wy, x1: a.wx, y1: a.wy, walk: 0, wait: a.waitSec ?? 0, dir: a.dir });
      break;
    }
    const dist = Math.hypot(b.wx - a.wx, b.wy - a.wy);
    const speed = b.speed ?? task.speed ?? DEFAULT_STRIDE;
    legs.push({
      x0: a.wx,
      y0: a.wy,
      x1: b.wx,
      y1: b.wy,
      walk: dist / Math.max(0.2, speed),
      wait: b.waitSec ?? 0,
      dir: b.dir,
    });
  }
  const cycle = legs.reduce((s, l) => s + l.walk + l.wait, 0);
  if (cycle <= 0.001) {
    const p0 = pts[0]!;
    return { x: p0.wx, y: p0.wy, dir: p0.dir ?? post.dir ?? SOUTH, moving: false, kind: 'path' };
  }
  // Deterministic phase per post so parallel rounds interleave.
  let t = (tSec + hash01(post.x * 7, post.y * 13) * cycle) % cycle;
  if (mode === 'once') t = Math.min(tSec, cycle - 0.001);
  for (const leg of legs) {
    if (t < leg.walk) {
      const k = leg.walk > 0 ? t / leg.walk : 1;
      return {
        x: leg.x0 + (leg.x1 - leg.x0) * k,
        y: leg.y0 + (leg.y1 - leg.y0) * k,
        dir: Math.atan2(leg.y1 - leg.y0, leg.x1 - leg.x0),
        moving: true,
        kind: 'path',
      };
    }
    t -= leg.walk;
    if (t < leg.wait) {
      return {
        x: leg.x1,
        y: leg.y1,
        dir: leg.dir ?? Math.atan2(leg.y1 - leg.y0, leg.x1 - leg.x0),
        moving: false,
        kind: 'path',
      };
    }
    t -= leg.wait;
  }
  const lastLeg = legs[legs.length - 1]!;
  return { x: lastLeg.x1, y: lastLeg.y1, dir: lastLeg.dir ?? SOUTH, moving: false, kind: 'path' };
}

function wanderPose(task: RoutineTaskWander, post: Post, tSec: number): RoutinePose {
  const cx = post.x + (task.x ?? 0);
  const cy = post.y + (task.y ?? 0);
  // Drift between deterministic spots inside the ring: each ~9s epoch
  // picks a spot; the body eases toward it over the first ~4s.
  const EPOCH = 9;
  const epoch = Math.floor(tSec / EPOCH) + Math.floor(hash01(post.x * 3, post.y * 5) * 1000);
  const spotAt = (e: number): { x: number; y: number } => {
    const ang = hash01(e, post.x | 0, post.y | 0) * Math.PI * 2;
    const r = Math.sqrt(hash01(e * 31, post.y | 0, post.x | 0)) * task.radius;
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
  };
  const from = spotAt(epoch - 1);
  const to = spotAt(epoch);
  const within = tSec % EPOCH;
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const walkTime = dist / Math.max(0.2, task.speed ?? 1.2);
  const k = Math.min(1, walkTime > 0 ? within / walkTime : 1);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    dir: dist > 0.05 ? Math.atan2(to.y - from.y, to.x - from.x) : SOUTH,
    moving: k < 1 && dist > 0.05,
    kind: 'wander',
  };
}

/**
 * The one entry: where the routine puts a body posted at `post` when
 * the clock reads `hour`, with `tSec` parametrizing motion (LIVING
 * MODE feeds real seconds; the still frame derives a deterministic
 * parameter from the hour so scrubbing advances the rounds).
 */
export function routinePoseAt(
  def: RoutineDef | undefined,
  post: Post,
  hour: number,
  tSec: number,
): RoutinePose {
  if (!def) {
    return { x: post.x, y: post.y, dir: post.dir ?? SOUTH, moving: false, kind: 'post' };
  }
  const task = activeTask(def, hour);
  switch (task.kind) {
    case 'post':
      return {
        x: post.x + (task.x ?? 0),
        y: post.y + (task.y ?? 0),
        dir: task.dir ?? post.dir ?? SOUTH,
        moving: false,
        kind: 'post',
      };
    case 'path':
      return pathPose(task, post, tSec);
    case 'wander':
      return wanderPose(task, post, tSec);
  }
}

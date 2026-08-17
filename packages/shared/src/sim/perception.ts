import type { CollisionSource } from '../world/collision.js';
import { sightMass } from '../world/tiles.js';

/**
 * THE PERCEPTION LAW — how a body notices another body.
 *
 * Detection is no longer a circle: an eye has a FACING and an ARC,
 * a sight-line that real mass interrupts, and an awareness that
 * ACCUMULATES while the quarry stays in view and drains when it
 * slips away. The filter chain runs cheap-to-expensive, the shape
 * every shipped stealth sim converges on:
 *
 *   1. range gate (squared distance, no sqrt)
 *   2. zone gate  (close ring / facing cone / peripheral band)
 *   3. sight ray  (one grid ray, only on zone survivors)
 *   4. the meter  (rate by distance and zone; thresholds drive the
 *      state ladder: suspicious at ALERT_SUS, engaged at ALERT_MAX)
 *
 * Everything here is pure math over a CollisionSource — the server
 * owns scheduling, state, and consequences.
 */

/** The all-round ring nothing sneaks through: point blank is point blank. */
export const SIGHT_CLOSE_RANGE = 2.0;

/**
 * SEEING IS NOT CHARGING: the eye reaches this multiple of the
 * posted aggroRange. The old circle conflated noticing with
 * attacking; the cone separates them — a goblin SEES a stranger
 * nine tiles up the road (and gets curious), it only commits to
 * violence inside the sizing-up engage circle. Level never shrinks
 * the eye, only the nerve.
 */
export const SIGHT_RANGE_MULT = 2.25;

/**
 * Outside the cone the eye still keeps a dim all-round sense — a
 * presence at the edge of vision, a footfall — reaching this fraction
 * of sight range. It accumulates at half rate and can only ever make
 * a body SUSPICIOUS (turn and look), never lock it straight on.
 */
export const SIGHT_PERIPHERAL_FRAC = 0.55;
export const PERIPHERAL_RATE = 0.5;

/**
 * An engaged eye holds its quarry out to sightRange × this — the
 * lose-sight hysteresis every perception system carries so a target
 * dancing on the range line doesn't flicker in and out of the fight.
 */
export const LOSE_SIGHT_FACTOR = 1.4;

/** The meter's two thresholds: turn-and-look, and the hunt is on. */
export const ALERT_SUS = 35;
export const ALERT_MAX = 100;

/**
 * Accumulation per tick: point-blank fills the meter in about a
 * second, the cone's far edge in ~3s — distance literally IS
 * time-to-react, the window a bold approach gambles on. Tuned brisk:
 * a watcher that clocks a stranger should LOOK within half a second,
 * not blink at them for three.
 */
export const ALERT_RATE_MAX = 5.0;
export const ALERT_RATE_MIN = 1.6;

/**
 * THE WATCHFUL CAP: a quarry outside the engage circle (too far — or
 * too plainly dangerous, by the sizing-up law) parks the meter one
 * step shy of the lock. The body still climbs the whole curiosity
 * ladder — stare, walk over, size them up — but the killing decision
 * waits until the quarry is genuinely inside its nerve.
 */
export const ALERT_WATCH_CAP = ALERT_MAX - 1;

/** Out of sight: a grace before doubt, then the memory drains ~8s. */
export const ALERT_GRACE_TICKS = 30;
export const ALERT_DECAY = 0.625;

/** A def that authors no arc watches this wedge (degrees, full angle). */
export const DEFAULT_SIGHT_ARC = 140;

/** Seeing a body through one trunk of cover dulls the eye to this. */
export const COVER_VIS_FACTOR = 0.45;

/**
 * The snapshot's alert byte — what the world reads over a body's
 * head. THE EYE ABOVE THE HEAD: every value is one EYE, drawn by the
 * client on a small dark badge plate (never a text glyph — glyphs
 * belong to the QUEST marks, and the two grammars must never rhyme).
 * WARY = the half-lidded stare (suspicious, planted); LOOKING = the
 * open eye walking over (investigate); ENGAGED = the red slit-pupil
 * lock (chase with the eye ON you, and the help-cry run); PURSUIT =
 * the slashed ember eye (the committed blind run — sight broken,
 * still coming); HUNTING = the sweeping pupil of a searcher that
 * KNOWS someone is out there. One shared law so server encoding and
 * client badges can never drift.
 */
export const ALERT_ICON_NONE = 0;
export const ALERT_ICON_WARY = 1;
export const ALERT_ICON_ENGAGED = 2;
export const ALERT_ICON_HUNTING = 3;
export const ALERT_ICON_PURSUIT = 4;
export const ALERT_ICON_LOOKING = 5;

export interface SightLine {
  /** False when full-height mass seals the line. */
  clear: boolean;
  /** Trunk-masses (trees, rocks) crossed; 2+ reads as sealed. */
  cover: number;
}

/**
 * One sight ray over the tile grid — Amanatides & Woo traversal, the
 * standard voxel walk: visits every cell the segment crosses (a
 * corner crossing checks BOTH flanking cells, so a ray can never
 * thread the seam between two diagonal walls). The endpoints' own
 * cells are skipped — a body stands in neither a wall nor a trunk.
 * Cost is ~one map lookup per tile of distance.
 */
export function sightLine(
  src: CollisionSource,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): SightLine {
  let tx = Math.floor(x0);
  let ty = Math.floor(y0);
  const endTx = Math.floor(x1);
  const endTy = Math.floor(y1);
  let cover = 0;
  if (tx === endTx && ty === endTy) return { clear: true, cover };

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  // Parametric distance along the ray to the next tile-edge crossing,
  // and per-whole-tile stride, on each axis (Infinity = axis unused).
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMaxX =
    dx !== 0 ? (dx > 0 ? (tx + 1 - x0) / dx : (tx - x0) / dx) : Infinity;
  let tMaxY =
    dy !== 0 ? (dy > 0 ? (ty + 1 - y0) / dy : (ty - y0) / dy) : Infinity;

  const startTx = tx;
  const startTy = ty;
  const probe = (px: number, py: number): 'wall' | boolean => {
    // Endpoint cells never occlude — the looker and the looked-at
    // both stand somewhere sight must be allowed to reach.
    if ((px === endTx && py === endTy) || (px === startTx && py === startTy)) {
      return false;
    }
    if (!src.isSolid(px, py)) return false;
    const tile = src.tileAt?.(px, py);
    const mass = tile === undefined ? 'wall' : sightMass(tile);
    if (mass === 'wall') return 'wall';
    if (mass === 'cover') return true;
    return false;
  };

  const CORNER_EPS = 1e-9;
  // Exact-arithmetic bound on axis steps; the guard only matters if
  // float drift ever walks the traversal past its end cell.
  let guard = Math.abs(endTx - tx) + Math.abs(endTy - ty) + 4;
  while ((tx !== endTx || ty !== endTy) && guard-- > 0) {
    if (Math.abs(tMaxX - tMaxY) < CORNER_EPS) {
      // Dead through a corner: the ray grazes both flanking cells.
      // Either being wall seals the line; cover counts once.
      const hitA = probe(tx + stepX, ty);
      const hitB = probe(tx, ty + stepY);
      if (hitA === 'wall' || hitB === 'wall') return { clear: false, cover };
      if (hitA === true || hitB === true) cover++;
      tx += stepX;
      ty += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
    } else if (tMaxX < tMaxY) {
      tx += stepX;
      tMaxX += tDeltaX;
    } else {
      ty += stepY;
      tMaxY += tDeltaY;
    }
    if (tx === endTx && ty === endTy) break;
    const hit = probe(tx, ty);
    if (hit === 'wall') return { clear: false, cover };
    if (hit === true) cover++;
    if (cover >= 2) return { clear: true, cover };
  }
  return { clear: true, cover };
}

/** How well a sight-line resolves: 1 clean, dulled through one trunk, 0 sealed. */
export function sightVisibility(line: SightLine): number {
  if (!line.clear) return 0;
  if (line.cover === 0) return 1;
  if (line.cover === 1) return COVER_VIS_FACTOR;
  return 0;
}

export type SightZone = 'close' | 'cone' | 'peripheral';

/**
 * Which zone of the watcher's attention a point falls in, or null.
 * `closeRange` is passed by the caller because stealth shrinks it —
 * the crouched approach is exactly the art of thinning this ring.
 */
export function sightZone(
  dx: number,
  dy: number,
  dist: number,
  facingDir: number,
  arcDeg: number,
  range: number,
  closeRange: number = SIGHT_CLOSE_RANGE,
): SightZone | null {
  if (dist <= closeRange) return 'close';
  if (dist > range) return null;
  if (arcDeg >= 360) return 'cone';
  // Dot the facing against the bearing; compare against the half-arc
  // cosine — no atan2, no wrap bookkeeping.
  const cosHalf = Math.cos(((arcDeg / 2) * Math.PI) / 180);
  const d = dist > 1e-6 ? dist : 1e-6;
  const dot = (Math.cos(facingDir) * dx + Math.sin(facingDir) * dy) / d;
  if (dot >= cosHalf) return 'cone';
  if (dist <= range * SIGHT_PERIPHERAL_FRAC) return 'peripheral';
  return null;
}

/**
 * Awareness gained per tick while a body stands perceived: linear in
 * distance from point-blank rate to edge rate, halved in the
 * peripheral band. The close ring never rates — it detects outright.
 */
export function alertRate(dist: number, range: number, zone: SightZone): number {
  const t = range > 0 ? Math.min(1, Math.max(0, dist / range)) : 1;
  const base = ALERT_RATE_MAX + (ALERT_RATE_MIN - ALERT_RATE_MAX) * t;
  return zone === 'peripheral' ? base * PERIPHERAL_RATE : base;
}

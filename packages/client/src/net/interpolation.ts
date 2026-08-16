import { PoseState } from '@arx/shared';

export interface InterpSample {
  /** Server timeline, ms (serverTick * TICK_MS). */
  t: number;
  x: number;
  y: number;
  dir: number;
  pose: number;
  hpPct: number;
  /** STATUS_BIT u16 bitfield (state VFX flags + affliction stack nibble). */
  status: number;
  /** NPC alert telegraph (ALERT_ICON_*): the ?/! over the head. */
  alert: number;
}

const KEEP_MS = 2000;
const TAU = Math.PI * 2;
/**
 * How far past the newest sample we'll project a moving entity before
 * freezing it. Two jobs: (1) remote players keep WALKING through a
 * late snapshot burst instead of freeze-then-jumping; (2) projectiles
 * render on the server-NOW timeline, which is always ahead of their
 * newest sample by about one transit. Bounded so a despawned entity
 * can't sail off into fiction.
 */
const EXTRAP_MAX_MS = 150;
/** Velocity older than this is stale — don't project with it. */
const EXTRAP_PAIR_MAX_MS = 160;
/** Speed cap for projection, tiles/sec (covers arrows; rejects junk). */
const EXTRAP_MAX_SPEED = 30;
/**
 * Ballistic projection cap (v9). A projectile with a known speed rides
 * `last.dir` — trustworthy from the FIRST sample, so it earns a longer
 * leash than pair-derived velocity: server-NOW sits a one-way transit
 * ahead of the newest sample, and a 150ms cap made every >150ms-RTT
 * flight stall-and-leap once per tick. Flight still ends on `leave`.
 */
const EXTRAP_BALLISTIC_MS = 300;

/** Shortest signed angular distance a→b, in (-π, π]. */
export function shortestAngle(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function lerpAngle(a: number, b: number, t: number): number {
  return a + shortestAngle(a, b) * t;
}

/**
 * Per-remote-entity buffer of authoritative samples. Rendering samples
 * the buffer slightly in the past (INTERP_DELAY_MS) so there is almost
 * always a pair of snapshots to interpolate between.
 */
/** Fastest motion the smoother treats as legitimate, tiles/sec — a
 *  sprinting mount stays under this; a correction snap does not. */
const SMOOTH_MAX_SPEED = 12;
/** Beyond this a jump is a real teleport (tp, respawn, door): snap. */
const SMOOTH_SNAP_TILES = 3;
/** Visual offset half-life, ms: how fast a hidden correction bleeds
 *  away. Short enough to feel live, long enough to hide a 20Hz snap. */
const SMOOTH_HALF_LIFE_MS = 80;

export class InterpBuffer {
  private samples: InterpSample[] = [];
  /**
   * BALLISTIC TRUTH (v9): projectiles carry their flight speed on the
   * enter meta. When set, sampling past the newest sample projects
   * along that sample's `dir` at this speed — exact for straight
   * shots, tracks the newest heading for curving ones (homing,
   * boomerang return), and works from a single sample, so a fresh
   * shot never freezes at its spawn point waiting for a pair.
   */
  ballisticSpeed: number | null = null;
  /** RENDER CONTINUITY state — see sampleSmoothed. */
  private smTime: number | null = null;
  private smOut: InterpSample | null = null;
  private smRawX = 0;
  private smRawY = 0;
  private smErrX = 0;
  private smErrY = 0;

  push(s: InterpSample): void {
    const last = this.samples[this.samples.length - 1];
    if (last && s.t <= last.t) return; // stale or duplicate
    this.samples.push(s);
    const cutoff = s.t - KEEP_MS;
    while (this.samples.length > 2 && this.samples[0]!.t < cutoff) {
      this.samples.shift();
    }
  }

  latest(): InterpSample | undefined {
    return this.samples[this.samples.length - 1];
  }

  /**
   * RENDER CONTINUITY: sampleAt with the discontinuities hidden. A late
   * snapshot burst moves the sampled position in one visible snap —
   * extrapolation guessed, reality disagreed, or the buffer ran dry and
   * then refilled. Any frame-to-frame jump beyond plausible motion is
   * folded into a visual offset that decays with an 80ms half-life, so
   * the body GLIDES onto its corrected path instead of teleporting.
   * Real teleports (3+ tiles) still snap — nobody should watch a
   * neighbor slide across the map. Idempotent per timestamp: every
   * caller in one frame shares one answer.
   */
  sampleSmoothed(t: number): InterpSample | null {
    if (this.smTime === t) return this.smOut;
    const raw = this.sampleAt(t);
    if (!raw) {
      this.smTime = t;
      this.smOut = null;
      return null;
    }
    const prevT = this.smTime;
    const hadPrev = prevT !== null && this.smOut !== null;
    const dtMs = hadPrev ? t - prevT! : 0;
    if (hadPrev && dtMs > 0 && dtMs < 500) {
      const k = Math.pow(0.5, dtMs / SMOOTH_HALF_LIFE_MS);
      this.smErrX *= k;
      this.smErrY *= k;
      const jx = raw.x - this.smRawX;
      const jy = raw.y - this.smRawY;
      const jump = Math.hypot(jx, jy);
      const plausible = (SMOOTH_MAX_SPEED * dtMs) / 1000 + 0.02;
      if (jump >= SMOOTH_SNAP_TILES) {
        this.smErrX = 0;
        this.smErrY = 0;
      } else if (jump > plausible) {
        // Hold the body where it stood; the offset now carries the
        // whole disagreement and the decay walks it onto the truth.
        this.smErrX -= jx;
        this.smErrY -= jy;
        const mag = Math.hypot(this.smErrX, this.smErrY);
        if (mag > 1.5) {
          this.smErrX *= 1.5 / mag;
          this.smErrY *= 1.5 / mag;
        }
      }
    } else if (!hadPrev || dtMs >= 500) {
      // First sample, or the entity went unrendered for half a second —
      // nothing on screen to stay continuous with. (A slightly
      // backwards t — the interp delay slews — keeps the offset as-is.)
      this.smErrX = 0;
      this.smErrY = 0;
    }
    this.smRawX = raw.x;
    this.smRawY = raw.y;
    this.smTime = t;
    this.smOut =
      this.smErrX === 0 && this.smErrY === 0
        ? raw
        : { ...raw, x: raw.x + this.smErrX, y: raw.y + this.smErrY };
    return this.smOut;
  }

  /**
   * True while sampleSmoothed is still bleeding off a correction
   * offset: the body is GLIDING onto its authoritative path, and the
   * glide is presentation, not travel. Consumers that turn motion into
   * matter (the worn-light trail and wake) gate on this, so a standing
   * body taking a sub-3-tile correction cannot shed footprints at the
   * ~13 t/s the glide briefly reads as.
   */
  gliding(): boolean {
    return Math.abs(this.smErrX) + Math.abs(this.smErrY) > 0.02;
  }

  sampleAt(t: number): InterpSample | null {
    const n = this.samples.length;
    if (n === 0) return null;
    if (t <= this.samples[0]!.t) return this.samples[0]!;
    const last = this.samples[n - 1]!;
    if (t >= last.t) {
      if (this.ballisticSpeed !== null) {
        const ahead = Math.min(t - last.t, EXTRAP_BALLISTIC_MS);
        return {
          t: last.t + ahead,
          x: last.x + Math.cos(last.dir) * this.ballisticSpeed * (ahead / 1000),
          y: last.y + Math.sin(last.dir) * this.ballisticSpeed * (ahead / 1000),
          dir: last.dir,
          pose: last.pose,
          hpPct: last.hpPct,
          status: last.status,
          alert: last.alert,
        };
      }
      // BOUNDED EXTRAPOLATION: project along the newest velocity for up
      // to EXTRAP_MAX_MS, then hold. Velocity comes from the last pair
      // and must be fresh; a stationary entity never projects (no
      // orbiting around an idle body from dir noise).
      const prev = this.samples[n - 2];
      if (!prev) return last;
      const pairDt = last.t - prev.t;
      if (pairDt <= 0 || pairDt > EXTRAP_PAIR_MAX_MS) return last;
      const vx = (last.x - prev.x) / pairDt;
      const vy = (last.y - prev.y) / pairDt;
      const speed = Math.hypot(vx, vy) * 1000;
      if (speed < 0.15 || speed > EXTRAP_MAX_SPEED) return last;
      const ahead = Math.min(t - last.t, EXTRAP_MAX_MS);
      return {
        t: last.t + ahead,
        x: last.x + vx * ahead,
        y: last.y + vy * ahead,
        dir: last.dir,
        pose: last.pose,
        hpPct: last.hpPct,
        status: last.status,
        alert: last.alert,
      };
    }

    for (let i = n - 2; i >= 0; i--) {
      const a = this.samples[i]!;
      if (a.t <= t) {
        const b = this.samples[i + 1]!;
        const f = (t - a.t) / (b.t - a.t);
        // THE SEAT IS A TELEPORT, NOT A WALK: the server moves a body
        // ONTO the furniture anchor the tick it sits (and back to the
        // walk-up stand the tick it rises). Gliding across that flip
        // shows a floor-sitting body sliding into the chair — and the
        // seat resolve reads the approach tile, mis-sorting the rig
        // behind the furniture for the whole glide. Present the new
        // side of the boundary whole; the pose blends do the easing.
        const sitLie = (p: PoseState): boolean => p === PoseState.Sit || p === PoseState.Lie;
        if (sitLie(a.pose) !== sitLie(b.pose)) {
          return {
            t,
            x: b.x,
            y: b.y,
            dir: b.dir,
            pose: b.pose,
            hpPct: b.hpPct,
            status: b.status,
            alert: b.alert,
          };
        }
        return {
          t,
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          dir: lerpAngle(a.dir, b.dir, f),
          pose:
            b.pose === PoseState.Idle &&
            (a.pose === PoseState.Walk || a.pose === PoseState.Sneak)
              ? a.pose
              : b.pose,
          hpPct: b.hpPct,
          status: b.status,
          alert: b.alert,
        };
      }
    }
    return this.samples[0]!;
  }
}

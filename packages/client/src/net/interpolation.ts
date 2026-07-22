import { PoseState } from '@devcraft/shared';

export interface InterpSample {
  /** Server timeline, ms (serverTick * TICK_MS). */
  t: number;
  x: number;
  y: number;
  dir: number;
  pose: number;
  hpPct: number;
  /** STATUS_BIT bitfield (burn/chill/shock/bleed VFX). */
  status: number;
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

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/**
 * Per-remote-entity buffer of authoritative samples. Rendering samples
 * the buffer slightly in the past (INTERP_DELAY_MS) so there is almost
 * always a pair of snapshots to interpolate between.
 */
export class InterpBuffer {
  private samples: InterpSample[] = [];

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

  sampleAt(t: number): InterpSample | null {
    const n = this.samples.length;
    if (n === 0) return null;
    if (t <= this.samples[0]!.t) return this.samples[0]!;
    const last = this.samples[n - 1]!;
    if (t >= last.t) {
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
      };
    }

    for (let i = n - 2; i >= 0; i--) {
      const a = this.samples[i]!;
      if (a.t <= t) {
        const b = this.samples[i + 1]!;
        const f = (t - a.t) / (b.t - a.t);
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
        };
      }
    }
    return this.samples[0]!;
  }
}

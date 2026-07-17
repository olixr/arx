import { PoseState } from '@devcraft/shared';

export interface InterpSample {
  /** Server timeline, ms (serverTick * TICK_MS). */
  t: number;
  x: number;
  y: number;
  dir: number;
  pose: number;
  hpPct: number;
}

const KEEP_MS = 2000;
const TAU = Math.PI * 2;

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
    if (t >= last.t) return last; // hold position rather than extrapolate

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
          pose: b.pose === PoseState.Idle && a.pose === PoseState.Walk ? a.pose : b.pose,
          hpPct: b.hpPct,
        };
      }
    }
    return this.samples[0]!;
  }
}

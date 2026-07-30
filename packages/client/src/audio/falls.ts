/**
 * FALL EARSHOT — where falling water reaches the ear, pure and
 * testable. The renderer hangs curtains wherever THE SPILL LAW says
 * the world's water crosses a cliff contour (render/waterfalls.ts);
 * this scan asks the SAME law the same question around the listener,
 * so the sound and the sight can never disagree — a fall you can see
 * is a fall you can hear, and nothing hums where no curtain hangs.
 *
 * The scan walks a square of tiles around the ear, finds every
 * cardinal elevation boundary, and asks spillAt whether water actually
 * crosses it. Each spilling column contributes closeness²-weighted
 * loudness (taller drops weigh more), so the wide hero fall swells
 * naturally louder than a one-tile chute, and the weighted x-offset
 * of the columns seats the voice in stereo.
 *
 * Cost: ~1k elev reads plus a short spillAt walk per boundary tile in
 * earshot, throttled by the caller to the Riftgate scan's 2.5 Hz.
 */
import { spillAt } from '../render/waterfalls.js';

export interface FallEar {
  /** 0..1 gate for the fall voice — 0 is out of earshot. */
  near: number;
  /** Stereo seat of the falls' acoustic center, -1..1. */
  pan: number;
  /** 0..1 heft — stacked/tall drops lean the voice onto its rumble. */
  heft: number;
}

/** The silence every quiet scan returns (treat as frozen). */
export const SILENT_EAR: FallEar = { near: 0, pan: 0, heft: 0 };

/** Tiles at which a fall fades to nothing — also the scan radius, so
 *  closeness reaches exactly 0 at the scan edge and can never pop. */
export const FALL_EARSHOT = 16;

type Sampler = (tx: number, ty: number) => number | undefined;

export function scanFallEar(ground: Sampler, elev: Sampler, px: number, py: number): FallEar {
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  let loud = 0;
  let panAcc = 0;
  let hMax = 0;
  const boundary = (mx: number, my: number, nx: number, ny: number, level: number): void => {
    const d = Math.hypot(mx - px, my - py);
    const c = 1 - d / FALL_EARSHOT;
    if (c <= 0) return;
    const info = spillAt(ground, elev, mx, my, nx, ny, level);
    if (!info) return;
    const h = Math.max(1, level - info.landElev);
    const w = h * c * c;
    loud += w;
    panAcc += (mx - px) * w;
    if (h > hMax) hMax = h;
  };
  for (let ty = cy - FALL_EARSHOT; ty <= cy + FALL_EARSHOT; ty++) {
    for (let tx = cx - FALL_EARSHOT; tx <= cx + FALL_EARSHOT; tx++) {
      const e0 = elev(tx, ty) ?? 0;
      const eE = elev(tx + 1, ty) ?? 0;
      if (eE !== e0) {
        // East boundary between (tx,ty) and its neighbor — the normal
        // points at the low side, the level belongs to the high side.
        if (e0 > eE) boundary(tx + 1, ty + 0.5, 1, 0, e0);
        else boundary(tx + 1, ty + 0.5, -1, 0, eE);
      }
      const eS = elev(tx, ty + 1) ?? 0;
      if (eS !== e0) {
        if (e0 > eS) boundary(tx + 0.5, ty + 1, 0, 1, e0);
        else boundary(tx + 0.5, ty + 1, 0, -1, eS);
      }
    }
  }
  if (loud <= 0) return SILENT_EAR;
  // Soft-knee loudness: one modest chute at your feet murmurs, the
  // hero fall's wide two-level bank reaches full voice up close.
  const near = Math.min(1, Math.sqrt(loud / 8));
  const pan = Math.max(-0.65, Math.min(0.65, panAcc / loud / 9));
  const heft = Math.min(1, hMax / 2);
  return { near, pan, heft };
}

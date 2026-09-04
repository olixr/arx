/**
 * THE ONE RENDER (B6) — the per-ROW projection memo.
 *
 * Every per-tile scan that walks a fixed world ROW (constant `wy`, varying
 * `wx`) can project the whole row from THREE numbers instead of calling the
 * full homography per tile. Along one world row the perspective divisor is
 * constant — it depends only on the row's projected screen-y (`sy0`, a
 * function of `wy` alone), never on `wx` — so:
 *
 *   • the screen-y is the SAME for every tile in the row, and
 *   • the screen-x is an exact AFFINE function of `wx`:  x = xa + wx·xb.
 *
 * `rowProject` captures those three constants once (`y`, `xa`, `xb`); a
 * subsequent `rowProjectX(rp, wx)` is one multiply-add — no divide, no
 * `camOrigin` recompute, no allocation. The constants are read off
 * `projectWorld` itself (sampled at wx=0 and wx=1), so the memo is
 * IDENTICAL to per-call projection BY CONSTRUCTION at every q (the row's
 * x-map is exactly affine, and two samples define an affine map exactly).
 * At q=0 that is the plain ortho affine, so a caller stays byte-identical.
 *
 * Pinned by rowProject.test.ts against `projectWorld` across a spread of q,
 * rows and columns.
 */
import { projectWorld, type XY } from './cameraProject.js';

/** A world row's projection captured as an affine x-map + a constant y. */
export interface RowProj {
  /** Screen-y of every tile in this world row (constant along the row). */
  y: number;
  /** Screen-x at wx=0. */
  xa: number;
  /** Screen-x per unit wx (the row's affine slope). */
  xb: number;
}

// Module scratch for the two forward samples. Single-threaded; consumed
// synchronously inside rowProject before any re-entry, so shared is safe.
const _a: XY = { x: 0, y: 0 };
const _b: XY = { x: 0, y: 0 };

/**
 * Capture the projection of world row `wy` into `out` (alloc-free). After
 * this, `rowProjectX(out, wx)` gives the exact `projectWorld(...).x` for any
 * `wx` on the row, and `out.y` is its `projectWorld(...).y`.
 */
export function rowProject(
  scale: number,
  yScale: number,
  camX: number,
  camY: number,
  q: number,
  snapDpr: number,
  wy: number,
  w: number,
  h: number,
  out: RowProj,
): RowProj {
  projectWorld(scale, yScale, camX, camY, q, snapDpr, 0, wy, w, h, _a);
  projectWorld(scale, yScale, camX, camY, q, snapDpr, 1, wy, w, h, _b);
  out.y = _a.y;
  out.xa = _a.x;
  out.xb = _b.x - _a.x;
  return out;
}

/** Screen-x of world column `wx` on a captured row — one multiply-add. */
export function rowProjectX(rp: RowProj, wx: number): number {
  return rp.xa + wx * rp.xb;
}

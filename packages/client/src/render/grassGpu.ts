/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, phase G-1) — the
 * pure, tested substrate the instanced blade renderer consumes.
 *
 * Two load-bearing pieces, both backend-agnostic and node-verifiable:
 *  - grassWindGlsl(): THE ONE WIND, in GLSL — the exact `windAtInto`
 *    formula for the vertex shader, so GPU blades bend to the SAME wind
 *    field as the CPU trees and cloth. "ONE WIND, literally" — the
 *    formula shares the wind direction (WX/WY) with grass.ts and is
 *    pinned identical to the CPU reference by grassGpu.test.ts.
 *  - packBladeInstances(): the per-blade instance buffer. The Blade
 *    struct generateGrassTile already produces IS the instance record;
 *    this packs it into the interleaved Float32Array the instanced draw
 *    uploads (see docs/gpu-grass-proposal.md §4).
 */
import { WX, WY } from './grass.js';
import type { Blade } from './grass.js';

/** Floats per grass instance in the packed buffer. Layout:
 *  [rootX, rootY, height, halfWidth, lean, phase, tone, seg2]. */
export const GRASS_INSTANCE_FLOATS = 8;

/** Pack blades into the interleaved instance buffer the GL instanced
 *  draw consumes (one instance per blade). Reuses `out` when it fits —
 *  the per-tile buffers are pooled, not re-minted each frame. */
export function packBladeInstances(blades: readonly Blade[], out?: Float32Array): Float32Array {
  const need = blades.length * GRASS_INSTANCE_FLOATS;
  const buf = out && out.length >= need ? out : new Float32Array(need);
  for (let i = 0; i < blades.length; i++) {
    const b = blades[i]!;
    const o = i * GRASS_INSTANCE_FLOATS;
    buf[o] = b.bx;
    buf[o + 1] = b.by;
    buf[o + 2] = b.h;
    buf[o + 3] = b.w;
    buf[o + 4] = b.lean;
    buf[o + 5] = b.phase;
    buf[o + 6] = b.tone;
    buf[o + 7] = b.seg2 ? 1 : 0;
  }
  return buf;
}

/**
 * Build the world→clip `mat3` (column-major, 9 floats) the grass vertex
 * shader consumes as `uView` — for the ORTHO camera (q=0, the shipping
 * default). It composes the renderer's affine world→screen projection
 * (`screenX = wx·scale + ox`, `screenY = wy·scale·yScale + oy`, matching
 * cameraProject's q=0 fast path) with the GL screen→NDC map, folding in
 * the Y-FLIP the stage shader applies (`ndcY = 1 − 2·screenY/h`), so
 * `uView · vec3(world,1)` lands each blade root exactly where the canvas2d
 * meadow paints it. `ox`/`oy` are the snapped screen origins (camOriginX/Y);
 * `w`/`h` are the frame's CSS pixel dimensions. Alloc-free with `out`.
 *
 * NOTE q>0 (camera lean): a lean is a true projective map needing a
 * per-vertex w — not expressible in this affine mat3, and the shader
 * currently forces gl_Position.w = 1. The live camera ships q=0, so this
 * is exact today; the lean is a later sub-phase (proposal G-2, the lean).
 */
export function grassViewMatrix(
  scale: number,
  yScale: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  out?: Float32Array,
): Float32Array {
  const m = out && out.length >= 9 ? out : new Float32Array(9);
  // column 0 (∂ndc/∂wx), column 1 (∂ndc/∂wy), column 2 (translation)
  m[0] = (2 * scale) / w;   m[1] = 0;                       m[2] = 0;
  m[3] = 0;                 m[4] = (-2 * scale * yScale) / h; m[5] = 0;
  m[6] = (2 * ox) / w - 1;  m[7] = 1 - (2 * oy) / h;         m[8] = 1;
  return m;
}

/**
 * THE ONE WIND in GLSL. Returns `vec4(bendX, bendY, strength, lum)` —
 * the same four fields as WindSample — for a world point `w` at time
 * `t`. The wind direction (WX/WY) is templated from grass.ts so the two
 * cannot drift on the axis; the coefficients mirror `windAtInto` and are
 * pinned by the parity test. The vertex shader calls this per blade to
 * bend it exactly as the CPU meadow does.
 */
export function grassWindGlsl(): string {
  return `
vec4 grassWind(vec2 w, float t) {
  float along = w.x * ${WX} + w.y * ${WY};
  float across = -w.x * ${WY} + w.y * ${WX};
  float frontBend = 0.9 * sin(across * 0.055 + t * 0.13);
  float gust = 0.6 + 0.4 * sin(along * 0.05 - t * 0.34 + frontBend);
  float sway = 0.72 * sin(along * 0.12 - t * 1.25 + 0.35 * frontBend)
             + 0.28 * sin(along * 0.2 - t * 1.9 + 0.7);
  float s = gust * (0.4 + sway);
  float meander = 0.3 * sin(across * 0.14 - t * 0.7 + along * 0.05);
  float l = 0.62 * sin(along * 0.035 - t * 0.3 + 0.5 * frontBend)
          + 0.38 * sin(along * 0.07 - t * 0.75 + across * 0.02);
  return vec4(${WX} * s - ${WY} * meander, ${WY} * s + ${WX} * meander, s, l);
}`;
}

/**
 * A JS transcription of grassWindGlsl — FOR THE PARITY TEST ONLY. It is
 * the GLSL formula line-for-line in JS, so asserting it equals the CPU
 * `windAtInto` proves the shader bends blades to the exact same wind.
 * Keep it in lockstep with grassWindGlsl above (the test fails if they
 * or windAtInto drift).
 */
export function grassWindMirror(wx: number, wy: number, t: number): { bx: number; by: number; s: number; l: number } {
  const along = wx * WX + wy * WY;
  const across = -wx * WY + wy * WX;
  const frontBend = 0.9 * Math.sin(across * 0.055 + t * 0.13);
  const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - t * 0.34 + frontBend);
  const sway =
    0.72 * Math.sin(along * 0.12 - t * 1.25 + 0.35 * frontBend) +
    0.28 * Math.sin(along * 0.2 - t * 1.9 + 0.7);
  const s = gust * (0.4 + sway);
  const meander = 0.3 * Math.sin(across * 0.14 - t * 0.7 + along * 0.05);
  const l =
    0.62 * Math.sin(along * 0.035 - t * 0.3 + 0.5 * frontBend) +
    0.38 * Math.sin(along * 0.07 - t * 0.75 + across * 0.02);
  return { bx: WX * s - WY * meander, by: WY * s + WX * meander, s, l };
}

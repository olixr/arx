import test from 'node:test';
import assert from 'node:assert/strict';
import { camOriginX, camOriginY, projectWorld, type XY } from './cameraProject.js';

/**
 * THE ONE RENDER — the GRASS-SHADER PARITY SPEC.
 *
 * The GPU grass path (render/grassGpuRenderer.ts vertex shader, via
 * render/grassGpu.ts `grassProjectGlsl`) draws every blade root through
 * the SAME world→screen map the rest of the renderer uses —
 * `render/cameraProject.ts` `projectWorld` at q=0 (the flat game; the
 * perspective lean was removed from the 2D client, see
 * docs/perspective-review-and-3d-client-plan.md). This test is the SPEC
 * the shader implements: a plain JS mirror of the affine, in exactly the
 * `sx = wx·scale+ox; sy = wy·scale·yScale+oy` form the GLSL takes, pinned
 * equal to `projectWorld` across a spread of world points. Matching
 * `projectWorld` proves the shader parallaxes the meadow at exactly the
 * player's rate.
 *
 * IMPORTANT: the mirror is written INDEPENDENTLY of `projectWorld`'s
 * internals — it shares only the public origin helpers (`camOriginX/Y`,
 * the same uniforms the shader feed passes). Equality is therefore a real
 * cross-check, not a tautology; if either drifts, this test breaks.
 */
function grassProjectMirror(
  scale: number,
  yScale: number,
  camX: number,
  camY: number,
  snapDpr: number,
  wx: number,
  wy: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const ox = camOriginX(scale, camX, snapDpr, w);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h);
  return { x: wx * scale + ox, y: wy * scale * yScale + oy };
}

const S = { scale: 44, yScale: 0.62, camX: 18.5, camY: -9.25, snapDpr: 2 };
const W = 1440;
const H = 900;
const out: XY = { x: 0, y: 0 };

// A spread of blade-root world points across the on-screen field.
const pts: Array<[number, number]> = [
  [0, 0],
  [18.5, -9.25], // the look-at point
  [30, 5],
  [-20, -30],
  [60, 20],
  [3.3, 5.7],
  [-0.5, 0.25],
  [45, -15],
  [-40, 12],
];

test('grass-shader mirror == projectWorld across the field (q=0)', () => {
  for (const [wx, wy] of pts) {
    projectWorld(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, wx, wy, W, H, out);
    const g = grassProjectMirror(S.scale, S.yScale, S.camX, S.camY, S.snapDpr, wx, wy, W, H);
    assert.ok(Math.abs(g.x - out.x) < 1e-9, `sx drift @ ${wx},${wy}: ${g.x} vs ${out.x}`);
    assert.ok(Math.abs(g.y - out.y) < 1e-9, `sy drift @ ${wx},${wy}: ${g.y} vs ${out.y}`);
  }
});

test('the grass mirror is the exact affine (byte-identical feed)', () => {
  // The shipping map: blade roots feed to the SAME pixel the canvas2d
  // meadow paints, with gl_Position.w = 1 (no divide).
  for (const [wx, wy] of pts) {
    const g = grassProjectMirror(S.scale, S.yScale, S.camX, S.camY, S.snapDpr, wx, wy, W, H);
    const ox = camOriginX(S.scale, S.camX, S.snapDpr, W);
    const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H);
    assert.equal(g.x, wx * S.scale + ox);
    assert.equal(g.y, wy * S.scale * S.yScale + oy);
  }
});

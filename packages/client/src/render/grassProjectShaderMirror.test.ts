import test from 'node:test';
import assert from 'node:assert/strict';
import { camOriginX, camOriginY, projectWorld, type XY } from './cameraProject.js';
import { grassProjectGlsl, grassProjectMirror } from './grassGpu.js';

/**
 * THE ONE RENDER — the SHIPPED grass shader mirror == projectWorld.
 *
 * `grassProjectMirror` (render/grassGpu.ts) is the JS twin of the GLSL
 * `grassProjectGlsl()` the grass vertex shaders actually run — line-for-line
 * the same screen-space arithmetic (`sx = wx·scale+ox; sy = wy·scale·yScale
 * +oy`). This test pins that mirror equal to the renderer's canonical
 * `projectWorld` (at q=0, the flat game) across a spread of blade roots.
 * When the two agree, the meadow projects through the SAME map as the
 * world → it parallaxes at exactly the player's rate, and cannot drift
 * from it silently.
 *
 * This COMPLEMENTS grassProjectParity.test.ts (the spec, whose mirror is
 * re-derived independently): here the mirror is the very code shipped beside
 * the GLSL, so the port itself — not just the spec — is guarded.
 */

// The feed's projection inputs (renderer.ts drawGrassGpu). The shader takes
// the origin the feed resolves with camOriginX/Y.
const S = { scale: 44, yScale: 0.62, camX: 18.5, camY: -9.25, snapDpr: 2 };
const W = 1440;
const H = 900;
const out: XY = { x: 0, y: 0 };

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

test('shipped grass mirror == projectWorld across the field (q=0)', () => {
  const ox = camOriginX(S.scale, S.camX, S.snapDpr, W);
  const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H);
  for (const [wx, wy] of pts) {
    projectWorld(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, wx, wy, W, H, out);
    const g = grassProjectMirror(S.scale, S.yScale, ox, oy, wx, wy);
    assert.ok(Math.abs(g.x - out.x) < 1e-9, `sx drift @ ${wx},${wy}: ${g.x} vs ${out.x}`);
    assert.ok(Math.abs(g.y - out.y) < 1e-9, `sy drift @ ${wx},${wy}: ${g.y} vs ${out.y}`);
  }
});

test('the shipped GLSL is the plain affine with w = 1 (no divide, no lean uniform)', () => {
  const src = grassProjectGlsl();
  assert.match(src, /uniform vec2 uOrigin;/);
  assert.match(src, /world\.x \* uScale \+ uOrigin\.x/);
  assert.match(src, /world\.y \* uScale \* uYScale \+ uOrigin\.y/);
  assert.match(src, /return vec4\(ndcX, ndcY, 0\.0, 1\.0\);/);
  assert.doesNotMatch(src, /uQ|wdiv|GRASS_MIN_W/);
});

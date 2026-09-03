import test from 'node:test';
import assert from 'node:assert/strict';
import { camOriginX, camOriginY, depthScaleWorld, projectWorld, type XY } from './cameraProject.js';
import { grassProjectMirror, GRASS_MIN_W } from './grassGpu.js';

/**
 * THE ONE RENDER — B2: the SHIPPED grass shader mirror == projectWorld.
 *
 * `grassProjectMirror` (render/grassGpu.ts) is the JS twin of the GLSL
 * `grassProjectGlsl()` the grass vertex shaders actually run — line-for-line
 * the same screen-space arithmetic (`sx0 = wx·scale+ox; wdiv = max(MIN_W,
 * 1 − q·(sy0−cy)); sx = cx + (sx0−cx)/wdiv; …`). This test pins that mirror
 * equal to the renderer's canonical `projectWorld` across a spread of blade
 * roots and q ∈ {0, 0.0005, 0.0013, 0.003}. When the two agree, the meadow
 * projects through the SAME homography as the world → it parallaxes at
 * exactly the player's rate (the B2 fix), and cannot drift from it silently.
 *
 * This COMPLEMENTS grassProjectParity.test.ts (the F0 spec, whose mirror is
 * re-derived independently): here the mirror is the very code shipped beside
 * the GLSL, so the port itself — not just the spec — is guarded.
 */

// The feed's projection inputs (renderer.ts drawGrassGpu). The shader takes
// the origin the feed resolves with camOriginX/Y(..., q): snapped at q=0,
// UNSNAPPED under a lean (no pre-divide sawtooth to amplify).
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

const QS = [0, 0.0005, 0.0013, 0.003];

test('shipped grass mirror == projectWorld across q and the field (B2 port)', () => {
  for (const q of QS) {
    const ox = camOriginX(S.scale, S.camX, S.snapDpr, W, q);
    const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q);
    for (const [wx, wy] of pts) {
      projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, wx, wy, W, H, out);
      const g = grassProjectMirror(S.scale, S.yScale, ox, oy, q, wx, wy, W, H);
      assert.ok(Math.abs(g.x - out.x) < 1e-9, `sx drift q=${q} @ ${wx},${wy}: ${g.x} vs ${out.x}`);
      assert.ok(Math.abs(g.y - out.y) < 1e-9, `sy drift q=${q} @ ${wx},${wy}: ${g.y} vs ${out.y}`);
    }
  }
});

test('shipped mirror wDiv == 1/depthScale (the shader pre-divide)', () => {
  // The shader does the perspective divide in-shader (gl_Position.w = 1), so
  // the wDiv it divides by is the ground's depthScale divisor — short and
  // tall grass foreshorten together instead of the field sliding.
  for (const q of QS) {
    const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q);
    for (const [, wy] of pts) {
      const g = grassProjectMirror(S.scale, S.yScale, 0, oy, q, 0, wy, W, H);
      const ds = depthScaleWorld(S.scale, S.yScale, S.camY, q, wy);
      assert.ok(Math.abs(1 / g.wDiv - ds) < 1e-9, `wDiv≠1/depthScale q=${q} wy=${wy}: ${1 / g.wDiv} vs ${ds}`);
    }
  }
});

test('the mirror clamps to the same MIN_W floor as cameraProject', () => {
  // A blade root pushed past the near singularity clamps at GRASS_MIN_W and
  // matches projectWorld's own clamp — the two floors cannot drift.
  const q = 0.02; // steep enough to drive a near point into the clamp
  const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, q);
  const ox = camOriginX(S.scale, S.camX, S.snapDpr, W, q);
  const wy = 40; // deep in the near field
  const g = grassProjectMirror(S.scale, S.yScale, ox, oy, q, 10, wy, W, H);
  const sy0 = wy * S.scale * S.yScale + oy;
  const wdiv = Math.max(GRASS_MIN_W, 1 - q * (sy0 - H / 2));
  assert.equal(wdiv, GRASS_MIN_W, 'test point should exercise the clamp');
  projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, 10, wy, W, H, out);
  assert.ok(Math.abs(g.x - out.x) < 1e-9 && Math.abs(g.y - out.y) < 1e-9, 'clamped point still matches projectWorld');
});

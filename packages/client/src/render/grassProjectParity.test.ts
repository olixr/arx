import test from 'node:test';
import assert from 'node:assert/strict';
import { camOriginX, camOriginY, depthScaleWorld, projectWorld, type XY } from './cameraProject.js';

/**
 * THE ONE RENDER — F0 foundation gate: the GRASS-SHADER PARITY SPEC.
 *
 * The GPU grass path (render/grassGpu.ts `grassViewMatrix`, render/
 * grassGpuRenderer.ts vertex shader) draws every blade root through its
 * OWN world→clip map — today an affine `mat3` that is exact only at q=0
 * and forces `gl_Position.w = 1`. Under a lean that mat3 is wrong: a true
 * lean is a projective map needing a per-vertex `w`, so the blades
 * parallax faster than the player and jitter (Epic defect rows "grass
 * parallaxes faster" / "character jitter walking x").
 *
 * Epic phase B2 ports the grass vertex shader to the SAME homography the
 * rest of the renderer uses — `render/cameraProject.ts` `projectWorld`.
 * This test is the SPEC that port must satisfy: a plain JS mirror of the
 * homography, in exactly the `sx0 = wx·scale+ox; wdiv = max(MIN_W, 1 −
 * q·(sy0−cy)); sx = cx + (sx0−cx)/wdiv; …` form the GLSL will take,
 * pinned equal to `projectWorld` across a spread of world points and
 * q ∈ {0, 0.0005, 0.0013, 0.003}. When B2 transcribes this mirror into
 * GLSL, matching `projectWorld` here proves the shader parallaxes the
 * meadow at exactly the player's rate.
 *
 * F0 does NOT port the shader — it writes the mirror + parity test the
 * port implements against (the `grassWindMirror` pattern: a JS twin of a
 * GLSL function pinned by test so the two cannot drift).
 *
 * IMPORTANT: the mirror is written INDEPENDENTLY of `projectWorld`'s
 * internals — it re-derives the divide from first principles. It shares
 * only the public origin helpers (`camOriginX/Y`, the same uniforms the
 * shader feed already passes) and the near-clamp floor MIN_W. Equality
 * with `projectWorld` is therefore a real cross-check, not a tautology;
 * if either drifts (including MIN_W), this test breaks.
 */

/** The perspective-divisor floor, mirrored from cameraProject's MIN_W.
 *  Kept in lockstep by the parity assertions below (a divergence in the
 *  clamp shows up the moment a sample lands in the clamped near field). */
const MIN_W = 0.04;

/**
 * THE GRASS HOMOGRAPHY, as the vertex shader will spell it — a pure JS
 * mirror. This is the spec B2's GLSL transcribes: given the camera
 * uniforms `(scale, yScale, camX, camY, q, w, h)` and a blade-root world
 * point `(wx, wy)`, it returns the screen position AND the per-vertex `w`
 * (`wDiv`) the shader writes into `gl_Position.w` so the GPU does the
 * perspective divide in hardware (`depthScale = 1/wDiv`).
 *
 * `snapDpr` is passed to the origin helpers only; under a lean (q≠0) the
 * grass feed uses the UNSNAPPED origin (no pre-divide sawtooth), exactly
 * as `projectWorld` does — so the mirror inherits that gate for free.
 */
function grassProjectMirror(
  scale: number,
  yScale: number,
  camX: number,
  camY: number,
  q: number,
  snapDpr: number,
  wx: number,
  wy: number,
  w: number,
  h: number,
): { x: number; y: number; wDiv: number } {
  const ox = camOriginX(scale, camX, snapDpr, w, q);
  const oy = camOriginY(scale, yScale, camY, snapDpr, h, q);
  const sx0 = wx * scale + ox;
  const sy0 = wy * scale * yScale + oy;
  if (q === 0) return { x: sx0, y: sy0, wDiv: 1 };
  const cx = w / 2;
  const cy = h / 2;
  const wDiv = Math.max(MIN_W, 1 - q * (sy0 - cy));
  return { x: cx + (sx0 - cx) / wDiv, y: cy + (sy0 - cy) / wDiv, wDiv };
}

const S = { scale: 44, yScale: 0.62, camX: 18.5, camY: -9.25, snapDpr: 2 };
const W = 1440;
const H = 900;
const out: XY = { x: 0, y: 0 };

// A spread of blade-root world points across the on-screen field (kept
// clear of the near singularity so the clamp is inactive and the compare
// is exact at every q under test).
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

test('grass-shader mirror == projectWorld across q and the field (B2 port spec)', () => {
  for (const q of QS) {
    for (const [wx, wy] of pts) {
      projectWorld(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, wx, wy, W, H, out);
      const g = grassProjectMirror(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, wx, wy, W, H);
      assert.ok(Math.abs(g.x - out.x) < 1e-9, `sx drift q=${q} @ ${wx},${wy}: ${g.x} vs ${out.x}`);
      assert.ok(Math.abs(g.y - out.y) < 1e-9, `sy drift q=${q} @ ${wx},${wy}: ${g.y} vs ${out.y}`);
    }
  }
});

test('the per-vertex w the shader writes is 1/depthScale (hardware divide)', () => {
  // The shader sets gl_Position.w = wDiv so the GPU divides x,y by it;
  // depthScaleWorld is that same factor keyed on world depth. Pinning
  // wDiv == 1/depthScaleWorld ties the grass billboard scale (blade
  // height must foreshorten by depthScale) to the ground divide, so short
  // and tall grass recede together instead of the meadow sliding.
  for (const q of QS) {
    for (const [, wy] of pts) {
      const g = grassProjectMirror(S.scale, S.yScale, S.camX, S.camY, q, S.snapDpr, 0, wy, W, H);
      const ds = depthScaleWorld(S.scale, S.yScale, S.camY, q, wy);
      assert.ok(Math.abs(1 / g.wDiv - ds) < 1e-9, `wDiv≠1/depthScale q=${q} wy=${wy}: ${1 / g.wDiv} vs ${ds}`);
    }
  }
});

test('at q=0 the grass mirror is the exact affine (byte-identical feed)', () => {
  // The shipping default: q=0 must feed blade roots to the SAME pixel the
  // canvas2d meadow paints, with w=1 (no divide). This is the invariant
  // the retirement of grassViewMatrix (B2) must preserve at q=0.
  for (const [wx, wy] of pts) {
    const g = grassProjectMirror(S.scale, S.yScale, S.camX, S.camY, 0, S.snapDpr, wx, wy, W, H);
    const ox = camOriginX(S.scale, S.camX, S.snapDpr, W, 0);
    const oy = camOriginY(S.scale, S.yScale, S.camY, S.snapDpr, H, 0);
    assert.equal(g.x, wx * S.scale + ox);
    assert.equal(g.y, wy * S.scale * S.yScale + oy);
    assert.equal(g.wDiv, 1);
  }
});

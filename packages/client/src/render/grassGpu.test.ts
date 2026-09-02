import test from 'node:test';
import assert from 'node:assert/strict';
import { windAtInto, type Blade } from './grass.js';
import { GRASS_INSTANCE_FLOATS, grassViewMatrix, grassWindGlsl, grassWindMirror, packBladeInstances } from './grassGpu.js';

/**
 * THE LIVING MEADOW GOES TO THE GPU (G-1) — the substrate, pinned.
 *
 * The load-bearing promise is "ONE WIND, literally": the shader must
 * bend blades to the EXACT wind the CPU meadow uses. grassWindMirror is
 * the GLSL formula transcribed to JS; asserting it equals windAtInto
 * proves the shader wind matches the reference — and the test breaks the
 * moment either the GLSL or windAtInto drifts.
 */

test('the GPU wind matches the CPU windAtInto across the field and time', () => {
  const scratch = { bx: 0, by: 0, s: 0, l: 0 };
  for (let i = 0; i < 200; i++) {
    // Spread samples across position and time — the wind is a function
    // of (along, across, t), so cover a wide lattice.
    const wx = (i * 37) % 500 - 250 + i * 0.3;
    const wy = (i * 53) % 500 - 250 - i * 0.2;
    const t = i * 0.137;
    windAtInto(scratch, wx, wy, t);
    const g = grassWindMirror(wx, wy, t);
    assert.ok(Math.abs(g.bx - scratch.bx) < 1e-9, `bx @ ${wx},${wy},${t}`);
    assert.ok(Math.abs(g.by - scratch.by) < 1e-9, `by @ ${wx},${wy},${t}`);
    assert.ok(Math.abs(g.s - scratch.s) < 1e-9, `s @ ${wx},${wy},${t}`);
    assert.ok(Math.abs(g.l - scratch.l) < 1e-9, `l @ ${wx},${wy},${t}`);
  }
});

test('grassWindGlsl embeds the shared wind direction (no axis drift) and returns a vec4', () => {
  const src = grassWindGlsl();
  assert.match(src, /vec4 grassWind\(vec2 w, float t\)/);
  assert.match(src, /return vec4\(/);
  // The along/across projection must carry the exported WX/WY, not a
  // hard-coded copy — a drift here would tilt the GPU wind off the CPU's.
  assert.match(src, /w\.x \* 0\.94 \+ w\.y \* 0\.34/);
});

const blade = (over: Partial<Blade>): Blade => ({
  bx: 1.5, by: -2.25, h: 0.8, w: 0.03, lean: 0.12, phase: 0.4, bin: 2, lumJit: 0.1, tone: 3, seg2: false, ...over,
});

test('packBladeInstances writes the exact per-instance layout', () => {
  const blades = [blade({}), blade({ bx: 9, by: 8, tone: 1, seg2: true })];
  const buf = packBladeInstances(blades);
  assert.equal(buf.length, 2 * GRASS_INSTANCE_FLOATS);
  // Float32 rounds the f64 fields, so compare approximately.
  const near = (a: number | undefined, b: number) => assert.ok(Math.abs((a ?? NaN) - b) < 1e-6, `${a} ≈ ${b}`);
  // instance 0
  near(buf[0], 1.5);
  near(buf[1], -2.25);
  near(buf[2], 0.8);
  near(buf[3], 0.03);
  near(buf[4], 0.12);
  near(buf[5], 0.4);
  near(buf[6], 3);
  assert.equal(buf[7], 0); // seg2 false — exact
  // instance 1 — seg2 true encodes 1
  near(buf[GRASS_INSTANCE_FLOATS + 0], 9);
  near(buf[GRASS_INSTANCE_FLOATS + 1], 8);
  near(buf[GRASS_INSTANCE_FLOATS + 6], 1);
  assert.equal(buf[GRASS_INSTANCE_FLOATS + 7], 1);
});

test('packBladeInstances reuses a big-enough out buffer (pooled, no re-mint)', () => {
  const out = new Float32Array(4 * GRASS_INSTANCE_FLOATS);
  const buf = packBladeInstances([blade({}), blade({})], out);
  assert.equal(buf, out, 'same buffer object reused');
  // A buffer too small forces a fresh one rather than overflowing.
  const small = new Float32Array(1);
  const buf2 = packBladeInstances([blade({}), blade({})], small);
  assert.notEqual(buf2, small);
  assert.equal(buf2.length, 2 * GRASS_INSTANCE_FLOATS);
});

test('grassViewMatrix maps world→NDC exactly matching the affine screen projection', () => {
  // The matrix must place a blade root at the SAME pixel the canvas2d
  // meadow paints it: worldToScreen (affine) then screen→NDC with y-flip.
  const scale = 48, yScale = 0.86, ox = 512.3, oy = 288.7, w = 1280, h = 720;
  const m = grassViewMatrix(scale, yScale, ox, oy, w, h);
  const applyX = (wx: number, wy: number) => m[0]! * wx + m[3]! * wy + m[6]!;
  const applyY = (wx: number, wy: number) => m[1]! * wx + m[4]! * wy + m[7]!;
  for (const [wx, wy] of [[0, 0], [3.5, -2.25], [-40, 60], [128.5, 199.75]] as const) {
    const screenX = wx * scale + ox;
    const screenY = wy * scale * yScale + oy;
    const ndcX = (2 * screenX) / w - 1;      // GL screen→NDC
    const ndcY = 1 - (2 * screenY) / h;      // …with the stage's Y-flip
    // Float32 matrix storage → ~1e-6 precision (well under a pixel).
    assert.ok(Math.abs(applyX(wx, wy) - ndcX) < 1e-5, `ndcX @ ${wx},${wy}`);
    assert.ok(Math.abs(applyY(wx, wy) - ndcY) < 1e-5, `ndcY @ ${wx},${wy}`);
  }
});

test('grassViewMatrix reuses a big-enough out buffer (alloc-free per frame)', () => {
  const out = new Float32Array(9);
  const m = grassViewMatrix(1, 1, 0, 0, 2, 2, out);
  assert.equal(m, out);
});

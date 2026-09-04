import test from 'node:test';
import assert from 'node:assert/strict';
import { windAtInto, type Blade } from './grass.js';
import { GRASS_INSTANCE_FLOATS, grassViewMatrix, grassWindGlsl, grassWindMirror, packBladeInstances } from './grassGpu.js';
import { grassShadowOffset, grassShadowVertSrc, shadeRgb01 } from './grassGpuShadow.js';

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

// ---------------------------------------------------------------- G1

import { partitionTallBands, bandNdcRemap, grassProjectMirror } from './grassGpu.js';

test('partitionTallBands buckets a by-sorted array into contiguous row bands', () => {
  // by-sorted blades straddling three 1/3-tile buckets around row 10.
  const pitch = 1 / 3;
  const blades = [
    { by: 10.02 }, { by: 10.10 }, // bucket 30
    { by: 10.34 }, { by: 10.40 }, { by: 10.66 - 0.001 }, // bucket 31
    { by: 10.70 }, // bucket 32
  ];
  const bands = partitionTallBands(blades, pitch);
  assert.equal(bands.length, 3, 'three occupied buckets → three bands');
  // Contiguous, covering the whole array with no gaps/overlaps.
  let expectI0 = 0;
  for (const b of bands) {
    assert.equal(b.i0, expectI0, 'bands are contiguous slices');
    expectI0 += b.count;
  }
  assert.equal(expectI0, blades.length, 'bands cover every blade exactly once');
  // sortY is the bucket CENTRE (interleave error ≤ pitch/2).
  assert.ok(Math.abs(bands[0]!.sortY - (30.5 * pitch)) < 1e-9);
  assert.ok(Math.abs(bands[1]!.sortY - (31.5 * pitch)) < 1e-9);
  // Band extents track the blades they hold.
  assert.ok(bands[0]!.minBy <= 10.02 && bands[0]!.maxBy >= 10.10);
});

test('partitionTallBands sortY is monotonic so bands paint back-to-front', () => {
  const blades = Array.from({ length: 40 }, (_, i) => ({ by: i * 0.05 }));
  const bands = partitionTallBands(blades, 1 / 3);
  for (let i = 1; i < bands.length; i++) {
    assert.ok(bands[i]!.sortY > bands[i - 1]!.sortY, 'sortY strictly increases');
    assert.ok(bands[i]!.i0 === bands[i - 1]!.i0 + bands[i - 1]!.count);
  }
});

test('partitionTallBands handles the empty field', () => {
  assert.deepEqual(partitionTallBands([], 1 / 3), []);
});

test('bandNdcRemap maps a band screen rect onto its atlas slot (both corners)', () => {
  // Full screen 1000×720 css at dpr 2 → device 2000×1440. Atlas 900×3000.
  const SW = 2000, SH = 1440, AW = 900, AH = 3000;
  const bandSx = 300, bandSy = 500; // device px, band screen bbox origin
  const ax = 0, ay = 1200; // device px, atlas slot origin
  const r = bandNdcRemap(SW, SH, AW, AH, bandSx, bandSy, ax, ay);
  // A real-screen device point maps to a real-screen NDC, then the remap
  // must land it at the atlas-NDC of the corresponding atlas device point.
  const check = (dx: number, dy: number, adx: number, ady: number) => {
    const ndcX = (2 * dx) / SW - 1;
    const ndcY = 1 - (2 * dy) / SH;
    const outX = ndcX * r.sx + r.bx;
    const outY = ndcY * r.sy + r.by;
    const wantX = (2 * adx) / AW - 1;
    const wantY = 1 - (2 * ady) / AH;
    assert.ok(Math.abs(outX - wantX) < 1e-9, `x @ ${dx},${dy}`);
    assert.ok(Math.abs(outY - wantY) < 1e-9, `y @ ${dx},${dy}`);
  };
  // Origin corner → slot origin; opposite corner → slot + same size.
  check(bandSx, bandSy, ax, ay);
  check(bandSx + 400, bandSy + 250, ax + 400, ay + 250);
});

test('bandNdcRemap identity-slot reproduces the plain screen NDC', () => {
  // Slot == whole screen at the same size → the remap is a no-op (sx=sy=1,
  // bias=0), i.e. byte-identical to the un-retargeted short-coat path.
  const S = 1600, H = 900;
  const r = bandNdcRemap(S, H, S, H, 0, 0, 0, 0);
  assert.ok(Math.abs(r.sx - 1) < 1e-12 && Math.abs(r.sy - 1) < 1e-12);
  assert.ok(Math.abs(r.bx) < 1e-12 && Math.abs(r.by) < 1e-12);
});

test('grassProjectMirror q=0 is the plain affine (interleave bbox uses it)', () => {
  const p = grassProjectMirror(48, 0.86, 500, 300, 0, 3, -2, 1000, 720);
  assert.ok(Math.abs(p.x - (3 * 48 + 500)) < 1e-9);
  assert.ok(Math.abs(p.y - (-2 * 48 * 0.86 + 300)) < 1e-9);
  assert.equal(p.wDiv, 1);
});

/**
 * G2 — THE MEADOW CASTS ITS OWN SHADE. The cast shader must be thrown by
 * the SAME wind and projected through the SAME homography as the blades
 * (uniform, radius-free, perspective-correct), and its ground throw must
 * fold the sky shear to world units so it lands where the CPU shade did.
 */
test('the grass cast shader embeds the shared wind and projection', () => {
  const src = grassShadowVertSrc();
  assert.match(src, /grassWind\(iRoot/); // thrown by the one wind
  assert.match(src, /grassProject\(world\)/); // through the one homography
  assert.match(src, /uShadow \* H/); // ground throw scales with world height
});

test('grassShadowOffset folds the sky shear to a world-ground vector', () => {
  // The scale (and yScale) factors cancel between the CPU screen throw and
  // our world quad's projection, so the world offset is just dir·len.
  const o = grassShadowOffset(-0.6, 0.8, 1.5);
  assert.ok(Math.abs(o.x - -0.6 * 1.5) < 1e-12, 'x');
  assert.ok(Math.abs(o.y - 0.8 * 1.5) < 1e-12, 'y');
  // A flat sun (no shade length) throws nothing.
  const z = grassShadowOffset(-0.6, 0.8, 0);
  assert.ok(z.x === 0, 'x zero');
  assert.ok(z.y === 0, 'y zero');
});

test('shadeRgb01 parses the shade hex to 0..1 rgb', () => {
  const [r, g, b] = shadeRgb01('#180e20');
  assert.ok(Math.abs(r - 0x18 / 255) < 1e-9);
  assert.ok(Math.abs(g - 0x0e / 255) < 1e-9);
  assert.ok(Math.abs(b - 0x20 / 255) < 1e-9);
});

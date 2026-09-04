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

import { partitionTallBands, bandNdcRemap, grassProjectMirror, coalesceTallBands } from './grassGpu.js';

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

// ------------------------------------------------ G-PERF: band coalescing

/** Build fine bands from a by-sorted blade array, the live pipeline's step 1. */
const fineBands = (bys: number[], pitch = 1 / 3) =>
  partitionTallBands(bys.map((by) => ({ by })), pitch);

test('coalesceTallBands merges a body-free field into ONE band (open meadow)', () => {
  // Ten fine bands across ten rows, no body anywhere → one blit.
  const fine = fineBands([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5]);
  assert.ok(fine.length > 1, 'precondition: several fine bands');
  const merged = coalesceTallBands(fine, []);
  assert.equal(merged.length, 1, 'no body ⇒ everything coalesces');
  const m = merged[0]!;
  // The one band covers every blade exactly once, contiguously.
  assert.equal(m.i0, 0);
  assert.equal(
    m.count,
    fine.reduce((s, b) => s + b.count, 0),
    'merged count = all blades',
  );
  assert.ok(m.minBy <= 1 && m.maxBy >= 5.5, 'span covers the whole field');
});

test('coalesceTallBands SPLITS where a body foot falls between rows', () => {
  // Bodies at row 2.4 and 4.1 must each keep a boundary so they interleave.
  const bys = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
  const fine = fineBands(bys);
  const merged = coalesceTallBands(fine, [2.4, 4.1]);
  // Three runs: [<2.4], [2.4..4.1], [>4.1].
  assert.equal(merged.length, 3, 'two bodies cut the field into three runs');
  // No run straddles a body row (a run's open span excludes both).
  for (const r of merged) {
    for (const e of [2.4, 4.1]) {
      assert.ok(!(r.minBy < e && e < r.maxBy), `run ${r.minBy}..${r.maxBy} straddles ${e}`);
    }
  }
  // Runs stay contiguous and cover every blade once.
  let i0 = 0;
  let total = 0;
  for (const r of merged) {
    assert.equal(r.i0, i0, 'contiguous');
    i0 += r.count;
    total += r.count;
  }
  assert.equal(total, bys.length, 'every blade once');
  // sortY ascending so runs still paint back-to-front.
  for (let i = 1; i < merged.length; i++) assert.ok(merged[i]!.sortY > merged[i - 1]!.sortY);
});

test('coalesceTallBands FAR-FIELD LOD drops split rows north of the near window', () => {
  const bys = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
  const fine = fineBands(bys);
  // A body far up-screen at row 2.4 — with nearMinBy=4 it is dropped, so the
  // whole field coalesces despite the body.
  const merged = coalesceTallBands(fine, [2.4], 4);
  assert.equal(merged.length, 1, 'far body ignored ⇒ one band');
  // But a body inside the near window (row 4.6 ≥ 4) still splits.
  const merged2 = coalesceTallBands(fine, [4.6], 4);
  assert.equal(merged2.length, 2, 'near body honored ⇒ two runs');
});

test('coalesceTallBands never merges across a body ⇒ no interleave regression', () => {
  // A body strictly BETWEEN every pair of adjacent bands returns the fine
  // bands unchanged (each keeps its own sortY) — the worst case, proving
  // coalescing is never coarser than the fine cut where bodies stand.
  const bys = [1.1, 1.4, 1.8, 2.2, 2.6, 3.0];
  const fine = fineBands(bys);
  // A split row strictly inside each adjacent gap.
  const rows: number[] = [];
  for (let i = 1; i < fine.length; i++) rows.push((fine[i - 1]!.maxBy + fine[i]!.minBy) / 2);
  const merged = coalesceTallBands(fine, rows);
  assert.equal(merged.length, fine.length, 'no coalescing when a body sits between every band');
  for (let i = 0; i < fine.length; i++) {
    assert.equal(merged[i]!.sortY, fine[i]!.sortY, 'lone bands keep their exact sortY');
    assert.equal(merged[i]!.i0, fine[i]!.i0);
    assert.equal(merged[i]!.count, fine[i]!.count);
  }
});

test('coalesceTallBands handles the empty and single-band inputs', () => {
  assert.deepEqual(coalesceTallBands([], [1, 2]), []);
  const one = fineBands([5, 5.1]);
  assert.equal(one.length, 1);
  const merged = coalesceTallBands(one, [99]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.sortY, one[0]!.sortY, 'a lone band is passed through unchanged');
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

test('grassProjectMirror is the plain affine (interleave bbox uses it)', () => {
  const p = grassProjectMirror(48, 0.86, 500, 300, 3, -2);
  assert.ok(Math.abs(p.x - (3 * 48 + 500)) < 1e-9);
  assert.ok(Math.abs(p.y - (-2 * 48 * 0.86 + 300)) < 1e-9);
});

/**
 * G2 — THE MEADOW CASTS ITS OWN SHADE. The cast shader must be thrown by
 * the SAME wind and projected through the SAME projection as the blades
 * (uniform, radius-free), and its ground throw must
 * fold the sky shear to world units so it lands where the CPU shade did.
 */
test('the grass cast shader embeds the shared wind and projection', () => {
  const src = grassShadowVertSrc();
  assert.match(src, /grassWind\(iRoot/); // thrown by the one wind
  assert.match(src, /grassProject\(world\)/); // through the one projection
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

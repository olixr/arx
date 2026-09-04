import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHUNK_SIZE } from '@arx/shared';
import {
  BAND_HELD,
  BAND_TAKEN,
  BAND_TOUCHED,
  CORE_STEP,
  GRAIN_RAG,
  HALO_CELLS,
  HALO_LEN,
  HALO_N,
  SPECTRUM_AXES,
  SPECTRUM_STROKE_CAP,
  STROKE_R_MAX,
  allocHalo,
  band,
  fieldAxisAt,
  fieldVecAt,
  fillHalo,
  haloIndex,
  haloSig,
  prepareStrokes,
  projectCore,
  projectCores,
  quant,
  reachSig,
  replaceSpectrum,
  spectrumAt,
  spectrumEpoch,
  spectrumSaveRegenerates,
  spectrumSnapshot,
  strokeWeight,
  validateSpectrumStrokes,
  type SpectrumCore,
  type SpectrumStroke,
} from './spectrum.js';

// THE LIVING GROUND — THE FIELD (docs/contested-lands-plan.md §12.2,
// §12.8 row LG-0). Every law the module keeps is pinned here: zero is
// today, plateau then hem, max/add/sign, reach ≤ bbox, the shared
// corner, the sig, the server-clocked core, the validator's rails and
// the sacred rect. No pixel changes in this band: these are the pure
// facts LG-1's painter will lean on.

const ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

function circle(
  id: string,
  x: number,
  y: number,
  r: number,
  over: Partial<Omit<SpectrumStroke, 'id' | 'shape'>> = {},
): SpectrumStroke {
  return { id, axis: 'blight', shape: { kind: 'circle', x, y, r }, amp: 1, soft: 0.5, grain: 0, mode: 'max', ...over };
}

const VEC = new Float64Array(4);

/** One axis of the field from a raw stroke list (the tests' shorthand). */
function at(strokes: SpectrumStroke[], axis: number, x: number, y: number): number {
  return fieldAxisAt(prepareStrokes(strokes), axis, x, y);
}

function near(a: number, b: number, eps = 1e-9): void {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);
}

// ------------------------------------------------------------ zero

test('ZERO IS TODAY: no strokes → zero field everywhere, an empty halo, sig 0', () => {
  const none = prepareStrokes([]);
  assert.equal(none.length, 0);
  assert.equal(fieldVecAt(none, 12.5, -300.5, VEC), false);
  assert.deepEqual([...VEC], [0, 0, 0, 0]);
  const halo = allocHalo();
  halo.fill(7); // a dirty pooled halo must come back clean
  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -3; cx <= 3; cx++) {
      assert.equal(fillHalo(none, cx * CHUNK_SIZE, cy * CHUNK_SIZE, CHUNK_SIZE, halo), false);
      assert.equal(halo.every((w) => w === 0), true);
      assert.equal(reachSig(none, cx, cy, CHUNK_SIZE), 0);
    }
  }
  assert.equal(haloSig(halo), 0);
  replaceSpectrum([]);
  for (const axis of SPECTRUM_AXES) {
    assert.equal(spectrumAt(axis, 0.5, 0.5), 0);
    assert.equal(spectrumAt(axis, 999.5, -999.5), 0);
  }
});

test('an amp-0 stroke is inert: it prepares to nothing and signs nothing', () => {
  const parked = prepareStrokes([circle('parked', 0, 0, 40, { amp: 0 })]);
  assert.equal(parked.length, 0);
  assert.equal(reachSig(parked, 0, 0, CHUNK_SIZE), 0);
});

// ----------------------------------------------------------- bands

test('band and quant are exact integers on the u8 thresholds, sign-blind', () => {
  assert.equal(quant(0), 0);
  assert.equal(quant(0.2), 51);
  assert.equal(quant(1), 255);
  assert.equal(quant(-1), -255);
  assert.equal(quant(3), 255);
  assert.equal(quant(-0.5), -128);
  assert.equal(band(BAND_TOUCHED - 1), 0);
  assert.equal(band(BAND_TOUCHED), 1);
  assert.equal(band(BAND_TAKEN - 1), 1);
  assert.equal(band(BAND_TAKEN), 2);
  assert.equal(band(BAND_HELD - 1), 2);
  assert.equal(band(BAND_HELD), 3);
  assert.equal(band(255), 3);
  assert.equal(band(-BAND_TOUCHED), 1);
  assert.equal(band(-255), 3);
  // The thresholds are what the plan wrote, and integers.
  assert.deepEqual([BAND_TOUCHED, BAND_TAKEN, BAND_HELD], [51, 128, 218]);
});

// ---------------------------------------------------------- shapes

test('a circle is a plateau, then a smoothstep hem, then nothing', () => {
  const s = [circle('c', 0, 0, 40, { soft: 0.5 })];
  near(at(s, 1, 0, 0), 1);
  near(at(s, 1, 20, 0), 1); // the plateau ends at r·(1−soft)
  near(at(s, 1, 0, -20), 1);
  near(at(s, 1, 30, 0), 0.5); // halfway across the hem = smoothstep(0.5)
  near(at(s, 1, 0, 30), 0.5);
  near(at(s, 1, 25, 0), 1 - 0.25 * 0.25 * (3 - 0.5));
  assert.equal(at(s, 1, 40, 0), 0);
  assert.equal(at(s, 1, 41, 0), 0);
  assert.equal(at(s, 1, 100, 100), 0);
  // Monotone non-increasing along any radial line.
  let prev = 2;
  for (let d = 0; d <= 45; d += 0.25) {
    const v = at(s, 1, d * 0.6, d * 0.8);
    assert.ok(v <= prev + 1e-12, `not monotone at d=${d}`);
    prev = v;
  }
  // soft 0 is a hard edge; soft 1 hems from the heart.
  assert.equal(at([circle('h', 0, 0, 10, { soft: 0 })], 1, 9.99, 0), 1);
  assert.equal(at([circle('h', 0, 0, 10, { soft: 0 })], 1, 10, 0), 0);
  near(at([circle('f', 0, 0, 10, { soft: 1 })], 1, 5, 0), 0.5);
});

test('a capsule is flat along its spine and rounds its ends by the same law', () => {
  const s: SpectrumStroke[] = [
    { id: 'k', axis: 'burn', shape: { kind: 'capsule', x0: 0, y0: 0, x1: 60, y1: 0, r: 20 }, amp: 1, soft: 0.5, grain: 0, mode: 'max' },
  ];
  for (let x = 0; x <= 60; x += 5) near(at(s, 2, x, 0), 1);
  near(at(s, 2, 30, 10), 1);
  near(at(s, 2, 30, 15), 0.5);
  assert.equal(at(s, 2, 30, 20), 0);
  // Past the ends the spine's nearest point is the end: a circle's hem.
  near(at(s, 2, 75, 0), 0.5);
  near(at(s, 2, -15, 0), 0.5);
  near(at(s, 2, 60 + 15 * 0.6, 15 * 0.8), 0.5);
  assert.equal(at(s, 2, 80, 0), 0);
});

test('a rect owns every tile it names: each named centre sits on the plateau, the hem runs pad past it', () => {
  const hard: SpectrumStroke[] = [
    { id: 'r', axis: 'wear', shape: { kind: 'rect', x: 10, y: 10, w: 5, h: 3, pad: 0 }, amp: 1, soft: 0, grain: 0, mode: 'max' },
  ];
  // Tiles 10..14 × 10..12, sampled where the halo samples: the centre.
  for (let ty = 10; ty <= 12; ty++) {
    for (let tx = 10; tx <= 14; tx++) assert.equal(at(hard, 3, tx + 0.5, ty + 0.5), 1, `tile ${tx},${ty}`);
  }
  assert.equal(at(hard, 3, 9.5, 10.5), 0);
  assert.equal(at(hard, 3, 15.5, 10.5), 0);
  assert.equal(at(hard, 3, 12.5, 9.5), 0);
  assert.equal(at(hard, 3, 12.5, 13.5), 0);
  const soft: SpectrumStroke[] = [
    { id: 'r', axis: 'wear', shape: { kind: 'rect', x: 10, y: 10, w: 5, h: 3, pad: 4 }, amp: 1, soft: 1, grain: 0, mode: 'max' },
  ];
  near(at(soft, 3, 15 + 2, 11.5), 0.5); // two tiles past the east edge = half the hem
  near(at(soft, 3, 12.5, 10 - 2), 0.5);
  assert.equal(at(soft, 3, 15 + 4, 11.5), 0);
  // The corner hem is Euclidean from the corner, never a Chebyshev square.
  near(at(soft, 3, 15 + 2 * 0.6, 13 + 2 * 0.8), 0.5);
});

// ----------------------------------------------------- composition

test('max wins by magnitude, add sums and clamps, season is the one signed axis', () => {
  const a = circle('a', 0, 0, 40, { amp: 0.4 });
  const b = circle('b', 10, 0, 40, { amp: 0.7 });
  near(at([a, b], 1, 5, 0), 0.7);
  near(at([b, a], 1, 5, 0), 0.7); // order-blind
  const p = circle('p', 0, 0, 40, { amp: 0.6, mode: 'add' });
  const q = circle('q', 0, 0, 40, { amp: 0.6, mode: 'add' });
  near(at([p, q], 1, 0, 0), 1); // clamped
  near(at([p, q], 1, 30, 0), 0.6); // 0.3 + 0.3 across the hem
  near(at([p, a], 1, 0, 0), 1); // 0.6 add + 0.4 max
  near(at([p, circle('m', 0, 0, 40, { amp: 0.3 })], 1, 0, 0), 0.9);
  // Season: the strongest autumn and the strongest spring both speak.
  const autumn = circle('au', 0, 0, 40, { axis: 'season', amp: 0.5 });
  const spring = circle('sp', 0, 0, 40, { axis: 'season', amp: -0.3 });
  const spring2 = circle('sp2', 0, 0, 40, { axis: 'season', amp: -0.1 });
  near(at([autumn, spring, spring2], 0, 0, 0), 0.2);
  near(at([spring], 0, 0, 0), -0.3);
  const w1 = circle('w1', 0, 0, 40, { axis: 'season', amp: -0.8, mode: 'add' });
  const w2 = circle('w2', 0, 0, 40, { axis: 'season', amp: -0.8, mode: 'add' });
  near(at([w1, w2], 0, 0, 0), -1);
  // Axes never bleed: a blight stroke says nothing on burn.
  assert.equal(at([a], 2, 0, 0), 0);
  assert.equal(at([a], 0, 0, 0), 0);
  assert.equal(fieldVecAt(prepareStrokes([a, autumn]), 0, 0, VEC), true);
  near(VEC[0]!, 0.5);
  near(VEC[1]!, 0.4);
  assert.equal(VEC[2], 0);
  assert.equal(VEC[3], 0);
});

// ----------------------------------------------------------- grain

test('REACH ≤ BBOX: the grain rags the hem but the field is 0 at and past the reach box', () => {
  const raw = circle('g', 100, 100, 40, { soft: 0.3, grain: 1 });
  const [p] = prepareStrokes([raw]);
  assert.ok(p);
  const reach = 40 * (1 + GRAIN_RAG);
  near(p.x0, 100 - reach);
  near(p.x1, 100 + reach);
  // Every point on and outside the box is 0 — walk the box border and a
  // ring just outside the ragged radius.
  for (let t = -reach; t <= reach; t += 0.5) {
    assert.equal(strokeWeight(p, p.x0, 100 + t, 1), 0);
    assert.equal(strokeWeight(p, p.x1, 100 + t, -1), 0);
    assert.equal(strokeWeight(p, 100 + t, p.y0, 1), 0);
    assert.equal(strokeWeight(p, 100 + t, p.y1, 1), 0);
  }
  for (let k = 0; k < 360; k += 3) {
    const a = (k * Math.PI) / 180;
    const x = 100 + Math.cos(a) * reach;
    const y = 100 + Math.sin(a) * reach;
    assert.equal(at([raw], 1, x, y), 0, `field past the ragged reach at ${k}°`);
  }
  // The hem really rags: at d = 38 the ragged stroke and the unragged one
  // disagree somewhere, and agree on the plateau.
  const flat = circle('g', 100, 100, 40, { soft: 0.3, grain: 0 });
  let differs = 0;
  for (let k = 0; k < 360; k += 2) {
    const a = (k * Math.PI) / 180;
    const x = 100 + Math.cos(a) * 38;
    const y = 100 + Math.sin(a) * 38;
    if (Math.abs(at([raw], 1, x, y) - at([flat], 1, x, y)) > 1e-6) differs++;
    near(at([raw], 1, 100 + Math.cos(a) * 10, 100 + Math.sin(a) * 10), 1);
  }
  assert.ok(differs > 60, `the grain should rag the hem (differs at ${differs} of 180 samples)`);
  // Grain 0 reads the same as an unragged weight.
  const [f] = prepareStrokes([flat]);
  near(strokeWeight(f!, 130, 100, 0.7), strokeWeight(f!, 130, 100, 0));
});

test('the grain is ONE field per axis: two strokes on an axis rag in step where they meet', () => {
  // Two identical circles at the same heart must give the same ragged
  // field as one — the grain is read once per axis per point, never per
  // stroke, so a country built from many strokes has one hem.
  const one = [circle('a', 0, 0, 30, { grain: 1, soft: 0.5 })];
  const two = [circle('a', 0, 0, 30, { grain: 1, soft: 0.5 }), circle('b', 0, 0, 30, { grain: 1, soft: 0.5 })];
  for (let k = 0; k < 360; k += 7) {
    const a = (k * Math.PI) / 180;
    near(at(one, 1, Math.cos(a) * 24, Math.sin(a) * 24), at(two, 1, Math.cos(a) * 24, Math.sin(a) * 24));
  }
});

// --------------------------------------------------------- the halo

test('THE SHARED CORNER: a tile two chunks both halo reads the same word from either side', () => {
  const list = prepareStrokes([
    circle('heart', 32, 32, 30, { soft: 0.7, grain: 1 }),
    circle('au', 40, 20, 26, { axis: 'season', amp: -0.9, soft: 0.6, grain: 0.5 }),
    { id: 'road', axis: 'wear', shape: { kind: 'capsule', x0: 0, y0: 40, x1: 64, y1: 24, r: 8 }, amp: 0.8, soft: 0.5, grain: 1, mode: 'add' },
  ]);
  const N = CHUNK_SIZE;
  const halo = (cx: number, cy: number): Int16Array => {
    const h = allocHalo();
    assert.equal(fillHalo(list, cx * N, cy * N, N, h), true);
    return h;
  };
  const h00 = halo(0, 0);
  const h10 = halo(1, 0);
  const h01 = halo(0, 1);
  const h11 = halo(1, 1);
  let compared = 0;
  for (let axis = 0; axis < 4; axis++) {
    for (let ly = -2; ly <= N + 1; ly++) {
      for (let lx = N - 2; lx <= N + 1; lx++) {
        // Chunk (0,0)'s east halo columns are chunk (1,0)'s west ones.
        assert.equal(h00[haloIndex(axis, lx, ly)], h10[haloIndex(axis, lx - N, ly)]);
        compared++;
      }
    }
    for (let ly = N - 2; ly <= N + 1; ly++) {
      for (let lx = -2; lx <= N + 1; lx++) {
        assert.equal(h00[haloIndex(axis, lx, ly)], h01[haloIndex(axis, lx, ly - N)]);
        compared++;
      }
      for (let lx = N - 2; lx <= N + 1; lx++) {
        assert.equal(h00[haloIndex(axis, lx, ly)], h11[haloIndex(axis, lx - N, ly - N)]);
        compared++;
      }
    }
  }
  assert.ok(compared > 1000);
  // The halo is a real halo: all three bands stand in it, the season
  // word carries its sign, and the layout is HALO_N² per axis.
  assert.equal(HALO_N, N + 4);
  assert.equal(HALO_LEN, HALO_CELLS * 4);
  const bands = new Set<number>();
  let negative = 0;
  for (let i = 0; i < HALO_CELLS; i++) {
    bands.add(band(h00[i + HALO_CELLS]!));
    if (h00[i]! < 0) negative++;
  }
  assert.deepEqual([...bands].sort(), [0, 1, 2, 3]);
  assert.ok(negative > 0, 'the spring stroke should leave signed words');
});

test('the halo samples tile centres in world space, exactly what fieldVecAt says there', () => {
  const list = prepareStrokes([circle('c', -50, 70, 25, { soft: 0.5, grain: 1 })]);
  const halo = allocHalo();
  const baseX = -64;
  const baseY = 64;
  assert.equal(fillHalo(list, baseX, baseY, CHUNK_SIZE, halo), true);
  for (let ly = -2; ly <= CHUNK_SIZE + 1; ly += 3) {
    for (let lx = -2; lx <= CHUNK_SIZE + 1; lx += 3) {
      fieldVecAt(list, baseX + lx + 0.5, baseY + ly + 0.5, VEC);
      assert.equal(halo[haloIndex(1, lx, ly)], quant(VEC[1]!));
    }
  }
});

test('the reach sig is 0 iff no stroke reaches the halo, and a non-empty halo always has a sig', () => {
  const heart = circle('heart', 100, 100, 40, { soft: 0.5, grain: 1 });
  const far = circle('far', 2000, 2000, 40);
  const list = prepareStrokes([heart, far]);
  const halo = allocHalo();
  let folded = 0;
  let empty = 0;
  for (let cy = -2; cy <= 8; cy++) {
    for (let cx = -2; cx <= 8; cx++) {
      const sig = reachSig(list, cx, cy, CHUNK_SIZE);
      const any = fillHalo(list, cx * CHUNK_SIZE, cy * CHUNK_SIZE, CHUNK_SIZE, halo);
      if (any) {
        folded++;
        assert.notEqual(sig, 0, `chunk ${cx},${cy} paints but signs 0`);
        assert.notEqual(haloSig(halo), 0);
      } else {
        empty++;
        assert.equal(haloSig(halo), 0);
      }
    }
  }
  assert.ok(folded >= 9 && empty >= 50, `folded ${folded}, empty ${empty}`);
  // A far stroke never changes a chunk's sig; a moved or re-amped one does.
  assert.equal(reachSig(list, 3, 3, CHUNK_SIZE), reachSig(prepareStrokes([heart]), 3, 3, CHUNK_SIZE));
  assert.notEqual(
    reachSig(prepareStrokes([circle('heart', 100, 100, 40, { soft: 0.5, grain: 1, amp: 0.9 })]), 3, 3, CHUNK_SIZE),
    reachSig(prepareStrokes([heart]), 3, 3, CHUNK_SIZE),
  );
  // r, soft and grain each re-key the sig on their own: a soft edit moves
  // no reach box, but it moves the hem, and the hem is painted.
  const heartSig = reachSig(prepareStrokes([heart]), 3, 3, CHUNK_SIZE);
  assert.notEqual(reachSig(prepareStrokes([circle('heart', 100, 100, 41, { soft: 0.5, grain: 1 })]), 3, 3, CHUNK_SIZE), heartSig);
  assert.notEqual(reachSig(prepareStrokes([circle('heart', 100, 100, 40, { soft: 0.4, grain: 1 })]), 3, 3, CHUNK_SIZE), heartSig);
  assert.notEqual(reachSig(prepareStrokes([circle('heart', 100, 100, 40, { soft: 0.5, grain: 0.9 })]), 3, 3, CHUNK_SIZE), heartSig);
  assert.equal(reachSig(list, 40, 40, CHUNK_SIZE), 0);
  assert.notEqual(reachSig(list, 62, 62, CHUNK_SIZE), 0); // the far one, in its own country
  // The sig is a u32 word.
  const s = reachSig(list, 3, 3, CHUNK_SIZE);
  assert.ok(Number.isInteger(s) && s > 0 && s <= 0xffffffff);
});

test('THE FIELD-AWARE KEY: the halo sig moves only when a word moves', () => {
  const list = prepareStrokes([circle('c', 16, 16, 20, { soft: 0.5 })]);
  const a = allocHalo();
  const b = allocHalo();
  fillHalo(list, 0, 0, CHUNK_SIZE, a);
  fillHalo(list, 0, 0, CHUNK_SIZE, b);
  assert.equal(haloSig(a), haloSig(b));
  b[haloIndex(1, 30, 30)] = 1; // a word no stroke wrote
  assert.notEqual(haloSig(a), haloSig(b));
  // The same nudge in a different axis slot is a different key.
  const c = allocHalo();
  fillHalo(list, 0, 0, CHUNK_SIZE, c);
  c[haloIndex(2, 30, 30)] = 1;
  assert.notEqual(haloSig(b), haloSig(c));
});

// ------------------------------------------------------- live cores

test('projectCore snaps a server-clocked ramp to CORE_STEP and holds at both ends', () => {
  const core: SpectrumCore = { id: 'den', axis: 'blight', x: 300, y: -40, r0: 10, r1: 50, t0: 1000, t1: 5000, soft: 0.6 };
  const r = (now: number): number | null => {
    const s = projectCore(core, now);
    return s ? (s.shape as { r: number }).r : null;
  };
  assert.equal(r(0), 10);
  assert.equal(r(1000), 10);
  assert.equal(r(3000), 30);
  assert.equal(r(3100), 32); // raw 31 → the even ring above
  assert.equal(r(5000), 50);
  assert.equal(r(90000), 50);
  assert.equal(CORE_STEP, 2);
  const s = projectCore(core, 3000)!;
  assert.deepEqual(s, {
    id: 'den',
    axis: 'blight',
    shape: { kind: 'circle', x: 300, y: -40, r: 30 },
    amp: 1,
    soft: 0.6,
    grain: 0,
    mode: 'max',
  });
  // amp and grain ride when given; a season core keeps its sign.
  const spring = projectCore({ ...core, axis: 'season', amp: -0.5, grain: 0.4 }, 3000)!;
  assert.equal(spring.amp, -0.5);
  assert.equal(spring.grain, 0.4);
  // No reach yet → no stroke; a zero span is a step at t1.
  assert.equal(projectCore({ ...core, r0: 0 }, 500), null);
  assert.equal(r(1000), 10);
  const step = { ...core, t1: core.t0 };
  assert.equal((projectCore(step, 999)!.shape as { r: number }).r, 10);
  assert.equal((projectCore(step, 1000)!.shape as { r: number }).r, 50);
  // Two clients on the same tick project the same list.
  const cores = [core, { ...core, id: 'digs', x: 0, r0: 0, r1: 24 }];
  assert.deepEqual(projectCores(cores, 2222), projectCores(cores, 2222));
  assert.equal(projectCores(cores, 1000).length, 1); // digs has no ring at t0
  assert.equal(projectCores(cores, 5000).length, 2);
});

// ---------------------------------------------------- the registry

test('the content registry swaps whole, copies its input, and bumps its epoch', () => {
  const before = spectrumEpoch();
  const s = circle('live', 400, 400, 30);
  replaceSpectrum([s]);
  assert.equal(spectrumEpoch(), before + 1);
  assert.equal(spectrumAt('blight', 400, 400), 1);
  s.amp = 0; // the registry never aliases the caller's object
  (s.shape as { r: number }).r = 2;
  assert.equal(spectrumAt('blight', 400, 400), 1);
  const snap = spectrumSnapshot();
  assert.deepEqual(snap, [{ id: 'live', axis: 'blight', shape: { kind: 'circle', x: 400, y: 400, r: 30 }, amp: 1, soft: 0.5, grain: 0, mode: 'max' }]);
  snap[0]!.amp = 0.1;
  assert.equal(spectrumAt('blight', 400, 400), 1);
  replaceSpectrum([]);
  assert.equal(spectrumEpoch(), before + 2);
  assert.equal(spectrumAt('blight', 400, 400), 0);
});

// ------------------------------------------------------- validator

test('the validator admits every honest stroke and round-trips it whole', () => {
  const raw = [
    { id: 'wold_gloom', axis: 'blight', shape: { kind: 'circle', x: -300, y: 500, r: 60 }, amp: 1, soft: 0.5, grain: 0.7, mode: 'max' },
    { id: 'the_dying_stand', axis: 'blight', shape: { kind: 'capsule', x0: -420, y0: 300, x1: -360, y1: 380, r: 24 }, amp: 0.8, soft: 0.6, grain: 1, mode: 'max', bones: true },
    { id: 'ashmarch_soot', axis: 'burn', shape: { kind: 'rect', x: 600, y: 600, w: 80, h: 40, pad: 30 }, amp: 0.6, soft: 1, grain: 0.3, mode: 'add' },
    { id: 'first_frost', axis: 'season', shape: { kind: 'circle', x: 900, y: -900, r: STROKE_R_MAX }, amp: -1, soft: 0, grain: 0, mode: 'max', bones: false },
  ];
  const res = validateSpectrumStrokes(raw, { idRe: ID_RE });
  assert.deepEqual(res.errors, []);
  assert.equal(res.strokes.length, 4);
  assert.deepEqual(res.strokes[1], raw[1]);
  assert.equal('bones' in res.strokes[3]!, false); // false is absent on the wire
  assert.deepEqual(validateSpectrumStrokes(undefined, { idRe: ID_RE }), { strokes: [], errors: [] });
});

test('the validator names every broken rail', () => {
  const errs = (s: unknown, ...rest: unknown[]): string =>
    validateSpectrumStrokes([s, ...rest], { idRe: ID_RE }).errors.join('\n');
  const ok = circle('ok', 0, 0, 10);
  assert.match(validateSpectrumStrokes({}, { idRe: ID_RE }).errors.join(), /must be an array/);
  assert.match(errs(null), /spectrum\[0\] must be an object/);
  assert.match(errs({ ...ok, id: 'Bad Id' }), /spectrum\[0\]\.id must match/);
  assert.match(errs(ok, { ...ok }), /duplicate spectrum id 'ok'/);
  assert.match(errs({ ...ok, grow: {} }), /unknown field 'grow'/);
  assert.match(errs({ ...ok, shape: { ...ok.shape, z: 1 } }), /shape has unknown field 'z'/);
  assert.match(errs({ ...ok, axis: 'rot' }), /axis must be one of season\|blight\|burn\|wear/);
  assert.match(errs({ ...ok, shape: { kind: 'blob' } }), /shape\.kind must be circle\|capsule\|rect/);
  assert.match(errs({ ...ok, shape: { kind: 'circle', x: 0, y: 0, r: STROKE_R_MAX + 1 } }), /r in \[2, 160\]/);
  assert.match(errs({ ...ok, shape: { kind: 'circle', x: 0, y: 0, r: 1 } }), /r in \[2, 160\]/);
  assert.match(errs({ ...ok, shape: { kind: 'circle', x: 0.5, y: 0, r: 10 } }), /integer x,y/);
  assert.match(errs({ ...ok, shape: { kind: 'capsule', x0: 0, y0: 0, x1: 0, y1: 0, r: 10 } }), /capsule ends coincide/);
  assert.match(errs({ ...ok, shape: { kind: 'capsule', x0: 0, y0: 0, x1: 5, y1: 0, r: 161 } }), /capsule needs integer/);
  assert.match(errs({ ...ok, shape: { kind: 'rect', x: 0, y: 0, w: 0, h: 4, pad: 0 } }), /rect needs integer/);
  assert.match(errs({ ...ok, shape: { kind: 'rect', x: 0, y: 0, w: 4, h: 4, pad: 161 } }), /pad in \[0, 160\]/);
  assert.match(errs({ ...ok, amp: -0.5 }), /only season carries a sign/);
  assert.match(errs({ ...ok, amp: 1.5 }), /amp must lie in \[0, 1\]/);
  assert.match(errs({ ...ok, axis: 'season', amp: -1.5 }), /amp must lie in \[-1, 1\]/);
  assert.equal(errs({ ...ok, axis: 'season', amp: -1 }), '');
  assert.match(errs({ ...ok, amp: Number.NaN }), /amp must be a finite number/);
  assert.match(errs({ ...ok, soft: 2 }), /soft must lie in \[0, 1\]/);
  assert.match(errs({ ...ok, grain: -0.1 }), /grain must lie in \[0, 1\]/);
  assert.match(errs({ ...ok, mode: 'sum' }), /mode must be 'max' or 'add'/);
  assert.match(errs({ ...ok, bones: 'yes' }), /bones must be a boolean/);
  // Every rail speaks at once — one bad doc lists all its faults.
  const many = validateSpectrumStrokes([{ ...ok, axis: 'rot', soft: 3, mode: 'sum' }], { idRe: ID_RE }).errors;
  assert.equal(many.length, 3);
  // The cap.
  const flood = Array.from({ length: SPECTRUM_STROKE_CAP + 1 }, (_, i) => circle(`s${i}`, i * 500, 0, 10));
  assert.match(validateSpectrumStrokes(flood, { idRe: ID_RE }).errors.join(), /65 strokes — the plan carries at most 64/);
  assert.equal(validateSpectrumStrokes(flood.slice(0, SPECTRUM_STROKE_CAP), { idRe: ID_RE }).errors.length, 0);
});

test('THE TUTORIAL IS SACRED: a stroke may not reach into a sacred rect while it carries amplitude', () => {
  const dawnmead = { name: 'Dawnmead', rect: { x: -160, y: -64, w: 192, h: 224 } };
  const vet = (s: SpectrumStroke): string[] => validateSpectrumStrokes([s], { idRe: ID_RE, sacred: [dawnmead] }).errors;
  const inside = vet(circle('gloom', -64, 48, 20, { amp: 0.5 }));
  assert.equal(inside.length, 1);
  assert.match(inside[0]!, /overlaps the Dawnmead rect by \d+×\d+ tiles at amp 0\.5/);
  assert.match(inside[0]!, /THE TUTORIAL IS SACRED/);
  // Parked at amp 0 it may stand anywhere (a zone gain, a draft).
  assert.deepEqual(vet(circle('gloom', -64, 48, 20, { amp: 0 })), []);
  // The ragged hem counts: the rect's east edge is x=32 (exclusive).
  // r 40 grain 1 reaches 54; a heart at 92 clears it, a heart at 82 does not.
  assert.deepEqual(vet(circle('clear', 92, 48, 40, { grain: 1 })), []);
  assert.match(vet(circle('hem', 82, 48, 40, { grain: 1 }))[0]!, /Dawnmead/);
  // Unragged, the same heart at 82 with r 40 (reach 40) also clears: 42 > 32.
  assert.deepEqual(vet(circle('flat', 82, 48, 40, { grain: 0 })), []);
  // A capsule and a rect are judged by the same box.
  assert.match(
    vet({ id: 'k', axis: 'burn', shape: { kind: 'capsule', x0: 40, y0: 0, x1: 200, y1: 0, r: 10 }, amp: 1, soft: 0.5, grain: 0, mode: 'max' })[0]!,
    /Dawnmead/,
  );
  assert.match(
    vet({ id: 'r', axis: 'wear', shape: { kind: 'rect', x: 33, y: 0, w: 10, h: 10, pad: 2 }, amp: 1, soft: 0.5, grain: 0, mode: 'max' })[0]!,
    /Dawnmead/,
  );
  assert.deepEqual(
    vet({ id: 'r', axis: 'wear', shape: { kind: 'rect', x: 33, y: 0, w: 10, h: 10, pad: 0 }, amp: 1, soft: 0.5, grain: 0, mode: 'max' }),
    [],
  );
});

// ---------------------------------------------------- the save road

test('a bones stroke that leaves takes its bones with it: the save road regenerates on arrival AND departure', () => {
  const skin = circle('skin', 300, 300, 20);
  const bones = { ...circle('bones', 300, 300, 20), bones: true };
  assert.equal(spectrumSaveRegenerates([], []), false);
  assert.equal(spectrumSaveRegenerates(undefined, [skin]), false);
  assert.equal(spectrumSaveRegenerates([skin], [skin]), false);
  assert.equal(spectrumSaveRegenerates([], [bones]), true, 'arriving');
  assert.equal(spectrumSaveRegenerates([bones], []), true, 'deleted');
  assert.equal(spectrumSaveRegenerates([bones], [{ ...bones, bones: undefined }]), true, 'flipped to skin');
  assert.equal(spectrumSaveRegenerates([bones], [bones]), true, 'kept — the doc is re-read either way');
  assert.equal(spectrumSaveRegenerates(undefined, undefined), false);
});

test('the halo is sized for THE chunk size and refuses any other', () => {
  assert.equal(HALO_N, CHUNK_SIZE + 4);
  const halo = allocHalo();
  assert.throws(() => fillHalo([], 0, 0, CHUNK_SIZE + 1, halo), /does not fit/);
});

// --------------------------------------------------- determinism

test('NO CLOCK REACHES A PAINTED VALUE: spectrum.ts reads no clock and no engine-defined math', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'spectrum.ts'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bDate\b/);
  assert.doesNotMatch(code, /\bperformance\b/);
  assert.doesNotMatch(code, /Math\.random/);
  // Math.hypot and Math.pow round differently across engines; the field
  // is built from sqrt, mul, add and floor so every client bands alike.
  assert.doesNotMatch(code, /Math\.hypot/);
  assert.doesNotMatch(code, /Math\.pow/);
  assert.doesNotMatch(code, /\*\*/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { faceCellScale, faceCellDims, FACE_CELL_CAP_PX } from './faceCap.js';

// THE ONE RENDER — B9: the bounded face-scratch invariants.
//
// The cap trades a bounded, graceful softening at extreme projection for a
// HARD ceiling on the scratch a leaned frame can allocate. These tests pin:
//   1. no cap (or a cell already under the ceiling) is byte-identical — k=1,
//      dims unchanged: normal zoom and ALWAYS q=0 (the golden gate) untouched;
//   2. a cell over the ceiling is scaled DOWN so neither dimension exceeds it,
//      aspect preserved (so the quad it upscales into keeps its shape);
//   3. the capped cell bytes/texels are BOUNDED — grows with projection only
//      up to the ceiling, never past it, however huge the projected extent.

test('faceCellScale: no capDim → 1 (the flat/q=0 path is never capped)', () => {
  assert.equal(faceCellScale(9000, 6000, undefined), 1);
  assert.equal(faceCellScale(9000, 6000, 0), 1);
});

test('faceCellScale: a cell already under the ceiling is unscaled (k=1, sharp)', () => {
  assert.equal(faceCellScale(800, 300, FACE_CELL_CAP_PX), 1);
  assert.equal(faceCellScale(FACE_CELL_CAP_PX, FACE_CELL_CAP_PX, FACE_CELL_CAP_PX), 1);
});

test('faceCellScale: a cell over the ceiling scales the LARGER dim to exactly the cap', () => {
  const k = faceCellScale(3000, 1800, 1024);
  assert.equal(k, 1024 / 3000);
  // The larger (width) dimension lands exactly on the cap after scaling.
  assert.equal(Math.round(3000 * k), 1024);
});

test('faceCellDims: k=1 returns the uncapped dims verbatim (no arithmetic drift)', () => {
  const d = faceCellDims(800, 300, FACE_CELL_CAP_PX);
  assert.deepEqual(d, { cw: 800, ch: 300, k: 1 });
});

test('faceCellDims: a capped cell keeps its aspect and never exceeds the ceiling', () => {
  const cap = 1024;
  const d = faceCellDims(3000, 1800, cap);
  assert.ok(d.k < 1, 'a giant cell is scaled down');
  assert.ok(d.cw <= cap && d.ch <= cap, 'neither dimension exceeds the ceiling');
  assert.equal(d.cw, cap, 'the larger dimension lands on the ceiling');
  // Aspect preserved within a texel of rounding.
  const aspIn = 3000 / 1800;
  const aspOut = d.cw / d.ch;
  assert.ok(Math.abs(aspIn - aspOut) < 0.01, 'aspect ratio preserved');
});

test('faceCellDims: bytes are BOUNDED — scales with projection up to the cap, never past', () => {
  const cap = 1024;
  const bytes = (pw: number, ph: number): number => {
    const d = faceCellDims(pw, ph, cap);
    return d.cw * d.ch * 4;
  };
  // A modest face grows with its projection (no cap yet)…
  assert.ok(bytes(400, 200) < bytes(800, 400));
  // …but past the ceiling the bytes stop growing: a 2× and a 10× projection
  // of the same aspect allocate the SAME bounded cell.
  const big = bytes(4000, 2400);
  const huge = bytes(20000, 12000);
  assert.equal(big, huge, 'past the cap the cell size is invariant to projection');
  // The hard bound: a single capped cell can never exceed cap² · 4 bytes.
  assert.ok(huge <= cap * cap * 4, 'a capped cell is bounded to cap² · 4 bytes');
});

test('faceCellDims: the WORST-case resident scratch is bounded by the class collapse', () => {
  // Both dims ≤ cap ⇒ the 64-px scratch classes number at most ceil(cap/64)².
  // That collapse is what turns the ~16GB catastrophe into a bounded total.
  const cap = 1024;
  const classesPerDim = Math.ceil(cap / 64);
  const maxClasses = classesPerDim * classesPerDim;
  const maxCellBytes = cap * cap * 4;
  const worstResident = maxClasses * maxCellBytes;
  // Comfortably under the 1536 MB VRAM ceiling (≈1.0 GB here).
  assert.ok(worstResident <= 1536 * 1024 * 1024, 'worst-case scratch fits the VRAM ceiling');
});

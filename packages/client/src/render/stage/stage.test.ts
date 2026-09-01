import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRuns } from './stageBatch.js';
import {
  BLEND_CANVAS_OP,
  BLEND_GL_FUNC,
  GL_DST_COLOR,
  GL_ONE,
  GL_ONE_MINUS_DST_ALPHA,
  GL_ONE_MINUS_DST_COLOR,
  GL_ONE_MINUS_SRC_ALPHA,
  GL_ZERO,
  blendNeedsOpaqueTarget,
} from './stageBlend.js';
import { StageBlend, stageAt, type StageItem, type StageTexture } from './stageTypes.js';

const texA = { canvas: null as unknown as HTMLCanvasElement, rev: 0, filter: 'linear' } as StageTexture;
const texB = { canvas: null as unknown as HTMLCanvasElement, rev: 0, filter: 'linear' } as StageTexture;

function quad(tex: StageTexture, blend = StageBlend.SourceOver): StageItem {
  return { kind: 'quad', tex, sx: 0, sy: 0, sw: 8, sh: 8, dw: 8, dh: 8, m: stageAt(0, 0), alpha: 1, blend };
}
function fill(blend = StageBlend.SourceOver): StageItem {
  return { kind: 'fill', color: 0xff00ff, dw: 4, dh: 4, m: stageAt(0, 0), alpha: 1, blend };
}
function paint(): StageItem {
  return { kind: 'paint', paint: () => {} };
}

test('THE ORDER IS THE SORT — batching merges only adjacent same-state items', async (t) => {
  await t.test('same texture, same blend: one run', () => {
    const runs = computeRuns([quad(texA), quad(texA), quad(texA)]);
    assert.equal(runs.length, 1);
    assert.deepEqual([runs[0]!.i0, runs[0]!.i1, runs[0]!.quads], [0, 2, 3]);
  });
  await t.test('texture change breaks the run — and A-B-A never merges the As', () => {
    const runs = computeRuns([quad(texA), quad(texB), quad(texA)]);
    assert.equal(runs.length, 3);
    assert.equal(runs[0]!.tex, texA);
    assert.equal(runs[1]!.tex, texB);
    assert.equal(runs[2]!.tex, texA);
  });
  await t.test('blend change breaks the run even on one texture', () => {
    const runs = computeRuns([quad(texA), quad(texA, StageBlend.Lighter), quad(texA)]);
    assert.equal(runs.length, 3);
  });
  await t.test('fills batch with fills and NEVER fold into a textured run', () => {
    // A fill inside a textured run would sample that texture across
    // its whole UV range — the bug this rule exists to forbid.
    const runs = computeRuns([quad(texA), fill(), fill(), quad(texA)]);
    assert.equal(runs.length, 3);
    assert.equal(runs[1]!.tex, null);
    assert.equal(runs[1]!.quads, 2);
  });
  await t.test('a paint item is a zero-quad sentinel that hard-breaks batching', () => {
    const runs = computeRuns([quad(texA), paint(), quad(texA)]);
    assert.equal(runs.length, 3);
    assert.equal(runs[1]!.quads, 0);
    assert.deepEqual([runs[1]!.i0, runs[1]!.i1], [1, 1]);
  });
  await t.test('empty stream: no runs', () => {
    assert.deepEqual(computeRuns([]), []);
  });
});

test('blend tables carry their derivations', async (t) => {
  await t.test('every StageBlend has both mappings, index-aligned', () => {
    assert.equal(BLEND_CANVAS_OP.length, 6);
    assert.equal(BLEND_GL_FUNC.length, 6);
    assert.equal(BLEND_CANVAS_OP[StageBlend.Multiply], 'multiply');
    assert.equal(BLEND_CANVAS_OP[StageBlend.DestinationOut], 'destination-out');
  });
  await t.test('premultiplied source-over is (ONE, ONE_MINUS_SRC_ALPHA)', () => {
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.SourceOver], [GL_ONE, GL_ONE_MINUS_SRC_ALPHA]);
  });
  await t.test('lighter is additive', () => {
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.Lighter], [GL_ONE, GL_ONE]);
  });
  await t.test('multiply/screen use their opaque-destination reductions and SAY SO', () => {
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.Multiply], [GL_DST_COLOR, GL_ONE_MINUS_SRC_ALPHA]);
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.Screen], [GL_ONE_MINUS_DST_COLOR, GL_ONE]);
    assert.equal(blendNeedsOpaqueTarget(StageBlend.Multiply), true);
    assert.equal(blendNeedsOpaqueTarget(StageBlend.Screen), true);
    assert.equal(blendNeedsOpaqueTarget(StageBlend.SourceOver), false);
  });
  await t.test('destination-out erases by source alpha; destination-over fills the gaps', () => {
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.DestinationOut], [GL_ZERO, GL_ONE_MINUS_SRC_ALPHA]);
    assert.deepEqual(BLEND_GL_FUNC[StageBlend.DestinationOver], [GL_ONE_MINUS_DST_ALPHA, GL_ONE]);
  });
});

test('the dest-matrix convention', () => {
  // m maps [0..dw]×[0..dh] dest-local CSS px to CSS screen space;
  // stageAt is the axis-aligned 9-arg drawImage equivalent.
  const m = stageAt(30, 40);
  assert.deepEqual(m, [1, 0, 0, 1, 30, 40]);
  // Corner math both backends share: p = (a·x + c·y + e, b·x + d·y + f).
  const corner = (x: number, y: number): [number, number] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];
  assert.deepEqual(corner(0, 0), [30, 40]);
  assert.deepEqual(corner(8, 6), [38, 46]);
});

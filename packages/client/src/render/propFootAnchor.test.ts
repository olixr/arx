import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * THE PROP KEEPS ITS FOOT UNDER A STALE SCALE — the contract for the
 * cached-prop blit pivot in drawPropOutlined (renderer.ts).
 *
 * A cached prop sprite is baked at `bakeScale` and blitted at the live
 * `camera.scale`, compensated by `k = scale / bakeScale`. `k` carries the
 * staleness of a zoom glide: the live scale runs ahead of the last bake
 * until the sprite re-bakes (on a machine that can keep up, k→1).
 *
 * The blit must land the sprite's BAKED foot on the LIVE world foot for any
 * `k`, and be byte-identical to the box-corner blit at rest (k=1) so the
 * settled frame never moves.
 *
 * These are pure-math contract tests mirroring the exact expressions the
 * renderer uses; they lock the invariant the runtime probe verified in situ.
 */

/** Baked foot offset within the sprite (css bake px), captured at bake:
 *  footA = footScreen(bake) − boxTopLeft(bake) + margin. */
function bakedFootOffset(footBake: number, boxBake: number, margin: number): number {
  return footBake - boxBake + margin;
}

/** NEW pivot: origin so the baked foot lands on the live foot (foot − footA·k). */
function newOrigin(footLive: number, footA: number, k: number): number {
  return footLive - footA * k;
}

/** OLD pivot: origin from the LIVE box offset (foot − (foot − box + margin)·k). */
function oldOrigin(footLive: number, boxLive: number, margin: number, k: number): number {
  return footLive - (footLive - boxLive + margin) * k;
}

/** Where the baked foot actually lands = origin + footA·k. */
function drawnFoot(origin: number, footA: number, k: number): number {
  return origin + footA * k;
}

test('foot-anchor: byte-identical to the box-corner blit at rest (k=1)', () => {
  // A fresh/rest sprite: bake state == live state, k = 1.
  const margin = 6;
  for (const [foot, box] of [
    [120, 92],
    [1440.5, 1401.25],
    [-30, -58.4],
  ] as const) {
    const footA = bakedFootOffset(foot, box, margin);
    const dNew = newOrigin(foot, footA, 1);
    const dOld = oldOrigin(foot, box, margin, 1);
    assert.equal(dNew, dOld, 'new pivot must equal old pivot exactly at k=1');
    // and both collapse to box − margin (the pre-anchor origin).
    assert.equal(dNew, box - margin);
  }
});

test('foot-anchor: the baked foot lands on the live foot for any k (planted)', () => {
  const margin = 6;
  const footBake = 300;
  const boxBake = 270; // foot 30px right of box-left at bake scale
  const footA = bakedFootOffset(footBake, boxBake, margin);
  // The camera then pans AND the scale diverges (glide staleness / depth):
  const footLive = 512.4; // wherever worldToScreen now puts the foot
  for (const k of [0.5, 1, 1.37, 2, 3.25]) {
    const origin = newOrigin(footLive, footA, k);
    assert.ok(
      Math.abs(drawnFoot(origin, footA, k) - footLive) < 1e-9,
      `baked foot must land on live foot at k=${k}`,
    );
  }
});

test('foot-anchor: the OLD live-offset blit slid the foot by (foot − box)·(1 − k)', () => {
  // Reproduce the reported drift: bake at scale S, reuse the sprite at 2·S
  // (k=2) with the live box rebuilt at the live scale. The old formula pivots
  // about the LIVE offset, so the baked foot lands off by ~footOffset·(1−k).
  const margin = 6;
  const unitFootOffset = 20; // foot-to-box-left in "unit" px
  const bakeScale = 1;
  const liveScale = 2;
  const k = liveScale / bakeScale;
  // Same world foot both times; the box offset scales with the CURRENT scale.
  const footBake = 400;
  const boxBake = footBake - unitFootOffset * bakeScale;
  const footLive = 400; // camera unchanged, only scale grew (frozen glide)
  const boxLive = footLive - unitFootOffset * liveScale;
  const footA = bakedFootOffset(footBake, boxBake, margin);

  const oldFoot = drawnFoot(oldOrigin(footLive, boxLive, margin, k), footA, k);
  const newFoot = drawnFoot(newOrigin(footLive, footA, k), footA, k);

  // OLD drifts by footOffset·(1 − k) (at live scale); NEW stays planted.
  const expectedDrift = unitFootOffset * liveScale * (1 - k); // = 20·2·(1−2) = −40
  assert.ok(Math.abs(oldFoot - footLive - expectedDrift) < 1e-9, 'old drift matches ~footOffset·(1−k)');
  assert.ok(Math.abs(oldFoot - footLive) > 20, 'old formula visibly slides the foot under staleness-k');
  assert.ok(Math.abs(newFoot - footLive) < 1e-9, 'new formula keeps the foot planted');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkNearBandEligible,
  chunkBakePxWarp,
  chunkResDeficit,
  inNearRing,
  lodTierWarp,
} from './bakeWarp.js';

// The renderer's real tiers: TILE_PX=32 → FAR 32px, NEAR 64px/tile.
const NEAR = 64;
const FAR = 32;
// Sprite LOD rails (kept in sync with renderer.ts LOD_TIER_*).
const HYST = 1.0;
const MIN = -2;
const MAX = 4;

test('B5a — chunk near-band eligibility (near-edge depthScale)', async (t) => {
  await t.test('near edge at/past the look-at (depthScale ≥ 1) is eligible', () => {
    assert.equal(chunkNearBandEligible(1), true);
    assert.equal(chunkNearBandEligible(1.4), true);
    assert.equal(chunkNearBandEligible(2.3), true);
  });

  await t.test('near edge north of the look-at (minified, <1) is not eligible', () => {
    assert.equal(chunkNearBandEligible(0.99), false);
    assert.equal(chunkNearBandEligible(0.5), false);
  });

  await t.test('the boundary is inclusive at exactly 1 (the flat look-at row)', () => {
    // depthScale is exactly 1 at the look-at row; that chunk can magnify
    // as the player advances, so it must bake dense.
    assert.equal(chunkNearBandEligible(1), true);
  });
});

test('B5a — chunk bake px warps down from the near-worst tier', async (t) => {
  await t.test('an eligible (near) chunk bakes at the dense NEAR tier', () => {
    assert.equal(chunkBakePxWarp(NEAR, FAR, 1.0), NEAR);
    assert.equal(chunkBakePxWarp(NEAR, FAR, 2.3), NEAR);
  });

  await t.test('a genuinely far chunk bakes once at the sparse FAR tier', () => {
    assert.equal(chunkBakePxWarp(NEAR, FAR, 0.6), FAR);
  });

  await t.test('the near-worst tier is depth-INDEPENDENT once eligible', () => {
    // The whole point of warp-down: an eligible chunk picks NEAR
    // regardless of HOW near — the GL warp downscales it for every
    // farther depth, so there is no per-depth tier to re-bake across.
    const a = chunkBakePxWarp(NEAR, FAR, 1.01);
    const b = chunkBakePxWarp(NEAR, FAR, 2.29);
    assert.equal(a, b);
    assert.equal(a, NEAR);
  });
});

test('B5b — resolution deficit only fires on an UP-res need', async (t) => {
  await t.test('a sparse chunk that now wants the dense tier is a deficit', () => {
    assert.equal(chunkResDeficit(FAR, NEAR), true);
  });

  await t.test('a dense chunk that only wants the sparse tier is NOT a deficit', () => {
    // Warp-down: a receding dense chunk is downscaled, never re-baked.
    assert.equal(chunkResDeficit(NEAR, FAR), false);
  });

  await t.test('a chunk already at the wanted tier is not a deficit', () => {
    assert.equal(chunkResDeficit(NEAR, NEAR), false);
    assert.equal(chunkResDeficit(FAR, FAR), false);
  });
});

test('B5b — the deficit lane is bounded to the near ring', async (t) => {
  await t.test('the 3×3 under the player (Chebyshev ≤ 1) is in-ring', () => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        assert.equal(inNearRing(10 + dx, 20 + dy, 10, 20, 1), true);
      }
    }
  });

  await t.test('a chunk two steps out (deep frustum far field) is out of ring', () => {
    assert.equal(inNearRing(12, 20, 10, 20, 1), false);
    assert.equal(inNearRing(10, 23, 10, 20, 1), false);
  });
});

test('B5a — sprite LOD tier WARP-DOWN ratchet', async (t) => {
  await t.test('with no baked sprite it is the plain √2 tier', () => {
    // depthScale 2 → log2(2)*2 = 2.
    assert.equal(lodTierWarp(2, undefined, HYST, MIN, MAX), 2);
    // depthScale 1 (q=0 caller) → tier 0, the flat density.
    assert.equal(lodTierWarp(1, undefined, HYST, MIN, MAX), 0);
  });

  await t.test('a receding sprite RATCHETS — never re-bakes to a sparser tier', () => {
    // Baked at tier 2 (near); it recedes so the raw tier drops to 0.
    // Warp-down keeps the denser sheet and downscales — tier holds at 2.
    assert.equal(lodTierWarp(1, 2, HYST, MIN, MAX), 2);
    assert.equal(lodTierWarp(0.5, 2, HYST, MIN, MAX), 2);
  });

  await t.test('it rises only when a nearer depth out-resolves by a full step', () => {
    // Baked at tier 0; a small magnification (raw 0.5) is within the
    // hysteresis of tier 0 → holds (no jitter re-bake).
    assert.equal(lodTierWarp(2 ** 0.25, 0, HYST, MIN, MAX), 0); // log2·2 = 0.5
    // A full step nearer (raw ≥ 1 past the tier) → up-bakes.
    assert.equal(lodTierWarp(2 ** 0.6, 0, HYST, MIN, MAX), 1); // log2·2 = 1.2 ≥ 1
  });

  await t.test('the tier is clamped to [MIN, MAX]', () => {
    assert.equal(lodTierWarp(64, undefined, HYST, MIN, MAX), MAX); // log2(64)*2=12
    assert.equal(lodTierWarp(0.01, undefined, HYST, MIN, MAX), MIN);
  });

  await t.test('a receding sprite never re-bakes down even past the min clamp', () => {
    // Held at tier 3; recedes hard — still 3, warp-down carries it.
    assert.equal(lodTierWarp(0.01, 3, HYST, MIN, MAX), 3);
  });
});

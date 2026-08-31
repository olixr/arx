import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRASS_CELL_SPAN,
  GRASS_POOL_MAX_BYTES,
  GRASS_POOL_SLOT_MAX_BYTES,
  GRASS_SPRITE_BUDGET_BYTES,
  GRASS_SPRITE_ONE_MAX_BYTES,
  GRASS_SPRITE_RELIEF_BYTES,
  GrassVerdict,
  SHEAR_CAP,
  SHEAR_PER_WIND,
  admitGrassSprite,
  cellStartTx,
  grassPoolAdmits,
  grassPoolClass,
  grassSweepNeeded,
  grassSweepRelieved,
  planGrassSweep,
  rowShear,
  scaleFresh,
  windTerm,
} from './grassSpriteBudget.js';

const MB = 1048576;

test('cell keying is world-aligned', async (t) => {
  await t.test('cells cut on absolute multiples of the span', () => {
    assert.equal(cellStartTx(0), 0);
    assert.equal(cellStartTx(15), 0);
    assert.equal(cellStartTx(16), 16);
    assert.equal(cellStartTx(31), 16);
  });
  await t.test('negative coordinates floor, never truncate toward zero', () => {
    // A truncating divide would give -1..-16 the SAME cell as 0..15
    // and the eastern/western seam would double-key.
    assert.equal(cellStartTx(-1), -GRASS_CELL_SPAN);
    assert.equal(cellStartTx(-16), -GRASS_CELL_SPAN);
    assert.equal(cellStartTx(-17), -2 * GRASS_CELL_SPAN);
  });
});

test('the shear', async (t) => {
  await t.test('zero delta is zero shear — a fresh bake blits verbatim', () => {
    assert.equal(rowShear(0.6, 0.6), 0);
  });
  await t.test('the ratio is the traced tip constant', () => {
    assert.equal(rowShear(0.8, 0.6), (0.8 - 0.6) * SHEAR_PER_WIND);
  });
  await t.test('a starved queue degrades into the cap, not root-skate', () => {
    // Full wind swing against a stale bake: without the cap this would
    // slide blade bases visibly sideways.
    assert.equal(rowShear(1.4, -0.6), SHEAR_CAP);
    assert.equal(rowShear(-0.6, 1.4), -SHEAR_CAP);
  });
  await t.test('windTerm matches buildBlade’s bend component', () => {
    assert.equal(windTerm(1, 0), 1);
    assert.equal(windTerm(0, 1), 0.35);
  });
});

test('scale slack', () => {
  assert.equal(scaleFresh(48, 48), true);
  assert.equal(scaleFresh(48 * 1.2, 48), true);
  assert.equal(scaleFresh(48 * 1.3, 48), false);
  assert.equal(scaleFresh(48 * 0.7, 48), false);
});

test('admission gate', async (t) => {
  await t.test('ordinary sprite on an empty ledger admits', () => {
    assert.equal(admitGrassSprite(0, MB), GrassVerdict.Admit);
  });
  await t.test('ONE SPRITE IS NEVER A BUDGET', () => {
    assert.equal(admitGrassSprite(0, GRASS_SPRITE_ONE_MAX_BYTES + 1), GrassVerdict.TooBig);
    assert.equal(admitGrassSprite(0, GRASS_SPRITE_ONE_MAX_BYTES), GrassVerdict.Admit);
  });
  await t.test('the ledger is a ceiling', () => {
    assert.equal(admitGrassSprite(GRASS_SPRITE_BUDGET_BYTES - MB, MB), GrassVerdict.Admit);
    assert.equal(admitGrassSprite(GRASS_SPRITE_BUDGET_BYTES - MB + 1, MB), GrassVerdict.Full);
  });
});

test('sweep', async (t) => {
  await t.test('THE SWEEP KEEPS THE HEADROOM — it triggers at relief, not the ceiling', () => {
    assert.ok(GRASS_SPRITE_RELIEF_BYTES < GRASS_SPRITE_BUDGET_BYTES);
    // Sweeping only past the ceiling latches the gate: a scene change
    // parks the old working set a hair under budget and nothing new
    // ever admits (measured: 95.6MB against 96, zero admissions).
    assert.equal(grassSweepNeeded(GRASS_SPRITE_RELIEF_BYTES), false);
    assert.equal(grassSweepNeeded(GRASS_SPRITE_RELIEF_BYTES + 1), true);
    assert.equal(grassSweepRelieved(GRASS_SPRITE_RELIEF_BYTES), true);
    assert.equal(grassSweepRelieved(GRASS_SPRITE_RELIEF_BYTES + 1), false);
  });
  await t.test('A SPRITE THIS FRAME NEEDED IS NOT COLD', () => {
    const plan = planGrassSweep(
      [
        { key: 1, used: 100 },
        { key: 2, used: 99 },
        { key: 3, used: 42 },
      ],
      100,
    );
    assert.deepEqual(plan, [3, 2]);
  });
  await t.test('coldest first', () => {
    const plan = planGrassSweep(
      [
        { key: 1, used: 90 },
        { key: 2, used: 10 },
        { key: 3, used: 50 },
      ],
      100,
    );
    assert.deepEqual(plan, [2, 3, 1]);
  });
});

test('THE CADENCE PAYS A BUDGET', async (t) => {
  const { GRASS_ROW_CADENCE_MS, GRASS_ROW_CADENCE_MAX_MS, rowCadenceStep, rowCadenceJitter } =
    await import('./grassSpriteBudget.js');
  await t.test('a heavy frame stretches the beat', () => {
    assert.ok(rowCadenceStep(500, 10) > 500);
  });
  await t.test('the beat never passes the ceiling', () => {
    assert.equal(rowCadenceStep(GRASS_ROW_CADENCE_MAX_MS, 100), GRASS_ROW_CADENCE_MAX_MS);
  });
  await t.test('idle frames ease back to the floor, never past it', () => {
    let c = 2000;
    for (let i = 0; i < 5000; i++) c = rowCadenceStep(c, 0);
    assert.equal(c, GRASS_ROW_CADENCE_MS);
  });
  await t.test('a modest frame holds steady', () => {
    assert.equal(rowCadenceStep(1000, 2), 1000);
  });
  await t.test('jitter is keyed, bounded, and deterministic', () => {
    for (const key of [1, 77, 539066384]) {
      const j = rowCadenceJitter(key, 1000);
      assert.ok(j >= 0 && j <= 400);
      assert.equal(j, rowCadenceJitter(key, 1000));
    }
  });
});

test('pool', async (t) => {
  await t.test('shape classes collapse near sizes into one bucket', () => {
    assert.equal(grassPoolClass(1500, 130), grassPoolClass(1480, 140));
    assert.notEqual(grassPoolClass(1500, 130), grassPoolClass(1600, 130));
  });
  await t.test('a pool is bytes, not slots', () => {
    assert.equal(grassPoolAdmits(0, GRASS_POOL_SLOT_MAX_BYTES + 1), false);
    assert.equal(grassPoolAdmits(GRASS_POOL_MAX_BYTES - MB, MB), true);
    assert.equal(grassPoolAdmits(GRASS_POOL_MAX_BYTES - MB + 1, MB), false);
  });
});

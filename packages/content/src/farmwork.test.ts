import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  APIARY_FINE_FLOWERS,
  APIARY_PRIME_FLOWERS,
  WORK_BATCH_CAP,
  WORK_RECIPES,
  WORK_STATION_TILES,
  WORK_VERBS,
  apiaryGrade,
  workDone,
  workOutputId,
  workRecipesFor,
} from './farmwork.js';
import { GRADED_PRODUCE, PROCESSED_GRADED, gradedId } from './farming.js';
import { itemDef } from './items.js';
import { BUILDABLES } from './buildables.js';
import { RECIPES } from './recipes.js';

test('every work recipe stands whole: station, items, level, clock', () => {
  for (const r of WORK_RECIPES.values()) {
    assert.ok(itemDef(r.output.item), `${r.id} output missing`);
    for (const i of r.inputs) assert.ok(itemDef(i.item), `${r.id} input ${i.item} missing`);
    assert.ok(r.minutes >= 1 && r.levelReq >= 1 && r.xp > 0);
    assert.ok(WORK_VERBS[r.station], `${r.station} has no verb`);
    assert.ok([...WORK_STATION_TILES.values()].includes(r.station), `${r.station} has no tile`);
    // THE JOB PAYS IN TIME AND VALUE, NEVER A FASTER LADDER: xp per
    // measure stays under minutes x 12 (active crafting always wins
    // the xp race; the yard wins the errand race).
    assert.ok(r.xp <= r.minutes * 12, `${r.id} xp ${r.xp} beats the wall-clock band`);
  }
});

test('every yard station is buildable and every output feeds someone or IS food', () => {
  for (const id of ['windmill', 'churn', 'press', 'keg', 'smoker', 'drying_rack', 'apiary']) {
    assert.ok(BUILDABLES.has(id), `${id} not buildable`);
  }
  for (const r of WORK_RECIPES.values()) {
    const out = itemDef(r.output.item)!;
    const eaten = out.heals !== undefined || out.buff !== undefined;
    const consumed =
      [...RECIPES.values()].some((x) => x.inputs.some((i) => i.item === r.output.item)) ||
      [...WORK_RECIPES.values()].some((x) => x.inputs.some((i) => i.item === r.output.item));
    assert.ok(eaten || consumed, `${r.output.item} feeds no one`);
  }
});

test('the wall clock is pure and incremental', () => {
  const r = WORK_RECIPES.get('work_mill_flour')!;
  const t0 = 1_000_000;
  assert.equal(workDone(r, t0, 5, t0), 0);
  assert.equal(workDone(r, t0, 5, t0 + r.minutes * 60_000 - 1), 0);
  assert.equal(workDone(r, t0, 5, t0 + r.minutes * 60_000), 1);
  assert.equal(workDone(r, t0, 5, t0 + r.minutes * 60_000 * 3.5), 3);
  // The clock never pays past the queue.
  assert.equal(workDone(r, t0, 5, t0 + r.minutes * 60_000 * 99), 5);
  assert.equal(workDone(r, t0, 0, t0 + 1e9), 0);
});

test('THE BATCH IS AS GOOD AS ITS WEAKEST MEASURE: graded outputs resolve', () => {
  const churn = WORK_RECIPES.get('work_churn_butter')!;
  assert.equal(workOutputId(churn, 0), 'butter');
  assert.equal(workOutputId(churn, 1), 'butter_fine');
  assert.equal(workOutputId(churn, 2), 'butter_prime');
  for (const base of PROCESSED_GRADED) {
    assert.ok(GRADED_PRODUCE.has(base), `${base} must be in the graded set`);
    for (const g of [1, 2] as const) {
      assert.ok(itemDef(gradedId(base, g)), `${base} grade ${g} def missing`);
    }
  }
  // Smoked goods deliberately stay plain (meat never grades).
  const smoke = WORK_RECIPES.get('work_smoke_beef')!;
  assert.equal(workOutputId(smoke, 2), 'smoked_beef');
});

test('the hive grades by flowers, world-state only', () => {
  assert.equal(apiaryGrade(0), 0);
  assert.equal(apiaryGrade(APIARY_FINE_FLOWERS), 1);
  assert.equal(apiaryGrade(APIARY_PRIME_FLOWERS), 2);
  assert.ok(WORK_BATCH_CAP >= 5);
});

test('every station shelf holds at least one work recipe', () => {
  for (const station of WORK_STATION_TILES.values()) {
    assert.ok(workRecipesFor(station).length > 0, `${station} shelf is bare`);
  }
});

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  COMPOST_BATCH_WORTH,
  COMPOST_PRIME_WORTH,
  GRADED_PRODUCE,
  GRADE_VALUE_MULT,
  compostWorthOf,
  gradeFor,
  gradeOf,
  gradedId,
  wateringsOf,
} from './farming.js';
import { CROPS } from './crops.js';
import { itemDef } from './items.js';
import { BUILDABLES } from './buildables.js';

// ---------------------------------------------------------- the fold

test('THE CARE FOLD: grade thresholds are exact and deterministic', () => {
  // Untended = plain, forever.
  assert.equal(gradeFor(0, 0, 0), 0);
  // Two care points reach fine by any road.
  assert.equal(gradeFor(2, 0, 0), 1);
  assert.equal(gradeFor(0, 1, 1), 1);
  assert.equal(gradeFor(1, 1, 0), 1);
  // Four reach prime by MORE THAN ONE road (missing one care never
  // locks the top out — the law the plan doc pins).
  assert.equal(gradeFor(2, 2, 0), 2); // rich soil + a watered life
  assert.equal(gradeFor(2, 1, 1), 2); // enriched + water + blanket
  assert.equal(gradeFor(1, 2, 1), 2);
  // Three sits at fine, never prime.
  assert.equal(gradeFor(2, 1, 0), 1);
  // The whole hand: everything given.
  assert.equal(gradeFor(2, 2, 1), 2);
});

test('wateringsOf counts exactly the two waterable stage bits', () => {
  assert.equal(wateringsOf(0), 0);
  assert.equal(wateringsOf(1), 1);
  assert.equal(wateringsOf(2), 1);
  assert.equal(wateringsOf(3), 2);
  // A stray high bit never inflates the count.
  assert.equal(wateringsOf(7), 2);
});

// ------------------------------------------------------- graded defs

test('every crop yield generates fine and prime defs with grown value', () => {
  for (const crop of CROPS.values()) {
    // The dark bed earns no care facts — its reagents never grade.
    if (crop.bed === 'log') continue;
    const base = itemDef(crop.yield.item);
    assert.ok(base, `${crop.yield.item} has a def`);
    for (const grade of [1, 2] as const) {
      const graded = itemDef(gradedId(crop.yield.item, grade));
      assert.ok(graded, `${crop.yield.item} grade ${grade} generated`);
      assert.equal(graded.value, Math.round(base.value * GRADE_VALUE_MULT[grade]));
      assert.equal(graded.stackable, base.stackable);
      if (base.heals !== undefined) {
        assert.equal(graded.heals, Math.ceil(base.heals * GRADE_VALUE_MULT[grade]));
      }
      // The id reads back to its family.
      const read = gradeOf(graded.id);
      assert.equal(read.base, crop.yield.item);
      assert.equal(read.grade, grade);
    }
  }
});

test('gradeOf leaves foreign ids untouched at grade 0', () => {
  assert.deepEqual(gradeOf('carrot'), { base: 'carrot', grade: 0 });
  assert.deepEqual(gradeOf('bronze_sword'), { base: 'bronze_sword', grade: 0 });
  // A suffix on a non-produce family is NOT a grade.
  assert.deepEqual(gradeOf('gloomsilk_fine'), { base: 'gloomsilk_fine', grade: 0 });
});

// ---------------------------------------------------------- the bin

test('THE COMPOST DOOR: produce, seeds, spoils, and plain food enter; bottles, gear, and quest goods never do', () => {
  const worth = (id: string) => compostWorthOf(id, itemDef(id));
  // Plain produce is one measure; graded produce carries its grade.
  assert.deepEqual(worth('carrot'), { worth: 1, graded: 0 });
  assert.deepEqual(worth('carrot_fine'), { worth: 2, graded: 2 });
  assert.deepEqual(worth('carrot_prime'), { worth: 3, graded: 3 });
  assert.deepEqual(worth('carrot_seed'), { worth: 1, graded: 0 });
  assert.deepEqual(worth('burnt_food'), { worth: 1, graded: 0 });
  assert.deepEqual(worth('berries'), { worth: 1, graded: 0 });
  assert.deepEqual(worth('plant_fibre'), { worth: 1, graded: 0 });
  // Plain solid food (the kitchen's failure sink includes successes).
  assert.ok(worth('bread'));
  assert.ok(worth('raw_beef'));
  // Refused at the door: anything bottled, worn, or quest-bound.
  assert.equal(worth('healing_tincture'), null);
  assert.equal(worth('adderfang_oil'), null);
  assert.equal(worth('bronze_sword'), null);
  assert.equal(worth('watering_can'), null);
  assert.equal(worth('board'), null);
  assert.equal(worth('nonsense_item'), null);
});

test('a prime batch is reachable and the thresholds stay sane', () => {
  // Two prime carrots and two plain scraps close a batch at 8 with
  // 6 graded measures — comfortably prime. The constants must keep
  // that story true: prime is earned by good harvests, not by bulk.
  assert.ok(COMPOST_PRIME_WORTH <= COMPOST_BATCH_WORTH);
  const primeCarrot = compostWorthOf('carrot_prime', itemDef('carrot_prime'))!;
  assert.ok(primeCarrot.graded * 2 >= COMPOST_PRIME_WORTH);
});

// ------------------------------------------------------- buildables

test('THE LIVING SOIL buildables stand in the registry with their skills', () => {
  const bin = BUILDABLES.get('compost_bin');
  assert.ok(bin);
  assert.equal(bin.skill, 'farming');
  assert.equal(bin.cat, 'station');
  const well = BUILDABLES.get('well');
  assert.ok(well);
  assert.equal(well.skill ?? 'construction', 'construction');
  const channel = BUILDABLES.get('irrigation_channel');
  assert.ok(channel);
  assert.equal(channel.skill, 'farming');
  assert.equal(channel.cat, 'foundation');
});

test('THE ORCHARD SHAPE: recurring cooldowns fit inside the mid stage', () => {
  // The re-aim lands at growMs - cooldownMs, which must sit at or
  // past the mid boundary (0.25 x grow) or the standing tree would
  // wrongly fall back to a bare sprout. cooldown <= 0.75 x grow.
  for (const crop of CROPS.values()) {
    if (!crop.recurring) continue;
    assert.ok(
      crop.recurring.cooldownMinutes <= crop.growMinutes * 0.75,
      `${crop.id} cooldown ${crop.recurring.cooldownMinutes} exceeds mid-stage window`,
    );
    assert.ok(crop.recurring.cooldownMinutes >= 1, `${crop.id} cooldown must be whole minutes`);
  }
});

test('graded produce never leaks into GRADED_PRODUCE as its own base', () => {
  for (const base of GRADED_PRODUCE) {
    assert.equal(gradeOf(base).grade, 0, `${base} is a base, not a graded id`);
  }
});

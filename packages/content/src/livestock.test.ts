import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BOND_FINE,
  BOND_PRIME,
  LIVESTOCK,
  LIVESTOCK_BY_CRATE,
  LIVESTOCK_CAP,
  LIVESTOCK_PRODUCE_ITEMS,
  TROUGH_FEED_CAP,
  TROUGH_STOCK_CAP,
  bondTier,
  feedWorthOf,
  livestockGrade,
} from './livestock.js';
import { GRADED_PRODUCE, LIVESTOCK_GRADED, gradeOf, gradedId } from './farming.js';
import { itemDef } from './items.js';
import { npcDef } from './npcs.js';
import { BUILDABLES } from './buildables.js';
import { shopDef } from './shop.js';
import { TAMES } from './tames.js';
import { RECIPES } from './recipes.js';

test('every yard species stands on an existing body with a whole contract', () => {
  for (const [species, def] of LIVESTOCK) {
    assert.ok(npcDef(species), `${species} has no NpcDef body`);
    assert.ok(itemDef(def.crateItem), `${def.crateItem} missing`);
    assert.ok(itemDef(def.produce.item), `${def.produce.item} missing`);
    assert.ok(def.produce.cooldownSec > 0 && def.produce.xp > 0);
    assert.ok(def.produce.verb.length > 0, `${species} needs its spoken verb`);
    assert.ok(def.levelReq >= 1);
    assert.equal(LIVESTOCK_BY_CRATE.get(def.crateItem), def, `${species} crate lookup broken`);
  }
});

test('the yard produce grades like the field (the two lists agree)', () => {
  // farming.ts inlines the graded list to stay at the import graph's
  // bottom — this is the pin that keeps the copies honest.
  assert.deepEqual([...LIVESTOCK_GRADED].sort(), [...LIVESTOCK_PRODUCE_ITEMS].sort());
  for (const item of LIVESTOCK_PRODUCE_ITEMS) {
    assert.ok(GRADED_PRODUCE.has(item), `${item} must grade`);
    for (const grade of [1, 2] as const) {
      assert.ok(itemDef(gradedId(item, grade)), `${item} grade ${grade} def missing`);
    }
  }
});

test("the drover's counter sells every crate and the lead", () => {
  const yard = shopDef('drover_yard');
  assert.ok(yard, 'drover_yard shop missing');
  const stocked = new Set(yard.stock.map((s) => s.item));
  for (const def of LIVESTOCK.values()) {
    assert.ok(stocked.has(def.crateItem), `${def.crateItem} not on the counter`);
  }
  assert.ok(stocked.has('drovers_lead'));
});

test('the manger door: barley first, produce serves, junk refused', () => {
  const isProduce = (base: string) => GRADED_PRODUCE.has(base);
  assert.equal(feedWorthOf('barley', gradeOf, isProduce), 2);
  assert.equal(feedWorthOf('carrot', gradeOf, isProduce), 1);
  assert.equal(feedWorthOf('carrot_prime', gradeOf, isProduce), 3);
  assert.equal(feedWorthOf('bronze_sword', gradeOf, isProduce), null);
  assert.equal(feedWorthOf('board', gradeOf, isProduce), null);
});

test("THE YARD'S CARE FOLD: fed reaches fine, fed and loved reaches prime", () => {
  assert.equal(livestockGrade(false, 0), 0);
  assert.equal(livestockGrade(true, 0), 1);
  assert.equal(livestockGrade(false, BOND_FINE), 0, 'bond alone stays plain (one point)');
  assert.equal(livestockGrade(false, BOND_PRIME), 1, 'deep bond alone reaches fine');
  assert.equal(livestockGrade(true, BOND_FINE), 1);
  assert.equal(livestockGrade(true, BOND_PRIME), 2);
  assert.equal(bondTier(BOND_FINE - 1), 0);
  assert.equal(bondTier(BOND_PRIME), 2);
});

test('the yard and the heel stay separate lanes forever', () => {
  // A species may exist in both worlds (the boar is a companion AND
  // a truffle pig) — but the LANES never share a def: livestock defs
  // carry no tame contract and the caps stay sane.
  assert.ok(LIVESTOCK_CAP >= TROUGH_STOCK_CAP);
  assert.ok(TROUGH_FEED_CAP > 0);
  // Chicken and cow must NEVER become tames (they are the yard's).
  assert.ok(!TAMES.has('chicken'), 'chicken must never join the TAMES whitelist');
  assert.ok(!TAMES.has('cow'), 'cow must never join the TAMES whitelist');
});

test('every yard product feeds someone (the consumer law)', () => {
  const consumers = (item: string) =>
    [...RECIPES.values()].filter((r) => r.inputs.some((i) => i.item === item));
  assert.ok(consumers('wool').length > 0, 'wool has no consumer');
  assert.ok(consumers('truffle').length > 0, 'truffle has no consumer');
  assert.ok(consumers('egg').length > 0);
  assert.ok(consumers('milk').length > 0);
  assert.ok(BUILDABLES.has('feed_trough'), 'feed_trough missing');
  assert.equal(BUILDABLES.get('feed_trough')!.skill, 'beastcraft');
});

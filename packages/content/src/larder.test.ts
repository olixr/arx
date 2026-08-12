import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  LARDER_HOSTS,
  LARDER_MULT_MAX,
  LARDER_MULT_MIN,
  LARDER_PERIOD_MS,
  LARDER_QTY_MAX,
  LARDER_QTY_MIN,
  larderEpoch,
  larderHost,
  larderOrder,
} from './larder.js';
import { itemDef } from './items.js';
import { shopDef } from './shop.js';

test('every larder host stands on a real counter and a real pantry', () => {
  for (const host of LARDER_HOSTS) {
    assert.ok(shopDef(host.shop), `${host.shop} is not a shop`);
    assert.ok(host.pool.length >= 3, `${host.shop} pool too thin to rotate`);
    for (const item of host.pool) {
      const def = itemDef(item);
      assert.ok(def, `${host.shop} wants '${item}' which does not exist`);
      assert.ok(def.value > 0, `${item} has no value to premium`);
      assert.ok(!def.gear, `${item} is gear — the larder eats, it never arms`);
    }
  }
});

test('THE ORDER IS WORLD-STATE: deterministic, bounded, and it rotates', () => {
  for (const host of LARDER_HOSTS) {
    const a = larderOrder(host, 1000);
    const b = larderOrder(host, 1000);
    assert.deepEqual(a, b, 'same epoch must deal the same order');
    assert.ok(host.pool.includes(a.item));
    assert.ok(a.qty >= LARDER_QTY_MIN && a.qty <= LARDER_QTY_MAX);
    assert.ok(a.mult >= LARDER_MULT_MIN && a.mult <= LARDER_MULT_MAX + 0.01);
    // Across a run of epochs the board must actually turn (a stuck
    // hash would freeze one item forever).
    const seen = new Set<string>();
    for (let e = 0; e < 24; e++) seen.add(larderOrder(host, e).item);
    assert.ok(seen.size >= 2, `${host.shop} board never rotates`);
  }
});

test('the epoch clock is honest', () => {
  assert.equal(larderEpoch(0), 0);
  assert.equal(larderEpoch(LARDER_PERIOD_MS - 1), 0);
  assert.equal(larderEpoch(LARDER_PERIOD_MS), 1);
  assert.ok(larderHost('drover_yard'));
  assert.equal(larderHost('no_such_counter'), undefined);
});

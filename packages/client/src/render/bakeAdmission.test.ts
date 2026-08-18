import test from 'node:test';
import assert from 'node:assert/strict';
import { admitBake, BakeLane, type BakeBudgets } from './bakeAdmission.js';

/** A frame that has just started: every allowance full. */
function freshFrame(over: Partial<BakeBudgets> = {}): BakeBudgets {
  return {
    arrivalMsLeft: 60,
    budgetMsLeft: 2.5,
    budgetMsFull: 2.5,
    count: 48,
    costEma: 0.3,
    floorUsed: false,
    gliding: false,
    ...over,
  };
}

test('bake admission', async (t) => {
  await t.test('a visible miss bakes on the arrival lane', () => {
    assert.equal(admitBake(freshFrame(), true, true), BakeLane.Arrival);
  });

  await t.test('an off-screen miss rides the ordinary allowance', () => {
    assert.equal(admitBake(freshFrame(), true, false), BakeLane.Budgeted);
  });

  await t.test('a stale sprite refreshes on the ordinary allowance only', () => {
    assert.equal(admitBake(freshFrame(), false, true), BakeLane.Budgeted);
  });

  // THE ESTIMATE MAY NEVER OUTGROW ITS LANE. This is the deadlock that
  // shipped: a weak machine's bakes ran long, the running average
  // climbed past every allowance, and because the average only updates
  // inside an admitted bake, the lane could never reopen. The world
  // stopped caching, and the draw paths stopped drawing it.
  await t.test('a full allowance always admits, however wild the estimate', () => {
    for (const costEma of [0.3, 5, 50, 5_000, Number.MAX_SAFE_INTEGER]) {
      const f = freshFrame({ costEma });
      assert.notEqual(
        admitBake(f, true, false),
        BakeLane.None,
        `off-screen miss declined at costEma ${costEma}`,
      );
      assert.notEqual(
        admitBake(f, false, true),
        BakeLane.None,
        `stale refresh declined at costEma ${costEma}`,
      );
      assert.equal(
        admitBake(f, true, true),
        BakeLane.Arrival,
        `visible miss declined at costEma ${costEma}`,
      );
    }
  });

  // THE ARRIVAL PAYS ONCE: on screen and absent outranks the estimate,
  // the count backstop and an exhausted ordinary allowance alike.
  await t.test('a visible miss outranks every other exhausted budget', () => {
    const spent = freshFrame({ budgetMsLeft: 0, count: 0, costEma: 900, floorUsed: true });
    assert.equal(admitBake(spent, true, true), BakeLane.Arrival);
  });

  // THE FLOOR: past every allowance the frame still mints one sprite,
  // so the estimate gets a fresh sample and the cache converges from
  // any state — including the state the old deadlock left it in.
  await t.test('the floor grants exactly one mint past every budget', () => {
    const spent = freshFrame({ arrivalMsLeft: 0, budgetMsLeft: 0, count: 0, costEma: 900 });
    assert.equal(admitBake(spent, true, true), BakeLane.Floor, 'floor unspent');
    assert.equal(
      admitBake({ ...spent, floorUsed: true }, true, true),
      BakeLane.None,
      'floor already spent',
    );
  });

  // RE-BAKES ARE POLISH: they get no floor. A sprite in hand is already
  // on screen and correct; minting it again is never worth a guarantee.
  await t.test('the floor never applies to a mere refresh', () => {
    const spent = freshFrame({ arrivalMsLeft: 0, budgetMsLeft: 0, count: 0 });
    assert.equal(admitBake(spent, false, true), BakeLane.None);
  });

  await t.test('a zoom glide stands re-bakes down but never a first mint', () => {
    const g = freshFrame({ gliding: true });
    assert.equal(admitBake(g, false, true), BakeLane.None, 'refresh during glide');
    assert.equal(admitBake(g, true, true), BakeLane.Arrival, 'visible miss during glide');
    assert.equal(admitBake(g, true, false), BakeLane.Budgeted, 'pad miss during glide');
  });

  // The "don't start on fumes" intent survives the clamp: a lane with a
  // sliver left still declines work it plainly cannot pay for.
  await t.test('a nearly-spent allowance still declines a refresh', () => {
    assert.equal(
      admitBake(freshFrame({ budgetMsLeft: 0.01 }), false, true),
      BakeLane.None,
    );
  });

  await t.test('the count backstop still bounds the ordinary lane', () => {
    assert.equal(
      admitBake(freshFrame({ count: 0, floorUsed: true }), false, true),
      BakeLane.None,
    );
  });
});

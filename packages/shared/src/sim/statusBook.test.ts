import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFLICTIONS,
  AFFLICTION_SOURCE_CAP,
  BLEED_TICK_EVERY,
  BURN_TICK_EVERY,
  CHILL_SPEED_FACTOR,
  SHOCK_MAX_TICKS,
  SPARKS,
  STATUS_IDS,
  VENOM_TICK_EVERY,
  isAffliction,
  isSpark,
} from './abilities.js';
import {
  STATUS_BOOK,
  applyCount,
  ccTicksFor,
  consumeDetonation,
  decayAtZero,
  effectivePower,
  pageOf,
  refreshMax,
  stacksOf,
  thresholdsCrossed,
  weakestOf,
  type StackEntry,
  type StatusPage,
} from './statusBook.js';

/**
 * THE BOOK OF STATES (status-book-plan.md Phase 1), pinned:
 *
 * - THE FROZEN SIX: the shipped pages transcribe the live constants
 *   exactly — lanes agree with the SPARKS/AFFLICTIONS rosters, the
 *   clocks are the shipped clocks, the caps are the shipped caps,
 *   and NO shipped page authors the new machinery (count, ramp,
 *   thresholds, consume, stepDown, immunity) — byte-identical proof
 *   rides the pre-book suites; this file pins the transcription.
 * - The visuals CONTRACT is total: every page carries ink, landing,
 *   aura tiers, and an icon painter id; every DoT page a vignette;
 *   every stacking page a stack note.
 * - The pure machinery obeys its laws with SYNTHETIC pages — the
 *   page is a parameter, so the count model, ramps, thresholds,
 *   consume-at-max, and stepDown decay are law before any live page
 *   authors them.
 */

// ------------------------------------------------------- the frozen six

test('the book covers exactly the shipped roster, and pageOf agrees', () => {
  assert.deepEqual(Object.keys(STATUS_BOOK).sort(), [...STATUS_IDS].sort());
  for (const id of STATUS_IDS) {
    assert.equal(pageOf(id).id, id, `${id}'s page knows its name`);
  }
});

test('lanes transcribe the rosters: sparks, afflictions, and the one mark', () => {
  for (const id of STATUS_IDS) {
    const page = pageOf(id);
    if (isSpark(id)) assert.equal(page.lane, 'spark', `${id} is a spark`);
    else if (isAffliction(id)) assert.equal(page.lane, 'affliction', `${id} is an affliction`);
    else assert.equal(page.lane, 'mark', `${id} is the mark`);
    assert.equal(page.hostile, true, 'no boon pages before the boon lane ships');
  }
  assert.equal(SPARKS.length + AFFLICTIONS.length + 1, STATUS_IDS.length, 'the rosters partition');
});

test('the stacking models transcribe the lanes, caps included', () => {
  for (const id of SPARKS) {
    assert.equal(pageOf(id).stacking.model, 'refresh', `${id} refreshes`);
    assert.equal(pageOf(id).stacking.max, 1);
  }
  for (const id of AFFLICTIONS) {
    assert.equal(pageOf(id).stacking.model, 'perSource', `${id} stacks per hand`);
    assert.equal(pageOf(id).stacking.max, AFFLICTION_SOURCE_CAP, `${id} keeps the shipped cap`);
  }
  assert.equal(pageOf('sunder').stacking.model, 'highest');
});

test('the clocks are the shipped clocks and nothing else ticks', () => {
  assert.deepEqual(pageOf('burn').tick, { every: BURN_TICK_EVERY, kind: 'damage' });
  assert.deepEqual(pageOf('bleed').tick, { every: BLEED_TICK_EVERY, kind: 'damage' });
  assert.deepEqual(pageOf('venom').tick, { every: VENOM_TICK_EVERY, kind: 'damage' });
  for (const id of ['chill', 'shock', 'sunder'] as const) {
    assert.equal(pageOf(id).tick, undefined, `${id} ticks nothing`);
  }
});

test('chill records its slow and shock records its stagger, to the shipped numbers', () => {
  assert.equal(pageOf('chill').statMods?.moveSpeedMult, CHILL_SPEED_FACTOR);
  const cc = pageOf('shock').cc;
  assert.ok(cc && cc.kind === 'stagger');
  assert.equal(cc.maxTicks, SHOCK_MAX_TICKS);
  assert.equal(cc.immunityTicks, 0, 'no shipped page authors an immunity window');
});

test('THE FROZEN SIX author none of the new machinery', () => {
  for (const id of STATUS_IDS) {
    const page = pageOf(id);
    assert.notEqual(page.stacking.model, 'count', `${id} predates the count model`);
    assert.equal(page.stacking.atMax, 'refresh', `${id} never consumes at max`);
    assert.equal(page.ramp, undefined, `${id} carries no ramp`);
    assert.equal(page.thresholds, undefined, `${id} carries no tiers`);
    assert.equal(page.consume, undefined, `${id} carries no consume block`);
    assert.equal(page.decay.model, 'expire', `${id} expires whole`);
  }
});

test('the visuals contract is total: ink, landing, tiers, icon — and the DoTs bleed at the screen edge', () => {
  for (const id of STATUS_IDS) {
    const v = pageOf(id).visuals;
    assert.match(v.ink, /^#[0-9a-f]{6}$/i, `${id} ink is a hex`);
    assert.ok(v.landing.length > 0, `${id} names a landing`);
    assert.ok(v.auraTiers >= 1, `${id} wears at least one aura tier`);
    assert.ok(v.icon.startsWith('status_'), `${id} names its icon painter`);
    if (pageOf(id).tick?.kind === 'damage') {
      assert.match(v.vignette ?? '', /^\d+, \d+, \d+$/, `${id} tints the hurt bands`);
    }
    if (pageOf(id).stacking.model === 'perSource') {
      assert.ok(v.stackNote, `${id} carries the re-apply note`);
    }
  }
});

// -------------------------------------------------- the pure primitives

const entry = (over: Partial<StackEntry> = {}): StackEntry => ({
  id: 'venom',
  power: 3,
  ticksLeft: 100,
  ...over,
});

test('refreshMax deepens both fields and never shortens or dulls', () => {
  const e = entry();
  refreshMax(e, 5, 60);
  assert.equal(e.power, 5, 'power rises');
  assert.equal(e.ticksLeft, 100, 'a shorter late blow never shortens');
  refreshMax(e, 2, 200);
  assert.equal(e.power, 5, 'a duller late blow never dulls');
  assert.equal(e.ticksLeft, 200, 'duration rises');
});

test('weakestOf folds into the shallowest wound', () => {
  const list = [entry({ power: 4 }), entry({ power: 2 }), entry({ power: 9 })];
  assert.equal(weakestOf(list).power, 2);
});

/** A synthetic count page — the machinery's proving ground. */
const countPage = (over: Partial<StatusPage> = {}): StatusPage => ({
  id: 'venom',
  name: 'Trial Venom',
  lane: 'affliction',
  hostile: true,
  powerIs: 'tickDamage',
  stacking: { model: 'count', max: 5, atMax: 'refresh' },
  decay: { model: 'expire' },
  visuals: { ink: '#a0c050', landing: 'venom.burst', auraTiers: 3, icon: 'status_venom' },
  ...over,
});

test('effectivePower is identity without a ramp and deepens per stack with one', () => {
  const flat = countPage();
  assert.equal(effectivePower(flat, entry({ stacks: 4 })), 3, 'no ramp, no growth');
  const ramped = countPage({ ramp: { powerPerStack: 2 } });
  assert.equal(effectivePower(ramped, entry({ stacks: 1 })), 3, 'one stack is the base');
  assert.equal(effectivePower(ramped, entry({ stacks: 3 })), 7, 'each stack past the first adds');
  assert.equal(effectivePower(ramped, entry({})), 3, 'an absent count reads as one');
});

test('thresholdsCrossed answers each tier once, in order, jumps included', () => {
  const page = countPage({
    thresholds: [
      { atStacks: 2, name: 'Tainted' },
      { atStacks: 4, name: 'Envenomed' },
    ],
  });
  assert.deepEqual(thresholdsCrossed(page, 1, 2).map((t) => t.name), ['Tainted']);
  assert.deepEqual(thresholdsCrossed(page, 2, 3), [], 'no tier, no word');
  assert.deepEqual(
    thresholdsCrossed(page, 0, 5).map((t) => t.name),
    ['Tainted', 'Envenomed'],
    'a jump speaks every tier it passed, in order',
  );
  assert.deepEqual(thresholdsCrossed(page, 4, 4), [], 'standing still says nothing');
  assert.deepEqual(thresholdsCrossed(countPage(), 0, 5), [], 'no authored tiers, no words');
});

// ------------------------------------------------------ the count door

test('the count door: one entry carries the whole count to the cap', () => {
  const page = countPage();
  const list: StackEntry[] = [];
  const mk = (): StackEntry => entry({ ticksLeft: 50 });
  const first = applyCount(list, page, 3, 50, mk);
  assert.equal(first.outcome, 'new');
  assert.equal(list.length, 1, 'one entry, whatever the count');
  assert.equal(stacksOf(list[0]!), 1);
  for (let i = 0; i < 4; i++) applyCount(list, page, 3, 50, mk);
  assert.equal(list.length, 1);
  assert.equal(stacksOf(list[0]!), 5, 'the cap holds the count');
  const atCap = applyCount(list, page, 9, 200, mk);
  assert.equal(atCap.outcome, 'refreshed', 'atMax refresh re-arms');
  assert.equal(stacksOf(list[0]!), 5, 'never past the cap');
  assert.equal(list[0]!.power, 9, 'the refresh keeps the max rules');
  assert.equal(list[0]!.ticksLeft, 200);
});

test('the count door refreshes by max on every stack landed', () => {
  const page = countPage();
  const list: StackEntry[] = [];
  applyCount(list, page, 5, 100, () => entry({ power: 5, ticksLeft: 100 }));
  const second = applyCount(list, page, 2, 40, () => entry({ power: 2, ticksLeft: 40 }));
  assert.equal(second.outcome, 'stacked');
  assert.equal(list[0]!.power, 5, 'a duller landing never dulls the state');
  assert.equal(list[0]!.ticksLeft, 100, 'a shorter landing never shortens it');
});

test('consume-at-max spends the whole stack once, and the next landing starts fresh', () => {
  const page = countPage({
    stacking: { model: 'count', max: 3, atMax: 'consume' },
    ramp: { powerPerStack: 1 },
    consume: { kind: 'detonate', multPerStack: 1.5, radius: 2 },
  });
  const list: StackEntry[] = [];
  const mk = (): StackEntry => entry({ ticksLeft: 50 });
  applyCount(list, page, 3, 50, mk);
  applyCount(list, page, 3, 50, mk);
  applyCount(list, page, 3, 50, mk);
  assert.equal(stacksOf(list[0]!), 3, 'the stack fills');
  const spent = applyCount(list, page, 3, 50, mk);
  assert.equal(spent.outcome, 'consumed');
  assert.equal(spent.spent, 3, 'the whole count is spent');
  // effective power at 3 stacks = 3 + 1×2 = 5; 5 × 3 spent × 1.5 = 22.5 → 23.
  assert.equal(spent.detonation?.damage, 23, 'spend, don\'t mint — the ledger math');
  assert.equal(spent.detonation?.radius, 2);
  assert.equal(list.length, 0, 'the state leaves the body');
  const again = applyCount(list, page, 3, 50, mk);
  assert.equal(again.outcome, 'new', 'the next landing starts a fresh count');
  assert.equal(stacksOf(list[0]!), 1);
});

test('the count door speaks each tier as the count reaches it', () => {
  const page = countPage({
    thresholds: [{ atStacks: 3, name: 'Envenomed' }],
  });
  const list: StackEntry[] = [];
  const mk = (): StackEntry => entry({ ticksLeft: 50 });
  assert.deepEqual(applyCount(list, page, 3, 50, mk).crossed, [], 'one stack, no tier');
  assert.deepEqual(applyCount(list, page, 3, 50, mk).crossed, [], 'two, still quiet');
  assert.deepEqual(
    applyCount(list, page, 3, 50, mk).crossed.map((t) => t.name),
    ['Envenomed'],
    'the third landing speaks the tier',
  );
  assert.deepEqual(applyCount(list, page, 3, 50, mk).crossed, [], 'a tier speaks once');
});

test('consumeDetonation answers only detonate pages', () => {
  assert.equal(consumeDetonation(countPage(), entry({ stacks: 3 })), null, 'no consume block');
  const release = countPage({ consume: { kind: 'release' } });
  assert.equal(consumeDetonation(release, entry({ stacks: 3 })), null, 'release is not a blast');
});

// ------------------------------------------------------- the decay door

test('expire ends the state whole; stepDown sheds one stack and re-arms', () => {
  assert.equal(decayAtZero(countPage(), entry({ stacks: 3 })), 'expired', 'expire is whole');
  const page = countPage({ decay: { model: 'stepDown', stepTicks: 40 } });
  const e = entry({ stacks: 3, ticksLeft: 0 });
  assert.equal(decayAtZero(page, e), 'stepped');
  assert.equal(stacksOf(e), 2, 'one stack shed');
  assert.equal(e.ticksLeft, 40, 'the clock re-arms at the step');
  assert.equal(decayAtZero(page, e), 'stepped');
  assert.equal(stacksOf(e), 1);
  assert.equal(decayAtZero(page, e), 'expired', 'the last stack expires the state');
});

test('a stepDown page with no count sheds nothing extra — it just expires', () => {
  const page = countPage({ decay: { model: 'stepDown', stepTicks: 40 } });
  assert.equal(decayAtZero(page, entry({})), 'expired');
});

// ---------------------------------------------------------- the cc door

test('ccTicksFor bounds the lock at the page and reads zero without one', () => {
  assert.equal(ccTicksFor(pageOf('shock'), 40), SHOCK_MAX_TICKS, 'the stagger is brief');
  assert.equal(ccTicksFor(pageOf('shock'), 6), 6, 'a short charge locks no longer than itself');
  assert.equal(ccTicksFor(pageOf('burn'), 40), 0, 'no cc, no lock');
});

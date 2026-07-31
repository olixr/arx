import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addProc,
  describeEffect,
  isStrikeTrigger,
  mkProcRuntime,
  procWakes,
  type EnchantTrigger,
  type ProcAction,
  type ProcEffect,
} from './enchants.js';
import { emptyGearStats, foldEffect } from './roll.js';

/** A working, with everything but the interesting part defaulted. */
const proc = (over: Partial<ProcEffect> = {}): ProcEffect => ({
  kind: 'proc',
  id: 'test_working',
  name: 'Test Working',
  trigger: { on: 'crit' },
  action: { do: 'bolt', damage: 5 },
  icd: 40,
  ...over,
});

// ------------------------------------------------------------- routing

test('procs route by TRIGGER, never by slot', () => {
  // The steel that landed owns these three.
  assert.equal(isStrikeTrigger('hit'), true);
  assert.equal(isStrikeTrigger('crit'), true);
  assert.equal(isStrikeTrigger('cadence'), true);
  // The body owns the rest.
  for (const on of ['kill', 'hurt', 'block', 'cast', 'lowHp', 'gather', 'stride'] as const) {
    assert.equal(isStrikeTrigger(on), false, `${on} belongs to the body`);
  }
});

test('THE METER BELONGS TO THE FIGHTER: stacks route body-side even counting hits', () => {
  // A stacking working that counts landed blows still folds into the
  // aggregate, so a dual wielder keeps ONE meter across both edges.
  assert.equal(isStrikeTrigger('stacks'), false);
  const stats = emptyGearStats();
  foldEffect(stats, proc({ trigger: { on: 'stacks', per: 'hit', count: 6 } }));
  assert.equal(stats.procs.length, 1);
});

test('a steel-triggered working never lands in the aggregate', () => {
  const stats = emptyGearStats();
  foldEffect(stats, proc({ trigger: { on: 'hit', chance: 0.2 } }));
  foldEffect(stats, proc({ id: 'body_one', trigger: { on: 'kill' } }));
  assert.deepEqual(
    stats.procs.map((p) => p.id),
    ['body_one'],
  );
});

test('a matched set carries one working, not five', () => {
  // Five pieces bearing the same id collapse at the gathering point —
  // otherwise one moment would answer itself five times over.
  const out: ProcEffect[] = [];
  for (let i = 0; i < 5; i++) addProc(out, proc());
  assert.equal(out.length, 1);
  addProc(out, proc({ id: 'other' }));
  assert.equal(out.length, 2);
});

// -------------------------------------------------------- arbitration

test('a working rests: it cannot answer twice inside its own cooldown', () => {
  const p = proc({ icd: 40 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'crit', 100), true);
  assert.equal(procWakes(p, st, 'crit', 100), false);
  assert.equal(procWakes(p, st, 'crit', 139), false);
  assert.equal(procWakes(p, st, 'crit', 140), true);
});

test('a working hears only its own moment', () => {
  const st = mkProcRuntime();
  assert.equal(procWakes(proc({ trigger: { on: 'kill' } }), st, 'crit', 10), false);
  assert.equal(procWakes(proc({ trigger: { on: 'kill' } }), st, 'kill', 10), true);
});

test('a cadence counts landed strikes and fires on the Nth', () => {
  const p = proc({ trigger: { on: 'cadence', every: 3 }, icd: 1 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'hit', 1), false);
  assert.equal(procWakes(p, st, 'hit', 2), false);
  assert.equal(procWakes(p, st, 'hit', 3), true);
  // ...and starts over rather than firing on every strike after.
  assert.equal(procWakes(p, st, 'hit', 10), false);
});

test('COUNTERS ADVANCE WHILE THE WORKING RESTS — the charge is banked', () => {
  // A meter that silently dropped its count during the rest would read
  // to a player as the game eating their hits.
  const p = proc({ trigger: { on: 'cadence', every: 2 }, icd: 100 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'hit', 0), false);
  assert.equal(procWakes(p, st, 'hit', 0), true); // fires, now rests until 100
  // Two more strikes land during the rest. Neither fires...
  assert.equal(procWakes(p, st, 'hit', 10), false);
  assert.equal(procWakes(p, st, 'hit', 20), false);
  // ...but they were counted, so the very first strike past the rest
  // answers instead of starting the count from nothing.
  assert.equal(procWakes(p, st, 'hit', 100), true);
});

test('CHANCE IS NOT ROLLED WHILE IT RESTS — the published rate stays honest', () => {
  // Spending a roll a resting working could never have answered would
  // quietly push every proc rate below what its card promises.
  const p = proc({ trigger: { on: 'hit', chance: 0.5 }, icd: 100 });
  const st = mkProcRuntime();
  let rolls = 0;
  const roll = (): number => {
    rolls++;
    return 0; // always inside the chance
  };
  assert.equal(procWakes(p, st, 'hit', 0, roll), true);
  assert.equal(rolls, 1);
  procWakes(p, st, 'hit', 10, roll);
  procWakes(p, st, 'hit', 20, roll);
  assert.equal(rolls, 1, 'a resting working must not burn rolls');
});

test('a stacking working spends its charge and starts again', () => {
  const p = proc({ trigger: { on: 'stacks', per: 'block', count: 3 }, icd: 1 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'block', 1), false);
  assert.equal(procWakes(p, st, 'block', 2), false);
  assert.equal(st.stacks, 2, 'the meter is readable mid-build');
  assert.equal(procWakes(p, st, 'block', 3), true);
  assert.equal(st.stacks, 0);
  // Moments that are not its source never feed it.
  assert.equal(procWakes(p, st, 'hit', 20), false);
  assert.equal(st.stacks, 0);
});

test('a chance working respects its chance', () => {
  const p = proc({ trigger: { on: 'hit', chance: 0.25 }, icd: 1 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'hit', 1, () => 0.24), true);
  assert.equal(procWakes(p, st, 'hit', 2, () => 0.25), false);
  assert.equal(procWakes(p, st, 'hit', 3, () => 0.9), false);
});

// ------------------------------------------------------------ the words

test('a working reads as one honest sentence on a card', () => {
  const line = describeEffect(
    proc({
      name: 'Emberwake',
      trigger: { on: 'cadence', every: 3 },
      action: { do: 'nova', damage: 8, radius: 2.5 },
    }),
  );
  assert.equal(
    line,
    'Emberwake: on every 3rd landed strike, a burst of 8 to everything within 2.5 tiles',
  );
});

test('every trigger and every action can be spoken', () => {
  // A shape with no reading would ship a blank line on a scroll card.
  const triggers: EnchantTrigger[] = [
    { on: 'hit', chance: 0.1 },
    { on: 'crit' },
    { on: 'kill' },
    { on: 'hurt', chance: 0.2 },
    { on: 'block' },
    { on: 'cast' },
    { on: 'lowHp', pct: 0.3 },
    { on: 'cadence', every: 12 },
    { on: 'stacks', per: 'cast', count: 4 },
    { on: 'gather', chance: 0.05 },
    { on: 'stride', tiles: 40 },
  ];
  const actions: ProcAction[] = [
    { do: 'status', status: 'burn', power: 2, ticks: 60 },
    { do: 'nova', damage: 6, radius: 3 },
    { do: 'bolt', damage: 9 },
    { do: 'chain', damage: 4, jumps: 3 },
    { do: 'ward', absorb: 30, ticks: 100 },
    { do: 'heal', amount: 12 },
    { do: 'surge', stat: 'crit', pct: 15, ticks: 80 },
    { do: 'cleanse' },
    { do: 'yield', extra: 1 },
    { do: 'reveal', radius: 8, of: 'node' },
  ];
  for (const trigger of triggers) {
    for (const action of actions) {
      const line = describeEffect(proc({ trigger, action }));
      assert.match(line, /^Test Working: on .+, .+$/, `unreadable: ${trigger.on}/${action.do}`);
      // THE DASH BAN holds for every generated line too.
      assert.doesNotMatch(line, /[—–]|--/, `dash in: ${line}`);
    }
  }
});

test('the ordinal reader does not embarrass itself', () => {
  const say = (every: number): string =>
    describeEffect(proc({ trigger: { on: 'cadence', every }, action: { do: 'cleanse' } }));
  assert.match(say(1), /every 1st landed strike/);
  assert.match(say(2), /every 2nd landed strike/);
  assert.match(say(3), /every 3rd landed strike/);
  assert.match(say(4), /every 4th landed strike/);
  assert.match(say(11), /every 11th landed strike/);
  assert.match(say(12), /every 12th landed strike/);
  assert.match(say(13), /every 13th landed strike/);
  assert.match(say(21), /every 21st landed strike/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addProc,
  describeEffect,
  isStrikeTrigger,
  mkProcRuntime,
  procMismatch,
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

test('a harvest rhythm is deterministic: every Nth gather, no dice', () => {
  // The re-shaped yield workings (Good Footing, Good Seam). The count
  // is the whole law — a roll() that would always fail must never be
  // consulted, or the rhythm is secretly a chance.
  const p = proc({ trigger: { on: 'stacks', per: 'gather', count: 3 }, icd: 1 });
  const st = mkProcRuntime();
  const neverRoll = (): number => {
    throw new Error('a rhythm must not roll dice');
  };
  assert.equal(procWakes(p, st, 'gather', 1, neverRoll), false);
  assert.equal(procWakes(p, st, 'gather', 2, neverRoll), false);
  assert.equal(procWakes(p, st, 'gather', 3, neverRoll), true);
  assert.equal(procWakes(p, st, 'gather', 4, neverRoll), false);
  // ...and it folds aggregate-side like every stacks working, so the
  // meter is the gatherer's own whatever carries it.
  const stats = emptyGearStats();
  foldEffect(stats, p);
  assert.equal(stats.procs.length, 1);
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
    { on: 'stacks', per: 'gather', count: 6 },
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
      // THE DASH BAN holds for every generated line too — including
      // U+2212 MINUS SIGN, which reads as an en dash on a card.
      assert.doesNotMatch(line, /[—–−]|--/, `dash in: ${line}`);
    }
  }
});

test('a surge card speaks the server’s own units', () => {
  // armor and regen surges resolve FLAT server-side (+pct armor, +pct
  // health every 4s); speed/damage/crit are true percentages. The card
  // must say what the dial does, not what the field is named.
  const surge = (stat: 'speed' | 'armor' | 'crit' | 'damage' | 'regen'): string =>
    describeEffect(proc({ trigger: { on: 'cast' }, action: { do: 'surge', stat, pct: 12, ticks: 80 } }));
  assert.equal(surge('armor'), 'Test Working: on an ability fired, +12 armor for 4s');
  assert.equal(surge('regen'), 'Test Working: on an ability fired, +12 health every 4s for 4s');
  assert.equal(surge('speed'), 'Test Working: on an ability fired, +12% speed for 4s');
  assert.equal(surge('damage'), 'Test Working: on an ability fired, +12% damage for 4s');
  assert.equal(surge('crit'), 'Test Working: on an ability fired, +12% crit for 4s');
});

test('the cooldown line carries an ASCII hyphen, never U+2212', () => {
  // The MINUS SIGN evaded the dash ban once; this pins the exact line.
  const line = describeEffect({ kind: 'cooldown', pct: 8 });
  assert.equal(line, '-8% ability cooldowns');
  assert.ok(!line.includes('−'), 'U+2212 crept back into the cooldown line');
});

test('a gather rhythm reads as a clean card line', () => {
  // The re-shaped yield workings: deterministic counts, spoken plainly.
  const line = describeEffect(
    proc({
      name: 'Good Footing',
      trigger: { on: 'stacks', per: 'gather', count: 6 },
      action: { do: 'yield', extra: 1 },
    }),
  );
  assert.equal(line, 'Good Footing: on every 6 harvests, +1 to the basket');
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

// -------------------------------- THE WAKING HAND (callings-v2, Phase 2)

test('THE DOOR REPAIR: stride is a moment like any other, banked through rest', () => {
  const p = proc({ trigger: { on: 'stride', tiles: 10 }, action: { do: 'cleanse' }, icd: 100 });
  const st = mkProcRuntime();
  // Ground accrues by the moment's own magnitude — a fast frame that
  // covers three tiles banks three.
  assert.equal(procWakes(p, st, 'stride', 0, undefined, 4), false);
  assert.equal(st.tiles, 4);
  assert.equal(procWakes(p, st, 'stride', 1, undefined, 6), true, 'ten tiles wake it');
  assert.equal(st.tiles, 0, 'the spend clears the bank');
  // While it rests, the ground still banks — and the spend waits.
  assert.equal(procWakes(p, st, 'stride', 10, undefined, 25), false);
  assert.equal(st.tiles, 25, 'tiles bank through the rest, never dropped');
  assert.equal(procWakes(p, st, 'stride', 101, undefined, 1), true, 'first step after the rest answers');
});

test('THE DOOR REPAIR: lowHp walks the one arbitration (rest is the only gate)', () => {
  // The CROSSING itself is the door's (it reads the health component);
  // what reaches procWakes is a true fall past the line, and the one
  // rest law answers for it like any other moment.
  const p = proc({ trigger: { on: 'lowHp', pct: 0.3 }, action: { do: 'heal', amount: 10 }, icd: 200 });
  const st = mkProcRuntime();
  assert.equal(procWakes(p, st, 'lowHp', 0), true);
  assert.equal(procWakes(p, st, 'lowHp', 100), false, 'a second dive inside the rest is refused');
  assert.equal(procWakes(p, st, 'lowHp', 200), true);
});

test('THE ANSWERED ECHO listens only for its own moment', () => {
  const p = proc({
    trigger: { on: 'stateApplied', status: 'venom' },
    action: { do: 'bolt', damage: 5 },
    icd: 60,
  });
  const st = mkProcRuntime();
  // The status match is the door's; the arbitration hears the moment.
  assert.equal(procWakes(p, st, 'hit', 0), false);
  assert.equal(procWakes(p, st, 'kill', 0), false);
  assert.equal(procWakes(p, st, 'stateApplied', 0), true);
  assert.equal(procWakes(p, st, 'stateApplied', 30), false, 'the echo rests like everything else');
});

test('THE SELF-BLESSING blesses: a hostile page through boon is refused at load', () => {
  const blessed = proc({
    trigger: { on: 'kill' },
    action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
  });
  assert.equal(procMismatch(blessed), null);
  const cursed = proc({
    trigger: { on: 'kill' },
    action: { do: 'boon', status: 'venom', power: 3, ticks: 100 },
  });
  assert.match(procMismatch(cursed) ?? '', /wound/);
});

test('a harvest may bless the harvester: boon joins the gather-legal answers', () => {
  const p = proc({
    trigger: { on: 'stacks', per: 'gather', count: 8 },
    action: { do: 'boon', status: 'quicken', power: 0, ticks: 200 },
  });
  assert.equal(procMismatch(p), null);
  // The old law stands for everything else that needs a fight.
  const bolt = proc({ trigger: { on: 'gather', chance: 0.5 }, action: { do: 'bolt', damage: 5 } });
  assert.notEqual(procMismatch(bolt), null);
});

test('the echo arrives with the foe in hand: stateApplied may carry targeted actions', () => {
  const p = proc({
    trigger: { on: 'stateApplied', status: 'venom' },
    action: { do: 'status', status: 'weaken', power: 10, ticks: 60 },
  });
  assert.equal(procMismatch(p), null);
});

test('the new grammar speaks clean card lines', () => {
  assert.equal(
    describeEffect(
      proc({
        name: 'Venom Answers',
        trigger: { on: 'stateApplied', status: 'venom' },
        action: { do: 'bolt', damage: 7 },
      }),
    ),
    'Venom Answers: on laying venom on a foe, a mote into the foe for 7',
  );
  assert.equal(
    describeEffect(
      proc({
        name: 'Harvest Hymn',
        trigger: { on: 'stacks', per: 'gather', count: 8 },
        action: { do: 'boon', status: 'quicken', power: 0, ticks: 200 },
      }),
    ),
    'Harvest Hymn: on every 8 harvests, quicken on yourself for 10s',
  );
});

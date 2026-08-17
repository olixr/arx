import { type TriggerDef } from '@arx/content';
import { TICK_RATE } from '@arx/shared';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compileTriggers,
  conditionHolds,
  cooldownKey,
  gateCrossing,
  stampFire,
  sweepCrossings,
  type TriggerFacts,
  type ZoneRectResolver,
} from './triggers.js';

const zones: ZoneRectResolver = (id) =>
  id === 'amberford' ? { plane: 'surface', x: 100, y: 100, w: 50, h: 50 } : null;

function def(patch: Partial<TriggerDef>): TriggerDef {
  return {
    id: 'test',
    area: { kind: 'zone', zone: 'amberford' },
    on: 'both',
    event: 'town',
    ...patch,
  };
}

const facts = (patch?: Partial<TriggerFacts>): TriggerFacts => ({
  hours: 12,
  night: false,
  hpFrac: 1,
  sneaking: false,
  levelOf: () => 1,
  standingWith: () => 0,
  hasFlag: () => false,
  discovered: () => false,
  countItem: () => 0,
  ...patch,
});

test('containment: zone resolves live, planes hold, polygon honors its ring', () => {
  const [zone] = compileTriggers([def({})]);
  assert.ok(zone);
  assert.equal(zone.contains('surface', 125, 125, zones), true);
  assert.equal(zone.contains('surface', 99, 125, zones), false);
  assert.equal(zone.contains('rift_1', 125, 125, zones), false, 'a zone lives on its plane');
  assert.equal(zone.contains('surface', 125, 125, () => null), false, 'a vanished zone stands down');

  const [poly] = compileTriggers([
    def({
      id: 'notch',
      area: {
        kind: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 12, y: 0 },
          { x: 12, y: 10 },
          { x: 8, y: 10 },
          { x: 8, y: 4 },
          { x: 4, y: 4 },
          { x: 4, y: 10 },
          { x: 0, y: 10 },
        ],
      },
    }),
  ]);
  assert.ok(poly);
  assert.equal(poly.contains('surface', 2, 8, zones), true, 'the arm');
  assert.equal(poly.contains('surface', 6, 8, zones), false, 'the notch');
  assert.ok(poly.bounds && poly.bounds.maxX === 12, 'bbox compiled');
});

test('THE FIRST SWEEP IS A CENSUS: priming inside the walls fires nothing', () => {
  const compiled = compileTriggers([def({})]);
  const inside = new Map<string, number>();
  const primed = sweepCrossings(compiled, inside, 'surface', 125, 125, 100, zones, true);
  assert.equal(primed.length, 0, 'no edge from a census');
  assert.equal(inside.get('test'), 100, 'but the ledger holds the body');
  const out = sweepCrossings(compiled, inside, 'surface', 10, 10, 200, zones, false);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.edge, 'exit');
  assert.equal(out[0]!.sinceTick, 100, 'dwell reads from the census stamp');
});

test('edges: enter then exit, each once, honoring the def.on filter', () => {
  const compiled = compileTriggers([def({ on: 'enter' })]);
  const inside = new Map<string, number>();
  assert.equal(sweepCrossings(compiled, inside, 'surface', 0, 0, 1, zones, false).length, 0);
  const enter = sweepCrossings(compiled, inside, 'surface', 125, 125, 2, zones, false);
  assert.equal(enter.length, 1);
  assert.equal(enter[0]!.edge, 'enter');
  assert.equal(sweepCrossings(compiled, inside, 'surface', 126, 125, 3, zones, false).length, 0, 'held, not re-fired');
  const leave = sweepCrossings(compiled, inside, 'surface', 0, 0, 4, zones, false);
  assert.equal(leave.length, 0, `on:'enter' never speaks the exit`);
  assert.equal(inside.size, 0, 'the ledger still emptied');
});

test('a disabled trigger keeps its ledger honest and reports nothing', () => {
  const compiled = compileTriggers([def({ disabled: true })]);
  const inside = new Map<string, number>();
  assert.equal(sweepCrossings(compiled, inside, 'surface', 125, 125, 5, zones, false).length, 0);
  assert.equal(inside.has('test'), true, 'containment tracked while dark');
  assert.equal(sweepCrossings(compiled, inside, 'surface', 0, 0, 6, zones, false).length, 0);
  assert.equal(inside.has('test'), false);
});

test('THE BOUNCE RULE: shared cooldown group + the exit dwell', () => {
  const d = def({ cooldownSec: 180, minInsideSec: 45 });
  assert.equal(cooldownKey(d), 'test', 'the group defaults to the id');
  const cooldowns = new Map<string, number>();
  const enter = { def: d, edge: 'enter' as const, sinceTick: 1000 };
  assert.equal(gateCrossing(enter, 1000, cooldowns, facts(), false), 'fire');
  stampFire(cooldowns, d, 1000);
  // Straight back out: dwell unmet AND the group still hot.
  const bounce = { def: d, edge: 'exit' as const, sinceTick: 1000 };
  assert.equal(gateCrossing(bounce, 1000 + 5 * TICK_RATE, cooldowns, facts(), false), 'dwell');
  // A real visit later: dwell met, but inside the refractory it still holds.
  assert.equal(gateCrossing(bounce, 1000 + 60 * TICK_RATE, cooldowns, facts(), false), 'cooldown');
  // Past the refractory the sendoff speaks.
  assert.equal(gateCrossing(bounce, 1000 + 200 * TICK_RATE, cooldowns, facts(), false), 'fire');
  const grouped = def({ id: 'other_gate', cooldownGroup: 'test' });
  assert.equal(cooldownKey(grouped), 'test', 'gates of one town share a throat');
});

test('the gate ladder: once, conditions', () => {
  const d = def({ once: true, conditions: [{ when: 'night' }] });
  const enter = { def: d, edge: 'enter' as const, sinceTick: 0 };
  assert.equal(gateCrossing(enter, 10, new Map(), facts(), true), 'once');
  assert.equal(gateCrossing(enter, 10, new Map(), facts(), false), 'conditions');
  assert.equal(gateCrossing(enter, 10, new Map(), facts({ night: true }), false), 'fire');
});

test('conditions: every kind answers its precedent read', () => {
  const f = facts({
    hours: 22,
    night: true,
    hpFrac: 0.25,
    sneaking: true,
    levelOf: (s) => (s === 'archery' ? 80 : 5),
    standingWith: (fid) => (fid === 'fordgate' ? 50 : 0),
    hasFlag: (fl) => fl === 'walked_in',
    discovered: (p) => p === 'zone:amberford',
    countItem: (i) => (i === 'bread' ? 3 : 0),
  });
  assert.ok(conditionHolds({ when: 'timeBetween', from: 20, to: 6 }, f), 'wraps midnight');
  assert.ok(!conditionHolds({ when: 'timeBetween', from: 8, to: 16 }, f));
  assert.ok(conditionHolds({ when: 'hpBelow', frac: 0.3 }, f));
  assert.ok(!conditionHolds({ when: 'hpAbove', frac: 0.5 }, f));
  assert.ok(conditionHolds({ when: 'hasItem', item: 'bread', qty: 3 }, f));
  assert.ok(!conditionHolds({ when: 'hasItem', item: 'bread', qty: 4 }, f));
  assert.ok(conditionHolds({ when: 'skillAtLeast', skill: 'archery', level: 75 }, f));
  assert.ok(conditionHolds({ when: 'standingAtLeast', faction: 'fordgate', band: 'trusted' }, f));
  assert.ok(!conditionHolds({ when: 'standingAtLeast', faction: 'fordgate', band: 'champion' }, f));
  assert.ok(conditionHolds({ when: 'standingAtMost', faction: 'rookery', band: 'neutral' }, f));
  assert.ok(conditionHolds({ when: 'flag', flag: 'walked_in' }, f));
  assert.ok(conditionHolds({ when: 'notFlag', flag: 'other' }, f));
  assert.ok(conditionHolds({ when: 'discovered', place: 'zone:amberford' }, f));
  assert.ok(conditionHolds({ when: 'undiscovered', place: 'zone:silverfall' }, f));
  assert.ok(conditionHolds({ when: 'sneaking' }, f));
  assert.ok(conditionHolds({ when: 'night' }, f));
  assert.ok(!conditionHolds({ when: 'day' }, f));
});

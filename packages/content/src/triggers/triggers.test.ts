import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TRIGGERS } from './registry.js';
import type { TriggerDef } from './types.js';
import { triggerOnceFlag } from './types.js';
import { validateTrigger } from './validate.js';

const TOWNS = [
  'dawnmead',
  'amberford',
  'silverfall',
  'saltmere',
  'pinewatch',
  'hartfell',
  'evenfall',
  'kingsdelf',
];

function base(): Record<string, unknown> {
  return {
    id: 'test_trigger',
    area: { kind: 'rect', x: 0, y: 0, w: 10, h: 10 },
    on: 'enter',
    event: 'test',
  };
}

test('the authored roster stands: every watched town, both edges, the town event', () => {
  for (const town of TOWNS) {
    const def = TRIGGERS.get(`town_${town}`);
    assert.ok(def, `town_${town} is authored`);
    assert.equal(def.area.kind, 'zone');
    assert.equal((def.area as { zone: string }).zone, town);
    assert.equal(def.on, 'both');
    assert.equal(def.event, 'town');
    assert.equal(def.data?.town, town);
    assert.ok((def.cooldownSec ?? 0) >= 60, 'a minutes-scale refractory');
    assert.ok((def.minInsideSec ?? 0) > 0, 'the bounce rule holds the exit');
  }
});

test('validator: a lawful def round-trips whole', () => {
  const res = validateTrigger({
    ...base(),
    label: 'A test',
    data: { town: 'amberford' },
    conditions: [
      { when: 'timeBetween', from: 20, to: 6 },
      { when: 'skillAtLeast', skill: 'archery', level: 75 },
      { when: 'standingAtLeast', faction: 'fordgate', band: 'trusted' },
      { when: 'discovered', place: 'zone:amberford' },
    ],
    cooldownSec: 180,
    minInsideSec: 45,
    once: true,
    setFlag: 'walked_the_test',
  });
  assert.ok(res.ok, res.ok ? '' : res.errors.join('; '));
  const def: TriggerDef = res.def;
  assert.equal(def.conditions?.length, 4);
  assert.equal(def.once, true);
  assert.equal(def.setFlag, 'walked_the_test');
});

test('validator: refusals answer by name', () => {
  const bad = (patch: Record<string, unknown>, needle: string) => {
    const res = validateTrigger({ ...base(), ...patch });
    assert.equal(res.ok, false, needle);
    if (!res.ok) {
      assert.ok(
        res.errors.some((e) => e.includes(needle)),
        `${needle} named in: ${res.errors.join('; ')}`,
      );
    }
  };
  bad({ id: 'Bad-Slug' }, 'must match');
  bad({ on: 'sometimes' }, `'enter', 'exit', or 'both'`);
  bad({ event: '' }, 'must be a slug');
  bad({ area: { kind: 'circle' } }, `area.kind`);
  bad({ area: { kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } }, 'vertices');
  bad({ conditions: [{ when: 'lucky' }] }, 'unknown');
  bad({ conditions: [{ when: 'timeBetween', from: 5, to: 5 }] }, 'covers no hours');
  bad({ conditions: [{ when: 'skillAtLeast', skill: 'juggling', level: 5 }] }, 'not a skill id');
  bad({ conditions: [{ when: 'flag', flag: 'world:calm' }] }, 'plain character flag');
  bad({ setFlag: 'trig:looped' }, 'plain flag slug');
  bad({ mystery: true }, `unknown key 'mystery'`);
  bad({ area: { kind: 'rect', x: 0, y: 0, w: 10, h: 10, glow: 1 } }, `unknown key 'glow'`);
});

test('validator: reference existence is strict only at the Studio door', () => {
  const zoned = { ...base(), area: { kind: 'zone', zone: 'atlantis' } };
  assert.ok(validateTrigger(zoned).ok, 'boot is tolerant of a dangling zone');
  const strict = validateTrigger(zoned, { zoneIds: new Set(['amberford']) });
  assert.equal(strict.ok, false, 'the Studio door refuses it');
  const item = {
    ...base(),
    conditions: [{ when: 'hasItem', item: 'ghost_item' }],
  };
  assert.ok(validateTrigger(item).ok);
  assert.equal(validateTrigger(item, { itemIds: new Set(['bread']) }).ok, false);
});

test('the once-latch flag wears the trig: namespace', () => {
  assert.equal(triggerOnceFlag('town_amberford'), 'trig:town_amberford');
});

// ---- THE CONTESTED LANDS band 8: THE HUSK AND THE WARD LINE (band8/
// blockout.md §6.4). Five patches of watching ground, every event slug
// the trigger's own id, every fire a once-stamped plain flag that a
// flag objective reads. The husk's and the rest's anchors are golden,
// so the rects are honest in world tiles.
test('CONTESTED LANDS band 8: the five north triggers stand as the brief drew them', () => {
  const rect = (id: string) => {
    const def = TRIGGERS.get(id);
    assert.ok(def, `${id} is authored`);
    assert.equal(def!.event, id, `${id}: the event slug is its own id`);
    assert.equal(def!.once, true, `${id}: once per character`);
    assert.equal(def!.area.kind, 'rect');
    return def!;
  };
  // The apron held: an exit after half past eight, having stood the
  // changeover inside (75 s), sworn to the sergeant, not yet held.
  const husk = rect('husk_breach_held');
  assert.deepEqual(husk.area, { kind: 'rect', x: -76, y: -248, w: 24, h: 18 });
  assert.equal(husk.on, 'exit');
  assert.equal(husk.minInsideSec, 75);
  assert.equal(husk.setFlag, 'husk_held');
  assert.deepEqual(husk.conditions, [
    { when: 'timeBetween', from: 20.5, to: 5.5 },
    { when: 'flag', flag: 'towers_debt_sworn' },
    { when: 'notFlag', flag: 'husk_held' },
  ]);
  // The three grey stones, 5x5 on each, entered with the four lengths in
  // the pack and the thread uncut (a cut closes fork A's walk forever).
  for (const [id, cx, cy] of [
    ['grey_one', -135, -184],
    ['grey_two', -151, -184],
    ['grey_three', -150, -198],
  ] as const) {
    const g = rect(id);
    assert.deepEqual(g.area, { kind: 'rect', x: cx - 2, y: cy - 2, w: 5, h: 5 });
    assert.equal(g.on, 'enter');
    assert.equal(g.setFlag, id);
    assert.deepEqual(g.conditions, [
      { when: 'hasItem', item: 'cut_thread', qty: 4 },
      { when: 'flag', flag: 'keep_thread_sworn' },
      { when: 'notFlag', flag: 'ward_thread_cut' },
    ]);
  }
  // The head stone stood from dusk: two game hours (100 s) inside, an
  // exit between half past seven and eleven, sworn to the stone.
  const dusk = rect('stone_dusk_stood');
  assert.deepEqual(dusk.area, { kind: 'rect', x: -140, y: -188, w: 10, h: 8 });
  assert.equal(dusk.on, 'exit');
  assert.equal(dusk.minInsideSec, 100);
  assert.equal(dusk.setFlag, 'glade_stood');
  assert.deepEqual(dusk.conditions, [
    { when: 'timeBetween', from: 19.5, to: 23 },
    { when: 'flag', flag: 'stone_dusk_sworn' },
    { when: 'notFlag', flag: 'glade_stood' },
  ]);
  // The head stone's rect holds the east end of the thread and its
  // stone, and the dusk rect and grey_one overlap on purpose: the same
  // ground teaches the walk and holds the stand.
  assert.equal(TRIGGERS.size, 13, 'eight towns and the north\'s five');
});

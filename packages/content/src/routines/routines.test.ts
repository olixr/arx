import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildDawnmead } from '../maps/dawnmead.js';
import { ROUTINES } from './registry.js';
import { pickRoutineSlot, routineTaskAt, slotContains } from './schedule.js';
import { validateRoutine } from './validate.js';

const DEFS_DIR = new URL('./defs/', import.meta.url).pathname;

test('every defs/*.json file is registered and valid', () => {
  const files = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'defs directory holds routine files');
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(DEFS_DIR, file), 'utf8')) as { id?: string };
    const slug = file.replace(/\.json$/, '');
    assert.equal(raw.id, slug, `${file}: filename must equal the routine id`);
    assert.ok(ROUTINES.has(slug), `${file}: missing from the registry SOURCES roster`);
  }
  assert.equal(ROUTINES.size, files.length, 'registry holds exactly the authored files');
});

test('every placed routine reference resolves', () => {
  const zone = buildDawnmead();
  const placed = (zone.actorSpawns ?? []).filter((s) => s.routine !== undefined);
  assert.ok(placed.length >= 6, 'dawnmead keeps hours');
  for (const s of placed) {
    assert.ok(ROUTINES.has(s.routine!), `placement of '${s.actor}' names known routine '${s.routine}'`);
  }
});

test('schedule windows: plain, wrapping, and the authored-order priority', () => {
  // Plain window.
  assert.ok(slotContains(6, 19, 6));
  assert.ok(slotContains(6, 19, 18.99));
  assert.ok(!slotContains(6, 19, 19));
  assert.ok(!slotContains(6, 19, 3));
  // A night watch wraps midnight.
  assert.ok(slotContains(21, 5.5, 23));
  assert.ok(slotContains(21, 5.5, 0));
  assert.ok(slotContains(21, 5.5, 5.4));
  assert.ok(!slotContains(21, 5.5, 12));

  // The hearthmother: authored slot order wins, the night walk wraps
  // midnight, and unclaimed hours fall to the base cookpot post.
  const berrit = ROUTINES.get('berrit_hours')!;
  assert.equal(pickRoutineSlot(berrit, 12), 0, 'the table round owns 12:00');
  assert.equal(pickRoutineSlot(berrit, 18), 1, 'the supper fire owns 18:00');
  assert.equal(pickRoutineSlot(berrit, 23), 2, 'the night walk owns 23:00');
  assert.equal(pickRoutineSlot(berrit, 3), 2, 'the night walk wraps past midnight');
  assert.equal(pickRoutineSlot(berrit, 8), -1, 'breakfast hours fall to base');
  assert.equal(routineTaskAt(berrit, 8).kind, 'post');
  assert.equal(routineTaskAt(berrit, 22).kind, 'path');
});

test('validator rejects the dishonest defs', () => {
  const bad = (raw: unknown, needle: string) => {
    const res = validateRoutine(raw);
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    assert.ok(
      res.errors.some((e) => e.includes(needle)),
      `errors mention ${needle}: ${res.errors.join(' | ')}`,
    );
  };
  const base = { id: 'test_ok', base: { kind: 'post' } };
  bad({ ...base, id: 'Bad Slug!' }, 'must match');
  bad({ id: 'test_ok' }, 'base must be an object');
  bad({ ...base, base: { kind: 'loiter' } }, "must be 'post', 'path', or 'wander'");
  bad({ ...base, base: { kind: 'path', waypoints: [] } }, '1..32 waypoints');
  bad({ ...base, base: { kind: 'path', waypoints: [{ x: 1 }] } }, 'y is required');
  bad({ ...base, base: { kind: 'path', waypoints: [{ x: 1, y: 500 }] } }, 'within ±128');
  bad(
    { ...base, base: { kind: 'path', mode: 'shuffle', waypoints: [{ x: 1, y: 1 }] } },
    "'loop', 'bounce', or 'once'",
  );
  bad({ ...base, base: { kind: 'wander' } }, 'radius');
  bad({ ...base, base: { kind: 'wander', radius: 90 } }, '0.5..32');
  bad({ ...base, slots: [{ from: 25, to: 3, task: { kind: 'post' } }] }, '[0, 24)');
  bad({ ...base, slots: [{ from: 6, to: 6, task: { kind: 'post' } }] }, 'covers no hours');
  bad(
    { ...base, base: { kind: 'path', waypoints: [{ x: 0, y: 0, waitSec: 2000 }] } },
    '0..900',
  );
  bad({ ...base, base: { kind: 'post', dir: 9 } }, 'radians');
  bad({ ...base, base: { kind: 'post', work: 'yes' } }, 'boolean');
  bad({ ...base, base: { kind: 'post', sit: 'yes' } }, 'boolean');
  // 'fish' is the one non-boolean work verb (THE PATIENT LINE): it
  // validates, stores as itself, and stays posture-exclusive.
  {
    const res = validateRoutine({ ...base, base: { kind: 'post', work: 'fish' } });
    assert.ok(res.ok, `work:'fish' validates: ${res.ok ? '' : res.errors.join(' | ')}`);
    assert.equal(
      (res.routine.base as { work?: boolean | 'fish' }).work,
      'fish',
      "work:'fish' stores as itself",
    );
  }
  bad({ ...base, base: { kind: 'post', work: 'fish', sit: true } }, 'cannot both work and sit');
  bad({ ...base, base: { kind: 'post', sit: 'fish' } }, 'boolean');
  bad({ ...base, base: { kind: 'post', work: true, sit: true } }, 'cannot both work and sit');
  bad(
    { ...base, base: { kind: 'path', waypoints: [{ x: 1, y: 1, work: true, sit: true }] } },
    'cannot both work and sit',
  );
  bad({ ...base, base: { kind: 'post', speed: 0.1 } }, '0.3..6');
  bad({ ...base, base: { kind: 'wander', radius: 3, speed: 12 } }, '0.3..6');
  bad(
    { ...base, base: { kind: 'path', waypoints: [{ x: 1, y: 1, speed: 'fast' }] } },
    '0.3..6',
  );
});

test('speed layers survive validation at every level', () => {
  const res = validateRoutine({
    id: 'test_pace',
    base: { kind: 'path', speed: 1.2, waypoints: [{ x: 1, y: 0 }, { x: 2, y: 0, speed: 3.5 }] },
    slots: [
      { from: 20, to: 6, task: { kind: 'post', speed: 2.4 } },
      { from: 8, to: 12, task: { kind: 'wander', radius: 4, speed: 1.1 } },
    ],
  });
  assert.ok(res.ok);
  const path = res.routine.base;
  assert.ok(path.kind === 'path');
  assert.equal(path.speed, 1.2, 'task-level stride');
  assert.equal(path.waypoints[0]!.speed, undefined, 'unset leg falls to the task');
  assert.equal(path.waypoints[1]!.speed, 3.5, 'per-leg override');
  const night = res.routine.slots![0]!.task;
  assert.ok(night.kind === 'post');
  assert.equal(night.speed, 2.4);
});

test('validator normalizes defaults away (interchange stays minimal)', () => {
  const res = validateRoutine({
    id: 'test_min',
    base: {
      kind: 'path',
      mode: 'loop',
      waypoints: [{ x: 1, y: 0, waitSec: 0, work: false, sit: false }],
    },
  });
  assert.ok(res.ok);
  const path = res.routine.base;
  assert.ok(path.kind === 'path');
  assert.equal(path.mode, undefined, "mode 'loop' is the default and stores as absent");
  assert.equal(path.waypoints[0]!.waitSec, undefined, 'waitSec 0 stores as absent');
  assert.equal(path.waypoints[0]!.work, undefined, 'work false stores as absent');
  assert.equal(path.waypoints[0]!.sit, undefined, 'sit false stores as absent');
});

test('a seated stop survives validation at post and waypoint level', () => {
  const res = validateRoutine({
    id: 'test_rest',
    base: { kind: 'post', sit: true, dir: 1.5 },
    slots: [
      {
        from: 12,
        to: 13,
        task: { kind: 'path', waypoints: [{ x: 2, y: 0, waitSec: 20, sit: true }] },
      },
    ],
  });
  assert.ok(res.ok);
  assert.ok(res.routine.base.kind === 'post' && res.routine.base.sit === true);
  const path = res.routine.slots![0]!.task;
  assert.ok(path.kind === 'path');
  assert.equal(path.waypoints[0]!.sit, true);
});

test('THE SADDLE IN THE SCHEDULE: mounted tasks validate, layered like speed', () => {
  const res = validateRoutine({
    id: 'test_rider',
    base: {
      kind: 'path',
      mount: 'courser_bay',
      speed: 2.9,
      waypoints: [
        { x: 2, y: 0, ride: false },
        { x: 12, y: 0 },
        { x: 12, y: 8, waitSec: 10 },
      ],
    },
    slots: [{ from: 21, to: 6, task: { kind: 'post', mount: 'garron_hoargate' } }],
  });
  assert.ok(res.ok);
  const path = res.routine.base;
  assert.ok(path.kind === 'path');
  assert.equal(path.mount, 'courser_bay', 'the task names the beast');
  assert.equal(path.waypoints[0]!.ride, false, 'a leg walked on foot stores its override');
  assert.equal(path.waypoints[1]!.ride, undefined, 'a ridden leg stores as absent');
  const night = res.routine.slots![0]!.task;
  assert.ok(night.kind === 'post');
  assert.equal(night.mount, 'garron_hoargate', 'a posted rider is a valid statement');
});

test('the saddle validator rejects the dishonest riders', () => {
  const unknown = validateRoutine({
    id: 'test_ghost_horse',
    base: { kind: 'post', mount: 'ghost_horse' },
  });
  assert.ok(!unknown.ok && unknown.errors.some((e) => e.includes('not a registered mount')));
  const rideless = validateRoutine({
    id: 'test_rideless',
    base: { kind: 'path', waypoints: [{ x: 1, y: 0, ride: false }] },
  });
  assert.ok(
    !rideless.ok && rideless.errors.some((e) => e.includes('meaningless without a task mount')),
    'ride overrides demand a mounted task',
  );
});

test('THE HAVEN\'S CAST (band 7): the east keeps its hours and the lamp-boy keeps one body', () => {
  // The five lives the fen lamp and the bar brought, and the one struck.
  for (const id of ['hale_lamp', 'halvor_gate', 'ingram_dike', 'crofter_boards', 'crofter_stilts', 'drover_held']) {
    assert.ok(ROUTINES.has(id), `${id} missing from the registry`);
  }
  assert.ok(!ROUTINES.has('leif_walk'), 'ONE LEIF (R6/E4): leif_walk retired; his walk is the road\'s');
  assert.ok(ROUTINES.has('leif_gate'), 'Dawnmead\'s Leif keeps his gate');
  // The clock: Hale trims at dawn and dusk and sleeps on the bench from
  // half past nine; Halvor walks to the gate at dawn, sits at noon
  // while Hale wanders, and is abed by nine; Ingram is on the line all
  // morning and under canvas by nine; the drover sits all day and
  // night but for his half hour let out.
  const hale = ROUTINES.get('hale_lamp')!;
  assert.equal(routineTaskAt(hale, 5.75).kind, 'path', 'the dawn trim');
  assert.equal(routineTaskAt(hale, 19.75).kind, 'path', 'the dusk trim');
  const bench = routineTaskAt(hale, 23);
  assert.ok(bench.kind === 'post' && bench.sit === true, 'Hale sleeps at his post in his boots');
  assert.equal(routineTaskAt(hale, 3).kind, 'post', 'the night sit wraps midnight');
  assert.equal(routineTaskAt(hale, 12.5).kind, 'wander');
  const halvor = ROUTINES.get('halvor_gate')!;
  assert.equal(routineTaskAt(halvor, 6).kind, 'path', 'thirty years of walking to it every morning');
  const noon = routineTaskAt(halvor, 12.25);
  assert.ok(noon.kind === 'post' && noon.sit === true, 'the bench at noon');
  const abed = routineTaskAt(halvor, 22);
  assert.ok(abed.kind === 'post' && abed.lie === true);
  // Fix pass 1 (the seating audit): the base is a POST facing west,
  // the gate across the water, not a wander — a wander around a cell
  // diagonal to the fire walked him onto the fire's own column at
  // noon (the proof's weir shot), and Halvor at his fire facing the
  // gate is the sentence.
  const base = routineTaskAt(halvor, 9);
  assert.ok(base.kind === 'post' && base.dir !== undefined && Math.abs(base.dir - Math.PI) < 1e-3, 'the base post, facing the gate');
  const ingram = ROUTINES.get('ingram_dike')!;
  const line = routineTaskAt(ingram, 8);
  assert.ok(line.kind === 'path' && line.mode === 'once' && line.waypoints.length === 4, 'the counter, the line\'s end, its middle, and home');
  const cot = routineTaskAt(ingram, 23);
  assert.ok(cot.kind === 'post' && cot.lie === true, 'the bed under the canvas');
  const drover = ROUTINES.get('drover_held')!;
  const sat = routineTaskAt(drover, 15);
  assert.ok(sat.kind === 'post' && sat.sit === true, 'a wayside sit all day');
  assert.equal(routineTaskAt(drover, 6.25).kind, 'wander', 'let out to walk, nowhere to walk to');
  // The two crofters keep the boards by day and the east cabin by night.
  for (const id of ['crofter_boards', 'crofter_stilts']) {
    const c = ROUTINES.get(id)!;
    assert.equal(routineTaskAt(c, 7).kind, 'path', `${id}: the boards at seven`);
    assert.equal(routineTaskAt(c, 12.25).kind, 'wander', `${id}: the noon drift`);
    const night = routineTaskAt(c, 23);
    assert.ok(night.kind === 'post' && (night.lie === true || night.sit === true), `${id}: indoors by night`);
  }
});

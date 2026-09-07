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

test('THE HUSK AND THE WARD LINE (band 8 THE CAST): the north keeps its hours', () => {
  // The three lives the fork and the cut brought (blockout §4).
  for (const id of ['torsten_fork', 'bodil_cut', 'feller_cut']) {
    assert.ok(ROUTINES.has(id), `${id} missing from the registry`);
  }
  // TORSTEN: down the trail's bed to his slate before six and back, a
  // noon wander in the mouth, and the lamp-post stand every other hour.
  // A game hour is fifty seconds: sixty tiles at 1.4 is forty-three
  // seconds, so the walk leaves at half past five and the chalk is on
  // the slate by about twenty past six; the brief's 06:00 out with a
  // ninety-second chalk cannot be back by half past seven, and the
  // slot holds the whole round trip so the base post never pulls him
  // home across the dark third's wood.
  const torsten = ROUTINES.get('torsten_fork')!;
  const walk = routineTaskAt(torsten, 6);
  assert.ok(walk.kind === 'path' && walk.mode === 'once', 'the morning walk holds at its last stop');
  assert.equal(walk.kind === 'path' ? walk.speed : 0, 1.4, 'a sergeant on the trail');
  const stops = walk.kind === 'path' ? walk.waypoints : [];
  assert.equal(stops.length, 9, 'four stops out, the slate, three back, and home');
  const slate = stops[4]!;
  assert.ok(slate.work === true && slate.dir === 0 && (slate.waitSec ?? 0) >= 60, 'chalking, facing the slate east of his stand');
  assert.deepEqual([stops[8]!.x, stops[8]!.y], [0, 0], 'and home');
  assert.ok(stops.every((wp) => !wp.sit && !wp.lie), 'a sergeant does not sit on his watch');
  assert.equal(torsten.slots![0]!.from, 5.5);
  assert.equal(routineTaskAt(torsten, 12.25).kind, 'wander', 'the noon wander in the mouth');
  const stand = routineTaskAt(torsten, 21);
  assert.ok(stand.kind === 'post' && stand.x === undefined && stand.sit === undefined && stand.lie === undefined, 'stands the way a lamp post stands');
  assert.equal(routineTaskAt(torsten, 3).kind, 'post');
  // Out-leg, wait and return fit the clock: the walk is at the slate
  // before the 06:30 shot and home before the slot closes even with
  // the human wobble (+20 %) on the chalk.
  const leg = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
  let out = leg({ x: 0, y: 0 }, stops[0]!);
  for (let i = 1; i <= 4; i++) out += leg(stops[i - 1]!, stops[i]!);
  let back = 0;
  for (let i = 5; i < stops.length; i++) back += leg(stops[i - 1]!, stops[i]!);
  const speed = walk.kind === 'path' ? walk.speed! : 1;
  assert.ok(out / speed <= (6.5 - torsten.slots![0]!.from) * 50, `at the slate before 06:30 (${(out / speed).toFixed(0)} s)`);
  assert.ok((out + back) / speed + (slate.waitSec ?? 0) * 1.2 <= (torsten.slots![0]!.to - torsten.slots![0]!.from) * 50, 'the round trip fits its slot');

  // BODIL: the sawhorse from six to six, the ground by the fire at
  // noon (a wayside sit, no bench at a felling camp), the rope at half
  // past five, the bed under the canvas from half past eight.
  const bodil = ROUTINES.get('bodil_cut')!;
  const saw = routineTaskAt(bodil, 9);
  assert.ok(saw.kind === 'post' && saw.work === true && saw.x === undefined, 'her post from six to six, working the sawhorse');
  const noon = routineTaskAt(bodil, 12.25);
  assert.ok(noon.kind === 'post' && noon.sit === true && noon.x === -1 && noon.y === -2, 'on the ground beside the fire, facing it');
  assert.ok(noon.kind === 'post' && noon.dir !== undefined && Math.abs(noon.dir - Math.PI) < 1e-3);
  const rope = routineTaskAt(bodil, 17.75);
  assert.ok(rope.kind === 'path' && rope.mode === 'once' && rope.waypoints.length === 2, 'to the rope and home');
  assert.ok(rope.kind === 'path' && rope.waypoints[0]!.x === -2 && rope.waypoints[0]!.y === 3 && (rope.waypoints[0]!.waitSec ?? 0) >= 60, 'counts the snags from the road side');
  assert.equal(routineTaskAt(bodil, 19.5).kind, 'post', 'standing at the sawhorse until bed');
  const bed = routineTaskAt(bodil, 23);
  assert.ok(bed.kind === 'post' && bed.lie === true && bed.x === -6 && bed.y === -3, 'SLEEPER STAYS IN BED: the bed under the lean-to');
  assert.equal(routineTaskAt(bodil, 3).kind, 'post', 'the night wraps midnight');
  assert.ok(routineTaskAt(bodil, 3).kind === 'post' && (routineTaskAt(bodil, 3) as { lie?: boolean }).lie === true);

  // THE FELLERS: two routines, two posts (THE POST IS THE ORIGIN: the
  // two beds lie at different offsets from the two stands, so each
  // post has its own id; band 8 fix pass): the face from six, the
  // fire after Bodil, and from half past eight a LIE on a Bed at the
  // camp — the face feller's at (-4,-2), the trunk feller's at
  // (-4,2). The Bedrolls that stood as declared wayside lies are
  // gone: a Bedroll is no bed in tiles.ts and the audit found both
  // men sitting on the ground beside theirs (0.2 K's own fallback).
  for (const [id, bed] of [['feller_cut', { x: -4, y: -2 }], ['feller_trunk_cut', { x: -4, y: 2 }]] as const) {
    const feller = ROUTINES.get(id)!;
    assert.ok(feller, `${id} missing`);
    const face = routineTaskAt(feller, 9);
    assert.ok(face.kind === 'post' && face.work === true && face.x === undefined, `${id}: the face from six`);
    const fire = routineTaskAt(feller, 12.75);
    assert.ok(fire.kind === 'wander' && fire.radius >= 2, `${id}: the fire after Bodil`);
    assert.equal(routineTaskAt(feller, 12.25).kind, 'post', 'not before her');
    const night = routineTaskAt(feller, 22);
    assert.ok(night.kind === 'post' && night.lie === true && night.x === bed.x && night.y === bed.y, `${id}: SLEEPER STAYS IN BED, the frame at the camp`);
    assert.equal(routineTaskAt(feller, 4).kind, 'post');
    assert.ok((routineTaskAt(feller, 4) as { lie?: boolean }).lie === true, `${id}: wraps midnight`);
  }
});

test('THE SINTER\'S WALK (band 9d): dolmen_wet is the one loop in the Sett, at 1.0 on every leg', () => {
  // R-F: one loop, the slowest Dolmen walk. The post is Drusa's Dirt cell
  // at the water's edge; (-4,+3) is the water south of the ninth course.
  const wet = ROUTINES.get('dolmen_wet')!;
  assert.equal(wet.base.kind, 'post');
  assert.equal(wet.base.speed, 1.0);
  const dawn = routineTaskAt(wet, 6);
  assert.ok(dawn.kind === 'path' && dawn.mode === 'once' && dawn.waypoints.length === 2, 'into the wet, held, and home');
  assert.equal(dawn.kind === 'path' ? dawn.waypoints[0]!.waitSec : NaN, 240);
  const dusk = routineTaskAt(wet, 18);
  assert.deepEqual(dusk, dawn, 'the same walk at dusk');
  assert.equal(routineTaskAt(wet, 12).kind, 'post');
  assert.equal(routineTaskAt(wet, 7).kind, 'post', 'the slot closes at seven');
});

test('THE COURSE AND THE COUNT (band 9e THE CAST): Sarsen sets the cairn at dawn, Garrow sleeps on his wain', () => {
  // SARSEN (brief §4): the post at 1.2 (the Marl's stride, dolmen_set's);
  // 05:30-06:30 a walk once to the cairn's south cell (-2,0), 120 s
  // facing north over it (he sets the one wrong stone right), and home;
  // 15-16 the same mid-afternoon wander the setters keep, r2 on the strip.
  const sarsen = ROUTINES.get('sarsen_cairn')!;
  assert.ok(sarsen, 'sarsen_cairn missing from the registry');
  assert.equal(sarsen.base.kind, 'post');
  assert.equal(sarsen.base.speed, 1.2);
  assert.equal(sarsen.base.dir, undefined, 'the row\'s own facing (N, the cairn) is kept');
  const dawn = routineTaskAt(sarsen, 6);
  assert.ok(dawn.kind === 'path' && dawn.mode === 'once' && dawn.waypoints.length === 2, 'to the cairn, held, and home');
  if (dawn.kind !== 'path') return;
  const stop = dawn.waypoints[0]!;
  assert.deepEqual([stop.x, stop.y, stop.waitSec], [-2, 0, 120]);
  assert.ok(Math.abs((stop.dir ?? 0) + Math.PI / 2) < 1e-9, 'facing north over the cairn');
  assert.ok(!stop.sit && !stop.lie && !stop.work, 'a plain stand at the cairn (no station to work)');
  assert.deepEqual([dawn.waypoints[1]!.x, dawn.waypoints[1]!.y], [0, 0], 'and home');
  assert.deepEqual(sarsen.slots!.map((s) => [s.from, s.to]), [[5.5, 6.5], [15, 16]]);
  const afternoon = routineTaskAt(sarsen, 15.5);
  assert.ok(afternoon.kind === 'wander' && afternoon.radius === 2, 'the setters\' wander on the strip');
  assert.equal(routineTaskAt(sarsen, 12).kind, 'post');
  assert.equal(routineTaskAt(sarsen, 0).kind, 'post');
  const speeds: number[] = [sarsen.base.speed!];
  for (const s of sarsen.slots!) {
    if (s.task.kind === 'path') { speeds.push(s.task.speed!); for (const w of s.task.waypoints) speeds.push(w.speed!); }
    if (s.task.kind === 'wander') speeds.push(s.task.speed!);
  }
  assert.ok(speeds.every((v) => v === 1.2), `every leg 1.2: ${speeds.join(',')}`);

  // GARROW (brief §4): a carter's stride 1.4; 05:00-05:30 a wander r1 in
  // the yard; 21:30-05:00 the wayside sit one row south (a carter sleeps
  // on his wain), wrapping midnight; every other hour the post over the
  // spoil bank with the row's own facing (W).
  const garrow = ROUTINES.get('garrow_yard')!;
  assert.ok(garrow, 'garrow_yard missing from the registry');
  assert.equal(garrow.base.kind, 'post');
  assert.equal(garrow.base.speed, 1.4);
  assert.equal(garrow.base.dir, undefined);
  assert.equal(garrow.base.sit, undefined, 'standing over the forty by day');
  const early = routineTaskAt(garrow, 5.25);
  assert.ok(early.kind === 'wander' && early.radius === 1, 'the yard walked at five');
  const night = routineTaskAt(garrow, 23);
  assert.ok(night.kind === 'post' && night.sit === true && night.x === 0 && night.y === 1, 'the wayside sit on the wain');
  assert.ok(night.kind === 'post' && night.lie === undefined && night.work === undefined);
  assert.deepEqual(routineTaskAt(garrow, 2), night, 'wraps midnight');
  const day = routineTaskAt(garrow, 12);
  assert.ok(day.kind === 'post' && day.sit === undefined && day.x === undefined, 'over the spoil bank by day');
  assert.equal(routineTaskAt(garrow, 5.75).kind, 'post', 'the wander closes at half past five');
  assert.deepEqual(garrow.slots!.map((s) => [s.from, s.to]), [[5, 5.5], [21.5, 5]]);
  // Neither is a Dolmen routine by id (the ONE LOOP pin in dolmen.test reads the dolmen_ prefix).
  assert.ok(!('sarsen_cairn'.startsWith('dolmen') || 'garrow_yard'.startsWith('dolmen')));
});

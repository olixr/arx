import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGE_CONTACT_DIST, TICK_DT, TRAVEL_SPEEDS, transitTicks, type AbilityDef } from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE TRAVELED ROAD's server laws, pinned (docs/transport-arts-plan.md):
 * a road takes REAL ticks at the kind's speed (never the old
 * one-tick snap), the promised wake carries the road's clock, a wall
 * ends the road where the body stands, and a locked charge re-derives
 * its heading toward the mark's LIVE body and ends at striking
 * distance. Same slate discipline as kitEngine.test.ts: private
 * methods over a hand-built slate — no db, no sockets.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  beginTransit: Fn;
  tickTransits: Fn;
  finishTransit: Fn;
};

const ab = (over: Partial<AbilityDef> = {}): AbilityDef => ({
  id: 'test_road',
  name: 'Test Road',
  desc: '',
  color: '#fff',
  code: 'TR',
  cooldownTicks: 100,
  shape: 'dash_strike',
  damage: 0,
  dashTiles: 6,
  ...over,
});

interface Body {
  plane: string;
  x: number;
  y: number;
  dir: number;
}

function mkSelf(world: { isSolid: (tx: number, ty: number) => boolean }, bodies: Map<number, Body>) {
  const fx: Array<Record<string, unknown>> = [];
  const self = {
    transits: new Map(),
    positions: {
      get: (eid: number) => bodies.get(eid),
      must: (eid: number) => bodies.get(eid)!,
    },
    healths: new Map<number, { hp: number; maxHp: number }>(),
    npcs: new Map<number, { def: { radius: number } }>(),
    worldOf: () => world,
    broadcastFx: (_plane: unknown, f: Record<string, unknown>) => fx.push(f),
    updateChunkMembership: () => {},
    beginTransit: proto.beginTransit,
    tickTransits: proto.tickTransits,
    finishTransit: proto.finishTransit,
    tickCount: 100,
  };
  return { self, fx };
}

const OPEN = { isSolid: () => false };

test('THE TRAVELED ROAD: a dash crosses over real ticks at the speed table, never in one', () => {
  const bodies = new Map<number, Body>([[1, { plane: 'surface', x: 10, y: 10, dir: 0 }]]);
  const { self, fx } = mkSelf(OPEN, bodies);
  let finished = 0;
  (proto.beginTransit as Fn).call(self, 1, ab(), 'dash', 1, 0, 6, 0, { onFinish: () => finished++ });
  // The wake is promised with the road's own clock, at the true end.
  assert.equal(fx.length, 1);
  assert.equal(fx[0]!.kind, 'dash');
  assert.equal(fx[0]!.ticks, transitTicks(6, 'dash'));
  assert.ok(Math.abs((fx[0]!.x2 as number) - 16) < 0.05, `promised end ~16, got ${fx[0]!.x2}`);

  const body = bodies.get(1)!;
  (proto.tickTransits as Fn).call(self);
  const oneTick = TRAVEL_SPEEDS.dash * TICK_DT;
  assert.ok(Math.abs(body.x - (10 + oneTick)) < 1e-6, `one tick = one step (${body.x})`);
  assert.equal(finished, 0, 'the road is not done in a tick');

  for (let i = 0; i < 20; i++) (proto.tickTransits as Fn).call(self);
  assert.ok(Math.abs(body.x - 16) < 1e-6, `the road ends at its length (${body.x})`);
  assert.equal(finished, 1, 'the arrival pays exactly once');
  assert.equal((self.transits as Map<number, unknown>).size, 0, 'the ledger is clean');
});

test('THE TRAVELED ROAD: the charge is slower than the blur-step — the run is SEEN', () => {
  assert.ok(TRAVEL_SPEEDS.charge < TRAVEL_SPEEDS.dash);
  assert.ok(
    transitTicks(10, 'charge') >= 15,
    'a ten-tile charge runs at least three-quarters of a second',
  );
});

test('THE TRAVELED ROAD: a wall ends the road where the body stands', () => {
  const wall = { isSolid: (tx: number) => tx >= 12 };
  const bodies = new Map<number, Body>([[1, { plane: 'surface', x: 10.5, y: 0.5, dir: 0 }]]);
  const { self, fx } = mkSelf(wall, bodies);
  let finished = 0;
  (proto.beginTransit as Fn).call(self, 1, ab(), 'dash', 1, 0, 6, 0, { onFinish: () => finished++ });
  // The dry-run already promised an honest wake — short of the wall.
  assert.ok((fx[0]!.x2 as number) < 12, `the wake never draws past stone (${fx[0]!.x2})`);
  for (let i = 0; i < 30; i++) (proto.tickTransits as Fn).call(self);
  const body = bodies.get(1)!;
  assert.ok(body.x < 12, `stopped before the wall (${body.x})`);
  assert.equal(finished, 1, 'a blocked road still pays its arrival');
  assert.equal((self.transits as Map<number, unknown>).size, 0);
});

test('THE CHOSEN GROUND: a locked charge chases the live mark and ends at contact', () => {
  const bodies = new Map<number, Body>([
    [1, { plane: 'surface', x: 10, y: 10, dir: 0 }],
    [2, { plane: 'surface', x: 16, y: 10, dir: 0 }],
  ]);
  const { self } = mkSelf(OPEN, bodies);
  self.npcs.set(2, { def: { radius: 0.4 } });
  self.healths.set(2, { hp: 10, maxHp: 10 });
  let finished = 0;
  (proto.beginTransit as Fn).call(self, 1, ab({ travel: 'charge', dashTiles: 12 }), 'charge', 1, 0, 12, 0, {
    targetEid: 2,
    onFinish: () => finished++,
  });
  const caster = bodies.get(1)!;
  (proto.tickTransits as Fn).call(self);
  assert.ok(caster.x > 10, 'the charge runs');
  // The mark breaks sideways — the road re-derives toward the LIVE body.
  const mark = bodies.get(2)!;
  mark.y = 13;
  (proto.tickTransits as Fn).call(self);
  assert.ok(caster.y > 10, `the heading follows the mark (y=${caster.y.toFixed(2)})`);
  for (let i = 0; i < 40 && finished === 0; i++) (proto.tickTransits as Fn).call(self);
  assert.equal(finished, 1, 'contact ends the road');
  const gap = Math.hypot(mark.x - caster.x, mark.y - caster.y) - 0.4;
  assert.ok(gap <= CHARGE_CONTACT_DIST + 0.05, `ends at striking distance (${gap.toFixed(2)})`);
});

test('THE CHOSEN GROUND: a dead mark unlocks the road — momentum carries on', () => {
  const bodies = new Map<number, Body>([
    [1, { plane: 'surface', x: 10, y: 10, dir: 0 }],
    [2, { plane: 'surface', x: 16, y: 10, dir: 0 }],
  ]);
  const { self } = mkSelf(OPEN, bodies);
  self.npcs.set(2, { def: { radius: 0.4 } });
  self.healths.set(2, { hp: 10, maxHp: 10 });
  let finished = 0;
  (proto.beginTransit as Fn).call(self, 1, ab({ travel: 'charge', dashTiles: 6 }), 'charge', 1, 0, 6, 0, {
    targetEid: 2,
    onFinish: () => finished++,
  });
  (proto.tickTransits as Fn).call(self);
  self.healths.set(2, { hp: 0, maxHp: 10 }); // the mark falls mid-road
  for (let i = 0; i < 30; i++) (proto.tickTransits as Fn).call(self);
  const caster = bodies.get(1)!;
  assert.equal(finished, 1);
  assert.ok(Math.abs(caster.x - 16) < 1e-6, `the road ran its full length (${caster.x})`);
});

test('THE TRAVELED ROAD: a body that left the world abandons the crossing', () => {
  const bodies = new Map<number, Body>([[1, { plane: 'surface', x: 10, y: 10, dir: 0 }]]);
  const { self } = mkSelf(OPEN, bodies);
  let finished = 0;
  (proto.beginTransit as Fn).call(self, 1, ab(), 'dash', 1, 0, 6, 0, { onFinish: () => finished++ });
  bodies.delete(1); // despawned mid-road
  (proto.tickTransits as Fn).call(self);
  assert.equal((self.transits as Map<number, unknown>).size, 0, 'the ledger forgets the ghost');
  assert.equal(finished, 0, 'no arrival pays for a body that never arrived');
});

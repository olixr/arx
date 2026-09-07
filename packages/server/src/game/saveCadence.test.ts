import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EcsWorld } from '@arx/shared';
import { GameServer } from './gameServer.js';
import { Db } from '../db/db.js';
import * as metrics from '../metrics.js';

/**
 * THE SAVE REMEMBERS WHAT IT WROTE (Band B, lane 3): the cadence save
 * is a trickle, not a burst — body `eid` saves on tick `eid mod 600`,
 * every player exactly once per interval — and writes only the tables
 * whose mirror changed since the last issued write. A failed write
 * re-arms its table for the next cadence and counts in
 * `db.writeFailures`. Logout/shutdown saves stay whole.
 *
 * Hand-built slates over GameServer.prototype (the doors convention).
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;
const call = (name: string, self: unknown, ...args: unknown[]): unknown =>
  (proto[name] as (...a: unknown[]) => unknown).call(self, ...args);

const SAVE_INTERVAL_TICKS = 600;

interface Writes {
  char: number[];
  skills: number[];
  inv: number[];
  equip: number[];
}

function slate(n: number, opts: { failInvOnce?: Set<number> } = {}) {
  const ecs = new EcsWorld();
  const writes: Writes = { char: [], skills: [], inv: [], equip: [] };
  const failInv = opts.failInvOnce ?? new Set<number>();
  const accounts = {
    saveCharacter: (cid: number) => {
      writes.char.push(cid);
      return Promise.resolve(true);
    },
    saveSkills: (cid: number) => {
      writes.skills.push(cid);
      return Promise.resolve(true);
    },
    saveInventory: (cid: number) => {
      writes.inv.push(cid);
      if (failInv.delete(cid)) return Promise.resolve(false);
      return Promise.resolve(true);
    },
    saveEquipment: (cid: number) => {
      writes.equip.push(cid);
      return Promise.resolve(true);
    },
  };
  const s = {
    ecs,
    positions: ecs.register<{ plane: string; x: number; y: number }>(),
    healths: ecs.register<{ hp: number }>(),
    players: ecs.register<Record<string, unknown>>(),
    accounts,
    tickCount: 0,
    saveLedgers: new WeakMap(),
    savePlayer: proto.savePlayer,
    saveDue: proto.saveDue,
    saveAll: proto.saveAll,
    saveLedgerOf: proto.saveLedgerOf,
    markSaveDirty: proto.markSaveDirty,
    flushLessons: proto.flushLessons,
    writes,
  };
  const eids: number[] = [];
  for (let i = 0; i < n; i++) {
    const eid = ecs.create();
    eids.push(eid);
    s.positions.set(eid, { plane: 'surface', x: 10 + i, y: 10, });
    s.healths.set(eid, { hp: 10 });
    s.players.set(eid, {
      characterId: 100 + i,
      skills: { vitality: 100 },
      inventory: new Array(28).fill(null),
      equipment: {},
      lessonDirty: new Set(),
      bank: null,
      bankDirty: false,
      keyRing: [],
      keyRingDirty: false,
      exploredDirty: new Set(),
      pets: [],
      petXpDirty: false,
    });
  }
  return { s, eids, writes };
}

/** Run one whole interval of ticks; returns the tick each character's row was written on. */
function runInterval(s: { tickCount: number; writes: Writes }, saveDue: () => void): Map<number, number[]> {
  const at = new Map<number, number[]>();
  for (let t = 0; t < SAVE_INTERVAL_TICKS; t++) {
    s.tickCount++;
    const before = s.writes.char.length;
    saveDue();
    for (const cid of s.writes.char.slice(before)) {
      const list = at.get(cid) ?? [];
      list.push(s.tickCount);
      at.set(cid, list);
    }
  }
  return at;
}

test('THE BURST BECOMES A TRICKLE: over one interval every player saves exactly once, spread across ticks', () => {
  const { s, eids, writes } = slate(60);
  const due = () => call('saveDue', s);
  const at = runInterval(s, due);
  assert.equal(at.size, 60, 'every player saved');
  for (const [, ticks] of at) assert.equal(ticks.length, 1, 'exactly once');
  const distinct = new Set([...at.values()].map((t) => t[0]! % SAVE_INTERVAL_TICKS));
  assert.equal(distinct.size, 60, 'sixty players land on sixty different ticks');
  // The first save after birth writes every table (the ledger is empty).
  assert.equal(writes.skills.length, 60);
  assert.equal(writes.inv.length, 60);
  assert.equal(writes.equip.length, 60);
  // Phase law: body eid saves on tick ≡ eid (mod 600).
  for (const [cid, ticks] of at) {
    const eid = eids[cid - 100]!;
    assert.equal(ticks[0]! % SAVE_INTERVAL_TICKS, eid % SAVE_INTERVAL_TICKS);
  }
});

test('a player with no mutation saves nothing on the next cadence; a mutated mirror writes only its own table', async () => {
  const { s, eids, writes } = slate(3);
  const due = () => call('saveDue', s);
  runInterval(s, due);
  await Promise.resolve();
  writes.char.length = writes.skills.length = writes.inv.length = writes.equip.length = 0;
  // Player 0 walks; player 1 gains an item; player 2 sits still.
  s.positions.must(eids[0]!).x += 1;
  (s.players.must(eids[1]!).inventory as unknown[])[0] = { item: 'apple', qty: 1 };
  runInterval(s, due);
  assert.deepEqual(writes.char, [100], 'only the walker rewrote characters');
  assert.deepEqual(writes.inv, [101], 'only the looter rewrote inventory');
  assert.deepEqual(writes.skills, []);
  assert.deepEqual(writes.equip, []);
  // And the third interval, with nothing moved, writes nothing at all.
  writes.char.length = writes.inv.length = 0;
  runInterval(s, due);
  assert.deepEqual(writes.char, []);
  assert.deepEqual(writes.inv, []);
});

test('a failed write re-arms its table: the same row is re-fired on the next cadence though the mirror is unchanged', async () => {
  const { s, writes } = slate(2, { failInvOnce: new Set([100]) });
  const due = () => call('saveDue', s);
  runInterval(s, due);
  await Promise.resolve(); // the verdicts settle
  await Promise.resolve();
  assert.deepEqual(writes.inv, [100, 101]);
  writes.inv.length = 0;
  writes.char.length = 0;
  runInterval(s, due);
  assert.deepEqual(writes.inv, [100], 'the failed inventory write is retried; the good one is not');
  assert.deepEqual(writes.char, [], 'the tables that landed stay quiet');
  // A landed retry clears the flag.
  writes.inv.length = 0;
  runInterval(s, due);
  assert.deepEqual(writes.inv, []);
});

test('THE SAVE OUTLIVES THE TICK: a throwing systems walk still runs the cadence save, and the throw still reaches the loop', () => {
  const { s, eids, writes } = slate(1);
  const eid = eids[0]!;
  const t = s as typeof s & { tickSystems: () => void; tick: () => void };
  t.tickSystems = () => {
    throw new Error('bad content');
  };
  t.tick = proto.tick as () => void;
  // The next tick is this body's phase; the walk throws before the save would have run.
  t.tickCount = eid - 1;
  assert.throws(() => t.tick(), /bad content/);
  assert.equal(t.tickCount, eid, 'the tick number still advanced');
  assert.deepEqual(writes.char, [100], 'the cadence save was issued under the throw');
  assert.deepEqual(writes.inv, [100]);
});

test('THE THROW IS COUNTED: tickHealth reports the last minute of throws and forgets the older ones', () => {
  const h = {
    tickThrowStamps: [] as number[],
    tickMsCount: 0,
    tickMsSum: 0,
    tickMsWindowAvg: 0,
    tickMsMax: 0,
    tickMsWindowMax: 0,
    lastTickAt: 5,
    pruneTickThrows: proto.pruneTickThrows,
  };
  call('noteTickThrow', h, 1_000);
  call('noteTickThrow', h, 30_000);
  call('noteTickThrow', h, 59_000);
  const at = (now: number) => (call('tickHealth', h, now) as { throwsLastMin: number }).throwsLastMin;
  assert.equal(at(59_500), 3);
  assert.equal(at(61_500), 2, 'the throw a minute back fell off');
  assert.equal(at(200_000), 0);
  assert.equal(h.tickThrowStamps.length, 0, 'the window is pruned, not merely filtered');
});

test('markSaveDirty forces one table; saveAll (shutdown) and savePlayer (logout) write whole', () => {
  const { s, eids, writes } = slate(2);
  runInterval(s, () => call('saveDue', s));
  writes.char.length = writes.skills.length = writes.inv.length = writes.equip.length = 0;
  call('markSaveDirty', s, s.players.must(eids[0]!), 'skills');
  runInterval(s, () => call('saveDue', s));
  assert.deepEqual(writes.skills, [100]);
  assert.deepEqual(writes.char, []);
  writes.skills.length = 0;
  call('saveAll', s);
  assert.deepEqual(writes.char, [100, 101]);
  assert.deepEqual(writes.skills, [100, 101]);
  assert.deepEqual(writes.inv, [100, 101]);
  assert.deepEqual(writes.equip, [100, 101]);
  writes.char.length = writes.skills.length = writes.inv.length = writes.equip.length = 0;
  call('savePlayer', s, eids[1]!);
  assert.deepEqual(writes.char, [101]);
  assert.deepEqual(writes.inv, [101]);
});

/** A pg.Client stand-in: `query` answers from a script; `on` is a no-op. */
function fakeClient(script: Array<Error | null>) {
  const seen: string[] = [];
  return {
    seen,
    on: () => undefined,
    query: (sql: string) => {
      seen.push(sql);
      const next = script.shift() ?? null;
      return next ? Promise.reject(next) : Promise.resolve({ rows: [], rowCount: 1 });
    },
  };
}

test('db.fire: a failed write settles false, counts in db.writeFailures with its statement tag, and the FIFO depth returns to zero', async () => {
  metrics.resetAll();
  const client = fakeClient([new Error('disk full'), null]);
  const db = new Db(client as never);
  const okA = db.fire('UPDATE characters SET x = ? WHERE id = ?', [1, 2]);
  const okB = db.fire('UPDATE characters SET x = ? WHERE id = ?', [3, 4]);
  assert.equal(db.queueDepth, 2, 'two units in flight');
  assert.equal(await okA, false);
  assert.equal(await okB, true, 'the FIFO keeps going past a failure');
  assert.equal(metrics.counter('db.writeFailures'), 1);
  assert.equal(db.queueDepth, 0);
  assert.equal(metrics.gauge('db.queueDepth'), 0);
});

test('db.fireTransaction: a failing body rolls back, settles false and counts once', async () => {
  metrics.resetAll();
  const client = fakeClient([null, new Error('unique violation'), null]);
  const db = new Db(client as never);
  const ok = await db.fireTransaction(async (tx) => {
    await tx.run('INSERT INTO inventory_slots VALUES (?)', [1]);
  }, 'inventory');
  assert.equal(ok, false);
  assert.deepEqual(client.seen, ['BEGIN', 'INSERT INTO inventory_slots VALUES ($1)', 'ROLLBACK']);
  assert.equal(metrics.counter('db.writeFailures'), 1);
  assert.ok((await db.ping()) >= 0, 'ping answers through the same FIFO');
});

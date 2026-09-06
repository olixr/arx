import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dungeonSpecFromRoll } from '@arx/shared';
import { GameServer } from './gameServer.js';
import * as runSys from './dungeonRuns.js';
import type { PlayerComp } from './gameServer.js';

/**
 * THE LONG DARK'S DOORS (core audit 2026-09, Band A): a run is cut,
 * counted, a guest is severed, and the rock closes — every step on
 * the module directly, the cut pinned equal to the class delegator's.
 * The dungeon generator is the real one (a seeded cut is
 * deterministic); the plane registry, spawn ledger and transfer
 * door are recorders.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function runSlate() {
  const wire: Array<[number, Record<string, unknown>]> = [];
  const transfers: Array<[number, string, number, number]> = [];
  const planesAdded: string[] = [];
  const planesDropped: string[] = [];
  const freed: number[] = [];
  const destroyed: number[] = [];
  const swept: number[] = [];
  const delves: unknown[] = [];
  const mkPlayer = (eid: number, characterId: number) => {
    const p = {
      characterId,
      name: `C${characterId}`,
      session: { sendJson: (m: Record<string, unknown>) => wire.push([eid, m]) } as { sendJson: Fn } | null,
      disconnectedAt: null as number | null,
    };
    s.players.set(eid, p);
    s.characterEids.set(characterId, eid);
    s.positions.set(eid, { plane: 'surface', x: 100, y: 100 });
    return p;
  };
  const s = {
    players: new Map<number, { characterId: number; session: unknown; disconnectedAt: number | null }>(),
    characterEids: new Map<number, number>(),
    positions: new Map<number, { plane: string; x: number; y: number }>(),
    dungeons: new Map<number, Record<string, unknown>>(),
    nextDungeonSlot: 0,
    poiChests: new Map<string, { cell: string; warded?: boolean }>(),
    npcs: new Map<number, unknown>(),
    pets: new Map<number, unknown>(),
    companions: new Map<number, unknown>(),
    projectiles: new Map<number, unknown>(),
    drops: new Map<number, unknown>(),
    summons: new Map<number, unknown>(),
    pendingBlasts: [] as Array<{ plane: string }>,
    activeFields: [] as Array<{ plane: string }>,
    chunks: new Map<string, Set<number>>(),
    planes: {
      add: (def: { id: string }) => {
        planesAdded.push(def.id);
        return {};
      },
      drop: (id: string) => planesDropped.push(id),
      worldSpawn: { plane: 'surface', x: 1, y: 2 },
    },
    registerSpawns: (spawns: Array<{ count?: number }>) => {
      const out: number[] = [];
      let i = 1000;
      for (const sp of spawns) for (let k = 0; k < (sp.count ?? 1); k++) out.push(i++);
      return out;
    },
    freeSpawnSlot: (i: number) => freed.push(i),
    transferPlane: (eid: number, plane: string, x: number, y: number) => {
      transfers.push([eid, plane, x, y]);
      const pos = s.positions.get(eid);
      if (pos) Object.assign(pos, { plane, x, y });
    },
    party: { notifyDelve: (...a: unknown[]) => delves.push(a) },
    removeFromChunks: () => {},
    ecs: { destroy: (e: number) => destroyed.push(e) },
    sweepWornKeys: (p: { characterId: number }) => swept.push(p.characterId),
    // THE STUB WINS THE DOOR: siblings stay the class's.
    teardownDungeon: proto.teardownDungeon,
    dungeonOnPlane: proto.dungeonOnPlane,
  };
  return { s: s as unknown as GameServer, raw: s, mkPlayer, wire, transfers, planesAdded, planesDropped, freed, destroyed, swept, delves };
}

const spec = dungeonSpecFromRoll({ rar: 'common', seed: 4242, pwr: 6 });
const gate = { plane: 'surface', x: 100, y: 100 };

test('enterDungeon direct === delegator: the same seed cuts the same run (row, wire, transfer)', () => {
  const a = runSlate();
  const b = runSlate();
  const pa = a.mkPlayer(1, 7);
  const pb = b.mkPlayer(1, 7);
  runSys.enterDungeon(a.s, 1, pa as unknown as PlayerComp, spec, gate);
  (proto.enterDungeon as Fn).call(b.s, 1 as never, pb as never, spec as never, gate as never);
  const strip = (r: Record<string, unknown>) => {
    const { cutAt: _c, ...rest } = r;
    return { ...rest, guests: [...(rest.guests as Map<number, unknown>)] };
  };
  const rowA = a.raw.dungeons.get(7)!;
  assert.deepEqual(strip(b.raw.dungeons.get(7)!), strip(rowA));
  assert.deepEqual(b.wire, a.wire);
  assert.deepEqual(b.transfers, a.transfers);
  assert.deepEqual(b.delves, a.delves);
  // The row's shape.
  assert.equal(rowA.plane, 'rift:0');
  assert.equal(rowA.ownerId, 7);
  assert.equal(rowA.seed, spec.seed);
  assert.equal(rowA.tier, 'common');
  assert.equal(rowA.power, spec.power);
  assert.deepEqual(rowA.ownerReturn, gate);
  assert.equal((rowA.guests as Map<number, unknown>).size, 0);
  assert.deepEqual(a.planesAdded, ['rift:0']);
  assert.equal(a.raw.nextDungeonSlot, 1);
  assert.deepEqual(a.wire.map(([, m]) => m.t), ['dungeon', 'chat']);
  assert.deepEqual(a.transfers, [[1, 'rift:0', (rowA.entry as { x: number }).x, (rowA.entry as { y: number }).y]]);
  assert.deepEqual(a.delves, [[7, 'C7', spec.name]]);
  // The same key again is a walk to the entry, not a second cut.
  a.transfers.length = 0;
  runSys.enterDungeon(a.s, 1, pa as unknown as PlayerComp, spec, gate);
  assert.equal(a.raw.nextDungeonSlot, 1);
  assert.deepEqual(a.transfers, [[1, 'rift:0', (rowA.entry as { x: number }).x, (rowA.entry as { y: number }).y]]);
  // A different key tears the old run down first and cuts slot 1.
  const other = dungeonSpecFromRoll({ rar: 'common', seed: 99, pwr: 6 });
  runSys.enterDungeon(a.s, 1, pa as unknown as PlayerComp, other, gate);
  assert.deepEqual(a.planesDropped, ['rift:0']);
  assert.equal(a.raw.dungeons.get(7)!.plane, 'rift:1');
});

test('dungeonHeadcount direct: the owner and the guests standing inside, never the ghost; 1 on any other ground', () => {
  const f = runSlate();
  const owner = f.mkPlayer(1, 7);
  runSys.enterDungeon(f.s, 1, owner as unknown as PlayerComp, spec, gate);
  const inst = f.raw.dungeons.get(7)!;
  assert.equal(runSys.dungeonHeadcount(f.s, 'rift:0'), 1);
  assert.equal(runSys.dungeonHeadcount(f.s, 'surface'), 1);
  const guest = f.mkPlayer(2, 8);
  (inst.guests as Map<number, unknown>).set(8, gate);
  f.raw.positions.set(2, { plane: 'rift:0', x: 5, y: 5 });
  assert.equal(runSys.dungeonHeadcount(f.s, 'rift:0'), 2);
  assert.equal((proto.dungeonHeadcount as Fn).call(f.s, 'rift:0' as never), 2);
  // A stranger on the plane is no soul of the run; a gone guest none either.
  f.mkPlayer(3, 9);
  f.raw.positions.set(3, { plane: 'rift:0', x: 5, y: 5 });
  assert.equal(runSys.dungeonHeadcount(f.s, 'rift:0'), 2);
  guest.session = null;
  guest.disconnectedAt = 5;
  assert.equal(runSys.dungeonHeadcount(f.s, 'rift:0'), 1);
});

test('evictFromGuestDungeon direct: the severed fellow is handed back to their gate, in the rift\'s words', () => {
  const f = runSlate();
  const owner = f.mkPlayer(1, 7);
  runSys.enterDungeon(f.s, 1, owner as unknown as PlayerComp, spec, gate);
  const inst = f.raw.dungeons.get(7)!;
  f.mkPlayer(2, 8);
  (inst.guests as Map<number, unknown>).set(8, { plane: 'surface', x: 50, y: 60 });
  f.raw.positions.set(2, { plane: 'rift:0', x: 5, y: 5 });
  f.wire.length = 0;
  f.transfers.length = 0;
  runSys.evictFromGuestDungeon(f.s, 8);
  assert.equal((inst.guests as Map<number, unknown>).has(8), false);
  assert.deepEqual(f.transfers, [[2, 'surface', 50, 60]]);
  assert.deepEqual(f.wire, [[2, { t: 'chat', channel: 'system', text: 'The rift no longer knows you — it hands you back to your gate.' }]]);
  // A guest who already left the plane is forgotten quietly.
  (inst.guests as Map<number, unknown>).set(8, { plane: 'surface', x: 50, y: 60 });
  f.transfers.length = 0;
  (proto.evictFromGuestDungeon as Fn).call(f.s, 8 as never);
  assert.deepEqual(f.transfers, []);
  assert.equal((inst.guests as Map<number, unknown>).has(8), false);
});

test('teardownDungeon direct: everyone home, the roster freed, strays and ephemera destroyed, the plane dropped, the ward retired, the keys swept', () => {
  const f = runSlate();
  const owner = f.mkPlayer(1, 7);
  runSys.enterDungeon(f.s, 1, owner as unknown as PlayerComp, spec, gate);
  const inst = f.raw.dungeons.get(7)!;
  const roster = [...(inst.spawnIndexes as number[])];
  assert.ok(roster.length > 0);
  f.mkPlayer(2, 8);
  (inst.guests as Map<number, unknown>).set(8, { plane: 'surface', x: 50, y: 60 });
  f.raw.positions.set(2, { plane: 'rift:0', x: 5, y: 5 });
  f.mkPlayer(3, 9);
  f.raw.positions.set(3, { plane: 'rift:0', x: 6, y: 6 });
  // A stray add, a pet, a companion, a shaft, a drop, a summon on the plane; one of each elsewhere.
  for (const [eid, plane] of [[20, 'rift:0'], [21, 'surface'], [22, 'rift:0'], [23, 'rift:0']] as const) {
    f.raw.npcs.set(eid, {});
    f.raw.positions.set(eid, { plane, x: 0, y: 0 });
  }
  f.raw.pets.set(22, {});
  f.raw.companions.set(23, {});
  for (const [eid, plane, bag] of [[30, 'rift:0', 'projectiles'], [31, 'surface', 'projectiles'], [32, 'rift:0', 'drops'], [33, 'rift:0', 'summons']] as const) {
    (f.raw[bag] as Map<number, unknown>).set(eid, {});
    f.raw.positions.set(eid, { plane, x: 0, y: 0 });
  }
  f.raw.pendingBlasts.push({ plane: 'rift:0' }, { plane: 'surface' });
  f.raw.activeFields.push({ plane: 'surface' }, { plane: 'rift:0' });
  f.raw.chunks.set('rift:0|0,0', new Set());
  f.raw.chunks.set('rift:0|1,1', new Set([99]));
  f.raw.chunks.set('surface|0,0', new Set());
  f.raw.poiChests.set('surface|1,1', { cell: 'poi:x' });
  const wardKeys = [...f.raw.poiChests.keys()].filter((k) => k.startsWith('rift:0|'));
  f.wire.length = 0;
  f.transfers.length = 0;
  runSys.teardownDungeon(f.s, 7);
  assert.equal(f.raw.dungeons.has(7), false);
  assert.equal((inst.guests as Map<number, unknown>).size, 0);
  assert.deepEqual(f.transfers, [
    [2, 'surface', 50, 60],
    [3, 'surface', 1, 2],
  ]);
  const line = 'The rift closes behind its keyholder — the world takes you back.';
  assert.deepEqual(f.wire, [
    [2, { t: 'chat', channel: 'system', text: line }],
    [3, { t: 'chat', channel: 'system', text: line }],
  ]);
  assert.deepEqual(f.freed, roster);
  assert.deepEqual(f.destroyed, [20, 30, 32, 33]);
  assert.deepEqual(f.raw.pendingBlasts, [{ plane: 'surface' }]);
  assert.deepEqual(f.raw.activeFields, [{ plane: 'surface' }]);
  assert.deepEqual(f.planesDropped, ['rift:0']);
  assert.deepEqual([...f.raw.chunks.keys()], ['rift:0|1,1', 'surface|0,0'], 'only the dead plane\'s EMPTY sets go');
  for (const k of wardKeys) assert.equal(f.raw.poiChests.has(k), false, `ward ${k} retired`);
  assert.ok(f.raw.poiChests.has('surface|1,1'));
  assert.deepEqual(f.swept, [7]);
  // The owner's eid mapping is the session's to clear, not the rock's.
  assert.equal(f.raw.characterEids.get(7), 1);
  // A second close is a no-op.
  (proto.teardownDungeon as Fn).call(f.s, 7 as never);
  assert.deepEqual(f.planesDropped, ['rift:0']);
});

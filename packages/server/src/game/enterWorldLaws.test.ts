import assert from 'node:assert/strict';
import { test } from 'node:test';
import { C2S_VALIDATORS, EcsWorld, EntityKind } from '@arx/shared';
import { GameServer } from './gameServer.js';
import { C2S_DISPATCH } from '../net/session.js';

/**
 * THE BODY IS ONE — the arrival laws, pinned against the 2026-09 core
 * audit (§1 P0 #4 and its siblings):
 *
 * - two concurrent arrivals for one character stand ONE body (the
 *   second joins the first's in-flight promise, then rebinds onto it);
 * - a rejected load leaves nothing behind — no entity, no players
 *   row, no characterEids row, no in-flight entry;
 * - a socket that closed while the loads were in flight is never
 *   seated: the body enters the reconnect grace (disconnectedAt set),
 *   and a closed joiner never kicks the live tab that holds the body;
 * - a throw in the seating (after the body stands) leaves the body in
 *   grace, never an immortal ghost;
 * - the session's dispatch table answers every parseC2S row.
 *
 * Hand-built slates over GameServer.prototype (the doors convention).
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;
const call = (name: string, self: unknown, ...args: unknown[]): unknown =>
  (proto[name] as (...a: unknown[]) => unknown).call(self, ...args);

/** A promise whose resolution the test holds. */
function gate<T>(value: T): { promise: Promise<T>; open: () => void } {
  let open!: () => void;
  const promise = new Promise<T>((res) => {
    open = () => res(value);
  });
  return { promise, open };
}

const character = {
  id: 42,
  account_id: 1,
  name: 'Wren',
  plane: 'surface',
  x: 10,
  y: 10,
  hp: 10,
  home_x: null,
  home_y: null,
  hearth_at: 0,
  waypoint_x: null,
  waypoint_y: null,
  waypoint_plane: null,
  raid_calm_until: 0,
  hearth_warded: 0,
};

/** Every load the arrival awaits, answered empty and at once. */
function stubAccounts(over: Record<string, unknown> = {}) {
  const now = async <T,>(v: T): Promise<T> => v;
  return {
    loadSkills: () => now({ vitality: 1154 }),
    loadInventory: () => now(new Array(28).fill(null)),
    loadEquipment: () => now({}),
    loadBank: () => now({}),
    loadKeyRing: () => now([]),
    loadBankGear: () => now([]),
    loadKeyLore: () => now([]),
    loadExplored: () => now([]),
    loadDiscoveries: () => now([]),
    loadQuestRows: () => now([]),
    loadStandings: () => now(new Map()),
    loadCarryStyles: () => now({ main: 'normal', off: 'normal' }),
    loadLootPref: () => now(true),
    loadLook: () => now(null),
    loadTechniques: () => now([null, null]),
    loadCallings: () => now(new Map()),
    loadMounts: () => now([]),
    loadPets: () => now([]),
    loadArena: () => now(null),
    loadCompanions: () => now([]),
    loadFlags: () => now(new Map()),
    loadRecipes: () => now([]),
    saveSkills: () => undefined,
    saveInventory: () => undefined,
    saveTechniqueSeat: () => undefined,
    upsertKeyLore: () => undefined,
    ...over,
  };
}

function slate(accounts: ReturnType<typeof stubAccounts>, over: Record<string, unknown> = {}) {
  const ecs = new EcsWorld();
  const world = { isSolid: () => false };
  const bound: Array<[unknown, number]> = [];
  const s = {
    ecs,
    kinds: ecs.register<EntityKind>(),
    positions: ecs.register<unknown>(),
    poses: ecs.register<unknown>(),
    healths: ecs.register<unknown>(),
    players: ecs.register<Record<string, unknown>>(),
    sessions: new Set<unknown>(),
    characterEids: new Map<number, number>(),
    entering: new Map<number, Promise<number | null>>(),
    accounts,
    planes: { get: () => world, worldSpawn: { plane: 'surface', x: 1, y: 1 } },
    poiLedger: new Map(),
    nextKeyRingId: 1,
    bound,
    enterWorld: proto.enterWorld,
    enterWorldStand: proto.enterWorldStand,
    enterWorldSeat: proto.enterWorldSeat,
    bindSession(session: unknown, eid: number) {
      bound.push([session, eid]);
    },
    equippedWeapon: () => undefined,
    updateChunkMembership: () => undefined,
    trySpawnPet: () => undefined,
    trySpawnCompanion: () => undefined,
    systemChatAll: () => undefined,
    social: { notifyOnline: async () => undefined, pendingCount: async () => 0 },
    party: { notifyOnline: async () => undefined, snapshot: async () => undefined },
    ...over,
  };
  return s;
}

const session = (closed = false) => ({
  isClosed: closed,
  playerEid: null as number | null,
  sendJson: (_m?: unknown): undefined => undefined,
  close: () => undefined,
  knownEntities: new Set(),
  knownChunks: new Set(),
  sentSnapSig: new Map(),
});

test('THE BODY IS ONE: two concurrent arrivals for one character stand one body', async () => {
  const pets = gate([] as unknown[]);
  const s = slate(stubAccounts({ loadPets: () => pets.promise }));
  const a = session();
  const b = session();
  const first = call('enterWorld', s, a, character, 1, 'tok-a') as Promise<number | null>;
  const second = call('enterWorld', s, b, character, 1, 'tok-b') as Promise<number | null>;
  // Both are in flight; the second is parked on the first's promise.
  await Promise.resolve();
  assert.equal(s.entering.size, 1);
  assert.equal(s.kinds.size, 0, 'no entity stands before the last load lands');
  pets.open();
  const [eidA, eidB] = await Promise.all([first, second]);
  assert.ok(eidA !== null);
  assert.equal(eidB, eidA, 'the second arrival rebinds onto the first body');
  assert.equal(s.kinds.size, 1);
  assert.equal(s.players.size, 1);
  assert.equal(s.characterEids.size, 1);
  assert.equal(s.characterEids.get(42), eidA);
  assert.equal(s.kinds.get(eidA!), EntityKind.Player);
  // Bound twice — once per socket, both onto the one body — and the
  // late socket's token is the one the body keeps.
  assert.deepEqual(s.bound.map(([, e]) => e), [eidA, eidA]);
  assert.equal(s.players.must(eidA!).token, 'tok-b');
  assert.equal(s.entering.size, 0);
});

test('a rejected load leaves nothing: no entity, no row, no in-flight entry', async () => {
  const s = slate(
    stubAccounts({
      loadFlags: async () => {
        throw new Error('db down');
      },
    }),
  );
  await assert.rejects(call('enterWorld', s, session(), character, 1, 'tok') as Promise<unknown>, /db down/);
  assert.equal(s.kinds.size, 0);
  assert.equal(s.positions.size, 0);
  assert.equal(s.healths.size, 0);
  assert.equal(s.players.size, 0);
  assert.equal(s.characterEids.size, 0);
  assert.equal(s.entering.size, 0);
  assert.equal(s.bound.length, 0);
  // The door is not wedged: a joiner that waited on the failure tries
  // the loads itself and stands the body.
  s.accounts = stubAccounts();
  const eid = await (call('enterWorld', s, session(), character, 1, 'tok') as Promise<number | null>);
  assert.ok(eid !== null);
  assert.equal(s.players.size, 1);
});

test('NO GHOST BIND: a socket that closed mid-arrival leaves the body in grace', async () => {
  const pets = gate([] as unknown[]);
  const s = slate(stubAccounts({ loadPets: () => pets.promise }), { bindSession: proto.bindSession });
  const dead = session();
  const arrival = call('enterWorld', s, dead, character, 1, 'tok') as Promise<number | null>;
  // The wire drops while the loads are still in flight.
  dead.isClosed = true;
  pets.open();
  const before = Date.now();
  const eid = await arrival;
  assert.ok(eid !== null);
  const player = s.players.must(eid!);
  assert.equal(player.session, null, 'the dead socket is never seated');
  assert.ok(typeof player.disconnectedAt === 'number' && player.disconnectedAt >= before, 'grace clock set');
  assert.equal(dead.playerEid, null);
  assert.equal(s.sessions.size, 0);
});

test('A CORPSE KICKS NOBODY: a live arrival stays bound when its closed joiner comes through the door', async () => {
  const s = slate(stubAccounts());
  const a = session();
  const b = session();
  const rejects: unknown[] = [];
  a.sendJson = (m?: unknown): undefined => {
    if ((m as { t: string }).t === 'reject') rejects.push(m);
    return undefined;
  };
  // A stands the body and sits (the welcome's seat, by hand — the
  // slate has no wire to build a welcome over).
  const eidA = await (call('enterWorld', s, a, character, 1, 'tok-a') as Promise<number | null>);
  assert.ok(eidA !== null);
  const player = s.players.must(eidA!);
  player.session = a;
  a.playerEid = eidA;
  s.sessions.add(a);
  // B's wire dropped while it was parked; it comes back through the
  // door onto the standing body — the real bindSession reads it.
  s.bindSession = proto.bindSession as typeof s.bindSession;
  b.isClosed = true;
  const eidB = await (call('enterWorld', s, b, character, 1, 'tok-b') as Promise<number | null>);
  assert.equal(eidB, eidA);
  assert.equal(player.session, a, 'the live tab keeps the body');
  assert.equal(a.playerEid, eidA);
  assert.equal(player.disconnectedAt, null, 'no grace clock over a live tab');
  assert.equal(player.token, 'tok-a', 'a dead socket\'s token never replaces the live one');
  assert.equal(s.sessions.size, 1);
  assert.deepEqual(rejects, [], 'no kick on the live wire');
});

test('a throw in the seating leaves the body in grace, not immortal', async () => {
  const s = slate(stubAccounts(), {
    trySpawnPet: () => {
      throw new Error('kennel fire');
    },
  });
  const before = Date.now();
  await assert.rejects(call('enterWorld', s, session(), character, 1, 'tok') as Promise<unknown>, /kennel fire/);
  assert.equal(s.players.size, 1, 'the body stood');
  const [eid] = [...s.players.keys()];
  const player = s.players.must(eid!);
  assert.equal(player.session, null);
  assert.ok(typeof player.disconnectedAt === 'number' && player.disconnectedAt >= before, 'the grace sweep will collect it');
  assert.equal(s.entering.size, 0);
});

test('the dispatch table answers every parseC2S row (and no other)', () => {
  const validators = Object.keys(C2S_VALIDATORS).sort();
  const rows = Object.keys(C2S_DISPATCH).sort();
  assert.deepEqual(rows, validators);
  assert.ok(rows.length >= 68);
});

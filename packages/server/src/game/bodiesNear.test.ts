import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ByteReader, EntityKind, PoseState, Tile, decodeSnapshot, emptyChunk } from '@arx/shared';
import { GameServer } from './gameServer.js';
import * as interestSys from './interest.js';
import * as farmSys from './farming.js';
import { BODY_NPC, BODY_PLAYER, BODY_SUMMON, LivestockLedger, RespawnQueue, SignLedger, StopIndex, packChunk } from './indexes.js';

/**
 * EVERY BODY IS FOUND BY ITS CHUNK (core audit 2026-09, Band B): every
 * index that replaced a whole-world walk is pinned EQUAL to that walk
 * (kept here as the reference) on a seeded slate — bodies by chunk on
 * two planes, the due-ordered respawn queue against the array scan,
 * the interest pass's scratch reuse against the wire bytes, the plane
 * roll's fan-out, the sign board, the livestock roll and the stop index.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

/** mulberry32 — a seeded coin so the slate is the same every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pos {
  plane: string;
  x: number;
  y: number;
  dir: number;
}

// ------------------------------------------------ bodies by their chunk

function bodySlate(seed = 24601) {
  const r = rng(seed);
  const positions = new Map<number, Pos>();
  const kinds = new Map<number, EntityKind>();
  const players = new Map<number, { session: unknown; disconnectedAt: number | null; hidden?: boolean }>();
  const npcs = new Map<number, { def: { radius: number } }>();
  const pets = new Map<number, { ownerEid: number }>();
  const summons = new Map<number, { kind: string }>();
  const s = {
    positions: Object.assign(positions, { must: (e: number) => positions.get(e)! }),
    kinds,
    players,
    npcs,
    pets,
    summons,
    chunks: new Map<string, Set<number>>(),
    entityChunk: new Map<number, string>(),
    chunkGrid: new Map<string, Map<number, Set<number>>>(),
    entityCell: new Map<number, number>(),
    entityPlane: new Map<number, string>(),
    chunkKeyOf: proto.chunkKeyOf,
    updateChunkMembership: proto.updateChunkMembership,
    removeFromChunks: proto.removeFromChunks,
    forEachBodyNear: proto.forEachBodyNear,
    forEachNpcNear: proto.forEachNpcNear,
    playerWithin: proto.playerWithin,
  };
  const srv = s as unknown as GameServer;
  const planes = ['surface', 'rift:0'];
  // 200 bodies over an 8×5 chunk board (40 chunks) on two planes.
  const place = (eid: number) => {
    positions.set(eid, { plane: planes[eid % 2]!, x: r() * 256, y: r() * 160, dir: 0 });
  };
  let eid = 1;
  for (let i = 0; i < 70; i++, eid++) {
    place(eid);
    kinds.set(eid, EntityKind.Player);
    // Every seventh player is a body in reconnect grace — playerWithin skips it.
    players.set(eid, i % 7 === 0 ? { session: null, disconnectedAt: 1 } : { session: {}, disconnectedAt: null });
  }
  for (let i = 0; i < 90; i++, eid++) {
    place(eid);
    kinds.set(eid, EntityKind.Npc);
    npcs.set(eid, { def: { radius: 0.4 } });
    if (i % 4 === 0) pets.set(eid, { ownerEid: 1 });
  }
  for (let i = 0; i < 40; i++, eid++) {
    place(eid);
    kinds.set(eid, EntityKind.Prop);
    summons.set(eid, { kind: i % 2 === 0 ? 'decoy' : 'bait' });
  }
  for (const e of positions.keys()) interestSys.updateChunkMembership(srv, e);
  return { s, srv, r, positions, kinds, players, pets, summons };
}

/** The reference: the whole-map walk every replaced site used to run. */
function refBodies(
  w: ReturnType<typeof bodySlate>,
  plane: string,
  x: number,
  y: number,
  r: number,
  mask: number,
): number[] {
  const out: number[] = [];
  for (const [eid, pos] of w.positions) {
    if (pos.plane !== plane) continue;
    const kind = w.kinds.get(eid)!;
    if ((mask & (1 << kind)) === 0) continue;
    if (Math.hypot(pos.x - x, pos.y - y) <= r) out.push(eid);
  }
  return out.sort((a, b) => a - b);
}

function nearBodies(w: ReturnType<typeof bodySlate>, plane: string, x: number, y: number, r: number, mask: number): number[] {
  const out: number[] = [];
  (w.s.forEachBodyNear as Fn).call(w.srv, plane as never, x as never, y as never, r as never, mask as never, ((eid: number, pos: Pos) => {
    if (Math.hypot(pos.x - x, pos.y - y) <= r) out.push(eid);
  }) as never);
  return out.sort((a, b) => a - b);
}

test('forEachBodyNear === the whole-map walk for 500 seeded queries, per kind mask, never a body from another plane', () => {
  const w = bodySlate();
  const masks = [BODY_PLAYER, BODY_NPC, BODY_SUMMON, BODY_PLAYER | BODY_NPC, BODY_PLAYER | BODY_NPC | BODY_SUMMON];
  let nonEmpty = 0;
  for (let i = 0; i < 500; i++) {
    const plane = i % 2 === 0 ? 'surface' : 'rift:0';
    const x = w.r() * 300 - 20;
    const y = w.r() * 200 - 20;
    const rad = 0.5 + w.r() * 40;
    const mask = masks[i % masks.length]!;
    const expect = refBodies(w, plane, x, y, rad, mask);
    assert.deepEqual(nearBodies(w, plane, x, y, rad, mask), expect, `query ${i} (${plane} ${x.toFixed(1)},${y.toFixed(1)} r${rad.toFixed(1)} mask ${mask})`);
    if (expect.length > 0) nonEmpty++;
  }
  assert.ok(nonEmpty > 200, `the slate must actually exercise hits (${nonEmpty} non-empty)`);
  // A plane the index never saw answers nothing, and never throws.
  assert.deepEqual(nearBodies(w, 'rift:9', 10, 10, 500, BODY_PLAYER | BODY_NPC | BODY_SUMMON), []);
});

test('bodies that move re-file (the unmoved-body fast path included) and a plane crossing leaves the old plane at once', () => {
  const w = bodySlate(7);
  // Move 120 bodies: some within their cell (fast path), some across cells, some across planes.
  const moved: number[] = [];
  for (const [eid, pos] of w.positions) {
    if (eid % 5 === 0) {
      pos.x += 0.3; // stays in its cell — no re-file
      moved.push(eid);
    } else if (eid % 5 === 1) {
      pos.x = w.r() * 256;
      pos.y = w.r() * 160;
      moved.push(eid);
    } else if (eid % 5 === 2) {
      pos.plane = pos.plane === 'surface' ? 'rift:0' : 'surface'; // aliased coordinates, other world
      moved.push(eid);
    }
  }
  for (const eid of moved) interestSys.updateChunkMembership(w.srv, eid);
  for (let i = 0; i < 200; i++) {
    const plane = i % 2 === 0 ? 'surface' : 'rift:0';
    const x = w.r() * 256;
    const y = w.r() * 160;
    const rad = 1 + w.r() * 30;
    const mask = BODY_PLAYER | BODY_NPC | BODY_SUMMON;
    assert.deepEqual(nearBodies(w, plane, x, y, rad, mask), refBodies(w, plane, x, y, rad, mask), `post-move query ${i}`);
  }
  // Every filed body sits in exactly one string set and the grid shares that very Set.
  for (const [eid, key] of w.s.entityChunk) {
    const set = w.s.chunks.get(key)!;
    assert.ok(set.has(eid));
    const pos = w.positions.get(eid)!;
    const cell = packChunk(Math.floor(pos.x / 32), Math.floor(pos.y / 32));
    assert.equal(w.s.chunkGrid.get(pos.plane)!.get(cell), set, 'one membership, two doors');
    assert.equal(w.s.entityCell.get(eid), cell);
    assert.equal(w.s.entityPlane.get(eid), pos.plane);
  }
  // Removal empties both doors' view of the body.
  interestSys.removeFromChunks(w.srv, 3);
  assert.equal(w.s.entityChunk.has(3), false);
  assert.equal(w.s.entityCell.has(3), false);
  assert.deepEqual(nearBodies(w, w.positions.get(3)!.plane, w.positions.get(3)!.x, w.positions.get(3)!.y, 0.1, BODY_PLAYER), []);
});

test('playerWithin through the index === the connected-player walk; forEachNpcNear still finds every NPC', () => {
  const w = bodySlate(99);
  const refWithin = (plane: string, x: number, y: number, r: number): boolean => {
    for (const [eid, player] of w.players) {
      if (player.session === null && player.disconnectedAt !== null) continue;
      const pos = w.positions.get(eid)!;
      if (pos.plane === plane && Math.hypot(pos.x - x, pos.y - y) <= r) return true;
    }
    return false;
  };
  let trues = 0;
  for (let i = 0; i < 500; i++) {
    const plane = i % 2 === 0 ? 'surface' : 'rift:0';
    const x = w.r() * 256;
    const y = w.r() * 160;
    const rad = 0.5 + w.r() * 24;
    const expect = refWithin(plane, x, y, rad);
    assert.equal((w.s.playerWithin as Fn).call(w.srv, plane as never, x as never, y as never, rad as never), expect, `playerWithin ${i}`);
    if (expect) trues++;
  }
  assert.ok(trues > 100 && trues < 400, `both answers exercised (${trues} true)`);
  // A body in reconnect grace standing right there is not "a player within".
  const ghost = [...w.players].find(([, p]) => p.session === null)![0];
  const gp = w.positions.get(ghost)!;
  assert.equal(refWithin(gp.plane, gp.x, gp.y, 0.01), false);
  assert.equal((w.s.playerWithin as Fn).call(w.srv, gp.plane as never, gp.x as never, gp.y as never, 0.01 as never), false);
  for (let i = 0; i < 100; i++) {
    const plane = i % 2 === 0 ? 'surface' : 'rift:0';
    const x = w.r() * 256;
    const y = w.r() * 160;
    const rad = 1 + w.r() * 30;
    const got: number[] = [];
    (w.s.forEachNpcNear as Fn).call(w.srv, plane as never, x as never, y as never, rad as never, ((eid: number, _n: unknown, pos: Pos) => {
      if (Math.hypot(pos.x - x, pos.y - y) <= rad) got.push(eid);
    }) as never);
    assert.deepEqual(got.sort((a, b) => a - b), refBodies(w, plane, x, y, rad, BODY_NPC));
  }
});

// ----------------------------------------------------- the due head

interface Entry {
  at: number;
  plane: string;
  tx: number;
  ty: number;
  tile: Tile;
  over?: Tile;
  /** Test-only: defer this many times before firing (the door-occupied / body-on-tile courtesy). */
  defers: number;
  id: number;
}

test('RespawnQueue fires the same entries on the same ticks in the same order as the array scan over 5,000 ticks', () => {
  const r = rng(5);
  const TICK = 50;
  // A deferrable entry (the door-occupied / body-on-tile courtesy)
  // stands on its own tile row (ty ≥ 100): a deferral moves it off the
  // tick grid, and the two shapes order a re-queued entry against a
  // same-tile fresh push differently (the array by slot, the heap by
  // time) — a same-millisecond corner no tile in the world can see.
  const mk = (id: number, at: number): Entry => {
    const defers = r() < 0.15 ? 1 + Math.floor(r() * 2) : 0;
    return {
      at,
      plane: id % 3 === 0 ? 'rift:0' : 'surface',
      tx: Math.floor(r() * 40),
      ty: Math.floor(r() * 40) + (defers > 0 ? 100 : 0),
      tile: Tile.Grass,
      defers,
      id,
    };
  };
  // The old drain, verbatim in shape: end-to-start, splice on fire,
  // a deferred entry keeps its slot and takes a later time.
  const arr: Entry[] = [];
  const heap = new RespawnQueue();
  const arrFired: string[] = [];
  const heapFired: string[] = [];
  // Deferrals land off the tick grid (+5025) so a re-queued entry never
  // shares an `at` with a fresh push: the two shapes agree on every
  // order but that one (the heap fires the later push first — the
  // array's own rule for equal times — where the array would fire by
  // slot; a same-millisecond tie between a deferral and a push).
  const DEFER = 5025;
  let nextId = 1;
  const seen = new Map<number, Entry>();
  const pushBoth = (e: Entry) => {
    seen.set(e.id, e);
    arr.push(e);
    heap.push({ ...e });
  };
  for (let i = 0; i < 400; i++) pushBoth(mk(nextId++, Math.floor(r() * 4000) * TICK));
  for (let tick = 0; tick < 5000; tick++) {
    const now = tick * TICK;
    // A trickle of new work, some due at once, some far out, some tied.
    if (tick % 7 === 0) pushBoth(mk(nextId++, now + Math.floor(r() * 300) * TICK));
    if (tick % 11 === 0) {
      const at = now + 20 * TICK;
      pushBoth(mk(nextId++, at));
      pushBoth(mk(nextId++, at)); // an equal-time pair: later push fires first
    }
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i]!;
      if (e.at > now) continue;
      if (e.defers > 0) {
        e.defers--;
        e.at = now + DEFER;
        continue;
      }
      arrFired.push(`${tick}:${e.id}`);
      arr.splice(i, 1);
    }
    for (let e = heap.peek() as Entry | undefined; e !== undefined && e.at <= now; e = heap.peek() as Entry | undefined) {
      heap.pop();
      if (e.defers > 0) {
        e.defers--;
        e.at = now + DEFER;
        heap.push(e);
        continue;
      }
      heapFired.push(`${tick}:${e.id}`);
    }
    if (tick === 2500) {
      // The rare hands: a tile purge and a rect purge, both shapes.
      const gone = arr.filter((e) => e.plane === 'surface' && e.tx === 3 && e.ty === 4).length;
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i]!;
        if (e.plane === 'surface' && e.tx === 3 && e.ty === 4) arr.splice(i, 1);
      }
      assert.equal(heap.removeWhere((e) => e.plane === 'surface' && e.tx === 3 && e.ty === 4), gone);
      const inRect = (e: Entry) => e.plane === 'rift:0' && e.tx >= 10 && e.tx < 20 && e.ty >= 10 && e.ty < 20;
      const goneRect = arr.filter(inRect).length;
      for (let i = arr.length - 1; i >= 0; i--) if (inRect(arr[i]!)) arr.splice(i, 1);
      assert.equal(heap.removeWhere((e) => inRect(e as Entry)), goneRect);
      assert.equal(heap.length, arr.length);
    }
  }
  assert.ok(arrFired.length > 900, `the run fired real work (${arrFired.length})`);
  // The same entries fire on the same ticks...
  const byTick = (fired: string[]) => {
    const m = new Map<string, number[]>();
    for (const f of fired) {
      const [tick, id] = f.split(':');
      let ids = m.get(tick!);
      if (!ids) m.set(tick!, (ids = []));
      ids.push(Number(id));
    }
    for (const ids of m.values()) ids.sort((a, b) => a - b);
    return [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  };
  assert.deepEqual(byTick(heapFired), byTick(arrFired));
  // ...and every TILE sees its entries land in the same order (the
  // world's only witness — the array's order ACROSS tiles within one
  // tick is by slot, not time, and no ground can observe it).
  const byTile = (fired: string[]) => {
    const m = new Map<string, number[]>();
    for (const f of fired) {
      const id = Number(f.split(':')[1]);
      const e = seen.get(id)!;
      const key = `${e.plane}|${e.tx},${e.ty}`;
      let ids = m.get(key);
      if (!ids) m.set(key, (ids = []));
      ids.push(id);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  };
  assert.deepEqual(byTile(heapFired), byTile(arrFired));
  assert.ok(byTile(arrFired).some(([, ids]) => ids.length > 1), 'some tile fired more than once — the per-tile order is a real pin');
  assert.equal(heap.length, arr.length);
  assert.deepEqual(
    heap.toArray().map((e) => (e as Entry).id).sort((a, b) => a - b),
    arr.map((e) => e.id).sort((a, b) => a - b),
  );
});

test('RespawnQueue: equal times fire later-push-first, toArray reads in firing order, iteration is the same read', () => {
  const q = new RespawnQueue();
  const e = (at: number, tx: number) => ({ at, plane: 'surface', tx, ty: 0, tile: Tile.Grass });
  q.push(e(10, 1));
  q.push(e(5, 2));
  q.push(e(10, 3));
  q.push(e(7, 4));
  assert.deepEqual(q.toArray().map((x) => x.tx), [2, 4, 3, 1]);
  assert.deepEqual([...q].map((x) => x.tx), [2, 4, 3, 1]);
  assert.equal(q.pop()!.tx, 2);
  assert.equal(q.peek()!.tx, 4);
  assert.equal(q.length, 3);
});

// ------------------------------------------------- the settled window

interface SessionSlate {
  playerEid: number;
  knownChunks: Set<string>;
  knownEntities: Set<number>;
  sentSnapSig: Map<number, Int32Array>;
  lastCenterChunk: string | null;
  centerCell: number;
  knownChunksSettled: number;
  congested: boolean;
  json: Array<Record<string, unknown>>;
  bin: ArrayBuffer[];
  sendJson: (m: Record<string, unknown>) => void;
  sendBinary: (b: ArrayBuffer) => void;
}

function mkSession(playerEid: number): SessionSlate {
  const s: SessionSlate = {
    playerEid,
    knownChunks: new Set(),
    knownEntities: new Set(),
    sentSnapSig: new Map(),
    lastCenterChunk: null,
    centerCell: -1,
    knownChunksSettled: -1,
    congested: false,
    json: [],
    bin: [],
    sendJson: (m) => s.json.push(m),
    sendBinary: (b) => s.bin.push(b),
  };
  return s;
}

function interestSlate() {
  const positions = new Map<number, Pos>();
  const players = new Map<number, Record<string, unknown>>();
  const discoveries: number[] = [];
  const streamed: Array<[number, number, number]> = [];
  const s = {
    positions: Object.assign(positions, { must: (e: number) => positions.get(e)! }),
    kinds: { must: (e: number) => (players.has(e) ? EntityKind.Player : EntityKind.ItemDrop) },
    players,
    npcs: new Map(),
    pets: new Map(),
    companions: new Map(),
    livestock: new Map(),
    actors: new Map(),
    drops: new Map<number, { item: string; qty: number }>(),
    projectiles: new Map(),
    summons: new Map(),
    graves: new Map(),
    healths: new Map<number, { hp: number; maxHp: number }>(),
    poses: new Map<number, number>(),
    characterEids: new Map(),
    dialoguesByActor: new Map(),
    chunks: new Map<string, Set<number>>(),
    entityChunk: new Map<number, string>(),
    chunkGrid: new Map<string, Map<number, Set<number>>>(),
    entityCell: new Map<number, number>(),
    entityPlane: new Map<number, string>(),
    tickCount: 77,
    planes: { require: () => ({ ensure: (cx: number, cy: number) => emptyChunk(cx, cy) }) },
    checkDiscoveries: (e: number) => discoveries.push(e),
    sendChunkSigns: (ses: SessionSlate, cx: number, cy: number) => streamed.push([ses.playerEid, cx, cy]),
    statusBits: () => 0,
    chunkKeyOf: proto.chunkKeyOf,
    updateChunkMembership: proto.updateChunkMembership,
    removeFromChunks: proto.removeFromChunks,
    buildMeta: proto.buildMeta,
    npcAlertByte: proto.npcAlertByte,
  };
  const srv = s as unknown as GameServer;
  const addPlayer = (eid: number, x: number, y: number) => {
    positions.set(eid, { plane: 'surface', x, y, dir: 0.5 });
    players.set(eid, { name: `P${eid}`, equipment: {}, lastProcessedSeq: eid * 10 });
    s.healths.set(eid, { hp: 10, maxHp: 20 });
    s.poses.set(eid, PoseState.Walk);
    interestSys.updateChunkMembership(srv, eid);
  };
  return { s, srv, addPlayer, positions, discoveries, streamed };
}

function decode(buf: ArrayBuffer) {
  const r = new ByteReader(buf);
  r.u8();
  return decodeSnapshot(r);
}

test('interest scratch reuse: byte-identical snapshots across passes and sessions, the settled pass streams nothing and forgets nothing', () => {
  const w = interestSlate();
  w.addPlayer(1, 5, 5);
  w.addPlayer(2, 40, 9);
  w.addPlayer(3, 700, 700); // far away — never in either window
  const a = mkSession(1);
  const b = mkSession(2);
  const A = a as unknown as import('../net/session.js').Session;
  const B = b as unknown as import('../net/session.js').Session;
  interestSys.updateInterest(w.srv, A);
  interestSys.updateInterest(w.srv, B);
  const enterA = a.json.find((m) => m.t === 'enter')!;
  const enterB = b.json.find((m) => m.t === 'enter')!;
  assert.deepEqual((enterA.entities as Array<{ eid: number }>).map((e) => e.eid), [1, 2]);
  assert.deepEqual((enterB.entities as Array<{ eid: number }>).map((e) => e.eid), [1, 2]);
  assert.equal(a.knownChunks.size, 25);
  assert.equal(a.knownChunksSettled, 25);
  const streamedBefore = w.streamed.length;
  const binBefore = a.bin.length;
  // The settled pass: same cell, same known set — no chunk streamed,
  // no key parsed, and the enter list the wire holds is untouched.
  interestSys.updateInterest(w.srv, A);
  assert.equal(w.streamed.length, streamedBefore);
  assert.equal(a.bin.length, binBefore);
  assert.equal(a.json.filter((m) => m.t === 'enter').length, 1);
  assert.deepEqual((enterA.entities as Array<{ eid: number }>).map((e) => e.eid), [1, 2], 'a sent list is never scratch');
  // An outside delete reopens the walk: the chunk streams again.
  a.knownChunks.delete('0,0');
  interestSys.updateInterest(w.srv, A);
  assert.equal(a.bin.length, binBefore + 1);
  assert.equal(a.knownChunks.size, 25);
  // A crossing (lastCenterChunk nulled, known cleared) re-streams whole.
  a.knownChunks.clear();
  a.lastCenterChunk = null;
  interestSys.updateInterest(w.srv, A);
  assert.equal(a.knownChunks.size, 25);
  assert.deepEqual(w.discoveries, [1, 2, 1]);

  // Snapshots: the pooled rows produce the same bytes every pass, and
  // an interleaved session never bleeds into another's frame.
  interestSys.sendSnapshot(w.srv, A);
  const first = new Uint8Array(a.bin.at(-1)!);
  interestSys.sendSnapshot(w.srv, B);
  const other = new Uint8Array(b.bin.at(-1)!);
  a.sentSnapSig.clear();
  interestSys.sendSnapshot(w.srv, A);
  const again = new Uint8Array(a.bin.at(-1)!);
  assert.deepEqual([...again], [...first], 'byte-identical across passes');
  assert.notDeepEqual([...other], [...first]);
  const snapA = decode(a.bin.at(-1)!);
  assert.equal(snapA.lastInputSeq, 10);
  assert.deepEqual(snapA.entities.map((e) => e.eid), [1, 2]);
  const snapB = decode(b.bin.at(-1)!);
  assert.equal(snapB.lastInputSeq, 20);
  assert.deepEqual(snapB.entities.map((e) => e.eid), [1, 2]);
  // THE QUIET WIRE still holds: an unchanged other body drops off the next frame; the own body always ships.
  interestSys.sendSnapshot(w.srv, A);
  assert.deepEqual(decode(a.bin.at(-1)!).entities.map((e) => e.eid), [1]);
});

// ---------------------------------------------------- the plane roll

test('the plane roll: farm mirrors and tile patches reach only the plane\'s sessions; a crossing refiles', () => {
  type Ses = { streamPlane: string | null; json: Array<Record<string, unknown>>; sendJson: (m: Record<string, unknown>) => void; knownChunks: Set<string>; bin: ArrayBuffer[]; sendBinary: (b: ArrayBuffer) => void };
  const mk = (): Ses => {
    const s: Ses = { streamPlane: null, json: [], sendJson: (m) => s.json.push(m), knownChunks: new Set(['0,0']), bin: [], sendBinary: (b) => s.bin.push(b) };
    return s;
  };
  const up1 = mk();
  const up2 = mk();
  const down = mk();
  const s = {
    sessions: new Set([up1, up2, down]),
    sessionsByPlane: new Map<string, Set<Ses>>(),
    refileSession: proto.refileSession,
    sessionsOn: proto.sessionsOn,
  };
  const srv = s as unknown as GameServer;
  const refile = (ses: Ses, plane: string | null) => (s.refileSession as Fn).call(srv, ses as never, plane as never);
  refile(up1, 'surface');
  refile(up2, 'surface');
  refile(down, 'rift:0');
  farmSys.mirrorPlot(srv, { tx: 4, ty: 5, watered: 1, soil: 0, mulched: 0, framed: 0 } as never);
  assert.equal(up1.json.length, 1);
  assert.equal(up2.json.length, 1);
  assert.equal(down.json.length, 0, 'a session under the meadow hears no plot');
  farmSys.mirrorTrough(srv, { tx: 1, ty: 1, feed: 3 });
  farmSys.mirrorApiary(srv, 1, 2, 3);
  farmSys.mirrorJob(srv, { tx: 1, ty: 1, recipe: 'r', qty: 1, startedAt: 0, grade: 0 });
  farmSys.mirrorBin(srv, { tx: 1, ty: 1, fill: 0, graded: 0, startedAt: 0 } as never);
  assert.equal(up1.json.length, 5);
  assert.equal(down.json.length, 0);
  // The crossing back up files the session with the surface; leaving unfiles.
  refile(down, 'surface');
  farmSys.mirrorPlot(srv, { tx: 4, ty: 5, watered: 1, soil: 0, mulched: 0, framed: 0 } as never);
  assert.equal(down.json.length, 1);
  refile(up1, null);
  farmSys.mirrorPlot(srv, { tx: 4, ty: 5, watered: 1, soil: 0, mulched: 0, framed: 0 } as never);
  assert.equal(up1.json.length, 6);
  assert.equal(up2.json.length, 7);
  assert.equal(s.sessionsByPlane.get('rift:0'), undefined, 'an emptied plane leaves the roll');
  assert.equal((s.sessionsOn as Fn).call(srv, 'rift:0' as never), (s.sessionsOn as Fn).call(srv, 'rift:1' as never), 'the empty answer is one shared set');
  assert.deepEqual([...((s.sessionsOn as Fn).call(srv, 'surface' as never) as Set<Ses>)], [up2, down]);
});

// -------------------------------------------------- the sign board

test('SignLedger.inChunk === the linear scan over every sign, per plane; set/delete keep both doors', () => {
  const r = rng(11);
  const board = new SignLedger();
  const all: Array<{ plane: string; tx: number; ty: number; title: string; lines: string[]; owner: number }> = [];
  for (let i = 0; i < 300; i++) {
    const sign = { plane: i % 3 === 0 ? 'rift:0' : 'surface', tx: Math.floor(r() * 400) - 40, ty: Math.floor(r() * 300) - 40, title: `s${i}`, lines: [], owner: i };
    board.set(sign);
    // A later sign on the same tile replaces the earlier (the Map's own rule).
    const j = all.findIndex((o) => o.plane === sign.plane && o.tx === sign.tx && o.ty === sign.ty);
    if (j >= 0) all.splice(j, 1);
    all.push(sign);
  }
  assert.equal(board.size, all.length);
  const linear = (plane: string, cx: number, cy: number) =>
    all
      .filter((o) => o.plane === plane && o.tx >= cx * 32 && o.tx < cx * 32 + 32 && o.ty >= cy * 32 && o.ty < cy * 32 + 32)
      .map((o) => o.title)
      .sort();
  for (let i = 0; i < 150; i++) {
    const plane = i % 2 === 0 ? 'surface' : 'rift:0';
    const cx = Math.floor(r() * 16) - 2;
    const cy = Math.floor(r() * 12) - 2;
    assert.deepEqual([...board.inChunk(plane, cx, cy)].map((o) => o.title).sort(), linear(plane, cx, cy));
  }
  for (const o of all.slice(0, 100)) assert.equal(board.delete(o.plane, o.tx, o.ty), true);
  all.splice(0, 100);
  assert.equal(board.size, all.length);
  for (let i = 0; i < 60; i++) {
    const cx = Math.floor(r() * 16) - 2;
    const cy = Math.floor(r() * 12) - 2;
    assert.deepEqual([...board.inChunk('surface', cx, cy)].map((o) => o.title).sort(), linear('surface', cx, cy));
  }
  assert.equal(board.get(all[0]!.plane, all[0]!.tx, all[0]!.ty), all[0]);
  assert.equal(board.has('surface', 9999, 9999), false);
});

// ------------------------------------------------ the livestock roll

test('LivestockLedger counts by keeper and trough === the linear scans, through set/delete/replace', () => {
  const r = rng(13);
  const roll = new LivestockLedger();
  const comps = new Map<number, { row: { characterId: number; slot: number; tx: number; ty: number } }>();
  for (let eid = 1; eid <= 120; eid++) {
    const comp = { row: { characterId: 1 + Math.floor(r() * 12), slot: Math.floor(r() * 4), tx: Math.floor(r() * 6), ty: Math.floor(r() * 3) } };
    roll.set(eid, comp as never);
    comps.set(eid, comp);
  }
  const check = () => {
    for (let c = 0; c <= 13; c++) {
      let n = 0;
      for (const comp of comps.values()) if (comp.row.characterId === c) n++;
      assert.equal(roll.keeperCount(c), n);
      for (let slot = 0; slot < 5; slot++) {
        let expect: number | null = null;
        for (const [eid, comp] of comps) {
          if (comp.row.characterId === c && comp.row.slot === slot) {
            expect = eid;
            break;
          }
        }
        assert.equal(roll.eidFor(c, slot), expect);
      }
    }
    for (let tx = 0; tx < 7; tx++) {
      for (let ty = 0; ty < 4; ty++) {
        let n = 0;
        for (const comp of comps.values()) if (comp.row.tx === tx && comp.row.ty === ty) n++;
        assert.equal(roll.troughCount(tx, ty), n);
      }
    }
  };
  check();
  for (let eid = 1; eid <= 120; eid += 3) {
    roll.delete(eid);
    comps.delete(eid);
  }
  check();
  // A re-filed body moves between keepers and troughs.
  const moved = { row: { characterId: 13, slot: 0, tx: 6, ty: 3 } };
  roll.set(2, moved as never);
  comps.set(2, moved);
  check();
  assert.equal(roll.size, comps.size);
  roll.clear();
  assert.equal(roll.keeperCount(13), 0);
  assert.equal(roll.troughCount(6, 3), 0);
});

// ------------------------------------------------- the stops by chunk

test('StopIndex.near === the whole-roster waypoint scan, with retired rows owning nothing and re-tenanted slots unfiled', () => {
  const r = rng(17);
  type Row = { active: boolean; plane: string; patrol?: Array<{ x: number; y: number }>; post?: { x: number; y: number } };
  type Post = { active: boolean; plane: string; x: number; y: number };
  const rows: Row[] = [];
  const posts: Post[] = [];
  const idx = new StopIndex();
  for (let i = 0; i < 400; i++) {
    const row: Row = {
      active: r() > 0.3,
      plane: i % 4 === 0 ? 'rift:0' : 'surface',
      patrol: Array.from({ length: Math.floor(r() * 4) }, () => ({ x: r() * 500, y: r() * 400 })),
      post: r() > 0.5 ? { x: r() * 500, y: r() * 400 } : undefined,
    };
    rows.push(row);
    for (const p of row.patrol ?? []) idx.add(row, p.x, p.y);
    if (row.post) idx.add(row, row.post.x, row.post.y);
    const post: Post = { active: r() > 0.3, plane: i % 5 === 0 ? 'rift:0' : 'surface', x: r() * 500, y: r() * 400 };
    posts.push(post);
    idx.add(post, post.x, post.y);
  }
  // The reference: routineWaypointsNear as it stood.
  const ref = (plane: string, x: number, y: number, reach: number): Set<string> => {
    const out = new Set<string>();
    const near = (px: number, py: number) => Math.abs(px - x) <= reach && Math.abs(py - y) <= reach;
    const key = (px: number, py: number) => `${Math.floor(px)},${Math.floor(py)}`;
    for (const sp of rows) {
      if (!sp.active || sp.plane !== plane) continue;
      for (const p of sp.patrol ?? []) if (near(p.x, p.y)) out.add(key(p.x, p.y));
      if (sp.post && near(sp.post.x, sp.post.y)) out.add(key(sp.post.x, sp.post.y));
    }
    for (const ap of posts) {
      if (!ap.active || ap.plane !== plane) continue;
      if (near(ap.x, ap.y)) out.add(key(ap.x, ap.y));
    }
    return out;
  };
  const sweep = () => {
    for (let i = 0; i < 200; i++) {
      const plane = i % 2 === 0 ? 'surface' : 'rift:0';
      const x = Math.floor(r() * 520) - 10;
      const y = Math.floor(r() * 420) - 10;
      const reach = [4, 16, 40][i % 3]!;
      assert.deepEqual([...idx.near(plane, x, y, reach)].sort(), [...ref(plane, x, y, reach)].sort(), `query ${i}`);
    }
  };
  sweep();
  // Retire a third in place (the zone reload's rule) — they own nothing now.
  for (let i = 0; i < rows.length; i += 3) rows[i]!.active = false;
  for (let i = 0; i < posts.length; i += 3) posts[i]!.active = false;
  sweep();
  // Re-tenant fifty slots: the old row unfiles, the new one files.
  for (let i = 0; i < 50; i++) {
    const slot = Math.floor(r() * rows.length);
    idx.remove(rows[slot]);
    const row: Row = { active: true, plane: 'surface', patrol: [{ x: r() * 500, y: r() * 400 }], post: { x: r() * 500, y: r() * 400 } };
    rows[slot] = row;
    for (const p of row.patrol!) idx.add(row, p.x, p.y);
    idx.add(row, row.post!.x, row.post!.y);
  }
  sweep();
  idx.remove(undefined); // a never-filed slot is a no-op
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ByteReader, EntityKind, INTEREST_CHUNK_RADIUS, PoseState, decodeSnapshot, emptyChunk } from '@arx/shared';
import { GameServer } from './gameServer.js';
import * as interestSys from './interest.js';
import type { Session } from '../net/session.js';

/**
 * THE WATCHED WORLD'S DOORS (core audit 2026-09, Band A): the spatial
 * hash, the interest diff, the meta builder and the snapshot sender,
 * each called on the module DIRECTLY and through the class delegator
 * on one two-session slate — the enter/leave lists and the snapshot
 * BYTES pinned equal, and the wire shapes pinned literal.
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

interface SessionSlate {
  playerEid: number;
  knownChunks: Set<string>;
  knownEntities: Set<number>;
  sentSnapSig: Map<number, Int32Array>;
  lastCenterChunk: string | null;
  congested: boolean;
  json: Array<Record<string, unknown>>;
  bin: ArrayBuffer[];
  sendJson: (m: Record<string, unknown>) => void;
  sendBinary: (b: ArrayBuffer) => void;
}

/** The wire's first byte is the message type; the decoder reads the rest. */
function decode(buf: ArrayBuffer) {
  const r = new ByteReader(buf);
  r.u8();
  return decodeSnapshot(r);
}

function mkSession(playerEid: number): SessionSlate {
  const s: SessionSlate = {
    playerEid,
    knownChunks: new Set(),
    knownEntities: new Set(),
    sentSnapSig: new Map(),
    lastCenterChunk: null,
    congested: false,
    json: [],
    bin: [],
    sendJson: (m) => s.json.push(m),
    sendBinary: (b) => s.bin.push(b),
  };
  return s;
}

function worldSlate() {
  const positions = new Map<number, { plane: string; x: number; y: number; dir: number }>();
  const discoveries: number[] = [];
  const signs: Array<[number, number, number]> = [];
  const players = new Map<number, Record<string, unknown>>();
  const s = {
    positions: Object.assign(positions, { must: (e: number) => positions.get(e)! }),
    kinds: { must: (e: number) => (players.has(e) ? EntityKind.Player : EntityKind.ItemDrop) },
    players,
    npcs: new Map(),
    pets: new Map(),
    companions: new Map(),
    livestock: new Map(),
    actors: new Map(),
    drops: new Map<number, { item: string; qty: number; roll?: unknown }>(),
    projectiles: new Map(),
    summons: new Map(),
    graves: new Map(),
    healths: new Map<number, { hp: number; maxHp: number }>(),
    poses: new Map<number, number>(),
    characterEids: new Map(),
    dialoguesByActor: new Map(),
    chunks: new Map<string, Set<number>>(),
    entityChunk: new Map<number, string>(),
    tickCount: 77,
    planes: { require: () => ({ ensure: (cx: number, cy: number) => emptyChunk(cx, cy) }) },
    checkDiscoveries: (e: number) => discoveries.push(e),
    sendChunkSigns: (ses: SessionSlate, cx: number, cy: number) => signs.push([ses.playerEid, cx, cy]),
    statusBits: () => 0,
    // THE STUB WINS THE DOOR: the family's own doors stay the class's.
    chunkKeyOf: proto.chunkKeyOf,
    updateChunkMembership: proto.updateChunkMembership,
    removeFromChunks: proto.removeFromChunks,
    buildMeta: proto.buildMeta,
    npcAlertByte: proto.npcAlertByte,
  };
  const addPlayer = (eid: number, x: number, y: number, extra: Record<string, unknown> = {}) => {
    positions.set(eid, { plane: 'surface', x, y, dir: 0 });
    players.set(eid, { name: `P${eid}`, equipment: {}, lastProcessedSeq: eid * 10, ...extra });
    s.healths.set(eid, { hp: 10, maxHp: 20 });
    (s.updateChunkMembership as unknown as (this: unknown, e: number) => void).call(s, eid);
  };
  return { s: s as unknown as GameServer, raw: s, addPlayer, positions, discoveries, signs };
}

test('chunkKeyOf / membership direct: plane-first keys, one set per chunk, a move re-files the body, removal empties it', () => {
  const w = worldSlate();
  assert.equal(interestSys.chunkKeyOf(w.s, 'surface', 33, -1), 'surface|1,-1');
  assert.equal((proto.chunkKeyOf as Fn).call(w.s, 'surface' as never, 33 as never, -1 as never), 'surface|1,-1');
  w.addPlayer(1, 5, 5);
  assert.deepEqual([...w.raw.chunks.get('surface|0,0')!], [1]);
  w.positions.get(1)!.x = 40;
  interestSys.updateChunkMembership(w.s, 1);
  assert.deepEqual([...w.raw.chunks.get('surface|0,0')!], []);
  assert.deepEqual([...w.raw.chunks.get('surface|1,0')!], [1]);
  assert.equal(w.raw.entityChunk.get(1), 'surface|1,0');
  interestSys.removeFromChunks(w.s, 1);
  assert.equal(w.raw.entityChunk.has(1), false);
  assert.equal(w.raw.chunks.get('surface|1,0')!.size, 0);
});

test('buildMeta direct === delegator, and the player / drop wire shapes are literal', () => {
  const w = worldSlate();
  w.addPlayer(1, 5, 6, { equipment: { weapon: { id: 'bronze_sword', roll: { rar: 'common', seed: 1, pwr: 1, ench: 'keen' } }} });
  w.positions.set(9, { plane: 'surface', x: 2, y: 3, dir: 0 });
  w.raw.drops.set(9, { item: 'carrot', qty: 3 });
  const p = interestSys.buildMeta(w.s, 1);
  assert.deepEqual(p, {
    eid: 1,
    kind: EntityKind.Player,
    x: 5,
    y: 6,
    name: 'P1',
    appearance: {
      bodyColor: '',
      equip: { weapon: 'bronze_sword' },
      ench: { weapon: 'keen' },
      look: undefined,
      carry: undefined,
      carryOff: undefined,
      mount: undefined,
    },
  });
  assert.deepEqual((proto.buildMeta as Fn).call(w.s, 1 as never), p);
  const d = interestSys.buildMeta(w.s, 9);
  assert.deepEqual(d, { eid: 9, kind: EntityKind.ItemDrop, x: 2, y: 3, defId: 'carrot', qty: 3, roll: undefined });
  assert.deepEqual((proto.buildMeta as Fn).call(w.s, 9 as never), d);
});

test('updateInterest, two sessions: the window streams, both bodies enter, the far walk leaves, the hidden vanish', () => {
  const w = worldSlate();
  w.addPlayer(1, 5, 5);
  w.addPlayer(2, 40, 5);
  const a = mkSession(1);
  const b = mkSession(2);
  interestSys.updateInterest(w.s, a as unknown as Session);
  (proto.updateInterest as Fn).call(w.s, b as never);
  const side = (INTEREST_CHUNK_RADIUS * 2 + 1) ** 2;
  assert.equal(a.bin.length, side, 'every chunk of the window streamed once');
  assert.equal(b.bin.length, side);
  assert.deepEqual(w.discoveries, [1, 2]);
  assert.equal(w.signs.length, side * 2);
  const metaA = [...a.knownEntities].map((e) => interestSys.buildMeta(w.s, e));
  assert.deepEqual(a.json, [{ t: 'enter', entities: metaA }]);
  assert.deepEqual([...a.knownEntities].sort(), [1, 2]);
  assert.deepEqual([...b.knownEntities].sort(), [1, 2]);
  assert.equal(a.lastCenterChunk, '0,0');
  assert.equal(b.lastCenterChunk, '1,0');
  // A second pass on a still world sends nothing at all.
  a.json.length = 0;
  a.bin.length = 0;
  interestSys.updateInterest(w.s, a as unknown as Session);
  assert.deepEqual(a.json, []);
  assert.deepEqual(a.bin, []);
  assert.deepEqual(w.discoveries, [1, 2], 'no chunk crossing, no discovery check');
  // Player 2 walks past the hysteresis ring: a leave for A, and A's
  // signature row for 2 is dropped with it.
  a.sentSnapSig.set(2, Int32Array.of(0, 0, 0, 0, 0, 0, 0));
  w.positions.get(2)!.x = 32 * (INTEREST_CHUNK_RADIUS + 3);
  interestSys.updateChunkMembership(w.s, 2);
  interestSys.updateInterest(w.s, a as unknown as Session);
  assert.deepEqual(a.json, [{ t: 'leave', eids: [2] }]);
  assert.equal(a.sentSnapSig.has(2), false);
  // Back beside A, but hidden: A never sees 2 re-enter.
  w.positions.get(2)!.x = 6;
  interestSys.updateChunkMembership(w.s, 2);
  w.raw.players.get(2)!.hidden = true;
  a.json.length = 0;
  interestSys.updateInterest(w.s, a as unknown as Session);
  assert.deepEqual(a.json, []);
  // While 2's own session still carries itself.
  b.json.length = 0;
  (proto.updateInterest as Fn).call(w.s, b as never);
  assert.ok(b.knownEntities.has(2));
});

test('sendSnapshot direct === delegator (same bytes); THE QUIET WIRE and the congested socket', () => {
  const w = worldSlate();
  w.addPlayer(1, 5.25, 5.5);
  w.addPlayer(2, 8, 5);
  w.raw.poses.set(2, PoseState.Gather);
  w.raw.healths.get(2)!.hp = 1;
  const a = mkSession(1);
  a.knownEntities.add(1).add(2);
  const b = mkSession(1);
  b.knownEntities.add(1).add(2);
  interestSys.sendSnapshot(w.s, a as unknown as Session);
  (proto.sendSnapshot as Fn).call(w.s, b as never);
  assert.equal(a.bin.length, 1);
  assert.equal(Buffer.compare(Buffer.from(a.bin[0]!), Buffer.from(b.bin[0]!)), 0, 'the same bytes both ways');
  const snap = decode(a.bin[0]!);
  assert.equal(snap.serverTick, 77);
  assert.equal(snap.lastInputSeq, 10);
  assert.deepEqual(
    snap.entities.map((e) => [e.eid, e.pose, e.hpPct, e.status, e.alert]),
    [
      [1, PoseState.Idle, Math.round((10 / 20) * 255), 0, 0],
      [2, PoseState.Gather, 13, 0, 0],
    ],
  );
  assert.deepEqual([...a.sentSnapSig.keys()], [2], 'the own body never signs');
  // Unchanged rows go quiet; the own body always ships.
  interestSys.sendSnapshot(w.s, a as unknown as Session);
  const again = decode(a.bin[1]!);
  assert.deepEqual(again.entities.map((e) => e.eid), [1]);
  // A moved row speaks again.
  w.positions.get(2)!.x = 9;
  interestSys.sendSnapshot(w.s, a as unknown as Session);
  assert.deepEqual(decode(a.bin[2]!).entities.map((e) => e.eid), [1, 2]);
  // Backpressure: a congested socket gets no snapshot at all.
  a.congested = true;
  interestSys.sendSnapshot(w.s, a as unknown as Session);
  assert.equal(a.bin.length, 3);
  // A dead body rounds to the death byte; a bloodied one never to 0.
  w.raw.healths.get(2)!.hp = 0;
  const c = mkSession(1);
  c.knownEntities.add(2);
  interestSys.sendSnapshot(w.s, c as unknown as Session);
  assert.equal(decode(c.bin[0]!).entities[0]!.hpPct, 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile, candleInfo, destructibleInfo } from '@arx/shared';
import { FACTIONS } from '@arx/content';
import { GameServer } from './gameServer.js';
import { blowSmashes, smashPropsInArc } from './melee.js';

/**
 * BAND 8 ENGINE (L5, A2): THE WARD DEED + THE DELIBERATE CUT. The
 * thread is the Court's word strung across a wood; the cut is a deed
 * against the Court, chosen with a hand and not a swing, and the wood
 * re-strings it in ten minutes for everyone. Pinned here: the interact
 * on a WardThread floors it, credits evencourt the wardCut deed once,
 * stamps `ward_thread_cut`, gives nothing; a second thread credits
 * again; a melee arc through a thread leaves it standing; a shot reads
 * the same predicate; a candle is unchanged; the thread re-strings
 * after respawnSec; an NPC (no player eid) cannot cut.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

function fakeWorld(tiles: Record<string, Tile>) {
  const g = new Map<string, Tile>(Object.entries(tiles));
  return {
    g,
    ensure: () => {},
    groundAt: (x: number, y: number): Tile | undefined => g.get(`${x},${y}`) ?? Tile.Grass,
    setGround: (x: number, y: number, t: Tile): void => {
      g.set(`${x},${y}`, t);
    },
    portalAt: () => undefined,
    builtAt: () => undefined,
  };
}

function slate(tiles: Record<string, Tile>) {
  const w = fakeWorld(tiles);
  const deeds: Array<[string | null, string]> = [];
  const flags: string[] = [];
  const fx: Array<Record<string, unknown>> = [];
  const player = {
    characterId: 5,
    session: { sendJson: () => {} },
    flags: new Map<string, number>(),
    inventory: [] as unknown[],
  };
  const s = {
    players: new Map<number, unknown>([[1, player]]),
    positions: new Map<number, { plane: string; x: number; y: number }>([[1, { plane: 'surface', x: 10.5, y: 10.5 }]]),
    worldOf: () => w,
    setWorldTile: (_p: string, x: number, y: number, t: Tile) => w.setGround(x, y, t),
    broadcastFx: (_p: string, f: Record<string, unknown>) => fx.push(f),
    respawnQueue: [] as Array<{ at: number; tx: number; ty: number; tile: Tile; over?: Tile }>,
    creditDeed: (_pl: unknown, f: string | null, d: string) => deeds.push([f, d]),
    setPlayerFlag: (_pl: unknown, f: string) => flags.push(f),
    smashProp: proto.smashProp,
    cutWardThread: proto.cutWardThread,
    interact: proto.interact,
  };
  const interact = (eid: number, tx: number, ty: number): void => {
    proto.interact!.call(s, eid, tx, ty);
  };
  return { s, w, deeds, flags, fx, player, interact };
}

test('THE DELIBERATE CUT: the interact floors the thread, pays the deed once, stamps the flag, gives nothing', () => {
  const { w, deeds, flags, fx, player, interact } = slate({
    '11,10': Tile.WardThread,
    '11,11': Tile.Dirt, // the thread's `under`: the floor law reads ring 1
  });
  const before = Date.now();
  interact(1, 11, 10);
  assert.equal(w.groundAt(11, 10), Tile.Dirt, 'the tile floors to its under');
  assert.deepEqual(deeds, [['evencourt', 'wardCut']], 'THE WARD DEED, to the Court, once');
  assert.deepEqual(flags, ['ward_thread_cut']);
  assert.deepEqual(player.inventory, [], 'a cut yields nothing');
  assert.equal(fx.length, 1);
  assert.equal(fx[0]!.kind, 'smash');
  assert.equal(fx[0]!.id, 'thread');
  assert.equal(fx[0]!.radius, 0, 'the burst, not a shudder');
  // A second touch on the cut tile is nothing: the thread is gone.
  interact(1, 11, 10);
  assert.equal(deeds.length, 1);
  assert.equal(flags.length, 1);
  // The deed's value is the doc's, and the ladder's rhythm holds.
  assert.equal(FACTIONS.deeds.wardCut, -8);
  void before;
});

test('THE DELIBERATE CUT: a second thread credits again (every length is a deed)', () => {
  const { deeds, flags, interact } = slate({ '11,10': Tile.WardThread, '10,11': Tile.WardThread });
  interact(1, 11, 10);
  interact(1, 10, 11);
  assert.deepEqual(deeds, [
    ['evencourt', 'wardCut'],
    ['evencourt', 'wardCut'],
  ]);
  // The flag stamps each time at this door; the choke dedupes a held flag.
  assert.deepEqual(flags, ['ward_thread_cut', 'ward_thread_cut']);
});

test('THE DELIBERATE CUT: the thread re-strings after respawnSec for everyone', () => {
  const { s, interact } = slate({ '11,10': Tile.WardThread, '11,11': Tile.Dirt });
  const now = Date.now();
  interact(1, 11, 10);
  assert.equal(s.respawnQueue.length, 1);
  const e = s.respawnQueue[0]!;
  const info = destructibleInfo(Tile.WardThread)!;
  assert.equal(info.respawnSec, 600, 'ten minutes, the shared table');
  assert.equal(e.tile, Tile.WardThread, 'the thread stands back up');
  assert.equal(e.over, Tile.Dirt, 'only over the floor the cut left');
  assert.ok(Math.abs(e.at - (now + 600_000)) < 2_000);
});

test('THE DELIBERATE CUT: a melee arc through a thread leaves it standing; the barrel beside it bursts', () => {
  const w = fakeWorld({ '11,10': Tile.WardThread, '12,10': Tile.Barrel });
  const hits: Array<[number, number, Tile]> = [];
  const srv = {
    worldOf: () => w,
    hitProp: (_p: string, tx: number, ty: number, tile: Tile) => hits.push([tx, ty, tile]),
  };
  smashPropsInArc(srv as never, { plane: 'surface' as never, x: 10.5, y: 10.5 }, 0, 2.5);
  assert.deepEqual(hits, [[12, 10, Tile.Barrel]], 'the swing passes through the thread');
  assert.equal(w.groundAt(11, 10), Tile.WardThread);
});

test("THE DELIBERATE CUT: the arrow's last act reads the same predicate (blowSmashes)", () => {
  assert.equal(blowSmashes(destructibleInfo(Tile.WardThread)!), false);
  assert.equal(blowSmashes(destructibleInfo(Tile.Barrel)!), true);
  assert.equal(blowSmashes(destructibleInfo(Tile.Crate)!), true);
});

test('THE DELIBERATE CUT: a candle is unchanged by the new case (the wick still answers first)', () => {
  const candle = (Object.values(Tile) as unknown[]).find(
    (t): t is Tile => typeof t === 'number' && candleInfo(t) !== null,
  )!;
  const { w, deeds, flags, fx, interact } = slate({ '11,10': candle });
  interact(1, 11, 10);
  assert.notEqual(w.groundAt(11, 10), candle, 'the wick flipped');
  assert.equal(fx[0]!.kind, 'candle');
  assert.deepEqual(deeds, []);
  assert.deepEqual(flags, []);
});

test('THE DELIBERATE CUT: an NPC cannot cut (no player, no hand), and reach still holds', () => {
  const { w, deeds, interact } = slate({ '11,10': Tile.WardThread, '20,10': Tile.WardThread });
  interact(2, 11, 10); // eid 2 is no player
  assert.equal(w.groundAt(11, 10), Tile.WardThread);
  assert.deepEqual(deeds, []);
  interact(1, 20, 10); // out of reach: silent
  assert.equal(w.groundAt(20, 10), Tile.WardThread);
  assert.deepEqual(deeds, []);
});

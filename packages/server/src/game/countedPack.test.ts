import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameServer, type NpcComp } from './gameServer.js';

/**
 * BAND 8 FIX PASS (engine): three laws the live audit wrote.
 *   - THE COUNTED PACK: a `passive` placement (ZoneSpawn.passive) has
 *     no eye for a player (npcPerception skips the player scan; the
 *     feud scan stays the world's) and the unforced aggro door refuses
 *     a player target; a packmate's rally and a blow (`force`) pass.
 *   - THE UNWATCHED SQUAT STEPS OFF: keepSpawnHours removes an
 *     off-window body nobody is within 20 of WHATEVER its state (the
 *     old idle-only rule kept Old Cackle among the re-stood dead all
 *     night); a watched body never vanishes in front of anyone.
 *   (The review's third guess, a same-tile pair reading as blind to
 *   each other, was checked against sightLine and refuted: a
 *   zero-length ray is clear by its first line. Old Cackle's night
 *   among the dead is the unwatched step-off's to end, above, and the
 *   Struck Sergeant now carries his levelOffset.)
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

const npcOf = (over: Partial<NpcComp> = {}): NpcComp =>
  ({
    def: { id: 'wolf', damage: 4, aggroRange: 6, leashRange: 28, radius: 0.35 },
    originX: 5,
    originY: 5,
    state: 'idle',
    targetEid: null,
    spawnIndex: 0,
    ...over,
  }) as unknown as NpcComp;

test('THE COUNTED PACK: a passive body scans no player, and its unforced aggro door refuses one', () => {
  let playerScans = 0;
  let feudScans = 0;
  const s = {
    npcPerceivePlayers: () => { playerScans++; return true; },
    npcPerceiveNpcs: () => { feudScans++; },
  };
  const pos = { plane: 'surface', x: 5.5, y: 5.5, dir: 0 };
  proto.npcPerception!.call(s, 1, npcOf({ passive: true }), pos);
  assert.deepEqual([playerScans, feudScans], [0, 1], 'no player scan; the feud scan is still the world\'s');
  proto.npcPerception!.call(s, 2, npcOf(), pos);
  assert.deepEqual([playerScans, feudScans], [1, 1], 'a plain body scans players first (and stops there when it finds one)');

  // The aggro door: a passive body never opens on a player unforced;
  // a rally or a blow walks through (the door then reads the ledger,
  // which this slate does not carry — the throw is the proof it got
  // past the passive line).
  const door = {
    pets: new Map(), companions: new Map(), livestock: new Map(),
    players: new Map([[9, {}]]),
  };
  const passive = npcOf({ passive: true });
  proto.npcAggro!.call(door, 1, passive, 9);
  assert.equal(passive.state, 'idle', 'unforced: refused before any state change');
  for (const opts of [{ rally: true }, { force: true }]) {
    assert.throws(() => proto.npcAggro!.call(door, 1, passive, 9, opts), 'a rally or a blow passes the passive line (and reaches the ledger this slate lacks)');
  }
  const plain = npcOf();
  assert.throws(() => proto.npcAggro!.call(door, 1, plain, 9), 'a plain body walks straight to the ledger');
});

test('THE UNWATCHED SQUAT STEPS OFF: an off-window body nobody is near steps off whatever its state; a watched one stays', () => {
  const destroyed: number[] = [];
  const mk = (eid: number, state: string, near: boolean) => ({
    spawnPoints: [{ hours: { from: 5.5, to: 20.5 }, active: true, eid, respawnAt: 7 }],
    npcs: new Map([[eid, npcOf({ state: state as NpcComp['state'] })]]),
    positions: new Map([[eid, { plane: 'surface', x: 1, y: 1 }]]),
    playerWithin: () => near,
    removeFromChunks: () => {},
    ecs: { destroy: (e: number) => destroyed.push(e) },
  });
  // 21:00: the gnoll window is shut.
  const chasing = mk(11, 'chase', false);
  proto.keepSpawnHours!.call(chasing, 21);
  assert.deepEqual(destroyed, [11], 'a chasing body nobody watches steps off');
  assert.equal(chasing.spawnPoints[0]!.eid, null);
  assert.equal(chasing.spawnPoints[0]!.respawnAt, 0);
  const watched = mk(12, 'chase', true);
  proto.keepSpawnHours!.call(watched, 21);
  assert.deepEqual(destroyed, [11], 'a body a character can see never vanishes in front of them');
  const inWindow = mk(13, 'idle', false);
  proto.keepSpawnHours!.call(inWindow, 12);
  assert.deepEqual(destroyed, [11], 'inside its window a body stands');
});

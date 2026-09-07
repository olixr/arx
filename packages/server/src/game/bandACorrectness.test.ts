import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EcsWorld, Tile, doorInfo, openChestTile } from '@arx/shared';
import { GameServer } from './gameServer.js';
import { PLAYER_COMMANDS } from './commands/playerCommands.js';
import { tickStatuses } from './statuses.js';

/**
 * BAND A — THE BODY IS ONE (core audit 2026-09, server correctness).
 * Slates over GameServer.prototype pin the five small laws this band
 * closes: /lock refuses a boot-seeded authored key; a CC immunity
 * record dies with its body; the rank-IV fang dare stays on its own
 * plane; a plane crossing zeroes the whole swing state; the chest
 * reclose entry carries `over` so the tick's stomp guard applies.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;

test('/lock refuses an authored lock and toggles a plain one', () => {
  const sent: string[] = [];
  const doorLocks = new Set<string>();
  const authoredLockKeys = new Set<string>();
  const srv = {
    positions: new Map([[1, { plane: 'surface', x: 10.5, y: 10.5, dir: 0 }]]),
    worldOf: () => ({
      groundAt: (x: number, y: number) => (x === 11 && y === 10 ? Tile.DoorwayWoodShut : Tile.Grass),
    }),
    doorUnit: (_p: string, tx: number, ty: number) => ({ ax: tx, ay: ty, tiles: [{ x: tx, y: ty }] }),
    doorLocks,
    authoredLockKeys,
  };
  const player = { session: { sendJson: (m: { text: string }) => sent.push(m.text) } };
  const cmd = PLAYER_COMMANDS.find((c) => c.name === '/lock')!;
  assert.ok(doorInfo(Tile.DoorwayWoodShut) && !doorInfo(Tile.DoorwayWoodShut)!.open);
  const key = 'surface|11,10';
  // THE AUTHORED KEYS: the seeded lock is not the player's to work.
  doorLocks.add(key);
  authoredLockKeys.add(key);
  cmd.run(srv as never, 1, player as never, '/lock');
  assert.ok(doorLocks.has(key), 'the authored lock survives the word');
  assert.equal(sent.at(-1), 'This lock answers to a key you do not carry.');
  // Picked or keyed open, the authored door is still not the player's to re-lock.
  doorLocks.delete(key);
  cmd.run(srv as never, 1, player as never, '/lock');
  assert.ok(!doorLocks.has(key), 'the opened authored door stays open');
  assert.equal(sent.at(-1), 'This lock was set by another hand — opened, it stays open.');
  doorLocks.add(key);
  // A plain door still answers: shut, then open.
  authoredLockKeys.clear();
  cmd.run(srv as never, 1, player as never, '/lock');
  assert.ok(!doorLocks.has(key));
  assert.equal(sent.at(-1), 'The lock clicks open.');
  cmd.run(srv as never, 1, player as never, '/lock');
  assert.ok(doorLocks.has(key));
  assert.equal(sent.at(-1), 'The lock snaps shut.');
});

test('ccImmunity is an ECS store: the record dies with the body', () => {
  const ecs = new EcsWorld();
  const statuses = ecs.register<Array<{ id: string; power: number; ticksLeft: number; sourceEid: number }>>();
  const ccImmunity = ecs.register<Partial<Record<string, number>>>();
  const healths = ecs.register<{ hp: number; maxHp: number }>();
  const npcs = ecs.register<unknown>();
  const eid = ecs.create();
  npcs.set(eid, {});
  healths.set(eid, { hp: 10, maxHp: 10 });
  // A root on its last tick: the page authors immunityTicks 120, so the
  // expiry stamps the window on the body.
  statuses.set(eid, [{ id: 'root', power: 1, ticksLeft: 1, sourceEid: 99 }]);
  const srv = { statuses, ccImmunity, healths, npcs, pets: ecs.register(), players: ecs.register(), tickCount: 500 };
  tickStatuses(srv as never);
  assert.ok(ccImmunity.has(eid), 'the lock lifting stamps the window');
  assert.equal(ccImmunity.get(eid)!.root, 620);
  ecs.destroy(eid);
  assert.equal(ccImmunity.has(eid), false, 'destroy clears the registered store');
  // The class field itself is the registered store, not a bare Map.
  const src = readFileSync(new URL('./gameServer.ts', import.meta.url), 'utf8');
  assert.match(src, /\bccImmunity\s*=\s*this\.ecs\s*\.register\b/);
  assert.doesNotMatch(src, /\bccImmunity\s*=\s*new Map\b/);
});

test('the rank-IV fang dare stays on its own plane', () => {
  const aggro: number[] = [];
  const def = { damage: 3, radius: 0.4 };
  const npcs = new Map([
    [10, { def }], // the mark, surface, in the cone
    [11, { def }], // beside the mark, surface — dared
    [12, { def }], // the same x,y under the meadow — not dared
  ]);
  const positions = new Map([
    [1, { plane: 'surface', x: 10, y: 10, dir: 0 }],
    [5, { plane: 'surface', x: 10, y: 10.8, dir: 0 }],
    [10, { plane: 'surface', x: 13, y: 10, dir: 0 }],
    [11, { plane: 'surface', x: 14, y: 10, dir: 0 }],
    [12, { plane: 'under', x: 14, y: 10, dir: 0 }],
  ]);
  const healths = new Map([[5, { hp: 10, maxHp: 10 }], [10, { hp: 10, maxHp: 10 }], [11, { hp: 10, maxHp: 10 }], [12, { hp: 10, maxHp: 10 }]]);
  const pet = { target: null as number | null };
  const srv = {
    positions,
    npcs,
    healths,
    pets: new Map([[5, pet]]),
    companions: new Map(),
    actors: new Map(),
    tickCount: 1,
    sendCooldowns: () => {},
    payKeeperCast: () => {},
    npcAggro: (npcEid: number) => aggro.push(npcEid),
    broadcastFx: () => {},
    // The dare reads bodies by chunk now; the slate has no index, so it
    // answers the walk itself — plane-first, as the index is.
    forEachNpcNear(
      this: { npcs: Map<number, { def: typeof def }>; positions: Map<number, { plane: string; x: number; y: number; dir: number }> },
      plane: string,
      _x: number,
      _y: number,
      _r: number,
      fn: (eid: number, npc: { def: typeof def }, pos: { x: number; y: number }) => boolean | void,
    ): void {
      for (const [eid, npc] of this.npcs) {
        const pos = this.positions.get(eid);
        if (pos && pos.plane === plane && fn(eid, npc, pos) === true) return;
      }
    },
  };
  const player = { session: null, pets: [{ state: 'heel', name: 'Fang' }], petEid: 5 };
  const ab = { id: 'fang_dare', shape: 'pet_command', command: 'fang', range: 7, radius: 3, color: 0 };
  proto.tryKeeperArt!.call(srv, 1, player, 0, ab, 0);
  assert.equal(pet.target, 10, 'the friend takes the mark');
  assert.deepEqual(aggro.sort(), [10, 11], 'the dare carries beside the mark, never through the floor');
});

test('transferPlane zeroes the whole swing state, not just the windup', () => {
  const positions = new Map([[1, { plane: 'surface', x: 10, y: 10, dir: 0 }]]);
  const player = {
    session: null,
    inputQueue: [],
    pendingStrike: { at: 1 },
    offhandEchoTicks: 2,
    offhandEchoAim: 1.2,
    attackBufferedUntilTick: 40,
    mountId: null,
  };
  const srv = {
    positions,
    players: new Map([[1, player]]),
    pets: new Map(),
    companions: new Map(),
    planes: { defOf: () => ({ underground: true, persistent: false }) },
    cancelAction: () => {},
    cancelCasting: () => {},
    standUp: () => {},
    dialogueClose: () => {},
    dismount: () => {},
    updateChunkMembership: () => {},
    teleport: () => assert.fail('a crossing is not a teleport'),
  };
  proto.transferPlane!.call(srv, 1, 'under', 3, 4);
  assert.equal(positions.get(1)!.plane, 'under');
  assert.equal(player.pendingStrike, null);
  assert.equal(player.offhandEchoTicks, 0, 'no echo fires on the far side');
  assert.equal(player.offhandEchoAim, 0);
  assert.equal(player.attackBufferedUntilTick, 0, 'no buffered press lands on the far side');
});

test('the chest reclose entry carries `over` so a redrawn floor stands', () => {
  const respawnQueue: Array<{ tile: Tile; over?: Tile }> = [];
  const set: Tile[] = [];
  const srv = {
    positions: new Map([[1, { plane: 'surface', x: 10.5, y: 11.5, dir: 0 }]]),
    poiChests: new Map(),
    dungeons: new Map(),
    players: new Map(),
    liveDangerTier: () => 0,
    dungeonPowerOn: () => null,
    placeDrop: () => {},
    setWorldTile: (_p: string, _x: number, _y: number, t: Tile) => set.push(t),
    respawnQueue,
    townFactionAt: () => null,
    speak: () => assert.fail('a plain wood chest opens without a word'),
  };
  const player = { session: null, characterId: 5, inventory: [] };
  proto.interactChest!.call(srv, 1, player, 10, 10, { kind: 'wood', open: false }, () => {});
  assert.deepEqual(set, [openChestTile('wood')]);
  assert.equal(respawnQueue.length, 1);
  assert.equal(respawnQueue[0]!.over, openChestTile('wood'), 'the reclose only stomps the open lid');
});

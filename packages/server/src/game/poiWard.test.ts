import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, npcLivestock } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE WARD's laws, pinned: a warded POI chest opens when every FIGHTING
 * garrison body is down — livestock (the stolen cows) never hold it —
 * and a full wipe grants the whole site one grace window so the clear
 * can actually be looted. The checks are private GameServer methods
 * over plain maps, so they run here against a hand-built slate.
 */

type WardFn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  poiGarrisonStands: WardFn;
  notePoiKill: WardFn;
  poiSpawnFights: WardFn;
};
const GRACE_MS =
  (GameServer as unknown as { POI_RESPAWN_MIN_SEC: number }).POI_RESPAWN_MIN_SEC * 1000;

interface FakeSpawn {
  npc: string;
  eid: number | null;
  respawnAt: number;
  active: boolean;
}

/** The minimal GameServer slate the ward methods actually touch. */
function slate(spawns: FakeSpawn[]) {
  const cleared: Array<[number, number]> = [];
  return {
    spawnPoints: spawns,
    poiLive: new Map([['3,4', { spawnIdx: spawns.map((_, i) => i) }]]),
    poiSpawnCells: new Map(spawns.map((_, i) => [i, '3,4'])),
    poiLedger: new Map([['3,4', { epoch: 0, site: null, clearedAt: null as number | null }]]),
    players: new Map(),
    accounts: { markPoiCleared: (cx: number, cy: number) => cleared.push([cx, cy]) },
    poiSpawnFights: proto.poiSpawnFights,
    cleared,
  };
}

const brigand = (over: Partial<FakeSpawn> = {}): FakeSpawn => ({
  npc: 'brigand',
  eid: null,
  respawnAt: 0,
  active: true,
  ...over,
});
const cow = (over: Partial<FakeSpawn> = {}): FakeSpawn => ({
  npc: 'cow',
  eid: null,
  respawnAt: 0,
  active: true,
  ...over,
});

test('livestock law: kept animals and harmless critters, nothing that fights', () => {
  assert.equal(npcLivestock(NPCS.get('cow')!), true); // produce (milk)
  assert.equal(npcLivestock(NPCS.get('chicken')!), true); // lays (eggs)
  assert.equal(npcLivestock(NPCS.get('brigand')!), false);
  assert.equal(npcLivestock(NPCS.get('troll')!), false);
  // The bear: real damage, provoked-only aggro — a keeper, not a cow.
  assert.equal(npcLivestock(NPCS.get('bear')!), false);
});

test('the stolen cows never hold the ward', () => {
  const s = slate([brigand(), cow({ eid: 11 }), cow({ eid: 12 })]);
  assert.equal(proto.poiGarrisonStands.call(s, '3,4'), false);
});

test('the ward holds while any fighting body stands', () => {
  const s = slate([brigand({ eid: 9 }), cow({ eid: 11 })]);
  assert.equal(proto.poiGarrisonStands.call(s, '3,4'), true);
});

test('no wipe while a fighter still stands — nothing stamps, no clocks move', () => {
  const s = slate([brigand(), brigand({ eid: 9 }), cow({ eid: 11 })]);
  proto.notePoiKill.call(s, 0);
  assert.equal(s.cleared.length, 0);
  assert.equal(s.poiLedger.get('3,4')!.clearedAt, null);
  assert.equal(s.spawnPoints[0]!.respawnAt, 0);
});

test('the wipe stamps the clear and aligns the garrison to one grace window', () => {
  const soon = Date.now() + 35_000; // the bestiary's own short clock
  const s = slate([
    brigand({ respawnAt: soon }),
    brigand({ respawnAt: soon }),
    cow({ eid: 11 }), // still grazing — the ward opens over her objection
  ]);
  const before = Date.now();
  proto.notePoiKill.call(s, 1);
  assert.deepEqual(s.cleared, [[3, 4]]);
  const row = s.poiLedger.get('3,4')!;
  assert.ok(row.clearedAt !== null && row.clearedAt >= before);
  // Every downed fighter waits out the full grace from the wipe moment.
  for (const i of [0, 1]) {
    assert.ok(
      s.spawnPoints[i]!.respawnAt >= before + GRACE_MS,
      `spawn ${i} respawns before the grace window ends`,
    );
  }
  // The cow keeps her own life entirely.
  assert.equal(s.spawnPoints[2]!.respawnAt, 0);
});

test('a wipe never pulls an already-longer clock earlier', () => {
  const far = Date.now() + GRACE_MS * 3;
  const s = slate([brigand({ respawnAt: far })]);
  proto.notePoiKill.call(s, 0);
  assert.equal(s.spawnPoints[0]!.respawnAt, far);
});

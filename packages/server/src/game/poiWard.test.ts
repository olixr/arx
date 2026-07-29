import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER, NPCS, npcLivestock } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE WARD's laws, pinned: a warded POI chest opens when every FIGHTING
 * garrison body is down — livestock (the stolen cows) never hold it.
 * And THE EMBER LAW's first half (the living frontier): a wiped
 * procedural site stands its garrison down for good and takes an ember
 * clock; only AUTHORED landmarks keep the old covenant — one grace
 * window, then the veil's den musters anew. The checks are private
 * GameServer methods over plain maps, so they run here against a
 * hand-built slate.
 */

type WardFn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  poiGarrisonStands: WardFn;
  notePoiKill: WardFn;
  poiSpawnFights: WardFn;
  standDownGarrison: WardFn;
  stampCalm: WardFn;
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
function slate(spawns: FakeSpawn[], opts: { authored?: boolean } = {}) {
  const cleared: Array<[number, number, number | null]> = [];
  return {
    spawnPoints: spawns,
    poiLive: new Map([['3,4', { spawnIdx: spawns.map((_, i) => i) }]]),
    poiSpawnCells: new Map(spawns.map((_, i) => [i, '3,4'])),
    poiLedger: new Map([
      [
        '3,4',
        {
          epoch: 0,
          site: null,
          clearedAt: null as number | null,
          emberUntil: null as number | null,
          fallowUntil: null as number | null,
          stage: 0,
          stageAt: null as number | null,
          originCell: null as string | null,
        },
      ],
    ]),
    players: new Map(),
    frontierCalm: new Map<string, number>(),
    accounts: {
      markPoiCleared: (cx: number, cy: number, ember: number | null = null) =>
        cleared.push([cx, cy, ember]),
      stampFrontierCalm: () => {},
      setPoiEmber: () => {},
    },
    authoredCells: () => (opts.authored ? new Map([['3,4', 'test_site']]) : new Map()),
    poiSpawnFights: proto.poiSpawnFights,
    standDownGarrison: proto.standDownGarrison,
    stampCalm: proto.stampCalm,
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
  const row = s.poiLedger.get('3,4')!;
  assert.equal(row.clearedAt, null);
  assert.equal(row.emberUntil, null);
  assert.equal(s.spawnPoints[0]!.active, true);
});

test('THE EMBER LAW: a procedural wipe stands the garrison down for good', () => {
  const s = slate([
    brigand({ respawnAt: Date.now() + 35_000 }),
    brigand({ respawnAt: Date.now() + 35_000 }),
    cow({ eid: 11 }), // still grazing — freed livestock keep their lives
  ]);
  const before = Date.now();
  proto.notePoiKill.call(s, 1);
  const row = s.poiLedger.get('3,4')!;
  assert.ok(row.clearedAt !== null && row.clearedAt >= before);
  // The fighting spawns are deactivated — the camp NEVER restaffs.
  assert.equal(s.spawnPoints[0]!.active, false);
  assert.equal(s.spawnPoints[1]!.active, false);
  assert.equal(s.spawnPoints[2]!.active, true); // the cow grazes on
  // The ember clock is stamped, within the FRONTIER linger band, and
  // rides to the DB alongside the clear.
  const [lo, hi] = FRONTIER.emberLingerMs;
  assert.ok(row.emberUntil !== null && row.emberUntil >= before + lo && row.emberUntil <= Date.now() + hi);
  assert.equal(s.cleared.length, 1);
  assert.deepEqual(s.cleared[0]!.slice(0, 2), [3, 4]);
  assert.equal(s.cleared[0]![2], row.emberUntil);
  // The broken ward stays broken.
  assert.equal(proto.poiGarrisonStands.call(s, '3,4'), false);
  // And the wipe buys the valley its relax window.
  assert.ok((s.frontierCalm.get('3,4') ?? 0) > Date.now());
});

test('authored landmarks keep the old covenant: grace window, no ember', () => {
  const soon = Date.now() + 35_000; // the bestiary's own short clock
  const s = slate(
    [brigand({ respawnAt: soon }), brigand({ respawnAt: soon }), cow({ eid: 11 })],
    { authored: true },
  );
  const before = Date.now();
  proto.notePoiKill.call(s, 1);
  const row = s.poiLedger.get('3,4')!;
  assert.ok(row.clearedAt !== null && row.clearedAt >= before);
  assert.equal(row.emberUntil, null);
  assert.equal(s.cleared[0]![2], null); // no ember rides to the DB
  // Every downed fighter waits out the full grace, then stands anew.
  for (const i of [0, 1]) {
    assert.equal(s.spawnPoints[i]!.active, true);
    assert.ok(
      s.spawnPoints[i]!.respawnAt >= before + GRACE_MS,
      `spawn ${i} respawns before the grace window ends`,
    );
  }
  assert.equal(s.spawnPoints[2]!.respawnAt, 0); // the cow keeps her own life
});

test('an authored wipe never pulls an already-longer clock earlier', () => {
  const far = Date.now() + GRACE_MS * 3;
  const s = slate([brigand({ respawnAt: far })], { authored: true });
  proto.notePoiKill.call(s, 0);
  assert.equal(s.spawnPoints[0]!.respawnAt, far);
});

test('SOURCE-AND-KILL-SWITCH: breaking a core scatters its satellites without pay', () => {
  const s = slate([brigand(), brigand()]);
  // A standing satellite family: two live satellite rows point at '3,4'.
  const satSpawn = { npc: 'brigand', eid: 7, respawnAt: 0, active: true };
  (s as unknown as { spawnPoints: unknown[] }).spawnPoints.push(satSpawn);
  s.poiLive.set('4,4', { spawnIdx: [2] });
  s.poiLedger.set('4,4', {
    epoch: 0,
    site: {
      cellX: 4, cellY: 4, epoch: 0, tier: 2,
      defId: 'bandit_camp', prefabId: 'poi_bandit_hollow',
      anchorX: 576, anchorY: 576,
    } as never,
    clearedAt: null,
    emberUntil: null,
    fallowUntil: null,
    stage: 0,
    stageAt: null,
    originCell: '3,4',
  });
  const before = Date.now();
  proto.notePoiKill.call(s, 0);
  const sat = s.poiLedger.get('4,4')!;
  // The satellite took a scatter ember: clock set, NO clear stamped —
  // its later dissolve banks nothing (one clear is one victory).
  assert.ok(sat.emberUntil !== null && sat.emberUntil > before);
  assert.equal(sat.clearedAt, null);
  // Its garrison stood down with the family.
  assert.equal(satSpawn.active, false);
});

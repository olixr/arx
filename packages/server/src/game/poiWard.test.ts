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
    // setPlayerFlag re-answers quest availability at the choke point;
    // the slate has no quest registry, so the answer is a no-op.
    pushQuestAvail: () => {},
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

// ---------------------------------------------------------------- Phase 3

const proto3 = GameServer.prototype as unknown as {
  notePoiKill: WardFn;
  payBounty: WardFn;
  setPlayerFlag: WardFn;
  clearPlayerFlag: WardFn;
};

interface FakePlayer {
  characterId: number;
  raidCalmUntil: number;
  flags: Map<string, number>;
  inventory: Array<{ item: string; qty: number } | null>;
  session: { sendJson: (m: { t: string; text?: string }) => void } | null;
}

function fakePlayer(characterId: number, msgs: string[]): FakePlayer {
  return {
    characterId,
    raidCalmUntil: 0,
    flags: new Map(),
    inventory: new Array<null>(28).fill(null),
    session: {
      sendJson: (m) => {
        if (m.t === 'chat' && m.text) msgs.push(m.text);
      },
    },
  };
}

test('THE PARTICIPATION LEDGER: every hand that bled the garrison gets the credit', () => {
  const s = slate([brigand(), brigand({ respawnAt: Date.now() + 35_000 })]);
  s.poiLedger.get('3,4')!.site = {
    cellX: 3, cellY: 4, epoch: 0, tier: 2,
    defId: 'goblin_warcamp', prefabId: 'poi_goblin_camp_ring',
    anchorX: 448, anchorY: 576,
  } as never;
  const msgsA: string[] = [];
  const msgsB: string[] = [];
  const a = fakePlayer(101, msgsA); // the last blow
  const b = fakePlayer(102, msgsB); // bled it earlier, from the ledger
  b.flags.set('bounty:3,4', 1); // and carries the bounty mark
  const arts: Array<[number, string]> = [];
  const flagWrites: Array<[number, string]> = [];
  const cleared: Array<[number, string]> = [];
  Object.assign(s, {
    players: new Map([[11, a], [12, b]]),
    positions: new Map([[11, { x: 448, y: 576 }], [12, { x: 449, y: 576 }]]),
    characterEids: new Map([[101, 11], [102, 12]]),
    grantArt: (p: FakePlayer, art: string) => arts.push([p.characterId, art]),
    spawnDrop: () => {},
    payBounty: proto3.payBounty,
    setPlayerFlag: proto3.setPlayerFlag,
    clearPlayerFlag: proto3.clearPlayerFlag,
  });
  s.accounts = {
    ...s.accounts,
    setFlag: (cid: number, flag: string) => flagWrites.push([cid, flag]),
    clearFlag: (cid: number, flag: string) => cleared.push([cid, flag]),
  } as never;
  (s.poiLive.get('3,4') as { fighters?: Set<number> }).fighters = new Set([102]);
  proto3.notePoiKill.call(s, 0, 11);
  // Both participants: cleared flag, the line, the deed-art.
  assert.equal(a.flags.has('poi_warcamp_broken'), true);
  assert.equal(b.flags.has('poi_warcamp_broken'), true);
  assert.ok(msgsA.some((t) => t.includes('is broken')));
  assert.ok(msgsB.some((t) => t.includes('is broken')));
  assert.deepEqual(arts.map(([cid]) => cid).sort(), [101, 102]);
  // Only the marked hand is paid — and exactly once, mark lifted.
  const coinsOf = (p: FakePlayer) =>
    p.inventory.reduce((n, sl) => n + (sl?.item === 'coins' ? sl.qty : 0), 0);
  assert.equal(coinsOf(a), 0, 'no mark, no purse');
  const paid = coinsOf(b);
  assert.ok(paid >= 60 && paid <= 110, `tier-2 purse pays 60..110, got ${paid}`);
  assert.equal(b.flags.has('bounty:3,4'), false);
  assert.deepEqual(cleared, [[102, 'bounty:3,4']]);
  assert.ok(msgsB.some((t) => t.includes('bounty is honored')));
});

test('the purse scales with the boldness rung the camp died at', () => {
  const s = slate([brigand()]);
  const row = s.poiLedger.get('3,4')!;
  row.site = {
    cellX: 3, cellY: 4, epoch: 0, tier: 2,
    defId: 'goblin_warcamp', prefabId: 'poi_goblin_camp_ring',
    anchorX: 448, anchorY: 576,
  } as never;
  row.stage = 2;
  const msgs: string[] = [];
  const p = fakePlayer(0, msgs); // guest: nothing persists, coin still lands
  p.flags.set('bounty:3,4', 1);
  Object.assign(s, {
    positions: new Map([[11, { x: 448, y: 576 }]]),
    spawnDrop: () => {},
    clearPlayerFlag: proto3.clearPlayerFlag,
  });
  (proto3.payBounty as (...a: unknown[]) => void).call(s, 11, p, '3,4', row);
  const paid = p.inventory.reduce((n, sl) => n + (sl?.item === 'coins' ? sl.qty : 0), 0);
  assert.ok(paid >= 180 && paid <= 330, `stage-2 triples the tier-2 purse, got ${paid}`);
});

test('SOURCE-AND-KILL-SWITCH both ways: breaking the toll scatters the family', () => {
  // '3,4' holds the TOLL; its core '5,5' stands with a satellite '5,6'.
  const s = slate([brigand(), brigand()]);
  const mkSite = (cx: number, cy: number, defId: string) => ({
    cellX: cx, cellY: cy, epoch: 0, tier: 2,
    defId, prefabId: 'poi_bandit_toll',
    anchorX: cx * 128 + 64, anchorY: cy * 128 + 64,
  });
  const tollRow = s.poiLedger.get('3,4')!;
  tollRow.site = mkSite(3, 4, 'road_toll') as never;
  tollRow.originCell = '5,5';
  s.poiLedger.set('5,5', {
    epoch: 0, site: mkSite(5, 5, 'goblin_warcamp') as never,
    clearedAt: null, emberUntil: null, fallowUntil: null,
    stage: 3, stageAt: 0, originCell: null,
  });
  s.poiLedger.set('5,6', {
    epoch: 0, site: mkSite(5, 6, 'goblin_warcamp') as never,
    clearedAt: null, emberUntil: null, fallowUntil: null,
    stage: 0, stageAt: null, originCell: '5,5',
  });
  const before = Date.now();
  proto3.notePoiKill.call(s, 0);
  // The toll itself cleared properly (ember + clearedAt = a real victory)...
  assert.ok(tollRow.clearedAt !== null && tollRow.emberUntil !== null);
  // ...and the family lost its nerve: core and satellite scatter
  // unpaid (ember set, NO clear stamped — their dissolves bank nothing).
  for (const key of ['5,5', '5,6']) {
    const r = s.poiLedger.get(key)!;
    assert.ok(r.emberUntil !== null && r.emberUntil > before, `${key} must scatter`);
    assert.equal(r.clearedAt, null, `${key} scatter is not a clear`);
  }
});

test('THE HEARTH WATCH: breaking the squat stamps the settler the full quiet', () => {
  const s = slate([brigand(), brigand()]);
  const row = s.poiLedger.get('3,4')!;
  row.site = {
    cellX: 3, cellY: 4, epoch: 0, tier: 1,
    defId: 'raider_squat', prefabId: 'poi_raider_squat',
    anchorX: 448, anchorY: 576,
  } as never;
  row.originCell = 'hearth:101';
  const msgs: string[] = [];
  const stamps: Array<[number, number]> = [];
  const owner = fakePlayer(101, msgs);
  Object.assign(s, {
    players: new Map([[11, owner]]),
    positions: new Map([[11, { x: 448, y: 576 }]]),
    characterEids: new Map([[101, 11]]),
    grantArt: () => {},
    spawnDrop: () => {},
    payBounty: proto3.payBounty,
    setPlayerFlag: proto3.setPlayerFlag,
    clearPlayerFlag: proto3.clearPlayerFlag,
  });
  s.accounts = {
    ...s.accounts,
    setFlag: () => {},
    clearFlag: () => {},
    saveRaidCalm: (id: number, until: number) => stamps.push([id, until]),
  } as never;
  const before = Date.now();
  proto3.notePoiKill.call(s, 0);
  assert.equal(stamps.length, 1);
  assert.equal(stamps[0]![0], 101);
  assert.ok(stamps[0]![1] >= before + 47 * 3_600_000, 'the full raid quiet, not the short one');
  assert.ok((owner as { raidCalmUntil?: number }).raidCalmUntil! >= before + 47 * 3_600_000);
  assert.ok(msgs.some((t) => t.includes('covetous fires go out')));
});

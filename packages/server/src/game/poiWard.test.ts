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
    // THE CHAMPION'S MARK edges: the slate has no wire and no sworn
    // fellowships — the banner broadcast is a no-op, parties are empty.
    party: { fellowsOf: () => [] as number[] },
    broadcastTrophies: () => {},
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

test('authored landmarks keep the old covenant: grace window, no ember, NO STAMP', () => {
  const soon = Date.now() + 35_000; // the bestiary's own short clock
  const s = slate(
    [brigand({ respawnAt: soon }), brigand({ respawnAt: soon }), cow({ eid: 11 })],
    { authored: true },
  );
  const before = Date.now();
  proto.notePoiKill.call(s, 1);
  const row = s.poiLedger.get('3,4')!;
  // THE AUTHORED GROUND NEVER EMBERS — and never carries the cleared
  // stamp either: materializePoiCell reads ANY stamp as "stand the
  // garrison down", so stamping an authored cell turned one clear plus
  // one reboot into a permanent carcass. The grace window is the whole
  // record of the wipe.
  assert.equal(row.clearedAt, null);
  assert.equal(row.emberUntil, null);
  assert.equal(s.cleared.length, 0); // nothing rides to the DB at all
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
  payPurse: WardFn;
  bankDrop: WardFn;
  setPlayerFlag: WardFn;
  clearPlayerFlag: WardFn;
  creditDeed: WardFn;
  creditStanding: WardFn;
  factionForPlace: WardFn;
};

interface FakePlayer {
  characterId: number;
  name: string;
  raidCalmUntil: number;
  flags: Map<string, number>;
  standing: Map<string, number>;
  repSig: string;
  inventory: Array<{ item: string; qty: number } | null>;
  session: { sendJson: (m: { t: string; text?: string }) => void } | null;
}

function fakePlayer(characterId: number, msgs: string[]): FakePlayer {
  return {
    characterId,
    name: `Hero${characterId}`,
    raidCalmUntil: 0,
    flags: new Map(),
    standing: new Map(),
    repSig: '',
    inventory: new Array<null>(28).fill(null),
    session: {
      sendJson: (m) => {
        if (m.t === 'chat' && m.text) msgs.push(m.text);
      },
    },
  };
}

/** The standing rails, real — with the wire/persist edges stubbed. */
function armStanding(s: object): void {
  Object.assign(s, {
    creditDeed: proto3.creditDeed,
    creditStanding: proto3.creditStanding,
    factionForPlace: proto3.factionForPlace,
    pushRep: () => {},
    pushQuestAvail: () => {},
  });
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
    placeDrop: () => {},
    payBounty: proto3.payBounty,
    payPurse: proto3.payPurse,
    bankDrop: proto3.bankDrop,
    setPlayerFlag: proto3.setPlayerFlag,
    // THE FLAG OBJECTIVE (band 8): the choke credits flag asks; the slate has no quests.
    creditQuestEvent: () => {},
    clearPlayerFlag: proto3.clearPlayerFlag,
  });
  armStanding(s);
  s.accounts = {
    ...s.accounts,
    setFlag: (cid: number, flag: string) => flagWrites.push([cid, flag]),
    clearFlag: (cid: number, flag: string) => cleared.push([cid, flag]),
    saveStanding: () => {},
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
  // THE LEDGER OF NAMES: honoring a bounty pays standing — this camp
  // stands beyond every town's marches, so the road's wardens credit
  // it (the doc's roadFaction). Only the paid hand earns it.
  assert.equal(b.standing.get('waykeepers'), 5);
  assert.equal(a.standing.size, 0, 'no mark, no purse, no standing');
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
    placeDrop: () => {},
    payPurse: proto3.payPurse,
    bankDrop: proto3.bankDrop,
    clearPlayerFlag: proto3.clearPlayerFlag,
  });
  armStanding(s);
  s.accounts = { ...s.accounts, saveStanding: () => {} } as never;
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
    placeDrop: () => {},
    payBounty: proto3.payBounty,
    payPurse: proto3.payPurse,
    bankDrop: proto3.bankDrop,
    setPlayerFlag: proto3.setPlayerFlag,
    // THE FLAG OBJECTIVE (band 8): the choke credits flag asks; the slate has no quests.
    creditQuestEvent: () => {},
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

// ------------------------------------------------- THE CHAMPION'S MARK

test("THE CHAMPION'S MARK: the felling hand signs first, then the sworn party", () => {
  const s = slate([brigand(), brigand()]);
  s.poiLedger.get('3,4')!.site = {
    cellX: 3, cellY: 4, epoch: 0, tier: 2,
    defId: 'goblin_warcamp', prefabId: 'poi_goblin_camp_ring',
    anchorX: 448, anchorY: 576,
  } as never;
  const msgsA: string[] = [];
  const msgsB: string[] = [];
  const a = fakePlayer(101, msgsA); // the last blow
  const b = fakePlayer(102, msgsB); // bled it, but rides no fellowship
  const ceremonies: Array<{ to: number; by: string[]; slayer?: boolean }> = [];
  for (const [cid, pl, sink] of [[101, a, msgsA], [102, b, msgsB]] as const) {
    pl.session = {
      sendJson: (m: { t: string; text?: string; by?: string[]; slayer?: boolean }) => {
        if (m.t === 'chat' && m.text) sink.push(m.text);
        if (m.t === 'poicleared') ceremonies.push({ to: cid, by: m.by!, slayer: m.slayer });
      },
    } as never;
  }
  const stamped: Array<string[] | null> = [];
  let freshKey: string | undefined;
  Object.assign(s, {
    players: new Map([[11, a], [12, b]]),
    positions: new Map([[11, { x: 448, y: 576 }], [12, { x: 449, y: 576 }]]),
    characterEids: new Map([[101, 11], [102, 12]]),
    grantArt: () => {},
    placeDrop: () => {},
    payBounty: () => {},
    setPlayerFlag: proto3.setPlayerFlag,
    // THE FLAG OBJECTIVE (band 8): the choke credits flag asks; the slate has no quests.
    creditQuestEvent: () => {},
    // The slayer's fellowship: 102 stands sworn beside 101, and 103
    // is a sworn fellow who never swung (offline, elsewhere) — the
    // signature is the party, not the ledger.
    party: { fellowsOf: (cid: number) => (cid === 101 ? [102, 103] : []) },
    broadcastTrophies(fresh?: string) { freshKey = fresh; },
  });
  s.accounts = {
    ...s.accounts,
    markPoiCleared: (_cx: number, _cy: number, _ember: number | null, by: string[] | null = null) =>
      stamped.push(by),
    setFlag: () => {},
    characterName: (cid: number) => (cid === 102 ? 'Hero102' : cid === 103 ? 'Hero103' : null),
  } as never;
  (s.poiLive.get('3,4') as { fighters?: Set<number> }).fighters = new Set([102]);
  proto3.notePoiKill.call(s, 0, 11);
  // The banner's names: slayer first, then the whole sworn party —
  // the absent fellow included (the party is the signature).
  const row = s.poiLedger.get('3,4')! as { clearedBy?: string[] | null };
  assert.deepEqual(row.clearedBy, ['Hero101', 'Hero102', 'Hero103']);
  assert.deepEqual(stamped, [['Hero101', 'Hero102', 'Hero103']]);
  // Every participant got the ceremony; only the slayer wears the mark.
  assert.deepEqual(
    ceremonies.map((c) => [c.to, c.slayer === true]).sort((x, y) => (x[0] as number) - (y[0] as number)),
    [[101, true], [102, false]],
  );
  // The staked banner broadcast carried the fresh cell id.
  assert.equal(freshKey, '3,4');
});

test("THE CHAMPION'S MARK: the roster derives from the ledger, and the dissolve takes it down", () => {
  const proto4 = GameServer.prototype as unknown as { trophyWire: WardFn };
  const mkRow = (defId: string, clearedAt: number | null, by: string[] | null) => ({
    epoch: 0,
    site: {
      cellX: 3, cellY: 4, epoch: 0, tier: 3,
      defId, prefabId: 'poi_goblin_camp_ring',
      anchorX: 448, anchorY: 576,
    },
    clearedAt,
    emberUntil: clearedAt !== null ? clearedAt + 600_000 : null,
    fallowUntil: null,
    stage: 0,
    stageAt: null,
    originCell: null,
    clearedBy: by,
  });
  const s = {
    poiLedger: new Map([
      ['3,4', mkRow('goblin_warcamp', 1000, ['Hero101', 'Hero102'])],
      ['5,5', mkRow('bandit_camp', null, null)], // standing — no banner
      ['6,6', { ...mkRow('wolfkin_den', 2000, null) }], // lever-cleared: unsigned banner
    ]),
  };
  const wire = proto4.trophyWire.call(s) as Array<{
    id: string; x: number; y: number; name: string; by: string[]; at: number; tier?: number;
  }>;
  assert.deepEqual(wire.map((w) => w.id).sort(), ['3,4', '6,6']);
  const signed = wire.find((w) => w.id === '3,4')!;
  assert.deepEqual(signed.by, ['Hero101', 'Hero102']);
  assert.equal(signed.x, 448);
  assert.equal(signed.y, 576);
  assert.equal(signed.at, 1000);
  assert.equal(signed.tier, 3);
  assert.ok(signed.name.length > 0 && signed.name !== 'goblin_warcamp', 'the def name, not the id');
  const unsigned = wire.find((w) => w.id === '6,6')!;
  assert.deepEqual(unsigned.by, [], 'a lever clear stands an unsigned banner');
  // The dissolve resets the row — the banner falls with the carcass.
  s.poiLedger.set('3,4', {
    epoch: 1, site: null, clearedAt: null, emberUntil: null,
    fallowUntil: 5000, stage: 0, stageAt: null, originCell: null, clearedBy: null,
  } as never);
  const after = proto4.trophyWire.call(s) as Array<{ id: string }>;
  assert.deepEqual(after.map((w) => w.id), ['6,6']);
});

// ---------------------------------------------------------------------
// BAND 7 ENGINE (L5): THE PASS. `passFlag` on a PoiDef holds the
// garrison's fire on a character who carries it, resolved from the
// body's OWN spawn record at both chokes; THE NURSERY CLAUSE holds it
// on anyone without the durable first-road stamp; a blow forces.
// ---------------------------------------------------------------------

import { NPC_ACTORS, POI_DEFS, questDoneFlag, replacePoiDefs, validatePoiDef } from '@arx/content';

const passProto = GameServer.prototype as unknown as {
  poiPassHolds: WardFn;
  npcAggro: WardFn;
  npcFactionOf: WardFn;
  npcEnforcerFid: WardFn;
  playerBandWith: WardFn;
  npcTribeOf: WardFn;
};

/** Stand a validated test def in the live registry for one test body. */
function withTestDef(raw: Record<string, unknown>, body: () => void): void {
  const res = validatePoiDef(raw);
  assert.ok(res.ok, JSON.stringify(res));
  if (!res.ok) return;
  const before = [...POI_DEFS.values()];
  replacePoiDefs([...before, res.def]);
  try {
    body();
  } finally {
    replacePoiDefs(before);
  }
}

const BAR_DEF = {
  id: 'test_first_road_bar',
  name: 'Test bar',
  tiers: [1, 3],
  weight: 0,
  prefabs: ['poi_bandit_hollow'],
  garrison: [
    { npc: 'brigand', count: [2, 2], role: 'holdfast' },
    { npc: 'brigand_archer', count: [1, 1], role: 'sentry', patrol: true },
  ],
  passFlag: 'charter_pass',
  toll: true,
};

/** A walker: `paid` carries the pass, `green` has never walked the first road. */
function walker(opts: { paid?: boolean; green?: boolean } = {}) {
  const flags = new Map<string, number>();
  if (!opts.green) flags.set(questDoneFlag('the_first_road'), 1);
  if (opts.paid) flags.set('charter_pass', 1);
  return { flags, standing: new Map<string, number>(), eid: 77 };
}

/** The bar's cell in the ledger, and a body mustered for it. */
function barSlate(npcId = 'brigand', spawnIndex = 0) {
  const npc = {
    def: NPCS.get(npcId)!,
    state: 'idle' as string,
    targetEid: null as number | null,
    spawnIndex,
    steer: { side: 0, ticks: 0 },
    navBest: 0,
    navStuck: 0,
    navRefX: 0,
    navRefY: 0,
    nav: null,
    progressLane: null,
    nextRepathTick: 0,
    losUntilTick: 0,
    alert: 0,
    alertEid: null,
    alertVelX: 0,
    alertVelY: 0,
    alertSeenTick: 0,
    alertX: 0,
    alertY: 0,
    huntWps: null,
    huntIdx: 0,
    huntWaitUntilTick: 0,
    standTicks: 0,
    mouth: undefined as string | undefined,
  };
  const s = {
    npc,
    poiSpawnCells: new Map([[spawnIndex, '3,4']]),
    poiLedger: new Map([['3,4', { site: { defId: 'test_first_road_bar' } }]]),
    // The unforced aggro door's slate: no pets, no herds, no actors
    // (the body reads its faction by bestiary prefix), one player.
    pets: new Map(),
    companions: new Map(),
    livestock: new Map(),
    actors: new Map(),
    npcs: new Map<number, unknown>([[1, npc]]),
    players: new Map<number, unknown>(),
    positions: new Map<number, { plane: string; x: number; y: number }>([
      [1, { plane: 'surface', x: 10, y: 10 }],
      [77, { plane: 'surface', x: 12, y: 10 }],
    ]),
    tickCount: 100,
    poiPassHolds: passProto.poiPassHolds,
    npcFactionOf: passProto.npcFactionOf,
    npcEnforcerFid: passProto.npcEnforcerFid,
    playerBandWith: passProto.playerBandWith,
    npcTribeOf: passProto.npcTribeOf,
    resetBossEngagement: () => {},
    npcRefillGrit: () => {},
    rallyPack: () => {},
    sayAloud: () => {},
    broadcastFx: () => {},
  };
  return s;
}

test('THE PASS: paper walks the bar, an unflagged walker is charged, a green walker is nursed', () => {
  withTestDef(BAR_DEF, () => {
    const s = barSlate();
    const holds = (w: ReturnType<typeof walker>) => passProto.poiPassHolds.call(s, s.npc, w) as boolean;
    assert.equal(holds(walker({ paid: true })), true, 'charter paper walks the bar');
    assert.equal(holds(walker()), false, 'an unflagged post-tutorial walker is charged');
    assert.equal(holds(walker({ green: true })), true, 'the nursery clause: no first-road stamp, no toll');
    // The same read at the unforced aggro door: the crew stands for
    // paper and for new feet, and charges everyone else.
    const charge = (w: ReturnType<typeof walker>) => {
      const slate = barSlate();
      slate.players.set(77, w);
      passProto.npcAggro.call(slate, 1, slate.npc, 77);
      return slate.npc.state === 'chase';
    };
    assert.equal(charge(walker({ paid: true })), false);
    assert.equal(charge(walker({ green: true })), false);
    assert.equal(charge(walker()), true);
  });
});

test('THE PASS: a blow forces regardless of paper', () => {
  withTestDef(BAR_DEF, () => {
    const s = barSlate();
    s.players.set(77, walker({ paid: true }));
    passProto.npcAggro.call(s, 1, s.npc, 77, { force: true });
    assert.equal(s.npc.state, 'chase');
    assert.equal(s.npc.targetEid, 77);
  });
});

test('THE PASS: a sentry standing in the neighbour cell still honours its own def', () => {
  withTestDef(BAR_DEF, () => {
    // The archer's ring bearing stands 130 tiles east of the anchor —
    // the next macro-cell — but its spawn record was mustered for the
    // bar's cell, and that is the row the pass reads.
    const s = barSlate('brigand_archer', 2);
    s.positions.set(1, { plane: 'surface', x: 200, y: 10 });
    s.positions.set(77, { plane: 'surface', x: 201, y: 10 });
    assert.equal(passProto.poiPassHolds.call(s, s.npc, walker({ paid: true })), true);
    assert.equal(passProto.poiPassHolds.call(s, s.npc, walker()), false);
  });
});

test('THE PASS: a def without a pass answers false for everyone (every other camp unchanged)', () => {
  const s = barSlate();
  s.poiLedger.set('3,4', { site: { defId: 'bandit_camp' } });
  assert.equal(passProto.poiPassHolds.call(s, s.npc, walker({ paid: true })), false);
  assert.equal(passProto.poiPassHolds.call(s, s.npc, walker({ green: true })), false);
  // A body with no spawn record (an ephemeral split, spawnIndex -1) reads nothing.
  s.npc.spawnIndex = -1;
  assert.equal(passProto.poiPassHolds.call(s, s.npc, walker({ green: true })), false);
});

test("THE MOUTH ON THE ROW: the speaking body's death counts toward the clear like any garrison body", () => {
  assert.ok(NPC_ACTORS.has('company_broker'), 'the fixture mouth exists');
  const s = slate([
    brigand(),
    { ...brigand({ npc: 'brigand_reaver', eid: 9 }), mouth: 'company_broker' } as FakeSpawn,
  ]);
  assert.equal(proto.poiGarrisonStands.call(s, '3,4'), true, 'the crown holds the ward while it stands');
  s.spawnPoints[1]!.eid = null;
  proto.notePoiKill.call(s, 1);
  assert.equal(proto.poiGarrisonStands.call(s, '3,4'), false);
  assert.equal(s.cleared.length, 1, 'the crown was the last body: the clear stamps');
});

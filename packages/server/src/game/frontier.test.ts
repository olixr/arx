import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER,
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  emberLingerFor,
  fallowRestFor,
  scatterLingerFor,
  stageWaitFor,
} from '@arx/content';
import { GameServer } from './gameServer.js';
import { POI_CELL, poiCellKey, poiContext, poiForCell, composePoi, type PoiSite } from '../world/pois.js';
import { config } from '../config.js';

/**
 * THE FRONTIER CLOCK's laws, pinned (the living frontier, phases 1-2):
 * embers dissolve only when due, unwatched, and unauthored — banking a
 * credit ONLY for player clears (a scattered satellite pays nothing);
 * fallow cells wake to FRESH rolls, never inside a relax window; the
 * boldness clock arms at first discovery and climbs on time alone,
 * held by calm, the regional roof, and dignity; satellites seed
 * townward, die with their core, and never climb. Private methods
 * over a hand-built slate (the poiWard pattern).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  dissolveOneEmber: Fn;
  wakeOneFallow: Fn;
  spendRenewalCredit: Fn;
  stageOnePoi: Fn;
  seedOneSatellite: Fn;
  playerWithin: Fn;
  authoredCells: Fn;
  calmNear: Fn;
  boldCoresNear: Fn;
  stampCalm: Fn;
  standDownGarrison: Fn;
  poiSpawnFights: Fn;
  pushStageRumor: Fn;
  poiCtx: Fn;
  claimRings: Fn;
  inClaimRing: Fn;
  dangerAnchors: Fn;
  standOnePeddler: Fn;
  poiThreatens: Fn;
};

interface LedgerRow {
  epoch: number;
  site: PoiSite | null;
  clearedAt: number | null;
  emberUntil: number | null;
  fallowUntil: number | null;
  stage: number;
  stageAt: number | null;
  originCell: string | null;
}

// Surface band (y 128..255), deep frontier — never authored, and far
// enough east (~700 tiles past every anchor under the worded march)
// that no town's marches reach it: the marches tests below lean on
// this cell being honestly wild.
const CELL_X = 12;
const CELL_Y = 1;
const KEY = poiCellKey(CELL_X, CELL_Y);

function site(over: Partial<PoiSite> = {}): PoiSite {
  return {
    cellX: CELL_X,
    cellY: CELL_Y,
    epoch: 0,
    tier: 5,
    defId: 'goblin_warcamp',
    prefabId: 'poi_goblin_camp_ring',
    anchorX: CELL_X * 128 + 64,
    anchorY: CELL_Y * 128 + 64,
    ...over,
  };
}

function row(over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    epoch: 0,
    site: null,
    clearedAt: null,
    emberUntil: null,
    fallowUntil: null,
    stage: 0,
    stageAt: null,
    originCell: null,
    ...over,
  };
}

/** The minimal GameServer slate the frontier methods actually touch. */
function slate(rows: Array<[string, LedgerRow]>, opts: { credits?: number } = {}) {
  const recorded: Array<{
    cx: number;
    cy: number;
    epoch: number;
    site: unknown;
    fallow: unknown;
    origin: unknown;
  }> = [];
  const savedCredits: number[] = [];
  const staged: Array<[number, number, number]> = [];
  const embers: Array<[number, number, number | null]> = [];
  const faded: string[] = [];
  const retired: string[] = [];
  const s = {
    poiLedger: new Map(rows),
    poiLive: new Map<string, { spawnIdx: number[] }>(),
    poiPrefabs: POI_PREFABS,
    world: { zoneDefs: [] as unknown[], builtKeysOf: () => undefined },
    get surface() {
      return this.world;
    },
    homesByCharacter: new Map<number, { x: number; y: number }>(),
    ringCache: null as unknown,
    players: new Map<number, { session: unknown; disconnectedAt: number | null }>(),
    positions: new Map<number, { plane: string; x: number; y: number }>(),
    spawnPoints: [] as Array<{ npc: string; eid: number | null; respawnAt: number; active: boolean }>,
    frontierCredits: opts.credits ?? 0,
    frontierCalm: new Map<string, number>(),
    discoveredPoiCells: new Set<string>(),
    accounts: {
      recordPoiCell: (
        cx: number,
        cy: number,
        epoch: number,
        st: unknown,
        fallow: unknown = null,
        origin: unknown = null,
      ) => recorded.push({ cx, cy, epoch, site: st, fallow, origin }),
      saveFrontierCredits: (n: number) => savedCredits.push(n),
      markPoiStage: (cx: number, cy: number, stage: number) => staged.push([cx, cy, stage]),
      setPoiEmber: (cx: number, cy: number, until: number | null) => embers.push([cx, cy, until]),
      stampFrontierCalm: () => {},
      pruneFrontierCalm: () => {},
    },
    dangerAnchors: () => SETTLED_ANCHORS,
    fadePoiDiscoveries: (key: string) => faded.push(key),
    retirePoiCell: (key: string) => {
      retired.push(key);
      s.poiLive.delete(key);
    },
    rebuildHavens: () => {},
    // THE CHAMPION'S MARK edge: the slate has no wire — the banner
    // broadcast the dissolve fires is a no-op here.
    broadcastTrophies: () => {},
    playerWithin: proto.playerWithin,
    authoredCells: proto.authoredCells,
    poiCtx: proto.poiCtx,
    // The mask now derives from the queried ground (core-audit debt 2)
    // — the slate keeps an empty frontier of capitals.
    capitalRectsNear: () => [],
    claimRings: proto.claimRings,
    inClaimRing: proto.inClaimRing,
    standOnePeddler: proto.standOnePeddler,
    poiThreatens: proto.poiThreatens,
    calmNear: proto.calmNear,
    boldCoresNear: proto.boldCoresNear,
    stampCalm: proto.stampCalm,
    standDownGarrison: proto.standDownGarrison,
    poiSpawnFights: proto.poiSpawnFights,
    pushStageRumor: proto.pushStageRumor,
    recorded,
    savedCredits,
    staged,
    embers,
    faded,
    retired,
  };
  return s;
}

function addPlayer(s: ReturnType<typeof slate>, eid: number, x: number, y: number): void {
  s.players.set(eid, { session: {}, disconnectedAt: null });
  s.positions.set(eid, { plane: 'surface', x, y });
}

test('the test cell is not an authored landmark (precondition)', () => {
  const authored = proto.authoredCells.call({}) as Map<string, string>;
  assert.equal(authored.has(KEY), false);
});

test('jitter helpers: deterministic, in-band, epoch-divergent', () => {
  const a = emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 0);
  assert.equal(a, emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 0));
  assert.ok(a >= FRONTIER.emberLingerMs[0] && a <= FRONTIER.emberLingerMs[1]);
  const f = fallowRestFor(config.worldSeed, CELL_X, CELL_Y, 1);
  assert.ok(f >= FRONTIER.fallowMs[0] && f <= FRONTIER.fallowMs[1]);
  const w = stageWaitFor(config.worldSeed, CELL_X, CELL_Y, 0);
  assert.ok(w >= FRONTIER.stageMs[0] && w <= FRONTIER.stageMs[1]);
  const sc = scatterLingerFor(config.worldSeed, CELL_X, CELL_Y);
  assert.ok(sc >= FRONTIER.scatterLingerMs[0] && sc <= FRONTIER.scatterLingerMs[1]);
  assert.notEqual(
    emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 0),
    emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 1),
  );
});

test('a due ember dissolves: fade, retire, epoch+1, fallow rest, one credit banked', () => {
  const now = Date.now();
  const s = slate([
    [KEY, row({ epoch: 2, site: site({ epoch: 2 }), clearedAt: now - 600_000, emberUntil: now - 1000 })],
  ]);
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
  assert.deepEqual(s.faded, [KEY]);
  assert.deepEqual(s.retired, [KEY]);
  const r = s.poiLedger.get(KEY)!;
  assert.equal(r.site, null);
  assert.equal(r.epoch, 3);
  assert.ok(
    r.fallowUntil !== null &&
      r.fallowUntil >= now + FRONTIER.fallowMs[0] &&
      r.fallowUntil <= now + FRONTIER.fallowMs[1],
  );
  assert.equal(s.frontierCredits, 1);
  assert.deepEqual(s.savedCredits, [1]);
  assert.equal(proto.dissolveOneEmber.call(s, now), false);
});

test('a scattered satellite dissolves WITHOUT banking a credit', () => {
  const now = Date.now();
  const s = slate([
    [
      KEY,
      row({ site: site(), clearedAt: null, emberUntil: now - 1000, originCell: '5,1' }),
    ],
  ]);
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
  assert.equal(s.poiLedger.get(KEY)!.site, null);
  assert.equal(s.frontierCredits, 0);
  assert.equal(s.savedCredits.length, 0);
});

test('dignity: an ember never dissolves in front of someone', () => {
  const now = Date.now();
  const st = site();
  const s = slate([[KEY, row({ site: st, clearedAt: now - 600_000, emberUntil: now - 1000 })]]);
  addPlayer(s, 1, st.anchorX + FRONTIER.dignityTiles - 2, st.anchorY);
  assert.equal(proto.dissolveOneEmber.call(s, now), false);
  s.positions.set(1, { plane: 'surface', x: st.anchorX + FRONTIER.dignityTiles + 20, y: st.anchorY });
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
});

test('a rested fallow cell wakes to the SAME roll poiForCell decides', () => {
  const now = Date.now();
  const epoch = 3;
  const s = slate([[KEY, row({ epoch, fallowUntil: now - 1000 })]]);
  s.poiLive.set(KEY, { spawnIdx: [] });
  assert.equal(proto.wakeOneFallow.call(s, now), true);
  const r = s.poiLedger.get(KEY)!;
  assert.equal(r.fallowUntil, null);
  const expected = poiForCell(
    config.worldSeed,
    CELL_X,
    CELL_Y,
    epoch,
    poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []),
  );
  assert.deepEqual(r.site, expected);
  const s2 = slate([[KEY, row({ epoch, fallowUntil: now + 60_000 })]]);
  assert.equal(proto.wakeOneFallow.call(s2, now), false);
});

test('THE RELAX WINDOW: calm blocks wakes, stage-ups, and renewal landings nearby', () => {
  const now = Date.now();
  // Calm stamped one cell over — inside the regionCells neighborhood.
  const s = slate([[KEY, row({ fallowUntil: now - 1000 })]]);
  s.frontierCalm.set(poiCellKey(CELL_X + 1, CELL_Y + 1), now + 3_600_000);
  assert.equal(proto.wakeOneFallow.call(s, now), false, 'a calmed valley must not wake');
  // Renewal refuses the calmed neighborhood too: with the whole map
  // calmed, a credit is never spent.
  const s2 = slate([], { credits: 1 });
  addPlayer(s2, 1, 832, 192);
  for (let cx = 0; cx < 12; cx++) {
    for (let cy = 0; cy < 4; cy++) s2.frontierCalm.set(poiCellKey(cx, cy), now + 3_600_000);
  }
  assert.equal(proto.spendRenewalCredit.call(s2, now), false);
  assert.equal(s2.frontierCredits, 1);
});

test('the boldness clock: gate, arm, climb, and the frequency of it', () => {
  const now = Date.now();
  const st = site({ tier: 3 });
  const s = slate([[KEY, row({ site: st })]]);
  // Undiscovered: no clock, ever.
  assert.equal(proto.stageOnePoi.call(s, now), false);
  assert.equal(s.poiLedger.get(KEY)!.stageAt, null);
  // Discovery arms the clock (one pass = the stamp).
  s.discoveredPoiCells.add(KEY);
  assert.equal(proto.stageOnePoi.call(s, now), true);
  const r = s.poiLedger.get(KEY)!;
  assert.equal(r.stage, 0);
  assert.equal(r.stageAt, now);
  assert.deepEqual(s.staged, [[CELL_X, CELL_Y, 0]]);
  // Not yet due: holds.
  assert.equal(proto.stageOnePoi.call(s, now + 1000), false);
  // Due: climbs one rung, recomposes, tells the holders.
  const due = now + stageWaitFor(config.worldSeed, CELL_X, CELL_Y, 0) + 1;
  assert.equal(proto.stageOnePoi.call(s, due), true);
  assert.equal(r.stage, 1);
  assert.deepEqual(s.retired, [KEY]);
  // Calm freezes the ladder (the window must outlive the stage wait).
  const due2 = due + stageWaitFor(config.worldSeed, CELL_X, CELL_Y, 1) + 1;
  s.frontierCalm.set(KEY, due2 + 3_600_000);
  assert.equal(proto.stageOnePoi.call(s, due2), false);
  assert.equal(r.stage, 1);
});

test('satellites never climb; the regional roof holds the ladder down', () => {
  const now = Date.now();
  const satKey = poiCellKey(CELL_X + 1, CELL_Y);
  const s = slate([
    [KEY, row({ site: site(), stage: 1, stageAt: now - 10 * 86_400_000 })],
    [
      satKey,
      row({
        site: site({ cellX: CELL_X + 1, anchorX: (CELL_X + 1) * 128 + 64 }),
        stage: 0,
        stageAt: now - 10 * 86_400_000,
        originCell: KEY,
      }),
    ],
  ]);
  s.discoveredPoiCells.add(KEY);
  s.discoveredPoiCells.add(satKey);
  // Two stage-2 cores already stand in the neighborhood — the roof.
  for (const [i, [dx, dy]] of [[-1, -1], [1, 1]].entries()) {
    const k = poiCellKey(CELL_X + dx!, CELL_Y + dy!);
    s.poiLedger.set(
      k,
      row({
        site: site({ cellX: CELL_X + dx!, cellY: CELL_Y + dy!, defId: 'bandit_camp' }),
        stage: 2,
        stageAt: now - i,
      }),
    );
  }
  assert.equal(proto.stageOnePoi.call(s, now), false, 'roofed core must not reach stage 2');
  assert.equal(s.poiLedger.get(KEY)!.stage, 1);
  assert.equal(s.poiLedger.get(satKey)!.stage, 0, 'satellites never climb');
});

test('a stage-2 core seeds ONE townward satellite with its origin recorded', () => {
  const now = Date.now();
  const st = site({ tier: 3 });
  const s = slate([[KEY, row({ site: st, stage: 2, stageAt: now })]]);
  const seeded = proto.seedOneSatellite.call(s, now) as boolean;
  assert.equal(seeded, true, 'an unroofed stage-2 core should seed');
  const sat = [...s.poiLedger.entries()].find(([k, r]) => k !== KEY && r.site !== null);
  assert.ok(sat, 'a satellite row must exist');
  const [satKey, satRow] = sat!;
  assert.equal(satRow.originCell, KEY);
  assert.equal(satRow.site!.defId, 'goblin_warcamp');
  assert.equal(s.recorded.at(-1)!.origin, KEY);
  // Adjacency: the satellite stands in one of the 8 neighbor cells.
  const [scx, scy] = satKey.split(',').map(Number);
  assert.ok(Math.abs(scx! - CELL_X) <= 1 && Math.abs(scy! - CELL_Y) <= 1 && satKey !== KEY);
  // Cap: with satelliteMax live satellites, no more seed. The fakes
  // stand at far keys so they can never collide with the seeded cell.
  for (let i = 1; i < FRONTIER.satelliteMax; i++) {
    s.poiLedger.set(
      poiCellKey(CELL_X + 5 + i, CELL_Y),
      row({ site: site({ cellX: CELL_X + 5 + i }), originCell: KEY }),
    );
  }
  assert.equal(proto.seedOneSatellite.call(s, now), false, 'satelliteMax must hold');
});

test('orphan satellites scatter when their core is gone', () => {
  const now = Date.now();
  const satKey = poiCellKey(CELL_X + 1, CELL_Y);
  const s = slate([
    [KEY, row({ epoch: 1 })], // the core dissolved — empty row
    [
      satKey,
      row({
        site: site({ cellX: CELL_X + 1, anchorX: (CELL_X + 1) * 128 + 64 }),
        originCell: KEY,
      }),
    ],
  ]);
  assert.equal(proto.seedOneSatellite.call(s, now), true);
  const satRow = s.poiLedger.get(satKey)!;
  assert.ok(satRow.emberUntil !== null && satRow.emberUntil > now);
  assert.equal(satRow.clearedAt, null, 'a scatter is not a clear — no credit at dissolve');
});

test('composePoi stage: rungs add muster, the base camp never reshuffles', () => {
  const st = site({ tier: 3 });
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const base = composePoi(config.worldSeed, st, ctx, 0);
  const staged2 = composePoi(config.worldSeed, st, ctx, 2);
  assert.ok(base && staged2);
  assert.ok(
    staged2.spawns!.length > base.spawns!.length,
    `stage 2 must muster more (${staged2.spawns!.length} vs ${base.spawns!.length})`,
  );
  // Prefix stability: every base spawn stands identically in the
  // staged composition (position, kind, level, name — the whole record).
  for (const [i, sp] of base.spawns!.entries()) {
    assert.deepEqual(staged2.spawns![i], sp, `base spawn ${i} reshuffled`);
  }
  // Determinism: same stage, same answer.
  assert.deepEqual(composePoi(config.worldSeed, st, ctx, 2), staged2);
});

test('renewal refusals: no credits, or nobody on the surface, spends nothing', () => {
  const now = Date.now();
  const s = slate([], { credits: 0 });
  addPlayer(s, 1, 832, 192);
  assert.equal(proto.spendRenewalCredit.call(s, now), false);
  const s2 = slate([], { credits: 2 });
  assert.equal(proto.spendRenewalCredit.call(s2, now), false);
  assert.equal(s2.frontierCredits, 2);
});

test('a spent credit stands lawful ground: offscreen, unauthored, debt paid down', () => {
  const now = Date.now();
  const s = slate([], { credits: 1 });
  addPlayer(s, 1, 832, 192);
  const authored = proto.authoredCells.call({}) as Map<string, string>;
  let stood = false;
  for (let i = 0; i < 50 && !stood; i++) {
    stood = proto.spendRenewalCredit.call(s, now) as boolean;
  }
  assert.equal(stood, true, 'no renewal candidate found in 50 passes');
  assert.equal(s.frontierCredits, 0);
  const rec = s.recorded[0]!;
  assert.notEqual(rec.site, null);
  assert.equal(authored.has(poiCellKey(rec.cx, rec.cy)), false);
  const r = s.poiLedger.get(poiCellKey(rec.cx, rec.cy))!;
  assert.ok(r.site !== null);
  const d = Math.hypot(r.site.anchorX - 832, r.site.anchorY - 192);
  assert.ok(d >= FRONTIER.dignityTiles, `anchor stood ${d.toFixed(1)} tiles from the player`);
  assert.ok(r.epoch >= 1);
});

// ---------------------------------------------------------------- Phase 3

const proto3 = GameServer.prototype as unknown as {
  watchSurvey: Fn;
  worldFlagAnswer: Fn;
  calmWithinTiles: Fn;
  openBounties: Fn;
  clearPlayerFlag: Fn;
  forkOneToll: Fn;
};

/** Wire the Phase 3 methods onto a slate (they read the same fields). */
function armPhase3(s: ReturnType<typeof slate>) {
  return Object.assign(s, {
    watchSurvey: proto3.watchSurvey,
    worldFlagAnswer: proto3.worldFlagAnswer,
    calmWithinTiles: proto3.calmWithinTiles,
    openBounties: proto3.openBounties,
    clearPlayerFlag: proto3.clearPlayerFlag,
    forkOneToll: proto3.forkOneToll,
    tollTrace: [] as string[],
  });
}

test('THE WORLD ANSWERS: scoped to the watch, blind to authored land and embers', () => {
  const st = site({ tier: 3 });
  const s = armPhase3(slate([[KEY, row({ site: st, stage: 0 })]]));
  const player = { characterId: 0, flags: new Map<string, number>() };
  const at = (flag: string, x: number, y: number) =>
    proto3.worldFlagAnswer.call(s, flag, player, x, y) as boolean;
  // A standing camp within the watch: threat_near, not yet bold.
  assert.equal(at('world:threat_near', st.anchorX + 40, st.anchorY), true);
  assert.equal(at('world:threat_bold', st.anchorX + 40, st.anchorY), false);
  assert.equal(at('world:calm', st.anchorX + 40, st.anchorY), false);
  // Outside the watch: the guard cannot know.
  assert.equal(at('world:threat_near', st.anchorX + FRONTIER.watchTiles + 60, st.anchorY), false);
  // A bold camp answers bold; a road toll answers toll_near.
  s.poiLedger.get(KEY)!.stage = FRONTIER.satelliteStage;
  assert.equal(at('world:threat_bold', st.anchorX + 40, st.anchorY), true);
  s.poiLedger.set(
    poiCellKey(CELL_X + 1, CELL_Y),
    row({ site: site({ cellX: CELL_X + 1, defId: 'road_toll', anchorX: st.anchorX + 100 }) }),
  );
  assert.equal(at('world:toll_near', st.anchorX + 40, st.anchorY), true);
  // A cleared (ember) camp is no longer news.
  s.poiLedger.get(KEY)!.clearedAt = Date.now();
  s.poiLedger.get(KEY)!.emberUntil = Date.now() + 60_000;
  assert.equal(at('world:threat_bold', st.anchorX + 40, st.anchorY), false);
  // Authored landmarks are the land's character, never news: the same
  // standing site in an authored cell answers nothing.
  const authored = proto.authoredCells.call({}) as Map<string, string>;
  const aKey = [...authored.keys()][0]!;
  const [acx, acy] = aKey.split(',').map(Number);
  const s2 = armPhase3(
    slate([
      [
        aKey,
        row({
          site: site({
            cellX: acx!,
            cellY: acy!,
            anchorX: acx! * POI_CELL + 64,
            anchorY: acy! * POI_CELL + 64,
          }),
        }),
      ],
    ]),
  );
  assert.equal(
    proto3.worldFlagAnswer.call(s2, 'world:threat_near', player, acx! * POI_CELL + 64, acy! * POI_CELL + 64),
    false,
  );
});

test('world:relief — calm within the marches, and only when nothing stands', () => {
  const s = armPhase3(slate([]));
  const player = { characterId: 0, flags: new Map<string, number>() };
  const x = CELL_X * POI_CELL + 64;
  const y = CELL_Y * POI_CELL + 64;
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:relief', player, x, y), false);
  // A relax window one cell over: the road audibly breathes.
  s.frontierCalm.set(poiCellKey(CELL_X + 1, CELL_Y), Date.now() + 3_600_000);
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:relief', player, x, y), true);
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:calm', player, x, y), true);
  // A camp still standing kills the relief even inside the window.
  s.poiLedger.set(KEY, row({ site: site() }));
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:relief', player, x, y), false);
});

test('world:bounty_open reads through the ledger and prunes dead marks', () => {
  const s = armPhase3(slate([[KEY, row({ site: site() })]]));
  const player = { characterId: 0, flags: new Map<string, number>([[`bounty:${KEY}`, 1]]) };
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:bounty_open', player, 0, 0), true);
  // The camp dissolves without the player: the mark lifts itself.
  s.poiLedger.get(KEY)!.site = null;
  assert.equal(proto3.worldFlagAnswer.call(s, 'world:bounty_open', player, 0, 0), false);
  assert.equal(player.flags.has(`bounty:${KEY}`), false, 'stale mark must be pruned');
});

test('THE CREEP ANSWERED: a full family in the marches forks a road-true toll', () => {
  const now = Date.now();
  // Cell 3,0 stands ~104 tiles from Amberford's anchor — inside the
  // marches; the frontier test cell (6,1) is far outside them.
  const coreKey = poiCellKey(3, 0);
  const coreSite = site({ cellX: 3, cellY: 0, anchorX: 3 * POI_CELL + 64, anchorY: 64 });
  const mk = (stage: number, stageAt: number | null) =>
    armPhase3(slate([[coreKey, row({ site: coreSite, stage, stageAt })]]));
  // Below full strength: never forks.
  const sLow = mk(FRONTIER.stageMax - 1, now - 10 * 86_400_000);
  assert.equal(proto3.forkOneToll.call(sLow, now), false);
  // Full strength but the creep wait has not run: holds.
  const sFresh = mk(FRONTIER.stageMax, now);
  assert.equal(proto3.forkOneToll.call(sFresh, now), false);
  // Outside the marches: the wild is the wild — no toll, ever.
  const sFar = armPhase3(
    slate([[KEY, row({ site: site(), stage: FRONTIER.stageMax, stageAt: now - 10 * 86_400_000 })]]),
  );
  assert.equal(proto3.forkOneToll.call(sFar, now), false);
  // Due, in the marches, unanswered: the road forks.
  const s = mk(FRONTIER.stageMax, now - 10 * 86_400_000);
  assert.equal(proto3.forkOneToll.call(s, now), true, `no fork: [${(s as { tollTrace: string[] }).tollTrace.join(' ')}]`);
  const toll = [...s.poiLedger.entries()].find(([, r]) => r.site?.defId === 'road_toll');
  assert.ok(toll, 'a road_toll row must exist');
  const [tollKey, tollRow] = toll!;
  assert.equal(tollRow.originCell, coreKey, 'the toll belongs to its family');
  assert.equal(s.recorded.at(-1)!.origin, coreKey);
  const [tcx, tcy] = tollKey.split(',').map(Number);
  assert.ok(Math.abs(tcx! - 3) <= 1 && Math.abs(tcy! - 0) <= 1 && tollKey !== coreKey);
  // One toll per family: a second pass forks nothing new.
  assert.equal(proto3.forkOneToll.call(s, now), false);
});

// ---------------------------------------------------------------- Phase 4

const proto4 = GameServer.prototype as unknown as {
  tickRaidDice: Fn;
  inClaimRing: Fn;
  claimRings: Fn;
  liveDangerTier: Fn;
  poiCtx: Fn;
};
const hearthOwnerOf = (
  GameServer as unknown as { hearthOwnerOf: (o: string | null) => number | null }
).hearthOwnerOf;
const hearthOrigin = (
  GameServer as unknown as { hearthOrigin: (id: number) => string }
).hearthOrigin;

test('the hearth tie round-trips and rejects strangers', () => {
  assert.equal(hearthOwnerOf(hearthOrigin(42)), 42);
  assert.equal(hearthOwnerOf('5,1'), null);
  assert.equal(hearthOwnerOf(null), null);
  assert.equal(hearthOwnerOf('hearth:nonsense'), null);
});

test('THE EXCLUSION LAW: a claimed yard refuses every materialization candidate', () => {
  const ctxFree = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const stood = poiForCell(config.worldSeed, CELL_X, CELL_Y, 0, ctxFree);
  assert.ok(stood, 'the control cell must host a site');
  // A yard over the whole cell: the same roll now stands nothing.
  const ring = { x: CELL_X * POI_CELL + 64, y: CELL_Y * POI_CELL + 64, r: 200 };
  const ctxClaimed = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [ring], []);
  assert.equal(poiForCell(config.worldSeed, CELL_X, CELL_Y, 0, ctxClaimed), null);
  // A small ring far away changes nothing.
  const ctxFar = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [{ x: 0, y: 0, r: 24 }], []);
  assert.deepEqual(poiForCell(config.worldSeed, CELL_X, CELL_Y, 0, ctxFar), stood);
});

test('claim rings derive from the bed and the built flood within reach', () => {
  const built = new Set(['140,100', '100,140']); // 40 out
  built.add('180,100'); // 80 out — past claimReach, its own risk
  const s = slate([]);
  (s.world as unknown as { builtKeysOf: (o: number) => ReadonlySet<string> | undefined }).builtKeysOf =
    (o: number) => (o === 7 ? built : undefined);
  s.homesByCharacter.set(7, { x: 100, y: 100 });
  s.homesByCharacter.set(8, { x: 500, y: 500 }); // bare bed, no builds
  const rings = (proto4.claimRings.call(s) as Array<{ x: number; y: number; r: number }>)
    .slice()
    .sort((a, b) => a.x - b.x);
  assert.equal(rings.length, 2);
  assert.equal(rings[0]!.x, 100);
  assert.equal(rings[0]!.r, 40 + FRONTIER.claimPad, 'grown over the flood, far post ignored');
  assert.equal(rings[1]!.r, FRONTIER.claimR, 'a bare bed keeps the base yard');
  // The point test agrees with the derived ring.
  assert.equal(proto4.inClaimRing.call(s, 110, 100), true);
  assert.equal(proto4.inClaimRing.call(s, 100 + 60, 100), false);
});

interface RaidPlayer {
  characterId: number;
  session: unknown;
  disconnectedAt: number | null;
  home: { x: number; y: number } | null;
  hearthWarded: boolean;
  raidCalmUntil: number;
  flags: Map<string, number>;
  discoveries: Map<string, unknown>;
}

function raidSlate(player: Partial<RaidPlayer> = {}) {
  const s = slate([]);
  const home = { x: CELL_X * POI_CELL + 64, y: CELL_Y * POI_CELL + 64 };
  const p: RaidPlayer = {
    characterId: 7,
    session: { sendJson: () => {} },
    disconnectedAt: null,
    home,
    hearthWarded: false,
    raidCalmUntil: 0,
    flags: new Map(),
    discoveries: new Map(),
    ...player,
  };
  const stamps: Array<[number, number]> = [];
  const discovered: string[] = [];
  const fx: string[] = [];
  Object.assign(s, {
    tickRaidDice: proto4.tickRaidDice,
    liveDangerTier: proto4.liveDangerTier,
    players: new Map([[11, p]]),
    positions: new Map([[11, { plane: 'surface', x: p.home?.x ?? 0, y: p.home?.y ?? 0 }]]),
    characterEids: new Map([[p.characterId, 11]]),
    broadcastFx: (_plane: unknown, f: { kind: string }) => fx.push(f.kind),
    setPlayerFlag: (pl: RaidPlayer, flag: string) => pl.flags.set(flag, 1),
    recordDiscovery: (_pl: unknown, d: { id: string }) => discovered.push(d.id),
    raidTrace: [] as string[],
  });
  if (p.home) s.homesByCharacter.set(p.characterId, p.home);
  s.accounts = {
    ...s.accounts,
    saveRaidCalm: (id: number, until: number) => stamps.push([id, until]),
  } as never;
  return Object.assign(s, { raidPlayer: p, stamps, discovered, fx });
}

test('the covetous dice: every mercy gate refuses', () => {
  const now = Date.now();
  const cases: Array<[Partial<RaidPlayer>, string]> = [
    [{ session: null }, 'attended only'],
    [{ characterId: -1 }, 'guests never'],
    [{ home: null }, 'no claim, no covet'],
    [{ hearthWarded: true }, 'the dial holds'],
    [{ raidCalmUntil: now + 60_000 }, 'mercy stands'],
  ];
  for (const [over, why] of cases) {
    const s = raidSlate(over);
    assert.equal(
      (s as unknown as { tickRaidDice: Fn }).tickRaidDice.call(s, now, true),
      false,
      `must refuse: ${why}`,
    );
  }
  // Away from home: the owner is not there to answer, so nobody comes.
  const away = raidSlate();
  away.positions.set(11, { plane: 'surface', x: 0, y: 0 });
  assert.equal((away as unknown as { tickRaidDice: Fn }).tickRaidDice.call(away, now, true), false);
  assert.ok((away as unknown as { raidTrace: string[] }).raidTrace.some((t) => t.endsWith(':away')));
});

test('a forced raid stands a hearth-tied squat at the edge, fuse lit', () => {
  const now = Date.now();
  const s = raidSlate();
  const stood = (s as unknown as { tickRaidDice: Fn }).tickRaidDice.call(s, now, true) as boolean;
  assert.equal(
    stood,
    true,
    `no squat: [${(s as unknown as { raidTrace: string[] }).raidTrace.join(' ')}]`,
  );
  const squat = [...s.poiLedger.entries()].find(([, r]) => r.site?.defId === 'raider_squat');
  assert.ok(squat, 'a raider_squat row must exist');
  const [, srow] = squat!;
  assert.equal(srow.originCell, hearthOrigin(7));
  const home = s.raidPlayer.home!;
  const d = Math.hypot(srow.site!.anchorX - home.x, srow.site!.anchorY - home.y);
  assert.ok(
    d >= FRONTIER.claimR + FRONTIER.raidStandoffTiles,
    `standoff holds (${d.toFixed(1)} tiles out)`,
  );
  assert.ok(d >= FRONTIER.dignityTiles, 'never in view of the owner at their hearth');
  // The fuse: horn, the stamped defender bounty, and the chart pip.
  assert.deepEqual(s.fx, ['horn']);
  assert.ok([...s.raidPlayer.flags.keys()].some((f) => f.startsWith('bounty:')));
  assert.equal(s.discovered.length, 1);
  // One squat at a time: the dice refuse while it stands.
  assert.equal((s as unknown as { tickRaidDice: Fn }).tickRaidDice.call(s, now, true), false);
  assert.ok(
    (s as unknown as { raidTrace: string[] }).raidTrace.some((t) => t.endsWith(':coveted')),
  );
});

test('an unclaimed hearth orphans its squat — the covetous camp loses interest', () => {
  const now = Date.now();
  const s = raidSlate();
  assert.equal((s as unknown as { tickRaidDice: Fn }).tickRaidDice.call(s, now, true), true);
  const [skey, srow] = [...s.poiLedger.entries()].find(
    ([, r]) => r.site?.defId === 'raider_squat',
  )!;
  // The bed is gone: the home registry forgets the settler.
  s.homesByCharacter.clear();
  assert.equal(proto.seedOneSatellite.call(s, now), true, 'the orphan watch must act');
  assert.ok(srow.emberUntil !== null && srow.emberUntil > now, `${skey} must scatter`);
  assert.equal(srow.clearedAt, null, 'a scatter is not a clear');
});

test('composePoi face: the squat orients on the claim, deterministically', () => {
  const st = site({ tier: 2, defId: 'raider_squat', prefabId: 'poi_raider_squat' });
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const toward = { x: st.anchorX + 100, y: st.anchorY };
  const faced = composePoi(config.worldSeed, st, ctx, 0, toward);
  const unfaced = composePoi(config.worldSeed, st, ctx, 0);
  assert.ok(faced && unfaced);
  assert.notDeepEqual(faced.ground, unfaced.ground, 'the cues must re-orient');
  assert.deepEqual(composePoi(config.worldSeed, st, ctx, 0, toward), faced, 'faced compose is pure');
});

// ---------------------------------------------------------------- Phase 5

const proto5 = GameServer.prototype as unknown as {
  standOnePeddler: Fn;
  poiThreatens: Fn;
};

test("THE ROAD'S FORTUNE: a peddler stands road-true with her ember stamped on arrival", () => {
  const now = Date.now();
  const s = slate([]);
  Object.assign(s, { standOnePeddler: proto5.standOnePeddler });
  const points = [
    { tx: CELL_X * POI_CELL + 64, ty: CELL_Y * POI_CELL + 64 },
    { tx: (CELL_X + 1) * POI_CELL + 64, ty: CELL_Y * POI_CELL + 64 },
  ];
  const stood = (s as unknown as { standOnePeddler: Fn }).standOnePeddler.call(s, points, now);
  assert.ok(stood, 'a lawful verge must take the cart');
  const entry = [...s.poiLedger.entries()].find(([, r]) => r.site?.defId === 'peddler_rest');
  assert.ok(entry, 'a peddler_rest row must exist');
  const [, prow] = entry!;
  // The ember clock runs from ARRIVAL — nobody solves a peddler.
  assert.ok(
    prow.emberUntil !== null &&
      prow.emberUntil >= now + FRONTIER.peddlerLingerMs[0] &&
      prow.emberUntil <= now + FRONTIER.peddlerLingerMs[1],
    'the linger is stamped on arrival, in band',
  );
  assert.equal(prow.clearedAt, null);
  assert.equal(prow.originCell, null);
  // One cart per region: a second stand in the same neighborhood refuses.
  assert.equal(
    (s as unknown as { standOnePeddler: Fn }).standOnePeddler.call(s, points, now),
    null,
  );
});

test('the cart reads the weather: never beside an active raid, calm about embers', () => {
  const now = Date.now();
  const raidKey = poiCellKey(CELL_X + 1, CELL_Y);
  const mk = (emberUntil: number | null) => {
    const s = slate([
      [
        raidKey,
        row({
          site: site({ cellX: CELL_X + 1, defId: 'raider_squat', prefabId: 'poi_raider_squat' }),
          emberUntil,
          originCell: 'hearth:7',
        }),
      ],
    ]);
    Object.assign(s, { standOnePeddler: proto5.standOnePeddler });
    return s;
  };
  const points = [{ tx: CELL_X * POI_CELL + 64, ty: CELL_Y * POI_CELL + 64 }];
  // An ACTIVE squat in the region: she keeps driving.
  const active = mk(null);
  assert.equal(
    (active as unknown as { standOnePeddler: Fn }).standOnePeddler.call(active, points, now),
    null,
  );
  // A scattered (embered) squat is over — the verge is fine.
  const over = mk(now + 60_000);
  assert.ok(
    (over as unknown as { standOnePeddler: Fn }).standOnePeddler.call(over, points, now),
  );
});

test('a peddler moving on RE-BANKS the renewal credit (a reprieve, not a payment)', () => {
  const now = Date.now();
  const s = slate([
    [
      KEY,
      row({
        site: site({ defId: 'peddler_rest', prefabId: 'poi_peddler_rest' }),
        emberUntil: now - 1000,
      }),
    ],
  ]);
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
  assert.equal(s.frontierCredits, 1, 'the debt returns when fortune moves on');
  assert.equal(s.poiLedger.get(KEY)!.site, null);
});

test('friendly sites are never news: no threat, no bounty mark, but peddler_near answers', () => {
  const st = site({ tier: 2, defId: 'peddler_rest', prefabId: 'poi_peddler_rest' });
  const s = armPhase3(slate([[KEY, row({ site: st, emberUntil: Date.now() + 3_600_000 })]]));
  Object.assign(s, { poiThreatens: proto5.poiThreatens });
  const player = { characterId: 0, flags: new Map<string, number>() };
  const at = (flag: string) =>
    proto3.worldFlagAnswer.call(s, flag, player, st.anchorX + 10, st.anchorY) as boolean;
  assert.equal(at('world:threat_near'), false, 'a cart is not a camp');
  assert.equal(at('world:calm'), true);
  assert.equal(at('world:peddler_near'), true, 'fortune within the marches answers');
  // Beyond the marches the word runs out.
  assert.equal(
    proto3.worldFlagAnswer.call(
      s,
      'world:peddler_near',
      player,
      st.anchorX + FRONTIER.marchTiles + 50,
      st.anchorY,
    ),
    false,
  );
  // A standing WAYSTATION is friendly too — the survey stays quiet.
  const s2 = armPhase3(
    slate([[KEY, row({ site: site({ defId: 'waystation', prefabId: 'poi_waystation_camp' }) })]]),
  );
  Object.assign(s2, { poiThreatens: proto5.poiThreatens });
  assert.equal(
    proto3.worldFlagAnswer.call(s2, 'world:threat_near', player, st.anchorX, st.anchorY),
    false,
    'a rolled waystation must never read as trouble',
  );
});

// ---------------------------------------------------------------- Phase 6

const proto6 = GameServer.prototype as unknown as { poiCellAction: Fn };

test('the bench plays the lifecycle: stage and ember verbs with lever semantics', () => {
  const st = site({ tier: 3 });
  const mkSlate = () => {
    const s = slate([[KEY, row({ site: st })]]);
    const clearedStamps: Array<[number, number, number | null]> = [];
    Object.assign(s, { poiCellAction: proto6.poiCellAction });
    s.accounts = {
      ...s.accounts,
      markPoiCleared: (cx: number, cy: number, ember: number | null = null) =>
        clearedStamps.push([cx, cy, ember]),
    } as never;
    return Object.assign(s, { clearedStamps });
  };
  // Stage: climbs one rung by default, clamps to the def's ladder.
  const s = mkSlate();
  const act = (s as unknown as { poiCellAction: Fn }).poiCellAction.bind(s);
  assert.deepEqual(act(CELL_X, CELL_Y, 'stage'), { ok: true, site: st });
  assert.equal(s.poiLedger.get(KEY)!.stage, 1);
  assert.deepEqual(s.retired, [KEY], 'the climb recomposes in place');
  assert.deepEqual(act(CELL_X, CELL_Y, 'stage', undefined, 99), { ok: true, site: st });
  assert.equal(s.poiLedger.get(KEY)!.stage, 3, 'clamped to the ladder top');
  // Ember: a staged wipe without the fight — clear + linger stamped.
  const before = Date.now();
  assert.deepEqual(act(CELL_X, CELL_Y, 'ember'), { ok: true, site: st });
  const r = s.poiLedger.get(KEY)!;
  assert.ok(r.clearedAt !== null && r.clearedAt >= before);
  assert.ok(
    r.emberUntil !== null &&
      r.emberUntil >= before + FRONTIER.emberLingerMs[0] &&
      r.emberUntil <= Date.now() + FRONTIER.emberLingerMs[1],
  );
  assert.equal(s.clearedStamps.length, 1);
  // The verbs refuse honest nothing.
  const empty = mkSlate();
  empty.poiLedger.clear();
  const act2 = (empty as unknown as { poiCellAction: Fn }).poiCellAction.bind(empty);
  assert.deepEqual(act2(9, 9, 'stage'), { ok: false, error: 'this cell holds no site to stage' });
  assert.deepEqual(act2(9, 9, 'ember'), { ok: false, error: 'this cell holds no site to ember' });
});

test('worldSnapshot carries the living state: credits, calm, claimed yards', () => {
  const proto6b = GameServer.prototype as unknown as { worldSnapshot: Fn };
  const s = slate([[KEY, row({ site: site(), stage: 2 })]], { credits: 3 });
  // THE SMALL FINDS lens (lived-in-land Phase 6) reads these maps.
  Object.assign(s, {
    worldSnapshot: proto6b.worldSnapshot,
    findsLive: new Map(),
    minorLedger: new Map(),
  });
  // THE FORESTER'S GLASS (second-growth Phase 6) reads the growth
  // ledger off the world — the slate's fake world carries it too.
  Object.assign(s.world as object, { growthLedger: new Map() });
  s.frontierCalm.set('1,1', Date.now() + 3_600_000);
  s.frontierCalm.set('2,2', Date.now() - 1); // expired — never reported
  s.homesByCharacter.set(7, { x: 100, y: 100 });
  const snap = (s as unknown as { worldSnapshot: Fn }).worldSnapshot.call(s) as {
    credits: number;
    calm: Array<{ cellX: number; cellY: number }>;
    claimRings: Array<{ x: number; y: number; r: number }>;
    cells: Array<{ stage: number; emberUntil: number | null }>;
  };
  assert.equal(snap.credits, 3);
  assert.deepEqual(snap.calm, [{ cellX: 1, cellY: 1, calmUntil: s.frontierCalm.get('1,1')! }]);
  assert.equal(snap.claimRings.length, 1);
  assert.equal(snap.claimRings[0]!.x, 100);
  assert.equal(snap.cells[0]!.stage, 2);
});

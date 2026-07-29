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

const CELL_X = 6;
const CELL_Y = 1; // surface band (y 128..255), deep frontier — never authored
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
    world: { zoneDefs: [] as unknown[] },
    players: new Map<number, { session: unknown; disconnectedAt: number | null }>(),
    positions: new Map<number, { x: number; y: number }>(),
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
    playerWithin: proto.playerWithin,
    authoredCells: proto.authoredCells,
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
  s.positions.set(eid, { x, y });
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
  s.positions.set(1, { x: st.anchorX + FRONTIER.dignityTiles + 20, y: st.anchorY });
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
    poiContext(SETTLED_ANCHORS, [], POI_PREFABS),
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
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS);
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

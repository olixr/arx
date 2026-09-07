import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  FRONTIER,
  GROWTH,
  GROWTH_BARE,
  GROWTH_DRIFTED,
  GROWTH_SCAR,
  POI_PREFABS,
  SETTLED_ANCHORS,
  SURFACE_PLANE,
  SURFACE_PLANE_ID,
  projectGrowth,
  type GrowthRow,
} from '@arx/content';
import { Tile, closedChestTile, openChestTile } from '@arx/shared';
import { GameServer } from './gameServer.js';
import { ChestLedger, PoiLedger, type CalmWindow, type PoiRowInput } from './poiLedger.js';
import { POI_RETIRE_BEATS } from './tuning.js';
import { POI_CELL, poiCellKey, type PoiSite } from '../world/pois.js';
import { WorldSource } from '../world/worldSource.js';
import { config } from '../config.js';

/**
 * THE FRONTIER KEEPS ITS INDEX (core audit 2026-09, Band B): the beat
 * is O(near), not O(ledger²) — satellites answer from the originCell
 * index and agree with the linear scan kept here as the oracle; POI
 * zones retire behind a walking player while carcasses stay; the
 * growth beat's due-index lands the same rows as the whole-ledger walk
 * (kept here as the oracle); the seat cache survives a homeless build
 * and falls on a claim change.
 */

type Fn = (...a: unknown[]) => unknown;
type ProtoName =
  | 'authoredCells' | 'poiCtx' | 'poiCtxBase' | 'claimRings' | 'inClaimRing' | 'calmNear'
  | 'boldCoresNear' | 'stampCalm' | 'standingSatellites' | 'standDownGarrison' | 'poiSpawnFights'
  | 'tickFrontier' | 'rattleSquatDoors' | 'tickRaidDice' | 'dissolveOneEmber' | 'wakeOneFallow'
  | 'stageOnePoi' | 'seedOneSatellite' | 'dissolveOneCapitalEmber' | 'wakeOneCapitalFallow'
  | 'stageOneCapital' | 'seedOneCapitalSatellite' | 'forkOneToll' | 'spendRenewalCredit'
  | 'retirePoiCell' | 'retireFarPois' | 'tickPois' | 'poiCellPristine' | 'tickGrowth' | 'noteClaimBuilt'
  | 'noteHomeChanged' | 'clearCapitalCache' | 'capitalRectsNear';
const proto = GameServer.prototype as unknown as { [K in ProtoName]: Fn };

const SEED = config.worldSeed;

function site(cx: number, cy: number, defId = 'goblin_warcamp'): PoiSite {
  return {
    cellX: cx,
    cellY: cy,
    epoch: 0,
    tier: 3,
    defId,
    prefabId: 'poi_goblin_camp_ring',
    anchorX: cx * POI_CELL + 64,
    anchorY: cy * POI_CELL + 64,
  };
}

function row(over: Partial<PoiRowInput> = {}): PoiRowInput {
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

// ------------------------------------------------ the 5,000-row slate

/** 100×50 cells east of every authored pin: cores, empties, satellites, tolls, fallow. */
function bigLedger(): Array<[string, PoiRowInput]> {
  const rows: Array<[string, PoiRowInput]> = [];
  for (let cy = 0; cy < 50; cy++) {
    for (let cx = 200; cx < 300; cx++) {
      const key = poiCellKey(cx, cy);
      // Column 200 has no western neighbour to be a core: it hosts cores only.
      const k = cx === 200 ? 0 : (cx * 7 + cy * 13) % 20;
      if (k < 12) rows.push([key, row({ site: site(cx, cy) })]);
      else if (k < 15) rows.push([key, row()]);
      else if (k < 18) {
        const core = poiCellKey(cx - 1, cy);
        rows.push([key, row({ site: site(cx, cy), originCell: core })]);
      } else if (k === 18) {
        const core = poiCellKey(cx - 1, cy);
        rows.push([key, row({ site: site(cx, cy, 'road_toll'), originCell: core })]);
      } else rows.push([key, row({ fallowUntil: Date.now() + 3_600_000 })]);
    }
  }
  return rows;
}

function frontierSlate(rows: Array<[string, PoiRowInput]>) {
  const noop = (): void => {};
  const s = {
    poiLedger: new PoiLedger(rows),
    poiLive: new Map<string, { spawnIdx: number[] }>(),
    poiPrefabs: POI_PREFABS,
    world: { zoneDefs: [] as unknown[], builtKeysOf: () => undefined, builtAt: () => undefined },
    get surface() {
      return this.world;
    },
    homesByCharacter: new Map<number, { x: number; y: number }>(),
    ringCache: null as unknown,
    players: new Map(),
    positions: new Map(),
    sessions: new Set(),
    spawnPoints: [] as unknown[],
    frontierCredits: 0,
    frontierCalm: new Map<string, CalmWindow>(),
    discoveredPoiCells: new Set<string>(),
    strongholdLedger: new Map(),
    strongholdLive: new Map(),
    accounts: {
      recordPoiCell: noop,
      saveFrontierCredits: noop,
      markPoiStage: noop,
      setPoiEmber: noop,
      stampFrontierCalm: noop,
      pruneFrontierCalm: noop,
    },
    dangerAnchors: () => SETTLED_ANCHORS,
    fadePoiDiscoveries: noop,
    retirePoiCell: (key: string) => s.poiLive.delete(key),
    rebuildHavens: noop,
    broadcastTrophies: noop,
    playerWithin: () => false,
    authoredCells: proto.authoredCells,
    authoredCellsCache: null as unknown,
    rivalMasterNear: () => false,
    satTrace: [] as string[],
    tollTrace: [] as string[],
    raidTrace: [] as string[],
    lastRaidRollAt: Date.now(),
    poiCtx: proto.poiCtx,
    poiCtxBase: proto.poiCtxBase,
    poiCtxBaseCache: null as unknown,
    capitalRectsNear: () => [],
    claimRings: proto.claimRings,
    inClaimRing: proto.inClaimRing,
    standOnePeddler: () => null,
    calmNear: proto.calmNear,
    boldCoresNear: proto.boldCoresNear,
    stampCalm: proto.stampCalm,
    standingSatellites: proto.standingSatellites,
    standDownGarrison: proto.standDownGarrison,
    poiSpawnFights: proto.poiSpawnFights,
    pushStageRumor: noop,
    tickFrontier: proto.tickFrontier,
    rattleSquatDoors: proto.rattleSquatDoors,
    tickRaidDice: proto.tickRaidDice,
    dissolveOneEmber: proto.dissolveOneEmber,
    wakeOneFallow: proto.wakeOneFallow,
    stageOnePoi: proto.stageOnePoi,
    seedOneSatellite: proto.seedOneSatellite,
    dissolveOneCapitalEmber: proto.dissolveOneCapitalEmber,
    wakeOneCapitalFallow: proto.wakeOneCapitalFallow,
    stageOneCapital: proto.stageOneCapital,
    seedOneCapitalSatellite: proto.seedOneCapitalSatellite,
    forkOneToll: proto.forkOneToll,
    spendRenewalCredit: proto.spendRenewalCredit,
  };
  return s;
}

/** THE ORACLE: the linear scans the index replaced, kept verbatim. */
function oracleSats(ledger: PoiLedger, origin: string): number {
  let n = 0;
  for (const r of ledger.values()) {
    if (r.originCell === origin && r.site !== null && r.emberUntil === null) n++;
  }
  return n;
}
function oracleToll(ledger: PoiLedger, origin: string): boolean {
  for (const r of ledger.values()) {
    if (r.originCell === origin && r.site?.defId === 'road_toll' && r.emberUntil === null) return true;
  }
  return false;
}
function indexToll(ledger: PoiLedger, origin: string): boolean {
  for (const k of ledger.satellitesOf(origin)) {
    const r = ledger.get(k);
    if (r !== undefined && r.site?.defId === 'road_toll' && r.emberUntil === null) return true;
  }
  return false;
}

test('5,000 ledger rows: one tickFrontier beat under 2 ms', () => {
  const s = frontierSlate(bigLedger());
  assert.equal(s.poiLedger.size, 5000);
  for (let i = 0; i < 4; i++) {
    s.frontierCalm.set(poiCellKey(210 + i, 10), { until: Date.now() + 3_600_000, cx: 210 + i, cy: 10 });
  }
  // Warm the JIT and the authored-cell memo, then take the best of five.
  s.tickFrontier.call(s);
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    s.tickFrontier.call(s);
    best = Math.min(best, performance.now() - t0);
  }
  assert.ok(best < 2, `one frontier beat over 5,000 rows took ${best.toFixed(3)} ms`);
  // Nothing in this slate is due: the beat changed no row.
  assert.equal(s.poiLedger.size, 5000);
  assert.equal([...s.poiLedger.values()].filter((r) => r.emberUntil !== null).length, 0);
});

test('satellite and toll lookups equal the linear-scan oracle, through writes and deletes', () => {
  const ledger = new PoiLedger(bigLedger());
  const cores = [...ledger.entries()].filter(([, r]) => r.site !== null && r.originCell === null);
  assert.ok(cores.length > 2000);
  const check = (): void => {
    for (const [key] of cores) {
      assert.equal(proto.standingSatellites.call({ poiLedger: ledger }, key), oracleSats(ledger, key), key);
      assert.equal(indexToll(ledger, key), oracleToll(ledger, key), key);
    }
  };
  check();
  // Rows carry their parsed cell.
  const any = ledger.get('205,3')!;
  assert.equal(any.cx, 205);
  assert.equal(any.cy, 3);
  // A satellite scatters (ember), another is deleted, a third moves
  // its family (re-set under a new origin), a core is re-decided.
  const sats = [...ledger.entries()].filter(([, r]) => r.originCell !== null);
  const [k1, r1] = sats[0]!;
  ledger.set(k1, { ...r1, emberUntil: Date.now() + 1000 });
  ledger.delete(sats[1]![0]);
  const [k3, r3] = sats[2]!;
  ledger.set(k3, { ...r3, originCell: cores[5]![0] });
  const [ck, cr] = cores[0]!;
  ledger.set(ck, { ...cr, site: null, originCell: null });
  check();
  assert.equal(ledger.satellitesOf('nobody').size, 0);
  ledger.clear();
  assert.equal(ledger.satellitesOf(cores[5]![0]).size, 0);
});

test('calm windows carry their cell: calmNear reads regionCells without a split', () => {
  const s = { frontierCalm: new Map<string, CalmWindow>() };
  const now = Date.now();
  s.frontierCalm.set('40,7', { until: now + 60_000, cx: 40, cy: 7 });
  s.frontierCalm.set('90,9', { until: now - 1, cx: 90, cy: 9 }); // expired
  const r = FRONTIER.regionCells;
  assert.equal(proto.calmNear.call(s, 40 + r, 7 - r, now), true);
  assert.equal(proto.calmNear.call(s, 40 + r + 1, 7, now), false);
  assert.equal(proto.calmNear.call(s, 90, 9, now), false);
});

// --------------------------------------- POI zones retire on distance

function walkSlate(rows: Array<[string, PoiRowInput]>) {
  const zoneDefs: Array<{ id: string }> = [];
  const ground = new Map<string, Tile>();
  const world = {
    zoneDefs,
    ground,
    groundAt: (x: number, y: number) => ground.get(`${x},${y}`),
    addZone: (z: { id: string }) => zoneDefs.push(z),
    removeZone: (id: string) => {
      const i = zoneDefs.findIndex((z) => z.id === id);
      if (i !== -1) zoneDefs.splice(i, 1);
    },
  };
  const pos = { plane: SURFACE_PLANE_ID, x: 64, y: 64 };
  const s = {
    poiPrefabs: POI_PREFABS,
    sessions: new Set([{ playerEid: 1 }]),
    positions: new Map([[1, pos]]),
    poiLive: new Map<string, { zoneId?: string; spawnIdx: number[] }>(),
    poiLedger: new PoiLedger(rows),
    poiFarBeats: new Map<string, number>(),
    poiChests: new ChestLedger(),
    spawnPoints: [] as Array<{ active: boolean; eid: number | null; respawnAt: number }>,
    poiCellPristine: proto.poiCellPristine,
    findsLive: new Map(),
    poiSpawnCells: new Map(),
    minorSpawnSlots: new Map(),
    habitatFinds: new Map(),
    authoredCells: () => new Map<string, string>(),
    unloadZone: (id: string) => world.removeZone(id),
    stood: 0,
    materializePoiCell(cx: number, cy: number) {
      const key = poiCellKey(cx, cy);
      const zoneId = `poi:${key}`;
      world.addZone({ id: zoneId });
      s.poiLive.set(key, { zoneId, spawnIdx: [] });
      s.stood++;
      return null;
    },
    retirePoiCell: proto.retirePoiCell,
    retireFarPois: proto.retireFarPois,
    tickPois: proto.tickPois,
    get surface() {
      return world;
    },
    pos,
    zoneDefs,
    ground,
  };
  return s;
}

test('THE HALF-WON CAMP KEEPS ITS STATE: a downed seat on its floor or an open lid holds the cell; settled, it retires', () => {
  const rows: Array<[string, PoiRowInput]> = [[poiCellKey(0, 0), row({ site: site(0, 0) })]];
  const s = walkSlate(rows);
  const far = () => {
    s.pos.x = 40 * POI_CELL + 64;
    s.pos.y = 64;
  };
  const home = () => {
    s.pos.x = 64;
    s.pos.y = 64;
  };
  home();
  for (let b = 0; b < 12; b++) s.tickPois.call(s); // one cell per pass: nine stand the window
  assert.ok(s.poiLive.has('0,0'));
  // Two seats mustered; one is down on a finite floor.
  s.spawnPoints.push({ active: true, eid: 5, respawnAt: 0 }, { active: true, eid: null, respawnAt: Date.now() + 3_600_000 });
  s.poiLive.get('0,0')!.spawnIdx = [0, 1];
  far();
  for (let b = 0; b < POI_RETIRE_BEATS * 3; b++) s.tickPois.call(s);
  assert.ok(s.poiLive.has('0,0'), 'a seat waiting on its floor holds the cell');
  assert.equal(s.poiFarBeats.has('0,0'), false, 'the far count never starts on a half-won camp');
  // The floor passes: the seat is back on the muster clock and the cell is pristine.
  s.spawnPoints[1]!.respawnAt = Date.now() - 1;
  for (let b = 0; b <= POI_RETIRE_BEATS; b++) s.tickPois.call(s);
  assert.equal(s.poiLive.has('0,0'), false, 'a settled cell retires on distance');
  // Stood again, a lifted lid holds it the same way until the reclose clock.
  home();
  for (let b = 0; b < 12; b++) s.tickPois.call(s);
  assert.ok(s.poiLive.has('0,0'));
  s.poiChests.set(`${SURFACE_PLANE_ID}|10,10`, { cell: '0,0' });
  s.ground.set('10,10', openChestTile('wood'));
  far();
  for (let b = 0; b < POI_RETIRE_BEATS * 3; b++) s.tickPois.call(s);
  assert.ok(s.poiLive.has('0,0'), 'an open strongbox holds the cell');
  s.ground.set('10,10', closedChestTile('wood'));
  for (let b = 0; b <= POI_RETIRE_BEATS; b++) s.tickPois.call(s);
  assert.equal(s.poiLive.has('0,0'), false, 'the reclosed lid lets the cell retire');
  assert.equal(s.poiChests.keysOf('0,0'), undefined, 'its override retired with it');
  // A seat pinned to Infinity is the stood-down carcass, not a pending floor.
  assert.equal(
    proto.poiCellPristine.call({ ...s, poiLive: new Map([['9,9', { spawnIdx: [2] }]]), spawnPoints: [...s.spawnPoints, { active: true, eid: null, respawnAt: Number.POSITIVE_INFINITY }] }, '9,9', Date.now()),
    true,
  );
});

test('a player walking 50 cells leaves poiLive/zoneDefs shrinking behind them; carcasses stay', () => {
  const rows: Array<[string, PoiRowInput]> = [];
  for (let cx = -1; cx < 60; cx++) {
    for (let cy = -1; cy <= 1; cy++) {
      const over: Partial<PoiRowInput> = { site: site(cx, cy) };
      if (cx === 5 && cy === 0) over.clearedAt = Date.now() - 1000;
      if (cx === 9 && cy === 0) over.emberUntil = Date.now() + 3_600_000;
      rows.push([poiCellKey(cx, cy), row(over)]);
    }
  }
  const s = walkSlate(rows);
  // Twelve beats per step: nine stand the 3×3 window, the rest count.
  for (let step = 0; step < 50; step++) {
    s.pos.x = step * POI_CELL + 64;
    for (let b = 0; b < 12; b++) s.tickPois.call(s);
  }
  const liveCx = [...s.poiLive.keys()].map((k) => Number(k.split(',')[0]));
  // Far cells (the first forty) retired — all but the two carcasses.
  for (const key of s.poiLive.keys()) {
    const [cx] = key.split(',').map(Number);
    if (cx! <= 38) assert.ok(key === '5,0' || key === '9,0', `cell ${key} should have retired`);
  }
  assert.ok(s.poiLive.has('5,0'), 'the cleared camp stands until its ember clock');
  assert.ok(s.poiLive.has('9,0'), 'the embering camp stands until its ember clock');
  // The player's own window still stands.
  for (const cx of [48, 49]) for (const cy of [-1, 0, 1]) assert.ok(s.poiLive.has(poiCellKey(cx, cy)));
  assert.ok(Math.max(...liveCx) === 50 || Math.max(...liveCx) === 49);
  // zoneDefs shrank with poiLive (every live cell has exactly its zone).
  assert.equal(s.zoneDefs.length, s.poiLive.size);
  assert.ok(s.poiLive.size < 30, `poiLive ${s.poiLive.size} should be a window, not the walk`);
  assert.ok(s.poiFarBeats.size <= s.poiLive.size, 'no counter outlives its cell');
  // Walking back re-stands the retired ground from the ledger.
  s.pos.x = 20 * POI_CELL + 64;
  for (let b = 0; b < 12; b++) s.tickPois.call(s);
  assert.ok(s.poiLive.has('20,0') && s.poiLive.has('19,1') && s.poiLive.has('21,-1'));
});

test('a cell within the retire reach never retires, however many beats pass', () => {
  const rows: Array<[string, PoiRowInput]> = [[poiCellKey(0, 0), row({ site: site(0, 0) })]];
  const s = walkSlate(rows);
  s.pos.x = 64;
  s.pos.y = 64;
  for (let b = 0; b < POI_RETIRE_BEATS * 3; b++) s.tickPois.call(s);
  assert.ok(s.poiLive.has('0,0'));
  assert.equal(s.poiFarBeats.size, 0);
});

// ------------------------------------------ the growth due-index

/** THE ORACLE: the whole-ledger walk the due-index replaced (no loaded chunks, no germination). */
function oldGrowthWalk(world: WorldSource, now: number): void {
  let writes = 0;
  for (const row of world.growthLedger.values()) {
    if (writes >= GROWTH.beatBudget) break;
    if (row.state === GROWTH_DRIFTED) continue;
    const proj = projectGrowth(SEED, row, now);
    if (!proj.ripe && proj.state === row.state) {
      row.due = proj.due;
      continue;
    }
    if (proj.ripe) {
      const truth = world.naturalGround(row.tx, row.ty) as Tile;
      if (row.tile === truth) world.unregisterGrowth(row.tx, row.ty);
      else {
        row.state = GROWTH_DRIFTED;
        row.since = now;
        row.due = null;
      }
    } else {
      row.state = proj.state;
      row.since = proj.stateSince;
      row.due = proj.due;
    }
    writes++;
  }
}

function growthSlate(world: WorldSource) {
  return {
    surface: world,
    accounts: { saveGrowth: () => {}, deleteGrowth: () => {} },
    setWorldTile: () => {
      throw new Error('no chunk is loaded — the beat must not paint');
    },
    bodyOnTile: () => false,
    inClaimRing: () => false,
    growthRand: () => 0.5,
    tickGermination: () => {},
    maybeWander: () => false,
    growthDialPrint: null as string | null,
    germCursor: 0,
  };
}

function scarRows(t0: number): GrowthRow[] {
  const rows: GrowthRow[] = [];
  for (let i = 0; i < 400; i++) {
    // Since-times bunched in eight cohorts so many rows come due on the
    // same beat and the write budget binds (order matters, sets must not).
    const since = t0 - Math.floor(i / 50) * 9 * 60_000;
    const r: GrowthRow = {
      tx: 4000 + (i % 40) * 3,
      ty: 4000 + Math.floor(i / 40) * 3,
      tile: Tile.TreeOak,
      state: GROWTH_SCAR,
      since,
      due: null,
      owner: null,
      firstSeenAt: since,
    };
    r.due = projectGrowth(SEED, r, since).due;
    rows.push(r);
  }
  return rows;
}

test('the growth due-index lands the same rows as the whole-ledger walk over 200 beats', () => {
  const t0 = Date.now();
  const a = new WorldSource(SEED, SURFACE_PLANE, []);
  const b = new WorldSource(SEED, SURFACE_PLANE, []);
  for (const r of scarRows(t0)) a.registerGrowth(r);
  for (const r of scarRows(t0)) b.registerGrowth(r);
  const s = growthSlate(a);
  for (let k = 0; k < 200; k++) {
    const now = t0 + k * 60_000;
    proto.tickGrowth.call(s, now);
    oldGrowthWalk(b, now);
  }
  assert.equal(a.growthLedger.size, b.growthLedger.size);
  let landed = 0;
  for (const [key, ra] of a.growthLedger) {
    const rb = b.growthLedger.get(key);
    assert.ok(rb, `row ${key} present in both`);
    assert.equal(ra.state, rb!.state, `state of ${key}`);
    assert.equal(ra.since, rb!.since, `since of ${key}`);
    assert.equal(ra.due, rb!.due, `due of ${key}`);
    if (ra.state === GROWTH_BARE) landed++;
  }
  assert.equal(landed, 400, 'every stump relaxed to bare ground in both worlds');
  // The dormant list holds exactly the bare-and-unclocked rows; nothing is due.
  assert.equal(a.growthDormantCount, 400);
  assert.equal(a.popGrowthDue(t0 + 500 * 60_000), undefined);
});

test('the due-index follows the visitor and the axe: noteGrowth re-files, unregister drops', () => {
  const t0 = Date.now();
  const w = new WorldSource(SEED, SURFACE_PLANE, []);
  const [r] = scarRows(t0);
  r!.state = GROWTH_BARE;
  r!.due = null;
  w.registerGrowth(r!);
  assert.equal(w.growthDormantCount, 1);
  assert.equal(w.popGrowthDue(t0 + 1e9), undefined, 'dormant ground is not clocked');
  // The visitor checkpoints a sprout deadline → clocked, no longer dormant.
  r!.due = t0 + 60_000;
  w.noteGrowth(r!);
  assert.equal(w.growthDormantCount, 0);
  assert.equal(w.popGrowthDue(t0 + 59_000), undefined);
  assert.equal(w.popGrowthDue(t0 + 61_000), r);
  // Re-filed at a later look (the courtesy defer) — the stale entry is gone.
  w.noteGrowth(r!, t0 + 120_000);
  assert.equal(w.popGrowthDue(t0 + 61_000), undefined);
  assert.equal(w.popGrowthDue(t0 + 121_000), r);
  // The axe (unregister) drops it everywhere.
  w.noteGrowth(r!);
  w.unregisterGrowth(r!.tx, r!.ty);
  assert.equal(w.popGrowthDue(t0 + 1e9), undefined);
  assert.equal(w.growthDormantCount, 0);
});

// ---------------------------------------- the seat cache's one input

test('capitalCache survives a homeless build and clears on a claim change', () => {
  const fill = () => ({
    capitalCache: new Map([['1,1', null]]),
    capitalRectsCache: new Map([['0,0,1,1', []]]),
    homesByCharacter: new Map([[7, { x: 0, y: 0 }]]),
    ringCache: [] as unknown,
    noteClaimBuilt: proto.noteClaimBuilt,
    noteHomeChanged: proto.noteHomeChanged,
    clearCapitalCache: proto.clearCapitalCache,
  });
  const a = fill();
  proto.noteClaimBuilt.call(a, 99); // no hearth — no ring moved
  assert.equal(a.capitalCache.size, 1);
  assert.equal(a.capitalRectsCache.size, 1);
  assert.notEqual(a.ringCache, null);
  proto.noteClaimBuilt.call(a, 7); // the homeowner's build may grow their ring
  assert.equal(a.capitalCache.size, 0);
  assert.equal(a.capitalRectsCache.size, 0);
  assert.equal(a.ringCache, null);
  const b = fill();
  proto.noteHomeChanged.call(b, 8, { x: 5, y: 5 });
  assert.equal(b.capitalCache.size, 0);
  assert.equal(b.capitalRectsCache.size, 0);
  assert.ok(b.homesByCharacter.has(8));
});

test('capitalRectsNear answers a lattice window once', () => {
  let seatCalls = 0;
  const s = {
    capitalCache: new Map(),
    capitalRectsCache: new Map(),
    cachedSeat: (gx: number, gy: number) => {
      seatCalls++;
      return gx === 0 && gy === 0 ? { rect: { x: 0, y: 0, w: 10, h: 10 } } : null;
    },
  };
  const first = proto.capitalRectsNear.call(s, 0, 0, 1, 1) as unknown[];
  const calls = seatCalls;
  assert.ok(calls > 0);
  const again = proto.capitalRectsNear.call(s, 3, 3, 1, 1) as unknown[];
  assert.equal(again, first, 'the same window answers the same array');
  assert.equal(seatCalls, calls, 'no seat re-derived');
  proto.clearCapitalCache.call(s);
  proto.capitalRectsNear.call(s, 0, 0, 1, 1);
  assert.ok(seatCalls > calls, 'a cleared cache re-derives');
});

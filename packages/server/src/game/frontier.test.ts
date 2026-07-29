import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONTIER,
  POI_PREFABS,
  SETTLED_ANCHORS,
  emberLingerFor,
  fallowRestFor,
} from '@arx/content';
import { GameServer } from './gameServer.js';
import { poiCellKey, poiContext, poiForCell, type PoiSite } from '../world/pois.js';
import { config } from '../config.js';

/**
 * THE FRONTIER CLOCK's laws, pinned (the living frontier, phase 1):
 * an ember dissolves only when due, unwatched, and unauthored — and
 * leaves the cell fallow with one renewal credit banked; a fallow
 * cell wakes to a FRESH roll on its post-dissolve epoch; a renewal
 * credit only ever stands lawful ground, and refuses to be spent
 * blind. Private methods over a hand-built slate (the poiWard
 * pattern — GameServer needs no construction).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  dissolveOneEmber: Fn;
  wakeOneFallow: Fn;
  spendRenewalCredit: Fn;
  playerWithin: Fn;
  authoredCells: Fn;
};

interface LedgerRow {
  epoch: number;
  site: PoiSite | null;
  clearedAt: number | null;
  emberUntil: number | null;
  fallowUntil: number | null;
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

/** The minimal GameServer slate the frontier methods actually touch. */
function slate(rows: Array<[string, LedgerRow]>, opts: { credits?: number } = {}) {
  const recorded: Array<{ cx: number; cy: number; epoch: number; site: unknown; fallow: unknown }> =
    [];
  const savedCredits: number[] = [];
  const faded: string[] = [];
  const retired: string[] = [];
  const s = {
    poiLedger: new Map(rows),
    poiLive: new Map<string, { spawnIdx: number[] }>(),
    poiPrefabs: POI_PREFABS,
    world: { zoneDefs: [] as unknown[] },
    players: new Map<number, { session: unknown; disconnectedAt: number | null }>(),
    positions: new Map<number, { x: number; y: number }>(),
    frontierCredits: opts.credits ?? 0,
    accounts: {
      recordPoiCell: (cx: number, cy: number, epoch: number, st: unknown, fallow: unknown = null) =>
        recorded.push({ cx, cy, epoch, site: st, fallow }),
      saveFrontierCredits: (n: number) => savedCredits.push(n),
    },
    dangerAnchors: () => SETTLED_ANCHORS,
    fadePoiDiscoveries: (key: string) => faded.push(key),
    retirePoiCell: (key: string) => retired.push(key),
    rebuildHavens: () => {},
    playerWithin: proto.playerWithin,
    authoredCells: proto.authoredCells,
    recorded,
    savedCredits,
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
  // Different epochs draw different clocks (almost surely — pinned
  // for this seed/cell so a stream regression is caught).
  assert.notEqual(
    emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 0),
    emberLingerFor(config.worldSeed, CELL_X, CELL_Y, 1),
  );
});

test('a due ember dissolves: fade, retire, epoch+1, fallow rest, one credit banked', () => {
  const now = Date.now();
  const s = slate([
    [KEY, { epoch: 2, site: site({ epoch: 2 }), clearedAt: now - 600_000, emberUntil: now - 1000, fallowUntil: null }],
  ]);
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
  assert.deepEqual(s.faded, [KEY]);
  assert.deepEqual(s.retired, [KEY]);
  const row = s.poiLedger.get(KEY)!;
  assert.equal(row.site, null);
  assert.equal(row.epoch, 3);
  assert.equal(row.clearedAt, null);
  assert.equal(row.emberUntil, null);
  assert.ok(
    row.fallowUntil !== null &&
      row.fallowUntil >= now + FRONTIER.fallowMs[0] &&
      row.fallowUntil <= now + FRONTIER.fallowMs[1],
  );
  assert.equal(s.frontierCredits, 1);
  assert.deepEqual(s.savedCredits, [1]);
  // The DB write mirrors the ledger: decided-empty WITH the rest clock.
  assert.equal(s.recorded.length, 1);
  assert.equal(s.recorded[0]!.site, null);
  assert.equal(s.recorded[0]!.fallow, row.fallowUntil);
  // Nothing left due — the next pass is quiet.
  assert.equal(proto.dissolveOneEmber.call(s, now), false);
});

test('dignity: an ember never dissolves in front of someone', () => {
  const now = Date.now();
  const st = site();
  const s = slate([
    [KEY, { epoch: 0, site: st, clearedAt: now - 600_000, emberUntil: now - 1000, fallowUntil: null }],
  ]);
  addPlayer(s, 1, st.anchorX + FRONTIER.dignityTiles - 2, st.anchorY);
  assert.equal(proto.dissolveOneEmber.call(s, now), false);
  assert.equal(s.poiLedger.get(KEY)!.site, st);
  assert.equal(s.faded.length, 0);
  // The witness walks away — the fade happens between glances.
  s.positions.set(1, { x: st.anchorX + FRONTIER.dignityTiles + 20, y: st.anchorY });
  assert.equal(proto.dissolveOneEmber.call(s, now), true);
});

test('an ember not yet due, and an authored ember, both stand', () => {
  const now = Date.now();
  const authored = proto.authoredCells.call({}) as Map<string, string>;
  const authoredKey = [...authored.keys()][0]!;
  const [ax, ay] = authoredKey.split(',').map(Number);
  const s = slate([
    [KEY, { epoch: 0, site: site(), clearedAt: now - 1000, emberUntil: now + 60_000, fallowUntil: null }],
    [
      authoredKey,
      {
        epoch: 0,
        site: site({ cellX: ax!, cellY: ay! }),
        clearedAt: now - 600_000,
        emberUntil: now - 1000,
        fallowUntil: null,
      },
    ],
  ]);
  assert.equal(proto.dissolveOneEmber.call(s, now), false);
  assert.equal(s.faded.length, 0);
});

test('a rested fallow cell wakes to the SAME roll poiForCell decides', () => {
  const now = Date.now();
  const epoch = 3;
  const s = slate([
    [KEY, { epoch, site: null, clearedAt: null, emberUntil: null, fallowUntil: now - 1000 }],
  ]);
  s.poiLive.set(KEY, { spawnIdx: [] });
  assert.equal(proto.wakeOneFallow.call(s, now), true);
  const row = s.poiLedger.get(KEY)!;
  assert.equal(row.fallowUntil, null);
  const expected = poiForCell(
    config.worldSeed,
    CELL_X,
    CELL_Y,
    epoch,
    poiContext(SETTLED_ANCHORS, [], POI_PREFABS),
  );
  assert.deepEqual(row.site, expected);
  if (expected !== null) {
    // The stale empty poiLive entry is dropped so tickPois re-stands it.
    assert.equal(s.poiLive.has(KEY), false);
  }
  // A cell still resting is left alone.
  const s2 = slate([
    [KEY, { epoch, site: null, clearedAt: null, emberUntil: null, fallowUntil: now + 60_000 }],
  ]);
  assert.equal(proto.wakeOneFallow.call(s2, now), false);
});

test('renewal refusals: no credits, or nobody on the surface, spends nothing', () => {
  const now = Date.now();
  const s = slate([], { credits: 0 });
  addPlayer(s, 1, 832, 192);
  assert.equal(proto.spendRenewalCredit.call(s, now), false);
  const s2 = slate([], { credits: 2 });
  assert.equal(proto.spendRenewalCredit.call(s2, now), false);
  assert.equal(s2.frontierCredits, 2);
  assert.equal(s2.savedCredits.length, 0);
});

test('a spent credit stands lawful ground: offscreen, unauthored, debt paid down', () => {
  const now = Date.now();
  const s = slate([], { credits: 1 });
  addPlayer(s, 1, 832, 192); // deep frontier, open procgen country
  const authored = proto.authoredCells.call({}) as Map<string, string>;
  // Random bearings: retry the pass until a candidate lands (each call
  // probes FRONTIER.renewalTries cells; the loop bounds flake, the
  // assertions carry the law).
  let stood = false;
  for (let i = 0; i < 50 && !stood; i++) {
    stood = proto.spendRenewalCredit.call(s, now) as boolean;
  }
  assert.equal(stood, true, 'no renewal candidate found in 50 passes');
  assert.equal(s.frontierCredits, 0);
  assert.deepEqual(s.savedCredits, [0]);
  assert.equal(s.recorded.length, 1);
  const rec = s.recorded[0]!;
  assert.notEqual(rec.site, null);
  assert.equal(authored.has(poiCellKey(rec.cx, rec.cy)), false);
  const row = s.poiLedger.get(poiCellKey(rec.cx, rec.cy))!;
  assert.ok(row.site !== null);
  // Never in front of anyone: the anchor keeps its dignity distance.
  const d = Math.hypot(row.site.anchorX - 832, row.site.anchorY - 192);
  assert.ok(d >= FRONTIER.dignityTiles, `anchor stood ${d.toFixed(1)} tiles from the player`);
  // The epoch bumped past the prior decision (fresh streams).
  assert.equal(row.epoch, rec.epoch);
  assert.ok(row.epoch >= 1);
});

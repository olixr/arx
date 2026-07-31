import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_SKIP } from '@arx/shared';
import { POI_DEFS, POI_PREFABS, validatePoiDef } from '@arx/content';
import { GameServer } from '../game/gameServer.js';
import {
  composePoi,
  compoundExtent,
  poiForCell,
  poiScanOrder,
  type PoiContext,
  type PoiSite,
} from './pois.js';

const SEED = 1337;

/**
 * THE WAR-GROUND's laws, pinned (lived-in-land Phase 4): promotion is
 * its own stream behind the caller's region gate, compounds compose
 * deterministically with honest wing skips and stage-stable prefixes,
 * the perimeter stays silent, and a wing falls as its own chapter.
 */

/** Deep-frontier context: a tiny hearth so every scanned cell runs hot. */
const CTX: PoiContext = {
  anchors: [{ x: 0, y: 0, safeR: 8 }],
  zoneRects: [],
  claimRings: [],
  defs: [
    POI_DEFS.get('goblin_warcamp')!,
    POI_DEFS.get('wolfkin_den')!,
    POI_DEFS.get('champions_tor')!,
    POI_DEFS.get('goblin_warhold')!,
  ],
  minors: [],
  prefabs: POI_PREFABS,
};

function scan(allowHold: boolean, max = 120): PoiSite[] {
  const out: PoiSite[] = [];
  let looked = 0;
  for (const { cx, cy } of poiScanOrder(8)) {
    if (looked >= max) break;
    looked++;
    const site = poiForCell(SEED, cx, cy, 0, CTX, undefined, allowHold);
    if (site) out.push(site);
  }
  return out;
}

test('promotion: gated by the caller, dealt on its own stream', () => {
  const closed = scan(false);
  const open = scan(true);
  assert.ok(closed.length > 10, 'the deep scan went empty');
  assert.ok(
    closed.every((s) => s.defId !== 'goblin_warhold'),
    'a hold promoted through a CLOSED gate',
  );
  const holds = open.filter((s) => s.defId === 'goblin_warhold');
  assert.ok(holds.length >= 1, 'no hold promoted across 120 hot cells — the stream is dead');
  assert.ok(
    holds.length <= open.length * 0.5,
    `${holds.length}/${open.length} promoted — holds must stay scarce`,
  );
  // Independence: a cell that did NOT promote decides identically
  // whether or not the gate was open (the named-streams law).
  const promotedKeys = new Set(holds.map((s) => `${s.cellX},${s.cellY}`));
  for (const s of closed) {
    if (promotedKeys.has(`${s.cellX},${s.cellY}`)) continue;
    const twin = open.find((o) => o.cellX === s.cellX && o.cellY === s.cellY);
    assert.deepEqual(twin, s, `cell ${s.cellX},${s.cellY} reshuffled under the gate`);
  }
});

/** First promoted hold site in the open scan. */
function holdSite(): PoiSite {
  const s = scan(true).find((x) => x.defId === 'goblin_warhold');
  assert.ok(s, 'no hold in the scan');
  return s!;
}

test('the compound composes deterministically, wings tagged, prefix stage-stable', () => {
  const site = holdSite();
  const z0 = composePoi(SEED, site, CTX, 0)!;
  const z0b = composePoi(SEED, site, CTX, 0)!;
  assert.deepEqual(z0.ground, z0b.ground, 'compound ground re-rolled');
  assert.deepEqual(z0.spawns, z0b.spawns, 'compound muster re-rolled');
  const wingSpawns = (z0.spawns ?? []).filter((s) => s.wing !== undefined);
  assert.ok(wingSpawns.length >= 2, 'a war-ground with no wing bodies is just a camp');
  const wingIds = new Set(wingSpawns.map((s) => s.wing));
  assert.ok(wingIds.size >= 1, 'wing tags collapsed');
  // The whole compound sits within its declared extent of the anchor.
  const def = POI_DEFS.get('goblin_warhold')!;
  const court = CTX.prefabs.get(site.prefabId)!;
  const reach = compoundExtent(def, court, CTX) + 2;
  for (const s of z0.spawns ?? []) {
    if (s.patrol) continue; // ring watchers walk the outer round
    assert.ok(
      Math.hypot(s.x - site.anchorX, s.y - site.anchorY) <= reach + 6,
      `a body stands ${Math.hypot(s.x - site.anchorX, s.y - site.anchorY).toFixed(1)} out — past the extent`,
    );
  }
  // Stages append, never reshuffle: the stage-2 muster begins with the
  // stage-0 muster verbatim, and the walk only ever gains ground.
  const z2 = composePoi(SEED, site, CTX, 2)!;
  assert.deepEqual(
    (z2.spawns ?? []).slice(0, (z0.spawns ?? []).length),
    z0.spawns,
    'stage 2 reshuffled the standing hold',
  );
  // The perimeter law holds at compound scale.
  for (let x = 0; x < z0.width; x++) {
    assert.equal(z0.ground[x], TILE_SKIP, `top perimeter leaks at ${x}`);
    assert.equal(z0.ground[(z0.height - 1) * z0.width + x], TILE_SKIP, 'bottom leaks');
  }
  for (let y = 0; y < z0.height; y++) {
    assert.equal(z0.ground[y * z0.width], TILE_SKIP, 'left leaks');
    assert.equal(z0.ground[y * z0.width + z0.width - 1], TILE_SKIP, 'right leaks');
  }
});

test('wing-skip honesty: missing wing prefabs compose a court-only hold, never a crash', () => {
  const site = holdSite();
  const bare: PoiContext = { ...CTX, prefabs: new Map([[site.prefabId, CTX.prefabs.get(site.prefabId)!]]) };
  const z = composePoi(SEED, site, bare, 0)!;
  assert.ok(z, 'the court alone must still stand');
  assert.equal(
    (z.spawns ?? []).filter((s) => s.wing !== undefined).length,
    0,
    'wing bodies mustered without wing ground',
  );
});

// ------------------------------------------------- the chapter line
// (the poiWard slate dialect over private methods)

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  noteHoldWing: Fn;
  poiSpawnFights: Fn;
  holdsNear: Fn;
};

interface FakeSpawn {
  npc: string;
  eid: number | null;
  respawnAt: number;
  active: boolean;
  x: number;
  y: number;
  wing?: number;
}

function wingSlate(spawns: FakeSpawn[]) {
  const sends: string[] = [];
  const session = { sendJson: (m: { text: string }) => sends.push(m.text) };
  return {
    spawnPoints: spawns,
    poiSpawnCells: new Map(spawns.map((_, i) => [i, '2,2'])),
    poiLive: new Map([
      ['2,2', { spawnIdx: spawns.map((_, i) => i), fighters: new Set([77]) }],
    ]),
    poiLedger: new Map([
      ['2,2', { site: { anchorX: 100, anchorY: 100 } }],
    ]),
    characterEids: new Map([[77, 9]]),
    players: new Map([
      [5, { session }],
      [9, { session }],
    ]),
    poiSpawnFights: proto.poiSpawnFights,
    sends,
  };
}

const body = (over: Partial<FakeSpawn> = {}): FakeSpawn => ({
  npc: 'goblin',
  eid: null,
  respawnAt: 0,
  active: true,
  x: 100,
  y: 88,
  ...over,
});

test('a wing falls as its own chapter, once, and only while the hold still stands', () => {
  // Wing 1 down (both bodies dead), the court still stands.
  const s = wingSlate([
    body({ wing: 1 }),
    body({ wing: 1 }),
    body({ eid: 3 }), // the court
  ]);
  proto.noteHoldWing.call(s, 0, 5);
  assert.equal(s.sends.length, 2, 'killer and fighter both hear the chapter');
  assert.ok(s.sends[0]!.includes('goes quiet'), s.sends[0]);
  // Dedupe: the same wing never speaks twice.
  proto.noteHoldWing.call(s, 1, 5);
  assert.equal(s.sends.length, 2, 'the chapter line re-fired');
});

test('the last body overall stays silent — the clear ceremony speaks instead', () => {
  const s = wingSlate([body({ wing: 1 }), body({ wing: 1 })]);
  proto.noteHoldWing.call(s, 0, 5);
  assert.equal(s.sends.length, 0, 'the wing line spoke over the wipe ceremony');
});

test('a standing wing body keeps its chapter open', () => {
  const s = wingSlate([body({ wing: 1 }), body({ wing: 1, eid: 4 }), body({ eid: 3 })]);
  proto.noteHoldWing.call(s, 0, 5);
  assert.equal(s.sends.length, 0, 'the chapter closed while a defender stood');
});

test('THE REGION LAW: one hold per neighborhood, read from the ledger', () => {
  const mk = (defId: string) => ({ site: { defId } });
  const slate = {
    poiLedger: new Map([['3,2', mk('goblin_warhold')]]),
  };
  assert.equal(proto.holdsNear.call(slate, 2, 2), true, 'the neighbor hold went unseen');
  assert.equal(proto.holdsNear.call(slate, 8, 8), false, 'a distant hold blocked the region');
  const camps = { poiLedger: new Map([['3,2', mk('goblin_warcamp')]]) };
  assert.equal(proto.holdsNear.call(camps, 2, 2), false, 'an ordinary camp read as a hold');
});

test('the validator refuses the dishonest compound, by class', () => {
  const base = {
    id: 'test_hold',
    name: 'Test hold',
    tiers: [3, 5],
    weight: 1,
    prefabs: ['poi_warhold_court'],
    garrison: [{ npc: 'goblin', count: [1, 1], role: 'holdfast' }],
    compound: {
      wings: { pool: ['poi_goblin_camp_ring'], count: [2, 3] },
      wingGarrison: [{ npc: 'goblin', count: [1, 2], role: 'holdfast' }],
    },
  };
  assert.ok(validatePoiDef(base).ok, 'the base hold must pass');
  const bad = (patch: Record<string, unknown>, needle: string): void => {
    const res = validatePoiDef({ ...base, ...patch });
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    if (!res.ok) {
      assert.ok(
        res.errors.some((e) => e.includes(needle)),
        `errors mention ${needle}: ${res.errors.join(' | ')}`,
      );
    }
  };
  bad({ compound: { wings: { pool: [], count: [2, 3] }, wingGarrison: base.compound.wingGarrison } }, 'wings.pool');
  bad({ compound: { wings: { pool: ['x'], count: [0, 3] }, wingGarrison: base.compound.wingGarrison } }, 'wings.count');
  bad({ compound: { wings: base.compound.wings, wingGarrison: [] } }, 'wingGarrison');
  bad({ garrison: [] }, 'court garrison');
  bad({ weight: 0 }, 'promotion pick weight');
  bad(
    { actors: [{ pool: ['wayfarer_senna'], post: 'hearth' }] },
    'hostile by definition',
  );
  const badSat = validatePoiDef({
    ...base,
    boldness: {
      stages: [{ garrison: [{ npc: 'goblin', count: [1, 1], role: 'holdfast' }] }],
      satelliteDef: 'goblin_warcamp',
    },
  });
  assert.ok(!badSat.ok && badSat.errors.some((e) => e.includes('satellites: true')));
});

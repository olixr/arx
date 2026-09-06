import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORED_WILD_SITES,
  POI_PREFABS,
  SETTLED_ANCHORS,
  WORLD_SEED,
  buildAmberford,
  buildAshlamp,
  buildDawnmead,
  buildEvenfall,
  buildFenside,
  buildHartfell,
  buildKingsdelf,
  buildLowhall,
  buildPicket,
  buildPinewatch,
  buildSaltmere,
  buildSilverfall,
  buildTurnoff,
  buildUndercroft,
  buildWardthread,
} from '@arx/content';
import type { PoiSite } from '../world/pois.js';
import { poiCellKey, poiContext, poiForCell } from '../world/pois.js';
import { GameServer } from './gameServer.js';

/**
 * THE AUTHORED CELL IS GEOLOGIC TOO (contested lands band 8, the
 * integrator's boot proof). A cell-pinned authored site is dealt by
 * its cell's streams, and those streams are keyed by the ledger
 * epoch; the seeder bumps the epoch on every plan re-decision (a
 * stored prefab that left the pool, a re-pinned sketch, a changed
 * archetype), so a LIVE ledger stood the re-pinned veil den at
 * (-201,-100) where a fresh box stands it at (-186,-99). The seeder
 * now reads the plan's cell at epoch 0 on every box and stamps the
 * bumped epoch on the site it stands, so THE GOLDEN ANCHORS is the
 * deploy's truth and the re-decision's muster streams stay fresh.
 * The private seeder runs here over a hand-built slate that holds
 * the band 7 ledger for the four north cells.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as { seedAuthoredSites: Fn };

const DEN_KEY = poiCellKey(-2, -1);
const HUSK_KEY = poiCellKey(-1, -2);
const FELLING_KEY = poiCellKey(0, -1);
const FORK_KEY = poiCellKey(-2, -2);

interface Row {
  epoch: number;
  site: PoiSite | null;
  clearedAt: number | null;
  emberUntil: number | null;
  fallowUntil: number | null;
  stage: number;
  stageAt: number | null;
  originCell: string | null;
}

const row = (site: PoiSite): Row => ({
  epoch: site.epoch,
  site,
  clearedAt: null,
  emberUntil: null,
  fallowUntil: null,
  stage: 0,
  stageAt: null,
  originCell: null,
});

/** The band 7 ledger for the north: the den as `wolfkin_den` on its rolled sketch, the husk and the Felling on the shipped sketches, the fork rest standing true. */
function band7Ledger(): Map<string, Row> {
  return new Map([
    [DEN_KEY, row({ cellX: -2, cellY: -1, epoch: 0, tier: 2, defId: 'wolfkin_den', prefabId: 'poi_den_bones', anchorX: -186, anchorY: -99 })],
    [HUSK_KEY, row({ cellX: -1, cellY: -2, epoch: 0, tier: 2, defId: 'husk_of_the_line', prefabId: 'poi_watchtower_husk', anchorX: -64, anchorY: -240 })],
    [FELLING_KEY, row({ cellX: 0, cellY: -1, epoch: 0, tier: 2, defId: 'felling_drum', prefabId: 'poi_goblin_stockade', anchorX: 80, anchorY: -42 })],
    [FORK_KEY, row({ cellX: -2, cellY: -2, epoch: 0, tier: 2, defId: 'fork_waystation', prefabId: 'poi_fork_waystation', anchorX: -150, anchorY: -165 })],
  ]);
}

const zones = [
  buildDawnmead(), buildAmberford(), buildSilverfall(), buildSaltmere(), buildPinewatch(),
  buildHartfell(), buildKingsdelf(), buildEvenfall(), buildUndercroft(), buildLowhall(),
  buildAshlamp(), buildFenside(), buildWardthread(), buildPicket(), buildTurnoff(),
];
const ctx = poiContext(SETTLED_ANCHORS, zones, POI_PREFABS, [], []);

/** The minimal GameServer slate the seeder touches. */
function slate(ledger: Map<string, Row>) {
  const recorded: Array<{ cellX: number; cellY: number; epoch: number; prefabId: string | null }> = [];
  return {
    poiPrefabs: POI_PREFABS,
    poiLedger: ledger,
    poiCtx: () => ctx,
    accounts: {
      recordPoiCell: (cellX: number, cellY: number, epoch: number, site: { prefabId: string } | null) =>
        recorded.push({ cellX, cellY, epoch, prefabId: site?.prefabId ?? null }),
      healPoiCleared: () => {},
    },
    fadePoiDiscoveries: () => {},
    retirePoiCell: () => {},
    rebuildHavens: () => {},
    recorded,
  };
}

/** The seeder narrates every site; the slate keeps the boot lines and hands back the north's. */
function seed(s: ReturnType<typeof slate>): string[] {
  const lines: string[] = [];
  const log = console.log;
  const warn = console.warn;
  console.log = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
  console.warn = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
  try {
    proto.seedAuthoredSites.call(s);
  } finally {
    console.log = log;
    console.warn = warn;
  }
  return lines.filter((l) => /'(veil_den|husk_of_the_line|felling_drum|fork_rest)'/.test(l));
}

test('THE AUTHORED CELL IS GEOLOGIC TOO: the epoch moves a cell pin\'s roll, which is why the seeder reads the plan\'s cell at epoch 0', () => {
  const want = AUTHORED_WILD_SITES.find((s) => s.id === 'veil_den')!;
  assert.deepEqual(want.cell, [-2, -1]);
  const at = (epoch: number) => {
    const s = poiForCell(WORLD_SEED, -2, -1, epoch, ctx, want.defId, false, want.prefabId)!;
    assert.ok(s, `epoch ${epoch}: the den cell stands nothing`);
    return [s.anchorX, s.anchorY];
  };
  assert.deepEqual(at(0), [-186, -99], 'the golden anchor at epoch 0');
  assert.notDeepEqual(at(1), at(0), 'epoch 1 deals the den another site (the boot proof read (-201,-100))');
  assert.notDeepEqual(at(2), at(0), 'epoch 2 deals the den another site again (the boot proof read (-178,-99))');
});

test('THE AUTHORED CELL IS GEOLOGIC TOO: a plan re-decision on a live ledger stands the re-pinned den on its golden anchor, bumps the epoch, and leaves the fork rest\'s row alone', () => {
  const s = slate(band7Ledger());
  const lines = seed(s);
  // The den: a different archetype held the cell (the silent retire) —
  // the re-decision stands `veil_den` on `poi_veil_den` at the golden
  // anchor, at epoch 1, and the site carries the bumped epoch for the
  // muster streams.
  const den = s.poiLedger.get(DEN_KEY)!;
  assert.equal(den.epoch, 1, 'the den row bumps its epoch on the re-decision');
  assert.ok(den.site, 'the den stands');
  assert.equal(den.site!.defId, 'veil_den');
  assert.equal(den.site!.prefabId, 'poi_veil_den');
  assert.equal(den.site!.epoch, 1, 'the site carries the bumped epoch (fresh muster)');
  assert.deepEqual([den.site!.anchorX, den.site!.anchorY], [-186, -99], 'the deploy stands the den where the fresh box does');
  assert.ok(lines.some((l) => /'veil_den' \(veil_den\) stands at -186,-99/.test(l)), `the boot line: ${lines.join(' | ')}`);
  // The husk and the Felling: stale prefabs (the pool no longer lists
  // them) — the re-seed line prints and the pinned anchors hold.
  for (const [key, id, x, y, prefabId] of [
    [HUSK_KEY, 'husk_of_the_line', -64, -240, 'poi_husk_of_the_line'],
    [FELLING_KEY, 'felling_drum', 80, -42, 'poi_felling_drum'],
  ] as const) {
    const r = s.poiLedger.get(key)!;
    assert.equal(r.epoch, 1, `${id}: the row bumps`);
    assert.equal(r.site!.prefabId, prefabId, `${id}: stands the new sketch`);
    assert.deepEqual([r.site!.anchorX, r.site!.anchorY], [x, y], `${id}: on its pin`);
    assert.ok(lines.some((l) => l.includes(`'${id}': stored prefab left the library — re-seeding`)), `${id}: the re-seed line`);
  }
  // The fork rest: same id, same sketch — standing true, no line, no bump.
  const fork = s.poiLedger.get(FORK_KEY)!;
  assert.equal(fork.epoch, 0, 'the fork rest\'s row is untouched');
  assert.deepEqual([fork.site!.anchorX, fork.site!.anchorY], [-150, -165]);
  assert.ok(!lines.some((l) => /'fork_rest'/.test(l)), `no line for [-2,-2]: ${lines.join(' | ')}`);
  assert.ok(!s.recorded.some((r) => r.cellX === -2 && r.cellY === -2), 'the fork rest\'s row is not rewritten');
  assert.equal(lines.filter((l) => l.includes('re-seeding')).length, 2, 'exactly the two stale sketches re-seed; the den\'s changed archetype retires silently');
});

test('THE AUTHORED CELL IS GEOLOGIC TOO: the brief\'s repinned shape (same archetype, another sketch) re-seeds the den on its golden anchor too', () => {
  const ledger = band7Ledger();
  ledger.set(DEN_KEY, row({ cellX: -2, cellY: -1, epoch: 3, tier: 2, defId: 'veil_den', prefabId: 'poi_den_hollow', anchorX: -201, anchorY: -100 }));
  const s = slate(ledger);
  const lines = seed(s);
  const den = s.poiLedger.get(DEN_KEY)!;
  assert.equal(den.epoch, 4);
  assert.equal(den.site!.epoch, 4);
  assert.equal(den.site!.prefabId, 'poi_veil_den');
  assert.deepEqual([den.site!.anchorX, den.site!.anchorY], [-186, -99], 'epoch 4 on the row, epoch 0 for the ground');
  assert.ok(lines.some((l) => /'veil_den': .*re-seeding/.test(l)), `the den's re-seed line: ${lines.join(' | ')}`);
});

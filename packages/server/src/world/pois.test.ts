import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_SKIP, chestInfo } from '@devcraft/shared';
import {
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  dangerLaw,
} from '@devcraft/content';
import { DARK_BAND_Y, groundProbeAt } from './worldgen.js';
import {
  POI_CELL,
  composePoi,
  poiForCell,
  previewPoi,
  simulatePois,
  type PoiContext,
  type PoiSite,
} from './pois.js';

const SEED = 1337;
const CTX: PoiContext = {
  anchors: SETTLED_ANCHORS,
  zoneRects: [
    { x: 0, y: 0, w: 96, h: 96 }, // bramblewick
    { x: 120, y: 8, w: 24, h: 24 }, // hollow stair
  ],
  defs: [...POI_DEFS.values()],
  prefabs: POI_PREFABS,
};

const SCAN = 7; // cells −7..7 in both axes

function scanSites(): PoiSite[] {
  const sites: PoiSite[] = [];
  for (let cy = -SCAN; cy <= SCAN; cy++) {
    for (let cx = -SCAN; cx <= SCAN; cx++) {
      const site = poiForCell(SEED, cx, cy, 0, CTX);
      if (site) sites.push(site);
    }
  }
  return sites;
}

test('the scaffold is deterministic', () => {
  assert.deepEqual(scanSites(), scanSites());
});

test('the frontier hosts POIs and every archetype occurs', () => {
  const sites = scanSites();
  assert.ok(sites.length >= 8, `only ${sites.length} sites in the scan`);
  const kinds = new Set(sites.map((s) => s.defId));
  for (const def of POI_DEFS.values()) {
    assert.ok(kinds.has(def.id), `archetype '${def.id}' never rolled in the scan`);
  }
});

test('every site stands on flat standable ground, clear of zones and the dark band', () => {
  for (const site of scanSites()) {
    const prefab = POI_PREFABS.get(site.prefabId)!;
    const fx0 = site.anchorX - Math.floor(prefab.width / 2);
    const fy0 = site.anchorY - Math.floor(prefab.height / 2);
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const cls = groundProbeAt(SEED, fx0 + dx, fy0 + dy);
        assert.ok(
          cls === 'grass' || cls === 'forest',
          `${site.defId}@${site.cellX},${site.cellY}: footprint tile is '${cls}'`,
        );
      }
    }
    assert.ok(fy0 + prefab.height < DARK_BAND_Y, 'footprint reaches the dark band');
    for (const r of CTX.zoneRects) {
      const clear =
        fx0 >= r.x + r.w || fx0 + prefab.width <= r.x ||
        fy0 >= r.y + r.h || fy0 + prefab.height <= r.y;
      assert.ok(clear, `${site.defId} footprint overlaps a zone rect`);
    }
  }
});

test('composed zones muster inside the tier laws', () => {
  for (const site of scanSites()) {
    const zone = composePoi(SEED, site, CTX)!;
    assert.ok(zone, 'compose failed for a decided site');
    assert.ok(zone.spawns && zone.spawns.length > 0, `${zone.id} has no garrison`);
    const def = POI_DEFS.get(site.defId)!;
    const law = dangerLaw(site.tier);
    const maxOffset = Math.max(0, ...def.garrison.map((g) => g.levelOffset ?? 0));
    for (const s of zone.spawns) {
      assert.ok(s.level !== undefined, `${zone.id} spawn '${s.npc}' has no level`);
      assert.ok(
        s.level! >= law.npcLevel[0] && s.level! <= law.npcLevel[1] + maxOffset,
        `${zone.id} '${s.npc}' level ${s.level} outside band ${law.npcLevel} (+${maxOffset})`,
      );
    }
    // Strongboxes upgraded to the tier's law.
    if (def.chestTierBonus !== undefined) {
      const want = dangerLaw(site.tier + def.chestTierBonus).chest;
      let found = 0;
      for (const g of zone.ground) {
        const info = chestInfo(g);
        if (info && !info.open) {
          found++;
          assert.equal(info.kind, want, `${zone.id} chest is '${info.kind}', law says '${want}'`);
        }
      }
      assert.equal(found, 1, `${zone.id} lost its strongbox in composition`);
    }
    // The transparent fringe survived composition.
    assert.ok([...zone.ground].some((g) => g === TILE_SKIP), `${zone.id} lost its fringe`);
  }
});

test('composition is deterministic and epoch changes re-roll the cell', () => {
  const sites = scanSites();
  const site = sites[0]!;
  assert.deepEqual(composePoi(SEED, site, CTX), composePoi(SEED, site, CTX));
  // An epoch bump must be able to change the outcome (site or absence).
  let diverged = false;
  for (const s of sites) {
    const re = poiForCell(SEED, s.cellX, s.cellY, 1, CTX);
    if (
      !re ||
      re.defId !== s.defId ||
      re.prefabId !== s.prefabId ||
      re.anchorX !== s.anchorX ||
      re.anchorY !== s.anchorY
    ) {
      diverged = true;
      break;
    }
  }
  assert.ok(diverged, 'epoch 1 reproduced every epoch-0 site — streams ignore the epoch');
});

test('settled cells never host POIs, even forced', () => {
  assert.equal(poiForCell(SEED, 0, 0, 0, CTX), null);
  assert.equal(poiForCell(SEED, 0, 0, 0, CTX, true), null);
});

test('the simulator observes the scaffold honestly and hears a draft def', () => {
  const stats = simulatePois(SEED, CTX, 200);
  assert.equal(stats.evaluated, 200);
  assert.deepEqual(simulatePois(SEED, CTX, 200), stats, 'simulation not deterministic');
  assert.equal(
    stats.sites + stats.empty,
    stats.evaluated,
    'every evaluated cell is a site or empty',
  );
  assert.ok(stats.sites > 0, 'no sites in a 200-cell scan');
  let counted = 0;
  for (const rec of Object.values(stats.byDef)) counted += rec.count;
  assert.equal(counted, stats.sites);
  // A draft archetype that outweighs everything must show up in the mix.
  const draft = {
    id: 'draft_menace',
    name: 'Draft menace',
    tiers: [1, 5] as const,
    weight: 50,
    prefabs: ['poi_goblin_camp_ring'],
    garrison: [],
  };
  const withDraft = simulatePois(SEED, { ...CTX, defs: [...CTX.defs, draft] }, 200);
  assert.ok(
    (withDraft.byDef['draft_menace']?.count ?? 0) > 0,
    'a weight-50 draft never rolled — the simulator ignores drafts',
  );
});

test('the preview stages a real composed site at the requested tier', () => {
  for (const tier of [1, 3]) {
    const shown = previewPoi(SEED, CTX, 'goblin_warcamp', tier);
    assert.ok(shown, `no tier-${tier} preview site found`);
    assert.equal(shown!.site.tier, tier);
    assert.equal(shown!.site.defId, 'goblin_warcamp');
    assert.ok(shown!.zone.spawns!.length > 0);
    // Deterministic: the bench shows the same stage twice.
    assert.deepEqual(previewPoi(SEED, CTX, 'goblin_warcamp', tier), shown);
  }
  // Pool narrowing swaps the variant in before composition.
  const narrowed = previewPoi(SEED, CTX, 'goblin_warcamp', 2, 'poi_goblin_camp_pair');
  assert.ok(narrowed);
  assert.equal(narrowed!.site.prefabId, 'poi_goblin_camp_pair');
});

test('the dev force lever honors the site scan', () => {
  // Force every cell in a row; whatever comes back must be well-sited.
  let forced = 0;
  for (let cx = -SCAN; cx <= SCAN; cx++) {
    const site = poiForCell(SEED, cx, 3, 0, CTX, 'goblin_warcamp');
    if (!site) continue;
    forced++;
    assert.equal(site.defId, 'goblin_warcamp');
  }
  assert.ok(forced > 0, 'force lever produced nothing across a whole row');
});

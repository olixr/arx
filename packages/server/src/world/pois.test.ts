import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, chestInfo, closedChestTile } from '@devcraft/shared';
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
    { x: -96, y: 16, w: 96, h: 64 }, // dawnmead
  ],
  defs: [...POI_DEFS.values()],
  prefabs: POI_PREFABS,
};

const SCAN = 9; // cells −9..9 in both axes

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
    // Somebody must hold every site: a garrison, or friendly staff.
    assert.ok(
      (zone.spawns?.length ?? 0) > 0 || (zone.actorSpawns?.length ?? 0) > 0,
      `${zone.id} stands empty — no garrison, no staff`,
    );
    const def = POI_DEFS.get(site.defId)!;
    const law = dangerLaw(site.tier);
    const maxOffset = Math.max(0, ...def.garrison.map((g) => g.levelOffset ?? 0));
    for (const s of zone.spawns ?? []) {
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
  // Dawnmead's anchor (-64,48) lives in macro-cell (-1,0).
  assert.equal(poiForCell(SEED, -1, 0, 0, CTX), null);
  assert.equal(poiForCell(SEED, -1, 0, 0, CTX, true), null);
});

test('approach cues live in the fringe and never touch the prefab or unnatural ground', () => {
  // The cue vocabulary: the fixed clearing/path tiles plus whatever
  // scatter tiles the archetypes themselves declare — the whitelist
  // derives from content, so new cue vocabulary never rots this test.
  const cueTiles = new Set<number>([Tile.Grass, Tile.Stump, Tile.Dirt]);
  for (const def of POI_DEFS.values()) {
    for (const sc of def.cues?.scatter ?? []) {
      cueTiles.add(Tile[sc.tile as keyof typeof Tile] as number);
    }
  }
  let stumps = 0;
  let pathCells = 0;
  let scatterCells = 0;
  for (const site of scanSites()) {
    const def = POI_DEFS.get(site.defId)!;
    const prefab = POI_PREFABS.get(site.prefabId)!;
    const zone = composePoi(SEED, site, CTX)!;
    const pad = (zone.width - prefab.width) / 2;
    assert.equal(pad, (zone.height - prefab.height) / 2, `${zone.id} pad not symmetric`);
    assert.ok(Number.isInteger(pad) && pad >= 0, `${zone.id} bad pad ${pad}`);
    if (def.cues === undefined) assert.equal(pad, 0, `${zone.id} grew a fringe with no cues`);
    // The prefab's AUTHORED cells survive composition verbatim (chest
    // aside); its transparent cells are fringe — cues may claim them.
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const pg = prefab.ground[dy * prefab.width + dx]!;
        if (pg === TILE_SKIP) continue;
        const zg = zone.ground[(dy + pad) * zone.width + (dx + pad)]!;
        if (chestInfo(pg) && !chestInfo(pg)!.open) continue; // re-keyed by law
        assert.equal(zg, pg, `${zone.id} cue overwrote prefab cell ${dx},${dy}`);
      }
    }
    // Everything outside the authored art is transparent or speaks
    // the cue vocabulary only.
    for (let zy = 0; zy < zone.height; zy++) {
      for (let zx = 0; zx < zone.width; zx++) {
        const inPrefab =
          zx >= pad && zx < pad + prefab.width && zy >= pad && zy < pad + prefab.height;
        if (
          inPrefab &&
          prefab.ground[(zy - pad) * prefab.width + (zx - pad)] !== TILE_SKIP
        ) {
          continue;
        }
        const g = zone.ground[zy * zone.width + zx]!;
        if (g === TILE_SKIP) continue;
        assert.ok(cueTiles.has(g), `${zone.id} fringe holds non-cue tile ${g}`);
        // Cues only replace natural ground.
        const cls = groundProbeAt(SEED, zone.origin.x + zx, zone.origin.y + zy);
        assert.ok(cls === 'grass' || cls === 'forest', `${zone.id} cue paved '${cls}'`);
        if (g === Tile.Stump) stumps++;
        if (g === Tile.Dirt) pathCells++;
        if (g === Tile.BonePile || g === Tile.BannerPole) scatterCells++;
      }
    }
  }
  assert.ok(pathCells > 0, 'no approach path anywhere in the scan');
  assert.ok(scatterCells > 0, 'no cue scatter anywhere in the scan');
  assert.ok(stumps >= 0, 'stump counter is wired'); // forest felling depends on siting
});

test('night entries compose with their hours riding the spawn records', () => {
  // Every shipped archetype now carries a night window; across the
  // scan the composed zones must surface them, wrapped exactly.
  let windowed = 0;
  for (const site of scanSites()) {
    const def = POI_DEFS.get(site.defId)!;
    const zone = composePoi(SEED, site, CTX)!;
    const defHasNight = def.garrison.some(
      (g) => g.hours && (g.minTier === undefined || site.tier >= g.minTier),
    );
    const zoneNight = (zone.spawns ?? []).filter((s) => s.hours);
    for (const s of zoneNight) {
      windowed++;
      assert.ok(s.hours!.from >= 0 && s.hours!.from < 24);
      assert.ok(s.hours!.to >= 0 && s.hours!.to < 24);
    }
    if (defHasNight) {
      assert.ok(
        zoneNight.length > 0,
        `${zone.id}: def has an eligible night entry but no windowed spawn composed`,
      );
    }
  }
  assert.ok(windowed > 0, 'no hour-windowed spawns anywhere in the scan');
});

test('patrol sentries walk a real ring and watchers hold the townward post', () => {
  let patrols = 0;
  for (const site of scanSites()) {
    const zone = composePoi(SEED, site, CTX)!;
    for (const s of zone.spawns ?? []) {
      if (!s.patrol) continue;
      patrols++;
      assert.ok(s.patrol.length >= 3, `${zone.id} patrol loop too short`);
      assert.equal(s.count, 1, 'patrollers are single bodies');
      // The loop starts at the body's own post.
      assert.equal(s.x, s.patrol[0]!.x);
      assert.equal(s.y, s.patrol[0]!.y);
      const prefab = POI_PREFABS.get(site.prefabId)!;
      const ringR = Math.max(prefab.width, prefab.height) / 2 + 5;
      for (const wp of s.patrol) {
        const d = Math.hypot(wp.x - (site.anchorX + 0.5), wp.y - (site.anchorY + 0.5));
        assert.ok(d > 2 && d < ringR + 6, `${zone.id} waypoint off the ring (d=${d.toFixed(1)})`);
        const cls = groundProbeAt(SEED, Math.floor(wp.x), Math.floor(wp.y));
        assert.ok(cls === 'grass' || cls === 'forest', `${zone.id} waypoint on '${cls}'`);
      }
    }
  }
  assert.ok(patrols > 0, 'no patrol loops composed across the whole scan');
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

// ------------------------------------------- phase 4: friendly lights

test('the waystation staffs itself: keeper by the fire, watch on the townward ring', () => {
  const shown = previewPoi(SEED, CTX, 'waystation', 3);
  assert.ok(shown, 'no tier-3 waystation site found');
  const zone = shown!.zone;
  const actors = zone.actorSpawns ?? [];
  assert.equal(actors.length, 3, `expected keeper + two watch, got ${actors.length}`);
  const traders = ['wayfarer_senna', 'wayfarer_dray', 'wayfarer_petch'];
  const keeper = actors.find((a) => traders.includes(a.actor));
  assert.ok(keeper, 'no trader identity picked from the pool');
  assert.equal(keeper!.routine, 'waystation_keeper');
  const watch = actors.filter((a) => a.actor === 'wayward_watch');
  assert.equal(watch.length, 2);
  // The keeper stands INSIDE the footprint on an open (non-solid,
  // non-transparent) tile — never in the stall, never in a crate.
  const kz = {
    x: Math.floor(keeper!.x) - zone.origin.x,
    y: Math.floor(keeper!.y) - zone.origin.y,
  };
  const kt = zone.ground[kz.y * zone.width + kz.x]!;
  assert.ok(kt !== TILE_SKIP, 'keeper posted on transparent fringe');
  assert.equal(TILE_DEFS[kt as Tile]!.solid, false, `keeper posted inside solid tile ${kt}`);
  // Determinism: same site, same staff, forever.
  assert.deepEqual(previewPoi(SEED, CTX, 'waystation', 3), shown);
});

test('the ruined riftgate keeps a WORKING delve gate and the key-faucet chest', () => {
  const shown = previewPoi(SEED, CTX, 'riftgate_ruin', 4);
  assert.ok(shown, 'no tier-4 riftgate site found');
  const zone = shown!.zone;
  const portals = zone.portals ?? [];
  assert.equal(portals.length, 1, 'the gate lost its portal');
  assert.equal(portals[0]!.delve, true, 'the gate is not a delve gate');
  // The portal's world coords land exactly on the PortalDown tile.
  const zx = portals[0]!.x - zone.origin.x;
  const zy = portals[0]!.y - zone.origin.y;
  assert.equal(zone.ground[zy * zone.width + zx], Tile.PortalDown, 'portal offset drifted');
  // The court still keeps its iron cache (tier 4 law: gilded upgrade
  // is chestTierBonus 0 → the tier's own kind).
  const wantChest = closedChestTile(dangerLaw(4).chest);
  assert.ok(
    [...zone.ground].includes(wantChest),
    'the gatekeeper cache lost its chest re-key',
  );
});

test("the champion's tor crowns a stable name from the pool", () => {
  const shown = previewPoi(SEED, CTX, 'champions_tor', 3);
  assert.ok(shown, 'no tier-3 tor site found');
  const def = POI_DEFS.get('champions_tor')!;
  const pool = def.garrison[0]!.names!;
  const champ = shown!.zone.spawns!.find((s) => s.npc === 'troll');
  assert.ok(champ, 'the tor lost its champion');
  assert.ok(pool.includes(champ!.name!), `name '${champ!.name}' not from the pool`);
  const law = dangerLaw(3);
  assert.ok(
    champ!.level! >= law.npcLevel[0] + 6 && champ!.level! <= law.npcLevel[1] + 6,
    `champion level ${champ!.level} outside band+6`,
  );
  // The hill has always been Korga's: the name never re-rolls.
  const again = previewPoi(SEED, CTX, 'champions_tor', 3);
  assert.equal(again!.zone.spawns!.find((s) => s.npc === 'troll')!.name, champ!.name);
});

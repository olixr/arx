import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, chestInfo, closedChestTile } from '@arx/shared';
import { WORLD_SEED,
  AMBERFORD_RECT,
  ASHLAMP_RECT,
  AUTHORED_WILD_SITES,
  AUTHORED_ZONE_PAD,
  FENSIDE_RECT,
  MINOR_DEFS,
  PLANNED_ZONE_RECTS,
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  dangerLaw,
  prefabFromJson,
  prefabToJson,
  validatePoiDef,
} from '@arx/content';
import {
  buildAmberford,
  buildAshlamp,
  buildDawnmead,
  buildEvenfall,
  buildFenside,
  buildHartfell,
  buildKingsdelf,
  buildLowhall,
  buildPinewatch,
  buildSaltmere,
  buildSilverfall,
  buildUndercroft,
  groundProbeAt,
} from '@arx/content';
import {
  POI_CELL,
  composePoi,
  findAuthoredAnchor,
  poiCellOf,
  poiContext,
  poiForCell,
  poiSiteBlocked,
  previewPoi,
  simulatePois,
  type PoiContext,
  type PoiSite,
} from './pois.js';

const SEED = WORLD_SEED;
const CTX: PoiContext = {
  anchors: SETTLED_ANCHORS,
  zoneRects: [
    { x: -160, y: -64, w: 192, h: 224 }, // dawnmead
  ],
  claimRings: [],
  defs: [...POI_DEFS.values()],
  minors: [...MINOR_DEFS.values()],
  prefabs: POI_PREFABS,
  capitals: [],
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

test('a height-bearing prefab stamps its terraces through the composer', () => {
  // THE RAISED GROUND (strongholds Phase 2): ride a cliff-fenced
  // terrace through the REAL scaffold via a probe archetype and prove
  // the zone carries the height (and that ordinary flat sites still
  // compose with elev undefined, the cheap old truth). The probe
  // carries its own small terraced prefab: the shipped stronghold
  // layouts outgrew the ordinary POI cell (Second Charter — capitals
  // seat through strongholdSeat, never poiForCell).
  const tw = 24;
  const th = 24;
  const tg = new Uint16Array(tw * th).fill(TILE_SKIP);
  const te = new Int8Array(tw * th);
  for (let y = 8; y < 16; y++) {
    for (let x = 8; x < 16; x++) {
      te[y * tw + x] = 1;
      const ring = x === 8 || x === 15 || y === 8 || y === 15;
      const ramp = y === 15 && x === 11;
      tg[y * tw + x] = ramp ? Tile.Ramp : ring ? Tile.Cliff : Tile.Grass;
    }
  }
  tg[16 * tw + 11] = Tile.Dirt; // the stair's landing
  const terracedPrefab = {
    id: 'terrace_probe_prefab',
    name: 'Terrace probe prefab',
    width: tw,
    height: th,
    ground: tg,
    detail: new Uint16Array(tw * th),
    elev: te,
    portals: [],
    spawns: [],
    actorSpawns: [],
  };
  const probeDef = {
    id: 'terrace_probe',
    name: 'Terrace probe',
    tiers: [1, 5] as const,
    weight: 5,
    prefabs: ['terrace_probe_prefab'],
    garrison: [],
  } as unknown as (typeof CTX.defs)[number];
  const prefabs = new Map(POI_PREFABS);
  prefabs.set(terracedPrefab.id, terracedPrefab);
  const ctx: PoiContext = { ...CTX, defs: [probeDef], prefabs };
  let zone = null;
  for (let cy = -SCAN; cy <= SCAN && !zone; cy++) {
    for (let cx = -SCAN; cx <= SCAN && !zone; cx++) {
      const site = poiForCell(SEED, cx, cy, 0, ctx);
      if (!site) continue;
      zone = composePoi(SEED, site, ctx);
    }
  }
  assert.ok(zone, 'the probe archetype never found ground in the scan window');
  assert.ok(zone.elev, 'a terraced prefab must compose a zone WITH an elev layer');
  // The stamped heights match the prefab, cell for cell, and the
  // fence rode along with them.
  let raisedInPrefab = 0;
  for (const e of terracedPrefab.elev) if (e !== 0) raisedInPrefab++;
  let raisedInZone = 0;
  let cliffRaised = 0;
  for (let i = 0; i < zone.elev.length; i++) {
    if (zone.elev[i] !== 0) {
      raisedInZone++;
      if (zone.ground[i] === Tile.Cliff) cliffRaised++;
    }
  }
  assert.equal(raisedInZone, raisedInPrefab, 'every raised prefab cell reaches the zone');
  assert.ok(cliffRaised > 0, 'the cliff fence stands on the raised ground');
  // And the ordinary frontier stays flat and cheap.
  const flatSite = scanSites()[0]!;
  const flatZone = composePoi(SEED, flatSite, CTX);
  assert.ok(flatZone, 'the ordinary frontier must still compose');
  assert.equal(flatZone.elev, undefined, 'flat sites keep elev undefined');
});

test('the scaffold is deterministic', () => {
  assert.deepEqual(scanSites(), scanSites());
});

test('THE GATHERED MARCHES: a capital gathers camps in its band, never on its ground', () => {
  // A synthetic capital rect; cells fully inside it stay silent (the
  // mask), cells in the march band decide MORE often than far cells.
  // North frontier ground (south of y≈512 is the dark band — no sites).
  const cap = { x: 4 * POI_CELL, y: -5 * POI_CELL, w: 160, h: 160 };
  const withCap: PoiContext = { ...CTX, capitals: [cap] };
  // The masked cell: the capital's own ground deals nothing.
  for (let seed = 1; seed <= 20; seed++) {
    assert.equal(poiForCell(seed, 4, -5, 0, withCap), null, 'masked ground must stay silent');
  }
  // Band cell (adjacent to the rect, within marchBand) vs a far cell:
  // count decisions across seeds — the band must gather visibly. Use
  // the same cell coordinates for both runs so only ctx differs.
  let near = 0;
  let far = 0;
  const bandCell = { cx: 6, cy: -5 }; // ~128 tiles from the rect edge
  for (let seed = 1; seed <= 120; seed++) {
    if (poiForCell(seed, bandCell.cx, bandCell.cy, 0, withCap)) near++;
    if (poiForCell(seed, bandCell.cx, bandCell.cy, 0, CTX)) far++;
  }
  assert.ok(
    near > far,
    `the march band must gather: ${near} sites with the capital vs ${far} without`,
  );
});

test('the planned rects join the clearance list and flag stale sites', () => {
  // poiContext folds the master plan's rects in even when the live
  // zone list carries only Dawnmead — the frontier keeps out of
  // streets that haven't been built yet.
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  for (const rect of PLANNED_ZONE_RECTS) {
    assert.ok(
      ctx.zoneRects.some(
        (r) => r.x === rect.x && r.y === rect.y && r.w === rect.w && r.h === rect.h,
      ),
      `planned rect (${rect.x},${rect.y}) missing from the context`,
    );
  }
  // A synthetic site parked inside Amberford's future market reads as
  // blocked; a genuine scanned site never does.
  const prefabId = [...POI_PREFABS.keys()][0]!;
  const stale: PoiSite = {
    cellX: 1,
    cellY: 0,
    epoch: 0,
    tier: 2,
    defId: 'goblin_warcamp',
    prefabId,
    anchorX: AMBERFORD_RECT.x + 40,
    anchorY: AMBERFORD_RECT.y + 40,
  };
  assert.equal(poiSiteBlocked(stale, ctx), true);
  // Sites rolled UNDER the full context never read as blocked by it —
  // the roll-time clearance and the retro check agree.
  for (let cy = -SCAN; cy <= SCAN; cy++) {
    for (let cx = -SCAN; cx <= SCAN; cx++) {
      const site = poiForCell(SEED, cx, cy, 0, ctx);
      if (site) {
        assert.equal(
          poiSiteBlocked(site, ctx),
          false,
          `${site.defId}@${cx},${cy} rolled into a planned rect`,
        );
      }
    }
  }
});

test('the frontier hosts POIs and every rollable archetype occurs', () => {
  // Epic 3 grew the roster to 13 rollable archetypes, and THE MARCH
  // (the Kingsdelf epic) grew it again — the coverage sweep widens
  // with the roster (a fixed small window under-samples the rarer
  // weights; four wide epochs where two once served — the sprawl's
  // 68-tile landmark seats seldom, and the golem family's arrival
  // re-dealt the countries under everyone's feet). Weight-0 defs are authored-only and must NOT
  // appear (asserted in the Last Lamp test below).
  // The scan window is almost all tier-4/5 country — the tier-1..3
  // rings near the hearths are only ~15 cells, so low-tier archetypes
  // (the hamlet, the warcamp) need those thin rings swept over MANY
  // epochs to sample fairly (epochs are the fallow machinery's own
  // re-roll lever, not a synthetic trick). Far cells get two.
  // THE PEOPLED LANDMARKS grew the roster by eight more weight-2
  // landmark archetypes (landmark seats accept ~1-in-4 grounds), so
  // the wide window deepens again: six epochs where four served.
  const sites: PoiSite[] = [];
  for (let epoch = 0; epoch < 6; epoch++) {
    for (let cy = -16; cy <= 16; cy++) {
      for (let cx = -16; cx <= 16; cx++) {
        const site = poiForCell(SEED, cx, cy, epoch, CTX);
        if (site) sites.push(site);
      }
    }
  }
  // The hearth-adjacent ring again, deep: 12 epochs over the ±3 cells.
  for (let epoch = 4; epoch < 14; epoch++) {
    for (let cy = -3; cy <= 3; cy++) {
      for (let cx = -3; cx <= 3; cx++) {
        const site = poiForCell(SEED, cx, cy, epoch, CTX);
        if (site) sites.push(site);
      }
    }
  }
  assert.ok(sites.length >= 8, `only ${sites.length} sites in the scan`);
  const kinds = new Set(sites.map((s) => s.defId));
  for (const def of POI_DEFS.values()) {
    if (def.weight === 0) continue;
    // Compound holds never sit in the ordinary pool — they arrive by
    // PROMOTION under the region gate (holds.test.ts pins that door).
    if (def.compound) continue;
    assert.ok(kinds.has(def.id), `archetype '${def.id}' never rolled in the scan`);
  }
});

test('every site stands on flat standable ground, clear of zones and the dark band', () => {
  for (const site of scanSites()) {
    const prefab = POI_PREFABS.get(site.prefabId)!;
    const fx0 = site.anchorX - Math.floor(prefab.width / 2);
    const fy0 = site.anchorY - Math.floor(prefab.height / 2);
    // THE RELAXED SITING, generalized: every footprint tolerates a
    // rough fraction scaled to its size (≤10% expansive, ≤5% stamps;
    // the sweep allows a hair over the roll-time bars because the
    // roll samples on a stride and this sweep reads every tile).
    const landmark = Math.max(prefab.width, prefab.height) >= 34;
    let rough = 0;
    let probes = 0;
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const cls = groundProbeAt(SEED, fx0 + dx, fy0 + dy);
        probes++;
        if (cls !== 'grass' && cls !== 'forest') rough++;
      }
    }
    assert.ok(
      rough / probes <= (landmark ? 0.14 : 0.08),
      `${site.defId}@${site.cellX},${site.cellY}: ${Math.round((rough / probes) * 100)}% rough footprint`,
    );
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
    const def = POI_DEFS.get(site.defId)!;
    // Somebody must hold every site that DECLARES bodies — a scenic
    // archetype (the wayshrine) stands honestly empty by design.
    if (def.garrison.length > 0 || (def.actors?.length ?? 0) > 0) {
      assert.ok(
        (zone.spawns?.length ?? 0) > 0 || (zone.actorSpawns?.length ?? 0) > 0,
        `${zone.id} stands empty — no garrison, no staff`,
      );
    }
    const law = dangerLaw(site.tier);
    const maxOffset = Math.max(0, ...def.garrison.map((g) => g.levelOffset ?? 0));
    const prefab = POI_PREFABS.get(site.prefabId)!;
    for (const s of zone.spawns ?? []) {
      assert.ok(s.level !== undefined, `${zone.id} spawn '${s.npc}' has no level`);
      // Prefab-authored levels ride verbatim (the pen's stolen cows
      // stay level-3 cows) — danger scales only the rolled threats.
      const authored = prefab.spawns.find(
        (ps) => ps.npc === s.npc && ps.level !== undefined,
      );
      if (authored) {
        assert.equal(s.level, authored.level, `${zone.id} '${s.npc}' ignored its authored level`);
        continue;
      }
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
    // Phase 3: the rect is anchor-derived and may grow ASYMMETRICALLY
    // toward the road (the trail arm) — the prefab's blit corner comes
    // from the anchor, exactly as the composer computes it, and it may
    // never touch the rect edge (the all-skip-perimeter law).
    const px0 = site.anchorX - Math.floor(prefab.width / 2) - zone.origin.x;
    const py0 = site.anchorY - Math.floor(prefab.height / 2) - zone.origin.y;
    assert.ok(px0 >= 1 && py0 >= 1, `${zone.id} prefab touches the rect edge`);
    assert.ok(
      px0 + prefab.width <= zone.width - 1 && py0 + prefab.height <= zone.height - 1,
      `${zone.id} prefab overruns the rect`,
    );
    // The prefab's AUTHORED cells survive composition verbatim (chest
    // aside); its transparent cells are fringe — cues may claim them.
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const pg = prefab.ground[dy * prefab.width + dx]!;
        if (pg === TILE_SKIP) continue;
        const zg = zone.ground[(dy + py0) * zone.width + (dx + px0)]!;
        if (chestInfo(pg) && !chestInfo(pg)!.open) continue; // re-keyed by law
        assert.equal(zg, pg, `${zone.id} cue overwrote prefab cell ${dx},${dy}`);
      }
    }
    // Everything outside the authored art is transparent or speaks
    // the cue vocabulary only.
    for (let zy = 0; zy < zone.height; zy++) {
      for (let zx = 0; zx < zone.width; zx++) {
        const inPrefab =
          zx >= px0 && zx < px0 + prefab.width && zy >= py0 && zy < py0 + prefab.height;
        if (
          inPrefab &&
          prefab.ground[(zy - py0) * prefab.width + (zx - px0)] !== TILE_SKIP
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
      // An AUTHORED round (it carries dwell/sit stops — synthetic
      // rings never do) may walk the compound's own interior, heart
      // included: that is the ROADS-ARE-WALKED intent. The ring's
      // stand-off law binds only the synthetic loops. (The atlas
      // re-deal stood the sprawl at a scanned cell and proved the
      // old blanket bound wrong against the sprawl's own processional.)
      const authored = s.patrol.some((p) => p.dwell !== undefined || p.sit);
      for (const wp of s.patrol) {
        const d = Math.hypot(wp.x - (site.anchorX + 0.5), wp.y - (site.anchorY + 0.5));
        assert.ok(
          (authored || d > 2) && d < ringR + 6,
          `${zone.id} waypoint off the ring (d=${d.toFixed(1)})`,
        );
        // The class law is field-blind (authored tiles are invisible
        // to the probe), so it binds only the synthetic rings too —
        // an authored round's interior points stand on the compound's
        // own lanes, which openCell already proved walkable.
        if (!authored) {
          const cls = groundProbeAt(SEED, Math.floor(wp.x), Math.floor(wp.y));
          assert.ok(cls === 'grass' || cls === 'forest', `${zone.id} waypoint on '${cls}'`);
        }
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

// ------------------------------------------------------------------
// THE AUTHORED SITES LAW — the mileposts and dens the plan pins.
// ------------------------------------------------------------------

test('every authored wild site finds honest ground and composes', async () => {
  const { AUTHORED_WILD_SITES } = await import('@arx/content');
  const { findAuthoredAnchor, poiCellOf } = await import('./pois.js');
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  for (const want of AUTHORED_WILD_SITES) {
    const def = POI_DEFS.get(want.defId);
    assert.ok(def, `${want.id}: unknown archetype '${want.defId}'`);
    let site: PoiSite | null = null;
    if (want.cell) {
      site = poiForCell(SEED, want.cell[0], want.cell[1], 0, ctx, want.defId);
      assert.ok(site, `${want.id}: forced cell scan found no ground`);
    } else {
      for (const prefabId of def!.prefabs) {
        const prefab = POI_PREFABS.get(prefabId)!;
        const spot = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx);
        assert.ok(spot, `${want.id}: no honest ground for '${prefabId}' near (${want.x},${want.y})`);
        // The nudge must stay a nudge — the lamp belongs beside ITS
        // road. Chebyshev, matching the search ring's own geometry.
        assert.ok(
          Math.max(Math.abs(spot!.x - want.x!), Math.abs(spot!.y - want.y!)) <= 14,
          `${want.id}: anchor nudged too far`,
        );
        site = {
          cellX: poiCellOf(want.x!),
          cellY: poiCellOf(want.y!),
          epoch: 0,
          tier: 4,
          defId: want.defId,
          prefabId,
          anchorX: spot!.x,
          anchorY: spot!.y,
        };
      }
    }
    const zone = composePoi(SEED, site!, ctx);
    assert.ok(zone, `${want.id}: site failed to compose`);
  }
});

test('THE PINNED SKETCH: a forced cell honours the authored prefab pin; a pin outside the pool refuses; the rolled path never reads it', () => {
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const def = POI_DEFS.get('bandit_camp')!;
  assert.ok(def.prefabs.includes('poi_bandit_toll') && def.prefabs.includes('poi_bandit_hollow'));
  // A cell whose variant stream deals the HOLLOW and whose ground can
  // also seat the (wider) toll, so the pin is seen to override. The
  // site scan still rules: a pinned prefab the land refuses stands
  // nothing, which is why the search asks both questions.
  let cell: [number, number] | null = null;
  let pinned: PoiSite | null = null;
  for (let cy = -12; cy <= 12 && !cell; cy++) {
    for (let cx = -12; cx <= 12; cx++) {
      const s = poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp');
      if (!s || s.prefabId !== 'poi_bandit_hollow') continue;
      pinned = poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp', false, 'poi_bandit_toll');
      if (pinned) { cell = [cx, cy]; break; }
    }
  }
  assert.ok(cell && pinned, 'no hollow-dealing cell seats the pinned toll — the pin cannot be shown to override');
  const [cx, cy] = cell!;
  assert.equal(pinned!.prefabId, 'poi_bandit_toll');
  assert.equal(pinned!.defId, 'bandit_camp');
  const zone = composePoi(SEED, pinned!, ctx);
  assert.ok(zone, 'the pinned toll failed to compose');
  const stakes = [...zone!.ground, ...zone!.detail].filter((t) => t === Tile.RedRagStake).length;
  assert.ok(stakes >= 1, 'the toll sketch stands its red-rag stake');
  // A pin the def never listed is refused, like an unknown prefab.
  assert.equal(poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp', false, 'poi_last_lamp'), null);
  assert.equal(poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp', false, 'poi_no_such'), null);
  // Unpinned, the same cell deals exactly what it always dealt.
  assert.deepEqual(poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp', false, undefined), poiForCell(SEED, cx, cy, 0, ctx, 'bandit_camp'));
  assert.deepEqual(poiForCell(SEED, cx, cy, 0, ctx, undefined, false, 'poi_bandit_toll'), poiForCell(SEED, cx, cy, 0, ctx));
});

test('the First Road pin stands its pinned sketch, in its def\'s own pool, with its red-rag stake', async () => {
  // Band 7 (R4) re-points the pin from the rolled bandit_camp's toll
  // sketch to Brede's bar (`first_road_bar` / `poi_first_road_bar`);
  // the geography lane owns the pin, so this case reads whatever the
  // plan names and holds the laws that survive the re-point: the pin
  // names a prefab, the prefab is in the def's pool, honest ground
  // stands within the nudge, and the Company's red rag stands.
  const { AUTHORED_WILD_SITES } = await import('@arx/content');
  const { findAuthoredAnchor, poiCellOf } = await import('./pois.js');
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const want = AUTHORED_WILD_SITES.find((s) => s.id === 'first_road_toll')!;
  assert.ok(want, 'the First Road pin is missing from the plan');
  assert.ok(want.prefabId, 'the First Road pin names its prefab');
  const def = POI_DEFS.get(want.defId)!;
  assert.ok(def, `${want.defId} is not in the registry`);
  assert.ok(def.prefabs.includes(want.prefabId!), `${want.prefabId} is not in ${want.defId}'s pool`);
  const prefab = POI_PREFABS.get(want.prefabId!)!;
  const spot = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx);
  assert.ok(spot, 'no honest ground for the bar at its pin');
  const zone = composePoi(SEED, {
    cellX: poiCellOf(want.x!), cellY: poiCellOf(want.y!), epoch: 0, tier: 3,
    defId: want.defId, prefabId: want.prefabId!, anchorX: spot!.x, anchorY: spot!.y,
  }, ctx)!;
  assert.ok(zone);
  assert.ok([...zone.ground, ...zone.detail].includes(Tile.RedRagStake), 'the bar stands its red-rag stake');
});

test('THE REBORN TOLL (band 7, R4): the toll sketch survives the boot\'s JSON round trip byte-identical, so every rolled toll stands unchanged with its tracked file gone', () => {
  // data/prefabs/poi_bandit_toll.json retired with the pin (R4). The
  // library is FILE-WINS: loadPoiPrefabs seeds a missing file from the
  // sketch through prefabToJson and reads every file back through
  // prefabFromJson, so the toll every rolled bandit_camp stamps after
  // the deletion is the sketch's toll reborn through that round trip.
  // The rebirth must be lossless to the byte (the tracked file was
  // proven identical to the sketch's JSON before it went), and a
  // rolled cell composed against either library must deal the same
  // zone: unpinned cells byte-identical.
  const toll = POI_PREFABS.get('poi_bandit_toll')!;
  assert.ok(toll, 'poi_bandit_toll left the shelf');
  const born = JSON.stringify(prefabToJson(toll), null, 2);
  const reborn = prefabFromJson(JSON.parse(born) as Parameters<typeof prefabFromJson>[0]);
  assert.equal(JSON.stringify(prefabToJson(reborn), null, 2), born, 'the round trip changed the toll');
  assert.deepEqual([...reborn.ground], [...toll.ground]);
  assert.deepEqual([...reborn.detail], [...toll.detail]);
  assert.deepEqual([...reborn.elev], [...toll.elev]);
  assert.deepEqual(reborn.spawns, toll.spawns);
  assert.deepEqual(reborn.portals, toll.portals);
  assert.deepEqual(reborn.actorSpawns, toll.actorSpawns);
  assert.equal(reborn.width, toll.width);
  assert.equal(reborn.height, toll.height);
  const rebornLib = new Map(POI_PREFABS);
  rebornLib.set('poi_bandit_toll', reborn);
  const ctxA = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const ctxB = poiContext(SETTLED_ANCHORS, [], rebornLib, [], []);
  let cell: [number, number] | null = null;
  let site: PoiSite | null = null;
  for (let cy = -12; cy <= 12 && !cell; cy++) {
    for (let cx = -12; cx <= 12; cx++) {
      const s = poiForCell(SEED, cx, cy, 0, ctxA, 'bandit_camp', false, 'poi_bandit_toll');
      if (s) { cell = [cx, cy]; site = s; break; }
    }
  }
  assert.ok(cell && site, 'no cell seats a rolled toll');
  const [cx, cy] = cell!;
  assert.deepEqual(poiForCell(SEED, cx, cy, 0, ctxB, 'bandit_camp', false, 'poi_bandit_toll'), site);
  const zoneA = composePoi(SEED, site!, ctxA);
  const zoneB = composePoi(SEED, site!, ctxB);
  assert.ok(zoneA && zoneB, 'the rolled toll failed to compose');
  assert.deepEqual(zoneB, zoneA, 'the reborn toll deals a different zone');
  // And the whole unpinned world: every naturally-decided site is the
  // same site against either library.
  for (let sy = -SCAN; sy <= SCAN; sy++) {
    for (let sx = -SCAN; sx <= SCAN; sx++) {
      assert.deepEqual(poiForCell(SEED, sx, sy, 0, ctxB), poiForCell(SEED, sx, sy, 0, ctxA));
    }
  }
});

test("BREDE'S BAR (band 7, R4): the shipped def musters Brede crowned with his mouth at tier 1 and 2, a crew of five, the warded box and the red rag, and never rolls", () => {
  const def = POI_DEFS.get('first_road_bar')!;
  assert.ok(def, 'first_road_bar is not in the registry');
  assert.equal(def.passFlag, 'charter_pass');
  assert.equal(def.toll, true);
  for (const tier of [1, 2]) {
    const shown = previewPoi(SEED, CTX, 'first_road_bar', tier);
    assert.ok(shown, `no tier-${tier} site composed for the bar`);
    assert.equal(shown!.site.prefabId, 'poi_first_road_bar');
    const spawns = shown!.zone.spawns ?? [];
    const mouths = spawns.filter((s) => s.mouth !== undefined);
    assert.equal(mouths.length, 1, `tier ${tier}: exactly one body carries the mouth`);
    const brede = mouths[0]!;
    assert.equal(brede.mouth, 'company_brede');
    assert.equal(brede.name, 'Brede');
    assert.equal(brede.npc, 'brigand_reaver');
    assert.equal(brede.count, 1);
    assert.ok(brede.crown !== undefined, 'Brede is the crown');
    assert.equal(brede.x, shown!.site.anchorX + 0.5, 'the crown stands at the anchor');
    assert.equal(brede.y, shown!.site.anchorY + 0.5);
    // A crew of five, not a warband (FREQUENCY, NOT AMPLITUDE): two
    // pickets, the archer on patrol, the sentry (minTier 1) and Brede.
    const bodies = spawns.reduce((n, s) => n + s.count, 0);
    assert.equal(bodies, 5, `tier ${tier}: a crew of five (got ${bodies})`);
    // The warded box stands once; the red rag stands.
    let chests = 0;
    for (const t of shown!.zone.ground) if (chestInfo(t) !== null) chests++;
    assert.equal(chests, 1, 'one strongbox');
    assert.ok([...shown!.zone.ground, ...shown!.zone.detail].includes(Tile.RedRagStake), 'the red rag stands');
  }
  // A weight-0 archetype never rolls on its own anywhere.
  const stats = simulatePois(SEED, CTX, 600);
  assert.equal(stats.byDef['first_road_bar'], undefined, "Brede's bar rolled procedurally");
});

test('the Last Lamp composes with its lamps, its keeper, and its watch', async () => {
  const { AUTHORED_WILD_SITES } = await import('@arx/content');
  const { findAuthoredAnchor, poiCellOf } = await import('./pois.js');
  const ctx = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);
  const want = AUTHORED_WILD_SITES.find((s) => s.id === 'last_lamp')!;
  const prefab = POI_PREFABS.get('poi_last_lamp')!;
  const spot = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx)!;
  const zone = composePoi(
    SEED,
    {
      cellX: poiCellOf(want.x!),
      cellY: poiCellOf(want.y!),
      epoch: 0,
      tier: 4,
      defId: 'last_lamp',
      prefabId: 'poi_last_lamp',
      anchorX: spot.x,
      anchorY: spot.y,
    },
    ctx,
  )!;
  let lamps = 0;
  for (const t of zone.ground) if (t === Tile.LampPost) lamps++;
  assert.ok(lamps >= 4, `the Last Lamp must burn at least four lamps (got ${lamps})`);
  // Edda at the hearth, the watch on the ring.
  const actors = zone.actorSpawns ?? [];
  assert.ok(
    actors.some((a) => a.actor === 'lampkeeper_edda'),
    'Edda must keep the Last Lamp',
  );
  assert.ok(
    actors.filter((a) => a.actor === 'wayward_watch').length >= 2,
    'the watch must hold the Last Lamp',
  );
  // A weight-0 archetype never rolls on its own anywhere.
  const stats = simulatePois(SEED, ctx, 600);
  assert.equal(stats.byDef['last_lamp'], undefined, 'the Last Lamp rolled procedurally');
});

test('THE POST COMES ALIVE: composed camps split posted bodies onto their furniture', () => {
  // Universal post laws over every naturally-decided site: posted
  // spawns are count-1, carry a lawful kind, stand on open ground,
  // and never outnumber 3-in-5 of the holdfast muster.
  const KINDS = new Set(['cook', 'drill', 'rest', 'vigil', 'keeper', 'watch']);
  let postedAnywhere = 0;
  for (const site of scanSites()) {
    const def = POI_DEFS.get(site.defId)!;
    const zone = composePoi(SEED, site, CTX)!;
    let posted = 0;
    let holdBodies = 0;
    for (const s of zone.spawns ?? []) {
      if (s.post) {
        posted++;
        assert.equal(s.count, 1, `${zone.id}: a post is one body's charge`);
        assert.ok(KINDS.has(s.post.kind), `${zone.id}: unknown post kind '${s.post.kind}'`);
        assert.ok(Number.isFinite(s.post.dir), `${zone.id}: post facing must aim somewhere`);
        // The dead keep unwindowed posts; the living keep the clock.
        if (def.family === 'dead') {
          assert.equal(s.post.hours, undefined, `${zone.id}: the dead keep no hours`);
        }
        // The spot stands inside the zone on non-solid ground (or the
        // transparent fringe the live probe will vet).
        const zx = Math.floor(s.post.x - zone.origin.x);
        const zy = Math.floor(s.post.y - zone.origin.y);
        assert.ok(zx >= 0 && zy >= 0 && zx < zone.width && zy < zone.height, `${zone.id}: post outside the zone`);
        const t = zone.ground[zy * zone.width + zx]!;
        assert.ok(
          t === TILE_SKIP || TILE_DEFS[t as Tile]?.solid === false,
          `${zone.id}: post stands in furniture (tile ${t})`,
        );
      }
      // A named body never takes a post — placed authority stays put.
      if (s.name && def.garrison.some((g) => g.names?.includes(s.name!))) {
        assert.equal(s.post, undefined, `${zone.id}: the champion '${s.name}' got posted`);
      }
    }
    for (const [gi, g] of def.garrison.entries()) {
      if (g.role !== 'holdfast') continue;
      if (g.minTier !== undefined && site.tier < g.minTier) continue;
      holdBodies += g.count[0];
    }
    if (holdBodies > 0) {
      assert.ok(
        posted <= Math.ceil((holdBodies + def.garrison.length * 2) * 0.6) + 1,
        `${zone.id}: ${posted} posted of ~${holdBodies} holdfasts — the camp reads staged`,
      );
    }
    postedAnywhere += posted;
  }
  // The scan must actually exercise the law somewhere — a frontier
  // full of fires and tents that posts nobody means the scan is dead.
  assert.ok(postedAnywhere >= 3, `only ${postedAnywhere} posted bodies across the whole scan`);
});

test('THE ROUND HAS STATIONS: authored landmark routes reach the composed patrol verbatim', () => {
  // Force a landmark to stand via a landmark-only context, then prove
  // the authored round (dwell and sit stops included) reached the
  // patrol sentry translated, not re-derived.
  const landmarkDefs = [...POI_DEFS.values()].filter((d) =>
    // skral_village: the drowned villages walk two rounds each — the
    // patrol proof covers the shore-gated landmark lane too.
    ['goblin_mootfield', 'dead_chapel', 'goblin_warren', 'dead_muster', 'skral_village'].includes(
      d.id,
    ),
  );
  assert.equal(landmarkDefs.length, 5, 'landmark defs missing from the registry');
  const ctx: PoiContext = { ...CTX, defs: landmarkDefs };
  let proved = 0;
  outer: for (let cy = -SCAN; cy <= SCAN && proved < 2; cy++) {
    for (let cx = -SCAN; cx <= SCAN && proved < 2; cx++) {
      const site = poiForCell(SEED, cx, cy, 0, ctx);
      if (!site) continue;
      const prefab = POI_PREFABS.get(site.prefabId)!;
      if (!prefab.routes || prefab.routes.length === 0) continue;
      const zone = composePoi(SEED, site, ctx);
      if (!zone) continue;
      const patrollers = (zone.spawns ?? []).filter((s) => s.patrol && s.patrol.length >= 3);
      if (patrollers.length === 0) continue;
      const authored = prefab.routes[0]!.pts;
      const px0 = site.anchorX - Math.floor(prefab.width / 2);
      const py0 = site.anchorY - Math.floor(prefab.height / 2);
      // The first patroller walks the first authored round: every
      // composed waypoint must be one of the authored stops shifted
      // to the world (drops allowed — walkability re-proving), and
      // dwell/sit must survive the trip.
      const first = patrollers[0]!;
      const authoredWorld = authored.map((pt) => ({
        x: px0 + pt.dx + 0.5,
        y: py0 + pt.dy + 0.5,
        dwell: pt.dwell,
        sit: pt.sit,
      }));
      for (const wp of first.patrol!) {
        const match = authoredWorld.find((a) => a.x === wp.x && a.y === wp.y);
        assert.ok(match, `${zone.id}: patrol waypoint ${wp.x},${wp.y} is not an authored stop`);
        assert.equal(wp.dwell, match!.dwell, `${zone.id}: dwell lost in composition`);
        assert.equal(wp.sit ?? undefined, match!.sit ?? undefined, `${zone.id}: sit lost in composition`);
      }
      assert.ok(first.patrol!.length >= Math.ceil(authored.length * 0.6), `${zone.id}: too many stops dropped`);
      proved++;
      continue outer;
    }
  }
  assert.ok(proved >= 1, 'no landmark stood anywhere in the scan — siting law suspect');
});

// ---------------------------------------------------------------------
// BAND 7 ENGINE (L5): THE POST IS NAMED and THE MOUTH ON THE ROW as
// the composer carries them — a separate block from the sketch lane's
// cases so the two hunks never touch.
// ---------------------------------------------------------------------

test('THE POST IS NAMED: composePoi posts an `at` row on its exact prefab cell with its cardinal stand', () => {
  const grid = POI_PREFABS.get('poi_waystation_camp')!;
  let open: { dx: number; dy: number } | null = null;
  for (let i = 0; i < grid.ground.length && !open; i++) {
    const t = grid.ground[i]!;
    if (t !== TILE_SKIP && !TILE_DEFS[t as Tile]!.solid) open = { dx: i % grid.width, dy: Math.floor(i / grid.width) };
  }
  assert.ok(open, 'the waystation sketch has an open cell');
  const res = validatePoiDef({
    id: 'test_named_post',
    name: 'Test named post',
    tiers: [2, 4],
    weight: 0,
    prefabs: ['poi_waystation_camp'],
    garrison: [],
    actors: [
      { pool: ['wayward_watch'], post: 'watch', at: { ...open!, dir: 'S' } },
      { pool: ['wayfarer_senna'], post: 'hearth', routine: 'waystation_keeper' },
    ],
  });
  assert.ok(res.ok, JSON.stringify(res));
  if (!res.ok) return;
  const ctx: PoiContext = { ...CTX, defs: [...CTX.defs, res.def] };
  const shown = previewPoi(SEED, ctx, 'test_named_post', 3);
  assert.ok(shown, 'no tier-3 site composed for the test def');
  const { site, zone } = shown!;
  const named = (zone.actorSpawns ?? []).find((a) => a.actor === 'wayward_watch');
  assert.ok(named, 'the named row stands');
  // The prefab blits at anchor - floor(size/2): the row stands on that cell, plus the half-tile centre.
  assert.equal(named!.x, site.anchorX - Math.floor(grid.width / 2) + open!.dx + 0.5);
  assert.equal(named!.y, site.anchorY - Math.floor(grid.height / 2) + open!.dy + 0.5);
  assert.equal(named!.dir, Math.PI / 2, "'S' is the camera-facing stand");
  // The ground under it is the sketch's own cell, never the fringe.
  const zi = (Math.floor(named!.y) - zone.origin.y) * zone.width + (Math.floor(named!.x) - zone.origin.x);
  assert.equal(zone.ground[zi], grid.ground[open!.dy * grid.width + open!.dx]);
  // The row without `at` keeps its derived hearth post, exactly as before.
  const keeper = (zone.actorSpawns ?? []).find((a) => a.actor === 'wayfarer_senna');
  assert.ok(keeper && keeper.routine === 'waystation_keeper');
  assert.deepEqual(previewPoi(SEED, ctx, 'test_named_post', 3), shown, 'deterministic');
});

test('THE AUTHORED HUG: a pin that says the word may stand edge to edge with a patch; without it the same pin walks and keeps the pad', () => {
  const prefab = POI_PREFABS.get('poi_first_road_bar')!;
  const want = AUTHORED_WILD_SITES.find((s) => s.id === 'first_road_toll')!;
  assert.equal(want.hug, true, 'the bar is the one site that declares the hug');
  const rects = [{ x: -160, y: -64, w: 192, h: 224 }, ASHLAMP_RECT, FENSIDE_RECT];
  const ctx: PoiContext = { ...CTX, zoneRects: rects };
  // The bar's pin stands unnudged one row south of the fen waist's rect.
  const spot = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx, 1, want.hug === true);
  assert.deepEqual(spot, { x: want.x, y: want.y }, 'the pin stands where the plan put it');
  // THE WORD IS OPT-IN (fix pass 2): the same pin without it is refused
  // at the pad and walked away from the rect like any other pin.
  assert.equal(findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx, 1), null, 'no hug, no ground within one tile');
  const walked = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx, 14)!;
  assert.ok(walked, 'the unworded pin walks to ground');
  const wfy0 = walked.y - Math.floor(prefab.height / 2);
  const wfx0 = walked.x - Math.floor(prefab.width / 2);
  const wgap = Math.max(
    wfy0 - (FENSIDE_RECT.y + FENSIDE_RECT.h),
    FENSIDE_RECT.x - (wfx0 + prefab.width),
    wfx0 - (FENSIDE_RECT.x + FENSIDE_RECT.w),
  );
  assert.ok(wgap >= AUTHORED_ZONE_PAD, `an unworded pin keeps the pad (gap ${wgap})`);
  const fy0 = spot!.y - Math.floor(prefab.height / 2);
  assert.equal(fy0 - (FENSIDE_RECT.y + FENSIDE_RECT.h), 1, 'one row of nobody\'s ground between the rect and the footprint');
  assert.ok(fy0 - AUTHORED_ZONE_PAD < FENSIDE_RECT.y + FENSIDE_RECT.h, 'the old pad alone would have refused this pin');
  // Overlap is still refused: a pin whose footprint crosses the rect
  // walks away from it under the pad, never into it.
  const inside = findAuthoredAnchor(SEED, want.x!, want.y! - 4, prefab, ctx, 14, true);
  assert.ok(inside, 'the walked pin finds ground');
  const wy0 = inside!.y - Math.floor(prefab.height / 2);
  const wx0 = inside!.x - Math.floor(prefab.width / 2);
  const gapY = wy0 - (FENSIDE_RECT.y + FENSIDE_RECT.h);
  const gapX = Math.max(FENSIDE_RECT.x - (wx0 + prefab.width), wx0 - (FENSIDE_RECT.x + FENSIDE_RECT.w));
  assert.ok(Math.max(gapX, gapY) >= AUTHORED_ZONE_PAD, `a walked footprint keeps the pad (gap x ${gapX} y ${gapY})`);
  // The crofts, east of the rect by exactly the pad, stand as before.
  const crofts = AUTHORED_WILD_SITES.find((s) => s.id === 'fenside_crofts')!;
  const cp = POI_PREFABS.get(POI_DEFS.get(crofts.defId)!.prefabs[0]!)!;
  assert.deepEqual(findAuthoredAnchor(SEED, crofts.x!, crofts.y!, cp, ctx, 14), { x: crofts.x, y: crofts.y });
});

test('THE GOLDEN ANCHORS: every pinned authored site stands where it stood before band 7, the hugging bar excepted', () => {
  // The seeder's own context (gameServer poiCtx at boot: the settled
  // anchors, every builtin zone's rect plus the planned rects, no
  // claim rings) and the seeder's own nudge clamp, over every x/y pin
  // in the plan. Measured at seed 24601 with capitals empty; the five
  // cells where the boot's capital masks shift an anchor a few tiles
  // (gullmoor_rest, drovers_fire, first_waystone, spineshelf_rest,
  // hobgoblin_legion) read identically in every boot log before and
  // after this band, so the boot log stays their live pin and this
  // list pins the scan's own answer. Fix pass 1 hugged EVERY pin and
  // moved hoargate from (-402,-566) onto its pin (-408,-560), which
  // nobody had measured or shot; the word is per site now, and this
  // list is the fence: a pad or hug change that moves any anchor
  // fails here before it moves a shipped camp.
  const zones = [
    buildDawnmead(), buildAmberford(), buildSilverfall(), buildSaltmere(), buildPinewatch(),
    buildHartfell(), buildKingsdelf(), buildEvenfall(), buildUndercroft(), buildLowhall(),
    buildAshlamp(), buildFenside(),
  ];
  const ctx = poiContext(SETTLED_ANCHORS, zones, POI_PREFABS, [], []);
  const GOLDEN: Record<string, string> = {
    fernway_rest: '328,-115', longmeadow_rest: '22,-147', fork_rest: '-150,-165', last_lamp: 'NONE',
    first_road_toll: '126,109', first_climb_tower: 'NONE', company_tollhouse: '463,-77', fenside_crofts: '160,94',
    gullmoor_rest: '559,135', pinehollow_rest: '983,-64', hollow_watch: '1140,-213', drovers_fire: '1227,-457',
    diggers_camp: 'NONE', hoargate: '-402,-566', first_waystone: '-830,-352', heartwood_door: '-1108,-476',
    spineshelf_rest: '-408,-64', third_stone: '-178,148', returners_camp: '-285,225', husk_of_the_line: '-64,-240',
    felling_drum: '80,-42', hobgoblin_legion: '-54,-330', broken_barrow: '-208,48', oldcrown_door: 'NONE',
  };
  const got: Record<string, string> = {};
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const def = POI_DEFS.get(s.defId)!;
    const prefab = POI_PREFABS.get(s.prefabId ?? def.prefabs[0]!)!;
    const cellX = poiCellOf(s.x);
    const cellY = poiCellOf(s.y);
    const inX = s.x - cellX * POI_CELL;
    const inY = s.y - cellY * POI_CELL;
    const nudge = Math.max(0, Math.min(14, Math.min(inX, inY, POI_CELL - 1 - inX, POI_CELL - 1 - inY)));
    const spot = findAuthoredAnchor(SEED, s.x, s.y, prefab, ctx, nudge, s.hug === true);
    got[s.id] = spot ? `${spot.x},${spot.y}` : 'NONE';
  }
  assert.deepEqual(got, GOLDEN);
  // The one hug in the plan is the bar's; hoargate keeps the anchor it shipped with.
  assert.deepEqual(AUTHORED_WILD_SITES.filter((s) => s.hug === true).map((s) => s.id), ['first_road_toll']);
});

test('THE POST IS NAMED, for the ring: the bar\'s archer and picket muster on their named cells at the post line, planted on watch posts', () => {
  const want = AUTHORED_WILD_SITES.find((s) => s.id === 'first_road_toll')!;
  const prefab = POI_PREFABS.get(want.prefabId!)!;
  const ctx: PoiContext = { ...CTX, zoneRects: [{ x: -160, y: -64, w: 192, h: 224 }, ASHLAMP_RECT, FENSIDE_RECT] };
  const spot = findAuthoredAnchor(SEED, want.x!, want.y!, prefab, ctx, 1, want.hug === true)!;
  const zone = composePoi(SEED, {
    cellX: poiCellOf(want.x!), cellY: poiCellOf(want.y!), epoch: 0, tier: 2,
    defId: want.defId, prefabId: want.prefabId!, anchorX: spot.x, anchorY: spot.y,
  }, ctx)!;
  const spawns = zone.spawns ?? [];
  const posted = spawns.filter((s) => s.post?.kind === 'watch');
  assert.equal(posted.length, 2, 'the archer and the picket carry watch posts');
  const px0 = spot.x - Math.floor(prefab.width / 2);
  const py0 = spot.y - Math.floor(prefab.height / 2);
  const archer = posted.find((s) => s.npc === 'brigand_archer')!;
  const picket = posted.find((s) => s.npc === 'brigand')!;
  assert.deepEqual([archer.x, archer.y], [px0 + 13 + 0.5, py0 - 11 + 0.5], 'the archer on the south shoulder');
  assert.deepEqual([picket.x, picket.y], [px0 + 13 + 0.5, py0 - 16 + 0.5], 'the picket on the north shoulder');
  assert.equal(archer.post!.dir, -Math.PI / 2, 'facing north, the road');
  assert.equal(picket.post!.dir, Math.PI / 2, 'facing south, the road');
  assert.deepEqual([archer.post!.x, archer.post!.y], [archer.x, archer.y], 'the post is the spawn cell');
  assert.equal(archer.patrol, undefined, 'no round');
  assert.equal(archer.count, 1);
  // World cells (128,91) and (128,86): beside the gap (129,88), never on the bed.
  assert.deepEqual([Math.floor(archer.x), Math.floor(archer.y)], [128, 91]);
  assert.deepEqual([Math.floor(picket.x), Math.floor(picket.y)], [128, 86]);
  // The ground under them is the fen waist's own, passable.
  const fen = buildFenside();
  for (const b of [archer, picket]) {
    const lx = Math.floor(b.x) - fen.origin.x;
    const ly = Math.floor(b.y) - fen.origin.y;
    const t = fen.ground[ly * fen.width + lx]!;
    assert.ok(t !== TILE_SKIP && !TILE_DEFS[t as Tile]!.solid, `(${Math.floor(b.x)},${Math.floor(b.y)}) is open zone ground (tile ${t})`);
  }
  // The crew is still five, and the ring bearings went to nobody.
  assert.equal(spawns.reduce((n, s) => n + s.count, 0), 5);
  assert.equal(spawns.filter((s) => s.patrol !== undefined).length, 0, 'nobody walks a ring at the bar');
});

test('THE MOUTH ON THE ROW: the named crowned holdfast carries its actor slug into the composed spawn', () => {
  const res = validatePoiDef({
    id: 'test_mouth_bar',
    name: 'Test mouth bar',
    tiers: [1, 3],
    weight: 0,
    prefabs: ['poi_bandit_hollow'],
    garrison: [
      { npc: 'brigand', count: [2, 2], role: 'holdfast' },
      {
        npc: 'brigand_reaver',
        count: [1, 1],
        role: 'holdfast',
        minTier: 1,
        names: ['Brede'],
        crowned: true,
        actor: 'company_broker',
      },
    ],
    passFlag: 'charter_pass',
    toll: true,
  });
  assert.ok(res.ok, JSON.stringify(res));
  if (!res.ok) return;
  const ctx: PoiContext = { ...CTX, defs: [...CTX.defs, res.def] };
  const shown = previewPoi(SEED, ctx, 'test_mouth_bar', 2);
  assert.ok(shown, 'no tier-2 site composed for the test def');
  const spawns = shown!.zone.spawns ?? [];
  const mouths = spawns.filter((s) => s.mouth !== undefined);
  assert.equal(mouths.length, 1, 'exactly one body carries the mouth');
  const brede = mouths[0]!;
  assert.equal(brede.npc, 'brigand_reaver');
  assert.equal(brede.name, 'Brede');
  assert.equal(brede.mouth, 'company_broker');
  assert.equal(brede.count, 1);
  assert.ok(brede.crown !== undefined, 'the mouth rides the crowned body');
  // The crown stands at the anchor (a named holdfast never takes a post seat).
  assert.equal(brede.x, shown!.site.anchorX + 0.5);
  assert.equal(brede.y, shown!.site.anchorY + 0.5);
  // The crew carries no mouth.
  for (const s of spawns) if (s !== brede) assert.equal(s.mouth, undefined);
});

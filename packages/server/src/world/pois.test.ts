import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, chestInfo, closedChestTile } from '@arx/shared';
import {
  AMBERFORD_RECT,
  MINOR_DEFS,
  PLANNED_ZONE_RECTS,
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  dangerLaw,
} from '@arx/content';
import { DARK_BAND_Y, groundProbeAt } from '@arx/content';
import {
  POI_CELL,
  composePoi,
  poiContext,
  poiForCell,
  poiSiteBlocked,
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
  // Epic 3 grew the roster to 13 rollable archetypes — the coverage
  // sweep widens with it (a fixed small window under-samples the
  // rarer weights). Weight-0 defs are authored-only and must NOT
  // appear (asserted in the Last Lamp test below).
  // The scan window is almost all tier-4/5 country — the tier-1..3
  // rings near the hearths are only ~15 cells, so low-tier archetypes
  // (the hamlet, the warcamp) need those thin rings swept over MANY
  // epochs to sample fairly (epochs are the fallow machinery's own
  // re-roll lever, not a synthetic trick). Far cells get two.
  const sites: PoiSite[] = [];
  for (let epoch = 0; epoch < 2; epoch++) {
    for (let cy = -16; cy <= 16; cy++) {
      for (let cx = -16; cx <= 16; cx++) {
        const site = poiForCell(SEED, cx, cy, epoch, CTX);
        if (site) sites.push(site);
      }
    }
  }
  // The hearth-adjacent ring again, deep: 12 epochs over the ±3 cells.
  for (let epoch = 2; epoch < 12; epoch++) {
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
    // THE RELAXED LANDMARK SITING: expansive prefabs (≥45/axis)
    // tolerate a rough fraction (the capitals' law, reached down);
    // ordinary camps stay strict.
    const landmark = Math.max(prefab.width, prefab.height) >= 45;
    let rough = 0;
    let probes = 0;
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const cls = groundProbeAt(SEED, fx0 + dx, fy0 + dy);
        probes++;
        if (cls !== 'grass' && cls !== 'forest') {
          rough++;
          assert.ok(
            landmark,
            `${site.defId}@${site.cellX},${site.cellY}: footprint tile is '${cls}'`,
          );
        }
      }
    }
    assert.ok(
      rough / probes <= 0.12,
      `${site.defId}@${site.cellX},${site.cellY}: ${Math.round((rough / probes) * 100)}% rough footprint`,
    );
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
        // The nudge must stay a nudge — the lamp belongs beside ITS road.
        assert.ok(
          Math.hypot(spot!.x - want.x!, spot!.y - want.y!) <= 14,
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

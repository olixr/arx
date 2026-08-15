import {
  TILE_SKIP,
  Tile,
  chestInfo,
  closedChestTile,
  dangerAt,
  hashCoords,
} from '@arx/shared';
import {
  DARK_BAND_Y,
  FRONTIER,
  dangerLaw,
  familiesOf,
  groundProbeAt,
  territoryAt,
  territoryWeight,
  type MinorDef,
  type ZoneDef,
  type ZoneSpawn,
} from '@arx/content';
import { roadBearingAt } from '@arx/content';
import { capitalMasked, strongholdLayouts, strongholdSeat } from './strongholds.js';
import {
  POI_CELL,
  intersectsRings,
  intersectsZones,
  poiForCell,
  poiScanOrder,
  traceTrail,
  type PoiContext,
  type Trail,
} from './pois.js';

/**
 * THE SMALL FINDS SCAFFOLD — the third placement layer
 * (docs/lived-in-land-plan.md Phase 2), sibling of the POI scaffold
 * and bound by the same discipline: named streams, pure until
 * materialization, the ledger records deviations only.
 *
 * THE LATTICE: each POI cell divides into a 4×4 sub-lattice of
 * 32-tile slots. Every slot rolls its own existence against
 * DANGER_LAWS[tier].findChance on the slot's OWN tier (a jitter
 * pocket of calm ground deals calmer finds — the field's word, read
 * locally), then picks a find and a footprint exactly the way sites
 * do, at miniature scale. Lattice + jitter is blue noise with a
 * guaranteed maximum gap — the fix for 'scanning an empty cell'.
 *
 * All of a cell's finds compose into ONE zone (`poi:<cx>,<cy>:f`,
 * TILE_SKIP everywhere between footprints) so the world's zone count
 * grows by at most one per cell, not one per find — the budgeted-
 * passes law holds at any density.
 */

/** Sub-lattice edge (slots per cell side). */
export const FIND_LAT = 4;
/** Slot size in tiles (32 — POI_CELL / FIND_LAT). */
export const FIND_SLOT = POI_CELL / FIND_LAT;
/** Minimum anchor spacing: find↔find and find↔site (tiles). */
export const FIND_SPACING = 20;
/** Anchor candidates probed per slot before the slot stays empty. */
const FIND_TRIES = 4;
/** Zone clearance for finds — tighter than a site's 24: texture may
 * stand nearer the world's edges, never inside them. */
const FIND_ZONE_PAD = 8;

/** Named stream salts (the ST_* family's kin — see pois.ts). */
const ST_FIND = 0x501e60;

export interface MinorFind {
  /** Slot ordinal 0..15 — the ledger bit this find owns. */
  slot: number;
  defId: string;
  prefabId: string;
  anchorX: number;
  anchorY: number;
  /** The slot's own danger tier (levels, cache kind, roster reads). */
  tier: number;
  /** Mirrored from the def at decide time for cheap habitat indexing. */
  habitat?: string;
}

export function findsZoneId(cellX: number, cellY: number): string {
  return `poi:${cellX},${cellY}:f`;
}

/** One draw from a cell's finds stream (epoch folds in — re-deals diverge). */
function findStream(seed: number, cellX: number, cellY: number, epoch: number): number {
  return hashCoords(hashCoords((seed ^ ST_FIND) >>> 0, cellX, cellY), epoch, ST_FIND);
}

function standable(cls: string): boolean {
  return cls === 'grass' || cls === 'forest';
}

/**
 * Decide a cell's finds. Pure — same inputs, same finds, forever.
 * `siteAnchor` is the cell's major site (when one stands): finds keep
 * FIND_SPACING clear of it and of each other, in slot order, so the
 * spacing law is deterministic too.
 */
export function findsForCell(
  seed: number,
  cellX: number,
  cellY: number,
  epoch: number,
  ctx: PoiContext,
  siteAnchor: { x: number; y: number } | null,
): MinorFind[] {
  // THE CAPITAL LAW: ground a capital claims deals no finds either —
  // the mask covers every cell layer (the ONE-CELL DEBT).
  {
    const x0 = cellX * POI_CELL;
    const y0 = cellY * POI_CELL;
    for (const c of ctx.capitals) {
      if (
        x0 < c.x + c.w + 24 && c.x - 24 < x0 + POI_CELL &&
        y0 < c.y + c.h + 24 && c.y - 24 < y0 + POI_CELL
      ) {
        return [];
      }
    }
  }
  const base = findStream(seed, cellX, cellY, epoch);
  const x0 = cellX * POI_CELL;
  const y0 = cellY * POI_CELL;
  const out: MinorFind[] = [];
  for (let slot = 0; slot < FIND_LAT * FIND_LAT; slot++) {
    const draw = (n: number): number => hashCoords(base, slot, n);
    const cx = x0 + (slot % FIND_LAT) * FIND_SLOT + FIND_SLOT / 2;
    const cy = y0 + Math.floor(slot / FIND_LAT) * FIND_SLOT + FIND_SLOT / 2;
    const tier = dangerAt(seed, cx, cy, ctx.anchors);
    if (tier === 0) continue; // settled ground keeps only authored texture
    const law = dangerLaw(tier);
    if (draw(1) / 4294967296 >= law.findChance) continue;

    // KIND: weighted pick among finds eligible at this slot's tier —
    // leaned toward the country's family (THE ONE ATLAS LAW: the DEF
    // roster names the countries; the finds palette is what makes a
    // territory READABLE on the ground). Slot-local read, so a border
    // cuts through a cell the way real borders do.
    const eligible = ctx.minors.filter(
      (m) => m.weight > 0 && tier >= m.tiers[0] && tier <= m.tiers[1],
    );
    if (eligible.length === 0) continue;
    const territory = territoryAt(seed, cx, cy, familiesOf(ctx.defs));
    const leanW = (m: MinorDef): number =>
      territoryWeight(m.weight, m.family, territory, FRONTIER.territoryBias);
    const totalW = eligible.reduce((s, m) => s + leanW(m), 0);
    let pick = (draw(2) / 4294967296) * totalW;
    let def: MinorDef | undefined;
    for (const m of eligible) {
      pick -= leanW(m);
      if (pick < 0) {
        def = m;
        break;
      }
    }
    def ??= eligible[eligible.length - 1]!;
    const prefabId = def.prefabs[draw(3) % def.prefabs.length]!;
    const prefab = ctx.prefabs.get(prefabId);
    if (!prefab) continue; // library rot warns at compose, never crashes a roll

    // SPOT: jittered candidates inside the slot; first honest footprint wins.
    for (let t = 0; t < FIND_TRIES; t++) {
      const ax = cx + ((draw(10 + t * 2) % 21) - 10);
      const ay = cy + ((draw(11 + t * 2) % 21) - 10);
      if (ay + prefab.height / 2 >= DARK_BAND_Y - FIND_ZONE_PAD) continue;
      const fx0 = ax - Math.floor(prefab.width / 2);
      const fy0 = ay - Math.floor(prefab.height / 2);
      if (intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects, FIND_ZONE_PAD)) {
        continue;
      }
      if (intersectsRings(fx0, fy0, prefab.width, prefab.height, ctx.claimRings)) continue;
      // THE SPACING LAW: a find keeps clear of the cell's site and of
      // every find already accepted (slot order = deterministic).
      if (siteAnchor && Math.hypot(ax - siteAnchor.x, ay - siteAnchor.y) < FIND_SPACING) continue;
      if (out.some((f) => Math.hypot(ax - f.anchorX, ay - f.anchorY) < FIND_SPACING)) continue;
      let ok = true;
      for (let dy = 0; dy < prefab.height && ok; dy++) {
        for (let dx = 0; dx < prefab.width; dx++) {
          if (!standable(groundProbeAt(seed, fx0 + dx, fy0 + dy))) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      out.push({
        slot,
        defId: def.id,
        prefabId,
        anchorX: ax,
        anchorY: ay,
        tier,
        ...(def.habitat !== undefined ? { habitat: def.habitat } : {}),
      });
      break;
    }
  }
  return out;
}

/**
 * Compose a cell's decided finds into ONE stampable zone. Returns the
 * zone plus `spawnSlots` — the slot ordinal owning each entry of
 * zone.spawns, so the caller can stand cleared slots down and detect
 * per-slot wipes without a second bookkeeping shape.
 */
export function composeFinds(
  seed: number,
  cellX: number,
  cellY: number,
  epoch: number,
  finds: readonly MinorFind[],
  ctx: PoiContext,
): { zone: ZoneDef; spawnSlots: number[] } | null {
  if (finds.length === 0) return null;
  const base = findStream(seed, cellX, cellY, epoch);
  const defOf = (id: string): MinorDef | undefined => ctx.minors.find((m) => m.id === id);

  // THE FOOTPATH (Phase 3, find scale): a find whose story involves
  // FEET — a habitat something lives at, a cache somebody left — wears
  // a single-width path toward a road within hailing reach. Cairns and
  // stones stay pathless: they mark routes, they are not destinations.
  const FOOTPATH_REACH = 10;
  const paths = new Map<number, Trail>();
  for (const f of finds) {
    const def = defOf(f.defId);
    const prefab = ctx.prefabs.get(f.prefabId);
    if (!def || !prefab) continue;
    if (def.habitat === undefined && def.cache === undefined) continue;
    const bearing = roadBearingAt(f.anchorX, f.anchorY, 32);
    if (!bearing) continue;
    const trail = traceTrail(
      seed,
      hashCoords(base, f.slot, 0x29),
      f.anchorX,
      f.anchorY,
      Math.floor(Math.max(prefab.width, prefab.height) / 2),
      bearing.x,
      bearing.y,
      FOOTPATH_REACH,
      ctx.zoneRects,
    );
    if (trail.points.length > 0) paths.set(f.slot, trail);
  }

  // Bounding box over every footprint, padded by the widest clearing —
  // FLOOR 1: the perimeter must stay all-TILE_SKIP or the edge-harmony
  // machinery reads the zone as a border intention and re-shapes the
  // worldgen around a snare line (the all-skip-perimeter law).
  let pad = 1;
  for (const f of finds) {
    const clearing = defOf(f.defId)?.clearing ?? 0;
    // One past the felled ring — the ring itself may not touch the
    // perimeter (the all-skip-perimeter law, as at site scale).
    if (clearing > 0) pad = Math.max(pad, clearing + 1);
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of finds) {
    const prefab = ctx.prefabs.get(f.prefabId);
    if (!prefab) continue;
    const fx0 = f.anchorX - Math.floor(prefab.width / 2);
    const fy0 = f.anchorY - Math.floor(prefab.height / 2);
    minX = Math.min(minX, fx0 - pad);
    minY = Math.min(minY, fy0 - pad);
    maxX = Math.max(maxX, fx0 + prefab.width + pad);
    maxY = Math.max(maxY, fy0 + prefab.height + pad);
  }
  for (const trail of paths.values()) {
    for (const p of trail.points) {
      minX = Math.min(minX, p.x - 2);
      minY = Math.min(minY, p.y - 2);
      maxX = Math.max(maxX, p.x + 3);
      maxY = Math.max(maxY, p.y + 3);
    }
  }
  if (!Number.isFinite(minX)) return null;
  const zw = maxX - minX;
  const zh = maxY - minY;
  const ground = new Uint16Array(zw * zh).fill(TILE_SKIP);
  const detail = new Uint16Array(zw * zh);
  const spawns: ZoneSpawn[] = [];
  const spawnSlots: number[] = [];

  for (const f of finds) {
    const def = defOf(f.defId);
    const prefab = ctx.prefabs.get(f.prefabId);
    if (!def || !prefab) {
      console.warn(`[finds] cell ${cellX},${cellY}: cannot compose '${f.defId}' — content missing`);
      continue;
    }
    const slotBase = hashCoords(base, f.slot, 0x51);
    const law = dangerLaw(f.tier);
    const fx0 = f.anchorX - Math.floor(prefab.width / 2);
    const fy0 = f.anchorY - Math.floor(prefab.height / 2);

    // THE HUMBLE CACHE: a chest tile survives with cache.chance, one
    // tier under the slot's law (floor tier 1) — else it composes
    // away to grass. Texture is not treasure — and the humble read
    // caps at tier 4 (the gilded shelf) no matter how deep the ladder
    // runs: a boss strongbox is a court's crown, never a ditch find.
    const keepCache =
      def.cache !== undefined && hashCoords(slotBase, 5, 0) % 1000 < def.cache.chance * 1000;
    const cacheKind = dangerLaw(Math.max(1, Math.min(4, f.tier - 1))).chest;

    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        let g = prefab.ground[dy * prefab.width + dx]!;
        const info = chestInfo(g);
        if (info && !info.open) {
          g = keepCache ? closedChestTile(cacheKind) : Tile.Grass;
        }
        const zi = (fy0 + dy - minY) * zw + (fx0 + dx - minX);
        ground[zi] = g;
        detail[zi] = prefab.detail[dy * prefab.width + dx]!;
      }
    }

    // The felled fringe (cues at find scale): forest within `clearing`
    // of the footprint edge cuts to stumps and trampled grass — only
    // into still-transparent cells over natural ground.
    const clearing = def.clearing ?? 0;
    if (clearing > 0) {
      for (let dy = -clearing; dy < prefab.height + clearing; dy++) {
        for (let dx = -clearing; dx < prefab.width + clearing; dx++) {
          const inside = dx >= 0 && dy >= 0 && dx < prefab.width && dy < prefab.height;
          if (inside) continue;
          const zx = fx0 + dx - minX;
          const zy = fy0 + dy - minY;
          // Interior only — the all-skip-perimeter law, structurally.
          if (zx < 1 || zy < 1 || zx >= zw - 1 || zy >= zh - 1) continue;
          if (ground[zy * zw + zx] !== TILE_SKIP) continue;
          const wx = fx0 + dx;
          const wy = fy0 + dy;
          if (groundProbeAt(seed, wx, wy) !== 'forest') continue;
          const h = hashCoords(slotBase ^ 0x25, wx, wy);
          ground[zy * zw + zx] = h % 100 < 30 ? Tile.Stump : Tile.Grass;
        }
      }
    }

    // The whisper of a garrison: def entries muster at the anchor,
    // leveled into the slot tier's band. spawnSlots mirrors spawns.
    for (const [gi, g] of (def.garrison ?? []).entries()) {
      if (g.minTier !== undefined && f.tier < g.minTier) continue;
      const count = g.count[0] + (hashCoords(slotBase, gi, 13) % (g.count[1] - g.count[0] + 1));
      if (count <= 0) continue;
      const level =
        law.npcLevel[0] +
        (hashCoords(slotBase, gi, 7) % (law.npcLevel[1] - law.npcLevel[0] + 1)) +
        (g.levelOffset ?? 0);
      spawns.push({
        npc: g.npc,
        x: f.anchorX + 0.5,
        y: f.anchorY + 0.5,
        radius: 2,
        count,
        level,
        ...(g.hours !== undefined ? { hours: g.hours } : {}),
      });
      spawnSlots.push(f.slot);
    }

    // The footpath: single width, honest taper when the road was
    // never reached — feet visited this place, not carts.
    const path = paths.get(f.slot);
    if (path) {
      const startT = path.points[0]!.t;
      for (const p of path.points) {
        const zx = p.x - minX;
        const zy = p.y - minY;
        // Interior only — the all-skip-perimeter law, structurally.
        if (zx < 1 || zy < 1 || zx >= zw - 1 || zy >= zh - 1) continue;
        if (ground[zy * zw + zx] !== TILE_SKIP) continue;
        if (!standable(groundProbeAt(seed, p.x, p.y))) continue;
        const frac = (p.t - startT) / FOOTPATH_REACH;
        if (!path.reachedRoad && frac > 0.6) {
          if (hashCoords(slotBase ^ 0x2d, p.x, p.y) % 100 < 55) {
            ground[zy * zw + zx] = Tile.Grass;
          }
        } else {
          ground[zy * zw + zx] = Tile.Dirt;
        }
      }
    }
  }

  return {
    zone: {
      id: findsZoneId(cellX, cellY),
      name: 'Small finds',
      origin: { x: minX, y: minY },
      width: zw,
      height: zh,
      ground,
      detail,
      elev: undefined,
      spawns,
    },
    spawnSlots,
  };
}

// ------------------------------------------------- the density survey

export interface LandSimStats {
  /** Frontier cells actually decided (settled cells don't count). */
  evaluated: number;
  settledSkipped: number;
  sites: number;
  empty: number;
  byDef: Record<
    string,
    { count: number; tiers: Record<number, number>; prefabs: Record<string, number> }
  >;
  /** THE SMALL FINDS, observed: how the lattice actually deals. */
  finds: {
    total: number;
    /** Cells dealing N finds → how many cells (the walk's texture). */
    histogram: Record<number, number>;
    byDef: Record<string, number>;
  };
  /**
   * THE WAR-GROUNDS, observed with promotion UNGATED (a fresh scan
   * has no ledger, so the region law cannot answer — this is the
   * upper bound of hold density, and the bench must say so).
   */
  holds: { sites: number; byDef: Record<string, number> };
  /** THE COUNTRY, observed: sites standing in each family's own land. */
  territory: Record<string, { sites: number; familyTrue: number }>;
  /**
   * THE CAPITALS, observed (strongholds Phase 6): the pure seat sweep
   * over the scan's lattice window, and what it costs the cell layers
   * (the ONE-CELL DEBT made visible).
   */
  capitals: {
    seats: number;
    byLayout: Record<string, number>;
    byFamily: Record<string, number>;
    /** Countries in the window whose heart lawfully keeps no capital. */
    quietCountries: number;
    /** Cells the standing seats mask out of the site/finds layers. */
    maskedCells: number;
  };
}

/**
 * THE DENSITY SURVEY's engine (lived-in-land Phase 6) — the whole
 * land simulated at once through the REAL scaffolds: sites (promotion
 * ungated), the finds lattice, and the territory read, over a fresh
 * scan on the chosen epoch. A draft def rides in ctx like the site
 * survey always allowed — the loot-laboratory law: observed, not
 * computed. A generator so the /dev endpoint can breathe between
 * batches.
 */
export function* simulateLandSteps(
  seed: number,
  ctx: PoiContext,
  maxCells: number,
  epoch = 0,
  batch = 8,
): Generator<void, LandSimStats> {
  const stats: LandSimStats = {
    evaluated: 0,
    settledSkipped: 0,
    sites: 0,
    empty: 0,
    byDef: {},
    finds: { total: 0, histogram: {}, byDef: {} },
    holds: { sites: 0, byDef: {} },
    territory: {},
    capitals: { seats: 0, byLayout: {}, byFamily: {}, quietCountries: 0, maskedCells: 0 },
  };
  const atlas = familiesOf(ctx.defs);
  // THE CAPITAL SWEEP runs FIRST: the seats mask the cell layers, so
  // the survey must know them before a single cell rolls (the same
  // order the live server keeps via the lazy poiCtx computation).
  const seatCtx = {
    anchors: ctx.anchors,
    zoneRects: ctx.zoneRects,
    claimRings: ctx.claimRings,
    layouts: strongholdLayouts(),
    prefabs: ctx.prefabs,
    families: atlas,
  };
  const capitalRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  {
    const latticeR = Math.ceil((64 * POI_CELL) / 384) + 1;
    for (let gy = -latticeR; gy <= latticeR; gy++) {
      for (let gx = -latticeR; gx <= latticeR; gx++) {
        const seat = strongholdSeat(seed, gx, gy, seatCtx);
        if (!seat) {
          stats.capitals.quietCountries++;
          continue;
        }
        stats.capitals.seats++;
        stats.capitals.byLayout[seat.layoutId] = (stats.capitals.byLayout[seat.layoutId] ?? 0) + 1;
        stats.capitals.byFamily[seat.family] = (stats.capitals.byFamily[seat.family] ?? 0) + 1;
        capitalRects.push(seat.rect);
      }
      yield;
    }
  }
  const surveyCtx: PoiContext = { ...ctx, capitals: capitalRects };
  for (const { cx, cy } of poiScanOrder(64)) {
    if (stats.evaluated >= maxCells) break;
    const centerX = cx * POI_CELL + POI_CELL / 2;
    const centerY = cy * POI_CELL + POI_CELL / 2;
    const tier = dangerAt(seed, centerX, centerY, ctx.anchors);
    if (tier === 0) {
      stats.settledSkipped++;
      continue;
    }
    stats.evaluated++;
    if (capitalMasked(cx * POI_CELL, cy * POI_CELL, POI_CELL, POI_CELL, capitalRects)) {
      stats.capitals.maskedCells++;
      continue; // a capital's ground deals nothing — count it and move on
    }
    if (stats.evaluated % batch === 0) yield;
    const site = poiForCell(seed, cx, cy, epoch, surveyCtx, undefined, true);
    if (site) {
      stats.sites++;
      const rec = (stats.byDef[site.defId] ??= { count: 0, tiers: {}, prefabs: {} });
      rec.count++;
      rec.tiers[site.tier] = (rec.tiers[site.tier] ?? 0) + 1;
      rec.prefabs[site.prefabId] = (rec.prefabs[site.prefabId] ?? 0) + 1;
      const def = ctx.defs.find((d) => d.id === site.defId);
      if (def?.compound) {
        stats.holds.sites++;
        stats.holds.byDef[site.defId] = (stats.holds.byDef[site.defId] ?? 0) + 1;
      }
      const country = territoryAt(seed, centerX, centerY, atlas);
      if (country !== null) {
        const t = (stats.territory[country] ??= { sites: 0, familyTrue: 0 });
        t.sites++;
        if (def?.family === country) t.familyTrue++;
      }
    } else {
      stats.empty++;
    }
    const finds = findsForCell(
      seed,
      cx,
      cy,
      epoch,
      surveyCtx,
      site ? { x: site.anchorX, y: site.anchorY } : null,
    );
    stats.finds.total += finds.length;
    stats.finds.histogram[finds.length] = (stats.finds.histogram[finds.length] ?? 0) + 1;
    for (const f of finds) {
      stats.finds.byDef[f.defId] = (stats.finds.byDef[f.defId] ?? 0) + 1;
    }
  }
  return stats;
}

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DANGER_BAND,
  chestInfo,
  closedChestTile,
  dangerAt,
  hashCoords,
  type DangerAnchor,
} from '@devcraft/shared';
import {
  POI_DEFS,
  POI_PREFABS,
  dangerLaw,
  prefabFromJson,
  prefabToJson,
  type PoiDef,
  type PrefabDef,
  type ZoneDef,
  type ZoneSpawn,
} from '@devcraft/content';
import { DARK_BAND_Y, groundProbeAt } from './worldgen.js';

/**
 * THE POI SCAFFOLD — the wilderness sibling of the dungeon generator.
 *
 * The overworld is partitioned into macro-cells of POI_CELL tiles.
 * Per cell, named RNG streams decide (in order, each on its own salt so
 * adding a feature to one pass never reshuffles another): does a POI
 * exist here, which archetype, which prefab variant, where exactly it
 * stands, and how its garrison musters. Everything is pure until a
 * player walks near; the ledger (world_pois) records only deviations —
 * a decided cell never re-rolls by accident, and an epoch bump is the
 * regeneration lever.
 *
 * A composed POI is a tiny ZoneDef: it materializes through the SAME
 * addZone/registerSpawns machinery authored zones use — one
 * representation, one editor, one retire path.
 */

export const POI_CELL = 128;

/** RNG stream salts — the named-streams law. */
const ST_EXIST = 0x501e57;
const ST_KIND = 0x501e58;
const ST_VARIANT = 0x501e59;
const ST_SITE = 0x501e5a;
const ST_MUSTER = 0x501e5b;

/** Tiles a POI footprint (and its stamps) must keep clear of zones. */
const ZONE_CLEARANCE = 24;

/** Candidate anchors probed per cell before giving up. */
const SITE_TRIES = 24;

export interface PoiZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PoiContext {
  anchors: readonly DangerAnchor[];
  /** Authored-zone rects the scaffold must keep clear of. */
  zoneRects: readonly PoiZoneRect[];
  defs: readonly PoiDef[];
  prefabs: ReadonlyMap<string, PrefabDef>;
}

/** A decided cell — exactly what the world_pois ledger stores. */
export interface PoiSite {
  cellX: number;
  cellY: number;
  epoch: number;
  tier: number;
  defId: string;
  prefabId: string;
  anchorX: number;
  anchorY: number;
}

export function poiCellKey(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`;
}

export function poiCellOf(t: number): number {
  return Math.floor(t / POI_CELL);
}

export function poiZoneId(cellX: number, cellY: number): string {
  return `poi:${cellX},${cellY}`;
}

/** One draw from a cell's named stream (epoch folds in — re-rolls diverge). */
function stream(seed: number, salt: number, cellX: number, cellY: number, epoch: number): number {
  return hashCoords(hashCoords((seed ^ salt) >>> 0, cellX, cellY), epoch, salt);
}

/** Ground a POI can stand on (probe classes). */
function standable(cls: string): boolean {
  return cls === 'grass' || cls === 'forest';
}

/**
 * Decide a cell. Pure — same inputs, same answer, forever. `force`
 * (dev lever) skips the existence roll and, when it names an
 * archetype, the kind roll; the SITE scan still applies, so even a
 * forced POI never stands in a lake.
 */
export function poiForCell(
  seed: number,
  cellX: number,
  cellY: number,
  epoch: number,
  ctx: PoiContext,
  force?: string | true,
): PoiSite | null {
  const x0 = cellX * POI_CELL;
  const y0 = cellY * POI_CELL;
  const centerTier = dangerAt(seed, x0 + POI_CELL / 2, y0 + POI_CELL / 2, ctx.anchors);
  if (centerTier === 0) return null; // settled land is authored land

  const law = dangerLaw(centerTier);
  if (!force) {
    const roll = stream(seed, ST_EXIST, cellX, cellY, epoch) / 4294967296;
    if (roll >= law.poiChance) return null;
  }

  // KIND: weighted pick among archetypes eligible at this tier.
  let def: PoiDef | undefined;
  if (typeof force === 'string') {
    def = ctx.defs.find((d) => d.id === force);
    if (!def) return null;
  } else {
    const eligible = ctx.defs.filter(
      (d) => centerTier >= d.tiers[0] && centerTier <= d.tiers[1],
    );
    if (eligible.length === 0) return null;
    const totalW = eligible.reduce((s, d) => s + d.weight, 0);
    let pick = (stream(seed, ST_KIND, cellX, cellY, epoch) % totalW + totalW) % totalW;
    for (const d of eligible) {
      pick -= d.weight;
      if (pick < 0) {
        def = d;
        break;
      }
    }
    def ??= eligible[eligible.length - 1]!;
  }

  // VARIANT: which prefab from the pool.
  const variant = stream(seed, ST_VARIANT, cellX, cellY, epoch) % def.prefabs.length;
  const prefabId = def.prefabs[variant]!;
  const prefab = ctx.prefabs.get(prefabId);
  if (!prefab) {
    console.warn(`[poi] archetype '${def.id}' references unknown prefab '${prefabId}'`);
    return null;
  }

  // SITE: hashed candidate anchors, best standable footprint wins.
  const margin = Math.ceil(Math.max(prefab.width, prefab.height) / 2) + 14;
  const span = POI_CELL - margin * 2;
  const siteBase = stream(seed, ST_SITE, cellX, cellY, epoch);
  let best: { tx: number; ty: number; score: number } | null = null;
  for (let k = 0; k < SITE_TRIES; k++) {
    const tx = x0 + margin + (hashCoords(siteBase, k, 0) % span);
    const ty = y0 + margin + (hashCoords(siteBase, k, 1) % span);
    // Quick rejects before the full footprint scan.
    if (ty + prefab.height / 2 >= DARK_BAND_Y - ZONE_CLEARANCE) continue;
    if (!standable(groundProbeAt(seed, tx, ty))) continue;
    const fx0 = tx - Math.floor(prefab.width / 2);
    const fy0 = ty - Math.floor(prefab.height / 2);
    if (intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects)) continue;
    let score = 0;
    let ok = true;
    for (let dy = 0; dy < prefab.height && ok; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        const cls = groundProbeAt(seed, fx0 + dx, fy0 + dy);
        if (!standable(cls)) {
          ok = false;
          break;
        }
        if (cls === 'grass') score++; // open ground beats tree-choked
      }
    }
    if (!ok) continue;
    if (!best || score > best.score) best = { tx, ty, score };
  }
  if (!best) return null;

  return {
    cellX,
    cellY,
    epoch,
    tier: centerTier,
    defId: def.id,
    prefabId,
    anchorX: best.tx,
    anchorY: best.ty,
  };
}

function intersectsZones(
  x: number,
  y: number,
  w: number,
  h: number,
  rects: readonly PoiZoneRect[],
): boolean {
  const pad = ZONE_CLEARANCE;
  for (const r of rects) {
    if (
      x - pad < r.x + r.w &&
      x + w + pad > r.x &&
      y - pad < r.y + r.h &&
      y + h + pad > r.y
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Compose a decided site into a stampable ZoneDef: prefab layers
 * verbatim (TILE_SKIP fringe passes through the overlay), strongboxes
 * re-keyed to the tier's law, hand-placed prefab spawns leveled into
 * the tier band, garrison holdfast clustered at the heart, and
 * sentries posted on the approach ring OUTSIDE the footprint —
 * favoring the bearing toward settled land, because that's the way
 * players come.
 */
export function composePoi(seed: number, site: PoiSite, ctx: PoiContext): ZoneDef | null {
  const def = ctx.defs.find((d) => d.id === site.defId);
  const prefab = ctx.prefabs.get(site.prefabId);
  if (!def || !prefab) return null;
  const law = dangerLaw(site.tier);
  const musterBase = stream(seed, ST_MUSTER, site.cellX, site.cellY, site.epoch);
  const levelRoll = (i: number): number =>
    law.npcLevel[0] + (hashCoords(musterBase, i, 7) % (law.npcLevel[1] - law.npcLevel[0] + 1));

  const originX = site.anchorX - Math.floor(prefab.width / 2);
  const originY = site.anchorY - Math.floor(prefab.height / 2);

  // Layers: copy ground so the chest upgrade never mutates the prefab.
  const ground = new Uint16Array(prefab.ground);
  if (def.chestTierBonus !== undefined) {
    const kind = dangerLaw(site.tier + def.chestTierBonus).chest;
    for (let i = 0; i < ground.length; i++) {
      const info = chestInfo(ground[i]!);
      if (info && !info.open) ground[i] = closedChestTile(kind);
    }
  }

  const spawns: ZoneSpawn[] = [];
  let n = 0;
  // Hand-placed prefab spawns, leveled into the band.
  for (const s of prefab.spawns) {
    spawns.push({
      npc: s.npc,
      x: originX + s.dx + 0.5,
      y: originY + s.dy + 0.5,
      radius: s.radius,
      count: s.count,
      level: s.level ?? levelRoll(n++),
      name: s.name,
    });
  }

  // Garrison muster.
  const holdR = Math.max(2, Math.min(prefab.width, prefab.height) / 2 - 1);
  const sentryWants: Array<{ npc: string; level: number; name?: string; patrol?: boolean }> = [];
  for (const [gi, g] of def.garrison.entries()) {
    if (g.minTier !== undefined && site.tier < g.minTier) continue;
    const count =
      g.count[0] + (hashCoords(musterBase, gi, 13) % (g.count[1] - g.count[0] + 1));
    if (count <= 0) continue;
    if (g.role === 'holdfast') {
      spawns.push({
        npc: g.npc,
        x: site.anchorX + 0.5,
        y: site.anchorY + 0.5,
        radius: holdR,
        count,
        level: levelRoll(n++) + (g.levelOffset ?? 0),
        name: g.name,
      });
    } else {
      for (let i = 0; i < count; i++) {
        sentryWants.push({
          npc: g.npc,
          level: levelRoll(n++) + (g.levelOffset ?? 0),
          name: g.name,
          patrol: g.patrol,
        });
      }
    }
  }

  // Sentry ring: 12 bearings probed for standable ground, kept in
  // ANGULAR order (the patrol loop walks them) and also scored by how
  // squarely they face the nearest settled anchor — the camp watches
  // the road in.
  if (sentryWants.length > 0) {
    let ax = 0;
    let ay = -1;
    let bestD = Infinity;
    for (const a of ctx.anchors) {
      const d = Math.hypot(a.x - site.anchorX, a.y - site.anchorY);
      if (d < bestD) {
        bestD = d;
        ax = (a.x - site.anchorX) / Math.max(1, d);
        ay = (a.y - site.anchorY) / Math.max(1, d);
      }
    }
    const ringR = Math.max(prefab.width, prefab.height) / 2 + 5;
    const ring: Array<{ x: number; y: number; score: number }> = [];
    for (let b = 0; b < 12; b++) {
      const ang = (b / 12) * Math.PI * 2;
      const dirX = Math.cos(ang);
      const dirY = Math.sin(ang);
      const px = Math.round(site.anchorX + dirX * (ringR + (hashCoords(musterBase, b, 29) % 4)));
      const py = Math.round(site.anchorY + dirY * (ringR + (hashCoords(musterBase, b, 31) % 4)));
      if (!standable(groundProbeAt(seed, px, py))) continue;
      ring.push({ x: px + 0.5, y: py + 0.5, score: dirX * ax + dirY * ay });
    }
    const byScore = [...ring].sort((a, b) => b.score - a.score);
    const patrollers = sentryWants.filter((w) => w.patrol);
    const watchers = sentryWants.filter((w) => !w.patrol);
    // Standing watchers take the townward posts, best bearing first.
    for (let i = 0; i < watchers.length && i < byScore.length; i++) {
      const want = watchers[i]!;
      spawns.push({
        npc: want.npc,
        x: byScore[i]!.x,
        y: byScore[i]!.y,
        radius: 2,
        count: 1,
        level: want.level,
        name: want.name,
      });
    }
    // Patrollers pace the whole ring; a loop needs at least 3 honest
    // waypoints or the round degrades to a static townward post.
    for (let i = 0; i < patrollers.length; i++) {
      const want = patrollers[i]!;
      if (ring.length < 3) {
        const spot = byScore[(watchers.length + i) % Math.max(1, byScore.length)];
        if (!spot) break;
        spawns.push({
          npc: want.npc,
          x: spot.x,
          y: spot.y,
          radius: 2,
          count: 1,
          level: want.level,
          name: want.name,
        });
        continue;
      }
      // Spread starts around the loop so two patrollers walk opposite
      // arcs instead of marching in single file.
      const start = Math.floor((i * ring.length) / Math.max(1, patrollers.length));
      const loop = [...ring.slice(start), ...ring.slice(0, start)].map((p) => ({
        x: p.x,
        y: p.y,
      }));
      spawns.push({
        npc: want.npc,
        x: loop[0]!.x,
        y: loop[0]!.y,
        radius: 1.2,
        count: 1,
        level: want.level,
        name: want.name,
        patrol: loop,
      });
    }
  }

  return {
    id: poiZoneId(site.cellX, site.cellY),
    name: def.name,
    origin: { x: originX, y: originY },
    width: prefab.width,
    height: prefab.height,
    ground,
    detail: new Uint16Array(prefab.detail),
    elev: undefined, // flat: the site scan guaranteed level-0 ground
    spawns,
  };
}

/**
 * The POI prefab library, file-overrides-builtin: every shipped
 * POI_PREFABS entry that has no data/prefabs/<id>.json is written out
 * once (so Map Studio can curate it), then EVERY prefab file in the
 * library is loaded — a hand-captured prefab is as good a footprint
 * as a shipped one, which is how new variety ships as content. Parse
 * errors warn and fall back to the builtin (or skip a file-only
 * prefab), never brick a boot.
 */
export function loadPoiPrefabs(dataDir: string): Map<string, PrefabDef> {
  const dir = join(dataDir, 'prefabs');
  mkdirSync(dir, { recursive: true });
  const out = new Map<string, PrefabDef>();
  // Builtins first (and seed any missing files).
  for (const [id, builtin] of POI_PREFABS) {
    const file = join(dir, `${id}.json`);
    if (!existsSync(file)) {
      try {
        writeFileSync(file, JSON.stringify(prefabToJson(builtin), null, 2));
      } catch (err) {
        console.warn(`[poi] could not seed ${file}: ${String(err)}`);
      }
    }
    out.set(id, builtin);
  }
  // Every library file wins over its builtin twin (or joins fresh).
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return out;
  }
  for (const f of files) {
    const file = join(dir, f);
    try {
      const def = prefabFromJson(JSON.parse(readFileSync(file, 'utf8')));
      out.set(def.id, def);
    } catch (err) {
      console.warn(`[poi] bad prefab file ${file} — skipped (${String(err)})`);
    }
  }
  return out;
}

// ------------------------------------------------- bench instruments

/**
 * Deterministic cell scan order for simulation/preview: square rings
 * spiraling outward from the world-origin cell. Settled cells come
 * back too — the consumer counts or skips them (that IS a stat).
 */
export function* poiScanOrder(maxRadius: number): Generator<{ cx: number; cy: number }> {
  yield { cx: 0, cy: 0 };
  for (let r = 1; r <= maxRadius; r++) {
    for (let x = -r; x <= r; x++) yield { cx: x, cy: -r };
    for (let y = -r + 1; y <= r; y++) yield { cx: r, cy: y };
    for (let x = r - 1; x >= -r; x--) yield { cx: x, cy: r };
    for (let y = r - 1; y >= -r + 1; y--) yield { cx: -r, cy: y };
  }
}

export interface PoiSimStats {
  /** Frontier cells actually decided (settled cells don't count). */
  evaluated: number;
  settledSkipped: number;
  sites: number;
  empty: number;
  byDef: Record<
    string,
    { count: number; tiers: Record<number, number>; prefabs: Record<string, number> }
  >;
}

/**
 * THE OBSERVED PANEL's engine — run the REAL poiForCell over a fresh
 * scan (no ledger, chosen epoch) and report what the frontier would
 * actually host. A draft def rides in `ctx.defs` (the caller overlays
 * it), so the bench answers for UNSAVED edits — the loot-laboratory
 * law: drop design is observed, not computed.
 *
 * A generator so the /dev endpoint can breathe between batches (the
 * game tick shares this event loop): each yield marks `batch`
 * evaluated cells; the return value is the finished stats.
 */
export function* simulatePoisSteps(
  seed: number,
  ctx: PoiContext,
  maxCells: number,
  epoch = 0,
  batch = 8,
): Generator<void, PoiSimStats> {
  const stats: PoiSimStats = {
    evaluated: 0,
    settledSkipped: 0,
    sites: 0,
    empty: 0,
    byDef: {},
  };
  for (const { cx, cy } of poiScanOrder(64)) {
    if (stats.evaluated >= maxCells) break;
    const tier = dangerAt(
      seed,
      cx * POI_CELL + POI_CELL / 2,
      cy * POI_CELL + POI_CELL / 2,
      ctx.anchors,
    );
    if (tier === 0) {
      stats.settledSkipped++;
      continue;
    }
    stats.evaluated++;
    if (stats.evaluated % batch === 0) yield;
    const site = poiForCell(seed, cx, cy, epoch, ctx);
    if (!site) {
      stats.empty++;
      continue;
    }
    stats.sites++;
    const rec = (stats.byDef[site.defId] ??= { count: 0, tiers: {}, prefabs: {} });
    rec.count++;
    rec.tiers[site.tier] = (rec.tiers[site.tier] ?? 0) + 1;
    rec.prefabs[site.prefabId] = (rec.prefabs[site.prefabId] ?? 0) + 1;
  }
  return stats;
}

/** Synchronous drain of simulatePoisSteps (tests, small scans). */
export function simulatePois(
  seed: number,
  ctx: PoiContext,
  maxCells: number,
  epoch = 0,
): PoiSimStats {
  const it = simulatePoisSteps(seed, ctx, maxCells, epoch);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

/**
 * Bench preview: find a REAL site for an archetype at a requested
 * tier and compose it — the danger bands are radial, so the scan
 * jumps straight to cells whose centers sit mid-band and walks the
 * circle. Returns the composed zone (cues, garrison, sentries and
 * all) plus the site, or null when no honest ground exists at that
 * tier within the sweep. `prefabId` narrows the preview to one pool
 * variant (swapped in before composition — preview-only surgery).
 */
export function previewPoi(
  seed: number,
  ctx: PoiContext,
  defId: string,
  tier: number,
  prefabId?: string,
): { site: PoiSite; zone: ZoneDef } | null {
  const def = ctx.defs.find((d) => d.id === defId);
  if (!def) return null;
  // Mid-band radius from the FIRST anchor (the hearth): tier T spans
  // [safeR + (T-1)·band, safeR + T·band).
  const hearth = ctx.anchors[0] ?? { x: 0, y: 0, safeR: 0 };
  const radius = hearth.safeR + (tier - 0.5) * DANGER_BAND;
  const seen = new Set<string>();
  for (let step = 0; step < 96; step++) {
    const ang = (step / 96) * Math.PI * 2;
    const tx = hearth.x + Math.cos(ang) * radius;
    const ty = hearth.y + Math.sin(ang) * radius;
    const cx = poiCellOf(tx);
    const cy = poiCellOf(ty);
    const key = poiCellKey(cx, cy);
    if (seen.has(key)) continue;
    seen.add(key);
    const site = poiForCell(seed, cx, cy, 0, ctx, defId);
    if (!site || site.tier !== tier) continue;
    const shown =
      prefabId !== undefined && ctx.prefabs.has(prefabId)
        ? { ...site, prefabId }
        : site;
    const zone = composePoi(seed, shown, ctx);
    if (zone) return { site: shown, zone };
  }
  return null;
}

/** The default context over the live zone list. */
export function poiContext(
  anchors: readonly DangerAnchor[],
  zones: readonly ZoneDef[],
  prefabs: ReadonlyMap<string, PrefabDef>,
): PoiContext {
  return {
    anchors,
    zoneRects: zones
      .filter((z) => !z.id.startsWith('poi:'))
      .map((z) => ({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height })),
    defs: [...POI_DEFS.values()],
    prefabs,
  };
}

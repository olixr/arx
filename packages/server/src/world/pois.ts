import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DANGER_BAND,
  TILE_DEFS,
  TILE_SKIP,
  Tile,
  chestInfo,
  closedChestTile,
  dangerAt,
  hashCoords,
  isSignTile,
  sanitizeSignText,
  type DangerAnchor,
} from '@arx/shared';
import {
  PLANNED_ZONE_RECTS,
  POI_DEFS,
  POI_PREFABS,
  dangerLaw,
  prefabFromJson,
  prefabToJson,
  roadBearingAt,
  type PoiDef,
  type PrefabDef,
  type ZoneActorSpawn,
  type ZoneDef,
  type ZoneSign,
  type ZoneSpawn,
} from '@arx/content';
import { DARK_BAND_Y, groundProbeAt } from '@arx/content';

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
export const ZONE_CLEARANCE = 24;

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
    // Weight-0 archetypes never roll on their own — they exist only
    // for the authored-sites law (the Last Lamp is placed, not found).
    const eligible = ctx.defs.filter(
      (d) => d.weight > 0 && centerTier >= d.tiers[0] && centerTier <= d.tiers[1],
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
  pad = ZONE_CLEARANCE,
): boolean {
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

  // The approach bearing — the way players actually come. A carved
  // road within hailing distance wins (Epic 3's law: cues aim at
  // ROADS — the worn path runs to the verge, the warning scatter
  // faces the traveler); with no road near, the bee-line to the
  // nearest settled anchor stands in. Computed once, shared by the
  // cues and the watchers.
  let ax = 0;
  let ay = -1;
  const roadWard = roadBearingAt(site.anchorX, site.anchorY, 40);
  if (roadWard) {
    ax = roadWard.x;
    ay = roadWard.y;
  } else {
    let bestD = Infinity;
    for (const a of ctx.anchors) {
      const d = Math.hypot(a.x - site.anchorX, a.y - site.anchorY);
      if (d < bestD) {
        bestD = d;
        ax = (a.x - site.anchorX) / Math.max(1, d);
        ay = (a.y - site.anchorY) / Math.max(1, d);
      }
    }
  }

  // The composed zone is the prefab plus a transparent fringe wide
  // enough to carry the approach cues; with no cues the pad is 0 and
  // the zone is exactly the footprint, as in phase 1.
  const cues = def.cues;
  const pad = cues
    ? Math.max(
        cues.clearing ?? 0,
        cues.approachPath ? 9 : 0,
        cues.scatter && cues.scatter.length > 0 ? 7 : 0,
      )
    : 0;
  const zw = prefab.width + pad * 2;
  const zh = prefab.height + pad * 2;
  const originX = site.anchorX - Math.floor(prefab.width / 2) - pad;
  const originY = site.anchorY - Math.floor(prefab.height / 2) - pad;

  // Layers: fringe starts fully transparent; the prefab blits into
  // the center (chest re-keyed under the tier law as it lands).
  const chestKind =
    def.chestTierBonus !== undefined
      ? dangerLaw(site.tier + def.chestTierBonus).chest
      : null;
  const ground = new Uint16Array(zw * zh).fill(TILE_SKIP);
  const detail = new Uint16Array(zw * zh);
  for (let dy = 0; dy < prefab.height; dy++) {
    for (let dx = 0; dx < prefab.width; dx++) {
      let g = prefab.ground[dy * prefab.width + dx]!;
      if (chestKind) {
        const info = chestInfo(g);
        if (info && !info.open) g = closedChestTile(chestKind);
      }
      const zi = (dy + pad) * zw + (dx + pad);
      ground[zi] = g;
      detail[zi] = prefab.detail[dy * prefab.width + dx]!;
    }
  }

  // ---- THE WARNING VOCABULARY: cues stamped into the fringe only —
  // a cell the prefab owns is never touched, and every cue verifies
  // the ground it replaces is natural (grass/forest probe) so cues
  // never pave water, rock, or another zone's work (zone clearance
  // already keeps the whole rect 24 tiles from authored land).
  const fringeSkip = (zx: number, zy: number): boolean =>
    ground[zy * zw + zx] === TILE_SKIP;
  const worldOf = (zx: number, zy: number): { wx: number; wy: number } => ({
    wx: originX + zx,
    wy: originY + zy,
  });

  if (cues?.clearing) {
    // The felled clearing: forest within `clearing` of the footprint
    // edge is cut — stumps where the trees stood thickest, trampled
    // grass elsewhere. The camp burns wood, and the wood came from
    // somewhere.
    for (let zy = 0; zy < zh; zy++) {
      for (let zx = 0; zx < zw; zx++) {
        if (!fringeSkip(zx, zy)) continue;
        const ex = Math.max(pad - zx, zx - (zw - 1 - pad), 0);
        const ey = Math.max(pad - zy, zy - (zh - 1 - pad), 0);
        const edgeDist = Math.max(ex, ey);
        if (edgeDist > cues.clearing) continue;
        const { wx, wy } = worldOf(zx, zy);
        if (groundProbeAt(seed, wx, wy) !== 'forest') continue;
        const h = hashCoords(musterBase ^ 0x25, wx, wy);
        ground[zy * zw + zx] = h % 100 < 30 ? Tile.Stump : Tile.Grass;
      }
    }
  }

  if (cues?.approachPath) {
    // The worn path: a wobbling dirt stub from the footprint edge
    // outward on the townward bearing — it dies honestly at water or
    // rock instead of paving them.
    const half = Math.max(prefab.width, prefab.height) / 2;
    for (let t = Math.floor(half) - 1; t <= half + pad; t++) {
      const wob = ((hashCoords(musterBase ^ 0x29, t, 0) % 3) - 1) * 0.7;
      const wx = Math.round(site.anchorX + ax * t - ay * wob);
      const wy = Math.round(site.anchorY + ay * t + ax * wob);
      const zx = wx - originX;
      const zy = wy - originY;
      if (zx < 0 || zy < 0 || zx >= zw || zy >= zh) break;
      if (!fringeSkip(zx, zy)) continue; // the prefab's own ground wins
      const cls = groundProbeAt(seed, wx, wy);
      if (cls !== 'grass' && cls !== 'forest') break;
      ground[zy * zw + zx] = Tile.Dirt;
      // A worn path is two ruts wide more often than one.
      const sx = wx - Math.round(ay);
      const sy = wy + Math.round(ax);
      const szx = sx - originX;
      const szy = sy - originY;
      if (
        szx >= 0 && szy >= 0 && szx < zw && szy < zh &&
        fringeSkip(szx, szy) &&
        hashCoords(musterBase ^ 0x2b, sx, sy) % 100 < 55
      ) {
        const scls = groundProbeAt(seed, sx, sy);
        if (scls === 'grass' || scls === 'forest') ground[szy * zw + szx] = Tile.Dirt;
      }
    }
  }

  for (const [si, sc] of (cues?.scatter ?? []).entries()) {
    // Cue tiles on the approach cone — the bones before the ruin, the
    // banner before the camp. Hash-placed, standable-probed, and only
    // into still-transparent fringe (the path keeps its ruts).
    const tile = Tile[sc.tile as keyof typeof Tile];
    if (typeof tile !== 'number') continue;
    const half = Math.max(prefab.width, prefab.height) / 2;
    let placed = 0;
    for (let k = 0; k < sc.count * 8 && placed < sc.count; k++) {
      const h = hashCoords(musterBase ^ 0x2f, si * 131 + k, 0);
      const spread = (((h >>> 4) % 1000) / 1000 - 0.5) * (Math.PI * 0.66);
      const baseAng = Math.atan2(ay, ax);
      const ang = baseAng + spread;
      const r = half + 2 + ((h >>> 14) % Math.max(1, pad - 2));
      const wx = Math.round(site.anchorX + Math.cos(ang) * r);
      const wy = Math.round(site.anchorY + Math.sin(ang) * r);
      const zx = wx - originX;
      const zy = wy - originY;
      if (zx < 0 || zy < 0 || zx >= zw || zy >= zh) continue;
      if (!fringeSkip(zx, zy)) continue;
      const cls = groundProbeAt(seed, wx, wy);
      if (cls !== 'grass' && cls !== 'forest') continue;
      ground[zy * zw + zx] = tile;
      placed++;
    }
  }

  const spawns: ZoneSpawn[] = [];
  let n = 0;
  // Hand-placed prefab spawns, leveled into the band UNLESS the
  // prefab authored a level (the stolen cows in a brigand pen stay
  // level-3 cows — danger scales the threats, not the livestock).
  // Their relative coords are prefab-local — the pad shifts them.
  for (const s of prefab.spawns) {
    spawns.push({
      npc: s.npc,
      x: originX + pad + s.dx + 0.5,
      y: originY + pad + s.dy + 0.5,
      radius: s.radius,
      count: s.count,
      level: s.level ?? levelRoll(n++),
      name: s.name,
      hours: s.hours,
    });
  }

  // Garrison muster. A name pool crowns the site's own champion —
  // hash-picked once, stable forever (the hill has always been
  // Korga's), winning over any static name.
  const holdR = Math.max(2, Math.min(prefab.width, prefab.height) / 2 - 1);
  const sentryWants: Array<{
    npc: string;
    level: number;
    name?: string;
    patrol?: boolean;
    hours?: { from: number; to: number };
  }> = [];
  for (const [gi, g] of def.garrison.entries()) {
    if (g.minTier !== undefined && site.tier < g.minTier) continue;
    const count =
      g.count[0] + (hashCoords(musterBase, gi, 13) % (g.count[1] - g.count[0] + 1));
    if (count <= 0) continue;
    const gname = g.names
      ? g.names[hashCoords(musterBase, gi, 41) % g.names.length]
      : g.name;
    if (g.role === 'holdfast') {
      spawns.push({
        npc: g.npc,
        x: site.anchorX + 0.5,
        y: site.anchorY + 0.5,
        radius: holdR,
        count,
        level: levelRoll(n++) + (g.levelOffset ?? 0),
        name: gname,
        hours: g.hours,
      });
    } else {
      for (let i = 0; i < count; i++) {
        sentryWants.push({
          npc: g.npc,
          level: levelRoll(n++) + (g.levelOffset ?? 0),
          name: gname,
          patrol: g.patrol,
          hours: g.hours,
        });
      }
    }
  }

  // Sentry ring: 12 bearings probed for standable ground, kept in
  // ANGULAR order (the patrol loop walks them) and also scored by how
  // squarely they face the townward bearing computed above — the camp
  // watches the road in. Friendly watch actors share the same ring:
  // the Wayward Watch stands exactly where a goblin sentry would,
  // because both are watching the same road.
  const staff = def.actors ?? [];
  const ring: Array<{ x: number; y: number; score: number }> = [];
  if (sentryWants.length > 0 || staff.some((s) => s.post === 'watch')) {
    const ringR = Math.max(prefab.width, prefab.height) / 2 + 5;
    for (let b = 0; b < 12; b++) {
      const ang = (b / 12) * Math.PI * 2;
      const dirX = Math.cos(ang);
      const dirY = Math.sin(ang);
      const px = Math.round(site.anchorX + dirX * (ringR + (hashCoords(musterBase, b, 29) % 4)));
      const py = Math.round(site.anchorY + dirY * (ringR + (hashCoords(musterBase, b, 31) % 4)));
      if (!standable(groundProbeAt(seed, px, py))) continue;
      ring.push({ x: px + 0.5, y: py + 0.5, score: dirX * ax + dirY * ay });
    }
  }
  const byScore = [...ring].sort((a, b) => b.score - a.score);
  const sentryWatchPosts = sentryWants.filter((w) => !w.patrol).length;
  if (sentryWants.length > 0) {
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
        hours: want.hours,
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
          hours: want.hours,
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
        hours: want.hours,
      });
    }
  }

  // ---- THE FRIENDLY STAFF + carried placements.
  const actorSpawns: ZoneActorSpawn[] = [];
  // Prefab-authored actors ride the stamp verbatim (curated posts).
  for (const a of prefab.actorSpawns) {
    actorSpawns.push({
      actor: a.actor,
      x: originX + pad + a.dx + 0.5,
      y: originY + pad + a.dy + 0.5,
      ...(a.dir !== undefined ? { dir: a.dir } : {}),
      ...(a.routine !== undefined ? { routine: a.routine } : {}),
    });
  }
  if (staff.length > 0) {
    // Hearth posts: open tiles beside the prefab's campfire when it
    // keeps one (the keeper stands BY the fire — semantic placement,
    // not a coordinate), else the first open tiles around the anchor.
    // Solid props (the stall, the crates) are never a post.
    const open = (zx: number, zy: number): boolean => {
      if (zx < 0 || zy < 0 || zx >= zw || zy >= zh) return false;
      const t = ground[zy * zw + zx]!;
      return t !== TILE_SKIP && !TILE_DEFS[t as Tile]!.solid;
    };
    let fireZ: { x: number; y: number } | null = null;
    for (let i = 0; i < ground.length; i++) {
      if (ground[i] === Tile.Campfire) {
        fireZ = { x: i % zw, y: Math.floor(i / zw) };
        break;
      }
    }
    const heart = fireZ ?? { x: site.anchorX - originX, y: site.anchorY - originY };
    const hearthSpots: Array<{ x: number; y: number; dir: number }> = [];
    for (let r = 1; r <= 4 && hearthSpots.length < 6; r++) {
      for (let dy = -r; dy <= r && hearthSpots.length < 6; dy++) {
        for (let dx = -r; dx <= r && hearthSpots.length < 6; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const zx = heart.x + dx;
          const zy = heart.y + dy;
          if (!open(zx, zy)) continue;
          hearthSpots.push({
            x: originX + zx + 0.5,
            y: originY + zy + 0.5,
            // Face the fire — the keeper minds the pot, not the void.
            dir: Math.atan2(heart.y - zy, heart.x - zx),
          });
        }
      }
    }
    let hearthI = 0;
    let watchI = 0;
    for (const [ei, entry] of staff.entries()) {
      const slug = entry.pool[hashCoords(musterBase ^ 0x37, ei, 3) % entry.pool.length]!;
      if (entry.post === 'hearth') {
        const spot = hearthSpots[hearthI++];
        if (!spot) continue; // a prefab with no open interior posts nobody
        actorSpawns.push({
          actor: slug,
          x: spot.x,
          y: spot.y,
          dir: spot.dir,
          ...(entry.routine !== undefined ? { routine: entry.routine } : {}),
        });
      } else {
        // Watch posts continue past the hostile sentries' claims, best
        // townward bearing first; with no honest ring the watch falls
        // back to the hearth (a guard indoors beats no guard).
        const post = byScore[sentryWatchPosts + watchI++];
        const spot = post ?? hearthSpots[hearthI++];
        if (!spot) continue;
        actorSpawns.push({
          actor: slug,
          x: spot.x,
          y: spot.y,
          // The watch faces down the road players arrive by.
          dir: Math.atan2(ay, ax),
          ...(entry.routine !== undefined ? { routine: entry.routine } : {}),
        });
      }
    }
  }

  // Prefab portals ride the stamp — a delve gate in the sketch is a
  // WORKING riftgate in the world (worldSource indexes zone portals).
  const portals = prefab.portals.map((p) => ({
    x: originX + pad + p.dx,
    y: originY + pad + p.dy,
    ...(p.dest !== undefined ? { dest: p.dest } : {}),
    ...(p.delve !== undefined ? { delve: p.delve } : {}),
  }));

  // A board in the sketch gets WORDS from the def's pool, hash-picked
  // ONCE per site (the champion-name law) so two roadside crofts on
  // the same road wear different signs and each keeps its own forever.
  // A def with no pool leaves its boards blank, which reads as a
  // weathered, unlettered plank — never as a bug.
  const signs: ZoneSign[] = [];
  if (def.signs && def.signs.length > 0) {
    let nth = 0;
    for (let i = 0; i < ground.length; i++) {
      if (!isSignTile(ground[i]!)) continue;
      const pick = def.signs[hashCoords(musterBase, 71 + nth, 13) % def.signs.length]!;
      nth++;
      const text = sanitizeSignText(pick);
      signs.push({
        x: originX + (i % zw),
        y: originY + Math.floor(i / zw),
        title: text.title,
        ...(text.lines.length > 0 ? { lines: text.lines } : {}),
      });
    }
  }

  return {
    id: poiZoneId(site.cellX, site.cellY),
    name: def.name,
    origin: { x: originX, y: originY },
    width: zw,
    height: zh,
    ground,
    detail,
    elev: undefined, // flat: the site scan guaranteed level-0 ground
    spawns,
    ...(actorSpawns.length > 0 ? { actorSpawns } : {}),
    ...(portals.length > 0 ? { portals } : {}),
    ...(signs.length > 0 ? { signs } : {}),
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

/**
 * The default context over the live zone list — PLUS the master plan's
 * planned zone rects (Amberford, Silverfall), so the frontier keeps
 * out of streets that haven't been built yet. A rect listed twice
 * (planned AND registered) costs one redundant intersection test.
 */
export function poiContext(
  anchors: readonly DangerAnchor[],
  zones: readonly ZoneDef[],
  prefabs: ReadonlyMap<string, PrefabDef>,
): PoiContext {
  return {
    anchors,
    zoneRects: [
      ...zones
        .filter((z) => !z.id.startsWith('poi:'))
        .map((z) => ({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height })),
      ...PLANNED_ZONE_RECTS,
    ],
    defs: [...POI_DEFS.values()],
    prefabs,
  };
}

/**
 * THE AUTHORED-SITES LAW's ground half: nudge a pinned anchor to the
 * nearest spot whose whole footprint stands (spiral scan, radius ≤
 * maxNudge). The standable probe already reads roads as 'rock' inside
 * ROAD_SHOULDER, so a pinned site can hug a road and never block it.
 * Zone rects are honored with a TIGHT pad (6, not the frontier's 24)
 * — authored sites are the plan placing its own landmarks near its
 * own streets, deliberately. Returns null when no honest ground
 * exists in range (the seeder warns and stands nothing).
 */
export function findAuthoredAnchor(
  seed: number,
  x: number,
  y: number,
  prefab: PrefabDef,
  ctx: PoiContext,
  maxNudge = 14,
): { x: number; y: number } | null {
  const fits = (tx: number, ty: number): boolean => {
    if (ty + prefab.height / 2 >= DARK_BAND_Y - ZONE_CLEARANCE) return false;
    const fx0 = tx - Math.floor(prefab.width / 2);
    const fy0 = ty - Math.floor(prefab.height / 2);
    if (intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects, 6)) return false;
    for (let dy = 0; dy < prefab.height; dy++) {
      for (let dx = 0; dx < prefab.width; dx++) {
        if (!standable(groundProbeAt(seed, fx0 + dx, fy0 + dy))) return false;
      }
    }
    return true;
  };
  if (fits(x, y)) return { x, y };
  for (let r = 1; r <= maxNudge; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (fits(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

/**
 * Would this decided site's footprint collide with the context's zone
 * rects today? The site-pick honors zones only at ROLL time, so a rect
 * planned after a cell was decided needs this retro check — the boot
 * sweep re-rolls any row it flags. A site whose prefab has left the
 * library counts as blocked (it can never compose again anyway).
 */
export function poiSiteBlocked(site: PoiSite, ctx: PoiContext): boolean {
  const prefab = ctx.prefabs.get(site.prefabId);
  if (!prefab) return true;
  const fx0 = site.anchorX - Math.floor(prefab.width / 2);
  const fy0 = site.anchorY - Math.floor(prefab.height / 2);
  return intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects);
}

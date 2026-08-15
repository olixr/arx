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
  FRONTIER,
  MINOR_DEFS,
  PLANNED_ZONE_RECTS,
  POI_DEFS,
  POI_PREFABS,
  POST_SIGN_ROWS,
  STRONGHOLD_PREFABS,
  ROAD_SHOULDER,
  dangerLaw,
  familiesOf,
  prefabFromJson,
  prefabToJson,
  roadBearingAt,
  roadDistanceAt,
  territoryAt,
  territoryWeight,
  type MinorDef,
  type PoiDef,
  type PoiGarrisonEntry,
  type PostKind,
  type PrefabDef,
  type ZoneActorSpawn,
  type ZoneDef,
  type ZoneSign,
  type ZoneSpawn,
} from '@arx/content';
import { DARK_BAND_Y, groundProbeAt, shoreProbeAt } from '@arx/content';

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
/** THE WAR-GROUND's promotion stream (Phase 4) — its own salt, so
 * adding holds never reshuffled a single standing camp. */
const ST_HOLD = 0x501e62;

/** Tiles a POI footprint (and its stamps) must keep clear of zones. */
export const ZONE_CLEARANCE = 24;

/** Candidate anchors probed per cell before giving up. */
const SITE_TRIES = 24;

/**
 * THE SHORE CAMP (docs/skral-plan.md): how far a shore-flagged def's
 * anchor may stand from open water — a stone's throw, far enough for
 * the footprint to keep dry ground, near enough that the camp and its
 * water read as one place.
 */
const SHORE_CAMP_REACH = 10;

/**
 * Coarse cell gate for shore-flagged kinds: a 3×3 lattice of wide
 * probes across the cell. Misses a puddle at the far rim sometimes —
 * a shore camp made slightly rarer is fine; a landlocked cell burning
 * its one roll on a def the anchors must all refuse is not.
 */
function cellSeesWater(seed: number, x0: number, y0: number): boolean {
  const q = POI_CELL / 4;
  for (let gy = 1; gy <= 3; gy++) {
    for (let gx = 1; gx <= 3; gx++) {
      if (shoreProbeAt(seed, x0 + gx * q, y0 + gy * q, 14)) return true;
    }
  }
  return false;
}

export interface PoiZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A claimed homestead's yard (THE HEARTH WATCH, living-frontier
 * Phase 4): center + radius in tiles. A PURE EXCLUSION MASK — rings
 * reject materialization candidates and nothing else. Never a
 * DangerAnchor (THE HAVEN LAW: an anchor re-origins the danger band;
 * a bed in tier-4 country must not flatten fifty tiles of frontier —
 * the land around a hearth stays exactly as wild as it was).
 */
export interface ClaimRing {
  x: number;
  y: number;
  r: number;
}

export interface PoiContext {
  anchors: readonly DangerAnchor[];
  /** Authored-zone rects the scaffold must keep clear of. */
  zoneRects: readonly PoiZoneRect[];
  /** Claimed-hearth yards — nothing materializes inside one. */
  claimRings: readonly ClaimRing[];
  defs: readonly PoiDef[];
  /**
   * THE SMALL FINDS roster (lived-in-land Phase 2) — REQUIRED, not
   * defaulted, for the same reason claimRings is: a placement layer
   * with an optional roster is a layer some call site forgets. The
   * compiler holds every builder to it; poiContext() fills it from
   * the live registry.
   */
  minors: readonly MinorDef[];
  prefabs: ReadonlyMap<string, PrefabDef>;
  /**
   * THE CAPITAL LAW's mask (strongholds Phase 3) — rects of every
   * seated capital in reach. REQUIRED, not defaulted (the claimRings
   * precedent): a cell whose ground a capital claims deals no site
   * and no finds, ever, so capitals never collide with the cell
   * layers by construction. The compiler holds every builder to it.
   */
  capitals: readonly PoiZoneRect[];
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
  /**
   * THE REGION LAW's gate (Phase 4): holds may only stand where the
   * caller says the neighborhood holds none — region knowledge lives
   * in the ledger, so the CALLER answers it and this pure function
   * stays pure. Defaults closed: sweeps, sims, and renewals that never
   * opted in cannot deal a war-ground by accident.
   */
  allowHold = false,
): PoiSite | null {
  const x0 = cellX * POI_CELL;
  const y0 = cellY * POI_CELL;
  // THE CAPITAL LAW: ground a capital claims deals nothing — masked
  // cells are silent before any stream rolls (the ONE-CELL DEBT).
  for (const c of ctx.capitals) {
    if (
      x0 < c.x + c.w + 24 && c.x - 24 < x0 + POI_CELL &&
      y0 < c.y + c.h + 24 && c.y - 24 < y0 + POI_CELL
    ) {
      return null;
    }
  }
  const centerTier = dangerAt(seed, x0 + POI_CELL / 2, y0 + POI_CELL / 2, ctx.anchors);
  if (centerTier === 0) return null; // settled land is authored land

  // THE GATHERED MARCHES (the hybrid charter): a capital gathers its
  // camps — cells in the march band around a seat deal MORE and lean
  // harder to the country's family, so every capital reads as the
  // heart of a constellation (clusters of clusters). Pure: the same
  // ctx.capitals input the mask already reads.
  let march = false;
  {
    const ccx = x0 + POI_CELL / 2;
    const ccy = y0 + POI_CELL / 2;
    for (const c of ctx.capitals) {
      const rx = Math.max(c.x - ccx, 0, ccx - (c.x + c.w));
      const ry = Math.max(c.y - ccy, 0, ccy - (c.y + c.h));
      if (rx * rx + ry * ry <= FRONTIER.marchBand * FRONTIER.marchBand) {
        march = true;
        break;
      }
    }
  }

  const law = dangerLaw(centerTier);
  if (!force) {
    const roll = stream(seed, ST_EXIST, cellX, cellY, epoch) / 4294967296;
    const chance = Math.min(0.85, law.poiChance * (march ? FRONTIER.marchGather : 1));
    if (roll >= chance) return null;
  }

  // VARIANT + SITE as one decision, extracted so a PROMOTED cell whose
  // big court finds no ground can fall back to its ordinary roll — the
  // land refusing a war-ground deals a camp, never nothing.
  const decideSite = (def: PoiDef): PoiSite | null => {
    // VARIANT: which prefab from the pool.
    const variant = stream(seed, ST_VARIANT, cellX, cellY, epoch) % def.prefabs.length;
    const prefabId = def.prefabs[variant]!;
    const prefab = ctx.prefabs.get(prefabId);
    if (!prefab) {
      console.warn(`[poi] archetype '${def.id}' references unknown prefab '${prefabId}'`);
      return null;
    }

    // SITE: hashed candidate anchors, best standable footprint wins.
    // A compound's margin covers its whole EXTENT (court + wing ring +
    // wing bodies) so the war-ground never pokes out of its cell — the
    // scan still probes only the court's footprint; wings probe their
    // own ground at compose time and skip honestly when it refuses.
    const margin = def.compound
      ? Math.ceil(compoundExtent(def, prefab, ctx)) + 14
      : Math.ceil(Math.max(prefab.width, prefab.height) / 2) + 14;
    const span = POI_CELL - margin * 2;
    if (span <= 0) return null; // a footprint bigger than its cell
    const siteBase = stream(seed, ST_SITE, cellX, cellY, epoch);
    let best: { tx: number; ty: number; score: number } | null = null;
    for (let k = 0; k < SITE_TRIES; k++) {
      const tx = x0 + margin + (hashCoords(siteBase, k, 0) % span);
      const ty = y0 + margin + (hashCoords(siteBase, k, 1) % span);
      // Quick rejects before the full footprint scan.
      if (ty + prefab.height / 2 >= DARK_BAND_Y - ZONE_CLEARANCE) continue;
      if (!standable(groundProbeAt(seed, tx, ty))) continue;
      // THE SHORE CAMP: a shore-flagged def stands within a stone's
      // throw of open water or not at all — the same elevation truth
      // the wild spawner's shore refinement reads, so the fishing
      // camp and the shoreline can never disagree. A shore-flagged
      // COMPOUND is judged from its whole extent: the court (which
      // carries its own dug pool) may stand a wing-ring inland while
      // the hold's outermost camps work the actual waterline — the
      // court's own margin already measures that reach. A shore
      // LANDMARK (the drowned villages) is judged the same way: the
      // village carries its own dug vein at heart, and its hem is
      // what works the real waterline — anchor-reach-10 on a 60-tile
      // footprint would demand the heart itself stand IN the lake.
      const expanse =
        def.compound || Math.max(prefab.width, prefab.height) >= 34;
      const shoreReach = expanse ? margin - 14 + SHORE_CAMP_REACH : SHORE_CAMP_REACH;
      if (def.shore && !shoreProbeAt(seed, tx, ty, shoreReach)) continue;
      const fx0 = tx - Math.floor(prefab.width / 2);
      const fy0 = ty - Math.floor(prefab.height / 2);
      if (intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects)) continue;
      // THE EXCLUSION LAW (Phase 4): a claimed yard refuses every
      // materialization candidate — satellites, tolls, renewals, wakes
      // and fresh rolls alike, since they all pass through this scan.
      if (intersectsRings(fx0, fy0, prefab.width, prefab.height, ctx.claimRings)) continue;
      // THE RELAXED SITING, generalized (the hybrid charter): a
      // whole-footprint all-standable scan was always statistically
      // brutal (the capitals' Phase-3 audit) and THE INFLUENCE LAW
      // grew every footprint — every scan now tolerates a rough
      // fraction, scaled to what the footprint can absorb: expansive
      // grounds (≥34/axis) sample stride-3 at ≤10%, small stamps
      // stay near-strict at ≤5%.
      const landmark = Math.max(prefab.width, prefab.height) >= 34;
      const stride = landmark ? 3 : 1;
      const tolerance = landmark ? 0.1 : 0.05;
      let score = 0;
      let rough = 0;
      let probes = 0;
      for (let dy = 0; dy < prefab.height; dy += stride) {
        for (let dx = 0; dx < prefab.width; dx += stride) {
          probes++;
          const cls = groundProbeAt(seed, fx0 + dx, fy0 + dy);
          if (!standable(cls)) {
            rough++;
            continue;
          }
          if (cls === 'grass') score++; // open ground beats tree-choked
        }
      }
      if (rough / probes > tolerance) continue;
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
  };

  // KIND: weighted pick among archetypes eligible at this tier.
  // Compound holds never sit in the ordinary pool — they arrive by
  // PROMOTION: a cell that already earned a site may promote to the
  // region's war-ground on its own stream, under the caller's region
  // gate and the law table's holdChance. A promotion the LAND refuses
  // (no court-sized ground) falls back to the ordinary roll.
  if (typeof force === 'string') {
    const def = ctx.defs.find((d) => d.id === force);
    return def ? decideSite(def) : null;
  }
  // THE TERRITORY LEAN (Phase 5): both pools weight toward the
  // country's family — THE ONE ATLAS LAW: the DEF roster names the
  // world's countries, and every layer (sites here, finds and wild
  // knots at their own doors) leans within that one atlas, so the
  // same ground never answers to two different maps. Bias never
  // gates: unmatched weights stand untouched, and a country whose
  // family has no eligible def here decides exactly as before.
  const territory = territoryAt(seed, x0 + POI_CELL / 2, y0 + POI_CELL / 2, familiesOf(ctx.defs));
  // In the march band the lean DOUBLES: the capital's own kind camps
  // at its feet — a goblin citadel gathers goblin ground, not a
  // grab-bag (the family read is the cluster read).
  const leanW = (d: PoiDef): number =>
    territoryWeight(d.weight, d.family, territory, FRONTIER.territoryBias * (march ? 2 : 1));
  // THE SHORE CAMP's law at hold scale: a shore-flagged compound only
  // enters the promotion pool where the cell actually sees water —
  // the decideSite probe would refuse it anyway (and the FALLBACK LAW
  // would deal a camp), but a landlocked cell should spend its
  // promotion on a hold the land can accept, not burn it on a refusal.
  // The answer is a CELL fact, not a def fact: one ~1000-sample probe
  // per decision, lazily, never once per shore def per pool (it was
  // re-run up to four times per cell).
  let cellWet: boolean | undefined;
  const seesWater = (): boolean => (cellWet ??= cellSeesWater(seed, x0, y0));
  const holds = ctx.defs.filter(
    (d) =>
      d.compound &&
      d.weight > 0 &&
      centerTier >= d.tiers[0] &&
      centerTier <= d.tiers[1] &&
      (!d.shore || seesWater()),
  );
  if (
    allowHold &&
    holds.length > 0 &&
    stream(seed, ST_HOLD, cellX, cellY, epoch) / 4294967296 < law.holdChance
  ) {
    const totalW = holds.reduce((s, d) => s + leanW(d), 0);
    let pick = ((stream(seed, ST_HOLD ^ 0x9, cellX, cellY, epoch) % totalW) + totalW) % totalW;
    let holdDef: PoiDef | undefined;
    for (const d of holds) {
      pick -= leanW(d);
      if (pick < 0) {
        holdDef = d;
        break;
      }
    }
    holdDef ??= holds[holds.length - 1]!;
    const site = decideSite(holdDef);
    if (site) return site;
  }
  // Weight-0 archetypes never roll on their own — they exist only
  // for the authored-sites law (the Last Lamp is placed, not found).
  // THE SHORE CAMP pool gate: a shore-flagged def only enters a cell's
  // pool when a coarse probe of the cell actually sees water — an
  // inland cell never burns its one roll on a camp the land must
  // refuse (which would starve the cell of any site at all).
  const eligible = ctx.defs.filter(
    (d) =>
      !d.compound &&
      d.weight > 0 &&
      centerTier >= d.tiers[0] &&
      centerTier <= d.tiers[1] &&
      (!d.shore || seesWater()),
  );
  if (eligible.length === 0) return null;
  const totalW = eligible.reduce((s, d) => s + leanW(d), 0);
  let pick = ((stream(seed, ST_KIND, cellX, cellY, epoch) % totalW) + totalW) % totalW;
  let def: PoiDef | undefined;
  for (const d of eligible) {
    pick -= leanW(d);
    if (pick < 0) {
      def = d;
      break;
    }
  }
  def ??= eligible[eligible.length - 1]!;
  return decideSite(def);
}

export function intersectsZones(
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

/** Footprint rect vs claim rings — the yard-shaped twin of intersectsZones. */
export function intersectsRings(
  x: number,
  y: number,
  w: number,
  h: number,
  rings: readonly ClaimRing[],
): boolean {
  for (const ring of rings) {
    // Closest point of the rect to the ring center, then one distance.
    const cx = Math.max(x, Math.min(ring.x, x + w));
    const cy = Math.max(y, Math.min(ring.y, y + h));
    const dx = ring.x - cx;
    const dy = ring.y - cy;
    if (dx * dx + dy * dy <= ring.r * ring.r) return true;
  }
  return false;
}

/**
 * A compound hold's furthest reach from its anchor (tiles): court half
 * + the ring gap + a wing's own span. The SITE scan margins by this so
 * a war-ground never pokes out of its cell or into a neighbor's work.
 */
export function compoundExtent(def: PoiDef, court: PrefabDef, ctx: PoiContext): number {
  const courtHalf = Math.max(court.width, court.height) / 2;
  let wingHalf = 0;
  for (const pid of def.compound?.wings.pool ?? []) {
    const p = ctx.prefabs.get(pid);
    if (p) wingHalf = Math.max(wingHalf, Math.max(p.width, p.height) / 2);
  }
  return courtHalf + wingHalf * 2 + 8;
}

export interface TrailPoint {
  x: number;
  y: number;
  /** Distance ordinal from the walk's start (the footprint edge). */
  t: number;
}

export interface Trail {
  points: TrailPoint[];
  /** True when the walk ARRIVED at a road's shoulder — the junction. */
  reachedRoad: boolean;
}

/**
 * THE WORN PATH's centerline (lived-in-land Phase 3) — a deterministic
 * desire-path walk outward from a site's edge along the approach
 * bearing, meandering the way feet actually do (bounded drift, never a
 * zigzag), and stopping HONESTLY:
 *
 * - at the road's shoulder — the trail arrives; the last point is the
 *   junction mouth, kept just off the carve;
 * - at water or rock — feet go around, the map does not pave;
 * - at an authored zone's clearance — the town's ground is not ours
 *   to wear;
 * - at the dark band, or at `reach` — the taper's job from there.
 *
 * Pure and exported: the composer stamps it, the tests walk it bare.
 */
export function traceTrail(
  seed: number,
  salt: number,
  originX: number,
  originY: number,
  startT: number,
  ax: number,
  ay: number,
  reach: number,
  zoneRects: readonly PoiZoneRect[],
): Trail {
  const points: TrailPoint[] = [];
  let wob = 0;
  for (let t = startT; t <= startT + reach; t++) {
    const drift = ((hashCoords(salt, t, 0) % 3) - 1) * 0.5;
    wob = Math.max(-2.5, Math.min(2.5, wob + drift));
    const wx = Math.round(originX + ax * t - ay * wob);
    const wy = Math.round(originY + ay * t + ax * wob);
    if (wy >= DARK_BAND_Y) break;
    // Arrival first: the shoulder itself probes as rock, and stopping
    // BEFORE stepping onto the carve keeps the mouth beside the road,
    // never on it.
    if (roadDistanceAt(seed, wx, wy) <= ROAD_SHOULDER + 0.5) {
      return { points, reachedRoad: points.length > 0 };
    }
    const cls = groundProbeAt(seed, wx, wy);
    if (cls !== 'grass' && cls !== 'forest') break;
    if (intersectsZones(wx, wy, 1, 1, zoneRects, 6)) break;
    points.push({ x: wx, y: wy, t });
  }
  return { points, reachedRoad: false };
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
export function composePoi(
  seed: number,
  site: PoiSite,
  ctx: PoiContext,
  stage = 0,
  /**
   * THE HEARTH WATCH: a raid squat faces the CLAIM it covets, not the
   * road — pass the coveted point and the one shared bearing reorients
   * the worn track, the warning scatter, and the watch ring toward it.
   */
  face?: { x: number; y: number },
): ZoneDef | null {
  const def = ctx.defs.find((d) => d.id === site.defId);
  const prefab = ctx.prefabs.get(site.prefabId);
  if (!def || !prefab) return null;
  const law = dangerLaw(site.tier);
  const musterBase = stream(seed, ST_MUSTER, site.cellX, site.cellY, site.epoch);
  const levelRoll = (i: number): number =>
    law.npcLevel[0] + (hashCoords(musterBase, i, 7) % (law.npcLevel[1] - law.npcLevel[0] + 1));

  // THE BOLDNESS LADDER (living frontier, phase 2): active rungs add
  // muster and dressing ON TOP of the base composition. Every rung
  // draws on a stage-folded stream and appends AFTER the base entries,
  // so a standing camp's own bodies and posts never reshuffle when it
  // grows — the named-streams law, held across stages.
  const rungs = def.boldness
    ? def.boldness.stages.slice(0, Math.max(0, Math.min(stage, def.boldness.stages.length)))
    : [];
  const boldScatter = rungs.flatMap((r) => r.scatter ?? []);

  // The approach bearing — the way players actually come. A carved
  // road within hailing distance wins (Epic 3's law: cues aim at
  // ROADS — the worn path runs to the verge, the warning scatter
  // faces the traveler); with no road near, the bee-line to the
  // nearest settled anchor stands in. Computed once, shared by the
  // cues and the watchers.
  let ax = 0;
  let ay = -1;
  // A road within the trail's own reach wins the bearing — the worn
  // path law needs the arm to actually arrive where it aims.
  const roadWard = face ? null : roadBearingAt(site.anchorX, site.anchorY, FRONTIER.trailReach);
  if (face) {
    const d = Math.max(1, Math.hypot(face.x - site.anchorX, face.y - site.anchorY));
    ax = (face.x - site.anchorX) / d;
    ay = (face.y - site.anchorY) / d;
  } else if (roadWard) {
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
  // The clearing pads ONE PAST its own radius: a felled ring that
  // reaches the rect edge puts trampled ground on the perimeter, and
  // the all-skip-perimeter law (edge harmony reads zone borders as
  // intentions) forbids exactly that — the Phase-3 perimeter test
  // caught the beast-lair defs doing it.
  // FLOOR 1 always: even a cue-less def gets one transparent ring, so
  // a sketch with an opaque tile on its own edge row can never leak an
  // edge profile (Phase 3's perimeter test caught one doing it).
  const pad = Math.max(
    1,
    cues
      ? Math.max(
          cues.clearing !== undefined ? cues.clearing + 1 : 0,
          cues.approachPath ? 9 : 0,
          cues.scatter && cues.scatter.length > 0 ? 7 : 0,
        )
      : 0,
    boldScatter.length > 0 ? 7 : 0,
  );
  // THE WORN PATH (Phase 3): the old 10-tile stub grows into a full
  // trail arm — walked BEFORE the rect exists, because the rect must
  // grow to carry it. approachPath is the def's word that this site
  // wears one (beast lairs and groves stay pathless by their nature).
  const half = Math.max(prefab.width, prefab.height) / 2;
  const trail = cues?.approachPath
    ? traceTrail(
        seed,
        musterBase ^ 0x29,
        site.anchorX,
        site.anchorY,
        Math.floor(half) - 1,
        ax,
        ay,
        FRONTIER.trailReach,
        ctx.zoneRects,
      )
    : null;
  // THE WAR-GROUND (Phase 4): wings muster on ring bearings around
  // the court — computed BEFORE the rect (the rect must hold them),
  // rolled on stage-independent streams (the prefix-stability law),
  // each footprint probed and SKIPPED when the ground refuses. The
  // land decides how big the hold got to be; a failed wing is not an
  // error, it is geography.
  interface PlacedWing {
    prefab: PrefabDef;
    x0: number;
    y0: number;
    cx: number;
    cy: number;
    wing: number;
  }
  const wings: PlacedWing[] = [];
  if (def.compound) {
    const comp = def.compound;
    const wingBase = hashCoords(musterBase, 0x417, 0);
    const wingCount =
      comp.wings.count[0] +
      (hashCoords(wingBase, 1, 3) % (comp.wings.count[1] - comp.wings.count[0] + 1));
    const courtHalf = Math.max(prefab.width, prefab.height) / 2;
    const cx0 = site.anchorX - Math.floor(prefab.width / 2);
    const cy0 = site.anchorY - Math.floor(prefab.height / 2);
    const angle0 = ((hashCoords(wingBase, 2, 5) % 1000) / 1000) * Math.PI * 2;
    const overlaps = (
      ax0: number, ay0: number, aw: number, ah: number,
      bx0: number, by0: number, bw: number, bh: number,
    ): boolean =>
      ax0 - 2 < bx0 + bw && ax0 + aw + 2 > bx0 && ay0 - 2 < by0 + bh && ay0 + ah + 2 > by0;
    for (let i = 0; i < wingCount; i++) {
      const wp = ctx.prefabs.get(
        comp.wings.pool[hashCoords(wingBase, i, 7) % comp.wings.pool.length]!,
      );
      if (!wp) continue;
      const wingHalf = Math.max(wp.width, wp.height) / 2;
      const ang =
        angle0 +
        (i / wingCount) * Math.PI * 2 +
        ((hashCoords(wingBase, i, 11) % 100) / 100 - 0.5) * 0.35;
      const radius = courtHalf + wingHalf + 4 + (hashCoords(wingBase, i, 13) % 5);
      const wcx = Math.round(site.anchorX + Math.cos(ang) * radius);
      const wcy = Math.round(site.anchorY + Math.sin(ang) * radius);
      const wx0 = wcx - Math.floor(wp.width / 2);
      const wy0 = wcy - Math.floor(wp.height / 2);
      if (wcy + wp.height / 2 >= DARK_BAND_Y - ZONE_CLEARANCE) continue;
      if (intersectsZones(wx0, wy0, wp.width, wp.height, ctx.zoneRects, 8)) continue;
      if (intersectsRings(wx0, wy0, wp.width, wp.height, ctx.claimRings)) continue;
      if (overlaps(wx0, wy0, wp.width, wp.height, cx0, cy0, prefab.width, prefab.height)) continue;
      if (
        wings.some((w) =>
          overlaps(wx0, wy0, wp.width, wp.height, w.x0, w.y0, w.prefab.width, w.prefab.height),
        )
      ) {
        continue;
      }
      let ok = true;
      for (let dy = 0; dy < wp.height && ok; dy++) {
        for (let dx = 0; dx < wp.width; dx++) {
          if (!standable(groundProbeAt(seed, wx0 + dx, wy0 + dy))) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      wings.push({ prefab: wp, x0: wx0, y0: wy0, cx: wcx, cy: wcy, wing: i });
    }
  }

  // The rect: prefab + symmetric pad, then grown (asymmetrically)
  // to hold the trail and the wings with a transparent margin — the
  // margin is LAW: a composed zone's perimeter must stay all-TILE_SKIP
  // or the edge-harmony machinery would read the trail as the zone's
  // border intention and re-shape worldgen around it.
  let minX = site.anchorX - Math.floor(prefab.width / 2) - pad;
  let minY = site.anchorY - Math.floor(prefab.height / 2) - pad;
  let maxX = minX + prefab.width + pad * 2;
  let maxY = minY + prefab.height + pad * 2;
  if (trail) {
    for (const p of trail.points) {
      minX = Math.min(minX, p.x - 3);
      minY = Math.min(minY, p.y - 3);
      maxX = Math.max(maxX, p.x + 4);
      maxY = Math.max(maxY, p.y + 4);
    }
  }
  for (const w of wings) {
    minX = Math.min(minX, w.x0 - 3);
    minY = Math.min(minY, w.y0 - 3);
    maxX = Math.max(maxX, w.x0 + w.prefab.width + 3);
    maxY = Math.max(maxY, w.y0 + w.prefab.height + 3);
  }
  const zw = maxX - minX;
  const zh = maxY - minY;
  const originX = minX;
  const originY = minY;
  /** Prefab's top-left corner in zone coords (the blit anchor). */
  const px0 = site.anchorX - Math.floor(prefab.width / 2) - originX;
  const py0 = site.anchorY - Math.floor(prefab.height / 2) - originY;

  // Layers: fringe starts fully transparent; the prefab blits into
  // the center (chest re-keyed under the tier law as it lands).
  const chestKind =
    def.chestTierBonus !== undefined
      ? dangerLaw(site.tier + def.chestTierBonus).chest
      : null;
  const ground = new Uint16Array(zw * zh).fill(TILE_SKIP);
  const detail = new Uint16Array(zw * zh);
  // THE RAISED GROUND (strongholds Phase 2): a prefab that carries
  // height stamps it — allocated lazily so the common flat site stays
  // exactly as cheap as before (zone.elev undefined = the old truth).
  // TILE_SKIP ground cells are skipped whole by overlayZone, so only
  // opaque cells' elevation ever reaches the world; the content
  // validator holds the fence laws (Cliff/Ramp ring, border-flat).
  let elev: Int8Array | null = null;
  const elevOf = (): Int8Array => (elev ??= new Int8Array(zw * zh));
  for (let dy = 0; dy < prefab.height; dy++) {
    for (let dx = 0; dx < prefab.width; dx++) {
      let g = prefab.ground[dy * prefab.width + dx]!;
      if (chestKind) {
        const info = chestInfo(g);
        if (info && !info.open) g = closedChestTile(chestKind);
      }
      const zi = (dy + py0) * zw + (dx + px0);
      ground[zi] = g;
      detail[zi] = prefab.detail[dy * prefab.width + dx]!;
      const e = prefab.elev[dy * prefab.width + dx]!;
      if (e !== 0) elevOf()[zi] = e;
    }
  }

  // Wing blits — the camps around the court. Their chests keep their
  // AUTHORED kinds (a wing's wood chest stays a wood chest): the
  // chest-law upgrade is the COURT's cache alone, or a hold would
  // mint a boss chest per wing (texture-is-not-treasure at hold
  // scale). The hold-wide ward still covers them — break the hold to
  // loot anything.
  for (const w of wings) {
    for (let dy = 0; dy < w.prefab.height; dy++) {
      for (let dx = 0; dx < w.prefab.width; dx++) {
        const g = w.prefab.ground[dy * w.prefab.width + dx]!;
        if (g === TILE_SKIP) continue;
        const zi = (w.y0 + dy - originY) * zw + (w.x0 + dx - originX);
        ground[zi] = g;
        detail[zi] = w.prefab.detail[dy * w.prefab.width + dx]!;
        const e = w.prefab.elev[dy * w.prefab.width + dx]!;
        if (e !== 0) elevOf()[zi] = e;
      }
    }
  }

  // ---- THE WARNING VOCABULARY: cues stamped into the fringe only —
  // a cell the prefab owns is never touched, and every cue verifies
  // the ground it replaces is natural (grass/forest probe) so cues
  // never pave water, rock, or another zone's work (zone clearance
  // already keeps the whole rect 24 tiles from authored land).
  // The perimeter is excluded STRUCTURALLY: every cue writer goes
  // through this gate, so no ring rounding or wobble can ever put a
  // stamped tile on the rect edge (the all-skip-perimeter law).
  const fringeSkip = (zx: number, zy: number): boolean =>
    zx > 0 &&
    zy > 0 &&
    zx < zw - 1 &&
    zy < zh - 1 &&
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
        const ex = Math.max(px0 - zx, zx - (px0 + prefab.width - 1), 0);
        const ey = Math.max(py0 - zy, zy - (py0 + prefab.height - 1), 0);
        const edgeDist = Math.max(ex, ey);
        if (edgeDist > cues.clearing) continue;
        const { wx, wy } = worldOf(zx, zy);
        if (groundProbeAt(seed, wx, wy) !== 'forest') continue;
        const h = hashCoords(musterBase ^ 0x25, wx, wy);
        ground[zy * zw + zx] = h % 100 < 30 ? Tile.Stump : Tile.Grass;
      }
    }
  }

  if (trail && trail.points.length > 0) {
    // THE WORN PATH: the centerline stamped as ruts — only into
    // still-transparent cells over natural ground, like every cue.
    // WIDTH SPEAKS RANK, and boldness widens the walk: the base camp
    // wears the two-rut path; each rung adds wear until a stage-3
    // camp's road mouth reads from thirty tiles out. When no road was
    // in reach the trail tapers HONESTLY instead of stopping dead —
    // double rut, single rut, trampled grass, nothing: a desire path
    // fading into the wild.
    const stamp = (wx: number, wy: number, tile: Tile): void => {
      const zx = wx - originX;
      const zy = wy - originY;
      if (zx < 0 || zy < 0 || zx >= zw || zy >= zh) return;
      if (!fringeSkip(zx, zy)) return; // the prefab's own ground wins
      const cls = groundProbeAt(seed, wx, wy);
      if (cls !== 'grass' && cls !== 'forest') return;
      ground[zy * zw + zx] = tile;
    };
    const perpX = -Math.round(ay);
    const perpY = Math.round(ax);
    const startT = trail.points[0]!.t;
    for (const p of trail.points) {
      const frac = (p.t - startT) / Math.max(1, FRONTIER.trailReach);
      const single = !trail.reachedRoad && frac > 0.55;
      const sparse = !trail.reachedRoad && frac > 0.8;
      if (sparse) {
        // The path forgetting itself: intermittent trampled grass.
        if (hashCoords(musterBase ^ 0x2d, p.x, p.y) % 100 < 55) stamp(p.x, p.y, Tile.Grass);
        continue;
      }
      stamp(p.x, p.y, Tile.Dirt);
      // A worn path is two ruts wide more often than one — and always,
      // once the camp has climbed a rung (frequency reads on the land).
      const sx = p.x + perpX;
      const sy = p.y + perpY;
      if (!single && (stage >= 1 || hashCoords(musterBase ^ 0x2b, sx, sy) % 100 < 55)) {
        stamp(sx, sy, Tile.Dirt);
      }
      // Stage 2+: the walk wears a third lane on the far side.
      if (stage >= 2 && !single) {
        const wx2 = p.x - perpX;
        const wy2 = p.y - perpY;
        if (hashCoords(musterBase ^ 0x33, wx2, wy2) % 100 < 70) stamp(wx2, wy2, Tile.Dirt);
      }
      // Stage 3: verge marks — stumps where the war-camp's traffic
      // chewed the treeline beside its road.
      if (stage >= 3 && hashCoords(musterBase ^ 0x35, p.x, p.y) % 100 < 18) {
        stamp(p.x + perpX * 2, p.y + perpY * 2, Tile.Stump);
      }
    }
    // THE ROAD MOUTH: where the trail meets the carve the last steps
    // fan wide — the breadcrumb a traveling player actually crosses.
    // No words, no signs: trampled ground says everything.
    if (trail.reachedRoad) {
      for (const p of trail.points.slice(-3)) {
        stamp(p.x + perpX, p.y + perpY, Tile.Dirt);
        stamp(p.x - perpX, p.y - perpY, Tile.Dirt);
      }
      const mouth = trail.points[trail.points.length - 1]!;
      stamp(mouth.x + perpX * 2, mouth.y + perpY * 2, Tile.Grass);
      stamp(mouth.x - perpX * 2, mouth.y - perpY * 2, Tile.Grass);
    }
  }

  // The wing walks: worn ground from each wing's mouth to the court —
  // the compound reads as ONE inhabited place, not a scatter of camps
  // that happen to be neighbors.
  for (const w of wings) {
    const d = Math.hypot(w.cx - site.anchorX, w.cy - site.anchorY);
    const ux = (site.anchorX - w.cx) / Math.max(1, d);
    const uy = (site.anchorY - w.cy) / Math.max(1, d);
    const start = Math.max(1, Math.floor(Math.min(w.prefab.width, w.prefab.height) / 2) - 1);
    for (let t = start; t < d; t++) {
      const wob = ((hashCoords(musterBase ^ 0x41b, w.wing * 131 + t, 0) % 3) - 1) * 0.6;
      const wx = Math.round(w.cx + ux * t - uy * wob);
      const wy = Math.round(w.cy + uy * t + ux * wob);
      const zx = wx - originX;
      const zy = wy - originY;
      if (!fringeSkip(zx, zy)) continue;
      const cls = groundProbeAt(seed, wx, wy);
      if (cls !== 'grass' && cls !== 'forest') continue;
      ground[zy * zw + zx] = Tile.Dirt;
    }
  }

  // Boldness dressing appends AFTER the base cues, so the base
  // placements keep their exact spots as the camp grows louder.
  for (const [si, sc] of [...(cues?.scatter ?? []), ...boldScatter].entries()) {
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
      x: originX + px0 + s.dx + 0.5,
      y: originY + py0 + s.dy + 0.5,
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
  // THE DOCTRINE REACHES DOWN (strongholds Phase 4): a big muster at
  // one anchor is one pull — the whole camp answers together. Where
  // the ground affords it, the SECOND and later unnamed holdfast
  // entries re-anchor a spaced knot ~10 tiles out (past rally reach),
  // so a careful player takes the camp in pulls. Named champions
  // always keep the heart; small footprints keep the old cluster.
  const knotSplitAt = (ax: number, ay: number, salt: number): { x: number; y: number } | null => {
    const start = hashCoords(musterBase, salt, 0xd0c) % 4;
    for (let d = 0; d < 4; d++) {
      const dir = [
        [10, 0],
        [0, 10],
        [-10, 0],
        [0, -10],
      ][(start + d) % 4]!;
      const bx = ax + dir[0]!;
      const by = ay + dir[1]!;
      const zx = bx - originX;
      const zy = by - originY;
      if (zx < 2 || zy < 2 || zx >= zw - 2 || zy >= zh - 2) continue;
      const t = ground[zy * zw + zx]!;
      if (t === TILE_SKIP) {
        const cls = groundProbeAt(seed, bx, by);
        if (cls !== 'grass' && cls !== 'forest') continue;
      } else if (TILE_DEFS[t as Tile]?.solid !== false) {
        continue;
      }
      return { x: bx, y: by };
    }
    return null;
  };
  const holdSplit = knotSplitAt(site.anchorX, site.anchorY, 0x1);

  // THE SIGNS READ EVERYWHERE (the peopled landmarks): the stamped
  // furniture claims posts — a measured share of the holdfast muster
  // splits into count-1 bodies that walk to the fire, the dummy, the
  // tent, the totem, and HOLD that work. Post hours gate behavior,
  // never existence (off-window the body wanders the camp as ever);
  // the dead keep unwindowed posts — the dead don't keep hours.
  const openCell = (zx: number, zy: number): boolean => {
    if (zx < 1 || zy < 1 || zx >= zw - 1 || zy >= zh - 1) return false;
    const t = ground[zy * zw + zx]!;
    if (t === TILE_SKIP) {
      const cls = groundProbeAt(seed, originX + zx, originY + zy);
      return cls === 'grass' || cls === 'forest';
    }
    return TILE_DEFS[t as Tile]?.solid === false;
  };
  interface PostSeat {
    x: number;
    y: number;
    dir: number;
    kind: PostKind;
    hours?: { from: number; to: number };
  }
  const postSeats: PostSeat[] = [];
  {
    const beastFam = def.family === 'wolfkin' || def.family === 'lynxkin';
    // THE ONE FURNITURE TABLE (content/pois/postSigns.ts) — this lane's
    // clock law: a camp's vigil is the NIGHT watch (18-6). Everything
    // else the furniture already knows.
    const claimed: Array<[number, number]> = [];
    for (const sign of POST_SIGN_ROWS) {
      for (let zy = 1; zy < zh - 1; zy++) {
        for (let zx = 1; zx < zw - 1; zx++) {
          if (!(sign.match as readonly number[]).includes(ground[zy * zw + zx]!)) continue;
          // One post per neighborhood — the spacing law keeps pulls
          // apart; a fire circle's several seats ring ONE anchor.
          if (claimed.some(([cx, cy]) => Math.max(Math.abs(cx - zx), Math.abs(cy - zy)) < 5)) continue;
          const spots: Array<[number, number]> = [];
          for (const [nx, ny] of [
            [zx, zy + 1], [zx + 1, zy], [zx - 1, zy], [zx, zy - 1],
            [zx + 1, zy + 1], [zx - 1, zy + 1], [zx + 1, zy - 1], [zx - 1, zy - 1],
          ] as const) {
            if (spots.length >= sign.seats) break;
            if (openCell(nx, ny)) spots.push([nx, ny]);
          }
          if (spots.length === 0) continue;
          claimed.push([zx, zy]);
          // The beast families keep their clock through the den: the
          // nest is a DAY rest (nocturnal denners), never a pen.
          const denRest = sign.kind === 'keeper' && beastFam;
          const hours =
            def.family === 'dead'
              ? undefined
              : denRest
                ? { from: 7, to: 19 }
                : sign.kind === 'vigil'
                  ? { from: 18, to: 6 }
                  : sign.hours;
          for (const [sx, sy] of spots) {
            postSeats.push({
              x: originX + sx + 0.5,
              y: originY + sy + 0.5,
              dir: Math.atan2(zy - sy, zx - sx),
              kind: denRest ? 'rest' : sign.kind,
              ...(hours ? { hours } : {}),
            });
          }
        }
      }
    }
  }
  // The measured share: posts take at most 3-in-5 of the holdfast
  // muster — a camp with every back turned to the road reads staged,
  // and the wanderers are the ones a scout meets first.
  let holdTotal = 0;
  for (const [gi, g] of def.garrison.entries()) {
    if (g.role !== 'holdfast') continue;
    if (g.minTier !== undefined && site.tier < g.minTier) continue;
    holdTotal += g.count[0] + (hashCoords(musterBase, gi, 13) % (g.count[1] - g.count[0] + 1));
  }
  let postBudget = Math.min(postSeats.length, Math.ceil(holdTotal * 0.6));
  let seatNext = 0;

  const sentryWants: Array<{
    npc: string;
    level: number;
    name?: string;
    patrol?: boolean;
    hours?: { from: number; to: number };
  }> = [];
  // Boldness rungs collected up front only to size the sentry ring —
  // their spawns append strictly AFTER the whole base composition
  // (holdfasts, sentries, staff), so the standing camp's own bodies,
  // posts, and level rolls are bit-identical at every stage.
  const rungWants: Array<{ g: PoiGarrisonEntry; base: number; gi: number }> = [];
  for (const [ri, rung] of rungs.entries()) {
    const rungBase = hashCoords(musterBase, 0xb01d, ri + 1);
    for (const [gi, g] of (rung.garrison ?? []).entries()) {
      rungWants.push({ g, base: rungBase, gi });
    }
  }
  for (const [gi, g] of def.garrison.entries()) {
    if (g.minTier !== undefined && site.tier < g.minTier) continue;
    const count =
      g.count[0] + (hashCoords(musterBase, gi, 13) % (g.count[1] - g.count[0] + 1));
    if (count <= 0) continue;
    const gname = g.names
      ? g.names[hashCoords(musterBase, gi, 41) % g.names.length]
      : g.name;
    if (g.role === 'holdfast') {
      const level = levelRoll(n++) + (g.levelOffset ?? 0);
      // Posted bodies peel off first — never the named champion, and
      // never an hour-windowed entry (its existence window IS its
      // fiction; a post's window would fight it).
      let posted = 0;
      if (!gname && !g.hours) {
        while (posted < count && postBudget > 0 && seatNext < postSeats.length) {
          const seat = postSeats[seatNext++]!;
          postBudget--;
          posted++;
          spawns.push({
            npc: g.npc,
            x: seat.x,
            y: seat.y,
            radius: 1.2,
            count: 1,
            level,
            post: {
              kind: seat.kind,
              x: seat.x,
              y: seat.y,
              dir: seat.dir,
              ...(seat.hours ? { hours: seat.hours } : {}),
            },
          });
        }
      }
      const remain = count - posted;
      if (remain > 0) {
        const knotB = gi % 2 === 1 && !g.names ? holdSplit : null;
        spawns.push({
          npc: g.npc,
          x: (knotB ? knotB.x : site.anchorX) + 0.5,
          y: (knotB ? knotB.y : site.anchorY) + 0.5,
          radius: knotB ? 2.5 : holdR,
          count: remain,
          level,
          name: gname,
          // THE WILD CROWN: a crowned row forges its champion — the
          // seed hashes off the site's own muster, so THIS camp's
          // tyrant keeps THIS name and hand forever (LAW W3), and the
          // next camp over forges a different fight entirely.
          crown: g.crowned ? hashCoords(musterBase, gi, 0x517d) & 0x7fffffff : undefined,
          hours: g.hours,
        });
      }
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
  if (
    sentryWants.length > 0 ||
    staff.some((s) => s.post === 'watch') ||
    rungWants.some(({ g }) => g.role === 'sentry')
  ) {
    // A hold's watchers post OUTSIDE the wings — the whole compound
    // watches the road, not just the court.
    const ringR =
      wings.length > 0
        ? Math.max(
            ...wings.map(
              (w) =>
                Math.hypot(w.cx - site.anchorX, w.cy - site.anchorY) +
                Math.max(w.prefab.width, w.prefab.height) / 2,
            ),
          ) + 4
        : Math.max(prefab.width, prefab.height) / 2 + 5;
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
    // THE ROUND HAS STATIONS: authored prefab routes deal to the
    // patrollers first, in order — walkability re-proven against the
    // composed ground, dwell and sit stops carried verbatim. The
    // synthetic ring serves whoever the authored rounds don't cover.
    const authoredRoutes = (prefab.routes ?? [])
      .map((r) =>
        r.pts
          .filter((p) => openCell(px0 + p.dx, py0 + p.dy))
          // The ring's own probe law reaches authored rounds — but
          // ONLY on TRANSPARENT sketch cells, where procgen shows
          // through: a sentry no more paces beach sand or scree than
          // posts on it (seed-lucky since the routes landed; the
          // atlas re-deal surfaced it). A point on an AUTHORED tile
          // walks authored intent — the blind field probe has no
          // standing there.
          .filter(
            (p) =>
              prefab.ground[p.dy * prefab.width + p.dx] !== TILE_SKIP ||
              standable(groundProbeAt(seed, originX + px0 + p.dx, originY + py0 + p.dy)),
          )
          .map((p) => ({
            x: originX + px0 + p.dx + 0.5,
            y: originY + py0 + p.dy + 0.5,
            ...(p.dwell !== undefined ? { dwell: p.dwell } : {}),
            ...(p.sit ? { sit: true } : {}),
          })),
      )
      .filter((pts) => pts.length >= 3);
    // Patrollers pace the whole ring; a loop needs at least 3 honest
    // waypoints or the round degrades to a static townward post.
    for (let i = 0; i < patrollers.length; i++) {
      const want = patrollers[i]!;
      const authored = authoredRoutes[i];
      if (authored) {
        spawns.push({
          npc: want.npc,
          x: authored[0]!.x,
          y: authored[0]!.y,
          radius: 1.2,
          count: 1,
          level: want.level,
          name: want.name,
          patrol: authored,
          hours: want.hours,
        });
        continue;
      }
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
      x: originX + px0 + a.dx + 0.5,
      y: originY + py0 + a.dy + 0.5,
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

  // ---- THE WING CHAPTERS (Phase 4): each wing musters its own knot —
  // the wing prefab's posted bodies plus the def's wingGarrison, all
  // tagged with the wing ordinal so a falling wing reads as its own
  // chapter (the wing-break line). Appended AFTER the whole base court
  // composition and BEFORE the rungs on the shared level counter, so
  // stage climbs never reshuffle a standing hold.
  for (const w of wings) {
    for (const s of w.prefab.spawns) {
      spawns.push({
        npc: s.npc,
        x: w.x0 + s.dx + 0.5,
        y: w.y0 + s.dy + 0.5,
        radius: s.radius,
        count: s.count,
        level: s.level ?? levelRoll(n++),
        name: s.name,
        hours: s.hours,
        wing: w.wing,
      });
    }
    const wingHoldR = Math.max(2, Math.min(w.prefab.width, w.prefab.height) / 2 - 1);
    const wingSplit = knotSplitAt(w.cx, w.cy, 0x51b + w.wing);
    for (const [gi, g] of (def.compound?.wingGarrison ?? []).entries()) {
      if (g.minTier !== undefined && site.tier < g.minTier) continue;
      const count =
        g.count[0] +
        (hashCoords(musterBase, 0x517 + w.wing, gi) % (g.count[1] - g.count[0] + 1));
      if (count <= 0) continue;
      const gname = g.names
        ? g.names[hashCoords(musterBase, 0x519 + w.wing, gi) % g.names.length]
        : g.name;
      const knotB = gi % 2 === 1 && !g.names ? wingSplit : null;
      spawns.push({
        npc: g.npc,
        x: (knotB ? knotB.x : w.cx) + 0.5,
        y: (knotB ? knotB.y : w.cy) + 0.5,
        radius: knotB ? 2.5 : wingHoldR,
        count,
        level: levelRoll(n++) + (g.levelOffset ?? 0),
        name: gname,
        hours: g.hours,
        wing: w.wing,
      });
    }
  }

  // ---- THE BOLDNESS MUSTER: rung bodies append after everything the
  // base camp placed. Holdfasts crowd the heart; rung watchers take
  // ring posts from the FAR end (the reinforcements watch the back
  // door — base watchers and staff keep their townward posts
  // untouched); rung patrollers walk the same round with their own
  // start spread. Level rolls continue the counter AFTER the base, so
  // base levels never move.
  if (rungWants.length > 0) {
    let rungWatchI = 0;
    let rungPatrolI = 0;
    for (const { g, base, gi } of rungWants) {
      if (g.minTier !== undefined && site.tier < g.minTier) continue;
      const count = g.count[0] + (hashCoords(base, gi, 13) % (g.count[1] - g.count[0] + 1));
      if (count <= 0) continue;
      const gname = g.names ? g.names[hashCoords(base, gi, 41) % g.names.length] : g.name;
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
        continue;
      }
      for (let i = 0; i < count; i++) {
        const level = levelRoll(n++) + (g.levelOffset ?? 0);
        if (g.patrol && ring.length >= 3) {
          const start =
            (Math.floor((rungPatrolI * ring.length) / Math.max(1, count)) + rungPatrolI) %
            ring.length;
          rungPatrolI++;
          const loop = [...ring.slice(start), ...ring.slice(0, start)].map((p) => ({
            x: p.x,
            y: p.y,
          }));
          spawns.push({
            npc: g.npc,
            x: loop[0]!.x,
            y: loop[0]!.y,
            radius: 1.2,
            count: 1,
            level,
            name: gname,
            patrol: loop,
            hours: g.hours,
          });
        } else {
          const post = byScore[byScore.length - 1 - (rungWatchI % Math.max(1, byScore.length))];
          rungWatchI++;
          if (!post) break; // no honest ring at all — the rung stays home
          spawns.push({
            npc: g.npc,
            x: post.x,
            y: post.y,
            radius: 2,
            count: 1,
            level,
            name: gname,
            hours: g.hours,
          });
        }
      }
    }
  }

  // Prefab portals ride the stamp — a delve gate in the sketch is a
  // WORKING riftgate in the world (worldSource indexes zone portals).
  const portals = prefab.portals.map((p) => ({
    x: originX + px0 + p.dx,
    y: originY + py0 + p.dy,
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
    // Flat sites keep undefined (the site scan guaranteed level-0
    // ground); a height-bearing prefab stamps its terraces verbatim.
    elev: elev ?? undefined,
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
  // Builtins first (and seed any missing files). The stronghold
  // shelf's layout prefabs are library citizens like any footprint —
  // Map Studio curation of a citadel sticks by the same FILE-WINS law.
  for (const [id, builtin] of [...POI_PREFABS, ...STRONGHOLD_PREFABS]) {
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
  /** Boldness rung to compose at — the bench's stage-ladder view. */
  stage = 0,
): { site: PoiSite; zone: ZoneDef } | null {
  const def = ctx.defs.find((d) => d.id === defId);
  if (!def) return null;
  // Mid-band ring around EVERY settled hearth: tier T spans
  // [safeR + (T-1)·band, safeR + T·band). One hearth's ring can miss
  // every cell center of a thin band (the great regen proved it —
  // Dawnmead's tier-1 ring landed all its cell centers in band 2+),
  // so the bench walks each hearth in turn until a stage composes.
  const seen = new Set<string>();
  const hearths = ctx.anchors.filter((a) => !a.haven && !a.dread);
  for (const hearth of hearths.length ? hearths : [{ x: 0, y: 0, safeR: 0 }]) {
    const radius = hearth.safeR + (tier - 0.5) * DANGER_BAND;
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
      const zone = composePoi(seed, shown, ctx, stage);
      if (zone) return { site: shown, zone };
    }
  }
  return null;
}

/**
 * The default context over the live zone list — PLUS the master plan's
 * planned zone rects (Amberford, Silverfall), so the frontier keeps
 * out of streets that haven't been built yet. A rect listed twice
 * (planned AND registered) costs one redundant intersection test.
 * `claimRings` is REQUIRED (not defaulted) on purpose: an exclusion
 * law with an optional mask is a law some call site forgets — the
 * compiler holds every builder to it.
 */
export function poiContext(
  anchors: readonly DangerAnchor[],
  zones: readonly ZoneDef[],
  prefabs: ReadonlyMap<string, PrefabDef>,
  claimRings: readonly ClaimRing[],
  capitals: readonly PoiZoneRect[],
): PoiContext {
  return {
    anchors,
    zoneRects: [
      ...zones
        // Capitals' own zones stay out of the clearance list the same
        // way poi zones do — the capitals MASK handles their ground.
        .filter((z) => !z.id.startsWith('poi:') && !z.id.startsWith('stronghold:'))
        .map((z) => ({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height })),
      ...PLANNED_ZONE_RECTS,
    ],
    claimRings,
    defs: [...POI_DEFS.values()],
    minors: [...MINOR_DEFS.values()],
    prefabs,
    capitals,
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
  // THE RELAXED LANDMARK SITING reaches authored pins too: the
  // INFLUENCE LAW grew every ordinary prefab past what hand-picked
  // ground was measured for — expansive footprints sample stride-3,
  // tolerate a rough fraction, and SLIDE farther from the pin (a
  // milepost stepping 20 tiles along its road is still the milepost;
  // a territory that can't breathe there stands nowhere honestly).
  const landmark = Math.max(prefab.width, prefab.height) >= 34;
  const stride = landmark ? 3 : 1;
  const tolerance = landmark ? 0.1 : 0.05;
  const fits = (tx: number, ty: number): boolean => {
    if (ty + prefab.height / 2 >= DARK_BAND_Y - ZONE_CLEARANCE) return false;
    const fx0 = tx - Math.floor(prefab.width / 2);
    const fy0 = ty - Math.floor(prefab.height / 2);
    if (intersectsZones(fx0, fy0, prefab.width, prefab.height, ctx.zoneRects, 6)) return false;
    // THE EXCLUSION LAW reaches authored pins too: decideSite's doc
    // claims every materialization candidate passes the ring check —
    // this scan didn't, so a re-seeded milepost could nudge its
    // footprint onto a player's claimed yard (the exact event the
    // rings exist to forbid). The capital mask rides along for the
    // same reason.
    if (intersectsRings(fx0, fy0, prefab.width, prefab.height, ctx.claimRings)) return false;
    for (const c of ctx.capitals) {
      if (fx0 < c.x + c.w + 24 && c.x - 24 < fx0 + prefab.width &&
          fy0 < c.y + c.h + 24 && c.y - 24 < fy0 + prefab.height) {
        return false;
      }
    }
    let rough = 0;
    let probes = 0;
    for (let dy = 0; dy < prefab.height; dy += stride) {
      for (let dx = 0; dx < prefab.width; dx += stride) {
        probes++;
        if (!standable(groundProbeAt(seed, fx0 + dx, fy0 + dy))) rough++;
      }
    }
    return rough / probes <= tolerance;
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

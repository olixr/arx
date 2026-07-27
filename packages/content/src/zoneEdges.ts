import { TILE_SKIP, Tile, fbm, type Vec2 } from '@devcraft/shared';
import { distToRect } from './geography.js';

/**
 * THE EDGE-HARMONY LAW — a zone's border is a boundary condition, not
 * a cut line.
 *
 * Authored zones stamp verbatim over the procedural world, which used
 * to leave the wild ignorant of them: a lake sliced ruler-straight
 * along a rect, a planted tree line stopping dead at the hem, a town
 * marooned in whatever biome the noise happened to deal. This module
 * is the missing half of the conversation. Every registered surface
 * zone publishes an EDGE PROFILE — its outermost authored ring,
 * classified tile by tile into a handful of terrain intentions — and
 * the worldgen fields BLEND toward those intentions across a feathered,
 * noise-wobbled reach:
 *
 *  - a water edge pulls the elevation field under the water line, so
 *    an authored pond/stream keeps going as a wild cove or creek that
 *    tapers off on its own;
 *  - a sand edge continues as beach;
 *  - a forest edge lifts moisture, so authored woods thin naturally
 *    into wild forest instead of ending at a property line;
 *  - a worn edge (a road stub leaving a gate) dries the moisture into
 *    an open travelled clearing;
 *  - every LAND edge floors the elevation above the water thresholds,
 *    so no procedural lake ever laps a border it would be sliced by —
 *    shorelines curve away from town instead of being cut;
 *  - skipped (transparent) cells claim nothing: a composed POI site's
 *    fringe stays pure procgen, exactly as before.
 *
 * The blend weight is smoothstepped over each class's reach and the
 * distance is warped by fbm — growing with distance so the first ring
 * outside the border matches the authored edge faithfully while the
 * far boundary of the influence goes organic, never parallel to the
 * rect. The lookup point along the border is jittered the same way so
 * two adjacent edge intentions interleave instead of meeting on a
 * perpendicular seam.
 *
 * LIVE-REGISTRY LAW (the geography pattern): ZONE_EDGE_PROFILES is
 * refilled in place by replaceZoneEdgeProfiles; every query reads the
 * live array at call time and nothing caches a projection at import
 * time. The WorldSource rebuilds the registry whenever its zone list
 * changes; the editor mirrors the server's profiles so its client-side
 * generateChunk preview matches the real world tile for tile.
 */

export type EdgeClass = 'open' | 'water' | 'sand' | 'forest' | 'meadow' | 'worn' | 'stark';

export interface ZoneEdgeProfile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Perimeter classes: top/bottom are `w` long, left/right `h` long. */
  top: EdgeClass[];
  bottom: EdgeClass[];
  left: EdgeClass[];
  right: EdgeClass[];
}

/**
 * Per-class blend law. `elevTarget` REPLACES the elevation (water digs,
 * sand levels to beach); `elevFloor` only LIFTS low ground (land edges
 * repel water without flattening hills); `moisture` mixes the moisture
 * field toward the target. `range` is the feathered reach in tiles.
 */
const EDGE_LAW: Record<
  EdgeClass,
  { range: number; elevTarget?: number; elevFloor?: number; moisture?: number }
> = {
  open: { range: 0 },
  water: { range: 16, elevTarget: 0.325 },
  sand: { range: 12, elevTarget: 0.385 },
  forest: { range: 24, elevFloor: 0.42, moisture: 0.75 },
  meadow: { range: 18, elevFloor: 0.42 },
  worn: { range: 12, elevFloor: 0.45, moisture: 0.3 },
  stark: { range: 14, elevFloor: 0.42, moisture: 0.3 },
};

/** The farthest any edge class reaches, wobble included (chunk-drop pad). */
export const EDGE_REACH = 28;

/**
 * How far the level fields feel a profiled border: plateaus hold a
 * short walk off (their cliff fence lives on their own crown, outside
 * the zone), basins a generous one (a sink's fence would land INSIDE
 * the zone where the overlay erases it — the Dawnmead lesson).
 */
export const EDGE_PLATEAU_DAMP_RANGE = 24;
export const EDGE_BASIN_DAMP_RANGE = 48;

/** The live registry — refilled in place, never reassigned. */
export const ZONE_EDGE_PROFILES: ZoneEdgeProfile[] = [];

export function replaceZoneEdgeProfiles(profiles: readonly ZoneEdgeProfile[]): void {
  ZONE_EDGE_PROFILES.length = 0;
  for (const p of profiles) ZONE_EDGE_PROFILES.push(p);
}

/** What terrain intention a single authored border tile declares. */
export function tileEdgeClass(t: number): EdgeClass {
  if (t === TILE_SKIP || t === Tile.Void) return 'open';
  switch (t) {
    case Tile.Water:
    case Tile.WaterDeep:
    case Tile.WaterShallow:
    case Tile.FishingSpot:
    case Tile.Bridge:
    case Tile.Dock:
      return 'water';
    case Tile.Sand:
      return 'sand';
    case Tile.Tree:
    case Tile.TreeOak:
    case Tile.TreeWillow:
    case Tile.TreeYew:
    case Tile.Sapling:
    case Tile.SaplingOak:
    case Tile.SaplingWillow:
    case Tile.SaplingYew:
    case Tile.Stump:
    case Tile.BerryBush:
    case Tile.FibrePlant:
    case Tile.WildSagewort:
    case Tile.WildMoonbell:
    case Tile.Swamp:
      return 'forest';
    case Tile.Path:
    case Tile.Dirt:
      return 'worn';
    case Tile.StoneFloor:
    case Tile.Cliff:
    case Tile.Ramp:
    case Tile.Snow:
    case Tile.Rock:
    case Tile.RockCopper:
    case Tile.RockTin:
    case Tile.RockIron:
    case Tile.RockCoal:
    case Tile.RockGold:
    case Tile.RockSilver:
    case Tile.RockMithril:
    case Tile.RockAdamant:
    case Tile.RockObsidian:
    case Tile.RockStarfall:
    case Tile.RockDepleted:
    case Tile.CaveWall:
    case Tile.CaveFloor:
    case Tile.CaveRubble:
    case Tile.CrackedCaveWall:
    case Tile.DungeonFloor:
    case Tile.Stalagmite:
      return 'stark';
    default:
      // Walls, fences, floors, furniture, crops, grass — a built or
      // green border wants open land at its foot, nothing more.
      return 'meadow';
  }
}

/**
 * Majority-smooth one perimeter run so a lone stall post in a hedge
 * doesn't flicker the intention tile to tile. The deliberate linear
 * features — water and worn track — vote double: a two-tile stream
 * mouth or road stub crossing the border must survive the vote and
 * keep going.
 */
function smoothRun(run: EdgeClass[]): EdgeClass[] {
  const out = run.slice();
  for (let i = 0; i < run.length; i++) {
    const votes = new Map<EdgeClass, number>();
    for (let k = -2; k <= 2; k++) {
      const c = run[Math.min(run.length - 1, Math.max(0, i + k))]!;
      votes.set(c, (votes.get(c) ?? 0) + (c === 'water' || c === 'worn' ? 2 : 1));
    }
    let best = run[i]!;
    let bestN = votes.get(best) ?? 0;
    for (const [c, n] of votes) {
      if (n > bestN) {
        best = c;
        bestN = n;
      }
    }
    out[i] = best;
  }
  return out;
}

/**
 * Derive a zone's edge profile from its authored ground. Returns null
 * when every border cell is transparent (composed POI sites with skip
 * fringes) — such a zone claims nothing from the wild.
 */
export function zoneEdgeProfileOf(zone: {
  id: string;
  origin: Vec2;
  width: number;
  height: number;
  ground: ArrayLike<number>;
}): ZoneEdgeProfile | null {
  const { width: w, height: h } = zone;
  const at = (lx: number, ly: number): EdgeClass =>
    tileEdgeClass(zone.ground[ly * w + lx]!);
  const top: EdgeClass[] = [];
  const bottom: EdgeClass[] = [];
  for (let lx = 0; lx < w; lx++) {
    top.push(at(lx, 0));
    bottom.push(at(lx, h - 1));
  }
  const left: EdgeClass[] = [];
  const right: EdgeClass[] = [];
  for (let ly = 0; ly < h; ly++) {
    left.push(at(0, ly));
    right.push(at(w - 1, ly));
  }
  const all = [...top, ...bottom, ...left, ...right];
  if (all.every((c) => c === 'open')) return null;
  return {
    id: zone.id,
    x: zone.origin.x,
    y: zone.origin.y,
    w,
    h,
    top: smoothRun(top),
    bottom: smoothRun(bottom),
    left: smoothRun(left),
    right: smoothRun(right),
  };
}

/**
 * The border class governing a world point: nearest side's run, with
 * an optional jitter applied ALONG the border so adjacent intentions
 * interleave rather than meet on a perpendicular seam.
 */
function classAt(p: ZoneEdgeProfile, tx: number, ty: number, jitter: number): EdgeClass {
  const dTop = ty - p.y;
  const dBot = p.y + p.h - 1 - ty;
  const dL = tx - p.x;
  const dR = p.x + p.w - 1 - tx;
  const m = Math.min(dTop, dBot, dL, dR);
  const clampi = (v: number, hi: number): number => (v < 0 ? 0 : v > hi ? hi : v);
  if (m === dTop || m === dBot) {
    const i = clampi(tx - p.x + jitter, p.w - 1);
    return m === dTop ? p.top[i]! : p.bottom[i]!;
  }
  const i = clampi(ty - p.y + jitter, p.h - 1);
  return m === dL ? p.left[i]! : p.right[i]!;
}

interface EdgeInfluence {
  law: (typeof EDGE_LAW)[EdgeClass];
  w: number;
}

/**
 * The strongest edge influence at a world point, or null out of reach.
 * Distance is fbm-warped (growing with distance: the first ring is
 * faithful, the far boundary organic) before the smoothstep falloff.
 */
function edgeInfluenceAt(seed: number, tx: number, ty: number): EdgeInfluence | null {
  let best: EdgeInfluence | null = null;
  let warp = Number.NaN; // noise sampled once, only when something is in reach
  let wob = 0;
  for (const p of ZONE_EDGE_PROFILES) {
    const d = distToRect(tx, ty, p);
    if (d >= EDGE_REACH) continue;
    if (Number.isNaN(warp)) {
      warp = (fbm(seed ^ 0xed6ea, tx * 0.06, ty * 0.06, 2) - 0.5) * 2;
      wob = (fbm(seed ^ 0x1a7e5, tx * 0.07, ty * 0.07, 2) - 0.5) * 2;
    }
    const jitter = Math.round(wob * Math.min(3, d * 0.5));
    const cls = classAt(p, tx, ty, jitter);
    if (cls === 'open') continue;
    const law = EDGE_LAW[cls];
    const dw = d + warp * 4 * Math.min(1, d / 6);
    const t = 1 - dw / law.range;
    if (t <= 0) continue;
    const tc = t >= 1 ? 1 : t;
    const w = tc * tc * (3 - 2 * tc);
    if (!best || w > best.w) best = { law, w };
  }
  return best;
}

/** Elevation with the border's intention blended in (worldgen calls this). */
export function edgeBlendElevation(seed: number, tx: number, ty: number, e: number): number {
  const inf = edgeInfluenceAt(seed, tx, ty);
  if (!inf) return e;
  if (inf.law.elevTarget !== undefined) return e + (inf.law.elevTarget - e) * inf.w;
  if (inf.law.elevFloor !== undefined && e < inf.law.elevFloor) {
    return e + (inf.law.elevFloor - e) * inf.w;
  }
  return e;
}

/** Moisture with the border's intention blended in (worldgen calls this). */
export function edgeBlendMoisture(seed: number, tx: number, ty: number, m: number): number {
  const inf = edgeInfluenceAt(seed, tx, ty);
  if (!inf || inf.law.moisture === undefined) return m;
  return m + (inf.law.moisture - m) * inf.w;
}

/**
 * Max falloff (1 at a profiled border, 0 at `range` out) for the level
 * fields — the generalized apron: plateaus and basins hold off EVERY
 * profiled zone border, aproned-in-the-plan or not. `exceptStark` lets
 * the plateau field keep cresting against a stone/cliff border (crag
 * country meeting a mountain hold reads right); basins never get that
 * license — their fence would land inside the zone.
 */
export function zoneFieldDampAt(
  tx: number,
  ty: number,
  range: number,
  exceptStark = false,
): number {
  let s = 0;
  for (const p of ZONE_EDGE_PROFILES) {
    const d = distToRect(tx, ty, p);
    if (d >= range) continue;
    const cls = classAt(p, tx, ty, 0);
    if (cls === 'open') continue;
    if (exceptStark && cls === 'stark') continue;
    const f = 1 - d / range;
    if (f > s) s = f;
  }
  return s > 1 ? 1 : s;
}

// ---------------------------------------------------------------- wire
// Packed form for the dev API: one char per perimeter tile, so the
// editor can mirror the server's registry without refetching zones.

const CLASS_CODE: Record<EdgeClass, string> = {
  open: 'o',
  water: 'w',
  sand: 's',
  forest: 'f',
  meadow: 'm',
  worn: 'p',
  stark: 'k',
};
const CODE_CLASS = new Map<string, EdgeClass>(
  (Object.entries(CLASS_CODE) as Array<[EdgeClass, string]>).map(([c, k]) => [k, c]),
);

export interface PackedZoneEdgeProfile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export function packZoneEdgeProfile(p: ZoneEdgeProfile): PackedZoneEdgeProfile {
  const pack = (run: EdgeClass[]): string => run.map((c) => CLASS_CODE[c]).join('');
  return {
    id: p.id,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    top: pack(p.top),
    bottom: pack(p.bottom),
    left: pack(p.left),
    right: pack(p.right),
  };
}

export function unpackZoneEdgeProfile(p: PackedZoneEdgeProfile): ZoneEdgeProfile {
  const unpack = (s: string): EdgeClass[] =>
    [...s].map((k) => CODE_CLASS.get(k) ?? 'open');
  return {
    id: p.id,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    top: unpack(p.top),
    bottom: unpack(p.bottom),
    left: unpack(p.left),
    right: unpack(p.right),
  };
}

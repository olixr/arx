import { fbm, type Vec2 } from '@devcraft/shared';

/**
 * THE GEOGRAPHY — the master plan's fixed points, in one place.
 *
 * The Dawnlands grow along a spine of three hearths: Dawnmead (built),
 * Amberford (the crossroads market town, east), and Silverfall (the
 * mountain capital, far northwest). Everything here is pure data and
 * pure math over it: worldgen reads the massif/veil/apron fields to
 * shape terrain, the POI scaffold reads the planned rects to keep the
 * frontier out of tomorrow's streets, and the road queries carve the
 * routes that stitch the spine together.
 *
 * Coordinates are WORLD TILES. These numbers are load-bearing across
 * epics — the zone builds stamp into exactly these rects, so moving
 * one here moves the town everywhere.
 */

export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Dawnmead — the awakening village (built; commit 339616a). */
export const DAWNMEAD_RECT: ZoneRect = { x: -96, y: 16, w: 96, h: 64 };

/**
 * Amberford — the crossroads market town (epic 2). Center (160, 24):
 * far enough east that the First Road is a real first journey (~40
 * tiles of tier-1 country between the safe edges), close enough that
 * a fresh waker survives the walk.
 */
export const AMBERFORD_RECT: ZoneRect = { x: 104, y: -16, w: 112, h: 80 };

/**
 * Silverfall — the mountain capital (epic 4). Center (-288, -160):
 * deep in the Silverspine, ~306 tiles from Dawnmead, so the band
 * march keeps its approach at tier 4-5 forever. The city itself will
 * anchor as a HAVEN (a lamp, not a hearth) — tier 0 inside, wild at
 * the walls.
 */
export const SILVERFALL_RECT: ZoneRect = { x: -376, y: -224, w: 176, h: 128 };

/**
 * Every authored-or-planned overworld zone rect. The POI scaffold
 * treats these exactly like registered zones when siting the frontier,
 * so no camp ever materializes in a street that hasn't been built yet.
 */
export const PLANNED_ZONE_RECTS: readonly ZoneRect[] = [
  DAWNMEAD_RECT,
  AMBERFORD_RECT,
  SILVERFALL_RECT,
];

/**
 * Rects whose borders the terrain FIELDS keep clear (plateaus held a
 * short walk off, basins held far off — a basin's fence would sit
 * inside the zone where the overlay erases it, the Dawnmead lesson).
 * Dawnmead is NOT here: its legacy radial suppression in worldgen
 * stays byte-identical so the settled world never shifts underfoot.
 */
export const FIELD_APRON_RECTS: readonly ZoneRect[] = [AMBERFORD_RECT, SILVERFALL_RECT];

/** Distance from a point to a rect's edge (0 inside). */
export function distToRect(tx: number, ty: number, r: ZoneRect): number {
  const dx = Math.max(r.x - tx, 0, tx - (r.x + r.w - 1));
  const dy = Math.max(r.y - ty, 0, ty - (r.y + r.h - 1));
  return Math.hypot(dx, dy);
}

/**
 * Max apron falloff (1 at a rect edge, 0 at `range` tiles out) over
 * the planned rects. Worldgen subtracts this from the terrain fields.
 */
export function fieldApronAt(tx: number, ty: number, range: number): number {
  let s = 0;
  for (const r of FIELD_APRON_RECTS) {
    const f = 1 - distToRect(tx, ty, r) / range;
    if (f > s) s = f;
  }
  return s > 1 ? 1 : s;
}

// --------------------------------------------------------------------
// The Silverspine and the Thornveil — the two landform guarantees.
// Worldgen's noise DECIDES the details; these radial fields only bias
// it so the master plan's geography exists on every seed: a mountain
// province around Silverfall, a deep forest across its approach.
// --------------------------------------------------------------------

/** The Silverspine massif — crag country cradling Silverfall. */
export const SILVERSPINE = { x: -320, y: -192, r: 210 } as const;

/** The Thornveil — the dark wood between the lowlands and the climb. */
export const THORNVEIL = { x: -130, y: -70, r: 160 } as const;

/** Radial falloff for the massif (1 at heart, 0 past the rim). */
export function massifAt(tx: number, ty: number): number {
  const d = Math.hypot(tx - SILVERSPINE.x, ty - SILVERSPINE.y);
  return Math.max(0, 1 - d / SILVERSPINE.r);
}

/** Radial falloff for the Thornveil's damp. */
export function thornveilAt(tx: number, ty: number): number {
  const d = Math.hypot(tx - THORNVEIL.x, ty - THORNVEIL.y);
  return Math.max(0, 1 - d / THORNVEIL.r);
}

// --------------------------------------------------------------------
// ROADS — first-class worldgen, not zones. A route is a polyline of
// world-tile waypoints; the carve is a pure per-tile query so a chunk
// generates identically whether or not anyone ever walked it. The
// centerline WANDERS: the query point is warped by a slow noise field
// before the distance test, so long straight legs read as a traveled
// track, never a ruler line.
// --------------------------------------------------------------------

export interface RoadRoute {
  id: string;
  name: string;
  /**
   * 'road' = the built way: packed Path surface, wide graded ribbon,
   * bridged crossings. 'trail' = a hunter's track: bare Dirt, narrow,
   * barely cleared — the map's visual grammar for "no one maintains
   * this" (plank spans still cross water; nobody swims to a shortcut).
   */
  kind: 'road' | 'trail';
  /** Waypoints in world tiles, in travel order. */
  pts: readonly Vec2[];
}

/**
 * The three routes of the spine. Ends poke one tile into their zone
 * rects on purpose — the overlay wins inside, so the authored gate art
 * and the carved road always meet without a seam of wild grass.
 */
export const ROAD_ROUTES: readonly RoadRoute[] = [
  {
    id: 'first_road',
    name: 'The First Road',
    kind: 'road',
    // Dawnmead's east lane mouth to Amberford's Fordgate: the
    // graduate walk. Tier 1 the whole way, wobble tier 2.
    pts: [
      { x: 0, y: 48 },
      { x: 36, y: 46 },
      { x: 70, y: 42 },
      { x: 105, y: 36 },
    ],
  },
  {
    id: 'high_road',
    name: 'The High Road',
    kind: 'road',
    // Amberford's north gate to Silverfall's south gate: the game's
    // great journey. Foothills (T2), the Thornveil crossing (T3),
    // then crag country past the Last Lamp (T4-5). Epic 3 posts the
    // waystation mileposts along it.
    pts: [
      { x: 158, y: -15 },
      { x: 140, y: -56 },
      { x: 104, y: -88 },
      { x: 48, y: -112 },
      { x: -20, y: -124 },
      { x: -80, y: -118 },
      { x: -140, y: -96 },
      { x: -190, y: -88 },
      { x: -244, y: -76 },
      { x: -278, y: -88 },
      { x: -288, y: -98 },
    ],
  },
  {
    id: 'hunters_trail',
    name: "The Hunter's Trail",
    kind: 'trail',
    // Dawnmead's north hem to the Thornveil Fork: the unlit shortcut
    // that threads the wolf dens. Saves half the journey, costs the
    // safety — the map's lesson about roads, taught by counterexample.
    pts: [
      { x: -64, y: 15 },
      { x: -52, y: -8 },
      { x: -72, y: -40 },
      { x: -104, y: -68 },
      { x: -140, y: -96 },
    ],
  },
];

/**
 * Trail widths — the hunter's track is a narrow scuff of dirt with a
 * barely-felled verge. Same fence-safety law as the road: apron must
 * exceed the surface half-width by more than the wander gradient can
 * move the distance field between neighbors (~2.3 tiles diagonal).
 */
export const TRAIL_HALF = 1.1;
export const TRAIL_APRON = 3.6;
export const TRAIL_SHOULDER = 3.8;

/** Half-width of the trodden surface (Path / Bridge tiles). */
export const ROAD_HALF = 1.6;
/**
 * Half-width of the graded ribbon: terrain LEVELS are forced flat out
 * to here, so the carve cuts through mesa country (cliff-walled
 * cuttings) and embanks across dells (walled causeways) and the
 * fence law never lands a Cliff on the trodden surface. Must exceed
 * ROAD_HALF by more than one tile of wobble gradient.
 */
export const ROAD_APRON = 4.0;
/** Half-width of the cleared shoulder (trees/boulders felled). */
export const ROAD_SHOULDER = 4.5;
/** Ambient wild spawns keep this distance — roads read as traveled. */
export const ROAD_CALM = 6;

/** Per-route padded bounds for cheap rejects. */
const ROAD_BOUNDS = ROAD_ROUTES.map((route) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of route.pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { route, x0, y0, x1, y1 };
});

/** Wander: amplitude in tiles and the field's spatial frequency. */
const WANDER_AMP = 2.2;
const WANDER_FREQ = 0.021;
/** Query pad: wander + widest query radius (ROAD_CALM) + slack. */
const ROAD_PAD = 10;

/** Does a world-tile rect come near any route? (Coarse, for fast skips.) */
export function nearRoads(x0: number, y0: number, x1: number, y1: number): boolean {
  for (const b of ROAD_BOUNDS) {
    if (
      x0 <= b.x1 + ROAD_PAD &&
      x1 >= b.x0 - ROAD_PAD &&
      y0 <= b.y1 + ROAD_PAD &&
      y1 >= b.y0 - ROAD_PAD
    ) {
      return true;
    }
  }
  return false;
}

function segDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export interface RoadHit {
  /** Distance to the (wandered) centerline in tiles. */
  dist: number;
  /** True when the nearest route is a trail, not a built road. */
  trail: boolean;
}

/**
 * Nearest (wandered) route at a world tile, or null when none is
 * near. Deterministic from (seed, tx, ty) like every field worldgen
 * reads. Ties go to the built road — where a trail meets the High
 * Road at a fork, the fork reads as road.
 */
export function roadHitAt(seed: number, tx: number, ty: number): RoadHit | null {
  let wx = 0;
  let wy = 0;
  let warped = false;
  let best = Infinity;
  let trail = false;
  for (const b of ROAD_BOUNDS) {
    if (
      tx < b.x0 - ROAD_PAD ||
      tx > b.x1 + ROAD_PAD ||
      ty < b.y0 - ROAD_PAD ||
      ty > b.y1 + ROAD_PAD
    ) {
      continue;
    }
    if (!warped) {
      wx = tx + (fbm(seed ^ 0x70ad1, tx * WANDER_FREQ, ty * WANDER_FREQ, 2) - 0.5) * 2 * WANDER_AMP;
      wy = ty + (fbm(seed ^ 0x70ad2, tx * WANDER_FREQ, ty * WANDER_FREQ, 2) - 0.5) * 2 * WANDER_AMP;
      warped = true;
    }
    const pts = b.route.pts;
    const isTrail = b.route.kind === 'trail';
    for (let i = 0; i < pts.length - 1; i++) {
      const d = segDist(wx, wy, pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
      if (d < best || (d === best && !isTrail)) {
        best = d;
        trail = isTrail;
      }
    }
  }
  return best === Infinity ? null : { dist: best, trail };
}

/**
 * Distance to the nearest route of any kind; Infinity when none is
 * near. The cheap form for buffer checks (wild-spawn calm, probes).
 */
export function roadDistanceAt(seed: number, tx: number, ty: number): number {
  return roadHitAt(seed, tx, ty)?.dist ?? Infinity;
}

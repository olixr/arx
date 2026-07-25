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

/**
 * Unit bearing from a world point toward the nearest spot on any
 * route's raw polyline, or null when every route is farther than
 * maxDist. Wander is ignored — this steers APPROACH CUES (a POI's
 * worn path and warning scatter face the road players actually
 * arrive by), and a couple of tiles of wobble don't change which way
 * the road lies.
 */
export function roadBearingAt(
  tx: number,
  ty: number,
  maxDist: number,
): { x: number; y: number } | null {
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (const b of ROAD_BOUNDS) {
    if (
      tx < b.x0 - maxDist ||
      tx > b.x1 + maxDist ||
      ty < b.y0 - maxDist ||
      ty > b.y1 + maxDist
    ) {
      continue;
    }
    const pts = b.route.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i]!.x;
      const ay = pts[i]!.y;
      const dx = pts[i + 1]!.x - ax;
      const dy = pts[i + 1]!.y - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((tx - ax) * dx + (ty - ay) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = Math.hypot(tx - px, ty - py);
      if (d < best) {
        best = d;
        bx = px - tx;
        by = py - ty;
      }
    }
  }
  if (best > maxDist || best < 0.5) return null; // too far — or standing ON it
  return { x: bx / best, y: by / best };
}

// ------------------------------------------------------------------
// THE AUTHORED WILD SITES — Epic 3's fixed points in the frontier.
//
// The POI scaffold rolls the wilds by hash; these entries OVERRIDE
// the roll for specific cells, because some places are story, not
// chance: the waystation mileposts that pace the High Road, the Last
// Lamp before the Silverspine climb, and the named dens the Thornveil
// has always held. The server seeds them at boot (idempotent — the
// ledger keeps them), and both sweeps skip their cells so the plan
// can never evict its own landmarks. One site per macro-cell is the
// scaffold's law, so every entry here must claim a distinct cell.
// ------------------------------------------------------------------

export interface AuthoredWildSite {
  /** Ledger note + log name — not a zone id. */
  id: string;
  /** POI archetype (pois/defs). Weight-0 defs only place through here. */
  defId: string;
  /**
   * Pinned mode: preferred anchor in world tiles. The seeder nudges
   * to the nearest footprint-standable spot (roads carve 'rock'
   * probes for ROAD_SHOULDER, so a pinned site can hug a road but
   * never block it). Omitted = cell mode: the honest site scan runs
   * inside `cell` with the archetype forced.
   */
  x?: number;
  y?: number;
  /** Cell mode: [cellX, cellY] macro-cell to force the archetype in. */
  cell?: readonly [number, number];
}

export const AUTHORED_WILD_SITES: readonly AuthoredWildSite[] = [
  // The High Road mileposts — a lamp for each leg of the great
  // journey, each in its own macro-cell (cells are 128 wide, so the
  // road's five cells hold at most five stops — these claim four).
  // The anchors follow the GROUND, not arithmetic: the mesa cutting
  // (cum ~90–155) has no standable verge at all, so no rest stands
  // on it — cross the cutting in one push, like the keepers warn.
  //
  // Fernway: the first rest out of Amberford, at the foot of the
  // climb — the last grass before the cutting walls close in.
  { id: 'fernway_rest', defId: 'waystation', x: 122, y: -53 },
  // The Long Meadow rest: across the mesa, where the road flattens
  // into the long dark mile and the night feels widest.
  { id: 'longmeadow_rest', defId: 'waystation', x: -58, y: -108 },
  // The Fork rest: in the pines where the Hunter's Trail comes out
  // of the veil. Half its trade is people very glad to be out.
  { id: 'fork_rest', defId: 'waystation', x: -150, y: -104 },
  // THE LAST LAMP: the final haven before Silverfall's gate country.
  // Its own weight-0 archetype — one lamp, one Edda, one warning.
  { id: 'last_lamp', defId: 'last_lamp', x: -262, y: -70 },

  // The named dens of the wild northwest — the veil has ALWAYS held
  // these; the cell-forced scan finds them honest ground off-road.
  // (Cell math note: the near-northwest is four giant cells, and the
  // cell holding Dawnmead's meadows is settled at center — dead to
  // the scaffold — so the dens take the veil's WESTERN cells.)
  //
  // The wolfkin den the Thornveil is famous for, west of the trail.
  { id: 'veil_den', defId: 'wolfkin_den', cell: [-2, 0] },
  // The kobold digs under the Silverspine's south skirts, tunneling
  // toward the ore country one shored gallery at a time.
  { id: 'spine_digs', defId: 'kobold_digs', cell: [-3, 0] },

  // The First Road ambush: a brigand camp somewhere in the corridor
  // between the hearths — every waker's first lesson that the space
  // BETWEEN safeties is the game.
  { id: 'first_road_toll', defId: 'bandit_camp', cell: [0, 0] },
  // The broken tower on the High Road's first climb north of
  // Amberford — the old line failed here first.
  { id: 'first_climb_tower', defId: 'watchtower_ruin', cell: [1, -1] },
];

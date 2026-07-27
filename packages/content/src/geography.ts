import { fbm, type Vec2, type DangerAnchor } from '@devcraft/shared';
import { SETTLED_ANCHORS, replaceSettledAnchors } from './danger.js';

/**
 * THE GEOGRAPHY — the master plan's fixed points, in one place.
 *
 * The Dawnlands grow along a spine of three hearths: Dawnmead (built),
 * Amberford (the crossroads market town, east), and Silverfall (the
 * mountain capital, far northwest). Everything here is pure data and
 * pure math over it: worldgen reads the massif/veil fields to shape
 * terrain, the POI scaffold reads the planned rects to keep the
 * frontier out of tomorrow's streets, and the road queries carve the
 * routes that stitch the spine together.
 *
 * Coordinates are WORLD TILES. These numbers are load-bearing across
 * epics — the zone builds stamp into exactly these rects, so moving
 * one here moves the town everywhere.
 *
 * THE GEOGRAPHY IS A LIVE REGISTRY (the NPCS/LOOT_TABLES law): the
 * exported arrays are refilled in place by `replaceGeography`, and
 * every query function reads the live state at call time. The shipped
 * plan survives as AUTHORED_GEOGRAPHY — the frozen truth reverts
 * restore — while the World Studio edits the living copy through the
 * geography content doc. Derived state (route bounds) rebuilds inside
 * `replaceGeography`; nothing may cache a projection of this module's
 * data at import time.
 */

export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A planned zone footprint — either a built zone's rect or ground
 * reserved for one. The POI scaffold treats these exactly like
 * registered zones when siting the frontier, so no camp ever
 * materializes in a street that hasn't been built yet. `apron` rects
 * additionally have their borders held clear by the terrain FIELDS
 * (plateaus a short walk off, basins far off — a basin's fence would
 * sit inside the zone where the overlay erases it, the Dawnmead
 * lesson). Dawnmead itself is NOT aproned: its legacy radial
 * suppression in worldgen stays byte-identical so the settled world
 * never shifts underfoot.
 */
export interface PlannedRect extends ZoneRect {
  id: string;
  name?: string;
  apron?: boolean;
}

/**
 * A radial landform guarantee. Worldgen's noise DECIDES the details;
 * these fields only bias it so the master plan's geography exists on
 * every seed — a mountain province around Silverfall, a deep forest
 * across its approach.
 */
export interface Landform {
  id: string;
  x: number;
  y: number;
  r: number;
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
 * march keeps its approach at tier 4-5 forever. The city anchors as a
 * HAVEN (a lamp, not a hearth) — tier 0 inside, wild at the walls.
 */
export const SILVERFALL_RECT: ZoneRect = { x: -376, y: -224, w: 176, h: 128 };

/** The Silverspine massif — crag country cradling Silverfall. */
export const SILVERSPINE = { x: -320, y: -192, r: 210 } as const;

/** The Thornveil — the dark wood between the lowlands and the climb. */
export const THORNVEIL = { x: -130, y: -70, r: 160 } as const;

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
  /** Waypoints in world tiles, in travel order (mutable — the World Studio edits drafts in place). */
  pts: Vec2[];
}

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

/**
 * THE GEOGRAPHY DOC — the whole plan as one editable value: the
 * content_docs kind 'geography' payload, the World Studio's document,
 * and the argument `replaceGeography` swaps live.
 */
export interface GeographyDef {
  routes: RoadRoute[];
  sites: AuthoredWildSite[];
  /** The lights of civilization — shared/world/danger.ts anchors. */
  anchors: DangerAnchor[];
  massifs: Landform[];
  veils: Landform[];
  planned: PlannedRect[];
}

// --------------------------------------------------------------------
// THE SHIPPED PLAN — the frozen authored truth (reverts restore this).
// --------------------------------------------------------------------

const AUTHORED_PLAN: GeographyDef = {
  routes: [
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
      // then crag country past the Last Lamp (T4-5).
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
  ],
  sites: [
    // The High Road mileposts — a lamp for each leg of the great
    // journey, each in its own macro-cell. The anchors follow the
    // GROUND, not arithmetic: the mesa cutting has no standable verge
    // at all, so no rest stands on it — cross it in one push.
    { id: 'fernway_rest', defId: 'waystation', x: 122, y: -53 },
    { id: 'longmeadow_rest', defId: 'waystation', x: -58, y: -108 },
    { id: 'fork_rest', defId: 'waystation', x: -150, y: -104 },
    // THE LAST LAMP: the final haven before Silverfall's gate country.
    { id: 'last_lamp', defId: 'last_lamp', x: -262, y: -70 },
    // The named dens of the wild northwest — the veil has ALWAYS held
    // these; the cell-forced scan finds them honest ground off-road.
    { id: 'veil_den', defId: 'wolfkin_den', cell: [-2, 0] },
    { id: 'spine_digs', defId: 'kobold_digs', cell: [-3, 0] },
    // The First Road ambush — every waker's first lesson that the
    // space BETWEEN safeties is the game.
    { id: 'first_road_toll', defId: 'bandit_camp', cell: [0, 0] },
    // The broken tower on the High Road's first climb.
    { id: 'first_climb_tower', defId: 'watchtower_ruin', cell: [1, -1] },
  ],
  anchors: SETTLED_ANCHORS.map((a) => ({ ...a })),
  massifs: [{ id: 'silverspine', ...SILVERSPINE }],
  veils: [{ id: 'thornveil', ...THORNVEIL }],
  planned: [
    { id: 'dawnmead', name: 'Dawnmead', ...DAWNMEAD_RECT },
    { id: 'amberford', name: 'Amberford', ...AMBERFORD_RECT, apron: true },
    { id: 'silverfall', name: 'Silverfall', ...SILVERFALL_RECT, apron: true },
  ],
};
export const AUTHORED_GEOGRAPHY: GeographyDef = Object.freeze(AUTHORED_PLAN);

// --------------------------------------------------------------------
// THE LIVE STATE — refilled in place; consumers iterate at call time.
// --------------------------------------------------------------------

export const ROAD_ROUTES: readonly RoadRoute[] = [];
export const AUTHORED_WILD_SITES: readonly AuthoredWildSite[] = [];
export const PLANNED_ZONE_RECTS: readonly PlannedRect[] = [];
export const FIELD_APRON_RECTS: readonly PlannedRect[] = [];
const MASSIFS: Landform[] = [];
const VEILS: Landform[] = [];

interface RouteBounds {
  route: RoadRoute;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
let ROAD_BOUNDS: RouteBounds[] = [];

function refill<T>(live: readonly T[], next: readonly T[]): void {
  const arr = live as T[];
  arr.length = 0;
  for (const v of next) arr.push(v);
}

/** A deep working copy of the current live geography. */
export function geographySnapshot(): GeographyDef {
  return {
    routes: ROAD_ROUTES.map((r) => ({ ...r, pts: r.pts.map((p) => ({ ...p })) })),
    sites: AUTHORED_WILD_SITES.map((s) => ({
      ...s,
      ...(s.cell ? { cell: [s.cell[0], s.cell[1]] as const } : {}),
    })),
    anchors: SETTLED_ANCHORS.map((a) => ({ ...a })),
    massifs: MASSIFS.map((m) => ({ ...m })),
    veils: VEILS.map((v) => ({ ...v })),
    planned: PLANNED_ZONE_RECTS.map((p) => ({ ...p })),
  };
}

/**
 * Swap the whole plan live. Callers own the aftermath (the server
 * drops every generated chunk, restreams, and re-surveys the POI
 * ledger); this only makes every future query answer from `def`.
 */
export function replaceGeography(def: GeographyDef): void {
  refill(ROAD_ROUTES, def.routes.map((r) => ({ ...r, pts: r.pts.map((p) => ({ ...p })) })));
  refill(AUTHORED_WILD_SITES, def.sites.map((s) => ({ ...s })));
  refill(PLANNED_ZONE_RECTS, def.planned.map((p) => ({ ...p })));
  refill(FIELD_APRON_RECTS, def.planned.filter((p) => p.apron).map((p) => ({ ...p })));
  refill(MASSIFS, def.massifs.map((m) => ({ ...m })));
  refill(VEILS, def.veils.map((v) => ({ ...v })));
  replaceSettledAnchors(def.anchors);
  ROAD_BOUNDS = ROAD_ROUTES.map((route) => {
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
}

// --------------------------------------------------------------------
// THE VALIDATOR — one gate for authored/DB/tool paths (collects every
// error; the poi-validator pattern). Structural truth only: design
// judgement (a road that misses its gate, a milepost far from its
// road) lives in geographyWarnings so the studio can advise without
// blocking a work-in-progress plan.
// --------------------------------------------------------------------

const GEO_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;
/** Routes must stay far above the dark band (y >= 400 is underground). */
export const GEOGRAPHY_SURFACE_MAX_Y = 400;
/** POI macro-cell width — mirrored from the scaffold (POI_CELL). */
export const GEO_POI_CELL = 128;

export type GeographyValidation =
  | { ok: true; def: GeographyDef }
  | { ok: false; errors: string[] };

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

export function validateGeographyDef(
  raw: unknown,
  refs?: { poiDefIds?: ReadonlySet<string> },
): GeographyValidation {
  const errors: string[] = [];
  const r = raw as Partial<GeographyDef> | null;
  if (!r || typeof r !== 'object') return { ok: false, errors: ['geography must be an object'] };

  const routes: RoadRoute[] = [];
  const seenRoutes = new Set<string>();
  if (!Array.isArray(r.routes)) errors.push('routes must be an array');
  else {
    for (const [i, rt] of r.routes.entries()) {
      const at = `routes[${i}]`;
      if (!rt || typeof rt !== 'object') {
        errors.push(`${at} must be an object`);
        continue;
      }
      if (typeof rt.id !== 'string' || !GEO_ID_RE.test(rt.id)) {
        errors.push(`${at}.id must match ${GEO_ID_RE}`);
        continue;
      }
      if (seenRoutes.has(rt.id)) errors.push(`duplicate route id '${rt.id}'`);
      seenRoutes.add(rt.id);
      if (typeof rt.name !== 'string' || rt.name.trim() === '') {
        errors.push(`${at}.name must be a non-empty string`);
      }
      if (rt.kind !== 'road' && rt.kind !== 'trail') {
        errors.push(`${at}.kind must be 'road' or 'trail'`);
      }
      if (!Array.isArray(rt.pts) || rt.pts.length < 2) {
        errors.push(`${at}.pts needs at least two waypoints`);
        continue;
      }
      let bad = false;
      for (const [j, p] of rt.pts.entries()) {
        if (!p || !isInt(p.x) || !isInt(p.y) || Math.abs(p.x) > 100000 || Math.abs(p.y) > 100000) {
          errors.push(`${at}.pts[${j}] must be integer world tiles`);
          bad = true;
        } else if (p.y >= GEOGRAPHY_SURFACE_MAX_Y) {
          errors.push(
            `${at}.pts[${j}] (${p.x},${p.y}) rides toward the dark band (y >= ${GEOGRAPHY_SURFACE_MAX_Y})`,
          );
          bad = true;
        }
      }
      if (!bad) {
        routes.push({
          id: rt.id,
          name: rt.name ?? rt.id,
          kind: rt.kind === 'trail' ? 'trail' : 'road',
          pts: rt.pts.map((p: Vec2) => ({ x: p.x, y: p.y })),
        });
      }
    }
  }

  const sites: AuthoredWildSite[] = [];
  const seenSites = new Set<string>();
  const seenCells = new Map<string, string>();
  if (!Array.isArray(r.sites)) errors.push('sites must be an array');
  else {
    for (const [i, s] of r.sites.entries()) {
      const at = `sites[${i}]`;
      if (!s || typeof s !== 'object') {
        errors.push(`${at} must be an object`);
        continue;
      }
      if (typeof s.id !== 'string' || !GEO_ID_RE.test(s.id)) {
        errors.push(`${at}.id must match ${GEO_ID_RE}`);
        continue;
      }
      if (seenSites.has(s.id)) errors.push(`duplicate site id '${s.id}'`);
      seenSites.add(s.id);
      if (typeof s.defId !== 'string' || s.defId === '') {
        errors.push(`site '${s.id}' needs a defId (POI archetype)`);
        continue;
      }
      if (refs?.poiDefIds && !refs.poiDefIds.has(s.defId)) {
        errors.push(`site '${s.id}' names unknown POI archetype '${s.defId}'`);
      }
      const pinned = s.x !== undefined || s.y !== undefined;
      const celled = s.cell !== undefined;
      if (pinned === celled) {
        errors.push(`site '${s.id}' must be pinned (x,y) or cell-forced (cell), not ${pinned ? 'both' : 'neither'}`);
        continue;
      }
      let cx: number;
      let cy: number;
      if (pinned) {
        if (!isInt(s.x) || !isInt(s.y)) {
          errors.push(`site '${s.id}' pin must be integer world tiles`);
          continue;
        }
        if (s.y >= GEOGRAPHY_SURFACE_MAX_Y) {
          errors.push(`site '${s.id}' pin rides toward the dark band`);
          continue;
        }
        cx = Math.floor(s.x / GEO_POI_CELL);
        cy = Math.floor(s.y / GEO_POI_CELL);
        sites.push({ id: s.id, defId: s.defId, x: s.x, y: s.y });
      } else {
        const c = s.cell as unknown;
        if (!Array.isArray(c) || c.length !== 2 || !isInt(c[0]) || !isInt(c[1])) {
          errors.push(`site '${s.id}' cell must be [cellX, cellY] integers`);
          continue;
        }
        cx = c[0];
        cy = c[1];
        sites.push({ id: s.id, defId: s.defId, cell: [cx, cy] });
      }
      const key = `${cx},${cy}`;
      const prior = seenCells.get(key);
      if (prior) {
        errors.push(
          `site '${s.id}' shares macro-cell ${key} with '${prior}' — one site per cell is the scaffold's law`,
        );
      } else {
        seenCells.set(key, s.id);
      }
    }
  }

  const anchors: DangerAnchor[] = [];
  if (!Array.isArray(r.anchors) || r.anchors.length === 0) {
    errors.push('anchors must be a non-empty array — the world needs at least one hearth');
  } else {
    for (const [i, a] of r.anchors.entries()) {
      const at = `anchors[${i}]`;
      if (!a || !isInt(a.x) || !isInt(a.y)) {
        errors.push(`${at} needs integer x,y`);
        continue;
      }
      if (!isInt(a.safeR) || a.safeR < 8 || a.safeR > 192) {
        errors.push(`${at}.safeR must be an integer in [8, 192]`);
        continue;
      }
      anchors.push({ x: a.x, y: a.y, safeR: a.safeR, ...(a.haven ? { haven: true } : {}) });
    }
  }

  const landforms = (kind: 'massifs' | 'veils'): Landform[] => {
    const out: Landform[] = [];
    const list = r[kind];
    const seen = new Set<string>();
    if (!Array.isArray(list)) {
      errors.push(`${kind} must be an array`);
      return out;
    }
    for (const [i, m] of list.entries()) {
      const at = `${kind}[${i}]`;
      if (!m || typeof m.id !== 'string' || !GEO_ID_RE.test(m.id)) {
        errors.push(`${at}.id must match ${GEO_ID_RE}`);
        continue;
      }
      if (seen.has(m.id)) errors.push(`duplicate ${kind} id '${m.id}'`);
      seen.add(m.id);
      if (!isInt(m.x) || !isInt(m.y) || !isInt(m.r) || m.r < 8 || m.r > 1024) {
        errors.push(`${at} needs integer x,y and r in [8, 1024]`);
        continue;
      }
      out.push({ id: m.id, x: m.x, y: m.y, r: m.r });
    }
    return out;
  };
  const massifs = landforms('massifs');
  const veils = landforms('veils');

  const planned: PlannedRect[] = [];
  const seenPlanned = new Set<string>();
  if (!Array.isArray(r.planned)) errors.push('planned must be an array');
  else {
    for (const [i, p] of r.planned.entries()) {
      const at = `planned[${i}]`;
      if (!p || typeof p.id !== 'string' || !GEO_ID_RE.test(p.id)) {
        errors.push(`${at}.id must match ${GEO_ID_RE}`);
        continue;
      }
      if (seenPlanned.has(p.id)) errors.push(`duplicate planned rect id '${p.id}'`);
      seenPlanned.add(p.id);
      if (!isInt(p.x) || !isInt(p.y) || !isInt(p.w) || !isInt(p.h) || p.w < 1 || p.h < 1 || p.w > 512 || p.h > 512) {
        errors.push(`${at} needs integer x,y and w,h in [1, 512]`);
        continue;
      }
      planned.push({
        id: p.id,
        ...(typeof p.name === 'string' && p.name.trim() !== '' ? { name: p.name } : {}),
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        ...(p.apron ? { apron: true } : {}),
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def: { routes, sites, anchors, massifs, veils, planned } };
}

/**
 * Design advice over a VALID plan — the studio's counsel, never a
 * gate. Each warning names its subject so the World view can badge it.
 */
export function geographyWarnings(def: GeographyDef, seed = 1337): string[] {
  const warnings: string[] = [];
  const inAnyRect = (x: number, y: number): boolean =>
    def.planned.some((r) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h);
  const onAnyRoute = (x: number, y: number, skip: string): boolean =>
    def.routes.some((r) => r.id !== skip && r.pts.some((p) => p.x === x && p.y === y));
  for (const route of def.routes) {
    const a = route.pts[0]!;
    const b = route.pts[route.pts.length - 1]!;
    for (const [label, p] of [['starts', a], ['ends', b]] as const) {
      if (!inAnyRect(p.x, p.y) && !onAnyRoute(p.x, p.y, route.id)) {
        warnings.push(
          `route '${route.id}' ${label} loose at (${p.x},${p.y}) — aim it at a planned zone's gate or another route's waypoint`,
        );
      }
    }
  }
  // Judge pinned sites against the DRAFT's own roads, not the live ones.
  const draftDist = (x: number, y: number): number => {
    let best = Infinity;
    for (const route of def.routes) {
      for (let i = 0; i < route.pts.length - 1; i++) {
        const p = route.pts[i]!;
        const q = route.pts[i + 1]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len2 = dx * dx + dy * dy;
        let t = len2 === 0 ? 0 : ((x - p.x) * dx + (y - p.y) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        best = Math.min(best, Math.hypot(x - (p.x + t * dx), y - (p.y + t * dy)));
      }
    }
    return best;
  };
  void seed;
  for (const s of def.sites) {
    if (s.x === undefined || s.y === undefined) continue;
    const d = draftDist(s.x, s.y);
    if (d <= ROAD_SHOULDER) {
      warnings.push(`site '${s.id}' sits inside the road shoulder (${d.toFixed(1)} tiles) — the seeder will nudge it off`);
    } else if (d > 30) {
      warnings.push(`site '${s.id}' stands ${d.toFixed(0)} tiles from any road — travelers may never find it`);
    }
    for (const rect of def.planned) {
      if (distToRect(s.x, s.y, rect) <= 8) {
        warnings.push(`site '${s.id}' anchors inside planned zone '${rect.id}''s near apron`);
      }
    }
  }
  for (const a of def.anchors) {
    const housed = def.planned.some((rect) => distToRect(a.x, a.y, rect) === 0);
    if (!housed) {
      warnings.push(
        `anchor at (${a.x},${a.y}) stands outside every planned zone — a lamp with no town`,
      );
    }
  }
  return warnings;
}

// --------------------------------------------------------------------
// QUERIES — pure math over the live state.
// --------------------------------------------------------------------

/** Distance from a point to a rect's edge (0 inside). */
export function distToRect(tx: number, ty: number, r: ZoneRect): number {
  const dx = Math.max(r.x - tx, 0, tx - (r.x + r.w - 1));
  const dy = Math.max(r.y - ty, 0, ty - (r.y + r.h - 1));
  return Math.hypot(dx, dy);
}

/**
 * Max apron falloff (1 at a rect edge, 0 at `range` tiles out) over
 * the aproned planned rects. Worldgen subtracts this from the fields.
 */
export function fieldApronAt(tx: number, ty: number, range: number): number {
  let s = 0;
  for (const r of FIELD_APRON_RECTS) {
    const f = 1 - distToRect(tx, ty, r) / range;
    if (f > s) s = f;
  }
  return s > 1 ? 1 : s;
}

/** Radial falloff for the massifs (1 at a heart, 0 past every rim). */
export function massifAt(tx: number, ty: number): number {
  let s = 0;
  for (const m of MASSIFS) {
    const f = 1 - Math.hypot(tx - m.x, ty - m.y) / m.r;
    if (f > s) s = f;
  }
  return s;
}

/** Radial falloff for the veils' damp. */
export function thornveilAt(tx: number, ty: number): number {
  let s = 0;
  for (const v of VEILS) {
    const f = 1 - Math.hypot(tx - v.x, ty - v.y) / v.r;
    if (f > s) s = f;
  }
  return s;
}

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

// The shipped plan stands until a content doc replaces it.
replaceGeography(AUTHORED_GEOGRAPHY);

import { fbm, type Vec2, type DangerAnchor } from '@arx/shared';
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
 * Amberford — the crossroads market town (epic 2). Center (352, 24):
 * pushed a full ~300 tiles past Dawnmead's east hem so the First Road
 * is a REAL first journey (~90 seconds of honest walking through the
 * Amberfen, not a stroll) — the corridor carries a toll narrows, a
 * crofter haven, and the fen's islet country to explore on the way.
 */
export const AMBERFORD_RECT: ZoneRect = { x: 296, y: -16, w: 112, h: 80 };

/**
 * Silverfall — the mountain capital (epic 4). Center (-288, -160):
 * deep in the Silverspine, ~306 tiles from Dawnmead, so the band
 * march keeps its approach at tier 4-5 forever. The city anchors as a
 * HAVEN (a lamp, not a hearth) — tier 0 inside, wild at the walls.
 */
export const SILVERFALL_RECT: ZoneRect = { x: -376, y: -224, w: 176, h: 128 };

/**
 * Saltmere — the town at the water's end (the southern epic). Center
 * (356, 292): a straight run of ~190 tiles south of Amberford's gate,
 * far enough that the band march carries the Salt Road through tier 2
 * into tier 3 for its last league — the first journey the game asks
 * of a made character, not a waker. The town anchors as a HAVEN (the
 * Silverfall law): tier 0 on the quay, wild at the walls, and the far
 * shore of the mere stays tier 4-5 country forever.
 */
export const SALTMERE_RECT: ZoneRect = { x: 300, y: 252, w: 112, h: 80 };

/** The Silverspine massif — crag country cradling Silverfall. */
export const SILVERSPINE = { x: -320, y: -192, r: 210 } as const;

/**
 * THE SPINEWALLS — the two ramparts that close the Silverspine's hand
 * around the capital. The base massif lifts the whole province, but a
 * province is not a cradle: the east flank ran soft all the way to
 * the Thornveil, and the last league of the High Road crossed open
 * meadow. These two put stone where the story needs stone.
 *
 * EAST: crag country standing a clean thirty tiles off the city's
 * east wall (the zone apron holds the plateau field down inside that
 * ring, so the crags crowd the approach without ever fencing a gate).
 * SOUTH: the shoulder the High Road's last league squeezes past —
 * with the Kingswater on the other side, the final approach to
 * Silverfall is a gap between crag and deep water. One road in.
 */
export const SPINEWALL_EAST = { x: -152, y: -176, r: 116 } as const;
export const SPINEWALL_SOUTH = { x: -238, y: -34, r: 82 } as const;

/**
 * THE KINGSWATER + THE COLDTARN — the capital's water. The Kingswater
 * is the long cold sheet off Silverfall's south-west: the flank no
 * army has ever bothered to march, and the reason the city only ever
 * needed one gate. The Coldtarn is the high water under the pass
 * shoulder, the last drink before the Hoargate.
 *
 * Both hearts sit OFF the zone rect (the Amberfen heart law): the
 * city authors its own ground and the border's edge class carries the
 * water outward, so no shoreline is ever sliced by a rect.
 */
export const KINGSWATER = { x: -380, y: -70, r: 84 } as const;
export const COLDTARN = { x: -166, y: -250, r: 44 } as const;

/**
 * THE PINEREACH — the great taiga of the north-east, and the whole
 * reason Pinewatch exists. Two hearts overlapping into one wood: the
 * northern heart stands near-pure pine (cold enough that nothing else
 * takes the stand), and the southern arm runs down the east country
 * toward the coast, giving out into mixed oak and pine as it warms —
 * so the shore country a future port will sit on already has its
 * hinterland, and the treeline reads as a journey rather than a rule.
 */
export const PINEREACH = { x: 620, y: -190, r: 190 } as const;
export const PINEREACH_SOUTH = { x: 700, y: -30, r: 150 } as const;

/**
 * THE GLASSWATER — the lake Pinewatch watches across. The town holds
 * its south shore; the old wood holds the north; between them lies
 * water that nothing crosses. Except in a hard winter, when it
 * freezes end to end — which is what the watch is FOR.
 */
export const GLASSWATER = { x: 596, y: -224, r: 96 } as const;

/** The Thornveil — the dark wood between the lowlands and the climb. */
export const THORNVEIL = { x: -130, y: -70, r: 160 } as const;

/**
 * THE AMBERFEN — the wetland the First Road threads, and the water
 * that names Amberford: the ford over the amber fen. Two overlapping
 * hearts make a lake-chain with a narrow waist between them — reed
 * banks, sandbar crossings, willow islets — so the journey east reads
 * shore → narrows → causeway → ford instead of "some lakes happened".
 * Worldgen pulls elevation toward the wet line and lifts moisture
 * inside the fen; the noise still decides every shoreline.
 */
export const AMBERFEN_WEST = { x: 92, y: 40, r: 68 } as const;
export const AMBERFEN_EAST = { x: 206, y: 34, r: 66 } as const;

/**
 * THE SALT FLATS — the wet country past Saltmere's mere, where the
 * land finally runs out of lift and the water wins. The heart sits
 * south of the zone rect (the Amberfen law: hearts stay off the
 * canvas; the zone authors its own shoreline and the water edge
 * class carries it out), so the far shore reads as tidal flat and
 * brack-marsh on every seed.
 */
export const SALT_FLATS = { x: 356, y: 400, r: 64 } as const;

/**
 * Pinewatch — the town that watches the deep wood (the Pinereach
 * epic). Centre (584,-136): far enough north-east of Amberford that
 * the band march lands the whole of the town's country at TIER 4
 * (levels 22-34) and everything past the Glasswater or east of the
 * Wardline at tier 5. The town anchors as a HAVEN, the third: tier 0
 * on the muster yard, wild at the gates, and the old wood beyond the
 * line stays a frontier the town watches rather than one it holds.
 */
export const PINEWATCH_RECT: ZoneRect = { x: 520, y: -184, w: 128, h: 96 };

/**
 * THE RIMEWARD — ground RESERVED, not built. The Hoargate Road has to
 * end somewhere, and a road that ends nowhere is a road the plan is
 * lying about: this rect is the plan telling the truth. The scaffold
 * already keeps the frontier out of it (planned rects are treated
 * exactly like registered zones when siting camps), so whatever the
 * north turns out to be, it will not have to evict a bandit camp
 * first. Deliberately NOT aproned: until something stands here the
 * mountains should keep their crags right up to the road's last
 * milepost.
 */
export const RIMEWARD_RECT: ZoneRect = { x: -400, y: -448, w: 128, h: 96 };

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
  /** Wetland hearts — elevation pulled to the wet line, moisture up. */
  fens: Landform[];
  /**
   * Open-water hearts — elevation pulled UNDER the water line and
   * deepening toward the heart. Where a fen deals a marsh mosaic
   * (half wet, half islet), a mere deals a lake: deep core, wading
   * rim, an organic shore the base noise still draws.
   */
  meres: Landform[];
  /**
   * Taiga hearts — cold AND damp, because a pine stand needs both.
   * The cold decides the species, the damp decides that there is a
   * canopy at all; one landform carries the pair so a forest is
   * authored as a forest and not as two coincidences.
   */
  pinelands: Landform[];
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
      // Dawnmead's east lane mouth to Amberford's Fordgate: the first
      // journey, laid THROUGH the Amberfen with intent. It swings
      // SOUTH around the west heart's open water (the scenic shore
      // miles), climbs back through the waist between the two hearts
      // (the narrows — and the toll camp's hunting ground), runs the
      // NORTH shore of the east heart, and descends to the ford.
      // Serpentine on purpose: ~326 tiles of road where the crow
      // flies 296 — the distance IS the design. Tier 1-2 throughout.
      pts: [
        { x: 0, y: 48 },
        { x: 28, y: 56 },
        { x: 56, y: 66 },
        { x: 86, y: 74 },
        { x: 118, y: 62 },
        { x: 144, y: 48 },
        { x: 166, y: 38 },
        { x: 186, y: 20 },
        { x: 208, y: 4 },
        { x: 236, y: 8 },
        { x: 264, y: 20 },
        { x: 296, y: 36 },
      ],
    },
    {
      id: 'high_road',
      name: 'The High Road',
      kind: 'road',
      // Amberford's north gate to Silverfall's south gate: the game's
      // great journey. Foothills (T2), the Thornveil crossing (T3),
      // then crag country past the Last Lamp (T4-5). The eastern leg
      // arcs over the Amberfen's north rim into the old foothill line
      // at (140,-56) — everything west of there is untouched ground
      // (fernway_rest and the Thornveil Fork keep their pins).
      pts: [
        { x: 350, y: -15 },
        { x: 312, y: -42 },
        { x: 258, y: -56 },
        { x: 196, y: -60 },
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
      id: 'salt_road',
      name: 'The Salt Road',
      kind: 'road',
      // Amberford's South Gate to Saltmere's landward gate: the road
      // the salt built. It leans west off the fen tail's damp ground,
      // swings back east over the heath shelf, and runs the last dry
      // league straight at the water. Tier 1 at the fields, tier 2
      // past the halfway lamp, tier 3 to the gate — the first road
      // that expects a made character (L15+), and says so at both
      // ends.
      pts: [
        { x: 348, y: 62 },
        { x: 344, y: 84 },
        { x: 338, y: 108 },
        { x: 346, y: 132 },
        { x: 360, y: 152 },
        { x: 368, y: 176 },
        { x: 362, y: 200 },
        { x: 350, y: 222 },
        { x: 348, y: 238 },
        { x: 354, y: 256 },
      ],
    },
    {
      id: 'timber_road',
      name: 'The Timber Road',
      kind: 'road',
      // Amberford's EAST GATE to Pinewatch's south gate: the long way
      // round, and the only way a loaded timber wain can come. It runs
      // the open lowland due east until the land tilts, turns north up
      // the coast country under the Pinereach's southern arm, and
      // comes at the town from below so the lake is the last thing you
      // see, not the first. ~386 tiles against the Sparway's 211 — the
      // distance IS the safety, because three havens sit on it and
      // nothing sits on the trail.
      pts: [
        { x: 408, y: 44 },
        { x: 456, y: 38 },
        { x: 506, y: 28 },
        { x: 556, y: 16 },
        { x: 604, y: 2 },
        { x: 644, y: -20 },
        { x: 666, y: -50 },
        { x: 660, y: -78 },
        { x: 620, y: -80 },
        { x: 584, y: -89 },
      ],
    },
    {
      id: 'sparway',
      name: 'The Sparway',
      kind: 'trail',
      // The mast-cutters' shortcut: Amberford's north gate to
      // Pinewatch's west gate, straight through the Pinereach's heart.
      // Half the distance, none of the lamps, and the tier-4 wood does
      // not care that you are in a hurry. Forks off the High Road's
      // first waypoint, so both ways out of Amberford leave by a gate
      // that already exists.
      pts: [
        { x: 350, y: -15 },
        { x: 382, y: -42 },
        { x: 416, y: -70 },
        { x: 450, y: -96 },
        { x: 486, y: -118 },
        { x: 520, y: -136 },
      ],
    },
    {
      id: 'hoargate_road',
      name: 'The Hoargate Road',
      kind: 'road',
      // Silverfall's Postern Lane to the top of the world. It leaves
      // the city's north hem, runs the aproned shelf under the crags,
      // climbs the vale the massif leaves open at x -338..-306, and
      // passes the Hoargate itself — the garrison across the narrows.
      // North of the gate the road keeps going for a while and then
      // the maps stop, which is exactly what the signage says.
      pts: [
        { x: -204, y: -224 },
        { x: -216, y: -240 },
        { x: -244, y: -248 },
        { x: -278, y: -252 },
        { x: -306, y: -258 },
        { x: -320, y: -272 },
        { x: -322, y: -292 },
        { x: -328, y: -316 },
        { x: -334, y: -344 },
        { x: -338, y: -372 },
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
    // space BETWEEN safeties is the game. PINNED to the dry bank
    // above the south-shore bend (the fen owns most of its cell now,
    // so the honest scan has no room): the camp watches the one
    // stretch where the road has water on one side and them on the
    // other.
    { id: 'first_road_toll', defId: 'bandit_camp', x: 120, y: 78 },
    // The broken tower on the High Road's first climb.
    { id: 'first_climb_tower', defId: 'watchtower_ruin', cell: [1, -1] },
    // THE TOLLHOUSE (factions Phase 4): the Red Company's one open
    // door — a bar across the first climb where the Company talks
    // before it takes. Beside the High Road north of Amberford, its
    // own macro-cell per the authored-sites law.
    { id: 'company_tollhouse', defId: 'company_tollhouse', x: 300, y: -60 },
    // THE FENSIDE CROFTS — the mid-journey haven: fisher-crofters on
    // the waist between the fen's two hearts, a lamp and a larder at
    // the halfway mark so the long walk east has a place to breathe.
    { id: 'fenside_crofts', defId: 'roadside_hamlet', x: 152, y: 32 },
    // THE GULLMOOR REST — the Salt Road's halfway lamp, where the
    // heath opens and the gulls start winning arguments. The last
    // roof before the tier-3 league; south of here the road trusts
    // you to be ready.
    { id: 'gullmoor_rest', defId: 'waystation', x: 352, y: 158 },
    // THE TIMBER ROAD'S TWO LAMPS — the long way's whole argument.
    // Each is a HAVEN, and a haven relieves the danger field around
    // it, so the lamped road genuinely bands lower than the wood the
    // Sparway walks through. The lamp is the safety; it always was.
    // They sit on the road's BACK half by design: the first league
    // out of Amberford is tier 1-2 and needs nobody's fire, and every
    // macro-cell an authored site claims is a cell the living
    // frontier can never grow anything in (the one-site-per-cell
    // law). The Sparway is deliberately given NOTHING — its terror is
    // whatever the scaffold rolls there, which is the point: the
    // shortcut is dangerous because it is unwatched, not because a
    // designer parked a den on it.
    { id: 'pinehollow_rest', defId: 'roadside_hamlet', x: 674, y: -56 },
    { id: 'hollow_watch', defId: 'wardens_outpost', x: 612, y: -16 },
    // PAST THE WARDLINE: the axe-thieves in the old wood east of
    // Pinewatch, cutting the great spars nobody is allowed to cut.
    // The town's quest spine has a physical address.
    { id: 'wardline_cut', defId: 'timber_poachers', cell: [5, -2] },
    // THE HOARGATE — the garrison across the pass, and the last
    // authored thing before the Rimeward.
    { id: 'hoargate', defId: 'hoargate_watch', x: -334, y: -262 },
    // The shelf walk under Silverfall's crags gets one roof.
    { id: 'spineshelf_rest', defId: 'waystation', x: -232, y: -236 },
  ],
  anchors: SETTLED_ANCHORS.map((a) => ({ ...a })),
  massifs: [
    { id: 'silverspine', ...SILVERSPINE },
    { id: 'spinewall_east', ...SPINEWALL_EAST },
    { id: 'spinewall_south', ...SPINEWALL_SOUTH },
  ],
  veils: [{ id: 'thornveil', ...THORNVEIL }],
  fens: [
    { id: 'amberfen_west', ...AMBERFEN_WEST },
    { id: 'amberfen_east', ...AMBERFEN_EAST },
    { id: 'salt_flats', ...SALT_FLATS },
  ],
  meres: [
    { id: 'kingswater', ...KINGSWATER },
    { id: 'coldtarn', ...COLDTARN },
    { id: 'glasswater', ...GLASSWATER },
  ],
  pinelands: [
    { id: 'pinereach', ...PINEREACH },
    { id: 'pinereach_south', ...PINEREACH_SOUTH },
  ],
  planned: [
    { id: 'dawnmead', name: 'Dawnmead', ...DAWNMEAD_RECT },
    { id: 'amberford', name: 'Amberford', ...AMBERFORD_RECT, apron: true },
    { id: 'silverfall', name: 'Silverfall', ...SILVERFALL_RECT, apron: true },
    { id: 'saltmere', name: 'Saltmere', ...SALTMERE_RECT, apron: true },
    { id: 'pinewatch', name: 'Pinewatch', ...PINEWATCH_RECT, apron: true },
    { id: 'rimeward', name: 'The Rimeward', ...RIMEWARD_RECT },
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
const FENS: Landform[] = [];
const MERES: Landform[] = [];
const PINELANDS: Landform[] = [];

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
    fens: FENS.map((f) => ({ ...f })),
    meres: MERES.map((m) => ({ ...m })),
    pinelands: PINELANDS.map((p) => ({ ...p })),
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
  refill(FENS, (def.fens ?? []).map((f) => ({ ...f })));
  refill(MERES, (def.meres ?? []).map((m) => ({ ...m })));
  refill(PINELANDS, (def.pinelands ?? []).map((p) => ({ ...p })));
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
      if (a.dread !== undefined && (!isInt(a.dread) || a.dread < 1 || a.dread > 3)) {
        errors.push(`${at}.dread must be an integer in [1, 3] (or absent)`);
        continue;
      }
      if (a.dread !== undefined && a.haven) {
        errors.push(`${at} cannot be a haven and a dread at once`);
        continue;
      }
      anchors.push({
        x: a.x,
        y: a.y,
        safeR: a.safeR,
        ...(a.haven ? { haven: true } : {}),
        ...(a.dread !== undefined ? { dread: a.dread } : {}),
      });
    }
  }

  const landforms = (
    kind: 'massifs' | 'veils' | 'fens' | 'meres' | 'pinelands',
    optional = false,
  ): Landform[] => {
    const out: Landform[] = [];
    const list = r[kind];
    const seen = new Set<string>();
    if (!Array.isArray(list)) {
      // Fens, meres and pinelands all joined the plan after ship — an
      // older doc simply has none, and must still load.
      if (!optional) errors.push(`${kind} must be an array`);
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
  const fens = landforms('fens', true);
  const meres = landforms('meres', true);
  const pinelands = landforms('pinelands', true);

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
  return {
    ok: true,
    def: { routes, sites, anchors, massifs, veils, fens, meres, pinelands, planned },
  };
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
    if (a.dread) continue; // bad country is never housed in a town
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

/** Radial falloff for the fens' wet (1 at a heart, 0 past every rim). */
export function fenAt(tx: number, ty: number): number {
  let s = 0;
  for (const f of FENS) {
    const v = 1 - Math.hypot(tx - f.x, ty - f.y) / f.r;
    if (v > s) s = v;
  }
  return s;
}

/**
 * Radial falloff for the meres' open water (1 at a heart, 0 past
 * every rim). Worldgen pulls elevation under the water line by this,
 * deepening toward the heart — the lake's floor, not its mood.
 */
export function mereAt(tx: number, ty: number): number {
  let s = 0;
  for (const m of MERES) {
    const v = 1 - Math.hypot(tx - m.x, ty - m.y) / m.r;
    if (v > s) s = v;
  }
  return s;
}

/**
 * Radial falloff for the pinelands (1 at a heart, 0 past every rim).
 * Read TWICE by worldgen — once by the cold field that decides which
 * species takes the stand, once by the moisture field that decides
 * whether a stand closes into canopy at all.
 */
export function pinelandAt(tx: number, ty: number): number {
  let s = 0;
  for (const p of PINELANDS) {
    const v = 1 - Math.hypot(tx - p.x, ty - p.y) / p.r;
    if (v > s) s = v;
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

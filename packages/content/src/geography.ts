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
 * Hartfell — the town past the treeline (the Hartfell epic). Centre
 * (848,-400): ~322 tiles beyond Pinewatch's muster yard, deep in the
 * tier-5 base band, which is the design — the fourth HAVEN's relief
 * grades the walk-out to tier 3 at the walls (levels 15-24), tier 4 a
 * stone's throw on (22-34), tier 5 past that (32-48): a 25-35 onion
 * with no dial touched. The rect sits in the crook the noise already
 * dug: the cold Graywater laps the west flank, the Darkwater's arm
 * touches the north-east corner, and the little spring hollow at the
 * centre-east is the Kettle — the one warm water in the north, and
 * the whole reason a town can live past the trees.
 */
export const HARTFELL_RECT: ZoneRect = { x: 784, y: -440, w: 128, h: 96 };

/**
 * THE BARROWDEEP — ground RESERVED, not built (the Rimeward law: a
 * road that ends nowhere is a road the plan is lying about). The
 * Cairn Path climbs from Hartfell's north wicket through the dell
 * country and ends here, at the foot of the great mound nobody has
 * opened — the door a future delve epic gets to knock on. NOT
 * aproned: the barrow fells keep their crags and their sunken ways
 * right up to the last stone.
 */
export const BARROWDEEP_RECT: ZoneRect = { x: 776, y: -528, w: 80, h: 56 };

/**
 * THE CAIRNFELL — the north wall above the Barrowdeep. The base noise
 * already stands crag country on both shoulders; this heart closes
 * the saddle between them so the fell country ENDS somewhere the eye
 * can read: south of it, dells and barrows and the town's lamps;
 * north of it, stone and weather and no more map.
 */
export const CAIRNFELL = { x: 800, y: -580, r: 110 } as const;

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

/**
 * Kingsdelf — the town in the King's Delf (the seventh town, the
 * Kingsdelf epic; docs/kingsdelf-plan.md). Centre (-256, 288): ~307
 * tiles from Dawnmead's hearth, deep in the tier-5 base band, which is
 * the design — the FIFTH haven's relief grades the walk-out, the far
 * country stays 32-48, and the Brand's dread heart north-west is the
 * first ground in the game that reads the Overband (tier 6, 44-60).
 * The quarry bowl that cut the Old Crown's stone, and the town the
 * Returning built inside it.
 */
export const KINGSDELF_RECT: ZoneRect = { x: -320, y: 240, w: 128, h: 96 };

/**
 * THE OLDCROWN — ground RESERVED, not built (the Rimeward law: a road
 * that ends nowhere is a road the plan is lying about). The buried
 * capital of the realm before the Silver Line, behind the Brand's west
 * shoulder; the Processional has to end at a door, and this is the
 * door a future delve epic gets to open. Deliberately NOT aproned —
 * the ash keeps the old streets until somebody sweeps them.
 */
export const OLDCROWN_RECT: ZoneRect = { x: -520, y: 96, w: 96, h: 64 };

/**
 * THE BRAND — the burned mountain of the south-west. A star fell on
 * the old realm's quarry-mountain a hundred and fifty years ago and it
 * has smoldered ever since: crag country over the old high workings,
 * ember-light in the seams at night, and the reason the Old Crown is a
 * memory. The massif formalizes the crag knot the base noise already
 * deals north-west of the delf; the matching dread-3 anchor (danger.ts)
 * opens the Overband over its heart — the one tier-6 ground in the
 * Dawnlands, and the whole reason a level-50 character walks south.
 */
export const THE_BRAND = { x: -320, y: 104, r: 110 } as const;

/**
 * THE ASHMERE — the drowned lower workings. When the Brandfall ended
 * the delf, the deepest old pits flooded grey; the lake keeps its
 * galleries and its silt and, the fishers say, some of its tools. The
 * heart sits OFF the zone rect (the Amberfen heart law): the town
 * authors its own sump and quay, and the border's edge class carries
 * the water out to the true shore.
 */
export const ASHMERE = { x: -368, y: 368, r: 80 } as const;

/**
 * THE ASHMARCH — the burn country: the Brand's skirt of ash, where the
 * wind salts the ground and the stands die standing. A SCORCH landform
 * (the pineland's opposite): worldgen pulls moisture DOWN across it so
 * the march reads as open dead heath — sparser than meadow, never
 * painted black (the density lesson) — and the chunk dresser converts
 * canopy to standing dead wood at a scorch-scaled rate.
 */
export const ASHMARCH = { x: -296, y: 176, r: 150 } as const;

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
  /**
   * Burn hearts — the pineland's opposite. Moisture pulled DOWN so a
   * named burn reads as open dead country on every seed; the chunk
   * dresser kills canopy across it at a scorch-scaled rate. One
   * landform carries the pair so a burn is authored as a burn and not
   * as two coincidences (the pineland's own law, run backwards).
   */
  scorches: Landform[];
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
      // journey, laid AROUND the Amberfen the way carts actually go.
      // It drops south along Dawnmead's hem, crosses the reed flats
      // on the one sand causeway the fen deals at its southern edge,
      // climbs onto the dry south-shore belt (the scenic shore miles
      // — and the toll camp's hunting ground, water on one hand and
      // brigands on the other), touches the waist's foot below the
      // Fenside Crofts, then walks the long sand shore under the
      // south lobe and rises east to the ford. Serpentine on purpose:
      // ~390 tiles of road where the crow flies 296 — the distance IS
      // the design, and not one tile of it is causeway over open
      // water (THE SHORT SPAN LAW: the fen's cores are moats; the
      // road earns the far bank with shore miles, not impossible
      // bridgework). Tier 1-2 throughout.
      pts: [
        { x: 0, y: 48 },
        { x: 4, y: 58 },
        { x: 10, y: 70 },
        { x: 10, y: 80 },
        { x: 12, y: 90 },
        { x: 18, y: 94 },
        { x: 34, y: 95 },
        { x: 44, y: 92 },
        { x: 52, y: 86 },
        { x: 64, y: 82 },
        { x: 80, y: 81 },
        { x: 94, y: 80 },
        { x: 106, y: 76 },
        { x: 120, y: 73 },
        { x: 130, y: 70 },
        { x: 146, y: 60 },
        { x: 152, y: 46 },
        { x: 166, y: 53 },
        { x: 190, y: 54 },
        { x: 220, y: 50 },
        { x: 240, y: 44 },
        { x: 264, y: 38 },
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
      // the salt built. The fen tail's lake laps the town's own south
      // hem, so the road does what salt carts have always done: it
      // works the EAST SHORE — out of the gate onto the sand hem,
      // down the waterline league, then east over the heath shelf
      // where the marsh widens, and back west across the dry sand fan
      // below the wet country to pick up the straight run south. The
      // whole north half is shore road with the water on the right
      // hand and the heath on the left; not one tile of causeway
      // (THE SHORT SPAN LAW: the fen's cores are moats, not fords).
      // Tier 1 at the fields, tier 2 past the halfway lamp, tier 3 to
      // the gate — the first road that expects a made character
      // (L15+), and says so at both ends.
      pts: [
        { x: 348, y: 62 },
        { x: 355, y: 63 },
        { x: 358, y: 67 },
        { x: 359, y: 74 },
        { x: 360, y: 88 },
        { x: 366, y: 100 },
        { x: 369, y: 106 },
        { x: 377, y: 110 },
        { x: 392, y: 113 },
        { x: 404, y: 118 },
        { x: 410, y: 126 },
        { x: 416, y: 134 },
        { x: 418, y: 142 },
        { x: 416, y: 148 },
        { x: 410, y: 153 },
        { x: 394, y: 154 },
        { x: 378, y: 155 },
        { x: 366, y: 158 },
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
      // the open lowland due east until the braid-water country
      // starts, then does what a wain must: turns NORTH up the dry
      // shelf and rounds the whole mosaic on its top edge (the braids
      // stay on the carter's right hand the entire league — scenery,
      // never causeway; THE SHORT SPAN LAW), then east under the
      // Pinereach's southern arm and at the town from below so the
      // lake is the last thing you see, not the first. ~400 tiles
      // against the Sparway's ~230 — the distance IS the safety,
      // because three havens sit on it and nothing sits on the trail.
      pts: [
        { x: 408, y: 44 },
        { x: 456, y: 38 },
        { x: 500, y: 28 },
        { x: 514, y: 10 },
        { x: 514, y: -8 },
        { x: 520, y: -22 },
        { x: 560, y: -24 },
        { x: 604, y: -21 },
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
      // The mast-cutters' shortcut. It forks off the Timber Road at
      // the exact bend where the wains give up and turn north around
      // the braid country — and goes STRAIGHT instead: due north up
      // the one dry seam east of the Blackpine's meres, through the
      // heart of the dread ring, to Pinewatch's west gate. Half the
      // distance, none of the lamps, and the tier the Blackpine deals
      // does not care that you are in a hurry. Dry the whole way BY
      // the land's own accident (the wet country ends at the seam) —
      // a hunter's track wades nothing; it just walks where the
      // ground lets it and pays in danger instead.
      pts: [
        { x: 514, y: -8 },
        { x: 492, y: -32 },
        { x: 482, y: -60 },
        { x: 482, y: -90 },
        { x: 494, y: -114 },
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
      id: 'hartway',
      name: 'The Hartway',
      kind: 'road',
      // The drovers' road: the Timber Road's last-league waypoint
      // below Pinewatch to Hartfell's south gate. It forks BELOW the
      // town on purpose — every wain north rolls past Pinewatch's
      // walls first, so the two towns stay stapled together — then
      // climbs the east country: through the pine belt, over the
      // Sunken Mile (the one dell the grade cuts straight through),
      // across the beck braids on plank spans, up the isthmus between
      // the tarn chains, and out of the trees onto the open fell. One
      // road in, no shortcut, lamped with Hartfell's own tallow: the
      // north's whole lesson about safety is STAY ON THE ROAD.
      pts: [
        { x: 660, y: -78 },
        { x: 682, y: -100 },
        { x: 708, y: -122 },
        { x: 734, y: -142 },
        { x: 752, y: -166 },
        { x: 768, y: -190 },
        { x: 784, y: -214 },
        { x: 800, y: -236 },
        { x: 824, y: -256 },
        { x: 830, y: -270 },
        { x: 832, y: -284 },
        { x: 843, y: -292 },
        { x: 842, y: -306 },
        { x: 838, y: -322 },
        { x: 836, y: -336 },
        { x: 838, y: -345 },
      ],
    },
    {
      id: 'cairn_path',
      name: 'The Cairn Path',
      kind: 'trail',
      // The old processional way: Hartfell's north wicket, up through
      // the dell country past the Quiet Stones, to the Barrowdeep's
      // door. The tithe sledge uses the first half of it every
      // slaughter-day; nothing living uses the rest. It grades
      // through the dells as a hollow-way — a track worn below its
      // own banks by feet older than any road the Crown ever cut.
      pts: [
        { x: 810, y: -440 },
        { x: 812, y: -458 },
        { x: 806, y: -476 },
        { x: 804, y: -490 },
      ],
    },
    {
      id: 'old_road',
      name: 'The Old Road',
      kind: 'road',
      // Dawnmead's south hem to Kingsdelf's east gate: the road the
      // quarrymen fled up a hundred and fifty years ago, walked the
      // other way. Built by the Old Crown — which is why it is a ROAD
      // and not a trail: the grade and the bones of the paving are
      // older than every other road on this map — and UNLIT, because
      // the Waykeepers never accepted it (the one dark road in the
      // Dawnlands; the town's standing grievance, and a quest lamp by
      // lamp). It drops south through the open meadow country, swings
      // west of the crag knots, threads the corridor between the
      // drowned finger-lake and the east woods, and turns west for
      // the gate with the water on the right hand and the burn beyond
      // it — the toll-camp story, retold at tier 4-5. The band march
      // does the rest: tier 1 at Dawnmead's hem, 5 before the walls.
      pts: [
        { x: -64, y: 80 },
        { x: -76, y: 96 },
        { x: -92, y: 112 },
        { x: -104, y: 130 },
        { x: -112, y: 148 },
        { x: -124, y: 160 },
        { x: -136, y: 178 },
        { x: -150, y: 192 },
        { x: -164, y: 202 },
        { x: -166, y: 218 },
        { x: -166, y: 234 },
        { x: -164, y: 248 },
        { x: -162, y: 257 },
        { x: -178, y: 259 },
        { x: -194, y: 260 },
      ],
    },
    {
      id: 'processional',
      name: 'The Processional',
      kind: 'trail',
      // The old realm's paved approach to its own capital, ash-buried
      // and unwalked — by the living. It leaves Kingsdelf's north
      // wicket, runs the corridor between the Brand's east face and
      // the drowned finger, crosses the burn THROUGH the dread heart
      // (the first tier-6 walk in the game — the trail is passable
      // because a route calms its own ribbon; everything beside it is
      // the Overband, which is the point), rounds the mountain's
      // north shoulder past the little tarn, and comes down to the
      // Oldcrown's buried east gate. The dead walk it home by night.
      pts: [
        { x: -260, y: 240 },
        { x: -252, y: 214 },
        { x: -248, y: 188 },
        { x: -252, y: 162 },
        { x: -262, y: 128 },
        { x: -272, y: 100 },
        { x: -282, y: 76 },
        { x: -288, y: 62 },
        { x: -300, y: 48 },
        { x: -316, y: 46 },
        { x: -336, y: 46 },
        { x: -360, y: 48 },
        { x: -388, y: 60 },
        { x: -408, y: 76 },
        { x: -424, y: 92 },
        { x: -436, y: 110 },
      ],
    },
    {
      id: 'hunters_trail',
      name: "The Hunter's Trail",
      kind: 'trail',
      // Dawnmead's north hem to the Thornveil Fork: the unlit shortcut
      // that threads the wolf dens. Saves half the journey, costs the
      // safety — the map's lesson about roads, taught by counterexample.
      // The last league hooks around the fork tarn's SOUTH shore on
      // the sand (hunters know the dry line; nobody wades a tarn in
      // wolf country) and comes up its west bank to the fork.
      pts: [
        { x: -64, y: 15 },
        { x: -52, y: -8 },
        { x: -72, y: -40 },
        { x: -104, y: -68 },
        { x: -116, y: -76 },
        { x: -130, y: -78 },
        { x: -146, y: -78 },
        { x: -146, y: -92 },
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
    { id: 'hollow_watch', defId: 'wardens_outpost', x: 612, y: -13 },
    // PAST THE WARDLINE: the axe-thieves in the old wood east of
    // Pinewatch, cutting the great spars nobody is allowed to cut.
    // The town's quest spine has a physical address.
    { id: 'wardline_cut', defId: 'timber_poachers', cell: [5, -2] },
    // THE HARTWAY'S ONE ROOF — a walled fire at the halfway mark,
    // exactly where the band runs deepest. Pinewatch's relief covers
    // the fork; Hartfell's covers the last league; this covers the
    // drove that has to sleep once in between.
    { id: 'drovers_fire', defId: 'waystation', x: 794, y: -218 },
    // THE DIGGERS' CAMP — the Red Company's spades below the
    // Barrowfell, pitched beside the Cairn Path where the sledge road
    // meets the dells. Hartfell's quest spine has a physical address;
    // breaking it sets poi_diggers_broken and the fell breathes out.
    { id: 'diggers_camp', defId: 'barrow_diggers', x: 798, y: -464 },
    // THE HOLLOW BARROW — one opened mound guaranteed in the near
    // fells (the archetype also rolls naturally across the high
    // country; this one is the story's). Cell-forced: the honest scan
    // finds it standable ground west of the beck chain, and a barrow
    // is exactly the kind of place that is allowed to be far from a
    // road.
    { id: 'hollow_barrow', defId: 'fell_barrow', cell: [5, -4] },
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
    { id: 'cairnfell', ...CAIRNFELL },
    { id: 'the_brand', ...THE_BRAND },
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
    { id: 'ashmere', ...ASHMERE },
  ],
  pinelands: [
    { id: 'pinereach', ...PINEREACH },
    { id: 'pinereach_south', ...PINEREACH_SOUTH },
  ],
  scorches: [{ id: 'ashmarch', ...ASHMARCH }],
  planned: [
    { id: 'dawnmead', name: 'Dawnmead', ...DAWNMEAD_RECT },
    { id: 'amberford', name: 'Amberford', ...AMBERFORD_RECT, apron: true },
    { id: 'silverfall', name: 'Silverfall', ...SILVERFALL_RECT, apron: true },
    { id: 'saltmere', name: 'Saltmere', ...SALTMERE_RECT, apron: true },
    { id: 'pinewatch', name: 'Pinewatch', ...PINEWATCH_RECT, apron: true },
    { id: 'hartfell', name: 'Hartfell', ...HARTFELL_RECT, apron: true },
    { id: 'barrowdeep', name: 'The Barrowdeep', ...BARROWDEEP_RECT },
    { id: 'rimeward', name: 'The Rimeward', ...RIMEWARD_RECT },
    { id: 'kingsdelf', name: 'Kingsdelf', ...KINGSDELF_RECT, apron: true },
    { id: 'oldcrown', name: 'The Oldcrown', ...OLDCROWN_RECT },
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
const SCORCHES: Landform[] = [];

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
    scorches: SCORCHES.map((s) => ({ ...s })),
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
  refill(SCORCHES, (def.scorches ?? []).map((s) => ({ ...s })));
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
    kind: 'massifs' | 'veils' | 'fens' | 'meres' | 'pinelands' | 'scorches',
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
  const scorches = landforms('scorches', true);

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
    def: { routes, sites, anchors, massifs, veils, fens, meres, pinelands, scorches, planned },
  };
}

/**
 * THE SHORT SPAN LAW — the longest bridge deck a route may lay. A
 * fantasy road bridges necks and river mouths, not lakes: anything
 * longer than a dozen tiles of deck reads as an impossible causeway,
 * so the route walks the shore instead. Trails throw plank spans and
 * get even less. Deep water (the lakes' cores) is never bridged at
 * all — those stay moats, the sandbar law's older promise.
 */
export const ROAD_SPAN_MAX = 12;
export const TRAIL_SPAN_MAX = 8;

/** One contiguous run of Bridge deck a route lays across water. */
export interface BridgeDeck {
  /** Route whose surface claimed the most deck tiles. */
  routeId: string;
  trail: boolean;
  /** Longer side of the deck's bounding box — the span as the eye reads it. */
  span: number;
  /** Total deck tiles (a 3-wide crossing counts them all). */
  tiles: number;
  /** Deck tiles over deep water (elevation < 0.3) — the cores. */
  deep: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Every bridge deck a DRAFT plan would lay, measured with the same
 * wander the carve uses — the exact tiles generateChunk will turn
 * into Tile.Bridge, flood-filled into contiguous decks. Judges
 * `def.routes`, never the live registry, so the studio can counsel a
 * work-in-progress plan (the draftDist law). Elevation is injected
 * because worldgen imports this module: pass a sampler seeded like
 * the world, e.g. `(x, y) => elevationAt(seed, x, y)`.
 */
export function routeBridgeDecks(
  def: GeographyDef,
  seed: number,
  elevAt: (tx: number, ty: number) => number,
): BridgeDeck[] {
  // The gather reach: wander (2.2) + road half-width (1.6) + slack.
  const GATHER = 6;
  interface DraftBound {
    route: RoadRoute;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }
  const bounds: DraftBound[] = def.routes.map((route) => {
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
  // The carve's own question, asked of the draft: nearest wandered
  // route surface at a tile (ties to road over trail, like roadHitAt).
  const draftHit = (tx: number, ty: number): { dist: number; route: RoadRoute } | null => {
    let wx = 0;
    let wy = 0;
    let warped = false;
    let best = Infinity;
    let bestRoute: RoadRoute | null = null;
    for (const b of bounds) {
      if (tx < b.x0 - ROAD_PAD || tx > b.x1 + ROAD_PAD || ty < b.y0 - ROAD_PAD || ty > b.y1 + ROAD_PAD) {
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
        if (d < best || (d === best && !isTrail && bestRoute?.kind === 'trail')) {
          best = d;
          bestRoute = b.route;
        }
      }
    }
    return bestRoute === null ? null : { dist: best, route: bestRoute };
  };
  // Candidate tiles near any polyline, then the actual deck tiles.
  const deck = new Map<string, { deep: boolean; route: RoadRoute }>();
  for (const b of bounds) {
    const pts = b.route.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const q = pts[i + 1]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(q.x - a.x, q.y - a.y)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(a.x + (q.x - a.x) * t);
        const cy = Math.round(a.y + (q.y - a.y) * t);
        for (let dy = -GATHER; dy <= GATHER; dy++) {
          for (let dx = -GATHER; dx <= GATHER; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            const key = `${x},${y}`;
            if (deck.has(key)) continue;
            // Inside a planned rect the zone's authored ground overlays
            // the carve, and the few tiles of hem just outside a border
            // belong to edge harmony (the border's authored intention
            // reshapes the raw field there — a gate's worn edge dries
            // its own mouth). Neither band is the raw field's to judge.
            if (def.planned.some((r) => distToRect(x, y, r) <= 4)) {
              continue;
            }
            const hit = draftHit(x, y);
            if (!hit) continue;
            if (hit.dist > (hit.route.kind === 'trail' ? TRAIL_HALF : ROAD_HALF)) continue;
            const e = elevAt(x, y);
            if (e < 0.37) deck.set(key, { deep: e < 0.3, route: hit.route });
          }
        }
      }
    }
  }
  // Flood-fill (8-adjacent) into contiguous decks.
  const seen = new Set<string>();
  const decks: BridgeDeck[] = [];
  for (const start of deck.keys()) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [start];
    const claims = new Map<string, number>();
    let tiles = 0;
    let deep = 0;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let anyRoute: RoadRoute | null = null;
    let bestClaim = 0;
    let claimant: RoadRoute | null = null;
    while (stack.length > 0) {
      const key = stack.pop()!;
      const cell = deck.get(key)!;
      const comma = key.indexOf(',');
      const x = Number(key.slice(0, comma));
      const y = Number(key.slice(comma + 1));
      tiles++;
      if (cell.deep) deep++;
      const n = (claims.get(cell.route.id) ?? 0) + 1;
      claims.set(cell.route.id, n);
      if (n > bestClaim) {
        bestClaim = n;
        claimant = cell.route;
      }
      anyRoute = cell.route;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nk = `${x + dx},${y + dy}`;
          if (!seen.has(nk) && deck.has(nk)) {
            seen.add(nk);
            stack.push(nk);
          }
        }
      }
    }
    const route = claimant ?? anyRoute!;
    decks.push({
      routeId: route.id,
      trail: route.kind === 'trail',
      span: Math.max(x1 - x0, y1 - y0) + 1,
      tiles,
      deep,
      x0,
      y0,
      x1,
      y1,
    });
  }
  return decks.sort((a, b) => b.span - a.span);
}

/**
 * Design advice over a VALID plan — the studio's counsel, never a
 * gate. Each warning names its subject so the World view can badge it.
 *
 * Pass `elevAt` (a seeded elevation sampler, `(x, y) =>
 * elevationAt(seed, x, y)`) to also judge the SHORT SPAN LAW — the
 * counsel that needs terrain. Callers without worldgen in reach get
 * the structural counsel alone.
 */
export function geographyWarnings(
  def: GeographyDef,
  seed = 1337,
  elevAt?: (tx: number, ty: number) => number,
): string[] {
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
  // THE SHORT SPAN LAW — terrain counsel, only when the caller can
  // see the terrain.
  if (elevAt) {
    for (const deck of routeBridgeDecks(def, seed, elevAt)) {
      const max = deck.trail ? TRAIL_SPAN_MAX : ROAD_SPAN_MAX;
      if (deck.span > max) {
        warnings.push(
          `route '${deck.routeId}' lays a ${deck.span}-tile bridge deck at (${deck.x0},${deck.y0})..(${deck.x1},${deck.y1}) — the span law allows ${max}: cross at a neck or walk the shore`,
        );
      }
      if (deck.deep > 0) {
        warnings.push(
          `route '${deck.routeId}' bridges ${deck.deep} tile(s) of deep water near (${deck.x0},${deck.y0}) — bridges cross necks, never cores`,
        );
      }
    }
  }
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
 * Radial falloff for the scorches (1 at a heart, 0 past every rim).
 * The pineland run backwards: worldgen pulls moisture DOWN by it (a
 * burn is open dead country, sparser than meadow — the density
 * lesson), and the chunk dresser reads it again to kill canopy at a
 * scorch-scaled rate. Authored zones still own their ground: the zone
 * stamps its own tiles, and the edge-harmony blend carries the border's
 * intention outward exactly as it does for every moisture consumer.
 */
export function scorchAt(tx: number, ty: number): number {
  let s = 0;
  for (const b of SCORCHES) {
    const v = 1 - Math.hypot(tx - b.x, ty - b.y) / b.r;
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

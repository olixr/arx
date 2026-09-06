import {
  CHUNK_SIZE,
  Detail,
  Tile,
  emptyChunk,
  fbm,
  hashCoords,
  saplingOf,
  type ChunkData,
} from '@arx/shared';
import {
  COPSE_SALT,
  ELDER_SALT,
  FLOOR,
  FOREST_LAW,
  FOREST_LINE,
  HIGHLAND_SALT,
  OLD_WOOD_DAMP,
  canopyCoverAt,
  copseCoverAt,
  dampOf,
  floorSeatOf,
  latticeTreeAt,
  standGateAt,
} from './forest.js';
import {
  ROAD_APRON,
  ROAD_HALF,
  ROAD_SHOULDER,
  TRAIL_APRON,
  TRAIL_HALF,
  TRAIL_SHOULDER,
  fenAt,
  fieldApronAt,
  massifAt,
  mereAt,
  nearRoads,
  pinelandAt,
  roadDistanceAt,
  roadHitAt,
  scorchAt,
  thornveilAt,
  waystoneWayAt,
} from './geography.js';
import {
  EDGE_BASIN_DAMP_RANGE,
  EDGE_PLATEAU_DAMP_RANGE,
  edgeBlendElevation,
  edgeBlendMoisture,
  zoneFieldDampAt,
} from './zoneEdges.js';

/**
 * Procedural wilderness. Elevation and moisture fields pick a biome per
 * tile; density hashes place trees/rocks/details. Fully deterministic
 * from (seed, cx, cy).
 *
 * Elevation is gently lifted near the world origin so the authored town
 * region always sits on dry land and the coastline stays out past the
 * starter wilderness.
 *
 * TERRAIN LEVELS: where the elevation field crests, the land steps up
 * into true plateaus (level 1) and mesas (level 2); where the basin
 * field crests over flat inland ground, it steps DOWN into dells
 * (level −1) and quarries (level −2). Down is the same law as up,
 * relative: every level change is fenced by a ring of solid Cliff tiles
 * on the HIGH side of the boundary except where a walkable Ramp stair
 * crosses — that ring is the WHOLE collision story, so the per-tile
 * `elev` layer stays render-only and the editor/procgen never have to
 * agree about slopes. Ore lives where rock is exposed: talus boulders
 * at cliff feet, formations along plateau rims, the richest veins up on
 * the mesas, and a modest bonus seam on the quarry floors.
 */

/**
 * THE SHIPPED SEED — the one world everyone plays (THE GREAT WORLD
 * REGEN, 2026-08-14; before it the project lived its whole life on
 * 1337). This is the single source: server config defaults to it, the
 * editor's offline fallback reads it, and every test that pins a fact
 * about the shipped terrain imports it instead of hardcoding a number.
 * The authored geography (rects, routes, sites, hearts) is composed
 * against THIS seed's rivers and provinces — change it and the whole
 * plan must be re-threaded, which is a project, not an env edit.
 */
export const WORLD_SEED = 24601;

/**
 * THE LAND LEARNS COMPOSITION — the macro fields.
 *
 * The mid-frequency detail noise on its own deals statistically
 * identical speckle on every seed: no plains, no lake districts, no
 * provinces — confetti to the horizon. A continent-scale field under
 * it is what gives a seed an IDENTITY: regions where the macro runs
 * high read as broad dry grassland provinces, regions where it runs
 * low read as lake country, and the detail noise keeps every local
 * edge organic. The macro never decides a tile — it decides a REGION,
 * and the detail field argues every shoreline with it.
 */
function macroElevAt(seed: number, tx: number, ty: number): number {
  return fbm(seed + 130717, tx * 0.0032, ty * 0.0032, 2);
}

/**
 * THE RIVERS — the level-set law. The 0.5 contour of a slow, smooth
 * field is a family of long, connected, winding curves — exactly the
 * shape a river is, and exactly the shape blob-thresholding can never
 * deal. `riverRidgeAt` measures closeness to that contour (1 on the
 * centerline, falling off with distance); the carve pulls elevation
 * down toward the waterline along it, hardest at the center, so a
 * channel reads deep midstream with wadeable margins — and the
 * sandbar field still crests through the mid band, so fords happen
 * where the land says so, not where a designer parked one.
 *
 * The riverbed FLOORS AT 0.305 — above the 0.3 deep-water line — by
 * law: THE SHORT SPAN LAW forbids bridging deep water, and a river
 * the roads may never cross is a wall, not a river. (Lakes stay the
 * moats; rivers are the roads' honest adversary — crossable, at a
 * price, where the banks agree.) Width breathes with its own meander
 * field; town aprons dry the carve out entirely, and a massif heart
 * fades it so no canyon ever severs an authored pass.
 */
function riverRidgeAt(seed: number, tx: number, ty: number): number {
  const rn = fbm(seed + 60607, tx * 0.0045, ty * 0.0045, 2);
  return 1 - Math.abs(rn - 0.5) * 2;
}

const RIVER_BED = 0.305;

function riverCarveAt(seed: number, tx: number, ty: number): number {
  const ridge = riverRidgeAt(seed, tx, ty);
  // Meander: the banks breathe ±, so no reach is ever two ruled lines.
  const wob = (fbm(seed + 70809, tx * 0.02, ty * 0.02, 2) - 0.5) * 0.024;
  const t = 0.938 + wob;
  if (ridge <= t) return 0;
  return Math.min(1, (ridge - t) / (1 - t));
}

export function elevationAt(seed: number, tx: number, ty: number): number {
  const detail = fbm(seed, tx * 0.015, ty * 0.015, 4);
  // The macro provinces under the detail grain (composition law above).
  let elevation = detail * 0.62 + macroElevAt(seed, tx, ty) * 0.38;
  // Continental bias: dry land guaranteed around Dawnmead, the one
  // settled hearth the world grows out from.
  const distFromOrigin = Math.hypot(tx + 64, ty - 48);
  const lift = Math.max(0, 1 - distFromOrigin / 400);
  elevation = elevation * (1 - lift * 0.6) + 0.55 * lift * 0.6;
  // The Silverspine lift: the massif rides past the continental
  // shelf's edge, so the mountain province around Silverfall is high
  // dry ground on every seed — with room left in the blend for the
  // odd tarn where the base noise dips.
  const m = massifAt(tx, ty);
  if (m > 0) elevation = elevation * (1 - m * 0.5) + 0.62 * m * 0.5;
  // The Amberfen: inside a fen heart the land trades the continental
  // field for the fen's OWN marsh noise, centered on the waterline —
  // a dealt mosaic of lake, shallows, reed bank, and islet (roughly
  // half wet at a heart's core), immune to the Dawnmead lift that
  // would otherwise keep the lowland dry. The blend saturates toward
  // the heart and feathers at the rim, and 15% of the base field
  // always survives so islets keep the continent's grain.
  const fen = fenAt(tx, ty);
  if (fen > 0) {
    const marsh = 0.37 + (fbm(seed + 4242, tx * 0.03, ty * 0.03, 2) - 0.5) * 0.4;
    const k = Math.min(1, fen * 1.4) * 0.85;
    elevation = elevation * (1 - k) + marsh * k;
  }
  // THE MERES: a lake is not a wet meadow. Inside a mere heart the
  // land is pulled UNDER the water line and keeps sinking toward the
  // heart — deep core, wading rim, and a shore the base noise still
  // draws (a tenth of the field always survives, and the lake's own
  // slow noise ripples the depth so no shoreline is ever a circle).
  // Applied AFTER the massif so a tarn can drown a crag floor: the
  // level law reads elevation < 0.42 as flat, so a mere never fights
  // a cliff fence for the same tile — it simply cancels the plateau
  // and leaves crags standing at the waterline.
  const mere = mereAt(tx, ty);
  if (mere > 0) {
    const k = Math.min(1, mere * 1.6) * 0.9;
    const water = 0.3 - mere * 0.12 + (fbm(seed + 8181, tx * 0.02, ty * 0.02, 2) - 0.5) * 0.16;
    elevation = elevation * (1 - k) + water * k;
  }
  // THE RIVERS (composition law above): carve the channel toward the
  // bed, hardest midstream. Town aprons dry the carve to nothing and a
  // massif heart fades it, so no channel floods a gate or saws an
  // authored pass in half; everywhere else the river takes what the
  // ridge gives it — including straight through hill country, where
  // the flanking plateau fences read as a gorge on their own.
  const carve = riverCarveAt(seed, tx, ty);
  if (carve > 0) {
    const k = carve * (1 - fieldApronAt(tx, ty, 28)) * (1 - m * 0.85);
    if (k > 0) {
      const bed = RIVER_BED + (1 - carve) * 0.08;
      if (elevation > bed) elevation = elevation * (1 - k) + bed * k;
    }
  }
  // THE EDGE-HARMONY LAW: near a registered zone border the field
  // honors the border's authored intention — water edges keep flowing
  // outward as coves and creeks, sand continues as beach, and every
  // land edge lifts low ground so no procedural lake is ever sliced
  // ruler-straight by a zone rect.
  return edgeBlendElevation(seed, tx, ty, elevation);
}

/**
 * The highlands field is its OWN noise, decoupled from the continental
 * elevation that decides sea vs land — so mountains rise on any solid
 * ground, not just at the far fringe of the lift. Suppressed near the
 * authored town (flat, buildable) and over water.
 */
const PLATEAU_T1 = 0.615;
const PLATEAU_T2 = 0.705;

export function plateauFieldAt(seed: number, tx: number, ty: number): number {
  let f = fbm(seed + 31337, tx * 0.012, ty * 0.012, 3);
  // THE RANGES (composition law at elevationAt): a continent-scale
  // belt term clusters the crags into provinces — true highland belts
  // with open lowland leagues between them — instead of dealing the
  // same even speckle of mesas to every horizon. The detail noise
  // still cuts every rim and valley inside a belt.
  f += (fbm(seed + 90901, tx * 0.0035, ty * 0.0035, 2) - 0.5) * 0.34;
  // The Silverspine bias: crag country guaranteed around Silverfall —
  // mesa-dominant at the heart, breaking into plateaus and valley
  // floors toward the rim. The noise still decides every edge.
  f += massifAt(tx, ty) * 0.24;
  // The legacy Dawnmead radial. THE DAWN COMES OPEN grew the rect to
  // 192x224 about this same centre, so the corners now sit 147 tiles
  // out — the radius follows them, or a mesa cresting on a hem would
  // be flattened inside the rect and left standing just outside it.
  const distFromTown = Math.hypot(tx + 64, ty - 48);
  f -= Math.max(0, 1 - distFromTown / 176) * 0.45;
  // Planned-zone aprons: plateaus hold a short walk off new town
  // borders (their fence is on their own crown, so this is mostly
  // aesthetics: no cliff wall jammed against a gate). Strength 0.65
  // beats the theoretical field maximum (1.0 noise + 0.24 massif −
  // 0.65 < the level-1 threshold), so rect interiors are GUARANTEED
  // flat canvases for their zone builds. Registered-zone edges damp
  // the same way (the edge-harmony law) — except stark stone borders,
  // which WANT the crags crowding in.
  return (
    f -
    fieldApronAt(tx, ty, 28) * 0.65 -
    zoneFieldDampAt(tx, ty, EDGE_PLATEAU_DAMP_RANGE, true) * 0.65
  );
}

/**
 * The basins field mirrors the plateau field with its own seed offset:
 * where it crests over ordinary flat ground the land sinks into a dell
 * (−1) with, at the crest's heart, a quarry core (−2) — each ring gets
 * its own cliff fence and straight-edge stair, a stepped two-level
 * descent. Thresholds sit high on purpose: a few nice dells and
 * quarries, not swiss cheese.
 *
 * Suppression is stronger than the plateaus': a sink's cliff fence
 * lives on the HIGH side of its boundary, so a basin lapping an
 * authored zone's border would put the fence tile INSIDE the zone where
 * the overlay erases it (plateaus are safe — their fence is outside, on
 * their own crown). Basins therefore keep a generous distance from
 * the one overworld authored site: Dawnmead.
 */
const BASIN_T1 = 0.72;
const BASIN_T2 = 0.8;

/** Exported for tests: they search this field to find chunks with sinks. */
export function basinFieldAt(seed: number, tx: number, ty: number): number {
  const f = fbm(seed + 77713, tx * 0.012, ty * 0.012, 3);
  const distFromTown = Math.hypot(tx + 64, ty - 48);
  // Legacy Dawnmead radial + planned-zone rect aprons: a basin's
  // fence lives INSIDE its rim, so it keeps a generous distance from
  // every authored border, future ones included.
  return (
    f -
    Math.max(0, 1 - distFromTown / 200) * 0.6 -
    fieldApronAt(tx, ty, 64) * 0.6 -
    zoneFieldDampAt(tx, ty, EDGE_BASIN_DAMP_RANGE) * 0.6
  );
}

function levelOf(pf: number, bf: number, elevation: number): number {
  if (elevation < 0.42) return 0; // no mesas rising out of the sea
  if (pf > PLATEAU_T2) return 2;
  if (pf > PLATEAU_T1) return 1;
  // Sinks only cut ordinary dry land: never water, shoreline sand
  // (< 0.4), or the skirt of a plateau — a basin overlapping a rim
  // would fight the plateau's own fence for the same tiles.
  if (elevation < 0.45) return 0;
  return bf > BASIN_T2 ? -2 : bf > BASIN_T1 ? -1 : 0;
}

/**
 * Sandbar fords: an independent ridge field over the water. Where it
 * crests inside the MID-depth band the lake floor rises to wadeable
 * shallows — organic crossing bars that thread lakes without ever
 * bridging the deep cores. Exported for tests (and ford-hunting).
 */
export function sandbarAt(seed: number, tx: number, ty: number): boolean {
  return fbm(seed + 51151, tx * 0.035, ty * 0.035, 2) > 0.64;
}

/**
 * Moisture decides meadow vs forest and how thick the canopy grows.
 * The Thornveil bias guarantees the deep wood across Silverfall's
 * approach: near the veil's heart the whole band reads damp forest,
 * with the willow/moonbell thresholds coming into reach.
 */
export function moistureAt(seed: number, tx: number, ty: number): number {
  // The fen breathes damp over its whole reach: willow banks, reed
  // flats, and the herb layer (moonbell opens in the deepest wet).
  const m =
    fbm(seed + 9999, tx * 0.03, ty * 0.03, 3) +
    // THE WOODS COME IN BELTS (composition law at elevationAt): a
    // continent-scale term so forest happens as forests — belts and
    // broad woods with open meadow provinces between — never as
    // confetti stands dealt evenly to every league.
    (fbm(seed + 40405, tx * 0.0045, ty * 0.0045, 2) - 0.5) * 0.3 +
    // THE RIPARIAN RIBBON: banks drink from their own river. The
    // ridge field that carves the channel lends the last reach of its
    // skirt to moisture, so willow-green follows the water and a
    // river reads as a living seam even from the far shore.
    Math.max(0, riverRidgeAt(seed, tx, ty) - 0.82) * 1.1 +
    thornveilAt(tx, ty) * 0.3 +
    fenAt(tx, ty) * 0.22 +
    // A pineland is damp as well as cold: the taiga hearts close
    // their own canopy, and where the noise dips the stand opens
    // into the clearings a logging country needs.
    pinelandAt(tx, ty) * 0.3 -
    // A scorch is the pineland run backwards: the burn country reads
    // as open dead heath — canopy starved out, herb layer gone dry —
    // sparser than meadow, never painted black (the density lesson).
    scorchAt(tx, ty) * 0.45;
  // The edge-harmony law: an authored tree line keeps going as wild
  // forest; a road stub leaving a gate dries into an open clearing.
  return edgeBlendMoisture(seed, tx, ty, m);
}

/**
 * Cold decides where the taiga stands. A hard south→north ramp (the
 * world's north is negative y — Silverfall country) with fbm ragging
 * the treeline, so the pine front advances in tongues and islands,
 * never a ruled line. 0 in the warm south, 1 in the deep north; the
 * rag can never push a southern meadow over the pine threshold.
 *
 * THE PINELANDS lift it locally: latitude alone can only ever draw
 * horizontal bands, and the Pinereach is a PLACE — a great wood that
 * runs south down the east country long past the line where pine
 * should have given up. The lift is what lets a named forest walk
 * out of its own latitude and fade honestly as it goes.
 */
export function coldAt(seed: number, tx: number, ty: number): number {
  const lat = Math.min(1, Math.max(0, (-ty - 40) / 180));
  const rag = (fbm(seed + 31337, tx * 0.025, ty * 0.025, 2) - 0.5) * 0.35;
  // THE CANOPY HOLDS THE WARMTH: a veil is old broadleaf wood by
  // definition, and a closed broadleaf canopy buffers its own floor —
  // the pine front parts around a veil the way it parts around a
  // south slope. The term is inert at warm latitudes (the Thornveil's
  // cold sits far below every species threshold with or without it);
  // it exists so a high-latitude veil (the Everwood) deals oak and
  // willow and yew instead of borrowing the Pinereach's voice. The
  // falloff does the composition for free: pine fringe at the wood's
  // rim, old broadleaf at its hearts — the deeper in, the older it
  // reads, which is the Everwood's whole story told by the treeline.
  return Math.min(
    1,
    Math.max(0, lat + rag + pinelandAt(tx, ty) * 0.55 - thornveilAt(tx, ty) * 0.6),
  );
}


/** Signed terrain level (−2..2) at a world tile — the fields combined. */
export function levelAt(seed: number, tx: number, ty: number): number {
  return levelOf(
    plateauFieldAt(seed, tx, ty),
    basinFieldAt(seed, tx, ty),
    elevationAt(seed, tx, ty),
  );
}

export type GroundClass = 'water' | 'sand' | 'grass' | 'forest' | 'rock' | 'cave';

/**
 * Cheap terrain classifier for suitability scans (POI scaffolding):
 * answers "what kind of ground is here" from the fields alone, without
 * generating a chunk. 'rock' covers every non-flat terrain level —
 * plateaus, dells, and their cliff fences — because a site scan wants
 * FLAT, not climbable. This is a pre-filter: authored zones, player
 * builds, and per-tile hash content (trees, ore, chests) are invisible
 * to it, so any final check must read the live world.
 */
export function groundProbeAt(seed: number, tx: number, ty: number): GroundClass {
  const e = elevationAt(seed, tx, ty);
  if (e < 0.37) return 'water';
  if (e < 0.4) return 'sand';
  // The center's own level reuses the elevation already in hand —
  // levelAt(seed,tx,ty) would recompute the full elevation stack a
  // second time (this probe runs ~10^4 times per landmark site
  // decision; the neighbors below genuinely need their own samples).
  if (levelOf(plateauFieldAt(seed, tx, ty), basinFieldAt(seed, tx, ty), e) !== 0) return 'rock';
  // THE CLIFF-FOOT LAW: a flat tile bordering ANY level change is the
  // fence line's doorstep — the high side wears the Cliff/Ramp rim and
  // worldgen dresses the base with talus, so nothing procedural may
  // stand there: a camp, find, trail, or wild knot placed against the
  // wall reads as punched through the rock face. One rule here covers
  // every downstream scanner at once (POIs, finds, trails, wilds).
  if (
    levelAt(seed, tx - 1, ty) !== 0 ||
    levelAt(seed, tx + 1, ty) !== 0 ||
    levelAt(seed, tx, ty - 1) !== 0 ||
    levelAt(seed, tx, ty + 1) !== 0
  ) {
    return 'rock';
  }
  // Roads read as not-standable so no POI footprint ever severs one —
  // camps prey on the road from beside it, never across it.
  if (roadDistanceAt(seed, tx, ty) <= ROAD_SHOULDER) return 'rock';
  return moistureAt(seed, tx, ty) > 0.62 ? 'forest' : 'grass';
}

/** Compass ring for the shore probe's widening sweep. */
const SHORE_RING: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * THE TIDE LINE: true when open water (the wading margin or deeper,
 * the same < 0.37 cut generateChunk floods) lies within `reach` tiles
 * of the spot. This is the wild spawner's shore refinement — a grass
 * anchor that passes is a bank, and bank-only kinds (the crabs) may
 * muster there. It reads the elevation field the water itself is cut
 * from, so the flag can never disagree with the shoreline it names.
 * Pure and chunk-free: a suitability probe, like groundProbeAt above.
 */
export function shoreProbeAt(seed: number, tx: number, ty: number, reach = 4): boolean {
  for (let r = 1; r <= reach; r++) {
    for (const [dx, dy] of SHORE_RING) {
      if (elevationAt(seed, tx + dx * r, ty + dy * r) < 0.37) return true;
    }
  }
  return false;
}

/** Sampled-neighborhood margin: rim checks 1 + ramp-top interior 1 + talus 1. */
const M = 3;

/**
 * THE WORLDS APART: the base chunk of a cave plane — solid rock in
 * every direction, waiting for authored zones (the Undercroft, the Low
 * Hall, a dungeon run) to carve rooms into it. This is the fill the
 * surface's old "dark band" used to deal below y=512; now it is a
 * PLANE'S law, and the surface runs wild on every compass point.
 */
export function generateCaveChunk(cx: number, cy: number): ChunkData {
  const chunk = emptyChunk(cx, cy);
  chunk.ground.fill(Tile.CaveWall);
  return chunk;
}

export function generateChunk(seed: number, cx: number, cy: number): ChunkData {
  const chunk = emptyChunk(cx, cy);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  // Precompute the raw elevation and terrain level over the chunk plus a
  // margin — rims, ramps, and talus all read the neighborhood.
  const N = CHUNK_SIZE + M * 2;
  const el = new Float64Array(N * N);
  const lv = new Int8Array(N * N); // signed: sinks store negative levels
  // Road distances, only for chunks a route passes near (the frontier
  // at large skips the whole field). THE ROAD LEARNS THE LAND: inside
  // the graded ribbon terrain levels are forced flat, so the carve
  // cuts cliff-walled passages through crag country and embanks
  // walled causeways across dells — and because the forcing reaches
  // ROAD_APRON while the trodden surface stops at ROAD_HALF, the
  // cliff fence the level law grows always lands on the ribbon's
  // hem, never on the road itself.
  const roadNear = nearRoads(baseX - M, baseY - M, baseX + CHUNK_SIZE + M, baseY + CHUNK_SIZE + M);
  const rd = roadNear ? new Float64Array(N * N).fill(Infinity) : null;
  const rtrail = roadNear ? new Uint8Array(N * N) : null;
  for (let ly = -M; ly < CHUNK_SIZE + M; ly++) {
    for (let lx = -M; lx < CHUNK_SIZE + M; lx++) {
      const e = elevationAt(seed, baseX + lx, baseY + ly);
      const i = lx + M + (ly + M) * N;
      el[i] = e;
      let level = levelOf(
        plateauFieldAt(seed, baseX + lx, baseY + ly),
        basinFieldAt(seed, baseX + lx, baseY + ly),
        e,
      );
      if (rd && rtrail) {
        const hit = roadHitAt(seed, baseX + lx, baseY + ly);
        if (hit) {
          rd[i] = hit.dist;
          rtrail[i] = hit.trail ? 1 : 0;
          if (hit.dist <= (hit.trail ? TRAIL_APRON : ROAD_APRON)) level = 0;
        }
      }
      lv[i] = level;
    }
  }
  const L = (lx: number, ly: number): number => lv[lx + M + (ly + M) * N]!;
  const E = (lx: number, ly: number): number => el[lx + M + (ly + M) * N]!;

  // THE WOOD LEARNS TO BREATHE (forest.ts): the canopy law reads its
  // touching neighbours, so moisture and the elder verdict are memoized
  // over the margin — each sampled at most once per chunk, and only
  // where a tree question is actually asked. The margin (M = 3) covers
  // every tile the law can reach from a chunk-edge tile: a shade check
  // looks one out, and that neighbour's weeding looks one further.
  const mo = new Float64Array(N * N).fill(NaN);
  const Mo = (lx: number, ly: number): number => {
    const i = lx + M + (ly + M) * N;
    let v = mo[i]!;
    if (v !== v) {
      v = moistureAt(seed, baseX + lx, baseY + ly);
      mo[i] = v;
    }
    return v;
  };
  const inMargin = (lx: number, ly: number): boolean =>
    lx >= -M && ly >= -M && lx < CHUNK_SIZE + M && ly < CHUNK_SIZE + M;
  /** Moisture at a WORLD tile, through the memo when it lies in reach. */
  const moistureW = (wx: number, wy: number): number => {
    const lx = wx - baseX;
    const ly = wy - baseY;
    return inMargin(lx, ly) ? Mo(lx, ly) : moistureAt(seed, wx, wy);
  };
  /**
   * Where an elder may take root at all: flat dry land off the road's
   * shoulder. Rims, ramps and talus feet are refused downstream by the
   * branch order (a candidate on a dell lip simply never reaches the
   * forest branch); the canopy law only needs the cheap, grid-local
   * truth so a tree on water never casts a phantom shade.
   */
  const elderGround = (lx: number, ly: number): boolean => {
    if (!inMargin(lx, ly)) return true;
    if (E(lx, ly) < 0.4 || L(lx, ly) !== 0) return false;
    if (rd) {
      const gi = lx + M + (ly + M) * N;
      const shoulder = rtrail![gi] === 1 ? TRAIL_SHOULDER : ROAD_SHOULDER;
      if (rd[gi]! <= shoulder) return false;
    }
    return true;
  };
  const elderCoverW = (wx: number, wy: number): number => {
    const lx = wx - baseX;
    const ly = wy - baseY;
    if (!elderGround(lx, ly)) return 0;
    const m = moistureW(wx, wy);
    if (m <= FOREST_LINE) return 0;
    return canopyCoverAt(seed, wx, wy, m, coldAt(seed, wx, wy));
  };
  const eld = new Int8Array(N * N).fill(-1);
  /** An elder (canopy tree) stands on this tile — memoized over the margin. */
  const isElder = (lx: number, ly: number): boolean => {
    if (!inMargin(lx, ly)) {
      return latticeTreeAt(seed, ELDER_SALT, FOREST_LAW.elderCell, baseX + lx, baseY + ly, elderCoverW);
    }
    const i = lx + M + (ly + M) * N;
    let v = eld[i]!;
    if (v < 0) {
      v = latticeTreeAt(seed, ELDER_SALT, FOREST_LAW.elderCell, baseX + lx, baseY + ly, elderCoverW)
        ? 1
        : 0;
      eld[i] = v;
    }
    return v === 1;
  };
  /** Any elder crown touching this tile (8-neighbourhood). */
  const shadedAt = (lx: number, ly: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && isElder(lx + dx, ly + dy)) return true;
      }
    }
    return false;
  };
  /** Meadow copses and lone sentinels — the same lattice law, coarser cell. */
  const copseCoverW = (wx: number, wy: number): number => {
    const lx = wx - baseX;
    const ly = wy - baseY;
    if (!elderGround(lx, ly)) return 0;
    const m = moistureW(wx, wy);
    if (m > FOREST_LINE || m < 0.34) return 0;
    // A field tree never stands against the wood's own edge: the elder
    // law can't see across the forest line, so the copse law keeps
    // the gap itself (the only way two trees could ever touch).
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && moistureW(wx + dx, wy + dy) > FOREST_LINE) return 0;
      }
    }
    return copseCoverAt(seed, wx, wy);
  };
  const isCopseTree = (tx: number, ty: number): boolean =>
    latticeTreeAt(seed, COPSE_SALT, FOREST_LAW.copseCell, tx, ty, copseCoverW);
  /** Highland scatter: windswept, spaced, no copse composition up here. */
  const highlandCoverW = (wx: number, wy: number): number => {
    const lx = wx - baseX;
    const ly = wy - baseY;
    if (inMargin(lx, ly) && L(lx, ly) !== 1) return 0;
    return FOREST_LAW.highlandCover;
  };
  const isHighlandTree = (tx: number, ty: number): boolean =>
    latticeTreeAt(seed, HIGHLAND_SALT, FOREST_LAW.highlandCell, tx, ty, highlandCoverW);

  /**
   * Rim tile: at least one LOWER tile in the 8-neighborhood. Signed and
   * relative — a plateau's crown edge and a pit's level-0 lip are the
   * same thing: the high side of a boundary, and it carries the fence.
   */
  const isRim = (lx: number, ly: number): boolean => {
    const lvl = L(lx, ly);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && L(lx + dx, ly + dy) < lvl) return true;
      }
    }
    return false;
  };

  /**
   * Ramp: a rim tile on a STRAIGHT run — exactly one cardinal neighbor a
   * level below, the opposite cardinal safely interior — picked by hash
   * so most plateaus AND pits get a few stairs (and the odd unclimbable
   * mesa or sheer quarry stays scenic). Every check is a RELATIVE level
   * comparison, so a pit's north lip (level 0 over a −1 dell) carries a
   * stair by the same rule as a mesa's crown. Pure function of position:
   * the low-side pass asks the same question about the tile above it to
   * keep stair feet clear.
   */
  const isRamp = (lx: number, ly: number): boolean => {
    const lvl = L(lx, ly);
    if (!isRim(lx, ly)) return false;
    const n = L(lx, ly - 1);
    const e = L(lx + 1, ly);
    const s = L(lx, ly + 1);
    const w = L(lx - 1, ly);
    const cards = [n, e, s, w];
    const lower = cards.filter((c) => c < lvl);
    if (lower.length !== 1 || lower[0] !== lvl - 1) return false;
    // Only SOUTH-DESCENDING flights (low mouth on the south side): an
    // east-west stair notched through a north-south rim hides behind
    // its own south flank at this camera, and a north-descending stair
    // sits on the plateau's FAR slope — the viewer would be looking at
    // its back. Camera-facing flights are the only ones that read.
    if (cards.indexOf(lower[0]!) !== 2) return false;
    // The two flanking cardinals stay at level → the stair is framed by
    // cliff; the opposite cardinal must be interior so the stair tops
    // out on open ground, not another wall.
    const di = cards.indexOf(lower[0]!);
    const opp = [[0, 1], [-1, 0], [0, -1], [1, 0]][di]!; // opposite dir
    const flank = [[1, 0], [0, 1], [1, 0], [0, 1]][di]!; // flank axis
    const ox = opp[0]!;
    const oy = opp[1]!;
    const sx = flank[0]!;
    const sy = flank[1]!;
    if (L(lx + sx, ly + sy) !== lvl || L(lx - sx, ly - sy) !== lvl) return false;
    if (L(lx + ox, ly + oy) !== lvl || isRim(lx + ox, ly + oy)) return false;
    // STRAIGHT-EDGE RULE (how tile-based games have always placed
    // stairs: stair pieces exist only for straight cliff edges). The
    // flight needs a locally straight rim three tiles wide — both
    // mouth diagonals one level down (the flanks are true south faces,
    // not corner turns that would crowd the flight) and both top
    // diagonals solid (the stair tops out onto straight crown, not a
    // corner point). A stair jammed into a 45-degree turn can never
    // read as anything but a broken notch at this camera.
    if (L(lx - 1, ly + 1) !== lvl - 1 || L(lx + 1, ly + 1) !== lvl - 1) return false;
    if (L(lx - 1, ly - 1) < lvl || L(lx + 1, ly - 1) < lvl) return false;
    return hashCoords(seed ^ 0x5aca1e, baseX + lx, baseY + ly) % 3 === 0;
  };

  /** Is a cardinal neighbor a ramp? Those tiles stay clear (stair mouths). */
  const nearRamp = (lx: number, ly: number): boolean =>
    isRamp(lx, ly - 1) || isRamp(lx + 1, ly) || isRamp(lx, ly + 1) || isRamp(lx - 1, ly);

  /** Within `d` (chebyshev) of a rim at this tile's own level. */
  const nearRim = (lx: number, ly: number, d: number): boolean => {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (isRim(lx + dx, ly + dy)) return true;
      }
    }
    return false;
  };

  /** Any 8-neighbor raised above me (lowland tile at a cliff's foot). */
  const atCliffBase = (lx: number, ly: number): boolean => {
    const lvl = L(lx, ly);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && L(lx + dx, ly + dy) > lvl) return true;
      }
    }
    return false;
  };

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const i = ly * CHUNK_SIZE + lx;

      const elevation = E(lx, ly);
      const lvl = L(lx, ly);
      const moisture = Mo(lx, ly);
      const roll = hashCoords(seed ^ 0xabcdef, tx, ty) / 4294967296;

      let ground: Tile;
      let detail = Detail.None;
      chunk.elev[i] = lvl;

      if (isRim(lx, ly)) {
        // The fence itself: solid Cliff (or its Ramp gate) on the high
        // side of every boundary REGARDLESS of sign — a pit's level-0
        // lip is fenced exactly like a mesa's crown edge.
        ground = isRamp(lx, ly) ? Tile.Ramp : Tile.Cliff;
      } else if (lvl > 0) {
        // ---------------------------------------- raised terrain
        if (nearRamp(lx, ly)) {
          // Stair tops stay open.
          ground = lvl >= 2 ? Tile.StoneFloor : Tile.Grass;
        } else {
          const formation = fbm(seed + 555, tx * 0.13, ty * 0.13, 2);
          const inFormation = nearRim(lx, ly, 2) && formation > 0.56;
          if (inFormation) {
            // Ore formations hug the rims — richer the higher you climb.
            // The twice-climbed crowns carry the high ladder: silver and
            // gold for the mid-game, mithril and adamant seams for the
            // smith who kept walking up.
            if (lvl >= 2) {
              ground =
                roll < 0.08 ? Tile.RockIron
                : roll < 0.15 ? Tile.RockCoal
                : roll < 0.2 ? Tile.RockSilver
                : roll < 0.24 ? Tile.RockGold
                : roll < 0.28 ? Tile.RockMithril
                : roll < 0.3 ? Tile.RockAdamant
                : roll < 0.55 ? Tile.Rock
                : Tile.StoneFloor;
            } else {
              ground =
                roll < 0.1 ? Tile.RockCopper
                : roll < 0.2 ? Tile.RockTin
                : roll < 0.27 ? Tile.RockIron
                : roll < 0.32 ? Tile.RockCoal
                : roll < 0.35 ? Tile.RockSilver
                : roll < 0.58 ? Tile.Rock
                : Tile.StoneFloor;
            }
            if (ground === Tile.StoneFloor && roll > 0.85) detail = Detail.Pebbles;
          } else if (lvl >= 2) {
            // Mesa tops: stark stone with wind-scoured snow patches —
            // and, once in a great while, a starfall crater: the only
            // overworld source of starmetal, parked where the sky is
            // closest. A landmark you hike to, not stumble over.
            ground =
              roll < 0.0035 ? Tile.RockStarfall
              : moisture > 0.6 ? Tile.Snow
              : roll < 0.03 ? Tile.Rock
              : Tile.StoneFloor;
            if (ground === Tile.StoneFloor && roll > 0.88) detail = Detail.Pebbles;
          } else {
            // Hardy highland meadow: sparse windswept trees, thin soil.
            // Moonbell only opens up here, near the sky.
            // The windswept trees ride the lattice law (forest.ts):
            // spaced, never touching, a scatter and not a speckle.
            const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
            ground =
              isHighlandTree(tx, ty) ? Tile.Tree
              : roll < 0.008 ? Tile.Rock
              : flora < 0.006 ? Tile.WildMoonbell
              : moisture < 0.4 ? Tile.StoneFloor
              : roll < 0.14 ? Tile.GrassTall
              : Tile.Grass;
            if (ground === Tile.Grass && roll > 0.9) detail = Detail.Tuft;
            if (ground === Tile.StoneFloor && roll > 0.9) detail = Detail.Pebbles;
          }
        }
      } else if (lvl < 0) {
        // ---------------------------------------- sunken terrain
        if (nearRamp(lx, ly)) {
          // Stair mouths on the sunken floor stay open.
          ground = lvl <= -2 ? Tile.StoneFloor : Tile.Grass;
        } else if (lvl <= -2) {
          // Quarry core: bare cut rock seeded with the deep ores — a
          // bonus mining spot for whoever climbs down twice, tuned well
          // below the mesa formations (this is a dell's cellar, not a
          // jackpot).
          // The deep cut also nicks the high ladder: a little silver
          // and mithril, and the odd cooled obsidian flow where the
          // quarry floor met old fire.
          ground =
            roll < 0.05 ? Tile.RockIron
            : roll < 0.09 ? Tile.RockCoal
            : roll < 0.12 ? Tile.RockGold
            : roll < 0.145 ? Tile.RockSilver
            : roll < 0.165 ? Tile.RockMithril
            : roll < 0.175 ? Tile.RockObsidian
            : roll < 0.38 ? Tile.Rock
            : Tile.StoneFloor;
          if (ground === Tile.StoneFloor && roll > 0.85) detail = Detail.Pebbles;
        } else if (atCliffBase(lx, ly)) {
          // Talus at the dell wall's foot, same law as the overworld
          // cliff bases: tumbled boulders with the shallow ores.
          ground =
            roll < 0.07 ? Tile.RockCopper
            : roll < 0.14 ? Tile.RockTin
            : roll < 0.3 ? Tile.Rock
            : Tile.Grass;
          if (ground === Tile.Grass && roll > 0.55) detail = Detail.Pebbles;
        } else {
          // Dell floor: sheltered and damp — lush grass where the wind
          // can't reach, the odd moisture-loving herb.
          const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
          ground =
            flora < 0.008 ? Tile.WildSagewort
            : roll < 0.22 ? Tile.GrassTall
            : Tile.Grass;
          if (ground === Tile.Grass && roll > 0.85) {
            detail = roll > 0.95 ? Detail.Flowers : Detail.Tuft;
          }
        }
      } else if (elevation < 0.3) {
        ground = Tile.WaterDeep;
      } else if (elevation < 0.345) {
        // Open water. Where the sandbar field crests, the lake floor
        // rises into a wadeable ford — an honest shortcut across the
        // mid-depth band (never across the deep cores: those stay moats).
        ground = sandbarAt(seed, tx, ty) ? Tile.WaterShallow : Tile.Water;
      } else if (elevation < 0.37) {
        // The wading margin: knee-deep shallows ring every water body.
        // Fishing spots sit just past the shallows, in true water.
        const offMargin =
          E(lx + 1, ly) < 0.345 ||
          E(lx - 1, ly) < 0.345 ||
          E(lx, ly + 1) < 0.345 ||
          E(lx, ly - 1) < 0.345;
        if (offMargin && roll < 0.06) {
          // THE LADDER READS THE WATER (XP balance epic): a sub-roll
          // on its own salt splits the spot by the water it sits in —
          // margin density never moves. Trout keeps the common share
          // everywhere; fen stillwater hides pike; a spot beside the
          // deep cores runs eels, or on a rare cast, glimmers; the
          // cold country's water runs salmon.
          const cast = hashCoords(seed ^ 0xf15b7, tx, ty) / 4294967296;
          // Deep water sits behind the open-water shelf, so the read
          // reaches the halo's full 3 tiles (M = 3) — a margin tile
          // never touches a deep core directly.
          let deepNear = false;
          for (let dy = -3; dy <= 3 && !deepNear; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              if (E(lx + dx, ly + dy) < 0.3) {
                deepNear = true;
                break;
              }
            }
          }
          if (cast >= 0.45) ground = Tile.FishingSpot;
          else if (deepNear && cast < 0.06) ground = Tile.GlimmerShoal;
          else if (coldAt(seed, tx, ty) > 0.55) ground = Tile.SalmonRun;
          else if (deepNear) ground = Tile.EelRun;
          else if (fenAt(tx, ty) > 0.25 || moisture > 0.62) ground = Tile.PikeHole;
          else ground = Tile.FishingSpot;
        } else {
          ground = Tile.WaterShallow;
        }
      } else if (elevation < 0.4) {
        // Shore band: beach sand — except inside the fen, where a damp
        // shore grows reed flats instead (walkable wet ground, the
        // Amberfen's signature), salted with the weaver's fibre plants.
        if (fenAt(tx, ty) > 0.3 && moisture > 0.5) {
          const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
          ground = flora < 0.02 ? Tile.FibrePlant : Tile.Swamp;
          if (ground === Tile.Swamp && roll > 0.8) detail = Detail.Tuft;
        } else {
          ground = Tile.Sand;
          if (roll < 0.04) detail = Detail.Pebbles;
        }
      } else if (atCliffBase(lx, ly)) {
        // Talus at the cliff's foot: tumbled boulders seeded with the
        // shallow ores — mining starts where the rock face meets the
        // ground. Stair mouths stay clear.
        ground = nearRamp(lx, ly)
          ? Tile.Grass
          : roll < 0.07 ? Tile.RockCopper
          : roll < 0.14 ? Tile.RockTin
          : roll < 0.3 ? Tile.Rock
          : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.55) detail = Detail.Pebbles;
      } else if (nearRamp(lx, ly)) {
        // The level-0 tile at a sink stair's TOP stays open — the same
        // courtesy the raised branches pay their stair tops, or a tree
        // could grow across the only way down into a dell.
        ground = Tile.Grass;
      } else if (moisture > FOREST_LINE) {
        // THE WOOD LEARNS TO BREATHE (forest.ts). The canopy is dealt
        // by the lattice-and-weeding law — one candidate per cell,
        // the weaker of any touching pair dies — under a stand field
        // that closes the cores and opens the fringes into glades. The
        // floor between the elders is dealt by its seat: under a
        // crown, in a canopy gap, or out in the open. The herb and
        // chest deals keep their old thresholds exactly (the forager's
        // economy is untouched), and the species deal is the old one.
        const damp = dampOf(moisture);
        const oakRoll = hashCoords(seed ^ 0x0acc0de, tx, ty) / 4294967296;
        const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
        // Species by rarity: yew is the ancient find, willow grows only
        // where the forest turns properly damp (and shuns the deep
        // cold), and northward the pines take the common share — half
        // the stand on Silverfall's approach, near-pure taiga in the
        // far north. Oaks salt whatever the cold leaves. Yew's share
        // rises a touch with the thinner stand so the bowyer's find
        // stays a find per league, not per lifetime.
        const cold = coldAt(seed, tx, ty);
        const pineRoll = hashCoords(seed ^ 0x9b1e5, tx, ty) / 4294967296;
        const species =
          oakRoll < 0.04 ? Tile.TreeYew
          : oakRoll < 0.13 && moisture > 0.74 && cold < 0.6 ? Tile.TreeWillow
          : pineRoll < (cold - 0.42) * 1.9 ? Tile.TreePine
          : oakRoll < 0.27 ? Tile.TreeOak
          : Tile.Tree;
        if (isElder(lx, ly)) {
          ground = species;
        } else if (flora < 0.008) {
          ground = Tile.WildSagewort;
        } else if (flora < 0.012 && moisture > 0.75) {
          ground = Tile.WildMoonbell;
        } else if (flora < 0.017) {
          ground = Tile.FibrePlant;
        } else if (flora < 0.0185) {
          // A traveller's chest abandoned under the canopy — the deep
          // woods' rare find; regen restocks it like any other node.
          ground = Tile.ChestWood;
        } else {
          // THE FLOOR. Seat first: shade under a touching crown, a gap
          // inside a closed stand, or a glade the stand field opened.
          const gate = standGateAt(seed, tx, ty, damp, cold);
          const seat = floorSeatOf(shadedAt(lx, ly), gate);
          const deal = FLOOR[seat];
          const u = hashCoords(seed ^ 0x7ee5, tx, ty) / 4294967296;
          const oldWood = damp > OLD_WOOD_DAMP;
          ground =
            u < deal.sapling ? (saplingOf(species) ?? Tile.Sapling)
            : u < deal.tall ? Tile.GrassTall
            : u < deal.rock ? Tile.Rock
            : u < deal.stump && oldWood ? Tile.Stump
            : u < deal.snag && oldWood ? Tile.DeadTree
            : Tile.Grass;
          if (ground === Tile.Grass) {
            if (seat === 'shade') {
              // Litter under the crown, and the shade mushrooms.
              detail =
                roll < 0.42 ? Detail.LeafLitter
                : roll > 0.94 ? Detail.Mushroom
                : Detail.None;
            } else if (seat === 'gap') {
              // Bracken takes the light between the elders.
              detail =
                roll < 0.15 ? Detail.Bracken
                : roll < 0.27 ? Detail.LeafLitter
                : roll > 0.955 ? Detail.Flowers
                : roll > 0.92 ? Detail.Tuft
                : Detail.None;
            } else {
              // A glade: open sky, meadow flowers, a tuft.
              detail =
                roll > 0.95 ? Detail.Flowers
                : roll > 0.87 ? Detail.Tuft
                : roll < 0.05 ? Detail.Bracken
                : Detail.None;
            }
          }
        }
      } else if (moisture < 0.34) {
        // Dry meadow: bare grass except for the odd rocky knoll — a
        // freestanding formation of boulders with shallow copper/tin.
        const knoll = fbm(seed + 777, tx * 0.09, ty * 0.09, 2);
        if (knoll > 0.72) {
          ground =
            roll < 0.26 ? Tile.Rock
            : roll < 0.34 ? Tile.RockCopper
            : roll < 0.42 ? Tile.RockTin
            : Tile.GrassTall;
          if (ground === Tile.GrassTall && roll > 0.6) detail = Detail.Pebbles;
        } else {
          ground = roll < 0.006 ? Tile.Rock : roll < 0.09 ? Tile.GrassTall : Tile.Grass;
        }
      } else {
        // Open meadow: berry bushes and fibre plants for the forager.
        // The field trees ride the copse law (forest.ts): they gather
        // where the stand field crests and stand alone where it does
        // not — never the old 1.5% speckle. In the cold country the
        // field trees are pines, the taiga's outriders.
        const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
        ground =
          isCopseTree(tx, ty) ? (coldAt(seed, tx, ty) > 0.5 ? Tile.TreePine : Tile.Tree)
          : flora < 0.005 ? Tile.BerryBush
          : flora < 0.009 ? Tile.FibrePlant
          : roll < 0.06 ? Tile.GrassTall
          : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.9) {
          detail = roll > 0.96 ? Detail.Flowers : Detail.Tuft;
        }
      }

      // THE SCORCH — the burn country re-reads the deal (the Ashmarch,
      // the Kingsdelf epic). The moisture pull upstream already starves
      // the canopy; here the burn dresses what survived: stands die to
      // charred stubs, the herb and berry layer gives out, the ground
      // goes to ash-gravel — and on the deep-burn knolls the fire's
      // one gift shows: obsidian, at Overband prices. Sparser than
      // meadow, never painted black (the density lesson); the road
      // carve below still keeps the last word on the surface.
      const scorch = scorchAt(tx, ty);
      if (scorch > 0.12 && elevation >= 0.4) {
        const s = Math.min(1, (scorch - 0.12) / 0.55);
        if (SCORCH_STANDS.has(ground)) {
          ground = roll < 0.3 + s * 0.4 ? Tile.Stump : Tile.GrassTall;
          detail = Detail.None;
        } else if (
          (ground === Tile.BerryBush || ground === Tile.FibrePlant || ground === Tile.WildMoonbell) &&
          roll < s * 0.9
        ) {
          ground = Tile.GrassTall;
          detail = Detail.None;
        } else if ((ground === Tile.RockCopper || ground === Tile.RockTin) && s > 0.5 && roll < 0.3) {
          ground = Tile.RockObsidian;
        }
        if (ground === Tile.Grass) {
          detail = roll > 0.82 ? Detail.Pebbles : Detail.None;
        }
      }

      // The road carve, last word on the surface: the trodden track
      // becomes Path (Bridge over water — the road narrows to a span
      // while the graded verge stays wet), and the shoulder is felled
      // — trees, loose boulders, the odd lost chest — while ore veins,
      // berry banks, and the herb layer stay: the road was cleared by
      // people who kept what was worth keeping. Cliff and Ramp are
      // NEVER touched here; the fence law owns them.
      if (rd && rtrail) {
        const gi = lx + M + (ly + M) * N;
        const dist = rd[gi]!;
        const trail = rtrail[gi] === 1;
        if (dist <= (trail ? TRAIL_HALF : ROAD_HALF)) {
          if (elevation < 0.37) {
            // Water crossings: the built road bridges in earnest, the
            // trail throws a plank span — same tile, the deck reads.
            ground = Tile.Bridge;
            detail = Detail.None;
          } else {
            ground = trail ? Tile.Dirt : Tile.Path;
            detail = !trail && roll > 0.94 ? Detail.Pebbles : Detail.None;
          }
        } else if (dist <= (trail ? TRAIL_SHOULDER : ROAD_SHOULDER)) {
          // THE WAYSTONE DRESSING (the Evenfall epic): on the ways
          // the road-faith never lamped, the shoulder stands a stone
          // every long stone's-throw — script band glowing faint, a
          // runestone leaning where the mile turns odd. Sparse by law
          // (the wood does not do rows), deterministic by hash, on
          // ANY honest shoulder ground (a stone does not wait for a
          // tree to be felled first), and never on the trodden
          // surface by construction (this branch IS the shoulder).
          // Off the waystone ways this branch is byte-identical to
          // the old fell-only shoulder.
          const standable =
            ROAD_FELLED.has(ground) || ground === Tile.Grass || ground === Tile.GrassTall;
          const wayHash = trail && standable && waystoneWayAt(baseX + lx, baseY + ly)
            ? hashCoords(seed ^ 0x8a7e57, baseX + lx, baseY + ly) % 1000
            : 1000;
          if (wayHash < 14) {
            ground = Tile.ElvenWaystone;
            detail = Detail.None;
          } else if (wayHash < 17) {
            ground = Tile.Runestone;
            detail = Detail.None;
          } else if (ROAD_FELLED.has(ground)) {
            ground = roll < 0.05 ? Tile.Stump : Tile.Grass;
            detail = roll > 0.88 ? Detail.Tuft : Detail.None;
          }
        }
      }

      chunk.ground[i] = ground;
      chunk.detail[i] = detail;
    }
  }
  return chunk;
}

/**
 * What the road crews felled from the shoulders. Everything else —
 * ore, forage, water, and above all the Cliff/Ramp fence — stands.
 */
const ROAD_FELLED: ReadonlySet<number> = new Set([
  Tile.Tree,
  Tile.TreeOak,
  Tile.TreeWillow,
  Tile.TreeYew,
  Tile.TreePine,
  Tile.Sapling,
  Tile.SaplingOak,
  Tile.SaplingWillow,
  Tile.SaplingYew,
  Tile.SaplingPine,
  Tile.DeadTree,
  Tile.Rock,
  Tile.ChestWood,
]);

/** What the burn kills where it still stands: the living canopy. */
const SCORCH_STANDS: ReadonlySet<number> = new Set([
  Tile.Tree,
  Tile.TreeOak,
  Tile.TreeWillow,
  Tile.TreeYew,
  Tile.TreePine,
  // The floor's young and dead wood burns with the canopy.
  Tile.Sapling,
  Tile.SaplingOak,
  Tile.SaplingWillow,
  Tile.SaplingYew,
  Tile.SaplingPine,
  Tile.DeadTree,
]);

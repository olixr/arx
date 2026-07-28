import {
  CHUNK_SIZE,
  Detail,
  Tile,
  emptyChunk,
  fbm,
  hashCoords,
  type ChunkData,
} from '@arx/shared';
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
  nearRoads,
  roadDistanceAt,
  roadHitAt,
  thornveilAt,
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
export function elevationAt(seed: number, tx: number, ty: number): number {
  let elevation = fbm(seed, tx * 0.015, ty * 0.015, 4);
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
  // The Silverspine bias: crag country guaranteed around Silverfall —
  // mesa-dominant at the heart, breaking into plateaus and valley
  // floors toward the rim. The noise still decides every edge.
  f += massifAt(tx, ty) * 0.24;
  const distFromTown = Math.hypot(tx + 64, ty - 48);
  f -= Math.max(0, 1 - distFromTown / 130) * 0.45;
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
  if (ty >= DARK_BAND_Y) return 0; // caves carve the underworld, not basins
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
    thornveilAt(tx, ty) * 0.3 +
    fenAt(tx, ty) * 0.22;
  // The edge-harmony law: an authored tree line keeps going as wild
  // forest; a road stub leaving a gate dries into an open clearing.
  return edgeBlendMoisture(seed, tx, ty, m);
}

/** Below this world-y everything defaults to solid cave (dungeon land). */
export const DARK_BAND_Y = 512;

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
  if (ty >= DARK_BAND_Y) return 'cave';
  const e = elevationAt(seed, tx, ty);
  if (e < 0.37) return 'water';
  if (e < 0.4) return 'sand';
  if (levelAt(seed, tx, ty) !== 0) return 'rock';
  // Roads read as not-standable so no POI footprint ever severs one —
  // camps prey on the road from beside it, never across it.
  if (roadDistanceAt(seed, tx, ty) <= ROAD_SHOULDER) return 'rock';
  return moistureAt(seed, tx, ty) > 0.62 ? 'forest' : 'grass';
}

/** Sampled-neighborhood margin: rim checks 1 + ramp-top interior 1 + talus 1. */
const M = 3;

export function generateChunk(seed: number, cx: number, cy: number): ChunkData {
  const chunk = emptyChunk(cx, cy);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  // The dark band: dungeons overlay carved zones onto solid rock, so no
  // grass ever peeks through cave walls.
  if (baseY >= DARK_BAND_Y) {
    chunk.ground.fill(Tile.CaveWall);
    return chunk;
  }

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
      const moisture = moistureAt(seed, tx, ty);
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
            const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
            ground =
              roll < 0.02 ? Tile.Tree
              : roll < 0.028 ? Tile.Rock
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
        ground = offMargin && roll < 0.06 ? Tile.FishingSpot : Tile.WaterShallow;
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
      } else if (moisture > 0.62) {
        // Forest: tree density scales with moisture; some trees are oaks.
        // The understory hides the herbalist's plants — sagewort in the
        // shade, moonbell only in the deepest damp, fibre at the edges.
        const treeDensity = 0.10 + (moisture - 0.62) * 1.4;
        const oakRoll = hashCoords(seed ^ 0x0acc0de, tx, ty) / 4294967296;
        const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
        // Species by rarity: yew is the ancient one-in-forty find, willow
        // grows only where the forest turns properly damp, oaks salt the
        // rest — the woodcutting ladder lives in the deep woods.
        const species =
          oakRoll < 0.025 ? Tile.TreeYew
          : oakRoll < 0.12 && moisture > 0.74 ? Tile.TreeWillow
          : oakRoll < 0.26 ? Tile.TreeOak
          : Tile.Tree;
        ground =
          roll < treeDensity ? species
          : flora < 0.008 ? Tile.WildSagewort
          : flora < 0.012 && moisture > 0.75 ? Tile.WildMoonbell
          : flora < 0.017 ? Tile.FibrePlant
          // A traveller's chest abandoned under the canopy — the deep
          // woods' rare find; regen restocks it like any other node.
          : flora < 0.0185 ? Tile.ChestWood
          : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.93) detail = Detail.Mushroom;
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
        const flora = hashCoords(seed ^ 0xf10a5, tx, ty) / 4294967296;
        ground =
          roll < 0.015 ? Tile.Tree
          : flora < 0.005 ? Tile.BerryBush
          : flora < 0.009 ? Tile.FibrePlant
          : roll < 0.06 ? Tile.GrassTall
          : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.9) {
          detail = roll > 0.96 ? Detail.Flowers : Detail.Tuft;
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
        } else if (dist <= (trail ? TRAIL_SHOULDER : ROAD_SHOULDER) && ROAD_FELLED.has(ground)) {
          ground = roll < 0.05 ? Tile.Stump : Tile.Grass;
          detail = roll > 0.88 ? Detail.Tuft : Detail.None;
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
  Tile.Rock,
  Tile.ChestWood,
]);

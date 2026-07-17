import {
  CHUNK_SIZE,
  Detail,
  Tile,
  emptyChunk,
  fbm,
  hashCoords,
  type ChunkData,
} from '@devcraft/shared';

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
 * into true plateaus (level 1) and mesas (level 2). Every level change
 * is fenced by a ring of solid Cliff tiles except where a walkable Ramp
 * stair crosses — that ring is the WHOLE collision story, so the
 * per-tile `elev` layer stays render-only and the editor/procgen never
 * have to agree about slopes. Ore lives where rock is exposed: talus
 * boulders at cliff feet, formations along plateau rims, and the richest
 * veins up on the mesas.
 */
function elevationAt(seed: number, tx: number, ty: number): number {
  let elevation = fbm(seed, tx * 0.015, ty * 0.015, 4);
  // Continental bias: dry land guaranteed near the town.
  const distFromOrigin = Math.hypot(tx - 48, ty - 48);
  const lift = Math.max(0, 1 - distFromOrigin / 400);
  return elevation * (1 - lift * 0.6) + 0.55 * lift * 0.6;
}

/**
 * The highlands field is its OWN noise, decoupled from the continental
 * elevation that decides sea vs land — so mountains rise on any solid
 * ground, not just at the far fringe of the lift. Suppressed near the
 * authored town (flat, buildable) and over water.
 */
const PLATEAU_T1 = 0.615;
const PLATEAU_T2 = 0.705;

function plateauFieldAt(seed: number, tx: number, ty: number): number {
  const f = fbm(seed + 31337, tx * 0.012, ty * 0.012, 3);
  const distFromTown = Math.hypot(tx - 48, ty - 48);
  return f - Math.max(0, 1 - distFromTown / 130) * 0.45;
}

function levelOf(pf: number, elevation: number): number {
  if (elevation < 0.42) return 0; // no mesas rising out of the sea
  return pf > PLATEAU_T2 ? 2 : pf > PLATEAU_T1 ? 1 : 0;
}

/** Below this world-y everything defaults to solid cave (dungeon land). */
export const DARK_BAND_Y = 512;

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
  const lv = new Uint8Array(N * N);
  for (let ly = -M; ly < CHUNK_SIZE + M; ly++) {
    for (let lx = -M; lx < CHUNK_SIZE + M; lx++) {
      const e = elevationAt(seed, baseX + lx, baseY + ly);
      const i = lx + M + (ly + M) * N;
      el[i] = e;
      lv[i] = levelOf(plateauFieldAt(seed, baseX + lx, baseY + ly), e);
    }
  }
  const L = (lx: number, ly: number): number => lv[lx + M + (ly + M) * N]!;
  const E = (lx: number, ly: number): number => el[lx + M + (ly + M) * N]!;

  /** Rim tile: raised, with at least one lower tile in its 8-neighborhood. */
  const isRim = (lx: number, ly: number): boolean => {
    const lvl = L(lx, ly);
    if (lvl === 0) return false;
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
   * so most plateaus get a few stairs (and the odd unclimbable mesa
   * stays scenic). Pure function of position: the lowland pass asks the
   * same question about the tile above it to keep stair feet clear.
   */
  const isRamp = (lx: number, ly: number): boolean => {
    const lvl = L(lx, ly);
    if (lvl === 0 || !isRim(lx, ly)) return false;
    const n = L(lx, ly - 1);
    const e = L(lx + 1, ly);
    const s = L(lx, ly + 1);
    const w = L(lx - 1, ly);
    const cards = [n, e, s, w];
    const lower = cards.filter((c) => c < lvl);
    if (lower.length !== 1 || lower[0] !== lvl - 1) return false;
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
    return hashCoords(seed ^ 0x5aca1e, baseX + lx, baseY + ly) % 6 === 0;
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
      const moisture = fbm(seed + 9999, tx * 0.03, ty * 0.03, 3);
      const roll = hashCoords(seed ^ 0xabcdef, tx, ty) / 4294967296;

      let ground: Tile;
      let detail = Detail.None;
      chunk.elev[i] = lvl;

      if (lvl > 0) {
        // ---------------------------------------- raised terrain
        if (isRim(lx, ly)) {
          ground = isRamp(lx, ly) ? Tile.Ramp : Tile.Cliff;
        } else if (nearRamp(lx, ly)) {
          // Stair tops stay open.
          ground = lvl >= 2 ? Tile.StoneFloor : Tile.Grass;
        } else {
          const formation = fbm(seed + 555, tx * 0.13, ty * 0.13, 2);
          const inFormation = nearRim(lx, ly, 2) && formation > 0.56;
          if (inFormation) {
            // Ore formations hug the rims — richer the higher you climb.
            if (lvl >= 2) {
              ground =
                roll < 0.1 ? Tile.RockIron
                : roll < 0.19 ? Tile.RockCoal
                : roll < 0.25 ? Tile.RockGold
                : roll < 0.52 ? Tile.Rock
                : Tile.StoneFloor;
            } else {
              ground =
                roll < 0.1 ? Tile.RockCopper
                : roll < 0.2 ? Tile.RockTin
                : roll < 0.27 ? Tile.RockIron
                : roll < 0.32 ? Tile.RockCoal
                : roll < 0.58 ? Tile.Rock
                : Tile.StoneFloor;
            }
            if (ground === Tile.StoneFloor && roll > 0.85) detail = Detail.Pebbles;
          } else if (lvl >= 2) {
            // Mesa tops: stark stone with wind-scoured snow patches.
            ground =
              moisture > 0.6 ? Tile.Snow
              : roll < 0.03 ? Tile.Rock
              : Tile.StoneFloor;
            if (ground === Tile.StoneFloor && roll > 0.88) detail = Detail.Pebbles;
          } else {
            // Hardy highland meadow: sparse windswept trees, thin soil.
            ground =
              roll < 0.02 ? Tile.Tree
              : roll < 0.028 ? Tile.Rock
              : moisture < 0.4 ? Tile.StoneFloor
              : roll < 0.14 ? Tile.GrassTall
              : Tile.Grass;
            if (ground === Tile.Grass && roll > 0.9) detail = Detail.Tuft;
            if (ground === Tile.StoneFloor && roll > 0.9) detail = Detail.Pebbles;
          }
        }
      } else if (elevation < 0.3) {
        ground = Tile.WaterDeep;
      } else if (elevation < 0.37) {
        // Shoreline waters host the odd fishing spot.
        const nearLand =
          E(lx + 1, ly) >= 0.37 ||
          E(lx - 1, ly) >= 0.37 ||
          E(lx, ly + 1) >= 0.37 ||
          E(lx, ly - 1) >= 0.37;
        ground = nearLand && roll < 0.05 ? Tile.FishingSpot : Tile.Water;
      } else if (elevation < 0.4) {
        ground = Tile.Sand;
        if (roll < 0.04) detail = Detail.Pebbles;
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
      } else if (moisture > 0.62) {
        // Forest: tree density scales with moisture; some trees are oaks.
        const treeDensity = 0.10 + (moisture - 0.62) * 1.4;
        const oakRoll = hashCoords(seed ^ 0x0acc0de, tx, ty) / 4294967296;
        ground =
          roll < treeDensity ? (oakRoll < 0.18 ? Tile.TreeOak : Tile.Tree) : Tile.Grass;
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
        ground = roll < 0.015 ? Tile.Tree : roll < 0.06 ? Tile.GrassTall : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.9) {
          detail = roll > 0.96 ? Detail.Flowers : Detail.Tuft;
        }
      }

      chunk.ground[i] = ground;
      chunk.detail[i] = detail;
    }
  }
  return chunk;
}

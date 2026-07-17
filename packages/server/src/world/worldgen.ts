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
 */
function elevationAt(seed: number, tx: number, ty: number): number {
  let elevation = fbm(seed, tx * 0.015, ty * 0.015, 4);
  // Continental bias: dry land guaranteed near the town.
  const distFromOrigin = Math.hypot(tx - 48, ty - 48);
  const lift = Math.max(0, 1 - distFromOrigin / 400);
  return elevation * (1 - lift * 0.6) + 0.55 * lift * 0.6;
}

/** Below this world-y everything defaults to solid cave (dungeon land). */
export const DARK_BAND_Y = 512;

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

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const i = ly * CHUNK_SIZE + lx;

      const elevation = elevationAt(seed, tx, ty);
      const moisture = fbm(seed + 9999, tx * 0.03, ty * 0.03, 3);

      const roll = hashCoords(seed ^ 0xabcdef, tx, ty) / 4294967296;

      let ground: Tile;
      let detail = Detail.None;

      if (elevation < 0.3) {
        ground = Tile.WaterDeep;
      } else if (elevation < 0.37) {
        // Shoreline waters host the odd fishing spot.
        const nearLand =
          elevationAt(seed, tx + 1, ty) >= 0.37 ||
          elevationAt(seed, tx - 1, ty) >= 0.37 ||
          elevationAt(seed, tx, ty + 1) >= 0.37 ||
          elevationAt(seed, tx, ty - 1) >= 0.37;
        ground = nearLand && roll < 0.05 ? Tile.FishingSpot : Tile.Water;
      } else if (elevation < 0.4) {
        ground = Tile.Sand;
        if (roll < 0.04) detail = Detail.Pebbles;
      } else if (elevation > 0.78) {
        // Rocky highlands — where the ore lives.
        ground =
          roll < 0.05 ? Tile.RockCopper
          : roll < 0.09 ? Tile.RockIron
          : roll < 0.22 ? Tile.Rock
          : Tile.StoneFloor;
        if (ground === Tile.StoneFloor && roll > 0.9) detail = Detail.Pebbles;
      } else if (moisture > 0.62) {
        // Forest: tree density scales with moisture; some trees are oaks.
        const treeDensity = 0.10 + (moisture - 0.62) * 1.4;
        const oakRoll = hashCoords(seed ^ 0x0acc0de, tx, ty) / 4294967296;
        ground =
          roll < treeDensity ? (oakRoll < 0.18 ? Tile.TreeOak : Tile.Tree) : Tile.Grass;
        if (ground === Tile.Grass && roll > 0.93) detail = Detail.Mushroom;
      } else if (moisture < 0.34) {
        // Dry meadow with the odd boulder and shallow copper.
        ground =
          roll < 0.004 ? Tile.RockCopper
          : roll < 0.02 ? Tile.Rock
          : roll < 0.1 ? Tile.GrassTall
          : Tile.Grass;
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

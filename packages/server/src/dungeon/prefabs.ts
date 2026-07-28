import { Tile } from '@arx/shared';

/**
 * Authored dungeon set-pieces — the predefined half of the hybrid
 * generator. Each prefab is an ASCII stamp: the procedural pass plans
 * WHERE a point of interest lands and how corridors reach it; the
 * prefab says exactly what it looks like when you walk in. Stamps are
 * material-agnostic ('.' resolves to the room's dialect floor) so one
 * arena reads mossy in a cavern and flagstoned in a crypt.
 *
 * Legend:
 *   _  transparent (keep whatever the carve pass left)
 *   #  wall — only OVERWRITES ROCK; floor already carved (a corridor
 *      mouth) survives, which is how prefabs stay connected. Where a
 *      corridor breaches a sealed ring, the stamper hangs a shut
 *      stone door in the gap.
 *   .  dialect floor   ,  rubble floor      ~  shallow water
 *   I  stone pillar    b  brazier           s  stalagmite
 *   m  glowshrooms     o  bone pile         c  crate    l  barrel
 *   W/M/N/G/B  wood / mossy / iron / gilded / boss chest
 *   F  furnace         A  anvil             f  campfire
 *   T  table           h  chair
 */
export interface Prefab {
  rows: string[];
  w: number;
  h: number;
}

function prefab(rows: string[]): Prefab {
  const w = rows[0]!.length;
  for (const r of rows) {
    if (r.length !== w) throw new Error(`ragged prefab row: "${r}"`);
  }
  return { rows, w, h: rows.length };
}

/** Char → tile for everything that isn't dialect-dependent. */
export const PREFAB_TILES: Record<string, Tile> = {
  '#': Tile.CaveWall,
  ',': Tile.CaveRubble,
  '~': Tile.WaterShallow,
  I: Tile.PillarStone,
  b: Tile.Brazier,
  s: Tile.Stalagmite,
  m: Tile.GlowShroom,
  o: Tile.BonePile,
  c: Tile.Crate,
  l: Tile.Barrel,
  W: Tile.ChestWood,
  M: Tile.ChestMossy,
  N: Tile.ChestIron,
  G: Tile.ChestGilded,
  B: Tile.ChestBoss,
  F: Tile.Furnace,
  A: Tile.Anvil,
  f: Tile.Campfire,
  T: Tile.Table,
  h: Tile.Chair,
};

/**
 * The masonry boss hall: pillar colonnade, brazier light, the black
 * chest against the far wall with the boss standing square in front
 * of it. Open south mouth — the approach corridor lands there.
 */
export const ARENA_HALL = prefab([
  '#################',
  '#######.B.#######',
  '###...........###',
  '##..I...b...I..##',
  '##.............##',
  '##.............##',
  '##..I.......I..##',
  '##.............##',
  '##..I...b...I..##',
  '###...........###',
  '####.........####',
]);

/**
 * The cavern arena: a broken oval, stalagmite teeth, glowshroom rim.
 * Reads as grown, not built.
 */
export const ARENA_CAVE = prefab([
  '_____######______',
  '___##......##____',
  '__#....s.....#___',
  '_#..m......s..#__',
  '_#.....B......#__',
  '#...s......m...#_',
  '#......,,......#_',
  '_#..m....s....#__',
  '_#............#__',
  '__##...,,...##___',
  '____#......#_____',
]);

/** A sealed treasure vault — ring broken only by the corridor's door. */
export const VAULT = prefab([
  '#########',
  '#.G...N.#',
  '#b.....b#',
  '#.......#',
  '#########',
]);

/** An abandoned miners' camp: light, stores, somewhere to breathe. */
export const CAMP = prefab([
  '__________',
  '_.c..l.,._',
  '_..f...c._',
  '_.T.h..,._',
  '_..,......',
  '__________',
]);

/** The forgotten forge — smelt your dungeon ore without leaving. */
export const FORGE = prefab([
  '#########',
  '#.F...A.#',
  '#b......#',
  '#...c...#',
  '####.####',
]);

/** An underground spring: wadeable pool, shroom-lit. */
export const SPRING = prefab([
  '__________',
  '__m.~~,.__',
  '_.~~~~~,._',
  '_.,~~~~m._',
  '__.,~~,.__',
  '____,.____',
]);

/** A crypt ossuary: bone heaps and a mossgrown chest among them. */
export const OSSUARY = prefab([
  '___________',
  '_o...b...o_',
  '_..o...o.._',
  '_....M...._',
  '_o.......o_',
  '_...o.o..._',
  '___________',
]);

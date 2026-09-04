import { Tile } from '@arx/shared';

/**
 * Authored dungeon set-pieces — the predefined half of the hybrid
 * generator. Each prefab is an ASCII stamp: the procedural pass plans
 * WHERE a point of interest lands and how corridors reach it; the
 * prefab says exactly what it looks like when you walk in. Stamps are
 * material-agnostic ('.' resolves to the room's dialect floor) so one
 * arena reads mossy in a cavern and flagstoned in a crypt.
 *
 * THE LONG DARK: every set-piece kind is a POOL of variants, seed-
 * picked (and coin-flip mirrored) by the carve pass — repeat keys keep
 * their exact dungeon, new seeds stop rhyming. The war-camp prop shelf
 * (tiles 297–316) joins the legend: the decor the overworld camps
 * earned goes underground.
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
 *   -- the war-camp shelf --
 *   t  standing torch  O  bonfire           Z  war brazier
 *   e  hide tent       E  war tent          k  skull pile
 *   K  skull totem     w  war banner        P  prison cage
 *   x  spike barrier   p  meat spit         r  meat rack
 *   C  cook pot        R  potion rack       n  beast nest
 *   S  plunder sacks   q  spear rack        D  target dummy
 *   u  war drum        H  hide frame
 *   -- THE LONG DARK shelf (tiles 349–368) --
 *   L  moss barrel     U  mine cart       &  chained skeleton
 *   i  wall sconce     j  wall chains     0  sarcophagus
 *   Y  broken pillar   |  grand pillar    a  burial urns
 *   !  ancient statue  g  hanging gibbet  =  stocks
 *   ^  mine brace      )  wall fossil     *  wall web
 *   d  drip pool       Q  cold camp       X  looted chest
 *   y  grave candles   +  iron grate
 *   -- THE SCARRED LAND shelf (tiles 505–511, K1 THE COLD HEARTH) --
 *   "  ruin wall (stone crest)   /  charred beam   <  collapsed roof
 *   %  ash heap                  @  ember bed
 *   (the wall-hung five — & i j ^ ) * — only read walled with rock
 *   due north; stamp them under a '#' row or accept their
 *   freestanding fallback form)
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
  t: Tile.StandingTorch,
  O: Tile.Bonfire,
  Z: Tile.WarBrazier,
  e: Tile.TentHide,
  E: Tile.TentWar,
  k: Tile.SkullPile,
  K: Tile.SkullTotem,
  w: Tile.WarBanner,
  P: Tile.PrisonCage,
  x: Tile.SpikeBarrier,
  p: Tile.MeatSpit,
  r: Tile.MeatRack,
  C: Tile.CookPot,
  R: Tile.PotionRack,
  n: Tile.BeastNest,
  S: Tile.PlunderSacks,
  q: Tile.SpearRack,
  D: Tile.TargetDummy,
  u: Tile.WarDrum,
  H: Tile.HideFrame,
  // THE ROOT-HALLS (the Evenfall epic): the fair kit steps below —
  // the POI legend's digit convention, kept coherent underground.
  '3': Tile.WardArch,
  '4': Tile.ArcaneBeacon,
  '5': Tile.Runestone,
  '8': Tile.ElvenWaystone,
  z: Tile.CrystalCluster,
  // THE CURATED HAND: the LONG DARK decor shelf (349–368) joins the
  // legend, so set-pieces can speak the whole vocabulary.
  L: Tile.MossBarrel,
  U: Tile.MineCart,
  '&': Tile.ChainedSkeleton,
  i: Tile.WallSconce,
  j: Tile.WallChains,
  '0': Tile.Sarcophagus,
  Y: Tile.BrokenPillar,
  '|': Tile.GrandPillar,
  a: Tile.BurialUrns,
  '!': Tile.AncientStatue,
  g: Tile.GibbetCage,
  '=': Tile.Stocks,
  '^': Tile.TimberBrace,
  ')': Tile.WallFossil,
  '*': Tile.WallWeb,
  d: Tile.DripPool,
  Q: Tile.ColdCamp,
  X: Tile.LootedChest,
  y: Tile.CandleShrine,
  '+': Tile.IronGrate,
  // THE SCARRED LAND (the contested lands, K1): the cold hearth's
  // family joins the legend so a set-piece can burn — the crest is
  // the snapped wall's two stubs, the slash the timber that fell.
  '"': Tile.RuinWallStone,
  '/': Tile.CharredBeam,
  '<': Tile.CollapsedRoof,
  '%': Tile.AshHeap,
  '@': Tile.EmberBed,
};

/** Horizontal mirror — the cheap doubling of every authored variant. */
export function mirrorPrefab(pf: Prefab): Prefab {
  return { rows: pf.rows.map((r) => [...r].reverse().join('')), w: pf.w, h: pf.h };
}

// ================================================== the champion's court
//
// THE CHAMPION'S COURT LAW: big, luxurious, unmistakable. A dais at the
// north wall raises the boss chest in the place of honor, framed by the
// theme's own regalia; the floor is wide open for a choreographed
// fight; a ceremonial pair of lights marks the south mouth so the
// threshold reads before you cross it. The boss stands square between
// you and the prize.

/** The crypt's throne hall: colonnade, brazier light, the bone court. */
export const ARENA_CRYPT = prefab([
  '#######################',
  '#######..b.B.b..#######',
  '######y...I.I...y######',
  '###.................###',
  '##...I..........I....##',
  '##...................##',
  '##.o......,.,......o.##',
  '##...................##',
  '##...I..........I....##',
  '##...................##',
  '##.o.......,.......o.##',
  '###....I......I.....###',
  '####...............####',
  '#####....b...b....#####',
  '#######.........#######',
]);

/** The cavern's grotto: stalagmite teeth, shroomlight, a stone shelf. */
export const ARENA_CAVERN = prefab([
  '_______#########_______',
  '_____##....B....##_____',
  '____#..m.......m..#____',
  '___#....s.....s....#___',
  '__#)...............)#__',
  '__#..s....,,,....s..#__',
  '_#........,~,........#_',
  '_#...m....,,,....m...#_',
  '_#...................#_',
  '__#..s...........s..#__',
  '__#.................#__',
  '___#...m.......m...#___',
  '____#....s...s....#____',
  '_____##.........##_____',
  '_______#_______#_______',
]);

/**
 * THE ROOT COURT: the heartwood's grand arena — a grown vault under
 * the oldest roots, runestones standing their broken ring, the ward
 * arches framing a dais the wood built around whatever it buried
 * there, and two fallen lights still burning silver at the mouth.
 */
export const ARENA_HEARTWOOD = prefab([
  '_______#########_______',
  '_____##....B....##_____',
  '____#...3.....3...#____',
  '___#....z.....z....#___',
  '__#.......5.........#__',
  '__#..5....,.,....5..#__',
  '_#........,~,........#_',
  '_#...z....,,,....z...#_',
  '_#...................#_',
  '__#..m.....5.....m..#__',
  '__#.................#__',
  '___#...8.......8...#___',
  '____#....m...m....#____',
  '_____##.........##_____',
  '_______#.4...4.#_______',
]);

/** The mine's foundry floor: the great works, cold and waiting. */
export const ARENA_MINE = prefab([
  '#######################',
  '#######..F.B.A..#######',
  '######^...I.I...^######',
  '###..c..........c...###',
  '##...................##',
  '##..I....,.,.....I...##',
  '##.l.................##',
  '##.........,......c..##',
  '##...................##',
  '##..I............I...##',
  '##.c...............l.##',
  '###....I......I.....###',
  '####...............####',
  '#####....b...b....#####',
  '#######.........#######',
]);

/** The stronghold's war-court: banners, racks, the tyrant's ground. */
export const ARENA_STRONGHOLD = prefab([
  '#######################',
  '#######.w..B..w.#######',
  '######....Z.Z....######',
  '###.q...........q...###',
  '##...................##',
  '##..w.....,.,.....w..##',
  '##...................##',
  '##.S...............S.##',
  '##...................##',
  '##..w.............w..##',
  '##.....u.......c.....##',
  '###.................###',
  '####.g...........g.####',
  '#####....t...t....#####',
  '#######.........#######',
]);

/** The warren's great den: bone, hide, and the Matriarch's mound. */
export const ARENA_WARREN = prefab([
  '_______#########_______',
  '_____##..K.B.K..##_____',
  '____#....k...k....#____',
  '___#*.............*#___',
  '__#..n...........n..#__',
  '__#.......,,,.......#__',
  '_#...H....,o,....H...#_',
  '_#........,,,........#_',
  '_#...................#_',
  '__#..k...........k..#__',
  '__#.......n.........#__',
  '___#...m.......m...#___',
  '____#.............#____',
  '_____##..t...t..##_____',
  '_______#_______#_______',
]);

// ====================================================== the side rooms

/** Sealed treasure vaults — the ring broken only by the corridor's door. */
export const VAULTS: Prefab[] = [
  prefab([
    '#########',
    '#.G...N.#',
    '#b.....b#',
    '#.......#',
    '#########',
  ]),
  prefab([
    '###########',
    '#.N..G..N.#',
    '#b...I...b#',
    '#.........#',
    '#....,....#',
    '###########',
  ]),
  // THE KEPT FLAME: candles burning behind a door nobody has opened —
  // whoever tends this vault does not use the door.
  prefab([
    '###########',
    '#.G..|..G.#',
    '#y.......y#',
    '#....N....#',
    '#....,....#',
    '###########',
  ]),
];

/** Wayfarers' camps: light, stores, somewhere to breathe. */
export const CAMPS: Prefab[] = [
  prefab([
    '__________',
    '_.c..l.,._',
    '_..f...c._',
    '_.T.h..,._',
    '_..,......',
    '__________',
  ]),
  prefab([
    '___________',
    '_.l...c.,._',
    '_..T.f.h.._',
    '_.h....T.._',
    '_.,..c...._',
    '___________',
  ]),
  // THE CAMP BEFORE THIS ONE: wayfarers pitched beside the last
  // party's cold ring and emptied strongbox — everyone stops here,
  // not everyone leaves.
  prefab([
    '____________',
    '_.Q...c.,.__',
    '_..,.f...l._',
    '_.X..T.h.,._',
    '_.,........_',
    '____________',
  ]),
];

/**
 * War camps — the garrison's own ground inside stronghold and warren
 * reissues: tents, the bonfire, meat on the spit, someone in the cage.
 */
export const WARCAMPS: Prefab[] = [
  prefab([
    '____________',
    '_.e...p..,._',
    '_..,.O...r._',
    '_.E.....S.._',
    '_.,..x..P.._',
    '____________',
  ]),
  prefab([
    '_____________',
    '_.,.q...e.,._',
    '_.e...O...E._',
    '_...C....,.._',
    '_.k...u..e.._',
    '_____________',
  ]),
  // THE JUSTICE YARD: the garrison's law in one square — gibbet,
  // stocks, the cage, and the fire they gather at to watch.
  prefab([
    '_____________',
    '_.g....O..e._',
    '_..,......S._',
    '_.=..P....,._',
    '_.,..x..k..._',
    '_____________',
  ]),
];

/** Forgotten forges — smelt your dungeon ore without leaving. */
export const FORGES: Prefab[] = [
  prefab([
    '#########',
    '#.F...A.#',
    '#b......#',
    '#...c...#',
    '####.####',
  ]),
  prefab([
    '##########',
    '#.F.A..F.#',
    '#b.......#',
    '#..c..l..#',
    '#....,...#',
    '####.#####',
  ]),
  // THE TIMBERED WORKS: braces holding the roof over the works, the
  // last haul still sitting in its cart.
  prefab([
    '##########',
    '#^F.A..^.#',
    '#b.......#',
    '#..c..U..#',
    '#...,....#',
    '####.#####',
  ]),
];

/** Underground springs: wadeable pools, shroom-lit. */
export const SPRINGS: Prefab[] = [
  prefab([
    '__________',
    '__m.~~,.__',
    '_.~~~~~,._',
    '_.,~~~~m._',
    '__.,~~,.__',
    '____,.____',
  ]),
  prefab([
    '____________',
    '__m.~~~.,.__',
    '_.~~~~~~,m__',
    '_.,~~s~~~.__',
    '_..~~~~,.___',
    '__m.,~,.____',
    '____________',
  ]),
  // THE SEEPING SPRING: the pool's overflow keeps its own slow clock
  // in mineral-collared drip pools around the rim.
  prefab([
    '____________',
    '__d..~~,.___',
    '_.~~~~~~,d__',
    '_.,~~~~~.___',
    '_d.~~~~,.___',
    '__.,~,.dm___',
    '____________',
  ]),
];

/** Crypt ossuaries: bone heaps and a mossgrown chest among them. */
export const OSSUARIES: Prefab[] = [
  prefab([
    '___________',
    '_o...b...o_',
    '_..o...o.._',
    '_....M...._',
    '_o.......o_',
    '_...o.o..._',
    '___________',
  ]),
  prefab([
    '_____________',
    '_k...b...b.o_',
    '_.o...I...o._',
    '_..o..M..o.._',
    '_.....o....._',
    '_o..k...o..k_',
    '_____________',
  ]),
  // THE TENDED RELIQUARY: coffins laid in rank, urns between, and the
  // candles somebody still lights over them.
  prefab([
    '_____________',
    '_0...y...0.._',
    '_..a...a...._',
    '_.o...M..o.._',
    '_....a......_',
    '_0.......0.._',
    '_____________',
  ]),
];

/** Warren dens: nests, hides, and the pack's gnawed larder. */
export const DENS: Prefab[] = [
  prefab([
    '___________',
    '_.n...r.,._',
    '_..k....n._',
    '_.H...o.,._',
    '_.,.n....._',
    '___________',
  ]),
  prefab([
    '____________',
    '_.k..n..H.,_',
    '_.n...,..r._',
    '_..o.,K...._',
    '_.,..n...k._',
    '____________',
  ]),
  // THE VICTIMS' END: the pack dragged a camp home whole — the cold
  // ring, the strongbox they tore through, the bones they kept.
  prefab([
    '____________',
    '_.n..k..H.._',
    '_..Q....n.._',
    '_.,..X..,.._',
    '_..n...o..._',
    '____________',
  ]),
];

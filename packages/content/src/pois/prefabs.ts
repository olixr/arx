import { TILE_SKIP, Tile } from '@devcraft/shared';
import type { PrefabDef, PrefabSpawn } from '../maps/prefab.js';
import { validatePrefab } from '../maps/prefab.js';

/**
 * BUILT-IN POI PREFABS — the curated half of the wilderness, sketched
 * in the dungeon-prefab ASCII dialect. These are the shipped seeds of
 * the shared library: at boot the server writes any that are missing
 * to data/prefabs/poi_*.json, and a file that EXISTS there wins — so
 * the whole set is curatable in Map Studio without touching code (the
 * file-overrides-builtin law, same as zones).
 *
 * Legend (ground layer; '_' is the TILE_SKIP transparency sentinel —
 * the procedural terrain shows through, which is how a camp sits IN
 * the meadow instead of pasting a rectangle of it):
 *   _ transparent   . grass       , tall grass   : dirt (trampled)
 *   S stone floor   # stone wall  F fence        f campfire
 *   n banner pole   W wood chest  b brazier      o bone pile
 *   r rock          C copper      T tin          I iron ore
 *   t tree          O oak         Y yew          u stump
 *   B berry bush    h fibre       s sagewort
 * Digits 1-9 are spawn markers: each occurrence posts ONE body of the
 * kind the sketch's marker table names, standing on trampled dirt
 * (camps) or grass (wilds). Hand-placed positions; counts live in the
 * marker, levels come from the danger tier at compose time.
 */

const LEGEND: Record<string, number> = {
  _: TILE_SKIP,
  '.': Tile.Grass,
  ',': Tile.GrassTall,
  ':': Tile.Dirt,
  S: Tile.StoneFloor,
  '#': Tile.WallStone,
  F: Tile.Fence,
  f: Tile.Campfire,
  n: Tile.BannerPole,
  W: Tile.ChestWood,
  b: Tile.Brazier,
  o: Tile.BonePile,
  r: Tile.Rock,
  C: Tile.RockCopper,
  T: Tile.RockTin,
  I: Tile.RockIron,
  t: Tile.Tree,
  O: Tile.TreeOak,
  Y: Tile.TreeYew,
  u: Tile.Stump,
  B: Tile.BerryBush,
  h: Tile.FibrePlant,
  s: Tile.WildSagewort,
};

interface Marker {
  npc: string;
  /** Wander/respawn scatter radius for the posted body. */
  radius: number;
  /** Ground tile under the marker. */
  under: Tile;
}

function sketch(
  id: string,
  name: string,
  rows: string[],
  markers: Record<string, Marker> = {},
): PrefabDef {
  const width = rows[0]!.length;
  const height = rows.length;
  const ground = new Uint16Array(width * height);
  const spawns: PrefabSpawn[] = [];
  for (let y = 0; y < height; y++) {
    const row = rows[y]!;
    if (row.length !== width) throw new Error(`${id}: ragged row ${y}: "${row}"`);
    for (let x = 0; x < width; x++) {
      const ch = row[x]!;
      const marker = markers[ch];
      if (marker) {
        ground[y * width + x] = marker.under;
        spawns.push({ dx: x, dy: y, npc: marker.npc, radius: marker.radius, count: 1 });
        continue;
      }
      const tile = LEGEND[ch];
      if (tile === undefined) throw new Error(`${id}: unknown sketch char '${ch}'`);
      ground[y * width + x] = tile;
    }
  }
  const def: PrefabDef = {
    id,
    name,
    width,
    height,
    ground,
    detail: new Uint16Array(width * height),
    elev: new Int8Array(width * height),
    portals: [],
    spawns,
    actorSpawns: [],
  };
  const errors = validatePrefab(def);
  if (errors.length > 0) throw new Error(`${id}: ${errors.join('; ')}`);
  return def;
}

const goblinMarks: Record<string, Marker> = {
  '1': { npc: 'goblin', radius: 2.5, under: Tile.Dirt },
  '2': { npc: 'goblin', radius: 2.5, under: Tile.Dirt },
  '3': { npc: 'goblin_thrower', radius: 2, under: Tile.Dirt },
};

/** A palisaded goblin ring-camp: fire at the heart, loot behind it. */
const goblinCampRing = sketch(
  'poi_goblin_camp_ring',
  'Goblin ring-camp',
  [
    '_____,,,_____',
    '__,:::::::,__',
    '_,::F:::F::,_',
    '_,:.......:,_',
    ',::.1...2.::,',
    ',:....f....:,',
    ',::.3...W.::,',
    '_,:.......:,_',
    '_,::F:n:F::,_',
    '__,:::::::,__',
    '_____,,,_____',
  ],
  goblinMarks,
);

/** A sprawled two-fire goblin camp on a trampled clearing. */
const goblinCampPair = sketch(
  'poi_goblin_camp_pair',
  'Goblin twin-fires',
  [
    '______,,,,_____',
    '__,::::::::,___',
    '_,::f....:::,__',
    ',:.1...2..f::,_',
    ',::...W.....:,_',
    '_,:..n...3..:,_',
    '_,::::::::::,__',
    '___,,::::,,____',
  ],
  goblinMarks,
);

const ruinMarks: Record<string, Marker> = {
  '1': { npc: 'skeleton', radius: 2, under: Tile.StoneFloor },
  '2': { npc: 'skeleton_guard', radius: 2, under: Tile.StoneFloor },
  '3': { npc: 'skeleton_archer', radius: 2, under: Tile.StoneFloor },
};

/** A broken keep: three standing walls, the dead still on watch. */
const ruinKeep = sketch(
  'poi_ruin_keep',
  'Fallen keep',
  [
    '___________',
    '_##.#.###__',
    '_#SSSSSS#__',
    '_.S1S..S.__',
    '_#S.b.WS#__',
    '_#S..2SS.__',
    '_#S3S.oS#__',
    '_##.##.##__',
    '___________',
  ],
  ruinMarks,
);

/** A collapsed shrine ring: braziers still lit over old bones. */
const ruinCircle = sketch(
  'poi_ruin_circle',
  'Sunken shrine',
  [
    '___________',
    '___#.S.#___',
    '__.SSSSS.__',
    '_#SS1oSS#__',
    '_.Sb.W.bS._',
    '_#SS.2SS#__',
    '__.SS3S.___',
    '___#.S.#___',
    '___________',
  ],
  ruinMarks,
);

const wolfMarks: Record<string, Marker> = {
  '1': { npc: 'wolf', radius: 3, under: Tile.Grass },
};

/** An ore knoll standing free of the hills — worth the wolves. */
const groveOre = sketch(
  'poi_grove_ore',
  'Ore knoll',
  [
    '____,____',
    '__r,C,r__',
    '_,T.r.C,_',
    '_.r1I.r._',
    '_,C.r.T,_',
    '__r,T1r__',
    '____,____',
  ],
  wolfMarks,
);

/** An ancient yew stand ringed by oaks, floor thick with forage. */
const groveYew = sketch(
  'poi_grove_yew',
  'Elder grove',
  [
    '____O___O____',
    '__O,,,.,,,O__',
    '_,,B..s..h,,_',
    '_O.,.Y.,..O__',
    '_,.s..1.B.,__',
    '_O..,Y.,..O__',
    '_,,h..s..B,,_',
    '__O,,,.,,,O__',
    '____O___O____',
  ],
  wolfMarks,
);

export const POI_PREFABS: ReadonlyMap<string, PrefabDef> = new Map(
  [goblinCampRing, goblinCampPair, ruinKeep, ruinCircle, groveOre, groveYew].map((p) => [p.id, p]),
);

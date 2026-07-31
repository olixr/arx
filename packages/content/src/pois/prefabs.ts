import { TILE_SKIP, Tile } from '@arx/shared';
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
 *   L lamp post     M market stall  a barrel     c crate
 *   e bench         l wood rail   P pillar       R cave rubble
 *   D delve gate    X iron chest  Z boss chest
 * A 'D' is a WORKING riftgate: the sketch helper registers a delve
 * portal on every PortalDown tile (the tile IS the gate — same law as
 * chests and doors), so keys found in the wild can be turned in the
 * wild.
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
  L: Tile.LampPost,
  M: Tile.MarketStall,
  a: Tile.Barrel,
  c: Tile.Crate,
  e: Tile.Bench,
  l: Tile.RailWood,
  P: Tile.PillarStone,
  R: Tile.CaveRubble,
  D: Tile.PortalDown,
  X: Tile.ChestIron,
  Z: Tile.ChestBoss,
  // The Wild-Between extension: enough vocabulary for cabins, camps,
  // and shrines — walls that enclose, doors that open, beds that say
  // somebody LIVES here.
  w: Tile.WallWood,
  v: Tile.DoorwayWood,
  p: Tile.WoodFloor,
  g: Tile.WallWoodWindow,
  z: Tile.WallStoneWindow,
  y: Tile.DoorwayStone,
  E: Tile.Bed,
  K: Tile.WeaponRack,
  i: Tile.HangingSign,
  k: Tile.Table,
  q: Tile.Chair,
  H: Tile.Hearth,
  G: Tile.CrateGoods,
  V: Tile.CaveWall,
  x: Tile.TreeWillow,
  Q: Tile.ArchStone,
  '~': Tile.WaterShallow,
  '%': Tile.Tilled,
  '*': Tile.WheatMid,
  // The Pinereach extension: taiga, snow, a garrison curtain, and the
  // one bench a logging camp is actually built around.
  j: Tile.TreePine,
  J: Tile.SaplingPine,
  N: Tile.Snow,
  A: Tile.WallGarrison,
  U: Tile.GateGarrison,
  d: Tile.Sawhorse,
};

interface Marker {
  npc: string;
  /** Wander/respawn scatter radius for the posted body. */
  radius: number;
  /** Ground tile under the marker. */
  under: Tile;
  /**
   * Authored level: the body keeps THIS level instead of rolling into
   * the site's danger band — the brigands' stolen cows stay level-3
   * cows no matter how deep the camp stands.
   */
  level?: number;
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
        spawns.push({
          dx: x,
          dy: y,
          npc: marker.npc,
          radius: marker.radius,
          count: 1,
          ...(marker.level !== undefined ? { level: marker.level } : {}),
        });
        continue;
      }
      const tile = LEGEND[ch];
      if (tile === undefined) throw new Error(`${id}: unknown sketch char '${ch}'`);
      ground[y * width + x] = tile;
    }
  }
  // The tile is the gate: every PortalDown in a POI sketch is a delve
  // riftgate — no second bookkeeping to forget.
  const portals: PrefabDef['portals'] = [];
  for (let i = 0; i < ground.length; i++) {
    if (ground[i] === Tile.PortalDown) {
      portals.push({ dx: i % width, dy: Math.floor(i / width), delve: true });
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
    portals,
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

/**
 * A lamplit rest on the long road: keeper's stall by the fire, lamp
 * posts that carry real light after dusk, benches for the sit emote.
 * No spawn markers — the staff arrives through the def's actor
 * entries, placed semantically at compose time.
 */
const waystationCamp = sketch(
  'poi_waystation_camp',
  "Wayfarers' waystation",
  [
    '_____,,,_____',
    '__,:::::::,__',
    '_,:.L...e.:,_',
    '_,:.M..f..:,_',
    '_,:.a.c..e:,_',
    '_,:.L.....:,_',
    '__,:::::::,__',
    '_____,,,_____',
  ],
);

/** The road-house variant: hitching rails, two benches, one lamp. */
const waystationRest = sketch(
  'poi_waystation_rest',
  'Roadside rest',
  [
    '______,,,______',
    '__,::::::::,___',
    '_,:.l.l.l..:,__',
    '_,:.e..f..e:,__',
    '_,:.M....a.:,__',
    '_,:.L..c...:,__',
    '__,::::::::,___',
    '______,,_______',
  ],
);

const riftMarks: Record<string, Marker> = {
  '1': { npc: 'skeleton', radius: 2, under: Tile.StoneFloor },
  '2': { npc: 'skeleton_guard', radius: 2, under: Tile.StoneFloor },
};

/**
 * A broken gate the land forgot: two pillars over a WORKING delve
 * portal (the 'D' registers it), the gatekeeper's iron cache on the
 * court, and the dead still holding the yard.
 */
const riftgateRuin = sketch(
  'poi_riftgate_ruin',
  'Ruined riftgate',
  [
    '_____________',
    '__R..P.P..R__',
    '_.SSSSDSSSS._',
    '_.SS..o..SS._',
    '_,SR..X..RS,_',
    '_.S1S...S2S._',
    '_.RS..b..SR._',
    '__..SSoSS..__',
    '_____________',
  ],
  riftMarks,
);

/**
 * The champion's tor: a ring of standing stones around a plinth and a
 * black chest. The named keeper comes from the def's garrison (names
 * pool + level offset) and clusters at the anchor — the heart of the
 * ring — so the prefab carries no marker.
 */
const championsTor = sketch(
  'poi_champions_tor',
  "Champion's tor",
  [
    '_____________',
    '____P...P____',
    '__P,,,.,,,P__',
    '__,..o...,,__',
    '_P,..SSS.,,P_',
    '_.,..SZS..,._',
    '_P,..S.S..,P_',
    '_.,...n...,._',
    '__P,,,o,,,P__',
    '____P...P____',
    '_____________',
  ],
);

// ------------------------------------------------------------------
// THE WILD BETWEEN — Epic 3's scene library. Every prefab here is a
// place where something HAPPENED: the stolen cow in the brigand pen,
// the toll-gate nobody pays twice, the traveler's chest the wolves
// still guard, the lamp somebody keeps lighting in a tower the Watch
// officially abandoned. Story first, then tiles.
// ------------------------------------------------------------------

const brigandMarks: Record<string, Marker> = {
  '1': { npc: 'brigand', radius: 2.5, under: Tile.Dirt },
  '2': { npc: 'brigand', radius: 2.5, under: Tile.Dirt },
  '3': { npc: 'brigand_archer', radius: 2, under: Tile.Dirt },
  '9': { npc: 'cow', radius: 1, under: Tile.Grass, level: 3 },
};

/**
 * A brigand camp dug into a stump-hollow — they felled the ring
 * themselves. Stolen goods stacked by the fire, the reaver's warded
 * strongbox, and a rail pen holding somebody's cows (the hamlets down
 * the road count their herds and curse).
 */
const banditHollow = sketch(
  'poi_bandit_hollow',
  'Brigand hollow',
  [
    '________,,_______',
    '___,::::::::,____',
    '__,:u.G.c..u:,___',
    '_,:.1...f..2.:,__',
    '_,:..k......X:,__',
    '_,:.3.f....n.:,__',
    '_,:.llll.....:,__',
    '_,:.l99l..a.u:,__',
    '__,:llll...:,____',
    '___,:::::::,_____',
    '______,,_________',
  ],
  brigandMarks,
);

/**
 * The toll-gate: an old cart track crosses the camp, banner poles
 * flank it, and the strewn crates and bones tell you exactly how the
 * last argument about the toll went.
 */
const banditToll = sketch(
  'poi_bandit_toll',
  "Thieves' toll",
  [
    '_____,,,________',
    '__,::::::,,,____',
    '_,:.c.a..G.:,___',
    '_,:.1..f..2.:,__',
    '_::::::::::::::_',
    '_,:n..o...n.:,__',
    '_,:.3...X...:,__',
    '_,:..c.::.a.:,__',
    '__,::::::::,____',
    '______,,________',
  ],
  brigandMarks,
);

/**
 * THE COVETOUS CAMP (living-frontier Phase 4): a raider squat thrown
 * up in a night — one fire, one stolen banner, packs still roped. It
 * reads TEMPORARY on purpose: no pen, no stump-work, half the crates
 * unopened. The worn track and the watchers all face the homestead it
 * covets (composePoi's `face` override), never the road.
 */
const raiderSquat = sketch(
  'poi_raider_squat',
  'Raider squat',
  [
    '_____,,,______',
    '__,::::::,____',
    '_,:.c..1.:,___',
    '_,:..f...n:,__',
    '_,:2...W.:,___',
    '_,:.a..3.:,___',
    '__,::::::,____',
    '_____,,_______',
  ],
  brigandMarks,
);

/**
 * THE PEDDLER'S REST (living-frontier Phase 5): a handcart pulled off
 * the verge — goods crate and barrel between rail shafts, one small
 * fire, no fence and no chest. It reads PASSING-THROUGH on purpose:
 * she was not here yesterday and will not be here tonight. The actor
 * pool (tinker / herb-wife / relic-monger) stands at the hearth.
 */
const peddlerRest = sketch(
  'poi_peddler_rest',
  "Peddler's rest",
  [
    '____,,,____',
    '__,:::::,__',
    '_,:.l.G.:,_',
    '_,:..fc.:,_',
    '_,:.l.a.:,_',
    '__,:::::,__',
    '____,,_____',
  ],
  {},
);

const hamletMarks: Record<string, Marker> = {
  '8': { npc: 'chicken', radius: 1.5, under: Tile.Grass, level: 1 },
  '9': { npc: 'cow', radius: 1, under: Tile.Grass, level: 3 },
};

/**
 * A crofter's stead holding the verge: one snug cabin (hearth, bed,
 * a table set for two), the fenced grain plot, hens loose in the
 * yard, and the woodpile that says winter is taken seriously.
 */
const hamletCroft = sketch(
  'poi_hamlet_croft',
  'Roadside croft',
  [
    '_______,,,________',
    '__,,.........,,___',
    '_,.wwgww......,,__',
    '_,.wpppw.FFFFF.,__',
    '_,.wEppv.F%*%F.,__',
    '_,.wkqHw.F*%*F.,__',
    '_,.wwgww.F%*%F.,__',
    '_,..:....FF.FF.,__',
    '_,.c:.f........,__',
    '_,.c:...8..8...,__',
    '_,....i.......,,__',
    '__,,.........,,___',
    '________,,________',
  ],
  hamletMarks,
);

/**
 * Two households, one fire — the cabins face each other across the
 * pit the way old neighbors argue: daily, warmly, forever. The cow
 * pen is shared. The chicken is nobody's and everybody's.
 */
const hamletPair = sketch(
  'poi_hamlet_pair',
  'Twin-hearth hamlet',
  [
    '________,,,________',
    '__,,..........,,___',
    '_,.wwgww..wwgww.,__',
    '_,.wpppw..wpppw.,__',
    '_,.wEppv..vppEw.,__',
    '_,.wkqpw..wqkHw.,__',
    '_,.wwgww..wwgww.,__',
    '_,....:....:....,__',
    '_,....:.f..:....,__',
    '_,.llll.......i.,__',
    '_,.l99l..8......,__',
    '_,.llll........,,__',
    '__,,..........,,___',
    '_________,,________',
  ],
  hamletMarks,
);

const outpostMarks: Record<string, Marker> = {
  // The pen's guest of honor: a raider the Watch actually caught —
  // an ordinary one (level authored), not a tier-scaled terror.
  '5': { npc: 'goblin', radius: 0.4, under: Tile.Dirt, level: 5 },
};

/**
 * A Waykeeper watchtower on the wild marches: stone shell, brazier
 * always lit, racks kept full — and the prisoner pen out front
 * holding this week's catch, which yells at everyone who passes.
 */
const outpostTower = sketch(
  'poi_outpost_tower',
  "Waykeepers' watchtower",
  [
    '______,,,_______',
    '__,..........,__',
    '_,.##z##..n...,_',
    '_,.#SKS#.llll.,_',
    '_,.#SbSy.l5.l.,_',
    '_,.#SSS#.llll.,_',
    '_,.#####......,_',
    '_,..:...f..c..,_',
    '_,..:...a..K..,_',
    '_,...i........,_',
    '__,..........,__',
    '_______,,_______',
  ],
  outpostMarks,
);

/**
 * The palisade ring: a fence fort thrown up in a season, gate to the
 * south, everything inside arranged by someone who has done this
 * before — fire center, racks reachable, supplies off the mud.
 */
const outpostRing = sketch(
  'poi_outpost_ring',
  "Waykeepers' ring-fort",
  [
    '______,,________',
    '__,..........,__',
    '_,.PFFFFFFFFP.,_',
    '_,.F...c..a.F.,_',
    '_,.F..K.f...F.,_',
    '_,.F.e....k.F.,_',
    '_,.F........F.,_',
    '_,.PFFF..FFFP.,_',
    '_,....:..i....,_',
    '_,....::......,_',
    '__,..........,__',
    '______,,________',
  ],
);

const koboldDigMarks: Record<string, Marker> = {
  '1': { npc: 'kobold', radius: 2, under: Tile.Dirt },
  '2': { npc: 'kobold', radius: 2, under: Tile.Dirt },
};

/**
 * An open dig biting into an ore seam — shoring timbers, spoil
 * rubble, and the warren's strongbox sitting in the pit because
 * kobolds trust holes more than they trust each other.
 */
const digsPit = sketch(
  'poi_digs_pit',
  'Kobold digs',
  [
    '_____,,________',
    '__,::::::::,___',
    '_,:RC::T::R:,__',
    '_,:l::::::l:,__',
    '_,:l1:I::2l:,__',
    '_,:l::b:::l:,__',
    '_,::c:W:a::,___',
    '_,:R:::C:::,___',
    '__,::::::::,___',
    '_____,,________',
  ],
  koboldDigMarks,
);

/**
 * A tunnel mouth into a rock knoll: braziers flank the dark, the
 * cache sits just inside where the light gives out, and the spoil
 * heap says the digging goes DEEP.
 */
const digsMouth = sketch(
  'poi_digs_mouth',
  'Warren mouth',
  [
    '____,,,,______',
    '__,VVVVVV,____',
    '_,:VVXVVV:,___',
    '_,:Vb:bV::,___',
    '_,::::::R:,___',
    '_,:c:1:T::,___',
    '_,:R:::a::,___',
    '__,::::::,____',
    '____,,,_______',
  ],
  koboldDigMarks,
);

/**
 * The den in the rocks — and the story of how it got its bones: a
 * traveler's cold camp, the crate torn open, the iron chest the pack
 * neither opened nor left. Somebody should carry word back.
 */
const denBones = sketch(
  'poi_den_bones',
  'Wolfkin den',
  [
    '_____,,,_______',
    '__,,......,,___',
    '_,.rrr..o..,,__',
    '_,rrXrr...1.,__',
    '_,.r.r..o...,__',
    '_,.o.....f..,__',
    '_,.1...c....,__',
    '__,..o...,,,___',
    '____,,,________',
  ],
  wolfMarks,
);

/**
 * A trampled hollow ringed by stumps the pack has scent-marked to
 * death — bones dragged to the middle, and the last owner's chest
 * shoved under the rocks by something that didn't understand locks.
 */
const denHollow = sketch(
  'poi_den_hollow',
  'Pack hollow',
  [
    '____,,,_______',
    '__,u.....u,___',
    '_,.,,o.,,.,,__',
    '_,u.1...o.u,__',
    '_,.o..rX...,__',
    '_,....rr...,__',
    '_,u..1...u.,__',
    '__,o......,___',
    '____,,,_______',
  ],
  wolfMarks,
);

/**
 * A tower of the old Waykeeper line, breached and left. By daylight
 * it's a free chest and a view; after dusk the garrison that died
 * holding it stands its watch again. Loot fast or fight fair.
 */
const watchtowerHusk = sketch(
  'poi_watchtower_husk',
  'Broken watchtower',
  [
    '____,,,_______',
    '__,.......,___',
    '_,..##S##..,__',
    '_,.#SSSSS#.,__',
    '_,.#SXSbS..,__',
    '_,.#SSSSSR.,__',
    '_,..#SS#R..,__',
    '_,...o.R...,__',
    '_,..o...,,.,__',
    '__,.......,___',
    '____,,,_______',
  ],
);

/**
 * The tower's standing sibling: door on its hinges, bench swept,
 * cache stocked — and the lamp over the door burning, though the
 * Watch struck this post from the rolls thirty years ago. Somebody
 * keeps lighting it. At night, you'll meet them.
 */
const watchtowerShelter = sketch(
  'poi_watchtower_shelter',
  'Wayline shelter',
  [
    '____,,,_______',
    '__,........,__',
    '_,..##z##..,__',
    '_,.#SSSSS#.,__',
    '_,.#SeSWS#.,__',
    '_,.#SSSSS#.,__',
    '_,..##y##..,__',
    '_,...:L....,__',
    '_,.l.:..l..,__',
    '__,........,__',
    '____,,,_______',
  ],
);

/**
 * A wayshrine of the road-faith: stones, a brazier the passing keep
 * fed, a bench for the tired, and herbs seeded by a hundred grateful
 * hands. Danger owns the miles; it does not own this circle.
 */
const wayshrineStones = sketch(
  'poi_wayshrine_stones',
  'Wayshrine',
  [
    '___,,,______',
    '__,..P..,___',
    '_,.s...B.,__',
    '_,P.SSS..,__',
    '_,..SbS.P,__',
    '_,P.SeS..,__',
    '_,...i.B.,__',
    '__,.,,..,___',
    '____,,______',
  ],
);

/**
 * A spring the road-faith blessed: clear water, one old stone, a
 * bench under the willow. Travelers leave the pool cleaner than
 * they found it. Even brigands. Nobody discusses this.
 */
const wayshrinePool = sketch(
  'poi_wayshrine_pool',
  'Blessed spring',
  [
    '___,,,,______',
    '__,.....x,___',
    '_,..~~~..,,__',
    '_,.~~~~~.B,__',
    '_,.~~~~~..,__',
    '_,P.~~~.e.,__',
    '_,.s..h..,___',
    '__,.,,..i,___',
    '____,,,______',
  ],
);

/**
 * The warcamp grown teeth: a full stockade with gates north and
 * south, three fires' worth of warband, and banners at the south
 * gate so you know whose toll you're refusing.
 */
const goblinStockade = sketch(
  'poi_goblin_stockade',
  'Goblin stockade',
  [
    '______,,,_______',
    '__,::::::::::,__',
    '_,:FFFF::FFFF:,_',
    '_,:F........F:,_',
    '_,:F.f.1..f.F:,_',
    '_,:F...W....F:,_',
    '_,:F.2...3..F:,_',
    '_,:F...f....F:,_',
    '_,:FFFF::FFFF:,_',
    '_,::n::::::n::,_',
    '__,::::::::::,__',
    '_____,,,________',
  ],
  goblinMarks,
);

/**
 * One arch still standing over a road that no longer exists — the
 * pavers run twenty feet and stop. The dead hold the span like it
 * still leads somewhere. Perhaps for them it does.
 */
const ruinArch = sketch(
  'poi_ruin_arch',
  'Orphaned arch',
  [
    '____,,,_______',
    '__,.......,___',
    '_,.P..o.P.,,__',
    '_,.SS.SSS..,__',
    '_,.SQSSWS..,__',
    '_,.SS1SSS2.,__',
    '_,..R.SS.R.,__',
    '_,.o..S..,.,__',
    '__,.......,___',
    '____,,,_______',
  ],
  ruinMarks,
);

/**
 * A cold spring rimmed in forage — berry, flax, sageweort all
 * crowding the water. The grove's answer to a market square, with
 * the grove's idea of a stall keeper.
 */
const groveSpring = sketch(
  'poi_grove_spring',
  'Cold spring',
  [
    '____,,,______',
    '__,,...x,,___',
    '_,.B.,,..B,__',
    '_,,.~~~..s,__',
    '_,.~~~~~..,__',
    '_,s.~~~.h.,__',
    '_,.h..1..B,__',
    '_,x..,,.,,,__',
    '____,,,______',
  ],
  wolfMarks,
);

/**
 * A riftgate half-swallowed by the hill that grew over it — one
 * pillar up, one down, the gate itself still humming under the
 * rubble. The dead here aren't guarding it. They're waiting by it.
 */
const riftgateSunken = sketch(
  'poi_riftgate_sunken',
  'Sunken riftgate',
  [
    '____,,,______',
    '__,R....R,___',
    '_,.P.SSS..,__',
    '_,.SSSDSR.,__',
    '_,.RS.o.SS,__',
    '_,.S1.X.2.,__',
    '_,..RSSR..,__',
    '__,..o...,___',
    '____,,,______',
  ],
  riftMarks,
);

/**
 * A turf barrow with a rock crown — older than the roads, older
 * than the names on the stones. The black chest at its heart has
 * outlasted every hand that closed it. The offerings outside are
 * newer. Much newer.
 */
const championsBarrow = sketch(
  'poi_champions_barrow',
  "Champion's barrow",
  [
    '____,,,,______',
    '__,......,,___',
    '_,..:::r..,,__',
    '_,.::::::o.,__',
    '_,.:rZ:r:..,__',
    '_,.::::::.,,__',
    '_,..r:::o..,__',
    '_,.o..:..,.,__',
    '__,...:..,,___',
    '____,,,_______',
  ],
);

/**
 * The walled rest: two stone windbreaks against the weather the
 * high country throws, rails for the animals, and the keeper's
 * stall in the lee corner. Lamps mark it long before you see walls.
 */
const waystationWalled = sketch(
  'poi_waystation_walled',
  'Walled rest',
  [
    '_____,,,_______',
    '__,::::::::,___',
    '_,:##..M.a.:,__',
    '_,:#.e.f...:,__',
    '_,:...e..c.:,__',
    '_,:.L....##:,__',
    '_,:l.l..L.#:,__',
    '__,::::::::,___',
    '_____,,________',
  ],
);

/**
 * THE LAST LAMP — the final light on the High Road before the
 * Silverspine climb. Four lamps, a long wall against the north
 * dark, and outside it the memorial row: bones and a banner for
 * the ones who wouldn't wait for morning. The keeper's advice is
 * one word long and free.
 */
const lastLamp = sketch(
  'poi_last_lamp',
  'The Last Lamp',
  [
    '______,,,________',
    '__,.o.n..o..,____',
    '_,:#########:,___',
    '_,:#.L.e.L.#:,___',
    '_,:...M.f...:,___',
    '_,:.a...e.c.:,___',
    '_,:.L..e..L.:,___',
    '_,:l.l...l.l:,___',
    '__,::::::::,_____',
    '__,..i...,,,_____',
    '_____,,,_________',
  ],
);

/**
 * THE TOLLHOUSE (factions Phase 4) — the Red Company's toll seat on
 * the High Road's first climb. A rail bar across the worn approach,
 * the broker's table under a lean-to, red banners, a fire the guards
 * never let die. No garrison: the Company talks here — the sketch is
 * a checkpoint, not a camp.
 */
const companyTollhouse = sketch(
  'poi_company_tollhouse',
  'The Tollhouse',
  [
    '____,,,,,,_____',
    '__,,t.n..n.t,,_',
    '_,:.l..k..l.:,_',
    '_,:.l.qka.l.:,_',
    '_,:....f....:,_',
    '_,:.c.....a.:,_',
    '_,,l.l.i.l.l,,_',
    '____,,:::,,____',
    '_____,,,,,_____',
  ],
);

/**
 * THE HOARGATE (the Pinereach epic) — the Crown's garrison across the
 * narrows north of Silverfall. Two towers, a covered passage, and a
 * gate in the NORTH curtain because that is the direction nobody
 * sensible walks: the muster yard opens south onto the road, so a
 * traveller reads the fire, the benches and the boards before they
 * ever read the gate. Snow on the shoulders, pines on both hems, and
 * three signs that do not hedge.
 */
const hoargateFort = sketch(
  'poi_hoargate',
  'The Hoargate',
  [
    '____,,,jjj,,,,,jjj,,___',
    '__,....N........N...,__',
    '_,.AAAAAAAUUUAAAAAAA.,_',
    '_,.A#zzz#SSSSS#zzz#A.,_',
    '_,.A#SbS#SSSSS#SbS#A.,_',
    '_,.A#SKS#SSSSS#SKS#A.,_',
    '_,.A##y##SSSSS##y##A.,_',
    '_,.ASnSSSSSSSSSSSnSA.,_',
    '_,.ASSSeSSSfSSSeSSSA.,_',
    '_,.ASSSaSSSSSSScSSSA.,_',
    '_,.ASSSSSSSSSSSSSSSA.,_',
    '_,.AAAAAAAUUUAAAAAAA.,_',
    '_,...:::::::::::::...,_',
    '__,....i.......i....,__',
    '___,,,jjj,,,,,jjj,,,___',
  ],
);

/**
 * THE WARDLINE CUT (the Pinereach epic) — a poacher camp in the old
 * wood east of Pinewatch. Everything in it is stolen work: a skid
 * road dragged through the moss, great pines down in rows, spars
 * stacked where no wain can legally reach them, and a lean-to that
 * has been slept in too long to be one season's crime. The board at
 * the foot is the town's own boundary marker, pulled up and re-used.
 */
const wardlineCut = sketch(
  'poi_wardline_cut',
  'The Wardline Cut',
  [
    '___,,jjj,,,,jjj,___',
    '__,.u..:::::..u.,__',
    '_,..u.:::::::.u..,_',
    '_,.uu.:wwvww:.uu.,_',
    '_,..u.:wpppw:.u..,_',
    '_,.d..:wpEpw:..d.,_',
    '_,....:wwwww:....,_',
    '_,.c..:..f..:..a.,_',
    '_,.cc.:.W.k.:.aa.,_',
    '_,.u..:::::::..u.,_',
    '_,..uu.:::::.uu..,_',
    '__,..u...i...u..,__',
    '___,,jjj,,,,jjj,___',
  ],
);

// ----------------------------------------------------- THE SMALL FINDS
// (docs/lived-in-land-plan.md Phase 2.) Footprints stay tiny — the
// texture layer must read as something the land grew, not a site the
// player owes a fight. No spawn markers: a find's bodies come from
// its DEF garrison (hours and tiers live there), never the sketch.

/** A cold-camped fire ring, a stump seat, and whatever got left. */
const findHuntersRest = sketch('find_hunters_rest', "Hunter's rest", [
  '__,.,__',
  ',..f..,',
  ',.uW..,',
  ',..:..,',
  '__,.,__',
]);

/** Trapper's stakes strung between the tussocks. */
const findSnareLine = sketch('find_snare_line', 'Snare line', [
  ',.F.F.,',
  '.:.:.:.',
  ',F...F,',
]);

/** Stacked stones older than any road. */
const findWaymarkCairn = sketch('find_waymark_cairn', 'Waymark cairn', [
  '_,.,_',
  ',.r.,',
  '.rPr.',
  ',.r.,',
  '_,.,_',
]);

/** A dragged kill, picked over and not finished. */
const findBonePile = sketch('find_bone_pile', 'Bone pile', [
  '_,..,_',
  ',.oo.,',
  '.o::o.',
  ',.o..,',
  '_,..,_',
]);

/** A dug hollow under the rocks, floored with old bones. */
const findDenMouth = sketch('find_den_mouth', 'Den mouth', [
  '_,rrr,_',
  ',rRRr.,',
  ',R::o.,',
  '_,...,_',
]);

/** Burrow mouths in trampled earth. */
const findWarren = sketch('find_warren', 'Warren', [
  '_,..,_',
  ',:R:.,',
  ',.:R,_',
  '_,..,_',
]);

/** A sweet pocket of forage the herds know. */
const findGlade = sketch('find_glade', 'Glade', [
  '_,,..,,_',
  ',.B..h.,',
  ',s.,,.B,',
  ',.h..s.,',
  '_,,..,,_',
]);

/** One worked stone on a worn plinth. */
const findStandingStone = sketch('find_standing_stone', 'Standing stone', [
  '_,..,_',
  ',.SS.,',
  ',SPS.,',
  ',.S..,',
  '_,..,_',
]);

/** A cart that lost the argument with the ground. */
const findWreckedCart = sketch('find_wrecked_cart', 'Wrecked cart', [
  '_,....,_',
  ',.l:a..,',
  ',:lW:c.,',
  ',..:...,',
  '_,....,_',
]);

/** A bowyer's tree, worked and abandoned mid-season. */
const findTappedYew = sketch('find_tapped_yew', 'Tapped yew', [
  '_,..,_',
  ',.uY.,',
  ',.cu.,',
  '_,..,_',
]);

/** A low stone ring over old bones. */
const findBarrow = sketch('find_barrow', 'Old barrow', [
  '_,....,_',
  ',.SoS..,',
  ',So:oS.,',
  ',.SoS..,',
  '_,....,_',
]);

export const POI_PREFABS: ReadonlyMap<string, PrefabDef> = new Map(
  [
    goblinCampRing,
    goblinCampPair,
    ruinKeep,
    ruinCircle,
    groveOre,
    groveYew,
    waystationCamp,
    waystationRest,
    riftgateRuin,
    championsTor,
    // The Wild Between (Epic 3):
    banditHollow,
    banditToll,
    hamletCroft,
    hamletPair,
    outpostTower,
    outpostRing,
    digsPit,
    digsMouth,
    denBones,
    denHollow,
    watchtowerHusk,
    watchtowerShelter,
    wayshrineStones,
    wayshrinePool,
    goblinStockade,
    ruinArch,
    groveSpring,
    riftgateSunken,
    championsBarrow,
    waystationWalled,
    lastLamp,
    companyTollhouse,
    // The Hearth Watch (living frontier, phase 4):
    raiderSquat,
    // The Road's Fortune (living frontier, phase 5):
    peddlerRest,
    // The Pinereach (the north wall and the deep wood):
    hoargateFort,
    wardlineCut,
    // The Small Finds (the lived-in land, phase 2):
    findHuntersRest,
    findSnareLine,
    findWaymarkCairn,
    findBonePile,
    findDenMouth,
    findWarren,
    findGlade,
    findStandingStone,
    findWreckedCart,
    findTappedYew,
    findBarrow,
  ].map((p) => [p.id, p]),
);

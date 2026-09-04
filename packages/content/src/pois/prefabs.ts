import { TILE_SKIP, Tile } from '@arx/shared';
import type { PrefabDef, PrefabSpawn } from '../maps/prefab.js';
import { LANDMARK_PREFABS } from './landmarks.js';
import { QUIET_WAYSIDE_CAP, WING_POOL_CAP, declareInfluence, expandInfluence } from './influence.js';
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
 * War-camp vocabulary (THE CAMP BARES ITS TEETH — the fortifier's
 * punctuation, letters having run out):
 *   | palisade      / \ 45° turns   = gate open   + gate shut
 *   ! torch         @ bonfire       & war brazier
 *   ^ hide tent     m war tent      0 skull pile  ? skull totem
 *   > war banner    [ prison cage   < spike barrier
 *   - meat spit     ) meat rack     { cook pot    } potion rack
 *   ; beast nest    $ plunder       ] spear rack  ( target dummy
 *   " war drum      ` hide frame
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
  // THE CAMP BARES ITS TEETH: the war camp's own vocabulary
  // (docs/war-camp-decor-plan.md). Letters ran out — the fortifier's
  // punctuation reads true in a sketch: | is the spiked wall, = its
  // gate, ! a standing torch, @ the great bonfire.
  '|': Tile.Palisade,
  '/': Tile.PalisadeDiagNE,
  '\\': Tile.PalisadeDiagNW,
  '=': Tile.PalisadeGate,
  '+': Tile.PalisadeGateShut,
  '!': Tile.StandingTorch,
  '@': Tile.Bonfire,
  '&': Tile.WarBrazier,
  '^': Tile.TentHide,
  m: Tile.TentWar,
  '0': Tile.SkullPile,
  '?': Tile.SkullTotem,
  '>': Tile.WarBanner,
  '[': Tile.PrisonCage,
  '<': Tile.SpikeBarrier,
  '-': Tile.MeatSpit,
  ')': Tile.MeatRack,
  '{': Tile.CookPot,
  '}': Tile.PotionRack,
  ';': Tile.BeastNest,
  $: Tile.PlunderSacks,
  ']': Tile.SpearRack,
  '(': Tile.TargetDummy,
  '"': Tile.WarDrum,
  '`': Tile.HideFrame,
  // THE KINGSDELF EXTENSION: the burn's ore. The apostrophe is the
  // last free ASCII mark (obsidian's glint); starfall rides the 9 —
  // digits fall through to the legend when a sketch's marker table
  // does not claim them (sketch() checks markers first), and no
  // sketch will ever muster nine kinds of body.
  "'": Tile.RockObsidian,
  '9': Tile.RockStarfall,
  // THE EVERWOOD EXTENSION: the fair house steps into the wild. The
  // letters ran out two epics ago and the marks ran out one — the
  // remaining digits carry the elven kit (digits fall through to the
  // legend only when a sketch's marker table does not claim them, and
  // no elven sketch musters more than two kinds of body).
  '3': Tile.WardArch,
  '4': Tile.ArcaneBeacon,
  '5': Tile.Runestone,
  '6': Tile.ElvenBench,
  '7': Tile.RunePillar,
  '8': Tile.ElvenWaystone,
};

export interface Marker {
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

// Exported for the stronghold Foundry's ward pieces (strongholds/
// pieces.ts) — one sketch dialect, one legend, everywhere.
//
// THE RAISED GROUND (strongholds Phase 2): an optional parallel
// elevation plane, same dimensions as the ground rows — '_' or '0'
// is flat, digits 1-3 raise the cell. Height is RENDER-ONLY (the
// shelf law: the Cliff/Ramp fence ring is the whole collision
// story), so a sketch that raises ground must also draw its fence —
// the stronghold validator holds that law for layouts.
export function sketch(
  id: string,
  name: string,
  rows: string[],
  markers: Record<string, Marker> = {},
  elevRows?: string[],
  // Per-sketch legend extension: the global ASCII ran out at
  // Kingsdelf, so a themed sketch family may RE-VOICE marks locally
  // (resolution order: markers, then the local legend, then the
  // global). A local mark shadows the global one for THIS sketch
  // only — the skral camps fly ')' as a drying rack while the war
  // camps keep it as a meat rack.
  legendExt?: Record<string, number>,
): PrefabDef {
  const width = rows[0]!.length;
  const height = rows.length;
  const ground = new Uint16Array(width * height);
  const elev = new Int8Array(width * height);
  if (elevRows) {
    if (elevRows.length !== height) throw new Error(`${id}: elev plane has ${elevRows.length} rows, ground has ${height}`);
    for (let y = 0; y < height; y++) {
      const row = elevRows[y]!;
      if (row.length !== width) throw new Error(`${id}: ragged elev row ${y}: "${row}"`);
      for (let x = 0; x < width; x++) {
        const ch = row[x]!;
        if (ch === '_' || ch === '0') continue;
        if (ch >= '1' && ch <= '3') elev[y * width + x] = ch.charCodeAt(0) - 48;
        else throw new Error(`${id}: unknown elev char '${ch}' (use _ 0 1 2 3)`);
      }
    }
  }
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
      const tile = legendExt?.[ch] ?? LEGEND[ch];
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
    elev,
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

// THE WARREN SPEAKS LOCAL (the skral precedent — the global ASCII
// ran out at Kingsdelf): the camps' second shelf rides a per-sketch
// legend, shadowing marks no camp sketch flies in their global
// sense. The shadows are mnemonic on purpose: the goblin's bed
// shadows the town's bed ('E'), the war table the table ('k'), the
// grog tub the barrel ('a'), the critter cage the crate ('c'), the
// gnaw trough the stump ('u'), the cart the wood wall ('w' — no
// camp builds in planks), and 'Y' IS the trophy stake's silhouette.
const campLife: Record<string, number> = {
  o: Tile.BoneMidden,
  Y: Tile.TrophyStake,
  a: Tile.GrogTub,
  x: Tile.KnucklePit,
  E: Tile.RagNest,
  J: Tile.BeastStake,
  c: Tile.CritterCage,
  G: Tile.AlarmGong,
  k: Tile.WarTable,
  w: Tile.PlunderCart,
  e: Tile.BossEffigy,
  u: Tile.GnawTrough,
};

// THE SCARRED LAND SPEAKS LOCAL (docs/contested-lands-plan.md §6.3):
// the contested-lands kit's per-sketch legend, shadowing globals the
// way the camps' does, laid down in K0 so the K1–K3 sketches
// (`poi_burnt_steading`, `poi_field_after`, `poi_muster_ground`, the
// re-dressed `poi_watchtower_husk`) fly one dialect. Mnemonic on
// purpose: the ruin walls shadow the living walls ('#' stone, 'T'
// timber), the ash heap the barrel ('a'), the ember bed the fire
// ('f'), the chimney the pillar ('I'), the carts the wood wall ('w')
// and the plunder cart ('W'), the dead tree the tree ('t'), the
// broken fence the fence ('F'), the dark lamp the lamp ('d'). No
// sketch flies it yet (K0 ships no sketches).
export const scarredLand: Record<string, number> = {
  '#': Tile.RuinWallStone,
  T: Tile.RuinWallWood,
  v: Tile.CharredBeam,
  A: Tile.CollapsedRoof,
  a: Tile.AshHeap,
  f: Tile.EmberBed,
  I: Tile.ChimneyStack,
  w: Tile.BrokenCart,
  l: Tile.FieldLitter,
  i: Tile.ArrowPost,
  n: Tile.FallenBanner,
  c: Tile.FieldCairn,
  C: Tile.CairnFallen,
  o: Tile.BeastBones,
  u: Tile.CharredStump,
  t: Tile.DeadTree,
  h: Tile.SpoilHeap,
  g: Tile.GloomStone,
  r: Tile.CreepRoot,
  p: Tile.FoulPool,
  x: Tile.CropBlighted,
  P: Tile.CharterPost,
  L: Tile.LampCairn,
  N: Tile.LegionStandard,
  Y: Tile.BoneTree,
  y: Tile.TallyStone,
  '~': Tile.WardThread,
  '!': Tile.RedRagStake,
  m: Tile.PitLamp,
  M: Tile.PitLampDark,
  '^': Tile.LeanTo,
  E: Tile.Bedroll,
  W: Tile.BelongingsCart,
  K: Tile.FieldCot,
  F: Tile.FenceBroken,
  s: Tile.SignpostBurnt,
  q: Tile.WellFouled,
  H: Tile.HedgeDead,
  d: Tile.LampPostDark,
  '=': Tile.SluiceGate,
  '%': Tile.SluiceGateStrung,
};

/** A palisaded goblin ring-camp: fire at the heart, loot behind it —
 *  and the warren's life around it: a bed-nest by the tent, grog at
 *  the fire, last week's dinners heaped by the skull count. */
const goblinCampRing = declareInfluence(sketch(
  'poi_goblin_camp_ring',
  'Goblin ring-camp',
  [
    '_____,,,_____',
    '__,:::::::,__',
    '_,::|:!:|::,_',
    '_,:.^E....:,_',
    ',::.1...2.::,',
    ',:...af..-.:,',
    ',::.3...W.::,',
    '_,:.0..o..:,_',
    '_,::|:>:|::,_',
    '__,:::::::,__',
    '_____,,,_____',
  ],
  goblinMarks,
  undefined,
  campLife,
), { cap: WING_POOL_CAP });

/** A sprawled two-fire goblin camp on a trampled clearing — dice by
 *  the first fire, a rag bed by the tent, the midden at the edge. */
const goblinCampPair = declareInfluence(sketch(
  'poi_goblin_camp_pair',
  'Goblin twin-fires',
  [
    '______,,,,_____',
    '__,::::::::,___',
    '_,::f.x^.:::,__',
    ',:.1...2E.f::,_',
    ',::...W...-.:,_',
    '_,:..>...3..:,_',
    '_,:::0o:::::,__',
    '___,,::::,,____',
  ],
  goblinMarks,
  undefined,
  campLife,
), { cap: WING_POOL_CAP });

const gnollMarks: Record<string, Marker> = {
  '1': { npc: 'gnoll', radius: 2, under: Tile.StoneFloor },
  '2': { npc: 'gnoll', radius: 2, under: Tile.StoneFloor },
  '3': { npc: 'gnoll', radius: 2.5, under: Tile.Dirt },
  '4': { npc: 'gnoll', radius: 2, under: Tile.StoneFloor },
  '5': { npc: 'gnoll', radius: 2, under: Tile.Dirt },
};

/**
 * A tumbled steading the warband moved into: a roofless stone shell,
 * bones at the door, and the fire out in the yard where the roof
 * used to be. Gnolls build nothing — they SQUAT, so every gnoll
 * prefab is somebody else's ruin with the warband's litter on it.
 */
const gnollSquat = sketch(
  'poi_gnoll_squat',
  'Gnoll squat',
  [
    '_____,,,,_____',
    '__,::::::::,__',
    '_,:#z#y#S##:,_',
    '_,:#So..S1#:,_',
    '_,:S..2.ESS:,_',
    '_,:#S..W.S#:,_',
    '_,:##S:S###:,_',
    ',::.0.f-.3.::,',
    '_,:::uo:::,,__',
    '____,,,,______',
  ],
  gnollMarks,
  undefined,
  // Squatters' comforts only: a rag bed inside the shell (gnolls
  // steal bedding, they never pitch it) and the pack's trough by
  // the yard fire. NOT the campLife ext — this sketch flies no
  // goblin marks, and its 'o' stays the honest bone pile.
  { E: Tile.RagNest, u: Tile.GnawTrough },
);

/** The kill-ground: an open camp ringed in gnawed bone piles. */
const gnollBoneyard = sketch(
  'poi_gnoll_boneyard',
  'Gnoll boneyard',
  [
    '____,,,,____',
    '__,::::::,__',
    '_,:o.1..0:,_',
    ',::..f...::,',
    ',::2.W.o.::,',
    '_,:..5.-.:,_',
    '__,::o:::,__',
    '____,,,,____',
  ],
  gnollMarks,
);

/** The den-hall: a gutted long-hall, the deep squat of a whole warband. */
const gnollDenhall = sketch(
  'poi_gnoll_denhall',
  'Gnoll den-hall',
  [
    '______,,,,______',
    '__,::::::::::,__',
    '_,:##z##S#z##:,_',
    '_,:#S..o..S.#:,_',
    '_,:#.1..4...#:,_',
    '_,:y..X..b..#:,_',
    '_,:#.2....S.#:,_',
    '_,:##S::S####:,_',
    ',::.o..f..3.::,_',
    '_,::::o:::::,___',
    '____,,,,________',
  ],
  gnollMarks,
);

const skralMarks: Record<string, Marker> = {
  '1': { npc: 'skral', radius: 2, under: Tile.Dirt },
  '2': { npc: 'skral', radius: 2, under: Tile.Dirt },
  '3': { npc: 'skral_harpooner', radius: 2, under: Tile.Dirt },
};

/**
 * THE BANKS GET THEIR GOODS (docs/skral-decor-plan.md): the shoal
 * camps re-voice the war camp's own punctuation through a local
 * legend — the same marks, dressed in bank-stuff. The skral build
 * only in what the water gave them.
 */
export const skralLegend: Record<string, number> = {
  ')': Tile.FishRack,
  '?': Tile.TideTotem,
  '`': Tile.NetFrame,
  '^': Tile.Dugout,
  '>': Tile.HarpoonRack,
  o: Tile.ShellMidden,
  '{': Tile.FishTrap,
  '0': Tile.RoeNest,
  '!': Tile.LurePole,
  '&': Tile.TideAltar,
  '-': Tile.CatchBasket,
  '"': Tile.WhaleRibs,
  // THE CRAFTSMEN OF THE BANKS: the working-village marks — 'A' is
  // the dwelling's silhouette, 'O' the keep-pool's ring, and the
  // rest borrow letters no skral sketch spends on their global
  // meanings (the local legend shadows, sketch by sketch).
  A: Tile.ReedShelter,
  h: Tile.SmokeTripod,
  b: Tile.MendingBench,
  '#': Tile.WeirPanels,
  k: Tile.KelpLine,
  s: Tile.SaltPan,
  e: Tile.ShellBench,
  w: Tile.WithyStore,
  O: Tile.KeepPool,
  x: Tile.TideChimes,
};

/**
 * THE IRON REST (docs/graveyard-kit-plan.md): the kept dead's own
 * marks, a local legend for every ground that buries with a smith
 * and a mason instead of a kerb of fieldstone. The letters shadow
 * their global meanings sketch by sketch, mnemonically: T a stone
 * sTanding, M the Monument, m the low mound, A the mourner's bowed
 * silhouette, I the iron rail, = its gate.
 */
export const graveLegend: Record<string, number> = {
  T: Tile.Gravestone,
  M: Tile.GravestoneTall,
  m: Tile.GraveMound,
  A: Tile.MournerStatue,
  I: Tile.IronFence,
  '=': Tile.IronGate,
  '+': Tile.IronGateShut,
  g: Tile.CandleShrine,
};

/**
 * THE SKRAL CAMPS (docs/skral-plan.md): the brine-folk BUILD, but only
 * in bank-stuff — lashed racks heavy with the catch, a beached dugout,
 * and always the dug pool at the heart (the '~' shallows: a camp that
 * carries its own water is a camp that could only ever stand on the
 * bank, which is exactly what the def's shore flag promises).
 *
 * THE TIDEHOLD's wing pool — the seven shoal wing-camps below ring
 * the court the way the goblin camps ring the warhold, and pay the
 * same WING_POOL_CAP rent (the totem ground stands apart, unpooled).
 */
const skralWeir = declareInfluence(sketch(
  'poi_skral_weir',
  'Skral weir-camp',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:A)..^..!:,_',
    '_,:1.~~~.2.:,_',
    ',::.~~~~~.f:,_',
    '_,:3.~~~.{.:,_',
    '_,:.`..W.-.:,_',
    ',::0.f..x.)::,',
    '_,::::?:::,,__',
    '____,,,,______',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The totem-ring: the shoal's shrine — the ancestor's ribs and the
 *  tide's own table at the head of the pool, watchers all around. */
const skralTotems = sketch(
  'poi_skral_totems',
  'Skral totem-ring',
  [
    '____,,,,____',
    '__,::::::,__',
    '_,:?."&.?:,_',
    ',::.~~~.1::,',
    ',:2~~~.f.::,',
    '_,:?.Wx.!:,_',
    '__,::::.0,__',
    '____,,,,____',
  ],
  skralMarks,
  undefined,
  skralLegend,
);

/** The shell-midden: an open catch-camp — heaps, traps, and the
 *  day's baskets between the fires. */
const skralMidden = declareInfluence(sketch(
  'poi_skral_midden',
  'Skral shell-midden',
  [
    '____,,,,____',
    '__,::::::,__',
    '_,:o.1.^h:,_',
    ',::.{.f.)::,',
    ',::3.-.o.::,',
    '_,:.o.W2!:,_',
    '__,::`w::,__',
    '____,,,,____',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The wreck-camp: the shoal that moved into somebody's bad day —
 *  two hulls hauled past the tide line, the nets still working, and
 *  the salvage under guard. No dug pool: this camp sits ON the bank
 *  (the shore flag's probe holds that promise). */
const skralWreck = declareInfluence(sketch(
  'poi_skral_wreck',
  'Skral wreck-camp',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:b^..`.-.:,_',
    ',::1.:::.3.::,',
    ',::.^:W:..{:,_',
    '_,:2.:::.).:,_',
    '_,:.o..f.k!:,_',
    '__,:::?::::,__',
    '____,,,,,,____',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The drying-ground: the shoal's larder — rack rows heavy with the
 *  catch, the day's baskets, and the midden growing at the verge. */
const skralDrying = declareInfluence(sketch(
  'poi_skral_drying',
  'Skral drying-ground',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:.).).)h.:,_',
    ',::1.....2.::,',
    ',::.{.f.-.::,_',
    '_,:.-.s.W..:,_',
    '_,:3.`.k.o.:,_',
    '__,::::!:::,__',
    '____,,,,,,____',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The salt-camp: the pan-folk's small works — brine finger, worked
 *  pans, the withies keeping the season's take. The bank's money in
 *  its smallest honest denomination. */
const skralSaltcamp = declareInfluence(sketch(
  'poi_skral_saltcamp',
  'Skral salt-garth',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:A.h..s..:,_',
    ',::1.~~~.2.:,_',
    '_,:s~~~~~.s:,_',
    ',::..~~~..-:,_',
    '_,:sW..3.w.:,_',
    '__,::!:?::,,__',
    '____,,,,______',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The kelp-garth: the winter larder on its lines, the live larder
 *  circling beside it — the camp that feeds the lean months. */
const skralKelpcamp = declareInfluence(sketch(
  'poi_skral_kelpcamp',
  'Skral kelp-garth',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:k.k.k..A:,_',
    ',::1.~~~.2.:,_',
    '_,:O~~~~~.O:,_',
    ',::.^.Wf...:,_',
    '_,:k.b.-.3.:,_',
    '__,:::!:`:,,__',
    '____,,,,______',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

/** The chime-hollow: the shoal's small culture — shell strings on
 *  the wind, the tide's table, the spawning bank kept quiet. */
const skralChimehollow = declareInfluence(sketch(
  'poi_skral_chimehollow',
  'Skral chime-hollow',
  [
    '____,,,,____',
    '__,::::::,__',
    '_,:x.".x.:,_',
    ',::?.&.?.:,_',
    ',:2.~~~.1:,_',
    '_,:0~~We.:,_',
    '_,:.o.x.3:,_',
    '__,::!:::,__',
    '____,,,,____',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { cap: WING_POOL_CAP });

const ogreMarks: Record<string, Marker> = {
  // A giant wanders wide of its post — the radius is the read.
  '1': { npc: 'ogre', radius: 3, under: Tile.Dirt },
  '2': { npc: 'ogre', radius: 3, under: Tile.Dirt },
  '3': { npc: 'ogre_hurler', radius: 3, under: Tile.Dirt },
  '4': { npc: 'ogre_bellower', radius: 3.5, under: Tile.Dirt },
  '5': { npc: 'ogre', radius: 2.5, under: Tile.Dirt },
};

/**
 * THE HILL COMES DOWN (docs/ogres-plan.md): the ogre grounds. Ogres
 * build nothing and repair less — a camp is a great fire, a bone
 * midden, and whatever stood there before minus its corners. Every
 * ogre prefab is scaled to its tenants: wide clearings, wide gaps
 * where walls used to meet, and furniture-sized litter everywhere.
 */
const ogreCamp = sketch(
  'poi_ogre_camp',
  'Ogre fire-ring',
  [
    '______,,,,______',
    '__,::::::::::,__',
    '_,:.r..0...r.:,_',
    '_,:.1..@..2..:,_',
    '_,::...-....::,_',
    '_,:.${..).X..:,_',
    '_,:..3....o..:,_',
    ',::....?....::,_',
    '_,::::::::::,,__',
    '____,,,,,,______',
  ],
  ogreMarks,
);

/** The kill-ground: a midden of gnawed bone around the totem. */
const ogreMidden = sketch(
  'poi_ogre_midden',
  'Ogre bone-midden',
  [
    '____,,,,,,____',
    '__,::::::::,__',
    '_,:o..0..o.:,_',
    '_,:.1..?.2.:,_',
    ',::..o.f.o.::,',
    '_,:.o..X..o:,_',
    '_,:..0...o.:,_',
    '__,::::::::,__',
    '____,,,,______',
  ],
  ogreMarks,
);

/**
 * The crushed steading: somebody's barn, minus every corner an ogre
 * ever walked through. The champion seats here — no doorway survives
 * a tenant who never learned to duck.
 */
const ogreSteading = sketch(
  'poi_ogre_steading',
  'Crushed steading',
  [
    '______,,,,______',
    '__,::::::::::,__',
    '_,:##..##..##:,_',
    '_,:#.5....)..:,_',
    '_,:....@....#:,_',
    '_,:#.$...X..#:,_',
    '_,:##..##..##:,_',
    ',::...-...0.::,_',
    '_,::::"":::,,___',
    '____,,,,________',
  ],
  ogreMarks,
);

const hobMarks: Record<string, Marker> = {
  // A posted soldier holds a TIGHT radius — the legion stands where
  // it was told to stand (the goblin wanders; the drill does not).
  '1': { npc: 'hobgoblin', radius: 1.5, under: Tile.Dirt },
  '2': { npc: 'hobgoblin', radius: 1.5, under: Tile.Dirt },
  '3': { npc: 'hobgoblin_archer', radius: 2, under: Tile.Dirt },
  '4': { npc: 'hobgoblin_warcaster', radius: 2, under: Tile.Dirt },
};

/**
 * THE LEGION (docs/hobgoblin-plan.md): the hobgoblin grounds. The
 * exact inversion of every goblin sprawl on the shelf — a legion camp
 * is SQUARE: the palisade meets at true corners, the gate faces the
 * road, the tents stand in file, and the racks hold a straight line.
 * Order read at world zoom IS the species read.
 */
const hobMuster = sketch(
  'poi_hob_muster',
  'Legion muster-yard',
  [
    '_______________',
    '__|||||=|||||__',
    '__|:G:::::::|__',
    '__|:m:m:m:>:|__',
    '__|::::::k::|__',
    '__|:1.(.2.]:|__',
    '__|:::::::::|__',
    '__|:{:@:-:X:|__',
    '__|:3.".!.$:|__',
    '__|||||||||||__',
    '_______________',
  ],
  hobMarks,
  undefined,
  campLife,
);

/** The watch-post: a road detail's fortlet — one tent, one brazier,
 *  one target, and two soldiers who saw you first. */
const hobWatch = sketch(
  'poi_hob_watch',
  'Legion watch-post',
  [
    '___________',
    '__|||=|||__',
    '__|:G:::|__',
    '__|:^:>:|__',
    '__|:1X]:|__',
    '__|:&:2:|__',
    '__|:(.!:|__',
    '__|||||||__',
    '___________',
  ],
  hobMarks,
  undefined,
  campLife,
);

/** The forge-camp: iron and flame in the field — the warcaster's
 *  braziers, the racked issue, and the campaign chest under guard. */
const hobForgecamp = sketch(
  'poi_hob_forgecamp',
  'Legion forge-camp',
  [
    '_______________',
    '__|||||=|||||__',
    '__|:::::::::|__',
    '__|:K:&:K:>:|__',
    '__|:1.:k:.2:|__',
    '__|:m:@:m:]:|__',
    '__|:4.:w:.3:|__',
    '__|:$:[:X:!:|__',
    '__|||||||||||__',
    '_______________',
  ],
  hobMarks,
  undefined,
  campLife,
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
const groveOre = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

/** An ancient yew stand ringed by oaks, floor thick with forage. */
const groveYew = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

/**
 * A lamplit rest on the long road: keeper's stall by the fire, lamp
 * posts that carry real light after dusk, benches for the sit emote.
 * No spawn markers — the staff arrives through the def's actor
 * entries, placed semantically at compose time.
 *
 * MEASURED influence: the spineshelf ledge is wedged between
 * Silverfall's clearance and the crag rough — waystations keep their
 * ORIGINAL footprints (a rest is furniture; the world's ledges were
 * sized for it). The rest/walled pair below pay the same law at 15.
 */
const waystationCamp = declareInfluence(sketch(
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
), { cap: 13 });

/** The road-house variant: hitching rails, two benches, one lamp. */
const waystationRest = declareInfluence(sketch(
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
), { cap: 15 });

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
const banditHollow = declareInfluence(sketch(
  'poi_bandit_hollow',
  'Brigand hollow',
  [
    '________,,_______',
    '___,::::::::,____',
    '__,:u.G.c.$u:,___',
    '_,:.1x..f..2.:,__',
    '_,:..k......X:,__',
    '_,:.3.f..(.>.:,__',
    '_,:.llll.....:,__',
    '_,:.l99l..a.u:,__',
    '__,:llll.w.:,____',
    '___,:::::::,_____',
    '______,,_________',
  ],
  brigandMarks,
  undefined,
  // Minimal ext ONLY — this sketch's 'u' is the felled ring's
  // stumps and its 'a'/'c' are honest coopering: the cart parks by
  // the stolen cows' pen, the dice come out at the fire.
  { w: Tile.PlunderCart, x: Tile.KnucklePit },
), { cap: WING_POOL_CAP });

/**
 * The toll-gate: an old cart track crosses the camp, banner poles
 * flank it, and the strewn crates and bones tell you exactly how the
 * last argument about the toll went.
 */
const banditToll = declareInfluence(sketch(
  'poi_bandit_toll',
  "Thieves' toll",
  [
    '_____,,,________',
    '__,::::::,,,____',
    '_,:.c.a..G.:,___',
    '_,:.1..f..2.:,__',
    '_::::::::::::::_',
    '_,:>..o.Y.>.:,__',
    '_,:.3...X.w.:,__',
    '_,:!.c.::.a.:,__',
    '__,::::::::,____',
    '______,,________',
  ],
  brigandMarks,
  undefined,
  // The trophy stake stands the banner row beside the bones — how
  // the last argument about the toll went, nailed up for the next
  // traveler to read; the confiscated cart sits by the strongbox.
  { Y: Tile.TrophyStake, w: Tile.PlunderCart },
), { cap: 22 });

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
    '_,:..f...>:,__',
    '_,:2...W.:,___',
    '_,:$a..3.:,___',
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
const peddlerRest = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

const hamletMarks: Record<string, Marker> = {
  '8': { npc: 'chicken', radius: 1.5, under: Tile.Grass, level: 1 },
  '9': { npc: 'cow', radius: 1, under: Tile.Grass, level: 3 },
};

/**
 * A crofter's stead holding the verge: one snug cabin (hearth, bed,
 * a table set for two), the fenced grain plot, hens loose in the
 * yard, and the woodpile that says winter is taken seriously.
 */
const hamletCroft = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

/**
 * Two households, one fire — the cabins face each other across the
 * pit the way old neighbors argue: daily, warmly, forever. The cow
 * pen is shared. The chicken is nobody's and everybody's.
 */
const hamletPair = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

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
const denBones = declareInfluence(sketch(
  'poi_den_bones',
  'Wolfkin den',
  [
    '_____,,,_______',
    '__,,......,,___',
    '_,.rrr..o..,,__',
    '_,rrXrr...1.,__',
    '_,.r.r..;...,__',
    '_,.o.....f..,__',
    '_,.1...c....,__',
    '__,..o...,,,___',
    '____,,,________',
  ],
  wolfMarks,
), { cap: WING_POOL_CAP });

/**
 * A trampled hollow ringed by stumps the pack has scent-marked to
 * death — bones dragged to the middle, and the last owner's chest
 * shoved under the rocks by something that didn't understand locks.
 */
const denHollow = declareInfluence(sketch(
  'poi_den_hollow',
  'Pack hollow',
  [
    '____,,,_______',
    '__,u.....u,___',
    '_,.,,o.,,.,,__',
    '_,u.1...;.u,__',
    '_,.o..rX...,__',
    '_,....rr...,__',
    '_,u..1...u.,__',
    '__,o......,___',
    '____,,,_______',
  ],
  wolfMarks,
), { cap: WING_POOL_CAP });

const lynxMarks: Record<string, Marker> = {
  '1': { npc: 'lynx', radius: 2.5, under: Tile.Grass },
};

/**
 * The lair on the ledge: a rock shelf the cats den under, the floor
 * below strewn with dropped bones — and the iron chest of the last
 * climber, dragged halfway to the cache before it stopped shining.
 */
const lairLedge = sketch(
  'poi_lair_ledge',
  'Lynx lair',
  [
    '_____,,,_______',
    '__,,......,,___',
    '_,.rrr..o..,,__',
    '_,rrXr...1..,__',
    '_,.rR;......,__',
    '_,.o...t..1.,__',
    '_,..u..o....,__',
    '__,..,,...,,___',
    '____,,,________',
  ],
  lynxMarks,
);

/**
 * The deadfall cache: a storm-thrown tangle of stumps the cats hunt
 * from, kills wedged in the roots. Everything here was dragged in;
 * nothing here walked out.
 */
const lairDeadfall = sketch(
  'poi_lair_deadfall',
  'Deadfall cache',
  [
    '____,,,_______',
    '__,u.....t,___',
    '_,.,,o.,,.,,__',
    '_,t.1...;.u,__',
    '_,.o..rX...,__',
    '_,....ru.1.,__',
    '_,u...o....,__',
    '__,o......,___',
    '____,,,_______',
  ],
  lynxMarks,
);

const owlMarks: Record<string, Marker> = {
  '1': { npc: 'great_owl', radius: 3, under: Tile.Grass },
};

/**
 * The shadewood roost: a horseshoe of old oaks around a moon glade,
 * the floor drifted with cast pellets — and the iron chest of the
 * last climber, still strapped shut, under the tree that kept them.
 */
const roostShadewood = sketch(
  'poi_roost_shadewood',
  'Shadewood roost',
  [
    '_____,,,,______',
    '__,,.O.o.O.,,__',
    '_,.O...,..Y.,__',
    '_,.o.1...o..,__',
    '_,O...rX...O,__',
    '_,.u...1....,__',
    '__,,.o...o.,,__',
    '_____,,,,______',
  ],
  owlMarks,
);

/**
 * A pine hollow the parliament hunts from: pellet heaps under the
 * boughs, one clawed-bare stump, and the cache wedged in the rocks
 * where something heavy set it down and never came back.
 */
const roostPinehollow = sketch(
  'poi_roost_pinehollow',
  'Pine hollow roost',
  [
    '____,,,,_____',
    '__,j..o..j,__',
    '_,.j..1..j.,_',
    '_,o...r...o,_',
    '_,.j.rXr.j.,_',
    '_,..1...u..,_',
    '__,j..o..j,__',
    '____,,,,_____',
  ],
  owlMarks,
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
const wayshrineStones = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

/**
 * A spring the road-faith blessed: clear water, one old stone, a
 * bench under the willow. Travelers leave the pool cleaner than
 * they found it. Even brigands. Nobody discusses this.
 */
const wayshrinePool = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

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
    '_,:||||==||||:,_',
    '_,:|.^E....0|:,_',
    '_,:|.f.1..f.|:,_',
    '_,:|a..W...-|:,_',
    '_,:|.2...3.o|:,_',
    '_,:|.u.f.J.[|:,_',
    '_,:||||==||||:,_',
    '_,::>::!:Y:>::,_',
    '__,::::::::::,__',
    '_____,,,________',
  ],
  goblinMarks,
  undefined,
  campLife,
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
const groveSpring = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

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
const waystationWalled = declareInfluence(sketch(
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
), { cap: 15 });

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
const companyTollhouse = declareInfluence(sketch(
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
), { cap: QUIET_WAYSIDE_CAP });

/**
 * THE HOARGATE (the Pinereach epic) — the Crown's garrison across the
 * narrows north of Silverfall. Two towers, a covered passage, and a
 * gate in the NORTH curtain because that is the direction nobody
 * sensible walks: the muster yard opens south onto the road, so a
 * traveller reads the fire, the benches and the boards before they
 * ever read the gate. Snow on the shoulders, pines on both hems, and
 * three signs that do not hedge.
 */
const hoargateFort = declareInfluence(sketch(
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
), { cap: 48 });

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

/**
 * THE WAKING QUARRY (the Kingsdelf epic — the golem POI the earth
 * epic deferred). A bench cutting of the Old Crown's stoneworks,
 * still being worked: the Hewers never received the order to stop.
 * Half-cut blocks stand in their cradles, the crane footings hold a
 * crane long rotted, and the benches are SWEPT — a hundred and fifty
 * years of tending with nobody to deliver to. No fire anywhere: a
 * construct needs no light, and the dark working is the whole read.
 */
const hewerQuarry = sketch(
  'poi_hewer_quarry',
  'The waking quarry',
  [
    '___,,rrrrrrrrr,,___',
    '__,rrrSSSSSSSrrr,__',
    '_,rrSSrr...rrSSrr,_',
    '_,rSSr..SSS..rSSr,_',
    ',rSS..SSrrrSS..SSr,',
    ',rS..Sr..P..rS..Sr,',
    ',rS.Sr..SSS..rS.Sr,',
    ',rS.S..SrXrS..S.Sr,',
    ',rS.Sr..SSS..rS.Sr,',
    ',rS..Sr..P..rS..Sr,',
    ',rSS..SSrrrSS..SSr,',
    '_,rSSr..:::..rSSr,_',
    '_,rrSSrr:::rrSSrr,_',
    '__,rrrSS:::SSrrr,__',
    '___,,rrr:::rrr,,___',
  ],
);

/**
 * THE HEWERS' CUT — the linear make: a road-cutting toward a capital
 * that no longer orders stone, faced on both hands, with the last
 * blocks of the last commission standing where the wains never came.
 */
const hewerCut = sketch(
  'poi_hewer_cut',
  "The Hewers' cut",
  [
    '_,,rrrrrrrrrrrrr,,_',
    ',rrSSSSSSSSSSSSSrr,',
    ',rS..rr..P..rr..Sr,',
    ',rS.SSSS...SSSS.Sr,',
    ',rS..rr..X..rr..Sr,',
    ',rSSSSSSSSSSSSSSSr,',
    '_,,rrrrrr:::rrrr,,_',
    '____,,,,,:::,,,,,__',
  ],
);

/**
 * THE PROCESSIONAL WAY (the Ashen Court) — a surviving reach of the
 * old realm's paved approach: lych pillars in facing pairs, the
 * paving broken but SWEPT down the centerline, and the arch of a
 * fallen waygate lying where it dropped. By day it is a ruin worth
 * robbing. After dusk the court walks it home, and the dead do not
 * argue about right of way.
 */
const processionWay = sketch(
  'poi_procession_way',
  'The Processional way',
  [
    '_,,....o.....,,,___',
    ',,.P..SSS..P..,,,__',
    ',..:.SSSSS.:...,,__',
    ',.P..SSSSS..P..,,__',
    ',....SSSSS....o,,__',
    ',.o..SSSSS.....,,__',
    ',.P..SSSSS..P..,,__',
    ',....SSQSS.....,,__',
    ',.P..SSSSS..P.X,,__',
    ',,...SSSSS....,,,__',
    '_,,...SSS...,,,,___',
    '__,,...o...,,,_____',
  ],
);

/**
 * THE WAYHOUSE OF THE OLD ROAD — where the processions rested a bier
 * overnight, a hundred and fifty years before anyone called the road
 * old. The roof went first; the bier table still stands level, and
 * things are laid on it, sometimes, that nobody living laid there.
 */
const processionRest = sketch(
  'poi_procession_rest',
  'The fallen wayhouse',
  [
    '_,,....o....,,_',
    ',..##z###.#..,_',
    ',..#SSSSS....,_',
    ',..zSSkSS#.o.,_',
    ',..#SSSSSz...,_',
    ',..#S...S#.P.,_',
    ',..##.###X...,_',
    '_,....o......,_',
  ],
);

/**
 * THE STARFALL CRATER (the Kingsdelf epic) — where a piece of the
 * star that woke the Brand broke up on the skirt. The ring of thrown
 * rock has had a century and a half to gather moss; the heart has
 * not. Starfall in the open, obsidian where the heat glassed the
 * floor — the richest open ground in the Dawnlands, at Overband
 * prices, and the fire's own bodies stand the claim.
 */
const starfallCrater = sketch(
  'poi_starfall_crater',
  'The starfall crater',
  [
    '__,,,rr:rr,,,__',
    '_,,rr:::::rr,,_',
    ',,rr::,:,::rr,,',
    ",,r::'::::'r,,_",
    ',r::,::9::::r,_',
    ',r:::,:::,::r,_',
    ",,r:'::::X:r,,_",
    '_,,rr:,::rr,,,_',
    '__,,,rr:rr,,,__',
  ],
);

/**
 * THE OLDCROWN GATE (weight 0 — the authored door). The buried
 * capital's east gatehouse, dug half out of the ash by nobody: the
 * Hewers keep it clear because a gate is on the maintenance rolls.
 * The arch behind them is SEALED — the door a delve epic will knock
 * on — and the garrison does not discuss it.
 */
const oldcrownGate = sketch(
  'poi_oldcrown_gate',
  'The Oldcrown gate',
  [
    '_,,VVVVVVVVVVVVV,,_',
    ',,VVVVVVQQQVVVVVV,,',
    ',,VV#SSSSSSSSS#VV,,',
    ',..#SS..P.P..SS#.,,',
    ',..zS...SSS...Sz.,,',
    ',..#S..SSSSS..S#.,,',
    ',..#SS.SSSSS.SS#.,,',
    ',..##S..SXS..S##.,,',
    ',...#SS.....SS#..,,',
    ',....#SS:::SS#...,,',
    '_,....o.:::.o....,_',
    '__,,....:::....,,__',
  ],
);

/**
 * THE FELL BARROW (the Hartfell epic) — a robbed mound of the old
 * north. The kerb ring stands as it was set before any road was laid;
 * the door does not: pillars levered aside, a trench cut straight
 * through the south ring, and the household's goods gone or going.
 * The dead walk their own grave-field day and night, because whatever
 * kept their hours went out the door with the robbers.
 *
 * MEASURED influence: the high fells hold no room — the barrow cell
 * (5,-4) takes ONLY the original footprints; the fell theme IS scarce
 * rocky ground (the def's approach cues carry the influence read
 * instead). The ring barrow below pays the same law at 11.
 */
const fellBarrow = declareInfluence(sketch(
  'poi_fell_barrow',
  'Opened barrow',
  [
    '___,,,.....,,,___',
    '__,..rrrrrrr..,__',
    '_,..rr,,,,,rr..,_',
    '_,.rr,,,o,,,rr.,_',
    ',..r,,rrrrr,,r..,',
    ',.rr,,rSSSr,,rr.,',
    ',.r,,,rSXSr,,,r.,',
    ',.rr,,rSoSr,,rr.,',
    ',..r,,PS:SP,,r..,',
    '_,.rr,,:::,,rr.,_',
    '_,..rrr:::rrr..,_',
    '__,,.c.:::.a.,,__',
    '____,,.:::.,,____',
  ],
), { cap: 17 });

/**
 * THE RING BARROW — the smaller, older make: a kerb of stones over a
 * single cist, no chamber to speak of and no door to lever. The ones
 * the diggers open anyway are the ones that answer.
 */
const barrowRing = declareInfluence(sketch(
  'poi_barrow_ring',
  'Ring barrow',
  [
    '__,,...,,__',
    '_,..rrr..,_',
    ',..r,,,r..,',
    ',.r,,o,,r.,',
    ',.r,,X,,r.,',
    ',..r,,,r..,',
    '_,..r:r..,_',
    '__,,.:.,,__',
  ],
), { cap: 11 });

/**
 * THE DIGGERS' CAMP (the Hartfell epic) — the Red Company's dig below
 * the Barrowfell. Spoil down the mound's south face, the foreman's
 * lean-to pitched with its door to the fire, grave-goods crated for
 * the road south, and a locked box of the best of it. Everything
 * about this camp is a crime with an address.
 */
const barrowDiggers = declareInfluence(sketch(
  'poi_barrow_diggers',
  "The Diggers' Camp",
  [
    '____,,,:::,,,______',
    '___,.rr:::rr.,_____',
    '__,.rr,,:,,rr.,____',
    '__,.r,,o:o,,r.,____',
    '__,.rr,,:,,rr.,____',
    '___,.rr:::rr.,,____',
    '____,..:::..,,_____',
    '__,....:::....,____',
    '_,..c..:f:..a..,___',
    '_,.G...:::..o..,___',
    '_,.Gc.wwvww.::..,__',
    '_,....wpEpw..W..,__',
    '__,...wwwww...,____',
    '____,,,......,,____',
  ],
), { cap: 24 });

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
  '_,.F.,_',
  '.:.:.:.',
  '_,F.F,_',
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

/** A dragged kill wedged under a leaning rock — the cat's larder. */
const findCatCache = sketch('find_cat_cache', 'Cat cache', [
  '_,rr,_',
  ',rR:o,',
  ',.:o.,',
  '_,..,_',
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

/** A crooked skull totem on trampled ground — the warband's claim. */
const findWarTotem = sketch('find_war_totem', 'War totem', [
  '_,..,_',
  ',.0:.,',
  ',:?:.,',
  ',.o..,',
  '_,..,_',
]);

/** Fresh-turned earth over a crate meant to stay hidden. */
const findStashMound = sketch('find_stash_mound', 'Stash mound', [
  '_,..,_',
  ',:W:.,',
  ',.c:.,',
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

/** Three stones past reading and one mound the grass has not taken.
 *  Somebody still weeds them; nobody will say who. */
const findForgottenGraves = sketch(
  'find_forgotten_graves',
  'Forgotten graves',
  [
    '_,.....,_',
    ',.T:,T..,',
    ',..m:.T,,',
    ',.,:W:..,',
    '_,.....,_',
  ],
  {},
  undefined,
  graveLegend,
);

// THE SHORE FINDS (docs/skral-decor-plan.md): the banks' own texture —
// each stands only where its slot brushes water (MinorDef.shore), and
// each re-voices the war camp's punctuation through the skral legend.

/** A dugout dragged past the tide line and never launched again. */
const findBeachedWreck = sketch(
  'find_beached_wreck',
  'Beached wreck',
  [
    '_,....,_',
    ',.^.-..,',
    ',.`:W..,',
    '_,,..,,_',
  ],
  {},
  undefined,
  skralLegend,
);

/** A sea-beast's ribs arching from the bank sand — older than the
 *  water, and pathless by the cairn law: it marks the coast, not a
 *  destination. */
const findOldRibs = sketch(
  'find_old_ribs',
  'Old ribs',
  [
    '_,....,_',
    ',.r"o..,',
    ',..:...,',
    '_,....,_',
  ],
  {},
  undefined,
  skralLegend,
);

/** A wave-worn table the coral is taking back, lit by a caged jelly. */
const findTideShrine = sketch(
  'find_tide_shrine',
  'Tide shrine',
  [
    '_,....,_',
    ',.!.&..,',
    ',..:-..,',
    '_,....,_',
  ],
  {},
  undefined,
  skralLegend,
);

/** Glistening clutches in scraped hollows at the waterline — the
 *  spawning bank the shoals muster to (habitat 'roe'). */
const findRoeGround = sketch(
  'find_roe_ground',
  'Roe ground',
  [
    '_,....,_',
    ',.0.~..,',
    ',.~0{..,',
    ',..0...,',
    '_,....,_',
  ],
  {},
  undefined,
  skralLegend,
);

// ----------------------------------------------------- THE WAR-GROUND
// (lived-in-land Phase 4.) Courts — the heart of a compound hold: the
// named chief's ground, the warded boss cache, the last stand. Wings
// come from the ordinary camp shelves; the court is the piece that
// says THIS one is the region's landmark.

/**
 * The goblin war-hold's court: a TRUE spiked ring now — the great
 * bonfire at the heart, the chief's tents flanking it, the skull
 * totem beside the warded cache, and the camp's whole life (cage,
 * drum, plunder, spit) crowded inside the logs. Torches and war
 * banners walk the gate row so the hold reads from the road at night.
 *
 * All four courts declare EXEMPT: a compound court's constellation is
 * the WINGS — influence must never litter the ring the wings are
 * dealt onto.
 */
const warholdCourt = declareInfluence(sketch('poi_warhold_court', 'War-hold court', [
  '_____,,::,,_____',
  '__,::::::::::,__',
  '_,::|::==::|::,_',
  '_,:|.^w...m.|:,_',
  ',::.!..@.a.[.::,',
  ',::.0..?Z..$.::,',
  ',::.-..e...".::,',
  '_,:|.>.x..!.|:,_',
  '_,::|::==::|::,_',
  '__,::::::::::,__',
  '_____,,::,,_____',
], {}, undefined, campLife), { exempt: true });

/** The stockade court: rough timber walls, two gates, the tally's cache. */
const stockadeCourt = declareInfluence(sketch('poi_stockade_court', 'Stockade court', [
  '______,,,______',
  '__,::::::::,___',
  '_,:wwwg:gwww:,_',
  '_,:w.$...(.w:,_',
  ',::w..a.c..w::,',
  ',::v...Z...v::,',
  ',::w..f.{..w::,',
  '_,:w.]...!.w:,_',
  '_,:wwwg:gwww:,_',
  '__,::::::::,___',
  '______,,,______',
]), { exempt: true });

/** The great den's court: a bone-strewn rise under the old rocks. */
const greatdenCourt = declareInfluence(sketch('poi_greatden_court', 'Great den court', [
  '____,,rr,,____',
  '__,rrRRRRrr,__',
  '_,rR::::::Rr,_',
  ',rR:.;..o.:Rr,',
  ',rR:.0SZ?.:Rr,',
  ',rR:.;..;.:Rr,',
  '_,rR::::::Rr,_',
  '__,rrRRrrr,___',
  '____,,rr,,____',
  '______,,______',
]), { exempt: true });

/**
 * THE TIDEHOLD's court (docs/skral-decor-plan.md): the deepking's
 * pool. No palisade — the skral fell nothing: the ring is the
 * ancestors' RIBS at the corners and the watching totems between,
 * around the great dug pool the whole hold exists to keep. The tide's
 * table and the warded boss cache stand at the pool's east head where
 * the king wades out; the lure poles light the water, not the land.
 */
const skralCourt = declareInfluence(sketch(
  'poi_skral_court',
  'Tidehold court',
  [
    '_____,,::,,_____',
    '__,::::::::::,__',
    '_,:."..?.."..:,_',
    '_,:!.~~~~~.oA:,_',
    ',::.~~~~~~~.-::,',
    ',::?~~~~~~~&Z::,',
    ',::.~~~~~~~.)::,',
    '_,:1.~~~~~.2O:,_',
    '_,:."..?.."x.:,_',
    '__,::::::::::,__',
    '_____,,::,,_____',
  ],
  skralMarks,
  undefined,
  skralLegend,
), { exempt: true });

// ------------------------------------------------------------------
// THE EVERWOOD (the Evenfall epic): the old folk's wild grounds.
// Everything swept, nothing lashed — and everything spaced to breathe
// (the curation law walks in the wild too).
// ------------------------------------------------------------------

/**
 * A waystone in a tended ring: the Evenway's mile-keeping, where the
 * road-faith's lamps never reached. The stone is swept, the benches
 * face the miles, and the grass inside the ring is shorter than the
 * grass outside it. Nobody is ever seen tending these.
 */
const waystoneRing = sketch('poi_waystone_ring', 'Waystone ring', [
  '_____,,,,,_____',
  '___,,.....,,___',
  '__,..Y...Y..,__',
  '_,....SSS....,_',
  '_,.6..S8S..6.,_',
  ',,....SSS....,,',
  '_,.....s.....,_',
  '_,..Y.....Y..,_',
  '__,..B...B..,__',
  '___,,.....,,___',
  '_____,,,,,_____',
]);

/**
 * The small handoff stone: one waystone, one bench, and the yews
 * leaning in to listen. The first of these stands where the last
 * lamp's reach gives out — the wood picking up the watch.
 */
const waystoneBench = sketch('poi_waystone_bench', 'Waystone', [
  '___,,,,,___',
  '__,.....,__',
  '_,..Y.Y..,_',
  '_,.S...B.,_',
  '_,.8..6..,_',
  '_,.S.....,_',
  '_,..s..h.,_',
  '__,.....,__',
  '___,,,,,___',
]);

/**
 * A sentinel arbor: an open-sided bough-lodge, grown more than built
 * — rails and floor and a kept fire, no walls at all (an Evenguard
 * post does not hide; being SEEN keeping the mile is the point). The
 * rune pillars light the approach violet and green.
 */
const arborBough = sketch('poi_arbor_bough', 'Sentinel arbor', [
  '____,,,,,,,,____',
  '__,,........,,__',
  '_,..7......7..,_',
  '_,...llllll...,_',
  '_,...lppppl...,_',
  ',,...lppHpl...,,',
  '_,...lpppp....,_',
  '_,...llll.....,_',
  '_,..e....k....,_',
  '_,....Y....6..,_',
  '__,,........,,__',
  '____,,,,,,,,____',
]);

/**
 * The arbor at the old hearth: a sentinel post keeping a fire that
 * was old when the roads were young. The waystone stands where the
 * lodge's fourth wall would be — the Evenguard sleep against the
 * mile itself.
 */
const arborHearth = sketch('poi_arbor_hearth', 'Evenguard hearth', [
  '____,,,,,,____',
  '__,........,__',
  '_,..7....Y.,__',
  '_,..lllll..,__',
  '_,..lppppl.,__',
  ',,..lpHppl.,,_',
  '_,..lpppp8.,__',
  '_,..lllll..,__',
  '_,...e..6..,__',
  '__,........,__',
  '____,,,,,,____',
]);

/**
 * A fallen light: an old folk beacon-site gone dark, and the dark
 * moved in under it. The runestones still stand; the household that
 * rose beneath them keeps a watch nobody set. What the wood's quiet
 * actually holds down, shown once per country.
 */
const fallenBeacon = sketch('poi_fallen_beacon', 'Fallen light', [
  '_____,,,,,_____',
  '__,,,.....,,,__',
  '_,...5...r...,_',
  '_,..r..o.....,_',
  ',,....SSS..5.,,',
  '_,.o..S4S....,_',
  '_,....SSS..o.,_',
  '_,.5.....W...,_',
  '_,....r......,_',
  '__,,,.....,,,__',
  '_____,,,,,_____',
]);

/**
 * The fallen ring: the beacon's outlier stones, tipped and mossed,
 * with the ground between them dug by nothing that carries a spade
 * the right way up.
 */
const fallenRing = sketch('poi_fallen_ring', 'Dark ring', [
  '____,,,,,,____',
  '__,,......,,__',
  '_,..5..r...,__',
  '_,....o..5.,__',
  ',,.r..W....,,_',
  '_,...o...r.,__',
  '_,.5....o..,__',
  '_,......5..,__',
  '__,,......,,__',
  '____,,,,,,____',
]);

/**
 * A fellers' camp: the Red Company probing the Everwood's hem for
 * silverbark, half-built and half-dismantled — the palisade run
 * stops mid-course, and half the stakes are already pulled. The
 * Company keeps finding its camps politely taken apart by morning.
 * The crew has standing orders and dwindling nerve.
 */
const fellersCamp = sketch('poi_fellers_camp', "Fellers' camp", [
  '_____,,::,,_____',
  '__,::::::::::,__',
  '_,:|:|..u.u..:,_',
  '_,:.....d....:,_',
  ',::.^..f..c..::,',
  ',::.....W.a..::,',
  '_,:.u..!...u.:,_',
  '_,:....<.....:,_',
  '__,::::::::::,__',
  '_____,,::,,_____',
]);

/**
 * The fellers' boom: the log landing by the wet ground, stacked with
 * silverbark lengths nobody has come back for. The saw went quiet a
 * week ago. The crew tells itself the wood is just a wood.
 */
const fellersBoom = sketch('poi_fellers_boom', "Fellers' boom", [
  '____,,,,,,,____',
  '__,::::::::,___',
  '_,:.u..u...:,__',
  '_,:..c.c.d.:,__',
  ',::.f......::,_',
  ',::...W.^..::,_',
  '_,:.!....u.:,__',
  '_,::::::::,,___',
  '____,,,,,,_____',
]);

/**
 * THE HEARTWOOD DOOR — the one threshold (weight-0, authored once).
 * A ward arch the delve epic gets to be invited through, flanked by
 * waystones and kept by the Evenguard. The arch is not sealed with
 * masonry; it is sealed with PERMISSION, which is harder work to
 * break. The trees past it are taller than trees.
 */
// The arch was sealed with permission; the permission has been given
// (the_first_focus pays the gift's debt), and the door is a WORKING
// riftgate now — 'D' rides the stamp as a delve gate by the prefab
// portal law, and THE KEY IS THE DUNGEON does the rest. The root-
// halls below are the sixth theme's country.
const heartwoodDoor = sketch('poi_heartwood_door', 'The Heartwood door', [
  '______,,,,,______',
  '___,,,.....,,,___',
  '__,...Y...Y...,__',
  '_,..5.......5..,_',
  '_,....S,D,S....,_',
  ',,..8.S,3,S.8..,,',
  '_,....S,,,S....,_',
  '_,.....SSS.....,_',
  '_,..6...S...6..,_',
  '__,....7.7....,__',
  '___,,,.....,,,___',
  '______,,,,,______',
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
    // Hartfell (the town past the treeline):
    fellBarrow,
    barrowRing,
    barrowDiggers,
    // Kingsdelf (the Ashmarch — the Overband's own grounds):
    hewerQuarry,
    hewerCut,
    processionWay,
    processionRest,
    starfallCrater,
    oldcrownGate,
    // The War-Ground (the lived-in land, phase 4):
    warholdCourt,
    stockadeCourt,
    greatdenCourt,
    skralCourt,
    // The gnoll warband (savage scavengers in other people's ruins):
    gnollSquat,
    gnollBoneyard,
    gnollDenhall,
    skralWeir,
    skralTotems,
    skralMidden,
    skralWreck,
    skralDrying,
    skralSaltcamp,
    skralKelpcamp,
    skralChimehollow,
    // THE HILL COMES DOWN (the giant-kin grounds):
    ogreCamp,
    ogreMidden,
    ogreSteading,
    // THE LEGION (the hobgoblin grounds — square where goblins sprawl):
    hobMuster,
    hobWatch,
    hobForgecamp,
    // The tufted shadows (lynx of the deep wood):
    lairLedge,
    lairDeadfall,
    // The parliament (great owls of the deep wood):
    roostShadewood,
    roostPinehollow,
    // THE EVERWOOD (the Evenfall epic): the old folk's wild grounds.
    waystoneRing,
    waystoneBench,
    arborBough,
    arborHearth,
    fallenBeacon,
    fallenRing,
    fellersCamp,
    fellersBoom,
    heartwoodDoor,
    // THE LANDMARKS (the hybrid charter): expansive authored grounds,
    // 3-5x the camp shelf — built in landmarks.ts the Foundry way.
    ...LANDMARK_PREFABS,
    // The Small Finds (the lived-in land, phase 2):
    findHuntersRest,
    findSnareLine,
    findWaymarkCairn,
    findBonePile,
    findDenMouth,
    findCatCache,
    findWarren,
    findGlade,
    findStandingStone,
    findWreckedCart,
    findTappedYew,
    findBarrow,
    findForgottenGraves,
    findWarTotem,
    findStashMound,
    // The shore finds (docs/skral-decor-plan.md): bank texture.
    findBeachedWreck,
    findOldRibs,
    findTideShrine,
    findRoeGround,
    // THE INFLUENCE LAW (hybrid charter, second rung): every ordinary
    // POI expands from a stamp into a territory — authored heart,
    // generated outskirts (influence.ts; courts, finds, and landmarks
    // pass through untouched).
  ].map((p) => [p.id, expandInfluence(p)] as [string, PrefabDef]),
);

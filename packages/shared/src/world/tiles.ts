/**
 * Tile registry. Tiles are u16 ids on the wire; defs drive collision
 * (shared) and rendering (client). Detail-layer tiles are cosmetic only.
 */

/**
 * Transparency sentinel for layer stamps: a cell holding this value in
 * a zone/prefab layer is SKIPPED by the overlay — the ground beneath
 * (procedural or earlier zone) shows through. Not a legal tile id; it
 * never reaches a chunk. The editor's structure-ghost GHOST_SKIP is
 * this same value.
 */
export const TILE_SKIP = 0xffff;

export enum Tile {
  Void = 0,
  Grass = 1,
  GrassTall = 2,
  Dirt = 3,
  Path = 4,
  Sand = 5,
  Water = 6,
  WaterDeep = 7,
  StoneFloor = 8,
  WoodFloor = 9,
  WallStone = 10,
  WallWood = 11,
  Tree = 12,
  Rock = 13,
  Stump = 14,
  Fence = 15,
  Bridge = 16,
  Snow = 17,
  Swamp = 18,
  TreeOak = 19,
  RockCopper = 20,
  RockIron = 21,
  RockDepleted = 22,
  FishingSpot = 23,
  Campfire = 24,
  Furnace = 25,
  Anvil = 26,
  Workbench = 27,
  BankChest = 28,
  ShopCounter = 29,
  CaveWall = 30,
  CaveFloor = 31,
  PortalDown = 32,
  PortalUp = 33,
  /** Solid rock face forming the rim of an elevated plateau. */
  Cliff = 34,
  /** Walkable stone stair connecting two elevation levels. */
  Ramp = 35,
  RockTin = 36,
  RockCoal = 37,
  RockGold = 38,
  /** An iron lantern on a post — a warm town light after dark. */
  LampPost = 39,
  /** Player-built garden plot: dark furrowed soil, ready for seeds. */
  Tilled = 40,
  /** Freshly planted — a generic green shoot; the crop record knows what it is. */
  CropSprout = 41,
  CarrotMid = 42,
  CarrotRipe = 43,
  SagewortMid = 44,
  SagewortRipe = 45,
  SunflowerMid = 46,
  SunflowerRipe = 47,
  WheatMid = 48,
  WheatRipe = 49,
  CottonMid = 50,
  CottonRipe = 51,
  MoonbellMid = 52,
  MoonbellRipe = 53,
  /** Herbalism station: a workbench of glass retorts and bubbling beakers. */
  Alembic = 54,
  BerryBush = 55,
  FibrePlant = 56,
  WildSagewort = 57,
  WildMoonbell = 58,
  /** A stone wall with a glazed window — merges into wall runs. */
  WallStoneWindow = 59,
  /** A wood wall with a shuttered window — merges into wall runs. */
  WallWoodWindow = 60,
  /** WALKABLE framed opening in a stone wall run — a real doorway. */
  DoorwayStone = 61,
  /** WALKABLE framed opening in a wood wall run. */
  DoorwayWood = 62,
  /** WALKABLE freestanding arch — colonnades, plaza gateways. */
  ArchStone = 63,
  /** Freestanding column you walk around — porches, colonnades. */
  PillarStone = 64,
  /** Half-height railing — porches, jetties, balconies. */
  RailWood = 65,
  /**
   * WALKABLE wide stone doorway — adjacent wide tiles in an E-W run
   * merge into ONE full-width opening (jambs only at the run ends).
   * Plain DoorwayStone never merges: two singles side by side stay
   * two framed doors with a real divider read.
   */
  DoorwayStoneWide = 66,
  /** WALKABLE wide wood doorway — E-W runs merge into one opening. */
  DoorwayWoodWide = 67,
  /**
   * 45° wall segments. The suffix names the SOLID triangle — which
   * two tile edges the mass spans — so DiagNE (mass across the north
   * and east edges) cuts a building's SW corner, DiagNW its SE
   * corner, DiagSE its NW corner, DiagSW its NE corner. The open
   * triangle always faces the exterior. Placement auto-orients from
   * the two perpendicular wall neighbours (build the adjoining walls
   * first).
   */
  WallStoneDiagNE = 68,
  WallStoneDiagNW = 69,
  WallStoneDiagSE = 70,
  WallStoneDiagSW = 71,
  WallWoodDiagNE = 72,
  WallWoodDiagNW = 73,
  WallWoodDiagSE = 74,
  WallWoodDiagSW = 75,
  /**
   * SHUT doorways — the TILE IS THE STATE, exactly like chests: a
   * doorway with its leaf swung shut is a different (SOLID) tile, so
   * open/shut posture, collision, and lamplight all sync through the
   * ordinary tile-patch pipeline on both sides. A wide run flips as
   * one unit — the server toggles every member tile atomically.
   */
  DoorwayStoneShut = 76,
  DoorwayWoodShut = 77,
  DoorwayStoneWideShut = 78,
  DoorwayWoodWideShut = 79,
  /** A banded oak barrel — the workhorse of clutter. */
  Barrel = 80,
  /** A plank shipping crate. */
  Crate = 81,
  /** A crate heaped with market produce. */
  CrateGoods = 82,
  /** A table — adjacent tables merge into one long board. */
  Table = 83,
  /** A chair; its back turns away from any adjacent table. */
  Chair = 84,
  /** A bench/pew — east-west runs merge. */
  Bench = 85,
  /**
   * A bed: frame, mattress, pillow, patchwork quilt. Sleeps with its
   * head against an adjacent wall (side-on when the wall is E/W);
   * N-S runs merge into one long bed.
   */
  Bed = 86,
  /** A tall bookshelf: books, gilt bindings, and a curio shelf. */
  Bookshelf = 87,
  /** Chest-high casework — hash deals a two-door cupboard or a dresser. */
  Cabinet = 88,
  /** A service counter — runs merge; NOT the shop counter station. */
  Counter = 89,
  /** A stone hearth with a live fire — warm light after dark. */
  Hearth = 90,
  /** A canopied market stall — 2-wide runs share one canopy. */
  MarketStall = 91,
  /** A pole flying a hanging cloth banner. */
  BannerPole = 92,
  /** A post with a swinging shingle sign. */
  HangingSign = 93,
  /** A low planter box in bloom. */
  FlowerBox = 94,
  /** A board of smithing tools. */
  ToolRack = 95,
  /** A rack of spears and blades. */
  WeaponRack = 96,
  /** A massive iron strongbox — the bank's set-piece. */
  Vault = 97,
  /** A slim stand bearing an open tome. */
  Lectern = 98,
  /** A stone water trough. */
  Basin = 99,
  /** A weeping willow — damp deep forest; willow logs for bowyers. */
  TreeWillow = 100,
  /** An ancient yew — rare, dark, slow-grown; the war-bow wood. */
  TreeYew = 101,
  /** A hide stretched taut on a timber frame — the leatherworker's station. */
  TanningRack = 102,
  /** A warp-strung weaving loom — the tailor's station. */
  Loom = 103,
  /** A shaving-strewn bowyer's bench with vise and drawknife — the woodworker's station. */
  CarvingBench = 104,
  /** A rune-carved worktable bearing an open tome and cradled focus stone — the enchanter's station. */
  EnchantingTable = 105,
  /** A young tree standing up from a felled stump — walkable, not yet choppable. */
  Sapling = 106,
  /** An oak sapling. */
  SaplingOak = 107,
  /** A willow sapling. */
  SaplingWillow = 108,
  /** A yew sapling. */
  SaplingYew = 109,
  /**
   * Knee-deep water — the only water you can WALK through. Wading is
   * slow (see WADE_SPEED_FACTOR) and loud; the shore's honest shortcut.
   */
  WaterShallow = 110,
  /**
   * Loot chests. Closed and open are separate tiles — the tile IS the
   * state, so it syncs, persists, and animates off the ordinary tile
   * patch with no new protocol. Interacting with a closed chest rolls
   * its loot table and spills the take at its foot; an emptied chest
   * stands open until the respawn queue quietly shuts it again.
   */
  /** A banded traveller's chest — plain wood under steel strapping. */
  ChestWood = 111,
  ChestWoodOpen = 112,
  /** A dark ironbound strongchest — often padlocked; wants a key. */
  ChestIron = 113,
  ChestIronOpen = 114,
  /** A gilded coffer — faceted gold over lacquer, treasure-house work. */
  ChestGilded = 115,
  ChestGildedOpen = 116,
  /** A moss-grown wayside chest — old timber the forest is claiming. */
  ChestMossy = 117,
  ChestMossyOpen = 118,
  /** The boss chest: black iron and a bone skull. Legendary-kept. */
  ChestBoss = 119,
  ChestBossOpen = 120,
  /**
   * The high-mining ladder — five late-game deposits extending the
   * ore ladder past gold and up to the level cap. Same node laws as
   * the classic five (deplete to RockDepleted, cluster low when
   * crowded, bespoke landmark art per metal).
   */
  /** Moonlit lode — crossed bright veins in a tilted slab. Mining 30. */
  RockSilver = 121,
  /** The sky spire — the master smith's blue beacon. Mining 50. */
  RockMithril = 122,
  /** Twin green horns of the hardest honest metal. Mining 65. */
  RockAdamant = 123,
  /** A cooled glass flow, ember still warm underneath. Mining 78. */
  RockObsidian = 124,
  /** A fallen star half-buried in its scorched crater. Mining 90. */
  RockStarfall = 125,
  /**
   * The dungeon dressing set — props and grounds for generated
   * dungeons. Caverns grow stalagmites and glowshrooms; worked halls
   * hang braziers and scatter bone piles; cracked walls hide the
   * secret rooms (smashable — the destructible law opens them).
   */
  /** A floor-to-ceiling drip-stone column. Solid, centered mass. */
  Stalagmite = 126,
  /** Old bones heaped in a corner. One kick scatters them. */
  BonePile = 127,
  /** An iron fire-basket on a stand — the dungeon's lamp post. */
  Brazier = 128,
  /** A cluster of pale glowing cave mushrooms. */
  GlowShroom = 129,
  /** Rubble-strewn cave floor — walkable texture, reads as debris. */
  CaveRubble = 130,
  /** Cave wall with a visible fracture: three blows open the way. */
  CrackedCaveWall = 131,
  /** Worked flagstone floor — the masonry dialect of dungeon halls. */
  DungeonFloor = 132,
  /**
   * A jetty deck striding out over the water on driven piles — the
   * EXPOSED, suspended structure. Bridge is its sibling: the same
   * raised walk, but seated INTO both banks with stone abutments,
   * piers, and rails. The renderer paints them as different builds.
   */
  Dock = 133,
  /**
   * Fence gates — a waist-high five-bar field gate hung in a fence
   * line. THE TILE IS THE STATE, exactly the door law: the open gate
   * is WALKABLE and the shut gate is SOLID, so posture, collision,
   * and pathing all sync through the ordinary tile-patch pipeline.
   * Gates ride the whole door machinery (interact, occupancy check,
   * locks, auto-close) via DOOR_INFO material 'fence' — but they are
   * NOT wall-run members and never bound an interior.
   */
  FenceGate = 134,
  FenceGateShut = 135,
  /**
   * 45° fence segments. The rail line runs corner to corner: DiagNE
   * rises to the northeast ("/" in plan, connecting the SW and NE
   * corners), DiagNW rises to the northwest ("\", connecting SE and
   * NW). Placement auto-orients from the diagonal fence neighbours —
   * build the adjoining runs first, then the turn.
   */
  FenceDiagNE = 136,
  FenceDiagNW = 137,
  /**
   * A roadside signpost: a planted post carrying a plank board (and a
   * pointing fingerboard below it). The hanging shingle names the
   * building it hangs off; the POST stands free at a fork, a
   * threshold, or a homestead gate and says where you are or where
   * this road goes. Both carry words the same way — see signs.ts: the
   * tile is only the furniture, the text lives in a record keyed by
   * this tile's coordinates.
   */
  Signpost = 138,
  /**
   * THE GARRISON FAMILY — fortification masonry, a whole dialect
   * apart from building walls. A curtain wall is siege-work: half
   * again the height of a house, a battered talus footing, great
   * ashlar courses, and a crenellated wall-walk along the crown.
   * THE SEPARATE-MASONRY LAW: garrison tiles merge ONLY with other
   * garrison tiles — never with building walls (a keep's curtain
   * abutting a cottage shows two honest constructions, not one
   * smeared run) and never bounding an interior (a walled town is
   * not a room; the sky is its ceiling).
   */
  /** A straight curtain-wall segment — the rampart itself. */
  WallGarrison = 139,
  /**
   * 45° curtain segments, the diagonal-wall suffix convention: the
   * suffix names the SOLID triangle, the open triangle faces the
   * exterior, and placement auto-orients from the two perpendicular
   * garrison neighbours (raise the adjoining runs first).
   */
  WallGarrisonDiagNE = 140,
  WallGarrisonDiagNW = 141,
  WallGarrisonDiagSE = 142,
  WallGarrisonDiagSW = 143,
  /**
   * The garrison gate — a true gatehouse passage cut through the
   * curtain. THE TILE IS THE STATE (the door law): open is walkable,
   * shut is solid, and the whole machinery (interact, occupancy,
   * locks, rattle, auto-close) rides DOOR_INFO material 'garrison'.
   * Wide by construction: adjacent gate tiles in a run merge into
   * ONE grand arched opening — flanking piers at the run ends, a
   * voussoir arch, raised portcullis teeth in the soffit, and a
   * pair of iron-bound leaves that the server toggles atomically.
   */
  GateGarrison = 144,
  GateGarrisonShut = 145,
  /**
   * A high-backed royal throne — crown furniture, never harvestable.
   * Thrones pair: in an E-W pair the WEST seat is the King's (gilded
   * oak under crimson) and the EAST is the Queen's (silvered ash
   * under moonpale blue); a lone throne stands in the King's dress.
   * The back always addresses the hall — it faces the camera.
   */
  Throne = 146,
  /**
   * The sawyer's trestles: a log racked across two X-frames with the
   * rip saw parked mid-kerf. The board station — construction's own
   * bench, cheap enough to raise at the treeline and saw where you
   * chop (buildable at construction 1, whole logs on purpose: no one
   * saws boards before they own a saw stand).
   */
  Sawhorse = 147,
  /**
   * A northern pine — the cold country's tiered spire. Pine logs are
   * the mid-wood of the bowyer's and builder's trades.
   */
  TreePine = 148,
  /** A pine sapling. */
  SaplingPine = 149,
  /**
   * THE THREE STALLS (beastcraft v2 Phase 4): the beast pen — where a
   * keeper's household rotates. Buildable at home, authored in towns;
   * the stable panel opens beside it and every stable-door act
   * re-checks this tile server-side (the vault's own law).
   */
  BeastPen = 150,
  // The fishing ladder (XP balance epic): each tier is its own water
  // dialect — same rise-ring language as FishingSpot, its own accent.
  PikeHole = 151,
  EelRun = 152,
  SalmonRun = 153,
  GlimmerShoal = 154,
  // THE PORCH (exterior decor Phase 3): the deck comes ashore.
  /**
   * A lifted timber deck on dry land — the dock's stance (DOCK_LIFT)
   * without the water. Walkable; render-only lift; boards take the
   * house's own wood when the deck touches a building.
   */
  PorchDeck = 155,
  /**
   * A hewn wooden porch post — the stone pillar's stance in cottage
   * timber. Solid; you walk around it; rails and awnings compose
   * beside it, it carries nothing structurally.
   */
  TimberPost = 156,
  // THE OUTWARD FACE — awnings, dealt in bands of DETAIL_BAND (16):
  // each anchor is the shape at dye 0 and `anchor + dye` wears the
  // dye roster (awningInfo reads it back). Walkable canopy tiles —
  // the cloth is overhead, the street runs on beneath. Ids in a band
  // are the state (never reorder); 157..159 stay free for the porch's
  // kin (a stone stoop, a step, whatever the wing needs).
  /** Plain sloped canvas on two timber brackets: +dye (160..175). */
  AwningShed = 160,
  /** Sloped canvas with the scalloped valance: +dye (176..191). */
  AwningMarket = 176,
  /** Flat timber-slat rain roof; dye paints the trim: +dye (192..207). */
  AwningBoard = 192,
  /** Barrel-curved canvas, the grand shopfront: +dye (208..223). */
  AwningBowed = 208,
  /**
   * THE WIND REMEMBERS THE STREET: the player-built banner pole,
   * dyed — +dye (224..239 reserved). The classic Tile.BannerPole
   * stays the authored, hash-dealt pole; a builder's pole carries
   * the dye they chose (THE DYE LAW, one more banded family).
   */
  BannerPoleDyed = 224,
  // THE LIVING SOIL (farming v2 Phase 1) — the tended yard's three new
  // bodies. 240.. sits clear of the dye bands (224..239 reserved);
  // tiles are Uint16 on the wire and in chunks, so the ceiling is far.
  /**
   * Slatted timber compost bin. A wall-clock station in spirit but
   * never a craft bench (the beast-pen law): scraps go in, the heap
   * works while you wander, compost comes out. Solid; the panel and
   * every deposit re-prove this tile server-side.
   */
  CompostBin = 240,
  /**
   * A stone well with windlass and bucket. Standing near one, a hand
   * watering sweeps the whole bed instead of a single plot. Solid.
   */
  Well = 241,
  /**
   * A board-lined irrigation trench. Walkable (you step over it);
   * fed when a well stands near, and a fed channel waters the plots
   * beside it at each stage on its own, paying no XP — automation
   * trades the lesson for the convenience, by law.
   */
  IrrigationChannel = 242,
  // THE FULL FIELD (farming v2 Phase 2) — the crop wave. Mid/Ripe
  // pairs like the founding six; the shared CropSprout still opens
  // every tilled-bed planting. Walkable field crops, SOLID orchard
  // trees (a trunk is a body), and the log/frame beds at the end.
  PotatoMid = 243,
  PotatoRipe = 244,
  OnionMid = 245,
  OnionRipe = 246,
  CabbageMid = 247,
  CabbageRipe = 248,
  PumpkinMid = 249,
  PumpkinRipe = 250,
  BarleyMid = 251,
  BarleyRipe = 252,
  RedrootMid = 253,
  RedrootRipe = 254,
  KingsquashMid = 255,
  KingsquashRipe = 256,
  BittercressMid = 257,
  BittercressRipe = 258,
  SilverleafMid = 259,
  SilverleafRipe = 260,
  DuskthornMid = 261,
  DuskthornRipe = 262,
  DawnveilMid = 263,
  DawnveilRipe = 264,
  AdderstongueMid = 265,
  AdderstongueRipe = 266,
  AppleTreeMid = 267,
  AppleTreeRipe = 268,
  BrambleMid = 269,
  BrambleRipe = 270,
  PlumTreeMid = 271,
  PlumTreeRipe = 272,
  MirefigMid = 273,
  MirefigRipe = 274,
  /**
   * A felled hardwood log laid for shade culture. Spores go in where
   * seeds would; no water, no soil, no grade — the dark bed keeps
   * its own counsel. Solid (knee-high timber).
   */
  MushroomLog = 275,
  /** A spored log, mycelium veining the bark — the log's sprout. */
  MushroomLogSeeded = 276,
  PalegillMid = 277,
  PalegillRipe = 278,
  /**
   * THE GROWING FRAME: a tilled bed under an oiled-cloth frame —
   * always watered, a touch faster, the cottager's glasshouse.
   * Builds ON a garden plot and hands the plot back when torn down.
   */
  GrowingFrame = 279,
}

export enum Detail {
  None = 0,
  Flowers = 1,
  Tuft = 2,
  Pebbles = 3,
  Mushroom = 4,
  // Baked floor decor — authored-only, walkable, painted into the
  // terrain bake (players place solid prop tiles, never detail).
  /** Woven rug; adjacent Rug tiles merge into one great hall rug. */
  Rug = 5,
  RugRound = 6,
  Doormat = 7,
  Sawdust = 8,
  Straw = 9,
  // THE FABRIC EPIC — royal cloth, floor and wall.
  /**
   * Fitted crimson velvet carpet with gold braid: adjacent tiles knit
   * seamlessly (braid + outline survive only on free edges), so runs
   * lay processional runners and fields carpet whole state rooms.
   */
  CarpetRoyal = 10,
  /** The Queen's carpet: moonpale blue velvet under silver braid. */
  CarpetMoon = 11,
  /**
   * WALL-HUNG cloth: these details are authored ON wall tiles and are
   * painted by the wall painters onto the south face (they hang, sway,
   * and sink with the wall) — the ground bake draws nothing for them.
   */
  /** The King's banner: three gilded peaks on crimson. */
  BannerCrown = 12,
  /** The Queen's banner: the silver arch and moonpale drop. */
  BannerMoon = 13,
  /**
   * Grand pictorial tapestry — the Silverfall weave. Adjacent wall
   * tiles carrying Tapestry merge into ONE wide hanging.
   */
  Tapestry = 14,
  // THE OUTWARD FACE — player-hung wall decor, dealt in BANDS of
  // DETAIL_BAND (16) so every dyeable family has room to grow without
  // renumbering (the id IS the state — never reorder a shipped band).
  // Each anchor below is dye/motif index 0; wallHungInfo() reads any
  // id in a band back to {kind, dye|motif|species}.
  /** Vertical dyed cloth off an iron rod: +dye 0..9 (16..31 reserved). */
  WallBanner = 16,
  /** Swagged string of small pennant flags: +dye (32..47 reserved). */
  Pennant = 32,
  /** Trade shingle on a wrought bracket: +motif (48..63 reserved). */
  BracketSign = 48,
  /** Timber lattice with a climbing plant: +species (64..79 reserved). */
  Trellis = 64,
  /** Hanging bloom basket on a bracket arm (80; band 80..95 reserved). */
  WallBasket = 80,
}

/**
 * THE DYE LAW (exterior decor): shape is structure, color is dye — one
 * ten-dye roster shared by every dyeable piece, carried in the id band
 * (detail or tile) as `base + dye`. Index order is FOREVER (rename a
 * dye in place, never reorder — the affix-pool law). Player-facing
 * names live in content's DYES table, pinned to this count.
 */
export const DYE_COUNT = 10;
/** Stride of every banded decor family — room for dyes yet unmixed. */
export const DETAIL_BAND = 16;
/** Carved trade motifs on the bracket sign, index order FOREVER. */
export const SIGN_MOTIF_COUNT = 8;
/** Climbing species on the trellis, index order FOREVER. */
export const TRELLIS_SPECIES_COUNT = 3;

export type WallHungKind =
  | 'crown'
  | 'moon'
  | 'tapestry'
  | 'banner'
  | 'pennant'
  | 'sign'
  | 'trellis'
  | 'basket';

export interface WallHungInfo {
  kind: WallHungKind;
  /** Dye index (banner/pennant families). */
  dye?: number;
  /** Trade-motif index (bracket sign). */
  motif?: number;
  /** Climbing-plant species index (trellis). */
  species?: number;
}

/**
 * Read any wall-hung detail id back to its family + variant. Null for
 * ground details and unused band slots — the one gate every consumer
 * (painters, build lane, editors) resolves through.
 */
export function wallHungInfo(d: number): WallHungInfo | null {
  switch (d) {
    case Detail.BannerCrown:
      return { kind: 'crown' };
    case Detail.BannerMoon:
      return { kind: 'moon' };
    case Detail.Tapestry:
      return { kind: 'tapestry' };
  }
  if (d >= Detail.WallBanner && d < Detail.WallBanner + DYE_COUNT)
    return { kind: 'banner', dye: d - Detail.WallBanner };
  if (d >= Detail.Pennant && d < Detail.Pennant + DYE_COUNT)
    return { kind: 'pennant', dye: d - Detail.Pennant };
  if (d >= Detail.BracketSign && d < Detail.BracketSign + SIGN_MOTIF_COUNT)
    return { kind: 'sign', motif: d - Detail.BracketSign };
  if (d >= Detail.Trellis && d < Detail.Trellis + TRELLIS_SPECIES_COUNT)
    return { kind: 'trellis', species: d - Detail.Trellis };
  if (d === Detail.WallBasket) return { kind: 'basket' };
  return null;
}

/** The banner detail wearing this dye (validated — bad dye throws). */
export function wallBannerDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.WallBanner + dye;
}

/** The pennant-string detail wearing this dye. */
export function pennantDetail(dye: number): Detail {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Detail.Pennant + dye;
}

/** The bracket sign carrying this trade motif. */
export function bracketSignDetail(motif: number): Detail {
  if (!Number.isInteger(motif) || motif < 0 || motif >= SIGN_MOTIF_COUNT)
    throw new Error(`bad motif ${motif}`);
  return Detail.BracketSign + motif;
}

/** The trellis growing this climbing species. */
export function trellisDetail(species: number): Detail {
  if (!Number.isInteger(species) || species < 0 || species >= TRELLIS_SPECIES_COUNT)
    throw new Error(`bad species ${species}`);
  return Detail.Trellis + species;
}

/**
 * Details that hang on wall faces instead of lying on the ground —
 * the terrain bake skips them; wall painters own their art. Built
 * from wallHungInfo so the set and the reader can never disagree.
 */
export const WALL_HUNG_DETAILS: ReadonlySet<Detail> = new Set(
  Array.from({ length: 256 }, (_, d) => d).filter((d) => wallHungInfo(d) !== null),
) as ReadonlySet<Detail>;

/**
 * THE HANGING LAW's footing: only walls whose painters actually dress
 * a south face may carry a hanging — plain full walls (wallItem) and
 * the garrison curtain. Doorways, window walls, and 45° corners are
 * wall-run members whose painters never call the hangings pass, so a
 * detail written there would be INVISIBLE orphan state; the build
 * lane refuses them here, at the one shared gate.
 */
export const HANGABLE_WALL_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallGarrison,
]);

/**
 * Walls an awning may bolt to (the tile NORTH of the awning): full
 * building walls, glazed walls, and straight doorways — every classic
 * shopfront host presents a framed south face for the brackets. 45°
 * corners never host (no full south face to bolt into), and the
 * garrison curtain keeps its martial bareness.
 */
export const AWNING_HOST_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallStone,
  Tile.WallWood,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
]);

export interface TileDef {
  name: string;
  solid: boolean;
  /** Base fill color; variants add per-tile hash variation. */
  color: string;
  variants?: string[];
  /** Drawn as a raised block with a top highlight + hard shadow. */
  raised?: boolean;
  topColor?: string;
}

export const TILE_DEFS: Record<Tile, TileDef> = {
  [Tile.Void]: { name: 'void', solid: true, color: '#141020' },
  [Tile.Grass]: {
    name: 'grass',
    solid: false,
    color: '#5d8a3e',
    variants: ['#578339', '#649247'],
  },
  [Tile.GrassTall]: { name: 'tall grass', solid: false, color: '#4f7c35', variants: ['#4a7632'] },
  [Tile.Dirt]: { name: 'dirt', solid: false, color: '#96744c', variants: ['#8f6e47'] },
  [Tile.Path]: { name: 'path', solid: false, color: '#c2a26e', variants: ['#bb9c68'] },
  [Tile.Sand]: { name: 'sand', solid: false, color: '#ddc98d', variants: ['#d6c286'] },
  [Tile.Water]: { name: 'water', solid: true, color: '#4979b8', variants: ['#4472ae'] },
  [Tile.WaterShallow]: { name: 'shallow water', solid: false, color: '#649cc0', variants: ['#5f96ba'] },
  [Tile.WaterDeep]: { name: 'deep water', solid: true, color: '#3a629e', variants: ['#355c94'] },
  [Tile.StoneFloor]: {
    name: 'stone floor',
    solid: false,
    color: '#a09aa8',
    variants: ['#98929f', '#a8a2b0'],
  },
  [Tile.WoodFloor]: { name: 'wood floor', solid: false, color: '#a87e46', variants: ['#a07641'] },
  [Tile.WallStone]: {
    name: 'stone wall',
    solid: true,
    color: '#4a4554',
    raised: true,
    topColor: '#767181',
  },
  [Tile.WallWood]: {
    name: 'wood wall',
    solid: true,
    color: '#54391c',
    raised: true,
    topColor: '#7d5a2e',
  },
  [Tile.Tree]: { name: 'tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#2d6631' },
  [Tile.Rock]: { name: 'rock', solid: true, color: '#6e6a75', raised: true, topColor: '#827e8a' },
  [Tile.Stump]: { name: 'stump', solid: false, color: '#8a6a45' },
  [Tile.Fence]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Bridge]: { name: 'bridge', solid: false, color: '#96703c', variants: ['#8e6836'] },
  [Tile.Dock]: { name: 'dock', solid: false, color: '#9c7a4a', variants: ['#92714a'] },
  [Tile.Snow]: { name: 'snow', solid: false, color: '#e8ecf2', variants: ['#dfe4ec'] },
  [Tile.Swamp]: { name: 'swamp', solid: false, color: '#4d6b3c', variants: ['#476339'] },
  [Tile.TreeOak]: { name: 'oak tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1f5426' },
  [Tile.TreeWillow]: { name: 'willow tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#5a8a4a' },
  [Tile.TreeYew]: { name: 'yew tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#1e4028' },
  [Tile.TreePine]: { name: 'pine tree', solid: true, color: '#3f7d3a', raised: true, topColor: '#2b5747' },
  [Tile.RockCopper]: { name: 'copper rock', solid: true, color: '#6e6a75', raised: true, topColor: '#b87333' },
  [Tile.RockIron]: { name: 'iron rock', solid: true, color: '#6e6a75', raised: true, topColor: '#8d9299' },
  [Tile.RockDepleted]: { name: 'depleted rock', solid: true, color: '#57535f', raised: true, topColor: '#615d69' },
  [Tile.FishingSpot]: { name: 'fishing spot', solid: true, color: '#3d6fb8', variants: ['#3a69ae'] },
  [Tile.Campfire]: { name: 'campfire', solid: true, color: '#8a6a45', raised: true, topColor: '#e8823d' },
  [Tile.Furnace]: { name: 'furnace', solid: true, color: '#55505e', raised: true, topColor: '#e8573d' },
  [Tile.Anvil]: { name: 'anvil', solid: true, color: '#55505e', raised: true, topColor: '#3a363f' },
  [Tile.Workbench]: { name: 'workbench', solid: true, color: '#7d5a2e', raised: true, topColor: '#a5793f' },
  [Tile.BankChest]: { name: 'bank chest', solid: true, color: '#7d5a2e', raised: true, topColor: '#e8a33d' },
  [Tile.ShopCounter]: { name: 'shop counter', solid: true, color: '#7d5a2e', raised: true, topColor: '#96703c' },
  [Tile.CaveWall]: { name: 'cave wall', solid: true, color: '#2e2937', raised: true, topColor: '#3d3749' },
  [Tile.CaveFloor]: { name: 'cave floor', solid: false, color: '#4d4757', variants: ['#48424f', '#524c5e'] },
  [Tile.PortalDown]: { name: 'cave entrance', solid: false, color: '#1a1626', variants: ['#221c30'] },
  [Tile.PortalUp]: { name: 'way out', solid: false, color: '#5b4f7a', variants: ['#65588a'] },
  [Tile.Cliff]: { name: 'cliff', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.Ramp]: { name: 'stone stair', solid: false, color: '#8a8494', variants: ['#847e8e'] },
  [Tile.RockTin]: { name: 'tin rock', solid: true, color: '#6e6a75', raised: true, topColor: '#c9c4cf' },
  [Tile.RockCoal]: { name: 'coal rock', solid: true, color: '#6e6a75', raised: true, topColor: '#2e2b33' },
  [Tile.RockGold]: { name: 'gold rock', solid: true, color: '#6e6a75', raised: true, topColor: '#e8b64c' },
  [Tile.LampPost]: { name: 'lamp post', solid: true, color: '#3a3444', raised: true, topColor: '#e8c06a' },
  [Tile.Tilled]: { name: 'garden plot', solid: false, color: '#6b4f33', variants: ['#654a30', '#715436'] },
  [Tile.CropSprout]: { name: 'sprout', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CarrotMid]: { name: 'carrots', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CarrotRipe]: { name: 'ripe carrots', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SagewortMid]: { name: 'sagewort', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SagewortRipe]: { name: 'ripe sagewort', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SunflowerMid]: { name: 'sunflowers', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.SunflowerRipe]: { name: 'ripe sunflowers', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.WheatMid]: { name: 'wheat', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.WheatRipe]: { name: 'ripe wheat', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CottonMid]: { name: 'cotton', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.CottonRipe]: { name: 'ripe cotton', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.MoonbellMid]: { name: 'moonbell', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.MoonbellRipe]: { name: 'ripe moonbell', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.Alembic]: { name: 'alembic bench', solid: true, color: '#7d5a2e', raised: true, topColor: '#7fc9b3' },
  [Tile.BerryBush]: { name: 'berry bush', solid: true, color: '#3a6d38', raised: true, topColor: '#2f5c32' },
  [Tile.FibrePlant]: { name: 'fibre plant', solid: true, color: '#5f8a44', raised: true, topColor: '#79a355' },
  [Tile.WildSagewort]: { name: 'wild sagewort', solid: true, color: '#5b8a5e', raised: true, topColor: '#8fb083' },
  [Tile.WildMoonbell]: { name: 'wild moonbell', solid: true, color: '#4c5578', raised: true, topColor: '#8f9ed6' },
  [Tile.WallStoneWindow]: {
    name: 'stone wall window',
    solid: true,
    color: '#4a4554',
    raised: true,
    topColor: '#767181',
  },
  [Tile.WallWoodWindow]: {
    name: 'wood wall window',
    solid: true,
    color: '#54391c',
    raised: true,
    topColor: '#7d5a2e',
  },
  [Tile.DoorwayStone]: { name: 'stone doorway', solid: false, color: '#4a4554' },
  [Tile.DoorwayWood]: { name: 'wood doorway', solid: false, color: '#54391c' },
  [Tile.DoorwayStoneWide]: { name: 'wide stone doorway', solid: false, color: '#4a4554' },
  [Tile.DoorwayWoodWide]: { name: 'wide wood doorway', solid: false, color: '#54391c' },
  [Tile.DoorwayStoneShut]: { name: 'shut stone doorway', solid: true, color: '#4a4554' },
  [Tile.DoorwayWoodShut]: { name: 'shut wood doorway', solid: true, color: '#54391c' },
  [Tile.DoorwayStoneWideShut]: { name: 'shut wide stone doorway', solid: true, color: '#4a4554' },
  [Tile.DoorwayWoodWideShut]: { name: 'shut wide wood doorway', solid: true, color: '#54391c' },
  [Tile.WallStoneDiagNE]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagNW]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagSE]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallStoneDiagSW]: { name: 'stone wall corner', solid: true, color: '#4a4554', raised: true, topColor: '#767181' },
  [Tile.WallWoodDiagNE]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagNW]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagSE]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.WallWoodDiagSW]: { name: 'wood wall corner', solid: true, color: '#54391c', raised: true, topColor: '#7d5a2e' },
  [Tile.ArchStone]: { name: 'stone arch', solid: false, color: '#5b5566' },
  [Tile.PillarStone]: { name: 'stone pillar', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.RailWood]: { name: 'wood railing', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Barrel]: { name: 'barrel', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Crate]: { name: 'crate', solid: true, color: '#8a6534', raised: true, topColor: '#a5793f' },
  [Tile.CrateGoods]: { name: 'goods crate', solid: true, color: '#8a6534', raised: true, topColor: '#d98e3c' },
  [Tile.Table]: { name: 'table', solid: true, color: '#7a552e', raised: true, topColor: '#a5793f' },
  [Tile.Chair]: { name: 'chair', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Bench]: { name: 'bench', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.Bed]: { name: 'bed', solid: true, color: '#7a552e', raised: true, topColor: '#a34b52' },
  [Tile.Bookshelf]: { name: 'bookshelf', solid: true, color: '#5e3f1e', raised: true, topColor: '#7a552e' },
  [Tile.Cabinet]: { name: 'cabinet', solid: true, color: '#6f4d26', raised: true, topColor: '#8a6534' },
  [Tile.Counter]: { name: 'counter', solid: true, color: '#6f4d26', raised: true, topColor: '#94693a' },
  [Tile.Hearth]: { name: 'hearth', solid: true, color: '#55505e', raised: true, topColor: '#e8823d' },
  [Tile.MarketStall]: { name: 'market stall', solid: true, color: '#7a552e', raised: true, topColor: '#b5493e' },
  [Tile.BannerPole]: { name: 'banner pole', solid: true, color: '#3a3444', raised: true, topColor: '#7a3f8f' },
  [Tile.HangingSign]: { name: 'hanging sign', solid: true, color: '#5e3f1e', raised: true, topColor: '#a5793f' },
  [Tile.FlowerBox]: { name: 'flower box', solid: true, color: '#6f4d26', raised: true, topColor: '#d977a8' },
  [Tile.ToolRack]: { name: 'tool rack', solid: true, color: '#5e3f1e', raised: true, topColor: '#8a8a95' },
  [Tile.WeaponRack]: { name: 'weapon rack', solid: true, color: '#5e3f1e', raised: true, topColor: '#b6bcc6' },
  [Tile.Vault]: { name: 'vault', solid: true, color: '#3f3a4a', raised: true, topColor: '#e8a33d' },
  [Tile.Lectern]: { name: 'lectern', solid: true, color: '#6f4d26', raised: true, topColor: '#e8dfc8' },
  [Tile.Basin]: { name: 'basin', solid: true, color: '#5b5566', raised: true, topColor: '#4979b8' },
  [Tile.TanningRack]: { name: 'tanning rack', solid: true, color: '#6f4d26', raised: true, topColor: '#b08a5c' },
  [Tile.Loom]: { name: 'loom', solid: true, color: '#6f4d26', raised: true, topColor: '#d8cbb0' },
  [Tile.CarvingBench]: { name: 'carving bench', solid: true, color: '#7d5a2e', raised: true, topColor: '#9b7440' },
  [Tile.Sawhorse]: { name: 'sawhorse', solid: true, color: '#7d5a2e', raised: true, topColor: '#a8794a' },
  [Tile.BeastPen]: { name: 'beast pen', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.CompostBin]: { name: 'compost bin', solid: true, color: '#6e5433', raised: true, topColor: '#4a3a28' },
  [Tile.Well]: { name: 'well', solid: true, color: '#6e6a75', raised: true, topColor: '#827e8a' },
  [Tile.IrrigationChannel]: { name: 'irrigation channel', solid: false, color: '#7a5c3c', variants: ['#735739'] },
  [Tile.PotatoMid]: { name: 'potato plants', solid: false, color: '#654a30' },
  [Tile.PotatoRipe]: { name: 'ripe potatoes', solid: false, color: '#654a30' },
  [Tile.OnionMid]: { name: 'onion shoots', solid: false, color: '#654a30' },
  [Tile.OnionRipe]: { name: 'ripe onions', solid: false, color: '#654a30' },
  [Tile.CabbageMid]: { name: 'young cabbage', solid: false, color: '#654a30' },
  [Tile.CabbageRipe]: { name: 'ripe cabbage', solid: false, color: '#654a30' },
  [Tile.PumpkinMid]: { name: 'pumpkin vine', solid: false, color: '#654a30' },
  [Tile.PumpkinRipe]: { name: 'ripe pumpkin', solid: false, color: '#654a30' },
  [Tile.BarleyMid]: { name: 'green barley', solid: false, color: '#654a30' },
  [Tile.BarleyRipe]: { name: 'ripe barley', solid: false, color: '#654a30' },
  [Tile.RedrootMid]: { name: 'redroot plants', solid: false, color: '#654a30' },
  [Tile.RedrootRipe]: { name: 'ripe redroot', solid: false, color: '#654a30' },
  [Tile.KingsquashMid]: { name: 'kingsquash vine', solid: false, color: '#654a30' },
  [Tile.KingsquashRipe]: { name: 'ripe kingsquash', solid: false, color: '#654a30' },
  [Tile.BittercressMid]: { name: 'young bittercress', solid: false, color: '#654a30' },
  [Tile.BittercressRipe]: { name: 'ripe bittercress', solid: false, color: '#654a30' },
  [Tile.SilverleafMid]: { name: 'young silverleaf', solid: false, color: '#654a30' },
  [Tile.SilverleafRipe]: { name: 'ripe silverleaf', solid: false, color: '#654a30' },
  [Tile.DuskthornMid]: { name: 'young duskthorn', solid: false, color: '#654a30' },
  [Tile.DuskthornRipe]: { name: 'ripe duskthorn', solid: false, color: '#654a30' },
  [Tile.DawnveilMid]: { name: 'young dawnveil', solid: false, color: '#654a30' },
  [Tile.DawnveilRipe]: { name: 'ripe dawnveil', solid: false, color: '#654a30' },
  [Tile.AdderstongueMid]: { name: 'young adderstongue', solid: false, color: '#654a30' },
  [Tile.AdderstongueRipe]: { name: 'ripe adderstongue', solid: false, color: '#654a30' },
  [Tile.AppleTreeMid]: { name: 'young apple tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.AppleTreeRipe]: { name: 'apple tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.BrambleMid]: { name: 'bramble canes', solid: false, color: '#654a30' },
  [Tile.BrambleRipe]: { name: 'ripe bramblevine', solid: false, color: '#654a30' },
  [Tile.PlumTreeMid]: { name: 'young plum tree', solid: true, color: '#654a30', raised: true, topColor: '#4f7c35' },
  [Tile.PlumTreeRipe]: { name: 'plum tree', solid: true, color: '#654a30', raised: true, topColor: '#446a3a' },
  [Tile.MirefigMid]: { name: 'young mirefig', solid: true, color: '#654a30', raised: true, topColor: '#5a6b3a' },
  [Tile.MirefigRipe]: { name: 'mirefig tree', solid: true, color: '#654a30', raised: true, topColor: '#5a6b3a' },
  [Tile.MushroomLog]: { name: 'mushroom log', solid: true, color: '#5f4426', raised: true, topColor: '#7d5a2e' },
  [Tile.MushroomLogSeeded]: { name: 'spored log', solid: true, color: '#5f4426', raised: true, topColor: '#8d867c' },
  [Tile.PalegillMid]: { name: 'budding palegill', solid: true, color: '#5f4426', raised: true, topColor: '#c9c2b4' },
  [Tile.PalegillRipe]: { name: 'ripe palegill', solid: true, color: '#5f4426', raised: true, topColor: '#d8d2c4' },
  [Tile.GrowingFrame]: { name: 'growing frame', solid: false, color: '#6b4f33', variants: ['#654a30'] },
  [Tile.PikeHole]: { name: 'pike hole', solid: true, color: '#39679c', variants: ['#366293'] },
  [Tile.EelRun]: { name: 'eel run', solid: true, color: '#31578c', variants: ['#2e5284'] },
  [Tile.SalmonRun]: { name: 'salmon run', solid: true, color: '#457bbd', variants: ['#4174b3'] },
  [Tile.GlimmerShoal]: { name: 'glimmer shoal', solid: true, color: '#4f84c9', variants: ['#4a7dc0'] },
  [Tile.EnchantingTable]: { name: 'enchanting table', solid: true, color: '#4a3f5e', raised: true, topColor: '#7a6aa8' },
  // Saplings: the middle beat of tree regrowth (stump → sapling →
  // tree). Walkable — you step over a knee-high whip — and not a
  // gather node, so they can't be chopped back down mid-growth.
  [Tile.Sapling]: { name: 'sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#57a04b' },
  [Tile.SaplingOak]: { name: 'oak sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#2d6631' },
  [Tile.SaplingWillow]: { name: 'willow sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#5a8a4a' },
  [Tile.SaplingYew]: { name: 'yew sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#1e4028' },
  [Tile.SaplingPine]: { name: 'pine sapling', solid: false, color: '#4f8a42', raised: true, topColor: '#2b5747' },
  [Tile.ChestWood]: { name: 'chest', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.ChestWoodOpen]: { name: 'open chest', solid: true, color: '#7a552e', raised: true, topColor: '#94693a' },
  [Tile.ChestIron]: { name: 'strongchest', solid: true, color: '#4a4048', raised: true, topColor: '#5e5560' },
  [Tile.ChestIronOpen]: { name: 'open strongchest', solid: true, color: '#4a4048', raised: true, topColor: '#5e5560' },
  [Tile.ChestGilded]: { name: 'gilded coffer', solid: true, color: '#8a6218', raised: true, topColor: '#d9a441' },
  [Tile.ChestGildedOpen]: { name: 'open gilded coffer', solid: true, color: '#8a6218', raised: true, topColor: '#d9a441' },
  [Tile.ChestMossy]: { name: 'mossgrown chest', solid: true, color: '#5a5244', raised: true, topColor: '#5c6b46' },
  [Tile.ChestMossyOpen]: { name: 'open mossgrown chest', solid: true, color: '#5a5244', raised: true, topColor: '#5c6b46' },
  [Tile.ChestBoss]: { name: 'boss chest', solid: true, color: '#2b2635', raised: true, topColor: '#453f52' },
  [Tile.ChestBossOpen]: { name: 'open boss chest', solid: true, color: '#2b2635', raised: true, topColor: '#453f52' },
  [Tile.RockSilver]: { name: 'silver rock', solid: true, color: '#6e6a75', raised: true, topColor: '#dce4f0' },
  [Tile.RockMithril]: { name: 'mithril rock', solid: true, color: '#6e6a75', raised: true, topColor: '#7fa8d9' },
  [Tile.RockAdamant]: { name: 'adamant rock', solid: true, color: '#6e6a75', raised: true, topColor: '#5fa06a' },
  [Tile.RockObsidian]: { name: 'obsidian flow', solid: true, color: '#6e6a75', raised: true, topColor: '#38304a' },
  [Tile.RockStarfall]: { name: 'starfall crater', solid: true, color: '#6e6a75', raised: true, topColor: '#cabdf2' },
  [Tile.Stalagmite]: { name: 'stalagmite', solid: true, color: '#3a3444', raised: true, topColor: '#5a5370' },
  [Tile.BonePile]: { name: 'bone pile', solid: true, color: '#8b8272', raised: true, topColor: '#cfc7ae' },
  [Tile.Brazier]: { name: 'brazier', solid: true, color: '#3c3640', raised: true, topColor: '#e8933c' },
  [Tile.GlowShroom]: { name: 'glowshrooms', solid: true, color: '#3f4a52', raised: true, topColor: '#8fe0cf' },
  [Tile.CaveRubble]: { name: 'rubble', solid: false, color: '#544e5f', variants: ['#4f4959', '#585264'] },
  // Deliberately the CaveWall palette: the crack is a whisper, not a
  // signpost — spotting one is the discovery.
  [Tile.CrackedCaveWall]: { name: 'cracked wall', solid: true, color: '#2e2937', raised: true, topColor: '#3d3749' },
  [Tile.DungeonFloor]: { name: 'flagstones', solid: false, color: '#514b58', variants: ['#4c4653', '#56505e'] },
  // Fence gates: the open gate is a WALKABLE raised prop (the leaf
  // stands swung aside); the shut gate bars the way like any fence.
  [Tile.FenceGate]: { name: 'fence gate', solid: false, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceGateShut]: { name: 'shut fence gate', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceDiagNE]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.FenceDiagNW]: { name: 'fence', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6534' },
  [Tile.Signpost]: { name: 'signpost', solid: true, color: '#6b4a24', raised: true, topColor: '#c2a068' },
  // Garrison masonry: a shade deeper and cooler than house stone —
  // rampart granite against the '#4a4554'/'#767181' of building walls.
  [Tile.WallGarrison]: { name: 'garrison wall', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagNE]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagNW]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagSE]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.WallGarrisonDiagSW]: { name: 'garrison wall corner', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  // The open gate is a walkable passage under the gatehouse arch; the
  // shut gate bars it with iron-bound leaves.
  [Tile.GateGarrison]: { name: 'garrison gate', solid: false, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.GateGarrisonShut]: { name: 'shut garrison gate', solid: true, color: '#453f52', raised: true, topColor: '#716b80' },
  [Tile.Throne]: { name: 'throne', solid: true, color: '#7a552e', raised: true, topColor: '#c9962e' },
  [Tile.PorchDeck]: { name: 'porch deck', solid: false, color: '#9a7040', variants: ['#93693a'] },
  [Tile.TimberPost]: { name: 'timber post', solid: true, color: '#7a5c34', raised: true, topColor: '#93713f' },
  // THE OUTWARD FACE — awning anchors (dye 0 = linen). Walkable: the
  // canvas is overhead, the street runs on beneath. The other dyes'
  // defs are generated right below the literal from these anchors.
  [Tile.AwningShed]: { name: 'shed awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.AwningMarket]: { name: 'market awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.AwningBoard]: { name: 'board awning', solid: false, color: '#6e4b29', raised: true, topColor: '#8a6336' },
  [Tile.AwningBowed]: { name: 'bowed awning', solid: false, color: '#c9bfa8', raised: true, topColor: '#d8cfba' },
  [Tile.BannerPoleDyed]: { name: 'banner pole', solid: true, color: '#6f4d26', raised: true, topColor: '#8a6534' },
};

/** The four awning silhouettes, index order FOREVER (the id math). */
export const AWNING_SHAPES = ['shed', 'market', 'board', 'bowed'] as const;
export type AwningShape = (typeof AWNING_SHAPES)[number];

const AWNING_BASES: readonly Tile[] = [
  Tile.AwningShed,
  Tile.AwningMarket,
  Tile.AwningBoard,
  Tile.AwningBowed,
];

export interface AwningInfo {
  shape: AwningShape;
  /** Index into AWNING_SHAPES — the buildable/painter family key. */
  shapeIndex: number;
  /** Index into the shared dye roster (THE DYE LAW). */
  dye: number;
}

/** Read any awning tile back to {shape, dye}; null for everything else. */
export function awningInfo(t: number): AwningInfo | null {
  for (let i = 0; i < AWNING_BASES.length; i++) {
    const base = AWNING_BASES[i]!;
    if (t >= base && t < base + DYE_COUNT)
      return { shape: AWNING_SHAPES[i]!, shapeIndex: i, dye: t - base };
  }
  return null;
}

/** The tile of this shape wearing this dye (validated — bad input throws). */
export function awningTile(shape: AwningShape, dye: number): Tile {
  const i = AWNING_SHAPES.indexOf(shape);
  if (i < 0) throw new Error(`bad awning shape ${shape}`);
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return AWNING_BASES[i]! + dye;
}

/** Read a dyed banner pole back to its dye; null for everything else. */
export function bannerPoleInfo(t: number): { dye: number } | null {
  if (t >= Tile.BannerPoleDyed && t < Tile.BannerPoleDyed + DYE_COUNT)
    return { dye: t - Tile.BannerPoleDyed };
  return null;
}

/** The dyed pole tile for this dye (validated — bad dye throws). */
export function bannerPoleTile(dye: number): Tile {
  if (!Number.isInteger(dye) || dye < 0 || dye >= DYE_COUNT) throw new Error(`bad dye ${dye}`);
  return Tile.BannerPoleDyed + dye;
}

/** Every awning id, all shapes and dyes — palette/test sweeps. */
export const AWNING_TILES: ReadonlySet<Tile> = new Set(
  AWNING_BASES.flatMap((base) => Array.from({ length: DYE_COUNT }, (_, dye) => base + dye)),
) as ReadonlySet<Tile>;

// Dye 1..9 defs derive from their shape's anchor — same physics, same
// silhouette; the painter reads the dye, the def only names the shape.
for (const base of AWNING_BASES) {
  const anchor = TILE_DEFS[base]!;
  for (let dye = 1; dye < DYE_COUNT; dye++) {
    (TILE_DEFS as Record<number, TileDef>)[base + dye] = anchor;
  }
}
for (let dye = 1; dye < DYE_COUNT; dye++) {
  (TILE_DEFS as Record<number, TileDef>)[Tile.BannerPoleDyed + dye] =
    TILE_DEFS[Tile.BannerPoleDyed]!;
}

/**
 * Tiles that merge into continuous wall runs for the renderer's
 * auto-tiler: solid walls, windowed walls, and walkable doorways all
 * join the same mass so a building reads as one structure.
 */
export const WALL_RUN_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
  Tile.WallStoneDiagNE,
  Tile.WallStoneDiagNW,
  Tile.WallStoneDiagSE,
  Tile.WallStoneDiagSW,
  Tile.WallWoodDiagNE,
  Tile.WallWoodDiagNW,
  Tile.WallWoodDiagSE,
  Tile.WallWoodDiagSW,
];

/** Which triangle of a 45° wall tile holds the mass. */
export type DiagWallMass = 'NE' | 'NW' | 'SE' | 'SW';

/** The three wall constructions that can turn a 45° corner. */
export type DiagWallMaterial = 'stone' | 'wood' | 'garrison';

const DIAG_WALL_INFO = new Map<Tile, { material: DiagWallMaterial; mass: DiagWallMass }>([
  [Tile.WallStoneDiagNE, { material: 'stone', mass: 'NE' }],
  [Tile.WallStoneDiagNW, { material: 'stone', mass: 'NW' }],
  [Tile.WallStoneDiagSE, { material: 'stone', mass: 'SE' }],
  [Tile.WallStoneDiagSW, { material: 'stone', mass: 'SW' }],
  [Tile.WallWoodDiagNE, { material: 'wood', mass: 'NE' }],
  [Tile.WallWoodDiagNW, { material: 'wood', mass: 'NW' }],
  [Tile.WallWoodDiagSE, { material: 'wood', mass: 'SE' }],
  [Tile.WallWoodDiagSW, { material: 'wood', mass: 'SW' }],
  [Tile.WallGarrisonDiagNE, { material: 'garrison', mass: 'NE' }],
  [Tile.WallGarrisonDiagNW, { material: 'garrison', mass: 'NW' }],
  [Tile.WallGarrisonDiagSE, { material: 'garrison', mass: 'SE' }],
  [Tile.WallGarrisonDiagSW, { material: 'garrison', mass: 'SW' }],
]);

/** All 45° wall tiles, every material. */
export const DIAG_WALL_TILES: ReadonlySet<Tile> = new Set(DIAG_WALL_INFO.keys());

/** Material + mass triangle of a 45° wall tile, or null. */
export function diagWallInfo(
  id: number,
): { material: DiagWallMaterial; mass: DiagWallMass } | null {
  return DIAG_WALL_INFO.get(id as Tile) ?? null;
}

/**
 * The 45° wall tile for a material + mass — the inverse of
 * diagWallInfo, and the door THE TRUE GHOST's explicit rotation walks
 * through: the player's chosen orient resolves here on both ends of
 * the wire, so the ghost's triangle IS the tile that lands.
 */
export function diagWallTile(material: DiagWallMaterial, mass: DiagWallMass): Tile {
  for (const [tile, info] of DIAG_WALL_INFO) {
    if (info.material === material && info.mass === mass) return tile;
  }
  return material === 'stone'
    ? Tile.WallStoneDiagNE
    : material === 'garrison'
      ? Tile.WallGarrisonDiagNE
      : Tile.WallWoodDiagNE;
}

/**
 * AUTO-ORIENT LAW: a diagonal wall spans the corner between the two
 * perpendicular wall neighbours present at placement time — N+E cuts
 * a SW corner, and so on. With no unambiguous pair it defaults to NE;
 * build the adjoining walls first, then the corner.
 */
export function orientDiagWall(
  material: DiagWallMaterial,
  n: boolean,
  e: boolean,
  s: boolean,
  w: boolean,
): Tile {
  const mass: DiagWallMass =
    n && e ? 'NE' : n && w ? 'NW' : s && e ? 'SE' : s && w ? 'SW' : 'NE';
  return diagWallTile(material, mass);
}

/**
 * THE GARRISON FAMILY — every tile of the fortification dialect:
 * straight curtain runs, the four 45° turns, and the gate in both
 * postures. THE SEPARATE-MASONRY LAW: garrison runs merge only with
 * this set — a curtain wall never joins a building's wall run (two
 * constructions abutting show two honest ends), and it never bounds
 * an interior region (a walled bailey is open sky, not a room). Run
 * connectivity, the renderer's rampart auto-tiler, and the build
 * auto-orient all key off this one set.
 */
export const GARRISON_TILES: ReadonlySet<Tile> = new Set([
  Tile.WallGarrison,
  Tile.WallGarrisonDiagNE,
  Tile.WallGarrisonDiagNW,
  Tile.WallGarrisonDiagSE,
  Tile.WallGarrisonDiagSW,
  Tile.GateGarrison,
  Tile.GateGarrisonShut,
]);

/**
 * Tiles that bound an interior region (the room enclosure test).
 * Doorways count — a doorway-closed ring encloses. Arches and
 * railings deliberately do NOT: a colonnade plaza is never a room.
 */
export const INTERIOR_BOUNDARY_TILES: readonly Tile[] = [...WALL_RUN_TILES];

/**
 * Tiles that stop lamplight in the lightmap. Doorways and arches let
 * light spill through openings; windows block (their glow is faked
 * with placed emitters instead).
 */
export const LIGHT_BLOCKING_TILES: readonly Tile[] = [
  Tile.WallStone,
  Tile.WallWood,
  Tile.CaveWall,
  Tile.CrackedCaveWall,
  Tile.WallStoneWindow,
  Tile.WallWoodWindow,
  Tile.PillarStone,
  ...DIAG_WALL_TILES,
  // A shut leaf stops lamplight; the open doorway spills it.
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
  // The curtain wall throws the longest shadow in town; an open gate
  // spills torchlight through the passage, a shut one seals it.
  Tile.WallGarrison,
  Tile.GateGarrisonShut,
];

/**
 * DOOR LAW — the tile is the state. Every doorway tile maps to its
 * material, width, and posture; `shutDoorTile`/`openDoorTile` are the
 * two halves of the toggle. Frame material tracks the wall it pierces
 * (the leaf itself is always timber — stone shells hang oak doors).
 * Material 'fence' is the waist-high field gate: it rides ALL the
 * door machinery (interact, locks, occupancy, auto-close) but the
 * renderer keeps it out of the wall-doorway pipeline — a gate is a
 * fence prop, never a wall member. Material 'garrison' is the
 * gatehouse passage: the same carve-out from the BUILDING doorway
 * pipeline (it lives in the garrison run family instead), but unlike
 * a fence gate its shut leaves are full-height mass — they block
 * lamplight and read as fortification.
 */
export type DoorMaterial = 'stone' | 'wood' | 'fence' | 'garrison';

export interface DoorInfo {
  material: DoorMaterial;
  /** Wide doorways merge into one opening and hang a French pair. */
  wide: boolean;
  /** True when a body can walk through — the leaf stands open. */
  open: boolean;
}

const DOOR_INFO = new Map<Tile, DoorInfo>([
  [Tile.DoorwayStone, { material: 'stone', wide: false, open: true }],
  [Tile.DoorwayWood, { material: 'wood', wide: false, open: true }],
  [Tile.DoorwayStoneWide, { material: 'stone', wide: true, open: true }],
  [Tile.DoorwayWoodWide, { material: 'wood', wide: true, open: true }],
  [Tile.DoorwayStoneShut, { material: 'stone', wide: false, open: false }],
  [Tile.DoorwayWoodShut, { material: 'wood', wide: false, open: false }],
  [Tile.DoorwayStoneWideShut, { material: 'stone', wide: true, open: false }],
  [Tile.DoorwayWoodWideShut, { material: 'wood', wide: true, open: false }],
  [Tile.FenceGate, { material: 'fence', wide: false, open: true }],
  [Tile.FenceGateShut, { material: 'fence', wide: false, open: false }],
  // Garrison gates are wide BY CONSTRUCTION: adjacent tiles merge
  // into one arched opening and the server flips the unit atomically.
  [Tile.GateGarrison, { material: 'garrison', wide: true, open: true }],
  [Tile.GateGarrisonShut, { material: 'garrison', wide: true, open: false }],
]);

/** Every doorway tile, open and shut, both widths and materials. */
export const DOOR_TILES: ReadonlySet<Tile> = new Set(DOOR_INFO.keys());

/** Material/width/posture of a doorway tile, or null. */
export function doorInfo(id: number): DoorInfo | null {
  return DOOR_INFO.get(id as Tile) ?? null;
}

const SHUT_OF = new Map<Tile, Tile>([
  [Tile.DoorwayStone, Tile.DoorwayStoneShut],
  [Tile.DoorwayWood, Tile.DoorwayWoodShut],
  [Tile.DoorwayStoneWide, Tile.DoorwayStoneWideShut],
  [Tile.DoorwayWoodWide, Tile.DoorwayWoodWideShut],
  [Tile.FenceGate, Tile.FenceGateShut],
  [Tile.GateGarrison, Tile.GateGarrisonShut],
]);
const OPEN_OF = new Map<Tile, Tile>([...SHUT_OF].map(([o, s]) => [s, o]));

/** The shut counterpart of a doorway tile (identity if already shut). */
export function shutDoorTile(id: number): Tile | null {
  const t = id as Tile;
  if (OPEN_OF.has(t)) return t;
  return SHUT_OF.get(t) ?? null;
}

/** The open counterpart of a doorway tile (identity if already open). */
export function openDoorTile(id: number): Tile | null {
  const t = id as Tile;
  if (SHUT_OF.has(t)) return t;
  return OPEN_OF.get(t) ?? null;
}

/**
 * THE FENCE FAMILY — every tile that reads as post-and-rail fencing:
 * straight runs, the two 45° turns, and gates in both postures. Rail
 * connectivity, arrow-stick height, and the grass underlay all key
 * off this one set so a pen always reads as one built line.
 */
export const FENCE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Fence,
  Tile.FenceDiagNE,
  Tile.FenceDiagNW,
  Tile.FenceGate,
  Tile.FenceGateShut,
]);

/**
 * AUTO-ORIENT LAW for the 45° fence: the turn spans whichever
 * diagonal already carries fencing — a fence-family neighbour on the
 * NE or SW corner deals "/" (DiagNE), on the NW or SE corner "\"
 * (DiagNW). With nothing to join it defaults to "/"; build the
 * adjoining runs first, then the turn.
 */
export function orientDiagFence(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.FenceDiagNE;
  if (nw || se) return Tile.FenceDiagNW;
  return Tile.FenceDiagNE;
}

/** Every mineable/mined rock formation tile, ore-bearing or not. */
export const ROCK_TILES: readonly Tile[] = [
  Tile.Rock,
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
  Tile.RockDepleted,
];

/** Ore-bearing rocks only — the ones a pickaxe gets something out of. */
export const ORE_TILES: readonly Tile[] = [
  Tile.RockCopper,
  Tile.RockTin,
  Tile.RockIron,
  Tile.RockCoal,
  Tile.RockGold,
  Tile.RockSilver,
  Tile.RockMithril,
  Tile.RockAdamant,
  Tile.RockObsidian,
  Tile.RockStarfall,
];

/** Crafting stations, keyed by what recipes call them. */
export type StationType =
  | 'fire'
  | 'furnace'
  | 'anvil'
  | 'workbench'
  | 'alembic'
  | 'tanning_rack'
  | 'loom'
  | 'carving_bench'
  | 'enchanting_table'
  | 'sawhorse';

export const STATION_TILES: Record<StationType, Tile> = {
  fire: Tile.Campfire,
  furnace: Tile.Furnace,
  anvil: Tile.Anvil,
  workbench: Tile.Workbench,
  alembic: Tile.Alembic,
  tanning_rack: Tile.TanningRack,
  loom: Tile.Loom,
  carving_bench: Tile.CarvingBench,
  enchanting_table: Tile.EnchantingTable,
  sawhorse: Tile.Sawhorse,
};

export function stationAtTile(tile: number): StationType | null {
  for (const [station, t] of Object.entries(STATION_TILES)) {
    if (t === tile) return station as StationType;
  }
  return null;
}

export function tileDef(id: number): TileDef {
  return TILE_DEFS[id as Tile] ?? TILE_DEFS[Tile.Void];
}

export function isSolidTile(id: number): boolean {
  return tileDef(id).solid;
}

/**
 * THE WADE LAW: shallow water slows every body that walks it, applied
 * inside the shared movement step so server, client prediction, and
 * NPC chases all agree by construction — never re-apply it elsewhere.
 */
export const WADE_SPEED_FACTOR = 0.55;

export function isWadeTile(id: number | undefined): boolean {
  return id === Tile.WaterShallow;
}

/**
 * Sub-tile colliders: solid tiles whose visual mass is a centered
 * column (tree trunks, the lamp post) or boulder pile rather than a
 * full block. Movement and projectiles collide with a circle of this
 * radius at the tile centre — bodies brush past the canopy's tile
 * corners and arrows bury in the trunk, not an invisible box.
 * Pathfinding still treats the whole tile as blocked.
 */
const TILE_COLLIDER_RADIUS = new Map<Tile, number>([
  // Tree radii track the DRAWN flared trunk base (client
  // render/trees.ts maxTrunkBaseRadius — a test pins the pairing):
  // tight groves stay walkable because you collide with exactly the
  // wood you see, never an invisible box around the canopy.
  [Tile.Tree, 0.26],
  [Tile.TreeOak, 0.38],
  [Tile.TreeWillow, 0.26],
  [Tile.TreeYew, 0.34],
  [Tile.TreePine, 0.28],
  [Tile.Rock, 0.4],
  [Tile.RockCopper, 0.46],
  [Tile.RockTin, 0.46],
  [Tile.RockIron, 0.46],
  [Tile.RockCoal, 0.46],
  [Tile.RockGold, 0.46],
  [Tile.RockSilver, 0.46],
  [Tile.RockMithril, 0.46],
  [Tile.RockAdamant, 0.46],
  [Tile.RockObsidian, 0.46],
  [Tile.RockStarfall, 0.46],
  [Tile.RockDepleted, 0.36],
  [Tile.LampPost, 0.2],
  // Forage flora radii track the drawn base mass (client
  // render/flora.ts floraBaseRadius — a test pins the pairing):
  // outer foliage overhangs, but you collide with the plant's core.
  [Tile.BerryBush, 0.34],
  [Tile.FibrePlant, 0.24],
  [Tile.WildSagewort, 0.3],
  [Tile.WildMoonbell, 0.24],
  // Dungeon props: centered masses you brush past, not full blocks.
  [Tile.Stalagmite, 0.34],
  [Tile.BonePile, 0.34],
  [Tile.Brazier, 0.28],
  [Tile.GlowShroom, 0.3],
]);

/** Collider radius for a centered-mass tile, or null for full-block solids. */
export function tileColliderRadius(id: number): number | null {
  return TILE_COLLIDER_RADIUS.get(id as Tile) ?? null;
}

/**
 * THE SIGHT LAW — what a watching eye sees past. Three masses:
 * 'wall' seals the sight-line outright: every lamplight blocker plus
 * the cliff face (nobody looks through the hill). 'cover' is a
 * centered trunk-mass the eye sees PAST but not cleanly THROUGH —
 * trees, ore rocks, stalagmites, the berry bush: one on the line
 * dulls the watcher, two seal it (a body deep in the grove is as
 * good as gone). Fences, furniture, and waist-high clutter are
 * 'clear' — sight is not walk-clearance, and a fence hides nobody.
 */
export type SightMass = 'clear' | 'cover' | 'wall';

const SIGHT_WALL_TILES: ReadonlySet<Tile> = new Set([...LIGHT_BLOCKING_TILES, Tile.Cliff]);

/** Trunk-masses slim enough to peek past but thick enough to matter. */
const SIGHT_COVER_MIN_RADIUS = 0.25;

export function sightMass(id: number): SightMass {
  if (SIGHT_WALL_TILES.has(id as Tile)) return 'wall';
  if (!isSolidTile(id)) return 'clear';
  const r = tileColliderRadius(id);
  return r !== null && r >= SIGHT_COVER_MIN_RADIUS ? 'cover' : 'clear';
}

/**
 * Tree regrowth staging: a felled tree leaves a stump, the stump
 * sprouts the species' sapling partway through the respawn wait, and
 * the sapling stands up into the full tree. One law source for the
 * server's respawn queue and the client's transition effects.
 */
const SAPLING_OF = new Map<Tile, Tile>([
  [Tile.Tree, Tile.Sapling],
  [Tile.TreeOak, Tile.SaplingOak],
  [Tile.TreeWillow, Tile.SaplingWillow],
  [Tile.TreeYew, Tile.SaplingYew],
  [Tile.TreePine, Tile.SaplingPine],
]);
const TREE_OF_SAPLING = new Map<Tile, Tile>(
  [...SAPLING_OF].map(([tree, sap]) => [sap, tree]),
);

/** The tree tiles that fell, stump, and regrow. */
export const TREE_TILES: ReadonlySet<Tile> = new Set(SAPLING_OF.keys());

/**
 * The fishing ladder: every fishing-spot tile shares one water dialect
 * (shoreline, reflections, waterfalls, the deck's never-board-over
 * law) — client and worldgen read this set, never a tile equality.
 */
export const FISHING_TILES: ReadonlySet<Tile> = new Set([
  Tile.FishingSpot,
  Tile.PikeHole,
  Tile.EelRun,
  Tile.SalmonRun,
  Tile.GlimmerShoal,
]);

export function isFishingTile(t: number | undefined): boolean {
  return t !== undefined && FISHING_TILES.has(t as Tile);
}

/** The sapling stage for a tree tile, or null if it isn't a tree. */
export function saplingOf(id: number): Tile | null {
  return SAPLING_OF.get(id as Tile) ?? null;
}

/** The grown tree a sapling becomes, or null if it isn't a sapling. */
export function treeOfSapling(id: number): Tile | null {
  return TREE_OF_SAPLING.get(id as Tile) ?? null;
}

/**
 * Loot chests: one law source for the five kinds and their two
 * postures. The wood chest is the everyday find; the mossgrown chest
 * is its forest-claimed elder; the ironbound strongchest is often
 * locked and wants a brass key; the gilded coffer is treasure-house
 * work; and the black boss chest holds the champion's cache behind
 * the champion.
 */
export type ChestKind = 'wood' | 'iron' | 'gilded' | 'mossy' | 'boss';

export interface ChestInfo {
  kind: ChestKind;
  open: boolean;
}

const CHEST_INFO = new Map<Tile, ChestInfo>([
  [Tile.ChestWood, { kind: 'wood', open: false }],
  [Tile.ChestWoodOpen, { kind: 'wood', open: true }],
  [Tile.ChestIron, { kind: 'iron', open: false }],
  [Tile.ChestIronOpen, { kind: 'iron', open: true }],
  [Tile.ChestGilded, { kind: 'gilded', open: false }],
  [Tile.ChestGildedOpen, { kind: 'gilded', open: true }],
  [Tile.ChestMossy, { kind: 'mossy', open: false }],
  [Tile.ChestMossyOpen, { kind: 'mossy', open: true }],
  [Tile.ChestBoss, { kind: 'boss', open: false }],
  [Tile.ChestBossOpen, { kind: 'boss', open: true }],
]);

/** Every chest tile, closed or open. */
export const CHEST_TILES: ReadonlySet<Tile> = new Set(CHEST_INFO.keys());

/** Kind + posture of a chest tile, or null for anything else. */
export function chestInfo(id: number): ChestInfo | null {
  return CHEST_INFO.get(id as Tile) ?? null;
}

/** The closed tile for a chest kind. */
export function closedChestTile(kind: ChestKind): Tile {
  for (const [tile, info] of CHEST_INFO) {
    if (info.kind === kind && !info.open) return tile;
  }
  return Tile.ChestWood;
}

/** The open tile for a chest kind. */
export function openChestTile(kind: ChestKind): Tile {
  for (const [tile, info] of CHEST_INFO) {
    if (info.kind === kind && info.open) return tile;
  }
  return Tile.ChestWoodOpen;
}

/**
 * Destructible props: the clutter you can SMASH. One swing (or a
 * spent arrow) bursts the prop into client-side debris and the tile
 * becomes the floor beneath it — the tile IS the state, exactly the
 * chest/door law, so collision, pathing, and lamplight all follow the
 * ordinary tile patch. The respawn queue quietly stands the prop back
 * up a few minutes later, never onto a body and never over something
 * newly built there.
 */
export type DestructibleKind =
  | 'barrel'
  | 'crate'
  | 'goods'
  | 'chair'
  | 'table'
  | 'bench'
  | 'bonepile'
  | 'crackedwall';

export interface DestructibleInfo {
  kind: DestructibleKind;
  /** Seconds of satisfying absence before the prop stands back up. */
  respawnSec: number;
  /**
   * DURABILITY — how many HITS the prop absorbs before bursting.
   * Counted in blows, never damage: a level-1 fist and an endgame
   * blade chew through a table in the same three strikes, so bulk
   * reads as bulk at every scale. Light clutter pops on the first
   * hit; big joined furniture holds a beat or two (the shudder tells
   * you it's working). This is the knob future barricades turn.
   */
  hits: number;
}

const DESTRUCTIBLE_INFO = new Map<Tile, DestructibleInfo>([
  [Tile.Barrel, { kind: 'barrel', respawnSec: 180, hits: 1 }],
  [Tile.Crate, { kind: 'crate', respawnSec: 180, hits: 1 }],
  [Tile.CrateGoods, { kind: 'goods', respawnSec: 240, hits: 2 }],
  [Tile.Chair, { kind: 'chair', respawnSec: 150, hits: 1 }],
  [Tile.Table, { kind: 'table', respawnSec: 240, hits: 3 }],
  [Tile.Bench, { kind: 'bench', respawnSec: 180, hits: 2 }],
  [Tile.BonePile, { kind: 'bonepile', respawnSec: 600, hits: 1 }],
  // The secret-door law: a cracked wall is a wall until three blows
  // say otherwise. The long respawn means a found passage stays found
  // for the whole run (dungeon instances die before it ever restands).
  [Tile.CrackedCaveWall, { kind: 'crackedwall', respawnSec: 3600, hits: 3 }],
]);

/** Every smashable prop tile. */
export const DESTRUCTIBLE_TILES: ReadonlySet<Tile> = new Set(DESTRUCTIBLE_INFO.keys());

/** Break-up kind + respawn law of a destructible prop, or null. */
export function destructibleInfo(id: number): DestructibleInfo | null {
  return DESTRUCTIBLE_INFO.get(id as Tile) ?? null;
}

/**
 * The floor a prop stands on — the SAME law the client uses to bake
 * the underlay beneath prop tiles, hoisted here so a smashed barrel
 * reveals exactly the floor the player was already seeing. Ring 1
 * first, then ring 2 (diagonals + two-out: a table hemmed in by its
 * own chairs still finds the room's boards), grass as the open-air
 * fallback.
 */
export function nearestFloorTile(
  ground: (tx: number, ty: number) => number | undefined,
  tx: number,
  ty: number,
): Tile {
  const isFloor = (t: number | undefined) =>
    t === Tile.WoodFloor ||
    t === Tile.StoneFloor ||
    t === Tile.PorchDeck ||
    t === Tile.CaveFloor ||
    t === Tile.DungeonFloor ||
    t === Tile.CaveRubble ||
    t === Tile.Dirt;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (isFloor(t)) return t as Tile;
  }
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (isFloor(t)) return t as Tile;
  }
  return Tile.Grass;
}

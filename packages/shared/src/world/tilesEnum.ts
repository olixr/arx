/**
 * THE WORLD'S VOCABULARY — the Tile and Detail enums whole (foundations
 * polish; moved verbatim from tiles.ts, which re-exports them). Rename
 * in place, never renumber: the ids ride the wire and the DB.
 */
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
  /**
   * THE ANIMALS OF THE YARD (Phase 3): the feed trough — the yard's
   * one anchor. Livestock released here graze its ring, feed loaded
   * here grades their produce, and the trough refuses demolition
   * while a herd still answers to it. Solid.
   */
  FeedTrough = 280,
  // THE WORKING YARD (farming v2 Phase 4): the processing stations.
  // Every one holds ONE wall-clock job (station_jobs) that runs while
  // you wander; the apiary keeps its own bee-clock. All solid.
  Windmill = 281,
  ButterChurn = 282,
  FruitPress = 283,
  BrewKeg = 284,
  Smoker = 285,
  DryingRack = 286,
  Apiary = 287,
  // THE DRESSED FARM (Phase 6): the yard's standing character.
  Scarecrow = 288,
  HayBale = 289,
  Silo = 290,
  Dovecote = 291,
  // THE CAMP BARES ITS TEETH (war-camp decor, docs/war-camp-decor-plan.md):
  // the enemy encampment's own material culture. 292-296 = THE SPIKED
  // WALL, a third fortification family (sharpened logs lashed together —
  // never a WALL_RUN member, never bounds an interior, breaks under four
  // blows like the barricade it is). 297-316 = the camp props.
  /** Sharpened logs lashed shoulder to shoulder — the war camp's wall. */
  Palisade = 292,
  /** "/" palisade turn, corner-to-corner (the fence diagonal law). */
  PalisadeDiagNE = 293,
  /** "\" palisade turn. */
  PalisadeDiagNW = 294,
  /** The camp's lashed-log gate, standing open. Rides the door law. */
  PalisadeGate = 295,
  /** The gate barred shut — full-height mass, blocks lamplight. */
  PalisadeGateShut = 296,
  /** A sharpened stake driven at an angle, rag-lashed head burning. */
  StandingTorch = 297,
  /**
   * The great fire at the camp's heart: stone ring, log tepee, a roaring
   * three-tongue flame. The one camp piece no blade puts out — a fire is
   * doused, never smashed — so a cleared camp keeps its night anchor.
   */
  Bonfire = 298,
  /** An iron fire-cage slung in a tripod of scavenged spears. */
  WarBrazier = 299,
  /** A round goblin tent: stitched pelts over bent poles. */
  TentHide = 300,
  /** The chieftain's ridge tent, trophy jaw over the door. */
  TentWar = 301,
  /** Heaped skulls and long bones — the camp keeps its count. */
  SkullPile = 302,
  /** The war totem: skulls stacked up a carved stake, fetishes swaying. */
  SkullTotem = 303,
  /** A bent spear-shaft standard flying tattered painted hide. */
  WarBanner = 304,
  /** A crude cage of lashed branches, door rope-bound. */
  PrisonCage = 305,
  /** Crossed sharpened stakes in an X-frame — the road-blocker. */
  SpikeBarrier = 306,
  /** Forked stakes and a cross-spit, a haunch turning over coals. */
  MeatSpit = 307,
  /** A crossbar of hooks hung with cuts and drying strips. */
  MeatRack = 308,
  /** A blackened pot slung from a tripod, gruel at a slow boil. */
  CookPot = 309,
  /** A crooked shelf of bottles, gourds, and stoppered horns. */
  PotionRack = 310,
  /** The warg bed: a trampled ring of fur and straw and gnawed bones. */
  BeastNest = 311,
  /** Rope-tied loot sacks heaped where the raiders dropped them. */
  PlunderSacks = 312,
  /** Spears leaned in a pyramid stack, a crude shield propped against. */
  SpearRack = 313,
  /** A straw-stuffed dummy on a post, painted target, stuck arrows. */
  TargetDummy = 314,
  /** The great hide drum on its lashed frame, mallets crossed. */
  WarDrum = 315,
  /** A stretched hide lashed in a square curing frame. */
  HideFrame = 316,
  // THE FAIR HOUSE FURNISHED — the elven decor kit (317-336). The
  // elves are the world's artisans: everything here is swept, sprung,
  // and grown rather than nailed — no rope, no sag, no kink. Where
  // the war camp is amber-lit and crooked, the fair house is moonlit
  // and true. Silverbark timber, mithril fittings, moonglass light.
  /**
   * THE IMBUED LANE: elven magic is worked INTO stone — floating
   * crystals, orbiting rune-shards, violet-and-green aurora. The
   * beacon is its founding piece: three tilted rune-stones holding a
   * levitating master crystal in a slow orbit of glyph shards.
   */
  ArcaneBeacon = 317,
  /** A tall standard flying moonpale silk, crescent-and-leaf device. */
  ElvenBanner = 318,
  /** A crescent garden bench — swept legs, vine-scroll armrests. */
  ElvenBench = 319,
  /** A low oval feast table, leaf-vein mithril inlay across the top. */
  ElvenTable = 320,
  /** A high-backed chair whose back curls like an unfurling fern. */
  ElvenChair = 321,
  /** A canopied daybed: silk drape falling from one bowed cane. */
  ElvenDaybed = 322,
  /** A tall arched case of tomes and scroll pigeonholes. */
  ElvenBookcase = 323,
  /** A swept reading stand, tome open, one page forever lifting. */
  ElvenLectern = 324,
  /** A standing pedal harp strung in mithril. */
  ElvenHarp = 325,
  /** A weaving frame, moonpale cloth half-woven, warp weights hung. */
  ElvenLoom = 326,
  /** A three-tier singing fountain — thin falls, slow rings. */
  ElvenFountain = 327,
  /** A marble warden holding a leaf-blade point-down. */
  ElvenStatue = 328,
  /** A low stone basin of lit water, mist rising off the surface. */
  Moonwell = 329,
  /**
   * The hall's silver-white flame in a mithril basin. The one elven
   * piece no blade breaks — a flame this old is not put out by a
   * stick (the bonfire law) — so a sacked hall keeps its light.
   */
  Everflame = 330,
  /** The elven smithy: a swept-horn mithril anvil on a carved root. */
  MithrilAnvil = 331,
  /** A display rack: curved blades and a longbow on silver pegs. */
  ElvenArmsRack = 332,
  /** A carved urn planter, silverleaf blooms, one trailing vine. */
  ElvenPlanter = 333,
  /** A standing oval mirror in a vine-scroll frame. */
  ElvenMirror = 334,
  /** A runed waystone veined with mithril, script band faintly lit. */
  ElvenWaystone = 335,
  /** A floating rune ring holding five crystal voices on light. */
  ElvenChimes = 336,
  // 337-341 = the imbued works: stone that floats, glyphs that
  // orbit, streets lit violet and green.
  /** A split monolith — its carved crown floats free above the base. */
  Runestone = 337,
  /** Wild mana crystals erupting from cracked earth. */
  CrystalCluster = 338,
  /** Twin runed pillars under a floating keystone and a glyph arc. */
  WardArch = 339,
  /** A grimoire floating open above its pedestal, script orbiting. */
  ArcaneTome = 340,
  /** The elven street light: a carved pillar with a floating tip-stone. */
  RunePillar = 341,
  // THE CLIPPED GREEN — the garden's living architecture. A hedge is
  // a wall a gardener grew: it runs, turns, and gates like the fence
  // family, but its mass is clipped foliage — a FOURTH run-merging
  // family beside buildings, the garrison, and the palisade (the
  // separate-masonry law: green never dies into timber or stone).
  /** A clipped box hedge; adjacent hedge tiles fold into one body. */
  Hedge = 342,
  /** The 45° turn, NE-SW line ("/"). */
  HedgeDiagNE = 343,
  /** The 45° turn, NW-SE line ("\"). */
  HedgeDiagNW = 344,
  /** A living archway over the path — the wicket stands swung aside. */
  HedgeGate = 345,
  /** The same archway with its timber wicket latched. */
  HedgeGateShut = 346,
  // THE LONG DARK FURNISHED — dungeon dressing with a memory. Every
  // piece tells who was down here and what became of them: stores
  // gone green with the damp, a cart abandoned mid-shift, a prisoner
  // the dark forgot, and the carved stone of whatever kingdom the
  // mountain swallowed.
  /** A waterlogged barrel gone green — staves sprung, hoops bleeding rust. */
  MossBarrel = 349,
  /** An ore cart abandoned on a stub of rail, still half loaded. */
  MineCart = 350,
  /** A prisoner the dark forgot: bones slumped in wall shackles. */
  ChainedSkeleton = 351,
  /** A wrought-iron cage bracket on the wall; its flame keeps the dark honest. */
  WallSconce = 352,
  /** Heavy rusted chains bolted high on the stone, cuffs hanging empty. */
  WallChains = 353,
  /** A carved stone coffin — the effigy lid is the read; the crypt's anchor. */
  Sarcophagus = 354,
  /** A snapped column: the base still stands, the fluted drums lie where they fell. */
  BrokenPillar = 355,
  /** A carved column two men tall. It holds the mountain up; it does not break. */
  GrandPillar = 356,
  /** Grave urns in a huddle: fired clay, band-painted, wax-sealed. */
  BurialUrns = 357,
  /** A weathered king of the swallowed kingdom — moss has taken the crown. */
  AncientStatue = 358,
  // THE LONG DARK PEOPLED — the second furnishing pass. Where the
  // first kit was the architecture of abandonment, this one is the
  // people who passed through the dark: the garrison's justice, the
  // miners' timber, the delvers who never came back, and whatever
  // was down here long before any of them.
  /** A gallows arm and its iron cage, swinging slow on the chain. */
  GibbetCage = 359,
  /** A timber pillory on a worn platform — the holes stand empty now. */
  Stocks = 360,
  /** A miners' support frame wedged under the roof. It holds the mountain; it does not break. */
  TimberBrace = 361,
  /** Enormous ribs half-buried in the rock — older than the kingdom, bigger than a king. */
  WallFossil = 362,
  /** Dense webs draped down the stone; something patient keeps them mended. */
  WallWeb = 363,
  /** A still mineral pool ringed in pale deposit; the mountain drips into it, one bead at a time. */
  DripPool = 364,
  /** A delver's camp nobody came back to: cold ash, a bedroll, a dropped pack. */
  ColdCamp = 365,
  /** A chest already broken open — whoever got here first left only splinters and one coin. */
  LootedChest = 366,
  /** Grave-candles melted over a ledger stone. A few still burn: someone tends this place. */
  CandleShrine = 367,
  /** An iron grate over black depth; the air below breathes up through the bars. */
  IronGrate = 368,
  // THE BANKS GET THEIR GOODS — the skral shore-camp kit
  // (docs/skral-decor-plan.md). The kit's voice: FOUND, NEVER FELLED
  // — everything the brine-folk own came off the bank or out of the
  // water. Driftwood silvered by salt, kelp-cord lashings, bone and
  // shell and net; no saw-cut ends, no rope, no iron; and every
  // piece is wet where it meets the ground.
  /** The catch drying head-down on lashed driftwood rails. */
  FishRack = 369,
  /** A fish-skull idol on a barnacled post, flying a fin banner. */
  TideTotem = 370,
  /** A knotted net hung to dry — cork floats, one mended tear. */
  NetFrame = 371,
  /** A dugout canoe hauled up the bank; some lie keel-up, patched. */
  Dugout = 372,
  /** Bone-tipped harpoons leaning points-up on a lashed rib stand. */
  HarpoonRack = 373,
  /** The camp's shell-heap: cracked fans and spirals, wet on top. */
  ShellMidden = 374,
  /** A woven funnel creel on its side, dark mouth to the camera. */
  FishTrap = 375,
  /** A glistening clutch of roe in a kelp-ringed hollow. */
  RoeNest = 376,
  /** A caged deep-jelly on a bowed pole — the shoal's night light. */
  LurePole = 377,
  /** A wave-worn offering slab the coral is taking back. It belongs to the tide; it does not break. */
  TideAltar = 378,
  /** Creels brimming with the day's silver — one tipped, spilling. */
  CatchBasket = 379,
  /** A sea-beast's ribcage arching from the ground; the camp moved in under it. */
  WhaleRibs = 380,
  // THE CRAFTSMEN OF THE BANKS (docs/skral-decor-plan.md, second
  // shelf): the working-village layer — the pieces that say people
  // LIVE here and work the water for a living, not just camp on it.
  // Same voice, same laws: found, never felled; wet at the ground.
  /** A woven reed lean-to — the shoal's dwelling, mouth to the south. */
  ReedShelter = 381,
  /** A lashed driftwood tripod smoking the catch over an ember bed. */
  SmokeTripod = 382,
  /** A low mending bench, net spread mid-repair, bone needle parked. */
  MendingBench = 383,
  /** Woven tidal-weir panels with a funnel gap — the camp's namesake. */
  WeirPanels = 384,
  /** Kelp fronds drying on a line between two leaning poles. */
  KelpLine = 385,
  /** A shallow evaporation basin rimmed in white salt crust. */
  SaltPan = 386,
  /** The shell-carver's bench: drilled fans, strings in progress. */
  ShellBench = 387,
  /** Withy and reed bundles leaned in a stand — the wicker-craft store. */
  WithyStore = 388,
  /** A withy-ringed keep-pool holding the live catch till market. */
  KeepPool = 389,
  /** Shell chimes on a driftwood arch, ticking in the sea wind. */
  TideChimes = 390,
  // THE TOWN KEEPS ITS DAY — the town-life kit (391-404,
  // docs/town-decor-plan.md). The deliberate inversion of the
  // dungeon shelf: down there everything was LEFT; up here
  // everything is KEPT. Work mid-shift, goods in motion, civic
  // pride polished — the fountain runs because someone dredges it,
  // the notices are fresh because someone pins them.
  /** The plaza's heart: a two-tier limestone fountain, wish-coins below. */
  TownFountain = 391,
  /** The founder in bronze gone green — the town still lays a wreath. */
  FounderStatue = 392,
  /** The town's voice: pinned bills under a shingle rain cap. */
  NoticeBoard = 393,
  /** The bronze bell in its timber frame; it calls the hours and the alarms. */
  TownBell = 394,
  /** A two-wheel barrow parked on its legs, still loaded. */
  HandCart = 395,
  /** Plump tied sacks of grain — kept stores, the scoop parked in the open one. */
  GrainSacks = 396,
  /** Two casks chocked on their sides, a third standing on top. */
  BarrelStack = 397,
  /** Crates stacked two high, the top lid ajar over straw. */
  CrateStack = 398,
  /** A chewed hitching rail, iron rings, one tied lead. */
  HitchingPost = 400,
  /** A plain hex-packed pyramid of seasoned cordwood — the everywhere pile. */
  Woodpile = 401,
  /** A half-barrel planter spilling blooms over the street. */
  StreetPlanter = 402,
  /** A carved civic bench, worn where people actually sit. */
  StoneBench = 403,
  // 404 RETIRED (ProduceStand — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  // THE TRADES KEEP SHOP — the working-trades kit (405-416,
  // docs/trade-decor-plan.md). The town kit dressed the street;
  // this shelf dresses the SHOPS behind it. Same voice, TENDED,
  // NEVER LEFT — every piece is mid-shift: the blade still cooling
  // in the quench, the loaves still warm on the peel, the basting
  // fresh on the dress form. A trade you can read at a
  // glance is a town you believe in.
  /** The smith's slack tub: iron-banded, a blade left cooling, steam rising. */
  QuenchTrough = 405,
  /** A treadle grinding wheel, its groove worn true, a blade resting on the rest. */
  Grindstone = 406,
  // 407 RETIRED (SmithBellows — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  /** Bar stock leaning and ingots stacked by metal — the smith's larder. */
  IngotRack = 408,
  /** Planks racked on edge between dowel pegs, sawdust drifted below. */
  LumberRack = 409,
  /** Two brimming dye vats, a stir paddle resting, drips down the staves. */
  DyeVats = 410,
  /** The tailor's dress form wearing a pinned, thread-basted garment. */
  TailorsDummy = 411,
  /** Bolts of dyed cloth rolled and racked, ends spilling color. */
  ClothBolts = 412,
  // 413 RETIRED (BreadOven — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  /** The butcher's scarred round block, cleaver standing, links on the hooks. */
  ButcherBlock = 414,
  /** Bundled herbs hung heads-down to dry over the herbalist's mortar. */
  HerbRack = 415,
  /** A shopkeeper's tall stocked shelving — jars, crockery, folded goods. */
  ShopShelf = 416,
  // THE SECOND SHIFT — the working-trades kit, second wave (see
  // docs/trade-decor-plan.md §THE SECOND SHIFT). The first wave
  // dressed the forge, the loom, and the oven; this one brings the
  // street its water — drawn, sprung, and caught, never PLUMBED:
  // the well rope, the hillside spring, and the cooper's cask are
  // this world's whole waterworks — and the town its missing tradesfolk: potter,
  // scribe, chandler, fletcher, cobbler, fishmonger — plus the
  // merchant's weighing and display furniture. Same voice: TENDED,
  // NEVER LEFT — every piece mid-shift.
  /** A spring-fed fount of old fieldstone, its spout-stone still pouring. */
  WallFountain = 417,
  // 418 RETIRED (WaterCask — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  /** A long staved street trough of still water beside the hitching rail. */
  WaterTrough = 419,
  // 420 RETIRED (PottersWheel — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  // 421 RETIRED (PotteryKiln — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  /** A slant-top scribe's desk — ledger open, ink still wet, scrolls pigeonholed. */
  ScribesDesk = 422,
  /** Dipped candles hung in pairs to cure over the chandler's wax tray. */
  CandleRack = 423,
  /** The fletcher's bench: arrows bundled, feathers boxed, staves on their pegs. */
  FletchersBench = 424,
  // 425 RETIRED (CobblersBench — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  /** The fishmonger's tilted slab, the morning catch laid out in silver rows. */
  FishmongerSlab = 426,
  /** The merchant's runner-clothed display table, wares dealt across the top. */
  DisplayTable = 428,
  // THE COMMONS — the general shelf every town owns (see
  // docs/commons-decor-plan.md). Two town waves and two trade
  // waves dressed the specialists; this shelf is the ORDINARY
  // life between them — flame and faith, stone and street,
  // tavern and table, vessels and chores, yard and water edge.
  // Chosen for REPEATED REUSE: each piece seats in four scenes
  // or it didn't make the shelf. Same voice, TENDED, NEVER LEFT:
  // the candle is burning, the game is mid-move, the skiff is
  // hauled up but never abandoned. PERIOD TRUTH holds the door.
  /** A smith's wrought floor candelabrum, dealt arms lit and dripping. */
  CandleStand = 429,
  /** A porch-scale crook post, a hooded horn lantern swaying on the hook. */
  StreetLantern = 430,
  /** A fieldstone wayside niche — the old hound carved worn, offerings on the sill. */
  WayShrine = 431,
  /** A seated stone hound on its plinth — mirrored by parity, so gates get PAIRS. */
  GuardianStatue = 433,
  /** A belly-lying cask on its trestle, wooden tap dripping, horn mugs waiting. */
  TapCask = 435,
  // 436 RETIRED (GameTable — the tafl barrel left town; old DBs may hold it, never reuse).
  /** The universal three-legged stool, tenons wedged, seat worn to a shine. */
  WoodStool = 437,
  // 438 RETIRED (SettleBench — the settle left the hearth; old DBs may hold it, never reuse).
  /** A lidded wicker hamper stacked two high, contents peeking, lid ajar. */
  BasketStack = 439,
  /** Three glazed jars ranked tall to small — corked, sealed, and open-mouthed. */
  GlazedJars = 440,
  /** A birch besom on its peg-post, pail and rag, the sweepings still piled. */
  BroomAndPail = 441,
  // 442 RETIRED (CloakStand — the cloak post left town; old DBs may hold it, never reuse).
  /** A joiner's ladder leaned north to the eaves, a sickle hung on a rung. */
  LeanLadder = 443,
  /** The yard's one-wheeled mule, box open to the sky, dealt load aboard. */
  Wheelbarrow = 444,
  /** A wayfarer's kit by the door: bedroll, pack, staff, and waterskin. */
  WayfarersRest = 445,
  /** A tarred bollard leaning seaward, the lead coiled, weed at the foot. */
  MooringPost = 447,
  /** A clinker skiff hauled ashore on its keel, oars shipped, painter coiled. */
  BeachedSkiff = 448,
  // THE WARREN AND THE LEGION (449-460) — the enemy camps' second
  // dressing wave. The first shelf (297-316) armed the camp: fire,
  // wall, larder, loot. This one gives it a LIFE — where the goblin
  // sleeps, drinks, gambles, brags, and keeps its beast, and where
  // the hobgoblin officer plans and sounds the alarm. Same kit voice
  // turned feral: TENDED, NEVER LEFT still holds (the grog drips,
  // the dice sit mid-throw, the map is pinned mid-argument) — but
  // everything here is stolen, scavenged, or crudely lashed. The
  // shelf splits goblin sprawl (449-455), legion order (456-457),
  // and the shared raider pieces every warband reuses (458-460).
  /** The camp's refuse heap: cracked gnawed bones, a burst rib cage, flies. */
  BoneMidden = 449,
  /** A driven stake nailed with stolen kit — shield, helm, torn tabard. */
  TrophyStake = 450,
  /** A staved tub of murky goblin grog, ladle out, one stave leaking. */
  GrogTub = 451,
  /** The gambling spot: a scratched board, thrown knucklebones, a claimed pot. */
  KnucklePit = 452,
  /** The goblin bed: a trampled ring of stolen rags, sack for a pillow. */
  RagNest = 453,
  /** An iron beast-stake, chain coiled to an empty collar — the worg is out. */
  BeastStake = 454,
  /** Two lashed wicker cages stacked crooked, something squirming inside. */
  CritterCage = 455,
  /** The legion's signal: a scrap-bronze gong in a lashed frame, striker by. */
  AlarmGong = 456,
  /** The officer's trestle: a hide map pinned by a dagger, cup markers set. */
  WarTable = 457,
  /** A stolen farm cart, one wheel smashed, loot heaped under a lashed net. */
  PlunderCart = 458,
  /** The warboss in straw and sacking: pot-helm head, painted grin, real spear. */
  BossEffigy = 459,
  /** A hollowed half-log slopped for the war-beasts, rim scalloped with bites. */
  GnawTrough = 460,
  // THE HERBALIST'S SHELF (docs/herbalist-decor-plan.md) — the rustic
  // give-back after the fair left town. One working piece stands on
  // the ground; its two siblings hang as wall details (SillHerbs,
  // HerbBundles). Everything on this shelf grows or dries the game's
  // OWN botany — sagewort and moonbell, the herbs the player picks
  // wild, farms in rows, and brews — so the herbalist's shop visibly
  // lives on the same plants the player's satchel carries.
  /** The physic tub: a sawn half-cask planted in worked herb rows. */
  HerbPlanter = 461,
  // THE CHORE STANDS ALONE — split out of the Woodpile when the pile
  // went generalized: the pile is now the STORE (any yard, any door),
  // and this is the WORK — block, standing axe, the fresh split where
  // 462 RETIRED (ChoppingBlock — the museum audit sent it back to the shop; old DBs may hold it, never reuse).
  // THE LOG YARD — the pile that came before the cord: raw felled
  // timber at MILL scale, for the sawyers, the wainwrights, and every
  // working wood yard the firewood pile is too small to speak for.
  // The Woodpile is the STORE and these are the SUPPLY — trunks the size of the trees the player
  // fells, waiting on the saw. Two orientations on purpose: the deck
  // lies long across the yard, the end-on pile aims its cut faces at
  // the road.
  /** One great felled trunk lying full length, branch-scarred, cut ends bright. */
  FelledLog = 463,
  /** The sawyer's deck: two great trunks with a third nested on top, lying long. */
  LogPile = 464,
  /** Great trunks stacked cut-face to the road, bodies running away north. */
  LogPileEndOn = 465,
  // THE PACKED ORDER — commerce mid-motion, one prop for every
  // counter in the world. The scale-on-a-post it replaces (427,
  // RETIRED) spoke only where weighing happened; a stack of wrapped,
  // twine-tied orders speaks beside any counter, pantry shelf, dock
  // plank, or wagon bed — goods SOLD and waiting for their owner.
  /** Wrapped parcels twine-tied and stacked, a paper tag on the knot. */
  TiedParcels = 466,
  // THE KEPT FLAME — the candle family (docs precedent: the commons
  // CandleStand, 429). Every piece stands in TWO postures, lit and
  // snuffed, and the tile IS the state (the chest law): a hand at
  // the wick toggles it, the patch syncs it, and a room stays exactly
  // as the last hand left it. One flame paints every wick in the
  // game, so a hall dressed in dozens reads as ONE order keeping ONE
  // vigil — a monastery of candles, never a bag of separate props.
  /** A grown congregation of floor candles on their own spilt wax, burning. */
  CandleCluster = 467,
  /** The same congregation, every wick snuffed — wax waiting for a hand. */
  CandleClusterOut = 468,
  /** Generations of candles melted into one dripping mound; survivors burn. */
  MeltedCandles = 469,
  /** The wax mound gone dark, drowned wicks and frozen runnels. */
  MeltedCandlesOut = 470,
  /** A small side table bearing a chamberstick and a stub, both burning. */
  CandleTable = 471,
  /** The candle table gone dark, wicks curled, wax cold. */
  CandleTableOut = 472,
  /** The forged floor candelabrum (429's own body), every flame snuffed. */
  CandleStandOut = 473,
  // THE BOLD WICK — the family's second wave, cut after the first
  // court was judged NEEDLE-THIN at map scale (user verdict): wax
  // reads at this camera only when it is THICK — pillar-class
  // columns, never tapers. These two are the boldest forms: the lone
  // exclamation mark and the decorator's stepped trio.
  /** One bold pillar of wax alone on its own spilt base, burning. */
  PillarCandle = 474,
  /** The lone pillar snuffed, its heavy collar cold. */
  PillarCandleOut = 475,
  /** Three stepped pillar candles sharing one melted base, burning. */
  TripleCandles = 476,
  /** The trio snuffed — three cold columns in one pool. */
  TripleCandlesOut = 477,
  // THE KNIGHT'S KEEPING — the armory set: the steel a garrison
  // lives beside. The stands are floor props (this shelf); the
  // mounted arms and the great cloth hang on walls (Detail bands —
  // WallArms / GreatBanner / DrapeFall).
  /** An empty oak armor stand: cross-foot, mast, shoulder yoke, helm peg. */
  ArmorStand = 478,
  /** The same stand dressed: a full harness racked and waiting (hash-dealt style). */
  ArmorStandFull = 479,
  /**
   * A standing great-banner frame: forged foot, tall staff, flying
   * drop. THE DYE LAW: +dye (480..495 reserved) — the author picks
   * the standard's colors, and THE COLOR IS THE HOUSE: the woven
   * charge follows the dye, so a matched pair can never argue.
   */
  BannerStand = 480,
  // THE IRON REST — the graveyard kit (IDs resume at 496; 481..495
  // belong to the banner stand's dye band). The wall first: wrought
  // iron on a stone curb, the FIFTH run-merging family beside fence,
  // garrison, palisade, and hedge (the separate-masonry law — a
  // smith's railing never dies into a carpenter's fence). Then the
  // stones the wall was raised to keep.
  /** A wrought-iron railing set in a stone curb: spear-topped bars, scrollwork, pier-anchored runs. */
  IronFence = 496,
  /** The railing's 45° turn spanning the NE-SW diagonal ("/"). */
  IronFenceDiagNE = 497,
  /** The railing's 45° turn spanning the NW-SE diagonal ("\"). */
  IronFenceDiagNW = 498,
  /**
   * The graveyard gate, standing open — twin stone piers under a
   * wrought overthrow arch; the barred leaves fold back against the
   * piers. Rides the whole door machinery (interact, locks,
   * occupancy, auto-close) like every gate before it.
   */
  IronGate = 499,
  /** The graveyard gate shut: the leaves meet at an old iron latch. */
  IronGateShut = 500,
  /** A headstone. Three cuts of one trade — round-top, shouldered, and lancet — leaning as the ground let them. */
  Gravestone = 501,
  /** A monument: stepped plinth, tapered shaft, pyramid cap — somebody paid for this one. */
  GravestoneTall = 502,
  /** A fresh-turned grave mound, field-stone marker at its head. The soil is still dark. */
  GraveMound = 503,
  /** A weathered stone mourner, hooded and bowed over folded hands. Rain has worn tracks down the cowl. */
  MournerStatue = 504,
  // THE SCARRED LAND — the contested-lands prop kit (ids 505..545,
  // contiguous, family order, plus the band 8 clamp at 548 past the
  // two reserved ground ids; docs/contested-lands-plan.md §6.1).
  // The fifth shelf voice, LEFT BURNING: every piece is a thing a
  // smith, mason, carpenter, or a fire made and then left. TILE IS
  // THE STATE — every posture is its own id; nothing rides metadata.
  // Never renumber; a retired id stays retired.
  // THE SCARRED LAND — A. the cold hearth (what a burning leaves standing)
  /** Tumbled masonry, waist-high and lower — the SIXTH run-merging family (own kind only; never a roof). */
  RuinWallStone = 505,
  /** Charred studs and a fallen plate — the burnt frame's run-merging kin. */
  RuinWallWood = 506,
  /** A fallen timber lying diagonal, ember checks painted cold. */
  CharredBeam = 507,
  /** Rafters through a burnt thatch dome — the roof that came down. */
  CollapsedRoof = 508,
  /** A walkable heap of cold ash. */
  AshHeap = 509,
  /** A dead fire that still glows: the night tell of a fresh burning. */
  EmberBed = 510,
  /** The chimney a burning could not take — the tallest piece; stands north of a shell. */
  ChimneyStack = 511,
  // THE SCARRED LAND — B. the field after (what a fight leaves)
  /** An overturned cart, one wheel gone. */
  BrokenCart = 512,
  /** Battle litter — shield half, snapped spear, helm, arrows; walkable. */
  FieldLitter = 513,
  /** A post stuck with arrows, fletch colour hashed. */
  ArrowPost = 514,
  /** A banner down in the dirt, its field dye hashed from the four-colour set. */
  FallenBanner = 515,
  /** Knee-high field stones with a flat marker: the country's plainest grave. */
  FieldCairn = 516,
  /** The cairn tumbled — the two-state tell beside FieldCairn; walkable. */
  CairnFallen = 517,
  /** A ribcage on its side: the wreck that stands in for the dead horse. */
  BeastBones = 518,
  // THE SCARRED LAND — C. the stripped land (what the axe and the fire left)
  /** A stump burnt black; worldgen SCORCH's honest stump. Walkable. */
  CharredStump = 519,
  /** A standing dead tree — bare limbs through the engine tree switch, foliage 0. */
  DeadTree = 520,
  /** A spoil heap, quarry-brown or starfall-black by hash. */
  SpoilHeap = 521,
  // THE SCARRED LAND — D. the gloom (what was here first)
  /** A stone that glows cold — the Riftgate apron's palette above ground. */
  GloomStone = 522,
  /** A creeping root that comes back when cut. */
  CreepRoot = 523,
  /** Sick water with a scum ring; walkable and unwelcome. */
  FoulPool = 524,
  /** A crop row gone black — harvest refused. Walkable. */
  CropBlighted = 525,
  // THE SCARRED LAND — E. the marks (five peoples finally get a glyph)
  /** The fordgate's charter post — the towns' claim, brass-plated. */
  CharterPost = 526,
  /** A waykeeper's lamp cairn: warm, roadside, never occluding. */
  LampCairn = 527,
  /** The Legion's standard: one crimson square with one bar. */
  LegionStandard = 528,
  /** The wolfkin's bone tree — hung bone that answers the breeze. */
  BoneTree = 529,
  /** The kobolds' tally stone: it counts small. */
  TallyStone = 530,
  /** The evencourt's ward thread strung at knee height; walkable, cuttable. */
  WardThread = 531,
  /** The reavers' red-rag stake. */
  RedRagStake = 532,
  /** The Returners' pit lamp, burning: their word against the LampPost. */
  PitLamp = 533,
  /** The pit lamp gone dark — the shame in a tile. */
  PitLampDark = 534,
  // THE SCARRED LAND — F. the displaced (what people carry when they run)
  /** A freestanding lean-to, open face south. */
  LeanTo = 535,
  /** A bedroll on bare ground; walkable. */
  Bedroll = 536,
  /** A household on two wheels. */
  BelongingsCart = 537,
  /** A field cot. */
  FieldCot = 538,
  // THE SCARRED LAND — G. the states (living props in their broken posture)
  /** A fence with its rails down — Fence-kin in the run mask; passable by state. */
  FenceBroken = 539,
  /** A signpost scorched past reading. */
  SignpostBurnt = 540,
  /** A well somebody fouled — draw-water refused; the rag colour keeps its secret. */
  WellFouled = 541,
  /** A hedge gone to brown sticks — joins the hedge coalesce class. */
  HedgeDead = 542,
  /** The town lamp unlit, on purpose. */
  LampPostDark = 543,
  /** A board gate on two posts across a dike. */
  SluiceGate = 544,
  /** The sluice gate strung with kelp-cord — the paid variant. */
  SluiceGateStrung = 545,
  // THE SCARRED LAND — band 8's mint (rulings G3). 546 and 547 stay
  // RESERVED for AshGround and GrassBlighted, the two true ground
  // tiles of THE LIVING GROUND (plan §12.5), so the clamp lands past
  // them at 548; the Dolmen's four (plan §11.3) follow at 549+. It is
  // family A (the cold hearth) by voice: a fire somebody made and
  // then banked under turf. isScarredTile names it beside the band.
  /** A charcoal clamp: a turfed mound of cordwood over a slow fire, vent holes cut in the turf, the coals showing at the vents from dusk. The north's charcoal is made here. */
  SmolderHeap = 548,
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
  // THE HERBALIST'S SHELF — the wall-hung pair. Same banded grammar,
  // new ground: the sill pots are the FIRST hanging that lives on
  // glazed walls (their own host gate — the classic hangings law is
  // never loosened for them).
  /** Three glazed herb pots on the window's sill course: +mix (96..111 reserved). */
  SillHerbs = 96,
  /** A pegged batten of heads-down drying bundles: +mix (112..127 reserved). */
  HerbBundles = 112,
  // THE KNIGHT'S KEEPING — the garrison's wall. Steel is mounted and
  // STILL (only cloth answers the breeze); the great cloth is the
  // castle register the swallowtail WallBanner is the street's.
  /** Mounted arms on wall pegs: +form 0..3 (128..143 reserved). */
  WallArms = 128,
  /** Grand dovetail-hem hall banner off a lance rod: +dye (144..159 reserved). */
  GreatBanner = 144,
  /** Floor-length gathered drape falling the full face: +dye (160..175 reserved). */
  DrapeFall = 160,
  // THE SCARRED LAND — the six floor Details (176..181), baked beside
  // Sawdust/Straw in the ground pass. Ground marks that must last are
  // baked Details, never the decal pool (plan §1 law 8).
  /** Cold ash pan with clinker squares. */
  Ash = 176,
  /** Old bone slivers and a jaw — den edges, squats, old fields. */
  Bones = 177,
  /** Two dark drag bands — felled rows, cart tracks, spoil paths. */
  DragFurrow = 178,
  /** Dark veins in the ground around GloomStone and CreepRoot. */
  BlightVeins = 179,
  /** A near-black stain with a lit dry rim — blood-dark by value, never red. */
  DarkSpill = 180,
  /** Dried plate seams — the drained pond. */
  Mudcrack = 181,
  // THE WOOD LEARNS TO BREATHE — the forest floor (worldgen forest.ts).
  /** Fallen leaves under a crown: a few russet and ochre chips, hash-dealt. */
  LeafLitter = 182,
  /** Bracken fronds in a canopy gap: two or three low pinnate fans. */
  Bracken = 183,
}

/** THE DYE LAW's count — ten cloths, index-married everywhere. */
export const DYE_COUNT = 10;

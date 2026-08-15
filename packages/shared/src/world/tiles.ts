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
  /** A clipped sphere on a woody stem — the gardener's showpiece. */
  TopiaryBall = 347,
  /** A clipped spire tapering to a leaf-tuft finial. */
  TopiarySpire = 348,
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
  /** Dyed pennants flying from a swagged line between two poles. */
  PennantLine = 399,
  /** A chewed hitching rail, iron rings, one tied lead. */
  HitchingPost = 400,
  /** Cordwood ranked between stakes; the axe stands in the block. */
  Woodpile = 401,
  /** A half-barrel planter spilling blooms over the street. */
  StreetPlanter = 402,
  /** A carved civic bench, worn where people actually sit. */
  StoneBench = 403,
  /** A street grocer's tiered display under a hanging scale. */
  ProduceStand = 404,
  // THE TRADES KEEP SHOP — the working-trades kit (405-416,
  // docs/trade-decor-plan.md). The town kit dressed the street;
  // this shelf dresses the SHOPS behind it. Same voice, TENDED,
  // NEVER LEFT — every piece is mid-shift: the blade still cooling
  // in the quench, the loaves still warm on the peel, the chalk
  // marks fresh on the dress form. A trade you can read at a
  // glance is a town you believe in.
  /** The smith's slack tub: iron-banded, a blade left cooling, steam rising. */
  QuenchTrough = 405,
  /** A treadle grinding wheel, its groove worn true, a blade resting on the rest. */
  Grindstone = 406,
  /** The forge's great double-lung bellows parked on its stand, nozzle to the fire. */
  SmithBellows = 407,
  /** Bar stock leaning and ingots stacked by metal — the smith's larder. */
  IngotRack = 408,
  /** Planks racked on edge between dowel pegs, sawdust drifted below. */
  LumberRack = 409,
  /** Two brimming dye vats, a stir paddle resting, drips down the staves. */
  DyeVats = 410,
  /** The tailor's dress form wearing a pinned, chalk-marked garment. */
  TailorsDummy = 411,
  /** Bolts of dyed cloth rolled and racked, ends spilling color. */
  ClothBolts = 412,
  /** A domed masonry bread oven, the day's loaves cooling on the peel. */
  BreadOven = 413,
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
  /** A raised street cask on its cradle — cooper's work, a wooden tap, the pail waiting. */
  WaterCask = 418,
  /** A long staved street trough of still water beside the hitching rail. */
  WaterTrough = 419,
  /** The potter's kick-wheel, a wet pot half-risen on the wheelhead. */
  PottersWheel = 420,
  /** The bottle kiln mid-firing, greenware boarded and waiting its turn. */
  PotteryKiln = 421,
  /** A slant-top scribe's desk — ledger open, ink still wet, scrolls pigeonholed. */
  ScribesDesk = 422,
  /** Dipped candles hung in pairs to cure over the chandler's wax tray. */
  CandleRack = 423,
  /** The fletcher's bench: arrows bundled, feathers boxed, staves on their pegs. */
  FletchersBench = 424,
  /** The cobbler's corner: the iron last, a row of finished boots, scraps below. */
  CobblersBench = 425,
  /** The fishmonger's tilted slab, the morning catch laid out in silver rows. */
  FishmongerSlab = 426,
  /** A merchant's beam scale on its bracket, one pan left low mid-weigh. */
  HangingScale = 427,
  /** The merchant's runner-clothed display table, wares dealt across the top. */
  DisplayTable = 428,
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
  [Tile.FeedTrough]: { name: 'feed trough', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.Windmill]: { name: 'windmill', solid: true, color: '#8d8798', raised: true, topColor: '#a8794a' },
  [Tile.ButterChurn]: { name: 'butter churn', solid: true, color: '#7d5a2e', raised: true, topColor: '#a8794a' },
  [Tile.FruitPress]: { name: 'fruit press', solid: true, color: '#6e5433', raised: true, topColor: '#96703f' },
  [Tile.BrewKeg]: { name: 'brew keg', solid: true, color: '#94693a', raised: true, topColor: '#7d5a2e' },
  [Tile.Smoker]: { name: 'smoker', solid: true, color: '#55505e', raised: true, topColor: '#6e6a75' },
  [Tile.DryingRack]: { name: 'drying rack', solid: true, color: '#7d5a2e', raised: true, topColor: '#8a6234' },
  [Tile.Apiary]: { name: 'apiary', solid: true, color: '#c9a86a', raised: true, topColor: '#e0c48e' },
  [Tile.Scarecrow]: { name: 'scarecrow', solid: true, color: '#8a6a45', raised: true, topColor: '#c9a86a' },
  [Tile.HayBale]: { name: 'hay bale', solid: true, color: '#c9a64b', raised: true, topColor: '#e0c48e' },
  [Tile.Silo]: { name: 'silo', solid: true, color: '#8d8798', raised: true, topColor: '#a8794a' },
  [Tile.Dovecote]: { name: 'dovecote', solid: true, color: '#e8e2d4', raised: true, topColor: '#7d5a2e' },
  // THE CAMP BARES ITS TEETH — war-camp fortification + props.
  [Tile.Palisade]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeDiagNE]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeDiagNW]: { name: 'spiked palisade', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeGate]: { name: 'palisade gate', solid: false, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.PalisadeGateShut]: { name: 'palisade gate', solid: true, color: '#5e4023', raised: true, topColor: '#8a6534' },
  [Tile.StandingTorch]: { name: 'standing torch', solid: true, color: '#6b4a26', raised: true, topColor: '#e8823d' },
  [Tile.Bonfire]: { name: 'bonfire', solid: true, color: '#57535f', raised: true, topColor: '#e8823d' },
  [Tile.WarBrazier]: { name: 'war brazier', solid: true, color: '#3a3444', raised: true, topColor: '#e8823d' },
  [Tile.TentHide]: { name: 'hide tent', solid: true, color: '#7a5c3e', raised: true, topColor: '#8f6e4a' },
  [Tile.TentWar]: { name: 'war tent', solid: true, color: '#6e4a33', raised: true, topColor: '#84583c' },
  [Tile.SkullPile]: { name: 'skull pile', solid: true, color: '#c9c2ae', raised: true, topColor: '#ddd6c2' },
  [Tile.SkullTotem]: { name: 'skull totem', solid: true, color: '#6b4a26', raised: true, topColor: '#c9c2ae' },
  [Tile.WarBanner]: { name: 'war banner', solid: true, color: '#6b4a26', raised: true, topColor: '#8a3b34' },
  [Tile.PrisonCage]: { name: 'prison cage', solid: true, color: '#5e4023', raised: true, topColor: '#7d5a2e' },
  [Tile.SpikeBarrier]: { name: 'spike barrier', solid: true, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.MeatSpit]: { name: 'roasting spit', solid: true, color: '#6b4a26', raised: true, topColor: '#a3543a' },
  [Tile.MeatRack]: { name: 'meat rack', solid: true, color: '#6b4a26', raised: true, topColor: '#8a4a3a' },
  [Tile.CookPot]: { name: 'cook pot', solid: true, color: '#3a3444', raised: true, topColor: '#5d7a42' },
  [Tile.PotionRack]: { name: 'potion rack', solid: true, color: '#6b4a26', raised: true, topColor: '#5d8a6e' },
  [Tile.BeastNest]: { name: 'beast nest', solid: true, color: '#8a6a45', raised: true, topColor: '#a5834f' },
  [Tile.PlunderSacks]: { name: 'plunder sacks', solid: true, color: '#9c8a62', raised: true, topColor: '#b09c70' },
  [Tile.SpearRack]: { name: 'spear rack', solid: true, color: '#6b4a26', raised: true, topColor: '#8a6534' },
  [Tile.TargetDummy]: { name: 'target dummy', solid: true, color: '#b09c70', raised: true, topColor: '#c9b684' },
  [Tile.WarDrum]: { name: 'war drum', solid: true, color: '#6b4a26', raised: true, topColor: '#c9b088' },
  [Tile.HideFrame]: { name: 'hide frame', solid: true, color: '#6b4a26', raised: true, topColor: '#b08d62' },
  // THE FAIR HOUSE FURNISHED — elven decor. Minimap voice: pale
  // silverbark and cool mithril blues, so an elven quarter reads
  // silver-green where the war camp reads mud-brown.
  [Tile.ArcaneBeacon]: { name: 'arcane beacon', solid: true, color: '#7a6aa8', raised: true, topColor: '#b48fe8' },
  [Tile.ElvenBanner]: { name: 'elven banner', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenBench]: { name: 'elven bench', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenTable]: { name: 'elven table', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenChair]: { name: 'elven chair', solid: true, color: '#b0a488', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenDaybed]: { name: 'elven daybed', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenBookcase]: { name: 'elven bookcase', solid: true, color: '#a89a80', raised: true, topColor: '#c9bfa4' },
  [Tile.ElvenLectern]: { name: 'elven lectern', solid: true, color: '#b0a488', raised: true, topColor: '#e8e2d4' },
  [Tile.ElvenHarp]: { name: 'elven harp', solid: true, color: '#c9bfa4', raised: true, topColor: '#d6e4f2' },
  [Tile.ElvenLoom]: { name: 'elven loom', solid: true, color: '#b0a488', raised: true, topColor: '#cfd9ee' },
  [Tile.ElvenFountain]: { name: 'singing fountain', solid: true, color: '#8d8798', raised: true, topColor: '#7ec4d8' },
  [Tile.ElvenStatue]: { name: 'elven statue', solid: true, color: '#ddd6c2', raised: true, topColor: '#e8e2d4' },
  [Tile.Moonwell]: { name: 'moonwell', solid: true, color: '#8d8798', raised: true, topColor: '#9fe8d8' },
  [Tile.Everflame]: { name: 'everflame', solid: true, color: '#9aaec4', raised: true, topColor: '#dff2ff' },
  [Tile.MithrilAnvil]: { name: 'mithril anvil', solid: true, color: '#7a8598', raised: true, topColor: '#aebfd4' },
  [Tile.ElvenArmsRack]: { name: 'arms rack', solid: true, color: '#b0a488', raised: true, topColor: '#9aaec4' },
  [Tile.ElvenPlanter]: { name: 'elven planter', solid: true, color: '#a89a80', raised: true, topColor: '#5d8a6e' },
  [Tile.ElvenMirror]: { name: 'standing mirror', solid: true, color: '#b0a488', raised: true, topColor: '#d6e4f2' },
  [Tile.ElvenWaystone]: { name: 'waystone', solid: true, color: '#8d8798', raised: true, topColor: '#9fe8d8' },
  [Tile.ElvenChimes]: { name: 'wind chimes', solid: true, color: '#8fa3bd', raised: true, topColor: '#aebfd4' },
  // The imbued works: violet-and-green magic on the minimap.
  [Tile.Runestone]: { name: 'runestone', solid: true, color: '#57535f', raised: true, topColor: '#b48fe8' },
  [Tile.CrystalCluster]: { name: 'mana crystals', solid: true, color: '#3fae6e', raised: true, topColor: '#7fe8a8' },
  [Tile.WardArch]: { name: 'ward arch', solid: true, color: '#8d8798', raised: true, topColor: '#b48fe8' },
  [Tile.ArcaneTome]: { name: 'arcane tome', solid: true, color: '#8d8798', raised: true, topColor: '#efe6ff' },
  [Tile.RunePillar]: { name: 'rune pillar', solid: true, color: '#8d8798', raised: true, topColor: '#7fe8a8' },
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
  // THE CLIPPED GREEN — garden architecture. Minimap voice: clipped
  // leaf-green, a full step deeper than meadow grass, so a garden
  // ring reads as drawn hedgerow, never as a lawn.
  [Tile.Hedge]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  [Tile.HedgeDiagNE]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  [Tile.HedgeDiagNW]: { name: 'hedge', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  // The open archway is a WALKABLE raised prop (the path runs under
  // the living arch); the latched wicket bars it like any gate.
  [Tile.HedgeGate]: { name: 'hedge arch', solid: false, color: '#356234', raised: true, topColor: '#4c8342' },
  [Tile.HedgeGateShut]: { name: 'hedge arch', solid: true, color: '#2f5c31', raised: true, topColor: '#4c8342' },
  [Tile.TopiaryBall]: { name: 'topiary', solid: true, color: '#35663a', raised: true, topColor: '#549447' },
  [Tile.TopiarySpire]: { name: 'topiary spire', solid: true, color: '#2c5533', raised: true, topColor: '#4c8342' },
  // THE LONG DARK FURNISHED — minimap voice: props sit a step warmer
  // or paler than the '#514b58' flagstone dark, so a dressed chamber
  // reads furnished at chart scale without shouting. The two wall
  // fixtures are WALKABLE raised props (the iron rides the wall face;
  // the corridor runs on beneath them).
  [Tile.MossBarrel]: { name: 'mossy barrel', solid: true, color: '#4f5a44', raised: true, topColor: '#5e7048' },
  [Tile.MineCart]: { name: 'ore cart', solid: true, color: '#4c4a52', raised: true, topColor: '#7a6a54' },
  [Tile.ChainedSkeleton]: { name: 'chained skeleton', solid: true, color: '#6f6a5e', raised: true, topColor: '#cfc7ae' },
  [Tile.WallSconce]: { name: 'wall sconce', solid: false, color: '#3c3640', raised: true, topColor: '#e8933c' },
  [Tile.WallChains]: { name: 'wall chains', solid: false, color: '#4a4550', raised: true, topColor: '#6d6875' },
  [Tile.Sarcophagus]: { name: 'sarcophagus', solid: true, color: '#565062', raised: true, topColor: '#847e91' },
  [Tile.BrokenPillar]: { name: 'broken pillar', solid: true, color: '#5b5566', raised: true, topColor: '#8c8798' },
  [Tile.GrandPillar]: { name: 'grand pillar', solid: true, color: '#5b5566', raised: true, topColor: '#938e9f' },
  [Tile.BurialUrns]: { name: 'burial urns', solid: true, color: '#7a5a40', raised: true, topColor: '#a87e50' },
  [Tile.AncientStatue]: { name: 'ancient statue', solid: true, color: '#5e5869', raised: true, topColor: '#8f8a7a' },
  // THE LONG DARK PEOPLED — same chart voice as the first kit: a full
  // value step off the flagstone dark. The wall fixtures and the two
  // floor-flat pieces (pool, grate) are WALKABLE.
  [Tile.GibbetCage]: { name: 'hanging gibbet', solid: true, color: '#565060', raised: true, topColor: '#6d6875' },
  [Tile.Stocks]: { name: 'stocks', solid: true, color: '#6b5844', raised: true, topColor: '#8a7355' },
  [Tile.TimberBrace]: { name: 'mine brace', solid: false, color: '#6b5844', raised: true, topColor: '#8a7355' },
  [Tile.WallFossil]: { name: 'buried ribs', solid: false, color: '#6f6a5e', raised: true, topColor: '#cfc7ae' },
  [Tile.WallWeb]: { name: 'cobwebs', solid: false, color: '#5f5c66', raised: true, topColor: '#9a97a4' },
  [Tile.DripPool]: { name: 'drip pool', solid: false, color: '#3a3d4a', raised: true, topColor: '#566074' },
  [Tile.ColdCamp]: { name: 'cold camp', solid: true, color: '#5a534e', raised: true, topColor: '#7d7268' },
  [Tile.LootedChest]: { name: 'looted chest', solid: true, color: '#66513c', raised: true, topColor: '#84684a' },
  [Tile.CandleShrine]: { name: 'grave candles', solid: true, color: '#6e675a', raised: true, topColor: '#e8c26a' },
  [Tile.IronGrate]: { name: 'iron grate', solid: false, color: '#454049', raised: true, topColor: '#5d5670' },
  // THE BANKS GET THEIR GOODS — minimap voice: silvered driftwood
  // grays and bone pales, each a full value step off the three
  // grounds a shore camp stands on (meadow '#4f7c35', trampled
  // '#96744c', sand '#ddc98d') — cool against the warm bank, so a
  // dressed shore reads as a CAMP at chart scale, never as flotsam.
  [Tile.FishRack]: { name: 'drying rack', solid: true, color: '#75705f', raised: true, topColor: '#b8c4c6' },
  [Tile.TideTotem]: { name: 'tide totem', solid: true, color: '#6e6858', raised: true, topColor: '#cfc7ae' },
  [Tile.NetFrame]: { name: 'hung net', solid: true, color: '#5c6656', raised: true, topColor: '#8d8672' },
  [Tile.Dugout]: { name: 'dugout canoe', solid: true, color: '#6b6353', raised: true, topColor: '#8d8672' },
  [Tile.HarpoonRack]: { name: 'harpoon rack', solid: true, color: '#7a7464', raised: true, topColor: '#cfc7ae' },
  [Tile.ShellMidden]: { name: 'shell midden', solid: true, color: '#a89e8c', raised: true, topColor: '#ded5c4' },
  [Tile.FishTrap]: { name: 'fish trap', solid: true, color: '#7c6c44', raised: true, topColor: '#a08b58' },
  [Tile.RoeNest]: { name: 'roe nest', solid: true, color: '#3f5c48', raised: true, topColor: '#9fe0d0' },
  [Tile.LurePole]: { name: 'lure pole', solid: true, color: '#6b6353', raised: true, topColor: '#7fd8c8' },
  [Tile.TideAltar]: { name: 'tide altar', solid: true, color: '#707a80', raised: true, topColor: '#c98a74' },
  [Tile.CatchBasket]: { name: 'catch baskets', solid: true, color: '#7c6c44', raised: true, topColor: '#b8c4c6' },
  [Tile.WhaleRibs]: { name: 'great ribs', solid: true, color: '#8a8272', raised: true, topColor: '#e6dfc8' },
  // THE CRAFTSMEN OF THE BANKS: the working layer keeps the kit value
  // law — every piece a full step off sand, trampled dirt, and meadow.
  [Tile.ReedShelter]: { name: 'reed shelter', solid: true, color: '#6b7245', raised: true, topColor: '#c2b98a' },
  [Tile.SmokeTripod]: { name: 'smoke tripod', solid: true, color: '#6b6353', raised: true, topColor: '#9aa3a4' },
  [Tile.MendingBench]: { name: 'mending bench', solid: true, color: '#75705f', raised: true, topColor: '#5a7a5c' },
  [Tile.WeirPanels]: { name: 'tidal weir', solid: true, color: '#7c6c44', raised: true, topColor: '#a08b58' },
  [Tile.KelpLine]: { name: 'kelp line', solid: true, color: '#44584a', raised: true, topColor: '#7fae6a' },
  [Tile.SaltPan]: { name: 'salt pan', solid: true, color: '#9aa0a0', raised: true, topColor: '#e8ecec' },
  [Tile.ShellBench]: { name: "shell-carver's bench", solid: true, color: '#8a8272', raised: true, topColor: '#d8cfd8' },
  [Tile.WithyStore]: { name: 'withy bundles', solid: true, color: '#87764a', raised: true, topColor: '#c9b278' },
  [Tile.KeepPool]: { name: 'keep-pool', solid: true, color: '#3c545e', raised: true, topColor: '#b8c4c6' },
  [Tile.TideChimes]: { name: 'shell chimes', solid: true, color: '#6e6858', raised: true, topColor: '#e8d8b8' },
  // THE TOWN KEEPS ITS DAY — minimap voice: warm worked timber and
  // town limestone with one bright key each, every piece a full
  // value step off the three grounds a street stands on (StoneFloor
  // '#514b58', path '#96744c', grass '#4f7c35') — so a dressed
  // square reads as a SQUARE at chart scale, never as clutter.
  [Tile.TownFountain]: { name: 'town fountain', solid: true, color: '#7d8489', raised: true, topColor: '#9fc4d8' },
  [Tile.FounderStatue]: { name: "founder's statue", solid: true, color: '#6f6a58', raised: true, topColor: '#7fae94' },
  [Tile.NoticeBoard]: { name: 'notice board', solid: true, color: '#6f5a38', raised: true, topColor: '#e2d9c4' },
  [Tile.TownBell]: { name: 'town bell', solid: true, color: '#6f5a38', raised: true, topColor: '#c2a45c' },
  [Tile.HandCart]: { name: 'hand cart', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.GrainSacks]: { name: 'grain sacks', solid: true, color: '#8a744e', raised: true, topColor: '#d8c49a' },
  [Tile.BarrelStack]: { name: 'stacked barrels', solid: true, color: '#75603e', raised: true, topColor: '#b08a45' },
  [Tile.CrateStack]: { name: 'stacked crates', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.PennantLine]: { name: 'pennant line', solid: true, color: '#6f6a58', raised: true, topColor: '#c25668' },
  [Tile.HitchingPost]: { name: 'hitching post', solid: true, color: '#6f5a38', raised: true, topColor: '#a8823f' },
  [Tile.Woodpile]: { name: 'woodpile', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  [Tile.StreetPlanter]: { name: 'street planter', solid: true, color: '#75603e', raised: true, topColor: '#c95a74' },
  [Tile.StoneBench]: { name: 'stone bench', solid: true, color: '#8a857a', raised: true, topColor: '#b3ada0' },
  [Tile.ProduceStand]: { name: 'produce stand', solid: true, color: '#75603e', raised: true, topColor: '#c05a3a' },
  // THE TRADES KEEP SHOP — minimap voice: each trade keys off its
  // own material (quench iron, grindstone grit, oven brick, dye
  // madder, herb green) so a workshop yard reads as a WORKSHOP at
  // chart scale, distinct from the street furniture beside it.
  [Tile.QuenchTrough]: { name: 'quench trough', solid: true, color: '#4c4a52', raised: true, topColor: '#8fb4c4' },
  [Tile.Grindstone]: { name: 'grindstone', solid: true, color: '#6f5a38', raised: true, topColor: '#b3ada0' },
  [Tile.SmithBellows]: { name: "smith's bellows", solid: true, color: '#75603e', raised: true, topColor: '#a3714a' },
  [Tile.IngotRack]: { name: 'ingot rack', solid: true, color: '#5c5648', raised: true, topColor: '#c2a45c' },
  [Tile.LumberRack]: { name: 'lumber rack', solid: true, color: '#75603e', raised: true, topColor: '#d4b98a' },
  [Tile.DyeVats]: { name: 'dye vats', solid: true, color: '#75603e', raised: true, topColor: '#a04a58' },
  [Tile.TailorsDummy]: { name: "tailor's dummy", solid: true, color: '#6f6a58', raised: true, topColor: '#7a86b8' },
  [Tile.ClothBolts]: { name: 'cloth bolts', solid: true, color: '#75603e', raised: true, topColor: '#c4808a' },
  [Tile.BreadOven]: { name: 'bread oven', solid: true, color: '#8a6a52', raised: true, topColor: '#b8917a' },
  [Tile.ButcherBlock]: { name: "butcher's block", solid: true, color: '#75603e', raised: true, topColor: '#c9856a' },
  [Tile.HerbRack]: { name: 'herb rack', solid: true, color: '#6f5a38', raised: true, topColor: '#7fae6a' },
  [Tile.ShopShelf]: { name: 'shop shelf', solid: true, color: '#75603e', raised: true, topColor: '#c9a76a' },
  // THE SECOND SHIFT — minimap voice continues the first wave's law:
  // each trade keys off its own material (water reads WATER for all
  // three street pieces, kiln brick, scribe paper, chandler wax,
  // fletch red, cobbler leather, fish silver, merchant brass).
  [Tile.WallFountain]: { name: 'spring fount', solid: true, color: '#8a857a', raised: true, topColor: '#8fb4c4' },
  [Tile.WaterCask]: { name: 'water cask', solid: true, color: '#75603e', raised: true, topColor: '#b08a45' },
  [Tile.WaterTrough]: { name: 'water trough', solid: true, color: '#75603e', raised: true, topColor: '#8fb4c4' },
  [Tile.PottersWheel]: { name: "potter's wheel", solid: true, color: '#75603e', raised: true, topColor: '#b07850' },
  [Tile.PotteryKiln]: { name: 'pottery kiln', solid: true, color: '#96604a', raised: true, topColor: '#c4a284' },
  [Tile.ScribesDesk]: { name: "scribe's desk", solid: true, color: '#75603e', raised: true, topColor: '#e8dcc4' },
  [Tile.CandleRack]: { name: 'candle rack', solid: true, color: '#6f5a38', raised: true, topColor: '#e8d9b0' },
  [Tile.FletchersBench]: { name: "fletcher's bench", solid: true, color: '#75603e', raised: true, topColor: '#c05a48' },
  [Tile.CobblersBench]: { name: "cobbler's bench", solid: true, color: '#75603e', raised: true, topColor: '#8a5a36' },
  [Tile.FishmongerSlab]: { name: "fishmonger's slab", solid: true, color: '#8a857a', raised: true, topColor: '#b8c4cc' },
  [Tile.HangingScale]: { name: 'hanging scale', solid: true, color: '#6f5a38', raised: true, topColor: '#c2a45c' },
  [Tile.DisplayTable]: { name: 'display table', solid: true, color: '#75603e', raised: true, topColor: '#c9a13c' },
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
  // The grand pillar is the underworld's PillarStone: a column of
  // real girth throws a real shadow.
  Tile.GrandPillar,
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
  // Head-high sharpened logs: a war camp's wall hides what it guards.
  // The open gate spills firelight; the barred one seals it.
  Tile.Palisade,
  Tile.PalisadeDiagNE,
  Tile.PalisadeDiagNW,
  Tile.PalisadeGateShut,
  // THE WAIST LAW: the hedgerow runs hip-high — lamplight clears a
  // clipped cushion bed the way it clears a fence, so the hedge WALLS
  // never block. Only the living arch is full-height green mass:
  // shut, it seals the garden; open, it spills lantern light down
  // the path.
  Tile.HedgeGateShut,
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
export type DoorMaterial =
  | 'stone'
  | 'wood'
  | 'fence'
  | 'garrison'
  | 'palisade'
  | 'hedge';

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
  // The camp gate: rides ALL the door machinery like the fence gate,
  // rendered by the palisade family (never the wall-doorway pipeline).
  // Unlike a field gate its shut leaf is full-height lashed logs —
  // it blocks lamplight and reads as fortification.
  [Tile.PalisadeGate, { material: 'palisade', wide: false, open: true }],
  [Tile.PalisadeGateShut, { material: 'palisade', wide: false, open: false }],
  // The garden arch: rides ALL the door machinery like the fence
  // gate, rendered by the hedge family (never the wall-doorway
  // pipeline). The wicket under the living arch is waist-high timber,
  // but the arch above it is full green mass — shut, the whole
  // opening blocks lamplight and reads as a sealed garden.
  [Tile.HedgeGate, { material: 'hedge', wide: false, open: true }],
  [Tile.HedgeGateShut, { material: 'hedge', wide: false, open: false }],
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
  [Tile.PalisadeGate, Tile.PalisadeGateShut],
  [Tile.HedgeGate, Tile.HedgeGateShut],
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

/**
 * THE SPIKED WALL — the war camp's fortification family: straight
 * runs, the two 45° turns, and the lashed-log gate in both postures.
 * A THIRD wall family beside buildings and the garrison (the
 * separate-masonry law): palisades never join a WALL_RUN, never
 * bound an interior, and merge only with their own kind — a goblin
 * stockade dying into a town wall would read as one builder's work,
 * and they are not.
 */
export const PALISADE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Palisade,
  Tile.PalisadeDiagNE,
  Tile.PalisadeDiagNW,
  Tile.PalisadeGate,
  Tile.PalisadeGateShut,
]);

/** The fence family's auto-orient law, spoken in sharpened logs. */
export function orientDiagPalisade(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.PalisadeDiagNE;
  if (nw || se) return Tile.PalisadeDiagNW;
  return Tile.PalisadeDiagNE;
}

/**
 * THE CLIPPED GREEN — the garden's living wall: straight runs, the
 * two 45° turns, and the arched gate in both postures. A FOURTH
 * run-merging family (the separate-masonry law): hedges never join a
 * WALL_RUN, never bound an interior, and merge only with their own
 * kind — clipped green dying into a timber fence would read as one
 * builder's work, and a gardener is not a carpenter.
 */
export const HEDGE_TILES: ReadonlySet<Tile> = new Set([
  Tile.Hedge,
  Tile.HedgeDiagNE,
  Tile.HedgeDiagNW,
  Tile.HedgeGate,
  Tile.HedgeGateShut,
]);

/** The fence family's auto-orient law, spoken in clipped leaves. */
export function orientDiagHedge(
  ne: boolean,
  nw: boolean,
  se: boolean,
  sw: boolean,
): Tile {
  if (ne || sw) return Tile.HedgeDiagNE;
  if (nw || se) return Tile.HedgeDiagNW;
  return Tile.HedgeDiagNE;
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
  // War-camp props: you shoulder past the stake, not an invisible
  // crate around it. Walls, gates, tents, cages, and the spike
  // barrier stay full-block — they are the camp's architecture.
  [Tile.StandingTorch, 0.18],
  [Tile.Bonfire, 0.44],
  [Tile.WarBrazier, 0.3],
  [Tile.SkullPile, 0.34],
  [Tile.SkullTotem, 0.2],
  [Tile.WarBanner, 0.2],
  [Tile.MeatSpit, 0.35],
  [Tile.MeatRack, 0.35],
  [Tile.CookPot, 0.3],
  [Tile.PotionRack, 0.32],
  [Tile.BeastNest, 0.34],
  [Tile.PlunderSacks, 0.36],
  [Tile.SpearRack, 0.3],
  [Tile.TargetDummy, 0.2],
  [Tile.WarDrum, 0.32],
  [Tile.HideFrame, 0.25],
  // Elven props: fine-limbed pieces you slip past — the kit's grace
  // extends to its footprints. Bulk furniture (bench, table, daybed,
  // chair, bookcase) stays full-block like its human cousins.
  [Tile.ArcaneBeacon, 0.3],
  [Tile.ElvenBanner, 0.2],
  [Tile.ElvenLectern, 0.22],
  [Tile.ElvenHarp, 0.3],
  [Tile.ElvenLoom, 0.35],
  [Tile.ElvenFountain, 0.44],
  [Tile.ElvenStatue, 0.34],
  [Tile.Moonwell, 0.42],
  [Tile.Everflame, 0.34],
  [Tile.MithrilAnvil, 0.32],
  [Tile.ElvenArmsRack, 0.3],
  [Tile.ElvenPlanter, 0.28],
  [Tile.ElvenMirror, 0.22],
  [Tile.ElvenWaystone, 0.3],
  [Tile.ElvenChimes, 0.2],
  // Imbued works: you walk around the stone, not the magic.
  [Tile.Runestone, 0.32],
  [Tile.CrystalCluster, 0.34],
  [Tile.WardArch, 0.38],
  [Tile.ArcaneTome, 0.24],
  [Tile.RunePillar, 0.2],
  // THE CLIPPED GREEN: you brush past a topiary's stem, but the hedge
  // WALL stays full-block — it is the garden's architecture.
  [Tile.TopiaryBall, 0.3],
  [Tile.TopiarySpire, 0.3],
  // THE LONG DARK FURNISHED: centered masses you squeeze past in a
  // tight corridor — round columns especially (you shoulder around
  // the drum, never an invisible crate). The sarcophagus keeps its
  // full block: it is a coffin, not a bollard.
  [Tile.MossBarrel, 0.3],
  [Tile.MineCart, 0.36],
  [Tile.ChainedSkeleton, 0.28],
  [Tile.BrokenPillar, 0.34],
  [Tile.GrandPillar, 0.38],
  [Tile.BurialUrns, 0.3],
  [Tile.AncientStatue, 0.34],
  // THE LONG DARK PEOPLED: the gallows post, the pillory platform,
  // the camp ring, the wrecked chest, and the candle stone are all
  // masses you step around, never full blocks.
  [Tile.GibbetCage, 0.3],
  [Tile.Stocks, 0.34],
  [Tile.ColdCamp, 0.3],
  [Tile.LootedChest, 0.28],
  [Tile.CandleShrine, 0.26],
  // THE BANKS GET THEIR GOODS: bank-stuff is lashed sticks and heaps
  // — you shoulder past the pole, wade around the hull, never bump an
  // invisible crate. The dugout and the ribs keep the widest stance.
  [Tile.FishRack, 0.35],
  [Tile.TideTotem, 0.2],
  [Tile.NetFrame, 0.35],
  [Tile.Dugout, 0.45],
  [Tile.HarpoonRack, 0.3],
  [Tile.ShellMidden, 0.34],
  [Tile.FishTrap, 0.32],
  [Tile.RoeNest, 0.34],
  [Tile.LurePole, 0.18],
  [Tile.TideAltar, 0.4],
  [Tile.CatchBasket, 0.32],
  [Tile.WhaleRibs, 0.42],
  // The craftsmen's gear: benches you lean over, lines you duck
  // under, the shelter and the keep-pool keep the widest stance.
  [Tile.ReedShelter, 0.42],
  [Tile.SmokeTripod, 0.3],
  [Tile.MendingBench, 0.34],
  [Tile.WeirPanels, 0.36],
  [Tile.KelpLine, 0.32],
  [Tile.SaltPan, 0.36],
  [Tile.ShellBench, 0.32],
  [Tile.WithyStore, 0.3],
  [Tile.KeepPool, 0.38],
  [Tile.TideChimes, 0.18],
  // THE TOWN KEEPS ITS DAY: street furniture you brush past — the
  // fountain and the cart keep the widest stance, the planter and
  // the hitch rail are things you lean on, not walls you hit.
  [Tile.TownFountain, 0.45],
  [Tile.FounderStatue, 0.36],
  [Tile.NoticeBoard, 0.3],
  [Tile.TownBell, 0.4],
  [Tile.HandCart, 0.4],
  [Tile.GrainSacks, 0.32],
  [Tile.BarrelStack, 0.38],
  [Tile.CrateStack, 0.34],
  [Tile.PennantLine, 0.32],
  [Tile.HitchingPost, 0.28],
  [Tile.Woodpile, 0.36],
  [Tile.StreetPlanter, 0.24],
  [Tile.StoneBench, 0.34],
  [Tile.ProduceStand, 0.36],
  // THE TRADES KEEP SHOP: workshop gear you work AROUND — the oven
  // is the yard's one true mass, the dress form a pole you sidle
  // past, the racks and vats the shoulder-width of the aisles they
  // stand in.
  [Tile.QuenchTrough, 0.4],
  [Tile.Grindstone, 0.34],
  [Tile.SmithBellows, 0.32],
  [Tile.IngotRack, 0.34],
  [Tile.LumberRack, 0.36],
  [Tile.DyeVats, 0.36],
  [Tile.TailorsDummy, 0.24],
  [Tile.ClothBolts, 0.32],
  [Tile.BreadOven, 0.45],
  [Tile.ButcherBlock, 0.32],
  [Tile.HerbRack, 0.28],
  [Tile.ShopShelf, 0.38],
  // THE SECOND SHIFT: the wall fountain and the kiln are the wave's
  // two true masses; the pump and the scale are poles you sidle
  // past; the trough runs long and low like the rail it serves.
  [Tile.WallFountain, 0.42],
  [Tile.WaterCask, 0.3],
  [Tile.WaterTrough, 0.42],
  [Tile.PottersWheel, 0.34],
  [Tile.PotteryKiln, 0.45],
  [Tile.ScribesDesk, 0.32],
  [Tile.CandleRack, 0.28],
  [Tile.FletchersBench, 0.34],
  [Tile.CobblersBench, 0.3],
  [Tile.FishmongerSlab, 0.36],
  [Tile.HangingScale, 0.24],
  [Tile.DisplayTable, 0.38],
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
  | 'crackedwall'
  // THE CAMP BARES ITS TEETH: nearly every war-camp piece can be
  // beaten apart — clearing the camp is the fantasy.
  | 'palisade'
  | 'torch'
  | 'brazier'
  | 'tent'
  | 'skulls'
  | 'totem'
  | 'banner'
  | 'cage'
  | 'stakes'
  | 'spit'
  | 'meatrack'
  | 'pot'
  | 'potions'
  | 'nest'
  | 'sacks'
  | 'spears'
  | 'dummy'
  | 'drum'
  | 'hide'
  // THE FAIR HOUSE FURNISHED: elven finery — pale splinters, silk
  // scraps, and moonglass glitter, never the camp's brown wreckage.
  | 'beacon'
  | 'elfbanner'
  | 'elfbench'
  | 'elftable'
  | 'elfchair'
  | 'daybed'
  | 'bookcase'
  | 'lectern'
  | 'harp'
  | 'loom'
  | 'fountain'
  | 'statue'
  | 'moonwell'
  | 'anvil'
  | 'armsrack'
  | 'planter'
  | 'mirror'
  | 'waystone'
  | 'chimes'
  // The imbued works: crystal light that shatters bright.
  | 'runestone'
  | 'crystals'
  | 'wardarch'
  | 'tome'
  | 'runepillar'
  // THE CLIPPED GREEN: a showpiece bursts in a cloud of leaves.
  | 'topiary'
  // THE LONG DARK FURNISHED: rotten wood folds wet, clay rings dry,
  // old bone scatters, and worked stone cracks in slabs.
  | 'mossbarrel'
  | 'minecart'
  | 'chainedbones'
  | 'sarcophagus'
  | 'brokenpillar'
  | 'urns'
  | 'oldstatue'
  // THE LONG DARK PEOPLED: the gibbet comes down chain-first, timber
  // splits dry, a dead camp scatters in ash, and wax snuffs soft.
  | 'gibbet'
  | 'stocks'
  | 'coldcamp'
  | 'lootchest'
  | 'candles'
  // THE BANKS GET THEIR GOODS: bank-stuff comes apart wet — lashings
  // let go, wicker springs, the catch escapes, old bone falls heavy.
  | 'fishrack'
  | 'tidetotem'
  | 'net'
  | 'dugout'
  | 'harpoons'
  | 'midden'
  | 'fishtrap'
  | 'roe'
  | 'lure'
  | 'catch'
  | 'greatribs'
  // THE CRAFTSMEN OF THE BANKS: the working gear's own wreckage —
  // reed walls sigh apart, smoke scatters, brine and salt spill.
  | 'shelter'
  | 'smoker'
  | 'mendbench'
  | 'weir'
  | 'kelpline'
  | 'saltpan'
  | 'shellbench'
  | 'withies'
  | 'keeppool'
  | 'shellchimes'
  // THE TOWN KEEPS ITS DAY: street timber coughs the joinery amber
  // it was built from; the NEW voices are town limestone, bronze
  // (the bell's break is the loudest note it ever plays), spilled
  // grain, flying laundry, and produce rolling for the gutter.
  | 'townfountain'
  | 'founder'
  | 'notices'
  | 'townbell'
  | 'handcart'
  | 'grainsacks'
  | 'barrelstack'
  | 'cratestack'
  | 'pennantline'
  | 'hitchpost'
  | 'woodpile'
  | 'streetplanter'
  | 'stonebench'
  | 'produce'
  // THE TRADES KEEP SHOP: each trade breaks in its own material —
  // the quench sloshes out, the grindstone disc ROLLS FREE, the
  // oven lands like the masonry it is, the bolts unroll in flight,
  // and a smashed shelf is a rain of crockery.
  | 'quench'
  | 'grindstone'
  | 'bellows'
  | 'ingots'
  | 'lumber'
  | 'dyevat'
  | 'dressform'
  | 'clothbolts'
  | 'breadoven'
  | 'butcherblock'
  | 'herbs'
  | 'shopshelf'
  // THE SECOND SHIFT: falling water and limestone, ringing pump
  // iron, slosh, wet clay, fired kiln brick, paper and ink, soft
  // wax, feather and shaft, leather, market silver, brass chain,
  // and the display table's rain of dealt goods.
  | 'wallfountain'
  | 'watercask'
  | 'watertrough'
  | 'potterswheel'
  | 'kiln'
  | 'scribedesk'
  | 'candlerack'
  | 'fletcher'
  | 'cobbler'
  | 'fishslab'
  | 'scales'
  | 'displaytable';

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
  // THE CAMP BARES ITS TEETH: the war camp is an obstacle course.
  // Walls hold four blows (the barricade knob turned at last), the
  // road-blocker two; camp dressing pops in one or two so clearing a
  // camp FEELS like clearing it. Gates are the door law's, not ours,
  // and the bonfire never breaks (a fire is doused, not smashed).
  // The long wall respawn means a breached ring stays breached for
  // the whole assault; clutter re-dresses on the furniture clock.
  [Tile.Palisade, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.PalisadeDiagNE, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.PalisadeDiagNW, { kind: 'palisade', respawnSec: 900, hits: 4 }],
  [Tile.StandingTorch, { kind: 'torch', respawnSec: 300, hits: 1 }],
  [Tile.WarBrazier, { kind: 'brazier', respawnSec: 300, hits: 2 }],
  [Tile.TentHide, { kind: 'tent', respawnSec: 600, hits: 3 }],
  [Tile.TentWar, { kind: 'tent', respawnSec: 600, hits: 3 }],
  [Tile.SkullPile, { kind: 'skulls', respawnSec: 600, hits: 1 }],
  [Tile.SkullTotem, { kind: 'totem', respawnSec: 600, hits: 2 }],
  [Tile.WarBanner, { kind: 'banner', respawnSec: 420, hits: 2 }],
  [Tile.PrisonCage, { kind: 'cage', respawnSec: 600, hits: 3 }],
  [Tile.SpikeBarrier, { kind: 'stakes', respawnSec: 600, hits: 2 }],
  [Tile.MeatSpit, { kind: 'spit', respawnSec: 300, hits: 2 }],
  [Tile.MeatRack, { kind: 'meatrack', respawnSec: 300, hits: 2 }],
  [Tile.CookPot, { kind: 'pot', respawnSec: 300, hits: 2 }],
  [Tile.PotionRack, { kind: 'potions', respawnSec: 300, hits: 1 }],
  [Tile.BeastNest, { kind: 'nest', respawnSec: 420, hits: 1 }],
  [Tile.PlunderSacks, { kind: 'sacks', respawnSec: 420, hits: 2 }],
  [Tile.SpearRack, { kind: 'spears', respawnSec: 420, hits: 2 }],
  [Tile.TargetDummy, { kind: 'dummy', respawnSec: 240, hits: 3 }],
  [Tile.WarDrum, { kind: 'drum', respawnSec: 420, hits: 2 }],
  [Tile.HideFrame, { kind: 'hide', respawnSec: 420, hits: 2 }],
  // THE FAIR HOUSE FURNISHED: finery breaks fast — silk tears, glass
  // rings, turned legs snap in one or two blows — but stone and
  // mithril stand long (the statue, fountain, anvil and waystone hold
  // four). The Everflame is deliberately NOT here: a flame this old
  // is not put out by a stick (the bonfire law), so a sacked hall
  // keeps its light.
  [Tile.ArcaneBeacon, { kind: 'beacon', respawnSec: 300, hits: 2 }],
  [Tile.ElvenBanner, { kind: 'elfbanner', respawnSec: 420, hits: 2 }],
  [Tile.ElvenBench, { kind: 'elfbench', respawnSec: 240, hits: 2 }],
  [Tile.ElvenTable, { kind: 'elftable', respawnSec: 240, hits: 2 }],
  [Tile.ElvenChair, { kind: 'elfchair', respawnSec: 240, hits: 1 }],
  [Tile.ElvenDaybed, { kind: 'daybed', respawnSec: 300, hits: 2 }],
  [Tile.ElvenBookcase, { kind: 'bookcase', respawnSec: 300, hits: 3 }],
  [Tile.ElvenLectern, { kind: 'lectern', respawnSec: 240, hits: 1 }],
  [Tile.ElvenHarp, { kind: 'harp', respawnSec: 300, hits: 2 }],
  [Tile.ElvenLoom, { kind: 'loom', respawnSec: 300, hits: 2 }],
  [Tile.ElvenFountain, { kind: 'fountain', respawnSec: 600, hits: 4 }],
  [Tile.ElvenStatue, { kind: 'statue', respawnSec: 600, hits: 4 }],
  [Tile.Moonwell, { kind: 'moonwell', respawnSec: 600, hits: 3 }],
  [Tile.MithrilAnvil, { kind: 'anvil', respawnSec: 600, hits: 4 }],
  [Tile.ElvenArmsRack, { kind: 'armsrack', respawnSec: 420, hits: 2 }],
  [Tile.ElvenPlanter, { kind: 'planter', respawnSec: 240, hits: 1 }],
  [Tile.ElvenMirror, { kind: 'mirror', respawnSec: 240, hits: 1 }],
  [Tile.ElvenWaystone, { kind: 'waystone', respawnSec: 600, hits: 4 }],
  [Tile.ElvenChimes, { kind: 'chimes', respawnSec: 240, hits: 1 }],
  // The imbued works: old magic stands long, wild crystal cracks in
  // two, and a floating book comes down with one good swat.
  [Tile.Runestone, { kind: 'runestone', respawnSec: 600, hits: 4 }],
  [Tile.CrystalCluster, { kind: 'crystals', respawnSec: 420, hits: 2 }],
  [Tile.WardArch, { kind: 'wardarch', respawnSec: 600, hits: 4 }],
  [Tile.ArcaneTome, { kind: 'tome', respawnSec: 240, hits: 1 }],
  [Tile.RunePillar, { kind: 'runepillar', respawnSec: 600, hits: 3 }],
  // THE CLIPPED GREEN: the showpieces burst in leaves. The hedge WALL
  // is deliberately NOT here — like the fence it is player-built
  // garden architecture that comes down by the demolish lane, never
  // by a passing club; and the arch is the door law's, not ours.
  [Tile.TopiaryBall, { kind: 'topiary', respawnSec: 420, hits: 2 }],
  [Tile.TopiarySpire, { kind: 'topiary', respawnSec: 420, hits: 2 }],
  // THE LONG DARK FURNISHED: rot pops in one blow, joined iron and
  // worked stone hold three or four. The wall fixtures are NOT here —
  // a sconce is bolted into the mountain and a chain shrugs off a
  // club — and the grand pillar never breaks: it holds the roof up
  // (the bonfire law, carried into stone).
  [Tile.MossBarrel, { kind: 'mossbarrel', respawnSec: 300, hits: 1 }],
  [Tile.MineCart, { kind: 'minecart', respawnSec: 600, hits: 3 }],
  [Tile.ChainedSkeleton, { kind: 'chainedbones', respawnSec: 600, hits: 1 }],
  [Tile.Sarcophagus, { kind: 'sarcophagus', respawnSec: 600, hits: 4 }],
  [Tile.BrokenPillar, { kind: 'brokenpillar', respawnSec: 600, hits: 3 }],
  [Tile.BurialUrns, { kind: 'urns', respawnSec: 300, hits: 1 }],
  [Tile.AncientStatue, { kind: 'oldstatue', respawnSec: 600, hits: 4 }],
  // THE LONG DARK PEOPLED: joined timber holds a beat, everything a
  // delver left pops in one. The mine brace is NOT here — it holds
  // the roof, same law as the grand pillar — and the fossil, the
  // webs, the pool, and the grate belong to the mountain itself.
  [Tile.GibbetCage, { kind: 'gibbet', respawnSec: 600, hits: 2 }],
  [Tile.Stocks, { kind: 'stocks', respawnSec: 600, hits: 2 }],
  [Tile.ColdCamp, { kind: 'coldcamp', respawnSec: 300, hits: 1 }],
  [Tile.LootedChest, { kind: 'lootchest', respawnSec: 300, hits: 1 }],
  [Tile.CandleShrine, { kind: 'candles', respawnSec: 300, hits: 1 }],
  // THE BANKS GET THEIR GOODS: lashed bank-stuff pops in a blow, the
  // hollowed hull and joined bone hold a few. The TideAltar is NOT
  // here — the tide keeps its own (the bonfire law reaching the
  // water), and the ribs at 4 are the kit's hardest bones.
  [Tile.FishRack, { kind: 'fishrack', respawnSec: 300, hits: 1 }],
  [Tile.TideTotem, { kind: 'tidetotem', respawnSec: 600, hits: 3 }],
  [Tile.NetFrame, { kind: 'net', respawnSec: 300, hits: 1 }],
  [Tile.Dugout, { kind: 'dugout', respawnSec: 600, hits: 3 }],
  [Tile.HarpoonRack, { kind: 'harpoons', respawnSec: 300, hits: 2 }],
  [Tile.ShellMidden, { kind: 'midden', respawnSec: 300, hits: 1 }],
  [Tile.FishTrap, { kind: 'fishtrap', respawnSec: 300, hits: 1 }],
  [Tile.RoeNest, { kind: 'roe', respawnSec: 300, hits: 1 }],
  [Tile.LurePole, { kind: 'lure', respawnSec: 600, hits: 2 }],
  [Tile.CatchBasket, { kind: 'catch', respawnSec: 300, hits: 1 }],
  [Tile.WhaleRibs, { kind: 'greatribs', respawnSec: 600, hits: 4 }],
  // THE CRAFTSMEN OF THE BANKS: woven walls and worked joinery hold a
  // blow or three; lashed lines, heaps, and crusts pop in one.
  [Tile.ReedShelter, { kind: 'shelter', respawnSec: 600, hits: 3 }],
  [Tile.SmokeTripod, { kind: 'smoker', respawnSec: 300, hits: 1 }],
  [Tile.MendingBench, { kind: 'mendbench', respawnSec: 300, hits: 2 }],
  [Tile.WeirPanels, { kind: 'weir', respawnSec: 300, hits: 2 }],
  [Tile.KelpLine, { kind: 'kelpline', respawnSec: 300, hits: 1 }],
  [Tile.SaltPan, { kind: 'saltpan', respawnSec: 300, hits: 1 }],
  [Tile.ShellBench, { kind: 'shellbench', respawnSec: 300, hits: 2 }],
  [Tile.WithyStore, { kind: 'withies', respawnSec: 300, hits: 1 }],
  [Tile.KeepPool, { kind: 'keeppool', respawnSec: 300, hits: 1 }],
  [Tile.TideChimes, { kind: 'shellchimes', respawnSec: 300, hits: 1 }],
  // THE TOWN KEEPS ITS DAY: street timber holds a blow or two,
  // civic masonry and bronze hold three or four — and a town REPAIRS
  // (the civic pieces restand on the long clock, the small stuff on
  // the short one). Everything here breaks: a kept town is a town
  // somebody can wreck, and that is what the watch is for.
  [Tile.TownFountain, { kind: 'townfountain', respawnSec: 600, hits: 4 }],
  [Tile.FounderStatue, { kind: 'founder', respawnSec: 600, hits: 4 }],
  [Tile.NoticeBoard, { kind: 'notices', respawnSec: 300, hits: 2 }],
  [Tile.TownBell, { kind: 'townbell', respawnSec: 600, hits: 3 }],
  [Tile.HandCart, { kind: 'handcart', respawnSec: 300, hits: 2 }],
  [Tile.GrainSacks, { kind: 'grainsacks', respawnSec: 300, hits: 1 }],
  [Tile.BarrelStack, { kind: 'barrelstack', respawnSec: 300, hits: 2 }],
  [Tile.CrateStack, { kind: 'cratestack', respawnSec: 300, hits: 2 }],
  [Tile.PennantLine, { kind: 'pennantline', respawnSec: 300, hits: 1 }],
  [Tile.HitchingPost, { kind: 'hitchpost', respawnSec: 300, hits: 2 }],
  [Tile.Woodpile, { kind: 'woodpile', respawnSec: 300, hits: 1 }],
  [Tile.StreetPlanter, { kind: 'streetplanter', respawnSec: 300, hits: 1 }],
  [Tile.StoneBench, { kind: 'stonebench', respawnSec: 600, hits: 3 }],
  [Tile.ProduceStand, { kind: 'produce', respawnSec: 300, hits: 2 }],
  // THE TRADES KEEP SHOP: workshop timber holds a blow or two like
  // the street's; the oven is the yard's masonry and holds four.
  // A wrecked shop restocks on the short clock — trade goes on.
  [Tile.QuenchTrough, { kind: 'quench', respawnSec: 300, hits: 2 }],
  [Tile.Grindstone, { kind: 'grindstone', respawnSec: 300, hits: 2 }],
  [Tile.SmithBellows, { kind: 'bellows', respawnSec: 300, hits: 1 }],
  [Tile.IngotRack, { kind: 'ingots', respawnSec: 300, hits: 2 }],
  [Tile.LumberRack, { kind: 'lumber', respawnSec: 300, hits: 2 }],
  [Tile.DyeVats, { kind: 'dyevat', respawnSec: 300, hits: 2 }],
  [Tile.TailorsDummy, { kind: 'dressform', respawnSec: 300, hits: 1 }],
  [Tile.ClothBolts, { kind: 'clothbolts', respawnSec: 300, hits: 1 }],
  [Tile.BreadOven, { kind: 'breadoven', respawnSec: 600, hits: 4 }],
  [Tile.ButcherBlock, { kind: 'butcherblock', respawnSec: 300, hits: 2 }],
  [Tile.HerbRack, { kind: 'herbs', respawnSec: 300, hits: 1 }],
  [Tile.ShopShelf, { kind: 'shopshelf', respawnSec: 300, hits: 2 }],
  // THE SECOND SHIFT: street timber holds a blow or two; carved
  // limestone holds three; the kiln is this wave's masonry and
  // holds four on the long clock like the oven before it.
  [Tile.WallFountain, { kind: 'wallfountain', respawnSec: 600, hits: 3 }],
  [Tile.WaterCask, { kind: 'watercask', respawnSec: 300, hits: 2 }],
  [Tile.WaterTrough, { kind: 'watertrough', respawnSec: 300, hits: 2 }],
  [Tile.PottersWheel, { kind: 'potterswheel', respawnSec: 300, hits: 2 }],
  [Tile.PotteryKiln, { kind: 'kiln', respawnSec: 600, hits: 4 }],
  [Tile.ScribesDesk, { kind: 'scribedesk', respawnSec: 300, hits: 2 }],
  [Tile.CandleRack, { kind: 'candlerack', respawnSec: 300, hits: 1 }],
  [Tile.FletchersBench, { kind: 'fletcher', respawnSec: 300, hits: 2 }],
  [Tile.CobblersBench, { kind: 'cobbler', respawnSec: 300, hits: 1 }],
  [Tile.FishmongerSlab, { kind: 'fishslab', respawnSec: 300, hits: 2 }],
  [Tile.HangingScale, { kind: 'scales', respawnSec: 300, hits: 1 }],
  [Tile.DisplayTable, { kind: 'displaytable', respawnSec: 300, hits: 2 }],
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

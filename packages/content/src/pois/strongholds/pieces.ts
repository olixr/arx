import { Tile } from '@arx/shared';
import type { PrefabDef } from '../../maps/prefab.js';
import { sketch, skralLegend } from '../prefabs.js';

// THE WARREN AND THE LEGION reaches the ward shelf: the camps' life
// marks, shared by every piece that flies one (the marks collide with
// no existing piece char — checked piece by piece). 'c' is NOT here:
// it stays the global crate except where a piece deliberately deals
// the live larder instead.
const campExt: Record<string, number> = {
  E: Tile.RagNest,
  x: Tile.KnucklePit,
  J: Tile.BeastStake,
  u: Tile.GnawTrough,
  Y: Tile.TrophyStake,
  e: Tile.BossEffigy,
  w: Tile.PlunderCart,
};

/**
 * THE WARD-PIECE SHELF (docs/strongholds-plan.md Phase 1) — the
 * Foundry's building material: mid-size dressed sketches the
 * generator stamps into a stronghold's wards. One per idea, spoken
 * in the one sketch dialect (prefabs.ts legend, war-camp punctuation
 * included). Pieces are INTERNAL material — they live in content,
 * not the shared prefab library; the curated artifact is the layout
 * the generator assembles from them.
 *
 * Piece laws (the validator enforces them at layout scale):
 *  - boss pieces carry the ONE boss chest (Z); no other piece
 *    carries any chest — the cache is the last stand's.
 *  - every piece keeps walkable ground through it (knot anchors and
 *    the reachability flood both need footing).
 *  - '_' stays transparent: courtyard grass shows through, and the
 *    piece sits IN the stronghold instead of pasting a rectangle.
 */

export interface WardPiece {
  prefab: PrefabDef;
  /** Base chapter name — the generator prefixes a bearing ("the west tent rows"). */
  base: string;
  /** boss = the last stand; watch = gate-yard dressing; ward = everything else. */
  kind: 'ward' | 'boss' | 'watch';
  /**
   * Suggested muster for this piece (a pen wants its beasts, not
   * more spearmen). Absent = the family's own knot menu deals.
   */
  knots?: ReadonlyArray<{ npc: string; band: readonly [number, number]; minTier?: number }>;
}

const piece = (
  kind: WardPiece['kind'],
  id: string,
  base: string,
  rows: string[],
  knots?: WardPiece['knots'],
  legendExt?: Record<string, number>,
): WardPiece => ({
  prefab: sketch(id, base, rows, {}, undefined, legendExt),
  base,
  kind,
  ...(knots ? { knots } : {}),
});

/** Greenskin cluster (goblin, gnoll — the war-camp look). The tent
 *  rows sleep somebody outside the tents too (the rag nest is the
 *  tentless one's bed), and the yard keeps its dice. */
const gsTents = piece('ward', 'ward_gs_tents', 'tent rows', [
  '____________',
  '_^__^__^____',
  '_:::::::::__',
  '_:E.f..)::__',
  '_^::::::::__',
  '_:::-:::`:__',
  '__:::x:E::__',
  '____________',
], undefined, campExt);

// The cook yard's crate is dealt as the LIVE larder — a greenskin
// kitchen keeps its stock squirming, goblin and gnoll alike.
const gsCookyard = piece('ward', 'ward_gs_cookyard', 'cook yard', [
  '__________',
  '__:::::___',
  '_::{:-::__',
  '_:a::::)__',
  '_::.f.::__',
  '__:c:::___',
  '__________',
], undefined, { c: Tile.CritterCage });

const gsTotem = piece('ward', 'ward_gs_totem', 'totem court', [
  '__________',
  '__0:::0___',
  '_::::::,__',
  '_:.?.::,__',
  '_:::::>___',
  '_:0::::,__',
  '__,::0____',
  '__________',
]);

// The pens keep a keeper's furniture now: the chain stake the worgs
// strain against, the slopped trough at the fence line.
const gsPens = piece(
  'ward',
  'ward_gs_pens',
  'beast pens',
  [
    '____________',
    '_F;F:F;F____',
    '_F..J..F:___',
    '_F;...;F:___',
    '_FF.FF.F:___',
    '_:::::::[___',
    '__:0:u:::___',
    '____________',
  ],
  [{ npc: 'worg', band: [1, 2] }],
  campExt,
);

// The muster's brag: stolen kit nailed where the drill can see it.
const gsMuster = piece('ward', 'ward_gs_muster', 'muster yard', [
  '___________',
  '_(::::(____',
  '_:::::::]__',
  '_:.:.::K___',
  '_]:::Y:::__',
  '__(:::,____',
  '___________',
], undefined, campExt);

const gsWatch = piece('watch', 'ward_gs_watch', 'gate yard', [
  '_________',
  '_]:::!___',
  '_::::::0_',
  '_:!::>:__',
  '__::::___',
  '_________',
]);

// The court parks its takings where the boss can watch them.
const gsBossCourt = piece('boss', 'ward_gs_bosscourt', 'moot court', [
  '______________',
  '__>::::::>____',
  '_::::m:::::___',
  '_::::::w::,___',
  '_:$:."::Z:____',
  '_::::@:::::___',
  '_:0::::::]:___',
  '_::::::::::___',
  '__>::::>______',
  '______________',
], undefined, campExt);

/**
 * The brag yard — GOBLIN ONLY (a gnoll fort mocks nobody but its
 * meal): the warren's social court. The boss's effigy holds the
 * heart, trophy stakes flank the walk in, and everything a goblin
 * does when nobody makes it work — dice, grog, a stolen bed —
 * happens in the effigy's painted stare.
 */
const gsBragyard = piece('ward', 'ward_gs_bragyard', 'brag yard', [
  '_____________',
  '__Y:::::Y____',
  '_::::e:::,___',
  '_:x::::a::___',
  '_::::::::,___',
  '_:E:::0::____',
  '__,:::,______',
  '_____________',
], undefined, { ...campExt, a: Tile.GrogTub });

/** Brigand cluster. */
// Brigands are human raiders: real barrels, real crates — but the
// dice come out at the fire like anywhere the pay is stolen.
const brTents = piece('ward', 'ward_br_tents', 'tent rows', [
  '____________',
  '_^__^__^____',
  '_::::::::a__',
  '_:..f..:c___',
  '_:::::::a___',
  '_^::::^:____',
  '__::x:::____',
  '____________',
], undefined, campExt);

// The plunder yard keeps the cart the takings came in on.
const brStores = piece('ward', 'ward_br_stores', 'plunder yard', [
  '__________',
  '__$:a:c___',
  '_:G::::a__',
  '_:::$:w:__',
  '_:c::G:$__',
  '__a:::____',
  '__________',
], undefined, campExt);

const brPen = piece('ward', 'ward_br_pen', 'cage yard', [
  '___________',
  '_F:F:F:F___',
  '_F.....F___',
  '_F.[...F___',
  '_FF.FFFF___',
  '_::::::[___',
  '___________',
]);

const brWatch = piece('watch', 'ward_br_watch', 'gate yard', [
  '_________',
  '_!:::<___',
  '_::::::__',
  '_:<:!::__',
  '__:::<___',
  '_________',
]);

// The captain's court nails its brag by the door — the toll's
// warning, wearing somebody's split shield.
const brBossCourt = piece('boss', 'ward_br_bosscourt', "captain's court", [
  '_____________',
  '__>:::::>____',
  '_:::m:::::___',
  '_::::::::k___',
  '_:$:."::Z:___',
  '_::::f::::___',
  '_:a:::Y:::___',
  '__>::::>_____',
  '_____________',
], undefined, campExt);

/** Wolfkin cluster (dens, bones — no fires; beasts keep no flame). */
const wkNests = piece('ward', 'ward_wk_nests', 'den hollows', [
  '____________',
  '_;__;__;____',
  '_,::::::::__',
  '_:.;..;.,___',
  '_,::::::::__',
  '_;:::;::o___',
  '__,:::,:____',
  '____________',
]);

const wkBonefield = piece('watch', 'ward_wk_bonefield', 'bone field', [
  '__________',
  '__o:0:o___',
  '_,:::::o__',
  '_:o:0::,__',
  '_::::o::__',
  '__o:,:0___',
  '__________',
]);

const wkRacks = piece('ward', 'ward_wk_racks', 'kill larder', [
  '__________',
  '_)::`:)___',
  '_:::::::__',
  '_:o:::o___',
  '_:::)::`__',
  '__::::____',
  '__________',
]);

const wkDenheart = piece('boss', 'ward_wk_denheart', 'den heart', [
  '_____________',
  '__o:0:::o____',
  '_,:;:::;:,___',
  '_::::Z::::___',
  '_:;::;::;:___',
  '_::::::::,___',
  '_:o:;::0::___',
  '__,:::,o_____',
  '_____________',
]);

/** Dead cluster (barrow-courts — old stone, cold braziers). */
const ddStones = piece('ward', 'ward_dd_stones', 'standing stones', [
  '___________',
  '__P:::P____',
  '_:::::::,__',
  '_:P:::P:___',
  '_::::b::,__',
  '_:P:::P:___',
  '__,:::,____',
  '___________',
]);

const ddGraves = piece('watch', 'ward_dd_graves', 'grave rows', [
  '__________',
  '_o:R:o____',
  '_:::::R___',
  '_R:o:::o__',
  '_:::R:::__',
  '__o::R____',
  '__________',
]);

const ddShrine = piece('ward', 'ward_dd_shrine', 'fallen shrine', [
  '_________',
  '__Q:b____',
  '_:::::R__',
  '_:b:Q::__',
  '__:::____',
  '_________',
]);

const ddCourt = piece('boss', 'ward_dd_court', 'barrow court', [
  '_____________',
  '__P::b::P____',
  '_:::::::::___',
  '_:b::Z::b:___',
  '_::::S::::___',
  '_:P::b::P:___',
  '_:::::::::___',
  '__P:::::P____',
  '_____________',
]);

/**
 * THE LARGE SHELF (Second Charter, THE BREATHING LAW) — neighborhood-
 * scale pieces (15-18 wide) whose hearts are open ground: a big ward
 * reads as a place you walk through, not a stamp. Content clusters at
 * the rim; the middle breathes.
 */
// The great ring gambles at its own fire — the pit sits between
// the drum and the flame, where the arguments are loudest.
const gsGreatring = piece('ward', 'ward_gs_greatring', 'great tent ring', [
  '__________________',
  '__^___^___^___^___',
  '_::::::::::::::,__',
  '_:.....,......::__',
  '_^:.::::::::::.^__',
  '_::.::":x:f::.,:__',
  '_^:.::::::::::.^__',
  '_:.............::_',
  '_::::::::::::::,__',
  '__^___^___^___^___',
  '__,____.____,_____',
  '__________________',
], undefined, campExt);

const gsDrillyard = piece('ward', 'ward_gs_drillyard', 'drill yard', [
  '________________',
  '_(::::(:::::]___',
  '_::::::::::::,__',
  '_:.:.:.::.:.:___',
  '_]::::::::::(___',
  '_:.:.:.::.:.,___',
  '_::::::::::::___',
  '_(::::(:::::]___',
  '_,____,_________',
  '________________',
]);

// The twin pens split the keeper's kit: the stake in the west pen
// (the worg that pulls), the trough on the ground between.
const gsTwinpens = piece(
  'ward',
  'ward_gs_twinpens',
  'twin pens',
  [
    '__________________',
    '_F;F:FF__FF:F;F___',
    '_F..J..F_F.....F__',
    '_F;...;F_F..;..F__',
    '_F..F.FF_FF.F..F__',
    '_F....F___F....F__',
    '_FF.FF:___:FF.FF__',
    '_::::::,_,::::::__',
    '__:0::u::::::[:___',
    '___,____,_____,___',
    '__________________',
  ],
  [
    { npc: 'worg', band: [1, 2] },
    { npc: 'worg', band: [1, 2] },
  ],
  campExt,
);

// The wagon yard finally PARKS ITS WAGONS: two stolen carts on the
// worn center ground the stores were always stacked around.
const brWagonyard = piece('ward', 'ward_br_wagonyard', 'wagon yard', [
  '_________________',
  '__a:c::::::c:a___',
  '_::::::::::::::__',
  '_:c$::.w....::$:_',
  '_::::.:....,::::_',
  '_:G:::......::G:_',
  '_::::,...w.::::,_',
  '_:$::::::::::c:__',
  '__a::c::c:::a____',
  '___,_____,_______',
  '_________________',
], undefined, campExt);

const brSparring = piece('ward', 'ward_br_sparring', 'sparring yard', [
  '_______________',
  '_(::::::::(____',
  '_:::.....:::,__',
  '_:K:.....:]:___',
  '_::::::::::::__',
  '_:]:.....:K:___',
  '_:::,....:::___',
  '_(::::::::(____',
  '__,_____,______',
  '_______________',
]);

const wkHollowfield = piece('ward', 'ward_wk_hollowfield', 'hollow field', [
  '__________________',
  '__;____,____;_____',
  '_,:::::::::::,____',
  '_::.;......;.::___',
  '_:...,..o......,__',
  '_;:.....;.....:;__',
  '_::..o......o.::__',
  '_:,......;....::__',
  '__:::;::::::;::___',
  '___,____o____,____',
  '__________________',
]);

const wkGreatboneyard = piece('ward', 'ward_wk_greatboneyard', 'great boneyard', [
  '________________',
  '__o::0:::o:0____',
  '_,::::::::::o___',
  '_:0:..o...::0___',
  '_::..0..o..:,___',
  '_:o:..o..0.::___',
  '_::::::::::o____',
  '__0:o::0::,_____',
  '___,___o________',
  '________________',
]);

const ddProcessional = piece('ward', 'ward_dd_processional', 'processional way', [
  '_________________',
  '__P::b::::b::P___',
  '_:SSSSSSSSSSSS:__',
  '_:S..........S:__',
  '_:SSSSSSSSSSSS:__',
  '__P::b::::b::P___',
  '___,________,____',
  '_________________',
]);

const ddCairnfield = piece('ward', 'ward_dd_cairnfield', 'cairn field', [
  '__________________',
  '__r:o:R::r::o_____',
  '_,::::::::::::r___',
  '_:R:..r...o..:::__',
  '_::..o..R...:R,___',
  '_:r:..:..o..::____',
  '_::::R::::::r:____',
  '__o::r::R::o::____',
  '___,_____,________',
  '__________________',
]);

/**
 * THE MANY BANNERS (Third Charter) — themed pieces so a family deals
 * different HOLDS, not different seeds: the dead keep proper grave
 * rows, the wolfkin keep warg pens, the goblins keep a tent city.
 */
const ddGravefield = piece('ward', 'ward_dd_gravefield', 'grave rows', [
  '__________________',
  '__P::R:R:R:R::P___',
  '_:,.R,R.R,R.R,:___',
  '_::::::::::::::,__',
  '_:,R.R,R.R,R.,:___',
  '_:::::::::::::,___',
  '_:,R.R,R.R,R.::___',
  '_::::::::::::::___',
  '__P::b::::b::P____',
  '___,____,_________',
  '__________________',
]);

const wkWargpens = piece(
  'ward',
  'ward_wk_wargpens',
  'warg pens',
  [
    '__________________',
    '_F;F:F;F:_F;F:F___',
    '_F......F_F....F__',
    '_F.;..;.F_F.;..F__',
    '_F......F_F....F__',
    '_FF..FF.F_FF.FFF__',
    '_:::::::,_,::::,__',
    '_,:o::::::::0::___',
    '__::;:::`:::::____',
    '___,___o_____,____',
    '__________________',
    '__________________',
  ],
  [
    { npc: 'worg', band: [1, 2] },
    { npc: 'worg', band: [1, 2] },
    { npc: 'wolf', band: [2, 3] },
  ],
);

const gsWartents = piece('ward', 'ward_gs_wartents', 'war tents', [
  '_________________',
  '_^_m_^__^_m_^____',
  '_:::::::::::::,__',
  '_:.....,......:__',
  '_^:::"::::f:::m__',
  '_:............:__',
  '_:::::::::::::,__',
  '_^_m_^__^_m_^____',
  '__,____.____,____',
  '_________________',
  '_________________',
]);

/**
 * Skral cluster (docs/skral-decor-plan.md) — THE GREAT WEIR's
 * material, spoken through the skral legend: FOUND, NEVER FELLED.
 * The shoal's capital is a working waterside — dug pools, drying
 * yards, net lines, the ancestors' bones — inside the swallowed
 * kingdom's wave-worn stone.
 */
const skPools = piece(
  'ward',
  'ward_sk_pools',
  'spawning pools',
  [
    '________________',
    '__,::::::::,____',
    '_:.0~~..~~0.:___',
    '_:.~~~..~~~.,___',
    '_:0..!.O....0___',
    '_:.~~~..~~~.:___',
    '_:.0~~..~~0.,___',
    '__,::::::::,____',
    '________________',
  ],
  [{ npc: 'skral', band: [2, 3] }],
  skralLegend,
);

const skRacks = piece(
  'ward',
  'ward_sk_racks',
  'drying yard',
  [
    '_______________',
    '_)::):::)::)___',
    '_::::::::::::__',
    '_:-..?f.h.-:,__',
    '_:::k::::::::__',
    '_)::):::)::)___',
    '__,____,_______',
    '_______________',
  ],
  undefined,
  skralLegend,
);

const skMiddens = piece(
  'ward',
  'ward_sk_middens',
  'shell middens',
  [
    '________________',
    '__o::{:::o::____',
    '_,::::::::::o___',
    '_:o:..o...::{___',
    '_::.?o..-.w:,___',
    '_:{:..:..o.::___',
    '_::::o:::::o____',
    '__o::{::o::_____',
    '________________',
  ],
  undefined,
  skralLegend,
);

const skNetyard = piece(
  'ward',
  'ward_sk_netyard',
  'net lines',
  [
    '________________',
    '_`::`:::`::`____',
    '_::::::::::::,__',
    '_:{....b......__',
    '_::::::::::::,__',
    '_`::{:!:-::`____',
    '__,____,________',
    '________________',
  ],
  undefined,
  skralLegend,
);

const skWrecks = piece(
  'ward',
  'ward_sk_wrecks',
  'beached hulls',
  [
    '_________________',
    '__^____^____,____',
    '_,::::::::::::___',
    '_:...-....o..:,__',
    '_^:...^....-.:___',
    '_:...........,___',
    '_::::::`:::::A___',
    '__,____o____,____',
    '_________________',
  ],
  undefined,
  skralLegend,
);

const skTotems = piece(
  'ward',
  'ward_sk_totems',
  'totem way',
  [
    '_________________',
    '__?::!::::!::?___',
    '_::::::::::::::__',
    '_:."....x....".:_',
    '_::::::::::::::__',
    '__?::!::::!::?___',
    '___,________,____',
    '_________________',
  ],
  undefined,
  skralLegend,
);

const skWatch = piece(
  'watch',
  'ward_sk_watch',
  'harpoon yard',
  [
    '__________',
    '__>:!:>___',
    '_,:::::o__',
    '_:>:o::,__',
    '_::::-::__',
    '__o:,:>___',
    '__________',
  ],
  undefined,
  skralLegend,
);

const skKingspool = piece(
  'boss',
  'ward_sk_kingspool',
  "deepking's pool",
  [
    '_____________',
    '__".?:::?."__',
    '_:::~~~~~:::_',
    '_:!:~~~~~:&:_',
    '_:::~~~~~Z::_',
    '_:0:~~~~~:):_',
    '_:::~~~~~:::_',
    '__".?:::?."__',
    '_____________',
  ],
  undefined,
  skralLegend,
);

// THE CRAFTSMEN'S WARDS (docs/skral-decor-plan.md — the drowned
// villages): the working shelf reaches the capital, so no two Great
// Weirs deal the same districts. Same voice: FOUND, NEVER FELLED.
const skSaltgarth = piece(
  'ward',
  'ward_sk_saltgarth',
  'salt garth',
  [
    '_______________',
    '_s::s:::s::s___',
    '_::::::::::::__',
    '_:w..!.-..w:,__',
    '_::::::::::::__',
    '_s::s:::s::s___',
    '__,____,_______',
    '_______________',
  ],
  undefined,
  skralLegend,
);

const skMenders = piece(
  'ward',
  'ward_sk_menders',
  'mending row',
  [
    '________________',
    '_`::`:::`::`____',
    '_::::::::::::,__',
    '_:b...e...b..:__',
    '_:..?.-....w.:__',
    '_::::::::::::,__',
    '__,____,________',
    '________________',
  ],
  undefined,
  skralLegend,
);

const skShelters = piece(
  'ward',
  'ward_sk_shelters',
  'shelter row',
  [
    '_________________',
    '__A::x::A:::A____',
    '_,::::::::::::,__',
    '_:.f...h....-.:__',
    '_,::::::::::::,__',
    '__A::x:::A::,____',
    '___,________,____',
    '_________________',
  ],
  [{ npc: 'skral', band: [2, 3] }],
  skralLegend,
);

const skChimeway = piece(
  'ward',
  'ward_sk_chimeway',
  'chime way',
  [
    '________________',
    '__x::e::::e::x__',
    '_::::::::::::,__',
    '_:.O...x...O.:__',
    '_::::::::::::,__',
    '__x::!::::e::x__',
    '___,________,___',
    '________________',
  ],
  undefined,
  skralLegend,
);

/** Every piece, by id — the Foundry's shelf. */
export const WARD_PIECES: ReadonlyMap<string, WardPiece> = new Map(
  [
    gsTents,
    gsCookyard,
    gsTotem,
    gsPens,
    gsMuster,
    gsWatch,
    gsBossCourt,
    brTents,
    brStores,
    brPen,
    brWatch,
    brBossCourt,
    wkNests,
    wkBonefield,
    wkRacks,
    wkDenheart,
    ddStones,
    ddGraves,
    ddShrine,
    ddCourt,
    gsGreatring,
    gsDrillyard,
    gsTwinpens,
    gsBragyard,
    brWagonyard,
    brSparring,
    wkHollowfield,
    wkGreatboneyard,
    ddProcessional,
    ddCairnfield,
    ddGravefield,
    wkWargpens,
    gsWartents,
    skPools,
    skRacks,
    skMiddens,
    skNetyard,
    skWrecks,
    skTotems,
    skWatch,
    skKingspool,
    skSaltgarth,
    skMenders,
    skShelters,
    skChimeway,
  ].map((p) => [p.prefab.id, p]),
);

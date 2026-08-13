import type { PrefabDef } from '../../maps/prefab.js';
import { sketch } from '../prefabs.js';

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
): WardPiece => ({
  prefab: sketch(id, base, rows),
  base,
  kind,
  ...(knots ? { knots } : {}),
});

/** Greenskin cluster (goblin, gnoll — the war-camp look). */
const gsTents = piece('ward', 'ward_gs_tents', 'tent rows', [
  '____________',
  '_^__^__^____',
  '_:::::::::__',
  '_:..f..)::__',
  '_^::::::::__',
  '_:::-:::`:__',
  '__::::::::__',
  '____________',
]);

const gsCookyard = piece('ward', 'ward_gs_cookyard', 'cook yard', [
  '__________',
  '__:::::___',
  '_::{:-::__',
  '_:a::::)__',
  '_::.f.::__',
  '__:c:::___',
  '__________',
]);

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

const gsPens = piece(
  'ward',
  'ward_gs_pens',
  'beast pens',
  [
    '____________',
    '_F;F:F;F____',
    '_F.....F:___',
    '_F;...;F:___',
    '_FF.FF.F:___',
    '_:::::::[___',
    '__:0:::::___',
    '____________',
  ],
  [{ npc: 'worg', band: [1, 2] }],
);

const gsMuster = piece('ward', 'ward_gs_muster', 'muster yard', [
  '___________',
  '_(::::(____',
  '_:::::::]__',
  '_:.:.::K___',
  '_]:::::::__',
  '__(:::,____',
  '___________',
]);

const gsWatch = piece('watch', 'ward_gs_watch', 'gate yard', [
  '_________',
  '_]:::!___',
  '_::::::0_',
  '_:!::>:__',
  '__::::___',
  '_________',
]);

const gsBossCourt = piece('boss', 'ward_gs_bosscourt', 'moot court', [
  '______________',
  '__>::::::>____',
  '_::::m:::::___',
  '_:::::::::,___',
  '_:$:."::Z:____',
  '_::::@:::::___',
  '_:0::::::]:___',
  '_::::::::::___',
  '__>::::>______',
  '______________',
]);

/** Brigand cluster. */
const brTents = piece('ward', 'ward_br_tents', 'tent rows', [
  '____________',
  '_^__^__^____',
  '_::::::::a__',
  '_:..f..:c___',
  '_:::::::a___',
  '_^::::^:____',
  '__::::::____',
  '____________',
]);

const brStores = piece('ward', 'ward_br_stores', 'plunder yard', [
  '__________',
  '__$:a:c___',
  '_:G::::a__',
  '_:::$:::__',
  '_:c::G:$__',
  '__a:::____',
  '__________',
]);

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

const brBossCourt = piece('boss', 'ward_br_bosscourt', "captain's court", [
  '_____________',
  '__>:::::>____',
  '_:::m:::::___',
  '_::::::::k___',
  '_:$:."::Z:___',
  '_::::f::::___',
  '_:a:::::::___',
  '__>::::>_____',
  '_____________',
]);

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
  ].map((p) => [p.prefab.id, p]),
);

import { Detail, Tile } from '@devcraft/shared';
import { compileTemplate } from './stamp.js';
import type { CellDef, StructureTemplate } from './types.js';

/**
 * The starter building stock. Every template here is compiled at module
 * load so a ragged row or a mid-wall doorway fails the content tests,
 * not a player's town.
 *
 * Authoring laws baked into these:
 * - Doorways sit on the entry face, windows flank them.
 * - Furniture is placed for daily-life readability: chairs touch the
 *   table they face (the renderer turns a chair's back away from an
 *   adjacent table), beds hug walls, rugs mark room centres, doormats
 *   sit on the floor cell just inside the door (outside the footprint
 *   is not ours to stamp).
 * - Multi-tile furniture is authored as runs of the same tile — the
 *   connected-render law merges adjacent Tables, E-W Benches, Counter
 *   runs, N-S Bed pairs (one full-length bed, proportioned to the
 *   1.15-tile body), and 2-wide MarketStalls into single pieces.
 */

/**
 * Shared wood-building shell chars: walls, windows, doorway, floors.
 * '=' is the WIDE doorway — author it in runs ('==') and the renderer
 * merges the run into one full-width opening. 'D' is a single door
 * and never merges: 'DD' means two individual doors with a divider.
 */
const wood: Record<string, CellDef> = {
  '#': { tile: Tile.WallWood },
  W: { tile: Tile.WallWoodWindow },
  D: { tile: Tile.DoorwayWood },
  '=': { tile: Tile.DoorwayWoodWide },
  '.': { tile: Tile.WoodFloor },
  d: { tile: Tile.WoodFloor, detail: Detail.Doormat },
  r: { tile: Tile.WoodFloor, detail: Detail.Rug },
};

/** Shared stone-building shell chars. */
const stone: Record<string, CellDef> = {
  '#': { tile: Tile.WallStone },
  W: { tile: Tile.WallStoneWindow },
  D: { tile: Tile.DoorwayStone },
  '=': { tile: Tile.DoorwayStoneWide },
  '.': { tile: Tile.StoneFloor },
  d: { tile: Tile.StoneFloor, detail: Detail.Doormat },
  r: { tile: Tile.StoneFloor, detail: Detail.Rug },
};

/** A one-room home: bed in the corner, a table setting, rug centre. */
export const COTTAGE_SMALL: StructureTemplate = compileTemplate({
  id: 'cottage_small',
  legend: {
    ...wood,
    B: { tile: Tile.Bed },
    A: { tile: Tile.Cabinet },
    T: { tile: Tile.Table },
    C: { tile: Tile.Chair },
  },
  rows: [
    '##W#W##',
    '#B...A#',
    '#Br.TC#',
    '#.r...#',
    '#..d..#',
    '##WDW##',
  ],
  meta: { label: 'Small Cottage' },
});

/** A family home: two beds, a north-wall hearth, ledger shelf. */
export const COTTAGE_LARGE: StructureTemplate = compileTemplate({
  id: 'cottage_large',
  legend: {
    ...wood,
    B: { tile: Tile.Bed },
    H: { tile: Tile.Hearth },
    S: { tile: Tile.Bookshelf },
  },
  rows: [
    '##W###W##',
    '#B..H..B#',
    'WB.....BW',
    '#..rr..S#',
    '#..rr...#',
    '#.......#',
    '#...d...#',
    '###WDW###',
  ],
  meta: { label: 'Large Cottage' },
});

/**
 * A working forge: the north side is a 2-wide open workshop entry
 * (one wide doorway), sawdust tracked across the floor from the racks.
 */
export const SMITHY: StructureTemplate = compileTemplate({
  id: 'smithy',
  legend: {
    ...stone,
    F: { tile: Tile.Furnace },
    A: { tile: Tile.Anvil },
    T: { tile: Tile.ToolRack },
    b: { tile: Tile.Basin },
    o: { tile: Tile.Barrel },
    s: { tile: Tile.StoneFloor, detail: Detail.Sawdust },
  },
  rows: [
    '###==####',
    '#T.s...o#',
    '#F.sA...#',
    '#..s...b#',
    '#.s.....#',
    '#.......#',
    '##W###W##',
  ],
  meta: { label: 'Smithy' },
});

/** A shopfront: west door, 3-run counter, stock shelves, goods by the door. */
export const SHOP_SMALL: StructureTemplate = compileTemplate({
  id: 'shop_small',
  legend: {
    ...wood,
    K: { tile: Tile.Bookshelf },
    A: { tile: Tile.Cabinet },
    C: { tile: Tile.Counter },
    g: { tile: Tile.CrateGoods },
  },
  rows: [
    '###W##W###',
    '#KA.KA...#',
    'W........W',
    '#..CCC...#',
    'Dd.......#',
    '#g.......#',
    '#........#',
    '###W##W###',
  ],
  meta: { label: 'Small Shop' },
});

/**
 * An open-air stall: 2-wide canopy run (merges into one canopy) with
 * goods and a barrel on stone. No walls — tileable side by side.
 */
export const MARKET_STALL: StructureTemplate = compileTemplate({
  id: 'market_stall',
  legend: {
    '.': { tile: Tile.StoneFloor },
    M: { tile: Tile.MarketStall },
    g: { tile: Tile.CrateGoods },
    o: { tile: Tile.Barrel },
  },
  rows: [
    'MMg',
    '...',
    '..o',
  ],
  meta: { label: 'Market Stall' },
});

/**
 * The big common house: a wide double door on the north road, west-
 * wall hearth, four table clusters, a 4-run bar in the south, three
 * beds at the east end.
 */
export const INN_LARGE: StructureTemplate = compileTemplate({
  id: 'inn_large',
  legend: {
    ...wood,
    H: { tile: Tile.Hearth },
    T: { tile: Tile.Table },
    C: { tile: Tile.Chair },
    U: { tile: Tile.Counter },
    B: { tile: Tile.Bed },
  },
  rows: [
    '###W##==##W###',
    '#.....dd.....#',
    '#H..........B#',
    '#..TC....TC..#',
    '#...........B#',
    'W.....rr.....W',
    '#..TC.rr.TC.B#',
    '#............#',
    'W............W',
    '#..UUUU......#',
    '#............#',
    '###W####W#####',
  ],
  meta: { label: 'Inn' },
});

/**
 * A nave: wide south entry, two columns of 2-wide pews (E-W bench
 * runs merge into full pews) with a centre aisle to the lectern and
 * round rug, windows down both long sides.
 */
export const CHAPEL: StructureTemplate = compileTemplate({
  id: 'chapel',
  legend: {
    ...stone,
    P: { tile: Tile.Bench },
    L: { tile: Tile.Lectern },
    q: { tile: Tile.StoneFloor, detail: Detail.RugRound },
  },
  rows: [
    '##W##W##',
    '#..L...#',
    '#..q...#',
    'W......W',
    '#PP..PP#',
    '#......#',
    'WPP..PPW',
    '#......#',
    '#PP..PP#',
    'W......W',
    '#..dd..#',
    '###==###',
  ],
  meta: { label: 'Chapel' },
});

/**
 * A walkway-edge segment: one pillar at the west end of the north row
 * so E-W tiling yields a pillar every 3 tiles without doubling.
 */
export const COLONNADE_SEG: StructureTemplate = compileTemplate({
  id: 'colonnade_seg',
  legend: {
    '.': { tile: Tile.StoneFloor },
    P: { tile: Tile.PillarStone },
  },
  rows: [
    'P..',
    '...',
  ],
  meta: { label: 'Colonnade' },
});

/**
 * A rounded plaza (space corners stay transparent) around a 2x2 stone
 * well, with a bench pair and lamps at two opposing corners.
 */
export const WELL_PLAZA: StructureTemplate = compileTemplate({
  id: 'well_plaza',
  legend: {
    '.': { tile: Tile.StoneFloor },
    '#': { tile: Tile.WallStone },
    L: { tile: Tile.LampPost },
    B: { tile: Tile.Bench },
  },
  rows: [
    '  ...  ',
    ' L.... ',
    '.......',
    '...##..',
    '...##..',
    ' .BB.L ',
    '  ...  ',
  ],
  meta: { label: 'Well Plaza' },
});

export const STRUCTURE_TEMPLATES: readonly StructureTemplate[] = [
  COTTAGE_SMALL,
  COTTAGE_LARGE,
  SMITHY,
  SHOP_SMALL,
  MARKET_STALL,
  INN_LARGE,
  CHAPEL,
  COLONNADE_SEG,
  WELL_PLAZA,
];

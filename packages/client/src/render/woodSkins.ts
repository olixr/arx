import { hashCoords } from '@arx/shared';

/**
 * A timber building is cut from ONE stand of trees: every log wall,
 * doorway, window, and floorboard of a building shares a wood skin —
 * wall tones (logs, limewash chinking, squared beams, trim), a floor
 * lumber order (its own tight tone family plus board length), and a
 * texture character. The character is what keeps variants from being
 * a recolor: pine is knotty and cut in SHORT boards, weathered spruce
 * is checked, split, and sun-bleached, walnut is calm and laid in
 * LONG prestige boards. Skins are dealt per BUILDING from its
 * interior-region anchor, so neighbouring houses come from different
 * forests while one house agrees wall-to-floor.
 */
export interface WoodSkin {
  /** Base log tone + whisper alternate — one lumber order. */
  log: string;
  log2: string;
  /** Limewash chinking packed between courses. */
  chink: string;
  /** Crown cap-beam top. */
  top: string;
  /** Squared sill and wall-plate beams. */
  plate: string;
  /** Doorway/window trim — two steps lighter law. */
  trim: string;
  /** Floorboard tone family — tight, one lumber order per house. */
  floorTones: readonly string[];
  /** Floorboard length in tiles — cut by the wood, not the builder. */
  boardLen: number;
  /** Board courses per tile — small trees yield narrow boards. */
  rowsPerTile: number;
  /** Texture character multipliers (knots / seasoning checks). */
  knotK: number;
  checkK: number;
}

export const WOOD_SKINS: readonly WoodSkin[] = [
  // Golden oak — the town default, warm and even-grained.
  {
    log: '#6d4a26', log2: '#674424', chink: '#a28e6b', top: '#8a6234',
    plate: '#7a562c', trim: '#96703c',
    floorTones: ['#a87e46', '#a37842', '#ad834a', '#9f7440'],
    boardLen: 3, rowsPerTile: 3, knotK: 1, checkK: 1,
  },
  // Honey pine — lighter, sappier, knotty lumber milled into NARROW boards.
  {
    log: '#85633a', log2: '#7e5d3a', chink: '#bcab86', top: '#a07946',
    plate: '#8f6b3a', trim: '#ad854e',
    floorTones: ['#b58f54', '#b08a50', '#bc9659', '#aa844b'],
    boardLen: 3, rowsPerTile: 4, knotK: 2.1, checkK: 0.7,
  },
  // Weathered spruce — grayed by rain, split, checked, sun-bleached.
  {
    log: '#6a5641', log2: '#644f3e', chink: '#9c8f78', top: '#7f6b52',
    plate: '#746046', trim: '#8a7458',
    floorTones: ['#94836a', '#8f7e66', '#9a8970', '#897861'],
    boardLen: 3, rowsPerTile: 3, knotK: 0.8, checkK: 2.2,
  },
  // Dark walnut — rich and calm, long clear boards, the prestige cut.
  {
    log: '#4e3118', log2: '#492f1a', chink: '#83704f', top: '#66431f',
    plate: '#5a3d1d', trim: '#7a5730',
    floorTones: ['#7c5a33', '#775630', '#82603a', '#71512e'],
    boardLen: 4, rowsPerTile: 3, knotK: 0.7, checkK: 0.8,
  },
];

/** Deal weights: oak and pine common, walnut the rare prize. */
const WOOD_DEAL = [0, 0, 0, 1, 1, 2, 2, 3] as const;

/**
 * The skin a building wears, dealt from its interior-region anchor.
 * No region (unenclosed player runs, freestanding floors) = oak; a
 * building takes on its wood the moment it is enclosed.
 */
export function dealWoodSkin(region: { x0: number; y0: number } | null): WoodSkin {
  if (!region) return WOOD_SKINS[0]!;
  const h = hashCoords(23, region.x0, region.y0);
  return WOOD_SKINS[WOOD_DEAL[h % 8]!]!;
}

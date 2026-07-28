import { Tile } from '@arx/shared';

/**
 * Farmable crops. A planted crop advances through three visual stages —
 * a shared sprout tile, then a per-crop mid and ripe tile. Stage is a
 * pure function of effective elapsed time (wall clock + watering boost),
 * so live ticks, offline catch-up, and dev /grow all share one formula.
 */
export interface CropDef {
  id: string;
  name: string;
  seedItem: string;
  midTile: Tile;
  matureTile: Tile;
  /** Total unwatered time from planting to ripe. */
  growMinutes: number;
  /** What harvesting yields. */
  yield: { item: string; min: number; max: number };
  /** Seeds returned on harvest — fields sustain themselves. */
  seedReturn: { min: number; max: number };
  levelReq: number;
  /** Farming XP on harvest. */
  xp: number;
}

/** Stage boundaries as fractions of growMinutes: sprout → mid → ripe. */
export const STAGE_ENDS = [0.25, 1] as const;

const defs: CropDef[] = [
  {
    id: 'carrot',
    name: 'Carrot',
    seedItem: 'carrot_seed',
    midTile: Tile.CarrotMid,
    matureTile: Tile.CarrotRipe,
    growMinutes: 8,
    yield: { item: 'carrot', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 1,
    xp: 8,
  },
  {
    id: 'sagewort',
    name: 'Sagewort',
    seedItem: 'sagewort_seed',
    midTile: Tile.SagewortMid,
    matureTile: Tile.SagewortRipe,
    growMinutes: 10,
    yield: { item: 'sagewort', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 5,
    xp: 12,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    seedItem: 'sunflower_seed',
    midTile: Tile.SunflowerMid,
    matureTile: Tile.SunflowerRipe,
    growMinutes: 12,
    yield: { item: 'sunflower', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 10,
    xp: 16,
  },
  {
    id: 'wheat',
    name: 'Wheat',
    seedItem: 'wheat_seed',
    midTile: Tile.WheatMid,
    matureTile: Tile.WheatRipe,
    growMinutes: 18,
    yield: { item: 'wheat', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 15,
    xp: 24,
  },
  {
    id: 'cotton',
    name: 'Cotton',
    seedItem: 'cotton_seed',
    midTile: Tile.CottonMid,
    matureTile: Tile.CottonRipe,
    growMinutes: 25,
    yield: { item: 'cotton', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 20,
    xp: 34,
  },
  {
    id: 'moonbell',
    name: 'Moonbell',
    seedItem: 'moonbell_seed',
    midTile: Tile.MoonbellMid,
    matureTile: Tile.MoonbellRipe,
    growMinutes: 40,
    yield: { item: 'moonbell', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 30,
    xp: 55,
  },
];

export const CROPS: ReadonlyMap<string, CropDef> = new Map(defs.map((d) => [d.id, d]));

export const CROP_BY_SEED: ReadonlyMap<string, CropDef> = new Map(
  defs.map((d) => [d.seedItem, d]),
);

/** Every crop-stage tile → which crop and stage it shows. Stage 0 (sprout) is shared. */
export const CROP_TILES: ReadonlyMap<Tile, { crop: CropDef; stage: 0 | 1 | 2 }> = new Map(
  defs.flatMap((d): Array<[Tile, { crop: CropDef; stage: 0 | 1 | 2 }]> => [
    [d.midTile, { crop: d, stage: 1 }],
    [d.matureTile, { crop: d, stage: 2 }],
  ]),
);

export const MATURE_TILES: ReadonlySet<Tile> = new Set(defs.map((d) => d.matureTile));

/** Is this ground a planted crop (any stage, including the shared sprout)? */
export function isCropTile(tile: Tile): boolean {
  return tile === Tile.CropSprout || CROP_TILES.has(tile);
}

export function growMs(def: CropDef): number {
  return def.growMinutes * 60_000;
}

/** When (in effective ms since planting) the given stage ends. Stage 2 never ends. */
export function stageEndMs(def: CropDef, stage: 0 | 1): number {
  return growMs(def) * STAGE_ENDS[stage];
}

/** Current stage for an effective elapsed time (wall clock + watering boost). */
export function stageForElapsed(def: CropDef, effectiveMs: number): 0 | 1 | 2 {
  if (effectiveMs >= stageEndMs(def, 1)) return 2;
  if (effectiveMs >= stageEndMs(def, 0)) return 1;
  return 0;
}

/** The tile a crop shows at a given stage. */
export function tileForStage(def: CropDef, stage: 0 | 1 | 2): Tile {
  return stage === 0 ? Tile.CropSprout : stage === 1 ? def.midTile : def.matureTile;
}

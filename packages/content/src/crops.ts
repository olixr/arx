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
  /**
   * Farming XP on harvest. THE PLOT PAYS FOR ITS TIME (contract law,
   * xpEconomy.test.ts): xp = growMinutes x 10, so a tended plot-hour
   * is worth the same whatever the crop. Planting pays a quarter of
   * this and each watering a tenth (gameServer sites) — the trade's
   * pace scales with plots worked, never with a faster clock.
   */
  xp: number;
  /**
   * THE ORCHARD SHAPE (Phase 2): plant once and the crop STANDS —
   * harvest picks the fruit and the plant re-aims to its mid stage,
   * ripening again after cooldownMinutes. The first harvest pays
   * def.xp (the full growth happened); every later pick pays
   * cooldownMinutes x 10 (the same time law, per cycle). Cooldown
   * must fit inside the mid stage: cooldown <= 0.75 x growMinutes
   * (contract-pinned) so the re-aim lands on the mid tile.
   */
  recurring?: { cooldownMinutes: number };
  /**
   * Where this crop grows. 'tilled' (default): a garden plot or a
   * growing frame. 'log': a mushroom log — shade culture: no
   * watering, no soil, no mulch, no grade; the dark bed keeps its
   * own counsel and pays in reagents, not in finery.
   */
  bed?: 'tilled' | 'log';
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
    xp: 80,
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
    xp: 100,
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
    xp: 120,
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
    xp: 180,
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
    xp: 250,
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
    xp: 400,
  },
  // ---- THE FULL FIELD (Phase 2): the staples — the cook's garden.
  {
    id: 'potato',
    name: 'Potato',
    seedItem: 'potato_seed',
    midTile: Tile.PotatoMid,
    matureTile: Tile.PotatoRipe,
    growMinutes: 9,
    yield: { item: 'potato', min: 3, max: 5 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 3,
    xp: 90,
  },
  {
    id: 'onion',
    name: 'Onion',
    seedItem: 'onion_seed',
    midTile: Tile.OnionMid,
    matureTile: Tile.OnionRipe,
    growMinutes: 11,
    yield: { item: 'onion', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 8,
    xp: 110,
  },
  {
    id: 'cabbage',
    name: 'Cabbage',
    seedItem: 'cabbage_seed',
    midTile: Tile.CabbageMid,
    matureTile: Tile.CabbageRipe,
    growMinutes: 15,
    yield: { item: 'cabbage', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 14,
    xp: 150,
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    seedItem: 'pumpkin_seed',
    midTile: Tile.PumpkinMid,
    matureTile: Tile.PumpkinRipe,
    growMinutes: 30,
    yield: { item: 'pumpkin', min: 1, max: 2 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 25,
    xp: 300,
  },
  {
    id: 'barley',
    name: 'Barley',
    seedItem: 'barley_seed',
    midTile: Tile.BarleyMid,
    matureTile: Tile.BarleyRipe,
    growMinutes: 26,
    yield: { item: 'barley', min: 3, max: 5 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 35,
    xp: 260,
  },
  {
    id: 'redroot',
    name: 'Redroot',
    seedItem: 'redroot_seed',
    midTile: Tile.RedrootMid,
    matureTile: Tile.RedrootRipe,
    growMinutes: 45,
    yield: { item: 'redroot', min: 2, max: 4 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 48,
    xp: 450,
  },
  {
    id: 'kingsquash',
    name: 'Kingsquash',
    seedItem: 'kingsquash_seed',
    midTile: Tile.KingsquashMid,
    matureTile: Tile.KingsquashRipe,
    growMinutes: 60,
    yield: { item: 'kingsquash', min: 1, max: 2 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 65,
    xp: 600,
  },
  // ---- The high herbs — the brewer's garden (herbalism 40+ inputs).
  {
    id: 'bittercress',
    name: 'Bittercress',
    seedItem: 'bittercress_seed',
    midTile: Tile.BittercressMid,
    matureTile: Tile.BittercressRipe,
    growMinutes: 42,
    yield: { item: 'bittercress', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 40,
    xp: 420,
  },
  {
    id: 'silverleaf',
    name: 'Silverleaf',
    seedItem: 'silverleaf_seed',
    midTile: Tile.SilverleafMid,
    matureTile: Tile.SilverleafRipe,
    growMinutes: 55,
    yield: { item: 'silverleaf', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 55,
    xp: 550,
  },
  {
    id: 'duskthorn',
    name: 'Duskthorn',
    seedItem: 'duskthorn_seed',
    midTile: Tile.DuskthornMid,
    matureTile: Tile.DuskthornRipe,
    growMinutes: 70,
    yield: { item: 'duskthorn', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 70,
    xp: 700,
  },
  {
    id: 'dawnveil',
    name: 'Dawnveil',
    seedItem: 'dawnveil_seed',
    midTile: Tile.DawnveilMid,
    matureTile: Tile.DawnveilRipe,
    growMinutes: 90,
    yield: { item: 'dawnveil', min: 1, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 85,
    xp: 900,
  },
  // ---- The dark bed — the poisoner's garden.
  {
    id: 'adderstongue',
    name: "Adder's tongue",
    seedItem: 'adderstongue_seed',
    midTile: Tile.AdderstongueMid,
    matureTile: Tile.AdderstongueRipe,
    growMinutes: 50,
    yield: { item: 'venom_sac', min: 1, max: 2 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 45,
    xp: 500,
  },
  {
    id: 'palegill',
    name: 'Palegill',
    seedItem: 'palegill_spores',
    midTile: Tile.PalegillMid,
    matureTile: Tile.PalegillRipe,
    growMinutes: 65,
    yield: { item: 'spore_dust', min: 2, max: 3 },
    seedReturn: { min: 1, max: 2 },
    levelReq: 60,
    xp: 650,
    bed: 'log',
  },
  // ---- The orchard — plant once, pick for a season.
  {
    id: 'appletree',
    name: 'Apple tree',
    seedItem: 'apple_sapling',
    midTile: Tile.AppleTreeMid,
    matureTile: Tile.AppleTreeRipe,
    growMinutes: 20,
    yield: { item: 'apple', min: 2, max: 4 },
    seedReturn: { min: 0, max: 1 },
    levelReq: 10,
    xp: 200,
    recurring: { cooldownMinutes: 12 },
  },
  {
    id: 'bramblevine',
    name: 'Bramblevine',
    seedItem: 'bramble_cutting',
    midTile: Tile.BrambleMid,
    matureTile: Tile.BrambleRipe,
    growMinutes: 24,
    yield: { item: 'berries', min: 2, max: 4 },
    seedReturn: { min: 0, max: 1 },
    levelReq: 20,
    xp: 240,
    recurring: { cooldownMinutes: 14 },
  },
  {
    id: 'plumtree',
    name: 'Plum tree',
    seedItem: 'plum_sapling',
    midTile: Tile.PlumTreeMid,
    matureTile: Tile.PlumTreeRipe,
    growMinutes: 35,
    yield: { item: 'plum', min: 2, max: 4 },
    seedReturn: { min: 0, max: 1 },
    levelReq: 30,
    xp: 350,
    recurring: { cooldownMinutes: 18 },
  },
  {
    id: 'mirefig',
    name: 'Mirefig',
    seedItem: 'mirefig_sapling',
    midTile: Tile.MirefigMid,
    matureTile: Tile.MirefigRipe,
    growMinutes: 60,
    yield: { item: 'mirefig', min: 2, max: 4 },
    seedReturn: { min: 0, max: 1 },
    levelReq: 55,
    xp: 600,
    recurring: { cooldownMinutes: 30 },
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
  return tile === Tile.CropSprout || tile === Tile.MushroomLogSeeded || CROP_TILES.has(tile);
}

/** The ground a crop's bed reverts to when the planting ends. */
export function bedTileFor(def: CropDef, framed: boolean): Tile {
  if (def.bed === 'log') return Tile.MushroomLog;
  return framed ? Tile.GrowingFrame : Tile.Tilled;
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
  if (stage === 0) return def.bed === 'log' ? Tile.MushroomLogSeeded : Tile.CropSprout;
  return stage === 1 ? def.midTile : def.matureTile;
}

/**
 * A recurring crop's per-pick XP: the first harvest pays def.xp (the
 * whole growth happened); every later pick pays the cycle's own time
 * (cooldownMinutes x 10 — THE PLOT PAYS FOR ITS TIME, per cycle).
 */
export function harvestXp(def: CropDef, cycles: number): number {
  if (!def.recurring || cycles === 0) return def.xp;
  return def.recurring.cooldownMinutes * 10;
}

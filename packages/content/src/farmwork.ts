import { Tile } from '@arx/shared';
import { PROCESSED_GRADED, gradeOf, gradedId, type Grade } from './farming.js';

/**
 * THE WORKING YARD (farming v2 Phase 4) — wall-clock processing.
 *
 * THE STATION WORKS WHILE YOU WANDER: a work recipe is loaded into a
 * yard station (inputs consumed at the door), the job walks a pure
 * wall-clock function, and matured units collect incrementally — you
 * tap the keg for what's ready and the rest keeps working. No tick
 * owns a job; restart-safe by construction (the crop-clock law).
 *
 * THE BATCH IS AS GOOD AS ITS WEAKEST MEASURE: the loader consumes
 * the highest grades first, the job records the MINIMUM grade across
 * everything consumed, and the output wears that grade — fine milk
 * makes fine butter, and one plain pail in the churn makes plain.
 */

export type WorkStation =
  | 'windmill'
  | 'churn'
  | 'press'
  | 'keg'
  | 'smoker'
  | 'drying_rack';

export interface WorkRecipeDef {
  id: string;
  name: string;
  station: WorkStation;
  /** The trade the work trains, paid per unit AT COLLECT. */
  skill: 'cooking' | 'herbalism';
  levelReq: number;
  /**
   * XP per unit. Deliberately light against active crafting — a job
   * pays in TIME SAVED and VALUE, never in a faster ladder (the
   * contract test caps xp <= minutes x 12).
   */
  xp: number;
  inputs: Array<{ item: string; qty: number }>;
  output: { item: string; qty: number };
  /** Wall-clock minutes per unit. */
  minutes: number;
}

const defs: WorkRecipeDef[] = [
  // ---- the windmill: the quern's big sister. The workbench hand
  // mill stays forever (bread never gates on construction); the
  // mill's whole argument is DOUBLE flour from the same sheaves.
  {
    id: 'work_mill_flour',
    name: 'Mill flour',
    station: 'windmill',
    skill: 'cooking',
    levelReq: 5,
    xp: 10,
    inputs: [{ item: 'wheat', qty: 2 }],
    output: { item: 'flour', qty: 2 },
    minutes: 2,
  },
  // ---- the churn: the dairy line.
  {
    id: 'work_churn_butter',
    name: 'Churn butter',
    station: 'churn',
    skill: 'cooking',
    levelReq: 12,
    xp: 20,
    inputs: [{ item: 'milk', qty: 1 }],
    output: { item: 'butter', qty: 1 },
    minutes: 4,
  },
  {
    id: 'work_soft_cheese',
    name: 'Set soft cheese',
    station: 'churn',
    skill: 'cooking',
    levelReq: 30,
    xp: 45,
    inputs: [
      { item: 'milk', qty: 2 },
      { item: 'salt', qty: 1 },
    ],
    output: { item: 'soft_cheese', qty: 1 },
    minutes: 8,
  },
  {
    id: 'work_hard_cheese',
    name: 'Age hard cheese',
    station: 'churn',
    skill: 'cooking',
    levelReq: 45,
    xp: 90,
    inputs: [{ item: 'soft_cheese', qty: 1 }],
    output: { item: 'hard_cheese', qty: 1 },
    minutes: 20,
  },
  // ---- the press.
  {
    id: 'work_press_oil',
    name: 'Press cooking oil',
    station: 'press',
    skill: 'cooking',
    levelReq: 20,
    xp: 30,
    inputs: [{ item: 'sunflower', qty: 2 }],
    output: { item: 'cooking_oil', qty: 1 },
    minutes: 5,
  },
  {
    id: 'work_press_cider',
    name: 'Press cider',
    station: 'press',
    skill: 'cooking',
    levelReq: 25,
    xp: 40,
    inputs: [{ item: 'apple', qty: 3 }],
    output: { item: 'cider', qty: 1 },
    minutes: 6,
  },
  // ---- the keg: set it before the dungeon, tap it after.
  {
    id: 'work_farmhouse_ale',
    name: 'Brew farmhouse ale',
    station: 'keg',
    skill: 'cooking',
    levelReq: 35,
    xp: 80,
    inputs: [{ item: 'barley', qty: 3 }],
    output: { item: 'farmhouse_ale', qty: 1 },
    minutes: 15,
  },
  {
    id: 'work_honeybrew',
    name: 'Brew honeybrew',
    station: 'keg',
    skill: 'cooking',
    levelReq: 50,
    xp: 120,
    inputs: [
      { item: 'honey', qty: 2 },
      { item: 'barley', qty: 1 },
    ],
    output: { item: 'honeybrew', qty: 1 },
    minutes: 20,
  },
  {
    id: 'work_sour_vinegar',
    name: 'Sour vinegar',
    station: 'keg',
    skill: 'cooking',
    levelReq: 28,
    xp: 40,
    inputs: [{ item: 'cider', qty: 1 }],
    output: { item: 'vinegar', qty: 1 },
    minutes: 12,
  },
  {
    id: 'work_pickle_cabbage',
    name: 'Pickle cabbage',
    station: 'keg',
    skill: 'cooking',
    levelReq: 22,
    xp: 32,
    inputs: [
      { item: 'cabbage', qty: 1 },
      { item: 'vinegar', qty: 1 },
    ],
    output: { item: 'pickled_cabbage', qty: 1 },
    minutes: 8,
  },
  // ---- the smoker: preservation's own flavor (the fire keeps quick
  // cooking; the smoker owns the slow cure).
  {
    id: 'work_smoke_beef',
    name: 'Smoke beef',
    station: 'smoker',
    skill: 'cooking',
    levelReq: 20,
    xp: 30,
    inputs: [
      { item: 'raw_beef', qty: 1 },
      { item: 'salt', qty: 1 },
    ],
    output: { item: 'smoked_beef', qty: 1 },
    minutes: 6,
  },
  {
    id: 'work_smoke_eel',
    name: 'Smoke eel',
    station: 'smoker',
    skill: 'cooking',
    levelReq: 32,
    xp: 50,
    inputs: [
      { item: 'raw_eel', qty: 1 },
      { item: 'salt', qty: 1 },
    ],
    output: { item: 'smoked_eel', qty: 1 },
    minutes: 8,
  },
  // ---- the drying rack: herbalism's concentrates (the herb sink
  // that makes big gardens worth planting).
  {
    id: 'work_dry_sagewort',
    name: 'Dry sagewort',
    station: 'drying_rack',
    skill: 'herbalism',
    levelReq: 15,
    xp: 25,
    inputs: [{ item: 'sagewort', qty: 2 }],
    output: { item: 'dried_sagewort', qty: 1 },
    minutes: 5,
  },
  {
    id: 'work_dry_moonbell',
    name: 'Dry moonbell',
    station: 'drying_rack',
    skill: 'herbalism',
    levelReq: 30,
    xp: 45,
    inputs: [{ item: 'moonbell', qty: 2 }],
    output: { item: 'dried_moonbell', qty: 1 },
    minutes: 8,
  },
  {
    id: 'work_dry_bittercress',
    name: 'Dry bittercress',
    station: 'drying_rack',
    skill: 'herbalism',
    levelReq: 45,
    xp: 60,
    inputs: [{ item: 'bittercress', qty: 2 }],
    output: { item: 'dried_bittercress', qty: 1 },
    minutes: 10,
  },
];

export const WORK_RECIPES: ReadonlyMap<string, WorkRecipeDef> = new Map(defs.map((d) => [d.id, d]));

export function workRecipesFor(station: WorkStation): WorkRecipeDef[] {
  return defs.filter((d) => d.station === station);
}

/** Buildable id → work station kind (the panel's and the door's map). */
export const WORK_STATION_TILES: ReadonlyMap<Tile, WorkStation> = new Map([
  [Tile.Windmill, 'windmill'],
  [Tile.ButterChurn, 'churn'],
  [Tile.FruitPress, 'press'],
  [Tile.BrewKeg, 'keg'],
  [Tile.Smoker, 'smoker'],
  [Tile.DryingRack, 'drying_rack'],
]);

/** The spoken verb on each station's prompt. */
export const WORK_VERBS: Record<WorkStation, string> = {
  windmill: 'Mill',
  churn: 'Churn',
  press: 'Press',
  keg: 'Tap',
  smoker: 'Smoke',
  drying_rack: 'Dry',
};

/** Most units one load may queue. */
export const WORK_BATCH_CAP = 10;

/**
 * Units matured on a job at `now` — the one pure clock every reader
 * shares (server truth, client panel, station art).
 */
export function workDone(recipe: WorkRecipeDef, startedAt: number, qty: number, now: number): number {
  if (qty <= 0) return 0;
  return Math.min(qty, Math.floor((now - startedAt) / (recipe.minutes * 60_000)));
}

/** The output id a finished job hands over, wearing the batch grade. */
export function workOutputId(recipe: WorkRecipeDef, grade: Grade): string {
  if (grade === 0 || !PROCESSED_GRADED.includes(recipe.output.item)) return recipe.output.item;
  return gradedId(recipe.output.item, grade);
}

/**
 * THE APIARY keeps its own clock: honey and wax on slow wall time,
 * graded by the REAL FLOWERS near the hive at collect (world-state,
 * never player-state — plant a garden and the honey remembers it).
 */
export const APIARY_MINUTES = 25;
export const APIARY_STORE_CAP = 3;
export const APIARY_FLOWER_RANGE = 5;
export const APIARY_FINE_FLOWERS = 4;
export const APIARY_PRIME_FLOWERS = 10;

export function apiaryGrade(flowers: number): Grade {
  if (flowers >= APIARY_PRIME_FLOWERS) return 2;
  if (flowers >= APIARY_FINE_FLOWERS) return 1;
  return 0;
}

export { gradeOf as workGradeOf };

import { Tile, hashCoords, saplingOf } from '@arx/shared';
import { NODES_BY_TILE } from './nodes.js';

/**
 * THE SECOND GROWTH (docs/second-growth-plan.md Phase 1) — content's
 * half of the land's harvest ledger. THE KEPT AND THE WILD: kept ground
 * (authored zones, live POI zones, the dark band) keeps the old
 * seconds-fast in-place respawn; wild ground remembers every harvest in
 * a persistent ledger and heals SLOWLY through real ages. This module
 * owns the grammar (the row, the dialects, the stage walk) and the
 * dials (a live 'growth' content doc on the frontier skeleton — the
 * two-hash law, call-time reads, never destructure a dial).
 *
 * THE THREE AGES: a wild regrowth's stage is a PURE function of the
 * row and the clock (the crop `stageForElapsed` law). The server's
 * chunk overlay computes the current tile at read time, so an unloaded
 * chunk is always correct the moment it generates — restart-safe with
 * zero catch-up code; the growth beat exists only to broadcast patches
 * into loaded chunks and advance the checkpoint.
 */

/** A jitter band in MINUTES: [min, max], inclusive. */
export type GrowthRange = readonly [number, number];

// The ages, stored in world_growth.state.
export const GROWTH_SCAR = 0; // the fresh harvest mark (stump / spent rock / bare grass)
export const GROWTH_BARE = 1; // bare ground: due null = DORMANT (waiting on the world), set = germinating
export const GROWTH_SAPLING = 2; // the young tree standing in the clearing
/**
 * THE LIVING WOOD (Phase 2): a regrowth that came back a DIFFERENT
 * species than worldgen's seed-truth — the dispersal drew a neighbor's
 * seed. The row rests here PERMANENTLY (deleting it would resurrect
 * the truth species on the next chunk regen); the next felling re-aims
 * at seed-truth, so drift decays over harvest cycles (THE LAND
 * REMEMBERS ITS NATURE).
 */
export const GROWTH_DRIFTED = 3;
/** Human names for the lever and the Studio lens, by state index. */
export const GROWTH_STATE_NAMES: readonly string[] = ['scar', 'bare', 'sapling', 'drifted'];

/**
 * One wild harvest, remembered. DEVIATIONS ONLY: a row exists only
 * where a hand changed the wild land; a healed row deletes itself and
 * the pure worldgen truth stands back up (THE LAND REMEMBERS ITS
 * NATURE — Phase 1 heals in place, Phase 2 adds the dispersal drift).
 */
export interface GrowthRow {
  tx: number;
  ty: number;
  /** The resource tile this ground grows back toward (seed-truth). */
  tile: Tile;
  /** The current age (GROWTH_*) — a checkpoint, not the truth: the
   *  projection re-walks from here whenever it's asked. */
  state: number;
  /** When the current age began (absolute ms). */
  since: number;
  /** Next transition deadline (absolute ms; null = dormant — the
   *  Phase 2 germination gate). A checkpoint like `state`. */
  due: number | null;
  /** Planted by a settler (Phase 4) — null means the wild's own. */
  owner: number | null;
  /** The harvest moment — the jitter nonce for the WHOLE regrowth, so
   *  every wait in the chain is stable however often we re-project. */
  firstSeenAt: number;
  /** In-memory courtesy defer (a body stood where a solid would rise);
   *  never persisted. */
  deferUntil?: number;
  /** In-memory germination bookkeeping — when this dormant row last
   *  rolled; never persisted (a restart just re-checks a little early,
   *  which is harmless and self-correcting). */
  checkedAt?: number;
}

export type GrowthDialect = 'tree' | 'ore' | 'bush' | 'forage';

/**
 * ONE ENGINE, FOUR DIALECTS: which regrowth dialect a resource tile
 * speaks, read off the node roster. Trees stage through the ages by
 * succession; ores are THE PATIENT STONE — long re-open, and the vein
 * WANDERS through the formation; berry bushes spread bush-to-bush by
 * the same succession engine as trees; herbs and fibre are THE QUICK
 * MEADOW — short windows, and the patch wanders the grass. Null means
 * the ledger never takes the tile (fishing spots never deplete;
 * anything the roster doesn't know stays on the kept path).
 */
export function growthDialectOf(tile: Tile): GrowthDialect | null {
  const node = NODES_BY_TILE.get(tile);
  if (!node || node.depletedTile === null) return null;
  if (node.skill === 'woodcutting') return 'tree';
  if (node.skill === 'mining') return 'ore';
  if (node.skill === 'foraging') return tile === Tile.BerryBush ? 'bush' : 'forage';
  return null;
}

/**
 * The barren host a wandering resource leaves behind (and surfaces
 * through): a sealed vein mouth is plain rock, a moved meadow patch
 * is plain grass. Trees and bushes never wander — they drift by SEED,
 * in place.
 */
export function hostTileFor(dialect: GrowthDialect): Tile | null {
  if (dialect === 'ore') return Tile.Rock;
  if (dialect === 'forage') return Tile.Grass;
  return null;
}

/**
 * The whole dial table's shape — the Studio edits exactly this. Every
 * field is REQUIRED (the frontier law): a growth doc with a missing
 * dial is a law left undefined, and the validator refuses it — though
 * an ABSENT dial in an older saved doc backfills to the authored
 * default (THE BACKFILL LAW, below).
 */
export interface GrowthDef {
  /** How long a felled wild tree's stump marks the ground before it
   *  relaxes to bare, buildable, plantable grass. [min, max] minutes. */
  treeStumpMinutes: GrowthRange;
  /** THE REST FLOOR (Phase 2): how long bare ground must rest before
   *  germination may even roll — the soil recovers first. */
  treeBareMinutes: GrowthRange;
  /** How long the sapling grows before the crown stands up. */
  treeSaplingMinutes: GrowthRange;
  /** How long a mined-out wild rock stays spent before the vein
   *  re-opens. */
  oreReopenMinutes: GrowthRange;
  /** How long picked wild forage (bushes, fibre, herbs) rests. */
  forageMinutes: GrowthRange;
  /** Ticks between growth-beat passes (~2 s at 40). */
  beatTicks: number;
  /** Max tile writes per beat — a whole clearcut healing at once still
   *  lands as a gentle drizzle of patches, never a burst. */
  beatBudget: number;
  // ---- Phase 2: THE LIVING WOOD ----
  /** Dispersal radius (tiles): how far a standing crown's seed reaches. */
  sourceReach: number;
  /** Germination chance added per standing crown within reach — the
   *  edge-inward wave IS this number (never coded as a wave). */
  sourceBoost: number;
  /** THE PIONEER WHISPER: germination chance with zero sources, so a
   *  total clearcut is never a permanent desert — just a slow one. */
  pioneerChance: number;
  /** Ceiling on any single germination roll. */
  germChanceCap: number;
  /** How often a dormant tile re-rolls germination. [min, max] minutes,
   *  jittered per tile — the pacing dial of the whole succession. */
  germEveryMinutes: GrowthRange;
  /** The seed is in the ground: rolled-germination to visible sapling. */
  germSproutMinutes: GrowthRange;
  /** Chance a germination draws its species from the NEIGHBORS' crowns
   *  instead of worldgen's seed-truth — the dispersal drift. Truth is
   *  always the default, so the ledger self-prunes over cycles. */
  driftChance: number;
  /** Tiles of germination refusal around built ground — the forest
   *  grows AROUND a homestead, never against its walls. */
  courtesyRing: number;
  // ---- Phase 3: THE PATIENT STONE AND THE QUICK MEADOW ----
  /** Chance a re-opening vein SURFACES ELSEWHERE in the formation
   *  instead of at the old mouth — mining migrates through the mesa. */
  oreDriftChance: number;
  /** How far the vein may wander (tiles). */
  oreDriftReach: number;
  /** Chance a returning herb/fibre patch wanders the meadow. */
  forageDriftChance: number;
  /** How far the patch may wander (tiles). */
  forageDriftReach: number;
  /** Bush-to-bush dispersal radius for berry succession. */
  bushReach: number;
  /** Germination chance added per standing bush within reach. */
  bushBoost: number;
  /** A lone picked bush's own return whisper — generous, so a meadow
   *  never empties for want of neighbors. */
  bushPioneer: number;
  /** How long picked bush ground rests before germination may roll. */
  bushRestMinutes: GrowthRange;
}

/**
 * THE GROWTH DIALS. A wild harvest is SUPPOSED to matter: the shipped
 * windows put a felled wild tree at roughly nine hours to a day from
 * stump to crown, a spent vein at four to fifteen hours, and picked
 * forage at under an hour or so — kept town ground keeps its seconds.
 * THE WORLD OWES YOU NOTHING (the flood-law echo): every dial reads
 * world state only — never player state, never demand, never pity.
 */
export const GROWTH: GrowthDef = {
  treeStumpMinutes: [60, 150],
  treeBareMinutes: [180, 480],
  treeSaplingMinutes: [300, 780],
  oreReopenMinutes: [240, 900],
  forageMinutes: [25, 70],
  beatTicks: 40,
  beatBudget: 48,
  // Phase 2 — tuned so a clearcut's edge (several crowns in reach)
  // germinates within an hour or two of its rest floor, while its
  // heart waits for the wave: one crown in reach ≈ a few hours of
  // rolls, zero crowns ≈ days (the pioneer whisper).
  sourceReach: 6,
  sourceBoost: 0.12,
  pioneerChance: 0.006,
  germChanceCap: 0.9,
  germEveryMinutes: [22, 42],
  germSproutMinutes: [15, 45],
  driftChance: 0.25,
  courtesyRing: 1,
  // Phase 3 — the stone wanders more often than not (farming one rock
  // must not work); the meadow wanders enough to feel alive; bushes
  // return generously because forage is the newest hand's trade.
  oreDriftChance: 0.5,
  oreDriftReach: 5,
  forageDriftChance: 0.35,
  forageDriftReach: 4,
  bushReach: 4,
  bushBoost: 0.2,
  bushPioneer: 0.04,
  bushRestMinutes: [30, 90],
};

// Growth RNG salts — the named-streams law (the ST_* family's kin).
const ST_GROW_SCAR = 0x92071a;
const ST_GROW_BARE = 0x92071b;
const ST_GROW_SAPLING = 0x92071c;
const ST_GROW_CHECK = 0x92071d;
const ST_GROW_SPROUT = 0x92071e;
const ST_GROW_BUSH = 0x92071f;

/**
 * A stage wait in ms, hash-jittered per tile AND per harvest (the
 * firstSeenAt nonce), so a clearcut never heals in lockstep and the
 * same tree takes a different wait each felling — yet every re-read of
 * the same row walks the identical chain.
 */
function growWait(
  seed: number,
  salt: number,
  tx: number,
  ty: number,
  nonce: number,
  range: GrowthRange,
): number {
  const h = hashCoords(
    hashCoords((seed ^ salt) >>> 0, tx, ty),
    nonce % 4294967296,
    Math.floor(nonce / 4294967296),
  );
  const mins = range[0] + (h % (range[1] - range[0] + 1));
  return mins * 60_000;
}

/** What the projection says about a row at a moment in time. */
export interface GrowthProjection {
  state: number;
  tile: Tile;
  /** When the projected current state began (the checkpoint the server
   *  stores back so future walks start here). */
  stateSince: number;
  /** Next transition deadline, or null. Null WITHOUT ripe means the
   *  row is at rest (dormant bare ground, or a drifted crown) — only
   *  the world can move it, never the clock alone. */
  due: number | null;
  /** The walk is complete: the crown (row.tile) stands. The beat then
   *  decides clean-heal (row dissolves back to seed-truth) vs drift
   *  (the row rests as GROWTH_DRIFTED) — a WORLD question the pure
   *  walk cannot answer. */
  ripe: boolean;
}

/** The tile a row shows at its STORED checkpoint state — the beat's
 *  "did the world move on under me" guard reads this. */
export function growthTileForState(seed: number, row: GrowthRow): Tile {
  const node = NODES_BY_TILE.get(row.tile);
  if (row.state === GROWTH_DRIFTED) return row.tile;
  if (row.state === GROWTH_BARE) return Tile.Grass;
  if (row.state === GROWTH_SAPLING) return saplingOf(row.tile) ?? row.tile;
  return node?.depletedTile ?? row.tile;
}

/**
 * THE PURE WALK: project a row forward to `now` from its stored
 * checkpoint. Deterministic — the same row and clock always land on
 * the same age, however many times (and on however many machines) the
 * question is asked. THE LIVING WOOD amendment: a tree's walk STOPS at
 * bare ground (dormant, due null) — germination is the beat's event,
 * rolled against the standing world, and only a checkpointed
 * germination deadline (row.due while BARE) lets the walk continue.
 * A drifted crown rests forever; a row whose dialect has left the
 * roster (a def edit) projects straight to ripe rather than haunting
 * the ledger.
 */
export function projectGrowth(seed: number, row: GrowthRow, now: number): GrowthProjection {
  const dialect = growthDialectOf(row.tile);
  const node = NODES_BY_TILE.get(row.tile);
  if (row.state === GROWTH_DRIFTED) {
    return { state: GROWTH_DRIFTED, tile: row.tile, stateSince: row.since, due: null, ripe: false };
  }
  if (dialect === null || !node || node.depletedTile === null) {
    return { state: row.state, tile: row.tile, stateSince: row.since, due: null, ripe: true };
  }
  if (dialect === 'bush') {
    // A picked bush's ground is grass from the first moment — the
    // harvest goes straight to dormant bare and waits for the world
    // (succession like the trees, with no sapling age; the sprout
    // deadline is the germination visitor's checkpoint).
    if (row.due === null || now < row.due) {
      return { state: GROWTH_BARE, tile: Tile.Grass, stateSince: row.since, due: row.due, ripe: false };
    }
    return { state: GROWTH_BARE, tile: row.tile, stateSince: row.due, due: null, ripe: true };
  }
  if (dialect !== 'tree') {
    const range = dialect === 'ore' ? GROWTH.oreReopenMinutes : GROWTH.forageMinutes;
    const end = row.since + growWait(seed, ST_GROW_SCAR, row.tx, row.ty, row.firstSeenAt, range);
    if (now < end) {
      return { state: GROWTH_SCAR, tile: node.depletedTile, stateSince: row.since, due: end, ripe: false };
    }
    return { state: GROWTH_SCAR, tile: row.tile, stateSince: end, due: null, ripe: true };
  }
  const sapling = saplingOf(row.tile);
  const saplingWait = growWait(
    seed,
    ST_GROW_SAPLING,
    row.tx,
    row.ty,
    row.firstSeenAt,
    GROWTH.treeSaplingMinutes,
  );
  if (row.state === GROWTH_SCAR) {
    const end =
      row.since + growWait(seed, ST_GROW_SCAR, row.tx, row.ty, row.firstSeenAt, GROWTH.treeStumpMinutes);
    if (now < end) {
      return { state: GROWTH_SCAR, tile: node.depletedTile, stateSince: row.since, due: end, ripe: false };
    }
    // The stump relaxes to bare ground and WAITS FOR THE WORLD.
    return { state: GROWTH_BARE, tile: Tile.Grass, stateSince: end, due: null, ripe: false };
  }
  if (row.state === GROWTH_BARE) {
    if (row.due === null || now < row.due) {
      return { state: GROWTH_BARE, tile: Tile.Grass, stateSince: row.since, due: row.due, ripe: false };
    }
    // Germination landed: the sapling stands at the checkpointed due.
    const end = row.due + saplingWait;
    if (sapling === null || now >= end) {
      return { state: GROWTH_SAPLING, tile: row.tile, stateSince: end, due: null, ripe: true };
    }
    return { state: GROWTH_SAPLING, tile: sapling, stateSince: row.due, due: end, ripe: false };
  }
  const end = row.since + saplingWait;
  if (sapling !== null && now < end) {
    return { state: GROWTH_SAPLING, tile: sapling, stateSince: row.since, due: end, ripe: false };
  }
  return { state: GROWTH_SAPLING, tile: row.tile, stateSince: end, due: null, ripe: true };
}

// --------------------------------------------- THE LIVING WOOD (Ph2)

/** THE REST FLOOR: bare ground may not roll germination before this. */
export function bareRestFor(seed: number, tx: number, ty: number, nonce: number): number {
  return growWait(seed, ST_GROW_BARE, tx, ty, nonce, GROWTH.treeBareMinutes);
}

/** Cadence between germination rolls for one dormant tile. */
export function germEveryFor(seed: number, tx: number, ty: number, nonce: number): number {
  return growWait(seed, ST_GROW_CHECK, tx, ty, nonce, GROWTH.germEveryMinutes);
}

/** Rolled-germination to visible sapling — the seed is in the ground. */
export function germSproutFor(seed: number, tx: number, ty: number, nonce: number): number {
  return growWait(seed, ST_GROW_SPROUT, tx, ty, nonce, GROWTH.germSproutMinutes);
}

/** THE QUICK MEADOW's rest floor for a picked bush. */
export function bushRestFor(seed: number, tx: number, ty: number, nonce: number): number {
  return growWait(seed, ST_GROW_BUSH, tx, ty, nonce, GROWTH.bushRestMinutes);
}

/**
 * THE FOREST GROWS FROM ITS EDGES, as one pure number: the germination
 * chance for a bare tile with `sources` standing crowns (or bushes) in
 * reach. The edge-inward wave is emergent — edges see sources and
 * race, hearts see none and wait on the pioneer whisper. Reads world
 * state only (THE WORLD OWES YOU NOTHING).
 */
export function germinationChance(sources: number, dialect: GrowthDialect = 'tree'): number {
  const pioneer = dialect === 'bush' ? GROWTH.bushPioneer : GROWTH.pioneerChance;
  const boost = dialect === 'bush' ? GROWTH.bushBoost : GROWTH.sourceBoost;
  return Math.min(GROWTH.germChanceCap, pioneer + boost * sources);
}

/**
 * THE DISPERSAL DRAW: which species rises. Seed-truth is always the
 * aim (THE LAND REMEMBERS ITS NATURE — most regrowth heals clean and
 * the ledger self-prunes); with driftChance, and only when neighbors
 * actually stand, the seed is a neighbor's instead. Pure: the beat
 * hands in its own rolls.
 */
export function drawSpecies(
  truth: Tile | null,
  neighborCrowns: readonly Tile[],
  driftRoll: number,
  pickRoll: number,
  fallback: Tile,
): Tile {
  if (neighborCrowns.length > 0 && driftRoll < GROWTH.driftChance) {
    return neighborCrowns[Math.min(neighborCrowns.length - 1, Math.floor(pickRoll * neighborCrowns.length))]!;
  }
  return truth ?? fallback;
}

// ------------------------------------------------- the Studio's half

/** The authored dials exactly as shipped — the CMS revert target. */
export const AUTHORED_GROWTH: Readonly<GrowthDef> = Object.freeze({
  ...GROWTH,
  treeStumpMinutes: [...GROWTH.treeStumpMinutes] as [number, number],
  treeBareMinutes: [...GROWTH.treeBareMinutes] as [number, number],
  treeSaplingMinutes: [...GROWTH.treeSaplingMinutes] as [number, number],
  oreReopenMinutes: [...GROWTH.oreReopenMinutes] as [number, number],
  forageMinutes: [...GROWTH.forageMinutes] as [number, number],
  germEveryMinutes: [...GROWTH.germEveryMinutes] as [number, number],
  germSproutMinutes: [...GROWTH.germSproutMinutes] as [number, number],
  bushRestMinutes: [...GROWTH.bushRestMinutes] as [number, number],
});

export type ValidateGrowthResult = { ok: true; def: GrowthDef } | { ok: false; errors: string[] };

/**
 * THE ONE VALIDATOR for the land's clock: every dial bounds-checked.
 * Runs on the authored seed at module load, on the DB row at boot, and
 * on every Studio save. THE BACKFILL LAW rides from day one: an absent
 * dial adopts the shipped default, so a doc saved before a dial
 * existed keeps its edits when the table grows.
 */
export function validateGrowth(raw: unknown): ValidateGrowthResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['growth doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const num = (key: keyof GrowthDef, lo: number, hi: number, int = false): number => {
    const v = doc[key];
    if (v === undefined) return AUTHORED_GROWTH[key] as number;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (int && !Number.isInteger(v)) errors.push(`${key} must be an integer`);
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };
  const range = (key: keyof GrowthDef, lo: number, hi: number): [number, number] => {
    const v = doc[key];
    if (v === undefined) {
      const a = AUTHORED_GROWTH[key] as GrowthRange;
      return [a[0], a[1]];
    }
    if (
      !Array.isArray(v) ||
      v.length !== 2 ||
      typeof v[0] !== 'number' ||
      typeof v[1] !== 'number' ||
      !Number.isFinite(v[0]) ||
      !Number.isFinite(v[1])
    ) {
      errors.push(`${key} must be a [min, max] pair of numbers`);
      return [lo, lo];
    }
    if (!Number.isInteger(v[0]) || !Number.isInteger(v[1])) {
      errors.push(`${key} must hold whole minutes`);
    }
    if (v[0] < lo || v[1] > hi) errors.push(`${key} must sit inside [${lo}, ${hi}]`);
    if (v[0] > v[1]) errors.push(`${key} min must not exceed max`);
    return [v[0], v[1]];
  };
  // Two weeks is the ceiling on any single age: past that a "regrowing"
  // forest reads as a deleted one.
  const WEEK2 = 14 * 24 * 60;
  const def: GrowthDef = {
    treeStumpMinutes: range('treeStumpMinutes', 1, WEEK2),
    treeBareMinutes: range('treeBareMinutes', 1, WEEK2),
    treeSaplingMinutes: range('treeSaplingMinutes', 1, WEEK2),
    oreReopenMinutes: range('oreReopenMinutes', 1, WEEK2),
    forageMinutes: range('forageMinutes', 1, WEEK2),
    beatTicks: num('beatTicks', 20, 1200, true),
    beatBudget: num('beatBudget', 1, 256, true),
    sourceReach: num('sourceReach', 1, 16, true),
    sourceBoost: num('sourceBoost', 0, 1),
    pioneerChance: num('pioneerChance', 0, 1),
    germChanceCap: num('germChanceCap', 0, 1),
    germEveryMinutes: range('germEveryMinutes', 1, WEEK2),
    germSproutMinutes: range('germSproutMinutes', 1, WEEK2),
    driftChance: num('driftChance', 0, 1),
    courtesyRing: num('courtesyRing', 0, 4, true),
    oreDriftChance: num('oreDriftChance', 0, 1),
    oreDriftReach: num('oreDriftReach', 1, 16, true),
    forageDriftChance: num('forageDriftChance', 0, 1),
    forageDriftReach: num('forageDriftReach', 1, 16, true),
    bushReach: num('bushReach', 1, 16, true),
    bushBoost: num('bushBoost', 0, 1),
    bushPioneer: num('bushPioneer', 0, 1),
    bushRestMinutes: range('bushRestMinutes', 1, WEEK2),
  };
  // Unknown keys are refused loudly — a typoed dial must never sit in
  // the doc pretending to steer anything.
  const known = new Set(Object.keys(def));
  for (const key of Object.keys(doc)) {
    if (!known.has(key)) errors.push(`unknown dial '${key}'`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def };
}

/**
 * THE CMS HOOK: swap the live dials in place — object identity stable,
 * so every consumer that reads GROWTH.x at call time sees the edit on
 * the next beat, and nothing re-registers. Only ever runs against a
 * validated doc.
 */
export function replaceGrowth(next: GrowthDef): void {
  Object.assign(GROWTH, next, {
    treeStumpMinutes: [...next.treeStumpMinutes],
    treeBareMinutes: [...next.treeBareMinutes],
    treeSaplingMinutes: [...next.treeSaplingMinutes],
    oreReopenMinutes: [...next.oreReopenMinutes],
    forageMinutes: [...next.forageMinutes],
    germEveryMinutes: [...next.germEveryMinutes],
    germSproutMinutes: [...next.germSproutMinutes],
    bushRestMinutes: [...next.bushRestMinutes],
  });
}

// The shipped seed must satisfy its own law — loudly, at build time.
{
  const res = validateGrowth(AUTHORED_GROWTH);
  if (!res.ok) throw new Error(`shipped GROWTH dials invalid:\n  ${res.errors.join('\n  ')}`);
}

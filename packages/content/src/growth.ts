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

// The ages, stored in world_growth.state. SEEDED is reserved for the
// Phase 2 germination bookkeeping — the enum leaves its seat warm.
export const GROWTH_SCAR = 0; // the fresh harvest mark (stump / spent rock / bare grass)
export const GROWTH_BARE = 1; // bare ground resting (Phase 2: due null = dormant, set = germinating)
export const GROWTH_SAPLING = 2; // the young tree standing in the clearing
/** Human names for the lever and the Studio lens, by state index. */
export const GROWTH_STATE_NAMES: readonly string[] = ['scar', 'bare', 'sapling'];

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
}

export type GrowthDialect = 'tree' | 'ore' | 'forage';

/**
 * ONE ENGINE, THREE DIALECTS: which regrowth dialect a resource tile
 * speaks, read off the node roster — trees stage through the ages,
 * ores re-open in one long beat, forage returns quickly. Null means
 * the ledger never takes the tile (fishing spots never deplete;
 * anything the roster doesn't know stays on the kept path).
 */
export function growthDialectOf(tile: Tile): GrowthDialect | null {
  const node = NODES_BY_TILE.get(tile);
  if (!node || node.depletedTile === null) return null;
  if (node.skill === 'woodcutting') return 'tree';
  if (node.skill === 'mining') return 'ore';
  if (node.skill === 'foraging') return 'forage';
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
  /** How long the bare ground rests before a sapling stands. */
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
};

// Growth RNG salts — the named-streams law (the ST_* family's kin).
const ST_GROW_SCAR = 0x92071a;
const ST_GROW_BARE = 0x92071b;
const ST_GROW_SAPLING = 0x92071c;

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
  /** Next transition deadline, or null — null means fully healed: the
   *  seed-truth resource stands again and the row should dissolve. */
  due: number | null;
}

interface GrowthStage {
  state: number;
  tile: Tile;
  wait: number;
}

/** The dialect's stage chain for one row — waits already jittered. */
function stagesFor(seed: number, row: GrowthRow): GrowthStage[] {
  const dialect = growthDialectOf(row.tile);
  const node = NODES_BY_TILE.get(row.tile);
  if (dialect === null || !node || node.depletedTile === null) return [];
  const scarTile = node.depletedTile;
  if (dialect === 'tree') {
    const stages: GrowthStage[] = [
      {
        state: GROWTH_SCAR,
        tile: scarTile,
        wait: growWait(seed, ST_GROW_SCAR, row.tx, row.ty, row.firstSeenAt, GROWTH.treeStumpMinutes),
      },
      {
        state: GROWTH_BARE,
        tile: Tile.Grass,
        wait: growWait(seed, ST_GROW_BARE, row.tx, row.ty, row.firstSeenAt, GROWTH.treeBareMinutes),
      },
    ];
    const sapling = saplingOf(row.tile);
    if (sapling !== null) {
      stages.push({
        state: GROWTH_SAPLING,
        tile: sapling,
        wait: growWait(
          seed,
          ST_GROW_SAPLING,
          row.tx,
          row.ty,
          row.firstSeenAt,
          GROWTH.treeSaplingMinutes,
        ),
      });
    }
    return stages;
  }
  const range = dialect === 'ore' ? GROWTH.oreReopenMinutes : GROWTH.forageMinutes;
  return [
    {
      state: GROWTH_SCAR,
      tile: scarTile,
      wait: growWait(seed, ST_GROW_SCAR, row.tx, row.ty, row.firstSeenAt, range),
    },
  ];
}

/** The tile a row shows at its STORED checkpoint state — the beat's
 *  "did the world move on under me" guard reads this. */
export function growthTileForState(seed: number, row: GrowthRow): Tile {
  const stages = stagesFor(seed, row);
  const stage = stages.find((s) => s.state === row.state);
  return stage?.tile ?? row.tile;
}

/**
 * THE PURE WALK: project a row forward to `now` from its stored
 * checkpoint. Deterministic — the same row and clock always land on
 * the same age, however many times (and on however many machines) the
 * question is asked. A row whose dialect has left the roster (a def
 * edit) projects straight to healed rather than haunting the ledger.
 */
export function projectGrowth(seed: number, row: GrowthRow, now: number): GrowthProjection {
  const stages = stagesFor(seed, row);
  if (stages.length === 0) {
    return { state: row.state, tile: row.tile, stateSince: row.since, due: null };
  }
  let idx = stages.findIndex((s) => s.state === row.state);
  if (idx === -1) idx = 0;
  let since = row.since;
  while (idx < stages.length) {
    const stage = stages[idx]!;
    const end = since + stage.wait;
    if (now < end) return { state: stage.state, tile: stage.tile, stateSince: since, due: end };
    since = end;
    idx++;
  }
  const last = stages[stages.length - 1]!;
  return { state: last.state, tile: row.tile, stateSince: since, due: null };
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
  });
}

// The shipped seed must satisfy its own law — loudly, at build time.
{
  const res = validateGrowth(AUTHORED_GROWTH);
  if (!res.ok) throw new Error(`shipped GROWTH dials invalid:\n  ${res.errors.join('\n  ')}`);
}

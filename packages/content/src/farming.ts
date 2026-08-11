import { CROPS, type CropDef } from './crops.js';

/**
 * THE LIVING SOIL (farming v2 Phase 1) — the care model.
 *
 * Every fact here is deterministic and lives on the crop row (the
 * one-ledger law). QUALITY IS EARNED, NEVER ROLLED: the same care in
 * gives the same grade out, every time, with no dice anywhere — the
 * flood law's spirit applied to the field.
 */

/** Produce grades. Index IS the tier; order is forever. */
export const GRADE_NAMES = ['', 'Fine', 'Prime'] as const;

export type Grade = 0 | 1 | 2;

/**
 * Sell-value multiplier per grade. Applied at DEF GENERATION time
 * (graded goods are their own item defs, the scroll pattern) — never
 * derived at sell time, so the shop, the card, and the ledger all
 * read one authored number.
 */
export const GRADE_VALUE_MULT = [1, 1.35, 1.8] as const;

/** Grade id suffixes: `<base>_fine`, `<base>_prime`. */
const GRADE_SUFFIX = ['', '_fine', '_prime'] as const;

export function gradedId(base: string, grade: Grade): string {
  return `${base}${GRADE_SUFFIX[grade]}`;
}

/**
 * Every base produce id that grows graded variants: the tilled-bed
 * crop yields plus the yard's livestock produce (Phase 3 — the byre
 * grades like the field). Log-bed crops are excluded by law — the
 * dark bed earns no care facts, so its reagents never wear a grade.
 * The livestock list is inlined here (not imported) so farming.ts
 * stays at the bottom of the content import graph; livestock.test.ts
 * pins the two lists against each other.
 */
export const LIVESTOCK_GRADED: readonly string[] = ['egg', 'milk', 'wool', 'truffle'];

export const GRADED_PRODUCE: ReadonlySet<string> = new Set([
  ...[...CROPS.values()].filter((d: CropDef) => d.bed !== 'log').map((d: CropDef) => d.yield.item),
  ...LIVESTOCK_GRADED,
]);

/**
 * Read an item id back to its produce family. Non-produce ids come
 * back unchanged at grade 0 — callers can feed any id through.
 */
export function gradeOf(id: string): { base: string; grade: Grade } {
  for (const grade of [2, 1] as const) {
    const suffix = GRADE_SUFFIX[grade];
    if (id.endsWith(suffix)) {
      const base = id.slice(0, -suffix.length);
      if (GRADED_PRODUCE.has(base)) return { base, grade };
    }
  }
  return { base: id, grade: 0 };
}

/** Soil tiers on a crop row. */
export const SOIL_PLAIN = 0;
export const SOIL_ENRICHED = 1;
export const SOIL_RICH = 2;

/** How many of the two waterable stages this row was watered in. */
export function wateringsOf(wateredMask: number): number {
  return (wateredMask & 1) + ((wateredMask >> 1) & 1);
}

/**
 * THE CARE FOLD — the one place a harvest's grade is decided.
 *
 * Care score = waterings (0..2) + soil tier (0..2) + mulch (0..1)
 * + prune (0..1, recurring crops only — Phase 2). Prime wants 4,
 * fine wants 2, and there is deliberately more than one road to
 * each: rich soil and a watered life; enriched soil, water, and a
 * mulch blanket; a pruned orchard over fed ground. An orchard cycle
 * can only earn ONE watering (the mid stage is its whole life), so
 * the prune point is what keeps prime reachable there.
 */
export function gradeFor(waterings: number, soil: number, mulched: number, pruned = 0): Grade {
  const score = waterings + soil + (mulched ? 1 : 0) + (pruned ? 1 : 0);
  if (score >= 4) return 2;
  if (score >= 2) return 1;
  return 0;
}

/** The watered-mask bit that records a cycle's prune (bits 0/1 = water). */
export const PRUNED_BIT = 4;

/** Plant fibre laid per mulching. */
export const MULCH_FIBRE_COST = 2;

/**
 * THE WELL'S REACH: a well within this range (chebyshev) of the plot
 * being watered turns one hand-watering into a 3x3 bed sweep. Each
 * plot watered pays its own tending XP — the well saves time, never
 * changes the lesson's worth.
 */
export const WELL_SWEEP_RANGE = 6;

/** The sweep's half-width: 1 = the 3x3 bed around the aimed plot. */
export const WELL_SWEEP_RADIUS = 1;

/**
 * THE FED CHANNEL: an irrigation channel is live when a well stands
 * within this range of it (chebyshev), and a live channel waters the
 * crops beside it (adjacent, chebyshev 1) at each stage on the crop
 * beat. Auto-watering pays NO XP — automation trades the lesson for
 * the convenience, by law.
 */
export const CHANNEL_FEED_RANGE = 6;

/**
 * THE COMPOST BATCH — the bin's whole contract.
 *
 * Scraps carry WORTH; when a bin's fill reaches the batch, the lid
 * closes and the heap works for COMPOST_MINUTES of wall clock (pure
 * clock read at collect — the station works while you wander, no
 * tick owns it). Output is compost, or prime compost when at least
 * COMPOST_PRIME_WORTH of the batch arrived as graded goods: good
 * harvests feed richer ground, deterministically.
 */
export const COMPOST_BATCH_WORTH = 8;
export const COMPOST_MINUTES = 30;
export const COMPOST_PRIME_WORTH = 4;

/** Farming XP for turning out a finished batch. */
export const COMPOST_COLLECT_XP = 15;

/**
 * What a compost bin accepts, and what it counts for. Deliberately an
 * explicit door, not a heals-sniffing heuristic: bottled brews, gear,
 * and quest goods must never fall in by accident.
 *
 * Returns null for refuse-at-the-door items.
 */
export function compostWorthOf(
  id: string,
  def: { heals?: number; gear?: unknown; buff?: unknown; coating?: unknown; quest?: unknown } | undefined,
): { worth: number; graded: number } | null {
  if (!def) return null;
  if (def.gear || def.buff || def.coating || def.quest) return null;
  const { base, grade } = gradeOf(id);
  // Produce (any grade): worth grows with the grade — a prime carrot
  // carries three scraps' goodness into the heap.
  if (GRADED_PRODUCE.has(base)) {
    const worth = 1 + grade;
    return { worth, graded: grade > 0 ? worth : 0 };
  }
  if (id.endsWith('_seed')) return { worth: 1, graded: 0 };
  // Raw larder goods (raw_beef, raw_trout, ...) compost like any
  // kitchen scrap even though they carry no heals of their own.
  if (id.startsWith('raw_')) return { worth: 1, graded: 0 };
  if (id === 'burnt_food') return { worth: 1, graded: 0 };
  if (id === 'berries' || id === 'plant_fibre') return { worth: 1, graded: 0 };
  // Bottled workings are never scraps, even the heals-only ones
  // (healing_tincture carries no buff facet to catch on) — the
  // brewer's naming contract IS the door, and farming.test.ts pins
  // every shipped bottle against it.
  if (/_(tincture|tonic|brew|salve|oil)$/.test(id)) return null;
  // Plain solid food (raw or cooked) composts; bottled things never
  // reach here (the doors above).
  if (def.heals !== undefined) return { worth: 1, graded: 0 };
  return null;
}

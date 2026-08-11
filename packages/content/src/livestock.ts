/**
 * THE ANIMALS OF THE YARD (farming v2 Phase 3) — kept livestock.
 *
 * Deliberately NOT pets: no combat, no following, no taming cast —
 * a parallel lane beside the TAMES whitelist, which stays
 * companion-only forever. A yard animal is bought young at the
 * drover's, released at your OWN feed trough, and lives there: it
 * grazes its ring, cannot be harmed, and never dies (CARE IS ALWAYS
 * A GIFT — an unfed animal produces plain at the wild pace and
 * suffers nothing).
 *
 * THE YARD REGISTRY IS THE ONLY PAYER: produce verbs read THIS
 * table, never NpcDef.produce — so a wild boar offers no Snuffle
 * prompt and a town cow keeps its own old milking law untouched.
 */

import { gradeFor, type Grade } from './farming.js';

export interface LivestockDef {
  /** NpcDef id — the body and the name the world already knows. */
  species: string;
  name: string;
  /** Beastcraft level to release one at your trough. */
  levelReq: number;
  /** The crated young sold at the drover's; using it does the release. */
  crateItem: string;
  produce: {
    item: string;
    cooldownSec: number;
    xp: number;
    /** The spoken verb on the prompt: Milk / Shear / Gather / Snuffle. */
    verb: string;
  };
  flavor: string;
}

/**
 * The Phase 3 roster rides EXISTING bodies only (the rig-lab law: a
 * new species is a bespoke fur-dialect work, not a phase rider):
 * the RAM is the wool-bearer — a boxy fleece loaf that shears
 * honestly — and the yard BOAR is the truffle pig, as every
 * medieval sty would recognize. The goat waits for THE WORKING
 * YARD's churn, where a bespoke body can be done right.
 */
const defs: LivestockDef[] = [
  {
    species: 'chicken',
    name: 'Chicken',
    levelReq: 1,
    crateItem: 'chick_crate',
    produce: { item: 'egg', cooldownSec: 240, xp: 6, verb: 'Gather' },
    flavor: 'A kept hen lays for the hand that keeps her.',
  },
  {
    species: 'cow',
    name: 'Cow',
    levelReq: 1,
    crateItem: 'calf_crate',
    produce: { item: 'milk', cooldownSec: 240, xp: 8, verb: 'Milk' },
    flavor: 'The yard\'s quiet fortune, one pail at a time.',
  },
  {
    species: 'ram',
    name: 'Ram',
    levelReq: 10,
    crateItem: 'lamb_crate',
    produce: { item: 'wool', cooldownSec: 300, xp: 10, verb: 'Shear' },
    flavor: 'Wool to the shears, patience to the keeper.',
  },
  {
    species: 'boar',
    name: 'Boar',
    levelReq: 35,
    crateItem: 'boarlet_crate',
    produce: { item: 'truffle', cooldownSec: 600, xp: 20, verb: 'Snuffle' },
    flavor: 'It smells what the ground hides and shares on its own terms.',
  },
];

export const LIVESTOCK: ReadonlyMap<string, LivestockDef> = new Map(
  defs.map((d) => [d.species, d]),
);

export const LIVESTOCK_BY_CRATE: ReadonlyMap<string, LivestockDef> = new Map(
  defs.map((d) => [d.crateItem, d]),
);

/** The yard's produce items — they grade like the field's harvests. */
export const LIVESTOCK_PRODUCE_ITEMS: readonly string[] = defs.map((d) => d.produce.item);

/** Animals a character may keep, across every trough. */
export const LIVESTOCK_CAP = 8;

/** Animals one trough anchors, and the ring they graze (chebyshev). */
export const TROUGH_STOCK_CAP = 4;
export const TROUGH_RANGE = 5;

/** Feed measures one trough holds. */
export const TROUGH_FEED_CAP = 12;

/**
 * What a trough accepts, and for how many measures. Barley is THE
 * feed grain (the keg's grain feeds the yard first); plain produce
 * serves at one measure; graded produce carries its grade in, the
 * compost door's law spoken at the manger. Everything else refused.
 */
export function feedWorthOf(
  id: string,
  gradeOfId: (id: string) => { base: string; grade: Grade },
  isProduce: (base: string) => boolean,
): number | null {
  const { base, grade } = gradeOfId(id);
  if (base === 'barley') return 2 + grade;
  if (isProduce(base)) return 1 + grade;
  return null;
}

/**
 * A fed collection halves nothing and hurries much: the NEXT wait
 * runs at three quarters. Automation never enters the yard — the
 * hand feeds, the hand collects.
 */
export const FED_COOLDOWN_MULT = 0.75;

/** The brush moment: pet-bond cadence, positive-only. */
export const BRUSH_COOLDOWN_MS = 240_000;
export const BRUSH_XP = 4;
export const BOND_CAP = 10;

/** Bond tiers toward the fold: 3 warms it, 7 makes it shine. */
export const BOND_FINE = 3;
export const BOND_PRIME = 7;

export function bondTier(bond: number): 0 | 1 | 2 {
  if (bond >= BOND_PRIME) return 2;
  if (bond >= BOND_FINE) return 1;
  return 0;
}

/**
 * THE YARD'S CARE FOLD — the field's own fold, spoken at the byre:
 * a fed collection is worth two care points (the trough is the
 * yard's soil), the bond tier rides beside it. Fed alone reaches
 * fine; fed plus a loved animal reaches prime. Deterministic,
 * never rolled.
 */
export function livestockGrade(fed: boolean, bond: number): Grade {
  return gradeFor(fed ? 2 : 0, bondTier(bond), 0);
}

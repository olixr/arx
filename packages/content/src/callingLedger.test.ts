import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALLING_LADDER_SEATS,
  FOCUS_BASE,
  FOCUS_MILESTONES,
  SKILL_IDS,
  STATUS_BOOK,
  SWING_MULT_MAX,
  callingCost,
  focusBudget,
  statusSwingFactor,
  xpForLevel,
} from '@arx/shared';
import { ABILITIES } from './abilities.js';
import { ITEMS } from './items.js';
import { CALLINGS, CALLING_LICENSES, CALLING_MAX_RANK, callingsFor, honedCalling } from './callings.js';
import { ladderFaults } from './callingLaws.js';

/**
 * THE LEDGER (callings-v2 Phase 6, kept through THE FILLED HALL) — the
 * epic's constitution and the CONTRACT the content epoch authored
 * against. The per-package arithmetic (THE FELT FLOORS, THE PROC
 * BUDGET, the register/book agreement, RANK IS DEPTH) moved into
 * callingLaws.ts so the authoring CLI and the suites read ONE truth;
 * this file keeps the hall-wide sums that only make sense over the
 * whole roster — THE SWING ASSEMBLY and THE ECONOMY — and binds the
 * laws over every ladder at every rank.
 */

// -------------------------------------------------- the swing assembly

test('THE SWING ASSEMBLY, calling sources in the stack: the worst fold lands inside the band', () => {
  const pageMax = statusSwingFactor([
    { id: 'quicken', power: 0, ticksLeft: 1, stacks: STATUS_BOOK.quicken.stacking.max },
  ]);
  let shelfMax = 1;
  for (const [, item] of ITEMS) shelfMax = Math.max(shelfMax, item.buff?.attackSpeedMult ?? 1);
  let artMax = 1;
  for (const [, ab] of ABILITIES) artMax = Math.max(artMax, ab.self?.attackSpeedMult ?? 1);
  // The character axis: gear-lane swingSpeed pct (additive into the
  // gear mult, per the fold) summed over the DEEPEST rank of every
  // calling — an unaffordable stack, priced as the worst case on
  // purpose — and the largest when-grant attackSpeedMult, multiplied.
  let gearPct = 0;
  let whenMax = 1;
  for (const [, def] of CALLINGS) {
    const deepest = honedCalling(def, CALLING_MAX_RANK);
    for (const fx of deepest) {
      if (fx.kind === 'gear' && fx.effect.kind === 'swingSpeed') gearPct += fx.effect.pct;
      if (fx.kind === 'when') whenMax = Math.max(whenMax, fx.grant.attackSpeedMult ?? 1);
    }
  }
  const assembly = pageMax * shelfMax * artMax * (1 + gearPct / 100) * whenMax;
  assert.ok(
    assembly <= SWING_MULT_MAX,
    `the full authored assembly (callings in) folds to ${assembly.toFixed(3)} — the band is being LEANED ON`,
  );
});

// -------------------------------------------------------- the economy

test('THE ECONOMY: the worked archetypes hold under the v2 curve and the seat bands', () => {
  // A fresh hand at combat 25 holds budget 3: two minors and a third
  // to covet.
  const fresh = focusBudget({ combat: xpForLevel(25) });
  assert.equal(fresh, FOCUS_BASE + 1);
  assert.ok(fresh >= 3, 'a fresh hand holds two minors and covets a third');
  // The specialist: one 99 + two 50s = 2 + 4 + 2 + 2 = 10.
  const specialist = focusBudget({ onehand: xpForLevel(99), mining: xpForLevel(50), smithing: xpForLevel(50) });
  assert.equal(specialist, FOCUS_BASE + FOCUS_MILESTONES.length + 4);
  // The completionist: 102 against the whole hall at Rank I holds a
  // small share — the class stays a choice at every hour of play.
  const all: Record<string, number> = {};
  for (const s of SKILL_IDS) all[s] = xpForLevel(99);
  const ceiling = focusBudget(all);
  assert.equal(ceiling, 102);
  // THE FILLED HALL: sixteen seats a ladder (7 x 1 + 8 x 2 + 1 x 3 = 26
  // per skill, 650 across the hall) — the ceiling holds about a sixth.
  let fullWorldRankI = 0;
  for (const [, def] of CALLINGS) fullWorldRankI += def.focusCost;
  const share = ceiling / fullWorldRankI;
  assert.ok(share >= 0.12 && share <= 0.3, `the ceiling holds ${(share * 100).toFixed(0)}% of the world`);
  // A single seat deepened to IV costs seat + 3 — a capstone at IV
  // is a fifth of a fresh mastery's budget, never the whole of it.
  assert.equal(callingCost(3, CALLING_MAX_RANK), 6);
  assert.ok(callingCost(3, CALLING_MAX_RANK) < FOCUS_BASE + FOCUS_MILESTONES.length * 2);
});

test('THE FILLED HALL is inside the ledger: every ladder silent under the laws at every rank', () => {
  const hall = [...CALLINGS.values()];
  for (const s of SKILL_IDS) {
    const defs = callingsFor(s);
    const licenses = CALLING_LICENSES.filter((r) => defs.some((d) => d.id === r.calling));
    assert.deepEqual(ladderFaults(s, defs, licenses, hall), [], `${s}`);
  }
  assert.equal(CALLINGS.size, SKILL_IDS.length * CALLING_LADDER_SEATS);
});

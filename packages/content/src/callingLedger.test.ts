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

// THE SWING ASSEMBLY USED TO LIVE HERE, and that was the bug.
//
// This file assembled page x shelf x art x CALLINGS and stopped at
// the gear lane; statusLedger.test.ts assembled page x shelf x art x
// GEAR and stopped at the callings. Both were green. The engine
// multiplies across both at one pay site, so the true fold was never
// tested by anything: seven co-held when-clauses alone reached 1.620,
// and a live desperate fight reached 2.17 against a 1.5 clamp, which
// the clamp then swallowed in silence.
//
// Worse, the assembly here took Math.max over the when-grants where
// the engine takes their PRODUCT — the one line that made the
// overflow invisible from this side.
//
// THE LAW THAT REPLACES IT: any budget the engine multiplies at ONE
// pay site is pinned by exactly ONE test. The swing assembly is now
// whole, and it lives in statusLedger.test.ts beside the page and the
// shelf it shares the band with. The calling channel's own hard stop
// is CALLING_SWING_CAP, pinned in buffForge.test.ts where the fold
// itself lives.

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

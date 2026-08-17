import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
import {
  CALLINGS,
  CALLING_MAX_RANK,
  callingsFor,
  honedCalling,
  type CallingDef,
  type CallingEffect,
} from './callings.js';
import { procMismatch, type ProcEffect } from './equipment/enchants.js';

/**
 * THE LEDGER (callings-v2 Phase 6) — the epic's constitution, and the
 * CONTRACT the content epoch authors against. Every pin below reads
 * the LIVE roster at every rank step, so the first authored package
 * that leans on a channel answers here, not in a player's hands.
 * PURE PLATFORM this epoch: the pins hold trivially over the frozen
 * fifty-three and BIND the moment the register opens.
 *
 * Part 4 of the plan, made arithmetic:
 *  - THE FELT FLOORS: a Calling BENDS A DECISION — a dial entry moves
 *    at least its channel's floor, or the package carries a verb (a
 *    proc, a when clause, a trade rhythm, a licensed art).
 *  - THE PROC BUDGET: at most ONE proc per package (the moment stays a
 *    moment); damage moments rest ≥ 8s; cadences ≥ every 4th; stacks
 *    meters 4..8; every proc passes procMismatch at load.
 *  - THE SWING ASSEMBLY, calling sources IN the stack: the worst
 *    authored fold — page × shelf × art × gear-lane callings × when
 *    grants — must land inside the band before the clamp.
 *  - RANK IS DEPTH: a rank step must CHANGE the package, and the mature
 *    package (IV) may not exceed ~2.5× rank I on any single dial —
 *    honed depth, never a different calling.
 *  - THE ECONOMY: the worked archetypes hold — a fresh hand can hold
 *    two minors and covet a third; a maxed account holds ~a fifth of
 *    a full ten-seat world.
 */

// ---------------------------------------------------- the felt floors

/** Minimum magnitude per gear channel for a dial-only package to be FELT. */
const FELT: Record<string, number> = {
  armor: 4,
  styleDmg: 6, // pct
  elementDmg: 6, // pct
  speed: 5, // pct
  crit: 2, // pct (a whetstone's worth — the shipped floor)
  regen: 1, // per 4s
  cooldown: 5, // pct
  maxHp: 6,
  skill: 3,
  thorns: 3,
  swingSpeed: 5, // pct
  vsState: 6, // pct
  onKillHaste: 10, // ticks
};

const VERB_KINDS = new Set(['proc', 'when', 'art', 'doubleGather', 'materialSave', 'craftSpeed', 'gatherSpeed', 'perPiece', 'perk']);

function gearMagnitude(fx: Extract<CallingEffect, { kind: 'gear' }>): [string, number] | null {
  const e = fx.effect;
  switch (e.kind) {
    case 'armor':
    case 'regen':
    case 'maxHp':
    case 'skill':
    case 'thorns':
      return [e.kind, e.amount];
    case 'styleDmg':
    case 'elementDmg':
    case 'speed':
    case 'crit':
    case 'cooldown':
    case 'swingSpeed':
    case 'vsState':
      return [e.kind, e.pct];
    case 'onKillHaste':
      return [e.kind, e.ticks];
    default:
      return null;
  }
}

function everyPackage(def: CallingDef): Array<[number, readonly CallingEffect[]]> {
  const out: Array<[number, readonly CallingEffect[]]> = [];
  for (let r = 1; r <= CALLING_MAX_RANK; r++) out.push([r, honedCalling(def, r)]);
  return out;
}

test('THE FELT FLOORS: every package bends a decision — a felt dial, or a verb', () => {
  for (const [id, def] of CALLINGS) {
    for (const [rank, pkg] of everyPackage(def)) {
      const hasVerb = pkg.some((fx) => VERB_KINDS.has(fx.kind));
      const felt = pkg.some((fx) => {
        if (fx.kind !== 'gear') return false;
        const m = gearMagnitude(fx);
        return m !== null && m[1] >= (FELT[m[0]] ?? Infinity);
      });
      assert.ok(
        hasVerb || felt,
        `${id} rank ${rank} moves nothing a player can feel and carries no verb`,
      );
    }
  }
});

// ---------------------------------------------------- the proc budget

const PROC_DAMAGE_REST_MIN = 160; // 8s
const CADENCE_MIN = 4;
const STACKS_MIN = 4;
const STACKS_MAX = 8;

function procsOf(pkg: readonly CallingEffect[]): ProcEffect[] {
  return pkg.flatMap((fx) => (fx.kind === 'proc' ? [fx.proc] : []));
}

test('THE PROC BUDGET: one moment per package, rested, rhythmic, and firable', () => {
  for (const [id, def] of CALLINGS) {
    for (const [rank, pkg] of everyPackage(def)) {
      const procs = procsOf(pkg);
      assert.ok(procs.length <= 1, `${id} rank ${rank} carries ${procs.length} procs — the moment stays a moment`);
      for (const p of procs) {
        assert.equal(procMismatch(p), null, `${id} rank ${rank}: ${procMismatch(p)}`);
        const dealsDamage = p.action.do === 'bolt' || p.action.do === 'nova' || p.action.do === 'chain';
        if (dealsDamage) {
          assert.ok(p.icd >= PROC_DAMAGE_REST_MIN, `${id} rank ${rank} damage moment rests ${p.icd}t (< ${PROC_DAMAGE_REST_MIN})`);
        }
        assert.ok(p.icd > 0, `${id} rank ${rank} proc has no rest — a texture, not a moment`);
        if (p.trigger.on === 'cadence') {
          assert.ok(p.trigger.every >= CADENCE_MIN, `${id} rank ${rank} cadence every ${p.trigger.every} is a texture`);
        }
        if (p.trigger.on === 'stacks') {
          assert.ok(
            p.trigger.count >= STACKS_MIN && p.trigger.count <= STACKS_MAX,
            `${id} rank ${rank} meter of ${p.trigger.count} is outside ${STACKS_MIN}..${STACKS_MAX}`,
          );
        }
        // A calling's proc names its own working — never a gear id it
        // would silently share a meter with.
        assert.ok(p.id.length > 0 && p.name.length > 0, `${id} rank ${rank} proc is nameless`);
      }
    }
  }
});

test('the register and the book agree: every page a calling touches exists', () => {
  for (const [id, def] of CALLINGS) {
    for (const [rank, pkg] of everyPackage(def)) {
      for (const fx of pkg) {
        const ids: string[] = [];
        if (fx.kind === 'proc') {
          const t = fx.proc.trigger;
          const a = fx.proc.action;
          if (t.on === 'stateApplied' || t.on === 'hitState') ids.push(t.status);
          if (a.do === 'status' || a.do === 'boon') ids.push(a.status);
        }
        if (fx.kind === 'when' && fx.cond.when === 'stateRiding') ids.push(fx.cond.status);
        if (fx.kind === 'gear' && (fx.effect.kind === 'vsState' || fx.effect.kind === 'onHitStatus')) {
          ids.push(fx.effect.status);
        }
        for (const s of ids) assert.ok(s in STATUS_BOOK, `${id} rank ${rank} names an unwritten page '${s}'`);
      }
    }
  }
});

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

// ------------------------------------------------------- rank is depth

test('RANK IS DEPTH: each authored step changes the package; the mature form stays a deepening', () => {
  const dialOf = (fx: CallingEffect): [string, number] | null => {
    if (fx.kind === 'gear') return gearMagnitude(fx);
    if (fx.kind === 'perk') return [`perk:${fx.perk}`, fx.magnitude];
    if (fx.kind === 'doubleGather' || fx.kind === 'materialSave') return [`${fx.kind}:${fx.skill}`, fx.chance];
    if (fx.kind === 'gatherSpeed' || fx.kind === 'craftSpeed') return [`${fx.kind}:${fx.skill}`, fx.mult];
    return null;
  };
  for (const [id, def] of CALLINGS) {
    if (!def.ranks) continue;
    let prev = JSON.stringify(def.effects);
    for (let i = 0; i < def.ranks.length; i++) {
      const cur = JSON.stringify(def.ranks[i]!.effects);
      assert.notEqual(cur, prev, `${id} rank ${i + 2} step changes nothing`);
      assert.ok(def.ranks[i]!.note.length > 0 && def.ranks[i]!.note.length <= 90, `${id} rank note`);
      prev = cur;
    }
    // Any dial present at both I and IV may deepen to at most 2.5× —
    // past that it is a different calling wearing the same name.
    const base = new Map<string, number>();
    for (const fx of def.effects) {
      const d = dialOf(fx);
      if (d) base.set(d[0], d[1]);
    }
    for (const fx of honedCalling(def, CALLING_MAX_RANK)) {
      const d = dialOf(fx);
      if (!d || !base.has(d[0])) continue;
      const b = base.get(d[0])!;
      // Multipliers below 1 (craftSpeed, produceRestMult…) deepen DOWN.
      const ratio = b < 1 && d[1] < 1 ? (1 - d[1]) / Math.max(1e-6, 1 - b) : d[1] / Math.max(1e-6, b);
      assert.ok(ratio <= 2.5, `${id} dial ${d[0]} climbs ${ratio.toFixed(2)}× I→IV — a different calling, not a deepening`);
    }
  }
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
  // The completionist: 102 against a full ten-seat world at Rank I
  // (1+1+1+2+2+2+2+3+3+3 = 20 per skill × 25 = 500) holds about a
  // fifth — the class stays a choice at every hour of play.
  const all: Record<string, number> = {};
  for (const s of SKILL_IDS) all[s] = xpForLevel(99);
  const ceiling = focusBudget(all);
  assert.equal(ceiling, 102);
  const fullWorldRankI = SKILL_IDS.length * (1 + 1 + 1 + 2 + 2 + 2 + 2 + 3 + 3 + 3);
  const share = ceiling / fullWorldRankI;
  assert.ok(share >= 0.15 && share <= 0.3, `the ceiling holds ${(share * 100).toFixed(0)}% of the world`);
  // A single seat deepened to IV costs seat + 3 — a capstone at IV
  // is a fifth of a fresh mastery's budget, never the whole of it.
  assert.equal(callingCost(3, CALLING_MAX_RANK), 6);
  assert.ok(callingCost(3, CALLING_MAX_RANK) < FOCUS_BASE + FOCUS_MILESTONES.length * 2);
});

test('the shipped roster is inside the ledger today (the frozen fifty-three answer trivially)', () => {
  // Every skill still owes its founding pair; no seat past the frame.
  for (const s of SKILL_IDS) assert.ok(callingsFor(s).length >= 2, `${s} lost its pair`);
  assert.equal(CALLINGS.size, SKILL_IDS.length * 2 + 3);
});

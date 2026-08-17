/**
 * THE ANSWERED LIFE's contract — THE FILLED HALL edition. Every rule a
 * ladder must satisfy lives ONCE in callingLaws.ts (the suites and the
 * authoring CLI read the same functions); this file asserts the live
 * hall is silent under those laws, pins the hall's shape, and keeps
 * the honed-clock and fold-law pins the platform epic wrote.
 *
 * CONSCIOUS-REWRITE LEDGER: rewritten for Phase 1 (THE PACKAGE OPENS)
 * and again for THE FILLED HALL (the content epoch): the founding-pair
 * count pin, THE DECADE FRAME, the one-entry pin, and the
 * reserved-lanes tripwire were RETIRED DELIBERATELY here — the register
 * is open, every lane authors, every ladder holds sixteen honed seats.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALLING_SEATS, CALLING_LADDER_SEATS, SKILL_IDS } from '@arx/shared';
import {
  CALLINGS,
  CALLING_LICENSES,
  callingsFor,
  callingRank,
  honedCalling,
  CALLING_MAX_RANK,
  PERK_FOLD,
  type CallingDef,
} from './callings.js';
import { FOUNDING_SEATS, ladderFaults } from './callingLaws.js';

test('THE LAWS OF THE HALL: every ladder is silent under callingLaws', () => {
  const hall = [...CALLINGS.values()];
  for (const skill of SKILL_IDS) {
    const defs = callingsFor(skill);
    const licenses = CALLING_LICENSES.filter((r) => defs.some((d) => d.id === r.calling));
    assert.deepEqual(ladderFaults(skill, defs, licenses, hall), [], `${skill} ladder faults`);
  }
});

test('THE SIXTEEN RUNGS: the hall holds 25 ladders x 16 seats on 5..80 by fives', () => {
  assert.equal(CALLING_LADDER_SEATS, 16);
  assert.deepEqual([...CALLING_SEATS], [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]);
  assert.equal(CALLINGS.size, SKILL_IDS.length * CALLING_LADDER_SEATS);
  for (const skill of SKILL_IDS) {
    const seats = callingsFor(skill)
      .map((c) => c.unlockLevel)
      .sort((a, b) => a - b);
    assert.deepEqual(seats, [...CALLING_SEATS], `${skill} sits on every rung once`);
  }
});

test('THE NO-LOSS LAW: every founding row stands at its seat with its price', () => {
  for (const [id, [skill, seat]] of FOUNDING_SEATS) {
    const def = CALLINGS.get(id);
    assert.ok(def, `founding row ${id} missing`);
    assert.equal(def.skill, skill, `${id} skill`);
    assert.equal(def.unlockLevel, seat, `${id} seat`);
  }
});

test('every license row belongs to a living calling', () => {
  for (const r of CALLING_LICENSES) assert.ok(CALLINGS.has(r.calling), `orphan license row for ${r.calling}`);
});

test('EVERY FOLD IS DECLARED: each perk dial a Calling touches has its law', () => {
  // The Record<PerkId, PerkFoldLaw> type makes the table total at
  // compile time; this pin keeps the runtime story honest for every
  // dial actually in play, and documents the two special laws.
  const laws = new Set(['sum', 'mult', 'max', 'min']);
  for (const [id, def] of CALLINGS) {
    for (const fx of def.effects) {
      if (fx.kind !== 'perk') continue;
      assert.ok(laws.has(PERK_FOLD[fx.perk]), `${id} dial ${fx.perk} declares no fold law`);
    }
  }
  assert.equal(PERK_FOLD.offhandDelayTicks, 'min', 'the tightest echo wins');
  assert.equal(PERK_FOLD.drawMoveFactor, 'max', 'the highest floor wins');
});

test('the honed clocks answer for Callings: entitlement by surplus, package by step', () => {
  // Synthetic defs, no registry (the statusBook purity discipline).
  const base: CallingDef = {
    id: 'test_seat',
    skill: 'mining',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Test Seat',
    desc: 'A synthetic calling for the clock laws.',
    color: '#888888',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 2 }],
  };
  // Below the seat: no entitlement. At it: rank I. The honed strides
  // (15 for anchors under 54) climb II/III/IV at 35/50/65.
  assert.equal(callingRank(base, 19), 0);
  assert.equal(callingRank(base, 20), 1);
  assert.equal(callingRank(base, 34), 1);
  assert.equal(callingRank(base, 35), 2);
  assert.equal(callingRank(base, 50), 3);
  assert.equal(callingRank(base, 65), 4);
  assert.equal(callingRank(base, 99), CALLING_MAX_RANK);

  // An unranked def holds its package at every rank.
  assert.equal(honedCalling(base, 1), base.effects);
  assert.equal(honedCalling(base, 4), base.effects);

  // A rank step replaces the package WHOLE; past the authored steps
  // the deepest step holds (the honedAbility clamp).
  const stepII = { note: 'Deeper.', effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 4 }] } as const;
  const stepIII = { note: 'Deeper still.', effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }] } as const;
  const stepIV = {
    note: 'The stone answers.',
    effects: [
      { kind: 'perk', perk: 'stillArmor', magnitude: 8 },
      { kind: 'gear', effect: { kind: 'armor', amount: 2 } },
    ],
  } as const;
  const ranked: CallingDef = { ...base, ranks: [stepII, stepIII, stepIV] };
  assert.equal(honedCalling(ranked, 0), ranked.effects);
  assert.equal(honedCalling(ranked, 1), ranked.effects);
  assert.equal(honedCalling(ranked, 2), stepII.effects);
  assert.equal(honedCalling(ranked, 3), stepIII.effects);
  assert.equal(honedCalling(ranked, 4), stepIV.effects);
  assert.equal(honedCalling(ranked, 9), stepIV.effects, 'past the steps, the deepest holds');
});

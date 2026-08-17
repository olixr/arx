/**
 * THE ANSWERED LIFE's contract (callings-v2-plan.md, Phase 1): every
 * skill keeps its founding pair, every package speaks licensed
 * shapes, every perk dial declares its fold law, the reserved lanes
 * stay unread until their phases, and the honed clocks answer for
 * calling ranks exactly as they answer for arts.
 *
 * CONSCIOUS-REWRITE LEDGER: this file was rewritten for Phase 1
 * (THE PACKAGE OPENS — `effect` became `effects[]`, byte-identical).
 * The count pin, the reserved-lane pins, and the one-entry pin are
 * tripwires: Phase 2/3 and the content epoch rewrite them
 * deliberately, never casually.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_IDS } from '@arx/shared';
import {
  CALLINGS,
  callingsFor,
  callingRank,
  honedCalling,
  isAggregateCallingEffect,
  CALLING_MAX_RANK,
  PERK_FOLD,
  type CallingDef,
} from './callings.js';
import { ITEMS } from './items.js';

test('every skill carries its founding pair at 20 and 60 (the wave may add more)', () => {
  // THE GREEN ARTS wave amended the exactly-two law: the 20/60 pair
  // is the FLOOR every skill owes; deep-ladder extras (35/45) are
  // allowed and cost by the focus law below.
  for (const skill of SKILL_IDS) {
    const list = callingsFor(skill);
    assert.ok(list.length >= 2, `${skill} needs its founding pair`);
    const levels = list.map((c) => c.unlockLevel).sort((a, b) => a - b);
    assert.ok(levels.includes(20) && levels.includes(60), `${skill} pair sits at 20 and 60`);
    assert.equal(new Set(levels).size, levels.length, `${skill} stacks two Callings on one rung`);
  }
  // The founding pairs plus THE GREEN ARTS wave's three extras.
  assert.equal(CALLINGS.size, SKILL_IDS.length * 2 + 3);
});

test('Calling ids are unique, named, and honestly described', () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const seen = new Set<string>();
  for (const [id, def] of CALLINGS) {
    assert.equal(id, def.id);
    assert.ok(!seen.has(id), `duplicate calling id ${id}`);
    seen.add(id);
    assert.ok(def.name.length > 0 && def.name.length <= 24, `${id} name fits a chip`);
    assert.ok(def.desc.length > 0 && def.desc.length <= 90, `${id} desc is one honest line`);
    assert.match(def.color, hex, `${id} color`);
    // A calling never collides with an item id (icons + tooltips key by id).
    assert.ok(!ITEMS.has(id), `${id} shadows an item id`);
  }
});

test('every Calling speaks under the dash ban', () => {
  // docs/VOICE.md: no em dashes, en dashes, or double hyphens in any
  // player-facing line — and U+2212 MINUS SIGN is in the net too, since
  // it reads as an en dash on a card. The codex descs were the last
  // dash nest in the content package.
  for (const [id, def] of CALLINGS) {
    const lines: Array<readonly [string, string]> = [
      ['name', def.name],
      ['desc', def.desc],
    ];
    for (const step of def.ranks ?? []) lines.push(['rank note', step.note]);
    for (const [what, text] of lines) {
      assert.doesNotMatch(text, /[—–−]|--/, `${id} ${what} carries a banned dash`);
    }
  }
});

test('THE FOCUS LAW costs: minors hold 1, majors hold 2', () => {
  for (const [id, def] of CALLINGS) {
    // Minors (below 40) hold 1 focus; majors (40+) hold 2. Phase 4
    // (THE WIDER LADDER) rewrites this table consciously.
    const expected = def.unlockLevel < 40 ? 1 : 2;
    assert.equal(def.focusCost, expected, `${id} focus cost matches its rung`);
  }
});

test('no strike-kind enchant effect ever rides a Calling', () => {
  for (const [id, def] of CALLINGS) {
    for (const fx of def.effects) {
      assert.ok(isAggregateCallingEffect(fx), `${id} folds a strike kind, forbidden`);
    }
  }
});

test('trade dials point at their own trade', () => {
  // A doubleGather/materialSave/craftSpeed/gatherSpeed calling must key
  // the skill that owns it — a mining calling quickening fishing is a
  // typo this test exists to catch.
  for (const [id, def] of CALLINGS) {
    for (const fx of def.effects) {
      if (
        fx.kind === 'doubleGather' ||
        fx.kind === 'materialSave' ||
        fx.kind === 'craftSpeed' ||
        fx.kind === 'gatherSpeed'
      ) {
        assert.equal(fx.skill, def.skill, `${id} keys a foreign trade`);
      }
    }
  }
});

test('THE FROZEN FIFTY-THREE: every shipped Calling is a one-entry package, unranked', () => {
  // Phase 1 is the keystone: possibility changed, power did not. The
  // first multi-entry package and the first authored rank ladder are
  // content decisions taken against the ledger — rewrite this pin
  // consciously when that epoch opens.
  for (const [id, def] of CALLINGS) {
    assert.equal(def.effects.length, 1, `${id} grew a second entry before the content epoch`);
    assert.equal(def.ranks, undefined, `${id} authored ranks before the content epoch`);
  }
});

test('the reserved lanes stay unread: no shipped package authors proc, when, or art', () => {
  // TYPED-UNREAD (the status-book idiom): the shapes exist so the
  // platform is authorable end to end, and the doors open in Phase 2
  // (proc), Phase 3 (when), and the content epoch (art). Until a
  // door opens, an author in that lane is a bug this pin catches.
  for (const [id, def] of CALLINGS) {
    for (const fx of def.effects) {
      assert.ok(
        fx.kind !== 'proc' && fx.kind !== 'when' && fx.kind !== 'art',
        `${id} authors reserved lane '${fx.kind}' before its door opens`,
      );
    }
  }
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

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
import { MAX_LEVEL, SKILL_IDS, focusCostForSeat } from '@arx/shared';
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

test('THE SEAT BANDS: every Calling is priced by its seat (1 / 2 / 3)', () => {
  // THE WIDER LADDER (callings-v2 Phase 4): the shared law prices the
  // seat — minors under 40 hold 1, majors 40..79 hold 2, capstones
  // 80+ hold 3 — and the def must agree. The 53 keep their founding
  // prices (every shipped seat sits under 80). Applied ranks
  // surcharge on top (callingCost), never on the def.
  for (const [id, def] of CALLINGS) {
    assert.equal(def.focusCost, focusCostForSeat(def.unlockLevel), `${id} focus cost matches its seat band`);
  }
});

test('THE DECADE FRAME: seats are unique per skill and never above the ceiling', () => {
  // The ten-seat ladder is a FRAME (10..90 + the 99 capstone) the
  // content epoch fills; the law pins uniqueness and the ceiling, not
  // exact decades (THE GREEN ARTS' 35/45 seats stay legal).
  for (const skill of SKILL_IDS) {
    const seats = callingsFor(skill).map((c) => c.unlockLevel);
    assert.equal(new Set(seats).size, seats.length, `${skill} stacks two Callings on one seat`);
    for (const seat of seats) {
      assert.ok(seat >= 1 && seat <= MAX_LEVEL, `${skill} seat ${seat} is off the ladder`);
    }
    // A capstone (99) may sit once — the ceiling is a single seat.
    assert.ok(seats.filter((x) => x === MAX_LEVEL).length <= 1, `${skill} has two capstones`);
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
  // The proc door is OPEN (Phase 2: the body door offers
  // callingProcs, the echo and the self-blessing are licensed
  // grammar) and `when` opens in Phase 3 — but AUTHORING stays with
  // the content epoch by the green-light's own word (PURE PLATFORM).
  // Until that epoch opens the register, an author in any of these
  // lanes is a bug this pin catches.
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

test('THE REGISTER, the calling column: every page a calling touches is licensed here', () => {
  // The status book's law extends to the character axis: a calling
  // that LAYS a page (proc status action, boon self-action) or READS
  // one (stateApplied, hitState) is a conscious ledger decision, made
  // by adding the pairing to this list — never by just authoring the
  // def. Empty on purpose this epoch (PURE PLATFORM, the green-light
  // record); the content epoch's first synergy pair opens the ledger.
  const LICENSED: ReadonlyArray<{ calling: string; status: string; via: string }> = [];
  const licensed = (calling: string, status: string, via: string): boolean =>
    LICENSED.some((r) => r.calling === calling && r.status === status && r.via === via);
  for (const [id, def] of CALLINGS) {
    for (const fx of def.effects) {
      if (fx.kind !== 'proc') continue;
      const rows: Array<[string, string]> = [];
      const t = fx.proc.trigger;
      const a = fx.proc.action;
      if (t.on === 'stateApplied' || t.on === 'hitState') rows.push([t.status, `read:${t.on}`]);
      if (a.do === 'status') rows.push([a.status, 'lay:status']);
      if (a.do === 'boon') rows.push([a.status, 'lay:boon']);
      for (const [status, via] of rows) {
        assert.ok(licensed(id, status, via), `${id} touches ${status} (${via}) without a license`);
      }
    }
  }
});

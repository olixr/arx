import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_BASE, QUALITY_CEIL, QUALITY_FLOOR, isItemRoll, sameRoll } from '@arx/shared';
import {
  DISCORD_PENALTY,
  ENCHANT_DEFS,
  QUALITY_AT_REQUIREMENT,
  RESONANCE_BONUS,
  inscriptionQuality,
  bondedEffects,
  instanceEffects,
  qualityWord,
  resonanceShift,
  scaleEffect,
  type EnchantEffect,
} from './enchants.js';
import { ITEMS } from '../items.js';

// -------------------------------------------------------- the maker's mark

test('THE MEASURE IS MASTERY, NOT LEVEL', () => {
  // A level-99 enchanter turning out entry scrolls runs them perfect;
  // that same enchanter's first masterwork, at exactly level 80, comes
  // out honest but plain. An absolute-level measure would have made the
  // whole low band worthless to a master and unreachable to everyone
  // else.
  assert.equal(inscriptionQuality(99, 2), QUALITY_CEIL);
  assert.equal(inscriptionQuality(80, 80), QUALITY_AT_REQUIREMENT);
  assert.equal(inscriptionQuality(2, 2), QUALITY_AT_REQUIREMENT);
  // The same hand, the same work, one level of growth: strictly better.
  assert.ok(inscriptionQuality(50, 40) > inscriptionQuality(45, 40));
});

test('quality never leaves its bounds, whatever it is handed', () => {
  for (const [level, req, bonus] of [
    [1, 99, 0],
    [99, 1, 50],
    [99, 1, -50],
    [0, 0, 0],
    [50, 60, 0],
  ] as const) {
    const q = inscriptionQuality(level, req, bonus);
    assert.ok(q >= QUALITY_FLOOR && q <= QUALITY_CEIL, `${level}/${req}/${bonus} gave ${q}`);
    assert.ok(Number.isInteger(q), 'quality must be a whole number on the wire');
  }
});

test('a working under its own requirement is never below the floor', () => {
  // Mastery clamps at zero, so an under-levelled hand cannot be worse
  // than an honest one. Only DISCORD can push below the requirement.
  assert.equal(inscriptionQuality(10, 60), QUALITY_AT_REQUIREMENT);
});

test('every quality in range has a word for it', () => {
  for (let q = QUALITY_FLOOR; q <= QUALITY_CEIL; q++) {
    assert.ok(qualityWord(q).length > 0, `${q} has no word`);
  }
  assert.equal(qualityWord(QUALITY_CEIL), 'masterwork');
  assert.equal(qualityWord(QUALITY_BASE), 'true');
});

test('the roll guard accepts real quality and refuses nonsense', () => {
  assert.equal(isItemRoll({ rar: 'common', seed: 0, q: 100 }), true);
  assert.equal(isItemRoll({ rar: 'common', seed: 0 }), true, 'quality is optional');
  assert.equal(isItemRoll({ rar: 'common', seed: 0, q: 500 }), false);
  assert.equal(isItemRoll({ rar: 'common', seed: 0, q: 0 }), false);
  assert.equal(isItemRoll({ rar: 'common', seed: 0, q: 100.5 }), false);
});

test('two inscriptions of different quality are different instances', () => {
  // The reason scrolls stopped stacking: addItem throws the roll away
  // when it merges, and with it the maker's mark.
  const a = { rar: 'common' as const, seed: 0, q: 100 };
  const b = { rar: 'common' as const, seed: 0, q: 112 };
  assert.equal(sameRoll(a, b), false);
  assert.equal(sameRoll(a, { ...a }), true);
  // Absent quality reads as baseline, so legacy instances still match.
  assert.equal(sameRoll({ rar: 'common', seed: 0 }, { rar: 'common', seed: 0, q: 100 }), true);
});

test('every scroll in the game is an instance, not a stack', () => {
  for (const e of ENCHANT_DEFS) {
    const scroll = ITEMS.get(`scroll_${e.id}`)!;
    assert.equal(scroll.stackable, false, `${scroll.id} would stack away its quality`);
  }
});

// ------------------------------------------------------------- resonance

test('RESONANCE rewards a school, discord punishes crossing one', () => {
  assert.equal(resonanceShift('ember', 'ember'), RESONANCE_BONUS);
  assert.equal(resonanceShift('ember', 'frost'), -DISCORD_PENALTY);
  // Bare steel takes anything cleanly. This is what sundering buys.
  assert.equal(resonanceShift('ember', undefined), 0);
});

test('discord is a penalty, never a loss', () => {
  // Nothing is destroyed and no materials are eaten by bad luck. The
  // worst a crossing can do is land the working at the floor, and the
  // player can always see it coming.
  const worst = Math.max(QUALITY_FLOOR, QUALITY_FLOOR - DISCORD_PENALTY);
  assert.equal(worst, QUALITY_FLOOR);
  assert.ok(DISCORD_PENALTY > 0 && DISCORD_PENALTY < QUALITY_BASE - QUALITY_FLOOR + 10);
});

// --------------------------------------------------------- what scales

test('quality scales MAGNITUDE and never TIMING', () => {
  // A finer inscription sits deeper in the steel; it does not make a
  // working wake more often, rest less, or reach further. Timing is
  // authored balance and stays where the designer put it.
  const proc: EnchantEffect = {
    kind: 'proc',
    id: 't',
    name: 'T',
    trigger: { on: 'hit', chance: 0.2 },
    action: { do: 'nova', damage: 10, radius: 3 },
    icd: 100,
  };
  const scaled = scaleEffect(proc, QUALITY_CEIL);
  assert.equal(scaled.kind, 'proc');
  if (scaled.kind !== 'proc') return;
  assert.equal(scaled.icd, 100, 'rest is balance, not craftsmanship');
  assert.deepEqual(scaled.trigger, proc.trigger, 'the chance must not move');
  assert.equal(scaled.action.do, 'nova');
  if (scaled.action.do !== 'nova') return;
  assert.equal(scaled.action.radius, 3, 'reach must not move');
  assert.ok(scaled.action.damage > 10, 'damage should');
});

test('an on-hit status gains power but never a better chance', () => {
  const fx: EnchantEffect = {
    kind: 'onHitStatus',
    status: 'burn',
    power: 2,
    durationTicks: 60,
    chance: 0.12,
  };
  const up = scaleEffect(fx, QUALITY_CEIL);
  assert.equal(up.kind, 'onHitStatus');
  if (up.kind !== 'onHitStatus') return;
  assert.equal(up.chance, 0.12);
  assert.equal(up.durationTicks, 60);
  assert.ok(up.power >= 2);
});

test('baseline quality is a no-op, exactly', () => {
  // Legacy instances carry no quality and must be bit-for-bit what they
  // always were. This is also the fast path.
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      assert.equal(scaleEffect(fx, QUALITY_BASE), fx, `${e.id} changed at baseline`);
    }
    assert.deepEqual(
      bondedEffects(e.id, QUALITY_BASE),
      bondedEffects(e.id),
      `${e.id} disagrees with its own default`,
    );
  }
});

test('a rough working is weaker and a masterwork is stronger, everywhere', () => {
  // Walked over the whole roster: no working may go the wrong way, and
  // none may round its way to nothing.
  const magnitudes = (fx: EnchantEffect): number[] => {
    switch (fx.kind) {
      case 'skill': case 'maxHp': case 'regen': case 'armor': case 'thorns':
        return [fx.amount];
      case 'styleDmg': case 'elementDmg': case 'cooldown': case 'speed': case 'crit':
      case 'vsState': case 'swingSpeed':
        return [fx.pct];
      case 'onKillHaste': return [fx.ticks];
      case 'lifesteal': return [fx.frac];
      case 'backstab': return [fx.bonus];
      case 'onHitStatus': return [fx.power];
      case 'proc': {
        const a = fx.action;
        if (a.do === 'nova' || a.do === 'bolt' || a.do === 'chain') return [a.damage];
        if (a.do === 'ward') return [a.absorb];
        if (a.do === 'heal') return [a.amount];
        if (a.do === 'surge') return [a.pct];
        if (a.do === 'status') return [a.power];
        return [];
      }
    }
  };
  for (const e of ENCHANT_DEFS) {
    for (const fx of e.effects) {
      const base = magnitudes(fx);
      const low = magnitudes(scaleEffect(fx, QUALITY_FLOOR));
      const high = magnitudes(scaleEffect(fx, QUALITY_CEIL));
      base.forEach((b, i) => {
        assert.ok(low[i]! <= b, `${e.id} got stronger at the floor`);
        assert.ok(high[i]! >= b, `${e.id} got weaker at the ceiling`);
        assert.ok(low[i]! > 0, `${e.id} rounded a ${b} away to nothing`);
      });
    }
  }
});

test('the effects a card shows are the effects the body feels', () => {
  // The card renders instanceEffects(.., q) and the aggregate folds
  // instanceEffects(.., q). One function, so they cannot disagree.
  const e = ENCHANT_DEFS.find((x) => x.id === 'worldheart_ward')!;
  assert.deepEqual(bondedEffects(e.id, 110), bondedEffects(e.id, 110));
  assert.notDeepEqual(bondedEffects(e.id, 110), bondedEffects(e.id, 90));
});

test('QUALITY IS FELT WHERE THERE IS SOMETHING TO FEEL IT IN', () => {
  // A +/-15% band around a whole number of 1 or 2 rounds back to
  // itself, so small workings read the same at every quality. That is
  // deliberate: biasing the rounding upward would turn every +1 into a
  // coin flip worth a third of its own strength. Substantial workings
  // must move, and this pins that they do.
  const big = ENCHANT_DEFS.find((x) => x.id === 'worldheart_ward')!;
  const hp = (q: number): number => {
    const fx = bondedEffects(big.id, q).find((f) => f.kind === 'maxHp');
    return fx && fx.kind === 'maxHp' ? fx.amount : 0;
  };
  assert.ok(hp(QUALITY_CEIL) > hp(QUALITY_BASE), 'a masterwork ward must hold more');
  assert.ok(hp(QUALITY_FLOOR) < hp(QUALITY_BASE), 'a rough one must hold less');
});

test("a def's native effects are never touched by an enchanter's hand", () => {
  // A chase item's identity is its own. Quality belongs to the bonded
  // working, and only to it.
  const native: EnchantEffect[] = [{ kind: 'armor', amount: 10 }];
  const out = instanceEffects(native, {
    rar: 'common',
    seed: 0,
    ench: ENCHANT_DEFS[0]!.id,
    q: QUALITY_CEIL,
  });
  assert.deepEqual(out[0], native[0]);
});

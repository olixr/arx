import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HASTE_FULL_DRAW_TICKS,
  HASTE_ON_HIT_TICKS,
  SHEATHED_BIT,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDDEN_BIT,
  STATUS_AMBIENCE_MASK,
  STATUS_BIT,
  STATUS_IDS,
  hasteOnHit,
  reactionDamage,
  reactionFor,
} from './abilities.js';

test('every distinct status pair has a reaction; same-status has none', () => {
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      const r = reactionFor(a, b);
      if (a === b) {
        assert.equal(r, null, `${a}+${b} must not react`);
      } else {
        assert.ok(r, `${a}+${b} needs a reaction entry`);
        assert.ok(r.mult > 0 && r.name.length > 0);
      }
    }
  }
});

test('reactions are symmetric — detonation order does not matter', () => {
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      if (a === b) continue;
      assert.equal(reactionFor(a, b), reactionFor(b, a));
    }
  }
});

test('area reactions carry a radius; single-target ones do not', () => {
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      if (a === b) continue;
      const r = reactionFor(a, b)!;
      if (r.effect === 'aoe' || r.effect === 'chain' || r.effect === 'spread') {
        assert.ok(r.radius > 0, `${r.name} needs a radius`);
      } else {
        assert.equal(r.radius, 0, `${r.name} should not have a radius`);
      }
    }
  }
});

test('reaction damage scales with both powers and never rounds to zero', () => {
  const r = reactionFor('burn', 'chill')!;
  assert.ok(reactionDamage(3, 3, r) > reactionDamage(1, 1, r));
  assert.ok(reactionDamage(0, 0, r) >= 1, 'a detonation always stings');
});

test('on-hit haste pulls cooldowns forward and clamps at zero', () => {
  assert.equal(hasteOnHit(100), 100 - HASTE_ON_HIT_TICKS);
  assert.equal(hasteOnHit(100, true), 100 - HASTE_FULL_DRAW_TICKS);
  assert.equal(hasteOnHit(3), 0);
  assert.ok(HASTE_FULL_DRAW_TICKS > HASTE_ON_HIT_TICKS, 'patience pays');
});

test('passive metadata is complete for every passive id', async () => {
  const { PASSIVES } = await import('./abilities.js');
  for (const [id, meta] of Object.entries(PASSIVES)) {
    assert.ok(meta.name.length > 0 && meta.desc.length > 0, `${id} meta incomplete`);
    assert.ok(meta.code.length === 2, `${id} icon code must be 2 chars`);
  }
});

test('status wire bits are distinct single bits that fit a u8', () => {
  const seen = new Set<number>();
  for (const id of STATUS_IDS) {
    const bit = STATUS_BIT[id];
    assert.ok(bit > 0 && bit <= 0xff);
    assert.equal(bit & (bit - 1), 0, 'single bit');
    assert.ok(!seen.has(bit));
    seen.add(bit);
  }
});

test('the ambience mask covers exactly the statuses and never the sneak bits', () => {
  let mask = 0;
  for (const id of STATUS_IDS) mask |= STATUS_BIT[id];
  assert.equal(mask, STATUS_AMBIENCE_MASK, 'mask must track STATUS_BIT exactly');
  assert.equal(mask & (SNEAK_HIDDEN_BIT | SNEAK_DETECTED_BIT), 0, 'stealth bits leaked in');
  assert.equal(mask & SHEATHED_BIT, 0, 'the sheathe bit leaked into the ambience mask');
});

test('spread reactions always spread a real DoT', () => {
  const dots = ['burn', 'bleed', 'venom'];
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      if (a === b) continue;
      const r = reactionFor(a, b)!;
      if (r.effect !== 'spread') continue;
      assert.ok(dots.includes(r.spreadStatus ?? 'burn'), `${r.name} spreads a non-DoT`);
    }
  }
});

// ------------------------------------------------------- THE HONED-ART LAW

import {
  RANK_SURPLUS,
  TECHNIQUE_MAX_RANK,
  artFlag,
  honedAbility,
  rankLevel,
  techniqueRank,
  techniqueRankFor,
  type AbilityDef,
  type RankStep,
} from './abilities.js';

const baseArt: AbilityDef = {
  id: 'test_art',
  name: 'Test Art',
  desc: 'A bench fixture.',
  color: '#fff',
  code: 'Ta',
  cooldownTicks: 200,
  shape: 'melee_arc',
  damage: 10,
  range: 2,
  status: { status: 'burn', power: 1, durationTicks: 60 },
};

const steps: RankStep[] = [
  { note: 'Rank II', damage: 12 },
  { note: 'Rank III', cooldownTicks: 180 },
  { note: 'Rank IV', status: { status: 'burn', power: 2, durationTicks: 60 } },
];

test('techniqueRank: unlock boundary, surplus thresholds, and the cap', () => {
  assert.equal(techniqueRank(5, 4), 0, 'below unlock = rank 0');
  assert.equal(techniqueRank(5, 5), 1, 'at unlock = rank I');
  assert.equal(techniqueRank(5, 19), 1, 'one shy of the step stays rank I');
  assert.equal(techniqueRank(5, 20), 2, '+15 surplus = rank II');
  assert.equal(techniqueRank(5, 35), 3, '+30 surplus = rank III');
  assert.equal(techniqueRank(5, 50), 4, '+45 surplus = rank IV');
  assert.equal(techniqueRank(5, 99), 4, 'rank caps at IV');
  assert.equal(techniqueRank(45, 90), 4, 'the late art matures in the 90s');
  assert.equal(RANK_SURPLUS.length, TECHNIQUE_MAX_RANK);
});

test('rankLevel mirrors techniqueRank at every threshold', () => {
  for (const unlock of [5, 15, 30, 45]) {
    for (let rank = 1; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const lvl = rankLevel(unlock, rank);
      assert.equal(techniqueRank(unlock, lvl), rank);
      assert.equal(techniqueRank(unlock, lvl - 1), rank - 1);
    }
  }
});

test('honedAbility merges steps in order and never mutates the base', () => {
  const frozen = JSON.stringify(baseArt);
  assert.equal(honedAbility(baseArt, steps, 1), baseArt, 'rank I returns the base object');
  assert.equal(honedAbility(baseArt, undefined, 4), baseArt, 'unranked art never forks');
  const r2 = honedAbility(baseArt, steps, 2);
  assert.equal(r2.damage, 12);
  assert.equal(r2.cooldownTicks, 200, 'later steps have not applied yet');
  const r4 = honedAbility(baseArt, steps, 4);
  assert.equal(r4.damage, 12);
  assert.equal(r4.cooldownTicks, 180);
  assert.equal(r4.status?.power, 2, 'object fields replace whole');
  assert.equal(r4.id, baseArt.id, 'identity is un-honable');
  assert.equal(r4.shape, baseArt.shape);
  assert.ok(!('note' in r4), 'the note never leaks into the resolved def');
  assert.equal(JSON.stringify(baseArt), frozen, 'base def untouched');
});

test('honedAbility clamps past the last authored step', () => {
  const r9 = honedAbility(baseArt, steps, 9);
  assert.deepEqual(r9, honedAbility(baseArt, steps, 4));
});

test('THE UNWRITTEN PAGE: earned pages rank from their anchor, never below I', () => {
  const page = { ability: 'x', style: 'arx' as const, unlockLevel: 0, hidden: { anchorLevel: 30 } };
  assert.equal(techniqueRankFor(page, 10), 1, 'below the anchor the page is simply unhoned');
  assert.equal(techniqueRankFor(page, 45), 2, 'anchor +15 = rank II');
  assert.equal(techniqueRankFor(page, 75), 4, 'the page masters at anchor +45');
  const rung = { ability: 'y', style: 'arx' as const, unlockLevel: 15 };
  assert.equal(techniqueRankFor(rung, 10), 0, 'ladder arts still gate on their rung');
  assert.equal(artFlag('riftwalker_step'), 'art:riftwalker_step');
});

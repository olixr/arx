import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFLICTIONS,
  AFFLICTION_STACKS_MASK,
  AFFLICTION_STACKS_SHIFT,
  HASTE_FULL_DRAW_TICKS,
  HASTE_ON_HIT_TICKS,
  SHEATHED_BIT,
  SNEAK_DETECTED_BIT,
  SNEAK_HIDDEN_BIT,
  SPARKS,
  STATUS_AMBIENCE_MASK,
  STATUS_BIT,
  STATUS_IDS,
  afflictionStacksOf,
  groundAimRange,
  groundAimed,
  hasteOnHit,
  isAffliction,
  isSpark,
  reactionDamage,
  reactionFor,
  transitTicks,
  travelKindOf,
} from './abilities.js';
import { sanitizeInputFrame } from './input.js';

test('THE TWO LANES: every distinct spark pair reacts; nothing else ever does', () => {
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      const r = reactionFor(a, b);
      if (a !== b && isSpark(a) && isSpark(b)) {
        assert.ok(r, `${a}+${b} needs a reaction entry`);
        assert.ok(r.mult > 0 && r.name.length > 0);
      } else {
        assert.equal(r, null, `${a}+${b} must not react`);
      }
    }
  }
});

test('THE TWO LANES: the rosters partition the statuses exactly', () => {
  const seen = new Set<string>();
  for (const id of [...SPARKS, ...AFFLICTIONS, 'sunder' as const]) {
    assert.ok(!seen.has(id), `${id} sits in two lanes`);
    seen.add(id);
  }
  assert.equal(seen.size, STATUS_IDS.length, 'every status has exactly one lane');
  for (const id of STATUS_IDS) assert.ok(seen.has(id), `${id} has no lane`);
  assert.ok(!isSpark('sunder') && !isAffliction('sunder'), 'the mark stands alone');
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
      const r = reactionFor(a, b);
      if (!r) continue;
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

// ------------------------------------------------- THE READING EDGE

import { SUNDER_MAX_PCT, stateBucket, sunderAmp, type ActiveStatus } from './abilities.js';

const rider = (id: ActiveStatus['id'], power = 3): ActiveStatus => ({ id, power, ticksLeft: 100 });

test('stateBucket: an unmarked body pays nothing extra', () => {
  assert.equal(stateBucket(undefined, [{ status: 'venom', mult: 1.5 }]), 1);
  assert.equal(stateBucket([], [{ status: 'venom', mult: 1.5 }]), 1);
  assert.equal(stateBucket([rider('venom')], []), 1, 'a state with no reader is silent');
});

test('stateBucket: the highest clause per state wins — payoffs never stack', () => {
  const list = [rider('venom')];
  const clauses = [
    { status: 'venom' as const, mult: 1.3 },
    { status: 'venom' as const, mult: 1.5 },
    { status: 'bleed' as const, mult: 2.0 },
  ];
  assert.equal(stateBucket(list, clauses), 1.5, 'best venom clause alone; bleed clause finds no bleed');
});

test('stateBucket: distinct states multiply — the assembled build is the jackpot', () => {
  const list = [rider('venom'), rider('bleed')];
  const clauses = [
    { status: 'venom' as const, mult: 1.5 },
    { status: 'bleed' as const, mult: 1.2 },
  ];
  assert.ok(Math.abs(stateBucket(list, clauses) - 1.8) < 1e-9);
});

test('stateBucket: a clause never pays less than 1 — states cannot be a discount', () => {
  assert.equal(stateBucket([rider('venom')], [{ status: 'venom', mult: 0.5 }]), 1);
});

test('sunderAmp: the mark amplifies clause-free and clamps at the ceiling', () => {
  assert.equal(sunderAmp([rider('sunder', 15)]), 1.15);
  assert.equal(sunderAmp([rider('sunder', 90)]), 1 + SUNDER_MAX_PCT / 100, 'the seam clamps');
  assert.equal(sunderAmp([rider('venom')]), 1);
  const both = stateBucket([rider('sunder', 20), rider('venom')], [{ status: 'venom', mult: 1.5 }]);
  assert.ok(Math.abs(both - 1.2 * 1.5) < 1e-9, 'the mark multiplies into the bucket');
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

test('status wire bits are distinct single bits that fit the u16', () => {
  const seen = new Set<number>();
  for (const id of STATUS_IDS) {
    const bit = STATUS_BIT[id];
    assert.ok(bit > 0 && bit <= 0xffff);
    assert.equal(bit & (bit - 1), 0, 'single bit');
    assert.ok(!seen.has(bit));
    seen.add(bit);
  }
});

test('the low byte is the historic u8 layout, unchanged forever', () => {
  // Wire archaeology: pre-v29 readers masked these exact positions.
  // A moved bit would make an old capture read as a different fight.
  assert.equal(STATUS_BIT.burn, 1 << 0);
  assert.equal(STATUS_BIT.chill, 1 << 1);
  assert.equal(STATUS_BIT.shock, 1 << 2);
  assert.equal(STATUS_BIT.bleed, 1 << 3);
  assert.equal(SNEAK_HIDDEN_BIT, 1 << 4);
  assert.equal(SNEAK_DETECTED_BIT, 1 << 5);
  assert.equal(STATUS_BIT.venom, 1 << 6);
  assert.equal(SHEATHED_BIT, 1 << 7);
  assert.equal(STATUS_BIT.sunder, 1 << 8, 'new states climb the high byte');
});

test('the affliction stack nibble collides with no flag bit', () => {
  let flags = SNEAK_HIDDEN_BIT | SNEAK_DETECTED_BIT | SHEATHED_BIT;
  for (const id of STATUS_IDS) flags |= STATUS_BIT[id];
  assert.equal(flags & AFFLICTION_STACKS_MASK, 0, 'the nibble owns its bits alone');
  assert.ok(AFFLICTION_STACKS_MASK <= 0xffff, 'the nibble fits the u16');
  assert.equal(afflictionStacksOf(3 << AFFLICTION_STACKS_SHIFT), 3);
  assert.equal(afflictionStacksOf(STATUS_BIT.sunder | STATUS_BIT.bleed), 0, 'flags never read as stacks');
});

test('the ambience mask covers exactly the statuses and never the sneak bits', () => {
  let mask = 0;
  for (const id of STATUS_IDS) mask |= STATUS_BIT[id];
  assert.equal(mask, STATUS_AMBIENCE_MASK, 'mask must track STATUS_BIT exactly');
  assert.equal(mask & (SNEAK_HIDDEN_BIT | SNEAK_DETECTED_BIT), 0, 'stealth bits leaked in');
  assert.equal(mask & SHEATHED_BIT, 0, 'the sheathe bit leaked into the ambience mask');
  assert.equal(mask & AFFLICTION_STACKS_MASK, 0, 'the stack nibble leaked into the weather');
});

test('spread reactions always spread a real DoT', () => {
  // No spread pair survives THE RETIREMENT today; the law stands
  // guard for the day a set word deliberately re-opens one.
  const dots = ['burn', 'bleed', 'venom'];
  for (const a of STATUS_IDS) {
    for (const b of STATUS_IDS) {
      if (a === b) continue;
      const r = reactionFor(a, b);
      if (!r || r.effect !== 'spread') continue;
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
  lessonFlag,
  masteryXp,
  rankLevel,
  rankStride,
  techniqueAnchor,
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

test('THE SHORTENED CLIMB: past anchor 54 the stride compresses toward 99', () => {
  assert.equal(rankStride(5), 15, 'early anchors walk the standard clock');
  assert.equal(rankStride(54), 15, '54 is the last standard-clock anchor');
  assert.equal(rankStride(60), 13);
  assert.equal(rankStride(90), 3, 'the level-90 capstone hones in threes');
  assert.equal(techniqueRank(90, 92), 1, 'two shy of the short step stays rank I');
  assert.equal(techniqueRank(90, 93), 2, 'the short stride steps at +3');
  assert.equal(techniqueRank(90, 99), 4, 'the capstone masters exactly at 99');
  for (const unlock of [5, 20, 54, 58, 66, 75, 82, 90]) {
    assert.ok(rankLevel(unlock, TECHNIQUE_MAX_RANK) <= 99, `unlock ${unlock} masters by 99`);
  }
});

test('rankLevel mirrors techniqueRank at every threshold', () => {
  for (const unlock of [5, 15, 30, 45, 60, 75, 90]) {
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

test('THE LESSON LAW: the cost dial climbs with the anchor and the keys stay disjoint', () => {
  assert.equal(masteryXp(1), 700, 'a bronze-band art is an honest afternoon');
  assert.equal(masteryXp(54), 6000, 'the deepest anchor is a real courtship');
  let prev = 0;
  for (const anchor of [1, 8, 18, 28, 38, 44, 50, 54]) {
    const cost = masteryXp(anchor);
    assert.ok(cost > prev, `cost rises with the anchor (${anchor})`);
    prev = cost;
  }
  assert.equal(lessonFlag('lunge'), 'lesson:lunge');
  assert.notEqual(lessonFlag('lunge'), artFlag('lunge'), 'the bank and the deed never collide');
});

test('THE SECRET LEDGER: secret arts rank from their anchor exactly like pages', () => {
  const secret = {
    ability: 'z',
    style: 'twohand' as const,
    unlockLevel: 0,
    secret: { anchorLevel: 24 },
  };
  assert.equal(techniqueRankFor(secret, 1), 1, 'a lent or mastered secret never ranks below I');
  assert.equal(techniqueRankFor(secret, 39), 2, 'anchor +15 = rank II');
  assert.equal(techniqueRankFor(secret, 69), 4, 'the secret masters at anchor +45');
  assert.equal(techniqueAnchor(secret), 24, 'the clock reads the secret anchor');
  const page = { ability: 'p', style: 'arx' as const, unlockLevel: 0, hidden: { anchorLevel: 30 } };
  assert.equal(techniqueAnchor(page), 30, 'the clock reads the page anchor');
  const rung = { ability: 'r', style: 'arx' as const, unlockLevel: 15 };
  assert.equal(techniqueAnchor(rung), 15, 'the clock reads the rung');
});

test('THE HELD SIGIL: the point-aimed shapes and no others', () => {
  const ab = (over: Partial<AbilityDef>): AbilityDef => ({
    id: 'x',
    name: 'X',
    desc: '',
    color: '#fff',
    code: 'XX',
    cooldownTicks: 10,
    shape: 'melee_arc',
    damage: 1,
    ...over,
  });
  assert.ok(groundAimed(ab({ shape: 'ground_aoe' })));
  assert.ok(groundAimed(ab({ shape: 'ground_field' })));
  assert.ok(groundAimed(ab({ shape: 'leap_slam' })));
  // A summon aims at the ground only when it has reach; a rangeless
  // one keeps planting at the feet.
  assert.ok(groundAimed(ab({ shape: 'summon', range: 8 })));
  assert.ok(!groundAimed(ab({ shape: 'summon' })));
  // THE CHOSEN GROUND (THE CROSSING): forward dashes joined the ring —
  // steer the road's end. The disengage hop (negative tiles) keeps
  // aiming a direction: its whole point is "away from HERE".
  assert.ok(groundAimed(ab({ shape: 'dash_strike', dashTiles: 6 })));
  assert.ok(!groundAimed(ab({ shape: 'dash_strike', dashTiles: -5 })), 'retreat hops aim a direction');
  for (const shape of ['melee_arc', 'nova', 'beam', 'tame', 'pet_command'] as const) {
    assert.ok(!groundAimed(ab({ shape })), `${shape} aims a direction, not a point`);
  }
});

test('THE HELD SIGIL: one ruler for reach, mirroring the interpreter defaults', () => {
  const ab = (over: Partial<AbilityDef>): AbilityDef => ({
    id: 'x',
    name: 'X',
    desc: '',
    color: '#fff',
    code: 'XX',
    cooldownTicks: 10,
    shape: 'ground_aoe',
    damage: 1,
    ...over,
  });
  assert.equal(groundAimRange(ab({ range: 7 })), 7);
  assert.equal(groundAimRange(ab({})), 4, 'ground_aoe falls back to the cast door default');
  assert.equal(groundAimRange(ab({ shape: 'ground_field' })), 6);
  assert.equal(groundAimRange(ab({ shape: 'leap_slam', dashTiles: -5 })), 5, 'a pull-leap still reaches forward');
  assert.equal(groundAimRange(ab({ shape: 'dash_strike', dashTiles: 6.5 })), 6.5, 'a dash reaches its own road');
  assert.equal(groundAimRange(ab({ shape: 'summon', range: 8 })), 8);
});

test('THE TRAVELED ROAD: travel kinds derive from shape, authored travel wins', () => {
  const ab = (over: Partial<AbilityDef>): AbilityDef => ({
    id: 'x',
    name: 'X',
    desc: '',
    color: '#fff',
    code: 'XX',
    cooldownTicks: 10,
    shape: 'dash_strike',
    damage: 1,
    dashTiles: 6,
    ...over,
  });
  assert.equal(travelKindOf(ab({})), 'dash', 'dash_strike walks as a dash by birth');
  assert.equal(travelKindOf(ab({ shape: 'leap_slam' })), 'leap');
  assert.equal(travelKindOf(ab({ travel: 'charge' })), 'charge', 'the authored gait rules');
  assert.equal(travelKindOf(ab({ travel: 'blink' })), 'blink');
  assert.equal(travelKindOf(ab({ shape: 'melee_arc', dashTiles: undefined })), null);
});

test('THE TRAVELED ROAD: one clock — durations derive from the speed table', () => {
  // 6.5 tiles at the charge's 13 t/s = exactly half a second = 10 ticks.
  assert.equal(transitTicks(6.5, 'charge'), 10);
  // The blur-step crosses the same road faster than the heavy run.
  assert.ok(transitTicks(6.5, 'dash') < transitTicks(6.5, 'charge'));
  // A retreat hop's negative road takes the same time as its mirror.
  assert.equal(transitTicks(-5, 'dash'), transitTicks(5, 'dash'));
  // Even the shortest hop is SEEN crossing.
  assert.ok(transitTicks(0.5, 'dash') >= 2);
  // The torn veil has no road.
  assert.equal(transitTicks(9, 'blink'), 0);
});

test('THE HELD SIGIL: sanitize keeps the aimed point only whole and finite', () => {
  const base = { seq: 1, mx: 0, my: 0, aim: 0, buttons: 0 };
  const whole = sanitizeInputFrame({ ...base, tx: 3.25, ty: -1 });
  assert.equal(whole.tx, 3.25);
  assert.equal(whole.ty, -1);
  const absent = sanitizeInputFrame(base);
  assert.ok(!('tx' in absent), 'no point in, no point out');
  const half = sanitizeInputFrame({ ...base, tx: 3 });
  assert.equal(half.tx, undefined);
  const hostile = sanitizeInputFrame({ ...base, tx: Number.NaN, ty: 4 });
  assert.equal(hostile.tx, undefined);
  assert.equal(hostile.ty, undefined);
});

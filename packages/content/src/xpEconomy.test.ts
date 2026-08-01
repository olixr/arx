import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TICK_RATE,
  XP_PER_DMG_SCHOOL,
  XP_PER_DMG_VITALITY,
  XP_KILL_SCHOOL_FRAC,
  XP_MARK_CAP_MULT,
  COMBAT_LESSON_FRAC,
  xpMarkAllowance,
} from '@arx/shared';
import { NPCS } from './npcs.js';
import { NODES } from './nodes.js';
import { CROPS } from './crops.js';
import { RECIPES } from './recipes.js';

/**
 * THE XP CONTRACT — the economy's ladder.test.ts.
 *
 * The 2026-08-01 balance review (docs/skill-balance-review.md) found
 * the curve right and the coefficients unowned: combat compounded,
 * farming paid pennies, and nothing stopped a future mob, node, or
 * recipe from quietly stepping outside the economy. These bands are
 * that ownership. When a def and the model disagree, tune ON PURPOSE:
 * either fix the def or widen the band here, in the open, with the
 * reasoning in the diff — never by excusing one entry.
 */

// ------------------------------------------------- the combat pins

test("THE MARK'S WORTH: the combat coefficients are the contract", () => {
  assert.equal(XP_PER_DMG_SCHOOL, 3, 'school XP per damage point');
  assert.equal(XP_PER_DMG_VITALITY, 2, 'vitality rider per damage point');
  assert.equal(XP_KILL_SCHOOL_FRAC, 0.5, "the felling's school share of xpReward");
  assert.equal(XP_MARK_CAP_MULT, 1.25, 'per-mark school damage-XP cap, in xpRewards');
  assert.equal(COMBAT_LESSON_FRAC, 0.5, 'the shared lesson echo');
});

test('every body prices its lesson honestly: xpReward tracks maxHp', () => {
  // The mark cap prices lessons in xpReward, so a mob whose reward
  // drifts far from its meat either becomes a training dummy (huge HP,
  // tiny reward: the cap bites everything) or a pinata (tiny HP, huge
  // reward: the kill bonus outpays the fight). Ranged bodies ride the
  // high side on purpose — low meat, real threat.
  for (const def of NPCS.values()) {
    if (def.maxHp <= 0 || def.xpReward <= 0) continue;
    const ratio = def.xpReward / def.maxHp;
    assert.ok(
      ratio >= 1.8 && ratio <= 6,
      `${def.id}: xpReward/maxHp = ${ratio.toFixed(2)} outside [1.8, 6]`,
    );
    // The cap must leave a tier-appropriate solo kill mostly uncapped:
    // the budget covers at least half the body's full damage-XP.
    const budget = xpMarkAllowance(def.xpReward) * XP_PER_DMG_SCHOOL;
    assert.ok(
      budget >= def.maxHp * XP_PER_DMG_SCHOOL * 0.5,
      `${def.id}: mark budget ${budget} starves an honest kill`,
    );
  }
});

// ------------------------------------------------- the gather bands

test('every node pays inside its band, and tiers climb', () => {
  const bySkill = new Map<string, Array<{ id: string; levelReq: number; xp: number }>>();
  for (const node of NODES) {
    const secs = node.baseTicks / TICK_RATE;
    const rate = node.xp / secs;
    const cap = 14 + node.levelReq * 0.5;
    assert.ok(
      rate >= 6 && rate <= cap,
      `${node.id}: ${rate.toFixed(1)} xp/s outside [6, ${cap.toFixed(1)}] for level ${node.levelReq}`,
    );
    let list = bySkill.get(node.skill);
    if (!list) bySkill.set(node.skill, (list = []));
    list.push({ id: node.id, levelReq: node.levelReq, xp: node.xp });
  }
  for (const [skill, list] of bySkill) {
    list.sort((a, b) => a.levelReq - b.levelReq || a.xp - b.xp);
    for (let i = 1; i < list.length; i++) {
      assert.ok(
        list[i]!.xp >= list[i - 1]!.xp,
        `${skill}: ${list[i]!.id} pays less than the tier below it`,
      );
    }
  }
});

test('THE PLOT PAYS FOR ITS TIME: crop xp is growMinutes x 10, exactly', () => {
  for (const crop of CROPS.values()) {
    assert.equal(
      crop.xp,
      crop.growMinutes * 10,
      `${crop.id}: a plot-hour must be worth the same whatever the crop`,
    );
  }
});

// ------------------------------------------------- the bench bands

test('no recipe outruns the bench: xp <= ticks x (1 + levelReq x 0.4)', () => {
  // The ramp is BLESSED: high shelves pay far more per bench-second,
  // because their material stream is the real price (a starsteel bar
  // is minutes of level-90 mining). This cap only forbids a future
  // recipe from paying wildly past even that blessed ramp.
  for (const r of RECIPES.values()) {
    const cap = r.ticks * (1 + r.levelReq * 0.4);
    assert.ok(
      r.xp <= cap,
      `${r.id}: xp ${r.xp} exceeds the blessed ramp cap ${Math.round(cap)}`,
    );
    assert.ok(r.xp >= 1, `${r.id}: every honest craft teaches something`);
  }
});

test('the fishing ladder rests, the trout spot never does', () => {
  const fishing = NODES.filter((n) => n.skill === 'fishing');
  assert.ok(fishing.length >= 5, 'the ladder keeps at least five waters');
  const anchor = fishing.find((n) => n.id === 'fishing_spot')!;
  assert.equal(anchor.depleteChance, 0, 'the casual anchor never depletes');
  for (const n of fishing) {
    if (n.id === 'fishing_spot') continue;
    assert.ok(n.depleteChance > 0, `${n.id}: a tier spot must rest between bites`);
    assert.ok(n.respawnSec > 0 && n.respawnSec <= 120, `${n.id}: rest stays a stroll, not a wait`);
  }
});

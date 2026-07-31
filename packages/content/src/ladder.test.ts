/**
 * THE LADDER CONTRACT — the rung ladder's balance tests.
 *
 * The value model lives in ladderModel.ts (shared with the secret
 * shelf's contract in secretArts.test.ts — one model, one law). This
 * file keeps the LADDER honest: no rung, fully honed, may tower over
 * or sink under its style.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RANK_SURPLUS,
  TECHNIQUE_MAX_RANK,
  honedAbility,
  techniqueAnchor,
  techniqueRankFor,
  type AbilityDef,
} from '@arx/shared';
import { ABILITIES, TECHNIQUES, abilityDef, techniquesFor } from './abilities.js';
import { HONABLE, cycleValue, isUtilityArt } from './ladderModel.js';
import { NPCS, scaleNpcDef } from './npcs.js';

test('every technique carries a full honing ladder of well-formed steps', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability);
    assert.ok(ab, `${tech.ability} resolves`);
    assert.ok(tech.ranks, `${tech.ability} has rank steps`);
    assert.equal(
      tech.ranks!.length,
      TECHNIQUE_MAX_RANK - 1,
      `${tech.ability} climbs to Rank ${TECHNIQUE_MAX_RANK}`,
    );
    let prev = ab!;
    tech.ranks!.forEach((step, i) => {
      assert.ok(
        step.note.length > 0 && step.note.length <= 90,
        `${tech.ability} rank ${i + 2} note is one honest line`,
      );
      for (const key of Object.keys(step)) {
        assert.ok(HONABLE.has(key), `${tech.ability} rank ${i + 2} touches honable field ${key}`);
      }
      const honed = honedAbility(ab!, tech.ranks, i + 2);
      assert.notDeepEqual(honed, prev, `${tech.ability} rank ${i + 2} actually changes the art`);
      prev = honed;
    });
  }
});

test('rank steps never degrade a damage art (monotonic cycle value)', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    if (isUtilityArt(ab)) continue;
    let prev = cycleValue(ab);
    for (let rank = 2; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const v = cycleValue(honedAbility(ab, tech.ranks, rank));
      assert.ok(
        v >= prev - 1e-9,
        `${tech.ability} rank ${rank} value ${v.toFixed(2)} must not fall below rank ${rank - 1}'s ${prev.toFixed(2)}`,
      );
      prev = v;
    }
  }
});

test('THE RELEVANCE LAW: every fully-honed art sits within ±20% of its style mean', () => {
  const styles = new Map<string, Array<{ id: string; v: number }>>();
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    if (isUtilityArt(ab)) continue;
    const honed = honedAbility(ab, tech.ranks, TECHNIQUE_MAX_RANK);
    const list = styles.get(tech.style) ?? [];
    list.push({ id: tech.ability, v: cycleValue(honed) });
    styles.set(tech.style, list);
  }
  for (const [style, arts] of styles) {
    const mean = arts.reduce((s, a) => s + a.v, 0) / arts.length;
    for (const { id, v } of arts) {
      assert.ok(
        v >= mean * 0.8 && v <= mean * 1.2,
        `${style}/${id} Rank IV cycle ${v.toFixed(2)} outside band [${(mean * 0.8).toFixed(2)}, ${(mean * 1.2).toFixed(2)}]`,
      );
    }
  }
});

test('the rank clock is uniform and the ladder mastered before 99', () => {
  assert.deepEqual([...RANK_SURPLUS], [0, 15, 30, 45]);
  for (const tech of TECHNIQUES) {
    const clock = techniqueAnchor(tech);
    assert.ok(
      clock + RANK_SURPLUS[TECHNIQUE_MAX_RANK - 1]! <= 99,
      `${tech.ability} reaches Rank IV before 99`,
    );
  }
});

test('THE OPEN LADDER: an art every five levels, 5 through 50, no gaps, no doubles', () => {
  const RUNGS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
    const arts = techniquesFor(style).filter((t) => !t.hidden);
    assert.deepEqual(
      arts.map((t) => t.unlockLevel),
      RUNGS,
      `${style} ladder must fill every rung in order`,
    );
    assert.equal(new Set(arts.map((t) => t.ability)).size, RUNGS.length);
  }
});

test('THE UNWRITTEN PAGE: hidden arts are well-formed, one per style at launch', () => {
  const hidden = TECHNIQUES.filter((t) => t.hidden);
  const byStyle = new Map<string, number>();
  for (const t of hidden) {
    byStyle.set(t.style, (byStyle.get(t.style) ?? 0) + 1);
    assert.equal(t.unlockLevel, 0, `${t.ability}: a page has no rung`);
    const anchor = t.hidden!.anchorLevel;
    assert.ok(anchor >= 1 && anchor <= 54, `${t.ability}: anchor ${anchor} must mature before 99`);
    assert.ok(t.ranks?.length === TECHNIQUE_MAX_RANK - 1, `${t.ability} climbs to Rank IV too`);
    assert.ok(abilityDef(t.ability), `${t.ability} resolves`);
  }
  for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
    assert.equal(byStyle.get(style), 1, `${style} carries exactly one unwritten page at launch`);
  }
});

test('techniques never fork identity: rank steps leave id/shape/fx face alone', () => {
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    for (let rank = 2; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const honed = honedAbility(ab, tech.ranks, rank);
      assert.equal(honed.id, ab.id);
      assert.equal(honed.shape, ab.shape);
      assert.equal(honed.name, ab.name);
      assert.equal(honed.color, ab.color);
      assert.equal(honed.code, ab.code);
    }
  }
});

test('every style ladder still resolves against the ability book', () => {
  for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
    for (const t of techniquesFor(style)) assert.ok(ABILITIES.has(t.ability));
  }
});

// ------------------------------------------------ THE PAYOFF BRACKET
// The player-side twin of THE THREAT LAW's TTK brackets: at any base
// level, the best technique payoff must stay a PAYOFF — meaningful
// against an at-level line fighter, never a delete button. The line
// fighter is the game's own scaling law (scaleNpcDef of the skeleton),
// so these brackets ride the same curve dungeons do.

test('THE PAYOFF BRACKET: one press never deletes an at-level line fighter', () => {
  const skeleton = NPCS.get('skeleton')!;
  const powerMult = (l: number): number => 1 + l * 0.05;
  const oneTargetBeats = (ab: AbilityDef): number => {
    switch (ab.shape) {
      case 'pulse_nova':
        return ab.pulses ?? 1;
      case 'ground_field':
        return Math.floor((ab.fieldTicks ?? 0) / (ab.pulseEveryTicks ?? 20));
      case 'flurry':
        return ab.hits ?? 1;
      default:
        return 1; // fans/dashes: one shaft connects with ONE target
    }
  };
  for (const L of [10, 25, 50, 75, 95]) {
    const fighterHp = scaleNpcDef(skeleton, L).maxHp;
    for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
      let instantBest = 0;
      let channelBest = 0;
      for (const t of techniquesFor(style)) {
        if (!t.hidden && t.unlockLevel > L) continue;
        const ab = honedAbility(abilityDef(t.ability)!, t.ranks, techniqueRankFor(t, L));
        if (ab.damage < 3) continue;
        const perBeat = Math.round(ab.damage * powerMult(L));
        const beats = oneTargetBeats(ab);
        const instant = beats === 1 ? perBeat : 0;
        instantBest = Math.max(instantBest, instant);
        channelBest = Math.max(channelBest, perBeat * beats);
        assert.ok(
          instant <= fighterHp * 0.75,
          `${style}/${t.ability} @L${L}: instant ${instant} deletes the ${fighterHp}hp line fighter`,
        );
        assert.ok(
          perBeat * beats <= fighterHp * 1.1,
          `${style}/${t.ability} @L${L}: full channel ${perBeat * beats} vs ${fighterHp}hp exceeds the payoff cap`,
        );
      }
      assert.ok(
        channelBest >= fighterHp * 0.2,
        `${style} @L${L}: best payoff ${channelBest} vs ${fighterHp}hp — payoffs must stay meaningful`,
      );
    }
  }
});

test('honed defs obey the seeker laws at every rank', () => {
  // The base-def seeker test lives in content.test.ts; ranks must not
  // sneak past it — a step that adds homing to a piercing schoolless
  // art would orbit-farm in a way no base def is allowed to.
  for (const tech of TECHNIQUES) {
    const ab = abilityDef(tech.ability)!;
    for (let rank = 1; rank <= TECHNIQUE_MAX_RANK; rank++) {
      const honed = honedAbility(ab, tech.ranks, rank);
      if (honed.homing === undefined) continue;
      assert.ok(honed.element, `${tech.ability} rank ${rank}: seekers must name a school`);
      assert.ok(!honed.pierce, `${tech.ability} rank ${rank}: homing + pierce orbit-farms`);
    }
  }
});

/**
 * THE MASTERED HAND (techniques v3) — the ladder model prices the
 * relationships between presses so no art escapes the band by being
 * new: a follow at half uptime, an aftermath at the field connect
 * factor, a finale once per note, a kill refund at a quarter.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AbilityDef } from '@arx/shared';
import { HONABLE, aftermathValue, cycleSeconds, cycleValue } from './ladderModel.js';

const base: AbilityDef = {
  id: 'model_probe',
  name: 'Probe',
  desc: '',
  color: '#fff',
  code: 'P',
  cooldownTicks: 200,
  shape: 'nova',
  damage: 10,
  radius: 2,
};

test('a follow is credited at half its bonus, a refund at half its face', () => {
  const plain = cycleValue(base);
  const doubled = cycleValue({ ...base, follow: { after: 'brand', windowTicks: 40, damageMult: 2 } });
  assert.ok(Math.abs(doubled - plain * 1.5) < 1e-9, 'a ×2 follow is worth ×1.5 in the model');
  assert.equal(cycleSeconds({ ...base, follow: { after: 'brand', windowTicks: 40, refundTicks: 40 } }), 9);
});

test('an aftermath prices its pulses at the field connect factor plus one status', () => {
  const a = { ...base, aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2 } };
  assert.ok(Math.abs(aftermathValue(a) - 2 * 4 * 0.45) < 1e-9);
  const burning = { ...base, aftermath: { fieldTicks: 80, everyTicks: 20, damage: 2, status: { status: 'burn' as const, power: 1, durationTicks: 40 } } };
  assert.ok(aftermathValue(burning) > aftermathValue(a), 'a burning ground is worth more than a bare one');
  assert.ok(cycleValue(burning) > cycleValue(base));
});

test('a finale is one beat at the extra weight; a kill refund shortens the cycle by a quarter of its face', () => {
  const note = { ...base, channelTicks: 48, pulseEveryTicks: 16 };
  const finale = { ...note, finaleMult: 2.5 };
  const beats = 3;
  const per = cycleValue(note) / beats;
  assert.ok(Math.abs(cycleValue(finale) - cycleValue(note) - per * 1.5) < 1e-9, 'the finale adds 1.5 beats of value');
  assert.equal(cycleSeconds({ ...base, onKill: { refundTicks: 80 } }), 9, '80 ticks at a quarter = 1 s off a 10 s cycle');
  assert.equal(cycleSeconds({ ...base, cooldownTicks: 20, onKill: { refundTicks: 400 } }), 1, 'the cycle floors at a second');
});

test('the relationships hone with the ranks', () => {
  for (const k of ['follow', 'aftermath', 'finaleMult', 'onKill']) assert.ok(HONABLE.has(k), k);
});

// ---------------------------------------------------------------------
// THE SCHOOL CONSTITUTION — binding on every school the moment it
// declares roles (a school that has not been rebuilt yet declares
// none and is left alone; a rebuilt school declares ALL of them).
// ---------------------------------------------------------------------
import { ABILITIES, TECHNIQUES, techniquesFor } from './abilities.js';
import { pageOf, ABILITY_ROLES, type AbilityRole, type StatusId } from '@arx/shared';

const REBUILT_SCHOOLS = ['onehand', 'archery', 'arx', 'sneak', 'shield', 'twohand', 'dualwield', 'combat', 'polearm'];

function rebuilt(style: string): boolean {
  const arts = techniquesFor(style).filter((t) => !t.hidden);
  return arts.some((t) => ABILITIES.get(t.ability)!.role !== undefined);
}

test('THE THREE-ACT ART: a rebuilt school declares a role on every rung and meets the quota', () => {
  for (const style of REBUILT_SCHOOLS) {
    if (!rebuilt(style)) continue;
    const arts = techniquesFor(style).filter((t) => !t.hidden).sort((a, b) => a.unlockLevel - b.unlockLevel);
    const count: Record<AbilityRole, number> = { opener: 0, payoff: 0, sustain: 0, answer: 0, crown: 0 };
    let prev: AbilityRole | undefined;
    for (const t of arts) {
      const ab = ABILITIES.get(t.ability)!;
      assert.ok(ab.role && ABILITY_ROLES.includes(ab.role), `${style}/${t.ability} declares no role`);
      assert.notEqual(ab.role, prev, `${style}/${t.ability} repeats the role of the rung before it`);
      prev = ab.role;
      count[ab.role]++;
    }
    assert.ok(count.opener >= 4, `${style} holds ${count.opener} openers (4 owed)`);
    assert.ok(count.payoff >= 4, `${style} holds ${count.payoff} payoffs (4 owed)`);
    assert.ok(count.sustain >= 4, `${style} holds ${count.sustain} sustains (4 owed)`);
    assert.ok(count.answer >= 3, `${style} holds ${count.answer} answers (3 owed)`);
    assert.equal(count.crown, 1, `${style} wears exactly one crown`);
    assert.equal(ABILITIES.get(arts.at(-1)!.ability)!.role, 'crown', `${style}'s crown sits at the capstone rung`);
    const first = new Set(arts.slice(0, 4).map((t) => ABILITIES.get(t.ability)!.role));
    for (const r of ['opener', 'payoff', 'sustain', 'answer'] as const) {
      assert.ok(first.has(r), `${style}'s first four rungs lack an ${r} — a level-20 player must already own a combo`);
    }
  }
});

test('THE FOLLOW-THROUGH is read by someone: every tag a school leaves has a follower in the school, and every follow has a leaver', () => {
  for (const style of REBUILT_SCHOOLS) {
    if (!rebuilt(style)) continue;
    const arts = techniquesFor(style).map((t) => ABILITIES.get(t.ability)!);
    const tags = new Set(arts.map((a) => a.tag).filter((t): t is string => !!t));
    const reads = new Set<string>();
    for (const a of arts) {
      if (!a.follow) continue;
      const after = typeof a.follow.after === 'string' ? [a.follow.after] : a.follow.after;
      assert.ok(a.follow.windowTicks >= 40 && a.follow.windowTicks <= 80, `${a.id} window ${a.follow.windowTicks} outside 2–4 s`);
      for (const w of after) reads.add(w);
    }
    for (const t of tags) assert.ok(reads.has(t), `${style} leaves the word ${t} and nothing in the school reads it`);
    for (const r of reads) {
      assert.ok(tags.has(r) || TECHNIQUES.some((t) => ABILITIES.get(t.ability)!.tag === r), `${style} follows ${r}, which no art leaves`);
    }
    assert.ok(arts.some((a) => a.follow), `${style} has no follow at all — no combo`);
  }
});

test('THE HOLD BUDGET, the player edition: a player hold on a body is short, warned, and never past a tenth of its cycle', () => {
  const holds: StatusId[] = ['root', 'stagger'];
  for (const t of TECHNIQUES) {
    const ab = ABILITIES.get(t.ability)!;
    const laid = [ab.status, ab.follow?.status, ab.aftermath?.status].filter((s): s is NonNullable<typeof s> => !!s);
    for (const s of laid) {
      if (!holds.includes(s.status)) continue;
      const cc = pageOf(s.status).cc!;
      const lock = Math.min(s.durationTicks, cc.maxTicks);
      const duty = lock / (ab.cooldownTicks + cc.immunityTicks);
      assert.ok(duty <= 0.1, `${ab.id} holds ${(duty * 100).toFixed(1)}% of its cycle — past the tenth`);
      const warn = (ab.castTicks ?? 0) + (ab.fuseTicks ?? 0);
      assert.ok(warn >= lock / 2, `${ab.id} holds ${lock}t but warns only ${warn}t — a hold is a casted or fused art`);
    }
  }
});

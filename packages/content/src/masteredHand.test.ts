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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MITIGATION_CAP,
  NPC_POWER_PER_LEVEL,
  PLAYER_POWER_PER_LEVEL,
  armorRating,
  damageReduction,
  mitigate,
  npcMaxHit,
  powerMult,
  scaledMaxHit,
} from './damage.js';

// ------------------------------------------------------- attacker side

test('power multiplier: level carries the die', () => {
  assert.equal(powerMult(0, NPC_POWER_PER_LEVEL), 1);
  assert.ok(powerMult(10, NPC_POWER_PER_LEVEL) > powerMult(5, NPC_POWER_PER_LEVEL));
  // NPCs climb steeper than players — the level line is all they have.
  assert.ok(NPC_POWER_PER_LEVEL > PLAYER_POWER_PER_LEVEL);
});

test('npcMaxHit: harmless stays harmless, armed stays ≥1', () => {
  assert.equal(npcMaxHit(0, 40), 0, 'a chicken at any level never hits');
  assert.equal(npcMaxHit(-1, 40), 0);
  assert.ok(npcMaxHit(1, 1) >= 1);
});

test('the bestiary lands where the balance targets want it', () => {
  // Same die, different level = different threat (the goblin law).
  assert.ok(npcMaxHit(2, 15) > npcMaxHit(2, 5));
  // A level-16 bear (die 5) threatens a fresh body in 2-3 landed hits.
  const bear = npcMaxHit(5, 16);
  assert.ok(bear >= 10 && bear <= 13, `bear maxHit ${bear} in the 10-13 band`);
  // A level-20 dire wolf (die 6) is a near one-shot for the unarmored.
  const direWolf = npcMaxHit(6, 20);
  assert.ok(direWolf >= 14 && direWolf <= 18, `dire wolf maxHit ${direWolf}`);
  // A level-5 goblin (die 2) stays a starter threat, not a killer.
  const goblin = npcMaxHit(2, 5);
  assert.ok(goblin >= 2 && goblin <= 4, `goblin maxHit ${goblin}`);
});

// ------------------------------------------------------- defender side

test('reduction grows with rating, shrinks with attacker level, caps', () => {
  assert.equal(damageReduction(0, 1), 0);
  assert.ok(damageReduction(80, 10) > damageReduction(40, 10));
  // The same plate mitigates LESS against a deeper-tier attacker.
  assert.ok(damageReduction(80, 40) < damageReduction(80, 10));
  // Absurd stacking still can't reach invincibility.
  assert.ok(damageReduction(1e9, 1) <= MITIGATION_CAP);
});

test('mitigate: whiffs stay whiffs, big hits arrive meaningfully', () => {
  assert.equal(mitigate(0, 99, 99, 1), 0, 'a rolled 0 is a whiff, not a heal');
  assert.equal(mitigate(5, 0, 0, 10), 5, 'no kit = the full blow');
  // Even the tankiest kit lets a quarter of a big hit through.
  const tanked = mitigate(20, 99, 99, 60);
  assert.ok(tanked >= Math.round(20 * (1 - MITIGATION_CAP)), `tanked ${tanked}`);
});

// -------------------------------------------- time-to-kill brackets
// Expected landed damage per swing = (maxHit / 2) × (1 - reduction);
// hits-to-die = hp / that. These brackets ARE the balance contract —
// move them deliberately or not at all.

function avgHitsToDie(hp: number, die: number, npcLevel: number, defence: number, armor: number): number {
  const maxHit = npcMaxHit(die, npcLevel);
  const dr = damageReduction(armorRating(defence, armor), npcLevel);
  const avgLanded = (maxHit / 2) * (1 - dr);
  return hp / avgLanded;
}

test('TTK: a fresh body in bear country dies in 2-4 swings', () => {
  // Fresh character: vitality 10 (10 hp), defence 1, no armor.
  const hits = avgHitsToDie(10, 5, 16, 1, 0);
  assert.ok(hits >= 1.5 && hits <= 4, `fresh vs bear: ${hits.toFixed(1)} avg swings`);
});

test('TTK: a fresh body vs a goblin is threatened, not deleted', () => {
  const hits = avgHitsToDie(10, 2, 5, 1, 0);
  assert.ok(hits >= 5 && hits <= 15, `fresh vs goblin: ${hits.toFixed(1)} avg swings`);
});

test('TTK: a trained tank shrugs the same bear for a long fight', () => {
  // Defence 40, armor 30, vitality 40.
  const hits = avgHitsToDie(40, 5, 16, 40, 30);
  assert.ok(hits >= 10, `tank vs bear: ${hits.toFixed(1)} avg swings`);
});

test('TTK: ten levels of gap is a substantial threat', () => {
  // The same defender (mid kit) against an even-level foe vs +10.
  const even = avgHitsToDie(15, 4, 12, 12, 8);
  const gapped = avgHitsToDie(15, 4, 22, 12, 8);
  assert.ok(
    even / gapped >= 1.5,
    `+10 levels should cut survival ≥1.5x (even ${even.toFixed(1)} vs gapped ${gapped.toFixed(1)})`,
  );
});

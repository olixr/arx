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

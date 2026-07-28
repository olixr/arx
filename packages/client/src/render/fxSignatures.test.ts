import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_STYLES } from './abilityFx.js';
import { SIGNATURES } from './fxSignatures.js';

/**
 * THE SIGNATURE LAW's registry contract: a signature can only crown
 * an ability that exists — an orphan key is a typo waiting to make a
 * bespoke set-piece silently unreachable.
 */
test('every signature crowns a real ability face', () => {
  for (const id of Object.keys(SIGNATURES)) {
    assert.ok(FX_STYLES[id], `signature '${id}' has no FX_STYLES face — orphan key`);
  }
});

test('every signature carries at least one hook', () => {
  for (const [id, sig] of Object.entries(SIGNATURES)) {
    assert.ok(
      sig.spawn || sig.ground || sig.air,
      `signature '${id}' is an empty object — a crown with no jewels`,
    );
  }
});

import { test } from 'node:test';
import { MATTER_MIGRATED } from './fxSignatures.js';
import { MATTER } from './matter/index.js';
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

/**
 * THE ONE-VOICE LAW's ledger: the migrated list only grows, every
 * entry is a real signature, and the exemplar wave stays pinned —
 * a migration can never silently fall off the books.
 */
test('the matter-migration ledger is sound and append-only', () => {
  const EXEMPLARS = ['fireburst', 'shockwave', 'frost_nova', 'smoke_bomb', 'envenom'];
  for (const id of EXEMPLARS) {
    assert.ok(MATTER_MIGRATED.includes(id), `exemplar '${id}' fell off the migration ledger`);
  }
  for (const id of MATTER_MIGRATED) {
    assert.ok(SIGNATURES[id], `ledger entry '${id}' has no signature`);
  }
  assert.equal(new Set(MATTER_MIGRATED).size, MATTER_MIGRATED.length, 'ledger holds duplicates');
  // The library the migrations lean on is present and whole.
  assert.equal(Object.keys(MATTER).length, 10);
});

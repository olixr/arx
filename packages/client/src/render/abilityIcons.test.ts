import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, TECHNIQUES } from '@arx/content';
import { PASSIVES } from '@arx/shared';
import { allAbilityIconIds, allPassiveIconIds } from './abilityIcons.js';

/**
 * The spell-plate law, mirroring the FX bespoke-face law one layer up:
 * every shipped ability carries a hand-painted icon. The rune-blank
 * fallback exists so a missing plate degrades loudly in review — it
 * must never ship as the default path for a real ability.
 */
test('every ability has a bespoke spell-plate', () => {
  const plates = new Set(allAbilityIconIds());
  for (const [id] of ABILITIES) {
    assert.ok(plates.has(id), `ability '${id}' has no spell-plate — lettered-chip regression`);
  }
});

test('every technique on the ladder has a spell-plate', () => {
  const plates = new Set(allAbilityIconIds());
  for (const t of TECHNIQUES) {
    assert.ok(plates.has(t.ability), `technique '${t.ability}' has no spell-plate`);
  }
});

test('every gear passive has a chip plate', () => {
  const plates = new Set(allPassiveIconIds());
  for (const id of Object.keys(PASSIVES)) {
    assert.ok(plates.has(id), `passive '${id}' has no chip plate`);
  }
});

test('no orphan plates — every plate names a real ability', () => {
  // A plate keyed to a dead id is silent debt: it renders nowhere and
  // rots. Keep the registry exactly as large as the roster.
  for (const id of allAbilityIconIds()) {
    assert.ok(ABILITIES.has(id), `spell-plate '${id}' names no ability in content`);
  }
});

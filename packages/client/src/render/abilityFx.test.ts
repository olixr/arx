import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES } from '@arx/content';
import { FX_STYLES, fxStyleFor } from './abilityFx.js';

/**
 * The bespoke-face law: every shipped ability has a hand-assigned
 * visual identity. The color-derived fallback exists so a MISSING entry
 * degrades gracefully — it must never become the default path.
 */
test('every ability has a bespoke FX identity', () => {
  for (const [id] of ABILITIES) {
    assert.ok(FX_STYLES[id], `ability '${id}' has no FX_STYLES entry — faceless art`);
  }
});

test('fx palettes are well-formed hex and glow triples', () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const glow = /^\d{1,3}, \d{1,3}, \d{1,3}$/;
  for (const [id, st] of Object.entries(FX_STYLES)) {
    for (const band of [st.core, st.mid, st.deep, st.spark]) {
      assert.match(band, hex, `${id}: bad palette color '${band}'`);
    }
    assert.match(st.glow, glow, `${id}: glow must be 'r, g, b', got '${st.glow}'`);
    assert.ok(st.punch >= 0 && st.punch <= 1, `${id}: punch out of band`);
  }
});

test('sibling arts stay distinguishable — no two share a full identity', () => {
  // Two abilities may share a family, but the exact (mid, ring, debris,
  // decal, motif) face is an ability's identity — collisions make the
  // roster read homogenous, which is the thing this epic exists to kill.
  const seen = new Map<string, string>();
  for (const [id, st] of Object.entries(FX_STYLES)) {
    const face = `${st.mid}|${st.ring}|${st.debris}|${st.decal ?? '-'}|${st.motif ?? '-'}|${st.punch}`;
    const prior = seen.get(face);
    assert.equal(prior, undefined, `'${id}' wears the same face as '${prior}'`);
    seen.set(face, id);
  }
});

test('the fallback derives a sane palette from any wire color', () => {
  const st = fxStyleFor('definitely_not_an_ability', '#8ac4e8');
  assert.equal(st.mid, '#8ac4e8');
  assert.match(st.glow, /^\d{1,3}, \d{1,3}, \d{1,3}$/);
  const bare = fxStyleFor(undefined, undefined);
  assert.ok(bare.core && bare.deep && bare.spark);
});

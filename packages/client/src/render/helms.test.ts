import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawHelmet, type HeadFrame } from './armor.js';
import { CLOTH_HELMS } from './armorHelmsCloth.js';
import { METAL_HELMS } from './armorHelmsMetal.js';
import { HELM_STYLES } from './armorStyles.js';
import { recordingCtx } from './testkit.js';

// THE CROWN'S ROLL CALL (foundations F3.2). drawHelmet's 59 branch
// kinds became two registries; these pins hold the whole roster: every
// authored style still paints (the recording ctx asserts every numeric
// argument finite — the exact failure mode of a lost local), and every
// registry key is a kind some authored style actually wears.

const frame = (over: Partial<HeadFrame> = {}): HeadFrame => ({
  s: 48,
  headX: 0,
  headY: -30,
  hw: 10,
  hh: 12,
  cut: 0.4,
  headR: 11,
  fx: 0.3,
  profileK: 0,
  backK: 0,
  lead: 1,
  hurt: false,
  nowMs: 1234,
  ...over,
});

test('every authored helm style paints, front and profile, whole and hurt', () => {
  for (const [name, st] of Object.entries(HELM_STYLES)) {
    for (const f of [frame(), frame({ profileK: 1, fx: 0.9, lead: -1 }), frame({ hurt: true })]) {
      const ctx = recordingCtx();
      drawHelmet(ctx, st, f);
      assert.ok(ctx.calls.length > 0, `helm style '${name}' (${st.kind}) painted nothing`);
    }
  }
});

test('the registries hold the split: soft crowns and forged steel', () => {
  assert.equal(Object.keys(CLOTH_HELMS).length, 42);
  // Seventeen painters answer eighteen kinds — the greathelm and the
  // bascinet share the first arm, exactly as the old ladder head did.
  assert.equal(Object.keys(METAL_HELMS).length, 18);
  assert.equal(new Set(Object.values(METAL_HELMS)).size, 17);
  // No kind lives on both shelves.
  for (const k of Object.keys(CLOTH_HELMS)) {
    assert.ok(!(k in METAL_HELMS), `kind '${k}' registered on both shelves`);
  }
  // Every registered kind is worn by at least one authored style —
  // a painter nothing wears is a museum piece, not a registry entry.
  const worn = new Set<string>(Object.values(HELM_STYLES).map((s) => s.kind));
  for (const k of [...Object.keys(CLOTH_HELMS), ...Object.keys(METAL_HELMS)]) {
    assert.ok(worn.has(k), `registered kind '${k}' is worn by no authored style`);
  }
});

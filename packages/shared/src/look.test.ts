import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEARD_STYLES,
  CLOTH_COLORS,
  EAR_STYLES,
  EYE_STYLES,
  FACE_FEATURES,
  HAIR_COLORS,
  HAIR_COLOR_NAMES,
  HAIR_STYLES,
  HERITAGES,
  SKIN_TONES,
  SKIN_TONE_NAMES,
  applyHeritage,
  randomLook,
  sanitizeLook,
} from './look.js';

test('sanitizeLook accepts every in-range look and returns a clean copy', () => {
  const look = {
    skin: 0,
    hair: 1,
    hairColor: 2,
    beard: 0,
    eyes: 1,
    ears: 2,
    feature: 3,
    shirt: 4,
    pants: 5,
  };
  assert.deepEqual(sanitizeLook(look), look);
  const max = {
    skin: SKIN_TONES.length - 1,
    hair: HAIR_STYLES.length - 1,
    hairColor: HAIR_COLORS.length - 1,
    beard: BEARD_STYLES.length - 1,
    eyes: EYE_STYLES.length - 1,
    ears: EAR_STYLES.length - 1,
    feature: FACE_FEATURES.length - 1,
    shirt: CLOTH_COLORS.length - 1,
    pants: CLOTH_COLORS.length - 1,
  };
  assert.deepEqual(sanitizeLook(max), max);
});

test('sanitizeLook rejects out-of-range, fractional, and malformed input', () => {
  const ok = {
    skin: 0,
    hair: 0,
    hairColor: 0,
    beard: 0,
    eyes: 0,
    ears: 0,
    feature: 0,
    shirt: 0,
    pants: 0,
  };
  assert.equal(sanitizeLook(null), null);
  assert.equal(sanitizeLook('nope'), null);
  assert.equal(sanitizeLook({ ...ok, skin: SKIN_TONES.length }), null);
  assert.equal(sanitizeLook({ ...ok, hair: -1 }), null);
  assert.equal(sanitizeLook({ ...ok, shirt: 1.5 }), null);
  assert.equal(sanitizeLook({ ...ok, pants: '2' }), null);
  assert.equal(sanitizeLook({ ...ok, eyes: EYE_STYLES.length }), null);
  assert.equal(sanitizeLook({ ...ok, ears: -1 }), null);
  assert.equal(sanitizeLook({ ...ok, feature: 2.5 }), null);
  const { beard: _beard, ...missing } = ok;
  assert.equal(sanitizeLook(missing), null);
});

test('sanitizeLook defaults the expansion fields for pre-expansion DB looks', () => {
  // A look saved before eyes/ears/feature existed must load unchanged,
  // with the new fields zeroed — never rejected. Hair 2 (the Crop) and
  // beard 1 (the mustache) are both live indices, so they are kept.
  const stored = { skin: 3, hair: 2, hairColor: 5, beard: 1, shirt: 0, pants: 7 };
  assert.deepEqual(sanitizeLook(stored), {
    ...stored,
    eyes: 0,
    ears: 0,
    feature: 0,
  });
});

test('THE SHEARING: retired style indices migrate to 0, garbage still dies', () => {
  const ok = {
    skin: 0,
    hair: 0,
    hairColor: 0,
    beard: 0,
    eyes: 0,
    ears: 0,
    feature: 0,
    shirt: 0,
    pants: 0,
  };
  // Every retired index loads as the default cut — a topknot from
  // 2026-07 logs in as a Wayfarer, never as a broken look.
  for (let h = HAIR_STYLES.length; h <= 10; h++) {
    assert.deepEqual(sanitizeLook({ ...ok, hair: h }), ok, `hair ${h}`);
  }
  // Live indices survive as themselves, retired-era origin or not.
  for (let h = 0; h < HAIR_STYLES.length; h++) {
    assert.deepEqual(sanitizeLook({ ...ok, hair: h }), { ...ok, hair: h }, `live hair ${h}`);
  }
  // The hair order is load-bearing the same way the beard order is:
  // these indices are in the DB, and the render table (client
  // render/hair.ts STYLES) is indexed by them positionally. Index 1
  // must stay Bald — it is a real null in that table.
  assert.equal(HAIR_STYLES[0], 'Wayfarer');
  assert.equal(HAIR_STYLES[1], 'Bald');
  assert.equal(HAIR_STYLES[2], 'Crop');
  assert.equal(HAIR_STYLES[3], 'Shorn');
  assert.equal(HAIR_STYLES[4], 'Swept');
  // THE BEARD ORDER IS LOAD-BEARING: every index the retired beard set
  // stored is live again, so a stored beard keeps its own character
  // instead of migrating. Reordering BEARD_STYLES would re-shave the
  // world silently; this pins the contract.
  for (let b = 0; b < BEARD_STYLES.length; b++) {
    assert.deepEqual(sanitizeLook({ ...ok, beard: b }), { ...ok, beard: b }, `live beard ${b}`);
  }
  assert.equal(BEARD_STYLES.length, 7, 'the retired beard index range is fully covered');
  assert.equal(BEARD_STYLES[1], 'Mustache');
  assert.equal(BEARD_STYLES[2], 'Goatee');
  assert.equal(BEARD_STYLES[3], 'Full beard');
  assert.equal(BEARD_STYLES[5], 'Mutton chops');
  assert.equal(BEARD_STYLES[6], 'Stubble');
  // Beyond the legacy range was never valid in any era.
  assert.equal(sanitizeLook({ ...ok, hair: 11 }), null);
  assert.equal(sanitizeLook({ ...ok, beard: 7 }), null);
  assert.equal(sanitizeLook({ ...ok, hair: 2.5 }), null);
});

test('randomLook always survives its own sanitizer', () => {
  // Deterministic sweep across the rand space.
  for (let i = 0; i < 200; i++) {
    const r = ((i * 2654435761) % 1000) / 1000;
    const look = randomLook(() => r);
    assert.deepEqual(sanitizeLook(look), look, `seed ${r}`);
  }
});

test('palette name arrays stay aligned with their palettes', () => {
  assert.equal(SKIN_TONE_NAMES.length, SKIN_TONES.length);
  assert.equal(HAIR_COLOR_NAMES.length, HAIR_COLORS.length);
});

test('every heritage pins valid indices and survives the sanitizer', () => {
  for (const h of HERITAGES) {
    for (const skinIx of h.skins) {
      assert.ok(skinIx >= 0 && skinIx < SKIN_TONES.length, `${h.name} skin ${skinIx}`);
    }
    assert.ok(h.ears >= 0 && h.ears < EAR_STYLES.length, `${h.name} ears`);
    assert.ok(h.feature >= 0 && h.feature < FACE_FEATURES.length, `${h.name} feature`);
    for (const c of h.hairColors ?? []) {
      assert.ok(c >= 0 && c < HAIR_COLORS.length, `${h.name} hair color ${c}`);
    }
    for (const b of h.beards ?? []) {
      assert.ok(b >= 0 && b < BEARD_STYLES.length, `${h.name} beard ${b}`);
    }
    // Sweep the rand space: applied looks always sanitize clean.
    for (const r of [0, 0.33, 0.66, 0.999]) {
      const applied = applyHeritage(h, randomLook(() => 0.5), () => r);
      assert.deepEqual(sanitizeLook(applied), applied, `${h.name} @ ${r}`);
    }
  }
});

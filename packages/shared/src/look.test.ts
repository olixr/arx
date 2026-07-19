import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEARD_STYLES,
  CLOTH_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  randomLook,
  sanitizeLook,
} from './look.js';

test('sanitizeLook accepts every in-range look and returns a clean copy', () => {
  const look = { skin: 0, hair: 1, hairColor: 2, beard: 3, shirt: 4, pants: 5 };
  assert.deepEqual(sanitizeLook(look), look);
  const max = {
    skin: SKIN_TONES.length - 1,
    hair: HAIR_STYLES.length - 1,
    hairColor: HAIR_COLORS.length - 1,
    beard: BEARD_STYLES.length - 1,
    shirt: CLOTH_COLORS.length - 1,
    pants: CLOTH_COLORS.length - 1,
  };
  assert.deepEqual(sanitizeLook(max), max);
});

test('sanitizeLook rejects out-of-range, fractional, and malformed input', () => {
  const ok = { skin: 0, hair: 0, hairColor: 0, beard: 0, shirt: 0, pants: 0 };
  assert.equal(sanitizeLook(null), null);
  assert.equal(sanitizeLook('nope'), null);
  assert.equal(sanitizeLook({ ...ok, skin: SKIN_TONES.length }), null);
  assert.equal(sanitizeLook({ ...ok, hair: -1 }), null);
  assert.equal(sanitizeLook({ ...ok, shirt: 1.5 }), null);
  assert.equal(sanitizeLook({ ...ok, pants: '2' }), null);
  const { beard: _beard, ...missing } = ok;
  assert.equal(sanitizeLook(missing), null);
});

test('randomLook always survives its own sanitizer', () => {
  // Deterministic sweep across the rand space.
  for (let i = 0; i < 200; i++) {
    const r = ((i * 2654435761) % 1000) / 1000;
    const look = randomLook(() => r);
    assert.deepEqual(sanitizeLook(look), look, `seed ${r}`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURVE_PRESETS,
  curveAt,
  curveKeyOf,
  curveOf,
  keysAt,
  mixHex,
  rampAt,
  rampBands,
  rampKeyOf,
  rampOf,
} from './curves.js';

test('id 0 is the legacy law: curveAt 1, rampAt empty', () => {
  assert.equal(curveAt(0, 0.3), 1);
  assert.equal(rampAt(0, 0.3), '');
});

test('keysAt interpolates linearly and clamps at both ends', () => {
  const k = [0, 1, 0.5, 0.5, 1, 0];
  assert.equal(keysAt(k, -1), 1);
  assert.equal(keysAt(k, 0.25), 0.75);
  assert.equal(keysAt(k, 0.5), 0.5);
  assert.equal(keysAt(k, 0.75), 0.25);
  assert.equal(keysAt(k, 2), 0);
});

test('the shrink preset reproduces the engine default 1 − t at every sample', () => {
  const id = curveOf('shrink');
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    assert.ok(Math.abs(curveAt(id, t) - (1 - t)) < 1e-9, `t=${t}`);
  }
});

test('the tent preset reproduces the engine alpha tent', () => {
  const id = curveOf('tent');
  const tent = (t: number) => (t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75);
  for (const t of [0, 0.125, 0.25, 0.5, 0.8125, 1]) {
    assert.ok(Math.abs(curveAt(id, t) - tent(t)) < 1e-9, `t=${t}`);
  }
});

test('curves memoize by key and every preset registers', () => {
  const a = curveOf('dwindle');
  const b = curveOf('dwindle');
  assert.equal(a, b);
  const c = curveOf([0, 1, 1, 0]);
  const d = curveOf([0, 1, 1, 0]);
  assert.equal(c, d);
  assert.notEqual(a, c);
  for (const name of Object.keys(CURVE_PRESETS)) assert.ok(curveOf(name) > 0, name);
  assert.equal(curveKeyOf(a), '@dwindle');
  assert.equal(curveKeyOf(c), '0,1,1,0');
  assert.throws(() => curveOf('no-such-preset'));
});

test('dwindle starts full and ends at nothing on a monotone descent', () => {
  const id = curveOf('dwindle');
  assert.equal(curveAt(id, 0), 1);
  assert.equal(curveAt(id, 1), 0);
  let prev = 1;
  for (let i = 1; i <= 16; i++) {
    const v = curveAt(id, i / 16);
    assert.ok(v <= prev + 1e-9, `descends at ${i}`);
    prev = v;
  }
});

test('mixHex mixes in RGB and round-trips its ends', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#f00', '#00f', 0.5), '#800080');
});

test('a hard ramp switches exactly at its stops — the fade law in a table', () => {
  const id = rampOf({ stops: ['#ffdd88', '#ff7733', '#882211', '#333333'], at: [0, 0.4, 0.7, 0.9] });
  assert.equal(rampAt(id, 0.1), '#ffdd88');
  assert.equal(rampAt(id, 0.5), '#ff7733');
  assert.equal(rampAt(id, 0.8), '#882211');
  assert.equal(rampAt(id, 0.95), '#333333');
  assert.deepEqual(rampBands(id), ['#ffdd88', '#ff7733', '#882211', '#333333']);
});

test('a posterized ramp wears exactly N flat bands, hot end first, cold end last', () => {
  const id = rampOf({ stops: ['#ffffff', '#000000'], steps: 8 });
  const bands = rampBands(id);
  assert.equal(bands.length, 8);
  // Strictly darkening: each band's red channel below the last.
  let prev = 256;
  for (const b of bands) {
    const r = parseInt(b.slice(1, 3), 16);
    assert.ok(r < prev, `${b} darker than the band before`);
    prev = r;
  }
  assert.equal(rampAt(id, 0), bands[0]);
  assert.equal(rampAt(id, 1), bands[7]);
});

test('ramps memoize on their full spec; a one-stop ramp is a constant', () => {
  const a = rampOf({ stops: ['#111111', '#222222'], steps: 4 });
  const b = rampOf({ stops: ['#111111', '#222222'], steps: 4 });
  const c = rampOf({ stops: ['#111111', '#222222'], steps: 5 });
  assert.equal(a, b);
  assert.notEqual(a, c);
  const k = rampOf({ stops: ['#abcdef'] });
  assert.equal(rampAt(k, 0), '#abcdef');
  assert.equal(rampAt(k, 1), '#abcdef');
  assert.ok(rampKeyOf(a).startsWith('#111111|#222222'));
  assert.throws(() => rampOf({ stops: [] }));
});

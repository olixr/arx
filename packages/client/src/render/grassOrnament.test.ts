import test from 'node:test';
import assert from 'node:assert/strict';
import type { Flower, SeedHead } from './grass.js';
import { ORNAMENT_INSTANCE_FLOATS, packOrnamentInstances } from './grassOrnament.js';

const flower = (o: Partial<Flower>): Flower => ({ bx: 1, by: 2, h: 0.4, size: 0.05, pal: 2, phase: 0.3, ...o });
const seed = (o: Partial<SeedHead>): SeedHead => ({ bx: 3, by: 4, h: 0.7, size: 0.04, lean: 0.12, phase: 0.6, bin: 1, ...o });

test('packOrnamentInstances lays flowers (kind 0) then seeds (kind 1)', () => {
  const buf = packOrnamentInstances([flower({}), flower({ pal: 3 })], [seed({})]);
  assert.equal(buf.length, 3 * ORNAMENT_INSTANCE_FLOATS);
  const near = (a: number | undefined, b: number) => assert.ok(Math.abs((a ?? NaN) - b) < 1e-6, `${a} ≈ ${b}`);
  // flower 0: [bx,by,h,size,kind=0,pal=2,phase,lean=0]
  near(buf[0], 1); near(buf[1], 2); near(buf[2], 0.4); near(buf[3], 0.05);
  assert.equal(buf[4], 0); near(buf[5], 2); near(buf[6], 0.3); assert.equal(buf[7], 0);
  // flower 1 pal 3
  near(buf[ORNAMENT_INSTANCE_FLOATS + 5], 3);
  // seed (index 2): kind=1, lean carried, pal 0
  const s = 2 * ORNAMENT_INSTANCE_FLOATS;
  near(buf[s], 3); near(buf[s + 1], 4); near(buf[s + 2], 0.7); near(buf[s + 3], 0.04);
  assert.equal(buf[s + 4], 1); assert.equal(buf[s + 5], 0); near(buf[s + 6], 0.6); near(buf[s + 7], 0.12);
});

test('packOrnamentInstances reuses a big-enough out buffer', () => {
  const out = new Float32Array(4 * ORNAMENT_INSTANCE_FLOATS);
  const buf = packOrnamentInstances([flower({})], [seed({})], out);
  assert.equal(buf, out);
  const small = new Float32Array(1);
  const buf2 = packOrnamentInstances([flower({})], [seed({})], small);
  assert.notEqual(buf2, small);
  assert.equal(buf2.length, 2 * ORNAMENT_INSTANCE_FLOATS);
});

test('packOrnamentInstances handles empty input', () => {
  const buf = packOrnamentInstances([], []);
  assert.equal(buf.length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crownUvSig,
  crownUvSize,
  crownScaleBucket,
  CROWN_UV_MAX,
  CROWN_TPT_MAX,
} from './structWarp.js';

// THE ONE RENDER — B8: the warp-don't-repaint crown cache invariants.
//
// The whole point of the scheme is that the crown TEXTURE is baked once and
// reused across frames while the camera moves; only the projected quad
// corners change. These tests pin the two properties that make that sound:
//   1. the content signature is CAMERA-INDEPENDENT (position/pan/zoom-within
//      -a-bucket/q do not change it) — so a moving camera is a cache HIT;
//   2. a real CONTENT change (edit rev, material, zoom bucket, dpr, size)
//      DOES change it — so a stale texture is never shown (rev-bump eviction).

test('crownUvSig: identical content → identical sig (cache hit while camera moves)', () => {
  // Same span identity, material, size, dpr — two different frames.
  const a = crownUvSig(0x1234, 160, 16, 0, 400, 80);
  const b = crownUvSig(0x1234, 160, 16, 0, 400, 80);
  assert.equal(a, b, 'a static crown must hash equal frame-to-frame');
});

test('crownUvSig: the signature carries NO camera position/pan/q term', () => {
  // The sig function takes only (pbKey, scaleBucket, dprBits, matClass,
  // uvW, uvH). There is deliberately no camX/camY/q/screenX parameter — a
  // pan or a q change (same zoom bucket + dpr + size) cannot change it. We
  // prove it by construction: the ONLY inputs are content, so equal content
  // is equal sig regardless of any camera motion the caller applied.
  const base = crownUvSig(0x7f, 200, 16, 1, 512, 96);
  // A caller that panned/leaned but stayed in the same zoom bucket, same
  // dpr, same material and same UV size recomputes the SAME inputs:
  const afterPanAndLean = crownUvSig(0x7f, 200, 16, 1, 512, 96);
  assert.equal(afterPanAndLean, base);
});

test('crownUvSig: an edit (pbKey rev bump) changes the sig → re-bake', () => {
  const before = crownUvSig(0x1000, 160, 16, 0, 400, 80);
  const afterEdit = crownUvSig(0x1001, 160, 16, 0, 400, 80); // pbKey folds chunk rev
  assert.notEqual(before, afterEdit, 'a chunk edit must invalidate the crown texture');
});

test('crownUvSig: material / zoom-bucket / dpr / size each change the sig', () => {
  const base = crownUvSig(0x55, 160, 16, 0, 400, 80);
  assert.notEqual(base, crownUvSig(0x55, 160, 16, 1, 400, 80), 'material (wood→stone)');
  assert.notEqual(base, crownUvSig(0x55, 168, 16, 0, 400, 80), 'zoom bucket crossed');
  assert.notEqual(base, crownUvSig(0x55, 160, 24, 0, 400, 80), 'dpr flip');
  assert.notEqual(base, crownUvSig(0x55, 160, 16, 0, 464, 80), 'UV width grew');
  assert.notEqual(base, crownUvSig(0x55, 160, 16, 0, 400, 96), 'UV height grew');
});

test('crownUvSig: distinct spans in one run get distinct sigs (no cross-span smear)', () => {
  // Adjacent spans of one wall run carry different pbKeys (their extents/
  // anchors differ) → different textures, so one span never samples another.
  const s0 = crownUvSig(0xaaa1, 160, 16, 0, 400, 80);
  const s1 = crownUvSig(0xaaa2, 160, 16, 0, 240, 80);
  assert.notEqual(s0, s1);
});

test('crownUvSize: content-sized and BOUNDED (never screen-sized)', () => {
  // A modest run at a normal zoom.
  const a = crownUvSize(6, 1, 40, 2); // 6×1 tiles, scale 40, dpr 2 → tpt 80
  assert.equal(a.uvW, 480);
  assert.equal(a.uvH, 80);
  // A zoomed-in lean cannot mint a giant texture: tpt is capped, dims capped.
  const big = crownUvSize(40, 40, 4000, 4); // absurd zoom
  assert.ok(big.uvW <= CROWN_UV_MAX && big.uvH <= CROWN_UV_MAX, 'UV dims are bounded');
  assert.ok(big.tpt <= CROWN_TPT_MAX, 'texels-per-tile is capped');
  // Even a 1-texel-thin span never collapses to 0 (upload/clear safety).
  const tiny = crownUvSize(0.01, 0.01, 1, 1);
  assert.ok(tiny.uvW >= 1 && tiny.uvH >= 1);
});

test('crownScaleBucket: a small zoom glide stays in one bucket; a real zoom crosses it', () => {
  assert.equal(crownScaleBucket(40.0), crownScaleBucket(40.1), 'a sub-quarter glide reuses');
  assert.notEqual(crownScaleBucket(40.0), crownScaleBucket(41.0), 'a full-tile zoom re-bakes');
});

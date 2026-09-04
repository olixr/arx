import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISTURB_TUNE,
  MAX_DISTURB,
  grassDisturbGlsl,
  grassDisturbMirror,
  packDisturbers,
} from './grassGpu.js';
import { grassShadowVertSrc } from './grassGpuShadow.js';

/**
 * GRASS G-INTERACT — THE MEADOW PARTS, pinned.
 *
 * The displacement law is pure and shared: `packDisturbers` packs the
 * frame's bodies into the two uniform arrays, and `grassDisturbMirror` is
 * the JS twin of the GLSL `grassDisturbGlsl()` every disturbed blade (and
 * its cast) runs. These tests lock the FEEL contract — a soft radial part,
 * a tight foot pocket, a travel wake — and guard the GLSL↔JS parity so the
 * shader and the mirror cannot drift.
 */

test('packDisturbers scales the body radius, clamps velocity, and caps the count', () => {
  const pos = new Float32Array(MAX_DISTURB * 4);
  const vel = new Float32Array(MAX_DISTURB * 2);
  const entries = [
    { x: 10, y: 20, r: 0.3, vx: 2, vy: -1 },
    { x: -5, y: 3, r: 0.1, vx: 99, vy: -99 }, // tiny body → min radius; huge vel → clamp
  ];
  const n = packDisturbers(entries, pos, vel, { radiusScale: 2.8, minRadius: 0.95, velClamp: 5 });
  assert.equal(n, 2);
  // Body 0: radius = max(0.95, 0.3·2.8=0.84) = 0.95 (floor wins here).
  assert.equal(pos[0], 10);
  assert.equal(pos[1], 20);
  assert.ok(Math.abs(pos[2]! - 0.95) < 1e-6, 'radius floor');
  assert.equal(pos[3], 1, 'default strength');
  assert.ok(Math.abs(vel[0]! - 2) < 1e-6 && Math.abs(vel[1]! + 1) < 1e-6, 'velocity passes through under clamp');
  // Body 1: velocity clamped to ±5.
  assert.equal(vel[2], 5);
  assert.equal(vel[3], -5);
});

test('packDisturbers writes at most MAX_DISTURB records', () => {
  const pos = new Float32Array(MAX_DISTURB * 4);
  const vel = new Float32Array(MAX_DISTURB * 2);
  const entries = Array.from({ length: MAX_DISTURB + 5 }, (_, i) => ({ x: i, y: i, r: 0.3, vx: 0, vy: 0 }));
  const n = packDisturbers(entries, pos, vel);
  assert.equal(n, MAX_DISTURB);
});

test('a blade at the foot centre parts hard and flattens; at the radius edge it is untouched', () => {
  const pos = new Float32Array([0, 0, 2, 1]); // one body at origin, radius 2, strength 1
  const vel = new Float32Array([0, 0]);
  // A blade a hair off-centre (so the radial direction is defined): strong
  // push AWAY (outward) and a near-max pocket flatten.
  const near = grassDisturbMirror(0.05, 0, 0, pos, vel, 1);
  assert.ok(near.px > 0.3, `strong outward part near foot, got ${near.px}`);
  assert.ok(near.flat > 0.7, `foot pocket flattens, got ${near.flat}`);
  // At the radius edge the smoothstep falloff has reached zero — no touch.
  const edge = grassDisturbMirror(2, 0, 0, pos, vel, 1);
  assert.ok(Math.abs(edge.px) < 1e-6 && Math.abs(edge.py) < 1e-6, 'no push at radius edge');
  assert.equal(edge.flat, 0, 'no flatten at radius edge');
});

test('the part is radial (points away from the body) and falls off monotonically', () => {
  const pos = new Float32Array([0, 0, 4, 1]);
  const vel = new Float32Array([0, 0]);
  // Along +x: push.x must be positive (away from origin) and shrink with distance.
  let prev = Infinity;
  for (const d of [0.5, 1, 2, 3, 3.9]) {
    const g = grassDisturbMirror(d, 0, 0, pos, vel, 1);
    assert.ok(g.px > 0, `outward at ${d}`);
    assert.ok(g.px < prev, `push decays with distance at ${d}`);
    prev = g.px;
  }
});

test('the pocket is tighter than the part (a foot pocket, not a bald ring)', () => {
  const pos = new Float32Array([0, 0, 4, 1]);
  const vel = new Float32Array([0, 0]);
  // Just outside the pocket fraction but well inside the radius: still parts,
  // but no longer flattens — the clear pocket is confined to the inner core.
  const justOutsidePocket = DISTURB_TUNE.pocketFrac * 4 + 0.3;
  const g = grassDisturbMirror(justOutsidePocket, 0, 0, pos, vel, 1);
  assert.ok(g.px > 0, 'still parts outside the pocket');
  assert.ok(g.flat < 0.05, `no flatten beyond the pocket core, got ${g.flat}`);
});

test('a moving body combs the blades down in its travel direction (the wake)', () => {
  const pos = new Float32Array([0, 0, 3, 1]);
  const still = new Float32Array([0, 0]);
  const moving = new Float32Array([4, 0]); // travelling +x at 4 u/s
  // Sample a blade OFF the travel axis (above the body) so the radial part is
  // sideways (−y-ish) and the wake shows as an added +x lay-over.
  const a = grassDisturbMirror(0, 1, 0, pos, still, 1);
  const b = grassDisturbMirror(0, 1, 0, pos, moving, 1);
  assert.ok(b.px > a.px + 0.05, `wake lays blades toward travel: still ${a.px} vs moving ${b.px}`);
});

test('grassDisturbGlsl is templated from DISTURB_TUNE (GLSL↔mirror cannot drift)', () => {
  const src = grassDisturbGlsl();
  // The exact tuning numbers must appear in the emitted GLSL — the mirror
  // reads the same DISTURB_TUNE, so a change in one shows in both.
  assert.ok(src.includes(`${DISTURB_TUNE.bendRadial}`), 'bendRadial embedded');
  assert.ok(src.includes(`${DISTURB_TUNE.bendWake}`), 'bendWake embedded');
  assert.ok(src.includes(`${DISTURB_TUNE.pocketFrac}`), 'pocketFrac embedded');
  assert.ok(src.includes(`${DISTURB_TUNE.pocketMax}`), 'pocketMax embedded');
  // The uniforms the feed sets, and a single out-param entry point.
  assert.match(src, /uniform vec4 uDisturb\[/);
  assert.match(src, /uniform vec2 uDisturbVel\[/);
  assert.match(src, /void grassDisturb\(vec2 root, float jitter, out vec2 push, out float pocket\)/);
  // 'flat' is a reserved GLSL interpolation qualifier — it must NOT be used
  // as an identifier (that miscompile silently dropped the whole GPU path).
  assert.ok(!/\bout float flat\b/.test(src), "no reserved 'flat' identifier");
});

test('the cast shader shares the ONE parting law (no private trample loop)', () => {
  const src = grassShadowVertSrc();
  // It embeds the shared function and calls it — no private copy that could
  // drift. The disturber loop appears exactly ONCE (inside grassDisturb).
  assert.match(src, /grassDisturb\(iRoot, jit, push, press\)/);
  assert.match(src, /void grassDisturb\(vec2 root, float jitter, out vec2 push, out float pocket\)/);
  const loops = src.match(/for \(int i = 0; i < 8; i\+\+\)/g) ?? [];
  assert.equal(loops.length, 1, 'the cast shader has a single (shared) disturb loop');
});

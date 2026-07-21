/**
 * Death-ragdoll laws: bones keep their lengths, bodies thud down and
 * STAY down (no bouncing prop), momentum pitches the trunk along the
 * blow, and every skeleton comes to rest on the ground line.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEAST_UPPER,
  H,
  HUMANOID_FEET,
  HUMANOID_UPPER,
  Ragdoll,
  buildBeastRagdoll,
  buildHumanoidRagdoll,
  type RagImpact,
} from './ragdoll.js';
import { beastSpec } from './rig.js';

const DT = 1 / 60;

/** Renderer-style anchor: velocity decays, Δv feeds the rag as carry. */
function settle(rag: Ragdoll, v0: number, seconds = 6): void {
  let v = v0;
  for (let t = 0; t < seconds; t += DT) {
    if (rag.settled) break;
    const ov = v;
    v *= Math.max(0, 1 - (2 + 9 * rag.groundedFrac()) * DT);
    rag.step(DT, v - ov, 0);
  }
}

function stickLengths(rag: Ragdoll): number[] {
  // Recompute pair distances via the private stick list.
  const sticks = (rag as unknown as { sticks: Array<{ a: number; b: number; len: number }> }).sticks;
  return sticks.map((s) => {
    const a = rag.pts[s.a]!;
    const b = rag.pts[s.b]!;
    return Math.hypot(b.x - a.x, b.y - a.y) / s.len;
  });
}

test('humanoid ragdoll settles on the ground with bones intact', () => {
  const rag = buildHumanoidRagdoll(1, 12345);
  rag.launch(1, 0, 0.8, HUMANOID_UPPER, HUMANOID_FEET);
  settle(rag, 5.5);
  assert.ok(rag.settled, 'ragdoll must come to rest within the window');
  for (const p of rag.pts) {
    assert.ok(p.y <= p.floor + 1e-3, 'no point sinks through the ground');
  }
  for (const r of stickLengths(rag)) {
    assert.ok(Math.abs(r - 1) < 0.08, `bone stretched to ${r}x rest length`);
  }
});

test('the trunk never bounces back off the ground', () => {
  const rag = buildHumanoidRagdoll(1, 999);
  rag.launch(1, 0, 1, HUMANOID_UPPER, HUMANOID_FEET);
  const pelvis = rag.pts[H.pelvis]!;
  let touched = false;
  let reboundPeak = 0;
  let v = 6.5;
  for (let t = 0; t < 6; t += DT) {
    if (rag.settled) break;
    const ov = v;
    v *= Math.max(0, 1 - (2 + 9 * rag.groundedFrac()) * DT);
    rag.step(DT, v - ov, 0);
    if (pelvis.grounded) touched = true;
    else if (touched) reboundPeak = Math.max(reboundPeak, pelvis.floor - pelvis.y);
  }
  assert.ok(touched, 'the trunk must reach the ground');
  assert.ok(reboundPeak < 0.15, `trunk rebounded ${reboundPeak} tiles — corpses do not bounce`);
});

test('momentum sprawls the body along the blow', () => {
  const rag = buildHumanoidRagdoll(1, 4242);
  rag.launch(1, 0, 1, HUMANOID_UPPER, HUMANOID_FEET);
  settle(rag, 6.5);
  const head = rag.pts[H.head]!;
  const feetX = (rag.pts[H.footL]!.x + rag.pts[H.footR]!.x) / 2;
  assert.ok(
    head.x > feetX + 0.15,
    `head (${head.x.toFixed(2)}) should land down-blow of the feet (${feetX.toFixed(2)})`,
  );
});

test('hard hits land harder touchdowns than chip kills', () => {
  const run = (power: number, v0: number): number => {
    const rag = buildHumanoidRagdoll(1, 77);
    rag.launch(1, 0, power, HUMANOID_UPPER, HUMANOID_FEET);
    let v = v0;
    let peak = 0;
    const impacts: RagImpact[] = [];
    for (let t = 0; t < 6; t += DT) {
      if (rag.settled) break;
      const ov = v;
      v *= Math.max(0, 1 - (2 + 9 * rag.groundedFrac()) * DT);
      impacts.length = 0;
      rag.step(DT, v - ov, 0, impacts);
      for (const imp of impacts) peak = Math.max(peak, imp.speed);
    }
    return peak;
  };
  const heavy = run(1, 6.5);
  const chip = run(0.1, 1.8);
  assert.ok(heavy > chip, `heavy launch (${heavy}) must thud harder than a chip kill (${chip})`);
});

test('beast ragdoll builds one chain per leg and settles', () => {
  const spec = beastSpec('wolf', 0.34, 4.6);
  const rag = buildBeastRagdoll(spec, 0.34, 31337);
  assert.equal(rag.pts.length, 3 + spec.rig.legs.length * 2);
  const feet: number[] = [];
  for (let i = 4; i < rag.pts.length; i += 2) feet.push(i);
  rag.launch(-1, 0, 0.7, BEAST_UPPER, feet);
  settle(rag, -4.5);
  assert.ok(rag.settled, 'beast ragdoll must come to rest');
  for (const p of rag.pts) assert.ok(p.y <= p.floor + 1e-3);
});

test('a settled ragdoll sleeps — stepping it further moves nothing', () => {
  const rag = buildHumanoidRagdoll(0.85, 55);
  rag.launch(0.6, 0, 0.4, HUMANOID_UPPER, HUMANOID_FEET);
  settle(rag, 3);
  assert.ok(rag.settled);
  const frozen = rag.pts.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < 30; i++) rag.step(DT, 0.4, -0.2);
  for (let i = 0; i < rag.pts.length; i++) {
    assert.equal(rag.pts[i]!.x, frozen[i]!.x);
    assert.equal(rag.pts[i]!.y, frozen[i]!.y);
  }
});

/**
 * THE EQUINE LIMB / THE WALK HAS AN ORDER — saddle gait laws.
 *
 * A mount's walk is a 4-beat LATERAL sequence (LH, LF, RH, RF): the
 * stately led-walk every riding horse keeps and the read that
 * separates a heroic courser from a sewing machine. The gallop stays
 * the flight rig's probed rolling beat (do not re-tune it here — the
 * 4-up frame is out of reach of the rhythm nudge BY DESIGN).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegRig } from './legs.js';
import { beastSpec, mountSpec } from './rig.js';

const DT = 1 / 60;

/** Walk a rig straight east and log the landing order of its legs. */
function landings(rig: LegRig, speed: number, seconds: number): number[] {
  const out: number[] = [];
  let lastLifts: number[] | null = null;
  for (let t = 0; t < seconds; t += DT) {
    const pose = rig.update(speed * t, 0, 0, DT);
    if (lastLifts) {
      for (let i = 0; i < pose.feet.length; i++) {
        if (lastLifts[i]! > 0 && pose.feet[i]!.lift === 0) out.push(i);
      }
    }
    lastLifts = pose.feet.map((f) => f.lift);
  }
  return out;
}

test('the courser walks the lateral sequence — LH, LF, RH, RF', () => {
  const spec = mountSpec('courser_bay');
  const order = spec.rig.walkOrder;
  assert.ok(order && order.length === 4, 'the saddle rig authors a walk order');
  const rig = new LegRig(spec.rig);
  const seq = landings(rig, 2.2, 8);
  assert.ok(seq.length >= 12, `walk landed only ${seq.length} beats in 8s`);
  // Drop the settle (the order law needs one full cycle to take hold),
  // then every landing must be the previous landing's successor.
  const settled = seq.slice(6);
  for (let k = 1; k < settled.length; k++) {
    const at = order.indexOf(settled[k - 1]!);
    const want: number = order[(at + 1) % order.length]!;
    assert.equal(
      settled[k],
      want,
      `beat ${k}: leg ${settled[k]} landed after ${settled[k - 1]} (wanted ${want}) — ${settled.join(',')}`,
    );
  }
});

test('the sabercat keeps the same walking law', () => {
  const spec = mountSpec('sabercat_night');
  assert.deepEqual(spec.rig.walkOrder, [2, 0, 3, 1]);
});

test('the order law never strangles the gallop', () => {
  const spec = mountSpec('courser_bay');
  const rig = new LegRig(spec.rig);
  // Full saddle speed (1.6× the 5 t/s stride): the flight rig must
  // still fly — beats keep landing and legs overlap in the air.
  const seq = landings(rig, 8, 4);
  assert.ok(seq.length >= 30, `gallop landed only ${seq.length} beats in 4s`);
  let airPairs = 0;
  const rig2 = new LegRig(mountSpec('courser_grey').rig);
  for (let t = 0; t < 4; t += DT) {
    const pose = rig2.update(8 * t, 0, 0, DT);
    if (pose.feet.filter((f) => f.lift > 0).length >= 2) airPairs++;
  }
  assert.ok(airPairs > 20, 'the gallop lost its aerial overlap');
});

test('saddle bone outweighs the farmyard — the heroic gauge', () => {
  const courser = mountSpec('courser_bay');
  const garron = mountSpec('garron_hoargate');
  const saber = mountSpec('sabercat_night');
  const cow = beastSpec('cow', 0.34, 1.8);
  // The old stroke-gauge courser leg (0.09) ran THINNER than a cow's
  // under a barrel half again as tall — never again.
  assert.ok(courser.legW > cow.legW * 1.15, 'courser bone must outweigh cattle');
  assert.ok(garron.legW > courser.legW, 'the garron is the stockier build');
  assert.ok(saber.legW > 0.09, 'the riding cat carries riding bone');
  // The horn block derives from legW — the dial holds it under one so
  // the heavier bone never lands a clown boot.
  assert.ok((courser.footScale ?? 1) < 1);
});

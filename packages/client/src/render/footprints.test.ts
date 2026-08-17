import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIFT_RING, LegRig, type LegRigConfig } from './legs.js';
import {
  FOOTPRINT_TUNE,
  FootprintField,
  PRINT_SHAPES,
  printInkFor,
  type FootWord,
} from './footprints.js';
import { Tile } from '@arx/shared';

const DT = 1 / 60;

const BIPED: LegRigConfig = {
  legs: [
    { fwd: 0, side: -0.1, group: 0 },
    { fwd: 0, side: 0.1, group: 1 },
  ],
  legLen: 0.46,
  rise: 0.4,
  liftAmp: 0.16,
  runSpeed: 5,
  billboard: true,
  flight: true,
};

const QUAD: LegRigConfig = {
  legs: [
    { fwd: 0.22, side: -0.12, group: 0 },
    { fwd: 0.22, side: 0.12, group: 1 },
    { fwd: -0.22, side: -0.12, group: 1 },
    { fwd: -0.22, side: 0.12, group: 0 },
  ],
  legLen: 0.34,
  rise: 0.28,
  liftAmp: 0.1,
  runSpeed: 4,
  turnRate: 6,
};

/**
 * THE LIFT IS HONEST: every stride's launch banks one lift event at
 * the exact planted position, and lifts reconcile with plants (every
 * lift eventually lands; only airborne feet may differ).
 */
test('a walking biped banks a lift event per stride, on the walked line', () => {
  const rig = new LegRig(BIPED);
  for (let t = 0; t < 3; t += DT) rig.update(3 * t, 0, 0, DT);
  assert.ok(rig.lifts > 6, `expected a stride ladder, got ${rig.lifts} lifts`);
  assert.ok(Math.abs(rig.lifts - rig.plants) <= BIPED.legs.length);
  const n = Math.min(rig.lifts, LIFT_RING);
  let sawLeft = false;
  let sawRight = false;
  for (let k = rig.lifts - n; k < rig.lifts; k++) {
    const ev = rig.liftRing[k & (LIFT_RING - 1)]!;
    assert.ok(Number.isFinite(ev.x + ev.y + ev.dir + ev.speed));
    // Feet stay in the stride corridor around the +x walk line.
    assert.ok(Math.abs(ev.y) < 0.5, `lift drifted off the line: y=${ev.y}`);
    if (ev.side < 0) sawLeft = true;
    else sawRight = true;
  }
  assert.ok(sawLeft && sawRight, 'both feet must print, alternating');
});

test('a quadruped pair-launch banks every lift, all finite', () => {
  const rig = new LegRig(QUAD);
  for (let t = 0; t < 3; t += DT) rig.update(2.5 * t, 0.5 * t, Math.atan2(0.5, 2.5), DT);
  assert.ok(rig.lifts > 10);
  for (const ev of rig.liftRing) {
    assert.ok(Number.isFinite(ev.x + ev.y + ev.dir + ev.speed));
  }
});

/** A SNAP IS NOT A STEP: teleports and reconciliation snaps never print. */
test('a teleport snap emits no lift events', () => {
  const rig = new LegRig(BIPED);
  // Settle: stand still long enough for any initial shuffle to drain.
  for (let t = 0; t < 2; t += DT) rig.update(0, 0, 0, DT);
  const before = rig.lifts;
  rig.update(50, 50, 0, DT);
  assert.equal(rig.lifts, before, 'a 50-tile snap must not stamp a print');
});

/** THE GROUND DECIDES THE INK — and materials keep their memory. */
test('print ink: dirt/sand/snow/soil take prints; the rest swallow them', () => {
  assert.ok(printInkFor(Tile.Dirt));
  assert.ok(printInkFor(Tile.Path));
  assert.ok(printInkFor(Tile.Sand));
  assert.ok(printInkFor(Tile.Snow));
  assert.ok(printInkFor(Tile.Tilled), 'worked soil prints like dirt');
  for (const t of [
    Tile.Grass,
    Tile.GrassTall,
    Tile.StoneFloor,
    Tile.WoodFloor,
    Tile.Water,
    Tile.WaterDeep,
    Tile.CaveFloor,
    undefined,
  ]) {
    assert.equal(printInkFor(t), null, `tile ${t} must take no print`);
  }
  // Snow holds a track longest; wind takes sand soonest.
  assert.ok(printInkFor(Tile.Snow)!.lifeMult > printInkFor(Tile.Dirt)!.lifeMult);
  assert.ok(printInkFor(Tile.Sand)!.lifeMult < 1);
});

/** THE PRINT IS THE FOOT: every word has a to-scale, finite shape. */
test('every foot word carries a bounded low-poly shape', () => {
  for (const word of Object.keys(PRINT_SHAPES) as FootWord[]) {
    const shape = PRINT_SHAPES[word];
    assert.ok(shape.polys.length >= 1, `${word} has no body poly`);
    assert.ok(shape.len > 0.05 && shape.len < 0.3, `${word} len ${shape.len} off the body ruler`);
    for (const poly of [...shape.polys, ...(shape.fine ?? [])]) {
      assert.ok(poly.length >= 6 && poly.length % 2 === 0);
      for (const v of poly) {
        assert.ok(Number.isFinite(v) && Math.abs(v) <= 0.75, `${word} vertex ${v} out of frame`);
      }
    }
  }
  // The ruler is the VISUAL foot: the rig wears chunky ~0.2-tile boots
  // against its 1.15-tile body, and the print matches the boot it saw.
  assert.ok(PRINT_SHAPES.boot.len > 0.18 && PRINT_SHAPES.boot.len < 0.26);
});

/** THE BUDGET BREATHES: hard cap recycles, pressure fast-fades oldest. */
test('the field holds its cap and pressure clears the oldest', () => {
  const ink = printInkFor(Tile.Dirt)!;
  const field = new FootprintField();
  const { cap, softCap, pressureFadeMs } = FOOTPRINT_TUNE;
  for (let i = 0; i < cap + 60; i++) {
    field.stamp(i * 0.1, 0, 0, i % 2 ? 1 : -1, 2, 'boot', 1, ink, 0);
  }
  assert.ok(field.liveCount <= cap, `ring overflowed: ${field.liveCount} > ${cap}`);
  // Budget pressure: over the soft cap, the oldest compress into the
  // fast fade and are GONE once that window passes — fresh tracks stay.
  field.tick(10);
  field.tick(10 + pressureFadeMs + 1);
  assert.ok(
    field.liveCount <= softCap,
    `pressure left ${field.liveCount} live prints (softCap ${softCap})`,
  );
  // Quiet fields keep their minute: a lone print far under the soft
  // cap survives well past the pressure window.
  const calm = new FootprintField();
  calm.stamp(0, 0, 0, 1, 2, 'paw', 1, ink, 0);
  calm.tick(30_000);
  assert.equal(calm.liveCount, 1, 'an uncrowded print must live out its minute');
});

/** The kill switch empties the field on the next frame. */
test('disabling footprints clears and blocks stamping', () => {
  const ink = printInkFor(Tile.Snow)!;
  const field = new FootprintField();
  field.stamp(0, 0, 0, 1, 2, 'boot', 1, ink, 0);
  assert.equal(field.liveCount, 1);
  FOOTPRINT_TUNE.enabled = false;
  try {
    field.stamp(1, 0, 0, 1, 2, 'boot', 1, ink, 0);
    assert.equal(field.liveCount, 1, 'a disabled field must refuse stamps');
  } finally {
    FOOTPRINT_TUNE.enabled = true;
  }
});

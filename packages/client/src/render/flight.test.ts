/**
 * THE FLIGHT RIG's law pins. The rig is the one carriage every flier
 * rides, so its promises are pinned here once, for all of them:
 * continuous state blends (hover → slow flight → cruise, never a
 * pose swap), a phase-continuous wingbeat through every tempo change,
 * simulated wing vanes that settle to THE ONE REST and bend but never
 * fold (the STRENGTH LAW), teleport snap, seeded determinism, and
 * NaN-free painters for every body that rides it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAT_FLIER,
  ELDER_OWL_FLIER,
  FlightRig,
  OWL_FLIER,
  WingSim,
  drawBat,
  drawGreatOwl,
  flierSpec,
  stagedFlight,
  wingBeat,
} from './flight.js';
import { ELDER_GREAT_OWL_LOOK, beastSpec, owlLook } from './rig.js';

const DT = 1 / 60;

/** Drive a rig N frames at a held travel dial along +x. */
function run(rig: FlightRig, frames: number, moveK: number, o?: { attackT?: number }) {
  let f = rig.update({ x: 0, y: 0, dir: 0, moveK, dt: DT });
  for (let i = 1; i < frames; i++) {
    f = rig.update({
      x: moveK * i * DT * 3,
      y: 0,
      dir: 0,
      moveK,
      dt: DT,
      attackT: o?.attackT ?? 0,
    });
  }
  return f;
}

test('the spec ledger reads as rank and species: tempo, seat, tone, glides', () => {
  // The elder beats a slower, heavier wing and rides a higher seat.
  assert.ok(ELDER_OWL_FLIER.beatHz < OWL_FLIER.beatHz);
  assert.ok(ELDER_OWL_FLIER.hover > OWL_FLIER.hover);
  // The bat flutters far quicker on a looser membrane, and NEVER
  // glides — a glide is a feathered privilege.
  assert.ok(BAT_FLIER.beatHz > OWL_FLIER.beatHz * 2);
  assert.ok(BAT_FLIER.tone < OWL_FLIER.tone);
  assert.equal(BAT_FLIER.glides, false);
  assert.equal(OWL_FLIER.glides, true);
  // Routing: the ledger answers every flier def.
  assert.equal(flierSpec('great_owl'), OWL_FLIER);
  assert.equal(flierSpec('elder_great_owl'), ELDER_OWL_FLIER);
  assert.equal(flierSpec('cave_bat'), BAT_FLIER);
});

test('THE STATE BLEND: still = upright hover, sustained travel = level cruise', () => {
  const still = run(new FlightRig(OWL_FLIER, 3), 240, 0);
  assert.ok(still.hoverK > 0.95, `a still bird treads the hover (${still.hoverK})`);
  assert.ok(still.pitchA > OWL_FLIER.uprightA * 0.85, 'the hover stands the body near upright');
  assert.ok(still.pitchK < 0.15);
  const cruise = run(new FlightRig(OWL_FLIER, 3), 240, 1);
  assert.ok(cruise.hoverK < 0.05, 'full travel leaves the hover');
  assert.ok(cruise.pitchK > 0.9, `cruise streamlines level (${cruise.pitchK})`);
  assert.ok(cruise.cruiseK > 0.9);
});

test('the transition is a glide of the dial, never a pose swap', () => {
  const rig = new FlightRig(OWL_FLIER, 11);
  run(rig, 240, 0);
  // Throw the throttle open and watch every frame of the answer:
  // pitch must move smoothly (bounded per-frame slew), monotonically
  // toward level, and the wingbeat phase must never jump.
  let prev = rig.update({ x: 0, y: 0, dir: 0, moveK: 1, dt: DT });
  let maxPitchStep = 0;
  let maxArmStep = 0;
  for (let i = 1; i < 240; i++) {
    const f = rig.update({ x: i * DT * 3, y: 0, dir: 0, moveK: 1, dt: DT });
    maxPitchStep = Math.max(maxPitchStep, Math.abs(f.pitchA - prev.pitchA));
    maxArmStep = Math.max(maxArmStep, Math.abs(f.beat.arm - prev.beat.arm));
    prev = f;
  }
  assert.ok(prev.pitchK > 0.85, 'the transition arrives at cruise');
  assert.ok(maxPitchStep < 0.09, `pitch slews smoothly (${maxPitchStep.toFixed(4)}/frame)`);
  // The beat curve is bounded [-1,1]; a phase pop would step the arm
  // nearly a full stroke in one frame. A ~1.3Hz beat at 60fps moves
  // at most ~0.35/frame through its steepest harmonic.
  assert.ok(maxArmStep < 0.4, `the wingbeat phase never jumps (${maxArmStep.toFixed(3)})`);
});

test('THE ONE REST + STRENGTH LAW: the vane settles home and bends, never folds', () => {
  const sim = new WingSim(5, 1);
  sim.snap(0.2);
  for (const l of sim.lag) assert.equal(l, 0, 'snap IS the rest chain');
  // Thrash the bone violently — the vane must stay inside its cap.
  for (let i = 0; i < 120; i++) {
    sim.update(Math.sin(i * 1.7) * 1.2, DT);
    for (const l of sim.lag) {
      assert.ok(Number.isFinite(l), 'the sim never NaNs');
      assert.ok(Math.abs(l) < 1.0, `the vane bends, never folds (${l})`);
    }
  }
  // Hold the bone still: the vane comes home within 2.5 seconds and
  // reports itself calm — the renderer's re-bake cue goes quiet.
  for (let i = 0; i < 150; i++) sim.update(0.3, DT);
  for (const l of sim.lag) assert.ok(Math.abs(l) < 0.02, `settled ≡ rest (${l})`);
  assert.equal(sim.restless, false);
});

test('the teleport snap: a moved bird arrives flying, never whipping across', () => {
  const rig = new FlightRig(OWL_FLIER, 7);
  run(rig, 120, 1);
  const f = rig.update({ x: 500, y: 500, dir: 2, moveK: 0, dt: DT });
  assert.ok(Number.isFinite(f.lift) && Number.isFinite(f.raise));
  assert.equal(f.bank, 0, 'the bank resets at arrival');
  for (const l of [...f.port, ...f.star]) {
    assert.ok(Math.abs(l) < 0.05, 'the vanes arrive at rest');
  }
});

test('seeded determinism: same seed same flight, a knot never beats in sync', () => {
  const a = run(new FlightRig(OWL_FLIER, 42), 90, 0.6);
  const b = run(new FlightRig(OWL_FLIER, 42), 90, 0.6);
  assert.deepEqual(a, b, 'the rig is a pure function of seed and inputs');
  const c = run(new FlightRig(OWL_FLIER, 43), 90, 0.6);
  assert.notEqual(a.beat.arm, c.beat.arm, 'neighboring seeds scatter the stroke');
});

test('the glide is a feathered cruise privilege; the bat never earns one', () => {
  const owl = new FlightRig(OWL_FLIER, 5);
  let best = 0;
  for (let i = 0; i < 1200; i++) {
    const f = owl.update({ x: i * DT * 3, y: 0, dir: 0, moveK: 1, dt: DT });
    best = Math.max(best, f.glideK);
  }
  assert.ok(best > 0.3, `a cruising owl locks its wings out sometimes (${best})`);
  const bat = new FlightRig(BAT_FLIER, 5);
  for (let i = 0; i < 1200; i++) {
    const f = bat.update({ x: i * DT * 3, y: 0, dir: 0, moveK: 1, dt: DT });
    assert.equal(f.glideK, 0, 'a membrane never glides');
  }
  // And a hovering owl never glides either — glides live at cruise.
  const hoverOwl = new FlightRig(OWL_FLIER, 5);
  for (let i = 0; i < 600; i++) {
    const f = hoverOwl.update({ x: 0, y: 0, dir: 0, moveK: 0, dt: DT });
    assert.ok(f.glideK < 0.05, 'the hover works its wings');
  }
});

test('the swoop speaks through the rig: mantle flash, then talons and the dive', () => {
  const windup = stagedFlight(OWL_FLIER, { seed: 9, moveK: 0.5, attackT: 0.5 });
  assert.ok(windup.under, 'the windup flashes the pale underside');
  assert.ok(windup.talonK > 0.4, 'the gear drops through the mantle');
  assert.equal(windup.lungeF, 0, 'no lunge before the strike');
  const strike = stagedFlight(OWL_FLIER, { seed: 9, moveK: 0.5, attackT: 0.85 });
  assert.equal(strike.talonK, 1, 'the strike throws both talons');
  assert.ok(strike.lungeF > 0.2, 'the dive travels along the facing');
  assert.ok(strike.sweepK > windup.sweepK, 'the dive sweeps the wings back');
});

/** Minimal Path2D stand-in: records numbers, rejects NaN geometry. */
class FakePath2D {
  moveTo(...args: number[]): void {
    check(args);
  }
  lineTo(...args: number[]): void {
    check(args);
  }
  closePath(): void {}
  addPath(): void {}
}

function check(args: unknown[]): void {
  for (const a of args) {
    if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
  }
}

function mockCtx(): CanvasRenderingContext2D {
  const state = {
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      return (...args: unknown[]) => check(args);
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

test('every rig rider paints clean: owl, elder, bat × bands × carriages × hurt', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const owlSpec = beastSpec('great_owl', 0.36, 4.4);
    const elderSpec = beastSpec('elder_great_owl', 0.46, 4.6);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      for (const moveK of [0, 0.5, 1]) {
        for (const at of [0, 0.5, 0.85]) {
          for (const hurt of [false, true]) {
            const owlF = stagedFlight(OWL_FLIER, { seed: band, moveK, attackT: at });
            drawGreatOwl(mockCtx(), owlSpec, owlLook('great_owl', band * 3), {
              x: 80,
              y: 80,
              s: 48,
              dir,
              ys: 0.82,
              flight: owlF,
              attackT: at,
              hurt,
              nowMs: 4321 + band,
              seed: band,
            });
            drawGreatOwl(mockCtx(), elderSpec, ELDER_GREAT_OWL_LOOK, {
              x: 80,
              y: 80,
              s: 48,
              dir,
              ys: 0.82,
              flight: stagedFlight(ELDER_OWL_FLIER, { seed: band, moveK, attackT: at }),
              attackT: at,
              hurt,
              nowMs: 917 + band,
              seed: band * 13,
            });
            drawBat(mockCtx(), {
              x: 80,
              y: 80,
              s: 48,
              dir,
              radius: 0.28,
              color: '#5a4a5e',
              hurt,
              nowMs: 2222 + band,
              seed: band,
              ys: 0.82,
              flight: stagedFlight(BAT_FLIER, { seed: band, moveK, attackT: at }),
              attackT: at,
            });
          }
        }
      }
    }
  } finally {
    g.Path2D = hadPath as typeof Path2D;
  }
});

test('the beat curve is bounded, asymmetric, and phase-pure', () => {
  let falling = 0;
  let rising = 0;
  for (let i = 0; i < 400; i++) {
    const u = i / 400;
    const b = wingBeat(u);
    assert.ok(Math.abs(b.arm) <= 1.001 && Math.abs(b.hand) <= 1.001);
    assert.ok(b.power >= 0 && b.power <= 1 && b.recover >= 0 && b.recover <= 1);
    const slope = wingBeat(u + 1 / 400).arm - b.arm;
    if (slope < 0) falling++;
    else rising++;
  }
  // The bird stroke's asymmetry: a SHORT accelerating power stroke
  // down, a LONG decelerating recovery up — less time falling.
  assert.ok(falling > 0 && rising > 0 && falling < rising, `down ${falling} vs up ${rising}`);
  // Phase is cyclic: one full cycle returns home.
  assert.ok(Math.abs(wingBeat(0.25).arm - wingBeat(1.25).arm) < 1e-9);
});

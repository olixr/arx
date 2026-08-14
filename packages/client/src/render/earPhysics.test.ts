/**
 * THE EAR IS A SIMULATION — laws of the elastic pair. The rest chain
 * is one projection serving every facing band (no per-band rigging to
 * rot); the sim settles onto that chain (THE ONE REST), lags a turn
 * and comes home, and no violence can fold a blade past its strength
 * cap (THE STRENGTH LAW). The painter walks clean, notches for the
 * scarred, and splits membrane from back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EarSim,
  drawWingEar,
  earRestChain,
  type EarCarriage,
  type EarStyle,
} from './earPhysics.js';

const C: EarCarriage = {
  azimuth: 2.0,
  rootR: 0.19,
  rootLift: 0.05,
  length: 0.26,
  spread: 0.85,
  rise: 0.95,
  curl: [0, 0.16, 0.34],
};

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

test('THE ONE REST: a stationary sim settles onto the rest chain', () => {
  const sim = new EarSim(7);
  for (let i = 0; i < 240; i++) {
    sim.update(100, 100, 44, C, Math.PI / 2, 0, i * 16);
  }
  // The listening sway keeps a live tip breathing around the rest
  // seat, so the bound is the sway's own amplitude, not zero.
  for (const side of [-1, 1] as const) {
    const ch = sim.chain(side, C, Math.PI / 2, 0);
    const rest = earRestChain(side, C, { dir: Math.PI / 2, pin: 0, sway: 0 });
    for (let i = 0; i < ch.pts.length; i++) {
      assert.ok(
        dist(ch.pts[i]!, rest.pts[i]!) < C.length * 0.25,
        `node ${i} settles home (side ${side})`,
      );
    }
  }
});

test('THE STRENGTH LAW: no shaking folds a blade past its cap', () => {
  const sim = new EarSim(3);
  // Violent anchor thrash, every frame a new direction.
  for (let i = 0; i < 200; i++) {
    const ax = 100 + Math.sin(i * 2.7) * 40;
    const ay = 100 + Math.cos(i * 1.9) * 40;
    const dir = (i * 0.9) % (Math.PI * 2);
    sim.update(ax, ay, 44, C, dir, i % 2, i * 16);
    for (const side of [-1, 1] as const) {
      const ch = sim.chain(side, C, dir, i % 2);
      const rest = earRestChain(side, C, { dir, pin: i % 2, sway: 0 });
      for (let n = 1; n < ch.pts.length; n++) {
        const seg = dist(rest.pts[n]!, rest.pts[n - 1]!);
        const dev = dist(ch.pts[n]!, rest.pts[n]!);
        // The clamp bound plus the listening sway this sway-less rest
        // comparison ignores (the sim clamps against its TRUE swayed
        // rest — the slack covers the sway's whole-blade rotation).
        assert.ok(
          dev <= seg * (0.3 + 0.35 * n) + C.length * 0.16,
          `node ${n} stays inside its strength cap under thrash`,
        );
        assert.ok(Number.isFinite(ch.pts[n]!.x) && Number.isFinite(ch.pts[n]!.y));
      }
    }
  }
});

test('the turn lags and comes home', () => {
  const sim = new EarSim(11);
  for (let i = 0; i < 120; i++) sim.update(100, 100, 44, C, 0, 0, i * 16);
  // Snap the facing a quarter turn: the blades LAG the new rest...
  const t0 = 120 * 16;
  sim.update(100, 100, 44, C, Math.PI / 2, 0, t0);
  const restNew = earRestChain(1, C, { dir: Math.PI / 2, pin: 0, sway: 0 });
  const lag = dist(sim.chain(1, C, Math.PI / 2, 0).pts[3]!, restNew.pts[3]!);
  assert.ok(lag > C.length * 0.1, 'the tip lags a snapped quarter turn');
  // ...then swing home inside half a second.
  for (let i = 1; i <= 40; i++) sim.update(100, 100, 44, C, Math.PI / 2, 0, t0 + i * 16);
  const settled = dist(sim.chain(1, C, Math.PI / 2, 0).pts[3]!, restNew.pts[3]!);
  assert.ok(settled < lag * 0.6, 'the blade comes home after the turn');
});

test('the restless cue fires on motion and quiets at rest', () => {
  const sim = new EarSim(5);
  for (let i = 0; i < 90; i++) sim.update(100 + i * 3, 100, 44, C, 0, 0, i * 16);
  assert.ok(sim.restless, 'a moving body keeps the ears restless');
  for (let i = 90; i < 240; i++) sim.update(370, 100, 44, C, 0, 0, i * 16);
  assert.ok(!sim.restless, 'a settled pair falls back to the idle cadence');
});

test('the profile blade keeps its stature (silhouette hierarchy)', () => {
  // The style compresses true foreshortening: the E-band blade must
  // hold most of the face-on blade's run, or a nose out-points it.
  const spine = (dir: number): number => {
    const ch = earRestChain(1, C, { dir, pin: 0, sway: 0 });
    let len = 0;
    for (let i = 1; i < ch.pts.length; i++) len += dist(ch.pts[i]!, ch.pts[i - 1]!);
    return len;
  };
  assert.ok(spine(0) > spine(Math.PI / 2) * 0.66, 'east holds stature against south');
  assert.ok(spine(Math.PI) > spine(Math.PI / 2) * 0.66, 'west holds stature too');
});

/** Recording 2D-context stand-in: counts fills, rejects NaN coords. */
function mockCtx(): CanvasRenderingContext2D & { fills: number; coordSum: number } {
  const counter = {
    fills: 0,
    coordSum: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') {
        assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
        counter.coordSum += a;
      }
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      if (prop === 'fill') return () => target.fills++;
      return noop;
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { fills: number; coordSum: number };
}

const STYLE: EarStyle = {
  skin: '#5f8a3c',
  outline: '#33491f',
  membrane: '#a8bd82',
  rib: '#4a6a2e',
  seam: '#46662c',
};

test('the painter walks clean and the notch marks the scarred', () => {
  for (const dir of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const side of [-1, 1] as const) {
      const ch = earRestChain(side, C, { dir, pin: 0, sway: 0 });
      const pts = ch.pts.map((p) => ({ x: 100 + p.x * 44, y: 100 + p.y * 44 }));
      const plain = mockCtx();
      drawWingEar(plain, pts, 2, STYLE, {
        hurt: false,
        back: false,
        notch: false,
        headX: 100,
        headY: 100,
      });
      assert.ok(plain.fills >= 2, 'skin and membrane both land');
      const notched = mockCtx();
      drawWingEar(notched, pts, 2, STYLE, {
        hurt: false,
        back: false,
        notch: true,
        headX: 100,
        headY: 100,
      });
      assert.notEqual(plain.coordSum, notched.coordSum, 'the healed bite changes the blade');
      const behind = mockCtx();
      drawWingEar(behind, pts, 2, STYLE, {
        hurt: false,
        back: true,
        notch: false,
        headX: 100,
        headY: 100,
      });
      assert.ok(behind.fills < plain.fills, 'the back shows a seam, never the membrane');
    }
  }
});

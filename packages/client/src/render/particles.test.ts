import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Particles,
  PARTICLE_CAP,
  EMITTER_CAP,
  LANDING_BOUNCE,
  LANDING_SPLAT,
  rampColor,
  type Particle,
  type Landing,
} from './particles.js';

/** Deterministic PRNG so matter laws are pinnable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const liveOf = (ps: Particles): Particle[] => [...ps.live()];
const step = (ps: Particles, frames: number, dt = 0.016): Landing[] => {
  const landings: Landing[] = [];
  for (let i = 0; i < frames; i++) {
    ps.update(dt);
    ps.drainLandings((l) => landings.push({ ...l }));
  }
  return landings;
};

// ---------------------------------------------------------------------------
// Back-compat: the v4 surface behaves exactly as before.
// ---------------------------------------------------------------------------

test('a default burst is planar overlay matter — no altitude, no landing', () => {
  const ps = new Particles(mulberry32(1));
  ps.burst(3, 4, 10, ['#fa4']);
  assert.equal(ps.count(), 10);
  for (const p of ps.live()) {
    assert.equal(p.z, 0);
    assert.equal(p.vz, 0);
    assert.equal(p.zg, 0);
  }
  // Nothing on the sorted layers: the overlay pass owns all of it.
  assert.equal([...ps.groundParticles()].length, 0);
  assert.equal([...ps.worldParticles()].length, 0);
});

test('ground: true still routes to the ground layer (the old flag)', () => {
  const ps = new Particles(mulberry32(2));
  ps.burst(0, 0, 5, ['#888'], { ground: true });
  assert.equal([...ps.groundParticles()].length, 5);
  assert.equal([...ps.worldParticles()].length, 0);
});

test('the cap holds: a storm churns its oldest, the pool never grows', () => {
  const ps = new Particles(mulberry32(3));
  ps.burst(0, 0, PARTICLE_CAP + 700, ['#fff']);
  assert.equal(ps.count(), PARTICLE_CAP);
  // A second storm still fits — recycled slots, not pushed ones.
  ps.burst(1, 1, 500, ['#abc']);
  assert.equal(ps.count(), PARTICLE_CAP);
});

test('dead matter recycles through the free list', () => {
  const ps = new Particles(mulberry32(4));
  ps.burst(0, 0, 50, ['#fff'], { life: 0.1 });
  step(ps, 20); // 0.32s — every 0.07-0.13s life is over
  assert.equal(ps.count(), 0);
  ps.burst(0, 0, 30, ['#fff'], { life: 0.1 });
  assert.equal(ps.count(), 30);
});

// ---------------------------------------------------------------------------
// THE LIVING MATTER LAW: the cooling ramp.
// ---------------------------------------------------------------------------

test('the ramp cools in hard bands: color, fade, fade2, fade3 in order', () => {
  const p = {
    color: '#ffdd88',
    fade: '#ff7733',
    fadeAt: 0.4,
    fade2: '#882211',
    fade2At: 0.7,
    fade3: '#333333',
    fade3At: 0.9,
  } as Particle;
  assert.equal(rampColor(p, 0.1), '#ffdd88');
  assert.equal(rampColor(p, 0.5), '#ff7733');
  assert.equal(rampColor(p, 0.8), '#882211');
  assert.equal(rampColor(p, 0.95), '#333333');
});

test('an unset ramp stop is skipped — fade alone still switches at 55%', () => {
  const p = {
    color: '#fff',
    fade: '#444',
    fadeAt: 0.55,
    fade2: '',
    fade2At: 0.78,
    fade3: '',
    fade3At: 0.92,
  } as Particle;
  assert.equal(rampColor(p, 0.5), '#fff');
  assert.equal(rampColor(p, 0.6), '#444');
  assert.equal(rampColor(p, 0.99), '#444');
});

// ---------------------------------------------------------------------------
// HEIGHT IS REAL: altitude, gravity, and the four landings.
// ---------------------------------------------------------------------------

const THROWN = {
  speed: 0.5,
  life: 30,
  gravity: 0,
  vz: 2,
  zg: 8,
  layer: 'world',
} as const;

test('thrown matter arcs: up on vz, back down on zg, lands at z=0', () => {
  const ps = new Particles(mulberry32(5));
  ps.burst(0, 0, 1, ['#fff'], { ...THROWN, land: 'settle' });
  const p = liveOf(ps)[0]!;
  let peak = 0;
  for (let i = 0; i < 200; i++) {
    ps.update(0.016);
    peak = Math.max(peak, p.z);
  }
  assert.ok(peak > 0.05, `matter never rose (peak ${peak})`);
  assert.equal(p.z, 0);
});

test("land: 'settle' turns flight into ground dust — layer, drag, stillness", () => {
  const ps = new Particles(mulberry32(6));
  ps.burst(0, 0, 6, ['#a86'], { ...THROWN, land: 'settle' });
  assert.equal([...ps.worldParticles()].length, 6);
  step(ps, 200);
  const grounded = [...ps.groundParticles()];
  assert.equal(grounded.length, 6, 'every grain settled to the ground layer');
  for (const p of grounded) {
    assert.equal(p.z, 0);
    assert.equal(p.vz, 0);
    assert.ok(p.drag >= 6, 'settled dust drags to a stop');
    assert.ok(Math.hypot(p.vx, p.vy) < 0.5, 'settled dust is nearly still');
  }
});

test("land: 'die' removes matter at the dirt", () => {
  const ps = new Particles(mulberry32(7));
  ps.burst(0, 0, 8, ['#fff'], { ...THROWN, land: 'die' });
  step(ps, 200);
  assert.equal(ps.count(), 0);
});

test("land: 'bounce' reflects vz by restitution and thuds exactly once", () => {
  const ps = new Particles(mulberry32(8));
  ps.burst(0, 0, 1, ['#fff'], { ...THROWN, vz: 3, land: 'bounce', bounce: 0.6 });
  const landings = step(ps, 400);
  const thuds = landings.filter((l) => l.kind === LANDING_BOUNCE);
  assert.equal(thuds.length, 1, 'one thud per grain, however many hops');
  // Spring bleeds out: the grain ends as settled ground dust.
  assert.equal([...ps.groundParticles()].length, 1);
});

test("land: 'splat' dies into spatter fines + a lingering ground fleck", () => {
  const ps = new Particles(mulberry32(9));
  ps.burst(2, 3, 1, ['#6a4'], { ...THROWN, land: 'splat', fade3: '#231' });
  let splats: Landing[] = [];
  // Step frame by frame until the drop strikes.
  for (let i = 0; i < 400 && splats.length === 0; i++) {
    ps.update(0.016);
    ps.drainLandings((l) => {
      if (l.kind === LANDING_SPLAT) splats.push({ ...l });
    });
  }
  assert.equal(splats.length, 1, 'the strike is witnessed');
  // The stain speaks the FINAL ramp color — dried matter, not fresh.
  assert.equal(splats[0]!.color, '#231');
  // Parent dead; 3 fines + 1 fleck live on.
  assert.equal(ps.count(), 4);
  const flecks = [...ps.groundParticles()];
  assert.equal(flecks.length, 1, 'one fleck lies where it struck');
  assert.equal(flecks[0]!.color, '#231');
  assert.ok(Math.abs(flecks[0]!.x - 2) < 0.6 && Math.abs(flecks[0]!.y - 3) < 0.6, 'the fleck lies near the strike');
});

test('the landing queue is per-frame: undrained contacts never back up', () => {
  const ps = new Particles(mulberry32(10));
  ps.burst(0, 0, 1, ['#fff'], { ...THROWN, vz: 3, land: 'bounce' });
  // Never drain while it lands...
  for (let i = 0; i < 400; i++) ps.update(0.016);
  // ...then a fresh frame reports only fresh contacts: none.
  ps.update(0.016);
  let n = 0;
  ps.drainLandings(() => n++);
  assert.equal(n, 0);
});

// ---------------------------------------------------------------------------
// EMITTERS ARE THE GRAMMAR.
// ---------------------------------------------------------------------------

const STILL = { speed: 0, life: 99, gravity: 0 } as const;

test('an emitter pays its rate: ~rate × dur particles over its life', () => {
  const ps = new Particles(mulberry32(11));
  ps.emit({
    x: 0, y: 0, rate: 200, dur: 1, attack: 0, release: 0,
    pops: [{ colors: ['#fff'], opts: STILL }],
  });
  step(ps, 63); // 1.008s
  assert.ok(Math.abs(ps.count() - 200) <= 6, `expected ~200, got ${ps.count()}`);
  assert.equal(ps.emitterCount(), 0, 'the emitter retired at dur');
});

test('the attack ramp holds the first breath back', () => {
  const ps = new Particles(mulberry32(12));
  ps.emit({
    x: 0, y: 0, rate: 600, dur: 2, attack: 0.5, release: 0,
    pops: [{ colors: ['#fff'], opts: STILL }],
  });
  step(ps, 8); // 0.128s — deep inside the attack
  // Full rate would have paid ~77 by now; the ramp pays ~1/8 of that.
  assert.ok(ps.count() < 30, `attack leaked: ${ps.count()} particles in 0.13s`);
});

test('stop() folds the envelope down through the release tail', () => {
  const ps = new Particles(mulberry32(13));
  const e = ps.emit({
    x: 0, y: 0, rate: 100, dur: 10, attack: 0, release: 0.2,
    pops: [{ colors: ['#fff'], opts: STILL }],
  });
  step(ps, 10);
  e.stop();
  step(ps, 30); // past the release tail
  assert.equal(ps.emitterCount(), 0, 'a stopped emitter retires');
});

test('populations share the rate by weight — fines carry the texture', () => {
  const ps = new Particles(mulberry32(14));
  ps.emit({
    x: 0, y: 0, rate: 400, dur: 1, attack: 0, release: 0,
    pops: [
      { colors: ['#fff'], opts: { ...STILL, layer: 'world' }, weight: 3 },
      { colors: ['#fff'], opts: { ...STILL, layer: 'ground' }, weight: 1 },
    ],
  });
  step(ps, 63);
  const fines = [...ps.worldParticles()].length;
  const heroes = [...ps.groundParticles()].length;
  assert.ok(fines > heroes * 2, `weights ignored: ${fines} vs ${heroes}`);
  assert.ok(heroes > 50, `the light population still spawned (${heroes})`);
});

test('rim matter drives straight outward from the hoop', () => {
  const ps = new Particles(mulberry32(15));
  ps.emit({
    kind: 'rim', x: 5, y: 5, radius: 1, rate: 300, dur: 0.5,
    attack: 0, release: 0, outward: 2,
    pops: [{ colors: ['#fff'], opts: { ...STILL, layer: 'world', spread: 0.3 } }],
  });
  ps.update(0.1);
  const grains = [...ps.worldParticles()];
  assert.ok(grains.length > 10);
  for (const p of grains.slice(0, 10)) {
    const rx = p.x - 5;
    const ry = p.y - 5;
    // Position rides the hoop (update already moved it a step out).
    assert.ok(Math.hypot(rx, ry) > 0.85, 'spawned on the hoop, moving out');
    // Velocity points away from the heart.
    const dot = p.vx * rx + p.vy * ry;
    assert.ok(dot > 0, `rim grain drives inward (dot ${dot})`);
  }
});

test('the emitter cap recycles the oldest voice, never grows', () => {
  const ps = new Particles(mulberry32(16));
  for (let i = 0; i < EMITTER_CAP + 20; i++) {
    ps.emit({ x: 0, y: 0, rate: 1, dur: 9, pops: [{ colors: ['#fff'], opts: STILL }] });
  }
  assert.ok(ps.emitterCount() <= EMITTER_CAP);
});

// ---------------------------------------------------------------------------
// Trails inherit the flight.
// ---------------------------------------------------------------------------

test('comet motes shed at altitude stay at altitude (no falling rails)', () => {
  const ps = new Particles(mulberry32(17));
  ps.burst(0, 0, 1, ['#fda'], {
    speed: 3, life: 10, gravity: 0, z: 1.2, layer: 'world', trail: 200,
  });
  step(ps, 6);
  const all = liveOf(ps);
  assert.ok(all.length > 1, 'the comet shed');
  for (const m of all) {
    assert.ok(Math.abs(m.z - 1.2) < 0.05, `a mote fell off the arc (z ${m.z})`);
  }
});

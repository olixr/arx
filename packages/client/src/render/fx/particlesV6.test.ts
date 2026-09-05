/**
 * THE MATTER LEARNS TO LIVE — engine contract (particles v6, phase 1).
 * The first law is byte-identity: a recipe that names nothing new
 * spawns the same grain the v5 engine spawned.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defineRecipe,
  FIELD_CAP,
  LANDING_MARK,
  LAYER_GROUND,
  MARK_CHAR,
  MAX_SUB_DEPTH,
  PARTICLE_CAP,
  Particles,
  recipeOf,
  type Landing,
  type Particle,
} from '../particles.js';
import { curveOf, rampOf } from './curves.js';

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

const live = (ps: Particles): Particle[] => [...ps.live()];

test('BYTE-IDENTITY: default variance reproduces the v5 dice exactly', () => {
  // Two engines on the same seed: one with no v6 fields, one naming
  // the v5 defaults explicitly. Every roll must agree bit for bit.
  const a = new Particles(mulberry32(42));
  const b = new Particles(mulberry32(42));
  a.burst(1, 2, 25, ['#fa4', '#f84'], { speed: 1.3, life: 0.9, size: 0.1, vz: 1.2, zg: 4 });
  b.burst(1, 2, 25, ['#fa4', '#f84'], { speed: 1.3, life: 0.9, size: 0.1, vz: 1.2, zg: 4, speedVar: 0.6, lifeVar: 0.3, sizeVar: 0.3 });
  const la = live(a);
  const lb = live(b);
  for (let i = 0; i < la.length; i++) {
    assert.equal(la[i]!.vx, lb[i]!.vx);
    assert.equal(la[i]!.maxLife, lb[i]!.maxLife);
    assert.equal(la[i]!.size, lb[i]!.size);
    assert.equal(la[i]!.color, lb[i]!.color);
  }
  for (const p of la) {
    assert.equal(p.sizeCurve, 0);
    assert.equal(p.alphaCurve, 0);
    assert.equal(p.rampId, 0);
    assert.equal(p.wave, 0);
    assert.equal(p.mass, 0);
    assert.equal(p.onDeath, 0);
    assert.equal(p.coreK, 0);
    assert.equal(p.mark, 0);
  }
});

test('VARIANCE IS AUTHORED: zero variance spawns identical grains', () => {
  const ps = new Particles(mulberry32(3));
  ps.burst(0, 0, 12, ['#fff'], { speed: 2, life: 1, size: 0.1, speedVar: 0, lifeVar: 0, sizeVar: 0 });
  for (const p of ps.live()) {
    assert.ok(Math.abs(Math.hypot(p.vx, p.vy) - 2) < 1e-9);
    assert.equal(p.maxLife, 1);
    assert.equal(p.size, 0.1);
  }
});

test('the ramp table outranks the fade switches when both are named', () => {
  const ps = new Particles(mulberry32(4));
  const ramp = rampOf({ stops: ['#111111', '#222222', '#333333'], at: [0, 0.5, 0.9] });
  ps.burst(0, 0, 1, ['#ffffff'], { life: 1, lifeVar: 0, fade: '#999999', fadeAt: 0.2, ramp });
  const p = live(ps)[0]!;
  assert.equal(p.rampId, ramp);
});

test('THE WAVE HAS A SHAPE: sine/tri/noise move only their axis; no wave = no drift', () => {
  for (const wave of ['sine', 'tri', 'noise'] as const) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const ps = new Particles(mulberry32(9));
      ps.burst(5, 5, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, wave, waveHz: 3, waveAmp: 2, waveAxis: axis });
      let moved = { x: false, y: false, z: false };
      for (let i = 0; i < 40; i++) {
        ps.update(0.016);
        const p = live(ps)[0]!;
        if (Math.abs(p.x - 5) > 1e-6) moved.x = true;
        if (Math.abs(p.y - 5) > 1e-6) moved.y = true;
        if (Math.abs(p.z) > 1e-6) moved.z = true;
      }
      assert.equal(moved.x, axis === 'x', `${wave}/${axis} x`);
      assert.equal(moved.y, axis === 'y', `${wave}/${axis} y`);
      assert.equal(moved.z, axis === 'z', `${wave}/${axis} z`);
    }
  }
  const still = new Particles(mulberry32(9));
  still.burst(5, 5, 1, ['#fff'], { speed: 0, life: 10, gravity: 0 });
  for (let i = 0; i < 40; i++) still.update(0.016);
  const p = live(still)[0]!;
  assert.equal(p.x, 5);
  assert.equal(p.y, 5);
});

test('jitter random-walks velocity; without it a still grain stays still', () => {
  const ps = new Particles(mulberry32(5));
  ps.burst(0, 0, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, jitter: 5 });
  for (let i = 0; i < 30; i++) ps.update(0.016);
  const p = live(ps)[0]!;
  assert.ok(Math.abs(p.vx) + Math.abs(p.vy) > 0);
});

test('FORCES ARE FIELDS: lift raises grains WITH mass and leaves massless matter alone', () => {
  const ps = new Particles(mulberry32(6));
  ps.burst(0, 0, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, mass: 1 });
  ps.burst(0, 0, 1, ['#fff'], { speed: 0, life: 10, gravity: 0 });
  ps.field({ kind: 'lift', x: 0, y: 0, radius: 2, strength: 5, dur: 2, attack: 0 });
  for (let i = 0; i < 30; i++) ps.update(0.016);
  const [heavy, light] = live(ps);
  assert.ok(heavy!.z > 0.05, 'the massed grain rose');
  assert.equal(light!.z, 0, 'the massless grain never paid the field');
  assert.equal(light!.vx, 0);
});

test('a settled grain ignores fields — what lies on the ground stays there', () => {
  const ps = new Particles(mulberry32(61));
  ps.burst(0, 0, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, mass: 2, z: 0.2, vz: 0, zg: 10, land: 'settle' });
  for (let i = 0; i < 30; i++) ps.update(0.016);
  const p = live(ps)[0]!;
  assert.equal(p.layer, LAYER_GROUND);
  ps.field({ kind: 'lift', x: 0, y: 0, radius: 2, strength: 9, dur: 2, attack: 0 });
  for (let i = 0; i < 30; i++) ps.update(0.016);
  assert.equal(p.z, 0, 'the settled coal never floated away');
  assert.equal(p.vz, 0);
});

test('attract gathers, repel scatters, vortex turns, wind blows the heading', () => {
  const run = (kind: 'attract' | 'vortex' | 'wind', strength: number, dir = 0) => {
    const ps = new Particles(mulberry32(7));
    ps.burst(1, 0, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, mass: 1 });
    ps.field({ kind, x: 0, y: 0, radius: 3, strength, dur: 2, attack: 0, dir });
    for (let i = 0; i < 20; i++) ps.update(0.016);
    return live(ps)[0]!;
  };
  assert.ok(run('attract', 6).x < 1, 'attract pulled toward the center');
  assert.ok(run('attract', -6).x > 1, 'negative attract repels');
  const v = run('vortex', 6);
  assert.ok(Math.abs(v.y) > 1e-4, 'vortex turned the grain off its radius');
  const w = run('wind', 6, Math.PI / 2);
  assert.ok(w.y > 0.001 && Math.abs(w.x - 1) < 1e-3, 'wind blew along its heading only');
});

test('a field outside its reach does nothing; fields expire and the pool stays bounded', () => {
  const ps = new Particles(mulberry32(8));
  ps.burst(10, 10, 1, ['#fff'], { speed: 0, life: 10, gravity: 0, mass: 1 });
  ps.field({ kind: 'attract', x: 0, y: 0, radius: 1, strength: 9, dur: 0.1 });
  for (let i = 0; i < 20; i++) ps.update(0.016);
  const p = live(ps)[0]!;
  assert.equal(p.x, 10);
  assert.equal(ps.fieldCount(), 0, 'the field died on its clock');
  for (let i = 0; i < FIELD_CAP * 3; i++) ps.field({ kind: 'wind', x: 0, y: 0, radius: 1, strength: 1, dur: 5 });
  assert.ok(ps.fieldCount() <= FIELD_CAP);
  ps.clear();
  assert.equal(ps.fieldCount(), 0);
});

test('SUB-EMITTERS ARE RECIPES: onDeath spawns the recipe where the grain died', () => {
  const child = defineRecipe({ colors: ['#0f0'], opts: { speed: 0, life: 5, gravity: 0 }, count: 3 });
  assert.ok(recipeOf(child));
  const ps = new Particles(mulberry32(10));
  ps.burst(4, 4, 1, ['#f00'], { speed: 0, life: 0.1, lifeVar: 0, gravity: 0, onDeath: child });
  for (let i = 0; i < 12; i++) ps.update(0.016);
  const kids = live(ps);
  assert.equal(kids.length, 3);
  for (const k of kids) {
    assert.equal(k.color, '#0f0');
    assert.equal(k.depth, 1);
    assert.equal(k.x, 4);
  }
});

test('onLand fires once at first ground contact; children inherit velocity when asked', () => {
  const child = defineRecipe({ colors: ['#00f'], opts: { speed: 0, life: 5, gravity: 0 }, count: 2, inherit: 1 });
  const ps = new Particles(mulberry32(11));
  ps.burst(0, 0, 1, ['#f00'], { speed: 1, speedVar: 0, life: 5, gravity: 0, z: 0.3, vz: 0, zg: 10, land: 'settle', onLand: child });
  for (let i = 0; i < 60; i++) ps.update(0.016);
  const all = live(ps);
  const kids = all.filter((p) => p.color === '#00f');
  assert.equal(kids.length, 2, 'exactly one landing, two children');
  const parent = all.find((p) => p.color === '#f00')!;
  assert.equal(parent.layer, LAYER_GROUND);
  assert.ok(Math.abs(Math.hypot(kids[0]!.vx, kids[0]!.vy)) > 0.5, 'the child inherited the parent flight');
});

test('shed spawns on its clock; the chain stops at MAX_SUB_DEPTH', () => {
  // A recipe that sheds itself: without the depth cap this is a bomb.
  const opts = { speed: 0, life: 5, gravity: 0, shed: 0, shedRate: 40 };
  const self = defineRecipe({ colors: ['#fff'], opts, count: 1 });
  opts.shed = self;
  const ps = new Particles(mulberry32(12));
  ps.burst(0, 0, 1, ['#fff'], opts);
  for (let i = 0; i < 90; i++) ps.update(0.016);
  let deepest = 0;
  for (const p of ps.live()) deepest = Math.max(deepest, p.depth);
  assert.equal(deepest, MAX_SUB_DEPTH);
  assert.ok(ps.count() <= PARTICLE_CAP, 'the cap still binds under the chain');
});

test('THE WORLD REMEMBERS: a grain with a mark dying on the dirt queues a LANDING_MARK', () => {
  const ps = new Particles(mulberry32(13));
  ps.burst(2, 3, 1, ['#c9541f'], { speed: 0, life: 0.1, lifeVar: 0, gravity: 0, mark: 'char', markLife: 6 });
  const seen: Landing[] = [];
  for (let i = 0; i < 12; i++) {
    ps.update(0.016);
    ps.drainLandings((l) => seen.push({ ...l }));
  }
  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.kind, LANDING_MARK);
  assert.equal(seen[0]!.mark, MARK_CHAR);
  assert.equal(seen[0]!.life, 6);
  assert.equal(seen[0]!.x, 2);
  assert.equal(seen[0]!.color, '#c9541f');
});

test('an airborne death leaves no mark — marks belong to the dirt', () => {
  const ps = new Particles(mulberry32(14));
  ps.burst(2, 3, 1, ['#fff'], { speed: 0, life: 0.1, lifeVar: 0, gravity: 0, z: 1, mark: 'char' });
  let n = 0;
  for (let i = 0; i < 12; i++) {
    ps.update(0.016);
    ps.drainLandings(() => n++);
  }
  assert.equal(n, 0);
});

test('a land:die grain with a mark leaves it where it struck', () => {
  const ps = new Particles(mulberry32(15));
  ps.burst(0, 0, 1, ['#fff'], { speed: 0, life: 5, gravity: 0, z: 0.5, vz: 0, zg: 20, land: 'die', mark: 'fleck', markLife: 2 });
  const seen: Landing[] = [];
  for (let i = 0; i < 30; i++) {
    ps.update(0.016);
    ps.drainLandings((l) => seen.push({ ...l }));
  }
  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.kind, LANDING_MARK);
  assert.equal(ps.count(), 0);
});

test('THE GOVERNOR SHEDS FINES FIRST: emitter tiers scale q², q, 1', () => {
  const pops = [
    { colors: ['#1'], opts: { life: 10, gravity: 0 }, tier: 'fine' as const },
    { colors: ['#2'], opts: { life: 10, gravity: 0 }, tier: 'body' as const },
    { colors: ['#3'], opts: { life: 10, gravity: 0 }, tier: 'hero' as const },
  ];
  const count = (q: number) => {
    const ps = new Particles(mulberry32(16));
    ps.quality = q;
    ps.emit({ x: 0, y: 0, rate: 300, dur: 2, attack: 0, release: 0, pops });
    for (let i = 0; i < 60; i++) ps.update(0.016);
    const c = { fine: 0, body: 0, hero: 0 };
    for (const p of ps.live()) {
      if (p.color === '#1') c.fine++;
      else if (p.color === '#2') c.body++;
      else c.hero++;
    }
    return c;
  };
  const full = count(1);
  const half = count(0.5);
  assert.ok(Math.abs(full.fine - full.body) <= 2 && Math.abs(full.body - full.hero) <= 2, 'at q=1 every tier speaks equally');
  assert.ok(half.hero >= full.hero - 2, 'heroes never drop');
  assert.ok(half.body < full.body * 0.62 && half.body > full.body * 0.38, 'body scales with q');
  assert.ok(half.fine < full.fine * 0.35, 'fines scale with q²');
});

test('an emitter may carry four populations', () => {
  const ps = new Particles(mulberry32(17));
  const pop = (c: string) => ({ colors: [c], opts: { life: 10, gravity: 0 } });
  ps.emit({ x: 0, y: 0, rate: 400, dur: 1, attack: 0, release: 0, pops: [pop('#1'), pop('#2'), pop('#3'), pop('#4')] });
  for (let i = 0; i < 30; i++) ps.update(0.016);
  const colors = new Set([...ps.live()].map((p) => p.color));
  assert.equal(colors.size, 4);
});

test('new silhouettes and the core carry through spawn', () => {
  const ps = new Particles(mulberry32(18));
  const dw = curveOf('dwindle');
  ps.burst(0, 0, 1, ['#fff'], { shape: 'blob', core: '#ff0', sizeCurve: dw, align: true });
  ps.burst(0, 0, 1, ['#fff'], { shape: 'ring', core: '#ff0', coreK: 0.3 });
  const [blob, ring] = live(ps);
  assert.equal(blob!.shape, 9);
  assert.equal(blob!.coreK, 0.45);
  assert.equal(blob!.core, '#ff0');
  assert.equal(blob!.sizeCurve, dw);
  assert.equal(blob!.align, 1);
  assert.equal(ring!.shape, 10);
  assert.equal(ring!.coreK, 0.3);
});

test('spawnAt: the composer door honors heading, speed, altitude, and the size multiplier', () => {
  const ps = new Particles(mulberry32(19));
  const p = ps.spawnAt(1, 1, ['#fff'], { size: 0.1, sizeVar: 0, speedVar: 0, spread: 0 }, 0, 2, 0.5, 2);
  assert.ok(Math.abs(p.vx - 2) < 1e-9 && Math.abs(p.vy) < 1e-9);
  assert.equal(p.z, 0.5);
  assert.ok(Math.abs(p.size - 0.2) < 1e-9);
});

test('a splat honors its mark kind and life; onDeath speaks on a land:die kill', () => {
  const kid = defineRecipe({ colors: ['#k'], opts: { life: 9, gravity: 0, speed: 0 }, count: 2 });
  const ps = new Particles(mulberry32(71));
  ps.burst(0, 0, 1, ['#s'], { speed: 0, life: 9, gravity: 0, z: 0.2, zg: 20, land: 'splat', mark: 'smear', markLife: 7 });
  ps.burst(5, 5, 1, ['#d'], { speed: 0, life: 9, gravity: 0, z: 0.2, zg: 20, land: 'die', onDeath: kid });
  const seen: Landing[] = [];
  for (let i = 0; i < 30; i++) {
    ps.update(0.016);
    ps.drainLandings((l) => seen.push({ ...l }));
  }
  const splat = seen.find((l) => l.x === 0)!;
  assert.equal(splat.mark, 3);
  assert.equal(splat.life, 7);
  let kids = 0;
  for (const p of ps.live()) if (p.color === '#k') kids++;
  assert.equal(kids, 2);
});

test('a tangent orbit heads along the ring; ringWidth carries through', () => {
  const ps = new Particles(mulberry32(72));
  ps.emit({ kind: 'orbit', x: 0, y: 0, radius: 1, rate: 600, dur: 1, attack: 0, release: 0, tangent: true, orbitSpeed: 5,
    pops: [{ colors: ['#o'], opts: { life: 9, gravity: 0, speed: 1, speedVar: 0, spread: 0, shape: 'ring', ringWidth: 0.2 } }] });
  ps.update(0.05);
  for (const p of ps.live()) {
    // Undo the frame's own step: the birth point is what the tangent is taken at.
    const dot = (p.x - p.vx * 0.05) * p.vx + (p.y - p.vy * 0.05) * p.vy;
    assert.ok(Math.abs(dot) < 1e-6, 'velocity is perpendicular to the radius');
    assert.equal(p.ringW, 0.2);
  }
});

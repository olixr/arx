/**
 * THE COMPOSER + THE LIBRARY — contract (particles v6, phase 3).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMITTER_CAP, PARTICLE_CAP, Particles } from '../particles.js';
import { CAST_CAP, EffectSystem, FxGovernor, recipe, tierK, type EffectDef } from './effects.js';
import { EFFECTS, EFFECT_LIST } from './library/index.js';
import { GroundMarks } from './groundMarks.js';

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

const DT = 1 / 60;

function rig(seed = 1): { ps: Particles; fx: EffectSystem; glows: number[] } {
  const ps = new Particles(mulberry32(seed));
  const glows: number[] = [];
  const fx = new EffectSystem(ps, (_x, _y, _r, _rgb, a) => glows.push(a));
  return { ps, fx, glows };
}

function run(ps: Particles, fx: EffectSystem, seconds: number, marks?: GroundMarks): void {
  const n = Math.ceil(seconds / DT);
  for (let i = 0; i < n; i++) {
    fx.update(DT);
    ps.update(DT);
    if (marks) ps.drainLandings((l) => marks.ingest(l, fx.now()));
    else ps.drainLandings(() => {});
  }
}

const SIMPLE: EffectDef = {
  id: 'test.simple',
  name: 'simple',
  layers: [
    { kind: 'burst', name: 'now', recipe: recipe(['#1'], { life: 5, gravity: 0 }), count: 4 },
    { kind: 'burst', name: 'later', recipe: recipe(['#2'], { life: 5, gravity: 0 }), count: 3, at: 0.5 },
    { kind: 'burst', name: 'beats', recipe: recipe(['#3'], { life: 5, gravity: 0 }), count: 1, at: 0.2, every: 0.1, times: 4 },
    { kind: 'emit', name: 'stand', rate: 60, dur: 1, attack: 0, release: 0, pops: [{ colors: ['#4'], opts: { life: 5, gravity: 0 } }] },
    { kind: 'glow', name: 'light', r: 1, rgb: '1, 2, 3', a: 0.3, dur: 0.5 },
  ],
};

function countColor(ps: Particles, c: string): number {
  let n = 0;
  for (const p of ps.live()) if (p.color === c) n++;
  return n;
}

test('a cast fires its immediate layers now and its delayed layers on the clock', () => {
  const { ps, fx } = rig();
  fx.cast(SIMPLE, 0, 0);
  assert.equal(countColor(ps, '#1'), 4, 'the immediate burst');
  assert.equal(countColor(ps, '#2'), 0);
  run(ps, fx, 0.4);
  assert.equal(countColor(ps, '#2'), 0, 'not yet');
  run(ps, fx, 0.2);
  assert.equal(countColor(ps, '#2'), 3, 'the 0.5s layer landed');
});

test('a repeating layer fires 1 + times beats, then the cast retires', () => {
  const { ps, fx } = rig();
  fx.cast(SIMPLE, 0, 0);
  run(ps, fx, 1.2);
  assert.equal(countColor(ps, '#3'), 5, 'at 0.2 then four more every 0.1');
  assert.equal(fx.pendingCount(), 0);
  run(ps, fx, 0.5);
  assert.equal(fx.castCount(), 0, 'nothing left to say → recycled');
});

test('the sustained emitter and the standing glow live on the cast; stop() silences both', () => {
  const { ps, fx, glows } = rig();
  const h = fx.cast(SIMPLE, 0, 0);
  run(ps, fx, 0.2);
  assert.ok(countColor(ps, '#4') > 5);
  assert.ok(glows.length > 5, 'the glow spoke every frame');
  const before = countColor(ps, '#4');
  const glowsBefore = glows.length;
  h.stop();
  run(ps, fx, 0.5);
  assert.equal(glows.length, glowsBefore, 'no glow after stop');
  assert.ok(countColor(ps, '#4') - before < 6, 'the emitter released instead of running its full second');
  assert.equal(fx.pendingCount(), 0, 'pending beats dropped');
});

test('move() carries following emitters with the handle', () => {
  const { ps, fx } = rig();
  const def: EffectDef = {
    id: 'test.follow', name: 'f',
    layers: [{ kind: 'emit', name: 'e', rate: 120, dur: 2, attack: 0, release: 0, pops: [{ colors: ['#9'], opts: { life: 5, gravity: 0, speed: 0 } }] }],
  };
  const h = fx.cast(def, 0, 0);
  run(ps, fx, 0.1);
  h.move(5, 5);
  run(ps, fx, 0.1);
  let far = 0;
  for (const p of ps.live()) if (p.x === 5) far++;
  assert.ok(far > 3, 'grains born after the move sit at the new anchor');
});

test('params bind: scale multiplies counts linearly and sizes by √; aimed cones use dir', () => {
  const def: EffectDef = {
    id: 'test.scale', name: 's',
    layers: [{ kind: 'burst', name: 'b', recipe: recipe(['#1'], { life: 5, gravity: 0, size: 0.1, sizeVar: 0, speedVar: 0, speed: 1 }), count: 10, arrange: 'cone', spread: 0 }],
  };
  const a = rig(3);
  a.fx.cast(def, 0, 0, { scale: 4, dir: Math.PI / 2 });
  assert.equal(a.ps.count(), 40);
  for (const p of a.ps.live()) {
    assert.ok(Math.abs(p.size - 0.2) < 1e-9, 'size by √4');
    assert.ok(Math.abs(p.vy - 1) < 1e-9 && Math.abs(p.vx) < 1e-9, 'aimed south');
  }
});

test('arrangements: ring/disc/rim/path/orbit place grains where they say', () => {
  const opts = { life: 5, gravity: 0, speed: 0 };
  const mk = (arrange: 'ring' | 'disc' | 'rim' | 'path' | 'orbit'): EffectDef => ({
    id: `test.${arrange}`, name: arrange,
    layers: [{ kind: 'burst', name: 'b', recipe: recipe(['#1'], opts), count: 12, arrange, radius: 1 }],
  });
  for (const arrange of ['ring', 'rim', 'orbit'] as const) {
    const { ps, fx } = rig(5);
    fx.cast(mk(arrange), 0, 0);
    for (const p of ps.live()) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 1) < 1e-6, `${arrange} on the hoop`);
  }
  {
    const { ps, fx } = rig(5);
    fx.cast(mk('disc'), 0, 0);
    for (const p of ps.live()) assert.ok(Math.hypot(p.x, p.y) <= 1 + 1e-9, 'disc inside');
  }
  {
    const { ps, fx } = rig(5);
    fx.cast(mk('path'), 0, 0, { x2: 4, y2: 0 });
    for (const p of ps.live()) assert.ok(p.y === 0 && p.x >= 0 && p.x <= 4, 'path along the segment');
  }
});

test('radiusK binds a layer reach to params.radius', () => {
  const def: EffectDef = {
    id: 'test.rk', name: 'rk',
    layers: [{ kind: 'burst', name: 'b', recipe: recipe(['#1'], { life: 5, gravity: 0, speed: 0 }), count: 6, arrange: 'ring', radius: 0.2, radiusK: 0.5 }],
  };
  const { ps, fx } = rig(6);
  fx.cast(def, 0, 0, { radius: 3 });
  for (const p of ps.live()) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 1.5) < 1e-6);
});

test('the governor is monotone with hysteresis and never drops heroes', () => {
  const g = new FxGovernor();
  for (let i = 0; i < 60; i++) g.observe(30);
  assert.ok(g.quality < 0.5, 'hot frames pull the dial down');
  assert.ok(g.quality >= g.floor);
  const low = g.quality;
  for (let i = 0; i < 20; i++) g.observe(13);
  assert.equal(g.quality, low, 'between the rails nothing moves');
  for (let i = 0; i < 400; i++) g.observe(6);
  assert.equal(g.quality, 1, 'cool frames recover to full');
  assert.equal(tierK('hero', 0.4), 1);
  assert.equal(tierK('body', 0.5), 0.5);
  assert.equal(tierK('fine', 0.5), 0.25);
  assert.equal(tierK(undefined, 1), 1);
});

test('at low quality the composer drops fines, keeps heroes, and a body layer never vanishes', () => {
  const def: EffectDef = {
    id: 'test.tiers', name: 't',
    layers: [
      { kind: 'burst', name: 'f', recipe: recipe(['#f'], { life: 5, gravity: 0 }), count: 20, tier: 'fine' },
      { kind: 'burst', name: 'b', recipe: recipe(['#b'], { life: 5, gravity: 0 }), count: 20, tier: 'body' },
      { kind: 'burst', name: 'h', recipe: recipe(['#h'], { life: 5, gravity: 0 }), count: 5, tier: 'hero' },
    ],
  };
  const { ps, fx } = rig(7);
  ps.quality = 0.35;
  fx.cast(def, 0, 0);
  assert.equal(countColor(ps, '#h'), 5);
  assert.equal(countColor(ps, '#b'), 7);
  assert.equal(countColor(ps, '#f'), 2);
});

test('a storm of casts stays inside every cap', () => {
  const { ps, fx } = rig(8);
  for (let i = 0; i < CAST_CAP * 3; i++) fx.cast(SIMPLE, i, 0);
  assert.ok(fx.castCount() <= CAST_CAP);
  assert.ok(ps.emitterCount() <= EMITTER_CAP);
  run(ps, fx, 2);
  assert.ok(ps.count() <= PARTICLE_CAP);
  fx.clear();
  assert.equal(fx.castCount(), 0);
  assert.equal(fx.pendingCount(), 0);
  assert.equal(fx.glowCount(), 0);
});

// ---------------------------------------------------------------------------
// THE LIBRARY
// ---------------------------------------------------------------------------

test('the registry is keyed by id and every id names its material', () => {
  assert.ok(EFFECT_LIST.length >= 14);
  for (const d of EFFECT_LIST) {
    assert.equal(EFFECTS[d.id], d);
    assert.match(d.id, /^[a-z]+\.[a-z_]+$/, d.id);
  }
});

test('LAYERS ARE THE LAW: every effect carries ≥ 4 layers, a hero, and a story', () => {
  for (const d of EFFECT_LIST) {
    assert.ok(d.layers.length >= 4, `${d.id} has ${d.layers.length} layers`);
    assert.ok(d.story && d.story.length > 20, `${d.id} tells no story`);
    const kinds = new Set(d.layers.map((l) => l.kind));
    assert.ok(kinds.size >= 2, `${d.id} is one kind of layer only`);
    const hero = d.layers.some((l) => l.tier === 'hero' || (l.kind === 'emit' && l.pops.some((p) => p.tier === 'hero')) || l.kind === 'field' || l.kind === 'glow');
    assert.ok(hero, `${d.id} has no hero / field / glow anchor`);
    for (const l of d.layers) assert.ok(l.name.length > 0, `${d.id} has an unnamed layer`);
  }
});

test('every effect casts clean, respects the one-shot budget, and leaks nothing', () => {
  for (const d of EFFECT_LIST) {
    const { ps, fx, glows } = rig(21);
    const marks = new GroundMarks();
    fx.cast(d, 5, 5, { x2: 7, y2: 4, dir: 0.4, radius: 1 });
    assert.ok(ps.count() <= 90, `${d.id} spawns ${ps.count()} grains on frame one`);
    run(ps, fx, 14, marks);
    assert.equal(ps.emitterCount(), 0, `${d.id} leaked an emitter`);
    assert.equal(ps.fieldCount(), 0, `${d.id} leaked a field`);
    assert.equal(fx.castCount(), 0, `${d.id} never retired`);
    assert.equal(fx.pendingCount(), 0, `${d.id} left beats pending`);
    assert.ok(ps.count() < PARTICLE_CAP, `${d.id} pinned the pool`);
    for (const a of glows) assert.ok(a <= 0.42, `${d.id} glow ${a} floodlights`);
  }
});

test('at scale 3 the library still sits under the storm budget', () => {
  for (const d of EFFECT_LIST) {
    const { ps, fx } = rig(22);
    fx.cast(d, 5, 5, { scale: 3, x2: 7, y2: 4 });
    assert.ok(ps.count() <= 270, `${d.id} at scale 3 spawns ${ps.count()}`);
  }
});

test('THE WORLD REMEMBERS: fire, frost, storm, and venom leave marks on the dirt', () => {
  for (const id of ['fire.burst', 'frost.nova', 'storm.strike', 'venom.burst', 'fire.floor']) {
    const { ps, fx } = rig(23);
    const marks = new GroundMarks();
    fx.cast(EFFECTS[id]!, 5, 5);
    let peak = 0;
    for (let i = 0; i < 60 * 5; i++) {
      fx.update(DT);
      ps.update(DT);
      ps.drainLandings((l) => marks.ingest(l, fx.now()));
      marks.prune(fx.now());
      peak = Math.max(peak, marks.count());
    }
    assert.ok(peak >= 3, `${id} left ${peak} marks`);
  }
});

test('fire.burst keeps burning after the blast: matter alive past two seconds', () => {
  const { ps, fx } = rig(24);
  fx.cast(EFFECTS['fire.burst']!, 0, 0);
  run(ps, fx, 2.2);
  assert.ok(ps.count() > 10, `only ${ps.count()} grains at 2.2s — the floor went out`);
  run(ps, fx, 6);
  assert.equal(ps.count(), 0, 'and it ends');
});

test('fire.burst is the exemplar: eleven-plus layers across every kind', () => {
  const d = EFFECTS['fire.burst']!;
  assert.ok(d.layers.length >= 11);
  const kinds = new Set(d.layers.map((l) => l.kind));
  assert.deepEqual([...kinds].sort(), ['burst', 'emit', 'field', 'glow']);
  const tiers = new Set(d.layers.map((l) => l.tier).filter(Boolean));
  assert.deepEqual([...tiers].sort(), ['body', 'fine', 'hero']);
});

// ---------------------------------------------------------------------------
// THE MASTERS' ASKS (engine pass after the ten material passes)
// ---------------------------------------------------------------------------

test('decay shrinks each repeat; along offsets the anchor down the aim', () => {
  const def: EffectDef = {
    id: 'test.decay', name: 'd',
    layers: [
      { kind: 'burst', name: 'pulse', recipe: recipe(['#p'], { life: 9, gravity: 0, speed: 0 }), count: 16, every: 0.1, times: 2, decay: 0.5 },
      { kind: 'burst', name: 'far', recipe: recipe(['#a'], { life: 9, gravity: 0, speed: 0 }), count: 2, along: 2 },
    ],
  };
  const { ps, fx } = rig(31);
  fx.cast(def, 0, 0, { dir: Math.PI / 2 });
  assert.equal(countColor(ps, '#p'), 16);
  run(ps, fx, 0.25);
  assert.equal(countColor(ps, '#p'), 16 + 8 + 4, 'the k-th repeat fires at decay^k');
  for (const p of ps.live()) if (p.color === '#a') assert.ok(Math.abs(p.y - 2) < 1e-9 && Math.abs(p.x) < 1e-9);
});

test("toFar binds a bolt's far anchor to the cast; 'far' spawns at the far anchor", () => {
  const def: EffectDef = {
    id: 'test.far', name: 'f',
    layers: [
      { kind: 'burst', name: 'bolt', recipe: recipe(['#b'], { shape: 'bolt', life: 9 }), count: 1, toFar: true },
      { kind: 'burst', name: 'flash', recipe: recipe(['#f'], { life: 9, gravity: 0, speed: 0 }), count: 3, arrange: 'far' },
    ],
  };
  const { ps, fx } = rig(32);
  fx.cast(def, 0, 0, { x2: 3, y2: 1 });
  for (const p of ps.live()) {
    if (p.color === '#b') assert.ok(p.x2 === 3 && p.y2 === 1);
    else assert.ok(p.x === 3 && p.y === 1);
  }
});

test('a path emitter with sweep grows its span from the near anchor', () => {
  const { ps, fx } = rig(33);
  const def: EffectDef = {
    id: 'test.sweep', name: 's',
    layers: [{ kind: 'emit', name: 'tear', arrange: 'path', toFar: true, sweep: 1, rate: 300, dur: 2, attack: 0, release: 0, pops: [{ colors: ['#t'], opts: { life: 9, gravity: 0, speed: 0 } }] }],
  };
  fx.cast(def, 0, 0, { x2: 4, y2: 0 });
  run(ps, fx, 0.25);
  let far = 0;
  for (const p of ps.live()) if (p.x > 4 * 0.3) far++;
  assert.equal(far, 0, 'a quarter second in, nothing past a quarter of the line');
  run(ps, fx, 1);
  for (const p of ps.live()) if (p.x > 3) far++;
  assert.ok(far > 0, 'later the whole line is reached');
});

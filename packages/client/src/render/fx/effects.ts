/**
 * THE COMPOSER — effects are data (particles v6, phase 3).
 *
 * An `EffectDef` is a list of LAYERS: bursts, sustained emitters,
 * force fields, and glows — each with a delay on the effect's own
 * clock, an optional repeat, and a grain TIER. `EffectSystem.cast()`
 * binds the cast's params (scale, aim, radius, far anchor, altitude)
 * and walks the layers through a pooled timeline; the handle it
 * returns moves or stops the sustained voices. Nothing here allocates
 * per frame: timeline entries, casts, and glow records recycle.
 *
 * THE GOVERNOR SHEDS FINES FIRST: `FxGovernor` turns the frame's cost
 * into a quality dial 0.35..1; fines scale with quality², body grains
 * with quality, heroes never drop. The particle cap stays the last
 * resort, never the first.
 *
 * Definitions stay plain objects so the lab can edit them in place
 * and export them; recipes are registered lazily on first cast.
 */

import {
  defineRecipe,
  type BurstOpts,
  type Emitter,
  type EmitterKind,
  type EmitterPop,
  type Field,
  type FieldOpts,
  type Particles,
  type Recipe,
} from '../particles.js';

export type Tier = 'fine' | 'body' | 'hero';

export interface CastParams {
  /** Size-and-count multiplier (counts linear, sizes by √). */
  scale?: number;
  /** Aim heading, radians (cone layers, aimed bursts). */
  dir?: number;
  /** Reach in tiles (layers with `radiusK` scale to it). */
  radius?: number;
  /** Far anchor for path layers. */
  x2?: number;
  y2?: number;
  /** Altitude offset for the whole cast. */
  z?: number;
}

export type Arrange = 'point' | 'ring' | 'disc' | 'rim' | 'cone' | 'path' | 'orbit' | 'far';

interface LayerBase {
  /** The layer's name in the lab. */
  name: string;
  /** Seconds after the cast this layer fires (default 0). */
  at?: number;
  /** Grain tier for the governor (default 'body'). */
  tier?: Tier;
  /** Fire again every `every` seconds… */
  every?: number;
  /** …this many more times (default 0 = once). */
  times?: number;
  /** Per-repeat multiplier on counts/rates: the k-th repeat fires at decay^k. */
  decay?: number;
  /** Offset the layer's anchor this many tiles along params.dir. */
  along?: number;
}

export interface BurstLayer extends LayerBase {
  kind: 'burst';
  recipe: Recipe;
  /** Grains at scale 1. */
  count: number;
  arrange?: Arrange;
  /** Fixed reach in tiles (ring/disc/rim/orbit). */
  radius?: number;
  /** Reach as a multiple of params.radius (outranks `radius` when set). */
  radiusK?: number;
  /** Altitude offset in tiles. */
  dz?: number;
  /** Heading = params.dir + dirOff (cone/aimed point bursts). */
  aimed?: boolean;
  dirOff?: number;
  /** Cone half-spread in radians (default 0.9). */
  spread?: number;
  /** Rim layers: radial speed override (negative = gather). */
  outward?: number;
  /**
   * Bolt recipes: the far anchor lies `span` tiles from the spawn
   * point on a random heading (ring arcs, crawling afterglow).
   */
  span?: number;
  /** Bolt recipes: the far anchor is the cast's x2/y2 (z2 from the recipe). */
  toFar?: boolean;
}

export interface EmitLayer extends LayerBase {
  kind: 'emit';
  arrange?: EmitterKind;
  radius?: number;
  radiusK?: number;
  dz?: number;
  /** Grains per second at scale 1 (scales linearly). */
  rate: number;
  dur: number;
  attack?: number;
  release?: number;
  outward?: number;
  orbitSpeed?: number;
  aimed?: boolean;
  dirOff?: number;
  spread?: number;
  pops: EmitterPop[];
  /** The emitter rides the handle's position when it moves. */
  follow?: boolean;
  /** 'path' layers reach to params.x2/y2. */
  toFar?: boolean;
  /** Path: seconds to sweep the spawn span near→far. */
  sweep?: number;
  /** Orbit: grains head along the ring's tangent. */
  tangent?: boolean;
}

export interface FieldLayer extends LayerBase {
  kind: 'field';
  field: Omit<FieldOpts, 'x' | 'y'>;
  radiusK?: number;
  /** Heading = params.dir (wind). */
  aimed?: boolean;
  follow?: boolean;
}

export interface GlowLayer extends LayerBase {
  kind: 'glow';
  r: number;
  rgb: string;
  a: number;
  /** Seconds the glow stands (0 = one frame). */
  dur?: number;
  attack?: number;
  release?: number;
  /** Strobe weight 0..1 on its own clock. */
  flicker?: number;
  dz?: number;
  /** Reach as a multiple of params.radius. */
  radiusK?: number;
  follow?: boolean;
}

export type Layer = BurstLayer | EmitLayer | FieldLayer | GlowLayer;

export interface EffectDef {
  id: string;
  name: string;
  /** The story the effect tells, for the lab and the master passes. */
  story?: string;
  layers: Layer[];
}

export interface EffectHandle {
  readonly alive: boolean;
  x: number;
  y: number;
  /** Stop every sustained voice; pending layers are dropped. */
  stop(): void;
  /** Move the cast (following emitters/fields/glows ride along). */
  move(x: number, y: number): void;
}

/** Live casts before the oldest is recycled. */
export const CAST_CAP = 64;
/** Pending timeline entries before the oldest is dropped. */
export const PENDING_CAP = 256;
/** Standing glows before the oldest is recycled. */
export const GLOW_CAP = 48;

interface Cast extends EffectHandle {
  alive: boolean;
  def: EffectDef | null;
  scale: number;
  dir: number;
  radius: number;
  x2: number;
  y2: number;
  z: number;
  emitters: Emitter[];
  fields: Field[];
  /** Position at the last move — following voices re-anchor by delta. */
  ax: number;
  ay: number;
  sys: EffectSystem | null;
}

interface Pending {
  cast: Cast | null;
  layer: number;
  fireAt: number;
  timesLeft: number;
  /** Repeat index of the NEXT firing (0 = the first). */
  rep: number;
}

interface LiveGlow {
  cast: Cast | null;
  layer: GlowLayer | null;
  bornAt: number;
  dx: number;
  dy: number;
  phase: number;
}

const recipeIds = new WeakMap<Recipe, number>();

/** Register a definition's recipe once; ids stay stable per object. */
function recipeIdOf(r: Recipe): number {
  let id = recipeIds.get(r);
  if (id === undefined) {
    id = defineRecipe(r);
    recipeIds.set(r, id);
  }
  return id;
}

/** The governor's per-tier multiplier at quality q. */
export function tierK(tier: Tier | undefined, q: number): number {
  if (q >= 1) return 1;
  if (tier === 'hero') return 1;
  if (tier === 'fine') return q * q;
  return q;
}

/**
 * Frame cost → quality dial. An EMA over the frame's own cost (not
 * the rAF period, which is capped at the display rate) with
 * hysteresis: quality steps down fast past `hotMs`, recovers slowly
 * under `coolMs`. Deterministic and allocation-free.
 */
export class FxGovernor {
  ema = 8;
  quality = 1;
  constructor(readonly hotMs = 15, readonly coolMs = 11, readonly floor = 0.35) {}

  observe(frameMs: number): number {
    const ms = Math.max(0, Math.min(100, frameMs));
    this.ema += (ms - this.ema) * 0.12;
    if (this.ema > this.hotMs) this.quality = Math.max(this.floor, this.quality - 0.03);
    else if (this.ema < this.coolMs) this.quality = Math.min(1, this.quality + 0.006);
    return this.quality;
  }
}

export class EffectSystem {
  private readonly casts: Cast[] = [];
  private readonly castFree: Cast[] = [];
  private readonly pending: Pending[] = [];
  private readonly pendingFree: Pending[] = [];
  private readonly glows: LiveGlow[] = [];
  private readonly glowFree: LiveGlow[] = [];
  private time = 0;
  readonly governor = new FxGovernor();

  constructor(
    readonly particles: Particles,
    private readonly glow: ((x: number, y: number, r: number, rgb: string, a: number) => void) | null = null,
  ) {}

  /** Feed the frame's cost; the dial lands on the particle engine. */
  govern(frameMs: number): number {
    const q = this.governor.observe(frameMs);
    this.particles.quality = q;
    return q;
  }

  /** The clock, seconds (tests). */
  now(): number {
    return this.time;
  }

  castCount(): number {
    return this.casts.length;
  }

  pendingCount(): number {
    return this.pending.length;
  }

  glowCount(): number {
    return this.glows.length;
  }

  cast(def: EffectDef, x: number, y: number, p: CastParams = {}): EffectHandle {
    const c = this.takeCast();
    c.alive = true;
    c.def = def;
    c.x = x;
    c.y = y;
    c.ax = x;
    c.ay = y;
    c.scale = p.scale ?? 1;
    c.dir = p.dir ?? 0;
    c.radius = p.radius ?? 1;
    c.x2 = p.x2 ?? x;
    c.y2 = p.y2 ?? y;
    c.z = p.z ?? 0;
    c.emitters.length = 0;
    c.fields.length = 0;
    const layers = def.layers;
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i]!;
      const at = L.at ?? 0;
      const times = L.times ?? 0;
      if (at <= 0) {
        this.fire(c, L, 0);
        if (times > 0 && L.every !== undefined && L.every > 0) this.schedule(c, i, this.time + L.every, times, 1);
      } else {
        this.schedule(c, i, this.time + at, times, 0);
      }
    }
    return c;
  }

  /** Advance the timeline; call once per frame BEFORE particles.update. */
  update(dt: number): void {
    this.time += dt;
    const now = this.time;
    const list = this.pending;
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i]!;
      const c = q.cast;
      if (!c || !c.alive || !c.def) {
        this.dropPending(i);
        continue;
      }
      if (now < q.fireAt) continue;
      const L = c.def.layers[q.layer]!;
      this.fire(c, L, q.rep);
      if (q.timesLeft > 0 && L.every !== undefined && L.every > 0) {
        q.timesLeft--;
        q.rep++;
        q.fireAt += L.every;
      } else {
        this.dropPending(i);
      }
    }
    // Standing glows breathe on their own envelope.
    const gl = this.glows;
    for (let i = gl.length - 1; i >= 0; i--) {
      const g = gl[i]!;
      const c = g.cast;
      const L = g.layer;
      if (!c || !L || !c.alive) {
        this.dropGlow(i);
        continue;
      }
      const dur = L.dur ?? 0;
      const age = now - g.bornAt;
      if (age > dur) {
        this.dropGlow(i);
        continue;
      }
      let env = 1;
      const attack = L.attack ?? 0.05;
      const release = L.release ?? 0.3;
      if (attack > 0 && age < attack) env = age / attack;
      const tail = dur - age;
      if (release > 0 && tail < release) env = Math.min(env, tail / release);
      if (L.flicker !== undefined && L.flicker > 0) {
        env *= 1 - L.flicker * (0.5 + 0.5 * Math.sin(now * 23 + g.phase)) * 0.5;
      }
      const k = Math.sqrt(c.scale);
      this.glow?.(c.x + g.dx, c.y + g.dy - (L.dz ?? 0) - c.z, L.r * k * (L.radiusK !== undefined ? c.radius : 1), L.rgb, L.a * env);
    }
    // Casts with nothing left to say return to the pool.
    const cs = this.casts;
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i]!;
      if (!c.alive) {
        this.recycleCast(i);
        continue;
      }
      if (this.castBusy(c)) continue;
      c.alive = false;
      this.recycleCast(i);
    }
  }

  /** Every cast stops; the timeline empties (plane crossings). */
  clear(): void {
    for (const c of this.casts) {
      c.alive = false;
      c.def = null;
      c.emitters.length = 0;
      c.fields.length = 0;
      this.castFree.push(c);
    }
    this.casts.length = 0;
    for (const q of this.pending) {
      q.cast = null;
      this.pendingFree.push(q);
    }
    this.pending.length = 0;
    for (const g of this.glows) {
      g.cast = null;
      g.layer = null;
      this.glowFree.push(g);
    }
    this.glows.length = 0;
  }

  // -- internals ------------------------------------------------------------

  private castBusy(c: Cast): boolean {
    for (let i = 0; i < this.pending.length; i++) if (this.pending[i]!.cast === c) return true;
    for (let i = 0; i < this.glows.length; i++) if (this.glows[i]!.cast === c) return true;
    for (let i = 0; i < c.emitters.length; i++) if (c.emitters[i]!.alive) return true;
    for (let i = 0; i < c.fields.length; i++) if (c.fields[i]!.alive) return true;
    return false;
  }

  private takeCast(): Cast {
    if (this.casts.length >= CAST_CAP) {
      // The cap recycles the oldest voice, stopped cleanly.
      const old = this.casts[0]!;
      old.stop();
      old.alive = false;
      this.recycleCast(0);
    }
    let c = this.castFree.pop();
    if (!c) {
      const sys = this;
      c = {
        alive: false, def: null, x: 0, y: 0, scale: 1, dir: 0, radius: 1,
        x2: 0, y2: 0, z: 0, emitters: [], fields: [], ax: 0, ay: 0, sys,
        stop() {
          for (const e of this.emitters) if (e.alive) e.stop();
          for (const f of this.fields) if (f.alive) f.stop();
          this.emitters.length = 0;
          this.fields.length = 0;
          this.sys?.dropCastPending(this);
        },
        move(x: number, y: number) {
          const dx = x - this.ax;
          const dy = y - this.ay;
          this.ax = x;
          this.ay = y;
          this.x = x;
          this.y = y;
          for (const e of this.emitters) {
            if (!e.alive) continue;
            e.x += dx;
            e.y += dy;
            e.x2 += dx;
            e.y2 += dy;
          }
          for (const f of this.fields) {
            if (!f.alive) continue;
            f.x += dx;
            f.y += dy;
          }
        },
      };
    }
    this.casts.push(c);
    return c;
  }

  private recycleCast(i: number): void {
    const list = this.casts;
    const c = list[i]!;
    const last = list.pop()!;
    if (c !== last) list[i] = last;
    c.def = null;
    c.emitters.length = 0;
    c.fields.length = 0;
    this.castFree.push(c);
  }

  private dropCastPending(c: Cast): void {
    const list = this.pending;
    for (let i = list.length - 1; i >= 0; i--) if (list[i]!.cast === c) this.dropPending(i);
    const gl = this.glows;
    for (let i = gl.length - 1; i >= 0; i--) if (gl[i]!.cast === c) this.dropGlow(i);
  }

  private schedule(c: Cast, layer: number, fireAt: number, timesLeft: number, rep: number): void {
    let q: Pending;
    if (this.pending.length >= PENDING_CAP) {
      // A flood past the cap drops the FARTHEST-off beat: the story's
      // next moments matter more than its coda.
      let far = 0;
      for (let i = 1; i < this.pending.length; i++) if (this.pending[i]!.fireAt > this.pending[far]!.fireAt) far = i;
      q = this.pending[far]!;
    } else {
      q = this.pendingFree.pop() ?? { cast: null, layer: 0, fireAt: 0, timesLeft: 0, rep: 0 };
      this.pending.push(q);
    }
    q.cast = c;
    q.layer = layer;
    q.fireAt = fireAt;
    q.timesLeft = timesLeft;
    q.rep = rep;
  }

  private dropPending(i: number): void {
    const list = this.pending;
    const q = list[i]!;
    const last = list.pop()!;
    if (q !== last) list[i] = last;
    q.cast = null;
    this.pendingFree.push(q);
  }

  private dropGlow(i: number): void {
    const list = this.glows;
    const g = list[i]!;
    const last = list.pop()!;
    if (g !== last) list[i] = last;
    g.cast = null;
    g.layer = null;
    this.glowFree.push(g);
  }

  private reachOf(c: Cast, radius: number | undefined, radiusK: number | undefined): number {
    if (radiusK !== undefined) return c.radius * radiusK;
    return radius ?? 0.5;
  }

  private fire(c: Cast, L: Layer, rep: number): void {
    // The repeat's decay and the along-aim offset bind here, once.
    const k = L.decay !== undefined && rep > 0 ? Math.pow(L.decay, rep) : 1;
    const along = L.along ?? 0;
    const ox = c.x + (along !== 0 ? Math.cos(c.dir) * along : 0);
    const oy = c.y + (along !== 0 ? Math.sin(c.dir) * along : 0);
    switch (L.kind) {
      case 'burst':
        this.fireBurst(c, L, ox, oy, k);
        break;
      case 'emit':
        this.fireEmit(c, L, ox, oy, k);
        break;
      case 'field':
        this.fireField(c, L, ox, oy);
        break;
      case 'glow':
        this.fireGlow(c, L, ox, oy, k);
        break;
    }
  }

  private fireBurst(c: Cast, L: BurstLayer, cx: number, cy: number, k: number): void {
    const ps = this.particles;
    const q = ps.quality;
    const tk = tierK(L.tier, q);
    let n = Math.round(L.count * c.scale * tk * k);
    if (n < 1 && L.tier !== 'fine') n = 1;
    if (n <= 0) return;
    recipeIdOf(L.recipe);
    const r = L.recipe;
    const sizeK = Math.sqrt(c.scale);
    const z = c.z + (L.dz ?? 0);
    const reach = this.reachOf(c, L.radius, L.radiusK);
    const dir = L.aimed ? c.dir + (L.dirOff ?? 0) : undefined;
    const spread = L.spread ?? r.opts.spread ?? 0.9;
    const span = L.span ?? 0;
    const arc = (px: number, py: number, heading?: number): void => {
      const p = ps.spawnAt(px, py, r.colors, r.opts, heading, undefined, z, sizeK);
      if (L.toFar) {
        p.x2 = c.x2;
        p.y2 = c.y2;
      } else if (span > 0) {
        const a = ps.rand01() * Math.PI * 2;
        p.x2 = px + Math.cos(a) * span;
        p.y2 = py + Math.sin(a) * span * 0.6;
      }
    };
    if (span > 0 || L.toFar) {
      // Arcs: one spawn per grain through the far-anchor door.
      const reachA = reach;
      for (let i = 0; i < n; i++) {
        let px = cx;
        let py = cy;
        const arrange = L.arrange ?? 'point';
        if (arrange === 'far') {
          px = c.x2;
          py = c.y2;
        } else if (arrange === 'ring' || arrange === 'rim' || arrange === 'orbit') {
          const a = ((i + ps.rand01() * 0.6) / n) * Math.PI * 2;
          px += Math.cos(a) * reachA;
          py += Math.sin(a) * reachA;
        } else if (arrange === 'disc') {
          const a = ps.rand01() * Math.PI * 2;
          const d = reachA * Math.sqrt(ps.rand01());
          px += Math.cos(a) * d;
          py += Math.sin(a) * d;
        }
        arc(px, py, dir);
      }
      return;
    }
    switch (L.arrange ?? 'point') {
      case 'ring':
        for (let i = 0; i < n; i++) {
          const a = ((i + ps.rand01() * 0.6) / n) * Math.PI * 2;
          ps.spawnAt(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, r.colors, r.opts, dir, undefined, z, sizeK);
        }
        break;
      case 'rim':
        for (let i = 0; i < n; i++) {
          const a = ((i + ps.rand01() * 0.6) / n) * Math.PI * 2;
          ps.spawnAt(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, r.colors, r.opts, a, L.outward, z, sizeK);
        }
        break;
      case 'disc':
        for (let i = 0; i < n; i++) {
          const a = ps.rand01() * Math.PI * 2;
          const d = reach * Math.sqrt(ps.rand01());
          ps.spawnAt(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r.colors, r.opts, dir, undefined, z, sizeK);
        }
        break;
      case 'cone': {
        // The layer's spread outranks the recipe's; the engine rolls it.
        const heading = c.dir + (L.dirOff ?? 0);
        for (let i = 0; i < n; i++) {
          ps.spawnAt(cx, cy, r.colors, r.opts, heading, undefined, z, sizeK, spread);
        }
        break;
      }
      case 'path':
        for (let i = 0; i < n; i++) {
          const t = (i + ps.rand01()) / n;
          ps.spawnAt(cx + (c.x2 - cx) * t, cy + (c.y2 - cy) * t, r.colors, r.opts, dir, undefined, z, sizeK);
        }
        break;
      case 'orbit': {
        const a0 = ps.rand01() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i / n) * Math.PI * 2;
          ps.spawnAt(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, r.colors, r.opts, a + Math.PI / 2, undefined, z, sizeK);
        }
        break;
      }
      case 'far':
        for (let i = 0; i < n; i++) ps.spawnAt(c.x2, c.y2, r.colors, r.opts, dir, undefined, z, sizeK);
        break;
      default:
        for (let i = 0; i < n; i++) ps.spawnAt(cx, cy, r.colors, r.opts, dir, undefined, z, sizeK);
    }
  }

  private fireEmit(c: Cast, L: EmitLayer, cx: number, cy: number, k: number): void {
    const reach = this.reachOf(c, L.radius, L.radiusK);
    const e = this.particles.emit({
      kind: L.arrange ?? 'point',
      x: cx,
      y: cy,
      z: c.z + (L.dz ?? 0),
      x2: L.toFar ? c.x2 : cx + (L.arrange === 'path' ? reach : 0),
      y2: L.toFar ? c.y2 : cy,
      sweep: L.sweep,
      tangent: L.tangent,
      radius: reach,
      dir: L.aimed ? c.dir + (L.dirOff ?? 0) : undefined,
      spread: L.spread,
      rate: L.rate * c.scale * k * tierK(L.tier, this.particles.quality),
      dur: L.dur,
      attack: L.attack,
      release: L.release,
      outward: L.outward,
      orbitSpeed: L.orbitSpeed,
      pops: L.pops,
    });
    if (c.emitters.length < 8) c.emitters.push(e);
  }

  private fireField(c: Cast, L: FieldLayer, cx: number, cy: number): void {
    const f = this.particles.field({
      ...L.field,
      x: cx,
      y: cy,
      radius: L.radiusK !== undefined ? c.radius * L.radiusK : L.field.radius,
      dir: L.aimed ? c.dir : L.field.dir,
    });
    if (c.fields.length < 4) c.fields.push(f);
  }

  private fireGlow(c: Cast, L: GlowLayer, cx: number, cy: number, dk: number): void {
    const k = Math.sqrt(c.scale);
    const r = L.r * k * (L.radiusK !== undefined ? c.radius : 1);
    if ((L.dur ?? 0) <= 0) {
      this.glow?.(cx, cy - (L.dz ?? 0) - c.z, r, L.rgb, L.a * dk);
      return;
    }
    let g: LiveGlow;
    if (this.glows.length >= GLOW_CAP) {
      g = this.glows[0]!;
    } else {
      g = this.glowFree.pop() ?? { cast: null, layer: null, bornAt: 0, dx: 0, dy: 0, phase: 0 };
      this.glows.push(g);
    }
    g.cast = c;
    g.layer = L;
    g.bornAt = this.time;
    g.dx = cx - c.x;
    g.dy = cy - c.y;
    g.phase = this.particles.rand01() * Math.PI * 2;
  }
}

/** A frozen recipe helper for library files: `{colors, opts}` + count. */
export function recipe(colors: string[], opts: BurstOpts, extra: Partial<Recipe> = {}): Recipe {
  return { colors, opts, ...extra };
}

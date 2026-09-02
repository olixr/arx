/**
 * Pooled particle engine — the combat-FX workhorse.
 *
 * Everything stays on brand: hard-edged quads, no blur, no gradients.
 * Nine silhouettes cover the whole vocabulary:
 *  - square: the classic chunk (debris, dust, coals)
 *  - streak: a velocity-stretched sliver (sparks, rain, speed lines)
 *  - shard:  a spinning slab (ice, bone, leaves — tumbling matter)
 *  - lick:   a tapered flame tongue riding its velocity, width
 *            breathing on its own phase — fire that BURNS
 *  - puff:   a three-lobe billow cluster — smoke and mist with
 *            volume, still hard-edged
 *  - glint:  a crossed-sliver twinkle that scale-pulses — frost
 *            sparkle, starlight, arcane motes
 *  - mote:   the puff idiom with round lobes — vapour has no corners
 *  - drop:   a faceted teardrop riding its velocity, fattening as it
 *            slows — venom beads, blood gobbets, rain (THE LIQUID LAW)
 *  - bolt:   a seeded jagged arc between two anchors that re-strikes
 *            on its own beat, never per frame (THE ARC LAW)
 *
 * THE LIVING MATTER LAW: matter tells its whole life. The ramp
 * (`fade`/`fade2`/`fade3`) hard-switches through up to three cooling
 * colors — ember → dark red → soot, never a soft blend; `trail` sheds
 * micro-motes along the flight arc; `wobble` staggers rising smoke
 * off its rails. All pool-friendly fields — no closures, no
 * allocation.
 *
 * HEIGHT IS REAL (v5): `z` is altitude in tiles, rendered at FULL
 * scale (heights are never yScale-squashed — the ragdoll precedent).
 * `(x, y)` stays the ground anchor: it drives the y-sort, the contact
 * shadow, and the landing. `zg` pulls matter back to the dirt, where
 * `land` says what happens: die, settle into ground dust, bounce, or
 * splat into spatter + a lingering fleck. Landings are also queued as
 * plain records for the renderer/matter layer to voice (stains, sfx).
 *
 * THE WORLD LAYER (v5): a particle lives on one of three layers —
 * 'overlay' (over the scene, the classic pass), 'world' (y-sorted
 * with the entities so a ring's north arc passes BEHIND the body),
 * or 'ground' (y-sorted floor dust, the old `ground` flag). Airborne
 * world matter paints its own contact shadow, debris-style.
 *
 * EMITTERS ARE THE GRAMMAR (v5): pooled emitter records (never
 * closures) spawn sustained matter — point / ring / rim / path /
 * cone / orbit arrangements × an attack/sustain/release envelope ×
 * up to three grain populations (THE FINE GRAIN LAW: fines carry the
 * texture, body grains the mass, sparse heroes the story).
 *
 * Perf discipline: live particles are swap-removed and dead objects
 * recycled through a free list — zero allocation once the pool warms.
 * At the cap, new spawns overwrite a rotating slot instead of
 * pushing; a detonation storm can never grow the heap or the draw
 * bill. The overlay pass draws in (shape, color) buckets so a storm
 * of one material costs one fillStyle set, not thousands.
 */

export const PARTICLE_CAP = 2600;
export const EMITTER_CAP = 48;
/** Landing records queued per frame before the oldest is recycled. */
export const LANDING_CAP = 48;

export interface Particle {
  x: number; // world coords — the GROUND anchor (sort, shadow, landing)
  y: number;
  vx: number;
  vy: number;
  /** Altitude in tiles, drawn at FULL scale (never squashed). */
  z: number;
  /** Vertical velocity, tiles/sec (+ = rising). */
  vz: number;
  /** Z-gravity, tiles/s² pulling altitude back to the dirt. 0 = planar. */
  zg: number;
  /** What happens at z = 0 (falling): LAND_* code. */
  land: number;
  /** Restitution for LAND_BOUNCE, 0..1. */
  bounce: number;
  /** First ground contact already happened (bounce thud fires once). */
  landed: number;
  life: number;
  maxLife: number;
  size: number; // in tiles
  color: string;
  /** Bucket id of `color` — overlay draw sorts on it. */
  colorId: number;
  gravity: number;
  /** Per-second velocity damping — lets dust billow out and settle. */
  drag: number;
  /** 0 = shrink over life (default); >0 = grow by this many tiles/sec. */
  grow: number;
  /** SHAPE_ID value. */
  shape: number;
  /** Shard spin rate, rad/s (shards only). */
  spin: number;
  /** Shard orientation, advanced by spin. */
  rot: number;
  /** Strobe weight 0..1 — embers and arcs shimmer, dust doesn't. */
  flicker: number;
  /** Deterministic phase so flicker never syncs across a burst. */
  phase: number;
  /** Cooling ramp — hard band-switches, never blends ('' = never). */
  fade: string;
  fadeAt: number;
  fade2: string;
  fade2At: number;
  fade3: string;
  fade3At: number;
  /** Micro-motes shed per second along the flight arc (0 = none). */
  trail: number;
  /** The shed motes' color ('' = the parent's own). */
  trailColor: string;
  /** Lateral sinusoidal drift amplitude, tiles/sec (rising smoke). */
  wobble: number;
  /** LAYER_* code: 0 overlay, 1 world (y-sorted), 2 ground. */
  layer: number;
  /** Contact-shadow weight 0..1 for airborne world matter. */
  shadow: number;
  /** Far anchor — bolt arcs strike from (x,y,z) to (x2,y2,z2). */
  x2: number;
  y2: number;
  z2: number;
  /** Bolt re-strikes per second (geometry re-seeds on the beat). */
  boltRate: number;
  /** Branch weight 0..1 — stubs forking off the main arc. */
  boltBranch: number;
}

export const LAND_NONE = 0;
export const LAND_DIE = 1;
export const LAND_SETTLE = 2;
export const LAND_BOUNCE = 3;
export const LAND_SPLAT = 4;

export const LAYER_OVERLAY = 0;
export const LAYER_WORLD = 1;
export const LAYER_GROUND = 2;

/** Hoisted numeric comparator — a per-frame closure de-opts the sort. */
const NUM_ASC = (a: number, b: number): number => a - b;

export type ParticleLayer = 'overlay' | 'world' | 'ground';
export type LandKind = 'none' | 'die' | 'settle' | 'bounce' | 'splat';

const LAND_ID: Record<LandKind, number> = {
  none: LAND_NONE,
  die: LAND_DIE,
  settle: LAND_SETTLE,
  bounce: LAND_BOUNCE,
  splat: LAND_SPLAT,
};

const LAYER_ID: Record<ParticleLayer, number> = {
  overlay: LAYER_OVERLAY,
  world: LAYER_WORLD,
  ground: LAYER_GROUND,
};

export interface BurstOpts {
  speed?: number;
  life?: number;
  size?: number;
  gravity?: number;
  up?: boolean;
  /** Emit in a cone around this angle (radians) instead of a circle. */
  dir?: number;
  spread?: number;
  /** Per-second velocity damping (dust rolls out and stops). */
  drag?: number;
  /** Tiles/sec the block grows instead of shrinking (billowing dust). */
  grow?: number;
  /** Back-compat: `ground: true` = the 'ground' layer. */
  ground?: boolean;
  /** Which pass draws this matter (default 'overlay'). */
  layer?: ParticleLayer;
  /** Silhouette. */
  shape?: 'square' | 'streak' | 'shard' | 'lick' | 'puff' | 'glint' | 'mote' | 'drop' | 'bolt';
  /** Shard tumble rate, rad/s. */
  spin?: number;
  /** Strobe weight 0..1 — embers/arcs shimmer as they live. */
  flicker?: number;
  /** Cooling ramp stop 1 — hard switch at `fadeAt` (default 55%). */
  fade?: string;
  fadeAt?: number;
  /** Cooling ramp stop 2 — hard switch at `fade2At` (default 78%). */
  fade2?: string;
  fade2At?: number;
  /** Cooling ramp stop 3 — hard switch at `fade3At` (default 92%). */
  fade3?: string;
  fade3At?: number;
  /** Micro-motes shed per second along the arc (comet tails). */
  trail?: number;
  /** Shed-mote color (defaults to the parent's own color). */
  trailColor?: string;
  /** Lateral sinusoidal stagger, tiles/sec — rising smoke, wisps. */
  wobble?: number;
  /** Spawn altitude in tiles (full scale). */
  z?: number;
  /** Initial vertical velocity, tiles/sec (+ = up). Jittered like speed. */
  vz?: number;
  /** Z-gravity, tiles/s². >0 = thrown matter comes back down. */
  zg?: number;
  /** Ground-contact behavior once falling reaches z=0. */
  land?: LandKind;
  /** Restitution for land:'bounce' (default 0.45). */
  bounce?: number;
  /** Contact-shadow weight for airborne world matter (default on). */
  shadow?: number;
  /** Bolt far anchor (world coords + altitude). */
  x2?: number;
  y2?: number;
  z2?: number;
  /** Bolt re-strike beats per second (default 9). */
  boltRate?: number;
  /** Bolt branch weight 0..1 (default 0.5). */
  boltBranch?: number;
}

const SHAPE_ID = {
  square: 0,
  streak: 1,
  shard: 2,
  lick: 3,
  puff: 4,
  glint: 5,
  mote: 6,
  drop: 7,
  bolt: 8,
} as const;

/** The world's ink — contact shadows wear it at low alpha. */
const SHADOW_INK = '#241a2e';

/**
 * The cooling ramp, resolved for life fraction t. Hard band-switches
 * only — matter cools in steps, it never airbrushes.
 */
export function rampColor(p: Particle, t: number): string {
  if (p.fade3 !== '' && t > p.fade3At) return p.fade3;
  if (p.fade2 !== '' && t > p.fade2At) return p.fade2;
  if (p.fade !== '' && t > p.fadeAt) return p.fade;
  return p.color;
}

/** Deterministic 0..1 hash — bolt geometry re-seeds on strike beats. */
function h01(seed: number, k: number): number {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(k | 0, 0x85ebca77)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) >>> 0;
  a = Math.imul(a ^ (a >>> 12), 0x297a2d39) >>> 0;
  return ((a ^ (a >>> 15)) >>> 0) / 4294967296;
}

/** A ground contact worth voicing (stain decals, thud sfx). */
export interface Landing {
  x: number;
  y: number;
  color: string;
  size: number;
  /** 'splat' | 'bounce' — settle/die land silently. */
  kind: number;
}

export const LANDING_SPLAT = 0;
export const LANDING_BOUNCE = 1;

// ---------------------------------------------------------------------------
// Emitters — sustained matter without per-signature spawn math.
// ---------------------------------------------------------------------------

export type EmitterKind = 'point' | 'ring' | 'rim' | 'path' | 'cone' | 'orbit' | 'disc';

/**
 * One grain population. THE FINE GRAIN LAW: real matter is mostly
 * fines with a few heroes — an emitter carries up to three of these,
 * each a shared frozen template (records, never closures).
 */
export interface EmitterPop {
  colors: string[];
  opts: BurstOpts;
  /** Relative share of the emitter's rate (default 1). */
  weight?: number;
}

export interface EmitterOpts {
  kind?: EmitterKind;
  x: number;
  y: number;
  z?: number;
  /** Far anchor for 'path'. */
  x2?: number;
  y2?: number;
  /** Ring/rim/orbit radius in tiles. */
  radius?: number;
  /** Cone heading override (falls back to each pop's own dir). */
  dir?: number;
  spread?: number;
  /** Particles/sec across all populations at full envelope. */
  rate: number;
  /** Emitter lifetime, seconds (clamped to 12 — nothing leaks forever). */
  dur: number;
  /** Envelope ramp-in, seconds (default 0.06). */
  attack?: number;
  /** Envelope ramp-out tail before dur ends (default 0.2). */
  release?: number;
  /** Orbit head speed, rad/s (default 5). */
  orbitSpeed?: number;
  /**
   * Rim radial speed, tiles/sec (defaults to each pop's own speed).
   * NEGATIVE converges — matter gathers INTO the heart (charge-up).
   */
  outward?: number;
  pops: EmitterPop[];
}

const EMITTER_KIND_ID: Record<EmitterKind, number> = {
  point: 0,
  ring: 1,
  rim: 2,
  path: 3,
  cone: 4,
  orbit: 5,
  disc: 6,
};

/** Live emitter record — mutate x/y to follow a body, stop() to end. */
export interface Emitter {
  alive: boolean;
  kind: number;
  x: number;
  y: number;
  z: number;
  x2: number;
  y2: number;
  radius: number;
  dir: number;
  spread: number;
  rate: number;
  age: number;
  dur: number;
  attack: number;
  release: number;
  orbitSpeed: number;
  orbitA: number;
  outward: number;
  hasDir: boolean;
  hasOutward: boolean;
  /** Shared frozen population templates (reference, not copy). */
  pops: EmitterPop[] | null;
  /** Per-population fractional emission carry (max 3 pops). */
  acc0: number;
  acc1: number;
  acc2: number;
  stop(): void;
}

const MAX_EMITTER_DUR = 12;

export class Particles {
  private readonly pool: Particle[] = [];
  private readonly free: Particle[] = [];
  private capCursor = 0;

  private readonly emitters: Emitter[] = [];
  private readonly emitterFree: Emitter[] = [];

  private readonly landings: Landing[] = [];
  private landingCount = 0;

  /** color string → bucket id; palettes are small, this stays small. */
  private readonly colorIds = new Map<string, number>();

  /** Reused overlay draw order — (shape, color)-bucketed indices. */
  private readonly drawOrder: number[] = [];
  private batching = false;
  private lastFill = '';

  constructor(private readonly rand: () => number = Math.random) {}

  private colorIdOf(color: string): number {
    let id = this.colorIds.get(color);
    if (id === undefined) {
      // Clamp the bucket space: an overflow only degrades sort
      // grouping, never correctness (fillStyle is still per-run).
      id = Math.min(this.colorIds.size, 1023);
      this.colorIds.set(color, id);
    }
    return id;
  }

  private take(): Particle {
    if (this.pool.length >= PARTICLE_CAP) {
      // At the cap: recycle a rotating live slot — a storm stays a
      // storm, it just churns its oldest members.
      this.capCursor = (this.capCursor + 1) % this.pool.length;
      return this.pool[this.capCursor]!;
    }
    const p = this.free.pop();
    if (p) {
      this.pool.push(p);
      return p;
    }
    const fresh: Particle = {
      x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, zg: 0,
      land: LAND_NONE, bounce: 0.45, landed: 0,
      life: 0, maxLife: 1, size: 0.08,
      color: '#fff', colorId: 0, gravity: 6, drag: 0, grow: 0, shape: 0,
      spin: 0, rot: 0, flicker: 0, phase: 0,
      fade: '', fadeAt: 0.55, fade2: '', fade2At: 0.78, fade3: '', fade3At: 0.92,
      trail: 0, trailColor: '', wobble: 0,
      layer: LAYER_OVERLAY, shadow: 0,
      x2: 0, y2: 0, z2: 0, boltRate: 9, boltBranch: 0.5,
    };
    this.pool.push(fresh);
    return fresh;
  }

  burst(x: number, y: number, count: number, colors: string[], opts: BurstOpts = {}): void {
    for (let i = 0; i < count; i++) {
      this.spawnOne(x, y, colors, opts);
    }
  }

  /**
   * The one spawn door. Emitter arrangements steer heading/speed per
   * spawn point through the overrides — shared templates stay frozen.
   */
  private spawnOne(
    x: number,
    y: number,
    colors: string[],
    opts: BurstOpts,
    dirOverride?: number,
    speedOverride?: number,
    zBase = 0,
  ): void {
    const rand = this.rand;
    // Bolts anchor, they don't fly: an unspecified speed means still.
    const shape = SHAPE_ID[opts.shape ?? 'square'];
    const speed = speedOverride ?? opts.speed ?? (shape === SHAPE_ID.bolt ? 0 : 2.5);
    const dir = dirOverride ?? opts.dir;
    const angle =
      dir !== undefined
        ? dir + (rand() - 0.5) * (opts.spread ?? 1.1)
        : opts.up
          ? -Math.PI / 2 + (rand() - 0.5) * 1.2
          : rand() * Math.PI * 2;
    const v = speed * (0.4 + rand() * 0.6);
    const p = this.take();
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * v;
    p.vy = Math.sin(angle) * v;
    p.z = zBase + (opts.z ?? 0);
    p.vz = (opts.vz ?? 0) * (0.7 + rand() * 0.6);
    p.zg = opts.zg ?? 0;
    p.land = LAND_ID[opts.land ?? 'none'];
    p.bounce = opts.bounce ?? 0.45;
    p.landed = 0;
    p.life = 0;
    p.maxLife = (opts.life ?? 0.5) * (0.7 + rand() * 0.6);
    p.size = (opts.size ?? 0.08) * (0.7 + rand() * 0.6);
    p.color = colors[Math.floor(rand() * colors.length)]!;
    p.colorId = this.colorIdOf(p.color);
    p.gravity = opts.gravity ?? 6;
    p.drag = opts.drag ?? 0;
    p.grow = opts.grow ?? 0;
    p.shape = shape;
    p.spin = (opts.spin ?? 0) * (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.8);
    p.rot = rand() * Math.PI * 2;
    p.flicker = opts.flicker ?? 0;
    p.phase = rand() * Math.PI * 2;
    p.fade = opts.fade ?? '';
    p.fadeAt = opts.fadeAt ?? 0.55;
    p.fade2 = opts.fade2 ?? '';
    p.fade2At = opts.fade2At ?? 0.78;
    p.fade3 = opts.fade3 ?? '';
    p.fade3At = opts.fade3At ?? 0.92;
    p.trail = opts.trail ?? 0;
    p.trailColor = opts.trailColor ?? '';
    p.wobble = opts.wobble ?? 0;
    p.layer = opts.layer !== undefined ? LAYER_ID[opts.layer] : opts.ground ? LAYER_GROUND : LAYER_OVERLAY;
    // Airborne world matter shadows by default — presence on the
    // ground plane is what sells the altitude.
    p.shadow = opts.shadow ?? (p.layer === LAYER_WORLD && (p.zg > 0 || p.z > 0) ? 1 : 0);
    p.x2 = opts.x2 ?? x;
    p.y2 = opts.y2 ?? y;
    p.z2 = opts.z2 ?? p.z;
    p.boltRate = opts.boltRate ?? 9;
    p.boltBranch = opts.boltBranch ?? 0.5;
  }

  // -- Emitters -------------------------------------------------------------

  emit(opts: EmitterOpts): Emitter {
    let e: Emitter;
    if (this.emitters.length >= EMITTER_CAP) {
      // The cap recycles the oldest voice — a storm of emitters stays
      // bounded exactly like the particle pool.
      e = this.emitters.reduce((a, b) => (a.age > b.age ? a : b));
    } else {
      const reuse = this.emitterFree.pop();
      if (reuse) {
        e = reuse;
        this.emitters.push(e);
      } else {
        e = {
          alive: false, kind: 0, x: 0, y: 0, z: 0, x2: 0, y2: 0,
          radius: 0, dir: 0, spread: 0, rate: 0, age: 0, dur: 0,
          attack: 0, release: 0, orbitSpeed: 0, orbitA: 0, outward: 0,
          hasDir: false, hasOutward: false, pops: null,
          acc0: 0, acc1: 0, acc2: 0,
          stop() {
            // Fold the envelope down from wherever we are — the
            // release tail still plays, nothing pops off.
            this.dur = Math.min(this.dur, this.age + this.release);
          },
        };
        this.emitters.push(e);
      }
    }
    e.alive = true;
    e.kind = EMITTER_KIND_ID[opts.kind ?? 'point'];
    e.x = opts.x;
    e.y = opts.y;
    e.z = opts.z ?? 0;
    e.x2 = opts.x2 ?? opts.x;
    e.y2 = opts.y2 ?? opts.y;
    e.radius = opts.radius ?? 0.5;
    e.dir = opts.dir ?? 0;
    e.spread = opts.spread ?? 0.5;
    e.hasDir = opts.dir !== undefined;
    e.rate = opts.rate;
    e.age = 0;
    e.dur = Math.min(opts.dur, MAX_EMITTER_DUR);
    e.attack = opts.attack ?? 0.06;
    e.release = opts.release ?? 0.2;
    e.orbitSpeed = opts.orbitSpeed ?? 5;
    e.orbitA = this.rand() * Math.PI * 2;
    e.outward = opts.outward ?? 0;
    e.hasOutward = opts.outward !== undefined;
    e.pops = opts.pops;
    e.acc0 = 0;
    e.acc1 = 0;
    e.acc2 = 0;
    return e;
  }

  /** Live emitter count (tests + budget audits). */
  emitterCount(): number {
    return this.emitters.length;
  }

  private updateEmitters(dt: number): void {
    const list = this.emitters;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i]!;
      e.age += dt;
      if (e.age >= e.dur || !e.pops || e.pops.length === 0) {
        e.alive = false;
        e.pops = null;
        const last = list.pop()!;
        if (e !== last) list[i] = last;
        this.emitterFree.push(e);
        continue;
      }
      e.orbitA += e.orbitSpeed * dt;
      // Attack / sustain / release envelope.
      let env = 1;
      if (e.age < e.attack && e.attack > 0) env = e.age / e.attack;
      const tail = e.dur - e.age;
      if (tail < e.release && e.release > 0) env = Math.min(env, tail / e.release);
      const pops = e.pops;
      let totalW = 0;
      for (const pop of pops) totalW += pop.weight ?? 1;
      if (totalW <= 0) continue;
      const n = Math.min(pops.length, 3);
      for (let pi = 0; pi < n; pi++) {
        const pop = pops[pi]!;
        const share = (e.rate * (pop.weight ?? 1)) / totalW;
        let acc = (pi === 0 ? e.acc0 : pi === 1 ? e.acc1 : e.acc2) + share * env * dt;
        // Backlog clamp: dt is clamped upstream to 250ms, so a hitch
        // used to hand a 130/s pop a 32-particle burst on the very
        // next frame — a self-amplifying stutter. One frame spawns at
        // most 50ms worth of the pop's own rate; the excess is DROPPED
        // (never carried). Steady frames sit far under the cap.
        const maxSpawns = Math.max(1, Math.ceil(share * env * 0.05));
        let spawns = 0;
        while (acc >= 1 && spawns < maxSpawns) {
          acc -= 1;
          spawns++;
          this.emitOne(e, pop);
        }
        if (acc >= 1) acc %= 1;
        if (pi === 0) e.acc0 = acc;
        else if (pi === 1) e.acc1 = acc;
        else e.acc2 = acc;
      }
    }
  }

  private emitOne(e: Emitter, pop: EmitterPop): void {
    const rand = this.rand;
    switch (e.kind) {
      case 1: {
        // ring: anywhere on the hoop, template heading.
        const a = rand() * Math.PI * 2;
        this.spawnOne(
          e.x + Math.cos(a) * e.radius,
          e.y + Math.sin(a) * e.radius,
          pop.colors, pop.opts, undefined, undefined, e.z,
        );
        break;
      }
      case 2: {
        // rim: on the hoop, driven straight outward — shockwave skirts.
        const a = rand() * Math.PI * 2;
        this.spawnOne(
          e.x + Math.cos(a) * e.radius,
          e.y + Math.sin(a) * e.radius,
          pop.colors, pop.opts, a,
          e.hasOutward ? e.outward : undefined, e.z,
        );
        break;
      }
      case 3: {
        // path: anywhere along the segment — fire lines, venom trails.
        const t = rand();
        this.spawnOne(
          e.x + (e.x2 - e.x) * t,
          e.y + (e.y2 - e.y) * t,
          pop.colors, pop.opts, undefined, undefined, e.z,
        );
        break;
      }
      case 4:
        // cone: the emitter's heading overrides the template's.
        this.spawnOne(
          e.x, e.y, pop.colors, pop.opts,
          e.hasDir ? e.dir : pop.opts.dir, undefined, e.z,
        );
        break;
      case 5: {
        // orbit: a revolving spawn head — helixes and swirls.
        const a = e.orbitA + (rand() - 0.5) * 0.35;
        this.spawnOne(
          e.x + Math.cos(a) * e.radius,
          e.y + Math.sin(a) * e.radius,
          pop.colors, pop.opts, undefined, undefined, e.z,
        );
        break;
      }
      case 6: {
        // disc: anywhere INSIDE the hoop, uniform by area — rain
        // fields, ground fogs, settling veils.
        const a = rand() * Math.PI * 2;
        const r = e.radius * Math.sqrt(rand());
        this.spawnOne(
          e.x + Math.cos(a) * r,
          e.y + Math.sin(a) * r,
          pop.colors, pop.opts, undefined, undefined, e.z,
        );
        break;
      }
      default:
        this.spawnOne(e.x, e.y, pop.colors, pop.opts, undefined, undefined, e.z);
    }
  }

  // -- Landings -------------------------------------------------------------

  private pushLanding(x: number, y: number, color: string, size: number, kind: number): void {
    let rec: Landing;
    if (this.landingCount < this.landings.length) {
      rec = this.landings[this.landingCount]!;
    } else if (this.landings.length < LANDING_CAP) {
      rec = { x: 0, y: 0, color: '', size: 0, kind: 0 };
      this.landings.push(rec);
    } else {
      return; // a flood past the cap loses the quietest witnesses
    }
    rec.x = x;
    rec.y = y;
    rec.color = color;
    rec.size = size;
    rec.kind = kind;
    this.landingCount++;
  }

  /**
   * Hand this frame's ground contacts to the caller (stain decals,
   * thud sfx) and clear the queue. Call once per frame after update.
   */
  drainLandings(fn: (l: Landing) => void): void {
    for (let i = 0; i < this.landingCount; i++) fn(this.landings[i]!);
    this.landingCount = 0;
  }

  // -- Simulation -----------------------------------------------------------

  update(dt: number): void {
    // The landing queue is per-frame: contacts not drained by last
    // frame's caller are stale, never a backlog.
    this.landingCount = 0;
    this.updateEmitters(dt);
    const pool = this.pool;
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i]!;
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Swap-remove: order is irrelevant, allocation is forbidden.
        const last = pool.pop()!;
        if (p !== last) pool[i] = last;
        this.free.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wobble > 0) p.x += Math.sin(p.life * 6.5 + p.phase) * p.wobble * dt;
      if (p.grow > 0) p.size += p.grow * dt;
      if (p.spin !== 0) p.rot += p.spin * dt;
      // HEIGHT IS REAL: altitude integrates apart from the ground
      // plane — thrown matter arcs up and comes back to the dirt.
      if (p.zg !== 0 || p.vz !== 0 || p.z !== 0) {
        p.vz -= p.zg * dt;
        p.z += p.vz * dt;
        if (p.z <= 0 && p.vz < 0) {
          if (!this.touchGround(p, i)) continue;
        } else if (p.z < 0) {
          p.z = 0;
        }
      }
      if (p.trail > 0 && this.rand() < p.trail * dt) this.shedMote(p);
    }
  }

  /**
   * Ground contact. Returns false when the particle was removed (the
   * update loop must not touch it again).
   */
  private touchGround(p: Particle, i: number): boolean {
    switch (p.land) {
      case LAND_DIE:
        this.kill(p, i);
        return false;
      case LAND_SETTLE:
        // The flight is over: the grain becomes ground dust — it
        // y-sorts under bodies and drags to a stop where it fell.
        p.z = 0;
        p.vz = 0;
        p.zg = 0;
        p.layer = LAYER_GROUND;
        p.shadow = 0;
        if (p.drag < 6) p.drag = 6;
        return true;
      case LAND_BOUNCE: {
        if (!p.landed) {
          p.landed = 1;
          this.pushLanding(p.x, p.y, p.color, p.size, LANDING_BOUNCE);
        }
        p.z = 0;
        p.vz = -p.vz * p.bounce;
        p.vx *= 0.7;
        p.vy *= 0.7;
        // Too little spring left to read as a hop: lie down.
        if (p.vz < 0.4) {
          p.vz = 0;
          p.zg = 0;
          p.layer = LAYER_GROUND;
          p.shadow = 0;
          if (p.drag < 6) p.drag = 6;
        }
        return true;
      }
      case LAND_SPLAT: {
        // THE LIQUID LAW: a drop that lands is DEAD — it becomes
        // spatter fines and a lingering fleck where it struck.
        const stain = p.fade3 !== '' ? p.fade3 : p.fade2 !== '' ? p.fade2 : p.fade !== '' ? p.fade : p.color;
        this.pushLanding(p.x, p.y, stain, p.size, LANDING_SPLAT);
        const fx = p.x;
        const fy = p.y;
        const fsize = p.size;
        const fcolor = p.color;
        this.kill(p, i);
        // Spatter: a few fines hop out low and die fast...
        for (let k = 0; k < 3; k++) {
          const f = this.take();
          const a = this.rand() * Math.PI * 2;
          const v = 0.5 + this.rand() * 0.9;
          f.x = fx;
          f.y = fy;
          f.vx = Math.cos(a) * v;
          f.vy = Math.sin(a) * v * 0.55;
          f.z = 0.02;
          f.vz = 0.6 + this.rand() * 0.9;
          f.zg = 7;
          f.land = LAND_DIE;
          f.bounce = 0;
          f.landed = 0;
          f.life = 0;
          f.maxLife = 0.24 + this.rand() * 0.18;
          f.size = fsize * 0.38;
          f.color = fcolor;
          f.colorId = this.colorIdOf(fcolor);
          f.gravity = 0;
          f.drag = 2;
          f.grow = 0;
          f.shape = 0;
          f.spin = 0;
          f.rot = 0;
          f.flicker = 0;
          f.phase = this.rand() * Math.PI * 2;
          f.fade = '';
          f.fade2 = '';
          f.fade3 = '';
          f.trail = 0;
          f.trailColor = '';
          f.wobble = 0;
          f.layer = LAYER_WORLD;
          f.shadow = 0;
          f.boltRate = 9;
          f.boltBranch = 0;
          // ...and the fleck lies where it struck, cooling slowly.
          if (k === 0) {
            const fl = this.take();
            fl.x = fx;
            fl.y = fy;
            fl.vx = 0;
            fl.vy = 0;
            fl.z = 0;
            fl.vz = 0;
            fl.zg = 0;
            fl.land = LAND_NONE;
            fl.landed = 0;
            fl.life = 0;
            fl.maxLife = 1.4 + this.rand() * 0.8;
            fl.size = fsize * 0.8;
            fl.color = stain;
            fl.colorId = this.colorIdOf(stain);
            fl.gravity = 0;
            fl.drag = 0;
            fl.grow = 0.01;
            fl.shape = 0;
            fl.spin = 0;
            fl.rot = 0;
            fl.flicker = 0;
            fl.phase = this.rand() * Math.PI * 2;
            fl.fade = '';
            fl.fade2 = '';
            fl.fade3 = '';
            fl.trail = 0;
            fl.trailColor = '';
            fl.wobble = 0;
            fl.layer = LAYER_GROUND;
            fl.shadow = 0;
            fl.boltRate = 9;
            fl.boltBranch = 0;
          }
        }
        return false;
      }
      default:
        // Legacy planar matter passes straight through the floor.
        return true;
    }
  }

  private kill(p: Particle, i: number): void {
    const pool = this.pool;
    const last = pool.pop()!;
    if (p !== last) pool[i] = last;
    this.free.push(p);
  }

  /**
   * A comet sheds: drop a micro-mote where the parent flies. The mote
   * is a plain cooling square with high drag — it hangs a beat and
   * dies. Spawned THROUGH the pool (cap law holds; appended motes
   * are simply visited next frame).
   */
  private shedMote(parent: Particle): void {
    const m = this.take();
    m.x = parent.x;
    m.y = parent.y;
    m.vx = -parent.vx * 0.06 + (this.rand() - 0.5) * 0.3;
    m.vy = -parent.vy * 0.06 + (this.rand() - 0.5) * 0.3;
    m.z = parent.z;
    m.vz = 0;
    m.zg = 0;
    m.land = LAND_NONE;
    m.landed = 0;
    m.life = 0;
    m.maxLife = 0.22 + this.rand() * 0.16;
    m.size = parent.size * 0.5;
    m.color = parent.trailColor || parent.color;
    m.colorId = this.colorIdOf(m.color);
    m.gravity = 0;
    m.drag = 3;
    m.grow = 0;
    m.shape = 0;
    m.spin = 0;
    m.rot = 0;
    m.flicker = 0.4;
    m.phase = this.rand() * Math.PI * 2;
    m.fade = '';
    m.fade2 = '';
    m.fade3 = '';
    m.trail = 0;
    m.trailColor = '';
    m.wobble = 0;
    m.layer = parent.layer;
    m.shadow = 0;
    m.boltRate = 9;
    m.boltBranch = 0;
  }

  // -- Drawing --------------------------------------------------------------

  /**
   * The overlay pass: airborne screen-dressing. World and ground
   * particles are skipped here — the renderer y-sorts them. Draws in
   * (shape, color) buckets: a storm of one material costs one
   * fillStyle set instead of thousands.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    /** B-1c depth thread: per-item depth factor (ds=1 at q=0). */
    depthAt: (wy: number) => number = () => 1,
  ): void {
    const order = this.drawOrder;
    order.length = 0;
    const pool = this.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i]!;
      // (shape, color) leads the key; the low 12 bits carry the index.
      if (p.layer === LAYER_OVERLAY) order.push((((p.shape << 10) | p.colorId) << 12) | i);
    }
    order.sort(NUM_ASC);
    this.batching = true;
    this.lastFill = '';
    for (let k = 0; k < order.length; k++) {
      this.drawOne(ctx, pool[order[k]! & 4095]!, worldToScreen, scale, depthAt);
    }
    this.batching = false;
  }

  /**
   * The renderer's world pass marks a RUN of consecutive particle
   * items (nothing else touches fillStyle inside a run), so setFill
   * can dedupe across bulk-lane draws exactly like the overlay batch.
   */
  beginRun(): void {
    this.batching = true;
    this.lastFill = '';
  }

  endRun(): void {
    this.batching = false;
  }

  private setFill(ctx: CanvasRenderingContext2D, color: string): void {
    if (!this.batching || color !== this.lastFill) {
      ctx.fillStyle = color;
      this.lastFill = color;
    }
  }

  drawOne(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    /** B-1c depth thread: per-item depth factor (ds=1 at q=0). */
    depthAt: (wy: number) => number = () => 1,
  ): void {
    const t = p.life / p.maxLife;
    // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
    const ds = depthAt(p.y);
    // The worldToScreen callback may return a REUSED scratch (the
    // renderer's zero-alloc projection) — copy the fields out before
    // any second projection call (streak tails, bolt endpoints).
    const s = worldToScreen(p.x, p.y);
    const sx = s.x;
    const sy0 = s.y;
    // HEIGHT IS REAL: altitude lifts in FULL screen pixels — heights
    // are never squashed by the camera pitch.
    const sy = sy0 - p.z * scale * ds;
    let size: number;
    let alpha = 1;
    if (p.grow > 0) {
      // Growing blocks (dust) hold size and fade via alpha; shrinking
      // blocks (default) taper to nothing. Both keep hard edges.
      size = Math.max(2, p.size * scale * ds);
      alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
    } else {
      size = Math.max(2, p.size * scale * (1 - t) * ds);
    }
    if (p.flicker > 0) {
      // Embers strobe on their own clock — never in sync with siblings.
      alpha *= 1 - p.flicker * (0.5 + 0.5 * Math.sin(p.life * 26 + p.phase)) * 0.6;
    }
    // Airborne world matter stands ON the ground plane: a contact
    // shadow at the anchor is what makes the altitude readable.
    if (p.shadow > 0 && p.z > 0.02 && p.layer === LAYER_WORLD) {
      const sa = p.shadow * Math.max(0.05, 0.2 - p.z * 0.045) * (alpha < 1 ? alpha : 1);
      const sr = Math.max(1.5, size * (0.5 + p.z * 0.1));
      ctx.globalAlpha = sa;
      ctx.fillStyle = SHADOW_INK;
      ctx.beginPath();
      ctx.ellipse(sx, sy0, sr, sr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.lastFill = SHADOW_INK;
    }
    if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    // THE LIVING MATTER LAW: matter cools in hard bands, never blends.
    this.setFill(ctx, rampColor(p, t));
    if (p.shape === 1) {
      // Streak: a sliver stretched along the flight line — projected
      // through the camera so diagonals lie on the true screen path.
      const tail = worldToScreen(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
      // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
      const taily = tail.y - (p.z - p.vz * 0.045) * scale * ds;
      const dx = sx - tail.x;
      const dy = sy - taily;
      const len = Math.max(size * 1.6, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.fillRect(-len, -size * 0.28, len, size * 0.56);
      ctx.restore();
    } else if (p.shape === 2) {
      // Shard: a tumbling slab.
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rot);
      ctx.fillRect(-size * 0.7, -size * 0.4, size * 1.4, size * 0.8);
      ctx.restore();
    } else if (p.shape === 3) {
      // Lick: a tapered flame tongue riding its velocity, forked tail
      // behind, width breathing on its own clock. Fire that BURNS.
      // Rising licks (vz) point up the screen, as fire should.
      const svx = p.vx;
      const svy = p.vy - p.vz;
      const ang = Math.abs(svx) + Math.abs(svy) > 0.05 ? Math.atan2(svy, svx) : -Math.PI / 2;
      const breath = 0.72 + 0.28 * Math.sin(p.life * 18 + p.phase);
      const len = size * 2.1;
      const w = size * 0.85 * breath;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(len * 0.62, 0); // the tip
      ctx.lineTo(-len * 0.28, -w * 0.5);
      ctx.lineTo(-len * 0.5, -w * 0.16); // forked tail bites in
      ctx.lineTo(-len * 0.38, 0);
      ctx.lineTo(-len * 0.5, w * 0.16);
      ctx.lineTo(-len * 0.28, w * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.shape === 4) {
      // Puff: a three-lobe billow cluster — smoke with VOLUME. The
      // lobes tumble together on rot so the cloud rolls, not slides.
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rot + Math.sin(p.life * 2.2 + p.phase) * 0.2);
      const s0 = size;
      ctx.fillRect(-s0 * 0.5, -s0 * 0.5, s0, s0 * 0.85);
      ctx.fillRect(-s0 * 0.92, -s0 * 0.18, s0 * 0.62, s0 * 0.55);
      ctx.fillRect(s0 * 0.32, -s0 * 0.42, s0 * 0.55, s0 * 0.5);
      ctx.restore();
    } else if (p.shape === 5) {
      // Glint: a crossed-sliver twinkle that pulses on its own phase.
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(p.life * 14 + p.phase));
      const g = size * 0.38 * tw;
      ctx.fillRect(sx - g * 0.5, sy - g * 2.1, g, g * 4.2);
      ctx.fillRect(sx - g * 2.1, sy - g * 0.5, g * 4.2, g);
    } else if (p.shape === 6) {
      // Mote: the puff idiom with ROUND lobes — water mist. A rect
      // lobe at mist scale reads as a pasted square chit; vapour has
      // no corners.
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rot + Math.sin(p.life * 2.2 + p.phase) * 0.2);
      const m = size * 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, m, m * 0.82, 0, 0, Math.PI * 2);
      ctx.ellipse(-m * 0.72, m * 0.12, m * 0.62, m * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(m * 0.66, -m * 0.08, m * 0.55, m * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.shape === 7) {
      // Drop: a faceted teardrop riding its velocity — round head
      // leading, tapered tail trailing, fattening as it slows. THE
      // LIQUID LAW's flying half; the landing half is the splat.
      const svx = p.vx;
      const svy = p.vy - p.vz; // screen-true heading includes the fall
      const sp = Math.hypot(svx, svy);
      const ang = sp > 0.05 ? Math.atan2(svy, svx) : Math.PI / 2;
      const fat = Math.min(1.25, Math.max(0.7, 1.25 - sp * 0.12));
      const r = size * 0.5 * fat;
      const len = Math.min(r * 4, r * (1.6 + sp * 0.5));
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(r, 0); // the nose
      ctx.lineTo(r * 0.25, -r * 0.8);
      ctx.lineTo(-len * 0.45, -r * 0.35);
      ctx.lineTo(-len, 0); // the tail tip
      ctx.lineTo(-len * 0.45, r * 0.35);
      ctx.lineTo(r * 0.25, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.shape === 8) {
      this.drawBolt(ctx, p, worldToScreen, scale, size, alpha, ds);
    } else {
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    }
    // Tracked reset — reading ctx.globalAlpha here was a per-particle
    // cross-boundary getter (the shadow path above resets itself).
    if (alpha < 1) ctx.globalAlpha = 1;
  }

  /**
   * THE ARC LAW: a jagged polyline from (x,y,z) to (x2,y2,z2), deep
   * halo under a hot core, two branch stubs. Geometry re-seeds on the
   * strike beat (boltRate/sec) — NEVER per frame — so each strike
   * hangs long enough to read, then the arc visibly re-forms.
   */
  private drawBolt(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    size: number,
    alpha: number,
    /** B-1c depth thread: per-item depth factor (ds=1 at q=0). */
    ds = 1,
  ): void {
    // Copy each projection out before the next call — the callback
    // may hand back one reused scratch object.
    // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
    const a = worldToScreen(p.x, p.y);
    const ax = a.x;
    const ay = a.y - p.z * scale * ds;
    const b = worldToScreen(p.x2, p.y2);
    const bx = b.x;
    const by = b.y - p.z2 * scale * ds;
    const dx = bx - ax;
    const dy = by - ay;
    const span = Math.hypot(dx, dy);
    if (span < 2) return;
    // Perpendicular in screen space; jitter rides it.
    const px = -dy / span;
    const py = dx / span;
    const strike = Math.floor(p.life * p.boltRate);
    const seed = ((p.phase * 4096) | 0) + strike * 131;
    const amp = span * 0.11;
    const N = 7;
    // The strike pops bright at its birth and decays until the next —
    // the re-form beat is what makes it electricity, not a drawn line.
    const beatT = p.life * p.boltRate - strike;
    const pop = 0.55 + 0.45 * (1 - beatT);
    const nx: number[] = this.boltNx;
    const ny: number[] = this.boltNy;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      // Ends are pinned; the belly wanders.
      const env = Math.sin(Math.PI * t);
      const off = (h01(seed, k) - 0.5) * 2 * amp * env;
      nx[k] = ax + dx * t + px * off;
      ny[k] = ay + dy * t + py * off;
    }
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Deep halo under the hot core — two passes, both hard-edged.
    const halo = p.fade !== '' ? p.fade : p.color;
    ctx.globalAlpha = Math.max(0, alpha * pop * 0.45);
    ctx.strokeStyle = halo;
    ctx.lineWidth = Math.max(1.5, size * 1.5);
    ctx.beginPath();
    ctx.moveTo(nx[0]!, ny[0]!);
    for (let k = 1; k <= N; k++) ctx.lineTo(nx[k]!, ny[k]!);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, alpha * pop);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, size * 0.55);
    ctx.beginPath();
    ctx.moveTo(nx[0]!, ny[0]!);
    for (let k = 1; k <= N; k++) ctx.lineTo(nx[k]!, ny[k]!);
    ctx.stroke();
    // Branch stubs fork off the belly nodes, seeking the dirt.
    if (p.boltBranch > 0) {
      ctx.lineWidth = Math.max(1, size * 0.4);
      for (let bi = 0; bi < 2; bi++) {
        if (h01(seed, 40 + bi) > p.boltBranch) continue;
        const node = bi === 0 ? 2 : 5;
        const side = h01(seed, 50 + bi) < 0.5 ? 1 : -1;
        const blen = span * (0.1 + h01(seed, 60 + bi) * 0.12);
        const bang = Math.atan2(dy, dx) + side * (0.55 + h01(seed, 70 + bi) * 0.5);
        const mx = nx[node]! + Math.cos(bang) * blen * 0.55;
        const my = ny[node]! + Math.sin(bang) * blen * 0.55;
        ctx.beginPath();
        ctx.moveTo(nx[node]!, ny[node]!);
        ctx.lineTo(mx + px * (h01(seed, 80 + bi) - 0.5) * amp * 0.5, my + py * (h01(seed, 90 + bi) - 0.5) * amp * 0.5);
        ctx.lineTo(nx[node]! + Math.cos(bang) * blen, ny[node]! + Math.sin(bang) * blen);
        ctx.stroke();
      }
    }
    ctx.restore();
    this.lastFill = '';
  }

  /** Scratch bolt node buffers — reused, never allocated per frame. */
  private readonly boltNx: number[] = new Array(16).fill(0);
  private readonly boltNy: number[] = new Array(16).fill(0);

  /**
   * THE CROSSING: every live grain dies where it flew and every
   * emitter falls silent — particles are position-keyed matter, and a
   * survivor would rain another plane's weather here. The dead return
   * to the free lists, so the warm pool stays warm; the landing queue
   * empties too (those contacts happened on ground we just left).
   */
  clear(): void {
    for (const p of this.pool) this.free.push(p);
    this.pool.length = 0;
    this.capCursor = 0;
    for (const e of this.emitters) {
      e.alive = false;
      e.pops = null;
      this.emitterFree.push(e);
    }
    this.emitters.length = 0;
    this.landingCount = 0;
  }

  /** Live particle count (tests + budget audits). */
  count(): number {
    return this.pool.length;
  }

  /**
   * The raw pool for the renderer's collect pass — indexed loops over
   * this replaced the ground/world generators, which minted an
   * iterator plus a result object per particle per frame.
   */
  livePool(): readonly Particle[] {
    return this.pool;
  }

  /** Every live particle, all layers (tests + budget audits). */
  *live(): IterableIterator<Particle> {
    yield* this.pool;
  }

  /** Live particles on the ground layer, for the world y-sort. */
  *groundParticles(): IterableIterator<Particle> {
    for (const p of this.pool) {
      if (p.layer === LAYER_GROUND) yield p;
    }
  }

  /**
   * Live particles on the world layer — airborne matter that y-sorts
   * WITH the bodies, so a ring's north arc passes behind the caster.
   */
  *worldParticles(): IterableIterator<Particle> {
    for (const p of this.pool) {
      if (p.layer === LAYER_WORLD) yield p;
    }
  }
}

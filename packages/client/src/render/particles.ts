/**
 * Pooled particle engine — the combat-FX workhorse.
 *
 * Everything stays on brand: hard-edged quads, no blur, no gradients.
 * Six silhouettes cover the whole vocabulary:
 *  - square: the classic chunk (debris, dust, coals)
 *  - streak: a velocity-stretched sliver (sparks, rain, speed lines)
 *  - shard:  a spinning slab (ice, bone, leaves — tumbling matter)
 *  - lick:   a tapered flame tongue riding its velocity, width
 *            breathing on its own phase — fire that BURNS
 *  - puff:   a three-lobe billow cluster — smoke and mist with
 *            volume, still hard-edged
 *  - glint:  a crossed-sliver twinkle that scale-pulses — frost
 *            sparkle, starlight, arcane motes
 *
 * THE LIVING MATTER LAW: matter tells its whole life. `fade` hard-
 * switches a particle to its cooling color late in life (ember →
 * soot, ice → mist, blood dries dark); `trail` sheds micro-motes
 * along the flight arc (gobbets become comets); `wobble` staggers
 * rising smoke off its rails. All three are pool-friendly fields —
 * no closures, no allocation.
 *
 * Perf discipline: live particles are swap-removed and dead objects
 * recycled through a free list — zero allocation once the pool warms.
 * At the cap, new spawns overwrite a rotating slot instead of pushing;
 * a detonation storm can never grow the heap or the draw bill.
 */

export const PARTICLE_CAP = 1400;

export interface Particle {
  x: number; // world coords
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number; // in tiles
  color: string;
  gravity: number;
  /** Per-second velocity damping — lets dust billow out and settle. */
  drag: number;
  /** 0 = shrink over life (default); >0 = grow by this many tiles/sec. */
  grow: number;
  /** 0 square, 1 streak (velocity-stretched), 2 shard (spinning slab). */
  shape: number;
  /** Shard spin rate, rad/s (shards only). */
  spin: number;
  /** Shard orientation, advanced by spin. */
  rot: number;
  /** Strobe weight 0..1 — embers and arcs shimmer, dust doesn't. */
  flicker: number;
  /** Deterministic phase so flicker never syncs across a burst. */
  phase: number;
  /** Cooling color — hard band-switch at 55% life ('' = never). */
  fade: string;
  /** Micro-motes shed per second along the flight arc (0 = none). */
  trail: number;
  /** The shed motes' color ('' = the parent's own). */
  trailColor: string;
  /** Lateral sinusoidal drift amplitude, tiles/sec (rising smoke). */
  wobble: number;
  /**
   * Ground-hugging particles (footfall dust) join the renderer's
   * y-sort as world items instead of the overlay pass — a trail left
   * behind a south-running body must paint UNDER the body.
   */
  ground: boolean;
}

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
  /** Y-sort with the world (ground dust) instead of drawing on top. */
  ground?: boolean;
  /** Silhouette: 'square' (default) | 'streak' | 'shard' | 'lick' | 'puff' | 'glint'. */
  shape?: 'square' | 'streak' | 'shard' | 'lick' | 'puff' | 'glint';
  /** Shard tumble rate, rad/s. */
  spin?: number;
  /** Strobe weight 0..1 — embers/arcs shimmer as they live. */
  flicker?: number;
  /** Cooling color — the particle hard-switches to it at 55% life. */
  fade?: string;
  /** Micro-motes shed per second along the arc (comet tails). */
  trail?: number;
  /** Shed-mote color (defaults to the parent's own color). */
  trailColor?: string;
  /** Lateral sinusoidal stagger, tiles/sec — rising smoke, wisps. */
  wobble?: number;
}

const SHAPE_ID = { square: 0, streak: 1, shard: 2, lick: 3, puff: 4, glint: 5 } as const;

export class Particles {
  private readonly pool: Particle[] = [];
  private readonly free: Particle[] = [];
  private capCursor = 0;

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
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0.08,
      color: '#fff', gravity: 6, drag: 0, grow: 0, shape: 0,
      spin: 0, rot: 0, flicker: 0, phase: 0, fade: '', trail: 0,
      trailColor: '', wobble: 0, ground: false,
    };
    this.pool.push(fresh);
    return fresh;
  }

  burst(x: number, y: number, count: number, colors: string[], opts: BurstOpts = {}): void {
    const speed = opts.speed ?? 2.5;
    const shape = SHAPE_ID[opts.shape ?? 'square'];
    for (let i = 0; i < count; i++) {
      const angle =
        opts.dir !== undefined
          ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 1.1)
          : opts.up
            ? -Math.PI / 2 + (Math.random() - 0.5) * 1.2
            : Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const p = this.take();
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.life = 0;
      p.maxLife = (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6);
      p.size = (opts.size ?? 0.08) * (0.7 + Math.random() * 0.6);
      p.color = colors[Math.floor(Math.random() * colors.length)]!;
      p.gravity = opts.gravity ?? 6;
      p.drag = opts.drag ?? 0;
      p.grow = opts.grow ?? 0;
      p.shape = shape;
      p.spin = (opts.spin ?? 0) * (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8);
      p.rot = Math.random() * Math.PI * 2;
      p.flicker = opts.flicker ?? 0;
      p.phase = Math.random() * Math.PI * 2;
      p.fade = opts.fade ?? '';
      p.trail = opts.trail ?? 0;
      p.trailColor = opts.trailColor ?? '';
      p.wobble = opts.wobble ?? 0;
      p.ground = opts.ground ?? false;
    }
  }

  update(dt: number): void {
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
      if (p.trail > 0 && Math.random() < p.trail * dt) this.shedMote(p);
    }
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
    m.vx = -parent.vx * 0.06 + (Math.random() - 0.5) * 0.3;
    m.vy = -parent.vy * 0.06 + (Math.random() - 0.5) * 0.3;
    m.life = 0;
    m.maxLife = 0.22 + Math.random() * 0.16;
    m.size = parent.size * 0.5;
    m.color = parent.trailColor || parent.color;
    m.gravity = 0;
    m.drag = 3;
    m.grow = 0;
    m.shape = 0;
    m.spin = 0;
    m.rot = 0;
    m.flicker = 0.4;
    m.phase = Math.random() * Math.PI * 2;
    m.fade = '';
    m.trail = 0;
    m.trailColor = '';
    m.wobble = 0;
    m.ground = parent.ground;
  }

  /** The overlay pass: everything airborne. Ground particles are
   * skipped here — the renderer y-sorts them into the world. */
  draw(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
  ): void {
    for (const p of this.pool) {
      if (!p.ground) this.drawOne(ctx, p, worldToScreen, scale);
    }
  }

  drawOne(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
  ): void {
    const t = p.life / p.maxLife;
    const s = worldToScreen(p.x, p.y);
    let size: number;
    let alpha = 1;
    if (p.grow > 0) {
      // Growing blocks (dust) hold size and fade via alpha; shrinking
      // blocks (default) taper to nothing. Both keep hard edges.
      size = Math.max(2, p.size * scale);
      alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
    } else {
      size = Math.max(2, p.size * scale * (1 - t));
    }
    if (p.flicker > 0) {
      // Embers strobe on their own clock — never in sync with siblings.
      alpha *= 1 - p.flicker * (0.5 + 0.5 * Math.sin(p.life * 26 + p.phase)) * 0.6;
    }
    if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    // THE LIVING MATTER LAW: matter cools — a hard band-switch to the
    // fade color late in life, never a soft blend.
    ctx.fillStyle = p.fade !== '' && t > 0.55 ? p.fade : p.color;
    if (p.shape === 1) {
      // Streak: a sliver stretched along the flight line — projected
      // through the camera so diagonals lie on the true screen path.
      const tail = worldToScreen(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
      const dx = s.x - tail.x;
      const dy = s.y - tail.y;
      const len = Math.max(size * 1.6, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(ang);
      ctx.fillRect(-len, -size * 0.28, len, size * 0.56);
      ctx.restore();
    } else if (p.shape === 2) {
      // Shard: a tumbling slab.
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-size * 0.7, -size * 0.4, size * 1.4, size * 0.8);
      ctx.restore();
    } else if (p.shape === 3) {
      // Lick: a tapered flame tongue riding its velocity, forked tail
      // behind, width breathing on its own clock. Fire that BURNS.
      const ang =
        Math.abs(p.vx) + Math.abs(p.vy) > 0.05 ? Math.atan2(p.vy, p.vx) : -Math.PI / 2;
      const breath = 0.72 + 0.28 * Math.sin(p.life * 18 + p.phase);
      const len = size * 2.1;
      const w = size * 0.85 * breath;
      ctx.save();
      ctx.translate(s.x, s.y);
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
      ctx.translate(s.x, s.y);
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
      ctx.fillRect(s.x - g * 0.5, s.y - g * 2.1, g, g * 4.2);
      ctx.fillRect(s.x - g * 2.1, s.y - g * 0.5, g * 4.2, g);
    } else {
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }
    if (ctx.globalAlpha !== 1) ctx.globalAlpha = 1;
  }

  /** Live particles flagged for the world y-sort. */
  *groundParticles(): IterableIterator<Particle> {
    for (const p of this.pool) {
      if (p.ground) yield p;
    }
  }
}

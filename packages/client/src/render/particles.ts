/** Tiny pooled particle system — squares only, hard edges, no blur. */

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
  /**
   * Ground-hugging particles (footfall dust) join the renderer's
   * y-sort as world items instead of the overlay pass — a trail left
   * behind a south-running body must paint UNDER the body.
   */
  ground: boolean;
}

export class Particles {
  private readonly pool: Particle[] = [];

  burst(
    x: number,
    y: number,
    count: number,
    colors: string[],
    opts: {
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
    } = {},
  ): void {
    const speed = opts.speed ?? 2.5;
    for (let i = 0; i < count; i++) {
      const angle =
        opts.dir !== undefined
          ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 1.1)
          : opts.up
            ? -Math.PI / 2 + (Math.random() - 0.5) * 1.2
            : Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.pool.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0,
        maxLife: (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 0.08) * (0.7 + Math.random() * 0.6),
        color: colors[Math.floor(Math.random() * colors.length)]!,
        gravity: opts.gravity ?? 6,
        drag: opts.drag ?? 0,
        grow: opts.grow ?? 0,
        ground: opts.ground ?? false,
      });
    }
    // Hard cap so bursts can never run away.
    if (this.pool.length > 500) this.pool.splice(0, this.pool.length - 500);
  }

  update(dt: number): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i]!;
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.pool.splice(i, 1);
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
      if (p.grow > 0) p.size += p.grow * dt;
    }
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
    // Growing blocks (dust) hold size and fade via alpha; shrinking
    // blocks (default) taper to nothing. Both keep hard edges.
    const s = worldToScreen(p.x, p.y);
    let size: number;
    let alpha = 1;
    if (p.grow > 0) {
      size = Math.max(2, p.size * scale);
      alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
    } else {
      size = Math.max(2, p.size * scale * (1 - t));
    }
    if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    if (alpha < 1) ctx.globalAlpha = 1;
  }

  /** Live particles flagged for the world y-sort. */
  *groundParticles(): IterableIterator<Particle> {
    for (const p of this.pool) {
      if (p.ground) yield p;
    }
  }
}

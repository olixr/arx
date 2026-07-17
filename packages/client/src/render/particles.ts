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
      });
    }
    // Hard cap so bursts can never run away.
    if (this.pool.length > 400) this.pool.splice(0, this.pool.length - 400);
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
  ): void {
    for (const p of this.pool) {
      const frac = 1 - p.life / p.maxLife;
      const s = worldToScreen(p.x, p.y);
      const size = Math.max(2, p.size * scale * frac);
      ctx.fillStyle = p.color;
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }
  }
}

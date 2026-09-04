/**
 * THE WALKING DUMMIES (play3d S1) — stand-ins for ClientGame entities
 * until S2's LiveWorld arrives. Each Walker is a world position with a
 * wander target (or the WASD-driven player), stepped at the FIXED sim
 * rate; the render loop interpolates between the last two sim states
 * so the rig (which derives its gait from position deltas, exactly as
 * the live game does) sees smooth motion whatever the display rate.
 *
 * Collision is the world's own: axis-separated slides against
 * isSolid, the same shape the spike and the 2D client use.
 */
import type { EntityBillboard } from './sprites.js';
import type { WorldSource3D } from './world.js';

export class Walker {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dir = Math.PI / 2;
  /** Wander target (ignored for the player). */
  tx: number;
  ty: number;
  /** Per-walker wander clock so the flock never turns in lockstep. */
  private nextPickAt = 0;

  constructor(
    readonly sprite: EntityBillboard,
    x: number,
    y: number,
    readonly speed: number,
    readonly home: { x: number; y: number; r: number } | null,
  ) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.tx = x;
    this.ty = y;
  }

  /** One fixed sim step. `mx, mz` is the player's unit move (or 0). */
  step(dt: number, world: WorldSource3D, nowMs: number, mx = 0, mz = 0, rand: () => number = Math.random): void {
    this.prevX = this.x;
    this.prevY = this.y;
    if (this.home === null) {
      if (mx !== 0 || mz !== 0) {
        this.slide(mx * this.speed * dt, mz * this.speed * dt, world);
        this.dir = Math.atan2(mz, mx);
      }
      return;
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.15) {
      if (nowMs >= this.nextPickAt) {
        this.nextPickAt = nowMs + 600 + rand() * 2200;
        const nx = this.home.x + (rand() * 2 - 1) * this.home.r;
        const ny = this.home.y + (rand() * 2 - 1) * this.home.r;
        if (!world.isSolid(Math.floor(nx), Math.floor(ny))) {
          this.tx = nx;
          this.ty = ny;
        }
      }
      return;
    }
    const step = Math.min(dist, this.speed * dt);
    this.slide((dx / dist) * step, (dy / dist) * step, world);
    this.dir = Math.atan2(dy, dx);
  }

  private slide(dx: number, dy: number, world: WorldSource3D): void {
    const nx = this.x + dx;
    if (!world.isSolid(Math.floor(nx), Math.floor(this.y))) this.x = nx;
    const ny = this.y + dy;
    if (!world.isSolid(Math.floor(this.x), Math.floor(ny))) this.y = ny;
  }

  /** Interpolated render position. */
  lerpX(alpha: number): number {
    return this.prevX + (this.x - this.prevX) * alpha;
  }

  lerpY(alpha: number): number {
    return this.prevY + (this.y - this.prevY) * alpha;
  }
}

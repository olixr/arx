/**
 * Prop debris — the smash theatre.
 *
 * When a destructible prop bursts, the server sends ONE fx (impact
 * point + heading + kind) and swaps the tile; everything that flies
 * is simulated here, client-side, for free. Each kind breaks along
 * its own joinery — a barrel gives up staves, hoops, and its lid; a
 * crate sheds planks and corner posts; a chair loses the argument one
 * leg at a time — and every burst rolls its own counts, sizes, spins,
 * and speeds so no two breakages read alike.
 *
 * The chunks are honest little bodies: world-plane velocity plus a
 * vertical z with gravity, a couple of dampened bounces, and
 * axis-separated wall tests against the real collision field — smash
 * a barrel against a wall and its staves thud off the mass instead of
 * ghosting through. They lie where they fall for a few seconds, then
 * fade.
 *
 * Perf discipline is the particle engine's: pooled, swap-removed,
 * free-listed, capped with a rotating overwrite slot. Zero alloc once
 * warm, and a room-clearing rampage can never grow the draw bill.
 */

import { shade } from './rig.js';

export const DEBRIS_CAP = 220;

export type SmashKind = 'barrel' | 'crate' | 'goods' | 'chair' | 'table' | 'bench';

export interface DebrisChunk {
  x: number; // world coords (tile units)
  y: number;
  z: number; // height above the floor, in tiles
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  spin: number;
  len: number; // long axis, tiles
  wid: number; // short axis, tiles
  color: string;
  /** Lit stripe along the long axis — reads as a turned stave/plank. */
  stripe: string | null;
  /** Round chunks (lids, produce) draw as ellipses, not slabs. */
  round: boolean;
  settled: boolean;
  life: number;
  maxLife: number;
}

const GRAVITY = 9.5; // tiles/s²
const BOUNCE = 0.42;
const WALL_BOUNCE = -0.3;

/** One chunk recipe rolled at spawn time. */
interface ChunkSpec {
  len: number;
  wid: number;
  color: string;
  stripe?: string | null;
  round?: boolean;
  /** Speed multiplier — lids fly, legs tumble short. */
  pace?: number;
}

export class Debris {
  private readonly pool: DebrisChunk[] = [];
  private readonly free: DebrisChunk[] = [];
  private capCursor = 0;

  private take(): DebrisChunk {
    if (this.pool.length >= DEBRIS_CAP) {
      this.capCursor = (this.capCursor + 1) % this.pool.length;
      return this.pool[this.capCursor]!;
    }
    const c = this.free.pop();
    if (c) {
      this.pool.push(c);
      return c;
    }
    const fresh: DebrisChunk = {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0,
      len: 0.2, wid: 0.1, color: '#8a6534', stripe: null, round: false,
      settled: false, life: 0, maxLife: 6,
    };
    this.pool.push(fresh);
    return fresh;
  }

  /**
   * Burst a prop at (x,y): chunks fly in a cone around `dir` — WITH
   * the blow, away from whoever swung it. `rand` is injectable so the
   * break-up laws are testable; live smashes ride Math.random and
   * every one rolls different.
   */
  smash(x: number, y: number, dir: number, kind: SmashKind, rand: () => number = Math.random): void {
    for (const spec of kitFor(kind, rand)) {
      const c = this.take();
      const ang = dir + (rand() - 0.5) * 1.15;
      const pace = spec.pace ?? 1;
      const sp = (1.6 + rand() * 3.0) * pace;
      c.x = x + (rand() - 0.5) * 0.3;
      c.y = y + (rand() - 0.5) * 0.3;
      c.z = 0.2 + rand() * 0.55; // burst from the prop's body, not its feet
      c.vx = Math.cos(ang) * sp;
      c.vy = Math.sin(ang) * sp * 0.8; // depth axis reads shorter on screen
      c.vz = (1.5 + rand() * 2.4) * pace;
      c.rot = rand() * Math.PI * 2;
      c.spin = (rand() - 0.5) * 15;
      c.len = spec.len;
      c.wid = spec.wid;
      c.color = spec.color;
      c.stripe = spec.stripe ?? null;
      c.round = spec.round ?? false;
      c.settled = false;
      c.life = 0;
      c.maxLife = 5.5 + rand() * 3;
    }
  }

  /**
   * Step every chunk: gravity, bounce, and axis-separated wall tests
   * against the live collision field (the corpse-skid law) — debris
   * never crosses a wall, it thuds and drops.
   */
  update(dt: number, solid: (x: number, y: number) => boolean): void {
    if (dt <= 0) return;
    const pool = this.pool;
    for (let i = pool.length - 1; i >= 0; i--) {
      const c = pool[i]!;
      c.life += dt;
      if (c.life >= c.maxLife) {
        const last = pool.pop()!;
        if (c !== last) pool[i] = last;
        this.free.push(c);
        continue;
      }
      if (!c.settled) {
        c.vz -= GRAVITY * dt;
        c.z += c.vz * dt;
        if (c.z <= 0) {
          c.z = 0;
          if (Math.abs(c.vz) > 1.0) {
            c.vz = -c.vz * BOUNCE;
            c.vx *= 0.72;
            c.vy *= 0.72;
            c.spin *= 0.65;
          } else {
            c.vz = 0;
            c.settled = true;
          }
        }
        const nx = c.x + c.vx * dt;
        if (solid(nx, c.y)) {
          c.vx *= WALL_BOUNCE;
          c.spin *= 0.5;
        } else c.x = nx;
        const ny = c.y + c.vy * dt;
        if (solid(c.x, ny)) {
          c.vy *= WALL_BOUNCE;
          c.spin *= 0.5;
        } else c.y = ny;
        c.rot += c.spin * dt;
      } else {
        // Grounded: skid out under heavy drag, spin dying with it.
        const damp = Math.max(0, 1 - 9 * dt);
        c.vx *= damp;
        c.vy *= damp;
        if (Math.abs(c.vx) + Math.abs(c.vy) > 0.03) {
          const nx = c.x + c.vx * dt;
          if (!solid(nx, c.y)) c.x = nx;
          else c.vx = 0;
          const ny = c.y + c.vy * dt;
          if (!solid(c.x, ny)) c.y = ny;
          else c.vy = 0;
        }
        c.rot += c.spin * dt;
        c.spin *= Math.max(0, 1 - 6 * dt);
      }
    }
  }

  /** Live chunks, for the renderer's world y-sort. */
  *chunks(): IterableIterator<DebrisChunk> {
    yield* this.pool;
  }

  drawOne(
    ctx: CanvasRenderingContext2D,
    c: DebrisChunk,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
  ): void {
    const t = c.life / c.maxLife;
    // Hold near-solid, then fade the last stretch — litter that lies,
    // then politely leaves.
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const p = worldToScreen(c.x, c.y);
    const lw = Math.max(2, c.len * scale);
    const wh = Math.max(1.5, c.wid * scale);
    if (c.z > 0.03) {
      // Airborne: a small contact shadow keeps the flight readable.
      ctx.globalAlpha = alpha * Math.max(0.08, 0.24 - c.z * 0.1);
      ctx.fillStyle = '#141020';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, lw * 0.4, wh * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(p.x, p.y - c.z * scale * 0.92);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    if (c.round) {
      ctx.beginPath();
      ctx.ellipse(0, 0, lw / 2, (lw / 2) * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      if (c.stripe) {
        ctx.fillStyle = c.stripe;
        ctx.beginPath();
        ctx.ellipse(-lw * 0.08, -lw * 0.08, lw * 0.26, lw * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillRect(-lw / 2, -wh / 2, lw, wh);
      if (c.stripe) {
        ctx.fillStyle = c.stripe;
        ctx.fillRect(-lw / 2 + lw * 0.08, -wh * 0.28, lw * 0.84, wh * 0.3);
      }
    }
    // The house outline — debris stays on brand with everything else
    // that stands in the world.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
    ctx.lineWidth = Math.max(1, scale * 0.028);
    if (c.round) {
      ctx.beginPath();
      ctx.ellipse(0, 0, lw / 2, (lw / 2) * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-lw / 2, -wh / 2, lw, wh);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------ break-up kits

const pick = <T>(rand: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rand() * arr.length)]!;

/**
 * Roll a kind's break-up: each prop shatters along its own joinery,
 * with randomized counts and sizes so no two smashes match.
 */
function kitFor(kind: SmashKind, rand: () => number): ChunkSpec[] {
  const out: ChunkSpec[] = [];
  const wood = (base: string, n: number, lo: number, hi: number, wid: number): void => {
    const tones = [base, shade(base, 12), shade(base, -12), shade(base, -6)];
    for (let i = 0; i < n; i++) {
      out.push({
        len: lo + rand() * (hi - lo),
        wid: wid * (0.8 + rand() * 0.5),
        color: pick(rand, tones),
        stripe: rand() < 0.6 ? shade(base, 20) : null,
      });
    }
  };
  switch (kind) {
    case 'barrel': {
      // Staves, iron hoops, and the lid — coopering, undone.
      wood('#7a552e', 5 + Math.floor(rand() * 4), 0.28, 0.46, 0.1);
      for (let i = 0; i < 2; i++) {
        out.push({
          len: 0.24 + rand() * 0.12,
          wid: 0.045,
          color: '#3a3444',
          stripe: '#565064',
        });
      }
      out.push({ len: 0.3 + rand() * 0.08, wid: 0.3, color: '#94693a', stripe: shade('#94693a', -10), round: true, pace: 1.25 });
      break;
    }
    case 'goods':
    case 'crate': {
      // Planks, two corner posts, the lid slab.
      wood('#8a6534', 5 + Math.floor(rand() * 4), 0.26, 0.48, 0.12);
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.34 + rand() * 0.1, wid: 0.08, color: shade('#8a6534', -16) });
      }
      out.push({ len: 0.36 + rand() * 0.1, wid: 0.2, color: '#a5793f', stripe: shade('#a5793f', 14) });
      if (kind === 'goods') {
        // The produce goes everywhere — the fun part.
        const carrots = rand() < 0.5;
        const n = 4 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) {
          out.push({
            len: 0.09 + rand() * 0.05,
            wid: 0.09,
            color: carrots ? pick(rand, ['#d9772e', '#c96a28']) : pick(rand, ['#b5493e', '#a33d33']),
            round: true,
            pace: 1.4,
          });
        }
      }
      break;
    }
    case 'chair': {
      // Four legs, the seat slab, the crest rail — joinery, unjoined.
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.26 + rand() * 0.08, wid: 0.05, color: '#6f4d26' });
      }
      out.push({ len: 0.3 + rand() * 0.06, wid: 0.2, color: shade('#7a552e', 6), stripe: shade('#7a552e', 16) });
      out.push({ len: 0.28 + rand() * 0.06, wid: 0.09, color: '#7a552e', stripe: shade('#7a552e', 12) });
      if (rand() < 0.5) {
        // The cushion survives, flung — a house dye among the wood.
        out.push({
          len: 0.2,
          wid: 0.15,
          color: pick(rand, ['#8a3d46', '#3d5a8a', '#4d6b3c', '#75588a']),
          pace: 1.2,
        });
      }
      break;
    }
    case 'table': {
      // The big board goes in long planks; the legs follow.
      wood('#9c7040', 3 + Math.floor(rand() * 2), 0.45, 0.72, 0.14);
      out.push({ len: 0.4 + rand() * 0.1, wid: 0.16, color: '#a5793f', stripe: shade('#a5793f', 12) });
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.3 + rand() * 0.08, wid: 0.06, color: '#6f4d26' });
      }
      break;
    }
    case 'bench': {
      wood('#9c7040', 2, 0.42, 0.6, 0.13);
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.24 + rand() * 0.06, wid: 0.05, color: '#6f4d26' });
      }
      break;
    }
  }
  return out;
}

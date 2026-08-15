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

/** The game's outline-shader ink (bakeOutlineRing / the entity ring). */
const BRAND_OUTLINE = '#241a2e';

export const DEBRIS_CAP = 220;

export type SmashKind =
  | 'barrel'
  | 'crate'
  | 'goods'
  | 'chair'
  | 'table'
  | 'bench'
  | 'bonepile'
  | 'crackedwall'
  // THE CAMP BARES ITS TEETH: the war camp's own wreckage.
  | 'palisade'
  | 'torch'
  | 'brazier'
  | 'tent'
  | 'skulls'
  | 'totem'
  | 'banner'
  | 'cage'
  | 'stakes'
  | 'spit'
  | 'meatrack'
  | 'pot'
  | 'potions'
  | 'nest'
  | 'sacks'
  | 'spears'
  | 'dummy'
  | 'drum'
  | 'hide'
  // THE FAIR HOUSE FURNISHED: elven wreckage — pale silverbark
  // splinters, silk that sails, moonglass that glitters, marble that
  // drops like the stone it is. Never the camp's brown ruin.
  | 'lantern'
  | 'elfbanner'
  | 'elfbench'
  | 'elftable'
  | 'elfchair'
  | 'daybed'
  | 'bookcase'
  | 'lectern'
  | 'harp'
  | 'loom'
  | 'fountain'
  | 'statue'
  | 'moonwell'
  | 'anvil'
  | 'armsrack'
  | 'planter'
  | 'mirror'
  | 'waystone'
  | 'chimes';

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
   * THE SALVAGE LAW's ceremony: a construction coming DOWN, not blown
   * outward. Chunks spawn through the piece's standing height (`mass`
   * scales it: a wall falls from higher than a floor) with little
   * sideways urge — a slump that settles around the footprint. `slabs`
   * breaks as sawn lumber (long bodies, lit stripes); otherwise the
   * rubble is blocky. Tones come from the demolished tile itself, so
   * a walnut wall and a stone arch each fall in their own colors.
   */
  collapse(
    x: number,
    y: number,
    spec: { tones: readonly string[]; stripe: string | null; slabs: boolean; mass: number },
    rand: () => number = Math.random,
  ): void {
    const n = 7 + Math.round(spec.mass * 7);
    for (let i = 0; i < n; i++) {
      const c = this.take();
      const ang = rand() * Math.PI * 2;
      const sp = 0.5 + rand() * 1.3;
      c.x = x + (rand() - 0.5) * 0.55;
      c.y = y + (rand() - 0.5) * 0.45;
      c.z = 0.25 + rand() * (0.35 + spec.mass * 0.75);
      c.vx = Math.cos(ang) * sp;
      c.vy = Math.sin(ang) * sp * 0.8;
      c.vz = 0.4 + rand() * 1.2; // a slump, never a blast
      c.rot = rand() * Math.PI * 2;
      c.spin = (rand() - 0.5) * 12;
      if (spec.slabs) {
        c.len = 0.16 + rand() * 0.15;
        c.wid = 0.05 + rand() * 0.04;
      } else {
        c.len = 0.09 + rand() * 0.09;
        c.wid = 0.07 + rand() * 0.05;
      }
      c.color = spec.tones[Math.floor(rand() * spec.tones.length)]!;
      c.stripe = spec.slabs && rand() < 0.6 ? spec.stripe : null;
      c.round = false;
      c.settled = false;
      c.life = 0;
      c.maxLife = 5 + rand() * 3;
    }
  }

  /**
   * A blow that DIDN'T finish the prop: a few small chips fly off the
   * impact, short-lived — the "it's working" feedback between hits on
   * durable furniture. Same bodies, smaller and briefer than a burst.
   */
  chip(x: number, y: number, dir: number, kind: SmashKind, rand: () => number = Math.random): void {
    const base = CHIP_TONE[kind];
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const c = this.take();
      const ang = dir + (rand() - 0.5) * 0.9;
      const sp = 1.2 + rand() * 1.8;
      c.x = x + (rand() - 0.5) * 0.2;
      c.y = y + (rand() - 0.5) * 0.2;
      c.z = 0.3 + rand() * 0.35;
      c.vx = Math.cos(ang) * sp;
      c.vy = Math.sin(ang) * sp * 0.8;
      c.vz = 1.2 + rand() * 1.6;
      c.rot = rand() * Math.PI * 2;
      c.spin = (rand() - 0.5) * 18;
      c.len = 0.08 + rand() * 0.08;
      c.wid = 0.05 + rand() * 0.04;
      c.color = rand() < 0.5 ? base : shade(base, rand() < 0.5 ? 12 : -12);
      c.stripe = null;
      c.round = false;
      c.settled = false;
      c.life = 0;
      c.maxLife = 2.2 + rand() * 1.6;
    }
  }

  /**
   * THE TIMBER LAW's crown beat: the instant a felled tree strikes
   * the ground its foliage stops being a canopy and becomes a burst
   * of leaf mats — round tufts in the species' own light bands,
   * popped up and out from the crown's landing point, spinning
   * lively and lying only briefly (litter leaves before lumber).
   * `spread` is the crown half-width in tiles: a broad oak sheds a
   * bigger storm than a wiry pine.
   */
  canopyBurst(
    x: number,
    y: number,
    leaves: readonly [string, string, string],
    spread: number,
    rand: () => number = Math.random,
  ): void {
    const tones = [
      leaves[1], leaves[2], shade(leaves[1], -12), shade(leaves[2], 14), leaves[0],
    ];
    const n = 8 + Math.round(spread * 6) + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const c = this.take();
      const ang = rand() * Math.PI * 2;
      const sp = 0.8 + rand() * 1.9;
      c.x = x + (rand() - 0.5) * spread * 0.9;
      c.y = y + (rand() - 0.5) * spread * 0.6;
      c.z = 0.25 + rand() * 0.55; // burst from the crown's body
      c.vx = Math.cos(ang) * sp;
      c.vy = Math.sin(ang) * sp * 0.8;
      c.vz = 1.0 + rand() * 2.1;
      c.rot = rand() * Math.PI * 2;
      c.spin = (rand() - 0.5) * 22; // leaves tumble livelier than lumber
      c.len = 0.1 + rand() * 0.1;
      c.wid = c.len;
      c.color = pick(rand, tones);
      c.stripe = rand() < 0.4 ? shade(leaves[2], 22) : null;
      c.round = true;
      c.settled = false;
      c.life = 0;
      c.maxLife = 2.6 + rand() * 1.8;
    }
  }

  /**
   * THE TIMBER LAW's last word: the lying trunk bucks into lumber.
   * Chunks spawn ALONG the lie — butt to crown down the ground
   * direction the caller measured (dx/dy already foreshortened, so
   * the lumber line lands exactly where the trunk art lay) — and the
   * break is heavy: billets and rounds pop UP off the break line,
   * scatter barely, thud, and lie in a log-strewn row. Rounds carry
   * a lit end-grain disc; billets carry the bark's own stripe.
   */
  timber(
    x: number,
    y: number,
    dx: number,
    dy: number,
    reach: number,
    bark: { base: string; lit: string; dark: string },
    rand: () => number = Math.random,
  ): void {
    const tones = [bark.base, shade(bark.base, 10), shade(bark.base, -10), bark.dark];
    const nB = 3 + Math.round(reach * 1.1);
    const nR = 2 + (rand() < 0.5 ? 1 : 0);
    const n = nB + nR;
    for (let i = 0; i < n; i++) {
      const round = i >= nB;
      const c = this.take();
      // Every chunk breaks off its own station along the trunk.
      const u = n > 1 ? i / (n - 1) : 0.5;
      const along = 0.25 + (u + (rand() - 0.5) * 0.18) * Math.max(0.4, reach - 0.5);
      const ang = rand() * Math.PI * 2;
      const sp = (0.4 + rand() * 0.9) * (round ? 1.35 : 1);
      c.x = x + dx * along + (rand() - 0.5) * 0.12;
      c.y = y + dy * along + (rand() - 0.5) * 0.12;
      c.z = 0.08 + rand() * 0.2; // the trunk lies LOW — it breaks low
      c.vx = Math.cos(ang) * sp;
      c.vy = Math.sin(ang) * sp * 0.8;
      c.vz = (1.1 + rand() * 1.5) * (round ? 1.25 : 1); // the pop is UP
      c.rot = rand() * Math.PI * 2;
      c.spin = (rand() - 0.5) * 11; // lumber turns heavy, never twirls
      if (round) {
        c.len = 0.2 + rand() * 0.1;
        c.wid = c.len;
        c.color = pick(rand, tones);
        c.stripe = bark.lit; // sawn end grain
        c.round = true;
      } else {
        c.len = 0.3 + rand() * 0.25;
        c.wid = 0.09 + rand() * 0.04;
        c.color = pick(rand, tones);
        c.stripe = rand() < 0.65 ? shade(bark.base, 20) : null;
        c.round = false;
      }
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

  /** The raw pool for indexed iteration — the generator above minted
   *  an iterator + result object per chunk per frame. */
  chunkPool(): readonly DebrisChunk[] {
    return this.pool;
  }

  drawOne(
    ctx: CanvasRenderingContext2D,
    c: DebrisChunk,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    outlined = true,
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
    // ONE silhouette path serves both the brand ring and the fill.
    ctx.beginPath();
    if (c.round) ctx.ellipse(0, 0, lw / 2, (lw / 2) * 0.72, 0, 0, Math.PI * 2);
    else ctx.rect(-lw / 2, -wh / 2, lw, wh);
    if (outlined) {
      // THE SHADER RING, per chunk: the sprite bake dilates the
      // silhouette by max(1.25, scale*0.04) in solid #241a2e — for a
      // convex chunk the identical result is a round-joined stroke at
      // DOUBLE that width under the fill (the surviving outer half is
      // the dilation). One stroke, no offscreen, fades with the chunk.
      // Tiny chips clamp the ring so a speck keeps its wood color.
      const shapeHalf = c.round ? lw * 0.36 : Math.min(lw, wh) / 2;
      const ring = Math.min(Math.max(1.25, scale * 0.04), shapeHalf * 0.75);
      ctx.strokeStyle = BRAND_OUTLINE;
      ctx.lineWidth = ring * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = c.color;
    ctx.fill();
    if (c.stripe) {
      ctx.fillStyle = c.stripe;
      if (c.round) {
        ctx.beginPath();
        ctx.ellipse(-lw * 0.08, -lw * 0.08, lw * 0.26, lw * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-lw / 2 + lw * 0.08, -wh * 0.28, lw * 0.84, wh * 0.3);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------ break-up kits

/** The base wood tone chips fly in, per kind. */
const CHIP_TONE: Record<SmashKind, string> = {
  barrel: '#7a552e',
  crate: '#8a6534',
  goods: '#8a6534',
  chair: '#7a552e',
  table: '#9c7040',
  bench: '#9c7040',
  bonepile: '#cfc7ae',
  crackedwall: '#5a5370',
  // War-camp wreckage: raw axe-hewn timber, bone, hide, and iron.
  palisade: '#6a4a28',
  torch: '#5e4023',
  brazier: '#3a3444',
  tent: '#7a5c3e',
  skulls: '#c9c2ae',
  totem: '#6a4a28',
  banner: '#8a5c40',
  cage: '#5e4023',
  stakes: '#6a4a28',
  spit: '#6a4a28',
  meatrack: '#7c3a2c',
  pot: '#2c2836',
  potions: '#4a8a5e',
  nest: '#8a7444',
  sacks: '#9c8a62',
  spears: '#6a4a28',
  dummy: '#c9b684',
  drum: '#7a5636',
  hide: '#b08d62',
  // Elven wreckage: silverbark, mithril, moonglass, marble, silk.
  lantern: '#8fa3bd',
  elfbanner: '#cdd8ec',
  elfbench: '#a39072',
  elftable: '#a39072',
  elfchair: '#a39072',
  daybed: '#cdd8ec',
  bookcase: '#a39072',
  lectern: '#a39072',
  harp: '#a39072',
  loom: '#cdd8ec',
  fountain: '#ded8ce',
  statue: '#ded8ce',
  moonwell: '#9fe0d8',
  anvil: '#8fa3bd',
  armsrack: '#a39072',
  planter: '#ded8ce',
  mirror: '#a8bccc',
  waystone: '#a9a396',
  chimes: '#8fa3bd',
};

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
    case 'bonepile': {
      // The heap comes apart the way it went together: a couple of
      // long-bones cartwheeling, the skull dome rolling clear, and a
      // rattle of pale shards — no stripe, bone isn't turned lumber.
      const bones = ['#cfc7ae', '#c2b99d', '#e6dfc8', '#8b8272'];
      for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
        out.push({
          len: 0.28 + rand() * 0.14,
          wid: 0.055,
          color: pick(rand, bones),
          stripe: shade('#cfc7ae', 16),
        });
      }
      // The skull, flung whole — the round chunk that sells the kind.
      out.push({ len: 0.2 + rand() * 0.05, wid: 0.2, color: '#cfc7ae', stripe: '#ddd6c0', round: true, pace: 1.2 });
      for (let i = 0; i < 3 + Math.floor(rand() * 3); i++) {
        out.push({ len: 0.09 + rand() * 0.07, wid: 0.05, color: pick(rand, bones) });
      }
      break;
    }
    case 'crackedwall': {
      // The seam gives: raw cave rock in the wall's own palette —
      // big angular chunks thrown HEAVY (low pace: they drop short
      // and thud, stone never sails like barrel staves) plus a spray
      // of smaller spall.
      const rock = ['#3a3444', '#2e2937', '#4a4458', '#5a5370'];
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({
          len: 0.24 + rand() * 0.16,
          wid: 0.16 * (0.8 + rand() * 0.5),
          color: pick(rand, rock),
          stripe: rand() < 0.4 ? '#5a5370' : null,
          pace: 0.65,
        });
      }
      for (let i = 0; i < 4 + Math.floor(rand() * 3); i++) {
        out.push({ len: 0.08 + rand() * 0.08, wid: 0.06, color: pick(rand, rock), pace: 0.85 });
      }
      break;
    }
    case 'palisade': {
      // The wall gives: whole sharpened logs cartwheel HEAVY (low
      // pace — a log drops and thuds, it never sails), rope lashings
      // whip off light, and a spray of splinters rides the blow.
      const logs = ['#6a4a28', '#5e4023', '#755231'];
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({
          len: 0.44 + rand() * 0.22,
          wid: 0.11 * (0.85 + rand() * 0.3),
          color: pick(rand, logs),
          stripe: shade('#6a4a28', 18),
          pace: 0.7,
        });
      }
      // The cut points: short bright wedges off the spike tops.
      for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.16 + rand() * 0.06, wid: 0.08, color: shade('#6a4a28', 26), pace: 1.1 });
      }
      // Rope: pale coils, flung far and light.
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.14 + rand() * 0.08, wid: 0.14, color: '#8a713f', round: true, pace: 1.35 });
      }
      wood('#6a4a28', 3 + Math.floor(rand() * 3), 0.12, 0.24, 0.05);
      break;
    }
    case 'torch': {
      // The stake snaps; the rag head tumbles trailing its last few
      // embers (hot round chips that die where they land).
      out.push({ len: 0.4 + rand() * 0.14, wid: 0.07, color: '#5e4023', stripe: shade('#5e4023', 14) });
      out.push({ len: 0.16, wid: 0.13, color: '#6e4a33', round: true, pace: 1.2 });
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.06 + rand() * 0.04, wid: 0.06, color: pick(rand, ['#e8823d', '#f2c94c', '#c1502e']), round: true, pace: 1.4 });
      }
      wood('#5e4023', 2, 0.1, 0.18, 0.045);
      break;
    }
    case 'brazier': {
      // The tripod spears clatter long; the iron cage drops HEAVY;
      // the coals scatter hot and die.
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.42 + rand() * 0.12, wid: 0.05, color: '#6b4a26', stripe: shade('#6b4a26', 14) });
      }
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.2 + rand() * 0.08, wid: 0.05, color: '#3a3444', stripe: '#565064', pace: 0.7 });
      }
      out.push({ len: 0.22, wid: 0.16, color: '#2c2836', stripe: '#454052', round: true, pace: 0.65 });
      for (let i = 0; i < 4 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.05 + rand() * 0.04, wid: 0.05, color: pick(rand, ['#e8823d', '#c1502e', '#f2c94c']), round: true, pace: 1.3 });
      }
      break;
    }
    case 'tent': {
      // Bent poles spring loose; the cover comes off in soft hide
      // flaps (round, light — cloth floats where timber tumbles).
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.4 + rand() * 0.18, wid: 0.05, color: pick(rand, ['#6b4a26', '#5e4023']) });
      }
      const hides = ['#8f6e4a', '#7a5c3e', '#6e523a'];
      for (let i = 0; i < 4 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.24 + rand() * 0.12, wid: 0.2, color: pick(rand, hides), round: true, pace: 1.25 });
      }
      // Bone toggles rattle out among the pelts.
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.08, wid: 0.045, color: '#c9c2ae' });
      }
      break;
    }
    case 'skulls':
    case 'totem': {
      // Skulls BOUNCE — the round chunks are the whole show, domes
      // rolling clear among a rattle of long-bones and teeth. The
      // totem adds its broken stake.
      const bones = ['#c9c2ae', '#bdb49a', '#e0d9c2'];
      const n = kind === 'skulls' ? 3 + Math.floor(rand() * 2) : 2;
      for (let i = 0; i < n; i++) {
        out.push({
          len: 0.17 + rand() * 0.06,
          wid: 0.17,
          color: pick(rand, bones),
          stripe: '#ddd6c0',
          round: true,
          pace: 1.3,
        });
      }
      for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.24 + rand() * 0.1, wid: 0.05, color: pick(rand, bones) });
      }
      if (kind === 'totem') {
        out.push({ len: 0.5 + rand() * 0.14, wid: 0.09, color: '#6a4a28', stripe: shade('#6a4a28', 14), pace: 0.75 });
        // The fetish rags flutter down light.
        out.push({ len: 0.16, wid: 0.12, color: '#8a3b34', round: true, pace: 1.4 });
      }
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.07 + rand() * 0.05, wid: 0.05, color: pick(rand, bones) });
      }
      break;
    }
    case 'banner': {
      // The shaft breaks at its old kink; the painted hide flies as
      // one big flap; the spearhead spins off bright.
      out.push({ len: 0.5 + rand() * 0.1, wid: 0.06, color: '#6a4a28', stripe: shade('#6a4a28', 12) });
      out.push({ len: 0.36 + rand() * 0.08, wid: 0.06, color: '#5e4023' });
      out.push({ len: 0.3 + rand() * 0.08, wid: 0.24, color: '#8a5c40', stripe: '#e8e2d4', round: true, pace: 1.3 });
      out.push({ len: 0.13, wid: 0.05, color: '#8b93a4', stripe: '#aeb6c6', pace: 1.2 });
      wood('#6a4a28', 2, 0.1, 0.18, 0.04);
      break;
    }
    case 'cage': {
      // Branch bars everywhere — the box that held something is
      // suddenly all daylight. Rope hinges and a bone or two follow.
      wood('#5e4023', 6 + Math.floor(rand() * 3), 0.3, 0.5, 0.06);
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.3 + rand() * 0.08, wid: 0.09, color: shade('#5e4023', -10), pace: 0.8 });
      }
      out.push({ len: 0.13, wid: 0.13, color: '#8a713f', round: true, pace: 1.3 });
      out.push({ len: 0.2 + rand() * 0.06, wid: 0.05, color: '#c9c2ae' });
      break;
    }
    case 'stakes': {
      // The road-blocker: sharpened shafts spin out point-first,
      // heavy, with the lashed crossbeam among them.
      const logs = ['#6a4a28', '#755231'];
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({
          len: 0.4 + rand() * 0.16,
          wid: 0.08,
          color: pick(rand, logs),
          stripe: shade('#6a4a28', 24),
          pace: 0.8,
        });
      }
      out.push({ len: 0.5 + rand() * 0.1, wid: 0.07, color: shade('#6a4a28', -10), pace: 0.7 });
      out.push({ len: 0.12, wid: 0.12, color: '#8a713f', round: true, pace: 1.3 });
      wood('#6a4a28', 2 + Math.floor(rand() * 2), 0.1, 0.2, 0.05);
      break;
    }
    case 'spit': {
      // Forks and rod go as timber — and the haunch itself flies
      // whole (the fat round chunk IS the joke), coals scattering.
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.34 + rand() * 0.08, wid: 0.06, color: '#6b4a26' });
      }
      out.push({ len: 0.5 + rand() * 0.1, wid: 0.045, color: shade('#6b4a26', -8) });
      out.push({ len: 0.24, wid: 0.19, color: '#8a4130', stripe: '#e8d9b8', round: true, pace: 1.25 });
      out.push({ len: 0.14, wid: 0.05, color: '#c9c2ae' });
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.05 + rand() * 0.04, wid: 0.05, color: pick(rand, ['#e8823d', '#c1502e']), round: true, pace: 1.3 });
      }
      break;
    }
    case 'meatrack': {
      // Posts and bar down; the larder rains — cuts flop as soft
      // round chunks, the sausage string whips off light.
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.4 + rand() * 0.1, wid: 0.06, color: '#6b4a26', stripe: shade('#6b4a26', 12) });
      }
      out.push({ len: 0.52 + rand() * 0.1, wid: 0.05, color: shade('#6b4a26', -10) });
      for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.18 + rand() * 0.08, wid: 0.14, color: pick(rand, ['#7c3a2c', '#a3543a']), stripe: '#e8d9b8', round: true, pace: 1.2 });
      }
      out.push({ len: 0.22, wid: 0.07, color: '#8a4a3a', round: true, pace: 1.35 });
      break;
    }
    case 'pot': {
      // The kettle splits in two iron shells (HEAVY, they thud), the
      // tripod clatters, and the gruel goes up in green splashes.
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.24 + rand() * 0.06, wid: 0.16, color: '#2c2836', stripe: '#454052', round: true, pace: 0.65 });
      }
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.38 + rand() * 0.1, wid: 0.05, color: '#6b4a26' });
      }
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.07 + rand() * 0.05, wid: 0.07, color: pick(rand, ['#5d7a42', '#4e6636']), round: true, pace: 1.25 });
      }
      out.push({ len: 0.2, wid: 0.045, color: shade('#6b4a26', 8) });
      break;
    }
    case 'potions': {
      // The shelf drops as planks — but the STOCK is the show:
      // bright glass chips in every brew color, small and fast, a
      // glitter where the rack stood.
      wood('#6b4a26', 3, 0.24, 0.4, 0.07);
      const brews = ['#4a8a5e', '#7a5c9e', '#b8862e', '#5d4a7a', '#a89a8a'];
      for (let i = 0; i < 6 + Math.floor(rand() * 4); i++) {
        out.push({
          len: 0.06 + rand() * 0.05,
          wid: 0.05,
          color: pick(rand, brews),
          stripe: rand() < 0.5 ? '#f4f2ea' : null,
          pace: 1.35,
        });
      }
      // One horn and one stoneware shoulder survive to roll away.
      out.push({ len: 0.16, wid: 0.07, color: '#ddd6c2', round: true, pace: 1.2 });
      out.push({ len: 0.13, wid: 0.11, color: '#a89a8a', stripe: '#5d4a7a', round: true, pace: 0.9 });
      break;
    }
    case 'nest': {
      // The bed bursts soft: straw wisps and fur tufts float, the
      // gnawed bones cartwheel out of the middle.
      for (let i = 0; i < 5 + Math.floor(rand() * 3); i++) {
        out.push({ len: 0.12 + rand() * 0.08, wid: 0.035, color: pick(rand, ['#a5834f', '#8a7444']), pace: 1.3 });
      }
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.1 + rand() * 0.05, wid: 0.09, color: '#8a8794', round: true, pace: 1.4 });
      }
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.22 + rand() * 0.08, wid: 0.05, color: '#bdb49a' });
      }
      break;
    }
    case 'sacks': {
      // Cloth flaps tumble — and the hoard sprays: coin sparks, fast
      // and glittering, plus the looted candlestick end over end.
      for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        out.push({ len: 0.2 + rand() * 0.1, wid: 0.16, color: pick(rand, ['#9c8a62', '#8a7a54']), round: true, pace: 1.1 });
      }
      for (let i = 0; i < 6 + Math.floor(rand() * 4); i++) {
        out.push({ len: 0.05 + rand() * 0.025, wid: 0.05, color: pick(rand, ['#c9962e', '#e0b84f']), round: true, pace: 1.5 });
      }
      out.push({ len: 0.2, wid: 0.05, color: '#b8963a', stripe: '#e0b84f', pace: 1.2 });
      out.push({ len: 0.13, wid: 0.06, color: '#8a713f', round: true, pace: 1.25 });
      break;
    }
    case 'spears': {
      // The stack collapses: long shafts scissor apart, bright
      // spearheads spin off, the shield rolls its rim.
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.5 + rand() * 0.16, wid: 0.045, color: pick(rand, ['#6a4a28', '#755231']), stripe: shade('#6a4a28', 14) });
      }
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.13, wid: 0.05, color: '#8b93a4', stripe: '#aeb6c6', pace: 1.25 });
      }
      out.push({ len: 0.26, wid: 0.26, color: '#7a5c3e', stripe: '#8a3b34', round: true, pace: 1.15 });
      break;
    }
    case 'dummy': {
      // The straw man lets go all at once: a BURST of straw wisps,
      // the sack head bouncing away, the post dropping heavy, and
      // the stuck arrows returned to sender.
      for (let i = 0; i < 7 + Math.floor(rand() * 4); i++) {
        out.push({ len: 0.1 + rand() * 0.09, wid: 0.03, color: pick(rand, ['#c9b684', '#b09c70', '#d9c894']), pace: 1.35 });
      }
      out.push({ len: 0.17, wid: 0.15, color: '#b09c70', stripe: '#241a2e', round: true, pace: 1.35 });
      out.push({ len: 0.44 + rand() * 0.1, wid: 0.08, color: '#6a4a28', pace: 0.7 });
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.24, wid: 0.03, color: '#8a6534', stripe: '#ddd6c2', pace: 1.2 });
      }
      break;
    }
    case 'drum': {
      // The shell staves apart like a barrel gone to war: hide-brown
      // staves, the two hoops, the skin flying as one flap, and the
      // mallets end over end.
      wood('#7a5636', 4 + Math.floor(rand() * 2), 0.26, 0.42, 0.09);
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.22 + rand() * 0.08, wid: 0.045, color: '#4e3a26', stripe: '#6a5236' });
      }
      out.push({ len: 0.3, wid: 0.26, color: '#c9b088', stripe: '#8a3b34', round: true, pace: 1.25 });
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.2, wid: 0.04, color: shade('#6b4a26', 6), pace: 1.15 });
      }
      break;
    }
    case 'hide': {
      // Frame sticks snap; the hide itself sails as the big soft
      // flap; tie cords and the scraper follow.
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.36 + rand() * 0.12, wid: 0.05, color: pick(rand, ['#6a4a28', '#5e4023']) });
      }
      out.push({ len: 0.32, wid: 0.26, color: '#b08d62', stripe: '#c9a677', round: true, pace: 1.2 });
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.1 + rand() * 0.05, wid: 0.03, color: '#4a3a22', pace: 1.3 });
      }
      out.push({ len: 0.15, wid: 0.05, color: '#8b93a4', pace: 1.1 });
      break;
    }
    // -------------------------------- THE FAIR HOUSE FURNISHED
    case 'lantern': {
      // The crook drops in two mithril lengths; the globe becomes
      // glitter — moonglass rings away in bright fast motes.
      out.push({ len: 0.42, wid: 0.045, color: '#8fa3bd', stripe: '#dce9f8' });
      out.push({ len: 0.26, wid: 0.04, color: shade('#8fa3bd', -12), stripe: '#dce9f8' });
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.06 + rand() * 0.04, wid: 0.05, color: pick(rand, ['#9fe0d8', '#dff6ff']), round: true, pace: 1.4 });
      }
      out.push({ len: 0.14, wid: 0.12, color: shade('#ded8ce', -20), round: true, pace: 0.85 });
      break;
    }
    case 'elfbanner': {
      // The true pole snaps clean in two; the silk sails off entire,
      // border up — cloth outlives the wood that carried it.
      wood('#a39072', 2, 0.4, 0.55, 0.06);
      out.push({ len: 0.24, wid: 0.04, color: '#8fa3bd', stripe: '#dce9f8', pace: 1.15 });
      out.push({ len: 0.42, wid: 0.3, color: '#cdd8ec', stripe: '#7fa8d9', round: true, pace: 1.3 });
      out.push({ len: 0.1, wid: 0.08, color: '#8fa3bd', round: true, pace: 1.2 });
      break;
    }
    case 'elfbench': {
      // Swept legs scissor out; the crescent seat rides the fall;
      // one armrest curl rolls its ring.
      wood('#a39072', 4, 0.22, 0.36, 0.07);
      out.push({ len: 0.44, wid: 0.14, color: shade('#a39072', 24), stripe: '#7fa8d9', pace: 1.1 });
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.1, wid: 0.09, color: shade('#a39072', -6), round: true, pace: 1.2 });
      }
      break;
    }
    case 'elftable': {
      // The oval slab flies as one lid, vein up; the three bowed
      // legs tumble under it.
      out.push({ len: 0.5, wid: 0.34, color: shade('#a39072', 26), stripe: '#7fa8d9', round: true, pace: 1.25 });
      wood('#a39072', 3, 0.3, 0.42, 0.07);
      out.push({ len: 0.08, wid: 0.03, color: '#dce9f8', pace: 1.35 });
      break;
    }
    case 'elfchair': {
      // Legs and the frond back; the cushion puffs off soft and slow.
      wood('#a39072', 3, 0.2, 0.34, 0.06);
      out.push({ len: 0.3, wid: 0.1, color: shade('#a39072', -2), stripe: shade('#a39072', 16) });
      out.push({ len: 0.2, wid: 0.16, color: '#cdd8ec', round: true, pace: 0.8 });
      out.push({ len: 0.09, wid: 0.08, color: shade('#a39072', -8), round: true, pace: 1.25 });
      break;
    }
    case 'daybed': {
      // Frame rails, the curled runners, and TWO cloths: the heavy
      // mattress drops, the sheer drape hangs in the air a beat.
      wood('#a39072', 4, 0.28, 0.44, 0.08);
      out.push({ len: 0.46, wid: 0.28, color: '#cdd8ec', stripe: '#c8a95e', round: true, pace: 0.85 });
      out.push({ len: 0.34, wid: 0.22, color: shade('#cdd8ec', 14), round: true, pace: 1.45 });
      out.push({ len: 0.18, wid: 0.12, color: '#5d8a6e', round: true, pace: 1.1 });
      break;
    }
    case 'bookcase': {
      // The arch comes down in pale boards — and the LIBRARY takes
      // wing: books tumble spine-lit, scrolls roll free.
      wood('#a39072', 5, 0.3, 0.48, 0.09);
      for (const tone of ['#3f6e58', '#5f7ea6', '#5d5169', '#c8a95e']) {
        out.push({ len: 0.14 + rand() * 0.06, wid: 0.1, color: tone, stripe: shade(tone, 24), pace: 1.2 });
      }
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.16, wid: 0.06, color: '#e4ded2', round: true, pace: 1.3 });
      }
      break;
    }
    case 'lectern': {
      // The stem and desk break honest; the pages FLY — the lightest
      // debris in the game, and they go furthest.
      wood('#a39072', 2, 0.26, 0.4, 0.07);
      out.push({ len: 0.32, wid: 0.18, color: shade('#a39072', 22), pace: 1.05 });
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.12, wid: 0.09, color: pick(rand, ['#ece8dc', '#f6f3ea']), round: true, pace: 1.55 });
      }
      out.push({ len: 0.06, wid: 0.05, color: '#7fa8d9', round: true, pace: 1.3 });
      break;
    }
    case 'harp': {
      // Pillar, neck, soundboard — and two strings that leave as
      // bright hairs of light with the gold crown bead.
      wood('#a39072', 3, 0.3, 0.46, 0.07);
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.3 + rand() * 0.1, wid: 0.014, color: '#dce9f8', pace: 1.4 });
      }
      out.push({ len: 0.07, wid: 0.06, color: '#c8a95e', round: true, pace: 1.25 });
      break;
    }
    case 'loom': {
      // Frame timbers; the half-woven cloth sails; the warp weights
      // drop straight like the stones they are; spools scatter color.
      wood('#a39072', 4, 0.26, 0.42, 0.07);
      out.push({ len: 0.36, wid: 0.24, color: '#cdd8ec', stripe: '#7ec4a8', round: true, pace: 1.3 });
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.07, wid: 0.06, color: shade('#ded8ce', -30), round: true, pace: 0.7 });
      }
      for (const tone of ['#7ec4a8', '#c8a95e']) {
        out.push({ len: 0.06, wid: 0.05, color: tone, round: true, pace: 1.3 });
      }
      break;
    }
    case 'fountain': {
      // Marble breaks big and falls short; the pooled water leaves
      // as bright splash slivers with no weight at all.
      wood('#ded8ce', 5, 0.2, 0.36, 0.11);
      out.push({ len: 0.3, wid: 0.2, color: shade('#ded8ce', -10), round: true, pace: 0.8 });
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.1 + rand() * 0.05, wid: 0.03, color: pick(rand, ['#7ec4d8', '#dff2fa']), pace: 1.5 });
      }
      out.push({ len: 0.09, wid: 0.07, color: '#8fa3bd', round: true, pace: 1.15 });
      break;
    }
    case 'statue': {
      // The warden falls the way statues fall: in torso-weight
      // blocks. The head keeps together; the blade leaves LAST and
      // brightest.
      wood('#ded8ce', 6, 0.24, 0.4, 0.12);
      out.push({ len: 0.16, wid: 0.14, color: shade('#ded8ce', 8), round: true, pace: 0.75 });
      out.push({ len: 0.4, wid: 0.05, color: '#8fa3bd', stripe: '#dce9f8', pace: 1.3 });
      out.push({ len: 0.09, wid: 0.07, color: '#c8a95e', round: true, pace: 1.2 });
      break;
    }
    case 'moonwell': {
      // Rim stones tip outward; the lit water flies as glitter that
      // dies in the air — the light does not survive the bowl.
      wood('#ded8ce', 5, 0.16, 0.28, 0.1);
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.07 + rand() * 0.04, wid: 0.05, color: pick(rand, ['#9fe8d8', '#d9fff4']), round: true, pace: 1.45 });
      }
      break;
    }
    case 'anvil': {
      // Mithril parts along its welds — three bright blocks — and
      // the root plinth crumbles under it; the hammer cartwheels.
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.2 + rand() * 0.1, wid: 0.09, color: pick(rand, ['#8fa3bd', shade('#8fa3bd', -12)]), stripe: '#dce9f8' });
      }
      wood('#ded8ce', 3, 0.16, 0.28, 0.1);
      out.push({ len: 0.24, wid: 0.05, color: '#a39072', stripe: '#8fa3bd', pace: 1.3 });
      break;
    }
    case 'armsrack': {
      // The gallery spills: rack timbers, both blades spinning
      // bright, the bow's long limb, and the gold ferrule.
      wood('#a39072', 3, 0.26, 0.4, 0.07);
      for (let i = 0; i < 2; i++) {
        out.push({ len: 0.3 + rand() * 0.12, wid: 0.045, color: '#8fa3bd', stripe: '#dce9f8', pace: 1.3 });
      }
      out.push({ len: 0.48, wid: 0.035, color: shade('#a39072', 16), pace: 1.15 });
      out.push({ len: 0.07, wid: 0.06, color: '#c8a95e', round: true, pace: 1.25 });
      break;
    }
    case 'planter': {
      // The urn parts into marble shells; dark soil scatters short;
      // silverleaf and blooms drift down LAST, light as ash.
      wood('#ded8ce', 4, 0.14, 0.26, 0.09);
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.07, wid: 0.05, color: '#3a3020', round: true, pace: 0.7 });
      }
      for (let i = 0; i < 3; i++) {
        out.push({ len: 0.09, wid: 0.06, color: pick(rand, ['#b8d4c0', '#cfe0d4', '#e8f4ff']), round: true, pace: 1.35 });
      }
      break;
    }
    case 'mirror': {
      // The frame keeps its arcs; the GLASS goes everywhere — long
      // bright shards, the fastest debris in the kit. Bad luck to
      // whoever swung.
      wood('#a39072', 3, 0.2, 0.34, 0.06);
      for (let i = 0; i < 5; i++) {
        out.push({ len: 0.12 + rand() * 0.12, wid: 0.035, color: pick(rand, ['#a8bccc', '#c4d4e0', '#dce9f8']), pace: 1.5 });
      }
      out.push({ len: 0.07, wid: 0.06, color: '#c8a95e', round: true, pace: 1.2 });
      break;
    }
    case 'waystone': {
      // Old stone drops dead-weight; one mithril vein leaves as a
      // bright thread; the moss goes with its face.
      wood('#a9a396', 5, 0.22, 0.38, 0.12);
      out.push({ len: 0.26, wid: 0.02, color: '#7fa8d9', pace: 1.35 });
      out.push({ len: 0.12, wid: 0.09, color: '#5d8a6e', round: true, pace: 0.9 });
      break;
    }
    case 'chimes': {
      // The stand drops; the five voices ring AWAY — slim bright
      // tubes at pace, the moonglass drop among them.
      wood('#a39072', 2, 0.28, 0.44, 0.05);
      for (let i = 0; i < 4; i++) {
        out.push({ len: 0.16 + rand() * 0.1, wid: 0.032, color: pick(rand, ['#8fa3bd', shade('#8fa3bd', 8)]), stripe: '#dce9f8', pace: 1.3 });
      }
      out.push({ len: 0.08, wid: 0.06, color: '#9fe0d8', round: true, pace: 1.4 });
      out.push({ len: 0.11, wid: 0.09, color: '#8fa3bd', round: true, pace: 1.1 });
      break;
    }
  }
  return out;
}

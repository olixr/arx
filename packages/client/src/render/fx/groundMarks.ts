/**
 * THE WORLD REMEMBERS — the ground-marks layer (particles v6, phase 2).
 *
 * A pooled, hard-capped field of flat marks painted in the decal
 * stratum, UNDER every y-sorted body: the char where a coal actually
 * burned out, the fleck where a venom bead struck, the smear a blood
 * gobbet left as it slid, the rime a frost shard left as it melted.
 * Fed by the particle engine's landing queue (finally drained — the
 * v5 splat's "lingering fleck" promise) and by `mark` recipes on
 * grains that die on the dirt. Nothing here is a stamp: a burning
 * floor is the sum of the coals that fell on it, so it is never the
 * same shape twice and it is always where the matter went.
 *
 * Three acts per mark: ARRIVE (a fast fade-in, hot marks glow), HOLD
 * (the residue), RECLAIM (the turf takes it back over the last third).
 * Hard edges only; the ground squash on every ellipse; the pool never
 * grows past MARK_CAP — a long fight recycles its oldest memories.
 */

import { LANDING_BOUNCE, LANDING_MARK, LANDING_SPLAT, MARK_CHAR, MARK_FLECK, MARK_FROST, MARK_SMEAR, type Landing } from '../particles.js';
import { mixHex } from './curves.js';

export const MARK_CAP = 220;

/** The ground's ink for char — soot over whatever burned. */
const CHAR_INK = '#1c120e';
const FROST_PALE = '#e6f4fb';
/** The camera's ground squash — every ground ellipse wears it. */
const SQUASH = 0.62;

export interface Mark {
  x: number;
  y: number;
  /** Footprint in tiles. */
  size: number;
  color: string;
  /** The char/frost ink derived once at add-time (no per-frame mixing). */
  ink: string;
  kind: number;
  bornAt: number;
  life: number;
  /** Seeded lay: angle + two radii so no two marks share a shape. */
  seed: number;
}

/** Deterministic 0..1 hash for seeded lay. */
function h01(seed: number, k: number): number {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(k | 0, 0x85ebca77)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) >>> 0;
  a = Math.imul(a ^ (a >>> 12), 0x297a2d39) >>> 0;
  return ((a ^ (a >>> 15)) >>> 0) / 4294967296;
}

export class GroundMarks {
  private readonly marks: Mark[] = [];
  private cursor = 0;
  private seedRoll = 1;

  /** Add one mark. `now` in seconds. */
  add(x: number, y: number, size: number, color: string, kind: number, life: number, now: number): void {
    let m: Mark;
    if (this.marks.length < MARK_CAP) {
      m = { x: 0, y: 0, size: 0, color: '', ink: '', kind: 0, bornAt: 0, life: 1, seed: 0 };
      this.marks.push(m);
    } else {
      // The cap recycles round-robin: the oldest memory gives way.
      m = this.marks[this.cursor]!;
      this.cursor = (this.cursor + 1) % MARK_CAP;
    }
    m.x = x;
    m.y = y;
    // Char spreads past the coal that made it, rime past the shard; a
    // fleck is the drop's own splash.
    m.size = kind === MARK_CHAR ? size * 1.7 : kind === MARK_FROST ? size * 2.2 : size * 1.4;
    m.color = color;
    m.kind = kind;
    m.bornAt = now;
    m.life = Math.max(0.2, life);
    m.seed = (this.seedRoll = (this.seedRoll * 1103515245 + 12345) & 0x7fffffff);
    m.ink = kind === MARK_CHAR ? mixHex(color, CHAR_INK, 0.72)
      : kind === MARK_FROST ? mixHex(color, FROST_PALE, 0.5)
      : color;
  }

  /**
   * The landing queue's consumer: splats stain, marks remember,
   * bounces pass silently (a hop is not a wound).
   */
  ingest(l: Landing, now: number): void {
    if (l.kind === LANDING_BOUNCE) return;
    if (l.kind === LANDING_SPLAT) {
      this.add(l.x, l.y, l.size * 1.3, l.color, l.mark > 0 ? l.mark : MARK_FLECK, l.life > 0 ? l.life : 3.2, now);
      return;
    }
    if (l.kind === LANDING_MARK) this.add(l.x, l.y, l.size, l.color, l.mark, l.life, now);
  }

  /** Live mark count (tests + the lab). */
  count(): number {
    return this.marks.length;
  }

  clear(): void {
    this.marks.length = 0;
    this.cursor = 0;
  }

  /** Drop expired marks (call once per frame before draw). `now` seconds. */
  prune(now: number): void {
    const list = this.marks;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]!;
      if (now - m.bornAt >= m.life) {
        const last = list.pop()!;
        if (m !== last) list[i] = last;
      }
    }
    if (this.cursor >= list.length) this.cursor = 0;
  }

  /**
   * Paint every live mark. `worldToScreen` must already include the
   * ground lift under the point (the renderer's lifted projection).
   */
  draw(
    ctx: CanvasRenderingContext2D,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    now: number,
  ): void {
    const list = this.marks;
    if (list.length === 0) return;
    let lastFill = '';
    for (let i = 0; i < list.length; i++) {
      const m = list[i]!;
      const t = (now - m.bornAt) / m.life;
      if (t >= 1) continue;
      const s = worldToScreen(m.x, m.y);
      const sx = s.x;
      const sy = s.y;
      // Three acts: arrive over ~0.12 of life (capped at 0.25s), hold,
      // reclaim over the last third.
      const arriveSpan = Math.min(0.12, 0.25 / m.life);
      const arrive = t < arriveSpan ? t / arriveSpan : 1;
      const reclaim = t > 0.66 ? 1 - (t - 0.66) / 0.34 : 1;
      const env = arrive * reclaim;
      if (env <= 0.01) continue;
      const px = Math.max(2, m.size * scale);
      const ang = h01(m.seed, 1) * Math.PI;
      const ra = 0.7 + h01(m.seed, 2) * 0.6;
      const rb = 0.7 + h01(m.seed, 3) * 0.6;
      switch (m.kind) {
        case MARK_CHAR: {
          // Char: a soot patch of two flat blocks, and a coal heart
          // that glows out over the first act — the ground remembers
          // heat before it remembers black.
          ctx.globalAlpha = 0.62 * env;
          if (m.ink !== lastFill) ctx.fillStyle = lastFill = m.ink;
          ctx.fillRect(sx - px * 0.6 * ra, sy - px * 0.28 * rb, px * 1.2 * ra, px * 0.56 * rb);
          ctx.fillRect(sx - px * 0.35 * rb + px * 0.2, sy - px * 0.4 * ra, px * 0.7 * rb, px * 0.5 * ra);
          const heat = 1 - t / 0.3;
          if (heat > 0) {
            const pulse = 0.6 + 0.4 * Math.sin(now * 9 + m.seed);
            ctx.globalAlpha = heat * pulse * 0.85 * env;
            ctx.fillStyle = lastFill = m.color;
            const hs = px * 0.32;
            ctx.fillRect(sx - hs * 0.5, sy - hs * 0.4, hs, hs * 0.7);
          }
          break;
        }
        case MARK_SMEAR: {
          // Smear: a liquid dragged flat along its seeded lay.
          ctx.globalAlpha = 0.7 * env;
          if (m.ink !== lastFill) ctx.fillStyle = lastFill = m.ink;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(1, SQUASH);
          ctx.rotate(ang);
          ctx.fillRect(-px * 0.9 * ra, -px * 0.22, px * 1.8 * ra, px * 0.44);
          ctx.fillRect(px * 0.5 * ra, -px * 0.14, px * 0.5, px * 0.28);
          ctx.restore();
          break;
        }
        case MARK_FROST: {
          // Rime: a pale floor patch and two spars growing out of it
          // over the first act, then thawing.
          ctx.globalAlpha = 0.72 * env;
          if (m.ink !== lastFill) ctx.fillStyle = lastFill = m.ink;
          ctx.beginPath();
          ctx.ellipse(sx, sy, px * 0.55 * ra, px * 0.55 * ra * SQUASH, 0, 0, Math.PI * 2);
          ctx.fill();
          const grow = Math.min(1, t / 0.2);
          ctx.globalAlpha = 0.8 * env;
          ctx.fillStyle = lastFill = FROST_PALE;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          ctx.fillRect(0, -px * 0.06, px * 0.9 * rb * grow, px * 0.12);
          ctx.rotate(2.1);
          ctx.fillRect(0, -px * 0.05, px * 0.7 * ra * grow, px * 0.1);
          ctx.restore();
          break;
        }
        default: {
          // Fleck: a small squashed block cluster where a drop struck.
          ctx.globalAlpha = 0.75 * env;
          if (m.ink !== lastFill) ctx.fillStyle = lastFill = m.ink;
          ctx.fillRect(sx - px * 0.5 * ra, sy - px * 0.25 * rb, px * ra, px * 0.5 * rb);
          ctx.fillRect(sx + px * 0.3 * rb, sy - px * 0.12, px * 0.4 * ra, px * 0.26);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

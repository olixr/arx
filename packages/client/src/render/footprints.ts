/**
 * THE TRACKED GROUND — footprints stamped where feet leave the earth.
 *
 * Every print is an HONEST record: it is stamped at the exact world
 * position a planted foot occupied at the moment it lifted (the leg
 * rig's lift ring — legs.ts), never dead-reckoned from the body. A
 * standing shuffle leaves a tight cluster; a sprint leaves a long
 * alternating ladder; a mounted courser leaves hoof pairs; a basilisk
 * leaves six-track claw rows. Tracking a fleeing body across dirt,
 * sand, or snow is real gameplay — the trail IS the data.
 *
 * Design laws:
 * - THE GROUND DECIDES THE INK. A print only exists on materials that
 *   take one (dirt, path, tilled soil, sand, snow); each carries its
 *   own two-tone ink — a pressed dark floor plus a displaced-material
 *   crest offset AWAY from the world's one sun (a depression's lit
 *   wall faces the sun; the terrain sun-law's mirror). Grass, stone,
 *   wood, and wet ground swallow the mark — extend PRINT_INKS to
 *   teach a new material, nothing else.
 * - THE PRINT SPEAKS THE STYLE. People leave ABSTRACT marks — a
 *   single chamfered scuff chip per step (boot a faceted tread chip,
 *   bare a softer smaller chip): the alternating rhythm of the trail
 *   says "footsteps", never a literal sole (user law 2026-08-17 —
 *   literal boot anatomy read too real for the flat vector style).
 *   Beasts keep their iconic marks (cloven hoof, paw pad + beans,
 *   bird-claw trident, claw fans, crab spike) — those are already
 *   game iconography, mirrored left/right by the leg's lateral sign
 *   and scaled ~1:1 with the body. Fine marks (toes, claws) join
 *   only when the print is large enough on screen to earn them.
 * - THE PLANE LAW. Prints lie flat on the ground: rotated in world
 *   space, squashed by the same ground-perspective constant every
 *   combat-fx circle uses, lifted by terrain elevation — and painted
 *   in the ground-decal stratum (under every body, over the turf), so
 *   the whole-frame lightmap tints them with the soil they sit in.
 * - THE BUDGET BREATHES. A fixed ring pool (cap) recycles oldest-first;
 *   above the soft cap the OLDEST prints get their remaining life
 *   compressed to a fast fade — a stampede clears its own clutter in
 *   ~a second while fresh tracks stay crisp. Base life ~1 minute so a
 *   quarry's trail survives long enough to follow. One kill switch
 *   (FOOTPRINT_TUNE.enabled) empties the field instantly.
 */

import { ART_SUN_X, ART_SUN_Y, Tile } from '@arx/shared';
import { SOIL_TILES } from './terrain.js';

/** All the feet the world walks on: the beast rig's foot words plus
 *  the humanoid pair (booted / bare). */
export type FootWord =
  | 'boot'
  | 'bare'
  | 'hoof'
  | 'paw'
  | 'bearpaw'
  | 'claw'
  | 'turtleclaw'
  | 'crabspike'
  | 'lizardclaw';

/** The knobs. Live-tunable; `enabled = false` also clears the field. */
export const FOOTPRINT_TUNE = {
  enabled: true,
  /** Hard pool size — the ring recycles oldest-first past this. */
  cap: 240,
  /** Above this many live prints, the oldest fast-fade (pressure). */
  softCap: 170,
  /** Base life in ms (per-material lifeMult scales it). */
  lifeMs: 62_000,
  /** The quiet end-of-life fade window. */
  fadeMs: 9_000,
  /** Fade window forced onto over-budget prints — clutter clears fast. */
  pressureFadeMs: 1_400,
  /** Global print-size dial (1 = true to the foot). */
  sizeMult: 1,
  /** Global ink-strength dial. */
  alphaMult: 1,
};

// The paint sun (the terrain sun-law) — crests sit opposite. Named
// ONCE in shared (ART_SUN_X/ART_SUN_Y, daylight.ts): lighting v4 law #5.

export interface PrintInk {
  /** The pressed floor of the print. */
  press: string;
  /** Displaced-material crest ringing it (null = press only). */
  rim: string | null;
  /** Press alpha at full strength. */
  a: number;
  rimA: number;
  /** Material memory: snow holds a track, wind takes sand sooner. */
  lifeMult: number;
}

const INK_EARTH: PrintInk = { press: '#3a2c1d', rim: '#c3b291', a: 0.38, rimA: 0.14, lifeMult: 1 };
const INK_PATH: PrintInk = { press: '#3a2c1d', rim: null, a: 0.26, rimA: 0, lifeMult: 0.8 };
const INK_SAND: PrintInk = { press: '#7c6a44', rim: '#efe3bd', a: 0.46, rimA: 0.46, lifeMult: 0.85 };
const INK_SNOW: PrintInk = { press: '#7c90bc', rim: '#f7fafe', a: 0.62, rimA: 0.8, lifeMult: 1.25 };

/**
 * What a lifted foot leaves on each ground. Null = the material takes
 * no print (turf springs back, stone doesn't yield, water closes).
 * New materials join here and nowhere else.
 */
export function printInkFor(tile: number | undefined): PrintInk | null {
  switch (tile) {
    case Tile.Dirt:
      return INK_EARTH;
    case Tile.Path:
      // Packed roadway — takes only a faint scuff, no crest.
      return INK_PATH;
    case Tile.Sand:
      return INK_SAND;
    case Tile.Snow:
      return INK_SNOW;
    default:
      // Worked soil: tilled beds and every crop stage print like dirt.
      if (tile !== undefined && SOIL_TILES.has(tile)) return INK_EARTH;
      return null;
  }
}

/** Small diamond helper for toe/claw marks. */
function dia(cx: number, cy: number, r: number, squish = 0.8): number[] {
  return [cx + r, cy, cx, cy - r * squish, cx - r, cy, cx, cy + r * squish];
}

/** Rotate a poly about the origin (builds the fanned digit shapes). */
function rot(poly: number[], ang: number): number[] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const out: number[] = [];
  for (let i = 0; i < poly.length; i += 2) {
    const x = poly[i]!;
    const y = poly[i + 1]!;
    out.push(x * c - y * s, x * s + y * c);
  }
  return out;
}

export interface PrintShape {
  /** Filled polys in the foot frame: +x toe-ward, ±y lateral, unit =
   *  one foot length (heel −0.5 → toe +0.5). */
  polys: number[][];
  /** Fine marks (toes, claws) — only when the print earns the pixels. */
  fine?: number[][];
  /** Foot length in tiles at body scale 1 — the 1:1 ruler. */
  len: number;
}

/** A slim forward digit (bird toes, lizard claws): tip at `tip`. */
function digit(tip: number, root: number, w: number): number[] {
  const mid = root + (tip - root) * 0.45;
  return [tip, 0, mid, -w, root, 0, mid, w];
}

export const PRINT_SHAPES: Record<FootWord, PrintShape> = {
  // THE SCUFF CHIP: one chamfered tread lozenge, faintly tapered
  // toward the toe so the trail still tells its direction — the
  // abstraction law above; no sole, no heel, no anatomy.
  boot: {
    len: 0.2,
    polys: [
      [0.5, -0.09, 0.36, -0.16, -0.26, -0.15, -0.5, -0.07, -0.5, 0.07, -0.26, 0.15, 0.36, 0.16, 0.5, 0.09],
    ],
  },
  // The bare step: the same abstract chip, smaller and softer.
  bare: {
    len: 0.18,
    polys: [
      [0.42, -0.07, 0.24, -0.13, -0.24, -0.12, -0.44, -0.06, -0.44, 0.06, -0.24, 0.12, 0.24, 0.13, 0.42, 0.07],
    ],
  },
  // Two lobes, cleft down the middle — the cloven read.
  hoof: {
    len: 0.17,
    polys: [
      [0.42, -0.04, 0.34, -0.2, 0.02, -0.24, -0.32, -0.16, -0.36, -0.05, -0.36, -0.04],
      [0.42, 0.04, 0.34, 0.2, 0.02, 0.24, -0.32, 0.16, -0.36, 0.05, -0.36, 0.04],
    ],
  },
  // Rear-weighted pad, four toe beans ahead.
  paw: {
    len: 0.145,
    polys: [[0.1, -0.16, -0.1, -0.2, -0.26, -0.1, -0.26, 0.1, -0.1, 0.2, 0.1, 0.16]],
    fine: [dia(0.3, -0.26, 0.09), dia(0.38, -0.09, 0.09), dia(0.38, 0.09, 0.09), dia(0.3, 0.26, 0.09)],
  },
  // The broad plantigrade pad; five toes, claw pricks past them.
  bearpaw: {
    len: 0.27,
    polys: [[0.14, -0.24, -0.1, -0.3, -0.3, -0.16, -0.3, 0.16, -0.1, 0.3, 0.14, 0.24]],
    fine: [
      dia(0.3, -0.3, 0.08),
      dia(0.36, -0.15, 0.08),
      dia(0.38, 0, 0.08),
      dia(0.36, 0.15, 0.08),
      dia(0.3, 0.3, 0.08),
      [0.46, -0.3, 0.38, -0.33, 0.38, -0.27],
      [0.52, -0.15, 0.44, -0.18, 0.44, -0.12],
      [0.54, 0, 0.46, -0.03, 0.46, 0.03],
      [0.52, 0.15, 0.44, 0.12, 0.44, 0.18],
      [0.46, 0.3, 0.38, 0.27, 0.38, 0.33],
    ],
  },
  // Three splayed toes and a rear spur — the whole mark IS the digits.
  claw: {
    len: 0.17,
    polys: [
      digit(0.52, -0.06, 0.05),
      rot(digit(0.48, -0.04, 0.045), -0.62),
      rot(digit(0.48, -0.04, 0.045), 0.62),
      rot(digit(0.34, -0.02, 0.04), Math.PI),
    ],
  },
  // Domed pad with three stubby wedges — the dragging swimmer's foot.
  turtleclaw: {
    len: 0.2,
    polys: [[0.06, -0.2, -0.16, -0.24, -0.3, -0.12, -0.3, 0.12, -0.16, 0.24, 0.06, 0.2]],
    fine: [
      [0.3, -0.2, 0.14, -0.26, 0.14, -0.14],
      [0.36, 0, 0.18, -0.06, 0.18, 0.06],
      [0.3, 0.2, 0.14, 0.14, 0.14, 0.26],
    ],
  },
  // A single point taking the weight — the stilt-walker's dimple.
  crabspike: {
    len: 0.1,
    polys: [dia(0, 0, 0.2, 0.75)],
  },
  // Sprawled pad, three long fanned claws — the six-track signature.
  lizardclaw: {
    len: 0.22,
    polys: [[0.04, -0.18, -0.18, -0.22, -0.32, -0.1, -0.32, 0.1, -0.18, 0.22, 0.04, 0.18]],
    fine: [
      rot(digit(0.5, 0.06, 0.05), -0.5),
      digit(0.54, 0.08, 0.055),
      rot(digit(0.5, 0.06, 0.05), 0.5),
    ],
  },
};

/** Structural slice of Camera — keeps this module renderer-agnostic. */
export interface PrintCamera {
  scale: number;
  worldToScreenInto(
    wx: number,
    wy: number,
    w: number,
    h: number,
    out: { x: number; y: number },
  ): { x: number; y: number };
}

interface PrintSlot {
  x: number;
  y: number;
  dir: number;
  side: number;
  word: FootWord;
  sizeK: number;
  /** Press strength for this print (sneak treads light, vigor treads deep). */
  press: number;
  ink: PrintInk;
  bornAt: number;
  dieAt: number;
  fadeMs: number;
  seed: number;
}

/** Deterministic per-print jitter — render randomness is banned. */
function hash01(seed: number): number {
  let h = (seed * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = (h * 2246822519) >>> 0;
  return ((h >>> 8) & 0xffff) / 0x10000;
}

export class FootprintField {
  private readonly slots: PrintSlot[];
  /** Monotonic ring cursors: slot i lives at slots[i % cap]. Ring
   *  order IS age order — stamps only ever append. */
  private head = 0;
  private tail = 0;
  /** Lazily-built Path2D per foot word (browser only; tests run node). */
  private paths: Partial<Record<FootWord, { body: Path2D; fine: Path2D | null }>> = {};
  private readonly scratch = { x: 0, y: 0 };

  constructor(private readonly cap = FOOTPRINT_TUNE.cap) {
    this.slots = Array.from({ length: cap }, () => ({
      x: 0,
      y: 0,
      dir: 0,
      side: 1,
      word: 'boot' as FootWord,
      sizeK: 1,
      press: 1,
      ink: INK_EARTH,
      bornAt: 0,
      dieAt: 0,
      fadeMs: FOOTPRINT_TUNE.fadeMs,
      seed: 0,
    }));
  }

  get liveCount(): number {
    return this.head - this.tail;
  }

  clear(): void {
    this.tail = this.head;
  }

  stamp(
    x: number,
    y: number,
    dir: number,
    side: number,
    speed: number,
    word: FootWord,
    sizeK: number,
    ink: PrintInk,
    now: number,
    faint = 1,
  ): void {
    if (!FOOTPRINT_TUNE.enabled) return;
    const s = this.slots[this.head % this.cap]!;
    s.x = x;
    s.y = y;
    s.dir = dir;
    s.side = side >= 0 ? 1 : -1;
    s.word = word;
    s.sizeK = sizeK;
    // A striding foot presses its full weight; a standing shuffle
    // barely marks. Sneaking feet roll heel-to-toe — fainter still.
    s.press = faint * (0.7 + 0.3 * Math.min(1, speed / 3.5));
    s.ink = ink;
    s.bornAt = now;
    s.dieAt = now + FOOTPRINT_TUNE.lifeMs * ink.lifeMult;
    s.fadeMs = FOOTPRINT_TUNE.fadeMs;
    s.seed = this.head + 1;
    this.head++;
    if (this.head - this.tail > this.cap) this.tail = this.head - this.cap;
  }

  /**
   * Advance the ring past the dead, then apply budget pressure: every
   * live print beyond the soft cap compresses the OLDEST prints'
   * remaining life into the fast-fade window. dieAt only ever moves
   * earlier — pressure never resurrects.
   */
  tick(now: number): void {
    const { softCap, pressureFadeMs } = FOOTPRINT_TUNE;
    while (this.tail < this.head) {
      const s = this.slots[this.tail % this.cap]!;
      if (now <= s.dieAt) break;
      this.tail++;
    }
    const over = this.head - this.tail - softCap;
    for (let i = 0; i < over; i++) {
      const s = this.slots[(this.tail + i) % this.cap]!;
      const cut = now + pressureFadeMs;
      if (s.dieAt > cut) {
        s.dieAt = cut;
        s.fadeMs = pressureFadeMs;
      }
    }
  }

  private pathsFor(word: FootWord): { body: Path2D; fine: Path2D | null } {
    let p = this.paths[word];
    if (!p) {
      const shape = PRINT_SHAPES[word];
      const build = (polys: number[][]): Path2D => {
        const path = new Path2D();
        for (const poly of polys) {
          path.moveTo(poly[0]!, poly[1]!);
          for (let i = 2; i < poly.length; i += 2) path.lineTo(poly[i]!, poly[i + 1]!);
          path.closePath();
        }
        return path;
      };
      p = { body: build(shape.polys), fine: shape.fine ? build(shape.fine) : null };
      this.paths[word] = p;
    }
    return p;
  }

  /**
   * Paint the field. Called in the ground-decal stratum — after the
   * turf, before the y-sorted world — so bodies stand on their own
   * trail and the frame's lightmap tints every print with its soil.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    cam: PrintCamera,
    w: number,
    h: number,
    lift: (x: number, y: number) => number,
    now: number,
    squash: number,
  ): void {
    if (!FOOTPRINT_TUNE.enabled) {
      this.clear();
      return;
    }
    this.tick(now);
    if (this.head === this.tail) return;
    const sc = cam.scale;
    const pad = 48;
    const alphaMult = FOOTPRINT_TUNE.alphaMult;
    for (let i = this.tail; i < this.head; i++) {
      const s = this.slots[i % this.cap]!;
      const left = s.dieAt - now;
      if (left <= 0) continue;
      const p = cam.worldToScreenInto(s.x, s.y, w, h, this.scratch);
      const py = p.y - lift(s.x, s.y) * sc;
      if (p.x < -pad || p.x > w + pad || py < -pad || py > h + pad) continue;
      const shape = PRINT_SHAPES[s.word];
      const jSize = 1 + (hash01(s.seed * 3 + 1) - 0.5) * 0.12;
      const flPx = shape.len * s.sizeK * FOOTPRINT_TUNE.sizeMult * jSize * sc;
      if (flPx < 1.4) continue;
      // Fresh prints settle in over a beat; old prints ease out.
      const aIn = Math.min(1, (now - s.bornAt) / 180);
      const k = Math.min(1, left / s.fadeMs);
      const fade = aIn * k * (2 - k) * s.press * alphaMult;
      if (fade < 0.02) continue;
      const rotA = s.dir + (hash01(s.seed) - 0.5) * 0.12;
      const paths = this.pathsFor(s.word);
      const fine = flPx > 7 ? paths.fine : null;
      // The crest first: displaced material ringing the press, shifted
      // away from the sun so the depression's lit wall reads.
      if (s.ink.rim && s.ink.rimA * fade > 0.02) {
        const off = shape.len * s.sizeK * 0.09 * sc;
        ctx.save();
        ctx.translate(p.x - ART_SUN_X * off, py - ART_SUN_Y * off * squash);
        ctx.scale(1, squash);
        ctx.rotate(rotA);
        ctx.scale(flPx * 1.16, flPx * 1.16 * s.side);
        ctx.globalAlpha = s.ink.rimA * fade;
        ctx.fillStyle = s.ink.rim;
        ctx.fill(paths.body);
        if (fine) ctx.fill(fine);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(p.x, py);
      ctx.scale(1, squash);
      ctx.rotate(rotA);
      ctx.scale(flPx, flPx * s.side);
      ctx.globalAlpha = s.ink.a * fade;
      ctx.fillStyle = s.ink.press;
      ctx.fill(paths.body);
      if (fine) ctx.fill(fine);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

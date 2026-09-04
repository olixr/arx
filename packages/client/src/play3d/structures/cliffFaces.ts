/**
 * THE SHELF WEARS ITS FACE (play3d W2, TERRAIN-FORMS lane) — real cliff
 * art for the heightfield's step faces.
 *
 * heightfield.ts already emits every vertical step (THE HIGH TILE OWNS
 * THE FACE) wearing a stretched rect of the plateau's own bake. This
 * module reads THE SAME faces back (`collectStepFaces`), merges them
 * into straight runs, and lays a painted cliff curtain over each one
 * from a face atlas — the 2D `cliffFaceItem` coursing law re-emitted
 * (cliffArt.ts:466-880), not called: that painter and its run bakes
 * are welded to the Renderer's sprite lanes and memo.
 *
 * Laws:
 *  - THE CURTAIN HANGS A HAIR PROUD. The atlas face cannot retexture
 *    the ground mesh (one material per chunk, ground.ts's), so it
 *    stands in front of the placeholder: the crown edge is pushed
 *    CLIFF_EPS_TOP outward (tight to the brink, no sliver seen from
 *    above), the foot CLIFF_EPS_BOT — a lean of ~1.3° that keeps every
 *    pixel of the placeholder strictly behind it. Exposed run ends
 *    extend by the foot eps so two curtains meeting at a convex corner
 *    overlap instead of leaving a notch; a continuing end never
 *    extends (coplanar overlap would z-fight).
 *  - THE STRIP IS PERIODIC. One atlas tile spans CLIFF_PERIOD world
 *    tiles and every mark inside it is a function of world x modulo
 *    the period (lattice noise wraps), so a run of any length samples
 *    `u = frac(x / period)` and beds, joints and tufts continue
 *    unbroken across tile seams and around the 4-tile boundary. Bed
 *    heights are variant-INDEPENDENT (continuity across strips);
 *    blocks, cracks, noses and tufts are salted by a per-strip
 *    variant so a long wall does not repeat every four tiles.
 *  - COURSES STACK. A drop of N levels is one face N·ELEV_H tall
 *    painted as N stacked courses, each with its own beds, undercut
 *    and foot AO (the 2D draws one face per level); the turf spill
 *    and hanging tufts belong to the TOP course only, and the scree
 *    to the lowest.
 *  - THE BROW IS SAMPLED, not guessed: the owning tile's ground,
 *    stepping inward past up to two Cliff rim tiles (cliffArt.ts:
 *    496-504) — Grass/GrassTall = turf, anything else = bare rock.
 *  - Sloped skirts (a Ramp's exposed side) are the same face with per-
 *    corner v; they wear bare rock.
 *  - Tones are the 2D's, lifted a stop (faceTone.litTone).
 *
 * Pure parts (run merging, strip maths, brow) carry no DOM and are
 * tested; `paintCliffStrip` is the only painter.
 */
import { Tile, hashCoords } from '@arx/shared';
import { stone01 } from '../../render/paintVocab.js';
import { shade } from '../../render/tint.js';
import type { StepFace, StepSide } from '../heightfield.js';
import { FACE_PX } from './faceAtlas.js';
import { litTone } from './faceTone.js';
import type { StructSampler } from './structKinds.js';

/** World tiles one atlas strip spans; every mark wraps at this period. */
export const CLIFF_PERIOD = 4;
/** Strip variants per (levels, brow) — beds agree, details differ. */
export const CLIFF_VARIANTS = 3;
/** Outward push of the curtain's crown edge (tiles). */
export const CLIFF_EPS_TOP = 0.006;
/** Outward push of the curtain's foot edge (tiles), and the end extension. */
export const CLIFF_EPS_BOT = 0.03;

export type BrowKind = 'turf' | 'bare';

/** A straight run of merged step faces on one tile edge line. */
export interface CliffRun {
  side: StepSide;
  levels: number;
  /** The world coordinate ACROSS the run (z for N/S faces, x for E/W). */
  cross: number;
  /** Run extent ALONG the edge line, in the run's world coordinate (x for N/S, z for E/W). */
  a: number;
  b: number;
  /** Which strip (floor(a / CLIFF_PERIOD)) the run samples. */
  strip: number;
  yTopA: number;
  yTopB: number;
  yBotA: number;
  yBotB: number;
  nx: number;
  nz: number;
  brow: BrowKind;
  /** True when a face of the same side continues past that end (no extension). */
  contA: boolean;
  contB: boolean;
  /** The first member's tile (for hashing and tests). */
  tx: number;
  ty: number;
}

/** The world coordinate along a face's a→b edge at its `a` end. */
export function runCoord(f: StepFace): number {
  return f.side === 'N' || f.side === 'S' ? f.ax : f.az;
}

/** The world coordinate across a face's edge line (the line itself). */
export function crossCoord(f: StepFace): number {
  return f.side === 'N' || f.side === 'S' ? f.az : f.ax;
}

/** Strip index of a world coordinate along a run. */
export function stripOf(coord: number): number {
  return Math.floor(coord / CLIFF_PERIOD);
}

/** Position within the strip, 0..1 (negative coordinates wrap honestly). */
export function stripU(coord: number): number {
  const m = ((coord % CLIFF_PERIOD) + CLIFF_PERIOD) % CLIFF_PERIOD;
  return m / CLIFF_PERIOD;
}

/** The strip variant a run wears: keyed on strip + edge line + levels, stable across rebuilds. */
export function cliffVariant(strip: number, cross: number, levels: number): number {
  return hashCoords(211 + levels, strip, cross) % CLIFF_VARIANTS;
}

/** Atlas key for a strip. */
export function cliffKey(levels: number, brow: BrowKind, variant: number): string {
  return `cliff/${levels}/${brow}/${variant}`;
}

/**
 * THE BROW IS SAMPLED: the owning (high) tile's ground, stepping
 * inward (against the normal) past up to two Cliff rim tiles.
 */
export function browOf(s: StructSampler, f: StepFace): BrowKind {
  let tx = f.tx;
  let ty = f.ty;
  for (let back = 0; back < 2 && s.groundAt(tx, ty) === Tile.Cliff; back++) {
    tx -= f.nx;
    ty -= f.nz;
  }
  const t = s.groundAt(tx, ty);
  return t === Tile.Grass || t === Tile.GrassTall ? 'turf' : 'bare';
}

function flat(f: StepFace): boolean {
  return f.yTopA === f.yTopB && f.yBotA === f.yBotB;
}

/**
 * Merge the chunk's step faces into straight runs: consecutive faces
 * on the same edge line with the same levels, brow and flat heights
 * fuse, never across a strip boundary (a run samples one atlas
 * strip). Sloped skirts stay single. Every run also learns whether a
 * face of its side continues past each end, whatever its heights.
 */
export function mergeStepFaces(faces: ReadonlyArray<StepFace>, browAt: (f: StepFace) => BrowKind): CliffRun[] {
  const byLine = new Map<string, StepFace[]>();
  const present = new Set<string>();
  for (const f of faces) {
    const line = `${f.side}|${crossCoord(f)}`;
    let list = byLine.get(line);
    if (!list) byLine.set(line, (list = []));
    list.push(f);
    present.add(`${line}|${runCoord(f)}`);
  }
  const out: CliffRun[] = [];
  for (const [line, list] of byLine) {
    list.sort((p, q) => runCoord(p) - runCoord(q));
    let cur: CliffRun | null = null;
    let curBrowFace: StepFace | null = null;
    for (const f of list) {
      const a = runCoord(f);
      const brow = browAt(f);
      const canJoin =
        cur !== null &&
        curBrowFace !== null &&
        cur.b === a &&
        cur.levels === f.levels &&
        cur.brow === brow &&
        flat(f) &&
        flat(curBrowFace) &&
        cur.yTopA === f.yTopA &&
        cur.yBotA === f.yBotA &&
        stripOf(a) === cur.strip;
      if (canJoin && cur) {
        cur.b = a + 1;
        cur.contB = present.has(`${line}|${cur.b}`);
        continue;
      }
      if (cur) out.push(cur);
      cur = {
        side: f.side,
        levels: f.levels,
        cross: crossCoord(f),
        a,
        b: a + 1,
        strip: stripOf(a),
        yTopA: f.yTopA,
        yTopB: f.yTopB,
        yBotA: f.yBotA,
        yBotB: f.yBotB,
        nx: f.nx,
        nz: f.nz,
        brow,
        contA: present.has(`${line}|${a - 1}`),
        contB: present.has(`${line}|${a + 1}`),
        tx: f.tx,
        ty: f.ty,
      };
      curBrowFace = f;
    }
    if (cur) out.push(cur);
  }
  return out;
}

// ------------------------------------------------------------ painter

export interface CliffStripSpec {
  levels: number;
  brow: BrowKind;
  variant: number;
  /** One level's rise in tiles (ELEV_H). */
  levelH: number;
}

/** Pixel size of a strip tile: CLIFF_PERIOD tiles wide, levels·levelH tall. */
export function cliffStripSize(levels: number, levelH: number, s = FACE_PX): { w: number; h: number } {
  return { w: Math.round(CLIFF_PERIOD * s), h: Math.round(levels * levelH * s) };
}

/**
 * Paint one strip, crown at y = 0, base at y = h, world x 0..PERIOD
 * across the width. The 2D face law re-emitted with a periodic
 * lattice; see the header.
 */
export function paintCliffStrip(ctx: CanvasRenderingContext2D, w: number, h: number, spec: CliffStripSpec): void {
  const { levels, brow, variant } = spec;
  const P = CLIFF_PERIOD;
  const s = w / P; // px per tile
  const Hl = h / levels; // px per course
  const turf = brow === 'turf';
  // Bed noise: fixed seed so every variant shares its bed heights.
  const nB = (a: number, sa: number): number => stone01(a, sa, 7);
  // Detail noise: per variant.
  const nV = (a: number, sa: number): number => stone01(a, sa, variant * 31 + 7);
  /** Periodic value noise over world x: `cells` lattice points per period. */
  const vnoise = (wx: number, salt: number, cells: number, n: (a: number, sa: number) => number): number => {
    const t = (wx / P) * cells;
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);
    const i0 = ((i % cells) + cells) % cells;
    const i1 = (i0 + 1) % cells;
    return n(i0, salt) * (1 - u) + n(i1, salt) * u;
  };
  const sx = (wx: number): number => wx * s;
  const bedBase = [
    0.24 + (nB(9001, 11) - 0.5) * 0.08,
    0.5 + (nB(9002, 11) - 0.5) * 0.08,
    0.76 + (nB(9003, 11) - 0.5) * 0.08,
  ];
  const bedAt = (wx: number, k: number): number => {
    const f = bedBase[k]! + (vnoise(wx, 40 + k * 3, 3, nB) - 0.5) * 0.24;
    return Math.min(0.94, Math.max(0.1, f));
  };
  const browAt = (wx: number): number => 0.045 + vnoise(wx, 20, 6, nB) * 0.05;
  const steps = P * 4;
  const accent = Math.floor(nB(9010, 13) * 3);
  const ledgeBed = Math.floor(nB(9011, 13) * 3);
  const rockTop = litTone('#746c80');
  const rockMid = litTone('#5e5669');
  const rockBot = litTone('#453e51');

  for (let course = 0; course < levels; course++) {
    const yTop = course * Hl;
    const yBase = (course + 1) * Hl;
    const yAt = (frac: number): number => yTop + (yBase - yTop) * frac;
    const h2 = hashCoords(53 + levels, variant * 7 + course, 977);
    // Rock body: vertical gradient, lit near the brink.
    const grad = ctx.createLinearGradient(0, yTop, 0, yBase);
    grad.addColorStop(0, rockTop);
    grad.addColorStop(0.45, rockMid);
    grad.addColorStop(1, rockBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, yTop, w, yBase - yTop + 0.5);
    // Macro forms: a slow full-height light/dark drift per half tile.
    for (let wx0 = 0; wx0 < P; wx0 += 0.5) {
      const v = vnoise(wx0 + 0.25, 6, 2, nV) - 0.5;
      if (Math.abs(v) < 0.1) continue;
      ctx.fillStyle = v > 0 ? `rgba(236, 232, 240, ${Math.min(0.1, v * 0.26)})` : `rgba(26, 20, 36, ${Math.min(0.12, -v * 0.3)})`;
      ctx.fillRect(sx(wx0), yTop, s * 0.5 + 0.5, yBase - yTop + 0.5);
    }
    // Bedded strata: three breathing seams, drawn DASHED (a bedding
    // plane surfaces and buries itself; an unbroken line is mortar).
    const bedPath = (frac: (wx: number) => number, lift2: number, gateSalt: number): void => {
      ctx.beginPath();
      for (let k2 = 0; k2 < steps; k2++) {
        const x0 = (k2 / steps) * P;
        const x1 = ((k2 + 1) / steps) * P;
        if (gateSalt >= 0 && vnoise((x0 + x1) / 2, gateSalt, 4, nB) < 0.28) continue;
        ctx.moveTo(sx(x0), yAt(frac(x0)) + lift2);
        ctx.lineTo(sx(x1), yAt(frac(x1)) + lift2);
      }
      ctx.stroke();
    };
    for (let k = 0; k < 3; k++) {
      const wj = (wx: number): number => bedAt(wx, k);
      if (k === accent) {
        ctx.strokeStyle = 'rgba(196, 150, 96, 0.14)';
        ctx.lineWidth = Math.max(2, s * 0.07);
        bedPath(wj, 0, -1);
      }
      if (k === accent || k === ledgeBed) {
        ctx.strokeStyle = 'rgba(236, 232, 240, 0.09)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        bedPath(wj, -Math.max(1.5, s * 0.045), 50 + k);
      }
      ctx.strokeStyle = 'rgba(30, 23, 42, 0.32)';
      ctx.lineWidth = Math.max(1.5, s * 0.042);
      bedPath(wj, 0, 50 + k);
    }
    // Jointing: each bed band breaks into its own rhythm of blocks —
    // block widths divide the period so the strip tiles seamlessly.
    const widths = [0.8, 1, P / 3];
    for (let band = 0; band < 4; band++) {
      const topF = (wx: number): number => (band === 0 ? browAt(wx) : bedAt(wx, band - 1));
      const botF = (wx: number): number => (band === 3 ? 0.975 : bedAt(wx, band));
      const bw = widths[Math.floor(nV(60 + band, 17) * widths.length) % widths.length]!;
      const count = Math.round(P / bw);
      const off = Math.floor(nV(70 + band, 19) * 100) / 100 * bw;
      for (let m = -1; m <= count; m++) {
        const jx0 = off + m * bw;
        const x0 = Math.max(0, jx0);
        const x1 = Math.min(P, jx0 + bw);
        if (x1 - x0 < 0.03) continue;
        const mm = ((m % count) + count) % count;
        const v = nV(mm, 80 + band);
        if (v < 0.3 || v > 0.7) {
          ctx.fillStyle =
            v > 0.62
              ? nV(mm, 99 + band) > 0.6
                ? `rgba(224, 200, 164, ${0.05 + (v - 0.7) * 0.2})`
                : `rgba(236, 232, 240, ${0.04 + (v - 0.7) * 0.22})`
              : `rgba(26, 20, 36, ${0.04 + (0.3 - v) * 0.26})`;
          const xm = (x0 + x1) / 2;
          ctx.beginPath();
          ctx.moveTo(sx(x0), yAt(topF(x0)));
          ctx.lineTo(sx(xm), yAt(topF(xm)));
          ctx.lineTo(sx(x1), yAt(topF(x1)));
          ctx.lineTo(sx(x1), yAt(botF(x1)));
          ctx.lineTo(sx(xm), yAt(botF(xm)));
          ctx.lineTo(sx(x0), yAt(botF(x0)));
          ctx.closePath();
          ctx.fill();
        }
        // Fractures, not mortar: some block edges carry a leaning joint.
        if (jx0 > 0.02 && jx0 < P - 0.02 && nV(mm, 95 + band) > 0.62) {
          const lean = (nV(mm, 90 + band) - 0.5) * s * 0.09;
          const ext = nV(mm, 97 + band);
          const t0 = topF(jx0) + 0.015 + (ext < 0.33 ? (botF(jx0) - topF(jx0)) * 0.35 : 0);
          const b0 = botF(jx0) - 0.015 - (ext > 0.66 ? (botF(jx0) - topF(jx0)) * 0.35 : 0);
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.22)';
          ctx.lineWidth = Math.max(1, s * 0.028);
          ctx.beginPath();
          ctx.moveTo(sx(jx0), yAt(t0));
          ctx.lineTo(sx(jx0) + lean, yAt(b0));
          ctx.stroke();
        }
      }
    }
    // A long crack with a jog across a bed — the mark masonry never makes.
    for (let seg = 0; seg < P; seg++) {
      const hc = hashCoords(59 + levels, variant * 7 + course, seg);
      if (hc % 7 >= 3) continue;
      const kBed = (hc >> 3) % 2;
      const wxC = seg + 0.25 + ((hc >> 6) % 50) / 100;
      const jog = s * (0.05 + ((hc >> 10) % 7) / 130) * ((hc >> 4) % 2 === 0 ? 1 : -1);
      ctx.strokeStyle = 'rgba(22, 16, 32, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(sx(wxC), yAt(bedAt(wxC, kBed) - 0.16));
      ctx.lineTo(sx(wxC) + jog * 0.4, yAt(bedAt(wxC, kBed)));
      ctx.lineTo(sx(wxC) + jog, yAt(bedAt(wxC, kBed) + 0.19));
      ctx.stroke();
    }
    // A protruding nose on some tiles: one block shoulders out, sunlit
    // on top, pooling shadow beneath.
    for (let seg = 0; seg < P; seg++) {
      const hn = hashCoords(61 + levels, variant * 7 + course, seg);
      if (hn % 5 >= 2) continue;
      const band = 1 + ((hn >> 4) % 3);
      const cW = 0.13 + ((hn >> 7) % 12) / 100;
      const cX = seg + 0.3 + ((hn >> 9) % 40) / 100;
      const x0 = Math.max(0, cX - cW);
      const x1 = Math.min(P, cX + cW);
      if (x1 - x0 <= 0.12) continue;
      const tF = (wx: number): number => bedAt(wx, band - 1);
      const bF = (wx: number): number => (band === 3 ? 0.96 : bedAt(wx, band));
      const xm = (x0 + x1) / 2;
      ctx.fillStyle = 'rgba(236, 232, 240, 0.09)';
      ctx.beginPath();
      ctx.moveTo(sx(x0), yAt(tF(x0)));
      ctx.lineTo(sx(x1), yAt(tF(x1)));
      ctx.lineTo(sx(x1), yAt(bF(x1)));
      ctx.lineTo(sx(x0), yAt(bF(x0)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 244, 214, 0.16)';
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(sx(x0), yAt(tF(x0)));
      ctx.lineTo(sx(xm), yAt(tF(xm)));
      ctx.lineTo(sx(x1), yAt(tF(x1)));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(sx(x0), yAt(bF(x0)));
      ctx.lineTo(sx(xm), yAt(bF(xm)));
      ctx.lineTo(sx(x1), yAt(bF(x1)));
      ctx.stroke();
    }
    // The brow: the dark undercut where the crown overhangs its face,
    // with a ragged lower edge. Every course wears the shelf shadow;
    // only the top course spills turf.
    ctx.fillStyle = 'rgba(26, 19, 36, 0.42)';
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(w, yTop);
    for (let k2 = steps; k2 >= 0; k2--) {
      const wx = (k2 / steps) * P;
      ctx.lineTo(sx(wx), yAt(browAt(wx)));
    }
    ctx.closePath();
    ctx.fill();
    if (turf && course === 0) {
      ctx.fillStyle = 'rgba(74, 108, 50, 0.62)';
      ctx.beginPath();
      ctx.moveTo(0, yTop);
      ctx.lineTo(w, yTop);
      for (let k2 = steps; k2 >= 0; k2--) {
        const wx = (k2 / steps) * P;
        ctx.lineTo(sx(wx), yAt(browAt(wx) * 0.45));
      }
      ctx.closePath();
      ctx.fill();
      // Hanging tufts where the sod overshoots the brink, lattice-keyed.
      const tw = Math.max(2.5, s * 0.075);
      ctx.fillStyle = 'rgba(66, 98, 46, 0.7)';
      const tuftN = Math.round(P / 0.45);
      for (let i2 = 0; i2 < tuftN; i2++) {
        if (nV(i2, 33) < 0.45) continue;
        const wxT = (i2 + 0.5) * (P / tuftN);
        const yT2 = yAt(browAt(wxT) * 0.45);
        const drop = s * (0.08 + nV(i2, 35) * 0.08);
        ctx.beginPath();
        ctx.moveTo(sx(wxT) - tw, yT2 - 1);
        ctx.lineTo(sx(wxT) + tw * 0.6, yT2 - 1);
        ctx.lineTo(sx(wxT) + (nV(i2, 37) - 0.5) * tw, yT2 + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
    // AO where the course meets its foot.
    ctx.strokeStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, yBase - Math.max(1, s * 0.02));
    ctx.lineTo(w, yBase - Math.max(1, s * 0.02));
    ctx.stroke();
    // Scree at the foot of the lowest course.
    if (course === levels - 1) {
      for (let seg = 0; seg < P; seg++) {
        if ((h2 >> seg) & 1) continue;
        for (let k = 0; k < 3; k++) {
          const hs = hashCoords(67 + k, variant * 7 + seg, levels);
          const f = seg + 0.14 + (hs % 70) / 100;
          const pw = s * (0.05 + ((hs >> 8) % 8) / 110);
          ctx.fillStyle = litTone(shade(k % 2 === 0 ? '#6a6375' : '#5b5468', 0));
          const px2 = sx(f);
          const py2 = yBase - pw * 0.6;
          ctx.beginPath();
          ctx.moveTo(px2 + pw * 0.3, py2);
          ctx.lineTo(px2 + pw * 0.7, py2);
          ctx.lineTo(px2 + pw, py2 + pw * 0.3);
          ctx.lineTo(px2 + pw, py2 + pw * 0.7);
          ctx.lineTo(px2, py2 + pw * 0.7);
          ctx.lineTo(px2, py2 + pw * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

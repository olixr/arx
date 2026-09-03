import test from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { packTile } from './interiors.js';
import { collectVolume } from './collectVolume.js';
import {
  HEDGE_VOL_H,
  paintHedgeCrown,
  paintHedgeFace,
  type FaceGeomLike,
  type TopPlaneGeomLike,
} from './barrierArt.js';
import type { PaintHost } from './paintHost.js';

/**
 * THE ONE RENDER — A4: the hedge-wall VOLUME reclassification, pinned.
 *
 * The dressing painters are pure over the face/crown geometry the
 * structureFace primitives hand them. These tests pin the two contracts
 * A4 relies on:
 *  1. A hedge run coalesces as ONE volume through `collectVolume` with a
 *     single hedge class, exactly as the wall run does — the seam-free
 *     shared-corner perimeter downstream depends on it.
 *  2. The crown dressing keys its pillow bed to the ABSOLUTE world
 *     half-tile grid, so two abutting runs agree tone-for-tone at the
 *     seam (no per-tile double-ink), and an L/tee loop keeps the plain
 *     crown (no overspilling UV) while a straight run gets the bed.
 */

/** A recording 2D-context stub — captures each fill()'s style and the
 *  path points laid since the last beginPath(). */
interface Filled {
  style: string;
  pts: Array<{ x: number; y: number }>;
}
function recCtx(): { ctx: CanvasRenderingContext2D; fills: Filled[]; clips: number } {
  const fills: Filled[] = [];
  const rec = { clips: 0 };
  let cur: Array<{ x: number; y: number }> = [];
  let style = '';
  const ctx = {
    set fillStyle(v: string) {
      style = v;
    },
    get fillStyle() {
      return style;
    },
    beginPath() {
      cur = [];
    },
    moveTo(x: number, y: number) {
      cur.push({ x, y });
    },
    lineTo(x: number, y: number) {
      cur.push({ x, y });
    },
    closePath() {},
    fill() {
      fills.push({ style, pts: cur.slice() });
    },
    save() {},
    restore() {},
    clip() {
      rec.clips++;
    },
  } as unknown as CanvasRenderingContext2D;
  return {
    ctx,
    fills,
    get clips() {
      return rec.clips;
    },
  };
}

/** A PaintHost stub carrying only the ctx the painters read. */
function host(ctx: CanvasRenderingContext2D): PaintHost {
  return { ctx } as unknown as PaintHost;
}

/** An axis-aligned (q=0-shaped) top plane over a world bbox, with a
 *  faceUV-style bilinear map — the shape topPlane emits at q=0. */
function rectPlane(wx0: number, wy0: number, wx1: number, wy1: number): TopPlaneGeomLike {
  const S = 40; // px per world tile
  const sx = (wx: number) => wx * S;
  const sy = (wy: number) => wy * S - HEDGE_VOL_H * S; // lifted crown
  const nw = { x: sx(wx0), y: sy(wy0) };
  const ne = { x: sx(wx1), y: sy(wy0) };
  const sw = { x: sx(wx0), y: sy(wy1) };
  const se = { x: sx(wx1), y: sy(wy1) };
  return {
    poly: [nw, ne, se, sw],
    uv: (u, v, out) => {
      const wx = nw.x + (ne.x - nw.x) * u;
      const topY = nw.y + (ne.y - nw.y) * u;
      const botY = sw.y + (se.y - sw.y) * u;
      const x = wx;
      const y = topY + (botY - topY) * v;
      if (out) {
        out.x = x;
        out.y = y;
        return out;
      }
      return { x, y };
    },
  };
}

const sample = (cells: Map<number, Tile>) => (tx: number, ty: number) =>
  Math.abs(tx) > 40 || Math.abs(ty) > 40 ? undefined : (cells.get(packTile(tx, ty)) ?? Tile.Grass);
const hedgeClass = (t: Tile) => (t === Tile.Hedge ? 0 : null);

test('a straight hedge run coalesces as one volume with a single rectangle loop', () => {
  const cells = new Map<number, Tile>();
  for (let x = 4; x <= 8; x++) cells.set(packTile(x, 6), Tile.Hedge);
  const v = collectVolume(sample(cells), 6, 6, hedgeClass, { heightAt: () => HEDGE_VOL_H });
  assert.ok(v);
  assert.equal(v!.count, 5);
  assert.deepEqual({ x0: v!.x0, y0: v!.y0, x1: v!.x1, y1: v!.y1 }, { x0: 4, y0: 6, x1: 8, y1: 6 });
  // One outer loop, interior seams dropped → the 4-corner rectangle.
  assert.equal(v!.perimeter.length, 1);
  assert.equal(v!.perimeter[0]!.length, 4);
  assert.equal(v!.heightAt(6, 6), HEDGE_VOL_H);
});

test('a hedge gate/diagonal is not a volume member (falls back to per-tile)', () => {
  const cells = new Map<number, Tile>();
  cells.set(packTile(4, 6), Tile.Hedge);
  cells.set(packTile(5, 6), Tile.HedgeGate);
  cells.set(packTile(6, 6), Tile.Hedge);
  const v = collectVolume(sample(cells), 4, 6, hedgeClass);
  assert.ok(v);
  // The run stops at the gate — only the west straight tile coalesces.
  assert.equal(v!.count, 1);
  assert.deepEqual({ x0: v!.x0, x1: v!.x1 }, { x0: 4, x1: 4 });
  // The gate itself is not a member of any hedge volume.
  assert.equal(collectVolume(sample(cells), 5, 6, hedgeClass), null);
});

test('paintHedgeFace hangs a green face plus two course bands', () => {
  const { ctx, fills } = recCtx();
  const seg: FaceGeomLike = { ax: 100, ay: 200, bx: 140, by: 200, yTopA: 175, yTopB: 175 };
  paintHedgeFace(host(ctx), seg);
  // faceFill + 2 faceBand = 3 filled trapezoids, all four-cornered.
  assert.equal(fills.length, 3);
  for (const f of fills) assert.equal(f.pts.length, 4);
  // The face fill spans the full lift (ground row 200 → crown 175).
  const ys = fills[0]!.pts.map((p) => p.y);
  assert.ok(Math.min(...ys) <= 175 + 1e-6 && Math.max(...ys) >= 200 - 1e-6);
});

test('paintHedgeCrown: a rectangular run beds the pillows with NO clip', () => {
  const rect = recCtx();
  paintHedgeCrown(host(rect.ctx), rectPlane(4, 6, 9, 7), 4, 6, 9, 7);
  // Base crown fill + many pillow quads (a 5×1 tile run → 10×2 half cells).
  assert.ok(rect.fills.length > 5);
  assert.equal(rect.fills[0]!.pts.length, 4); // the base crown poly
  assert.equal(rect.clips, 0); // a simple rect needs no mask
});

test('paintHedgeCrown: a non-rectangular border beds the pillows CLIPPED', () => {
  // A 5-corner L (a garden-border corner) still gets the pillow bed, but
  // clipped to the crown loop so no cell paints over the open interior.
  const lPlane: TopPlaneGeomLike = {
    poly: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 80 },
      { x: 40, y: 80 },
      { x: 40, y: 40 },
    ],
    uv: (u, v, out) => {
      const x = u * 80;
      const y = v * 80;
      if (out) {
        out.x = x;
        out.y = y;
        return out;
      }
      return { x, y };
    },
  };
  const lRec = recCtx();
  paintHedgeCrown(host(lRec.ctx), lPlane, 0, 0, 2, 2);
  assert.equal(lRec.fills[0]!.pts.length, 5); // base crown = the 5-corner loop
  assert.ok(lRec.fills.length > 1); // pillow bed painted too
  assert.equal(lRec.clips, 1); // clipped to the crown shape
});

test('the pillow bed is keyed to the ABSOLUTE world grid (abutting runs agree)', () => {
  // Two runs that overlap on world column-range [7..9): the tones painted
  // for the shared world cells must match, so a seam never double-inks.
  const a = recCtx();
  paintHedgeCrown(host(a.ctx), rectPlane(5, 6, 9, 7), 5, 6, 9, 7);
  const b = recCtx();
  paintHedgeCrown(host(b.ctx), rectPlane(7, 6, 11, 7), 7, 6, 11, 7);
  // Collect the base pillow tone per world half-cell center for each run
  // (the first fill after the base is a pillow; sample by center x).
  const toneByX = (rec: { fills: Filled[] }): Map<number, string> => {
    const m = new Map<number, string>();
    for (let i = 1; i < rec.fills.length; i++) {
      const f = rec.fills[i]!;
      if (f.pts.length !== 4) continue;
      const cx = Math.round((f.pts[0]!.x + f.pts[1]!.x) / 2);
      if (!m.has(cx)) m.set(cx, f.style); // first (base) tone at this column
    }
    return m;
  };
  const ma = toneByX(a);
  const mb = toneByX(b);
  let shared = 0;
  for (const [x, tone] of ma) {
    if (mb.has(x)) {
      shared++;
      assert.equal(mb.get(x), tone, `world column ${x} tone must agree across runs`);
    }
  }
  assert.ok(shared > 0, 'the two runs must share overlapping world columns');
});

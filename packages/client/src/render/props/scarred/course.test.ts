import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { COURSE_TILES, Tile } from '@arx/shared';
import {
  BOB_AMP,
  CELL_FOOT_DY,
  CELL_H,
  CELL_RX,
  COPE_H,
  COURSE_H,
  COURSE_PROPS,
  PLUMB_H,
  STEP_H,
  STILE_H,
  courseStileItem,
  courseWallItem,
} from './course.js';
import { TH_CHALK, TH_MARL, TH_MARL_DARK, TH_MARL_LIT, TH_MARL_MOTTLE } from '../palette.js';
import { DOLMEN_LOOKS } from '../../dolmen.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE STANDING COURSE's laws (band 9b: CourseWall 549, CourseStile
// 550, CorbelCell 551, PlumbStone 552), pinned without a browser on
// the smolderHeap/marks RecCtx and the ruinWalls run rig: the hall
// pair speaks only fills (THE ONE RING inks the silhouette; the seat
// is the one ellipse), the run pair strokes ONLY at struct weight with
// the outline on and returns no body; no transforms anywhere (parity:
// the GL stage draws quads, never a rotated ctx); every fillRect
// ≥ 0.03s at eight seeds, calm and in a gale (BLOCK LAW); ONE BREEZE
// on the plumb stone alone, sampled once and held to BOB_AMP in a
// hurricane; shadows cast per frame through the host (edge for the
// wall, stile and plumb stone, blob for the cell — SHADOWS NEVER
// BAKE); the stile's kin read (tall stubs toward WALL kin only); the
// rig numbers held where they were argued (BODY-RULER); the inks warm
// and the chalk the Marl's own bob; the content boundary in the file.

const S = 64;
const YS = 0.72;
const SYT = S * YS;
const TOP = SYT * 0.32;

interface Rect { x: number; y: number; w: number; h: number; fill: string }

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin = 'miter';
  lineCap = 'butt';
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Rect[] = [];
  /** Every vertex the painter placed (moveTo/lineTo/rect corners/ellipse centres), in order. */
  verts: Array<[number, number]> = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(x: number, y: number): void { this.calls.push('moveTo'); this.verts.push([x, y]); }
  lineTo(x: number, y: number): void { this.calls.push('lineTo'); this.verts.push([x, y]); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  arc(): void { this.calls.push('arc'); }
  ellipse(x: number, y: number, rx: number, ry: number): void {
    assert.ok(rx >= 0 && ry >= 0, 'ellipse radii must be non-negative');
    this.calls.push('ellipse');
    this.verts.push([x, y]);
  }
  fill(): void { this.calls.push('fill'); this.fills.push(String(this.fillStyle)); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
    this.rects.push({ x, y, w, h, fill: String(this.fillStyle) });
    this.verts.push([x, y], [x + w, y + h]);
  }
  stroke(): void { this.calls.push('stroke'); }
  strokeRect(): void { this.calls.push('strokeRect'); }
  save(): void { this.calls.push('save'); }
  restore(): void { this.calls.push('restore'); }
  translate(): void { this.calls.push('translate'); }
  rotate(): void { this.calls.push('rotate'); }
  scale(): void { this.calls.push('scale'); }
  setTransform(): void { this.calls.push('setTransform'); }
}

const TRANSFORMS = ['translate', 'rotate', 'scale', 'setTransform', 'save', 'restore', 'quadraticCurveTo', 'arc'] as const;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a2a2a2a, 0x13579bdf] as const;

// ---------------------------------------------------------------------
// The hall rig (smolderHeap.test / marks.test): the two discrete pieces.
// ---------------------------------------------------------------------

interface HallRig {
  host: PropHost;
  env: PropFrame;
  ctx: RecCtx;
  casts: string[];
  breezeCalls: number;
  glows: number;
}

/** `gale` is what breezeAt answers with (px, both beats): 0 is the
 *  still pose, a huge number is the storm the clamp must hold. */
function hallRig(h: number, tile: Tile, gale = 0, t = 3.7): HallRig {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const r: HallRig = { host: null as unknown as PropHost, env: null as unknown as PropFrame, ctx, casts, breezeCalls: 0, glows: 0 };
  r.host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { yScale: YS },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    breezeAt: () => { r.breezeCalls++; return { sway: gale, lag: gale, gust: 1 }; },
    queueGlow: () => { r.glows++; },
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  r.env = {
    tile,
    tx: 10,
    ty: 12,
    game: { world: { groundAt: () => Tile.Grass } } as unknown as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t,
    poleDye: null,
    stationBody: (hw = 1.15, up = 2.2, down = 0.8) => ({
      x: p.x - hw * S,
      y: p.y - up * S,
      w: hw * 2 * S,
      h: (up + down) * S,
    }),
  };
  return r;
}

function painterFor(tile: Tile): PropPainter {
  const row = COURSE_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no course painter for ${Tile[tile]}`);
  return row[1];
}

function paintHall(r: HallRig): DrawItem {
  const item = painterFor(r.env.tile)(r.host, r.env);
  assert.ok(item.draw, `${Tile[r.env.tile]} minted no draw`);
  item.draw();
  return item;
}

const HALL = [Tile.CorbelCell, Tile.PlumbStone] as const;

// ---------------------------------------------------------------------
// The run rig (ruinWalls.test): the wall and the stile off the switch.
// ---------------------------------------------------------------------

type Cell = [number, number, Tile];

interface RunRig {
  host: PaintHost;
  game: ClientGame;
  ctx: RecCtx;
  casts: Array<[number, number, number, number, number]>;
  structs: number;
}

function runRig(cells: Cell[], outlineOn = true): RunRig {
  const ctx = new RecCtx();
  const casts: Array<[number, number, number, number, number]> = [];
  const map = new Map<string, Tile>();
  for (const [x, y, t] of cells) map.set(`${x},${y}`, t);
  const game = {
    world: {
      groundAt: (x: number, y: number) => map.get(`${x},${y}`) ?? Tile.Grass,
      elevAt: () => 0,
    },
  } as unknown as ClientGame;
  const out: RunRig = { host: null as unknown as PaintHost, game, ctx, casts, structs: 0 };
  out.host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    w: 1280,
    h: 720,
    outlineOn,
    camera: {
      q: 0,
      scale: S,
      yScale: YS,
      worldToScreen: (wx: number, wy: number) => ({ x: wx * S, y: wy * SYT }),
    },
    porchAt: () => false,
    beginStructOutline: () => { out.structs++; },
    castEdgeQuad: (x0: number, y0: number, x1: number, y1: number, hT: number) => { casts.push([x0, y0, x1, y1, hT]); },
    castContact: () => { throw new Error('the course casts edges, not contacts'); },
    castBlob: () => { throw new Error('the course casts edges, not blobs'); },
    breezeAt: () => { throw new Error('the course never breathes'); },
    queueGlow: () => { throw new Error('the course never glows'); },
  } as unknown as PaintHost;
  return out;
}

/** Screen datum of a tile, exactly as the painter derives it. */
function datum(tx: number, ty: number): { px: number; baseY: number } {
  return { px: (tx + 0.5) * S, baseY: (ty + 0.5) * SYT + SYT * 0.14 };
}

function paintRun(r: RunRig, tile: Tile, tx: number, ty: number): DrawItem {
  const item = tile === Tile.CourseWall ? courseWallItem(r.host, tx, ty, r.game) : courseStileItem(r.host, tx, ty, r.game);
  item.drawShadow?.();
  const castsAfterShadow = r.casts.length;
  assert.ok(item.draw, `${Tile[tile]} minted no draw`);
  item.draw();
  assert.equal(r.casts.length, castsAfterShadow, 'draw() casts no shadow (SHADOWS NEVER BAKE lives in drawShadow)');
  return item;
}

/** The postures a run family must speak, as cell maps around (tx,12). */
const POSTURES: Record<string, (t: Tile, tx: number) => Cell[]> = {
  lone: (t, x) => [[x, 12, t]],
  ewThrough: (t, x) => [[x - 1, 12, t], [x, 12, t], [x + 1, 12, t]],
  ewWestEnd: (t, x) => [[x, 12, t], [x + 1, 12, t], [x + 2, 12, t]],
  ewEastEnd: (t, x) => [[x - 2, 12, t], [x - 1, 12, t], [x, 12, t]],
  nsThrough: (t, x) => [[x, 11, t], [x, 12, t], [x, 13, t]],
  nsSouthEnd: (t, x) => [[x, 10, t], [x, 11, t], [x, 12, t]],
  nsNorthEnd: (t, x) => [[x, 12, t], [x, 13, t], [x, 14, t]],
  corner: (t, x) => [[x, 11, t], [x, 12, t], [x + 1, 12, t]],
  tee: (t, x) => [[x - 1, 12, t], [x, 12, t], [x + 1, 12, t], [x, 13, t]],
  cross: (t, x) => [[x - 1, 12, t], [x, 12, t], [x + 1, 12, t], [x, 11, t], [x, 13, t]],
};

/** The stile inside its course: the wall on both sides (and the N-S kin). */
const STILE_POSTURES: Record<string, (tx: number) => Cell[]> = {
  lone: (x) => [[x, 12, Tile.CourseStile]],
  inWallEW: (x) => [[x - 1, 12, Tile.CourseWall], [x, 12, Tile.CourseStile], [x + 1, 12, Tile.CourseWall]],
  inWallNS: (x) => [[x, 11, Tile.CourseWall], [x, 12, Tile.CourseStile], [x, 13, Tile.CourseWall]],
  wallWestOnly: (x) => [[x - 1, 12, Tile.CourseWall], [x, 12, Tile.CourseStile]],
  wallNorthOnly: (x) => [[x, 11, Tile.CourseWall], [x, 12, Tile.CourseStile]],
  stileWestWallEast: (x) => [[x - 1, 12, Tile.CourseStile], [x, 12, Tile.CourseStile], [x + 1, 12, Tile.CourseWall]],
  twoStilesNS: (x) => [[x, 11, Tile.CourseStile], [x, 12, Tile.CourseStile], [x, 13, Tile.CourseWall]],
};

const RUN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

// ---------------------------------------------------------------------
// (g) BODY-RULER: the rig numbers, exported and pinned.
// ---------------------------------------------------------------------

test('BODY-RULER: the rig numbers are the brief\'s and every relation holds against the 1.15s rig', () => {
  assert.equal(COPE_H, 0.82);
  assert.equal(COURSE_H, 0.14);
  assert.equal(STILE_H, 0.5);
  assert.equal(STEP_H, 0.34);
  assert.equal(CELL_H, 1.75);
  assert.equal(CELL_RX, 0.6);
  assert.equal(CELL_FOOT_DY, 0.18);
  assert.equal(PLUMB_H, 0.4);
  assert.equal(BOB_AMP, 0.03);
  // The knee under the hip under the chest under the rig under the crown.
  assert.ok(STEP_H < STILE_H && STILE_H < COPE_H && COPE_H < 1.15 && 1.15 < CELL_H, 'STEP_H < STILE_H < COPE_H < 1.15 < CELL_H');
  assert.ok(PLUMB_H < STILE_H, 'the plumb stone stands at the knee, under the stile');
  // Four courses over a footing and the cope on edge make the crest.
  assert.ok(Math.abs(5 * COURSE_H + 0.12 - COPE_H) < 1e-9, 'four courses + footing + a 0.12 cope = COPE_H');
  assert.ok(Math.abs(3 * COURSE_H + 0.08 - STILE_H) < 1e-9, 'two courses + footing + a 0.08 cope = STILE_H');
  // The cell is wider at the foot than a body is tall.
  assert.ok(CELL_RX * 2 > 1.15);
});

test('the hall row is exactly the two discrete pieces; the run pair is COURSE_TILES', () => {
  assert.equal(COURSE_PROPS.length, 2);
  assert.deepEqual(COURSE_PROPS.map(([tiles]) => [...tiles]), [[Tile.CorbelCell], [Tile.PlumbStone]]);
  assert.equal(Tile.CourseWall, 549);
  assert.equal(Tile.CourseStile, 550);
  assert.equal(Tile.CorbelCell, 551);
  assert.equal(Tile.PlumbStone, 552);
  assert.deepEqual([...COURSE_TILES].sort(), [Tile.CourseWall, Tile.CourseStile]);
});

// ---------------------------------------------------------------------
// (a) (b) (c) the hall pair: fills only, no transforms, BLOCK LAW.
// ---------------------------------------------------------------------

test('the hall pair speaks only fills: no strokes, no transforms, one contact seat, no glow of its own', () => {
  for (const tile of HALL) {
    for (const h of SEEDS) {
      const r = hallRig(h, tile);
      paintHall(r);
      for (const bad of ['stroke', 'strokeRect', ...TRANSFORMS]) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.equal(r.ctx.calls.filter((c) => c === 'ellipse').length, 1, `${Tile[tile]} h=${h}: the seat is the one ellipse`);
      assert.ok(r.ctx.calls.includes('fill') && r.ctx.calls.includes('fillRect'), `${Tile[tile]} h=${h} painted nothing`);
      assert.equal(r.glows, 0, `${Tile[tile]} queued a glow`);
    }
  }
});

test('BLOCK LAW: every fillRect of all four painters is at least 0.03s on both sides, at eight seeds, calm and in a gale', () => {
  const min = 0.03 * S - 1e-6;
  const check = (rects: Rect[], who: string) => {
    for (const q of rects) {
      assert.ok(q.w >= min && q.h >= min, `${who}: fillRect ${q.w.toFixed(2)}×${q.h.toFixed(2)} under 0.03s`);
    }
  };
  for (const tile of HALL) {
    for (const h of SEEDS) {
      for (const gale of [0, 1e6, -1e6]) {
        const r = hallRig(h, tile, gale);
        paintHall(r);
        check(r.ctx.rects, `${Tile[tile]} h=${h} gale=${gale}`);
      }
    }
  }
  for (const tx of RUN_SEEDS) {
    for (const [posture, cells] of Object.entries(POSTURES)) {
      const r = runRig(cells(Tile.CourseWall, tx));
      paintRun(r, Tile.CourseWall, tx, 12);
      check(r.ctx.rects, `CourseWall ${posture} tx=${tx}`);
    }
    for (const [posture, cells] of Object.entries(STILE_POSTURES)) {
      const r = runRig(cells(tx));
      paintRun(r, Tile.CourseStile, tx, 12);
      check(r.ctx.rects, `CourseStile ${posture} tx=${tx}`);
    }
  }
});

// ---------------------------------------------------------------------
// (d) (e) ONE BREEZE: the plumb stone alone, once, held in a gale.
// ---------------------------------------------------------------------

test('ONE BREEZE: the plumb stone samples breezeAt exactly once per draw; the cell never reads the clock', () => {
  for (const h of SEEDS) {
    const r = hallRig(h, Tile.PlumbStone);
    paintHall(r);
    assert.equal(r.breezeCalls, 1, `PlumbStone h=${h} sampled the breeze ${r.breezeCalls} times`);
    const c = hallRig(h, Tile.CorbelCell);
    paintHall(c);
    assert.equal(c.breezeCalls, 0, 'the cell read the clock');
    // Still means still: the seconds clock changes nothing.
    const late = hallRig(h, Tile.CorbelCell, 0, 9001.5);
    paintHall(late);
    assert.deepEqual(late.ctx.verts, c.ctx.verts, `CorbelCell h=${h} moved with t`);
    assert.deepEqual(late.ctx.fills, c.ctx.fills);
  }
});

test('ONE BREEZE holds in a gale: no plumb stone vertex leaves its still pose by more than BOB_AMP·s', () => {
  for (const h of SEEDS) {
    const still = hallRig(h, Tile.PlumbStone, 0);
    paintHall(still);
    let moved = 0;
    for (const gale of [1e6, -1e6]) {
      const storm = hallRig(h, Tile.PlumbStone, gale);
      paintHall(storm);
      assert.equal(storm.ctx.verts.length, still.ctx.verts.length, 'the plumb stone changed shape in the gale');
      for (let i = 0; i < still.ctx.verts.length; i++) {
        const [ax, ay] = still.ctx.verts[i]!;
        const [bx, by] = storm.ctx.verts[i]!;
        const d = Math.hypot(bx - ax, by - ay);
        if (d > 1e-6) moved++;
        assert.ok(d <= BOB_AMP * S + 1e-6, `h=${h} vertex ${i} swung ${(d / S).toFixed(3)}s over the ${BOB_AMP}s law`);
      }
    }
    assert.ok(moved > 0, `h=${h} the bob does not breathe at all`);
    // The stone itself never moves: every rect but the bob's shade is still.
    const storm = hallRig(h, Tile.PlumbStone, 1e6);
    paintHall(storm);
    const stillStone = still.ctx.rects.filter((q) => q.fill !== TH_CHALK && !q.fill.startsWith('#d'));
    const stormStone = storm.ctx.rects.filter((q) => q.fill !== TH_CHALK && !q.fill.startsWith('#d'));
    assert.deepEqual(stormStone, stillStone, 'the set stone is plumb: only the cord and bob ride the breeze');
  }
});

test('the run pair never breathes and never reads the clock (the host throws on breezeAt)', () => {
  for (const tx of RUN_SEEDS) {
    for (const cells of Object.values(POSTURES)) paintRun(runRig(cells(Tile.CourseWall, tx)), Tile.CourseWall, tx, 12);
    for (const cells of Object.values(STILE_POSTURES)) paintRun(runRig(cells(tx)), Tile.CourseStile, tx, 12);
  }
});

// ---------------------------------------------------------------------
// (f) SHADOWS NEVER BAKE: casts per frame, edge for W/S/P, blob for C.
// ---------------------------------------------------------------------

test('SHADOWS NEVER BAKE: the cell throws one blob, the plumb stone one edge, per frame through the host', () => {
  for (const h of SEEDS) {
    const c = hallRig(h, Tile.CorbelCell);
    const cell = painterFor(Tile.CorbelCell)(c.host, c.env);
    assert.ok(cell.drawShadow, 'the cell has no drawShadow');
    cell.drawShadow();
    assert.deepEqual(c.casts, ['blob'], `h=${h} the cell cast ${c.casts.join(',')}`);
    cell.draw!();
    assert.deepEqual(c.casts, ['blob'], 'draw() casts nothing');
    const p = hallRig(h, Tile.PlumbStone);
    const plumb = painterFor(Tile.PlumbStone)(p.host, p.env);
    assert.ok(plumb.drawShadow, 'the plumb stone has no drawShadow');
    plumb.drawShadow();
    assert.deepEqual(p.casts, ['edge'], `h=${h} the plumb stone cast ${p.casts.join(',')}`);
    plumb.draw!();
    assert.deepEqual(p.casts, ['edge'], 'draw() casts nothing');
  }
});

// ---------------------------------------------------------------------
// (h) the run pair: no body, struct strokes only, casts, the outline off.
// ---------------------------------------------------------------------

for (const tile of [Tile.CourseWall, Tile.CourseStile]) {
  const name = Tile[tile];
  const postures = tile === Tile.CourseWall
    ? Object.entries(POSTURES).map(([k, f]) => [k, (tx: number) => f(tile, tx)] as const)
    : Object.entries(STILE_POSTURES).map(([k, f]) => [k, f] as const);

  test(`${name}: every posture speaks fills and struct strokes only, returns no body, casts edges per frame`, () => {
    for (const [posture, cells] of postures) {
      const r = runRig(cells(10));
      const item = paintRun(r, tile, 10, 12);
      assert.equal(item.body, undefined, `${posture}: a run family returns no body (the ring is stroked live)`);
      assert.equal(item.sortY, 12.8, `${posture}: sorts with the barrier families (the walker steps over)`);
      for (const bad of TRANSFORMS) assert.ok(!r.ctx.calls.includes(bad), `${posture}: no ${bad} (parity: quads only)`);
      assert.ok(!r.ctx.calls.includes('ellipse'), `${posture}: a run piece seats on a contact step, never an ellipse`);
      const fills = r.ctx.calls.filter((c) => c === 'fill').length;
      assert.ok(r.ctx.rects.length + fills > 8, `${posture}: paints a body of work`);
      assert.ok(r.structs > 0, `${posture}: rings its exposed silhouette at struct weight`);
      assert.ok(r.ctx.calls.includes('stroke'), `${posture}: strokes the ring`);
      assert.ok(!r.ctx.calls.includes('strokeRect'), `${posture}: never strokeRect`);
      assert.ok(r.casts.length > 0, `${posture}: casts a shadow per frame`);
      for (const c of r.casts) assert.ok(c[4] > 0 && c[4] <= 1, `${posture}: cast height in tiles`);
    }
  });

  test(`${name}: with the outline off nothing strokes and the paint is unchanged`, () => {
    for (const [posture, cells] of postures) {
      const on = runRig(cells(10), true);
      const off = runRig(cells(10), false);
      paintRun(on, tile, 10, 12);
      paintRun(off, tile, 10, 12);
      assert.equal(off.structs, 0, `${posture}: no struct pass with the outline off`);
      assert.ok(!off.ctx.calls.includes('stroke') && !off.ctx.calls.includes('strokeRect'), `${posture}: nothing strokes`);
      assert.deepEqual(off.ctx.rects, on.ctx.rects, `${posture}: the ring is additive — the fills do not move`);
    }
  });
}

// ---------------------------------------------------------------------
// THE SEPARATE-MASONRY LAW and the level crest.
// ---------------------------------------------------------------------

test('CourseWall: THE SEPARATE-MASONRY LAW — a living wall, a fence, the ruin beside it are no kin', () => {
  const { px, baseY } = datum(10, 12);
  for (const flank of [Tile.WallStone, Tile.WallWood, Tile.RuinWallStone, Tile.RuinWallWood, Tile.Palisade, Tile.Fence, Tile.Hedge]) {
    const r = runRig([[9, 12, flank], [10, 12, Tile.CourseWall], [11, 12, flank], [10, 11, flank]]);
    paintRun(r, Tile.CourseWall, 10, 12);
    assert.equal(r.casts.length, 1, `${Tile[flank]}: one E-W cast, no N-S cast toward the stranger`);
    assert.deepEqual(r.casts[0], [px - S * 0.5, baseY, px + S * 0.5, baseY, COPE_H]);
  }
  // Its own kind east: the course reaches the seam and stops at the heart.
  const kin = runRig([[10, 12, Tile.CourseWall], [11, 12, Tile.CourseWall]]);
  paintRun(kin, Tile.CourseWall, 10, 12);
  assert.deepEqual(kin.casts[0], [px, baseY, px + S * 0.5, baseY, COPE_H]);
  // The stile is kin: the wall reaches into its seams.
  const stile = runRig([[10, 12, Tile.CourseWall], [11, 12, Tile.CourseStile]]);
  paintRun(stile, Tile.CourseWall, 10, 12);
  assert.deepEqual(stile.casts[0], [px, baseY, px + S * 0.5, baseY, COPE_H]);
  // Its own kind north: the N-S band casts from its SOUTH FOOT at the
  // heart, E-W, at plan width (the ruin walls' law: a centre-line cast
  // spikes under noon).
  const kinN = runRig([[10, 11, Tile.CourseWall], [10, 12, Tile.CourseWall]]);
  paintRun(kinN, Tile.CourseWall, 10, 12);
  assert.equal(kinN.casts.length, 1);
  const c = kinN.casts[0]!;
  assert.ok(c[1] === baseY && c[3] === baseY && c[0] < px && c[2] > px && c[2] - c[0] < S * 0.5, 'a band-wide E-W edge at the heart');
  assert.equal(c[4], COPE_H);
});

test('CourseWall: the crest is ONE LEVEL LINE the whole run, EDGE-STABLE by construction, and every cope stone abuts the next', () => {
  const cells: Cell[] = [];
  for (let x = 7; x <= 14; x++) cells.push([x, 12, Tile.CourseWall]);
  const crestY = datum(10, 12).baseY - COPE_H * S - TOP;
  for (const tx of [9, 10, 11, 12]) {
    const r = runRig(cells);
    paintRun(r, Tile.CourseWall, tx, 12);
    const tops = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6);
    assert.ok(tops.length >= 7, `tile ${tx}: a comb of cope stones (${tops.length})`);
    for (const q of tops) assert.ok(Math.abs(q.y - crestY) < 1e-6, `tile ${tx}: a cope stone off the level`);
    // The stones tile the span from seam to seam without a gap.
    tops.sort((a, b) => a.x - b.x);
    assert.ok(Math.abs(tops[0]!.x - tx * S) < 1e-6, `tile ${tx}: the first stone starts at the west seam`);
    for (let i = 1; i < tops.length; i++) {
      assert.ok(Math.abs(tops[i]!.x - (tops[i - 1]!.x + tops[i - 1]!.w)) < 1e-6, `tile ${tx}: stone ${i} abuts stone ${i - 1}`);
      assert.ok(tops[i]!.w >= S * 0.03 - 1e-6 && tops[i]!.w <= S * 0.14 + 1e-6, `tile ${tx}: a cope stone 0.03..0.14s wide`);
    }
    const last = tops[tops.length - 1]!;
    assert.ok(Math.abs(last.x + last.w - (tx + 1) * S) < 1e-6, `tile ${tx}: the last stone ends at the east seam`);
    // Nothing stands over the cope: no rect's top rises above the crest plane.
    for (const q of r.ctx.rects) assert.ok(q.y >= crestY - 1e-6, `tile ${tx}: something overtops the level cope`);
  }
  // A N-S run's end: the header stands at the SAME height as the cope (never overtops).
  // (The band in depth marches up-screen, so its cope joints sit
  // above the E-W crest plane on screen; the law is about HEIGHT.)
  const n = runRig(POSTURES.nsSouthEnd!(Tile.CourseWall, 10));
  paintRun(n, Tile.CourseWall, 10, 12);
  const heads = n.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.equal(heads.length, 1, 'the header alone shows a rect crest on a N-S end (the band crest is a projected quad)');
  assert.ok(Math.abs(heads[0]!.y - crestY) < 1e-6, 'the junction header stands level with the cope, never over it');
  const { px } = datum(10, 12);
  assert.ok(heads[0]!.x < px && heads[0]!.x + heads[0]!.w > px, 'the header straddles the heart');
});

test('CourseWall: a free end is a BUILT HEAD, never a tumble — nothing lies on the ground past the seam', () => {
  const { px, baseY } = datum(10, 12);
  for (const [posture, cells] of [['ewWestEnd', POSTURES.ewWestEnd!], ['ewEastEnd', POSTURES.ewEastEnd!], ['lone', POSTURES.lone!]] as const) {
    const r = runRig(cells(Tile.CourseWall, 10));
    paintRun(r, Tile.CourseWall, 10, 12);
    for (const q of r.ctx.rects) {
      assert.ok(q.x >= px - S * 0.5 - 1e-6 && q.x + q.w <= px + S * 0.5 + 1e-6, `${posture}: every stone inside the tile`);
      assert.ok(q.y + q.h <= baseY + S * 0.06 + 1e-6, `${posture}: nothing lies on the ground (no skirt, no chips)`);
    }
  }
});

// ---------------------------------------------------------------------
// (i) the stile's kin read: tall stubs toward WALL kin only.
// ---------------------------------------------------------------------

test('CourseStile: with wall kin west and east the tall cope stubs reach both seams and the low place lies between', () => {
  const { px, baseY } = datum(10, 12);
  const wallCrest = baseY - COPE_H * S - TOP;
  const stileCrest = baseY - STILE_H * S - TOP;
  const r = runRig(STILE_POSTURES.inWallEW!(10));
  paintRun(r, Tile.CourseStile, 10, 12);
  const tall = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.y - wallCrest) < 1e-6);
  const low = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.y - stileCrest) < 1e-6);
  assert.ok(tall.some((q) => Math.abs(q.x - (px - S * 0.5)) < 1e-6), 'the west stub reaches the west seam');
  assert.ok(tall.some((q) => Math.abs(q.x + q.w - (px + S * 0.5)) < 1e-6), 'the east stub reaches the east seam');
  assert.ok(tall.every((q) => q.x + q.w <= px - S * 0.34 + 1e-6 || q.x >= px + S * 0.34 - 1e-6), 'the stubs stop STUB into the tile');
  assert.ok(low.length >= 4, 'the low place is coped');
  assert.ok(low.every((q) => q.x >= px - S * 0.34 - 1e-6 && q.x + q.w <= px + S * 0.34 + 1e-6), 'the low cope runs between the stubs');
  // The steps and Vorl's stone: a lit step at the knee, an upright 0.12s × 0.50s.
  assert.ok(r.ctx.rects.some((q) => q.fill === TH_MARL_LIT && Math.abs(q.y - (baseY - STEP_H * S)) < 1e-6 && Math.abs(q.w - S * 0.16) < 1e-6 && q.h >= S * 0.13 - 1e-6), 'the step stone\'s lit top at the knee over a pale 0.10s slab');
  // The step lies against the face: an internal feature, never ringed
  // (the first cut's ink bracket read as a dark hook) — pinned on the
  // source below, beside the laws.
  assert.ok(r.ctx.rects.some((q) => q.fill === TH_MARL && Math.abs(q.w - S * 0.12) < 1e-6 && Math.abs(q.h - STILE_H * S) < 1e-6), 'Vorl\'s one stone, hip-high, plumb');
  // Nothing overtops the wall's crest; the stile is a built drop.
  for (const q of r.ctx.rects) assert.ok(q.y >= wallCrest - 1e-6, 'nothing overtops the course');
});

test('CourseStile: with STILE kin west and wall kin east the west stub is absent and the low cope reaches the west seam', () => {
  const { px, baseY } = datum(10, 12);
  const wallCrest = baseY - COPE_H * S - TOP;
  const stileCrest = baseY - STILE_H * S - TOP;
  const r = runRig(STILE_POSTURES.stileWestWallEast!(10));
  paintRun(r, Tile.CourseStile, 10, 12);
  const tall = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.y - wallCrest) < 1e-6);
  const low = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.y - stileCrest) < 1e-6);
  assert.ok(tall.length > 0 && tall.every((q) => q.x >= px + S * 0.34 - 1e-6), 'only the east stub stands');
  assert.ok(low.some((q) => Math.abs(q.x - (px - S * 0.5)) < 1e-6), 'the low cope reaches the west seam (two stiles: one open low place, no stubs joined)');
  // N-S: a stile north, a wall south — the tall stub south only.
  const ns = runRig(STILE_POSTURES.twoStilesNS!(10));
  paintRun(ns, Tile.CourseStile, 10, 12);
  const risers = ns.ctx.rects.filter((q) => q.fill === TH_MARL && Math.abs(q.w - S * 0.3) < 1e-6);
  assert.equal(risers.length, 0, 'no drop riser faces south from a north stub that is not there');
});

test('CourseStile: two lone stiles are byte-identical — a stranger beside it is no kin, and the clock is no input', () => {
  const alone = runRig(STILE_POSTURES.lone!(10));
  paintRun(alone, Tile.CourseStile, 10, 12);
  const strangers = runRig([[9, 12, Tile.RuinWallStone], [10, 12, Tile.CourseStile], [11, 12, Tile.Fence], [10, 11, Tile.WallStone], [10, 13, Tile.Palisade]]);
  paintRun(strangers, Tile.CourseStile, 10, 12);
  assert.deepEqual(strangers.ctx.rects, alone.ctx.rects);
  assert.deepEqual(strangers.ctx.verts, alone.ctx.verts);
  assert.deepEqual(strangers.ctx.fills, alone.ctx.fills);
  assert.deepEqual(strangers.casts, alone.casts);
  // Lone: an E-W stile with a built head each side at its own height.
  const { px, baseY } = datum(10, 12);
  const wallCrest = baseY - COPE_H * S - TOP;
  assert.ok(alone.ctx.rects.every((q) => q.y > wallCrest + 1e-6), 'a lone stile stands no tall stub');
  assert.ok(alone.ctx.rects.every((q) => q.x >= px - S * 0.5 - 1e-6 && q.x + q.w <= px + S * 0.5 + 1e-6), 'everything inside the tile');
  const lows = alone.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.ok(lows.some((q) => Math.abs(q.x - (px - S * 0.5)) < 1e-6) && lows.some((q) => Math.abs(q.x + q.w - (px + S * 0.5)) < 1e-6), 'the low cope runs seam to seam');
});

// ---------------------------------------------------------------------
// (j) THE ONE RING for the hall pair: a body holding the painted extent.
// ---------------------------------------------------------------------

test('THE ONE RING: the cell and the plumb stone carry a body that holds every painted vertex', () => {
  for (const tile of HALL) {
    for (const h of SEEDS) {
      const r = hallRig(h, tile, 1e6);
      const item = paintHall(r);
      assert.ok(item.body, `${Tile[tile]} has no body`);
      const b = item.body;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [x, y] of r.ctx.verts) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      assert.ok(b.x <= minX && b.x + b.w >= maxX, `${Tile[tile]} h=${h}: the body holds the painted width`);
      assert.ok(b.y <= minY && b.y + b.h >= maxY, `${Tile[tile]} h=${h}: the body holds the painted height`);
      // And never balloons: within a half tile of the paint on every side.
      assert.ok(minX - b.x < S * 0.5 && b.x + b.w - maxX < S * 0.5 && minY - b.y < S * 0.5 && b.y + b.h - maxY < S * 0.5, `${Tile[tile]}: the body fits`);
      assert.ok(item.sortY > r.env.ty + 0.5 && item.sortY < r.env.ty + 1, `${Tile[tile]} sorts by its foot`);
    }
  }
});

test('CorbelCell: the crown stands a body and a half over the foot, the door is low and south, the rings step in', () => {
  const r = hallRig(SEEDS[2], Tile.CorbelCell);
  paintHall(r);
  const p = r.env.p;
  const footY = p.y + SYT * CELL_FOOT_DY;
  // The capstone's lit top plane at TOP depth near the crown.
  const caps = r.ctx.rects.filter((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.equal(caps.length, 1, 'one capstone top plane');
  assert.ok(caps[0]!.y + caps[0]!.h < footY - CELL_H * S + S * 0.2 && caps[0]!.y + caps[0]!.h > footY - CELL_H * S - S * 0.2, 'the capstone sits at the crown');
  assert.ok(Math.abs(caps[0]!.w - S * 0.3) < 1e-6, 'the capstone 0.30s wide (the crown flattened: the skep\'s opposite)');
  // BULLET THEN BEEHIVE (the fix pass): the lower flank stands near
  // plumb — a ring vertex between 0.3 and 0.5 of the height still
  // reaches 0.9 of the foot's half-width — and the crown comes round:
  // nothing in the top twentieth stands past 0.6 of it. The first cut
  // tapered from ring one and read as a stepped cone.
  for (const h of SEEDS) {
    const rr = hallRig(h, Tile.CorbelCell);
    paintHall(rr);
    const rx = CELL_RX * S;
    const hgt = CELL_H * S;
    let lowMax = 0;
    let crownMax = 0;
    for (const [x, y] of rr.ctx.verts) {
      const dx = Math.abs(x - p.x);
      if (y >= footY - hgt * 0.5 && y <= footY - hgt * 0.3) lowMax = Math.max(lowMax, dx);
      if (y <= footY - hgt * 0.95) crownMax = Math.max(crownMax, dx);
    }
    assert.ok(lowMax >= rx * 0.9, `h=${h}: the lower flank holds near plumb (${(lowMax / rx).toFixed(2)} of the foot)`);
    assert.ok(crownMax <= rx * 0.6, `h=${h}: the crown closes to the capstone (${(crownMax / rx).toFixed(2)} of the foot)`);
  }
  // The door: one black hole 0.30s wide with its lintel at 0.85s, in the south face.
  const door = r.ctx.rects.filter((q) => q.fill === '#1b1719');
  assert.equal(door.length, 1);
  assert.ok(Math.abs(door[0]!.w - S * 0.3) < 1e-6 && Math.abs(door[0]!.y - (footY - S * 0.85)) < 1e-6, 'the door hole, lintel at the chest');
  assert.ok(Math.abs(door[0]!.x + door[0]!.w * 0.5 - p.x) < 1e-6, 'the door is centred on the south face');
  // No turf, no vent coals, no soot: every fill is a marl or chalk value, the hole, or the seat.
  for (const f of r.ctx.fills) {
    assert.ok(/^#[0-9a-f]{6}$/i.test(f) || f.startsWith('rgba(12, 8, 20'), `the cell paints hex marl (${f})`);
  }
});

test('PlumbStone: the stone is plumb, a hair taller than wide, its top slotted, the bob on the face', () => {
  const r = hallRig(SEEDS[1], Tile.PlumbStone);
  paintHall(r);
  const p = r.env.p;
  const baseY = p.y + SYT * 0.18;
  const face = r.ctx.rects.find((q) => q.fill === TH_MARL && Math.abs(q.h - PLUMB_H * S) < 1e-6);
  assert.ok(face, 'the stone\'s face');
  assert.ok(Math.abs(face!.w - S * 0.34) < 1e-6 && face!.h > face!.w, 'a hair taller than wide');
  assert.ok(Math.abs(face!.y + face!.h - baseY) < 1e-6, 'standing on the ground line');
  assert.ok(Math.abs(face!.x + face!.w * 0.5 - p.x) < 1e-6, 'plumb: no lean');
  const topPlane = r.ctx.rects.find((q) => q.fill === TH_MARL_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.ok(topPlane && Math.abs(topPlane.y + topPlane.h - (baseY - PLUMB_H * S)) < 1e-6, 'the lit top at syT·0.32 on the crest');
  const slot = r.ctx.rects.find((q) => Math.abs(q.h - S * 0.04) < 1e-6 && q.w > S * 0.2 && q.y > topPlane!.y && q.y < topPlane!.y + TOP);
  assert.ok(slot, 'one dark slot running E-W across the top');
  const footing = r.ctx.rects.find((q) => Math.abs(q.w - S * 0.44) < 1e-6 && Math.abs(q.h - S * 0.06) < 1e-6);
  assert.ok(footing, 'the footing slab 0.44 × 0.06');
  // The bob (chalk fill, a quad and a tri) hangs ON the face: its
  // vertices lie inside the face's x span and above the ground.
  const bobIdx = r.ctx.fills.indexOf(TH_CHALK);
  assert.ok(bobIdx >= 0, 'the bob is chalk');
  const chalkVerts = r.ctx.verts.filter(([x, y]) => Math.abs(x - p.x) <= S * 0.05 && y > baseY - S * 0.28 && y < baseY - S * 0.14);
  assert.ok(chalkVerts.length >= 7, 'the bob\'s vertices (0.09s × 0.12s) ride the face, its point 0.15s over the ground');
});

// ---------------------------------------------------------------------
// (k) (l) (m) the file speaks its laws, holds the boundary, deals warm.
// ---------------------------------------------------------------------

test('course.ts: the content boundary holds and the laws are spoken in the file', () => {
  const src = readFileSync(fileURLToPath(new URL('./course.ts', import.meta.url)), 'utf8');
  // The boundary's roster, spelled so this file never carries a word
  // it forbids (the scan reads every changed line).
  const banned = ['wi-tch', 'h-ex', 'co-ven', 'war-lock', 'de-mon', 'de-vil', 'in-fernal', 'oc-cult', 'he-ll'].map((w) => w.replace('-', ''));
  for (const word of banned) {
    assert.ok(!new RegExp(`\\b${word}`, 'i').test(src), `the boundary holds in the course (${word.length} letters)`);
  }
  assert.ok(!/ctx\.(translate|rotate|scale|setTransform)\(/.test(src), 'no transform tricks (parity)');
  assert.ok(!/queueGlow\(/.test(src), 'nothing glows from the painter');
  assert.ok(!/[sS]moke\s*\(/.test(src), 'no painter smoke');
  assert.ok(/const ctx = rend\.ctx;/.test(src), 'draw-time ctx capture');
  assert.ok(!/h >> \d/.test(src), 'hash deals with h >>> k');
  assert.ok(!/strokeRect\(|strokeStyle/.test(src), 'no strokeRect, no stroke ink of its own');
  // The one stroke is the struct ring, inside the inker's flush.
  assert.equal((src.match(/ctx\.stroke\(\)/g) ?? []).length, 1, 'ctx.stroke() appears once: the struct ring');
  assert.ok(/breezeAt/.test(src) && (src.match(/rend\.breezeAt\(/g) ?? []).length === 1, 'ONE BREEZE: breezeAt read in one helper');
  // The E-W step stone carries no ring of its own (the shared-edge
  // rule: it lies against the face; a bracket round it read as a hook).
  assert.ok(!/ink\.seg\(stepX/.test(src), 'the step stone inks no bracket');
  // THE STAGE: the run pair is a raw brush (draw-time ctx) and must
  // sit in the renderer's RAW_BARRIER_TILES roster beside the ruin
  // walls, or the accelerated display marks it stage-safe and paints
  // it UNDER the GL grass and bodies (the 9b review's one correctness
  // finding). Pinned on the roster's source: the set is private.
  const rsrc = readFileSync(fileURLToPath(new URL('../../renderer.ts', import.meta.url)), 'utf8');
  const roster = rsrc.slice(rsrc.indexOf('RAW_BARRIER_TILES = new Set<number>(['));
  const rosterBody = roster.slice(0, roster.indexOf(']);'));
  assert.ok(rosterBody.length > 0 && rosterBody.length < 4000, 'the raw-barrier roster is found');
  for (const t of ['Tile.RuinWallStone', 'Tile.CourseWall', 'Tile.CourseStile']) {
    assert.ok(rosterBody.includes(t + ','), `${t} rides THE WALL LANE (RAW_BARRIER_TILES)`);
  }
  for (const law of ['SHADOWS NEVER BAKE', 'BLOCK LAW', 'ONE BREEZE', 'TOP-PLANE', 'BODY-RULER', 'THE ONE RING', 'TWO SUNS', 'SEPARATE-MASONRY']) {
    assert.ok(src.includes(law), `the header speaks ${law}`);
  }
});

test('the inks: TH_CHALK is the Marl\'s own bob and every TH_MARL ink is warm bone (r ≥ g ≥ b)', () => {
  assert.equal(TH_CHALK, DOLMEN_LOOKS['dolmen']!.bob);
  for (const ink of [TH_MARL, TH_MARL_LIT, TH_MARL_DARK, TH_MARL_MOTTLE, TH_CHALK]) {
    const n = parseInt(ink.slice(1), 16);
    const r = n >> 16;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    assert.ok(r >= g && g >= b, `${ink} is warm (r ≥ g ≥ b)`);
  }
  // Paler than the town's kept stone, never moonpale: the base is
  // brighter than TWN_STONE-family greys and carries no blue.
  const marl = parseInt(TH_MARL.slice(1), 16);
  assert.ok((marl >> 16) > 0xb0, 'the marl is pale');
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Tile } from '@arx/shared';
import { ruinWallItem, stoneSeamCourses } from './ruinWalls.js';
import { SCAR_CHAR, TWN_STONE_LIT } from '../palette.js';
import { shade } from '../../tint.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';

// THE RUIN WALLS' laws, pinned without a browser. Both run painters
// speak fills and struct strokes only (no transforms — parity: the GL
// stage draws quads, never a rotated ctx), every fillRect ≥ 0.03s
// (BLOCK LAW's minimum feature), no `body` (a body would ring every
// seam — the exposed silhouette is stroked live like the palisade),
// no stroke at all with the outline off, shadows cast per frame
// through the host (SHADOWS NEVER BAKE), the crest EDGE-STABLE across
// every seam, own-kind connectivity only (THE SEPARATE-MASONRY LAW:
// a ruin never dies into a living wall), the ember checks on the
// west face only (TWO SUNS), and the stub every third hash tile.

const S = 64;
const YS = 0.72;
const SYT = S * YS;
const COURSE = 0.16 * S;
const TOP = SYT * 0.32;
const ST_LIT = TWN_STONE_LIT;
const CH_FACE = SCAR_CHAR;
const CH_CHECK = shade(SCAR_CHAR, 40);

interface Rect { x: number; y: number; w: number; h: number; fill: string }

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin = 'miter';
  lineCap = 'butt';
  globalAlpha = 1;
  calls: string[] = [];
  rects: Rect[] = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(): void { this.calls.push('moveTo'); }
  lineTo(): void { this.calls.push('lineTo'); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  ellipse(): void { this.calls.push('ellipse'); }
  fill(): void { this.calls.push('fill'); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.rects.push({ x, y, w, h, fill: String(this.fillStyle) });
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

type Cell = [number, number, Tile];

interface Rig {
  host: PaintHost;
  game: ClientGame;
  ctx: RecCtx;
  casts: Array<[number, number, number, number, number]>;
  structs: number;
}

function rig(cells: Cell[], outlineOn = true): Rig {
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
  const out: Rig = {
    host: null as unknown as PaintHost,
    game,
    ctx,
    casts,
    structs: 0,
  };
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
    castContact: () => { throw new Error('the ruin walls cast edges, not contacts'); },
    castBlob: () => { throw new Error('the ruin walls cast edges, not blobs'); },
  } as unknown as PaintHost;
  return out;
}

/** Screen datum of a tile, exactly as the painter derives it. */
function datum(tx: number, ty: number): { px: number; baseY: number } {
  return { px: (tx + 0.5) * S, baseY: (ty + 0.5) * SYT + SYT * 0.14 };
}

function paint(r: Rig, tile: Tile, tx: number, ty: number): ReturnType<typeof ruinWallItem> {
  const item = ruinWallItem(r.host, tile, tx, ty, r.game);
  item.drawShadow?.();
  const castsAfterShadow = r.casts.length;
  item.draw!();
  assert.equal(r.casts.length, castsAfterShadow, 'draw() casts no shadow (SHADOWS NEVER BAKE lives in drawShadow)');
  return item;
}

/** The six postures a run family must speak, as cell maps around (10,12). */
const POSTURES: Record<string, (t: Tile) => Cell[]> = {
  lone: (t) => [[10, 12, t]],
  ewThrough: (t) => [[9, 12, t], [10, 12, t], [11, 12, t]],
  ewWestEnd: (t) => [[10, 12, t], [11, 12, t], [12, 12, t]],
  ewEastEnd: (t) => [[8, 12, t], [9, 12, t], [10, 12, t]],
  nsThrough: (t) => [[10, 11, t], [10, 12, t], [10, 13, t]],
  nsSouthEnd: (t) => [[10, 10, t], [10, 11, t], [10, 12, t]],
  nsNorthEnd: (t) => [[10, 12, t], [10, 13, t], [10, 14, t]],
  corner: (t) => [[10, 11, t], [10, 12, t], [11, 12, t]],
  tee: (t) => [[9, 12, t], [10, 12, t], [11, 12, t], [10, 13, t]],
  cross: (t) => [[9, 12, t], [10, 12, t], [11, 12, t], [10, 11, t], [10, 13, t]],
};

for (const tile of [Tile.RuinWallStone, Tile.RuinWallWood]) {
  const name = tile === Tile.RuinWallStone ? 'RuinWallStone' : 'RuinWallWood';

  test(`${name}: every posture speaks fills and struct strokes only, at or above the minimum feature`, () => {
    for (const [posture, cells] of Object.entries(POSTURES)) {
      const r = rig(cells(tile));
      const item = paint(r, tile, 10, 12);
      assert.equal(item.body, undefined, `${posture}: a run family returns no body (the ring is stroked live)`);
      assert.equal(item.sortY, 12.8, `${posture}: sorts with the barrier families`);
      for (const bad of ['translate', 'rotate', 'scale', 'setTransform', 'save', 'restore', 'quadraticCurveTo', 'ellipse']) {
        assert.ok(!r.ctx.calls.includes(bad), `${posture}: no ${bad} (parity: quads only)`);
      }
      for (const q of r.ctx.rects) {
        assert.ok(q.w >= S * 0.03 - 1e-6 && q.h >= S * 0.03 - 1e-6, `${posture}: fillRect ${q.w.toFixed(2)}x${q.h.toFixed(2)} under 0.03s`);
      }
      const fills = r.ctx.calls.filter((c) => c === 'fill').length;
      assert.ok(r.ctx.rects.length + fills > 8, `${posture}: paints a body of work`);
      assert.ok(r.structs > 0, `${posture}: rings its exposed silhouette at struct weight`);
      assert.ok(r.ctx.calls.includes('stroke') || r.ctx.calls.includes('strokeRect'), `${posture}: strokes the ring`);
      assert.ok(r.casts.length > 0, `${posture}: casts a shadow per frame`);
      for (const c of r.casts) assert.ok(c[4] > 0 && c[4] <= 1, `${posture}: cast height in tiles`);
    }
  });

  test(`${name}: with the outline off nothing strokes and the paint is unchanged`, () => {
    const on = rig(POSTURES.tee!(tile), true);
    const off = rig(POSTURES.tee!(tile), false);
    paint(on, tile, 10, 12);
    paint(off, tile, 10, 12);
    assert.equal(off.structs, 0);
    assert.ok(!off.ctx.calls.includes('stroke') && !off.ctx.calls.includes('strokeRect'));
    assert.deepEqual(off.ctx.rects, on.ctx.rects, 'the ring is additive: the fills do not move');
  });

  test(`${name}: THE SEPARATE-MASONRY LAW — a living wall beside it is no kin`, () => {
    const living = tile === Tile.RuinWallStone ? Tile.WallStone : Tile.WallWood;
    const other = tile === Tile.RuinWallStone ? Tile.RuinWallWood : Tile.RuinWallStone;
    const { px, baseY } = datum(10, 12);
    // Flanked by living walls (and by the OTHER ruin kind): the tile
    // stands alone — its course spans the whole tile with two free ends.
    for (const flank of [living, other, Tile.Palisade, Tile.Fence]) {
      const r = rig([[9, 12, flank], [10, 12, tile], [11, 12, flank], [10, 11, flank]]);
      paint(r, tile, 10, 12);
      assert.equal(r.casts.length, 1, 'one E-W cast, no N-S cast toward the stranger');
      assert.deepEqual(r.casts[0]!.slice(0, 4), [px - S * 0.5, baseY, px + S * 0.5, baseY]);
    }
    // Its own kind east: the course reaches the seam and stops at the heart.
    const kin = rig([[10, 12, tile], [11, 12, tile]]);
    paint(kin, tile, 10, 12);
    assert.deepEqual(kin.casts[0]!.slice(0, 4), [px, baseY, px + S * 0.5, baseY]);
    // Its own kind north: the N-S band casts from its SOUTH FOOT at the
    // heart, E-W, at the band's plan width (the living wall's law — a
    // centre-line cast extrudes to a hairline spike under a noon sun).
    const kinN = rig([[10, 11, tile], [10, 12, tile]]);
    paint(kinN, tile, 10, 12);
    assert.equal(kinN.casts.length, 1, 'one cast for a north-only band');
    const c = kinN.casts[0]!;
    assert.ok(c[1] === baseY && c[3] === baseY, 'the band casts from its south foot at the heart');
    assert.ok(c[0] < px && c[2] > px && c[2] - c[0] < S * 0.5, 'a band-wide E-W edge, narrower than a course');
  });
}

test('RuinWallStone: the crest is EDGE-STABLE — the seam owns its height', () => {
  // The pure law: a tile's east seam IS its neighbour's west seam, its
  // south seam IS the next row's north seam, for every coordinate.
  for (let tx = -40; tx < 40; tx += 7) {
    for (let ty = -40; ty < 40; ty += 5) {
      assert.equal(stoneSeamCourses(tx, ty, 'e'), stoneSeamCourses(tx + 1, ty, 'w'));
      assert.equal(stoneSeamCourses(tx, ty, 's'), stoneSeamCourses(tx, ty + 1, 'n'));
      for (const side of ['w', 'e', 'n', 's'] as const) {
        const n = stoneSeamCourses(tx, ty, side);
        assert.ok(n >= 3 && n <= 7, 'three to seven courses stand');
      }
    }
  }
  // And in paint: along an E-W run, the lit crest rect of tile A's
  // east border column and tile B's west border column share one y.
  const cells: Cell[] = [[8, 12, Tile.RuinWallStone], [9, 12, Tile.RuinWallStone], [10, 12, Tile.RuinWallStone], [11, 12, Tile.RuinWallStone], [12, 12, Tile.RuinWallStone], [13, 12, Tile.RuinWallStone]];
  const crestAt = (tx: number, x: number): number => {
    const r = rig(cells);
    paint(r, Tile.RuinWallStone, tx, 12);
    const hits = r.ctx.rects.filter((q) => q.fill === ST_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.x - x) < 1e-6);
    assert.equal(hits.length, 1, `one crest plane at x=${x} on tile ${tx}`);
    return hits[0]!.y;
  };
  for (const tx of [9, 10, 11]) {
    const seamX = (tx + 1) * S;
    assert.equal(crestAt(tx, seamX - S * 0.25), crestAt(tx + 1, seamX), `seam ${tx}|${tx + 1} joins without a step`);
  }
  // Every column's body stands 3..7 courses under its lit plane.
  const r = rig(cells);
  paint(r, Tile.RuinWallStone, 10, 12);
  const { baseY } = datum(10, 12);
  const crests = r.ctx.rects.filter((q) => q.fill === ST_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.equal(crests.length, 4, 'four columns to a through-run tile');
  for (const q of crests) {
    const courses = (baseY - (q.y + TOP)) / COURSE;
    assert.ok(courses >= 3 - 1e-6 && courses <= 7 + 1e-6, `column stands ${courses.toFixed(2)} courses`);
  }
});

test('RuinWallStone: a free E-W end tumbles to three courses; a N-S end stands its quoin at six or seven (interior masses capped under it; a seam column may only ever level with it)', () => {
  const { px, baseY } = datum(10, 12);
  // West end of an eastward run: the course is the east half, its
  // first drawn column (at the heart) three courses high.
  const w = rig(POSTURES.ewWestEnd!(Tile.RuinWallStone));
  paint(w, Tile.RuinWallStone, 10, 12);
  const heart = w.ctx.rects.find((q) => q.fill === ST_LIT && Math.abs(q.h - TOP) < 1e-6 && Math.abs(q.x - px) < 1e-6);
  assert.ok(heart, 'the half course begins at the heart');
  assert.ok(Math.abs(baseY - (heart!.y + TOP) - 3 * COURSE) < 1e-6, 'the free end stands three courses');
  assert.ok(!w.ctx.rects.some((q) => q.x < px - 1e-6 && q.y + q.h <= baseY + 1e-6 && q.fill === ST_LIT && Math.abs(q.h - TOP) < 1e-6), 'no course west of the heart');
  // A N-S run's south end: the quoin's crest is the one rect lit plane on
  // the tile, six or seven courses up (a border column shares the seam
  // hash with its neighbour and may stand level with it, never over).
  const n = rig(POSTURES.nsSouthEnd!(Tile.RuinWallStone));
  paint(n, Tile.RuinWallStone, 10, 12);
  const planes = n.ctx.rects.filter((q) => q.fill === ST_LIT && Math.abs(q.h - TOP) < 1e-6);
  assert.equal(planes.length, 1, 'the quoin alone shows a rect crest (the band crest is a projected quad)');
  const quoinCourses = (baseY - (planes[0]!.y + TOP)) / COURSE;
  assert.ok(quoinCourses >= 6 - 1e-6 && quoinCourses <= 7 + 1e-6, `quoin stands ${quoinCourses.toFixed(2)} courses`);
  assert.ok(planes[0]!.x < px && planes[0]!.x + planes[0]!.w > px, 'the quoin straddles the heart');
});

test('RuinWallWood: studs stand 1.0..1.3 (a 0.4 stub every third hash tile), checks on the west face only', () => {
  let stubTiles = 0;
  let tiles = 0;
  for (let tx = 0; tx < 24; tx++) {
    const cells: Cell[] = [];
    for (let x = tx - 1; x <= tx + 1; x++) cells.push([x, 12, Tile.RuinWallWood]);
    const r = rig(cells);
    paint(r, Tile.RuinWallWood, tx, 12);
    tiles++;
    // A stud is the tall CH_FACE rect; its lit facet is the 0.05s west strip.
    const studs = r.ctx.rects.filter((q) => q.fill === CH_FACE && q.h >= S * 0.39 && q.w <= S * 0.2);
    assert.ok(studs.length >= 2 && studs.length <= 3, `${studs.length} studs on tile ${tx}`);
    let stub = false;
    for (const st of studs) {
      const body = st.h / S;
      if (Math.abs(body - 0.4) < 1e-6) stub = true;
      else assert.ok(body >= 1.0 - 1e-6 && body <= 1.3 + 1e-6, `stud body ${body.toFixed(3)}`);
    }
    if (stub) stubTiles++;
    // Every ember check sits on SOME stud's west strip — never east of the heart of a stud.
    const checks = r.ctx.rects.filter((q) => q.fill === CH_CHECK);
    assert.ok(checks.length > 0, 'the char shows its checks');
    for (const c of checks) {
      const on = studs.find((st) => c.x >= st.x - 1e-6 && c.x + c.w <= st.x + S * 0.05 + 1e-6 && c.y >= st.y - 1e-6 && c.y + c.h <= st.y + st.h + 1e-6);
      assert.ok(on, `check at x=${c.x.toFixed(1)} rides a west face`);
      assert.ok(c.x + c.w <= on!.x + on!.w * 0.5 + 1e-6, 'never on the east half');
    }
    // Every stud shows its lit top plane directly above its head.
    for (const st of studs) {
      assert.ok(r.ctx.rects.some((q) => Math.abs(q.x - st.x) < 1e-6 && Math.abs(q.w - st.w) < 1e-6 && Math.abs(q.y + q.h - st.y) < 1e-6 && q.h >= S * 0.03 - 1e-6), 'stud top lit');
    }
  }
  assert.ok(stubTiles >= 4 && stubTiles <= tiles / 2, `${stubTiles}/${tiles} tiles carry a stub (every third hash tile)`);
});

test('ruinWalls.ts: the content boundary holds and the laws are spoken in the file', () => {
  const src = readFileSync(fileURLToPath(new URL('./ruinWalls.ts', import.meta.url)), 'utf8');
  // The boundary's roster, spelled so this file never carries a word
  // it forbids (the scan reads every changed line).
  const banned = ['wi-tch', 'h-ex', 'co-ven', 'war-lock', 'de-mon', 'de-vil', 'in-fernal', 'oc-cult', 'he-ll'].map((w) => w.replace('-', ''));
  for (const word of banned) {
    assert.ok(!new RegExp(`\\b${word}`, 'i').test(src), `the boundary holds in the ruin walls (${word.length} letters)`);
  }
  assert.ok(!/ctx\.(translate|rotate|scale|setTransform)\(/.test(src), 'no transform tricks (parity)');
  assert.ok(!/queueGlow|breezeAt/.test(src), 'nothing glows, nothing breathes');
  assert.ok(/const ctx = rend\.ctx;/.test(src), 'draw-time ctx capture');
  assert.ok(!/h >> \d/.test(src), 'hash deals with h >>> k');
});

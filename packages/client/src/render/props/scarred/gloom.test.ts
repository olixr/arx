import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { GLOOM_PROPS } from './gloom.js';
import { SCAR_EMBER, SCAR_GLOOM } from '../palette.js';
import { paintPlant, plantModel } from '../../crops.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE GLOOM's laws, pinned without a browser: the three hall painters
// speak only fills (no strokes, no clips — THE ONE RING inks the
// silhouette), no transforms (parity), every fillRect ≥0.03s (BLOCK
// LAW), the gloom painted COLD (every blue-family ink darker than
// SCAR_GLOOM — the lights.ts rows are the only glow; the painters
// never queueGlow), no green anywhere (what was here first is not
// alive), the pool's scum the one clock (0.15 rev/s, cadence-safe,
// periodic), the stone and the root still, each casting its shadow per
// frame through the host (SHADOWS NEVER BAKE). The blighted crop is
// pinned through the crop painter path it rides.

const S = 64;
const YS = 0.72;

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin = 'miter';
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  pts: Array<[number, number]> = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(x: number, y: number): void { this.calls.push('moveTo'); this.pts.push([x, y]); }
  lineTo(x: number, y: number): void { this.calls.push('lineTo'); this.pts.push([x, y]); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  ellipse(_x: number, _y: number, rx: number, ry: number): void {
    assert.ok(rx >= 0 && ry >= 0, 'ellipse radii must be non-negative');
    this.calls.push('ellipse');
  }
  fill(): void { this.calls.push('fill'); this.fills.push(String(this.fillStyle)); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
    this.rects.push({ x, y, w, h });
  }
  stroke(): void { this.calls.push('stroke'); }
  save(): void { this.calls.push('save'); }
  restore(): void { this.calls.push('restore'); }
  translate(): void { this.calls.push('translate'); }
  rotate(): void { this.calls.push('rotate'); }
  scale(): void { this.calls.push('scale'); }
  setTransform(): void { this.calls.push('setTransform'); }
  clip(): void { this.calls.push('clip'); }
}

interface Rig { host: PropHost; env: PropFrame; ctx: RecCtx; casts: string[]; clocks: number; glows: number }

function rig(h: number, t = 0): Rig {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const r: Rig = { host: null as unknown as PropHost, env: null as unknown as PropFrame, ctx, casts, clocks: 0, glows: 0 };
  r.host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { yScale: YS },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    castFloraShadow: () => { casts.push('flora'); },
    breezeAt: () => { r.clocks++; return { sway: 0, lag: 0, gust: 1 }; },
    queueGlow: () => { r.glows++; },
    drawFlora: () => { ctx.calls.push('drawFlora'); },
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  r.env = {
    tile: Tile.GloomStone,
    tx: 10,
    ty: 12,
    game: {} as PropFrame['game'],
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
  const row = GLOOM_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no gloom painter for ${Tile[tile]}`);
  return row[1];
}

const THREE = [Tile.GloomStone, Tile.CreepRoot, Tile.FoulPool] as const;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a2a2a2a, 0x13579bdf] as const;
const CONTACT = 'rgba(12, 8, 20, 0.24)';

function paint(tile: Tile, r: Rig): ReturnType<PropPainter> {
  const item = painterFor(tile)(r.host, { ...r.env, tile });
  assert.ok(item.draw, `${Tile[tile]} minted no draw`);
  item.draw();
  return item;
}

const rgb = (ink: string): [number, number, number] => {
  const n = parseInt(ink.slice(1), 16);
  return [n >> 16, (n >> 8) & 0xff, n & 0xff];
};
const luma = (ink: string): number => {
  const [r, g, b] = rgb(ink);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
const chroma = (ink: string): number => {
  const [r, g, b] = rgb(ink);
  return Math.max(r, g, b) - Math.min(r, g, b);
};
/** A blue-family ink: blue leads both other channels by a step. */
const isGloomFamily = (ink: string): boolean => {
  const [r, g, b] = rgb(ink);
  return b > r + 20 && b > g + 12;
};
/** A living green: green leads both other channels by a step. */
const isGreen = (ink: string): boolean => {
  const [r, g, b] = rgb(ink);
  return g > r + 10 && g > b + 10;
};

test('the gloom speaks only fills: no strokes, no transforms, no clips, no queueGlow', () => {
  for (const tile of THREE) {
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      for (const bad of ['stroke', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'clip']) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(r.ctx.calls.includes('fill') && r.ctx.calls.includes('fillRect'), `${Tile[tile]} painted too little`);
      assert.equal(r.glows, 0, `${Tile[tile]} queueGlowed — the light is a lights.ts row`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of THREE) {
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      for (const rc of r.ctx.rects) {
        assert.ok(rc.w >= min && rc.h >= min, `${Tile[tile]} h=${h} rect ${rc.w.toFixed(2)}×${rc.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('COLD PLATES: every gloom-family ink sits under SCAR_GLOOM; no ember, no green, #rrggbb only', () => {
  const gloomLuma = luma(SCAR_GLOOM);
  for (const tile of THREE) {
    let gloomInks = 0;
    for (const h of SEEDS) {
      const r = rig(h);
      paint(tile, r);
      assert.ok(!r.ctx.fills.includes(SCAR_EMBER), `${Tile[tile]} painted SCAR_EMBER`);
      assert.ok(!r.ctx.fills.includes(SCAR_GLOOM), `${Tile[tile]} painted the gloom ink raw — the row is the glow`);
      for (const f of r.ctx.fills) {
        if (f === CONTACT) continue;
        assert.ok(/^#[0-9a-f]{6}$/i.test(f), `${Tile[tile]} paints #rrggbb inks only (${f})`);
        assert.ok(!isGreen(f), `${Tile[tile]} painted a living green ${f}`);
        assert.ok(!/^#e|^#f/i.test(f), `${Tile[tile]} painted a hot ink ${f}`);
        if (isGloomFamily(f)) {
          gloomInks++;
          assert.ok(luma(f) < gloomLuma, `${Tile[tile]} painted a gloom ink ${f} brighter than the ink itself`);
        } else {
          // Everything else (stone, char, bone, ash, dirt, spores) is
          // low-chroma: no warm ink in the gloom.
          assert.ok(chroma(f) < 40, `${Tile[tile]} painted a warm ink ${f} (chroma ${chroma(f)})`);
        }
      }
    }
    assert.ok(gloomInks > 0, `${Tile[tile]} carries no gloom at all`);
  }
});

test('the stone lays four to six lichen plates on the north and east; spores ≥0.03s beside them', () => {
  const counts = new Set<number>();
  for (const h of SEEDS) {
    const r = rig(h);
    paint(Tile.GloomStone, r);
    const plates = r.ctx.fills.filter((f) => f === '#5c6899' || f === '#4a5280').length;
    assert.ok(plates >= 4 && plates <= 6, `h=${h}: ${plates} plates`);
    counts.add(plates);
    const spores = r.ctx.fills.filter((f) => f === '#aeb0c0').length;
    assert.ok(spores >= 3, `h=${h}: ${spores} spores`);
  }
  assert.ok(counts.size > 1, 'the plate count ignores the hash');
});

test('STILL: the stone and the root never read the clock or the breeze', () => {
  for (const tile of [Tile.GloomStone, Tile.CreepRoot] as const) {
    for (const h of SEEDS.slice(0, 4)) {
      const a = rig(h, 0);
      const b = rig(h, 7.77);
      paint(tile, a);
      paint(tile, b);
      assert.deepEqual(a.ctx.rects, b.ctx.rects, `${Tile[tile]} h=${h} moved with the clock`);
      assert.deepEqual(a.ctx.pts, b.ctx.pts, `${Tile[tile]} h=${h} moved with the clock (paths)`);
      assert.equal(a.clocks + b.clocks, 0, `${Tile[tile]} sampled the breeze`);
    }
  }
});

test('THE SCUM DRIFTS: the pool\'s ring slides at 0.15 rev/s — cadence-safe per frame, periodic, and the only motion', () => {
  for (const h of SEEDS) {
    const a = rig(h, 0);
    const b = rig(h, 1 / 60);
    const c = rig(h, 1 / 0.15);
    const d = rig(h, 2.5);
    paint(Tile.FoulPool, a);
    paint(Tile.FoulPool, b);
    paint(Tile.FoulPool, c);
    paint(Tile.FoulPool, d);
    assert.equal(a.clocks, 0, 'the pool has no cloth to breathe');
    // The pan, the reeds and every path point stand still: only the
    // scum squares (fillRect) move.
    assert.deepEqual(a.ctx.pts, d.ctx.pts, `h=${h}: something besides the scum moved`);
    // One frame moves no square by more than 0.02s (the ring cache's
    // cadence can never strobe it).
    assert.equal(a.ctx.rects.length, b.ctx.rects.length);
    for (let i = 0; i < a.ctx.rects.length; i++) {
      const dx = Math.abs(a.ctx.rects[i]!.x - b.ctx.rects[i]!.x);
      const dy = Math.abs(a.ctx.rects[i]!.y - b.ctx.rects[i]!.y);
      assert.ok(dx <= 0.02 * S && dy <= 0.02 * S, `h=${h}: a scum square jumped ${dx.toFixed(2)},${dy.toFixed(2)}px in one frame`);
    }
    // And it does drift: 2.5s on, the ring has moved.
    assert.notDeepEqual(a.ctx.rects, d.ctx.rects, `h=${h}: the scum never moved`);
    // Periodic: one revolution later the ring is back (to the float).
    for (let i = 0; i < a.ctx.rects.length; i++) {
      assert.ok(Math.abs(a.ctx.rects[i]!.x - c.ctx.rects[i]!.x) < 1e-6 && Math.abs(a.ctx.rects[i]!.y - c.ctx.rects[i]!.y) < 1e-6, `h=${h}: the drift is not periodic`);
    }
    // The chain is broken: never more than twelve of fourteen slots
    // (two gaps are always dealt), never fewer than six.
    const bone = a.ctx.fills.filter((f) => f === '#cfc7ae' || f === '#b5ac91').length;
    assert.ok(bone >= 6 && bone <= 12, `h=${h}: ${bone} scum squares`);
  }
});

test('SHADOWS NEVER BAKE: the stone a mass (blob), each root arch a low prism (edge), the pool\'s reeds a contact', () => {
  for (const tile of THREE) {
    for (const h of SEEDS) {
      const r = rig(h);
      const item = painterFor(tile)(r.host, { ...r.env, tile });
      assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
      item.drawShadow();
      if (tile === Tile.CreepRoot) {
        // One edge per arch: two or three.
        assert.ok(r.casts.length >= 2 && r.casts.length <= 3 && r.casts.every((c) => c === 'edge'), `${Tile[tile]} cast ${r.casts.join(',')}`);
      } else {
        assert.deepEqual(r.casts, [tile === Tile.GloomStone ? 'blob' : 'contact'], `${Tile[tile]} cast ${r.casts.join(',')}`);
      }
    }
  }
});

test('BODY-RULER: the pool is walkable-sorted under the root under the stone; the stone is chest-high', () => {
  const r = rig(SEEDS[2]);
  const stone = painterFor(Tile.GloomStone)(r.host, { ...r.env, tile: Tile.GloomStone });
  const root = painterFor(Tile.CreepRoot)(r.host, { ...r.env, tile: Tile.CreepRoot });
  const pool = painterFor(Tile.FoulPool)(r.host, { ...r.env, tile: Tile.FoulPool });
  assert.ok(pool.sortY < root.sortY && root.sortY < stone.sortY);
  // The stone: 0.6s + its cap — body top past 0.7s, never past the rig's crown.
  assert.ok(stone.body!.y <= r.env.p.y - 0.7 * S, 'the stone must cover its cap');
  assert.ok(stone.body!.y > r.env.p.y - 1.3 * S, 'the stone must not balloon');
  // The root: shin-high.
  assert.ok(root.body!.y > r.env.p.y - 0.6 * S, 'the root must stay shin-high');
  // The pool: a pan with reeds — under the rig's waist.
  assert.ok(pool.body!.y > r.env.p.y - 0.7 * S, 'the pool must stay low');
  // The painted root: its tallest crown ≈0.32s + its top plane.
  const painted = rig(SEEDS[2]);
  paint(Tile.CreepRoot, painted);
  const top = Math.min(...painted.ctx.pts.map(([, y]) => y));
  const foot = painted.env.p.y + S * YS * 0.18;
  assert.ok(foot - top <= 0.5 * S, 'the root arched past the shin');
  assert.ok(foot - top >= 0.28 * S, 'the root lost its arch');
});

test('hash deals postures: one seed paints the same, the seed set paints more than one; the root deals 2 or 3', () => {
  for (const tile of THREE) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = rig(h);
      const b = rig(h);
      paint(tile, a);
      paint(tile, b);
      assert.deepEqual(a.ctx.rects, b.ctx.rects, `${Tile[tile]} h=${h} not deterministic`);
      assert.deepEqual(a.ctx.pts, b.ctx.pts, `${Tile[tile]} h=${h} not deterministic (paths)`);
      sigs.add(JSON.stringify(a.ctx.rects) + JSON.stringify(a.ctx.pts));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
  const roots = new Set<number>();
  for (const h of SEEDS) {
    const r = rig(h);
    paint(Tile.CreepRoot, r);
    // Each root paints one lit west square in the lifted char.
    roots.add(r.ctx.fills.filter((f) => f === '#3a3539').length);
  }
  assert.deepEqual([...roots].sort(), [2, 3], `the root dealt ${[...roots].join(',')} arches`);
});

test('CropBlighted rides the crop path: castFloraShadow + drawFlora, sorted at the row', () => {
  const r = rig(SEEDS[0]);
  const item = painterFor(Tile.CropBlighted)(r.host, { ...r.env, tile: Tile.CropBlighted });
  item.drawShadow!();
  item.draw!();
  assert.deepEqual(r.casts, ['flora']);
  assert.ok(r.ctx.calls.includes('drawFlora'));
  assert.equal(item.sortY, 12.75);
});

test('THE BLIGHTED ROW (crops.ts): char stalks bent 30°, gloom heads under the ink, no seed colour, no green, wind 0.4', () => {
  const gloomLuma = luma(SCAR_GLOOM);
  for (const h of SEEDS) {
    const m = plantModel(Tile.CropBlighted, h);
    const paintAt = (wind: number): RecCtx => {
      const ctx = new RecCtx();
      paintPlant(ctx as unknown as CanvasRenderingContext2D, m, {
        bx: 500, groundY: 400, s: S, wx: 3, wy: 5, tSec: 1.5, flame: 0, windOverride: wind,
      });
      return ctx;
    };
    const still = paintAt(0);
    for (const bad of ['stroke', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'clip']) {
      assert.ok(!still.calls.includes(bad), `h=${h}: the row called ${bad}`);
    }
    let heads = 0;
    for (const f of still.fills) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(f), `h=${h}: #rrggbb inks only (${f})`);
      assert.ok(!isGreen(f), `h=${h}: a living green ${f}`);
      const [rr, , bb] = rgb(f);
      assert.ok(rr - bb < 40, `h=${h}: a seed-gold ${f}`);
      if (isGloomFamily(f)) {
        heads++;
        assert.ok(luma(f) < gloomLuma, `h=${h}: a head ${f} brighter than the gloom ink`);
      } else {
        assert.ok(chroma(f) < 40, `h=${h}: a warm ink ${f}`);
      }
    }
    const nHeads = 'heads' in m ? m.heads.length : 0;
    assert.ok(nHeads > 0 && heads >= nHeads * 2, `h=${h}: the heads are not gloom (${heads} of ${nHeads})`);
    for (const rc of still.rects) assert.ok(rc.w >= 0.03 * S - 1e-6 && rc.h >= 0.03 * S - 1e-6, `h=${h}: a feature under 0.03s`);
    // Bent 30°: every stalk's tip lies at least 0.2·(upper run) to
    // one side of its knee — the row fell one way (all tips lean the
    // same sign).
    const signs = new Set<number>();
    for (let i = 0; i + 3 < still.pts.length; i += 4) {
      const [kx0] = still.pts[i]!;
      const [kx1] = still.pts[i + 1]!;
      const [tx] = still.pts[i + 2]!;
      signs.add(Math.sign(tx - (kx0 + kx1) / 2));
    }
    assert.equal(signs.size, 1, `h=${h}: the row fell more than one way`);
    // Wind 0.4: the gale moves no tip past 0.4 · 0.3 · height · s.
    const gale = paintAt(1);
    let maxDx = 0;
    for (let i = 0; i < gale.pts.length; i++) maxDx = Math.max(maxDx, Math.abs(gale.pts[i]![0] - still.pts[i]![0]));
    assert.ok(maxDx > 0, `h=${h}: the row ignores the wind`);
    assert.ok(maxDx <= 0.4 * 0.3 * m.height * S + 1e-6, `h=${h}: the row gave ${maxDx.toFixed(2)}px — more than 0.4 of the living crop`);
  }
});

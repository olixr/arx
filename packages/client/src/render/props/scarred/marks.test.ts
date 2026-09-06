import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Tile, tileEmitter } from '@arx/shared';
import { MARKS_PROPS, PANE_COLD, PANE_DARK, tallyCount, tallyRows } from './marks.js';
import { CHARTER_BRASS, LEGION_CRIMSON, SCAR_EMBER, SCAR_RAG_RED } from '../palette.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE MARKS' laws, pinned without a browser (the coldHearth.test
// pattern): the nine painters speak only fills (THE ONE RING inks the
// silhouette), no transforms (parity: the GL stage draws quads, never a
// rotated ctx), every fillRect ≥0.03s (BLOCK LAW), the lamps' panes are
// painted cold (the lights.ts row is the only warmth), the still pieces
// never read the clock while the four cloths sample ONE BREEZE and hold
// it to their law's amplitude even in a gale, the tally counts small and
// never 214/215, the thread has zero light entries, and every piece
// casts its shadow per frame through the host (SHADOWS NEVER BAKE).

const S = 64;
const YS = 0.72;

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  /** Every vertex the painter placed (moveTo/lineTo/rect corners), in order. */
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
    this.rects.push({ x, y, w, h });
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

interface Rig {
  host: PropHost;
  env: PropFrame;
  ctx: RecCtx;
  casts: string[];
  breezeCalls: number;
  glows: number;
}

/**
 * The rig. `gale` is what breezeAt answers with (px, both beats): 0
 * is the still pose, a huge number is the storm the clamp must hold.
 */
function rig(h: number, tile: Tile, gale = 0, cells: ReadonlyArray<readonly [number, number, Tile]> = []): Rig {
  const ctx = new RecCtx();
  // THE JOIN reads the world: the rig's ground is grass except the
  // cells a test lays (the thread's neighbours), keyed on world tiles.
  const ground = new Map<string, Tile>();
  for (const [x, y, t] of cells) ground.set(`${x},${y}`, t);
  const casts: string[] = [];
  const r: Rig = { host: null as unknown as PropHost, env: null as unknown as PropFrame, ctx, casts, breezeCalls: 0, glows: 0 };
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
    game: { world: { groundAt: (x: number, y: number) => ground.get(`${x},${y}`) ?? Tile.Grass } } as unknown as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t: 3.7,
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
  const row = MARKS_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no marks painter for ${Tile[tile]}`);
  return row[1];
}

const NINE = [
  Tile.CharterPost, Tile.LampCairn, Tile.LegionStandard, Tile.BoneTree, Tile.TallyStone,
  Tile.WardThread, Tile.RedRagStake, Tile.PitLamp, Tile.PitLampDark,
] as const;
/** The four cloths and their ONE BREEZE law, in tiles. */
const BREATHING: ReadonlyArray<readonly [Tile, number]> = [
  [Tile.LegionStandard, 0.06],
  [Tile.BoneTree, 0.04],
  [Tile.RedRagStake, 0.04],
  [Tile.WardThread, 0.03],
];
const STILL = [Tile.CharterPost, Tile.LampCairn, Tile.TallyStone, Tile.PitLamp, Tile.PitLampDark] as const;
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a2a2a2a, 0x13579bdf] as const;

/** Mint and paint one item (draw is optional on DrawItem; here it never is). */
function paint(r: Rig): ReturnType<PropPainter> {
  const item = painterFor(r.env.tile)(r.host, r.env);
  assert.ok(item.draw, `${Tile[r.env.tile]} minted no draw`);
  item.draw();
  return item;
}

const chroma = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const rr = n >> 16;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return Math.max(rr, g, b) - Math.min(rr, g, b);
};
/** A flame ink: bright and red-led (SCAR_EMBER, a stub's orange, brass). */
const isFlame = (hex: string): boolean => {
  const n = parseInt(hex.slice(1), 16);
  const rr = n >> 16;
  const b = n & 0xff;
  return rr >= 0xc0 && rr - b >= 0x60;
};

test('the marks speak only fills: no strokes, no transforms, no glow', () => {
  for (const tile of NINE) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const bad of ['stroke', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform']) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(r.ctx.calls.includes('fill') || r.ctx.calls.includes('fillRect'), `${Tile[tile]} painted nothing`);
      assert.equal(r.glows, 0, `${Tile[tile]} queued a glow (light is a lights.ts row)`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides, at every seed and in a gale', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of NINE) {
    for (const h of SEEDS) {
      for (const gale of [0, 1e6]) {
        const r = rig(h, tile, gale);
        paint(r);
        for (const q of r.ctx.rects) {
          assert.ok(q.w >= min && q.h >= min, `${Tile[tile]} h=${h} rect ${q.w.toFixed(2)}×${q.h.toFixed(2)} under 0.03s`);
        }
      }
    }
  }
});

test('the panes are painted COLD: the lit lamps carry no flame ink, the dark lamp soots its horn', () => {
  assert.ok(chroma(PANE_COLD) < 40, `PANE_COLD is warm (chroma ${chroma(PANE_COLD)})`);
  assert.ok(chroma(PANE_DARK) < 40, `PANE_DARK is warm (chroma ${chroma(PANE_DARK)})`);
  assert.ok(isFlame(SCAR_EMBER) && isFlame('#e8933c') && isFlame(CHARTER_BRASS), 'the flame probe knows a hot ink');
  for (const h of SEEDS) {
    for (const tile of [Tile.LampCairn, Tile.PitLamp, Tile.PitLampDark] as const) {
      const r = rig(h, tile);
      paint(r);
      const hex = r.ctx.fills.filter((f) => /^#[0-9a-f]{6}$/i.test(f));
      assert.ok(hex.length > 0, `${Tile[tile]} painted no hex ink`);
      for (const f of hex) assert.ok(!isFlame(f), `${Tile[tile]} h=${h} painted a flame ink ${f} (the row is the warmth)`);
      assert.ok(!r.ctx.fills.includes(SCAR_EMBER), `${Tile[tile]} painted SCAR_EMBER`);
      if (tile === Tile.PitLampDark) {
        assert.ok(r.ctx.fills.includes(PANE_DARK), 'the dark lamp paints its sooted pane');
      } else {
        assert.ok(r.ctx.fills.includes(PANE_COLD), `${Tile[tile]} paints the cold pane`);
        assert.ok(!r.ctx.fills.includes(PANE_DARK), `${Tile[tile]} painted the dark pane`);
      }
    }
  }
});

test('faction cloth is its own ink: the standard paints LEGION_CRIMSON, the stake SCAR_RAG_RED, and the post its brass', () => {
  const want: ReadonlyArray<readonly [Tile, string]> = [
    [Tile.LegionStandard, LEGION_CRIMSON],
    [Tile.RedRagStake, SCAR_RAG_RED],
    [Tile.CharterPost, CHARTER_BRASS],
  ];
  for (const [tile, ink] of want) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      assert.ok(r.ctx.fills.includes(ink), `${Tile[tile]} h=${h} never painted ${ink}`);
    }
  }
  // The crimson is the Legion's alone; the rag red is the reavers'.
  for (const tile of NINE) {
    if (tile === Tile.LegionStandard) continue;
    const r = rig(SEEDS[0], tile);
    paint(r);
    assert.ok(!r.ctx.fills.includes(LEGION_CRIMSON), `${Tile[tile]} borrowed the Legion's crimson`);
  }
});

test('ONE BREEZE: the four cloths sample breezeAt once per draw; the five still pieces never read the clock', () => {
  for (const [tile] of BREATHING) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      assert.equal(r.breezeCalls, 1, `${Tile[tile]} h=${h} sampled the breeze ${r.breezeCalls} times`);
    }
  }
  for (const tile of STILL) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      assert.equal(r.breezeCalls, 0, `${Tile[tile]} read the clock`);
      // Still means still: the seconds clock changes nothing.
      const late = rig(h, tile);
      late.env = { ...late.env, t: 9001.5 };
      paint(late);
      assert.deepEqual(late.ctx.verts, r.ctx.verts, `${Tile[tile]} h=${h} moved with t`);
    }
  }
});

test('ONE BREEZE holds in a gale: no vertex leaves its still pose by more than the law', () => {
  // breezeAt is mocked to answer a hurricane (±1e6 px on both beats);
  // the painter's clamp must bring every vertex back inside amp·s of
  // where it stands on a still day — both signs, every seed. This is
  // what lets the swing survive the ring-cache cadence.
  for (const [tile, amp] of BREATHING) {
    for (const h of SEEDS) {
      const still = rig(h, tile, 0);
      paint(still);
      let moved = 0;
      for (const gale of [1e6, -1e6]) {
        const storm = rig(h, tile, gale);
        paint(storm);
        assert.equal(storm.ctx.verts.length, still.ctx.verts.length, `${Tile[tile]} changed shape in the gale`);
        for (let i = 0; i < still.ctx.verts.length; i++) {
          const [ax, ay] = still.ctx.verts[i]!;
          const [bx, by] = storm.ctx.verts[i]!;
          const d = Math.hypot(bx - ax, by - ay);
          if (d > 1e-6) moved++;
          assert.ok(d <= amp * S + 1e-6, `${Tile[tile]} h=${h} vertex ${i} swung ${(d / S).toFixed(3)}s over the ${amp}s law`);
        }
      }
      assert.ok(moved > 0, `${Tile[tile]} h=${h} does not breathe at all`);
    }
  }
});

test('the tally counts small and never 214 or 215: 3..5 rows, the last unfinished', () => {
  // Every deal the hash can make (the rows read bits 5..17): walk a
  // dense sweep plus the seed set.
  const seen = new Set<number>();
  const probe = (h: number): void => {
    const { groups, rem } = tallyRows(h);
    const rows = groups.length + 1;
    assert.ok(rows >= 3 && rows <= 5, `h=${h} rows ${rows}`);
    for (const g of groups) assert.ok(g === 1 || g === 2, `h=${h} group ${g}`);
    assert.ok(rem >= 1 && rem <= 4, `h=${h} the last row must be unfinished (rem ${rem})`);
    const n = tallyCount(h);
    assert.ok(n >= 11 && n <= 44, `h=${h} the kobolds counted ${n} — small, never the year`);
    assert.notEqual(n, 214);
    assert.notEqual(n, 215);
    seen.add(n);
  };
  for (let h = 0; h < 1 << 18; h += 97) probe(h);
  for (const h of SEEDS) probe(h);
  assert.ok(seen.size > 8, `the tally has ${seen.size} counts — it should vary`);
  // And the painted ticks: every stone shows its rows as ≥0.03s fills
  // of the tally ink, none past the slab's face.
  for (const h of SEEDS) {
    const r = rig(h, Tile.TallyStone);
    paint(r);
    const { groups, rem } = tallyRows(h);
    const ticks = groups.reduce((a, g) => a + g * 4, 0) + rem;
    const bars = groups.reduce((a, g) => a + g, 0);
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
    // A tick is 0.03s × 0.065s; a bar is 0.03s tall and a group wide.
    const tickRects = r.ctx.rects.filter((q) => near(q.w, 0.03 * S) && near(q.h, 0.065 * S));
    const barRects = r.ctx.rects.filter((q) => near(q.h, 0.03 * S) && near(q.w, 0.17 * S));
    assert.equal(tickRects.length, ticks, `h=${h} painted ${tickRects.length} ticks for a count of ${tallyCount(h)}`);
    assert.equal(barRects.length, bars, `h=${h} painted ${barRects.length} bars for ${bars} full groups`);
    // Nothing runs off the face: every tick sits inside the slab's
    // half-width plus its lean.
    for (const q of tickRects) assert.ok(Math.abs(q.x + q.w * 0.5 - r.env.p.x) <= 0.34 * S, `h=${h} a tick left the stone`);
  }
});

test('the ward thread has zero light entries and is walkable', () => {
  assert.equal(tileEmitter(Tile.WardThread), undefined, 'the thread must not have a lights.ts row');
  const r = rig(SEEDS[3], Tile.WardThread);
  const item = paint(r);
  assert.equal(r.glows, 0);
  // It sorts under the standing marks (the rig steps over it).
  const post = painterFor(Tile.CharterPost)(r.host, { ...r.env, tile: Tile.CharterPost });
  assert.ok(item.sortY < post.sortY, 'the thread sorts under the post');
  // The lamps DO have rows; the dark lamp does not.
  assert.ok(tileEmitter(Tile.LampCairn), 'the cairn has its row');
  assert.ok(tileEmitter(Tile.PitLamp), 'the lit pit lamp has its row');
  assert.equal(tileEmitter(Tile.PitLampDark), undefined, 'the dark lamp has no row');
});

test('SHADOWS NEVER BAKE: each mark casts per frame through the host', () => {
  const want: Record<number, string[]> = {
    [Tile.CharterPost]: ['edge'],
    [Tile.LampCairn]: ['edge'],
    [Tile.LegionStandard]: ['edge'],
    [Tile.BoneTree]: ['edge'],
    [Tile.TallyStone]: ['edge'],
    // The thread is walkable; its two wands cast.
    [Tile.WardThread]: ['edge', 'edge'],
    [Tile.RedRagStake]: ['edge'],
    [Tile.PitLamp]: ['edge'],
    [Tile.PitLampDark]: ['edge'],
  };
  for (const tile of NINE) {
    const r = rig(SEEDS[1], tile);
    const item = painterFor(tile)(r.host, r.env);
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.deepEqual(r.casts, want[tile], `${Tile[tile]} cast ${r.casts.join(',')}`);
  }
});

test('BODY-RULER: bodies measure the painted extent against the 1.15s rig', () => {
  const at = (tile: Tile): ReturnType<PropPainter> => {
    const r = rig(SEEDS[2], tile);
    return painterFor(tile)(r.host, r.env);
  };
  const p = { x: 500, y: 400 };
  const post = at(Tile.CharterPost);
  const cairn = at(Tile.LampCairn);
  const standard = at(Tile.LegionStandard);
  const tree = at(Tile.BoneTree);
  const tally = at(Tile.TallyStone);
  const thread = at(Tile.WardThread);
  const stake = at(Tile.RedRagStake);
  const lamp = at(Tile.PitLamp);
  const dark = at(Tile.PitLampDark);
  // The post's cap peaks at the rig's chin: over 1.0s, under 1.4s.
  assert.ok(post.body!.y <= p.y - 1.0 * S && post.body!.y > p.y - 1.4 * S, 'post body');
  // The cairn is knee-to-hip: under the rig's shoulder.
  assert.ok(cairn.body!.y > p.y - 1.0 * S && cairn.body!.y <= p.y - 0.8 * S, 'cairn body');
  // The standard is the tallest mark: 2 rigs (FADE_TALL), and it never balloons.
  assert.ok(standard.body!.y <= p.y - 1.9 * S && standard.body!.y > p.y - 2.6 * S, 'standard body');
  // The bone tree's tall limb reaches over the rig's head.
  assert.ok(tree.body!.y <= p.y - 1.2 * S && tree.body!.y > p.y - 1.7 * S, 'tree body');
  // The tally stone stands at the hip.
  assert.ok(tally.body!.y > p.y - 0.9 * S && tally.body!.y <= p.y - 0.6 * S, 'tally body');
  // The thread lies lowest and widest: the tile's full breadth, shin-high.
  assert.ok(thread.body!.y > p.y - 0.6 * S, 'thread body');
  assert.ok(thread.body!.w >= 1.0 * S, 'thread body spans the tile');
  // The stake stands at the chest.
  assert.ok(stake.body!.y <= p.y - 1.0 * S && stake.body!.y > p.y - 1.4 * S, 'stake body');
  // The pit lamp is TimberPost-scale (its cap at ~1.5s); both postures share one box.
  assert.ok(lamp.body!.y <= p.y - 1.5 * S && lamp.body!.y > p.y - 1.9 * S, 'lamp body');
  assert.deepEqual(dark.body, lamp.body, 'the dark lamp shares the lit lamp\'s silhouette');
});

test('hash deals postures: one seed paints the same, the seed set paints more than one', () => {
  for (const tile of NINE) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = rig(h, tile);
      const b = rig(h, tile);
      paint(a);
      paint(b);
      assert.deepEqual(a.ctx.verts, b.ctx.verts, `${Tile[tile]} h=${h} not deterministic`);
      sigs.add(JSON.stringify(a.ctx.verts));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
});

test('the dark lamp is the lit lamp with the flame out: same silhouette, a shard in the contact shade, and no more', () => {
  for (const h of SEEDS) {
    const lit = rig(h, Tile.PitLamp);
    const dark = rig(h, Tile.PitLampDark);
    paint(lit);
    paint(dark);
    // The dark posture paints a few more pieces (the shard, the soot,
    // the missing corner) and one fewer (the pane's lit strip).
    const extra = dark.ctx.fills.length - lit.ctx.fills.length;
    assert.ok(extra >= 1 && extra <= 4, `h=${h} the dark lamp differs by ${extra} fills`);
    // The shard sits inside the foot's contact shade: within 0.22s of
    // the foot, within 0.05s of the ground line (THE ONE RING's
    // contact-shade clause — nothing shed on open ground).
    const p = dark.env.p;
    const baseY = p.y + S * YS * 0.18;
    const shard = dark.ctx.verts.slice(1, 4); // the tri after the contact ellipse's centre
    for (const [x, y] of shard) {
      assert.ok(Math.abs(x - p.x) <= 0.22 * S, `h=${h} shard x off the seat`);
      assert.ok(Math.abs(y - baseY) <= 0.05 * S, `h=${h} shard y off the ground`);
    }
  }
});

test('marks.ts: the content boundary holds and the laws are spoken in the file', () => {
  const src = readFileSync(fileURLToPath(new URL('./marks.ts', import.meta.url)), 'utf8');
  // The boundary's roster, spelled so this file never carries a word
  // it forbids (the scan reads every changed line).
  const banned = ['wi-tch', 'h-ex', 'co-ven', 'war-lock', 'de-mon', 'de-vil', 'in-fernal', 'oc-cult', 'he-ll'].map((w) => w.replace('-', ''));
  for (const word of banned) {
    assert.ok(!new RegExp(`\\b${word}`, 'i').test(src), `the boundary holds in the marks (${word.length} letters)`);
  }
  assert.ok(!/ctx\.(translate|rotate|scale|setTransform)\(/.test(src), 'no transform tricks (parity)');
  assert.ok(!/queueGlow\(/.test(src), 'nothing glows from the painter');
  assert.ok(!/[sS]moke\s*\(/.test(src), 'no painter smoke');
  assert.ok(/const ctx = rend\.ctx;/.test(src), 'draw-time ctx capture');
  assert.ok(!/h >> \d/.test(src), 'hash deals with h >>> k');
  assert.ok(!/ctx\.stroke\(|strokeRect\(|strokeStyle/.test(src), 'THE ONE RING: nothing strokes');
});

// ---------------------------------------------------------------------
// THE THREAD IS ONE LINE (contested lands band 8, owed F2): the join.
// ---------------------------------------------------------------------

/** The rig's thread sits at (10,12); its four cardinal neighbours. */
const N = [10, 11, Tile.WardThread] as const;
const E = [11, 12, Tile.WardThread] as const;
const SO = [10, 13, Tile.WardThread] as const;
const W = [9, 12, Tile.WardThread] as const;

/** A short stable digest of everything a painter put on the rig (draw, shadow, body, sort). */
function digest(r: Rig, item: ReturnType<PropPainter>): number {
  const text = JSON.stringify([r.ctx.calls, r.ctx.fills, r.ctx.verts.map(([x, y]) => [x.toFixed(6), y.toFixed(6)]), r.casts, item.body, item.sortY]);
  let d = 5381;
  for (let i = 0; i < text.length; i++) d = (Math.imul(d, 33) ^ text.charCodeAt(i)) >>> 0;
  return d;
}

/** The thread's vertices: a mint + draw + shadow on the rig, with neighbours laid. */
function threadRun(h: number, cells: ReadonlyArray<readonly [number, number, Tile]>, gale = 0): { r: Rig; item: ReturnType<PropPainter> } {
  const r = rig(h, Tile.WardThread, gale, cells);
  const item = painterFor(Tile.WardThread)(r.host, r.env);
  item.drawShadow!();
  item.draw!();
  return { r, item };
}

test('THE THREAD IS ONE LINE: a lone thread is byte-identical to the shipped glyph at every seed, calm and in a gale', () => {
  // Digests recorded off the pre-join painter (8acf9952) with the same
  // recorder: the join must not move a single vertex, fill, cast, body
  // or sort of a tile with no thread neighbour. A diagonal neighbour is
  // no neighbour (the Court strings cardinal), so it pins the same.
  const GOLDEN: Record<string, [number, number]> = {
    '305441741': [1887135818, 3684665958],
    '2147483647': [38933639, 3094456483],
    '195948557': [1887135818, 3684665958],
    '-559038737': [1887135818, 3684665958],
    '1': [2287280205, 1650598092],
    '1431655765': [3327389440, 2771800265],
    '707406378': [1887135818, 3684665958],
    '324508639': [38933639, 3094456483],
  };
  for (const h of SEEDS) {
    for (const [gi, gale] of [0, 1e6].entries()) {
      const lone = threadRun(h, [], gale);
      const diag = threadRun(h, [[11, 11, Tile.WardThread], [9, 13, Tile.WardThread]], gale);
      const want = GOLDEN[String(h)]![gi];
      assert.equal(digest(lone.r, lone.item), want, `h=${h} gale=${gale} the lone thread moved`);
      assert.equal(digest(diag.r, diag.item), want, `h=${h} gale=${gale} a diagonal neighbour joined`);
      assert.deepEqual(lone.r.casts, ['edge', 'edge'], 'the lone thread stands two wands');
    }
  }
});

test('THE THREAD IS ONE LINE: a two-tile run draws one thread and two wands, meeting at the shared edge', () => {
  for (const h of SEEDS) {
    // The west tile of a west-east pair: its east neighbour is thread.
    const west = threadRun(h, [E]);
    // The east tile of the same pair: its west neighbour is thread.
    const east = threadRun(h, [W]);
    assert.deepEqual(west.r.casts, ['edge'], 'an end stands one wand');
    assert.deepEqual(east.r.casts, ['edge'], 'an end stands one wand');
    // The wand stands at the edge facing away from the run.
    const westWand = west.r.ctx.verts[0]!;
    const eastWand = east.r.ctx.verts[0]!;
    assert.ok(westWand[0] < west.r.env.p.x - 0.4 * S, 'the west end plants its wand west');
    assert.ok(eastWand[0] > east.r.env.p.x + 0.4 * S, 'the east end plants its wand east');
    // The half thread leaves the tile at the shared edge's midpoint at
    // the thread's height (0.3s over the ground line) on BOTH sides: the
    // same world point, so the seam is invisible.
    const ground = west.r.env.p.y + S * YS * 0.18;
    const edgeY = ground - 0.3 * S;
    const westEdge = west.r.ctx.verts.filter(([x, y]) => Math.abs(x - (west.r.env.p.x + 0.5 * S)) < 0.03 * S && Math.abs(y - edgeY) < 0.03 * S);
    const eastEdge = east.r.ctx.verts.filter(([x, y]) => Math.abs(x - (east.r.env.p.x - 0.5 * S)) < 0.03 * S && Math.abs(y - edgeY) < 0.03 * S);
    assert.ok(westEdge.length >= 2, `h=${h} the west tile's thread never reaches its east edge`);
    assert.ok(eastEdge.length >= 2, `h=${h} the east tile's thread never reaches its west edge`);
    // One line: each tile paints exactly two cords (wand to knot, knot
    // to edge), so the pair paints one thread between two wands.
    const cords = (r: Rig) => r.ctx.fills.filter((f, i) => f === '#cdd8ec' && r.ctx.calls.filter((c) => c === 'fill' || c === 'fillRect')[i] === 'fill').length;
    assert.equal(cords(west.r), 2, `h=${h} the west tile paints ${cords(west.r)} cords`);
    assert.equal(cords(east.r), 2, `h=${h} the east tile paints ${cords(east.r)} cords`);
  }
});

test('THE THREAD IS ONE LINE: a straight stands no wand; a corner draws two half threads and one wand at the centre; a fork ties to one', () => {
  for (const h of SEEDS) {
    const straight = threadRun(h, [W, E]);
    assert.deepEqual(straight.r.casts, [], 'a straight run stands no wand');
    assert.ok(!straight.r.ctx.calls.includes('ellipse'), 'no wand, no contact shade');
    const tall = threadRun(h, [N, SO]);
    assert.deepEqual(tall.r.casts, [], 'a north-south straight stands no wand');
    const corner = threadRun(h, [N, E]);
    assert.deepEqual(corner.r.casts, ['edge'], 'a corner stands one wand');
    // The corner's wand stands at the tile's centre, the turn post.
    const foot = corner.r.ctx.verts[0]!;
    assert.ok(Math.abs(foot[0] - corner.r.env.p.x) < 1e-6, 'the turn wand stands on the centre line');
    // Two half threads: to the north edge and to the east edge.
    const ground = corner.r.env.p.y + S * YS * 0.18;
    const nEdge = corner.r.ctx.verts.filter(([x, y]) => Math.abs(x - corner.r.env.p.x) < 0.03 * S && Math.abs(y - (ground - 0.5 * S * YS - 0.3 * S)) < 0.03 * S);
    const eEdge = corner.r.ctx.verts.filter(([x, y]) => Math.abs(x - (corner.r.env.p.x + 0.5 * S)) < 0.03 * S && Math.abs(y - (ground - 0.3 * S)) < 0.03 * S);
    assert.ok(nEdge.length >= 2 && eEdge.length >= 2, `h=${h} the corner's half threads miss an edge`);
    const fork = threadRun(h, [N, E, W]);
    assert.deepEqual(fork.r.casts, ['edge'], 'a fork ties every half thread to one wand');
    const cross = threadRun(h, [N, E, SO, W]);
    assert.deepEqual(cross.r.casts, ['edge'], 'a cross ties every half thread to one wand');
    // Every posture samples the one breeze exactly once.
    for (const { r } of [straight, tall, corner, fork, cross]) assert.equal(r.breezeCalls, 1, 'ONE BREEZE');
  }
});

test('THE THREAD IS ONE LINE: the join holds in a gale (no vertex leaves its still pose by more than the law)', () => {
  for (const h of SEEDS) {
    for (const cells of [[E], [W, E], [N, E], [N, E, SO, W]] as const) {
      const still = threadRun(h, cells, 0);
      const gale = threadRun(h, cells, 1e6);
      assert.equal(still.r.ctx.verts.length, gale.r.ctx.verts.length, 'the gale changes no shape');
      for (let i = 0; i < still.r.ctx.verts.length; i++) {
        const [ax, ay] = still.r.ctx.verts[i]!;
        const [bx, by] = gale.r.ctx.verts[i]!;
        assert.ok(Math.hypot(ax - bx, ay - by) <= 0.03 * S + 1e-6, `h=${h} vertex ${i} blew ${Math.hypot(ax - bx, ay - by).toFixed(2)}px`);
      }
    }
  }
});

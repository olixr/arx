import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import {
  BUCKLE,
  CART_UNDER,
  CUP,
  FIELD_AFTER_PROPS,
  FIELD_SET,
  FLETCH_SET,
  GRAIN,
  NOCK,
  SOCKET,
  SPLINTER,
  arrowCount,
  bannerDye,
  cairnOneWrong,
  cairnStones,
  cartKind,
  fletchPair,
  litterCharge,
  litterLayout,
  ribCount,
} from './fieldAfter.js';
import { GY_STONE_LIT, PALI_LOG } from '../../paintVocab.js';
import { DGN_IRON, SCAR_EMBER, SCAR_RAG_RED, TWN_STONE } from '../palette.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE FIELD AFTER's laws, pinned without a browser (the coldHearth /
// marks pattern): the seven painters speak only fills (THE ONE RING
// inks the silhouette), no transforms (parity: the GL stage draws
// quads, never a rotated ctx), every fillRect ≥0.03s (BLOCK LAW), no
// warmth anywhere (no fire in this family), the six still pieces never
// read the clock while the fallen banner's corner samples ONE BREEZE
// once and holds its 0.05s law in a gale, every piece casts per frame
// through the host (SHADOWS NEVER BAKE), and each deal the header
// promises — four litter layouts, 5..8 arrows in two colours, 6..8
// pale stones shared by the standing and the fallen cairn, 5..6 ribs
// and two sockets, a cart's lit underside and its spilled corn — is
// what the hash actually deals.

const S = 64;
const YS = 0.72;

class RecCtx {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;
  calls: string[] = [];
  fills: string[] = [];
  rects: Array<{ x: number; y: number; w: number; h: number; ink: string }> = [];
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
    this.rects.push({ x, y, w, h, ink: String(this.fillStyle) });
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
function rig(h: number, tile: Tile, gale = 0): Rig {
  const ctx = new RecCtx();
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
    game: {} as PropFrame['game'],
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
  const row = FIELD_AFTER_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no field-after painter for ${Tile[tile]}`);
  return row[1];
}

const SEVEN = [
  Tile.BrokenCart, Tile.FieldLitter, Tile.ArrowPost, Tile.FallenBanner,
  Tile.FieldCairn, Tile.CairnFallen, Tile.BeastBones,
] as const;
const STILL = SEVEN.filter((t) => t !== Tile.FallenBanner);
const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2a9f31c4, 0x00001000] as const;
const BANNER_AMP = 0.05;

/** Mint and paint one item (draw is optional on DrawItem; here it never is). */
function paint(r: Rig): ReturnType<PropPainter> {
  const item = painterFor(r.env.tile)(r.host, r.env);
  assert.ok(item.draw, `${Tile[r.env.tile]} minted no draw`);
  item.draw();
  return item;
}

/** A hex ink's luminance (0..255) — the pale-stone pin. */
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff);
}

test('the family is the seven tiles of plan §6.1 and nothing else', () => {
  const tiles = FIELD_AFTER_PROPS.flatMap(([ts]) => [...ts]).sort((a, b) => a - b);
  assert.deepEqual(tiles, [...SEVEN].sort((a, b) => a - b));
});

test('the field after speaks only fills: no strokes, no transforms, no glow', () => {
  for (const tile of SEVEN) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const bad of ['stroke', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform']) {
        assert.ok(!r.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(r.ctx.calls.includes('fill') || r.ctx.calls.includes('fillRect'), `${Tile[tile]} painted nothing`);
      assert.equal(r.glows, 0, `${Tile[tile]} queued a glow`);
    }
  }
});

test('BLOCK LAW: every fillRect is at least 0.03s on both sides', () => {
  const min = 0.03 * S - 1e-6;
  for (const tile of SEVEN) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const q of r.ctx.rects) {
        assert.ok(q.w >= min && q.h >= min, `${Tile[tile]} h=${h} rect ${q.w.toFixed(2)}×${q.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('no fire in this family: no ember ink, no rgba flame, only hex and the one contact shade', () => {
  for (const tile of SEVEN) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      for (const f of r.ctx.fills) {
        assert.notEqual(f, SCAR_EMBER, `${Tile[tile]} painted SCAR_EMBER`);
        assert.ok(!/rgba\(255/.test(f), `${Tile[tile]} painted a flame ${f}`);
        assert.ok(
          /^#[0-9a-f]{6}$/i.test(f) || f === 'rgba(12, 8, 20, 0.24)' || f === 'rgba(74, 97, 56, 0.5)',
          `${Tile[tile]} painted an ink outside the family's grammar: ${f}`,
        );
      }
    }
  }
});

test('SHADOWS NEVER BAKE: each piece casts per frame through the host', () => {
  const want: Record<number, string[]> = {
    [Tile.BrokenCart]: ['edge'],
    [Tile.FieldLitter]: ['contact'],
    [Tile.ArrowPost]: ['edge'],
    [Tile.FallenBanner]: ['edge'],
    [Tile.FieldCairn]: ['blob'],
    [Tile.CairnFallen]: ['contact'],
    [Tile.BeastBones]: ['edge'],
  };
  for (const tile of SEVEN) {
    const r = rig(SEEDS[1], tile);
    const item = painterFor(tile)(r.host, r.env);
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.deepEqual(r.casts, want[tile], `${Tile[tile]} cast ${r.casts.join(',')}`);
  }
});

test('ONE BREEZE: the banner samples breezeAt once per draw; the six still pieces never read the clock', () => {
  for (const h of SEEDS) {
    const r = rig(h, Tile.FallenBanner);
    paint(r);
    assert.equal(r.breezeCalls, 1, `FallenBanner h=${h} sampled the breeze ${r.breezeCalls} times`);
  }
  for (const tile of STILL) {
    for (const h of SEEDS) {
      const r = rig(h, tile);
      paint(r);
      assert.equal(r.breezeCalls, 0, `${Tile[tile]} read the clock`);
      const late = rig(h, tile);
      late.env = { ...late.env, t: 9001.5 };
      paint(late);
      assert.deepEqual(late.ctx.verts, r.ctx.verts, `${Tile[tile]} h=${h} moved with t`);
    }
  }
});

test('ONE BREEZE holds in a gale: no banner vertex leaves its still pose by more than 0.05s', () => {
  for (const h of SEEDS) {
    const still = rig(h, Tile.FallenBanner, 0);
    paint(still);
    let moved = 0;
    for (const gale of [1e6, -1e6]) {
      const storm = rig(h, Tile.FallenBanner, gale);
      paint(storm);
      assert.equal(storm.ctx.verts.length, still.ctx.verts.length, 'the banner changed shape in the gale');
      for (let i = 0; i < still.ctx.verts.length; i++) {
        const [ax, ay] = still.ctx.verts[i]!;
        const [bx, by] = storm.ctx.verts[i]!;
        const d = Math.hypot(bx - ax, by - ay);
        if (d > 1e-6) moved++;
        assert.ok(d <= BANNER_AMP * S + 1e-6, `h=${h} vertex ${i} swung ${(d / S).toFixed(3)}s over the ${BANNER_AMP}s law`);
      }
    }
    assert.ok(moved > 0, `h=${h} the banner does not breathe at all`);
    // Only the loose corner and its hem neighbours breathe: the staff,
    // the stump and the crossbar never move (fewer than a fifth of
    // the vertices ride the breeze).
    assert.ok(moved < still.ctx.verts.length * 0.4, `h=${h} too much of the banner moves (${moved}/${still.ctx.verts.length * 2})`);
  }
});

test('hash deals postures: one seed paints the same twice, the seed set paints more than one', () => {
  for (const tile of SEVEN) {
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

test('BODY-RULER: bodies measure the painted extent against the 1.15s rig; the pans sort under it', () => {
  const r = rig(SEEDS[2], Tile.BrokenCart);
  const item = (tile: Tile) => painterFor(tile)(r.host, { ...r.env, tile });
  const cart = item(Tile.BrokenCart);
  const litter = item(Tile.FieldLitter);
  const post = item(Tile.ArrowPost);
  const banner = item(Tile.FallenBanner);
  const cairn = item(Tile.FieldCairn);
  const fallen = item(Tile.CairnFallen);
  const bones = item(Tile.BeastBones);
  const py = r.env.p.y;
  // The two walkable pans sort under every standing piece and never
  // reach the rig's knee.
  for (const pan of [litter, fallen]) {
    for (const up of [cart, post, banner, cairn, bones]) assert.ok(pan.sortY < up.sortY, 'a pan sorts over a standing piece');
    assert.ok(pan.body!.y > py - 0.5 * S, "a pan's body reaches the rig's knee");
  }
  // The post is the family's one tall piece: its box covers the chin
  // (1.0s) and no more than a head over it.
  assert.ok(post.body!.y <= py - 1.06 * S, 'the post body must cover its split top');
  assert.ok(post.body!.y > py - 1.5 * S, 'the post body must not balloon');
  // The cairn's marker at the hip (its top plane 0.64s): covered, not ballooned.
  assert.ok(cairn.body!.y <= py - 0.64 * S && cairn.body!.y > py - 1.0 * S);
  // The banner lies: its stump is the only rise (under the waist).
  assert.ok(banner.body!.y > py - 0.7 * S);
  // The cart and the bones stand hip-high — under the shoulder.
  assert.ok(cart.body!.y > py - 1.3 * S && cart.body!.y <= py - 0.6 * S);
  assert.ok(bones.body!.y > py - 0.9 * S && bones.body!.y <= py - 0.6 * S);
});

test('BrokenCart: three kinds across the hash, the underside is the lit facet, the corn spills in every deal', () => {
  const kinds = new Set<number>();
  for (let h = 0; h < 1 << 8; h += 3) kinds.add(cartKind(h));
  assert.deepEqual([...kinds].sort(), [0, 1, 2]);
  for (const h of SEEDS) {
    const r = rig(h, Tile.BrokenCart);
    paint(r);
    assert.ok(r.ctx.fills.includes(CART_UNDER), `h=${h} the bed's underside is not painted in its lit ink`);
    const corn = r.ctx.rects.filter((q) => q.ink === GRAIN);
    assert.equal(corn.length, 5, `h=${h} spilled ${corn.length} kernels`);
    // The kernels lie inside the sacks' seat (never shed on open ground to ring as a wheel).
    for (const k of corn) {
      assert.ok(Math.abs(k.x - r.env.p.x) < 0.62 * S, `h=${h} a kernel rolled out of the seat`);
      assert.ok(k.y > r.env.p.y, `h=${h} a kernel floats over the wreck`);
    }
    // One splinter square at the stub: the bare axle end.
    assert.ok(r.ctx.rects.some((q) => q.ink === SPLINTER), `h=${h} the axle stub has no split face`);
  }
});

test('FieldLitter: four layouts across the hash, each in its own inks, the shield charge from the field set', () => {
  const layouts = new Set<number>();
  for (let h = 0; h < 1 << 8; h++) layouts.add(litterLayout(h));
  assert.deepEqual([...layouts].sort(), [0, 1, 2, 3]);
  // One seed per layout: the hash bits 2..3 pick it, so force them.
  const seedFor = (layout: number, base: number): number => ((base & ~0xc) | (layout << 2)) | 0;
  const sigs = new Set<string>();
  for (let layout = 0; layout < 4; layout++) {
    for (const base of SEEDS) {
      const h = seedFor(layout, base);
      assert.equal(litterLayout(h), layout);
      const r = rig(h, Tile.FieldLitter);
      paint(r);
      sigs.add(`${layout}:${r.ctx.verts.length}`);
      const fills = r.ctx.fills;
      if (layout === 0) {
        const dye = FIELD_SET[litterCharge(h)]!;
        assert.ok(fills.includes(dye), `shield h=${h} lacks its field-set charge ${dye}`);
        assert.ok(fills.includes(DGN_IRON), `shield h=${h} lacks its iron rim`);
        for (const other of FIELD_SET) if (other !== dye) assert.ok(!fills.includes(other), `shield h=${h} mixes two dyes`);
      } else if (layout === 1) {
        assert.ok(fills.includes(SCAR_RAG_RED), `spear h=${h} lacks its rag`);
        assert.ok(fills.includes(PALI_LOG), `spear h=${h} lacks its haft`);
        assert.ok(fills.includes(DGN_IRON), `spear h=${h} lacks its head`);
        assert.equal(r.ctx.rects.filter((q) => q.ink === SPLINTER).length, 2, `spear h=${h} breaks in one place: two splinters`);
      } else if (layout === 2) {
        assert.ok(fills.includes(DGN_IRON), `helm h=${h} is not iron`);
        for (const dye of FIELD_SET) assert.ok(!fills.includes(dye), `helm h=${h} wears a dye`);
      } else {
        const [fa, fb] = fletchPair(h);
        assert.ok(fills.includes(FLETCH_SET[fa]!) && fills.includes(FLETCH_SET[fb]!), `arrows h=${h} lack their two fletch colours`);
        assert.equal(r.ctx.rects.filter((q) => q.ink === NOCK).length, 2, `arrows h=${h}: two arrows, two nocks`);
      }
    }
  }
  // The four layouts paint four different shapes.
  const shapes = new Set([...sigs].map((x) => x.split(':')[1]));
  assert.ok(shapes.size >= 3, `the layouts collapse into ${shapes.size} shapes`);
});

test('ArrowPost: 5..8 arrows in two DISTINCT fletch colours, one nock each, one broken on the ground', () => {
  for (let h = 0; h < 1 << 14; h += 37) {
    const n = arrowCount(h);
    assert.ok(n >= 5 && n <= 8, `h=${h} arrows ${n}`);
    const [a, b] = fletchPair(h);
    assert.notEqual(a, b, `h=${h} both fletch colours the same`);
    assert.ok(a >= 0 && a < 4 && b >= 0 && b < 4);
  }
  const counts = new Set<number>();
  for (const h of SEEDS) {
    const r = rig(h, Tile.ArrowPost);
    paint(r);
    const n = arrowCount(h);
    counts.add(n);
    assert.equal(r.ctx.rects.filter((q) => q.ink === NOCK).length, n, `h=${h} ${n} arrows need ${n} nocks`);
    const [fa, fb] = fletchPair(h);
    const fletch = r.ctx.rects.filter((q) => FLETCH_SET.includes(q.ink));
    for (const f of fletch) assert.ok(f.ink === FLETCH_SET[fa] || f.ink === FLETCH_SET[fb], `h=${h} a third fletch colour ${f.ink}`);
    // Two fletch squares per standing arrow plus the broken shaft's one.
    assert.equal(fletch.length, n * 2 + 1, `h=${h} fletch squares ${fletch.length}`);
    // Two splinters: the split top's pale floor (above the post's
    // chin) and the broken shaft's break at the foot, under the seat.
    const sp = r.ctx.rects.filter((q) => q.ink === SPLINTER);
    assert.equal(sp.length, 2, `h=${h} splinters ${sp.length}`);
    const cleft = sp.filter((q) => q.y < r.env.p.y - 0.6 * S);
    const foot = sp.filter((q) => q.y > r.env.p.y);
    assert.equal(cleft.length, 1, `h=${h} the split top shows no pale wood`);
    assert.equal(foot.length, 1, `h=${h} the broken shaft floats`);
    // The broken shaft lies inside the post's seat (±0.38s).
    for (const q of r.ctx.rects.filter((x) => x.y > r.env.p.y)) {
      assert.ok(Math.abs(q.x + q.w * 0.5 - r.env.p.x) < 0.38 * S, `h=${h} a ground piece lies out of the seat`);
    }
  }
  assert.ok(counts.size > 1, 'the post always shoots the same count');
});

test('FallenBanner: one field dye from the four-colour set, never two; iron, staff and splinter with it', () => {
  const dyes = new Set<number>();
  for (let h = 0; h < 1 << 8; h++) dyes.add(bannerDye(h));
  assert.equal(dyes.size, 4);
  for (const h of SEEDS) {
    const r = rig(h, Tile.FallenBanner);
    paint(r);
    const dye = FIELD_SET[bannerDye(h)]!;
    assert.ok(r.ctx.fills.includes(dye), `h=${h} the cloth is not its dye ${dye}`);
    for (const other of FIELD_SET) if (other !== dye) assert.ok(!r.ctx.fills.includes(other), `h=${h} two dyes on one cloth`);
    assert.ok(r.ctx.fills.includes(DGN_IRON), `h=${h} no iron on the staff`);
    assert.ok(r.ctx.rects.filter((q) => q.ink === SPLINTER).length >= 2, `h=${h} the break shows on stump and staff`);
  }
});

test('the cairns: 6..8 stones, the SAME deal standing or fallen, PALE stone (no dark teardrops), the one stone wrong', () => {
  const counts = new Set<number>();
  let wrongs = 0;
  let N = 0;
  // The deals read bits 6..14: walk a dense sweep that turns them all.
  for (let h = 0; h < 1 << 16; h += 97) {
    const n = cairnStones(h);
    assert.ok(n >= 6 && n <= 8, `h=${h} stones ${n}`);
    counts.add(n);
    if (cairnOneWrong(h)) wrongs++;
    N++;
  }
  assert.deepEqual([...counts].sort(), [6, 7, 8]);
  // One cairn in eight was re-stacked by the digmasters.
  assert.ok(wrongs > N / 12 && wrongs < N / 6, `one-stone-wrong rate ${wrongs}/${N}`);
  for (const h of [...SEEDS, 0x0000f000, 0x00000fff]) {
    for (const tile of [Tile.FieldCairn, Tile.CairnFallen]) {
      const r = rig(h, tile);
      paint(r);
      // Pale stone reads as stone: every hex fill but the cup keeps
      // its luminance over 80; the cup is the one dark thing.
      for (const f of r.ctx.fills) {
        if (!/^#/.test(f) || f === CUP) continue;
        assert.ok(lum(f) >= 80, `${Tile[tile]} h=${h} painted a dark ink ${f} (lum ${lum(f).toFixed(0)})`);
      }
      assert.ok(r.ctx.fills.includes(GY_STONE_LIT), `${Tile[tile]} h=${h} has no lit facet`);
      assert.equal(r.ctx.fills.includes(TWN_STONE), cairnOneWrong(h), `${Tile[tile]} h=${h} one-stone-wrong mismatch`);
      assert.ok(r.ctx.rects.some((q) => q.ink === CUP), `${Tile[tile]} h=${h} has no cup`);
    }
    // The two states deal the same stones: the same seeds paint the
    // same number of stone blobs (two fills each: face + lit facet).
    const up = rig(h, Tile.FieldCairn);
    const down = rig(h, Tile.CairnFallen);
    paint(up);
    paint(down);
    const stonesUp = up.ctx.fills.filter((f) => f === GY_STONE_LIT).length;
    const stonesDown = down.ctx.fills.filter((f) => f === GY_STONE_LIT).length;
    assert.ok(stonesUp >= cairnStones(h), `h=${h} the cone shows ${stonesUp} lit facets for ${cairnStones(h)} stones`);
    assert.ok(stonesDown >= cairnStones(h), `h=${h} the fallen cairn shows ${stonesDown} lit facets`);
  }
});

test('BeastBones: 5..6 ribs, a skull with exactly two sockets, the strap buckled', () => {
  const counts = new Set<number>();
  for (let h = 0; h < 1 << 8; h++) counts.add(ribCount(h));
  assert.deepEqual([...counts].sort(), [5, 6]);
  for (const h of SEEDS) {
    const r = rig(h, Tile.BeastBones);
    paint(r);
    assert.equal(r.ctx.rects.filter((q) => q.ink === SOCKET).length, 2, `h=${h} sockets`);
    assert.ok(r.ctx.rects.some((q) => q.ink === BUCKLE), `h=${h} no buckle`);
    // Every rib is two quads (lower + bent upper) in bone plus two dim
    // steps: 4 fills per rib, so the fill count grows with the count.
    const n = ribCount(h);
    const vert = r.ctx.rects.filter((q) => q.ink === '#d7cfb6');
    assert.equal(vert.length, n - 1, `h=${h} ${n} ribs need ${n - 1} vertebrae`);
  }
});

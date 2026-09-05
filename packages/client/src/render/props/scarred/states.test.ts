import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tile } from '@arx/shared';
import { FIELD_SET, STATES_PROPS, fenceBrokenItem, foulHash, hedgeDeadItem } from './states.js';
import { SCAR_CHAR, SCAR_EMBER } from '../palette.js';
import { STATIONS_PROPS } from '../stations.js';
import { shade } from '../../tint.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { PropFrame, PropHost, PropPainter } from '../types.js';

// THE STATES OF THE STANDING WORLD, pinned without a browser. The five
// hall painters speak fills (no strokes — THE ONE RING inks them), no
// transforms (parity: the GL stage draws quads, never a rotated ctx),
// every fillRect ≥ 0.03s (BLOCK LAW), no clock (the dead things do not
// move; only the rag and the kelp breathe, and they breathe through
// rend.breezeAt at ≤0.03s), no light, no ember ink. The fouled well is
// a TRUE wrapper: the living well's draw runs first, verbatim. The two
// run members (the broken fence, the dead hedge) return no body, stroke
// their exposed silhouette live with their families, cast per frame,
// and paint the same fills with the outline off.

const S = 64;
const YS = 0.72;
const SYT = S * YS;
const MIN = 0.03 * S - 1e-6;
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
  fills: string[] = [];
  rects: Rect[] = [];
  pts: Array<[number, number]> = [];
  beginPath(): void { this.calls.push('beginPath'); }
  closePath(): void { this.calls.push('closePath'); }
  moveTo(x: number, y: number): void { this.calls.push('moveTo'); this.pts.push([x, y]); }
  lineTo(x: number, y: number): void { this.calls.push('lineTo'); this.pts.push([x, y]); }
  quadraticCurveTo(): void { this.calls.push('quadraticCurveTo'); }
  arc(): void { this.calls.push('arc'); }
  ellipse(_x: number, _y: number, rx: number, ry: number): void {
    assert.ok(rx >= 0 && ry >= 0, 'ellipse radii must be non-negative');
    this.calls.push('ellipse');
  }
  fill(): void { this.calls.push('fill'); this.fills.push(String(this.fillStyle)); }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push('fillRect');
    this.fills.push(String(this.fillStyle));
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

const TRANSFORMS = ['save', 'restore', 'translate', 'rotate', 'scale', 'setTransform'];
const STROKES = ['stroke', 'strokeRect'];

// ---- the hall rig ------------------------------------------------------

interface HallRig {
  host: PropHost;
  env: PropFrame;
  ctx: RecCtx;
  casts: string[];
  breezes: Array<[number, number]>;
  structs: number;
}

function hallRig(h: number, tile: Tile, outlineOn = true): HallRig {
  const ctx = new RecCtx();
  const casts: string[] = [];
  const breezes: Array<[number, number]> = [];
  const out = { structs: 0 };
  const host = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    camera: { scale: S, yScale: YS },
    outlineOn,
    beginStructOutline: () => { out.structs++; },
    castEdgeQuad: () => { casts.push('edge'); },
    castBlob: () => { casts.push('blob'); },
    castContact: () => { casts.push('contact'); },
    breezeAt: (_tx: number, _ty: number, _t: number, _ph: number, s: number, ampA: number, ampB: number) => {
      breezes.push([ampA, ampB]);
      return { sway: s * ampA * 0.5, lag: s * ampB * 0.5, gust: 0.7 };
    },
    // The living well's crib variant lashes its bands through the host.
    paintStandingHoop: () => { ctx.calls.push('hoop'); },
    signHasText: () => false,
  } as unknown as PropHost;
  const p = { x: 500, y: 400 };
  const env: PropFrame = {
    tile,
    tx: 10,
    ty: 12,
    game: {} as PropFrame['game'],
    ctx: ctx as unknown as CanvasRenderingContext2D,
    p,
    s: S,
    h,
    t: 0,
    poleDye: null,
    stationBody: (hw = 1.15, up = 2.2, down = 0.8) => ({
      x: p.x - hw * S,
      y: p.y - up * S,
      w: hw * 2 * S,
      h: (up + down) * S,
    }),
  };
  const rig: HallRig = { host, env, ctx, casts, breezes, structs: 0 };
  Object.defineProperty(rig, 'structs', { get: () => out.structs });
  return rig;
}

function hallPainter(tile: Tile): PropPainter {
  const row = STATES_PROPS.find(([tiles]) => tiles.includes(tile));
  assert.ok(row, `no state painter for ${Tile[tile]}`);
  return row[1];
}

/** Paint with the clock forbidden: the dead things read no time. */
function paintNoClock(fn: () => void): void {
  const orig = performance.now;
  performance.now = () => { throw new Error('a state painter read the clock'); };
  try { fn(); } finally { performance.now = orig; }
}

function paintHall(tile: Tile, h: number, outlineOn = true): { rig: HallRig; item: ReturnType<PropPainter> } {
  const rig = hallRig(h, tile, outlineOn);
  const item = hallPainter(tile)(rig.host, rig.env);
  assert.ok(item.draw, `${Tile[tile]} minted no draw`);
  item.drawShadow?.();
  const castsAfterShadow = rig.casts.length;
  paintNoClock(() => item.draw!());
  assert.equal(rig.casts.length, castsAfterShadow, `${Tile[tile]}: draw() casts no shadow`);
  return { rig, item };
}

const SEEDS = [0x1234abcd, 0x7fffffff, 0x0badf00d, 0xdeadbeef | 0, 0x00000001, 0x55555555, 0x2468ace0, 0x13579bdf] as const;
const OWN_BRUSH = [Tile.SignpostBurnt, Tile.LampPostDark, Tile.SluiceGate, Tile.SluiceGateStrung] as const;

test('the hall four speak only fills: no strokes, no transforms, no clock, a lit body of work', () => {
  for (const tile of OWN_BRUSH) {
    for (const h of SEEDS) {
      const { rig } = paintHall(tile, h);
      for (const bad of [...TRANSFORMS, ...STROKES]) {
        assert.ok(!rig.ctx.calls.includes(bad), `${Tile[tile]} h=${h} called ${bad}`);
      }
      assert.ok(rig.ctx.rects.length + rig.ctx.calls.filter((c) => c === 'fill').length > 12, `${Tile[tile]} painted too little`);
      assert.equal(rig.structs, 0, `${Tile[tile]} rings through the cache, never a live struct stroke`);
    }
  }
});

test('BLOCK LAW: every fillRect the hall four paint is at least 0.03s on both sides', () => {
  for (const tile of OWN_BRUSH) {
    for (const h of SEEDS) {
      const { rig } = paintHall(tile, h);
      for (const r of rig.ctx.rects) {
        assert.ok(r.w >= MIN && r.h >= MIN, `${Tile[tile]} h=${h} rect ${r.w.toFixed(2)}×${r.h.toFixed(2)} under 0.03s`);
      }
    }
  }
});

test('no painted warmth: no ember ink, no rgba flame, no glow in any state', () => {
  for (const tile of [...OWN_BRUSH, Tile.WellFouled]) {
    const { rig } = paintHall(tile, SEEDS[0]);
    for (const f of rig.ctx.fills) {
      assert.ok(f !== SCAR_EMBER, `${Tile[tile]} painted SCAR_EMBER`);
      assert.ok(!/rgba\(255/.test(f), `${Tile[tile]} painted a flame ${f}`);
    }
  }
});

test('SHADOWS NEVER BAKE: each state casts per frame through the host', () => {
  const want: Record<number, number> = {
    [Tile.SignpostBurnt]: 1,
    [Tile.LampPostDark]: 1,
    [Tile.SluiceGate]: 3,
    [Tile.SluiceGateStrung]: 3,
    [Tile.WellFouled]: 1,
  };
  for (const tile of [...OWN_BRUSH, Tile.WellFouled]) {
    const rig = hallRig(SEEDS[1], tile);
    const item = hallPainter(tile)(rig.host, rig.env);
    assert.ok(item.drawShadow, `${Tile[tile]} has no drawShadow`);
    item.drawShadow();
    assert.equal(rig.casts.length, want[tile], `${Tile[tile]} cast ${rig.casts.length}`);
    for (const c of rig.casts) assert.equal(c, 'edge', `${Tile[tile]} casts edges (standing pieces)`);
  }
});

test('hash deals postures: one seed paints the same twice, the seed set paints more than one', () => {
  for (const tile of [...OWN_BRUSH, Tile.WellFouled]) {
    const sigs = new Set<string>();
    for (const h of SEEDS) {
      const a = paintHall(tile, h);
      const b = paintHall(tile, h);
      assert.deepEqual(a.rig.ctx.rects, b.rig.ctx.rects, `${Tile[tile]} h=${h} not deterministic`);
      assert.deepEqual(a.rig.ctx.pts, b.rig.ctx.pts, `${Tile[tile]} h=${h} paths not deterministic`);
      sigs.add(JSON.stringify([a.rig.ctx.rects, a.rig.ctx.pts]));
    }
    assert.ok(sigs.size > 1, `${Tile[tile]} ignores its hash across ${SEEDS.length} seeds`);
  }
});

test('BODY-RULER: bodies measure the painted extent against the 1.15s rig', () => {
  const { item: sign, rig: signRig } = paintHall(Tile.SignpostBurnt, SEEDS[2]);
  const { item: lamp } = paintHall(Tile.LampPostDark, SEEDS[2]);
  const { item: gate } = paintHall(Tile.SluiceGate, SEEDS[2]);
  const p = signRig.env.p;
  // The burnt post stands to the rig's eye line, its split top inside a 1.3s box.
  assert.ok(sign.body!.y <= p.y - 1.15 * S && sign.body!.y > p.y - 1.6 * S, 'signpost body covers the rig, no more');
  // The dark lamp's cap peaks over the rig's head (FADE_TALL): 1.8s.
  assert.ok(lamp.body!.y <= p.y - 1.64 * S && lamp.body!.y > p.y - 2.2 * S, 'lamp body reaches the cap peak');
  // The sluice bar's knob is reachable: under 1.6s over the foot.
  assert.ok(gate.body!.y <= p.y - 1.4 * S && gate.body!.y > p.y - 1.8 * S, 'sluice body reaches the bar knob');
  assert.ok(gate.body!.w >= 1.0 * S, 'the sluice spans the tile');
  // The state keeps the living sort rows.
  assert.equal(sign.sortY, 12.62);
  assert.equal(lamp.sortY, 12.8);
  assert.equal(gate.sortY, 12.64);
});

test('SignpostBurnt: the board hangs from ONE nail on the post — a corner sits on it either side', () => {
  const found = { east: false, west: false };
  for (const h of SEEDS) {
    const { rig } = paintHall(Tile.SignpostBurnt, h);
    const p = rig.env.p;
    const baseY = p.y + SYT * 0.2;
    const nailY = baseY - S * 1.06 + S * 0.22;
    for (const side of [1, -1] as const) {
      const nailX = p.x + side * S * 0.04;
      const hit = rig.ctx.pts.some(([x, y]) => Math.abs(x - nailX) < S * 0.005 && Math.abs(y - nailY) < S * 0.005);
      if (hit) {
        if (side > 0) found.east = true;
        else found.west = true;
        // The nail head is painted over that corner.
        assert.ok(
          rig.ctx.rects.some((r) => Math.abs(r.x + r.w / 2 - nailX) < 1e-6 && Math.abs(r.y + r.h / 2 - nailY) < 1e-6 && r.w >= MIN),
          `h=${h}: the nail head sits on the hung corner`,
        );
      }
    }
    assert.ok(
      rig.ctx.pts.some(([x, y]) => Math.abs(y - nailY) < S * 0.005 && Math.abs(Math.abs(x - p.x) - S * 0.04) < S * 0.005),
      `h=${h}: no board corner on the nail`,
    );
    // Blank: nothing written (the living paints its rows in a dark rgba wash).
    assert.ok(!rig.ctx.fills.some((f) => f.startsWith('rgba(48, 32, 16')), 'the burnt board is blank');
  }
  assert.ok(found.east && found.west, 'the hash deals both hangs across the seed set');
});

test('SignpostBurnt: the char wears its cold checks on the sun face only, over a silvered lower half', () => {
  const { rig } = paintHall(Tile.SignpostBurnt, SEEDS[3]);
  const p = rig.env.p;
  const baseY = p.y + SYT * 0.2;
  const yMid = baseY - S * 1.06 * 0.5;
  const checks = rig.ctx.rects.filter((r) => r.fill === CH_CHECK && Math.abs(r.w - S * 0.035) < 1e-6 && Math.abs(r.h - S * 0.035) < 1e-6);
  const postChecks = checks.filter((r) => Math.abs(r.x - (p.x - S * 0.055)) < 1e-6);
  assert.ok(postChecks.length >= 3 && postChecks.length <= 5, `3..5 checks on the post, got ${postChecks.length}`);
  for (const c of postChecks) assert.ok(c.y < yMid, 'checks live on the char half, never the silver');
});

test('LampPostDark: the pane is a dark socket with shards, one on the ground; no light, no clock', () => {
  const socket = '#100e16';
  const glassLit = shade('#7d84a0', 24);
  for (const h of SEEDS) {
    const { rig } = paintHall(Tile.LampPostDark, h);
    assert.ok(rig.ctx.fills.includes(socket), 'the socket is painted dark');
    const shards = rig.ctx.rects.filter((r) => r.fill === glassLit);
    // Two or three in the frame, one on the ground: 3..4 lit shard faces.
    assert.ok(shards.length >= 3 && shards.length <= 4, `h=${h}: shards ${shards.length}`);
    const p = rig.env.p;
    const baseY = p.y + SYT * 0.12;
    assert.ok(shards.some((r) => r.y > baseY), 'one shard lies on the ground');
    assert.ok(shards.filter((r) => r.y < baseY - S).length >= 2, 'the frame keeps two shards');
  }
});

test('the sluice: boards with one lit facet each, iron straps, a lifting bar; the strung gate adds the kelp', () => {
  const boardLit = shade(shade('#5a4226', 14), 22);
  for (const h of SEEDS) {
    const bare = paintHall(Tile.SluiceGate, h);
    const strung = paintHall(Tile.SluiceGateStrung, h);
    const boards = bare.rig.ctx.rects.filter((r) => r.fill === boardLit && r.h < S * 0.031);
    assert.ok(boards.length >= 4 && boards.length <= 5, `h=${h}: boards ${boards.length}`);
    // The bare gate never breathes; the strung gate samples ONE BREEZE once, at ≤0.03s.
    assert.equal(bare.rig.breezes.length, 0);
    assert.equal(strung.rig.breezes.length, 1);
    for (const [a, b] of strung.rig.breezes) assert.ok(a <= 0.03 && b <= 0.03, 'kelp amplitude ≤0.03s');
    // Same gate under the kelp: the strung paint is the bare paint plus strands.
    assert.deepEqual(strung.rig.ctx.rects.filter((r) => r.fill !== '#2e3a24' && r.fill !== '#3d4a2c'), bare.rig.ctx.rects, 'the strung gate keeps the bare gate');
    // THE KELP HANGS FROM THE BAR (K2c): a 0.1s knot at the lifting
    // bar, then exactly five strand quads 0.06s wide, 0.45–0.6s long,
    // crossing the boards; the lit strand leads so the mass separates
    // from the oak.
    const p = strung.rig.env.p;
    const knot = strung.rig.ctx.rects.filter((r) => r.fill === '#2e3a24');
    assert.equal(knot.length, 1, 'one kelp knot');
    assert.ok(Math.abs(knot[0]!.w - 0.1 * S) < 1e-6 && Math.abs(knot[0]!.h - 0.1 * S) < 1e-6, 'the knot is 0.1s');
    assert.ok(Math.abs(knot[0]!.x + knot[0]!.w * 0.5 - p.x) < 1e-6, 'the knot sits on the lifting bar');
    const kelpFills = strung.rig.ctx.fills.slice(bare.rig.ctx.fills.length + 2);
    assert.deepEqual(kelpFills, ['#4c6a58', '#2e3a24', '#3d4a2c', '#2e3a24', '#3d4a2c'], 'five strands, the lit one leading');
    const pts = strung.rig.ctx.pts.slice(bare.rig.ctx.pts.length);
    assert.equal(pts.length, 5 * 4, 'five strand quads');
    for (let k = 0; k < 5; k++) {
      const q = pts.slice(k * 4, k * 4 + 4);
      const w = q[1]![0] - q[0]![0];
      const len = q[2]![1] - q[0]![1];
      assert.ok(Math.abs(w - 0.06 * S) < 1e-6, `strand ${k} width ${(w / S).toFixed(3)}s`);
      assert.ok(len >= 0.45 * S - 1e-6 && len <= 0.6 * S + 1e-6, `strand ${k} length ${(len / S).toFixed(3)}s`);
      // Hung from the bar: the strand roots straddle the gate face's
      // middle and hang down over the boards (the panel top is under
      // the knot, the panel spans ≥0.52s below it).
      assert.ok(Math.abs((q[0]![0] + q[1]![0]) * 0.5 - p.x) <= 0.15 * S + 1e-6, `strand ${k} hangs across the gate face`);
      assert.ok(q[0]![1] > knot[0]!.y, `strand ${k} hangs below the knot`);
    }
  }
});

test('WellFouled: the living well draws first, VERBATIM, held to the bare windlass; then only fills', () => {
  const wellRow = STATIONS_PROPS.find(([tiles]) => tiles.includes(Tile.Well));
  assert.ok(wellRow, 'no living well');
  for (const h of SEEDS) {
    const hw = foulHash(h);
    assert.equal((hw >>> 2) % 3, 1, `h=${h}: the fouled well is the bare windlass`);
    assert.equal((hw ^ h) & ~0b1100, 0, `h=${h}: only the two top bits move`);
    const living = hallRig(hw, Tile.Well);
    const livingItem = wellRow[1](living.host, living.env);
    livingItem.draw!();
    const { rig, item } = paintHall(Tile.WellFouled, h);
    const n = living.ctx.calls.length;
    assert.deepEqual(rig.ctx.calls.slice(0, n), living.ctx.calls, `h=${h}: the living well runs first, call for call`);
    assert.deepEqual(rig.ctx.rects.slice(0, living.ctx.rects.length), living.ctx.rects, `h=${h}: the living rects are untouched`);
    const own = rig.ctx.calls.slice(n);
    assert.ok(own.length > 30, 'the state paints a body of work over the living');
    for (const bad of [...TRANSFORMS, ...STROKES]) assert.ok(!own.includes(bad), `the fouling called ${bad}`);
    for (const r of rig.ctx.rects.slice(living.ctx.rects.length)) {
      assert.ok(r.w >= MIN && r.h >= MIN, `fouling rect ${r.w.toFixed(2)}×${r.h.toFixed(2)} under 0.03s`);
    }
    // The living's body, sort and shadow carry through the wrapper.
    assert.deepEqual(item.body, livingItem.body);
    assert.equal(item.sortY, livingItem.sortY);
    // The rag is dealt from the four-colour field set and breathes once, ≤0.03s.
    const ownFills = rig.ctx.fills.slice(living.ctx.fills.length);
    assert.ok(ownFills.some((f) => FIELD_SET.includes(f)), `h=${h}: the rag wears a field colour`);
    assert.equal(rig.breezes.length, 1);
    for (const [a, b] of rig.breezes) assert.ok(a <= 0.03 && b <= 0.03, 'rag amplitude ≤0.03s');
    // The mouth goes near-black under the gloom wash.
    assert.ok(ownFills.includes('#0c0a10') && ownFills.some((f) => f.startsWith('rgba(127, 140, 196')), 'black water under a gloom wash');
  }
});

test('WellFouled: the reed heap covers the whole parked pail on the west rim', () => {
  // The living bare windlass parks its pail at (p.x − 0.44·ringR,
  // ringTop − 0.1·ery): body ±0.083s wide, from 0.186s above (the bail)
  // to 0.027s below. Every corner of that extent lies under the heap.
  const { rig } = paintHall(Tile.WellFouled, SEEDS[4]);
  const p = rig.env.p;
  const ringR = S * 0.46;
  const ery = ringR * 0.36;
  const ringTop = p.y + SYT * 0.42 - S * 0.55;
  const hx = p.x - ringR * 0.44;
  const hy = ringTop - ery * 0.1;
  const mound = rig.ctx.rects.find((r) => r.fill === '#5c5038' && r.w >= S * 0.19);
  assert.ok(mound, 'the heap paints its mound');
  assert.ok(mound.x <= hx - S * 0.083 && mound.x + mound.w >= hx + S * 0.083, 'the mound spans the pail');
  assert.ok(mound.y + mound.h >= hy + S * 0.027, 'the mound reaches under the pail foot');
  // The bail arc's crown (0.186s above, ±0.05s wide) sits under the mound's top ellipse: rx 0.1, ry 0.055 at hy − 0.17.
  for (const dx of [-0.05, 0, 0.05]) {
    const arcY = -0.1 - Math.sqrt(0.086 * 0.086 - dx * dx);
    const ellTop = -0.17 - 0.055 * Math.sqrt(1 - (dx / 0.1) ** 2);
    assert.ok(ellTop <= arcY, `the mound's crown covers the bail at dx=${dx}`);
  }
});

// ---- the run rig -----------------------------------------------------

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
    occlusionOn: false,
    camera: {
      q: 0,
      scale: S,
      yScale: YS,
      worldToScreen: (wx: number, wy: number) => ({ x: wx * S, y: wy * SYT }),
    },
    porchAt: () => false,
    beginStructOutline: () => { out.structs++; },
    castEdgeQuad: (x0: number, y0: number, x1: number, y1: number, hT: number) => { casts.push([x0, y0, x1, y1, hT]); },
    castContact: () => { throw new Error('the run members cast edges, not contacts'); },
    castBlob: () => { throw new Error('the run members cast edges, not blobs'); },
  } as unknown as PaintHost;
  return out;
}

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

type RunItem = ReturnType<typeof fenceBrokenItem>;

function paintRun(r: RunRig, mint: (host: PaintHost, tx: number, ty: number, game: ClientGame) => RunItem): RunItem {
  const item = mint(r.host, 10, 12, r.game);
  item.drawShadow?.();
  const castsAfterShadow = r.casts.length;
  paintNoClock(() => item.draw!());
  assert.equal(r.casts.length, castsAfterShadow, 'draw() casts no shadow');
  return item;
}

for (const [name, mint, living, sortY] of [
  ['FenceBroken', fenceBrokenItem, Tile.Fence, 12.8],
  ['HedgeDead', hedgeDeadItem, Tile.Hedge, 13],
] as const) {
  const kin = living === Tile.Fence ? Tile.FenceBroken : Tile.HedgeDead;

  test(`${name}: every posture speaks fills and struct strokes only, at or above the minimum feature, no clock`, () => {
    for (const [posture, cells] of Object.entries(POSTURES)) {
      const r = runRig(cells(kin));
      const item = paintRun(r, mint);
      assert.equal(item.body, undefined, `${posture}: a run member returns no body (the ring is stroked live)`);
      assert.equal(item.sortY, sortY, `${posture}: sorts with its family`);
      for (const bad of TRANSFORMS) assert.ok(!r.ctx.calls.includes(bad), `${posture}: no ${bad} (parity: quads only)`);
      for (const q of r.ctx.rects) {
        assert.ok(q.w >= MIN && q.h >= MIN, `${posture}: fillRect ${q.w.toFixed(2)}x${q.h.toFixed(2)} under 0.03s`);
      }
      const fills = r.ctx.calls.filter((c) => c === 'fill').length;
      assert.ok(r.ctx.rects.length + fills > 10, `${posture}: paints a body of work`);
      assert.ok(r.structs > 0, `${posture}: rings its exposed silhouette at struct weight`);
      assert.ok(r.ctx.calls.includes('stroke'), `${posture}: strokes the ring`);
      assert.ok(r.casts.length > 0, `${posture}: casts a shadow per frame`);
      for (const c of r.casts) assert.ok(c[4] > 0 && c[4] <= 1, `${posture}: cast height in tiles`);
    }
  });

  test(`${name}: with the outline off nothing strokes and the paint is unchanged`, () => {
    for (const posture of ['lone', 'tee', 'nsThrough']) {
      const on = runRig(POSTURES[posture]!(kin), true);
      const off = runRig(POSTURES[posture]!(kin), false);
      paintRun(on, mint);
      paintRun(off, mint);
      assert.equal(off.structs, 0);
      assert.ok(!off.ctx.calls.includes('stroke') && !off.ctx.calls.includes('strokeRect'));
      assert.deepEqual(off.ctx.rects, on.ctx.rects, `${posture}: the ring is additive — the fills do not move`);
      const fillsOn = on.ctx.calls.filter((c) => c === 'fill' || c === 'fillRect');
      const fillsOff = off.ctx.calls.filter((c) => c === 'fill' || c === 'fillRect');
      assert.deepEqual(fillsOff, fillsOn);
    }
  });

  test(`${name}: joins its LIVING family's run mask — the living kin is kin, the other family is not`, () => {
    const stranger = living === Tile.Fence ? Tile.Hedge : Tile.Fence;
    const alone = runRig([[10, 12, kin]]);
    paintRun(alone, mint);
    // North/south neighbours: an isolated member already shows its
    // full E-W build, so only a N-S kin changes what it casts.
    const withLiving = runRig([[10, 11, living], [10, 12, kin], [10, 13, living]]);
    paintRun(withLiving, mint);
    const withStranger = runRig([[10, 11, stranger], [10, 12, kin], [10, 13, stranger]]);
    paintRun(withStranger, mint);
    assert.notDeepEqual(withLiving.casts, alone.casts, 'the living neighbours change the cast');
    assert.deepEqual(withStranger.casts, alone.casts, 'a stranger family beside it is no kin');
  });

  test(`${name}: deterministic per tile, and the hash deals across tiles`, () => {
    const sigs = new Set<string>();
    for (let k = 0; k < 6; k++) {
      const cells: Cell[] = [[9, 12, kin], [10, 12, kin], [11, 12, kin]];
      const a = runRig(cells);
      const b = runRig(cells);
      // Tile hashes come from (tx, ty); vary the row to deal new seeds.
      const ty = 12 + k * 7;
      const shifted = cells.map(([x, , t]) => [x, ty, t] as Cell);
      const ra = runRig(shifted);
      const rb = runRig(shifted);
      const ia = mint(ra.host, 10, ty, ra.game);
      const ib = mint(rb.host, 10, ty, rb.game);
      ia.draw!();
      ib.draw!();
      assert.deepEqual(ra.ctx.rects, rb.ctx.rects, `ty=${ty} not deterministic`);
      assert.deepEqual(ra.ctx.pts, rb.ctx.pts, `ty=${ty} paths not deterministic`);
      // Normalise the row out of the signature: keep widths/heights and x only.
      sigs.add(JSON.stringify(ra.ctx.rects.map((q) => [Math.round(q.x), Math.round(q.w), Math.round(q.h), q.fill])));
      void a;
      void b;
    }
    assert.ok(sigs.size > 1, `${name} ignores its hash across six rows`);
  });
}

test('FenceBroken: the stubs reach STUB into the tile from every built seam, the post drops its own anchor', () => {
  const STUB = 0.16;
  const px = 10.5 * S;
  const baseY = 12.5 * SYT + SYT * 0.14;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const lone = runRig(POSTURES.lone!(Tile.FenceBroken));
  paintRun(lone, fenceBrokenItem);
  // Alone: the post's anchor, the hanging rail's run, the lying rail — no stubs.
  assert.equal(lone.casts.length, 3);
  assert.ok(lone.casts.some((c) => near(c[0], px - S * 0.085) && near(c[2], px + S * 0.085) && near(c[4], 0.8)), 'the post anchors');
  // In a LIVING run: the neighbours' rails reach the seam, the stubs
  // reach back.
  const ew = runRig([[9, 12, Tile.Fence], [10, 12, Tile.FenceBroken], [11, 12, Tile.Fence]]);
  paintRun(ew, fenceBrokenItem);
  assert.equal(ew.casts.length, 5);
  assert.ok(ew.casts.some((c) => near(c[0], px - S * 0.5) && near(c[2], px - S * 0.5 + STUB * S) && near(c[1], baseY)), 'the west stub');
  assert.ok(ew.casts.some((c) => near(c[0], px + S * 0.5 - STUB * S) && near(c[2], px + S * 0.5) && near(c[1], baseY)), 'the east stub');
  const ns = runRig([[10, 11, Tile.Fence], [10, 12, Tile.FenceBroken], [10, 13, Tile.Fence]]);
  paintRun(ns, fenceBrokenItem);
  assert.equal(ns.casts.length, 5);
  // Two breaks side by side: NO stub toward the other break (their
  // stubs would join into one torn rail floating at the seam, held by
  // nothing) — but the run still lies east-west, so the pieces fall
  // along it. A break between a living post and a break stubs once.
  const pair = runRig(POSTURES.ewThrough!(Tile.FenceBroken));
  paintRun(pair, fenceBrokenItem);
  assert.equal(pair.casts.length, 3, 'no stub reaches for another break');
  const half = runRig([[9, 12, Tile.Fence], [10, 12, Tile.FenceBroken], [11, 12, Tile.FenceBroken]]);
  paintRun(half, fenceBrokenItem);
  assert.equal(half.casts.length, 4, 'one stub, toward the living post');
  assert.ok(half.casts.some((c) => near(c[0], px - S * 0.5) && near(c[2], px - S * 0.5 + STUB * S)), 'the west stub only');
  assert.ok(ns.casts.some((c) => near(c[1], baseY - SYT * 0.5) && near(c[3], baseY - SYT * (0.5 - STUB))), 'the north stub');
  assert.ok(ns.casts.some((c) => near(c[1], baseY + SYT * (0.5 - STUB)) && near(c[3], baseY + SYT * 0.5)), 'the south stub');
  // The stubs end on the run's seam (baseY ± 0.5·syT, the fence
  // datum); nothing LOOSE lies past the tile's own south edge.
  const runSeam = baseY + SYT * 0.5;
  const tileSeam = 13 * SYT;
  for (const c of ns.casts) assert.ok(c[1] <= runSeam + 1e-6 && c[3] <= runSeam + 1e-6, 'every cast stays on the run');
  const loose = ns.casts.filter((c) => !(near(c[1], baseY + SYT * (0.5 - STUB)) && near(c[3], runSeam)));
  assert.equal(loose.length, 4);
  for (const c of loose) assert.ok(c[1] <= tileSeam + 1e-6 && c[3] <= tileSeam + 1e-6, 'the fallen pieces lie inside the tile');
  // Walls are fence-kin too (the living fence's own law).
  const wall = runRig([[9, 12, Tile.WallWood], [10, 12, Tile.FenceBroken]]);
  paintRun(wall, fenceBrokenItem);
  assert.equal(wall.casts.length, 4, 'a house wall to the west is a built seam');
});

test('FenceBroken: the ink is staged — a piece behind the post never inks over the post face', () => {
  // Every posture strokes at least twice (behind/post, then front) when
  // a piece lies behind, and the post's own ring always strokes.
  for (const [posture, cells] of Object.entries(POSTURES)) {
    const r = runRig(cells(Tile.FenceBroken));
    paintRun(r, fenceBrokenItem);
    const strokes = r.ctx.calls.filter((c) => c === 'stroke').length;
    assert.ok(strokes >= 1 && strokes <= 3, `${posture}: ${strokes} staged strokes`);
    assert.equal(r.structs, strokes, `${posture}: every stroke is a struct stroke`);
  }
});

test('HedgeDead: the same clipped volume as the living hedge — its casts, its sort, its foot-anchored depth', () => {
  const px = 10.5 * S;
  const baseY = 12.5 * SYT + SYT * 0.4;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const lone = runRig(POSTURES.lone!(Tile.HedgeDead));
  const item = paintRun(lone, hedgeDeadItem);
  assert.equal(lone.casts.length, 1, 'an isolated planting casts its full E-W panel');
  assert.ok(near(lone.casts[0]![0], px - S * 0.5) && near(lone.casts[0]![2], px + S * 0.5) && near(lone.casts[0]![1], baseY));
  assert.equal(item.nearRow, undefined, 'nearRow follows occlusionOn (off in the rig)');
  const occl = runRig(POSTURES.lone!(Tile.HedgeDead));
  (occl.host as unknown as { occlusionOn: boolean }).occlusionOn = true;
  assert.equal(hedgeDeadItem(occl.host, 10, 12, occl.game).nearRow, 13, 'foot-anchored volume depth, the wall law');
  const ns = runRig(POSTURES.nsThrough!(Tile.HedgeDead));
  paintRun(ns, hedgeDeadItem);
  assert.equal(ns.casts.length, 2, 'a N-S through run casts north and south');
  const ew = runRig(POSTURES.ewThrough!(Tile.HedgeDead));
  paintRun(ew, hedgeDeadItem);
  assert.equal(ew.casts.length, 1, 'an E-W through run casts one panel');
});

test('HedgeDead: no leaf, no sway — twigs in char and ash, and ONE tile in five wears cold checks', () => {
  const leaf = ['#2f5c31', '#4c8342'];
  let burnt = 0;
  const N = 60;
  for (let k = 0; k < N; k++) {
    const tx = 10 + (k % 8) * 3;
    const ty = 12 + Math.floor(k / 8) * 5;
    const r = runRig([[tx, ty, Tile.HedgeDead]]);
    const item = hedgeDeadItem(r.host, tx, ty, r.game);
    paintNoClock(() => item.draw!());
    for (const f of r.ctx.fills) assert.ok(!leaf.includes(f), `tile ${tx},${ty} painted living leaf ${f}`);
    // Twigs: char or ash quads — 6..9 of them (plus forks) as fills after the crown.
    const twigFills = r.ctx.fills.filter((f) => f === SCAR_CHAR || f === '#8d8a90').length;
    assert.ok(twigFills >= 6, `tile ${tx},${ty}: ${twigFills} twig quads`);
    if (r.ctx.fills.includes(CH_CHECK)) burnt++;
  }
  assert.ok(burnt >= N * 0.08 && burnt <= N * 0.36, `one tile in five burns (got ${burnt}/${N})`);
});

// TEMPORARY blade verification harness (checked-in tooling): THE
// BLADE SHEET — the one-hand masterwork audit. Every masterwork sword
// and dagger drawn LARGE in the held-item frame, animated on the world
// clock, ringed by a faithful simulation of the renderer's outline
// dilate, next to the bronze references for scale. The two audits this
// sheet exists to run:
//   1. SILHOUETTE — does every piece read at a glance inside the dark
//      ring, with no detail so fine it dissolves?
//   2. THE LIVING WORD — does each signature fx read as ITS word
//      (lantern gutters, sand falls, moon waxes) at sheet scale?
// Levers:
//   ?only=<id>   draw one blade huge, centered
//   ?s=<px>      body scale per cell (default 240)
//   ?hurt=1      the flat white hurt-flash silhouettes
import { SWORD_STYLES, DAGGER_STYLES, drawSword } from '../render/weapons.js';
import { itemDef, movesetFor } from '@arx/content';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const HURT = q.get('hurt') === '1';
const S = Number(q.get('s') ?? 320);

// The sheet roster: bronze references first, then the masterworks in
// bracket order — swords down the left half, daggers down the right.
const SWORD_IDS = [
  'bronze_sword', 'weathervane', 'chainbreaker', 'lamplight', 'reefwrack',
  'hollowmoon', 'quarryheart', 'silverlace', 'riven', 'silver_line', 'northlight',
];
const DAGGER_IDS = [
  'bronze_dagger', 'cindersnip', 'larkspur', 'latchkey', 'mothlight',
  'undertow', 'vesper', 'lodestone', 'silverthread', 'eclipse', 'borrowed_time',
];

const OUTLINE = '#241a2e';
const COLS = 2; // sword column, dagger column — big cells, honest read
const CELL_W = 830;
const CELL_H = 112;

// Scratch for the outline simulation (the renderer's 8-tap dilate).
const scratch = document.createElement('canvas');
scratch.width = CELL_W;
scratch.height = CELL_H * 2;
const sctx = scratch.getContext('2d')!;
const tinted = document.createElement('canvas');
tinted.width = CELL_W;
tinted.height = CELL_H * 2;
const tctx = tinted.getContext('2d')!;

function paintOutlined(
  dest: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  s: number,
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  // Art into scratch A, in cell-local space.
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.translate(s * 0.3, CELL_H);
  paint(sctx);
  // Tint A's alpha into B, then stamp B eight ways under the art —
  // the same ring weight law as paintHeldOutlined (ring ≈ s * 0.04).
  const ring = Math.max(1.25, s * 0.04 * 0.5);
  const rd = Math.round(ring * 0.71);
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, tinted.width, tinted.height);
  tctx.drawImage(scratch, 0, 0);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = OUTLINE;
  tctx.fillRect(0, 0, tinted.width, tinted.height);
  tctx.globalCompositeOperation = 'source-over';
  for (const [ox, oy] of [
    [ring, 0], [-ring, 0], [0, ring], [0, -ring],
    [rd, rd], [rd, -rd], [-rd, rd], [-rd, -rd],
  ] as const) {
    dest.drawImage(tinted, dx - s * 0.3 + ox, dy - CELL_H + oy);
  }
  dest.drawImage(scratch, dx - s * 0.3, dy - CELL_H);
}

function frame(nowMs: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'top';

  if (ONLY) {
    const st = SWORD_STYLES[ONLY] ?? DAGGER_STYLES[ONLY];
    if (!st) return;
    const s = S * 3;
    paintOutlinedHuge(nowMs, s, ONLY);
    return;
  }

  const rows = Math.max(SWORD_IDS.length, DAGGER_IDS.length);
  for (let col = 0; col < COLS; col++) {
    const ids = col === 0 ? SWORD_IDS : DAGGER_IDS;
    for (let row = 0; row < rows; row++) {
      const id = ids[row];
      if (!id) continue;
      const st = SWORD_STYLES[id] ?? DAGGER_STYLES[id];
      if (!st) continue;
      const x0 = col * CELL_W + 90; // room for the butt furniture — a clipped pommel audits nothing
      const y0 = row * CELL_H + 40;
      // The body-scale ruler: a faint post one grip-width tall, so
      // every blade is audited against the same fist.
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 2, y0 + CELL_H * 0.5 - 0.026 * S, 4, 0.052 * S);
      paintOutlined(ctx, x0, y0 + CELL_H * 0.5, S, (c) => {
        drawSword(c, st, S, nowMs, HURT);
      });
      // The label rides BESIDE its blade — a sheet where a name can
      // be read against the wrong row is an audit that lies.
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '13px monospace';
      ctx.fillText(id, x0 + S * 0.62, y0 + CELL_H * 0.5 - 6);
      // THE WEAPON'S OWN HAND: the audit sheet names the fight too.
      const wpn = itemDef(id)?.weapon;
      const page = wpn ? movesetFor(wpn, id) : null;
      if (page) {
        ctx.fillStyle = 'rgba(232, 182, 76, 0.55)';
        ctx.font = '11px monospace';
        ctx.fillText(page.name, x0 + S * 0.62, y0 + CELL_H * 0.5 + 8);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
      }
    }
  }
  requestAnimationFrame(frame);
}

function paintOutlinedHuge(nowMs: number, s: number, id: string): void {
  const st = SWORD_STYLES[id] ?? DAGGER_STYLES[id]!;
  const big = document.createElement('canvas');
  big.width = canvas.width;
  big.height = canvas.height;
  const bctx = big.getContext('2d')!;
  bctx.translate(canvas.width * 0.28, canvas.height * 0.5);
  drawSword(bctx, st, s, nowMs, HURT);
  const ring = Math.max(1.25, s * 0.02);
  const rd = Math.round(ring * 0.71);
  const tint = document.createElement('canvas');
  tint.width = big.width;
  tint.height = big.height;
  const ttx = tint.getContext('2d')!;
  ttx.drawImage(big, 0, 0);
  ttx.globalCompositeOperation = 'source-in';
  ttx.fillStyle = OUTLINE;
  ttx.fillRect(0, 0, tint.width, tint.height);
  for (const [ox, oy] of [
    [ring, 0], [-ring, 0], [0, ring], [0, -ring],
    [rd, rd], [rd, -rd], [-rd, rd], [-rd, -rd],
  ] as const) ctx.drawImage(tint, ox, oy);
  ctx.drawImage(big, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '20px monospace';
  ctx.fillText(id, 40, 30);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

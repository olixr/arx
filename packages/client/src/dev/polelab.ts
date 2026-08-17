// TEMPORARY polearm verification harness (checked-in tooling): THE
// POLE SHEET — the reaching school's armory audit. All twenty
// polearms drawn LARGE in the held-item axis frame, animated on the
// world clock, ringed by a faithful simulation of the renderer's
// outline dilate, each beside the same grip-width ruler. The audits
// this sheet exists to run:
//   1. SILHOUETTE — does every head read as ITS weapon inside the
//      dark ring, with no chip, wing, or tooth so fine it dissolves?
//   2. THE BESPOKE WORD — does each entry's one idea (the crossbar,
//      the crescent hole, the skull boss, the constellation) read at
//      sheet scale without a label?
//   3. THE LADDER — laid in roster order, does the line escalate
//      bronze → starsteel, working iron → heirloom?
// Levers:
//   ?only=<id>   draw one pole huge, centered
//   ?s=<px>      body scale per cell (default 260)
//   ?hurt=1      the flat white hurt-flash silhouettes
import { POLE_STYLES, drawPole } from '../render/weapons.js';
import { itemDef } from '@arx/content';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const HURT = q.get('hurt') === '1';
const S = Number(q.get('s') ?? 260);

// Roster order: the forge line's eight, then the bespoke twelve in
// level order — the sheet reads as the climb the player makes.
const POLE_IDS = [
  'spear', 'iron_spear', 'steel_spear', 'gold_spear',
  'mithril_spear', 'adamant_spear', 'obsidian_spear', 'starsteel_spear',
  'boar_spear', 'iron_pike', 'watch_halberd', 'steel_glaive',
  'steel_pike', 'silver_partisan', 'knights_lance', 'moonglaive',
  'fellwinter_lance', 'gatewarden_halberd', 'heavens_reach', 'dawnlance',
];

const OUTLINE = '#241a2e';
const COLS = 2;
const CELL_W = 990;
const CELL_H = 120;
// The butt sits at -0.44 of the frame and pikes run past +0.85·s —
// the origin needs real room on both sides of the cell.
const ORIGIN_X = 190;

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
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.translate(ORIGIN_X, CELL_H);
  paint(sctx);
  // The renderer's 8-tap dilate at the held ring weight (≈ s·0.04
  // world, halved here the way bladelab halves it for sheet scale).
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
    dest.drawImage(tinted, dx - ORIGIN_X + ox, dy - CELL_H + oy);
  }
  dest.drawImage(scratch, dx - ORIGIN_X, dy - CELL_H);
}

function frame(nowMs: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'top';

  if (ONLY) {
    paintOutlinedHuge(nowMs, S * 2.2, ONLY);
    return;
  }

  const rows = Math.ceil(POLE_IDS.length / COLS);
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < rows; row++) {
      const id = POLE_IDS[col * rows + row];
      if (!id) continue;
      const st = POLE_STYLES[id];
      if (!st) continue;
      const x0 = col * CELL_W + ORIGIN_X;
      const y0 = row * CELL_H + 40 + CELL_H * 0.5;
      // The body-scale ruler: a faint post one grip-width tall, so
      // every head is audited against the same fist.
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 2, y0 - 0.026 * S, 4, 0.052 * S);
      paintOutlined(ctx, x0, y0, S, (c) => {
        drawPole(c, st, S, nowMs, HURT);
      });
      // The label rides BESIDE its pole — a sheet where a name can be
      // read against the wrong row is an audit that lies.
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '13px monospace';
      ctx.fillText(id, x0 + S * 0.9, y0 - 6);
      const wpn = itemDef(id)?.weapon;
      if (wpn) {
        ctx.fillStyle = 'rgba(232, 182, 76, 0.55)';
        ctx.font = '11px monospace';
        ctx.fillText(`dmg ${wpn.damage} · reach ${wpn.range}`, x0 + S * 0.9, y0 + 8);
      }
    }
  }
  requestAnimationFrame(frame);
}

function paintOutlinedHuge(nowMs: number, s: number, id: string): void {
  const st = POLE_STYLES[id];
  if (!st) return;
  const big = document.createElement('canvas');
  big.width = canvas.width;
  big.height = canvas.height;
  const bctx = big.getContext('2d')!;
  bctx.translate(canvas.width * 0.46, canvas.height * 0.5);
  drawPole(bctx, st, s, nowMs, HURT);
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

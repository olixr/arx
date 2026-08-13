// TEMPORARY staff verification harness (checked-in tooling): THE
// STAFF SHEET — the archmage masterwork audit, bladelab's sibling.
// Every masterwork staff drawn LARGE in the held-item frame at the
// icon grip (0.5, mass centered), animated on the world clock, ringed
// by the renderer's outline-dilate simulation, beside the plain ladder
// staff and a ten-voices benchmark. A slow cast pulse cycles so THE
// PRESENT gets audited too: every focus must visibly flare.
// The three audits this sheet runs:
//   1. SILHOUETTE — shaft, waist, crown all read inside the dark ring
//   2. THE LIVING WORD — each signature fx reads as ITS word
//   3. THE FLARE — the cast swell reads on every crown
// Levers:
//   ?only=<id>   one staff, huge
//   ?s=<px>      body scale per cell (default 190)
//   ?hurt=1      flat white hurt-flash silhouettes
//   ?cast=0      pin castT to 0 (rest-state audit)
import { STAFF_STYLES, drawStaff } from '../render/weapons.js';
import { itemDef, movesetFor } from '@arx/content';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const HURT = q.get('hurt') === '1';
const CAST = q.get('cast') !== '0';
const S = Number(q.get('s') ?? 190);

// Bracket order, references first in each column.
const LEFT = [
  'carved_staff', 'dowser', 'swarmsong', 'merelight', 'knellwood',
  'glassgather', 'duskcap', 'meridian', 'stormjar',
];
const RIGHT = [
  'skythrone', 'escapement', 'lastsheaf', 'mirrormere', 'ashgarden',
  'hollowchoir', 'spindrift', 'wakestone',
];

const OUTLINE = '#241a2e';
const CELL_W = 850;
const CELL_H = 142;
const GRIP = 0.5;

const scratch = document.createElement('canvas');
scratch.width = CELL_W;
scratch.height = CELL_H * 2;
const sctx = scratch.getContext('2d')!;
const tinted = document.createElement('canvas');
tinted.width = CELL_W;
tinted.height = CELL_H * 2;
const tctx = tinted.getContext('2d')!;

function paintOutlined(
  dx: number,
  dy: number,
  s: number,
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.translate(0.85 * s, CELL_H);
  paint(sctx);
  const ring = Math.max(1.25, s * 0.02);
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
    ctx.drawImage(tinted, dx - 0.85 * s + ox, dy - CELL_H + oy);
  }
  ctx.drawImage(scratch, dx - 0.85 * s, dy - CELL_H);
}

function frame(nowMs: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'top';
  // The cast pulse: a slow rise, a snap, a rest — every focus must
  // answer it. ?cast=0 pins the rest state instead.
  const castT = CAST && !HURT ? Math.max(0, Math.sin(nowMs * 0.0012)) ** 3 : 0;

  if (ONLY) {
    const st = STAFF_STYLES[ONLY];
    if (st) {
      paintOutlined(canvas.width * 0.45, canvas.height * 0.5, S * 2.6, (c) => {
        drawStaff(c, st, S * 2.6, nowMs, HURT, GRIP, castT);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '20px monospace';
      ctx.fillText(ONLY, 40, 30);
    }
    requestAnimationFrame(frame);
    return;
  }

  for (let col = 0; col < 2; col++) {
    const ids = col === 0 ? LEFT : RIGHT;
    for (let row = 0; row < ids.length; row++) {
      const id = ids[row];
      if (!id) continue;
      const st = STAFF_STYLES[id];
      if (!st) continue;
      const x0 = col * CELL_W + 180;
      const y0 = row * CELL_H + 40;
      paintOutlined(x0, y0 + CELL_H * 0.5, S, (c) => {
        drawStaff(c, st, S, nowMs, HURT, GRIP, castT);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '13px monospace';
      ctx.fillText(id, x0 + S * 0.92, y0 + CELL_H * 0.5 - 6);
      // THE WEAPON'S OWN HAND: the audit sheet names the fight too.
      const wpn = itemDef(id)?.weapon;
      const page = wpn ? movesetFor(wpn, id) : null;
      if (page) {
        ctx.fillStyle = 'rgba(232, 182, 76, 0.55)';
        ctx.font = '11px monospace';
        ctx.fillText(page.name, x0 + S * 0.92, y0 + CELL_H * 0.5 + 8);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
      }
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/**
 * THE OUTLINE LAW, ported (play3d S1). The 2D renderer's painters are
 * fill-only; the dark ring every body, tree and prop wears is an 8-tap
 * alpha DILATE composited UNDER the art (Renderer.bakeOutlineRing).
 * The 3D client bakes the same ring into every sprite texture at paint
 * time — it is what makes a billboard read as THIS game's art against
 * lit geometry (the July spike's single biggest cohesion win).
 *
 * Integer tap offsets (a bake, not a live blit — quantization is
 * allowed), the same ring colour, the same destination-over landing.
 * One module-level scratch canvas grows to the largest request and is
 * never re-minted.
 */

const RING = '#241a2e';
const TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

let scratch: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

function takeScratch(w: number, h: number): CanvasRenderingContext2D {
  if (!scratch || !scratchCtx) {
    scratch = document.createElement('canvas');
    scratchCtx = scratch.getContext('2d')!;
  }
  if (scratch.width < w) scratch.width = w;
  if (scratch.height < h) scratch.height = h;
  return scratchCtx;
}

/**
 * Ring the art already painted into `ctx`'s canvas (pixel rect
 * 0..pw × 0..ph) with a dilate of radius `r` px, landed under the art.
 */
export function outlineRing(ctx: CanvasRenderingContext2D, pw: number, ph: number, r: number): void {
  const src = ctx.canvas;
  const ri = Math.max(1, Math.round(r));
  const rd = Math.max(1, Math.round(r * 0.71));
  const o = takeScratch(pw, ph);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over';
  o.clearRect(0, 0, o.canvas.width, o.canvas.height);
  for (const [tx, ty] of TAPS) {
    const diag = tx !== 0 && ty !== 0;
    o.drawImage(src, 0, 0, pw, ph, tx * (diag ? rd : ri), ty * (diag ? rd : ri), pw, ph);
  }
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = RING;
  o.fillRect(0, 0, pw, ph);
  o.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(o.canvas, 0, 0, pw, ph, 0, 0, pw, ph);
  ctx.restore();
}

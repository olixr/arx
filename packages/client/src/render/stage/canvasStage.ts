/**
 * The canvas2d stage — the ORACLE and the FALLBACK (plan §1 law 2).
 *
 * This backend exists so that "correct" is never a matter of opinion:
 * it consumes the identical item stream through the identical dest
 * math and produces the frame with the renderer's own native
 * toolchain. Every GL parity proof diffs against it; every context
 * loss falls back to it; the Display toggle selects it. It is not a
 * shim to be retired — it is the epic's ground truth, kept green in
 * CI for as long as the stage exists.
 */
import { BLEND_CANVAS_OP, blendNeedsAlphaTarget } from './stageBlend.js';
import type { StageBackend, StageItem } from './stageTypes.js';

export class CanvasStage implements StageBackend {
  readonly kind = 'canvas' as const;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas2d unavailable');
    this.ctx = ctx;
  }

  begin(w: number, h: number, dpr: number, clear: string): void {
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.dpr = dpr;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // The target is OPAQUE by contract (stageBlend's multiply/screen
    // reductions depend on it): the clear is a paint, not a wipe.
    ctx.fillStyle = clear;
    ctx.fillRect(0, 0, w, h);
  }

  draw(items: readonly StageItem[]): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    for (const it of items) {
      if (it.kind === 'paint') {
        // The live lane: the brush runs against the frame's own base
        // transform, exactly as painters have always been called.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        it.paint(ctx);
        continue;
      }
      if (blendNeedsAlphaTarget(it.blend)) {
        // The main target is opaque by contract; an alpha-erasing
        // blend here would diverge from the GL backbuffer silently.
        // Phase A3's layer targets accept it; the main frame refuses.
        throw new Error('stage: alpha-target blend on the opaque main target');
      }
      const m = it.m;
      // device = dpr · (m · local): the same composition, in the same
      // multiplication order, as glStage's CPU corner math — parity
      // is arithmetic, not coincidence.
      ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
      ctx.globalAlpha = it.alpha;
      ctx.globalCompositeOperation = BLEND_CANVAS_OP[it.blend]!;
      if (it.kind === 'fill') {
        ctx.fillStyle = `#${it.color.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, it.dw, it.dh);
      } else {
        ctx.imageSmoothingEnabled = it.tex.filter === 'linear';
        ctx.drawImage(it.tex.canvas, it.sx, it.sy, it.sw, it.sh, 0, 0, it.dw, it.dh);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  end(): void {
    // canvas2d presents implicitly; nothing to flush.
  }
}

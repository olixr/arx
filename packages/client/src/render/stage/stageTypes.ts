/**
 * THE PAINTED WORLD TAKES THE STAGE — the draw-item seam (phase A0).
 *
 * This module is the ONLY contract between the frame's content and the
 * thing that puts it on screen. Everything the composite needs is
 * expressed as a sorted stream of StageItems; two backends consume the
 * same stream — the WebGL2 compositor (glStage) and the canvas2d
 * oracle (canvasStage). The laws this file carries
 * (docs/painted-stage-plan.md §1, §5):
 *
 *  - THE ORDER IS THE SORT. The stream arrives in painter's order and
 *    a backend may never reorder it. Batching (stageBatch) merges only
 *    ADJACENT items that share state.
 *  - THE TEXTURE IS THE CANVAS'S SHADOW. A StageTexture wraps a canvas
 *    the paint factory owns; `rev` is bumped by whoever repaints it,
 *    and the backend syncs lazily. Release is explicit — the caches
 *    stay the owners, and their byte ledgers stay the truth.
 *  - Coordinates are CSS pixels; the backend owns the device-pixel
 *    ratio. Call sites keep snapping on the DEVICE GRID exactly as
 *    they always have — the numbers inside `m` are already snapped
 *    when snapping matters, and the stage multiplies them exactly.
 */

/**
 * Composite-path blend modes. This is deliberately the SMALL set the
 * measured frame actually composites with (plan §2.3) — the exotic
 * canvas modes (source-in, destination-in, source-atop) live inside
 * bake ceremonies on the canvas side and never reach the stage.
 * soft-light is absent on purpose: it exists only in the post pass,
 * which becomes its own shader in phase A4.
 */
export const enum StageBlend {
  SourceOver = 0,
  Lighter = 1,
  Multiply = 2,
  Screen = 3,
  DestinationOut = 4,
  DestinationOver = 5,
}

/**
 * A texture handle: the shadow of a canvas the paint factory owns.
 * Created and released through the backend (ONE LIFECYCLE); `rev` is
 * the sync contract — bump it after painting and the next draw that
 * references the handle re-uploads. Nothing here is GL-specific: the
 * canvas oracle reads `canvas` directly and ignores the rest.
 */
export interface StageTexture {
  readonly canvas: HTMLCanvasElement;
  /** Content version. Bump after every repaint of `canvas`. */
  rev: number;
  /** Sampling for scaled blits — 'linear' matches the renderer's
   *  imageSmoothingEnabled=true default. */
  filter: 'linear' | 'nearest';
}

/**
 * The dest-space convention, chosen to match how every existing blit
 * already thinks: `m = [a, b, c, d, e, f]` maps DEST-LOCAL pixels —
 * the rectangle [0..dw]×[0..dh] in CSS units — into CSS screen space:
 *
 *   screen.x = a·x + c·y + e
 *   screen.y = b·x + d·y + f
 *
 * An axis-aligned 9-arg drawImage(dx,dy,dw,dh) is m=[1,0,0,1,dx,dy].
 * The tree shear, the grass-cell shear, the mask throw are all plain
 * values of (b,c). The backend composes the devicePixelRatio itself,
 * with exact multiplication, so both backends compute IDENTICAL
 * device coordinates from identical items.
 */
export type StageMatrix = readonly [number, number, number, number, number, number];

/** The identity dest transform at (dx, dy). */
export function stageAt(dx: number, dy: number): StageMatrix {
  return [1, 0, 0, 1, dx, dy];
}

/** A textured quad: `src` rect of the texture's canvas (device px of
 *  that canvas), drawn as a [0..dw]×[0..dh] rect through `m`. */
export interface StageQuad {
  kind: 'quad';
  tex: StageTexture;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
  m: StageMatrix;
  /** globalAlpha equivalent, 0..1. */
  alpha: number;
  blend: StageBlend;
}

/** A solid-color quad (particles, punch rects, debug fills): same
 *  geometry contract, no texture. `color` is 0xRRGGBB; `alpha` is the
 *  opacity. On the GL side this is a white-texel quad with a
 *  premultiplied vertex color — it batches with everything else. */
export interface StageFill {
  kind: 'fill';
  color: number;
  dw: number;
  dh: number;
  m: StageMatrix;
  alpha: number;
  blend: StageBlend;
}

/**
 * A live-painted item: a canvas2d closure that must run a real brush
 * this frame (THE STILL-WORLD BARGAIN's lane — cache misses, water,
 * anything not yet migrated). The canvas backend runs it in place; the
 * GL backend does not accept it until phase A2 introduces the
 * scratch-quad lane, and ASSERTS if one arrives before then — a
 * silent skip would be the round-7 invisibility bug reborn.
 */
export interface StagePaint {
  kind: 'paint';
  paint: (ctx: CanvasRenderingContext2D) => void;
}

export type StageItem = StageQuad | StageFill | StagePaint;

/**
 * A backend consumes one frame as begin → draw(stream) → end. `clear`
 * paints the frame's ground color first (the renderer's void color);
 * both backends treat the target as OPAQUE — the multiply/screen
 * blend mappings in stageBlend.ts depend on it and say so.
 */
export interface StageBackend {
  readonly kind: 'gl' | 'canvas';
  /** Frame start: CSS viewport size, device pixel ratio, clear color. */
  begin(w: number, h: number, dpr: number, clear: string): void;
  /** Composite one sorted stream. Order is law. */
  draw(items: readonly StageItem[]): void;
  /** Frame end: flush everything to the backend's canvas. */
  end(): void;
}

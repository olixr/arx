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
  /** The wrapped canvas. MUTABLE on purpose: the pooled caches swap
   *  a successor canvas into an entry at bake completion (round 11's
   *  chunk pool), and the handle follows — retarget the field and
   *  bump `rev`, and the next ensure/draw uploads the new content
   *  into the same GL texture (the ledger absorbs any size change). */
  canvas: HTMLCanvasElement;
  /** Content version. Bump after every repaint of `canvas`. */
  rev: number;
  /** Sampling for scaled blits — 'linear' matches the renderer's
   *  imageSmoothingEnabled=true default. */
  filter: 'linear' | 'nearest';
  /**
   * THE DIRT LIST (the atlas's economy): rects repainted since the
   * last upload, in canvas px. A backend that can subupload consumes
   * them with texSubImage2D and clears the list; absent or oversized
   * dirt falls back to the full upload. Producers PUSH, the GL
   * backend CLEARS — the canvas backend reads pixels live and never
   * touches it.
   */
  dirty?: Array<[number, number, number, number]>;
  /**
   * THE STALE BAKE STILL SERVES (foundation audit): an OLDER upload
   * of this handle shows the SAME content, merely behind — so a
   * draw-time refresh may defer under upload-budget pressure and
   * bind the previous texels instead (chunk grounds, band bakes:
   * successive revs are successive repaints of one world surface).
   * Leave unset for handles whose cells REMAP between revs (atlas
   * pages — a stale page shows the wrong sprite in a re-placed cell,
   * which is corruption, not lag). A missing record always uploads:
   * never a hole.
   */
  staleOk?: boolean;
  /** Exempt from the GL orphan sweep (atlas pages: long-lived shared
   *  targets whose 16.8MB re-upload on return is exactly the arrival
   *  cost the sweep must not manufacture). Pinned handles die only by
   *  explicit release or context loss. */
  pinned?: boolean;
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
 * this frame (THE STILL-WORLD BARGAIN's lane — bodies, cache misses,
 * anything not yet quad-native). The closure paints in SCREEN
 * coordinates exactly as painters always have; `px..ph` is the
 * screen-space CSS rect the paint may touch. BOTH backends clip to
 * it — the GL scratch by its canvas edge, the oracle by an explicit
 * clip — so an undersized bounds shows as the SAME visible defect on
 * both, and the fat-margin proof method applies (round 8). Bounds
 * are part of the item's honesty, not a hint.
 */
export interface StagePaint {
  kind: 'paint';
  px: number;
  py: number;
  pw: number;
  ph: number;
  paint: (ctx: CanvasRenderingContext2D) => void;
  /** THE SCRATCH LEDGER: a paint that names its identity and content
   *  version keeps a cached texture in the GL backend — the closure
   *  runs (and the texture uploads) ONLY when `rev` changes. Content
   *  must be box-anchored (the closure's output at a fixed offset
   *  from px/py regardless of camera), or the cache would smear.
   *  Omitted = the classic live lane: repaint + upload every frame. */
  key?: number;
  rev?: number;
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
  /** Frame start: CSS viewport size, device pixel ratio, clear color.
   *  `null` clears TRANSPARENT — legal only on an alpha stage (the
   *  world layer composites over the 2d ground); an opaque stage
   *  refuses it, and an alpha stage refuses the opaque-only blends
   *  (multiply/screen) — the two halves of one symmetry. */
  begin(w: number, h: number, dpr: number, clear: string | null): void;
  /** Composite one sorted stream. Order is law. */
  draw(items: readonly StageItem[]): void;
  /**
   * THE SHADOW LAYER RIDES THE STAGE (A3): render `items` into an
   * offscreen ALPHA layer (overlapping shadows land opaque and merge
   * into one density instead of stacking — the layer's whole point),
   * then composite the layer over the current target ONCE at
   * `alpha`. Inside the layer the alpha-target blends
   * (destination-out — the interior punch) are legal on EITHER
   * stage; the opaque-only blends stay refused. Call between begin()
   * and the frame's world draw()s.
   */
  drawLayer(items: readonly StageItem[], alpha: number): void;
  /** Frame end: flush everything to the backend's canvas. */
  end(): void;
}

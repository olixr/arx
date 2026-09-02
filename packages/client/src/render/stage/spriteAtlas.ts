/**
 * THE SPRITE ATLAS (painted-stage, Epic A's closer) — small sprite
 * bakes pack into shared 2048² pages so the GL lane binds a handful of
 * textures instead of thousands, and a cadence re-bake uploads a
 * dirty RECT instead of a page. The measured case (crown, 20×): 581
 * draws over 2,221 textures, 5MB/frame of texImage2D — switch- and
 * upload-bound. The atlas is the cure the plan deferred until the
 * numbers ordered it; the numbers have ordered it.
 *
 * Laws:
 * - THE GUTTER IS EDGE-REPLICATED. Two texels of breathing room per
 *   side, filled by stretching the sprite's own 1px edges (and
 *   corners) outward — linear sampling under zoom glide reads the
 *   sprite's rim, never a neighbor and never transparent black. A
 *   halo'd edge is exactly the "weird edge" the style forbids.
 * - REPAINT IN PLACE when the rebake keeps its size (the cadence
 *   case); reallocate when it grows. Every repaint pushes a dirty
 *   rect onto the page's StageTexture — the GL backend consumes rects
 *   with texSubImage2D and only falls back to a full upload when the
 *   dirt covers most of the page.
 * - THE PAGE FORGETS THE COLD. A page whose reclaimable area (stale
 *   slots + dead cells) outweighs its live area is wiped whole and
 *   refills lazily — allocation stays a bump pointer, never a
 *   free-list. Dead cells are FIRST-CLASS: a slot abandoned by a
 *   size change (and a GC'd sprite canvas) leaves area the bump
 *   pointer can never reuse; the sweep tallies it by AREA via the
 *   ledger's slot handles, so a fragmented page reclaims instead of
 *   silently exhausting the atlas into the solo-texture regime.
 * - TOO BIG RIDES ALONE. Anything over MAX_SIDE keeps its solo
 *   texture; bands, layers and chunk bakes were never atlas material.
 */
import type { StageTexture } from './stageTypes.js';

export const ATLAS_PAGE = 2048;
export const ATLAS_MAX_SIDE = 512;
const GUT = 2;
// Twenty pages = 320MB ceiling — tree-scale sprites (~400px) pack ~25
// to a page and a padded forest wants hundreds resident; eight pages
// measured 66 packed / 478 solo in the forest census. Page bytes ride
// the GL store's own 512MB budget, and pages beat the same sprites
// riding solo on both bytes and binds.
const MAX_PAGES = 20;
const STALE_FRAMES = 900;
const SWEEP_EVERY = 600;

export interface AtlasSlot {
  readonly page: AtlasPage;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  rev: number;
  /** THE SHADOW IS KEYED BY THE CANVAS, TWO-AXIS (A2's hard lesson):
   *  a pooled canvas handed to a new owner repaints unconditionally. */
  owner: object;
  used: number;
}

export interface AtlasPage {
  readonly cv: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly tex: StageTexture;
  shelves: Array<{ y: number; h: number; x: number }>;
  top: number;
  slots: number;
  stale: number;
  /** Area (px²) of cells no live canvas maps to — unreachable until a
   *  wipe. Accrued by the sweep as it compacts the ledger. */
  deadPx: number;
}

export interface AtlasPlacement {
  tex: StageTexture;
  ox: number;
  oy: number;
}

export class SpriteAtlas {
  private readonly pages: AtlasPage[] = [];
  private readonly slots = new WeakMap<HTMLCanvasElement, AtlasSlot>();
  /** Per-page slot list for the sweep (WeakRef so a dead sprite canvas
   *  never pins its slot). Each entry carries ITS slot so a GC'd or
   *  superseded (re-sized) placement still confesses its area as dead
   *  space — and the sweep compacts stale entries instead of letting
   *  the list grow one duplicate per re-size forever. */
  private readonly ledger = new Map<
    AtlasPage,
    Array<{ ref: WeakRef<HTMLCanvasElement>; slot: AtlasSlot }>
  >();
  private revSeq = 1;
  private frameNo = 0;

  constructor(
    private readonly mkCanvas: (w: number, h: number) => HTMLCanvasElement = (w, h) => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      return cv;
    },
  ) {}

  /** Advance the atlas clock; sweep cold pages on cadence.
   *
   *  The sweep judges by AREA, not entry count: an entry whose canvas
   *  is gone or whose slot was superseded by a re-size is dead space
   *  (compacted out of the ledger, its area banked in page.deadPx);
   *  the rest split stale/live on the ~30s touch clock. A page is
   *  wiped when the cold outweighs the warm — stale area past live
   *  area, or a substantially-allocated page more than half
   *  reclaimable — so fragmentation can never permanently exhaust
   *  the atlas. */
  frame(): void {
    this.frameNo++;
    if (this.frameNo % SWEEP_EVERY !== 0) return;
    for (const page of this.pages) {
      const list = this.ledger.get(page) ?? [];
      let livePx = 0;
      let stalePx = 0;
      const keep: Array<{ ref: WeakRef<HTMLCanvasElement>; slot: AtlasSlot }> = [];
      for (const e of list) {
        const cv = e.ref.deref();
        if (!cv || this.slots.get(cv) !== e.slot) {
          page.deadPx += e.slot.w * e.slot.h;
          continue;
        }
        if (this.frameNo - e.slot.used > STALE_FRAMES) stalePx += e.slot.w * e.slot.h;
        else livePx += e.slot.w * e.slot.h;
        keep.push(e);
      }
      this.ledger.set(page, keep);
      const packedPx = page.top * ATLAS_PAGE;
      if (
        (livePx === 0 && page.top > 0) ||
        stalePx > livePx ||
        (page.top > ATLAS_PAGE * 0.75 && page.deadPx + stalePx > packedPx * 0.5)
      )
        this.wipe(page);
    }
  }

  /** Place (or refresh) a sprite canvas; null = rides alone.
   *  THE USED REGION: `uw`/`uh` name the sprite's actual ink rect in
   *  device px — pooled canvases are size-class rounded (and a pool
   *  hit can be oversized), so fitness and packing judge the ink,
   *  never the backing store. Omitted = the whole canvas. */
  place(
    canvas: HTMLCanvasElement,
    rev: number,
    owner: object,
    uw?: number,
    uh?: number,
  ): AtlasPlacement | null {
    const w = Math.min(uw ?? canvas.width, canvas.width);
    const h = Math.min(uh ?? canvas.height, canvas.height);
    if (w > ATLAS_MAX_SIDE || h > ATLAS_MAX_SIDE || w === 0 || h === 0) return null;
    let slot = this.slots.get(canvas);
    if (slot && (slot.w !== w + GUT * 2 || slot.h !== h + GUT * 2)) {
      slot = undefined; // grew or shrank — the old cell is dead space until the sweep
    }
    if (!slot) {
      const fresh = this.alloc(w + GUT * 2, h + GUT * 2);
      if (!fresh) return null;
      slot = fresh;
      this.slots.set(canvas, slot);
      (this.ledger.get(slot.page) ?? this.ledger.set(slot.page, []).get(slot.page)!).push({
        ref: new WeakRef(canvas),
        slot,
      });
      slot.rev = rev - 1; // force the first paint
      slot.owner = owner;
    }
    slot.used = this.frameNo;
    if (slot.rev !== rev || slot.owner !== owner) {
      slot.rev = rev;
      slot.owner = owner;
      this.paint(slot, canvas);
    }
    return { tex: slot.page.tex, ox: slot.x + GUT, oy: slot.y + GUT };
  }

  /** Paint the sprite into its cell with edge-replicated gutters and
   *  hand the backend the dirty rect. */
  private paint(slot: AtlasSlot, cv: HTMLCanvasElement): void {
    const { page, x, y, w, h } = slot;
    const iw = w - GUT * 2;
    const ih = h - GUT * 2;
    const c = page.ctx;
    c.clearRect(x, y, w, h);
    // Sub-rect blit: only the used region (the slot was sized from
    // it) — a pooled canvas's rounding slack never reaches the page.
    c.drawImage(cv, 0, 0, iw, ih, x + GUT, y + GUT, iw, ih);
    // Edge replication: stretch each 1px rim into the gutter, then
    // pin the four corners from the corner texels.
    c.drawImage(cv, 0, 0, iw, 1, x + GUT, y, iw, GUT); // top
    c.drawImage(cv, 0, ih - 1, iw, 1, x + GUT, y + h - GUT, iw, GUT); // bottom
    c.drawImage(cv, 0, 0, 1, ih, x, y + GUT, GUT, ih); // left
    c.drawImage(cv, iw - 1, 0, 1, ih, x + w - GUT, y + GUT, GUT, ih); // right
    c.drawImage(cv, 0, 0, 1, 1, x, y, GUT, GUT);
    c.drawImage(cv, iw - 1, 0, 1, 1, x + w - GUT, y, GUT, GUT);
    c.drawImage(cv, 0, ih - 1, 1, 1, x, y + h - GUT, GUT, GUT);
    c.drawImage(cv, iw - 1, ih - 1, 1, 1, x + w - GUT, y + h - GUT, GUT, GUT);
    page.tex.rev = ++this.revSeq;
    (page.tex.dirty ??= []).push([x, y, w, h]);
  }

  private alloc(w: number, h: number): AtlasSlot | null {
    for (const page of this.pages) {
      const s = this.allocIn(page, w, h);
      if (s) return s;
    }
    if (this.pages.length < MAX_PAGES) {
      const cv = this.mkCanvas(ATLAS_PAGE, ATLAS_PAGE);
      const page: AtlasPage = {
        cv,
        ctx: cv.getContext('2d')!,
        tex: { canvas: cv, rev: ++this.revSeq, filter: 'linear', pinned: true },
        shelves: [],
        top: 0,
        slots: 0,
        stale: 0,
        deadPx: 0,
      };
      this.pages.push(page);
      return this.allocIn(page, w, h);
    }
    return null;
  }

  private allocIn(page: AtlasPage, w: number, h: number): AtlasSlot | null {
    // Best-fit shelf: the tightest height that still fits — first-fit
    // measured tall shelves squandered on short sprites, and shelf
    // height is the one packing decision that can never be revisited.
    let best: { y: number; h: number; x: number } | null = null;
    for (const shelf of page.shelves) {
      if (h <= shelf.h && shelf.x + w <= ATLAS_PAGE && (best === null || shelf.h < best.h))
        best = shelf;
    }
    if (best !== null) {
      const slot: AtlasSlot = { page, x: best.x, y: best.y, w, h, rev: 0, owner: this, used: this.frameNo };
      best.x += w;
      page.slots++;
      return slot;
    }
    if (page.top + h <= ATLAS_PAGE) {
      const shelf = { y: page.top, h, x: w };
      page.shelves.push(shelf);
      page.top += h;
      page.slots++;
      return { page, x: 0, y: shelf.y, w, h, rev: 0, owner: this, used: this.frameNo };
    }
    return null;
  }

  /** Forget everything on a mostly-cold page; residents re-place lazily. */
  private wipe(page: AtlasPage): void {
    const list = this.ledger.get(page) ?? [];
    for (const { ref } of list) {
      const cv = ref.deref();
      if (cv && this.slots.get(cv)?.page === page) this.slots.delete(cv);
    }
    this.ledger.set(page, []);
    page.shelves = [];
    page.top = 0;
    page.slots = 0;
    page.deadPx = 0;
    page.ctx.clearRect(0, 0, ATLAS_PAGE, ATLAS_PAGE);
    page.tex.rev = ++this.revSeq;
    // The clear must REACH the GPU. `dirty = undefined` intended a
    // whole-page upload, but a page is only ever synced when drawn,
    // and drawing means a same-frame place() whose paint() re-arms
    // the dirty list — so the backend's dirty-rect branch won every
    // time and the page-wide clear never uploaded (stale dead pixels
    // lived on in the GPU copy). A full-page dirty rect says the
    // same thing in the one dialect sync() always honors.
    page.tex.dirty = [[0, 0, ATLAS_PAGE, ATLAS_PAGE]];
  }

  /** Forget every page — the plane-cross broom (consumers re-place
   *  lazily, exactly like a page wipe). */
  clear(): void {
    for (const page of this.pages) this.wipe(page);
  }

  /** Confession counters. */
  stats(): { pages: number; slots: number; deadPx: number } {
    return {
      pages: this.pages.length,
      slots: this.pages.reduce((n, p) => n + p.slots, 0),
      deadPx: this.pages.reduce((n, p) => n + p.deadPx, 0),
    };
  }
}

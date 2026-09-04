/**
 * THE SHELF (play3d S1) — a pure shelf packer for sprite atlas pages.
 *
 * Sprites arrive in whatever order the world streams them, so the
 * packer is ONLINE: it never reorders, never rejects a page-fitting
 * rect for the sake of a tighter layout, and never moves a placed rect
 * (its UVs are already baked into instance buffers). Shelves are rows;
 * a rect opens a new shelf when the current one cannot take it. The
 * waste is bounded and the law is simple — the right trade for art
 * that is painted once and uploaded once.
 */

export interface PackedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ShelfPacker {
  private shelfY = 0;
  private shelfH = 0;
  private cursorX = 0;
  /** Pixels placed (for the fill-rate confession in the HUD). */
  used = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    /** Transparent margin kept around every rect (bilinear bleed guard). */
    readonly pad = 2,
  ) {}

  /** Place a w×h rect; null when the page cannot take it. */
  insert(w: number, h: number): PackedRect | null {
    const pw = w + this.pad * 2;
    const ph = h + this.pad * 2;
    if (pw > this.width || ph > this.height) return null;
    if (this.cursorX + pw > this.width) {
      // Open a new shelf below the current one.
      this.shelfY += this.shelfH;
      this.shelfH = 0;
      this.cursorX = 0;
    }
    if (this.shelfY + ph > this.height) return null;
    const rect = { x: this.cursorX + this.pad, y: this.shelfY + this.pad, w, h };
    this.cursorX += pw;
    if (ph > this.shelfH) this.shelfH = ph;
    this.used += pw * ph;
    return rect;
  }

  /** Fraction of the page area consumed by placed rects (incl. pads). */
  get fill(): number {
    return this.used / (this.width * this.height);
  }
}

/**
 * THE FACE ATLAS (play3d W2 scaffold) — every structure face texture,
 * painted ONCE by the 2D painters into shelf-packed pages, uploaded
 * once, shared by every chunk. The SpriteAtlas pattern (sprites.ts)
 * spoken for faces instead of sprites:
 *
 *  - A face TILE is minted by KEY (`family/material/variant/height/skin`
 *    — the lane composes it) and reused forever after. Two chunks
 *    holding the same wall stretch hit the same rect.
 *  - THE PAGE IS UPLOADED ONCE: 2048² sRGB CanvasTexture, resident
 *    blank the moment it is minted (`Backend.prepareTexture`), each
 *    tile landed after that by a SUB-RECT blit (`Backend.blit`); the
 *    page canvas stays as the CPU mirror for a context restore. Mips
 *    regenerate once per page per `flush`.
 *  - THE PAD WEARS THE EDGE: the shelf pad is 8 px and, for an opaque
 *    tile, is filled by REPLICATING the tile's own border pixels, so
 *    mip levels never blend a wall face with transparent black at its
 *    rim (a fence card leaves its pad clear — its edge IS transparent).
 *  - UV CONVENTION (structureFace.ts faceUV): u = 0 at the west end,
 *    1 at the east; v = 0 at the GROUND BASE, 1 at the crown. The
 *    painter callback receives a ctx whose origin is the tile's top-
 *    left; the face's base is at canvas y = h. `faceFrame` in
 *    stubHost.ts translates to the 2D painters' face-local frame (y
 *    rising negative from the base).
 *  - Pixel density: FACE_PX per tile. A story wall face is
 *    1 × WALL_H tiles → 48 × 98 px. Lanes may paint at another scale
 *    by keying it.
 */
import * as THREE from 'three';
import { ShelfPacker } from '../atlasPack.js';
import type { Backend } from '../stageBackend.js';

/** Face texture density, px per world tile. */
export const FACE_PX = 48;
export const FACE_PAGE_PX = 2048;
/** Shelf pad: with mips, a 2 px pad bleeds neighbours from level 2 on. */
export const FACE_PAD_PX = 8;

export interface FaceRef {
  page: number;
  /** Atlas rect: u0/v0 = the tile's base-west corner, u1/v1 = crown-east. */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Canvas pixel size of the tile. */
  w: number;
  h: number;
}

/** Paint a w×h tile with the origin at its top-left (base at y = h). */
export type FacePainter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface FaceSpec {
  w: number;
  h: number;
  paint: FacePainter;
  /**
   * Replicate the border into the pad (opaque prisms: true, the
   * default). Alpha-cut cards pass false so their pad stays clear.
   */
  bleed?: boolean;
}

interface PendingRect {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

interface FacePage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  packer: ShelfPacker;
  tex: THREE.CanvasTexture;
  pending: PendingRect[];
}

export class FaceAtlas {
  readonly pages: FacePage[] = [];
  private readonly refs = new Map<string, FaceRef>();
  /** Confession counters: tiles minted, page uploads, sub-rect blits. */
  tiles = 0;
  uploads = 0;
  blits = 0;

  constructor(
    private readonly backend: Backend,
    readonly pad = FACE_PAD_PX,
  ) {}

  get textureBytes(): number {
    return this.pages.length * FACE_PAGE_PX * FACE_PAGE_PX * 4 * 1.34;
  }

  /** The page texture a material samples. */
  texture(page: number): THREE.CanvasTexture {
    const p = this.pages[page];
    if (!p) throw new Error(`play3d face atlas: no page ${page}`);
    return p.tex;
  }

  private newPage(): FacePage {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_PAGE_PX;
    canvas.height = FACE_PAGE_PX;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    tex.name = `play3d-faces-${this.pages.length}`;
    this.backend.prepareTexture(tex);
    this.uploads++;
    const page: FacePage = {
      canvas,
      ctx: canvas.getContext('2d')!,
      packer: new ShelfPacker(FACE_PAGE_PX, FACE_PAGE_PX, this.pad),
      tex,
      pending: [],
    };
    this.pages.push(page);
    return page;
  }

  /** True when `key` has been minted (no paint). */
  has(key: string): boolean {
    return this.refs.has(key);
  }

  /** The face tile for `key`, painting it on first request. */
  get(key: string, spec: () => FaceSpec): FaceRef {
    const hit = this.refs.get(key);
    if (hit) return hit;
    const s = spec();
    const w = Math.max(1, Math.ceil(s.w));
    const h = Math.max(1, Math.ceil(s.h));
    const pad = this.pad;
    // The landing canvas carries the pad ring so one blit lands tile
    // AND its replicated edge.
    const land = document.createElement('canvas');
    land.width = w + pad * 2;
    land.height = h + pad * 2;
    const lc = land.getContext('2d')!;
    lc.save();
    lc.translate(pad, pad);
    lc.beginPath();
    lc.rect(0, 0, w, h);
    lc.clip();
    s.paint(lc, w, h);
    lc.restore();
    if (s.bleed ?? true) replicateEdges(lc, pad, w, h);
    let page = this.pages[this.pages.length - 1] ?? this.newPage();
    let rect = page.packer.insert(w, h);
    if (!rect) {
      page = this.newPage();
      rect = page.packer.insert(w, h);
      if (!rect) throw new Error(`play3d face atlas: tile ${key} (${w}x${h}) exceeds a page`);
    }
    const lx = rect.x - pad;
    const ly = rect.y - pad;
    page.ctx.drawImage(land, lx, ly);
    page.pending.push({ canvas: land, x: lx, y: ly });
    const W = FACE_PAGE_PX;
    const ref: FaceRef = {
      page: this.pages.indexOf(page),
      u0: rect.x / W,
      v0: 1 - (rect.y + h) / W,
      u1: (rect.x + w) / W,
      v1: 1 - rect.y / W,
      w,
      h,
    };
    this.refs.set(key, ref);
    this.tiles++;
    return ref;
  }

  /** Land the pending tiles: sub-rect blits, one mip regen per page per flush. */
  flush(): void {
    for (const p of this.pages) {
      const n = p.pending.length;
      if (n === 0) continue;
      for (let i = 0; i < n; i++) {
        const r = p.pending[i]!;
        this.backend.blit(r.canvas, p.tex, r.x, r.y, i === n - 1);
        this.blits++;
      }
      p.pending.length = 0;
    }
  }

  dispose(): void {
    for (const p of this.pages) p.tex.dispose();
    this.pages.length = 0;
    this.refs.clear();
  }
}

/**
 * THE PAD WEARS THE EDGE: stretch the tile's 1 px border strips out
 * into the pad ring (and its corner pixels into the pad corners).
 * `ctx` is the landing canvas; the tile sits at (pad, pad).
 */
export function replicateEdges(ctx: CanvasRenderingContext2D, pad: number, w: number, h: number): void {
  const c = ctx.canvas;
  // Sides.
  ctx.drawImage(c, pad, pad, 1, h, 0, pad, pad, h); // west strip → left pad
  ctx.drawImage(c, pad + w - 1, pad, 1, h, pad + w, pad, pad, h); // east → right
  ctx.drawImage(c, pad, pad, w, 1, pad, 0, w, pad); // north → top
  ctx.drawImage(c, pad, pad + h - 1, w, 1, pad, pad + h, w, pad); // south → bottom
  // Corners.
  ctx.drawImage(c, pad, pad, 1, 1, 0, 0, pad, pad);
  ctx.drawImage(c, pad + w - 1, pad, 1, 1, pad + w, 0, pad, pad);
  ctx.drawImage(c, pad, pad + h - 1, 1, 1, 0, pad + h, pad, pad);
  ctx.drawImage(c, pad + w - 1, pad + h - 1, 1, 1, pad + w, pad + h, pad, pad);
}

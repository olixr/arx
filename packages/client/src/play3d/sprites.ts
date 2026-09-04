/**
 * THE PAINTED WORLD STANDS UP (play3d S1; S3 review fixes) — the sprite
 * systems.
 *
 * Two kinds of billboard, one law (billboard.ts):
 *
 * STATICS — trees, saplings, wild flora (props/FX follow via the same
 * door). The production painters (trees.ts paintTree, crops.ts
 * paintPlant) are called ONCE per distinct model into a shelf-packed
 * ATLAS PAGE (2048², sRGB, mipmapped), ringed with the outline law.
 * THE PAGE IS UPLOADED ONCE: it goes resident blank the moment it is
 * minted (`Backend.prepareTexture`), and every sprite landed after
 * that is a SUB-RECT upload of its own canvas (`Backend.blit`) — the
 * page never re-uploads its 16 MB because one more tree variant walked
 * into view. The page canvas is still painted as the CPU mirror the
 * renderer re-uploads from after a context loss. The shelf pad is
 * 8 px: with mips, a 2 px pad bleeds neighbours from level 2 on.
 * Each chunk then owns one InstancedBufferGeometry per atlas page it
 * touches: one draw call per (chunk, page). Eviction disposes the
 * instance buffers; the atlas is shared and stays.
 *
 * ENTITIES live in entityBillboard.ts (S2 moved them out): a per-body
 * canvas painted by the production rigs and uploaded only on change.
 *
 * Pixel density: statics at 32 px/tile (the 2D game's TILE_PX).
 */
import * as THREE from 'three';
import { Tile, hashCoords, treeOfSapling, type ChunkData, CHUNK_SIZE, TREE_TILES } from '@arx/shared';
import { paintTree, saplingModel, treeExtent, treeModel, treeVariantHash } from '../render/trees.js';
import { paintPlant, plantModel } from '../render/crops.js';
import { ShelfPacker } from './atlasPack.js';
import { outlineRing } from './outline.js';
import { BillboardBuffer, type BillboardClock, type BillboardFactory } from './billboard.js';
import type { Backend } from './stageBackend.js';

export const STATIC_PX = 32;
export const ATLAS_PAGE_PX = 2048;
/** Shelf pad between sprites — wide enough that mip level 3 stays clean. */
export const ATLAS_PAD_PX = 8;
/** The 2.5D ground squash the painters were tuned under. */
const Y_SQUASH = 0.6;

// ------------------------------------------------------------- atlas

export interface SpriteRef {
  page: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** World size in tiles. */
  w: number;
  h: number;
  /** Feet anchor: fraction across the width; fraction of height below the feet. */
  ax: number;
  ay: number;
}

/** What a painter needs to say about itself to be atlased. */
export interface PaintSpec {
  /** Canvas pixel size (outline ring included). */
  cw: number;
  ch: number;
  /** Feet anchor in canvas px (from left, from top). */
  ax: number;
  ay: number;
  /** Paint at canvas origin; the ring is applied afterwards. */
  paint: (ctx: CanvasRenderingContext2D) => void;
}

/** A sprite painted on the page's CPU mirror, waiting for its sub-rect upload. */
interface PendingRect {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

interface AtlasPage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  packer: ShelfPacker;
  tex: THREE.CanvasTexture;
  pending: PendingRect[];
}

export class SpriteAtlas {
  readonly pages: AtlasPage[] = [];
  private readonly refs = new Map<string, SpriteRef>();
  /** Confession counters: sprites landed, page uploads (one per page), sub-rect blits. */
  sprites = 0;
  uploads = 0;
  blits = 0;

  constructor(
    private readonly backend: Backend,
    private readonly ringPx = Math.ceil(Math.max(1.25, STATIC_PX * 0.04)),
  ) {}

  get textureBytes(): number {
    return this.pages.length * ATLAS_PAGE_PX * ATLAS_PAGE_PX * 4 * 1.34;
  }

  private newPage(): AtlasPage {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_PAGE_PX;
    canvas.height = ATLAS_PAGE_PX;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    tex.name = `play3d-atlas-${this.pages.length}`;
    // The one full upload: resident now, blank, so every sprite that
    // follows is a sub-rect landing.
    this.backend.prepareTexture(tex);
    this.uploads++;
    const page: AtlasPage = {
      canvas,
      ctx: canvas.getContext('2d')!,
      packer: new ShelfPacker(ATLAS_PAGE_PX, ATLAS_PAGE_PX, ATLAS_PAD_PX),
      tex,
      pending: [],
    };
    this.pages.push(page);
    return page;
  }

  /** The sprite for `key`, painting it on first request. */
  get(key: string, spec: () => PaintSpec): SpriteRef {
    const hit = this.refs.get(key);
    if (hit) return hit;
    const s = spec();
    const cw = Math.max(1, Math.ceil(s.cw));
    const ch = Math.max(1, Math.ceil(s.ch));
    // Paint into a canvas EXACTLY the sprite's size (the sub-rect upload
    // reads the whole source), ring it, then land it on a page.
    const sprite = document.createElement('canvas');
    sprite.width = cw;
    sprite.height = ch;
    const sc = sprite.getContext('2d')!;
    s.paint(sc);
    outlineRing(sc, cw, ch, this.ringPx);
    let page = this.pages[this.pages.length - 1] ?? this.newPage();
    let rect = page.packer.insert(cw, ch);
    if (!rect) {
      page = this.newPage();
      rect = page.packer.insert(cw, ch);
      if (!rect) throw new Error(`play3d atlas: sprite ${key} (${cw}x${ch}) exceeds a page`);
    }
    // The CPU mirror (context-restore source) + the pending GPU landing.
    page.ctx.drawImage(sprite, rect.x, rect.y);
    page.pending.push({ canvas: sprite, x: rect.x, y: rect.y });
    const W = ATLAS_PAGE_PX;
    const ref: SpriteRef = {
      page: this.pages.indexOf(page),
      u0: rect.x / W,
      v0: 1 - (rect.y + ch) / W,
      u1: (rect.x + cw) / W,
      v1: 1 - rect.y / W,
      w: cw / STATIC_PX,
      h: ch / STATIC_PX,
      ax: s.ax / cw,
      ay: (ch - s.ay) / ch,
    };
    this.refs.set(key, ref);
    this.sprites++;
    return ref;
  }

  /** Land the pending sprites: sub-rect blits, one mip regen per page per flush. */
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

// ------------------------------------------------- static painters

function treeSpec(tile: Tile, hq: number): PaintSpec {
  const adult = treeOfSapling(tile);
  const m = adult !== null ? saplingModel(adult, hq) : treeModel(tile, hq);
  const e = treeExtent(m);
  const s = STATIC_PX;
  const ring = Math.ceil(Math.max(1.25, s * 0.04)) + 1;
  const ax = -e.x0 * s + ring;
  const ay = e.y1 * s + ring;
  return {
    cw: Math.ceil((e.x1 - e.x0) * s) + ring * 2,
    ch: Math.ceil((e.y1 - e.y0) * s) + ring * 2,
    ax,
    ay,
    paint: (ctx) => {
      paintTree(ctx, m, {
        bx: ax,
        groundY: ay,
        s,
        syT: s * Y_SQUASH,
        wx: 0,
        wy: 0,
        tSec: 0,
        windOverride: 0,
        grow: 1,
      });
    },
  };
}

function floraSpec(tile: Tile, h: number): PaintSpec {
  const fm = plantModel(tile, h);
  const s = STATIC_PX;
  const half = (fm.spread * 1.3 + 0.2) * s;
  const top = (fm.height * 1.25 + 0.2) * s;
  const below = 0.35 * s;
  return {
    cw: Math.ceil(half * 2),
    ch: Math.ceil(top + below),
    ax: half,
    ay: top,
    paint: (ctx) => {
      paintPlant(ctx, fm, { bx: half, groundY: top, s, wx: 0, wy: 0, tSec: 0, flame: 0, windOverride: 0 });
    },
  };
}

const WILD_FLORA: ReadonlySet<Tile> = new Set([Tile.BerryBush, Tile.FibrePlant, Tile.WildSagewort]);

/** True for a tile this lane stands up as a billboard. */
export function isStandingTile(tile: Tile): boolean {
  return TREE_TILES.has(tile) || treeOfSapling(tile) !== null || WILD_FLORA.has(tile);
}

// --------------------------------------------------- chunk statics

export interface ChunkStatics {
  meshes: THREE.Mesh[];
  instances: number;
  dispose(): void;
}

/**
 * Stand up one chunk's trees and flora. `groundY(tx, ty)` gives the
 * feet height (tile centre). Returns one mesh per atlas page touched.
 */
export function buildChunkStatics(
  chunk: ChunkData,
  atlas: SpriteAtlas,
  clock: BillboardClock,
  billboards: BillboardFactory,
  groundY: (wx: number, wy: number) => number,
): ChunkStatics {
  // First pass: gather (ref, position) by page so buffers size exactly.
  const byPage = new Map<number, Array<{ ref: SpriteRef; x: number; y: number; z: number; ph: number }>>();
  const x0 = chunk.cx * CHUNK_SIZE;
  const y0 = chunk.cy * CHUNK_SIZE;
  let total = 0;
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tile = chunk.ground[ly * CHUNK_SIZE + lx]! as Tile;
      if (!isStandingTile(tile)) continue;
      const tx = x0 + lx;
      const ty = y0 + ly;
      const h = hashCoords(41, tx, ty);
      let ref: SpriteRef;
      if (WILD_FLORA.has(tile)) {
        ref = atlas.get(`f${tile}:${h & 0xff}`, () => floraSpec(tile, h & 0xff));
      } else {
        const hq = treeVariantHash(tile, h);
        ref = atlas.get(`t${tile}:${hq}`, () => treeSpec(tile, hq));
      }
      let list = byPage.get(ref.page);
      if (!list) byPage.set(ref.page, (list = []));
      // Trees stand at the tile centre; the 2D game's collider agrees.
      const wx = tx + 0.5;
      const wy = ty + 0.5;
      list.push({ ref, x: wx, y: groundY(wx, wy), z: wy, ph: (h % 628) / 100 });
      total++;
    }
  }
  const meshes: THREE.Mesh[] = [];
  const buffers: BillboardBuffer[] = [];
  const mats: THREE.Material[] = [];
  for (const [page, list] of byPage) {
    const buf = new BillboardBuffer(list.length);
    for (let i = 0; i < list.length; i++) {
      const it = list[i]!;
      const r = it.ref;
      buf.set(i, it.x, it.y, it.z, r.w, r.h, r.u0, r.v0, r.u1, r.v1, r.ax, r.ay, it.ph);
    }
    buf.commit();
    buf.computeBounds();
    const tex = atlas.pages[page]!.tex;
    const mat = billboards.material(tex, clock, { alphaTest: 0.45, sway: true });
    const depth = billboards.depthMaterial(tex, clock, { alphaTest: 0.45, sway: true });
    const mesh = new THREE.Mesh(buf.geometry, mat);
    mesh.customDepthMaterial = depth;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.name = `statics ${chunk.cx},${chunk.cy} p${page}`;
    meshes.push(mesh);
    buffers.push(buf);
    mats.push(mat, depth);
  }
  return {
    meshes,
    instances: total,
    dispose: () => {
      for (const b of buffers) b.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

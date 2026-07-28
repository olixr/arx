import {
  CHUNK_SIZE,
  Detail,
  TILE_PX,
  TILE_SKIP,
  Tile,
  tileDef,
} from '@arx/shared';
import type { ZoneDef } from '@arx/content';
import { bakeChunk, bakeGutter } from '../render/terrain.js';
import { paintTree, treeModel } from '../render/trees.js';
import type { EditorState } from './state.js';
import { sameRef } from './placements.js';

/**
 * The editor viewport. Ground is the REAL game art — zone chunks run
 * through the renderer's own bakeChunk (pure samplers over the zone
 * arrays, zone-local chunk grid), so grass, water, paths, floors and
 * baked details are pixel-identical to play. Standing content the
 * bake substitutes away (walls, props, stations) is drawn as clean
 * schematic blocks — an editor wants to SEE what tile is where; the
 * live game view is one Save away. Trees get their true painters.
 */

const OUTLINE = '#241a2e';

/** Sentinel ground value marking a transparent ghost cell. */
export const GHOST_SKIP = TILE_SKIP;

function hash2(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

// ------------------------------------------------------ tile classes

const TREE_LIKE = new Map<Tile, { tile: Tile; grow: number }>([
  [Tile.Tree, { tile: Tile.Tree, grow: 1 }],
  [Tile.TreeOak, { tile: Tile.TreeOak, grow: 1 }],
  [Tile.TreeWillow, { tile: Tile.TreeWillow, grow: 1 }],
  [Tile.TreeYew, { tile: Tile.TreeYew, grow: 1 }],
  [Tile.Sapling, { tile: Tile.Tree, grow: 0.45 }],
  [Tile.SaplingOak, { tile: Tile.TreeOak, grow: 0.45 }],
  [Tile.SaplingWillow, { tile: Tile.TreeWillow, grow: 0.45 }],
  [Tile.SaplingYew, { tile: Tile.TreeYew, grow: 0.45 }],
]);

const DOOR_LIKE = new Set<Tile>([
  Tile.DoorwayStone,
  Tile.DoorwayWood,
  Tile.DoorwayStoneWide,
  Tile.DoorwayWoodWide,
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
  Tile.ArchStone,
  // The open garrison gate is a walk-through passage; the shut gate
  // stays a solid block via its raised def.
  Tile.GateGarrison,
]);

const SHUT_DOORS = new Set<Tile>([
  Tile.DoorwayStoneShut,
  Tile.DoorwayWoodShut,
  Tile.DoorwayStoneWideShut,
  Tile.DoorwayWoodWideShut,
]);

/** Tiles whose look the ground bake already carries in full. */
const BAKED_FULLY = new Set<Tile>([
  Tile.Water,
  Tile.WaterDeep,
  Tile.WaterShallow,
  Tile.FishingSpot,
]);

export type OverlayKind = 'none' | 'block' | 'tree' | 'door' | 'portal';

export function overlayKind(t: Tile): OverlayKind {
  if (TREE_LIKE.has(t)) return 'tree';
  if (DOOR_LIKE.has(t)) return 'door';
  if (t === Tile.PortalDown || t === Tile.PortalUp) return 'portal';
  if (BAKED_FULLY.has(t)) return 'none';
  const def = tileDef(t);
  if (def.raised || def.solid) return 'block';
  return 'none';
}

function shade(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number): number => Math.max(0, Math.min(255, v + delta));
  const r = ch((n >> 16) & 0xff);
  const g = ch((n >> 8) & 0xff);
  const b = ch(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Schematic standing tile: a chunky extruded block — darker body,
 * lit top plate, world-outline ink. Shared with palette thumbnails so
 * the swatch you pick is the block you see.
 */
export function drawBlockTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  t: Tile,
): void {
  const def = tileDef(t);
  const lift = def.raised ? s * 0.34 : s * 0.18;
  const inset = Math.max(1, s * 0.06);
  const x = sx + inset;
  const w = s - inset * 2;
  const bodyTop = sy + inset - lift + s * 0.3;
  const bodyH = s - inset * 2 + lift - s * 0.3;
  ctx.fillStyle = shade(def.color, -14);
  ctx.fillRect(x, bodyTop, w, bodyH);
  ctx.fillStyle = def.topColor ?? shade(def.color, 26);
  ctx.fillRect(x, sy + inset - lift, w, s * 0.32);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.045);
  ctx.strokeRect(x, sy + inset - lift, w, s - inset * 2 + lift - 0);
  // A thin seam under the top plate sells the extrusion.
  ctx.beginPath();
  ctx.moveTo(x, sy + inset - lift + s * 0.32);
  ctx.lineTo(x + w, sy + inset - lift + s * 0.32);
  ctx.stroke();
}

function drawDoorTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  t: Tile,
): void {
  const def = tileDef(t);
  const jamb = Math.max(2, s * 0.16);
  ctx.fillStyle = shade(def.color, 10);
  ctx.fillRect(sx, sy - s * 0.2, jamb, s * 1.2);
  ctx.fillRect(sx + s - jamb, sy - s * 0.2, jamb, s * 1.2);
  ctx.fillRect(sx, sy - s * 0.28, s, jamb * 0.8);
  if (SHUT_DOORS.has(t)) {
    ctx.fillStyle = shade('#8a6534', -6);
    ctx.fillRect(sx + jamb, sy + s * 0.08, s - jamb * 2, s * 0.84);
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.strokeRect(sx + 0.5, sy - s * 0.28, s - 1, s * 1.28);
}

function drawPortalTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  t: Tile,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;
  ctx.fillStyle = t === Tile.PortalDown ? '#1a1626' : '#5b4f7a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.42, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9b7fd4';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.stroke();
}

// ------------------------------------------------------ tree sprites

interface TreeSprite {
  canvas: HTMLCanvasElement;
  /** Offsets from the trunk-base anchor to the sprite's top-left. */
  ox: number;
  oy: number;
}

const treeSprites = new Map<string, TreeSprite>();

function treeSprite(tile: Tile, h: number, s: number, grow: number): TreeSprite {
  const key = `${tile}:${h & 7}:${Math.round(s)}:${grow}`;
  const hit = treeSprites.get(key);
  if (hit) return hit;
  if (treeSprites.size > 400) treeSprites.clear();
  const w = Math.ceil(s * 5);
  const ht = Math.ceil(s * 7);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = ht;
  const ctx = canvas.getContext('2d')!;
  const m = treeModel(tile, h & 7);
  paintTree(ctx, m, {
    bx: w / 2,
    groundY: ht - s * 0.5,
    s,
    syT: s * 0.5,
    wx: (h & 7) * 7.3,
    wy: (h & 7) * 3.1,
    tSec: 0,
    windOverride: 0,
    grow,
  });
  const sprite = { canvas, ox: -w / 2, oy: -(ht - s * 0.5) };
  treeSprites.set(key, sprite);
  return sprite;
}

/** Paint one tree tile's sprite at a screen cell — shared with previews. */
export function drawTreeSprite(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  tx: number,
  ty: number,
  px: number,
  py: number,
  s: number,
): void {
  const spec = TREE_LIKE.get(tile);
  if (!spec) return;
  const sprite = treeSprite(spec.tile, hash2(tx, ty), s, spec.grow);
  ctx.drawImage(sprite.canvas, px + s / 2 + sprite.ox, py + s * 0.82 + sprite.oy);
}

// ------------------------------------------------------ the viewport

export interface PreviewOverlay {
  /** Local tile indices to highlight. */
  indices: Set<number>;
  color: string;
}

export class EditorView {
  panX = 40;
  panY = 40;
  scale = 16;
  showGrid = true;
  showChunkGrid = true;
  showMarkers = true;
  showElev = true;
  /** Live tool feedback painted over the map. */
  preview: PreviewOverlay | null = null;
  /**
   * Floating stamp ghost anchored at a local tile — paste buffers,
   * structure templates, and prefabs all preview through this. Cells
   * equal to GHOST_SKIP are transparent; pins preview placements a
   * prefab will drop.
   */
  ghost: {
    w: number;
    h: number;
    ground: Uint16Array;
    detail?: Uint16Array;
    at: { x: number; y: number };
    pins?: Array<{ dx: number; dy: number; color: string }>;
  } | null = null;
  /** While a stroke is live, chunk rebakes are throttled hard. */
  strokeActive = false;

  private readonly baked = new Map<string, HTMLCanvasElement>();
  private lastStrokeBakeAt = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly state: EditorState,
  ) {}

  // ---------------------------------------------------- coordinates

  tileAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - rect.left - this.panX) / this.scale),
      y: Math.floor((clientY - rect.top - this.panY) / this.scale),
    };
  }

  /** Sub-tile coordinates — placement hit tests want exact distance. */
  tileAtFloat(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.panX) / this.scale,
      y: (clientY - rect.top - this.panY) / this.scale,
    };
  }

  zoomAt(clientX: number, clientY: number, factor: number): void {
    const next = Math.min(64, Math.max(2, this.scale * factor));
    const rect = this.canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    this.panX = mx - ((mx - this.panX) / this.scale) * next;
    this.panY = my - ((my - this.panY) / this.scale) * next;
    this.scale = next;
  }

  centerOn(x: number, y: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.panX = w / 2 - x * this.scale;
    this.panY = h / 2 - y * this.scale;
  }

  fitZone(): void {
    const z = this.state.zone;
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.scale = Math.min(48, Math.max(2, Math.min((w - 80) / z.width, (h - 80) / z.height)));
    this.centerOn(z.width / 2, z.height / 2);
  }

  // ---------------------------------------------------- invalidation

  /** Invalidate baked art around an edited local rect (blob contours
   *  and detail spill reach a few tiles past a chunk seam). */
  markDirty(x0: number, y0: number, x1: number, y1: number): void {
    const pad = 3;
    const c0x = Math.floor((Math.min(x0, x1) - pad) / CHUNK_SIZE);
    const c0y = Math.floor((Math.min(y0, y1) - pad) / CHUNK_SIZE);
    const c1x = Math.floor((Math.max(x0, x1) + pad) / CHUNK_SIZE);
    const c1y = Math.floor((Math.max(y0, y1) + pad) / CHUNK_SIZE);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) this.baked.delete(`${cx},${cy}`);
    }
  }

  markAllDirty(): void {
    this.baked.clear();
  }

  // ---------------------------------------------------- rendering

  render(nowMs: number): void {
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#100c1a';
    ctx.fillRect(0, 0, w, h);

    const z = this.state.zone;
    const s = this.scale;
    const tx0 = Math.max(0, Math.floor(-this.panX / s));
    const ty0 = Math.max(0, Math.floor(-this.panY / s));
    const tx1 = Math.min(z.width - 1, Math.ceil((w - this.panX) / s));
    const ty1 = Math.min(z.height - 1, Math.ceil((h - this.panY) / s) + 6);

    this.blitGround(ctx, tx0, ty0, tx1, ty1, nowMs);
    this.drawOverlays(ctx, tx0, ty0, tx1, ty1);
    if (this.showElev || this.state.layer === 'elev') this.drawElev(ctx, tx0, ty0, tx1, ty1);
    this.drawGrids(ctx, w, h);
    if (this.showMarkers) this.drawMarkers(ctx);
    this.drawPreview(ctx);
    this.drawGhost(ctx);
    this.drawSelection(ctx, nowMs);
    this.drawZoneFrame(ctx);
  }

  private sx(x: number): number {
    return this.panX + x * this.scale;
  }

  private sy(y: number): number {
    return this.panY + y * this.scale;
  }

  private blitGround(
    ctx: CanvasRenderingContext2D,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
    nowMs: number,
  ): void {
    const z = this.state.zone;
    const s = this.scale;
    const c0x = Math.floor(tx0 / CHUNK_SIZE);
    const c0y = Math.floor(ty0 / CHUNK_SIZE);
    const c1x = Math.floor(tx1 / CHUNK_SIZE);
    const c1y = Math.floor(ty1 / CHUNK_SIZE);
    const G = bakeGutter(TILE_PX);
    // Budget: full-speed rebakes when idle, one per 180ms mid-stroke
    // (the flat live preview covers the gap, the bake catches up).
    let budget = this.strokeActive
      ? nowMs - this.lastStrokeBakeAt > 180
        ? 1
        : 0
      : 2;
    ctx.imageSmoothingEnabled = s < TILE_PX;
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const key = `${cx},${cy}`;
        let bake = this.baked.get(key);
        if (!bake && budget > 0) {
          bake = this.bakeLocal(cx, cy);
          this.baked.set(key, bake);
          budget--;
          if (this.strokeActive) this.lastStrokeBakeAt = nowMs;
        }
        const dx = this.sx(cx * CHUNK_SIZE);
        const dy = this.sy(cy * CHUNK_SIZE);
        if (bake) {
          ctx.drawImage(
            bake,
            G,
            G,
            CHUNK_SIZE * TILE_PX,
            CHUNK_SIZE * TILE_PX,
            dx,
            dy,
            CHUNK_SIZE * s,
            CHUNK_SIZE * s,
          );
        } else {
          this.flatChunk(ctx, cx, cy);
        }
      }
    }
    // Dim everything outside the zone so its bounds read at a glance.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.rect(this.sx(0), this.sy(0), z.width * s, z.height * s);
    ctx.clip('evenodd');
    ctx.fillStyle = 'rgba(8, 5, 14, 0.72)';
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.restore();
  }

  /** Instant flat-color stand-in while a chunk's real bake is queued. */
  private flatChunk(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const z = this.state.zone;
    const s = this.scale;
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let y = y0; y < y0 + CHUNK_SIZE && y < z.height; y++) {
      if (y < 0) continue;
      for (let x = x0; x < x0 + CHUNK_SIZE && x < z.width; x++) {
        if (x < 0) continue;
        const g = z.ground[y * z.width + x]!;
        if (g === GHOST_SKIP) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3244' : '#262031';
          ctx.fillRect(this.sx(x), this.sy(y), s + 0.5, s + 0.5);
          continue;
        }
        const def = tileDef(g);
        const vars = def.variants;
        ctx.fillStyle =
          vars && vars.length > 0 && hash2(x, y) % 3 === 0 ? vars[hash2(x, y) % vars.length]! : def.color;
        ctx.fillRect(this.sx(x), this.sy(y), s + 0.5, s + 0.5);
      }
    }
  }

  private bakeLocal(cx: number, cy: number): HTMLCanvasElement {
    const z = this.state.zone;
    const ground = (tx: number, ty: number): number | undefined => {
      if (tx < 0 || ty < 0 || tx >= z.width || ty >= z.height) return undefined;
      const g = z.ground[ty * z.width + tx]!;
      // Transparent cells bake as the meadow they'll reveal; the
      // overlay pass draws their checker marker on top.
      return g === GHOST_SKIP ? Tile.Grass : g;
    };
    const detail = (tx: number, ty: number): number =>
      tx >= 0 && ty >= 0 && tx < z.width && ty < z.height
        ? z.detail[ty * z.width + tx]!
        : Detail.None;
    const elev = (tx: number, ty: number): number =>
      z.elev && tx >= 0 && ty >= 0 && tx < z.width && ty < z.height
        ? z.elev[ty * z.width + tx]!
        : 0;
    return bakeChunk(ground, detail, elev, cx, cy, TILE_PX);
  }

  private drawOverlays(
    ctx: CanvasRenderingContext2D,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
  ): void {
    const z = this.state.zone;
    const s = this.scale;
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const t = z.ground[y * z.width + x]! as Tile;
        if ((t as number) === GHOST_SKIP) {
          // Transparency marker: a soft checker so authors SEE the
          // cells the stamp will leave to the world beneath.
          const px = this.sx(x);
          const py = this.sy(y);
          const s2 = this.scale / 2;
          ctx.fillStyle = 'rgba(40, 32, 54, 0.42)';
          ctx.fillRect(px, py, s2, s2);
          ctx.fillRect(px + s2, py + s2, s2, s2);
          ctx.fillStyle = 'rgba(88, 78, 112, 0.28)';
          ctx.fillRect(px + s2, py, s2, s2);
          ctx.fillRect(px, py + s2, s2, s2);
          continue;
        }
        const kind = overlayKind(t);
        if (kind === 'none') continue;
        const px = this.sx(x);
        const py = this.sy(y);
        if (kind === 'tree') {
          const spec = TREE_LIKE.get(t)!;
          const sprite = treeSprite(spec.tile, hash2(x, y), s, spec.grow);
          ctx.drawImage(sprite.canvas, px + s / 2 + sprite.ox, py + s * 0.82 + sprite.oy);
        } else if (kind === 'door') {
          drawDoorTile(ctx, px, py, s, t);
        } else if (kind === 'portal') {
          drawPortalTile(ctx, px, py, s, t);
        } else {
          drawBlockTile(ctx, px, py, s, t);
        }
      }
    }
  }

  private drawElev(
    ctx: CanvasRenderingContext2D,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
  ): void {
    const z = this.state.zone;
    if (!z.elev) return;
    const s = this.scale;
    const lvl = (x: number, y: number): number =>
      x >= 0 && y >= 0 && x < z.width && y < z.height ? z.elev![y * z.width + x]! : 0;
    const focus = this.state.layer === 'elev';
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const e = lvl(x, y);
        const px = this.sx(x);
        const py = this.sy(y);
        if (e !== 0) {
          ctx.fillStyle =
            e > 0
              ? `rgba(244, 240, 255, ${(focus ? 0.13 : 0.07) * e})`
              : `rgba(10, 6, 30, ${(focus ? 0.2 : 0.12) * -e})`;
          ctx.fillRect(px, py, s, s);
        }
        // Contour ink on the high side of every level change.
        ctx.strokeStyle = focus ? 'rgba(240, 214, 130, 0.8)' : 'rgba(240, 214, 130, 0.35)';
        ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.beginPath();
        if (lvl(x + 1, y) < e) {
          ctx.moveTo(px + s, py);
          ctx.lineTo(px + s, py + s);
        }
        if (lvl(x - 1, y) < e) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + s);
        }
        if (lvl(x, y + 1) < e) {
          ctx.moveTo(px, py + s);
          ctx.lineTo(px + s, py + s);
        }
        if (lvl(x, y - 1) < e) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + s, py);
        }
        ctx.stroke();
        if (focus && s >= 18 && e !== 0) {
          ctx.fillStyle = e > 0 ? '#f0d682' : '#8fa3d9';
          ctx.font = `${Math.round(s * 0.42)}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(e), px + s / 2, py + s / 2);
        }
      }
    }
  }

  private drawGrids(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const z = this.state.zone;
    const s = this.scale;
    if (this.showGrid && s >= 9) {
      ctx.strokeStyle = 'rgba(232, 223, 200, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= z.width; x++) {
        ctx.moveTo(this.sx(x), this.sy(0));
        ctx.lineTo(this.sx(x), this.sy(z.height));
      }
      for (let y = 0; y <= z.height; y++) {
        ctx.moveTo(this.sx(0), this.sy(y));
        ctx.lineTo(this.sx(z.width), this.sy(y));
      }
      ctx.stroke();
    }
    if (this.showChunkGrid) {
      ctx.strokeStyle = 'rgba(232, 163, 61, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= z.width; x += CHUNK_SIZE) {
        ctx.moveTo(this.sx(x), this.sy(0));
        ctx.lineTo(this.sx(x), this.sy(z.height));
      }
      for (let y = 0; y <= z.height; y += CHUNK_SIZE) {
        ctx.moveTo(this.sx(0), this.sy(y));
        ctx.lineTo(this.sx(z.width), this.sy(y));
      }
      ctx.stroke();
    }
  }

  private drawMarkers(ctx: CanvasRenderingContext2D): void {
    const z = this.state.zone;
    const s = this.scale;
    const label = (text: string, x: number, y: number, color: string): void => {
      if (s < 10) return;
      ctx.font = `600 ${Math.max(10, Math.min(13, s * 0.5))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(10, 6, 18, 0.75)';
      const tw = ctx.measureText(text).width;
      ctx.fillRect(x - tw / 2 - 3, y - 1, tw + 6, 14);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    /** Selection/hover halo behind a marker anchor. */
    const halo = (
      kind: 'portal' | 'cluster' | 'actor' | 'sign' | 'spawn',
      index: number,
      lx: number,
      ly: number,
    ): void => {
      const sel = sameRef(this.state.selected, { kind, index });
      const hov = sameRef(this.state.hoverPlacement, { kind, index });
      if (!sel && !hov) return;
      ctx.strokeStyle = sel ? '#f2c94c' : 'rgba(242, 201, 76, 0.45)';
      ctx.lineWidth = sel ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(7, s * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    };

    // Respawning NPC clusters: ring at the cluster radius.
    (z.spawns ?? []).forEach((sp, i) => {
      const lx = this.sx(sp.x - z.origin.x + 0.5);
      const ly = this.sy(sp.y - z.origin.y + 0.5);
      const selected = sameRef(this.state.selected, { kind: 'cluster', index: i });
      ctx.strokeStyle = selected ? 'rgba(242, 160, 140, 0.9)' : 'rgba(212, 84, 74, 0.55)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = selected ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(3, sp.radius * s), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      halo('cluster', i, lx, ly);
      ctx.fillStyle = '#d4544a';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(3, s * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(`${sp.npc} ×${sp.count}`, lx, ly + Math.max(3, sp.radius * s) + 3, '#e79a92');
    });

    // Named actors.
    (z.actorSpawns ?? []).forEach((a, i) => {
      const lx = this.sx(a.x - z.origin.x + 0.5);
      const ly = this.sy(a.y - z.origin.y + 0.5);
      halo('actor', i, lx, ly);
      ctx.fillStyle = '#5fc9c4';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(3, s * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Facing tick when the placement declares one.
      if (a.dir !== undefined) {
        ctx.strokeStyle = '#5fc9c4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(
          lx + Math.cos(a.dir) * Math.max(6, s * 0.45),
          ly + Math.sin(a.dir) * Math.max(6, s * 0.45),
        );
        ctx.stroke();
      }
      label(a.actor, lx, ly + Math.max(3, s * 0.22) + 2, '#9adfdb');
    });

    // Portals (the tile itself also renders; this is the badge).
    (z.portals ?? []).forEach((p, i) => {
      const lx = this.sx(p.x - z.origin.x + 0.5);
      const ly = this.sy(p.y - z.origin.y + 0.5);
      halo('portal', i, lx, ly);
      ctx.strokeStyle = '#b48fe8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly - s * 0.45);
      ctx.lineTo(lx + s * 0.32, ly);
      ctx.lineTo(lx, ly + s * 0.45);
      ctx.lineTo(lx - s * 0.32, ly);
      ctx.closePath();
      ctx.stroke();
      label(p.delve ? 'delve' : `→ ${p.dest?.x},${p.dest?.y}`, lx, ly + s * 0.5 + 2, '#c9aef0');
    });

    // Signs: a small board badge over the tile, captioned with what it
    // actually says — the whole point of the layer is reading it here.
    (z.signs ?? []).forEach((g, i) => {
      const lx = this.sx(g.x - z.origin.x + 0.5);
      const ly = this.sy(g.y - z.origin.y + 0.5);
      halo('sign', i, lx, ly);
      const w = Math.max(6, s * 0.46);
      const h = Math.max(4, s * 0.3);
      ctx.fillStyle = '#c2a068';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(lx - w / 2, ly - h / 2 - h * 0.3, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#6b4a24';
      ctx.beginPath();
      ctx.moveTo(lx, ly + h * 0.2);
      ctx.lineTo(lx, ly + h * 0.9);
      ctx.stroke();
      label(g.title || g.lines?.[0] || 'blank', lx, ly + h + 3, '#e2cda3');
    });

    // The world spawn.
    if (z.spawn) {
      const lx = this.sx(z.spawn.x - z.origin.x);
      const ly = this.sy(z.spawn.y - z.origin.y);
      halo('spawn', 0, lx, ly);
      ctx.fillStyle = '#f2c94c';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(4, s * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label('spawn', lx, ly + Math.max(4, s * 0.3) + 2, '#f2c94c');
    }
  }

  private drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.preview) return;
    const z = this.state.zone;
    const s = this.scale;
    ctx.fillStyle = this.preview.color;
    for (const i of this.preview.indices) {
      const x = i % z.width;
      const y = Math.floor(i / z.width);
      ctx.fillRect(this.sx(x), this.sy(y), s, s);
    }
  }

  private drawGhost(ctx: CanvasRenderingContext2D): void {
    if (!this.ghost) return;
    const z = this.state.zone;
    const s = this.scale;
    const g = this.ghost;
    ctx.globalAlpha = 0.68;
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const t = g.ground[y * g.w + x]!;
        if (t === GHOST_SKIP) continue;
        const lx = g.at.x + x;
        const ly = g.at.y + y;
        if (lx < 0 || ly < 0 || lx >= z.width || ly >= z.height) continue;
        const def = tileDef(t);
        ctx.fillStyle = def.color;
        ctx.fillRect(this.sx(lx), this.sy(ly), s, s);
        if (def.raised && def.topColor) {
          ctx.fillStyle = def.topColor;
          ctx.fillRect(this.sx(lx), this.sy(ly), s, s * 0.35);
        }
        const d = g.detail?.[y * g.w + x] ?? 0;
        if (d !== 0) {
          ctx.fillStyle = 'rgba(240, 230, 200, 0.7)';
          ctx.beginPath();
          ctx.arc(this.sx(lx) + s / 2, this.sy(ly) + s / 2, Math.max(1.5, s * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const pin of g.pins ?? []) {
      const lx = g.at.x + pin.dx;
      const ly = g.at.y + pin.dy;
      ctx.fillStyle = pin.color;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.sx(lx) + s / 2, this.sy(ly) + s / 2, Math.max(3, s * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = '#e8a33d';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(this.sx(g.at.x), this.sy(g.at.y), g.w * s, g.h * s);
    ctx.setLineDash([]);
  }

  private drawSelection(ctx: CanvasRenderingContext2D, nowMs: number): void {
    const sel = this.state.selection;
    if (!sel) return;
    const s = this.scale;
    const x = this.sx(Math.min(sel.x0, sel.x1));
    const y = this.sy(Math.min(sel.y0, sel.y1));
    const w = (Math.abs(sel.x1 - sel.x0) + 1) * s;
    const h = (Math.abs(sel.y1 - sel.y0) + 1) * s;
    ctx.strokeStyle = '#0a0612';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#e8dfc8';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -(nowMs / 40) % 9;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    // Dimensions chip — the measurement every builder wants mid-drag.
    const label = `${Math.abs(sel.x1 - sel.x0) + 1} × ${Math.abs(sel.y1 - sel.y0) + 1}`;
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    const tw = ctx.measureText(label).width;
    const lx = x;
    const ly = y - 20 < 4 ? y + h + 4 : y - 20;
    ctx.fillStyle = 'rgba(10, 6, 18, 0.85)';
    ctx.fillRect(lx, ly, tw + 12, 16);
    ctx.strokeStyle = 'rgba(232, 223, 200, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx + 0.5, ly + 0.5, tw + 11, 15);
    ctx.fillStyle = '#e8dfc8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 6, ly + 8.5);
  }

  private drawZoneFrame(ctx: CanvasRenderingContext2D): void {
    const z = this.state.zone;
    ctx.strokeStyle = 'rgba(232, 163, 61, 0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.sx(0), this.sy(0), z.width * this.scale, z.height * this.scale);
  }
}

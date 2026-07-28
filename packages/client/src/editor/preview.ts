import { CHUNK_SIZE, Detail, TILE_PX, Tile } from '@arx/shared';
import type { PrefabDef, StructureTemplate } from '@arx/content';
import { templateHeight, templateWidth } from '@arx/content';
import { bakeChunk, bakeGutter } from '../render/terrain.js';
import { drawBlockTile, overlayKind, drawTreeSprite } from './render.js';

/**
 * REAL-ART MINI RENDERS. Structure cards, prefab cards, and any other
 * "show me the content" surface render through the exact pipeline the
 * canvas uses: the game's chunk bake for the ground, tree sprites and
 * schematic blocks for standing tiles. A card preview is a small
 * truthful picture of what will stand in the world — never a mosaic
 * of flat color squares.
 */

export interface PreviewLayers {
  width: number;
  height: number;
  /** GHOST-style arrays; 0xffff ground = transparent (context grass). */
  ground: Uint16Array;
  detail: Uint16Array;
  elev?: Int8Array;
}

const TRANSPARENT = 0xffff;

/**
 * Bake + overlay a tile rect into a canvas capped at `box` px on the
 * long side. Transparent cells read as the surrounding meadow, so an
 * L-shaped stamp previews on the grass it will actually stand on.
 */
export function renderLayersPreview(layers: PreviewLayers, box = 148): HTMLCanvasElement {
  const { width: w, height: h } = layers;
  // Bake at full tile resolution, then downscale once — crisp at any card size.
  const pad = 1; // one tile of breathing meadow around the content
  const bw = w + pad * 2;
  const bh = h + pad * 2;
  const ground = (tx: number, ty: number): number | undefined => {
    const x = tx - pad;
    const y = ty - pad;
    if (x < 0 || y < 0 || x >= w || y >= h) return Tile.Grass;
    const g = layers.ground[y * w + x]!;
    return g === TRANSPARENT ? Tile.Grass : g;
  };
  const detail = (tx: number, ty: number): number => {
    const x = tx - pad;
    const y = ty - pad;
    if (x < 0 || y < 0 || x >= w || y >= h) return Detail.None;
    return layers.detail[y * w + x]!;
  };
  const elev = (tx: number, ty: number): number => {
    if (!layers.elev) return 0;
    const x = tx - pad;
    const y = ty - pad;
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return layers.elev[y * w + x]!;
  };

  const G = bakeGutter(TILE_PX);
  const full = document.createElement('canvas');
  full.width = bw * TILE_PX;
  full.height = bh * TILE_PX;
  const fctx = full.getContext('2d')!;
  const c1x = Math.floor((bw - 1) / CHUNK_SIZE);
  const c1y = Math.floor((bh - 1) / CHUNK_SIZE);
  for (let cy = 0; cy <= c1y; cy++) {
    for (let cx = 0; cx <= c1x; cx++) {
      const bake = bakeChunk(ground, detail, elev, cx, cy, TILE_PX);
      fctx.drawImage(
        bake,
        G,
        G,
        CHUNK_SIZE * TILE_PX,
        CHUNK_SIZE * TILE_PX,
        cx * CHUNK_SIZE * TILE_PX,
        cy * CHUNK_SIZE * TILE_PX,
        CHUNK_SIZE * TILE_PX,
        CHUNK_SIZE * TILE_PX,
      );
    }
  }
  // Standing-content overlay, row order for correct stacking.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const g = layers.ground[y * w + x]!;
      if (g === TRANSPARENT) continue;
      const kind = overlayKind(g as Tile);
      if (kind === 'none') continue;
      const px = (x + pad) * TILE_PX;
      const py = (y + pad) * TILE_PX;
      if (kind === 'tree') {
        drawTreeSprite(fctx, g as Tile, x, y, px, py, TILE_PX);
      } else {
        drawBlockTile(fctx, px, py, TILE_PX, g as Tile);
      }
    }
  }

  // One high-quality downscale into the card canvas.
  const scale = Math.min(box / full.width, box / full.height, 1);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(full.width * scale));
  out.height = Math.max(1, Math.round(full.height * scale));
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(full, 0, 0, out.width, out.height);
  return out;
}

export function templateLayers(tpl: StructureTemplate): PreviewLayers {
  const w = templateWidth(tpl);
  const h = templateHeight(tpl);
  const ground = new Uint16Array(w * h).fill(TRANSPARENT);
  const detail = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = tpl.rows[y]!;
    for (let x = 0; x < w; x++) {
      const cell = row[x] === ' ' ? undefined : tpl.legend[row[x]!];
      if (!cell) continue;
      if (cell.tile !== undefined) ground[y * w + x] = cell.tile;
      if (cell.detail !== undefined) detail[y * w + x] = cell.detail;
    }
  }
  return { width: w, height: h, ground, detail };
}

export function prefabLayers(p: PrefabDef): PreviewLayers {
  return {
    width: p.width,
    height: p.height,
    ground: p.ground,
    detail: p.detail,
    elev: p.elev,
  };
}

/** Placement pins drawn over a finished preview canvas. */
export function drawPreviewPins(
  canvas: HTMLCanvasElement,
  layers: PreviewLayers,
  pins: Array<{ dx: number; dy: number; color: string }>,
  box = 148,
): void {
  const pad = 1;
  const fullW = (layers.width + pad * 2) * TILE_PX;
  const scale = Math.min(box / fullW, box / ((layers.height + pad * 2) * TILE_PX), 1);
  const ctx = canvas.getContext('2d')!;
  const s = TILE_PX * scale;
  for (const pin of pins) {
    const cx = (pin.dx + pad + 0.5) * s;
    const cy = (pin.dy + pad + 0.5) * s;
    ctx.fillStyle = pin.color;
    ctx.strokeStyle = '#241a2e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, s * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}


import { EXPLORE_REGION, REGION_CELLS, type ExploredMask } from '@arx/shared';

/**
 * THE FOG — unexplored ground is blank parchment; the map literally
 * draws itself in as you walk (user decree: no terrain ghost). Region
 * bitmasks become small alpha canvases (one pixel per 4-tile cell)
 * that scale up with smoothing, so the charted frontier reads as a
 * soft organic edge, never a staircase of squares.
 */

/** Pure bit→alpha expansion (one byte of coverage per cell). */
export function maskBitsToAlpha(bytes: Uint8Array, out: Uint8ClampedArray): void {
  const n = REGION_CELLS * REGION_CELLS;
  for (let i = 0; i < n; i++) {
    out[i * 4 + 3] = bytes[i >> 3]! & (1 << (i & 7)) ? 255 : 0;
  }
}

interface FogEntry {
  version: number;
  canvas: HTMLCanvasElement;
}

/**
 * Region-mask canvas cache. Rebuilds a region's canvas only when the
 * chart version has moved past the cached bake.
 */
export class FogLayer {
  private readonly regions = new Map<string, FogEntry>();

  regionCanvas(mask: ExploredMask, rx: number, ry: number, version: number): HTMLCanvasElement | null {
    const bytes = mask.regionBytes(rx, ry);
    if (!bytes) return null;
    const key = `${rx},${ry}`;
    let entry = this.regions.get(key);
    if (!entry || entry.version !== version) {
      const canvas = entry?.canvas ?? document.createElement('canvas');
      canvas.width = REGION_CELLS;
      canvas.height = REGION_CELLS;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(REGION_CELLS, REGION_CELLS);
      maskBitsToAlpha(bytes, img.data);
      ctx.putImageData(img, 0, 0);
      entry = { version, canvas };
      this.regions.set(key, entry);
      if (this.regions.size > 256) {
        const first = this.regions.keys().next().value as string;
        this.regions.delete(first);
      }
    }
    return entry.canvas;
  }

  /**
   * Paint the coverage mask for the visible span into `ctx` (white
   * where charted, clear where fog). Smoothing ON so the frontier
   * blooms softly at map scale.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    mask: ExploredMask,
    version: number,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
    sx: (tx: number) => number,
    sy: (ty: number) => number,
    scale: number,
  ): void {
    ctx.imageSmoothingEnabled = true;
    const r0x = Math.floor(tx0 / EXPLORE_REGION);
    const r1x = Math.floor(tx1 / EXPLORE_REGION);
    const r0y = Math.floor(ty0 / EXPLORE_REGION);
    const r1y = Math.floor(ty1 / EXPLORE_REGION);
    for (let ry = r0y; ry <= r1y; ry++) {
      for (let rx = r0x; rx <= r1x; rx++) {
        const cnv = this.regionCanvas(mask, rx, ry, version);
        if (!cnv) continue;
        ctx.drawImage(
          cnv,
          sx(rx * EXPLORE_REGION),
          sy(ry * EXPLORE_REGION),
          EXPLORE_REGION * scale,
          EXPLORE_REGION * scale,
        );
      }
    }
  }
}

let parchment: HTMLCanvasElement | null = null;

/**
 * The uncharted vellum — warm base with seeded mottle blotches and a
 * few fiber flecks, tiled as a pattern. Painted once; deterministic
 * (no Math.random) so every open reads as the same sheet.
 */
export function parchmentCanvas(): HTMLCanvasElement {
  if (parchment) return parchment;
  const S = 256;
  const cnv = document.createElement('canvas');
  cnv.width = S;
  cnv.height = S;
  const ctx = cnv.getContext('2d')!;
  ctx.fillStyle = '#cdbc94';
  ctx.fillRect(0, 0, S, S);
  let h = 0x9e3779b9;
  const rnd = (): number => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 0xffffffff;
  };
  // Mottle: broad soft blotches a shade darker and lighter.
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 14 + rnd() * 40;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(160, 141, 100, 0.05)' : 'rgba(232, 220, 184, 0.06)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fibers: short faint strokes in the weave.
  ctx.strokeStyle = 'rgba(122, 106, 74, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const a = rnd() * Math.PI;
    const len = 3 + rnd() * 9;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  parchment = cnv;
  return cnv;
}

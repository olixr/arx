/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. No per-sprite
 *   tinting, ever.
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - WALLS STOP LIGHT. Big static lights cast hard 2D shadows: solid
 *   tiles project silhouette quads that erase the light behind them.
 *   Sharp-edged, like every shadow in this game.
 * - DAYLIGHT IS FREE. At full sun the ambient is white and the entire
 *   pass is skipped — the system costs nothing until dusk.
 * - QUARTER RES IS PLENTY. Light is low-frequency; the map renders at
 *   1/3 scale and stretches up. Gradients stay smooth, fills stay tiny.
 */
import type { DaylightSample } from '@devcraft/shared';

/** A light living in the world, gathered fresh each frame. */
export interface WorldLight {
  x: number;
  y: number;
  /** Reach in world tiles. */
  r: number;
  rgb: [number, number, number];
  /** Peak brightness at the core, 0..1. */
  intensity: number;
  /** Static architectural lights cast hard wall shadows. */
  occlude?: boolean;
}

/** Everything the lightmap needs to share the camera's view. */
export interface LightView {
  w: number;
  h: number;
  scale: number;
  yScale: number;
  /** Screen-space origin: worldToScreen(0,0). */
  ox: number;
  oy: number;
}

const MAP_DOWNSCALE = 3;

export class LightingSystem {
  private readonly map = document.createElement('canvas');
  private readonly mctx = this.map.getContext('2d')!;
  private readonly tmp = document.createElement('canvas');
  private readonly tctx = this.tmp.getContext('2d')!;

  /**
   * Paint the frame's exposure. `blocks` answers whether a tile stops
   * light (walls, cliffs); it is only consulted near occluding lights.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    view: LightView,
    sky: DaylightSample,
    lights: WorldLight[],
    blocks: (tx: number, ty: number) => boolean,
  ): void {
    if (sky.darkness < 0.02) return; // full daylight: multiply-by-white
    const mw = Math.max(1, Math.ceil(view.w / MAP_DOWNSCALE));
    const mh = Math.max(1, Math.ceil(view.h / MAP_DOWNSCALE));
    if (this.map.width !== mw || this.map.height !== mh) {
      this.map.width = mw;
      this.map.height = mh;
    }
    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    const [ar, ag, ab] = sky.ambient;
    m.fillStyle = `rgb(${ar | 0}, ${ag | 0}, ${ab | 0})`;
    m.fillRect(0, 0, mw, mh);

    // The camera transform at map scale: world coords in, map px out.
    const k = 1 / MAP_DOWNSCALE;
    const sx = view.scale * k;
    const sy = view.scale * view.yScale * k;
    const tx = view.ox * k;
    const ty = view.oy * k;

    for (const light of lights) {
      if (light.intensity <= 0.01) continue;
      if (light.occlude) {
        this.drawOccludedLight(light, blocks, sx, sy, tx, ty);
      } else {
        m.setTransform(sx, 0, 0, sy, tx, ty);
        m.globalCompositeOperation = 'screen';
        m.fillStyle = this.gradient(m, light);
        m.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
      }
    }

    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.map, 0, 0, mw, mh, 0, 0, view.w, view.h);
    ctx.restore();
  }

  /** The light's radial falloff, in the ctx's world-space frame. */
  private gradient(g: CanvasRenderingContext2D, light: WorldLight): CanvasGradient {
    const [r, gg, b] = light.rgb;
    const grad = g.createRadialGradient(light.x, light.y, light.r * 0.06, light.x, light.y, light.r);
    const stop = (a: number): string => `rgba(${r}, ${gg}, ${b}, ${a * light.intensity})`;
    grad.addColorStop(0, stop(1));
    grad.addColorStop(0.35, stop(0.66));
    grad.addColorStop(0.7, stop(0.24));
    grad.addColorStop(1, stop(0));
    return grad;
  }

  /**
   * A light with wall shadows: painted alone on a scratch canvas, its
   * shadow quads erased, then screened onto the map — so erasing the
   * shadow never bites into the ambient or any other light.
   */
  private drawOccludedLight(
    light: WorldLight,
    blocks: (tx: number, ty: number) => boolean,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
  ): void {
    // Scratch bbox in map pixels around the light.
    const bx = Math.floor(light.x * sx + tx - light.r * sx) - 1;
    const by = Math.floor(light.y * sy + ty - light.r * sy) - 1;
    const bw = Math.ceil(light.r * 2 * sx) + 2;
    const bh = Math.ceil(light.r * 2 * sy) + 2;
    if (bw <= 0 || bh <= 0) return;
    if (this.tmp.width < bw || this.tmp.height < bh) {
      this.tmp.width = Math.max(this.tmp.width, bw);
      this.tmp.height = Math.max(this.tmp.height, bh);
    }
    const t = this.tctx;
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, bw, bh);
    // Same world→map transform, shifted into the scratch frame.
    t.setTransform(sx, 0, 0, sy, tx - bx, ty - by);
    t.fillStyle = this.gradient(t, light);
    t.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);

    // Hard shadows: every back-facing edge of every solid tile in
    // reach projects away from the light to beyond its radius.
    t.globalCompositeOperation = 'destination-out';
    t.fillStyle = '#000';
    const t0x = Math.floor(light.x - light.r);
    const t1x = Math.ceil(light.x + light.r);
    const t0y = Math.floor(light.y - light.r);
    const t1y = Math.ceil(light.y + light.r);
    const lTx = Math.floor(light.x);
    const lTy = Math.floor(light.y);
    for (let cy = t0y; cy <= t1y; cy++) {
      for (let cx = t0x; cx <= t1x; cx++) {
        if (cx === lTx && cy === lTy) continue;
        if (!blocks(cx, cy)) continue;
        this.castTileShadow(t, light, cx, cy);
      }
    }
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-over';

    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'screen';
    m.drawImage(this.tmp, 0, 0, bw, bh, bx, by, bw, bh);
  }

  /** Project the tile square's silhouette away from the light. */
  private castTileShadow(
    t: CanvasRenderingContext2D,
    light: WorldLight,
    cx: number,
    cy: number,
  ): void {
    // Corners clockwise; edges (a,b) with outward normals.
    const c: Array<[number, number]> = [
      [cx, cy],
      [cx + 1, cy],
      [cx + 1, cy + 1],
      [cx, cy + 1],
    ];
    const normals: Array<[number, number]> = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    const reach = light.r * 2.2;
    for (let e = 0; e < 4; e++) {
      const a = c[e]!;
      const b = c[(e + 1) % 4]!;
      const mx = (a[0] + b[0]) / 2 - light.x;
      const my = (a[1] + b[1]) / 2 - light.y;
      // Back-facing: the edge's outward normal agrees with the ray
      // from the light — this edge is the far silhouette.
      if (mx * normals[e]![0] + my * normals[e]![1] <= 0) continue;
      const da = Math.hypot(a[0] - light.x, a[1] - light.y) || 1;
      const db = Math.hypot(b[0] - light.x, b[1] - light.y) || 1;
      const ax = a[0] + ((a[0] - light.x) / da) * reach;
      const ay = a[1] + ((a[1] - light.y) / da) * reach;
      const bx2 = b[0] + ((b[0] - light.x) / db) * reach;
      const by2 = b[1] + ((b[1] - light.y) / db) * reach;
      t.beginPath();
      t.moveTo(a[0], a[1]);
      t.lineTo(b[0], b[1]);
      t.lineTo(bx2, by2);
      t.lineTo(ax, ay);
      t.closePath();
      t.fill();
    }
  }
}

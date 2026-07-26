/**
 * The scene light pass: one low-resolution lightmap multiplied over the
 * finished world painting.
 *
 * Design laws:
 * - ONE MAP RULES EXPOSURE. The daylight ambient fills the map; every
 *   point light punches brightness back in with `screen` compositing.
 *   Multiply once over the frame and the whole scene — terrain, grass,
 *   sprites, particles — darkens and warms coherently. (The body
 *   relight pass in the renderer is the map's one licensed partner: it
 *   CORRECTS a sprite toward the exposure at its own base, it never
 *   invents light the map doesn't know about.)
 * - LIGHT IS GEOGRAPHY. The map is drawn in WORLD space through the
 *   camera transform, so light pools are ground ellipses (foreshortened
 *   by the camera pitch like everything else), not screen-space discs.
 * - WALLS STOP LIGHT. Big static lights cast hard 2D shadows: solid
 *   tiles project silhouette quads that erase the light behind them.
 *   Sharp-edged, like every shadow in this game.
 * - LIGHT CLIMBS WHAT IT MEETS (v2). EVERY tall thing standing in a
 *   pool — wall, stall, station, pillar, tree — catches the light on
 *   the face the camera sees: a vertical gradient rising from its BASE
 *   row, graded by N·L (how squarely the face looks at the light) and
 *   the pool's falloff, hottest at the foot and dying up the face.
 *   Heights come from the renderer's `tallH(tx,ty)` callback (world-y
 *   units — screen-vertical faces divide the camera squash back out).
 *   Faces behind an occluder stay dark: a coarse line-of-sight walk
 *   against `blocks` gates every face an occluding light paints.
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

/** One camera-facing face a light strikes: [x0, x1, baseY, k, h]. */
type LitFace = [number, number, number, number, number];

const MAP_DOWNSCALE = 3;

export class LightingSystem {
  private readonly map = document.createElement('canvas');
  private readonly mctx = this.map.getContext('2d')!;
  private readonly tmp = document.createElement('canvas');
  private readonly tctx = this.tmp.getContext('2d')!;
  /** Scratch face list, reused across lights — no per-frame garbage. */
  private readonly faces: LitFace[] = [];

  /**
   * Paint the frame's exposure. `blocks` answers whether a tile stops
   * light (walls, cliffs); it is only consulted near occluding lights.
   * `tallH` reports the camera-facing face height of whatever stands
   * on a tile, in WORLD-y units (0 = nothing tall) — it drives the
   * lit-face response for walls AND standing props alike.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    view: LightView,
    sky: DaylightSample,
    lights: WorldLight[],
    blocks: (tx: number, ty: number) => boolean,
    tallH: (tx: number, ty: number) => number,
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
        this.drawOccludedLight(light, blocks, tallH, sx, sy, tx, ty);
      } else {
        m.setTransform(sx, 0, 0, sy, tx, ty);
        m.globalCompositeOperation = 'screen';
        m.fillStyle = this.gradient(m, light);
        m.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
        // Standing content in the pool catches the light — no shadow
        // math for free-floating lights, so no LOS gate either.
        this.gatherFaces(light, tallH, null);
        this.paintFaces(m, light);
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
   * Fill `this.faces` with every camera-visible face this light
   * strikes: any tile reporting a tall face whose south edge looks at
   * the light. Brightness follows N·L and the pool's falloff. When
   * `blocks` is given (occluding lights), a coarse tile walk along the
   * sight line drops faces standing behind a wall — light lands ON the
   * first thing it meets, never through it.
   */
  private gatherFaces(
    light: WorldLight,
    tallH: (tx: number, ty: number) => number,
    blocks: ((tx: number, ty: number) => boolean) | null,
  ): void {
    this.faces.length = 0;
    const t0x = Math.floor(light.x - light.r);
    const t1x = Math.ceil(light.x + light.r);
    const t0y = Math.floor(light.y - light.r);
    const t1y = Math.ceil(light.y + light.r);
    for (let cy = t0y; cy <= t1y; cy++) {
      for (let cx = t0x; cx <= t1x; cx++) {
        const h = tallH(cx, cy);
        if (h <= 0) continue;
        // South edge midpoint, relative to the light. The face is lit
        // only when the light stands SOUTH of it (the side the camera
        // sees); N·L is how squarely it faces the pool.
        const mx = cx + 0.5 - light.x;
        const my = cy + 1 - light.y;
        if (my >= 0) continue;
        const d = Math.hypot(mx, my) || 1;
        if (d >= light.r) continue;
        const fall = 1 - d / light.r;
        const k = Math.min(0.6, light.intensity * Math.pow(fall, 1.4) * (-my / d) * 0.85);
        if (k <= 0.03) continue;
        if (blocks && d > 2 && !this.faceVisible(light, cx + 0.5, cy + 1, d, blocks)) continue;
        this.faces.push([cx, cx + 1, cy + 1, k, h]);
      }
    }
  }

  /** Coarse LOS: sample the sight line one tile at a time, keeping
   *  0.7 tiles clear of both endpoints so neither the light's own tile
   *  nor the face's body blocks itself. */
  private faceVisible(
    light: WorldLight,
    fx: number,
    fy: number,
    d: number,
    blocks: (tx: number, ty: number) => boolean,
  ): boolean {
    const ux = (fx - light.x) / d;
    const uy = (fy - light.y) / d;
    for (let t = 0.7; t < d - 0.7; t += 1) {
      if (blocks(Math.floor(light.x + ux * t), Math.floor(light.y + uy * t))) return false;
    }
    return true;
  }

  /** Paint the gathered faces into a world-transformed ctx: a vertical
   *  gradient rising from each base row, hottest at the foot. */
  private paintFaces(g: CanvasRenderingContext2D, light: WorldLight): void {
    const [r, gg, b] = light.rgb;
    for (const [x0, x1, ye, k, h] of this.faces) {
      const grad = g.createLinearGradient(0, ye, 0, ye - h);
      grad.addColorStop(0, `rgba(${r}, ${gg}, ${b}, ${k})`);
      grad.addColorStop(0.55, `rgba(${r}, ${gg}, ${b}, ${k * 0.45})`);
      grad.addColorStop(1, `rgba(${r}, ${gg}, ${b}, 0)`);
      g.fillStyle = grad;
      g.fillRect(x0, ye - h, x1 - x0, h);
    }
  }

  /**
   * A light with wall shadows: painted alone on a scratch canvas, its
   * shadow quads erased, then screened onto the map — so erasing the
   * shadow never bites into the ambient or any other light. Lit faces
   * paint AFTER the erase: they re-light exactly the band a wall's own
   * occlusion wedge blacked out.
   */
  private drawOccludedLight(
    light: WorldLight,
    blocks: (tx: number, ty: number) => boolean,
    tallH: (tx: number, ty: number) => number,
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
    // reach projects away from the light to beyond its radius — with
    // a half-strength penumbra fringe so the wedge softens toward its
    // rim instead of ending on a razor line.
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
    t.globalCompositeOperation = 'source-over';
    // THE LIT FACES: everything standing in the pool — the walls that
    // just erased their own wedges AND the stalls, stations and trees
    // the shadow math never knew — catches the lamp on the side the
    // camera sees, LOS-gated so nothing glows through a wall.
    this.gatherFaces(light, tallH, blocks);
    this.paintFaces(t, light);
    t.setTransform(1, 0, 0, 1, 0, 0);

    const m = this.mctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'screen';
    m.drawImage(this.tmp, 0, 0, bw, bh, bx, by, bw, bh);
  }

  /**
   * Project the tile square's silhouette away from the light. Each
   * occluding edge erases twice: a slightly splayed half-alpha quad
   * (penumbra), then the exact hard quad (umbra) — the shadow's rim
   * softens the further it runs, the core stays black.
   */
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
    const PEN = 0.085; // penumbra splay, radians
    const cosP = Math.cos(PEN);
    const sinP = Math.sin(PEN);
    for (let e = 0; e < 4; e++) {
      const a = c[e]!;
      const b = c[(e + 1) % 4]!;
      const mx = (a[0] + b[0]) / 2 - light.x;
      const my = (a[1] + b[1]) / 2 - light.y;
      // Front-facing: the light strikes this side — nothing to erase.
      if (mx * normals[e]![0] + my * normals[e]![1] <= 0) continue;
      const dax = a[0] - light.x;
      const day = a[1] - light.y;
      const dbx = b[0] - light.x;
      const dby = b[1] - light.y;
      const da = Math.hypot(dax, day) || 1;
      const db = Math.hypot(dbx, dby) || 1;
      const uax = dax / da;
      const uay = day / da;
      const ubx = dbx / db;
      const uby = dby / db;
      // Penumbra: corner rays splayed outward (a away from b's side,
      // b away from a's side), erased at half strength.
      t.globalAlpha = 0.45;
      t.beginPath();
      t.moveTo(a[0], a[1]);
      t.lineTo(b[0], b[1]);
      t.lineTo(b[0] + (ubx * cosP - uby * sinP) * reach, b[1] + (uby * cosP + ubx * sinP) * reach);
      t.lineTo(a[0] + (uax * cosP + uay * sinP) * reach, a[1] + (uay * cosP - uax * sinP) * reach);
      t.closePath();
      t.fill();
      // Umbra: the exact silhouette wedge, fully dark.
      t.globalAlpha = 1;
      t.beginPath();
      t.moveTo(a[0], a[1]);
      t.lineTo(b[0], b[1]);
      t.lineTo(b[0] + ubx * reach, b[1] + uby * reach);
      t.lineTo(a[0] + uax * reach, a[1] + uay * reach);
      t.closePath();
      t.fill();
    }
  }
}

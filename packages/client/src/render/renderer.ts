import {
  CHUNK_SIZE,
  DRAW_FULL_TICKS,
  EntityKind,
  PoseState,
  STATUS_BIT,
  TICK_MS,
  TILE_PX,
  Tile,
  hashCoords,
  hashString,
  tileDef,
  daylightAt,
  type ChunkData,
  type DaylightSample,
  type Vec2,
} from '@devcraft/shared';
import { itemDef, npcDef } from '@devcraft/content';
import type { ClientGame } from '../game/clientGame.js';
import {
  ANVIL_CYCLE_MS,
  CHOP_CYCLE_MS,
  FURNACE_CYCLE_MS,
  LegSolver,
  MINE_CYCLE_MS,
  drawBeast,
  drawHumanoid,
  shade,
} from './rig.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { Particles } from './particles.js';
import { GrassSystem, windScalarAt, type Disturber } from './grass.js';
import { LightingSystem, type WorldLight } from './lighting.js';
import { bakeChunk, bakeElevated, drawLiveGround } from './terrain.js';

/**
 * Signature style: shadows are solid and sharp — never blurred. They
 * are CAST by the sky: direction, length and depth all ride the
 * daylight law (sim/daylight), sweeping with the sun and going faint
 * and blue under the moon. Two families:
 * - CAST shadows (trees, walls, rocks, stations) — the silhouette
 *   thrown along the sun, gone entirely through the twilight gap.
 * - CONTACT shadows (feet of characters, drops, cliff seams) — the
 *   grounding ellipse that never fully disappears.
 * Ground-level shadows batch onto one layer per frame so overlapping
 * dusk shadows merge instead of stacking darker.
 */
const SHADOW_SUN = '#180e20';
const SHADOW_MOON = '#0e1430';
const CONTACT_MIN = 0.15;
const CONTACT_MAX = 0.3;

/**
 * The 2.5D depth pass. The ground stays a flat top-down plane (so all
 * collision, aim, and netcode math is untouched), but everything with
 * height EXTRUDES upward on screen and leans away from the screen
 * center — a fake tilted camera. Paired with the per-item y-sort this
 * buys true walk-behind occlusion: a wall or canopy south of you draws
 * over you, one north of you slides behind.
 */
const WALL_H = 1.15; // wall extrusion height, in tiles
/**
 * Height of ONE terrain elevation level, in tiles of screen rise.
 * Taller than a wall on purpose: cliffs are landforms, not masonry.
 * Everything derives from this one number — lifted ground bands, cliff
 * faces, stair treads, and the rise of anything standing up there.
 */
const ELEV_H = 1.35;
/**
 * Horizontal lean per tile of height. ZERO: verticals rise straight on
 * screen, exactly like the billboard sprites — the classic 3/4-view
 * contract. Leaning tops read as a warped world, not a moved camera
 * (tried, rejected). The machinery stays for a possible future
 * cutscene-camera, but gameplay is straight-vertical.
 */
const PERSP_LEAN = 0;

const PLAYER_COLORS = ['#c4553d', '#3d78c4', '#3da865', '#c4a03d', '#8a55c4', '#3da8a0', '#c47a3d'];

interface AnimState {
  walkPhase: number;
  lastX: number;
  lastY: number;
  lastPose: number;
  poseStartedAt: number;
  lastSeen: number;
  legs?: LegSolver;
  /** Per-leg knee-sign hysteresis for the pole constraint. */
  kneeMemory: [number, number];
  /** Last chop cycle that spawned impact chips (gathering). */
  lastChopHit?: number;
}

export class Camera {
  x = 0;
  y = 0;
  scale = TILE_PX * 1.25;
  /**
   * Camera pitch: an orthographic camera tilted down at the flat world
   * compresses the ground plane UNIFORMLY (cos of the pitch angle) —
   * every row the same, which is why the ground reads flat and stable.
   * Vertical heights render at full scale; that contrast IS the tilt.
   * ~0.6 ≈ a camera at ~37° above the horizon — down at shoulder
   * height with the world, not overhead.
   */
  readonly yScale = 0.6;

  /**
   * The camera's screen-space origin, SNAPPED to whole pixels. Every
   * layer then translates by the same integer each frame — terrain
   * blits, wall geometry and sprites move in lockstep. With a subpixel
   * origin, anything that pixel-rounds its own coordinates (walls,
   * stair seams) crosses pixel boundaries on different frames than the
   * smoothly-resampled ground and appears to oscillate on its own
   * layer. Standard pixel-camera discipline: snap once, at the source.
   */
  private originX(w: number): number {
    return Math.round(w / 2 - this.x * this.scale);
  }

  private originY(h: number): number {
    return Math.round(h / 2 - this.y * this.scale * this.yScale);
  }

  worldToScreen(wx: number, wy: number, w: number, h: number): Vec2 {
    return {
      x: wx * this.scale + this.originX(w),
      y: wy * this.scale * this.yScale + this.originY(h),
    };
  }

  screenToWorld(sx: number, sy: number, w: number, h: number): Vec2 {
    return {
      x: (sx - this.originX(w)) / this.scale,
      y: (sy - this.originY(h)) / (this.scale * this.yScale),
    };
  }
}

interface BakedChunk {
  canvas: HTMLCanvasElement;
  data: ChunkData;
  rev: number;
  /**
   * Lifted-terrain layers, one per elevation level present in the
   * chunk. Bands are contiguous row runs [startRow, endRow] (inclusive,
   * padded a row each way for the contour bleed) — each becomes one
   * y-sorted DrawItem so plateaus occlude what stands behind them.
   */
  lifted: Array<{
    level: number;
    canvas: HTMLCanvasElement;
    bands: Array<[number, number]>;
  }>;
}

interface DrawItem {
  sortY: number;
  draw: () => void;
  drawShadow?: () => void;
  /**
   * Standing on lifted terrain: the shadow must land ON the plateau
   * surface, so it draws in sorted order (just before the sprite)
   * instead of in the ground-level shadow prepass — otherwise the
   * plateau band, drawn later, would paint it out.
   */
  elevated?: boolean;
}

export class Renderer {
  readonly camera = new Camera();
  readonly particles = new Particles();
  private readonly grass = new GrassSystem();
  private readonly lighting = new LightingSystem();
  /** The frame's sky sample — every shadow and light reads this. */
  private sky: DaylightSample = daylightAt(12);
  /** Scene lights gathered this frame (tiles, projectiles, flames). */
  private readonly lights: WorldLight[] = [];
  /** Ground shadows batch here, composited once at the sky's alpha. */
  private readonly shadowLayer = document.createElement('canvas');
  private readonly shadowLayerCtx = this.shadowLayer.getContext('2d')!;
  /** Where shadow helpers draw right now (batch layer or the frame). */
  private sdw: CanvasRenderingContext2D = this.shadowLayerCtx;
  private sdwLayerAlpha = 1;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly baked = new Map<string, BakedChunk>();
  private readonly anims = new Map<number | 'own', AnimState>();
  private shakeAmount = 0;
  private frameDt = 1 / 60;
  private w = 0;
  private h = 0;
  private hitstopUntil = 0;
  private vignetteUntil = 0;
  private zoomPulseAmount = 0;
  private readonly rings: Array<{ x: number; y: number; color: string; bornAt: number; maxR: number }> = [];
  private readonly deathGhosts: Array<{ x: number; y: number; color: string; radius: number; bornAt: number }> = [];

  /** A quick camera zoom kick — the killing-blow exclamation point. */
  zoomPulse(amount = 0.045): void {
    this.zoomPulseAmount = Math.min(0.08, this.zoomPulseAmount + amount);
  }

  /** A fading, flattening silhouette where something died. */
  addDeathGhost(x: number, y: number, color: string, radius: number): void {
    this.deathGhosts.push({ x, y, color, radius, bornAt: performance.now() });
    if (this.deathGhosts.length > 12) this.deathGhosts.shift();
  }

  /** Freeze-frame: animation and particles crawl for a beat on impact. */
  hitstop(seconds: number): void {
    this.hitstopUntil = Math.max(this.hitstopUntil, performance.now() + seconds * 1000);
  }

  /** Red edge flash when the local player takes damage. */
  flashHurt(): void {
    this.vignetteUntil = performance.now() + 320;
  }

  /** Expanding impact ring at a world position. */
  addRing(x: number, y: number, color: string, maxR = 0.5): void {
    this.rings.push({ x, y, color, bornAt: performance.now(), maxR });
    if (this.rings.length > 24) this.rings.shift();
  }

  /** Placement preview set by the build mode; null when inactive. */
  buildGhost: { tx: number; ty: number; valid: boolean; color: string } | null = null;

  /** Emissive glow requests queued during the frame, composited last. */
  private readonly glows: Array<{ x: number; y: number; r: number; rgb: string; a: number }> = [];

  /**
   * Perspective lean, applied PER VERTEX: a point `heightTiles` above
   * the ground at screen column `x` lands at `leanX(x, h)` — an affine
   * horizontal scale of that height-layer about the screen center.
   * Because it's affine, two structures sharing an edge share exactly
   * the same leaned edge: runs of walls, trunks meeting canopies, and
   * abutting crowns can never crack, at any lean strength.
   */
  private leanX(x: number, heightTiles: number): number {
    return x + (x - this.w / 2) * PERSP_LEAN * heightTiles;
  }

  /**
   * Enter the leaned frame for a whole layer at a given height: after
   * this transform, drawing FOOTPRINT coordinates paints them lifted by
   * `heightTiles` and leaned coherently. Pair with ctx.restore().
   */
  private beginHeightLayer(heightTiles: number): void {
    const k = 1 + PERSP_LEAN * heightTiles;
    this.ctx.save();
    this.ctx.translate(this.w / 2, -heightTiles * this.camera.scale);
    this.ctx.scale(k, 1);
    this.ctx.translate(-this.w / 2, 0);
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** The game being rendered this frame (for world lookups in painters). */
  private game: ClientGame | null = null;

  /** Fires once per tool-impact while someone gathers ('tree' | 'rock'). */
  onGatherImpact: ((kind: string) => void) | null = null;

  /** Nearest crafting station around a world position, if any. */
  private findStation(
    x: number,
    y: number,
  ): { tx: number; ty: number; kind: 'anvil' | 'furnace' | 'fire' | 'workbench' } | null {
    const game = this.game;
    if (!game) return null;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let best: { tx: number; ty: number; kind: 'anvil' | 'furnace' | 'fire' | 'workbench'; d: number } | null =
      null;
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const t = game.world.groundAt(tx, ty);
        const kind =
          t === Tile.Anvil
            ? ('anvil' as const)
            : t === Tile.Furnace
              ? ('furnace' as const)
              : t === Tile.Campfire
                ? ('fire' as const)
                : t === Tile.Workbench
                  ? ('workbench' as const)
                  : null;
        if (!kind) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (!best || d < best.d) best = { tx, ty, kind, d };
      }
    }
    return best;
  }

  /** Nearest gatherable node around a world position, if any. */
  private findGatherNode(
    x: number,
    y: number,
  ): { tx: number; ty: number; kind: 'tree' | 'rock' | 'fish' } | null {
    const game = this.game;
    if (!game) return null;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let best: { tx: number; ty: number; kind: 'tree' | 'rock' | 'fish'; d: number } | null = null;
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const t = game.world.groundAt(tx, ty);
        const kind =
          t === Tile.Tree || t === Tile.TreeOak
            ? ('tree' as const)
            : t === Tile.Rock ||
                t === Tile.RockCopper ||
                t === Tile.RockTin ||
                t === Tile.RockIron ||
                t === Tile.RockCoal ||
                t === Tile.RockGold
              ? ('rock' as const)
              : t === Tile.FishingSpot
                ? ('fish' as const)
                : null;
        if (!kind) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (!best || d < best.d) best = { tx, ty, kind, d };
      }
    }
    return best;
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(12, this.shakeAmount + amount);
  }

  // ------------------------------------------------------- elevation

  /**
   * Screen-space rise (in TILES; multiply by scale for px) of the
   * ground under a world position. Plateau tops rise level·ELEV_H; a
   * stair tile interpolates from its low mouth to its high edge, so
   * feet climb tread by tread. Everything drawn in the world asks this
   * one function.
   */
  renderLift(x: number, y: number): number {
    const game = this.game;
    if (!game) return 0;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const lvl = game.world.elevAt(tx, ty);
    if (game.world.groundAt(tx, ty) === Tile.Ramp) {
      // Ascend toward the cardinal neighbor a level down — the mouth.
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        if (game.world.elevAt(tx + dx, ty + dy) < lvl) {
          // Fraction across the tile away from the low edge.
          const u =
            dx !== 0
              ? dx > 0
                ? 1 - (x - tx)
                : x - tx
              : dy > 0
                ? 1 - (y - ty)
                : y - ty;
          return (lvl - 1 + Math.min(1, Math.max(0, u))) * ELEV_H;
        }
      }
    }
    return lvl * ELEV_H;
  }

  /** worldToScreen that also rides the terrain lift under the point. */
  private liftedWTS = (wx: number, wy: number): Vec2 => {
    const p = this.camera.worldToScreen(wx, wy, this.w, this.h);
    p.y -= this.renderLift(wx, wy) * this.camera.scale;
    return p;
  };

  // ------------------------------------------------------- shadows

  /** Screen-px offset of a shadow cast from `hTiles` above the ground. */
  private castOffset(hTiles: number): Vec2 {
    const len = this.sky.shadowLen * hTiles * this.camera.scale;
    return {
      x: this.sky.shadowX * len,
      y: this.sky.shadowY * len * this.camera.yScale,
    };
  }

  /** Arm the shadow target for a cast fill; null while nothing casts. */
  private beginCastFill(): CanvasRenderingContext2D | null {
    if (this.sky.shadowAlpha < 0.02) return null;
    const c = this.sdw;
    c.globalAlpha = Math.min(1, this.sky.shadowAlpha / this.sdwLayerAlpha);
    c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
    return c;
  }

  /** Arm for a grounding contact fill — never fully disappears. */
  private beginContactFill(): CanvasRenderingContext2D {
    const c = this.sdw;
    const a = Math.min(CONTACT_MAX, Math.max(CONTACT_MIN, this.sky.shadowAlpha));
    c.globalAlpha = Math.min(1, a / this.sdwLayerAlpha);
    c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
    return c;
  }

  /**
   * A mass `hTiles` up throws its silhouette along the sun: a
   * flattened blob at the projected spot, tied to the footprint by a
   * smear quad (the trunk's own shadow). One path, one fill — the
   * blob and smear can never double-darken each other.
   */
  private castBlob(bx: number, by: number, hTiles: number, r: number, seed: number, smearW = 0): void {
    const c = this.beginCastFill();
    if (!c) return;
    const off = this.castOffset(hTiles);
    c.beginPath();
    if (smearW > 0) {
      c.moveTo(bx - smearW, by);
      c.lineTo(bx + smearW, by);
      c.lineTo(bx + off.x + smearW * 0.7, by + off.y);
      c.lineTo(bx + off.x - smearW * 0.7, by + off.y);
      c.closePath();
    }
    c.save();
    c.translate(bx + off.x, by + off.y);
    c.scale(1, 0.62);
    facetBlob(c, 0, 0, r, seed, 7, 0.35);
    c.restore();
    c.fill();
    c.globalAlpha = 1;
  }

  /** A prism's ground shadow: its base edge extruded along the sun. */
  private castEdgeQuad(x0: number, y0: number, x1: number, y1: number, hTiles: number): void {
    const c = this.beginCastFill();
    if (!c) return;
    const off = this.castOffset(hTiles);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x1 + off.x, y1 + off.y);
    c.lineTo(x0 + off.x, y0 + off.y);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  /** A body's grounding: foot ellipse + a low lobe cast sunward. */
  private castBody(px: number, py: number, r: number): void {
    const c = this.beginContactFill();
    c.beginPath();
    c.ellipse(px, py, r, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();
    if (this.sky.shadowAlpha >= 0.02) {
      const off = this.castOffset(0.42);
      c.globalAlpha = Math.min(1, (this.sky.shadowAlpha / this.sdwLayerAlpha) * 0.75);
      const ang = Math.atan2(off.y, off.x);
      const len = Math.hypot(off.x, off.y);
      c.beginPath();
      c.ellipse(px + off.x * 0.55, py + off.y * 0.55, r * 0.5 + len * 0.5, r * 0.4, ang, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  /** A small thing's plain contact ellipse (drops, summons). */
  private castContact(px: number, py: number, rx: number, ry: number): void {
    const c = this.beginContactFill();
    c.beginPath();
    c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  /**
   * Screen → world with elevation: a click on a plateau top must land
   * on the plateau, not on the (hidden) ground two tiles south. Try
   * each level's inverse and accept the one whose terrain agrees.
   */
  pickWorld(sx: number, sy: number): Vec2 {
    const game = this.game;
    const cam = this.camera;
    for (let lvl = 2; lvl >= 1; lvl--) {
      const wy = cam.y + (sy - this.h / 2 + lvl * ELEV_H * cam.scale) / (cam.scale * cam.yScale);
      const wx = cam.x + (sx - this.w / 2) / cam.scale;
      if (game && game.world.elevAt(Math.floor(wx), Math.floor(wy)) === lvl) {
        return { x: wx, y: wy };
      }
    }
    return cam.screenToWorld(sx, sy, this.w, this.h);
  }

  /** Lifted plateau surfaces as y-sorted items (real occluders). */
  private collectElevatedGround(game: ClientGame, items: DrawItem[]): void {
    const b = this.visibleTileBounds();
    const s = this.camera.scale;
    const minCx = Math.floor(b.minTx / CHUNK_SIZE);
    const maxCx = Math.floor(b.maxTx / CHUNK_SIZE);
    const minCy = Math.floor((b.minTy - ELEV_H * 2 - 1) / CHUNK_SIZE);
    const maxCy = Math.floor(b.maxTy / CHUNK_SIZE);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const baked = this.baked.get(`${cx},${cy}`);
        if (!baked || baked.lifted.length === 0) continue;
        for (const layer of baked.lifted) {
          // ONE item per ROW, not per band: a band spanning many rows
          // sorts at its first row, so a player standing in a gap of
          // the band's row range (behind a mass that starts further
          // south at their x) would draw first and then poke through
          // the crown. Per-row granularity makes walk-behind exact.
          for (const [r0, r1] of layer.bands) {
            for (let r = r0; r <= r1; r++) {
              const worldTy = cy * CHUNK_SIZE + r;
              if (worldTy > b.maxTy || worldTy < b.minTy - ELEV_H * 2 - 1) continue;
              const level = layer.level;
              items.push({
                sortY: worldTy - 0.01,
                draw: () => {
                  const p = this.camera.worldToScreen(cx * CHUNK_SIZE, worldTy, this.w, this.h);
                  this.ctx.drawImage(
                    layer.canvas,
                    0,
                    r * TILE_PX,
                    CHUNK_SIZE * TILE_PX,
                    TILE_PX,
                    p.x,
                    p.y - level * ELEV_H * s,
                    CHUNK_SIZE * s + 0.5,
                    s * this.camera.yScale + 0.5,
                  );
                  // The plateau's own living layer: grass and flowers on
                  // the lifted surface, drawn on top of the row (already
                  // y-granular, so tall blades go down in the same pass).
                  const rowGround = (tx: number, ty: number) =>
                    game.world.elevAt(tx, ty) === level ? game.world.groundAt(tx, ty) : undefined;
                  const rowBounds = {
                    minTx: Math.max(b.minTx, cx * CHUNK_SIZE),
                    maxTx: Math.min(b.maxTx, cx * CHUNK_SIZE + CHUNK_SIZE - 1),
                    minTy: worldTy,
                    maxTy: worldTy,
                  };
                  drawLiveGround(this.ctx, rowGround, rowBounds, this.liftedWTS, s, performance.now());
                  this.grass.drawRow(
                    this.ctx,
                    rowGround,
                    (tx, ty) => this.detailAt(game, tx, ty),
                    rowBounds,
                    this.liftedWTS,
                    s,
                  );
                },
              });
            }
          }
        }
      }
    }
  }

  private animFor(key: number | 'own', x: number, y: number, pose: number, now: number): AnimState {
    let anim = this.anims.get(key);
    if (!anim) {
      anim = {
        walkPhase: 0,
        lastX: x,
        lastY: y,
        lastPose: pose,
        poseStartedAt: now,
        lastSeen: now,
        kneeMemory: [0, 0],
      };
      this.anims.set(key, anim);
    }
    const dist = Math.hypot(x - anim.lastX, y - anim.lastY);
    anim.walkPhase += dist * 0.55;
    anim.lastX = x;
    anim.lastY = y;
    if (pose !== anim.lastPose) {
      anim.lastPose = pose;
      anim.poseStartedAt = now;
    }
    anim.lastSeen = now;
    return anim;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  render(game: ClientGame, frameDt: number): void {
    this.game = game;
    this.resize();
    // The sky rules the frame: shadows, exposure, grade all read it.
    this.sky = daylightAt(game.clockHoursNow());
    // Hitstop slows animation + particles to a crawl for a few frames;
    // the camera and network keep real time.
    this.frameDt = performance.now() < this.hitstopUntil ? frameDt * 0.12 : frameDt;

    const own = game.predictor.renderPos();
    const k = 1 - Math.exp(-8 * frameDt);
    this.camera.x += (own.x - this.camera.x) * k;
    this.camera.y += (own.y - this.camera.y) * k;

    this.shakeAmount *= Math.exp(-7 * frameDt);
    if (this.shakeAmount > 0.2) {
      this.camera.x += ((Math.random() - 0.5) * this.shakeAmount) / this.camera.scale;
      this.camera.y += ((Math.random() - 0.5) * this.shakeAmount) / this.camera.scale;
    }

    this.ctx.fillStyle = '#141020';
    this.ctx.fillRect(0, 0, this.w, this.h);

    // Kill zoom-pulse: a screen-space scale kick easing back out.
    this.zoomPulseAmount *= Math.exp(-6 * frameDt);
    if (this.zoomPulseAmount > 0.001) {
      const z = 1 + this.zoomPulseAmount;
      this.ctx.translate(this.w / 2, this.h / 2);
      this.ctx.scale(z, z);
      this.ctx.translate(-this.w / 2, -this.h / 2);
    }

    this.drawGroundChunks(game);

    // The grass system wakes up first: it needs every moving body this
    // frame to part blades, flatten them underfoot, and rustle thickets.
    const groundLvl0 = (tx: number, ty: number) =>
      game.world.elevAt(tx, ty) > 0 ? undefined : game.world.groundAt(tx, ty);
    const detail = (tx: number, ty: number) => this.detailAt(game, tx, ty);
    this.grass.beginFrame(
      performance.now(),
      this.frameDt,
      this.collectDisturbers(game),
      (tx, ty) => game.world.groundAt(tx, ty),
      (x, y) =>
        this.particles.burst(x, y - 0.2, 3, ['#527c38', '#76a650', '#a4b860'], {
          speed: 1.1,
          life: 0.5,
          size: 0.045,
          up: true,
          gravity: 2.5,
        }),
      this.camera.x,
      this.camera.y,
    );

    // The breeze layer: water glints, ripples, portal swirls.
    const bounds = this.visibleTileBounds();
    // Ground-level tiles only: lifted tiles get their own live layer
    // drawn OVER their plateau band (see collectElevatedGround).
    drawLiveGround(this.ctx, groundLvl0, bounds, this.liftedWTS, this.camera.scale, performance.now());

    // The meadow under everyone's feet: short blades, clumps, flowers.
    // Grass bounds are TIGHT — blades reach < 1 tile up, so the 5-row
    // canopy padding in visibleTileBounds would be ~150 wasted tiles.
    const grassBounds = {
      minTx: bounds.minTx + 1,
      maxTx: bounds.maxTx - 1,
      minTy: bounds.minTy + 3,
      maxTy: bounds.maxTy - 1,
    };
    this.grass.drawUnder(this.ctx, groundLvl0, detail, grassBounds, this.liftedWTS, this.camera.scale);

    this.drawAimGuide(game);

    const items: DrawItem[] = [];
    // Tall thickets y-sort with the world: you walk THROUGH them.
    this.grass.collectTall(items, this.ctx, groundLvl0, detail, grassBounds, this.liftedWTS, this.camera.scale);
    this.collectElevatedGround(game, items);
    this.collectCliffFaces(game, items);
    this.collectRaisedTiles(game, items);
    this.collectBreakingRocks(game, items);
    this.collectFallingTrees(items);
    this.collectEntities(game, items);

    // Ground shadow prepass, batched: every shape lands opaque on one
    // layer, composited once at the sky's alpha — overlapping dusk
    // shadows merge into a single density instead of stacking.
    const dpr = window.devicePixelRatio || 1;
    if (this.shadowLayer.width !== this.canvas.width || this.shadowLayer.height !== this.canvas.height) {
      this.shadowLayer.width = this.canvas.width;
      this.shadowLayer.height = this.canvas.height;
    }
    const sc = this.shadowLayerCtx;
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc.clearRect(0, 0, this.w, this.h);
    this.sdw = sc;
    this.sdwLayerAlpha = Math.min(1, Math.max(this.sky.shadowAlpha, CONTACT_MIN));
    for (const item of items) {
      if (!item.elevated) item.drawShadow?.();
    }
    this.ctx.save();
    this.ctx.globalAlpha = this.sdwLayerAlpha;
    this.ctx.drawImage(this.shadowLayer, 0, 0, this.shadowLayer.width, this.shadowLayer.height, 0, 0, this.w, this.h);
    this.ctx.restore();
    // In-sort (plateau) shadows draw straight into the frame.
    this.sdw = this.ctx;
    this.sdwLayerAlpha = 1;
    items.sort((a, b) => a.sortY - b.sortY);
    for (const item of items) {
      if (item.elevated) item.drawShadow?.();
      item.draw();
    }

    this.drawDeathGhosts();
    this.particles.update(this.frameDt);
    this.particles.draw(this.ctx, this.liftedWTS, this.camera.scale);
    this.drawRings();
    this.drawCombatFx(game);

    // Depth & atmosphere: the exposure pass (multiply lightmap) sets
    // the scene's darkness, THEN emissive bloom pops over it, then the
    // tilted-camera tilt-shift bands and the grade. HUD stays crisp.
    this.collectStaticLights(game, bounds);
    const origin = this.camera.worldToScreen(0, 0, this.w, this.h);
    this.lighting.draw(
      this.ctx,
      { w: this.w, h: this.h, scale: this.camera.scale, yScale: this.camera.yScale, ox: origin.x, oy: origin.y },
      this.sky,
      this.lights,
      (tx, ty) => {
        const t = game.world.groundAt(tx, ty);
        return t !== undefined && (Renderer.WALL_TILES.has(t) || t === Tile.Cliff);
      },
    );
    this.lights.length = 0;
    this.drawGlows();
    this.applyTiltShift();
    this.drawGrade();

    this.drawBuildGhost();
    this.drawActionProgress(game);
    this.drawFloaties(game);
    this.drawHpBar(game);
    this.drawVignette();
    this.evictBaked();
    this.evictAnims();
  }

  /**
   * The frame's standing light sources, from one tile scan: each pushes
   * an emissive glow (additive bloom) AND a WorldLight (lightmap punch,
   * flame-gated so man-made fire only carries the scene after dark).
   * Bloom alpha swells with darkness — fires read hotter at night.
   */
  private collectStaticLights(
    game: ClientGame,
    bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  ): void {
    const t = performance.now() / 1000;
    const flame = this.sky.flame;
    const boost = 1 + 0.8 * this.sky.darkness;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const tile = game.world.groundAt(tx, ty);
        if (tile === Tile.Campfire) {
          const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
          this.glows.push({ x: tx + 0.5, y: ty + 0.32, r: 1.6 * flick, rgb: '235, 140, 52', a: 0.3 * flick * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.4 * flick, rgb: [255, 186, 110], intensity: 0.9 * flame * flick, occlude: true });
        } else if (tile === Tile.Furnace) {
          const pulse = 0.8 + Math.sin(t * 5 + tx) * 0.2;
          this.glows.push({ x: tx + 0.5, y: ty + 0.75, r: 1.15, rgb: '232, 108, 45', a: 0.24 * pulse * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.8, r: 2.8, rgb: [255, 148, 82], intensity: 0.65 * flame * pulse, occlude: true });
        } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
          const pulse = 0.85 + Math.sin(t * 2.2 + tx) * 0.15;
          this.glows.push({ x: tx + 0.5, y: ty + 0.5, r: 1.5 * pulse, rgb: '164, 134, 232', a: 0.26 * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 3.6, rgb: [172, 140, 240], intensity: 0.55 * pulse, occlude: true });
        } else if (tile === Tile.LampPost) {
          const flick = 0.92 + Math.sin(t * 9 + tx * 2.3 + ty) * 0.05 + Math.sin(t * 17 + ty * 1.7) * 0.03;
          if (flame > 0.05) {
            this.glows.push({ x: tx + 0.5, y: ty + 0.18, r: 1.3 * flick, rgb: '255, 205, 130', a: 0.28 * flame * flick });
            this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 5 * flick, rgb: [255, 205, 135], intensity: 0.9 * flame * flick, occlude: true });
          }
        }
      }
    }
  }

  /**
   * Emissive bloom: campfires, furnace mouths, portals, and magic bolts
   * pour additive light over the scene. Sold with plain radial
   * gradients under `lighter` compositing — no shader required.
   */
  private drawGlows(): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    if (this.glows.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.glows) {
      const p = this.liftedWTS(g.x, g.y);
      const r = g.r * s;
      const grad = ctx.createRadialGradient(p.x, p.y, r * 0.08, p.x, p.y, r);
      grad.addColorStop(0, `rgba(${g.rgb}, ${g.a})`);
      grad.addColorStop(0.55, `rgba(${g.rgb}, ${g.a * 0.38})`);
      grad.addColorStop(1, `rgba(${g.rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.restore();
    this.glows.length = 0;
  }

  /**
   * A magic projectile (or totem, or spark) advertises its own glow.
   * After dark the same source also lights the ground around it — a
   * bolt streaking across a night field carries its own pool of light.
   */
  queueGlow(x: number, y: number, r: number, rgb: string, a: number): void {
    this.glows.push({ x, y, r, rgb, a });
    if (this.sky.darkness > 0.04) {
      const [rr = 255, gg = 255, bb = 255] = rgb.split(',').map((v) => Number.parseInt(v, 10));
      this.lights.push({ x, y, r: r * 1.6, rgb: [rr, gg, bb], intensity: Math.min(0.55, a * 1.6) });
    }
  }

  /**
   * Tilt-shift: the top and bottom of the frame soften like a macro
   * photo of a miniature — the single cheapest "this is a diorama with
   * real depth" signal there is. Overlapping self-drawImage strips with
   * canvas blur filters; skipped cleanly where filters are unsupported.
   */
  private applyTiltShift(): void {
    const ctx = this.ctx;
    if (typeof ctx.filter !== 'string') return;
    const dpr = window.devicePixelRatio || 1;
    // [yCss, hCss, blurPx, alpha] — top three bands, bottom two.
    const bands: Array<[number, number, number, number]> = [
      [0, this.h * 0.1, 3.2, 0.8],
      [this.h * 0.08, this.h * 0.07, 1.8, 0.55],
      [this.h * 0.14, this.h * 0.05, 0.9, 0.3],
      [this.h * 0.88, this.h * 0.06, 1.1, 0.4],
      [this.h * 0.93, this.h * 0.07, 2.4, 0.7],
    ];
    for (const [y, bandH, blur, alpha] of bands) {
      const pad = blur * 3;
      const sy = Math.max(0, (y - pad) * dpr);
      const sh = Math.min(this.canvas.height - sy, (bandH + pad * 2) * dpr);
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.canvas, 0, sy, this.canvas.width, sh, 0, sy / dpr, this.w, sh / dpr);
      ctx.restore();
    }
    ctx.filter = 'none';
  }

  /**
   * Color grade: the "curated camera" over the raw painter output,
   * and it tells the time. The horizon haze burns orange at dawn and
   * dusk and sinks to indigo at night; the warm top-light lives and
   * dies with the sun; the vignette closes in after dark.
   */
  private drawGrade(): void {
    const ctx = this.ctx;
    const day = this.sky;
    // Atmospheric haze: the far field washes toward the hour's sky at
    // the top of the frame — the horizon you feel from a low camera.
    const [hr, hg, hb] = day.sky;
    const ha = day.skyAlpha;
    const sky = ctx.createLinearGradient(0, 0, 0, this.h * 0.34);
    sky.addColorStop(0, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha})`);
    sky.addColorStop(0.5, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha * 0.38})`);
    sky.addColorStop(1, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, 0)`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h * 0.34);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const warm = 0.36 * (0.2 + 0.8 * day.sun);
    const cool = 0.3 + 0.18 * day.darkness;
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, `rgba(255, 214, 150, ${warm})`);
    grad.addColorStop(0.45, `rgba(255, 236, 210, ${warm * 0.28})`);
    grad.addColorStop(1, `rgba(64, 84, 148, ${cool})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
    const vig = ctx.createRadialGradient(
      this.w / 2,
      this.h * 0.46,
      Math.min(this.w, this.h) * 0.42,
      this.w / 2,
      this.h * 0.5,
      Math.max(this.w, this.h) * 0.72,
    );
    vig.addColorStop(0, 'rgba(20, 12, 28, 0)');
    vig.addColorStop(1, `rgba(20, 12, 28, ${0.26 + 0.14 * day.darkness})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  /**
   * While the bow is drawn, a dotted guide extends along the aim showing
   * how far the arrow will fly at the current charge — it grows and
   * firms up as the draw deepens. Essential for right-stick aiming.
   */
  private drawAimGuide(game: ClientGame): void {
    const drawT = game.ownDrawT;
    if (drawT <= 0 || game.ownEid === null) return;
    const weapon = game.equipment.weapon ? itemDef(game.equipment.weapon)?.weapon : undefined;
    if (!weapon) return;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const own = game.predictor.renderPos();
    // The guide lives on the ground plane: both ends are projected
    // through the camera, so it lands exactly where arrows land.
    const rangeT = weapon.range * (0.55 + 0.45 * drawT);
    const dirX = Math.cos(game.aim);
    const dirY = Math.sin(game.aim);
    const p0 = this.liftedWTS(own.x + dirX * 0.55, own.y + dirY * 0.55);
    const p1 = this.liftedWTS(own.x + dirX * rangeT, own.y + dirY * rangeT);
    const lift0 = 0.45 * s;
    const lift1 = lift0;

    ctx.save();
    ctx.setLineDash([0.12 * s, 0.14 * s]);
    ctx.strokeStyle = `rgba(244, 239, 228, ${0.16 + 0.3 * drawT})`;
    ctx.lineWidth = Math.max(1.5, 0.035 * s);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - lift0);
    ctx.lineTo(p1.x, p1.y - lift1);
    ctx.stroke();
    ctx.setLineDash([]);
    // Range chevron at the arrow's terminal point.
    const cx = p1.x;
    const cy = p1.y - lift1;
    const dSx = p1.x - p0.x;
    const dSy = p1.y - lift1 - (p0.y - lift0);
    const dLen = Math.hypot(dSx, dSy) || 1;
    const ux = dSx / dLen;
    const uy = dSy / dLen;
    ctx.strokeStyle = `rgba(232, 182, 76, ${0.35 + 0.5 * drawT})`;
    ctx.lineWidth = Math.max(2, 0.05 * s);
    ctx.beginPath();
    ctx.moveTo(cx - ux * 0.14 * s - uy * 0.12 * s, cy - uy * 0.14 * s + ux * 0.12 * s);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - ux * 0.14 * s + uy * 0.12 * s, cy - uy * 0.14 * s - ux * 0.12 * s);
    ctx.stroke();
    ctx.restore();
  }

  /** Fallen silhouettes: pop up slightly, then flatten and fade away. */
  private drawDeathGhosts(): void {
    const ctx = this.ctx;
    const now = performance.now();
    const LIFE = 480;
    for (let i = this.deathGhosts.length - 1; i >= 0; i--) {
      const g = this.deathGhosts[i]!;
      const age = now - g.bornAt;
      if (age > LIFE) {
        this.deathGhosts.splice(i, 1);
        continue;
      }
      const t = age / LIFE;
      const p = this.liftedWTS(g.x, g.y);
      const r = g.radius * this.camera.scale;
      const hop = Math.sin(Math.min(1, t * 2.2) * Math.PI) * r * 0.5;
      ctx.globalAlpha = (1 - t) * 0.65;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y - hop,
        r * (1 + t * 0.5),
        r * Math.max(0.12, 0.8 - t * 0.7),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Expanding impact rings — crisp stroked circles, quick and gone. */
  private drawRings(): void {
    const ctx = this.ctx;
    const now = performance.now();
    const LIFE = 260;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      const age = now - ring.bornAt;
      if (age > LIFE) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = age / LIFE;
      const p = this.liftedWTS(ring.x, ring.y);
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1.5, this.camera.scale * 0.07 * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring.maxR * this.camera.scale * (0.25 + 0.75 * (1 - (1 - t) * (1 - t))), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /** Hard red edge bands when the local player is hurt. */
  private drawVignette(): void {
    const remaining = this.vignetteUntil - performance.now();
    if (remaining <= 0) return;
    const ctx = this.ctx;
    const a = Math.min(1, remaining / 320) * 0.32;
    const band = Math.max(10, this.w * 0.025);
    ctx.fillStyle = `rgba(196, 60, 40, ${a})`;
    ctx.fillRect(0, 0, this.w, band);
    ctx.fillRect(0, this.h - band, this.w, band);
    ctx.fillRect(0, band, band, this.h - band * 2);
    ctx.fillRect(this.w - band, band, band, this.h - band * 2);
  }

  private detailAt(game: ClientGame, tx: number, ty: number): number {
    const chunk = game.world.get(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    if (!chunk) return 0;
    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.detail[ly * CHUNK_SIZE + lx] ?? 0;
  }

  // ------------------------------------------------------------ ground

  private visibleTileBounds(): { minTx: number; maxTx: number; minTy: number; maxTy: number } {
    const s = this.camera.scale;
    return {
      // Canopies overhang ~1.3 tiles sideways and reach ~3.5 tiles
      // above their base — pad so off-screen bases still draw.
      minTx: Math.floor(this.camera.x - this.w / 2 / s) - 2,
      maxTx: Math.floor(this.camera.x + this.w / 2 / s) + 2,
      minTy: Math.floor(this.camera.y - this.h / 2 / (s * this.camera.yScale)) - 5,
      maxTy: Math.floor(this.camera.y + this.h / 2 / (s * this.camera.yScale)) + 2,
    };
  }

  private drawGroundChunks(game: ClientGame): void {
    const s = this.camera.scale;
    const b = this.visibleTileBounds();
    const minCx = Math.floor(b.minTx / CHUNK_SIZE);
    const maxCx = Math.floor(b.maxTx / CHUNK_SIZE);
    const minCy = Math.floor(b.minTy / CHUNK_SIZE);
    const maxCy = Math.floor(b.maxTy / CHUNK_SIZE);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const data = game.world.get(cx, cy);
        if (!data) continue;
        const key = `${cx},${cy}`;
        let baked = this.baked.get(key);
        if (!baked || baked.data !== data || baked.rev !== (data.rev ?? 0)) {
          const ground = (tx: number, ty: number) => game.world.groundAt(tx, ty);
          const detail = (tx: number, ty: number) => this.detailAt(game, tx, ty);
          const elev = (tx: number, ty: number) => game.world.elevAt(tx, ty);
          let maxLevel = 0;
          for (let i = 0; i < data.elev.length; i++) {
            if (data.elev[i]! > maxLevel) maxLevel = data.elev[i]!;
          }
          const lifted: BakedChunk['lifted'] = [];
          for (let level = 1; level <= maxLevel; level++) {
            const bake = bakeElevated(ground, detail, elev, cx, cy, TILE_PX, level);
            if (!bake) continue;
            // Contiguous row runs, merged across small gaps, padded one
            // row each way for the half-tile contour bleed.
            const bands: Array<[number, number]> = [];
            for (let r = 0; r < CHUNK_SIZE; r++) {
              if (!bake.rows[r]) continue;
              const last = bands[bands.length - 1];
              if (last && r - last[1] <= 3) last[1] = r;
              else bands.push([r, r]);
            }
            for (const band of bands) {
              band[0] = Math.max(0, band[0] - 1);
              band[1] = Math.min(CHUNK_SIZE - 1, band[1] + 1);
            }
            lifted.push({ level, canvas: bake.canvas, bands });
          }
          baked = {
            canvas: bakeChunk(ground, detail, elev, cx, cy, TILE_PX),
            data,
            rev: data.rev ?? 0,
            lifted,
          };
          this.baked.set(key, baked);
        }
        const p = this.camera.worldToScreen(cx * CHUNK_SIZE, cy * CHUNK_SIZE, this.w, this.h);
        const size = CHUNK_SIZE * s;
        this.ctx.imageSmoothingEnabled = true;
        // Chunks are baked square and drawn uniformly foreshortened —
        // the ground compresses evenly while heights stay full.
        this.ctx.drawImage(baked.canvas, p.x, p.y, size + 0.5, size * this.camera.yScale + 0.5);
      }
    }
  }

  private evictBaked(): void {
    if (this.baked.size <= 80) return;
    const ccx = this.camera.x / CHUNK_SIZE;
    const ccy = this.camera.y / CHUNK_SIZE;
    for (const [key] of this.baked) {
      const [cx, cy] = key.split(',').map(Number);
      if (Math.abs(cx! - ccx) > 4 || Math.abs(cy! - ccy) > 4) this.baked.delete(key);
      if (this.baked.size <= 60) break;
    }
  }

  private evictAnims(): void {
    if (this.anims.size < 200) return;
    const cutoff = performance.now() - 10_000;
    for (const [key, anim] of this.anims) {
      if (anim.lastSeen < cutoff) this.anims.delete(key);
    }
  }

  // ------------------------------------------------------- raised tiles

  private static readonly WALL_TILES = new Set<number>([
    Tile.WallStone,
    Tile.WallWood,
    Tile.CaveWall,
  ]);

  private collectRaisedTiles(game: ClientGame, items: DrawItem[]): void {
    const b = this.visibleTileBounds();
    for (let ty = b.minTy; ty <= b.maxTy; ty++) {
      for (let tx = b.minTx; tx <= b.maxTx; tx++) {
        const ground = game.world.groundAt(tx, ty);
        if (ground === undefined) continue;
        if (ground === Tile.Cliff) continue; // faces come from collectCliffFaces
        if (ground === Tile.Ramp) {
          items.push(this.rampItem(tx, ty, game));
          const landing = this.rampLandingItem(tx, ty, game);
          if (landing) items.push(landing);
          const apron = this.rampApronItem(tx, ty, game);
          if (apron) items.push(apron);
          continue;
        }
        if (Renderer.WALL_TILES.has(ground)) {
          const item = this.wallItem(ground as Tile, tx, ty, game);
          if (game.world.elevAt(tx, ty) > 0) item.elevated = true;
          items.push(item);
          continue;
        }
        const def = tileDef(ground);
        if (!def.raised && ground !== Tile.Stump) continue;
        const item = this.objectItem(ground as Tile, tx, ty, game);
        if (game.world.elevAt(tx, ty) > 0) item.elevated = true;
        items.push(item);
      }
    }
  }

  /**
   * Walls: continuous top mass with rounded exposed corners, a darker
   * front face where the wall meets open ground, and a hard shadow.
   */
  private wallItem(tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const isWall = (t: number | undefined) => t !== undefined && Renderer.WALL_TILES.has(t);
    const n = isWall(game.world.groundAt(tx, ty - 1));
    const e = isWall(game.world.groundAt(tx + 1, ty));
    const sw = isWall(game.world.groundAt(tx, ty + 1));
    const w = isWall(game.world.groundAt(tx - 1, ty));

    const top = tile === Tile.WallWood ? '#8a6234' : tile === Tile.WallStone ? '#8c8798' : '#3a3444';
    const face = tile === Tile.WallWood ? '#5e3f1e' : tile === Tile.WallStone ? '#5b5566' : '#221d2c';
    const r = s * 0.26;
    // Chamfer only NORTH corners exposed on both sides. South crown
    // corners stay square: they sit flush on the south face, and a cut
    // there opens a sliver of ground between crown and face.
    const radii: [number, number, number, number] = [
      !n && !w ? r : 0,
      !n && !e ? r : 0,
      0,
      0,
    ];
    const syT = s * this.camera.yScale; // foreshortened tile depth
    const hs = WALL_H * s;
    const lx = (x: number): number => this.leanX(x, WALL_H);
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    const sideCol = shade(tile === Tile.WallWood ? '#6f4d26' : tile === Tile.WallStone ? '#6f697c' : '#2b2536', -8);

    return {
      sortY: ty + 1,
      drawShadow: sw
        ? undefined
        : () => {
            // A body this tall throws a real shadow across the ground,
            // cast from its south base edge along the sun.
            this.castEdgeQuad(p.x - 0.25, p.y + syT, p.x + s + 0.25, p.y + syT, WALL_H);
          },
      draw: () => {
        const yBase = p.y + syT; // south edge at ground level
        const yTop = yBase - hs; // south edge, lifted to the crown
        const tx0 = lx(x0);
        const tx1 = lx(x1);
        // Flank revealed by the lean: a prism right of the screen
        // center leans right, showing its WEST side (and vice versa).
        // Skipped inside joined runs.
        if (tx0 > x0 + 0.5 && !w) {
          ctx.fillStyle = sideCol;
          ctx.beginPath();
          ctx.moveTo(x0, p.y);
          ctx.lineTo(x0, yBase);
          ctx.lineTo(tx0, yTop);
          ctx.lineTo(tx0, p.y - hs);
          ctx.closePath();
          ctx.fill();
        } else if (tx1 < x1 - 0.5 && !e) {
          ctx.fillStyle = sideCol;
          ctx.beginPath();
          ctx.moveTo(x1, p.y);
          ctx.lineTo(x1, yBase);
          ctx.lineTo(tx1, yTop);
          ctx.lineTo(tx1, p.y - hs);
          ctx.closePath();
          ctx.fill();
        }
        // South face: base edge on the ground, top edge leaned — the
        // vertical surface you walk behind.
        if (!sw) {
          ctx.fillStyle = face;
          ctx.beginPath();
          ctx.moveTo(x0, yBase + 0.5);
          ctx.lineTo(x1, yBase + 0.5);
          ctx.lineTo(tx1, yTop);
          ctx.lineTo(tx0, yTop);
          ctx.closePath();
          ctx.fill();
          // Material detail inside the face's own skewed frame, so
          // courses and plank seams follow the lean coherently.
          const skew = (lx(p.x + s / 2) - (p.x + s / 2)) / -hs;
          ctx.save();
          ctx.translate(0, yBase);
          ctx.transform(1, 0, skew, 1, 0, 0);
          if (tile === Tile.WallWood) {
            ctx.strokeStyle = 'rgba(36, 22, 10, 0.4)';
            ctx.lineWidth = Math.max(1, s * 0.035);
            for (const fx of [0.3, 0.62]) {
              ctx.beginPath();
              ctx.moveTo(p.x + s * fx, -hs * 0.97);
              ctx.lineTo(p.x + s * fx, 0);
              ctx.stroke();
            }
          } else {
            // Running-bond masonry: two mortar rows, joints alternating.
            ctx.strokeStyle = 'rgba(20, 14, 28, 0.35)';
            ctx.lineWidth = Math.max(1, s * 0.03);
            for (const fy of [0.34, 0.67]) {
              ctx.beginPath();
              ctx.moveTo(p.x, -hs * fy);
              ctx.lineTo(p.x + s, -hs * fy);
              ctx.stroke();
            }
            for (const [jx, ry0, ry1] of [
              [0.5, 0, 0.34],
              [0.25, 0.34, 0.67],
              [0.75, 0.34, 0.67],
              [0.5, 0.67, 1],
            ] as const) {
              ctx.beginPath();
              ctx.moveTo(p.x + s * jx, -hs * ry0);
              ctx.lineTo(p.x + s * jx, -hs * ry1);
              ctx.stroke();
            }
          }
          // Ambient-occlusion seam where the face meets the ground.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
          ctx.fillRect(x0, -s * 0.06, s + 0.5, s * 0.06);
          ctx.restore();
        }
        // Crown: the whole top layer drawn in the leaned height frame —
        // footprint coordinates in, coherent lifted geometry out.
        this.beginHeightLayer(WALL_H);
        ctx.fillStyle = top;
        ctx.beginPath();
        chamferRect(ctx, x0, p.y - 0.25, s + 0.5, syT + 0.5, radii);
        ctx.fill();
        // Lit south lip of the crown grounds the height read.
        if (!sw) {
          ctx.fillStyle = shade(top, 16);
          ctx.fillRect(x0 + radii[3] * 0.8, p.y + syT - s * 0.08, s + 0.5 - (radii[2] + radii[3]) * 0.8, s * 0.08);
        }
        ctx.restore();
      },
    };
  }

  // -------------------------------------------------------------- cliffs

  /**
   * CLIFF FACES, extruded from the crown contour itself. The plateau
   * top is contoured by marching squares over dual cells; every
   * downhill-facing contour segment here extrudes into a vertical
   * curtain hanging one level (level -> level-1; taller drops stack
   * levels). Because faces and crown come from the SAME segments, a
   * diagonal crown edge gets a matching diagonal face - the geometry
   * cannot disagree. Facing is read off the segment normal: due-south
   * faces take the base palette, south-east turns fall into shade,
   * south-west turns catch the light - the three tones that make a
   * turned corner read as a solid mass.
   */

  /** Contour segments per marching-squares mask, with outward normals.
   *  Endpoints in dual-cell units: T(0,-.5) R(.5,0) B(0,.5) L(-.5,0). */
  private static readonly FACE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
    const T: [number, number] = [0, -0.5];
    const R: [number, number] = [0.5, 0];
    const B: [number, number] = [0, 0.5];
    const L: [number, number] = [-0.5, 0];
    const q = Math.SQRT1_2;
    const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
    const table: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
    table[0] = []; table[15] = [];
    table[1] = [seg(T, L, [q, q])];
    table[14] = [seg(T, L, [-q, -q])];
    table[2] = [seg(T, R, [-q, q])];
    table[13] = [seg(T, R, [q, -q])];
    table[4] = [seg(R, B, [-q, -q])];
    table[11] = [seg(R, B, [q, q])];
    table[8] = [seg(L, B, [q, -q])];
    table[7] = [seg(L, B, [-q, q])];
    table[3] = [seg(L, R, [0, 1])];
    table[12] = [seg(L, R, [0, -1])];
    table[9] = [seg(T, B, [1, 0])];
    table[6] = [seg(T, B, [-1, 0])];
    table[5] = [seg(T, R, [q, -q]), seg(B, L, [-q, q])];
    table[10] = [seg(T, L, [-q, -q]), seg(R, B, [q, q])];
    return table;
  })();

  /**
   * SQUARE-CORNER contour variant, used for dual cells that touch a
   * stair tile. A beveled (diagonal) corner cuts a quarter-tile into
   * the neighbouring column — beside a stair that hangs the corner's
   * curtain over the flight. Square corners hug the tile boundary, so
   * the stair's column stays sacrosanct: walls turn AT its edge, with
   * an edge-on side piece (M = cell center = the shared tile corner).
   */
  private static readonly SQUARE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
    const T: [number, number] = [0, -0.5];
    const R: [number, number] = [0.5, 0];
    const B: [number, number] = [0, 0.5];
    const L: [number, number] = [-0.5, 0];
    const M: [number, number] = [0, 0];
    const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
    const t: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
    t[0] = []; t[15] = [];
    t[3] = [seg(L, R, [0, 1])];
    t[12] = [seg(L, R, [0, -1])];
    t[9] = [seg(T, B, [1, 0])];
    t[6] = [seg(T, B, [-1, 0])];
    t[1] = [seg(T, M, [1, 0]), seg(M, L, [0, 1])];
    t[14] = [seg(T, M, [-1, 0]), seg(M, L, [0, -1])];
    t[2] = [seg(T, M, [-1, 0]), seg(M, R, [0, 1])];
    t[13] = [seg(T, M, [1, 0]), seg(M, R, [0, -1])];
    t[4] = [seg(R, M, [0, -1]), seg(M, B, [-1, 0])];
    t[11] = [seg(R, M, [0, 1]), seg(M, B, [1, 0])];
    t[8] = [seg(L, M, [0, -1]), seg(M, B, [1, 0])];
    t[7] = [seg(L, M, [0, 1]), seg(M, B, [-1, 0])];
    t[5] = [...t[1]!, ...t[4]!];
    t[10] = [...t[2]!, ...t[8]!];
    return t;
  })();

  private collectCliffFaces(game: ClientGame, items: DrawItem[]): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const b = this.visibleTileBounds();
    const world = game.world;
    for (let level = 1; level <= 2; level++) {
      // Ramps COUNT as mass here (unlike the crown bake): the contour
      // must not wrap around a stair notch, or mouth-corner cells hang
      // little curtains over the flight.
      const member = (tx: number, ty: number): boolean => world.elevAt(tx, ty) >= level;
      // A ramp owns the opening in ITS OWN level's cliff line — its
      // mouth and top edges belong to the flight drawing. A ramp of a
      // different level is ordinary mass to this contour.
      const owningRamp = (tx: number, ty: number): boolean =>
        world.groundAt(tx, ty) === Tile.Ramp && world.elevAt(tx, ty) === level;
      // Contour segments span a whole dual cell, but ramp ownership is
      // tile-aligned — HALF a segment can front a flight while the
      // other half fronts solid cliff. Test each half against its own
      // flanking tiles (quarter-offset samples stay inside the right
      // tile) so curtains end exactly at the stair's edge: no curtain
      // overhanging the flight, no hole beside it.
      const halfOwned = (
        hax: number,
        hay: number,
        hbx: number,
        hby: number,
        n: [number, number],
      ): boolean => {
        const qx = (hax + hbx) / 2;
        const qy = (hay + hby) / 2;
        return (
          owningRamp(Math.floor(qx + n[0] * 0.25), Math.floor(qy + n[1] * 0.25)) ||
          owningRamp(Math.floor(qx - n[0] * 0.25), Math.floor(qy - n[1] * 0.25))
        );
      };
      // Pure north-south edges are edge-on to the camera; they render
      // as SIDE pieces of wall thickness. Collected here and merged
      // into unbroken runs first — a lone cell-tall sliver reads as a
      // stray line, one solid piece per run reads as architecture.
      const sideRuns = new Map<string, Array<[number, number]>>();
      for (let j = b.minTy - 2; j <= b.maxTy + 2; j++) {
        for (let i = b.minTx - 1; i <= b.maxTx + 2; i++) {
          const mask =
            (member(i - 1, j - 1) ? 1 : 0) |
            (member(i, j - 1) ? 2 : 0) |
            (member(i, j) ? 4 : 0) |
            (member(i - 1, j) ? 8 : 0);
          // Cells touching a stair turn with SQUARE corners — a bevel
          // here would cut into the flight's column and hang its
          // curtain over the treads. Must match the crown bake's rule.
          const nearStair =
            owningRamp(i - 1, j - 1) || owningRamp(i, j - 1) || owningRamp(i, j) || owningRamp(i - 1, j);
          const segs = (nearStair ? Renderer.SQUARE_SEGS : Renderer.FACE_SEGS)[mask]!;
          if (segs.length === 0) continue;
          for (const sg of segs) {
            const ax = i + sg.a[0];
            const ay = j + sg.a[1];
            const bx = i + sg.b[0];
            const by = j + sg.b[1];
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            const dropA = halfOwned(ax, ay, mx, my, sg.n);
            const dropB = halfOwned(mx, my, bx, by, sg.n);
            if (dropA && dropB) continue;
            // Whole segments stay whole (stable detail hashing); only
            // stair-adjacent segments get clipped to their live half.
            const parts: Array<[number, number, number, number]> =
              !dropA && !dropB
                ? [[ax, ay, bx, by]]
                : dropA
                  ? [[mx, my, bx, by]]
                  : [[ax, ay, mx, my]];
            for (const [pax, pay, pbx, pby] of parts) {
              if (sg.n[1] > 0.01) {
                items.push(this.cliffFaceItem(game, pax, pay, pbx, pby, sg.n[0], level, i, j));
              } else if (Math.abs(sg.n[1]) <= 0.01) {
                const key = `${sg.n[0] >= 0 ? 1 : 0}|${pax}`;
                let runs = sideRuns.get(key);
                if (!runs) sideRuns.set(key, (runs = []));
                runs.push([Math.min(pay, pby), Math.max(pay, pby)]);
              }
            }
          }
        }
      }
      for (const [key, spans] of sideRuns) {
        const [sideStr, xStr] = key.split('|');
        const nx = sideStr === '1' ? 1 : -1;
        const x = Number(xStr);
        spans.sort((p, q) => p[0] - q[0]);
        let [y0, y1] = spans[0]!;
        const emitRun = (a: number, b: number): void => {
          // One slice per world row: caps land on the run's true ends,
          // while each slice y-sorts independently so props and
          // entities along the wall line draw over their own stretch.
          for (let r = Math.floor(a); r < b; r++) {
            const s0 = Math.max(a, r);
            const s1 = Math.min(b, r + 1);
            items.push(this.cliffSideItem(x, s0, s1, nx, level, s0 === a, s1 === b));
          }
        };
        for (let k = 1; k <= spans.length; k++) {
          const next = spans[k];
          if (next && next[0] <= y1 + 0.001) {
            y1 = Math.max(y1, next[1]);
          } else {
            emitRun(y0, y1);
            if (next) [y0, y1] = next;
          }
        }
      }
    }
  }

  /** One contour segment extruded into a face curtain (level -> level-1). */
  private cliffFaceItem(
    game: ClientGame,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    nx: number,
    level: number,
    ci: number,
    cj: number,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const topLift = level * ELEV_H * s;
    const baseLift = (level - 1) * ELEV_H * s;
    const h = hashCoords(53 + level, ci, cj);
    // Ensure a runs west of b so shading and details are stable.
    if (ax > bx || (ax === bx && ay > by)) {
      [ax, bx] = [bx, ax];
      [ay, by] = [by, ay];
    }
    const diagonal = Math.abs(nx) > 0.01;
    // Tone by facing: S = base, SE-turn = shaded, SW-turn = sunlit.
    const tone = !diagonal ? 0 : nx > 0 ? -16 : 12;

    return {
      sortY: Math.max(ay, by) + 0.001,
      drawShadow:
        level - 1 === 0
          ? () => {
              // Contact shadow: the top edge sits EXACTLY on the base
              // line (the face itself covers any overdraw above it),
              // its skew leaning with the sun as it falls across the
              // ground — clamped so the seam never detaches.
              const A = this.camera.worldToScreen(ax, ay, this.w, this.h);
              const B = this.camera.worldToScreen(bx, by, this.w, this.h);
              const skew = Math.max(-s * 0.6, Math.min(s * 0.6, this.castOffset(0.5).x));
              const c = this.beginContactFill();
              c.beginPath();
              c.moveTo(A.x, A.y - baseLift - 1);
              c.lineTo(B.x, B.y - baseLift - 1);
              c.lineTo(B.x + skew, B.y - baseLift + s * 0.42);
              c.lineTo(A.x + skew, A.y - baseLift + s * 0.42);
              c.closePath();
              c.fill();
              c.globalAlpha = 1;
            }
          : undefined,
      draw: () => {
        const A = this.camera.worldToScreen(ax, ay, this.w, this.h);
        const B = this.camera.worldToScreen(bx, by, this.w, this.h);
        // Snap shared endpoints to whole pixels so adjacent curtains
        // meet without hairlines.
        A.x = Math.round(A.x); A.y = Math.round(A.y);
        B.x = Math.round(B.x); B.y = Math.round(B.y);
        const yTopA = A.y - topLift - 1.5; // tucked under the crown band
        const yTopB = B.y - topLift - 1.5;
        const yBaseA = A.y - baseLift;
        const yBaseB = B.y - baseLift;
        // Rock body: vertical gradient, lit near the brink.
        const grad = ctx.createLinearGradient(0, Math.min(yTopA, yTopB), 0, Math.max(yBaseA, yBaseB));
        grad.addColorStop(0, shade('#6d6577', tone));
        grad.addColorStop(0.55, shade('#5d5568', tone));
        grad.addColorStop(1, shade('#4b4556', tone));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(A.x, yTopA);
        ctx.lineTo(B.x, yTopB);
        ctx.lineTo(B.x, yBaseB + 0.5);
        ctx.lineTo(A.x, yBaseA + 0.5);
        ctx.closePath();
        ctx.fill();
        // Bedded strata: constant world fractions -> beds run unbroken
        // along straight runs AND diagonal turns.
        const line = (f: number, w2: number, col: string): void => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w2;
          ctx.beginPath();
          ctx.moveTo(A.x, yTopA + (yBaseA - yTopA) * f);
          ctx.lineTo(B.x, yTopB + (yBaseB - yTopB) * f);
          ctx.stroke();
        };
        line(0.3, Math.max(1.5, s * 0.04), 'rgba(34, 27, 44, 0.32)');
        line(0.62, Math.max(1.5, s * 0.05), 'rgba(34, 27, 44, 0.36)');
        line(0.45, Math.max(2, s * 0.09), 'rgba(196, 150, 96, 0.12)');
        line(0.84, Math.max(1.5, s * 0.035), 'rgba(34, 27, 44, 0.26)');
        // A crack on some cells, jogging between beds.
        if (h % 3 !== 0) {
          const fx0 = 0.25 + ((h >> 5) % 50) / 100;
          const cxA = A.x + (B.x - A.x) * fx0;
          const cyT = yTopA + (yTopB - yTopA) * fx0;
          const cyB = yBaseA + (yBaseB - yBaseA) * fx0;
          const jog = s * (0.04 + ((h >> 9) % 8) / 150) * ((h >> 3) % 2 === 0 ? 1 : -1);
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.38)';
          ctx.lineWidth = Math.max(1, s * 0.032);
          ctx.beginPath();
          ctx.moveTo(cxA, cyT + (cyB - cyT) * 0.1);
          ctx.lineTo(cxA + jog, cyT + (cyB - cyT) * 0.5);
          ctx.lineTo(cxA + jog * 0.4, cyT + (cyB - cyT) * 0.92);
          ctx.stroke();
        }
        // Shade under the brink; AO where the face meets the ground.
        line(0.035, Math.max(2, s * 0.07), 'rgba(24, 18, 34, 0.35)');
        line(0.97, Math.max(2, s * 0.06), 'rgba(18, 12, 26, 0.3)');
        // Scree at the foot of straight faces.
        if (!diagonal && level - 1 === 0 && (h & 3) !== 0) {
          ctx.fillStyle = shade('#6a6375', tone);
          for (let k = 0; k < 2; k++) {
            const f = 0.2 + ((h >> (7 + k * 5)) % 60) / 100;
            const px2 = A.x + (B.x - A.x) * f;
            const py2 = yBaseA + (yBaseB - yBaseA) * f;
            const pw = s * (0.06 + ((h >> (k * 4)) % 6) / 120);
            ctx.beginPath();
            chamferRect(ctx, px2, py2 - pw * 0.6, pw, pw * 0.7, pw * 0.3);
            ctx.fill();
          }
        }
      },
    };
  }

  /**
   * Wall THICKNESS for one row-slice of a north-south rim run (world
   * x, world y s0..s1, flags marking the run's true ends). The plane
   * itself is edge-on to the orthographic camera, so we cheat a strip
   * of the wall's outward flank into view: faces terminate into it and
   * jogged rims read as one continuous mass. Slices partition the
   * run's screen extent exactly (each covers [wts(s0)-topLift,
   * wts(s1)-topLift]; the bottom slice extends to the base), so the
   * flat fill tiles seamlessly. Each slice sorts EARLY — a zero-width
   * plane must lose every overlap contest against rocks, props and
   * entities standing beside it; only the sky above them shows wall.
   */
  private cliffSideItem(
    x: number,
    s0: number,
    s1: number,
    nx: number,
    level: number,
    isTop: boolean,
    isBottom: boolean,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const topLift = level * ELEV_H * s;
    const baseLift = (level - 1) * ELEV_H * s;
    return {
      sortY: s0 - (level * ELEV_H) / this.camera.yScale,
      drawShadow:
        level - 1 === 0
          ? () => {
              // The shaded (east) flank casts a real contact shadow;
              // the sunlit (west) flank still gets a narrow ambient
              // seam — every wall foot is attached to its ground.
              const A = this.camera.worldToScreen(x, s0, this.w, this.h);
              const B = this.camera.worldToScreen(x, s1, this.w, this.h);
              // Rounded slice bounds tile exactly — an overlap would
              // double-blend the alpha into a visible seam line.
              const ya = Math.round(A.y) - (isTop ? 1 : 0);
              const yb = Math.round(B.y) + (isBottom ? s * 0.2 : 0);
              const wS = nx >= 0 ? Math.max(3, s * 0.24) : Math.max(2, s * 0.09);
              const c = this.beginContactFill();
              c.fillRect(Math.round(A.x) - (nx >= 0 ? 0 : wS), ya, wS, yb - ya);
              c.globalAlpha = 1;
            }
          : undefined,
      draw: () => {
        const A = this.camera.worldToScreen(x, s0, this.w, this.h);
        const B = this.camera.worldToScreen(x, s1, this.w, this.h);
        const sx = Math.round(A.x);
        const w2 = Math.max(3, s * 0.13);
        const x0 = nx >= 0 ? sx : sx - w2;
        const yTop = Math.round(A.y - topLift) - (isTop ? 1.5 : 0);
        const yBot = isBottom ? B.y - baseLift : Math.round(B.y - topLift);
        // Body: the face palette's own mid-tones, pushed into shade —
        // kin to the walls it joins, not a black bar fighting them.
        ctx.fillStyle = nx >= 0 ? '#494259' : '#544d64';
        ctx.fillRect(x0, yTop, w2, yBot - yTop);
        // Coursing ticks at world-anchored heights along the crown
        // line — each slice draws only ticks landing inside its rect.
        ctx.fillStyle = 'rgba(29, 23, 40, 0.3)';
        const tickH = Math.max(1.5, s * 0.035);
        for (let wy = Math.ceil((s0 - 1) * 2) / 2; wy <= s1 + 1; wy += 0.5) {
          const py = this.camera.worldToScreen(x, wy, this.w, this.h).y - topLift + s * 0.4;
          if (py >= yTop + tickH && py < yBot - tickH) ctx.fillRect(x0, py, w2, tickH);
        }
        // Arris on the outward silhouette edge.
        ctx.fillStyle = 'rgba(24, 18, 34, 0.3)';
        ctx.fillRect(nx >= 0 ? x0 + w2 - 1.5 : x0, yTop, 1.5, yBot - yTop);
        // Brink shade at the run's crown end; AO where it meets ground.
        if (isTop) {
          ctx.fillStyle = 'rgba(24, 18, 34, 0.35)';
          ctx.fillRect(x0, yTop, w2, Math.max(2, s * 0.06));
        }
        if (isBottom) {
          ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
          ctx.fillRect(x0, yBot - Math.max(2, s * 0.05), w2, Math.max(2, s * 0.05));
        }
      },
    };
  }

  /**
   * A stone stair crossing the cliff line - real STEPPED PRISMS, not a
   * striped slab. Flights climbing away from the camera show receding
   * tread tops with hard step edges; flights climbing toward the
   * camera show full riser faces under each tread; sideways flights
   * show their south stringer as a zigzag of stepped faces with a lit
   * lip on every tread nose. Entities still ride the smooth
   * renderLift() gradient - a half-step of float against the drawn
   * treads is invisible at gait speed.
   */
  private rampItem(tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const lvl = game.world.elevAt(tx, ty);
    // Descent direction: the cardinal neighbor a level down.
    let dir: [number, number] = [0, 1];
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
      if (game.world.elevAt(tx + dx, ty + dy) < lvl) {
        dir = [dx, dy];
        break;
      }
    }
    const N = 5;
    const step = (ELEV_H * s) / N;
    const baseLift = (lvl - 1) * ELEV_H * s;
    const TOP_A = '#aaa4b2';
    const TOP_B = '#9f99a8';
    const RISER = '#6a6375';
    const LIP = '#c2bcca';

    return {
      sortY: ty,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        // Rounded to whole pixels like the flanking curtains' endpoints,
        // so the flight meets its cheek walls without a hairline seam.
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const edgeW = Math.max(1.5, s * 0.04);
        if (dir[1] === 1) {
          // Climbing NORTH (away): a RECESSED stairwell, not stripes
          // painted on the wall plane. Cheek walls (the cut sides of
          // the notch) frame a narrowed flight; a worn dirt apron
          // spills from the mouth onto the low ground and a matching
          // landing opens onto the crown (separate item) — the stair
          // is carved into the terrain and attached to both grounds.
          const cw = Math.max(3, s * 0.11);
          const ix0 = x0 + cw;
          const ix1 = x1 - cw;
          const yTopFlight = wts(tx, ty).y - baseLift - ELEV_H * s;
          const yMouth = wts(tx, ty + 1).y - baseLift;
          // (The worn mouth apron is its own item — see rampApronItem —
          // because an elevated mouth's crown row would repaint it.)
          // Treads recede up-screen between the cheeks, each with a
          // full riser face under its south nose.
          for (let i = N - 1; i >= 0; i--) {
            const lift = baseLift + (i + 1) * step;
            const ySouth = wts(tx, ty + 1 - i / N).y - lift;
            const yNorth = wts(tx, ty + 1 - (i + 1) / N).y - lift;
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(ix0, yNorth, ix1 - ix0, ySouth - yNorth + 0.5);
            // Riser under the nose.
            ctx.fillStyle = RISER;
            ctx.fillRect(ix0, ySouth, ix1 - ix0, step + 0.5);
            // Lit nose lip + shadow line under it.
            ctx.fillStyle = LIP;
            ctx.fillRect(ix0, ySouth - edgeW, ix1 - ix0, edgeW);
            ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
            ctx.fillRect(ix0, ySouth + step - edgeW, ix1 - ix0, edgeW);
          }
          // Center wear: the path feet actually take, slightly lighter.
          ctx.fillStyle = 'rgba(236, 232, 240, 0.08)';
          ctx.fillRect((ix0 + ix1) / 2 - (ix1 - ix0) * 0.19, yTopFlight, (ix1 - ix0) * 0.38, yMouth - yTopFlight);
          // Cheek walls: the notch's cut sides. The west cheek shows
          // its east-facing (shaded) inner side, the east cheek its
          // west-facing (sunlit) inner side. AO seam against treads.
          ctx.fillStyle = '#443e52';
          ctx.fillRect(x0, yTopFlight, cw, yMouth - yTopFlight);
          ctx.fillStyle = '#5b5468';
          ctx.fillRect(ix1, yTopFlight, cw, yMouth - yTopFlight);
          ctx.fillStyle = 'rgba(20, 15, 30, 0.35)';
          ctx.fillRect(ix0 - 1.5, yTopFlight, 1.5, yMouth - yTopFlight);
          ctx.fillRect(ix1, yTopFlight, 1.5, yMouth - yTopFlight);
          // Lit caps where the cheeks meet the crown light.
          ctx.fillStyle = 'rgba(255, 244, 214, 0.22)';
          ctx.fillRect(x0, yTopFlight, cw, Math.max(1.5, s * 0.035));
          ctx.fillRect(ix1, yTopFlight, cw, Math.max(1.5, s * 0.035));
        } else if (dir[1] === -1) {
          // Climbing SOUTH (toward camera): seen from behind-above -
          // receding tops with a hard drop edge at each step's back.
          for (let i = 0; i < N; i++) {
            const lift = baseLift + (i + 1) * step;
            const yNorth = wts(tx, ty + i / N).y - lift;
            const ySouth = wts(tx, ty + (i + 1) / N).y - lift;
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(x0, yNorth, x1 - x0, ySouth - yNorth + step + 0.5);
            ctx.fillStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.fillRect(x0, yNorth, x1 - x0, edgeW);
          }
        } else {
          // Climbing EAST or WEST: the south stringer is the read - a
          // zigzag of stepped faces, each tread nose lit, each drop
          // edged. Tops ride above at their own lifts.
          const yFaceBase = wts(tx, ty + 1).y - baseLift;
          for (let i = 0; i < N; i++) {
            // Strip i counts from the LOW side.
            const u0 = i / N;
            const u1 = (i + 1) / N;
            const sx0 = dir[0] === 1 ? x1 - (x1 - x0) * u1 : x0 + (x1 - x0) * u0;
            const sx1 = dir[0] === 1 ? x1 - (x1 - x0) * u0 : x0 + (x1 - x0) * u1;
            const lift = baseLift + (i + 1) * step;
            const yTopN = wts(tx, ty).y - lift;
            const yTopS = wts(tx, ty + 1).y - lift;
            // South face of this tread's block, down to the low ground.
            ctx.fillStyle = i % 2 === 0 ? RISER : shade(RISER, -8);
            ctx.fillRect(sx0, yTopS, sx1 - sx0, yFaceBase - yTopS + 0.5);
            // Tread top (foreshortened full tile depth).
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(sx0, yTopN, sx1 - sx0, yTopS - yTopN + 0.5);
            // Lit nose lip along the top of the face.
            ctx.fillStyle = LIP;
            ctx.fillRect(sx0, yTopS - edgeW * 0.6, sx1 - sx0, edgeW);
            // Step-corner drop edge on the higher side of the strip.
            const hiX = dir[0] === 1 ? sx0 : sx1 - edgeW;
            ctx.fillStyle = 'rgba(26, 20, 36, 0.4)';
            ctx.fillRect(hiX, yTopN - step, edgeW, step + (yTopS - yTopN));
          }
          // AO seam where the stringer meets the ground.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
          ctx.fillRect(x0, yFaceBase - edgeW, x1 - x0, edgeW);
        }
      },
    };
  }

  /**
   * The worn LANDING where a south-descending flight opens onto the
   * crown: a dirt patch painted over the lifted surface just north of
   * the stair top, so the path visibly continues onto the plateau
   * instead of the grass stopping dead at the top tread. Its own item:
   * it must draw after that row's crown slice but BEFORE anything
   * standing on it.
   */
  private rampLandingItem(tx: number, ty: number, game: ClientGame): DrawItem | null {
    const lvl = game.world.elevAt(tx, ty);
    if (lvl <= 0 || game.world.elevAt(tx, ty + 1) >= lvl) return null; // south-descending only
    const ctx = this.ctx;
    const s = this.camera.scale;
    const lift = lvl * ELEV_H * s;
    return {
      sortY: ty - 1 + 0.02,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const yTop = wts(tx, ty).y - lift;
        const inset = s * 0.09;
        const reach = s * 0.32; // how far the worn patch spills north
        ctx.fillStyle = '#6d5642';
        ctx.beginPath();
        ctx.moveTo(x0 + inset * 0.5, yTop + 1);
        ctx.lineTo(x1 - inset * 0.5, yTop + 1);
        ctx.lineTo(x1 - inset * 1.6, yTop - reach * 0.6);
        ctx.lineTo(x1 - inset * 3.2, yTop - reach);
        ctx.lineTo(x0 + inset * 3.2, yTop - reach);
        ctx.lineTo(x0 + inset * 1.6, yTop - reach * 0.6);
        ctx.closePath();
        ctx.fill();
        // Center wear continuing the flight's path line.
        ctx.fillStyle = 'rgba(126, 103, 80, 0.5)';
        const mid = (x0 + x1) / 2;
        ctx.fillRect(mid - (x1 - x0) * 0.17, yTop - reach * 0.8, (x1 - x0) * 0.34, reach * 0.8);
        // Faint shade where the landing meets the top tread.
        ctx.fillStyle = 'rgba(38, 28, 22, 0.2)';
        ctx.fillRect(x0 + inset * 0.5, yTop, x1 - x0 - inset, Math.max(1.5, s * 0.035));
      },
    };
  }

  /**
   * The worn APRON where the flight's mouth meets the ground below: a
   * fan of packed earth spilling from the bottom step. Its own item
   * (mirror of the landing) — sorted just after the mouth row's ground
   * so it survives elevated shelves, but before anything standing on it.
   */
  private rampApronItem(tx: number, ty: number, game: ClientGame): DrawItem | null {
    const lvl = game.world.elevAt(tx, ty);
    if (lvl <= 0 || game.world.elevAt(tx, ty + 1) >= lvl) return null; // south-descending only
    const ctx = this.ctx;
    const s = this.camera.scale;
    const baseLift = (lvl - 1) * ELEV_H * s;
    return {
      sortY: ty + 1 + 0.02,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const yMouth = wts(tx, ty + 1).y - baseLift;
        const fan = s * 0.34;
        const flare = s * 0.12;
        ctx.fillStyle = '#6d5642';
        ctx.beginPath();
        ctx.moveTo(x0 - flare * 0.4, yMouth - 1);
        ctx.lineTo(x1 + flare * 0.4, yMouth - 1);
        ctx.lineTo(x1 + flare, yMouth + fan * 0.55);
        ctx.lineTo(x1 - flare, yMouth + fan);
        ctx.lineTo(x0 + flare, yMouth + fan);
        ctx.lineTo(x0 - flare, yMouth + fan * 0.55);
        ctx.closePath();
        ctx.fill();
        // Shade tucked under the bottom riser; center wear continuing
        // the flight's path line out onto the ground.
        ctx.fillStyle = 'rgba(38, 28, 22, 0.25)';
        ctx.fillRect(x0 - flare * 0.4, yMouth - 1, x1 - x0 + flare * 0.8, Math.max(1.5, s * 0.04));
        ctx.fillStyle = 'rgba(126, 103, 80, 0.5)';
        const mid = (x0 + x1) / 2;
        ctx.fillRect(mid - (x1 - x0) * 0.17, yMouth, (x1 - x0) * 0.34, fan * 0.6);
      },
    };
  }

  // --------------------------------------------------------- rock nodes

  private static readonly ORE_STYLES: Partial<
    Record<number, { nug: string; deep: string; accent: string }>
  > = {
    [Tile.RockCopper]: { nug: '#e0954a', deep: '#7c4520', accent: '#3fa98e' },
    [Tile.RockTin]: { nug: '#d8dce6', deep: '#767c8c', accent: '#ffffff' },
    [Tile.RockIron]: { nug: '#c26f3e', deep: '#6f4638', accent: '#3a3d46' },
    [Tile.RockCoal]: { nug: '#2c2933', deep: '#191621', accent: '#8a86a0' },
    [Tile.RockGold]: { nug: '#f4c84f', deep: '#a87c1c', accent: '#fff3c9' },
  };

  // ---- shared rock-formation vocabulary --------------------------------

  /** Irregular low-poly mass: dark face, lifted flat cap, lit NW facet. */
  private rockMass(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
    face: string,
    cap: string,
    capLit: string,
    spiky = 0.28,
  ): { sil: Array<[number, number]>; cap: Array<[number, number]> } {
    const ctx = this.ctx;
    const n = 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (((seed >> (i * 2)) & 3) - 1.5) * 0.08;
      const rr = 0.84 + (((seed >> (i * 3)) & 7) / 7) * spiky;
      pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]);
    }
    const fill = (p: Array<[number, number]>): void => {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = face;
    fill(pts);
    // Grounding outline: keeps the mass readable on stone floors where
    // grey-on-grey would swallow it.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1.5, rx * 0.07);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    const lift = ry * 0.42;
    const capPts = pts.map(
      ([x, y]): [number, number] => [cx + (x - cx) * 0.87, cy + (y - cy) * 0.8 - lift],
    );
    ctx.fillStyle = cap;
    fill(capPts);
    ctx.fillStyle = capLit;
    ctx.beginPath();
    ctx.moveTo(capPts[5]![0], capPts[5]![1]);
    ctx.lineTo(capPts[6]![0], capPts[6]![1]);
    ctx.lineTo(capPts[7]![0], capPts[7]![1]);
    ctx.lineTo(cx, cy - lift);
    ctx.closePath();
    ctx.fill();
    // AO seam at the ground line.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.25)';
    ctx.fillRect(cx - rx * 0.7, cy + ry * 0.7, rx * 1.4, Math.max(1.5, rx * 0.09));
    return { sil: pts, cap: capPts };
  }

  /**
   * One BIG faceted ore block: deep-toned frame, bright crystal face,
   * specular slab. The blocks are the protagonists of a node - sized
   * to read from across the screen, several of them jutting past the
   * host rock's silhouette.
   */
  private oreBlock(
    x: number,
    y: number,
    w: number,
    rot: number,
    pal: { nug: string; deep: string; accent: string },
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const hh = w * 0.82;
    ctx.fillStyle = pal.deep;
    ctx.beginPath();
    chamferRect(ctx, -w / 2, -hh / 2, w, hh, w * 0.26);
    ctx.fill();
    ctx.fillStyle = pal.nug;
    ctx.beginPath();
    chamferRect(ctx, -w * 0.38, -hh * 0.36, w * 0.76, hh * 0.72, w * 0.2);
    ctx.fill();
    // Specular slab across the upper-left facet.
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -hh * 0.28);
    ctx.lineTo(w * 0.05, -hh * 0.28);
    ctx.lineTo(-w * 0.08, -hh * 0.02);
    ctx.lineTo(-w * 0.3, -hh * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** A four-point star twinkle - the "this is mineable" beacon. */
  private sparkle(x: number, y: number, r: number, alpha: number, color: string): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.22, y - r * 0.22);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.22, y + r * 0.22);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.22, y + r * 0.22);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.22, y - r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Staggered twinkle window: brief flash once per period. */
  private static twinkle(tSec: number, seed: number, period: number): number {
    const phase = ((tSec / period) + ((seed >>> 3) % 97) / 97) % 1;
    const DUR = 0.14;
    return phase < DUR ? Math.sin((phase / DUR) * Math.PI) : 0;
  }

  /** Loose chips scattered at a formation's feet - grounds the mass. */
  private baseScatter(px: number, py: number, s: number, h: number, colors: string[]): void {
    const ctx = this.ctx;
    for (let k = 0; k < 3; k++) {
      const cx = px + (((h >> (k * 6)) % 160) - 80) / 100 * s * 0.55;
      const cy = py + s * 0.32 + (((h >> (k * 4 + 2)) % 30) - 10) / 100 * s;
      const cw = s * (0.045 + ((h >> (k * 5)) % 5) / 130);
      ctx.fillStyle = colors[k % colors.length]!;
      ctx.beginPath();
      chamferRect(ctx, cx, cy, cw, cw * 0.75, cw * 0.3);
      ctx.fill();
    }
  }

  /**
   * MINING NODES - each metal is a bespoke landmark, not a palette
   * swap. Copper: a wide rust-warm outcrop with thick slabs of raw
   * copper bursting through a seam, weeping verdigris. Tin: cool stone
   * carrying a stack of cubic silver crystals. Iron: banded ironstone
   * slabs stacked like broken masonry, studded with rust wedges and a
   * black magnetite block. Coal: a glossy black seam-mass wedged
   * between grey shoulders. Gold: a milky quartz band splitting the
   * rock, packed with fat nuggets. All of them twinkle at idle - the
   * eye finds a minable node before the tooltip does.
   */
  private drawRockFormation(
    px: number,
    py: number,
    s: number,
    h: number,
    tile: Tile,
    tSec: number,
  ): void {
    const ctx = this.ctx;
    const cy0 = py - s * 0.08;

    if (tile === Tile.RockDepleted) {
      // Worked out: the mass remains, cracked open around an empty
      // cavity, rubble at its feet.
      this.rockMass(px, cy0 + s * 0.04, s * 0.4, s * 0.3, h, '#514c5c', '#5f5a6b', '#676274');
      ctx.fillStyle = '#332f3d';
      ctx.beginPath();
      facetCircle(ctx, px - s * 0.05, cy0 - s * 0.02, s * 0.16, 7, 0.4, 0.72);
      ctx.fill();
      ctx.fillStyle = '#262230';
      ctx.beginPath();
      facetCircle(ctx, px - s * 0.02, cy0, s * 0.09, 6, 0.2, 0.7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      for (let k = 0; k < 3; k++) {
        const a0 = ((h >> (k * 5)) % 100) / 100 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a0) * s * 0.12, cy0 + Math.sin(a0) * s * 0.08);
        ctx.lineTo(px + Math.cos(a0 + 0.5) * s * 0.3, cy0 + Math.sin(a0 + 0.5) * s * 0.22);
        ctx.stroke();
      }
      this.baseScatter(px, py, s, h, ['#4a4556', '#3f3b4a']);
      return;
    }

    if (tile === Tile.Rock) {
      // Barren stone: honest boulders, the occasional quartz streak.
      if ((h >> 7) % 3 !== 2) {
        this.rockMass(px + s * 0.3, cy0 + s * 0.1, s * 0.22, s * 0.17, h ^ 0x9e37, '#5a5466', '#6e6879', '#787284');
      }
      this.rockMass(px - s * 0.04, cy0, s * 0.4, s * 0.3, h, '#5f596b', '#767083', '#827c8e');
      if (h % 3 === 0) {
        ctx.strokeStyle = 'rgba(228, 224, 236, 0.4)';
        ctx.lineWidth = Math.max(1.5, s * 0.045);
        ctx.beginPath();
        ctx.moveTo(px - s * 0.22, cy0 + s * 0.05);
        ctx.lineTo(px - s * 0.02, cy0 - s * 0.07);
        ctx.lineTo(px + s * 0.2, cy0 + s * 0.02);
        ctx.stroke();
      }
      this.baseScatter(px, py, s, h, ['#6a6375', '#5a5466']);
      return;
    }

    const pal = Renderer.ORE_STYLES[tile]!;
    // Chunk anchors double as sparkle sites, collected per metal.
    const sites: Array<[number, number]> = [];

    if (tile === Tile.RockCopper) {
      // Tilted slab shoulder behind the main outcrop.
      ctx.save();
      ctx.translate(px + s * 0.34, cy0 - s * 0.02);
      ctx.rotate(-0.22);
      ctx.fillStyle = '#5e524c';
      ctx.beginPath();
      chamferRect(ctx, -s * 0.17, -s * 0.12, s * 0.34, s * 0.24, s * 0.07);
      ctx.fill();
      ctx.fillStyle = '#6f625a';
      ctx.beginPath();
      chamferRect(ctx, -s * 0.14, -s * 0.12, s * 0.28, s * 0.1, s * 0.05);
      ctx.fill();
      ctx.restore();
      this.rockMass(px - s * 0.04, cy0, s * 0.48, s * 0.34, h, '#6b5c55', '#877669', '#948377');
      // The seam: a thick dark band the copper erupts from.
      ctx.strokeStyle = pal.deep;
      ctx.lineWidth = Math.max(3, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(px - s * 0.42, cy0 + s * 0.16);
      ctx.lineTo(px - s * 0.08, cy0 - s * 0.04);
      ctx.lineTo(px + s * 0.34, cy0 + s * 0.1);
      ctx.stroke();
      // Big raw copper blocks: one bursting past the silhouette.
      const c1: [number, number] = [px - s * 0.3, cy0 - s * 0.28];
      const c2: [number, number] = [px - s * 0.14, cy0 + s * 0.04];
      const c3: [number, number] = [px + s * 0.2, cy0 + s * 0.06];
      this.oreBlock(c1[0], c1[1], s * 0.26, -0.3, pal);
      this.oreBlock(c2[0], c2[1], s * 0.22, 0.18, pal);
      this.oreBlock(c3[0], c3[1], s * 0.2, -0.12, pal);
      sites.push(c1, c3);
      // Verdigris weeping under the seam.
      ctx.fillStyle = pal.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(px - s * 0.2, cy0 + s * 0.1, s * 0.045, s * 0.14);
      ctx.fillRect(px + s * 0.08, cy0 + s * 0.14, s * 0.04, s * 0.1);
      ctx.globalAlpha = 1;
      this.baseScatter(px, py, s, h, [pal.nug, '#6a6375', pal.deep]);
    } else if (tile === Tile.RockTin) {
      this.rockMass(px + s * 0.16, cy0 + s * 0.02, s * 0.36, s * 0.29, h, '#5d5a66', '#7d7a88', '#888594');
      // Cubic crystal habit: a stack of silver cubes on the west
      // shoulder, one perched on top.
      const cubes: Array<[number, number, number, number]> = [
        [px - s * 0.3, cy0 + s * 0.1, s * 0.24, 0.1],
        [px - s * 0.4, cy0 - s * 0.08, s * 0.2, -0.14],
        [px - s * 0.16, cy0 - s * 0.1, s * 0.18, 0.05],
        [px + s * 0.08, cy0 - s * 0.32, s * 0.17, -0.08],
      ];
      for (const [cx2, cy2, w2, r2] of cubes) this.oreBlock(cx2, cy2, w2, r2, pal);
      sites.push([cubes[1]![0], cubes[1]![1]], [cubes[3]![0], cubes[3]![1]]);
      this.baseScatter(px, py, s, h, [pal.nug, '#6a6375']);
    } else if (tile === Tile.RockIron) {
      // Banded ironstone: three stacked slabs, offset like broken
      // masonry, rust bands running across each.
      const slabs: Array<[number, number, number, number]> = [
        [px - s * 0.46, cy0 + s * 0.06, s * 0.92, s * 0.3],
        [px - s * 0.38, cy0 - s * 0.16, s * 0.68, s * 0.24],
        [px - s * 0.1, cy0 - s * 0.34, s * 0.44, s * 0.2],
      ];
      for (let k = 0; k < slabs.length; k++) {
        const [sx, sy, sw, sh] = slabs[k]!;
        ctx.fillStyle = k % 2 === 0 ? '#5f4a42' : '#564440';
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        chamferRect(ctx, sx, sy, sw, sh, s * 0.06);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = k % 2 === 0 ? '#75594c' : '#6d5348';
        ctx.beginPath();
        chamferRect(ctx, sx + sw * 0.05, sy, sw * 0.9, sh * 0.32, s * 0.05);
        ctx.fill();
        // Rust parting under the cap.
        ctx.fillStyle = 'rgba(163, 92, 51, 0.55)';
        ctx.fillRect(sx + sw * 0.08, sy + sh * 0.44, sw * 0.84, Math.max(1.5, s * 0.035));
      }
      const w1: [number, number] = [px - s * 0.26, cy0 - s * 0.04];
      const w2: [number, number] = [px + s * 0.22, cy0 + s * 0.14];
      this.oreBlock(w1[0], w1[1], s * 0.24, 0.14, pal);
      this.oreBlock(w2[0], w2[1], s * 0.21, -0.2, pal);
      // Magnetite block: near-black with a cold specular.
      this.oreBlock(px + s * 0.06, cy0 - s * 0.24, s * 0.19, 0.08, {
        nug: '#3a3d46',
        deep: '#23252c',
        accent: '#9fb2c8',
      });
      sites.push(w1, [px + s * 0.06, cy0 - s * 0.24]);
      this.baseScatter(px, py, s, h, [pal.nug, '#5f4a42']);
    } else if (tile === Tile.RockCoal) {
      // Grey shoulders bracketing one huge glossy seam-mass.
      this.rockMass(px - s * 0.36, cy0 + s * 0.06, s * 0.24, s * 0.2, h ^ 0x51f3, '#5a5466', '#6e6879', '#787284');
      this.rockMass(px + s * 0.38, cy0 + s * 0.08, s * 0.2, s * 0.17, h ^ 0x9e37, '#5a5466', '#6e6879', '#787284');
      // The seam itself: jagged, black, glossy.
      const n = 9;
      ctx.fillStyle = pal.nug;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const rr = (0.72 + (((h >> (i * 3)) & 7) / 7) * 0.5) * s * 0.36;
        const x = px + Math.cos(a) * rr * 1.15;
        const y = cy0 + Math.sin(a) * rr * 0.78;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.stroke();
      // Angular gloss facets + hard glint ticks.
      ctx.fillStyle = '#3d3a48';
      ctx.beginPath();
      ctx.moveTo(px - s * 0.22, cy0 - s * 0.1);
      ctx.lineTo(px + s * 0.02, cy0 - s * 0.24);
      ctx.lineTo(px + s * 0.1, cy0 - s * 0.02);
      ctx.lineTo(px - s * 0.1, cy0 + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(px - s * 0.14, cy0 - s * 0.14, s * 0.1, Math.max(1.5, s * 0.03));
      ctx.fillRect(px + s * 0.08, cy0 + s * 0.06, s * 0.07, Math.max(1.5, s * 0.026));
      sites.push([px - s * 0.1, cy0 - s * 0.12], [px + s * 0.12, cy0 + s * 0.04]);
      // Soot at the feet.
      ctx.fillStyle = 'rgba(20, 17, 26, 0.35)';
      ctx.beginPath();
      ctx.ellipse(px, py + s * 0.3, s * 0.4, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      this.baseScatter(px, py, s, h, ['#232028', '#3d3a48']);
    } else {
      // Gold: a milky quartz band splitting the rock, fat nuggets
      // inside. The band lives IN the stone — clipped to the mass so
      // it reads as a vein, never a plank laid across it.
      const mass = this.rockMass(px - s * 0.02, cy0, s * 0.45, s * 0.33, h, '#524c5f', '#665f74', '#716a7f');
      ctx.save();
      const clipPath = new Path2D();
      const both = [mass.sil, mass.cap];
      for (const poly of both) {
        poly.forEach(([x, y], i2) => (i2 === 0 ? clipPath.moveTo(x, y) : clipPath.lineTo(x, y)));
        clipPath.closePath();
      }
      ctx.clip(clipPath);
      ctx.translate(px, cy0);
      ctx.rotate(-0.32);
      ctx.fillStyle = '#c9c2d4';
      ctx.fillRect(-s * 0.6, -s * 0.11, s * 1.2, s * 0.22);
      ctx.fillStyle = '#efeaf2';
      ctx.fillRect(-s * 0.6, -s * 0.08, s * 1.2, s * 0.16);
      ctx.restore();
      const g1: [number, number] = [px - s * 0.24, cy0 + s * 0.1];
      const g2: [number, number] = [px + s * 0.05, cy0 - s * 0.015];
      const g3: [number, number] = [px + s * 0.3, cy0 - s * 0.12];
      const g4: [number, number] = [px - s * 0.06, cy0 - s * 0.34];
      this.oreBlock(g1[0], g1[1], s * 0.2, 0.2, pal);
      this.oreBlock(g2[0], g2[1], s * 0.23, -0.1, pal);
      this.oreBlock(g3[0], g3[1], s * 0.18, 0.28, pal);
      this.oreBlock(g4[0], g4[1], s * 0.16, -0.2, pal);
      sites.push(g2, g3, g4);
      this.baseScatter(px, py, s, h, [pal.nug, '#6a6375']);
      // The hoard glows: a slow warm pulse.
      const pulse = 0.6 + Math.sin(tSec * 1.7 + (h % 10)) * 0.4;
      this.queueGlow(
        (px - this.w / 2) / s + this.camera.x,
        (cy0 - this.h / 2) / (s * this.camera.yScale) + this.camera.y,
        0.7,
        '242, 201, 76',
        0.14 * pulse,
      );
    }

    // Idle shimmer: brief four-point twinkles over the crystal sites -
    // gold flashes often, everything else winks patiently.
    const period = tile === Tile.RockGold ? 2.1 : 3.4;
    for (let k = 0; k < sites.length; k++) {
      const a = Renderer.twinkle(tSec, h >> (k * 4), period + k * 0.53);
      if (a <= 0) continue;
      const [sx2, sy2] = sites[k]!;
      const jx = (((h >> (k * 7)) % 20) - 10) / 100 * s;
      this.sparkle(sx2 + jx, sy2 - s * 0.04, s * (0.07 + 0.05 * a), 0.9 * a, '#ffffff');
      this.sparkle(sx2 + jx, sy2 - s * 0.04, s * (0.035 + 0.02 * a), 0.9 * a, pal.accent);
    }
  }

  // -------------------------------------------------------------- trees

  /**
   * The forest is a character, not a texture. Trees stand 3-4× the
   * player's height in six bespoke species — each with a real curved,
   * forked, or gnarled trunk, root flares, boughs, and a layered
   * low-poly crown — and the whole treeline breathes on ONE coherent
   * wind field so neighbours sway together, never against each other.
   */

  /**
   * Coherent wind field: a smooth value in ~[-0.6, 1.4] (biased
   * downwind) sampled from world position + time. Two slow swells
   * travel along the wind direction over a slowly breathing gust
   * envelope — no `sin²` spikes, no per-tree randomness. Nearby trees
   * read nearly the same phase (they group); distant trees lag as the
   * front sweeps across, exactly like real wind moving through a wood.
   */
  private windField(wx: number, wy: number, tSec: number): number {
    // ONE weather system: the treeline rides the same vector wind field
    // as the grass (grass.ts), so gust fronts sweep canopy and meadow
    // together — a squall you can watch cross the whole scene.
    return windScalarAt(wx, wy, tSec);
  }

  private static readonly TREE_SPECIES: Array<{
    trunk: string;
    leaves: string[];
    hMin: number;
    hMax: number;
    trunkW: number; // base half-width, tile fraction of k
    tipW: number; // tip half-width fraction of trunkW
    bow: number; // sideways trunk curve (± by hash)
    lean: number; // constant windswept lean
    fork: number | null; // fork height fraction, or null
    gnarl: number; // trunk edge waviness
    flare: number; // root-flare boost
    sides: number; // canopy facet count
    // Crowns: clusters of [ox, oy(up=neg), r] tiles. Fork species use
    // two clusters (indices split by `crownSplit`).
    lobes: Array<[number, number, number]>;
    crownSplit: number; // lobes[0..split) = left branch crown
    limbs: Array<[number, number, number]>; // [startHf, endOx, endOy]
  }> = [
    // 0 — Maple: sturdy, slightly bowed, full round crown.
    {
      trunk: '#6b4a26', leaves: ['#3a8140', '#35773a', '#3f8a3c'],
      hMin: 1.0, hMax: 1.28, trunkW: 0.1, tipW: 0.4, bow: 0.14, lean: 0,
      fork: null, gnarl: 0.03, flare: 0.9, sides: 8,
      lobes: [[0.5, -2.0, 0.6], [-0.5, -2.05, 0.62], [0, -2.55, 0.7], [0, -2.15, 0.95]],
      crownSplit: 0, limbs: [],
    },
    // 1 — Birch: tall, slim, pale, gentle S-curve, airy vertical crown.
    {
      trunk: '#d7d2c4', leaves: ['#5a9b48', '#63a850', '#579544'],
      hMin: 1.25, hMax: 1.55, trunkW: 0.06, tipW: 0.5, bow: 0.22, lean: 0,
      fork: null, gnarl: 0.02, flare: 0.5, sides: 7,
      lobes: [[0.12, -3.1, 0.42], [-0.1, -2.6, 0.55], [0.06, -2.1, 0.5], [0.02, -3.5, 0.34]],
      crownSplit: 0, limbs: [[0.55, -0.6, -2.2], [0.68, 0.55, -2.6]],
    },
    // 2 — Twin: trunk forks into a Y, two separate crowns.
    {
      trunk: '#66492a', leaves: ['#3a8140', '#348a3f', '#31763a'],
      hMin: 1.05, hMax: 1.3, trunkW: 0.1, tipW: 0.45, bow: 0.06, lean: 0,
      fork: 0.42, gnarl: 0.04, flare: 0.8, sides: 8,
      lobes: [[-0.85, -2.3, 0.62], [-0.5, -2.7, 0.5], [0.85, -2.15, 0.64], [0.55, -2.55, 0.5]],
      crownSplit: 2, limbs: [],
    },
    // 3 — Windswept: leans hard, crown streaming downwind, layered.
    {
      trunk: '#6b4a26', leaves: ['#3f8a3c', '#479243', '#3a8140'],
      hMin: 1.05, hMax: 1.3, trunkW: 0.095, tipW: 0.42, bow: 0.1, lean: 0.42,
      fork: null, gnarl: 0.05, flare: 0.85, sides: 8,
      lobes: [[0.75, -2.35, 0.66], [0.3, -2.0, 0.56], [1.1, -2.05, 0.5], [0.55, -2.65, 0.52]],
      crownSplit: 0, limbs: [[0.5, -0.55, -1.7]],
    },
    // 4 — Bushy broadleaf: short thick trunk, wide low crown, boughs.
    {
      trunk: '#6f5030', leaves: ['#48924a', '#3f8a3c', '#4f9a4e'],
      hMin: 0.85, hMax: 1.05, trunkW: 0.14, tipW: 0.5, bow: 0.05, lean: 0,
      fork: null, gnarl: 0.04, flare: 1.1, sides: 9,
      lobes: [[-0.95, -1.7, 0.66], [0.95, -1.7, 0.66], [0, -2.15, 0.85], [-0.4, -1.5, 0.55], [0.45, -1.5, 0.55]],
      crownSplit: 0, limbs: [[0.4, -0.9, -1.5], [0.45, 0.9, -1.5]],
    },
    // 5 — Ancient oak: thick gnarled trunk, heavy boughs, dark canopy.
    {
      trunk: '#5d4022', leaves: ['#2c5c31', '#2f6135', '#295830'],
      hMin: 1.15, hMax: 1.42, trunkW: 0.19, tipW: 0.5, bow: 0.08, lean: 0,
      fork: null, gnarl: 0.09, flare: 1.3, sides: 9,
      lobes: [[-0.95, -2.15, 0.72], [0.9, -2.2, 0.74], [0, -2.75, 0.78], [0, -2.25, 1.05], [-0.45, -1.75, 0.58], [0.5, -1.8, 0.58]],
      crownSplit: 0, limbs: [[0.5, -1.15, -1.9], [0.55, 1.1, -1.95], [0.62, -0.4, -2.3]],
    },
  ];

  private static speciesOf(h: number, oak: boolean): number {
    return oak ? 5 : h % 5;
  }

  /** Fill a tapered spine (centreline + width profile) as a bark shape. */
  private fillSpine(
    pts: Array<[number, number]>,
    wBase: number,
    wTip: number,
    flare: number,
    color: string,
    litColor: string,
  ): void {
    const ctx = this.ctx;
    const n = pts.length;
    const left: Array<[number, number]> = [];
    const right: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const nx = -ty;
      const ny = tx;
      const u = i / (n - 1);
      let w = wBase + (wTip - wBase) * u;
      if (u < 0.2) w *= 1 + flare * ((0.2 - u) / 0.2);
      left.push([pts[i]![0] + nx * w, pts[i]![1] + ny * w]);
      right.push([pts[i]![0] - nx * w, pts[i]![1] - ny * w]);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(left[0]![0], left[0]![1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]![0], left[i]![1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]![0], right[i]![1]);
    ctx.closePath();
    ctx.fill();
    // Lit west edge.
    ctx.strokeStyle = litColor;
    ctx.lineWidth = Math.max(1, wBase * 0.5);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(left[0]![0], left[0]![1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]![0], left[i]![1]);
    ctx.stroke();
  }

  /**
   * Build a trunk/branch centreline from base to a target, curving with
   * `bow` (sideways bulge), `lean` (constant), and `gnarl` (deterministic
   * wobble), then displaced by the wind cantilever `disp(hf)`.
   */
  private spine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    k: number,
    bow: number,
    lean: number,
    gnarl: number,
    bowSign: number,
    rnd: (i: number) => number,
    disp: (hf: number) => number,
    hf0: number,
    hf1: number,
    segs: number,
  ): Array<[number, number]> {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const e = u * u * (3 - 2 * u);
      const hf = hf0 + (hf1 - hf0) * u;
      let x = x0 + (x1 - x0) * e;
      x += bowSign * bow * Math.sin(u * Math.PI) * k;
      x += lean * e * k;
      x += (rnd(i + 3) - 0.5) * gnarl * k;
      x += disp(hf);
      pts.push([x, y0 + (y1 - y0) * u]);
    }
    return pts;
  }

  private drawTree(
    bx: number,
    by: number,
    wx: number,
    wy: number,
    h: number,
    oak: boolean,
    tSec: number,
    bendOverride: number | undefined,
  ): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const sp = Renderer.TREE_SPECIES[Renderer.speciesOf(h, oak)]!;
    const rnd = (i: number): number => (hashCoords(7, h & 0xffff, i) % 1000) / 1000;
    const k = (sp.hMin + (sp.hMax - sp.hMin) * rnd(1)) * s;
    const groundY = by + syT * 0.3;
    const bark = sp.trunk;
    const litBark = shade(bark, bark === '#d7d2c4' ? 10 : 16);
    const leaf = sp.leaves[h % sp.leaves.length]!;
    const bowSign = rnd(2) < 0.5 ? -1 : 1;

    // Coherent wind → a horizontal bend that grows with height (a
    // cantilever: base planted, crown swaying most). One value for the
    // whole tree, so it moves as a unit and never fights itself.
    const windVal = bendOverride !== undefined ? bendOverride : this.windField(wx, wy, tSec);
    const bend = windVal * 0.17 * k;
    const disp = (hf: number): number => bend * Math.pow(Math.max(0, hf), 1.4);
    const shimMag = (0.4 + Math.min(1.2, Math.abs(windVal))) * 0.014 * k;

    // Crown attach heights (tiles up from ground → screen y).
    const topTile = Math.max(...sp.lobes.map((l) => -l[1] + l[2] * 0.4));

    // --- Trunk (+ fork branches) as bespoke curved spines.
    let trunkPts: Array<[number, number]> | null = null;
    if (sp.fork !== null) {
      const forkY = groundY - topTile * sp.fork * k;
      const forkX = bx + disp(sp.fork);
      // Shared lower trunk.
      const lower = this.spine(bx, groundY, forkX, forkY, k, sp.bow * 0.5, 0, sp.gnarl, bowSign, rnd, disp, 0, sp.fork, 4);
      this.fillSpine(lower, sp.trunkW * k, sp.trunkW * k * 0.8, sp.flare, bark, litBark);
      // Two branches to the two crown centres.
      const lC = this.clusterCentre(sp, 0, sp.crownSplit);
      const rC = this.clusterCentre(sp, sp.crownSplit, sp.lobes.length);
      for (const [cxT, cyT] of [lC, rC]) {
        const bxr = this.spine(
          forkX, forkY, bx + cxT * k, groundY + cyT * k + 0.35 * k, k,
          sp.bow, 0, sp.gnarl, cxT < 0 ? -1 : 1, rnd, disp, sp.fork, 0.92, 4,
        );
        this.fillSpine(bxr, sp.trunkW * k * 0.72, sp.trunkW * k * 0.4, 0.2, bark, litBark);
      }
    } else {
      const topX = bx + sp.lean * k * 0.5;
      const trunk = this.spine(
        bx, groundY, topX, groundY - topTile * 0.82 * k, k,
        sp.bow, sp.lean, sp.gnarl, bowSign, rnd, disp, 0, 0.82, 6,
      );
      trunkPts = trunk;
      this.fillSpine(trunk, sp.trunkW * k, sp.trunkW * k * sp.tipW, sp.flare, bark, litBark);
      // Bark seam texture.
      ctx.strokeStyle = shade(bark, -20);
      ctx.lineWidth = Math.max(1, s * 0.025);
      ctx.beginPath();
      for (let i = 1; i < trunk.length - 1; i += 2) {
        ctx.moveTo(trunk[i]![0] + sp.trunkW * k * 0.2, trunk[i]![1]);
        ctx.lineTo(trunk[i]![0] + sp.trunkW * k * 0.2, trunk[i]![1] - k * 0.14);
      }
      ctx.stroke();
    }

    // Root flares: a couple of short buttress roots at the base.
    ctx.fillStyle = shade(bark, -8);
    for (const rs of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx + rs * sp.trunkW * k * (1 + sp.flare), groundY - sp.trunkW * k * 0.4);
      ctx.lineTo(bx + rs * sp.trunkW * k * (2.2 + sp.flare), groundY + syT * 0.02);
      ctx.lineTo(bx + rs * sp.trunkW * k * 0.5, groundY + syT * 0.03);
      ctx.closePath();
      ctx.fill();
    }

    // --- Limbs: tapered boughs reaching out toward leaf clusters.
    // Anchored by SAMPLING the built trunk polyline — a bough can never
    // float off a bowed, leaning, or gnarled trunk.
    for (const [sh, ex, ey] of sp.limbs) {
      let ax: number;
      let ay: number;
      if (trunkPts) {
        const uPt = Math.min(1, sh / 0.82) * (trunkPts.length - 1);
        const i0 = Math.floor(uPt);
        const fr = uPt - i0;
        const q0 = trunkPts[i0]!;
        const q1 = trunkPts[Math.min(trunkPts.length - 1, i0 + 1)]!;
        ax = q0[0] + (q1[0] - q0[0]) * fr;
        ay = q0[1] + (q1[1] - q0[1]) * fr;
      } else {
        ax = bx + disp(sh) + bowSign * sp.bow * Math.sin(sh * Math.PI) * k;
        ay = groundY - topTile * sh * k;
      }
      const limb = this.spine(
        ax, ay, bx + ex * k, groundY + ey * k, k, 0.12, 0, sp.gnarl, ex < 0 ? -1 : 1,
        rnd, disp, sh, Math.min(1, -ey / topTile), 3,
      );
      this.fillSpine(limb, sp.trunkW * k * 0.5, sp.trunkW * k * 0.18, 0, bark, litBark);
    }

    // --- Canopy: layered lobes, painted back-to-front. All share the
    // one bend; a tiny coherent shimmer adds leaf flutter without ever
    // sending lobes in opposite directions.
    const order = sp.lobes
      .map((l, i) => ({ l, i }))
      .sort((a, b) => a.l[1] - b.l[1]); // higher (more negative oy) first
    for (const { l, i } of order) {
      const [ox, oy, r] = l;
      const hf = -oy / topTile;
      const shimmer = Math.sin(tSec * 2.3 + wx * 0.5 + wy * 0.3 + i) * shimMag;
      const lx3 = bx + ox * k + disp(hf) + shimmer;
      const ly3 = groundY + oy * k;
      const lr = r * k;
      const seed = h ^ (i * 0x9e37);
      ctx.fillStyle = shade(leaf, -16);
      ctx.beginPath();
      facetBlob(ctx, lx3 + lr * 0.12, ly3 + lr * 0.14, lr * 0.95, seed, sp.sides, 0.92);
      ctx.fill();
      ctx.fillStyle = leaf;
      ctx.beginPath();
      facetBlob(ctx, lx3, ly3, lr * 0.93, seed, sp.sides, 0.92);
      ctx.fill();
      ctx.fillStyle = shade(leaf, 18);
      ctx.beginPath();
      facetBlob(ctx, lx3 - lr * 0.26 + shimmer * 0.5, ly3 - lr * 0.3, lr * 0.5, seed ^ 0x55, 6, 0.9);
      ctx.fill();
    }

    // Life: strong gusts shake the occasional leaf loose (skipped while
    // felling — the fall spawns its own debris).
    if (bendOverride === undefined && Math.random() < 0.0009 * (0.5 + Math.abs(windVal))) {
      const l = sp.lobes[Math.floor(rnd(9) * sp.lobes.length)]!;
      const wpt = this.camera.screenToWorld(
        bx + l[0] * k + (Math.random() - 0.5) * l[2] * k,
        groundY + l[1] * k + l[2] * k * 0.4,
        this.w,
        this.h,
      );
      this.particles.burst(wpt.x, wpt.y, 1, [shade(leaf, 24), '#c9a441'], {
        speed: 0.4 + Math.max(0, windVal) * 0.5,
        life: 2.2,
        size: 0.05,
        gravity: 0.5,
        drag: 0.7,
        dir: 0.2,
        spread: 1.4,
      });
    }
  }

  /** Average centre of a lobe cluster (tiles), for fork branch targets. */
  private clusterCentre(
    sp: { lobes: Array<[number, number, number]> },
    from: number,
    to: number,
  ): [number, number] {
    let sx = 0;
    let sy = 0;
    for (let i = from; i < to; i++) {
      sx += sp.lobes[i]![0];
      sy += sp.lobes[i]![1];
    }
    const n = to - from || 1;
    return [sx / n, sy / n];
  }

  private drawTreeShadow(bx: number, by: number, h: number, oak: boolean): void {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const sp = Renderer.TREE_SPECIES[Renderer.speciesOf(h, oak)]!;
    const rnd = (i: number): number => (hashCoords(7, h & 0xffff, i) % 1000) / 1000;
    const k = (sp.hMin + (sp.hMax - sp.hMin) * rnd(1)) * s;
    const spread = Math.max(...sp.lobes.map((l) => Math.abs(l[0]) + l[2])) * 0.7;
    // The canopy's silhouette thrown from its height, the trunk's
    // smear tying it to the roots — long at dawn, tucked in at noon.
    this.castBlob(bx, by + syT * 0.18, oak ? 1.7 : 1.4, k * spread * 0.9, h ^ 0x33, s * 0.09);
  }

  /**
   * A felled tree: shudder → topple (varied azimuth) → impact with a
   * rolling wall of dust → it lies on the ground for a beat → it breaks
   * apart into log chunks and a last billow of dust. Timeline in ms.
   */
  private readonly fallingTrees: Array<{
    tx: number;
    ty: number;
    oak: boolean;
    h: number;
    dir: number;
    tilt: number; // extra screen-plane tilt for azimuth variance
    lie: number; // final lie angle magnitude
    az: number; // world fall azimuth (debris direction)
    born: number;
    impacted: boolean;
    brokeUp: boolean;
  }> = [];

  addFallingTree(tx: number, ty: number, oak: boolean, dir: number): void {
    const h = hashCoords(41, tx, ty);
    const sign = Math.sign(dir) || 1;
    const r = (n: number): number => (hashCoords(17, h & 0xffff, n) % 1000) / 1000;
    this.fallingTrees.push({
      tx,
      ty,
      oak,
      h,
      dir: sign,
      // Azimuth variance: mostly sideways, but each fall differs.
      tilt: (r(1) - 0.5) * 0.5,
      lie: 1.45 + (r(2) - 0.3) * 0.28,
      az: sign > 0 ? 0.15 + (r(3) - 0.5) * 0.9 : Math.PI - 0.15 + (r(3) - 0.5) * 0.9,
      born: performance.now(),
      impacted: false,
      brokeUp: false,
    });
  }

  // --------------------------------------------------- breaking rocks

  private readonly breakingRocks: Array<{ tx: number; ty: number; tile: Tile; born: number }> = [];

  /**
   * A mined-out node doesn't blink into its depleted state — it
   * CRUMBLES: the formation shudders, sinks, and shatters into flying
   * fragments and a rolling dust cloud that covers the tile swap.
   */
  addRockBreak(tx: number, ty: number, tile: Tile): void {
    this.breakingRocks.push({ tx, ty, tile, born: performance.now() });
    const cx = tx + 0.5;
    const cy = ty + 0.5;
    const pal = Renderer.ORE_STYLES[tile];
    // Chunky stone fragments thrown up and out.
    this.particles.burst(cx, cy, 9, ['#6a6375', '#5a5466', '#767083'], {
      speed: 2.3, life: 0.8, size: 0.13, gravity: 8, drag: 1.1, up: true, spread: 2.4,
    });
    // Shards of the metal itself.
    if (pal) {
      this.particles.burst(cx, cy - 0.15, 6, [pal.nug, pal.deep], {
        speed: 2.7, life: 0.7, size: 0.09, gravity: 8.5, up: true, spread: 2.1,
      });
    }
    // Rolling dust settles over the swap.
    this.particles.burst(cx, cy + 0.12, 13, ['#a89880', '#bcae94', '#9b8a70'], {
      speed: 1.4, life: 1.05, size: 0.13, gravity: 0.5, drag: 3, grow: 0.16, spread: 2.6,
    });
  }

  private collectBreakingRocks(game: ClientGame, items: DrawItem[]): void {
    const now = performance.now();
    const tSec = now / 1000;
    const DUR = 460;
    for (let i = this.breakingRocks.length - 1; i >= 0; i--) {
      const br = this.breakingRocks[i]!;
      const ms = now - br.born;
      if (ms >= DUR) {
        this.breakingRocks.splice(i, 1);
        continue;
      }
      const u = ms / DUR;
      const lift = this.renderLift(br.tx + 0.5, br.ty + 0.5) * this.camera.scale;
      items.push({
        // A hair above the depleted rock underneath, which it hides.
        sortY: br.ty + 0.86,
        elevated: lift > 0,
        draw: () => {
          const ctx = this.ctx;
          const s = this.camera.scale;
          const p = this.camera.worldToScreen(br.tx + 0.5, br.ty + 0.5, this.w, this.h);
          p.y -= lift;
          const baseY = p.y + s * 0.35; // crush toward the ground line
          const shake = Math.sin(now * 0.11) * s * 0.02 * (1 - u);
          ctx.save();
          ctx.globalAlpha = u < 0.5 ? 1 : 1 - ((u - 0.5) / 0.5) ** 1.5;
          ctx.translate(p.x + shake, baseY);
          ctx.scale(1 + 0.14 * u, 1 - 0.5 * u * u);
          ctx.translate(-p.x, -baseY);
          this.drawRockFormation(p.x, p.y, s, hashCoords(41, br.tx, br.ty), br.tile, tSec);
          ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
    }
  }

  private collectFallingTrees(items: DrawItem[]): void {
    const now = performance.now();
    const tSec = now / 1000;
    // Timeline (ms): shudder 0-180, topple 180-720, bounce 720-900,
    // lie 900-2500, breakup 2500-3200.
    const END = 3200;
    for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
      const ft = this.fallingTrees[i]!;
      const ms = now - ft.born;
      if (ms >= END) {
        this.fallingTrees.splice(i, 1);
        continue;
      }
      const cx = ft.tx + 0.5;
      const cy = ft.ty + 0.5;
      const cosA = Math.cos(ft.az);
      const sinA = Math.sin(ft.az) * this.camera.yScale;

      // Impact: a wall of dust rolls out along the fall, plus a leaf
      // burst where the crown slams down.
      if (ms >= 720 && !ft.impacted) {
        ft.impacted = true;
        this.shake(3);
        const lx = cx + cosA * 2.4;
        const ly = cy + sinA * 2.4;
        // Rolling dust: big, slow, billowing blocks that settle.
        this.particles.burst(lx, ly, 22, ['#a89880', '#bcae94', '#9b8a70', '#c8bca4'], {
          speed: 2.6, life: 1.1, size: 0.14, gravity: 0.6, drag: 3.2,
          grow: 0.18, dir: ft.az, spread: 1.5,
        });
        this.particles.burst(cx + cosA, cy + sinA, 12, ['#9b8a70', '#b5a488'], {
          speed: 1.6, life: 0.9, size: 0.12, gravity: 0.5, drag: 3, grow: 0.14,
        });
        // Crown leaf spray.
        this.particles.burst(lx, ly - 0.2, 20, ['#3a8140', '#35773a', '#2f6135', '#c9a441'], {
          speed: 2.4, life: 0.9, size: 0.07, up: true, gravity: 3.5, drag: 1.2,
        });
      }

      // Breakup: the trunk splits into tumbling log chunks + a last
      // dust billow instead of just vanishing.
      if (ms >= 2500 && !ft.brokeUp) {
        ft.brokeUp = true;
        const bark = ft.oak ? '#5d4022' : '#6b4a26';
        for (let c = 0; c < 5; c++) {
          const along = 0.6 + c * 0.7;
          this.particles.burst(cx + cosA * along, cy + sinA * along, 1, [bark, shade(bark, 14)], {
            speed: 1.4, life: 0.8, size: 0.2, gravity: 6, drag: 1.5, dir: -Math.PI / 2, spread: 1.6,
          });
        }
        this.particles.burst(cx + cosA * 1.6, cy + sinA * 1.6, 14, ['#a89880', '#bcae94', '#9b8a70'], {
          speed: 1.8, life: 1.0, size: 0.15, gravity: 0.4, drag: 3, grow: 0.16, dir: ft.az, spread: 2,
        });
      }

      items.push({
        sortY: ft.ty + 0.9,
        elevated: this.renderLift(cx, cy) > 0,
        draw: () => {
          const ctx = this.ctx;
          const p = this.camera.worldToScreen(cx, cy, this.w, this.h);
          p.y -= this.renderLift(cx, cy) * this.camera.scale;
          const syT = this.camera.scale * this.camera.yScale;
          const pivotY = p.y + syT * 0.3;
          let angle: number;
          let bend: number | undefined;
          if (ms < 180) {
            // The cut bites: the tree shudders in place.
            const u = ms / 180;
            angle = 0;
            bend = Math.sin(now * 0.08) * 0.5 * u;
          } else if (ms < 720) {
            const u = (ms - 180) / 540;
            angle = ft.lie * u * u; // gravity accelerates the topple
            bend = 0;
          } else if (ms < 900) {
            const u = (ms - 720) / 180;
            angle = ft.lie - Math.sin(u * Math.PI) * 0.06; // settle bounce
            bend = 0;
          } else {
            angle = ft.lie; // lying on the ground
            bend = 0;
          }
          // Breakup fade only at the very end.
          const alpha = ms > 2600 ? Math.max(0, 1 - (ms - 2600) / 600) : 1;
          ctx.save();
          if (alpha < 1) ctx.globalAlpha = alpha;
          ctx.translate(p.x, pivotY);
          ctx.rotate(ft.dir * angle + ft.tilt * Math.min(1, angle / ft.lie));
          ctx.translate(-p.x, -pivotY);
          this.drawTree(p.x, p.y, cx, cy, ft.h, ft.oak, tSec, bend);
          ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
    }
  }

  /** Trees, rocks, stations — the object layer, redrawn with character. */
  private objectItem(tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx + 0.5, ty + 0.5, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const h = hashCoords(41, tx, ty);
    const t = performance.now() / 1000;

    switch (tile) {
      case Tile.Tree:
      case Tile.TreeOak: {
        const oak = tile === Tile.TreeOak;
        return {
          sortY: ty + 0.9,
          drawShadow: () => this.drawTreeShadow(p.x, p.y, h, oak),
          draw: () => this.drawTree(p.x, p.y, tx + 0.5, ty + 0.5, h, oak, t, undefined),
        };
      }

      case Tile.Rock:
      case Tile.RockCopper:
      case Tile.RockTin:
      case Tile.RockIron:
      case Tile.RockCoal:
      case Tile.RockGold:
      case Tile.RockDepleted: {
        const depleted = tile === Tile.RockDepleted;
        const size = depleted ? 0.8 : 1;
        return {
          sortY: ty + 0.85,
          drawShadow: () => {
            this.castBlob(p.x, p.y + s * 0.18, 0.5 * size, s * 0.44 * size, h ^ 0x11);
          },
          draw: () => this.drawRockFormation(p.x, p.y, s, h, tile, t),
        };
      }

      case Tile.Stump:
        return {
          sortY: ty + 0.6,
          draw: () => {
            // A hewn hexagonal stump — cut marks, not a smooth oval.
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y, s * 0.21, 6, 0.2, 0.72);
            ctx.fill();
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y - s * 0.05, s * 0.19, 6, 0.2, 0.72);
            ctx.fill();
            ctx.strokeStyle = '#7a552e';
            ctx.lineWidth = Math.max(1, s * 0.03);
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y - s * 0.05, s * 0.1, 6, 0.2, 0.72);
            ctx.stroke();
          },
        };

      case Tile.LampPost: {
        // An iron lantern on a post: cold black metal by day, a warm
        // caged flame after dark (the light itself lives in the
        // lightmap + glow passes — this is just the fixture).
        const syT = s * this.camera.yScale;
        return {
          sortY: ty + 0.8,
          drawShadow: () => {
            const baseY = p.y + syT * 0.12;
            this.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.15);
          },
          draw: () => {
            const baseY = p.y + syT * 0.12;
            const lit = this.sky.flame;
            // Stone foot.
            ctx.fillStyle = '#5b5566';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY, s * 0.13, 6, 0.2, 0.6);
            ctx.fill();
            // The post, slightly tapered.
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.03, baseY - s * 0.95);
            ctx.lineTo(p.x - s * 0.03, baseY - s * 0.95);
            ctx.closePath();
            ctx.fill();
            // Lantern cage: chamfered glass box under a peaked cap.
            const ly = baseY - s * 1.12;
            const flick = 0.92 + Math.sin(performance.now() / 90 + tx * 2.3) * 0.05;
            ctx.fillStyle = lit > 0.05 ? `rgba(255, 205, 130, ${(0.45 + 0.55 * lit) * flick})` : '#7d84a0';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.11, ly, s * 0.22, s * 0.24, s * 0.03);
            ctx.fill();
            if (lit > 0.05) {
              // The flame core.
              ctx.fillStyle = `rgba(255, 244, 200, ${0.85 * lit * flick})`;
              ctx.beginPath();
              facetCircle(ctx, p.x, ly + s * 0.12, s * 0.05, 6, Math.PI / 6);
              ctx.fill();
            }
            // Cage bars + cap.
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - s * 0.02, ly, s * 0.04, s * 0.24);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.15, ly);
            ctx.lineTo(p.x + s * 0.15, ly);
            ctx.lineTo(p.x, ly - s * 0.12);
            ctx.closePath();
            ctx.fill();
          },
        };
      }

      case Tile.Fence: {
        // Connected fencing: one post per tile, rails reaching toward
        // every fence/wall neighbor so runs read as continuous built
        // structure — never a row of disconnected pickets.
        const isF = (t2: number | undefined): boolean =>
          t2 === Tile.Fence || t2 === Tile.WallWood || t2 === Tile.WallStone;
        const cn = isF(game.world.groundAt(tx, ty - 1));
        const ce = isF(game.world.groundAt(tx + 1, ty));
        const cs = isF(game.world.groundAt(tx, ty + 1));
        const cw = isF(game.world.groundAt(tx - 1, ty));
        const isolated = !cn && !ce && !cs && !cw;
        const syT = s * this.camera.yScale;
        const postC = '#7a552e';
        const railC = '#94693a';
        return {
          sortY: ty + 0.8,
          drawShadow: () => {
            // The post's thin cast line — fences read by their posts.
            const baseY = p.y + syT * 0.16;
            this.castEdgeQuad(p.x - s * 0.055, baseY, p.x + s * 0.055, baseY, 0.55);
          },
          draw: () => {
            const baseY = p.y + syT * 0.14;
            const postH = 0.54 * s;
            const railT = Math.max(2, s * 0.06);
            // North-south rails: the run marches in depth, so its two
            // rails read as parallel vertical lines through the posts.
            ctx.fillStyle = railC;
            if (cn || cs) {
              const yTop = cn ? p.y - syT * 0.5 : p.y;
              const yBot = cs ? p.y + syT * 0.5 : p.y;
              for (const rx of [-0.085, 0.085]) {
                ctx.fillRect(
                  p.x + rx * s - railT / 2,
                  yTop - postH * 0.52,
                  railT,
                  yBot - yTop,
                );
              }
            }
            // East-west rails: two horizontal bars at fence height.
            if (ce || cw || isolated) {
              const xw = cw || isolated ? p.x - s * 0.5 : p.x;
              const xe = ce || isolated ? p.x + s * 0.5 : p.x;
              ctx.fillRect(xw, baseY - postH * 0.74, xe - xw, railT);
              ctx.fillRect(xw, baseY - postH * 0.4, xe - xw, railT);
            }
            // The post: a chamfer-topped picket with a lit cap.
            ctx.fillStyle = postC;
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.06, baseY - postH, s * 0.12, postH, [s * 0.035, s * 0.035, 0, 0]);
            ctx.fill();
            ctx.fillStyle = shade(postC, 16);
            ctx.fillRect(p.x - s * 0.045, baseY - postH + s * 0.015, s * 0.09, s * 0.045);
          },
        };
      }

      case Tile.Campfire: {
        const flicker = 0.85 + Math.sin(t * 12 + h) * 0.1 + Math.sin(t * 23) * 0.05;
        return {
          sortY: ty + 0.7,
          draw: () => {
            // Faceted stone ring + squared crossed logs.
            ctx.fillStyle = '#6e6879';
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              facetCircle(ctx, p.x + Math.cos(a) * s * 0.3, p.y + Math.sin(a) * s * 0.2 + s * 0.08, s * 0.07, 5, a, 0.72);
              ctx.fill();
            }
            ctx.fillStyle = '#6b4a26';
            for (const rot of [-0.5, 0.6]) {
              ctx.save();
              ctx.translate(p.x, p.y + s * 0.06);
              ctx.rotate(rot);
              ctx.beginPath();
              chamferRect(ctx, -s * 0.22, -s * 0.045, s * 0.44, s * 0.09, s * 0.03);
              ctx.fill();
              ctx.restore();
            }
            // Flame: two flat licks, flickering.
            ctx.fillStyle = '#e8823d';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.14 * flicker, p.y + s * 0.04);
            ctx.quadraticCurveTo(p.x - s * 0.1, p.y - s * 0.3 * flicker, p.x, p.y - s * 0.42 * flicker);
            ctx.quadraticCurveTo(p.x + s * 0.12, p.y - s * 0.26 * flicker, p.x + s * 0.14 * flicker, p.y + s * 0.04);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f2c94c';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.07 * flicker, p.y + s * 0.03);
            ctx.quadraticCurveTo(p.x, p.y - s * 0.18 * flicker, p.x + s * 0.02, p.y - s * 0.22 * flicker);
            ctx.quadraticCurveTo(p.x + s * 0.07, p.y - s * 0.1, p.x + s * 0.07 * flicker, p.y + s * 0.03);
            ctx.closePath();
            ctx.fill();
          },
        };
      }

      case Tile.Furnace: {
        const glow = 0.7 + Math.sin(t * 5) * 0.3;
        return {
          sortY: ty + 1,
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.4, p.y + s * 0.42, p.x + s * 0.4, p.y + s * 0.42, 0.85);
          },
          draw: () => {
            // A kiln block with a chamfered crown — masonry, not dough.
            ctx.fillStyle = '#5b5566';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.4, p.y - s * 0.44, s * 0.8, s * 0.86, [s * 0.24, s * 0.24, s * 0.06, s * 0.06]);
            ctx.fill();
            ctx.fillStyle = '#6e6879';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.34, p.y - s * 0.4, s * 0.68, s * 0.3, [s * 0.16, s * 0.16, s * 0.05, s * 0.05]);
            ctx.fill();
            // Glowing mouth: an arched-hexagon opening.
            ctx.fillStyle = `rgba(232, 108, 45, ${glow})`;
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.18, p.y + s * 0.34);
            ctx.lineTo(p.x - s * 0.18, p.y + s * 0.06);
            ctx.lineTo(p.x - s * 0.09, p.y - s * 0.06);
            ctx.lineTo(p.x + s * 0.09, p.y - s * 0.06);
            ctx.lineTo(p.x + s * 0.18, p.y + s * 0.06);
            ctx.lineTo(p.x + s * 0.18, p.y + s * 0.34);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = `rgba(242, 201, 76, ${glow * 0.8})`;
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y + s * 0.22, s * 0.09, 6, Math.PI / 6);
            ctx.fill();
          },
        };
      }

      case Tile.Anvil:
        return {
          sortY: ty + 0.85,
          drawShadow: () => {
            this.castBlob(p.x, p.y + s * 0.18, 0.42, s * 0.32, tx ^ (ty << 3));
          },
          draw: () => {
            // Base, waist, top with horn.
            ctx.fillStyle = '#4a4554';
            ctx.beginPath();
            ctx.roundRect(p.x - s * 0.22, p.y + s * 0.08, s * 0.44, s * 0.12, s * 0.03);
            ctx.fill();
            ctx.fillRect(p.x - s * 0.1, p.y - s * 0.08, s * 0.2, s * 0.18);
            ctx.fillStyle = '#5f5a6c';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.3, p.y - s * 0.08);
            ctx.lineTo(p.x + s * 0.24, p.y - s * 0.08);
            ctx.quadraticCurveTo(p.x + s * 0.46, p.y - s * 0.1, p.x + s * 0.42, p.y - s * 0.22);
            ctx.quadraticCurveTo(p.x + s * 0.3, p.y - s * 0.22, p.x + s * 0.24, p.y - s * 0.24);
            ctx.lineTo(p.x - s * 0.3, p.y - s * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#767181';
            ctx.fillRect(p.x - s * 0.3, p.y - s * 0.24, s * 0.54, s * 0.05);
          },
        };

      case Tile.Workbench:
        return {
          sortY: ty + 0.9,
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.4, p.y + s * 0.25, p.x + s * 0.4, p.y + s * 0.25, 0.5);
          },
          draw: () => {
            ctx.fillStyle = '#7a552e';
            for (const fx of [-0.32, 0.32]) {
              ctx.fillRect(p.x + fx * s - s * 0.04, p.y - s * 0.05, s * 0.08, s * 0.3);
            }
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.42, p.y - s * 0.2, s * 0.84, s * 0.18, s * 0.04);
            ctx.fill();
            ctx.strokeStyle = 'rgba(58, 40, 22, 0.35)';
            ctx.lineWidth = Math.max(1, s * 0.03);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.38, p.y - s * 0.11);
            ctx.lineTo(p.x + s * 0.38, p.y - s * 0.11);
            ctx.stroke();
            // A little hammer resting on top.
            ctx.save();
            ctx.translate(p.x + s * 0.12, p.y - s * 0.22);
            ctx.rotate(0.5);
            ctx.fillStyle = '#8a6a45';
            ctx.fillRect(-s * 0.02, -s * 0.02, s * 0.2, s * 0.04);
            ctx.fillStyle = '#9aa2ac';
            ctx.fillRect(s * 0.14, -s * 0.07, s * 0.09, s * 0.14);
            ctx.restore();
          },
        };

      case Tile.BankChest:
        return {
          sortY: ty + 0.85,
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.34, p.y + s * 0.28, p.x + s * 0.34, p.y + s * 0.28, 0.5);
          },
          draw: () => {
            // A strongbox: chamfered chest with a peaked, banded lid.
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.34, p.y - s * 0.1, s * 0.68, s * 0.36, s * 0.05);
            ctx.fill();
            ctx.fillStyle = '#94693a';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.36, p.y - s * 0.3, s * 0.72, s * 0.26, [s * 0.09, s * 0.09, s * 0.02, s * 0.02]);
            ctx.fill();
            ctx.strokeStyle = '#d9a441';
            ctx.lineWidth = Math.max(1.5, s * 0.04);
            ctx.strokeRect(p.x - s * 0.3, p.y - s * 0.26, s * 0.6, s * 0.44);
            ctx.fillStyle = '#d9a441';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.06, p.y - s * 0.1, s * 0.12, s * 0.14, s * 0.03);
            ctx.fill();
          },
        };

      case Tile.ShopCounter:
        return {
          sortY: ty + 0.9,
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.42, p.y + s * 0.21, p.x + s * 0.42, p.y + s * 0.21, 0.45);
          },
          draw: () => {
            ctx.fillStyle = '#5e3f1e';
            ctx.fillRect(p.x - s * 0.38, p.y - s * 0.05, s * 0.76, s * 0.26);
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.44, p.y - s * 0.18, s * 0.88, s * 0.16, s * 0.04);
            ctx.fill();
            // Coin and pouch on the counter — faceted chips.
            ctx.fillStyle = '#d9a441';
            ctx.beginPath();
            facetCircle(ctx, p.x + s * 0.18, p.y - s * 0.14, s * 0.06, 6, 0, 0.68);
            ctx.fill();
            ctx.fillStyle = '#8a6a45';
            ctx.beginPath();
            facetCircle(ctx, p.x - s * 0.16, p.y - s * 0.18, s * 0.085, 5, -Math.PI / 2);
            ctx.fill();
          },
        };

      default:
        return { sortY: ty, draw: () => {} };
    }
  }

  // ---------------------------------------------------------- entities

  /**
   * Every body the grass should feel: players and NPCs, own player
   * included. The grass system derives velocities itself (it remembers
   * last positions per id), so this is just who-is-where.
   */
  private collectDisturbers(game: ClientGame): Disturber[] {
    const out: Disturber[] = [];
    const t = game.renderTime();
    for (const [eid, remote] of game.entities) {
      const kind = remote.meta.kind;
      if (kind !== EntityKind.Player && kind !== EntityKind.Npc) continue;
      const s = remote.buffer.sampleAt(t);
      const radius = kind === EntityKind.Npc ? (npcDef(remote.meta.defId ?? '')?.radius ?? 0.3) : 0.3;
      out.push({ id: eid, x: s?.x ?? remote.meta.x, y: s?.y ?? remote.meta.y, r: radius });
    }
    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      out.push({ id: 'own', x: own.x, y: own.y, r: 0.3 });
    }
    return out;
  }

  private collectEntities(game: ClientGame, items: DrawItem[]): void {
    const t = game.renderTime();
    const now = performance.now();

    for (const [eid, remote] of game.entities) {
      const s = remote.buffer.sampleAt(t) ?? {
        x: remote.meta.x,
        y: remote.meta.y,
        dir: 0,
        pose: PoseState.Idle,
        hpPct: 255,
        status: 0,
      };
      const hurt = (remote.hurtUntil ?? 0) > now;
      if (s.status) this.statusAmbience(s.x, s.y, s.status);

      switch (remote.meta.kind) {
        case EntityKind.Player:
          items.push(
            this.humanoidItem({
              eid,
              x: s.x,
              y: s.y,
              dir: s.dir,
              pose: s.pose,
              hpPct: s.hpPct,
              name: remote.meta.name,
              isOwn: false,
              hurt,
              equip: remote.meta.appearance?.equip ?? {},
              color:
                PLAYER_COLORS[hashString(remote.meta.name ?? String(eid)) % PLAYER_COLORS.length]!,
            }),
          );
          break;
        case EntityKind.Npc:
          items.push(this.npcItem(eid, remote.meta.defId ?? '', remote.meta, s, hurt));
          break;
        case EntityKind.ItemDrop:
          items.push(this.dropItem(remote.meta.defId ?? '', s, now));
          break;
        case EntityKind.Projectile:
          items.push(this.projectileItem(remote.meta.defId ?? '', s));
          break;
        case EntityKind.Prop:
          if (remote.meta.defId?.startsWith('summon_')) {
            items.push(this.summonItem(remote.meta.defId, s, now));
          }
          break;
        default:
          break;
      }
    }

    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      if (game.ownStatus) this.statusAmbience(own.x, own.y, game.ownStatus);
      items.push(
        this.humanoidItem({
          eid: 'own',
          x: own.x,
          y: own.y,
          dir: game.aim,
          pose: game.ownPose,
          hpPct: 255,
          name: game.ownName,
          isOwn: true,
          hurt: game.ownHurtUntil > now,
          equip: game.equipment,
          color: PLAYER_COLORS[hashString(game.ownName) % PLAYER_COLORS.length]!,
          drawTOverride: game.ownDrawT,
        }),
      );
    }
  }

  private humanoidItem(e: {
    eid: number | 'own';
    x: number;
    y: number;
    dir: number;
    pose: number;
    name?: string;
    isOwn: boolean;
    color: string;
    hpPct: number;
    hurt?: boolean;
    equip: Partial<Record<string, string>>;
    size?: number;
    skinColor?: string;
    level?: number;
    /** Live local bow-draw charge (own player only). */
    drawTOverride?: number;
  }): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const now = performance.now();
    const anim = this.animFor(e.eid, e.x, e.y, e.pose, now);
    if (!anim.legs) anim.legs = new LegSolver();
    const legPose = anim.legs.update(e.x, e.y, e.dir, this.frameDt);
    const poseT = Math.min(1, (now - anim.poseStartedAt) / 280);
    // Bow draw charge: the local player reads its own live input; remotes
    // charge with time spent in the Draw pose (the server holds it while
    // the string is back).
    const drawT =
      e.drawTOverride !== undefined && e.drawTOverride > 0
        ? e.drawTOverride
        : e.pose === PoseState.Draw
          ? Math.min(1, (now - anim.poseStartedAt) / (DRAW_FULL_TICKS * TICK_MS))
          : 0;

    // Terrain rise: the body rides the ground under it, and each foot
    // rides the ground under ITSELF — that difference is what makes a
    // stair climb read step by step.
    const terrainLift = this.renderLift(e.x, e.y) * s;
    const p = this.camera.worldToScreen(e.x, e.y, this.w, this.h);
    p.y -= terrainLift;
    const feet = legPose.feet.map((f) => {
      const fp = this.camera.worldToScreen(f.x, f.y, this.w, this.h);
      fp.y -= this.renderLift(f.x, f.y) * s;
      return { x: fp.x, y: fp.y, lift: f.lift };
    });

    // Attack lunge: the body rocks back then punches toward the aim
    // while the feet stay planted — the legs lean into the strike.
    let lunge = 0;
    if (e.pose === PoseState.Attack || e.pose === PoseState.Attack2) {
      lunge = poseT < 0.2 ? -0.05 * (poseT / 0.2) : poseT < 0.5 ? -0.05 + 0.21 * ((poseT - 0.2) / 0.3) : 0.16 * (1 - (poseT - 0.5) / 0.5);
    } else if (e.pose === PoseState.Attack3) {
      // Finisher: deep coil, then the whole body rams down the aim.
      lunge =
        poseT < 0.35
          ? -0.09 * (poseT / 0.35)
          : poseT < 0.6
            ? -0.09 + 0.4 * ((poseT - 0.35) / 0.25)
            : 0.31 * (1 - (poseT - 0.6) / 0.4);
    } else if (drawT > 0) {
      lunge = -0.05 * drawT; // braced back against the string
    } else if (e.pose === PoseState.Loose) {
      lunge = -0.07 * Math.max(0, 1 - poseT / 0.4); // release recoil
    } else if (e.pose === PoseState.Cast) {
      lunge = 0.05 * Math.max(0, 1 - poseT / 0.4); // push into the cast
    } else if (e.pose === PoseState.Art) {
      // Weapon Art: a deep plant-and-coil, then the whole body unleashes.
      lunge =
        poseT < 0.3
          ? -0.12 * (poseT / 0.3)
          : 0.26 * (1 - (poseT - 0.3) / 0.7);
    }
    // Gathering: square up to the node and swing the belt tool at it.
    // Crafting: square up to the station and work it.
    let dir = e.dir;
    const gather = e.pose === PoseState.Gather ? this.findGatherNode(e.x, e.y) : null;
    if (gather) dir = Math.atan2(gather.ty + 0.5 - e.y, gather.tx + 0.5 - e.x);
    const station = e.pose === PoseState.Craft ? this.findStation(e.x, e.y) : null;
    if (station) dir = Math.atan2(station.ty + 0.5 - e.y, station.tx + 0.5 - e.x);

    const bodyX = p.x + Math.cos(dir) * lunge * s;
    const bodyY = p.y + Math.sin(dir) * lunge * s;

    return {
      sortY: e.y,
      elevated: terrainLift > 0,
      drawShadow: () => {
        this.castBody(p.x, p.y + s * 0.05, 0.26 * s * (e.size ?? 1));
      },
      draw: () => {
        // Tool impacts: debris flies off the node at each strike beat,
        // timed to the tool's own cycle.
        const toolType = itemDef(e.equip.tool ?? '')?.tool?.type;
        if (gather && gather.kind === 'tree' && toolType === 'axe') {
          const cycle = Math.floor(performance.now() / CHOP_CYCLE_MS);
          const u = (performance.now() % CHOP_CYCLE_MS) / CHOP_CYCLE_MS;
          if (u >= 0.54 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const chipX = gather.tx + 0.5 - Math.cos(dir) * 0.38;
            const chipY = gather.ty + 0.5 - Math.sin(dir) * 0.38;
            this.particles.burst(chipX, chipY, 7, ['#a5793f', '#c9b083', '#8a6a45'], {
              speed: 2.4,
              life: 0.5,
              size: 0.07,
              gravity: 7,
              dir: dir + Math.PI,
              spread: 1.3,
            });
            this.onGatherImpact?.('tree');
          }
        } else if (gather && gather.kind === 'rock' && toolType === 'pickaxe') {
          const cycle = Math.floor(performance.now() / MINE_CYCLE_MS);
          const u = (performance.now() % MINE_CYCLE_MS) / MINE_CYCLE_MS;
          if (u >= 0.54 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const chipX = gather.tx + 0.5 - Math.cos(dir) * 0.42;
            const chipY = gather.ty + 0.5 - Math.sin(dir) * 0.42;
            // Stone chips off the face...
            this.particles.burst(chipX, chipY, 6, ['#c9ccd4', '#9aa2ac', '#847e91'], {
              speed: 2.2,
              life: 0.5,
              size: 0.065,
              gravity: 7,
              dir: dir + Math.PI,
              spread: 1.2,
            });
            // ...plus the metal-on-rock SPARKS that make it mining, in
            // the seam's own color when the rock carries ore.
            const nodeTile = this.game?.world.groundAt(gather.tx, gather.ty);
            const style = nodeTile !== undefined ? Renderer.ORE_STYLES[nodeTile] : undefined;
            this.particles.burst(chipX, chipY, 4, ['#fff3c9', '#ffd77a', style?.nug ?? '#ffe9a8'], {
              speed: 3.4,
              life: 0.24,
              size: 0.04,
              gravity: 4,
              up: true,
              spread: 2,
            });
            this.onGatherImpact?.('rock');
          }
        } else if (station?.kind === 'anvil') {
          const cycle = Math.floor(performance.now() / ANVIL_CYCLE_MS);
          const u = (performance.now() % ANVIL_CYCLE_MS) / ANVIL_CYCLE_MS;
          if (u >= 0.42 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            // Sparks ring off the billet between smith and anvil.
            const sx = e.x + Math.cos(dir) * 0.42;
            const sy = e.y + Math.sin(dir) * 0.42;
            this.particles.burst(sx, sy, 9, ['#fff3c9', '#ffd77a', '#ff9a3d'], {
              speed: 3,
              life: 0.38,
              size: 0.045,
              gravity: 9,
              up: true,
              spread: 2.4,
            });
            this.queueGlow(sx, sy, 0.7, '255, 176, 82', 0.3);
            this.onGatherImpact?.('anvil');
          }
        } else if (station?.kind === 'furnace') {
          const cycle = Math.floor(performance.now() / FURNACE_CYCLE_MS);
          const u = (performance.now() % FURNACE_CYCLE_MS) / FURNACE_CYCLE_MS;
          if (u >= 0.42 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            // The mouth flares and a swarm of embers climbs the draft.
            const fx2 = station.tx + 0.5;
            const fy2 = station.ty + 0.6;
            this.particles.burst(fx2, fy2, 10, ['#ff9e42', '#ffd77a', '#c4553d'], {
              speed: 0.9,
              life: 1.0,
              size: 0.05,
              gravity: -1.6,
              drag: 1.2,
              spread: 1.4,
              dir: -Math.PI / 2,
            });
            this.queueGlow(fx2, fy2, 1.4, '255, 138, 52', 0.4);
            this.onGatherImpact?.('furnace');
          }
        }

        drawHumanoid(ctx, {
          x: bodyX,
          y: bodyY,
          scale: s,
          dir,
          pose: drawT > 0 && e.pose !== PoseState.Loose ? PoseState.Draw : e.pose,
          poseT,
          drawT,
          nowMs: now,
          feet,
          bob: legPose.bob,
          rise: legPose.rise,
          wScale: legPose.wScale,
          poleX: legPose.poleX,
          poleY: legPose.poleY,
          poleStrength: legPose.poleStrength,
          kneeMemory: anim.kneeMemory,
          bodyColor: e.color,
          hurt: e.hurt ?? false,
          isOwn: e.isOwn,
          // During a gather the BELT tool is what's in the hands; at a
          // station the smith's own kit replaces the weapon entirely.
          weaponItem:
            e.pose === PoseState.Craft
              ? undefined
              : e.pose === PoseState.Gather
                ? (e.equip.tool ?? e.equip.weapon)
                : e.equip.weapon,
          bodyItem: e.equip.body,
          size: e.size,
          skinColor: e.skinColor,
          gatherPhase: now / 1000,
          craftKind: station?.kind ?? null,
        });

        const topY = p.y - (1.1 * (e.size ?? 1)) * s;
        if (e.name) {
          ctx.font = `600 ${Math.max(11, s * 0.28)}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          const label = e.level ? `${e.name} (${e.level})` : e.name;
          ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
          ctx.fillText(label, p.x + 1.5, topY + 1.5);
          ctx.fillStyle = e.isOwn ? '#e8b64c' : '#efe3c2';
          ctx.fillText(label, p.x, topY);
        }
        if (e.hpPct < 255) {
          this.drawMiniHp(p.x, topY + s * 0.08, 0.7 * s, e.hpPct);
        }
      },
    };
  }

  private drawMiniHp(x: number, y: number, w: number, hpPct: number): void {
    const ctx = this.ctx;
    // Sharp block gauge — a sliver of the brutalist UI over the world.
    const h = Math.max(3, this.camera.scale * 0.08);
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#54303a';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = '#4fc06a';
    ctx.fillRect(x - w / 2, y, Math.max(2, w * (hpPct / 255)), h);
  }

  private npcItem(
    eid: number,
    defId: string,
    meta: { name?: string; level?: number },
    s: { x: number; y: number; dir: number; hpPct: number; pose: number },
    hurt: boolean,
  ): DrawItem {
    // Humanoid monsters use the full IK rig with size/skin overrides.
    if (defId === 'goblin' || defId.startsWith('skeleton')) {
      const def = npcDef(defId);
      return this.humanoidItem({
        eid,
        x: s.x,
        y: s.y,
        dir: s.dir,
        pose: s.pose,
        hpPct: s.hpPct,
        name: meta.name,
        level: meta.level,
        isOwn: false,
        hurt,
        equip: defId === 'goblin' ? { weapon: 'bronze_sword' } : {},
        color: def?.color ?? '#999',
        skinColor: defId === 'goblin' ? '#7aa74a' : '#e3ddcc',
        size: defId === 'skeleton_champion' ? 1.25 : 0.85,
      });
    }

    const ctx = this.ctx;
    const def = npcDef(defId);
    const scale = this.camera.scale;
    const r = (def?.radius ?? 0.3) * scale;
    const terrainLift = this.renderLift(s.x, s.y) * scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= terrainLift;
    const anim = this.animFor(eid, s.x, s.y, s.pose, performance.now());
    const attackT =
      s.pose === PoseState.Attack
        ? Math.min(1, (performance.now() - anim.poseStartedAt) / 420)
        : 0;
    return {
      sortY: s.y,
      elevated: terrainLift > 0,
      drawShadow: () => {
        this.castBody(p.x, p.y + r * 0.25, r * 1.05);
      },
      draw: () => {
        drawBeast(ctx, {
          x: p.x,
          y: p.y,
          scale,
          dir: s.dir,
          radius: def?.radius ?? 0.3,
          color: def?.color ?? '#999',
          defId,
          walkPhase: anim.walkPhase,
          moving: s.pose === PoseState.Walk,
          hurt,
          attackT,
        });

        if (meta.name) {
          const topY = p.y - r * 2.6;
          ctx.font = `600 ${Math.max(10, scale * 0.24)}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          const label = meta.level ? `${meta.name} (${meta.level})` : meta.name;
          ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
          ctx.fillText(label, p.x + 1.5, topY + 1.5);
          ctx.fillStyle = '#f0cf8a';
          ctx.fillText(label, p.x, topY);
        }
        if (s.hpPct < 255) {
          this.drawMiniHp(p.x, p.y - r * 2.45, r * 2, s.hpPct);
        }
      },
    };
  }

  private dropItem(itemId: string, s: { x: number; y: number }, now: number): DrawItem {
    const ctx = this.ctx;
    const def = itemDef(itemId);
    const scale = this.camera.scale;
    const terrainLift = this.renderLift(s.x, s.y) * scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= terrainLift;
    const bob = Math.sin(now / 320 + s.x * 7) * scale * 0.05;
    const size = scale * 0.3;
    return {
      sortY: s.y - 0.2,
      elevated: terrainLift > 0,
      drawShadow: () => {
        this.castContact(p.x, p.y + scale * 0.08, size * 0.6, size * 0.28);
      },
      draw: () => {
        // A little bundle: chamfered gem-cut diamond in the item's color.
        ctx.save();
        ctx.translate(p.x, p.y - scale * 0.14 + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = def?.color ?? '#ccc';
        ctx.strokeStyle = '#241a2e';
        ctx.lineWidth = Math.max(1.5, scale * 0.04);
        ctx.beginPath();
        chamferRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = shade(def?.color ?? '#cccccc', 26);
        ctx.beginPath();
        chamferRect(ctx, -size / 2 + size * 0.12, -size / 2 + size * 0.12, size * 0.4, size * 0.4, size * 0.12);
        ctx.fill();
        ctx.restore();
      },
    };
  }

  private projectileItem(style: string, s: { x: number; y: number; dir: number }): DrawItem {
    const ctx = this.ctx;
    const scale = this.camera.scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= this.renderLift(s.x, s.y) * scale;
    return {
      sortY: s.y + 10,
      draw: () => {
        if (style === 'magic_heavy') {
          // The heavy orb: fat, slow, unmistakably the payoff beat.
          this.particles.burst(s.x, s.y, 1, ['#b49af0', '#8f76d4', '#efe3ff'], {
            speed: 0.4,
            life: 0.45,
            size: 0.12,
            gravity: 0,
          });
          this.queueGlow(s.x, s.y, 1.5, '180, 154, 240', 0.6);
          ctx.fillStyle = 'rgba(122, 90, 196, 0.4)';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.3, 7, s.dir * 0.5);
          ctx.fill();
          ctx.fillStyle = '#b49af0';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.22, 7, -s.dir * 0.7);
          ctx.fill();
          ctx.fillStyle = '#efe3ff';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.1, 5, s.dir);
          ctx.fill();
          return;
        }
        // Trail: a breadcrumb particle per frame sells the speed.
        if (style === 'magic') {
          this.particles.burst(s.x, s.y, 1, ['#b49af0', '#8f76d4'], {
            speed: 0.15,
            life: 0.3,
            size: 0.07,
            gravity: 0,
          });
        } else {
          this.particles.burst(s.x, s.y, 1, ['rgba(230, 224, 208, 0.5)'], {
            speed: 0.05,
            life: 0.12,
            size: 0.05,
            gravity: 0,
          });
        }
        if (style === 'magic') {
          // A cut shard of magic — faceted, spinning with its heading.
          this.queueGlow(s.x, s.y, 0.85, '180, 154, 240', 0.42);
          ctx.fillStyle = 'rgba(154, 122, 224, 0.35)';
          ctx.beginPath();
          facetCircle(ctx, p.x - Math.cos(s.dir) * scale * 0.18, p.y - Math.sin(s.dir) * scale * 0.18, scale * 0.1, 6, s.dir);
          ctx.fill();
          ctx.fillStyle = '#b49af0';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.12, 6, s.dir);
          ctx.fill();
          ctx.fillStyle = '#efe3ff';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.05, 4, s.dir);
          ctx.fill();
        } else {
          const len = scale * 0.42;
          const fx = Math.cos(s.dir);
          const fy = Math.sin(s.dir);
          ctx.strokeStyle = '#c4b590';
          ctx.lineWidth = Math.max(2, scale * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x - fx * len * 0.5, p.y - fy * len * 0.5);
          ctx.lineTo(p.x + fx * len * 0.4, p.y + fy * len * 0.4);
          ctx.stroke();
          ctx.fillStyle = '#9aa2ac';
          ctx.beginPath();
          ctx.moveTo(p.x + fx * len * 0.55, p.y + fy * len * 0.55);
          ctx.lineTo(p.x + fx * len * 0.3 - fy * scale * 0.05, p.y + fy * len * 0.3 + fx * scale * 0.05);
          ctx.lineTo(p.x + fx * len * 0.3 + fy * scale * 0.05, p.y + fy * len * 0.3 - fx * scale * 0.05);
          ctx.closePath();
          ctx.fill();
        }
      },
    };
  }

  // ----------------------------------------------------- combat fx

  /**
   * Ambient status VFX riding an entity: embers for burn, drifting
   * frost for chill, spark jitter for shock, falling drips for bleed.
   * Spawn rates are frame-time scaled so effect density is fps-stable.
   */
  private statusAmbience(x: number, y: number, bits: number): void {
    const dt = this.frameDt;
    if (bits & STATUS_BIT.burn) {
      this.queueGlow(x, y - 0.3, 0.9, '255, 138, 60', 0.3);
      if (Math.random() < dt * 14) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.4, y - 0.2, 1, ['#ff8a3c', '#e8763c', '#ffd24a'], {
          speed: 0.7,
          life: 0.5,
          size: 0.08,
          gravity: -2.2,
        });
      }
    }
    if (bits & STATUS_BIT.chill) {
      this.queueGlow(x, y - 0.3, 0.8, '138, 196, 232', 0.22);
      if (Math.random() < dt * 8) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.5, y - 0.7, 1, ['#c8ecff', '#8ac4e8'], {
          speed: 0.25,
          life: 0.7,
          size: 0.07,
          gravity: 0.8,
        });
      }
    }
    if (bits & STATUS_BIT.shock) {
      this.queueGlow(x, y - 0.3, 0.9, '232, 224, 106', 0.35);
      if (Math.random() < dt * 22) {
        this.particles.burst(x, y - 0.4, 1, ['#e8e06a', '#fff8c8'], {
          speed: 2.6,
          life: 0.16,
          size: 0.06,
          gravity: 0,
        });
      }
    }
    if (bits & STATUS_BIT.bleed) {
      if (Math.random() < dt * 9) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.3, y - 0.35, 1, ['#c4372a', '#8e2015'], {
          speed: 0.3,
          life: 0.45,
          size: 0.07,
          gravity: 4.5,
        });
      }
    }
  }

  /** Placed summons: totem, snare trap, straw decoy. */
  private summonItem(
    defId: string,
    s: { x: number; y: number; hpPct: number },
    now: number,
  ): DrawItem {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= this.renderLift(s.x, s.y) * sc;
    return {
      sortY: s.y,
      drawShadow: () => {
        this.castContact(p.x, p.y + sc * 0.06, sc * 0.24, sc * 0.1);
      },
      draw: () => {
        if (defId === 'summon_heal_totem') {
          // A carved post crowned with a pulsing green gem.
          const pulse = 0.7 + 0.3 * Math.sin(now / 260);
          this.queueGlow(s.x, s.y - 0.5, 1.5, '122, 196, 122', 0.3 * pulse);
          ctx.fillStyle = '#5d452c';
          ctx.fillRect(p.x - sc * 0.09, p.y - sc * 0.72, sc * 0.18, sc * 0.72);
          ctx.fillStyle = '#6e5233';
          ctx.fillRect(p.x - sc * 0.14, p.y - sc * 0.5, sc * 0.28, sc * 0.1);
          ctx.fillStyle = '#7ac47a';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.82, sc * (0.13 + 0.02 * pulse), 6, now / 900);
          ctx.fill();
          ctx.fillStyle = '#c8f0c8';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.82, sc * 0.055, 4, now / 900);
          ctx.fill();
        } else if (defId === 'summon_snare_trap') {
          // Low and easy to miss — exactly what a trap should be.
          ctx.strokeStyle = 'rgba(160, 138, 74, 0.75)';
          ctx.lineWidth = Math.max(2, sc * 0.05);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - sc * 0.04, sc * 0.3, sc * 0.14, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#8a744a';
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.5;
            const tx = p.x + Math.cos(a) * sc * 0.26;
            const ty = p.y - sc * 0.04 + Math.sin(a) * sc * 0.12;
            ctx.beginPath();
            ctx.moveTo(tx - sc * 0.03, ty);
            ctx.lineTo(tx, ty - sc * 0.12);
            ctx.lineTo(tx + sc * 0.03, ty);
            ctx.closePath();
            ctx.fill();
          }
        } else if (defId === 'summon_decoy') {
          // The straw double, arms out, taking it like a champ.
          ctx.fillStyle = '#5d452c';
          ctx.fillRect(p.x - sc * 0.05, p.y - sc * 0.66, sc * 0.1, sc * 0.66);
          ctx.fillRect(p.x - sc * 0.32, p.y - sc * 0.52, sc * 0.64, sc * 0.08);
          ctx.fillStyle = '#c4a35a';
          ctx.beginPath();
          facetBlob(ctx, p.x, p.y - sc * 0.42, sc * 0.2, 7, 11);
          ctx.fill();
          ctx.fillStyle = '#d9bc78';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.78, sc * 0.15, 6, 0.3);
          ctx.fill();
          if (s.hpPct < 255) this.drawMiniHp(p.x, p.y - sc * 1.05, sc * 0.66, s.hpPct);
        }
      },
    };
  }

  /** Server combat FX: telegraphs, novas, blasts, reactions, summons. */
  private drawCombatFx(game: ClientGame): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const now = performance.now();
    for (let i = game.fx.length - 1; i >= 0; i--) {
      const fx = game.fx[i]! as (typeof game.fx)[number] & { spawned?: boolean };
      const age = now - fx.bornAt;
      const life =
        fx.kind === 'telegraph'
          ? (fx.ticks ?? 12) * TICK_MS
          : fx.kind === 'nova'
            ? 460
            : fx.kind === 'blast'
              ? 420
              : 380;
      if (age > life) {
        game.fx.splice(i, 1);
        continue;
      }
      const t = age / life;
      const p = this.camera.worldToScreen(fx.x, fx.y, this.w, this.h);
      p.y -= this.renderLift(fx.x, fx.y) * sc;
      const color = fx.color ?? '#f4efe4';
      const rPx = fx.radius * sc;
      // Ground circles are drawn in the ground's squashed perspective.
      const squash = 0.62;

      if (fx.kind === 'telegraph') {
        // The danger circle: rim + a filling disc that races the fuse.
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, sc * 0.06);
        ctx.setLineDash([sc * 0.18, sc * 0.12]);
        ctx.lineDashOffset = -now / 30;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx, rPx * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.16 + 0.22 * t;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx * t, rPx * t * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (fx.kind === 'nova' || fx.kind === 'summon') {
        const rr = fx.kind === 'summon' ? rPx * (0.4 + 0.6 * t) : rPx * Math.sqrt(t);
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, sc * 0.09 * (1 - t) + 1);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - t) * 0.25;
        ctx.lineWidth = Math.max(1, sc * 0.03);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rr * 0.82, rr * 0.82 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'blast') {
        if (!fx.spawned) {
          fx.spawned = true;
          this.particles.burst(fx.x, fx.y - 0.2, 20, [color, '#f4efe4'], {
            speed: 3.4,
            life: 0.5,
            up: true,
          });
          this.addRing(fx.x, fx.y, color, fx.radius);
        }
        this.queueGlow(fx.x, fx.y, fx.radius * 1.6 * (1 - t), '255, 178, 92', 0.5 * (1 - t));
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx * (0.6 + 0.4 * t), rPx * (0.6 + 0.4 * t) * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (fx.kind === 'reaction') {
        if (!fx.spawned) fx.spawned = true;
        if (fx.radius > 0) {
          const rr = rPx * Math.sqrt(t);
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.6;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, sc * 0.07);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // ------------------------------------------------------------ overlay

  private drawBuildGhost(): void {
    if (!this.buildGhost) return;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty, this.w, this.h);
    const sy = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty + 1, this.w, this.h).y - p.y;
    p.y -= this.renderLift(this.buildGhost.tx + 0.5, this.buildGhost.ty + 0.5) * s;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = this.buildGhost.color;
    ctx.beginPath();
    chamferRect(ctx, p.x + 1, p.y + 1, s - 2, sy - 2, s * 0.16);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.buildGhost.valid ? '#4fc06a' : '#c4553d';
    ctx.beginPath();
    chamferRect(ctx, p.x + 1, p.y + 1, s - 2, sy - 2, s * 0.16);
    ctx.stroke();
  }

  private drawActionProgress(game: ClientGame): void {
    if (!game.action || game.ownEid === null) return;
    const frac = Math.min(
      1,
      (performance.now() - game.action.startedAt) / Math.max(1, game.action.durationMs),
    );
    const ctx = this.ctx;
    const s = this.camera.scale;
    const own = game.predictor.renderPos();
    const p = this.liftedWTS(own.x, own.y);
    const bw = s * 1.0;
    const bh = Math.max(4, s * 0.1);
    const bx = p.x - bw / 2;
    const by = p.y - s * 1.32;
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#e8b64c';
    ctx.fillRect(bx, by, Math.max(2, bw * frac), bh);
  }

  private drawFloaties(game: ClientGame): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const now = performance.now();
    const LIFE = 850;
    for (let i = game.floaties.length - 1; i >= 0; i--) {
      const f = game.floaties[i]!;
      const age = now - f.bornAt;
      if (age > LIFE) {
        game.floaties.splice(i, 1);
        continue;
      }
      const frac = age / LIFE;
      const p = this.liftedWTS(f.x, f.y - frac * 0.8);
      ctx.globalAlpha = 1 - frac * frac;
      // Pop: numbers land big and settle — impact you can read.
      const pop = 1 + 0.55 * Math.max(0, 1 - age / 130);
      ctx.font = `700 ${Math.max(13, s * 0.38 * (f.sizeMul ?? 1) * pop)}px 'Trebuchet MS', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(24, 14, 32, 0.9)';
      ctx.fillText(f.text, p.x + 2, p.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }

  private drawHpBar(game: ClientGame): void {
    if (game.ownEid === null) return;
    const ctx = this.ctx;
    const bw = Math.min(260, this.w * 0.36);
    const bh = 14;
    const bx = this.w / 2 - bw / 2;
    // Sits just above the hotbar (56px slots + 14px inset).
    const by = this.h - 96;
    // The main vitality gauge: a chamfered block, framed hard.
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.beginPath();
    chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
    ctx.fill();
    ctx.fillStyle = '#54303a';
    ctx.fillRect(bx, by, bw, bh);
    const frac = game.ownHpPct / 255;
    ctx.fillStyle = frac > 0.5 ? '#4fc06a' : frac > 0.25 ? '#e8b64c' : '#c4553d';
    ctx.fillRect(bx, by, Math.max(3, bw * frac), bh);
    ctx.strokeStyle = '#6a4f35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
    ctx.stroke();
  }
}

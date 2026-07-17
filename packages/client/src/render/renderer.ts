import {
  CHUNK_SIZE,
  DRAW_FULL_TICKS,
  EntityKind,
  PoseState,
  TICK_MS,
  TILE_PX,
  Tile,
  hashCoords,
  hashString,
  tileDef,
  type ChunkData,
  type Vec2,
} from '@devcraft/shared';
import { itemDef, npcDef } from '@devcraft/content';
import type { ClientGame } from '../game/clientGame.js';
import { LegSolver, drawBeast, drawHumanoid, shade } from './rig.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { Particles } from './particles.js';
import { bakeChunk, drawLiveGround } from './terrain.js';

/** Signature style: shadows are solid and sharp — never blurred. */
const SHADOW_COLOR = 'rgba(24, 14, 32, 0.32)';
const SHADOW_OFFSET = 0.16; // tiles, toward bottom-right

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

  worldToScreen(wx: number, wy: number, w: number, h: number): Vec2 {
    return {
      x: (wx - this.x) * this.scale + w / 2,
      y: (wy - this.y) * this.scale * this.yScale + h / 2,
    };
  }

  screenToWorld(sx: number, sy: number, w: number, h: number): Vec2 {
    return {
      x: (sx - w / 2) / this.scale + this.x,
      y: (sy - h / 2) / (this.scale * this.yScale) + this.y,
    };
  }
}

interface BakedChunk {
  canvas: HTMLCanvasElement;
  data: ChunkData;
  rev: number;
}

interface DrawItem {
  sortY: number;
  draw: () => void;
  drawShadow?: () => void;
}

export class Renderer {
  readonly camera = new Camera();
  readonly particles = new Particles();
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
            : t === Tile.Rock || t === Tile.RockCopper || t === Tile.RockIron
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

    // The breeze layer: swaying blades, glints, ripples, portal swirls.
    const bounds = this.visibleTileBounds();
    drawLiveGround(
      this.ctx,
      (tx, ty) => game.world.groundAt(tx, ty),
      (tx, ty) => this.detailAt(game, tx, ty),
      bounds,
      (wx, wy) => this.camera.worldToScreen(wx, wy, this.w, this.h),
      this.camera.scale,
      performance.now(),
    );

    this.drawAimGuide(game);

    const items: DrawItem[] = [];
    this.collectRaisedTiles(game, items);
    this.collectFallingTrees(items);
    this.collectEntities(game, items);

    for (const item of items) item.drawShadow?.();
    items.sort((a, b) => a.sortY - b.sortY);
    for (const item of items) item.draw();

    this.drawDeathGhosts();
    this.particles.update(this.frameDt);
    this.particles.draw(
      this.ctx,
      (wx, wy) => this.camera.worldToScreen(wx, wy, this.w, this.h),
      this.camera.scale,
    );
    this.drawRings();

    // Depth & atmosphere: emissive bloom, then the tilted-camera
    // tilt-shift bands, then the grade. HUD stays crisp above them.
    this.drawGlows(game, bounds);
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
   * Emissive bloom: campfires, furnace mouths, portals, and magic bolts
   * pour additive light over the scene. Sold with plain radial
   * gradients under `lighter` compositing — no shader required.
   */
  private drawGlows(game: ClientGame, bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number }): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const t = performance.now() / 1000;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const tile = game.world.groundAt(tx, ty);
        if (tile === Tile.Campfire) {
          const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
          this.glows.push({ x: tx + 0.5, y: ty + 0.32, r: 1.6 * flick, rgb: '235, 140, 52', a: 0.3 * flick });
        } else if (tile === Tile.Furnace) {
          const pulse = 0.8 + Math.sin(t * 5 + tx) * 0.2;
          this.glows.push({ x: tx + 0.5, y: ty + 0.75, r: 1.15, rgb: '232, 108, 45', a: 0.24 * pulse });
        } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
          const pulse = 0.85 + Math.sin(t * 2.2 + tx) * 0.15;
          this.glows.push({ x: tx + 0.5, y: ty + 0.5, r: 1.5 * pulse, rgb: '164, 134, 232', a: 0.26 });
        }
      }
    }
    if (this.glows.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.glows) {
      const p = this.camera.worldToScreen(g.x, g.y, this.w, this.h);
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

  /** A magic projectile advertises its own glow (called during collect). */
  queueGlow(x: number, y: number, r: number, rgb: string, a: number): void {
    this.glows.push({ x, y, r, rgb, a });
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
   * Color grade: warm light from the top of the frame, cool settle at
   * the bottom, plus a quiet corner vignette. Together with tilt-shift
   * this is the "curated camera" over the raw painter output.
   */
  private drawGrade(): void {
    const ctx = this.ctx;
    // Atmospheric haze: the far field washes toward a pale sky at the
    // top of the frame — the horizon you feel from a low camera.
    const sky = ctx.createLinearGradient(0, 0, 0, this.h * 0.34);
    sky.addColorStop(0, 'rgba(190, 205, 235, 0.42)');
    sky.addColorStop(0.5, 'rgba(196, 208, 232, 0.16)');
    sky.addColorStop(1, 'rgba(200, 210, 230, 0)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h * 0.34);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, 'rgba(255, 214, 150, 0.36)');
    grad.addColorStop(0.45, 'rgba(255, 236, 210, 0.1)');
    grad.addColorStop(1, 'rgba(64, 84, 148, 0.3)');
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
    vig.addColorStop(1, 'rgba(20, 12, 28, 0.26)');
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
    const p0 = this.camera.worldToScreen(own.x + dirX * 0.55, own.y + dirY * 0.55, this.w, this.h);
    const p1 = this.camera.worldToScreen(own.x + dirX * rangeT, own.y + dirY * rangeT, this.w, this.h);
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
      const p = this.camera.worldToScreen(g.x, g.y, this.w, this.h);
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
      const p = this.camera.worldToScreen(ring.x, ring.y, this.w, this.h);
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
          baked = {
            canvas: bakeChunk(
              (tx, ty) => game.world.groundAt(tx, ty),
              (tx, ty) => this.detailAt(game, tx, ty),
              cx,
              cy,
              TILE_PX,
            ),
            data,
            rev: data.rev ?? 0,
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
        if (Renderer.WALL_TILES.has(ground)) {
          items.push(this.wallItem(ground as Tile, tx, ty, game));
          continue;
        }
        const def = tileDef(ground);
        if (!def.raised && ground !== Tile.Stump) continue;
        items.push(this.objectItem(ground as Tile, tx, ty, game));
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
    const off = SHADOW_OFFSET * s;
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
            // A body this tall throws a real shadow across the ground.
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            chamferRect(ctx, p.x + off * 1.7, p.y + syT * 0.3 + off, s + 0.5, syT * 0.75, [0, 0, radii[2], radii[3]]);
            ctx.fill();
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
    const along = wx * 0.94 + wy * 0.34; // distance along the wind
    const gust = 0.6 + 0.4 * Math.sin(along * 0.05 - tSec * 0.34);
    const sway =
      0.72 * Math.sin(along * 0.12 - tSec * 1.25) +
      0.28 * Math.sin(along * 0.2 - tSec * 1.9 + 0.7);
    return gust * (0.4 + sway);
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
    const ctx = this.ctx;
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const sp = Renderer.TREE_SPECIES[Renderer.speciesOf(h, oak)]!;
    const rnd = (i: number): number => (hashCoords(7, h & 0xffff, i) % 1000) / 1000;
    const k = (sp.hMin + (sp.hMax - sp.hMin) * rnd(1)) * s;
    const spread = Math.max(...sp.lobes.map((l) => Math.abs(l[0]) + l[2])) * 0.7;
    ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath();
    facetBlob(ctx, bx + SHADOW_OFFSET * s * 1.6, by + syT * 0.3 + SHADOW_OFFSET * s * 0.5, k * spread, h ^ 0x33, 7, 0.4);
    ctx.fill();
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
        draw: () => {
          const ctx = this.ctx;
          const p = this.camera.worldToScreen(cx, cy, this.w, this.h);
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
    const off = SHADOW_OFFSET * s;
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
      case Tile.RockIron:
      case Tile.RockDepleted: {
        const depleted = tile === Tile.RockDepleted;
        const ore = tile === Tile.RockCopper ? '#d08a45' : tile === Tile.RockIron ? '#c2c8d2' : null;
        const size = depleted ? 0.62 : 0.86;
        // Low-poly boulder: jittered hexagon with a lit facet.
        const verts: Array<[number, number]> = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const jr = 0.32 + (((h >> (i * 4)) & 15) / 15) * 0.12;
          verts.push([Math.cos(a) * jr * size, Math.sin(a) * jr * size * 0.8]);
        }
        return {
          sortY: ty + 0.85,
          drawShadow: () => {
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            facetCircle(ctx, p.x + off, p.y + s * 0.14 + off * 0.5, s * 0.42 * size, 7, 0.3, 0.57);
            ctx.fill();
          },
          draw: () => {
            ctx.fillStyle = depleted ? '#575263' : '#6e6879';
            ctx.beginPath();
            verts.forEach(([vx, vy], i) => {
              const x = p.x + vx * s;
              const y = p.y - s * 0.06 + vy * s;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            // Lit facet: top-left half of the polygon.
            ctx.fillStyle = depleted ? '#615c6e' : '#847e91';
            ctx.beginPath();
            ctx.moveTo(p.x + verts[0]![0] * s, p.y - s * 0.06 + verts[0]![1] * s);
            ctx.lineTo(p.x + verts[5]![0] * s, p.y - s * 0.06 + verts[5]![1] * s);
            ctx.lineTo(p.x + verts[4]![0] * s, p.y - s * 0.06 + verts[4]![1] * s);
            ctx.lineTo(p.x, p.y - s * 0.06);
            ctx.closePath();
            ctx.fill();
            if (ore) {
              ctx.fillStyle = ore;
              for (let i = 0; i < 3; i++) {
                const ox = (((h >> (i * 6)) % 40) - 20) / 60;
                const oy = (((h >> (i * 6 + 3)) % 30) - 5) / 80;
                ctx.beginPath();
                ctx.moveTo(p.x + ox * s, p.y + oy * s - s * 0.1);
                ctx.lineTo(p.x + ox * s + s * 0.07, p.y + oy * s - s * 0.02);
                ctx.lineTo(p.x + ox * s - s * 0.05, p.y + oy * s);
                ctx.closePath();
                ctx.fill();
              }
            }
          },
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            facetCircle(ctx, p.x + off * 0.8, p.y + syT * 0.16, s * 0.16, 6, 0.3, 0.5);
            ctx.fill();
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.4 + off, p.y - s * 0.3 + off, s * 0.8, s * 0.72, s * 0.12);
            ctx.fill();
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            facetCircle(ctx, p.x + off, p.y + s * 0.2 + off * 0.5, s * 0.36, 7, 0.3, 0.4);
            ctx.fill();
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.fillRect(p.x - s * 0.4 + off, p.y - s * 0.1 + off, s * 0.8, s * 0.34);
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.34 + off, p.y - s * 0.12 + off, s * 0.68, s * 0.4, s * 0.06);
            ctx.fill();
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
            ctx.fillStyle = SHADOW_COLOR;
            ctx.fillRect(p.x - s * 0.42 + off, p.y - s * 0.05 + off, s * 0.84, s * 0.3);
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
      };
      const hurt = (remote.hurtUntil ?? 0) > now;

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
        default:
          break;
      }
    }

    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
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

    const p = this.camera.worldToScreen(e.x, e.y, this.w, this.h);
    const feet = legPose.feet.map((f) => {
      const fp = this.camera.worldToScreen(f.x, f.y, this.w, this.h);
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
    }
    // Gathering: square up to the node and swing the belt tool at it.
    let dir = e.dir;
    const gather = e.pose === PoseState.Gather ? this.findGatherNode(e.x, e.y) : null;
    if (gather) dir = Math.atan2(gather.ty + 0.5 - e.y, gather.tx + 0.5 - e.x);

    const bodyX = p.x + Math.cos(dir) * lunge * s;
    const bodyY = p.y + Math.sin(dir) * lunge * s;

    return {
      sortY: e.y,
      drawShadow: () => {
        ctx.fillStyle = SHADOW_COLOR;
        ctx.beginPath();
        facetCircle(ctx, p.x + SHADOW_OFFSET * s * 0.7, p.y + s * 0.05, 0.26 * s * (e.size ?? 1), 7, 0.3, 0.54);
        ctx.fill();
      },
      draw: () => {
        // Tool impacts: chips fly off the node at the strike beat.
        const toolId = e.equip.tool ?? '';
        if (gather && gather.kind !== 'fish' && toolId.includes('axe')) {
          const cycle = Math.floor(performance.now() / 700);
          const u = (performance.now() % 700) / 700;
          if (u >= 0.54 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const chipX = gather.tx + 0.5 - Math.cos(dir) * 0.38;
            const chipY = gather.ty + 0.5 - Math.sin(dir) * 0.38;
            const colors =
              gather.kind === 'tree'
                ? ['#a5793f', '#c9b083', '#8a6a45']
                : ['#c9ccd4', '#9aa2ac', '#847e91'];
            this.particles.burst(chipX, chipY, 7, colors, {
              speed: 2.4,
              life: 0.5,
              size: 0.07,
              gravity: 7,
              dir: dir + Math.PI,
              spread: 1.3,
            });
            this.onGatherImpact?.(gather.kind);
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
          // During a gather the BELT tool is what's in the hands.
          weaponItem:
            e.pose === PoseState.Gather
              ? (e.equip.tool ?? e.equip.weapon)
              : e.equip.weapon,
          bodyItem: e.equip.body,
          size: e.size,
          skinColor: e.skinColor,
          gatherPhase: now / 1000,
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
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    const anim = this.animFor(eid, s.x, s.y, s.pose, performance.now());
    const attackT =
      s.pose === PoseState.Attack
        ? Math.min(1, (performance.now() - anim.poseStartedAt) / 420)
        : 0;
    return {
      sortY: s.y,
      drawShadow: () => {
        ctx.fillStyle = SHADOW_COLOR;
        ctx.beginPath();
        facetCircle(ctx, p.x + SHADOW_OFFSET * scale * 0.7, p.y + r * 0.25, r * 1.15, 7, 0.3, 0.52);
        ctx.fill();
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
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    const bob = Math.sin(now / 320 + s.x * 7) * scale * 0.05;
    const size = scale * 0.3;
    return {
      sortY: s.y - 0.2,
      drawShadow: () => {
        ctx.fillStyle = SHADOW_COLOR;
        ctx.beginPath();
        facetCircle(ctx, p.x + SHADOW_OFFSET * scale * 0.5, p.y + scale * 0.08, size * 0.6, 6, 0.3, 0.5);
        ctx.fill();
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
    return {
      sortY: s.y + 10,
      draw: () => {
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

  // ------------------------------------------------------------ overlay

  private drawBuildGhost(): void {
    if (!this.buildGhost) return;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty, this.w, this.h);
    const sy = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty + 1, this.w, this.h).y - p.y;
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
    const p = this.camera.worldToScreen(own.x, own.y, this.w, this.h);
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
      const p = this.camera.worldToScreen(f.x, f.y - frac * 0.8, this.w, this.h);
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
    const by = this.h - 32;
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

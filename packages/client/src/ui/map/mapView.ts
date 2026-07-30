import {
  CHUNK_SIZE,
  DUNGEON_MIN_Y,
  INTEREST_CHUNK_RADIUS,
  Tile,
  UNDERGROUND_Y,
  dangerAt,
  tileDef,
  type DiscoveryWire,
} from '@arx/shared';
import {
  ROAD_HALF,
  TRAIL_HALF,
  elevationAt,
  generateChunk,
  levelAt,
  moistureAt,
  roadHitAt,
} from '@arx/content';
import type { ClientGame } from '../../game/clientGame.js';
import { FogLayer, parchmentCanvas } from './fog.js';
import {
  drawDiscoveryMarker,
  drawMapLabel,
  drawPartyToken,
  drawPlayerToken,
  drawWaypointFlag,
  partyColor,
} from './markers.js';
import { authoredZoneArt } from './zoneArt.js';

/**
 * THE PLAYER'S CHART — the World Studio's block-baked LOD pipeline
 * (worldView.ts), refitted for play: terrain comes from the shared
 * worldgen keyed by the welcome seed, live streamed chunks overwrite
 * it where the session has real truth (built tiles, POI stamps, the
 * carved underdark), bundled authored-zone art fills the towns, and
 * EVERYTHING renders through the fog — unexplored ground is blank
 * parchment, full stop.
 *
 * Bands: the surface and the dark band chart on the persistent mask;
 * dungeon instances (y >= DUNGEON_MIN_Y) chart on the session mask
 * from streamed chunks only — the client cannot procgen a dungeon,
 * which is exactly the per-run secrecy the design wants.
 */

const BLOCK = 128;
const FINE_SCALE = 1.25;
const MAX_BLOCKS = 512;
const FINE_BUDGET = 1;
const COARSE_BUDGET = 5;

const colorCache = new Map<number, string>();
function tileColor(t: number): string {
  let c = colorCache.get(t);
  if (!c) {
    c = tileDef(t).color;
    colorCache.set(t, c);
  }
  return c;
}

/** Danger tier → overlay wash (index = tier) — the studio's palette. */
const TIER_WASH = [
  'rgba(110, 190, 130, 0.16)',
  'rgba(180, 200, 90, 0.14)',
  'rgba(220, 190, 70, 0.16)',
  'rgba(230, 140, 60, 0.18)',
  'rgba(220, 80, 60, 0.20)',
  'rgba(170, 40, 90, 0.24)',
];

export type MapBand = 'surface' | 'dungeon';

export interface MapPick {
  kind: 'discovery' | 'waypoint';
  d?: DiscoveryWire;
}

export class MapView {
  panX = 0;
  panY = 0;
  /** Pixels per world tile. */
  scale = 3;

  showDanger = false;
  hover: DiscoveryWire | null = null;
  /** Uncharted ground wears the vellum (fullscreen) or nothing (overlay). */
  parchment = true;
  /** Overlay mode: quieter marks, no hover, town labels only. */
  overlay = false;

  private blocks = new Map<string, HTMLCanvasElement | null>();
  private dangerBlocks = new Map<string, HTMLCanvasElement>();
  private dangerRev = 0;
  private lastAnchors: unknown = null;
  private lastWorldVersion = -1;
  private readonly fog = new FogLayer();
  private readonly dungeonFog = new FogLayer();
  private layer: HTMLCanvasElement = document.createElement('canvas');
  private fogCnv: HTMLCanvasElement = document.createElement('canvas');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: ClientGame,
  ) {}

  // ---------------------------------------------------------- camera

  tileAtFloat(mx: number, my: number): { x: number; y: number } {
    return { x: (mx - this.panX) / this.scale, y: (my - this.panY) / this.scale };
  }

  private sx(tx: number): number {
    return this.panX + tx * this.scale;
  }

  private sy(ty: number): number {
    return this.panY + ty * this.scale;
  }

  zoomAt(mx: number, my: number, factor: number): void {
    const before = this.tileAtFloat(mx, my);
    this.scale = Math.min(24, Math.max(0.3, this.scale * factor));
    this.panX = mx - before.x * this.scale;
    this.panY = my - before.y * this.scale;
  }

  centerOn(tx: number, ty: number, scale?: number): void {
    if (scale !== undefined) this.scale = Math.min(24, Math.max(0.3, scale));
    this.panX = this.canvas.clientWidth / 2 - tx * this.scale;
    this.panY = this.canvas.clientHeight / 2 - ty * this.scale;
  }

  /** The band the reader is charting right now. */
  band(): MapBand {
    return this.game.predictor.pos.y >= DUNGEON_MIN_Y ? 'dungeon' : 'surface';
  }

  // ------------------------------------------------------ invalidation

  /** Live chunks moved — drop the fine blocks near the player (the
   * only place streamed data ever changes). */
  private refreshLiveBlocks(): void {
    if (this.game.worldVersion === this.lastWorldVersion) return;
    this.lastWorldVersion = this.game.worldVersion;
    const pos = this.game.predictor.pos;
    const reach = (INTEREST_CHUNK_RADIUS + 1) * CHUNK_SIZE;
    const b0x = Math.floor((pos.x - reach) / BLOCK);
    const b1x = Math.floor((pos.x + reach) / BLOCK);
    const b0y = Math.floor((pos.y - reach) / BLOCK);
    const b1y = Math.floor((pos.y + reach) / BLOCK);
    for (let by = b0y; by <= b1y; by++) {
      for (let bx = b0x; bx <= b1x; bx++) {
        this.blocks.delete(`${bx},${by}:f`);
      }
    }
  }

  // ---------------------------------------------------------- baking

  private probeFill(bx: number, by: number): string {
    const seed = this.game.worldSeed ?? 0;
    const tx = bx * BLOCK + BLOCK / 2;
    const ty = by * BLOCK + BLOCK / 2;
    if (ty >= UNDERGROUND_Y) return tileColor(Tile.CaveWall);
    const e = elevationAt(seed, tx, ty);
    if (e < 0.37) return tileColor(Tile.WaterDeep);
    if (e < 0.4) return tileColor(Tile.Sand);
    if (levelAt(seed, tx, ty) !== 0) return tileColor(Tile.Rock);
    return moistureAt(seed, tx, ty) > 0.62 ? '#3f6b2e' : tileColor(Tile.Grass);
  }

  private bakeCoarse(bx: number, by: number): HTMLCanvasElement {
    const seed = this.game.worldSeed ?? 0;
    const step = 4;
    const n = BLOCK / step;
    const cnv = document.createElement('canvas');
    cnv.width = n;
    cnv.height = n;
    const ctx = cnv.getContext('2d')!;
    const img = ctx.createImageData(n, n);
    const put = (i: number, css: string, shade: number): void => {
      const v = parseInt(css.slice(1), 16);
      img.data[i * 4] = Math.min(255, ((v >> 16) & 0xff) * shade);
      img.data[i * 4 + 1] = Math.min(255, ((v >> 8) & 0xff) * shade);
      img.data[i * 4 + 2] = Math.min(255, (v & 0xff) * shade);
      img.data[i * 4 + 3] = 255;
    };
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const tx = bx * BLOCK + ix * step + step / 2;
        const ty = by * BLOCK + iy * step + step / 2;
        const i = ix + iy * n;
        if (ty >= UNDERGROUND_Y) {
          put(i, tileDef(Tile.CaveWall).color, 1);
          continue;
        }
        const e = elevationAt(seed, tx, ty);
        if (e < 0.37) {
          put(i, tileDef(Tile.WaterDeep).color, 1);
          continue;
        }
        if (e < 0.4) {
          put(i, tileDef(Tile.Sand).color, 1);
          continue;
        }
        const hit = roadHitAt(seed, tx, ty);
        if (hit && hit.dist <= (hit.trail ? TRAIL_HALF : ROAD_HALF) + 0.9) {
          put(i, hit.trail ? tileDef(Tile.Dirt).color : tileDef(Tile.Path).color, 1);
          continue;
        }
        const lv = levelAt(seed, tx, ty);
        if (lv !== 0) {
          put(i, tileDef(Tile.Rock).color, lv > 0 ? 1 + lv * 0.14 : 0.8);
          continue;
        }
        const wet = moistureAt(seed, tx, ty);
        put(i, wet > 0.62 ? '#3f6b2e' : tileDef(Tile.Grass).color, 1);
      }
    }
    ctx.putImageData(img, 0, 0);
    return cnv;
  }

  /**
   * Fine block: one pixel per tile. LIVE chunks are the session's
   * truth and always win; worldgen fills the rest (never in the
   * instance band — a dungeon the stream hasn't shown stays rock).
   */
  private bakeFine(bx: number, by: number): HTMLCanvasElement {
    const seed = this.game.worldSeed ?? 0;
    const cnv = document.createElement('canvas');
    cnv.width = BLOCK;
    cnv.height = BLOCK;
    const ctx = cnv.getContext('2d')!;
    const img = ctx.createImageData(BLOCK, BLOCK);
    const chunksPer = BLOCK / CHUNK_SIZE;
    const c0x = (bx * BLOCK) / CHUNK_SIZE;
    const c0y = (by * BLOCK) / CHUNK_SIZE;
    for (let cy = 0; cy < chunksPer; cy++) {
      for (let cx = 0; cx < chunksPer; cx++) {
        const dungeonBand = (c0y + cy) * CHUNK_SIZE >= DUNGEON_MIN_Y;
        const live = this.game.world.get(c0x + cx, c0y + cy);
        const chunk = live ?? (dungeonBand ? null : generateChunk(seed, c0x + cx, c0y + cy));
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const t = chunk ? chunk.ground[lx + ly * CHUNK_SIZE]! : Tile.CaveWall;
            const lv = chunk?.elev ? chunk.elev[lx + ly * CHUNK_SIZE]! : 0;
            const css = tileColor(t);
            const v = parseInt(css.slice(1), 16);
            const shade = lv > 0 ? 1 + lv * 0.1 : lv < 0 ? 1 + lv * 0.09 : 1;
            const px = cx * CHUNK_SIZE + lx;
            const py = cy * CHUNK_SIZE + ly;
            const i = px + py * BLOCK;
            img.data[i * 4] = Math.min(255, ((v >> 16) & 0xff) * shade);
            img.data[i * 4 + 1] = Math.min(255, ((v >> 8) & 0xff) * shade);
            img.data[i * 4 + 2] = Math.min(255, (v & 0xff) * shade);
            img.data[i * 4 + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return cnv;
  }

  private dangerBlock(bx: number, by: number): HTMLCanvasElement {
    // The anchor list is replaced wholesale when havens change — an
    // identity check is the cheap invalidation.
    if (this.lastAnchors !== this.game.dangerAnchors) {
      this.lastAnchors = this.game.dangerAnchors;
      this.dangerRev++;
      this.dangerBlocks.clear();
    }
    const key = `${bx},${by}:${this.dangerRev}`;
    let cnv = this.dangerBlocks.get(key);
    if (cnv) return cnv;
    const seed = this.game.worldSeed ?? 0;
    const step = 8;
    const n = BLOCK / step;
    cnv = document.createElement('canvas');
    cnv.width = n;
    cnv.height = n;
    const ctx = cnv.getContext('2d')!;
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const tx = bx * BLOCK + ix * step + step / 2;
        const ty = by * BLOCK + iy * step + step / 2;
        if (ty >= UNDERGROUND_Y) continue;
        const tier = dangerAt(seed, tx, ty, this.game.dangerAnchors);
        ctx.fillStyle = TIER_WASH[Math.max(0, Math.min(5, tier))]!;
        ctx.fillRect(ix, iy, 1, 1);
      }
    }
    this.dangerBlocks.set(key, cnv);
    if (this.dangerBlocks.size > 256) {
      const first = this.dangerBlocks.keys().next().value as string;
      this.dangerBlocks.delete(first);
    }
    return cnv;
  }

  // --------------------------------------------------------- render

  render(nowMs: number): void {
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (cw === 0 || ch === 0) return;
    if (this.canvas.width !== Math.round(cw * dpr) || this.canvas.height !== Math.round(ch * dpr)) {
      this.canvas.width = Math.round(cw * dpr);
      this.canvas.height = Math.round(ch * dpr);
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.parchment) {
      // The uncharted sheet under everything.
      ctx.fillStyle = ctx.createPattern(parchmentCanvas(), 'repeat')!;
      ctx.fillRect(0, 0, cw, ch);
    } else {
      // The traveler's glass: uncharted ground simply is not there.
      ctx.clearRect(0, 0, cw, ch);
    }

    this.refreshLiveBlocks();

    // 1. Terrain into the offscreen layer.
    if (this.layer.width !== this.canvas.width || this.layer.height !== this.canvas.height) {
      this.layer.width = this.canvas.width;
      this.layer.height = this.canvas.height;
      this.fogCnv.width = this.canvas.width;
      this.fogCnv.height = this.canvas.height;
    }
    const lctx = this.layer.getContext('2d')!;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, cw, ch);

    const band = this.band();
    const fine = this.scale >= FINE_SCALE || band === 'dungeon';
    const t0 = this.tileAtFloat(0, 0);
    const t1 = this.tileAtFloat(cw, ch);
    const b0x = Math.floor(t0.x / BLOCK);
    const b0y = Math.floor(t0.y / BLOCK);
    const b1x = Math.floor(t1.x / BLOCK);
    const b1y = Math.floor(t1.y / BLOCK);

    let budget = fine ? FINE_BUDGET : COARSE_BUDGET;
    const wanted: Array<{ bx: number; by: number; d: number }> = [];
    for (let by = b0y; by <= b1y; by++) {
      for (let bx = b0x; bx <= b1x; bx++) {
        wanted.push({ bx, by, d: Math.hypot(bx - (b0x + b1x) / 2, by - (b0y + b1y) / 2) });
      }
    }
    wanted.sort((a, b) => a.d - b.d);
    lctx.imageSmoothingEnabled = this.scale < 1;
    for (const { bx, by } of wanted) {
      const key = `${bx},${by}:${fine ? 'f' : 'c'}`;
      let block = this.blocks.get(key);
      if (block === undefined) {
        if (budget > 0) {
          block = fine ? this.bakeFine(bx, by) : this.bakeCoarse(bx, by);
          this.blocks.set(key, block);
          budget--;
          if (this.blocks.size > MAX_BLOCKS) {
            const first = this.blocks.keys().next().value as string;
            this.blocks.delete(first);
          }
        } else {
          block = null;
        }
      }
      const x = this.sx(bx * BLOCK);
      const y = this.sy(by * BLOCK);
      const size = BLOCK * this.scale;
      if (block) {
        lctx.drawImage(block, x, y, size, size);
      } else {
        lctx.fillStyle = this.probeFill(bx, by);
        lctx.fillRect(x, y, size, size);
      }
    }

    // Bundled town art over procgen (live chunks were baked into the
    // fine blocks above and already carry the streamed truth).
    if (band === 'surface') {
      for (const art of authoredZoneArt()) {
        if (art.x + art.w < t0.x || art.x > t1.x || art.y + art.h < t0.y || art.y > t1.y) continue;
        lctx.drawImage(art.canvas, this.sx(art.x), this.sy(art.y), art.w * this.scale, art.h * this.scale);
      }
      if (this.showDanger) {
        for (const { bx, by } of wanted) {
          lctx.drawImage(
            this.dangerBlock(bx, by),
            this.sx(bx * BLOCK),
            this.sy(by * BLOCK),
            BLOCK * this.scale,
            BLOCK * this.scale,
          );
        }
      }
    }

    // 2. THE FOG: charted coverage masks the layer; parchment beneath
    // shows through everywhere the reader has never walked.
    const fctx = this.fogCnv.getContext('2d')!;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, cw, ch);
    const mask = band === 'dungeon' ? this.game.dungeonExplored : this.game.explored;
    const fogLayer = band === 'dungeon' ? this.dungeonFog : this.fog;
    fogLayer.draw(
      fctx,
      mask,
      this.game.chartVersion,
      t0.x,
      t0.y,
      t1.x,
      t1.y,
      (tx) => this.sx(tx),
      (ty) => this.sy(ty),
      this.scale,
    );
    lctx.globalCompositeOperation = 'destination-in';
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.drawImage(this.fogCnv, 0, 0);
    lctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.layer, 0, 0, cw, ch);

    // A whisper of ink where the chart meets the fog: re-draw the
    // coverage at low alpha with 'multiply' just outside the mask
    // edge would cost another pass — the smoothed mask already blooms
    // softly, so the sheet reads hand-shaded for free.

    // 3. Marks over everything — a place once found is never lost to
    // the fog, even when its ground has gone parchment-blank.
    if (band === 'surface') {
      const markerR = this.overlay ? 6.5 : Math.max(7, Math.min(13, this.scale * 2.4));
      for (const d of this.game.discoveries.values()) {
        const x = this.sx(d.x + 0.5);
        const y = this.sy(d.y + 0.5);
        if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
        drawDiscoveryMarker(ctx, d, x, y, markerR, this.hover?.id === d.id);
        const showLabel = this.overlay
          ? d.kind === 'town'
          : this.hover?.id === d.id || (d.kind === 'town' && this.scale >= 0.9) || this.scale >= 5;
        if (showLabel) {
          const size = d.kind === 'town' ? 13 : 11.5;
          drawMapLabel(ctx, x, y - markerR - 4, d.faded ? `${d.name}?` : d.name, d.faded ? '#9a8f78' : '#ece4d0', size);
        }
      }
    }

    const wp = this.game.waypoint;
    if (wp && band === 'surface') {
      const pulse = (nowMs % 1600) / 1600;
      drawWaypointFlag(ctx, this.sx(wp.x + 0.5), this.sy(wp.y + 0.5), Math.max(7, Math.min(12, this.scale * 2.2)), pulse);
    }

    // Party members — kin-dots in identity ink, drawn under the
    // reader's own token. Positions ride the slow partypos ticker, so
    // a dot is a bearing, not a bootprint.
    for (const f of this.game.partyFellowsPlaced()) {
      const inBandF = band === 'dungeon' ? f.y >= DUNGEON_MIN_Y : f.y < DUNGEON_MIN_Y;
      if (!inBandF) continue;
      const x = this.sx(f.x);
      const y = this.sy(f.y);
      if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
      const pr = this.overlay ? 4.5 : Math.max(4.5, Math.min(8, this.scale * 1.5));
      drawPartyToken(ctx, x, y, pr, partyColor(f.name));
      if (!this.overlay && this.scale >= 1.2) drawMapLabel(ctx, x, y - pr - 4, f.name, '#cfe7f2', 11);
    }

    const pos = this.game.predictor.pos;
    const inBand = band === 'dungeon' ? pos.y >= DUNGEON_MIN_Y : pos.y < DUNGEON_MIN_Y;
    if (inBand) {
      drawPlayerToken(ctx, this.sx(pos.x), this.sy(pos.y), Math.max(5, Math.min(9, this.scale * 1.6)), this.game.aim);
    }
  }

  // ----------------------------------------------------------- pick

  pick(mx: number, my: number): MapPick | null {
    if (this.band() !== 'surface') return null;
    const wp = this.game.waypoint;
    if (wp && Math.hypot(mx - this.sx(wp.x + 0.5), my - this.sy(wp.y + 0.5)) <= 14) {
      return { kind: 'waypoint' };
    }
    let best: { d: DiscoveryWire; dist: number } | null = null;
    for (const d of this.game.discoveries.values()) {
      const dist = Math.hypot(mx - this.sx(d.x + 0.5), my - this.sy(d.y + 0.5));
      if (dist <= 14 && (!best || dist < best.dist)) best = { d, dist };
    }
    return best ? { kind: 'discovery', d: best.d } : null;
  }
}

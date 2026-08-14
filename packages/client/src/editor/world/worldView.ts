import { CHUNK_SIZE, Tile, dangerAt, tileDef } from '@arx/shared';
import {
  ROAD_HALF,
  TRAIL_HALF,
  base64ToI8,
  base64ToU16,
  elevationAt,
  generateChunk,
  levelAt,
  moistureAt,
  roadHitAt,
  territoryAt,
  type ZoneJson,
} from '@arx/content';
import { fetchZone } from '../api.js';
import { sameSel, type WorldSel, type WorldState } from './worldState.js';

/**
 * THE WORLD VIEW — the whole plan on one canvas, rendered through the
 * REAL worldgen (the true-preview law at continental scale). The
 * editor bundle carries its own live geography registry, so the draft
 * previews honestly: drop a waypoint and the very carve the server
 * would cut appears under it.
 *
 * Terrain arrives as baked BLOCKS (128 tiles square) at two levels of
 * detail — fine blocks run generateChunk tile-for-tile, coarse blocks
 * sample the field classifier every fourth tile — filled in under a
 * per-frame budget (the chunk-bake law) with flat single-probe fills
 * standing in while the queue drains. Authored zones draw their OWN
 * ground bitmaps over the procedural floor: the world map shows the
 * real towns, not their footprints.
 */

const BLOCK = 128;
/** Fine LOD below this scale is wasted work — the classifier reads the same. */
const FINE_SCALE = 1.25;
const MAX_BLOCKS = 512;
const FINE_BUDGET = 1;
const COARSE_BUDGET = 5;

/** Tile id → css color, decoded once (the minimap's LUT law). */
const colorCache = new Map<number, string>();
function tileColor(t: number): string {
  let c = colorCache.get(t);
  if (!c) {
    c = tileDef(t).color;
    colorCache.set(t, c);
  }
  return c;
}

/** Danger tier → overlay wash (index = tier). */
const TIER_WASH = [
  'rgba(110, 190, 130, 0.16)',
  'rgba(180, 200, 90, 0.14)',
  'rgba(220, 190, 70, 0.16)',
  'rgba(230, 140, 60, 0.18)',
  'rgba(220, 80, 60, 0.20)',
  'rgba(170, 40, 90, 0.24)',
];

export interface PickHit {
  sel: WorldSel;
  /** Gesture affordance under the cursor, beyond plain selection. */
  handle?: 'radius' | 'corner' | 'segment';
  /** For 'corner': which one (0 nw, 1 ne, 2 se, 3 sw). */
  corner?: 0 | 1 | 2 | 3;
  /** For route segment hits: insert-after index. */
  segIdx?: number;
}

interface ZoneArt {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class WorldView {
  panX = 0;
  panY = 0;
  /** Pixels per world tile. */
  scale = 1;

  /** Bumped when the draft changes terrain inputs — blocks rebake. */
  private terrainRev = 0;
  private blocks = new Map<string, HTMLCanvasElement | null>();
  private bakeQueue: string[] = [];
  private zoneArt = new Map<string, ZoneArt | 'loading' | 'failed'>();
  private dangerRev = 0;
  private dangerBlocks = new Map<string, HTMLCanvasElement>();
  /** THE COUNTRY wash cache (Phase 6) — seed + atlas only, no drafts. */
  private territoryRev = 0;
  private territoryBlocks = new Map<string, HTMLCanvasElement>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ws: WorldState,
  ) {}

  // ---------------------------------------------------------- camera

  tileAtFloat(mx: number, my: number): { x: number; y: number } {
    return { x: (mx - this.panX) / this.scale, y: (my - this.panY) / this.scale };
  }

  tileAt(mx: number, my: number): { x: number; y: number } {
    const p = this.tileAtFloat(mx, my);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
  }

  private sx(tx: number): number {
    return this.panX + tx * this.scale;
  }

  private sy(ty: number): number {
    return this.panY + ty * this.scale;
  }

  zoomAt(mx: number, my: number, factor: number): void {
    const before = this.tileAtFloat(mx, my);
    this.scale = Math.min(48, Math.max(0.18, this.scale * factor));
    this.panX = mx - before.x * this.scale;
    this.panY = my - before.y * this.scale;
  }

  centerOn(tx: number, ty: number, scale?: number): void {
    if (scale !== undefined) this.scale = Math.min(48, Math.max(0.18, scale));
    this.panX = this.canvas.clientWidth / 2 - tx * this.scale;
    this.panY = this.canvas.clientHeight / 2 - ty * this.scale;
  }

  /** Frame the whole plan: every zone, route, and site, with air. */
  fitWorld(): void {
    const geo = this.ws.geo;
    let x0 = -128;
    let y0 = -128;
    let x1 = 128;
    let y1 = 128;
    const grow = (x: number, y: number): void => {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    };
    for (const z of this.ws.zones) {
      if (z.origin.y >= 512) continue; // the dark band skews the frame
      grow(z.origin.x, z.origin.y);
      grow(z.origin.x + z.width, z.origin.y + z.height);
    }
    if (geo) {
      for (const r of geo.routes) for (const p of r.pts) grow(p.x, p.y);
      for (const s of geo.sites) {
        if (s.x !== undefined) grow(s.x, s.y!);
      }
      for (const p of geo.planned) {
        grow(p.x, p.y);
        grow(p.x + p.w, p.y + p.h);
      }
    }
    const pad = 48;
    const w = x1 - x0 + pad * 2;
    const h = y1 - y0 + pad * 2;
    this.scale = Math.min(
      48,
      Math.max(0.18, Math.min(this.canvas.clientWidth / w, this.canvas.clientHeight / h)),
    );
    this.centerOn((x0 + x1) / 2, (y0 + y1) / 2);
  }

  // ------------------------------------------------------ invalidation

  /** The draft changed a terrain input (roads/landforms/aprons). */
  invalidateTerrain(): void {
    this.terrainRev++;
    this.blocks.clear();
    this.bakeQueue.length = 0;
    this.dangerBlocks.clear();
  }

  /** The draft changed the anchor list — danger wash only. */
  invalidateDanger(): void {
    this.dangerRev++;
    this.dangerBlocks.clear();
  }

  /**
   * The atlas changed (snapshot adopt) — territory wash only. The
   * country field reads seed + family roster, never the draft, so
   * this stays OFF the danger/terrain invalidation paths.
   */
  invalidateTerritory(): void {
    this.territoryRev++;
    this.territoryBlocks.clear();
  }

  /** A zone's tiles changed (save/adopt) — refetch its art. */
  invalidateZone(id: string): void {
    this.zoneArt.delete(id);
  }

  invalidateAllZones(): void {
    this.zoneArt.clear();
  }

  // ---------------------------------------------------------- baking

  private blockKey(bx: number, by: number, fine: boolean): string {
    return `${bx},${by}:${fine ? 'f' : 'c'}:${this.terrainRev}`;
  }

  /** A cheap one-probe fill for blocks still in the bake queue. */
  private probeFill(bx: number, by: number): string {
    const tx = bx * BLOCK + BLOCK / 2;
    const ty = by * BLOCK + BLOCK / 2;
    if (ty >= 512) return tileColor(Tile.CaveWall);
    const e = elevationAt(this.ws.seed, tx, ty);
    if (e < 0.37) return tileColor(Tile.WaterDeep);
    if (e < 0.4) return tileColor(Tile.Sand);
    if (levelAt(this.ws.seed, tx, ty) !== 0) return tileColor(Tile.Rock);
    return moistureAt(this.ws.seed, tx, ty) > 0.62 ? '#3f6b2e' : tileColor(Tile.Grass);
  }

  /** Coarse block: the field classifier every 4th tile, render-honest. */
  private bakeCoarse(bx: number, by: number): HTMLCanvasElement {
    const seed = this.ws.seed;
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
        if (ty >= 512) {
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
        // The carve previews at every zoom — roads are the plan's veins.
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

  /** Fine block: the REAL generateChunk, one pixel per tile. */
  private bakeFine(bx: number, by: number): HTMLCanvasElement {
    const seed = this.ws.seed;
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
        const chunk = generateChunk(seed, c0x + cx, c0y + cy);
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const t = chunk.ground[lx + ly * CHUNK_SIZE]!;
            const lv = chunk.elev ? chunk.elev[lx + ly * CHUNK_SIZE]! : 0;
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

  /** One pixel per tile of a zone's authored ground (+elev shade). */
  private buildZoneArt(id: string, json: ZoneJson): void {
    try {
      const w = json.width;
      const h = json.height;
      const ground = base64ToU16(json.ground, w * h);
      const elev = json.elev ? base64ToI8(json.elev, w * h) : null;
      const cnv = document.createElement('canvas');
      cnv.width = w;
      cnv.height = h;
      const ctx = cnv.getContext('2d')!;
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        // TILE_SKIP cells keep the procedural ground — they must stay
        // transparent so the terrain baked beneath shows through.
        if (ground[i] === 0xffff) continue;
        const css = tileColor(ground[i]!);
        const v = parseInt(css.slice(1), 16);
        const lv = elev ? elev[i]! : 0;
        const shade = lv > 0 ? 1 + lv * 0.1 : lv < 0 ? 1 + lv * 0.09 : 1;
        img.data[i * 4] = Math.min(255, ((v >> 16) & 0xff) * shade);
        img.data[i * 4 + 1] = Math.min(255, ((v >> 8) & 0xff) * shade);
        img.data[i * 4 + 2] = Math.min(255, (v & 0xff) * shade);
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      this.zoneArt.set(id, { canvas: cnv, x: json.origin.x, y: json.origin.y, w, h });
    } catch {
      this.zoneArt.set(id, 'failed');
    }
  }

  private requestZoneArt(id: string): void {
    if (this.zoneArt.has(id)) return;
    this.zoneArt.set(id, 'loading');
    fetchZone(id)
      .then((json) => this.buildZoneArt(id, json))
      .catch(() => this.zoneArt.set(id, 'failed'));
  }

  /**
   * A zone's ground art as a data URL — the Open browser's thumbs
   * ride the same cache the map draws from.
   */
  async thumbUrl(id: string): Promise<string | null> {
    let art = this.zoneArt.get(id);
    if (art === undefined || art === 'loading') {
      try {
        const json = await fetchZone(id);
        this.buildZoneArt(id, json);
      } catch {
        this.zoneArt.set(id, 'failed');
      }
      art = this.zoneArt.get(id);
    }
    return art && art !== 'loading' && art !== 'failed' ? art.canvas.toDataURL() : null;
  }

  private dangerBlock(bx: number, by: number): HTMLCanvasElement {
    const key = `${bx},${by}:${this.dangerRev}`;
    let cnv = this.dangerBlocks.get(key);
    if (cnv) return cnv;
    const geo = this.ws.geo;
    // The live field: settled anchors PLUS every haven lamp the
    // frontier ledger keeps burning (the server's dangerAnchors law).
    const havens = this.ws.cells.flatMap((c) => {
      if (!c.site) return [];
      const safeR = this.ws.poiDefs.find((d) => d.id === c.site!.defId)?.haven;
      return safeR
        ? [{ x: c.site.anchorX, y: c.site.anchorY, safeR, haven: true as const }]
        : [];
    });
    const anchors = geo ? [...geo.anchors, ...havens] : havens;
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
        if (ty >= 512) continue;
        const tier = dangerAt(this.ws.seed, tx, ty, anchors);
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

  /**
   * THE COUNTRY wash block (Phase 6): one territoryAt sample per
   * 16-tile square (the field's 384-tile countries need no finer),
   * inked per family — the same pure field every lean reads.
   */
  private territoryBlock(bx: number, by: number): HTMLCanvasElement {
    const key = `${bx},${by}:${this.territoryRev}`;
    let cnv = this.territoryBlocks.get(key);
    if (cnv) return cnv;
    const families = this.ws.families;
    const step = 16;
    const n = BLOCK / step;
    cnv = document.createElement('canvas');
    cnv.width = n;
    cnv.height = n;
    const ctx = cnv.getContext('2d')!;
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const tx = bx * BLOCK + ix * step + step / 2;
        const ty = by * BLOCK + iy * step + step / 2;
        if (ty >= 512) continue;
        const fam = territoryAt(this.ws.seed, tx, ty, families);
        if (fam === null) continue;
        ctx.fillStyle = WorldView.TERRITORY_INK[fam] ?? 'rgba(150, 150, 150, 0.12)';
        ctx.fillRect(ix, iy, 1, 1);
      }
    }
    this.territoryBlocks.set(key, cnv);
    if (this.territoryBlocks.size > 256) {
      const first = this.territoryBlocks.keys().next().value as string;
      this.territoryBlocks.delete(first);
    }
    return cnv;
  }

  /** Family → the country wash ink (unrostered families get grey). */
  private static readonly TERRITORY_INK: Record<string, string> = {
    goblin: 'rgba(110, 180, 70, 0.16)',
    brigand: 'rgba(200, 120, 60, 0.16)',
    wolfkin: 'rgba(90, 130, 200, 0.16)',
    kobold: 'rgba(190, 170, 80, 0.16)',
    dead: 'rgba(150, 110, 190, 0.16)',
    gnoll: 'rgba(190, 90, 110, 0.16)',
    ogre: 'rgba(179, 152, 94, 0.16)',
  };

  // --------------------------------------------------------- render

  render(): void {
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(cw * dpr) || this.canvas.height !== Math.round(ch * dpr)) {
      this.canvas.width = Math.round(cw * dpr);
      this.canvas.height = Math.round(ch * dpr);
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#100d18';
    ctx.fillRect(0, 0, cw, ch);

    const fine = this.scale >= FINE_SCALE;
    const t0 = this.tileAtFloat(0, 0);
    const t1 = this.tileAtFloat(cw, ch);
    const b0x = Math.floor(t0.x / BLOCK);
    const b0y = Math.floor(t0.y / BLOCK);
    const b1x = Math.floor(t1.x / BLOCK);
    const b1y = Math.floor(t1.y / BLOCK);

    // Terrain blocks: draw what's baked, queue what isn't, probe-fill
    // the gap. Center-out queue order so the view fills under the eye.
    let budget = fine ? FINE_BUDGET : COARSE_BUDGET;
    const wanted: Array<{ bx: number; by: number; d: number }> = [];
    for (let by = b0y; by <= b1y; by++) {
      for (let bx = b0x; bx <= b1x; bx++) {
        wanted.push({
          bx,
          by,
          d: Math.hypot(bx - (b0x + b1x) / 2, by - (b0y + b1y) / 2),
        });
      }
    }
    wanted.sort((a, b) => a.d - b.d);
    ctx.imageSmoothingEnabled = this.scale < 1;
    for (const { bx, by } of wanted) {
      const key = this.blockKey(bx, by, fine);
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
        ctx.drawImage(block, x, y, size, size);
      } else {
        ctx.fillStyle = this.probeFill(bx, by);
        ctx.fillRect(x, y, size, size);
      }
    }

    // Authored zones wear their real ground (surface zones only —
    // the dark band's galleries belong to their own view).
    if (this.ws.show.zones) {
      for (const z of this.ws.zones) {
        if (z.origin.y >= 512) continue;
        if (
          z.origin.x + z.width < t0.x ||
          z.origin.x > t1.x ||
          z.origin.y + z.height < t0.y ||
          z.origin.y > t1.y
        ) {
          continue;
        }
        const art = this.zoneArt.get(z.id);
        if (art === undefined) this.requestZoneArt(z.id);
        else if (art !== 'loading' && art !== 'failed') {
          ctx.drawImage(
            art.canvas,
            this.sx(art.x),
            this.sy(art.y),
            art.w * this.scale,
            art.h * this.scale,
          );
        }
      }
    }

    // The danger wash — the field the frontier rolls by.
    if (this.ws.show.danger) {
      for (const { bx, by } of wanted) {
        ctx.drawImage(
          this.dangerBlock(bx, by),
          this.sx(bx * BLOCK),
          this.sy(by * BLOCK),
          BLOCK * this.scale,
          BLOCK * this.scale,
        );
      }
    }

    // THE COUNTRY wash — whose land is whose (Phase 6).
    if (this.ws.show.territory) {
      for (const { bx, by } of wanted) {
        ctx.drawImage(
          this.territoryBlock(bx, by),
          this.sx(bx * BLOCK),
          this.sy(by * BLOCK),
          BLOCK * this.scale,
          BLOCK * this.scale,
        );
      }
    }

    this.drawClaimRings(ctx);
    this.drawCapitals(ctx);
    this.drawGrowth(ctx);
    this.drawFamilyLines(ctx);
    this.drawCells(ctx, t0.x, t0.y, t1.x, t1.y);
    this.drawPlanned(ctx);
    this.drawZoneFrames(ctx, t0.x, t0.y, t1.x, t1.y);
    this.drawRoutes(ctx);
    this.drawSites(ctx);
    this.drawAnchors(ctx);
    this.drawStanding(ctx);
    this.drawRouteDraft(ctx);
  }

  /** Faction id → the lens's ink. Unrostered ids get the road grey. */
  private static readonly FACTION_INK: Record<string, string> = {
    fordgate: '217, 138, 61',
    crown: '143, 168, 214',
    waykeepers: '127, 176, 105',
    rookery: '155, 111, 176',
    reavers: '200, 72, 62',
  };

  /**
   * THE STANDING LENS (factions Phase 6): the living map learns
   * politics — every faction's marches drawn at the honest radius
   * (the SAME marchTiles factionForPlace reads at deed time), and
   * every fine counter marked at its live post (⚖ — the road back,
   * which is also where the Company's envoy sits). Road factions hold
   * no ground; their name is the space between the circles.
   */
  private drawStanding(ctx: CanvasRenderingContext2D): void {
    if (!this.ws.show.standing) return;
    const doc = this.ws.factions;
    if (!doc) return;
    const inkOf = (id: string): string =>
      WorldView.FACTION_INK[id] ?? '160, 160, 160';
    for (const f of doc.roster) {
      const ink = inkOf(f.id);
      for (const a of f.anchors) {
        const x = this.sx(a.x);
        const y = this.sy(a.y);
        const r = this.ws.marchTiles * this.scale;
        if (x < -r || y < -r || x > this.canvas.clientWidth + r || y > this.canvas.clientHeight + r) {
          continue;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ink}, 0.07)`;
        ctx.fill();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = `rgba(${ink}, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        this.label(ctx, x, y - r - 2, f.name, `rgb(${ink})`);
      }
      // The fine counter, at its LIVE post — the one door back in.
      if (f.fineActor) {
        const post = this.ws.actorSites.find((s) => s.actor === f.fineActor);
        if (post) {
          const x = this.sx(post.x);
          const y = this.sy(post.y);
          ctx.beginPath();
          ctx.moveTo(x, y - 5);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x - 5, y);
          ctx.closePath();
          ctx.fillStyle = `rgb(${ink})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(16, 13, 24, 0.85)';
          ctx.lineWidth = 1;
          ctx.stroke();
          if (this.scale >= 0.5) {
            this.label(ctx, x, y - 7, `⚖ ${f.fineActor}`, `rgb(${ink})`);
          }
        }
      }
    }
  }

  /**
   * THE FORESTER'S GLASS (second-growth Phase 6): every wild harvest
   * still healing, drawn at its own tile, aged by ink — the regrowth
   * wave visible on the map. Scar = the cut's dark mark, bare = a
   * hollow ring (dormant, waiting on the world), a seeded tile fills
   * amber, the sapling stands green, and a drifted crown reads violet
   * (the ledger IS the tree). Sown ground wears a ring — the
   * gardener's mark.
   */
  private drawGrowth(ctx: CanvasRenderingContext2D): void {
    if (!this.ws.show.growth) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    for (const g of this.ws.growth) {
      const x = this.sx(g.tx + 0.5);
      const y = this.sy(g.ty + 0.5);
      if (x < -6 || y < -6 || x > w + 6 || y > h + 6) continue;
      const seeded = g.state === 1 && g.due !== null;
      const color =
        g.state === 0
          ? '#8a6a45'
          : g.state === 2
            ? '#6da24f'
            : g.state === 3
              ? g.dialect === 'sealed'
                ? '#8d8798'
                : '#a98fd6'
              : seeded
                ? '#d9a84c'
                : '#bdb49f';
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      if (g.state === 1 && !seeded) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }
      if (g.sown) {
        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(217, 168, 76, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  /**
   * THE CLAIMED YARDS lens (Phase 6): every claim ring drawn honest —
   * the exclusion mask exactly as the spawn paths read it, never a
   * danger wash (rings calm nothing; they only refuse ground).
   */
  private drawClaimRings(ctx: CanvasRenderingContext2D): void {
    if (!this.ws.show.rings) return;
    for (const ring of this.ws.claimRings) {
      const x = this.sx(ring.x);
      const y = this.sy(ring.y);
      const r = ring.r * this.scale;
      if (x < -r || y < -r || x > this.canvas.clientWidth + r || y > this.canvas.clientHeight + r) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(111, 178, 217, 0.08)';
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(111, 178, 217, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // The hearth itself: a small house-dot at the bed.
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6fb2d9';
      ctx.fill();
    }
  }

  /**
   * THE CAPITALS (strongholds Phase 6): every known seat drawn as the
   * landmark it is — the biggest diamond on the map, family-colored,
   * with the ONE-CELL DEBT's mask washed under it and the lifecycle
   * spoken in the poi dialect (ember dashed, fallow hollow).
   */
  private drawCapitals(ctx: CanvasRenderingContext2D): void {
    if (!this.ws.show.capitals) return;
    const FAMILY_INK: Record<string, string> = {
      goblin: '#6fae4a',
      brigand: '#c2703e',
      wolfkin: '#8a94a8',
      gnoll: '#c9a34c',
      dead: '#9a7fc9',
      ogre: '#b3985e',
    };
    for (const cap of this.ws.capitals) {
      const x = this.sx(cap.x);
      const y = this.sy(cap.y);
      if (x < -80 || y < -80 || x > this.canvas.clientWidth + 80 || y > this.canvas.clientHeight + 80) {
        continue;
      }
      const ink = FAMILY_INK[cap.family ?? ''] ?? '#d9c7a0';
      // The mask wash: the ground the capital claims from the layers.
      const half = (120 / 2 + 24) * this.scale;
      ctx.fillStyle = 'rgba(217, 164, 65, 0.05)';
      ctx.fillRect(x - half, y - half, half * 2, half * 2);
      const r = 9; // the biggest diamond the map draws — a landmark
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      if (cap.state === 'fallow') {
        ctx.setLineDash([]);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.5;
        ctx.stroke(); // hollow ghost: the seat rests
      } else {
        ctx.fillStyle = ink;
        ctx.fill();
        if (cap.state === 'ember' || cap.state === 'broken') {
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#e8823d';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      // Stage pips under the diamond (the chart's own dialect).
      for (let i = 0; i < cap.stage; i++) {
        ctx.fillStyle = ink;
        ctx.fillRect(x - 6 + i * 5, y + r + 3, 3, 2);
      }
      // Broken-ward ticks over it: the chapters already taken.
      let broken = 0;
      for (let b = cap.wardsCleared; b > 0; b >>= 1) broken += b & 1;
      for (let i = 0; i < Math.min(broken, 9); i++) {
        ctx.fillStyle = '#e8d44c';
        ctx.fillRect(x - 10 + i * 3, y - r - 5, 2, 3);
      }
    }
  }

  /**
   * THE FAMILY LINES (Phase 6): every satellite and toll drawn tied to
   * its core — the source-and-kill-switch made visible. Hearth-tied
   * squats (origin `hearth:<id>`) key on no cell and draw no line.
   */
  private drawFamilyLines(ctx: CanvasRenderingContext2D): void {
    if (!this.ws.show.cells) return;
    for (const c of this.ws.cells) {
      if (!c.site || !c.originCell || c.originCell.startsWith('hearth:')) continue;
      const comma = c.originCell.indexOf(',');
      const ocx = Number(c.originCell.slice(0, comma));
      const ocy = Number(c.originCell.slice(comma + 1));
      const core = this.ws.cellAt(ocx, ocy);
      if (!core?.site) continue;
      ctx.beginPath();
      ctx.moveTo(this.sx(core.site.anchorX), this.sy(core.site.anchorY));
      ctx.lineTo(this.sx(c.site.anchorX), this.sy(c.site.anchorY));
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle =
        c.site.defId === 'road_toll' ? 'rgba(217, 111, 111, 0.6)' : 'rgba(217, 176, 108, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private isSel(sel: WorldSel): boolean {
    return sameSel(this.ws.sel, sel);
  }

  private isHover(sel: WorldSel): boolean {
    return sameSel(this.ws.hover, sel);
  }

  private drawCells(
    ctx: CanvasRenderingContext2D,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
  ): void {
    if (!this.ws.show.cells) return;
    const cell = this.ws.poiCell;
    // The macro grid only past a readable zoom-out.
    if (this.scale * cell >= 26) {
      ctx.strokeStyle = 'rgba(236, 228, 208, 0.07)';
      ctx.lineWidth = 1;
      for (let cx = Math.floor(tx0 / cell); cx <= Math.floor(tx1 / cell); cx++) {
        ctx.beginPath();
        ctx.moveTo(this.sx(cx * cell), 0);
        ctx.lineTo(this.sx(cx * cell), this.canvas.clientHeight);
        ctx.stroke();
      }
      for (let cy = Math.floor(ty0 / cell); cy <= Math.floor(ty1 / cell); cy++) {
        ctx.beginPath();
        ctx.moveTo(0, this.sy(cy * cell));
        ctx.lineTo(this.canvas.clientWidth, this.sy(cy * cell));
        ctx.stroke();
      }
    }
    const now = Date.now();
    for (const c of this.ws.cells) {
      if (!c.site) {
        // A resting fallow cell: a faint hollow diamond at the cell's
        // center — the meadow healing, readable at a glance.
        if (c.fallowUntil !== null && c.fallowUntil > now) {
          const fx = this.sx(c.cellX * cell + cell / 2);
          const fy = this.sy(c.cellY * cell + cell / 2);
          if (fx > -20 && fy > -20 && fx < this.canvas.clientWidth + 20 && fy < this.canvas.clientHeight + 20) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 4);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(138, 127, 106, 0.55)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }
        }
        continue;
      }
      const x = this.sx(c.site.anchorX);
      const y = this.sy(c.site.anchorY);
      if (x < -40 || y < -40 || x > this.canvas.clientWidth + 40 || y > this.canvas.clientHeight + 40) {
        continue;
      }
      const sel: WorldSel = { kind: 'cell', cx: c.cellX, cy: c.cellY };
      const standing = c.zoneId !== null;
      const cleared = c.clearedAt !== null;
      const embering = c.emberUntil !== null;
      const friendly = c.site.defId === 'peddler_rest';
      const color = c.authoredId
        ? '#f2c94c'
        : cleared
          ? '#8a7f6a'
          : friendly
            ? '#6fb2d9'
            : standing
              ? '#6fbf73'
              : '#d9b06c';
      ctx.save();
      ctx.translate(x, y);
      // THE WAR-GROUND ranks larger: a compound hold is the region's
      // landmark and the map says so at a glance.
      const siteDefId = c.site.defId;
      const isHold = this.ws.poiDefs.find((d) => d.id === siteDefId)?.compound === true;
      const r = (this.isSel(sel) || this.isHover(sel) ? 7 : 5) + (isHold ? 3 : 0);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = standing ? 1 : 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // THE EMBER CLOCK: a dissolving site wears a fading dashed ring.
      if (embering) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 3.5, 0, Math.PI * 2);
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(217, 140, 80, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // THE STAGE PIPS: one tick per boldness rung, under the sigil —
      // the same monoline dialect the players' chart wears.
      if (c.stage > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < c.stage; i++) {
          const px = (i - (c.stage - 1) / 2) * 5;
          ctx.beginPath();
          ctx.moveTo(px, r + 3);
          ctx.lineTo(px, r + 7);
          ctx.stroke();
        }
      }
      // THE SMALL FINDS pips (Phase 6, lens): faint dots under the
      // stage ticks — the Studio sees the texture the chart politely
      // doesn't. Cleared slots go hollow.
      if (this.ws.show.finds && c.finds && c.finds.count > 0) {
        const shown = Math.min(6, c.finds.count);
        for (let i = 0; i < shown; i++) {
          const px = (i - (shown - 1) / 2) * 5;
          const bit = (c.finds.cleared >>> i) & 1;
          ctx.beginPath();
          ctx.arc(px, r + 11, 1.6, 0, Math.PI * 2);
          if (bit) {
            ctx.strokeStyle = 'rgba(190, 180, 160, 0.7)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(190, 180, 160, 0.85)';
            ctx.fill();
          }
        }
      }
      if (this.isSel(sel)) {
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (this.scale >= 0.8 && (this.isHover(sel) || this.isSel(sel))) {
        this.label(ctx, 0, -12, c.defName ?? c.site.defId, color);
      }
      ctx.restore();
    }
  }

  private label(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color = '#ece4d0',
  ): void {
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(16, 13, 24, 0.78)';
    ctx.fillRect(x - w / 2 - 4, y - 14, w + 8, 15);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawPlanned(ctx: CanvasRenderingContext2D): void {
    const geo = this.ws.geo;
    if (!geo) return;
    const zoneIds = new Set(this.ws.zones.map((z) => z.id));
    for (const p of geo.planned) {
      const sel: WorldSel = { kind: 'planned', id: p.id };
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      const w = p.w * this.scale;
      const h = p.h * this.scale;
      const active = this.isSel(sel) || this.isHover(sel);
      const unbuilt = !zoneIds.has(p.id);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = active ? '#f2c94c' : unbuilt ? 'rgba(201, 161, 90, 0.9)' : 'rgba(201, 161, 90, 0.45)';
      ctx.lineWidth = active ? 2 : 1.25;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      if (p.apron) {
        ctx.strokeStyle = 'rgba(201, 161, 90, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 12 * this.scale, y - 12 * this.scale, w + 24 * this.scale, h + 24 * this.scale);
      }
      if (unbuilt && w > 40) {
        this.label(ctx, x + w / 2, y + 14, `${p.name ?? p.id} (planned)`, '#c9a15a');
      }
      if (active) {
        // Corner handles for the resize gesture.
        ctx.fillStyle = '#f2c94c';
        for (const [cx, cy] of [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ]) {
          ctx.fillRect(cx! - 3, cy! - 3, 6, 6);
        }
      }
    }
  }

  private drawZoneFrames(
    ctx: CanvasRenderingContext2D,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
  ): void {
    if (!this.ws.show.zones) return;
    for (const z of this.ws.zones) {
      if (z.origin.y >= 512) continue;
      if (
        z.origin.x + z.width < tx0 ||
        z.origin.x > tx1 ||
        z.origin.y + z.height < ty0 ||
        z.origin.y > ty1
      ) {
        continue;
      }
      const sel: WorldSel = { kind: 'zone', id: z.id };
      const active = this.isSel(sel) || this.isHover(sel);
      const x = this.sx(z.origin.x);
      const y = this.sy(z.origin.y);
      const w = z.width * this.scale;
      const h = z.height * this.scale;
      ctx.strokeStyle = active ? '#f2c94c' : z.poi ? 'rgba(126, 200, 227, 0.45)' : 'rgba(236, 228, 208, 0.55)';
      ctx.lineWidth = active ? 2 : 1.25;
      ctx.strokeRect(x, y, w, h);
      // Frontier sites already wear a cell badge — naming every one
      // buries the map. Towns speak always; sites when addressed.
      if (w > 34 && (!z.poi || active)) {
        this.label(ctx, x + w / 2, y - 3, z.name, active ? '#f2c94c' : '#ece4d0');
      }
    }
  }

  private drawRoutes(ctx: CanvasRenderingContext2D): void {
    const geo = this.ws.geo;
    if (!geo || !this.ws.show.roads) return;
    for (const r of geo.routes) {
      const routeSel: WorldSel = { kind: 'route', route: r.id };
      const active =
        this.isSel(routeSel) ||
        this.isHover(routeSel) ||
        (this.ws.sel?.kind === 'waypoint' && this.ws.sel.route === r.id);
      const trail = r.kind === 'trail';
      ctx.beginPath();
      for (const [i, p] of r.pts.entries()) {
        if (i === 0) ctx.moveTo(this.sx(p.x), this.sy(p.y));
        else ctx.lineTo(this.sx(p.x), this.sy(p.y));
      }
      // Undercoat so the line reads over every terrain.
      ctx.strokeStyle = 'rgba(16, 13, 24, 0.55)';
      ctx.lineWidth = (trail ? 3 : 4.5) + (active ? 1.5 : 0);
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.strokeStyle = active ? '#f2c94c' : trail ? '#b58f5a' : '#d9b06c';
      ctx.lineWidth = (trail ? 1.5 : 2.5) + (active ? 0.75 : 0);
      if (trail) ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Waypoint handles when the route (or one of its points) is live.
      if (active || this.scale >= 3) {
        for (const [i, p] of r.pts.entries()) {
          const wpSel: WorldSel = { kind: 'waypoint', route: r.id, idx: i };
          const hot = this.isSel(wpSel) || this.isHover(wpSel);
          ctx.beginPath();
          ctx.arc(this.sx(p.x), this.sy(p.y), hot ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = hot ? '#f2c94c' : '#241a2e';
          ctx.fill();
          ctx.strokeStyle = hot ? '#241a2e' : active ? '#f2c94c' : '#d9b06c';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      const mid = r.pts[Math.floor(r.pts.length / 2)]!;
      if (active) this.label(ctx, this.sx(mid.x), this.sy(mid.y) - 8, r.name, '#f2c94c');
    }
  }

  private drawRouteDraft(ctx: CanvasRenderingContext2D): void {
    const draft = this.ws.routeDraft;
    if (!draft || draft.pts.length === 0) return;
    ctx.beginPath();
    for (const [i, p] of draft.pts.entries()) {
      if (i === 0) ctx.moveTo(this.sx(p.x), this.sy(p.y));
      else ctx.lineTo(this.sx(p.x), this.sy(p.y));
    }
    if (this.ws.hoverTile) {
      ctx.lineTo(this.sx(this.ws.hoverTile.x + 0.5), this.sy(this.ws.hoverTile.y + 0.5));
    }
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2;
    ctx.setLineDash(draft.kind === 'trail' ? [7, 5] : [10, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of draft.pts) {
      ctx.beginPath();
      ctx.arc(this.sx(p.x), this.sy(p.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c94c';
      ctx.fill();
    }
  }

  private drawSites(ctx: CanvasRenderingContext2D): void {
    const geo = this.ws.geo;
    if (!geo || !this.ws.show.sites) return;
    const cell = this.ws.poiCell;
    for (const s of geo.sites) {
      const sel: WorldSel = { kind: 'site', id: s.id };
      const active = this.isSel(sel) || this.isHover(sel);
      if (s.cell) {
        // Cell-forced: the claim is the whole macro-cell.
        const x = this.sx(s.cell[0] * cell);
        const y = this.sy(s.cell[1] * cell);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = active ? '#f2c94c' : 'rgba(242, 201, 76, 0.4)';
        ctx.lineWidth = active ? 2 : 1.25;
        ctx.strokeRect(x, y, cell * this.scale, cell * this.scale);
        ctx.setLineDash([]);
        this.pin(ctx, x + (cell * this.scale) / 2, y + (cell * this.scale) / 2, active, true);
        if (active || this.scale >= 2.6) {
          this.label(ctx, x + (cell * this.scale) / 2, y + (cell * this.scale) / 2 - 10, `${s.id} · ${s.defId}`, active ? '#f2c94c' : '#ece4d0');
        }
      } else if (s.x !== undefined && s.y !== undefined) {
        const x = this.sx(s.x);
        const y = this.sy(s.y);
        this.pin(ctx, x, y, active, false);
        if (active || this.scale >= 2.6) {
          this.label(ctx, x, y - 10, `${s.id} · ${s.defId}`, active ? '#f2c94c' : '#ece4d0');
        }
      }
    }
  }

  /** The authored-site pin — a lamp-post sigil, gold when live. */
  private pin(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    active: boolean,
    ghost: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = ghost ? 0.85 : 1;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, -9);
    ctx.strokeStyle = active ? '#f2c94c' : '#d9b06c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -11, active ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#f2c94c' : '#d9b06c';
    ctx.fill();
    ctx.strokeStyle = '#241a2e';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 3, 4, 1.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 13, 24, 0.5)';
    ctx.fill();
    ctx.restore();
  }

  private drawAnchors(ctx: CanvasRenderingContext2D): void {
    const geo = this.ws.geo;
    if (!geo || !this.ws.show.anchors) return;
    for (const [i, a] of geo.anchors.entries()) {
      const sel: WorldSel = { kind: 'anchor', idx: i };
      const active = this.isSel(sel) || this.isHover(sel);
      const x = this.sx(a.x);
      const y = this.sy(a.y);
      const r = a.safeR * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = active
        ? '#f2c94c'
        : a.haven
          ? 'rgba(126, 200, 227, 0.75)'
          : 'rgba(242, 201, 76, 0.55)';
      ctx.lineWidth = active ? 2.25 : 1.5;
      if (a.haven) ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      // The hearth-light: a soft safe-ground wash inside the ring.
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = a.haven ? 'rgba(126, 200, 227, 0.05)' : 'rgba(242, 201, 76, 0.05)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, active ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#f2c94c' : a.haven ? '#7ec8e3' : '#d9b06c';
      ctx.fill();
      ctx.strokeStyle = '#241a2e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (active) {
        this.label(
          ctx,
          x,
          y - 10,
          `${a.haven ? 'haven' : 'hearth'} · safe ${a.safeR}`,
          '#f2c94c',
        );
      }
    }
  }

  // ----------------------------------------------------------- pick

  /** Screen-space hit test, most-specific first (the marker law). */
  pick(mx: number, my: number): PickHit | null {
    const geo = this.ws.geo;
    if (!geo) return null;
    const d2 = (x: number, y: number): number => Math.hypot(mx - x, my - y);

    // Waypoints (of the selected/hovered route, or any at close zoom).
    if (this.ws.show.roads) {
      for (const r of geo.routes) {
        const routeLive =
          this.scale >= 3 ||
          (this.ws.sel &&
            ((this.ws.sel.kind === 'route' && this.ws.sel.route === r.id) ||
              (this.ws.sel.kind === 'waypoint' && this.ws.sel.route === r.id)));
        if (!routeLive) continue;
        for (const [i, p] of r.pts.entries()) {
          if (d2(this.sx(p.x), this.sy(p.y)) <= 8) {
            return { sel: { kind: 'waypoint', route: r.id, idx: i } };
          }
        }
      }
    }

    // Site pins.
    if (this.ws.show.sites) {
      const cell = this.ws.poiCell;
      for (const s of geo.sites) {
        const px = s.cell ? this.sx((s.cell[0] + 0.5) * cell) : this.sx(s.x!);
        const py = s.cell ? this.sy((s.cell[1] + 0.5) * cell) : this.sy(s.y!);
        if (d2(px, py - 6) <= 11) return { sel: { kind: 'site', id: s.id } };
      }
    }

    // Anchor centers, then ring edges (radius handle).
    if (this.ws.show.anchors) {
      for (const [i, a] of geo.anchors.entries()) {
        if (d2(this.sx(a.x), this.sy(a.y)) <= 10) return { sel: { kind: 'anchor', idx: i } };
      }
      for (const [i, a] of geo.anchors.entries()) {
        const dist = d2(this.sx(a.x), this.sy(a.y));
        const ring = a.safeR * this.scale;
        if (Math.abs(dist - ring) <= 5) {
          return { sel: { kind: 'anchor', idx: i }, handle: 'radius' };
        }
      }
    }

    // POI cell badges.
    if (this.ws.show.cells) {
      for (const c of this.ws.cells) {
        if (!c.site) continue;
        if (d2(this.sx(c.site.anchorX), this.sy(c.site.anchorY)) <= 9) {
          return { sel: { kind: 'cell', cx: c.cellX, cy: c.cellY } };
        }
      }
    }

    // Planned rect corners (resize), then edges.
    for (const p of geo.planned) {
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      const w = p.w * this.scale;
      const h = p.h * this.scale;
      const corners: Array<[number, number]> = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ];
      const active = this.isSel({ kind: 'planned', id: p.id });
      if (active) {
        for (const [ci, [cx, cy]] of corners.entries()) {
          if (d2(cx, cy) <= 8) {
            return { sel: { kind: 'planned', id: p.id }, handle: 'corner', corner: ci as 0 | 1 | 2 | 3 };
          }
        }
      }
      const nearX = mx >= x - 4 && mx <= x + w + 4;
      const nearY = my >= y - 4 && my <= y + h + 4;
      const onEdge =
        (nearX && (Math.abs(my - y) <= 4 || Math.abs(my - (y + h)) <= 4)) ||
        (nearY && (Math.abs(mx - x) <= 4 || Math.abs(mx - (x + w)) <= 4));
      if (onEdge) return { sel: { kind: 'planned', id: p.id } };
    }

    // Route segments (select; alt-click inserts).
    if (this.ws.show.roads) {
      for (const r of geo.routes) {
        for (let i = 0; i < r.pts.length - 1; i++) {
          const ax = this.sx(r.pts[i]!.x);
          const ay = this.sy(r.pts[i]!.y);
          const bx = this.sx(r.pts[i + 1]!.x);
          const by = this.sy(r.pts[i + 1]!.y);
          const ddx = bx - ax;
          const ddy = by - ay;
          const len2 = ddx * ddx + ddy * ddy;
          let t = len2 === 0 ? 0 : ((mx - ax) * ddx + (my - ay) * ddy) / len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          if (Math.hypot(mx - (ax + t * ddx), my - (ay + t * ddy)) <= 6) {
            return { sel: { kind: 'route', route: r.id }, handle: 'segment', segIdx: i };
          }
        }
      }
    }

    // Zones (smallest wins overlaps), surface only.
    if (this.ws.show.zones) {
      const t = this.tileAtFloat(mx, my);
      let best: { id: string; area: number } | null = null;
      for (const z of this.ws.zones) {
        if (z.origin.y >= 512) continue;
        if (
          t.x >= z.origin.x &&
          t.x < z.origin.x + z.width &&
          t.y >= z.origin.y &&
          t.y < z.origin.y + z.height
        ) {
          const area = z.width * z.height;
          if (!best || area < best.area) best = { id: z.id, area };
        }
      }
      if (best) return { sel: { kind: 'zone', id: best.id } };
    }

    return null;
  }
}


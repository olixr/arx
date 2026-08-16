import {
  CHUNK_SIZE,
  INTEREST_CHUNK_RADIUS,
  Tile,
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
  DEATH_INK,
  PLAYER_INK,
  QUEST_INKS,
  WAYPOINT_INK,
  drawCompassRose,
  drawDiscoveryMarker,
  drawEdgePointer,
  drawKnownSpot,
  drawMapLabel,
  drawDeathMark,
  drawPartyToken,
  drawPlayerToken,
  drawQuestGround,
  drawScaleBar,
  drawWaypointFlag,
  inkCss,
  inkLabelCss,
  partyColor,
} from './markers.js';
import { hashString } from '@arx/shared';
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
 * Bands (THE WORLDS APART): each plane charts on its OWN mask — the
 * surface and the underworld persist, rift runs chart on the session
 * scratch mask from streamed chunks only — the client cannot procgen
 * a dungeon, which is exactly the per-run secrecy the design wants.
 */

const BLOCK = 128;
/** Far-zoom superblock: 4×4 coarse blocks of ground in one bake, so
 *  the visible block count stays bounded no matter how far the reader
 *  pulls back (at min zoom a fullscreen chart is ~2,300 BLOCK-sized
 *  tiles — enough churn to crash the tab before this LOD existed). */
const SUPER = 512;
const FINE_SCALE = 1.25;
const SUPER_SCALE = 0.9;
const FINE_BUDGET = 1;
const COARSE_BUDGET = 6;
const DANGER_BUDGET = 8;
/** Fine blocks are 128×128 canvases (~64 KB each) — cap tight. */
const FINE_CAP = 384;
/** Coarse and super blocks are 32×32 (~4 KB) — the cap can breathe. */
const COARSE_CAP = 1024;
const PROBE_CAP = 16384;

type BlockLod = 'f' | 'c' | 's';

/** LRU read: a hit re-files the entry at the back of the eviction
 *  line. Plain Map.get was FIFO-evicting still-visible blocks at far
 *  zoom — an eternal rebake cycle spawning canvases every frame. */
function lruGet<V>(map: Map<string, V>, key: string): V | undefined {
  const v = map.get(key);
  if (v !== undefined) {
    map.delete(key);
    map.set(key, v);
  }
  return v;
}

function lruEvict<V>(map: Map<string, V>, cap: number): void {
  while (map.size > cap) {
    const first = map.keys().next().value as string;
    map.delete(first);
  }
}

const colorCache = new Map<number, string>();
function tileColor(t: number): string {
  let c = colorCache.get(t);
  if (!c) {
    c = tileDef(t).color;
    colorCache.set(t, c);
  }
  return c;
}

/** Danger tier → overlay wash (index = tier) — the studio's palette.
 *  Exported for the chart rail's legend, which must speak the same ink. */
export const TIER_WASH = [
  'rgba(110, 190, 130, 0.16)',
  'rgba(180, 200, 90, 0.14)',
  'rgba(220, 190, 70, 0.16)',
  'rgba(230, 140, 60, 0.18)',
  'rgba(220, 80, 60, 0.20)',
  'rgba(170, 40, 90, 0.24)',
  // 6 — the lampless dark: past red, into ember-on-char.
  'rgba(112, 22, 128, 0.28)',
  // 7 — the howling dark: the ember cools to a bruised violet.
  'rgba(74, 28, 148, 0.30)',
  // 8 — the nameless waste: violet drowns toward midnight.
  'rgba(44, 34, 110, 0.34)',
  // 9 — the world's rim: the ink itself, barely a color at all.
  'rgba(22, 18, 52, 0.40)',
  // 10 — THE OVERBAND, the sundered dark: char shot through with blood.
  'rgba(64, 6, 14, 0.46)',
];

/**
 * THE WORLDS APART: the chart's three postures — the surface (the full
 * instrument: procgen fill, danger wash, markers), the underworld (a
 * persistent chart of carved rock — what you've walked is remembered,
 * the unstreamed dark reads as stone), and a rift (the per-run scratch
 * chart, forgotten when the run ends).
 */
export type MapBand = 'surface' | 'underworld' | 'dungeon';

export interface MapPick {
  kind: 'discovery' | 'waypoint' | 'questground';
  d?: DiscoveryWire;
  /** questground: the errand and the ground under the finger. */
  quest?: string;
  ground?: { x: number; y: number; r: number; label: string };
}

/** One errand's drawable grounds, dealt from the wire by the ledger. */
interface QuestChartEntry {
  quest: string;
  name: string;
  ink: readonly [number, number, number];
  grounds: Array<{
    x: number;
    y: number;
    r: number;
    plane: string;
    sure: boolean;
    /** A firm known door (a person, a turn-in) vs a searching ground. */
    person: boolean;
    label: string;
    /** True when the server sent its own word — already flavored. */
    worded: boolean;
    seed: number;
  }>;
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
  /**
   * THE FINGER ON THE CHART — which errands paint their grounds. The
   * quest pane owns this set (and persists it); the view only draws.
   * `questFocus` is the pane's selected errand: it breathes, wears its
   * labels, and points from the sheet's edge when its grounds are off
   * it. The traveler's glass ignores the set and draws only the
   * followed errand, quietly.
   */
  readonly questShown = new Set<string>();
  questFocus: string | null = null;
  /** The followed errand (the tracker's own) — wired by main. */
  getFollowed: (() => string | null) | null = null;
  /** The ground under the pointer, set by the screen from pick(). */
  questHover: { quest: string; ground: { x: number; y: number; r: number; label: string } } | null = null;

  private questDisplay: QuestChartEntry[] = [];
  private questDisplayStamp = '';

  /** Fine (1px/tile) blocks — big canvases, tight cap. */
  private fineBlocks = new Map<string, HTMLCanvasElement>();
  /** Coarse + super blocks — small canvases, roomy cap. */
  private coarseBlocks = new Map<string, HTMLCanvasElement>();
  private dangerBlocks = new Map<string, HTMLCanvasElement>();
  /** Probe-fill colors for blocks the budget hasn't baked yet — pure
   *  worldgen, safe to memoize for the session. */
  private probeColors = new Map<string, string>();
  private dangerRev = 0;
  private lastAnchors: unknown = null;
  private lastWorldVersion = -1;
  /** Camera/world fingerprint of the last terrain+fog composite. */
  private lastStamp = '';
  /** Whether that composite had every visible block baked. */
  private lastAllBaked = false;
  private readonly fog = new FogLayer();
  private readonly dungeonFog = new FogLayer();
  private layer: HTMLCanvasElement = document.createElement('canvas');
  private fogCnv: HTMLCanvasElement = document.createElement('canvas');
  /** Reusable block-resolution sheet for the sampled LODs — coarse and
   *  super blocks compose here unsmoothed (32px each), then reach the
   *  layer in ONE smoothed blit. Scaling each 32px block up on its own
   *  bled edges against transparent: a faint seam grid at far zoom. */
  private sheet: HTMLCanvasElement = document.createElement('canvas');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: ClientGame,
    /** The game renderer's adaptive-resolution dpr — the chart must
     *  not out-render a main view that has already stepped down. */
    private readonly effectiveDpr: () => number = () => window.devicePixelRatio || 1,
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

  /** The band the reader is charting right now — the plane's law. */
  band(): MapBand {
    const p = this.game.plane;
    if (p.id === 'surface') return 'surface';
    return p.persistent ? 'underworld' : 'dungeon';
  }

  // ---------------------------------------------------- quest grounds

  /**
   * THE ERRAND'S INK — stable per quest id (the hash), probed apart
   * across the ACTIVE ledger so no two errands share a color while
   * six or fewer are underway. Assignment reads the whole ledger, not
   * the shown set, so toggling one errand never recolors another.
   */
  private questInks(): Map<string, readonly [number, number, number]> {
    const ids = [...this.game.quests.keys()].sort();
    const taken = new Array<boolean>(QUEST_INKS.length).fill(false);
    const out = new Map<string, readonly [number, number, number]>();
    for (const id of ids) {
      let slot = hashString(id) % QUEST_INKS.length;
      for (let probe = 0; probe < QUEST_INKS.length && taken[slot]; probe++) {
        slot = (slot + 1) % QUEST_INKS.length;
      }
      taken[slot] = true;
      out.set(id, QUEST_INKS[slot]!);
    }
    return out;
  }

  /** The ink an errand wears everywhere (chart, pane, pointers). */
  questInk(quest: string): readonly [number, number, number] {
    return this.questInks().get(quest) ?? QUEST_INKS[0]!;
  }

  /**
   * Deal the drawable grounds from the quest wire — rebuilt only when
   * the ledger clock, the shown set, or the focus moves. A finished
   * errand leaves the chart by construction: it leaves the ledger,
   * questVersion turns, and the stamp re-deals.
   */
  private buildQuestDisplay(): void {
    const followed = this.overlay ? (this.getFollowed?.() ?? null) : null;
    const shownKey = this.overlay ? `ov:${followed}` : [...this.questShown].sort().join(',');
    const stamp = `${this.game.questVersion}|${shownKey}|${this.questFocus}`;
    if (stamp === this.questDisplayStamp) return;
    this.questDisplayStamp = stamp;
    this.questDisplay = [];
    const inks = this.questInks();
    for (const q of this.game.quests.values()) {
      const shown = this.overlay ? q.id === followed : this.questShown.has(q.id);
      if (!shown) continue;
      const entry: QuestChartEntry = {
        quest: q.id,
        name: q.name,
        ink: inks.get(q.id) ?? QUEST_INKS[0]!,
        grounds: [],
      };
      const deal = (
        h: { x: number; y: number; r: number; plane?: string; sure?: boolean; word?: string },
        person: boolean,
        label: string,
      ): void => {
        entry.grounds.push({
          x: h.x,
          y: h.y,
          r: h.r,
          plane: h.plane ?? 'surface',
          sure: h.sure !== false,
          person,
          label: h.word ?? label,
          worded: h.word !== undefined,
          seed: hashString(`${q.id}|${h.x},${h.y},${h.r}`),
        });
      };
      if (q.status === 'ready') {
        // Every ask answered: the only ground left is the door home.
        if (q.turnInHint) deal(q.turnInHint, true, q.turnInName);
      } else {
        for (const o of q.objectives) {
          if (o.have >= o.need) continue;
          const hs = o.hints ?? (o.hint ? [o.hint] : []);
          for (const h of hs) deal(h, o.kind === 'talk', o.label);
        }
      }
      if (entry.grounds.length > 0) this.questDisplay.push(entry);
    }
  }

  /**
   * THE CROSSING: every block, probe, and fog canvas is keyed by
   * coordinates that just changed worlds — drop them all. Called from
   * the onPlane event (main.ts wires it).
   */
  onPlaneSwitch(): void {
    this.fineBlocks.clear();
    this.coarseBlocks.clear();
    this.dangerBlocks.clear();
    this.probeColors.clear();
    this.fog.clear();
    this.dungeonFog.clear();
    this.lastStamp = '';
    this.lastWorldVersion = -1;
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
        this.fineBlocks.delete(`${bx},${by}:f`);
      }
    }
  }

  // ---------------------------------------------------------- baking

  private probeFill(bx: number, by: number, span: number): string {
    const key = `${bx},${by}:${span}`;
    const hit = this.probeColors.get(key);
    if (hit) return hit;
    const seed = this.game.worldSeed ?? 0;
    const tx = bx * span + span / 2;
    const ty = by * span + span / 2;
    let c: string;
    // Off-surface planes have no worldgen to probe — unwalked space
    // is solid rock by law.
    if (this.band() !== 'surface') c = tileColor(Tile.CaveWall);
    else {
      const e = elevationAt(seed, tx, ty);
      if (e < 0.37) c = tileColor(Tile.WaterDeep);
      else if (e < 0.4) c = tileColor(Tile.Sand);
      else if (levelAt(seed, tx, ty) !== 0) c = tileColor(Tile.Rock);
      else c = moistureAt(seed, tx, ty) > 0.62 ? '#3f6b2e' : tileColor(Tile.Grass);
    }
    if (this.probeColors.size >= PROBE_CAP) this.probeColors.clear();
    this.probeColors.set(key, c);
    return c;
  }

  /** Sampled bake — coarse (span 128, step 4) and super (span 512,
   *  step 16) share the loop; both land on a 32×32 canvas. */
  private bakeSampled(bx: number, by: number, span: number, step: number): HTMLCanvasElement {
    const seed = this.game.worldSeed ?? 0;
    const n = span / step;
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
    // A sparse sample grid needs a fatter road tolerance or the route
    // decays into stray dots — at the super step the chart keeps a
    // faint broken trace instead.
    const roadPad = step >= 16 ? 4 : 0.9;
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const tx = bx * span + ix * step + step / 2;
        const ty = by * span + iy * step + step / 2;
        const i = ix + iy * n;
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
        if (hit && hit.dist <= (hit.trail ? TRAIL_HALF : ROAD_HALF) + roadPad) {
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
    // Off-surface: unstreamed space is solid rock (never procgen) —
    // the per-plane secrecy of a carved world falls out for free.
    const offSurface = this.band() !== 'surface';
    for (let cy = 0; cy < chunksPer; cy++) {
      for (let cx = 0; cx < chunksPer; cx++) {
        const live = this.game.world.get(c0x + cx, c0y + cy);
        const chunk = live ?? (offSurface ? null : generateChunk(seed, c0x + cx, c0y + cy));
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

  /** Danger wash for one block, 16×16 samples whatever the span. The
   *  render loop owns the cache check and the per-frame bake budget —
   *  an over-budget block simply waits its turn (the wash fills in
   *  over a few frames) instead of the whole visible sheet baking in
   *  one frame, which at far zoom was thousands of canvases at once. */
  private bakeDanger(bx: number, by: number, span: number, key: string): HTMLCanvasElement {
    const seed = this.game.worldSeed ?? 0;
    const step = span / 16;
    const n = span / step;
    const cnv = document.createElement('canvas');
    cnv.width = n;
    cnv.height = n;
    const ctx = cnv.getContext('2d')!;
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const tx = bx * span + ix * step + step / 2;
        const ty = by * span + iy * step + step / 2;
        const tier = dangerAt(seed, tx, ty, this.game.dangerAnchors);
        ctx.fillStyle = TIER_WASH[Math.max(0, Math.min(TIER_WASH.length - 1, tier))]!;
        ctx.fillRect(ix, iy, 1, 1);
      }
    }
    this.dangerBlocks.set(key, cnv);
    lruEvict(this.dangerBlocks, 512);
    return cnv;
  }

  /** THE STILL SHEET fingerprint — everything the terrain+fog
   *  composite depends on. While it holds (and every visible block is
   *  baked), the layer from last frame is still the truth and the
   *  whole bake/fog pass is skipped; marks re-draw on top each frame
   *  regardless. Live-chunk versions only matter to the fine LOD —
   *  coarse and super bakes never read streamed chunks. */
  private layerStamp(band: MapBand, lod: BlockLod, cw: number, ch: number, dpr: number): string {
    return (
      `${this.game.plane.id},${this.panX},${this.panY},${this.scale},${cw},${ch},${dpr},${band},${this.parchment},` +
      `${this.game.chartVersion},${this.showDanger},${this.dangerRev},` +
      `${lod === 'f' ? this.game.worldVersion : -1}`
    );
  }

  // --------------------------------------------------------- render

  render(nowMs: number): void {
    const dpr = this.effectiveDpr();
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

    // The anchor list is replaced wholesale when havens change — an
    // identity check is the cheap invalidation.
    if (this.lastAnchors !== this.game.dangerAnchors) {
      this.lastAnchors = this.game.dangerAnchors;
      this.dangerRev++;
      this.dangerBlocks.clear();
    }

    const band = this.band();
    // Off-surface charts are carved space: only streamed truth ever
    // draws, so the fine LOD is the only honest one.
    const lod: BlockLod =
      band !== 'surface' || this.scale >= FINE_SCALE ? 'f' : this.scale >= SUPER_SCALE ? 'c' : 's';
    const span = lod === 's' ? SUPER : BLOCK;
    const t0 = this.tileAtFloat(0, 0);
    const t1 = this.tileAtFloat(cw, ch);

    const stamp = this.layerStamp(band, lod, cw, ch, dpr);
    if (stamp !== this.lastStamp || !this.lastAllBaked) {
      let allBaked = true;

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

      const b0x = Math.floor(t0.x / span);
      const b0y = Math.floor(t0.y / span);
      const b1x = Math.floor(t1.x / span);
      const b1y = Math.floor(t1.y / span);

      let budget = lod === 'f' ? FINE_BUDGET : COARSE_BUDGET;
      let dangerBudget = DANGER_BUDGET;
      const wanted: Array<{ bx: number; by: number; d: number }> = [];
      for (let by = b0y; by <= b1y; by++) {
        for (let bx = b0x; bx <= b1x; bx++) {
          wanted.push({ bx, by, d: Math.hypot(bx - (b0x + b1x) / 2, by - (b0y + b1y) / 2) });
        }
      }
      wanted.sort((a, b) => a.d - b.d);
      // THE PAINTED GROUND: smooth the tile bake at reading distance —
      // the chart is a painting of the land, not a screenshot of the
      // grid. From 4px a tile up the authored town art carries real
      // shapes, and crispness starts telling truth instead of stairs.
      lctx.imageSmoothingEnabled = this.scale < 4;
      const cache = lod === 'f' ? this.fineBlocks : this.coarseBlocks;
      // The sampled LODs magnify their 32px bakes several-fold — those
      // go through the compose sheet. Fine blocks only ever minify (or
      // sit near 1:1), where edge bleed is invisible: direct draw.
      const composed = lod !== 'f';
      const UNIT = 32;
      let sctx: CanvasRenderingContext2D | null = null;
      if (composed) {
        const w = (b1x - b0x + 1) * UNIT;
        const h = (b1y - b0y + 1) * UNIT;
        if (this.sheet.width < w || this.sheet.height < h) {
          this.sheet.width = Math.max(this.sheet.width, w);
          this.sheet.height = Math.max(this.sheet.height, h);
        }
        sctx = this.sheet.getContext('2d')!;
        sctx.clearRect(0, 0, w, h);
      }
      for (const { bx, by } of wanted) {
        const key = `${bx},${by}:${lod}`;
        let block = lruGet(cache, key);
        if (block === undefined) {
          if (budget > 0) {
            block =
              lod === 'f'
                ? this.bakeFine(bx, by)
                : lod === 'c'
                  ? this.bakeSampled(bx, by, BLOCK, 4)
                  : this.bakeSampled(bx, by, SUPER, 16);
            cache.set(key, block);
            budget--;
            lruEvict(cache, lod === 'f' ? FINE_CAP : COARSE_CAP);
          } else {
            allBaked = false;
          }
        }
        if (sctx) {
          const x = (bx - b0x) * UNIT;
          const y = (by - b0y) * UNIT;
          if (block) {
            sctx.drawImage(block, x, y);
          } else {
            sctx.fillStyle = this.probeFill(bx, by, span);
            sctx.fillRect(x, y, UNIT, UNIT);
          }
        } else {
          const x = this.sx(bx * span);
          const y = this.sy(by * span);
          const size = span * this.scale;
          if (block) {
            lctx.drawImage(block, x, y, size, size);
          } else {
            lctx.fillStyle = this.probeFill(bx, by, span);
            lctx.fillRect(x, y, size, size);
          }
        }
      }
      if (sctx) {
        const cols = b1x - b0x + 1;
        const rows = b1y - b0y + 1;
        lctx.drawImage(
          this.sheet,
          0,
          0,
          cols * UNIT,
          rows * UNIT,
          this.sx(b0x * span),
          this.sy(b0y * span),
          cols * span * this.scale,
          rows * span * this.scale,
        );
      }

      // Bundled town art over procgen (live chunks were baked into the
      // fine blocks above and already carry the streamed truth).
      // THE WORLDS APART: art draws only on ITS plane's chart — the
      // underworld's towns stop painting over the open surface
      // wilderness they merely share coordinates with, and the
      // underworld band gains the art it was silently missing.
      for (const art of authoredZoneArt()) {
        if (art.plane !== this.game.plane.id) continue;
        if (art.x + art.w < t0.x || art.x > t1.x || art.y + art.h < t0.y || art.y > t1.y) continue;
        lctx.drawImage(art.canvas, this.sx(art.x), this.sy(art.y), art.w * this.scale, art.h * this.scale);
      }
      if (band === 'surface' && this.showDanger) {
        for (const { bx, by } of wanted) {
          const key = `${bx},${by}:${span}:${this.dangerRev}`;
          let dcnv = lruGet(this.dangerBlocks, key);
          if (!dcnv) {
            if (dangerBudget <= 0) {
              allBaked = false;
              continue;
            }
            dangerBudget--;
            dcnv = this.bakeDanger(bx, by, span, key);
          }
          lctx.drawImage(dcnv, this.sx(bx * span), this.sy(by * span), span * this.scale, span * this.scale);
        }
      }

      // 2. THE FOG: charted coverage masks the layer; parchment beneath
      // shows through everywhere the reader has never walked.
      const fctx = this.fogCnv.getContext('2d')!;
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, cw, ch);
      // The explored getter already answers with the CURRENT plane's
      // mask (persistent or scratch by the plane's law).
      const mask = this.game.explored;
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

      this.lastStamp = stamp;
      this.lastAllBaked = allBaked;
    }

    ctx.drawImage(this.layer, 0, 0, cw, ch);

    // A whisper of ink where the chart meets the fog: re-draw the
    // coverage at low alpha with 'multiply' just outside the mask
    // edge would cost another pass — the smoothed mask already blooms
    // softly, so the sheet reads hand-shaded for free.

    // 3. Marks over everything — a place once found is never lost to
    // the fog, even when its ground has gone parchment-blank.

    // THE FINGER ON THE CHART rides under every pin: the errands'
    // ground washes first, marks over them. The ledger is the truth —
    // a finished errand takes its grounds with it (the display stamp
    // watches questVersion).
    this.buildQuestDisplay();
    if (this.questDisplay.length > 0) {
      const qPulse = (nowMs % 2600) / 2600;
      for (const e of this.questDisplay) {
        const focus = !this.overlay && this.questFocus === e.quest;
        for (const g of e.grounds) {
          // A ground only lands on the plane that holds it.
          if (g.plane !== this.game.plane.id) continue;
          const x = this.sx(g.x);
          const y = this.sy(g.y);
          const rPx = Math.max(g.person ? 9 : 16, g.r * this.scale);
          if (x < -rPx - 40 || y < -rPx - 40 || x > cw + rPx + 40 || y > ch + rPx + 40) continue;
          if (g.person) {
            drawKnownSpot(ctx, x, y, rPx, e.ink, qPulse, { focus, quiet: this.overlay });
          } else {
            drawQuestGround(ctx, x, y, rPx, e.ink, g.seed, qPulse, {
              sure: g.sure,
              focus,
              quiet: this.overlay,
            });
          }
          // Labels stay scarce so many errands never muddy the sheet:
          // the focused errand speaks, the hovered ground speaks, and
          // close zoom names everything. Rumors admit they are rumors.
          const hovered =
            this.questHover !== null &&
            this.questHover.quest === e.quest &&
            this.questHover.ground.x === g.x &&
            this.questHover.ground.y === g.y;
          if (!this.overlay && (focus || hovered || this.scale >= 5)) {
            // A server-worded ground already carries its flavor; only
            // a bare rumor earns the hearsay suffix.
            const word = g.worded || g.sure || g.person ? g.label : `${g.label}, they say`;
            drawMapLabel(ctx, x, y - rPx - 6, word, inkLabelCss(e.ink), 11.5);
          }
        }
      }
      // THE READER IS NEVER LOST, errand edition: when the focused
      // errand's nearest ground has left the sheet, its ink points
      // back from the edge.
      if (!this.overlay && this.questFocus !== null) {
        const e = this.questDisplay.find((d) => d.quest === this.questFocus);
        const g = e?.grounds.find((gr) => gr.plane === this.game.plane.id);
        if (e && g) {
          const x = this.sx(g.x);
          const y = this.sy(g.y);
          const rPx = g.r * this.scale;
          if (x < -rPx || y < -rPx || x > cw + rPx || y > ch + rPx) {
            drawEdgePointer(ctx, cw, ch, x, y, inkCss(e.ink, 1), e.name);
          }
        }
      }
    }

    if (band !== 'dungeon') {
      const markerR = this.overlay ? 7 : Math.max(10, Math.min(16, this.scale * 2.8));
      for (const d of this.game.discoveries.values()) {
        // A mark only lands on the plane that holds its place.
        if ((d.plane ?? 'surface') !== this.game.plane.id) continue;
        const x = this.sx(d.x + 0.5);
        const y = this.sy(d.y + 0.5);
        if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
        drawDiscoveryMarker(ctx, d, x, y, markerR, this.hover?.id === d.id);
        const showLabel = this.overlay
          ? d.kind === 'town'
          : this.hover?.id === d.id || (d.kind === 'town' && this.scale >= 0.7) || this.scale >= 5;
        if (showLabel) {
          const size = d.kind === 'town' ? 13.5 : 11.5;
          drawMapLabel(ctx, x, y - markerR - 4, d.faded ? `${d.name}?` : d.name, d.faded ? '#9a8f78' : '#ece4d0', size);
        }
      }
    }

    const wp = this.game.waypoint;
    if (wp && (wp.plane ?? 'surface') === this.game.plane.id) {
      const pulse = (nowMs % 1600) / 1600;
      const wx = this.sx(wp.x + 0.5);
      const wy = this.sy(wp.y + 0.5);
      drawWaypointFlag(ctx, wx, wy, Math.max(10.5, Math.min(15, this.scale * 2.6)), pulse);
      if (!this.overlay && (wx < 0 || wy < 0 || wx > cw || wy > ch)) {
        drawEdgePointer(ctx, cw, ch, wx, wy, WAYPOINT_INK, 'Waypoint');
      }
    }

    // Where the reader last fell — the spilled pack's skull. Always a
    // surface mark (rift deaths spill at the surface gate), dimming
    // through its last two minutes as the ground gets ready to forget.
    const dm = this.game.deathMark;
    if (dm && (dm.plane ?? 'surface') === this.game.plane.id && dm.until > Date.now()) {
      const x = this.sx(dm.x);
      const y = this.sy(dm.y);
      const remain = dm.until - Date.now();
      const pulse = (nowMs % 2200) / 2200;
      ctx.save();
      ctx.globalAlpha = remain < 120_000 ? 0.45 + 0.55 * (remain / 120_000) : 1;
      if (x > -30 && y > -30 && x < cw + 30 && y < ch + 30) {
        drawDeathMark(ctx, x, y, this.overlay ? 7.5 : Math.max(9.5, Math.min(14, this.scale * 2.5)), pulse);
      } else if (!this.overlay) {
        drawEdgePointer(ctx, cw, ch, x, y, DEATH_INK, 'Fell here');
      }
      ctx.restore();
    }

    // Party members — kin-dots in identity ink, drawn under the
    // reader's own token. Positions ride the slow partypos ticker, so
    // a dot is a bearing, not a bootprint.
    for (const f of this.game.partyFellowsPlaced()) {
      if (f.plane !== this.game.plane.id) continue;
      const x = this.sx(f.x);
      const y = this.sy(f.y);
      if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
      const pr = this.overlay ? 5 : Math.max(5, Math.min(8.5, this.scale * 1.5));
      drawPartyToken(ctx, x, y, pr, partyColor(f.name));
      if (!this.overlay && this.scale >= 1.2) drawMapLabel(ctx, x, y - pr - 4, f.name, '#cfe7f2', 11);
    }

    // The reader's own token — the body is always on the charted
    // plane (the chart IS the current plane's).
    const pos = this.game.predictor.pos;
    {
      const px = this.sx(pos.x);
      const py = this.sy(pos.y);
      const r = this.overlay ? 7 : Math.max(8.5, Math.min(12, this.scale * 2));
      const pulse = (nowMs % 2200) / 2200;
      drawPlayerToken(ctx, px, py, r, this.game.aim, pulse, this.overlay);
      // THE READER IS NEVER LOST: panned away from yourself, the chart
      // points back at you from its edge.
      if (!this.overlay && (px < 0 || py < 0 || px > cw || py > ch)) {
        drawEdgePointer(ctx, cw, ch, px, py, PLAYER_INK, 'You');
      }
    }

    // The chart's standing instruments — north said out loud, distance
    // made honest. The glass stays bare (the quiet-HUD decree).
    if (!this.overlay) {
      drawCompassRose(ctx, cw - 38, 44, 18);
      drawScaleBar(ctx, 14, ch - 14, this.scale);
    }
  }

  // ----------------------------------------------------------- pick

  pick(mx: number, my: number): MapPick | null {
    // Scratch planes take no pins and hold no ledger marks.
    if (this.band() === 'dungeon') return null;
    const wp = this.game.waypoint;
    if (
      wp &&
      (wp.plane ?? 'surface') === this.game.plane.id &&
      Math.hypot(mx - this.sx(wp.x + 0.5), my - this.sy(wp.y + 0.5)) <= 14
    ) {
      return { kind: 'waypoint' };
    }
    let best: { d: DiscoveryWire; dist: number } | null = null;
    for (const d of this.game.discoveries.values()) {
      if ((d.plane ?? 'surface') !== this.game.plane.id) continue;
      const dist = Math.hypot(mx - this.sx(d.x + 0.5), my - this.sy(d.y + 0.5));
      if (dist <= 14 && (!best || dist < best.dist)) best = { d, dist };
    }
    if (best) return { kind: 'discovery', d: best.d };
    // Quest grounds hover LAST — they are broad washes and must never
    // steal a pin's finger. The smallest ground under the pointer
    // wins (the most specific rumor).
    let ground: { quest: string; g: QuestChartEntry['grounds'][number]; rPx: number } | null = null;
    for (const e of this.questDisplay) {
      for (const g of e.grounds) {
        if (g.plane !== this.game.plane.id) continue;
        const rPx = Math.max(g.person ? 9 : 16, g.r * this.scale);
        const dist = Math.hypot(mx - this.sx(g.x), my - this.sy(g.y));
        if (dist <= rPx && (ground === null || rPx < ground.rPx)) ground = { quest: e.quest, g, rPx };
      }
    }
    if (ground) {
      return {
        kind: 'questground',
        quest: ground.quest,
        ground: { x: ground.g.x, y: ground.g.y, r: ground.g.r, label: ground.g.label },
      };
    }
    return null;
  }
}

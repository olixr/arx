/**
 * THE EDITOR STAGE — Map Studio v2 Phase 2. A headless, never-
 * connected ClientGame whose ChunkStore is armed from the draft zone
 * AT ITS TRUE WORLD ORIGIN with the real procedural worldgen composed
 * beneath and around it — so every hash-dealt variant, every edge-
 * harmony blend, and every neighboring road matches the live game
 * tile for tile. The game's own Renderer paints it (THE TRUE VIEWPORT
 * LAW); the stage owns world data and invalidation only.
 *
 * THE STAGE IS INERT: the game object here never connects, never owns
 * an InputManager, never ticks. All input belongs to the editor.
 */

import {
  CHUNK_SIZE,
  INTERIOR_BOUNDARY_TILES,
  TILE_SKIP,
  tileIndex,
  type ChunkData,
} from '@arx/shared';
import {
  SURFACE_PLANE_ID,
  WORLD_SEED,
  generateCaveChunk,
  generateChunk,
  type ZoneDef,
} from '@arx/content';
import { ClientGame, type GameEvents } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import { Renderer } from '../render/renderer.js';

/** Wall/door tiles — the interiors-version gate (the ROOM law's set). */
const BOUNDARY_TILE_SET = new Set<number>(INTERIOR_BOUNDARY_TILES);

/**
 * The stage's game: identical to the live client in every field the
 * renderer reads, except the clock answers to the editor's scrubber.
 */
class StageGame extends ClientGame {
  /** The clock instrument's hour — the whole frame keys off this. */
  stageHours = 12;

  override clockHoursNow(): number {
    return this.stageHours;
  }
}

/**
 * Never touched: the stage never calls update()/connect(), so the
 * input and event dependencies exist only to satisfy construction.
 */
const stubInput = {} as unknown as InputManager;
const stubEvents = {} as unknown as GameEvents;

/** Per-frame compose budget: fresh chunks composed while panning. */
const COMPOSE_BUDGET = 6;

export class EditorStage {
  readonly game = new StageGame(stubInput, stubEvents);
  readonly renderer: Renderer;
  /** True once the first frame rendered without throwing. */
  healthy = true;

  private seed = WORLD_SEED;
  /** Chunk keys needing recomposition after an edit. */
  private readonly dirtyChunks = new Set<string>();
  private lastFrameMs = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly getZone: () => ZoneDef,
  ) {
    this.renderer = new Renderer(canvas);
  }

  setHours(h: number): void {
    this.game.stageHours = ((h % 24) + 24) % 24;
  }

  get hours(): number {
    return this.game.stageHours;
  }

  /** The world seed — from /dev/world at boot; a change re-arms all. */
  setSeed(seed: number): void {
    if (seed === this.seed) return;
    this.seed = seed;
    this.rebuildAll();
  }

  // ------------------------------------------------- chunk composing

  /**
   * Compose one chunk exactly as the server does: procedural worldgen
   * first, then the draft zone overlaid (worldSource.overlayZone
   * semantics, mirrored: TILE_SKIP cells transparent — elev included;
   * detail TILE_SKIP → 0; a zone with no elev layer levels its ground).
   */
  private composeChunk(cx: number, cy: number): ChunkData {
    const zone = this.getZone();
    // THE WORLDS APART: the bake base follows the zone's plane — cave
    // planes deal solid rock for the authored rooms to carve into;
    // the surface reads the procedural worldgen fields as ever.
    const chunk =
      (zone.plane ?? SURFACE_PLANE_ID) === SURFACE_PLANE_ID
        ? generateChunk(this.seed, cx, cy)
        : generateCaveChunk(cx, cy);
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    const x0 = Math.max(baseX, zone.origin.x);
    const y0 = Math.max(baseY, zone.origin.y);
    const x1 = Math.min(baseX + CHUNK_SIZE, zone.origin.x + zone.width);
    const y1 = Math.min(baseY + CHUNK_SIZE, zone.origin.y + zone.height);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const zi = (ty - zone.origin.y) * zone.width + (tx - zone.origin.x);
        if (zone.ground[zi] === TILE_SKIP) continue;
        const ci = tileIndex(tx, ty);
        chunk.ground[ci] = zone.ground[zi]!;
        chunk.detail[ci] = zone.detail[zi] === TILE_SKIP ? 0 : zone.detail[zi]!;
        chunk.elev[ci] = zone.elev ? zone.elev[zi]! : 0;
      }
    }
    return chunk;
  }

  /**
   * Everything is stale — zone adopted, origin/size changed, seed or
   * geography moved, undo swapped the document. Chunks regenerate
   * lazily through ensureVisible, so the cost lands only on the view.
   */
  rebuildAll(): void {
    this.game.world.dropAll();
    this.dirtyChunks.clear();
    this.game.worldVersion++;
    this.game.interiorsVersion++;
  }

  /** An edit touched this LOCAL-tile rect: recompose its chunks. */
  invalidateRect(x0: number, y0: number, x1: number, y1: number): void {
    const zone = this.getZone();
    const wx0 = zone.origin.x + Math.max(0, Math.min(x0, x1));
    const wy0 = zone.origin.y + Math.max(0, Math.min(y0, y1));
    const wx1 = zone.origin.x + Math.min(zone.width - 1, Math.max(x0, x1));
    const wy1 = zone.origin.y + Math.min(zone.height - 1, Math.max(y0, y1));
    // Pad one tile: wall faces, cliff joints, and bake gutters read
    // neighbors; an edit on a chunk border must re-deal both sides.
    for (let cy = Math.floor((wy0 - 1) / CHUNK_SIZE); cy <= Math.floor((wy1 + 1) / CHUNK_SIZE); cy++) {
      for (let cx = Math.floor((wx0 - 1) / CHUNK_SIZE); cx <= Math.floor((wx1 + 1) / CHUNK_SIZE); cx++) {
        this.dirtyChunks.add(`${cx},${cy}`);
      }
    }
  }

  /** Recompose dirty chunks (bounded per frame mid-stroke elsewhere). */
  private flushDirty(): void {
    if (this.dirtyChunks.size === 0) return;
    let interiorsTouched = false;
    for (const key of this.dirtyChunks) {
      const [cx, cy] = key.split(',').map(Number);
      const prev = this.game.world.get(cx!, cy!);
      if (!prev) continue; // never composed — ensureVisible owns it
      const next = this.composeChunk(cx!, cy!);
      // THE ROOM STANDS THROUGH THE STREAM, editor edition: interiors
      // re-derive only when the edit can actually touch a room —
      // boundary tiles present before or after.
      if (!interiorsTouched && (chunkHasBoundary(prev) || chunkHasBoundary(next))) {
        interiorsTouched = true;
      }
      next.rev = (prev.rev ?? 0) + 1;
      this.game.world.set(next);
    }
    this.dirtyChunks.clear();
    this.game.worldVersion++;
    if (interiorsTouched) this.game.interiorsVersion++;
  }

  /** Compose missing chunks inside the view (budgeted — pan-friendly). */
  private ensureVisible(): void {
    const cam = this.renderer.camera;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const tl = cam.screenToWorld(0, 0, w, h);
    const br = cam.screenToWorld(w, h, w, h);
    const pad = 1;
    const cx0 = Math.floor(tl.x / CHUNK_SIZE) - pad;
    const cy0 = Math.floor(tl.y / CHUNK_SIZE) - pad;
    const cx1 = Math.floor(br.x / CHUNK_SIZE) + pad;
    // South pad + squash: tall things reach up-screen from below.
    const cy1 = Math.floor((br.y + 8) / CHUNK_SIZE) + pad;
    let budget = COMPOSE_BUDGET;
    for (let cy = cy0; cy <= cy1 && budget > 0; cy++) {
      for (let cx = cx0; cx <= cx1 && budget > 0; cx++) {
        if (this.game.world.has(cx, cy)) continue;
        this.game.world.set(this.composeChunk(cx, cy));
        this.game.worldVersion++;
        budget--;
      }
    }
  }

  // ------------------------------------------------------- the frame

  /**
   * One editor frame: camera in (world coords + zoom), fresh ground
   * composed, edits flushed, then the game's own painter.
   */
  render(camX: number, camY: number, zoom: number, nowMs: number): void {
    const dt = this.lastFrameMs > 0 ? Math.min(0.1, (nowMs - this.lastFrameMs) / 1000) : 0.016;
    this.lastFrameMs = nowMs;
    this.renderer.cameraOverride = { x: camX, y: camY, zoom };
    // Pin the (bodiless) predictor to the camera so any position-
    // relative subsystem reads the framed ground, never (0,0).
    this.game.predictor.reset({ x: camX, y: camY });
    this.ensureVisible();
    this.flushDirty();
    try {
      this.renderer.render(this.game, dt);
    } catch (err) {
      // A stage frame must never take the studio down — fall to the
      // draft view and keep the wound visible in the console.
      this.healthy = false;
      console.error('[stage] frame failed — draft view stands in', err);
    }
  }
}

function chunkHasBoundary(chunk: ChunkData): boolean {
  const g = chunk.ground;
  for (let i = 0; i < g.length; i++) {
    if (BOUNDARY_TILE_SET.has(g[i]!)) return true;
  }
  return false;
}

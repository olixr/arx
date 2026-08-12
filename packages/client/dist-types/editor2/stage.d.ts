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
import { type ZoneDef } from '@arx/content';
import { ClientGame } from '../game/clientGame.js';
import { Renderer } from '../render/renderer.js';
/**
 * The stage's game: identical to the live client in every field the
 * renderer reads, except the clock answers to the editor's scrubber.
 */
declare class StageGame extends ClientGame {
    /** The clock instrument's hour — the whole frame keys off this. */
    stageHours: number;
    clockHoursNow(): number;
}
export declare class EditorStage {
    readonly canvas: HTMLCanvasElement;
    private readonly getZone;
    readonly game: StageGame;
    readonly renderer: Renderer;
    /** True once the first frame rendered without throwing. */
    healthy: boolean;
    private seed;
    /** Chunk keys needing recomposition after an edit. */
    private readonly dirtyChunks;
    private lastFrameMs;
    constructor(canvas: HTMLCanvasElement, getZone: () => ZoneDef);
    setHours(h: number): void;
    get hours(): number;
    /** The world seed — from /dev/world at boot; a change re-arms all. */
    setSeed(seed: number): void;
    /**
     * Compose one chunk exactly as the server does: procedural worldgen
     * first, then the draft zone overlaid (worldSource.overlayZone
     * semantics, mirrored: TILE_SKIP cells transparent — elev included;
     * detail TILE_SKIP → 0; a zone with no elev layer levels its ground).
     */
    private composeChunk;
    /**
     * Everything is stale — zone adopted, origin/size changed, seed or
     * geography moved, undo swapped the document. Chunks regenerate
     * lazily through ensureVisible, so the cost lands only on the view.
     */
    rebuildAll(): void;
    /** An edit touched this LOCAL-tile rect: recompose its chunks. */
    invalidateRect(x0: number, y0: number, x1: number, y1: number): void;
    /** Recompose dirty chunks (bounded per frame mid-stroke elsewhere). */
    private flushDirty;
    /** Compose missing chunks inside the view (budgeted — pan-friendly). */
    private ensureVisible;
    /**
     * One editor frame: camera in (world coords + zoom), fresh ground
     * composed, edits flushed, then the game's own painter.
     */
    render(camX: number, camY: number, zoom: number, nowMs: number): void;
}
export {};
//# sourceMappingURL=stage.d.ts.map
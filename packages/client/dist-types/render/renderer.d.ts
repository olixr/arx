import { type Vec2 } from '@devcraft/shared';
import type { ClientGame } from '../game/clientGame.js';
import { Particles } from './particles.js';
export declare class Camera {
    x: number;
    y: number;
    scale: number;
    worldToScreen(wx: number, wy: number, w: number, h: number): Vec2;
    screenToWorld(sx: number, sy: number, w: number, h: number): Vec2;
}
export declare class Renderer {
    private readonly canvas;
    readonly camera: Camera;
    readonly particles: Particles;
    private readonly ctx;
    private readonly baked;
    private readonly anims;
    private shakeAmount;
    private frameDt;
    private w;
    private h;
    private hitstopUntil;
    private vignetteUntil;
    private zoomPulseAmount;
    private readonly rings;
    private readonly deathGhosts;
    /** A quick camera zoom kick — the killing-blow exclamation point. */
    zoomPulse(amount?: number): void;
    /** A fading, flattening silhouette where something died. */
    addDeathGhost(x: number, y: number, color: string, radius: number): void;
    /** Freeze-frame: animation and particles crawl for a beat on impact. */
    hitstop(seconds: number): void;
    /** Red edge flash when the local player takes damage. */
    flashHurt(): void;
    /** Expanding impact ring at a world position. */
    addRing(x: number, y: number, color: string, maxR?: number): void;
    /** Placement preview set by the build mode; null when inactive. */
    buildGhost: {
        tx: number;
        ty: number;
        valid: boolean;
        color: string;
    } | null;
    constructor(canvas: HTMLCanvasElement);
    shake(amount: number): void;
    private animFor;
    private resize;
    render(game: ClientGame, frameDt: number): void;
    /**
     * While the bow is drawn, a dotted guide extends along the aim showing
     * how far the arrow will fly at the current charge — it grows and
     * firms up as the draw deepens. Essential for right-stick aiming.
     */
    private drawAimGuide;
    /** Fallen silhouettes: pop up slightly, then flatten and fade away. */
    private drawDeathGhosts;
    /** Expanding impact rings — crisp stroked circles, quick and gone. */
    private drawRings;
    /** Hard red edge bands when the local player is hurt. */
    private drawVignette;
    private detailAt;
    private visibleTileBounds;
    private drawGroundChunks;
    private evictBaked;
    private evictAnims;
    private static readonly WALL_TILES;
    private collectRaisedTiles;
    /**
     * Walls: continuous top mass with rounded exposed corners, a darker
     * front face where the wall meets open ground, and a hard shadow.
     */
    private wallItem;
    /** Trees, rocks, stations — the object layer, redrawn with character. */
    private objectItem;
    private collectEntities;
    private humanoidItem;
    private drawMiniHp;
    private npcItem;
    private dropItem;
    private projectileItem;
    private drawBuildGhost;
    private drawActionProgress;
    private drawFloaties;
    private drawHpBar;
}
//# sourceMappingURL=renderer.d.ts.map
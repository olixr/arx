import { type Vec2 } from '@devcraft/shared';
import type { ClientGame } from '../game/clientGame.js';
import { Particles } from './particles.js';
export declare class Camera {
    x: number;
    y: number;
    scale: number;
    /**
     * Camera pitch: an orthographic camera tilted down at the flat world
     * compresses the ground plane UNIFORMLY (cos of the pitch angle) —
     * every row the same, which is why the ground reads flat and stable.
     * Vertical heights render at full scale; that contrast IS the tilt.
     * ~0.6 ≈ a camera at ~37° above the horizon — down at shoulder
     * height with the world, not overhead.
     */
    readonly yScale = 0.6;
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
    /** Emissive glow requests queued during the frame, composited last. */
    private readonly glows;
    /**
     * Perspective lean, applied PER VERTEX: a point `heightTiles` above
     * the ground at screen column `x` lands at `leanX(x, h)` — an affine
     * horizontal scale of that height-layer about the screen center.
     * Because it's affine, two structures sharing an edge share exactly
     * the same leaned edge: runs of walls, trunks meeting canopies, and
     * abutting crowns can never crack, at any lean strength.
     */
    private leanX;
    /**
     * Enter the leaned frame for a whole layer at a given height: after
     * this transform, drawing FOOTPRINT coordinates paints them lifted by
     * `heightTiles` and leaned coherently. Pair with ctx.restore().
     */
    private beginHeightLayer;
    constructor(canvas: HTMLCanvasElement);
    shake(amount: number): void;
    private animFor;
    private resize;
    render(game: ClientGame, frameDt: number): void;
    /**
     * Emissive bloom: campfires, furnace mouths, portals, and magic bolts
     * pour additive light over the scene. Sold with plain radial
     * gradients under `lighter` compositing — no shader required.
     */
    private drawGlows;
    /** A magic projectile advertises its own glow (called during collect). */
    queueGlow(x: number, y: number, r: number, rgb: string, a: number): void;
    /**
     * Tilt-shift: the top and bottom of the frame soften like a macro
     * photo of a miniature — the single cheapest "this is a diorama with
     * real depth" signal there is. Overlapping self-drawImage strips with
     * canvas blur filters; skipped cleanly where filters are unsupported.
     */
    private applyTiltShift;
    /**
     * Color grade: warm light from the top of the frame, cool settle at
     * the bottom, plus a quiet corner vignette. Together with tilt-shift
     * this is the "curated camera" over the raw painter output.
     */
    private drawGrade;
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
    /**
     * The forest is a character, not a texture. Five species with bespoke
     * trunks and multi-lobe canopies, all riding one WORLD-SPACE wind
     * field — waves long enough that a grove sways together and you can
     * watch a gust travel across the treeline.
     */
    /**
     * The wind field, sampled in WORLD coordinates (never screen — tying
     * phase to the camera made walking "gust" the forest). Two traveling
     * waves (λ ≈ 26 and 63 tiles) keep neighbouring trees in near-phase;
     * a slow smooth gust envelope swells and fades over ~10s and adds a
     * downwind lean as it peaks. There is no squared term and no random
     * phase — nothing can snap.
     */
    private windAt;
    /**
     * Species: canopy lobes + limbs in tile units, a bespoke trunk style,
     * and their own bark/leaf palettes. Tile.Tree picks 0-3 by hash;
     * Tile.TreeOak is always the oak.
     */
    private static readonly TREE_SPECIES;
    private drawTree;
    /** Bespoke trunk painters — every species stands differently. */
    private drawTrunk;
    private drawTreeShadow;
    /**
     * Felled trees: the cut bites (shudder) → gravity takes it (topple,
     * with per-tree final angle and a north/south drift so no two falls
     * match) → the crown lands (bounce, leaf burst, heavy rolling dust)
     * → the log RESTS on the ground → it breaks down into chunky debris
     * and dust and is gone. ~3.1 s of consequence, not a blink.
     */
    private readonly fallingTrees;
    addFallingTree(tx: number, ty: number, oak: boolean, dir: number): void;
    private static readonly FALL_MS;
    private collectFallingTrees;
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
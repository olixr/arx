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
    /** The game being rendered this frame (for world lookups in painters). */
    private game;
    /** Fires once per tool-impact while someone gathers ('tree' | 'rock'). */
    onGatherImpact: ((kind: string) => void) | null;
    /** Nearest crafting station around a world position, if any. */
    private findStation;
    /** Nearest gatherable node around a world position, if any. */
    private findGatherNode;
    shake(amount: number): void;
    /**
     * Screen-space rise (in TILES; multiply by scale for px) of the
     * ground under a world position. Plateau tops rise level·ELEV_H; a
     * stair tile interpolates from its low mouth to its high edge, so
     * feet climb tread by tread. Everything drawn in the world asks this
     * one function.
     */
    renderLift(x: number, y: number): number;
    /** worldToScreen that also rides the terrain lift under the point. */
    private liftedWTS;
    /**
     * Screen → world with elevation: a click on a plateau top must land
     * on the plateau, not on the (hidden) ground two tiles south. Try
     * each level's inverse and accept the one whose terrain agrees.
     */
    pickWorld(sx: number, sy: number): Vec2;
    /** Lifted plateau surfaces as y-sorted items (real occluders). */
    private collectElevatedGround;
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
     * A cliff face: the exposed south wall of a plateau rim tile,
     * dropping (myLevel − southLevel)·ELEV_H to the ground below. The
     * crown is NOT drawn here — the lifted terrain band paints the
     * plateau surface right over the rim, marching-squares contour and
     * all — so the face is pure landform: bedded strata, cracks, a
     * shadowed base with scree. Rim tiles with no southern exposure
     * return null (nothing of them is visible but the crown).
     */
    private cliffItem;
    /**
     * A stone stair crossing the cliff line: chamfered treads climbing
     * from the low mouth to the plateau brink, framed by the flanking
     * cliff faces. Entities standing on the tile ride renderLift(), so
     * feet land tread by tread.
     */
    private rampItem;
    private static readonly ORE_STYLES;
    /**
     * A mining node is a FORMATION, not a pebble: a squat faceted outcrop
     * of two or three boulders in the same shape language as the cliffs —
     * dark south faces under flat lit caps — with the metal laid into the
     * main face as an angular seam of chunky nuggets. Every metal reads
     * at a glance: warm copper with verdigris flecks, pale flat tin,
     * rust-banded iron, glossy black coal, and gold that catches the sun
     * on a slow pulse. Depleted formations keep their mass but go dull,
     * cracked, and empty.
     */
    private drawRockFormation;
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
    private windField;
    private static readonly TREE_SPECIES;
    private static speciesOf;
    /** Fill a tapered spine (centreline + width profile) as a bark shape. */
    private fillSpine;
    /**
     * Build a trunk/branch centreline from base to a target, curving with
     * `bow` (sideways bulge), `lean` (constant), and `gnarl` (deterministic
     * wobble), then displaced by the wind cantilever `disp(hf)`.
     */
    private spine;
    private drawTree;
    /** Average centre of a lobe cluster (tiles), for fork branch targets. */
    private clusterCentre;
    private drawTreeShadow;
    /**
     * A felled tree: shudder → topple (varied azimuth) → impact with a
     * rolling wall of dust → it lies on the ground for a beat → it breaks
     * apart into log chunks and a last billow of dust. Timeline in ms.
     */
    private readonly fallingTrees;
    addFallingTree(tx: number, ty: number, oak: boolean, dir: number): void;
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
import { Tile, type Vec2 } from '@devcraft/shared';
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
    private static readonly FACE_SEGS;
    private collectCliffFaces;
    /** One contour segment extruded into a face curtain (level -> level-1). */
    private cliffFaceItem;
    /**
     * Wall THICKNESS for a north-south contour edge. The plane itself is
     * edge-on to the orthographic camera, so we cheat a thin dark sliver
     * onto the outward side: faces terminate into it instead of cutting
     * off naked, and jogged rims read as one continuous mass.
     */
    private cliffSideItem;
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
    private rampItem;
    private static readonly ORE_STYLES;
    /** Irregular low-poly mass: dark face, lifted flat cap, lit NW facet. */
    private rockMass;
    /**
     * One BIG faceted ore block: deep-toned frame, bright crystal face,
     * specular slab. The blocks are the protagonists of a node - sized
     * to read from across the screen, several of them jutting past the
     * host rock's silhouette.
     */
    private oreBlock;
    /** A four-point star twinkle - the "this is mineable" beacon. */
    private sparkle;
    /** Staggered twinkle window: brief flash once per period. */
    private static twinkle;
    /** Loose chips scattered at a formation's feet - grounds the mass. */
    private baseScatter;
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
    private readonly breakingRocks;
    /**
     * A mined-out node doesn't blink into its depleted state — it
     * CRUMBLES: the formation shudders, sinks, and shatters into flying
     * fragments and a rolling dust cloud that covers the tile swap.
     */
    addRockBreak(tx: number, ty: number, tile: Tile): void;
    private collectBreakingRocks;
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
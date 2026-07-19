import { Tile, type Vec2 } from '@devcraft/shared';
import type { ClientGame } from '../game/clientGame.js';
import { Particles } from './particles.js';
import { InteriorMap } from './interiors.js';
/** Player zoom bounds: 1 = the classic framing (also the default). */
export declare const ZOOM_MIN = 0.85;
export declare const ZOOM_MAX = 2;
export declare class Camera {
    x: number;
    y: number;
    scale: number;
    /** The scale zoom multiplies — never changes. */
    readonly baseScale: number;
    /**
     * Player zoom: 1 = the classic framing, >1 pulls in for intimate
     * play (bigger targets, more readable for kids), slightly <1 widens.
     * `zoom` glides toward `targetZoom` each frame; everything downstream
     * reads `scale`, so the whole world breathes with it.
     */
    zoom: number;
    targetZoom: number;
    setZoom(z: number): void;
    stepZoom(factor: number): void;
    /** Per-frame glide toward the target; call once, before drawing. */
    tickZoom(dt: number): void;
    /**
     * Camera pitch: an orthographic camera tilted down at the flat world
     * compresses the ground plane UNIFORMLY (cos of the pitch angle) —
     * every row the same, which is why the ground reads flat and stable.
     * Vertical heights render at full scale; that contrast IS the tilt.
     * ~0.6 ≈ a camera at ~37° above the horizon — down at shoulder
     * height with the world, not overhead.
     */
    readonly yScale = 0.6;
    /**
     * The camera's screen-space origin, SNAPPED to whole pixels. Every
     * layer then translates by the same integer each frame — terrain
     * blits, wall geometry and sprites move in lockstep. With a subpixel
     * origin, anything that pixel-rounds its own coordinates (walls,
     * stair seams) crosses pixel boundaries on different frames than the
     * smoothly-resampled ground and appears to oscillate on its own
     * layer. Standard pixel-camera discipline: snap once, at the source.
     */
    private originX;
    private originY;
    worldToScreen(wx: number, wy: number, w: number, h: number): Vec2;
    screenToWorld(sx: number, sy: number, w: number, h: number): Vec2;
}
export declare class Renderer {
    private readonly canvas;
    readonly camera: Camera;
    readonly particles: Particles;
    private readonly grass;
    private readonly lighting;
    /** Derived building-interior regions (roofs, indoor light, facades). */
    readonly interiors: InteriorMap;
    /** Baked roof rings keyed by footprint signature (stable across
     *  worldVersion bumps so an unchanged house never re-bakes). */
    private readonly roofBakes;
    /** Per-roof fade state: eases to 0.12 while you stand inside. */
    private readonly roofAlpha;
    private localRegion;
    /** Regions discovered in view this frame (feeds interior lighting). */
    private visibleRegions;
    /** The frame's sky sample — every shadow and light reads this. */
    private sky;
    /** Scene lights gathered this frame (tiles, projectiles, flames). */
    private readonly lights;
    /** Ground shadows batch here, composited once at the sky's alpha. */
    private readonly shadowLayer;
    private readonly shadowLayerCtx;
    /** Where shadow helpers draw right now (batch layer or the frame). */
    private sdw;
    private sdwLayerAlpha;
    /**
     * Point lights that CAST this frame (screen space, strongest first).
     * Bodies and organic props near one throw an extra shadow lobe away
     * from it — walk between two lamps and you drag two shadows.
     */
    private frameLights;
    /**
     * Moving lights (projectiles, totems, blasts) announce themselves
     * via queueGlow DURING the draw pass — too late for this frame's
     * shadow prepass, so they cast one frame later. At 120fps the lag
     * is invisible; the fireball's shadow sweep is not.
     */
    private prevDynamic;
    private nextDynamic;
    private ctx;
    /**
     * The outline "shader": entities paint FLAT (no baked strokes), and
     * this post-pass rings each living body's silhouette by dilating its
     * alpha — one uniform line around character, cape, staff, and legs
     * alike, applied dynamically so it's a player preference, not paint.
     */
    outlineOn: boolean;
    private readonly outlineA;
    private readonly outlineB;
    private readonly outlineACtx;
    private readonly outlineBCtx;
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
    /**
     * Ragdoll corpses: the death beat. At the death instant the victim's
     * ACTUAL rendered body (same painters, same outline pass — a true
     * 1:1) is captured into a sprite, which then launches along the
     * killing blow, tumbles, bounces in dust kicks, eases flat where it
     * stops, and fades as its soul wisps away. Physics run on frameDt,
     * so the kill's hitstop gives every ragdoll a slow-motion launch.
     */
    private readonly corpses;
    /** A quick camera zoom kick — the killing-blow exclamation point. */
    zoomPulse(amount?: number): void;
    /** A fading, flattening silhouette where something died. */
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
    /**
     * Loot HUD inputs, fed by main.ts each frame: the pointer (for
     * hovering bags), and the reveal hold (Alt / left trigger) that pops
     * a label over every drop on screen.
     */
    lootHud: {
        mx: number;
        my: number;
        mouse: boolean;
        showAll: boolean;
    };
    /** Visible drops this frame — the loot-label pass reads these. */
    private frameLoot;
    /** Emissive glow requests queued during the frame, composited last. */
    private readonly glows;
    /** Arrows standing in the ground/walls; fade out near `until`. */
    private readonly stuckArrows;
    /** Arrows riding a living NPC (offsets in tiles off its ground point). */
    private readonly npcArrows;
    /** Projectiles already given their muzzle flash. */
    private readonly projSeen;
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
     * World-y whose liftedWTS projection sits PROJ_AIR tiles of SCREEN
     * height above the ground point at `y`. World-y offsets render
     * squashed by the camera pitch (yScale), so anything that must align
     * with a screen-lifted sprite (projectile trails, muzzle/impact
     * bursts, glows) divides the squash back out — a raw `y - PROJ_AIR`
     * rides ~40% low and the trail visibly detaches from the shot.
     */
    private projAirWorldY;
    /** Screen-px offset of a shadow cast from `hTiles` above the ground. */
    private castOffset;
    /**
     * Gather the frame's shadow-casting lights: strong scene lights plus
     * last frame's dynamic ones, gated by darkness (point-light shadows
     * only read once the sun stops washing them out), strongest first,
     * capped so a lamp-ringed plaza stays cheap.
     */
    private buildFrameLights;
    /**
     * The shadow throws a point at screen (px, py) receives from nearby
     * lights: world-space unit direction AWAY from each light, a length
     * that stretches as the object sits deeper in the pool's falloff,
     * and an alpha that dies at the pool's rim. `minD` excludes a
     * fixture shadowing itself (props) while letting a body stand right
     * up against a fire (entities).
     */
    private lightThrows;
    /** Arm the shadow target for a cast fill; null while nothing casts. */
    private beginCastFill;
    /** Arm for a grounding contact fill — never fully disappears. */
    private beginContactFill;
    /** One silhouette throw: flattened blob + footprint smear, one path. */
    private blobShadowPath;
    /**
     * A mass `hTiles` up throws its silhouette: once along the sun (or
     * moon), and once away from each nearby pool of light — a tree by a
     * lamp wears both. Each throw is one path, one fill, so a blob and
     * its smear can never double-darken each other.
     */
    private castBlob;
    /** A prism's ground shadow: its base edge extruded along the sun. */
    private castEdgeQuad;
    /**
     * A body's grounding: foot ellipse, a low lobe cast along the sun,
     * and a lobe away from every nearby light — step up to a campfire
     * and your shadow leans back from the flames; stand between two
     * lamps and you drag a pair.
     */
    private castBody;
    /** A small thing's plain contact ellipse (drops, summons). */
    private castContact;
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
     * The frame's standing light sources, from one tile scan: each pushes
     * an emissive glow (additive bloom) AND a WorldLight (lightmap punch,
     * flame-gated so man-made fire only carries the scene after dark).
     * Bloom alpha swells with darkness — fires read hotter at night.
     */
    private collectStaticLights;
    /**
     * Emissive bloom: campfires, furnace mouths, portals, and magic bolts
     * pour additive light over the scene. Sold with plain radial
     * gradients under `lighter` compositing — no shader required.
     */
    private drawGlows;
    /**
     * A magic projectile (or totem, or spark) advertises its own glow.
     * After dark the same source also lights the ground around it — a
     * bolt streaking across a night field carries its own pool of light.
     */
    queueGlow(x: number, y: number, r: number, rgb: string, a: number): void;
    /**
     * Tilt-shift: the top and bottom of the frame soften like a macro
     * photo of a miniature — the single cheapest "this is a diorama with
     * real depth" signal there is. Overlapping self-drawImage strips with
     * canvas blur filters; skipped cleanly where filters are unsupported.
     */
    private applyTiltShift;
    /**
     * Color grade: the "curated camera" over the raw painter output,
     * and it tells the time. The horizon haze burns orange at dawn and
     * dusk and sinks to indigo at night; the warm top-light lives and
     * dies with the sun; the vignette closes in after dark.
     */
    private drawGrade;
    /**
     * While the bow is drawn, a dotted guide extends along the aim showing
     * how far the arrow will fly at the current charge — it grows and
     * firms up as the draw deepens. Essential for right-stick aiming.
     */
    private drawAimGuide;
    /** Expanding impact rings — crisp stroked circles, quick and gone. */
    private drawRings;
    /** Hard red edge bands when the local player is hurt. */
    private drawVignette;
    private detailAt;
    private visibleTileBounds;
    /**
     * Bake resolution follows the zoom tier: past ~1.05× the 32px bakes
     * would upscale into mush, so chunks re-bake at 64px/tile. Keyed off
     * targetZoom (not the gliding zoom) so a zoom flips the tier once.
     */
    private bakePx;
    private drawGroundChunks;
    private evictBaked;
    private evictAnims;
    /** Wall-run auto-tiler membership — shared law (tiles.ts). */
    private static readonly WALL_TILES;
    /** What stops lamplight — shared law (tiles.ts). */
    private static readonly LIGHT_BLOCKERS;
    private collectRaisedTiles;
    /**
     * Walls: continuous top mass with rounded exposed corners, a darker
     * front face where the wall meets open ground, and a hard shadow.
     */
    private wallItem;
    /**
     * How veiled a doorway's dark interior fill is: 1 far away, easing
     * to 0 as any body nears the threshold — the door "opens" for
     * whoever approaches, no swinging leaf needed.
     */
    private doorVeil;
    /**
     * A WALKABLE framed opening in a wall run: jambs, a header beam
     * (stone gets 45°-cut haunches — the brutalist arch), and the run's
     * unbroken crown. The frame sorts at ty+1 like its wall neighbours,
     * and a body standing in the door tile sorts BEFORE that — so the
     * player stays visible through the opening and ducks behind the
     * header. The pass-under read falls out of the existing y-sort.
     */
    private doorwayItem;
    /**
     * A freestanding walk-through arch: thicker piers than a doorway,
     * capital blocks, its own crown. Adjacent arches merge into
     * colonnades (piers on the shared edge are skipped).
     */
    private archItem;
    /**
     * A freestanding column: faceted plinth, tapered shaft that leans
     * with the camera, chamfered capital. Solid, walk-around, y-sorted
     * like a prop.
     */
    private pillarItem;
    /**
     * A half-height railing: posts, a top rail, baluster slats. Rails
     * merge with rails only — a railing never joins a wall mass.
     */
    private railItem;
    /**
     * Row-run rects of every enclosed interior in view + the indoor
     * ambient: a roof blocks the sky, so rooms sit at a dim cool base
     * with a whisper of daylight — lamps and hearths carry the rest.
     */
    private interiorLighting;
    /** Story count → facade wall height in tiles (upper floors run a
     *  touch shorter than the ground story, as real buildings do). */
    private wallHeightFor;
    /** The interior region a wall-run tile fronts: any adjacent
     *  enclosed floor claims it (per-frame cached in the InteriorMap). */
    private wallRegion;
    /**
     * Roofs as y-sorted per-row strips — the plateau-crown law applied
     * to architecture. Each ring canvas slices per footprint row and
     * blits lifted by wall height + ring rise: entities inside vanish
     * beneath it, entities south draw over it, and the whole mass fades
     * to a ghost while YOU are the one inside.
     */
    private collectRoofs;
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
    /**
     * SQUARE-CORNER contour variant, used for dual cells that touch a
     * stair tile. A beveled (diagonal) corner cuts a quarter-tile into
     * the neighbouring column — beside a stair that hangs the corner's
     * curtain over the flight. Square corners hug the tile boundary, so
     * the stair's column stays sacrosanct: walls turn AT its edge, with
     * an edge-on side piece (M = cell center = the shared tile corner).
     */
    private static readonly SQUARE_SEGS;
    private collectCliffFaces;
    /** One contour segment extruded into a face curtain (level -> level-1). */
    private cliffFaceItem;
    /**
     * Wall THICKNESS for one row-slice of a north-south rim run (world
     * x, world y s0..s1, flags marking the run's true ends). The plane
     * itself is edge-on to the orthographic camera, so we cheat a strip
     * of the wall's outward flank into view: faces terminate into it and
     * jogged rims read as one continuous mass. Slices partition the
     * run's screen extent exactly (each covers [wts(s0)-topLift,
     * wts(s1)-topLift]; the bottom slice extends to the base), so the
     * flat fill tiles seamlessly. Each slice sorts EARLY — a zero-width
     * plane must lose every overlap contest against rocks, props and
     * entities standing beside it; only the sky above them shows wall.
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
    /**
     * The worn LANDING where a south-descending flight opens onto the
     * crown: a dirt patch painted over the lifted surface just north of
     * the stair top, so the path visibly continues onto the plateau
     * instead of the grass stopping dead at the top tread. Its own item:
     * it must draw after that row's crown slice but BEFORE anything
     * standing on it.
     */
    private rampLandingItem;
    /**
     * The worn APRON where the flight's mouth meets the ground below: a
     * fan of packed earth spilling from the bottom step. Its own item
     * (mirror of the landing) — sorted just after the mouth row's ground
     * so it survives elevated shelves, but before anything standing on it.
     */
    private rampApronItem;
    private static readonly ORE_STYLES;
    private static readonly BARREN_STONE;
    private static readonly BARREN_DIM;
    private static readonly ROCK_TILES;
    /**
     * One rectangular stone block, spoken in the cliff dialect: broad
     * front face, lit cap strip across the top, shaded lane down the
     * off-light flank — hard 45° top chamfers, flat fills, one crisp
     * dark outline. `lean` shears the top edge sideways so stacked
     * blocks read geologic, never machined. Returns the silhouette so
     * callers can clip veins INTO the stone.
     */
    private stoneBlock;
    /**
     * One TALL hewn monolith: a single tapering silhouette with a
     * stepped ledge on each flank — the "you walk up against it"
     * landmark mass. Same flat grammar as stoneBlock (lit cap, shaded
     * lane, one outline) but drawn as ONE rock, so height never reads
     * as a pancake tower of crates. Returns the silhouette so callers
     * can clip veins INTO the stone.
     */
    private monolith;
    /**
     * One BIG rectangular ore node: a deep-toned frame around a bright
     * mineral face, capped with a hard square glint. The nodes are the
     * protagonists of a deposit — blocky, rigid, sized to read from
     * across the screen, planted proud of the host stone.
     */
    private oreNode;
    /** A four-point star twinkle - the "this is mineable" beacon. */
    private sparkle;
    /** Staggered twinkle window: brief flash once per period. */
    private static twinkle;
    /** Blocky spall scattered at a formation's feet - grounds the mass. */
    private rubble;
    /**
     * MINING NODES — every metal is a bespoke LANDMARK in the brutalist
     * dialect: rectangular blocks, hard chamfers, flat fills, no
     * pebble-circles. Copper raises a rust obelisk with a seam of raw
     * metal climbing its full height. Tin lays an oblong ridge crested
     * by a march of cubic crystals. Iron stacks banded slabs into a
     * natural anvil. Coal drives a jagged black seam-wall up between
     * grey shoulders. Gold splits a standing pillar with a quartz vein
     * crowned in nuggets. Deposits stand player-tall or better, and all
     * of them twinkle at idle — the eye finds a mineable node before
     * the tooltip does. Every formation mirrors and resizes off its
     * world hash so no two reads stamped.
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
    /**
     * A growing crop plant. Flat vector language: triangle blades, facet
     * blooms, chunky puffs — every species reads at a glance, and ripe
     * stages visibly ask to be picked.
     */
    private drawCropPlant;
    /** Trees, rocks, stations — the object layer, redrawn with character. */
    private objectItem;
    /**
     * Every body the grass should feel: players and NPCs, own player
     * included. The grass system derives velocities itself (it remembers
     * last positions per id), so this is just who-is-where.
     */
    private collectDisturbers;
    private collectEntities;
    private humanoidItem;
    private drawMiniHp;
    /** Eight-tap alpha dilate → tinted ring under the sprite. */
    private static readonly OUTLINE_TAPS;
    private paintOutlined;
    private npcItem;
    /**
     * Ground loot. Coins pile up as actual gold; everything else is a
     * cinched leather loot bag whose topper tells you the cargo at a
     * glance — a blade for weapons and tools, arrow shafts for ammo, a
     * draped cloth for wearables, a round loaf for food, a stitched
     * patch in the item's color for raw goods. High-value drops shimmer.
     */
    private dropItem;
    /**
     * Loot labels — the "what is that" layer over ground drops:
     * - hovering a bag with the mouse names it instantly;
     * - anything within arm's reach fades its label in (the read that
     *   works with no pointer at all — pads and touch);
     * - holding the reveal (Alt / left trigger) names every drop on
     *   screen, the ARPG sweep-the-battlefield gesture.
     * Labels stack upward when drops share a column so none overlap.
     */
    private drawLootLabels;
    private projectileItem;
    /**
     * Settle every projectile that ended flight this frame: arrows stand
     * in the ground (or ride the NPC they hit), magic fizzles in a burst.
     * Dead NPCs shed their arrows onto the ground where they fell.
     */
    private consumeProjectileAftermath;
    /**
     * Freeze the victim's exact on-screen body — painters plus the
     * dilated outline ring — into a standalone sprite, anchored to its
     * ground point. The same scratch pipeline as paintOutlined.
     */
    private captureBodySprite;
    /** Turn the defeated body itself into a ragdoll along the blow. */
    private spawnCorpse;
    /** Ragdoll physics: fly, bounce with dust, come to rest, fade away. */
    private tickCorpses;
    /** The tumbling body itself — the captured 1:1 sprite in flight. */
    private corpseItem;
    /** One arrow standing where it landed, angled with its flight line. */
    private stuckArrowItem;
    /** The pincushion overlay: arrows riding a living NPC's body. */
    private npcArrowsItem;
    /**
     * Screen-space arrow-in-a-surface: buried head at (sx, sy), shaft
     * rising back against the flight line, red fletching at the tail.
     * `dir` is the WORLD flight angle — the tail leans back along its
     * SCREEN projection, so the stick angle references the actual shot.
     */
    private drawStuckArrow;
    /**
     * Ambient status VFX riding an entity: embers for burn, drifting
     * frost for chill, spark jitter for shock, falling drips for bleed.
     * Spawn rates are frame-time scaled so effect density is fps-stable.
     */
    private statusAmbience;
    /** Placed summons: totem, snare trap, straw decoy. */
    private summonItem;
    /** Server combat FX: telegraphs, novas, blasts, reactions, summons. */
    private drawCombatFx;
    private drawBuildGhost;
    private drawActionProgress;
    private drawFloaties;
    private drawHpBar;
}
//# sourceMappingURL=renderer.d.ts.map
import { Tile, type Vec2 } from '@devcraft/shared';
import type { ClientGame } from '../game/clientGame.js';
import { Particles } from './particles.js';
import { Debris, type SmashKind } from './debris.js';
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
    /** Smashed-prop chunk bodies — pooled, wall-aware, self-clearing. */
    readonly debris: Debris;
    private readonly grass;
    private readonly lighting;
    /** Derived building-interior regions (cutaway, facades, windows). */
    readonly interiors: InteriorMap;
    private localRegion;
    /** Regions discovered in view this frame (feeds the shadow shelter). */
    private visibleRegions;
    /** The frame's sky sample — every shadow and light reads this. */
    private sky;
    /** Surface→deep-cave ambient blend, eased over ~1s of real time.
     *  0 = surface sky rules, 1 = the fixed underground ambient. */
    private ugBlend;
    /** Local player's render position + the underground gate, sampled
     *  once per frame — the dungeon wall cutaway reads these. */
    private ugCutOn;
    private ownPX;
    private ownPY;
    /** Scene lights gathered this frame (tiles, projectiles, flames). */
    private readonly lights;
    /** Ground shadows batch here, composited once at the sky's alpha. */
    private readonly shadowLayer;
    private readonly shadowLayerCtx;
    /** Where shadow helpers draw right now (batch layer or the frame). */
    private sdw;
    private sdwLayerAlpha;
    /** True while a silhouette mask bake replays a painter offscreen —
     *  gates side effects (glow queues, sparkles) out of the bake. */
    private bakingMask;
    /** Cached silhouette masks for TRUE-FORM cast shadows, keyed per
     *  formation; cleared wholesale when the cap trips (rebakes are
     *  cheap and only visible formations rebake). */
    private readonly shadowMasks;
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
    /**
     * Water enhancement toggles (settings menu, persisted). Both are
     * ADDITIVE layers over the base water — turning them off costs
     * nothing visually except the enhancement itself: reflections mirror
     * living bodies into the surface; waterFxFull runs the swell bands,
     * caustics and rolling shore wash (off = the classic quiet surface).
     */
    reflectionsOn: boolean;
    waterFxFull: boolean;
    /** A body entered or left shallow water this frame (splash sfx). */
    onSplash: ((x: number, y: number, entering: boolean) => void) | null;
    /**
     * Last frame's reflectable bodies (item + world anchor). The
     * reflection pass replays them ONE frame late, early in the frame, so
     * mirrors land under foam/glints/grass without reordering the frame —
     * at 120fps the lag is a physical impossibility to see. Waders
     * reflect too (their wrapped draw mirrors its own waterline clip).
     */
    private reflectables;
    /** Offscreen layer the mirrors render into OPAQUE (with the outline
     *  shader), then composite onto the water in ONE alpha blend — a
     *  reflection is a single cohesive image, never a stack of
     *  translucent polygons showing through each other. */
    private readonly reflLayer;
    private readonly reflLayerCtx;
    /** Screen-bounds water region path cache (world coords), see waterClipFor. */
    private waterClip;
    /** Per-body wading state: splash edges + wake phase. */
    private readonly wadeStates;
    private readonly outlineA;
    private readonly outlineB;
    private readonly outlineACtx;
    private readonly outlineBCtx;
    private readonly baked;
    private readonly anims;
    private shakeAmount;
    /**
     * UI view shift, in screen px: a docked screen (the character case)
     * asks the camera to frame the player left of it, so the LIVE rig
     * is the character preview. Glides both ways — opening the case
     * reads as the world sliding over, not a cut.
     */
    private viewShiftX;
    private viewShiftTargetX;
    /**
     * True while the player zoom is gliding toward its target. Every
     * cached sprite/shadow/chunk holds its bake and scale-blits for the
     * ride: a glide crosses the 20% scale-drift threshold on the whole
     * herd at once, and re-baking mid-glide is doubly wasted — the same
     * sprites re-bake AGAIN at the settled scale (measured 17.6ms p95
     * on a 2.0→0.85 glide; pure blits hold the frame budget). Missing
     * sprites still bake — a blurry hold beats a hole.
     */
    private zoomGliding;
    private frameDt;
    private w;
    private h;
    private hitstopUntil;
    private vignetteUntil;
    private zoomPulseAmount;
    private readonly rings;
    /**
     * The level-up ceremony: ONE record, ~5.6s of staged show anchored
     * to the live player — light pillar, slow ground rings, a sustained
     * pooled-particle fountain, four climbing orbit sparks and a
     * wheeling crown star, all in gold + the skill's accent color.
     * Zero steady-state allocation: the record is built once at start,
     * every mote rides the pooled particle system, and rings are bornAt
     * stamps in one small array.
     */
    private levelFx;
    private static readonly LEVEL_FX_MS;
    /**
     * Ragdoll corpses: the death beat. At the death instant the victim
     * becomes a limp articulated skeleton (Ragdoll in ragdoll.ts) drawn
     * in the live rig's own dialect. The killing blow launches it — hard
     * hits drag the body back through the scene, chip kills crumple it
     * where it stands — the limbs trail the trunk's momentum, and the
     * whole thing thuds down and SPRAWLS. No spin, no bouncing prop.
     * Physics run on frameDt, so the kill's hitstop gives every ragdoll
     * a slow-motion launch.
     */
    private readonly corpses;
    /** Body-thud hook: the renderer sees the landing, main.ts owns sfx. */
    onCorpseThud?: (heavy: boolean) => void;
    /** A quick camera zoom kick — the killing-blow exclamation point. */
    zoomPulse(amount?: number): void;
    /**
     * Ask the camera to frame the player `px` screen pixels left of
     * center (0 restores the classic centered follow). Set every frame
     * by main while a docked screen owns the right of the viewport.
     */
    setViewShift(px: number): void;
    /** A fading, flattening silhouette where something died. */
    /** Freeze-frame: animation and particles crawl for a beat on impact. */
    hitstop(seconds: number): void;
    /** Red edge flash when the local player takes damage. */
    flashHurt(): void;
    /** Expanding impact ring at a world position. */
    addRing(x: number, y: number, color: string, maxR?: number): void;
    /**
     * Kick off the level-up ceremony at the player's feet. The opening
     * crack fires here (flash ring + streak column + shard fan + zoom
     * kick); everything after is staged per frame in drawLevelCeremony,
     * following the live player.
     */
    startLevelCeremony(x: number, y: number, accent: string): void;
    /**
     * Scheduled aftershock beats — the SECOND read of a detonation. A
     * blast is not one frame: the flash lands, then the dust wave rolls
     * out, then embers settle. Records, not closures — no capture churn.
     */
    private readonly fxBeats;
    private queueBeat;
    /** Fire every due aftershock beat. Called once per frame. */
    private runFxBeats;
    /** Lingering ground marks left by detonations (scorch, rime, cracks…). */
    private readonly fxDecals;
    /**
     * The world remembers the hit: leave the style's mark on the ground.
     * Marks live ~5s in three acts — ACTIVE (the aftermath still burns,
     * grows, glows), SETTLED (a quiet residue), FADE (the turf reclaims
     * it) — so a fight leaves a readable history behind it.
     */
    private addDecal;
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
    /**
     * Screen rects the loot labels landed on last pass — the click
     * affordance. A label IS its drop's hitbox (bags overlap in a pile;
     * their labels never do), with the bag sprite as a fallback target.
     */
    private lootPlates;
    /** Emissive glow requests queued during the frame, composited last. */
    private readonly glows;
    /** Arrows standing in the ground/walls; fade out near `until`. */
    private readonly stuckArrows;
    /** Spent shots arcing down at the end of flight — a quarter-second of
     *  cosmetic ballistics between "flying" and "standing in the dirt". */
    private readonly fallingShafts;
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
    /** The world's outline color — the dark edge entities and props wear. */
    private static readonly STRUCT_OUTLINE;
    /**
     * Arm the context to stroke an architecture silhouette: the same
     * bold dark edge the entity ring gives props and characters, drawn
     * as a hard stroke so buildings, doorways, arches, and pillars read
     * with the flat-art edge the rest of the world wears. Only EXPOSED
     * edges are ever stroked (an edge shared with a run-neighbour gets
     * none), so runs stay seamless — only the building perimeter and
     * its openings are ringed.
     */
    private beginStructOutline;
    /**
     * Trace a wall-like mass's crown top edge + its exposed vertical
     * sides into `path` (screen space). `cTop` is the crown's north
     * edge; the left/right sides descend to `leftBot`/`rightBot`.
     * Chamfered north corners (radii rTL/rTR) are followed so the ring
     * hugs the cut. Shared by wall, doorway, and arch painters — each
     * adds its own base/opening edges afterwards.
     */
    private addCrownPerimeter;
    constructor(canvas: HTMLCanvasElement);
    /** The game being rendered this frame (for world lookups in painters). */
    private game;
    /** Fires once per tool-impact while someone gathers ('tree' | 'rock'). */
    onGatherImpact: ((kind: string) => void) | null;
    /**
     * Fires on every humanoid foot touchdown (the leg rig's plant
     * moment). `speed` is the gait vigor in tiles/sec — idle shuffles
     * arrive near zero, so volume can ride it directly.
     */
    onFootstep: ((x: number, y: number, speed: number, isOwn: boolean, sneaking: boolean) => void) | null;
    /** Nearest crafting station around a world position, if any. */
    private findStation;
    /**
     * The stall wardrobe: every market stand draws one bolt of cloth
     * from this roster, keyed by the run's west-anchor tile hash — so a
     * merged stall wears one banner, neighbouring stands differ, and
     * every town's market reads bespoke with zero authoring plumbing.
     */
    private static readonly STALL_BANNERS;
    /**
     * One ware on a stall's display top. Kinds: produce, bread, bottles,
     * cloth bolts, pottery, berry basket — small enough to sit under the
     * awning window, distinct enough to read at market distance.
     */
    private drawStallGood;
    /** Tiles that count as workable stations for interaction heat. */
    private static readonly HEAT_STATION_TILES;
    /**
     * Interaction heat per station tile, 0..1 with an eased attack and a
     * gentler release. Heated by anyone working the station (Craft pose,
     * own player included) and by the local player's open bank/shop/craft
     * panel. Painters layer the in-use choreography over the idle art by
     * reading this — lids glide open, fires flare, beams work harder.
     */
    private readonly stationHeat;
    /** The open station panel's anchor tile (set per frame by main.ts). */
    stationFocus: {
        tx: number;
        ty: number;
    } | null;
    private tickStationHeat;
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
    /** Memoized dock test (Bridge + water within Chebyshev 2), keyed by
     *  tile and cleared on any world change — renderLift is hot and the
     *  25-tile scan must run once per tile, not once per query. */
    private readonly dockMemo;
    private dockMemoVersion;
    private isDockAt;
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
    /** Bake resolution, px per tile — masks scale to the live zoom. */
    private static readonly MASK_S;
    /**
     * Fetch (or bake) a silhouette mask. `paint` replays the object's
     * own painter into the mask canvas with the base anchored at
     * (au, av); the result is flattened to the current shadow color
     * with a hard alpha threshold. Glows/sparkles are gated off during
     * the bake, so time-varying garnish never fossilises into a shadow.
     */
    private shadowMask;
    /**
     * Throw a baked silhouette onto the ground: once along the sun (or
     * moon), once away from each nearby pool of light. The shear maps a
     * mask pixel `h` above the base line to (kx·h, ky·h) past the anchor
     * — tall crowns land at the far tip of the shadow, feet stay glued
     * to the contact line at every hour.
     */
    private castMask;
    /** A rock/ore formation's exact silhouette, thrown as its shadow. */
    private castRockShadow;
    /** A grown plant's silhouette — forage node or farm crop (calm: wind zeroed). */
    private castFloraShadow;
    /**
     * Screen → world with elevation: a click on a plateau top must land
     * on the plateau, not on the (hidden) ground two tiles south. Try
     * each level's inverse and accept the one whose terrain agrees.
     */
    pickWorld(sx: number, sy: number): Vec2;
    /** Lifted plateau surfaces as y-sorted items (real occluders). */
    private collectElevatedGround;
    /** This frame's live-water options — the sky and settings decide. */
    private waterFx;
    /**
     * WATER REFLECTIONS (optional enhancement): living bodies mirror
     * about their own feet into the surface, clipped to the EXACT organic
     * water region (shared contour geometry) so the mirror ends at the
     * painted meander, never at a tile edge. Replays LAST frame's entity
     * paint closures — recorded during collectEntities — early in this
     * frame, so mirrors land under foam, glints, grass and the y-sorted
     * world without restructuring the frame. One frame of lag at 120fps
     * is unseeable; the win is purely-additive layering: toggled off,
     * nothing else in the frame changes.
     */
    private drawReflections;
    /** The water region path over the visible bounds, world coords —
     *  rebuilt only when the camera crosses a tile or the world changes. */
    private waterClipFor;
    /**
     * Water dressing for one living body, the single entry point players,
     * NPCs and the own body all pass through:
     *  - standing in SHALLOWS: the body sinks to the shins behind the
     *    waterline (screen clip at the surface + a sink translate), wears
     *    a ripple collar where it meets the water, pushes wake rings
     *    while moving, and splashes on the way in and out;
     *  - on dry ground NEAR water: records a reflectable so next frame's
     *    mirror pass can lay the body into the surface.
     */
    private dressForWater;
    private animFor;
    private resize;
    render(game: ClientGame, frameDt: number): void;
    /** Deep-cave ambient the underground blend rides to: cool, slightly
     *  desaturated, ~0.79 effective darkness regardless of surface hour. */
    private static readonly UG_AMBIENT;
    /**
     * Blend this frame's sky sample toward the fixed cave ambient.
     * Mutates the object daylightAt() built THIS frame (a fresh sample
     * every render — nothing else aliases it). Sun, moon and shadow
     * alpha die with the blend so tile shadows fade out underground;
     * flame rides to 1 so braziers carry the scene no matter what the
     * surface clock says; darkness is re-derived from the blended
     * ambient so the lightmap gate, glow boosts and grade all agree.
     */
    private applyUnderground;
    /**
     * The frame's standing light sources, from one tile scan: each pushes
     * an emissive glow (additive bloom) AND a WorldLight (lightmap punch,
     * flame-gated so man-made fire only carries the scene after dark).
     * Bloom alpha swells with darkness — fires read hotter at night.
     */
    /** Visible Riftgates this frame — filled by the static-light scan,
     * consumed by the blight-apron pass after the grass under-pass. */
    private readonly portalsInView;
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
    /** 1/3-res frame copy backing the tilt-shift (bilinear up IS the blur). */
    private readonly tiltScratch;
    private readonly tiltScratchCtx;
    /**
     * Tilt-shift: the top and bottom of the frame soften like a macro
     * photo of a miniature — the single cheapest "this is a diorama with
     * real depth" signal there is. DOWNSAMPLE-UPSAMPLE, not ctx.filter:
     * one 1/3-res copy of the frame, then plain band blits back up —
     * bilinear resampling does the softening. A filter blur re-runs a
     * Gaussian pass per band and forces a canvas snapshot each time
     * (~0.5ms/frame at 0.85×); this is six cheap drawImages, and the
     * alpha ramp keeps the graded near-sharp-to-soft read.
     */
    private static readonly TILT_BANDS;
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
    /**
     * The level-up ceremony's world half, staged over 5.6s and anchored
     * to the live player every frame:
     *  - Act 1 (0–0.5s): the pillar of light rises out of the opening
     *    crack, the first ground ring rolls out.
     *  - Act 2 (0.5–4.2s): the show holds court — slow gold/accent
     *    rings every ~0.8s, a sustained mote-and-shard fountain, four
     *    sparks spiraling up the pillar, a wheeling crown star at the
     *    top, and a lightmap glow so the world itself answers.
     *  - Act 3 (4.2–5.6s): one farewell ring and drifting settle motes
     *    while the pillar thins and bows out.
     * Direct draws are a dozen flat shapes; everything thrown rides the
     * pooled particle system — no steady-state allocation.
     */
    private drawLevelCeremony;
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
    /** Bake one chunk (base blit + elevated bands) and cache it. */
    private bakeChunkEntry;
    private evictBaked;
    private evictAnims;
    /**
     * Tree sprite/shadow caches ride the camera: drop entries not drawn
     * for ~2s (scrolled away), and under a hard cap drop the coldest —
     * a zoomed-in sprite is big (~0.4MB), so the cap is what bounds
     * worst-case memory, not the typical count.
     */
    private evictTreeSprites;
    /** Wall-run auto-tiler membership — shared law (tiles.ts). */
    private static readonly WALL_TILES;
    /** Every doorway tile — open and shut, both orientations and widths. */
    private static readonly DOOR_TILES;
    /**
     * SIDE-DOORWAY LAW: a doorway's orientation comes from the wall run
     * it pierces. Wall (or same-doorway run) north AND south with open
     * ground east/west = a SIDE doorway — you walk through it east-west.
     * Anything else keeps the classic south-facing frame.
     */
    private isSideDoorway;
    /**
     * Wall-run neighbour test that ENDS runs at side doorways. A wall
     * north of a side door must show its face (the jamb) and a wall
     * south of one must restart with chamfered crown — merging straight
     * over the opening is exactly what made side doors read as seamless
     * wall. South-facing doorways still merge (their frame carries the
     * run through the opening).
     */
    private wallish;
    /** What stops lamplight — shared law (tiles.ts). */
    private static readonly LIGHT_BLOCKERS;
    /** The stone plinth every timber wall stands on. */
    private static readonly PLINTH_COL;
    /**
     * The wood skin a wall/doorway tile wears (building-keyed — see
     * woodSkins.ts, shared with the floor-plank bake in terrain.ts).
     */
    private woodSkinFor;
    private collectRaisedTiles;
    /**
     * Walls: continuous top mass with rounded exposed corners, a darker
     * front face where the wall meets open ground, and a hard shadow.
     */
    /**
     * DUNGEON CUTAWAY LAW: underground (player y >= UNDERGROUND_Y) there
     * are no interior regions — cavern flood-fills blow past MAX_REGION —
     * so the building cutaway never fires. Instead ANY wall-run tile
     * fronting walkable floor to its NORTH sinks toward the stub while
     * it stands in the player's occlusion window: dy = ty − playerY in
     * ~[0..6] rows south, |dx| ≤ ~10 columns. Returns the cut factor
     * 0 (full height) → 1 (full stub), SMOOTHSTEP-eased over ~2 tiles at
     * every window edge on the CONTINUOUS player position, so walls sink
     * and rise as you walk instead of popping per row. ugBlend scales it
     * so a portal drop fades the cut in with the darkness. Deliberately
     * cheap: a few clamps and multiplies per visible wall, no allocation,
     * nothing cached — the wall painter is live, so a per-frame height
     * is free. Never called above ground (ugCutOn gates every call
     * site); the surface keeps the region-based law untouched.
     */
    private dungeonCut;
    private wallItem;
    /**
     * A wood crown is the top of the squared CAP BEAM the wall carries
     * — a hewn timber back running the length of the run, not a round
     * log (a plate always caps a chinked log stack; you never see bare
     * log backs from above). One quiet read: hard arris shadows where
     * the beam's edges fall away to the faces, a sun-lit spine, long
     * grain streaks, and a RARE butt joint pinned with a peg pair —
     * carpentry, never competing with the face below. Orientation
     * follows the run direction (`vert` for N-S runs). Clips to the
     * current crown path, so shading never spills off a chamfered
     * corner. Call with the chamferRect path still current, right
     * after fill.
     */
    private woodCrownPlate;
    /**
     * A 45° wall corner tile. The mass fills one triangle (named by the
     * tile); the open triangle faces the exterior. NE/NW-mass variants
     * cut a building's camera-side corners and show their SLOPED
     * hypotenuse facade; SE/SW-mass variants are the far corners — the
     * hypotenuse hides behind the crown, and only an exposed south edge
     * draws a straight face. Courses, palettes, and wood skins all
     * match the straight walls, so the material reads continuous around
     * the corner: a course at height h is the base line shifted up h,
     * which on a diagonal is a base-PARALLEL sloped line meeting the
     * neighbour run's horizontal course at the shared corner exactly.
     * DIAGONAL SORT LAW (same as cliff bevels): a sloped face sorts at
     * its NEAR row — the pocket behind the line is solid wall, nothing
     * can stand there, so any body sharing its rows is in front.
     */
    private diagWallItem;
    /**
     * Material face bands for a wall face whose BASE runs between two
     * ground points — a straight south edge or a 45° hypotenuse. Paints
     * in a sheared local frame (x along the base, y up in screen px) so
     * every course lands parallel to the base: constant world height IS
     * a base-parallel line in this projection, which is what makes a
     * diagonal's courses meet the neighbour run's at the corner. Values
     * are THE SAME LAW as wallItem's face (chinked-course law for wood,
     * running-bond for stone) — change them together.
     */
    private paintFaceBands;
    /**
     * How veiled a doorway's dark interior fill is: 1 far away, easing
     * to 0 as any body nears the threshold — the door "opens" for
     * whoever approaches, no swinging leaf needed.
     */
    private doorVeil;
    /**
     * One paneled timber door leaf on a south face, drawn in the current
     * (leaned) frame. `hx` is the hinge edge, `dir` which way the leaf
     * extends (+1 east, -1 west), `w` its current on-screen width — the
     * swing compresses width toward the hinge, so `oc` (0 shut → 1 open)
     * only drives the edge-on shading and detail fade. The grammar is
     * the side-door leaf's: recessed panels, iron straps at the hinge,
     * a brass knob riding the free edge.
     */
    private paintDoorLeaf;
    /**
     * A WALKABLE framed opening in a wall run: jambs, a header beam
     * (stone gets 45°-cut haunches — the brutalist arch), and the run's
     * unbroken crown. The frame sorts at ty+1 like its wall neighbours,
     * and a body standing in the door tile sorts BEFORE that — so the
     * player stays visible through the opening and ducks behind the
     * header. The pass-under read falls out of the existing y-sort.
     *
     * runLen > 1 is a merged WIDE-doorway run: (tx,ty) is the west
     * anchor and one frame spans the whole run — jambs at the run ends
     * only, one header, one centred keystone. Every reachable opening
     * is a true full-width threshold, never two doors with a phantom
     * divider you can walk through.
     */
    private doorwayItem;
    /**
     * A doorway in a N-S wall run — the SIDE of a building. In this
     * projection an edge-on opening has no visible face, so the portal
     * reads through structure instead (the arch/torii grammar, in the
     * entrance-trim vocabulary):
     *  - the wall run ENDS at the opening (wallish law): the north end
     *    shows its true material face, the south run restarts with a
     *    chamfered crown — an honest notch in the silhouette;
     *  - the DOOR LEAF stands thrown open OUTSIDE the wall on the
     *    outdoor side — swung 90° from a N-S wall a leaf's face
     *    squares to this camera, and the neighbour column is the one
     *    place no southern crown can ever bury it. One leaf per
     *    opening, hung at the north jamb (a wide door's broad leaf
     *    reads barn-style; a flanking pair would stack unreadably);
     *  - a worn passage floor plus porch landings poking out BOTH
     *    walkable sides at ground level — southern crowns legitimately
     *    occlude the gap floor on long runs, but the neighbouring
     *    columns are never covered, so the landings read from either
     *    approach at any run length.
     */
    private sideDoorwayItems;
    /**
     * A freestanding walk-through arch: thicker piers than a doorway,
     * capital blocks, its own crown. Adjacent arches merge into
     * colonnades (piers on the shared edge are skipped).
     */
    private archItem;
    /**
     * The Riftgate: the dungeon portal's monumental stone archway with
     * its vortex membrane (portal.ts owns the painters). The plane sits
     * at the tile's SOUTH edge, so a body standing on the tile sorts
     * behind the veil — stepping onto the portal reads as being
     * swallowed by it. Always live-painted: the vortex never sleeps, and
     * portals are rare enough that caching would buy nothing.
     */
    private portalItem;
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
    /** The interior region a wall-run tile fronts: any adjacent
     *  enclosed floor claims it (per-frame cached in the InteriorMap). */
    private wallRegion;
    /**
     * Discover the interior regions in view this frame. They feed the
     * shadow-layer shelter punch (a wall never casts sun into its own
     * room). Buildings render OPEN — no roof layer; the cutaway front
     * wall, facades, and doorframes carry the "building" read while the
     * whole interior stays visible.
     */
    private collectInteriorRegions;
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
     * lane, shader-rung silhouette) but drawn as ONE rock, so height never reads
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
     * The forest is GROWN, not authored: render/trees.ts turns each
     * tile's hash into a deterministic branching skeleton — species
     * grammars with three structural variants each, foliage clusters
     * rustling on their own offsets of the ONE shared wind field. The
     * renderer's job here is framing: screen anchor, growth stage
     * (sapling -> grow-in -> full tree), leaf-shed particles, felling.
     */
    /** Regrown trees scale up from sapling size instead of popping in. */
    private readonly growingTrees;
    /** Start a growth ease at this tile (sapling sprout or stand-up). */
    addGrowingTree(tx: number, ty: number): void;
    /** Soft settle with a whisper of overshoot — growth, not inflation. */
    private static growEase;
    /** Growth scale for a tree/sapling item, advancing its animation. */
    private growthOf;
    /**
     * Loot-chest lids ease over their hinge instead of popping between
     * the closed and open tiles. Same clock pattern as growingTrees:
     * main.ts kicks an ease on the tile patch, the painter reads its
     * openness each frame, and while a key is live the ring-cache gate
     * keeps that chest on the live outline pass (collectRaisedTiles).
     */
    private readonly chestEases;
    /** Start a lid ease at this tile (fling open or quiet re-latch). */
    addChestEase(tx: number, ty: number, dir: 'open' | 'close'): void;
    /**
     * A destructible prop bursting at (wx,wy): chunk bodies fly WITH
     * the blow (`dir` is the impact heading from the server fx), plus a
     * rolling ground-dust wave and a spray of splinter streaks. All
     * theatre — the tile patch right behind the fx is the truth.
     */
    /**
     * A durable prop absorbing a blow that didn't finish it: the piece
     * shudders in place, spits a few short-lived chips WITH the blow,
     * and coughs a breath of dust — the "keep hitting" feedback.
     */
    /** Dust + splinter tones per smash kind — wood props share the
     *  joinery palette; bone bursts pale, cave rock bursts in the wall's
     *  own stone. */
    private static readonly SMASH_TONES;
    crackProp(wx: number, wy: number, dir: number, kind: SmashKind): void;
    smashProp(wx: number, wy: number, dir: number, kind: SmashKind): void;
    /**
     * Lid openness 0..1 for a chest tile, advancing its animation.
     * Opening is a two-beat swing: the latch gives (a slow first lift)
     * before the lid FLINGS past vertical and settles with growEase's
     * overshoot. Closing is a shorter, sober fall back onto the rim.
     */
    private chestOpenness;
    /**
     * DOOR EASES — the same clock pattern as chests: main.ts kicks an
     * ease on the tile patch (or a 'rattle' fx for a locked refusal) and
     * the doorway painters read swing/shudder each frame. Keys are the
     * door unit's ANCHOR tile — the west-most (E-W) or north-most (N-S)
     * member of a wide run, or the tile itself for singles.
     */
    private readonly doorEases;
    /** Start a leaf swing (or a locked-door shudder) at this tile. */
    addDoorEase(tx: number, ty: number, dir: 'open' | 'close' | 'shake'): void;
    /**
     * Leaf openness 0..1 for a door anchor, advancing its animation.
     * Opening swings with growEase's overshoot — the leaf flings past
     * its rest and settles; closing is a shorter, sober pull-to. A
     * 'shake' ease holds the posture (the door never moved).
     */
    private doorOpenness;
    /**
     * Signed shudder offset for a locked door's refusal — a quick
     * decaying knock-knock in the frame. Zero when quiet.
     */
    private doorShakeAt;
    /**
     * PROP SHUDDER — a durable prop absorbing a blow that didn't finish
     * it. Same decaying-knock clock as the door rattle; keyed per tile,
     * self-pruning. The offset rides the whole drawn prop (cached-ring
     * blits included — position isn't part of the bake).
     */
    private readonly propShakes;
    addPropShake(tx: number, ty: number): void;
    /** Signed screen-x shudder in px for a hit prop. Zero when quiet. */
    private propShakeX;
    /**
     * TREE SPRITE CACHE: a mature tree's painted body re-bakes onto a
     * per-instance offscreen canvas every TREE_REBAKE_FRAMES frames
     * (staggered by a per-frame budget) and blits with ONE drawImage per
     * frame in between. The sway moves ~12px/s at 0.85 zoom, so a ~30Hz
     * re-bake steps well under a pixel — every cluster rustle, flutter
     * and bough detail is still the live procedural painter's output,
     * just sampled at animation rate instead of frame rate. Felling
     * (bendOverride) and regrowth (grow < 1) stay fully live.
     */
    private readonly treeSprites;
    /** Sun-shadow twin: the projected silhouette Path2D built at origin. */
    private readonly treeShadows;
    private treeBakeBudget;
    private treeShadowBudget;
    private frameNo;
    /** Trees drawn last frame — feeds the adaptive re-bake cadence. */
    private treesVisible;
    private treeCadence;
    /** Evicted sprite canvases, reused by new bakes (GC churn while walking). */
    private readonly spriteCanvasPool;
    private static treeKey;
    private bakeTreeSprite;
    /**
     * Props whose outline ring bakes into a cached sprite (with their
     * art) instead of running the per-frame outline pass. Only DISCRETE
     * pieces belong here — run-merged furniture rings solely when
     * isolated (its body is undefined mid-run), and flame-lit pieces
     * (LampPost, Hearth, Campfire, the stations) stay on the live pass
     * so their fire isn't sampled down to cadence rate.
     */
    private static readonly CACHED_RING_TILES;
    /**
     * Stations ride the ring-baked sprite cache too — but only while
     * COLD. Their flame/shimmer animation samples at the shared adaptive
     * cadence (every animated term is <4Hz, safely under the ~12Hz
     * cadence floor), which turned ~11 live outline passes per town
     * frame into cache blits. A station someone is WORKING (stationHeat
     * > 0) goes back to the live pass: full-rate animation exactly when
     * a player is close enough to study it. EnchantingTable is absent by
     * LAW — its painter queueGlows, and a glow queued inside a baked
     * painter strobes at cadence rate (the candle-strobe bug).
     */
    private static readonly STATION_CACHE_TILES;
    /**
     * Cached-ring props with NO ambient animation: skip the fast tree
     * cadence and heal on a slow stagger instead (scale drift and
     * neighbor edits still re-bake) — re-baking a static bookshelf at
     * 20Hz is pure bake-budget waste.
     */
    private static readonly STATIC_RING_TILES;
    /**
     * Run-merging furniture rings as ONE unit: connected same-tile
     * components bake into a single anchor-keyed sprite so the ring
     * wraps the whole hall table / stall / counter run instead of
     * seaming every joint (the user-flagged gap after the isolated-only
     * era). `cap` bounds the BFS — a component past it (estate fencing)
     * goes ringless rather than paying a wall-sized bake.
     */
    /** Pooled BFS scratch for tryRunRingItem (flat x,y interleaved). */
    private static readonly runMembers;
    private static readonly runSeenScratch;
    private static readonly runQueue;
    private static readonly RUN_NEIGH_X;
    private static readonly RUN_NEIGH_Y;
    private static readonly RUN_RING_TILES;
    /**
     * Group a run-merging tile's connected component and emit ONE ringed
     * item for the whole piece. Members are discovered by world data
     * (not the visible loop) so a run half-off-screen still bakes whole.
     * Returns true if the tile was consumed (already-seen member or the
     * fresh run item was pushed); false = treat as a plain tile.
     */
    private tryRunRingItem;
    /**
     * Bake a prop's own draw + outline ring into a sprite canvas. The
     * paint closure draws at ABSOLUTE screen coords; the translate maps
     * the item's body rect to the canvas with a ring margin, and the
     * this.ctx swap routes it here (every cached case re-captures ctx
     * at draw time — the build-time-capture law).
     */
    private bakePropSprite;
    /**
     * Cached-sprite draw for a discrete ringed prop — the flora pattern
     * generalized. Shares the tree cache wholesale (map, budget,
     * adaptive cadence, eviction, canvas pool); the body rect arrives
     * fresh each frame (items rebuild per frame) so the blit tracks the
     * camera at full rate while the art samples at cadence. Falls back
     * to the live outline pass while streaming in faster than the bake
     * budget allows.
     */
    private drawPropOutlined;
    /** Pool-aware canvas acquisition shared by the world-prop sprite bakes. */
    private acquireSpriteCanvas;
    /**
     * Wild forage nodes, cached exactly like trees: per-instance sprite
     * re-baked on the shared adaptive cadence, outline ring baked in.
     * The per-frame outline pass on ~38 live-painted forage nodes cost
     * 2.1ms in a dense forest (120→94fps) — cached, the steady cost is
     * one drawImage per node.
     */
    private bakeFloraSprite;
    /** Cached-sprite draw for a grown plant — forage node or farm crop. */
    private drawFlora;
    /**
     * The world's outline ring, baked INTO a sprite canvas: dilate the
     * sprite's own alpha into scratch B, tint, slip the ring UNDER the
     * art (destination-over). Cached trees pay this once per re-bake
     * instead of ~38μs per frame in paintOutlined — a 300-tree forest
     * would otherwise spend >10ms/frame on rings alone. Works in device
     * pixels (identity transform); the final blit is integer-aligned so
     * the fractional-tap bleed law only needs the apron clear on B.
     */
    private bakeOutlineRing;
    private drawTree;
    /**
     * TRUE-FORM tree shadow: the same skeleton paintTree draws — trunk
     * spine, fork arms, every canopy cluster — projected flat onto the
     * ground along the light ray, riding the same wind cantilever so
     * the shadow sways with its tree. One Path2D, one fill: limbs and
     * clusters merge into a single density, never stacking.
     */
    private treeShadowPath;
    private drawTreeShadow;
    /**
     * A felled tree: shudder → topple (varied azimuth) → impact with a
     * rolling wall of dust → it lies on the ground for a beat → it breaks
     * apart into log chunks and a last billow of dust. Timeline in ms.
     */
    private readonly fallingTrees;
    addFallingTree(tx: number, ty: number, tile: Tile, dir: number): void;
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
     * Screen bounds of a live-painted tree, mirroring bakeTreeSprite's
     * headroom exactly — crown spread + wind throw + blob jitter above,
     * root flare below. Feeds the outline pass for the trees that can't
     * blit a ring-baked sprite (regrowth, felling shudder).
     */
    private treeBody;
    /** Everything a chest painter needs for one frame. */
    private static chestPose;
    /**
     * The revealed mouth: the body's own plan as a dark cavity — one
     * bold lining band on the near wall, one sunlit near-rim lane.
     */
    private chestMouth;
    /**
     * The standing open lid: the lid's inner face as a square slab
     * rising behind the box — frame color around a lining inset, a cap
     * strip along the top. Bespoke trim is painted by the caller.
     */
    private chestStandingLid;
    /**
     * A moss slab: a low-poly rectangular patch — deep seat offset
     * down-right, square body, one bold lit top strip. Never a blob.
     */
    private mossSlab;
    /**
     * WOOD — the traveller's trunk. Honest warm boards carried by two
     * broad silver straps and a silver arris cap: the metal is the
     * contrast, the wood stays quiet.
     */
    private drawChestWood;
    /**
     * MOSSY — the wayside elder. A batten-built chest with no metal
     * left worth naming, being claimed one square slab of moss at a
     * time. Blocky moss, blocky mushrooms, quiet wood.
     */
    private drawChestMossy;
    /**
     * IRON — the strongchest. Dark timber in an iron grip: corner
     * columns, one massive belt, and a padlock the size of a fist.
     * The lock IS the promise; it goes with the key that opens it.
     */
    private drawChestIron;
    /**
     * GILDED — the coffer. A stepped gold crown over a lacquer inlay:
     * treasure-house work, all big faces and one set stone. The value
     * ladder does the shining; the sparkles only visit.
     */
    private drawChestGilded;
    /**
     * BOSS — the black cache. A pedestal-set black mass in angular
     * iron, fronted by a bone skull whose sockets smoulder while the
     * hoard is still inside. Legendary is a silhouette, not a shimmer.
     */
    private drawChestBoss;
    /** Trees, rocks, stations — the object layer, redrawn with character. */
    private objectItem;
    /**
     * Every body the grass should feel: players and NPCs, own player
     * included. The grass system derives velocities itself (it remembers
     * last positions per id), so this is just who-is-where.
     */
    /** This frame's moving bodies (players + NPCs), pooled records.
     *  Shared by the grass system AND the doorway veil — one gather. */
    private readonly frameDisturbers;
    private readonly disturberPool;
    private collectDisturbers;
    private collectEntities;
    /** What a footfall kicks loose from each ground. Null = nothing
     * (wet ground swallows the impact). Mult scales how much a given
     * surface gives up — sand erupts, flagstone barely powders. */
    private static dustFor;
    /**
     * A foot met the ground — kick loose a puff of whatever the ground
     * is made of. Speed decides how much earth moves: an amble stirs
     * almost nothing, a sprint tears little clouds off every plant.
     * The puff fans low and backward along the travel line, billows
     * (grow) and settles fast (drag) — impact dust, not smoke.
     */
    private kickDust;
    private humanoidItem;
    private drawMiniHp;
    /** Eight-tap alpha dilate → tinted ring under the sprite. */
    private static readonly OUTLINE_TAPS;
    private paintOutlined;
    /**
     * The crypt garrison's kit, variant by variant — the warrior's grave
     * iron, the archer's bone-and-iron Marrowpoint with a hip quiver, the
     * guard's rusted helm and oak kiteshield, the champion's mantle and
     * the sword from his own purse. Every piece is a real item the mob
     * (or its tier) actually drops: the look IS the loot story.
     */
    private static readonly SKELETON_EQUIP;
    /**
     * Skeleton stature ladder: the dead stand taller and gaunter than
     * goblins — the archer a touch lighter, the guard a head above the
     * rank-and-file, the champion looming over all of them.
     */
    private static readonly SKELETON_SIZE;
    private npcItem;
    /**
     * The leg-less menagerie: slimes (hopping gel blocks), cave bats
     * (hovering wing fans), adders (slithering ribbons). No LegRig — each
     * body's locomotion IS its painter, gated on the anim's travel
     * activity so a still body rests instead of freezing mid-cycle.
     */
    private leglessItem;
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
    /**
     * Which ground drop lives under this screen point? Labels first
     * (they never overlap, so a stacked pile stays fully clickable),
     * then the bag sprites themselves. Returns the drop's entity id and
     * world position, or null.
     */
    lootHitTest(sx: number, sy: number): {
        eid: number;
        x: number;
        y: number;
    } | null;
    private projectileItem;
    /**
     * Settle every projectile that ended flight this frame: arrows stand
     * in the ground (or ride the NPC they hit), magic fizzles in a burst.
     * Dead NPCs shed their arrows onto the ground where they fell.
     */
    private consumeProjectileAftermath;
    /**
     * March down the flight line looking for the solid the server's shot
     * actually buried itself in — the last client sample lags the impact
     * by up to a tick-step, which is why arrows used to "fall short" at
     * the foot of every wall. On contact the arrow sticks INTO the face
     * at flight height: in front of a south face, poking from a side
     * edge, hidden behind a north one. Low props take the shaft low.
     */
    private probeWallStick;
    /**
     * The defeated body goes limp: build an articulated ragdoll skeleton
     * in the victim's proportions and throw it along the killing blow.
     * Launch force scales with the final hit's damage — a chip kill
     * crumples where it stands, a crit finisher drags the body back
     * through the scene.
     */
    private spawnCorpse;
    /**
     * Ragdoll physics: the anchor slides the world along the blow while
     * the skeleton flops in the billboard plane. Anchor deceleration is
     * fed to the limbs as inherited momentum — the trunk pitches over its
     * friction-pinned feet instead of spinning like a thrown prop.
     */
    private tickCorpses;
    /**
     * The limp body itself, painted in the live rig's dialect. The item
     * carries `body` bounds so the SAME outline pass that rings living
     * entities rings the corpse — death never breaks the silhouette. The
     * fade rides DrawItem.alpha (outside the outline pass) so the ring
     * dissolves with the body, and the shadow is the live entities' own
     * castBody pool, sun/lamp lobes and all.
     */
    private corpseItem;
    /** One arrow standing where it landed, angled with its flight line. */
    private stuckArrowItem;
    /** A spent shot arcing out of the flight line: it carries forward,
     *  drops from chest height, and pitches nose-down into the landing. */
    private fallingShaftItem;
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
    /**
     * The tier-3 enchant aura: an energy corona that marks a walking
     * masterwork. The strongest worn enchant sets the school and the
     * color; lower tiers stay quiet here (their fx live on the item
     * itself). Same fps-stable rate-gating as statusAmbience, plus a
     * breathing glow that becomes a real scene light after dark.
     */
    private enchantAura;
    /** Placed summons: totem, snare trap, straw decoy. */
    private summonItem;
    /** Ground perspective squash for combat-fx circles. */
    private static readonly FX_SQUASH;
    /** Overlay lifetime per fx kind, ms (telegraph/field ride their fuse). */
    private fxLife;
    /**
     * The ring silhouette pass novas and blasts expand with. Every
     * family is a three-layer read — dark pressure band under, identity
     * silhouette over, hot inner edge — and the rim SHEDS: sparks fly
     * off the expanding front so the shock feels like it's tearing
     * through the air, not sliding over it.
     */
    private fxRingLayer;
    /**
     * Throw a style's debris family from a detonation point. Matter
     * behaves like its material: embers climb and strobe, rock and bone
     * TUMBLE under gravity, sparks streak, leaves flutter down, shadow
     * curls upward. The material read is half the identity.
     */
    private fxDebris;
    /**
     * The SIGNATURE layer — each ability's bespoke set-piece, drawn over
     * the shared kind grammar. This is where a fire nova stops being "a
     * ring, but orange": the pillar climbs, the spikes erupt, the rift
     * tears open. Everything stays flat and blocky; drama comes from
     * staged geometry, not gradients.
     */
    private fxMotif;
    /**
     * One lingering ground decal — the mark the hit leaves behind, in
     * three acts. `t` is the whole 5s life; `active` is hot aftermath
     * (first ~40%: coals still glowing, frost still growing, blood still
     * spreading), then the mark settles into quiet residue and the turf
     * finally reclaims it.
     */
    private drawDecalItem;
    /**
     * Ground-level combat FX: lingering decals, hazard-zone floors, and
     * telegraph circles — painted under the y-sorted world so bodies
     * stand ON them. Pruning happens in the overlay pass.
     */
    private drawGroundFx;
    /**
     * Overlay combat FX — every ability moment as a staged presentation:
     * flash, body, rim, debris, decal, glow. All silhouettes stay blocky
     * (jagged polygons, hard rects) — the world's magic is chunky too.
     */
    private drawCombatFx;
    /** An annular sector (arc band) path in ground perspective. */
    private fxSectorPath;
    private drawBuildGhost;
    private drawActionProgress;
    private drawFloaties;
    private drawHpBar;
}
//# sourceMappingURL=renderer.d.ts.map
import { Tile, type Vec2 } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { Particles } from './particles.js';
import { Debris, type SmashKind } from './debris.js';
import { Birds } from './birds.js';
import { InteriorMap } from './interiors.js';
/** Identity tints for undressed player rigs — also the party marker
 * inks (map tokens + wayfinder pills), so a fellow reads as the same
 * color on the chart as in the world. */
export declare const PLAYER_COLORS: string[];
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
    /** Ambient bird flocks — land, peck, and flush when a body comes close. */
    readonly birds: Birds;
    /** Threat scratch for the bird sim — pooled points, reused every frame. */
    private readonly birdThreats;
    /** Reused frame env for the bird sim (scratch-pool law: one object, ever). */
    private readonly birdEnv;
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
     *  once per frame — the wall reveal reads these. */
    private ugCutOn;
    private ownPX;
    private ownPY;
    /** THE SHELTER GATE's temporal ease (0 = outdoors, 1 = sheltered):
     *  walls bow down over ~0.35s when you step inside and rise the same
     *  way when you leave — never a per-tile pop at a region boundary. */
    private shelterK;
    /** This frame's reveal strength: shelterK smoothstepped, and ridden
     *  down to the darkness fade (ugBlend) on a portal drop. */
    private cutCtx;
    /** THE ROOM-TRUTH ease: the wide room reveal belongs to the building
     *  you are inside, easing 0→1 on entry and back down after you step
     *  out (a doorway threshold HOLDS it so crossing between rooms never
     *  dips the veil). Switching to a DIFFERENT building restarts at 0 —
     *  a neighbour's walls must never inherit a half-open ease. */
    private buildingK;
    /** Smoothstepped buildingK, consumed by wallHeightAt's wide window. */
    private bldCut;
    /** The last tile we stood INSIDE on — re-resolved each frame so the
     *  ease-out keeps a live region handle across worldVersion bumps. */
    private veilAnchorX;
    private veilAnchorY;
    private hasVeilAnchor;
    /** The region whose building may reveal this frame: the room you are
     *  in, or (while buildingK eases out) the room you just left. */
    private veilRegion;
    /** Reveal armed this frame (own player exists). */
    private revealArmed;
    /** Packed tile keys of the furniture the OWN body is mounted on
     *  this frame (seat-registry derivation) — exempt from the
     *  step-aside fade, or the seat itself ghosts away under you. */
    private ownSeatTiles;
    /** The own body's occlusion box in screen css px, per frame. */
    private fadeBX0;
    private fadeBY0;
    private fadeBX1;
    private fadeBY1;
    /** Per-occluder fade ease, keyed by the sprite-cache key. */
    private readonly fadeMap;
    /** CORE occluders last frame — fading sprites whose silhouette
     *  covers the torso itself. Their combined shade (stackCover)
     *  summons the ghost ember through deep canopy. */
    private fadeCoreCount;
    private fadeCoreCountNew;
    /** Bayer screen-door tile (the ember's weave), rebuilt on dpr drift. */
    private ditherPat;
    /** The ember's temporal ease toward this frame's wall cover. */
    private ghostK;
    /** Own player's DrawItem, stashed by collectEntities for the ember. */
    private ownItem;
    /** Scene lights gathered this frame (tiles, projectiles, flames). */
    private readonly lights;
    /** This frame's light-blocker test (walls/cliffs) — shared by the
     *  lightmap and the body-relight LOS walks. */
    private blocksAt;
    /** Body-relight scratch (see relightBody) + per-frame budget. */
    private readonly relightCanvas;
    private readonly relightCtx;
    /** The ART MASK scratch: the body's silhouette WITHOUT the outline
     *  ring — relight paints clothing and skin, never the ring (a lit
     *  ring reads as a detached pale halo outside the body). */
    private readonly relightMask;
    private readonly relightMaskCtx;
    private relitLeft;
    /** Top-two-light stash filled by sampleExposure(wantDom=true).
     *  TWO slots, not one: a winner-take-all pick strobes when two
     *  comparable flickering sources trade the crown frame to frame —
     *  the rim pass draws each significant light by its own strength
     *  instead, so rank swaps never change the picture. */
    private domK;
    private domX;
    private domY;
    private domRgb;
    private dom2K;
    private dom2X;
    private dom2Y;
    private dom2Rgb;
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
    /** Screen-bounds water region path cache (world coords), see waterClipFor.
     *  `cover` is the deck-structure punch-out (even-odd frame + rects)
     *  the mirror pass clips by AFTER the water region — null when no
     *  deck is in view. */
    private waterClip;
    /** Per-body wading state: splash edges + wake phase. */
    private readonly wadeStates;
    private readonly outlineA;
    private readonly outlineB;
    private readonly outlineACtx;
    private readonly outlineBCtx;
    /** Cached outlined composites (ring + art) per body — see the olKey
     *  fields on DrawItem. Canvases ride the shared sprite pool. */
    private readonly bodySprites;
    /** Cached content signatures for appearance objects (equip/ench/
     *  look), keyed by object identity — see olObjSig. */
    private readonly olObjSigs;
    /** Identity ids for corpse records (stable objects) — cache keys. */
    private readonly olObjIds;
    private olObjSeq;
    private readonly baked;
    /** Per-frame queue of chunks with pending sliced bakes (scan order:
     *  visible chunks first, then the pre-bake ring). Scratch, rebuilt
     *  every frame by drawGroundChunks. */
    private readonly chunkJobQueue;
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
     * Dialogue cinematics: while a conversation runs, the camera leaves
     * the player-centered follow and frames BOTH conversants — glides
     * to their midpoint, pulls in to a close zoom, and breathes (a slow
     * ±zoom drift) so the held shot stays alive. The pair sits in the
     * upper two-thirds: the speech sheet owns the lower third.
     */
    private cineEid;
    private cineSavedZoom;
    private cineT0;
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
     * to the live player and split across the three honest FX strata —
     * ground (light pool, honor seal, pressure rings), volume (pillar
     * behind the body + the y-sorted shard orbit wheeling around it),
     * air (fountain, crown star, farewell) — all in gold + the skill's
     * accent color. Zero steady-state allocation: the record is built
     * once at start, every mote rides the pooled particle system, and
     * rings are bornAt stamps in one small array.
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
    onCorpseThud?: (heavy: boolean, x: number, y: number) => void;
    /**
     * THE FALL IS NEVER THE END (beastcraft v2 Phase 3): downed
     * companions — live entities lying at zero — render in the settled
     * ragdoll dialect, pre-settled once and cached per eid. A downed
     * friend must read FALLEN, never as a standing rig at zero; the
     * slow breath is what says it is not a corpse.
     */
    private readonly downedRags;
    /** A quick camera zoom kick — the killing-blow exclamation point. */
    zoomPulse(amount?: number): void;
    /**
     * Ask the camera to frame the player `px` screen pixels left of
     * center (0 restores the classic centered follow). Set every frame
     * by main while a docked screen owns the right of the viewport.
     */
    setViewShift(px: number): void;
    /** Begin the dialogue cinematic: frame the player and this entity. */
    startDialogueCine(eid: number): void;
    /** End the cinematic: glide back to the player's chosen framing. */
    endDialogueCine(): void;
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
    /**
     * Per-body motion, kept because the trail needs SPEED and the wire
     * only ever carries positions. Keyed by eid (or 'own'); swept when a
     * body stops being drawn.
     */
    private readonly wornMotion;
    /**
     * Live footprints. A ring buffer, hard-capped, because this is the
     * only system in the game allowed to write on the ground and an
     * uncapped one would turn a busy square into a light puddle.
     */
    private readonly trailPrints;
    /** Where "near" is measured from — the own body, or the camera. */
    private wornOrigin;
    /** Lit bodies counted this frame, for the crowd backstop. */
    private wornLitBodies;
    /**
     * The own body's equip/ench maps, rebuilt only when the equipment
     * actually changes. resolveWornLight's cache keys on the ench
     * OBJECT's identity, so handing it a fresh object per frame would
     * miss forever on the one body always on screen. game.equipment is
     * replaced wholesale on change and never mutated (clientGame.ts), so
     * its identity IS the generation counter.
     */
    private ownWornCache;
    /** Placement preview set by the build mode; null when inactive. */
    /**
     * THE TRUE GHOST: the placement preview is the piece, not a colored
     * rectangle. `kind` picks the read — walls rise as a prism, flats
     * tint the footprint, props stand their icon on it. `diag` carries
     * the mass triangle a corner will actually land (explicit or the
     * auto-orient's live resolution). `reason` is the one-breath refusal
     * chip; `queued` is the drag-run still waiting its turn.
     */
    buildGhost: {
        tx: number;
        ty: number;
        valid: boolean;
        kind: 'wall' | 'flat' | 'prop';
        diag: 'NE' | 'NW' | 'SE' | 'SW' | null;
        icon: string | null;
        color: string;
        topColor: string;
        reason: string | null;
        queued: ReadonlyArray<{
            tx: number;
            ty: number;
        }>;
    } | null;
    /** The tile the OWN player's running build/demolish is working — the
     *  pose squares up to it and the site wears the progress ring. */
    buildSite: {
        tx: number;
        ty: number;
    } | null;
    /**
     * THE DEMOLISH GHOST: the armed modifier hovering one of YOUR OWN
     * tiles — red dashed outline plus the salvage the teardown will
     * hand back. Tiles that aren't yours never highlight; the refusal
     * becomes something you can see before you swing.
     */
    demolishGhost: {
        tx: number;
        ty: number;
        salvage: string | null;
    } | null;
    /**
     * THE HELD SIGIL: the hold-to-aim ghost — a point-art's landing
     * ring while its button is still held. `x,y` is the aimed point,
     * `ox,oy` the caster (range hoop + tether anchor), `radius` the
     * blast footprint and `range` the art's whole reach. main.ts feeds
     * it every frame; null the moment the hold ends.
     */
    aimGhost: {
        x: number;
        y: number;
        ox: number;
        oy: number;
        radius: number;
        range: number;
        color: string;
        id: string;
        shape: string;
        bornAt: number;
    } | null;
    /** THE OWN-WORK OVERLAY: parsed own-built tiles, glinted in build mode. */
    private ownBuiltTiles;
    setOwnBuilt(keys: ReadonlySet<string>): void;
    /** Ghost icon bitmaps by buildable id — data-URL images decode async,
     *  so the first frame may skip the icon; it pops in a beat later. */
    private readonly ghostIcons;
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
    /**
     * Fires once per tool-impact while someone gathers ('tree' | 'rock'
     * | 'forage' | 'anvil' | 'furnace') — with WHERE the beat landed and
     * whose hands it is, so the sound can sit in the world (the far-off
     * smith rings faint) and haptics stay on the own body only.
     */
    onGatherImpact: ((kind: string, x: number, y: number, isOwn: boolean) => void) | null;
    /**
     * A body's pose flipped this frame (renderer-side transition diff —
     * the same edge that restarts the swing animation). main.ts voices
     * OTHER bodies' swings/casts from it, spatialized; the own body's
     * combat audio rides its own prediction path and skips this.
     */
    onPoseChange: ((key: number | 'own', pose: number, x: number, y: number) => void) | null;
    /**
     * Fires on every humanoid foot touchdown (the leg rig's plant
     * moment). `speed` is the gait vigor in tiles/sec — idle shuffles
     * arrive near zero, so volume can ride it directly.
     */
    onFootstep: ((x: number, y: number, speed: number, isOwn: boolean, sneaking: boolean) => void) | null;
    /** Nearest crafting station around a world position, if any. */
    private findStation;
    /**
     * The nearest milkable animal (livestock with produce) in hand
     * reach of a Milk-posed body — what the milker squares up to.
     */
    private findMilkTarget;
    /**
     * The stall wardrobe: every market stand draws one bolt of cloth
     * from this roster, keyed by the run's west-anchor tile hash — so a
     * merged stall wears one banner, neighbouring stands differ, and
     * every town's market reads bespoke with zero authoring plumbing.
     */
    private static readonly STALL_BANNERS;
    /**
     * THE DYE LAW's cloths, index-married to the shared roster (linen 0
     * … rose 9; rename in place, never reorder). The bolt color `a`
     * comes from icons' DYE_SWATCHES — the one client color truth for
     * dyes — and `b` is its stripe/trim partner: undyed cream for most,
     * a paler self for pale cloths so stripes never vanish.
     */
    private static readonly AWNING_CLOTHS;
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
    /** Classify a tile as a gatherable node kind, if it is one. */
    private gatherKindAt;
    /**
     * The gatherable node a working body should square up to. The
     * server never names the action's tile, so remote players get the
     * nearest-node guess — but the OWN player passes the tile of the
     * interact that started the work (prefer), so standing between two
     * nodes never swings the tool at the wrong one.
     */
    private findGatherNode;
    shake(amount: number): void;
    /**
     * Screen-space rise (in TILES; multiply by scale for px) of the
     * ground under a world position. Plateau tops rise level·ELEV_H; a
     * stair tile interpolates from its low mouth to its high edge, so
     * feet climb tread by tread. Everything drawn in the world asks this
     * one function.
     */
    /**
     * THE WIND REMEMBERS THE STREET: the one breeze every cloth prop
     * breathes. Samples the real wind field at the prop's tile and
     * blends it with a per-piece phase — half field (a gust rolls down
     * the whole street together) and half voice (no two cloths move in
     * lockstep). Returns screen-px offsets for a primary swing and the
     * lagged secondary beat (the two-beat law), plus the gust factor
     * for painters with their own extras.
     */
    private breezeAt;
    /**
     * The renderer's mirror of terrain's isPorchSurface, closure-free:
     * renderLift runs for every body and item every frame, and a per-
     * call sampler allocation is real garbage in a hot path.
     */
    private porchAt;
    renderLift(x: number, y: number): number;
    /** Memoized deck test (water within Chebyshev 2 — callers gate on
     *  the Dock/Bridge tile themselves), keyed by
     *  tile and cleared on any world change — renderLift is hot and the
     *  25-tile scan must run once per tile, not once per query. */
    private readonly dockMemo;
    private dockMemoVersion;
    private isDockAt;
    /**
     * A tile a bird may stand on: open NATURAL ground only. Floors,
     * stone, and cave rock all refuse — which quietly keeps flocks out
     * of interiors and dungeons without ever asking about walls.
     */
    private birdGroundOk;
    /** Write a threat point into the pooled scratch; returns the new count. */
    private pushBirdThreat;
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
    /**
     * A rock/ore formation's silhouette, thrown as its shadow. The mask
     * VARIANT is the per-tile hash folded to 8 — a sheared dark blob
     * from a sibling formation is indistinguishable from the exact one,
     * and folding turns "one mask bake per formation" (a cold ore field
     * baked dozens in one frame, the worst arrival stagger) into a tiny
     * fixed set per ore kind.
     */
    private castRockShadow;
    /**
     * A grown plant's silhouette — forage node or farm crop (calm: wind
     * zeroed). Same variant-fold law as castRockShadow: 8 masks per
     * plant kind, a sibling's sheared silhouette reads identically.
     */
    private castFloraShadow;
    /**
     * Screen → world: the exact inverse of liftedWTS. A click on a
     * plateau top must land on the plateau, not on the (hidden) ground
     * south of it — and a ramp flight, dock deck, or pit floor must
     * resolve to THAT surface, fractional lift included.
     *
     * The solve itself (bracketed root-find, highest-surface-wins)
     * lives in elevPick.ts — pure and unit-tested; this wires it to the
     * live camera and terrain.
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
    /**
     * ADAPTIVE RESOLUTION: the painting is fill-bound, so backing-store
     * pixels convert almost linearly into frame time. Machines that hold
     * the pace render every native devicePixelRatio pixel; a machine
     * demonstrably grinding (sustained frame time past ~45ms) steps the
     * cap down half a point at a time — floor 1 — and only climbs back
     * when frames are comfortable. All backing stores size through this
     * one accessor, so a cap change reflows every layer on the next
     * resize() guard.
     */
    private dprCap;
    private frameEma;
    private lastFrameAt;
    private dprHoldUntil;
    private lastDprDownAt;
    /** Decaying floor of observed frame intervals ≈ the display's vsync
     *  budget: a machine that ever hits its refresh pins this at the
     *  panel's period (8.3ms at 120Hz, 16.7 at 60), and a machine that
     *  never does decays it to the clamp — the budget of last resort. */
    private minDt;
    private dpr;
    private adaptResolution;
    private resize;
    render(game: ClientGame, frameDt: number): void;
    /** Deep-cave ambient the underground blend rides to: cool, slightly
     *  desaturated, ~0.58 effective darkness regardless of surface hour.
     *  Lifted repeatedly from the original [48,54,70] by user decree:
     *  lights don't reach every gallery, so the UNLIT cave must read on
     *  its own — a moonlit-cavern floor, with the drama coming from
     *  pools, lit faces, bounce wrap and body relights over it. The one
     *  constant serves caves AND dungeon instances (both live below
     *  UNDERGROUND_Y — dungeons park at y 8192). */
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
     * Emissive bloom: campfires, furnace mouths, portals, and Arx bolts
     * pour additive light over the scene. Sold with plain radial
     * gradients under `lighter` compositing — no shader required.
     */
    private drawGlows;
    /**
     * An Arx projectile (or totem, or spark) advertises its own glow.
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
     * to the live player every frame — rebuilt on the three honest FX
     * strata so the show stands IN the world instead of on the screen:
     *  - GROUND (drawLevelCeremonyGround, under the y-sort): the light
     *    pool, the wheeling honor seal with its arming rune chips, and
     *    the slow pressure rings — the body stands ON all of it, the
     *    far rims slide behind the legs.
     *  - VOLUME (collectLevelFxVolumes, y-sorted items): the pillar of
     *    light rising just BEHIND the body so the character reads as a
     *    silhouette inside the radiance, and twelve shard-motes wheeling
     *    around the body on two counter-rotating foreshortened orbits —
     *    each anchored at its own ground point, so a shard vanishes
     *    behind the shoulders and swings back across the chest.
     *  - AIR (this method, overlay): the lightmap glow, the outward
     *    mote fountain, the wheeling crown star at the pillar's head,
     *    and the farewell burst.
     * Direct draws are a few dozen flat shapes; everything thrown rides
     * the pooled particle system — no steady-state allocation.
     */
    private drawLevelCeremony;
    /** In fast, out slow: the show lands hard and leaves politely. */
    private levelFxEnv;
    /**
     * The ceremony's GROUND half — painted with the other spell floors,
     * under the y-sorted world, so the body stands on the light: the
     * base pool, the honor seal (a wheeling engraved double rim with
     * eight rune chips that arm one by one), and the slow pressure
     * rings that used to wash over the character from the overlay.
     */
    private drawLevelCeremonyGround;
    /**
     * The ceremony's VOLUME half — standing matter pushed into the
     * world y-sort, one DrawItem per element, each anchored at its own
     * ground point (the collectFxVolumes law):
     *  - the three-band light pillar rises just BEHIND the body, so the
     *    character stands silhouetted inside the radiance instead of
     *    being painted over by it;
     *  - twelve shard-motes wheel around the body on two counter-
     *    rotating foreshortened orbits, joining one by one and spiraling
     *    upward — north of the body they vanish behind the shoulders,
     *    south of it they cross in front of the chest. Power visibly
     *    wraps the character; nothing sits ON the sprite.
     */
    private collectLevelFxVolumes;
    /** Hard red edge bands when the local player is hurt. */
    private drawVignette;
    private detailAt;
    /**
     * FRAME GRID: one flat snapshot of elev/ground/detail covering the
     * padded visible bounds, rebuilt at the top of every render pass.
     * The ChunkStore's per-tile lookups are memoized, but the render
     * pass still made ~170k of them per frame (lifted-row live ground,
     * cliff contours, the raised-tile and static-light scans), each
     * paying modulo math plus a memo compare — ~21% of all frame CPU
     * measured. One row-major typed-array copy per frame turns every
     * hot read into a single indexed load. INTERNAL TO THE RENDER PASS:
     * the grid is never patched mid-frame, so code that runs outside
     * render() must keep reading the ChunkStore.
     */
    private fgMinTx;
    private fgMinTy;
    private fgW;
    private fgH;
    private fgElev;
    private fgGround;
    private fgDetail;
    private fgWorld;
    private buildFrameGrid;
    /** Elevation through the frame grid; ChunkStore fallback off-window. */
    private fgElevAt;
    /** Ground tile through the frame grid; ChunkStore fallback off-window. */
    private fgGroundAt;
    /** Detail id through the frame grid; ChunkStore fallback off-window. */
    private fgDetailAt;
    private visibleTileBounds;
    /**
     * Bake resolution follows the zoom tier: past ~1.05× the 32px bakes
     * would upscale into mush, so chunks re-bake at 64px/tile. Keyed off
     * targetZoom (not the gliding zoom) so a zoom flips the tier once.
     */
    private bakePx;
    private drawGroundChunks;
    /**
     * Start a sliced bake for a chunk with no cache entry. `live` jobs
     * blit their in-progress canvas (brand-new ground shows its meadow
     * placeholder immediately, then sweeps in detail); the entry is
     * cached and returned with `pending` set.
     */
    private startChunkEntry;
    /**
     * Start a sliced RE-bake behind an existing entry: the old canvas
     * keeps blitting (stale content over a hole every time) and the
     * finished job swaps in atomically at completion.
     */
    private startChunkReplace;
    /** The shared job body: terrain steps + one step per elevation level. */
    private buildChunkPending;
    /** Run ONE slice of a pending chunk bake; finalize when done. */
    private advanceChunkPending;
    private evictBaked;
    private evictAnims;
    /**
     * Tree sprite/shadow caches ride the camera: drop entries not drawn
     * for ~2s (scrolled away), and under a hard cap drop the coldest —
     * a zoomed-in sprite is big (~0.4MB), so the cap is what bounds
     * worst-case memory, not the typical count.
     */
    private evictTreeSprites;
    /**
     * Movement/turn tracker for the body-sprite cache: a body is
     * "dynamic" while its position or facing changes and for
     * OL_COOL_FRAMES after — leg settles, facing eases and pose blends
     * finish at full rate before the idle cadence takes over.
     */
    private bodyMotion;
    /** Content signature for an appearance object (equip/ench/look) —
     *  computed once per object IDENTITY and cached in a WeakMap, so a
     *  server that re-sends an identical appearance object every tick
     *  (actors do) still yields a STABLE signature. Never use raw
     *  identity ids here: a churning identity re-baked one body every
     *  frame forever (caught live on a Bramblewick actor). */
    private olObjSig;
    /** Stable id per long-lived record (corpses) — a cache KEY, where
     *  identity is exactly right; never use for signature content. */
    private olObjId;
    /** Wall-run auto-tiler membership — shared law (tiles.ts). */
    private static readonly WALL_TILES;
    /** Every WALL doorway tile — open and shut, both orientations and
     *  widths. Fence gates are doors on the wire (locks, occupancy,
     *  auto-close all ride DOOR_INFO) but they are fence props to the
     *  renderer — kept OUT of this set so the wall-doorway pipeline
     *  (side-notch law, wide merges, veil, wallish) never sees them.
     *  Garrison gates carve out the same way: they belong to the
     *  garrison run pipeline, never the building-doorway one. */
    private static readonly DOOR_TILES;
    /** The whole fortification family — shared law (tiles.ts). */
    private static readonly GARRISON;
    /** Garrison tiles that are MASS (wall, 45° turns, shut gate) — what
     *  the curtain veil's north probe reaches through. The open gate is
     *  a passage, not mass. */
    private static readonly GARRISON_MASS;
    /** Man-made ground the wall reveal counts as "a room to see into":
     *  the surface gate for both the player's feet (shelter) and the
     *  floor a wall fronts. Deliberately excludes Bridge (docks stay
     *  neutral) and natural ground — a garden wall on grass keeps its
     *  facade; underground skips this gate entirely (cave floor is the
     *  only floor there is). */
    private static readonly REVEAL_FLOORS;
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
     * THE ONE VEIL LAW — the single wall-reveal mechanic, everywhere.
     * ANY wall-run tile fronting revealable ground to its NORTH sinks
     * toward the knee stub while it stands in the player's occlusion
     * window, scaled by the frame's shelter gate (cutCtx). One law
     * covers what used to be two: the surface building cutaway and the
     * dungeon corridor cut are the same window now, so multi-room
     * buildings drop EVERY occluding wall of the building you are in
     * (facade, partitions, sub-room walls — see THE ROOM-TRUTH GATE
     * below for who qualifies), and doorframes and diagonal corners
     * ride the exact same height field as the runs they sit in.
     *
     * Returns the height in tiles, WALL_H (full) → WALL_STUB (cut),
     * SMOOTHSTEP-eased at every window edge on the CONTINUOUS player
     * position, so walls sink and rise as you walk instead of popping
     * per row. Deliberately cheap: a few clamps and multiplies per
     * visible wall, no allocation, nothing cached — the wall painter is
     * live, so a per-frame height is free.
     *
     * THE ROOM-TRUTH GATE (surface): what the wall fronts decides the
     * window it gets. A wall fronting an ENCLOSED ROOM reveals on the
     * wide window ONLY while the player is inside the same BUILDING
     * (rooms joined by doorways/breaches — interiors.sameBuilding),
     * eased by bldCut; a stranger's room never opens from the street
     * or from the building next door — cutting a facade exposes the
     * interior rows behind it, so this is the anti-wallhack line. A
     * wall fronting UNENCLOSED ground (street paving, grass, a
     * corridor, courtyard paving) has nothing hidden behind it to
     * expose, so it may bow only in THE BOWL: a tight anti-occlusion
     * window that runs out at the face's true cover reach — the wall
     * dips exactly where it stands between the walker and the camera,
     * uniformly, with no per-column content test. (The old per-column
     * gate — REVEAL_FLOORS or any region — cut foreign facades from
     * the street and shredded street-side walls into ragged combs
     * wherever paving, grass, and props alternated along the run.)
     * Underground any walkable floor qualifies for the wide window —
     * cave floor is the only floor there is.
     */
    /**
     * THE ONE-SLAB LAW (thick masses): one stubbed row is not enough —
     * wall MASS can be rows thick, and at WALL_H 2.05 the two rows
     * BEHIND a knee-high stub still throw their crowns over the
     * floor in front. So the cut reaches through the mass: rows 1–3
     * from the floor all sink, and they sink to the SAME height on the
     * SAME ease, keyed to the mass's FRONT row (the one touching the
     * floor). Equal heights are load-bearing: same-height crowns tile
     * seamlessly on screen, so the mass reads as one solid slab sinking
     * together. Per-row heights or per-row eases are BANNED here — each
     * row's crown then floats at its own offset and slides at its own
     * rate as the window eases past it, which reads as the wall tearing
     * into parallax slices (interior rows draw no south face — a crown
     * with no riser under it has nothing to anchor the gap). Rows 4+
     * stay full: at WALL_H 2.05 and yScale 0.6 a row 4 deep never
     * overhangs the floor, and its fixed crown edge over the sunken
     * slab is correct occlusion (the tall mass hides the trench bottom,
     * never the floor) — the REAR RISER in the wall painter anchors the
     * step between the sunken slab and the full mass behind it.
     */
    private wallHeightAt;
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
     * THE HANGING LAW — wall-hung cloth. Detail.BannerCrown, BannerMoon,
     * and Tapestry are authored ON a wall tile and painted by that
     * wall's own face pass, inside the face frame: the cloth leans,
     * sinks, and sorts with the masonry it hangs from, and like glazing
     * it sheds when the reveal eases the wall below hanging height — a
     * sinking wall drops its rod before the crown could swallow it. The
     * ground bake draws nothing for these details (WALL_HUNG_DETAILS).
     * Coordinates are face-local: x in screen px, y rising NEGATIVE
     * from 0 at the wall's south base.
     */
    private wallHangings;
    /**
     * THE WALL TAKES A HANGING — the player's banner: the royal
     * swallowtail grammar in the ten common dyes, a woven diamond
     * where the crown would sit. Two-beat cloth (hoist sways, tails
     * trail), its own shadow seating it on the masonry.
     */
    private playerBannerOnFace;
    /**
     * The pennant string: a swagged line under the eave, little flags
     * alternating the dye and its cream partner, each a beat out of
     * phase with its neighbour (the valance law on a rope).
     */
    private pennantOnFace;
    /**
     * The bracket sign — PERSPECTIVE-HONEST: a board hung perpendicular
     * to a south face would show the camera only its edge, so on these
     * faces the trade board hangs FLAT IN THE WALL PLANE — a wrought
     * rod above it, two chains to its corners, the whole sign swinging
     * as a pendulum in that plane (an honest motion for an in-plane
     * board). The face-on read is legitimate carpentry, not a cheat:
     * wall-hung painted boards are period signage. Eight carved motifs,
     * chunky enough to read at street zoom.
     */
    private bracketSignOnFace;
    /**
     * One carved trade motif, centered at (mx,my) in a w-wide field —
     * chunky flat-vector, two tones, readable at street zoom. Order is
     * FOREVER (the id math): mug, loaf, blade, fish, sprig, boot, bed,
     * hammer.
     */
    private signMotif;
    /**
     * The trellis: garden lattice up the wall face, a climbing vine
     * choosing its species — ivy's deep green, the madder rose in
     * bloom, the hopvine's pale cones. Leaf tips flutter; the blooms
     * carry a glint (the beacon law, whispered).
     */
    private trellisOnFace;
    /**
     * The wall basket: a wicker bowl off a bracket peg, blooms in the
     * FlowerBox's own mixed palette, swaying on its rope like a slow
     * pendulum. The gardener's smallest word.
     */
    private wallBasketOnFace;
    /**
     * The grand tapestry — the Silverfall weave. Adjacent wall tiles of
     * the same run carrying Detail.Tapestry merge into ONE wide hanging:
     * every member computes the run's extent, draws the ENTIRE
     * composition, and clips to its own face span, so the picture
     * assembles seamlessly from identical geometry (the one-loom law,
     * raised onto the wall). The scene is the city's own: the silver
     * fall dropping from the ridge saddle past the keep to the water,
     * under a gold sun.
     */
    private tapestryOnFace;
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
    /** Rampart ashlar — cooler and deeper than house stone on purpose. */
    private static readonly GAR_FACE;
    /** The battered talus footing the curtain flares into. */
    private static readonly GAR_PLINTH;
    /** The wall-walk flags between the parapets. */
    private static readonly GAR_TOP;
    /** Sun-catching merlon caps — the lightest stone in the kit. */
    private static readonly GAR_MERLON_TOP;
    /** Dressed trim for gate piers, thresholds, and side-gate landings. */
    private static readonly GAR_TRIM;
    /** Gatehouse leaves: iron-bound oak, darker than any house door. */
    private static readonly GAR_LEAF;
    /** Portcullis and strap iron. */
    private static readonly GAR_IRON;
    /**
     * Garrison-run neighbour test — the separate-masonry law's auto-
     * tiler. Curtain runs merge ONLY with garrison tiles (a keep's
     * curtain abutting a cottage shows two honest ends), and a gate in
     * a N-S run breaks the run exactly like a side doorway, so the
     * curtain shows real jambs at an edge-on passage.
     */
    private garrisonish;
    /**
     * SIDE-GATE LAW: a garrison gate's orientation comes from the
     * curtain it pierces — solid garrison mass (or more of the same
     * gate) north AND south, open flanks east/west, is an edge-on
     * passage. Anything else keeps the south-facing gatehouse.
     */
    private isGarrisonSideGate;
    /**
     * THE CURTAIN VEIL — the one-veil window math, always armed. A
     * curtain wall fronts open country, not rooms: there is no shelter
     * gate to pass and no interior floor to find. THE CONTENT LAW:
     * anything that is not fortification mass — road, grass, a tree, a
     * boulder, a prop, even a building's wall — is CONTENT the curtain
     * occludes, so the first non-garrison tile north opens the window
     * unconditionally. (The old rule demanded WALKABLE ground there,
     * so every column that happened to front a tree or a rock stood at
     * full height while its run-mates sank — a comb of random full
     * segments standing over the very things the reveal exists to
     * show.) Same smoothstep window on the continuous render position
     * as wallHeightAt, widened for the taller mass — a 3.4 crown
     * overhangs ~6.5 rows, so the ease runs out at dyF [9..11] instead
     * of [7..9], and the one-slab probe reaches 5 rows deep (a bastion
     * 4-5 rows thick still throws its crown over the ground in front
     * at GARRISON_H; house walls stop at 3 because WALL_H 2.05 never
     * overhangs that far). Sinks to the same WALL_STUB as every wall
     * kind, so a curtain meeting a building run cuts to one shared
     * crown line.
     */
    private garrisonHeightAt;
    /**
     * Great-ashlar face masonry, drawn in the CURRENT frame with the
     * base line at y = 0 and the face rising to -hs (callers set up
     * plain or sheared frames — a diagonal's courses land parallel to
     * its hypotenuse exactly like paintFaceBands). The block grid is
     * WORLD-ANCHORED: joints and per-block tints key off world-space
     * block indices, so a course runs unbroken across every tile of a
     * run and two neighbours can never disagree about a joint.
     */
    private paintGarrisonMasonry;
    /**
     * One parapet merlon — a square-hewn tooth standing mh above the
     * wall-walk. Drawn inside the crown's height layer in plan coords:
     * (mx0, my0) is the tooth's plan footprint (mw × md); the outward
     * face rises from the footprint's south edge and the cap plane
     * lifts by mh, so the 2.5D top-plane law holds at parapet scale.
     */
    private merlonBox;
    /**
     * A straight curtain-wall tile. Same structural skeleton as
     * wallItem (shared-edge snapping, rear riser, one crown layer) with
     * the garrison dialect throughout — and the crenellated struct
     * outline: the crown silhouette steps over every parapet tooth, so
     * even at far zoom the black edge itself reads castellated.
     */
    private garrisonWallItem;
    /**
     * A 45° curtain turn. Same geometry laws as diagWallItem (near-row
     * sort for camera-facing masses, sheared face frame so courses land
     * parallel to the hypotenuse) with garrison masonry, and parapet
     * teeth marching along the hyp — square-hewn blocks stepping the
     * diagonal, which is exactly how real crenellation turns a corner.
     */
    private garrisonDiagItem;
    /**
     * One iron-bound gatehouse leaf, drawn in the door frame (y = 0 at
     * the threshold). Heavier than any house door: vertical board
     * seams, three full-width iron straps studded with nail heads, and
     * the free edge catching light as it stands ajar. The swing
     * compresses width toward the hinge exactly like the French pair.
     */
    private paintGarrisonLeaf;
    /**
     * THE GATEHOUSE — a merged E-W garrison gate run as ONE arched
     * passage through the curtain. (tx,ty) is the run's west anchor.
     * The composition, ground up: worn threshold flags; a pair of
     * iron-bound leaves to the spring line (doorOpenness swings them,
     * a locked refusal shudders them); the raised portcullis showing
     * its teeth in the arch head; a dressed voussoir arch with a proud
     * keystone; garrison ashlar above; a machicolation band under the
     * parapet; flanking piers with quoined edges wearing raised caps —
     * and the curtain's crenellation marching unbroken over the whole
     * gate. Every element rides the same veil height as the runs it
     * joins, so a revealed gate sinks with its wall.
     */
    private garrisonGateItem;
    /**
     * A garrison gate in a N-S curtain — the edge-on passage, in the
     * side-doorway grammar at fortification scale: the curtain run ENDS
     * at the opening (honest notch), worn passage flags with landing
     * slabs poking out both approaches, and ONE tall iron-bound leaf —
     * thrown open it stands outside the wall line in the neighbour
     * column; shut it reads as the edge-on slab barring the notch.
     */
    private garrisonSideGateItems;
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
     * THE RAILING — a hip-height terrace rail in the fence rebuild's
     * dialect: one capped post per tile (the same foreshortened-cap
     * grammar as the field fence, cut short), ONE top board with real
     * thickness (lit plane over a front face) reaching half a tile
     * toward every railing neighbour, and thin baluster slats seated
     * under the board. Rails merge with rails only — a railing never
     * joins a wall mass. N-S runs are the honest edge-on projection:
     * the board's top plane marching up-screen through the posts, and
     * every connected direction draws, so corners and T-junctions stay
     * one continuous handrail.
     */
    private railItem;
    /** Memoized span walk-axis (true = walk runs N-S), cleared on any
     *  world change — one flood per span, shared with the bake's law. */
    private readonly bridgeAxisMemo;
    private bridgeAxisVersion;
    private bridgeWalkVert;
    /** Memoized apron verdict — renderLift is hot and the neighbor
     *  probes must run once per tile. Cleared with the axis memo. */
    private readonly bridgeApronMemo;
    private bridgeApron;
    /** Memoized 45° notch-fill verdict (deckFillAt) — probed per water
     *  tile in the item collect and per rail edge, so it must cost one
     *  neighbor scan per tile, not one per query. worldVersion-cleared
     *  like the dock memo. */
    private readonly deckFillMemo;
    private deckFillVersion;
    private deckFill;
    /**
     * The parapet across a notch fill's hypotenuse: posts and slanted
     * members spanning corner to corner of the 45° edge, riding the
     * full deck lift (fills never sit in a ramping run — the run law
     * flattens ragged spans). Sort follows the diagonal-sort law: a
     * camera-facing hyp draws in front of the bodies north of it, a
     * far-side hyp sorts behind the deck's traffic.
     */
    private deckFillRailItem;
    /**
     * A bridge's hip-height parapet: one live rail item per exposed
     * SIDE edge — the edges perpendicular to the span's walk axis — so
     * the rail line runs the whole crossing, bank apron to bank apron,
     * while both walk ends stay open. These are y-sorted items, never
     * bake: a body crossing the deck sorts behind the south rail.
     */
    private bridgeRailItems;
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
     * EVERY slice sorts at the RUN's north end (runTop), not its own
     * row: a per-slice sort let a southern slice beat a body standing
     * north of it and crop the blade it swung past the rim (the
     * armory-crop fix) — the strip never honestly occludes anything,
     * so the whole run loses together.
     */
    private cliffSideItem;
    /** Memoized SPILL-LAW lookup (waterfalls.ts) — pure world data, so
     *  results cache across frames and clear with the world, like
     *  dockMemo. Keys quantize the normal but pass the TRUE normal
     *  through: the diagonal start-tile offsets depend on it. */
    private readonly fallMemo;
    private fallMemoVersion;
    private fallAt;
    /** Organic water-region clip paths for the falls (world tile coords,
     *  applied under the camera affine like the reflection composite) —
     *  cached per fall run, cleared with the world like fallMemo. */
    private readonly fallClipMemo;
    private fallClipVersion;
    private fallClip;
    /** Clip the ctx to a world-coordinate region path lifted by `lift`
     *  screen px — the reflection-composite idiom: transform, clip,
     *  restore the transform but keep the clip. Callers wrap in
     *  save()/restore(). */
    private clipFallRegion;
    /**
     * THE MOUTH REGION — the feed channel's drawn water region EXTENDED
     * through the dry rim strip to the crest by a VIRTUAL sampler: the
     * spill columns' rim tiles count as water, so marching squares
     * grows organic banks that CONTINUE the channel's own drawn banks
     * exactly (the shared tile edges hash to the same crossings). The
     * headrace tongue clipped to this region meets the authored water
     * edge seamlessly — the alignment the straight tile-edge tongue
     * never had. `axis` is the run's direction; (runA..runB) the tile
     * range along it; `rim` the first dry tile row/col on the high
     * side; `step` walks from the rim toward the feed water.
     */
    private mouthClipFor;
    /** THE LANDING REGION — the real drawn water at the landing
     *  elevation around a fall's foot. Pool dressing (outwash entering
     *  the pool, rings, rafts, the strong mist veil) clips to it so
     *  nothing paints onto drawn grass past the meandering shoreline. */
    private landClipFor;
    /** The contiguous spill run through a boundary column — the mouth
     *  region must span the WHOLE run (per-segment virtual sets would
     *  seam mid-channel). Walks quarter-point spill tests both ways. */
    private fallRunColsX;
    /** Smooth value noise over one world axis, level-salted — the falls'
     *  anti-repetition lattice (the cliff-face world-keying law). */
    private static fallNoise;
    private fallTones;
    /** THE BREAKWATER — where the sheet knifes into the pool. Not a
     *  band and never a slab: a rank of low-poly FOAM MOUNDS in the
     *  world's own two-tone blob language (wash base under a lit foam
     *  cap, chunky 7-vertex polygons like every canopy and pool blob
     *  in the game), overlapping along a WORLD-KEYED grid so segment
     *  seams vanish, and tapering to nothing at true run ends
     *  (capL/capR) — the foam ends because the mounds shrink away,
     *  never because a fill stops. Behind the rank, the dark LAP line
     *  grounds the impact; in front, crescent backwash slides off into
     *  the pool and the dissolving tail carries the last flecks out.
     *  (ox,oy) = low-side push; `push` = screen-px drop to meet the
     *  dipped sheet base. */
    private drawFallChurn;
    /** Airborne life at a fall's landing: drifting mist motes and darting
     *  spray, dt-gated per visible fall (the portal-emitter idiom).
     *  Enhancement layer — rides the Water motion setting. */
    private emitFallHaze;
    /**
     * Spill tests for one downhill face segment, emitting the curtain
     * and its low-ground dressing. Halves are tested independently (the
     * same quarter-offset law as ramp ownership) so the curtain starts
     * and stops on the channel's tile edges, not the dual cell's.
     */
    private pushSouthFallItems;
    /**
     * THE WATERFALL CURTAIN — water continuing over a cliff face,
     * painted in THE POUR dialect: the world's flat-vector water
     * language folded over an edge. Everything is OPAQUE stepped tone —
     * never a translucent gradient (a see-through curtain reads as
     * wallpaper on the wall, the shipped proof-of-concept failure).
     * Top to bottom: the HEADRACE (the channel's own open-water tone
     * carried solid to the lip, mid-current lanes stretching as the
     * water gathers speed, a pale acceleration shelf where it thins
     * over the arris), the CREST ROLL (the foreshortened curl — the
     * top-plane law applied to water: a lit convex band riding the
     * arris, tearing off in world-keyed scallops, casting one crisp
     * shadow on the sheet), and the SHEET itself (0.4-tile world-grid
     * bands of the water palette, each breaking at a world-keyed height
     * into its air-charged lower half — a hard step, not a fade; base
     * DIPPED south of the wall foot and free ends FLARED outward as
     * the unconfined edge fans in air — the 2.5D pitch-out read; foam
     * threads at constant SCREEN speed — phase rate divides by drop
     * height so a two-level fall doesn't cascade twice as fast).
     * Churn, outwash, rings and mist live in per-row items on the low
     * ground (fallOutwashRowItem) so elevated landing rows — which
     * blit as items at rowTy-0.01 — can't paint over them; diagonals,
     * whose landing is a corner pocket rather than a row, draw their
     * dressing right here. Every mark is keyed to WORLD coordinates
     * (the cliff-face law): the sheet runs unbroken across segment
     * seams and around 45° turns, and both dip and band edges key to
     * world x so abutting segments join pixel-true.
     */
    private waterfallItem;
    /**
     * One low-ground row of a straight fall's landing: the outwash
     * tongue slice (spreading as it runs, whitest at impact); row 0 adds
     * the churn mound over the sheet's foot; the last row adds pool
     * rings (FLAT-law 0.6 ellipses), drifting foam rafts, the mist veil,
     * and owns the haze particles. Per-row items because elevated
     * landing rows blit as items at rowTy-0.01 — one spanning item
     * would be painted over by every row after its own.
     */
    private fallOutwashRowItem;
    /**
     * THE SIDE FALL — water over a pure north-south rim. The face is
     * edge-on (the cliffSideItem cheat strip), so the fall reads as a
     * narrow ribbon hugging the rim line: crest fold at the top, scroll
     * threads at constant screen speed, aerating body, churn stack at
     * the landing. One item per contiguous water streak of the run —
     * the sheet's motion needs the whole height, not row-sliced phases.
     * Sorts at its FIRST row without the side item's early bias: every
     * wall slice that can overlap sorts earlier by construction (their
     * bias is the full crown lift), while bodies beside the rim still
     * win against the wall line itself.
     */
    private fallRibbonItem;
    /**
     * A side fall's flat-ground dressing: the crown headrace running
     * sideways into the rim line, the outwash fanning across the low
     * ground, pool rings and the mist veil. Sorts after every crown and
     * landing row blit it can touch ((r1-1)+0.03 beats rowTy-0.01).
     */
    private fallSideDressItem;
    /**
     * NORTH falls: the face looks away from the camera, so the visible
     * story is the crown — the race running away toward the edge, the
     * boil at the silhouette, the peeking top of the hidden sheet — and
     * beyond the ridge, the far basin's churn (occluded by the lifted
     * crown exactly where it should be) plus a rising plume. Diagonal
     * back-bevels are skipped: the flanking cardinal faces carry them.
     */
    private pushNorthFallItems;
    /** The crown half of a north fall: race away to the edge + the boil
     *  line at the silhouette. Sorts after every crown row it crosses. */
    private northFallRaceItem;
    /** The far-basin half of a north fall: churn, rings and a small
     *  veil at the landing, sorted to draw BEFORE the lifted crown rows
     *  so the ridge occludes it exactly where it should. */
    private northFallChurnItem;
    /** Descent direction of a Ramp tile: the cardinal neighbor a level down. */
    private rampDir;
    /** Deterministic per-stone jitter, world-keyed like the terrain bake. */
    private static stone01;
    /**
     * A stone stair crossing the cliff line - real STEPPED PRISMS, not a
     * striped slab. Flights climbing away from the camera show receding
     * tread tops with hard step edges; flights climbing toward the
     * camera show full riser faces under each tread; sideways flights
     * show their south stringer as a zigzag of stepped faces with a lit
     * lip on every tread nose. Entities still ride the smooth
     * renderLift() gradient - a half-step of float against the drawn
     * treads is invisible at gait speed.
     *
     * ONE FLIGHT PER RUN: the collector hands N/S flights their whole
     * E-W run (see STAIR-RUN LAW at the call site), so cheek walls stand
     * only at the two exposed ends and every tread is a single fitted
     * course across the full width. Running-bond joints and per-block
     * tint (stone01) keep a wide course from reading as an extruded
     * slab; the joints land differently on every flight, so no two
     * staircases in the world are pixel-identical.
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
    /** Demolished tiles that fall as blocky masonry, not sawn lumber. */
    private static readonly STONE_FALL_TILES;
    /**
     * THE SALVAGE LAW's collapse: a player construction coming down at
     * (wx,wy). Tones and mass come from the demolished tile itself —
     * walls slump from height in long sawn slabs (or blocky masonry for
     * the stone family), floors barely hop — under one rolling dust
     * bloom. Returns whether the piece fell as stone, so the caller can
     * pick the rubble voice over the timber crack.
     */
    demolishBurst(wx: number, wy: number, tile: Tile): boolean;
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
    /** Per-frame time budget for non-visible sprite bakes (pad bands,
     *  cadence re-bakes) — see SPRITE_BAKE_MS. */
    private spriteBakeMsLeft;
    /** Per-frame shadow-mask bake allowance — see shadowMask. */
    private maskBakeBudget;
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
    /**
     * Does the board at this tile carry words? Set by main.ts from the
     * live sign store — the painter must not show ink on a blank post.
     * A plain hook (not a renderer-owned copy of the data) keeps the one
     * source of truth in the game state.
     */
    signHasText: ((tx: number, ty: number) => boolean) | null;
    /**
     * Drop a prop's baked sprite so its next frame repaints. The lever
     * for art that depends on GAME STATE rather than time: writing on a
     * sign changes what the board looks like, and the static ring's
     * 240-frame heal is far too slow to feel like your own pen.
     */
    invalidateProp(tx: number, ty: number, tile: Tile): void;
    /** The interaction furniture that never joins the step-aside fade:
     *  the pieces a body walks up to USE. Ghosting the table you dine
     *  at (or the seat under you) breaks the scene it exists to sell. */
    private static readonly NEVER_FADE_TILES;
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
    /**
     * THE GHOST EMBER: while the standing world mostly hides the own
     * body — a rear facade seen from the street, a canopy the veil only
     * half-opens — a dithered lantern-gold silhouette of the rig draws
     * over the occluders. Deliberately a POSITION CUE, not an x-ray:
     * flat tint (no equipment detail), screen-door weave, eased over
     * GHOST_EASE_S, and multiplied by the stealth ghost's own alpha.
     * Own player only — no other body ever earns one (anti-wallhack).
     */
    private drawGhostEmber;
    /** The Bayer screen-door tile at device resolution — shared by the
     *  veil window and the ghost ember's weave. */
    private ditherPattern;
    /**
     * THE STEP-ASIDE FADE's per-sprite gate: returns the alpha this
     * occluder should draw at. Fades ONLY when the sprite truly
     * occludes the own body — it FRONTS the body (base row at/south of
     * yours, so the y-sort draws it over you) AND its inset silhouette
     * overlaps the body box. OCCLUSION, NOT PROXIMITY: approaching or
     * standing beside something in the open fades nothing (the v2
     * proximity window was rejected for firing early). Eased per
     * sprite over FADE_EASE_S to THE PRESENCE FLOOR (FADE_ALPHA) —
     * never lower: a faded tree stays readable to cut, dodge and
     * navigate by (v3's stack-divided alphas drove dense forest to
     * ~3% — "invisible walls", user verdict). Deep-canopy shade over
     * the body is the ghost ember's job, not more transparency.
     */
    private occluderFade;
    /** THE PROMISE LAW: a sapling tile draws its own bespoke young form
     *  (saplingModel) of the adult it will become; tree tiles draw the
     *  grown wood. One door for every tree-model read in the renderer. */
    private treeOrSaplingModel;
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
    /** Fence-family connectivity: rails reach toward these neighbours. */
    private fenceish;
    /**
     * A square-hewn fence post wearing a foreshortened cap plane — the
     * 2.5D anchor every fence mass hangs from (crate-lid grammar: lit
     * plane, shaded far edge, sunlit front arris). Paints its own brand
     * outline; call it AFTER the rails so the post face covers their
     * run-through seams and every joint reads carpentered.
     */
    private drawFencePost;
    /**
     * THE FENCE REBUILD — post-and-rail stock fencing in the game's
     * 2.5D dialect. One capped post per tile; two rails with REAL board
     * thickness (a lit top plane over a front face) reach half a tile
     * toward every fence-family neighbour, so a run reads as one
     * carpentered line. N-S runs are the honest edge-on projection:
     * each rail shows only its top plane, a narrow strip marching
     * up-screen — the sunlit upper strip overlays the shaded lower one,
     * and the two-board step surfaces only where a run dies south into
     * a post (never mid-run: the south neighbour repaints it). 45°
     * tiles stride corner-to-corner with sheared boards; straight tiles
     * grow a matching stub toward any 45° neighbour whose line points
     * back at them, so turns are continuous rail, not butted ends.
     * Every mass strokes its own structural outline live (the wall law:
     * exposed edges only, shared edges never) — estate-length runs ring
     * seamlessly with no bake cap, and the post, drawn last, covers
     * every joint.
     */
    private fenceItem;
    /**
     * THE FENCE GATE — a waist-high five-bar field gate hung between
     * two stout capped hinge posts, riding the door law wholesale (the
     * tile is the state; doorOpenness eases the swing, a locked rattle
     * shudders it). E-W gates swing the leaf flat against the west
     * hinge (the door-leaf law: width compresses toward the hinge,
     * edge-on shade deepens, detail collapses to a slab). N-S gates
     * read edge-on when shut — a framed strip barring the gap — and
     * throw ONE leaf front-on into the east column when open (the
     * side-door law: never a pair).
     */
    private fenceGateItem;
    private objectItem;
    /**
     * THE CLOTH TAKES THE STREET — the awning painter, v3, the
     * pixel-lock rebuild:
     * - THE ONE PATH LAW: a single silhouette Path2D is BOTH the base
     *   fill and the ink stroke — the outline sits exactly on the
     *   cloth's edge, and a gap between fill and ink is impossible by
     *   construction. All interior work clips to the same path.
     * - THE PLANE SPEAKS IN VALUE (crate-lid grammar): the canopy slab
     *   is the SKY-LIT top plane — brighter than any vertical face —
     *   rolling darker into the tuck at the wall, with a sunlit arris
     *   where it breaks over the front rail; the valance hangs PLUMB in
     *   the darker unlit dye. That value split, not the trapezoid
     *   alone, is what reads as looking DOWN onto a canopy instead of
     *   straight at a curtain.
     * - THE FRAME IS VISIBLE: timber cheek boards ride both side edges
     *   (free and flush ends alike — flush neighbours pair theirs into
     *   a shared post), diagonal wall braces catch the rail ends at
     *   free ends, the ledger bolts through on plates, and the front
     *   rail carries the skirt. The canopy is BUILT to its wall.
     * - THE SKIRT HAS PRESENCE: deep scallops (market), a full drop
     *   skirt with fold shading (shed), a piped bow band (bowed) — the
     *   hanging edge is impactful, plumb, and breathes in the gusts.
     * - Join states, in-plane projection, SKIN, WIND, VEIL, and
     *   HEM-CLEARS-THE-HEAD all carried from v2. Live-drawn.
     */
    private awningItem;
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
    /** The four bed colorways — MUST mirror the bed painter's QUILTS
     *  table and its run-head hash key. One lookup for tuck and flip. */
    private static readonly BED_QUILTS;
    /**
     * THE THROWN COVER: when a sleeper rises, the bed's covers get
     * tossed — a one-shot cloth flip owned by the BED (keyed by its
     * head tile), not the body. A single fold spring with overshoot
     * carries the throw; a five-point flutter row gives the free edge
     * its fabric life (the cape's philosophy at a fraction of its
     * cost). World-anchored so the camera can pan through it; self-
     * deleting once settled — zero cost while no one is getting up.
     */
    private readonly bedFlips;
    /** Flight beats: airborne, fade window, then the bed re-makes itself. */
    private static readonly FLIP_FLY_S;
    private static readonly FLIP_FADE_AT;
    private static readonly FLIP_REMAKE_S;
    private static readonly FLIP_TOTAL_S;
    private startBedFlip;
    /** Advance one flip's flutter row; true = finished, remove it. */
    private stepBedFlip;
    /** Paint one thrown cover: the quilt flies off the WAY the body
     *  left — arcing, tumbling, trailing-edge fluttering — and fades
     *  mid-air while the bared bed quietly re-makes itself from the
     *  foot up; the final frame IS the painted quilt (invisible
     *  handoff). */
    private drawBedFlip;
    /** A bedpost capped with a turned finial — the shared post brush. */
    private bedFinialPost;
    /**
     * The vertical bed's footboard — rail and finial posts as their OWN
     * layer: the bed paints it over the drape, and the sleeper's tuck
     * and the thrown-cover flip repaint it over their cloth, so the
     * posts always stand in FRONT of the blanket (user z-index law).
     */
    private bedFootboardVert;
    /**
     * The bed's patchwork quilt — ONE painter shared by the bed case
     * and the sleeper's tuck, so the covers over a body are pixel-
     * identical to the covers on an empty bed (no invented rectangles,
     * no strange edges — THE SAME CLOTH). Blocks under seam lines,
     * softened by white thread.
     */
    private quiltPatch;
    /**
     * A camera-facing bed's covers: the patchwork from the chest line
     * down to the mattress edge, with the fold-back sheet band along
     * the head edge. Row count derives from the quilt's own height so
     * bed and tuck always agree on the pattern.
     */
    private bedCoversVert;
    /**
     * A side-on bed's covers: the foot-end patchwork with the deck's
     * far-third shade and the vertical fold-back sheet band at the
     * head edge. Shared by the painter and the sleeper's tuck.
     */
    private bedCoversSide;
    private humanoidItem;
    /** Per-entity alert glyph animation state (icon + when it changed). */
    private readonly alertAnim;
    /**
     * THE TELEGRAPH: the "?" / "!" over a wary or engaged head — the
     * player-facing read of the perception ladder. Gold "?" = something
     * has its attention (suspicious/investigating); ember "!" = the
     * hunt is on; the hunting "?" pulses — the chain is broken but the
     * body is still out there looking. Pops in on every transition so
     * the moment reads at a glance. Nameplate-dialect glyph text drawn
     * in the label pass (no outline ring), never emoji.
     */
    private alertIconItem;
    private readonly questAnim;
    /**
     * THE QUEST MARK: the gold "!" over a giver with work to offer, the
     * gold "?" over the hand a finished quest returns to — per-viewer
     * truth resolved from the client's own ledger (EntityMeta.actor is
     * the key; nothing personal ever rode the wire). Same nameplate-
     * dialect glyph as the alert telegraph, with a slow breathing bob so
     * an errand mark never reads as combat. Never emoji.
     */
    private questIconItem;
    private drawMiniHp;
    /** Eight-tap alpha dilate → tinted ring under the sprite. */
    private static readonly OUTLINE_TAPS;
    /**
     * THE BODY-SPRITE CACHE (the "entity-outline rework" the 120fps
     * pass called for). Keyed items cache their finished composite —
     * ring UNDER art, exactly what the direct path draws — in a
     * per-body canvas: an idle body costs ONE blit per frame instead of
     * a full paint + dilate (~47μs each; town at 0.85× carried 57 of
     * them = 40% of the frame). Re-bakes happen at full rate while
     * `olDyn` (moving/turning/fighting/blending), when `olSig` changes
     * (gear swap, hp tick, hurt flash), on zoom drift past 20% (held
     * during glides — the freeze law), and otherwise on the
     * OL_IDLE_CADENCE stagger so idle micro-life keeps breathing at
     * animation rate. In the mirror pass (bakingMask) the cache is
     * READ-ONLY: a cadence-stale sprite under 0.38-alpha sheared water
     * is invisible, and baking there would fire draw-closure side
     * effects (gather chips, footsteps) twice a frame.
     */
    /**
     * The exposure the multiply map resolves at a world point: ambient
     * screened with every pool in reach — 1 − (1−amb)·Π(1−Lᵢ) — with a
     * coarse LOS walk so lamplight doesn't reach through walls. With
     * `wantDom`, the strongest single pool is stashed in dom* for the
     * rim-light pass.
     */
    private sampleExposure;
    /** Coarse LOS for relight: one blocker sample per tile along the
     *  line, clear of both endpoints. */
    private lightSees;
    /**
     * THE BODY STANDS IN ITS OWN LIGHT. The multiply map exposes a tall
     * sprite by the ground rows BEHIND it (screen pixels are geography),
     * so a body at a brazier kept a cold head while the floor behind it
     * glowed, and a body north of a pool wore light that wasn't its own.
     * This pass corrects the just-blitted sprite toward the exposure at
     * its BASE: under-lit bodies get the pool's color lifted in, hottest
     * at the feet and dying up the body (light lands from the base, like
     * every pool in the game), plus a rim crescent on the edge facing
     * the dominant light — silhouette-shift masking, the poor man's
     * normal map. Over-lit bodies get the difference multiplied back
     * out. Skipped in daylight, in the mirror pass, and past the
     * per-frame budget; the whole pass costs a few small composites.
     */
    private relightBody;
    private paintOutlined;
    /** Blit a cached body composite at the item's CURRENT body rect —
     *  scale-compensated like the tree cache when mid-glide. */
    private blitBodySprite;
    /** Re-bake a keyed body: run the scratch pass, composite ring+art
     *  into the body's own canvas, blit it. Costs the direct pass plus
     *  two small copies — paid only on dynamic/cadence/sig frames. */
    private bakeBodySprite;
    /** Direct (uncached) outline pass: scratch build + two blits. */
    private paintOutlinedDirect;
    /**
     * The shared scratch build: art into A, dilated tinted ring into B.
     * Returns the region geometry (device px + css + margin).
     */
    private paintOutlineScratch;
    /**
     * The crypt garrison's kit, variant by variant — the warrior's grave
     * iron, the archer's bone-and-iron Marrowpoint with a hip quiver, the
     * guard's rusted helm and oak kiteshield, the champion's mantle and
     * the sword from his own purse. Every piece is a real item the mob
     * (or its tier) actually drops: the look IS the loot story.
     */
    private static readonly SKELETON_EQUIP;
    private static readonly GOBLIN_EQUIP;
    /**
     * Gnoll kit — the loot-story law: scavenged pieces that really drop
     * from the warband's tables. The skulker swings rusted camp iron;
     * the packlord hauls the greatblade no goblin could lift.
     */
    private static readonly GNOLL_EQUIP;
    /**
     * Gnoll stature: seven feet carried low — the skulker stands over
     * any brigand even hunched, and the packlord looms near the troll.
     */
    private static readonly GNOLL_SIZE;
    /**
     * The road-thieves' kit — leathers and honest iron, every piece a
     * real drop from the wearer's table (the loot-story law). The
     * archer slings a shortbow and quiver; the reaver fights sword-and-
     * dagger, the dual-wield silhouette marking the camp's name.
     */
    private static readonly BRIGAND_EQUIP;
    /** Human outlaws stand player-tall; the reaver a shade over. */
    private static readonly BRIGAND_SIZE;
    /** Weathered human hides — road tans, not goblin green. */
    private static readonly BRIGAND_SKIN;
    /** Shared empty kit — stable identity for the body-sprite signature. */
    private static readonly NO_EQUIP;
    /**
     * Skeleton stature ladder: the dead stand taller and gaunter than
     * goblins — the archer a touch lighter, the guard a head above the
     * rank-and-file, the champion looming over all of them.
     */
    private static readonly SKELETON_SIZE;
    /**
     * Kobold kit: the loot-story law — every carried piece really drops
     * from the wearer's table. The digger swings the bronze pick it
     * mines with; the digmaster's iron pick is the tier's chase drop.
     */
    private static readonly KOBOLD_EQUIP;
    /** Kobold stature: knee-high nuisance to a boss you look up at. */
    private static readonly KOBOLD_SIZE;
    /**
     * The downed companion: a pre-settled beast ragdoll breathing where
     * it fell (THE FALL IS NEVER THE END). Built once per eid, physics
     * run to rest at build time; the live frame adds only the slow
     * breath — a scale swell no corpse ever has.
     */
    private downedBeastItem;
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
     * in the ground (or ride the NPC they hit), Arx fizzles in a burst.
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
     * The world-space half of the worn-light grammar (wornLight.ts holds
     * the law): the trail under the boots, the wake off the cape, and the
     * body-wide corona. The body-space half — brow, weave, knuckles,
     * greaves, rune face — rides the rig, where the joints are known.
     *
     * Called once per lit body per frame from collectEntities. Rate-gated
     * on frameDt exactly like statusAmbience, so the effect costs the
     * same at 30fps and 144fps.
     */
    private wornLight;
    /**
     * Ground speed, in tiles per second, for a body we only ever see
     * positions of. Remote bodies arrive interpolated and own arrives
     * predicted, so measuring the delta is both the simplest and the most
     * honest source: whatever the body VISIBLY did is what the trail
     * answers to.
     */
    private trackWornMotion;
    /**
     * THE TRAIL. Prints stamped one stride apart, alternating left and
     * right of the line of travel, plus motes shed while moving. Speed
     * gated: walking leaves nothing, only a runner paints.
     */
    private trail;
    /**
     * THE WAKE. The cape's channel: matter shedding off the trailing hem,
     * behind the body and low, so it reads as the garment leaving light
     * behind rather than the body being on fire. Motion-scaled, because a
     * standing cape has no wake.
     */
    private capeWake;
    /**
     * The body-wide corona. Tier is loudness: a tier-1 kit gets nothing
     * here (its whole voice is the per-slot glint on the rig), tier 2
     * gets a quiet lamp that becomes real scene light after dark, and
     * tier 3 gets the living charge that marks a walking masterwork.
     *
     * The corona answers the STRONGEST worn working only. Summing eight
     * of them would put a bonfire on anyone with a full kit and undo the
     * per-slot reading the whole grammar is built on.
     */
    private wornCorona;
    /** Placed summons: totem, snare trap, straw decoy. */
    /**
     * THE STONE REMEMBERS: a little headstone over a spilled pack, up
     * for the spill's quarter hour. Kept small against the rig (hip
     * height) — a marker, not a monument. Each stone leans and cracks
     * by its eid, so a battlefield of them reads as a yard of
     * individuals, never a stamp.
     */
    private gravestoneItem;
    private summonItem;
    /** Ground perspective squash for combat-fx circles. */
    private static readonly FX_SQUASH;
    /** Overlay lifetime per fx kind, ms (telegraph/field ride their fuse). */
    private fxLife;
    /**
     * Jagged energy forks biting outward from a strike point — the
     * shared "after-zap" vocabulary. The caller sets stroke style and
     * width, opens ONE path, and strokes after; each fork is a boltPath
     * with its own kink seed, so feeding a re-kinking clock seed makes
     * the whole splash writhe frame to frame. `baseA` + `arc` aim the
     * splay (2π = full radial burst); the 0.85 vertical squeeze keeps
     * the splash reading at body height, not flat on the turf.
     */
    private fxForks;
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
    /**
     * THE SIGNATURE CONTRACT: a bespoke set-piece may register under the
     * fx's full id or — for woken workings, whose ids arrive structured
     * as `<action>:<procId>` — under the bare proc id. Either key wins
     * (wornLight.ts documents the promise; this honors both halves).
     */
    private sigFor;
    /**
     * Build the per-frame context a bespoke signature hook receives.
     * One small object per signature-bearing fx per stratum — bounded
     * by the 48-fx cap, never per particle.
     */
    private makeSigCtx;
    private fxDebris;
    /**
     * The signature layer, GROUND HALF — the parts of each ability's
     * bespoke set-piece that lie FLAT on the turf: light pools, spiral
     * arms, wheeling rays, fissures, petals, root-bites. Painted in the
     * under pass so bodies stand ON the mark. The standing parts of the
     * same motifs (spears, bars, pillars, rifts, rain) live in
     * collectMotifVolumes and y-sort with the world.
     *
     * SHARED-SEED LAW: when a motif splits one element across both
     * halves (a spear's root-bite here, its standing blade in the
     * volume pass), both walks consume the seeded PRNG identically per
     * element so the halves always agree where the element stands.
     */
    private fxMotifGround;
    /**
     * The signature layer, VOLUME HALF — every standing part of a motif
     * becomes its own y-sorted world item anchored where it touches the
     * ground: spears and cage bars wrap AROUND bodies, rain falls past
     * shoulders, wisps weave between fighters, the rift swallows what
     * walks behind it. This is what makes a spell feel cast IN the
     * world instead of printed on the screen.
     */
    private collectMotifVolumes;
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
    /**
     * The GROUND stratum of combat FX — everything a spell lays flat on
     * the turf paints here, UNDER the y-sorted world: lingering decals,
     * telegraph sigils, hazard floors, and every expanding ring, light
     * wash, and crescent sweep. Bodies stand ON these marks — the far
     * rim of a nova hides behind the caster, the near rim rolls out in
     * front of their feet. That one fact seats the Arx in the world.
     */
    /**
     * THE TRAIL, painted. Runs in the ground pass so every print lies
     * UNDER the y-sorted world: a body standing on its own trail hides
     * the part behind its heels, exactly as it should.
     *
     * Prints are stamped during collectEntities, which runs after this
     * pass, so a print appears one frame after the foot fell. That is
     * imperceptible on a mark that lives 1.2 seconds, and it buys us a
     * single entity walk per frame instead of two.
     *
     * Every school writes differently. These are nine SHAPES, not one
     * shape in nine colors: a rime print whitens the turf and a void
     * print darkens it, and if you desaturated the whole screen you
     * would still be able to tell which school ran past.
     */
    private drawTrail;
    /**
     * THE HELD SIGIL: the hold-to-aim ghost. It speaks the telegraph's
     * exact dialect — stained floor, dark under-band, rotating identity
     * dashes, rune blocks, the center instrument — but at whisper alpha
     * and with NO clock: no contracting fuse, no sweep wedge, no arming
     * sequence. A telegraph is a countdown; the ghost is a promise still
     * in the hand. Three voices, quietest first: the range hoop around
     * the body (how far the art can reach), the tether (whose promise
     * this is), and the ring itself (where it lands, how wide it bites).
     */
    private drawAimGhost;
    private drawGroundFx;
    /**
     * The VOLUME stratum of combat FX — kind-level standing matter,
     * collected into the world y-sort: the blast's fireball body, the
     * nova's vertical light kick, buff runes orbiting the caster's
     * body, summon glyphs riding their ring, reaction stars at chest
     * height, the tall furniture standing in hazard fields — plus every
     * motif's volume half. Each element anchors at its OWN ground point
     * so spells wrap around bodies instead of covering them.
     */
    private collectFxVolumes;
    /**
     * The AIR stratum of combat FX — the overlay pass. After the v3
     * split this owns only what genuinely flies ABOVE the scene: the
     * traveling line effects (dash streaks, lightning, beam corridors)
     * and their impact glints. Everything a spell lays on the ground
     * paints in drawGroundFx; everything standing IN the world y-sorts
     * via collectFxVolumes. This pass also runs the fx lifecycle:
     * expiry, spawn-moment debris/decals, and the scheduled aftermath
     * beats — one place owns the clock.
     */
    private drawCombatFx;
    /** An annular sector (arc band) path in ground perspective. */
    private fxSectorPath;
    /** Screen-space footprint of a tile, elevation-lifted. */
    private ghostFootprint;
    /** The mass triangle of a 45° piece over a footprint rect. */
    private ghostDiagPath;
    private drawBuildGhost;
    private drawActionProgress;
    private drawFloaties;
    private drawHpBar;
}
//# sourceMappingURL=renderer.d.ts.map
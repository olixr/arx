import { Tile, type DaylightSample, type Vec2 } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { FootprintField } from './footprints.js';
import { Particles } from './particles.js';
import { type SpillInfo } from './waterfalls.js';
import { Debris, type SmashKind } from './debris.js';
import { type ElementTint } from './wornLight.js';
import { Birds } from './birds.js';
import { BakeLane } from './bakeAdmission.js';
import { InteriorMap } from './interiors.js';
import { type BandBucket, type StretchBake } from './staticRegister.js';
/** The waterfall palette for one lighting state (fallTones()). */
export interface FallTones {
    foam: string;
    crest: string;
    /** rgba prefix (open paren) for the churn's shaded back lobes. */
    churnBack: string;
    /** rgba prefix (open paren) for the aerated outwash sheet. */
    wash: string;
    dim: number;
    /** OPAQUE sheet column tones, glassy → aerated — the POUR bands.
     *  Flat-vector law: the curtain is stepped opaque bands of the
     *  world's own water palette, never a translucent gradient. */
    band: readonly string[];
    /** The lower, air-charged half of each band (hard step, no fade). */
    bandLow: readonly string[];
    /** The race body — open channel water continuing to the lip. */
    race: string;
    /** The race's darker mid-current lane tone. */
    raceDeep: string;
    /** The acceleration shelf — a HALF-step between race and the pale
     *  bands, so the lip is a gradient of tone steps, not one cliff. */
    shelf: string;
    /** The lit top plane of the crest roll (the 2.5D curl). */
    rollLit: string;
    /** The curl's under-shadow ink. */
    rollInk: string;
    /** OPAQUE splash-zone tones, impact → pool: pale charged water
     *  under the mound rank, then the shallow spreading ring. The
     *  shoreline grammar — stepped opaque zones with wavy boundaries,
     *  never a translucent apron. */
    splashPale: string;
    splashMid: string;
    /** OPAQUE shaded billow tone for the churn's back rank. */
    churnDeep: string;
}
import { type FxStyle } from './abilityFx.js';
import { type StageResTier } from './stage/renderScale.js';
import { type StageItem, type StageTexture } from './stage/stageTypes.js';
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
     * THE LEAN COMES OUT (epic/lean-out): the perspective lean strength,
     * once a dial (Epic B). The dial is gone — q is a CONSTANT 0, never
     * assigned, so every projection short-circuits to the plain affine
     * (the pitched-orthographic camera above, byte-identical to every frame
     * shipped). The field lives on only until the last `q` fork is retired
     * and it is deleted with depthScale; the homography it parameterized
     * stays as reference math in cameraProject.ts for the 3D client. */
    readonly q: number;
    /** The local size multiplier at world-depth `wy` (Epic B): 1 at the
     *  camera's look-at row, <1 farther, >1 nearer; exactly 1 at q=0. The
     *  one factor billboard scale / elevation lift / shadow radius ride. */
    depthScale(wy: number): number;
    /**
     * THE DEVICE GRID: the real pixel lattice belongs to the BACKING
     * STORE, not CSS space. The context is scaled by the (possibly
     * FRACTIONAL) devicePixelRatio — a browser zoom mints 1.25/1.75, and
     * the rig's dprOverride can name any value — so a CSS-integer
     * coordinate can land exactly on a half device pixel. Two abutting
     * fills that "share" such an edge each get partial AA coverage of
     * the same pixel column, and the double-blend prints a uniform
     * under-color hairline (the wall-joint / stall-counter seam bug).
     * Every pixel-snap in the renderer must round on THIS lattice.
     * resize() feeds the live ratio each frame.
     */
    snapDpr: number;
    /** Round a CSS-space coordinate onto the device pixel lattice. */
    snapPx(v: number): number;
    worldToScreen(wx: number, wy: number, w: number, h: number): Vec2;
    /** Allocation-free worldToScreen for per-particle hot paths. */
    worldToScreenInto(wx: number, wy: number, w: number, h: number, out: Vec2): Vec2;
    screenToWorld(sx: number, sy: number, w: number, h: number): Vec2;
}
declare const enum BulkKind {
    Particle = 0,
    Debris = 1,
    GroundedBird = 2,
    /** A standing emitter's seated halo — THE SOURCE HAS A BODY (lighting
     *  v4 phase 2): world-sorted light geometry, never a screen disc. */
    Halo = 3
}
export interface DrawItem {
    sortY: number;
    /**
     * THE SHELF LAW — the world sort runs on ONE compound key:
     * (strat, sortY). `sortY` is always the item's RAW world row (its
     * true camera depth — never a lifted/screen-space row), and `strat`
     * is the shelf the item STANDS ON:
     *
     *   - objects, entities, and airborne matter: the elevation level of
     *     the tile under their feet (omitted when 0);
     *   - cliff faces and side planes: their BASE level (level − 1) — a
     *     wall loses to everything standing on its own crown, and wins
     *     over everything at its base level standing behind it (raw row
     *     settles that within the shelf);
     *   - elevated ground rows: shelf 0 for positive levels (the crown
     *     is landscape — bodies at a cliff foot must peek over it), the
     *     level itself for sunken rows (pit floors draw under whatever
     *     stands in the pit);
     *   - ramp flights/aprons: the LOW level (a body at the mouth paints
     *     over the treads); landings: the high level.
     *
     * Higher shelves draw later. Within a shelf, the proven flat-land
     * raw-row order applies unchanged — flat ground (all shelf 0) is
     * bit-for-bit the old sort. This one key retires three generations
     * of pairwise patches (the armory-crop face law, the Lantern Row
     * awning exemption, the face-contest object shift) whose mixed sort
     * spaces let plateau rows slice standing trees and ore.
     */
    strat?: number;
    /** THE STABLE TIEBREAK (grass G-PERF): the collect-order index, stamped on
     *  every item just before the world sort so exact depth ties resolve
     *  deterministically (see DrawOrderItem.seq). Assigned per frame; not read
     *  by any painter. */
    seq?: number;
    draw?: () => void;
    /**
     * CLOSURE-FREE BULK LANE (particles, debris, grounded birds): the
     * hot loops used to mint a DrawItem closure PER PARTICLE PER FRAME
     * (~150-300k allocations/sec in combat at 120Hz — the frame loop's
     * largest GC source). Bulk items carry a kind tag + datum instead
     * and route through drawBulkItem; `draw` stays for everything else.
     */
    bulk?: BulkKind;
    bulkArg?: unknown;
    drawShadow?: () => void;
    /**
     * THE OFF-SCREEN TREE STANDS DOWN — set only by mature-tree items
     * (see cullHiddenTrees). `occKey` finds the cached sprite so a culled
     * tree can keep its entry warm; occX0..occY1 is the screen box the
     * blit would cover. `occCulled` is the pass's verdict.
     */
    occKey?: number;
    /** Band-bucket marker (stage lane): a pure lattice blit the world
     *  sink may quadify at assembly. Set only by emitStretch. */
    band?: {
        sb: StretchBake;
        bk: BandBucket;
    };
    /** Paint bounds (stage lane): the screen rect this item's closure
     *  may touch, for push sites that know it — the sink prefers this
     *  over the split path. Sized honest-and-generous; the oracle's
     *  clip makes an undersized box a visible defect, not a quiet one. */
    pb?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    /** THE SCRATCH LEDGER: this wall-lane member's identity hash (world
     *  anchor + kind + emission index + its chunk's data rev), chained
     *  into the run key so the GL backend can cache the run's texture.
     *  A chunk edit changes the rev, the key, and thus the pixels. */
    pbKey?: number;
    /** THE REV TELLS THE WHOLE TRUTH: the member's quantized dynamic-
     *  paint signature (memberCutSig — reveal heights, door veil,
     *  hearth glass), chained into the run REV so a cached run repaints
     *  when the inputs its painter reads actually move. 0 = at rest. */
    pbDyn?: number;
    /** The member's paint is animation-bound (hung walls breathe): its
     *  run re-revs on a short cadence instead of caching flat. */
    pbLive?: boolean;
    /** Stage-safe (phase A2p2): this item's draw touches this.ctx ONLY
     *  through stage-aware painters (their blit sites emit quads, their
     *  live fallbacks push bounded paints). Set at the push site — an
     *  explicit, reviewable promise, kept honest by the parity gates. */
    stageSafe?: true;
    /** THE WALL LANE (phase A2p3): a reconstruction closure for items
     *  whose brushes closed over the frame ctx at collect time (THE
     *  CAPTURE LAW) — it re-emits the member under the CURRENT this.ctx
     *  and draws only this item's part. The bakes' own pattern; pb is
     *  its bounds. Doorways and windows are permanent live items by
     *  design, and were the dominant split class (fps ~linear in
     *  splits: avenue 29fps at 147 splits). */
    stageRebuild?: () => void;
    occX0?: number;
    occY0?: number;
    occX1?: number;
    occY1?: number;
    occCulled?: boolean;
    /**
     * Screen-space bounds of the body paint. Present = this entity is a
     * living silhouette the outline pass may ring (player preference);
     * labels are excluded via drawLabel.
     */
    body?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    /** Nameplates/HP — drawn on the main canvas AFTER any outline pass. */
    drawLabel?: () => void;
    /**
     * Standing on lifted terrain: the shadow must land ON the plateau
     * surface, so it draws in sorted order (just before the sprite)
     * instead of in the ground-level shadow prepass — otherwise the
     * plateau band, drawn later, would paint it out.
     */
    elevated?: boolean;
    /**
     * Whole-sprite translucency (the own player's stealth ghost). Applied
     * OUTSIDE the outline pass so the silhouette ring fades with the body.
     */
    alpha?: number;
    /**
     * BODY-SPRITE CACHE fields (see paintOutlined). A stable identity
     * opts this item into the outlined-composite cache: while `olSig`
     * matches the cached bake and `olDyn` is false, the frame pays ONE
     * blit instead of paint + 8-tap dilate + tint (~47μs/body — 40% of
     * a town frame at 57 bodies). Idle micro-life (breathing, tail
     * swish, blade shimmer) re-samples on the OL_IDLE_CADENCE stagger —
     * the tree-cadence law applied to living bodies. Items without a
     * key (live stations, legless bodies whose whole locomotion is
     * time-driven) keep the direct per-frame pass.
     */
    olKey?: number | string;
    /** Content signature: any change forces a re-bake this frame. */
    olSig?: string;
    /** True while genuinely animating (moving/turning/fighting/blending)
     *  — forces full-rate re-bakes; cheap idle life waits for cadence. */
    olDyn?: boolean;
    /** World-space ground anchor of the body — opts the item into the
     *  base-exposure relight pass (see relightBody). */
    baseX?: number;
    baseY?: number;
    /**
     * THE ONE RENDER — A5: pitch-aware depth key for a WORLD-GEOMETRY
     * VOLUME (wall/garrison/diag crown run, hedge run). It is the world
     * ROW of the volume's SOUTH/NEAR ground edge — the face you walk
     * BEHIND — so a billboard whose foot is south of (nearer than) this
     * row sorts AFTER the volume (drawn in front) and one north of it
     * sorts before (behind). A row comparison ⇒ zoom-invariant. At q=0
     * this equals the volume's raw south-edge sortY (walls already sort
     * at `y1+1`), so the flat order is preserved (golden gate).
     *
     * DRAW_ORDER prefers `nearRow` over `sortY` as the depth term, and on
     * an exact depth TIE a volume (nearRow set) draws BEFORE a billboard
     * (nearRow unset) — the tie rule "billboard foot ≥ volume near-row ⇒
     * in front" (a body at the base of a wall must win; billboards paint
     * no pixels below their feet). Set ONLY while `occlusionOn` is true —
     * the A5 kill-switch — so with occlusion off DRAW_ORDER reduces to the
     * exact old `sortY` comparator.
     */
    nearRow?: number;
}
/**
 * One cached world sprite — a tree, a forage plant, a discrete prop.
 * The three bakes share this shape so the caches, the eviction, the
 * canvas pool and the occlusion pass all speak one language.
 */
/** THE CLIFF JOINS THE STANDING WORLD: one straight rim run, baked
 *  once and blitted — the strata art is world-keyed and still, so the
 *  bake is a cache in front of the very painter it replaces. The
 *  canvas may be pool-oversized (32px shape classes), so blits read
 *  the recorded w/h, never canvas.width. */
export interface CliffRunBake {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    gridPx: number;
    dpr: number;
    padX: number;
    padTop: number;
    used: number;
}
export declare class Renderer {
    private readonly canvas;
    readonly camera: Camera;
    readonly particles: Particles;
    /** THE LANDING WORD: per-body status memory for application moments. */
    private statusEdges;
    private matterCtxCache;
    /** Smashed-prop chunk bodies — pooled, wall-aware, self-clearing. */
    readonly debris: Debris;
    /** Ambient bird flocks — land, peck, and flush when a body comes close. */
    readonly birds: Birds;
    /** Threat scratch for the bird sim — pooled points, reused every frame. */
    private readonly birdThreats;
    /** Reused frame env for the bird sim (scratch-pool law: one object, ever). */
    private readonly birdEnv;
    private readonly grass;
    /** GPU grass (proposal G-2, behind ?grass=gpu). When true, the visible
     *  field renders instanced on the GPU (blitted at the grass slot) instead
     *  of the canvas2d baked meadow. Off = byte-identical baked path. */
    grassGpu: boolean;
    /** G4 — THE OVER-FOOT SKIRT (behind ?grass=gpu). When true, grass-rooted
     *  objects (tree/bush/rock/prop in the meadow) get a skirt of GPU blades
     *  nestled around their foot so they read as embedded. Dev A/B toggle
     *  (?skirt=off); on by default whenever the GPU meadow is active. */
    grassSkirtOn: boolean;
    private grassGpuLayer;
    /** Whether the GPU path actually drew this frame (→ skip the canvas2d
     *  coat and the tall y-sort pass; false → the baked meadow ran). */
    private grassGpuActive;
    /** Pooled scratch for the GPU path — never reallocated per frame. */
    private readonly grassBlades;
    private readonly grassFlowers;
    private readonly grassSeeds;
    private readonly grassDisturb;
    /** G1 — the visible tall standing mass (GrassTall north/south), gathered
     *  by-sorted for the GPU interleave path; pooled. */
    private readonly grassTall;
    /** This frame's tall-band atlas blits (from GrassGpuLayer.renderTall) and
     *  the atlas canvas they read — emitted as y-sorted DrawItems in collect
     *  so the tall mass interleaves with bodies. Empty ⇒ CPU tall fallback. */
    private grassTallBlits;
    private grassTallCanvas;
    /** G-PERF diagnostics (?perf): fine band count before coalescing vs the
     *  coalesced sub-draw count actually rendered — the sub-draw reduction the
     *  optimization buys, confessed on the grass line. */
    private grassBandFine;
    private grassBandCoalesced;
    /** G4 — THE OVER-FOOT SKIRT. This frame's grass-rooted objects (tree,
     *  bush, rock, prop on a grass tile), gathered as objectItems are emitted
     *  so each carries its true foot sort row. After the world collect, each
     *  becomes one skirt band (generateSkirtBlades) drawn OVER its own base. */
    private readonly grassSkirtSites;
    /** Pooled skirt-blade array (all sites concatenated) + per-site bands. */
    private readonly grassSkirt;
    private readonly grassSkirtBands;
    /** Per-tile skirt-blade cache (a still object mints its skirt once). Keyed
     *  by tile; footY is stored so a tile whose object changed (tree→stump,
     *  a different foot row) re-mints instead of reusing the stale skirt. */
    private readonly grassSkirtCache;
    private grassSkirtBlits;
    private grassSkirtCanvas;
    /** This frame's GrassFrame (camera/wind), stashed by drawGrassGpu so the
     *  later skirt pass renders under the exact same projection + wind. */
    private grassFrameSaved;
    private readonly lighting;
    /** Derived building-interior regions (cutaway, facades, windows). */
    readonly interiors: InteriorMap;
    private localRegion;
    /** Regions discovered in view this frame (feeds the shadow shelter). */
    private visibleRegions;
    /** The frame's sky sample — every shadow and light reads this. */
    sky: DaylightSample;
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
    bakingMask: boolean;
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
    ctx: CanvasRenderingContext2D;
    /**
     * The outline "shader": entities paint FLAT (no baked strokes), and
     * this post-pass rings each living body's silhouette by dilating its
     * alpha — one uniform line around character, cape, staff, and legs
     * alike, applied dynamically so it's a player preference, not paint.
     */
    outlineOn: boolean;
    /**
     * EDITOR SEAMS (Map Studio v2, ADDITIVE SEAMS ONLY law — the studio
     * grows these two fields and the overlay call, nothing else
     * editor-shaped; every scene pass stays private).
     *
     * cameraOverride: when set, the frame uses this camera verbatim —
     * the player-follow ease, view-shift, cine pull, and shake all
     * yield, and zoom escapes the player clamp (the studio frames the
     * world, no body required).
     */
    cameraOverride: {
        x: number;
        y: number;
        zoom: number;
    } | null;
    /**
     * THE REEL ROOM's second seam (src/reel): how much of the game's own
     * chrome the frame is allowed to carry. A capture wants the bodies
     * and the ground, not a dashboard floating over them — a trailer
     * that shows "Goblin (5)" in 12px sans over a swing has stopped
     * being a trailer.
     *
     *   'all'   — every label and gauge. The player's frame. (Default.)
     *   'drama' — no nameplates, no gauges, but the world still SPEAKS:
     *             damage rises, risen words stand, the ceremonies play.
     *   'none'  — the bare world.
     *
     * Cleared with the shot, exactly like cameraOverride.
     */
    chrome: 'all' | 'drama' | 'none';
    /**
     * The editor's one drawing seam: called at the very end of the
     * frame (over the vignette) with the settled camera's transforms.
     * The renderer never learns editor concepts; the editor never
     * reaches into scene passes.
     */
    overlayHook: ((ctx: CanvasRenderingContext2D, view: {
        w: number;
        h: number;
        scale: number;
        yScale: number;
        toScreen: (wx: number, wy: number) => Vec2;
        pickWorld: (sx: number, sy: number) => Vec2;
    }) => void) | null;
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
    /** Per-body wading state: splash edges + wake phase. `seenAt` marks
     *  the last frame the body was dressed, so the under-water ring pass
     *  never draws a stale collar; `lastRippleAt` throttles the trailing
     *  wake rings a moving wader sheds. */
    private readonly wadeStates;
    /** THE WAKE REMEMBERS: rings shed into the water — trailing ripples
     *  behind a moving wader, the splash ring of a step in or out. Drawn
     *  UNDER every body (right after the live water pass), expanding and
     *  fading on their own clocks. */
    private wakeRipples;
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
    /**
     * THE GROUND CACHE LEARNS THE BYTE LAW.
     *
     * Round 10 established it for the band ledger — a cache of canvases
     * is bounded by BYTES, never by slots, because a slot's cost is not
     * a constant. `baked` never learned it. It was capped at 80 entries
     * (28 at the hi-res tier), and a chunk canvas is 4.3MB at px=32 and
     * 17MB at px=64 — so the same "80" meant 341MB on flat ground at one
     * zoom and over a gigabyte on terraced ground at another, with every
     * `lifted` elevation layer a full-size canvas of its own on top.
     * Nothing weighed them, so nothing could see that.
     *
     * And none of the three ways a chunk canvas left this map returned
     * it: the re-bake swap overwrote `entry.canvas`, the distance evict
     * was a bare `delete`, and the plane crossing was a bare `clear()`.
     * Measured over five minutes of travel, that lane alone allocated
     * and discarded 1.5GB — 65% of every canvas byte the client mints,
     * from 1.5% of its canvas calls. The JS heap never shows it (canvas
     * backing store is not heap), which is why every counter read
     * healthy while the compositor wore the cost.
     *
     * Chunk canvases are the one lane where reuse is exact: every canvas
     * of a tier is the same size, so a retired one is always the right
     * shape for the next bake and the free list needs no fit search.
     * They get their OWN pool rather than the sprite pool, for two
     * reasons: a 4.3MB chunk canvas exceeds `POOL_SLOT_MAX_BYTES` and
     * would be refused outright, and even if admitted, two or three of
     * them would consume the entire 32MB sprite budget and starve the
     * lane that turns over thousands of small sprites a scene.
     */
    /** THE CHUNK POOL IS KEYED BY SHAPE (B2): base squares and the
     *  row-tight lifted canvases are different shapes, and a flat free
     *  list fragments — a take for one shape finds only others (measured
     *  ~30% hit-rate at px64). One free list per (w,h), like the sprite
     *  pool, restores per-shape reuse; a global FIFO orders cross-shape
     *  eviction under the byte budget. */
    private readonly chunkCanvasPool;
    /** Global insertion order across all shape buckets — the eviction
     *  queue when a push would overflow CHUNK_POOL_BUDGET. */
    private readonly chunkPoolFifo;
    /** Backing-store bytes the chunk canvas pool currently holds (B2's
     *  byte bound — see CHUNK_POOL_BUDGET). */
    private chunkPoolBytes;
    /** Pool effectiveness telemetry (B2): a take served from the pool
     *  (hit) versus a fresh allocation (miss). A rising miss rate during
     *  a pan at the px64 tier is the churn signal the byte budget must be
     *  large enough to avoid. Cumulative; read off the `?perf` ground line. */
    private chunkPoolHits;
    private chunkPoolMisses;
    /** Live bytes held by `baked` (base canvases + every lifted layer). */
    private bakedBytes;
    /** Take a canvas of exactly this shape from the pool, if one waits. */
    private takePooled;
    /** Round a pixel extent up to its 32px reuse class. */
    private static sizeClass;
    /** Bucket key for a class-sized canvas. */
    private static poolKey;
    /** Bytes a canvas's backing store occupies. */
    private static canvasBytes;
    /**
     * Retire a chunk canvas: off the live ledger, then into the free
     * list. Bounded by BYTES, not a count. A count cap was honest only
     * while every chunk canvas was one of two square sizes — but it was
     * already tier-blind (16 canvases = 68MB at px32, 272MB at px64), and
     * B2's tight lifted layers (row-span heights) end the one-size
     * invariant outright, so a count would price a byte-varied pool
     * dishonestly. Oldest-out when a push would overflow the budget.
     */
    private recycleChunkCanvas;
    /** Every canvas a baked entry owns — its base and its lifted layers. */
    private recycleBakedEntry;
    /** A free chunk canvas of the requested tier and row span, or
     *  undefined. `rows` (B2) defaults to a full-height base canvas; a
     *  lifted layer asks for its bucketed row-span height. Exact (w,h)
     *  fit-search — the byte-bounded pool holds mixed shapes now. */
    private takeChunkCanvas;
    /**
     * THE CROSSING (docs/planes-plan.md §2.4): the world under the
     * camera just became a DIFFERENT world with legitimately overlapping
     * coordinates. Every position-keyed cache the renderer holds must
     * drop whole — a survivor would paint another plane's furniture
     * here. Version-gated memos (lift/dock/bridge/fall) self-heal off
     * the worldVersion bump; this clears everything that does not.
     */
    /**
     * THE BAKE LEDGER DROPS WHOLE: every position-keyed RENDER/BAKE cache
     * and the GL residency it owns. Shared by onPlaneSwitch (a new world)
     * and onBackendSwitch (the SAME world, a different backend) — both need
     * the bakes re-minted from scratch, and neither can keep a texture that
     * was minted for the other case. Deliberately does NOT touch ephemeral
     * world matter (corpses, arrows, footprints, particles) or the
     * animation eases (chest/door/tree-growth): those survive a backend
     * swap unchanged, and are the plane crossing's OWN concern (below).
     */
    private dropBakeCaches;
    /**
     * THE BACKEND SWAPS UNDER A LIVE WORLD (displaySettings): the
     * Accelerated-display toggle just flipped stageGround/stageWorld, but
     * the bakes on hand were minted for the OTHER backend (canvas gutters
     * vs GL atlas residency). Left alone they paint cropped/broken until a
     * teleport or reload clears them — the caches drop only in
     * onPlaneSwitch. This performs the SAME bake wipe as a plane crossing
     * MINUS the plane's own concerns: the world, its coordinates, its
     * ephemeral matter and its eases are all unchanged and stay put, so
     * only the bake ledger and GL residency drop and both backends re-bake
     * cleanly from scratch on the very next frame.
     */
    onBackendSwitch(): void;
    onPlaneSwitch(): void;
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
    cineEid: number | null;
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
    zoomGliding: boolean;
    frameDt: number;
    w: number;
    h: number;
    private hitstopUntil;
    private vignetteUntil;
    /** Hurt-band ink — a DoT tick tints the edge toward its wound. */
    private vignetteRgb;
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
     * The sliding corpse budget (THE FIELD PAYS ITS WAY): stepped by the
     * same frame-time signal the ?perf confession reads — a machine
     * holding its own display budget earns the full field, a straining
     * one sheds toward the floor. Adjusted on a slow clock so it never
     * thrashes with one bad frame.
     */
    private corpseBudget;
    private corpseBudgetStepAt;
    private corpseNudgeAt;
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
    /**
     * Red edge flash when the local player takes damage. A DoT tick
     * names its wound and the bands take that ink (green edge = POISON,
     * no words needed); a plain blow stays the standing red.
     */
    flashHurt(via?: 'burn' | 'bleed' | 'venom'): void;
    /** Expanding impact ring at a world position. */
    addRing(x: number, y: number, color: string, maxR?: number): void;
    /**
     * THE KEPT FLAME answering a hand: 'light' is a soft amber take —
     * one warm breath of a ring and a few rising motes; 'snuff' is the
     * honest grey — slow wisps curling off the dead wicks. Deliberately
     * the quietest fx in the game: a candle is mood, never an event.
     */
    addCandleFx(x: number, y: number, lit: boolean): void;
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
    /**
     * THE TRACKED GROUND (footprints.ts): prints stamped where feet
     * leave the soil — the leg rigs' lift rings feed it, the ground
     * decides the ink, and it paints in the same stratum as the decals
     * below. Public so the Display toggle can reach the field.
     */
    readonly footprints: FootprintField;
    /** Bound terrain-lift sampler for the footprint painter. */
    private readonly footprintLift;
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
    readonly wornMotion: Map<string | number, {
        x: number;
        y: number;
        t: number;
        speed: number;
        stride: number;
        foot: number;
        seen: number;
        /**
         * Direction of TRAVEL, measured from the position delta before
         * the sync — never the aim. In a mouse-aim game the two disagree
         * constantly (strafing), and prints must land along the line the
         * feet actually ran. NaN until the body has moved.
         */
        heading: number;
    }>;
    /**
     * Live footprints. A ring buffer, hard-capped, because this is the
     * only system in the game allowed to write on the ground and an
     * uncapped one would turn a busy square into a light puddle.
     */
    private readonly trailPrints;
    /** Where "near" is measured from — the own body, or the camera. */
    wornOrigin: {
        x: number;
        y: number;
    };
    /** Lit bodies counted this frame, for the crowd backstop. */
    wornLitBodies: number;
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
    ownBuiltTiles: Array<{
        tx: number;
        ty: number;
    }>;
    setOwnBuilt(keys: ReadonlySet<string>): void;
    /** Ghost icon bitmaps by buildable id — data-URL images decode async,
     *  so the first frame may skip the icon; it pops in a beat later. */
    readonly ghostIcons: Map<string, HTMLImageElement>;
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
     * THE TUMBLE's contact ledger: floor strikes already dust-puffed per
     * drop eid, so each bounce fires exactly once. Size-capped, cleared
     * wholesale when it overgrows — a stale zero only re-arms dust for a
     * drop that is younger than the age gate anyway.
     */
    private readonly dropContacts;
    /**
     * Screen rects the loot labels landed on last pass — the click
     * affordance. A label IS its drop's hitbox (bags overlap in a pile;
     * their labels never do), with the bag sprite as a fallback target.
     */
    private lootPlates;
    /** Emissive glow requests queued during the frame, composited last. */
    private readonly glows;
    /**
     * THE SEATED HALOS (lighting v4 phase 2): the standing data-emitters'
     * glows, routed here instead of the post-pass `glows` queue. Drawn as
     * sorted world items (pool + corona) inside the world pass, then
     * their flame-point CORES glint in the post pass. queueGlow dynamics
     * and the coded emitters (portals, tables, chests, windows) stay in
     * `glows` until phase 4 seats them too.
     */
    private readonly seatedGlows;
    /** THE OVERREACH FIELD's third-res accumulation scratch (phase 3). */
    private readonly overreach;
    private readonly overreachCtx;
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
     * Arm the context to stroke an architecture silhouette: the same
     * bold dark edge the entity ring gives props and characters, drawn
     * as a hard stroke so buildings, doorways, arches, and pillars read
     * with the flat-art edge the rest of the world wears. Only EXPOSED
     * edges are ever stroked (an edge shared with a run-neighbour gets
     * none), so runs stay seamless — only the building perimeter and
     * its openings are ringed.
     */
    beginStructOutline(): void;
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
    /** Canvas CSS size, observer-maintained (0 until first layout). */
    private cssW;
    private cssH;
    /** The game being rendered this frame (for world lookups in painters). */
    game: ClientGame | null;
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
    /** Nearest crafting station around a world position, if any. THE
     *  VERB IS VISIBLE (work.ts): every station keeps its TRUE identity
     *  — the old grouping collapsed seven trades into one workbench
     *  pantomime, so the weaver, the tanner, the carver, the alchemist,
     *  the enchanter, and the sawyer all tapped the same air. */
    private findStation;
    /**
     * The nearest milkable animal (livestock with produce) in hand
     * reach of a Milk-posed body — what the milker squares up to.
     */
    private findMilkTarget;
    /**
     * One ware on a stall's display top. Kinds: produce, bread, bottles,
     * cloth bolts, pottery, berry basket — small enough to sit under the
     * awning window, distinct enough to read at market distance.
     */
    drawStallGood(kind: number, gx: number, gy: number, s: number, seed: number): void;
    /** Tiles that count as workable stations for interaction heat. */
    private static readonly HEAT_STATION_TILES;
    /**
     * Interaction heat per station tile, 0..1 with an eased attack and a
     * gentler release. Heated by anyone working the station (Craft pose,
     * own player included) and by the local player's open bank/shop/craft
     * panel. Painters layer the in-use choreography over the idle art by
     * reading this — lids glide open, fires flare, beams work harder.
     */
    readonly stationHeat: Map<number, number>;
    /** THE IMPACT IS ONE TRUTH: the last hammer-clang instant per
     *  station tile — the anvil painter's white flash and spark fan
     *  latch to the swung hammer's own beat, never a private sine. */
    readonly stationClang: Map<number, number>;
    /** Struck-node timestamps: a worked tree, rock, or bush shivers for
     *  a beat when the tool lands — the world answers the blow. */
    private readonly nodeImpacts;
    /** Record an impact on a worked node tile. */
    nodeStruck(tx: number, ty: number): void;
    /** Screen-x jitter (±1) for a struck node — a damped ring that dies
     *  inside a quarter second. Zero when the tile is at rest. */
    private nodeShiverAt;
    /** The open station panel's anchor tile (set per frame by main.ts). */
    stationFocus: {
        tx: number;
        ty: number;
    } | null;
    private tickStationHeat;
    /** Classify a tile as a gatherable node kind, if it is one. */
    private gatherKindAt;
    /**
     * THE PATIENT LINE's water: the tile a Fish-posed body angles. A
     * classified fishing spot wins (own player's interact tile first);
     * failing that, honest open water within reach — the pier NPC's
     * case, whose stop stands over plain Water with no node at all.
     */
    private findFishWater;
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
    breezeAt(tx: number, ty: number, t: number, ph: number, s: number, ampA: number, ampB: number): {
        sway: number;
        lag: number;
        gust: number;
    };
    /**
     * The renderer's mirror of terrain's isPorchSurface, closure-free:
     * renderLift runs for every body and item every frame, and a per-
     * call sampler allocation is real garbage in a hot path.
     */
    porchAt(game: ClientGame, tx: number, ty: number): boolean;
    /** Ramp mouth probe directions, hoisted — this literal used to be
     *  allocated fresh on every renderLift call over a ramp tile. */
    private static readonly RAMP_DIRS;
    /** Window indoor-side probe directions (collectStaticLights) —
     *  allocated five arrays per window tile per frame as a literal. */
    private static readonly WINDOW_DIRS;
    /** relightBody's erode kernel: unit taps, scaled by erodePx (axis)
     *  or its 0.71 diagonal at use — was 9 arrays per lit body/frame. */
    private static readonly ERODE_TAPS;
    /**
     * THE LIFT LEDGER: renderLift runs for every body, particle, glow
     * and debris chunk every frame, and the full walk below pays up to
     * eight map lookups per call. The lift is classifiable PER TILE —
     * constant value, bridge apron, ramp flight, or the rare deck-fill
     * tile whose per-point triangle test keeps the slow path — so a
     * world-version-keyed memo collapses the hot path to one map get
     * plus arithmetic. Kinds: 0 = constant (v), 1 = bridge apron
     * (base v, dir code in a: 0=W 1=E 2=N 3=S), 2 = ramp
     * (v = (lvl-1)*ELEV_H, mouth dir in a/b), 3 = slow path.
     */
    private readonly liftMemo;
    private liftMemoVersion;
    /**
     * THE ONE ANCHOR: the screen point of a world position with its
     * render lift applied — the HUD idiom (waypoints, party pips, speech
     * bubbles, sign plates) in one door instead of five copies.
     */
    screenAnchor(wx: number, wy: number, w: number, h: number): {
        x: number;
        y: number;
    };
    renderLift(x: number, y: number): number;
    private classifyLift;
    /** The pre-ledger walk, verbatim — deck-fill tiles still need it. */
    private renderLiftSlow;
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
    liftedWTS: (wx: number, wy: number) => Vec2;
    /**
     * liftedWTS for the bulk lanes (particles, debris, birds): returns
     * ONE reused scratch, so thousands of projections a frame allocate
     * nothing. Consumers copy fields out before projecting again — the
     * drawOne contracts say so explicitly. Never hand this to code that
     * stores the result.
     */
    private readonly wtsScratch;
    private liftedWTSScratch;
    /**
     * World-y whose liftedWTS projection sits PROJ_AIR tiles of SCREEN
     * height above the ground point at `y`. World-y offsets render
     * squashed by the camera pitch (yScale), so anything that must align
     * with a screen-lifted sprite (projectile trails, muzzle/impact
     * bursts, glows) divides the squash back out — a raw `y - PROJ_AIR`
     * rides ~40% low and the trail visibly detaches from the shot.
     *
     * THE AIR RIDES ITS ROW (Epic1 B1): the sprite it aligns with lifts by
     * `PROJ_AIR * spriteScale(y)` (screen px, depthScale-aware via B-1c),
     * but a fixed world-y offset projects with depthScale² through the
     * homography — so the glow sinks below the shot as depth grows. Divide
     * the world offset by depthScale(y) so the projected air height tracks
     * the sprite's `*depthScale` lift. depthScale === 1 at q=0 → the old
     * `PROJ_AIR / yScale`, byte-identical.
     */
    private projAirWorldY;
    /** Screen-px offset of a shadow cast from `hTiles` above the ground. */
    castOffset(hTiles: number): Vec2;
    /**
     * Gather the frame's shadow-casting lights: strong scene lights plus
     * last frame's dynamic ones, gated by darkness (point-light shadows
     * only read once the sun stops washing them out), strongest first,
     * capped so a lamp-ringed plaza stays cheap.
     */
    private buildFrameLights;
    /** Last frame's shadow-casting seats (quantized world pos). */
    private readonly throwSeats;
    /**
     * The shadow throws a point at screen (px, py) receives from nearby
     * lights: world-space unit direction AWAY from each light, a length
     * that stretches as the object sits deeper in the pool's falloff,
     * and an alpha that dies at the pool's rim. `minD` excludes a
     * fixture shadowing itself (props) while letting a body stand right
     * up against a fire (entities).
     */
    /** lightThrows' pooled result: at most two records, rewritten per
     *  call — the old fresh array + literals ran per shadow caster per
     *  frame (~240 casts at night = ~86k allocations/sec). Callers
     *  consume immediately and never hold the array across calls. */
    private readonly throwRecs;
    private readonly throwsOut;
    private lightThrows;
    /** Arm the shadow target for a cast fill; null while nothing casts. */
    private beginCastFill;
    /** Arm for a grounding contact fill — never fully disappears. */
    beginContactFill(): CanvasRenderingContext2D;
    /** One silhouette throw: flattened blob + footprint smear, one path. */
    private blobShadowPath;
    /**
     * A mass `hTiles` up throws its silhouette: once along the sun (or
     * moon), and once away from each nearby pool of light — a tree by a
     * lamp wears both. Each throw is one path, one fill, so a blob and
     * its smear can never double-darken each other.
     */
    castBlob(bx: number, by: number, hTiles: number, r: number, seed: number, smearW?: number): void;
    /** A prism's ground shadow: its base edge extruded along the sun. */
    castEdgeQuad(x0: number, y0: number, x1: number, y1: number, hTiles: number): void;
    /**
     * A body's grounding: foot ellipse, a low lobe cast along the sun,
     * and a lobe away from every nearby light — step up to a campfire
     * and your shadow leans back from the flames; stand between two
     * lamps and you drag a pair.
     */
    private castBody;
    /** A small thing's plain contact ellipse (drops, summons). */
    castContact(px: number, py: number, rx: number, ry: number): void;
    /** The cast lane's kill switch (every lane has one): off, the
     *  brushes fall through to their raw painters — the pre-lane
     *  pixels — for A/B bisection and as the emergency door. */
    stageCastLane: boolean;
    private readonly castSprites;
    /** Bake-or-fetch one cast sprite. `w/h/ax/ay` are device px; the
     *  painter draws in device px with (ax, ay) as the shape's anchor. */
    private castSprite;
    /** Count + sample a raw sdw painter reached under assembly — the
     *  stack names the factory (dev forensics, split-sample pattern). */
    readonly stageCastLeakSamples: string[];
    private stageCastLeak;
    /** The in-sort contact alpha (beginContactFill's own arithmetic;
     *  sdwLayerAlpha is 1 during the sorted pass). */
    private contactAlpha;
    /** Emit one cast sprite as a stage quad. `m` rotates/shears when
     *  given; otherwise the sprite lands axis-aligned with its anchor
     *  at (refX, refY). Alpha 0 emits nothing. */
    private stageCastQuadAt;
    /** The glide fallback: one bounded scratch paint that runs the real
     *  cast brush with this.sdw swapped to the scratch ctx (the cast
     *  helpers paint through sdw, not this.ctx — the swap the old
     *  extraction famously forgot). */
    stageCastScratch(px: number, py: number, pw: number, ph: number, run: () => void): void;
    /** Assembly branch of castEdgeQuad: the quantized parallelogram,
     *  baked once, thrown as a quad. */
    private stageCastEdge;
    /** Shared ellipse sprite (castContact and castBody's every part):
     *  axis-aligned bake, rotation carried by the quad matrix. */
    private stageCastEllipse;
    /** Assembly branch of castBlob: the seeded facet blob, baked once
     *  per (r, seed), thrown along the sun and away from each light —
     *  the same sprite serves every throw. A smeared blob (no current
     *  in-sort caller) keeps the honest scratch fallback. */
    private stageCastBlob;
    /** Assembly branch of castBody: contact ellipse + sun lobe + light
     *  lobes, each an ellipse quad (rotation in the matrix). */
    private stageCastBody;
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
    castFloraShadow(px: number, baseY: number, tile: Tile, h: number): void;
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
     * THE WATER BEHIND THE BODY — drawn right after the live water pass,
     * BEFORE any entity: (a) every shed wake ripple, expanding and
     * fading where the wader actually walked; (b) the BACK arcs of every
     * active wader's collar and wake rings (π..2π — the far side of each
     * ellipse), so the rings pass visibly behind the shins while their
     * front halves ride over them in the label pass. This split is what
     * seats a body IN the surface instead of under a stamped decal.
     */
    private drawWadeUnderlays;
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
     * THE RESOLUTION IS A CONSTANT (user law, 2026-08-18).
     *
     * ADAPTIVE RESOLUTION is RETIRED. It capped the backing store's dpr
     * and stepped it down half a point whenever frames sustained past
     * the panel's budget, climbing back a minute later — and every step
     * was a whole-screen event the player could see: the world changed
     * sharpness, every cached sprite and band went stale at once, and
     * the re-raster wave it touched off cost more than the pixels it
     * saved. On a weaker machine that made a MINUTES-SCALE WOBBLE
     * between two resolutions, which is precisely the "resolution
     * changes / things glitch in scale" the owner will not have.
     *
     * The law now: the game renders at the display's own pixels, always.
     * Frame time is bought with the economies that cost the player
     * NOTHING to look at — sliced chunk bakes, static bands, the sprite
     * caches, the glow-sprite and lamp-patch stamps. Pixels are not on
     * the table. `frameEma`/`minDt` survive because the frame-time
     * telemetry still feeds the corpse-field budget and ?perf.
     *
     * `dprOverride` is the RIG DOOR (dev only): the DEVICE GRID law
     * needs fractional-dpr proofs, and browser zoom is an awkward way to
     * get one. Nothing in the game ever writes it.
     */
    dprOverride: number | null;
    private frameEma;
    private lastFrameAt;
    /** Decaying floor of observed frame intervals ≈ the display's vsync
     *  budget: a machine that ever hits its refresh pins this at the
     *  panel's period (8.3ms at 120Hz, 16.7 at 60), and a machine that
     *  never does decays it to the clamp — the budget of last resort. */
    private minDt;
    /** Last frame's raw dt — the spike filter's "was it already slow" test. */
    private prevFrameDt;
    /** Frame-memoized: `window.devicePixelRatio` is a DOM getter, and
     *  this accessor runs in per-tile/per-sprite hot loops — the getter
     *  alone was a measured ~1% of frame CPU. resize() refreshes the
     *  memo at the top of every frame; browser-zoom changes land within
     *  a frame, exactly as before. */
    private dprMemo;
    private dprMemoFrame;
    dpr(): number;
    /**
     * The frame's effective dpr, readable from outside — satellite
     * canvases (the map screen) size through the same accessor so a rig
     * override or a browser zoom moves every surface together.
     */
    effectiveDpr(): number;
    /** THE CAMERA LEARNS TO LEAN (Epic B, B-1c): a billboard's size scalar
     *  — `camera.scale` foreshortened by depth at the sprite's foot. 1×
     *  depthScale at q=0, so byte-identical until the lean turns on. Every
     *  point-anchored creature/body/mount draw scales its whole rig by
     *  this (its screen POSITION already leans through worldToScreen);
     *  surfaces (walls/cliffs/ground) do NOT use it — they warp per B-1b. */
    private spriteScale;
    /** Per-item depth factor for the FX modules (particles/debris/birds) —
     *  each billboard foreshortens at its OWN world-y, so those modules take
     *  this callback instead of a single scalar. A stable bound field (no
     *  per-frame closure). Exactly 1 at q=0 → byte-identical. */
    private readonly camDepthAt;
    /** THE DEPTH LOD LAW (see LOD_TIER_MIN): the coarse √2 density tier a
     *  cached sprite whose foot sits at world-row `footY` should bake at,
     *  so its baked pixels match its EFFECTIVE (depth-scaled) on-screen
     *  size instead of the flat zoom. 0 at q=0 (depthScale 1) → the flat
     *  tier → byte-identical. Pass `curTier` (the tier a live sprite was
     *  last baked at) to apply the hysteresis dead-band so a per-instance
     *  sprite near a boundary does not re-tier every frame. */
    private lodTier;
    /** The bake dpr for a depth LOD tier (see lodTier): the frame's dpr
     *  scaled by the tier's √2 density multiplier. Tier 0 → dpr() exactly
     *  → byte-identical. Blits read sp.dpr for their source rect, so a
     *  denser/sparser sheet needs no blit change. */
    private lodDpr;
    /** Recover the tier a cached sprite was baked at, from its stored dpr
     *  (density) relative to the current base dpr — the anchor lodTier's
     *  hysteresis reads. A base-dpr change (browser zoom) yields a
     *  fractional result that resnaps, forcing the re-bake that a moved
     *  device grid needs. */
    private lodTierOfDpr;
    /** THE RENDER SCALE (A2): the factor (0 < s ≤ 1) the WebGL stage
     *  rasterizes its backbuffer at, from the live window size, dpr, and
     *  the resolution tier. 1 = native dpr (byte-identical to pre-A2 and
     *  what small/medium windows and the parity rig always get). */
    stageScale(): number;
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
    /** Memoized "r, g, b" → triple — the palette is a fixed set of
     *  literals, and splitting per glow per frame after dark minted
     *  thousands of strings a second in glow-heavy combat. */
    private static readonly RGB_MEMO;
    private static parseRgb;
    /** Tuple → 'r, g, b' for glow-sprite keys — memoized on the tuple's
     *  identity (data rows and parseRgb both hand out stable tuples, so
     *  the overreach pass never rebuilds a string per light per frame). */
    private static readonly CSV_MEMO;
    private static csvOfRgb;
    /**
     * THE CARRIED FLAME (v4 phase 4): any equipped item with carryLight
     * is a real scene light. Registered at entity-COLLECT time — before
     * the shadow prepass — so a held lantern casts THIS frame's shadows
     * (no dynamic-light lag). Flame-gated: it sleeps by day like every
     * man-made fire; each carrier breathes on its own phase. The bloom
     * rides the SEATED halo path (pool + corona + core) at the held
     * height, so the lantern glows like the fixture it is.
     */
    private ownCarryLit;
    private carriedLight;
    /**
     * THE AUTHORED FLAME's door (v4 phase 4): a style-carrying effect
     * queues its bloom AND its authored scene light in one call. With
     * `st.light` the light is the AUTHORED voice — reach, intensity
     * ceiling and height from the style family, instantaneous strength
     * riding the bloom's moment (a/0.4, capped) so a dying ember dims
     * its pool with its glow. Without it, the exact queueGlow floor
     * derivation applies — the floor, not the ceiling.
     */
    queueFxGlow(x: number, y: number, r: number, a: number, st: FxStyle): void;
    /**
     * THE ONE DOOR FOR A DYNAMIC LIGHT.
     *
     * Standing emitters derive reach and strength from the SAME envelope,
     * so a fading fixture zeroes both together and can never hand the
     * exposure pass a light it cannot draw. The fx doors are different in
     * kind: a signature deals its own radius and its own alpha, from
     * different expressions, and only the alpha was ever checked. A
     * radius that reaches 0 (or NaN, from an fx the server sends with no
     * radius at all) while the alpha is still healthy mints a light with
     * strength and no reach — and every consumer that divides by reach
     * then works on NaN.
     *
     * This is that missing invariant, in one place instead of at each
     * call site: a light joins the frame only if it is a real position,
     * a real POSITIVE reach, and a real strength. Returns whether it was
     * admitted so callers can skip the paired bookkeeping.
     */
    private static drawableFlare;
    private admitLight;
    queueGlow(x: number, y: number, r: number, rgb: string, a: number): void;
    /**
     * THE BOLT'S LIGHT FLIES WITH THE BOLT: a projectile's bloom draws
     * INLINE at the shot's own sorted moment — the forest, walls and
     * bodies honestly occlude it (the seated-halo law, applied to a
     * moving source) — while the post pass keeps only a small capped
     * core glint (brilliance through the leaves, like a lit window
     * behind a canopy) and the night lighting still takes the full
     * source. The old post-pass disc floated over every canopy on
     * screen. Callable only from inside a world-pass draw closure —
     * (px, py) are the already-projected screen point.
     */
    private seatShotGlow;
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
    /** THE WET LEDGER — per-frame water lists (see buildWetLists). */
    private readonly wetLists;
    private wetCellStamp;
    private wetStampNo;
    private fgWorld;
    private buildFrameGrid;
    /** Elevation through the frame grid; ChunkStore fallback off-window. */
    /**
     * THE WET LEDGER (see terrain.WetLists): one linear pass over the
     * frame grid compiles the tiles the live-water pass dresses and the
     * dual cells with a water corner, so drawLiveGround / drawShorelines
     * / waterRegionPath stop paying sampler calls for dry meadow. Built
     * fresh every frame from the same snapshot those samplers read —
     * nothing to invalidate. Row-major append in both lists preserves
     * the scans' exact visit order (bucket insertion is draw order).
     */
    private buildWetLists;
    fgElevAt(tx: number, ty: number): number;
    /**
     * THE SHELF LAW: the shelf a standing item sorts on — the elevation
     * level of the tile under its feet (see DrawItem.strat). Undefined
     * at level 0 keeps flat-land items lean and their sort unchanged.
     */
    private stratAt;
    /** Stamp a shelf onto every item pushed since `from` (multi-item emitters). */
    private stampStrat;
    /** Ground tile through the frame grid; ChunkStore fallback off-window. */
    fgGroundAt(tx: number, ty: number): number | undefined;
    /** Detail id through the frame grid; ChunkStore fallback off-window. */
    private fgDetailAt;
    private readonly _vtb;
    private _vtbX;
    private _vtbY;
    private _vtbS;
    private _vtbQ;
    private _vtbYS;
    private _vtbW;
    private _vtbH;
    visibleTileBounds(): {
        minTx: number;
        maxTx: number;
        minTy: number;
        maxTy: number;
    };
    private computeVisibleTileBounds;
    /** Bake pixels per tile: the zoom tier (64px past 1.05× so the
     *  material-edge AA has texels to spare, 32px otherwise). */
    private bakePx;
    private drawGroundChunks;
    /**
     * Emit one visible chunk into the stage lane. The handle syncs at
     * EMISSION — the pooled bake swap retargets it, and an in-flight
     * sliced job repaints its canvas between frames, so the shadow
     * follows the truth with zero coupling to the bake internals. The
     * upload rides the urgent budget (THE ARRIVAL PAYS ONCE with a
     * runaway guard); a declined upload paints through the late lane.
     */
    private stageEmitChunk;
    /**
     * Render the collected ground quads on the GL stage and land them
     * in the 2d frame as ONE drawImage — same task, so no readback and
     * no present race — drawn through the LIVE ctx transform so a
     * zoom-pulse scales the ground exactly as it scaled the per-chunk
     * blits. Late (declined) chunks paint over it through the canvas
     * lane, exactly where they would have landed.
     */
    private stageFlushGround;
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
    /** Cumulative re-bake census for probes (never reset): how many
     *  replacements rode the strip lane vs repainted whole. */
    readonly fringeStats: {
        fringe: number;
        full: number;
    };
    /** THE FRINGE RE-BAKE's kill switch (the staticLayerOn pattern) —
     *  the A/B door for rig proofs and the one-flip refuge if a seam
     *  ever shows in the field. FRINGE_OFF at boot (the parity FLAG
     *  lever) disables it for whole-battery A/Bs. */
    fringeOn: boolean;
    /**
     * THE FRINGE RE-BAKE's gate. Strip-eligible only when the honest
     * conditions all hold: no job in flight (a partial canvas cannot
     * seed the copy), the chunk's own payload object unchanged, the
     * same bake tier, EVERY rev bump since the last bake accounted for
     * by fringe bumps, a nonzero mask, and no elevation inside the
     * strips (lifted-layer contours could reach the changed border).
     */
    private fringeSpecFor;
    /**
     * DEV — THE SEAM PROOF (THE FRINGE RE-BAKE's harness). For this
     * chunk, at the current tier: a fringe bake seeded from a full
     * bake must match a fresh full bake STRUCTURALLY (see the fringe
     * doc in terrain.ts — identical op streams are byte-exact, any
     * stream change re-rolls scattered AA singles, a real defect is a
     * contiguous cluster) — statically for every mask, and across
     * real neighbor-border mutations at several depths. The
     * self-validating wrong-mask CANARY must violate the cluster rail
     * or the proof proves nothing. scripts/probes/fringe-seam.mjs
     * drives this across biomes and owns the gate numbers.
     */
    /** Scratch: last diff's sampled positions [x, y, |delta|] in canvas
     *  px (gutter included) — probe-read beside fringeProof. */
    fringeProofSamples: Array<[number, number, number]>;
    /** Last diff's per-32px-row-band counts + raw value pairs. */
    fringeProofRows: Array<[number, number]>;
    fringeProofPairs: Array<{
        x: number;
        y: number;
        a: number[];
        b: number[];
    }>;
    /** The worst-delta pixel of the last diff (position + values). */
    fringeProofWorst: {
        x: number;
        y: number;
        a: number[];
        b: number[];
    } | null;
    /** The last static case's canvases — the visual harness reads them. */
    fringeProofLastPair: {
        base: HTMLCanvasElement;
        fringe: HTMLCanvasElement;
    } | null;
    fringeProofByCase: Record<string, {
        rows: Array<[number, number]>;
        pairs: Array<{
            x: number;
            y: number;
            a: number[];
            b: number[];
        }>;
        worst?: {
            x: number;
            y: number;
            a: number[];
            b: number[];
        } | null;
    }>;
    fringeProof(game: ClientGame, cx: number, cy: number): Array<{
        name: string;
        diff: number;
        maxd: number;
        cluster: number;
    }>;
    /**
     * DEV — step-prefix bisect for the seam proof: for each prefix
     * length k, run BOTH a full bake and a fringe bake truncated to
     * their first k paint steps (the fringe's copy-back always runs),
     * and report the first k where they diverge past the LSB class.
     * Names the exact diverging step in one pass.
     */
    fringeProofSteps(game: ClientGame, cx: number, cy: number, mask: number): Array<{
        k: number;
        n: number;
        maxd: number;
    }>;
    /** DEV — the state-leak probe: bake full twice, once with the
     *  FRINGE_SCRAMBLE step armed (fillStyle/strokeStyle/lineWidth
     *  scrambled between meadow and skins). ANY diff = a painter that
     *  draws without setting its own style. */
    fringeScrambleProbe(game: ClientGame, cx: number, cy: number): {
        n: number;
        maxd: number;
        worst: {
            x: number;
            y: number;
            a: number[];
            b: number[];
        } | null;
    };
    /** DEV — per-bake cost: median ms of full vs fringe (single edge +
     *  ring) bakes for this chunk at the current tier. */
    fringeCost(game: ClientGame, cx: number, cy: number): {
        full: number;
        fringeEdge: number;
        fringeRing: number;
        steps?: number[];
    };
    /** Any elevated tile inside a strip (+1 ring of paint bleed) sends
     *  the re-bake down the full lane — ground strips repaint their own
     *  elev masks fine, but reused lifted layers must be provably out
     *  of the changed data's reach. */
    private fringeStripHasElev;
    /** The shared job body: terrain steps + one step per elevation level. */
    private buildChunkPending;
    /** Run ONE slice of a pending chunk bake; finalize when done. */
    private advanceChunkPending;
    private evictBaked;
    /**
     * THE GATE MUST BE ABLE TO CLOSE AGAIN.
     *
     * `growingTrees` and `propShakes` are ease clocks whose readers own
     * the only delete: `growthOf` and `propShakeX` retire a key when its
     * ease runs out. That is correct for anything ON SCREEN, and it was
     * written believing the map "is empty except moments after a
     * regrowth" — but the readers run only for pieces that are actually
     * DRAWN, while the writers fire across the whole interest radius.
     * A sapling that sprouts off-screen, or a prop struck out of view,
     * sets a key nothing will ever read, and the key is immortal.
     *
     * The cost is not the entry. It is the FAST-PATH GATE: both maps are
     * read through `size === 0` / `size > 0` tests that stand in the
     * per-tile terrain scan and in every tree's per-frame growth
     * lookup. One orphan latches those gates open FOREVER — from then
     * on every visible tree mints a template-string key every frame, and
     * every tile in view pays `destructibleInfo`, for an ease that
     * finished long ago and a prop that may be miles away.
     *
     * So the sweep is the gate's own door. Both clocks have a KNOWN
     * ceiling (the growth ease tops out at 2600ms, the shudder at
     * 380ms); anything past a generous multiple of that is finished by
     * arithmetic, not by opinion, and can go without consulting the
     * reader. Cadenced because it exists to close a gate, not to keep a
     * frame honest — the readers still retire their own keys the moment
     * they are drawn.
     */
    private evictEases;
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
    wallish(game: ClientGame, tx: number, ty: number): boolean;
    /**
     * THE ONE RENDER — A0 scaffolding: the hedge-run neighbour test, the
     * `HEDGE_TILES` sibling of `wallish`. Defined now so A4 can dispatch
     * hedges through the shared world-geometry volume path (collectVolume
     * with `classOf = hedgish → one class`) instead of the flat prop hack;
     * it is intentionally NOT wired into any dispatch yet (A4 owns that).
     */
    hedgish(game: ClientGame, tx: number, ty: number): boolean;
    /** What stops lamplight — shared law (tiles.ts). */
    private static readonly LIGHT_BLOCKERS;
    /** The stone plinth every timber wall stands on. */
    private static readonly PLINTH_COL;
    /**
     * The wood skin a wall/doorway tile wears (building-keyed — see
     * woodSkins.ts, shared with the floor-plank bake in terrain.ts).
     */
    private woodSkinFor;
    /**
     * THE STANDING WORLD, phase 1 — collectRaisedTiles rides THE STATIC
     * REGISTER: each chunk's per-tile route decisions (wall? ramp run?
     * garrison gate? crop?) are compiled once per (data identity, rev)
     * and replayed here in exact scan order; the DrawItems themselves
     * are still minted fresh every frame (reveal heights, wraps, and the
     * frame clock stay live — the register stores world-space
     * descriptors, never closures). Chunks without a fresh register fall
     * back to the per-tile scan for the same row segment — the fallback
     * IS the correctness contract, and mixing register and scan chunks
     * preserves the global west-to-east, row-major emission order that
     * stable-sort ties depend on.
     */
    private collectRaisedTiles;
    /** Per-chunk compiled scan results (THE REGISTER IS THE SCAN,
     *  COMPILED) — keyed like the ground bake: object identity + rev.
     *  touchNeighbors bumps neighbours on every patch, so cross-border
     *  probes (run walks, deck fills, side-gate tests — all ≤1 chunk of
     *  reach) can never go stale silently. */
    private readonly registers;
    /** Register compiles per frame — a fresh viewport (~12-16 chunks)
     *  warms over 3-4 frames while the per-tile scan covers the gap. */
    private registerBuildsLeft;
    private regGame;
    /** The classifier's window into the world + the renderer's own
     *  probes and tile sets — one long-lived object, no per-frame
     *  alloc. Everything reads live state through regGame. */
    private readonly regHost;
    private readonly regEmitM;
    private readonly regEmitX;
    private readonly regEmitI;
    private registerFor;
    /**
     * THE NEIGHBOR'S FACE IS OUR CONTENT: everything a bandable painter
     * reads OUTSIDE its own member tuple, folded into the stretch sig
     * as DERIVED booleans, never raw tile ids — a door swinging
     * open/shut must keep every neighbor's sig still (the zero-bake
     * door-toggle receipt). Covers the shared-edge joins, crown
     * chamfers, south faces, exposed-end flanks and outlines (wallish/
     * garrisonish at the four neighbors), the north-doorway square-
     * corner rule, the porch-deck lift on rails and props, and the
     * building wood skin (the region anchor deals the palette). Every
     * edit that can change one of these lands within touchNeighbors'
     * 3x3 rev bump (buildings cap at 400 tiles, well inside a chunk
     * ring; chunk arrivals bump neighbors too), so a register rebuild —
     * and with it this digest — is guaranteed wherever it can change.
     * Without this digest, a demolished south row or a run end cut in
     * the NEXT chunk left cold bakes blitting pre-edit art (crowns with
     * no face, unfinished ends) hard-edged against live neighbors.
     */
    private memberContextSig;
    private finishRegister;
    /** Band keys ("cx,cy|stretch") grouped by chunk — maintained at the
     *  cache's one set site and its ONE DOOR (dropBand/dropAllBands). */
    private readonly bandKeysByChunk;
    /**
     * Replay one register row for one chunk segment, in the scan's own
     * encounter order. Admission mirrors the per-tile pads exactly:
     * deep-south rows and side-band columns admit tall silhouettes only
     * (trees, garrison, portals — member.treeLike), and a member's
     * effective encounter column is its first admissible tile, so a run
     * reaching in from a pad lands at the same array position the scan
     * gave it (stable-sort tie order is load-bearing).
     */
    private emitRegisterRow;
    /** The per-tile fallback: classify-and-emit across a row segment —
     *  runs whenever a chunk's register isn't fresh yet. Same pads,
     *  same classifier, same emitter as the register path, so the two
     *  can never drift. */
    private scanRaisedRange;
    /**
     * Emit one classified member — the scan's per-route emission,
     * verbatim: strat stamps, seam offsets, veil heights, ring-cache
     * and shake wraps all live exactly as before. Everything read here
     * (reveal fields, eases, outline toggle, interiors) is read PER
     * FRAME — the register never caches any of it.
     */
    private emitRaisedMember;
    private readonly bandCache;
    /** Per-tile invalidation nonces (sign text and friends) — mixed
     *  into stretch content sigs so state-keyed art re-bakes its band. */
    private readonly bandNonce;
    /**
     * THE FRAME CONFESSES WHAT IT COULD NOT CACHE (?perf): per-frame
     * counts of the frame's uncached work — props/trees/flora that had to
     * paint live for want of a minted sprite, brand-new ground chunks
     * started (each pays a prologue), and shadow masks the budget turned
     * away. Presence is never at stake in any of these; they are pure
     * cost signals, and a STEADY non-zero prop/tree/flora reading is the
     * one thing that should never be seen — it means the caches are not
     * converging and a budget wants raising.
     */
    readonly liveStats: {
        prop: number;
        tree: number;
        flora: number;
        chunk: number;
        mask: number;
        offscreen: number;
        cliff: number;
        fringe: number;
    };
    /**
     * THE BAND BUDGET IS A FUSE, NOT A BROOM — the whole doctrine, the
     * measurements that forced it, and the arithmetic itself live in
     * bandBudget.ts. What stands here is the ledger it reads and the
     * ONE DOOR every removal goes through.
     */
    /** Live band canvas bytes — the ledger, and the admission gate's
     *  left-hand side. Every acquisition adds, every release
     *  subtracts, and dropAllBands re-grounds it at zero. */
    private bandBytes;
    /** Per-frame band accounting (the ?perf confession, phase 5). */
    private readonly bandStats;
    /** Per-frame "this stretch already emitted" marker (blit or live). */
    private readonly bandEmitted;
    private readonly bandScratchSeen;
    private staticBakeMsLeft;
    /** True while a band bake paints: the veil fields read full height
     *  and collect-side glow effects stay quiet (bakingMask). */
    bakeVeilFull: boolean;
    /**
     * THE BANDED JOINT WEARS AN UNDERLAP (bake-only). A stretch's outer
     * edge abuts content drawn from ANOTHER surface — the live windowed
     * wall or gate that split the stretch, or the next chunk's own band.
     * At settled zoom every surface shares the device lattice and the
     * joint abuts byte-exact, but a gridPx-STALE band blits by pure
     * scale ratio (mid-glide / dpr step / awaiting the paced re-bake)
     * and its resampled edge lands up to ~1.5 device px off the live
     * neighbor's snapped edge — printing a background-colored hairline
     * down the full band height at every window transition on every
     * zoom. So the bake extends the END members' paint a few device px
     * PAST the shared edge (same-material flat-wall neighbors only —
     * doors, gates, diagonals and material changes keep exact edges):
     * the neighbor's own opaque paint covers the overrun whenever the
     * lattice agrees, and a stale blit fills the joint with the wall's
     * own masonry instead of grass. Live paint NEVER bleeds a joined
     * edge — THE SHARED-EDGE LAW stands untouched. Keys are packTile of
     * the end members; -1 outside bakes.
     */
    bakeBleedW: number;
    bakeBleedE: number;
    /** The underlap span in CSS px on the bake ctx (dprB-scaled): ~3
     *  device px — misregistration bound (~1.5) plus resample fringe. */
    bakeBleedPx: number;
    /** Bound once — planStretches calls it per member. */
    private readonly memberBandableFn;
    /**
     * v1 band membership: kinds whose painters are pure functions of
     * world state (verified: no clock, no sky) at full veil height.
     * Windowed walls read sky.flame through their glass and hung walls
     * breathe with the breeze — both stay live (SKY NEVER KEYS A BAKE).
     * Doors, gates, and their side variants ride openness clocks; the
     * fire/glow families and everything through objectItem keep their
     * own caches. Phase 4 widens this set.
     */
    private memberBandable;
    /** The layer stands down where its premises fail: the editor pins
     *  the camera and patches tiles at brush rate, and a bake would freeze
     *  the perspective about the stretch's own canvas center rather than the
     *  LIVE screen center (THE STRAIGHT-WORLD PREREQUISITE). */
    staticLayerOn(): boolean;
    /** Device pixels per tile for band bakes (THE CRISP GRID LAW):
     *  targetZoom (one flip per zoom, never mid-glide) × the adaptive
     *  dpr — the treeSprites resolution model, never the ground tier
     *  (walls are 1-3px-stroke art; softening is banned). Bakes run in
     *  a replica of the LIVE environment (CSS-scaled ctx at dpr, snap
     *  on the device lattice), so painters and sprite blits behave
     *  byte-for-byte as on screen. */
    bandGridPx(): number;
    /**
     * THE HOT MEMBER RULE's walk, upgraded for THE SETTLED CUT (round
     * 14). Returns:
     *  -1 — must draw LIVE this frame (a destructible mid-shake, or a
     *       tall prop inside the step-aside fade's support box — both
     *       animate per frame and can never bake);
     *   0 — fully standing (every reveal height at rest): the ordinary
     *       cold band path;
     *  >0 — a CUT SIGNATURE: some wall/garrison member is revealed, and
     *       this hash quantizes every off-full height (own row + north
     *       neighbor — the REAR RISER paints on the neighbor's ease) to
     *       1/48 tile. While the player MOVES the signature churns every
     *       frame and the stretch stays live, exactly as before; once
     *       the player settles the signature holds still, and after a
     *       short stability window the stretch may bake AT ITS CUT
     *       HEIGHTS — standing inside a furnished building no longer
     *       keeps ~20 wall stretches painting live vectors forever
     *       (round 12's #1 open item, measured as the crown's `hot 20`).
     */
    private stretchCutSig;
    /**
     * One member's dynamic-paint signature — the per-member atom the
     * stretch sig folds, and (since the foundation audit) the term the
     * keyed wall-run rev folds too. ONE LAW, TWO CONSUMERS: any input a
     * raised painter reads that can move between frames must appear
     * here, or a cached run freezes mid-ease (the audit's confirmed
     * failure: reveal cuts, door veils and hearth glass froze while the
     * player moved through the far half of the reveal field).
     *
     *  -1 — animates continuously THIS frame (door swing, shake,
     *       step-aside support): the stretch stays hot and the wall
     *       run refuses its key;
     *   0 — nothing dynamic touches this member;
     *  >0 — quantized hash of every off-rest input (heights 1/48 tile,
     *       veil 1/32, flame 1/24).
     */
    private memberCutSig;
    /** Per-stretch cut stability: sig last seen + how long it has held.
     *  Entries prune on a cadence (seen-stamped) — the map only ever
     *  holds stretches currently inside a reveal window. */
    private readonly bandCutStates;
    /** Frames a cut signature must hold before its stretch may bake —
     *  a whisker over interpolation jitter, well under a reader's
     *  patience. Motion churns the sig every frame, so walking keeps
     *  today's live path untouched. */
    private static readonly CUT_STABLE_FRAMES;
    /**
     * Emit one stretch: blit its bake when standing and cold, bake it
     * when the budget allows, and fall back to per-member live emission
     * otherwise. Members of a stretch are consecutive in the row walk,
     * so emitting the whole stretch at its first admitted member keeps
     * every stable-sort tie exactly where the scan put it.
     */
    private emitStretch;
    /** Reusable throwaway set for rebuild-time re-emission (the ramp
     *  dedupe wants A set; the real runSeen already served collect). */
    private readonly stageRebuildSeen;
    /** THE PROMISED FADE's ramp (see WorldSprite.mint). */
    private mintAlpha;
    private stageMarkRaised;
    /** Blit one band bucket at its snapped anchor projection.
     *
     *  THE EXACT LATTICE PATH: at settled zoom on the bake's own dpr,
     *  the bake is an integer-device-pixel TRANSLATION of the live
     *  paint — the in-bake camera origin is snapped on the bake
     *  lattice, so every in-bake snapPx shares the live path's rounding
     *  phase. kx = ky = 1/dpr therefore lands every baked edge on the
     *  very device pixel the live painter would use: no resample, byte
     *  parity at EVERY settled framing, not just integer gridPx.
     *  (Deriving the scale from two snapped endpoint projections — the
     *  old way — quantized a ±1 device-px error into the mapping, and
     *  the one-row vertical baseline amplified it over the full canvas
     *  height: 1-3.5px crown misalignment and hairline background seams
     *  at any non-default zoom, popping at every hot<->cold flip.)
     *
     *  Genuinely stale bakes (mid-glide, dpr step, awaiting the paced
     *  re-bake queue) map by the pure scale ratio instead — transient
     *  softness by design, free of endpoint quantization noise. */
    private blitBand;
    /**
     * Bake one stretch (THE SAME-BRUSH LAW). One probe construction
     * discovers the sort buckets; then per bucket the ctx, camera,
     * snap lattice, and viewport swap to the band canvas (scale =
     * gridPx, snapDpr = 1 — every snapped tile edge lands on a bake
     * integer) and the members' items are constructed AGAIN under the
     * swap (builders capture projections at construction) and drawn.
     * bakeVeilFull holds the reveal at rest; bakingMask keeps glow
     * side effects out of the pixels.
     */
    private bakeStretch;
    /** The flat-wall FACE FAMILY a tile paints with — windows resolve to
     *  their masonry, the two cave masses count as one. Only a same-face
     *  neighbor may receive a band end's underlap (bakeBleedW): any
     *  other joint (door, gate, diagonal, material change) would show
     *  foreign paint the moment a stale blit misregisters. */
    private static wallBleedMat;
    private acquireBandCanvas;
    /** A POOL IS BYTES, NOT SLOTS (bandBudget law 5): a recycled canvas
     *  keeps its full backing store, so a slot count bounds nothing. */
    private poolCanvas;
    private releaseStretchBake;
    /**
     * THE LEDGER HAS ONE DOOR: the only way a band leaves the cache.
     * Release the pixels, then delete the key — never one without the
     * other, and never a bare Map mutation anywhere else.
     */
    private dropBand;
    /** Every band at once, through the same door (THE CROSSING). */
    private dropAllBands;
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
     * Garrison-run neighbour test — the separate-masonry law's auto-
     * tiler. Curtain runs merge ONLY with garrison tiles (a keep's
     * curtain abutting a cottage shows two honest ends), and a gate in
     * a N-S run breaks the run exactly like a side doorway, so the
     * curtain shows real jambs at an edge-on passage.
     */
    garrisonish(game: ClientGame, tx: number, ty: number): boolean;
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
    garrisonHeightAt(game: ClientGame, tx: number, ty: number): number;
    /**
     * One iron-bound gatehouse leaf, drawn in the door frame (y = 0 at
     * the threshold). Heavier than any house door: vertical board
     * seams, three full-width iron straps studded with nail heads, and
     * the free edge catching light as it stands ajar. The swing
     * compresses width toward the hinge exactly like the French pair.
     */
    paintGarrisonLeaf(hx: number, dir: 1 | -1, w: number, yTop: number, h: number, oc: number, s: number): void;
    /**
     * How veiled a doorway's dark interior fill is: 1 far away, easing
     * to 0 as any body nears the threshold — the door "opens" for
     * whoever approaches, no swinging leaf needed.
     */
    doorVeil(_game: ClientGame, cx: number, cy: number): number;
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
     * A freestanding column: faceted plinth, tapered shaft, chamfered
     * capital. Solid, walk-around, y-sorted like a prop.
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
    /**
     * THE LANDFALL NEWEL: the chunky chamfer-capped post a parapet
     * plants where it meets the bank — the crossing's own gate
     * furniture. Retires the grade-level fence posts maps used to stand
     * beside bridge mouths to fake this.
     */
    private drawRailNewel;
    private deckFillRailItem;
    /**
     * A bridge's hip-height parapet: one live rail item per exposed
     * SIDE edge — the edges perpendicular to the span's walk axis — so
     * the rail line runs the whole crossing, bank apron to bank apron,
     * while both walk ends stay open. These are y-sorted items, never
     * bake: a body crossing the deck sorts behind the south rail.
     */
    /**
     * Does the tile at (x,y) carry a parapet rail on its (dx,dy) edge?
     * A parapet exists to keep walkers out of the WATER: edges facing
     * the bank carry no rail (land-facing step edges were stacking
     * little fence boxes down every staircase junction). Ramp aprons
     * keep their rails over land — the sloping entrance's furniture.
     * EVERY water-facing edge rails, regardless of the walk axis
     * (round 7): a stair-stepped span exposes step faces PARALLEL to
     * the walk, and a walk end can only ever be an entrance where it
     * meets LAND. An edge welded to a 45° notch fill is interior: the
     * fill's own diagonal rail item carries the parapet across the
     * hypotenuse instead. One predicate decides the tile AND all its
     * neighbors, so runs read as one continuous parapet.
     */
    private railEdgeAt;
    /**
     * Does any straight parapet rail END at the tile corner (cx,cy)?
     * The gate that keeps a 45° fill's diagonal rail honest: a lone
     * slanted handrail floating on a dock's chamfered prow (no straight
     * rail arriving at either end) read as scaffolding debris — the
     * diagonal only carries the parapet where a parapet actually
     * arrives.
     */
    /**
     * Does a 45° fill's hypotenuse actually CARRY the parapet? Only a
     * bridge-family water fill whose straight rails arrive at BOTH hyp
     * corners — the diagonal is a connector, never a terminus. The old
     * either-corner gate let one arriving rail sling a slanted board
     * across a dock junction's notch that dead-ended mid-structure at
     * the far corner — a floating handrail with an orphan post (the
     * user's dock screenshot). One arriving rail now plants its end
     * post at the corner instead (cornerHeld shares this verdict).
     */
    private fillRailBridges;
    private railArrivesAtCorner;
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
    /**
     * THE STANDING WORLD phase 3 — the cliff contour memo. The
     * marching-squares scan (mask + stair ownership per dual cell, per
     * visible level) re-derived identical geometry 120 times a second;
     * its output only moves when the viewport crosses a tile line or a
     * chunk rev bumps. The memo records the scan's emissions as
     * WORLD-SPACE ops (south faces, north fall crests, merged side
     * runs) and replays them each frame through the very same item
     * builders — items are still minted fresh (the ctx-swap law; screen
     * coords come from the live camera), water falls still probe
     * per-frame, and the paint is byte-identical because nothing
     * downstream of the scan changed.
     */
    /** THE CLIFF JOINS THE STANDING WORLD — cached curtain bakes, keyed
     *  run geometry + world rev + grid (zoom/dpr). Evicted beside the
     *  tree sprites; recycled through the shape pool. */
    readonly cliffSprites: Map<string, CliffRunBake>;
    cliffMemo: {
        key: string;
        levels: Array<{
            level: number;
            /** Flat records: ax, ay, bx, by, nx, ny, ci, cj per south face. */
            faces: number[];
            /** Flat records: ax, ay, bx, by, nx, ny per north fall. */
            norths: number[];
            /** Flat records: nx, x, a, b per merged side run. */
            runs: number[];
            /** Flat records: o0, o1, rev per straight-south face run —
             *  ordinals into `faces` (÷8), grouped once per memo so the
             *  cached-curtain lane never re-derives them per frame. */
            fruns: number[];
        }>;
    } | null;
    /** Memoized SPILL-LAW lookup (waterfalls.ts) — pure world data, so
     *  results cache across frames and clear with the world, like
     *  dockMemo. Keys quantize the normal but pass the TRUE normal
     *  through: the diagonal start-tile offsets depend on it. */
    readonly fallMemo: Map<string, SpillInfo | null>;
    fallMemoVersion: number;
    /** Organic water-region clip paths for the falls (world tile coords,
     *  applied under the camera affine like the reflection composite) —
     *  cached per fall run, cleared with the world like fallMemo. */
    readonly fallClipMemo: Map<string, Path2D | null>;
    fallClipVersion: number;
    /** Descent direction of a Ramp tile: the cardinal neighbor a level down. */
    private rampDir;
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
    chestOpenness(tx: number, ty: number, open: boolean): number;
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
    /** Is this door inside its animation window (swing ease or refusal
     *  shudder)? Expiry-aware: a stale entry (the ease finished while
     *  the door was off-screen and no painter queried it) reads as
     *  settled and is dropped — `has()` alone would pin the stretch
     *  live forever. */
    private doorHot;
    doorOpenness(tx: number, ty: number, open: boolean): number;
    /**
     * Signed shudder offset for a locked door's refusal — a quick
     * decaying knock-knock in the frame. Zero when quiet.
     */
    doorShakeAt(tx: number, ty: number): number;
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
    /** THE SPECIES SHEET: shared tree-body bakes, one per (tile,
     *  variant) — see treeVariantKey. Bounded (~tiles × 16), so it
     *  needs no eviction sweep; cleared with the per-instance caches
     *  on plane cross. Trees no longer occupy treeSprites (flora and
     *  outlined props still do). */
    private readonly treeVariantSprites;
    /** THE SCRATCH LEDGER's diagnostic: why each wall-run kept or lost
     *  its key this session (probe-read, never printed). */
    readonly wallRunWhy: {
        nokey: number;
        big: number;
        player: number;
        anim: number;
        flat: number;
    };
    /** Sun-shadow twin: the projected TRUE-FORM silhouette, RASTERIZED —
     *  built at origin on the sprite cadence and stamped with one
     *  drawImage per frame (the per-frame fill of the complex Path2D was
     *  a measured top cost of forest scenes). `windAt`/`ky` feed the
     *  same live shear delta the body blit wears; `tone` re-bakes on the
     *  sun/moon flip. */
    private readonly treeShadows;
    /** THE SPECIES SHEET, shadow half: shared silhouette bakes keyed
     *  like treeVariantSprites. Same bounded population, same clears. */
    private readonly treeVariantShadows;
    treeBakeBudget: number;
    /** Running average sprite-bake cost (ms) — the admission estimate
     *  for the cost-aware budget gates. Admitting at "budget > 0" let a
     *  0.01ms remainder start a full 0.15-0.6ms bake; every gate now
     *  asks for ~half the average cost up front. */
    bakeCostEma: number;
    private treeShadowBudget;
    /** Per-frame time budget for non-visible sprite bakes (pad bands,
     *  cadence re-bakes) — see SPRITE_BAKE_MS. */
    spriteBakeMsLeft: number;
    visSpriteMsLeft: number;
    /** THE ARRIVAL TELLS JUMP FROM WALK: last frame's camera + the
     *  plane-hop flag feed the arrival ceiling's classification. */
    private arrivalPrevCamX;
    private arrivalPrevCamY;
    private arrivalJump;
    /** Law 2's count floor (bakeAdmission.ARRIVAL_MIN_COUNT a frame). */
    visArrivalCount: number;
    /** The frame's y-sorted draw list — persistent, cleared at reuse. */
    private readonly drawItems;
    /** The level-0 chunk ground composites through the GL stage and
     *  lands in the 2d frame as ONE same-task drawImage (a GPU-side
     *  copy between accelerated canvases), so lighting, post and the
     *  reel keep working unchanged. Shipped as the "Accelerated
     *  display (beta)" Display toggle (arx.stage); ?stage forces it. */
    stageGround: boolean;
    private stageGl;
    /** webgl2 unavailable or init threw — the canvas lane IS the product. */
    private stageDead;
    private readonly stageQuads;
    /** THE STILL-WORLD BARGAIN's lane: chunks whose texture the upload
     *  guard declined this frame blit through the canvas AFTER the GL
     *  image lands (they would be covered otherwise). */
    private readonly stageLate;
    private stageUpMsLeft;
    /** Camera position last frame — the steady prepay lane's velocity
     *  read (THE STEADY LANE FINDS ITS CONSUMER). */
    private stagePrevCamX;
    private stagePrevCamY;
    private readonly stageStats;
    /** ?stage=world (phase A2): the whole y-sorted world pass renders
     *  on a second, ALPHA GL stage and composites over the 2d frame's
     *  ground+water. Cached lanes emit quads at assembly; everything
     *  else replays the dispatch cell through the scratch lane with
     *  honest bounds; the rare boundless item takes the split path
     *  (composite, paint on the frame, resume) and is counted. */
    stageWorld: boolean;
    /** THE RENDER SCALE (A2): the accelerated display's resolution tier —
     *  'auto' caps the effective dpr to 1.5 only on huge Retina windows,
     *  'full' never caps, 'balanced' caps to 1.25 everywhere. Set from
     *  localStorage 'arx.stageres' at boot (main.ts) and by the Display
     *  settings row; applies live, next frame. */
    stageResTier: StageResTier;
    private stageWorldGl;
    /** The frame's world stream. NOT readonly: the shadow prepass
     *  temporarily swaps the sink so the cast brushes' assembly
     *  branches emit into the LAYER stream (A3) with zero new plumbing
     *  at the push sites. */
    stageWorldItems: StageItem[];
    /** THE SHADOW LAYER RIDES THE STAGE (A3): the prepass collected as
     *  stage items, rendered into the world stage's alpha FBO and
     *  composited once at the layer alpha — the first content of the
     *  frame's first flush, exactly where the 2d layer composite sat. */
    private readonly stageShadowItems;
    private stageShadowAlpha;
    private stageShadowPending;
    /** True while the world pass assembles the stage stream — painters'
     *  blit sites emit quads instead of ctx calls. */
    stageAssembling: boolean;
    readonly stageWorldStats: {
        quads: number;
        paints: number;
        splits: number;
    };
    /** Dev diagnosis: what KINDS still split (read from the probe). */
    readonly stageSplitKinds: Map<string, number>;
    readonly stageSplitSamples: string[];
    private stageWorldActive;
    /** Composite the accumulated world stream over the 2d frame —
     *  same-task, through the live transform (the ground flush's law). */
    private stageWorldFlush;
    /** Per-frame paint composition by source tag — the census that
     *  names where the scratch mass actually comes from. */
    readonly stagePaintKinds: Map<string, {
        n: number;
        mb: number;
    }>;
    private stagePaintCount;
    /** Push a raw closure through the scratch lane (SAME-BRUSH swap) —
     *  the painters' own door for live fallbacks with known rects. */
    stagePushPaintRaw(px: number, py: number, pw: number, ph: number, paint: () => void, tag?: string, key?: number, rev?: number): void;
    /**
     * Assembly-run one item: its stage-aware painters emit quads (and
     * push their own bounded fallbacks); the item's alpha folds into
     * stageItemAlpha so stealth ghosts ride the quads. The elevated
     * cast runs FIRST, under assembly, exactly where the sorted loop
     * has always run it — the cast brushes' own assembly branches emit
     * it as sprite quads (THE CAST SPEAKS IN QUADS), so an elevated
     * item no longer needs a named box just to keep its shadow.
     */
    private stageAssemble;
    /** Set by a painter's assembly branch when this frame's content
     *  cannot be staged (see stageAssemble) — never touched elsewhere. */
    private stageNeedsSplit;
    /** Wrap one item's dispatch cell as a bounded paint closure — the
     *  SAME-BRUSH swap: the cell runs against the scratch ctx. An
     *  elevated item's cast emits FIRST as sprite quads (the cast
     *  brushes paint through this.sdw, which the ctx swap below never
     *  touches — deferred, it would land on the real frame). */
    private stagePaintItem;
    /**
     * THE WORLD ON STAGE (phase A2 part 1). Classification, in order:
     * particle runs coalesce into scanned-bounds paints; mature trees
     * with a live sprite assembly-run their painter (the blit sites
     * emit quads; bounds and shear are the painter's own numbers);
     * band blits become quads the same way; bodies and outlined props
     * ride their own body rect; bulk singles project their datum; and
     * whatever names no bounds takes the SPLIT path — correct, counted,
     * and the working list for part 2's quadification.
     */
    private stageWorldPass;
    /** Assembly-time alpha for quad-emitting painters (band fades). */
    stageItemAlpha: number;
    /** Could relightBody paint anything this frame? Its own first
     *  gates, hoisted — by day (or with the budget spent) a cached
     *  body is a pure blit and may ride the quad lane. */
    private bodyRelightPossible;
    /**
     * Sprite-lane texture handles, keyed by their cache record. Part-1
     * deviation from the explicit-release law, recorded: sprite caches
     * churn through pooled canvases at cadence, so their handles ride
     * glStage's ORPHAN SWEEP (records unused for ~900 frames are
     * reclaimed) instead of per-evictor hooks; part 2's atlas brings
     * the explicit lifecycle. `rev` comes from the caller (the sprite's
     * own bake stamp), so an in-place repaint re-uploads exactly once.
     */
    private readonly spriteAtlas;
    private readonly stageTexOf;
    private stageRevSeq;
    /**
     * THE TEXTURE IS THE CANVAS'S SHADOW, taken literally: handles key
     * by the CANVAS — sprite caches mint fresh record objects at every
     * cadence re-bake (measured: ~720 orphaned handles/second, 6.3GB of
     * texture churn in a dense forest when records were the key), while
     * the pooled canvases are the bounded population. Two invalidation
     * axes, both airtight: a pooled canvas claimed by a NEW owner
     * re-uploads unconditionally (the graveyard's stale-band bug when
     * rev alone was trusted), and the SAME owner's in-place re-bake
     * re-uploads via its own frame stamp.
     */
    /** THE SPRITE ATLAS's door: small sprites pack into shared pages
     *  (few binds, dirty-rect uploads); anything oversized rides its
     *  solo texture exactly as before. Returns the texture and the
     *  source offset to add to a quad's sx/sy. */
    stageAtlasTex(canvas: HTMLCanvasElement, rev: number, owner: object, uw?: number, uh?: number): {
        tex: StageTexture;
        ox: number;
        oy: number;
    };
    stageSpriteTex(canvas: HTMLCanvasElement, rev: number, owner: object): StageTexture;
    /** Lazily stand the stage up; a context loss parks it until the
     *  restore handler clears the flag (THE TOGGLE IS THE PRODUCT'S
     *  SAFETY — the canvas path serves every parked frame). */
    private stageActive;
    /** Stale-chunk re-bake candidates this frame (center-first pacing). */
    private readonly replaceQueue;
    /**
     * THE FRAME CONFESSES (?perf): per-phase millisecond EMAs, so a
     * stutter can be attributed to a phase instead of guessed at. Zero
     * cost while off (the flag gates every mark). Enabled from main.ts
     * when the URL carries ?perf; read via perfSummary() at 1Hz.
     */
    perfHud: boolean;
    private perfLast;
    private readonly phaseMs;
    /** Raw last-frame phase ms (no EMA) — read by the G-PERF A/B harness,
     *  which takes a MEDIAN over a sample window so a config-switch spike never
     *  poisons the number the way the EMA does. Populated only under ?perf. */
    readonly phaseRawMs: Map<string, number>;
    private perfMark;
    perfSummary(): string;
    /**
     * THE OFF-SCREEN TREE STANDS DOWN.
     *
     * The world pass draws from a PADDED grid: rows well north and south
     * of the viewport are collected so tall content can lean, sway and
     * cast into view from outside it. Most of those trees have nothing on
     * screen at all — and every one was being blitted in full, ~150k
     * device pixels each, for the canvas to clip away entirely. In a
     * dense forest that was 342 sprites a frame of pure waste.
     *
     * So a tree whose whole box falls outside the viewport stands down.
     * Its cache entry stays warm (`used`), so nothing re-bakes when it
     * scrolls back in, and its ground shadow still casts — that lies on
     * the ground and may well be visible from inside the viewport.
     *
     * WHY THERE IS NO CANOPY OCCLUSION HERE. The obvious companion — cull
     * a tree buried behind nearer crowns — was built, measured, and
     * REJECTED (docs/render-stream-audit.md round 9). It culled exactly
     * zero trees in every scene, and the reason is the projection, not
     * the tuning: at yScale 0.6 a tree one row nearer is drawn only 0.6
     * tiles lower, so an equal-height crown in front stands 0.6 tiles
     * SHORT of the crown behind it. Each receding row peeks above the one
     * ahead — which is exactly why a forest reads as a forest — and only
     * a front tree at least that much taller can bury one behind. In a
     * stand grown from one species grammar, that is the rare case, and
     * a conservative test (which is the only kind allowed to skip a draw)
     * never sees it. The geometry is a feature of the art; do not
     * re-propose whole-tree occlusion without changing the projection.
     */
    private cullHiddenTrees;
    /** Viewport culling on/off — the A/B door for rig proofs and the kill
     *  switch if a canopy ever blinks. */
    occlusionOn: boolean;
    /** The closure-free bulk lane's one dispatch (see DrawItem.bulk). */
    /**
     * One world item, exactly as the sorted loop has always run it —
     * extracted so the stage lane's paint closures replay the SAME
     * cell against a scratch ctx (SAME-BRUSH, one truth, two modes).
     */
    private dispatchWorldItem;
    private drawBulkItem;
    /**
     * One seated halo (see the HALO dials by BulkKind): the POOL as a
     * true camera-foreshortened ground ellipse at the fixture's anchor,
     * the CORONA round at the flame's own height — `lighter`, inside the
     * sorted world pass, BEFORE the exposure multiply. The flame-point
     * core glints later in the post pass (drawGlows).
     */
    private drawSeatedHalo;
    /**
     * Pooled bulk-lane DrawItems, reused every frame. ONLY the bulk lane
     * may pool: entity items can outlive the frame (the reflection
     * registry replays them), bulk items never do — and a pooled record
     * only ever carries the four bulk fields, so nothing stales.
     */
    private readonly bulkItemPool;
    private bulkItemUsed;
    private takeBulkItem;
    /** Debris collision probe, hoisted — a closure per frame through a
     *  megamorphic call site was measurable at 2-4 probes per chunk. */
    private readonly debrisProbe;
    /** Per-frame shadow-mask bake allowance — see shadowMask. */
    private maskBakeBudget;
    frameNo: number;
    /** Trees drawn last frame — feeds the adaptive re-bake cadence. */
    private treesVisible;
    private treeCadence;
    /** Evicted sprite canvases, reused by new bakes (GC churn while walking). */
    /**
     * THE POOL IS INDEXED BY SHAPE, NOT SEARCHED.
     *
     * The sprite pool was a single stack scanned for a canvas that was
     * big enough but not wastefully bigger. That search is the reason it
     * missed: sprite canvases are sized per model, per zoom and per dpr,
     * so a heterogeneous stack almost never holds an acceptable fit near
     * the top, and scanning deeper costs more than the allocation it
     * saves. Enlarging the pool made this measurably WORSE — 384 slots
     * minted 9,867 canvases over a five-minute circuit, 1,480 slots
     * minted 14,766 — because a longer stack only dilutes the window a
     * bounded probe can afford to look at.
     *
     * So the shapes are QUANTIZED instead. Every sprite canvas is
     * rounded up to a 64px class on each axis, which collapses thousands
     * of one-off sizes into a few dozen buckets and turns acquisition
     * into an exact O(1) lookup that either has the shape or does not.
     * The rounding costs at most 63px of margin per axis and nothing in
     * correctness: the blit has always read an explicit source rect, and
     * every bake clears the full canvas before painting, which is why
     * oversized reuse was already legal on the old path.
     */
    private readonly spriteCanvasPool;
    /** Live count across all buckets — `poolAdmits` reads a count. */
    private poolCount;
    /** Pixel bytes parked in the pool — the pool's real bound. */
    private poolBytes;
    /** Reused scratch for the band sweep's plan input (no per-frame
     *  garbage on a path that can run every frame). */
    private readonly bandSweepScratch;
    /**
     * THE CACHE ALWAYS GAINS GROUND — the ONE admission door for the
     * world-sprite bakes (discrete props, flora, trees). The law itself
     * is pure and pinned in bakeAdmission.ts (read it: the deadlock it
     * forbids shipped once and took the world off the screen with it);
     * this is only the frame's state, handed over.
     */
    admitSpriteBake(missing: boolean, visNow: boolean): BakeLane;
    /** Reused admission-state record — the frame loop mints no garbage. */
    private readonly bakeBudgets;
    /** THE FLOOR's one-per-frame token (see admitSpriteBake). */
    private forcedBakeUsed;
    private bakeTreeSprite;
    /**
     * Rasterize the TRUE-FORM sun-shadow silhouette (see treeShadows):
     * the same treeShadowPath geometry as ever, built at the origin with
     * the CURRENT sun ray and this tree's wind sample, filled once into
     * a half-res canvas. Bounds are analytic — the projection maps the
     * upright envelope (the body sprite's own margins) along the ray, so
     * the box always contains the path; the blob radius rides inside the
     * spread margin the envelope already carries.
     */
    private bakeTreeShadowSprite;
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
    /** Pooled BFS scratch for tryRunRingItem's collectVolume flood
     *  (flat x,y interleaved). The neighbour order now lives in
     *  collectVolume, the shared flood primitive. */
    private static readonly runMembers;
    private static readonly runSeenScratch;
    private static readonly runQueue;
    private static readonly RUN_RING_TILES;
    /** THE STANDING WORLD phase 4 — single-tile props whose painters
     *  are provably inert (STATIC_RING minus the run-merged furniture,
     *  which already bakes per component, minus PillarStone, which has
     *  its own route). None of these read the clock or the sky —
     *  Table's candles, LampPost, Brazier, and Hearth all live outside
     *  this set. */
    private static readonly BAND_STATIC_PROPS;
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
    /**
     * THE STEP-ASIDE FADE for a discrete prop, one door for both the
     * blit and the live fallback (they must agree to the pixel — a prop
     * that ghosted while cached and stood solid while live would strobe
     * on every cache miss).
     *
     * A band bake paints the world at rest: the fade is a per-frame,
     * screen-space affair (its box lives in live viewport coords) and
     * banded stretches near the body draw live anyway — never bake a
     * ghost. Short furniture can't hide a body and never fades. THE
     * FURNITURE KEEPS ITS FACE (user law): the interaction set — tables,
     * counters, seats, beds — NEVER ghosts, whatever its drawn height,
     * and neither does the seat the own body is mounted on.
     */
    private propFade;
    private drawPropOutlined;
    /** Pool-aware canvas acquisition shared by the world-prop sprite bakes. */
    acquireSpriteCanvas(prev: {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
    } | undefined, pw: number, ph: number): {
        canvas: HTMLCanvasElement;
        sctx: CanvasRenderingContext2D;
    };
    /**
     * Wild forage nodes, cached exactly like trees: per-instance sprite
     * re-baked on the shared adaptive cadence, outline ring baked in.
     * The per-frame outline pass on ~38 live-painted forage nodes cost
     * 2.1ms in a dense forest (120→94fps) — cached, the steady cost is
     * one drawImage per node.
     */
    private bakeFloraSprite;
    /** Cached-sprite draw for a grown plant — forage node or farm crop. */
    drawFlora(bx: number, by: number, tx: number, ty: number, tile: Tile, h: number, tSec: number): void;
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
     *  veil window and the ghost ember's weave. THE WEAVE RIDES THE
     *  ZOOM: the cell scales with the camera so the ember reads as the
     *  same cloth at every magnification — a fixed device cell turned
     *  into shimmering 1px noise against a zoomed body (the art
     *  audit's #1). Quantized to half-steps so the glide never mints a
     *  pattern per frame. */
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
     *  grown wood. One door for every tree-model read in the renderer.
     *  THE SPECIES SHEET rides this door: the instance hash quantizes
     *  to its variant's dealt hash HERE, so the drawn shape, the
     *  occlusion box, the felling animation, and the shared bake all
     *  describe the same tree — a shape that morphed at grow=1 or at
     *  the chop would be the door split in two. */
    private treeOrSaplingModel;
    /** The shared-bake key: (tile, variant) — one sprite per archetype,
     *  every instance of it a quad. */
    private treeVariantKey;
    /** THE DEPTH LOD LAW meets THE SPECIES SHEET: the shared archetype
     *  sheet is split by depth tier, so near trees share a dense sheet
     *  and far trees a sparse one instead of one flat sheet fought over
     *  by every depth (which would thrash the shared bake every frame
     *  under the lean). Each depth band picks an EXISTING neighbour's
     *  sheet as a tree crosses a boundary — a cheap key swap, not a
     *  re-bake. At q=0 there is only tier 0, so a variant occupies one
     *  sheet exactly as before; the pixel-affecting flutter phase and
     *  cadence still key off the UN-tiered vkey (see drawTree), so q=0
     *  output is byte-identical. */
    private treeVariantKeyLod;
    /** THE STANDING LEAN: a constant hash-dealt shear bias (±0.028) so
     *  shared-variant neighbors hold different postures — silhouette
     *  diversity paid at the quad, not the bake. */
    private treeLean;
    private drawTree;
    /**
     * TRUE-FORM tree shadow: the same skeleton paintTree draws — trunk
     * spine, fork arms, every canopy cluster — projected flat onto the
     * ground along the light ray, riding the same wind cantilever so
     * the shadow sways with its tree. One Path2D, one fill: limbs and
     * clusters merge into a single density, never stacking.
     */
    /** Bounds of the last treeShadowPath build (see THE CAST FITS ITS
     *  FRAME) — a reused record, so the hot path allocates nothing. */
    private readonly shadowBox;
    private treeShadowPath;
    private drawTreeShadow;
    /** The light-throw half of a tree's cast, extracted so the stage's
     *  bounded fallback replays EXACTLY this (throws re-read at flush —
     *  same frame, same lights). */
    private drawTreeThrowShadows;
    /**
     * THE TREE COMES DOWN IN ACTS — the felling ceremony (timeline ms):
     *
     * I   THE BITE (0-260): the cut takes. The tree shudders harder and
     *     harder, the kerf spits bark chips back at the cutter, one
     *     breath of dust kicks off the roots. The outline ring HOLDS —
     *     the body rect now sweeps with the rotation, so the brand ink
     *     rides the whole fall instead of letting go at the first lean.
     * II  THE TOPPLE (260-860): the trunk hinges over the stump under a
     *     gravity ease-in while the crown DRAGS behind the wood (the
     *     windOverride bend opposes the angular velocity — secondary
     *     motion), shedding a stream of leaves along the swept arc.
     * III THE STRIKE (860): the crown slams down. The foliage stops
     *     being a canopy IN THIS FRAME — it bursts off as spinning leaf
     *     mats (Debris) under a settling leaf-rain, dust gouges out
     *     along the lie, and what's left is a bare log that BOUNCES
     *     twice, whips, and butt-kicks off the stump.
     * IV  THE BUCK (1450): the snag cracks into rounds and billets
     *     strewn exactly along the lie — real bodies that tumble, thud,
     *     skid, lie for seconds, then politely fade. The model never
     *     fades out: it BECOMES the lumber.
     */
    private readonly fallingTrees;
    /** Ground reach of a lying trunk, butt → crown, in tiles. */
    private static fellReach;
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
    /** Trees, rocks, stations — the object layer, redrawn with character. */
    /**
     * The clipped crown profile: per segment, two quadratic leaf-lobes
     * meeting at a shallow shear notch — a gardener's line, organically
     * lumpy but unmistakably CUT. Segment endpoints sit at the constant
     * base line, so adjacent tiles (whose spans always start and end on
     * half-tile boundaries) meet crown-true at every seam. Used for
     * BOTH the fill silhouette and the ink (one geometry, one truth).
     */
    /**
     * THE STANDING-HOOP LAW: a hoop on an upright cask is a HORIZONTAL
     * ring, and this tilted camera sees its FRONT ARC bowing DOWN
     * across the belly — never a straight strip (a flat band is the
     * side-elevation lie the whole barrel shelf used to tell). One
     * filled band between two down-bowed curves, a lit upper edge
     * riding the top curve, and rivets at the crest and both ends.
     * `dip` is the ring's foreshortened front drop at this hoop's
     * width (the head-ellipse ry scaled down the belly). Reads
     * this.ctx at call time — the outline pass swaps it.
     */
    paintStandingHoop(cx: number, yh: number, wk: number, dip: number, s: number): void;
    /**
     * THE STREET CASK — ONE COOPER for the whole game. The upright
     * barrel as a TURNED VOLUME under this camera: a coopered bulge on
     * true curves closed over the head's foreshortened ellipse (the
     * silhouette's top IS the far rim — the old straight-cut hexagon
     * with a pasted facet lid is dead), stave seams bowing with the
     * belly, a west sun lane and east shade, down-bowed riveted hoops
     * (paintStandingHoop), the chime ring that honestly shows as a
     * ring because the camera looks INTO the head, and a planked lid
     * sunk in its shadowed rebate — or the rain-butt's open water
     * with the drifting glint. Tile.Barrel and the BarrelStack both
     * cast from here (a stack speaks its family's dialect). Draws
     * from bottom-center (cx, by); `seed` deals plank turn, bung
     * side, and grain; opts.ink lays the outline pass's own ink under
     * the silhouette first, for castings that LAP other casks (the
     * cart-wheel law). Reads this.ctx at call time.
     */
    paintStreetCask(cx: number, by: number, wr: number, bh: number, s: number, tone: number, seed: number, opts?: {
        water?: boolean;
        ink?: boolean;
        inkBelowY?: number;
        t?: number;
    }): void;
    /**
     * THE SHELVING CONTRACT — one dispatcher, nine goods kinds, every
     * good drawn from its bottom-center (gx, gy) so anything seats on
     * any surface: 0 potions, 1 cloth, 2 crockery(bowls), 3 boxes,
     * 4 books, 5 scrolls, 6 larder, 7 jug, 8 tinker. The ShopShelf and
     * the DisplayTable both deal their stock from it; a future
     * player-stocked shelf deals these kinds from its ledger instead
     * of the hash. Reads this.ctx at CALL time, so the outline pass's
     * scratch swap is honored wherever the caller sits.
     */
    paintShelfGood(kind: number, gx: number, gy: number, sd: number, s: number): void;
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
    /**
     * THE GPU MEADOW (proposal G-2, ?grass=gpu). Gather the visible field's
     * blades (cache-reusing), render them instanced into the layer's private
     * offscreen canvas under the ortho camera + this frame's disturbers, and
     * blit it into the 2d frame at the grass slot. Returns true if it drew
     * (caller skips the baked coat; the tall standing mass still interleaves
     * via collectTall — B3), false to fall back to the baked meadow this
     * frame. The lightmap multiply runs after this slot, so the blitted field
     * is world-lit exactly like the baked meadow.
     */
    private drawGrassGpu;
    /** G1 — tall-grass interleave band pitch, in world rows. Finer = smoother
     *  body/thicket interleave (error ≤ pitch/2) at more sub-draws; 1/3 tile
     *  keeps the transition continuous with no perceptible two-band pop. */
    private static readonly TALL_BAND_PITCH;
    /** G-PERF far-field LOD window, in world rows north of the camera. A body's
     *  foot row FURTHER north than this drops out of the tall-band split set,
     *  so the far distance coalesces into few bands (a body up there is a few
     *  pixels tall — its per-row interleave is imperceptible). South of the
     *  camera and within the window, every body keeps its precise fine split. */
    private static readonly TALL_LOD_NEAR_ROWS;
    /** G-PERF coalesced-band world-y span cap. A merged band renders into an
     *  atlas slot as tall as its span + a blade height, so an unbounded merge
     *  balloons the atlas (a tall run under a lean can span the screen). This
     *  keeps every slot atlas-thin while the band COUNT still falls ~this:pitch
     *  to one in a body-free stretch — the sub-draw/blit reduction without the
     *  atlas blow-up. Tuned against dense-meadow ground cost (see plan). */
    private static readonly TALL_BAND_MAX_SPAN;
    /** G1 — emit this frame's tall-band atlas blits as y-sorted DrawItems.
     *  Each band slots into the world sort at its own row, so a body between
     *  bands is wrapped: blades rooted south (in front) occlude its lower
     *  body, blades rooted north do not. Under the stage each blit rides the
     *  scratch lane (stagePushPaintRaw) exactly like the meadow's shade, so
     *  it composites in order without splitting the batch. */
    private collectGpuTallBands;
    /** G4 — is a grass-rooted object here (skirt-eligible + meadow neighbours)?
     *  The bound sampler reads this.game (always the current world) so it stays
     *  correct across plane/world swaps, and avoids a per-call closure. */
    private grassRootedSkirt;
    private skirtGroundSampler;
    /**
     * G4 — THE OVER-FOOT SKIRT. After the world collect has gathered this
     * frame's grass-rooted objects (grassSkirtSites), synthesise a small
     * cluster of grass blades around each object's foot (generateSkirtBlades,
     * cached per tile), render them through the GPU band atlas as ONE band per
     * object — each at sortY = the object's foot row + a hair — and emit each
     * as a y-sorted DrawItem. The band slots JUST past its object, so its
     * blades draw OVER the object's lower base edge (breaking the hard pasted
     * line) while the object's mass above still occludes. Reuses the instanced
     * pipeline (no per-frame bakes); only object-adjacent tiles pay. No-op
     * when the GPU meadow is inactive, nothing is rooted, or the skirt atlas
     * is unavailable (the object simply keeps its hard base that frame).
     */
    private collectGpuSkirts;
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
     * THE TRACKED GROUND: diff a rig's lift ring and stamp a footprint
     * for every honest lift-off inside that update — the print lands at
     * the exact spot the planted foot occupied, gated by the material
     * underfoot (dirt, sand, snow… — printInkFor decides). Returns the
     * new lift count for the caller's anim record; a first sight seeds
     * silently (a body entering view didn't just step).
     */
    private stampFootprints;
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
    bedFinialPost(fx2: number, fy2: number, ph2: number): void;
    /**
     * The vertical bed's footboard — rail and finial posts as their OWN
     * layer: the bed paints it over the drape, and the sleeper's tuck
     * and the thrown-cover flip repaint it over their cloth, so the
     * posts always stand in FRONT of the blanket (user z-index law).
     */
    bedFootboardVert(x0: number, x1: number, dBot: number, yFn: number): void;
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
    bedCoversVert(x0: number, x1: number, yQ: number, dBot: number, qMain: string, qDark: string): void;
    /**
     * A side-on bed's covers: the foot-end patchwork with the deck's
     * far-third shade and the vertical fold-back sheet band at the
     * head edge. Shared by the painter and the sleeper's tuck.
     */
    bedCoversSide(qx0: number, qw2: number, dTop: number, dBot: number, sgn: number, qMain: string, qDark: string): void;
    private humanoidItem;
    /** Per-entity alert badge animation state (icon + when it changed). */
    private readonly alertAnim;
    /** THE EYE ABOVE THE HEAD: one ink per perception rung — the amber
     *  ladder climbs to red exactly as the danger does. */
    private static readonly ALERT_INK;
    /**
     * THE EYE ABOVE THE HEAD: the perception telegraph is ONE bespoke
     * eye wearing the world's own outline ink — never a text glyph, so
     * it can never rhyme with the QUEST marks (serif gold glyphs with a
     * breathing bob; this eye pops and holds still), and never a plate
     * or box — the icon alone, rimmed in STRUCT_OUTLINE like every
     * sprite in the world, is the whole read. The eye acts the state:
     * WARY is half-lidded (a stare at the edge of sense), LOOKING is
     * the open eye walking over, ENGAGED is the red slit-pupil lock
     * with a flare (an expanding echo of the eye) on the moment of
     * commitment, PURSUIT is the slashed ember eye (sight broken,
     * still coming — KEEP RUNNING), HUNTING sweeps its pupil side to
     * side (it is guessing — hide). A state that drops to calm CLOSES
     * the eye (a grey lid slides shut and the eye sinks) so
     * disengagement is shown, not popped out of existence. Drawn in
     * the label pass; the pupil is the outline ink punching through.
     *
     * THE SMALL EYE (recut, user mandate): the badge runs at HALF its
     * first-cut footprint — the old eye crowded the head and out-shouted
     * the game it was annotating. Halving halves the interior detail
     * budget, so every state is RE-PROPORTIONED rather than scaled: a
     * deeper chamber, a larger relative pupil, a wider slit, heavier-
     * floored rim and slash — nothing may dissolve to mush at 9–15 px.
     * Motion carries what pixels no longer can: each state owns a
     * unique motion signature — WARY's still squint, LOOKING's slow
     * saccade wander (the badge echoes THE GLANCE, the gaze behavior
     * the server actually runs), HUNTING's fast wide sweep, PURSUIT's
     * slashed stillness, ENGAGED's slit-and-flare. Judged on the badge
     * audit sheet (scratchpad eyebadge2.html: 3 scales × 4 grounds ×
     * all faces + old-vs-new nameplate claim + quest-mark confusion).
     */
    private alertIconItem;
    /**
     * THE FOE'S BREATH: the overhead cast pip over a winding enemy — a
     * thin ability-tinted bar filling left to right on the wind's
     * clock, guttering dark when the breath breaks. Reads from
     * game.npcCasts (fed by eid-carrying `charge` fx) and prunes what
     * has ended, so the ledger never outlives the working.
     */
    private castPipItem;
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
    /** Baked lure-icon images for the tame badge, keyed by item id. */
    private readonly lureIcons;
    /** How far the asking is shown — a step past the cast's own reach,
     *  so the treat appears while the keeper is still closing in. */
    private static readonly LURE_BADGE_RANGE;
    /**
     * THE ASKING SHOWN — a thought bubble over a tamable wild beast:
     * the very treat it wants, floating where the animal thinks. The
     * pip on the bubble's shoulder says the rest without a word of
     * chat: green check = the asking would land, red cross = the treat
     * is missing from the pack, amber bang = the beast's wild level
     * still outreaches the keeper's beastcraft. The treat itself stays
     * full color in every state — identification is its whole job.
     * Appears only while Gentle the Wild is seated (the
     * badge is courting-mode dress, never standing world clutter) and
     * only within courting range. The game client owns the truth
     * (ClientGame.tameBadge); this painter owns the picture.
     */
    private drawLureBadge;
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
    /**
     * Goblin kit — the loot-story law: every carried piece really drops
     * from the wearer's table. The chopper swings camp bronze; the
     * warboss hauls the double-axe behind the nail-studded warboard,
     * scavenged iron on its head and stolen leather on its back — the
     * best-armored goblin that ever stood, which is not saying much.
     */
    private static readonly GOBLIN_EQUIP;
    /**
     * Goblin stature: the shortest fighting bodies in the game carried
     * on the biggest heads — knee-high menace in numbers. The warboss
     * stands a full head over the rabble and still under a man.
     */
    private static readonly GOBLIN_SIZE;
    /**
     * Skral stature (docs/skral-plan.md): waist-high waders between the
     * goblin and a man, on the biggest head proportion in the game —
     * and the deepking a full head over its whole shoal.
     */
    private static readonly SKRAL_SIZE;
    /**
     * Hobgoblin stature (docs/hobgoblin-plan.md): man-height soldiers —
     * a full head and a half over the goblin rabble they command — the
     * warlord over any brigand, and the juggernaut on the giant gait.
     * Hand-sync with gameRender MOB_SIZE.
     */
    private static readonly HOB_SIZE;
    /**
     * Legion kit — the loot-story law: issued pieces that really drop
     * from the legion's tables (the hobgoblin_arms rack). The line
     * fights sword-and-board, the longbowman strings the shortbow, the
     * warcaster carries the ember staff, the warlord bears steel, and
     * the juggernaut swings the greatblade two-handed. No head slot
     * EVER: THE FORGE LAW makes item metal full-face, and the legion's
     * open helms are painted into the war mask itself.
     */
    private static readonly HOBGOBLIN_EQUIP;
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
     * Golem stature: the tallest walking bodies in the game — every
     * build stands over the troll, and the ice golem over all of them
     * (docs/golems-plan.md THE EARTH STANDS UP).
     */
    private static readonly GOLEM_SIZE;
    /**
     * THE HILL COMES DOWN: the giant-kin break the stature ceiling by
     * design — the smallest ogre stands over the tallest golem, and the
     * Bonegrinder over everything that walks. Twice a waker and more.
     */
    private static readonly OGRE_SIZE;
    /**
     * The giant's kit: the greatclub and nothing else — hurlers throw
     * what they carry loose and the bellower IS its own instrument.
     * Every listed piece really drops (the loot-story law).
     */
    private static readonly OGRE_EQUIP;
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
     * ONE kit law for the living and the dead: the per-defId issued
     * equipment, resolved through a single chain shared by npcItem and
     * spawnCorpse — the corpse can never drift out of the live rig's
     * wardrobe. Returns the static records themselves (a fresh literal
     * here would churn the body-sprite signature's identity ids).
     */
    private static equipFor;
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
     * THE PARLIAMENT FLIES: the great owl's dedicated flier item. Owls
     * cruise on the wing like the bats do — the walk rig never touches
     * them. The ROOST LEDGER lives here: a still, peaceful owl rolls a
     * chance to settle; a settled owl rests a while and lifts off again;
     * any movement, strike, or wound throws it back on the wing at
     * takeoff speed. The blend eases both ways (landing drifts down
     * slower than takeoff snaps up) and the touchdown edge kicks dust.
     */
    private owlItem;
    /**
     * Ground loot — THE DROPPED WORLD (groundItems.ts): every item's
     * honest form on the dirt. Weapons and tools lie at true held scale
     * under their own style painters, armor drops as its slot's smith's
     * bundle, materials and food are 1:1 matter, rolled rarity speaks
     * from the ground. This frame owns the drop's LIFE — landing pop,
     * bob, contact shadow, hover, ground glow, stack echoes, and the
     * loot label anchor; the matter itself is painted by drawGroundDrop.
     */
    private dropItem;
    /**
     * Loot labels — THE QUIET PLATE (groundItems.ts owns the pure law).
     * With every drop wearing its honest form, the ART is the first read
     * and a plate is the invited second read:
     * - hovering a drop with the mouse names it instantly;
     * - a rolled rare+ instance (the payoff beat) announces at range;
     * - anything else whispers only within arm's reach;
     * - holding the reveal (Alt / left trigger) names every drop on
     *   screen, the ARPG sweep-the-battlefield gesture.
     * Under crowding the plates are rationed by priority (payoff first,
     * pointer second, proximity third), labels climb out of each other,
     * and a plate that climbed far from its drop drops a hairline leader
     * back to it so ownership never muddies.
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
    /** The renderer as a matter-library host (statusFx landings). */
    private matterHost;
    /**
     * Ambient status VFX riding an entity: embers for burn, drifting
     * frost for chill, spark jitter for shock, falling drips for bleed,
     * rising blebs for venom, shaken stone chips for sunder. Every
     * state owns a distinct PLACE and RHYTHM (the anti-mush law) so two
     * riding together still read as two things. Spawn rates are
     * frame-time scaled so effect density is fps-stable.
     */
    /**
     * THE DREAD PRESENCE (docs/boss-system-plan.md): a crowned body
     * bends the air around it — a low ground-glow in the crown's own
     * color and sparse motes rising off the shoulders, both deepening
     * as the fight climbs the phase ladder. Keyed purely off
     * EntityMeta.boss (the wire the banner already reads), so plain
     * flesh pays nothing and a dead wire raises nothing.
     */
    private crownAmbience;
    /** One-shot latch so a ward's shatter plays exactly once. */
    private wardShatterPlayed;
    /**
     * ?fx STATUS WING: forced status bits OR'd onto the own body's
     * ambience for screenshot audit (fxLab drives it; 0 in real play).
     */
    statusAuditBits: number;
    /**
     * THE STANDING SHELL (statusBook Phase 4): while any ward pool
     * rides the own body, a quiet facet dome STANDS around it — the
     * ward_shell signature's geometry (equator at the chest, six glass
     * panes to the apex, the far side dimmed for the 2.5D read) held as
     * a presence instead of a cast moment: low alpha, slow breathing,
     * a rim glint walking the equator. The number lives on the chip;
     * the dome is the FACT of the shield, visibly AROUND you at every
     * camera facing. When the total crosses to nothing the shell dies
     * as glass: the panes flash once and shed real falling shards.
     */
    private drawOwnWardDome;
    private statusAmbience;
    /**
     * THE TRAIL. Prints stamped one stride apart, alternating left and
     * right of the line of travel, plus motes shed while moving. Speed
     * gated: walking leaves nothing, only a runner paints.
     */
    trail(key: string | number, x: number, y: number, dir: number, speed: number, slot: {
        element: string;
        tier: number;
        tint: ElementTint;
    }, voice: number, mayShed: boolean): void;
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
    /**
     * THE BREATH SPEAKS: kinds that are pure instrument — they carry a
     * matter dialect (or, for the telegraph, a ground sigil) and must
     * never trigger the ability's motif or signature set-pieces.
     */
    private fxPureInstrument;
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
     * THE CHAMPION'S MARK: living victory banners at cleared camps.
     * Each standing trophy is a real world prop — cloth simulated on
     * the cape lineage riding the SHARED wind front, y-sorted among
     * bodies, ringed by the live outline pass — and a freshly staked
     * one plays its whole arrival: the accelerating drop, the strike
     * (dust slam + radiance bloom + the shake), the spring settle, and
     * the cloth taking the jolt. Sims live on trophyAnims keyed by the
     * banner's cell id and are evicted when the roster drops them.
     */
    private readonly trophyAnims;
    private collectTrophies;
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
    drawChestBoss(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number, t: number, h: number): void;
    drawChestGilded(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number, t: number, h: number): void;
    drawChestIron(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
    drawChestMossy(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
    drawChestWood(ctx: CanvasRenderingContext2D, cx: number, baseY: number, s: number, o: number): void;
    drawGrowingFrame(bx: number, gy: number, h: number, planted: boolean): void;
    paintGreatCloth(cx: number, yTop: number, bw: number, bl: number, dye: number, s: number, sway: number, lag: number): Path2D;
    rubble(px: number, py: number, s: number, h: number, colors: string[]): void;
    sparkle(x: number, y: number, r: number, alpha: number, color: string): void;
}
export {};
//# sourceMappingURL=renderer.d.ts.map
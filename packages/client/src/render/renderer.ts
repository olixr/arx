import {
  CHUNK_SIZE,
  CLOTH_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  DRAW_FULL_TICKS,
  EntityKind,
  PoseState,
  SHEATHED_BIT,
  STATUS_AMBIENCE_MASK,
  STATUS_BIT,
  LIGHT_BLOCKING_TILES,
  TICK_MS,
  TILE_PX,
  Tile,
  WALL_RUN_TILES,
  DIAG_WALL_TILES,
  TREE_TILES,
  chestInfo,
  destructibleInfo,
  DOOR_TILES,
  FENCE_TILES,
  diagWallInfo,
  doorInfo,
  hashCoords,
  hashString,
  pointHitsSolid,
  tileDef,
  treeOfSapling,
  daylightAt,
  type ChestKind,
  type ChunkData,
  type DaylightSample,
  type EquipSlot,
  type ItemRoll,
  type Look,
  type Vec2,
} from '@devcraft/shared';
import { bandDy, enchantDef, instanceName, itemDef, npcDef, npcHitHeight } from '@devcraft/content';
import type { ClientGame } from '../game/clientGame.js';
import {
  ANVIL_CYCLE_MS,
  CATTLE_LOOKS,
  CHOP_CYCLE_MS,
  FORAGE_CYCLE_MS,
  FURNACE_CYCLE_MS,
  LegSolver,
  MINE_CYCLE_MS,
  beastSpec,
  drawBackGear,
  drawBat,
  drawBeast,
  drawHumanoid,
  drawSlime,
  drawSnake,
  shade,
  koboldLook,
  skeletonLook,
  type RigPose,
  type KoboldLook,
  type SkeletonLook,
} from './rig.js';
import { LegRig } from './legs.js';
import { FINISHER_PHASES, strikePhases } from './carriage.js';
import {
  BEAST_UPPER,
  HUMANOID_FEET,
  HUMANOID_UPPER,
  Ragdoll,
  buildBeastRagdoll,
  buildHumanoidRagdoll,
  drawBeastRagdoll,
  drawHumanoidRagdoll,
  type BeastCorpseLook,
  type HumanoidCorpseLook,
  type RagImpact,
} from './ragdoll.js';
import { BLOB_M, chamferRect, facetBlob, facetCircle, unitBlob } from './shapes.js';
import { Particles } from './particles.js';
import { Debris, type SmashKind } from './debris.js';
import { Birds, type BirdEnv } from './birds.js';
import { GrassSystem, windAtInto, windScalarAt, type Disturber, type WindSample } from './grass.js';
import { paintTree, treeModel, type TreeModel } from './trees.js';
import {
  DITHER_CELL,
  FADE_BODY_BELOW,
  FADE_BODY_HT,
  FADE_BODY_HW,
  FADE_EASE_S,
  FADE_INSET_TOP,
  FADE_INSET_X,
  FADE_TALL_TILES,
  FRONT_EPS,
  GHOST_ALPHA,
  GHOST_EASE_S,
  GHOST_TINT,
  FADE_ALPHA,
  bayerAlpha,
  emberEase,
  stackCover,
  wallCover,
} from './reveal.js';
import { paintPlant, plantModel, type PlantModel } from './crops.js';
import { CapeSim, capeStyle, drawCape } from './cape.js';
import { RARITY_COLORS, rarityColor } from '../ui/rarity.js';
import { LightingSystem, type WorldLight } from './lighting.js';
import { InteriorMap, packTile, type InteriorRegion } from './interiors.js';
import { UNDERGROUND_Y } from '../audio/zones.js';
import { dealWoodSkin, type WoodSkin } from './woodSkins.js';
import { drawPortalArch, drawPortalGround, spawnPortalFx, PORTAL_PLANE } from './portal.js';
import {
  bakeElevated,
  bakeGutter,
  bridgeApronAt,
  deckFillAt,
  type DeckFill,
  type DeckFillLegs,
  deckWalkIsVertical,
  DOCK_LIFT,
  drawLiveGround,
  type BridgeApron,
  startChunkBake,
  stepChunkBake,
  waterRegionPath,
  type ChunkBakeJob,
  type WaterFx,
} from './terrain.js';
import {
  boltPath,
  burstStarPath,
  fxStyleFor,
  jaggedRingPath,
  srand,
  type DecalKind,
  type FxStyle,
} from './abilityFx.js';

/**
 * Signature style: shadows are solid and sharp — never blurred. They
 * are CAST by the sky: direction, length and depth all ride the
 * daylight law (sim/daylight), sweeping with the sun and going faint
 * and blue under the moon. Two families:
 * - CAST shadows (trees, walls, rocks, stations) — the silhouette
 *   thrown along the sun, gone entirely through the twilight gap.
 * - CONTACT shadows (feet of characters, drops, cliff seams) — the
 *   grounding ellipse that never fully disappears.
 * Ground-level shadows batch onto one layer per frame so overlapping
 * dusk shadows merge instead of stacking darker.
 */
const SHADOW_SUN = '#180e20';
const SHADOW_MOON = '#0e1430';
/** Renderer-side wind scratch (samples are consumed immediately). */
const WIND_TMP: WindSample = { bx: 0, by: 0, s: 0, l: 0 };
/**
 * Tree sprites/shadow paths re-bake every Nth frame (staggered by a
 * per-frame budget). Sway drifts ~12px/s at 0.85 zoom, so a 4-frame
 * cadence at 120fps steps ~0.4px — animation-rate sampling, invisible.
 */
const TREE_REBAKE_FRAMES = 6;
/**
 * Target tree re-bakes per frame (~0.8ms). The cadence ADAPTS to the
 * visible tree count so a thick forest stretches the re-bake interval
 * (motion sampling ~20Hz in a meadow → ~10Hz in a 300-tree forest,
 * ~1px sway steps) instead of saturating a fixed budget every frame —
 * a saturated budget both costs milliseconds AND starves the trees
 * late in scan order, freezing their sway entirely.
 */
const TREE_BAKES_PER_FRAME = 28;
/** Hard per-frame backstop (teleports/zoom flips force-bake herds). */
const TREE_BAKE_BUDGET = 48;
/**
 * Per-frame time budget (ms) for sliced chunk-bake steps — ground
 * layers, detail row bands, elevation levels (see startChunkBake). A
 * full chunk bake is 10-40ms; slices keep every frame inside the
 * 8.3ms/120fps budget while a fresh area sweeps in over a few frames.
 */
const CHUNK_BAKE_MS = 3;
/**
 * Per-frame time budget (ms) for tree/flora/prop sprite bakes BEYOND
 * the truly-visible set: pad-band pre-bakes and cadence re-bakes stop
 * when it runs out. Sprites whose extent is on screen RIGHT NOW always
 * bake (a skipped visible bake would be pop-in, the worse artifact).
 */
const SPRITE_BAKE_MS = 2.5;
/**
 * Idle body-sprite re-sample cadence, in frames (see the olKey fields
 * on DrawItem): a resting body's cosmetic life — breathing, gaze,
 * tail swish, blade shimmer — re-bakes every 8th frame on a per-key
 * stagger (15Hz at 120fps), the same animation-rate sampling the tree
 * cache established. Locomotion re-bakes every other frame, combat
 * and blends every frame.
 */
const OL_IDLE_CADENCE = 8;
/**
 * Frames a body stays "dynamic" after its position/facing last
 * changed: leg-rig settles, facing eases and pose blends finish at
 * full rate before the cadence takes over (~0.2s at 120fps).
 */
const OL_COOL_FRAMES = 24;
/** Cadence bounds: never faster than 6 frames, never slower than 24. */
const TREE_CADENCE_MAX = 24;
const CONTACT_MIN = 0.15;
const CONTACT_MAX = 0.3;

/**
 * The 2.5D depth pass. The ground stays a flat top-down plane (so all
 * collision, aim, and netcode math is untouched), but everything with
 * height EXTRUDES upward on screen and leans away from the screen
 * center — a fake tilted camera. Paired with the per-item y-sort this
 * buys true walk-behind occlusion: a wall or canopy south of you draws
 * over you, one north of you slides behind.
 */
/**
 * Wall extrusion height, in tiles. SCALE ANCHOR: the character rig
 * crowns at ~1.15 tiles, so a story wall at 2.05 reads ~1.8x the
 * player — real architecture you walk INTO, not a dollhouse parapet.
 * Doorway openings, window sills, and every prop's height key off the
 * body, and the body keys off this ratio.
 */
const WALL_H = 2.05;
/**
 * The knee-high stub every revealed wall sinks to — ONE height, shared
 * by every wall kind in every zone, so adjacent runs of different
 * materials (or a doorframe mid-run) always meet at the same crown
 * line while cut. Waist on the body scale: low enough to see over,
 * tall enough to still read as the wall's footprint.
 */
const WALL_STUB = 0.62;
/**
 * Height of ONE terrain elevation level, in tiles of screen rise.
 * Deliberately shorter than a story wall: a cliff STEP is a landform
 * increment (levels stack to any height), masonry is a built story.
 * Everything derives from this one number — lifted ground bands, cliff
 * faces, stair treads, and the rise of anything standing up there.
 */
const ELEV_H = 1.35;
/**
 * Horizontal lean per tile of height. ZERO: verticals rise straight on
 * screen, exactly like the billboard sprites — the classic 3/4-view
 * contract. Leaning tops read as a warped world, not a moved camera
 * (tried, rejected). The machinery stays for a possible future
 * cutscene-camera, but gameplay is straight-vertical.
 */
const PERSP_LEAN = 0;

/**
 * TALL-CONTENT CULLING PADS. 2.5D law: an h-tile-tall thing spans
 * h / yScale SCREEN ROWS above its base row, because heights rise in
 * straight s-units while ground rows compress by yScale (0.6). Every
 * pad below is sized against the tallest/widest content of its class
 * PLUS slack — if content ever grows taller or wider, grow the pad
 * with it, or its top visibly pops in at the viewport edge.
 */
/**
 * Rows south of the shared bounds that scan for TREE/portal tiles
 * only. Tallest tree sprite extent measured live: ~7.1 tiles drawn
 * (incl. the bake's crown margin) = 11.9 rows at yScale 0.6.
 */
const TREE_PAD_S = 14;
/**
 * Columns past the shared ±(2+1) side pad that scan tree tiles only —
 * the widest canopy half-spread measured live is ~3.9 tiles.
 */
const TREE_PAD_X = 4;
/**
 * Extra full-scan rows south of the shared bounds for walls, stations
 * and props: WALL_H 2.05 + crown lip ≈ 2.2 tiles = 3.7 rows, past the
 * shared +2.
 */
const PROP_PAD_S = 3;
/**
 * The static-light scan pads ALL sides: light pools reach 4.4 tiles
 * (campfire), so an off-screen fire must still light the visible
 * floor and push its glow into frame.
 */
const LIGHT_PAD = 5;

const PLAYER_COLORS = ['#c4553d', '#3d78c4', '#3da865', '#c4a03d', '#8a55c4', '#3da8a0', '#c47a3d'];
/** Flight height of projectiles above their ground point, in tiles —
 * arrows leave the bow's nock and bolts the staff's crown, chest-high. */
const PROJ_AIR = 0.62;

/**
 * The schools of magic, as paint. A projectile defId of `magic:<element>`
 * (or `magic_heavy:<element>`) picks its palette here — bolt layers,
 * muzzle flash, wake, glow, and impact burst all draw from one tint so
 * every staff's fire reads as ITS fire. Unsuffixed magic stays arcane.
 */
interface ElementTint {
  /** Hot center of the bolt. */
  core: string;
  /** Main body color. */
  mid: string;
  /** Shadow tone as 'r, g, b' — soft halos and the trailing wake. */
  deep: string;
  /** White-hot fleck accent shed in flight. */
  fleck: string;
  /** queueGlow tint as 'r, g, b'. */
  glow: string;
}

const ELEMENT_TINTS: Record<string, ElementTint> = {
  arcane: { core: '#efe3ff', mid: '#b49af0', deep: '122, 90, 196', fleck: '#fff8c8', glow: '180, 154, 240' },
  ember: { core: '#ffe8b0', mid: '#ff8a4a', deep: '196, 74, 30', fleck: '#ffd98a', glow: '255, 138, 74' },
  frost: { core: '#f0faff', mid: '#8ac4e8', deep: '74, 130, 180', fleck: '#d8f0fc', glow: '138, 196, 232' },
  storm: { core: '#fffdf0', mid: '#ffe86a', deep: '170, 150, 60', fleck: '#ffffff', glow: '255, 232, 106' },
  verdant: { core: '#eaffd8', mid: '#7ac46a', deep: '58, 122, 58', fleck: '#d8ffb0', glow: '122, 196, 106' },
  // Void runs inverted: a dark heart in a pale shell — the one school
  // whose flecks are darker than its body.
  void: { core: '#c8b0e8', mid: '#7a5adf', deep: '46, 32, 84', fleck: '#38284e', glow: '122, 90, 223' },
  radiant: { core: '#ffffff', mid: '#ffd98a', deep: '196, 150, 70', fleck: '#fff2c8', glow: '255, 217, 138' },
  blood: { core: '#ffb0a8', mid: '#d95763', deep: '134, 38, 48', fleck: '#ff8a8a', glow: '217, 87, 99' },
  astral: { core: '#ffffff', mid: '#9ae8de', deep: '90, 140, 180', fleck: '#e8b0ff', glow: '154, 232, 222' },
};

/** Palette for a projectile style string ('magic:ember' → ember). */
function elementTint(style: string): ElementTint {
  return ELEMENT_TINTS[style.split(':')[1] ?? 'arcane'] ?? ELEMENT_TINTS['arcane']!;
}
/** How long a landed arrow stands in the world before fading. */
const STUCK_ARROW_MS = 90_000;
/** The spent shot's terminal arc: duration and forward carry (tiles). */
const FALLING_SHAFT_MS = 260;
const FALLING_SHAFT_ADVANCE = 0.55;
/** How far past the last client sample to probe for the wall the server
 * actually hit — a tick-step of the fastest arrow plus interp slack. */
const WALL_PROBE_TILES = 1.8;
/**
 * The fence family's timber — golden oak, the regionless wood-skin
 * baseline, so player fencing matches unenclosed builds everywhere.
 * One palette for straight runs, 45° turns, and gates: a pen must
 * read as ONE carpentered line. Rail fills are deliberately constant
 * per tile (no hash jitter) — N-S strips and E-W boards continue
 * across tile joins, and any per-tile tone would print the grid.
 */
const FENCE_POST = '#6e4b29';
const FENCE_RAIL = '#8a6534';
/** Solid props too short for a chest-high stick: arrows lodge low. */
const LOW_STICK_TILES = new Set<number>([
  Tile.Fence,
  Tile.FenceDiagNE,
  Tile.FenceDiagNW,
  Tile.FenceGate,
  Tile.FenceGateShut,
  Tile.RailWood,
  Tile.Table,
  Tile.Chair,
  Tile.Bench,
  Tile.Bed,
  Tile.FlowerBox,
  Tile.Basin,
  Tile.Barrel,
  Tile.Crate,
  Tile.CrateGoods,
  Tile.FishingSpot,
  Tile.ChestWood,
  Tile.ChestWoodOpen,
  Tile.ChestIron,
  Tile.ChestIronOpen,
  Tile.ChestGilded,
  Tile.ChestGildedOpen,
  Tile.ChestMossy,
  Tile.ChestMossyOpen,
  Tile.ChestBoss,
  Tile.ChestBossOpen,
]);
/**
 * Ragdoll rest: how long a settled corpse lingers before it fades. The
 * long lie is the point — mow through a camp and the bodies stay down
 * around you, evidence of the fight, then wisp away.
 */
const CORPSE_LIE_MS = 8000;
const CORPSE_FADE_MS = 1200;
/** Most corpses lying around at once; the oldest gives way first. */
const CORPSE_MAX = 24;

interface AnimState {
  walkPhase: number;
  lastX: number;
  lastY: number;
  lastPose: number;
  poseStartedAt: number;
  /** When the pose last entered the restful set (Idle/Walk) from outside it. */
  restfulSince?: number;
  lastSeen: number;
  /** The entity's leg rig — LegSolver for humanoids, species rig for beasts. */
  legs?: LegRig;
  /** Which rig `legs` was built for; a mismatch (eid reuse) rebuilds. */
  rigKey?: string;
  /** Per-leg joint-side hysteresis (2 for humanoids, N for beasts). */
  kneeMemory: number[];
  /** Dual-wield profile-flip hysteresis (main arm behind the torso). */
  armDepth?: { mainBehind: boolean };
  /** Last chop cycle that spawned impact chips (gathering). */
  lastChopHit?: number;
  /** Leg-rig plant counter at the last frame — footstep event diffing. */
  lastPlants?: number;
  /** Smoothed 0..1 travel activity — leg-less bodies (slimes, snakes)
   *  gate their locomotion animation on it. */
  moveK?: number;
  /**
   * Smoothed 0..1 seated blend. NEVER poseT — that clock resets on
   * every pose change, which would pop the stand-up; this one glides
   * both directions so sitting down and rising both ease.
   */
  sitK?: number;
  /**
   * Smoothed 0..1 sheathe blend (the sitK pattern): 1 = weapons stowed
   * on the body. Initialized AT its target on first sight so a body
   * that enters view already sheathed doesn't pantomime the stow.
   */
  sheathK?: number;
  /** The entity's cape cloth sim — present only while one is worn. */
  cape?: CapeSim;
  /** Which cape item `cape` was built for; a change rebuilds the cloth. */
  capeKey?: string;
  /** Body-sprite cache motion tracker (see bodyMotion): last observed
   *  world pos/facing, and the frame the dynamic cool window ends. */
  olX?: number;
  olY?: number;
  olDir?: number;
  olCoolUntil?: number;
}

/** Player zoom bounds: 1 = the classic framing (also the default). */
export const ZOOM_MIN = 0.85;
export const ZOOM_MAX = 2.0;

export class Camera {
  x = 0;
  y = 0;
  scale = TILE_PX * 1.25;
  /** The scale zoom multiplies — never changes. */
  readonly baseScale = TILE_PX * 1.25;
  /**
   * Player zoom: 1 = the classic framing, >1 pulls in for intimate
   * play (bigger targets, more readable for kids), slightly <1 widens.
   * `zoom` glides toward `targetZoom` each frame; everything downstream
   * reads `scale`, so the whole world breathes with it.
   */
  zoom = 1;
  targetZoom = 1;

  setZoom(z: number): void {
    this.targetZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }

  stepZoom(factor: number): void {
    this.setZoom(this.targetZoom * factor);
  }

  /** Per-frame glide toward the target; call once, before drawing. */
  tickZoom(dt: number): void {
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-9 * dt));
    if (Math.abs(this.zoom - this.targetZoom) < 0.0015) this.zoom = this.targetZoom;
    this.scale = this.baseScale * this.zoom;
  }

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
  private originX(w: number): number {
    return Math.round(w / 2 - this.x * this.scale);
  }

  private originY(h: number): number {
    return Math.round(h / 2 - this.y * this.scale * this.yScale);
  }

  worldToScreen(wx: number, wy: number, w: number, h: number): Vec2 {
    return {
      x: wx * this.scale + this.originX(w),
      y: wy * this.scale * this.yScale + this.originY(h),
    };
  }

  screenToWorld(sx: number, sy: number, w: number, h: number): Vec2 {
    return {
      x: (sx - this.originX(w)) / this.scale,
      y: (sy - this.originY(h)) / (this.scale * this.yScale),
    };
  }
}

interface BakedChunk {
  canvas: HTMLCanvasElement;
  data: ChunkData;
  rev: number;
  /** Pixels per tile this bake was rendered at (zoom-tier dependent). */
  px: number;
  /**
   * Lifted-terrain layers, one per elevation level present in the
   * chunk. Bands are contiguous row runs [startRow, endRow] (inclusive,
   * padded a row each way for the contour bleed) — each becomes one
   * y-sorted DrawItem so plateaus occlude what stands behind them.
   */
  lifted: Array<{
    level: number;
    canvas: HTMLCanvasElement;
    bands: Array<[number, number]>;
  }>;
  /**
   * In-flight sliced bake (see startChunkBake). `live` jobs blit their
   * progressively-filling canvas (brand-new chunks — a placeholder
   * beats a hole); replacement jobs build behind the old blit and swap
   * at completion. Cleared when the bake finalizes.
   */
  pending?: {
    job: ChunkBakeJob;
    /** Elevation levels still to bake after the ground steps. */
    levels: number[];
    lifted: BakedChunk['lifted'];
    live: boolean;
    data: ChunkData;
    rev: number;
    px: number;
    bakeElev: (level: number) => ReturnType<typeof bakeElevated>;
  };
}

interface DrawItem {
  sortY: number;
  draw: () => void;
  drawShadow?: () => void;
  /**
   * Screen-space bounds of the body paint. Present = this entity is a
   * living silhouette the outline pass may ring (player preference);
   * labels are excluded via drawLabel.
   */
  body?: { x: number; y: number; w: number; h: number };
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
}

export class Renderer {
  readonly camera = new Camera();
  readonly particles = new Particles();
  /** Smashed-prop chunk bodies — pooled, wall-aware, self-clearing. */
  readonly debris = new Debris();
  /** Ambient bird flocks — land, peck, and flush when a body comes close. */
  readonly birds = new Birds();
  /** Threat scratch for the bird sim — pooled points, reused every frame. */
  private readonly birdThreats: Array<{ x: number; y: number }> = [];
  /** Reused frame env for the bird sim (scratch-pool law: one object, ever). */
  private readonly birdEnv: BirdEnv = {
    tSec: 0,
    minTx: 0,
    maxTx: 0,
    minTy: 0,
    maxTy: 0,
    night: false,
    underground: false,
    groundOk: (tx, ty) => this.birdGroundOk(tx, ty),
    threats: this.birdThreats,
    threatCount: 0,
  };
  private readonly grass = new GrassSystem();
  private readonly lighting = new LightingSystem();
  /** Derived building-interior regions (cutaway, facades, windows). */
  readonly interiors = new InteriorMap();
  private localRegion: InteriorRegion | null = null;
  /** Regions discovered in view this frame (feeds the shadow shelter). */
  private visibleRegions: InteriorRegion[] = [];
  /** The frame's sky sample — every shadow and light reads this. */
  private sky: DaylightSample = daylightAt(12);
  /** Surface→deep-cave ambient blend, eased over ~1s of real time.
   *  0 = surface sky rules, 1 = the fixed underground ambient. */
  private ugBlend = 0;
  /** Local player's render position + the underground gate, sampled
   *  once per frame — the wall reveal reads these. */
  private ugCutOn = false;
  private ownPX = 0;
  private ownPY = 0;
  /** THE SHELTER GATE's temporal ease (0 = outdoors, 1 = sheltered):
   *  walls bow down over ~0.35s when you step inside and rise the same
   *  way when you leave — never a per-tile pop at a region boundary. */
  private shelterK = 0;
  /** This frame's reveal strength: shelterK smoothstepped, and ridden
   *  down to the darkness fade (ugBlend) on a portal drop. */
  private cutCtx = 0;
  // ------------------------------------------------------------------
  // THE STEP-ASIDE FADE + GHOST EMBER (reveal.ts holds the pure laws).
  // Everything below keys off the LOCAL player only — the anti-
  // wallhack law: no other body fades anything or earns an ember.
  // The fade is nothing but globalAlpha on draws that already happen;
  // the v1/v2 dither-window (masks, scratches, strata) was measured
  // and rejected — do not resurrect it.
  // ------------------------------------------------------------------
  /** Reveal armed this frame (own player exists). */
  private revealArmed = false;
  /** The own body's occlusion box in screen css px, per frame. */
  private fadeBX0 = 0;
  private fadeBY0 = 0;
  private fadeBX1 = 0;
  private fadeBY1 = 0;
  /** Per-occluder fade ease, keyed by the sprite-cache key. */
  private readonly fadeMap = new Map<number, { k: number; used: number }>();
  /** CORE occluders last frame — fading sprites whose silhouette
   *  covers the torso itself. Their combined shade (stackCover)
   *  summons the ghost ember through deep canopy. */
  private fadeCoreCount = 0;
  private fadeCoreCountNew = 0;
  /** Bayer screen-door tile (the ember's weave), rebuilt on dpr drift. */
  private ditherPat: { canvas: HTMLCanvasElement; dpr: number } | null = null;
  /** The ember's temporal ease toward this frame's wall cover. */
  private ghostK = 0;
  /** Own player's DrawItem, stashed by collectEntities for the ember. */
  private ownItem: DrawItem | null = null;
  /** Scene lights gathered this frame (tiles, projectiles, flames). */
  private readonly lights: WorldLight[] = [];
  /** This frame's light-blocker test (walls/cliffs) — shared by the
   *  lightmap and the body-relight LOS walks. */
  private blocksAt: (tx: number, ty: number) => boolean = () => false;
  /** Body-relight scratch (see relightBody) + per-frame budget. */
  private readonly relightCanvas = document.createElement('canvas');
  private readonly relightCtx = this.relightCanvas.getContext('2d')!;
  private relitLeft = 0;
  /** Dominant-light stash filled by sampleExposure(wantDom=true). */
  private domK = 0;
  private domX = 0;
  private domY = 0;
  private domRgb: [number, number, number] = [255, 255, 255];
  /** Ground shadows batch here, composited once at the sky's alpha. */
  private readonly shadowLayer = document.createElement('canvas');
  private readonly shadowLayerCtx = this.shadowLayer.getContext('2d')!;
  /** Where shadow helpers draw right now (batch layer or the frame). */
  private sdw: CanvasRenderingContext2D = this.shadowLayerCtx;
  private sdwLayerAlpha = 1;
  /** True while a silhouette mask bake replays a painter offscreen —
   *  gates side effects (glow queues, sparkles) out of the bake. */
  private bakingMask = false;
  /** Cached silhouette masks for TRUE-FORM cast shadows, keyed per
   *  formation; cleared wholesale when the cap trips (rebakes are
   *  cheap and only visible formations rebake). */
  private readonly shadowMasks = new Map<string, { cv: HTMLCanvasElement; au: number; av: number }>();
  /**
   * Point lights that CAST this frame (screen space, strongest first).
   * Bodies and organic props near one throw an extra shadow lobe away
   * from it — walk between two lamps and you drag two shadows.
   */
  private frameLights: Array<{ sx: number; sy: number; r: number; a: number }> = [];
  /**
   * Moving lights (projectiles, totems, blasts) announce themselves
   * via queueGlow DURING the draw pass — too late for this frame's
   * shadow prepass, so they cast one frame later. At 120fps the lag
   * is invisible; the fireball's shadow sweep is not.
   */
  private prevDynamic: Array<{ x: number; y: number; r: number; a: number }> = [];
  private nextDynamic: Array<{ x: number; y: number; r: number; a: number }> = [];
  private ctx: CanvasRenderingContext2D;
  /**
   * The outline "shader": entities paint FLAT (no baked strokes), and
   * this post-pass rings each living body's silhouette by dilating its
   * alpha — one uniform line around character, cape, staff, and legs
   * alike, applied dynamically so it's a player preference, not paint.
   */
  outlineOn = true;
  /**
   * Water enhancement toggles (settings menu, persisted). Both are
   * ADDITIVE layers over the base water — turning them off costs
   * nothing visually except the enhancement itself: reflections mirror
   * living bodies into the surface; waterFxFull runs the swell bands,
   * caustics and rolling shore wash (off = the classic quiet surface).
   */
  reflectionsOn = true;
  waterFxFull = true;
  /** A body entered or left shallow water this frame (splash sfx). */
  onSplash: ((x: number, y: number, entering: boolean) => void) | null = null;
  /**
   * Last frame's reflectable bodies (item + world anchor). The
   * reflection pass replays them ONE frame late, early in the frame, so
   * mirrors land under foam/glints/grass without reordering the frame —
   * at 120fps the lag is a physical impossibility to see. Waders
   * reflect too (their wrapped draw mirrors its own waterline clip).
   */
  private reflectables: Array<{ x: number; y: number; wading: boolean; item: DrawItem }> = [];
  /** Offscreen layer the mirrors render into OPAQUE (with the outline
   *  shader), then composite onto the water in ONE alpha blend — a
   *  reflection is a single cohesive image, never a stack of
   *  translucent polygons showing through each other. */
  private readonly reflLayer = document.createElement('canvas');
  private readonly reflLayerCtx = this.reflLayer.getContext('2d')!;
  /** Screen-bounds water region path cache (world coords), see waterClipFor. */
  private waterClip: { key: string; path: Path2D | null } | null = null;
  /** Per-body wading state: splash edges + wake phase. */
  private readonly wadeStates = new Map<number | 'own', { x: number; y: number; wading: boolean }>();
  private readonly outlineA = document.createElement('canvas');
  private readonly outlineB = document.createElement('canvas');
  private readonly outlineACtx = this.outlineA.getContext('2d')!;
  private readonly outlineBCtx = this.outlineB.getContext('2d')!;
  /** Cached outlined composites (ring + art) per body — see the olKey
   *  fields on DrawItem. Canvases ride the shared sprite pool. */
  private readonly bodySprites = new Map<
    number | string,
    {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      /** Device-pixel region used within the (possibly larger) canvas. */
      w: number;
      h: number;
      /** CSS size of the region and the ring margin at bake time. */
      wCss: number;
      hCss: number;
      m: number;
      scale: number;
      dpr: number;
      sig: string;
      frame: number;
      used: number;
    }
  >();
  /** Cached content signatures for appearance objects (equip/ench/
   *  look), keyed by object identity — see olObjSig. */
  private readonly olObjSigs = new WeakMap<object, string>();
  /** Identity ids for corpse records (stable objects) — cache keys. */
  private readonly olObjIds = new WeakMap<object, number>();
  private olObjSeq = 1;
  private readonly baked = new Map<string, BakedChunk>();
  /** Per-frame queue of chunks with pending sliced bakes (scan order:
   *  visible chunks first, then the pre-bake ring). Scratch, rebuilt
   *  every frame by drawGroundChunks. */
  private readonly chunkJobQueue: BakedChunk[] = [];
  private readonly anims = new Map<number | 'own', AnimState>();
  private shakeAmount = 0;
  /**
   * UI view shift, in screen px: a docked screen (the character case)
   * asks the camera to frame the player left of it, so the LIVE rig
   * is the character preview. Glides both ways — opening the case
   * reads as the world sliding over, not a cut.
   */
  private viewShiftX = 0;
  private viewShiftTargetX = 0;
  /**
   * Dialogue cinematics: while a conversation runs, the camera leaves
   * the player-centered follow and frames BOTH conversants — glides
   * to their midpoint, pulls in to a close zoom, and breathes (a slow
   * ±zoom drift) so the held shot stays alive. The pair sits in the
   * upper two-thirds: the speech sheet owns the lower third.
   */
  private cineEid: number | null = null;
  private cineSavedZoom: number | null = null;
  private cineT0 = 0;
  /**
   * True while the player zoom is gliding toward its target. Every
   * cached sprite/shadow/chunk holds its bake and scale-blits for the
   * ride: a glide crosses the 20% scale-drift threshold on the whole
   * herd at once, and re-baking mid-glide is doubly wasted — the same
   * sprites re-bake AGAIN at the settled scale (measured 17.6ms p95
   * on a 2.0→0.85 glide; pure blits hold the frame budget). Missing
   * sprites still bake — a blurry hold beats a hole.
   */
  private zoomGliding = false;
  private frameDt = 1 / 60;
  private w = 0;
  private h = 0;
  private hitstopUntil = 0;
  private vignetteUntil = 0;
  private zoomPulseAmount = 0;
  private readonly rings: Array<{ x: number; y: number; color: string; bornAt: number; maxR: number }> = [];
  /**
   * The level-up ceremony: ONE record, ~5.6s of staged show anchored
   * to the live player — light pillar, slow ground rings, a sustained
   * pooled-particle fountain, four climbing orbit sparks and a
   * wheeling crown star, all in gold + the skill's accent color.
   * Zero steady-state allocation: the record is built once at start,
   * every mote rides the pooled particle system, and rings are bornAt
   * stamps in one small array.
   */
  private levelFx: {
    t0: number;
    accent: string;
    accentLit: string;
    accentDeep: string;
    glowRgb: string;
    ringAt: number[];
    nextRingAt: number;
    emitCarry: number;
    finaleDone: boolean;
  } | null = null;

  private static readonly LEVEL_FX_MS = 5600;
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
  private readonly corpses: Array<{
    rag: Ragdoll;
    look:
      | { kind: 'humanoid'; h: HumanoidCorpseLook }
      | { kind: 'beast'; b: BeastCorpseLook };
    /** World anchor the skeleton hangs from, sliding with the blow. */
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** First trunk touchdown already made its thud sound. */
    thudded: boolean;
    settledAt: number | null;
  }> = [];
  /** Body-thud hook: the renderer sees the landing, main.ts owns sfx. */
  onCorpseThud?: (heavy: boolean, x: number, y: number) => void;

  /** A quick camera zoom kick — the killing-blow exclamation point. */
  zoomPulse(amount = 0.045): void {
    this.zoomPulseAmount = Math.min(0.08, this.zoomPulseAmount + amount);
  }

  /**
   * Ask the camera to frame the player `px` screen pixels left of
   * center (0 restores the classic centered follow). Set every frame
   * by main while a docked screen owns the right of the viewport.
   */
  setViewShift(px: number): void {
    this.viewShiftTargetX = px;
  }

  /** Begin the dialogue cinematic: frame the player and this entity. */
  startDialogueCine(eid: number): void {
    if (this.cineEid === null) this.cineSavedZoom = this.camera.targetZoom;
    this.cineEid = eid;
    this.cineT0 = performance.now();
  }

  /** End the cinematic: glide back to the player's chosen framing. */
  endDialogueCine(): void {
    if (this.cineEid === null) return;
    this.cineEid = null;
    if (this.cineSavedZoom !== null) this.camera.setZoom(this.cineSavedZoom);
    this.cineSavedZoom = null;
  }

  /** A fading, flattening silhouette where something died. */
  /** Freeze-frame: animation and particles crawl for a beat on impact. */
  hitstop(seconds: number): void {
    this.hitstopUntil = Math.max(this.hitstopUntil, performance.now() + seconds * 1000);
  }

  /** Red edge flash when the local player takes damage. */
  flashHurt(): void {
    this.vignetteUntil = performance.now() + 320;
  }

  /** Expanding impact ring at a world position. */
  addRing(x: number, y: number, color: string, maxR = 0.5): void {
    this.rings.push({ x, y, color, bornAt: performance.now(), maxR });
    if (this.rings.length > 24) this.rings.shift();
  }

  /**
   * Kick off the level-up ceremony at the player's feet. The opening
   * crack fires here (flash ring + streak column + shard fan + zoom
   * kick); everything after is staged per frame in drawLevelCeremony,
   * following the live player.
   */
  startLevelCeremony(x: number, y: number, accent: string): void {
    const rr = Number.parseInt(accent.slice(1, 3), 16);
    const gg = Number.parseInt(accent.slice(3, 5), 16);
    const bb = Number.parseInt(accent.slice(5, 7), 16);
    this.levelFx = {
      t0: performance.now(),
      accent,
      accentLit: shade(accent, 32),
      accentDeep: shade(accent, -26),
      glowRgb: `${rr}, ${gg}, ${bb}`,
      ringAt: [],
      nextRingAt: 320,
      emitCarry: 0,
      finaleDone: false,
    };
    this.addRing(x, y, '#ffe9a8', 1.15);
    this.particles.burst(x, y - 0.4, 30, ['#fff3d0', '#ffe9a8', '#f2c94c'], {
      speed: 5.4,
      life: 0.75,
      up: true,
      gravity: 3,
      shape: 'streak',
      size: 0.09,
    });
    this.particles.burst(x, y - 0.3, 18, [this.levelFx.accentLit, accent], {
      speed: 3.6,
      life: 0.95,
      up: true,
      gravity: 4.5,
      shape: 'shard',
      spin: 8,
      size: 0.11,
    });
    this.zoomPulse(0.05);
  }

  /**
   * Scheduled aftershock beats — the SECOND read of a detonation. A
   * blast is not one frame: the flash lands, then the dust wave rolls
   * out, then embers settle. Records, not closures — no capture churn.
   */
  private readonly fxBeats: Array<{
    at: number;
    x: number;
    y: number;
    r: number;
    kind: 'dust' | 'settle' | 'echo';
    mid: string;
    deep: string;
    spark: string;
  }> = [];

  private queueBeat(
    at: number,
    x: number,
    y: number,
    r: number,
    kind: 'dust' | 'settle' | 'echo',
    st: FxStyle,
  ): void {
    this.fxBeats.push({ at, x, y, r, kind, mid: st.mid, deep: st.deep, spark: st.spark });
    if (this.fxBeats.length > 32) this.fxBeats.shift();
  }

  /** Fire every due aftershock beat. Called once per frame. */
  private runFxBeats(now: number): void {
    for (let i = this.fxBeats.length - 1; i >= 0; i--) {
      const b = this.fxBeats[i]!;
      if (b.at > now) continue;
      this.fxBeats.splice(i, 1);
      if (b.kind === 'dust') {
        // The aftershock: a low rolling dust wave along the rim —
        // ground-sorted billows that drift out and die slow. The haze
        // carries the family's tone (frost breathes pale, fire sooty).
        const n = Math.min(14, 6 + Math.round(b.r * 5));
        const haze = shade(b.deep, -12);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
          const rx = b.x + Math.cos(a) * b.r * 0.75;
          const ry = b.y + Math.sin(a) * b.r * 0.75 * Renderer.FX_SQUASH;
          this.particles.burst(rx, ry, 1, [b.deep, haze, b.mid], {
            speed: 0.9,
            life: 1.1,
            size: 0.13,
            gravity: -0.5,
            dir: a,
            spread: 0.6,
            drag: 1.8,
            grow: 0.32,
            ground: true,
          });
        }
        this.addRing(b.x, b.y, b.deep, b.r * 1.15);
      } else if (b.kind === 'settle') {
        // Late sparks/motes drifting down where the hit landed — the
        // air still remembers.
        this.particles.burst(b.x, b.y - 0.6, 6, [b.spark, b.mid], {
          speed: 0.5,
          life: 1.3,
          size: 0.06,
          gravity: 0.7,
          drag: 1.2,
          flicker: 0.7,
        });
      } else {
        this.addRing(b.x, b.y, b.mid, b.r);
      }
    }
  }

  /** Lingering ground marks left by detonations (scorch, rime, cracks…). */
  private readonly fxDecals: Array<{
    x: number;
    y: number;
    r: number;
    kind: DecalKind;
    mid: string;
    deep: string;
    bornAt: number;
    life: number;
    seed: number;
  }> = [];

  /**
   * The world remembers the hit: leave the style's mark on the ground.
   * Marks live ~5s in three acts — ACTIVE (the aftermath still burns,
   * grows, glows), SETTLED (a quiet residue), FADE (the turf reclaims
   * it) — so a fight leaves a readable history behind it.
   */
  private addDecal(x: number, y: number, r: number, st: FxStyle): void {
    if (!st.decal) return;
    this.fxDecals.push({
      x,
      y,
      r,
      kind: st.decal,
      mid: st.mid,
      deep: st.deep,
      bornAt: performance.now(),
      life: 5200,
      seed: (performance.now() * 31) & 0x7fffffff,
    });
    if (this.fxDecals.length > 26) this.fxDecals.shift();
  }

  /** Placement preview set by the build mode; null when inactive. */
  buildGhost: { tx: number; ty: number; valid: boolean; color: string } | null = null;

  /**
   * Loot HUD inputs, fed by main.ts each frame: the pointer (for
   * hovering bags), and the reveal hold (Alt / left trigger) that pops
   * a label over every drop on screen.
   */
  lootHud = { mx: 0, my: 0, mouse: false, showAll: false };

  /** Visible drops this frame — the loot-label pass reads these. */
  private frameLoot: Array<{
    eid: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    itemId: string;
    qty: number;
    hovered: boolean;
    /** Instance roll — tints the nameplate by the INSTANCE's rarity. */
    roll?: ItemRoll;
  }> = [];

  /**
   * Screen rects the loot labels landed on last pass — the click
   * affordance. A label IS its drop's hitbox (bags overlap in a pile;
   * their labels never do), with the bag sprite as a fallback target.
   */
  private lootPlates: Array<{ eid: number; x0: number; x1: number; y0: number; y1: number }> = [];

  /** Emissive glow requests queued during the frame, composited last. */
  private readonly glows: Array<{ x: number; y: number; r: number; rgb: string; a: number }> = [];

  // ---- projectile aftermath: the world remembers your arrows. ----
  /** Arrows standing in the ground/walls; fade out near `until`. */
  private readonly stuckArrows: Array<{
    x: number;
    y: number;
    dir: number;
    until: number;
    /** Vertical-surface stick: shaft embedded `h` tiles up a wall/trunk
     *  face, y-sorted against that face (in front of a south face, hidden
     *  behind a north one). Absent = a ground stick. */
    wall?: { h: number; sortY: number };
  }> = [];
  /** Spent shots arcing down at the end of flight — a quarter-second of
   *  cosmetic ballistics between "flying" and "standing in the dirt". */
  private readonly fallingShafts: Array<{ x: number; y: number; dir: number; born: number }> = [];
  /** Arrows riding a living NPC (offsets in tiles off its ground point). */
  private readonly npcArrows = new Map<number, Array<{ dir: number; hy: number; ox: number }>>();
  /** Projectiles already given their muzzle flash. */
  private readonly projSeen = new Set<number>();

  /**
   * Perspective lean, applied PER VERTEX: a point `heightTiles` above
   * the ground at screen column `x` lands at `leanX(x, h)` — an affine
   * horizontal scale of that height-layer about the screen center.
   * Because it's affine, two structures sharing an edge share exactly
   * the same leaned edge: runs of walls, trunks meeting canopies, and
   * abutting crowns can never crack, at any lean strength.
   */
  private leanX(x: number, heightTiles: number): number {
    return x + (x - this.w / 2) * PERSP_LEAN * heightTiles;
  }

  /**
   * Enter the leaned frame for a whole layer at a given height: after
   * this transform, drawing FOOTPRINT coordinates paints them lifted by
   * `heightTiles` and leaned coherently. Pair with ctx.restore().
   */
  private beginHeightLayer(heightTiles: number): void {
    const k = 1 + PERSP_LEAN * heightTiles;
    this.ctx.save();
    this.ctx.translate(this.w / 2, -heightTiles * this.camera.scale);
    this.ctx.scale(k, 1);
    this.ctx.translate(-this.w / 2, 0);
  }

  /** The world's outline color — the dark edge entities and props wear. */
  private static readonly STRUCT_OUTLINE = '#241a2e';

  /**
   * Arm the context to stroke an architecture silhouette: the same
   * bold dark edge the entity ring gives props and characters, drawn
   * as a hard stroke so buildings, doorways, arches, and pillars read
   * with the flat-art edge the rest of the world wears. Only EXPOSED
   * edges are ever stroked (an edge shared with a run-neighbour gets
   * none), so runs stay seamless — only the building perimeter and
   * its openings are ringed.
   */
  private beginStructOutline(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = Renderer.STRUCT_OUTLINE;
    ctx.lineWidth = Math.max(1.5, this.camera.scale * 0.055);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  /**
   * Trace a wall-like mass's crown top edge + its exposed vertical
   * sides into `path` (screen space). `cTop` is the crown's north
   * edge; the left/right sides descend to `leftBot`/`rightBot`.
   * Chamfered north corners (radii rTL/rTR) are followed so the ring
   * hugs the cut. Shared by wall, doorway, and arch painters — each
   * adds its own base/opening edges afterwards.
   */
  private addCrownPerimeter(
    path: Path2D,
    x0: number,
    x1: number,
    cTop: number,
    leftBot: number,
    rightBot: number,
    rTL: number,
    rTR: number,
    n: boolean,
    e: boolean,
    w: boolean,
  ): void {
    if (!n) {
      path.moveTo(x0 + rTL, cTop);
      path.lineTo(x1 - rTR, cTop);
    }
    if (!w) {
      if (!n && rTL > 0) {
        path.moveTo(x0 + rTL, cTop);
        path.lineTo(x0, cTop + rTL);
      } else {
        path.moveTo(x0, cTop);
      }
      path.lineTo(x0, leftBot);
    }
    if (!e) {
      if (!n && rTR > 0) {
        path.moveTo(x1 - rTR, cTop);
        path.lineTo(x1, cTop + rTR);
      } else {
        path.moveTo(x1, cTop);
      }
      path.lineTo(x1, rightBot);
    }
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** The game being rendered this frame (for world lookups in painters). */
  private game: ClientGame | null = null;

  /**
   * Fires once per tool-impact while someone gathers ('tree' | 'rock'
   * | 'forage' | 'anvil' | 'furnace') — with WHERE the beat landed and
   * whose hands it is, so the sound can sit in the world (the far-off
   * smith rings faint) and haptics stay on the own body only.
   */
  onGatherImpact: ((kind: string, x: number, y: number, isOwn: boolean) => void) | null = null;

  /**
   * A body's pose flipped this frame (renderer-side transition diff —
   * the same edge that restarts the swing animation). main.ts voices
   * OTHER bodies' swings/casts from it, spatialized; the own body's
   * combat audio rides its own prediction path and skips this.
   */
  onPoseChange: ((key: number | 'own', pose: number, x: number, y: number) => void) | null = null;

  /**
   * Fires on every humanoid foot touchdown (the leg rig's plant
   * moment). `speed` is the gait vigor in tiles/sec — idle shuffles
   * arrive near zero, so volume can ride it directly.
   */
  onFootstep: ((x: number, y: number, speed: number, isOwn: boolean, sneaking: boolean) => void) | null =
    null;

  /** Nearest crafting station around a world position, if any. */
  private findStation(
    x: number,
    y: number,
  ): { tx: number; ty: number; kind: 'anvil' | 'furnace' | 'fire' | 'workbench' } | null {
    const game = this.game;
    if (!game) return null;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let best: { tx: number; ty: number; kind: 'anvil' | 'furnace' | 'fire' | 'workbench'; d: number } | null =
      null;
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const t = game.world.groundAt(tx, ty);
        // Bench-like stations (workbench, alembic, tanning rack, loom,
        // carving bench) all share the busy-hands workbench choreography;
        // anvil/furnace/fire keep their bespoke cycles.
        const kind =
          t === Tile.Anvil
            ? ('anvil' as const)
            : t === Tile.Furnace
              ? ('furnace' as const)
              : t === Tile.Campfire
                ? ('fire' as const)
                : t === Tile.Workbench ||
                    t === Tile.Alembic ||
                    t === Tile.TanningRack ||
                    t === Tile.Loom ||
                    t === Tile.CarvingBench ||
                    t === Tile.EnchantingTable
                  ? ('workbench' as const)
                  : null;
        if (!kind) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (!best || d < best.d) best = { tx, ty, kind, d };
      }
    }
    return best;
  }

  /**
   * The stall wardrobe: every market stand draws one bolt of cloth
   * from this roster, keyed by the run's west-anchor tile hash — so a
   * merged stall wears one banner, neighbouring stands differ, and
   * every town's market reads bespoke with zero authoring plumbing.
   */
  private static readonly STALL_BANNERS: ReadonlyArray<{
    kind: 'stripes' | 'solid' | 'chevron';
    a: string;
    b: string;
  }> = [
    { kind: 'stripes', a: '#b5493e', b: '#e8dfc8' }, // market classic
    { kind: 'stripes', a: '#3f6f8f', b: '#e8dfc8' }, // harbor blue
    { kind: 'solid', a: '#5d7f3a', b: '#e8dfc8' }, // herbalist green
    { kind: 'solid', a: '#7a4a8f', b: '#d9a441' }, // arcanist plum
    { kind: 'chevron', a: '#c9962e', b: '#6b4a26' }, // gilded trim
    { kind: 'solid', a: '#8a3d3d', b: '#e8dfc8' }, // vintner wine
  ];

  /**
   * One ware on a stall's display top. Kinds: produce, bread, bottles,
   * cloth bolts, pottery, berry basket — small enough to sit under the
   * awning window, distinct enough to read at market distance.
   */
  private drawStallGood(kind: number, gx: number, gy: number, s: number, seed: number): void {
    const ctx = this.ctx;
    switch (kind) {
      case 0: {
        // Produce: three faceted rounds in a loose arc.
        const cols = ['#d97b29', '#b5493e', '#7fae4a'] as const;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = cols[(seed + i) % 3]!;
          ctx.beginPath();
          facetCircle(ctx, gx + (i - 1) * s * 0.09, gy - (i % 2) * s * 0.035, s * 0.055, 6, i * 1.1, 0.8);
          ctx.fill();
        }
        break;
      }
      case 1: {
        // Bread: a long loaf with a round propped against it.
        ctx.fillStyle = '#c99a55';
        ctx.beginPath();
        chamferRect(ctx, gx - s * 0.11, gy - s * 0.065, s * 0.22, s * 0.07, s * 0.03);
        ctx.fill();
        ctx.fillStyle = '#b3823f';
        ctx.beginPath();
        chamferRect(ctx, gx - s * 0.05, gy - s * 0.125, s * 0.15, s * 0.06, s * 0.025);
        ctx.fill();
        ctx.fillStyle = 'rgba(122, 85, 46, 0.6)';
        ctx.fillRect(gx - s * 0.07, gy - s * 0.04, s * 0.14, s * 0.014);
        break;
      }
      case 2: {
        // Bottled brews: a pair, different fills.
        for (const [dx, col] of [
          [-0.05, '#7fc9b3'],
          [0.05, '#d65a5a'],
        ] as const) {
          ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
          ctx.fillRect(gx + dx * s - s * 0.035, gy - s * 0.16, s * 0.07, s * 0.16);
          ctx.fillRect(gx + dx * s - s * 0.014, gy - s * 0.21, s * 0.028, s * 0.05);
          ctx.fillStyle = col;
          ctx.fillRect(gx + dx * s - s * 0.028, gy - s * 0.1, s * 0.056, s * 0.09);
        }
        break;
      }
      case 3: {
        // Cloth bolts: two dyed rolls, one across the other.
        for (const [dx, dyc, col] of [
          [-0.02, 0, '#7a4a8f'],
          [0.045, -0.05, '#3f6f8f'],
        ] as const) {
          ctx.fillStyle = col;
          ctx.beginPath();
          chamferRect(ctx, gx + dx * s - s * 0.12, gy + dyc * s - s * 0.05, s * 0.24, s * 0.07, s * 0.03);
          ctx.fill();
          ctx.fillStyle = shade(col, 14);
          ctx.fillRect(gx + dx * s - s * 0.12, gy + dyc * s - s * 0.05, s * 0.24, s * 0.02);
        }
        break;
      }
      case 4: {
        // Pottery: a stack of thrown bowls.
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === 2 ? '#c07347' : '#b3623a';
          ctx.beginPath();
          facetCircle(ctx, gx, gy - i * s * 0.045, s * (0.085 - i * 0.012), 6, 0.3 + i, 0.45);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(70, 36, 20, 0.5)';
        ctx.fillRect(gx - s * 0.06, gy - s * 0.1, s * 0.12, s * 0.014);
        break;
      }
      default: {
        // A woven basket heaped with berries.
        ctx.fillStyle = '#8a6534';
        ctx.beginPath();
        ctx.moveTo(gx - s * 0.1, gy - s * 0.09);
        ctx.lineTo(gx + s * 0.1, gy - s * 0.09);
        ctx.lineTo(gx + s * 0.07, gy);
        ctx.lineTo(gx - s * 0.07, gy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(58, 38, 18, 0.5)';
        ctx.fillRect(gx - s * 0.09, gy - s * 0.055, s * 0.18, s * 0.013);
        ctx.fillStyle = '#d65a5a';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          facetCircle(ctx, gx + (i - 1) * s * 0.045, gy - s * 0.11, s * 0.026, 5, i, 0.85);
          ctx.fill();
        }
        break;
      }
    }
  }

  /** Tiles that count as workable stations for interaction heat. */
  private static readonly HEAT_STATION_TILES = new Set<Tile>([
    Tile.Anvil,
    Tile.Furnace,
    Tile.Campfire,
    Tile.Workbench,
    Tile.Alembic,
    Tile.TanningRack,
    Tile.Loom,
    Tile.CarvingBench,
    Tile.EnchantingTable,
    Tile.BankChest,
    Tile.ShopCounter,
  ]);

  /**
   * Interaction heat per station tile, 0..1 with an eased attack and a
   * gentler release. Heated by anyone working the station (Craft pose,
   * own player included) and by the local player's open bank/shop/craft
   * panel. Painters layer the in-use choreography over the idle art by
   * reading this — lids glide open, fires flare, beams work harder.
   */
  private readonly stationHeat = new Map<number, number>();

  /** The open station panel's anchor tile (set per frame by main.ts). */
  stationFocus: { tx: number; ty: number } | null = null;

  private tickStationHeat(game: ClientGame, dt: number): void {
    const hot = new Set<number>();
    const mark = (x: number, y: number): void => {
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      let best: { tx: number; ty: number; d: number } | null = null;
      for (let ty2 = cy - 2; ty2 <= cy + 2; ty2++) {
        for (let tx2 = cx - 2; tx2 <= cx + 2; tx2++) {
          const t2 = game.world.groundAt(tx2, ty2);
          if (t2 === undefined || !Renderer.HEAT_STATION_TILES.has(t2)) continue;
          const d = Math.hypot(tx2 + 0.5 - x, ty2 + 0.5 - y);
          if (!best || d < best.d) best = { tx: tx2, ty: ty2, d };
        }
      }
      if (best) hot.add(packTile(best.tx, best.ty));
    };
    for (const [, remote] of game.entities) {
      if (remote.meta.kind !== EntityKind.Player) continue;
      const latest = remote.buffer.latest();
      if (latest?.pose === PoseState.Craft) mark(latest.x, latest.y);
    }
    if (game.ownEid !== null && game.ownPose === PoseState.Craft) {
      const own = game.predictor.pos;
      mark(own.x, own.y);
    }
    if (this.stationFocus) hot.add(packTile(this.stationFocus.tx, this.stationFocus.ty));
    const up = 1 - Math.exp(-9 * dt);
    const down = 1 - Math.exp(-4 * dt);
    for (const key of hot) {
      const v = this.stationHeat.get(key) ?? 0;
      this.stationHeat.set(key, v + (1 - v) * up);
    }
    for (const [key, v] of this.stationHeat) {
      if (hot.has(key)) continue;
      const nv = v * (1 - down);
      if (nv < 0.01) this.stationHeat.delete(key);
      else this.stationHeat.set(key, nv);
    }
  }

  /** Classify a tile as a gatherable node kind, if it is one. */
  private gatherKindAt(tx: number, ty: number): 'tree' | 'rock' | 'fish' | 'forage' | null {
    const game = this.game;
    if (!game) return null;
    const t = game.world.groundAt(tx, ty);
    return t === Tile.Tree || t === Tile.TreeOak || t === Tile.TreeWillow || t === Tile.TreeYew
      ? 'tree'
      : t === Tile.Rock ||
          t === Tile.RockCopper ||
          t === Tile.RockTin ||
          t === Tile.RockIron ||
          t === Tile.RockCoal ||
          t === Tile.RockGold ||
          t === Tile.RockSilver ||
          t === Tile.RockMithril ||
          t === Tile.RockAdamant ||
          t === Tile.RockObsidian ||
          t === Tile.RockStarfall
        ? 'rock'
        : t === Tile.FishingSpot
          ? 'fish'
          : t === Tile.BerryBush ||
              t === Tile.FibrePlant ||
              t === Tile.WildSagewort ||
              t === Tile.WildMoonbell
            ? 'forage'
            : null;
  }

  /**
   * The gatherable node a working body should square up to. The
   * server never names the action's tile, so remote players get the
   * nearest-node guess — but the OWN player passes the tile of the
   * interact that started the work (prefer), so standing between two
   * nodes never swings the tool at the wrong one.
   */
  private findGatherNode(
    x: number,
    y: number,
    prefer?: { tx: number; ty: number } | null,
  ): { tx: number; ty: number; kind: 'tree' | 'rock' | 'fish' | 'forage' } | null {
    const game = this.game;
    if (!game) return null;
    if (prefer && Math.hypot(prefer.tx + 0.5 - x, prefer.ty + 0.5 - y) < 3) {
      const kind = this.gatherKindAt(prefer.tx, prefer.ty);
      if (kind) return { tx: prefer.tx, ty: prefer.ty, kind };
    }
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let best: { tx: number; ty: number; kind: 'tree' | 'rock' | 'fish' | 'forage'; d: number } | null = null;
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const kind = this.gatherKindAt(tx, ty);
        if (!kind) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (!best || d < best.d) best = { tx, ty, kind, d };
      }
    }
    return best;
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(12, this.shakeAmount + amount);
  }

  // ------------------------------------------------------- elevation

  /**
   * Screen-space rise (in TILES; multiply by scale for px) of the
   * ground under a world position. Plateau tops rise level·ELEV_H; a
   * stair tile interpolates from its low mouth to its high edge, so
   * feet climb tread by tread. Everything drawn in the world asks this
   * one function.
   */
  renderLift(x: number, y: number): number {
    const game = this.game;
    if (!game) return 0;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const lvl = game.world.elevAt(tx, ty);
    const t = game.world.groundAt(tx, ty);
    // Raised decks (docks AND bridges): the deck rides DOCK_LIFT
    // above the ground, and so does everything standing on it — feet
    // meet boards by construction. A bridge APRON ramps from grade at
    // its land edge to the full lift (the bake shears the boards on
    // the identical slope), exactly like the Ramp tile's flight.
    if ((t === Tile.Bridge || t === Tile.Dock) && this.isDockAt(game, tx, ty)) {
      if (t === Tile.Bridge) {
        const ap = this.bridgeApron(game, tx, ty);
        if (ap !== 'none') {
          const u =
            ap === 'W' ? x - tx : ap === 'E' ? 1 - (x - tx) : ap === 'N' ? y - ty : 1 - (y - ty);
          return lvl * ELEV_H + DOCK_LIFT * Math.min(1, Math.max(0, u));
        }
      }
      return lvl * ELEV_H + DOCK_LIFT;
    }
    if (t === Tile.Ramp) {
      // Ascend toward the cardinal neighbor a level down — the mouth.
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        if (game.world.elevAt(tx + dx, ty + dy) < lvl) {
          // Fraction across the tile away from the low edge.
          const u =
            dx !== 0
              ? dx > 0
                ? 1 - (x - tx)
                : x - tx
              : dy > 0
                ? 1 - (y - ty)
                : y - ty;
          return (lvl - 1 + Math.min(1, Math.max(0, u))) * ELEV_H;
        }
      }
    }
    return lvl * ELEV_H;
  }

  /** Memoized deck test (water within Chebyshev 2 — callers gate on
   *  the Dock/Bridge tile themselves), keyed by
   *  tile and cleared on any world change — renderLift is hot and the
   *  25-tile scan must run once per tile, not once per query. */
  private readonly dockMemo = new Map<number, boolean>();
  private dockMemoVersion = -1;

  private isDockAt(game: ClientGame, tx: number, ty: number): boolean {
    if (game.worldVersion !== this.dockMemoVersion) {
      this.dockMemo.clear();
      this.dockMemoVersion = game.worldVersion;
    }
    const key = packTile(tx, ty);
    let v = this.dockMemo.get(key);
    if (v === undefined) {
      v = false;
      outer: for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const t = game.world.groundAt(tx + dx, ty + dy);
          if (
            t === Tile.Water ||
            t === Tile.WaterDeep ||
            t === Tile.WaterShallow ||
            t === Tile.FishingSpot
          ) {
            v = true;
            break outer;
          }
        }
      }
      this.dockMemo.set(key, v);
    }
    return v;
  }

  /**
   * A tile a bird may stand on: open NATURAL ground only. Floors,
   * stone, and cave rock all refuse — which quietly keeps flocks out
   * of interiors and dungeons without ever asking about walls.
   */
  private birdGroundOk(tx: number, ty: number): boolean {
    const g = this.game?.world.groundAt(tx, ty);
    return (
      g === Tile.Grass ||
      g === Tile.GrassTall ||
      g === Tile.Dirt ||
      g === Tile.Path ||
      g === Tile.Sand ||
      g === Tile.Snow
    );
  }

  /** Write a threat point into the pooled scratch; returns the new count. */
  private pushBirdThreat(n: number, x: number, y: number): number {
    let t = this.birdThreats[n];
    if (!t) {
      t = { x: 0, y: 0 };
      this.birdThreats.push(t);
    }
    t.x = x;
    t.y = y;
    return n + 1;
  }

  /** worldToScreen that also rides the terrain lift under the point. */
  private liftedWTS = (wx: number, wy: number): Vec2 => {
    const p = this.camera.worldToScreen(wx, wy, this.w, this.h);
    p.y -= this.renderLift(wx, wy) * this.camera.scale;
    return p;
  };

  /**
   * World-y whose liftedWTS projection sits PROJ_AIR tiles of SCREEN
   * height above the ground point at `y`. World-y offsets render
   * squashed by the camera pitch (yScale), so anything that must align
   * with a screen-lifted sprite (projectile trails, muzzle/impact
   * bursts, glows) divides the squash back out — a raw `y - PROJ_AIR`
   * rides ~40% low and the trail visibly detaches from the shot.
   */
  private projAirWorldY(y: number): number {
    return y - PROJ_AIR / this.camera.yScale;
  }

  // ------------------------------------------------------- shadows

  /** Screen-px offset of a shadow cast from `hTiles` above the ground. */
  private castOffset(hTiles: number): Vec2 {
    const len = this.sky.shadowLen * hTiles * this.camera.scale;
    return {
      x: this.sky.shadowX * len,
      y: this.sky.shadowY * len * this.camera.yScale,
    };
  }

  /**
   * Gather the frame's shadow-casting lights: strong scene lights plus
   * last frame's dynamic ones, gated by darkness (point-light shadows
   * only read once the sun stops washing them out), strongest first,
   * capped so a lamp-ringed plaza stays cheap.
   */
  private buildFrameLights(): void {
    this.frameLights.length = 0;
    const gate = Math.min(1, this.sky.darkness * 2.6);
    if (gate < 0.05) return;
    const cand: Array<{ sx: number; sy: number; r: number; a: number }> = [];
    for (const L of this.lights) {
      const a = Math.min(0.42, L.intensity * gate * 0.55);
      if (a < 0.05) continue;
      const p = this.liftedWTS(L.x, L.y);
      cand.push({ sx: p.x, sy: p.y, r: L.r, a });
    }
    for (const D of this.prevDynamic) {
      const a = Math.min(0.38, D.a * gate * 0.6);
      if (a < 0.05) continue;
      const p = this.liftedWTS(D.x, D.y);
      cand.push({ sx: p.x, sy: p.y, r: D.r, a });
    }
    cand.sort((u, v) => v.a - u.a);
    for (let i = 0; i < Math.min(6, cand.length); i++) this.frameLights.push(cand[i]!);
  }

  /**
   * The shadow throws a point at screen (px, py) receives from nearby
   * lights: world-space unit direction AWAY from each light, a length
   * that stretches as the object sits deeper in the pool's falloff,
   * and an alpha that dies at the pool's rim. `minD` excludes a
   * fixture shadowing itself (props) while letting a body stand right
   * up against a fire (entities).
   */
  private lightThrows(
    px: number,
    py: number,
    minD: number,
  ): Array<{ ux: number; uy: number; len: number; alpha: number }> {
    const out: Array<{ ux: number; uy: number; len: number; alpha: number }> = [];
    if (this.frameLights.length === 0) return out;
    const s = this.camera.scale;
    const ys = this.camera.yScale;
    for (const L of this.frameLights) {
      const wx = (px - L.sx) / s;
      const wy = (py - L.sy) / (s * ys);
      const d = Math.hypot(wx, wy);
      if (d < minD || d >= L.r) continue;
      const t = d / L.r;
      const alpha = L.a * (1 - t) ** 1.5;
      if (alpha < 0.03) continue;
      out.push({ ux: wx / d, uy: wy / d, len: 1.9 - t, alpha });
      if (out.length === 2) break; // two strongest reads; more is mud
    }
    return out;
  }

  /** Arm the shadow target for a cast fill; null while nothing casts. */
  private beginCastFill(): CanvasRenderingContext2D | null {
    if (this.sky.shadowAlpha < 0.02) return null;
    const c = this.sdw;
    c.globalAlpha = Math.min(1, this.sky.shadowAlpha / this.sdwLayerAlpha);
    c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
    return c;
  }

  /** Arm for a grounding contact fill — never fully disappears. */
  private beginContactFill(): CanvasRenderingContext2D {
    const c = this.sdw;
    const a = Math.min(CONTACT_MAX, Math.max(CONTACT_MIN, this.sky.shadowAlpha));
    c.globalAlpha = Math.min(1, a / this.sdwLayerAlpha);
    c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
    return c;
  }

  /** One silhouette throw: flattened blob + footprint smear, one path. */
  private blobShadowPath(
    c: CanvasRenderingContext2D,
    bx: number,
    by: number,
    ox: number,
    oy: number,
    r: number,
    seed: number,
    smearW: number,
  ): void {
    c.beginPath();
    if (smearW > 0) {
      c.moveTo(bx - smearW, by);
      c.lineTo(bx + smearW, by);
      c.lineTo(bx + ox + smearW * 0.7, by + oy);
      c.lineTo(bx + ox - smearW * 0.7, by + oy);
      c.closePath();
    }
    c.save();
    c.translate(bx + ox, by + oy);
    c.scale(1, 0.62);
    facetBlob(c, 0, 0, r, seed, 7, 0.35);
    c.restore();
  }

  /**
   * A mass `hTiles` up throws its silhouette: once along the sun (or
   * moon), and once away from each nearby pool of light — a tree by a
   * lamp wears both. Each throw is one path, one fill, so a blob and
   * its smear can never double-darken each other.
   */
  private castBlob(bx: number, by: number, hTiles: number, r: number, seed: number, smearW = 0): void {
    const sunC = this.beginCastFill();
    if (sunC) {
      const off = this.castOffset(hTiles);
      this.blobShadowPath(sunC, bx, by, off.x, off.y, r, seed, smearW);
      sunC.fill();
      sunC.globalAlpha = 1;
    }
    const throws = this.lightThrows(bx, by, 0.6);
    if (throws.length > 0) {
      const c = this.sdw;
      const s = this.camera.scale;
      const ys = this.camera.yScale;
      c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
      for (const th of throws) {
        c.globalAlpha = Math.min(1, th.alpha / this.sdwLayerAlpha);
        const ox = th.ux * th.len * hTiles * s;
        const oy = th.uy * th.len * hTiles * s * ys;
        this.blobShadowPath(c, bx, by, ox, oy, r * 0.92, seed, smearW);
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  /** A prism's ground shadow: its base edge extruded along the sun. */
  private castEdgeQuad(x0: number, y0: number, x1: number, y1: number, hTiles: number): void {
    const c = this.beginCastFill();
    if (!c) return;
    const off = this.castOffset(hTiles);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x1 + off.x, y1 + off.y);
    c.lineTo(x0 + off.x, y0 + off.y);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  /**
   * A body's grounding: foot ellipse, a low lobe cast along the sun,
   * and a lobe away from every nearby light — step up to a campfire
   * and your shadow leans back from the flames; stand between two
   * lamps and you drag a pair.
   */
  private castBody(px: number, py: number, r: number): void {
    const c = this.beginContactFill();
    c.beginPath();
    c.ellipse(px, py, r, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();
    const lobe = (ox: number, oy: number, alpha: number): void => {
      c.globalAlpha = Math.min(1, alpha / this.sdwLayerAlpha);
      const ang = Math.atan2(oy, ox);
      const len = Math.hypot(ox, oy);
      c.beginPath();
      c.ellipse(px + ox * 0.55, py + oy * 0.55, r * 0.5 + len * 0.5, r * 0.4, ang, 0, Math.PI * 2);
      c.fill();
    };
    if (this.sky.shadowAlpha >= 0.02) {
      const off = this.castOffset(0.42);
      lobe(off.x, off.y, this.sky.shadowAlpha * 0.75);
    }
    const s = this.camera.scale;
    const ys = this.camera.yScale;
    for (const th of this.lightThrows(px, py, 0.15)) {
      lobe(th.ux * th.len * 0.42 * s, th.uy * th.len * 0.42 * s * ys, th.alpha);
    }
    c.globalAlpha = 1;
  }

  /** A small thing's plain contact ellipse (drops, summons). */
  private castContact(px: number, py: number, rx: number, ry: number): void {
    const c = this.beginContactFill();
    c.beginPath();
    c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  // ------------------------------------- TRUE-FORM silhouette shadows
  //
  // The shadow IS the shape. A static formation bakes its painted
  // silhouette once into a small mask (solid shadow color, hard
  // thresholded edges — sharp like every shadow here), and each frame
  // that mask is flattened onto the ground with one sheared drawImage:
  // screen x picks up kx per pixel of height, screen y collapses to
  // ky per pixel of height. Alignment is exact by construction — every
  // block, seam and crystal the painter drew throws its own outline —
  // and the per-frame cost is a single GPU-composited image transform.

  /** Bake resolution, px per tile — masks scale to the live zoom. */
  private static readonly MASK_S = 72;

  /**
   * Fetch (or bake) a silhouette mask. `paint` replays the object's
   * own painter into the mask canvas with the base anchored at
   * (au, av); the result is flattened to the current shadow color
   * with a hard alpha threshold. Glows/sparkles are gated off during
   * the bake, so time-varying garnish never fossilises into a shadow.
   */
  private shadowMask(
    key: string,
    wTiles: number,
    upTiles: number,
    downTiles: number,
    paint: (ctx: CanvasRenderingContext2D, au: number, av: number) => void,
  ): { cv: HTMLCanvasElement; au: number; av: number } | null {
    const moon = this.sky.moonlit;
    const full = `${key}:${moon ? 'm' : 's'}`;
    const hit = this.shadowMasks.get(full);
    if (hit) return hit;
    // Cache misses are BUDGETED: a cold dense field wants dozens of
    // masks in one frame, and each bake costs real paint. A skipped
    // cast simply appears a frame or two later — invisible, unlike
    // the multi-hundred-ms arrival hitch this replaced.
    if (this.maskBakeBudget <= 0) return null;
    this.maskBakeBudget--;
    if (this.shadowMasks.size > 320) {
      // Trim the OLDEST entries (Map preserves insertion order) — a
      // full clear() here made a dense ore field re-bake its whole
      // mask set in one frame, a recurring stagger every time the
      // cache wrapped.
      let drop = 64;
      for (const k of this.shadowMasks.keys()) {
        this.shadowMasks.delete(k);
        if (--drop <= 0) break;
      }
    }
    const B = Renderer.MASK_S;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(wTiles * B);
    cv.height = Math.ceil((upTiles + downTiles) * B);
    const mctx = cv.getContext('2d')!;
    const au = cv.width / 2;
    const av = upTiles * B;
    const saved = this.ctx;
    this.ctx = mctx;
    this.bakingMask = true;
    paint(mctx, au, av);
    this.bakingMask = false;
    this.ctx = saved;
    // Flatten ON THE GPU — the old getImageData readback stalled the
    // pipeline ~1-2ms per mask, the dominant cost of a cold ore
    // field. Alpha knee a→a² (destination-in self-draw) suppresses
    // translucent garnish, a→2a−a² (source-over self-draw) restores
    // the opaque mass toward solid, then source-in stamps the shadow
    // color. Glows/sparkles are already gated off via bakingMask.
    mctx.save();
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.globalCompositeOperation = 'destination-in';
    mctx.drawImage(cv, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.drawImage(cv, 0, 0);
    mctx.globalCompositeOperation = 'source-in';
    mctx.fillStyle = moon ? 'rgb(14, 20, 48)' : 'rgb(24, 14, 32)';
    mctx.fillRect(0, 0, cv.width, cv.height);
    mctx.restore();
    const entry = { cv, au, av };
    this.shadowMasks.set(full, entry);
    return entry;
  }

  /**
   * Throw a baked silhouette onto the ground: once along the sun (or
   * moon), once away from each nearby pool of light. The shear maps a
   * mask pixel `h` above the base line to (kx·h, ky·h) past the anchor
   * — tall crowns land at the far tip of the shadow, feet stay glued
   * to the contact line at every hour.
   */
  private castMask(
    entry: { cv: HTMLCanvasElement; au: number; av: number },
    px: number,
    baseY: number,
  ): void {
    const q = this.camera.scale / Renderer.MASK_S;
    const ys = this.camera.yScale;
    const c = this.sdw;
    const throwMask = (kx: number, ky: number, alpha: number): void => {
      c.save();
      c.globalAlpha = Math.min(1, alpha / this.sdwLayerAlpha);
      c.transform(q, 0, -kx * q, -ky * q, px - entry.au * q + kx * q * entry.av, baseY + ky * q * entry.av);
      c.drawImage(entry.cv, 0, 0);
      c.restore();
    };
    if (this.sky.shadowAlpha >= 0.02) {
      throwMask(
        this.sky.shadowX * this.sky.shadowLen,
        this.sky.shadowY * this.sky.shadowLen * ys,
        this.sky.shadowAlpha,
      );
    }
    for (const th of this.lightThrows(px, baseY, 0.6)) {
      throwMask(th.ux * th.len, th.uy * th.len * ys, th.alpha);
    }
  }

  /**
   * A rock/ore formation's silhouette, thrown as its shadow. The mask
   * VARIANT is the per-tile hash folded to 8 — a sheared dark blob
   * from a sibling formation is indistinguishable from the exact one,
   * and folding turns "one mask bake per formation" (a cold ore field
   * baked dozens in one frame, the worst arrival stagger) into a tiny
   * fixed set per ore kind.
   */
  private castRockShadow(px: number, py: number, tile: Tile, h: number, crowded: boolean): void {
    if (this.sky.shadowAlpha < 0.02 && this.frameLights.length === 0) return;
    const B = Renderer.MASK_S;
    const hv = (((h % 8) + 8) % 8) * 2654435761;
    const entry = this.shadowMask(`r${tile}.${hv}.${crowded ? 1 : 0}`, 2.7, 2.0, 0.4, (_m, au, av) => {
      this.drawRockFormation(au, av - B * 0.28, B, hv, tile, 0, crowded);
    });
    if (entry) this.castMask(entry, px, py + this.camera.scale * 0.28);
  }

  /**
   * A grown plant's silhouette — forage node or farm crop (calm: wind
   * zeroed). Same variant-fold law as castRockShadow: 8 masks per
   * plant kind, a sibling's sheared silhouette reads identically.
   */
  private castFloraShadow(px: number, baseY: number, tile: Tile, h: number): void {
    if (this.sky.shadowAlpha < 0.02 && this.frameLights.length === 0) return;
    const hv = (((h % 8) + 8) % 8) * 2654435761;
    const fm = plantModel(tile, hv);
    const B = Renderer.MASK_S;
    const entry = this.shadowMask(
      `f${tile}.${hv}`,
      fm.spread * 2 + 0.7,
      fm.height + 0.45,
      0.35,
      (mctx, au, av) => {
        paintPlant(mctx, fm, {
          bx: au,
          groundY: av,
          s: B,
          wx: 0,
          wy: 0,
          tSec: 0,
          flame: 0,
          windOverride: 0,
        });
      },
    );
    if (entry) this.castMask(entry, px, baseY);
  }

  /**
   * Screen → world with elevation: a click on a plateau top must land
   * on the plateau, not on the (hidden) ground two tiles south. Try
   * each level's inverse and accept the one whose terrain agrees.
   */
  pickWorld(sx: number, sy: number): Vec2 {
    const game = this.game;
    const cam = this.camera;
    // High levels first (nearer the camera), then pits; 0 is the
    // fallback flat inverse.
    for (const lvl of [3, 2, 1, -1, -2]) {
      const wy = cam.y + (sy - this.h / 2 + lvl * ELEV_H * cam.scale) / (cam.scale * cam.yScale);
      const wx = cam.x + (sx - this.w / 2) / cam.scale;
      if (game && game.world.elevAt(Math.floor(wx), Math.floor(wy)) === lvl) {
        return { x: wx, y: wy };
      }
    }
    return cam.screenToWorld(sx, sy, this.w, this.h);
  }

  /** Lifted plateau surfaces as y-sorted items (real occluders). */
  private collectElevatedGround(game: ClientGame, items: DrawItem[]): void {
    const b = this.visibleTileBounds();
    const s = this.camera.scale;
    const minCx = Math.floor(b.minTx / CHUNK_SIZE);
    const maxCx = Math.floor(b.maxTx / CHUNK_SIZE);
    // South pad: a level-L crown row lifts L * ELEV_H / yScale rows
    // up-screen — a 3-level plateau just south of the bottom edge
    // reaches ~6.8 rows into view.
    const elevPadS = Math.ceil((ELEV_H * 3) / this.camera.yScale);
    const minCy = Math.floor((b.minTy - ELEV_H * 3 - 1) / CHUNK_SIZE);
    const maxCy = Math.floor((b.maxTy + elevPadS) / CHUNK_SIZE);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const baked = this.baked.get(`${cx},${cy}`);
        if (!baked || baked.lifted.length === 0) continue;
        for (const layer of baked.lifted) {
          // ONE item per ROW, not per band: a band spanning many rows
          // sorts at its first row, so a player standing in a gap of
          // the band's row range (behind a mass that starts further
          // south at their x) would draw first and then poke through
          // the crown. Per-row granularity makes walk-behind exact.
          for (const [r0, r1] of layer.bands) {
            for (let r = r0; r <= r1; r++) {
              const worldTy = cy * CHUNK_SIZE + r;
              if (worldTy > b.maxTy + elevPadS || worldTy < b.minTy - ELEV_H * 3 - 1) continue;
              const level = layer.level;
              items.push({
                sortY: worldTy - 0.01,
                draw: () => {
                  // Shared-corner snap law (see drawGroundChunks): row
                  // slices round their shared row edges to the same
                  // integers, and the lift is rounded ONCE per level so
                  // every row of a plateau rides the same offset.
                  const pA = this.camera.worldToScreen(cx * CHUNK_SIZE, worldTy, this.w, this.h);
                  const pB = this.camera.worldToScreen((cx + 1) * CHUNK_SIZE, worldTy + 1, this.w, this.h);
                  const lift = Math.round(level * ELEV_H * s);
                  const x0 = Math.round(pA.x);
                  const y0 = Math.round(pA.y) - lift;
                  const px = baked.px;
                  const gut = bakeGutter(px);
                  this.ctx.drawImage(
                    layer.canvas,
                    gut,
                    gut + r * px,
                    CHUNK_SIZE * px,
                    px,
                    x0,
                    y0,
                    Math.round(pB.x) - x0,
                    Math.round(pB.y) - lift - y0,
                  );
                  // The plateau's own living layer: grass and flowers on
                  // the lifted surface, drawn on top of the row (already
                  // y-granular, so tall blades go down in the same pass).
                  const rowGround = (tx: number, ty: number) =>
                    game.world.elevAt(tx, ty) === level ? game.world.groundAt(tx, ty) : undefined;
                  const rowBounds = {
                    minTx: Math.max(b.minTx, cx * CHUNK_SIZE),
                    maxTx: Math.min(b.maxTx, cx * CHUNK_SIZE + CHUNK_SIZE - 1),
                    minTy: worldTy,
                    maxTy: worldTy,
                  };
                  drawLiveGround(
                    this.ctx,
                    rowGround,
                    rowBounds,
                    this.liftedWTS,
                    s,
                    performance.now(),
                    this.waterFx(),
                  );
                  this.grass.drawRow(
                    this.ctx,
                    rowGround,
                    (tx, ty) => this.detailAt(game, tx, ty),
                    rowBounds,
                    this.liftedWTS,
                    s,
                  );
                },
              });
            }
          }
        }
      }
    }
  }

  /** This frame's live-water options — the sky and settings decide. */
  private waterFx(): WaterFx {
    return { full: this.waterFxFull, moonlit: this.sky.moonlit };
  }

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
  private drawReflections(game: ClientGame): void {
    const list = this.reflectables;
    if (!this.reflectionsOn) {
      list.length = 0;
      return;
    }
    // The path refreshes every frame (cached per bounds+world rev) —
    // it also gates this frame's reflectable RECORDING, so it must
    // resolve even on frames with nothing yet to mirror.
    const bounds = this.visibleTileBounds();
    const path = this.waterClipFor(game, bounds);
    if (!path || list.length === 0) {
      list.length = 0;
      return;
    }
    // 1. Render every mirrored body OPAQUE into the offscreen layer,
    // through the SAME outline shader as the world pass — what the
    // water shows is the character as the game draws them, whole.
    // Clear and composite only the UNION RECT the mirrors actually
    // cover: the layer cost scales with reflection area, not screen.
    const dpr = window.devicePixelRatio || 1;
    if (this.reflLayer.width !== this.canvas.width || this.reflLayer.height !== this.canvas.height) {
      this.reflLayer.width = this.canvas.width;
      this.reflLayer.height = this.canvas.height;
    }
    const scale = this.camera.scale;
    const entries: Array<{ r: (typeof list)[number]; px: number; axis: number }> = [];
    let ux0 = Infinity;
    let uy0 = Infinity;
    let ux1 = -Infinity;
    let uy1 = -Infinity;
    for (const r of list) {
      const p = this.liftedWTS(r.x, r.y);
      // Mirror axis: the waterline for waders (their wrapped draw
      // clips against it, and the flip carries that clip with it),
      // the feet line for everyone else.
      const axis = p.y + scale * (r.wading ? 0.03 : 0.04);
      const b = r.item.body;
      const x0 = (b ? b.x : p.x - scale * 1.4) - 10;
      const x1 = (b ? b.x + b.w : p.x + scale * 1.4) + 10;
      const y1 = axis + (b ? b.h : scale * 2.2) * 0.85 + 10;
      ux0 = Math.min(ux0, x0);
      ux1 = Math.max(ux1, x1);
      uy0 = Math.min(uy0, axis - 6);
      uy1 = Math.max(uy1, y1);
      entries.push({ r, px: p.x, axis });
    }
    ux0 = Math.max(0, ux0);
    uy0 = Math.max(0, uy0);
    ux1 = Math.min(this.w, ux1);
    uy1 = Math.min(this.h, uy1);
    if (ux1 <= ux0 || uy1 <= uy0) {
      list.length = 0;
      return;
    }
    const rc = this.reflLayerCtx;
    rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    rc.clearRect(ux0, uy0, ux1 - ux0, uy1 - uy0);
    const tSec = performance.now() / 1000;
    const prevCtx = this.ctx;
    this.ctx = rc; // ctx-swap law: closures and paintOutlined follow
    // The silhouette-bake flag gates glow/sparkle side effects out of
    // the mirror pass exactly as it does out of shadow bakes.
    this.bakingMask = true;
    try {
      for (const e of entries) {
        rc.save();
        // A slow shear makes the mirror breathe with the surface.
        const shear = Math.sin(tSec * 1.1 + e.r.x * 0.6 + e.r.y * 0.83) * 0.05;
        rc.translate(e.px, e.axis);
        rc.transform(1, 0, shear, -0.8, 0, 0);
        rc.translate(-e.px, -e.axis);
        if (this.outlineOn && e.r.item.body) this.paintOutlined(e.r.item);
        else e.r.item.draw();
        rc.restore();
      }
    } finally {
      this.bakingMask = false;
      this.ctx = prevCtx;
    }
    // 2. Composite the union rect onto the water in ONE blend, clipped
    // to the organic region — one cohesive image at one alpha, no
    // polygon showing through its neighbor.
    const ctx = this.ctx;
    const prior = ctx.getTransform();
    ctx.save();
    const o = this.camera.worldToScreen(0, 0, this.w, this.h);
    ctx.transform(
      this.camera.scale,
      0,
      0,
      this.camera.scale * this.camera.yScale,
      o.x,
      o.y,
    );
    ctx.clip(path);
    ctx.setTransform(prior);
    ctx.globalAlpha = 0.38;
    ctx.drawImage(
      this.reflLayer,
      ux0 * dpr,
      uy0 * dpr,
      (ux1 - ux0) * dpr,
      (uy1 - uy0) * dpr,
      ux0,
      uy0,
      ux1 - ux0,
      uy1 - uy0,
    );
    ctx.restore();
    list.length = 0;
  }

  /** The water region path over the visible bounds, world coords —
   *  rebuilt only when the camera crosses a tile or the world changes. */
  private waterClipFor(
    game: ClientGame,
    bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  ): Path2D | null {
    const key = `${bounds.minTx},${bounds.minTy},${bounds.maxTx},${bounds.maxTy},${game.worldVersion}`;
    if (this.waterClip?.key !== key) {
      const ground = (tx: number, ty: number): number | undefined =>
        game.world.elevAt(tx, ty) !== 0 ? undefined : game.world.groundAt(tx, ty);
      this.waterClip = { key, path: waterRegionPath(ground, bounds) };
    }
    return this.waterClip.path;
  }

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
  private dressForWater(
    game: ClientGame,
    item: DrawItem,
    key: number | 'own',
    x: number,
    y: number,
  ): void {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const wading =
      game.world.elevAt(tx, ty) === 0 && game.world.groundAt(tx, ty) === Tile.WaterShallow;
    if (this.wadeStates.size > 512) this.wadeStates.clear(); // eid churn backstop
    const st = this.wadeStates.get(key);
    const moved = st ? Math.hypot(x - st.x, y - st.y) : 0;
    if (st) {
      st.x = x;
      st.y = y;
      if (st.wading !== wading) {
        st.wading = wading;
        // The splash of stepping in (or out).
        this.particles.burst(x, y - 0.05, 9, ['#bfe0f2', '#8fc3e0', '#eaf4fb'], {
          speed: 1.5,
          life: 0.4,
          size: 0.06,
          up: true,
          gravity: 4,
          drag: 2,
        });
        this.onSplash?.(x, y, wading);
      }
    } else {
      this.wadeStates.set(key, { x, y, wading });
    }

    // Stealth ghosts cast no reflection: a single-blend composite has
    // one alpha for the whole layer, and a mirror of a body the world
    // can barely see would out-shout the body itself.
    const mirrorable = this.reflectionsOn && !!this.waterClip?.path && item.alpha === undefined;

    if (!wading) {
      // Mirror only bodies that could actually show in water: a fast
      // scan of the tiles a reflection would lie across (south of the
      // feet — reflections hang DOWN the screen).
      if (!mirrorable) return;
      for (let dy = 0; dy <= 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = game.world.groundAt(tx + dx, ty + dy);
          if (
            t === Tile.Water ||
            t === Tile.WaterDeep ||
            t === Tile.WaterShallow ||
            t === Tile.FishingSpot
          ) {
            this.reflectables.push({ x, y, wading: false, item });
            return;
          }
        }
      }
      return;
    }

    // --- Wading: sink the body behind the waterline. ---
    const scale = this.camera.scale;
    const moving = moved > 0.004;
    // A little spray kicked loose while pushing through.
    if (moving && Math.random() < this.frameDt * 2.5) {
      this.particles.burst(x, y - 0.02, 2, ['#bfe0f2', '#eaf4fb'], {
        speed: 0.9,
        life: 0.3,
        size: 0.045,
        up: true,
        gravity: 4,
        drag: 2,
      });
    }
    const orig = item.draw;
    // Wading bodies stay on the live pass: the waterline clip and the
    // sink ride the breathing surface, not a cacheable still.
    item.olDyn = true;
    item.draw = () => {
      const ctx = this.ctx; // read at draw time — the outline pass swaps it
      const p = this.liftedWTS(x, y);
      const surfY = p.y + scale * 0.03;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-1e5, -1e5, 2e5, 1e5 + surfY);
      ctx.clip();
      ctx.translate(0, scale * 0.16);
      orig();
      ctx.restore();
    };
    // Rings ride OVER the body (water in front of the shins) and skip
    // the outline dilate — chained onto the label pass, main ctx only.
    const origLabel = item.drawLabel;
    item.drawLabel = () => {
      const ctx = this.ctx;
      const p = this.liftedWTS(x, y);
      const surfY = p.y + scale * 0.03;
      ctx.save();
      ctx.lineCap = 'round';
      // THE FLAT LAW: rings lying on the surface project at the
      // camera's pitch — every ellipse here is rx × rx·0.6, matching
      // the world's yScale. Rounder reads top-down; flatter reads like
      // a side view. Neither is this camera.
      const FLAT = 0.6;
      // The waterline collar where the body meets the surface, with a
      // soft depth shade under its south rim.
      ctx.strokeStyle = 'rgba(226, 240, 251, 0.55)';
      ctx.lineWidth = Math.max(1.5, scale * 0.045);
      ctx.beginPath();
      ctx.ellipse(p.x, surfY, scale * 0.24, scale * 0.24 * FLAT, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(26, 48, 96, 0.26)';
      ctx.lineWidth = Math.max(1.5, scale * 0.04);
      ctx.beginPath();
      ctx.ellipse(p.x, surfY + scale * 0.03, scale * 0.28, scale * 0.28 * FLAT, 0, 0, Math.PI);
      ctx.stroke();
      // Wake rings while pushing through; a slow bob ring at rest.
      const t = performance.now() / 1000;
      const seed = typeof key === 'number' ? (key % 7) / 7 : 0.35;
      const n = moving ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const period = moving ? 0.9 : 2.6;
        const phase = (t / period + k * 0.5 + seed) % 1;
        const a = (1 - phase) * (moving ? 0.4 : 0.2);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#dcebfb';
        ctx.lineWidth = Math.max(1.5, scale * 0.04);
        ctx.beginPath();
        const rr = (0.24 + phase * 0.5) * scale;
        ctx.ellipse(p.x, surfY, rr, rr * FLAT, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      origLabel?.();
    };
    // Waders reflect too: the mirror replays the WRAPPED draw, whose
    // waterline clip flips along with it — the water shows exactly
    // the above-surface half of the body, mirrored at the waterline.
    if (mirrorable) this.reflectables.push({ x, y, wading: true, item });
  }

  private animFor(key: number | 'own', x: number, y: number, pose: number, now: number): AnimState {
    let anim = this.anims.get(key);
    if (!anim) {
      anim = {
        walkPhase: 0,
        lastX: x,
        lastY: y,
        lastPose: pose,
        poseStartedAt: now,
        lastSeen: now,
        kneeMemory: [0, 0],
      };
      this.anims.set(key, anim);
    }
    const dist = Math.hypot(x - anim.lastX, y - anim.lastY);
    anim.walkPhase += dist * 0.55;
    // Travel activity, low-passed so a hop animation neither flickers
    // on interpolation jitter nor freezes mid-air the frame motion stops.
    const dt = Math.max(this.frameDt, 1e-3);
    const targetK = Math.min(1, dist / dt / 1.5);
    const blend = Math.min(1, dt * 8);
    anim.moveK = (anim.moveK ?? 0) * (1 - blend) + targetK * blend;
    anim.lastX = x;
    anim.lastY = y;
    if (pose !== anim.lastPose) {
      anim.lastPose = pose;
      anim.poseStartedAt = now;
      this.onPoseChange?.(key, pose, x, y);
    }
    anim.lastSeen = now;
    return anim;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  render(game: ClientGame, frameDt: number): void {
    this.game = game;
    this.resize();
    this.frameNo++;
    this.treeBakeBudget = TREE_BAKE_BUDGET;
    this.treeShadowBudget = TREE_BAKE_BUDGET;
    this.spriteBakeMsLeft = SPRITE_BAKE_MS;
    // Shadow-mask misses per frame: masks are shared per (kind,
    // variant) — see castRockShadow — so a handful per frame drains
    // any cold field's set within a second, and a skipped cast just
    // lands a frame later.
    this.maskBakeBudget = 6;
    // Base-exposure body relights per frame: covers every body a busy
    // market frame can show; past it, the plain multiply map stands.
    this.relitLeft = 48;
    // Zoomed out, the same world-space sway spans FEWER screen pixels —
    // stretch the sampling floor so wide framings stop paying the full
    // re-bake rate for sub-pixel motion. Cadence 10 at ≤0.85× steps
    // ~1px, the accepted dense-forest rate; ≥1× keeps the fine floor.
    const minCadence = this.camera.zoom < 1 ? 10 : TREE_REBAKE_FRAMES;
    this.treeCadence = Math.min(
      TREE_CADENCE_MAX,
      Math.max(minCadence, Math.ceil(this.treesVisible / TREE_BAKES_PER_FRAME)),
    );
    this.treesVisible = 0;
    // The sky rules the frame: shadows, exposure, grade all read it.
    this.sky = daylightAt(game.clockHoursNow());
    // UNDERGROUND LAW: the dark band never sees the surface sky. Below
    // UNDERGROUND_Y the frame's sample blends toward a fixed deep-cave
    // ambient at this single choke point — lightmap, sun shadows, the
    // grade and the flame gate all read the same override — easing
    // over ~1s of real time so a portal hop fades instead of popping.
    {
      const pos = game.ownEid !== null ? game.predictor.renderPos() : null;
      const under = pos !== null && pos.y >= UNDERGROUND_Y ? 1 : 0;
      const step = frameDt; // full swing in one second
      this.ugBlend += Math.max(-step, Math.min(step, under - this.ugBlend));
      if (this.ugBlend > 0.001) this.applyUnderground(this.ugBlend);
    }
    // Hitstop slows animation + particles to a crawl for a few frames;
    // the camera and network keep real time.
    this.frameDt = performance.now() < this.hitstopUntil ? frameDt * 0.12 : frameDt;
    this.tickStationHeat(game, this.frameDt);

    // Player zoom glides first — every projection this frame reads it.
    this.camera.tickZoom(frameDt);
    this.zoomGliding = this.camera.zoom !== this.camera.targetZoom;

    // The UI's frame request glides, then the camera eases onto it —
    // opening the character case pans the world, never cuts.
    this.viewShiftX +=
      (this.viewShiftTargetX - this.viewShiftX) * (1 - Math.exp(-7 * frameDt));
    const own = game.predictor.renderPos();
    const k = 1 - Math.exp(-8 * frameDt);
    // Elevation-true follow: sprites draw lifted by renderLift·scale
    // screen px (liftedWTS), but the camera centers WORLD coords — on
    // a plateau the body would ride a full level above center (and
    // below it in pits). Convert the screen lift back to world-y by
    // dividing out the pitch squash (the projAirWorldY law) so the
    // camera centers the DRAWN body, not the footprint. renderLift
    // interpolates across ramps/stairs, so the correction glides with
    // the climb instead of popping at level boundaries.
    const ownEyeY = own.y - this.renderLift(own.x, own.y) / this.camera.yScale;
    const cine = this.cineEid !== null ? game.entities.get(this.cineEid) : undefined;
    if (cine) {
      // Dialogue cinematic: pull PAST the player's zoom ceiling — an
      // intimacy the wheel can't reach. The zoom target holds STILL so
      // sprite bakes settle sharp; the living breath rides the
      // screen-space scale below instead (zero re-bakes).
      this.camera.targetZoom = 2.1;
      const last = cine.buffer.latest();
      const nx = last?.x ?? cine.meta.x;
      const ny = last?.y ?? cine.meta.y;
      const cineEyeY = ny - this.renderLift(nx, ny) / this.camera.yScale;
      // Look below the midpoint so the figures ride the upper 2/3 —
      // the speech sheet owns the bottom of the screen.
      const lift = (this.h * 0.1) / (this.camera.scale * this.camera.yScale);
      this.camera.x += ((own.x + nx) / 2 - this.camera.x) * k;
      this.camera.y += ((ownEyeY + cineEyeY) / 2 + lift - this.camera.y) * k;
    } else {
      this.camera.x += (own.x + this.viewShiftX / this.camera.scale - this.camera.x) * k;
      this.camera.y += (ownEyeY - this.camera.y) * k;
    }

    this.shakeAmount *= Math.exp(-7 * frameDt);
    if (this.shakeAmount > 0.2) {
      this.camera.x += ((Math.random() - 0.5) * this.shakeAmount) / this.camera.scale;
      this.camera.y += ((Math.random() - 0.5) * this.shakeAmount) / this.camera.scale;
    }

    this.ctx.fillStyle = '#141020';
    this.ctx.fillRect(0, 0, this.w, this.h);

    // Kill zoom-pulse: a screen-space scale kick easing back out. The
    // dialogue cinematic adds its slow breath here too — a 0..1.4%
    // swell (never below 1: shrinking would peel the canvas edge) that
    // keeps the held shot alive without invalidating a single bake.
    this.zoomPulseAmount *= Math.exp(-6 * frameDt);
    const cineBreath =
      this.cineEid !== null
        ? (Math.sin(((performance.now() - this.cineT0) / 1000) * 0.5) + 1) * 0.007
        : 0;
    if (this.zoomPulseAmount > 0.001 || cineBreath > 0) {
      const z = 1 + this.zoomPulseAmount + cineBreath;
      this.ctx.translate(this.w / 2, this.h / 2);
      this.ctx.scale(z, z);
      this.ctx.translate(-this.w / 2, -this.h / 2);
    }

    this.drawGroundChunks(game);

    // Reflections land straight on the baked water, BEFORE the live
    // surface — foam, glints and swells then paint over the mirror the
    // way light sits on real water.
    this.drawReflections(game);

    // The grass system wakes up first: it needs every moving body this
    // frame to part blades, flatten them underfoot, and rustle thickets.
    const groundLvl0 = (tx: number, ty: number) =>
      game.world.elevAt(tx, ty) !== 0 ? undefined : game.world.groundAt(tx, ty);
    const detail = (tx: number, ty: number) => this.detailAt(game, tx, ty);
    this.grass.beginFrame(
      performance.now(),
      this.frameDt,
      this.collectDisturbers(game),
      (tx, ty) => game.world.groundAt(tx, ty),
      (x, y) =>
        this.particles.burst(x, y - 0.2, 3, ['#527c38', '#76a650', '#a4b860'], {
          speed: 1.1,
          life: 0.5,
          size: 0.045,
          up: true,
          gravity: 2.5,
        }),
      this.camera.x,
      this.camera.y,
    );

    // The breeze layer: water glints, ripples, portal swirls.
    const bounds = this.visibleTileBounds();
    // Interior regions resolve before lights: the version gate clears
    // on any world change, then this frame's queries rebuild lazily.
    // The local player's region drives the cutaway wall and hearth-
    // gated window warmth.
    this.interiors.beginFrame(game.worldVersion);
    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      this.localRegion = this.interiors.regionAt(game, Math.floor(own.x), Math.floor(own.y));
      // The wall reveal eases on the CONTINUOUS render position —
      // floor()ing here would make the occlusion window pop per row.
      this.ownPX = own.x;
      this.ownPY = own.y;
      this.ugCutOn = own.y >= UNDERGROUND_Y;
      // THE SHELTER GATE: the reveal only arms while you are INSIDE
      // somewhere — underground, in any enclosed region, or standing
      // on man-made floor / a threshold (the floor IS the room: a
      // broken-open ruin with no enclosure still counts the moment
      // your feet find its boards). Eased over ~0.35s so entering a
      // building bows its walls down and leaving raises them, instead
      // of the old binary region snap.
      const ownT = game.world.groundAt(Math.floor(own.x), Math.floor(own.y));
      const sheltered =
        this.ugCutOn ||
        this.localRegion !== null ||
        (ownT !== undefined &&
          (Renderer.REVEAL_FLOORS.has(ownT) || Renderer.DOOR_TILES.has(ownT)));
      const step = frameDt / 0.35;
      this.shelterK += Math.max(-step, Math.min(step, (sheltered ? 1 : 0) - this.shelterK));
      const shel = this.shelterK * this.shelterK * (3 - 2 * this.shelterK);
      // Underground the reveal rides the darkness fade too, so a
      // portal drop reveals with the gloom instead of ahead of it.
      this.cutCtx = this.ugCutOn ? Math.min(shel, this.ugBlend) : shel;
    } else {
      this.localRegion = null;
      this.ugCutOn = false;
      this.shelterK = 0;
      this.cutCtx = 0;
    }
    // THE STEP-ASIDE FADE's body box + THE GHOST EMBER's wall probe.
    // Both ride the CONTINUOUS render position (same law as the wall
    // reveal — flooring pops per row) and both gate on OCCLUSION,
    // never proximity. Wall cover is veil-cut aware via wallHeightAt
    // so a sunken stub never argues with the wall reveal.
    this.revealArmed = game.ownEid !== null;
    this.ownItem = null; // collectEntities re-stashes each frame
    let cover = 0;
    if (this.revealArmed) {
      const s = this.camera.scale;
      const a = this.liftedWTS(this.ownPX, this.ownPY);
      this.fadeBX0 = a.x - FADE_BODY_HW * s;
      this.fadeBX1 = a.x + FADE_BODY_HW * s;
      this.fadeBY0 = a.y - FADE_BODY_HT * s;
      this.fadeBY1 = a.y + FADE_BODY_BELOW * s;
      const btx = Math.floor(this.ownPX);
      const bty = Math.floor(this.ownPY);
      for (let dyRow = 1; dyRow <= 3; dyRow++) {
        for (let dxCol = -1; dxCol <= 1; dxCol++) {
          const tx = btx + dxCol;
          const ty = bty + dyRow;
          if (!this.wallish(game, tx, ty)) continue;
          const k = wallCover(
            this.wallHeightAt(game, tx, ty),
            ty + 1 - this.ownPY,
            Math.abs(tx + 0.5 - this.ownPX),
            this.camera.yScale,
          );
          if (k > cover) cover = k;
        }
      }
    }
    // Deep-canopy shade summons the ember too: core occluders from
    // LAST frame's pass (the ember's 0.22s ease swallows the lag).
    const shade = stackCover(this.fadeCoreCount);
    if (shade > cover) cover = shade;
    const gStep = frameDt / GHOST_EASE_S;
    this.ghostK += Math.max(-gStep, Math.min(gStep, cover - this.ghostK));
    this.fadeCoreCount = this.fadeCoreCountNew;
    this.fadeCoreCountNew = 0;
    // Fade-ease bookkeeping decays even for sprites that left the
    // screen; sweep long-unused entries.
    if (this.frameNo % 240 === 0) {
      for (const [key, f] of this.fadeMap) {
        if (f.used < this.frameNo - 120) this.fadeMap.delete(key);
      }
    }
    // Standing lights gather FIRST: the shadow prepass needs to know
    // every pool before anything casts. (Moving lights announce via
    // queueGlow during the draw pass and cast one frame later.)
    // Padded on ALL sides: a campfire's pool reaches 4.4 tiles, so a
    // fire just past any edge still lights the visible floor.
    this.collectStaticLights(game, {
      minTx: bounds.minTx - LIGHT_PAD,
      maxTx: bounds.maxTx + LIGHT_PAD,
      minTy: bounds.minTy - LIGHT_PAD,
      maxTy: bounds.maxTy + LIGHT_PAD,
    });
    // The frame's blocker test: armed here (lights are gathered, items
    // not yet drawn) so the body-relight pass can walk sight lines.
    this.blocksAt = (tx, ty) => {
      const t = game.world.groundAt(tx, ty);
      return t !== undefined && (Renderer.LIGHT_BLOCKERS.has(t) || t === Tile.Cliff);
    };
    // Ground-level tiles only: lifted tiles get their own live layer
    // drawn OVER their plateau band (see collectElevatedGround).
    drawLiveGround(
      this.ctx,
      groundLvl0,
      bounds,
      this.liftedWTS,
      this.camera.scale,
      performance.now(),
      this.waterFx(),
    );

    // The meadow under everyone's feet: short blades, clumps, flowers.
    // Grass bounds are TIGHT — blades reach < 1 tile up, so the 5-row
    // canopy padding in visibleTileBounds would be ~150 wasted tiles.
    const grassBounds = {
      minTx: bounds.minTx + 1,
      maxTx: bounds.maxTx - 1,
      minTy: bounds.minTy + 3,
      maxTy: bounds.maxTy - 1,
    };
    // Arm the meadow's cast BEFORE the under pass builds blades: each
    // blade appends its sheared ground quad as it is built, and the
    // whole meadow's shade fills into the shadow layer in one path.
    this.grass.setShadow(
      this.sky.shadowX * this.sky.shadowLen,
      this.sky.shadowY * this.sky.shadowLen * this.camera.yScale,
      this.sky.shadowAlpha >= 0.02,
    );
    this.grass.drawUnder(this.ctx, groundLvl0, detail, grassBounds, this.liftedWTS, this.camera.scale);

    // The Riftgates' blighted ground: painted OVER the meadow (like a
    // decal) so the stain visibly smothers the blades, but under the
    // y-sorted world so bodies stand on it.
    for (const pr of this.portalsInView) {
      drawPortalGround(
        this.ctx,
        pr.tx,
        pr.ty,
        pr.up,
        this.liftedWTS,
        this.camera.scale,
        performance.now() / 1000,
      );
    }

    // Ground-level combat FX — decals, hazard zones, telegraphs, and
    // every ring/floor/wash a spell lays on the turf paint UNDER the
    // y-sorted world so bodies stand on them: the far rim hides behind
    // the caster, the near rim rolls out in front of their feet.
    this.drawGroundFx(game);
    this.drawRings();

    const items: DrawItem[] = [];
    // Tall thickets y-sort with the world: you walk THROUGH them.
    this.grass.collectTall(items, this.ctx, groundLvl0, detail, grassBounds, this.liftedWTS, this.camera.scale);
    this.collectElevatedGround(game, items);
    this.collectCliffFaces(game, items);
    this.collectRaisedTiles(game, items);
    this.collectInteriorRegions(game);
    this.collectBreakingRocks(game, items);
    this.collectFallingTrees(items);
    this.collectEntities(game, items);
    // Standing spell matter — erupting spears, cage bars, rifts,
    // orbiting runes, blast bodies — y-sorts with the world: a spear
    // north of you rises BEHIND your body, a bar south of you rises
    // in front. The spell stands in the world, not on the screen.
    this.collectFxVolumes(game, items);

    // Ground shadow prepass, batched: every shape lands opaque on one
    // layer, composited once at the sky's alpha — overlapping dusk
    // shadows merge into a single density instead of stacking.
    const dpr = window.devicePixelRatio || 1;
    if (this.shadowLayer.width !== this.canvas.width || this.shadowLayer.height !== this.canvas.height) {
      this.shadowLayer.width = this.canvas.width;
      this.shadowLayer.height = this.canvas.height;
    }
    const sc = this.shadowLayerCtx;
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc.clearRect(0, 0, this.w, this.h);
    this.sdw = sc;
    this.buildFrameLights();
    // The layer composites at the DEEPEST shadow this frame needs —
    // sky, contact floor, or the strongest light throw.
    this.sdwLayerAlpha = Math.min(
      1,
      Math.max(this.sky.shadowAlpha, CONTACT_MIN, this.frameLights[0]?.a ?? 0),
    );
    for (const item of items) {
      if (!item.elevated) item.drawShadow?.();
    }
    // The meadow's cast, gathered during the under pass: every blade
    // and flower shadow lands here in one fill, slightly lighter than
    // solid props — thin things throw thin shade.
    this.grass.flushShadows(
      sc,
      this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN,
      Math.min(1, (this.sky.shadowAlpha * 0.85) / this.sdwLayerAlpha),
    );
    // SHELTERED ROOMS RECEIVE NO SKY: punch every visible interior out
    // of the shadow layer before it composites. A wall must not cast
    // into its own room — the dark wedge on an inn floor was the north
    // wall's sun shadow falling "indoors".
    if (this.visibleRegions.length > 0) {
      const s2 = this.camera.scale;
      sc.globalCompositeOperation = 'destination-out';
      sc.fillStyle = '#000';
      for (const region of this.visibleRegions) {
        const lift = region.elevLevel * ELEV_H * s2;
        for (let ty = region.y0; ty <= region.y1; ty++) {
          let run = -1;
          for (let tx = region.x0; tx <= region.x1 + 1; tx++) {
            const inside = tx <= region.x1 && region.tiles.has(packTile(tx, ty));
            if (inside && run < 0) run = tx;
            else if (!inside && run >= 0) {
              const a = this.camera.worldToScreen(run, ty, this.w, this.h);
              const b = this.camera.worldToScreen(tx, ty + 1, this.w, this.h);
              sc.fillRect(a.x, a.y - lift, b.x - a.x, b.y - a.y);
              run = -1;
            }
          }
        }
      }
      sc.globalCompositeOperation = 'source-over';
    }
    this.ctx.save();
    this.ctx.globalAlpha = this.sdwLayerAlpha;
    this.ctx.drawImage(this.shadowLayer, 0, 0, this.shadowLayer.width, this.shadowLayer.height, 0, 0, this.w, this.h);
    this.ctx.restore();
    // In-sort (plateau) shadows draw straight into the frame.
    this.sdw = this.ctx;
    this.sdwLayerAlpha = 1;
    // Ground-hugging dust joins the y-sort as world items (updated
    // here, before the sort, so positions are current): the trail a
    // south-running body leaves must paint UNDER the body, and a puff
    // south of a body must paint over it. Airborne effects (sparks,
    // leaves, magic) stay in the overlay pass below.
    this.particles.update(this.frameDt);
    for (const p of this.particles.groundParticles()) {
      items.push({
        sortY: p.y,
        draw: () => this.particles.drawOne(this.ctx, p, this.liftedWTS, this.camera.scale),
      });
    }
    // Smashed-prop chunks are world matter: they y-sort with the scene
    // (a stave that lands north of a table paints under it) and test
    // the live collision field so flying wood thuds off walls.
    this.debris.update(this.frameDt, (x, y) => pointHitsSolid(game.world, x, y));
    for (const c of this.debris.chunks()) {
      items.push({
        sortY: c.y + 0.02,
        // Each chunk wears its own brand ring (drawn inside drawOne),
        // gated on the same /outline switch as everything standing.
        draw: () =>
          this.debris.drawOne(this.ctx, c, this.liftedWTS, this.camera.scale, this.outlineOn),
      });
    }
    // AMBIENT BIRDS: the flock lives with the world. THE FLUSH LAW —
    // the threat scan feeds every nearby body, players AND npcs, so a
    // grazing stag flushes a flock exactly like a sprinting hero.
    // Grounded birds join the y-sort here; the airborne cross over the
    // world pass below (their contact shadows ride inside drawOne,
    // debris-style).
    {
      const bb = this.visibleTileBounds();
      const env = this.birdEnv;
      env.tSec = performance.now() / 1000;
      env.minTx = bb.minTx;
      env.maxTx = bb.maxTx;
      env.minTy = bb.minTy;
      env.maxTy = bb.maxTy;
      env.night = this.sky.moonlit;
      env.underground = this.ugBlend > 0.4;
      let tc = 0;
      if (game.ownEid !== null) {
        const own = game.predictor.renderPos();
        tc = this.pushBirdThreat(tc, own.x, own.y);
      }
      const btl = game.renderTime();
      for (const [, remote] of game.entities) {
        const kind = remote.meta.kind;
        if (kind !== EntityKind.Player && kind !== EntityKind.Npc) continue;
        const bs = remote.buffer.sampleAt(btl);
        tc = this.pushBirdThreat(tc, bs?.x ?? remote.meta.x, bs?.y ?? remote.meta.y);
      }
      env.threatCount = tc;
      this.birds.update(this.frameDt, env);
      for (const bd of this.birds.grounded()) {
        items.push({
          sortY: bd.y + 0.01,
          draw: () =>
            this.birds.drawOne(this.ctx, bd, this.liftedWTS, this.camera.scale, this.outlineOn, env.tSec),
        });
      }
    }
    items.sort((a, b) => a.sortY - b.sortY);
    for (const item of items) {
      // Stealth ghost: wrap OUTSIDE the outline pass so the dilated
      // silhouette ring fades with the body (alpha inside draw() would
      // leave the ring solid). The nameplate stays opaque.
      if (item.alpha !== undefined) this.ctx.globalAlpha = item.alpha;
      if (item.elevated) item.drawShadow?.();
      if (this.outlineOn && item.body) this.paintOutlined(item);
      else item.draw();
      if (item.alpha !== undefined) this.ctx.globalAlpha = 1;
      item.drawLabel?.();
    }
    // THE GHOST EMBER rides over the world pass, under the overlay FX.
    this.drawGhostEmber();

    // Birds on the wing cross OVER the world, under the overlay FX —
    // altitude is a screen lift; the turf shadow stays at the ground point.
    for (const bd of this.birds.airborne()) {
      this.birds.drawOne(this.ctx, bd, this.liftedWTS, this.camera.scale, this.outlineOn, this.birdEnv.tSec);
    }

    this.particles.draw(this.ctx, this.liftedWTS, this.camera.scale);
    // The aim guide rides OVER the world pass: elevated ground repaints
    // the whole plateau as y-sorted items, so drawing it early buried
    // the guide anywhere above level 0 (the drawAimGuide-under-items
    // era only survived on flat ground).
    this.drawAimGuide(game);
    this.drawCombatFx(game);
    this.drawLevelCeremony(game);

    // Depth & atmosphere: the exposure pass (multiply lightmap) sets
    // the scene's darkness, THEN emissive bloom pops over it, then the
    // tilted-camera tilt-shift bands and the grade. HUD stays crisp.
    const origin = this.camera.worldToScreen(0, 0, this.w, this.h);
    // Lit-face heights in world-y units: faces rise N tiles of SCREEN
    // height, so divide the camera squash back out.
    const ys = this.camera.yScale;
    this.lighting.draw(
      this.ctx,
      { w: this.w, h: this.h, scale: this.camera.scale, yScale: ys, ox: origin.x, oy: origin.y },
      this.sky,
      this.lights,
      this.blocksAt,
      // LIGHT CLIMBS WHAT IT MEETS: every tall thing reports the face
      // the camera sees — walls at full prism height, cliffs at their
      // ledge, stations/stalls/furniture at standing-prop height,
      // trees a modest trunk wash under the canopy.
      (tx, ty) => {
        const t = game.world.groundAt(tx, ty);
        if (t === undefined) return 0;
        if (Renderer.LIGHT_BLOCKERS.has(t)) return WALL_H / ys;
        if (t === Tile.Cliff) return ELEV_H / ys;
        if (TREE_TILES.has(t as Tile)) return 1.5 / ys;
        if (tileDef(t).raised) return 1.05 / ys;
        return 0;
      },
    );
    this.lights.length = 0;
    // Moving lights hand their positions to next frame's shadow pass.
    const swap = this.prevDynamic;
    this.prevDynamic = this.nextDynamic;
    this.nextDynamic = swap;
    this.nextDynamic.length = 0;
    this.drawGlows();
    this.applyTiltShift();
    this.drawGrade();

    this.drawBuildGhost();
    this.drawActionProgress(game);
    this.drawFloaties(game);
    this.drawLootLabels(game);
    this.drawHpBar(game);
    this.drawVignette();
    this.evictBaked();
    this.evictAnims();
    this.evictTreeSprites();
  }

  /** Deep-cave ambient the underground blend rides to: cool, slightly
   *  desaturated, ~0.58 effective darkness regardless of surface hour.
   *  Lifted repeatedly from the original [48,54,70] by user decree:
   *  lights don't reach every gallery, so the UNLIT cave must read on
   *  its own — a moonlit-cavern floor, with the drama coming from
   *  pools, lit faces, bounce wrap and body relights over it. The one
   *  constant serves caves AND dungeon instances (both live below
   *  UNDERGROUND_Y — dungeons park at y 8192). */
  private static readonly UG_AMBIENT: readonly [number, number, number] = [100, 106, 126];

  /**
   * Blend this frame's sky sample toward the fixed cave ambient.
   * Mutates the object daylightAt() built THIS frame (a fresh sample
   * every render — nothing else aliases it). Sun, moon and shadow
   * alpha die with the blend so tile shadows fade out underground;
   * flame rides to 1 so braziers carry the scene no matter what the
   * surface clock says; darkness is re-derived from the blended
   * ambient so the lightmap gate, glow boosts and grade all agree.
   */
  private applyUnderground(k: number): void {
    const s = this.sky;
    const [ur, ug, ub] = Renderer.UG_AMBIENT;
    s.ambient[0] += (ur - s.ambient[0]) * k;
    s.ambient[1] += (ug - s.ambient[1]) * k;
    s.ambient[2] += (ub - s.ambient[2]) * k;
    // The horizon haze sinks to cave gloom — deep blue, no longer
    // near-black: the brighter ambient floor needs a top band that
    // shades, not swallows.
    s.sky[0] += (24 - s.sky[0]) * k;
    s.sky[1] += (28 - s.sky[1]) * k;
    s.sky[2] += (44 - s.sky[2]) * k;
    s.skyAlpha += (0.32 - s.skyAlpha) * k;
    s.sun *= 1 - k;
    s.moon *= 1 - k;
    s.shadowAlpha *= 1 - k; // no sun down there
    s.flame += (1 - s.flame) * k;
    const lum = (0.299 * s.ambient[0] + 0.587 * s.ambient[1] + 0.114 * s.ambient[2]) / 255;
    s.darkness = 1 - lum;
  }

  /**
   * The frame's standing light sources, from one tile scan: each pushes
   * an emissive glow (additive bloom) AND a WorldLight (lightmap punch,
   * flame-gated so man-made fire only carries the scene after dark).
   * Bloom alpha swells with darkness — fires read hotter at night.
   */
  /** Visible Riftgates this frame — filled by the static-light scan,
   * consumed by the blight-apron pass after the grass under-pass. */
  private readonly portalsInView: Array<{ tx: number; ty: number; up: boolean }> = [];

  private collectStaticLights(
    game: ClientGame,
    bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  ): void {
    this.portalsInView.length = 0;
    const t = performance.now() / 1000;
    const flame = this.sky.flame;
    const boost = 1 + 0.8 * this.sky.darkness;
    // Windows are fake emitters (the pane itself blocks in the shadow
    // math): capped so a city block can't flood the light pass.
    let windowLights = 0;
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
        const tile = game.world.groundAt(tx, ty);
        if (tile === Tile.Campfire) {
          const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
          this.glows.push({ x: tx + 0.5, y: ty + 0.32, r: 1.6 * flick, rgb: '235, 140, 52', a: 0.3 * flick * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.4 * flick, rgb: [255, 186, 110], intensity: 0.9 * flame * flick, occlude: true });
        } else if (tile === Tile.Furnace) {
          const pulse = 0.8 + Math.sin(t * 5 + tx) * 0.2;
          this.glows.push({ x: tx + 0.5, y: ty + 0.75, r: 1.15, rgb: '232, 108, 45', a: 0.24 * pulse * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.8, r: 2.8, rgb: [255, 148, 82], intensity: 0.65 * flame * pulse, occlude: true });
        } else if (tile === Tile.Hearth) {
          // The heart of a home: a wide, steady warm pool — less
          // flicker than a campfire, more reach than a furnace mouth.
          const pulse = 0.9 + Math.sin(t * 6 + tx * 1.9) * 0.08;
          this.glows.push({ x: tx + 0.5, y: ty + 0.45, r: 1.4 * pulse, rgb: '235, 150, 62', a: 0.26 * pulse * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.7, r: 4.2, rgb: [255, 190, 120], intensity: 0.85 * flame * pulse, occlude: true });
        } else if (tile === Tile.Brazier) {
          // Dungeon brazier: an open coal basket — campfire-class
          // reach with the same standing-flame flicker, flame-gated
          // like every man-made fire (underground the flame gate rides
          // to 1, so braziers always carry the dark band).
          const flick = 0.85 + Math.sin(t * 11 + tx * 3.1) * 0.1 + Math.sin(t * 23 + ty) * 0.05;
          this.glows.push({ x: tx + 0.5, y: ty + 0.3, r: 1.5 * flick, rgb: '255, 158, 66', a: 0.3 * flick * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 4.4 * flick, rgb: [255, 180, 104], intensity: 0.9 * flame * flick, occlude: true });
        } else if (tile === Tile.GlowShroom) {
          // Glowshrooms: bioluminescence, not fire — a smaller, cool
          // teal pool that BREATHES on a slow swell (never the flame
          // flicker), ungated by the flame clock, and non-occluding
          // (a soft haze through the cave, not a lamp).
          const pulse = 0.8 + Math.sin(t * 1.4 + tx * 0.9 + ty * 1.7) * 0.2;
          this.glows.push({ x: tx + 0.5, y: ty + 0.4, r: 0.95 * pulse, rgb: '110, 225, 200', a: 0.12 * pulse * boost });
          this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.4, rgb: [110, 225, 200], intensity: 0.4 * pulse });
        } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
          // The Riftgate: bloom rides the vortex heart (raised off the
          // ground — divide the squash back out, the projAir law), a
          // second faint pool licks the blighted apron, and the light-
          // map pulse carries the purple across the scene after dark.
          const up = tile === Tile.PortalUp;
          const pulse = 0.82 + Math.sin(t * 1.7 + tx * 1.3) * 0.12 + Math.sin(t * 3.9 + ty) * 0.06;
          this.glows.push({
            x: tx + 0.5,
            y: ty + PORTAL_PLANE - 0.78 / this.camera.yScale,
            r: (up ? 1.6 : 1.9) * pulse,
            rgb: up ? '196, 176, 255' : '164, 118, 240',
            a: 0.3 * pulse * boost,
          });
          this.glows.push({ x: tx + 0.5, y: ty + 0.6, r: 1.3, rgb: '122, 86, 200', a: 0.12 * boost });
          this.lights.push({
            x: tx + 0.5,
            y: ty + 0.5,
            r: 4.6 * pulse,
            rgb: up ? [190, 170, 255] : [168, 128, 245],
            intensity: 0.62 * pulse,
            occlude: true,
          });
          // The gate breathes here too: this is the one per-frame scan
          // that knows every visible portal, so the suction motes and
          // blight embers spawn from it (dt-gated, a few quads/sec),
          // and the blight-apron pass reads the list it builds.
          spawnPortalFx(this.particles, tx, ty, up, this.frameDt);
          this.portalsInView.push({ tx, ty, up });
        } else if (tile === Tile.LampPost) {
          const flick = 0.92 + Math.sin(t * 9 + tx * 2.3 + ty) * 0.05 + Math.sin(t * 17 + ty * 1.7) * 0.03;
          if (flame > 0.05) {
            // The bloom rides the lantern cage, not the post's foot —
            // world-y offset divides the camera squash back out so the
            // glow lands on the raised fixture (the projAir law).
            this.glows.push({
              x: tx + 0.5,
              y: ty + 0.62 - 1.4 / this.camera.yScale,
              r: 1.3 * flick,
              rgb: '255, 205, 130',
              a: 0.28 * flame * flick,
            });
            this.lights.push({ x: tx + 0.5, y: ty + 0.5, r: 5 * flick, rgb: [255, 205, 135], intensity: 0.9 * flame * flick, occlude: true });
          }
        } else if (tile === Tile.Table) {
          // Table candles (the same hash roll the baked art deals) glow
          // from HERE, not from the tile painter: the table is a
          // run-ring baked prop, so its paint only runs on re-bake
          // frames and a glow queued there strobes at cadence rate.
          const h = hashCoords(41, tx, ty);
          if ((h >> 11) % 3 === 0 && flame > 0.05) {
            const flick = 0.85 + Math.sin(t * 11 + h) * 0.12 + Math.sin(t * 23 + h * 3) * 0.05;
            this.queueGlow(tx + 0.5, ty + 0.5, 0.9, '255, 196, 110', 0.22 * flame * flick);
          }
        } else if (tile === Tile.ChestMossy || tile === Tile.ChestBoss) {
          // A closed chest's promise: marsh-light seeping from the
          // mossgrown seam, ember-light from under the boss chest's
          // skull. Queued HERE, not in the painter — chests are
          // ring-baked props, and a glow queued inside a baked painter
          // strobes at cadence rate (the candle law). Goes dark the
          // moment the lid opens: an emptied chest has no light left.
          const hc = hashCoords(47, tx, ty);
          const pulse = 0.6 + Math.sin(t * 1.3 + hc) * 0.4;
          if (tile === Tile.ChestMossy) {
            this.queueGlow(tx + 0.5, ty + 0.42, 0.8, '120, 220, 190', 0.07 + 0.06 * pulse);
          } else {
            this.queueGlow(tx + 0.5, ty + 0.45, 0.9, '255, 130, 60', 0.1 + 0.08 * pulse);
          }
        } else if (tile === Tile.WallStoneWindow || tile === Tile.WallWoodWindow) {
          if (windowLights >= 24) continue;
          // Which side is indoors? The enclosed region claims it.
          let inside: readonly [number, number] | null = null;
          let region: InteriorRegion | null = null;
          for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
            const nt = game.world.groundAt(tx + d[0], ty + d[1]);
            if (nt === undefined || Renderer.WALL_TILES.has(nt)) continue;
            const r = this.interiors.regionAt(game, tx + d[0], ty + d[1]);
            if (r) {
              inside = d;
              region = r;
              break;
            }
          }
          if (!inside || !region) continue;
          windowLights++;
          if (flame > 0.05 && region.hasHearth) {
            // Hearthlight spills OUT of the pane after dark; the pool
            // sits south of the wall so its shadow never bites it.
            this.lights.push({
              x: tx + 0.5 - inside[0] * 1.4,
              y: ty + 0.5 - inside[1] * 1.4,
              r: 3,
              rgb: [255, 205, 135],
              intensity: 0.5 * flame,
            });
            if (inside[1] === -1) {
              // Only south-facing panes are painted — only they bloom.
              this.glows.push({
                x: tx + 0.5,
                y: ty + 0.55 - 1.15 / this.camera.yScale,
                r: 0.8,
                rgb: '255, 205, 130',
                a: 0.2 * flame,
              });
            }
          }
        }
      }
    }
    // THE DEEP DEMANDS MORE OF ITS FIRES: underground there is no sky
    // to help, so every standing pool reaches further and burns harder
    // — the readable band around a brazier is the whole difference
    // between a cave and a void — while the bloom TIGHTENS to the
    // emitter's core: the halo that washed over stall canopies was
    // bloom doing the lightmap's job, and down here the pool does it.
    const ug = this.ugBlend;
    if (ug > 0.01) {
      for (const L of this.lights) {
        L.r *= 1 + 0.3 * ug;
        L.intensity = Math.min(1, L.intensity * (1 + 0.2 * ug));
      }
      for (const g of this.glows) g.r *= 1 - 0.3 * ug;
      // THE CARRIED LANTERN: below ground the own hero always holds a
      // small warm light — enough to read the floor, the props and the
      // bodies around you, never enough to kill the dark's drama. It
      // breathes slowly (a flame in still air), joins the shadow
      // prepass like any pool, and fades in with the ambient blend.
      if (game.ownEid !== null) {
        const own = game.predictor.renderPos();
        const breathe = 0.93 + Math.sin(t * 2.1) * 0.05 + Math.sin(t * 5.7) * 0.02;
        this.lights.push({
          x: own.x,
          y: own.y,
          r: 4.6,
          rgb: [255, 213, 156],
          intensity: 0.5 * ug * breathe,
        });
      }
    }
  }

  /**
   * Emissive bloom: campfires, furnace mouths, portals, and magic bolts
   * pour additive light over the scene. Sold with plain radial
   * gradients under `lighter` compositing — no shader required.
   */
  private drawGlows(): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    if (this.glows.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.glows) {
      const p = this.liftedWTS(g.x, g.y);
      const r = g.r * s;
      const grad = ctx.createRadialGradient(p.x, p.y, r * 0.08, p.x, p.y, r);
      grad.addColorStop(0, `rgba(${g.rgb}, ${g.a})`);
      grad.addColorStop(0.55, `rgba(${g.rgb}, ${g.a * 0.38})`);
      grad.addColorStop(1, `rgba(${g.rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.restore();
    this.glows.length = 0;
  }

  /**
   * A magic projectile (or totem, or spark) advertises its own glow.
   * After dark the same source also lights the ground around it — a
   * bolt streaking across a night field carries its own pool of light.
   */
  queueGlow(x: number, y: number, r: number, rgb: string, a: number): void {
    if (this.bakingMask) return;
    this.glows.push({ x, y, r, rgb, a });
    if (this.sky.darkness > 0.04) {
      const [rr = 255, gg = 255, bb = 255] = rgb.split(',').map((v) => Number.parseInt(v, 10));
      const intensity = Math.min(0.55, a * 1.6);
      this.lights.push({ x, y, r: r * 1.6, rgb: [rr, gg, bb], intensity });
      this.nextDynamic.push({ x, y, r: r * 2.2, a: intensity });
    }
  }

  /** 1/3-res frame copy backing the tilt-shift (bilinear up IS the blur). */
  private readonly tiltScratch = document.createElement('canvas');
  private readonly tiltScratchCtx = this.tiltScratch.getContext('2d')!;

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
  private static readonly TILT_BANDS: ReadonlyArray<readonly [number, number, number]> = [
    // [yFrac, hFrac, alpha] — top three bands, bottom two.
    [0, 0.1, 0.8],
    [0.08, 0.07, 0.5],
    [0.14, 0.05, 0.24],
    [0.88, 0.06, 0.34],
    [0.93, 0.07, 0.65],
  ];

  private applyTiltShift(): void {
    const ctx = this.ctx;
    const sw = Math.max(1, Math.ceil(this.w / 3));
    const sh = Math.max(1, Math.ceil(this.h / 3));
    if (this.tiltScratch.width !== sw || this.tiltScratch.height !== sh) {
      this.tiltScratch.width = sw;
      this.tiltScratch.height = sh;
    }
    const sc = this.tiltScratchCtx;
    sc.imageSmoothingEnabled = true;
    sc.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, sw, sh);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const [yF, hF, alpha] of Renderer.TILT_BANDS) {
      const y = yF * this.h;
      const bandH = hF * this.h;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        this.tiltScratch,
        0,
        (y / this.h) * sh,
        sw,
        (bandH / this.h) * sh,
        0,
        y,
        this.w,
        bandH,
      );
    }
    ctx.restore();
  }

  /**
   * Color grade: the "curated camera" over the raw painter output,
   * and it tells the time. The horizon haze burns orange at dawn and
   * dusk and sinks to indigo at night; the warm top-light lives and
   * dies with the sun; the vignette closes in after dark.
   */
  private drawGrade(): void {
    const ctx = this.ctx;
    const day = this.sky;
    // Atmospheric haze: the far field washes toward the hour's sky at
    // the top of the frame — the horizon you feel from a low camera.
    const [hr, hg, hb] = day.sky;
    const ha = day.skyAlpha;
    const sky = ctx.createLinearGradient(0, 0, 0, this.h * 0.34);
    sky.addColorStop(0, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha})`);
    sky.addColorStop(0.5, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, ${ha * 0.38})`);
    sky.addColorStop(1, `rgba(${hr | 0}, ${hg | 0}, ${hb | 0}, 0)`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h * 0.34);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    // Underground the grade stands down: the cool bottom-wash and the
    // closing vignette were both stacking MORE dark on a scene the
    // cave ambient already darkened — the lightmap owns that mood now.
    const ugEase = 1 - 0.55 * this.ugBlend;
    const warm = 0.36 * (0.2 + 0.8 * day.sun);
    const cool = (0.3 + 0.18 * day.darkness) * ugEase;
    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, `rgba(255, 214, 150, ${warm})`);
    grad.addColorStop(0.45, `rgba(255, 236, 210, ${warm * 0.28})`);
    grad.addColorStop(1, `rgba(64, 84, 148, ${cool})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
    const vig = ctx.createRadialGradient(
      this.w / 2,
      this.h * 0.46,
      Math.min(this.w, this.h) * 0.42,
      this.w / 2,
      this.h * 0.5,
      Math.max(this.w, this.h) * 0.72,
    );
    vig.addColorStop(0, 'rgba(20, 12, 28, 0)');
    vig.addColorStop(1, `rgba(20, 12, 28, ${(0.26 + 0.14 * day.darkness) * (1 - 0.45 * this.ugBlend)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  /**
   * While the bow is drawn, a dotted guide extends along the aim showing
   * how far the arrow will fly at the current charge — it grows and
   * firms up as the draw deepens. Essential for right-stick aiming.
   */
  private drawAimGuide(game: ClientGame): void {
    const drawT = game.ownDrawT;
    if (drawT <= 0 || game.ownEid === null) return;
    const weapon = game.equipment.weapon ? itemDef(game.equipment.weapon.id)?.weapon : undefined;
    if (!weapon) return;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const own = game.predictor.renderPos();
    // The guide lives on the ground plane: both ends are projected
    // through the camera, so it lands exactly where arrows land.
    const rangeT = weapon.range * (0.55 + 0.45 * drawT);
    const dirX = Math.cos(game.aim);
    const dirY = Math.sin(game.aim);
    const p0 = this.liftedWTS(own.x + dirX * 0.55, own.y + dirY * 0.55);
    const p1 = this.liftedWTS(own.x + dirX * rangeT, own.y + dirY * rangeT);
    const lift0 = 0.45 * s;
    const lift1 = lift0;

    ctx.save();
    ctx.setLineDash([0.12 * s, 0.14 * s]);
    ctx.strokeStyle = `rgba(244, 239, 228, ${0.16 + 0.3 * drawT})`;
    ctx.lineWidth = Math.max(1.5, 0.035 * s);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - lift0);
    ctx.lineTo(p1.x, p1.y - lift1);
    ctx.stroke();
    ctx.setLineDash([]);
    // Range chevron at the arrow's terminal point.
    const cx = p1.x;
    const cy = p1.y - lift1;
    const dSx = p1.x - p0.x;
    const dSy = p1.y - lift1 - (p0.y - lift0);
    const dLen = Math.hypot(dSx, dSy) || 1;
    const ux = dSx / dLen;
    const uy = dSy / dLen;
    ctx.strokeStyle = `rgba(232, 182, 76, ${0.35 + 0.5 * drawT})`;
    ctx.lineWidth = Math.max(2, 0.05 * s);
    ctx.beginPath();
    ctx.moveTo(cx - ux * 0.14 * s - uy * 0.12 * s, cy - uy * 0.14 * s + ux * 0.12 * s);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - ux * 0.14 * s + uy * 0.12 * s, cy - uy * 0.14 * s - ux * 0.12 * s);
    ctx.stroke();
    ctx.restore();
  }

  /** Expanding impact rings — crisp stroked circles, quick and gone. */
  private drawRings(): void {
    // Impact ripples LIE ON THE GROUND: perspective-squashed ellipses,
    // layered deep-under-bright so the shock reads as a pressure front
    // rolling over the turf, not a circle stamped on the screen.
    const ctx = this.ctx;
    const now = performance.now();
    const LIFE = 300;
    const squash = Renderer.FX_SQUASH;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      const age = now - ring.bornAt;
      if (age > LIFE) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = age / LIFE;
      const p = this.liftedWTS(ring.x, ring.y);
      const ease = 1 - (1 - t) * (1 - t);
      const rr = ring.maxR * this.camera.scale * (0.25 + 0.75 * ease);
      // The dark pressure band trails just inside the bright front.
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.strokeStyle = shade(ring.color, -38);
      ctx.lineWidth = Math.max(2.5, this.camera.scale * 0.1 * (1 - t));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rr * 0.88, rr * 0.88 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1.5, this.camera.scale * 0.06 * (1 - t));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

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
  private drawLevelCeremony(game: ClientGame): void {
    const fx = this.levelFx;
    if (!fx) return;
    const now = performance.now();
    const t = now - fx.t0;
    if (t > Renderer.LEVEL_FX_MS) {
      this.levelFx = null;
      return;
    }
    const own = game.predictor.renderPos();
    const ctx = this.ctx;
    const s = this.camera.scale;
    const squash = Renderer.FX_SQUASH;
    // In fast, out slow: the show lands hard and leaves politely.
    const env =
      Math.min(1, t / 240) *
      (t > 4200 ? Math.max(0, 1 - (t - 4200) / (Renderer.LEVEL_FX_MS - 4200)) : 1);

    // The world answers: lightmap punch + bloom around the player.
    this.queueGlow(own.x, own.y - 0.55, 1.5, fx.glowRgb, 0.32 * env);

    // The fountain: gold motes climb and flicker, accent shards leap
    // and tumble back down. Budgeted by frameDt (hitstop slows it too).
    if (t < 4200) {
      fx.emitCarry += this.frameDt * 26;
      while (fx.emitCarry >= 1) {
        fx.emitCarry -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = 0.15 + Math.random() * 0.4;
        const px = own.x + Math.cos(a) * r;
        const py = own.y + Math.sin(a) * r * squash;
        if (Math.random() < 0.6) {
          this.particles.burst(px, py, 1, ['#ffe9a8', '#f2c94c', '#e8b64c'], {
            speed: 1.5,
            life: 1.6,
            up: true,
            gravity: -1.4,
            drag: 1.1,
            size: 0.07,
            flicker: 0.7,
          });
        } else {
          this.particles.burst(px, py, 1, [fx.accentLit, fx.accent], {
            speed: 2.4,
            life: 1.1,
            up: true,
            gravity: 2.6,
            shape: 'shard',
            spin: 7,
            size: 0.1,
          });
        }
      }
    }

    // Slow majestic ground rings — the pressure-front dialect of
    // drawRings, but each front takes a full second to roll out.
    if (t >= fx.nextRingAt && t < 3900) {
      fx.ringAt.push(now);
      fx.nextRingAt = t + 820;
    }
    const RLIFE = 1050;
    const p = this.liftedWTS(own.x, own.y);
    for (let i = fx.ringAt.length - 1; i >= 0; i--) {
      const age = now - fx.ringAt[i]!;
      if (age > RLIFE) {
        fx.ringAt.splice(i, 1);
        continue;
      }
      const rt = age / RLIFE;
      const ease = 1 - (1 - rt) * (1 - rt);
      const rr = s * (0.35 + 1.4 * ease);
      ctx.globalAlpha = (1 - rt) * 0.4 * env;
      ctx.strokeStyle = fx.accentDeep;
      ctx.lineWidth = Math.max(2.5, s * 0.11 * (1 - rt));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rr * 0.88, rr * 0.88 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - rt) * 0.8 * env;
      ctx.strokeStyle = rt < 0.5 ? '#f2c94c' : fx.accentLit;
      ctx.lineWidth = Math.max(1.5, s * 0.06 * (1 - rt));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The pillar of light: three nested flat bands, additive, rising
    // out of the crack in half a second and breathing while it holds.
    const rise = Math.min(1, t / 460);
    const easeRise = 1 - (1 - rise) * (1 - rise) * (1 - rise);
    const h = s * 3.0 * easeRise * (1 + 0.03 * Math.sin(t * 0.006));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // The pool of light at the base.
    ctx.globalAlpha = 0.13 * env;
    ctx.fillStyle = fx.accent;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s * 0.62, s * 0.62 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.16 * env;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s * 0.34, s * 0.34 * squash, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let b = 0; b < 3; b++) {
      const w = [s * 0.52, s * 0.3, s * 0.13][b]!;
      ctx.globalAlpha = [0.09, 0.15, 0.28][b]! * env;
      ctx.fillStyle = [fx.accent, '#f2c94c', '#fff3d0'][b]!;
      ctx.beginPath();
      ctx.moveTo(p.x - w / 2, p.y);
      ctx.lineTo(p.x - w * 0.28, p.y - h);
      ctx.lineTo(p.x + w * 0.28, p.y - h);
      ctx.lineTo(p.x + w / 2, p.y);
      ctx.closePath();
      ctx.fill();
    }

    // Four sparks spiral up the pillar, shedding streaks as they go.
    for (let i = 0; i < 4; i++) {
      const climb = (t * 0.00042 + i * 0.25) % 1;
      const ang = t * 0.004 + i * (Math.PI / 2);
      const orbR = s * 0.6 * (1 - climb * 0.55);
      const sx = p.x + Math.cos(ang) * orbR;
      const sy = p.y - climb * h + Math.sin(ang) * orbR * squash * 0.3;
      const d = s * 0.07 * (1 - climb * 0.4);
      ctx.globalAlpha = env * (climb < 0.12 ? climb / 0.12 : 1 - climb * 0.6);
      ctx.fillStyle = i % 2 === 0 ? '#ffe9a8' : fx.accentLit;
      ctx.beginPath();
      ctx.moveTo(sx, sy - d);
      ctx.lineTo(sx + d, sy);
      ctx.lineTo(sx, sy + d);
      ctx.lineTo(sx - d, sy);
      ctx.closePath();
      ctx.fill();
      if (Math.random() < this.frameDt * 4 && env > 0.3) {
        this.particles.burst(own.x + (sx - p.x) / s, own.y + (sy - p.y) / s, 1, ['#ffe9a8'], {
          speed: 0.8,
          life: 0.5,
          gravity: 1.5,
          shape: 'streak',
          size: 0.05,
        });
      }
    }

    // The crown: a wheeling four-point star at the pillar's head.
    if (easeRise > 0.85) {
      const rot = t * 0.0035;
      const starR = s * 0.3 * (1 + 0.1 * Math.sin(t * 0.011));
      const cy = p.y - h;
      for (let pass = 0; pass < 2; pass++) {
        const rad = pass === 0 ? starR : starR * 0.55;
        ctx.globalAlpha = (pass === 0 ? 0.35 : 0.85) * env;
        ctx.fillStyle = pass === 0 ? fx.accentLit : '#fff3d0';
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a0 = rot + (k * Math.PI) / 2;
          const a1 = a0 + Math.PI / 4;
          const ox = p.x + Math.cos(a0) * rad;
          const oy = cy + Math.sin(a0) * rad;
          if (k === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(p.x + Math.cos(a1) * rad * 0.34, cy + Math.sin(a1) * rad * 0.34);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // The farewell: one last accent ring and a soft settle of motes.
    if (t >= 4300 && !fx.finaleDone) {
      fx.finaleDone = true;
      this.addRing(own.x, own.y, fx.accentLit, 1.3);
      this.particles.burst(own.x, own.y - 0.6, 14, ['#ffe9a8', '#f2c94c', fx.accentLit], {
        speed: 1.2,
        life: 1.4,
        gravity: -0.6,
        drag: 1.2,
        size: 0.06,
        flicker: 0.6,
      });
    }
  }

  /** Hard red edge bands when the local player is hurt. */
  private drawVignette(): void {
    const remaining = this.vignetteUntil - performance.now();
    if (remaining <= 0) return;
    const ctx = this.ctx;
    const a = Math.min(1, remaining / 320) * 0.32;
    const band = Math.max(10, this.w * 0.025);
    ctx.fillStyle = `rgba(196, 60, 40, ${a})`;
    ctx.fillRect(0, 0, this.w, band);
    ctx.fillRect(0, this.h - band, this.w, band);
    ctx.fillRect(0, band, band, this.h - band * 2);
    ctx.fillRect(this.w - band, band, band, this.h - band * 2);
  }

  private detailAt(game: ClientGame, tx: number, ty: number): number {
    const chunk = game.world.get(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    if (!chunk) return 0;
    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.detail[ly * CHUNK_SIZE + lx] ?? 0;
  }

  // ------------------------------------------------------------ ground

  private visibleTileBounds(): { minTx: number; maxTx: number; minTy: number; maxTy: number } {
    const s = this.camera.scale;
    return {
      // These are the GROUND bounds: modest pads for flat content.
      // Tall content adds its own class pad on top (TREE_PAD_S/X,
      // PROP_PAD_S, LIGHT_PAD, the elevated-ground south pad) — never
      // widen these shared pads for one tall class, every consumer
      // pays for the extra rows (the grass pass even shrinks them).
      minTx: Math.floor(this.camera.x - this.w / 2 / s) - 2,
      maxTx: Math.floor(this.camera.x + this.w / 2 / s) + 2,
      minTy: Math.floor(this.camera.y - this.h / 2 / (s * this.camera.yScale)) - 5,
      maxTy: Math.floor(this.camera.y + this.h / 2 / (s * this.camera.yScale)) + 2,
    };
  }

  /**
   * Bake resolution follows the zoom tier: past ~1.05× the 32px bakes
   * would upscale into mush, so chunks re-bake at 64px/tile. Keyed off
   * targetZoom (not the gliding zoom) so a zoom flips the tier once.
   */
  private bakePx(): number {
    return this.camera.targetZoom > 1.05 ? TILE_PX * 2 : TILE_PX;
  }

  private drawGroundChunks(game: ClientGame): void {
    const s = this.camera.scale;
    const b = this.visibleTileBounds();
    const minCx = Math.floor(b.minTx / CHUNK_SIZE);
    const maxCx = Math.floor(b.maxTx / CHUNK_SIZE);
    const minCy = Math.floor(b.minTy / CHUNK_SIZE);
    const maxCy = Math.floor(b.maxTy / CHUNK_SIZE);
    const bakePx = this.bakePx();
    // ALL bake work is TIME-SLICED (see startChunkBake): a full chunk
    // bake is 10-40ms, so nothing here ever runs one whole inside a
    // frame. The visible loop only DISCOVERS work — brand-new chunks
    // get a job whose placeholder canvas blits immediately (meadow
    // base, then material layers, then detail bands sweep in over a
    // few frames), while content/res re-bakes build into a fresh
    // canvas behind the old blit and swap at completion. The budget
    // loop after the blits advances every queued job against ONE
    // per-frame time budget.
    this.chunkJobQueue.length = 0;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const data = game.world.get(cx, cy);
        if (!data) continue;
        const key = `${cx},${cy}`;
        let baked = this.baked.get(key);
        if (!baked) {
          // Brand-new chunk: start a live job — the placeholder blits
          // this same frame, so streaming never leaves a hole.
          baked = this.startChunkEntry(game, cx, cy, data, bakePx, true);
        } else if (baked.pending) {
          // Mid-bake: if the world moved on underneath, restart the
          // job at the new content — never finish a stale bake.
          const p = baked.pending;
          if (p.data !== data || p.rev !== (data.rev ?? 0)) {
            this.startChunkReplace(baked, game, cx, cy, data, bakePx);
          }
        } else if (baked.data !== data || baked.rev !== (data.rev ?? 0)) {
          // Content re-bake behind the old blit.
          this.startChunkReplace(baked, game, cx, cy, data, bakePx);
        } else if (baked.px !== bakePx && !this.zoomGliding) {
          // Tier flips wait out the glide: bakePx is keyed off
          // targetZoom, so mid-glide re-bakes render for a scale the
          // camera hasn't reached — and the settle pass would just
          // re-blit them anyway.
          this.startChunkReplace(baked, game, cx, cy, data, bakePx);
        }
        if (baked.pending) this.chunkJobQueue.push(baked);
        // SHARED-CORNER SNAP LAW: each chunk's destination rect comes
        // from rounding its corner projections — the same corner a
        // neighbor rounds to the same integer, so adjacent blits share
        // pixel edges EXACTLY. A float destination antialiases its edge
        // rows to partial alpha and a hairline seam shows at chunk
        // boundaries; a "+0.5 overdraw" only hides gaps, not the
        // half-covered darkened edge pixels.
        const p0 = this.camera.worldToScreen(cx * CHUNK_SIZE, cy * CHUNK_SIZE, this.w, this.h);
        const p1 = this.camera.worldToScreen((cx + 1) * CHUNK_SIZE, (cy + 1) * CHUNK_SIZE, this.w, this.h);
        const x0 = Math.round(p0.x);
        const y0 = Math.round(p0.y);
        this.ctx.imageSmoothingEnabled = true;
        // Chunks are baked square and drawn uniformly foreshortened —
        // the ground compresses evenly while heights stay full. The
        // source rect is inset by the bake gutter, so edge filtering
        // samples real neighbor content, never a transparent canvas
        // edge (the old hairline-seam bug).
        const gut = bakeGutter(baked.px);
        const srcSz = CHUNK_SIZE * baked.px;
        this.ctx.drawImage(
          baked.canvas,
          gut,
          gut,
          srcSz,
          srcSz,
          x0,
          y0,
          Math.round(p1.x) - x0,
          Math.round(p1.y) - y0,
        );
      }
    }
    // PRE-BAKE RING: chunks one step outside the viewport bake (one
    // per frame) BEFORE they scroll in. Interest radius 2 streams
    // their data well ahead, so a ring job is nearly always COMPLETE
    // by the time its chunk crosses the view edge. Ring jobs join the
    // same budgeted queue as visible work, behind it in priority.
    ring: for (let cy = minCy - 1; cy <= maxCy + 1; cy++) {
      for (let cx = minCx - 1; cx <= maxCx + 1; cx++) {
        if (cx >= minCx && cx <= maxCx && cy >= minCy && cy <= maxCy) continue;
        const data = game.world.get(cx, cy);
        if (!data) continue;
        const key = `${cx},${cy}`;
        const baked = this.baked.get(key);
        if (!baked) {
          const entry = this.startChunkEntry(game, cx, cy, data, bakePx, true);
          this.chunkJobQueue.push(entry);
          break ring; // one new ring job per frame is plenty of lead
        }
        if (baked.pending) {
          this.chunkJobQueue.push(baked);
        } else if (baked.data !== data || baked.rev !== (data.rev ?? 0)) {
          this.startChunkReplace(baked, game, cx, cy, data, bakePx);
          this.chunkJobQueue.push(baked);
          break ring;
        }
      }
    }

    // THE BAKE BUDGET: advance queued jobs (visible first — the queue
    // was filled in scan order, ring work appended last) until the
    // per-frame slice budget is spent. At least one step always runs
    // when work exists, so progress is guaranteed even if a single
    // step overruns the budget (a hi-res detail band can).
    let msLeft = CHUNK_BAKE_MS;
    for (const entry of this.chunkJobQueue) {
      while (entry.pending && msLeft > 0) {
        const t0 = performance.now();
        this.advanceChunkPending(entry);
        msLeft -= performance.now() - t0;
      }
      if (msLeft <= 0) break;
    }
  }

  /**
   * Start a sliced bake for a chunk with no cache entry. `live` jobs
   * blit their in-progress canvas (brand-new ground shows its meadow
   * placeholder immediately, then sweeps in detail); the entry is
   * cached and returned with `pending` set.
   */
  private startChunkEntry(
    game: ClientGame,
    cx: number,
    cy: number,
    data: NonNullable<ReturnType<ClientGame['world']['get']>>,
    bakePx: number,
    live: boolean,
  ): BakedChunk {
    const pending = this.buildChunkPending(game, cx, cy, data, bakePx, live);
    const baked: BakedChunk = {
      canvas: pending.job.canvas,
      data,
      rev: data.rev ?? 0,
      px: bakePx,
      lifted: [],
      pending,
    };
    this.baked.set(`${cx},${cy}`, baked);
    return baked;
  }

  /**
   * Start a sliced RE-bake behind an existing entry: the old canvas
   * keeps blitting (stale content over a hole every time) and the
   * finished job swaps in atomically at completion.
   */
  private startChunkReplace(
    entry: BakedChunk,
    game: ClientGame,
    cx: number,
    cy: number,
    data: NonNullable<ReturnType<ClientGame['world']['get']>>,
    bakePx: number,
  ): void {
    entry.pending = this.buildChunkPending(game, cx, cy, data, bakePx, false);
  }

  /** The shared job body: terrain steps + one step per elevation level. */
  private buildChunkPending(
    game: ClientGame,
    cx: number,
    cy: number,
    data: NonNullable<ReturnType<ClientGame['world']['get']>>,
    bakePx: number,
    live: boolean,
  ): NonNullable<BakedChunk['pending']> {
    const ground = (tx: number, ty: number) => game.world.groundAt(tx, ty);
    const detail = (tx: number, ty: number) => this.detailAt(game, tx, ty);
    const elev = (tx: number, ty: number) => game.world.elevAt(tx, ty);
    // Floorboards are cut from their building's wood: resolve the
    // room a plank tile belongs to (wallRegion fallback covers the
    // substituted strip that runs under the walls themselves).
    const woodSkin = (tx: number, ty: number) =>
      this.woodSkinFor(this.interiors.regionAt(game, tx, ty) ?? this.wallRegion(game, tx, ty));
    let maxLevel = 0;
    let minLevel = 0;
    for (let i = 0; i < data.elev.length; i++) {
      const e = data.elev[i]!;
      if (e > maxLevel) maxLevel = e;
      if (e < minLevel) minLevel = e;
    }
    // Levels bake in ASCENDING order — same-row crown items tie
    // on sortY and rely on stable sort, so 0 must paint over −1's
    // down-shifted spill, −1 over −2's. A chunk without pits
    // skips the level-0 layer entirely: the flat base blit is it.
    const levels: number[] = [];
    for (let level = minLevel; level <= maxLevel; level++) {
      if (level === 0 && minLevel >= 0) continue;
      levels.push(level);
    }
    return {
      job: startChunkBake(ground, detail, elev, cx, cy, bakePx, woodSkin),
      levels,
      lifted: [],
      live,
      data,
      rev: data.rev ?? 0,
      px: bakePx,
      bakeElev: (level: number) => bakeElevated(ground, detail, elev, cx, cy, bakePx, level),
    };
  }

  /** Run ONE slice of a pending chunk bake; finalize when done. */
  private advanceChunkPending(entry: BakedChunk): void {
    const p = entry.pending!;
    if (p.job.next < p.job.steps.length) {
      stepChunkBake(p.job);
      if (p.job.next < p.job.steps.length || p.levels.length > 0) return;
    } else if (p.levels.length > 0) {
      const level = p.levels.shift()!;
      const bake = p.bakeElev(level);
      if (bake) {
        // Contiguous row runs, merged across small gaps, padded one
        // row each way for the half-tile contour bleed.
        const bands: Array<[number, number]> = [];
        for (let r = 0; r < CHUNK_SIZE; r++) {
          if (!bake.rows[r]) continue;
          const last = bands[bands.length - 1];
          if (last && r - last[1] <= 3) last[1] = r;
          else bands.push([r, r]);
        }
        for (const band of bands) {
          band[0] = Math.max(0, band[0] - 1);
          band[1] = Math.min(CHUNK_SIZE - 1, band[1] + 1);
        }
        p.lifted.push({ level, canvas: bake.canvas, bands });
      }
      if (p.levels.length > 0) return;
    }
    // Complete: swap the finished bake into the entry.
    entry.canvas = p.job.canvas;
    entry.lifted = p.lifted;
    entry.data = p.data;
    entry.rev = p.rev;
    entry.px = p.px;
    entry.pending = undefined;
  }

  private evictBaked(): void {
    // Hi-res bakes are 4× the pixels — keep far fewer of them around.
    const hiRes = this.bakePx() > TILE_PX;
    const cap = hiRes ? 28 : 80;
    if (this.baked.size <= cap) return;
    const ccx = this.camera.x / CHUNK_SIZE;
    const ccy = this.camera.y / CHUNK_SIZE;
    for (const [key] of this.baked) {
      const [cx, cy] = key.split(',').map(Number);
      if (Math.abs(cx! - ccx) > 4 || Math.abs(cy! - ccy) > 4) this.baked.delete(key);
      if (this.baked.size <= (hiRes ? 20 : 60)) break;
    }
  }

  private evictAnims(): void {
    if (this.anims.size < 200) return;
    const cutoff = performance.now() - 10_000;
    for (const [key, anim] of this.anims) {
      if (anim.lastSeen < cutoff) this.anims.delete(key);
    }
  }

  /**
   * Tree sprite/shadow caches ride the camera: drop entries not drawn
   * for ~2s (scrolled away), and under a hard cap drop the coldest —
   * a zoomed-in sprite is big (~0.4MB), so the cap is what bounds
   * worst-case memory, not the typical count.
   */
  private evictTreeSprites(): void {
    const cutoff = this.frameNo - 240;
    for (const [key, sp] of this.treeSprites) {
      if (sp.used < cutoff) {
        this.treeSprites.delete(key);
        if (this.spriteCanvasPool.length < 40) this.spriteCanvasPool.push(sp.canvas);
      }
    }
    for (const [key, sh] of this.treeShadows) {
      if (sh.used < cutoff) this.treeShadows.delete(key);
    }
    // Cap raised for the prop ring cache: a dense forest (310 trees +
    // forage) plus a prop-heavy town in the same walk must both fit.
    if (this.treeSprites.size > 640) {
      for (const [key, sp] of this.treeSprites) {
        if (sp.used < this.frameNo - 2) {
          this.treeSprites.delete(key);
          if (this.spriteCanvasPool.length < 40) this.spriteCanvasPool.push(sp.canvas);
        }
        if (this.treeSprites.size <= 560) break;
      }
    }
    // Body sprites ride the interest radius: entities leave, corpses
    // rot — drop composites unseen for ~2s, canvases back to the pool.
    for (const [key, sp] of this.bodySprites) {
      if (sp.used < cutoff) {
        this.bodySprites.delete(key);
        if (this.spriteCanvasPool.length < 40) this.spriteCanvasPool.push(sp.canvas);
      }
    }
    if (this.bodySprites.size > 200) {
      for (const [key, sp] of this.bodySprites) {
        if (sp.used < this.frameNo - 2) {
          this.bodySprites.delete(key);
          if (this.spriteCanvasPool.length < 40) this.spriteCanvasPool.push(sp.canvas);
        }
        if (this.bodySprites.size <= 160) break;
      }
    }
  }

  /**
   * Movement/turn tracker for the body-sprite cache: a body is
   * "dynamic" while its position or facing changes and for
   * OL_COOL_FRAMES after — leg settles, facing eases and pose blends
   * finish at full rate before the idle cadence takes over.
   */
  private bodyMotion(anim: AnimState, x: number, y: number, dir: number): boolean {
    if (anim.olX !== x || anim.olY !== y || anim.olDir !== dir) {
      anim.olX = x;
      anim.olY = y;
      anim.olDir = dir;
      anim.olCoolUntil = this.frameNo + OL_COOL_FRAMES;
    }
    return this.frameNo < (anim.olCoolUntil ?? 0);
  }

  /** Content signature for an appearance object (equip/ench/look) —
   *  computed once per object IDENTITY and cached in a WeakMap, so a
   *  server that re-sends an identical appearance object every tick
   *  (actors do) still yields a STABLE signature. Never use raw
   *  identity ids here: a churning identity re-baked one body every
   *  frame forever (caught live on a Bramblewick actor). */
  private olObjSig(o: object | undefined): string {
    if (o === undefined) return '';
    let sig = this.olObjSigs.get(o);
    if (sig === undefined) {
      sig = JSON.stringify(o);
      this.olObjSigs.set(o, sig);
    }
    return sig;
  }

  /** Stable id per long-lived record (corpses) — a cache KEY, where
   *  identity is exactly right; never use for signature content. */
  private olObjId(o: object): number {
    let id = this.olObjIds.get(o);
    if (id === undefined) {
      id = this.olObjSeq++;
      this.olObjIds.set(o, id);
    }
    return id;
  }

  // ------------------------------------------------------- raised tiles

  /** Wall-run auto-tiler membership — shared law (tiles.ts). */
  private static readonly WALL_TILES = new Set<number>(WALL_RUN_TILES);

  /** Every WALL doorway tile — open and shut, both orientations and
   *  widths. Fence gates are doors on the wire (locks, occupancy,
   *  auto-close all ride DOOR_INFO) but they are fence props to the
   *  renderer — kept OUT of this set so the wall-doorway pipeline
   *  (side-notch law, wide merges, veil, wallish) never sees them. */
  private static readonly DOOR_TILES = new Set<number>(
    [...DOOR_TILES].filter((t) => doorInfo(t)!.material !== 'fence'),
  );

  /** Man-made ground the wall reveal counts as "a room to see into":
   *  the surface gate for both the player's feet (shelter) and the
   *  floor a wall fronts. Deliberately excludes Bridge (docks stay
   *  neutral) and natural ground — a garden wall on grass keeps its
   *  facade; underground skips this gate entirely (cave floor is the
   *  only floor there is). */
  private static readonly REVEAL_FLOORS = new Set<number>([
    Tile.WoodFloor,
    Tile.StoneFloor,
    Tile.CaveFloor,
    Tile.DungeonFloor,
    Tile.CaveRubble,
  ]);

  /**
   * SIDE-DOORWAY LAW: a doorway's orientation comes from the wall run
   * it pierces. Wall (or same-doorway run) north AND south with open
   * ground east/west = a SIDE doorway — you walk through it east-west.
   * Anything else keeps the classic south-facing frame.
   */
  private isSideDoorway(game: ClientGame, tx: number, ty: number): boolean {
    const t = game.world.groundAt(tx, ty);
    if (t === undefined || !Renderer.DOOR_TILES.has(t)) return false;
    const solidWall = (tt: number | undefined): boolean =>
      tt !== undefined && Renderer.WALL_TILES.has(tt) && !Renderer.DOOR_TILES.has(tt);
    const along = (tt: number | undefined): boolean => solidWall(tt) || tt === t;
    const vert =
      along(game.world.groundAt(tx, ty - 1)) && along(game.world.groundAt(tx, ty + 1));
    const horiz =
      along(game.world.groundAt(tx + 1, ty)) && along(game.world.groundAt(tx - 1, ty));
    return vert && !horiz;
  }

  /**
   * Wall-run neighbour test that ENDS runs at side doorways. A wall
   * north of a side door must show its face (the jamb) and a wall
   * south of one must restart with chamfered crown — merging straight
   * over the opening is exactly what made side doors read as seamless
   * wall. South-facing doorways still merge (their frame carries the
   * run through the opening).
   */
  private wallish(game: ClientGame, tx: number, ty: number): boolean {
    const t = game.world.groundAt(tx, ty);
    if (t === undefined || !Renderer.WALL_TILES.has(t)) return false;
    return !(Renderer.DOOR_TILES.has(t) && this.isSideDoorway(game, tx, ty));
  }
  /** What stops lamplight — shared law (tiles.ts). */
  private static readonly LIGHT_BLOCKERS = new Set<number>(LIGHT_BLOCKING_TILES);
  /** The stone plinth every timber wall stands on. */
  private static readonly PLINTH_COL = '#6e6779';

  /**
   * The wood skin a wall/doorway tile wears (building-keyed — see
   * woodSkins.ts, shared with the floor-plank bake in terrain.ts).
   */
  private woodSkinFor(region: InteriorRegion | null): WoodSkin {
    return dealWoodSkin(region);
  }

  private collectRaisedTiles(game: ClientGame, items: DrawItem[]): void {
    const b = this.visibleTileBounds();
    // Run-merged furniture components already emitted this frame,
    // keyed by anchor tile.
    const runSeen = new Set<number>();
    // Tall-content pads (see TREE_PAD_S/TREE_PAD_X/PROP_PAD_S): rows
    // up to PROP_PAD_S past the shared bounds scan everything (walls
    // and stations are ~2.2 tiles tall — their crowns reach 3.7 rows
    // up-screen); rows beyond that, and the side columns past ±1, scan
    // for tree/portal tiles only — a 7-tile tree pokes its crown into
    // view from ~12 rows south, and a ~4-tile-wide canopy reaches in
    // from 4 columns past the side edges.
    for (let ty = b.minTy; ty <= b.maxTy + TREE_PAD_S; ty++) {
      const deepSouth = ty > b.maxTy + PROP_PAD_S;
      for (let tx = b.minTx - 1 - TREE_PAD_X; tx <= b.maxTx + 1 + TREE_PAD_X; tx++) {
        const ground = game.world.groundAt(tx, ty);
        if (ground === undefined) continue;
        // Deep-south rows and side columns admit trees + portals only:
        // the Riftgate stands ~2 tiles tall, so its crown pokes into
        // view like a low tree.
        const sideBand = tx < b.minTx - 1 || tx > b.maxTx + 1;
        if (
          (deepSouth || sideBand) &&
          !TREE_TILES.has(ground as Tile) &&
          ground !== Tile.PortalDown &&
          ground !== Tile.PortalUp
        )
          continue;
        if (ground === Tile.Cliff) continue; // faces come from collectCliffFaces
        if (ground === Tile.Ramp) {
          items.push(this.rampItem(tx, ty, game));
          const landing = this.rampLandingItem(tx, ty, game);
          if (landing) items.push(landing);
          const apron = this.rampApronItem(tx, ty, game);
          if (apron) items.push(apron);
          continue;
        }
        // Structural vocabulary routes before the generic wall/object
        // paths: doorways are IN the wall-run set (so neighbours merge
        // with them) but draw their own framed opening, and pillars/
        // rails/arches are raised or walkable tiles with bespoke items.
        if (Renderer.DOOR_TILES.has(ground)) {
          const dinfo = doorInfo(ground)!;
          // SIDE-DOORWAY LAW: a doorway in a N-S wall run is edge-on
          // to this camera — it gets the notch/lintel/porch-step
          // treatment instead of the (invisible) south-facing frame.
          // Wide side doorways merge along the wall: N-S runs.
          if (this.isSideDoorway(game, tx, ty)) {
            let ay = ty;
            let vLen = 1;
            if (dinfo.wide) {
              while (game.world.groundAt(tx, ay - 1) === ground) ay--;
              while (game.world.groundAt(tx, ay + vLen) === ground) vLen++;
              const vKey = packTile(tx, ay);
              if (runSeen.has(vKey)) continue;
              runSeen.add(vKey);
            }
            this.sideDoorwayItems(ground, tx, ay, game, vLen, items);
            continue;
          }
          // WIDE-DOORWAY RUN LAW: adjacent wide tiles in an E-W run
          // merge into ONE full-width opening — walk to the run's west
          // anchor and emit once (runSeen dedupes, and walking west
          // catches runs whose anchor sits outside the viewport pad).
          // Plain doorways never merge: two singles side by side stay
          // two framed doors on purpose. Open and shut wide tiles never
          // mix mid-run — the server flips a unit atomically — so the
          // same-tile equality walk still finds the whole opening.
          let ax = tx;
          let runLen = 1;
          if (dinfo.wide) {
            while (game.world.groundAt(ax - 1, ty) === ground) ax--;
            while (game.world.groundAt(ax + runLen, ty) === ground) runLen++;
            const runKey = packTile(ax, ty);
            if (runSeen.has(runKey)) continue;
            runSeen.add(runKey);
          }
          const dregion = this.wallRegion(game, ax, ty);
          // ONE VEIL LAW: the frame rides the same reveal height field
          // as the wall run it pierces — never its own rule.
          const dwhT = this.wallHeightAt(game, ax, ty);
          const item = this.doorwayItem(ground, ax, ty, game, dwhT, runLen, dregion);
          if (game.world.elevAt(ax, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (ground === Tile.ArchStone) {
          const item = this.archItem(tx, ty, game);
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (ground === Tile.PortalDown || ground === Tile.PortalUp) {
          const item = this.portalItem(tx, ty, ground === Tile.PortalUp, game);
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (ground === Tile.PillarStone) {
          const item = this.pillarItem(tx, ty, game);
          // Bake the outline ring into a cached sprite, exactly like a
          // discrete prop — a column is static, so it rides the slow
          // cadence and costs one blit a frame.
          if (this.outlineOn && item.body) {
            const b = item.body;
            const inner = item.draw;
            item.draw = () => this.drawPropOutlined(ground as Tile, tx, ty, b, inner);
            item.body = undefined;
          }
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (ground === Tile.RailWood) {
          const item = this.railItem(tx, ty, game);
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (ground === Tile.Bridge && this.isDockAt(game, tx, ty)) {
          // A bridge grows its own parapet: live rail items on every
          // deck edge that faces water, so bodies sort against them.
          this.bridgeRailItems(tx, ty, game, items);
          continue;
        }
        if (
          ground === Tile.Water ||
          ground === Tile.WaterDeep ||
          ground === Tile.WaterShallow
        ) {
          // A 45° notch fill on a bridge span carries the parapet
          // across its hypotenuse — the diagonal rail is a live item
          // like every straight one, so bodies sort against it.
          const f = this.deckFill(game, tx, ty);
          if (f !== null && f.family === 'bridge') {
            this.deckFillRailItem(tx, ty, f.legs, game, items);
          }
          continue;
        }
        if (DIAG_WALL_TILES.has(ground as Tile)) {
          // 45° corners: their own painter (triangular crown + sloped
          // facade). They ride the SAME reveal height field as the
          // straight runs — the whole corner bows with its walls, so
          // a cut run never ends at a full-height stump.
          const item = this.diagWallItem(ground as Tile, tx, ty, game, this.wallHeightAt(game, tx, ty), this.wallRegion(game, tx, ty));
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        if (Renderer.WALL_TILES.has(ground)) {
          const wregion = this.wallRegion(game, tx, ty);
          // ONE VEIL LAW: every wall tile between the player and the
          // camera reads its height off the one reveal field —
          // surface buildings, ruins, and dungeon corridors alike.
          const whT = this.wallHeightAt(game, tx, ty);
          const item = this.wallItem(
            ground as Tile,
            tx,
            ty,
            game,
            whT,
            wregion?.hasHearth ?? false,
            wregion,
          );
          // A destructible wall (the cracked cave seam) absorbing a
          // blow shudders like any durable prop — the knock translates
          // the whole drawn prism at draw time.
          if (this.propShakes.size > 0 && destructibleInfo(ground)) {
            const shakeX = this.propShakeX(tx, ty);
            if (shakeX !== 0) {
              const inner = item.draw;
              item.draw = () => {
                const wctx = this.ctx;
                wctx.save();
                wctx.translate(shakeX, 0);
                inner();
                wctx.restore();
              };
            }
          }
          if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
          items.push(item);
          continue;
        }
        const def = tileDef(ground);
        // Crops are walkable flat ground, but the PLANT standing on it
        // is a y-sorted object you pass behind.
        const isCrop = ground >= Tile.CropSprout && ground <= Tile.MoonbellRipe;
        if (!def.raised && ground !== Tile.Stump && !isCrop) continue;
        // Run-merging furniture rings as one whole-component unit.
        if (
          this.outlineOn &&
          Renderer.RUN_RING_TILES.has(ground as Tile) &&
          this.tryRunRingItem(ground as Tile, tx, ty, game, items, runSeen)
        ) {
          continue;
        }
        const item = this.objectItem(ground as Tile, tx, ty, game);
        // Discrete props ride the ring-baked sprite cache instead of
        // the per-frame outline pass — 76 live-outlined props in town
        // cost 2.5ms/frame. Their slow ambient animation (canopy sway,
        // ripples) samples at the shared cadence, exactly like tree
        // wind. Cold stations joined them (see STATION_CACHE_TILES);
        // a worked station drops back to the live pass for the show.
        const ringCached =
          (Renderer.CACHED_RING_TILES.has(ground) &&
            // A chest mid-lid-ease animates at frame rate, not cadence
            // (size gate first: no string builds on the common frame).
            (this.chestEases.size === 0 || !this.chestEases.has(`${tx},${ty}`))) ||
          (Renderer.STATION_CACHE_TILES.has(ground) &&
            (this.stationHeat.get(packTile(tx, ty)) ?? 0) < 0.01);
        if (this.outlineOn && item.body && ringCached) {
          const b = item.body;
          const inner = item.draw;
          item.draw = () => this.drawPropOutlined(ground as Tile, tx, ty, b, inner);
          item.body = undefined;
        }
        // A durable prop mid-shudder: translate the whole drawn piece
        // (live paint or cached blit alike) by the decaying knock.
        if (this.propShakes.size > 0 && destructibleInfo(ground)) {
          const shakeX = this.propShakeX(tx, ty);
          if (shakeX !== 0) {
            const inner = item.draw;
            item.draw = () => {
              const ctx = this.ctx;
              ctx.save();
              ctx.translate(shakeX, 0);
              inner();
              ctx.restore();
            };
          }
        }
        if (game.world.elevAt(tx, ty) !== 0) item.elevated = true;
        items.push(item);
      }
    }
  }

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
   * buildings drop EVERY occluding wall (facade, partitions, sub-room
   * walls), broken/segmented walls reveal per tile with no enclosure
   * required, and doorframes and diagonal corners ride the exact same
   * height field as the runs they sit in.
   *
   * Returns the height in tiles, WALL_H (full) → WALL_STUB (cut),
   * SMOOTHSTEP-eased at every window edge on the CONTINUOUS player
   * position, so walls sink and rise as you walk instead of popping
   * per row. Deliberately cheap: a few clamps and multiplies per
   * visible wall, no allocation, nothing cached — the wall painter is
   * live, so a per-frame height is free.
   *
   * THE SURFACE GATE: above ground, the floor found north of the wall
   * must be interior-ish — man-made floor (REVEAL_FLOORS) or any tile
   * of an enclosed region (which covers furniture, hearths, and
   * enclosed courtyards). That keeps freestanding garden walls and a
   * building's REAR facade standing when seen from outdoors (grass to
   * their north is not a room), while everything that fronts a room
   * bows. Underground any walkable floor qualifies — cave floor is
   * the only floor there is.
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
  private wallHeightAt(game: ClientGame, tx: number, ty: number): number {
    if (this.cutCtx <= 0.001) return WALL_H;
    const dy = ty - this.ownPY;
    // Front-row dy can be up to 2 rows north of ours — the window is
    // on the FRONT row, so accept dy up to 9 + 2 here.
    if (dy < -2 || dy > 11) return WALL_H;
    const adx = Math.abs(tx + 0.5 - this.ownPX);
    if (adx > 13) return WALL_H;
    // Nearest revealable ground straight north through the wall mass.
    // Only WALL-family tiles are mass to reach through: a solid prop
    // (bookshelf, station, strongbox) standing against the wall is
    // room CONTENT the wall must bow for, so the window keys to the
    // prop's own row like any floor. Treating props as mass keyed the
    // window one row north, and that one column lagged its whole run —
    // still ~80% tall at the wall-adjacent row, full height when
    // level with the wall — exactly over the thing it was hiding.
    let depth = 0;
    let open = false;
    for (let d = 1; d <= 3; d++) {
      const nt = game.world.groundAt(tx, ty - d);
      if (nt === undefined) return WALL_H;
      if (tileDef(nt).solid && Renderer.WALL_TILES.has(nt)) {
        // True wall mass — reach through. But a prop already found is
        // NICHED into the mass, not standing in a room: stay full.
        if (depth !== 0) break;
        continue;
      }
      if (depth === 0) depth = d;
      if (this.ugCutOn) {
        open = true;
        break;
      }
      // The surface gate: only a room is worth revealing. Solid props
      // replaced their floor tile, so they never sit in REVEAL_FLOORS —
      // they qualify through their room's region (furniture is flooded
      // into region tiles), and a regionless prop (a stall on courtyard
      // paving) falls through to the ground it stands against.
      if (Renderer.REVEAL_FLOORS.has(nt) || this.interiors.regionAt(game, tx, ty - d) !== null) {
        open = true;
        break;
      }
      if (!tileDef(nt).solid) break;
    }
    if (!open) return WALL_H;
    // Window margins on the FRONT row — every row of the mass shares
    // its front row's ease, so the slab moves as one. Underground the
    // window opens 2 rows north of you (peek over the corridor wall
    // you stand against); on the SURFACE it opens at your own row —
    // a facade only bows once you are level with or past it, so
    // standing on paving outside a building's front never dips the
    // face you are looking at. Ease out over dyF [7..9], |dx|
    // [10.5..13] everywhere.
    const dyF = dy - (depth - 1);
    let ey = Math.min(this.ugCutOn ? (dyF + 2) / 1.5 : (dyF + 0.5) / 1.5, (9 - dyF) / 2, 1);
    let ex = Math.min((13 - adx) / 2.5, 1);
    if (ey <= 0 || ex <= 0) return WALL_H;
    ey = ey * ey * (3 - 2 * ey);
    ex = ex * ex * (3 - 2 * ex);
    const cut = ey * ex * this.cutCtx;
    if (cut <= 0) return WALL_H;
    return WALL_H + (WALL_STUB - WALL_H) * cut;
  }

  private wallItem(
    tile: Tile,
    tx: number,
    ty: number,
    game: ClientGame,
    whT: number,
    hearth = false,
    region: InteriorRegion | null = null,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const n = this.wallish(game, tx, ty - 1);
    const e = this.wallish(game, tx + 1, ty);
    const sw = this.wallish(game, tx, ty + 1);
    const w = this.wallish(game, tx - 1, ty);
    // A side doorway to the north = this run restarts at a passage
    // mouth: keep the crown corners SQUARE there so the slot above
    // reads as a clean rectangular opening, not a pointed notch.
    const nT = game.world.groundAt(tx, ty - 1);
    const nDoor = !n && nT !== undefined && Renderer.DOOR_TILES.has(nT);

    // Windowed walls are the same masonry with a glazed opening set
    // into the south face — resolve to the base material for colors.
    const mat =
      tile === Tile.WallWoodWindow ? Tile.WallWood : tile === Tile.WallStoneWindow ? Tile.WallStone : tile;
    // Glazing needs the full face behind it: the opening's head sits at
    // 1.62 tiles, so any reveal-eased height below ~1.75 would poke the
    // hole through the crown — sinking walls shed their glass first.
    const window = mat !== tile && whT > 1.75;
    // THE REAR RISER: when the wall directly NORTH of this one is
    // sunk lower (the mass in front of a revealed slab), the step
    // between its stub crown and our full crown would otherwise show
    // a floating band of the ground drawn behind — paint our interior
    // back face down to the stub so the step reads as solid mass.
    const nH = n ? this.wallHeightAt(game, tx, ty - 1) : whT;
    const skin = this.woodSkinFor(region);
    const top = mat === Tile.WallWood ? skin.top : mat === Tile.WallStone ? '#8c8798' : '#3a3444';
    const face = mat === Tile.WallWood ? skin.log : mat === Tile.WallStone ? '#5b5566' : '#221d2c';
    const r = s * 0.26;
    // Chamfer only NORTH corners exposed on both sides. South crown
    // corners stay square: they sit flush on the south face, and a cut
    // there opens a sliver of ground between crown and face.
    const radii: [number, number, number, number] = [
      !n && !nDoor && !w ? r : 0,
      !n && !nDoor && !e ? r : 0,
      0,
      0,
    ];
    const syT = s * this.camera.yScale; // foreshortened tile depth
    const hs = whT * s;
    const lx = (x: number): number => this.leanX(x, whT);
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    const sideCol = shade(mat === Tile.WallWood ? skin.log : mat === Tile.WallStone ? '#6f697c' : '#2b2536', -6);
    // Shared timber course geometry — face, flanks, and corner ends
    // must agree on where every log beds. The stack reads bottom-up:
    // stone plinth, squared sill beam, whole chinked log courses at
    // ~0.42-tile pitch (absolute — taller walls stack MORE logs),
    // squared wall-plate beam under the crown. Stubs drop the sill.
    const plinthH = s * 0.22;
    const sillH = whT >= 1 ? s * 0.11 : 0;
    const plateH = s * 0.13;
    const spanPx = hs - plateH - plinthH - sillH;
    const nLogs = Math.max(1, Math.round(spanPx / (s * 0.42)));
    const chinkG = Math.min(s * 0.055, spanPx * 0.05);
    const logH = (spanPx - chinkG * (nLogs - 1)) / nLogs;

    return {
      sortY: ty + 1,
      drawShadow: sw
        ? undefined
        : () => {
            // A body this tall throws a real shadow across the ground,
            // cast from its south base edge along the sun.
            this.castEdgeQuad(p.x - 0.25, p.y + syT, p.x + s + 0.25, p.y + syT, whT);
          },
      draw: () => {
        const yBase = p.y + syT; // south edge at ground level
        const yTop = yBase - hs; // south edge, lifted to the crown
        const tx0 = lx(x0);
        const tx1 = lx(x1);
        // Flank revealed by the lean: a prism right of the screen
        // center leans right, showing its WEST side (and vice versa).
        // Skipped inside joined runs. Timber flanks carry the course
        // seams and stone plinth around the corner so the same logs
        // wrap the building — a face is never a different material
        // than its own side.
        const flankDetail = (xa: number, txa: number): void => {
          if (mat !== Tile.WallWood) return;
          const lerp = (f: number): number => xa + (txa - xa) * f;
          const band = (f0: number, f1: number, col: string): void => {
            const xq0 = lerp(f0);
            const xq1 = lerp(f1);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(xq0, p.y - hs * f0);
            ctx.lineTo(xq0, p.y + syT - hs * f0);
            ctx.lineTo(xq1, p.y + syT - hs * f1);
            ctx.lineTo(xq1, p.y - hs * f1);
            ctx.closePath();
            ctx.fill();
          };
          // Foundation, sill beam, and wall plate wrap the corner —
          // a face is never a different construction than its side.
          band(0, plinthH / hs, shade(Renderer.PLINTH_COL, -12));
          if (sillH > 0) band(plinthH / hs, (plinthH + sillH) / hs, shade(skin.plate, -16));
          band(1 - plateH / hs, 1, shade(skin.plate, -8));
          // Chinking lines between courses carry the stacked logs
          // around the building's edge at the exact face pitch.
          for (let i = 1; i < nLogs; i++) {
            const f = (plinthH + sillH + i * logH + (i - 0.5) * chinkG) / hs;
            const xf = lerp(f);
            ctx.fillStyle = shade(skin.chink, -22);
            ctx.fillRect(xf - s * 0.02, p.y - hs * f, Math.max(1, s * 0.04), syT);
          }
        };
        if (tx0 > x0 + 0.5 && !w) {
          ctx.fillStyle = sideCol;
          ctx.beginPath();
          ctx.moveTo(x0, p.y);
          ctx.lineTo(x0, yBase);
          ctx.lineTo(tx0, yTop);
          ctx.lineTo(tx0, p.y - hs);
          ctx.closePath();
          ctx.fill();
          flankDetail(x0, tx0);
        } else if (tx1 < x1 - 0.5 && !e) {
          ctx.fillStyle = sideCol;
          ctx.beginPath();
          ctx.moveTo(x1, p.y);
          ctx.lineTo(x1, yBase);
          ctx.lineTo(tx1, yTop);
          ctx.lineTo(tx1, p.y - hs);
          ctx.closePath();
          ctx.fill();
          flankDetail(x1, tx1);
        }
        // South face: base edge on the ground, top edge leaned — the
        // vertical surface you walk behind.
        if (!sw) {
          // TRUE GLASS: a window is a HOLE in the face, not a painted
          // pane. Whatever the frame already holds behind this wall —
          // the room inside through a facade, the meadow beyond
          // through a back wall — shows through the opening; a breath
          // of tint and a glint then say "glass". The hole is carved
          // with an evenodd fill and held open by an evenodd clip
          // through the whole detail pass.
          const skew = (lx(p.x + s / 2) - (p.x + s / 2)) / -hs;
          // The glazed opening, set at the body's eye line: sill at
          // ~0.9 tiles, head at ~1.6 — a window a person stands at.
          const wx = p.x + s * 0.28;
          const ww = s * 0.44;
          const wy = -s * 1.62;
          const wh2 = s * 0.7;
          let hole: Path2D | null = null;
          if (window) {
            hole = new Path2D();
            chamferRect(hole, wx, wy, ww, wh2, s * 0.05);
          }
          // The skewed face frame as a matrix: detail coordinates in,
          // leaned screen geometry out — it maps the hole into the
          // face fill below and the tint pass after.
          const frame = new DOMMatrix([1, 0, skew, 1, 0, yBase]);
          ctx.fillStyle = face;
          const facePath = new Path2D();
          facePath.moveTo(x0, yBase + 0.5);
          facePath.lineTo(x1, yBase + 0.5);
          facePath.lineTo(tx1, yTop);
          facePath.lineTo(tx0, yTop);
          facePath.closePath();
          if (hole) facePath.addPath(hole, frame);
          ctx.fill(facePath, 'evenodd');
          // Material detail inside the face's own skewed frame, so
          // courses and plank seams follow the lean coherently.
          ctx.save();
          ctx.translate(0, yBase);
          ctx.transform(1, 0, skew, 1, 0, 0);
          if (hole) {
            // Courses, girts, and seams must never paint across the
            // glass — clip them to the face minus the opening.
            const guard = new Path2D();
            guard.rect(x0 - s * 2, -hs - s * 2, x1 - x0 + s * 4, hs + s * 3);
            guard.addPath(hole);
            ctx.clip(guard, 'evenodd');
          }
          if (mat === Tile.WallWood) {
            // CHINKED-LOG WALL: whole hewn logs at ~0.42-tile pitch,
            // pale limewash CHINKING packed between courses, and NO
            // vertical joints anywhere — masonry breaks into blocks;
            // a log wall runs in long unbroken horizontal lines. Each
            // log is a cylinder in flat vector: one sky-lit top
            // arris, one belly shadow rolling under, one crisp bed
            // shadow where it rests on the chinking. Character comes
            // from the wood itself — knots, grain streaks, seasoning
            // checks — dealt sparsely by hash, never from joints.
            // Stone plinth: the foundation the log stack sits on.
            ctx.fillStyle = Renderer.PLINTH_COL;
            ctx.fillRect(x0, -plinthH, x1 - x0, plinthH);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x0, -plinthH, x1 - x0, s * 0.03);
            ctx.fillStyle = 'rgba(20, 14, 28, 0.35)';
            for (let k = 0; k < 2; k++) {
              const hj = hashCoords(211 + k, tx, ty);
              ctx.fillRect(
                p.x + s * (0.12 + (hj % 76) / 100),
                -plinthH + s * 0.04,
                Math.max(1, s * 0.03),
                plinthH - s * 0.07,
              );
            }
            // Squared sill beam the first log beds on (stubs skip it).
            if (sillH > 0) {
              ctx.fillStyle = shade(skin.plate, -10);
              ctx.fillRect(x0, -plinthH - sillH, x1 - x0, sillH);
              ctx.fillStyle = 'rgba(255, 220, 170, 0.14)';
              ctx.fillRect(x0, -plinthH - sillH, x1 - x0, s * 0.028);
            }
            const base = plinthH + sillH;
            const topY = -(hs - plateH);
            // Chinking first, across the whole stack — the logs are
            // then laid over it leaving only the packed lines bare.
            ctx.fillStyle = skin.chink;
            ctx.fillRect(x0, topY, x1 - x0, spanPx + 0.5);
            for (let li = 0; li < nLogs; li++) {
              const yb = -base - li * (logH + chinkG);
              const yt = yb - logH;
              ctx.fillStyle = li % 2 === 0 ? skin.log : skin.log2;
              ctx.fillRect(x0, yt, x1 - x0, logH);
              // The cylinder read: sky-lit top arris, belly shadow,
              // and a crisp bed shadow onto the chinking below.
              ctx.fillStyle = 'rgba(255, 214, 150, 0.2)';
              ctx.fillRect(x0, yt + logH * 0.06, x1 - x0, logH * 0.2);
              ctx.fillStyle = 'rgba(28, 16, 6, 0.22)';
              ctx.fillRect(x0, yb - logH * 0.2, x1 - x0, logH * 0.2);
              ctx.fillStyle = 'rgba(20, 12, 5, 0.45)';
              ctx.fillRect(x0, yb - Math.max(1, s * 0.022), x1 - x0, Math.max(1, s * 0.022));
              // The wood's own character, dealt by hash — knots with
              // a dark heart, long grain streaks, seasoning checks.
              // Rates ride the skin: pine is knotty, spruce splits.
              const hg = hashCoords(157 + li, tx, ty);
              if (hg % 100 < 30 * skin.knotK) {
                const kx = p.x + s * (0.14 + ((hg >>> 5) % 72) / 100);
                const ky = yt + logH * (0.32 + ((hg >>> 9) % 38) / 100);
                const kr = s * (0.03 + ((hg >>> 13) % 12) / 520);
                ctx.fillStyle = 'rgba(40, 24, 10, 0.45)';
                ctx.beginPath();
                ctx.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = shade(skin.log, -24);
                ctx.beginPath();
                ctx.ellipse(kx, ky, kr * 0.65, kr * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
              }
              if ((hg & 3) === 1) {
                ctx.fillStyle = 'rgba(46, 28, 12, 0.2)';
                ctx.fillRect(
                  p.x + (s * (hg % 40)) / 100,
                  yt + logH * (0.42 + ((hg >>> 11) % 22) / 100),
                  s * (0.4 + ((hg >>> 6) % 45) / 100),
                  Math.max(1, s * 0.026),
                );
              }
              if ((hg >>> 3) % 100 < 13 * skin.checkK) {
                ctx.fillStyle = 'rgba(26, 15, 6, 0.4)';
                ctx.fillRect(
                  p.x + s * (0.18 + ((hg >>> 7) % 62) / 100),
                  (hg & 8) === 0 ? yt : yb - logH * 0.3,
                  Math.max(1, s * 0.024),
                  logH * 0.3,
                );
              }
            }
            // Squared wall-plate beam capping the stack, pinned with
            // occasional trunnel pegs — carpentry, not paint.
            ctx.fillStyle = skin.plate;
            ctx.fillRect(x0, -hs, x1 - x0, plateH);
            ctx.fillStyle = 'rgba(255, 220, 170, 0.15)';
            ctx.fillRect(x0, -hs, x1 - x0, s * 0.03);
            ctx.fillStyle = 'rgba(26, 15, 7, 0.4)';
            ctx.fillRect(x0, -hs + plateH - s * 0.028, x1 - x0, s * 0.028);
            const hp = hashCoords(173, tx, ty);
            if ((hp & 3) !== 0) {
              ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
              const pgx = p.x + s * (0.18 + (hp % 30) / 100);
              ctx.fillRect(pgx, -hs + plateH * 0.28, s * 0.045, s * 0.045);
              if ((hp & 4) === 0) ctx.fillRect(pgx + s * 0.5, -hs + plateH * 0.28, s * 0.045, s * 0.045);
            }
          } else {
            // Running-bond masonry: four mortar courses over the taller
            // face, joints alternating band to band, and a heavier
            // foundation course at the base.
            ctx.strokeStyle = 'rgba(20, 14, 28, 0.35)';
            ctx.lineWidth = Math.max(1, s * 0.03);
            // Courses at ABSOLUTE stone height — a 2-story facade lays
            // more courses, it doesn't stretch them.
            let band = 0;
            for (let cy2 = s * 0.39; cy2 < hs * 0.96; cy2 += s * 0.39, band++) {
              ctx.beginPath();
              ctx.moveTo(p.x, -cy2);
              ctx.lineTo(p.x + s, -cy2);
              ctx.stroke();
              for (const fx of band % 2 === 0 ? [0.25, 0.75] : [0.5]) {
                ctx.beginPath();
                ctx.moveTo(p.x + s * fx, -cy2);
                ctx.lineTo(p.x + s * fx, -Math.min(hs * 0.96, cy2 + s * 0.39));
                ctx.stroke();
              }
            }
            ctx.fillStyle = 'rgba(20, 12, 26, 0.2)';
            ctx.fillRect(p.x, -hs * 0.1, s, hs * 0.1);
          }
          // THE SECRET SEAM: a CrackedCaveWall is the same cave mass
          // wearing one old fracture down its south face — SUBTLE by
          // law, because SPOTTING it is the gameplay. A bruised edge a
          // whisper lighter than the rock, a hairline dark core, and a
          // few radiating hairlines; everything dealt by the tile's
          // own hash and drawn in face-height fractions so the crack
          // rides the dungeon cutaway's stub ease intact. The tile id
          // survives the run auto-tiler, so only the cracked member of
          // a merged wall run carries it.
          if (tile === Tile.CrackedCaveWall) {
            const hc = hashCoords(199, tx, ty);
            const fr = (k: number, lo: number, hi: number): number =>
              lo + (((hc >>> k) % 100) / 100) * (hi - lo);
            const pts: Array<[number, number]> = [
              [p.x + s * fr(0, 0.38, 0.62), -hs * 0.92],
              [p.x + s * fr(4, 0.28, 0.48), -hs * 0.72],
              [p.x + s * fr(8, 0.44, 0.68), -hs * 0.5],
              [p.x + s * fr(12, 0.3, 0.52), -hs * 0.28],
              [p.x + s * fr(16, 0.4, 0.6), -hs * 0.08],
            ];
            const bm = (hc & 32) === 0 ? 1 : -1;
            const branch: Array<[number, number]> = [
              pts[2]!,
              [pts[2]![0] + bm * s * 0.18, -hs * 0.36],
              [pts[2]![0] + bm * s * 0.3, -hs * 0.14],
            ];
            const trace = (list: Array<[number, number]>): void => {
              ctx.beginPath();
              list.forEach(([lx2, ly2], i) => (i === 0 ? ctx.moveTo(lx2, ly2) : ctx.lineTo(lx2, ly2)));
            };
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // The bruised parting first — crushed stone catches a
            // touch more of the torchlight than the face around it.
            ctx.strokeStyle = 'rgba(128, 120, 150, 0.18)';
            ctx.lineWidth = Math.max(1.5, s * 0.055);
            trace(pts);
            ctx.stroke();
            trace(branch);
            ctx.stroke();
            // Then the hairline dark core down the same fork.
            ctx.strokeStyle = 'rgba(12, 9, 20, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.02);
            trace(pts);
            ctx.stroke();
            trace(branch);
            ctx.stroke();
            // Radiating hairlines off the elbows — stress the blow
            // will finish, for whoever looks twice.
            ctx.strokeStyle = 'rgba(12, 9, 20, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.014);
            for (let k = 0; k < 3; k++) {
              const el = pts[1 + k]!;
              const rm = ((hc >>> (20 + k)) & 1) === 0 ? 1 : -1;
              const dy = (((hc >>> (9 + k * 3)) % 40) / 100 - 0.2) * hs * 0.24;
              ctx.beginPath();
              ctx.moveTo(el[0], el[1]);
              ctx.lineTo(el[0] + rm * s * (0.12 + ((hc >>> (5 + k * 4)) % 10) / 100), el[1] + dy);
              ctx.stroke();
            }
          }
          if (window) {
            // Frame dressing AROUND the see-through opening: a dark
            // reveal ring and material-true trim — timber walls hang
            // plank shutters, masonry beds a stone sill and lintel.
            // The clip keeps every stroke of it off the glass.
            const wood2 = mat === Tile.WallWood;
            ctx.fillStyle = shade(face, -22);
            ctx.fillRect(wx - s * 0.035, wy - s * 0.035, ww + s * 0.07, wh2 + s * 0.07);
            if (wood2) {
              // Plank shutters pinned open against the wall.
              for (const shx of [wx - s * 0.15, wx + ww + s * 0.03]) {
                ctx.fillStyle = shade(skin.log, -20);
                ctx.beginPath();
                chamferRect(ctx, shx, wy - s * 0.02, s * 0.12, wh2 + s * 0.04, s * 0.02);
                ctx.fill();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(shx + s * 0.045, wy + s * 0.02, s * 0.025, wh2 - s * 0.04);
              }
              // Timber lintel + sill boards, pegged into the wall.
              ctx.fillStyle = skin.plate;
              ctx.fillRect(wx - s * 0.18, wy - s * 0.085, ww + s * 0.36, s * 0.055);
              ctx.fillStyle = 'rgba(40, 24, 10, 0.55)';
              ctx.fillRect(wx - s * 0.15, wy - s * 0.078, s * 0.04, s * 0.04);
              ctx.fillRect(wx + ww + s * 0.11, wy - s * 0.078, s * 0.04, s * 0.04);
              ctx.fillStyle = shade(skin.plate, 18);
              ctx.fillRect(wx - s * 0.18, wy + wh2 + s * 0.035, ww + s * 0.36, s * 0.06);
              // Knee braces under the sill ends root it to the wall.
              ctx.fillStyle = shade(skin.plate, -8);
              for (const bx of [wx - s * 0.08, wx + ww - s * 0.02]) {
                ctx.beginPath();
                ctx.moveTo(bx, wy + wh2 + s * 0.095);
                ctx.lineTo(bx + s * 0.1, wy + wh2 + s * 0.095);
                ctx.lineTo(bx + s * 0.1, wy + wh2 + s * 0.21);
                ctx.closePath();
                ctx.fill();
              }
            } else {
              // Dressed stone: shadowed lintel block, lit sill course.
              ctx.fillStyle = shade(face, -14);
              ctx.fillRect(wx - s * 0.09, wy - s * 0.1, ww + s * 0.18, s * 0.07);
              ctx.fillStyle = shade(face, 22);
              ctx.fillRect(wx - s * 0.1, wy + wh2 + s * 0.035, ww + s * 0.2, s * 0.065);
              ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
              ctx.fillRect(wx - s * 0.1, wy + wh2 + s * 0.1, ww + s * 0.2, s * 0.03);
            }
          }
          // Ambient-occlusion seam where the face meets the ground.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
          ctx.fillRect(x0, -s * 0.06, s + 0.5, s * 0.06);
          ctx.restore();
          if (hole) {
            // The glass itself, over the open hole: cold daylight
            // tint (warm lamplight after dark when the room has a
            // hearth), a diagonal glint, and the mullion cross
            // sitting proud of the pane.
            ctx.save();
            ctx.translate(0, yBase);
            ctx.transform(1, 0, skew, 1, 0, 0);
            const warm = hearth ? this.sky.flame : 0;
            ctx.fillStyle =
              warm > 0.05
                ? `rgba(255, 205, 130, ${0.18 + 0.3 * warm})`
                : 'rgba(168, 192, 228, 0.16)';
            ctx.fill(hole);
            if (warm <= 0.05) {
              ctx.fillStyle = 'rgba(214, 228, 248, 0.22)';
              ctx.beginPath();
              ctx.moveTo(wx + s * 0.03, wy + s * 0.03);
              ctx.lineTo(wx + ww * 0.55, wy + s * 0.03);
              ctx.lineTo(wx + s * 0.03, wy + wh2 * 0.6);
              ctx.closePath();
              ctx.fill();
            }
            ctx.fillStyle = mat === Tile.WallWood ? shade(skin.log, -22) : shade(face, -8);
            ctx.fillRect(wx + ww / 2 - s * 0.022, wy, s * 0.044, wh2);
            ctx.fillRect(wx, wy + wh2 * 0.46 - s * 0.02, ww, s * 0.04);
            ctx.restore();
          }
        }
        // REAR RISER (see above): the interior back face exposed when
        // the wall ahead of us sinks lower. Spans from our crown's
        // north edge down to the sunken neighbour's crown north edge;
        // our own crown and the neighbour's stub overdraw the rest.
        if (n && nH < whT - 0.04) {
          const yRTop = p.y - hs;
          const yRBot = p.y - syT - nH * s;
          if (yRBot > yRTop + 0.5) {
            ctx.fillStyle = shade(face, -14);
            ctx.beginPath();
            ctx.moveTo(lx(x0), yRTop);
            ctx.lineTo(lx(x1), yRTop);
            ctx.lineTo(this.leanX(x1, nH), yRBot);
            ctx.lineTo(this.leanX(x0, nH), yRBot);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Crown: the whole top layer drawn in the leaned height frame —
        // footprint coordinates in, coherent lifted geometry out.
        this.beginHeightLayer(whT);
        ctx.fillStyle = top;
        ctx.beginPath();
        chamferRect(ctx, x0, p.y - 0.25, s + 0.5, syT + 0.5, radii);
        ctx.fill();
        if (mat === Tile.WallWood) this.woodCrownPlate(p, syT, s, x0, x1, tx, ty, (n || sw) && !(w || e));
        // Lit south lip of the crown grounds the height read.
        if (!sw) {
          ctx.fillStyle = shade(top, 16);
          ctx.fillRect(x0 + radii[3] * 0.8, p.y + syT - s * 0.08, s + 0.5 - (radii[2] + radii[3]) * 0.8, s * 0.08);
        }
        ctx.restore();
        // SILHOUETTE OUTLINE: the flat-art edge, on exposed perimeter
        // only — the crown top + roofline sides + the front face's
        // ground contact. Run-shared edges (n/e/w/sw) are skipped so
        // the run reads as one mass, only its outer boundary ringed.
        if (this.outlineOn) {
          const cTop = p.y - 0.25 - hs; // crown north edge, lifted
          const cBot = p.y + syT + 0.25 - hs; // crown south lip
          const fBot = p.y + syT; // face foot on the ground
          const sideBot = sw ? cBot : fBot; // no face ⇒ stop at the crown
          const outline = new Path2D();
          this.addCrownPerimeter(outline, x0, x1, cTop, sideBot, sideBot, radii[0], radii[1], n, e, w);
          if (!sw) {
            outline.moveTo(x0, fBot);
            outline.lineTo(x1, fBot);
          }
          this.beginStructOutline();
          ctx.stroke(outline);
        }
      },
    };
  }

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
  private woodCrownPlate(
    p: { x: number; y: number },
    syT: number,
    s: number,
    x0: number,
    x1: number,
    tx: number,
    ty: number,
    vert: boolean,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clip();
    const seam = Math.max(1, s * 0.025);
    const hj = hashCoords(177, tx, ty);
    if (vert) {
      const wL = x1 - x0;
      // Hard arris shadows where the beam edges fall to the faces.
      ctx.fillStyle = 'rgba(30, 18, 8, 0.24)';
      ctx.fillRect(x0, p.y - 0.25, wL * 0.1, syT + 0.75);
      ctx.fillRect(x1 - wL * 0.1, p.y - 0.25, wL * 0.1, syT + 0.75);
      // Sun-lit spine along the beam's back.
      ctx.fillStyle = 'rgba(255, 226, 175, 0.14)';
      ctx.fillRect(x0 + wL * 0.32, p.y - 0.25, wL * 0.36, syT + 0.75);
      // Long grain following the run.
      if ((hj & 3) === 1) {
        ctx.fillStyle = 'rgba(40, 24, 10, 0.2)';
        ctx.fillRect(x0 + wL * (0.2 + ((hj >>> 6) % 30) / 100), p.y + syT * 0.12, seam, syT * 0.62);
      }
      // Rare butt joint, pegged either side — beams are FITTED.
      if ((hj & 7) === 2) {
        const jy = p.y + (syT * (20 + (hj % 55))) / 100;
        ctx.fillStyle = 'rgba(40, 24, 10, 0.38)';
        ctx.fillRect(x0 + wL * 0.08, jy, wL * 0.84, seam);
        ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
        ctx.fillRect(x0 + wL * 0.28, jy - s * 0.075, s * 0.042, s * 0.042);
        ctx.fillRect(x0 + wL * 0.6, jy + s * 0.04, s * 0.042, s * 0.042);
      }
    } else {
      ctx.fillStyle = 'rgba(30, 18, 8, 0.24)';
      ctx.fillRect(x0, p.y - 0.25, x1 - x0, syT * 0.1);
      ctx.fillRect(x0, p.y + syT * 0.9, x1 - x0, syT * 0.1 + 0.5);
      ctx.fillStyle = 'rgba(255, 226, 175, 0.14)';
      ctx.fillRect(x0, p.y + syT * 0.32, x1 - x0, syT * 0.36);
      if ((hj & 3) === 1) {
        ctx.fillStyle = 'rgba(40, 24, 10, 0.2)';
        ctx.fillRect(p.x + (s * (hj % 60)) / 100, p.y + syT * (0.2 + ((hj >>> 6) % 30) / 100), s * 0.5, seam);
      }
      if ((hj & 7) === 2) {
        const jx = p.x + (s * (20 + (hj % 55))) / 100;
        ctx.fillStyle = 'rgba(40, 24, 10, 0.38)';
        ctx.fillRect(jx, p.y + syT * 0.08, seam, syT * 0.84);
        ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
        ctx.fillRect(jx - s * 0.075, p.y + syT * 0.28, s * 0.042, s * 0.042);
        ctx.fillRect(jx + s * 0.04, p.y + syT * 0.6, s * 0.042, s * 0.042);
      }
    }
    ctx.restore();
  }

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
  private diagWallItem(
    tile: Tile,
    tx: number,
    ty: number,
    game: ClientGame,
    whT: number,
    region: InteriorRegion | null,
  ): DrawItem {
    const info = diagWallInfo(tile)!;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const hs = whT * s;
    const stone = info.material === 'stone';
    const skin = this.woodSkinFor(region);
    const top = stone ? '#8c8798' : skin.top;
    const face = stone ? '#5b5566' : skin.log;
    const nE = this.wallish(game, tx + 1, ty);
    const nS = this.wallish(game, tx, ty + 1);
    const nW = this.wallish(game, tx - 1, ty);
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    const yN = p.y;
    const yS = p.y + syT;
    const mass = info.mass;
    // Hypotenuse ground endpoints, west end first.
    const hypW: [number, number] = mass === 'NE' || mass === 'SW' ? [x0, yN] : [x0, yS];
    const hypE: [number, number] = mass === 'NE' || mass === 'SW' ? [x1, yS] : [x1, yN];
    // The mass triangle in plan coords (for the crown).
    const tri: Array<[number, number]> =
      mass === 'NE'
        ? [[x0, yN], [x1, yN], [x1, yS]]
        : mass === 'NW'
          ? [[x0, yN], [x1, yN], [x0, yS]]
          : mass === 'SE'
            ? [[x1, yN], [x1, yS], [x0, yS]]
            : [[x0, yN], [x1, yS], [x0, yS]];
    const front = mass === 'NE' || mass === 'NW'; // hypotenuse faces the camera

    return {
      sortY: front ? ty + 0.001 : ty + 1,
      drawShadow: front
        ? () => this.castEdgeQuad(hypW[0], hypW[1], hypE[0], hypE[1], whT)
        : nS
          ? undefined
          : () => this.castEdgeQuad(x0, yS, x1, yS, whT),
      draw: () => {
        // The visible face: sloped hypotenuse for front corners, the
        // straight south edge for exposed back corners.
        if (front) {
          this.paintFaceBands(hypW, hypE, hs, s, stone, skin, face, tx, ty, whT);
        } else if (!nS) {
          this.paintFaceBands([x0, yS], [x1, yS], hs, s, stone, skin, face, tx, ty, whT);
        }
        // Crown: the mass triangle, lifted.
        this.beginHeightLayer(whT);
        const triPath = new Path2D();
        triPath.moveTo(tri[0]![0], tri[0]![1]);
        triPath.lineTo(tri[1]![0], tri[1]![1]);
        triPath.lineTo(tri[2]![0], tri[2]![1]);
        triPath.closePath();
        ctx.fillStyle = top;
        ctx.fill(triPath);
        ctx.save();
        ctx.clip(triPath);
        if (!stone) {
          // Cap-beam read along the diagonal: a hard arris falling
          // away at the outward edge, a lit spine behind it. Strokes
          // centred on the edge — the clip keeps the inside half.
          ctx.strokeStyle = 'rgba(30, 18, 8, 0.24)';
          ctx.lineWidth = s * 0.22;
          ctx.beginPath();
          ctx.moveTo(hypW[0], hypW[1]);
          ctx.lineTo(hypE[0], hypE[1]);
          ctx.stroke();
          // Spine offset toward the mass.
          const off = (mass === 'NE' || mass === 'NW' ? -1 : 1) * syT * 0.34;
          ctx.strokeStyle = 'rgba(255, 226, 175, 0.14)';
          ctx.lineWidth = s * 0.24;
          ctx.beginPath();
          ctx.moveTo(hypW[0], hypW[1] + off);
          ctx.lineTo(hypE[0], hypE[1] + off);
          ctx.stroke();
        }
        // Sun-lit lip on the camera-side arris grounds the height
        // read, exactly like a straight crown's south lip.
        if (front || !nS) {
          ctx.strokeStyle = shade(top, 16);
          ctx.lineWidth = s * 0.14;
          ctx.beginPath();
          if (front) {
            ctx.moveTo(hypW[0], hypW[1]);
            ctx.lineTo(hypE[0], hypE[1]);
          } else {
            ctx.moveTo(x0, yS);
            ctx.lineTo(x1, yS);
          }
          ctx.stroke();
        }
        ctx.restore();
        ctx.restore(); // beginHeightLayer
        // SILHOUETTE OUTLINE: the lifted outward arris + the visible
        // face's ground contact + exposed end verticals. Run-shared
        // edges are the neighbour runs' problem, as everywhere.
        if (this.outlineOn) {
          const o = new Path2D();
          o.moveTo(hypW[0], hypW[1] - hs);
          o.lineTo(hypE[0], hypE[1] - hs);
          if (front) {
            o.moveTo(hypW[0], hypW[1]);
            o.lineTo(hypE[0], hypE[1]);
            if (!nW) {
              o.moveTo(hypW[0], hypW[1]);
              o.lineTo(hypW[0], hypW[1] - hs);
            }
            if (!nE) {
              o.moveTo(hypE[0], hypE[1]);
              o.lineTo(hypE[0], hypE[1] - hs);
            }
          } else if (!nS) {
            o.moveTo(x0, yS);
            o.lineTo(x1, yS);
            if (!nW) {
              o.moveTo(x0, yS);
              o.lineTo(x0, yS - hs);
            }
            if (!nE) {
              o.moveTo(x1, yS);
              o.lineTo(x1, yS - hs);
            }
          }
          this.beginStructOutline();
          ctx.stroke(o);
        }
      },
    };
  }

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
  private paintFaceBands(
    A: [number, number],
    B: [number, number],
    hs: number,
    s: number,
    stone: boolean,
    skin: WoodSkin,
    face: string,
    tx: number,
    ty: number,
    whT: number,
  ): void {
    const ctx = this.ctx;
    const w2 = B[0] - A[0];
    const k = (B[1] - A[1]) / w2;
    ctx.save();
    ctx.translate(A[0], A[1]);
    ctx.transform(1, k, 0, 1, 0, 0);
    ctx.fillStyle = face;
    ctx.fillRect(0, -hs, w2, hs);
    if (!stone) {
      const plinthH = s * 0.22;
      const sillH = whT >= 1 ? s * 0.11 : 0;
      const plateH = s * 0.13;
      const spanPx = hs - plateH - plinthH - sillH;
      const nLogs = Math.max(1, Math.round(spanPx / (s * 0.42)));
      const chinkG = Math.min(s * 0.055, spanPx * 0.05);
      const logH = (spanPx - chinkG * (nLogs - 1)) / nLogs;
      ctx.fillStyle = Renderer.PLINTH_COL;
      ctx.fillRect(0, -plinthH, w2, plinthH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, -plinthH, w2, s * 0.03);
      if (sillH > 0) {
        ctx.fillStyle = shade(skin.plate, -10);
        ctx.fillRect(0, -plinthH - sillH, w2, sillH);
        ctx.fillStyle = 'rgba(255, 220, 170, 0.14)';
        ctx.fillRect(0, -plinthH - sillH, w2, s * 0.028);
      }
      const base = plinthH + sillH;
      const topY = -(hs - plateH);
      ctx.fillStyle = skin.chink;
      ctx.fillRect(0, topY, w2, spanPx + 0.5);
      for (let li = 0; li < nLogs; li++) {
        const yb = -base - li * (logH + chinkG);
        const yt = yb - logH;
        ctx.fillStyle = li % 2 === 0 ? skin.log : skin.log2;
        ctx.fillRect(0, yt, w2, logH);
        ctx.fillStyle = 'rgba(255, 214, 150, 0.2)';
        ctx.fillRect(0, yt + logH * 0.06, w2, logH * 0.2);
        ctx.fillStyle = 'rgba(28, 16, 6, 0.22)';
        ctx.fillRect(0, yb - logH * 0.2, w2, logH * 0.2);
        ctx.fillStyle = 'rgba(20, 12, 5, 0.45)';
        ctx.fillRect(0, yb - Math.max(1, s * 0.022), w2, Math.max(1, s * 0.022));
        const hg = hashCoords(157 + li, tx, ty);
        if (hg % 100 < 30 * skin.knotK) {
          const kx = w2 * (0.16 + ((hg >>> 5) % 64) / 100);
          const ky = yt + logH * (0.32 + ((hg >>> 9) % 38) / 100);
          const kr = s * (0.03 + ((hg >>> 13) % 12) / 520);
          ctx.fillStyle = 'rgba(40, 24, 10, 0.45)';
          ctx.beginPath();
          ctx.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(skin.log, -24);
          ctx.beginPath();
          ctx.ellipse(kx, ky, kr * 0.65, kr * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if ((hg & 3) === 1) {
          ctx.fillStyle = 'rgba(46, 28, 12, 0.2)';
          ctx.fillRect(
            (w2 * (hg % 40)) / 100,
            yt + logH * (0.42 + ((hg >>> 11) % 22) / 100),
            w2 * (0.3 + ((hg >>> 6) % 35) / 100),
            Math.max(1, s * 0.026),
          );
        }
        if ((hg >>> 3) % 100 < 13 * skin.checkK) {
          ctx.fillStyle = 'rgba(26, 15, 6, 0.4)';
          ctx.fillRect(
            w2 * (0.18 + ((hg >>> 7) % 62) / 100),
            (hg & 8) === 0 ? yt : yb - logH * 0.3,
            Math.max(1, s * 0.024),
            logH * 0.3,
          );
        }
      }
      ctx.fillStyle = skin.plate;
      ctx.fillRect(0, -hs, w2, plateH);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.15)';
      ctx.fillRect(0, -hs, w2, s * 0.03);
      ctx.fillStyle = 'rgba(26, 15, 7, 0.4)';
      ctx.fillRect(0, -hs + plateH - s * 0.028, w2, s * 0.028);
      const hp = hashCoords(173, tx, ty);
      if ((hp & 3) !== 0) {
        ctx.fillStyle = 'rgba(40, 24, 10, 0.5)';
        const pgx = w2 * (0.2 + (hp % 30) / 100);
        ctx.fillRect(pgx, -hs + plateH * 0.28, s * 0.045, s * 0.045);
        if ((hp & 4) === 0) ctx.fillRect(pgx + s * 0.5, -hs + plateH * 0.28, s * 0.045, s * 0.045);
      }
    } else {
      // Running-bond masonry, courses at absolute stone height.
      ctx.strokeStyle = 'rgba(20, 14, 28, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.03);
      let band = 0;
      for (let cy2 = s * 0.39; cy2 < hs * 0.96; cy2 += s * 0.39, band++) {
        ctx.beginPath();
        ctx.moveTo(0, -cy2);
        ctx.lineTo(w2, -cy2);
        ctx.stroke();
        for (const fx of band % 2 === 0 ? [0.25, 0.75] : [0.5]) {
          ctx.beginPath();
          ctx.moveTo(w2 * fx, -cy2);
          ctx.lineTo(w2 * fx, -Math.min(hs * 0.96, cy2 + s * 0.39));
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(20, 12, 26, 0.2)';
      ctx.fillRect(0, -hs * 0.1, w2, hs * 0.1);
    }
    // Ambient-occlusion seam where the face meets the ground.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
    ctx.fillRect(0, -s * 0.06, w2, s * 0.06);
    ctx.restore();
  }

  /**
   * How veiled a doorway's dark interior fill is: 1 far away, easing
   * to 0 as any body nears the threshold — the door "opens" for
   * whoever approaches, no swinging leaf needed.
   */
  private doorVeil(_game: ClientGame, cx: number, cy: number): number {
    // The frame's disturber roster IS the player+NPC position list —
    // reuse it instead of re-scanning entities (sampleAt allocates,
    // and towns call this for every visible doorway every frame).
    let d2 = Infinity;
    for (const d of this.frameDisturbers) {
      const dd = (d.x - cx) ** 2 + (d.y - cy) ** 2;
      if (dd < d2) d2 = dd;
    }
    return Math.min(1, Math.max(0, (Math.sqrt(d2) - 0.7) / 0.9));
  }

  /**
   * One paneled timber door leaf on a south face, drawn in the current
   * (leaned) frame. `hx` is the hinge edge, `dir` which way the leaf
   * extends (+1 east, -1 west), `w` its current on-screen width — the
   * swing compresses width toward the hinge, so `oc` (0 shut → 1 open)
   * only drives the edge-on shading and detail fade. The grammar is
   * the side-door leaf's: recessed panels, iron straps at the hinge,
   * a brass knob riding the free edge.
   */
  private paintDoorLeaf(
    hx: number,
    dir: 1 | -1,
    w: number,
    yTop: number,
    h: number,
    base: string,
    oc: number,
    s: number,
  ): void {
    const ctx = this.ctx;
    const lx = dir > 0 ? hx : hx - w;
    // Turning edge-on, the face falls into its own shadow.
    ctx.fillStyle = shade(base, -Math.round(oc * 26));
    ctx.fillRect(lx, yTop, w, h);
    // A lit top rail keeps the leaf reading under the header shadow.
    ctx.fillStyle = 'rgba(255, 224, 170, 0.14)';
    ctx.fillRect(lx, yTop, w, s * 0.07);
    const detail = 1 - oc * 0.75;
    if (detail > 0.05) {
      // Two recessed panels — the casework grammar, compressing with
      // the leaf like true foreshortening.
      ctx.fillStyle = `rgba(26, 16, 8, ${0.35 * detail})`;
      for (const [py, ph] of [
        [yTop + h * 0.1, h * 0.36],
        [yTop + h * 0.56, h * 0.34],
      ] as const) {
        ctx.fillRect(lx + w * 0.18, py, w * 0.64, ph);
        ctx.fillStyle = `rgba(255, 224, 170, ${0.1 * detail})`;
        ctx.fillRect(lx + w * 0.18, py + ph - s * 0.03, w * 0.64, s * 0.03);
        ctx.fillStyle = `rgba(26, 16, 8, ${0.35 * detail})`;
      }
      // Iron straps at the hinge edge; the knob rides the free edge.
      const strapX = dir > 0 ? lx : lx + w - w * 0.3;
      ctx.fillStyle = `rgba(46, 42, 56, ${detail})`;
      for (const hy of [yTop + h * 0.16, yTop + h * 0.72]) {
        ctx.fillRect(strapX, hy, w * 0.3, s * 0.05);
      }
      const knobX = dir > 0 ? lx + w - s * 0.11 : lx + s * 0.06;
      ctx.fillStyle = `rgba(201, 160, 59, ${detail})`;
      ctx.fillRect(knobX, yTop + h * 0.48, s * 0.05, s * 0.05);
    }
    // The free edge catches light as the leaf stands ajar.
    if (oc > 0.15) {
      ctx.fillStyle = `rgba(255, 224, 170, ${0.16 * Math.min(1, oc * 1.4)})`;
      const edgeX = dir > 0 ? lx + w - s * 0.03 : lx;
      ctx.fillRect(edgeX, yTop, s * 0.03, h);
    }
    if (this.outlineOn) {
      this.beginStructOutline();
      this.ctx.strokeRect(lx, yTop, w, h);
    }
  }

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
  private doorwayItem(
    tile: Tile,
    tx: number,
    ty: number,
    game: ClientGame,
    whT: number,
    runLen = 1,
    region: InteriorRegion | null = null,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const isWallAt = (x: number, y: number) => this.wallish(game, x, y);
    const ex = tx + runLen - 1; // east-most tile of the run
    const nW = isWallAt(tx, ty - 1);
    const nE = isWallAt(ex, ty - 1);
    const e = isWallAt(ex + 1, ty);
    const w = isWallAt(tx - 1, ty);
    // Crown top edge / south lip only yield where EVERY run member
    // borders wall — a single tile reduces to the old per-tile read.
    let n = true;
    let sw = true;
    for (let i = 0; i < runLen; i++) {
      if (!isWallAt(tx + i, ty - 1)) n = false;
      if (!isWallAt(tx + i, ty + 1)) sw = false;
    }
    const stone = doorInfo(tile)!.material === 'stone';
    const skin = this.woodSkinFor(region);
    const top = stone ? '#8c8798' : skin.top;
    const face = stone ? '#5b5566' : skin.log;
    // Frame trim reads two steps lighter than the wall it pierces —
    // entrances must be findable at a glance from across the plaza.
    const trim = stone ? '#8a8496' : skin.trim;
    const syT = s * this.camera.yScale;
    const hs = whT * s;
    const rw = s * runLen; // the opening spans the whole run
    const x0 = p.x - 0.25;
    const x1 = p.x + rw + 0.25;
    const jw = s * 0.15;
    const r = s * 0.26;
    const radii: [number, number, number, number] = [!nW && !w ? r : 0, !nE && !e ? r : 0, 0, 0];
    const skew = (this.leanX(p.x + rw / 2, whT) - (p.x + rw / 2)) / -hs;
    return {
      sortY: ty + 1,
      drawShadow: () => {
        // Only the jambs cast — light passes through the opening.
        const yB = p.y + syT;
        this.castEdgeQuad(x0, yB, x0 + jw, yB, whT);
        this.castEdgeQuad(x1 - jw, yB, x1, yB, whT);
      },
      draw: () => {
        const yBase = p.y + syT;
        // All face-work in the leaned frame so jambs, header, and the
        // neighbouring walls' faces agree on the same skew.
        ctx.save();
        ctx.translate(0, yBase);
        ctx.transform(1, 0, skew, 1, 0, 0);
        // The dark interior seen through the opening; melts away as
        // anyone approaches the threshold.
        const hh = Math.max(0, hs - s * 1.56); // opening is FIXED height; the header grows (stubs have none)
        const veil = hh > s * 0.05 ? this.doorVeil(game, tx + runLen / 2, ty + 0.5) : 0;
        if (veil > 0.01) {
          ctx.fillStyle = `rgba(14, 10, 22, ${0.5 * veil})`;
          ctx.fillRect(x0 + jw, -hs, x1 - x0 - jw * 2, hs);
        }
        // THE DOOR LEAF(S). The tile is the state: shut tiles stand a
        // paneled timber leaf across the opening, open tiles leave it
        // swung inward — read edge-on as a thin strip at the hinge
        // jamb, so every doorway visibly HAS a door. Wide openings
        // hang a French pair meeting at an astragal seam; the swing
        // eases through doorOpenness and a locked refusal shudders the
        // whole leaf in its frame.
        {
          const dinfo = doorInfo(tile)!;
          const o = this.doorOpenness(tx, ty, dinfo.open);
          const oc = Math.min(1, o);
          const shakeDx = this.doorShakeAt(tx, ty) * s * 0.035;
          const ox0 = x0 + jw;
          const ox1 = x1 - jw;
          const ow = ox1 - ox0;
          const leafTop = -hs + hh;
          const leafH = hs - hh;
          // The leaf is always timber; a wood shell's door wears its
          // building's skin, a stone shell hangs plain oak.
          const base = stone ? '#6a4a26' : shade(skin.log, -8);
          if (dinfo.wide) {
            const half = ow / 2;
            const wLeaf = Math.max(half * 0.09, half * (1 - 0.91 * oc));
            this.paintDoorLeaf(ox0 + shakeDx, 1, wLeaf, leafTop, leafH, base, oc, s);
            this.paintDoorLeaf(ox1 + shakeDx, -1, wLeaf, leafTop, leafH, base, oc, s);
            if (oc < 0.12) {
              // The astragal: the dark meeting seam of a French pair.
              ctx.fillStyle = 'rgba(24, 14, 6, 0.55)';
              ctx.fillRect(ox0 + ow / 2 - s * 0.015 + shakeDx, leafTop, s * 0.03, leafH);
            }
          } else {
            const wLeaf = Math.max(ow * 0.09, ow * (1 - 0.91 * oc));
            this.paintDoorLeaf(ox0 + shakeDx, 1, wLeaf, leafTop, leafH, base, oc, s);
          }
        }
        // Header across the top: the opening below it clears ~1.56
        // tiles — the body walks UNDER the frame with real headroom.
        ctx.fillStyle = trim;
        ctx.fillRect(x0, -hs, x1 - x0, hh);
        if (stone && hh > s * 0.05) {
          // 45° haunches and a proud keystone — the brutalist arch.
          ctx.fillStyle = trim;
          const hy = -hs + hh;
          const cut = s * 0.2;
          for (const [jx, dir] of [
            [x0 + jw, 1],
            [x1 - jw, -1],
          ] as const) {
            ctx.beginPath();
            ctx.moveTo(jx, hy);
            ctx.lineTo(jx + cut * dir, hy);
            ctx.lineTo(jx, hy + cut);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = shade(trim, 14);
          const mid = p.x + rw / 2; // keystone rides the run's centre
          ctx.beginPath();
          ctx.moveTo(mid - s * 0.12, -hs + hh + s * 0.02);
          ctx.lineTo(mid + s * 0.12, -hs + hh + s * 0.02);
          ctx.lineTo(mid + s * 0.07, -hs + s * 0.02);
          ctx.lineTo(mid - s * 0.07, -hs + s * 0.02);
          ctx.closePath();
          ctx.fill();
        } else if (hh > s * 0.05) {
          // A visible timber lintel beam with end grain, pegged where
          // it lands on the jambs — the same joinery as the walls.
          ctx.fillStyle = shade(trim, 12);
          ctx.fillRect(x0 + s * 0.02, -hs + hh - s * 0.075, x1 - x0 - s * 0.04, s * 0.075);
          ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
          ctx.fillRect(x0 + jw + s * 0.02, -hs + hh * 0.45, s * 0.03, hh * 0.35);
          ctx.fillRect(x1 - jw - s * 0.05, -hs + hh * 0.45, s * 0.03, hh * 0.35);
          ctx.fillStyle = 'rgba(40, 24, 10, 0.55)';
          ctx.fillRect(x0 + jw * 0.4, -hs + hh - s * 0.155, s * 0.045, s * 0.045);
          ctx.fillRect(x1 - jw * 0.4 - s * 0.045, -hs + hh - s * 0.155, s * 0.045, s * 0.045);
        }
        // Underside shadow grounds the header over the opening.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
        ctx.fillRect(x0 + jw, -hs + hh, x1 - x0 - jw * 2, s * 0.05);
        // Jambs: full-height posts with lit inner edges and base
        // plinth blocks that root the frame to the ground.
        ctx.fillStyle = trim;
        ctx.fillRect(x0, -hs, jw, hs);
        ctx.fillRect(x1 - jw, -hs, jw, hs);
        ctx.fillStyle = shade(trim, 16);
        ctx.fillRect(x0 + jw - s * 0.035, -hs * 0.72, s * 0.035, hs * 0.72);
        ctx.fillRect(x1 - jw, -hs * 0.72, s * 0.035, hs * 0.72);
        ctx.fillStyle = shade(trim, -14);
        ctx.fillRect(x0 - s * 0.015, -hs * 0.12, jw + s * 0.03, hs * 0.12);
        ctx.fillRect(x1 - jw - s * 0.015, -hs * 0.12, jw + s * 0.03, hs * 0.12);
        // Threshold: a worn step across the opening.
        ctx.fillStyle = shade(trim, stone ? 22 : 30);
        ctx.fillRect(x0 + jw, -s * 0.07, x1 - x0 - jw * 2, s * 0.07);
        ctx.restore();
        // Crown: the run's top mass continues unbroken over the door.
        this.beginHeightLayer(whT);
        ctx.fillStyle = top;
        ctx.beginPath();
        chamferRect(ctx, x0, p.y - 0.25, rw + 0.5, syT + 0.5, radii);
        ctx.fill();
        if (!stone) this.woodCrownPlate(p, syT, s, x0, x1, tx, ty, (n || sw) && !(w || e));
        if (!sw) {
          ctx.fillStyle = shade(top, 16);
          ctx.fillRect(x0, p.y + syT - s * 0.08, rw + 0.5, s * 0.08);
        }
        ctx.restore();
        // SILHOUETTE OUTLINE: crown perimeter like a wall, PLUS the
        // entrance itself — a hard-edged opening frames the doorway so
        // it reads as a real threshold, not a painted gap. The jamb
        // feet ring the wall's ground contact either side of the door.
        if (this.outlineOn) {
          const cTop = p.y - 0.25 - hs;
          const fBot = p.y + syT;
          const headBot = fBot - hs + hh; // header underside
          const outline = new Path2D();
          this.addCrownPerimeter(outline, x0, x1, cTop, fBot, fBot, radii[0], radii[1], n, e, w);
          // The opening: up the inner jambs and across the header (the
          // threshold stays open — you walk through it).
          outline.moveTo(x0 + jw, fBot);
          outline.lineTo(x0 + jw, headBot);
          outline.lineTo(x1 - jw, headBot);
          outline.lineTo(x1 - jw, fBot);
          if (!sw) {
            outline.moveTo(x0, fBot);
            outline.lineTo(x0 + jw, fBot);
            outline.moveTo(x1 - jw, fBot);
            outline.lineTo(x1, fBot);
          }
          this.beginStructOutline();
          ctx.stroke(outline);
        }
      },
    };
  }

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
  private sideDoorwayItems(
    tile: Tile,
    tx: number,
    ty: number,
    game: ClientGame,
    runLen: number,
    items: DrawItem[],
  ): void {
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const elevated = game.world.elevAt(tx, ty) !== 0;
    const stone = doorInfo(tile)!.material === 'stone';
    // A side door's frame carries its building's wood skin too.
    const skin = this.woodSkinFor(this.wallRegion(game, tx, ty));
    const trim = stone ? '#8a8496' : skin.trim;
    const syT = s * this.camera.yScale;
    const hs = WALL_H * s;
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    const gapH = syT * runLen; // gap tile band, plan view
    const cy = p.y + gapH / 2;
    const push = (item: DrawItem): void => {
      if (elevated) item.elevated = true;
      items.push(item);
    };

    // Passage floor + porch steps: the ground-level affordance.
    push({
      sortY: ty,
      draw: () => {
        const ctx = this.ctx;
        // Worn threshold paving through the opening — same tone law
        // as the south doorframe's step.
        ctx.fillStyle = shade(trim, stone ? 22 : 30);
        ctx.fillRect(p.x + s * 0.07, p.y + syT * 0.05, s * 0.86, gapH - syT * 0.1);
        // Wear from feet: two faint tracks in the walk direction.
        ctx.fillStyle = 'rgba(26, 20, 36, 0.14)';
        ctx.fillRect(p.x + s * 0.07, cy - syT * 0.26, s * 0.86, syT * 0.13);
        ctx.fillRect(p.x + s * 0.07, cy + syT * 0.13, s * 0.86, syT * 0.13);
        // Porch landings on BOTH walkable sides: proper entry slabs as
        // tall as the opening, in columns the wall crowns never cover
        // — the ground-level cue that survives any run length.
        const landH = gapH + syT * 0.26;
        for (const [sx0, sx1] of [
          [p.x - s * 0.42, p.x + s * 0.05],
          [p.x + s * 0.95, p.x + s * 1.42],
        ] as const) {
          ctx.fillStyle = shade(trim, stone ? 14 : 18);
          ctx.fillRect(sx0, cy - landH / 2, sx1 - sx0, landH);
          // Lit north lip + shaded south edge ground the slab.
          ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
          ctx.fillRect(sx0, cy - landH / 2, sx1 - sx0, syT * 0.12);
          ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
          ctx.fillRect(sx0, cy + landH / 2 - syT * 0.12, sx1 - sx0, syT * 0.12);
          // A seam line splits the slab into two worn treads.
          ctx.fillStyle = 'rgba(26, 20, 36, 0.18)';
          ctx.fillRect(sx0, cy - Math.max(1, s * 0.015), sx1 - sx0, Math.max(1, s * 0.03));
          if (this.outlineOn) {
            this.beginStructOutline();
            ctx.strokeRect(sx0, cy - landH / 2, sx1 - sx0, landH);
          }
        }
      },
    });

    // THE DOOR LEAF — the tile is the state. An OPEN side door stands
    // its leaf thrown open OUTSIDE the wall: swung 90° from a N-S
    // wall a leaf's face squares to this camera, and the neighbour
    // column is the one place no southern crown can ever bury it. A
    // SHUT door swings the leaf back INTO the wall plane, where it
    // reads edge-on — a timber slab filling the notch at door height,
    // the honest closed-run silhouette. The swing between the poses
    // pivots on the north-jamb hinge (doorOpenness eases it), and a
    // locked refusal shudders whichever pose is standing.
    const eastIn = this.interiors.regionAt(game, tx + 1, ty) !== null;
    const westIn = this.interiors.regionAt(game, tx - 1, ty) !== null;
    // The leaf hangs on the OUTDOOR side; facing two exteriors (a
    // freestanding wall) or two interiors (a connector), west wins.
    const side: -1 | 1 = westIn && !eastIn ? 1 : -1;
    // One leaf per opening: a flanking pair on a wide door stacks
    // into an unreadable panel column at this camera (leaves are
    // taller on screen than the opening's plan span), so a wide door
    // hangs a single broad barn-style leaf instead.
    const lw = s * (runLen > 1 ? 0.8 : 0.62); // leaf width along the wall face
    const doorH = s * 1.5; // leaf height under the 1.56 headroom
    const leafX0 = side < 0 ? x0 - lw : x1;
    const hingeAtWest = side > 0; // hinge edge hugs the wall line
    const dinfo = doorInfo(tile)!;
    const base = stone ? '#6a4a26' : shade(skin.log, -8);
    const oNow = Math.min(1, this.doorOpenness(tx, ty, dinfo.open));
    push({
      // Open: the leaf lives in the neighbour column, north-anchored.
      // Shut/swinging: the slab spans the gap and must draw over the
      // north wall-end's face (sortY ty) yet under the south restart.
      sortY: oNow > 0.5 ? ty + 0.05 : ty + 0.6,
      drawShadow: () => {
        const o = Math.min(1, this.doorOpenness(tx, ty, dinfo.open));
        if (o > 0.5) {
          const baseY = p.y + syT * 0.1;
          this.castEdgeQuad(leafX0, baseY, leafX0 + lw, baseY, 1.5);
        } else {
          const xc = p.x + s * 0.5;
          this.castEdgeQuad(xc, p.y + syT * 0.08, xc, p.y + gapH - syT * 0.08, 1.5);
        }
      },
      draw: () => {
        const ctx = this.ctx;
        const o = Math.min(1, this.doorOpenness(tx, ty, dinfo.open));
        const shake = this.doorShakeAt(tx, ty);
        if (o >= 0.98) {
          // FULLY OPEN: the detailed thrown-open leaf, face-on.
          const baseY = p.y + syT * 0.1;
          const yT = baseY - doorH;
          // Contact shade roots the leaf where it stands.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
          ctx.fillRect(leafX0 + s * 0.02, baseY - s * 0.025, lw - s * 0.04, s * 0.06);
          // The leaf: timber board face with a lit top rail.
          ctx.fillStyle = base;
          ctx.fillRect(leafX0, yT, lw, doorH);
          ctx.fillStyle = 'rgba(255, 224, 170, 0.14)';
          ctx.fillRect(leafX0, yT, lw, s * 0.07);
          // Two recessed panels, the same casework grammar as cupboard
          // doors: dark inset + a thin lit bottom lip each.
          ctx.fillStyle = 'rgba(26, 16, 8, 0.35)';
          for (const [py, ph] of [
            [yT + doorH * 0.12, doorH * 0.34],
            [yT + doorH * 0.56, doorH * 0.34],
          ] as const) {
            ctx.fillRect(leafX0 + lw * 0.18, py, lw * 0.64, ph);
            ctx.fillStyle = 'rgba(255, 224, 170, 0.1)';
            ctx.fillRect(leafX0 + lw * 0.18, py + ph - s * 0.03, lw * 0.64, s * 0.03);
            ctx.fillStyle = 'rgba(26, 16, 8, 0.35)';
          }
          // Iron strap hinges on the wall-side edge; brass handle on
          // the swinging edge.
          const hingeX = hingeAtWest ? leafX0 : leafX0 + lw - lw * 0.3;
          ctx.fillStyle = '#2e2a38';
          for (const hy of [yT + doorH * 0.16, yT + doorH * 0.72]) {
            ctx.fillRect(hingeX, hy, lw * 0.3, s * 0.055);
          }
          const knobX = hingeAtWest ? leafX0 + lw - s * 0.12 : leafX0 + s * 0.07;
          ctx.fillStyle = '#c9a03b';
          ctx.fillRect(knobX, yT + doorH * 0.47, s * 0.05, s * 0.05);
          if (this.outlineOn) {
            this.beginStructOutline();
            ctx.strokeRect(leafX0, yT, lw, doorH);
          }
          return;
        }
        if (o <= 0.02) {
          // SHUT: the leaf sits in the wall plane, edge-on — a slab
          // read as its lifted top-edge ribbon spanning the gap plus
          // the south end face dropping to the threshold. A locked
          // rattle shudders the whole slab in the frame.
          const xc = p.x + s * 0.5 + shake * s * 0.035;
          const slabW = s * 0.16;
          // South end face: the door's visible end grain.
          ctx.fillStyle = shade(base, -10);
          ctx.fillRect(xc - slabW / 2, p.y + gapH - doorH, slabW, doorH);
          // Top edge ribbon: the door's top riding door-height over
          // the passage — the mini-crown that fills the notch.
          ctx.fillStyle = shade(base, 18);
          ctx.fillRect(xc - slabW / 2, p.y - doorH, slabW, gapH);
          // Lit south lip where ribbon meets end face.
          ctx.fillStyle = 'rgba(255, 224, 170, 0.12)';
          ctx.fillRect(xc - slabW / 2, p.y + gapH - doorH - syT * 0.1, slabW, syT * 0.1);
          // Contact shade at the threshold.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
          ctx.fillRect(xc - slabW / 2 - s * 0.02, p.y + gapH - s * 0.03, slabW + s * 0.04, s * 0.05);
          if (this.outlineOn) {
            this.beginStructOutline();
            ctx.strokeRect(xc - slabW / 2, p.y - doorH, slabW, gapH + doorH);
          }
          return;
        }
        // MID-SWING: the leaf pivots on its north-jamb hinge — the
        // free edge sweeps an arc from the wall plane (edge-on, cos
        // component south along the run) out to the neighbour column
        // (face-on, sin component outward). One quad, foreshortening
        // honestly through the whole sweep.
        const th = (o * Math.PI) / 2;
        const hx = (side < 0 ? x0 : x1) + shake * s * 0.02;
        const hyB = p.y + syT * 0.1;
        const fxB = hx + side * lw * Math.sin(th);
        const fyB = hyB + lw * 0.95 * Math.cos(th) * (syT / s);
        const quad = new Path2D();
        quad.moveTo(hx, hyB);
        quad.lineTo(fxB, fyB);
        quad.lineTo(fxB, fyB - doorH);
        quad.lineTo(hx, hyB - doorH);
        quad.closePath();
        ctx.fillStyle = shade(base, -Math.round((1 - Math.sin(th)) * 24));
        ctx.fill(quad);
        // Lit top edge tracks the sweep.
        ctx.beginPath();
        ctx.moveTo(hx, hyB - doorH);
        ctx.lineTo(fxB, fyB - doorH);
        ctx.lineTo(fxB, fyB - doorH + s * 0.06);
        ctx.lineTo(hx, hyB - doorH + s * 0.06);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 224, 170, 0.14)';
        ctx.fill();
        if (this.outlineOn) {
          this.beginStructOutline();
          ctx.stroke(quad);
        }
      },
    });
  }

  /**
   * A freestanding walk-through arch: thicker piers than a doorway,
   * capital blocks, its own crown. Adjacent arches merge into
   * colonnades (piers on the shared edge are skipped).
   */
  private archItem(tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const isArch = (t: number | undefined) => t === Tile.ArchStone;
    const ae = isArch(game.world.groundAt(tx + 1, ty));
    const aw = isArch(game.world.groundAt(tx - 1, ty));
    const top = '#8c8798';
    const face = '#5b5566';
    const syT = s * this.camera.yScale;
    const hs = WALL_H * s;
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    const pw = s * 0.2;
    const r = s * 0.26;
    const skew = (this.leanX(p.x + s / 2, WALL_H) - (p.x + s / 2)) / -hs;
    return {
      sortY: ty + 1,
      drawShadow: () => {
        const yB = p.y + syT;
        if (!aw) this.castEdgeQuad(x0, yB, x0 + pw, yB, WALL_H);
        if (!ae) this.castEdgeQuad(x1 - pw, yB, x1, yB, WALL_H);
      },
      draw: () => {
        const yBase = p.y + syT;
        ctx.save();
        ctx.translate(0, yBase);
        ctx.transform(1, 0, skew, 1, 0, 0);
        // Lintel band spanning the tile (continuous through a run),
        // with a course line so the entablature reads as laid stone.
        const hh = hs * 0.26;
        ctx.fillStyle = face;
        ctx.fillRect(x0, -hs, x1 - x0, hh);
        ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
        ctx.fillRect(x0, -hs + hh * 0.5, x1 - x0, s * 0.03);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
        ctx.fillRect(x0 + (aw ? 0 : pw), -hs + hh, x1 - x0 - (aw ? 0 : pw) - (ae ? 0 : pw), s * 0.05);
        // Piers at run ends only: plinth-rooted, hauched, lit capital.
        const pier = (px0: number, dir: 1 | -1): void => {
          ctx.fillStyle = face;
          ctx.fillRect(px0, -hs, pw, hs);
          ctx.beginPath();
          const inner = dir > 0 ? px0 + pw : px0;
          ctx.moveTo(inner, -hs + hh);
          ctx.lineTo(inner + s * 0.18 * dir, -hs + hh);
          ctx.lineTo(inner, -hs + hh + s * 0.18);
          ctx.closePath();
          ctx.fill();
          // Capital + base plinth.
          ctx.fillStyle = shade(face, 16);
          ctx.fillRect(px0 - s * 0.02, -hs + hh, pw + s * 0.04, s * 0.06);
          ctx.fillStyle = shade(face, -10);
          ctx.fillRect(px0 - s * 0.02, -hs * 0.12, pw + s * 0.04, hs * 0.12);
          // A sunlit arris up the pier's west edge.
          ctx.fillStyle = shade(face, 12);
          ctx.fillRect(px0 + s * 0.015, -hs * 0.7, s * 0.035, hs * 0.58);
        };
        if (!aw) pier(x0, 1);
        if (!ae) pier(x1 - pw, -1);
        ctx.restore();
        // Crown: the arch's own top slab.
        this.beginHeightLayer(WALL_H);
        ctx.fillStyle = top;
        ctx.beginPath();
        chamferRect(ctx, x0, p.y - 0.25, s + 0.5, syT + 0.5, [aw ? 0 : r, ae ? 0 : r, 0, 0]);
        ctx.fill();
        ctx.fillStyle = shade(top, 16);
        ctx.fillRect(x0, p.y + syT - s * 0.08, s + 0.5, s * 0.08);
        ctx.restore();
        // SILHOUETTE OUTLINE: crown top + pier sides, and the archway
        // void. The lintel underside spans every tile (arcades read as
        // one continuous span), but the opening's vertical reveals are
        // stroked ONLY at run ends where a pier actually stands.
        if (this.outlineOn) {
          const cTop = p.y - 0.25 - hs;
          const fBot = p.y + syT;
          const lintelBot = fBot - hs + hh;
          const leftInner = aw ? x0 : x0 + pw;
          const rightInner = ae ? x1 : x1 - pw;
          const outline = new Path2D();
          this.addCrownPerimeter(outline, x0, x1, cTop, fBot, fBot, aw ? 0 : r, ae ? 0 : r, false, ae, aw);
          outline.moveTo(leftInner, lintelBot);
          outline.lineTo(rightInner, lintelBot);
          if (!aw) {
            outline.moveTo(x0 + pw, lintelBot);
            outline.lineTo(x0 + pw, fBot);
            outline.moveTo(x0, fBot);
            outline.lineTo(x0 + pw, fBot);
          }
          if (!ae) {
            outline.moveTo(x1 - pw, lintelBot);
            outline.lineTo(x1 - pw, fBot);
            outline.moveTo(x1 - pw, fBot);
            outline.lineTo(x1, fBot);
          }
          this.beginStructOutline();
          ctx.stroke(outline);
        }
      },
    };
  }

  /**
   * The Riftgate: the dungeon portal's monumental stone archway with
   * its vortex membrane (portal.ts owns the painters). The plane sits
   * at the tile's SOUTH edge, so a body standing on the tile sorts
   * behind the veil — stepping onto the portal reads as being
   * swallowed by it. Always live-painted: the vortex never sleeps, and
   * portals are rare enough that caching would buy nothing.
   */
  private portalItem(tx: number, ty: number, up: boolean, game: ClientGame): DrawItem {
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const syT = s * this.camera.yScale;
    const yB = p.y + PORTAL_PLANE * syT + 0.12 * syT;
    const X0 = p.x - 0.16 * s;
    const X1 = p.x + 1.16 * s;
    const pw = 0.26 * s;
    return {
      sortY: ty + PORTAL_PLANE,
      drawShadow: () => {
        // The piers cast like wall-ends; the open mouth casts nothing.
        this.castEdgeQuad(X0, yB, X0 + pw, yB, 1.4);
        this.castEdgeQuad(X1 - pw, yB, X1, yB, 1.4);
      },
      draw: () =>
        drawPortalArch(this.ctx, {
          px: p.x,
          py: p.y,
          s,
          syT,
          up,
          t: performance.now() / 1000,
          tx,
          ty,
          outline: this.outlineOn ? () => this.beginStructOutline() : null,
        }),
    };
  }

  /**
   * A freestanding column: faceted plinth, tapered shaft that leans
   * with the camera, chamfered capital. Solid, walk-around, y-sorted
   * like a prop.
   */
  private pillarItem(tx: number, ty: number, game: ClientGame): DrawItem {
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx + 0.5, ty + 0.5, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const syT = s * this.camera.yScale;
    const H = 1.7;
    const baseY0 = p.y + syT * 0.16;
    const topY0 = baseY0 - H * s;
    return {
      sortY: ty + 0.8,
      // Freestanding column, ringed like any prop (baked outline) so
      // it stops standing out of place among the outlined world.
      body: {
        x: p.x - s * 0.3,
        y: topY0 - s * 0.12,
        w: s * 0.6,
        h: baseY0 + s * 0.14 - (topY0 - s * 0.12),
      },
      drawShadow: () => {
        const baseY = p.y + syT * 0.16;
        this.castEdgeQuad(p.x - s * 0.17, baseY, p.x + s * 0.17, baseY, H);
      },
      draw: () => {
        // Read the ctx at DRAW time: the ring bake swaps this.ctx to a
        // scratch canvas under our closure (a captured ctx would paint
        // the column onto the main canvas and bake an empty sprite).
        const ctx = this.ctx;
        const baseY = p.y + syT * 0.16;
        const topX = this.leanX(p.x, H);
        const topY = baseY - H * s;
        // Contact shade roots the column to the pavement.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, baseY + s * 0.02, s * 0.26, s * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        // Plinth: a two-step faceted stone foot.
        ctx.fillStyle = '#4f4a5c';
        ctx.beginPath();
        facetCircle(ctx, p.x, baseY - s * 0.04, s * 0.24, 6, 0.25, 0.55);
        ctx.fill();
        ctx.fillStyle = '#5d5768';
        ctx.beginPath();
        facetCircle(ctx, p.x, baseY - s * 0.1, s * 0.19, 6, 0.25, 0.55);
        ctx.fill();
        // Tapered shaft, leaning with the fake camera, with a banded
        // drum joint like the masonry it stands among.
        ctx.fillStyle = '#6f697c';
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.15, baseY - s * 0.1);
        ctx.lineTo(p.x + s * 0.15, baseY - s * 0.1);
        ctx.lineTo(topX + s * 0.11, topY + s * 0.16);
        ctx.lineTo(topX - s * 0.11, topY + s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 14, 28, 0.28)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (const f of [0.38, 0.68]) {
          const jy = baseY - s * 0.1 + (topY + s * 0.16 - (baseY - s * 0.1)) * f;
          const jx = p.x + (topX - p.x) * f;
          const jw2 = s * (0.15 - 0.04 * f);
          ctx.beginPath();
          ctx.moveTo(jx - jw2, jy);
          ctx.lineTo(jx + jw2, jy);
          ctx.stroke();
        }
        // Sunlit western arris keeps the shaft round-read; the east
        // side falls into shade.
        ctx.fillStyle = shade('#6f697c', 14);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.15, baseY - s * 0.1);
        ctx.lineTo(p.x - s * 0.09, baseY - s * 0.1);
        ctx.lineTo(topX - s * 0.065, topY + s * 0.16);
        ctx.lineTo(topX - s * 0.11, topY + s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade('#6f697c', -10);
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.1, baseY - s * 0.1);
        ctx.lineTo(p.x + s * 0.15, baseY - s * 0.1);
        ctx.lineTo(topX + s * 0.11, topY + s * 0.16);
        ctx.lineTo(topX + s * 0.07, topY + s * 0.16);
        ctx.closePath();
        ctx.fill();
        // Capital: abacus over an echinus flare, both lit.
        ctx.fillStyle = '#7f7990';
        ctx.beginPath();
        ctx.moveTo(topX - s * 0.12, topY + s * 0.16);
        ctx.lineTo(topX + s * 0.12, topY + s * 0.16);
        ctx.lineTo(topX + s * 0.16, topY + s * 0.06);
        ctx.lineTo(topX - s * 0.16, topY + s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8c8798';
        ctx.beginPath();
        chamferRect(ctx, topX - s * 0.19, topY - s * 0.06, s * 0.38, s * 0.12, s * 0.03);
        ctx.fill();
        ctx.fillStyle = shade('#8c8798', 16);
        ctx.fillRect(topX - s * 0.16, topY - s * 0.045, s * 0.32, s * 0.04);
      },
    };
  }

  /**
   * A half-height railing: posts, a top rail, baluster slats. Rails
   * merge with rails only — a railing never joins a wall mass.
   */
  private railItem(tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    // Hip height on the 1.15-tile body — a rail you'd rest a hand on.
    const RAIL_H = 0.52;
    const isRail = (t: number | undefined) => t === Tile.RailWood;
    const rn = isRail(game.world.groundAt(tx, ty - 1));
    const re = isRail(game.world.groundAt(tx + 1, ty));
    const rs = isRail(game.world.groundAt(tx, ty + 1));
    const rw = isRail(game.world.groundAt(tx - 1, ty));
    const horizontal = re || rw || (!rn && !rs);
    const post = '#6f4d26';
    const rail = '#8a6534';
    const syT = s * this.camera.yScale;
    const hr = RAIL_H * s;
    const x0 = p.x - 0.25;
    const x1 = p.x + s + 0.25;
    return {
      sortY: ty + 1,
      drawShadow: horizontal
        ? () => this.castEdgeQuad(x0, p.y + syT, x1, p.y + syT, RAIL_H)
        : undefined,
      draw: () => {
        const yBase = p.y + syT;
        if (horizontal) {
          // Balusters under the rail; end posts where the run stops.
          ctx.fillStyle = post;
          for (const fx of [0.28, 0.72]) {
            ctx.fillRect(p.x + s * fx - s * 0.035, yBase - hr, s * 0.07, hr);
          }
          if (!rw) ctx.fillRect(x0, yBase - hr, s * 0.1, hr);
          if (!re) ctx.fillRect(x1 - s * 0.1, yBase - hr, s * 0.1, hr);
          // Top rail in the height frame so runs read as one member.
          this.beginHeightLayer(RAIL_H);
          ctx.fillStyle = rail;
          ctx.beginPath();
          chamferRect(ctx, x0, p.y + syT * 0.3, s + 0.5, syT * 0.4, s * 0.04);
          ctx.fill();
          ctx.fillStyle = shade(rail, 14);
          ctx.fillRect(x0, p.y + syT * 0.3, s + 0.5, s * 0.045);
          ctx.restore();
        } else {
          // North-south run marching in depth: the fence law at rail
          // height — twin thin rails through chamfer-topped posts.
          const cx = p.x + s * 0.5;
          const cy = p.y + syT * 0.5;
          const yTop = rn ? cy - syT : cy;
          const yBot = rs ? cy + syT : cy;
          const railT = Math.max(2, s * 0.07);
          ctx.fillStyle = rail;
          for (const rx of [-0.09, 0.09]) {
            ctx.fillRect(cx + rx * s - railT / 2, yTop - hr * 0.88, railT, yBot - yTop + railT);
          }
          ctx.fillStyle = post;
          ctx.beginPath();
          chamferRect(ctx, cx - s * 0.07, cy - hr, s * 0.14, hr, [s * 0.04, s * 0.04, 0, 0]);
          ctx.fill();
          ctx.fillStyle = shade(post, 16);
          ctx.fillRect(cx - s * 0.05, cy - hr + s * 0.015, s * 0.1, s * 0.05);
        }
      },
    };
  }

  /** Memoized span walk-axis (true = walk runs N-S), cleared on any
   *  world change — one flood per span, shared with the bake's law. */
  private readonly bridgeAxisMemo = new Map<number, boolean>();
  private bridgeAxisVersion = -1;

  private bridgeWalkVert(game: ClientGame, tx: number, ty: number): boolean {
    if (game.worldVersion !== this.bridgeAxisVersion) {
      this.bridgeAxisMemo.clear();
      this.bridgeApronMemo.clear();
      this.bridgeAxisVersion = game.worldVersion;
    }
    const key = tx * 100000 + ty;
    let v = this.bridgeAxisMemo.get(key);
    if (v === undefined) {
      v = deckWalkIsVertical((x, y) => game.world.groundAt(x, y), tx, ty, this.bridgeAxisMemo);
    }
    return v;
  }

  /** Memoized apron verdict — renderLift is hot and the neighbor
   *  probes must run once per tile. Cleared with the axis memo. */
  private readonly bridgeApronMemo = new Map<number, BridgeApron>();

  private bridgeApron(game: ClientGame, tx: number, ty: number): BridgeApron {
    const vert = this.bridgeWalkVert(game, tx, ty); // also version-syncs the memos
    const key = tx * 100000 + ty;
    let v = this.bridgeApronMemo.get(key);
    if (v === undefined) {
      v = bridgeApronAt((x, y) => game.world.groundAt(x, y), tx, ty, vert);
      this.bridgeApronMemo.set(key, v);
    }
    return v;
  }

  /** Memoized 45° notch-fill verdict (deckFillAt) — probed per water
   *  tile in the item collect and per rail edge, so it must cost one
   *  neighbor scan per tile, not one per query. worldVersion-cleared
   *  like the dock memo. */
  private readonly deckFillMemo = new Map<number, DeckFill | null>();
  private deckFillVersion = -1;

  private deckFill(game: ClientGame, tx: number, ty: number): DeckFill | null {
    if (game.worldVersion !== this.deckFillVersion) {
      this.deckFillMemo.clear();
      this.deckFillVersion = game.worldVersion;
    }
    const key = packTile(tx, ty);
    let v = this.deckFillMemo.get(key);
    if (v === undefined) {
      v = deckFillAt((x, y) => game.world.groundAt(x, y), tx, ty);
      this.deckFillMemo.set(key, v);
    }
    return v;
  }

  /**
   * The parapet across a notch fill's hypotenuse: posts and slanted
   * members spanning corner to corner of the 45° edge, riding the
   * full deck lift (fills never sit in a ramping run — the run law
   * flattens ragged spans). Sort follows the diagonal-sort law: a
   * camera-facing hyp draws in front of the bodies north of it, a
   * far-side hyp sorts behind the deck's traffic.
   */
  private deckFillRailItem(
    tx: number,
    ty: number,
    legs: DeckFillLegs,
    game: ClientGame,
    items: DrawItem[],
  ): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const elevated = game.world.elevAt(tx, ty) !== 0;
    const lift = game.world.elevAt(tx, ty) * ELEV_H + DOCK_LIFT;
    // Hyp endpoints in world corners: NE/SW legs span the main
    // diagonal (NW->SE corner), NW/SE legs the anti-diagonal.
    const diagMain = legs === 'NE' || legs === 'SW';
    const ax = diagMain ? tx : tx + 1;
    const bx = diagMain ? tx + 1 : tx;
    const southFacing = legs[0] === 'N';
    const post = '#6f4d26';
    const rail = '#8a6534';
    const hr = 0.46 * s;
    const railT = Math.max(2, s * 0.07);
    items.push({
      sortY: southFacing ? ty + 1.02 : ty + 0.04,
      elevated,
      draw: () => {
        const a = this.camera.worldToScreen(ax, ty, this.w, this.h);
        const b = this.camera.worldToScreen(bx, ty + 1, this.w, this.h);
        a.y -= lift * s;
        b.y -= lift * s;
        ctx.fillStyle = post;
        for (const f of [0.3, 0.7]) {
          const x = a.x + (b.x - a.x) * f;
          const y = a.y + (b.y - a.y) * f;
          ctx.fillRect(x - s * 0.035, y - hr, s * 0.07, hr);
        }
        // Members as quads between the two end heights — the same
        // three-course build as the straight rails, slanted along
        // the hypotenuse.
        const member = (yOfs: number, tk: number): void => {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - yOfs);
          ctx.lineTo(b.x, b.y - yOfs);
          ctx.lineTo(b.x, b.y - yOfs + tk);
          ctx.lineTo(a.x, a.y - yOfs + tk);
          ctx.closePath();
          ctx.fill();
        };
        ctx.fillStyle = shade(rail, -10);
        member(hr * 0.52, railT * 0.7);
        ctx.fillStyle = rail;
        member(hr, railT * 1.15);
        ctx.fillStyle = shade(rail, 14);
        member(hr, Math.max(1, s * 0.02));
      },
    });
  }

  /**
   * A bridge's hip-height parapet: one live rail item per exposed
   * SIDE edge — the edges perpendicular to the span's walk axis — so
   * the rail line runs the whole crossing, bank apron to bank apron,
   * while both walk ends stay open. These are y-sorted items, never
   * bake: a body crossing the deck sorts behind the south rail.
   */
  private bridgeRailItems(tx: number, ty: number, game: ClientGame, items: DrawItem[]): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const isDeck = (t: number | undefined): boolean => t === Tile.Bridge || t === Tile.Dock;
    const g = (x: number, y: number): number | undefined => game.world.groundAt(x, y);
    const fill = (x: number, y: number): DeckFill | null => this.deckFill(game, x, y);
    // A tile carries this edge's rail if it's a bridge deck whose
    // matching edge is an exposed SIDE — the same test decides the
    // neighbors, so runs read as one continuous parapet. An edge
    // welded to a 45° notch fill is interior: the fill's own diagonal
    // rail item carries the parapet across the hypotenuse instead.
    const edgeFilled = (x: number, y: number, dx: number, dy: number): boolean => {
      const f = fill(x + dx, y + dy);
      if (f === null) return false;
      const edge = dy < 0 ? 'S' : dy > 0 ? 'N' : dx < 0 ? 'E' : 'W';
      return f.legs[0] === edge || f.legs[1] === edge;
    };
    const railEdge = (x: number, y: number, dx: number, dy: number): boolean =>
      g(x, y) === Tile.Bridge &&
      this.isDockAt(game, x, y) &&
      !isDeck(g(x + dx, y + dy)) &&
      !edgeFilled(x, y, dx, dy) &&
      (dy !== 0 ? !this.bridgeWalkVert(game, x, y) : this.bridgeWalkVert(game, x, y));
    const elevated = game.world.elevAt(tx, ty) !== 0;
    const elevLift = game.world.elevAt(tx, ty) * ELEV_H;
    // On an apron the rail rides the ramp: lift varies along the walk
    // fraction, matching renderLift and the bake's shear exactly.
    const apron = this.bridgeApron(game, tx, ty);
    const liftAt = (f: number): number => {
      if (apron === 'none') return elevLift + DOCK_LIFT;
      const u = apron === 'W' || apron === 'N' ? f : 1 - f;
      return elevLift + DOCK_LIFT * u;
    };
    const post = '#6f4d26';
    const rail = '#8a6534';
    const RAIL_H = 0.46;
    const hr = RAIL_H * s;
    const railT = Math.max(2, s * 0.07);

    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      if (!railEdge(tx, ty, dx, dy)) continue;
      if (dy !== 0) {
        const north = dy < 0;
        // A rail continues past its end when the straight run does OR
        // when a notch fill's hypotenuse picks the line up at exactly
        // that corner — the specific legs whose hyp endpoint lands
        // there. Continuation only suppresses the end post.
        const contW =
          railEdge(tx - 1, ty, dx, dy) || fill(tx - 1, ty)?.legs === (north ? 'SE' : 'NE');
        const contE =
          railEdge(tx + 1, ty, dx, dy) || fill(tx + 1, ty)?.legs === (north ? 'SW' : 'NW');
        items.push({
          sortY: north ? ty + 0.04 : ty + 1.02,
          elevated,
          draw: () => {
            const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
            const edge = north ? 0 : syT;
            const yAt = (f: number): number => p.y + edge - liftAt(f) * s;
            ctx.fillStyle = post;
            for (const fx of [0.28, 0.72]) {
              ctx.fillRect(p.x + s * fx - s * 0.035, yAt(fx) - hr, s * 0.07, hr);
            }
            if (!contW) ctx.fillRect(p.x - 0.25, yAt(0) - hr, s * 0.1, hr);
            if (!contE) ctx.fillRect(p.x + s + 0.25 - s * 0.1, yAt(1) - hr, s * 0.1, hr);
            // Members as quads between the two end heights, so a
            // ramp's rail slopes with its deck; on a flat span they
            // collapse to the straight fence law. Mid rail behind
            // the posts, then the top member with a lit crown.
            const member = (yOfs: number, tk: number): void => {
              ctx.beginPath();
              ctx.moveTo(p.x - 0.25, yAt(0) - yOfs);
              ctx.lineTo(p.x + s + 0.25, yAt(1) - yOfs);
              ctx.lineTo(p.x + s + 0.25, yAt(1) - yOfs + tk);
              ctx.lineTo(p.x - 0.25, yAt(0) - yOfs + tk);
              ctx.closePath();
              ctx.fill();
            };
            ctx.fillStyle = shade(rail, -10);
            member(hr * 0.52, railT * 0.7);
            ctx.fillStyle = rail;
            member(hr, railT * 1.15);
            ctx.fillStyle = shade(rail, 14);
            member(hr, Math.max(1, s * 0.02));
          },
        });
      } else {
        const west = dx < 0;
        // Same fill-continuation law as the horizontal rails: the
        // twin verticals run all the way to the corner where a notch
        // fill's diagonal rail takes over, instead of stopping at the
        // half-tile end-of-run post.
        const contN =
          railEdge(tx, ty - 1, dx, dy) || fill(tx, ty - 1)?.legs === (west ? 'SE' : 'SW');
        const contS =
          railEdge(tx, ty + 1, dx, dy) || fill(tx, ty + 1)?.legs === (west ? 'NE' : 'NW');
        items.push({
          sortY: ty + 1,
          elevated,
          draw: () => {
            const p = this.camera.worldToScreen(tx, ty, this.w, this.h);
            const ex = p.x + (west ? s * 0.055 : s - s * 0.055);
            // Depth fraction → screen y, riding the ramp's lift.
            const yAt = (f: number): number => p.y + syT * f - liftAt(f) * s;
            const fTop = contN ? 0 : 0.5;
            const fBot = contS ? 1 : 0.5;
            const cy = yAt(0.5);
            // Twin thin rails marching in depth through a
            // chamfer-topped post at the tile's middle.
            ctx.fillStyle = rail;
            for (const rx of [-0.045, 0.045]) {
              const yT = yAt(fTop) - hr * 0.88;
              const yB = yAt(fBot) + railT;
              ctx.fillRect(ex + rx * s - railT / 2, yT, railT, yB - yT);
            }
            ctx.fillStyle = post;
            ctx.beginPath();
            chamferRect(ctx, ex - s * 0.06, cy - hr, s * 0.12, hr, [s * 0.035, s * 0.035, 0, 0]);
            ctx.fill();
            ctx.fillStyle = shade(post, 16);
            ctx.fillRect(ex - s * 0.045, cy - hr + s * 0.015, s * 0.09, s * 0.045);
          },
        });
      }
    }
  }

  // ----------------------------------------------------------- interiors

  /** The interior region a wall-run tile fronts: any adjacent
   *  enclosed floor claims it (per-frame cached in the InteriorMap). */
  private wallRegion(game: ClientGame, tx: number, ty: number): InteriorRegion | null {
    // Cardinals first, then diagonals: a CORNER tile touches only
    // walls and open ground on its cardinal sides — its room sits
    // diagonally inside. Without the diagonal probe, corners resolve
    // no region and fall back to the default wood skin, printing a
    // mismatched column on any non-oak building.
    for (const [dx, dy] of [
      [0, 1], [0, -1], [1, 0], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ] as const) {
      const t = game.world.groundAt(tx + dx, ty + dy);
      if (t === undefined || Renderer.WALL_TILES.has(t)) continue;
      const r = this.interiors.regionAt(game, tx + dx, ty + dy);
      if (r) return r;
    }
    return null;
  }

  /**
   * Discover the interior regions in view this frame. They feed the
   * shadow-layer shelter punch (a wall never casts sun into its own
   * room). Buildings render OPEN — no roof layer; the cutaway front
   * wall, facades, and doorframes carry the "building" read while the
   * whole interior stays visible.
   */
  private collectInteriorRegions(game: ClientGame): void {
    const b = this.visibleTileBounds();
    this.visibleRegions = [];
    const seen = new Set<number>();
    // Discovery probes only authored/built floors — the only tiles
    // that can be inside a building — so outdoor flood cost stays nil.
    const pad = Math.ceil(WALL_H * 3);
    for (let ty = b.minTy; ty <= b.maxTy + pad; ty++) {
      for (let tx = b.minTx; tx <= b.maxTx; tx++) {
        const g = game.world.groundAt(tx, ty);
        if (g !== Tile.WoodFloor && g !== Tile.StoneFloor) continue;
        const region = this.interiors.regionAt(game, tx, ty);
        if (!region || seen.has(region.id)) continue;
        seen.add(region.id);
        this.visibleRegions.push(region);
      }
    }
  }

  // -------------------------------------------------------------- cliffs

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
  private static readonly FACE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
    const T: [number, number] = [0, -0.5];
    const R: [number, number] = [0.5, 0];
    const B: [number, number] = [0, 0.5];
    const L: [number, number] = [-0.5, 0];
    const q = Math.SQRT1_2;
    const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
    const table: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
    table[0] = []; table[15] = [];
    table[1] = [seg(T, L, [q, q])];
    table[14] = [seg(T, L, [-q, -q])];
    table[2] = [seg(T, R, [-q, q])];
    table[13] = [seg(T, R, [q, -q])];
    table[4] = [seg(R, B, [-q, -q])];
    table[11] = [seg(R, B, [q, q])];
    table[8] = [seg(L, B, [q, -q])];
    table[7] = [seg(L, B, [-q, q])];
    table[3] = [seg(L, R, [0, 1])];
    table[12] = [seg(L, R, [0, -1])];
    table[9] = [seg(T, B, [1, 0])];
    table[6] = [seg(T, B, [-1, 0])];
    table[5] = [seg(T, R, [q, -q]), seg(B, L, [-q, q])];
    table[10] = [seg(T, L, [-q, -q]), seg(R, B, [q, q])];
    return table;
  })();

  /**
   * SQUARE-CORNER contour variant, used for dual cells that touch a
   * stair tile. A beveled (diagonal) corner cuts a quarter-tile into
   * the neighbouring column — beside a stair that hangs the corner's
   * curtain over the flight. Square corners hug the tile boundary, so
   * the stair's column stays sacrosanct: walls turn AT its edge, with
   * an edge-on side piece (M = cell center = the shared tile corner).
   */
  private static readonly SQUARE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
    const T: [number, number] = [0, -0.5];
    const R: [number, number] = [0.5, 0];
    const B: [number, number] = [0, 0.5];
    const L: [number, number] = [-0.5, 0];
    const M: [number, number] = [0, 0];
    const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
    const t: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
    t[0] = []; t[15] = [];
    t[3] = [seg(L, R, [0, 1])];
    t[12] = [seg(L, R, [0, -1])];
    t[9] = [seg(T, B, [1, 0])];
    t[6] = [seg(T, B, [-1, 0])];
    t[1] = [seg(T, M, [1, 0]), seg(M, L, [0, 1])];
    t[14] = [seg(T, M, [-1, 0]), seg(M, L, [0, -1])];
    t[2] = [seg(T, M, [-1, 0]), seg(M, R, [0, 1])];
    t[13] = [seg(T, M, [1, 0]), seg(M, R, [0, -1])];
    t[4] = [seg(R, M, [0, -1]), seg(M, B, [-1, 0])];
    t[11] = [seg(R, M, [0, 1]), seg(M, B, [1, 0])];
    t[8] = [seg(L, M, [0, -1]), seg(M, B, [1, 0])];
    t[7] = [seg(L, M, [0, 1]), seg(M, B, [-1, 0])];
    t[5] = [...t[1]!, ...t[4]!];
    t[10] = [...t[2]!, ...t[8]!];
    return t;
  })();

  private collectCliffFaces(game: ClientGame, items: DrawItem[]): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const b = this.visibleTileBounds();
    const world = game.world;
    // Boundaries are RELATIVE: every seam between L−1 and L gets faces
    // owned by the ≥L side, whatever the sign — a pit's rim is the same
    // law as a plateau's edge. Scan the visible levels once.
    let visMin = 0;
    let visMax = 0;
    for (let ty = b.minTy; ty <= b.maxTy; ty++) {
      for (let tx = b.minTx; tx <= b.maxTx; tx++) {
        const e = world.elevAt(tx, ty);
        if (e > visMax) visMax = e;
        if (e < visMin) visMin = e;
      }
    }
    for (let level = visMin + 1; level <= visMax; level++) {
      // Ramps COUNT as mass here (unlike the crown bake): the contour
      // must not wrap around a stair notch, or mouth-corner cells hang
      // little curtains over the flight.
      const member = (tx: number, ty: number): boolean => world.elevAt(tx, ty) >= level;
      // A ramp owns the opening in ITS OWN level's cliff line — its
      // mouth and top edges belong to the flight drawing. A ramp of a
      // different level is ordinary mass to this contour.
      const owningRamp = (tx: number, ty: number): boolean =>
        world.groundAt(tx, ty) === Tile.Ramp && world.elevAt(tx, ty) === level;
      // Contour segments span a whole dual cell, but ramp ownership is
      // tile-aligned — HALF a segment can front a flight while the
      // other half fronts solid cliff. Test each half against its own
      // flanking tiles (quarter-offset samples stay inside the right
      // tile) so curtains end exactly at the stair's edge: no curtain
      // overhanging the flight, no hole beside it.
      const halfOwned = (
        hax: number,
        hay: number,
        hbx: number,
        hby: number,
        n: [number, number],
      ): boolean => {
        const qx = (hax + hbx) / 2;
        const qy = (hay + hby) / 2;
        return (
          owningRamp(Math.floor(qx + n[0] * 0.25), Math.floor(qy + n[1] * 0.25)) ||
          owningRamp(Math.floor(qx - n[0] * 0.25), Math.floor(qy - n[1] * 0.25))
        );
      };
      // Pure north-south edges are edge-on to the camera; they render
      // as SIDE pieces of wall thickness. Collected here and merged
      // into unbroken runs first — a lone cell-tall sliver reads as a
      // stray line, one solid piece per run reads as architecture.
      const sideRuns = new Map<string, Array<[number, number]>>();
      for (let j = b.minTy - 2; j <= b.maxTy + 2; j++) {
        for (let i = b.minTx - 1; i <= b.maxTx + 2; i++) {
          const mask =
            (member(i - 1, j - 1) ? 1 : 0) |
            (member(i, j - 1) ? 2 : 0) |
            (member(i, j) ? 4 : 0) |
            (member(i - 1, j) ? 8 : 0);
          // Cells touching a stair turn with SQUARE corners — a bevel
          // here would cut into the flight's column and hang its
          // curtain over the treads. Must match the crown bake's rule.
          const nearStair =
            owningRamp(i - 1, j - 1) || owningRamp(i, j - 1) || owningRamp(i, j) || owningRamp(i - 1, j);
          const segs = (nearStair ? Renderer.SQUARE_SEGS : Renderer.FACE_SEGS)[mask]!;
          if (segs.length === 0) continue;
          for (const sg of segs) {
            const ax = i + sg.a[0];
            const ay = j + sg.a[1];
            const bx = i + sg.b[0];
            const by = j + sg.b[1];
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            const dropA = halfOwned(ax, ay, mx, my, sg.n);
            const dropB = halfOwned(mx, my, bx, by, sg.n);
            if (dropA && dropB) continue;
            // Whole segments stay whole (stable detail hashing); only
            // stair-adjacent segments get clipped to their live half.
            const parts: Array<[number, number, number, number]> =
              !dropA && !dropB
                ? [[ax, ay, bx, by]]
                : dropA
                  ? [[mx, my, bx, by]]
                  : [[ax, ay, mx, my]];
            for (const [pax, pay, pbx, pby] of parts) {
              if (sg.n[1] > 0.01) {
                items.push(this.cliffFaceItem(game, pax, pay, pbx, pby, sg.n[0], level, i, j));
              } else if (Math.abs(sg.n[1]) <= 0.01) {
                const key = `${sg.n[0] >= 0 ? 1 : 0}|${pax}`;
                let runs = sideRuns.get(key);
                if (!runs) sideRuns.set(key, (runs = []));
                runs.push([Math.min(pay, pby), Math.max(pay, pby)]);
              }
            }
          }
        }
      }
      for (const [key, spans] of sideRuns) {
        const [sideStr, xStr] = key.split('|');
        const nx = sideStr === '1' ? 1 : -1;
        const x = Number(xStr);
        spans.sort((p, q) => p[0] - q[0]);
        let [y0, y1] = spans[0]!;
        const emitRun = (a: number, b: number): void => {
          // One slice per world row: caps land on the run's true ends,
          // while each slice y-sorts independently so props and
          // entities along the wall line draw over their own stretch.
          for (let r = Math.floor(a); r < b; r++) {
            const s0 = Math.max(a, r);
            const s1 = Math.min(b, r + 1);
            items.push(this.cliffSideItem(x, s0, s1, nx, level, s0 === a, s1 === b));
          }
        };
        for (let k = 1; k <= spans.length; k++) {
          const next = spans[k];
          if (next && next[0] <= y1 + 0.001) {
            y1 = Math.max(y1, next[1]);
          } else {
            emitRun(y0, y1);
            if (next) [y0, y1] = next;
          }
        }
      }
    }
  }

  /** One contour segment extruded into a face curtain (level -> level-1). */
  private cliffFaceItem(
    game: ClientGame,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    nx: number,
    level: number,
    ci: number,
    cj: number,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const topLift = level * ELEV_H * s;
    const baseLift = (level - 1) * ELEV_H * s;
    const h = hashCoords(53 + level, ci, cj);
    // Ensure a runs west of b so shading and details are stable.
    if (ax > bx || (ax === bx && ay > by)) {
      [ax, bx] = [bx, ax];
      [ay, by] = [by, ay];
    }
    const diagonal = Math.abs(nx) > 0.01;
    // Tone by facing: S = base, SE-turn = shaded, SW-turn = sunlit.
    const tone = !diagonal ? 0 : nx > 0 ? -16 : 12;

    return {
      // DIAGONAL SORT LAW: a bevel's occlusion boundary varies with x,
      // so sorting at its far row lets it paint over a body standing
      // visually IN FRONT of the line but north of the segment's max
      // row (the corner-hug clip). Sort at the NEAR row instead: the
      // pocket north of the line inside the dual cell is cliff mass —
      // nothing can ever stand there at face level — so anything
      // whose feet share the segment's rows is in front by
      // construction and must win. Straight south faces (ay === by)
      // are unchanged by min().
      sortY: Math.min(ay, by) + 0.001,
      drawShadow:
        level - 1 === 0
          ? () => {
              // Contact shadow: the top edge sits EXACTLY on the base
              // line (the face itself covers any overdraw above it),
              // its skew leaning with the sun as it falls across the
              // ground — clamped so the seam never detaches.
              const A = this.camera.worldToScreen(ax, ay, this.w, this.h);
              const B = this.camera.worldToScreen(bx, by, this.w, this.h);
              const skew = Math.max(-s * 0.6, Math.min(s * 0.6, this.castOffset(0.5).x));
              const c = this.beginContactFill();
              c.beginPath();
              c.moveTo(A.x, A.y - baseLift - 1);
              c.lineTo(B.x, B.y - baseLift - 1);
              c.lineTo(B.x + skew, B.y - baseLift + s * 0.42);
              c.lineTo(A.x + skew, A.y - baseLift + s * 0.42);
              c.closePath();
              c.fill();
              c.globalAlpha = 1;
            }
          : undefined,
      draw: () => {
        const A = this.camera.worldToScreen(ax, ay, this.w, this.h);
        const B = this.camera.worldToScreen(bx, by, this.w, this.h);
        // Snap shared endpoints to whole pixels so adjacent curtains
        // meet without hairlines.
        A.x = Math.round(A.x); A.y = Math.round(A.y);
        B.x = Math.round(B.x); B.y = Math.round(B.y);
        const yTopA = A.y - topLift - 1.5; // tucked under the crown band
        const yTopB = B.y - topLift - 1.5;
        const yBaseA = A.y - baseLift;
        const yBaseB = B.y - baseLift;
        // Rock body: vertical gradient, lit near the brink.
        const grad = ctx.createLinearGradient(0, Math.min(yTopA, yTopB), 0, Math.max(yBaseA, yBaseB));
        grad.addColorStop(0, shade('#6d6577', tone));
        grad.addColorStop(0.55, shade('#5d5568', tone));
        grad.addColorStop(1, shade('#4b4556', tone));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(A.x, yTopA);
        ctx.lineTo(B.x, yTopB);
        ctx.lineTo(B.x, yBaseB + 0.5);
        ctx.lineTo(A.x, yBaseA + 0.5);
        ctx.closePath();
        ctx.fill();
        // Bedded strata: constant world fractions -> beds run unbroken
        // along straight runs AND diagonal turns.
        const line = (f: number, w2: number, col: string): void => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w2;
          ctx.beginPath();
          ctx.moveTo(A.x, yTopA + (yBaseA - yTopA) * f);
          ctx.lineTo(B.x, yTopB + (yBaseB - yTopB) * f);
          ctx.stroke();
        };
        line(0.3, Math.max(1.5, s * 0.04), 'rgba(34, 27, 44, 0.32)');
        line(0.62, Math.max(1.5, s * 0.05), 'rgba(34, 27, 44, 0.36)');
        line(0.45, Math.max(2, s * 0.09), 'rgba(196, 150, 96, 0.12)');
        line(0.84, Math.max(1.5, s * 0.035), 'rgba(34, 27, 44, 0.26)');
        // A crack on some cells, jogging between beds.
        if (h % 3 !== 0) {
          const fx0 = 0.25 + ((h >> 5) % 50) / 100;
          const cxA = A.x + (B.x - A.x) * fx0;
          const cyT = yTopA + (yTopB - yTopA) * fx0;
          const cyB = yBaseA + (yBaseB - yBaseA) * fx0;
          const jog = s * (0.04 + ((h >> 9) % 8) / 150) * ((h >> 3) % 2 === 0 ? 1 : -1);
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.38)';
          ctx.lineWidth = Math.max(1, s * 0.032);
          ctx.beginPath();
          ctx.moveTo(cxA, cyT + (cyB - cyT) * 0.1);
          ctx.lineTo(cxA + jog, cyT + (cyB - cyT) * 0.5);
          ctx.lineTo(cxA + jog * 0.4, cyT + (cyB - cyT) * 0.92);
          ctx.stroke();
        }
        // Shade under the brink; AO where the face meets the ground.
        line(0.035, Math.max(2, s * 0.07), 'rgba(24, 18, 34, 0.35)');
        line(0.97, Math.max(2, s * 0.06), 'rgba(18, 12, 26, 0.3)');
        // Scree at the foot of straight faces — pit floors included
        // (drawn in-sort, so the sunken floor rows can't erase it).
        if (!diagonal && level - 1 <= 0 && (h & 3) !== 0) {
          ctx.fillStyle = shade('#6a6375', tone);
          for (let k = 0; k < 2; k++) {
            const f = 0.2 + ((h >> (7 + k * 5)) % 60) / 100;
            const px2 = A.x + (B.x - A.x) * f;
            const py2 = yBaseA + (yBaseB - yBaseA) * f;
            const pw = s * (0.06 + ((h >> (k * 4)) % 6) / 120);
            ctx.beginPath();
            chamferRect(ctx, px2, py2 - pw * 0.6, pw, pw * 0.7, pw * 0.3);
            ctx.fill();
          }
        }
      },
    };
  }

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
  private cliffSideItem(
    x: number,
    s0: number,
    s1: number,
    nx: number,
    level: number,
    isTop: boolean,
    isBottom: boolean,
  ): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const topLift = level * ELEV_H * s;
    const baseLift = (level - 1) * ELEV_H * s;
    return {
      sortY: s0 - (level * ELEV_H) / this.camera.yScale,
      drawShadow:
        level - 1 === 0
          ? () => {
              // The shaded (east) flank casts a real contact shadow;
              // the sunlit (west) flank still gets a narrow ambient
              // seam — every wall foot is attached to its ground.
              const A = this.camera.worldToScreen(x, s0, this.w, this.h);
              const B = this.camera.worldToScreen(x, s1, this.w, this.h);
              // Rounded slice bounds tile exactly — an overlap would
              // double-blend the alpha into a visible seam line.
              const ya = Math.round(A.y) - (isTop ? 1 : 0);
              const yb = Math.round(B.y) + (isBottom ? s * 0.2 : 0);
              const wS = nx >= 0 ? Math.max(3, s * 0.24) : Math.max(2, s * 0.09);
              const c = this.beginContactFill();
              c.fillRect(Math.round(A.x) - (nx >= 0 ? 0 : wS), ya, wS, yb - ya);
              c.globalAlpha = 1;
            }
          : undefined,
      draw: () => {
        const A = this.camera.worldToScreen(x, s0, this.w, this.h);
        const B = this.camera.worldToScreen(x, s1, this.w, this.h);
        const sx = Math.round(A.x);
        const w2 = Math.max(3, s * 0.13);
        const x0 = nx >= 0 ? sx : sx - w2;
        const yTop = Math.round(A.y - topLift) - (isTop ? 1.5 : 0);
        const yBot = isBottom ? B.y - baseLift : Math.round(B.y - topLift);
        // Body: the face palette's own mid-tones, pushed into shade —
        // kin to the walls it joins, not a black bar fighting them.
        ctx.fillStyle = nx >= 0 ? '#494259' : '#544d64';
        ctx.fillRect(x0, yTop, w2, yBot - yTop);
        // Coursing ticks at world-anchored heights along the crown
        // line — each slice draws only ticks landing inside its rect.
        ctx.fillStyle = 'rgba(29, 23, 40, 0.3)';
        const tickH = Math.max(1.5, s * 0.035);
        for (let wy = Math.ceil((s0 - 1) * 2) / 2; wy <= s1 + 1; wy += 0.5) {
          const py = this.camera.worldToScreen(x, wy, this.w, this.h).y - topLift + s * 0.4;
          if (py >= yTop + tickH && py < yBot - tickH) ctx.fillRect(x0, py, w2, tickH);
        }
        // Arris on the outward silhouette edge.
        ctx.fillStyle = 'rgba(24, 18, 34, 0.3)';
        ctx.fillRect(nx >= 0 ? x0 + w2 - 1.5 : x0, yTop, 1.5, yBot - yTop);
        // Brink shade at the run's crown end; AO where it meets ground.
        if (isTop) {
          ctx.fillStyle = 'rgba(24, 18, 34, 0.35)';
          ctx.fillRect(x0, yTop, w2, Math.max(2, s * 0.06));
        }
        if (isBottom) {
          ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
          ctx.fillRect(x0, yBot - Math.max(2, s * 0.05), w2, Math.max(2, s * 0.05));
        }
      },
    };
  }

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
  private rampItem(tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const lvl = game.world.elevAt(tx, ty);
    // Descent direction: the cardinal neighbor a level down.
    let dir: [number, number] = [0, 1];
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
      if (game.world.elevAt(tx + dx, ty + dy) < lvl) {
        dir = [dx, dy];
        break;
      }
    }
    const N = 5;
    const step = (ELEV_H * s) / N;
    const baseLift = (lvl - 1) * ELEV_H * s;
    const TOP_A = '#aaa4b2';
    const TOP_B = '#9f99a8';
    const RISER = '#6a6375';
    const LIP = '#c2bcca';

    return {
      sortY: ty,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        // Rounded to whole pixels like the flanking curtains' endpoints,
        // so the flight meets its cheek walls without a hairline seam.
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const edgeW = Math.max(1.5, s * 0.04);
        if (dir[1] === 1) {
          // Climbing NORTH (away): a RECESSED stairwell, not stripes
          // painted on the wall plane. Cheek walls (the cut sides of
          // the notch) frame a narrowed flight; a worn dirt apron
          // spills from the mouth onto the low ground and a matching
          // landing opens onto the crown (separate item) — the stair
          // is carved into the terrain and attached to both grounds.
          const cw = Math.max(3, s * 0.11);
          const ix0 = x0 + cw;
          const ix1 = x1 - cw;
          const yTopFlight = wts(tx, ty).y - baseLift - ELEV_H * s;
          const yMouth = wts(tx, ty + 1).y - baseLift;
          // (The worn mouth apron is its own item — see rampApronItem —
          // because an elevated mouth's crown row would repaint it.)
          // Treads recede up-screen between the cheeks, each with a
          // full riser face under its south nose.
          for (let i = N - 1; i >= 0; i--) {
            const lift = baseLift + (i + 1) * step;
            const ySouth = wts(tx, ty + 1 - i / N).y - lift;
            const yNorth = wts(tx, ty + 1 - (i + 1) / N).y - lift;
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(ix0, yNorth, ix1 - ix0, ySouth - yNorth + 0.5);
            // Riser under the nose.
            ctx.fillStyle = RISER;
            ctx.fillRect(ix0, ySouth, ix1 - ix0, step + 0.5);
            // Lit nose lip + shadow line under it.
            ctx.fillStyle = LIP;
            ctx.fillRect(ix0, ySouth - edgeW, ix1 - ix0, edgeW);
            ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
            ctx.fillRect(ix0, ySouth + step - edgeW, ix1 - ix0, edgeW);
          }
          // Center wear: the path feet actually take, slightly lighter.
          ctx.fillStyle = 'rgba(236, 232, 240, 0.08)';
          ctx.fillRect((ix0 + ix1) / 2 - (ix1 - ix0) * 0.19, yTopFlight, (ix1 - ix0) * 0.38, yMouth - yTopFlight);
          // Cheek walls: the notch's cut sides. The west cheek shows
          // its east-facing (shaded) inner side, the east cheek its
          // west-facing (sunlit) inner side. AO seam against treads.
          ctx.fillStyle = '#443e52';
          ctx.fillRect(x0, yTopFlight, cw, yMouth - yTopFlight);
          ctx.fillStyle = '#5b5468';
          ctx.fillRect(ix1, yTopFlight, cw, yMouth - yTopFlight);
          ctx.fillStyle = 'rgba(20, 15, 30, 0.35)';
          ctx.fillRect(ix0 - 1.5, yTopFlight, 1.5, yMouth - yTopFlight);
          ctx.fillRect(ix1, yTopFlight, 1.5, yMouth - yTopFlight);
          // Lit caps where the cheeks meet the crown light.
          ctx.fillStyle = 'rgba(255, 244, 214, 0.22)';
          ctx.fillRect(x0, yTopFlight, cw, Math.max(1.5, s * 0.035));
          ctx.fillRect(ix1, yTopFlight, cw, Math.max(1.5, s * 0.035));
        } else if (dir[1] === -1) {
          // Climbing SOUTH (toward camera): seen from behind-above -
          // receding tops with a hard drop edge at each step's back.
          for (let i = 0; i < N; i++) {
            const lift = baseLift + (i + 1) * step;
            const yNorth = wts(tx, ty + i / N).y - lift;
            const ySouth = wts(tx, ty + (i + 1) / N).y - lift;
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(x0, yNorth, x1 - x0, ySouth - yNorth + step + 0.5);
            ctx.fillStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.fillRect(x0, yNorth, x1 - x0, edgeW);
          }
        } else {
          // Climbing EAST or WEST: the south stringer is the read - a
          // zigzag of stepped faces, each tread nose lit, each drop
          // edged. Tops ride above at their own lifts.
          const yFaceBase = wts(tx, ty + 1).y - baseLift;
          for (let i = 0; i < N; i++) {
            // Strip i counts from the LOW side.
            const u0 = i / N;
            const u1 = (i + 1) / N;
            const sx0 = dir[0] === 1 ? x1 - (x1 - x0) * u1 : x0 + (x1 - x0) * u0;
            const sx1 = dir[0] === 1 ? x1 - (x1 - x0) * u0 : x0 + (x1 - x0) * u1;
            const lift = baseLift + (i + 1) * step;
            const yTopN = wts(tx, ty).y - lift;
            const yTopS = wts(tx, ty + 1).y - lift;
            // South face of this tread's block, down to the low ground.
            ctx.fillStyle = i % 2 === 0 ? RISER : shade(RISER, -8);
            ctx.fillRect(sx0, yTopS, sx1 - sx0, yFaceBase - yTopS + 0.5);
            // Tread top (foreshortened full tile depth).
            ctx.fillStyle = i % 2 === 0 ? TOP_A : TOP_B;
            ctx.fillRect(sx0, yTopN, sx1 - sx0, yTopS - yTopN + 0.5);
            // Lit nose lip along the top of the face.
            ctx.fillStyle = LIP;
            ctx.fillRect(sx0, yTopS - edgeW * 0.6, sx1 - sx0, edgeW);
            // Step-corner drop edge on the higher side of the strip.
            const hiX = dir[0] === 1 ? sx0 : sx1 - edgeW;
            ctx.fillStyle = 'rgba(26, 20, 36, 0.4)';
            ctx.fillRect(hiX, yTopN - step, edgeW, step + (yTopS - yTopN));
          }
          // AO seam where the stringer meets the ground.
          ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
          ctx.fillRect(x0, yFaceBase - edgeW, x1 - x0, edgeW);
        }
      },
    };
  }

  /**
   * The worn LANDING where a south-descending flight opens onto the
   * crown: a dirt patch painted over the lifted surface just north of
   * the stair top, so the path visibly continues onto the plateau
   * instead of the grass stopping dead at the top tread. Its own item:
   * it must draw after that row's crown slice but BEFORE anything
   * standing on it.
   */
  private rampLandingItem(tx: number, ty: number, game: ClientGame): DrawItem | null {
    const lvl = game.world.elevAt(tx, ty);
    if (game.world.elevAt(tx, ty + 1) >= lvl) return null; // south-descending only
    const ctx = this.ctx;
    const s = this.camera.scale;
    const lift = lvl * ELEV_H * s;
    return {
      sortY: ty - 1 + 0.02,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const yTop = wts(tx, ty).y - lift;
        const inset = s * 0.09;
        const reach = s * 0.32; // how far the worn patch spills north
        ctx.fillStyle = '#6d5642';
        ctx.beginPath();
        ctx.moveTo(x0 + inset * 0.5, yTop + 1);
        ctx.lineTo(x1 - inset * 0.5, yTop + 1);
        ctx.lineTo(x1 - inset * 1.6, yTop - reach * 0.6);
        ctx.lineTo(x1 - inset * 3.2, yTop - reach);
        ctx.lineTo(x0 + inset * 3.2, yTop - reach);
        ctx.lineTo(x0 + inset * 1.6, yTop - reach * 0.6);
        ctx.closePath();
        ctx.fill();
        // Center wear continuing the flight's path line.
        ctx.fillStyle = 'rgba(126, 103, 80, 0.5)';
        const mid = (x0 + x1) / 2;
        ctx.fillRect(mid - (x1 - x0) * 0.17, yTop - reach * 0.8, (x1 - x0) * 0.34, reach * 0.8);
        // Faint shade where the landing meets the top tread.
        ctx.fillStyle = 'rgba(38, 28, 22, 0.2)';
        ctx.fillRect(x0 + inset * 0.5, yTop, x1 - x0 - inset, Math.max(1.5, s * 0.035));
      },
    };
  }

  /**
   * The worn APRON where the flight's mouth meets the ground below: a
   * fan of packed earth spilling from the bottom step. Its own item
   * (mirror of the landing) — sorted just after the mouth row's ground
   * so it survives elevated shelves, but before anything standing on it.
   */
  private rampApronItem(tx: number, ty: number, game: ClientGame): DrawItem | null {
    const lvl = game.world.elevAt(tx, ty);
    if (game.world.elevAt(tx, ty + 1) >= lvl) return null; // south-descending only
    const ctx = this.ctx;
    const s = this.camera.scale;
    const baseLift = (lvl - 1) * ELEV_H * s;
    return {
      sortY: ty + 1 + 0.02,
      draw: () => {
        const wts = (wx: number, wy: number) => this.camera.worldToScreen(wx, wy, this.w, this.h);
        const x0 = Math.round(wts(tx, ty).x);
        const x1 = Math.round(wts(tx + 1, ty).x);
        const yMouth = wts(tx, ty + 1).y - baseLift;
        const fan = s * 0.34;
        const flare = s * 0.12;
        ctx.fillStyle = '#6d5642';
        ctx.beginPath();
        ctx.moveTo(x0 - flare * 0.4, yMouth - 1);
        ctx.lineTo(x1 + flare * 0.4, yMouth - 1);
        ctx.lineTo(x1 + flare, yMouth + fan * 0.55);
        ctx.lineTo(x1 - flare, yMouth + fan);
        ctx.lineTo(x0 + flare, yMouth + fan);
        ctx.lineTo(x0 - flare, yMouth + fan * 0.55);
        ctx.closePath();
        ctx.fill();
        // Shade tucked under the bottom riser; center wear continuing
        // the flight's path line out onto the ground.
        ctx.fillStyle = 'rgba(38, 28, 22, 0.25)';
        ctx.fillRect(x0 - flare * 0.4, yMouth - 1, x1 - x0 + flare * 0.8, Math.max(1.5, s * 0.04));
        ctx.fillStyle = 'rgba(126, 103, 80, 0.5)';
        const mid = (x0 + x1) / 2;
        ctx.fillRect(mid - (x1 - x0) * 0.17, yMouth, (x1 - x0) * 0.34, fan * 0.6);
      },
    };
  }

  // --------------------------------------------------------- rock nodes

  private static readonly ORE_STYLES: Partial<
    Record<
      number,
      {
        nug: string;
        deep: string;
        accent: string;
        stone: { face: string; top: string; side: string };
      }
    >
  > = {
    [Tile.RockCopper]: {
      nug: '#e0954a',
      deep: '#7c4520',
      accent: '#3fa98e',
      stone: { face: '#6b5a50', top: '#8a7668', side: '#544740' },
    },
    [Tile.RockTin]: {
      nug: '#dde1ea',
      deep: '#767c8c',
      accent: '#ffffff',
      stone: { face: '#5d5966', top: '#7b7787', side: '#4b4754' },
    },
    [Tile.RockIron]: {
      nug: '#c26f3e',
      deep: '#6f4638',
      accent: '#3a3d46',
      stone: { face: '#5e524e', top: '#786a60', side: '#4b403c' },
    },
    [Tile.RockCoal]: {
      nug: '#2c2933',
      deep: '#17141f',
      accent: '#8a86a0',
      stone: { face: '#5a5466', top: '#6e6879', side: '#494452' },
    },
    [Tile.RockGold]: {
      nug: '#f4c84f',
      deep: '#a87c1c',
      accent: '#fff3c9',
      stone: { face: '#565064', top: '#6e687c', side: '#454051' },
    },
    [Tile.RockSilver]: {
      // Steel-blue metal tones, not white: silver reads through facet
      // contrast, and near-white fills read as paint (the lesson the
      // first two silver designs taught).
      nug: '#c6cfe0',
      deep: '#59617a',
      accent: '#ffffff',
      stone: { face: '#5a5766', top: '#787588', side: '#484554' },
    },
    [Tile.RockMithril]: {
      nug: '#8fb4e4',
      deep: '#3f5e8c',
      accent: '#d8ecff',
      stone: { face: '#525668', top: '#6c7284', side: '#414452' },
    },
    [Tile.RockAdamant]: {
      nug: '#6cb47a',
      deep: '#2f5e3c',
      accent: '#d2f0d0',
      stone: { face: '#4f5a54', top: '#68766c', side: '#3e4842' },
    },
    [Tile.RockObsidian]: {
      nug: '#3b3247',
      deep: '#1c1626',
      accent: '#b8a8d8',
      stone: { face: '#4a4152', top: '#5e5468', side: '#382f40' },
    },
    [Tile.RockStarfall]: {
      nug: '#d6cbf6',
      deep: '#7a6ab0',
      accent: '#ffffff',
      stone: { face: '#4c4658', top: '#645d72', side: '#3b3648' },
    },
  };

  private static readonly BARREN_STONE = { face: '#5f596b', top: '#767083', side: '#4c475a' };
  private static readonly BARREN_DIM = { face: '#555061', top: '#696377', side: '#443f52' };

  private static readonly ROCK_TILES: ReadonlySet<number> = new Set([
    Tile.Rock,
    Tile.RockCopper,
    Tile.RockTin,
    Tile.RockIron,
    Tile.RockCoal,
    Tile.RockGold,
    Tile.RockSilver,
    Tile.RockMithril,
    Tile.RockAdamant,
    Tile.RockObsidian,
    Tile.RockStarfall,
    Tile.RockDepleted,
  ]);

  // ---- shared monolith vocabulary --------------------------------------

  /**
   * One rectangular stone block, spoken in the cliff dialect: broad
   * front face, lit cap strip across the top, shaded lane down the
   * off-light flank — hard 45° top chamfers, flat fills, one crisp
   * dark outline. `lean` shears the top edge sideways so stacked
   * blocks read geologic, never machined. Returns the silhouette so
   * callers can clip veins INTO the stone.
   */
  private stoneBlock(
    cx: number,
    yb: number,
    w: number,
    hgt: number,
    lean: number,
    pal: { face: string; top: string; side: string },
    seed = 0,
    taperK = 1,
  ): Array<[number, number]> {
    const ctx = this.ctx;
    const yt = yb - hgt;
    // Hewn-boulder silhouette: the top is narrower than the base
    // (seeded taper — soften via taperK for masonry-slab reads), the
    // two top chamfers are unequal, and each flank carries a shoulder
    // vertex partway up — eight hard points that read quarried, never
    // packaged.
    const tl = 1 - (0.38 - ((seed >> 2) & 3) * 0.06) * taperK; // top-left half-width factor
    const tr = 1 - (0.38 - ((seed >> 4) & 3) * 0.06) * taperK;
    const cSm = Math.min(w, hgt) * 0.1;
    const cBg = Math.min(w, hgt) * (0.24 + ((seed >> 6) & 3) * 0.05);
    const [cL, cR] = ((seed >> 8) & 1) === 0 ? [cSm, cBg] : [cBg, cSm];
    const shL = yb - hgt * (0.3 + ((seed >> 9) & 3) * 0.05); // shoulder heights
    const shR = yb - hgt * (0.28 + ((seed >> 11) & 3) * 0.05);
    const wl = w / 2;
    const sil: Array<[number, number]> = [
      [cx - wl, yb],
      [cx - wl - w * 0.04, shL],
      [cx - wl * tl + lean, yt + cL],
      [cx - wl * tl + lean + cL, yt],
      [cx + wl * tr + lean - cR, yt],
      [cx + wl * tr + lean, yt + cR],
      [cx + wl + w * 0.03, shR],
      [cx + wl, yb],
    ];
    const trace = (): void => {
      ctx.beginPath();
      sil.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
    };
    ctx.fillStyle = pal.face;
    trace();
    ctx.fill();
    ctx.save();
    trace();
    ctx.clip();
    // Shade lane hugging the off-light flank, then the lit cap wins
    // the top — both flat fills, both clipped to the silhouette.
    ctx.strokeStyle = pal.side;
    ctx.lineWidth = w * 0.24;
    ctx.beginPath();
    ctx.moveTo(cx + wl - w * 0.09, yb + 1);
    ctx.lineTo(cx + wl * tr + lean - w * 0.09, yt + cR);
    ctx.stroke();
    ctx.fillStyle = pal.top;
    const capH = Math.min(hgt * 0.32, w * 0.28);
    ctx.save();
    ctx.translate(cx + lean, yt);
    ctx.rotate(((seed >> 3) & 1) === 0 ? -0.05 : 0.05);
    ctx.fillRect(-w, -w * 0.5, w * 2, w * 0.5 + capH);
    ctx.restore();
    ctx.restore();
    // No baked perimeter stroke: the outline shader rings the whole
    // formation — a stroke here doubles it into a fat double border.
    // Crisp parting shadow where the block meets whatever bears it.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.fillRect(cx - w * 0.4, yb - Math.max(1.5, hgt * 0.045), w * 0.8, Math.max(1.5, hgt * 0.045));
    return sil;
  }

  /**
   * One TALL hewn monolith: a single tapering silhouette with a
   * stepped ledge on each flank — the "you walk up against it"
   * landmark mass. Same flat grammar as stoneBlock (lit cap, shaded
   * lane, shader-rung silhouette) but drawn as ONE rock, so height never reads
   * as a pancake tower of crates. Returns the silhouette so callers
   * can clip veins INTO the stone.
   */
  private monolith(
    cx: number,
    yb: number,
    w: number,
    hgt: number,
    m: number,
    pal: { face: string; top: string; side: string },
    seed = 0,
  ): Array<[number, number]> {
    const ctx = this.ctx;
    const yt = yb - hgt;
    const r = (bits: number, lo: number, hi: number): number =>
      lo + (((seed >> bits) & 7) / 7) * (hi - lo);
    const lean = w * r(0, -0.06, 0.06) * m;
    const c = w * 0.1;
    const wl = w / 2;
    // Seeded ledge heights and a top that narrows to roughly half.
    const lY = yb - hgt * r(3, 0.42, 0.55);
    const rY = yb - hgt * r(6, 0.36, 0.5);
    const tw = wl * r(9, 0.5, 0.62);
    const sil: Array<[number, number]> = [
      [cx - wl, yb],
      [cx - wl - w * 0.025, yb - hgt * 0.2],
      [cx - wl * 0.8 + lean * 0.5, lY],
      [cx - wl * 0.66 + lean * 0.5, lY - hgt * 0.05],
      [cx - tw + lean, yt + c],
      [cx - tw + lean + c, yt],
      [cx + tw + lean - c * 1.6, yt],
      [cx + tw + lean, yt + c * 1.6],
      [cx + wl * 0.7 + lean * 0.5, rY - hgt * 0.045],
      [cx + wl * 0.84 + lean * 0.5, rY],
      [cx + wl + w * 0.03, yb - hgt * 0.16],
      [cx + wl, yb],
    ];
    const trace = (): void => {
      ctx.beginPath();
      sil.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
    };
    ctx.fillStyle = pal.face;
    trace();
    ctx.fill();
    ctx.save();
    trace();
    ctx.clip();
    // Shaded lane tracing the off-light profile, lit cap up top, and
    // a lit sill on each ledge so the steps read as flats in the sun.
    ctx.strokeStyle = pal.side;
    ctx.lineWidth = w * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx + wl - w * 0.09, yb + 1);
    ctx.lineTo(cx + wl * 0.84 + lean * 0.5 - w * 0.08, rY);
    ctx.lineTo(cx + tw + lean - w * 0.08, yt + c);
    ctx.stroke();
    ctx.fillStyle = pal.top;
    const capH = Math.min(hgt * 0.14, w * 0.26);
    ctx.save();
    ctx.translate(cx + lean, yt);
    ctx.rotate(((seed >> 3) & 1) === 0 ? -0.045 : 0.045);
    ctx.fillRect(-w, -w * 0.5, w * 2, w * 0.5 + capH);
    ctx.restore();
    ctx.fillRect(cx - wl * 0.84 + lean * 0.5, lY - hgt * 0.052, wl * 0.22, hgt * 0.032);
    ctx.fillRect(cx + wl * 0.58 + lean * 0.5, rY - hgt * 0.048, wl * 0.28, hgt * 0.03);
    ctx.restore();
    // No baked perimeter stroke — the outline shader supplies it.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
    ctx.fillRect(cx - w * 0.4, yb - Math.max(1.5, hgt * 0.03), w * 0.8, Math.max(1.5, hgt * 0.03));
    return sil;
  }

  /**
   * One BIG rectangular ore node: a deep-toned frame around a bright
   * mineral face, capped with a hard square glint. The nodes are the
   * protagonists of a deposit — blocky, rigid, sized to read from
   * across the screen, planted proud of the host stone.
   */
  private oreNode(
    x: number,
    y: number,
    w: number,
    rot: number,
    pal: { nug: string; deep: string; accent: string },
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const hh = w * 0.8;
    const cut = w * 0.13;
    ctx.fillStyle = pal.deep;
    ctx.beginPath();
    chamferRect(ctx, -w / 2, -hh / 2, w, hh, cut);
    ctx.fill();
    // Hairline seat only — the shader ring owns the bold border, and a
    // heavy frame here stacked into a double-thick edge on skyline nodes.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.stroke();
    // Bright face biased toward the lit top-left.
    ctx.fillStyle = pal.nug;
    ctx.beginPath();
    chamferRect(ctx, -w * 0.4, -hh * 0.42, w * 0.74, hh * 0.68, cut * 0.8);
    ctx.fill();
    // Hard square glint — flat, no gradient.
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-w * 0.32, -hh * 0.34, w * 0.28, hh * 0.22);
    ctx.restore();
  }

  /** A four-point star twinkle - the "this is mineable" beacon. */
  private sparkle(x: number, y: number, r: number, alpha: number, color: string): void {
    if (this.bakingMask) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.22, y - r * 0.22);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.22, y + r * 0.22);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.22, y + r * 0.22);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.22, y - r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Staggered twinkle window: brief flash once per period. */
  private static twinkle(tSec: number, seed: number, period: number): number {
    const phase = ((tSec / period) + ((seed >>> 3) % 97) / 97) % 1;
    const DUR = 0.14;
    return phase < DUR ? Math.sin((phase / DUR) * Math.PI) : 0;
  }

  /** Blocky spall scattered at a formation's feet - grounds the mass. */
  private rubble(px: number, py: number, s: number, h: number, colors: string[]): void {
    const ctx = this.ctx;
    for (let k = 0; k < 4; k++) {
      const cx = px + (((h >> (k * 6)) % 200) - 100) / 100 * s * 0.62;
      const cy = py + s * 0.3 + (((h >> (k * 4 + 2)) % 24) - 8) / 100 * s;
      const cw = s * (0.05 + ((h >> (k * 5)) % 5) / 110);
      ctx.fillStyle = colors[k % colors.length]!;
      ctx.beginPath();
      chamferRect(ctx, cx, cy, cw * 1.3, cw * 0.8, cw * 0.2);
      ctx.fill();
    }
  }

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
  private drawRockFormation(
    px: number,
    py: number,
    s: number,
    h: number,
    tile: Tile,
    tSec: number,
    crowded = false,
  ): void {
    const ctx = this.ctx;
    const m = ((h >> 5) & 1) === 0 ? 1 : -1; // mirror variant
    const S = s * (0.94 + (((h >> 11) & 7) / 7) * 0.14); // size jitter
    const base = py + s * 0.28; // ground contact line
    const X = (dx: number): number => px + dx * m;
    // Crowded formations (another rock immediately in front) stay low.
    const H = crowded ? 0.55 : 1;

    if (tile === Tile.RockDepleted) {
      // Worked out: the block remains, cracked open around a stepped
      // rectangular cavity, spall at its feet.
      this.stoneBlock(X(-0.03 * S), base, S * 0.92, S * 0.64, 0.04 * S * m, Renderer.BARREN_DIM, h);
      const cavW = S * 0.46;
      const cavH = S * 0.36;
      ctx.fillStyle = '#332f3d';
      ctx.beginPath();
      chamferRect(ctx, X(-0.05 * S) - cavW / 2, base - S * 0.44, cavW, cavH, cavW * 0.16);
      ctx.fill();
      ctx.fillStyle = '#221f2b';
      ctx.beginPath();
      chamferRect(ctx, X(-0.02 * S) - cavW * 0.32, base - S * 0.38, cavW * 0.64, cavH * 0.62, cavW * 0.1);
      ctx.fill();
      // Hard cracks running off the cavity corners.
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(X(-0.22 * S), base - S * 0.4);
      ctx.lineTo(X(-0.34 * S), base - S * 0.18);
      ctx.moveTo(X(0.14 * S), base - S * 0.42);
      ctx.lineTo(X(0.3 * S), base - S * 0.3);
      ctx.lineTo(X(0.34 * S), base - S * 0.1);
      ctx.moveTo(X(0.02 * S), base - S * 0.14);
      ctx.lineTo(X(-0.06 * S), base - S * 0.02);
      ctx.stroke();
      this.rubble(px, py, s, h, ['#4a4556', '#3f3b4a']);
      return;
    }

    if (tile === Tile.Rock) {
      // Barren stone: honest blocky boulders — low, wide, flat-capped.
      if (((h >> 7) & 3) !== 3) {
        this.stoneBlock(X(0.38 * S), base, S * 0.44, S * 0.3, 0.03 * S * m, Renderer.BARREN_DIM, h ^ 0x9e37);
      }
      this.stoneBlock(X(-0.08 * S), base, S * 0.84, S * 0.52, -0.05 * S * m, Renderer.BARREN_STONE, h);
      if (h % 3 === 0) {
        // A quartz streak — one hard zigzag, not a squiggle.
        ctx.strokeStyle = 'rgba(228, 224, 236, 0.5)';
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(X(-0.34 * S), base - S * 0.12);
        ctx.lineTo(X(-0.1 * S), base - S * 0.3);
        ctx.lineTo(X(0.18 * S), base - S * 0.22);
        ctx.stroke();
      }
      this.rubble(px, py, s, h, ['#6a6375', '#5a5466']);
      return;
    }

    const pal = Renderer.ORE_STYLES[tile]!;
    // Node anchors double as sparkle sites, collected per metal.
    const sites: Array<[number, number]> = [];

    if (tile === Tile.RockCopper) {
      // THE RUST OBELISK — a leaning tower of warm stone with one deep
      // seam of raw copper climbing its full height.
      this.stoneBlock(X(0.52 * S), base, S * 0.52, S * 0.44 * H, 0.04 * S * m, Renderer.BARREN_DIM, h ^ 0x51f3);
      const cSil = this.monolith(X(-0.05 * S), base, S * 1.18, S * 1.6 * H, m, pal.stone, h);
      // The seam lives IN the stone — clipped to the monolith.
      ctx.save();
      const seamClip = new Path2D();
      cSil.forEach(([x, y], i) => (i === 0 ? seamClip.moveTo(x, y) : seamClip.lineTo(x, y)));
      seamClip.closePath();
      ctx.clip(seamClip);
      ctx.fillStyle = pal.deep;
      ctx.beginPath();
      ctx.moveTo(X(-0.28 * S), base);
      ctx.lineTo(X(0.02 * S), base);
      ctx.lineTo(X(-0.06 * S), base - S * 1.66 * H);
      ctx.lineTo(X(-0.28 * S), base - S * 1.66 * H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Raw copper blocks erupting along the seam — one near the top.
      const c1: [number, number] = [X(-0.14 * S), base - S * 1.34 * H];
      const c3: [number, number] = [X(-0.16 * S), base - S * 0.3];
      this.oreNode(c1[0], c1[1], S * 0.38, -0.16 * m, pal);
      if (!crowded) {
        const c2: [number, number] = [X(-0.06 * S), base - S * 0.82];
        this.oreNode(c2[0], c2[1], S * 0.32, 0.12 * m, pal);
        sites.push(c2);
      }
      this.oreNode(c3[0], c3[1], S * 0.36, -0.08 * m, pal);
      sites.push(c1);
      // Verdigris: flat teal stains weeping under the metal.
      ctx.fillStyle = pal.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(X(-0.1 * S) - S * 0.03, base - S * 0.68 * H, S * 0.06, S * 0.2 * H);
      ctx.fillRect(X(-0.24 * S) - S * 0.025, base - S * 0.16, S * 0.05, S * 0.14);
      ctx.globalAlpha = 1;
      this.rubble(px, py, s, h, [pal.nug, '#6a6375', pal.deep]);
    } else if (tile === Tile.RockTin) {
      // THE SHARD RIDGE — an oblong spine of cool stone crested with a
      // march of cubic tin crystals along its skyline.
      const tH = crowded ? 0.72 : 1;
      this.stoneBlock(X(-0.5 * S), base, S * 0.6, S * 0.5 * tH, -0.05 * S * m, pal.stone, h ^ 0x51f3);
      this.stoneBlock(X(0.48 * S), base, S * 0.54, S * 0.38 * tH, 0.05 * S * m, Renderer.BARREN_DIM, h ^ 0x9e37);
      this.stoneBlock(X(0), base, S * 0.74, S * 0.78 * tH, 0.04 * S * m, pal.stone, h);
      const t1: [number, number] = [X(-0.52 * S), base - S * 0.62 * tH];
      const t2: [number, number] = [X(0), base - S * 0.92 * tH];
      const t3: [number, number] = [X(0.22 * S), base - S * 0.32];
      const t4: [number, number] = [X(0.5 * S), base - S * 0.5 * tH];
      this.oreNode(t1[0], t1[1], S * 0.3, -0.18 * m, pal);
      this.oreNode(t2[0], t2[1], S * 0.36, 0.1 * m, pal);
      this.oreNode(t3[0], t3[1], S * 0.26, -0.08 * m, pal);
      this.oreNode(t4[0], t4[1], S * 0.22, 0.2 * m, pal);
      sites.push(t2, t4);
      this.rubble(px, py, s, h, [pal.nug, '#6a6375']);
    } else if (tile === Tile.RockIron) {
      // THE BANDED BUTTE — one tall mass of banded ironstone: dark
      // strata beds running flat THROUGH a single hewn silhouette
      // with rust partings between them, studded with rust blocks and
      // a magnetite crown. Bands on one rock, never a stack of crates.
      this.stoneBlock(X(0.5 * S), base, S * 0.5, S * 0.4, 0.04 * S * m, Renderer.BARREN_DIM, h ^ 0x51f3);
      const iSil = this.monolith(X(-0.04 * S), base, S * 1.16, S * 1.38 * H, m, pal.stone, h);
      ctx.save();
      const bedClip = new Path2D();
      iSil.forEach(([x, y], i) => (i === 0 ? bedClip.moveTo(x, y) : bedClip.lineTo(x, y)));
      bedClip.closePath();
      ctx.clip(bedClip);
      ctx.translate(px, 0);
      ctx.rotate(m * -0.045);
      ctx.fillStyle = '#55423c';
      ctx.fillRect(-S, base - S * 0.5 * H, S * 2, S * 0.16 * H);
      ctx.fillRect(-S, base - S * 0.98 * H, S * 2, S * 0.12 * H);
      ctx.fillStyle = '#a35c33';
      ctx.fillRect(-S, base - S * 0.52 * H, S * 2, Math.max(1.5, S * 0.035));
      ctx.fillRect(-S, base - S * 1 * H, S * 2, Math.max(1.5, S * 0.03));
      ctx.restore();
      const w1: [number, number] = [X(-0.36 * S), base - S * 0.46 * H];
      const w2: [number, number] = [X(0.3 * S), base - S * 0.2];
      const mag: [number, number] = [X(0.08 * S), base - S * 1.16 * H];
      this.oreNode(w1[0], w1[1], S * 0.34, -0.16 * m, pal);
      this.oreNode(w2[0], w2[1], S * 0.36, 0.12 * m, pal);
      // Magnetite: near-black with a cold specular.
      this.oreNode(mag[0], mag[1], S * 0.3, 0.08 * m, {
        nug: '#3a3d46',
        deep: '#23252c',
        accent: '#9fb2c8',
      });
      sites.push(w1, mag);
      this.rubble(px, py, s, h, [pal.nug, '#5f4a42']);
    } else if (tile === Tile.RockCoal) {
      // THE SEAM WALL — a jagged black face driven up between grey
      // stone shoulders, glossed with hard angular facets.
      this.stoneBlock(X(-0.6 * S), base, S * 0.5, S * 0.52, -0.05 * S * m, Renderer.BARREN_STONE, h ^ 0x51f3);
      this.stoneBlock(X(0.58 * S), base, S * 0.46, S * 0.42, 0.05 * S * m, Renderer.BARREN_DIM, h ^ 0x9e37);
      // Stepped rectangular battlements, heights off the hash.
      const cH = crowded ? 0.7 : 1;
      const s0 = (0.78 + ((h >> 3) & 3) * 0.07) * cH;
      const s1 = (1.06 + ((h >> 6) & 3) * 0.06) * cH;
      const s2 = (0.84 + ((h >> 9) & 3) * 0.07) * cH;
      ctx.fillStyle = pal.nug;
      ctx.beginPath();
      ctx.moveTo(X(-0.5 * S), base);
      ctx.lineTo(X(-0.53 * S), base - S * s0);
      ctx.lineTo(X(-0.17 * S), base - S * s0);
      ctx.lineTo(X(-0.14 * S), base - S * s1);
      ctx.lineTo(X(0.19 * S), base - S * s1);
      ctx.lineTo(X(0.22 * S), base - S * s2);
      ctx.lineTo(X(0.48 * S), base - S * s2);
      ctx.lineTo(X(0.5 * S), base);
      ctx.closePath();
      ctx.fill();
      // Angular gloss facets + hard glint ticks — coal shines flat.
      ctx.fillStyle = '#44404f';
      ctx.beginPath();
      ctx.moveTo(X(-0.43 * S), base - S * 0.6 * cH);
      ctx.lineTo(X(-0.22 * S), base - S * 0.74 * cH);
      ctx.lineTo(X(-0.22 * S), base - S * 0.36 * cH);
      ctx.lineTo(X(-0.43 * S), base - S * 0.24 * cH);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(0), base - S * (s1 - 0.07 * cH));
      ctx.lineTo(X(0.17 * S), base - S * (s1 - 0.14 * cH));
      ctx.lineTo(X(0.17 * S), base - S * 0.46 * cH);
      ctx.lineTo(X(0), base - S * 0.4 * cH);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(X(-0.36 * S), base - S * 0.66 * cH, S * 0.12, Math.max(1.5, S * 0.03));
      ctx.fillRect(X(0.05 * S), base - S * 0.86 * cH, S * 0.1, Math.max(1.5, S * 0.028));
      // Tumbled coal blocks at the foot.
      this.oreNode(X(-0.34 * S), base - S * 0.09, S * 0.24, 0.1 * m, pal);
      this.oreNode(X(0.4 * S), base - S * 0.07, S * 0.2, -0.14 * m, pal);
      sites.push([X(-0.28 * S), base - S * 0.62 * cH], [X(0.1 * S), base - S * 0.8 * cH]);
      this.rubble(px, py, s, h, ['#232028', '#3d3a48']);
    } else if (tile === Tile.RockGold) {
      // THE CROWNED VEIN — a standing pillar split by a milky quartz
      // band, fat gold blocks studding the vein and one crowning the
      // top. The band lives IN the stone — clipped to the stack so it
      // reads as a vein, never a plank laid across it.
      const gSil = this.monolith(X(0), base, S * 1.08, S * 1.32 * H, m, pal.stone, h);
      ctx.save();
      const veinClip = new Path2D();
      gSil.forEach(([x, y], i) => (i === 0 ? veinClip.moveTo(x, y) : veinClip.lineTo(x, y)));
      veinClip.closePath();
      ctx.clip(veinClip);
      ctx.translate(px, base - S * 0.56 * H);
      ctx.rotate(-0.38 * m);
      ctx.fillStyle = '#c9c2d4';
      ctx.fillRect(-S * 0.8, -S * 0.12, S * 1.6, S * 0.24);
      ctx.fillStyle = '#efeaf2';
      ctx.fillRect(-S * 0.8, -S * 0.08, S * 1.6, S * 0.16);
      ctx.restore();
      const g1: [number, number] = [X(-0.34 * S), base - S * 0.26];
      const g2: [number, number] = [X(0.02 * S), base - S * 0.58 * H];
      const g3: [number, number] = [X(0.3 * S), base - S * 0.88 * H];
      const g4: [number, number] = [X(0), base - S * 1.34 * H]; // the crown
      this.oreNode(g1[0], g1[1], S * 0.26, 0.18 * m, pal);
      this.oreNode(g2[0], g2[1], S * 0.3, -0.1 * m, pal);
      this.oreNode(g3[0], g3[1], S * 0.24, 0.12 * m, pal);
      this.oreNode(g4[0], g4[1], S * 0.28, -0.08 * m, pal);
      sites.push(g2, g3, g4);
      this.rubble(px, py, s, h, [pal.nug, '#6a6375']);
      // The hoard glows: a slow warm pulse.
      const pulse = 0.6 + Math.sin(tSec * 1.7 + (h % 10)) * 0.4;
      this.queueGlow(
        (px - this.w / 2) / s + this.camera.x,
        (base - S * 0.6 - this.h / 2) / (s * this.camera.yScale) + this.camera.y,
        0.7,
        '242, 201, 76',
        0.14 * pulse,
      );
    } else if (tile === Tile.RockSilver) {
      // THE SILVERSPUR — the rock's shoulder has BROKEN OPEN into a
      // crystal pocket, and the silver grows from inside it. The
      // integration is structural, not painted: cavity in shadow, a
      // freshly-cut rim facet, columns rising from WITHIN the pocket
      // with the stone's front lip overlapping their bases, and one
      // column standing proud in front — occlusion layering is what
      // makes the metal belong to the rock. Columns are blocky
      // near-parallel shafts with slanted flat caps (the stoneBlock
      // lit-cap grammar), split hard into lit/shadow facets; the tall
      // column carries a sky-sheen stripe — polished metal remembers
      // the sky. Steel-blue tones, white only in chips.
      this.stoneBlock(X(0.56 * S), base, S * 0.44, S * 0.34 * H, 0.05 * S * m, Renderer.BARREN_DIM, h ^ 0x51f3);
      const vSil = this.monolith(X(-0.04 * S), base, S * 1.2, S * 1.02 * H, m, pal.stone, h);
      const silPath = new Path2D();
      vSil.forEach(([x, y], i) => (i === 0 ? silPath.moveTo(x, y) : silPath.lineTo(x, y)));
      silPath.closePath();
      // A columnar silver crystal rooted at (bx, by): blocky shaft,
      // slanted flat cap, hard lengthwise facet split. Returns the
      // cap point for the sparkle sites.
      const column = (bx: number, by: number, len: number, w: number, ang: number, sheen = false): [number, number] => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(ang);
        ctx.fillStyle = '#8e97ad';
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, 0);
        ctx.lineTo(-w * 0.56, -len * 0.62);
        ctx.lineTo(-w * 0.36, -len);
        ctx.lineTo(w * 0.3, -len * 0.86);
        ctx.lineTo(w * 0.54, -len * 0.58);
        ctx.lineTo(w * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d4dcea';
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, 0);
        ctx.lineTo(-w * 0.56, -len * 0.62);
        ctx.lineTo(-w * 0.36, -len);
        ctx.lineTo(w * 0.0, -len * 0.92);
        ctx.lineTo(w * 0.02, -len * 0.5);
        ctx.lineTo(-w * 0.04, 0);
        ctx.closePath();
        ctx.fill();
        if (sheen) {
          // The sky, reflected: one narrow brighter stripe running the
          // shaft inside the lit facet.
          ctx.fillStyle = '#f2f6fe';
          ctx.beginPath();
          ctx.moveTo(-w * 0.34, -len * 0.06);
          ctx.lineTo(-w * 0.4, -len * 0.6);
          ctx.lineTo(-w * 0.26, -len * 0.94);
          ctx.lineTo(-w * 0.12, -len * 0.88);
          ctx.lineTo(-w * 0.18, -len * 0.5);
          ctx.lineTo(-w * 0.14, -len * 0.06);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#eef2fa';
        ctx.beginPath();
        ctx.moveTo(-w * 0.36, -len);
        ctx.lineTo(w * 0.3, -len * 0.86);
        ctx.lineTo(w * 0.18, -len * 0.76);
        ctx.lineTo(-w * 0.28, -len * 0.88);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-w * 0.36, -len);
        ctx.lineTo(-w * 0.1, -len * 0.95);
        ctx.lineTo(-w * 0.3, -len * 0.86);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return [bx + Math.sin(ang) * len * -0.95, by - Math.cos(ang) * len * 0.95];
      };
      const lean = (((h >> 7) & 7) / 7 - 0.5) * 0.2;
      // 1) The pocket: a broken basin high in the stone — cavity in
      //    shadow with a freshly-cut facet along its lower rim, cracks
      //    running off its corners. All clipped INTO the rock.
      ctx.save();
      ctx.clip(silPath);
      ctx.fillStyle = '#262a38';
      ctx.beginPath();
      ctx.moveTo(X(-0.46 * S), base - S * 0.56 * H);
      ctx.lineTo(X(-0.3 * S), base - S * 0.78 * H);
      ctx.lineTo(X(0.06 * S), base - S * 0.9 * H);
      ctx.lineTo(X(0.38 * S), base - S * 0.7 * H);
      ctx.lineTo(X(0.28 * S), base - S * 0.5 * H);
      ctx.lineTo(X(-0.12 * S), base - S * 0.44 * H);
      ctx.closePath();
      ctx.fill();
      // The fresh cut: a lighter cool facet where the rock sheared.
      ctx.fillStyle = '#6b6878';
      ctx.beginPath();
      ctx.moveTo(X(-0.46 * S), base - S * 0.56 * H);
      ctx.lineTo(X(-0.3 * S), base - S * 0.78 * H);
      ctx.lineTo(X(-0.2 * S), base - S * 0.72 * H);
      ctx.lineTo(X(-0.36 * S), base - S * 0.52 * H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(X(0.38 * S), base - S * 0.7 * H);
      ctx.lineTo(X(0.52 * S), base - S * 0.78 * H);
      ctx.moveTo(X(-0.12 * S), base - S * 0.44 * H);
      ctx.lineTo(X(-0.2 * S), base - S * 0.24 * H);
      ctx.stroke();
      ctx.restore();
      // 2) Columns rising from INSIDE the pocket — their feet stand on
      //    the cavity floor, behind the lip that comes next.
      const t1 = column(X(-0.08 * S), base - S * 0.52 * H, S * 0.78 * H, S * 0.22, (-0.1 + lean) * m, true);
      const t2 = column(X(0.18 * S), base - S * 0.56 * H, S * 0.5 * H, S * 0.16, (0.3 + lean) * m);
      // 3) The front lip: the pocket's lower rim, a stone wedge laid
      //    OVER the column feet — the occlusion that roots them.
      ctx.save();
      ctx.clip(silPath);
      ctx.fillStyle = pal.stone.face;
      ctx.beginPath();
      ctx.moveTo(X(-0.5 * S), base - S * 0.5 * H);
      ctx.lineTo(X(-0.1 * S), base - S * 0.56 * H);
      ctx.lineTo(X(0.3 * S), base - S * 0.52 * H);
      ctx.lineTo(X(0.42 * S), base - S * 0.4 * H);
      ctx.lineTo(X(0.16 * S), base - S * 0.3 * H);
      ctx.lineTo(X(-0.34 * S), base - S * 0.32 * H);
      ctx.closePath();
      ctx.fill();
      // Lit brink along the lip's top edge — the stoneBlock cap law.
      ctx.fillStyle = pal.stone.top;
      ctx.beginPath();
      ctx.moveTo(X(-0.5 * S), base - S * 0.5 * H);
      ctx.lineTo(X(-0.1 * S), base - S * 0.56 * H);
      ctx.lineTo(X(0.3 * S), base - S * 0.52 * H);
      ctx.lineTo(X(0.29 * S), base - S * 0.475 * H);
      ctx.lineTo(X(-0.1 * S), base - S * 0.515 * H);
      ctx.lineTo(X(-0.44 * S), base - S * 0.465 * H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 4) The front growth: one shorter column standing proud of the
      //    lip, and a half-sunk silver block at the pocket's rim.
      const t3 = column(X(-0.26 * S), base - S * 0.36 * H, S * 0.4 * H, S * 0.15, (-0.42 + lean * 0.5) * m);
      this.oreNode(X(0.34 * S), base - S * 0.44 * H, S * 0.24, 0.1 * m, pal);
      // 5) The foot: the cut block every deposit promises the pick.
      const cut: [number, number] = [X(0.34 * S), base - S * 0.14];
      this.oreNode(cut[0], cut[1], S * 0.3, 0.08 * m, pal);
      sites.push(t1, t2, t3, cut);
      this.rubble(px, py, s, h, [pal.nug, '#6a6375', pal.deep]);
    } else if (tile === Tile.RockMithril) {
      // THE RISEN LODE — mithril is the feather-light sky-metal, and
      // this is the only deposit in the game that FLOATS: a broken
      // notch in the tall spire holds the embedded lode-mass, and a
      // trail of faceted shards drifts weightlessly up off it, each
      // bobbing on its own slow phase with a contact shadow selling
      // the hover. Integration follows the silverspur law — notch
      // clipped INTO the stone, lode seated behind a stone lip, the
      // sky claiming what worked loose.
      this.stoneBlock(X(0.5 * S), base, S * 0.48, S * 0.34 * H, 0.04 * S * m, Renderer.BARREN_DIM, h ^ 0x9e37);
      const spH = crowded ? 0.62 : 1;
      const mSil = this.monolith(X(-0.04 * S), base, S * 0.98, S * 1.6 * spH, m, pal.stone, h);
      const spirePath = new Path2D();
      mSil.forEach(([x, y], i) => (i === 0 ? spirePath.moveTo(x, y) : spirePath.lineTo(x, y)));
      spirePath.closePath();
      // A faceted mithril shard: low-poly chunk, hard three-tone split
      // (deep flank, sky-blue body, lit facet) + one white chip.
      const shard = (cx2: number, cy2: number, r: number, rot: number): void => {
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(rot);
        ctx.fillStyle = pal.deep;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.15);
        ctx.lineTo(-r * 0.45, -r * 0.85);
        ctx.lineTo(r * 0.5, -r * 0.75);
        ctx.lineTo(r * 0.95, r * 0.1);
        ctx.lineTo(r * 0.35, r * 0.8);
        ctx.lineTo(-r * 0.5, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.nug;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.15);
        ctx.lineTo(-r * 0.45, -r * 0.85);
        ctx.lineTo(r * 0.5, -r * 0.75);
        ctx.lineTo(r * 0.28, -r * 0.05);
        ctx.lineTo(-r * 0.35, r * 0.45);
        ctx.closePath();
        ctx.fill();
        // Lit facet toward the sky.
        ctx.fillStyle = '#b7d2f2';
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.85);
        ctx.lineTo(r * 0.5, -r * 0.75);
        ctx.lineTo(r * 0.28, -r * 0.05);
        ctx.lineTo(-r * 0.25, -r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.85);
        ctx.lineTo(-r * 0.1, -r * 0.78);
        ctx.lineTo(-r * 0.38, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      // 1) The notch: a shadowed bite in the spire's flank where the
      //    lode surfaced — clipped INTO the stone, crack running down.
      const notchY = base - S * 0.98 * spH;
      ctx.save();
      ctx.clip(spirePath);
      ctx.fillStyle = '#262a38';
      ctx.beginPath();
      ctx.moveTo(X(-0.34 * S), notchY + S * 0.08);
      ctx.lineTo(X(-0.16 * S), notchY - S * 0.26);
      ctx.lineTo(X(0.2 * S), notchY - S * 0.3);
      ctx.lineTo(X(0.34 * S), notchY - S * 0.02);
      ctx.lineTo(X(0.12 * S), notchY + S * 0.16);
      ctx.lineTo(X(-0.14 * S), notchY + S * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(X(-0.14 * S), notchY + S * 0.18);
      ctx.lineTo(X(-0.22 * S), notchY + S * 0.52);
      ctx.stroke();
      ctx.restore();
      // 2) The lode-mass: one big faceted chunk seated IN the notch.
      shard(X(0.0 * S), notchY - S * 0.04, S * 0.3, 0.1 * m);
      // 3) The lip: the notch's lower rim laid over the mass's foot —
      //    the occlusion that roots it in the spire.
      ctx.save();
      ctx.clip(spirePath);
      ctx.fillStyle = pal.stone.face;
      ctx.beginPath();
      ctx.moveTo(X(-0.36 * S), notchY + S * 0.1);
      ctx.lineTo(X(0.14 * S), notchY + S * 0.14);
      ctx.lineTo(X(0.36 * S), notchY + S * 0.02);
      ctx.lineTo(X(0.3 * S), notchY + S * 0.34);
      ctx.lineTo(X(-0.28 * S), notchY + S * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.stone.top;
      ctx.beginPath();
      ctx.moveTo(X(-0.36 * S), notchY + S * 0.1);
      ctx.lineTo(X(0.14 * S), notchY + S * 0.14);
      ctx.lineTo(X(0.36 * S), notchY + S * 0.02);
      ctx.lineTo(X(0.35 * S), notchY + S * 0.07);
      ctx.lineTo(X(0.14 * S), notchY + S * 0.185);
      ctx.lineTo(X(-0.35 * S), notchY + S * 0.145);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 4) THE DRIFT: shards working loose and rising — each bobs on
      //    its own slow phase (deterministic off tSec, so bakes hold
      //    still), with a soft contact shadow on the stone below the
      //    lowest one anchoring the hover.
      const bob = (k: number): number => Math.sin(tSec * 1.15 + k * 2.1 + (h % 7)) * S * 0.025;
      const f1: [number, number] = [X(0.1 * S), notchY - S * 0.52 + bob(0)];
      const f2: [number, number] = [X(-0.08 * S), notchY - S * 0.82 + bob(1)];
      const f3: [number, number] = [X(0.16 * S), notchY - S * 1.08 + bob(2)];
      if (!this.bakingMask) {
        ctx.fillStyle = 'rgba(20, 16, 30, 0.28)';
        ctx.beginPath();
        ctx.ellipse(f1[0], notchY - S * 0.2, S * 0.13 - bob(0) * 0.8, S * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      shard(f1[0], f1[1], S * 0.15, 0.3 * m + bob(0) * 0.01);
      shard(f2[0], f2[1], S * 0.11, -0.5 * m + bob(1) * 0.01);
      shard(f3[0], f3[1], S * 0.075, 0.8 * m);
      // 5) The foot: half-sunk cut blocks — the pick's honest target.
      const cut: [number, number] = [X(-0.24 * S), base - S * 0.2];
      this.oreNode(cut[0], cut[1], S * 0.3, -0.08 * m, pal);
      this.oreNode(X(0.3 * S), base - S * 0.12, S * 0.22, 0.14 * m, pal);
      sites.push(f1, f2, f3, cut);
      this.rubble(px, py, s, h, [pal.nug, '#6a6375']);
      // The cool halo rides the drift — the sky remembering its metal.
      const mPulse = 0.6 + Math.sin(tSec * 1.3 + (h % 10)) * 0.4;
      this.queueGlow(
        (px - this.w / 2) / s + this.camera.x,
        (notchY - S * 0.6 - this.h / 2) / (s * this.camera.yScale) + this.camera.y,
        0.6,
        '143, 180, 228',
        0.12 * mPulse,
      );
    } else if (tile === Tile.RockAdamant) {
      // THE TWIN HORNS — two hard prongs leaning apart in a V, deep
      // green plates clipped into the tall horn, an adamant block
      // seated in the notch between them. Nothing else in the rock
      // family splits; the silhouette is the signature.
      const aH = crowded ? 0.66 : 1;
      const hornL = this.stoneBlock(X(-0.3 * S), base, S * 0.62, S * 1.42 * aH, -0.22 * S * m, pal.stone, h, 0.75);
      this.stoneBlock(X(0.34 * S), base, S * 0.54, S * 1.02 * aH, 0.24 * S * m, pal.stone, h ^ 0x51f3, 0.75);
      // Green armor plates live IN the tall horn.
      ctx.save();
      const hornClip = new Path2D();
      hornL.forEach(([x, y], i) => (i === 0 ? hornClip.moveTo(x, y) : hornClip.lineTo(x, y)));
      hornClip.closePath();
      ctx.clip(hornClip);
      ctx.fillStyle = pal.deep;
      ctx.save();
      ctx.translate(X(-0.3 * S), base);
      ctx.rotate(-0.18 * m);
      ctx.fillRect(-S * 0.5, -S * 1.06 * aH, S, S * 0.13 * aH);
      ctx.fillRect(-S * 0.5, -S * 0.6 * aH, S, S * 0.1 * aH);
      ctx.restore();
      ctx.restore();
      const a1: [number, number] = [X(0.02 * S), base - S * 0.52 * aH]; // the notch
      const a2: [number, number] = [X(-0.36 * S), base - S * 1.18 * aH];
      const a3: [number, number] = [X(0.4 * S), base - S * 0.2];
      this.oreNode(a1[0], a1[1], S * 0.36, 0.08 * m, pal);
      this.oreNode(a2[0], a2[1], S * 0.3, -0.14 * m, pal);
      this.oreNode(a3[0], a3[1], S * 0.26, 0.16 * m, pal);
      sites.push(a1, a2);
      this.rubble(px, py, s, h, [pal.nug, '#4f5a54', pal.deep]);
    } else if (tile === Tile.RockObsidian) {
      // THE GLASS FLOW — low and wide where the others stand tall: a
      // cooled black flow in hard angular steps, glossed with violet
      // facets and conchoidal arcs, ember light still breathing in
      // the crack along its base. Volcanic, not stony — nothing else
      // in the family glows warm.
      const oH = crowded ? 0.75 : 1;
      this.stoneBlock(X(-0.62 * S), base, S * 0.44, S * 0.34 * oH, -0.04 * S * m, Renderer.BARREN_DIM, h ^ 0x9e37);
      // The flow: one wide stepped slab of black glass.
      const f0 = (0.42 + ((h >> 3) & 3) * 0.05) * oH;
      const f1 = (0.66 + ((h >> 6) & 3) * 0.05) * oH;
      const f2 = (0.36 + ((h >> 9) & 3) * 0.04) * oH;
      ctx.fillStyle = pal.nug;
      ctx.beginPath();
      ctx.moveTo(X(-0.66 * S), base);
      ctx.lineTo(X(-0.6 * S), base - S * f0);
      ctx.lineTo(X(-0.2 * S), base - S * f0 - S * 0.06);
      ctx.lineTo(X(-0.08 * S), base - S * f1);
      ctx.lineTo(X(0.3 * S), base - S * f1 + S * 0.04);
      ctx.lineTo(X(0.44 * S), base - S * f2);
      ctx.lineTo(X(0.68 * S), base - S * f2 + S * 0.05);
      ctx.lineTo(X(0.72 * S), base);
      ctx.closePath();
      ctx.fill();
      // Violet gloss facets — flat parallelograms, biased to the light.
      ctx.fillStyle = '#5c4f70';
      ctx.beginPath();
      ctx.moveTo(X(-0.5 * S), base - S * f0 * 0.82);
      ctx.lineTo(X(-0.26 * S), base - S * f0 * 0.94);
      ctx.lineTo(X(-0.3 * S), base - S * f0 * 0.4);
      ctx.lineTo(X(-0.52 * S), base - S * f0 * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(-0.02 * S), base - S * f1 * 0.9);
      ctx.lineTo(X(0.22 * S), base - S * f1 * 0.82);
      ctx.lineTo(X(0.18 * S), base - S * f1 * 0.44);
      ctx.lineTo(X(-0.04 * S), base - S * f1 * 0.5);
      ctx.closePath();
      ctx.fill();
      // Conchoidal arcs: the glass-fracture tell, thin and hard.
      ctx.strokeStyle = pal.accent;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(1.4, S * 0.028);
      ctx.beginPath();
      ctx.arc(X(-0.34 * S), base - S * f0 * 0.55, S * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      ctx.moveTo(X(0.14 * S) + S * 0.12, base - S * f1 * 0.6);
      ctx.arc(X(0.14 * S), base - S * f1 * 0.6, S * 0.12, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // The ember crack: warm light breathing along the base — the
      // one warm note in the whole rock family, so it must READ.
      const breathe = 0.55 + Math.sin(tSec * 2.3 + (h % 7)) * 0.45;
      ctx.fillStyle = '#ff8a3c';
      ctx.globalAlpha = 0.65 + 0.35 * breathe;
      ctx.fillRect(X(-0.44 * S), base - Math.max(2.5, S * 0.07), S * 0.34, Math.max(2.5, S * 0.06));
      ctx.fillRect(X(0.1 * S), base - Math.max(2.5, S * 0.06), S * 0.26, Math.max(2.5, S * 0.055));
      // A vent higher in the flow, ember light leaking up a step.
      ctx.fillRect(X(-0.12 * S), base - S * f1 * 0.98, S * 0.14, Math.max(2, S * 0.04));
      ctx.globalAlpha = 1;
      // Knapped shards leaning at the foot.
      this.oreNode(X(-0.2 * S), base - S * 0.12, S * 0.26, -0.12 * m, pal);
      this.oreNode(X(0.5 * S), base - S * 0.1, S * 0.22, 0.16 * m, pal);
      sites.push([X(-0.3 * S), base - S * f0 * 0.6], [X(0.1 * S), base - S * f1 * 0.7]);
      this.rubble(px, py, s, h, ['#241d30', '#3b3247']);
      this.queueGlow(
        (px - this.w / 2) / s + this.camera.x,
        (base - S * 0.15 - this.h / 2) / (s * this.camera.yScale) + this.camera.y,
        0.55,
        '232, 104, 60',
        0.12 * breathe,
      );
    } else {
      // THE FALLEN STAR — a scorched crater cupping a half-buried
      // core of starmetal: two dim shoulder blocks ring a fat bright
      // block with hard cracks radiating from the impact. The only
      // deposit that reads as an EVENT, not a formation.
      const cH = crowded ? 0.75 : 1;
      // Scorch: a flat dark apron under everything.
      ctx.fillStyle = 'rgba(24, 17, 32, 0.5)';
      ctx.beginPath();
      ctx.ellipse(px, base - S * 0.06, S * 0.78, S * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      this.stoneBlock(X(-0.52 * S), base, S * 0.52, S * 0.5 * cH, 0.12 * S * m, pal.stone, h ^ 0x51f3);
      this.stoneBlock(X(0.52 * S), base, S * 0.48, S * 0.42 * cH, -0.12 * S * m, pal.stone, h ^ 0x9e37);
      // Radiating impact cracks — hard strokes, out from the core.
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.6)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(X(-0.18 * S), base - S * 0.3 * cH);
      ctx.lineTo(X(-0.52 * S), base - S * 0.06);
      ctx.moveTo(X(0.2 * S), base - S * 0.32 * cH);
      ctx.lineTo(X(0.5 * S), base - S * 0.1);
      ctx.lineTo(X(0.64 * S), base - S * 0.02);
      ctx.moveTo(X(0.04 * S), base - S * 0.18);
      ctx.lineTo(X(0.1 * S), base - S * 0.02);
      ctx.stroke();
      // The core: one great tilted block of starmetal, half-sunk —
      // the fattest single node in the game; the event IS the ore.
      const core: [number, number] = [X(0), base - S * 0.46 * cH];
      this.oreNode(core[0], core[1], S * 0.62, -0.14 * m, pal);
      const shard: [number, number] = [X(-0.42 * S), base - S * 0.64 * cH];
      this.oreNode(shard[0], shard[1], S * 0.26, 0.2 * m, pal);
      const ember: [number, number] = [X(0.44 * S), base - S * 0.52 * cH];
      this.oreNode(ember[0], ember[1], S * 0.2, -0.22 * m, pal);
      sites.push(core, shard, ember);
      this.rubble(px, py, s, h, [pal.nug, '#3b3648', pal.deep]);
      // Starlight never quite goes out: a pale violet pulse.
      const sPulse = 0.6 + Math.sin(tSec * 1.9 + (h % 10)) * 0.4;
      this.queueGlow(
        (px - this.w / 2) / s + this.camera.x,
        (base - S * 0.42 - this.h / 2) / (s * this.camera.yScale) + this.camera.y,
        0.75,
        '214, 203, 246',
        0.16 * sPulse,
      );
    }

    // Idle shimmer: brief four-point twinkles over the crystal sites -
    // gold flashes often, the fallen star outright glitters, and
    // everything else winks patiently.
    const period =
      tile === Tile.RockStarfall ? 1.7
      : tile === Tile.RockGold ? 2.1
      : tile === Tile.RockMithril ? 2.6
      : 3.4;
    for (let k = 0; k < sites.length; k++) {
      const a = Renderer.twinkle(tSec, h >> (k * 4), period + k * 0.53);
      if (a <= 0) continue;
      const [sx2, sy2] = sites[k]!;
      const jx = (((h >> (k * 7)) % 20) - 10) / 100 * s;
      this.sparkle(sx2 + jx, sy2 - s * 0.04, s * (0.07 + 0.05 * a), 0.9 * a, '#ffffff');
      this.sparkle(sx2 + jx, sy2 - s * 0.04, s * (0.035 + 0.02 * a), 0.9 * a, pal.accent);
    }
  }

  // -------------------------------------------------------------- trees

  /**
   * The forest is GROWN, not authored: render/trees.ts turns each
   * tile's hash into a deterministic branching skeleton — species
   * grammars with three structural variants each, foliage clusters
   * rustling on their own offsets of the ONE shared wind field. The
   * renderer's job here is framing: screen anchor, growth stage
   * (sapling -> grow-in -> full tree), leaf-shed particles, felling.
   */

  /** Regrown trees scale up from sapling size instead of popping in. */
  private readonly growingTrees = new Map<string, number>();

  /** Start a growth ease at this tile (sapling sprout or stand-up). */
  addGrowingTree(tx: number, ty: number): void {
    this.growingTrees.set(`${tx},${ty}`, performance.now());
  }

  /** Soft settle with a whisper of overshoot — growth, not inflation. */
  private static growEase(u: number): number {
    const v = Math.min(1, u) - 1;
    return 1 + 2.2 * v * v * v + 1.2 * v * v;
  }

  /** Growth scale for a tree/sapling item, advancing its animation. */
  private growthOf(tx: number, ty: number, from: number, to: number, ms: number): number {
    const key = `${tx},${ty}`;
    const born = this.growingTrees.get(key);
    if (born === undefined) return to;
    const u = (performance.now() - born) / ms;
    if (u >= 1) {
      this.growingTrees.delete(key);
      return to;
    }
    return from + (to - from) * Renderer.growEase(u);
  }

  /**
   * Loot-chest lids ease over their hinge instead of popping between
   * the closed and open tiles. Same clock pattern as growingTrees:
   * main.ts kicks an ease on the tile patch, the painter reads its
   * openness each frame, and while a key is live the ring-cache gate
   * keeps that chest on the live outline pass (collectRaisedTiles).
   */
  private readonly chestEases = new Map<string, { dir: 'open' | 'close'; born: number }>();

  /** Start a lid ease at this tile (fling open or quiet re-latch). */
  addChestEase(tx: number, ty: number, dir: 'open' | 'close'): void {
    this.chestEases.set(`${tx},${ty}`, { dir, born: performance.now() });
  }

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
  private static readonly SMASH_TONES: Partial<
    Record<SmashKind, { dust: string[]; splinters: string[]; chips: string[] }>
  > = {
    bonepile: {
      dust: ['#cfc7ae', '#8b8272', '#e6dfc8'],
      splinters: ['#e6dfc8', '#cfc7ae', '#f2ecd9'],
      chips: ['#cfc7ae', '#e6dfc8'],
    },
    crackedwall: {
      dust: ['#5a5370', '#3a3444', '#767083'],
      splinters: ['#767083', '#5a5370', '#8c8798'],
      chips: ['#5a5370', '#767083'],
    },
  };

  crackProp(wx: number, wy: number, dir: number, kind: SmashKind): void {
    this.addPropShake(Math.floor(wx), Math.floor(wy));
    this.debris.chip(wx, wy, dir, kind);
    this.particles.burst(wx, wy - 0.15, 5, Renderer.SMASH_TONES[kind]?.chips ?? ['#8a6534', '#c9a76a'], {
      speed: 1.0,
      life: 0.45,
      size: 0.045,
      dir,
      spread: 1.3,
      gravity: 5,
    });
  }

  smashProp(wx: number, wy: number, dir: number, kind: SmashKind): void {
    this.debris.smash(wx, wy, dir, kind);
    const tones = Renderer.SMASH_TONES[kind];
    // Wood dust rolls out low along the blow and billows to a stop.
    this.particles.burst(wx, wy, 10, tones?.dust ?? ['#8a6534', '#6f4d26', '#c9a76a'], {
      speed: 1.5,
      life: 0.7,
      size: 0.07,
      dir,
      spread: 1.7,
      gravity: 0,
      drag: 2.4,
      grow: 0.28,
      ground: true,
    });
    // Splinters spit fast and die young.
    this.particles.burst(wx, wy - 0.25, 8, tones?.splinters ?? ['#c9a76a', '#a5793f', '#e0d4b8'], {
      speed: 3.6,
      life: 0.38,
      size: 0.05,
      dir,
      spread: 1.0,
      gravity: 7,
      shape: 'streak',
    });
  }

  /**
   * Lid openness 0..1 for a chest tile, advancing its animation.
   * Opening is a two-beat swing: the latch gives (a slow first lift)
   * before the lid FLINGS past vertical and settles with growEase's
   * overshoot. Closing is a shorter, sober fall back onto the rim.
   */
  private chestOpenness(tx: number, ty: number, open: boolean): number {
    const key = `${tx},${ty}`;
    const ease = this.chestEases.get(key);
    if (ease === undefined) return open ? 1 : 0;
    const u = (performance.now() - ease.born) / (ease.dir === 'open' ? 820 : 420);
    if (u >= 1) {
      this.chestEases.delete(key);
      return open ? 1 : 0;
    }
    if (ease.dir === 'open') {
      // The latch beat: creep to 0.14 open over the first quarter,
      // then hand the swing to the overshoot curve.
      if (u < 0.24) return 0.14 * (u / 0.24) * (u / 0.24);
      return 0.14 + 0.86 * Renderer.growEase((u - 0.24) / 0.76);
    }
    return 1 - Renderer.growEase(u);
  }

  /**
   * DOOR EASES — the same clock pattern as chests: main.ts kicks an
   * ease on the tile patch (or a 'rattle' fx for a locked refusal) and
   * the doorway painters read swing/shudder each frame. Keys are the
   * door unit's ANCHOR tile — the west-most (E-W) or north-most (N-S)
   * member of a wide run, or the tile itself for singles.
   */
  private readonly doorEases = new Map<string, { dir: 'open' | 'close' | 'shake'; born: number }>();

  /** Start a leaf swing (or a locked-door shudder) at this tile. */
  addDoorEase(tx: number, ty: number, dir: 'open' | 'close' | 'shake'): void {
    const now = performance.now();
    // Wide runs ease every member tile but only the anchor is ever
    // read back — sweep stale keys so the map stays a handful.
    if (this.doorEases.size > 32) {
      for (const [k, e] of this.doorEases) {
        if (now - e.born > 2000) this.doorEases.delete(k);
      }
    }
    this.doorEases.set(`${tx},${ty}`, { dir, born: now });
  }

  /**
   * Leaf openness 0..1 for a door anchor, advancing its animation.
   * Opening swings with growEase's overshoot — the leaf flings past
   * its rest and settles; closing is a shorter, sober pull-to. A
   * 'shake' ease holds the posture (the door never moved).
   */
  private doorOpenness(tx: number, ty: number, open: boolean): number {
    const key = `${tx},${ty}`;
    const ease = this.doorEases.get(key);
    if (ease === undefined || ease.dir === 'shake') return open ? 1 : 0;
    const u = (performance.now() - ease.born) / (ease.dir === 'open' ? 520 : 380);
    if (u >= 1) {
      this.doorEases.delete(key);
      return open ? 1 : 0;
    }
    if (ease.dir === 'open') return Renderer.growEase(u);
    return Math.max(0, 1 - Renderer.growEase(u));
  }

  /**
   * Signed shudder offset for a locked door's refusal — a quick
   * decaying knock-knock in the frame. Zero when quiet.
   */
  private doorShakeAt(tx: number, ty: number): number {
    const key = `${tx},${ty}`;
    const ease = this.doorEases.get(key);
    if (ease === undefined || ease.dir !== 'shake') return 0;
    const u = (performance.now() - ease.born) / 460;
    if (u >= 1) {
      this.doorEases.delete(key);
      return 0;
    }
    return Math.sin(u * Math.PI * 7) * (1 - u);
  }

  /**
   * PROP SHUDDER — a durable prop absorbing a blow that didn't finish
   * it. Same decaying-knock clock as the door rattle; keyed per tile,
   * self-pruning. The offset rides the whole drawn prop (cached-ring
   * blits included — position isn't part of the bake).
   */
  private readonly propShakes = new Map<string, number>();

  addPropShake(tx: number, ty: number): void {
    this.propShakes.set(`${tx},${ty}`, performance.now());
  }

  /** Signed screen-x shudder in px for a hit prop. Zero when quiet. */
  private propShakeX(tx: number, ty: number): number {
    if (this.propShakes.size === 0) return 0;
    const key = `${tx},${ty}`;
    const born = this.propShakes.get(key);
    if (born === undefined) return 0;
    const u = (performance.now() - born) / 380;
    if (u >= 1) {
      this.propShakes.delete(key);
      return 0;
    }
    return Math.sin(u * Math.PI * 8) * (1 - u) * 0.05 * this.camera.scale;
  }

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
  private readonly treeSprites = new Map<
    number,
    {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      cw: number; // used css-px region
      ch: number;
      ax: number; // trunk-base anchor within the sprite (css px)
      ay: number;
      scale: number; // camera scale at bake
      frame: number; // last bake frame
      used: number; // last frame drawn (eviction)
      outlined: boolean; // ring baked in — must match outlineOn
    }
  >();
  /** Sun-shadow twin: the projected silhouette Path2D built at origin. */
  private readonly treeShadows = new Map<
    number,
    { path: Path2D; scale: number; frame: number; used: number }
  >();
  private treeBakeBudget = 0;
  private treeShadowBudget = 0;
  /** Per-frame time budget for non-visible sprite bakes (pad bands,
   *  cadence re-bakes) — see SPRITE_BAKE_MS. */
  private spriteBakeMsLeft = 0;
  /** Per-frame shadow-mask bake allowance — see shadowMask. */
  private maskBakeBudget = 0;
  private frameNo = 0;
  /** Trees drawn last frame — feeds the adaptive re-bake cadence. */
  private treesVisible = 0;
  private treeCadence = TREE_REBAKE_FRAMES;
  /** Evicted sprite canvases, reused by new bakes (GC churn while walking). */
  private readonly spriteCanvasPool: HTMLCanvasElement[] = [];

  private static treeKey(wx: number, wy: number, tile: Tile): number {
    return ((Math.floor(wx) + 8192) * 32768 + (Math.floor(wy) + 8192)) * 64 + (tile & 63);
  }

  private bakeTreeSprite(
    prev: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined,
    m: TreeModel,
    wx: number,
    wy: number,
    tSec: number,
  ): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cw: number;
    ch: number;
    ax: number;
    ay: number;
    scale: number;
    frame: number;
    used: number;
    outlined: boolean;
  } {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    // Headroom: crown spread + wind-bend throw sideways; blob jitter
    // (facet radii reach 1.12r) and rustle bob above; root flare below.
    const half = (m.spread * 1.15 + 0.08 * m.height + 0.45) * s;
    const top = (m.height * 1.18 + 0.45) * s;
    const below = 0.3 * s;
    const cw = Math.ceil(half * 2);
    const ch = Math.ceil(top + below);
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.max(1, Math.ceil(cw * dpr));
    const ph = Math.max(1, Math.ceil(ch * dpr));
    const { canvas, sctx } = this.acquireSpriteCanvas(prev, pw, ph);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    paintTree(sctx, m, { bx: half, groundY: top, s, syT, wx, wy, tSec, grow: 1 });
    if (this.outlineOn) this.bakeOutlineRing(canvas, sctx, pw, ph);
    return {
      canvas,
      ctx: sctx,
      cw,
      ch,
      ax: half,
      ay: top,
      scale: s,
      frame: this.frameNo,
      used: this.frameNo,
      outlined: this.outlineOn,
    };
  }

  /**
   * Props whose outline ring bakes into a cached sprite (with their
   * art) instead of running the per-frame outline pass. Only DISCRETE
   * pieces belong here — run-merged furniture rings solely when
   * isolated (its body is undefined mid-run), and flame-lit pieces
   * (LampPost, Hearth, Campfire, the stations) stay on the live pass
   * so their fire isn't sampled down to cadence rate.
   */
  private static readonly CACHED_RING_TILES = new Set<Tile>([
    Tile.Stump,
    Tile.Barrel,
    Tile.Crate,
    Tile.CrateGoods,
    Tile.Chair,
    Tile.Bookshelf,
    Tile.Cabinet,
    Tile.BannerPole,
    Tile.HangingSign,
    Tile.Signpost,
    Tile.FlowerBox,
    Tile.ToolRack,
    Tile.WeaponRack,
    Tile.Vault,
    Tile.Lectern,
    Tile.Basin,
    // Rocks are landmarks with occasional ore glints — cadence-sampled
    // like tree sway. Lamp flicker survives cadence sampling too (it
    // IS a shimmer); the lantern's bloom lives in the light passes.
    Tile.Rock,
    Tile.RockCopper,
    Tile.RockTin,
    Tile.RockIron,
    Tile.RockCoal,
    Tile.RockGold,
    Tile.LampPost,
    // Dungeon props: stalagmites, bone piles, and shroom clusters are
    // still art; the brazier rides the LampPost precedent — its flame
    // shimmer survives cadence sampling, and the bloom lives in the
    // light passes (collectStaticLights), never in the painter.
    Tile.Stalagmite,
    Tile.BonePile,
    Tile.GlowShroom,
    Tile.Brazier,
    // Loot chests idle in the cache (twinkles survive cadence
    // sampling; the mossy seam-glow is queued at collect time, never
    // in the painter). A chest MID-LID-EASE is exempted by the gate
    // in collectRaisedTiles so the swing animates at frame rate.
    Tile.ChestWood,
    Tile.ChestWoodOpen,
    Tile.ChestIron,
    Tile.ChestIronOpen,
    Tile.ChestGilded,
    Tile.ChestGildedOpen,
    Tile.ChestMossy,
    Tile.ChestMossyOpen,
    Tile.ChestBoss,
    Tile.ChestBossOpen,
  ]);

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
  private static readonly STATION_CACHE_TILES = new Set<Tile>([
    Tile.Campfire,
    Tile.Furnace,
    Tile.Anvil,
    Tile.Workbench,
    Tile.BankChest,
    Tile.ShopCounter,
    Tile.Alembic,
    Tile.Hearth,
    Tile.TanningRack,
    Tile.Loom,
    Tile.CarvingBench,
  ]);

  /**
   * Cached-ring props with NO ambient animation: skip the fast tree
   * cadence and heal on a slow stagger instead (scale drift and
   * neighbor edits still re-bake) — re-baking a static bookshelf at
   * 20Hz is pure bake-budget waste.
   */
  private static readonly STATIC_RING_TILES = new Set<Tile>([
    Tile.Stump,
    Tile.Crate,
    Tile.CrateGoods,
    Tile.Counter,
    Tile.Bench,
    Tile.Chair,
    Tile.Bed,
    Tile.Bookshelf,
    Tile.Cabinet,
    Tile.ToolRack,
    Tile.WeaponRack,
    Tile.Lectern,
    Tile.PillarStone,
    // A driven post does not sway: the signpost's art is wholly still.
    Tile.Signpost,
    // Dungeon statics — the glowshroom's painted art is still (its
    // breathing is all in the live light pass), so it idles here too.
    Tile.Stalagmite,
    Tile.BonePile,
    Tile.GlowShroom,
  ]);

  /**
   * Run-merging furniture rings as ONE unit: connected same-tile
   * components bake into a single anchor-keyed sprite so the ring
   * wraps the whole hall table / stall / counter run instead of
   * seaming every joint (the user-flagged gap after the isolated-only
   * era). `cap` bounds the BFS — a component past it (estate fencing)
   * goes ringless rather than paying a wall-sized bake.
   */
  /** Pooled BFS scratch for tryRunRingItem (flat x,y interleaved). */
  private static readonly runMembers: number[] = [];
  private static readonly runSeenScratch = new Set<number>();
  private static readonly runQueue: number[] = [];
  private static readonly RUN_NEIGH_X = [1, -1, 0, 0] as const;
  private static readonly RUN_NEIGH_Y = [0, 0, 1, -1] as const;

  private static readonly RUN_RING_TILES = new Map<
    Tile,
    { hw: number; up: number; down: number; sortOff: number; cap: number }
  >([
    [Tile.Table, { hw: 0.85, up: 1.1, down: 0.5, sortOff: 0.72, cap: 12 }],
    [Tile.Counter, { hw: 0.85, up: 1.4, down: 0.5, sortOff: 0.72, cap: 12 }],
    [Tile.Bench, { hw: 0.75, up: 0.75, down: 0.45, sortOff: 0.68, cap: 8 }],
    [Tile.Bed, { hw: 0.85, up: 1.35, down: 0.6, sortOff: 0.72, cap: 4 }],
    [Tile.MarketStall, { hw: 1.35, up: 2.4, down: 0.8, sortOff: 0.78, cap: 8 }],
    // Fence left this map for good: the rebuilt fence paints its own
    // structural outline live (the wall law — exposed edges only), so
    // estate-length runs ring seamlessly with no bake cap at all.
  ]);

  /**
   * Group a run-merging tile's connected component and emit ONE ringed
   * item for the whole piece. Members are discovered by world data
   * (not the visible loop) so a run half-off-screen still bakes whole.
   * Returns true if the tile was consumed (already-seen member or the
   * fresh run item was pushed); false = treat as a plain tile.
   */
  private tryRunRingItem(
    tile: Tile,
    tx: number,
    ty: number,
    game: ClientGame,
    items: DrawItem[],
    runSeen: Set<number>,
  ): boolean {
    const cfg = Renderer.RUN_RING_TILES.get(tile);
    if (!cfg) return false;
    // BFS the component, capped — into POOLED scratch: this runs for
    // every visible run tile every frame, and fresh members/seen/queue
    // per call was ~15MB/s of garbage in a furniture-dense town.
    const members = Renderer.runMembers;
    const seen = Renderer.runSeenScratch;
    const queue = Renderer.runQueue;
    members.length = 0;
    queue.length = 0;
    seen.clear();
    queue.push(tx, ty);
    seen.add(packTile(tx, ty));
    while (queue.length > 0) {
      if (members.length > cfg.cap * 2) return false; // too big — ringless
      const cy = queue.pop()!;
      const cx = queue.pop()!;
      members.push(cx, cy);
      for (let n = 0; n < 4; n++) {
        const nx = cx + Renderer.RUN_NEIGH_X[n]!;
        const ny = cy + Renderer.RUN_NEIGH_Y[n]!;
        const k = packTile(nx, ny);
        if (!seen.has(k) && game.world.groundAt(nx, ny) === tile) {
          seen.add(k);
          queue.push(nx, ny);
        }
      }
    }
    // Anchor: lexicographic min — stable no matter which member the
    // visible scan meets first.
    let ax = tx;
    let ay = ty;
    let x0 = tx, x1 = tx, y0 = ty, y1 = ty;
    for (let i = 0; i < members.length; i += 2) {
      const mx = members[i]!;
      const my = members[i + 1]!;
      if (my < ay || (my === ay && mx < ax)) { ax = mx; ay = my; }
      if (mx < x0) x0 = mx;
      if (mx > x1) x1 = mx;
      if (my < y0) y0 = my;
      if (my > y1) y1 = my;
    }
    const runKey = packTile(ax, ay);
    if (runSeen.has(runKey)) return true; // another member already emitted it
    runSeen.add(runKey);
    // Build every member's item fresh this frame — draws feed the run
    // bake, shadows stay live per tile.
    const memberItems: DrawItem[] = [];
    for (let i = 0; i < members.length; i += 2) {
      memberItems.push(this.objectItem(tile, members[i]!, members[i + 1]!, game));
    }
    const s = this.camera.scale;
    const lift = game.world.elevAt(ax, ay) * ELEV_H * s;
    const pMin = this.camera.worldToScreen(x0 + 0.5, y0 + 0.5, this.w, this.h);
    const pMax = this.camera.worldToScreen(x1 + 0.5, y1 + 0.5, this.w, this.h);
    pMin.y -= lift;
    pMax.y -= lift;
    const b = {
      x: pMin.x - cfg.hw * s,
      y: pMin.y - cfg.up * s,
      w: pMax.x - pMin.x + cfg.hw * 2 * s,
      h: pMax.y - pMin.y + (cfg.up + cfg.down) * s,
    };
    // A blow anywhere along a joined run shudders the WHOLE piece —
    // a long table is one carpentered object, not loose tiles.
    let shakeX = 0;
    if (this.propShakes.size > 0 && destructibleInfo(tile)) {
      for (let i = 0; i < members.length; i += 2) {
        const sx = this.propShakeX(members[i]!, members[i + 1]!);
        if (Math.abs(sx) > Math.abs(shakeX)) shakeX = sx;
      }
    }
    items.push({
      sortY: y1 + cfg.sortOff,
      elevated: game.world.elevAt(ax, ay) !== 0,
      drawShadow: () => {
        for (const mi of memberItems) mi.drawShadow?.();
      },
      draw: () => {
        const ctx = this.ctx;
        if (shakeX !== 0) {
          ctx.save();
          ctx.translate(shakeX, 0);
        }
        this.drawPropOutlined(tile, ax, ay, b, () => {
          for (const mi of memberItems) mi.draw();
        });
        if (shakeX !== 0) ctx.restore();
      },
    });
    return true;
  }

  /**
   * Bake a prop's own draw + outline ring into a sprite canvas. The
   * paint closure draws at ABSOLUTE screen coords; the translate maps
   * the item's body rect to the canvas with a ring margin, and the
   * this.ctx swap routes it here (every cached case re-captures ctx
   * at draw time — the build-time-capture law).
   */
  private bakePropSprite(
    prev: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined,
    b: { x: number; y: number; w: number; h: number },
    paint: () => void,
  ): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cw: number;
    ch: number;
    ax: number;
    ay: number;
    scale: number;
    frame: number;
    used: number;
    outlined: boolean;
  } {
    const r = Math.max(1.25, this.camera.scale * 0.04);
    const m = Math.ceil(r) + 2;
    const cw = Math.ceil(b.w) + m * 2;
    const ch = Math.ceil(b.h) + m * 2;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.max(1, Math.ceil(cw * dpr));
    const ph = Math.max(1, Math.ceil(ch * dpr));
    const { canvas, sctx } = this.acquireSpriteCanvas(prev, pw, ph);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    sctx.save();
    sctx.translate(m - b.x, m - b.y);
    const prevCtx = this.ctx;
    this.ctx = sctx;
    try {
      paint();
    } finally {
      this.ctx = prevCtx;
      sctx.restore();
    }
    this.bakeOutlineRing(canvas, sctx, pw, ph);
    return {
      canvas,
      ctx: sctx,
      cw,
      ch,
      ax: m,
      ay: m,
      scale: this.camera.scale,
      frame: this.frameNo,
      used: this.frameNo,
      outlined: true,
    };
  }

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
  signHasText: ((tx: number, ty: number) => boolean) | null = null;

  /**
   * Drop a prop's baked sprite so its next frame repaints. The lever
   * for art that depends on GAME STATE rather than time: writing on a
   * sign changes what the board looks like, and the static ring's
   * 240-frame heal is far too slow to feel like your own pen.
   */
  invalidateProp(tx: number, ty: number, tile: Tile): void {
    this.treeSprites.delete(Renderer.treeKey(tx + 0.5, ty + 0.5, tile));
  }

  private drawPropOutlined(
    tile: Tile,
    tx: number,
    ty: number,
    b: { x: number; y: number; w: number; h: number },
    paint: () => void,
  ): void {
    const s = this.camera.scale;
    const key = Renderer.treeKey(tx + 0.5, ty + 0.5, tile);
    this.treesVisible++;
    let sp = this.treeSprites.get(key);
    const cadence = Renderer.STATIC_RING_TILES.has(tile) ? 240 : this.treeCadence;
    const due = (this.frameNo + key) % cadence === 0;
    const stale =
      !sp || (due && sp.frame !== this.frameNo) || Math.abs(sp.scale - s) > s * 0.2 || !sp.outlined;
    if (stale) {
      // THE STORM LAW (shared by drawTree/drawFlora): a missing sprite
      // bakes UNBUDGETED only when its extent is on screen RIGHT NOW —
      // skipping that bake would be visible pop-in. Missing sprites in
      // the tall-content pad bands (most of a fresh area) and cadence
      // re-bakes go through the per-frame time budget instead, so a
      // dense field streaming in bakes across frames, not in one.
      const visNow = b.x < this.w && b.x + b.w > 0 && b.y < this.h && b.y + b.h > 0;
      const allow = !sp
        ? visNow || (this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0)
        : this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0 && !this.zoomGliding;
      if (allow) {
        this.treeBakeBudget--;
        const t0 = performance.now();
        sp = this.bakePropSprite(sp, b, paint);
        this.spriteBakeMsLeft -= performance.now() - t0;
        this.treeSprites.set(key, sp);
      }
    }
    // Off-screen (a pad band) with no sprite yet: nothing to draw —
    // a budgeted frame bakes it before it scrolls in.
    if (!sp) return;
    sp.used = this.frameNo;
    const dpr = window.devicePixelRatio || 1;
    const k = s / sp.scale;
    const sw = Math.ceil(sp.cw * dpr);
    const sh = Math.ceil(sp.ch * dpr);
    const dx0 = b.x - sp.ax * k;
    const dy0 = b.y - sp.ay * k;
    const dw = sp.cw * k;
    const dh = sp.ch * k;
    // THE STEP-ASIDE FADE reaches man-height props: a bookshelf or
    // pillar truly hiding the body fades like a canopy. Short
    // furniture (barrels, chairs) can't hide a body and never fades.
    const fade =
      dh >= FADE_TALL_TILES * s
        ? this.occluderFade(key, dx0, dy0, dw, dh, ty + 0.9 - this.ownPY > -FRONT_EPS)
        : 1;
    if (fade < 1) this.ctx.globalAlpha = fade;
    this.ctx.drawImage(sp.canvas, 0, 0, sw, sh, dx0, dy0, dw, dh);
    if (fade < 1) this.ctx.globalAlpha = 1;
  }

  /** Pool-aware canvas acquisition shared by the world-prop sprite bakes. */
  private acquireSpriteCanvas(
    prev: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined,
    pw: number,
    ph: number,
  ): { canvas: HTMLCanvasElement; sctx: CanvasRenderingContext2D } {
    let canvas = prev?.canvas;
    let sctx = prev?.ctx;
    if (!canvas || !sctx || canvas.width < pw || canvas.height < ph) {
      // Prefer a pooled evicted canvas over a fresh allocation — new
      // props stream in constantly while walking, and canvas churn
      // shows up as GC tail frames. Oversized pool hits are fine (the
      // blit reads a source rect); grossly oversized ones stay pooled.
      canvas = undefined;
      for (let i = this.spriteCanvasPool.length - 1; i >= 0; i--) {
        const c = this.spriteCanvasPool[i]!;
        if (c.width >= pw && c.height >= ph && c.width * c.height <= pw * ph * 2.5) {
          canvas = c;
          this.spriteCanvasPool.splice(i, 1);
          break;
        }
      }
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = pw;
        canvas.height = ph;
      }
      sctx = canvas.getContext('2d')!;
    }
    return { canvas, sctx };
  }

  /**
   * Wild forage nodes, cached exactly like trees: per-instance sprite
   * re-baked on the shared adaptive cadence, outline ring baked in.
   * The per-frame outline pass on ~38 live-painted forage nodes cost
   * 2.1ms in a dense forest (120→94fps) — cached, the steady cost is
   * one drawImage per node.
   */
  private bakeFloraSprite(
    prev: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined,
    fm: PlantModel,
    wx: number,
    wy: number,
    tSec: number,
  ): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    cw: number;
    ch: number;
    ax: number;
    ay: number;
    scale: number;
    frame: number;
    used: number;
    outlined: boolean;
  } {
    const s = this.camera.scale;
    // Headroom: sway throw sideways, payload twinkle above, base below.
    const half = (fm.spread * 1.3 + 0.2) * s;
    const top = (fm.height * 1.25 + 0.2) * s;
    const below = 0.35 * s;
    const cw = Math.ceil(half * 2);
    const ch = Math.ceil(top + below);
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.max(1, Math.ceil(cw * dpr));
    const ph = Math.max(1, Math.ceil(ch * dpr));
    const { canvas, sctx } = this.acquireSpriteCanvas(prev, pw, ph);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    paintPlant(sctx, fm, {
      bx: half,
      groundY: top,
      s,
      wx,
      wy,
      tSec,
      flame: this.sky.flame,
    });
    if (this.outlineOn) this.bakeOutlineRing(canvas, sctx, pw, ph);
    return {
      canvas,
      ctx: sctx,
      cw,
      ch,
      ax: half,
      ay: top,
      scale: s,
      frame: this.frameNo,
      used: this.frameNo,
      outlined: this.outlineOn,
    };
  }

  /** Cached-sprite draw for a grown plant — forage node or farm crop. */
  private drawFlora(bx: number, by: number, tx: number, ty: number, tile: Tile, h: number, tSec: number): void {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const fm = plantModel(tile, h);
    const key = Renderer.treeKey(tx + 0.5, ty + 0.5, tile);
    // Shares the tree cache wholesale: budget, adaptive cadence,
    // eviction, canvas pool. Keys can't collide — tile ids differ.
    this.treesVisible++;
    let sp = this.treeSprites.get(key);
    const due = (this.frameNo + key) % this.treeCadence === 0;
    const stale =
      !sp ||
      (due && sp.frame !== this.frameNo) ||
      Math.abs(sp.scale - s) > s * 0.2 ||
      sp.outlined !== this.outlineOn;
    if (stale) {
      // The storm law (see drawPropOutlined): visible-now misses bake
      // unbudgeted, pad-band misses and re-bakes ride the time budget.
      const half = (fm.spread * 1.3 + 0.2) * s;
      const top = (fm.height * 1.25 + 0.2) * s;
      const gy = by + syT * 0.3;
      const visNow = bx + half > 0 && bx - half < this.w && gy + s * 0.5 > 0 && gy - top < this.h;
      const allow = !sp
        ? visNow || (this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0)
        : this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0 && !this.zoomGliding;
      if (allow) {
        this.treeBakeBudget--;
        const t0 = performance.now();
        sp = this.bakeFloraSprite(sp, fm, tx + 0.5, ty + 0.5, tSec);
        this.spriteBakeMsLeft -= performance.now() - t0;
        this.treeSprites.set(key, sp);
      }
    }
    if (!sp) return;
    sp.used = this.frameNo;
    const dpr = window.devicePixelRatio || 1;
    const k = s / sp.scale;
    this.ctx.drawImage(
      sp.canvas,
      0,
      0,
      Math.ceil(sp.cw * dpr),
      Math.ceil(sp.ch * dpr),
      bx - sp.ax * k,
      by + syT * 0.3 - sp.ay * k,
      sp.cw * k,
      sp.ch * k,
    );
  }

  /**
   * The world's outline ring, baked INTO a sprite canvas: dilate the
   * sprite's own alpha into scratch B, tint, slip the ring UNDER the
   * art (destination-over). Cached trees pay this once per re-bake
   * instead of ~38μs per frame in paintOutlined — a 300-tree forest
   * would otherwise spend >10ms/frame on rings alone. Works in device
   * pixels (identity transform); the final blit is integer-aligned so
   * the fractional-tap bleed law only needs the apron clear on B.
   */
  private bakeOutlineRing(
    canvas: HTMLCanvasElement,
    sctx: CanvasRenderingContext2D,
    pw: number,
    ph: number,
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const r = Math.max(1.25, this.camera.scale * 0.04) * dpr;
    // INTEGER tap offsets, unlike paintOutlined's fractional ones:
    // fractional offsets force a bilinear resample per tap and made
    // the dense-forest bake wave cost ~3ms/frame (120→93fps at 310
    // trees); integer 1:1 blits are straight copies. Quantization is
    // safe HERE because this is a bake — the per-entity jitter law
    // only bars quantizing the live smooth-camera blit.
    const ri = Math.max(1, Math.round(r));
    const rd = Math.max(1, Math.round(r * 0.71));
    if (this.outlineB.width < pw) this.outlineB.width = pw;
    if (this.outlineB.height < ph) this.outlineB.height = ph;
    const o = this.outlineBCtx;
    o.setTransform(1, 0, 0, 1, 0, 0);
    const apron = ri + 4;
    o.clearRect(
      0,
      0,
      Math.min(this.outlineB.width, pw + apron),
      Math.min(this.outlineB.height, ph + apron),
    );
    for (const [tx, ty] of Renderer.OUTLINE_TAPS) {
      const diag = tx !== 0 && ty !== 0;
      const ox = Math.sign(tx) * (diag ? rd : ri);
      const oy = Math.sign(ty) * (diag ? rd : ri);
      o.drawImage(canvas, 0, 0, pw, ph, ox, oy, pw, ph);
    }
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = '#241a2e';
    o.fillRect(0, 0, pw, ph);
    o.globalCompositeOperation = 'source-over';
    sctx.save();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'destination-over';
    sctx.drawImage(this.outlineB, 0, 0, pw, ph, 0, 0, pw, ph);
    sctx.restore();
  }

  /**
   * THE GHOST EMBER: while the standing world mostly hides the own
   * body — a rear facade seen from the street, a canopy the veil only
   * half-opens — a dithered lantern-gold silhouette of the rig draws
   * over the occluders. Deliberately a POSITION CUE, not an x-ray:
   * flat tint (no equipment detail), screen-door weave, eased over
   * GHOST_EASE_S, and multiplied by the stealth ghost's own alpha.
   * Own player only — no other body ever earns one (anti-wallhack).
   */
  private drawGhostEmber(): void {
    const item = this.ownItem;
    if (!this.revealArmed || !item?.body || this.ghostK < 0.03) return;
    const b = item.body;
    const dpr = window.devicePixelRatio || 1;
    // Art-only scratch bake; glow/sparkle side effects gated exactly
    // like the mirror pass.
    this.bakingMask = true;
    let geo: { w: number; h: number; m: number };
    try {
      geo = this.paintOutlineScratch(item, true);
    } finally {
      this.bakingMask = false;
    }
    const a = this.outlineACtx;
    a.save();
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.globalCompositeOperation = 'source-in';
    a.fillStyle = GHOST_TINT;
    a.fillRect(0, 0, geo.w, geo.h);
    a.globalCompositeOperation = 'destination-in';
    a.fillStyle = a.createPattern(this.ditherPattern(dpr), 'repeat')!;
    a.fillRect(0, 0, geo.w, geo.h);
    a.restore();
    this.ctx.save();
    this.ctx.globalAlpha = GHOST_ALPHA * emberEase(this.ghostK) * (item.alpha ?? 1);
    this.ctx.drawImage(
      this.outlineA,
      0,
      0,
      geo.w,
      geo.h,
      b.x - geo.m,
      b.y - geo.m,
      geo.w / dpr,
      geo.h / dpr,
    );
    this.ctx.restore();
  }

  /** The Bayer screen-door tile at device resolution — shared by the
   *  veil window and the ghost ember's weave. */
  private ditherPattern(dpr: number): HTMLCanvasElement {
    if (this.ditherPat && this.ditherPat.dpr === dpr) return this.ditherPat.canvas;
    const cell = Math.max(1, Math.round(DITHER_CELL * dpr));
    const c = document.createElement('canvas');
    c.width = c.height = cell * 4;
    const g = c.getContext('2d')!;
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = `rgba(0,0,0,${bayerAlpha(i, j)})`;
        g.fillRect(i * cell, j * cell, cell, cell);
      }
    }
    this.ditherPat = { canvas: c, dpr };
    return c;
  }

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
  private occluderFade(
    key: number,
    dx0: number,
    dy0: number,
    dw: number,
    dh: number,
    fronts: boolean,
  ): number {
    if (!this.revealArmed) return 1;
    const ix = dw * FADE_INSET_X;
    const occludes =
      fronts &&
      dx0 + ix < this.fadeBX1 &&
      dx0 + dw - ix > this.fadeBX0 &&
      dy0 + dh * FADE_INSET_TOP < this.fadeBY1 &&
      dy0 + dh > this.fadeBY0;
    let f = this.fadeMap.get(key);
    if (!f) {
      if (!occludes) return 1;
      f = { k: 0, used: this.frameNo };
      this.fadeMap.set(key, f);
    }
    f.used = this.frameNo;
    const step = this.frameDt / FADE_EASE_S;
    f.k += Math.max(-step, Math.min(step, (occludes ? 1 : 0) - f.k));
    // CORE = the silhouette covers the torso itself — this sprite
    // genuinely shades the body, so it feeds the ember's stack.
    if (occludes) {
      const cx = (this.fadeBX0 + this.fadeBX1) / 2;
      const cy = (this.fadeBY0 + this.fadeBY1) / 2;
      if (dx0 + ix < cx && dx0 + dw - ix > cx && dy0 < cy && dy0 + dh > cy) {
        this.fadeCoreCountNew++;
      }
    }
    if (f.k <= 0.001) {
      if (!occludes) this.fadeMap.delete(key);
      return 1;
    }
    return 1 - f.k * (1 - FADE_ALPHA);
  }


  private drawTree(
    bx: number,
    by: number,
    wx: number,
    wy: number,
    h: number,
    tile: Tile,
    tSec: number,
    bendOverride: number | undefined,
    grow = 1,
  ): void {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const m = treeModel(tile, h);
    let wind: number;
    if (bendOverride !== undefined || grow < 1) {
      // Shape changes every frame — paint live. The step-aside fade
      // still applies (felling the very tree that hides you).
      const half = (m.spread * 1.15 + 0.08 * m.height + 0.45) * s;
      const top = (m.height * 1.18 + 0.45) * s;
      const fade = this.occluderFade(
        Renderer.treeKey(wx, wy, tile),
        bx - half,
        by + syT * 0.3 - top,
        half * 2,
        top + 0.3 * s,
        wy - this.ownPY > -FRONT_EPS,
      );
      if (fade < 1) this.ctx.globalAlpha = fade;
      wind = paintTree(this.ctx, m, {
        bx,
        groundY: by + syT * 0.3,
        s,
        syT,
        wx,
        wy,
        tSec,
        windOverride: bendOverride,
        grow,
      });
      if (fade < 1) this.ctx.globalAlpha = 1;
    } else {
      const key = Renderer.treeKey(wx, wy, tile);
      this.treesVisible++;
      let sp = this.treeSprites.get(key);
      // Each tree re-bakes on its own phase of the (adaptive) cadence,
      // derived from its key, so the herd never re-bakes in one frame —
      // a phase-locked wave read as a p95 hitch every Nth frame.
      const due = (this.frameNo + key) % this.treeCadence === 0;
      const stale =
        !sp ||
        (due && sp.frame !== this.frameNo) ||
        Math.abs(sp.scale - s) > s * 0.2 ||
        sp.outlined !== this.outlineOn;
      if (stale) {
        // The storm law (see drawPropOutlined): visible-now misses
        // bake unbudgeted, pad-band misses and re-bakes ride the time
        // budget — the tall-content pads mean most of a fresh forest
        // enters as pad rows and pre-bakes across many frames.
        const half = (m.spread * 1.15 + 0.08 * m.height + 0.45) * s;
        const top = (m.height * 1.18 + 0.45) * s;
        const gy = by + syT * 0.3;
        const visNow = bx + half > 0 && bx - half < this.w && gy + s * 0.5 > 0 && gy - top < this.h;
        const allow = !sp
          ? visNow || (this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0)
          : this.treeBakeBudget > 0 && this.spriteBakeMsLeft > 0 && !this.zoomGliding;
        if (allow) {
          this.treeBakeBudget--;
          const t0 = performance.now();
          sp = this.bakeTreeSprite(sp, m, wx, wy, tSec);
          this.spriteBakeMsLeft -= performance.now() - t0;
          this.treeSprites.set(key, sp);
        }
      }
      if (!sp) return;
      sp.used = this.frameNo;
      const dpr = window.devicePixelRatio || 1;
      const k = s / sp.scale;
      const sw = Math.ceil(sp.cw * dpr);
      const sh = Math.ceil(sp.ch * dpr);
      const dx0 = bx - sp.ax * k;
      const dy0 = by + syT * 0.3 - sp.ay * k;
      const dw = sp.cw * k;
      const dh = sp.ch * k;
      // THE STEP-ASIDE FADE: a canopy that truly occludes the own
      // body politely fades — plain globalAlpha, exact layering.
      const fade = this.occluderFade(key, dx0, dy0, dw, dh, wy - this.ownPY > -FRONT_EPS);
      if (fade < 1) this.ctx.globalAlpha = fade;
      this.ctx.drawImage(sp.canvas, 0, 0, sw, sh, dx0, dy0, dw, dh);
      if (fade < 1) this.ctx.globalAlpha = 1;
      wind = windScalarAt(wx, wy, tSec);
    }

    // Life: strong gusts shake the occasional leaf loose (skipped
    // while felling — the fall spawns its own debris).
    if (bendOverride === undefined && grow >= 1 && Math.random() < 0.0009 * (0.5 + Math.abs(wind))) {
      const c = m.clusters[Math.floor(Math.random() * m.clusters.length)]!;
      const leaf = m.leaves[c.tone]!;
      const wpt = this.camera.screenToWorld(
        bx + (c.x + (Math.random() - 0.5) * c.r) * s,
        by + syT * 0.3 - (c.y - c.r * 0.4) * s,
        this.w,
        this.h,
      );
      this.particles.burst(wpt.x, wpt.y, 1, [shade(leaf, 24), '#c9a441'], {
        speed: 0.4 + Math.max(0, wind) * 0.5,
        life: 2.2,
        size: 0.05,
        gravity: 0.5,
        drag: 0.7,
        dir: 0.2,
        spread: 1.4,
      });
    }
  }

  /**
   * TRUE-FORM tree shadow: the same skeleton paintTree draws — trunk
   * spine, fork arms, every canopy cluster — projected flat onto the
   * ground along the light ray, riding the same wind cantilever so
   * the shadow sways with its tree. One Path2D, one fill: limbs and
   * clusters merge into a single density, never stacking.
   */
  private treeShadowPath(
    m: TreeModel,
    bx: number,
    groundY: number,
    g: number,
    wind: number,
    kx: number,
    ky: number,
  ): Path2D {
    const s = this.camera.scale;
    const wMul = 0.45 + 0.55 * g;
    const rMul = 0.5 + 0.5 * g;
    const H = m.height;
    const bendT = wind * 0.055 * H;
    const path = new Path2D();
    // Limbs: trunk + fork arms (boughs hide inside the canopy shadow).
    for (const b of m.branches) {
      if (b.level !== 0) continue;
      const last = b.pts.length - 1;
      const proj: Array<[number, number]> = b.pts.map(([x, y]) => {
        const hf = Math.min(1, Math.max(0, y / H));
        const dx = bendT * Math.pow(hf, 1.4);
        return [bx + (x + dx) * g * s + kx * y * g * s, groundY + ky * y * g * s];
      });
      const left: Array<[number, number]> = [];
      const right: Array<[number, number]> = [];
      for (let i = 0; i <= last; i++) {
        const a = proj[Math.max(0, i - 1)]!;
        const c2 = proj[Math.min(last, i + 1)]!;
        let tx2 = c2[0] - a[0];
        let ty2 = c2[1] - a[1];
        const len = Math.hypot(tx2, ty2) || 1;
        tx2 /= len;
        ty2 /= len;
        const u = last > 0 ? i / last : 0;
        const w = Math.max(1, (b.w0 + (b.w1 - b.w0) * u) * wMul * s * g);
        left.push([proj[i]![0] - ty2 * w, proj[i]![1] + tx2 * w]);
        right.push([proj[i]![0] + ty2 * w, proj[i]![1] - tx2 * w]);
      }
      path.moveTo(left[0]![0], left[0]![1]);
      for (let i = 1; i <= last; i++) path.lineTo(left[i]![0], left[i]![1]);
      for (let i = last; i >= 0; i--) path.lineTo(right[i]![0], right[i]![1]);
      path.closePath();
    }
    // Canopy: each cluster's own faceted blob, sheared flat — stamped
    // from the CACHED unit blob with the scale/squash/shear folded into
    // one addPath matrix (no per-cluster Path2D, facetBlob, or
    // DOMMatrix allocation; pixel-identical composite transform).
    const squash = Math.max(0.5, Math.abs(ky));
    const M = BLOB_M;
    M.b = 0;
    for (const c of m.clusters) {
      if (g < 0.7 && c.extra) continue;
      const dx = bendT * Math.pow(Math.max(0, c.hf), 1.4);
      const cxp = bx + (c.x + dx) * g * s + kx * c.y * g * s;
      const cyp = groundY + ky * c.y * g * s;
      const crp = c.r * rMul * s * g;
      if (crp < 1.5) continue;
      M.a = crp;
      M.c = -kx * crp * 0.92;
      M.d = -squash * crp * 0.92;
      M.e = cxp;
      M.f = cyp;
      path.addPath(unitBlob(c.seed, m.sides), M);
    }
    return path;
  }

  private drawTreeShadow(
    bx: number,
    by: number,
    wx: number,
    wy: number,
    h: number,
    tile: Tile,
    tSec: number,
    grow = 1,
  ): void {
    const syT = this.camera.scale * this.camera.yScale;
    const groundY = by + syT * 0.3;
    const sunOn = this.sky.shadowAlpha >= 0.02;
    const throws = this.lightThrows(bx, groundY, 0.6);
    if (!sunOn && throws.length === 0) return;
    const m = treeModel(tile, h);
    const ys = this.camera.yScale;
    if (sunOn) {
      const c = this.beginCastFill();
      if (c) {
        const s = this.camera.scale;
        if (grow < 1) {
          // Regrowth animates shape per frame — build live.
          c.fill(
            this.treeShadowPath(
              m,
              bx,
              groundY,
              grow,
              windScalarAt(wx, wy, tSec),
              this.sky.shadowX * this.sky.shadowLen,
              this.sky.shadowY * this.sky.shadowLen * ys,
            ),
          );
        } else {
          // Cached silhouette, built at the origin on the sprite
          // cadence (sun azimuth + sway drift sub-pixel across 4
          // frames) and filled translated to the trunk base.
          const key = Renderer.treeKey(wx, wy, tile);
          let sh = this.treeShadows.get(key);
          // Same per-key phase as the sprite: body and shadow re-bake
          // in the same frame, so their sway always agrees.
          const due = (this.frameNo + key) % this.treeCadence === 0;
          const stale =
            !sh || (due && sh.frame !== this.frameNo) || Math.abs(sh.scale - s) > s * 0.2;
          if (stale && (!sh || (this.treeShadowBudget > 0 && !this.zoomGliding))) {
            this.treeShadowBudget--;
            sh = {
              path: this.treeShadowPath(
                m,
                0,
                0,
                1,
                windScalarAt(wx, wy, tSec),
                this.sky.shadowX * this.sky.shadowLen,
                this.sky.shadowY * this.sky.shadowLen * ys,
              ),
              scale: s,
              frame: this.frameNo,
              used: this.frameNo,
            };
            this.treeShadows.set(key, sh);
          }
          if (sh) {
            sh.used = this.frameNo;
            const k = s / sh.scale;
            // Manual transform undo — a save/restore pair per tree was
            // measurable at ~240 casts a frame.
            c.translate(bx, groundY);
            if (k !== 1) c.scale(k, k);
            c.fill(sh.path);
            if (k !== 1) c.scale(1 / k, 1 / k);
            c.translate(-bx, -groundY);
          }
        }
        c.globalAlpha = 1;
      }
    }
    if (throws.length > 0) {
      const c = this.sdw;
      const wind = windScalarAt(wx, wy, tSec);
      c.fillStyle = this.sky.moonlit ? SHADOW_MOON : SHADOW_SUN;
      for (const th of throws) {
        c.globalAlpha = Math.min(1, th.alpha / this.sdwLayerAlpha);
        c.fill(this.treeShadowPath(m, bx, groundY, grow, wind, th.ux * th.len, th.uy * th.len * ys));
      }
      c.globalAlpha = 1;
    }
  }


  /**
   * A felled tree: shudder → topple (varied azimuth) → impact with a
   * rolling wall of dust → it lies on the ground for a beat → it breaks
   * apart into log chunks and a last billow of dust. Timeline in ms.
   */
  private readonly fallingTrees: Array<{
    tx: number;
    ty: number;
    tile: Tile;
    h: number;
    dir: number;
    tilt: number; // extra screen-plane tilt for azimuth variance
    lie: number; // final lie angle magnitude
    az: number; // world fall azimuth (debris direction)
    born: number;
    impacted: boolean;
    brokeUp: boolean;
  }> = [];

  addFallingTree(tx: number, ty: number, tile: Tile, dir: number): void {
    const h = hashCoords(41, tx, ty);
    const sign = Math.sign(dir) || 1;
    const r = (n: number): number => (hashCoords(17, h & 0xffff, n) % 1000) / 1000;
    this.fallingTrees.push({
      tx,
      ty,
      tile,
      h,
      dir: sign,
      // Azimuth variance: mostly sideways, but each fall differs.
      tilt: (r(1) - 0.5) * 0.5,
      lie: 1.45 + (r(2) - 0.3) * 0.28,
      az: sign > 0 ? 0.15 + (r(3) - 0.5) * 0.9 : Math.PI - 0.15 + (r(3) - 0.5) * 0.9,
      born: performance.now(),
      impacted: false,
      brokeUp: false,
    });
  }

  // --------------------------------------------------- breaking rocks

  private readonly breakingRocks: Array<{ tx: number; ty: number; tile: Tile; born: number }> = [];

  /**
   * A mined-out node doesn't blink into its depleted state — it
   * CRUMBLES: the formation shudders, sinks, and shatters into flying
   * fragments and a rolling dust cloud that covers the tile swap.
   */
  addRockBreak(tx: number, ty: number, tile: Tile): void {
    this.breakingRocks.push({ tx, ty, tile, born: performance.now() });
    const cx = tx + 0.5;
    const cy = ty + 0.5;
    const pal = Renderer.ORE_STYLES[tile];
    // Chunky stone fragments thrown up and out.
    this.particles.burst(cx, cy, 9, ['#6a6375', '#5a5466', '#767083'], {
      speed: 2.3, life: 0.8, size: 0.13, gravity: 8, drag: 1.1, up: true, spread: 2.4,
    });
    // Shards of the metal itself.
    if (pal) {
      this.particles.burst(cx, cy - 0.15, 6, [pal.nug, pal.deep], {
        speed: 2.7, life: 0.7, size: 0.09, gravity: 8.5, up: true, spread: 2.1,
      });
    }
    // Rolling dust settles over the swap.
    this.particles.burst(cx, cy + 0.12, 13, ['#a89880', '#bcae94', '#9b8a70'], {
      speed: 1.4, life: 1.05, size: 0.13, gravity: 0.5, drag: 3, grow: 0.16, spread: 2.6,
    });
  }

  private collectBreakingRocks(game: ClientGame, items: DrawItem[]): void {
    const now = performance.now();
    const tSec = now / 1000;
    const DUR = 460;
    for (let i = this.breakingRocks.length - 1; i >= 0; i--) {
      const br = this.breakingRocks[i]!;
      const ms = now - br.born;
      if (ms >= DUR) {
        this.breakingRocks.splice(i, 1);
        continue;
      }
      const u = ms / DUR;
      const lift = this.renderLift(br.tx + 0.5, br.ty + 0.5) * this.camera.scale;
      items.push({
        // A hair above the depleted rock underneath, which it hides.
        sortY: br.ty + 0.86,
        elevated: lift !== 0,
        draw: () => {
          const ctx = this.ctx;
          const s = this.camera.scale;
          const p = this.camera.worldToScreen(br.tx + 0.5, br.ty + 0.5, this.w, this.h);
          p.y -= lift;
          const baseY = p.y + s * 0.35; // crush toward the ground line
          const shake = Math.sin(now * 0.11) * s * 0.02 * (1 - u);
          ctx.save();
          ctx.globalAlpha = u < 0.5 ? 1 : 1 - ((u - 0.5) / 0.5) ** 1.5;
          ctx.translate(p.x + shake, baseY);
          ctx.scale(1 + 0.14 * u, 1 - 0.5 * u * u);
          ctx.translate(-p.x, -baseY);
          this.drawRockFormation(p.x, p.y, s, hashCoords(41, br.tx, br.ty), br.tile, tSec);
          ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
    }
  }

  private collectFallingTrees(items: DrawItem[]): void {
    const now = performance.now();
    const tSec = now / 1000;
    // Timeline (ms): shudder 0-180, topple 180-720, bounce 720-900,
    // lie 900-2500, breakup 2500-3200.
    const END = 3200;
    for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
      const ft = this.fallingTrees[i]!;
      const ms = now - ft.born;
      if (ms >= END) {
        this.fallingTrees.splice(i, 1);
        continue;
      }
      const cx = ft.tx + 0.5;
      const cy = ft.ty + 0.5;
      const cosA = Math.cos(ft.az);
      const sinA = Math.sin(ft.az) * this.camera.yScale;

      // Impact: a wall of dust rolls out along the fall, plus a leaf
      // burst where the crown slams down.
      if (ms >= 720 && !ft.impacted) {
        ft.impacted = true;
        this.shake(3);
        const lx = cx + cosA * 2.4;
        const ly = cy + sinA * 2.4;
        // Rolling dust: big, slow, billowing blocks that settle.
        this.particles.burst(lx, ly, 22, ['#a89880', '#bcae94', '#9b8a70', '#c8bca4'], {
          speed: 2.6, life: 1.1, size: 0.14, gravity: 0.6, drag: 3.2,
          grow: 0.18, dir: ft.az, spread: 1.5,
        });
        this.particles.burst(cx + cosA, cy + sinA, 12, ['#9b8a70', '#b5a488'], {
          speed: 1.6, life: 0.9, size: 0.12, gravity: 0.5, drag: 3, grow: 0.14,
        });
        // Crown leaf spray.
        this.particles.burst(lx, ly - 0.2, 20, ['#3a8140', '#35773a', '#2f6135', '#c9a441'], {
          speed: 2.4, life: 0.9, size: 0.07, up: true, gravity: 3.5, drag: 1.2,
        });
      }

      // Breakup: the trunk splits into tumbling log chunks + a last
      // dust billow instead of just vanishing.
      if (ms >= 2500 && !ft.brokeUp) {
        ft.brokeUp = true;
        const felled = treeModel(ft.tile, ft.h);
        const bark = felled.bark;
        // Bigger trees break into more log chunks along a longer lie.
        const chunkN = Math.max(4, Math.round(felled.height * 1.1));
        for (let c = 0; c < chunkN; c++) {
          const along = 0.6 + c * 0.7;
          this.particles.burst(cx + cosA * along, cy + sinA * along, 1, [bark, shade(bark, 14)], {
            speed: 1.4, life: 0.8, size: 0.2, gravity: 6, drag: 1.5, dir: -Math.PI / 2, spread: 1.6,
          });
        }
        this.particles.burst(cx + cosA * 1.6, cy + sinA * 1.6, 14, ['#a89880', '#bcae94', '#9b8a70'], {
          speed: 1.8, life: 1.0, size: 0.15, gravity: 0.4, drag: 3, grow: 0.16, dir: ft.az, spread: 2,
        });
      }

      // The shudder phase keeps the standing tree's outline ring (its
      // cached sprite carried one baked in — dropping it a beat early
      // reads as a flicker). Once the topple starts the ring lets go:
      // rotation sweeps the bounds and the dust hides the handoff.
      let fellBody: { x: number; y: number; w: number; h: number } | undefined;
      if (ms < 180) {
        const pB = this.camera.worldToScreen(cx, cy, this.w, this.h);
        pB.y -= this.renderLift(cx, cy) * this.camera.scale;
        fellBody = this.treeBody(ft.tile, ft.h, pB.x, pB.y);
      }
      items.push({
        sortY: ft.ty + 0.9,
        elevated: this.renderLift(cx, cy) !== 0,
        body: fellBody,
        draw: () => {
          const ctx = this.ctx;
          const p = this.camera.worldToScreen(cx, cy, this.w, this.h);
          p.y -= this.renderLift(cx, cy) * this.camera.scale;
          const syT = this.camera.scale * this.camera.yScale;
          const pivotY = p.y + syT * 0.3;
          let angle: number;
          let bend: number | undefined;
          if (ms < 180) {
            // The cut bites: the tree shudders in place.
            const u = ms / 180;
            angle = 0;
            bend = Math.sin(now * 0.08) * 0.5 * u;
          } else if (ms < 720) {
            const u = (ms - 180) / 540;
            angle = ft.lie * u * u; // gravity accelerates the topple
            bend = 0;
          } else if (ms < 900) {
            const u = (ms - 720) / 180;
            angle = ft.lie - Math.sin(u * Math.PI) * 0.06; // settle bounce
            bend = 0;
          } else {
            angle = ft.lie; // lying on the ground
            bend = 0;
          }
          // Breakup fade only at the very end.
          const alpha = ms > 2600 ? Math.max(0, 1 - (ms - 2600) / 600) : 1;
          ctx.save();
          if (alpha < 1) ctx.globalAlpha = alpha;
          ctx.translate(p.x, pivotY);
          ctx.rotate(ft.dir * angle + ft.tilt * Math.min(1, angle / ft.lie));
          ctx.translate(-p.x, -pivotY);
          this.drawTree(p.x, p.y, cx, cy, ft.h, ft.tile, tSec, bend);
          ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
    }
  }

  /**
   * Screen bounds of a live-painted tree, mirroring bakeTreeSprite's
   * headroom exactly — crown spread + wind throw + blob jitter above,
   * root flare below. Feeds the outline pass for the trees that can't
   * blit a ring-baked sprite (regrowth, felling shudder).
   */
  private treeBody(
    tile: Tile,
    h: number,
    px: number,
    py: number,
  ): { x: number; y: number; w: number; h: number } {
    const m = treeModel(tile, h);
    const s = this.camera.scale;
    const half = (m.spread * 1.15 + 0.08 * m.height + 0.45) * s;
    const top = (m.height * 1.18 + 0.45) * s;
    const groundY = py + s * this.camera.yScale * 0.3;
    return { x: px - half, y: groundY - top, w: half * 2, h: top + 0.3 * s };
  }

  // ------------------------------------------------------ loot chests
  //
  // THE CHEST GRAMMAR v2 (ground-up, supersedes the bank-chest-derived
  // draft): five bespoke strongboxes in the flattest, squarest cut of
  // the house style. LAWS: (1) SQUARE — plain fillRect masses, no
  // chamfer, no rounding; corners are corners. (2) BOLD — minimum
  // feature ~0.03s; value blocks instead of seam lines; one lit lane,
  // one deep band per mass. (3) 2.5D — a foreshortened lid plan with a
  // hard far band and a bright near-arris cap; the mouth is the body's
  // own plan once the lid is away. (4) THE SWING is two honest beats:
  // the plan depth compresses as the lid tilts to vertical (o 0..0.5),
  // then the lid's INNER FACE grows up behind the box as a standing
  // slab (o 0.5..1, overshoot rides the growEase fling) — never a
  // negative-scale mirror. (5) BESPOKE — each kind owns its layout:
  // wood = vertical silver strapping, mossy = batten wood + square
  // moss slabs, iron = one massive belt + padlock, gilded = stepped
  // crown + lacquer inlay, boss = black pedestal mass + bone skull.

  /** Everything a chest painter needs for one frame. */
  private static chestPose(o: number): { tilt: number; stand: number } {
    // tilt: 1 = lid seated, 0 = lid vertical. stand: standing-slab
    // height factor (overshoot >1 gives the fling its bounce).
    return {
      tilt: Math.max(0, 1 - o * 2),
      stand: o <= 0.5 ? 0 : (o - 0.5) * 2,
    };
  }

  /**
   * The revealed mouth: the body's own plan as a dark cavity — one
   * bold lining band on the near wall, one sunlit near-rim lane.
   */
  private chestMouth(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bodyT: number,
    bw: number,
    topD: number,
    s: number,
    reveal: number,
    wall: string,
    lining: string,
  ): void {
    const mouthT = bodyT - topD;
    ctx.fillStyle = wall;
    ctx.fillRect(cx - bw, mouthT, bw * 2, topD);
    ctx.fillStyle = '#1b1326';
    ctx.fillRect(cx - bw + s * 0.04, mouthT + s * 0.03, bw * 2 - s * 0.08, topD - s * 0.06);
    ctx.globalAlpha = Math.min(1, reveal);
    ctx.fillStyle = lining;
    ctx.fillRect(cx - bw + s * 0.04, mouthT + topD * 0.56, bw * 2 - s * 0.08, topD * 0.3);
    ctx.globalAlpha = 1;
  }

  /**
   * The standing open lid: the lid's inner face as a square slab
   * rising behind the box — frame color around a lining inset, a cap
   * strip along the top. Bespoke trim is painted by the caller.
   */
  private chestStandingLid(
    ctx: CanvasRenderingContext2D,
    cx: number,
    hingeY: number,
    bw: number,
    standH: number,
    s: number,
    frame: string,
    lining: string,
    cap: string,
  ): number {
    const w = bw * 2 - s * 0.05;
    const topY = hingeY - standH;
    ctx.fillStyle = frame;
    ctx.fillRect(cx - w / 2, topY, w, standH);
    if (standH > s * 0.12) {
      ctx.fillStyle = lining;
      ctx.fillRect(cx - w / 2 + s * 0.045, topY + s * 0.05, w - s * 0.09, standH - s * 0.075);
      ctx.fillStyle = shade(lining, 12);
      ctx.fillRect(cx - w / 2 + s * 0.045, hingeY - s * 0.06, w - s * 0.09, s * 0.035);
    }
    ctx.fillStyle = cap;
    ctx.fillRect(cx - w / 2, topY, w, s * 0.038);
    return topY;
  }

  /**
   * A moss slab: a low-poly rectangular patch — deep seat offset
   * down-right, square body, one bold lit top strip. Never a blob.
   */
  private mossSlab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    hgt: number,
    s: number,
  ): void {
    ctx.fillStyle = '#42502f';
    ctx.fillRect(x + s * 0.014, y + s * 0.014, w, hgt);
    ctx.fillStyle = '#5c6b46';
    ctx.fillRect(x, y, w, hgt);
    ctx.fillStyle = '#7fae62';
    ctx.fillRect(x, y, w, Math.min(hgt * 0.4, s * 0.035));
  }

  /**
   * WOOD — the traveller's trunk. Honest warm boards carried by two
   * broad silver straps and a silver arris cap: the metal is the
   * contrast, the wood stays quiet.
   */
  private drawChestWood(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    s: number,
    o: number,
  ): void {
    const bw = 0.4 * s;
    const bodyH = 0.3 * s;
    const lidH = 0.12 * s;
    const topD = 0.2 * s;
    const bodyT = baseY - bodyH;
    const { tilt, stand } = Renderer.chestPose(o);
    // Skid base.
    ctx.fillStyle = '#3f2c12';
    ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.055);
    // Carcase: one mass, one lit lane, one settled band.
    ctx.fillStyle = '#7d5a30';
    ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
    ctx.fillStyle = '#96703c';
    ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.055);
    ctx.fillStyle = '#573d1d';
    ctx.fillRect(cx - bw, baseY - s * 0.075, bw * 2, s * 0.055);
    // Straps: broad silver verticals with one square rivet each.
    for (const bx of [-0.21, 0.21] as const) {
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(cx + bx * s - s * 0.0475 + s * 0.018, bodyT, s * 0.095, bodyH);
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(cx + bx * s - s * 0.0475, bodyT, s * 0.095, bodyH);
      ctx.fillStyle = '#cdd3dc';
      ctx.fillRect(cx + bx * s - s * 0.0475, bodyT, s * 0.03, bodyH);
      ctx.fillStyle = '#3a3544';
      ctx.fillRect(cx + bx * s - s * 0.017, bodyT + bodyH * 0.48, s * 0.034, s * 0.034);
    }
    // Mouth, once the lid is away.
    if (o > 0.1) this.chestMouth(ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#573d1d', '#54422c');
    // Lid: tilting plan (closed beat) or standing slab (open beat).
    const mouthT = bodyT - topD;
    if (tilt > 0) {
      const d = topD * tilt;
      const lidT = bodyT - d - lidH;
      ctx.fillStyle = '#a5793f';
      ctx.fillRect(cx - bw, lidT, bw * 2, d);
      ctx.fillStyle = '#6e4d24';
      ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
      // Front band.
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
      // Straps ride the lid.
      for (const bx of [-0.21, 0.21] as const) {
        ctx.fillStyle = '#9aa1ad';
        ctx.fillRect(cx + bx * s - s * 0.0475, lidT, s * 0.095, d + lidH);
        ctx.fillStyle = '#cdd3dc';
        ctx.fillRect(cx + bx * s - s * 0.0475, lidT, s * 0.03, d + lidH);
      }
      // The silver arris cap — the signature line of the trunk.
      ctx.fillStyle = '#cdd3dc';
      ctx.fillRect(cx - bw, lidT + d - s * 0.02, bw * 2, s * 0.02);
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, s * 0.025);
      // Hasp plate over the seam.
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(cx - s * 0.06, lidT + d + lidH - s * 0.045, s * 0.12, s * 0.115);
      ctx.fillStyle = '#cdd3dc';
      ctx.fillRect(cx - s * 0.06, lidT + d + lidH - s * 0.045, s * 0.12, s * 0.03);
      ctx.fillStyle = '#26222e';
      ctx.fillRect(cx - s * 0.023, lidT + d + lidH + s * 0.005, s * 0.046, s * 0.042);
    }
    if (stand > 0) {
      const topY = this.chestStandingLid(ctx, cx, mouthT, bw, s * 0.3 * stand, s, '#7d5a30', '#54422c', '#9aa1ad');
      // The straps' inner shadows show faintly on the lining.
      if (stand > 0.6) {
        ctx.fillStyle = 'rgba(58, 53, 68, 0.35)';
        for (const bx of [-0.21, 0.21] as const) {
          ctx.fillRect(cx + bx * s - s * 0.045, topY + s * 0.05, s * 0.09, s * 0.3 * stand - s * 0.11);
        }
      }
    }
  }

  /**
   * MOSSY — the wayside elder. A batten-built chest with no metal
   * left worth naming, being claimed one square slab of moss at a
   * time. Blocky moss, blocky mushrooms, quiet wood.
   */
  private drawChestMossy(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    s: number,
    o: number,
  ): void {
    const bw = 0.4 * s;
    const bodyH = 0.28 * s;
    const lidH = 0.12 * s;
    const topD = 0.2 * s;
    const bodyT = baseY - bodyH;
    const { tilt, stand } = Renderer.chestPose(o);
    ctx.fillStyle = '#3a3428';
    ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.05);
    // Aged carcase.
    ctx.fillStyle = '#6b6152';
    ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
    ctx.fillStyle = '#7d7362';
    ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
    ctx.fillStyle = '#494136';
    ctx.fillRect(cx - bw, baseY - s * 0.07, bw * 2, s * 0.05);
    // Wooden battens, pegged — no metal on this one.
    for (const bx of [-0.22, 0.22] as const) {
      ctx.fillStyle = '#453e30';
      ctx.fillRect(cx + bx * s - s * 0.045 + s * 0.016, bodyT, s * 0.09, bodyH);
      ctx.fillStyle = '#57503f';
      ctx.fillRect(cx + bx * s - s * 0.045, bodyT, s * 0.09, bodyH);
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(cx + bx * s - s * 0.016, bodyT + bodyH * 0.42, s * 0.032, s * 0.032);
    }
    if (o > 0.1) this.chestMouth(ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#494136', '#3d4434');
    const mouthT = bodyT - topD;
    if (tilt > 0) {
      const d = topD * tilt;
      const lidT = bodyT - d - lidH;
      ctx.fillStyle = '#7d7362';
      ctx.fillRect(cx - bw, lidT, bw * 2, d);
      ctx.fillStyle = '#554c3e';
      ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
      ctx.fillStyle = '#6b6152';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
      ctx.fillStyle = '#8a8070';
      ctx.fillRect(cx - bw, lidT + d - s * 0.022, bw * 2, s * 0.022);
      // Wooden toggle latch.
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(cx - s * 0.045, lidT + d + lidH - s * 0.035, s * 0.09, s * 0.085);
      ctx.fillStyle = '#573d1d';
      ctx.fillRect(cx - s * 0.014, lidT + d + lidH - s * 0.005, s * 0.028, s * 0.04);
      // The moss takes the lid from the left, one slab at a time.
      this.mossSlab(ctx, cx - bw, lidT, s * 0.3, d + s * 0.02, s);
      this.mossSlab(ctx, cx - bw + s * 0.1, lidT + d - s * 0.02, s * 0.17, lidH + s * 0.02, s);
      this.mossSlab(ctx, cx + bw * 0.45, lidT + d - s * 0.03, s * 0.13, s * 0.07, s);
    }
    if (stand > 0) {
      const topY = this.chestStandingLid(ctx, cx, mouthT, bw, s * 0.29 * stand, s, '#6b6152', '#3d4434', '#7d7362');
      if (stand > 0.5) this.mossSlab(ctx, cx - bw + s * 0.025, topY, s * 0.22, s * 0.07, s);
    }
    // The floor is winning: slabs at the feet, mushrooms at the corner.
    this.mossSlab(ctx, cx - bw - s * 0.02, baseY - s * 0.06, s * 0.2, s * 0.075, s);
    this.mossSlab(ctx, cx + bw * 0.5, baseY - s * 0.035, s * 0.14, s * 0.055, s);
    for (const [ox, cw2, st] of [
      [0.1, 0.1, 0.06],
      [0.24, 0.07, 0.04],
    ] as const) {
      const mx = cx + bw + ox * s - s * 0.05;
      ctx.fillStyle = '#d8cbb0';
      ctx.fillRect(mx - s * 0.016, baseY - (st + 0.008) * s, s * 0.032, st * s);
      ctx.fillStyle = '#a35540';
      ctx.fillRect(mx - cw2 * s * 0.5, baseY - (st + 0.05) * s, cw2 * s, s * 0.045);
      ctx.fillStyle = '#c97a5a';
      ctx.fillRect(mx - cw2 * s * 0.5, baseY - (st + 0.05) * s, cw2 * s, s * 0.018);
    }
  }

  /**
   * IRON — the strongchest. Dark timber in an iron grip: corner
   * columns, one massive belt, and a padlock the size of a fist.
   * The lock IS the promise; it goes with the key that opens it.
   */
  private drawChestIron(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    s: number,
    o: number,
  ): void {
    const bw = 0.41 * s;
    const bodyH = 0.34 * s;
    const lidH = 0.13 * s;
    const topD = 0.19 * s;
    const bodyT = baseY - bodyH;
    const { tilt, stand } = Renderer.chestPose(o);
    ctx.fillStyle = '#26222e';
    ctx.fillRect(cx - bw, baseY - s * 0.02, bw * 2, s * 0.055);
    // Dark timber mass.
    ctx.fillStyle = '#4a3826';
    ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
    ctx.fillStyle = '#5c452c';
    ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
    ctx.fillStyle = '#31220e';
    ctx.fillRect(cx - bw, baseY - s * 0.08, bw * 2, s * 0.06);
    // Iron corner columns.
    for (const sgn of [-1, 1] as const) {
      const x0 = sgn < 0 ? cx - bw : cx + bw - s * 0.08;
      ctx.fillStyle = '#26222e';
      ctx.fillRect(x0, bodyT, s * 0.08, bodyH);
      ctx.fillStyle = '#565062';
      ctx.fillRect(x0 + (sgn < 0 ? 0 : s * 0.012), bodyT, s * 0.068, bodyH);
      ctx.fillStyle = '#8a8494';
      ctx.fillRect(x0 + (sgn < 0 ? 0 : s * 0.055), bodyT, s * 0.025, bodyH);
    }
    // THE BELT: one massive iron band around the middle.
    ctx.fillStyle = '#26222e';
    ctx.fillRect(cx - bw, bodyT + bodyH * 0.38 + s * 0.02, bw * 2, s * 0.1);
    ctx.fillStyle = '#565062';
    ctx.fillRect(cx - bw, bodyT + bodyH * 0.38, bw * 2, s * 0.1);
    ctx.fillStyle = '#8a8494';
    ctx.fillRect(cx - bw, bodyT + bodyH * 0.38, bw * 2, s * 0.03);
    ctx.fillStyle = '#26222e';
    for (const rx of [-0.28, 0, 0.28] as const) {
      ctx.fillRect(cx + rx * s - s * 0.018, bodyT + bodyH * 0.38 + s * 0.032, s * 0.036, s * 0.036);
    }
    if (o > 0.1) this.chestMouth(ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#31220e', '#4a4258');
    const mouthT = bodyT - topD;
    if (tilt > 0) {
      const d = topD * tilt;
      const lidT = bodyT - d - lidH;
      ctx.fillStyle = '#5c452c';
      ctx.fillRect(cx - bw, lidT, bw * 2, d);
      ctx.fillStyle = '#3a2c14';
      ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
      ctx.fillStyle = '#4a3826';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
      // Iron frame: far edge, near cap, and a center spine.
      ctx.fillStyle = '#565062';
      ctx.fillRect(cx - bw, lidT, bw * 2, s * 0.032);
      ctx.fillRect(cx - bw, lidT + d - s * 0.012, bw * 2, s * 0.045);
      ctx.fillStyle = '#8a8494';
      ctx.fillRect(cx - bw, lidT + d - s * 0.012, bw * 2, s * 0.018);
      ctx.fillStyle = '#565062';
      ctx.fillRect(cx - s * 0.045, lidT, s * 0.09, d + lidH);
      ctx.fillStyle = '#8a8494';
      ctx.fillRect(cx - s * 0.045, lidT, s * 0.028, d + lidH);
      // The padlock: brass fist under the seam, closed pose only.
      if (o < 0.3) {
        const ly = lidT + d + lidH - s * 0.02;
        ctx.fillStyle = '#8a8494';
        ctx.fillRect(cx - s * 0.052, ly, s * 0.032, s * 0.07);
        ctx.fillRect(cx + s * 0.02, ly, s * 0.032, s * 0.07);
        ctx.fillRect(cx - s * 0.052, ly, s * 0.104, s * 0.026);
        ctx.fillStyle = '#8a6a1e';
        ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.15);
        ctx.fillStyle = '#c9a23e';
        ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.105);
        ctx.fillStyle = '#e8c86a';
        ctx.fillRect(cx - s * 0.085, ly + s * 0.055, s * 0.17, s * 0.032);
        ctx.fillStyle = '#26222e';
        ctx.fillRect(cx - s * 0.022, ly + s * 0.095, s * 0.044, s * 0.044);
        ctx.fillRect(cx - s * 0.011, ly + s * 0.13, s * 0.022, s * 0.045);
      }
    } else {
      // Open: the bare staple where the lock used to hang.
      ctx.fillStyle = '#8a8494';
      ctx.fillRect(cx - s * 0.02, mouthT + topD + s * 0.02, s * 0.04, s * 0.06);
    }
    if (stand > 0) {
      this.chestStandingLid(ctx, cx, mouthT, bw, s * 0.31 * stand, s, '#4a3826', '#4a4258', '#8a8494');
    }
  }

  /**
   * GILDED — the coffer. A stepped gold crown over a lacquer inlay:
   * treasure-house work, all big faces and one set stone. The value
   * ladder does the shining; the sparkles only visit.
   */
  private drawChestGilded(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    s: number,
    o: number,
    t: number,
    h: number,
  ): void {
    const bw = 0.42 * s;
    const bodyH = 0.3 * s;
    const lidH = 0.11 * s;
    const topD = 0.2 * s;
    const step = 0.07 * s;
    const bodyT = baseY - bodyH;
    const { tilt, stand } = Renderer.chestPose(o);
    // Gold plinth.
    ctx.fillStyle = '#7e5a14';
    ctx.fillRect(cx - bw - s * 0.015, baseY - s * 0.02, bw * 2 + s * 0.03, s * 0.055);
    ctx.fillStyle = '#a8792a';
    ctx.fillRect(cx - bw - s * 0.015, baseY - s * 0.02, bw * 2 + s * 0.03, s * 0.022);
    // Gold body with bright edge columns.
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
    ctx.fillStyle = '#f2cf6e';
    ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.05);
    ctx.fillStyle = '#a8792a';
    ctx.fillRect(cx - bw, baseY - s * 0.07, bw * 2, s * 0.05);
    ctx.fillStyle = '#f2cf6e';
    ctx.fillRect(cx - bw, bodyT, s * 0.05, bodyH);
    ctx.fillRect(cx + bw - s * 0.05, bodyT, s * 0.05, bodyH);
    // One centered lacquer inlay, framed deep, pinned at the corners.
    const pw = 0.5 * s;
    const ph = bodyH * 0.62;
    const py0 = bodyT + bodyH * 0.19;
    ctx.fillStyle = '#4c1620';
    ctx.fillRect(cx - pw / 2, py0, pw, ph);
    ctx.fillStyle = '#6e2434';
    ctx.fillRect(cx - pw / 2 + s * 0.016, py0 + s * 0.016, pw - s * 0.032, ph - s * 0.032);
    ctx.fillStyle = '#8a2f42';
    ctx.fillRect(cx - pw / 2 + s * 0.016, py0 + s * 0.016, pw - s * 0.032, s * 0.035);
    ctx.fillStyle = '#ffedb0';
    for (const [sx, sy] of [
      [-pw / 2 + s * 0.01, py0 + s * 0.01],
      [pw / 2 - s * 0.038, py0 + s * 0.01],
      [-pw / 2 + s * 0.01, py0 + ph - s * 0.038],
      [pw / 2 - s * 0.038, py0 + ph - s * 0.038],
    ] as const) {
      ctx.fillRect(cx + sx, sy, s * 0.028, s * 0.028);
    }
    if (o > 0.1) this.chestMouth(ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#a8792a', '#8a2f42');
    const mouthT = bodyT - topD;
    if (tilt > 0) {
      const d = topD * tilt;
      const lidT = bodyT - d - lidH;
      // Lower tier.
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(cx - bw, lidT, bw * 2, d);
      ctx.fillStyle = '#a8792a';
      ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.045));
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
      ctx.fillStyle = '#ffedb0';
      ctx.fillRect(cx - bw, lidT + d - s * 0.022, bw * 2, s * 0.022);
      ctx.fillStyle = '#a8792a';
      ctx.fillRect(cx - bw, lidT + d + lidH - s * 0.03, bw * 2, s * 0.03);
      // The stepped crown: an inset upper tier that rises with the lid.
      const iw = bw - 0.14 * s;
      const st = step * tilt;
      ctx.fillStyle = '#f2cf6e';
      ctx.fillRect(cx - iw, lidT - st, iw * 2, Math.max(d * 0.82, s * 0.02) + st);
      ctx.fillStyle = '#c9962e';
      ctx.fillRect(cx - iw, lidT - st, iw * 2, s * 0.03);
      ctx.fillStyle = '#ffedb0';
      ctx.fillRect(cx - iw, lidT - st + d * 0.82 + st - s * 0.024, iw * 2, s * 0.024);
      // The set stone: a square teal cabochon on the crown.
      const gy = lidT - st + (d * 0.82 + st) * 0.42;
      ctx.fillStyle = '#3f7a68';
      ctx.fillRect(cx - s * 0.052, gy - s * 0.012, s * 0.104, s * 0.1);
      ctx.fillStyle = '#7fc9b3';
      ctx.fillRect(cx - s * 0.04, gy, s * 0.08, s * 0.076);
      ctx.fillStyle = '#c8ede2';
      ctx.fillRect(cx - s * 0.04, gy, s * 0.038, s * 0.03);
      // Gold latch square at the seam.
      ctx.fillStyle = '#ffedb0';
      ctx.fillRect(cx - s * 0.04, lidT + d + lidH - s * 0.028, s * 0.08, s * 0.06);
      ctx.fillStyle = '#a8792a';
      ctx.fillRect(cx - s * 0.04, lidT + d + lidH + s * 0.005, s * 0.08, s * 0.027);
    }
    if (stand > 0) {
      const topY = this.chestStandingLid(ctx, cx, mouthT, bw, s * 0.28 * stand, s, '#d9a441', '#8a2f42', '#f2cf6e');
      // The crown step shows as a raised notch on the standing lid.
      if (stand > 0.5) {
        ctx.fillStyle = '#f2cf6e';
        ctx.fillRect(cx - (bw - 0.14 * s), topY - s * 0.05, (bw - 0.14 * s) * 2, s * 0.055);
        ctx.fillStyle = '#c9962e';
        ctx.fillRect(cx - (bw - 0.14 * s), topY - s * 0.05, (bw - 0.14 * s) * 2, s * 0.02);
      }
    }
    // Star glints walk the goldwork on the twinkle clock.
    const tw = Renderer.twinkle(t, h, 3.4);
    if (tw > 0) this.sparkle(cx - bw * 0.72, bodyT - topD * 0.5, s * 0.05, 0.6 * tw, '#ffedb0');
    const tw2 = Renderer.twinkle(t, h ^ 0x9e37, 4.7);
    if (tw2 > 0) this.sparkle(cx + bw * 0.6, bodyT + bodyH * 0.32, s * 0.04, 0.5 * tw2, '#fff6d8');
  }

  /**
   * BOSS — the black cache. A pedestal-set black mass in angular
   * iron, fronted by a bone skull whose sockets smoulder while the
   * hoard is still inside. Legendary is a silhouette, not a shimmer.
   */
  private drawChestBoss(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    s: number,
    o: number,
    t: number,
    h: number,
  ): void {
    const bw = 0.46 * s;
    const bodyH = 0.37 * s;
    const lidH = 0.15 * s;
    const topD = 0.21 * s;
    const bodyT = baseY - bodyH;
    const { tilt, stand } = Renderer.chestPose(o);
    // The pedestal: a shade wider than the box — this thing was PLACED.
    ctx.fillStyle = '#17131f';
    ctx.fillRect(cx - bw - s * 0.018, baseY - s * 0.02, bw * 2 + s * 0.036, s * 0.065);
    ctx.fillStyle = '#2b2635';
    ctx.fillRect(cx - bw - s * 0.018, baseY - s * 0.02, bw * 2 + s * 0.036, s * 0.026);
    // Black mass.
    ctx.fillStyle = '#332e3d';
    ctx.fillRect(cx - bw, bodyT, bw * 2, bodyH);
    ctx.fillStyle = '#453f52';
    ctx.fillRect(cx - bw, bodyT, bw * 2, s * 0.055);
    ctx.fillStyle = '#1f1b29';
    ctx.fillRect(cx - bw, baseY - s * 0.085, bw * 2, s * 0.065);
    // Angular iron corner plates, cut at 45 on the inner corner.
    for (const sgn of [-1, 1] as const) {
      const x0 = sgn < 0 ? cx - bw : cx + bw;
      ctx.fillStyle = '#4a4553';
      ctx.beginPath();
      ctx.moveTo(x0, bodyT);
      ctx.lineTo(x0 + sgn * s * 0.13, bodyT);
      ctx.lineTo(x0 + sgn * s * 0.13, bodyT + s * 0.06);
      ctx.lineTo(x0 + sgn * s * 0.06, bodyT + s * 0.13);
      ctx.lineTo(x0, bodyT + s * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6e6879';
      ctx.fillRect(x0 + (sgn < 0 ? 0 : -s * 0.13), bodyT, s * 0.13, s * 0.024);
      ctx.fillStyle = '#211d2b';
      ctx.fillRect(x0 + (sgn < 0 ? s * 0.035 : -s * 0.065), bodyT + s * 0.035, s * 0.03, s * 0.03);
    }
    // THE SKULL: square bone, black sockets, a jaw with missing teeth.
    const sw = 0.26 * s;
    const sy0 = bodyT + bodyH * 0.1;
    const sh = 0.22 * s;
    ctx.fillStyle = '#9a8f78';
    ctx.fillRect(cx - sw / 2 + s * 0.012, sy0 + s * 0.012, sw, sh);
    ctx.fillStyle = '#c9bda3';
    ctx.beginPath();
    ctx.moveTo(cx - sw / 2, sy0 + s * 0.035);
    ctx.lineTo(cx - sw / 2 + s * 0.035, sy0);
    ctx.lineTo(cx + sw / 2 - s * 0.035, sy0);
    ctx.lineTo(cx + sw / 2, sy0 + s * 0.035);
    ctx.lineTo(cx + sw / 2, sy0 + sh * 0.66);
    ctx.lineTo(cx + sw / 2 - s * 0.03, sy0 + sh);
    ctx.lineTo(cx - sw / 2 + s * 0.03, sy0 + sh);
    ctx.lineTo(cx - sw / 2, sy0 + sh * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0d6c2';
    ctx.fillRect(cx - sw / 2 + s * 0.02, sy0 + s * 0.012, sw - s * 0.04, sh * 0.3);
    // Sockets — and the ember behind them while the cache is shut.
    ctx.fillStyle = '#17101f';
    ctx.fillRect(cx - s * 0.085, sy0 + sh * 0.3, s * 0.06, s * 0.055);
    ctx.fillRect(cx + s * 0.025, sy0 + sh * 0.3, s * 0.06, s * 0.055);
    if (o < 0.2) {
      const pulse = 0.55 + Math.sin(t * 2.4 + h) * 0.45;
      ctx.fillStyle = `rgba(255, 130, 60, ${0.5 + 0.4 * pulse})`;
      ctx.fillRect(cx - s * 0.075, sy0 + sh * 0.3 + s * 0.014, s * 0.026, s * 0.026);
      ctx.fillRect(cx + s * 0.048, sy0 + sh * 0.3 + s * 0.014, s * 0.026, s * 0.026);
    }
    // Nasal notch + jaw gaps.
    ctx.fillStyle = '#17101f';
    ctx.fillRect(cx - s * 0.014, sy0 + sh * 0.52, s * 0.028, s * 0.035);
    ctx.fillRect(cx - s * 0.055, sy0 + sh * 0.8, s * 0.024, sh * 0.2);
    ctx.fillRect(cx + s * 0.014, sy0 + sh * 0.8, s * 0.024, sh * 0.2);
    if (o > 0.1) this.chestMouth(ctx, cx, bodyT, bw, topD, s, (o - 0.1) / 0.5, '#1f1b29', '#241a2e');
    const mouthT = bodyT - topD;
    if (tilt > 0) {
      const d = topD * tilt;
      const lidT = bodyT - d - lidH;
      ctx.fillStyle = '#3d3749';
      ctx.fillRect(cx - bw, lidT, bw * 2, d);
      ctx.fillStyle = '#211d2b';
      ctx.fillRect(cx - bw, lidT, bw * 2, Math.min(d, s * 0.05));
      ctx.fillStyle = '#332e3d';
      ctx.fillRect(cx - bw, lidT + d, bw * 2, lidH);
      // Iron edging + twin spines: the lid is armored, not decorated.
      ctx.fillStyle = '#4a4553';
      ctx.fillRect(cx - bw, lidT + d - s * 0.014, bw * 2, s * 0.05);
      ctx.fillStyle = '#6e6879';
      ctx.fillRect(cx - bw, lidT + d - s * 0.014, bw * 2, s * 0.02);
      for (const bx of [-0.26, 0.26] as const) {
        ctx.fillStyle = '#4a4553';
        ctx.fillRect(cx + bx * s - s * 0.042, lidT, s * 0.084, d + lidH);
        ctx.fillStyle = '#6e6879';
        ctx.fillRect(cx + bx * s - s * 0.042, lidT, s * 0.026, d + lidH);
      }
      // The ember seam: the hoard's light escaping under the lid.
      if (o < 0.2) {
        const pulse = 0.6 + Math.sin(t * 2.4 + h) * 0.4;
        ctx.fillStyle = `rgba(255, 130, 60, ${0.35 * pulse})`;
        ctx.fillRect(cx - bw + s * 0.05, lidT + d + lidH - s * 0.012, bw * 2 - s * 0.1, s * 0.022);
      }
    }
    if (stand > 0) {
      this.chestStandingLid(ctx, cx, mouthT, bw, s * 0.34 * stand, s, '#332e3d', '#241a2e', '#6e6879');
    }
  }

  /** Trees, rocks, stations — the object layer, redrawn with character. */
  // ------------------------------------------------------------ fences

  /** Fence-family connectivity: rails reach toward these neighbours. */
  private fenceish(game: ClientGame, x: number, y: number): boolean {
    const t = game.world.groundAt(x, y);
    return (
      t !== undefined &&
      (FENCE_TILES.has(t as Tile) ||
        t === Tile.WallWood ||
        t === Tile.WallStone ||
        t === Tile.WallWoodWindow ||
        t === Tile.WallStoneWindow)
    );
  }

  /**
   * A square-hewn fence post wearing a foreshortened cap plane — the
   * 2.5D anchor every fence mass hangs from (crate-lid grammar: lit
   * plane, shaded far edge, sunlit front arris). Paints its own brand
   * outline; call it AFTER the rails so the post face covers their
   * run-through seams and every joint reads carpentered.
   */
  private drawFencePost(x: number, baseY: number, w: number, hTot: number): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const capD = 0.15 * syT;
    const hw = w / 2;
    const top = baseY - hTot;
    // Contact shade roots it to the turf.
    ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, baseY + s * 0.012, hw * 1.7, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Face, with a sunlit west arris and a shaded east fall-off — a
    // turned square timber, not a flat card.
    ctx.fillStyle = FENCE_POST;
    ctx.fillRect(x - hw, top + capD, w, hTot - capD);
    ctx.fillStyle = shade(FENCE_POST, 12);
    ctx.fillRect(x - hw, top + capD, s * 0.03, hTot - capD);
    ctx.fillStyle = shade(FENCE_POST, -14);
    ctx.fillRect(x + hw - s * 0.03, top + capD, s * 0.03, hTot - capD);
    // The cap: tilted bird's-eye top plane.
    ctx.fillStyle = shade(FENCE_POST, 24);
    ctx.fillRect(x - hw, top, w, capD);
    ctx.fillStyle = shade(FENCE_POST, 2);
    ctx.fillRect(x - hw, top, w, s * 0.018);
    ctx.fillStyle = shade(FENCE_POST, 38);
    ctx.fillRect(x - hw, top + capD - s * 0.016, w, s * 0.016);
    if (this.outlineOn) {
      this.beginStructOutline();
      ctx.strokeRect(x - hw, top, w, hTot);
    }
  }

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
  private fenceItem(tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const p = this.camera.worldToScreen(tx + 0.5, ty + 0.5, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const h = hashCoords(41, tx, ty);
    const baseY = p.y + syT * 0.14;
    const straight = tile === Tile.Fence;
    const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
    const cn = straight && this.fenceish(game, tx, ty - 1);
    const ce = straight && this.fenceish(game, tx + 1, ty);
    const cs = straight && this.fenceish(game, tx, ty + 1);
    const cw = straight && this.fenceish(game, tx - 1, ty);
    // Diagonal joins: a 45° tile joins any fence-family diagonal on
    // its own line; a straight tile only stubs toward a 45° tile
    // whose rail line points back at this post.
    const dNE =
      tile === Tile.FenceDiagNE
        ? this.fenceish(game, tx + 1, ty - 1)
        : straight && gAt(1, -1) === Tile.FenceDiagNE;
    const dSW =
      tile === Tile.FenceDiagNE
        ? this.fenceish(game, tx - 1, ty + 1)
        : straight && gAt(-1, 1) === Tile.FenceDiagNE;
    const dNW =
      tile === Tile.FenceDiagNW
        ? this.fenceish(game, tx - 1, ty - 1)
        : straight && gAt(-1, -1) === Tile.FenceDiagNW;
    const dSE =
      tile === Tile.FenceDiagNW
        ? this.fenceish(game, tx + 1, ty + 1)
        : straight && gAt(1, 1) === Tile.FenceDiagNW;
    const any = cn || ce || cs || cw || dNE || dSW || dNW || dSE;
    // An isolated piece still shows its build: a straight post keeps
    // a full rail panel, a 45° turn its full diagonal stride.
    const isoEW = straight && !any;
    const isoNE = tile === Tile.FenceDiagNE && !any;
    const isoNW = tile === Tile.FenceDiagNW && !any;
    // Rail metrics as tile fractions: silhouette top of the lit plane
    // for the upper/lower board, plane depth, and board-face height.
    const RT = 0.75;
    const RB = 0.45;
    const PLANE = 0.05;
    const FACE = 0.11;
    const THICK = (PLANE + FACE) * s;
    const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
    const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
    return {
      sortY: ty + 0.8,
      drawShadow: () => {
        // The rails' cast line follows every connected direction; the
        // post always drops its own short anchor line.
        if (cw || ce || isoEW) this.castEdgeQuad(xw, baseY, xe, baseY, 0.6);
        if (cn) this.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.6);
        if (cs) this.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.6);
        if (dNE || isoNE) this.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.6);
        if (dSW || isoNE) this.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.6);
        if (dNW || isoNW) this.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.6);
        if (dSE || isoNW) this.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.6);
        this.castEdgeQuad(p.x - s * 0.085, baseY, p.x + s * 0.085, baseY, 0.85);
      },
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps this.ctx.
        const ctx = this.ctx;

        // E-W boards: lit top plane over a front face, an under-edge
        // shadow seating each board. End grain only at exposed ends
        // (isolated panels) — run ends die into posts.
        const railEW = () => {
          for (const T of [RB, RT]) {
            const yPlane = baseY - T * s;
            const yFace = yPlane + PLANE * s;
            const yBot = yFace + FACE * s;
            ctx.fillStyle = shade(FENCE_RAIL, 20);
            ctx.fillRect(xw, yPlane, xe - xw, PLANE * s);
            ctx.fillStyle = T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6);
            ctx.fillRect(xw, yFace, xe - xw, FACE * s);
            ctx.fillStyle = shade(FENCE_RAIL, -20);
            ctx.fillRect(xw, yBot - s * 0.02, xe - xw, s * 0.02);
            if (isoEW) {
              ctx.fillStyle = shade(FENCE_RAIL, -16);
              ctx.fillRect(xw, yPlane, s * 0.03, yBot - yPlane);
              ctx.fillRect(xe - s * 0.03, yPlane, s * 0.03, yBot - yPlane);
            }
            if (this.outlineOn) {
              this.beginStructOutline();
              ctx.beginPath();
              ctx.moveTo(xw, yPlane);
              ctx.lineTo(xe, yPlane);
              ctx.moveTo(xw, yBot);
              ctx.lineTo(xe, yBot);
              if (isoEW) {
                ctx.moveTo(xw, yPlane);
                ctx.lineTo(xw, yBot);
                ctx.moveTo(xe, yPlane);
                ctx.lineTo(xe, yBot);
              }
              ctx.stroke();
            }
          }
          // A rare knot keeps long runs hand-made (mid-span only —
          // edges must stay identical across tiles).
          if (((h >> 6) & 7) === 1 && xe - xw > s * 0.6) {
            ctx.fillStyle = shade(FENCE_RAIL, -24);
            ctx.beginPath();
            ctx.ellipse(
              p.x + (((h >> 9) & 15) / 15 - 0.5) * s * 0.5,
              baseY - (RT - PLANE - 0.05) * s,
              s * 0.022,
              s * 0.016,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        };

        // N-S half-strips: the two rails' top planes, edge-on.
        const railNS = (yN: number, yS: number) => {
          const hw2 = s * 0.05;
          ctx.fillStyle = shade(FENCE_RAIL, -12);
          ctx.fillRect(p.x - hw2, yN - RB * s, hw2 * 2, yS - yN + THICK);
          ctx.fillStyle = shade(FENCE_RAIL, 14);
          ctx.fillRect(p.x - hw2, yN - RT * s, hw2 * 2, yS - yN + THICK);
          ctx.fillStyle = shade(FENCE_RAIL, 30);
          ctx.fillRect(p.x - hw2, yN - RT * s, s * 0.016, yS - yN + THICK);
          if (this.outlineOn) {
            // Verticals only: both strip ends always die under posts.
            this.beginStructOutline();
            ctx.beginPath();
            ctx.moveTo(p.x - hw2, yN - RT * s);
            ctx.lineTo(p.x - hw2, yS - RB * s + THICK);
            ctx.moveTo(p.x + hw2, yN - RT * s);
            ctx.lineTo(p.x + hw2, yS - RB * s + THICK);
            ctx.stroke();
          }
        };

        // 45° half-strides: sheared boards, corner-overlapped a hair
        // when a partner continues (no antialias hairline at joins),
        // end-grain capped when the stride ends mid-air.
        const railDiag = (dx: number, dy: number, joined: boolean) => {
          const k = joined ? 1.04 : 1;
          const x1 = p.x + dx * k;
          const y1b = baseY + dy * k;
          for (const T of [RB, RT]) {
            const y0 = baseY - T * s;
            const y1 = y1b - T * s;
            const quad = (a: number, b: number, fill: string) => {
              ctx.fillStyle = fill;
              ctx.beginPath();
              ctx.moveTo(p.x, y0 + a);
              ctx.lineTo(x1, y1 + a);
              ctx.lineTo(x1, y1 + b);
              ctx.lineTo(p.x, y0 + b);
              ctx.closePath();
              ctx.fill();
            };
            quad(0, PLANE * s, shade(FENCE_RAIL, 20));
            quad(PLANE * s, THICK, T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6));
            quad(THICK - s * 0.02, THICK, shade(FENCE_RAIL, -20));
            if (!joined) {
              ctx.fillStyle = shade(FENCE_RAIL, -16);
              ctx.fillRect(x1 - (dx > 0 ? s * 0.03 : 0), y1, s * 0.03, THICK);
            }
            if (this.outlineOn) {
              this.beginStructOutline();
              ctx.beginPath();
              ctx.moveTo(p.x, y0);
              ctx.lineTo(x1, y1);
              ctx.moveTo(p.x, y0 + THICK);
              ctx.lineTo(x1, y1 + THICK);
              if (!joined) {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x1, y1 + THICK);
              }
              ctx.stroke();
            }
          }
        };

        // Back-to-front: up-screen masses, the E-W panel, the post
        // (covering every joint), then down-screen masses.
        if (cn) railNS(baseY - syT * 0.5, baseY);
        if (dNE || isoNE) railDiag(s * 0.5, -syT * 0.5, dNE);
        if (dNW || isoNW) railDiag(-s * 0.5, -syT * 0.5, dNW);
        if (cw || ce || isoEW) railEW();
        this.drawFencePost(p.x, baseY, s * 0.17, s * 0.92);
        if (cs) railNS(baseY, baseY + syT * 0.5);
        if (dSW || isoNE) railDiag(-s * 0.5, syT * 0.5, dSW);
        if (dSE || isoNW) railDiag(s * 0.5, syT * 0.5, dSE);
      },
    };
  }

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
  private fenceGateItem(tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
    const s = this.camera.scale;
    const syT = s * this.camera.yScale;
    const p = this.camera.worldToScreen(tx + 0.5, ty + 0.5, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const baseY = p.y + syT * 0.14;
    const open = doorInfo(tile)!.open;
    const IRON = '#3a3444';
    // Orientation follows the fence line the gate is hung in.
    const vertical =
      (this.fenceish(game, tx, ty - 1) || this.fenceish(game, tx, ty + 1)) &&
      !(this.fenceish(game, tx + 1, ty) || this.fenceish(game, tx - 1, ty));
    return {
      sortY: ty + (vertical ? 0.75 : 0.8),
      drawShadow: () => {
        if (vertical) this.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY + syT * 0.5, 0.7);
        else this.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 0.7);
      },
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps this.ctx.
        const ctx = this.ctx;
        const o = Math.min(1, this.doorOpenness(tx, ty, open));
        const shakeX = this.doorShakeAt(tx, ty) * s * 0.03;
        if (shakeX !== 0) {
          ctx.save();
          ctx.translate(shakeX, 0);
        }

        // The leaf, shared by both hangs: five-bar frame with real
        // daylight between the bars, the signature Z-brace, iron
        // straps at the heel and a latch tongue at the head. `dim`
        // deepens as the swing turns the boards edge-on.
        const drawLeaf = (hx: number, X: number, base: number, dim: number) => {
          const w2 = X - hx;
          if (w2 < s * 0.05) return;
          const yTop = base - 0.72 * s;
          const yBot = base - 0.1 * s;
          const rc = (k: number) => shade(FENCE_RAIL, k + dim);
          if (w2 < s * 0.32) {
            // Edge-on: detail collapses to one turned slab.
            ctx.fillStyle = rc(-10);
            ctx.fillRect(hx, yTop, w2, yBot - yTop);
            if (this.outlineOn) {
              this.beginStructOutline();
              ctx.strokeRect(hx, yTop, w2, yBot - yTop);
            }
            return;
          }
          const stW = 0.09 * s;
          // Bars first — they tenon INTO the stiles. Top bar heavy,
          // boot bar flush with the stile feet so the silhouette (and
          // its ring) closes as one honest rectangle.
          const bars: ReadonlyArray<readonly [number, number, number]> = [
            [yTop, 0.1 * s, 14],
            [base - 0.5 * s, 0.06 * s, 4],
            [base - 0.335 * s, 0.06 * s, -4],
            [yBot - 0.055 * s, 0.055 * s, -10],
          ];
          for (const [by, bh, tone] of bars) {
            ctx.fillStyle = rc(tone);
            ctx.fillRect(hx, by, w2, bh);
            ctx.fillStyle = rc(tone + 16);
            ctx.fillRect(hx, by, w2, s * 0.02);
          }
          // THE Z-BRACE: heel-bottom to head-top, the field-gate
          // signature, riding proud of the bars.
          ctx.fillStyle = rc(-20);
          ctx.beginPath();
          ctx.moveTo(hx + stW, yBot - 0.12 * s);
          ctx.lineTo(X - stW, yTop + 0.06 * s);
          ctx.lineTo(X - stW, yTop + 0.13 * s);
          ctx.lineTo(hx + stW, yBot - 0.05 * s);
          ctx.closePath();
          ctx.fill();
          // Stiles cap the bar ends; lit west arris + top plane each.
          for (const sx of [hx, X - stW]) {
            ctx.fillStyle = rc(0);
            ctx.fillRect(sx, yTop, stW, yBot - yTop);
            ctx.fillStyle = rc(14);
            ctx.fillRect(sx, yTop, s * 0.022, yBot - yTop);
            ctx.fillStyle = rc(28);
            ctx.fillRect(sx, yTop, stW, s * 0.035);
          }
          // Ironmongery: hinge straps reach in from the heel, the
          // latch tongue waits at the head.
          ctx.fillStyle = IRON;
          ctx.fillRect(hx - 0.02 * s, yTop + 0.035 * s, 0.2 * s, 0.045 * s);
          ctx.fillRect(hx - 0.02 * s, yBot - 0.1 * s, 0.2 * s, 0.045 * s);
          ctx.fillRect(X - 0.045 * s, base - 0.47 * s, 0.09 * s, 0.05 * s);
          ctx.fillStyle = '#565064';
          ctx.fillRect(hx - 0.02 * s, yTop + 0.035 * s, 0.2 * s, 0.014 * s);
          if (this.outlineOn) {
            this.beginStructOutline();
            ctx.strokeRect(hx, yTop, w2, yBot - yTop);
          }
        };

        if (!vertical) {
          const hx = p.x - 0.4 * s;
          const X0 = p.x + 0.4 * s;
          drawLeaf(hx, hx + (X0 - hx) * (1 - o * 0.93), baseY, Math.round(-24 * o));
          this.drawFencePost(p.x - 0.5 * s, baseY, s * 0.19, s * 0.98);
          this.drawFencePost(p.x + 0.5 * s, baseY, s * 0.19, s * 0.98);
        } else {
          const yN = baseY - syT * 0.5;
          const yS = baseY + syT * 0.5;
          this.drawFencePost(p.x, yN, s * 0.19, s * 0.98);
          if (o < 0.98) {
            // Shut: the leaf edge-on, a framed strip barring the gap.
            // Slit shadows hint the daylight between the bars; the
            // strip retracts toward its north hinge as it swings.
            const hw2 = 0.06 * s;
            const top = yN - 0.72 * s;
            const bot = top + (yS - 0.1 * s - top) * (1 - o);
            ctx.fillStyle = shade(FENCE_RAIL, -2);
            ctx.fillRect(p.x - hw2, top, hw2 * 2, bot - top);
            ctx.fillStyle = shade(FENCE_RAIL, 22);
            ctx.fillRect(p.x - hw2, top, s * 0.02, bot - top);
            if (o < 0.35) {
              ctx.fillStyle = 'rgba(20, 14, 26, 0.3)';
              for (const fy of [0.3, 0.52, 0.74]) {
                ctx.fillRect(p.x - hw2, top + (bot - top) * fy, hw2 * 2, s * 0.02);
              }
              ctx.fillStyle = IRON;
              ctx.fillRect(p.x - hw2 - 0.01 * s, top + 0.06 * s, hw2 * 2 + 0.02 * s, 0.045 * s);
              ctx.fillRect(p.x + hw2 - 0.008 * s, bot - 0.34 * s, 0.065 * s, 0.05 * s);
            }
            if (this.outlineOn) {
              this.beginStructOutline();
              ctx.strokeRect(p.x - hw2, top, hw2 * 2, bot - top);
            }
          }
          if (o > 0.02) {
            // Open: ONE leaf thrown front-on into the east column,
            // hung from the north post — never a pair.
            const oo = Math.sin((o * Math.PI) / 2);
            drawLeaf(p.x + 0.06 * s, p.x + 0.06 * s + 0.86 * s * oo, yN, 0);
          }
          this.drawFencePost(p.x, yS, s * 0.19, s * 0.98);
        }
        if (shakeX !== 0) ctx.restore();
      },
    };
  }

  private objectItem(tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(tx + 0.5, ty + 0.5, this.w, this.h);
    p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
    const h = hashCoords(41, tx, ty);
    const t = performance.now() / 1000;
    // Interactables wear the character outline ring — one generous
    // bounds recipe covers every workable station's casework (the
    // pass only sizes its scratch region from this; too-tight bounds
    // clip the art and ring the straight clip edge).
    const stationBody = (hw = 1.15, up = 2.2, down = 0.8) => ({
      x: p.x - hw * s,
      y: p.y - up * s,
      w: hw * 2 * s,
      h: (up + down) * s,
    });

    switch (tile) {
      case Tile.Tree:
      case Tile.TreeOak:
      case Tile.TreeWillow:
      case Tile.TreeYew: {
        // A tree that just stood up from its sapling eases from
        // sapling scale to full height instead of popping in.
        const grow = this.growthOf(tx, ty, 0.45, 1, 2600);
        return {
          sortY: ty + 0.9,
          // Mature trees carry the ring baked into their cached sprite
          // (bakeOutlineRing) — only the live-painted regrowth ease
          // goes through the per-frame outline pass.
          body: grow < 1 ? this.treeBody(tile, h, p.x, p.y) : undefined,
          drawShadow: () => this.drawTreeShadow(p.x, p.y, tx + 0.5, ty + 0.5, h, tile, t, grow),
          draw: () => this.drawTree(p.x, p.y, tx + 0.5, ty + 0.5, h, tile, t, undefined, grow),
        };
      }

      case Tile.Sapling:
      case Tile.SaplingOak:
      case Tile.SaplingWillow:
      case Tile.SaplingYew: {
        // The middle beat of regrowth: the SAME tree this tile will
        // grow into (same hash -> same species, variant, silhouette),
        // drawn young — thin, short, crown not yet filled in.
        const tree = treeOfSapling(tile) ?? Tile.Tree;
        const grow = this.growthOf(tx, ty, 0.16, 0.45, 1400);
        return {
          sortY: ty + 0.7,
          body: this.treeBody(tree, h, p.x, p.y),
          drawShadow: () => this.drawTreeShadow(p.x, p.y, tx + 0.5, ty + 0.5, h, tree, t, grow),
          draw: () => this.drawTree(p.x, p.y, tx + 0.5, ty + 0.5, h, tree, t, undefined, grow),
        };
      }

      case Tile.Rock:
      case Tile.RockCopper:
      case Tile.RockTin:
      case Tile.RockIron:
      case Tile.RockCoal:
      case Tile.RockGold:
      case Tile.RockSilver:
      case Tile.RockMithril:
      case Tile.RockAdamant:
      case Tile.RockObsidian:
      case Tile.RockStarfall:
      case Tile.RockDepleted: {
        const depleted = tile === Tile.RockDepleted;
        // Ore deposits are landmarks now — their cast shadow matches
        // the wider, taller mass; barren stone stays modest.
        const size = depleted ? 0.8 : tile === Tile.Rock ? 0.9 : 1.15;
        // Cluster law: worldgen lays ore in runs. A formation with
        // another rock tile directly south (which y-sorts in front and
        // buries it) keeps low, so a run reads as ONE sprawling deposit
        // with a dominant face — not a totem line of clone towers.
        const south = game.world.groundAt(tx, ty + 1);
        const crowded =
          south !== undefined && Renderer.ROCK_TILES.has(south) && game.world.elevAt(tx, ty + 1) === game.world.elevAt(tx, ty);
        return {
          sortY: ty + 0.85,
          // Depleted rocks go ringless on purpose: the outline doubles
          // as the "this node is workable" signal, so mining one out
          // visibly retires it.
          body: depleted
            ? undefined
            : { x: p.x - s * 1.2, y: p.y - s * 1.5, w: s * 2.4, h: s * 2.1 },
          drawShadow: () => this.castRockShadow(p.x, p.y, tile, h, crowded),
          draw: () => this.drawRockFormation(p.x, p.y, s, h, tile, t, crowded),
        };
      }

      case Tile.Stump:
        return {
          sortY: ty + 0.6,
          body: stationBody(0.5, 0.55, 0.4),
          drawShadow: () => this.castContact(p.x, p.y + s * 0.06, s * 0.27, s * 0.11),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // A hewn hexagonal stump — cut marks, not a smooth oval.
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y, s * 0.21, 6, 0.2, 0.72);
            ctx.fill();
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y - s * 0.05, s * 0.19, 6, 0.2, 0.72);
            ctx.fill();
            ctx.strokeStyle = '#7a552e';
            ctx.lineWidth = Math.max(1, s * 0.03);
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y - s * 0.05, s * 0.1, 6, 0.2, 0.72);
            ctx.stroke();
          },
        };

      case Tile.LampPost: {
        // An iron lantern on a post: cold black metal by day, a warm
        // caged flame after dark (the light itself lives in the
        // lightmap + glow passes — this is just the fixture).
        const syT = s * this.camera.yScale;
        return {
          sortY: ty + 0.8,
          body: stationBody(0.45, 1.85, 0.55),
          drawShadow: () => {
            const baseY = p.y + syT * 0.12;
            this.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.55);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const baseY = p.y + syT * 0.12;
            const lit = this.sky.flame;
            // Stone foot.
            ctx.fillStyle = '#5b5566';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY, s * 0.13, 6, 0.2, 0.6);
            ctx.fill();
            // The post, slightly tapered.
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.03, baseY - s * 1.32);
            ctx.lineTo(p.x - s * 0.03, baseY - s * 1.32);
            ctx.closePath();
            ctx.fill();
            // Lantern cage: chamfered glass box under a peaked cap.
            const ly = baseY - s * 1.52;
            const flick = 0.92 + Math.sin(performance.now() / 90 + tx * 2.3) * 0.05;
            ctx.fillStyle = lit > 0.05 ? `rgba(255, 205, 130, ${(0.45 + 0.55 * lit) * flick})` : '#7d84a0';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.11, ly, s * 0.22, s * 0.24, s * 0.03);
            ctx.fill();
            if (lit > 0.05) {
              // The flame core.
              ctx.fillStyle = `rgba(255, 244, 200, ${0.85 * lit * flick})`;
              ctx.beginPath();
              facetCircle(ctx, p.x, ly + s * 0.12, s * 0.05, 6, Math.PI / 6);
              ctx.fill();
            }
            // Cage bars + cap.
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - s * 0.02, ly, s * 0.04, s * 0.24);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.15, ly);
            ctx.lineTo(p.x + s * 0.15, ly);
            ctx.lineTo(p.x, ly - s * 0.12);
            ctx.closePath();
            ctx.fill();
          },
        };
      }

      case Tile.Fence:
      case Tile.FenceDiagNE:
      case Tile.FenceDiagNW:
        return this.fenceItem(tile, tx, ty, game);

      case Tile.FenceGate:
      case Tile.FenceGateShut:
        return this.fenceGateItem(tile, tx, ty, game);

      case Tile.Barrel: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.18;
        // Waist-high on the 1.15-tile body — a barrel you'd lean on.
        const wr = s * 0.28;
        const bh = s * 0.78;
        // Some barrels are rain butts — an open water top sells "used".
        const water = h % 3 === 0;
        return {
          sortY: ty + 0.7,
          body: stationBody(0.6, 1.0, 0.55),
          drawShadow: () => this.castBlob(p.x, baseY, 0.34, s * 0.24, h ^ 0x21),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade roots it to the floor.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY + s * 0.015, wr * 1.05, s * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            // Coopered trunk: straight-cut bulge, brutalist not round.
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            ctx.moveTo(p.x - wr * 0.8, baseY);
            ctx.lineTo(p.x - wr, baseY - bh * 0.32);
            ctx.lineTo(p.x - wr, baseY - bh * 0.68);
            ctx.lineTo(p.x - wr * 0.8, baseY - bh);
            ctx.lineTo(p.x + wr * 0.8, baseY - bh);
            ctx.lineTo(p.x + wr, baseY - bh * 0.68);
            ctx.lineTo(p.x + wr, baseY - bh * 0.32);
            ctx.lineTo(p.x + wr * 0.8, baseY);
            ctx.closePath();
            ctx.fill();
            // Stave seams; the west flank catches sun, the east falls
            // into shade — a turned form, not a flat card.
            ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
            ctx.fillRect(p.x - wr * 0.32, baseY - bh * 0.96, s * 0.03, bh * 0.94);
            ctx.fillRect(p.x + wr * 0.34, baseY - bh * 0.96, s * 0.03, bh * 0.94);
            ctx.fillStyle = shade('#7a552e', 14);
            ctx.fillRect(p.x - wr * 0.88, baseY - bh * 0.92, s * 0.06, bh * 0.84);
            ctx.fillStyle = shade('#7a552e', -12);
            ctx.fillRect(p.x + wr * 0.8, baseY - bh * 0.92, s * 0.06, bh * 0.84);
            // Iron bands, riveted, with a lit upper edge each.
            ctx.fillStyle = '#3a3444';
            ctx.fillRect(p.x - wr * 0.99, baseY - bh * 0.3, wr * 1.98, s * 0.06);
            ctx.fillRect(p.x - wr * 0.99, baseY - bh * 0.76, wr * 1.98, s * 0.06);
            ctx.fillStyle = '#565064';
            ctx.fillRect(p.x - wr * 0.99, baseY - bh * 0.3, wr * 1.98, s * 0.02);
            ctx.fillRect(p.x - wr * 0.99, baseY - bh * 0.76, wr * 1.98, s * 0.02);
            // Lid: lit rim over a shaded inset, or standing water.
            ctx.fillStyle = '#94693a';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY - bh, wr * 0.84, 6, 0.3, 0.55);
            ctx.fill();
            if (water) {
              ctx.fillStyle = '#3a629e';
              ctx.beginPath();
              facetCircle(ctx, p.x, baseY - bh, wr * 0.62, 6, 0.3, 0.55);
              ctx.fill();
              // A live glint drifts across the water.
              const gx2 = p.x - wr * 0.3 + ((t * 0.2 + h * 0.13) % 1) * wr * 0.5;
              ctx.fillStyle = 'rgba(214, 230, 255, 0.5)';
              ctx.fillRect(gx2, baseY - bh - s * 0.01, s * 0.07, s * 0.02);
            } else {
              ctx.fillStyle = shade('#94693a', -10);
              ctx.beginPath();
              facetCircle(ctx, p.x, baseY - bh + s * 0.015, wr * 0.6, 6, 0.3, 0.55);
              ctx.fill();
            }
          },
        };
      }

      case Tile.Crate:
      case Tile.CrateGoods: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.2;
        // Knee-to-thigh height, shoulder-wide — cargo, not a hatbox.
        const cw = s * 0.66;
        const chh = s * 0.56;
        const goods = tile === Tile.CrateGoods;
        return {
          sortY: ty + 0.7,
          body: stationBody(0.65, 1.05, 0.55),
          drawShadow: () => {
            this.castEdgeQuad(p.x - cw / 2, baseY, p.x + cw / 2, baseY, 0.55);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade under the box edge.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(p.x - cw / 2 - s * 0.02, baseY - s * 0.015, cw + s * 0.04, s * 0.05);
            // Front face: planks, corner posts, and a diagonal brace —
            // built joinery, with shaded east edge and lit west.
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(p.x - cw / 2, baseY - chh, cw, chh);
            ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
            ctx.fillRect(p.x - cw / 2, baseY - chh * 0.62, cw, s * 0.03);
            ctx.fillRect(p.x - cw / 2, baseY - chh * 0.28, cw, s * 0.03);
            ctx.save();
            ctx.beginPath();
            ctx.rect(p.x - cw / 2, baseY - chh, cw, chh);
            ctx.clip();
            ctx.translate(p.x, baseY - chh / 2);
            ctx.rotate(-0.5);
            ctx.fillRect(-cw, -s * 0.02, cw * 2, s * 0.04);
            ctx.restore();
            ctx.fillStyle = shade('#8a6534', 10);
            ctx.fillRect(p.x - cw / 2, baseY - chh, s * 0.055, chh);
            ctx.fillStyle = shade('#8a6534', -12);
            ctx.fillRect(p.x + cw / 2 - s * 0.055, baseY - chh, s * 0.055, chh);
            // Top: lit lid slab.
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            chamferRect(ctx, p.x - cw / 2 - s * 0.02, baseY - chh - syT * 0.32, cw + s * 0.04, syT * 0.32, s * 0.03);
            ctx.fill();
            ctx.fillStyle = shade('#a5793f', 14);
            ctx.fillRect(p.x - cw / 2, baseY - chh - s * 0.035, cw, s * 0.035);
            if (goods) {
              // Market produce heaped over the rim.
              const carrots = h % 2 === 0;
              for (let k = 0; k < 6; k++) {
                const hh = hashCoords(53 + k, tx, ty);
                const ox = p.x + ((hh % 100) / 100 - 0.5) * cw * 0.72;
                const oy = baseY - chh - syT * 0.2 - ((hh >> 7) % 40) / 100 * s * 0.12;
                if (carrots) {
                  ctx.fillStyle = hh & 1 ? '#d9772e' : '#c96a28';
                  ctx.beginPath();
                  ctx.moveTo(ox - s * 0.08, oy - s * 0.045);
                  ctx.lineTo(ox + s * 0.08, oy - s * 0.02);
                  ctx.lineTo(ox - s * 0.06, oy + s * 0.045);
                  ctx.closePath();
                  ctx.fill();
                } else {
                  ctx.fillStyle = hh & 1 ? '#b5493e' : '#a33d33';
                  ctx.beginPath();
                  facetCircle(ctx, ox, oy, s * 0.07, 6, (hh % 7) * 0.3);
                  ctx.fill();
                }
              }
            } else {
              // Stencil mark: a shipped crate, not a prop cube.
              ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
              ctx.fillRect(p.x - s * 0.09, baseY - chh * 0.36, s * 0.18, s * 0.035);
              ctx.fillRect(p.x - s * 0.06, baseY - chh * 0.24, s * 0.12, s * 0.035);
            }
          },
        };
      }

      case Tile.Stalagmite: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.18;
        // Drip-stone grows one bead at a time: every column rolls its
        // own height and lean off the world hash, torso-high beside
        // the body and always shorter than the wall mass around it.
        const ht = s * (0.92 + ((h >> 3) & 7) * 0.05); // 0.92..1.27
        const lean = (((h >> 9) & 7) / 7 - 0.5) * s * 0.16;
        const m = ((h >> 6) & 1) === 0 ? 1 : -1; // wet-flank side
        const bw = s * 0.3 * (0.92 + ((h >> 13) & 3) * 0.05);
        return {
          sortY: ty + 0.7,
          body: stationBody(0.55, 1.55, 0.5),
          drawShadow: () => this.castBlob(p.x, baseY, ht / s, s * 0.22, h ^ 0x2f),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade roots the column to the cave floor.
            ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY + s * 0.01, bw * 1.15, s * 0.085, 0, 0, Math.PI * 2);
            ctx.fill();
            // Stacked-bead silhouette: three ages of drip-stone, each
            // new bead starting a touch PROUD of the taper below it —
            // a stepped column, never a smooth traffic cone (and never
            // a snowman of circles). CaveWall palette family.
            const beads: Array<{ f0: number; f1: number; wb: number; wt: number; col: string }> = [
              { f0: 0, f1: 0.42, wb: 1, wt: 0.58, col: '#3a3444' },
              { f0: 0.42, f1: 0.74, wb: 0.76, wt: 0.42, col: '#4a4458' },
              { f0: 0.74, f1: 1, wb: 0.56, wt: 0.14, col: '#5a5370' },
            ];
            const wAt = (f: number): number => {
              const b = beads.find((bd) => f <= bd.f1) ?? beads[2]!;
              return bw * (b.wb + ((f - b.f0) / (b.f1 - b.f0)) * (b.wt - b.wb));
            };
            const xAt = (f: number): number => p.x + lean * f;
            for (let bi = 0; bi < beads.length; bi++) {
              const b = beads[bi]!;
              // Each flank carries one hash-jogged shoulder partway up
              // so the edges read grown, not machined.
              const hj = hashCoords(83 + bi, tx, ty);
              const fm = b.f0 + (b.f1 - b.f0) * (0.4 + ((hj >>> 3) % 30) / 100);
              const wm = bw * (b.wb + ((fm - b.f0) / (b.f1 - b.f0)) * (b.wt - b.wb));
              const jog = ((hj & 1) === 0 ? 1 : -1) * bw * 0.09;
              ctx.fillStyle = b.col;
              ctx.beginPath();
              ctx.moveTo(xAt(b.f0) - bw * b.wb, baseY - ht * b.f0);
              ctx.lineTo(xAt(fm) - wm - jog, baseY - ht * fm);
              ctx.lineTo(xAt(b.f1) - bw * b.wt, baseY - ht * b.f1);
              ctx.lineTo(xAt(b.f1) + bw * b.wt, baseY - ht * b.f1);
              ctx.lineTo(xAt(fm) + wm - jog * 0.5, baseY - ht * fm);
              ctx.lineTo(xAt(b.f0) + bw * b.wb, baseY - ht * b.f0);
              ctx.closePath();
              ctx.fill();
              // Drip lip where the bead beds on the taper below:
              // shadow tucked under the overhang, wet light on top.
              if (bi > 0) {
                ctx.fillStyle = 'rgba(14, 10, 22, 0.4)';
                ctx.fillRect(xAt(b.f0) - bw * b.wb, baseY - ht * b.f0, bw * b.wb * 2, Math.max(1, s * 0.032));
                ctx.fillStyle = 'rgba(186, 180, 212, 0.2)';
                ctx.fillRect(xAt(b.f0) - bw * b.wb * 0.85, baseY - ht * b.f0 - Math.max(1, s * 0.028), bw * b.wb * 1.7, Math.max(1, s * 0.028));
              }
            }
            // The blunt drip tip, still forming.
            ctx.fillStyle = '#655e7c';
            ctx.beginPath();
            facetCircle(ctx, xAt(1), baseY - ht, wAt(1) * 1.1, 6, 0.3, 0.6);
            ctx.fill();
            // Wet highlight: one flank still runs with seep water — a
            // narrow bright lane sliding the full height, hard-edged
            // like every other flat fill in the dialect.
            ctx.fillStyle = 'rgba(178, 196, 228, 0.2)';
            ctx.beginPath();
            ctx.moveTo(p.x + m * bw * 0.5, baseY - s * 0.04);
            ctx.lineTo(p.x + m * bw * 0.72, baseY - ht * 0.3);
            ctx.lineTo(xAt(0.92) + m * wAt(0.92) * 0.5, baseY - ht * 0.92);
            ctx.lineTo(xAt(0.92) + m * wAt(0.92) * 0.1, baseY - ht * 0.92);
            ctx.lineTo(p.x + m * bw * 0.4, baseY - ht * 0.3);
            ctx.lineTo(p.x + m * bw * 0.24, baseY - s * 0.04);
            ctx.closePath();
            ctx.fill();
            // A drip bead catching what light the cave has.
            if (((h >> 15) & 3) !== 3) {
              ctx.fillStyle = 'rgba(214, 226, 248, 0.5)';
              ctx.beginPath();
              ctx.ellipse(p.x + m * bw * 0.55, baseY - ht * 0.5, s * 0.018, s * 0.026, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            // Shade flank opposite the wet lane — a turned form.
            ctx.fillStyle = 'rgba(20, 14, 30, 0.22)';
            ctx.beginPath();
            ctx.moveTo(p.x - m * bw * 0.95, baseY);
            ctx.lineTo(xAt(0.85) - m * wAt(0.85), baseY - ht * 0.85);
            ctx.lineTo(xAt(0.85) - m * wAt(0.85) * 0.55, baseY - ht * 0.85);
            ctx.lineTo(p.x - m * bw * 0.6, baseY);
            ctx.closePath();
            ctx.fill();
            // Parting shadow where stone meets floor (grounding law).
            ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
            ctx.fillRect(p.x - bw * 0.8, baseY - Math.max(1.5, s * 0.03), bw * 1.6, Math.max(1.5, s * 0.03));
          },
        };
      }

      case Tile.BonePile: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.2;
        // Kickable clutter: a knee-high heap in the barrel/crate mass
        // language — long-bones thrown criss-cross under a skull dome,
        // every pile scattered differently by its hash.
        const m = ((h >> 4) & 1) === 0 ? 1 : -1;
        return {
          sortY: ty + 0.7,
          body: stationBody(0.65, 0.75, 0.5),
          drawShadow: () => this.castBlob(p.x, baseY, 0.22, s * 0.26, h ^ 0x53),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade under the heap.
            ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY, s * 0.42, s * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();
            // The under-heap: a low mound of older, duller bone the
            // fresh pieces lie on — mass first, detail on top.
            ctx.fillStyle = '#8b8272';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY - s * 0.06, s * 0.36, s * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
            // One long-bone: shaft plus two knuckle ends, laid flat.
            const bone = (cx: number, cy: number, len: number, ang: number, col: string): void => {
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(ang);
              ctx.fillStyle = col;
              ctx.fillRect(-len / 2, -s * 0.032, len, s * 0.064);
              ctx.beginPath();
              ctx.ellipse(-len / 2, 0, s * 0.052, s * 0.045, 0, 0, Math.PI * 2);
              ctx.ellipse(len / 2, 0, s * 0.052, s * 0.045, 0, 0, Math.PI * 2);
              ctx.fill();
              // Shaft shadow line keeps it a cylinder, not a stripe.
              ctx.fillStyle = 'rgba(90, 82, 66, 0.4)';
              ctx.fillRect(-len / 2 + s * 0.02, s * 0.008, len - s * 0.04, s * 0.02);
              ctx.restore();
            };
            // Three to four bones dealt by hash, criss-crossed low.
            const nB = 3 + ((h >> 7) & 1);
            for (let k = 0; k < nB; k++) {
              const hb = hashCoords(59 + k, tx, ty);
              const bx = p.x + (((hb % 100) / 100 - 0.5) * s * 0.5) * m;
              const by = baseY - s * 0.05 - ((hb >>> 8) % 12) / 100 * s;
              const ang = (((hb >>> 5) % 100) / 100 - 0.5) * 1.1;
              bone(bx, by, s * (0.3 + ((hb >>> 11) % 20) / 100), ang, (hb & 1) === 0 ? '#cfc7ae' : '#c2b99d');
            }
            // The skull: a dome with a hard brow, two socket voids and
            // a broken jaw line — sits ON the heap, hash picks a side.
            const sx = p.x + m * s * (0.1 + ((h >> 10) & 3) * 0.03);
            const sy = baseY - s * 0.16;
            ctx.fillStyle = '#cfc7ae';
            ctx.beginPath();
            facetCircle(ctx, sx, sy, s * 0.13, 6, 0.4, 0.85);
            ctx.fill();
            ctx.fillStyle = '#ddd6c0';
            ctx.beginPath();
            facetCircle(ctx, sx - s * 0.02, sy - s * 0.03, s * 0.095, 6, 0.4, 0.8);
            ctx.fill();
            // Sockets stare wherever the hash left them facing.
            ctx.fillStyle = '#241a2e';
            ctx.beginPath();
            ctx.ellipse(sx - m * s * 0.055, sy + s * 0.005, s * 0.028, s * 0.034, 0, 0, Math.PI * 2);
            ctx.ellipse(sx + m * s * 0.015, sy + s * 0.005, s * 0.028, s * 0.034, 0, 0, Math.PI * 2);
            ctx.fill();
            // Nasal notch + tooth row under the dome.
            ctx.fillRect(sx - m * s * 0.02 - s * 0.011, sy + s * 0.05, s * 0.022, s * 0.03);
            ctx.fillStyle = '#b5ac91';
            ctx.fillRect(sx - s * 0.075, sy + s * 0.095, s * 0.15, s * 0.028);
            ctx.fillStyle = 'rgba(36, 26, 46, 0.5)';
            for (const fx of [-0.045, -0.005, 0.035]) {
              ctx.fillRect(sx + fx * s, sy + s * 0.095, Math.max(1, s * 0.012), s * 0.028);
            }
            // A rib arc leaning out of the heap when the hash allows.
            if (((h >> 12) & 3) !== 0) {
              ctx.strokeStyle = '#c2b99d';
              ctx.lineWidth = Math.max(1.5, s * 0.04);
              ctx.beginPath();
              ctx.arc(p.x - m * s * 0.24, baseY - s * 0.02, s * 0.15, Math.PI * 1.05, Math.PI * 1.75);
              ctx.stroke();
            }
            // Bone chips scattered at the skirt.
            this.rubble(p.x, p.y - s * 0.12, s * 0.8, h ^ 0x77, ['#cfc7ae', '#8b8272', '#b5ac91']);
          },
        };
      }

      case Tile.Brazier: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.18;
        // An iron fire-basket at the waist: three splayed legs under a
        // riveted bowl, coals banked in an open top. The painted flame
        // is the fixture's own story — its BLOOM lives in the light
        // passes (collectStaticLights), never queued here.
        const rimY = baseY - s * 0.72;
        const rw = s * 0.3; // rim half-width
        return {
          sortY: ty + 0.7,
          body: stationBody(0.6, 1.35, 0.5),
          drawShadow: () => this.castBlob(p.x, baseY, 0.5, s * 0.2, h ^ 0x35),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const lit = this.sky.flame;
            const flick = 0.9 + Math.sin(t * 9 + h) * 0.07 + Math.sin(t * 21 + h * 3) * 0.04;
            // Contact shade under the leg stance.
            ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            // Three splayed legs: two forward, one behind the bowl —
            // wrought iron with clawed feet.
            ctx.fillStyle = '#211c2b';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.035, baseY - s * 0.5);
            ctx.lineTo(p.x + s * 0.035, baseY - s * 0.5);
            ctx.lineTo(p.x + s * 0.02, baseY - s * 0.26);
            ctx.lineTo(p.x - s * 0.02, baseY - s * 0.26);
            ctx.closePath();
            ctx.fill();
            for (const lm of [-1, 1]) {
              ctx.fillStyle = '#2c2836';
              ctx.beginPath();
              ctx.moveTo(p.x + lm * s * 0.1, baseY - s * 0.46);
              ctx.lineTo(p.x + lm * s * 0.17, baseY - s * 0.46);
              ctx.lineTo(p.x + lm * s * 0.3, baseY - s * 0.02);
              ctx.lineTo(p.x + lm * s * 0.22, baseY - s * 0.02);
              ctx.closePath();
              ctx.fill();
              // Claw foot pad.
              ctx.fillStyle = '#211c2b';
              ctx.fillRect(p.x + lm * s * 0.22 - (lm < 0 ? s * 0.03 : 0), baseY - s * 0.035, s * 0.11, s * 0.035);
            }
            // The basket: a flaring iron bowl with a riveted mid-band.
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            ctx.moveTo(p.x - rw, rimY);
            ctx.lineTo(p.x + rw, rimY);
            ctx.lineTo(p.x + rw * 0.62, baseY - s * 0.4);
            ctx.lineTo(p.x - rw * 0.62, baseY - s * 0.4);
            ctx.closePath();
            ctx.fill();
            // West flank catches what light there is; east falls off.
            ctx.fillStyle = shade('#2c2836', 12);
            ctx.beginPath();
            ctx.moveTo(p.x - rw, rimY);
            ctx.lineTo(p.x - rw * 0.72, rimY);
            ctx.lineTo(p.x - rw * 0.46, baseY - s * 0.4);
            ctx.lineTo(p.x - rw * 0.62, baseY - s * 0.4);
            ctx.closePath();
            ctx.fill();
            // Riveted band around the bowl's waist.
            ctx.fillStyle = '#3a3444';
            ctx.fillRect(p.x - rw * 0.86, rimY + s * 0.13, rw * 1.72, s * 0.05);
            ctx.fillStyle = '#565064';
            for (const fx of [-0.6, -0.2, 0.2, 0.6]) {
              ctx.fillRect(p.x + fx * rw - s * 0.014, rimY + s * 0.142, s * 0.028, s * 0.028);
            }
            // THE TOP PLANE (2.5D law): the basket mouth is a
            // foreshortened ellipse — dark iron rim, coal bed sunk in.
            ctx.fillStyle = '#3a3444';
            ctx.beginPath();
            ctx.ellipse(p.x, rimY, rw, s * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade('#3a3444', 14);
            ctx.beginPath();
            ctx.ellipse(p.x, rimY - s * 0.012, rw * 0.96, s * 0.12, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Coals: banked embers glowing from the bed. Cold iron
            // holds char-dark lumps when the flame gate is shut.
            ctx.fillStyle = lit > 0.05 ? '#7c3018' : '#241f2e';
            ctx.beginPath();
            ctx.ellipse(p.x, rimY + s * 0.01, rw * 0.74, s * 0.095, 0, 0, Math.PI * 2);
            ctx.fill();
            for (let k = 0; k < 4; k++) {
              const hc = hashCoords(67 + k, tx, ty);
              const cx = p.x + (((hc % 100) / 100 - 0.5) * rw * 1.1);
              const cy = rimY + s * 0.005 - ((hc >>> 6) % 8) / 100 * s;
              ctx.fillStyle =
                lit > 0.05
                  ? (hc & 1) === 0
                    ? `rgba(232, 147, 60, ${0.75 + 0.25 * flick})`
                    : `rgba(255, 180, 90, ${0.6 + 0.35 * flick})`
                  : (hc & 1) === 0
                    ? '#38313f'
                    : '#463d50';
              ctx.beginPath();
              facetCircle(ctx, cx, cy, s * (0.036 + ((hc >>> 9) % 4) * 0.007), 6, hc * 0.3);
              ctx.fill();
            }
            if (lit > 0.05) {
              // Small painted flame licks standing off the coal bed —
              // static art; cadence sampling gives them their shimmer,
              // and the live glow pass carries the actual light.
              const lick = (cx: number, hgt: number, ph: number): void => {
                const sway = Math.sin(t * 7 + ph) * s * 0.02;
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.045, rimY);
                ctx.quadraticCurveTo(cx - s * 0.03, rimY - hgt * 0.55, cx + sway, rimY - hgt);
                ctx.quadraticCurveTo(cx + s * 0.035, rimY - hgt * 0.5, cx + s * 0.045, rimY);
                ctx.closePath();
                ctx.fill();
              };
              ctx.fillStyle = `rgba(232, 120, 44, ${0.75 * flick})`;
              lick(p.x - s * 0.09, s * 0.26 * flick, h * 0.7);
              lick(p.x + s * 0.1, s * 0.2 * flick, h * 1.3);
              ctx.fillStyle = `rgba(255, 196, 96, ${0.85 * flick})`;
              lick(p.x + s * 0.01, s * 0.32 * flick, h * 0.4);
              ctx.fillStyle = `rgba(255, 240, 190, ${0.8 * flick})`;
              lick(p.x, s * 0.16 * flick, h);
            }
            // Rim front lip reads over the flame roots.
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            ctx.ellipse(p.x, rimY, rw, s * 0.13, 0, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = 'rgba(20, 14, 28, 0.4)';
            ctx.beginPath();
            ctx.ellipse(p.x, rimY + s * 0.02, rw * 0.8, s * 0.08, 0, 0, Math.PI);
            ctx.fill();
          },
        };
      }

      case Tile.GlowShroom: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.2;
        // A shin-high cluster of cave shrooms: teal caps on pale stems,
        // three to five heads dealt by hash. The painted under-glow is
        // a whisper — the live teal light pass does the real work.
        const nS = 3 + (h % 3);
        return {
          sortY: ty + 0.7,
          body: stationBody(0.55, 0.75, 0.5),
          drawShadow: () => this.castContact(p.x, baseY, s * 0.24, s * 0.09),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Static under-glow disc on the floor (subtle by law).
            ctx.fillStyle = 'rgba(110, 225, 200, 0.09)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY, s * 0.44, s * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(143, 224, 207, 0.08)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY, s * 0.28, s * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Deal the cluster back-to-front so caps overlap honestly.
            const heads: Array<[number, number, number, number]> = [];
            for (let k = 0; k < nS; k++) {
              const hs2 = hashCoords(71 + k, tx, ty);
              const ox = (((hs2 % 100) / 100 - 0.5) * s * 0.52);
              const oy = (((hs2 >>> 7) % 40) / 100 - 0.2) * s * 0.3;
              const hgt = s * (0.16 + ((hs2 >>> 11) % 20) / 100); // 0.16..0.36
              heads.push([p.x + ox, baseY + oy, hgt, hs2]);
            }
            heads.sort((a, b) => a[1] - b[1]);
            for (const [cx, cy, hgt, hs2] of heads) {
              const cr = hgt * (0.62 + ((hs2 >>> 4) % 3) * 0.08); // cap radius
              const tilt = (((hs2 >>> 9) % 100) / 100 - 0.5) * 0.16;
              // Stem: pale, slightly leaned, rooted with contact shade.
              ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
              ctx.beginPath();
              ctx.ellipse(cx, cy + s * 0.008, cr * 0.55, s * 0.03, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = (hs2 & 1) === 0 ? '#c8d4cd' : '#bcc9c4';
              ctx.beginPath();
              ctx.moveTo(cx - hgt * 0.14, cy);
              ctx.lineTo(cx + hgt * 0.14, cy);
              ctx.lineTo(cx + hgt * 0.1 + tilt * hgt, cy - hgt * 0.72);
              ctx.lineTo(cx - hgt * 0.1 + tilt * hgt, cy - hgt * 0.72);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = 'rgba(90, 106, 100, 0.35)';
              ctx.fillRect(cx + hgt * 0.03, cy - hgt * 0.66, Math.max(1, hgt * 0.06), hgt * 0.6);
              // Cap: a teal dome with a dark gill line under the brim
              // and a paler crown — the thing that actually glows.
              const capY = cy - hgt * 0.7;
              ctx.fillStyle = 'rgba(24, 42, 40, 0.6)';
              ctx.beginPath();
              ctx.ellipse(cx + tilt * hgt, capY + hgt * 0.03, cr, hgt * 0.16, tilt, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#8fe0cf';
              ctx.beginPath();
              ctx.ellipse(cx + tilt * hgt, capY - hgt * 0.1, cr, hgt * 0.3, tilt, Math.PI, Math.PI * 2);
              ctx.ellipse(cx + tilt * hgt, capY, cr, hgt * 0.14, tilt, 0, Math.PI);
              ctx.fill();
              ctx.fillStyle = '#b4f0e2';
              ctx.beginPath();
              ctx.ellipse(cx + tilt * hgt - cr * 0.2, capY - hgt * 0.16, cr * 0.5, hgt * 0.14, tilt, Math.PI, Math.PI * 2);
              ctx.fill();
              // Spore freckles on the bigger caps.
              if (cr > s * 0.13) {
                ctx.fillStyle = '#d8f8ee';
                ctx.beginPath();
                ctx.ellipse(cx + tilt * hgt + cr * 0.4, capY - hgt * 0.08, s * 0.016, s * 0.012, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + tilt * hgt - cr * 0.45, capY - hgt * 0.04, s * 0.013, s * 0.01, 0, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          },
        };
      }

      case Tile.Table: {
        const syT = s * this.camera.yScale;
        const isRun = (t2: number | undefined) => t2 === Tile.Table;
        const jn = isRun(game.world.groundAt(tx, ty - 1));
        const je = isRun(game.world.groundAt(tx + 1, ty));
        const js = isRun(game.world.groundAt(tx, ty + 1));
        const jw = isRun(game.world.groundAt(tx - 1, ty));
        // A dining board just under the waist; adjacent tiles merge so
        // a hall's long table reads as ONE built piece of furniture.
        // The top is a deeper honey than the floorboards — furniture
        // must separate from the floor it stands on.
        const th = s * 0.52;
        const topC = '#9c7040';
        const legC = '#6f4d26';
        const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.09);
        const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.09);
        const yT = p.y - syT * 0.5 + (jn ? -0.5 : syT * 0.12);
        const yB = p.y + syT * 0.5 + (js ? 0.5 : -syT * 0.1);
        return {
          sortY: ty + 0.72,
          body: jn || je || js || jw ? undefined : stationBody(0.85, 1.1, 0.5),
          drawShadow: js
            ? undefined
            : () => this.castEdgeQuad(xL, yB + syT * 0.08, xR, yB + syT * 0.08, 0.4),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const lh = th + syT * 0.05;
            // A trestle leg: tapered post flaring into a splayed foot
            // with a shaded pad — carpentry, not table-shaped sticks.
            const leg = (lx: number, ly: number, hgt: number) => {
              ctx.fillStyle = legC;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.038, ly - hgt);
              ctx.lineTo(lx + s * 0.038, ly - hgt);
              ctx.lineTo(lx + s * 0.028, ly - s * 0.06);
              ctx.lineTo(lx + s * 0.052, ly);
              ctx.lineTo(lx - s * 0.052, ly);
              ctx.lineTo(lx - s * 0.028, ly - s * 0.06);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = shade(legC, -14);
              ctx.fillRect(lx - s * 0.052, ly - s * 0.02, s * 0.104, s * 0.02);
            };
            // Contact shade under the standing edge.
            if (!js) {
              ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
              ctx.fillRect(xL + s * 0.01, yB + s * 0.005, xR - xL - s * 0.02, s * 0.04);
            }
            if (!jw) {
              leg(xL + s * 0.06, yB, lh);
              if (!jn) leg(xL + s * 0.06, yT + syT * 0.16, lh * 0.92);
            }
            if (!je) {
              leg(xR - s * 0.06, yB, lh);
              if (!jn) leg(xR - s * 0.06, yT + syT * 0.16, lh * 0.92);
            }
            // A low stretcher ties a lone table's trestles together.
            if (!jw && !je) {
              ctx.fillStyle = shade(legC, -8);
              ctx.fillRect(xL + s * 0.09, yB - th * 0.42, xR - xL - s * 0.18, s * 0.045);
            }
            // Pegged apron under the front rim.
            if (!js) {
              ctx.fillStyle = shade(legC, -4);
              ctx.fillRect(xL, yB - th, xR - xL, s * 0.09);
              ctx.fillStyle = 'rgba(36, 22, 10, 0.5)';
              ctx.fillRect(xL + s * 0.14, yB - th + s * 0.032, s * 0.025, s * 0.025);
              ctx.fillRect(xR - s * 0.165, yB - th + s * 0.032, s * 0.025, s * 0.025);
            }
            // The top: one long slab, grounded by a dark rim so it
            // never melts into same-lumber floorboards (the ore law:
            // masses get a grounding outline or they vanish).
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL - s * 0.02, yT - th, xR - xL + s * 0.04, yB - yT, [
              jn || jw ? 0 : s * 0.05,
              jn || je ? 0 : s * 0.05,
              js || je ? 0 : s * 0.05,
              js || jw ? 0 : s * 0.05,
            ]);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            // ...built of long boards: two seams run with the grain,
            // and free ends wear a breadboard cap across it.
            const seamL = xL + (jw ? 0 : s * 0.1);
            const seamR = xR - (je ? 0 : s * 0.1);
            ctx.fillStyle = 'rgba(36, 22, 10, 0.2)';
            for (const fy of [0.36, 0.68] as const) {
              ctx.fillRect(seamL, yT - th + (yB - yT) * fy, seamR - seamL, s * 0.018);
            }
            if (!jw) {
              ctx.fillStyle = shade(topC, -6);
              ctx.fillRect(xL - s * 0.02, yT - th, s * 0.1, yB - yT);
              ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
              ctx.fillRect(xL + s * 0.08, yT - th + s * 0.02, s * 0.018, yB - yT - s * 0.04);
            }
            if (!je) {
              ctx.fillStyle = shade(topC, -6);
              ctx.fillRect(xR - s * 0.08, yT - th, s * 0.1, yB - yT);
              ctx.fillStyle = 'rgba(36, 22, 10, 0.3)';
              ctx.fillRect(xR - s * 0.098, yT - th + s * 0.02, s * 0.018, yB - yT - s * 0.04);
            }
            // Faint grain streaks, hash-strewn so no two boards match.
            ctx.fillStyle = 'rgba(36, 22, 10, 0.12)';
            for (let k = 0; k < 3; k++) {
              const hh = hashCoords(67 + k, tx, ty);
              const gy2 = yT - th + (0.12 + ((hh >> 3) % 70) / 100) * (yB - yT);
              ctx.fillRect(p.x - s * 0.36 + ((hh % 40) / 100) * s, gy2, s * (0.12 + (hh % 3) * 0.05), s * 0.014);
            }
            // Lit south lip carries the slab's thickness; the far edge
            // falls away into shade.
            if (!js) {
              ctx.fillStyle = shade(topC, 14);
              ctx.fillRect(xL - s * 0.02, yB - th - s * 0.045, xR - xL + s * 0.04, s * 0.045);
            }
            if (!jn) {
              ctx.fillStyle = shade(topC, -8);
              ctx.fillRect(xL - s * 0.02, yT - th, xR - xL + s * 0.04, s * 0.03);
            }
            // What's ON the table — hash-dealt per tile, so a long inn
            // board is set with different life at every seat. Candles
            // roll separately: about a third of tables keep one, so
            // evening halls always have flames on the boards.
            const cx = p.x + ((((h >> 5) % 24) - 12) / 100) * s;
            const cy = p.y - th + ((((h >> 8) % 20) - 10) / 100) * syT;
            const dress = h % 4;
            if ((h >> 11) % 3 === 0) {
              // A brass candlestick — the keeper lights it at dusk.
              const ccx = p.x + (h & 1 ? s * 0.29 : -s * 0.29);
              const ccy = p.y - th + (h & 2 ? syT * 0.12 : -syT * 0.12);
              const lit = this.sky.flame;
              ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
              ctx.beginPath();
              ctx.ellipse(ccx, ccy + s * 0.015, s * 0.075, s * 0.028, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#c9962e';
              ctx.beginPath();
              facetCircle(ctx, ccx, ccy, s * 0.065, 6, 0.3, 0.5);
              ctx.fill();
              ctx.fillStyle = shade('#c9962e', -14);
              ctx.fillRect(ccx - s * 0.02, ccy - s * 0.035, s * 0.04, s * 0.035);
              ctx.fillStyle = '#e8dfc8';
              ctx.fillRect(ccx - s * 0.024, ccy - s * 0.15, s * 0.048, s * 0.12);
              ctx.fillStyle = shade('#e8dfc8', -12);
              ctx.fillRect(ccx + s * 0.006, ccy - s * 0.15, s * 0.018, s * 0.12);
              // A wax drip run down the shoulder.
              ctx.fillStyle = '#f4efe0';
              ctx.fillRect(ccx - s * 0.032, ccy - s * 0.13, s * 0.014, s * 0.05);
              if (lit > 0.05) {
                const flick = 0.85 + Math.sin(t * 11 + h) * 0.12 + Math.sin(t * 23 + h * 3) * 0.05;
                ctx.fillStyle = `rgba(255, 205, 120, ${Math.min(1, 0.95 * lit * flick)})`;
                ctx.beginPath();
                ctx.moveTo(ccx, ccy - s * 0.15);
                ctx.quadraticCurveTo(ccx - s * 0.042, ccy - s * 0.21, ccx, ccy - s * (0.3 + 0.025 * flick));
                ctx.quadraticCurveTo(ccx + s * 0.042, ccy - s * 0.21, ccx, ccy - s * 0.15);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 246, 214, ${Math.min(1, 0.9 * lit * flick)})`;
                ctx.beginPath();
                facetCircle(ctx, ccx, ccy - s * 0.195, s * 0.022, 6, 0.4);
                ctx.fill();
                // No queueGlow here: this paint runs only on re-bake
                // frames (Table is a run-ring baked prop), so a glow
                // queued from it strobes at cadence rate. The candle's
                // bloom lives in collectStaticLights — the live pass.
              } else {
                // Daylight: a cold black wick.
                ctx.fillStyle = '#2c2836';
                ctx.fillRect(ccx - s * 0.005, ccy - s * 0.178, s * 0.01, s * 0.03);
              }
            }
            if (dress === 0) {
              // Stoneware left mid-conversation: a jug and a cup.
              ctx.fillStyle = '#7d84a0';
              ctx.beginPath();
              chamferRect(ctx, cx - s * 0.14, cy - s * 0.17, s * 0.11, s * 0.16, [s * 0.025, s * 0.025, 0, 0]);
              ctx.fill();
              ctx.fillStyle = shade('#7d84a0', 12);
              ctx.fillRect(cx - s * 0.14, cy - s * 0.17, s * 0.035, s * 0.16);
              ctx.fillStyle = shade('#7d84a0', -16);
              ctx.fillRect(cx - s * 0.125, cy - s * 0.185, s * 0.08, s * 0.03);
              ctx.fillStyle = '#96746a';
              ctx.fillRect(cx + s * 0.03, cy - s * 0.1, s * 0.075, s * 0.09);
              ctx.fillStyle = shade('#96746a', -14);
              ctx.fillRect(cx + s * 0.03, cy - s * 0.1, s * 0.075, s * 0.02);
            } else if (dress === 1) {
              // A turned wooden bowl; some nights it still holds fruit.
              ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
              ctx.beginPath();
              ctx.ellipse(cx, cy + s * 0.01, s * 0.13, s * 0.04, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#8a6534';
              ctx.beginPath();
              facetCircle(ctx, cx, cy - s * 0.035, s * 0.13, 7, 0.2, 0.55);
              ctx.fill();
              ctx.fillStyle = '#5e3f1e';
              ctx.beginPath();
              facetCircle(ctx, cx, cy - s * 0.04, s * 0.095, 7, 0.2, 0.55);
              ctx.fill();
              if ((h >> 6) & 1) {
                for (const [ox, oy, tone] of [
                  [-0.045, -0.055, '#b5493e'],
                  [0.04, -0.05, '#a33d33'],
                  [0, -0.085, '#c96a28'],
                ] as const) {
                  ctx.fillStyle = tone;
                  ctx.beginPath();
                  facetCircle(ctx, cx + ox * s, cy + oy * s, s * 0.042, 6, 0.4);
                  ctx.fill();
                }
              }
            } else if (dress === 2) {
              // A good cloth runner laid across the boards.
              ctx.fillStyle = '#8a3d3d';
              ctx.fillRect(cx - s * 0.3, cy - syT * 0.16, s * 0.6, syT * 0.32);
              ctx.fillStyle = shade('#8a3d3d', -12);
              ctx.fillRect(cx - s * 0.3, cy + syT * 0.1, s * 0.6, s * 0.03);
              ctx.fillStyle = shade('#8a3d3d', 8);
              ctx.fillRect(cx - s * 0.3, cy - syT * 0.16, s * 0.6, s * 0.022);
              // End fringe ticks.
              ctx.fillStyle = '#d8c9a0';
              for (let k = 0; k < 4; k++) {
                const fy2 = cy - syT * 0.13 + k * syT * 0.075;
                ctx.fillRect(cx - s * 0.34, fy2, s * 0.04, s * 0.02);
                ctx.fillRect(cx + s * 0.3, fy2, s * 0.04, s * 0.02);
              }
            }
          },
        };
      }

      case Tile.Counter: {
        const syT = s * this.camera.yScale;
        const isRun = (t2: number | undefined) => t2 === Tile.Counter;
        const jn = isRun(game.world.groundAt(tx, ty - 1));
        const je = isRun(game.world.groundAt(tx + 1, ty));
        const js = isRun(game.world.groundAt(tx, ty + 1));
        const jw = isRun(game.world.groundAt(tx - 1, ty));
        // Waist-high service joinery from the ShopCounter's family:
        // dark plinth, recessed panels, a bright overhung slab.
        const th = s * 0.82;
        const bodyC = '#5e3f1e';
        const topC = '#a5793f';
        const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.09);
        const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.09);
        const yT = p.y - syT * 0.5 + (jn ? -0.5 : syT * 0.12);
        const yB = p.y + syT * 0.5 + (js ? 0.5 : -syT * 0.1);
        return {
          sortY: ty + 0.72,
          body: jn || je || js || jw ? undefined : stationBody(0.85, 1.4, 0.5),
          drawShadow: js
            ? undefined
            : () => this.castEdgeQuad(xL, yB + syT * 0.08, xR, yB + syT * 0.08, 0.55),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            if (!js) {
              // Contact shade, then the south face's joinery stack.
              ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
              ctx.fillRect(xL, yB + s * 0.012, xR - xL, s * 0.045);
              ctx.fillStyle = '#4a3116';
              ctx.fillRect(xL, yB - s * 0.09, xR - xL, s * 0.09 + syT * 0.08);
              ctx.fillStyle = bodyC;
              ctx.fillRect(xL, yB - th, xR - xL, th - s * 0.09);
              // Two shallow recessed panels per tile keep the run's
              // rhythm — set in, never so deep they read as openings.
              const panL = p.x - s * 0.32 + (jw ? 0 : s * 0.045);
              const panR = p.x + s * 0.32 - (je ? 0 : s * 0.045);
              const panW = (panR - panL - s * 0.07) / 2;
              for (const px2 of [panL, panL + panW + s * 0.07] as const) {
                ctx.fillStyle = shade(bodyC, -9);
                ctx.fillRect(px2, yB - th + s * 0.16, panW, th - s * 0.46);
                ctx.fillStyle = shade(bodyC, 9);
                ctx.fillRect(px2, yB - th + s * 0.16, panW, s * 0.022);
                ctx.fillStyle = 'rgba(36, 22, 10, 0.28)';
                ctx.fillRect(px2, yB - s * 0.32, panW, s * 0.02);
              }
              // A brass foot rail on brackets — patrons rest a boot on
              // it and it wears bright.
              ctx.fillStyle = '#8a6534';
              ctx.fillRect(xL + s * 0.05, yB - s * 0.17, s * 0.03, s * 0.1);
              ctx.fillRect(xR - s * 0.08, yB - s * 0.17, s * 0.03, s * 0.1);
              ctx.fillStyle = '#c9962e';
              ctx.fillRect(xL + s * 0.02, yB - s * 0.185, xR - xL - s * 0.04, s * 0.035);
              ctx.fillStyle = shade('#c9962e', 18);
              ctx.fillRect(xL + s * 0.02, yB - s * 0.185, xR - xL - s * 0.04, s * 0.014);
            }
            // Free ends close with a lit west / shaded east stile.
            if (!jw) {
              ctx.fillStyle = shade(bodyC, 8);
              ctx.fillRect(xL, yB - th, s * 0.05, th);
            }
            if (!je) {
              ctx.fillStyle = shade(bodyC, -14);
              ctx.fillRect(xR - s * 0.05, yB - th, s * 0.05, th);
            }
            // The slab overhangs its casework all round, rimmed dark
            // so it reads over floorboards.
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL - s * 0.035, yT - th, xR - xL + s * 0.07, yB - yT, [
              jn || jw ? 0 : s * 0.05,
              jn || je ? 0 : s * 0.05,
              js || je ? 0 : s * 0.05,
              js || jw ? 0 : s * 0.05,
            ]);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            // A board seam runs the slab's length.
            ctx.fillStyle = 'rgba(36, 22, 10, 0.18)';
            ctx.fillRect(
              xL + (jw ? 0 : s * 0.05),
              yT - th + (yB - yT) * 0.52,
              xR - xL - (jw ? 0 : s * 0.05) - (je ? 0 : s * 0.05),
              s * 0.018,
            );
            if (!js) {
              ctx.fillStyle = shade(topC, 14);
              ctx.fillRect(xL - s * 0.035, yB - th - s * 0.045, xR - xL + s * 0.07, s * 0.045);
            }
            if (!jn) {
              // Back-edge shading: the keeper's side falls away.
              ctx.fillStyle = shade(topC, -8);
              ctx.fillRect(xL - s * 0.035, yT - th, xR - xL + s * 0.07, s * 0.035);
            }
            // Barwork on top, dealt per tile: a folded service cloth
            // under a pewter tankard, stray mugs, or wiped clean.
            const cx = p.x + ((((h >> 6) % 28) - 14) / 100) * s;
            const cy = p.y - th + ((((h >> 9) % 20) - 10) / 100) * syT;
            const dress = h % 3;
            if (dress === 0) {
              ctx.fillStyle = '#e8dfc8';
              ctx.beginPath();
              chamferRect(ctx, cx - s * 0.16, cy - s * 0.05, s * 0.24, s * 0.1, s * 0.02);
              ctx.fill();
              ctx.fillStyle = shade('#e8dfc8', -10);
              ctx.fillRect(cx - s * 0.16, cy - s * 0.005, s * 0.24, s * 0.045);
              const mx = cx + s * 0.14;
              ctx.fillStyle = '#6a6577';
              ctx.fillRect(mx - s * 0.045, cy - s * 0.15, s * 0.09, s * 0.13);
              ctx.fillStyle = shade('#6a6577', 12);
              ctx.fillRect(mx - s * 0.045, cy - s * 0.15, s * 0.03, s * 0.13);
              ctx.fillStyle = shade('#6a6577', -16);
              ctx.fillRect(mx - s * 0.045, cy - s * 0.155, s * 0.09, s * 0.022);
              ctx.strokeStyle = '#6a6577';
              ctx.lineWidth = Math.max(1, s * 0.022);
              ctx.beginPath();
              ctx.arc(mx + s * 0.055, cy - s * 0.085, s * 0.035, -Math.PI / 2, Math.PI / 2);
              ctx.stroke();
            } else if (dress === 1) {
              // Two stoneware mugs left by the last pair of patrons.
              for (const [ox, tone] of [
                [-0.07, '#7d84a0'],
                [0.06, '#96746a'],
              ] as const) {
                ctx.fillStyle = tone;
                ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.11, s * 0.076, s * 0.1);
                ctx.fillStyle = shade(tone, -14);
                ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.11, s * 0.076, s * 0.02);
                ctx.fillStyle = shade(tone, 10);
                ctx.fillRect(cx + ox * s - s * 0.038, cy - s * 0.09, s * 0.022, s * 0.08);
              }
            }
          },
        };
      }

      case Tile.Bench: {
        const syT = s * this.camera.yScale;
        const isRun = (t2: number | undefined) => t2 === Tile.Bench;
        const je = isRun(game.world.groundAt(tx + 1, ty));
        const jw = isRun(game.world.groundAt(tx - 1, ty));
        // Knee height — a seat, not a curb.
        const th = s * 0.38;
        const seatC = '#94693a';
        const legC = '#6f4d26';
        const xL = p.x - s * 0.5 + (jw ? -0.5 : s * 0.12);
        const xR = p.x + s * 0.5 + (je ? 0.5 : -s * 0.12);
        const yB = p.y + syT * 0.22;
        return {
          sortY: ty + 0.68,
          body: je || jw ? undefined : stationBody(0.75, 0.75, 0.45),
          drawShadow: () => this.castEdgeQuad(xL, yB + syT * 0.05, xR, yB + syT * 0.05, 0.28),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Splayed trestle ends — a pew stands on real feet. flip
            // mirrors the splay so both ends lean outward.
            const leg = (lx: number, flip: number) => {
              ctx.fillStyle = legC;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.035 * flip, yB - th);
              ctx.lineTo(lx + s * 0.045 * flip, yB - th);
              ctx.lineTo(lx + s * 0.075 * flip, yB);
              ctx.lineTo(lx - s * 0.005 * flip, yB);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = shade(legC, -14);
              const fx0 = flip > 0 ? lx - s * 0.01 : lx - s * 0.075;
              ctx.fillRect(fx0, yB - s * 0.02, s * 0.085, s * 0.02);
            };
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.035);
            if (!jw) leg(xL + s * 0.05, 1);
            if (!je) leg(xR - s * 0.05, -1);
            // Stretcher rail under a lone bench.
            if (!jw && !je) {
              ctx.fillStyle = shade(legC, -8);
              ctx.fillRect(xL + s * 0.1, yB - th * 0.5, xR - xL - s * 0.2, s * 0.04);
            }
            // The seat is a THICK slab: edge face below, top above.
            ctx.fillStyle = shade(seatC, -14);
            ctx.fillRect(xL, yB - th, xR - xL, s * 0.07);
            ctx.fillStyle = seatC;
            ctx.beginPath();
            chamferRect(ctx, xL, yB - th - syT * 0.22, xR - xL, syT * 0.22, [
              jw ? 0 : s * 0.04,
              je ? 0 : s * 0.04,
              je ? 0 : s * 0.04,
              jw ? 0 : s * 0.04,
            ]);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.024);
            ctx.stroke();
            // End-grain caps at free ends; a seam runs with the grain;
            // the front arris is sat-smooth and catches the light.
            if (!jw) {
              ctx.fillStyle = shade(seatC, -8);
              ctx.fillRect(xL, yB - th - syT * 0.22, s * 0.055, syT * 0.22);
            }
            if (!je) {
              ctx.fillStyle = shade(seatC, -8);
              ctx.fillRect(xR - s * 0.055, yB - th - syT * 0.22, s * 0.055, syT * 0.22);
            }
            ctx.fillStyle = 'rgba(36, 22, 10, 0.16)';
            ctx.fillRect(xL + s * 0.06, yB - th - syT * 0.09, xR - xL - s * 0.12, s * 0.016);
            ctx.fillStyle = shade(seatC, 14);
            ctx.fillRect(
              xL + (jw ? 0 : s * 0.03),
              yB - th - s * 0.038,
              xR - xL - (jw ? 0 : s * 0.03) - (je ? 0 : s * 0.03),
              s * 0.038,
            );
          },
        };
      }

      case Tile.Chair: {
        const syT = s * this.camera.yScale;
        // The back turns away from an adjacent table — a chair is FOR
        // sitting at something.
        const isT = (t2: number | undefined) => t2 === Tile.Table || t2 === Tile.Counter;
        const back = isT(game.world.groundAt(tx, ty - 1))
          ? 's'
          : isT(game.world.groundAt(tx, ty + 1))
            ? 'n'
            : isT(game.world.groundAt(tx + 1, ty))
              ? 'w'
              : isT(game.world.groundAt(tx - 1, ty))
                ? 'e'
                : 'n';
        const baseY = p.y + syT * 0.2;
        // Seat at the knee, crest rail at the shoulder blades.
        const sw = s * 0.42;
        const sh = s * 0.34;
        const bhh = s * 0.86;
        const wood = '#7a552e';
        const dark = '#6f4d26';
        // About half the chairs wear a tied cushion in a house dye.
        const CUSHIONS = ['#8a3d46', '#3d5a8a', '#4d6b3c', '#75588a'] as const;
        const cush = (h & 4) !== 0 ? CUSHIONS[(h >> 3) % 4]! : null;
        return {
          sortY: ty + 0.68,
          body: stationBody(0.6, 1.05, 0.5),
          drawShadow: () => this.castEdgeQuad(p.x - sw / 2, baseY, p.x + sw / 2, baseY, 0.5),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY + s * 0.01, sw * 0.62, s * 0.055, 0, 0, Math.PI * 2);
            ctx.fill();
            // Joinery vocabulary: tapered legs, a spindled back under
            // a chamfered crest rail. Every facing is its own honest
            // silhouette — a chair from the side LOOKS side-on.
            const leg = (lx: number, ly: number, hgt: number, tone: string) => {
              ctx.fillStyle = tone;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.028, ly - hgt);
              ctx.lineTo(lx + s * 0.028, ly - hgt);
              ctx.lineTo(lx + s * 0.02, ly);
              ctx.lineTo(lx - s * 0.02, ly);
              ctx.closePath();
              ctx.fill();
            };
            const crest = (bx: number, bw2: number) => {
              ctx.fillStyle = wood;
              ctx.beginPath();
              chamferRect(ctx, bx, baseY - bhh, bw2, s * 0.11, [s * 0.035, s * 0.035, 0, 0]);
              ctx.fill();
              ctx.fillStyle = shade(wood, 12);
              ctx.fillRect(bx + s * 0.02, baseY - bhh + s * 0.015, bw2 - s * 0.04, s * 0.03);
            };
            const seatSlab = (sx0: number, sy0: number, w2: number) => {
              // A thick slab: edge face below the chamfered top.
              ctx.fillStyle = shade(wood, -12);
              ctx.fillRect(sx0, sy0, w2, s * 0.06);
              ctx.fillStyle = shade(wood, 6);
              ctx.beginPath();
              chamferRect(ctx, sx0 - s * 0.015, sy0 - syT * 0.2, w2 + s * 0.03, syT * 0.2, s * 0.03);
              ctx.fill();
              if (cush) {
                ctx.fillStyle = cush;
                ctx.beginPath();
                chamferRect(ctx, sx0 + s * 0.01, sy0 - syT * 0.185, w2 - s * 0.02, syT * 0.17, s * 0.035);
                ctx.fill();
                ctx.fillStyle = shade(cush, -14);
                ctx.fillRect(sx0 + s * 0.01, sy0 - syT * 0.045, w2 - s * 0.02, s * 0.028);
                ctx.fillStyle = shade(cush, 10);
                ctx.fillRect(sx0 + s * 0.035, sy0 - syT * 0.185, w2 - s * 0.07, s * 0.02);
                // The tie button dimples the middle.
                ctx.fillStyle = shade(cush, -20);
                ctx.fillRect(sx0 + w2 / 2 - s * 0.012, sy0 - syT * 0.1, s * 0.024, s * 0.02);
              } else {
                // Bare wood keeps a sat-worn sheen line.
                ctx.fillStyle = 'rgba(36, 22, 10, 0.18)';
                ctx.fillRect(sx0 + s * 0.03, sy0 - syT * 0.1, w2 - s * 0.06, s * 0.015);
              }
            };
            if (back === 'n') {
              // Facing the camera: stiles rise behind the seat.
              ctx.fillStyle = dark;
              ctx.fillRect(p.x - sw / 2 + s * 0.005, baseY - bhh + s * 0.05, s * 0.05, bhh - sh - s * 0.02);
              ctx.fillRect(p.x + sw / 2 - s * 0.055, baseY - bhh + s * 0.05, s * 0.05, bhh - sh - s * 0.02);
              ctx.fillStyle = shade(dark, -6);
              for (const fx of [0.32, 0.5, 0.68] as const) {
                ctx.fillRect(p.x - sw / 2 + sw * fx - s * 0.014, baseY - bhh + s * 0.12, s * 0.028, bhh - sh - s * 0.26);
              }
              crest(p.x - sw / 2, sw);
              // Lower back rail ties the stiles above the seat.
              ctx.fillStyle = dark;
              ctx.fillRect(p.x - sw / 2 + s * 0.01, baseY - sh - s * 0.16, sw - s * 0.02, s * 0.045);
              seatSlab(p.x - sw / 2, baseY - sh, sw);
              leg(p.x - sw / 2 + s * 0.04, baseY, sh, wood);
              leg(p.x + sw / 2 - s * 0.04, baseY, sh, wood);
              ctx.fillStyle = shade(wood, -8);
              ctx.fillRect(p.x - sw / 2 + s * 0.05, baseY - sh * 0.4, sw - s * 0.1, s * 0.032);
            } else if (back === 's') {
              // Seen from behind: far legs, a seat sliver, then the
              // full spindled back closest to the camera.
              leg(p.x - sw / 2 + s * 0.045, baseY - s * 0.075, sh - s * 0.075, shade(dark, -6));
              leg(p.x + sw / 2 - s * 0.045, baseY - s * 0.075, sh - s * 0.075, shade(dark, -6));
              seatSlab(p.x - sw / 2, baseY - sh - s * 0.06, sw);
              ctx.fillStyle = dark;
              ctx.fillRect(p.x - sw / 2 + s * 0.005, baseY - bhh + s * 0.05, s * 0.05, bhh - s * 0.05);
              ctx.fillRect(p.x + sw / 2 - s * 0.055, baseY - bhh + s * 0.05, s * 0.05, bhh - s * 0.05);
              ctx.fillStyle = shade(dark, -6);
              for (const fx of [0.32, 0.5, 0.68] as const) {
                ctx.fillRect(p.x - sw / 2 + sw * fx - s * 0.014, baseY - bhh + s * 0.12, s * 0.028, bhh - sh - s * 0.2);
              }
              crest(p.x - sw / 2, sw);
              ctx.fillStyle = shade(dark, -4);
              ctx.fillRect(p.x - sw / 2 + s * 0.01, baseY - sh - s * 0.1, sw - s * 0.02, s * 0.05);
            } else {
              // Side-on: one back post away from the table, the crest
              // overhanging toward the seat, legs at honest depths.
              const sgn = back === 'e' ? 1 : -1;
              const bx = p.x + sgn * sw * 0.34;
              leg(p.x - sgn * sw * 0.28, baseY - s * 0.08, sh - s * 0.06, shade(dark, -6));
              leg(p.x + sgn * sw * 0.3, baseY - s * 0.08, sh - s * 0.06, shade(dark, -6));
              ctx.fillStyle = dark;
              ctx.fillRect(bx - s * 0.032, baseY - bhh + s * 0.04, s * 0.064, bhh - s * 0.04);
              ctx.fillStyle = wood;
              ctx.beginPath();
              chamferRect(ctx, bx - (sgn > 0 ? s * 0.115 : s * 0.065), baseY - bhh, s * 0.18, s * 0.09, [
                s * 0.03,
                s * 0.03,
                0,
                0,
              ]);
              ctx.fill();
              ctx.fillStyle = shade(wood, 12);
              ctx.fillRect(bx - (sgn > 0 ? s * 0.1 : s * 0.05), baseY - bhh + s * 0.012, s * 0.15, s * 0.026);
              seatSlab(p.x - sw * 0.42, baseY - sh, sw * 0.8);
              leg(p.x - sgn * sw * 0.34, baseY, sh, wood);
              leg(p.x + sgn * sw * 0.24, baseY, sh, wood);
              ctx.fillStyle = shade(wood, -8);
              ctx.fillRect(p.x - sw * 0.34, baseY - sh * 0.42, sw * 0.62, s * 0.03);
            }
          },
        };
      }

      case Tile.Bed: {
        const syT = s * this.camera.yScale;
        const isBed = (t2: number | undefined) => t2 === Tile.Bed;
        const bn = isBed(game.world.groundAt(tx, ty - 1));
        const bs = isBed(game.world.groundAt(tx, ty + 1));
        const isWall = (t2: number | undefined) => t2 !== undefined && Renderer.WALL_TILES.has(t2);
        // A bed sleeps with its head to the wall — the side-on variant
        // is what keeps an inn's row of beds from reading stamped.
        const head: 'n' | 'e' | 'w' =
          bn || bs || isWall(game.world.groundAt(tx, ty - 1))
            ? 'n'
            : isWall(game.world.groundAt(tx + 1, ty))
              ? 'e'
              : isWall(game.world.groundAt(tx - 1, ty))
                ? 'w'
                : 'n';
        // N-S runs merge into one long bed; the quilt colorway is keyed
        // to the run's head tile so both halves wear the same cloth.
        let ay = ty;
        while (isBed(game.world.groundAt(tx, ay - 1))) ay--;
        const QUILTS = [
          ['#8a3d46', '#a34b52'],
          ['#3d5a8a', '#4a6a9c'],
          ['#4d6b3c', '#5a7d4a'],
          ['#75588a', '#8a6aa0'],
        ] as const;
        const [qDark, qMain] = QUILTS[hashCoords(41, tx, ay) % 4]!;
        // Sized against the 1.15-tile body: the tick runs the full
        // tile plan so a sleeper fits between the boards.
        const frameC = '#6f4d26';
        const postC = '#5e3f1e';
        const x0 = p.x - s * 0.46;
        const x1 = p.x + s * 0.46;
        const yTop = p.y - syT * 0.5;
        const yBot = p.y + syT * 0.48;
        return {
          sortY: ty + 0.72,
          body: bn || bs ? undefined : stationBody(0.85, 1.35, 0.6),
          drawShadow: bs ? undefined : () => this.castEdgeQuad(x0, yBot, x1, yBot, 0.3),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past
            // it. The quilt/finialPost helpers live IN here for the
            // same reason — defined at case level they'd seal in the
            // stale ctx and split the bed across two canvases.
            const ctx = this.ctx;
            // Patchwork blocks under seam lines — a quilt sewn from
            // scraps, softened by a white fold-back of the sheet.
            const quilt = (qx0: number, qy0: number, qw: number, qh: number, cols: number, rows: number) => {
              ctx.fillStyle = qMain;
              ctx.fillRect(qx0, qy0, qw, qh);
              ctx.fillStyle = qDark;
              for (let r2 = 0; r2 < rows; r2++) {
                for (let c3 = 0; c3 < cols; c3++) {
                  if ((r2 + c3) % 2 === 0) continue;
                  ctx.fillRect(qx0 + (qw / cols) * c3, qy0 + (qh / rows) * r2, qw / cols, qh / rows);
                }
              }
              ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
              for (let r2 = 1; r2 < rows; r2++) ctx.fillRect(qx0, qy0 + (qh / rows) * r2 - s * 0.008, qw, s * 0.016);
              for (let c3 = 1; c3 < cols; c3++) ctx.fillRect(qx0 + (qw / cols) * c3 - s * 0.008, qy0, s * 0.016, qh);
            };
            // A bedpost capped with a turned finial.
            const finialPost = (fx2: number, fy2: number, ph2: number) => {
              ctx.fillStyle = postC;
              ctx.fillRect(fx2 - s * 0.045, fy2 - ph2, s * 0.09, ph2);
              ctx.fillStyle = shade(postC, 10);
              ctx.fillRect(fx2 - s * 0.045, fy2 - ph2, s * 0.03, ph2);
              ctx.fillStyle = shade(postC, 18);
              ctx.beginPath();
              facetCircle(ctx, fx2, fy2 - ph2 - s * 0.035, s * 0.05, 6, 0.3);
              ctx.fill();
            };
            if (head === 'n') {
              // Run-aware bounds: merged halves reach the tile edge so
              // the long bed joins seamlessly. A LONE bed overdraws
              // south past its tile — a bed the 1.15-tile body fits,
              // even on a one-tile footprint (y-sort keeps occlusion
              // honest for anyone standing at its foot).
              const yT2 = bn ? p.y - syT * 0.5 : yTop;
              const yB2 = bs ? p.y + syT * 0.5 : bn ? yBot : p.y + syT * 0.62;
              // The frame stands off the floor: under-dark + feet.
              if (!bs) {
                ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
                ctx.fillRect(x0 - s * 0.01, yB2 + s * 0.1, x1 - x0 + s * 0.02, s * 0.05);
                ctx.fillStyle = shade(frameC, -18);
                ctx.fillRect(x0 - s * 0.02, yB2 + s * 0.08, s * 0.07, s * 0.07);
                ctx.fillRect(x1 - s * 0.05, yB2 + s * 0.08, s * 0.07, s * 0.07);
              }
              // Side rails frame the tick.
              const railH = yB2 - yT2 + (bs ? 0 : s * 0.1);
              ctx.fillStyle = frameC;
              ctx.fillRect(x0 - s * 0.055, yT2, s * 0.055, railH);
              ctx.fillRect(x1, yT2, s * 0.055, railH);
              ctx.fillStyle = shade(frameC, 10);
              ctx.fillRect(x0 - s * 0.055, yT2, s * 0.02, railH);
              ctx.fillStyle = shade(frameC, -12);
              ctx.fillRect(x1 + s * 0.035, yT2, s * 0.02, railH);
              // Dark rim outside each rail seats the frame on the
              // floorboards.
              ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
              ctx.fillRect(x0 - s * 0.073, yT2, s * 0.018, railH);
              ctx.fillRect(x1 + s * 0.055, yT2, s * 0.018, railH);
              // Mattress, dimpled darker along the rails.
              ctx.fillStyle = '#e8dfc8';
              ctx.fillRect(x0, yT2, x1 - x0, yB2 - yT2);
              ctx.fillStyle = shade('#e8dfc8', -8);
              ctx.fillRect(x0, yT2, s * 0.045, yB2 - yT2);
              ctx.fillRect(x1 - s * 0.045, yT2, s * 0.045, yB2 - yT2);
              if (!bn) {
                // Headboard: finial posts flanking a board of matched
                // planks — boards, not a void (a dark recess reads as
                // an empty picture frame from this camera).
                finialPost(x0 + s * 0.005, yTop + s * 0.06, s * 0.62);
                finialPost(x1 - s * 0.005, yTop + s * 0.06, s * 0.62);
                ctx.fillStyle = postC;
                ctx.beginPath();
                chamferRect(ctx, x0 + s * 0.02, yTop - s * 0.5, x1 - x0 - s * 0.04, s * 0.56, [s * 0.05, s * 0.05, 0, 0]);
                ctx.fill();
                ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
                ctx.lineWidth = Math.max(1, s * 0.024);
                ctx.stroke();
                ctx.fillStyle = shade(postC, -5);
                ctx.fillRect(x0 + s * 0.09, yTop - s * 0.4, x1 - x0 - s * 0.18, s * 0.34);
                ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
                for (const fx of [0.35, 0.53, 0.71] as const) {
                  ctx.fillRect(x0 + (x1 - x0) * fx, yTop - s * 0.39, s * 0.018, s * 0.32);
                }
                // The board's top edge foreshortens into view.
                ctx.fillStyle = shade(postC, 18);
                ctx.fillRect(x0 + s * 0.04, yTop - s * 0.5, x1 - x0 - s * 0.08, s * 0.075);
                // Pillow: plumped against the board, creased, casting
                // its own soft line on the sheet.
                ctx.fillStyle = '#f4efe0';
                ctx.beginPath();
                chamferRect(ctx, p.x - s * 0.24, yTop + syT * 0.05, s * 0.48, syT * 0.24, s * 0.06);
                ctx.fill();
                ctx.fillStyle = shade('#f4efe0', -9);
                ctx.fillRect(p.x - s * 0.2, yTop + syT * 0.05 + syT * 0.19, s * 0.4, s * 0.026);
                ctx.fillStyle = 'rgba(36, 22, 10, 0.1)';
                ctx.fillRect(p.x - s * 0.24, yTop + syT * 0.05 + syT * 0.24, s * 0.48, s * 0.02);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(p.x - s * 0.2, yTop + syT * 0.07, s * 0.14, s * 0.02);
              }
              // The quilt.
              const drape = bs ? 0 : s * 0.1;
              const yQ = bn ? yT2 : yT2 + (yB2 - yT2) * (bs ? 0.58 : 0.38);
              quilt(x0 - s * 0.03, yQ, x1 - x0 + s * 0.06, yB2 - yQ + drape, 4, bs || bn ? 2 : 3);
              if (!bn) {
                // Fold-back sheet band at the quilt's head edge.
                ctx.fillStyle = '#f4efe0';
                ctx.fillRect(x0 - s * 0.03, yQ - s * 0.055, x1 - x0 + s * 0.06, s * 0.075);
                ctx.fillStyle = shade('#f4efe0', -11);
                ctx.fillRect(x0 - s * 0.03, yQ - s * 0.005, x1 - x0 + s * 0.06, s * 0.025);
              }
              if (!bs) {
                // Hem shadow + the hanging corner at the foot.
                ctx.fillStyle = shade(qDark, -12);
                ctx.fillRect(x0 - s * 0.03, yB2 + drape - s * 0.03, x1 - x0 + s * 0.06, s * 0.03);
                ctx.beginPath();
                ctx.moveTo(x0 - s * 0.03, yB2 + drape);
                ctx.lineTo(x0 + s * 0.08, yB2 + drape);
                ctx.lineTo(x0 - s * 0.005, yB2 + drape + s * 0.07);
                ctx.closePath();
                ctx.fill();
                // Footboard: a low rail between finial posts.
                ctx.fillStyle = frameC;
                ctx.fillRect(x0 - s * 0.01, yB2 + s * 0.02, x1 - x0 + s * 0.02, s * 0.075);
                ctx.fillStyle = shade(frameC, 12);
                ctx.fillRect(x0 - s * 0.01, yB2 + s * 0.02, x1 - x0 + s * 0.02, s * 0.026);
                finialPost(x0 - s * 0.008, yB2 + s * 0.14, s * 0.2);
                finialPost(x1 + s * 0.008, yB2 + s * 0.14, s * 0.2);
              }
            } else {
              // SIDE-ON: head against the east or west wall, the whole
              // bed seen in profile — pillow at one end, quilt at the
              // other, the south rail carrying the frame's depth.
              const sgn = head === 'e' ? 1 : -1;
              const hx = head === 'e' ? x1 : x0;
              const fx0 = head === 'e' ? x0 : x1;
              // Under-dark + feet at the south corners.
              ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
              ctx.fillRect(x0 - s * 0.01, yBot + s * 0.1, x1 - x0 + s * 0.02, s * 0.05);
              ctx.fillStyle = shade(frameC, -18);
              ctx.fillRect(x0 - s * 0.02, yBot + s * 0.08, s * 0.07, s * 0.07);
              ctx.fillRect(x1 - s * 0.05, yBot + s * 0.08, s * 0.07, s * 0.07);
              // Far (north) rail behind the tick.
              ctx.fillStyle = frameC;
              ctx.fillRect(x0 - s * 0.02, yTop - s * 0.03, x1 - x0 + s * 0.04, s * 0.05);
              // Mattress.
              ctx.fillStyle = '#e8dfc8';
              ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
              ctx.fillStyle = shade('#e8dfc8', -8);
              ctx.fillRect(x0, yTop, x1 - x0, s * 0.04);
              // Headboard edge-on: a real board column at the wall —
              // wide enough to read as furniture, not a pole — its far
              // post first, near post after the quilt.
              finialPost(hx + sgn * s * 0.02, yTop + s * 0.04, s * 0.56);
              ctx.fillStyle = postC;
              ctx.beginPath();
              chamferRect(ctx, hx - s * 0.08, yTop - s * 0.52, s * 0.16, yBot - yTop + s * 0.52, [
                s * 0.035,
                s * 0.035,
                0,
                0,
              ]);
              ctx.fill();
              ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
              ctx.lineWidth = Math.max(1, s * 0.024);
              ctx.stroke();
              ctx.fillStyle = shade(postC, sgn > 0 ? 10 : -10);
              ctx.fillRect(sgn > 0 ? hx - s * 0.08 : hx + s * 0.045, yTop - s * 0.5, s * 0.035, yBot - yTop + s * 0.48);
              // Top edge of the board catches the sky.
              ctx.fillStyle = shade(postC, 18);
              ctx.fillRect(hx - s * 0.08, yTop - s * 0.52, s * 0.16, s * 0.07);
              // Pillow: stood vertical against the head end.
              ctx.fillStyle = '#f4efe0';
              ctx.beginPath();
              chamferRect(ctx, hx - sgn * s * 0.31 - s * 0.105, p.y - syT * 0.3, s * 0.21, syT * 0.6, s * 0.05);
              ctx.fill();
              ctx.fillStyle = shade('#f4efe0', -9);
              ctx.fillRect(hx - sgn * s * 0.31 - (sgn > 0 ? s * 0.105 : -s * 0.06), p.y - syT * 0.26, s * 0.045, syT * 0.52);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.fillRect(hx - sgn * s * 0.31 - s * 0.02, p.y - syT * 0.24, s * 0.04, s * 0.03);
              // The quilt claims the foot 58% of the bed.
              const qw2 = (x1 - x0) * 0.58;
              const qx0 = sgn > 0 ? fx0 - s * 0.02 : fx0 - qw2 + s * 0.02;
              quilt(qx0, yTop - s * 0.02, qw2, yBot - yTop + s * 0.13, 3, 3);
              // Fold-back sheet band along the quilt's head edge.
              const bandX = sgn > 0 ? qx0 + qw2 - s * 0.01 : qx0 - s * 0.065;
              ctx.fillStyle = '#f4efe0';
              ctx.fillRect(bandX, yTop - s * 0.02, s * 0.075, yBot - yTop + s * 0.13);
              ctx.fillStyle = shade('#f4efe0', -11);
              ctx.fillRect(bandX + (sgn > 0 ? s * 0.05 : 0), yTop - s * 0.02, s * 0.025, yBot - yTop + s * 0.13);
              // Hem shadow + hanging corner over the south rail.
              ctx.fillStyle = shade(qDark, -12);
              ctx.fillRect(qx0, yBot + s * 0.08, qw2, s * 0.03);
              ctx.beginPath();
              const cnr = sgn > 0 ? qx0 + s * 0.02 : qx0 + qw2 - s * 0.02;
              ctx.moveTo(cnr - s * 0.055, yBot + s * 0.11);
              ctx.lineTo(cnr + s * 0.055, yBot + s * 0.11);
              ctx.lineTo(cnr, yBot + s * 0.18);
              ctx.closePath();
              ctx.fill();
              // Footboard: a shorter board column at the foot end,
              // then the near-corner posts drawn over everything.
              ctx.fillStyle = frameC;
              ctx.beginPath();
              chamferRect(ctx, fx0 - s * 0.055, yTop + s * 0.02, s * 0.11, yBot - yTop + s * 0.12, [
                s * 0.025,
                s * 0.025,
                0,
                0,
              ]);
              ctx.fill();
              ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
              ctx.lineWidth = Math.max(1, s * 0.02);
              ctx.stroke();
              ctx.fillStyle = shade(frameC, sgn > 0 ? 10 : -10);
              ctx.fillRect(sgn > 0 ? fx0 - s * 0.055 : fx0 + s * 0.03, yTop + s * 0.04, s * 0.025, yBot - yTop + s * 0.08);
              finialPost(fx0 - sgn * s * 0.005, yBot + s * 0.16, s * 0.38);
              finialPost(hx + sgn * s * 0.02, yBot + s * 0.16, s * 0.6);
            }
          },
        };
      }

      case Tile.Bookshelf: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.22;
        // A bookcase stands OVER the body — a landmark of learning.
        const uw = s * 0.84;
        const uh = s * 1.68;
        const frame = '#5e3f1e';
        const xw = p.x - uw / 2;
        return {
          sortY: ty + 0.72,
          body: stationBody(0.65, 2.1, 0.5),
          drawShadow: () => this.castEdgeQuad(xw, baseY, p.x + uw / 2, baseY, 1.55),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade under a kicked plinth foot.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(xw - s * 0.02, baseY - s * 0.015, uw + s * 0.04, s * 0.05);
            ctx.fillStyle = '#4a3116';
            ctx.fillRect(xw + s * 0.015, baseY - s * 0.07, uw - s * 0.03, s * 0.07);
            // Carcass with lit west / shaded east stiles, rimmed dark
            // so the casework separates from wood floors.
            ctx.fillStyle = frame;
            ctx.beginPath();
            ctx.rect(xw, baseY - uh, uw, uh - s * 0.06);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            ctx.fillStyle = shade(frame, 10);
            ctx.fillRect(xw, baseY - uh, s * 0.05, uh - s * 0.06);
            ctx.fillStyle = shade(frame, -12);
            ctx.fillRect(p.x + uw / 2 - s * 0.05, baseY - uh, s * 0.05, uh - s * 0.06);
            // Four cavities. Three hold hand-bound books — leaning
            // volumes, flat-lying stacks, gilt bands — and one keeps
            // the owner's curios: hourglass, scrolls, a stoppered
            // bottle and a bookend holding nothing up.
            const SPINES = ['#a8433a', '#31589c', '#4d6b3c', '#c9962e', '#7a3f8f', '#996242'];
            const curioRow = (h >> 2) % 4;
            for (let row = 0; row < 4; row++) {
              const cy0 = baseY - uh + s * (0.12 + row * 0.375);
              const cavL = xw + s * 0.07;
              const cavW = uw - s * 0.14;
              const floor = cy0 + s * 0.3;
              ctx.fillStyle = '#241a28';
              ctx.fillRect(cavL, cy0, cavW, s * 0.3);
              if (row === curioRow) {
                const hc = hashCoords(83, tx, ty);
                // Hourglass on turned posts.
                const hgx = cavL + cavW * 0.18;
                ctx.fillStyle = '#8a6534';
                ctx.fillRect(hgx - s * 0.055, floor - s * 0.025, s * 0.11, s * 0.025);
                ctx.fillRect(hgx - s * 0.055, floor - s * 0.2, s * 0.11, s * 0.022);
                ctx.fillRect(hgx - s * 0.05, floor - s * 0.19, s * 0.018, s * 0.17);
                ctx.fillRect(hgx + s * 0.032, floor - s * 0.19, s * 0.018, s * 0.17);
                ctx.fillStyle = '#e8c876';
                ctx.beginPath();
                ctx.moveTo(hgx - s * 0.032, floor - s * 0.175);
                ctx.lineTo(hgx + s * 0.032, floor - s * 0.175);
                ctx.lineTo(hgx, floor - s * 0.105);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(hgx, floor - s * 0.095);
                ctx.lineTo(hgx + s * 0.036, floor - s * 0.028);
                ctx.lineTo(hgx - s * 0.036, floor - s * 0.028);
                ctx.closePath();
                ctx.fill();
                // A pair of rolled scrolls, pith dots on the ends.
                const scx = cavL + cavW * (0.42 + ((hc >> 2) % 10) / 100);
                ctx.fillStyle = '#d8c9a0';
                ctx.fillRect(scx, floor - s * 0.055, s * 0.19, s * 0.05);
                ctx.fillRect(scx + s * 0.025, floor - s * 0.105, s * 0.19, s * 0.05);
                ctx.fillStyle = '#b0a078';
                ctx.beginPath();
                facetCircle(ctx, scx + s * 0.008, floor - s * 0.03, s * 0.022, 6, 0.3);
                facetCircle(ctx, scx + s * 0.033, floor - s * 0.08, s * 0.022, 6, 0.3);
                ctx.fill();
                // The stoppered bottle, something teal inside.
                const btx = cavL + cavW * 0.82;
                ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
                ctx.fillRect(btx - s * 0.04, floor - s * 0.14, s * 0.08, s * 0.14);
                ctx.fillStyle = '#7fc9b3';
                ctx.fillRect(btx - s * 0.032, floor - s * 0.08, s * 0.064, s * 0.072);
                ctx.fillStyle = '#8a6534';
                ctx.fillRect(btx - s * 0.016, floor - s * 0.17, s * 0.032, s * 0.035);
              } else {
                let bx = cavL + s * 0.02;
                for (let k = 0; bx < cavL + cavW - s * 0.07; k++) {
                  const hh = hashCoords(59 + row * 7 + k, tx, ty);
                  if ((hh & 15) === 3) {
                    // A short stack lying flat.
                    const stW = s * (0.15 + (hh % 3) * 0.02);
                    for (let j2 = 0; j2 < 3; j2++) {
                      ctx.fillStyle = SPINES[(hh >> (j2 * 3)) % SPINES.length]!;
                      ctx.fillRect(
                        bx + (((hh >> j2) % 3) - 1) * s * 0.01,
                        floor - s * 0.045 * (j2 + 1),
                        stW - j2 * s * 0.018,
                        s * 0.04,
                      );
                    }
                    bx += stW + s * 0.02;
                    continue;
                  }
                  const bw2 = s * (0.055 + (hh % 3) * 0.02);
                  const bh2 = s * (0.22 + ((hh >> 4) % 4) * 0.022);
                  ctx.fillStyle = SPINES[hh % SPINES.length]!;
                  if ((hh & 7) === 0) {
                    // The odd leaning volume breaks the soldier row.
                    ctx.save();
                    ctx.translate(bx + bw2 / 2, floor);
                    ctx.rotate(0.16);
                    ctx.fillRect(-bw2 / 2, -bh2, bw2, bh2);
                    ctx.restore();
                  } else {
                    ctx.fillRect(bx, floor - bh2, bw2, bh2);
                    if ((hh & 3) === 1) {
                      // Gilt tooling bands on the finer bindings.
                      ctx.fillStyle = 'rgba(242, 217, 138, 0.75)';
                      ctx.fillRect(bx + s * 0.008, floor - bh2 + s * 0.035, bw2 - s * 0.016, s * 0.014);
                      ctx.fillRect(bx + s * 0.008, floor - s * 0.05, bw2 - s * 0.016, s * 0.014);
                    }
                  }
                  bx += bw2 + s * 0.014;
                }
              }
              // The shelf board: lit front edge over a lip shadow.
              ctx.fillStyle = shade(frame, 14);
              ctx.fillRect(cavL - s * 0.01, floor, cavW + s * 0.02, s * 0.028);
              ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
              ctx.fillRect(cavL, floor + s * 0.028, cavW, s * 0.022);
            }
            // The TOP — our camera is a tilted bird's eye, never a
            // straight-on elevation: tall casework must show a
            // foreshortened top plane (the crate-lid law), crowned by
            // a sunlit cornice lip along its front arris.
            const topD = syT * 0.34;
            ctx.fillStyle = shade(frame, 16);
            ctx.beginPath();
            chamferRect(ctx, xw - s * 0.035, baseY - uh - topD, uw + s * 0.07, topD + s * 0.015, s * 0.035);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            // Far edge falls away into shade; dust of the years.
            ctx.fillStyle = shade(frame, 6);
            ctx.fillRect(xw - s * 0.005, baseY - uh - topD + s * 0.012, uw + s * 0.01, s * 0.03);
            ctx.fillStyle = shade(frame, 26);
            ctx.fillRect(xw - s * 0.035, baseY - uh - s * 0.02, uw + s * 0.07, s * 0.035);
            ctx.fillStyle = 'rgba(18, 12, 26, 0.25)';
            ctx.fillRect(xw - s * 0.02, baseY - uh + s * 0.03, uw + s * 0.04, s * 0.022);
            // A gilt spine catches the lamplight now and then.
            const tw = Renderer.twinkle(t, h, 3.6);
            if (tw > 0) this.sparkle(p.x - uw * 0.18, baseY - uh * 0.62, s * 0.05, 0.5 * tw, '#f2d98a');
          },
        };
      }

      case Tile.Cabinet: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.22;
        // Chest-high casework; the tile hash deals a two-door cupboard
        // or a chest of drawers, so cabinetry never repeats door-for-
        // door across a room.
        const uw = s * 0.78;
        const uh = s * 0.98;
        const frame = '#6f4d26';
        const xw = p.x - uw / 2;
        const dresser = ((h >> 1) & 1) === 1;
        return {
          sortY: ty + 0.72,
          body: stationBody(0.62, 1.55, 0.5),
          drawShadow: () => this.castEdgeQuad(xw, baseY, p.x + uw / 2, baseY, 0.9),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Bracket feet under the carcass.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(xw - s * 0.02, baseY - s * 0.015, uw + s * 0.04, s * 0.05);
            ctx.fillStyle = '#4a3116';
            ctx.fillRect(xw + s * 0.02, baseY - s * 0.05, s * 0.09, s * 0.05);
            ctx.fillRect(p.x + uw / 2 - s * 0.11, baseY - s * 0.05, s * 0.09, s * 0.05);
            // Carcass with lit west / shaded east stiles, dark-rimmed.
            ctx.fillStyle = frame;
            ctx.beginPath();
            ctx.rect(xw, baseY - uh, uw, uh - s * 0.045);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            ctx.fillStyle = shade(frame, 10);
            ctx.fillRect(xw, baseY - uh, s * 0.045, uh - s * 0.045);
            ctx.fillStyle = shade(frame, -12);
            ctx.fillRect(p.x + uw / 2 - s * 0.045, baseY - uh, s * 0.045, uh - s * 0.045);
            if (dresser) {
              // A chest of drawers, the top one not quite pushed home.
              for (let d2 = 0; d2 < 3; d2++) {
                const dy0 = baseY - uh + s * (0.1 + d2 * 0.27);
                const ajar = d2 === 0 && (h & 8) !== 0;
                const off = ajar ? s * 0.035 : 0;
                if (ajar) {
                  ctx.fillStyle = '#241a28';
                  ctx.fillRect(xw + s * 0.06, dy0, uw - s * 0.12, s * 0.05);
                }
                ctx.fillStyle = shade(frame, -8 + d2 * 2);
                ctx.fillRect(xw + s * 0.06, dy0 + off, uw - s * 0.12, s * 0.22);
                ctx.fillStyle = shade(frame, 8);
                ctx.fillRect(xw + s * 0.06, dy0 + off, uw - s * 0.12, s * 0.02);
                ctx.fillStyle = '#c9962e';
                for (const kx of [-0.16, 0.16] as const) {
                  ctx.beginPath();
                  facetCircle(ctx, p.x + kx * s, dy0 + off + s * 0.115, s * 0.022, 6, 0.3);
                  ctx.fill();
                }
                if (ajar) {
                  // A sleeve of linen caught in the gap.
                  ctx.fillStyle = '#e8dfc8';
                  ctx.fillRect(p.x - s * 0.04, dy0 + s * 0.012, s * 0.1, s * 0.032);
                }
              }
            } else {
              // Rail-and-stile doors hung on strap hinges. The door
              // leaf sits LIGHTER than the carcass with a deep-set
              // panel — contrast, or the front reads as one dark slab.
              ctx.fillStyle = 'rgba(26, 20, 36, 0.4)';
              ctx.fillRect(p.x - s * 0.012, baseY - uh + s * 0.09, s * 0.024, uh - s * 0.22);
              for (const sideK of [-1, 1] as const) {
                const dx0 = sideK < 0 ? xw + s * 0.06 : p.x + s * 0.015;
                const dw = uw / 2 - s * 0.075;
                ctx.fillStyle = shade(frame, sideK < 0 ? 5 : -1);
                ctx.fillRect(dx0, baseY - uh + s * 0.09, dw, uh - s * 0.22);
                ctx.fillStyle = shade(frame, -18);
                ctx.fillRect(dx0 + s * 0.05, baseY - uh + s * 0.17, dw - s * 0.1, uh - s * 0.38);
                ctx.fillStyle = shade(frame, 8);
                ctx.fillRect(dx0 + s * 0.05, baseY - uh + s * 0.17, dw - s * 0.1, s * 0.022);
                // Strap hinges reaching in from the stiles.
                ctx.fillStyle = '#3a3444';
                const hx0 = sideK < 0 ? dx0 - s * 0.01 : dx0 + dw - s * 0.1;
                for (const hy of [0.2, 0.62] as const) {
                  const hyy = baseY - uh + uh * hy;
                  ctx.fillRect(hx0, hyy, s * 0.11, s * 0.028);
                  ctx.beginPath();
                  facetCircle(
                    ctx,
                    sideK < 0 ? hx0 + s * 0.115 : hx0 - s * 0.006,
                    hyy + s * 0.014,
                    s * 0.021,
                    6,
                    0.2,
                  );
                  ctx.fill();
                }
              }
              // Knobs + a keyhole plate — someone owns this cupboard.
              ctx.fillStyle = '#c9962e';
              ctx.fillRect(p.x - s * 0.065, baseY - uh * 0.52, s * 0.035, s * 0.035);
              ctx.fillRect(p.x + s * 0.03, baseY - uh * 0.52, s * 0.035, s * 0.035);
              ctx.fillStyle = shade('#c9962e', -18);
              ctx.fillRect(p.x + s * 0.032, baseY - uh * 0.52 + s * 0.055, s * 0.03, s * 0.04);
            }
            // The TOP: a foreshortened plane, not a lip — the tilted
            // bird's-eye camera must see the boards a household sets
            // its crockery on (crate-lid law).
            const topD = syT * 0.32;
            ctx.fillStyle = shade(frame, 16);
            ctx.beginPath();
            chamferRect(ctx, xw - s * 0.03, baseY - uh - topD, uw + s * 0.06, topD + s * 0.015, s * 0.03);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(frame, 6);
            ctx.fillRect(xw - s * 0.005, baseY - uh - topD + s * 0.012, uw + s * 0.01, s * 0.028);
            ctx.fillStyle = shade(frame, 26);
            ctx.fillRect(xw - s * 0.03, baseY - uh - s * 0.02, uw + s * 0.06, s * 0.032);
            ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.fillRect(xw - s * 0.015, baseY - uh + s * 0.035, uw + s * 0.03, s * 0.02);
            // What lives on top — a jug and bowl, a plate stack,
            // folded linens, or bare boards — dealt by the tile,
            // standing ON the top plane, not perched on its front lip.
            const c2 = (h >> 4) % 4;
            const cyT = baseY - uh - topD * 0.45;
            if (c2 === 0) {
              // Stoneware jug + wash bowl.
              ctx.fillStyle = '#7d94a0';
              ctx.beginPath();
              chamferRect(ctx, p.x - s * 0.17, cyT - s * 0.17, s * 0.11, s * 0.17, [s * 0.02, s * 0.02, 0, 0]);
              ctx.fill();
              ctx.fillStyle = shade('#7d94a0', 12);
              ctx.fillRect(p.x - s * 0.17, cyT - s * 0.17, s * 0.035, s * 0.17);
              ctx.fillRect(p.x - s * 0.145, cyT - s * 0.205, s * 0.06, s * 0.04);
              ctx.strokeStyle = '#7d94a0';
              ctx.lineWidth = Math.max(1, s * 0.02);
              ctx.beginPath();
              ctx.arc(p.x - s * 0.045, cyT - s * 0.12, s * 0.03, -Math.PI / 2, Math.PI / 2);
              ctx.stroke();
              ctx.fillStyle = '#e8dfc8';
              ctx.beginPath();
              facetCircle(ctx, p.x + s * 0.12, cyT - s * 0.035, s * 0.085, 6, 0.3, 0.5);
              ctx.fill();
              ctx.fillStyle = shade('#e8dfc8', -12);
              ctx.beginPath();
              facetCircle(ctx, p.x + s * 0.12, cyT - s * 0.038, s * 0.055, 6, 0.3, 0.5);
              ctx.fill();
            } else if (c2 === 1) {
              // Plates, stacked not quite square.
              for (let j2 = 0; j2 < 3; j2++) {
                ctx.fillStyle = j2 === 2 ? '#f4efe0' : '#e8dfc8';
                ctx.fillRect(
                  p.x - s * 0.1 + ((h >> j2) % 3) * s * 0.008,
                  cyT - s * 0.035 * (j2 + 1),
                  s * 0.2 - j2 * s * 0.015,
                  s * 0.032,
                );
              }
            } else if (c2 === 2) {
              // Folded linens: house cloth over bleached sheet.
              ctx.fillStyle = '#96586a';
              ctx.fillRect(p.x - s * 0.14, cyT - s * 0.06, s * 0.28, s * 0.06);
              ctx.fillStyle = '#e8dfc8';
              ctx.fillRect(p.x - s * 0.14, cyT - s * 0.115, s * 0.28, s * 0.055);
              ctx.fillStyle = shade('#e8dfc8', -10);
              ctx.fillRect(p.x - s * 0.14, cyT - s * 0.075, s * 0.28, s * 0.016);
            }
          },
        };
      }

      case Tile.Hearth: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.3;
        // A full chimney piece built to the body-ruler: firebox at the
        // waist, mantel at the chest, breast past head height. Every
        // horizontal — hearthstone, mantel, shoulder ledges, crown —
        // is a foreshortened plane the tilted camera can see.
        const hw = s * 1.02;
        const hh2 = s * 1.78;
        const stone = '#55505e';
        return {
          sortY: ty + 0.78,
          body: stationBody(1.0, 2.3, 0.7),
          drawShadow: () => this.castEdgeQuad(p.x - hw / 2, baseY, p.x + hw / 2, baseY, 1.65),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // The hearthstone apron: a flagstone plane laid in front of
            // the firebox — the floor the fire lives on, seen in plan.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(p.x - hw / 2 - s * 0.03, baseY - s * 0.01, hw + s * 0.06, s * 0.05);
            ctx.fillStyle = shade(stone, 6);
            ctx.beginPath();
            chamferRect(ctx, p.x - hw * 0.42, baseY - s * 0.02, hw * 0.84, syT * 0.3, s * 0.045);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            // Flag seams + a lit south lip on the apron slab.
            ctx.fillStyle = 'rgba(20, 14, 28, 0.28)';
            ctx.fillRect(p.x - hw * 0.14, baseY, s * 0.022, syT * 0.26);
            ctx.fillRect(p.x + hw * 0.12, baseY, s * 0.022, syT * 0.26);
            ctx.fillStyle = shade(stone, 18);
            ctx.fillRect(p.x - hw * 0.42, baseY + syT * 0.25, hw * 0.84, s * 0.035);
            // Chimney breast tapers above the mantel.
            ctx.fillStyle = stone;
            ctx.beginPath();
            ctx.moveTo(p.x - hw / 2, baseY);
            ctx.lineTo(p.x - hw / 2, baseY - hh2 * 0.48);
            ctx.lineTo(p.x - hw * 0.3, baseY - hh2 * 0.62);
            ctx.lineTo(p.x - hw * 0.3, baseY - hh2);
            ctx.lineTo(p.x + hw * 0.3, baseY - hh2);
            ctx.lineTo(p.x + hw * 0.3, baseY - hh2 * 0.62);
            ctx.lineTo(p.x + hw / 2, baseY - hh2 * 0.48);
            ctx.lineTo(p.x + hw / 2, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            // Sun keeps the west flank and loses the east — breast and
            // stack both, the same law as every wall in town.
            ctx.fillStyle = shade(stone, -10);
            ctx.fillRect(p.x + hw * 0.19, baseY - hh2, hw * 0.11, hh2 * 0.36);
            ctx.fillRect(p.x + hw * 0.38, baseY - hh2 * 0.48, hw * 0.12, hh2 * 0.46);
            ctx.fillStyle = shade(stone, 10);
            ctx.fillRect(p.x - hw * 0.3, baseY - hh2, hw * 0.09, hh2 * 0.36);
            ctx.fillRect(p.x - hw * 0.5, baseY - hh2 * 0.48, hw * 0.1, hh2 * 0.46);
            // Cut-stone coursing: staggered header ticks, not lines.
            ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
            for (let r2 = 0; r2 < 3; r2++) {
              const cy2 = baseY - hh2 * (0.72 + r2 * 0.09);
              ctx.fillRect(p.x - hw * 0.3, cy2, hw * 0.6, s * 0.024);
              for (let c2 = 0; c2 < 3; c2++) {
                ctx.fillRect(p.x - hw * 0.26 + ((c2 * 2 + (r2 & 1)) * hw * 0.6) / 6, cy2 + s * 0.024, s * 0.02, s * 0.055);
              }
            }
            // The shoulder ledges where the breast steps back to the
            // stack: two sloped planes catching the sky — the cut the
            // silhouette makes, shown as surface.
            for (const sd of [-1, 1] as const) {
              ctx.fillStyle = shade(stone, sd < 0 ? 22 : 14);
              ctx.beginPath();
              ctx.moveTo(p.x + sd * hw * 0.5, baseY - hh2 * 0.48);
              ctx.lineTo(p.x + sd * hw * 0.3, baseY - hh2 * 0.62);
              ctx.lineTo(p.x + sd * hw * 0.3, baseY - hh2 * 0.62 + s * 0.045);
              ctx.lineTo(p.x + sd * hw * 0.5, baseY - hh2 * 0.48 + s * 0.045);
              ctx.closePath();
              ctx.fill();
            }
            // The crown: a foreshortened cap plane on the stack, its
            // dark flue slot sunk in the middle — the top the tilted
            // bird's eye must see on anything this tall.
            const crD = syT * 0.26;
            ctx.fillStyle = shade(stone, 16);
            ctx.beginPath();
            chamferRect(ctx, p.x - hw * 0.345, baseY - hh2 - crD, hw * 0.69, crD + s * 0.02, s * 0.035);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(stone, 4);
            ctx.fillRect(p.x - hw * 0.31, baseY - hh2 - crD + s * 0.018, hw * 0.62, s * 0.028);
            ctx.fillStyle = '#1c1524';
            ctx.beginPath();
            chamferRect(ctx, p.x - hw * 0.2, baseY - hh2 - crD * 0.62, hw * 0.4, crD * 0.44, s * 0.025);
            ctx.fill();
            ctx.fillStyle = shade(stone, 28);
            ctx.fillRect(p.x - hw * 0.345, baseY - hh2 - s * 0.012, hw * 0.69, s * 0.032);
            // Warm haze stands over the flue when the fire is drawing.
            const flick = 0.85 + Math.sin(t * 9 + tx * 2.7) * 0.12 + Math.sin(t * 21 + ty) * 0.06;
            for (let i = 0; i < 2; i++) {
              const ph = (t * (0.22 + i * 0.08) + i * 0.5 + h * 0.13) % 1;
              ctx.fillStyle = `rgba(150, 142, 156, ${(1 - ph) * 0.2})`;
              ctx.beginPath();
              facetCircle(
                ctx,
                p.x + Math.sin(t * 0.8 + i * 2.4 + h) * s * 0.04 + ph * s * 0.1,
                baseY - hh2 - crD * 0.5 - ph * s * 0.42,
                s * (0.05 + ph * 0.08),
                6,
                ph * 2 + i,
                0.8,
              );
              ctx.fill();
            }
            // The mantel: a real shelf plane at the chest — deep
            // enough to keep things on, rimmed and lit like casework.
            const manY = baseY - hh2 * 0.48;
            const manD = syT * 0.24;
            ctx.fillStyle = shade(stone, 18);
            ctx.beginPath();
            chamferRect(ctx, p.x - hw / 2 - s * 0.06, manY - manD, hw + s * 0.12, manD + s * 0.055, s * 0.04);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(stone, 8);
            ctx.fillRect(p.x - hw / 2 - s * 0.02, manY - manD + s * 0.014, hw + s * 0.04, s * 0.026);
            ctx.fillStyle = shade(stone, 30);
            ctx.fillRect(p.x - hw / 2 - s * 0.06, manY + s * 0.02, hw + s * 0.12, s * 0.035);
            ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
            ctx.fillRect(p.x - hw / 2 - s * 0.04, manY + s * 0.055, hw + s * 0.08, s * 0.028);
            // Mantel keepings, standing ON the shelf plane: a stoneware
            // jug at one end and a pair of old candlesticks at the
            // other — lit with the house at dusk.
            const jx = p.x - hw * 0.34;
            ctx.fillStyle = '#7d84a0';
            ctx.beginPath();
            chamferRect(ctx, jx - s * 0.05, manY - manD * 0.4 - s * 0.15, s * 0.1, s * 0.15, [s * 0.02, s * 0.02, 0, 0]);
            ctx.fill();
            ctx.fillStyle = shade('#7d84a0', -16);
            ctx.fillRect(jx - s * 0.037, manY - manD * 0.4 - s * 0.165, s * 0.074, s * 0.028);
            const lit = this.sky.flame;
            for (const cnd of [0.3, 0.4] as const) {
              const ccx = p.x + hw * cnd;
              const ccy = manY - manD * 0.42;
              ctx.fillStyle = '#c9962e';
              ctx.fillRect(ccx - s * 0.028, ccy - s * 0.03, s * 0.056, s * 0.03);
              ctx.fillStyle = '#e8dfc8';
              ctx.fillRect(ccx - s * 0.018, ccy - s * (0.1 + cnd * 0.1), s * 0.036, s * (0.07 + cnd * 0.1));
              if (lit > 0.05) {
                ctx.fillStyle = `rgba(255, 205, 120, ${Math.min(1, 0.9 * lit * flick)})`;
                ctx.beginPath();
                ctx.moveTo(ccx, ccy - s * (0.1 + cnd * 0.1));
                ctx.quadraticCurveTo(ccx - s * 0.028, ccy - s * (0.15 + cnd * 0.1), ccx, ccy - s * (0.2 + cnd * 0.1));
                ctx.quadraticCurveTo(ccx + s * 0.028, ccy - s * (0.15 + cnd * 0.1), ccx, ccy - s * (0.1 + cnd * 0.1));
                ctx.fill();
              } else {
                ctx.fillStyle = '#2c2836';
                ctx.fillRect(ccx - s * 0.004, ccy - s * (0.12 + cnd * 0.1), s * 0.008, s * 0.024);
              }
            }
            // Firebox: dark mouth with 45-degree shoulders, tall
            // enough to stack a real fire in.
            ctx.fillStyle = '#1c1524';
            ctx.beginPath();
            ctx.moveTo(p.x - hw * 0.32, baseY);
            ctx.lineTo(p.x - hw * 0.32, baseY - hh2 * 0.28);
            ctx.lineTo(p.x - hw * 0.2, baseY - hh2 * 0.38);
            ctx.lineTo(p.x + hw * 0.2, baseY - hh2 * 0.38);
            ctx.lineTo(p.x + hw * 0.32, baseY - hh2 * 0.28);
            ctx.lineTo(p.x + hw * 0.32, baseY);
            ctx.closePath();
            ctx.fill();
            // Firelight licks the firebox reveal — the opening glows
            // from within before the flames even draw.
            ctx.fillStyle = `rgba(232, 130, 61, ${0.16 * flick})`;
            ctx.beginPath();
            ctx.moveTo(p.x - hw * 0.28, baseY);
            ctx.lineTo(p.x - hw * 0.28, baseY - hh2 * 0.3);
            ctx.lineTo(p.x + hw * 0.28, baseY - hh2 * 0.3);
            ctx.lineTo(p.x + hw * 0.28, baseY);
            ctx.closePath();
            ctx.fill();
            // Firelight spills out over the hearthstone plane — the
            // room-side pool that says warmth from across the hall.
            ctx.fillStyle = `rgba(232, 130, 61, ${0.12 * flick})`;
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY + syT * 0.12, hw * 0.36, 8, 0.3, 0.4);
            ctx.fill();
            // Andiron dogs holding the logs off the stone, then the
            // fire: three flickering tongues whose tips wander
            // independently (primary flame, secondary sway).
            ctx.fillStyle = '#3a3544';
            ctx.fillRect(p.x - hw * 0.24, baseY - s * 0.09, s * 0.035, s * 0.09);
            ctx.fillRect(p.x + hw * 0.24 - s * 0.035, baseY - s * 0.09, s * 0.035, s * 0.09);
            ctx.fillStyle = '#6f4d26';
            ctx.fillRect(p.x - hw * 0.22, baseY - s * 0.1, hw * 0.44, s * 0.07);
            ctx.fillStyle = '#5a3d1e';
            ctx.fillRect(p.x - hw * 0.16, baseY - s * 0.16, hw * 0.32, s * 0.07);
            for (const [ox, fh, col] of [
              [-0.11, 0.38, '#e8823d'],
              [0.09, 0.33, '#e8823d'],
              [0, 0.52, '#f4b13d'],
            ] as const) {
              ctx.fillStyle = col;
              const fx = p.x + ox * hw;
              const top = baseY - s * 0.14 - s * fh * flick;
              ctx.beginPath();
              ctx.moveTo(fx - s * 0.08, baseY - s * 0.12);
              ctx.lineTo(fx + s * 0.08, baseY - s * 0.12);
              ctx.lineTo(fx + Math.sin(t * 7 + ox * 20) * s * 0.04, top);
              ctx.closePath();
              ctx.fill();
            }
            // A drifting ember above the flames.
            const ey2 = (t * 0.5 + h * 0.07) % 1;
            ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ey2) * 0.7})`;
            ctx.fillRect(
              p.x + Math.sin(t * 3 + h) * s * 0.06,
              baseY - s * 0.2 - ey2 * s * 0.3,
              s * 0.025,
              s * 0.025,
            );
          },
        };
      }

      case Tile.MarketStall: {
        const syT = s * this.camera.yScale;
        const isRun = (t2: number | undefined) => t2 === Tile.MarketStall;
        const je = isRun(game.world.groundAt(tx + 1, ty));
        const jw = isRun(game.world.groundAt(tx - 1, ty));
        // The banner belongs to the RUN: walk to the west anchor so a
        // merged stall wears one cloth and neighbouring stands each
        // draw a different bolt from the roster.
        let ax = tx;
        for (let i = 0; i < 8 && isRun(game.world.groundAt(ax - 1, ty)); i++) ax--;
        const style =
          Renderer.STALL_BANNERS[hashCoords(97, ax, ty) % Renderer.STALL_BANNERS.length]!;
        const hg = hashCoords(53, tx, ty);
        const baseY = p.y + syT * 0.42;
        const xL = p.x - s * 0.5 - (jw ? 0.5 : 0);
        const xR = p.x + s * 0.5 + (je ? 0.5 : 0);
        // STALL ARCHITECTURE LAW: chest-high counter with a FULL-TILE
        // display top, then open air, then the awning high overhead.
        // The valance hem clears the head of a seller standing one row
        // north, so the merchant shows hips-to-face through the window
        // (the same open-interior thinking that removed roofs); their
        // legs vanish behind the deep top — standing-behind-the-counter
        // falls out of the geometry, not a special case.
        const faceH = s * 0.66;
        const faceTop = baseY - faceH;
        const topBack = faceTop - syT;
        const tipY = baseY - s * 2.08;
        const hemY = baseY - s * 2.3;
        const canTop = baseY - s * 2.6;
        return {
          sortY: ty + 0.78,
          body: je || jw ? undefined : stationBody(1.35, 2.4, 0.8),
          drawShadow: () => this.castEdgeQuad(xL, baseY + syT * 0.05, xR, baseY + syT * 0.05, 1.0),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const wind = windAtInto(WIND_TMP, tx + 0.5, ty + 0.5, t);
            const tileL = p.x - s * 0.5;
            const tileR = p.x + s * 0.5;
            // Contact shade under the stand.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(tileL, baseY - s * 0.01, s, s * 0.05);
            // Display top first: a full tile of goods room, dimmer at
            // the back where the awning's shade falls.
            ctx.fillStyle = '#9a7040';
            ctx.fillRect(tileL, topBack, s, syT);
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.fillRect(tileL, topBack, s, syT * 0.3);
            // Counter face: the ShopCounter family's joinery — plinth
            // and recessed panels — so stalls, counters, and tables
            // compose into one market vocabulary.
            ctx.fillStyle = '#4a3116';
            ctx.fillRect(tileL, baseY - s * 0.07, s, s * 0.07);
            ctx.fillStyle = '#5e3f1e';
            ctx.fillRect(tileL, faceTop, s, faceH - s * 0.07);
            ctx.fillStyle = shade('#5e3f1e', -12);
            for (const px2 of [-0.42, 0.04] as const) {
              ctx.fillRect(p.x + px2 * s, faceTop + s * 0.1, s * 0.38, faceH - s * 0.28);
            }
            ctx.fillStyle = shade('#5e3f1e', 10);
            for (const px2 of [-0.42, 0.04] as const) {
              ctx.fillRect(p.x + px2 * s, faceTop + s * 0.1, s * 0.38, s * 0.025);
            }
            // The bright working lip along the top's south edge.
            ctx.fillStyle = '#b08347';
            ctx.fillRect(tileL, faceTop - s * 0.035, s, s * 0.05);
            // Wares: two or three goods per tile, hash-picked so no
            // two stalls stock the same shelf.
            const slots = (hg & 1) === 0 ? [-0.28, 0.28] : [-0.3, 0, 0.3];
            for (let i = 0; i < slots.length; i++) {
              this.drawStallGood(
                (hg >>> (i * 5)) % 6,
                p.x + slots[i]! * s,
                topBack + syT * (0.52 + (((hg >>> (i * 3)) % 5) - 2) * 0.055),
                s,
                hg + i * 977,
              );
            }
            // Corner posts carry the awning — run ends only, so a
            // merged row reads as one long stand.
            if (!jw) {
              ctx.fillStyle = '#5e3f1e';
              ctx.fillRect(xL + s * 0.03, hemY - s * 0.04, s * 0.09, baseY - hemY + s * 0.04);
              ctx.fillStyle = shade('#5e3f1e', 12);
              ctx.fillRect(xL + s * 0.03, hemY - s * 0.04, s * 0.03, baseY - hemY + s * 0.04);
            }
            if (!je) {
              ctx.fillStyle = '#5e3f1e';
              ctx.fillRect(xR - s * 0.12, hemY - s * 0.04, s * 0.09, baseY - hemY + s * 0.04);
              ctx.fillStyle = shade('#5e3f1e', 12);
              ctx.fillRect(xR - s * 0.12, hemY - s * 0.04, s * 0.03, baseY - hemY + s * 0.04);
            }
            // The awning slab, styled per the run's banner.
            const oxL = jw ? tileL - 0.5 : tileL - s * 0.07;
            const oxR = je ? tileR + 0.5 : tileR + s * 0.07;
            const bandW = s / 4;
            if (style.kind === 'stripes') {
              for (let k = 0; k < 4; k++) {
                ctx.fillStyle = k % 2 === 0 ? style.a : style.b;
                ctx.fillRect(tileL + k * bandW, canTop, bandW + 0.5, hemY - canTop);
              }
              if (!jw) {
                ctx.fillStyle = style.a;
                ctx.fillRect(oxL, canTop, tileL - oxL + 0.5, hemY - canTop);
              }
              if (!je) {
                ctx.fillStyle = style.b;
                ctx.fillRect(tileR, canTop, oxR - tileR, hemY - canTop);
              }
            } else {
              ctx.fillStyle = style.a;
              ctx.fillRect(oxL, canTop, oxR - oxL, hemY - canTop);
              if (style.kind === 'chevron') {
                ctx.fillStyle = style.b;
                ctx.fillRect(oxL, hemY - s * 0.08, oxR - oxL, s * 0.08);
              }
            }
            // The cloth answers the same wind the grass feels: broad
            // shimmer swells, a sun-warmed hem, a shaded back lip.
            ctx.fillStyle = `rgba(255, 252, 235, ${0.03 + 0.04 * Math.max(0, wind.l)})`;
            ctx.fillRect(oxL, canTop, oxR - oxL, hemY - canTop);
            ctx.fillStyle = 'rgba(255, 235, 200, 0.1)';
            ctx.fillRect(oxL, hemY - s * 0.05, oxR - oxL, s * 0.05);
            ctx.fillStyle = 'rgba(20, 14, 28, 0.22)';
            ctx.fillRect(oxL, canTop, oxR - oxL, s * 0.04);
            // Valance: the hanging hem. Tips lean with the gusts, each
            // a beat out of phase with its neighbour.
            const gust = 0.6 + 0.35 * Math.max(0, wind.s);
            for (let k = 0; k < 4; k++) {
              const vx = tileL + k * bandW;
              const lean =
                (wind.bx * 0.4 + Math.sin(t * 2.2 + tx * 1.3 + k * 1.9) * 0.5) * s * 0.06 * gust;
              if (style.kind === 'solid') {
                ctx.fillStyle = style.a;
                ctx.beginPath();
                ctx.moveTo(vx, hemY);
                ctx.lineTo(vx + bandW, hemY);
                ctx.lineTo(vx + bandW * 0.78 + lean * 0.6, tipY + s * 0.02);
                ctx.lineTo(vx + bandW * 0.22 + lean, tipY);
                ctx.closePath();
                ctx.fill();
              } else {
                ctx.fillStyle =
                  style.kind === 'chevron'
                    ? k % 2 === 0
                      ? style.b
                      : style.a
                    : k % 2 === 0
                      ? style.a
                      : style.b;
                ctx.beginPath();
                ctx.moveTo(vx, hemY);
                ctx.lineTo(vx + bandW, hemY);
                ctx.lineTo(vx + bandW * 0.5 + lean, tipY);
                ctx.closePath();
                ctx.fill();
              }
            }
            if (style.kind === 'solid') {
              // The trim line the merchant sewed on.
              ctx.fillStyle = style.b;
              ctx.fillRect(tileL, hemY - s * 0.018, s, s * 0.036);
            }
          },
        };
      }

      case Tile.BannerPole: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.14;
        const pal = (['#7a3f8f', '#a8433a', '#2e7d72', '#31589c'] as const)[h % 4]!;
        // A civic standard: the crossarm rides well above head height.
        const ph = s * 1.85;
        return {
          sortY: ty + 0.8,
          body: stationBody(0.7, 2.6, 0.5),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.75);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade + two-step stone foot.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY + s * 0.02, s * 0.17, s * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5b5566';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY, s * 0.14, 6, 0.2, 0.6);
            ctx.fill();
            ctx.fillStyle = '#6a6577';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY - s * 0.05, s * 0.1, 6, 0.2, 0.6);
            ctx.fill();
            // Tapered iron pole, west edge catching light, crossarm
            // with a brace, gold finial.
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.045, baseY);
            ctx.lineTo(p.x + s * 0.03, baseY - ph);
            ctx.lineTo(p.x - s * 0.03, baseY - ph);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#454052';
            ctx.fillRect(p.x - s * 0.035, baseY - ph * 0.92, s * 0.02, ph * 0.84);
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - s * 0.03, baseY - ph, s * 0.42, s * 0.05);
            ctx.beginPath();
            ctx.moveTo(p.x + s * 0.03, baseY - ph + s * 0.16);
            ctx.lineTo(p.x + s * 0.22, baseY - ph + s * 0.05);
            ctx.lineTo(p.x + s * 0.22, baseY - ph + s * 0.1);
            ctx.lineTo(p.x + s * 0.05, baseY - ph + s * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#c9962e';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY - ph - s * 0.05, s * 0.05, 6, 0.5);
            ctx.fill();
            // The banner: a long swallowtail drop. The hoist swings as
            // one (primary); the tails trail a beat behind (secondary)
            // so the cloth ripples instead of stiffly tilting.
            const sway = Math.sin(t * 1.4 + tx * 1.7 + ty) * s * 0.045;
            const lag = Math.sin(t * 1.4 + tx * 1.7 + ty - 0.8) * s * 0.055;
            const bx0 = p.x + s * 0.07;
            const bw2 = s * 0.34;
            const by0 = baseY - ph + s * 0.06;
            const bl = s * 1.05;
            ctx.fillStyle = pal;
            ctx.beginPath();
            ctx.moveTo(bx0, by0);
            ctx.lineTo(bx0 + bw2, by0);
            ctx.lineTo(bx0 + bw2 + sway * 0.5, by0 + bl * 0.55);
            ctx.lineTo(bx0 + bw2 + lag, by0 + bl);
            ctx.lineTo(bx0 + bw2 * 0.5 + lag, by0 + bl - s * 0.16);
            ctx.lineTo(bx0 + lag, by0 + bl);
            ctx.lineTo(bx0 + sway * 0.5, by0 + bl * 0.55);
            ctx.closePath();
            ctx.fill();
            // The cloth folds: a shaded inner panel below the emblem.
            ctx.fillStyle = shade(pal, -12);
            ctx.beginPath();
            ctx.moveTo(bx0 + bw2 * 0.32, by0 + bl * 0.55);
            ctx.lineTo(bx0 + bw2 * 0.44, by0 + bl * 0.55);
            ctx.lineTo(bx0 + bw2 * 0.4 + lag * 0.7, by0 + bl * 0.9);
            ctx.lineTo(bx0 + bw2 * 0.28 + lag * 0.7, by0 + bl * 0.9);
            ctx.closePath();
            ctx.fill();
            // A lighter chevron emblem at the hoist.
            ctx.fillStyle = shade(pal, 26);
            ctx.beginPath();
            ctx.moveTo(bx0 + bw2 * 0.2, by0 + bl * 0.18);
            ctx.lineTo(bx0 + bw2 * 0.5, by0 + bl * 0.32);
            ctx.lineTo(bx0 + bw2 * 0.8, by0 + bl * 0.18);
            ctx.lineTo(bx0 + bw2 * 0.8, by0 + bl * 0.27);
            ctx.lineTo(bx0 + bw2 * 0.5, by0 + bl * 0.41);
            ctx.lineTo(bx0 + bw2 * 0.2, by0 + bl * 0.27);
            ctx.closePath();
            ctx.fill();
          },
        };
      }

      case Tile.HangingSign: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.14;
        // The shingle hangs above head height, as a shop sign must.
        const ph = s * 1.55;
        return {
          sortY: ty + 0.8,
          body: stationBody(0.85, 2.4, 0.45),
          drawShadow: () => this.castEdgeQuad(p.x - s * 0.18, baseY, p.x - s * 0.06, baseY, 1.45),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade at the post foot.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x - s * 0.12, baseY + s * 0.015, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            // Post + bracket arm with a 45° knee brace.
            ctx.fillStyle = '#5e3f1e';
            ctx.fillRect(p.x - s * 0.16, baseY - ph, s * 0.09, ph);
            ctx.fillRect(p.x - s * 0.16, baseY - ph, s * 0.5, s * 0.065);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.07, baseY - ph + s * 0.28);
            ctx.lineTo(p.x + s * 0.14, baseY - ph + s * 0.07);
            ctx.lineTo(p.x + s * 0.14, baseY - ph + s * 0.13);
            ctx.lineTo(p.x - s * 0.07, baseY - ph + s * 0.34);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade('#5e3f1e', 14);
            ctx.fillRect(p.x - s * 0.145, baseY - ph + s * 0.01, s * 0.04, ph - s * 0.02);
            // The shingle swings on two ropes; the board lags a
            // fraction behind the arm's phase so it feels hung, not
            // welded (secondary motion).
            const swing = Math.sin(t * 1.6 + tx * 2.3) * 0.07;
            const bob = Math.sin(t * 1.6 + tx * 2.3 - 0.5) * s * 0.012;
            const ax = p.x + s * 0.2;
            const ay = baseY - ph + s * 0.065;
            ctx.save();
            ctx.translate(ax, ay + bob);
            ctx.rotate(swing);
            ctx.strokeStyle = '#b8a888';
            ctx.lineWidth = Math.max(1, s * 0.028);
            ctx.beginPath();
            ctx.moveTo(-s * 0.13, 0);
            ctx.lineTo(-s * 0.13, s * 0.11);
            ctx.moveTo(s * 0.13, 0);
            ctx.lineTo(s * 0.13, s * 0.11);
            ctx.stroke();
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            chamferRect(ctx, -s * 0.22, s * 0.11, s * 0.44, s * 0.32, s * 0.04);
            ctx.fill();
            ctx.fillStyle = shade('#a5793f', 14);
            ctx.fillRect(-s * 0.2, s * 0.12, s * 0.4, s * 0.03);
            ctx.fillStyle = shade('#a5793f', -14);
            ctx.beginPath();
            chamferRect(ctx, -s * 0.17, s * 0.16, s * 0.34, s * 0.22, s * 0.025);
            ctx.fill();
            // The device: a simple tankard silhouette with a handle.
            ctx.fillStyle = '#e8dfc8';
            ctx.fillRect(-s * 0.055, s * 0.2, s * 0.1, s * 0.13);
            ctx.fillRect(s * 0.05, s * 0.23, s * 0.035, s * 0.06);
            ctx.fillStyle = 'rgba(36, 22, 10, 0.35)';
            ctx.fillRect(-s * 0.055, s * 0.215, s * 0.1, s * 0.02);
            ctx.restore();
          },
        };
      }

      /**
       * THE ROADSIDE POST — the sign that stands on its own.
       *
       * The shingle above hangs off a building and names it; this one
       * is planted in the ground at a fork or a gate and carries a
       * board you read head-on. Two planks (a wide name board and a
       * narrower slat under it) on a squared post, each showing its
       * foreshortened TOP plane so the casework reads 2.5D and not as
       * flat elevation. Rigid by nature — a driven post does not sway
       * — which is exactly why it can idle in the static ring cache.
       *
       * Ink strokes only appear on a board that HAS words (the
       * renderer asks signHasText): a freshly raised, unwritten post
       * must read blank, or a player would go read a sign that says
       * nothing.
       */
      case Tile.Signpost: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.2;
        const ph = s * 1.18; // post height — board sits at head height
        const written = this.signHasText?.(tx, ty) ?? false;
        const POST = '#6b4a24';
        const BOARD = '#c2a068';
        return {
          sortY: ty + 0.62,
          body: stationBody(0.9, 1.9, 0.45),
          drawShadow: () => this.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.15),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade + the little heap of earth it was driven into.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY + s * 0.01, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5a4a34';
            ctx.beginPath();
            ctx.ellipse(p.x, baseY - s * 0.01, s * 0.11, s * 0.042, 0, 0, Math.PI * 2);
            ctx.fill();

            // The post: lit west flank, shaded east flank (the sun law).
            ctx.fillStyle = POST;
            ctx.fillRect(p.x - s * 0.055, baseY - ph, s * 0.11, ph);
            ctx.fillStyle = shade(POST, 14);
            ctx.fillRect(p.x - s * 0.055, baseY - ph, s * 0.035, ph);
            ctx.fillStyle = shade(POST, -16);
            ctx.fillRect(p.x + s * 0.028, baseY - ph, s * 0.027, ph);
            // Sawn cap: the post's own top plane, foreshortened.
            ctx.fillStyle = shade(POST, 26);
            ctx.beginPath();
            ctx.ellipse(p.x, baseY - ph, s * 0.055, s * 0.022, 0, 0, Math.PI * 2);
            ctx.fill();

            /** One plank: face, foreshortened top plane, nails, ink. */
            const plank = (
              cy: number,
              hw: number,
              hh: number,
              inkRows: number,
              inkWide: number,
            ): void => {
              const top = cy - hh;
              // The top plane — a tilted bird's-eye sliver, the law
              // every piece of tall casework here keeps.
              ctx.fillStyle = shade(BOARD, 22);
              ctx.beginPath();
              ctx.moveTo(p.x - hw, top);
              ctx.lineTo(p.x + hw, top);
              ctx.lineTo(p.x + hw * 0.93, top - syT * 0.09);
              ctx.lineTo(p.x - hw * 0.93, top - syT * 0.09);
              ctx.closePath();
              ctx.fill();
              // The face.
              ctx.fillStyle = BOARD;
              ctx.beginPath();
              chamferRect(ctx, p.x - hw, top, hw * 2, hh * 2, s * 0.035);
              ctx.fill();
              // Grain seam + the shaded under-lip that seats the plank.
              ctx.fillStyle = shade(BOARD, -12);
              ctx.fillRect(p.x - hw * 0.94, cy + hh - s * 0.035, hw * 1.88, s * 0.035);
              ctx.fillStyle = shade(BOARD, -22);
              ctx.fillRect(p.x + hw - s * 0.03, top + s * 0.02, s * 0.03, hh * 2 - s * 0.04);
              // Two forged nails holding it to the post.
              ctx.fillStyle = '#3f3730';
              for (const nx of [-hw * 0.72, hw * 0.72]) {
                ctx.beginPath();
                ctx.arc(p.x + nx, cy, s * 0.018, 0, Math.PI * 2);
                ctx.fill();
              }
              if (!written) return;
              // The writing: struck marks, never letters — real glyphs
              // at world scale turn to mud. The HUD carries the words.
              ctx.fillStyle = 'rgba(48, 32, 16, 0.62)';
              for (let r = 0; r < inkRows; r++) {
                const w = hw * inkWide * (r === 0 ? 1 : 0.78 - r * 0.06);
                const ry = cy - hh * 0.42 + r * hh * 0.55;
                ctx.fillRect(p.x - w, ry, w * 2, Math.max(1, s * (r === 0 ? 0.035 : 0.022)));
              }
            };

            // Name board, then the narrower slat beneath it.
            plank(baseY - ph + s * 0.22, s * 0.42, s * 0.18, 2, 0.62);
            plank(baseY - ph + s * 0.58, s * 0.3, s * 0.1, 1, 0.5);
          },
        };
      }

      case Tile.FlowerBox: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.24;
        const BLOOMS = ['#d977a8', '#e8c06a', '#f0ede4', '#8f9ed6'];
        return {
          sortY: ty + 0.6,
          body: stationBody(0.7, 0.85, 0.45),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade + planter on little feet.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.fillRect(p.x - s * 0.36, baseY - s * 0.005, s * 0.72, s * 0.04);
            ctx.fillStyle = '#6f4d26';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.36, baseY - s * 0.24, s * 0.72, s * 0.24, s * 0.03);
            ctx.fill();
            ctx.fillStyle = shade('#6f4d26', 12);
            ctx.fillRect(p.x - s * 0.36, baseY - s * 0.24, s * 0.72, s * 0.04);
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(p.x - s * 0.32, baseY - s * 0.2, s * 0.64, s * 0.05);
            // Five blooms nodding gently out of phase — alive, not
            // plastic. Stems lean with their flower heads.
            for (let k = 0; k < 5; k++) {
              const hh = hashCoords(61 + k, tx, ty);
              const nod = Math.sin(t * 1.8 + hh * 0.3) * s * 0.012;
              const fx = p.x - s * 0.26 + k * s * 0.13 + ((hh % 5) - 2) * s * 0.01;
              const fy = baseY - s * 0.32 - ((hh >> 4) % 4) * s * 0.025;
              ctx.strokeStyle = '#5f8a44';
              ctx.lineWidth = Math.max(1, s * 0.024);
              ctx.beginPath();
              ctx.moveTo(fx, baseY - s * 0.2);
              ctx.lineTo(fx + nod, fy + s * 0.02);
              ctx.stroke();
              ctx.fillStyle = BLOOMS[hh % BLOOMS.length]!;
              ctx.beginPath();
              facetCircle(ctx, fx + nod, fy, s * 0.055, 6, (hh % 7) * 0.3);
              ctx.fill();
              ctx.fillStyle = 'rgba(255, 244, 200, 0.7)';
              ctx.beginPath();
              facetCircle(ctx, fx + nod, fy, s * 0.018, 6, (hh % 7) * 0.3);
              ctx.fill();
            }
          },
        };
      }

      case Tile.ToolRack:
      case Tile.WeaponRack: {
        const weapons = tile === Tile.WeaponRack;
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.28;
        // A built rack, not a painted card: two chunky posts carrying
        // a capped head beam, a recessed pegboard between them, and a
        // footing shelf in plan with the day's stock standing on it.
        // Head beam at the body's crown so the wall of tools reads
        // armory-scale beside the rig.
        const bw = s * 0.98;
        const bh2 = s * 1.48;
        const post = '#5e3f1e';
        const pw = s * 0.11;
        return {
          sortY: ty + 0.74,
          body: stationBody(0.85, 1.85, 0.6),
          drawShadow: () => this.castEdgeQuad(p.x - bw / 2, baseY, p.x + bw / 2, baseY, 1.35),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade under both feet.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(p.x - bw / 2 - s * 0.02, baseY - s * 0.015, bw + s * 0.04, s * 0.05);
            // The recessed pegboard: clearly darker than the frame so
            // the tools hang IN a case, with plank seams and a shadow
            // reveal under the head beam where the board sets back.
            ctx.fillStyle = shade(post, -26);
            ctx.fillRect(p.x - bw / 2 + pw * 0.6, baseY - bh2 + s * 0.1, bw - pw * 1.2, bh2 - s * 0.42);
            ctx.fillStyle = 'rgba(18, 12, 26, 0.4)';
            ctx.fillRect(p.x - bw / 2 + pw * 0.6, baseY - bh2 + s * 0.1, bw - pw * 1.2, s * 0.05);
            ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(p.x - bw / 2 + pw * 0.8 + ((i + 1) * (bw - pw * 1.6)) / 4, baseY - bh2 + s * 0.12, s * 0.018, bh2 - s * 0.46);
            }
            // The footing shelf: a foreshortened plank plane spanning
            // the posts just off the floor — stock stands ON it.
            const shY = baseY - s * 0.12;
            const shD = syT * 0.26;
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            chamferRect(ctx, p.x - bw / 2 + s * 0.02, shY - shD, bw - s * 0.04, shD + s * 0.05, s * 0.03);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade('#7a552e', 14);
            ctx.fillRect(p.x - bw / 2 + s * 0.05, shY + s * 0.015, bw - s * 0.1, s * 0.032);
            if (weapons) {
              // The shelf keeps a quiver drum bristling with arrows.
              const qx = p.x + bw * 0.26;
              ctx.fillStyle = '#6f4d26';
              ctx.fillRect(qx - s * 0.075, shY - shD * 0.5 - s * 0.2, s * 0.15, s * 0.2);
              ctx.fillStyle = shade('#6f4d26', -14);
              ctx.fillRect(qx - s * 0.075, shY - shD * 0.5 - s * 0.21, s * 0.15, s * 0.03);
              ctx.fillStyle = '#8a6534';
              for (const ax of [-0.04, 0.005, 0.045] as const) {
                ctx.fillRect(qx + ax * s - s * 0.01, shY - shD * 0.5 - s * 0.4, s * 0.02, s * 0.2);
              }
              ctx.fillStyle = '#d8cbb0';
              for (const ax of [-0.04, 0.005, 0.045] as const) {
                ctx.fillRect(qx + ax * s - s * 0.022, shY - shD * 0.5 - s * 0.44, s * 0.044, s * 0.045);
              }
            } else {
              // The shelf keeps a slack bucket and a stack of stock
              // bars waiting for the fire.
              const bx2 = p.x - bw * 0.26;
              ctx.fillStyle = '#4f4a5c';
              ctx.beginPath();
              ctx.moveTo(bx2 - s * 0.085, shY - shD * 0.5 - s * 0.17);
              ctx.lineTo(bx2 + s * 0.085, shY - shD * 0.5 - s * 0.17);
              ctx.lineTo(bx2 + s * 0.065, shY - shD * 0.5);
              ctx.lineTo(bx2 - s * 0.065, shY - shD * 0.5);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#3a629e';
              ctx.beginPath();
              facetCircle(ctx, bx2, shY - shD * 0.5 - s * 0.165, s * 0.062, 6, 0.3, 0.5);
              ctx.fill();
              ctx.fillStyle = '#767181';
              for (let i = 0; i < 3; i++) {
                ctx.fillRect(p.x + bw * 0.1 - i * s * 0.02, shY - shD * 0.5 - s * (0.035 + i * 0.035), s * 0.3, s * 0.035);
                ctx.fillStyle = i === 0 ? '#8b8697' : '#767181';
              }
            }
            // Posts: west face lit, east shaded, each crowned with a
            // little foreshortened cap plane — the tilted camera sees
            // the top of every upright in town.
            for (const sd of [-1, 1] as const) {
              const px2 = p.x + sd * (bw / 2 - pw / 2);
              ctx.fillStyle = shade(post, 8);
              ctx.fillRect(px2 - pw / 2, baseY - bh2, pw, bh2);
              ctx.fillStyle = shade(post, sd < 0 ? 20 : -10);
              ctx.fillRect(px2 + (sd < 0 ? -pw / 2 : pw / 2 - s * 0.032), baseY - bh2, s * 0.032, bh2);
              // Splayed foot pad.
              ctx.fillStyle = shade(post, -8);
              ctx.fillRect(px2 - pw * 0.72, baseY - s * 0.07, pw * 1.44, s * 0.07);
            }
            // The head beam ties the posts, capped with a lit
            // foreshortened top plane and a sunlit front arris.
            const hbY = baseY - bh2;
            const hbD = syT * 0.2;
            ctx.fillStyle = shade(post, 4);
            ctx.fillRect(p.x - bw / 2 - s * 0.045, hbY, bw + s * 0.09, s * 0.13);
            ctx.fillStyle = shade(post, 16);
            ctx.beginPath();
            chamferRect(ctx, p.x - bw / 2 - s * 0.045, hbY - hbD, bw + s * 0.09, hbD + s * 0.02, s * 0.03);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(post, 6);
            ctx.fillRect(p.x - bw / 2, hbY - hbD + s * 0.014, bw, s * 0.024);
            ctx.fillStyle = shade(post, 28);
            ctx.fillRect(p.x - bw / 2 - s * 0.045, hbY + s * 0.1, bw + s * 0.09, s * 0.03);
            // Every hung piece throws a soft drop shadow on the board
            // — offset dark ghosts that pull the iron off the wood.
            const midY = baseY - bh2 * 0.52;
            if (weapons) {
              // Crossed spears behind, a longsword hung point-down in
              // front, a round shield leaning on the west post.
              for (const sd of [-1, 1] as const) {
                ctx.save();
                ctx.translate(p.x + sd * s * 0.06, midY);
                ctx.rotate(sd * 0.2);
                ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
                ctx.fillRect(-s * 0.028 + s * 0.025, -bh2 * 0.4 + s * 0.03, s * 0.056, bh2 * 0.78);
                ctx.fillStyle = '#8a6534';
                ctx.fillRect(-s * 0.028, -bh2 * 0.4, s * 0.056, bh2 * 0.78);
                ctx.fillStyle = shade('#8a6534', 12);
                ctx.fillRect(-s * 0.028, -bh2 * 0.4, s * 0.02, bh2 * 0.78);
                ctx.fillStyle = '#b6bcc6';
                ctx.beginPath();
                ctx.moveTo(-s * 0.055, -bh2 * 0.4);
                ctx.lineTo(s * 0.055, -bh2 * 0.4);
                ctx.lineTo(0, -bh2 * 0.54);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = shade('#b6bcc6', -18);
                ctx.beginPath();
                ctx.moveTo(0, -bh2 * 0.4);
                ctx.lineTo(s * 0.055, -bh2 * 0.4);
                ctx.lineTo(0, -bh2 * 0.54);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
              }
              // The longsword: fuller, cross guard, wrapped grip.
              const swx = p.x + bw * 0.3;
              ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
              ctx.fillRect(swx - s * 0.026 + s * 0.025, midY - bh2 * 0.26 + s * 0.03, s * 0.052, bh2 * 0.5);
              ctx.fillStyle = '#b6bcc6';
              ctx.fillRect(swx - s * 0.026, midY - bh2 * 0.26, s * 0.052, bh2 * 0.46);
              ctx.beginPath();
              ctx.moveTo(swx - s * 0.026, midY + bh2 * 0.2);
              ctx.lineTo(swx + s * 0.026, midY + bh2 * 0.2);
              ctx.lineTo(swx, midY + bh2 * 0.26);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = 'rgba(58, 62, 74, 0.5)';
              ctx.fillRect(swx - s * 0.007, midY - bh2 * 0.24, s * 0.014, bh2 * 0.4);
              ctx.fillStyle = '#c9962e';
              ctx.fillRect(swx - s * 0.085, midY - bh2 * 0.28, s * 0.17, s * 0.045);
              ctx.fillStyle = '#6f4d26';
              ctx.fillRect(swx - s * 0.024, midY - bh2 * 0.28 - s * 0.11, s * 0.048, s * 0.11);
              ctx.fillStyle = '#c9962e';
              ctx.beginPath();
              facetCircle(ctx, swx, midY - bh2 * 0.28 - s * 0.13, s * 0.032, 6, 0.3);
              ctx.fill();
              // The shield rests against the west post, rim lit.
              const shx = p.x - bw * 0.34;
              ctx.fillStyle = 'rgba(18, 12, 26, 0.25)';
              ctx.beginPath();
              ctx.ellipse(shx, baseY - s * 0.01, s * 0.2, s * 0.055, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#8a3d3d';
              ctx.beginPath();
              facetCircle(ctx, shx, baseY - s * 0.26, s * 0.24, 8, 0.2, 1);
              ctx.fill();
              ctx.strokeStyle = '#c9962e';
              ctx.lineWidth = Math.max(1.5, s * 0.035);
              ctx.beginPath();
              facetCircle(ctx, shx, baseY - s * 0.26, s * 0.185, 8, 0.2, 1);
              ctx.stroke();
              ctx.fillStyle = '#c9962e';
              ctx.beginPath();
              facetCircle(ctx, shx, baseY - s * 0.26, s * 0.055, 6, 0.3);
              ctx.fill();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
              ctx.beginPath();
              facetCircle(ctx, shx - s * 0.07, baseY - s * 0.33, s * 0.09, 6, 0.5);
              ctx.fill();
            } else {
              // The smith's wall: cross-peen sledge, long tongs, a
              // file, and a lucky horseshoe on its own peg.
              const hang = (hx: number, hy: number) => {
                ctx.fillStyle = '#2c2836';
                ctx.fillRect(hx - s * 0.02, hy - s * 0.02, s * 0.04, s * 0.04);
              };
              // Sledge: haft angled, head heavy, shadow first.
              ctx.save();
              ctx.translate(p.x - bw * 0.24, midY - bh2 * 0.06);
              ctx.rotate(0.1);
              ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
              ctx.fillRect(-s * 0.03 + s * 0.025, -bh2 * 0.3 + s * 0.03, s * 0.06, bh2 * 0.58);
              ctx.fillRect(-s * 0.135 + s * 0.025, -bh2 * 0.3 - s * 0.082 + s * 0.03, s * 0.27, s * 0.115);
              ctx.fillStyle = '#8a6534';
              ctx.fillRect(-s * 0.03, -bh2 * 0.3, s * 0.06, bh2 * 0.58);
              ctx.fillStyle = shade('#8a6534', 12);
              ctx.fillRect(-s * 0.03, -bh2 * 0.3, s * 0.022, bh2 * 0.58);
              ctx.fillStyle = '#8b8697';
              ctx.fillRect(-s * 0.135, -bh2 * 0.3 - s * 0.082, s * 0.27, s * 0.115);
              ctx.fillStyle = shade('#8b8697', 14);
              ctx.fillRect(-s * 0.135, -bh2 * 0.3 - s * 0.082, s * 0.27, s * 0.032);
              ctx.fillStyle = shade('#8b8697', -16);
              ctx.fillRect(s * 0.075, -bh2 * 0.3 - s * 0.082, s * 0.06, s * 0.115);
              ctx.restore();
              // Long forge tongs, jaws down, bows slightly apart.
              for (const sd of [-1, 1] as const) {
                ctx.save();
                ctx.translate(p.x + s * 0.09 + sd * s * 0.028, midY - bh2 * 0.02);
                ctx.rotate(sd * 0.1);
                ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
                ctx.fillRect(-s * 0.021 + s * 0.02, -bh2 * 0.3 + s * 0.03, s * 0.042, bh2 * 0.56);
                ctx.fillStyle = '#767181';
                ctx.fillRect(-s * 0.021, -bh2 * 0.3, s * 0.042, bh2 * 0.56);
                ctx.fillStyle = shade('#767181', sd < 0 ? 10 : -12);
                ctx.fillRect(-s * 0.021, -bh2 * 0.3, s * 0.016, bh2 * 0.56);
                ctx.restore();
              }
              ctx.fillStyle = '#565162';
              ctx.fillRect(p.x + s * 0.055, midY - bh2 * 0.34, s * 0.07, s * 0.05);
              // A broad flat file with a turned wooden handle.
              ctx.save();
              ctx.translate(p.x + bw * 0.3, midY - bh2 * 0.04);
              ctx.rotate(-0.06);
              ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
              ctx.fillRect(-s * 0.026 + s * 0.022, -bh2 * 0.26 + s * 0.03, s * 0.052, bh2 * 0.44);
              ctx.fillStyle = '#9aa2ac';
              ctx.fillRect(-s * 0.026, -bh2 * 0.26, s * 0.052, bh2 * 0.38);
              ctx.fillStyle = 'rgba(58, 62, 74, 0.45)';
              for (let i = 0; i < 4; i++) {
                ctx.fillRect(-s * 0.026, -bh2 * 0.24 + i * bh2 * 0.085, s * 0.052, s * 0.012);
              }
              ctx.fillStyle = '#6f4d26';
              ctx.fillRect(-s * 0.03, -bh2 * 0.26 - s * 0.085, s * 0.06, s * 0.085);
              ctx.restore();
              // The horseshoe, heels down — luck kept the right way up.
              const hsx = p.x - bw * 0.05;
              const hsy = midY - bh2 * 0.34;
              ctx.strokeStyle = 'rgba(18, 12, 26, 0.28)';
              ctx.lineWidth = Math.max(2, s * 0.05);
              ctx.beginPath();
              ctx.arc(hsx + s * 0.022, hsy + s * 0.028, s * 0.07, Math.PI * 0.85, Math.PI * 2.15);
              ctx.stroke();
              ctx.strokeStyle = '#8b8697';
              ctx.beginPath();
              ctx.arc(hsx, hsy, s * 0.07, Math.PI * 0.85, Math.PI * 2.15);
              ctx.stroke();
              // Pegs above each hung tool.
              hang(p.x - bw * 0.26, midY - bh2 * 0.37);
              hang(p.x + s * 0.09, midY - bh2 * 0.33);
              hang(p.x + bw * 0.29, midY - bh2 * 0.31);
            }
          },
        };
      }

      case Tile.Vault: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.24;
        // A strongroom door of a thing — taller than the teller.
        const vw = s * 0.88;
        const vh = s * 1.45;
        return {
          sortY: ty + 0.75,
          body: stationBody(0.8, 1.7, 0.55),
          drawShadow: () => this.castEdgeQuad(p.x - vw / 2, baseY, p.x + vw / 2, baseY, 1.35),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade, then the iron mass on stub feet.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.fillRect(p.x - vw / 2 - s * 0.02, baseY - s * 0.01, vw + s * 0.04, s * 0.05);
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - vw / 2 + s * 0.05, baseY - s * 0.06, s * 0.1, s * 0.06);
            ctx.fillRect(p.x + vw / 2 - s * 0.15, baseY - s * 0.06, s * 0.1, s * 0.06);
            ctx.fillStyle = '#3f3a4a';
            ctx.beginPath();
            chamferRect(ctx, p.x - vw / 2, baseY - vh, vw, vh - s * 0.04, s * 0.06);
            ctx.fill();
            // The door leaf sits recessed in its frame, with a lit
            // reveal along the top of both frame and leaf.
            ctx.fillStyle = shade('#3f3a4a', -8);
            ctx.beginPath();
            chamferRect(ctx, p.x - vw / 2 + s * 0.07, baseY - vh + s * 0.1, vw - s * 0.14, vh - s * 0.22, s * 0.05);
            ctx.fill();
            ctx.fillStyle = shade('#3f3a4a', 14);
            ctx.fillRect(p.x - vw / 2 + s * 0.04, baseY - vh + s * 0.04, vw - s * 0.08, s * 0.05);
            ctx.fillStyle = shade('#3f3a4a', 8);
            ctx.fillRect(p.x - vw / 2 + s * 0.09, baseY - vh + s * 0.12, vw - s * 0.18, s * 0.035);
            // Hinge knuckles on the west jamb — this door swings, and
            // it swings HEAVY.
            ctx.fillStyle = '#2c2836';
            for (const hy of [0.22, 0.52, 0.82]) {
              ctx.beginPath();
              chamferRect(ctx, p.x - vw / 2 - s * 0.035, baseY - vh * hy - s * 0.06, s * 0.09, s * 0.12, s * 0.025);
              ctx.fill();
              ctx.fillStyle = '#6a6577';
              ctx.fillRect(p.x - vw / 2 - s * 0.02, baseY - vh * hy - s * 0.05, s * 0.025, s * 0.1);
              ctx.fillStyle = '#2c2836';
            }
            ctx.fillStyle = '#c9962e';
            ctx.fillRect(p.x - vw / 2, baseY - vh * 0.78, vw, s * 0.05);
            ctx.fillRect(p.x - vw / 2, baseY - vh * 0.3, vw, s * 0.05);
            // The dial and its handle spokes, gold at the hub.
            ctx.fillStyle = '#8f96a3';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY - vh * 0.54, s * 0.14, 8, 0.4);
            ctx.fill();
            ctx.fillStyle = '#2c2836';
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY - vh * 0.54, s * 0.06, 6, 0.4);
            ctx.fill();
            ctx.fillStyle = '#8f96a3';
            ctx.fillRect(p.x - s * 0.02, baseY - vh * 0.54 - s * 0.2, s * 0.04, s * 0.4);
            ctx.fillRect(p.x - s * 0.2, baseY - vh * 0.54 - s * 0.02, s * 0.4, s * 0.04);
            ctx.fillStyle = '#d9a441';
            ctx.fillRect(p.x - s * 0.016, baseY - vh * 0.54 - s * 0.016, s * 0.032, s * 0.032);
            // A slow glint rides the dial rim — polished steel finds
            // the lamplight from any angle.
            const ga = t * 0.5 + h;
            ctx.fillStyle = 'rgba(235, 240, 255, 0.65)';
            ctx.fillRect(
              p.x + Math.cos(ga) * s * 0.115 - s * 0.014,
              baseY - vh * 0.54 + Math.sin(ga) * s * 0.115 - s * 0.014,
              s * 0.028,
              s * 0.028,
            );
            // Rivet rows down both edges of the frame.
            ctx.fillStyle = '#6a6577';
            for (let i = 0; i < 5; i++) {
              const ry = baseY - vh * (0.14 + i * 0.185);
              ctx.fillRect(p.x - vw / 2 + s * 0.015, ry, s * 0.04, s * 0.04);
              ctx.fillRect(p.x + vw / 2 - s * 0.055, ry, s * 0.04, s * 0.04);
            }
          },
        };
      }

      case Tile.Lectern: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.18;
        return {
          sortY: ty + 0.68,
          body: stationBody(0.6, 1.5, 0.45),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Foot, tapered column, slanted desk, open tome.
            ctx.fillStyle = '#5e3f1e';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.16, baseY - s * 0.07, s * 0.32, s * 0.07, s * 0.02);
            ctx.fill();
            ctx.fillStyle = '#6f4d26';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.08, baseY - s * 0.06);
            ctx.lineTo(p.x + s * 0.08, baseY - s * 0.06);
            ctx.lineTo(p.x + s * 0.055, baseY - s * 0.78);
            ctx.lineTo(p.x - s * 0.055, baseY - s * 0.78);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade('#6f4d26', 12);
            ctx.fillRect(p.x - s * 0.055, baseY - s * 0.74, s * 0.03, s * 0.62);
            // Slanted desk plate at the reader's ribs.
            ctx.fillStyle = '#8a6534';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.26, baseY - s * 0.76);
            ctx.lineTo(p.x + s * 0.26, baseY - s * 0.76);
            ctx.lineTo(p.x + s * 0.22, baseY - s * 0.95);
            ctx.lineTo(p.x - s * 0.22, baseY - s * 0.95);
            ctx.closePath();
            ctx.fill();
            // The open tome: two pages and a dark spine crease.
            ctx.fillStyle = '#e8dfc8';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.2, baseY - s * 0.8);
            ctx.lineTo(p.x - s * 0.01, baseY - s * 0.83);
            ctx.lineTo(p.x - s * 0.01, baseY - s * 0.95);
            ctx.lineTo(p.x - s * 0.18, baseY - s * 0.92);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(p.x + s * 0.01, baseY - s * 0.83);
            ctx.lineTo(p.x + s * 0.2, baseY - s * 0.8);
            ctx.lineTo(p.x + s * 0.18, baseY - s * 0.92);
            ctx.lineTo(p.x + s * 0.01, baseY - s * 0.95);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
            ctx.fillRect(p.x - s * 0.012, baseY - s * 0.95, s * 0.024, s * 0.13);
          },
        };
      }

      case Tile.Basin: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.2;
        return {
          sortY: ty + 0.62,
          body: stationBody(0.7, 1.1, 0.5),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade + stone trough with standing water.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(p.x - s * 0.42, baseY - s * 0.01, s * 0.84, s * 0.045);
            ctx.fillStyle = '#5b5566';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.42, baseY - s * 0.42, s * 0.84, s * 0.42, s * 0.06);
            ctx.fill();
            ctx.fillStyle = shade('#5b5566', -10);
            ctx.fillRect(p.x - s * 0.42, baseY - s * 0.1, s * 0.84, s * 0.1);
            ctx.fillStyle = shade('#5b5566', 16);
            ctx.fillRect(p.x - s * 0.4, baseY - s * 0.42, s * 0.8, s * 0.05);
            ctx.fillStyle = '#3d6fb8';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.33, baseY - s * 0.36, s * 0.66, s * 0.16, s * 0.04);
            ctx.fill();
            // A drifting glint keeps the water alive.
            const gx2 = p.x - s * 0.24 + ((t * 0.15 + h * 0.1) % 1) * s * 0.4;
            ctx.fillStyle = 'rgba(214, 230, 255, 0.5)';
            ctx.fillRect(gx2, baseY - s * 0.31, s * 0.09, s * 0.025);
          },
        };
      }

      case Tile.Campfire: {
        const flicker = 0.85 + Math.sin(t * 12 + h) * 0.1 + Math.sin(t * 23) * 0.05;
        return {
          sortY: ty + 0.7,
          body: stationBody(0.8, 1.35, 0.55),
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // COOKING: the fed fire roars a head taller, its coals
            // brighten, and it spits an extra ember.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            const fl2 = flicker * (1 + act * 0.28);
            // Warm light laps the ground around the ring first.
            ctx.fillStyle = `rgba(232, 122, 51, ${0.08 * flicker + 0.06 * act})`;
            ctx.beginPath();
            facetCircle(ctx, p.x, p.y + s * 0.08, s * 0.52, 8, 0.3, 0.55);
            ctx.fill();
            // Faceted stone ring + squared crossed logs, charred where
            // the fire has been chewing on them.
            ctx.fillStyle = '#6e6879';
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              facetCircle(ctx, p.x + Math.cos(a) * s * 0.3, p.y + Math.sin(a) * s * 0.2 + s * 0.08, s * 0.07, 5, a, 0.72);
              ctx.fill();
            }
            for (const rot of [-0.5, 0.6]) {
              ctx.save();
              ctx.translate(p.x, p.y + s * 0.06);
              ctx.rotate(rot);
              ctx.fillStyle = '#6b4a26';
              ctx.beginPath();
              chamferRect(ctx, -s * 0.22, -s * 0.045, s * 0.44, s * 0.09, s * 0.03);
              ctx.fill();
              ctx.fillStyle = '#3a2a20';
              ctx.fillRect(-s * 0.1, -s * 0.045, s * 0.2, s * 0.09);
              ctx.restore();
            }
            // The coal bed under the flames pulses out of phase.
            for (let i = 0; i < 3; i++) {
              const pulse = 0.45 + Math.sin(t * 3.2 + i * 2.1 + h) * 0.45;
              ctx.fillStyle = `rgba(240, 130, 50, ${Math.min(1, 0.35 + pulse * 0.5 + act * 0.25)})`;
              ctx.beginPath();
              facetCircle(ctx, p.x + (i - 1) * s * 0.09, p.y + s * 0.05, s * 0.05, 5, i * 1.3, 0.6);
              ctx.fill();
            }
            // Flame: two flat licks, flickering.
            ctx.fillStyle = '#e8823d';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.14 * fl2, p.y + s * 0.04);
            ctx.quadraticCurveTo(p.x - s * 0.1, p.y - s * 0.3 * fl2, p.x, p.y - s * 0.42 * fl2);
            ctx.quadraticCurveTo(p.x + s * 0.12, p.y - s * 0.26 * fl2, p.x + s * 0.14 * fl2, p.y + s * 0.04);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f2c94c';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.07 * fl2, p.y + s * 0.03);
            ctx.quadraticCurveTo(p.x, p.y - s * 0.18 * fl2, p.x + s * 0.02, p.y - s * 0.22 * fl2);
            ctx.quadraticCurveTo(p.x + s * 0.07, p.y - s * 0.1, p.x + s * 0.07 * fl2, p.y + s * 0.03);
            ctx.closePath();
            ctx.fill();
            // Embers spiral up and out of the light; a thin wisp of
            // smoke keeps going where they give up.
            for (let i = 0; i < 2 + (act > 0.3 ? 1 : 0); i++) {
              const ph = (t * (0.55 + i * 0.21) + h * 0.09 + i * 0.5) % 1;
              ctx.fillStyle = `rgba(255, 190, 110, ${(1 - ph) * 0.75})`;
              ctx.fillRect(
                p.x + Math.sin(t * 2.4 + i * 3 + h) * s * 0.08,
                p.y - s * 0.2 - ph * s * 0.42,
                s * 0.025,
                s * 0.025,
              );
            }
            const sp = (t * 0.3 + h * 0.13) % 1;
            ctx.fillStyle = `rgba(146, 140, 152, ${(1 - sp) * 0.22})`;
            ctx.beginPath();
            facetCircle(
              ctx,
              p.x + Math.sin(t * 0.8 + h) * s * 0.06 + sp * s * 0.1,
              p.y - s * 0.5 - sp * s * 0.4,
              s * (0.05 + sp * 0.07),
              6,
              sp * 2,
              0.8,
            );
            ctx.fill();
          },
        };
      }

      case Tile.CropSprout:
      case Tile.CarrotMid:
      case Tile.CarrotRipe:
      case Tile.SagewortMid:
      case Tile.SagewortRipe:
      case Tile.SunflowerMid:
      case Tile.SunflowerRipe:
      case Tile.WheatMid:
      case Tile.WheatRipe:
      case Tile.CottonMid:
      case Tile.CottonRipe:
      case Tile.MoonbellMid:
      case Tile.MoonbellRipe: {
        // Farm crops: walk-through rows, y-sorted so you wade behind
        // the tall ripe ones. Same cached-sprite path as wild flora —
        // outline ring baked in, real silhouette shadows (sprouts are
        // too low to bother casting one).
        const syT = s * this.camera.yScale;
        return {
          sortY: ty + 0.75,
          drawShadow:
            tile === Tile.CropSprout
              ? undefined
              : () => this.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
          draw: () => this.drawFlora(p.x, p.y, tx, ty, tile, h, t),
        };
      }

      case Tile.BerryBush:
      case Tile.FibrePlant:
      case Tile.WildSagewort:
      case Tile.WildMoonbell: {
        // Wild forage nodes are landmarks now (render/flora.ts) —
        // grown from the tile hash like trees, swaying on the one
        // shared wind field, twinkling their payload at idle.
        const syT = s * this.camera.yScale;
        return {
          sortY: ty + 0.78,
          // Ring baked into the cached sprite (drawFlora) — no body.
          drawShadow: () => this.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
          draw: () => this.drawFlora(p.x, p.y, tx, ty, tile, h, t),
        };
      }

      case Tile.Alembic: {
        const syT = s * this.camera.yScale;
        // The herbalist's bench on the table grammar: a full
        // plan-space top the tilted camera looks down onto, every
        // glass standing ON the plane with its own footprint.
        const th = s * 0.56;
        const xL = p.x - s * 0.48;
        const xR = p.x + s * 0.48;
        const yT = p.y - syT * 0.34;
        const yB = p.y + syT * 0.42;
        const topC = '#8f6a3c';
        const legC = '#5b4028';
        return {
          sortY: ty + 0.85,
          body: stationBody(1.0, 1.6, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.75);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            // Trestle legs with splayed feet, then the apron.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
            const leg = (lx: number, ly: number, hgt: number) => {
              ctx.fillStyle = legC;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.04, ly - hgt);
              ctx.lineTo(lx + s * 0.04, ly - hgt);
              ctx.lineTo(lx + s * 0.03, ly - s * 0.06);
              ctx.lineTo(lx + s * 0.054, ly);
              ctx.lineTo(lx - s * 0.054, ly);
              ctx.lineTo(lx - s * 0.03, ly - s * 0.06);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = shade(legC, -14);
              ctx.fillRect(lx - s * 0.054, ly - s * 0.02, s * 0.108, s * 0.02);
            };
            leg(xL + s * 0.08, yB, th + syT * 0.05);
            leg(xR - s * 0.08, yB, th + syT * 0.05);
            leg(xL + s * 0.08, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            leg(xR - s * 0.08, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            ctx.fillStyle = shade(legC, -4);
            ctx.fillRect(xL + s * 0.02, yB - th, xR - xL - s * 0.04, s * 0.085);
            // The top: one stained slab in plan, rimmed dark so the
            // bench never melts into floorboards.
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            ctx.fillStyle = shade(topC, 14);
            ctx.fillRect(xL + s * 0.01, yB - th - s * 0.042, xR - xL - s * 0.02, s * 0.042);
            ctx.fillStyle = shade(topC, -8);
            ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
            // Old stain rings and spill marks — years of tinctures.
            ctx.strokeStyle = 'rgba(46, 84, 74, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.02);
            ctx.beginPath();
            ctx.arc(p.x + s * 0.12, yT - th + (yB - yT) * 0.62, s * 0.07, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(74, 46, 84, 0.2)';
            ctx.beginPath();
            facetCircle(ctx, xL + s * 0.18, yT - th + (yB - yT) * 0.3, s * 0.05, 6, 0.7, 0.6);
            ctx.fill();
            // The back riser: a narrow raised shelf along the far
            // edge keeping the stock bottles up out of the work.
            const rsY = yT - th;
            const rsH = s * 0.3;
            ctx.fillStyle = shade(legC, 4);
            ctx.fillRect(xL + s * 0.04, rsY - rsH, xR - xL - s * 0.08, rsH * 0.55);
            ctx.fillStyle = shade(topC, 18);
            ctx.beginPath();
            chamferRect(ctx, xL + s * 0.03, rsY - rsH - syT * 0.1, xR - xL - s * 0.06, syT * 0.1 + s * 0.02, s * 0.02);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.022);
            ctx.stroke();
            // Stock bottles standing on the riser, house colors.
            for (const [bx2, bc, bh3] of [
              [-0.3, '#c9a8e8', 0.2],
              [-0.14, '#7fc9b3', 0.16],
              [0.06, '#d65a5a', 0.22],
              [0.24, '#8fd0e8', 0.17],
            ] as const) {
              const vx = p.x + bx2 * s;
              const vy = rsY - rsH * 0.55;
              ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
              ctx.fillRect(vx - s * 0.038, vy - s * bh3, s * 0.076, s * bh3);
              ctx.fillStyle = bc;
              ctx.fillRect(vx - s * 0.028, vy - s * bh3 * 0.62, s * 0.056, s * bh3 * 0.62 - s * 0.012);
              ctx.fillStyle = '#8a6534';
              ctx.fillRect(vx - s * 0.014, vy - s * bh3 - s * 0.03, s * 0.028, s * 0.03);
            }
            // The burner stands ON the plan: an iron tripod ring with
            // a flame always working softly, roaring while a brew is on.
            const flick = (0.85 + Math.sin(t * 11 + h) * 0.12) * (1 + act * 0.35);
            const bnx = p.x - s * 0.2;
            const bny = yT - th + (yB - yT) * 0.58;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(bnx, bny + s * 0.01, s * 0.1, s * 0.035, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4f4a5c';
            ctx.fillRect(bnx - s * 0.075, bny - s * 0.02, s * 0.03, s * 0.05);
            ctx.fillRect(bnx + s * 0.045, bny - s * 0.02, s * 0.03, s * 0.05);
            ctx.fillStyle = '#8a8494';
            ctx.beginPath();
            facetCircle(ctx, bnx, bny - s * 0.03, s * 0.085, 6, 0.3, 0.5);
            ctx.fill();
            ctx.fillStyle = `rgba(232, 130, 61, ${0.8 * flick})`;
            ctx.beginPath();
            ctx.moveTo(bnx - s * 0.05, bny - s * 0.05);
            ctx.quadraticCurveTo(bnx, bny - s * (0.16 + 0.1 * flick), bnx + s * 0.05, bny - s * 0.05);
            ctx.closePath();
            ctx.fill();
            // The retort rides the burner: a round-bellied flask of
            // teal brew on iron legs, neck climbing to the condenser.
            const rx = bnx;
            const ry = bny - s * 0.28;
            ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
            ctx.beginPath();
            facetCircle(ctx, rx, ry, s * 0.15, 8, 0.3, 0.85);
            ctx.fill();
            ctx.fillStyle = '#7fc9b3';
            ctx.beginPath();
            ctx.moveTo(rx - s * 0.12, ry + s * 0.02);
            ctx.lineTo(rx + s * 0.12, ry + s * 0.02);
            ctx.lineTo(rx + s * 0.095, ry + s * 0.12);
            ctx.lineTo(rx - s * 0.095, ry + s * 0.12);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(rx - s * 0.09, ry - s * 0.1, s * 0.03, s * 0.09);
            // Neck and coiled copper condenser arcing east to the
            // receiving vial standing on its own plan spot.
            ctx.fillStyle = 'rgba(214, 228, 240, 0.55)';
            ctx.fillRect(rx - s * 0.03, ry - s * 0.28, s * 0.06, s * 0.15);
            const cvx = p.x + s * 0.31;
            const cvy = yT - th + (yB - yT) * 0.52;
            ctx.strokeStyle = '#b87333';
            ctx.lineWidth = Math.max(1.5, s * 0.045);
            ctx.beginPath();
            ctx.moveTo(rx, ry - s * 0.27);
            ctx.quadraticCurveTo(p.x + s * 0.1, ry - s * 0.44, cvx - s * 0.02, ry - s * 0.2);
            ctx.quadraticCurveTo(cvx + s * 0.05, ry - s * 0.04, cvx, cvy - s * 0.22);
            ctx.stroke();
            // Coil rings on the downpipe.
            ctx.lineWidth = Math.max(1, s * 0.028);
            for (let i = 0; i < 3; i++) {
              const cy2 = ry - s * 0.14 + i * s * 0.1;
              ctx.beginPath();
              ctx.arc(cvx + s * 0.005, cy2, s * 0.048, -0.6, Math.PI + 0.6);
              ctx.stroke();
            }
            // The receiving vial under the condenser's spout.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(cvx, cvy + s * 0.01, s * 0.06, s * 0.025, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(214, 228, 240, 0.5)';
            ctx.fillRect(cvx - s * 0.045, cvy - s * 0.14, s * 0.09, s * 0.14);
            ctx.fillStyle = '#7fc9b3';
            ctx.fillRect(cvx - s * 0.033, cvy - s * 0.075, s * 0.066, s * 0.065);
            // Mortar and pestle mid-bench — the hand work.
            const mx = p.x + s * 0.06;
            const my = yT - th + (yB - yT) * 0.78;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(mx, my + s * 0.012, s * 0.085, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6e6879';
            ctx.beginPath();
            facetCircle(ctx, mx, my - s * 0.045, s * 0.085, 7, 0.2, 0.6);
            ctx.fill();
            ctx.fillStyle = '#544d64';
            ctx.beginPath();
            facetCircle(ctx, mx, my - s * 0.05, s * 0.058, 7, 0.2, 0.6);
            ctx.fill();
            ctx.fillStyle = '#8a6534';
            ctx.save();
            ctx.translate(mx + s * 0.05, my - s * 0.09);
            ctx.rotate(0.6);
            ctx.fillRect(-s * 0.018, -s * 0.09, s * 0.036, s * 0.11);
            ctx.restore();
            // A tied bundle of cut sagewort lying flat at the west
            // end — dried grey-green stems, twine round the waist.
            const hbx = xL + s * 0.15;
            const hby = yT - th + (yB - yT) * 0.74;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.beginPath();
            ctx.ellipse(hbx + s * 0.02, hby + s * 0.02, s * 0.11, s * 0.028, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#7a8a5c';
            ctx.lineWidth = Math.max(1.4, s * 0.034);
            for (const dy2 of [-0.026, 0, 0.026] as const) {
              ctx.beginPath();
              ctx.moveTo(hbx - s * 0.1, hby + dy2 * s * 1.3 + s * 0.01);
              ctx.lineTo(hbx + s * 0.1, hby + dy2 * s * 1.3 - s * 0.012);
              ctx.stroke();
            }
            ctx.fillStyle = '#9aab6e';
            for (const [lx2, ly2] of [
              [0.1, -0.045],
              [0.12, 0.005],
              [0.09, 0.04],
            ] as const) {
              ctx.beginPath();
              facetCircle(ctx, hbx + lx2 * s, hby + ly2 * s, s * 0.028, 5, lx2 * 9, 0.7);
              ctx.fill();
            }
            ctx.fillStyle = '#8a7248';
            ctx.fillRect(hbx - s * 0.045, hby - s * 0.035, s * 0.035, s * 0.07);
            // Bubbles climbing out of the retort's brew — a rolling
            // boil of them while the bench is working.
            for (let i = 0; i < (act > 0.05 ? 3 : 1); i++) {
              const bt = (t * (0.7 + i * 0.23) + h * 0.13 + i * 0.4) % 1;
              ctx.fillStyle = `rgba(230, 244, 240, ${0.6 * (1 - bt)})`;
              ctx.beginPath();
              ctx.arc(
                rx + Math.sin(t * 2 + h + i * 2.4) * s * 0.03 + (i - 1) * s * 0.02,
                ry - s * 0.02 - bt * s * 0.1,
                s * 0.022,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            // Distillate drips off the condenser into the vial, and a
            // curl of vapor stands off the retort neck while it works.
            if (act > 0.05) {
              const dp = (t * 1.15 + h * 0.19) % 1;
              ctx.fillStyle = `rgba(127, 201, 179, ${0.85 * act})`;
              ctx.fillRect(cvx - s * 0.011, cvy - s * 0.21 + dp * s * 0.1, s * 0.022, s * 0.035);
              const vp = (t * 0.5 + h * 0.23) % 1;
              ctx.fillStyle = `rgba(214, 236, 230, ${(1 - vp) * 0.3 * act})`;
              ctx.beginPath();
              facetCircle(ctx, rx + Math.sin(t * 1.3 + h) * s * 0.04, ry - s * 0.34 - vp * s * 0.22, s * (0.035 + vp * 0.05), 6, vp * 2, 0.8);
              ctx.fill();
            }
          },
        };
      }

      case Tile.TanningRack: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.34;
        // The leatherworker's frame rebuilt with true depth: two
        // A-frame ends whose legs splay north AND south in plan, a
        // round crossbar bridging them, and the hide slung over it.
        // Taller than the body — a hide is a big thing.
        const topY = baseY - s * 1.42;
        const rearY = baseY - syT * 0.44;
        const wood = '#5b4028';
        return {
          sortY: ty + 0.85,
          body: stationBody(0.95, 1.85, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.46, baseY, p.x + s * 0.46, baseY, 1.35);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            // Contact shade under all four feet.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.fillRect(p.x - s * 0.5, baseY - s * 0.015, s, s * 0.045);
            // Each end is an A: the rear leg runs up-and-north (thin,
            // shaded — depth the camera reads), the front leg stout
            // and lit. Feet tucked so the hide FILLS the frame.
            const crotchY = topY + s * 0.06;
            for (const sd of [-1, 1] as const) {
              const ax = p.x + sd * s * 0.46;
              // Rear leg first, falling to the rear ground line.
              ctx.strokeStyle = shade(wood, -16);
              ctx.lineWidth = Math.max(1.6, s * 0.05);
              ctx.beginPath();
              ctx.moveTo(ax - sd * s * 0.06, rearY);
              ctx.lineTo(ax, crotchY);
              ctx.stroke();
              // Front leg, splayed just a hair south, catching sun.
              ctx.strokeStyle = wood;
              ctx.lineWidth = Math.max(2.6, s * 0.09);
              ctx.beginPath();
              ctx.moveTo(ax + sd * s * 0.05, baseY);
              ctx.lineTo(ax, crotchY);
              ctx.stroke();
              ctx.strokeStyle = shade(wood, 12);
              ctx.lineWidth = Math.max(1, s * 0.03);
              ctx.beginPath();
              ctx.moveTo(ax + sd * s * 0.038 - s * 0.012, baseY - s * 0.06);
              ctx.lineTo(ax - s * 0.012, crotchY + s * 0.06);
              ctx.stroke();
              // Lashed crotch wrap where bar meets frame.
              ctx.fillStyle = '#8a7248';
              ctx.fillRect(ax - s * 0.05, crotchY - s * 0.05, s * 0.1, s * 0.085);
              ctx.fillStyle = shade('#8a7248', 14);
              ctx.fillRect(ax - s * 0.05, crotchY - s * 0.05, s * 0.1, s * 0.024);
            }
            // The crossbar: one round timber laid across both ends,
            // lit along its top, its turned ends showing past the
            // frames — the camera sees a real pole, not a line.
            ctx.fillStyle = wood;
            ctx.fillRect(p.x - s * 0.58, topY, s * 1.16, s * 0.09);
            ctx.fillStyle = shade(wood, 18);
            ctx.fillRect(p.x - s * 0.58, topY, s * 1.16, s * 0.032);
            for (const sd of [-1, 1] as const) {
              ctx.fillStyle = shade(wood, sd < 0 ? 22 : -8);
              ctx.beginPath();
              facetCircle(ctx, p.x + sd * s * 0.58, topY + s * 0.045, s * 0.05, 6, 0.3, 1);
              ctx.fill();
            }
            // The hide slung OVER the bar: a fold-over cuff on the
            // far side, then a BROAD taut sheet stretched wall-to-
            // wall inside the frame — the payload is the protagonist.
            // It breathes on the wind at rest and shivers with each
            // scraping pass while someone works it.
            const shiver = act > 0.05 ? Math.sin(t * 9 + h) * s * 0.016 * act : Math.sin(t * 1.4 + h) * s * 0.008;
            const hx = p.x;
            const hyT = topY + s * 0.09;
            const hw = s * 0.82;
            const hh = s * 0.86;
            // Fold-over cuff peeking above/behind the bar.
            ctx.fillStyle = shade('#b08a5c', -12);
            ctx.beginPath();
            chamferRect(ctx, hx - hw / 2 + s * 0.04 + shiver * 0.6, topY - s * 0.09, hw - s * 0.08, s * 0.09, [s * 0.04, s * 0.04, 0, 0]);
            ctx.fill();
            // The sheet: near-straight stretched sides (it is LASHED
            // taut) and a shallow, uneven lower hem — scalloped like
            // a trimmed hide, never notched deep enough to read as
            // anything but one broad skin.
            ctx.fillStyle = '#b8905f';
            ctx.beginPath();
            ctx.moveTo(hx - hw / 2 + shiver, hyT);
            ctx.lineTo(hx + hw / 2 + shiver, hyT);
            ctx.lineTo(hx + hw * 0.46 + shiver, hyT + hh * 0.84);
            ctx.lineTo(hx + hw * 0.32 + shiver, hyT + hh * 0.99);
            ctx.lineTo(hx + hw * 0.12 + shiver, hyT + hh * 0.92);
            ctx.lineTo(hx - hw * 0.08 + shiver, hyT + hh);
            ctx.lineTo(hx - hw * 0.3 + shiver, hyT + hh * 0.93);
            ctx.lineTo(hx - hw * 0.44 + shiver, hyT + hh * 0.86);
            ctx.lineTo(hx - hw / 2 + shiver, hyT + hh * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.32)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            // Hard-shade half + a pale scraped patch growing off-centre.
            ctx.save();
            ctx.beginPath();
            ctx.rect(hx + shiver, hyT, hw, hh);
            ctx.clip();
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(hx + shiver, hyT, hw / 2, hh);
            ctx.restore();
            ctx.fillStyle = '#d3b183';
            ctx.beginPath();
            facetCircle(ctx, hx - s * 0.1 + shiver, hyT + hh * 0.38, s * 0.19, 7, h * 0.7, 0.8);
            ctx.fill();
            // Belly speckles — the beast it came from.
            ctx.fillStyle = 'rgba(122, 88, 50, 0.4)';
            for (let i = 0; i < 4; i++) {
              const hh4 = hashCoords(97 + i, tx, ty);
              ctx.fillRect(
                hx - hw * 0.36 + ((hh4 % 60) / 60) * hw * 0.72 + shiver,
                hyT + hh * (0.52 + ((hh4 >> 6) % 28) / 100),
                s * 0.035,
                s * 0.03,
              );
            }
            // Lashing cords: bright twine, corner to frame, the
            // tension you can SEE. Small toggle knots at the hide.
            ctx.strokeStyle = '#d8c08a';
            ctx.lineWidth = Math.max(1.4, s * 0.032);
            for (const [cx2, cy2, fx2, fy2] of [
              [hx - hw * 0.46 + shiver, hyT + hh * 0.58, p.x - s * 0.44, topY + s * 0.66],
              [hx + hw * 0.46 + shiver, hyT + hh * 0.6, p.x + s * 0.44, topY + s * 0.68],
              [hx - hw * 0.34 + shiver, hyT + hh * 0.98, p.x - s * 0.48, baseY - s * 0.08],
              [hx + hw * 0.34 + shiver, hyT + hh * 0.96, p.x + s * 0.48, baseY - s * 0.08],
            ] as const) {
              ctx.beginPath();
              ctx.moveTo(cx2, cy2);
              ctx.lineTo(fx2, fy2);
              ctx.stroke();
              ctx.fillStyle = '#8a7248';
              ctx.fillRect(cx2 - s * 0.022, cy2 - s * 0.022, s * 0.044, s * 0.044);
            }
            // The day's finish: cured hides folded flat on a plank
            // pallet in plan at the west foot — work that's DONE.
            // Wide, layered, lit along each fold.
            const pxl = p.x - s * 0.42;
            const plY = baseY + syT * 0.06;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(pxl, plY + s * 0.015, s * 0.24, s * 0.055, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6f4d26';
            ctx.beginPath();
            chamferRect(ctx, pxl - s * 0.23, plY - s * 0.055, s * 0.46, s * 0.055, s * 0.018);
            ctx.fill();
            for (const [ly, lw2, tone] of [
              [0.1, 0.4, '#a5793f'],
              [0.145, 0.36, '#b08a5c'],
              [0.19, 0.38, '#d3b183'],
            ] as const) {
              ctx.fillStyle = tone;
              ctx.beginPath();
              chamferRect(ctx, pxl - s * lw2 / 2, plY - s * (ly + 0.045), s * lw2, s * 0.05, s * 0.018);
              ctx.fill();
              ctx.fillStyle = shade(tone, 14);
              ctx.fillRect(pxl - s * lw2 / 2 + s * 0.01, plY - s * (ly + 0.045), s * lw2 - s * 0.02, s * 0.015);
            }
            // Scudding knife leaning on the near east leg, blade up.
            ctx.save();
            ctx.translate(p.x + s * 0.4, baseY - s * 0.05);
            ctx.rotate(-0.5);
            ctx.fillStyle = '#8d9299';
            ctx.fillRect(-s * 0.022, -s * 0.3, s * 0.044, s * 0.22);
            ctx.fillStyle = '#5b4028';
            ctx.fillRect(-s * 0.028, -s * 0.08, s * 0.056, s * 0.09);
            ctx.restore();
            // Flecks fly off the scrape while the rack is worked.
            if (act > 0.05) {
              for (let i = 0; i < 2; i++) {
                const ft = (t * (1.3 + i * 0.4) + h * 0.31 + i * 0.5) % 1;
                ctx.fillStyle = `rgba(211, 177, 131, ${0.7 * (1 - ft) * act})`;
                ctx.fillRect(hx - s * 0.05 + ft * s * 0.16, hyT + hh * 0.45 + ft * s * 0.22, s * 0.03, s * 0.03);
              }
            }
          },
        };
      }

      case Tile.Loom: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.34;
        // The tailor's loom rebuilt as a machine with mass: capped
        // posts, a crowned head beam, two ranks of warp through a
        // heddle bar, and the cloth winding onto a turned breast
        // beam. Taller than the weaver who sits at it.
        const topY = baseY - s * 1.52;
        const wood = '#5b4028';
        const beamC = '#7a552e';
        return {
          sortY: ty + 0.85,
          body: stationBody(1.0, 1.95, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 1.45);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            // Contact shade + floor frame: two side rails run north in
            // plan — the loom sits on a sled the camera can see.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.fillRect(p.x - s * 0.52, baseY - s * 0.015, s * 1.04, s * 0.045);
            for (const sd of [-1, 1] as const) {
              ctx.fillStyle = shade(wood, sd < 0 ? 2 : -10);
              ctx.beginPath();
              ctx.moveTo(p.x + sd * s * 0.5, baseY);
              ctx.lineTo(p.x + sd * s * 0.4, baseY - syT * 0.5);
              ctx.lineTo(p.x + sd * s * 0.32, baseY - syT * 0.5);
              ctx.lineTo(p.x + sd * s * 0.42, baseY);
              ctx.closePath();
              ctx.fill();
            }
            // Treadle boards between the rails, worn bright mid-plank.
            ctx.fillStyle = shade(beamC, -6);
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.2, baseY - syT * 0.34, s * 0.4, syT * 0.3, s * 0.02);
            ctx.fill();
            ctx.fillStyle = shade(beamC, 8);
            ctx.fillRect(p.x - s * 0.16, baseY - syT * 0.28, s * 0.32, s * 0.028);
            ctx.fillRect(p.x - s * 0.16, baseY - syT * 0.16, s * 0.32, s * 0.028);
            // Posts: lit west face, shaded east, small cap planes on
            // top — every upright shows its crown to this camera.
            for (const sd of [-1, 1] as const) {
              const px2 = p.x + sd * s * 0.44;
              ctx.fillStyle = wood;
              ctx.fillRect(px2 - s * 0.055, topY + s * 0.04, s * 0.11, baseY - topY - s * 0.04);
              ctx.fillStyle = shade(wood, sd < 0 ? 12 : -12);
              ctx.fillRect(px2 + (sd < 0 ? -s * 0.055 : s * 0.023), topY + s * 0.04, s * 0.032, baseY - topY - s * 0.04);
              ctx.fillStyle = shade(wood, -8);
              ctx.fillRect(px2 - s * 0.08, baseY - s * 0.06, s * 0.16, s * 0.06);
            }
            // The head beam: crowned with a foreshortened cap plane,
            // sunlit along its front arris, rimmed dark.
            const hbD = syT * 0.18;
            ctx.fillStyle = beamC;
            ctx.fillRect(p.x - s * 0.52, topY, s * 1.04, s * 0.12);
            ctx.fillStyle = shade(beamC, 16);
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.52, topY - hbD, s * 1.04, hbD + s * 0.02, s * 0.03);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(beamC, 4);
            ctx.fillRect(p.x - s * 0.48, topY - hbD + s * 0.014, s * 0.96, s * 0.024);
            ctx.fillStyle = shade(beamC, 26);
            ctx.fillRect(p.x - s * 0.52, topY + s * 0.09, s * 1.04, s * 0.03);
            // Warp: two ranks split by the heddles — odd threads pull
            // forward, even hang plumb. The shed a real loom keeps.
            const fellY = baseY - s * 0.46;
            const hedY = topY + s * 0.62;
            ctx.lineWidth = Math.max(1, s * 0.02);
            for (let i = 0; i < 11; i++) {
              const wx2 = p.x - s * 0.32 + (i / 10) * s * 0.64;
              const lift = i & 1 ? s * 0.03 : -s * 0.008;
              ctx.strokeStyle = i & 1 ? '#e8dfc8' : '#cdbf9f';
              ctx.beginPath();
              ctx.moveTo(wx2, topY + s * 0.1);
              ctx.lineTo(wx2 + lift, hedY);
              ctx.lineTo(wx2, fellY);
              ctx.stroke();
            }
            // The heddle bar riding mid-warp on cords from the beam.
            ctx.strokeStyle = '#8a7248';
            ctx.lineWidth = Math.max(1, s * 0.022);
            for (const cx2 of [-0.3, 0.3] as const) {
              ctx.beginPath();
              ctx.moveTo(p.x + cx2 * s, topY + s * 0.11);
              ctx.lineTo(p.x + cx2 * s, hedY - s * 0.02);
              ctx.stroke();
            }
            ctx.fillStyle = '#8a5a2e';
            ctx.fillRect(p.x - s * 0.36, hedY - s * 0.03, s * 0.72, s * 0.06);
            ctx.fillStyle = shade('#8a5a2e', 14);
            ctx.fillRect(p.x - s * 0.36, hedY - s * 0.03, s * 0.72, s * 0.02);
            // Woven cloth from the fell line down — house teal with
            // weft stripes — winding onto the turned breast beam.
            ctx.fillStyle = '#4e8a7a';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.32, fellY, s * 0.64, s * 0.26, s * 0.02);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(p.x - s * 0.32, fellY + s * 0.05 + i * s * 0.075, s * 0.64, s * 0.02);
            }
            // The breast beam: a rolled bolt of cloth — cylinder with
            // pale end discs and a lit crown line, fat with work done.
            const bbY = fellY + s * 0.26;
            ctx.fillStyle = '#3f7364';
            ctx.fillRect(p.x - s * 0.4, bbY, s * 0.8, s * 0.15);
            ctx.fillStyle = shade('#3f7364', 16);
            ctx.fillRect(p.x - s * 0.4, bbY, s * 0.8, s * 0.045);
            for (const sd of [-1, 1] as const) {
              ctx.fillStyle = '#d8cbb0';
              ctx.beginPath();
              facetCircle(ctx, p.x + sd * s * 0.4, bbY + s * 0.075, s * 0.075, 7, 0.2, 1);
              ctx.fill();
              ctx.fillStyle = 'rgba(78, 138, 122, 0.6)';
              ctx.beginPath();
              facetCircle(ctx, p.x + sd * s * 0.4, bbY + s * 0.075, s * 0.045, 7, 0.2, 1);
              ctx.fill();
            }
            // Ratchet wheel + pawl on the east beam end — the click
            // that holds the tension.
            ctx.fillStyle = '#767181';
            ctx.beginPath();
            facetCircle(ctx, p.x + s * 0.47, bbY + s * 0.075, s * 0.045, 6, t * (act > 0.05 ? 0.8 : 0), 1);
            ctx.fill();
            // The shuttle: glides across the fell while weaving, parked
            // against a post at rest. Its pace rides the work.
            const gt = act > 0.05 ? (Math.sin(t * (2.2 + act * 2)) + 1) / 2 : 0.04;
            const shx = p.x - s * 0.28 + gt * s * 0.56;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(shx, fellY + s * 0.012, s * 0.12, s * 0.028, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8a5a2e';
            ctx.beginPath();
            ctx.moveTo(shx - s * 0.1, fellY - s * 0.04);
            ctx.lineTo(shx + s * 0.1, fellY - s * 0.04);
            ctx.lineTo(shx + s * 0.145, fellY);
            ctx.lineTo(shx + s * 0.1, fellY + s * 0.04);
            ctx.lineTo(shx - s * 0.1, fellY + s * 0.04);
            ctx.lineTo(shx - s * 0.145, fellY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade('#8a5a2e', 14);
            ctx.fillRect(shx - s * 0.08, fellY - s * 0.04, s * 0.16, s * 0.016);
            ctx.fillStyle = '#c05a4a';
            ctx.fillRect(shx - s * 0.045, fellY - s * 0.014, s * 0.09, s * 0.028);
            // Weft thread trailing the shuttle while it works.
            if (act > 0.05) {
              ctx.strokeStyle = '#e8dfc8';
              ctx.lineWidth = Math.max(1, s * 0.02);
              ctx.beginPath();
              ctx.moveTo(p.x - s * 0.28, fellY);
              ctx.lineTo(shx, fellY);
              ctx.stroke();
            }
            // A basket of yarn cones stands by the west post — its
            // own footprint, its own contact shadow.
            const ykx = p.x - s * 0.56;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(ykx, baseY - s * 0.005, s * 0.13, s * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8a7248';
            ctx.beginPath();
            ctx.moveTo(ykx - s * 0.13, baseY - s * 0.22);
            ctx.lineTo(ykx + s * 0.13, baseY - s * 0.22);
            ctx.lineTo(ykx + s * 0.1, baseY);
            ctx.lineTo(ykx - s * 0.1, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(58, 40, 22, 0.35)';
            ctx.fillRect(ykx - s * 0.115, baseY - s * 0.15, s * 0.23, s * 0.02);
            ctx.fillRect(ykx - s * 0.105, baseY - s * 0.08, s * 0.21, s * 0.02);
            for (let i = 0; i < 3; i++) {
              ctx.fillStyle = ['#c05a4a', '#4e8a7a', '#d8cbb0'][i]!;
              ctx.beginPath();
              facetCircle(ctx, ykx - s * 0.07 + i * s * 0.07, baseY - s * 0.26, s * 0.045, 5, i, 0.85);
              ctx.fill();
            }
          },
        };
      }

      case Tile.CarvingBench: {
        const syT = s * this.camera.yScale;
        // The bowyer's bench on the table grammar: a thick sawyer's
        // slab in full plan, shoulder-wide, with the vise, stave and
        // drawknife all living ON the visible top plane.
        const th = s * 0.5;
        const xL = p.x - s * 0.5;
        const xR = p.x + s * 0.5;
        const yT = p.y - syT * 0.34;
        const yB = p.y + syT * 0.42;
        const topC = '#9b7440';
        const legC = '#5b4028';
        return {
          sortY: ty + 0.85,
          body: stationBody(1.05, 1.5, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.7);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            // Contact shade, stout legs with splayed feet, an apron.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
            const leg = (lx: number, ly: number, hgt: number) => {
              ctx.fillStyle = legC;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.048, ly - hgt);
              ctx.lineTo(lx + s * 0.048, ly - hgt);
              ctx.lineTo(lx + s * 0.036, ly - s * 0.06);
              ctx.lineTo(lx + s * 0.06, ly);
              ctx.lineTo(lx - s * 0.06, ly);
              ctx.lineTo(lx - s * 0.036, ly - s * 0.06);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = shade(legC, -14);
              ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
            };
            leg(xL + s * 0.09, yB, th + syT * 0.05);
            leg(xR - s * 0.09, yB, th + syT * 0.05);
            leg(xL + s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            leg(xR - s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            // The billet store on a low stretcher shelf: split limbs
            // waiting to be staves.
            ctx.fillStyle = shade(legC, -8);
            ctx.fillRect(xL + s * 0.1, yB - th * 0.45, xR - xL - s * 0.2, s * 0.045);
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(xL + s * 0.14, yB - th * 0.45 - s * 0.05, s * 0.56, s * 0.05);
            ctx.fillStyle = '#7a552e';
            ctx.fillRect(xL + s * 0.18, yB - th * 0.45 - s * 0.1, s * 0.48, s * 0.05);
            ctx.fillStyle = '#d8cbb0';
            for (const ex of [0.14, 0.7] as const) {
              ctx.fillRect(xL + s * ex, yB - th * 0.45 - s * 0.048, s * 0.028, s * 0.046);
            }
            // The slab: one thick board in plan, rimmed dark, its
            // south lip lit — a top the camera actually sees.
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            ctx.fillStyle = shade(topC, 14);
            ctx.fillRect(xL + s * 0.01, yB - th - s * 0.045, xR - xL - s * 0.02, s * 0.045);
            ctx.fillStyle = shade(topC, -8);
            ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
            // Grain seams + old knife scars across the working face.
            ctx.fillStyle = 'rgba(58, 40, 22, 0.25)';
            ctx.fillRect(xL + s * 0.08, yT - th + (yB - yT) * 0.4, xR - xL - s * 0.16, s * 0.018);
            for (let k = 0; k < 3; k++) {
              const hh3 = hashCoords(71 + k, tx, ty);
              ctx.fillRect(
                xL + s * 0.15 + ((hh3 % 50) / 100) * s,
                yT - th + (0.55 + ((hh3 >> 5) % 30) / 100) * (yB - yT),
                s * (0.1 + (hh3 % 3) * 0.04),
                s * 0.014,
              );
            }
            // The leg vise stands up from the west end of the plan:
            // iron jaw plates and a turned wooden screw handle.
            const vx = xL + s * 0.12;
            const vy = yT - th + (yB - yT) * 0.55;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(vx, vy + s * 0.012, s * 0.09, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6b6470';
            ctx.fillRect(vx - s * 0.07, vy - s * 0.22, s * 0.14, s * 0.22);
            ctx.fillStyle = shade('#6b6470', 12);
            ctx.fillRect(vx - s * 0.07, vy - s * 0.22, s * 0.045, s * 0.22);
            ctx.fillStyle = '#8d9299';
            ctx.fillRect(vx - s * 0.085, vy - s * 0.27, s * 0.17, s * 0.055);
            ctx.fillStyle = shade('#8d9299', 16);
            ctx.fillRect(vx - s * 0.085, vy - s * 0.27, s * 0.17, s * 0.02);
            // The screw handle poking south, a wooden T.
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(vx - s * 0.02, vy - s * 0.06, s * 0.04, s * 0.14);
            ctx.fillRect(vx - s * 0.075, vy + s * 0.065, s * 0.15, s * 0.035);
            // The clamped stave: a long limb laid low across the
            // bench from the vise jaws to past the east rim — flat on
            // the work, not arched over it. It nods with each
            // drawknife pass while someone works.
            const nod = act > 0.05 ? Math.sin(t * 7 + h) * 0.02 * act : 0;
            const stY0 = vy - s * 0.2;
            const stY1 = yT - th + (yB - yT) * 0.3;
            ctx.strokeStyle = '#b08a5c';
            ctx.lineWidth = Math.max(2.4, s * 0.07);
            ctx.beginPath();
            ctx.moveTo(vx + s * 0.02, stY0);
            ctx.quadraticCurveTo(p.x + s * 0.06, stY1 - s * (0.09 + nod), xR + s * 0.02, stY1);
            ctx.stroke();
            // Taper to the east tip — the limb thins where it's been
            // worked down.
            ctx.strokeStyle = shade('#b08a5c', -10);
            ctx.lineWidth = Math.max(1.6, s * 0.045);
            ctx.beginPath();
            ctx.moveTo(p.x + s * 0.24, stY1 - s * (0.035 + nod * 0.4));
            ctx.quadraticCurveTo(xR - s * 0.08, stY1 - s * 0.01, xR + s * 0.02, stY1);
            ctx.stroke();
            // Pale sapwood streak along the worked upper face.
            ctx.strokeStyle = 'rgba(232, 216, 176, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.024);
            ctx.beginPath();
            ctx.moveTo(vx + s * 0.05, stY0 - s * 0.02);
            ctx.quadraticCurveTo(p.x + s * 0.06, stY1 - s * (0.12 + nod), xR - s * 0.02, stY1 - s * 0.03);
            ctx.stroke();
            // Drawknife lying ON the plan mid-bench, its own shadow.
            const dkx = p.x + s * 0.08;
            const dky = yT - th + (yB - yT) * 0.68;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(dkx + s * 0.12, dky + s * 0.03, s * 0.16, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8d9299';
            ctx.fillRect(dkx - s * 0.02, dky - s * 0.025, s * 0.28, s * 0.05);
            ctx.fillStyle = shade('#8d9299', 18);
            ctx.fillRect(dkx - s * 0.02, dky - s * 0.025, s * 0.28, s * 0.018);
            ctx.fillStyle = legC;
            ctx.fillRect(dkx - s * 0.065, dky - s * 0.035, s * 0.055, s * 0.07);
            ctx.fillRect(dkx + s * 0.255, dky - s * 0.035, s * 0.055, s * 0.07);
            // Shaving litter on the plan — filled curl chips, not
            // pen-strokes — and a settled drift at the near-east leg.
            ctx.fillStyle = 'rgba(216, 192, 138, 0.85)';
            for (let k = 0; k < 5; k++) {
              const hh5 = hashCoords(77 + k, tx, ty);
              const sx2 = xL + s * 0.14 + ((hh5 % 70) / 100) * (xR - xL - s * 0.3);
              const sy2 = yT - th + (0.4 + ((hh5 >> 6) % 45) / 100) * (yB - yT);
              ctx.save();
              ctx.translate(sx2, sy2);
              ctx.rotate(((hh5 >> 3) % 7) * 0.5);
              ctx.fillRect(-s * 0.035, -s * 0.012, s * 0.07, s * 0.024);
              ctx.restore();
            }
            ctx.fillStyle = '#c9a86a';
            ctx.beginPath();
            facetCircle(ctx, p.x + s * 0.34, yB - s * 0.02, s * 0.13, 7, h * 0.4, 0.45);
            ctx.fill();
            ctx.fillStyle = shade('#c9a86a', -12);
            ctx.fillRect(p.x + s * 0.24, yB - s * 0.055, s * 0.05, s * 0.02);
            ctx.fillRect(p.x + s * 0.36, yB - s * 0.03, s * 0.045, s * 0.02);
            // A finished longbow leans against the east end, strung —
            // proof of what this bench is FOR.
            ctx.strokeStyle = '#8a5a2e';
            ctx.lineWidth = Math.max(2, s * 0.05);
            ctx.beginPath();
            ctx.moveTo(xR + s * 0.1, yB - s * 0.01);
            ctx.quadraticCurveTo(xR + s * 0.22, yB - th - s * 0.35, xR + s * 0.05, yB - th - s * 0.72);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(224, 214, 186, 0.7)';
            ctx.lineWidth = Math.max(1, s * 0.016);
            ctx.beginPath();
            ctx.moveTo(xR + s * 0.1, yB - s * 0.01);
            ctx.lineTo(xR + s * 0.05, yB - th - s * 0.72);
            ctx.stroke();
            // Shaving curls fly off the stave while the bench works.
            if (act > 0.05) {
              for (let i = 0; i < 3; i++) {
                const ct2 = (t * (1.1 + i * 0.3) + h * 0.23 + i * 0.33) % 1;
                ctx.strokeStyle = `rgba(201, 168, 106, ${0.8 * (1 - ct2) * act})`;
                ctx.lineWidth = Math.max(1, s * 0.022);
                ctx.beginPath();
                ctx.arc(
                  p.x + s * 0.05 + ct2 * s * 0.24 + i * s * 0.05,
                  yT - th - s * 0.16 + ct2 * s * 0.34,
                  s * 0.035,
                  0.4 + ct2 * 3,
                  3.4 + ct2 * 3,
                );
                ctx.stroke();
              }
            }
          },
        };
      }

      case Tile.EnchantingTable: {
        const syT = s * this.camera.yScale;
        // The enchanter's worktable on the table grammar: a dark
        // arcane slab in full plan, a rune ring carved INTO the top
        // plane, tome and focus stone standing on their own spots.
        const th = s * 0.54;
        const xL = p.x - s * 0.47;
        const xR = p.x + s * 0.47;
        const yT = p.y - syT * 0.34;
        const yB = p.y + syT * 0.42;
        const topC = '#4f4468';
        const legC = '#372f47';
        return {
          sortY: ty + 0.85,
          body: stationBody(1.0, 1.5, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.7);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            // Magelight pools under the table — dim at rest, surging
            // while an inscription is worked. Never fully dark: bound
            // magic doesn't sleep, it waits.
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.7 + h);
            const might = 0.16 + 0.1 * pulse + act * (0.3 + 0.2 * Math.sin(t * 4.2));
            ctx.fillStyle = `rgba(146, 122, 220, ${might * 0.5})`;
            ctx.beginPath();
            facetCircle(ctx, p.x, yB + s * 0.06, s * 0.5, 8, 0.4, 0.4);
            ctx.fill();
            this.queueGlow(tx + 0.5, ty + 0.5, 0.9 + act * 0.4, '146, 122, 220', might * 0.5);
            // Stout dark legs — carved claw feet — and the apron.
            const leg = (lx: number, ly: number, hgt: number) => {
              ctx.fillStyle = legC;
              ctx.beginPath();
              ctx.moveTo(lx - s * 0.045, ly - hgt);
              ctx.lineTo(lx + s * 0.045, ly - hgt);
              ctx.lineTo(lx + s * 0.03, ly - s * 0.07);
              ctx.lineTo(lx + s * 0.06, ly);
              ctx.lineTo(lx - s * 0.06, ly);
              ctx.lineTo(lx - s * 0.03, ly - s * 0.07);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = shade(legC, -14);
              ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
            };
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
            leg(xL + s * 0.09, yB, th + syT * 0.05);
            leg(xR - s * 0.09, yB, th + syT * 0.05);
            leg(xL + s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            leg(xR - s * 0.09, yT + syT * 0.18, (th + syT * 0.05) * 0.92);
            ctx.fillStyle = shade(legC, 6);
            ctx.fillRect(xL + s * 0.02, yB - th, xR - xL - s * 0.04, s * 0.085);
            // Carved runes along the apron — they light in sequence
            // while the table works, a thought walking the wood.
            for (let i = 0; i < 5; i++) {
              const lit = act > 0.05 ? Math.max(0, Math.sin(t * 3.1 - i * 0.9)) * act : 0;
              ctx.fillStyle = `rgba(186, 162, 255, ${0.25 + 0.6 * lit})`;
              ctx.fillRect(p.x - s * 0.3 + i * s * 0.14, yB - th + s * 0.02, s * 0.05, s * 0.05);
            }
            // The slab: full plan-space top, rimmed dark, south lip
            // lit — the camera looks DOWN onto the enchanter's work.
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            ctx.fillStyle = shade(topC, 14);
            ctx.fillRect(xL + s * 0.01, yB - th - s * 0.042, xR - xL - s * 0.02, s * 0.042);
            ctx.fillStyle = shade(topC, -8);
            ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
            // The rune ring carved into the top plane — an ellipse in
            // plan, glyph ticks around it, breathing with the pool
            // and walking bright while the table works.
            const rcx = p.x + s * 0.03;
            const rcy = yT - th + (yB - yT) * 0.52;
            ctx.fillStyle = `rgba(146, 122, 220, ${0.1 + 0.08 * pulse + act * 0.12})`;
            ctx.beginPath();
            ctx.ellipse(rcx, rcy, s * 0.3, s * 0.3 * this.camera.yScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(186, 162, 255, ${0.55 + 0.3 * pulse + act * 0.25})`;
            ctx.lineWidth = Math.max(1.4, s * 0.03);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
              const a2 = (i / 8) * Math.PI * 2 + t * (act > 0.05 ? 0.35 : 0.06);
              const gx = rcx + Math.cos(a2) * s * 0.3;
              const gy = rcy + Math.sin(a2) * s * 0.3 * this.camera.yScale;
              const lit = act > 0.05 ? Math.max(0, Math.sin(t * 3.1 - i * 0.8)) * act : 0.25 * pulse;
              ctx.fillStyle = `rgba(206, 186, 255, ${0.45 + 0.55 * lit})`;
              ctx.fillRect(gx - s * 0.022, gy - s * 0.022, s * 0.044, s * 0.044);
            }
            // The open tome stands at the ring's west edge: dark
            // cover, two pale page-blocks, ribbon marker — and while
            // working, a mid-turn page arcing between them.
            const tmx = p.x - s * 0.22;
            const tmy = yT - th + (yB - yT) * 0.56;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(tmx + s * 0.04, tmy + s * 0.035, s * 0.21, s * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2e2740';
            ctx.beginPath();
            chamferRect(ctx, tmx - s * 0.2, tmy - s * 0.115, s * 0.42, s * 0.15, s * 0.02);
            ctx.fill();
            ctx.fillStyle = '#e8dfc8';
            ctx.fillRect(tmx - s * 0.175, tmy - s * 0.1, s * 0.17, s * 0.11);
            ctx.fillRect(tmx + s * 0.015, tmy - s * 0.1, s * 0.17, s * 0.11);
            ctx.fillStyle = shade('#e8dfc8', -10);
            ctx.fillRect(tmx - s * 0.005, tmy - s * 0.1, s * 0.02, s * 0.11);
            ctx.fillStyle = '#8a4a52';
            ctx.fillRect(tmx - s * 0.015, tmy + s * 0.01, s * 0.035, s * 0.05);
            // Faint script lines on the pages.
            ctx.fillStyle = 'rgba(74, 63, 94, 0.55)';
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(tmx - s * 0.155, tmy - s * (0.08 - i * 0.03), s * 0.13, s * 0.012);
              ctx.fillRect(tmx + s * 0.035, tmy - s * (0.08 - i * 0.03), s * 0.13, s * 0.012);
            }
            if (act > 0.05) {
              const turn = (t * 0.9 + h * 0.17) % 1;
              ctx.strokeStyle = `rgba(232, 223, 200, ${0.85 * act * Math.sin(turn * Math.PI)})`;
              ctx.lineWidth = Math.max(1, s * 0.02);
              ctx.beginPath();
              ctx.moveTo(tmx + s * 0.015, tmy + s * 0.01);
              ctx.quadraticCurveTo(
                tmx - s * 0.14 * turn,
                tmy - s * 0.16,
                tmx - s * (0.02 + 0.15 * turn),
                tmy + s * 0.005,
              );
              ctx.stroke();
            }
            // The focus crystal hovers over a claw cradle standing at
            // the ring's east edge — a cut stone that bobs on
            // nothing, spins slowly, and drinks the work.
            const bob = Math.sin(t * 1.6 + h) * 0.03 + act * Math.sin(t * 5.2) * 0.02;
            const cx = p.x + s * 0.28;
            const cdy = yT - th + (yB - yT) * 0.56;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(cx, cdy + s * 0.012, s * 0.075, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = legC;
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.06, cdy);
            ctx.lineTo(cx + s * 0.06, cdy);
            ctx.lineTo(cx + s * 0.032, cdy - s * 0.1);
            ctx.lineTo(cx - s * 0.032, cdy - s * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(legC, 16);
            ctx.fillRect(cx - s * 0.032, cdy - s * 0.105, s * 0.064, s * 0.02);
            // The stone floats LOW over its cradle — always read as
            // one piece with the table, never a chip off its edge.
            const cy = cdy - s * (0.2 + bob);
            ctx.fillStyle = `rgba(146, 122, 220, ${0.2 + 0.15 * pulse + act * 0.2})`;
            ctx.beginPath();
            facetCircle(ctx, cx, cy, s * 0.13, 6, t * 0.4, 1.2);
            ctx.fill();
            ctx.fillStyle = `rgba(196, 174, 255, ${0.85 + act * 0.15})`;
            ctx.beginPath();
            facetCircle(ctx, cx, cy, s * (0.08 + act * 0.012), 4, t * 0.8, 1.4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 252, 240, 0.9)';
            ctx.fillRect(cx - s * 0.014, cy - s * (0.045 + bob * 0.4), s * 0.028, s * 0.028);
            // An ink pot and quill at the south rim: the enchanter
            // writes, the table remembers.
            const iqx = p.x - s * 0.02;
            const iqy = yT - th + (yB - yT) * 0.85;
            ctx.fillStyle = '#2e2740';
            ctx.beginPath();
            facetCircle(ctx, iqx, iqy - s * 0.03, s * 0.045, 6, 0.3, 0.6);
            ctx.fill();
            ctx.strokeStyle = '#d8cbb0';
            ctx.lineWidth = Math.max(1, s * 0.02);
            ctx.beginPath();
            ctx.moveTo(iqx + s * 0.02, iqy - s * 0.05);
            ctx.quadraticCurveTo(iqx + s * 0.1, iqy - s * 0.14, iqx + s * 0.14, iqy - s * 0.12);
            ctx.stroke();
            // Rising rune motes while the enchanter works — glyphs
            // shaken loose from the page, fading as they climb.
            if (act > 0.05) {
              for (let i = 0; i < 4; i++) {
                const mt = (t * (0.5 + i * 0.13) + i * 0.29 + h * 0.41) % 1;
                const mx = p.x - s * 0.2 + ((i * 47 + h) % 10) * s * 0.045;
                ctx.fillStyle = `rgba(186, 162, 255, ${0.75 * (1 - mt) * act})`;
                ctx.fillRect(
                  mx + Math.sin(t * 2 + i * 2.1) * s * 0.03,
                  yT - th - s * (0.1 + mt * 0.5),
                  s * 0.035,
                  s * 0.035,
                );
              }
            }
          },
        };
      }

      case Tile.Furnace: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.34;
        const glow = 0.7 + Math.sin(t * 5 + h) * 0.22 + Math.sin(t * 11) * 0.08;
        // A smelter with the mass of real masonry: broad firebox,
        // sloped shoulder planes, and a crowned stack whose flue
        // mouth the tilted camera looks into. Head-and-a-half tall
        // beside the body — industry, not furniture.
        const stone = '#5b5566';
        const shoY = baseY - s * 0.78;
        const topY = baseY - s * 1.52;
        return {
          sortY: ty + 1,
          body: stationBody(1.1, 2.1, 0.8),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.52, baseY, p.x + s * 0.52, baseY, 1.4);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // STOKED: while someone smelts, the whole piece surges —
            // the pool, the mouth, the coals, the smoke all breathe
            // harder on one shared flare envelope.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            const flare = act * (0.55 + 0.45 * Math.sin(t * 2.3 + h));
            // Firelight pools on the ground before any masonry — the
            // working glow you can read from across the smithy yard.
            ctx.fillStyle = `rgba(232, 122, 51, ${0.1 * glow + 0.08 * flare})`;
            ctx.beginPath();
            facetCircle(ctx, p.x, baseY + syT * 0.12, s * 0.56, 8, 0.2, 0.42);
            ctx.fill();
            // A worn stone working apron in plan at the foot — the
            // slab the smelter stands on, mold and ash living on it.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.fillRect(p.x - s * 0.53, baseY - s * 0.015, s * 1.06, s * 0.05);
            ctx.fillStyle = shade(stone, 4);
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.5, baseY - s * 0.02, s, syT * 0.32, s * 0.04);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            ctx.fillStyle = shade(stone, 16);
            ctx.fillRect(p.x - s * 0.5, baseY + syT * 0.27, s, s * 0.032);
            ctx.fillStyle = 'rgba(20, 14, 28, 0.25)';
            ctx.fillRect(p.x - s * 0.16, baseY + s * 0.01, s * 0.02, syT * 0.28);
            ctx.fillRect(p.x + s * 0.2, baseY + s * 0.01, s * 0.02, syT * 0.28);
            // The kiln: a broad firebox shouldering in to a chimney
            // stack, all cut stone in one silhouette, rimmed dark.
            ctx.fillStyle = stone;
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.52, baseY);
            ctx.lineTo(p.x - s * 0.52, shoY);
            ctx.lineTo(p.x - s * 0.29, shoY - s * 0.2);
            ctx.lineTo(p.x - s * 0.29, topY);
            ctx.lineTo(p.x + s * 0.29, topY);
            ctx.lineTo(p.x + s * 0.29, shoY - s * 0.2);
            ctx.lineTo(p.x + s * 0.52, shoY);
            ctx.lineTo(p.x + s * 0.52, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            // Sun keeps the west flank and loses the east — the same
            // law as every wall in town.
            ctx.fillStyle = shade(stone, 10);
            ctx.fillRect(p.x - s * 0.52, shoY, s * 0.09, baseY - shoY);
            ctx.fillRect(p.x - s * 0.29, topY, s * 0.075, shoY - s * 0.2 - topY);
            ctx.fillStyle = shade(stone, -10);
            ctx.fillRect(p.x + s * 0.43, shoY, s * 0.09, baseY - shoY);
            ctx.fillRect(p.x + s * 0.215, topY, s * 0.075, shoY - s * 0.2 - topY);
            // The shoulder slopes: two planes catching the sky where
            // the firebox steps in to the stack — the cut the
            // silhouette makes, shown as lit surface.
            for (const sd of [-1, 1] as const) {
              ctx.fillStyle = shade(stone, sd < 0 ? 22 : 14);
              ctx.beginPath();
              ctx.moveTo(p.x + sd * s * 0.52, shoY);
              ctx.lineTo(p.x + sd * s * 0.29, shoY - s * 0.2);
              ctx.lineTo(p.x + sd * s * 0.29, shoY - s * 0.2 + s * 0.05);
              ctx.lineTo(p.x + sd * s * 0.52, shoY + s * 0.05);
              ctx.closePath();
              ctx.fill();
            }
            // Cut-stone coursing: staggered header ticks on firebox
            // and stack, not floating lines.
            ctx.fillStyle = 'rgba(20, 14, 28, 0.3)';
            ctx.fillRect(p.x - s * 0.52, baseY - s * 0.56, s * 1.04, s * 0.026);
            for (let c2 = 0; c2 < 4; c2++) {
              ctx.fillRect(p.x - s * 0.44 + c2 * s * 0.26, baseY - s * 0.56 + s * 0.026, s * 0.02, s * 0.06);
            }
            ctx.fillRect(p.x - s * 0.29, shoY - s * 0.42, s * 0.58, s * 0.026);
            ctx.fillRect(p.x - s * 0.29, topY + s * 0.16, s * 0.58, s * 0.026);
            for (let c2 = 0; c2 < 2; c2++) {
              ctx.fillRect(p.x - s * 0.16 + c2 * s * 0.22, shoY - s * 0.42 + s * 0.026, s * 0.02, s * 0.055);
              ctx.fillRect(p.x - s * 0.08 + c2 * s * 0.14, topY + s * 0.186, s * 0.02, s * 0.055);
            }
            // An iron reinforcing band strapped around the stack,
            // riveted — masonry that has taken years of heat.
            ctx.fillStyle = '#3a3544';
            ctx.fillRect(p.x - s * 0.3, shoY - s * 0.56, s * 0.6, s * 0.06);
            ctx.fillStyle = '#767181';
            ctx.fillRect(p.x - s * 0.3, shoY - s * 0.56, s * 0.6, s * 0.018);
            ctx.fillRect(p.x - s * 0.22, shoY - s * 0.545, s * 0.03, s * 0.03);
            ctx.fillRect(p.x + s * 0.19, shoY - s * 0.545, s * 0.03, s * 0.03);
            // The crown: a foreshortened cap plane the camera looks
            // onto, its flue mouth a dark sunk ellipse the smoke
            // actually stands in. Sunlit front arris below it.
            const crD = syT * 0.28;
            ctx.fillStyle = shade(stone, 16);
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.34, topY - crD, s * 0.68, crD + s * 0.02, s * 0.04);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.fillStyle = shade(stone, 4);
            ctx.fillRect(p.x - s * 0.3, topY - crD + s * 0.016, s * 0.6, s * 0.026);
            ctx.fillStyle = '#1c1524';
            ctx.beginPath();
            ctx.ellipse(p.x, topY - crD * 0.42, s * 0.19, crD * 0.32, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(232, 108, 45, ${0.2 * glow + 0.3 * flare})`;
            ctx.beginPath();
            ctx.ellipse(p.x, topY - crD * 0.42, s * 0.13, crD * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade(stone, 28);
            ctx.fillRect(p.x - s * 0.34, topY - s * 0.012, s * 0.68, s * 0.032);
            // Smoke: two puffs climbing out of the flue (a third
            // while stoked), thinning as they drift east on the
            // yard's air.
            for (let i = 0; i < 2 + (act > 0.3 ? 1 : 0); i++) {
              const ph = (t * (0.26 + i * 0.09) + i * 0.5 + h * 0.11) % 1;
              ctx.fillStyle = `rgba(146, 140, 152, ${(1 - ph) * 0.28})`;
              ctx.beginPath();
              facetCircle(
                ctx,
                p.x + Math.sin(t * 0.9 + i * 2.1 + h) * s * 0.05 + ph * s * 0.16,
                topY - crD * 0.5 - s * 0.04 - ph * s * 0.55,
                s * (0.06 + ph * 0.1),
                6,
                ph * 2 + i,
                0.8,
              );
              ctx.fill();
            }
            // The mouth: arched-hexagon opening, coal bed banked at
            // its floor, iron grate bars standing over the fire.
            ctx.fillStyle = '#1c1524';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.22, baseY - s * 0.02);
            ctx.lineTo(p.x - s * 0.22, baseY - s * 0.4);
            ctx.lineTo(p.x - s * 0.11, baseY - s * 0.55);
            ctx.lineTo(p.x + s * 0.11, baseY - s * 0.55);
            ctx.lineTo(p.x + s * 0.22, baseY - s * 0.4);
            ctx.lineTo(p.x + s * 0.22, baseY - s * 0.02);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = `rgba(232, 108, 45, ${Math.min(1, glow * 0.9 + flare * 0.5)})`;
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.19, baseY - s * 0.03);
            ctx.lineTo(p.x - s * 0.19, baseY - s * 0.37);
            ctx.lineTo(p.x - s * 0.09, baseY - s * 0.5);
            ctx.lineTo(p.x + s * 0.09, baseY - s * 0.5);
            ctx.lineTo(p.x + s * 0.19, baseY - s * 0.37);
            ctx.lineTo(p.x + s * 0.19, baseY - s * 0.03);
            ctx.closePath();
            ctx.fill();
            // A keystone arch of dressed voussoirs framing the mouth.
            ctx.fillStyle = shade(stone, 14);
            for (const [vx2, vy2, vr] of [
              [-0.24, -0.38, 0.12],
              [-0.13, -0.52, -0.35],
              [0, -0.575, 0],
              [0.13, -0.52, 0.35],
              [0.24, -0.38, -0.12],
            ] as const) {
              ctx.save();
              ctx.translate(p.x + vx2 * s, baseY + vy2 * s);
              ctx.rotate(vr);
              ctx.fillRect(-s * 0.045, -s * 0.04, s * 0.09, s * 0.08);
              ctx.restore();
            }
            // Coals pulse out of phase with one another — a banked
            // fire is never one flat brightness.
            for (let i = 0; i < 3; i++) {
              const pulse = 0.5 + Math.sin(t * 3 + i * 2.4 + h) * 0.5;
              ctx.fillStyle = `rgba(255, 201, 92, ${Math.min(1, 0.35 + pulse * 0.55 + flare * 0.3)})`;
              ctx.beginPath();
              facetCircle(ctx, p.x + (i - 1) * s * 0.11, baseY - s * 0.08, s * 0.06, 6, i * 1.1, 0.7);
              ctx.fill();
            }
            // A white heart forms in the fire while it is being fed.
            if (act > 0.04) {
              ctx.fillStyle = `rgba(255, 232, 160, ${flare * 0.5})`;
              ctx.beginPath();
              facetCircle(ctx, p.x, baseY - s * 0.1, s * 0.07, 6, 0.5, 0.7);
              ctx.fill();
            }
            ctx.fillStyle = '#2c2836';
            for (const gx of [-0.11, 0, 0.11]) {
              ctx.fillRect(p.x + gx * s - s * 0.018, baseY - s * 0.5, s * 0.036, s * 0.48);
            }
            // Sparks escape past the grate and climb the stack face.
            if (act > 0.04) {
              for (let i = 0; i < 2; i++) {
                const ph = (t * (0.9 + i * 0.33) + h * 0.21 + i * 0.5) % 1;
                ctx.fillStyle = `rgba(255, 205, 120, ${(1 - ph) * act * 0.8})`;
                ctx.fillRect(
                  p.x + Math.sin(t * 3.1 + i * 2.4 + h) * s * 0.06,
                  baseY - s * 0.38 - ph * s * 0.55,
                  s * 0.024,
                  s * 0.024,
                );
              }
            }
            // The pour station on the apron's east: a stone ingot
            // mold, one bar still sun-bright from the pour, one gone
            // gray — the smelting story told in plan.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x + s * 0.38, baseY + syT * 0.16, s * 0.15, s * 0.045, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6e6879';
            ctx.beginPath();
            chamferRect(ctx, p.x + s * 0.25, baseY + syT * 0.04, s * 0.26, s * 0.12, s * 0.02);
            ctx.fill();
            ctx.fillStyle = shade('#6e6879', 12);
            ctx.fillRect(p.x + s * 0.25, baseY + syT * 0.04, s * 0.26, s * 0.02);
            ctx.fillStyle = `rgba(240, 150, 60, ${0.55 + glow * 0.4})`;
            ctx.fillRect(p.x + s * 0.28, baseY + syT * 0.06, s * 0.2, s * 0.032);
            ctx.fillStyle = '#8f96a3';
            ctx.fillRect(p.x + s * 0.28, baseY + syT * 0.1, s * 0.2, s * 0.032);
            // Ash drift swept to the apron's west edge.
            ctx.fillStyle = '#8a8494';
            ctx.beginPath();
            facetCircle(ctx, p.x - s * 0.38, baseY + syT * 0.12, s * 0.11, 6, 0.4, 0.45);
            ctx.fill();
            ctx.fillStyle = shade('#8a8494', -10);
            ctx.beginPath();
            facetCircle(ctx, p.x - s * 0.32, baseY + syT * 0.16, s * 0.05, 6, 0.8, 0.45);
            ctx.fill();
          },
        };
      }

      case Tile.Anvil: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.3;
        // Work heat: the bar on the face breathes like real forge stock.
        const heat = 0.62 + Math.sin(t * 5.5 + h) * 0.2 + Math.sin(t * 13) * 0.08;
        return {
          sortY: ty + 0.85,
          body: stationBody(1.05, 1.2, 0.6),
          drawShadow: () => {
            this.castBlob(p.x, p.y + s * 0.22, 0.52, s * 0.4, tx ^ (ty << 3));
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // Contact shade, then the hewn oak round every smith sets
            // an anvil on — wood makes the blow ring, not crack. The
            // round shows its sawn TOP: an elliptical plane of growth
            // rings the anvil's foot stands in the middle of.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.fillRect(p.x - s * 0.36, baseY - s * 0.015, s * 0.72, s * 0.05);
            const stumpTop = baseY - s * 0.36;
            ctx.fillStyle = '#6b4a26';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.32, stumpTop, s * 0.64, s * 0.36, [s * 0.03, s * 0.03, s * 0.08, s * 0.08]);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            ctx.fillStyle = shade('#6b4a26', 8);
            ctx.fillRect(p.x - s * 0.3, stumpTop + s * 0.03, s * 0.08, s * 0.3);
            ctx.fillStyle = shade('#6b4a26', -12);
            ctx.fillRect(p.x + s * 0.2, stumpTop + s * 0.03, s * 0.1, s * 0.3);
            // Bark checks down the flank.
            ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
            ctx.fillRect(p.x - s * 0.12, stumpTop + s * 0.08, s * 0.022, s * 0.2);
            ctx.fillRect(p.x + s * 0.08, stumpTop + s * 0.12, s * 0.022, s * 0.16);
            // The sawn top plane: pale end-grain with ring arcs,
            // proud of the flank on both sides.
            ctx.fillStyle = '#94693a';
            ctx.beginPath();
            ctx.ellipse(p.x, stumpTop, s * 0.34, syT * 0.21, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.024);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(107, 74, 38, 0.55)';
            ctx.lineWidth = Math.max(1, s * 0.02);
            for (const rr of [0.24, 0.15] as const) {
              ctx.beginPath();
              ctx.ellipse(p.x + s * 0.03, stumpTop + syT * 0.01, s * rr, syT * rr * 0.6, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            // An iron strap keeps the round from splitting under years
            // of blows — riveted, sitting a little proud of the wood.
            ctx.fillStyle = '#3a3544';
            ctx.fillRect(p.x - s * 0.33, baseY - s * 0.2, s * 0.66, s * 0.075);
            ctx.fillStyle = '#565162';
            ctx.fillRect(p.x - s * 0.33, baseY - s * 0.2, s * 0.66, s * 0.022);
            ctx.fillStyle = '#767181';
            ctx.fillRect(p.x - s * 0.24, baseY - s * 0.185, s * 0.038, s * 0.038);
            ctx.fillRect(p.x + s * 0.2, baseY - s * 0.185, s * 0.038, s * 0.038);
            // The anvil in profile — horn west, heel step east, one
            // unbroken silhouette so the tool reads at any zoom.
            // Bigger than a stool: nose-to-heel it spans the tile.
            const yF = baseY - s * 0.74;
            const bodyB = yF + s * 0.2;
            ctx.fillStyle = '#565162';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.3, bodyB);
            ctx.lineTo(p.x - s * 0.3, yF + s * 0.06);
            ctx.quadraticCurveTo(p.x - s * 0.46, yF + s * 0.065, p.x - s * 0.58, yF + s * 0.018);
            ctx.quadraticCurveTo(p.x - s * 0.42, yF - s * 0.024, p.x - s * 0.28, yF - s * 0.012);
            ctx.lineTo(p.x + s * 0.38, yF - s * 0.012);
            ctx.lineTo(p.x + s * 0.38, yF + s * 0.07);
            ctx.lineTo(p.x + s * 0.28, yF + s * 0.12);
            ctx.lineTo(p.x + s * 0.28, bodyB);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.026);
            ctx.stroke();
            // Waist: concave flanks pinching down to the foot plate.
            ctx.fillStyle = '#4a4554';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.22, bodyB - s * 0.01);
            ctx.quadraticCurveTo(p.x - s * 0.12, bodyB + s * 0.06, p.x - s * 0.17, stumpTop - s * 0.06);
            ctx.lineTo(p.x + s * 0.2, stumpTop - s * 0.06);
            ctx.quadraticCurveTo(p.x + s * 0.14, bodyB + s * 0.06, p.x + s * 0.24, bodyB - s * 0.01);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#565162';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.25, stumpTop - s * 0.07, s * 0.52, s * 0.08, s * 0.02);
            ctx.fill();
            ctx.fillStyle = shade('#565162', 10);
            ctx.fillRect(p.x - s * 0.25, stumpTop - s * 0.07, s * 0.52, s * 0.022);
            // THE FACE TAKES THE SKY: a real foreshortened top plane,
            // bright milled steel the camera looks down onto — the
            // hot bar LIES ON it, the hardy and pritchel holes are
            // sunk INTO it, and the horn's spine carries it west.
            const fD = syT * 0.17;
            ctx.fillStyle = '#8b8697';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.28, yF - fD, s * 0.66, fD + s * 0.035, s * 0.025);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.022);
            ctx.stroke();
            ctx.fillStyle = shade('#8b8697', 14);
            ctx.fillRect(p.x - s * 0.26, yF + s * 0.002, s * 0.62, s * 0.026);
            ctx.fillStyle = shade('#8b8697', -8);
            ctx.fillRect(p.x - s * 0.26, yF - fD + s * 0.012, s * 0.62, s * 0.02);
            // The horn: its lit spine runs out along the curve, and a
            // sliver of top plane tapers with it to the nose.
            ctx.fillStyle = shade('#8b8697', 4);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.28, yF - fD * 0.5);
            ctx.quadraticCurveTo(p.x - s * 0.44, yF - fD * 0.3, p.x - s * 0.57, yF + s * 0.012);
            ctx.quadraticCurveTo(p.x - s * 0.42, yF + s * 0.02, p.x - s * 0.28, yF + s * 0.03);
            ctx.closePath();
            ctx.fill();
            // Hardy (square) and pritchel (round) holes on the heel,
            // sunk in the plane where a smith would find them.
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x + s * 0.24, yF - fD * 0.55, s * 0.05, s * 0.045);
            ctx.beginPath();
            facetCircle(ctx, p.x + s * 0.33, yF - fD * 0.35, s * 0.02, 6, 0.3, 0.7);
            ctx.fill();
            // Work in progress: an orange-hot bar lying ON the face
            // plane, its core brighter than its skin, breathing with
            // the forge.
            ctx.save();
            ctx.translate(p.x + s * 0.02, yF - fD * 0.45);
            ctx.rotate(-0.06);
            ctx.fillStyle = `rgba(226, 106, 44, ${0.75 + heat * 0.25})`;
            ctx.fillRect(-s * 0.19, -s * 0.03, s * 0.38, s * 0.06);
            ctx.fillStyle = `rgba(255, 196, 110, ${heat * 0.85})`;
            ctx.fillRect(-s * 0.12, -s * 0.017, s * 0.17, s * 0.034);
            ctx.restore();
            // Forge sparks: short-lived motes popping off the bar.
            for (let i = 0; i < 2; i++) {
              const ph = (t * (1.3 + i * 0.41) + h * 0.17 + i * 0.53) % 1;
              if (ph < 0.4) {
                const k = ph / 0.4;
                ctx.fillStyle = `rgba(255, 205, 120, ${(1 - k) * 0.85})`;
                ctx.fillRect(
                  p.x + s * (0.04 + i * 0.05) + k * s * (i === 0 ? -0.14 : 0.12),
                  yF - fD * 0.45 - s * 0.04 - k * s * 0.16 + k * k * s * 0.1,
                  s * 0.024,
                  s * 0.024,
                );
              }
            }
            // WORKING THE METAL: while someone hammers, the bar
            // flashes white on each strike beat and throws a fan of
            // sparks off the face — the strike you hear, seen.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            if (act > 0.04) {
              const cyc = t * 1.7 + h * 0.3;
              const beat = cyc % 1;
              const seed = hashCoords(211 + (Math.floor(cyc) % 8), tx, ty);
              if (beat < 0.16) {
                const flash = (1 - beat / 0.16) * act;
                ctx.save();
                ctx.translate(p.x + s * 0.02, yF - fD * 0.45);
                ctx.rotate(-0.06);
                ctx.fillStyle = `rgba(255, 244, 214, ${flash * 0.85})`;
                ctx.fillRect(-s * 0.2, -s * 0.036, s * 0.4, s * 0.072);
                ctx.restore();
              }
              if (beat < 0.45) {
                const k = beat / 0.45;
                ctx.fillStyle = `rgba(255, 205, 120, ${(1 - k) * act * 0.9})`;
                for (let i = 0; i < 5; i++) {
                  const a2 = -Math.PI * (0.12 + 0.76 * (((seed >>> (i * 4)) % 17) / 16));
                  const r2 = k * s * (0.18 + (((seed >>> (i * 3)) % 7) / 7) * 0.2);
                  ctx.fillRect(
                    p.x + s * 0.02 + Math.cos(a2) * r2,
                    yF - fD * 0.45 + Math.sin(a2) * r2 + k * k * s * 0.12,
                    s * 0.026,
                    s * 0.026,
                  );
                }
              }
            }
            // Tongs lean on the stump's east shoulder, jaws up; the
            // smith's hammer rests head-down on the sawn top beside
            // the anvil's foot.
            ctx.save();
            ctx.translate(p.x + s * 0.36, baseY - s * 0.05);
            ctx.rotate(-0.45);
            ctx.fillStyle = '#6a6577';
            ctx.fillRect(-s * 0.015, -s * 0.38, s * 0.03, s * 0.4);
            ctx.fillRect(-s * 0.048, -s * 0.38, s * 0.033, s * 0.11);
            ctx.restore();
            ctx.fillStyle = '#8b8697';
            ctx.fillRect(p.x - s * 0.335, stumpTop - s * 0.045, s * 0.09, s * 0.065);
            ctx.fillStyle = shade('#8b8697', 14);
            ctx.fillRect(p.x - s * 0.335, stumpTop - s * 0.045, s * 0.09, s * 0.02);
            ctx.save();
            ctx.translate(p.x - s * 0.29, stumpTop + s * 0.015);
            ctx.rotate(0.5);
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(-s * 0.018, 0, s * 0.036, s * 0.24);
            ctx.restore();
          },
        };
      }

      case Tile.Workbench: {
        const syT = s * this.camera.yScale;
        // The joiner's bench on the table grammar: a thick working
        // slab in full plan — the camera looks DOWN on the tools of
        // the trade, each standing or lying on its own spot.
        const th = s * 0.52;
        const xL = p.x - s * 0.49;
        const xR = p.x + s * 0.49;
        const yT = p.y - syT * 0.34;
        const yB = p.y + syT * 0.42;
        const topC = '#a5793f';
        const legC = '#5b4028';
        return {
          sortY: ty + 0.9,
          body: stationBody(1.05, 1.55, 0.7),
          drawShadow: () => {
            this.castEdgeQuad(xL, yB + syT * 0.06, xR, yB + syT * 0.06, 0.68);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // AT WORK: the mallet taps its own beat, dust rises off
            // the cut, and the plumb line swings with the bench.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            const tap = act * Math.max(0, Math.sin(t * 3.6 + h));
            // Contact shade, trestle legs splayed a hair.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.fillRect(xL + s * 0.02, yB + s * 0.005, xR - xL - s * 0.04, s * 0.04);
            const leg = (lx: number, ly: number, hgt: number, lean: number) => {
              ctx.save();
              ctx.translate(lx, ly - hgt);
              ctx.rotate(lean);
              ctx.fillStyle = legC;
              ctx.fillRect(-s * 0.047, 0, s * 0.094, hgt);
              ctx.restore();
              ctx.fillStyle = shade(legC, -14);
              ctx.fillRect(lx - s * 0.06, ly - s * 0.02, s * 0.12, s * 0.02);
            };
            leg(xL + s * 0.1, yB, th + syT * 0.05, -0.05);
            leg(xR - s * 0.1, yB, th + syT * 0.05, 0.05);
            leg(xL + s * 0.1, yT + syT * 0.18, (th + syT * 0.05) * 0.92, -0.05);
            leg(xR - s * 0.1, yT + syT * 0.18, (th + syT * 0.05) * 0.92, 0.05);
            // The under-shelf carries the wood store: a plank stack
            // and a coil of lashing rope.
            ctx.fillStyle = legC;
            ctx.fillRect(xL + s * 0.09, yB - th * 0.48, xR - xL - s * 0.18, s * 0.05);
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(xL + s * 0.16, yB - th * 0.48 - s * 0.055, s * 0.46, s * 0.055);
            ctx.fillStyle = '#7a552e';
            ctx.fillRect(xL + s * 0.2, yB - th * 0.48 - s * 0.105, s * 0.4, s * 0.05);
            ctx.strokeStyle = '#a08a5a';
            ctx.lineWidth = Math.max(1.5, s * 0.04);
            ctx.beginPath();
            ctx.arc(xR - s * 0.17, yB - th * 0.48 - s * 0.06, s * 0.055, 0, Math.PI * 2);
            ctx.stroke();
            // The top: one thick slab in plan, rimmed dark, its south
            // lip lit, grain seams running with the boards.
            ctx.fillStyle = topC;
            ctx.beginPath();
            chamferRect(ctx, xL, yT - th, xR - xL, yB - yT, s * 0.05);
            ctx.fill();
            ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
            ctx.lineWidth = Math.max(1.2, s * 0.028);
            ctx.stroke();
            ctx.fillStyle = shade(topC, 14);
            ctx.fillRect(xL + s * 0.01, yB - th - s * 0.045, xR - xL - s * 0.02, s * 0.045);
            ctx.fillStyle = shade(topC, -8);
            ctx.fillRect(xL + s * 0.01, yT - th, xR - xL - s * 0.02, s * 0.028);
            ctx.fillStyle = 'rgba(58, 40, 22, 0.22)';
            for (const fy of [0.38, 0.68] as const) {
              ctx.fillRect(xL + s * 0.08, yT - th + (yB - yT) * fy, xR - xL - s * 0.16, s * 0.017);
            }
            // Dog holes marching along the south rim of the plan.
            ctx.fillStyle = '#3f2c14';
            for (const dx of [-0.32, -0.14, 0.04, 0.22]) {
              ctx.fillRect(p.x + dx * s, yB - th - s * 0.09, s * 0.035, s * 0.03);
            }
            // The end vise stands up from the east end of the plan, a
            // board clamped upright in its jaws with the saw kerf
            // already started; its screw handle pokes east.
            const vx = xR - s * 0.09;
            const vy = yT - th + (yB - yT) * 0.5;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
            ctx.beginPath();
            ctx.ellipse(vx, vy + s * 0.012, s * 0.09, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6f4d26';
            ctx.beginPath();
            chamferRect(ctx, vx - s * 0.075, vy - s * 0.16, s * 0.15, s * 0.16, s * 0.025);
            ctx.fill();
            ctx.fillStyle = shade('#6f4d26', 12);
            ctx.fillRect(vx - s * 0.075, vy - s * 0.16, s * 0.05, s * 0.16);
            ctx.fillStyle = '#8a6534';
            ctx.fillRect(vx - s * 0.034, vy - s * 0.46, s * 0.068, s * 0.3);
            ctx.fillStyle = shade('#8a6534', 12);
            ctx.fillRect(vx - s * 0.034, vy - s * 0.46, s * 0.022, s * 0.3);
            ctx.fillStyle = 'rgba(40, 26, 12, 0.6)';
            ctx.fillRect(vx - s * 0.008, vy - s * 0.46, s * 0.018, s * 0.11);
            ctx.strokeStyle = '#4a3116';
            ctx.lineWidth = Math.max(1.5, s * 0.035);
            ctx.beginPath();
            ctx.moveTo(vx + s * 0.07, vy - s * 0.05);
            ctx.lineTo(vx + s * 0.16, vy + s * 0.03);
            ctx.stroke();
            // Tools ON the plan: a handsaw lying flat across the west
            // end (blade, spine shine, tote), mallet and chisel
            // mid-bench — the mallet lifts and knocks while working.
            const swy = yT - th + (yB - yT) * 0.42;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.beginPath();
            ctx.ellipse(xL + s * 0.24, swy + s * 0.05, s * 0.2, s * 0.035, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#9aa2ac';
            ctx.beginPath();
            ctx.moveTo(xL + s * 0.06, swy - s * 0.02);
            ctx.lineTo(xL + s * 0.38, swy - s * 0.045);
            ctx.lineTo(xL + s * 0.38, swy + s * 0.02);
            ctx.lineTo(xL + s * 0.1, swy + s * 0.035);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(xL + s * 0.08, swy - s * 0.018, s * 0.28, s * 0.014);
            ctx.fillStyle = '#6f4d26';
            ctx.fillRect(xL + s * 0.38, swy - s * 0.06, s * 0.07, s * 0.075);
            ctx.fillStyle = 'rgba(40, 26, 12, 0.5)';
            ctx.fillRect(xL + s * 0.4, swy - s * 0.04, s * 0.03, s * 0.035);
            const mlx = p.x + s * 0.1;
            const mly = yT - th + (yB - yT) * 0.72;
            ctx.fillStyle = 'rgba(18, 12, 26, 0.16)';
            ctx.beginPath();
            ctx.ellipse(mlx + s * 0.03, mly + s * 0.03, s * 0.1, s * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.translate(mlx, mly - tap * s * 0.08);
            ctx.rotate(0.4 - tap * 0.35);
            ctx.fillStyle = '#8a6a45';
            ctx.fillRect(-s * 0.016, 0, s * 0.032, s * 0.15);
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            chamferRect(ctx, -s * 0.055, -s * 0.1, s * 0.11, s * 0.1, s * 0.02);
            ctx.fill();
            ctx.fillStyle = shade('#7a552e', 14);
            ctx.fillRect(-s * 0.055, -s * 0.1, s * 0.11, s * 0.025);
            ctx.restore();
            ctx.fillStyle = '#9aa2ac';
            ctx.fillRect(mlx + s * 0.12, mly - s * 0.02, s * 0.11, s * 0.026);
            ctx.fillStyle = '#6f4d26';
            ctx.fillRect(mlx + s * 0.23, mly - s * 0.026, s * 0.045, s * 0.038);
            // Shaving litter where the plane last ran — filled curl
            // chips on the plan, a few fallen to the floor.
            ctx.fillStyle = 'rgba(216, 192, 138, 0.85)';
            for (const [cx2, cy2, rot] of [
              [p.x - s * 0.04, yT - th + (yB - yT) * 0.6, 0.4],
              [p.x + s * 0.28, yT - th + (yB - yT) * 0.82, 1.8],
              [p.x - s * 0.22, yT - th + (yB - yT) * 0.76, 2.6],
              [xL + s * 0.1, yB + s * 0.03, 1.1],
            ] as const) {
              ctx.save();
              ctx.translate(cx2, cy2);
              ctx.rotate(rot);
              ctx.fillRect(-s * 0.032, -s * 0.011, s * 0.064, s * 0.022);
              ctx.restore();
            }
            // Sawdust lifts off the vise cut while the work is live.
            if (act > 0.04) {
              for (let i = 0; i < 3; i++) {
                const ph = (t * (0.8 + i * 0.27) + h * 0.13 + i * 0.37) % 1;
                ctx.fillStyle = `rgba(216, 192, 138, ${(1 - ph) * act * 0.6})`;
                ctx.fillRect(
                  vx - s * 0.1 + Math.sin(t * 2 + i * 2.2) * s * 0.03 + i * s * 0.04,
                  vy - s * 0.4 - ph * s * 0.22,
                  s * 0.022,
                  s * 0.022,
                );
              }
            }
            // A plumb line hangs off the south rim, never quite
            // still — the maker's mark of a bench in use.
            const sway =
              Math.sin(t * 1.6 + h) * s * 0.03 * (1 + act * 1.6) +
              Math.sin(t * 4.3 + h * 2) * s * 0.02 * act;
            const nx = xL + s * 0.12;
            const ny = yB - th + s * 0.02;
            ctx.strokeStyle = 'rgba(224, 214, 186, 0.7)';
            ctx.lineWidth = Math.max(1, s * 0.014);
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.quadraticCurveTo(nx + sway * 0.4, ny + s * 0.1, nx + sway, ny + s * 0.19);
            ctx.stroke();
            ctx.fillStyle = '#3a3544';
            ctx.beginPath();
            facetCircle(ctx, nx + sway, ny + s * 0.22, s * 0.028, 4, Math.PI / 4);
            ctx.fill();
          },
        };
      }

      case Tile.ChestWood:
      case Tile.ChestWoodOpen:
      case Tile.ChestMossy:
      case Tile.ChestMossyOpen:
      case Tile.ChestIron:
      case Tile.ChestIronOpen:
      case Tile.ChestGilded:
      case Tile.ChestGildedOpen:
      case Tile.ChestBoss:
      case Tile.ChestBossOpen: {
        // Loot chests — see THE CHEST GRAMMAR v2 above the painters.
        // The tile is the state; chestOpenness eases the two-beat
        // swing between the closed and open tiles.
        const info = chestInfo(tile)!;
        const kind = info.kind;
        const baseY = p.y + s * this.camera.yScale * 0.3;
        const halfW = kind === 'boss' ? 0.5 : 0.44;
        return {
          sortY: ty + 0.85,
          body: stationBody(halfW + 0.42, kind === 'boss' ? 1.6 : 1.4, 0.6),
          drawShadow: () => {
            this.castEdgeQuad(p.x - halfW * s, baseY, p.x + halfW * s, baseY, kind === 'boss' ? 0.66 : 0.55);
          },
          draw: () => {
            // Draw-time ctx capture: the ring bake swaps this.ctx to
            // its scratch — a build-time capture paints past it.
            const ctx2 = this.ctx;
            const o = this.chestOpenness(tx, ty, info.open);
            // Every chest owns its ground.
            ctx2.fillStyle = 'rgba(18, 12, 26, 0.24)';
            ctx2.fillRect(p.x - halfW * s, baseY - s * 0.015, halfW * 2 * s, s * 0.05);
            if (kind === 'wood') this.drawChestWood(ctx2, p.x, baseY, s, o);
            else if (kind === 'mossy') this.drawChestMossy(ctx2, p.x, baseY, s, o);
            else if (kind === 'iron') this.drawChestIron(ctx2, p.x, baseY, s, o);
            else if (kind === 'gilded') this.drawChestGilded(ctx2, p.x, baseY, s, o, t, h);
            else this.drawChestBoss(ctx2, p.x, baseY, s, o, t, h);
          },
        };
      }

      case Tile.BankChest: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.26;
        // Treasure breathes: the lid seam leaks a slow pulse of gold.
        const gleam = 0.5 + Math.sin(t * 2.1 + h) * 0.3;
        return {
          sortY: ty + 0.85,
          body: stationBody(0.95, 1.2, 0.6),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.38, baseY, p.x + s * 0.38, baseY, 0.68);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // A cut-stone plinth — the bank does not set gold on dirt.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
            ctx.fillRect(p.x - s * 0.44, baseY - s * 0.01, s * 0.88, s * 0.045);
            ctx.fillStyle = '#6e6879';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.42, baseY - s * 0.1, s * 0.84, s * 0.1, s * 0.03);
            ctx.fill();
            ctx.fillStyle = shade('#6e6879', 12);
            ctx.fillRect(p.x - s * 0.4, baseY - s * 0.1, s * 0.8, s * 0.03);
            // The strongbox: oak body under a barrel lid. While the
            // bank is open the lid rides the heat envelope up over its
            // back hinge — negative y-scale past halfway means you see
            // its underside standing behind the box, like a real chest.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            const o = act;
            const bodyT = baseY - s * 0.44;
            const lidT = bodyT - s * 0.24;
            ctx.fillStyle = '#7a552e';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.34, bodyT, s * 0.68, s * 0.34, s * 0.03);
            ctx.fill();
            ctx.fillStyle = shade('#7a552e', -10);
            ctx.fillRect(p.x - s * 0.34, baseY - s * 0.16, s * 0.68, s * 0.06);
            // The open mouth: dark felt and the customer's gold.
            if (o > 0.1) {
              ctx.fillStyle = '#241a10';
              ctx.fillRect(p.x - s * 0.31, bodyT + s * 0.005, s * 0.62, s * 0.1);
              ctx.fillStyle = '#d9a441';
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                facetCircle(ctx, p.x - s * 0.21 + i * s * 0.14, bodyT + s * 0.055, s * 0.045, 6, i * 1.2, 0.6);
                ctx.fill();
              }
            }
            const hingeY = lidT + s * 0.01;
            ctx.save();
            ctx.translate(0, hingeY);
            ctx.scale(1, 1 - o * 1.5);
            ctx.translate(0, -hingeY);
            ctx.fillStyle = '#94693a';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.37, lidT, s * 0.74, s * 0.26, [s * 0.1, s * 0.1, s * 0.02, s * 0.02]);
            ctx.fill();
            ctx.fillStyle = shade('#94693a', 14);
            ctx.fillRect(p.x - s * 0.28, lidT + s * 0.02, s * 0.56, s * 0.05);
            ctx.fillStyle = '#3a3544';
            for (const bx of [-0.24, 0.185] as const) {
              ctx.fillRect(p.x + bx * s, lidT + s * 0.015, s * 0.055, s * 0.23);
            }
            ctx.fillStyle = '#8f96a3';
            for (const bx of [-0.24, 0.185] as const) {
              ctx.fillRect(p.x + bx * s + s * 0.014, lidT + s * 0.06, s * 0.028, s * 0.028);
            }
            ctx.fillStyle = '#d9a441';
            ctx.fillRect(p.x - s * 0.37, lidT + s * 0.22, s * 0.74, s * 0.028);
            if (o > 0.5) {
              // Past vertical we're looking at the underside.
              ctx.fillStyle = `rgba(24, 15, 6, ${(o - 0.5) * 0.55})`;
              ctx.fillRect(p.x - s * 0.37, lidT - s * 0.01, s * 0.74, s * 0.28);
            }
            ctx.restore();
            // The seam: lamplight off coin escaping where lid meets
            // box — swallowed by the real light once the lid is up.
            ctx.fillStyle = `rgba(255, 208, 110, ${(0.25 + gleam * 0.3) * (1 - o)})`;
            ctx.fillRect(p.x - s * 0.31, bodyT - s * 0.012, s * 0.62, s * 0.024);
            // Body straps, rivets, and the gold edge band.
            ctx.fillStyle = '#3a3544';
            for (const bx of [-0.24, 0.185] as const) {
              ctx.fillRect(p.x + bx * s, bodyT + s * 0.02, s * 0.055, s * 0.3);
            }
            ctx.fillStyle = '#8f96a3';
            for (const bx of [-0.24, 0.185] as const) {
              for (const by of [bodyT + s * 0.08, bodyT + s * 0.24]) {
                ctx.fillRect(p.x + bx * s + s * 0.014, by, s * 0.028, s * 0.028);
              }
            }
            ctx.fillStyle = '#d9a441';
            ctx.fillRect(p.x - s * 0.34, baseY - s * 0.13, s * 0.68, s * 0.028);
            // Treasure light climbs out of the open box, motes riding
            // it — drawn over the lid so the beam owns the frame.
            if (o > 0.1) {
              ctx.fillStyle = `rgba(255, 208, 110, ${0.2 * o})`;
              ctx.fillRect(p.x - s * 0.26, bodyT - s * 0.46, s * 0.52, s * 0.46);
              ctx.fillStyle = `rgba(255, 232, 168, ${0.11 * o})`;
              ctx.fillRect(p.x - s * 0.15, bodyT - s * 0.72, s * 0.3, s * 0.72);
              for (let i = 0; i < 2; i++) {
                const ph = (t * (0.6 + i * 0.23) + h * 0.11 + i * 0.5) % 1;
                ctx.fillStyle = `rgba(255, 226, 150, ${(1 - ph) * o * 0.8})`;
                ctx.fillRect(
                  p.x + Math.sin(t * 1.8 + i * 2.6 + h) * s * 0.12,
                  bodyT - ph * s * 0.55,
                  s * 0.024,
                  s * 0.024,
                );
              }
            }
            // Hasp and padlock: the lock IS the promise. The plate
            // slides off the seam as the lid lifts away from it.
            ctx.fillStyle = '#d9a441';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.065, bodyT - s * 0.07 * (1 - o), s * 0.13, s * 0.15, s * 0.03);
            ctx.fill();
            ctx.strokeStyle = '#c9962e';
            ctx.lineWidth = Math.max(1.5, s * 0.035);
            ctx.beginPath();
            ctx.arc(p.x, bodyT + s * 0.1, s * 0.05, Math.PI, 0);
            ctx.stroke();
            ctx.fillStyle = '#c9962e';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.055, bodyT + s * 0.1, s * 0.11, s * 0.1, s * 0.02);
            ctx.fill();
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - s * 0.012, bodyT + s * 0.125, s * 0.024, s * 0.045);
            // Spilled takings on the plinth: coins and one teal gem.
            ctx.fillStyle = '#d9a441';
            for (const [cx2, cy2] of [
              [0.28, -0.035],
              [0.34, -0.055],
              [0.24, -0.07],
            ] as const) {
              ctx.beginPath();
              facetCircle(ctx, p.x + cx2 * s, baseY + cy2 * s - s * 0.02, s * 0.035, 6, cx2 * 9, 0.6);
              ctx.fill();
            }
            ctx.fillStyle = '#7fc9b3';
            ctx.beginPath();
            facetCircle(ctx, p.x - s * 0.3, baseY - s * 0.05, s * 0.035, 5, 0.5, 0.75);
            ctx.fill();
            // Every few beats a glint stars off the gold work.
            const gp = (t * 0.42 + h * 0.19) % 1;
            if (gp < 0.16) {
              const k = Math.sin((gp / 0.16) * Math.PI);
              const gx = p.x + s * ((((h >>> 3) % 5) - 2) * 0.09);
              const gy = lidT + s * 0.23;
              ctx.fillStyle = `rgba(255, 240, 190, ${k * 0.9})`;
              ctx.fillRect(gx - s * 0.05, gy - s * 0.011, s * 0.1, s * 0.022);
              ctx.fillRect(gx - s * 0.011, gy - s * 0.05, s * 0.022, s * 0.1);
            }
          },
        };
      }

      case Tile.ShopCounter: {
        const syT = s * this.camera.yScale;
        const baseY = p.y + syT * 0.3;
        const topY = baseY - s * 0.56;
        return {
          sortY: ty + 0.9,
          body: stationBody(),
          drawShadow: () => {
            this.castEdgeQuad(p.x - s * 0.46, baseY, p.x + s * 0.46, baseY, 0.8);
          },
          draw: () => {
            // Draw-time ctx capture: the outline pass swaps this.ctx
            // to its scratch — the build-time capture would paint past it.
            const ctx = this.ctx;
            // The scale beam never quite settles — a shop is never
            // done weighing — and while a sale is on, it works harder.
            const act = this.stationHeat.get(packTile(tx, ty)) ?? 0;
            const tilt =
              Math.sin(t * 0.8 + h) * 0.09 * (1 + act * 0.8) +
              Math.sin(t * 2.7 + h * 2) * 0.05 * act;
            // Paneled counter: plinth foot, rail-and-stile front, then
            // the slab. Joinery reads as an established business.
            ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
            ctx.fillRect(p.x - s * 0.44, baseY - s * 0.015, s * 0.88, s * 0.045);
            ctx.fillStyle = '#4a3116';
            ctx.fillRect(p.x - s * 0.43, baseY - s * 0.07, s * 0.86, s * 0.07);
            ctx.fillStyle = '#5e3f1e';
            ctx.fillRect(p.x - s * 0.41, topY, s * 0.82, baseY - s * 0.07 - topY);
            ctx.fillStyle = shade('#5e3f1e', -12);
            for (const px2 of [-0.35, 0.05] as const) {
              ctx.fillRect(p.x + px2 * s, topY + s * 0.1, s * 0.3, s * 0.3);
            }
            ctx.fillStyle = shade('#5e3f1e', 10);
            for (const px2 of [-0.35, 0.05] as const) {
              ctx.fillRect(p.x + px2 * s, topY + s * 0.1, s * 0.3, s * 0.025);
            }
            // The slab overhangs with a bright working face.
            ctx.fillStyle = '#a5793f';
            ctx.beginPath();
            chamferRect(ctx, p.x - s * 0.47, topY - s * 0.14, s * 0.94, s * 0.16, s * 0.04);
            ctx.fill();
            ctx.fillStyle = shade('#a5793f', 14);
            ctx.fillRect(p.x - s * 0.43, topY - s * 0.12, s * 0.86, s * 0.045);
            // The merchant's runner: good cloth under the scale says
            // the prices here are honest.
            ctx.fillStyle = '#8a3d3d';
            ctx.fillRect(p.x - s * 0.22, topY - s * 0.145, s * 0.32, s * 0.05);
            ctx.fillRect(p.x - s * 0.18, topY - s * 0.1, s * 0.24, s * 0.2);
            ctx.fillStyle = shade('#8a3d3d', -12);
            ctx.fillRect(p.x - s * 0.18, topY + s * 0.045, s * 0.24, s * 0.055);
            ctx.fillStyle = shade('#8a3d3d', 8);
            ctx.fillRect(p.x - s * 0.18, topY - s * 0.1, s * 0.045, s * 0.2);
            // The balance: post and finial, a tilting beam, pans hung
            // plumb from its tips whatever the beam is doing.
            const bx = p.x - s * 0.06;
            const postT = topY - s * 0.48;
            ctx.fillStyle = '#3a3544';
            ctx.fillRect(bx - s * 0.02, postT, s * 0.04, s * 0.34);
            ctx.beginPath();
            facetCircle(ctx, bx, postT, s * 0.035, 6, 0.3);
            ctx.fill();
            ctx.save();
            ctx.translate(bx, postT + s * 0.03);
            ctx.rotate(tilt);
            ctx.fillStyle = '#6a6577';
            ctx.fillRect(-s * 0.2, -s * 0.016, s * 0.4, s * 0.032);
            for (const side of [-1, 1] as const) {
              ctx.save();
              ctx.translate(side * s * 0.19, 0);
              ctx.rotate(-tilt);
              ctx.strokeStyle = 'rgba(200, 200, 210, 0.6)';
              ctx.lineWidth = Math.max(1, s * 0.016);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, s * 0.13);
              ctx.stroke();
              ctx.fillStyle = '#8f96a3';
              ctx.beginPath();
              facetCircle(ctx, 0, s * 0.14, s * 0.065, 6, 0.2, 0.45);
              ctx.fill();
              ctx.restore();
            }
            ctx.restore();
            // Brass weights beside the post; the till's coin columns
            // stacked east, each coin its own struck edge.
            ctx.fillStyle = '#c9962e';
            ctx.fillRect(p.x + s * 0.08, topY - s * 0.18, s * 0.05, s * 0.05);
            ctx.fillRect(p.x + s * 0.14, topY - s * 0.155, s * 0.038, s * 0.038);
            for (const [colX, n] of [
              [0.26, 3],
              [0.36, 2],
              [0.31, 4],
            ] as const) {
              for (let i = 0; i < n; i++) {
                ctx.fillStyle = i === n - 1 ? '#e8bc5a' : '#d9a441';
                ctx.fillRect(
                  p.x + colX * s - s * 0.05 + ((h >> i) % 3) * s * 0.006,
                  topY - s * 0.15 - i * s * 0.032,
                  s * 0.1,
                  s * 0.028,
                );
              }
            }
            // The ledger lies open west, quill standing in its pot —
            // every sale gets written down.
            ctx.fillStyle = '#e8dfc8';
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.42, topY - s * 0.14);
            ctx.lineTo(p.x - s * 0.28, topY - s * 0.165);
            ctx.lineTo(p.x - s * 0.26, topY - s * 0.08);
            ctx.lineTo(p.x - s * 0.4, topY - s * 0.06);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(36, 22, 10, 0.4)';
            ctx.fillRect(p.x - s * 0.35, topY - s * 0.15, s * 0.015, s * 0.085);
            ctx.fillStyle = '#2c2836';
            ctx.fillRect(p.x - s * 0.24, topY - s * 0.2, s * 0.05, s * 0.06);
            ctx.strokeStyle = '#d8d2c2';
            ctx.lineWidth = Math.max(1, s * 0.018);
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.215, topY - s * 0.2);
            ctx.quadraticCurveTo(p.x - s * 0.19, topY - s * 0.3, p.x - s * 0.14, topY - s * 0.33);
            ctx.stroke();
            // A SALE IN PROGRESS: a coin arcs from the pan to the till
            // and the stacked gold catches the light more often.
            if (act > 0.04) {
              const ph = (t * 0.85 + h * 0.07) % 1;
              ctx.fillStyle = `rgba(232, 188, 90, ${Math.min(1, act * 1.4)})`;
              ctx.beginPath();
              facetCircle(
                ctx,
                p.x - s * 0.25 + ph * s * 0.56,
                topY - s * 0.32 - Math.sin(ph * Math.PI) * s * 0.22 + ph * s * 0.1,
                s * 0.032,
                6,
                ph * 7,
                0.7,
              );
              ctx.fill();
              const gp2 = (t * 0.9 + h * 0.23) % 1;
              if (gp2 < 0.2) {
                const k2 = Math.sin((gp2 / 0.2) * Math.PI) * act;
                ctx.fillStyle = `rgba(255, 240, 190, ${k2 * 0.9})`;
                ctx.fillRect(p.x + s * 0.265, topY - s * 0.27, s * 0.09, s * 0.02);
                ctx.fillRect(p.x + s * 0.3, topY - s * 0.305, s * 0.02, s * 0.09);
              }
            }
          },
        };
      }

      default:
        return { sortY: ty, draw: () => {} };
    }
  }

  // ---------------------------------------------------------- entities

  /**
   * Every body the grass should feel: players and NPCs, own player
   * included. The grass system derives velocities itself (it remembers
   * last positions per id), so this is just who-is-where.
   */
  /** This frame's moving bodies (players + NPCs), pooled records.
   *  Shared by the grass system AND the doorway veil — one gather. */
  private readonly frameDisturbers: Disturber[] = [];
  private readonly disturberPool: Disturber[] = [];

  private collectDisturbers(game: ClientGame): Disturber[] {
    const out = this.frameDisturbers;
    out.length = 0;
    const t = game.renderTime();
    let n = 0;
    const claim = (): Disturber => {
      let d = this.disturberPool[n];
      if (!d) {
        d = { id: 0, x: 0, y: 0, r: 0 };
        this.disturberPool[n] = d;
      }
      n++;
      return d;
    };
    for (const [eid, remote] of game.entities) {
      const kind = remote.meta.kind;
      if (kind !== EntityKind.Player && kind !== EntityKind.Npc) continue;
      const s = remote.buffer.sampleAt(t);
      const radius = kind === EntityKind.Npc ? (npcDef(remote.meta.defId ?? '')?.radius ?? 0.3) : 0.3;
      const d = claim();
      d.id = eid;
      d.x = s?.x ?? remote.meta.x;
      d.y = s?.y ?? remote.meta.y;
      d.r = radius;
      out.push(d);
    }
    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      const d = claim();
      d.id = 'own';
      d.x = own.x;
      d.y = own.y;
      d.r = 0.3;
      out.push(d);
    }
    return out;
  }

  private collectEntities(game: ClientGame, items: DrawItem[]): void {
    const t = game.renderTime();
    // Projectiles live on the server-NOW timeline: extrapolated to
    // their true in-flight position instead of the interp past — your
    // arrow tracks its real flight and lands in sync with the hit FX.
    const tProj = game.projectileTime();
    const now = performance.now();
    this.frameLoot.length = 0;
    this.consumeProjectileAftermath(game, now);

    for (const [eid, remote] of game.entities) {
      const timeline = remote.meta.kind === EntityKind.Projectile ? tProj : t;
      const s = remote.buffer.sampleAt(timeline) ?? {
        x: remote.meta.x,
        y: remote.meta.y,
        dir: 0,
        pose: PoseState.Idle,
        hpPct: 255,
        status: 0,
      };
      const hurt = (remote.hurtUntil ?? 0) > now;
      if (s.status) this.statusAmbience(s.x, s.y, s.status);
      const remoteEnch = remote.meta.appearance?.ench;
      if (remoteEnch) this.enchantAura(s.x, s.y, remoteEnch);

      switch (remote.meta.kind) {
        case EntityKind.Player: {
          const item = this.humanoidItem({
            eid,
            x: s.x,
            y: s.y,
            dir: s.dir,
            pose: s.pose,
            hpPct: s.hpPct,
            name: remote.meta.name,
            isOwn: false,
            hurt,
            equip: remote.meta.appearance?.equip ?? {},
            ench: remote.meta.appearance?.ench,
            carry: remote.meta.appearance?.carry,
            carryOff: remote.meta.appearance?.carryOff,
            look: remote.meta.appearance?.look,
            sheathed: (s.status & SHEATHED_BIT) !== 0,
            color: remote.meta.appearance?.look
              ? CLOTH_COLORS[remote.meta.appearance.look.shirt]!
              : PLAYER_COLORS[hashString(remote.meta.name ?? String(eid)) % PLAYER_COLORS.length]!,
          });
          this.dressForWater(game, item, eid, s.x, s.y);
          items.push(item);
          break;
        }
        case EntityKind.Npc: {
          // Humanoid ACTORS (named townsfolk) broadcast appearance
          // exactly like players — one rig renders both. Creature
          // actors and the bestiary go through npcItem's body art.
          const item = remote.meta.appearance
            ? this.humanoidItem({
                eid,
                x: s.x,
                y: s.y,
                dir: s.dir,
                pose: s.pose,
                hpPct: s.hpPct,
                name: remote.meta.name,
                level: remote.meta.level,
                isOwn: false,
                hurt,
                equip: remote.meta.appearance.equip ?? {},
                ench: remote.meta.appearance.ench,
                look: remote.meta.appearance.look,
                sheathed: (s.status & SHEATHED_BIT) !== 0,
                color: remote.meta.appearance.look
                  ? CLOTH_COLORS[remote.meta.appearance.look.shirt]!
                  : '#c8b89a',
              })
            : this.npcItem(eid, remote.meta.defId ?? '', remote.meta, s, hurt);
          this.dressForWater(game, item, eid, s.x, s.y);
          items.push(item);
          const pins = this.npcArrows.get(eid);
          if (pins && pins.length > 0) items.push(this.npcArrowsItem(pins, s));
          break;
        }
        case EntityKind.ItemDrop:
          items.push(
            this.dropItem(eid, remote.meta.defId ?? '', remote.meta.qty ?? 1, s, now, remote.meta.roll),
          );
          break;
        case EntityKind.Projectile: {
          // Tracer handoff (v8): on this entity's FIRST draw, measure
          // the gap between where the predicted tracer flew and where
          // the authoritative shot is, then decay it away (~90ms) —
          // the flight reads as one continuous arrow.
          let sp = s;
          const h = game.projHandoffs.get(eid);
          if (h) {
            if (h.capturedAt === 0) {
              const age = (now - h.shot.bornAt) / 1000;
              h.ox = h.shot.x + h.shot.dirX * h.shot.speed * age - s.x;
              h.oy = h.shot.y + h.shot.dirY * h.shot.speed * age - s.y;
              h.capturedAt = now;
              // The tracer already fired this shot's muzzle flash.
              this.projSeen.add(eid);
            }
            const k = Math.exp(-(now - h.capturedAt) / 90);
            if (k < 0.02) {
              game.projHandoffs.delete(eid);
            } else {
              sp = { ...s, x: s.x + h.ox * k, y: s.y + h.oy * k };
            }
          }
          items.push(this.projectileItem(eid, remote.meta.defId ?? '', sp));
          break;
        }
        case EntityKind.Prop:
          if (remote.meta.defId?.startsWith('summon_')) {
            items.push(this.summonItem(remote.meta.defId, s, now));
          }
          break;
        default:
          break;
      }
    }

    // PREDICTED TRACERS (v8): the local player's shots, flying from the
    // instant of release — the server entity takes over on arrival
    // (handoff above). Pseudo-eids are negative so the muzzle-flash
    // first-sight logic works unchanged. Mispredictions fade out.
    for (const shot of game.ownShots) {
      const age = (now - shot.bornAt) / 1000;
      const flown = Math.min(shot.speed * age, shot.range);
      const item = this.projectileItem(-1 - shot.seq, shot.defId, {
        x: shot.x + shot.dirX * flown,
        y: shot.y + shot.dirY * flown,
        dir: shot.dir,
      });
      // A tracer past its plausible arrival window is a misprediction —
      // fade its last 150ms instead of vanishing mid-air.
      const ageMs = now - shot.bornAt;
      if (ageMs > 400) item.alpha = Math.max(0, 1 - (ageMs - 400) / 150);
      items.push(item);
    }

    // Arrows standing where they landed — the field remembers the fight.
    for (const a of this.stuckArrows) items.push(this.stuckArrowItem(a, now));
    for (const f of this.fallingShafts) items.push(this.fallingShaftItem(f, now));

    // Ragdolls mid-tumble and corpses at rest.
    this.tickCorpses(game, now);
    for (const c of this.corpses) items.push(this.corpseItem(c, now));

    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      if (game.ownStatus) this.statusAmbience(own.x, own.y, game.ownStatus);
      // The rig only wants item IDS — strip the equip map's rolls,
      // keeping just the enchant ids (they ARE appearance).
      const ownEquip: Partial<Record<string, string>> = {};
      let ownEnch: Partial<Record<string, string>> | undefined;
      for (const [slot, worn] of Object.entries(game.equipment)) {
        if (!worn) continue;
        ownEquip[slot] = worn.id;
        if (worn.roll?.ench) {
          ownEnch ??= {};
          ownEnch[slot] = worn.roll.ench;
        }
      }
      if (ownEnch) this.enchantAura(own.x, own.y, ownEnch);
      const ownItem = this.humanoidItem({
        eid: 'own',
        x: own.x,
        y: own.y,
        dir: game.aim,
        pose: game.ownPose,
        hpPct: 255,
        name: game.ownName,
        isOwn: true,
        hurt: game.ownHurtUntil > now,
        equip: ownEquip,
        ench: ownEnch,
        carry: game.carryStyle,
        carryOff: game.carryOff,
        look: game.ownLook ?? undefined,
        color: game.ownLook
          ? CLOTH_COLORS[game.ownLook.shirt]!
          : PLAYER_COLORS[hashString(game.ownName) % PLAYER_COLORS.length]!,
        drawTOverride: game.ownDrawT,
        sheathed: game.isSheathed,
      });
      // Only WE see ourselves while stealthed — a ghost of our own body.
      if (game.isHidden) ownItem.alpha = 0.45;
      else if (game.isSneaking) ownItem.alpha = 0.8;
      this.dressForWater(game, ownItem, 'own', own.x, own.y);
      // The ghost ember pass reads this after the sorted loop — the
      // ONLY body it may redraw (the anti-wallhack law).
      this.ownItem = ownItem;
      items.push(ownItem);
    }
  }

  /** What a footfall kicks loose from each ground. Null = nothing
   * (wet ground swallows the impact). Mult scales how much a given
   * surface gives up — sand erupts, flagstone barely powders. */
  private static dustFor(tile: number | undefined): { colors: string[]; mult: number } | null {
    switch (tile) {
      case undefined:
      case Tile.Water:
      case Tile.WaterDeep:
      case Tile.Swamp:
        return null;
      case Tile.WaterShallow:
        // Wading footfalls throw SPRAY, not dust.
        return { colors: ['#bfe0f2', '#8fc3e0', '#eaf4fb'], mult: 1.1 };
      case Tile.Sand:
        return { colors: ['#d9c9a2', '#cdbb8e', '#e3d5b0'], mult: 1.3 };
      case Tile.Snow:
        return { colors: ['#eef2f7', '#dfe7f0', '#cdd8e6'], mult: 1.2 };
      case Tile.StoneFloor:
      case Tile.Cliff:
      case Tile.Ramp:
        return { colors: ['#9aa2ac', '#8a8494', '#a7aeb8'], mult: 0.45 };
      case Tile.WoodFloor:
      case Tile.Bridge:
      case Tile.Dock:
        return { colors: ['#b5a488', '#a5936f'], mult: 0.35 };
      case Tile.CaveFloor:
      case Tile.CaveWall:
        return { colors: ['#767083', '#6a6375', '#847e91'], mult: 0.7 };
      case Tile.Grass:
      case Tile.GrassTall:
        // Turf holds itself together — a footfall shakes loose dry
        // earth with a few green bits, not a sandstorm.
        return { colors: ['#8a9a5e', '#a89880', '#7d8f55'], mult: 0.8 };
      default:
        // Path, Dirt, Tilled, crops, anything else earthy.
        return { colors: ['#a89880', '#bcae94', '#9b8a70'], mult: 1 };
    }
  }

  /**
   * A foot met the ground — kick loose a puff of whatever the ground
   * is made of. Speed decides how much earth moves: an amble stirs
   * almost nothing, a sprint tears little clouds off every plant.
   * The puff fans low and backward along the travel line, billows
   * (grow) and settles fast (drag) — impact dust, not smoke.
   */
  private kickDust(legs: LegRig, sizeMult = 1): void {
    const speed = legs.plantSpeed;
    if (speed < 1.1) return; // idle shuffles and turns stir nothing
    const world = this.game?.world;
    if (!world) return;
    const x = legs.plantX;
    const y = legs.plantY;
    const dust = Renderer.dustFor(world.groundAt(Math.floor(x), Math.floor(y)));
    if (!dust) return;
    // 0 at a slow walk → 1 at a full sprint (~5 tiles/sec).
    const k = Math.min(1, (speed - 1.1) / 3.9);
    const power = (0.35 + 0.65 * k) * dust.mult * sizeMult;
    const count = Math.round(0.6 + 2.6 * k * dust.mult * sizeMult);
    if (count < 1) return;
    const dir = Math.atan2(-legs.plantVy, -legs.plantVx);
    this.particles.burst(x, y, count, dust.colors, {
      dir,
      spread: 1.3,
      speed: 0.6 + 1.3 * k,
      life: 0.45 + 0.35 * k,
      size: 0.045 + 0.05 * power,
      gravity: 0.4,
      drag: 3.4,
      grow: 0.08 + 0.1 * power,
      // Dust hugs the ground: it y-sorts with the world so a body
      // running south draws OVER the trail it leaves behind.
      ground: true,
    });
  }

  private humanoidItem(e: {
    eid: number | 'own';
    x: number;
    y: number;
    dir: number;
    pose: number;
    name?: string;
    isOwn: boolean;
    color: string;
    hpPct: number;
    hurt?: boolean;
    equip: Partial<Record<string, string>>;
    /** Enchant ids by slot — drives blade fx and the tier-3 aura. */
    ench?: Partial<Record<string, string>>;
    /** Cosmetic idle carry preference ('rogue' = reverse grip). */
    carry?: 'normal' | 'rogue';
    /** Off-fist grip preference — each hand carries its own way. */
    carryOff?: 'normal' | 'rogue';
    size?: number;
    skinColor?: string;
    level?: number;
    /** Player-chosen base look (skin/hair/beard/cloth). */
    look?: Look;
    /** Live local bow-draw charge (own player only). */
    drawTOverride?: number;
    /** Bone-dialect override: this humanoid is a skeleton. */
    skeletal?: SkeletonLook;
    /** Scale-dialect override: this humanoid is a kobold. */
    kobold?: KoboldLook;
    /** Weapons stowed on the body (snapshot SHEATHED_BIT). */
    sheathed?: boolean;
  }): DrawItem {
    const s = this.camera.scale;
    const now = performance.now();
    const anim = this.animFor(e.eid, e.x, e.y, e.pose, now);
    if (!anim.legs || anim.rigKey !== 'humanoid') {
      anim.legs = new LegSolver();
      anim.rigKey = 'humanoid';
    }
    const legPose = anim.legs.update(e.x, e.y, e.dir, this.frameDt);
    // Seated rest: drop the hips, stretch the legs to forward ground
    // targets, lean the torso back — the armored wayside sit. Two
    // postures by eid parity (lounger / knee-up) so a campfire circle
    // never rests identically.
    const sitTarget = e.pose === PoseState.Sit ? 1 : 0;
    let sitK = anim.sitK ?? 0;
    sitK += (sitTarget - sitK) * (1 - Math.exp(-5 * this.frameDt));
    if (sitK < 0.004) sitK = 0;
    else if (sitK > 0.996) sitK = 1;
    anim.sitK = sitK;
    const sitE = sitK * sitK * (3 - 2 * sitK);
    // Posture by entity id parity — stable per body, mixed per crowd.
    // The own body resolves its REAL eid so the mirror never disagrees
    // with what other players see.
    const varEid = typeof e.eid === 'number' ? e.eid : (this.game?.ownEid ?? 0);
    const sitVariant = (Math.abs(varEid) % 2) as 0 | 1;
    // THE CROWD BREATHES OUT OF STEP: every body owns a fixed offset
    // on the cosmetic clock — the idle wrist life, blade flourishes,
    // standing breath, and station strokes all read rig.nowMs, so one
    // shared clock plays every idler in unison like a chorus line.
    // Hashed off the eid: stable per body, scattered per crowd, and
    // 9973 (prime > FLOURISH_PERIOD_MS) spans every cosmetic cycle.
    // The strike-beat fx below MUST ride the same shifted clock so
    // sparks and chips keep landing exactly on the visual impacts.
    const lifeMs = ((Math.abs(varEid) * 2654435761) >>> 0) % 9973;
    // Footstep events: a touchdown happened inside that update.
    if (anim.lastPlants === undefined) {
      anim.lastPlants = anim.legs.plants;
    } else if (anim.legs.plants !== anim.lastPlants) {
      anim.lastPlants = anim.legs.plants;
      this.onFootstep?.(e.x, e.y, anim.legs.plantSpeed, e.isOwn === true, e.pose === PoseState.Sneak);
      // Sneaking feet roll heel-to-toe — nothing gets kicked loose.
      if (e.pose !== PoseState.Sneak) this.kickDust(anim.legs);
    }
    // The finisher (and the wand's heavy bolt) rides its full 8-tick
    // pose — a heavier beat deserves its whole 400ms; everything else
    // keeps the standard 280ms one-shot clock.
    const poseMs = e.pose === PoseState.Attack3 ? 400 : 280;
    const poseT = Math.min(1, (now - anim.poseStartedAt) / poseMs);
    // Rest-carriage clock: survives Idle↔Walk flips, resets only when
    // returning from a non-restful pose (combat, gathering, drawing).
    const restfulPose =
      e.pose === PoseState.Idle || e.pose === PoseState.Walk || e.pose === PoseState.Sneak;
    if (!restfulPose) anim.restfulSince = undefined;
    else if (anim.restfulSince === undefined) anim.restfulSince = now;
    const restT = restfulPose
      ? Math.min(1, (now - (anim.restfulSince ?? now)) / 280)
      : 0;
    // Bow draw charge: the local player reads its own live input; remotes
    // charge with time spent in the Draw pose (the server holds it while
    // the string is back).
    const drawT =
      e.drawTOverride !== undefined && e.drawTOverride > 0
        ? e.drawTOverride
        : e.pose === PoseState.Draw
          ? Math.min(1, (now - anim.poseStartedAt) / (DRAW_FULL_TICKS * TICK_MS))
          : 0;

    // Terrain rise: the body rides the ground under it, and each foot
    // rides the ground under ITSELF — that difference is what makes a
    // stair climb read step by step.
    const terrainLift = this.renderLift(e.x, e.y) * s;
    const p = this.camera.worldToScreen(e.x, e.y, this.w, this.h);
    p.y -= terrainLift;
    // Seated foot targets, in world space so the legs stretch along the
    // FACING and the camera's ground compression foreshortens them the
    // same way it does everything else on the ground plane.
    let seatFeet: Array<{ x: number; y: number }> | null = null;
    if (sitE > 0) {
      const fwx = Math.cos(e.dir);
      const fwy = Math.sin(e.dir);
      const kSize = e.size ?? 1;
      // Facing the camera (or away), forward-stretched legs project as
      // a narrow standing column — so the seat goes DIRECTION-AWARE:
      // the more vertical the facing, the wider the splay and the
      // shorter the reach, until the legs read as an open V on the
      // ground. Side-on keeps the long stretched-out profile.
      const vert = Math.abs(fwy);
      // Lounger: one leg stretched long, the other SOFT-BENT (foot
      // pulled partway in so the IK lifts a low lazy knee) — two
      // parallel straight legs read as planks, not a person. Knee-up:
      // one leg out, the other foot hauled in close so the knee rises
      // sharply — the campfire sit, forearm draped over the cap.
      // Facing up/down-screen the feet pull IN until they sit almost
      // LEVEL with the hip line: forward reach barely foreshortens on
      // the ground plane, so any real fwd distance hangs the feet far
      // below the hips and the whole figure reads as a standing
      // A-stance. Near-zero reach + wide splay lays the shins along
      // the ground with the knees folded out — a floor sit.
      // `side` lives in the FACING frame — its screen side flips with
      // the facing. The showpiece leg (the lounger's long stretch, the
      // raised knee) must take the CAMERA side of the body at profile
      // or it hides behind the torso and the sit reads one-legged;
      // camSide re-signs it into world down-screen.
      const camSide = fwx >= 0 ? 1 : -1;
      const spots =
        sitVariant === 0
          ? [
              { fwd: 0.34 - 0.3 * vert, side: -camSide * (0.17 + 0.07 * vert) },
              { fwd: 0.56 - 0.5 * vert, side: camSide * (0.16 + 0.1 * vert) },
            ]
          : [
              { fwd: 0.54 - 0.44 * vert, side: -camSide * (0.15 + 0.13 * vert) },
              // The raised foot tucks nearly under the hip — the short
              // hip→foot span is what folds the knee up toward the
              // chest instead of a low lazy peak.
              { fwd: 0.1 - 0.05 * vert, side: camSide * (0.11 + 0.06 * vert) },
            ];
      const t = spots.map((sp) => ({
        x: e.x + (fwx * sp.fwd - fwy * sp.side) * kSize,
        y: e.y + (fwy * sp.fwd + fwx * sp.side) * kSize,
      }));
      // Hips are screen-fixed (left hip = foot 0): the more screen-left
      // target keeps the left leg so the shins never cross.
      seatFeet = t[0]!.x <= t[1]!.x ? t : [t[1]!, t[0]!];
    }
    const feet = legPose.feet.map((f, i) => {
      const sf = seatFeet?.[i];
      const wx = sf ? f.x + (sf.x - f.x) * sitE : f.x;
      const wy = sf ? f.y + (sf.y - f.y) * sitE : f.y;
      const fp = this.camera.worldToScreen(wx, wy, this.w, this.h);
      fp.y -= this.renderLift(wx, wy) * s;
      return { x: fp.x, y: fp.y, lift: f.lift * (1 - sitE) };
    });

    // Attack lunge: the body rocks back then punches toward the aim
    // while the feet stay planted — the legs lean into the strike.
    // Retimed to the strike vocabulary's own beats (grip-aware): rock
    // back through the coil+hold, punch through the snap, HOLD the
    // landed weight through the extension, ease home with the recover.
    let lunge = 0;
    if (e.pose === PoseState.Attack || e.pose === PoseState.Attack2) {
      const P = strikePhases(e.carry === 'rogue' ? 'rogue' : 'normal');
      lunge =
        poseT < P.hold
          ? -0.05 * (poseT / P.hold)
          : poseT < P.impact
            ? -0.05 + 0.22 * ((poseT - P.hold) / (P.impact - P.hold))
            : poseT < P.ext
              ? 0.17
              : 0.17 * (1 - (poseT - P.ext) / (1 - P.ext));
    } else if (e.pose === PoseState.Attack3) {
      // Finisher, on the shared finisher clock: coil, poised hold,
      // ram, buried hold, recover.
      const F = FINISHER_PHASES;
      lunge =
        poseT < F.coil
          ? -0.09 * (poseT / F.coil)
          : poseT < F.hold
            ? -0.09
            : poseT < F.drive
              ? -0.09 + 0.49 * ((poseT - F.hold) / (F.drive - F.hold))
              : poseT < F.buried
                ? 0.4 - 0.05 * ((poseT - F.drive) / (F.buried - F.drive))
                : 0.35 * (1 - (poseT - F.buried) / (1 - F.buried));
    } else if (drawT > 0) {
      lunge = -0.05 * drawT; // braced back against the string
    } else if (e.pose === PoseState.Loose) {
      lunge = -0.07 * Math.max(0, 1 - poseT / 0.4); // release recoil
    } else if (e.pose === PoseState.Cast) {
      lunge = 0.05 * Math.max(0, 1 - poseT / 0.4); // push into the cast
    } else if (e.pose === PoseState.Art) {
      // Weapon Art: a deep plant-and-coil, then the whole body unleashes.
      lunge =
        poseT < 0.3
          ? -0.12 * (poseT / 0.3)
          : 0.26 * (1 - (poseT - 0.3) / 0.7);
    }
    // Gathering: square up to the node and swing the belt tool at it.
    // Crafting: square up to the station and work it.
    let dir = e.dir;
    const gather =
      e.pose === PoseState.Gather
        ? this.findGatherNode(e.x, e.y, e.eid === 'own' ? this.game?.lastInteract : null)
        : null;
    if (gather) dir = Math.atan2(gather.ty + 0.5 - e.y, gather.tx + 0.5 - e.x);
    const station = e.pose === PoseState.Craft ? this.findStation(e.x, e.y) : null;
    if (station) dir = Math.atan2(station.ty + 0.5 - e.y, station.tx + 0.5 - e.x);

    // Seated lean: hips and torso settle BEHIND the ground point while
    // the feet hold their forward plant — the stretched-out rest.
    if (sitE > 0) lunge -= 0.15 * sitE;

    // The sheathe blend: the player's own toggle, and every state that
    // used to VANISH the weapon (station work, foraging, the seated
    // rest) now stows it instead — the blade rides the belt while its
    // owner hammers, picks herbs, or rests. First sight starts AT the
    // target so an already-sheathed body never pantomimes the stow.
    const sheathTarget =
      e.sheathed === true ||
      e.pose === PoseState.Craft ||
      e.pose === PoseState.Sit ||
      gather?.kind === 'forage'
        ? 1
        : 0;
    let sheathK = anim.sheathK ?? sheathTarget;
    sheathK += (sheathTarget - sheathK) * (1 - Math.exp(-6 * this.frameDt));
    if (sheathK < 0.004) sheathK = 0;
    else if (sheathK > 0.996) sheathK = 1;
    anim.sheathK = sheathK;

    const bodyX = p.x + Math.cos(dir) * lunge * s;
    const bodyY = p.y + Math.sin(dir) * lunge * s;

    // Cape cloth: world-space verlet ticked once per frame, worked by
    // the same wind the grass and trees obey. Its lifecycle rides the
    // anim map — despawn evicts the cloth with everything else.
    const capeItem = e.equip.cape;
    const capeK = e.size ?? 1;
    let capeSim: CapeSim | null = null;
    if (capeItem) {
      if (!anim.cape || anim.capeKey !== capeItem) {
        anim.cape = new CapeSim(capeStyle(capeItem), typeof e.eid === 'number' ? e.eid : 7);
        anim.capeKey = capeItem;
      }
      capeSim = anim.cape;
      const hSc = 1 + (1 - legPose.wScale) * 0.55;
      // Seated the clasp comes DOWN with the shoulders — the hip line
      // settles ~0.13 off the ground and the torso rides on top of it
      // (the rig's own seat law), so the cloth's slack pools on the
      // ground behind the sitter instead of hanging from thin air.
      const azStand = legPose.rise + legPose.bob * 0.45 + 0.44 * hSc;
      const azSeat = 0.13 + 0.44 * hSc;
      const az = (azStand + (azSeat - azStand) * sitE) * capeK;
      capeSim.update(
        e.x + Math.cos(dir) * lunge,
        e.y + Math.sin(dir) * lunge,
        az,
        dir,
        this.frameDt,
        windAtInto(WIND_TMP, e.x, e.y, now / 1000),
        now / 1000,
        capeK,
        sitE,
      );
    } else if (anim.cape) {
      anim.cape = undefined;
      anim.capeKey = undefined;
    }
    // Paint side follows the FACING (the beast head/tail convention):
    // the back — and the cloth on it — is toward the camera only when
    // facing up-screen. Hysteresis in front() keeps the flip steady.
    // Body-sprite cache identity (see paintOutlined) — THREE RATES:
    // combat, pose blends, the hurt flash, wind-live cape cloth and
    // the own hero re-bake at FULL rate; plain locomotion (walking,
    // sneaking, the leg-settle after stopping, gaze turns) re-bakes
    // every OTHER frame — 60Hz limb sampling at 120fps, indistinguish-
    // able, and the town's wander crowd was the whole remaining cost;
    // true idlers wait for the cadence to re-sample their cosmetic
    // life. The signature folds every input that changes painted
    // pixels; the dir term also catches facing snaps.
    const olMoving = this.bodyMotion(anim, e.x, e.y, e.dir);
    const locomotion =
      olMoving || e.pose === PoseState.Walk || e.pose === PoseState.Sneak;
    const fullDyn =
      (e.pose !== PoseState.Idle &&
        e.pose !== PoseState.Walk &&
        e.pose !== PoseState.Sneak &&
        e.pose !== PoseState.Sit) ||
      now - anim.poseStartedAt < 900 ||
      (e.hurt ?? false) ||
      capeSim !== null ||
      (sitK > 0 && sitK < 1) ||
      (sheathK > 0 && sheathK < 1) ||
      (e.drawTOverride !== undefined && e.drawTOverride > 0) ||
      (e.isOwn && locomotion);
    const olDyn = fullDyn || (locomotion && (this.frameNo + varEid) % 2 === 0);
    const olSig = `${e.dir.toFixed(3)}|${e.pose}|${e.hurt ? 1 : 0}|${e.sheathed ? 1 : 0}|${
      e.color
    }|${e.size ?? 1}|${e.carry ?? ''}|${e.carryOff ?? ''}|${e.skinColor ?? ''}|${this.olObjSig(
      e.equip,
    )}|${this.olObjSig(e.ench)}|${this.olObjSig(e.look)}|${e.skeletal ? 1 : 0}${e.kobold ? 'k' : ''}`;

    const capeFront = capeSim !== null && capeSim.front(Math.sin(dir));
    const paintCape =
      capeSim !== null && capeItem
        ? (ctx: CanvasRenderingContext2D) => {
            const capePts = capeSim.nodes.map((nd) => {
              const sp = this.camera.worldToScreen(nd.x, nd.y, this.w, this.h);
              return { x: sp.x, y: sp.y - terrainLift - nd.z * s };
            });
            // Foreshortening: the projected length of the shoulder bar
            // the cloth hangs from — 1 facing up/down, 0.45 in profile.
            const breadthK = Math.hypot(Math.sin(dir), Math.cos(dir) * 0.45);
            drawCape(ctx, capePts, capeStyle(capeItem), s * capeK, {
              hurt: e.hurt ?? false,
              breadthK,
              hemGlow: Math.min(1, capeSim.hemSpd / 4.5),
              tSec: now / 1000,
              phase: capeSim.phase,
              spread: sitE,
            });
          }
        : null;

    return {
      sortY: e.y,
      elevated: terrainLift !== 0,
      olKey: varEid,
      olSig,
      olDyn,
      baseX: e.x,
      baseY: e.y,
      drawShadow: () => {
        this.castBody(p.x, p.y + s * 0.05, 0.26 * s * (e.size ?? 1));
      },
      draw: () => {
        const ctx = this.ctx;
        // Tool impacts: debris flies off the node at each strike beat,
        // timed to the tool's own cycle.
        const toolType = itemDef(e.equip.tool ?? '')?.tool?.type;
        if (gather && gather.kind === 'tree' && toolType === 'axe') {
          const cycle = Math.floor((performance.now() + lifeMs) / CHOP_CYCLE_MS);
          const u = ((performance.now() + lifeMs) % CHOP_CYCLE_MS) / CHOP_CYCLE_MS;
          if (u >= 0.54 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const chipX = gather.tx + 0.5 - Math.cos(dir) * 0.38;
            const chipY = gather.ty + 0.5 - Math.sin(dir) * 0.38;
            this.particles.burst(chipX, chipY, 7, ['#a5793f', '#c9b083', '#8a6a45'], {
              speed: 2.4,
              life: 0.5,
              size: 0.07,
              gravity: 7,
              dir: dir + Math.PI,
              spread: 1.3,
            });
            this.onGatherImpact?.('tree', gather.tx + 0.5, gather.ty + 0.5, e.isOwn === true);
          }
        } else if (gather && gather.kind === 'rock' && toolType === 'pickaxe') {
          const cycle = Math.floor((performance.now() + lifeMs) / MINE_CYCLE_MS);
          const u = ((performance.now() + lifeMs) % MINE_CYCLE_MS) / MINE_CYCLE_MS;
          if (u >= 0.54 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const chipX = gather.tx + 0.5 - Math.cos(dir) * 0.42;
            const chipY = gather.ty + 0.5 - Math.sin(dir) * 0.42;
            // Stone chips off the face...
            this.particles.burst(chipX, chipY, 6, ['#c9ccd4', '#9aa2ac', '#847e91'], {
              speed: 2.2,
              life: 0.5,
              size: 0.065,
              gravity: 7,
              dir: dir + Math.PI,
              spread: 1.2,
            });
            // ...plus the metal-on-rock SPARKS that make it mining, in
            // the seam's own color when the rock carries ore.
            const nodeTile = this.game?.world.groundAt(gather.tx, gather.ty);
            const style = nodeTile !== undefined ? Renderer.ORE_STYLES[nodeTile] : undefined;
            this.particles.burst(chipX, chipY, 4, ['#fff3c9', '#ffd77a', style?.nug ?? '#ffe9a8'], {
              speed: 3.4,
              life: 0.24,
              size: 0.04,
              gravity: 4,
              up: true,
              spread: 2,
            });
            this.onGatherImpact?.('rock', gather.tx + 0.5, gather.ty + 0.5, e.isOwn === true);
          }
        } else if (gather && gather.kind === 'forage') {
          // The pluck beat: leaves shiver loose as the stem snaps,
          // colored by the plant itself, with a drift of its payload
          // accent — soft debris, never chips of wood or stone.
          const cycle = Math.floor((performance.now() + lifeMs) / FORAGE_CYCLE_MS);
          const u = ((performance.now() + lifeMs) % FORAGE_CYCLE_MS) / FORAGE_CYCLE_MS;
          if (u >= 0.44 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            const nodeTile = this.game?.world.groundAt(gather.tx, gather.ty);
            const pal =
              nodeTile === Tile.BerryBush
                ? ['#3a7539', '#b04a72', '#549447']
                : nodeTile === Tile.FibrePlant
                  ? ['#57853a', '#d9b04c', '#74a34e']
                  : nodeTile === Tile.WildSagewort
                    ? ['#6f9c6c', '#d4e4c8', '#94bd8c']
                    : ['#4a7161', '#8f9ed6', '#e8ecff'];
            const px2 = gather.tx + 0.5 - Math.cos(dir) * 0.3;
            const py2 = gather.ty + 0.5 - Math.sin(dir) * 0.3;
            this.particles.burst(px2, py2, 5, pal, {
              speed: 1.1,
              life: 0.7,
              size: 0.055,
              gravity: 2.6,
              drag: 0.82,
              dir: dir + Math.PI,
              spread: 1.6,
            });
            this.onGatherImpact?.('forage', gather.tx + 0.5, gather.ty + 0.5, e.isOwn === true);
          }
        } else if (station?.kind === 'anvil') {
          const cycle = Math.floor((performance.now() + lifeMs) / ANVIL_CYCLE_MS);
          const u = ((performance.now() + lifeMs) % ANVIL_CYCLE_MS) / ANVIL_CYCLE_MS;
          if (u >= 0.42 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            // Sparks ring off the billet between smith and anvil.
            const sx = e.x + Math.cos(dir) * 0.42;
            const sy = e.y + Math.sin(dir) * 0.42;
            this.particles.burst(sx, sy, 9, ['#fff3c9', '#ffd77a', '#ff9a3d'], {
              speed: 3,
              life: 0.38,
              size: 0.045,
              gravity: 9,
              up: true,
              spread: 2.4,
            });
            this.queueGlow(sx, sy, 0.7, '255, 176, 82', 0.3);
            this.onGatherImpact?.('anvil', sx, sy, e.isOwn === true);
          }
        } else if (station?.kind === 'furnace') {
          const cycle = Math.floor((performance.now() + lifeMs) / FURNACE_CYCLE_MS);
          const u = ((performance.now() + lifeMs) % FURNACE_CYCLE_MS) / FURNACE_CYCLE_MS;
          if (u >= 0.42 && anim.lastChopHit !== cycle) {
            anim.lastChopHit = cycle;
            // The mouth flares and a swarm of embers climbs the draft.
            const fx2 = station.tx + 0.5;
            const fy2 = station.ty + 0.6;
            this.particles.burst(fx2, fy2, 10, ['#ff9e42', '#ffd77a', '#c4553d'], {
              speed: 0.9,
              life: 1.0,
              size: 0.05,
              gravity: -1.6,
              drag: 1.2,
              spread: 1.4,
              dir: -Math.PI / 2,
            });
            this.queueGlow(fx2, fy2, 1.4, '255, 138, 52', 0.4);
            this.onGatherImpact?.('furnace', fx2, fy2, e.isOwn === true);
          }
        }

        const rigPose: RigPose = {
          x: bodyX,
          y: bodyY,
          scale: s,
          dir,
          pose: drawT > 0 && e.pose !== PoseState.Loose ? PoseState.Draw : e.pose,
          poseT,
          drawT,
          restT,
          nowMs: now + lifeMs,
          feet,
          bob: legPose.bob,
          rise: legPose.rise,
          wScale: legPose.wScale,
          poleX: legPose.poleX,
          poleY: legPose.poleY,
          poleStrength: legPose.poleStrength,
          runF: legPose.runF,
          align: legPose.align,
          kneeMemory: anim.kneeMemory,
          depthMemory: (anim.armDepth ??= { mainBehind: false }),
          bodyColor: e.color,
          hurt: e.hurt ?? false,
          isOwn: e.isOwn,
          // During a gather the BELT tool is what's in the hands. The
          // old holster states (station work, foraging, the seated
          // rest) now flow through the sheathe blend above instead of
          // vanishing the weapon — it stows to the belt or the back.
          weaponItem:
            e.pose === PoseState.Gather ? (e.equip.tool ?? e.equip.weapon) : e.equip.weapon,
          // Enchant fx ride the real weapon — in hand OR stowed —
          // never the gather tool.
          weaponEnch:
            (e.pose === PoseState.Gather ? (e.equip.tool ?? e.equip.weapon) : e.equip.weapon) ===
            e.equip.weapon
              ? e.ench?.weapon
              : undefined,
          offhandEnch: e.ench?.offhand,
          carryStyle: e.carry,
          carryOff: e.carryOff,
          bodyItem: e.equip.body,
          headItem: e.equip.head,
          legsItem: e.equip.legs,
          bootsItem: e.equip.boots,
          glovesItem: e.equip.gloves,
          offhandItem: e.equip.offhand,
          hasCape: e.equip.cape !== undefined,
          size: e.size,
          skinColor: e.skinColor,
          look: e.look,
          skeletal: e.skeletal,
          kobold: e.kobold,
          gatherPhase: now / 1000,
          craftKind: station?.kind ?? null,
          foraging: gather?.kind === 'forage',
          sitT: sitE,
          sitVariant,
          sheathT: sheathK,
        };
        // Layer law with a cape worn: gear straps OVER the cloth, so
        // the quiver paints immediately after the cape on whichever
        // side of the body the cape lands this frame.
        if (paintCape && !capeFront) {
          paintCape(ctx);
          if (rigPose.hasCape) drawBackGear(ctx, rigPose);
        }
        drawHumanoid(ctx, rigPose);
        if (paintCape && capeFront) {
          paintCape(ctx);
          if (rigPose.hasCape) drawBackGear(ctx, rigPose);
        }
      },
      // THE REACH ENVELOPE: the outline scratch rasterizes ONLY this
      // box — anything painted past it is cropped on a hard edge. The
      // bare-body box fits idle limbs and every hairstyle, but an
      // armed character swings, casts, and stows: a staff at full
      // extension or a strike trail reaches ~2.4s from the ground
      // point, so wielded or stowed gear (weapon OR offhand) grows
      // the box to contain the whole arc. Unarmed civilians keep the
      // tight box — scratch area is the outline pass's cost.
      body: (() => {
        const armed = e.equip.weapon !== undefined || e.equip.offhand !== undefined;
        const rx = armed ? 1.0 : 0;
        const ry = armed ? 1.2 : 0;
        return {
          x: p.x - (1.55 + rx) * s * capeK,
          y: p.y - (1.75 + ry) * s * capeK,
          w: (3.1 + rx * 2) * s * capeK,
          h: (2.7 + ry) * s * capeK,
        };
      })(),
      drawLabel: () => {
        const ctx = this.ctx;
        // Nameplate baseline: clear of the tallest headwear (helmet
        // crown, topknot) with real air underneath — never resting on
        // the skull. Drawn OUTSIDE the outline pass: text gets no ring.
        const topY = p.y - (1.32 * (e.size ?? 1)) * s;
        if (e.name) {
          ctx.font = `600 ${Math.max(11, s * 0.28)}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          const label = e.level ? `${e.name} (${e.level})` : e.name;
          ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
          ctx.fillText(label, p.x + 1.5, topY + 1.5);
          ctx.fillStyle = e.isOwn ? '#e8b64c' : '#efe3c2';
          ctx.fillText(label, p.x, topY);
        }
        if (e.hpPct < 255) {
          this.drawMiniHp(p.x, topY + s * 0.08, 0.7 * s, e.hpPct);
        }
      },
    };
  }

  private drawMiniHp(x: number, y: number, w: number, hpPct: number): void {
    const ctx = this.ctx;
    // Sharp block gauge — a sliver of the brutalist UI over the world.
    const h = Math.max(3, this.camera.scale * 0.08);
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#54303a';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = '#4fc06a';
    ctx.fillRect(x - w / 2, y, Math.max(2, w * (hpPct / 255)), h);
  }

  /** Eight-tap alpha dilate → tinted ring under the sprite. */
  private static readonly OUTLINE_TAPS: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.71, 0.71],
    [-0.71, 0.71],
    [0.71, -0.71],
    [-0.71, -0.71],
  ];

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
  // ------------------------------------------------------- body relight

  /**
   * The exposure the multiply map resolves at a world point: ambient
   * screened with every pool in reach — 1 − (1−amb)·Π(1−Lᵢ) — with a
   * coarse LOS walk so lamplight doesn't reach through walls. With
   * `wantDom`, the strongest single pool is stashed in dom* for the
   * rim-light pass.
   */
  private sampleExposure(wx: number, wy: number, wantDom: boolean): number {
    const s = this.sky;
    const amb = (0.299 * s.ambient[0] + 0.587 * s.ambient[1] + 0.114 * s.ambient[2]) / 255;
    let dark = 1 - amb;
    if (wantDom) this.domK = 0;
    for (const L of this.lights) {
      if (L.intensity <= 0.01) continue;
      const dx = wx - L.x;
      const dy = wy - L.y;
      if (Math.abs(dx) >= L.r || Math.abs(dy) >= L.r) continue;
      const d = Math.hypot(dx, dy);
      if (d >= L.r) continue;
      // Behind a wall the map still delivers the bounce-wrap fraction
      // (lighting.ts WRAP/SHADOW_DENSITY) — model it, don't zero it.
      const shade =
        L.occlude && d > 1.4 && !this.lightSees(L.x, L.y, wx, wy, d) ? 0.25 : 1;
      const lum = (0.299 * L.rgb[0] + 0.587 * L.rgb[1] + 0.114 * L.rgb[2]) / 255;
      const li = Math.min(1, L.intensity * lum * Math.pow(1 - d / L.r, 1.3) * shade);
      dark *= 1 - li;
      if (wantDom && li > this.domK) {
        this.domK = li;
        this.domX = L.x;
        this.domY = L.y;
        this.domRgb = L.rgb;
      }
    }
    return 1 - dark;
  }

  /** Coarse LOS for relight: one blocker sample per tile along the
   *  line, clear of both endpoints. */
  private lightSees(lx: number, ly: number, wx: number, wy: number, d: number): boolean {
    const ux = (wx - lx) / d;
    const uy = (wy - ly) / d;
    for (let t = 0.7; t < d - 0.7; t += 1) {
      if (this.blocksAt(Math.floor(lx + ux * t), Math.floor(ly + uy * t))) return false;
    }
    return true;
  }

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
  private relightBody(
    item: DrawItem,
    srcs: CanvasImageSource[],
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    if (item.baseX === undefined || item.baseY === undefined) return;
    if (this.bakingMask || this.sky.darkness < 0.06 || this.relitLeft <= 0) return;
    if (sw < 2 || sh < 2) return;
    const expBase = this.sampleExposure(item.baseX, item.baseY, true);
    // What the map will actually multiply over these pixels: the
    // ground roughly a body-height of rows up-screen from the feet.
    const expBehind = this.sampleExposure(
      item.baseX,
      item.baseY - 1.25 / this.camera.yScale,
      false,
    );
    const delta = expBase - expBehind;
    const lift = delta > 0.045;
    const dim = delta < -0.07;
    const rim = this.domK > 0.09;
    if (!lift && !dim && !rim) return;
    this.relitLeft--;
    const rc = this.relightCtx;
    if (this.relightCanvas.width < sw || this.relightCanvas.height < sh) {
      this.relightCanvas.width = Math.max(this.relightCanvas.width, sw);
      this.relightCanvas.height = Math.max(this.relightCanvas.height, sh);
    }
    const ctx = this.ctx;
    const baseAlpha = item.alpha ?? 1;
    const [lr, lg, lb] = this.domRgb;
    if (lift || dim) {
      rc.setTransform(1, 0, 0, 1, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      rc.globalAlpha = 1;
      rc.clearRect(0, 0, sw + 2, sh + 2);
      for (const src of srcs) rc.drawImage(src, 0, 0, sw, sh, 0, 0, sw, sh);
      rc.globalCompositeOperation = 'source-in';
      if (lift) {
        // The pool's own color climbs the body from the feet.
        const grad = rc.createLinearGradient(0, 0, 0, sh);
        grad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, 0.30)`);
        grad.addColorStop(0.55, `rgba(${lr}, ${lg}, ${lb}, 0.72)`);
        grad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 1)`);
        rc.fillStyle = grad;
      } else {
        rc.fillStyle = 'rgb(20, 15, 32)';
      }
      rc.fillRect(0, 0, sw, sh);
      ctx.save();
      ctx.globalCompositeOperation = lift ? 'lighter' : 'multiply';
      ctx.globalAlpha = baseAlpha * (lift ? Math.min(0.5, delta * 1.1) : Math.min(0.38, -delta * 0.85));
      ctx.drawImage(this.relightCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }
    if (rim) {
      // Screen-space direction AWAY from the dominant light; the
      // shifted-copy erase leaves a crescent on the side FACING it.
      let ax = (item.baseX - this.domX) * this.camera.scale;
      let ay = (item.baseY - this.domY) * this.camera.scale * this.camera.yScale;
      const al = Math.hypot(ax, ay) || 1;
      const mag = Math.max(2, sw * 0.055);
      ax = (ax / al) * mag;
      ay = (ay / al) * mag;
      rc.setTransform(1, 0, 0, 1, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      rc.globalAlpha = 1;
      rc.clearRect(0, 0, sw + 2, sh + 2);
      for (const src of srcs) rc.drawImage(src, 0, 0, sw, sh, 0, 0, sw, sh);
      rc.globalCompositeOperation = 'destination-out';
      for (const src of srcs) rc.drawImage(src, 0, 0, sw, sh, ax, ay, sw, sh);
      rc.globalCompositeOperation = 'source-in';
      // Rim reads hot: the light's color pushed toward white.
      rc.fillStyle = `rgb(${(lr + 255) >> 1}, ${(lg + 255) >> 1}, ${(lb + 255) >> 1})`;
      rc.fillRect(0, 0, sw, sh);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = baseAlpha * Math.min(0.42, this.domK * 1.35);
      ctx.drawImage(this.relightCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  private paintOutlined(item: DrawItem): void {
    const key = item.olKey;
    if (key !== undefined) {
      const b = item.body!;
      const s = this.camera.scale;
      const sp = this.bodySprites.get(key);
      if (this.bakingMask) {
        if (sp) {
          this.blitBodySprite(sp, b, s);
          return;
        }
        // No sprite yet: fall through to the direct path (no write —
        // the main pass owns the cache).
      } else if (sp) {
        const dpr = window.devicePixelRatio || 1;
        const phase = typeof key === 'number' ? key : 7;
        const due = (this.frameNo + phase) % OL_IDLE_CADENCE === 0;
        const drift = Math.abs(sp.scale - s) > s * 0.2;
        const fresh =
          sp.dpr === dpr &&
          sp.sig === item.olSig &&
          !item.olDyn &&
          !(due && sp.frame !== this.frameNo) &&
          !drift;
        if (fresh || (this.zoomGliding && sp.sig === item.olSig && !item.olDyn)) {
          sp.used = this.frameNo;
          this.blitBodySprite(sp, b, s, item);
          return;
        }
        this.bakeBodySprite(item, key);
        return;
      } else {
        this.bakeBodySprite(item, key);
        return;
      }
    }
    this.paintOutlinedDirect(item);
  }

  /** Blit a cached body composite at the item's CURRENT body rect —
   *  scale-compensated like the tree cache when mid-glide. */
  private blitBodySprite(
    sp: NonNullable<ReturnType<(typeof this.bodySprites)['get']>>,
    b: { x: number; y: number; w: number; h: number },
    s: number,
    item?: DrawItem,
  ): void {
    const k = s / sp.scale;
    const dx = b.x - sp.m * k;
    const dy = b.y - sp.m * k;
    const dw = sp.wCss * k;
    const dh = sp.hCss * k;
    this.ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, dx, dy, dw, dh);
    if (item) this.relightBody(item, [sp.canvas], sp.w, sp.h, dx, dy, dw, dh);
  }

  /** Re-bake a keyed body: run the scratch pass, composite ring+art
   *  into the body's own canvas, blit it. Costs the direct pass plus
   *  two small copies — paid only on dynamic/cadence/sig frames. */
  private bakeBodySprite(item: DrawItem, key: number | string): void {
    const b = item.body!;
    const s = this.camera.scale;
    const dpr = window.devicePixelRatio || 1;
    const geo = this.paintOutlineScratch(item);
    let sp = this.bodySprites.get(key);
    const prev = sp ? { canvas: sp.canvas, ctx: sp.ctx } : undefined;
    const { canvas, sctx } = this.acquireSpriteCanvas(prev, geo.w, geo.h);
    // Apron-clear past the used region (the stale-bleed law): pooled
    // canvases carry older, larger sprites' pixels just outside this
    // region, and the fractional final blit bilinear-samples ~1px
    // past the source rect.
    const apron = 4;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, Math.min(canvas.width, geo.w + apron), Math.min(canvas.height, geo.h + apron));
    sctx.drawImage(this.outlineB, 0, 0, geo.w, geo.h, 0, 0, geo.w, geo.h);
    sctx.drawImage(this.outlineA, 0, 0, geo.w, geo.h, 0, 0, geo.w, geo.h);
    if (!sp) {
      sp = {
        canvas,
        ctx: sctx,
        w: geo.w,
        h: geo.h,
        wCss: geo.wCss,
        hCss: geo.hCss,
        m: geo.m,
        scale: s,
        dpr,
        sig: item.olSig ?? '',
        frame: this.frameNo,
        used: this.frameNo,
      };
      this.bodySprites.set(key, sp);
    } else {
      sp.canvas = canvas;
      sp.ctx = sctx;
      sp.w = geo.w;
      sp.h = geo.h;
      sp.wCss = geo.wCss;
      sp.hCss = geo.hCss;
      sp.m = geo.m;
      sp.scale = s;
      sp.dpr = dpr;
      sp.sig = item.olSig ?? '';
      sp.frame = this.frameNo;
      sp.used = this.frameNo;
    }
    this.blitBodySprite(sp, b, s, item);
  }

  /** Direct (uncached) outline pass: scratch build + two blits. */
  private paintOutlinedDirect(item: DrawItem): void {
    const b = item.body!;
    const dpr = window.devicePixelRatio || 1;
    const geo = this.paintOutlineScratch(item);
    this.ctx.drawImage(this.outlineB, 0, 0, geo.w, geo.h, b.x - geo.m, b.y - geo.m, geo.w / dpr, geo.h / dpr);
    this.ctx.drawImage(this.outlineA, 0, 0, geo.w, geo.h, b.x - geo.m, b.y - geo.m, geo.w / dpr, geo.h / dpr);
    this.relightBody(
      item,
      [this.outlineB, this.outlineA],
      geo.w,
      geo.h,
      b.x - geo.m,
      b.y - geo.m,
      geo.w / dpr,
      geo.h / dpr,
    );
  }

  /**
   * The shared scratch build: art into A, dilated tinted ring into B.
   * Returns the region geometry (device px + css + margin).
   */
  private paintOutlineScratch(
    item: DrawItem,
    artOnly = false,
  ): { w: number; h: number; wCss: number; hCss: number; m: number } {
    const b = item.body!;
    // DEVICE-PIXEL LAW (same as bakeOutlineRing): the scratches work in
    // device pixels. Rasterizing at 1× CSS resolution and letting the
    // dpr-transformed main ctx upscale the bitmap rendered every living
    // body at HALF resolution on retina — the "soft characters in a
    // crisp world" bug. Scratch A now rasterizes at dpr and the final
    // blit maps texels 1:1, so the sprite is as sharp as direct paint.
    const dpr = window.devicePixelRatio || 1;
    const r = Math.max(1.25, this.camera.scale * 0.04);
    const m = Math.ceil(r) + 2;
    const wCss = Math.ceil(b.w) + m * 2;
    const hCss = Math.ceil(b.h) + m * 2;
    const w = Math.ceil(wCss * dpr);
    const h = Math.ceil(hCss * dpr);
    if (this.outlineA.width < w) this.outlineA.width = this.outlineB.width = w;
    if (this.outlineA.height < h) this.outlineA.height = this.outlineB.height = h;
    const a = this.outlineACtx;
    const o = this.outlineBCtx;
    // Clear an APRON past the region on BOTH scratches: the canvases
    // grow monotonically and keep a bigger entity's stale pixels just
    // outside a smaller entity's region — the fractional-offset
    // drawImage taps then bilinear-bleed those texels in at the region
    // border, and the source-in tint turns the bleed into a faint dark
    // rectangle riding the sprite (the "corner line" bug on chickens
    // after any cow died).
    const apron = Math.ceil(r * dpr) + 4;
    const cw = Math.min(this.outlineA.width, w + apron);
    const ch = Math.min(this.outlineA.height, h + apron);
    // 1. The entity paints itself into scratch A, believing it is the
    // frame — the main ctx is swapped out from under its closures.
    a.clearRect(0, 0, cw, ch);
    a.save();
    a.setTransform(dpr, 0, 0, dpr, (m - b.x) * dpr, (m - b.y) * dpr);
    const prev = this.ctx;
    this.ctx = a;
    try {
      item.draw();
    } finally {
      this.ctx = prev;
      a.restore();
    }
    // 2. Scratch B becomes the dilated, tinted silhouette. (Taps draw
    // from A only — a self-referencing drawImage forces Chromium to
    // snapshot the whole scratch canvas per call; a "cheaper"
    // separable self-blit dilate measured 3× SLOWER than these taps.)
    // INTEGER tap offsets, same law as bakeOutlineRing: a fractional
    // offset forces a bilinear resample per tap while an integer 1:1
    // blit is a straight copy — measured ~2× on the whole pass with
    // ~50 live bodies (town at 0.85×). Ring thickness quantizes by
    // ≤0.5px, invisible at the ring's 1.3-3.2px range; the per-entity
    // jitter law only bars quantizing the final smooth-camera blit,
    // which stays fractional below.
    // artOnly (the ghost ember): the caller wants scratch A's art
    // alone — skip the ring dilate entirely.
    if (!artOnly) {
      const ri = Math.max(1, Math.round(r * dpr));
      const rd = Math.max(1, Math.round(r * 0.71 * dpr));
      o.clearRect(0, 0, cw, ch);
      for (const [tx, ty] of Renderer.OUTLINE_TAPS) {
        const diag = tx !== 0 && ty !== 0;
        const ox = Math.sign(tx) * (diag ? rd : ri);
        const oy = Math.sign(ty) * (diag ? rd : ri);
        o.drawImage(this.outlineA, 0, 0, w, h, ox, oy, w, h);
      }
      o.globalCompositeOperation = 'source-in';
      o.fillStyle = '#241a2e';
      o.fillRect(0, 0, w, h);
      o.globalCompositeOperation = 'source-over';
    }
    // 3. Callers finish it: ring first, sprite on top — straight to
    // the frame (direct path) or into the body's cache canvas.
    return { w, h, wCss, hCss, m };
  }

  /**
   * The crypt garrison's kit, variant by variant — the warrior's grave
   * iron, the archer's bone-and-iron Marrowpoint with a hip quiver, the
   * guard's rusted helm and oak kiteshield, the champion's mantle and
   * the sword from his own purse. Every piece is a real item the mob
   * (or its tier) actually drops: the look IS the loot story.
   */
  private static readonly SKELETON_EQUIP: Record<string, Partial<Record<string, string>>> = {
    skeleton: { weapon: 'iron_sword' },
    skeleton_archer: { weapon: 'marrowpoint', offhand: 'hunters_quiver' },
    skeleton_guard: { weapon: 'iron_sword', offhand: 'oak_kiteshield', head: 'iron_helm' },
    skeleton_champion: { weapon: 'iron_sword', cape: 'cape_champion' },
  };

  private static readonly GOBLIN_EQUIP: Record<string, Partial<Record<string, string>>> = {
    goblin: { weapon: 'bronze_sword' },
  };

  /**
   * The road-thieves' kit — leathers and honest iron, every piece a
   * real drop from the wearer's table (the loot-story law). The
   * archer slings a shortbow and quiver; the reaver fights sword-and-
   * dagger, the dual-wield silhouette marking the camp's name.
   */
  private static readonly BRIGAND_EQUIP: Record<string, Partial<Record<string, string>>> = {
    brigand: { weapon: 'iron_sword', body: 'leather_body', head: 'leather_hood' },
    brigand_archer: {
      weapon: 'shortbow',
      offhand: 'hunters_quiver',
      body: 'leather_body',
      legs: 'leather_chaps',
    },
    brigand_reaver: {
      weapon: 'iron_sword',
      offhand: 'iron_dagger',
      head: 'leather_hood',
      body: 'leather_body',
      legs: 'leather_chaps',
    },
  };

  /** Human outlaws stand player-tall; the reaver a shade over. */
  private static readonly BRIGAND_SIZE: Record<string, number> = {
    brigand: 1.0,
    brigand_archer: 0.97,
    brigand_reaver: 1.1,
  };

  /** Weathered human hides — road tans, not goblin green. */
  private static readonly BRIGAND_SKIN: Record<string, string> = {
    brigand: '#d9a878',
    brigand_archer: '#c69268',
    brigand_reaver: '#b9825e',
  };

  /** Shared empty kit — stable identity for the body-sprite signature. */
  private static readonly NO_EQUIP: Partial<Record<string, string>> = {};

  /**
   * Skeleton stature ladder: the dead stand taller and gaunter than
   * goblins — the archer a touch lighter, the guard a head above the
   * rank-and-file, the champion looming over all of them.
   */
  private static readonly SKELETON_SIZE: Record<string, number> = {
    skeleton: 0.95,
    skeleton_archer: 0.92,
    skeleton_guard: 1.05,
    skeleton_champion: 1.25,
  };

  /**
   * Kobold kit: the loot-story law — every carried piece really drops
   * from the wearer's table. The digger swings the bronze pick it
   * mines with; the digmaster's iron pick is the tier's chase drop.
   */
  private static readonly KOBOLD_EQUIP: Record<string, Partial<Record<string, string>>> = {
    kobold: { weapon: 'bronze_pickaxe' },
    kobold_digmaster: { weapon: 'iron_pickaxe' },
  };

  /** Kobold stature: knee-high nuisance to a boss you look up at. */
  private static readonly KOBOLD_SIZE: Record<string, number> = {
    kobold: 0.75,
    kobold_digmaster: 1.0,
  };

  private npcItem(
    eid: number,
    defId: string,
    meta: { name?: string; level?: number },
    s: { x: number; y: number; dir: number; hpPct: number; pose: number },
    hurt: boolean,
  ): DrawItem {
    // Humanoid monsters use the full IK rig with size/skin overrides.
    if (
      defId.startsWith('goblin') ||
      defId.startsWith('skeleton') ||
      defId.startsWith('kobold') ||
      defId.startsWith('brigand') ||
      defId === 'troll'
    ) {
      const def = npcDef(defId);
      const skel = defId.startsWith('skeleton') ? skeletonLook(defId) : undefined;
      const kob = defId.startsWith('kobold') ? koboldLook(defId) : undefined;
      return this.humanoidItem({
        eid,
        x: s.x,
        y: s.y,
        dir: s.dir,
        pose: s.pose,
        hpPct: s.hpPct,
        name: meta.name,
        level: meta.level,
        isOwn: false,
        hurt,
        // Every skeleton carries what it was buried with — the gear is
        // the variant's silhouette (and each piece really drops).
        equip:
          // Static per defId — a fresh literal here would churn the
          // body-sprite signature's identity ids every frame.
          Renderer.GOBLIN_EQUIP[defId] ?? Renderer.KOBOLD_EQUIP[defId] ?? Renderer.SKELETON_EQUIP[defId] ?? Renderer.BRIGAND_EQUIP[defId] ?? Renderer.NO_EQUIP,
        color: def?.color ?? '#999',
        skinColor:
          defId === 'troll'
            ? '#6a7d5c'
            : defId.startsWith('goblin')
              ? '#7aa74a'
              : kob
                ? kob.hide
                : Renderer.BRIGAND_SKIN[defId],
        size:
          Renderer.KOBOLD_SIZE[defId] ??
          Renderer.SKELETON_SIZE[defId] ??
          Renderer.BRIGAND_SIZE[defId] ??
          (defId === 'troll' ? 1.4 : 0.85),
        skeletal: skel,
        kobold: kob,
      });
    }

    // Leg-less bodies skip the rig entirely: gel blocks hop, wings
    // hover, coils slither — each through its own dedicated painter.
    if (defId === 'slime' || defId === 'slime_small' || defId === 'cave_bat' || defId === 'adder') {
      return this.leglessItem(eid, defId, meta, s, hurt);
    }

    const def = npcDef(defId);
    const scale = this.camera.scale;
    const r = (def?.radius ?? 0.3) * scale;
    const terrainLift = this.renderLift(s.x, s.y) * scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= terrainLift;
    const anim = this.animFor(eid, s.x, s.y, s.pose, performance.now());
    // Beasts walk on the universal rig: solved in world space so the
    // feet plant on real ground, each foot riding the terrain under
    // ITSELF — animals climb stairs step by step like players do.
    const spec = beastSpec(defId, def?.radius ?? 0.3, def?.speed ?? 2);
    if (!anim.legs || anim.rigKey !== defId) {
      anim.legs = new LegRig(spec.rig);
      anim.rigKey = defId;
      anim.kneeMemory.length = 0;
    }
    const legPose = anim.legs.update(s.x, s.y, s.dir, this.frameDt);
    // Beast touchdowns kick dust too — a wolf at full sprint tears
    // little clouds loose just like a player does, scaled to its size.
    if (anim.lastPlants === undefined) {
      anim.lastPlants = anim.legs.plants;
    } else if (anim.legs.plants !== anim.lastPlants) {
      anim.lastPlants = anim.legs.plants;
      this.kickDust(anim.legs, Math.max(0.5, Math.min(1.3, (def?.radius ?? 0.3) / 0.3)));
    }
    const feet = legPose.feet.map((f) => {
      const fp = this.camera.worldToScreen(f.x, f.y, this.w, this.h);
      fp.y -= this.renderLift(f.x, f.y) * scale;
      return { x: fp.x, y: fp.y, lift: f.lift };
    });
    const attackT =
      s.pose === PoseState.Attack
        ? Math.min(1, (performance.now() - anim.poseStartedAt) / 420)
        : 0;
    // Body-sprite cache identity (see paintOutlined): grazing herds
    // are the town-crowd of the wilds — idle cud-chew/tail-swish life
    // re-samples on the cadence, plain locomotion at half rate, and
    // anything fighting or flinching at full rate.
    const olMoving = this.bodyMotion(anim, s.x, s.y, s.dir);
    const locomotion = olMoving || s.pose === PoseState.Walk;
    const fullDyn =
      (s.pose !== PoseState.Idle && s.pose !== PoseState.Walk) ||
      hurt ||
      performance.now() - anim.poseStartedAt < 900;
    const olDyn = fullDyn || (locomotion && (this.frameNo + eid) % 2 === 0);
    return {
      sortY: s.y,
      elevated: terrainLift !== 0,
      olKey: eid,
      olSig: `${s.dir.toFixed(3)}|${s.pose}|${hurt ? 1 : 0}|${defId}`,
      olDyn,
      baseX: s.x,
      baseY: s.y,
      drawShadow: () => {
        this.castBody(p.x, p.y + r * 0.25, r * 1.05);
      },
      draw: () => {
        drawBeast(this.ctx, {
          x: p.x,
          y: p.y,
          scale,
          dir: legPose.dir,
          radius: def?.radius ?? 0.3,
          color: def?.color ?? '#999',
          defId,
          spec,
          pose: legPose,
          feet,
          yScale: this.camera.yScale,
          walkPhase: anim.walkPhase,
          hurt,
          kneeMemory: anim.kneeMemory,
          attackT,
          seed: eid,
          nowMs: performance.now(),
        });
      },
      // Bounds from the SPECIES SPEC, not the collision radius: a
      // chicken's head and a wolf's tail reach far beyond `radius`,
      // and a clipped sprite gives the dilate a hard rectangle edge
      // to ring — the "seeping border" bug.
      body: (() => {
        const halfW = (spec.bodyLen * 2.0 + 0.35) * scale + r;
        // Tall headgear reaches past the spec envelope — the stag's
        // antlers ride a raised neck and clip at the top edge without
        // their own headroom (user-flagged walking up-screen).
        const headroom =
          defId === 'stag' ? 0.7 : defId === 'ram' ? 0.25 : defId === 'dire_wolf' ? 0.3 : defId === 'worg' ? 0.25 : 0;
        const top = (spec.bodyRise + (def?.radius ?? 0.3) * 2.2 + headroom) * scale + r;
        const bottom = (spec.rig.legLen + 0.7) * scale;
        return { x: p.x - halfW, y: p.y - top, w: halfW * 2, h: top + bottom };
      })(),
      drawLabel: () => {
        const ctx = this.ctx;
        if (meta.name) {
          const topY = p.y - r * 2.6;
          ctx.font = `600 ${Math.max(10, scale * 0.24)}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          const label = meta.level ? `${meta.name} (${meta.level})` : meta.name;
          ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
          ctx.fillText(label, p.x + 1.5, topY + 1.5);
          ctx.fillStyle = '#f0cf8a';
          ctx.fillText(label, p.x, topY);
        }
        if (s.hpPct < 255) {
          this.drawMiniHp(p.x, p.y - r * 2.45, r * 2, s.hpPct);
        }
      },
    };
  }

  /**
   * The leg-less menagerie: slimes (hopping gel blocks), cave bats
   * (hovering wing fans), adders (slithering ribbons). No LegRig — each
   * body's locomotion IS its painter, gated on the anim's travel
   * activity so a still body rests instead of freezing mid-cycle.
   */
  private leglessItem(
    eid: number,
    defId: string,
    meta: { name?: string; level?: number },
    s: { x: number; y: number; dir: number; hpPct: number; pose: number },
    hurt: boolean,
  ): DrawItem {
    const def = npcDef(defId);
    const scale = this.camera.scale;
    const radius = def?.radius ?? 0.3;
    const r = radius * scale;
    const terrainLift = this.renderLift(s.x, s.y) * scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= terrainLift;
    const now = performance.now();
    const anim = this.animFor(eid, s.x, s.y, s.pose, now);
    const attackT =
      s.pose === PoseState.Attack ? Math.min(1, (now - anim.poseStartedAt) / 420) : 0;
    const moveK = anim.moveK ?? 0;
    const common = {
      x: p.x,
      y: p.y,
      s: scale,
      dir: s.dir,
      radius,
      color: def?.color ?? '#999',
      hurt,
      walkPhase: anim.walkPhase,
      nowMs: now,
      seed: eid,
      moveK,
      attackT,
      ys: this.camera.yScale,
    };
    const bat = defId === 'cave_bat';
    const snake = defId === 'adder';
    // Sprite extents differ per body plan: the adder trails 1.3 tiles of
    // ribbon, the bat hovers a full tile up with wings wide.
    const halfW = (snake ? 1.55 : bat ? 0.95 : radius * 2.2 + 0.25) * scale;
    const top = (bat ? 1.7 : snake ? 0.55 : radius * 2.4 + 0.15) * scale;
    const bottom = (snake ? 1.1 : 0.4) * scale;
    const labelTop = bat ? p.y - 1.95 * scale : p.y - Math.max(r * 2.6, 0.55 * scale);
    return {
      sortY: s.y,
      elevated: terrainLift !== 0,
      drawShadow: () => {
        // The bat's shadow stays on the ground it flies over, smaller
        // for the height; the adder throws a low smear.
        this.castBody(p.x, p.y + r * 0.25, r * (bat ? 0.8 : snake ? 1.0 : 1.05));
      },
      draw: () => {
        if (bat) drawBat(this.ctx, common);
        else if (snake) drawSnake(this.ctx, common);
        else drawSlime(this.ctx, common);
      },
      body: { x: p.x - halfW, y: p.y - top, w: halfW * 2, h: top + bottom },
      drawLabel: () => {
        const ctx = this.ctx;
        if (meta.name) {
          ctx.font = `600 ${Math.max(10, scale * 0.24)}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          const label = meta.level ? `${meta.name} (${meta.level})` : meta.name;
          ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
          ctx.fillText(label, p.x + 1.5, labelTop + 1.5);
          ctx.fillStyle = '#f0cf8a';
          ctx.fillText(label, p.x, labelTop);
        }
        if (s.hpPct < 255) {
          this.drawMiniHp(p.x, labelTop + 0.12 * scale, r * 2, s.hpPct);
        }
      },
    };
  }

  /**
   * Ground loot. Coins pile up as actual gold; everything else is a
   * cinched leather loot bag whose topper tells you the cargo at a
   * glance — a blade for weapons and tools, arrow shafts for ammo, a
   * draped cloth for wearables, a round loaf for food, a stitched
   * patch in the item's color for raw goods. High-value drops shimmer.
   */
  private dropItem(
    eid: number,
    itemId: string,
    qty: number,
    s: { x: number; y: number },
    now: number,
    roll?: ItemRoll,
  ): DrawItem {
    const ctx = this.ctx;
    const def = itemDef(itemId);
    const col = def?.color ?? '#b0a49a';
    const k = this.camera.scale;
    const terrainLift = this.renderLift(s.x, s.y) * k;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= terrainLift;

    const cat: 'gold' | 'ore' | 'egg' | 'gear' | 'ammo' | 'wear' | 'eat' | 'stuff' =
      itemId === 'coins'
        ? 'gold'
        : itemId.endsWith('_ore') || itemId === 'coal' || itemId === 'obsidian_shard'
          ? 'ore'
          : itemId === 'egg'
            ? 'egg'
            : itemId === 'arrow'
              ? 'ammo'
              : def?.weapon || def?.tool
                ? 'gear'
                : def?.equipSlot
                  ? 'wear'
                  : def?.heals
                    ? 'eat'
                    : 'stuff';

    // Landing pop: freshly spawned loot drops in and settles with a
    // small overshoot. animFor's poseStartedAt is its first-seen time.
    const anim = this.animFor(eid, s.x, s.y, 0, now);
    const age = (now - anim.poseStartedAt) / 1000;
    const landT = Math.min(1, age / 0.32);
    const pop = landT >= 1 ? 1 : 0.55 + 0.45 * landT + 0.16 * Math.sin(landT * Math.PI);
    const fall = (1 - landT) * (1 - landT) * k * 0.55;
    const bob = Math.sin(now / 460 + eid * 1.7) * k * 0.028;

    // Deterministic per-drop scatter for coin piles and glint timing.
    const rnd = (i: number): number => {
      const v = Math.sin(eid * 12.9898 + i * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };

    // Pointer hover: label pops instantly and the bag brightens.
    const hovered =
      this.lootHud.mouse &&
      Math.hypot(this.lootHud.mx - p.x, this.lootHud.my - (p.y - k * 0.2)) < k * 0.45;
    this.frameLoot.push({ eid, x: s.x, y: s.y, sx: p.x, sy: p.y - k * 0.55, itemId, qty, hovered, roll });

    // Premium cargo announces itself: a soft glow in the item's color.
    if (cat === 'gold' && qty >= 25) {
      this.queueGlow(s.x, s.y, 0.7, '232, 182, 76', 0.1);
    } else if ((def?.value ?? 0) >= 300) {
      const c = parseInt(col.slice(1), 16);
      this.queueGlow(s.x, s.y, 0.7, `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`, 0.12);
    }

    const outline = hovered ? '#f6ecd4' : '#241a2e';
    const lw = Math.max(1.5, k * 0.042);

    const drawGold = (): void => {
      // Real gold on the ground: a pile that grows with the sum.
      const n = qty >= 200 ? 9 : qty >= 50 ? 6 : qty >= 10 ? 4 : 3;
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(1.2, k * 0.032);
      for (let i = 0; i < n; i++) {
        // Rows stack back-to-front; jitter keeps piles individual.
        const row = i < Math.ceil(n / 2) ? 0 : i < n - 1 ? 1 : 2;
        const inRow = row === 0 ? i : row === 1 ? i - Math.ceil(n / 2) : 0;
        const rowN = row === 0 ? Math.ceil(n / 2) : Math.max(1, n - 1 - Math.ceil(n / 2));
        const cx = (inRow - (rowN - 1) / 2) * k * 0.13 + (rnd(i) - 0.5) * k * 0.05;
        const cy = -row * k * 0.075 + (rnd(i + 9) - 0.5) * k * 0.02;
        ctx.fillStyle = row === 2 ? '#f2cd5e' : row === 1 ? '#e8b64c' : '#d9a441';
        ctx.beginPath();
        ctx.ellipse(cx, cy, k * 0.085, k * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(122, 84, 30, 0.75)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, k * 0.048, k * 0.028, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1.2, k * 0.032);
      }
      // A wandering twinkle so gold catches the eye across a field.
      const tw = Math.sin(now / 260 + eid * 2.3);
      if (tw > 0.55) {
        const a = (tw - 0.55) / 0.45;
        const gx = (rnd(31) - 0.5) * k * 0.3;
        const gy = -k * 0.07 - rnd(32) * k * 0.08;
        ctx.fillStyle = `rgba(255, 244, 214, ${0.9 * a})`;
        const gr = k * 0.045 * a;
        ctx.beginPath();
        ctx.moveTo(gx, gy - gr);
        ctx.lineTo(gx + gr * 0.4, gy);
        ctx.lineTo(gx, gy + gr);
        ctx.lineTo(gx - gr * 0.4, gy);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawEgg = (): void => {
      // A hen's egg lying where it was laid — no bag, just the egg
      // (or a small clutch for a stack), nestled in a grass shadow.
      const n = Math.min(3, qty);
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(1.2, k * 0.034);
      for (let i = 0; i < n; i++) {
        const ex = (i - (n - 1) / 2) * k * 0.15 + (rnd(i + 3) - 0.5) * k * 0.04;
        const ey = (rnd(i + 7) - 0.5) * k * 0.05;
        const rot = (rnd(i + 11) - 0.5) * 0.7;
        ctx.fillStyle = i % 2 ? '#efe3c8' : '#e8d9b0';
        ctx.beginPath();
        ctx.ellipse(ex, ey, k * 0.075, k * 0.095, rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8f2e0';
        ctx.beginPath();
        ctx.ellipse(ex - k * 0.02, ey - k * 0.035, k * 0.026, k * 0.034, rot, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawOre = (): void => {
      // Raw stone on the ground reads as stone — no bag pretends
      // otherwise. One hefty chunk plus spall, cut in the same blocky
      // node language as the deposits, in the metal's identity colors
      // (the same hues its icon speaks, not the item-list grey).
      const ORE_DROP: Record<string, string> = {
        copper_ore: '#c47b3d',
        tin_ore: '#cfd3dc',
        iron_ore: '#a05038',
        coal: '#4a4456',
        gold_ore: '#e8b64c',
        silver_ore: '#c6cfe0',
        mithril_ore: '#8fb4e4',
        adamant_ore: '#6cb47a',
        obsidian_shard: '#3b3247',
        starmetal_ore: '#d6cbf6',
      };
      const oreCol = ORE_DROP[itemId] ?? col;
      const accent =
        itemId === 'coal' ? '#8a86a0'
        : itemId === 'obsidian_shard' ? '#b8a8d8'
        : itemId === 'tin_ore' || itemId === 'silver_ore' || itemId === 'starmetal_ore' ? '#ffffff'
        : itemId === 'mithril_ore' ? '#d8ecff'
        : itemId === 'adamant_ore' ? '#d2f0d0'
        : '#fff6d8';
      const chunk = (cx: number, cy: number, w: number, rot: number): void => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        const hh = w * 0.8;
        const cut = w * 0.2;
        ctx.fillStyle = shade(oreCol, -32);
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1.4, k * 0.038);
        ctx.beginPath();
        chamferRect(ctx, -w / 2, -hh / 2, w, hh, cut);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = oreCol;
        ctx.beginPath();
        chamferRect(ctx, -w * 0.38, -hh * 0.4, w * 0.72, hh * 0.66, cut * 0.7);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-w * 0.28, -hh * 0.3, w * 0.24, hh * 0.18);
        ctx.restore();
      };
      chunk(-k * 0.1, -k * 0.14, k * 0.36, -0.1);
      chunk(k * 0.17, -k * 0.07, k * 0.24, 0.16);
      if (itemId === 'copper_ore') {
        // Verdigris kiss on the big chunk's shadowed flank.
        ctx.fillStyle = '#3fa98e';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(-k * 0.2, -k * 0.08, k * 0.07, k * 0.06);
        ctx.globalAlpha = 1;
      } else if (itemId === 'iron_ore') {
        // One rust band across the face.
        ctx.fillStyle = shade(oreCol, -24);
        ctx.fillRect(-k * 0.24, -k * 0.16, k * 0.26, Math.max(1.2, k * 0.032));
      } else if (itemId === 'gold_ore') {
        // Gold catches the eye across a field — same twinkle law as coins.
        const tw = Math.sin(now / 260 + eid * 2.3);
        if (tw > 0.55) {
          const a = (tw - 0.55) / 0.45;
          const gx = (rnd(31) - 0.5) * k * 0.3;
          const gy = -k * 0.2 - rnd(32) * k * 0.08;
          ctx.fillStyle = `rgba(255, 244, 214, ${0.9 * a})`;
          const gr = k * 0.045 * a;
          ctx.beginPath();
          ctx.moveTo(gx, gy - gr);
          ctx.lineTo(gx + gr * 0.4, gy);
          ctx.lineTo(gx, gy + gr);
          ctx.lineTo(gx - gr * 0.4, gy);
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    const drawBag = (): void => {
      const bw = k * 0.34;

      // Toppers that live BEHIND the bag mouth rise first.
      if (cat === 'gear') {
        // A blade left leaning out of the bag — unmistakably arms.
        ctx.save();
        ctx.translate(k * 0.015, -k * 0.31);
        ctx.rotate(-0.32);
        ctx.fillStyle = col;
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(-k * 0.035, 0);
        ctx.lineTo(-k * 0.035, -k * 0.3);
        ctx.lineTo(0, -k * 0.4);
        ctx.lineTo(k * 0.035, -k * 0.3);
        ctx.lineTo(k * 0.035, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = shade(col, 30);
        ctx.lineWidth = Math.max(1, k * 0.02);
        ctx.beginPath();
        ctx.moveTo(0, -k * 0.05);
        ctx.lineTo(0, -k * 0.34);
        ctx.stroke();
        ctx.fillStyle = '#6b4a26';
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        chamferRect(ctx, -k * 0.075, -k * 0.01, k * 0.15, k * 0.045, k * 0.015);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (cat === 'ammo') {
        // Fanned arrow shafts, fletching up.
        for (let i = -1; i <= 1; i++) {
          ctx.save();
          ctx.translate(i * k * 0.045, -k * 0.32);
          ctx.rotate(i * 0.22);
          ctx.strokeStyle = '#8a6a45';
          ctx.lineWidth = Math.max(1.4, k * 0.028);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -k * 0.3);
          ctx.stroke();
          ctx.fillStyle = i === 0 ? shade(col, 14) : col;
          ctx.strokeStyle = outline;
          ctx.lineWidth = Math.max(1, k * 0.02);
          ctx.beginPath();
          ctx.moveTo(0, -k * 0.36);
          ctx.lineTo(k * 0.038, -k * 0.26);
          ctx.lineTo(0, -k * 0.29);
          ctx.lineTo(-k * 0.038, -k * 0.26);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // The bag: a squarish leather pouch, cinched with a rope tie,
      // gathered mouth puffing above the knot.
      const leather = '#8f6c46';
      ctx.fillStyle = leather;
      ctx.strokeStyle = outline;
      ctx.lineWidth = lw;
      ctx.beginPath();
      chamferRect(ctx, -bw / 2, -k * 0.31, bw, k * 0.31, k * 0.07);
      ctx.fill();
      ctx.stroke();
      // Gathered mouth above the tie.
      ctx.fillStyle = shade(leather, -8);
      ctx.beginPath();
      chamferRect(ctx, -k * 0.1, -k * 0.415, k * 0.2, k * 0.1, k * 0.035);
      ctx.fill();
      ctx.stroke();
      // Rope cinch + knot.
      ctx.fillStyle = '#c4a35a';
      ctx.beginPath();
      chamferRect(ctx, -k * 0.115, -k * 0.345, k * 0.23, k * 0.05, k * 0.02);
      ctx.fill();
      ctx.stroke();
      // Base weight band + top-left light facet: brutalist two-tone.
      ctx.fillStyle = shade(leather, -22);
      ctx.beginPath();
      chamferRect(ctx, -bw / 2 + k * 0.025, -k * 0.085, bw - k * 0.05, k * 0.06, k * 0.02);
      ctx.fill();
      ctx.fillStyle = shade(leather, 20);
      ctx.beginPath();
      chamferRect(ctx, -bw / 2 + k * 0.035, -k * 0.28, k * 0.1, k * 0.055, k * 0.02);
      ctx.fill();

      // Front-of-bag cargo tells.
      if (cat === 'stuff') {
        // A stitched patch dyed in the goods' color.
        ctx.fillStyle = col;
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1, k * 0.022);
        ctx.beginPath();
        chamferRect(ctx, -k * 0.065, -k * 0.225, k * 0.13, k * 0.115, k * 0.025);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = shade(col, -34);
        ctx.setLineDash([k * 0.022, k * 0.022]);
        ctx.beginPath();
        chamferRect(ctx, -k * 0.048, -k * 0.208, k * 0.096, k * 0.08, k * 0.018);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (cat === 'wear') {
        // A folded garment draped over the rim.
        ctx.fillStyle = col;
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1, k * 0.024);
        ctx.beginPath();
        ctx.moveTo(-k * 0.155, -k * 0.315);
        ctx.lineTo(-k * 0.005, -k * 0.315);
        ctx.lineTo(-k * 0.005, -k * 0.15);
        ctx.quadraticCurveTo(-k * 0.045, -k * 0.115, -k * 0.08, -k * 0.15);
        ctx.quadraticCurveTo(-k * 0.115, -k * 0.11, -k * 0.155, -k * 0.155);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = shade(col, -28);
        ctx.lineWidth = Math.max(1, k * 0.018);
        ctx.beginPath();
        ctx.moveTo(-k * 0.08, -k * 0.3);
        ctx.lineTo(-k * 0.08, -k * 0.16);
        ctx.stroke();
      } else if (cat === 'eat') {
        // A round loaf resting in the mouth.
        ctx.fillStyle = col;
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1, k * 0.024);
        ctx.beginPath();
        ctx.ellipse(k * 0.02, -k * 0.43, k * 0.085, k * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = shade(col, 24);
        ctx.beginPath();
        ctx.ellipse(k * 0.0, -k * 0.455, k * 0.038, k * 0.022, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    return {
      sortY: s.y - 0.2,
      elevated: terrainLift !== 0,
      drawShadow: () => {
        const spread = cat === 'gold' ? 0.75 : 0.6;
        this.castContact(p.x, p.y + k * 0.05, k * 0.3 * spread * pop, k * 0.13 * pop);
      },
      draw: () => {
        ctx.save();
        ctx.translate(p.x, p.y + bob - fall);
        ctx.scale(pop, pop);
        const paint = (): void => {
          if (cat === 'gold') drawGold();
          else if (cat === 'ore') drawOre();
          else if (cat === 'egg') drawEgg();
          else drawBag();
        };
        // A merged stack reads as a HEAP before its label confirms it:
        // shrunken siblings tucked behind the front bag, one from ×3,
        // two from ×10. Gold and eggs already draw their own piles.
        const echoes = cat === 'gold' || cat === 'egg' ? 0 : qty >= 10 ? 2 : qty >= 3 ? 1 : 0;
        for (let i = echoes; i >= 1; i--) {
          ctx.save();
          const side = rnd(40 + i) > 0.5 ? 1 : -1;
          ctx.translate(side * i * k * (0.16 + rnd(44 + i) * 0.08), -k * 0.03 * i);
          ctx.scale(0.78, 0.78);
          ctx.globalAlpha = 0.92;
          paint();
          ctx.restore();
        }
        paint();
        if (hovered) {
          // Grounding ring: "this is the one under your cursor".
          ctx.strokeStyle = 'rgba(246, 236, 212, 0.75)';
          ctx.lineWidth = Math.max(1.2, k * 0.03);
          ctx.beginPath();
          ctx.ellipse(0, k * 0.06 - bob + fall, k * 0.31, k * 0.135, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  /**
   * Loot labels — the "what is that" layer over ground drops:
   * - hovering a bag with the mouse names it instantly;
   * - anything within arm's reach fades its label in (the read that
   *   works with no pointer at all — pads and touch);
   * - holding the reveal (Alt / left trigger) names every drop on
   *   screen, the ARPG sweep-the-battlefield gesture.
   * Labels stack upward when drops share a column so none overlap.
   */
  private drawLootLabels(game: ClientGame): void {
    this.lootPlates.length = 0;
    if (this.frameLoot.length === 0 || game.ownEid === null) return;
    const ctx = this.ctx;
    const own = game.predictor.renderPos();
    const showAll = this.lootHud.showAll;

    interface Plate {
      eid: number;
      sx: number;
      sy: number;
      text: string;
      col: string;
      nameCol: string;
      alpha: number;
    }
    const plates: Plate[] = [];
    for (const d of this.frameLoot) {
      const dist = Math.hypot(d.x - own.x, d.y - own.y);
      let alpha: number;
      if (d.hovered || showAll) alpha = 1;
      else alpha = Math.max(0, Math.min(1, (2.6 - dist) / 0.9));
      if (alpha <= 0.03) continue;
      const def = itemDef(d.itemId);
      // Ground loot announces its roll: "Iron helm of Strength".
      const name = instanceName(d.itemId, d.roll);
      plates.push({
        eid: d.eid,
        sx: d.sx,
        sy: d.sy,
        text: d.qty > 1 ? `${name} × ${d.qty.toLocaleString()}` : name,
        col: def?.color ?? '#b0a49a',
        // Rarity speaks on the ground too — the ARPG loot-name law.
        // A rolled instance's own tier wins over the value-derived tint.
        nameCol: (d.roll ? RARITY_COLORS[d.roll.rar] : rarityColor(d.itemId)) ?? '#f4efe4',
        alpha,
      });
    }
    if (plates.length === 0) return;
    // Nearest labels claim their spot first; the rest climb.
    plates.sort((a, b) => b.sy - a.sy);
    if (plates.length > 14) plates.length = 14;

    ctx.save();
    ctx.font = "600 12px 'Trebuchet MS', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const h = 20;
    const placed: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    for (const pl of plates) {
      const w = ctx.measureText(pl.text).width + 22;
      let x = Math.max(w / 2 + 4, Math.min(this.w - w / 2 - 4, pl.sx));
      let y = pl.sy;
      // Climb out of any occupied rect.
      let moved = true;
      while (moved) {
        moved = false;
        for (const r of placed) {
          if (x + w / 2 > r.x0 && x - w / 2 < r.x1 && y + h / 2 > r.y0 && y - h / 2 < r.y1) {
            y = r.y0 - h / 2 - 2;
            moved = true;
          }
        }
      }
      placed.push({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 });
      this.lootPlates.push({ eid: pl.eid, x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 });

      ctx.globalAlpha = pl.alpha;
      ctx.fillStyle = 'rgba(24, 16, 30, 0.86)';
      ctx.strokeStyle = pl.col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 5);
      ctx.fill();
      ctx.stroke();
      // Color swatch chip: the item's identity at a squint.
      ctx.fillStyle = pl.col;
      ctx.beginPath();
      ctx.roundRect(x - w / 2 + 5, y - 4, 8, 8, 2);
      ctx.fill();
      ctx.fillStyle = pl.nameCol;
      ctx.fillText(pl.text, x + 7, y + 0.5);
    }
    ctx.restore();
  }

  /**
   * Which ground drop lives under this screen point? Labels first
   * (they never overlap, so a stacked pile stays fully clickable),
   * then the bag sprites themselves. Returns the drop's entity id and
   * world position, or null.
   */
  lootHitTest(sx: number, sy: number): { eid: number; x: number; y: number } | null {
    for (const pl of this.lootPlates) {
      if (sx >= pl.x0 && sx <= pl.x1 && sy >= pl.y0 && sy <= pl.y1) {
        const d = this.frameLoot.find((f) => f.eid === pl.eid);
        if (d) return { eid: d.eid, x: d.x, y: d.y };
      }
    }
    const k = this.camera.scale;
    let best: { eid: number; x: number; y: number } | null = null;
    let bestD = k * 0.45;
    for (const d of this.frameLoot) {
      // frameLoot sy is the label anchor (bag top); the sprite's visual
      // center sits ~0.35 tile below it.
      const dist = Math.hypot(sx - d.sx, sy - (d.sy + k * 0.35));
      if (dist < bestD) {
        bestD = dist;
        best = { eid: d.eid, x: d.x, y: d.y };
      }
    }
    return best;
  }

  private projectileItem(eid: number, style: string, s: { x: number; y: number; dir: number }): DrawItem {
    const ctx = this.ctx;
    const scale = this.camera.scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= this.renderLift(s.x, s.y) * scale;
    // Shots fly at CHEST height — leaving the bow's nock / the staff's
    // crown, not skimming the grass. The particles/glow ride the same
    // airborne y so the whole effect lives up there together.
    const groundY = p.y;
    p.y -= PROJ_AIR * scale;
    const ax = s.x;
    const ay = this.projAirWorldY(s.y);
    const magic = style.startsWith('magic');
    const tint = elementTint(style);

    // Muzzle flash — the first frame we see a shot, it POPS out of the
    // weapon: a directional spray of shards + a glow spike.
    if (!this.projSeen.has(eid)) {
      this.projSeen.add(eid);
      if (magic) {
        this.particles.burst(ax, ay, 10, [tint.mid, `rgb(${tint.deep})`, tint.core, tint.fleck], {
          speed: 2.6,
          life: 0.32,
          size: 0.09,
          gravity: 0,
          dir: s.dir,
          spread: 1.5,
          drag: 3,
        });
        this.queueGlow(ax, ay, 1.6, tint.glow, 0.75);
      } else {
        this.particles.burst(ax, ay, 5, ['#e6e0d0', '#c4b590'], {
          speed: 1.6,
          life: 0.2,
          size: 0.06,
          gravity: 0,
          dir: s.dir,
          spread: 0.9,
          drag: 4,
        });
      }
    }

    return {
      sortY: s.y + 10,
      draw: () => {
        // The sprite must lie along the SCREEN flight line: the camera
        // pitch squashes world-y, so a world 45° travels ~31° on screen
        // — drawing the raw world angle skews every diagonal shot.
        const wfx = Math.cos(s.dir);
        const wfy = Math.sin(s.dir) * this.camera.yScale;
        const il = Math.hypot(wfx, wfy) || 1;
        const fx = wfx / il;
        const fy = wfy / il;
        // Ground shadow: a small dark tick racing along under the shot
        // sells the height of the flight line.
        ctx.fillStyle = 'rgba(20, 16, 28, 0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, groundY, scale * 0.16, scale * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        const now = performance.now();
        const el = style.split(':')[1] ?? 'arcane';
        if (style.split(':')[0] === 'magic_heavy') {
          // The heavy orb: fat, slow, unmistakably the payoff beat —
          // a churning faceted core with an ESCORT: three satellites
          // wheeling around it in the element's own matter.
          this.particles.burst(ax, ay, 2, [tint.mid, `rgb(${tint.deep})`, tint.core], {
            speed: 0.6,
            life: 0.5,
            size: 0.12,
            gravity: 0,
            dir: s.dir + Math.PI,
            spread: 1.2,
          });
          this.queueGlow(ax, ay, 1.7, tint.glow, 0.65);
          ctx.fillStyle = `rgba(${tint.deep}, 0.4)`;
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.32, 7, s.dir * 0.5);
          ctx.fill();
          ctx.fillStyle = tint.mid;
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.23, 7, -s.dir * 0.7);
          ctx.fill();
          ctx.fillStyle = tint.core;
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y, scale * 0.11, 5, s.dir);
          ctx.fill();
          // The escort ring — orbit tilted flat like everything else.
          for (let k = 0; k < 3; k++) {
            const a = now / 240 + (k / 3) * Math.PI * 2;
            const ox = Math.cos(a) * scale * 0.46;
            const oy = Math.sin(a) * scale * 0.28;
            const g = scale * 0.07;
            ctx.fillStyle = k === 0 ? tint.core : tint.fleck;
            ctx.save();
            ctx.translate(p.x + ox, p.y + oy);
            ctx.rotate(a * 2);
            ctx.fillRect(-g / 2, -g / 2, g, g);
            ctx.restore();
            if (el === 'storm' && k === 0) {
              // The escort arcs to the core.
              ctx.strokeStyle = tint.core;
              ctx.lineWidth = Math.max(1, scale * 0.025);
              ctx.beginPath();
              boltPath(ctx, p.x + ox, p.y + oy, p.x, p.y, ((now / 60) | 0) * 7 + k, scale * 0.08);
              ctx.stroke();
            }
          }
          return;
        }

        if (magic) {
          // Every school flies its OWN matter — a frost shard is not
          // an orange fireball with the hue swapped. The shared core
          // is the cut diamond; the element speaks around it.
          this.particles.burst(ax, ay, 1, [tint.mid, `rgb(${tint.deep})`], {
            speed: 0.35,
            life: 0.34,
            size: 0.08,
            gravity: 0,
            dir: s.dir + Math.PI,
            spread: 0.8,
          });
          if (Math.random() < this.frameDt * 22) {
            this.particles.burst(ax, ay, 1, [tint.fleck, tint.core], {
              speed: 1.4,
              life: 0.25,
              size: 0.05,
              gravity: 0,
            });
          }
          this.queueGlow(ax, ay, 1.0, tint.glow, 0.5);
          const nose = 0.3 * scale;
          const tail = 0.26 * scale;
          const half = 0.09 * scale;
          const diamond = (k: number, color: string, off = 0): void => {
            const cxp = p.x - fx * off;
            const cyp = p.y - fy * off;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cxp + fx * nose * k, cyp + fy * nose * k);
            ctx.lineTo(cxp - fy * half * k, cyp + fx * half * k);
            ctx.lineTo(cxp - fx * tail * k, cyp - fy * tail * k);
            ctx.lineTo(cxp + fy * half * k, cyp - fx * half * k);
            ctx.closePath();
            ctx.fill();
          };
          switch (el) {
            case 'ember': {
              // A brand streaking fire: flame tongues gutter off the
              // tail, each on its own strobe clock.
              for (let k = 0; k < 3; k++) {
                const lick = (0.28 + 0.14 * Math.sin(now / 55 + k * 2.4)) * scale;
                const off = (0.3 + k * 0.2) * scale;
                const side = (k % 2 === 0 ? 1 : -1) * (0.05 + 0.03 * Math.sin(now / 70 + k)) * scale;
                ctx.fillStyle = k === 0 ? tint.mid : `rgba(${tint.deep}, 0.85)`;
                ctx.beginPath();
                ctx.moveTo(p.x - fx * off - fy * side, p.y - fy * off + fx * side);
                ctx.lineTo(p.x - fx * (off + lick) - fy * side * 0.4, p.y - fy * (off + lick) + fx * side * 0.4);
                ctx.lineTo(p.x - fx * off - fy * side * 2.2, p.y - fy * off + fx * side * 2.2);
                ctx.closePath();
                ctx.fill();
              }
              diamond(1.0, tint.mid);
              diamond(0.48, tint.core);
              break;
            }
            case 'frost': {
              // A cut crystal flanked by two counter-spinning shards.
              diamond(1.2, `rgba(${tint.deep}, 0.35)`);
              diamond(0.85, tint.mid);
              diamond(0.4, tint.core);
              for (const sv of [-1, 1]) {
                const a = now / 180 * sv;
                const ox = -fy * sv * scale * 0.2;
                const oy = fx * sv * scale * 0.2;
                const g = scale * 0.09;
                ctx.fillStyle = tint.fleck;
                ctx.save();
                ctx.translate(p.x + ox - fx * scale * 0.1, p.y + oy - fy * scale * 0.1);
                ctx.rotate(a);
                ctx.fillRect(-g * 0.7, -g * 0.25, g * 1.4, g * 0.5);
                ctx.restore();
              }
              break;
            }
            case 'storm': {
              // Crackling dart: the body rides inside a live micro-arc
              // re-kinked every 50ms.
              const ks = ((now / 50) | 0) * 13;
              ctx.strokeStyle = tint.core;
              ctx.lineWidth = Math.max(1.5, scale * 0.04);
              ctx.beginPath();
              boltPath(ctx, p.x - fx * tail * 1.8, p.y - fy * tail * 1.8, p.x + fx * nose * 1.2, p.y + fy * nose * 1.2, ks, scale * 0.14);
              ctx.stroke();
              diamond(0.9, tint.mid);
              diamond(0.42, tint.core);
              break;
            }
            case 'verdant': {
              // Living seed: leaf blades orbit the pod as it flies.
              diamond(1.0, tint.mid);
              diamond(0.48, tint.core);
              for (let k = 0; k < 2; k++) {
                const a = now / 150 + k * Math.PI;
                const ox = Math.cos(a) * scale * 0.22;
                const oy = Math.sin(a) * scale * 0.14;
                const g = scale * 0.1;
                ctx.fillStyle = k === 0 ? tint.fleck : tint.mid;
                ctx.save();
                ctx.translate(p.x + ox, p.y + oy);
                ctx.rotate(a + 0.6);
                ctx.fillRect(-g * 0.7, -g * 0.2, g * 1.4, g * 0.4);
                ctx.restore();
              }
              break;
            }
            case 'void': {
              // Inverted: a pale shell around a DARK heart — the shot
              // is a hole in the air, drinking its own wake.
              diamond(1.25, tint.core);
              diamond(0.85, `rgb(${tint.deep})`);
              diamond(0.35, tint.mid);
              if (Math.random() < this.frameDt * 16) {
                this.particles.burst(ax - Math.cos(s.dir) * 0.5, ay - Math.sin(s.dir) * 0.5, 1, [tint.fleck], {
                  speed: 1.6, life: 0.3, size: 0.05, gravity: 0, dir: s.dir, spread: 0.3, shape: 'streak',
                });
              }
              break;
            }
            case 'radiant': {
              // A four-point star wheeling slowly, trailing light.
              const a = now / 400;
              ctx.fillStyle = tint.mid;
              ctx.beginPath();
              burstStarPath(ctx, p.x, p.y, scale * 0.3, scale * 0.1, 4, a);
              ctx.fill();
              ctx.fillStyle = tint.core;
              ctx.beginPath();
              burstStarPath(ctx, p.x, p.y, scale * 0.16, scale * 0.06, 4, -a * 1.4);
              ctx.fill();
              break;
            }
            case 'blood': {
              // A heavy droplet, nose-first, weeping as it flies.
              diamond(1.1, tint.mid);
              diamond(0.5, tint.core);
              ctx.fillStyle = tint.mid;
              ctx.beginPath();
              ctx.ellipse(p.x - fx * tail * 0.9, p.y - fy * tail * 0.9, half * 1.15, half * 0.85, Math.atan2(fy, fx), 0, Math.PI * 2);
              ctx.fill();
              if (Math.random() < this.frameDt * 10) {
                this.particles.burst(ax, ay, 1, [tint.mid], { speed: 0.4, life: 0.4, size: 0.05, gravity: 5, shape: 'streak' });
              }
              break;
            }
            case 'astral': {
              // A traveling constellation: core + three trailing stars.
              diamond(0.8, tint.mid);
              diamond(0.4, tint.core);
              for (let k = 1; k <= 3; k++) {
                const off = k * 0.2 * scale;
                const sway = Math.sin(now / 160 + k * 1.9) * scale * 0.08;
                const g = scale * (0.07 - k * 0.012);
                ctx.fillStyle = k % 2 === 0 ? tint.fleck : tint.core;
                const bx = p.x - fx * off - fy * sway;
                const by = p.y - fy * off + fx * sway;
                ctx.fillRect(bx - g / 2, by - g * 1.5, g, g * 3);
                ctx.fillRect(bx - g * 1.5, by - g / 2, g * 3, g);
              }
              break;
            }
            default: {
              // Arcane: the classic cut shard, now with a slow-spinning
              // outer facet so it reads as machined, not stamped.
              diamond(1.5, `rgba(${tint.deep}, 0.3)`);
              diamond(1.0, tint.mid);
              diamond(0.48, tint.core);
              const a = now / 220;
              const g = scale * 0.06;
              ctx.fillStyle = tint.fleck;
              ctx.save();
              ctx.translate(p.x - fx * scale * 0.05, p.y - fy * scale * 0.05);
              ctx.rotate(a);
              ctx.fillRect(-g / 2, -g / 2, g, g);
              ctx.restore();
              break;
            }
          }
        } else {
          // An arrow you can read at speed: streak, shaft, iron head,
          // red fletching — and a wisp of slipstream behind it.
          this.particles.burst(ax, ay, 1, ['rgba(230, 224, 208, 0.5)'], {
            speed: 0.1,
            life: 0.16,
            size: 0.05,
            gravity: 0,
          });
          const len = scale * 0.46;
          ctx.strokeStyle = 'rgba(230, 224, 208, 0.28)';
          ctx.lineWidth = Math.max(1.5, scale * 0.035);
          ctx.beginPath();
          ctx.moveTo(p.x - fx * len * 1.1, p.y - fy * len * 1.1);
          ctx.lineTo(p.x - fx * len * 0.5, p.y - fy * len * 0.5);
          ctx.stroke();
          ctx.strokeStyle = '#c4b590';
          ctx.lineWidth = Math.max(2, scale * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x - fx * len * 0.5, p.y - fy * len * 0.5);
          ctx.lineTo(p.x + fx * len * 0.4, p.y + fy * len * 0.4);
          ctx.stroke();
          // Fletching: two red vanes at the tail.
          ctx.strokeStyle = '#d95763';
          ctx.lineWidth = Math.max(1.5, scale * 0.04);
          for (const sv of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(p.x - fx * len * 0.34, p.y - fy * len * 0.34);
            ctx.lineTo(
              p.x - fx * len * 0.52 - fy * sv * scale * 0.07,
              p.y - fy * len * 0.52 + fx * sv * scale * 0.07,
            );
            ctx.stroke();
          }
          ctx.fillStyle = '#9aa2ac';
          ctx.beginPath();
          ctx.moveTo(p.x + fx * len * 0.58, p.y + fy * len * 0.58);
          ctx.lineTo(p.x + fx * len * 0.3 - fy * scale * 0.06, p.y + fy * len * 0.3 + fx * scale * 0.06);
          ctx.lineTo(p.x + fx * len * 0.3 + fy * scale * 0.06, p.y + fy * len * 0.3 - fx * scale * 0.06);
          ctx.closePath();
          ctx.fill();
        }
      },
    };
  }

  /**
   * Settle every projectile that ended flight this frame: arrows stand
   * in the ground (or ride the NPC they hit), magic fizzles in a burst.
   * Dead NPCs shed their arrows onto the ground where they fell.
   */
  private consumeProjectileAftermath(game: ClientGame, now: number): void {
    for (const end of game.projectileEnds) {
      if (end.style.startsWith('magic')) {
        const heavy = end.style.split(':')[0] === 'magic_heavy';
        const t = elementTint(end.style);
        const fy = this.projAirWorldY(end.y);
        this.particles.burst(end.x, fy, heavy ? 16 : 8, [t.mid, `rgb(${t.deep})`, t.core, t.fleck], {
          speed: heavy ? 3.2 : 2.2,
          life: 0.4,
          size: heavy ? 0.11 : 0.08,
          gravity: 0,
          drag: 3.5,
        });
        this.queueGlow(end.x, fy, heavy ? 2.2 : 1.4, t.glow, 0.8);
        continue;
      }
      // Arrow down. Into a body if one is close enough, else the dirt.
      // The last client sample lags the server impact by up to a step,
      // so probe the end point AND half a tile further down the line.
      const ex2 = end.x + Math.cos(end.dir) * 0.6;
      const ey2 = end.y + Math.sin(end.dir) * 0.6;
      let hitEid = -1;
      let hitDist = Infinity;
      for (const [eid, remote] of game.entities) {
        if (remote.meta.kind !== EntityKind.Npc) continue;
        const def = npcDef(remote.meta.defId ?? '');
        const sNow = remote.buffer.latest();
        const nx = sNow?.x ?? remote.meta.x;
        const ny = sNow?.y ?? remote.meta.y;
        const r = (def?.radius ?? 0.35) + 0.6;
        // Same feet→crown band the server hits against — a head shot
        // must pin to the body, not fall to the dirt behind it.
        const hh = def ? npcHitHeight(def) : 1.0;
        const d = Math.min(
          Math.hypot(nx - end.x, bandDy(end.y, ny, hh)),
          Math.hypot(nx - ex2, bandDy(ey2, ny, hh)),
        );
        if (d < r && d < hitDist) {
          hitDist = d;
          hitEid = eid;
        }
      }
      if (hitEid >= 0) {
        const pins = this.npcArrows.get(hitEid) ?? [];
        if (pins.length < 8) {
          // The pin keeps the shot's TRUE angle — where you shot from
          // is where the shaft points back to.
          pins.push({
            dir: end.dir,
            hy: 0.35 + Math.random() * 0.35,
            ox: 0.12 + Math.random() * 0.12,
          });
          this.npcArrows.set(hitEid, pins);
        }
      } else if (!this.probeWallStick(game, end.x, end.y, end.dir, now)) {
        // Nothing solid down the line: a spent shot. It doesn't teleport
        // into the dirt — it arcs down out of the flight line first.
        if (this.fallingShafts.length < 40) {
          this.fallingShafts.push({ x: end.x, y: end.y, dir: end.dir, born: now });
        }
      }
    }
    game.projectileEnds.length = 0;

    // Settle finished falls: the shaft has arced down — stand it in the
    // dirt where it landed (or swallow it with a splash on water).
    for (let i = this.fallingShafts.length - 1; i >= 0; i--) {
      const f = this.fallingShafts[i]!;
      if (now - f.born < FALLING_SHAFT_MS) continue;
      const lx = f.x + Math.cos(f.dir) * FALLING_SHAFT_ADVANCE;
      const ly = f.y + Math.sin(f.dir) * FALLING_SHAFT_ADVANCE;
      const tile = game.world.groundAt(Math.floor(lx), Math.floor(ly));
      if (tile === Tile.Water || tile === Tile.WaterDeep || tile === Tile.WaterShallow) {
        this.particles.burst(lx, ly, 7, ['#7fb2d9', '#a9d3ec', '#e6f2fa'], {
          speed: 1.4,
          life: 0.35,
          size: 0.07,
          up: true,
          gravity: 4,
          drag: 2,
        });
      } else if (this.stuckArrows.length < 100) {
        this.stuckArrows.push({ x: lx, y: ly, dir: f.dir, until: now + STUCK_ARROW_MS });
        this.particles.burst(lx, ly, 4, ['#b9a582', '#8a7a5c'], {
          speed: 1.1,
          life: 0.3,
          size: 0.06,
          up: true,
          drag: 3,
        });
      }
      this.fallingShafts.splice(i, 1);
    }

    // A felled NPC becomes a ragdoll and sheds its arrows around it.
    for (const death of game.npcDeaths) {
      this.spawnCorpse(death);
      const pins = this.npcArrows.get(death.eid);
      if (pins) {
        for (const pin of pins) {
          if (this.stuckArrows.length >= 100) break;
          this.stuckArrows.push({
            x: death.x + (Math.random() - 0.5) * 0.7,
            y: death.y + (Math.random() - 0.5) * 0.45,
            dir: pin.dir,
            until: now + STUCK_ARROW_MS,
          });
        }
        this.npcArrows.delete(death.eid);
      }
    }
    game.npcDeaths.length = 0;

    // Expire old shafts; drop bookkeeping for entities that left view.
    for (let i = this.stuckArrows.length - 1; i >= 0; i--) {
      if (this.stuckArrows[i]!.until <= now) this.stuckArrows.splice(i, 1);
    }
    if (this.npcArrows.size > 0) {
      for (const eid of this.npcArrows.keys()) {
        if (!game.entities.has(eid)) this.npcArrows.delete(eid);
      }
    }
    if (this.projSeen.size > 0) {
      for (const eid of this.projSeen) {
        if (eid < 0) {
          // Tracer pseudo-eid (-1 - seq): alive while its shot is.
          let live = false;
          for (const shot of game.ownShots) {
            if (-1 - shot.seq === eid) {
              live = true;
              break;
            }
          }
          if (!live) this.projSeen.delete(eid);
        } else if (!game.entities.has(eid)) {
          this.projSeen.delete(eid);
        }
      }
    }
  }

  /**
   * March down the flight line looking for the solid the server's shot
   * actually buried itself in — the last client sample lags the impact
   * by up to a tick-step, which is why arrows used to "fall short" at
   * the foot of every wall. On contact the arrow sticks INTO the face
   * at flight height: in front of a south face, poking from a side
   * edge, hidden behind a north one. Low props take the shaft low.
   */
  private probeWallStick(game: ClientGame, x: number, y: number, dir: number, now: number): boolean {
    const dx = Math.cos(dir);
    const dy = Math.sin(dir);
    // pointHitsSolid carries the shape law: full block for walls, a
    // centered circle for trees/rocks — the shaft lodges in the TRUNK,
    // never in the invisible box around it.
    for (let d = 0.06; d <= WALL_PROBE_TILES; d += 0.06) {
      const nx = x + dx * d;
      const ny = y + dy * d;
      if (!pointHitsSolid(game.world, nx, ny)) continue;
      if (this.stuckArrows.length >= 100) return true;
      // Stick just shy of the surface, head embedded in it.
      const sx = x + dx * (d - 0.03);
      const sy = y + dy * (d - 0.03);
      const tx = Math.floor(nx);
      const ty = Math.floor(ny);
      const tile = game.world.groundAt(tx, ty);
      const h = tile !== undefined && LOW_STICK_TILES.has(tile)
        ? 0.24 + Math.random() * 0.08
        : tile !== undefined && Renderer.ROCK_TILES.has(tile)
          ? 0.3 + Math.random() * 0.2
          : 0.46 + Math.random() * 0.24;
      // Face law: a mostly-southward shot buries in the hidden north
      // face and the mass occludes the shaft; every other approach
      // reads on a visible face (or the trunk's flank) and paints in
      // front of it.
      const fromNorth = dy > 0.35;
      const sortY = fromNorth ? ty - 0.06 : ty + 0.96;
      this.stuckArrows.push({ x: sx, y: sy, dir, until: now + STUCK_ARROW_MS, wall: { h, sortY } });
      // Impact chips in the surface's own material color.
      const base = tile !== undefined ? tileDef(tile).color : '#9aa2ac';
      const airY = sy - h / this.camera.yScale;
      this.particles.burst(sx, airY, 6, [base, shade(base, 22), shade(base, -16)], {
        speed: 1.6,
        life: 0.32,
        size: 0.06,
        gravity: 5,
        dir: dir + Math.PI,
        spread: 1.3,
        drag: 2.5,
      });
      return true;
    }
    return false;
  }

  /**
   * The defeated body goes limp: build an articulated ragdoll skeleton
   * in the victim's proportions and throw it along the killing blow.
   * Launch force scales with the final hit's damage — a chip kill
   * crumples where it stands, a crit finisher drags the body back
   * through the scene.
   */
  private spawnCorpse(death: {
    eid: number;
    defId: string;
    x: number;
    y: number;
    dir: number;
    kx: number;
    ky: number;
    crit: boolean;
    dmg: number;
    look?: Look;
    equip?: Partial<Record<EquipSlot, string>>;
    ench?: Partial<Record<EquipSlot, string>>;
  }): void {
    // Humanoid actors have no bestiary def — their look IS the body
    // (the def-less case bails inside the branch chain below).
    const def = npcDef(death.defId);
    // Slimes leave no body — the mass divides (the server spawns the
    // halves) or, for a half, simply bursts. The death particle burst
    // is the whole funeral.
    if (death.defId === 'slime' || death.defId === 'slime_small') return;
    let seed = 0;
    for (let i = 0; i < death.defId.length; i++) {
      seed = (seed * 31 + death.defId.charCodeAt(i)) | 0;
    }
    seed = (seed ^ (death.eid * 0x9e3779)) | 0;
    // The blow's direction; a kill with no remembered knock (DoT tick,
    // reaction burst) drops the body along its own facing.
    let kx = death.kx;
    let ky = death.ky;
    const kl = Math.hypot(kx, ky);
    if (kl < 0.01) {
      kx = Math.cos(death.dir);
      ky = Math.sin(death.dir);
    } else {
      kx /= kl;
      ky /= kl;
    }
    // Severity: the killing hit's damage against a heavy-blow yardstick.
    const sev = Math.min(1, death.dmg / 12 + (death.crit ? 0.25 : 0));
    // ~0.5 tiles of travel for a chip kill, ~3 for a crit finisher —
    // knocked INTO the scene, not launched across it.
    const speed = 1.1 + 3.2 * sev;
    // The billboard-plane launch direction: a blow straight up or down
    // the screen still topples the body to a deterministic side.
    let sx = kx;
    if (Math.abs(sx) < 0.3) sx += (seed & 1) === 0 ? 0.45 : -0.45;
    const sy = ky * this.camera.yScale;
    const humanoid =
      death.defId.startsWith('goblin') ||
      death.defId.startsWith('skeleton') ||
      death.defId.startsWith('kobold') ||
      death.defId.startsWith('brigand') ||
      death.defId === 'troll';
    let rag: Ragdoll;
    let look: (typeof this.corpses)[number]['look'];
    if (death.look) {
      // A named humanoid actor falls on the player rig's proportions,
      // wearing its own skin, hair, and tunic colors — and every piece
      // of gear it died in. Defeat never strips the body.
      rag = buildHumanoidRagdoll(1, seed);
      rag.launch(sx, sy, sev, HUMANOID_UPPER, HUMANOID_FEET);
      const eq = death.equip;
      const gear =
        eq && (eq.head || eq.body || eq.legs || eq.boots || eq.gloves || eq.weapon || eq.offhand)
          ? {
              head: eq.head,
              body: eq.body,
              legs: eq.legs,
              boots: eq.boots,
              gloves: eq.gloves,
              weapon: eq.weapon,
              offhand: eq.offhand,
              weaponEnch: death.ench?.weapon,
              offhandEnch: death.ench?.offhand,
            }
          : undefined;
      look = {
        kind: 'humanoid',
        h: {
          bodyColor: CLOTH_COLORS[death.look.shirt] ?? '#8a7a5c',
          skinColor: SKIN_TONES[death.look.skin] ?? '#e8b98a',
          hairColor: HAIR_COLORS[death.look.hairColor] ?? '#4a3221',
          size: 1,
          gear,
        },
      };
    } else if (!def) {
      return; // narrows: the branches below all read the bestiary def
    } else if (humanoid) {
      const size =
        Renderer.KOBOLD_SIZE[death.defId] ??
        Renderer.SKELETON_SIZE[death.defId] ??
        Renderer.BRIGAND_SIZE[death.defId] ??
        (death.defId === 'troll' ? 1.4 : 0.85);
      const bodyColor = def.color ?? '#999';
      const corpseKob = death.defId.startsWith('kobold')
        ? koboldLook(death.defId)
        : undefined;
      rag = buildHumanoidRagdoll(size, seed);
      rag.launch(sx, sy, sev, HUMANOID_UPPER, HUMANOID_FEET);
      look = {
        kind: 'humanoid',
        h: {
          bodyColor,
          skinColor:
            death.defId === 'troll'
              ? '#6a7d5c'
              : (corpseKob?.hide ?? Renderer.BRIGAND_SKIN[death.defId] ?? '#7aa74a'),
          hairColor: shade(bodyColor, -24),
          size,
          // Skeleton corpses keep the bone dialect — crown and all;
          // kobold corpses keep the scale dialect — horns and tail.
          skel: death.defId.startsWith('skeleton')
            ? skeletonLook(death.defId)
            : undefined,
          kob: corpseKob,
        },
      };
    } else {
      const radius = def.radius ?? 0.3;
      const spec = beastSpec(death.defId, radius, def.speed ?? 2);
      rag = buildBeastRagdoll(spec, radius, seed);
      // Feet are every second chain point after the three spine points.
      const feet: number[] = [];
      for (let i = 4; i < rag.pts.length; i += 2) feet.push(i);
      rag.launch(sx, sy, sev, BEAST_UPPER, feet);
      look = {
        kind: 'beast',
        b: { spec, radius, color: def.color ?? '#999', defId: death.defId, seed },
      };
    }
    this.corpses.push({
      rag,
      look,
      x: death.x,
      y: death.y,
      vx: kx * speed,
      vy: ky * speed,
      thudded: false,
      settledAt: null,
    });
    if (this.corpses.length > CORPSE_MAX) this.corpses.shift();
  }

  /**
   * Ragdoll physics: the anchor slides the world along the blow while
   * the skeleton flops in the billboard plane. Anchor deceleration is
   * fed to the limbs as inherited momentum — the trunk pitches over its
   * friction-pinned feet instead of spinning like a thrown prop.
   */
  private tickCorpses(game: ClientGame, now: number): void {
    const dt = this.frameDt;
    const impacts: RagImpact[] = [];
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i]!;
      if (c.settledAt !== null) {
        if (now - c.settledAt > CORPSE_LIE_MS + CORPSE_FADE_MS) this.corpses.splice(i, 1);
        continue;
      }
      if (dt <= 0) continue;
      const ovx = c.vx;
      const ovy = c.vy;
      // Walls stop the slide dead — a thump against the mass, no bounce.
      // Shape-aware: a body skids past a tree's tile corner and only
      // stops on the actual trunk.
      const nx = c.x + c.vx * dt;
      const ny = c.y + c.vy * dt;
      if (pointHitsSolid(game.world, nx, c.y)) c.vx *= -0.12;
      else c.x = nx;
      if (pointHitsSolid(game.world, c.x, ny)) c.vy *= -0.12;
      else c.y = ny;
      // Drag rises as more of the body lies on the ground.
      const damp = Math.max(0, 1 - (3 + 9 * c.rag.groundedFrac()) * dt);
      c.vx *= damp;
      c.vy *= damp;
      impacts.length = 0;
      // Only screen-x deceleration feeds the limbs as inherited
      // momentum: world-y is DEPTH at this camera, and folding its
      // decel into the billboard plane read as phantom lift.
      c.rag.step(dt, c.vx - ovx, 0, impacts);
      // Keep the anchor under the sprawl: fold the trunk's local drift
      // back into the world anchor so sorting, shadow, terrain lift and
      // wall stops all track where the body actually lies.
      const t0 = c.rag.pts[0]!;
      const t1 = c.rag.pts[1]!;
      const fold = ((t0.x + t1.x) / 2) * Math.min(1, dt * 4);
      if (fold !== 0) {
        c.x += fold;
        for (const p of c.rag.pts) p.x -= fold;
      }
      for (const imp of impacts) {
        // Touchdown dust where the mass actually lands.
        this.particles.burst(c.x + imp.x, c.y + 0.02, imp.heavy ? 7 : 3, ['#a89880', '#bcae94'], {
          speed: imp.heavy ? 1.5 : 1,
          life: 0.35,
          size: 0.07,
          up: true,
          drag: 3.5,
        });
        if (imp.heavy && !c.thudded) {
          c.thudded = true;
          this.onCorpseThud?.(imp.speed > 4, c.x + imp.x, c.y);
        }
      }
      if (c.rag.settled) c.settledAt = now;
    }
  }

  /**
   * The limp body itself, painted in the live rig's dialect. The item
   * carries `body` bounds so the SAME outline pass that rings living
   * entities rings the corpse — death never breaks the silhouette. The
   * fade rides DrawItem.alpha (outside the outline pass) so the ring
   * dissolves with the body, and the shadow is the live entities' own
   * castBody pool, sun/lamp lobes and all.
   */
  private corpseItem(c: (typeof this.corpses)[number], now: number): DrawItem {
    const scale = this.camera.scale;
    const p = this.liftedWTS(c.x, c.y);
    const b = c.rag.bounds();
    const lieAge = c.settledAt === null ? 0 : now - c.settledAt;
    const alpha = Math.max(0, Math.min(1, 1 - (lieAge - CORPSE_LIE_MS) / CORPSE_FADE_MS));
    // The bounds come from the skeleton POINTS, but the painters reach
    // well past them (body mass overhangs the spine ends, head blocks,
    // horns, beaks). A margin smaller than that overhang clips the
    // sprite flat against the scratch rect and the dilate rings the
    // straight cut — the "cropped corpse with a border line" bug.
    const cattle = c.look.kind === 'beast' ? CATTLE_LOOKS[c.look.b.defId] : undefined;
    // Horned/antlered/clawed species overhang the skeleton further
    // still — grow the margin with every painter that grows reach.
    const reach =
      c.look.kind === 'beast'
        ? c.look.b.defId === 'stag'
          ? 0.55
          : c.look.b.defId === 'ram' || c.look.b.defId === 'giant_beetle'
            ? 0.3
            : c.look.b.defId === 'mudcrab'
              ? 0.35
              : c.look.b.defId === 'dire_wolf' || c.look.b.defId === 'worg'
                ? 0.25
                : 0
        : 0;
    // A geared humanoid reaches further still: a staff runs ~0.75 t
    // past the fist, a tall helm past the crown — grow the scratch
    // rect or the outline pass rings the clipped cut.
    const gear = c.look.kind === 'humanoid' ? c.look.h.gear : undefined;
    const margin =
      (c.look.kind === 'beast'
        ? 0.35 + c.look.b.spec.bodyLen * 0.6 + reach + (cattle ? cattle.hornLen * 1.5 + 0.2 : 0)
        : gear?.weapon || gear?.offhand
          ? 0.95
          : gear
            ? 0.6
            : 0.25) * scale;
    return {
      sortY: c.y + 0.02,
      elevated: this.renderLift(c.x, c.y) !== 0,
      alpha: alpha < 1 ? alpha : undefined,
      // Body-sprite cache: a settled corpse is the stillest body in
      // the game — one blit for its whole 8s lie. Dynamic while the
      // ragdoll still tumbles and through the wisp fade (the fade
      // alpha itself rides item.alpha, outside the cache).
      olKey: `c${this.olObjId(c)}`,
      olSig: `${c.x.toFixed(3)}|${c.y.toFixed(3)}`,
      olDyn: c.settledAt === null || alpha < 1,
      baseX: c.x,
      baseY: c.y,
      body: {
        x: p.x + b.minX * scale - margin,
        y: p.y + b.minY * scale - margin,
        w: (b.maxX - b.minX) * scale + margin * 2,
        h: (b.maxY - b.minY) * scale + margin * 2,
      },
      drawShadow: () => {
        // The prepass shadow layer can't fade per-item — the pool
        // simply lifts when the wisps start (masked by the body fade).
        if (alpha < 1) return;
        const airK = 1 / (1 + Math.max(0, -b.maxY) * 0.9);
        const cx = p.x + ((b.minX + b.maxX) / 2) * scale;
        const spread = Math.max(0.35, (b.maxX - b.minX) * 0.5) * scale;
        this.castBody(cx, p.y, spread * airK);
      },
      draw: () => {
        if (alpha <= 0) return;
        // Soul wisps drift up off the body as it fades.
        if (lieAge > CORPSE_LIE_MS && Math.random() < this.frameDt * 9) {
          this.particles.burst(c.x + (Math.random() - 0.5) * 0.3, c.y - 0.1, 1, ['#efe3ff', '#c8c2d8'], {
            speed: 0.5,
            life: 0.8,
            size: 0.07,
            gravity: -1.4,
          });
        }
        // Resolve the ctx at DRAW time: the outline pass swaps this.ctx
        // for its scratch canvas while the body paints — a captured ctx
        // would paint past the ring straight onto the frame (the
        // outline-less corpse bug).
        const frame = { ax: p.x, ay: p.y, s: scale };
        if (c.look.kind === 'humanoid') drawHumanoidRagdoll(this.ctx, c.rag, frame, c.look.h, now);
        else drawBeastRagdoll(this.ctx, c.rag, frame, c.look.b);
      },
    };
  }

  /** One arrow standing where it landed, angled with its flight line. */
  private stuckArrowItem(
    a: { x: number; y: number; dir: number; until: number; wall?: { h: number; sortY: number } },
    now: number,
  ): DrawItem {
    const ctx = this.ctx;
    const scale = this.camera.scale;
    const p = this.camera.worldToScreen(a.x, a.y, this.w, this.h);
    p.y -= this.renderLift(a.x, a.y) * scale;
    if (a.wall) p.y -= a.wall.h * scale;
    const alpha = Math.min(1, (a.until - now) / 6000);
    return {
      sortY: a.wall?.sortY ?? a.y,
      draw: () => {
        ctx.globalAlpha = alpha;
        this.drawStuckArrow(ctx, p.x, p.y, a.dir, scale, a.wall ? 'wall' : 'ground');
        ctx.globalAlpha = 1;
      },
    };
  }

  /** A spent shot arcing out of the flight line: it carries forward,
   *  drops from chest height, and pitches nose-down into the landing. */
  private fallingShaftItem(f: { x: number; y: number; dir: number; born: number }, now: number): DrawItem {
    const ctx = this.ctx;
    const scale = this.camera.scale;
    const t = Math.min(1, (now - f.born) / FALLING_SHAFT_MS);
    const adv = FALLING_SHAFT_ADVANCE * (1 - (1 - t) * (1 - t));
    const wx = f.x + Math.cos(f.dir) * adv;
    const wy = f.y + Math.sin(f.dir) * adv;
    const height = PROJ_AIR * (1 - t * t);
    const p = this.camera.worldToScreen(wx, wy, this.w, this.h);
    p.y -= this.renderLift(wx, wy) * scale;
    const groundY = p.y;
    p.y -= height * scale;
    return {
      sortY: wy + 0.35,
      draw: () => {
        // Screen flight line, pitched toward screen-down as it falls.
        const wfx = Math.cos(f.dir);
        const wfy = Math.sin(f.dir) * this.camera.yScale;
        const a0 = Math.atan2(wfy, wfx);
        const droop = Math.atan2(Math.sin(Math.PI / 2 - a0), Math.cos(Math.PI / 2 - a0));
        const a = a0 + droop * t * t * 0.85;
        const fx = Math.cos(a);
        const fy = Math.sin(a);
        // The racing ground tick converges onto the landing shadow.
        ctx.fillStyle = 'rgba(20, 16, 28, 0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, groundY, scale * (0.16 - 0.05 * t), scale * (0.06 - 0.015 * t), 0, 0, Math.PI * 2);
        ctx.fill();
        const len = scale * 0.44;
        ctx.strokeStyle = '#c4b590';
        ctx.lineWidth = Math.max(2, scale * 0.05);
        ctx.beginPath();
        ctx.moveTo(p.x - fx * len * 0.5, p.y - fy * len * 0.5);
        ctx.lineTo(p.x + fx * len * 0.4, p.y + fy * len * 0.4);
        ctx.stroke();
        ctx.strokeStyle = '#d95763';
        ctx.lineWidth = Math.max(1.5, scale * 0.04);
        for (const sv of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(p.x - fx * len * 0.34, p.y - fy * len * 0.34);
          ctx.lineTo(
            p.x - fx * len * 0.52 - fy * sv * scale * 0.07,
            p.y - fy * len * 0.52 + fx * sv * scale * 0.07,
          );
          ctx.stroke();
        }
        ctx.fillStyle = '#9aa2ac';
        ctx.beginPath();
        ctx.moveTo(p.x + fx * len * 0.58, p.y + fy * len * 0.58);
        ctx.lineTo(p.x + fx * len * 0.3 - fy * scale * 0.06, p.y + fy * len * 0.3 + fx * scale * 0.06);
        ctx.lineTo(p.x + fx * len * 0.3 + fy * scale * 0.06, p.y + fy * len * 0.3 - fx * scale * 0.06);
        ctx.closePath();
        ctx.fill();
      },
    };
  }

  /** The pincushion overlay: arrows riding a living NPC's body. */
  private npcArrowsItem(
    pins: Array<{ dir: number; hy: number; ox: number }>,
    s: { x: number; y: number },
  ): DrawItem {
    const ctx = this.ctx;
    const scale = this.camera.scale;
    return {
      sortY: s.y + 0.02,
      draw: () => {
        const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
        p.y -= this.renderLift(s.x, s.y) * scale;
        for (const pin of pins) {
          // Entry point sits on the side the arrow came FROM, along
          // the screen projection of its true flight line.
          const wfx = Math.cos(pin.dir);
          const wfy = Math.sin(pin.dir) * this.camera.yScale;
          const il = Math.hypot(wfx, wfy) || 1;
          const bx = p.x - (wfx / il) * pin.ox * scale;
          const by = p.y - pin.hy * scale - (wfy / il) * pin.ox * scale;
          this.drawStuckArrow(ctx, bx, by, pin.dir, scale * 0.92, 'body');
        }
      },
    };
  }

  /**
   * Screen-space arrow-in-a-surface: buried head at (sx, sy), shaft
   * rising back against the flight line, red fletching at the tail.
   * `dir` is the WORLD flight angle — the tail leans back along its
   * SCREEN projection, so the stick angle references the actual shot.
   */
  private drawStuckArrow(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    dir: number,
    scale: number,
    mode: 'ground' | 'body' | 'wall' = 'ground',
  ): void {
    const wfx = Math.cos(dir);
    const wfy = Math.sin(dir) * this.camera.yScale;
    const il = Math.hypot(wfx, wfy) || 1;
    const ux = wfx / il;
    const uy = wfy / il;
    // The shaft leans back along where it came from. In dirt it pitches
    // UP out of the surface (the lodge of a falling shot); in a wall it
    // holds the flight line with a slight gravity sag at the tail.
    const back = (mode === 'ground' ? 0.2 : 0.28) * scale;
    const drop = mode === 'ground' ? -0.28 : mode === 'body' ? -0.08 : 0.06;
    const bx = -ux * back;
    const by = -uy * back + drop * scale;
    if (mode === 'ground') {
      // Dirt shadow pooling at the entry point.
      ctx.fillStyle = 'rgba(20, 16, 28, 0.22)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 0.02 * scale, scale * 0.11, scale * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#c4b590';
    ctx.lineWidth = Math.max(2, scale * 0.05);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + bx, sy + by);
    ctx.stroke();
    ctx.strokeStyle = '#d95763';
    ctx.lineWidth = Math.max(1.5, scale * 0.045);
    for (const sv of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + bx * 0.82, sy + by * 0.82);
      ctx.lineTo(sx + bx * 1.12 + sv * 0.05 * scale, sy + by * 1.12 + sv * 0.028 * scale);
      ctx.stroke();
    }
  }

  // ----------------------------------------------------- combat fx

  /**
   * Ambient status VFX riding an entity: embers for burn, drifting
   * frost for chill, spark jitter for shock, falling drips for bleed.
   * Spawn rates are frame-time scaled so effect density is fps-stable.
   */
  private statusAmbience(x: number, y: number, bits: number): void {
    // Stealth bits ride the same byte — only DoT/CC bits make weather.
    bits &= STATUS_AMBIENCE_MASK;
    if (bits === 0) return;
    const dt = this.frameDt;
    if (bits & STATUS_BIT.burn) {
      this.queueGlow(x, y - 0.3, 0.9, '255, 138, 60', 0.3);
      if (Math.random() < dt * 14) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.4, y - 0.2, 1, ['#ff8a3c', '#e8763c', '#ffd24a'], {
          speed: 0.7,
          life: 0.5,
          size: 0.08,
          gravity: -2.2,
        });
      }
    }
    if (bits & STATUS_BIT.chill) {
      this.queueGlow(x, y - 0.3, 0.8, '138, 196, 232', 0.22);
      if (Math.random() < dt * 8) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.5, y - 0.7, 1, ['#c8ecff', '#8ac4e8'], {
          speed: 0.25,
          life: 0.7,
          size: 0.07,
          gravity: 0.8,
        });
      }
    }
    if (bits & STATUS_BIT.shock) {
      this.queueGlow(x, y - 0.3, 0.9, '232, 224, 106', 0.35);
      if (Math.random() < dt * 22) {
        this.particles.burst(x, y - 0.4, 1, ['#e8e06a', '#fff8c8'], {
          speed: 2.6,
          life: 0.16,
          size: 0.06,
          gravity: 0,
        });
      }
    }
    if (bits & STATUS_BIT.bleed) {
      if (Math.random() < dt * 9) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.3, y - 0.35, 1, ['#c4372a', '#8e2015'], {
          speed: 0.3,
          life: 0.45,
          size: 0.07,
          gravity: 4.5,
        });
      }
    }
    if (bits & STATUS_BIT.venom) {
      // Sickly green blebs drifting UP — the poison working out of the wound.
      this.queueGlow(x, y - 0.3, 0.8, '160, 192, 80', 0.22);
      if (Math.random() < dt * 10) {
        this.particles.burst(x + (Math.random() - 0.5) * 0.35, y - 0.3, 1, ['#a0c050', '#6a8a2a', '#c8e04a'], {
          speed: 0.35,
          life: 0.6,
          size: 0.07,
          gravity: -1.2,
        });
      }
    }
  }

  /**
   * The tier-3 enchant aura: an energy corona that marks a walking
   * masterwork. The strongest worn enchant sets the school and the
   * color; lower tiers stay quiet here (their fx live on the item
   * itself). Same fps-stable rate-gating as statusAmbience, plus a
   * breathing glow that becomes a real scene light after dark.
   */
  private enchantAura(x: number, y: number, ench: Partial<Record<string, string>>): void {
    let best: { tier: number; element: string } | null = null;
    for (const id of Object.values(ench)) {
      const def = id ? enchantDef(id) : undefined;
      if (def && (!best || def.tier > best.tier)) best = { tier: def.tier, element: def.element };
    }
    if (!best || best.tier < 3) return;
    const tint = ELEMENT_TINTS[best.element] ?? ELEMENT_TINTS.arcane!;
    const t = performance.now() / 1000;
    const dt = this.frameDt;
    // The corona breathes — never a steady lamp, always a living charge.
    const breath = 0.5 + 0.5 * Math.sin(t * 2.1 + x * 3.7);
    this.queueGlow(x, y - 0.45, 1.0 + breath * 0.25, tint.glow, 0.2 + breath * 0.1);
    // Rising motes on a loose ring around the body — the supercharged read.
    if (Math.random() < dt * 7) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.32 + Math.random() * 0.2;
      this.particles.burst(x + Math.cos(a) * r, y - 0.15 + Math.sin(a) * r * 0.5, 1, [tint.core, tint.fleck], {
        speed: 0.12,
        life: 0.9,
        size: 0.06,
        gravity: -1.6,
        drag: 1.2,
      });
    }
    // The occasional tangential spark whipping around the corona.
    if (Math.random() < dt * 2.5) {
      const a = Math.random() * Math.PI * 2;
      this.particles.burst(x + Math.cos(a) * 0.42, y - 0.3 + Math.sin(a) * 0.2, 1, [tint.fleck], {
        speed: 1.6,
        dir: a + Math.PI / 2,
        spread: 0.3,
        life: 0.25,
        size: 0.05,
        gravity: 0,
      });
    }
  }

  /** Placed summons: totem, snare trap, straw decoy. */
  private summonItem(
    defId: string,
    s: { x: number; y: number; hpPct: number },
    now: number,
  ): DrawItem {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const p = this.camera.worldToScreen(s.x, s.y, this.w, this.h);
    p.y -= this.renderLift(s.x, s.y) * sc;
    return {
      sortY: s.y,
      drawShadow: () => {
        this.castContact(p.x, p.y + sc * 0.06, sc * 0.24, sc * 0.1);
      },
      draw: () => {
        if (defId === 'summon_heal_totem') {
          // A carved post crowned with a pulsing green gem.
          const pulse = 0.7 + 0.3 * Math.sin(now / 260);
          this.queueGlow(s.x, s.y - 0.5, 1.5, '122, 196, 122', 0.3 * pulse);
          ctx.fillStyle = '#5d452c';
          ctx.fillRect(p.x - sc * 0.09, p.y - sc * 0.72, sc * 0.18, sc * 0.72);
          ctx.fillStyle = '#6e5233';
          ctx.fillRect(p.x - sc * 0.14, p.y - sc * 0.5, sc * 0.28, sc * 0.1);
          ctx.fillStyle = '#7ac47a';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.82, sc * (0.13 + 0.02 * pulse), 6, now / 900);
          ctx.fill();
          ctx.fillStyle = '#c8f0c8';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.82, sc * 0.055, 4, now / 900);
          ctx.fill();
        } else if (defId === 'summon_snare_trap') {
          // Low and easy to miss — exactly what a trap should be.
          ctx.strokeStyle = 'rgba(160, 138, 74, 0.75)';
          ctx.lineWidth = Math.max(2, sc * 0.05);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - sc * 0.04, sc * 0.3, sc * 0.14, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#8a744a';
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.5;
            const tx = p.x + Math.cos(a) * sc * 0.26;
            const ty = p.y - sc * 0.04 + Math.sin(a) * sc * 0.12;
            ctx.beginPath();
            ctx.moveTo(tx - sc * 0.03, ty);
            ctx.lineTo(tx, ty - sc * 0.12);
            ctx.lineTo(tx + sc * 0.03, ty);
            ctx.closePath();
            ctx.fill();
          }
        } else if (defId === 'summon_decoy') {
          // The straw double, arms out, taking it like a champ.
          ctx.fillStyle = '#5d452c';
          ctx.fillRect(p.x - sc * 0.05, p.y - sc * 0.66, sc * 0.1, sc * 0.66);
          ctx.fillRect(p.x - sc * 0.32, p.y - sc * 0.52, sc * 0.64, sc * 0.08);
          ctx.fillStyle = '#c4a35a';
          ctx.beginPath();
          facetBlob(ctx, p.x, p.y - sc * 0.42, sc * 0.2, 7, 11);
          ctx.fill();
          ctx.fillStyle = '#d9bc78';
          ctx.beginPath();
          facetCircle(ctx, p.x, p.y - sc * 0.78, sc * 0.15, 6, 0.3);
          ctx.fill();
          if (s.hpPct < 255) this.drawMiniHp(p.x, p.y - sc * 1.05, sc * 0.66, s.hpPct);
        }
      },
    };
  }

  /** Ground perspective squash for combat-fx circles. */
  private static readonly FX_SQUASH = 0.62;

  /** Overlay lifetime per fx kind, ms (telegraph/field ride their fuse). */
  private fxLife(fx: { kind: string; ticks?: number }): number {
    switch (fx.kind) {
      case 'telegraph':
      case 'field':
        return (fx.ticks ?? 12) * TICK_MS;
      case 'arc':
        return 300;
      case 'bolt':
        return 340;
      case 'dash':
        return 380;
      case 'beam':
        return 480;
      case 'nova':
        return 680;
      case 'blast':
        return 780;
      case 'buff':
        return 750;
      case 'summon':
        return 500;
      default:
        return 380;
    }
  }

  /**
   * Jagged energy forks biting outward from a strike point — the
   * shared "after-zap" vocabulary. The caller sets stroke style and
   * width, opens ONE path, and strokes after; each fork is a boltPath
   * with its own kink seed, so feeding a re-kinking clock seed makes
   * the whole splash writhe frame to frame. `baseA` + `arc` aim the
   * splay (2π = full radial burst); the 0.85 vertical squeeze keeps
   * the splash reading at body height, not flat on the turf.
   */
  private fxForks(
    cx: number,
    cy: number,
    seed: number,
    n: number,
    lenPx: number,
    baseA: number,
    arc: number,
    jagPx: number,
  ): void {
    const ctx = this.ctx;
    const rand = srand(seed);
    for (let k = 0; k < n; k++) {
      const a = baseA - arc / 2 + (arc * (k + 0.5)) / n + (rand() - 0.5) * 0.35;
      const L = lenPx * (0.6 + rand() * 0.7);
      boltPath(ctx, cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L * 0.85, seed + k * 13, jagPx);
    }
  }

  /**
   * The ring silhouette pass novas and blasts expand with. Every
   * family is a three-layer read — dark pressure band under, identity
   * silhouette over, hot inner edge — and the rim SHEDS: sparks fly
   * off the expanding front so the shock feels like it's tearing
   * through the air, not sliding over it.
   */
  private fxRingLayer(
    px: number,
    py: number,
    rr: number,
    st: FxStyle,
    t: number,
    seed: number,
    wx?: number,
    wy?: number,
    wr?: number,
  ): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const squash = Renderer.FX_SQUASH;
    const rot = seed % 7;
    ctx.lineJoin = 'miter';
    // Rim shedding: a couple of streak sparks per frame fly off the
    // front while it's young (framerate-independent via frameDt gate).
    if (wx !== undefined && wy !== undefined && wr !== undefined && t < 0.7 && Math.random() < this.frameDt * 26 * (1 - t)) {
      const a = Math.random() * Math.PI * 2;
      const rw = wr * Math.sqrt(Math.max(0.05, t));
      this.particles.burst(wx + Math.cos(a) * rw, wy + Math.sin(a) * rw * squash, 1, [st.spark, st.core], {
        speed: 1.8, life: 0.35, size: 0.06, gravity: 0.6, dir: a, spread: 0.5, shape: 'streak', drag: 2.2,
      });
    }
    if (st.ring === 'halo') {
      // The dignified double halo (royal, radiant, oath) — plus a
      // corona of short ticks standing off the outer band.
      ctx.strokeStyle = shade(st.mid, -30);
      ctx.lineWidth = Math.max(3.5, sc * 0.16 * (1 - t) + 1.5);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.94, rr * 0.94 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.12 * (1 - t) + 1);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.12, rr * 1.12 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = st.core;
      for (let i = 0; i < 12; i++) {
        const a = rot + (i / 12) * Math.PI * 2;
        const g = sc * 0.03;
        ctx.fillRect(px + Math.cos(a) * rr * 1.22 - g / 2, py + Math.sin(a) * rr * 1.22 * squash - g * 1.5, g, g * 3);
      }
      return;
    }
    if (st.ring === 'runes') {
      // A conjured circle: dark band, bright band, orbiting glyphs
      // with connector ticks — a spell diagram racing outward.
      ctx.strokeStyle = shade(st.mid, -32);
      ctx.lineWidth = Math.max(3, sc * 0.12 * (1 - t) + 1.5);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2, sc * 0.08 * (1 - t) + 1);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      const g = sc * 0.09 * (1 - t * 0.5);
      for (let i = 0; i < 6; i++) {
        const a = rot + (i / 6) * Math.PI * 2 + t * 1.6;
        const gx = px + Math.cos(a) * rr;
        const gy = py + Math.sin(a) * rr * squash;
        ctx.fillStyle = i % 2 === 0 ? st.core : st.spark;
        ctx.fillRect(gx - g / 2, gy - g, g, g * 2);
        ctx.fillRect(gx - g, gy - g * 0.25, g * 2, g * 0.5);
      }
      return;
    }
    // Jagged families: teeth (saw ring), petals (fat lobes), shards
    // (violent spikes), frost (hex crystal w/ spur ticks).
    const spec =
      st.ring === 'teeth'
        ? { points: 22, jag: 0.14 }
        : st.ring === 'petals'
          ? { points: 12, jag: 0.26 }
          : st.ring === 'shards'
            ? { points: 9, jag: 0.45 }
            : { points: 6, jag: 0.5 }; // frost
    // Pressure band under the silhouette.
    ctx.strokeStyle = shade(st.mid, -34);
    ctx.lineWidth = Math.max(3.5, sc * 0.15 * (1 - t) + 1.5);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rr * 0.97, squash, spec.points, spec.jag, rot, seed);
    ctx.stroke();
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.5, sc * 0.11 * (1 - t) + 1);
    ctx.beginPath();
    jaggedRingPath(ctx, px, py, rr, squash, spec.points, spec.jag, rot, seed);
    ctx.stroke();
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1, sc * 0.035);
    ctx.beginPath();
    ctx.ellipse(px, py, rr * 0.82, rr * 0.82 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (st.ring === 'frost') {
      // Crystal spurs standing proud of the hex rim.
      ctx.fillStyle = st.core;
      for (let i = 0; i < 6; i++) {
        const a = rot + (i / 6) * Math.PI * 2 + 0.5;
        const bx = px + Math.cos(a) * rr * 1.05;
        const by = py + Math.sin(a) * rr * 1.05 * squash;
        const len = sc * 0.14 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * len, by + Math.sin(a) * len * squash);
        ctx.lineTo(bx - Math.sin(a) * len * 0.3, by + Math.cos(a) * len * 0.3);
        ctx.lineTo(bx + Math.sin(a) * len * 0.3, by - Math.cos(a) * len * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * Throw a style's debris family from a detonation point. Matter
   * behaves like its material: embers climb and strobe, rock and bone
   * TUMBLE under gravity, sparks streak, leaves flutter down, shadow
   * curls upward. The material read is half the identity.
   */
  private fxDebris(x: number, y: number, st: FxStyle, count: number): void {
    const colors = [st.mid, st.spark, st.core];
    switch (st.debris) {
      case 'ember':
        this.particles.burst(x, y - 0.2, count, colors, { speed: 3.2, life: 0.7, size: 0.1, gravity: -1.6, up: true, flicker: 0.8, drag: 0.8 });
        this.particles.burst(x, y - 0.2, Math.ceil(count / 3), ['#3a3442', st.deep], { speed: 1.0, life: 1.0, size: 0.13, gravity: -1.0, drag: 1.4, grow: 0.25 });
        break;
      case 'rock':
        this.particles.burst(x, y - 0.2, count, [st.deep, st.mid, '#6a6375'], { speed: 3.6, life: 0.6, size: 0.13, gravity: 8, up: true, shape: 'shard', spin: 9 });
        this.particles.burst(x, y - 0.1, Math.ceil(count / 2), ['#4a4252', '#3a3442'], { speed: 1.4, life: 0.9, size: 0.11, gravity: 0.5, drag: 1.8, grow: 0.3, ground: true });
        break;
      case 'ice':
        this.particles.burst(x, y - 0.2, count, colors, { speed: 3.0, life: 0.55, size: 0.1, gravity: 6, up: true, shape: 'shard', spin: 11 });
        this.particles.burst(x, y - 0.3, Math.ceil(count / 3), ['#ffffff', st.core], { speed: 1.2, life: 0.5, size: 0.05, gravity: 2, flicker: 0.5 });
        break;
      case 'leaf':
        this.particles.burst(x, y - 0.3, count, colors, { speed: 2.4, life: 1.0, size: 0.11, gravity: 1.2, drag: 1.8, up: true, shape: 'shard', spin: 5 });
        break;
      case 'bone':
        this.particles.burst(x, y - 0.2, count, colors, { speed: 3.4, life: 0.6, size: 0.12, gravity: 7, up: true, shape: 'shard', spin: 8 });
        break;
      case 'star':
        this.particles.burst(x, y - 0.35, count, colors, { speed: 2.6, life: 0.7, size: 0.09, gravity: 0, drag: 2.4, flicker: 0.6 });
        this.particles.burst(x, y - 0.35, Math.ceil(count / 3), ['#ffffff'], { speed: 3.4, life: 0.3, size: 0.06, gravity: 0, shape: 'streak', drag: 1.5 });
        break;
      case 'shadow':
        this.particles.burst(x, y - 0.3, count, [st.deep, st.mid, st.spark], { speed: 1.8, life: 0.9, size: 0.13, gravity: -0.8, drag: 1.4, grow: 0.18 });
        break;
      case 'blood':
        this.particles.burst(x, y - 0.25, count, [st.mid, st.deep], { speed: 2.8, life: 0.5, size: 0.1, gravity: 9, up: true });
        this.particles.burst(x, y - 0.25, Math.ceil(count / 2), [st.mid], { speed: 3.4, life: 0.35, size: 0.06, gravity: 10, up: true, shape: 'streak' });
        break;
      default:
        this.particles.burst(x, y - 0.25, count, colors, { speed: 3.6, life: 0.4, size: 0.08, gravity: 0.5, shape: 'streak' });
        break;
    }
  }

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
  private fxMotifGround(
    wxa: number,
    wya: number,
    px: number,
    py: number,
    rPx: number,
    st: FxStyle,
    t: number,
    seed: number,
    now: number,
  ): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const squash = Renderer.FX_SQUASH;
    const rand = srand(seed ^ 0x5f3);
    const fade = 1 - t;
    ctx.save();
    switch (st.motif) {
      case 'pillar': {
        // The eruption's foot: a pool of light spreads under the
        // column, its rim flickering with the fire above it.
        const h01 = Math.min(1, t / 0.25);
        ctx.globalAlpha = fade * 0.3;
        ctx.fillStyle = st.mid;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.55 * h01, rPx * 0.55 * h01 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.5;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.26 * h01, rPx * 0.26 * h01 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * (0.35 + 0.2 * Math.sin(now / 120 + seed));
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.04);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.62 * h01, rPx * 0.62 * h01 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (Math.random() < this.frameDt * 20 * fade) {
          this.particles.burst(wxa, wya - (rPx / sc) * 1.2, 1, [st.spark, st.core], {
            speed: 1.2, life: 0.5, size: 0.07, gravity: -2.6, flicker: 0.8,
          });
        }
        this.queueGlow(wxa, wya - 0.5, 1.3, st.glow, 0.4 * fade);
        break;
      }
      case 'spikes': {
        // Root bites: the turf cracks where each spear stands. The
        // spears themselves rise in the volume pass.
        const n = 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + (seed % 5) * 0.7;
          const rr = rPx * (0.5 + rand() * 0.25);
          rand(); // the spear's height — the volume walk owns it
          const wK = sc * (0.08 + rand() * 0.05);
          const bx = px + Math.cos(a) * rr;
          const by = py + Math.sin(a) * rr * squash;
          ctx.globalAlpha = fade * 0.55;
          ctx.fillStyle = shade(st.deep, -10);
          ctx.beginPath();
          ctx.ellipse(bx, by + wK * 0.4, wK * 2.0, wK * 2.0 * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          // Stress crack running outward from the root.
          ctx.globalAlpha = fade * 0.4;
          ctx.strokeStyle = shade(st.deep, -18);
          ctx.lineWidth = Math.max(1, sc * 0.022);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a) * wK * 3.4, by + Math.sin(a) * wK * 3.4 * squash);
          ctx.stroke();
        }
        break;
      }
      case 'vortex': {
        // Spiral streaks wind INTO the center, rotating as they
        // drain, ringed by a faint outer gather-band.
        const spin = now / 340;
        ctx.lineCap = 'butt';
        ctx.globalAlpha = fade * 0.25;
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = Math.max(2, sc * 0.09);
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 1.02, rPx * 1.02 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 6; k++) {
          const a0 = (k / 6) * Math.PI * 2 + spin;
          ctx.globalAlpha = fade * (0.5 + 0.3 * (k % 2));
          ctx.strokeStyle = k % 3 === 0 ? st.core : st.mid;
          ctx.lineWidth = Math.max(1.5, sc * (0.05 - k * 0.004));
          ctx.beginPath();
          for (let s2 = 0; s2 <= 8; s2++) {
            const f = s2 / 8;
            const a = a0 + f * 2.2;
            const rr = rPx * (0.95 - f * 0.75);
            const x = px + Math.cos(a) * rr;
            const y = py + Math.sin(a) * rr * squash;
            if (s2 === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // Matter caught in the drain.
        if (Math.random() < this.frameDt * 18 * fade) {
          const a = Math.random() * Math.PI * 2;
          this.particles.burst(wxa + Math.cos(a) * (rPx / sc) * 0.9, wya + Math.sin(a) * (rPx / sc) * 0.55, 1, [st.spark, st.mid], {
            speed: 2.2, life: 0.45, size: 0.07, gravity: 0, dir: a + Math.PI * 0.72, spread: 0.3, shape: 'streak', drag: 1.2,
          });
        }
        // The eye: a dark center that breathes.
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = st.deep;
        const eye = rPx * 0.16 * (1 + 0.15 * Math.sin(now / 160));
        ctx.beginPath();
        ctx.ellipse(px, py, eye, eye * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'cage': {
        // The ward's bound circle, linking the bars at their feet.
        ctx.globalAlpha = fade * 0.5;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(1.5, sc * 0.045);
        ctx.setLineDash([sc * 0.14, sc * 0.1]);
        ctx.lineDashOffset = now / 90;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.92, rPx * 0.92 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'wisps': {
        // The flames themselves orbit in the volume pass; the ground
        // only breathes their haze.
        if (Math.random() < this.frameDt * 8 * fade) {
          this.particles.burst(wxa, wya - 0.5, 1, [st.mid, st.deep], {
            speed: 0.4, life: 0.8, size: 0.06, gravity: -1.2, drag: 1.2, flicker: 0.6,
          });
        }
        break;
      }
      case 'rays': {
        // Long light-blades wheel about the center — the sun's own
        // geometry, laid onto the ground plane.
        const spin = now / 2400 + (seed % 3);
        const reach = rPx * (1.15 + 0.1 * Math.sin(now / 500));
        for (let k = 0; k < 8; k++) {
          const a = spin + (k / 8) * Math.PI * 2;
          const wA = 0.07 + 0.03 * (k % 2);
          ctx.globalAlpha = fade * (k % 2 === 0 ? 0.55 : 0.3);
          ctx.fillStyle = k % 2 === 0 ? st.mid : st.core;
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a - wA) * rPx * 0.25, py + Math.sin(a - wA) * rPx * 0.25 * squash);
          ctx.lineTo(px + Math.cos(a) * reach, py + Math.sin(a) * reach * squash);
          ctx.lineTo(px + Math.cos(a + wA) * rPx * 0.25, py + Math.sin(a + wA) * rPx * 0.25 * squash);
          ctx.closePath();
          ctx.fill();
        }
        // The disc at the heart.
        ctx.globalAlpha = fade * 0.85;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.14, rPx * 0.14 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'tear': {
        // The rift stands in the volume pass; here, its spilled
        // un-light pools on the turf beneath the wound.
        const open = t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.22) : 1;
        if (open <= 0) break;
        ctx.globalAlpha = open * 0.3;
        ctx.fillStyle = st.deep;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * 0.4 * open, rPx * 0.4 * open * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() < this.frameDt * 14 * open) {
          this.particles.burst(wxa, wya - 0.7, 1, [st.spark, st.core], {
            speed: 0.9, life: 0.6, size: 0.06, gravity: -0.4, drag: 1.5, flicker: 0.5,
          });
        }
        this.queueGlow(wxa, wya - 0.6, 1.1, st.glow, 0.35 * open);
        break;
      }
      case 'wave': {
        // Crescent crests roll outward in succession, foam ticks
        // breaking off each leading edge.
        for (let k = 0; k < 3; k++) {
          const wt = t * 1.25 - k * 0.18;
          if (wt <= 0 || wt >= 1) continue;
          const rr = rPx * (0.25 + 0.75 * wt);
          const aw = 1.15 - wt * 0.3;
          const baseA = (seed % 6) + k * 2.1;
          ctx.globalAlpha = (1 - wt) * 0.85;
          ctx.strokeStyle = k % 2 === 0 ? st.mid : st.core;
          ctx.lineWidth = Math.max(2.5, sc * 0.1 * (1 - wt));
          ctx.beginPath();
          ctx.ellipse(px, py, rr, rr * squash, 0, baseA - aw, baseA + aw);
          ctx.stroke();
          // Foam: ticks off the crest.
          ctx.fillStyle = st.core;
          for (let f2 = 0; f2 < 4; f2++) {
            const a = baseA - aw + (f2 / 3) * aw * 2;
            const g = sc * 0.045;
            ctx.fillRect(px + Math.cos(a) * rr * 1.06 - g / 2, py + Math.sin(a) * rr * 1.06 * squash - g, g, g * 2);
          }
        }
        break;
      }
      case 'bloom': {
        // Petals unfurl from the heart, each on its own beat, tips
        // nodding once open.
        const n = 6;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + (seed % 4) * 0.6;
          const open = Math.max(0, Math.min(1, t * 2.4 - k * 0.12));
          if (open <= 0) continue;
          const nod = Math.sin(now / 380 + k) * 0.05;
          const len = rPx * (0.55 + 0.35 * open);
          const wP = rPx * 0.2 * open;
          const tipX = px + Math.cos(a + nod) * len;
          const tipY = py + Math.sin(a + nod) * len * squash - sc * 0.12 * open;
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, 16);
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a) * rPx * 0.1, py + Math.sin(a) * rPx * 0.1 * squash);
          ctx.lineTo(px + Math.cos(a) * len * 0.5 - Math.sin(a) * wP, py + (Math.sin(a) * len * 0.5 + Math.cos(a) * wP) * squash);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(px + Math.cos(a) * len * 0.5 + Math.sin(a) * wP, py + (Math.sin(a) * len * 0.5 - Math.cos(a) * wP) * squash);
          ctx.closePath();
          ctx.fill();
          // Vein down the petal.
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1, sc * 0.02);
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a) * rPx * 0.12, py + Math.sin(a) * rPx * 0.12 * squash);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
        }
        // The heart.
        ctx.globalAlpha = fade;
        ctx.fillStyle = st.core;
        ctx.beginPath();
        facetCircle(ctx, px, py, rPx * 0.1, 6, now / 1400);
        ctx.fill();
        break;
      }
      case 'crown': {
        // The circlet band + jewels ride the turf; the regal points
        // stand on it in the volume pass.
        const spin = now / 3600;
        const rr = rPx * 0.8;
        ctx.globalAlpha = fade * 0.4;
        ctx.strokeStyle = shade(st.mid, -26);
        ctx.lineWidth = Math.max(3.5, sc * 0.12);
        ctx.beginPath();
        ctx.ellipse(px, py, rr * 0.96, rr * 0.96 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.9;
        ctx.strokeStyle = st.mid;
        ctx.lineWidth = Math.max(2.5, sc * 0.08);
        ctx.beginPath();
        ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const aj = spin + (k / 5) * Math.PI * 2 + Math.PI / 5;
          ctx.fillStyle = k % 2 === 0 ? st.spark : st.core;
          const g = sc * 0.05;
          ctx.fillRect(px + Math.cos(aj) * rr - g / 2, py + Math.sin(aj) * rr * squash - g / 2, g, g);
        }
        break;
      }
      case 'echo': {
        // Resonance: three trailing rings chase the moment outward,
        // alternating tone, with radial tick bursts between.
        for (let k = 1; k <= 3; k++) {
          const et = t - k * 0.14;
          if (et <= 0) continue;
          const rr = rPx * Math.sqrt(Math.min(1, et * 1.3));
          ctx.globalAlpha = Math.max(0, 1 - et * 1.35) * (0.55 - k * 0.1);
          ctx.strokeStyle = k % 2 === 0 ? st.core : st.mid;
          ctx.lineWidth = Math.max(1.5, sc * (0.06 - k * 0.012));
          ctx.beginPath();
          ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Tick marks radiate on the main front.
        ctx.globalAlpha = fade * 0.8;
        ctx.fillStyle = st.spark;
        const rm = rPx * Math.sqrt(Math.min(1, t * 1.2));
        for (let k = 0; k < 8; k++) {
          const a = (seed % 5) + (k / 8) * Math.PI * 2;
          const g = sc * 0.035;
          ctx.fillRect(px + Math.cos(a) * rm * 1.08 - g / 2, py + Math.sin(a) * rm * 1.08 * squash - g * 1.4, g, g * 2.8);
        }
        break;
      }
      case 'quake': {
        // Fissure wedges tear outward with a hot molten seam early;
        // the upthrown slabs at their mouths stand in the volume pass.
        const reach = Math.min(1, t / 0.3);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + (seed % 7) * 0.4 + rand() * 0.3;
          const len = rPx * (0.8 + rand() * 0.4) * reach;
          rand(); // slab size — the volume walk owns it
          rand(); // slab tilt — the volume walk owns it
          const mx = px + Math.cos(a) * len;
          const my = py + Math.sin(a) * len * squash;
          const wQ = sc * 0.09 * (1 - t * 0.4);
          ctx.globalAlpha = fade * 0.85;
          ctx.fillStyle = '#241c28';
          ctx.beginPath();
          ctx.moveTo(px - Math.sin(a) * wQ, py + Math.cos(a) * wQ * squash);
          ctx.lineTo(mx, my);
          ctx.lineTo(px + Math.sin(a) * wQ, py - Math.cos(a) * wQ * squash);
          ctx.closePath();
          ctx.fill();
          if (t < 0.4) {
            ctx.globalAlpha = (1 - t / 0.4) * 0.8;
            ctx.strokeStyle = st.spark;
            ctx.lineWidth = Math.max(1, sc * 0.025);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
        break;
      }
      default:
        // rain and swarm live entirely in the volume pass.
        break;
    }
    ctx.restore();
  }

  /**
   * The signature layer, VOLUME HALF — every standing part of a motif
   * becomes its own y-sorted world item anchored where it touches the
   * ground: spears and cage bars wrap AROUND bodies, rain falls past
   * shoulders, wisps weave between fighters, the rift swallows what
   * walks behind it. This is what makes a spell feel cast IN the
   * world instead of printed on the screen.
   */
  private collectMotifVolumes(
    items: DrawItem[],
    wxa: number,
    wya: number,
    rW: number,
    st: FxStyle,
    t: number,
    seed: number,
    now: number,
  ): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const squash = Renderer.FX_SQUASH;
    const rand = srand(seed ^ 0x5f3);
    const fade = 1 - t;
    const rPx = rW * sc;
    switch (st.motif) {
      case 'pillar': {
        // The column of fire/light, standing at the heart.
        items.push({
          sortY: wya + 0.02,
          draw: () => {
            const p = this.liftedWTS(wxa, wya);
            const h = rPx * 1.7 * Math.min(1, t / 0.25);
            const settle = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
            ctx.save();
            for (let k = 0; k < 6; k++) {
              const f = k / 6;
              const wob = Math.sin(now / 90 + k * 2.1) * sc * 0.06 * f;
              const w = rPx * (0.5 - f * 0.34) * settle;
              const yk = p.y - h * f;
              ctx.globalAlpha = fade * (0.85 - f * 0.35);
              ctx.fillStyle = k === 0 ? st.core : k % 2 === 0 ? st.mid : shade(st.mid, -18);
              ctx.fillRect(p.x - w / 2 + wob, yk - h / 6 - 1, w, h / 6 + 2);
            }
            // The crown flame flickers off the top.
            ctx.globalAlpha = fade * 0.9;
            ctx.fillStyle = st.core;
            const fl = sc * (0.12 + 0.06 * Math.sin(now / 70 + seed));
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - h - fl * 2.2);
            ctx.lineTo(p.x + fl, p.y - h + 1);
            ctx.lineTo(p.x - fl, p.y - h + 1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          },
        });
        break;
      }
      case 'spikes': {
        // Faceted spears erupt on the seeded ring — each sorts at its
        // OWN root, so the ring genuinely surrounds whoever stands
        // inside it.
        const n = 8;
        const up = Math.min(1, t / 0.22);
        const sink = t > 0.68 ? (t - 0.68) / 0.32 : 0;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + (seed % 5) * 0.7;
          const rr = rW * (0.5 + rand() * 0.25);
          const hR = rand();
          const wR = rand();
          const hK = sc * (0.5 + hR * 0.45) * up * (1 - sink);
          if (hK < 1) continue;
          const ex = wxa + Math.cos(a) * rr;
          const ey = wya + Math.sin(a) * rr * squash;
          const wK = sc * (0.08 + wR * 0.05);
          const lit = k % 3 === 0;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              ctx.save();
              ctx.globalAlpha = fade * 0.95;
              // Shaded flank + lit flank: a faceted spear, not a triangle.
              ctx.fillStyle = shade(st.mid, -26);
              ctx.beginPath();
              ctx.moveTo(q.x, q.y - hK);
              ctx.lineTo(q.x - wK, q.y + wK * 0.5);
              ctx.lineTo(q.x, q.y + wK * 0.3);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = lit ? st.core : st.mid;
              ctx.beginPath();
              ctx.moveTo(q.x, q.y - hK);
              ctx.lineTo(q.x + wK, q.y + wK * 0.5);
              ctx.lineTo(q.x, q.y + wK * 0.3);
              ctx.closePath();
              ctx.fill();
              // The freshly-broken tip glints while the spear is young.
              if (t < 0.3) {
                ctx.globalAlpha = (1 - t / 0.3) * 0.9;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(q.x - wK * 0.22, q.y - hK - wK * 0.3, wK * 0.44, wK * 0.6);
              }
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'rain': {
        // Every drop is a world item falling to its OWN landing spot:
        // streaks drop past shoulders and pop on the turf by your feet.
        const n = 9;
        for (let k = 0; k < n; k++) {
          const oxW = (rand() * 2 - 1) * rW * 0.85;
          const oyW = (rand() * 2 - 1) * rW * 0.5 * squash;
          const spd = 1.6 + rand() * 0.8;
          const ex = wxa + oxW;
          const ey = wya + oyW;
          const drop = (t * spd + k * 0.13) % 1;
          const lit = k % 3 === 0;
          const kk = k;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              const h = rPx * 1.9;
              ctx.save();
              if (drop < 0.82) {
                const dy = -h * (1 - drop);
                const segLen = sc * 0.5;
                ctx.globalAlpha = fade * 0.9;
                ctx.strokeStyle = lit ? st.core : st.mid;
                ctx.lineWidth = Math.max(2, sc * 0.055);
                ctx.beginPath();
                ctx.moveTo(q.x, q.y + dy - segLen);
                ctx.lineTo(q.x, q.y + dy);
                ctx.stroke();
              } else {
                // Splatter + a flat ripple spreading where it struck:
                // three slivers kick up-and-out — real splash matter,
                // not a star stamp.
                const pt = (drop - 0.82) / 0.18;
                ctx.globalAlpha = fade * (1 - pt);
                ctx.fillStyle = st.spark;
                const tw = Math.max(1, sc * 0.022);
                for (let j = 0; j < 3; j++) {
                  const sa = -Math.PI / 2 + (j - 1) * 0.85 + (kk % 3) * 0.2;
                  const d0 = sc * (0.04 + pt * 0.16);
                  const tl = sc * (0.07 + 0.05 * ((kk + j) % 2)) * (1 - pt * 0.5);
                  ctx.save();
                  ctx.translate(q.x + Math.cos(sa) * d0, q.y + Math.sin(sa) * d0 * 0.7);
                  ctx.rotate(sa);
                  ctx.fillRect(0, -tw / 2, tl, tw);
                  ctx.restore();
                }
                ctx.globalAlpha = fade * (1 - pt) * 0.6;
                ctx.strokeStyle = st.mid;
                ctx.lineWidth = Math.max(1, sc * 0.025);
                const rp = sc * 0.05 + sc * 0.15 * pt;
                ctx.beginPath();
                ctx.ellipse(q.x, q.y, rp, rp * squash, 0, 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'cage': {
        // Bars rise on the rim and lock the circle — real depth now:
        // a bar south of a body paints over it, a bar north hides
        // behind it. The old painted "far bars dim" hack is retired.
        const n = 9;
        const up = Math.min(1, t / 0.2);
        const dropK = t > 0.75 ? (t - 0.75) / 0.25 : 0;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + (seed % 4) * 0.5 + now / 4200;
          const h = sc * (0.85 + (k % 3) * 0.12) * up * (1 - dropK);
          if (h < 1) continue;
          const ex = wxa + Math.cos(a) * rW * 0.92;
          const ey = wya + Math.sin(a) * rW * 0.92 * squash;
          const w = Math.max(2, sc * 0.05);
          const lit = k % 3 === 0;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              ctx.save();
              // Anchor foot: the bar bites the turf.
              ctx.globalAlpha = fade * 0.5;
              ctx.fillStyle = shade(st.deep, -8);
              ctx.beginPath();
              ctx.ellipse(q.x, q.y, w * 1.4, w * 1.4 * squash, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = fade * 0.92;
              ctx.fillStyle = lit ? st.core : st.mid;
              ctx.fillRect(q.x - w / 2, q.y - h, w, h);
              ctx.fillStyle = st.spark;
              ctx.fillRect(q.x - w, q.y - h - w, w * 2, w);
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'wisps': {
        // Soul-flames orbit at differing heights and speeds; each
        // sorts at its own ground point, weaving between bodies.
        const n = 5;
        for (let k = 0; k < n; k++) {
          const ph = rand() * Math.PI * 2;
          const speed = 1.2 + rand() * 0.9;
          const orbitR = rW * (0.45 + rand() * 0.4);
          const hover = 0.3 + rand() * 0.5;
          const s = sc * (0.07 + rand() * 0.04);
          const a = ph + (now / 1000) * speed;
          const ex = wxa + Math.cos(a) * orbitR;
          const ey = wya + Math.sin(a) * orbitR * squash;
          const lit = k % 2 === 0;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              const by = q.y - sc * hover - Math.sin(now / 300 + ph) * sc * 0.08;
              const gut = 0.6 + 0.4 * Math.sin(now / 140 + ph * 3);
              ctx.save();
              ctx.globalAlpha = fade * gut * 0.9;
              ctx.fillStyle = lit ? st.mid : st.spark;
              ctx.fillRect(q.x - s / 2, by - s, s, s * 1.5);
              ctx.fillStyle = st.core;
              ctx.fillRect(q.x - s * 0.28, by - s * 1.8, s * 0.56, s * 0.9);
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'tear': {
        // Reality slits open IN the scene: a body walking south of
        // the wound passes in front of it, one behind is swallowed.
        const open = t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.22) : 1;
        if (open <= 0) break;
        items.push({
          sortY: wya + 0.02,
          draw: () => {
            const q = this.liftedWTS(wxa, wya);
            const H = rPx * 1.35;
            const W = rPx * 0.34 * open;
            const segs = 7;
            ctx.save();
            ctx.globalAlpha = 0.95;
            // Rim first (pale), interior second (deep), core slit last.
            for (const [wMul, col] of [
              [1.25, st.core],
              [1.0, st.deep],
              [0.35, st.mid],
            ] as const) {
              ctx.fillStyle = col;
              ctx.beginPath();
              const r2 = srand(seed ^ 0x77);
              for (let s2 = 0; s2 <= segs; s2++) {
                const f = s2 / segs;
                const jag = (r2() - 0.5) * W * 0.8;
                const wHere = Math.sin(f * Math.PI) * W * wMul + jag * Math.sin(f * Math.PI);
                const y = q.y - sc * 0.35 - H / 2 + H * f;
                if (s2 === 0) ctx.moveTo(q.x, y);
                else ctx.lineTo(q.x + wHere / 2, y);
              }
              for (let s2 = segs; s2 >= 0; s2--) {
                const f = s2 / segs;
                const jag = (r2() - 0.5) * W * 0.8;
                const wHere = Math.sin(f * Math.PI) * W * wMul + jag * Math.sin(f * Math.PI);
                const y = q.y - sc * 0.35 - H / 2 + H * f;
                ctx.lineTo(q.x - wHere / 2, y);
              }
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          },
        });
        break;
      }
      case 'crown': {
        // The five regal points stand ON the wheeling band, each with
        // a ball tip, sorting around whoever wears the decree.
        const spin = now / 3600;
        const orbitR = rW * 0.8;
        for (let k = 0; k < 5; k++) {
          const a = spin + (k / 5) * Math.PI * 2;
          const ex = wxa + Math.cos(a) * orbitR;
          const ey = wya + Math.sin(a) * orbitR * squash;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              const h = sc * 0.28;
              const w = sc * 0.09;
              ctx.save();
              ctx.globalAlpha = fade * 0.95;
              ctx.fillStyle = st.mid;
              ctx.beginPath();
              ctx.moveTo(q.x, q.y - h);
              ctx.lineTo(q.x + w, q.y);
              ctx.lineTo(q.x - w, q.y);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = st.core;
              ctx.fillRect(q.x - w * 0.35, q.y - h - w * 0.7, w * 0.7, w * 0.7);
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'quake': {
        // Upthrown slabs tilt at the fissure mouths — standing rubble
        // that bodies step around.
        const reach = Math.min(1, t / 0.3);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + (seed % 7) * 0.4 + rand() * 0.3;
          const lenW = rW * (0.8 + rand() * 0.4) * reach;
          const sR = rand();
          const rotR = rand();
          const ex = wxa + Math.cos(a) * lenW;
          const ey = wya + Math.sin(a) * lenW * squash;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              const s = sc * (0.1 + sR * 0.07);
              ctx.save();
              ctx.globalAlpha = fade * 0.95;
              ctx.translate(q.x, q.y - s * 0.4);
              ctx.rotate((rotR - 0.5) * 0.7);
              ctx.fillStyle = shade(st.mid, -12);
              ctx.fillRect(-s * 0.7, -s * 0.45, s * 1.4, s * 0.9);
              ctx.fillStyle = shade(st.mid, 10);
              ctx.fillRect(-s * 0.7, -s * 0.45, s * 1.4, s * 0.3);
              ctx.restore();
            },
          });
        }
        break;
      }
      case 'swarm': {
        // Darting motes on seeded lissajous orbits — each sorts at
        // its own ground point, so the swarm truly surrounds a body.
        const n = 8;
        for (let k = 0; k < n; k++) {
          const pa = rand() * Math.PI * 2;
          const pb = rand() * Math.PI * 2;
          const fa = 1.6 + rand() * 1.2;
          const fb = 2.2 + rand() * 1.4;
          const shrink = 1 - t * 0.55;
          const ex = wxa + Math.sin((now / 1000) * fa + pa) * rW * 0.8 * shrink;
          const ey = wya + Math.sin((now / 1000) * fb + pb) * rW * 0.5 * shrink * squash;
          const tx2 = wxa + Math.sin(((now - 60) / 1000) * fa + pa) * rW * 0.8 * shrink;
          const ty2 = wya + Math.sin(((now - 60) / 1000) * fb + pb) * rW * 0.5 * shrink * squash;
          const lit = k % 3 === 0;
          items.push({
            sortY: ey + 0.01,
            draw: () => {
              const q = this.liftedWTS(ex, ey);
              const q2 = this.liftedWTS(tx2, ty2);
              const lift = sc * 0.35;
              ctx.save();
              // Tail: sampled a beat back along the same orbit.
              ctx.globalAlpha = fade * 0.55;
              ctx.strokeStyle = st.mid;
              ctx.lineWidth = Math.max(1.5, sc * 0.035);
              ctx.beginPath();
              ctx.moveTo(q2.x, q2.y - lift);
              ctx.lineTo(q.x, q.y - lift);
              ctx.stroke();
              ctx.globalAlpha = fade;
              ctx.fillStyle = lit ? st.core : st.spark;
              const g = sc * 0.055;
              ctx.translate(q.x, q.y - lift);
              ctx.rotate(Math.PI / 4);
              ctx.fillRect(-g / 2, -g / 2, g, g);
              ctx.restore();
            },
          });
        }
        break;
      }
      default:
        // vortex/rays/wave/bloom/echo lie flat — ground pass only.
        break;
    }
  }

  /**
   * One lingering ground decal — the mark the hit leaves behind, in
   * three acts. `t` is the whole 5s life; `active` is hot aftermath
   * (first ~40%: coals still glowing, frost still growing, blood still
   * spreading), then the mark settles into quiet residue and the turf
   * finally reclaims it.
   */
  private drawDecalItem(d: (typeof this.fxDecals)[number], now: number): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const t = (now - d.bornAt) / d.life;
    if (t >= 1) return;
    const p = this.camera.worldToScreen(d.x, d.y, this.w, this.h);
    p.y -= this.renderLift(d.x, d.y) * sc;
    const squash = Renderer.FX_SQUASH;
    const rand = srand(d.seed);
    const rPx = d.r * sc * 0.85;
    // Hold near-full strength through the settle, then release.
    const fade = t < 0.72 ? 1 - t * 0.25 : (1 - t) / 0.28 * 0.82;
    const active = Math.max(0, 1 - t / 0.4); // the hot window
    const grow = Math.min(1, (now - d.bornAt) / 420); // matter arriving
    ctx.save();
    switch (d.kind) {
      case 'scorch': {
        // Charred earth: a burnt field of blocks, coal seams that
        // pulse while hot and cool to black, wisps of late smoke.
        ctx.globalAlpha = 0.55 * fade;
        ctx.fillStyle = '#1c120e';
        for (let i = 0; i < 12; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rPx * (0.15 + rand() * 0.8) * grow;
          const s = sc * (0.09 + rand() * 0.15);
          ctx.fillRect(p.x + Math.cos(a) * rr - s / 2, p.y + Math.sin(a) * rr * squash - s / 2, s, s * 0.7);
        }
        // The scorch halo — burnt patches hugging the rim, never a
        // drawn circle: the fire licked outward unevenly.
        ctx.globalAlpha = 0.3 * fade;
        ctx.strokeStyle = '#241610';
        ctx.lineWidth = Math.max(2.5, sc * 0.09);
        for (let i = 0; i < 5; i++) {
          const a0 = rand() * Math.PI * 2;
          const span = 0.5 + rand() * 0.9;
          const rr = rPx * (0.88 + rand() * 0.16) * grow;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr, rr * squash, 0, a0, a0 + span);
          ctx.stroke();
        }
        // Live coals: each has its own pulse clock, dying as it cools.
        for (let i = 0; i < 6; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rPx * (0.15 + rand() * 0.55);
          const heat = Math.max(0, 1 - t / (0.35 + rand() * 0.35));
          if (heat <= 0) continue;
          const pulse = 0.55 + 0.45 * Math.sin(now / 190 + i * 2.3);
          ctx.globalAlpha = heat * pulse * 0.9;
          ctx.fillStyle = i % 3 === 0 ? '#ffd24a' : d.mid;
          const s = sc * (0.045 + rand() * 0.035);
          ctx.fillRect(p.x + Math.cos(a) * rr - s / 2, p.y + Math.sin(a) * rr * squash - s / 2, s, s);
        }
        // The ground itself remembers heat: a dying underglow.
        if (active > 0) {
          ctx.globalAlpha = active * 0.14;
          ctx.fillStyle = d.mid;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx * 0.7, rPx * 0.7 * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          if (Math.random() < this.frameDt * 2.2) {
            this.particles.burst(d.x + (Math.random() - 0.5) * d.r, d.y + (Math.random() - 0.5) * d.r * 0.6, 1, ['#4a4252', '#3a3442'], {
              speed: 0.25, life: 1.2, size: 0.1, gravity: -0.9, drag: 1.4, grow: 0.2,
            });
          }
        }
        break;
      }
      case 'rime': {
        // Hoarfrost claims the ground: pale floor patches, crystal
        // spars that GROW outward, glints that wink while it's fresh.
        ctx.globalAlpha = 0.2 * fade;
        ctx.fillStyle = d.mid;
        for (let i = 0; i < 4; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rPx * rand() * 0.5 * grow;
          const s = sc * (0.2 + rand() * 0.22);
          ctx.beginPath();
          ctx.ellipse(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * squash, s, s * squash, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.6 * fade;
        for (let i = 0; i < 13; i++) {
          const a = rand() * Math.PI * 2;
          const reach = 0.15 + rand() * 0.8;
          if (reach > grow * 1.1) continue; // spars grow center-out
          const rr = rPx * reach;
          const cx = p.x + Math.cos(a) * rr;
          const cy = p.y + Math.sin(a) * rr * squash;
          const len = sc * (0.1 + rand() * 0.22);
          const ang = rand() * Math.PI;
          ctx.fillStyle = i % 3 === 0 ? '#f0fbff' : d.mid;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillRect(-len / 2, -sc * 0.02, len, sc * 0.04);
          // Every spar carries a cross-tick — real crystal grammar.
          if (i % 2 === 0) ctx.fillRect(-sc * 0.02, -len * 0.3, sc * 0.04, len * 0.6);
          ctx.restore();
        }
        // Winking glints — deterministic twinkle windows.
        for (let i = 0; i < 5; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rPx * (0.2 + rand() * 0.6);
          const tw = Math.sin(now / 260 + i * 2.7 + d.seed % 5);
          if (tw < 0.86) continue;
          ctx.globalAlpha = (tw - 0.86) / 0.14 * fade;
          ctx.fillStyle = '#ffffff';
          const gx = p.x + Math.cos(a) * rr;
          const gy = p.y + Math.sin(a) * rr * squash;
          const g = sc * 0.05;
          ctx.fillRect(gx - g / 2, gy - g * 1.6, g, g * 3.2);
          ctx.fillRect(gx - g * 1.6, gy - g / 2, g * 3.2, g);
        }
        break;
      }
      case 'cracks': {
        // Fissured earth: dark cracks with a molten underglow that
        // cools shut, rubble thrown along the fissure ends.
        const glowHeat = Math.max(0, 1 - t / 0.45);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + rand() * 0.7;
          // Trace once, stroke twice: molten seam under, dark lip over.
          const seg: number[] = [p.x, p.y];
          let cx = p.x;
          let cy = p.y;
          for (let sgm = 0; sgm < 3; sgm++) {
            const rr = rPx * ((sgm + 1) / 3) * (0.7 + rand() * 0.4) * grow;
            cx = p.x + Math.cos(a + (rand() - 0.5) * 0.5) * rr;
            cy = p.y + Math.sin(a + (rand() - 0.5) * 0.5) * rr * squash;
            seg.push(cx, cy);
          }
          if (glowHeat > 0) {
            ctx.globalAlpha = glowHeat * (0.5 + 0.3 * Math.sin(now / 220 + i));
            ctx.strokeStyle = d.mid;
            ctx.lineWidth = Math.max(2.5, sc * 0.075);
            ctx.beginPath();
            ctx.moveTo(seg[0]!, seg[1]!);
            for (let k = 2; k < seg.length; k += 2) ctx.lineTo(seg[k]!, seg[k + 1]!);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.55 * fade;
          ctx.strokeStyle = '#241c14';
          ctx.lineWidth = Math.max(1.5, sc * 0.042);
          ctx.beginPath();
          ctx.moveTo(seg[0]!, seg[1]!);
          for (let k = 2; k < seg.length; k += 2) ctx.lineTo(seg[k]!, seg[k + 1]!);
          ctx.stroke();
          // Rubble at the fissure mouth.
          ctx.fillStyle = '#3a3040';
          const s = sc * (0.05 + rand() * 0.05);
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s * 0.8);
        }
        break;
      }
      case 'roots': {
        // Briar aftermath: hooks that keep reaching while fresh, tiny
        // leaves shivering at the tips.
        ctx.globalAlpha = 0.6 * fade;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + rand() * 0.5;
          const reach = 0.75 + rand() * 0.3;
          if (reach - 0.3 > grow) continue;
          const r0 = rPx * 0.35;
          const r1 = rPx * reach;
          const sway = Math.sin(now / 420 + i * 1.9) * sc * 0.02;
          ctx.strokeStyle = i % 3 === 0 ? d.mid : d.deep;
          ctx.lineWidth = Math.max(1.5, sc * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * squash);
          const tipA = a + 0.55;
          const tx2 = p.x + Math.cos(a) * r1;
          const ty2 = p.y + Math.sin(a) * r1 * squash;
          ctx.lineTo(tx2, ty2);
          ctx.lineTo(p.x + Math.cos(tipA) * r1 * 0.92 + sway, p.y + Math.sin(tipA) * r1 * 0.92 * squash - sc * 0.09);
          ctx.stroke();
          // A leaf rides most tips.
          if (i % 2 === 0) {
            ctx.fillStyle = d.mid;
            const s = sc * 0.05;
            ctx.fillRect(tx2 - s / 2 + sway, ty2 - sc * 0.1, s, s * 1.4);
          }
        }
        break;
      }
      case 'stain': {
        // The pool spreads while fresh, then dries from the rim in.
        const spread = Math.min(1, 0.5 + t * 1.6);
        ctx.fillStyle = d.deep;
        for (let i = 0; i < 7; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rPx * rand() * 0.62 * spread;
          const s = sc * (0.12 + rand() * 0.2) * (i === 0 ? 1.5 : 1);
          ctx.globalAlpha = (i === 0 ? 0.5 : 0.38) * fade;
          ctx.beginPath();
          ctx.ellipse(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * squash, s, s * squash, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // A wet gleam while fresh.
        if (active > 0) {
          ctx.globalAlpha = active * 0.3;
          ctx.fillStyle = d.mid;
          ctx.beginPath();
          ctx.ellipse(p.x - rPx * 0.1, p.y - rPx * 0.06, rPx * 0.28, rPx * 0.28 * squash, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'runes': {
        // A slow ceremonial orbit: glyphs blink awake in sequence
        // around a faint circle, then gutter out one by one.
        ctx.globalAlpha = 0.24 * fade;
        ctx.strokeStyle = d.mid;
        ctx.lineWidth = Math.max(1, sc * 0.025);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx * 0.8, rPx * 0.8 * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        const g = sc * 0.08;
        const drift = now / 2400;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + (d.seed % 3) + drift;
          const blink = 0.45 + 0.55 * Math.max(0, Math.sin(now / 340 - i * 0.9));
          ctx.globalAlpha = 0.7 * fade * blink;
          ctx.fillStyle = i % 3 === 0 ? '#ffffff' : d.mid;
          const gx = p.x + Math.cos(a) * rPx * 0.8;
          const gy = p.y + Math.sin(a) * rPx * 0.8 * squash;
          ctx.fillRect(gx - g / 2, gy - g, g, g * 2);
          if (i % 2 === 0) ctx.fillRect(gx - g, gy - g * 0.3, g * 2, g * 0.6);
        }
        break;
      }
      case 'glow': {
        // Residual light pooled on the grass, breathing as it drains,
        // shedding the occasional rising mote.
        const breath = 0.85 + 0.15 * Math.sin(now / 480 + d.seed % 7);
        ctx.globalAlpha = 0.16 * fade * breath;
        ctx.fillStyle = d.mid;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx * breath, rPx * breath * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.1 * fade;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rPx * 0.55, rPx * 0.55 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        if (active > 0 && Math.random() < this.frameDt * 2.5) {
          this.particles.burst(d.x + (Math.random() - 0.5) * d.r * 1.2, d.y + (Math.random() - 0.5) * d.r * 0.7, 1, [d.mid, '#ffffff'], {
            speed: 0.2, life: 1.0, size: 0.05, gravity: -0.7, flicker: 0.5,
          });
        }
        break;
      }
    }
    ctx.restore();
  }

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
   * front of their feet. That one fact seats the magic in the world.
   */
  private drawGroundFx(game: ClientGame): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const now = performance.now();
    const squash = Renderer.FX_SQUASH;

    for (let i = this.fxDecals.length - 1; i >= 0; i--) {
      const d = this.fxDecals[i]!;
      if (now - d.bornAt > d.life) {
        this.fxDecals.splice(i, 1);
        continue;
      }
      this.drawDecalItem(d, now);
    }

    for (const fx of game.fx) {
      const age = now - fx.bornAt;
      const life = this.fxLife(fx);
      if (age > life) continue;
      const t = age / life;
      const st = fxStyleFor(fx.id, fx.color);
      const p = this.camera.worldToScreen(fx.x, fx.y, this.w, this.h);
      p.y -= this.renderLift(fx.x, fx.y) * sc;
      const rPx = fx.radius * sc;
      const seed = (fx.bornAt * 31) & 0x7fffffff;

      switch (fx.kind) {
        case 'telegraph': {
          // The danger circle as an arming sigil, staged to be READ
          // across an arena: a stained floor, a rotating dashed rim,
          // a CONTRACTING fuse ring (the clock you feel), the sweep
          // wedge (the clock you read), and rune blocks that arm in
          // sequence as the hour runs out.
          const urgency = t > 0.72 ? 1 + (t - 0.72) * 2.2 : 1;
          ctx.save();
          // The stain: danger has a floor, not just an outline.
          ctx.globalAlpha = 0.12 + 0.05 * Math.sin(now / (t > 0.72 ? 70 : 160));
          ctx.fillStyle = st.deep;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx, rPx * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          // Outer rim: dark under-band + rotating identity dashes.
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = shade(st.deep, -14);
          ctx.lineWidth = Math.max(3.5, sc * 0.1);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx, rPx * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = Math.min(1, 0.7 * urgency);
          ctx.strokeStyle = t > 0.86 && Math.sin(now / 50) > 0 ? st.core : st.mid;
          ctx.lineWidth = Math.max(2.5, sc * 0.07);
          ctx.setLineDash([sc * 0.18, sc * 0.12]);
          ctx.lineDashOffset = -now / 30;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx, rPx * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // The contracting fuse ring: the noose tightens as time runs.
          const fuse = rPx * (1 - t);
          ctx.globalAlpha = 0.75;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1.5, sc * 0.035);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, fuse, fuse * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          // The filling wedge — a clock hand you can read at a glance.
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = st.mid;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          const sweep = -Math.PI / 2 + t * Math.PI * 2;
          ctx.ellipse(p.x, p.y, rPx * 0.92, rPx * 0.92 * squash, 0, -Math.PI / 2, sweep);
          ctx.closePath();
          ctx.fill();
          // Rune blocks arm in sequence — each lights as its hour passes.
          const g = sc * 0.1;
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + now / 640;
            const armed = t * 6.5 > k;
            ctx.globalAlpha = armed ? 0.95 : 0.4;
            ctx.fillStyle = armed ? st.core : st.mid;
            const gx = p.x + Math.cos(a) * rPx * 0.82;
            const gy = p.y + Math.sin(a) * rPx * 0.82 * squash;
            ctx.fillRect(gx - g / 2, gy - g, g, g * 2);
          }
          // Center sigil: a rotating hollow rune diamond over a solid
          // heart, with cardinal ticks pulling inward as the fuse
          // runs — an instrument arming, not a cartoon star.
          const pulse2 = 0.55 + 0.35 * Math.sin(now / (t > 0.72 ? 45 : 110));
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1, squash);
          ctx.rotate(now / 1400);
          const ds = sc * 0.16 * urgency;
          ctx.globalAlpha = pulse2;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(1.5, sc * 0.035);
          ctx.strokeRect(-ds, -ds, ds * 2, ds * 2);
          ctx.rotate(-now / 1400 + Math.PI / 4);
          ctx.fillStyle = st.mid;
          const hs = ds * 0.5;
          ctx.fillRect(-hs, -hs, hs * 2, hs * 2);
          ctx.restore();
          // Cardinal ticks close on the heart with the fuse.
          ctx.globalAlpha = pulse2 * 0.9;
          ctx.fillStyle = st.core;
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
            const d0 = sc * (0.42 - 0.16 * t);
            const g2 = sc * 0.028;
            ctx.save();
            ctx.translate(p.x + Math.cos(a) * d0, p.y + Math.sin(a) * d0 * squash);
            ctx.rotate(a);
            ctx.fillRect(-sc * 0.06, -g2 / 2, sc * 0.12, g2);
            ctx.restore();
          }
          ctx.restore();
          if (t > 0.72 && Math.random() < this.frameDt * 10) {
            this.particles.burst(fx.x + (Math.random() - 0.5) * fx.radius, fx.y + (Math.random() - 0.5) * fx.radius * 0.6, 1, [st.spark, st.core], { speed: 1.2, life: 0.3, size: 0.07, gravity: -2 });
          }
          break;
        }

        case 'field': {
          // The hazard floor: a breathing mottled zone, counter-
          // rotating rims, a heartbeat pulse, and the FLAT half of
          // its furniture. Standing pieces (spars, splinters, hooks,
          // slabs) y-sort in the volume pass — you wade THROUGH the
          // zone, never under a sticker of it.
          const edge = Math.min(1, age / 220, (life - age) / 420);
          const breath = 1 + 0.03 * Math.sin(now / 320);
          ctx.save();
          ctx.globalAlpha = 0.26 * edge;
          ctx.fillStyle = st.deep;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx * breath, rPx * breath * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.13 * edge;
          ctx.fillStyle = st.mid;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx * 0.7, rPx * 0.7 * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          // Mottling: seeded tone pools give the floor a material read.
          const randM = srand(seed ^ 0x91);
          ctx.globalAlpha = 0.15 * edge;
          ctx.fillStyle = shade(st.deep, -12);
          for (let k = 0; k < 7; k++) {
            const a = randM() * Math.PI * 2;
            const rr = Math.sqrt(randM()) * rPx * 0.78;
            const s = rPx * (0.1 + randM() * 0.13);
            ctx.beginPath();
            ctx.ellipse(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * squash, s, s * squash, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Counter-rotating rims say "this keeps going".
          ctx.globalAlpha = 0.75 * edge;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(2.5, sc * 0.06);
          ctx.setLineDash([sc * 0.22, sc * 0.16]);
          ctx.lineDashOffset = -now / 36;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx, rPx * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.45 * edge;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1.5, sc * 0.035);
          ctx.setLineDash([sc * 0.12, sc * 0.2]);
          ctx.lineDashOffset = now / 44;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx * 0.84, rPx * 0.84 * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // The heartbeat: a pulse front rolls the floor every ~0.8s
          // (it painted over bodies in the overlay era — never again).
          const pulse = (age % 800) / 800;
          ctx.globalAlpha = (1 - pulse) * 0.4 * edge;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(1.5, sc * 0.05);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rPx * Math.sqrt(pulse), rPx * Math.sqrt(pulse) * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          // FLAT furniture families (coals, shadow blots, sparks,
          // stars, blood pools). SHARED-SEED LAW: 3 rand() per piece,
          // the same walk the volume pass uses for standing families.
          const standing = st.debris === 'ice' || st.debris === 'bone' || st.debris === 'leaf' || st.debris === 'rock';
          if (!standing) {
            const rand = srand(seed);
            ctx.globalAlpha = 0.85 * edge;
            for (let k = 0; k < 9; k++) {
              const a = rand() * Math.PI * 2;
              const rr = rPx * (0.2 + rand() * 0.65);
              const sR = rand();
              const cx = p.x + Math.cos(a) * rr;
              const cy = p.y + Math.sin(a) * rr * squash;
              const jig = Math.sin(now / 260 + k * 1.7) * sc * 0.015;
              if (st.debris === 'ember') {
                // Coals that breathe with the fire's own clock.
                ctx.fillStyle = k % 2 === 0 ? st.mid : st.deep;
                ctx.globalAlpha = (0.5 + 0.4 * Math.sin(now / 300 + k * 2.1)) * edge;
                const s = sc * (0.08 + sR * 0.07);
                ctx.fillRect(cx - s / 2, cy - s / 2 + jig, s, s * 0.8);
              } else if (st.debris === 'shadow') {
                ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
                ctx.globalAlpha = (0.35 + 0.3 * Math.sin(now / 340 + k * 2.4)) * edge;
                const s = sc * (0.1 + sR * 0.1);
                ctx.fillRect(cx - s / 2, cy - s / 2 - jig * 3, s, s);
              } else if (st.debris === 'spark') {
                ctx.fillStyle = k % 2 === 0 ? st.core : st.spark;
                ctx.globalAlpha = Math.random() < 0.6 ? 0.8 * edge : 0.15 * edge;
                const s = sc * 0.05;
                ctx.fillRect(cx - s / 2, cy - s / 2, s * (1 + sR), s * 0.6);
              } else if (st.debris === 'star') {
                const tw = 0.5 + 0.5 * Math.sin(now / 320 + k * 2.2);
                ctx.globalAlpha = (0.3 + 0.6 * tw) * edge;
                ctx.fillStyle = k % 2 === 0 ? st.core : st.spark;
                const g = sc * 0.04;
                ctx.fillRect(cx - g / 2, cy - g * 1.6, g, g * 3.2);
                ctx.fillRect(cx - g * 1.6, cy - g / 2, g * 3.2, g);
              } else if (st.debris === 'blood') {
                ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
                const s = sc * (0.09 + sR * 0.1);
                ctx.beginPath();
                ctx.ellipse(cx, cy, s, s * squash, 0, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillStyle = k % 2 === 0 ? st.mid : st.deep;
                const s = sc * (0.07 + sR * 0.08);
                ctx.fillRect(cx - s / 2, cy - s / 2 + jig, s, s * 0.75);
              }
              ctx.globalAlpha = 0.85 * edge;
            }
          }
          ctx.restore();
          break;
        }

        case 'nova': {
          // The shockwave's whole ground story: interior light wash,
          // flash disc, the identity ring, its chasing echo, and the
          // flat rim spikes — all UNDER the world, wrapping bodies.
          ctx.save();
          const wash = st.wash ?? 0.45;
          const rr = rPx * Math.sqrt(t);
          // The wash: turf inside the front LIGHTS while the shock is
          // young — the world answers before the dust does.
          if (wash > 0 && t < 0.55) {
            const wt = 1 - t / 0.55;
            ctx.globalAlpha = wt * wt * 0.42 * wash;
            ctx.fillStyle = st.mid;
            ctx.beginPath();
            jaggedRingPath(ctx, p.x, p.y, rr * 0.96, squash, 16, 0.06, seed % 7, seed);
            ctx.fill();
            ctx.globalAlpha = wt * wt * 0.55 * wash;
            ctx.fillStyle = st.core;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rr * 0.42, rr * 0.42 * squash, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Flash frame: the solid disc of light on the turf (the
          // vertical kick stands in the volume pass).
          if (t < 0.16) {
            const ft = 1 - t / 0.16;
            ctx.globalAlpha = ft * 0.5;
            ctx.fillStyle = st.core;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rPx * 0.55, rPx * 0.55 * squash, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = (1 - t) * 0.85;
          this.fxRingLayer(p.x, p.y, rr, st, t, seed, fx.x, fx.y, fx.radius);
          // The echo ring chases the first.
          if (t > 0.22) {
            const t2 = (t - 0.22) / 0.78;
            ctx.globalAlpha = (1 - t2) * 0.4;
            ctx.strokeStyle = st.mid;
            ctx.lineWidth = Math.max(1.5, sc * 0.05);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rPx * Math.sqrt(t2), rPx * Math.sqrt(t2) * squash, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Radial spike quads riding the rim outward, flat on the turf.
          ctx.globalAlpha = (1 - t) * 0.7;
          ctx.fillStyle = st.spark;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + (seed % 5);
            const r0 = rr * 0.9;
            const r1 = rr * 1.18 + sc * 0.1;
            const wA = 0.05;
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(a - wA) * r0, p.y + Math.sin(a - wA) * r0 * squash);
            ctx.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1 * squash);
            ctx.lineTo(p.x + Math.cos(a + wA) * r0, p.y + Math.sin(a + wA) * r0 * squash);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          break;
        }

        case 'blast': {
          // The detonation's ground story: seared wash, overpressure
          // disc, and the racing ground ring — the fire BODY stands
          // in the volume pass at the impact point.
          ctx.save();
          const wash = st.wash ?? 0.45;
          if (wash > 0 && t < 0.6) {
            const wt = 1 - t / 0.6;
            ctx.globalAlpha = wt * wt * 0.5 * wash;
            ctx.fillStyle = st.mid;
            ctx.beginPath();
            jaggedRingPath(ctx, p.x, p.y, rPx * (0.55 + 0.45 * Math.min(1, t / 0.25)), squash, 16, 0.07, seed % 7, seed ^ 0x2b);
            ctx.fill();
            ctx.globalAlpha = wt * wt * 0.6 * wash;
            ctx.fillStyle = st.core;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rPx * 0.32 * (1 - t * 0.4), rPx * 0.32 * (1 - t * 0.4) * squash, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (t < 0.12) {
            const ft = 1 - t / 0.12;
            ctx.globalAlpha = ft * 0.65;
            ctx.fillStyle = st.core;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rPx * 0.8, rPx * 0.8 * squash, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // The ground ring races out under the fire.
          ctx.globalAlpha = (1 - t) * 0.7;
          this.fxRingLayer(p.x, p.y, rPx * (0.5 + 0.5 * Math.sqrt(t)), st, t, seed, fx.x, fx.y, fx.radius);
          ctx.restore();
          break;
        }

        case 'arc': {
          // The crescent swing sweeps the TURF: a wedge of three
          // nested bands in ground perspective, chips marking where
          // the edge has been. Under the y-sort, the near half of the
          // sweep rolls in front of your feet, the far half tucks
          // behind your body — the swing wraps around you.
          const dir = fx.dir ?? 0;
          const half = 1.05;
          const sweep = Math.min(1, t / 0.62);
          const lead = dir - half + 2 * half * sweep;
          const fade = 1 - t;
          ctx.save();
          // Outline first: the dark rim that makes the blade read on
          // bright grass — the flat-art dilate law, hand-rolled.
          ctx.globalAlpha = 0.7 * fade;
          ctx.strokeStyle = st.deep;
          ctx.lineWidth = Math.max(2, sc * 0.06);
          this.fxSectorPath(p.x, p.y, rPx * 1.04, rPx * 0.4, dir - half, lead, squash);
          ctx.stroke();
          // Pass 1 — the swept wake, deep and wide.
          ctx.globalAlpha = 0.45 * fade;
          ctx.fillStyle = st.deep;
          this.fxSectorPath(p.x, p.y, rPx * 0.98, rPx * 0.42, dir - half, lead, squash);
          ctx.fill();
          // Pass 2 — the identity band riding the outer half.
          ctx.globalAlpha = 0.75 * fade;
          ctx.fillStyle = st.mid;
          this.fxSectorPath(p.x, p.y, rPx * 0.98, rPx * 0.62, Math.max(dir - half, lead - 1.2), lead, squash);
          ctx.fill();
          // Pass 3 — the white-hot leading edge.
          ctx.globalAlpha = fade;
          ctx.fillStyle = st.core;
          this.fxSectorPath(p.x, p.y, rPx * 1.08, rPx * 0.7, lead - 0.3, lead, squash);
          ctx.fill();
          // Rim chips mark where the edge has already been.
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = st.spark;
          const rand = srand(seed);
          for (let k = 0; k < 7; k++) {
            const a = dir - half + (k / 6) * 2 * half;
            if (a > lead) break;
            const rr = rPx * (1.02 + rand() * 0.14);
            const s = sc * 0.08;
            ctx.fillRect(p.x + Math.cos(a) * rr - s / 2, p.y + Math.sin(a) * rr * squash - s / 2, s, s);
          }
          ctx.restore();
          break;
        }

        case 'buff': {
          // The feet halo contracts onto the caster: power arriving.
          // The rising runes orbit the BODY in the volume pass.
          ctx.save();
          const hr = rPx * (1.5 - 1.1 * Math.min(1, t / 0.4));
          ctx.globalAlpha = (1 - t) * 0.8;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(2, sc * 0.07);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, hr, hr * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, hr * 0.8, hr * 0.8 * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Corona ticks stand off the halo while it lands.
          if (t < 0.5) {
            ctx.globalAlpha = (1 - t / 0.5) * 0.7;
            ctx.fillStyle = st.spark;
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2 + now / 900;
              const g = sc * 0.03;
              ctx.fillRect(p.x + Math.cos(a) * hr * 1.14 - g / 2, p.y + Math.sin(a) * hr * 1.14 * squash - g * 1.5, g, g * 3);
            }
          }
          ctx.restore();
          break;
        }

        case 'summon': {
          // The arrival circle rolls out on the turf; its glyphs
          // stand on the ring in the volume pass.
          const rr = rPx * (0.4 + 0.6 * t);
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.8;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(2, sc * 0.09 * (1 - t) + 1);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = (1 - t) * 0.4;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr * 0.82, rr * 0.82 * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'reaction': {
          // The detonation ring rolls the ground; the named star pops
          // at chest height in the volume pass.
          if (fx.radius > 0) {
            const rr = rPx * Math.sqrt(t);
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.6;
            ctx.strokeStyle = st.mid;
            ctx.lineWidth = Math.max(2, sc * 0.07);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rr, rr * squash, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          break;
        }

        case 'bolt': {
          // The earth answers the strike: a flash pool under the hit.
          const bx = fx.x2 ?? fx.x;
          const by = fx.y2 ?? fx.y;
          const q0 = this.camera.worldToScreen(bx, by, this.w, this.h);
          q0.y -= this.renderLift(bx, by) * sc;
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.3;
          ctx.fillStyle = st.mid;
          ctx.beginPath();
          ctx.ellipse(q0.x, q0.y, sc * 0.45 * (1 - t * 0.4), sc * 0.45 * (1 - t * 0.4) * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'beam': {
          // The corridor's terminus scorches a pool of light on the turf.
          const bx = fx.x2 ?? fx.x;
          const by = fx.y2 ?? fx.y;
          const q0 = this.camera.worldToScreen(bx, by, this.w, this.h);
          q0.y -= this.renderLift(bx, by) * sc;
          const grow = Math.min(1, age / 70);
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.32;
          ctx.fillStyle = st.mid;
          ctx.beginPath();
          ctx.ellipse(q0.x, q0.y, sc * 0.55 * grow, sc * 0.55 * grow * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = (1 - t) * 0.45;
          ctx.fillStyle = st.core;
          ctx.beginPath();
          ctx.ellipse(q0.x, q0.y, sc * 0.26 * grow, sc * 0.26 * grow * squash, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        default:
          break;
      }

      // The motif's ground half, anchored at the far end for
      // traveling shapes and at the heart for everything else.
      if (st.motif && fx.kind !== 'telegraph') {
        let ax = fx.x;
        let ay = fx.y;
        if ((fx.kind === 'dash' || fx.kind === 'bolt' || fx.kind === 'beam') && fx.x2 !== undefined) {
          ax = fx.x2;
          ay = fx.y2 ?? fx.y;
        }
        const ap = this.camera.worldToScreen(ax, ay, this.w, this.h);
        ap.y -= this.renderLift(ax, ay) * sc;
        this.fxMotifGround(ax, ay, ap.x, ap.y, Math.max(rPx, sc * 0.9), st, t, seed, now);
      }
    }
  }

  /**
   * The VOLUME stratum of combat FX — kind-level standing matter,
   * collected into the world y-sort: the blast's fireball body, the
   * nova's vertical light kick, buff runes orbiting the caster's
   * body, summon glyphs riding their ring, reaction stars at chest
   * height, the tall furniture standing in hazard fields — plus every
   * motif's volume half. Each element anchors at its OWN ground point
   * so spells wrap around bodies instead of covering them.
   */
  private collectFxVolumes(game: ClientGame, items: DrawItem[]): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const now = performance.now();
    const squash = Renderer.FX_SQUASH;
    for (const fx of game.fx) {
      const age = now - fx.bornAt;
      const life = this.fxLife(fx);
      if (age > life) continue;
      const t = age / life;
      const st = fxStyleFor(fx.id, fx.color);
      const seed = (fx.bornAt * 31) & 0x7fffffff;

      switch (fx.kind) {
        case 'nova': {
          // The vertical light kick — energy leaves the ground UP as
          // the ring leaves it OUT. It stands at the heart, so the
          // caster's own body reads INSIDE the event.
          if (t < 0.2) {
            items.push({
              sortY: fx.y + 0.015,
              draw: () => {
                const p = this.liftedWTS(fx.x, fx.y);
                const rPx = fx.radius * sc;
                const ft = 1 - t / 0.2;
                const kw = sc * 0.14 * ft;
                ctx.save();
                ctx.globalAlpha = ft * 0.8;
                ctx.fillStyle = st.core;
                ctx.fillRect(p.x - kw / 2, p.y - rPx * 1.15, kw, rPx * 1.15);
                ctx.globalAlpha = ft * 0.35;
                ctx.fillStyle = st.mid;
                ctx.fillRect(p.x - kw * 1.8, p.y - rPx * 0.8, kw * 3.6, rPx * 0.8);
                ctx.restore();
              },
            });
          }
          break;
        }

        case 'blast': {
          // The explosion's BODY — the double burst star with its
          // shaded south half — is world matter at the impact point:
          // whoever stands south of it walks in FRONT of the fire.
          items.push({
            sortY: fx.y + 0.02,
            draw: () => {
              const p = this.liftedWTS(fx.x, fx.y);
              const rPx = fx.radius * sc;
              ctx.save();
              if (t < 0.12) {
                // The overpressure instant: a pillar flash reaching
                // for the sky — the "something BIG landed" read.
                const ft = 1 - t / 0.12;
                ctx.globalAlpha = ft * 0.9;
                ctx.fillStyle = st.core;
                const kw = sc * 0.2 * ft;
                ctx.fillRect(p.x - kw / 2, p.y - rPx * 1.7, kw, rPx * 1.7);
                ctx.globalAlpha = ft * 0.5;
                ctx.fillRect(p.x - kw * 1.6, p.y - rPx * 1.1, kw * 3.2, rPx * 0.16);
              }
              // The fire is a MASS, not a sign: a cluster of seeded
              // billow lobes that ignite staggered, rise, and shred —
              // soot mantle on the crown, melt hanging under it, the
              // hot core biting each lobe's UNDERSIDE because fire
              // feeds from beneath and cools at the top. No two
              // blasts share a silhouette; nothing pops-and-scales.
              const randB = srand(seed ^ 0x9e);
              for (let k = 0; k < 9; k++) {
                const ang = randB() * Math.PI * 2;
                const rad = rPx * (0.1 + randB() * 0.32);
                const szR = randB();
                const tilt = (randB() - 0.5) * 0.6;
                const lt = Math.max(0, Math.min(1, (t - k * 0.045) / 0.78));
                if (lt <= 0 || lt >= 1) continue;
                const rise = lt * rPx * (0.45 + szR * 0.5);
                const swell = 0.55 + 0.75 * Math.min(1, lt / 0.16);
                const s = rPx * (0.15 + szR * 0.13) * swell * (1 - 0.5 * lt * lt);
                const bx = p.x + Math.cos(ang) * rad * (1 + lt * 0.35);
                const by = p.y - sc * 0.1 - rise + Math.sin(ang) * rad * 0.5;
                const inner = rad < rPx * 0.24; // heart lobes burn hotter
                const gut = 0.85 + 0.15 * Math.sin(now / 55 + k * 2.3);
                ctx.save();
                ctx.translate(bx, by);
                ctx.rotate(tilt + lt * (k % 2 === 0 ? 0.4 : -0.4));
                ctx.globalAlpha = (1 - lt) * (1 - lt) * 0.92 * gut;
                ctx.fillStyle = lt > 0.55 ? shade(st.deep, -10) : st.deep;
                ctx.fillRect(-s * 0.62, -s * 0.66, s * 1.24, s * 0.72);
                ctx.fillStyle = inner ? st.mid : shade(st.mid, -12);
                ctx.fillRect(-s * 0.55, -s * 0.3, s * 1.1, s * 0.78);
                if (lt < 0.6) {
                  ctx.globalAlpha = (1 - lt / 0.6) * 0.95 * gut;
                  ctx.fillStyle = inner ? st.core : st.spark;
                  ctx.fillRect(-s * 0.34, s * 0.04, s * 0.68, s * 0.42);
                }
                ctx.restore();
              }
              // Shred embers gutter off the rising mass while it burns.
              if (t < 0.6 && Math.random() < this.frameDt * 22 * (1 - t)) {
                this.particles.burst(fx.x + (Math.random() - 0.5) * fx.radius * 0.5, fx.y - 0.3 - Math.random() * 0.5, 1, [st.spark, st.core], {
                  speed: 1.4, life: 0.45, size: 0.06, gravity: -1.8, flicker: 0.8, shape: 'streak',
                });
              }
              ctx.restore();
            },
          });
          break;
        }

        case 'buff': {
          // Rising rune blocks ORBIT THE BODY — each one its own world
          // item, so runes pass in front of the chest and disappear
          // behind the shoulders as they climb. Power wraps around you.
          const rand = srand(seed);
          for (let k = 0; k < 7; k++) {
            const phase = rand() * Math.PI * 2;
            const kt = Math.max(0, Math.min(1, t * 1.5 - k * 0.06));
            if (kt <= 0 || kt >= 1) continue;
            const a = phase + t * 3;
            const orbitW = 0.42 * (1 - kt * 0.3);
            const ex = fx.x + Math.cos(a) * orbitW;
            const ey = fx.y + Math.sin(a) * orbitW * 0.3;
            const cross = k % 3 === 0;
            const lit = k % 2 === 0;
            items.push({
              sortY: ey + 0.005,
              draw: () => {
                const q = this.liftedWTS(ex, ey);
                const by = q.y - sc * (0.15 + kt * 1.35);
                const s = sc * 0.09 * (1 - kt * 0.6);
                ctx.save();
                ctx.globalAlpha = (1 - kt) * 0.9;
                ctx.fillStyle = lit ? st.core : st.spark;
                ctx.fillRect(q.x - s / 2, by - s, s, s * 2);
                if (cross) ctx.fillRect(q.x - s, by - s * 0.3, s * 2, s * 0.6);
                ctx.restore();
              },
            });
          }
          break;
        }

        case 'summon': {
          // The arrival glyphs stand on the expanding ring.
          const rrW = fx.radius * (0.4 + 0.6 * t);
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + now / 400;
            const ex = fx.x + Math.cos(a) * rrW;
            const ey = fx.y + Math.sin(a) * rrW * squash;
            items.push({
              sortY: ey + 0.01,
              draw: () => {
                const q = this.liftedWTS(ex, ey);
                const g = sc * 0.08 * (1 - t * 0.5);
                ctx.save();
                ctx.globalAlpha = (1 - t) * 0.9;
                ctx.fillStyle = st.core;
                ctx.fillRect(q.x - g / 2, q.y - g * 2, g, g * 2);
                ctx.fillStyle = st.spark;
                ctx.fillRect(q.x - g, q.y - g * 1.3, g * 2, g * 0.55);
                ctx.restore();
              },
            });
          }
          break;
        }

        case 'reaction': {
          // The named burst star pops at chest height IN the scene.
          if (fx.radius > 0) {
            items.push({
              sortY: fx.y + 0.01,
              draw: () => {
                const p = this.liftedWTS(fx.x, fx.y);
                const cy0 = p.y - sc * 0.25;
                ctx.save();
                // Core flash: a hot diamond that COOLS — never grows.
                if (t < 0.35) {
                  const ft = 1 - t / 0.35;
                  const cs = sc * 0.09 * (0.6 + 0.4 * ft);
                  ctx.globalAlpha = ft * 0.95;
                  ctx.save();
                  ctx.translate(p.x, cy0);
                  ctx.rotate(Math.PI / 4);
                  ctx.fillStyle = st.core;
                  ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(-cs * 0.45, -cs * 0.45, cs * 0.9, cs * 0.9);
                  ctx.restore();
                }
                // Shrapnel slivers fly the ring — detached matter with
                // real trajectories, not a connected star silhouette.
                const randR = srand(seed ^ 0x3d);
                ctx.globalAlpha = (1 - t) * 0.85;
                ctx.fillStyle = st.spark;
                for (let k = 0; k < 8; k++) {
                  const a = randR() * Math.PI * 2;
                  const sp = 0.35 + randR() * 0.5;
                  const d = sc * (0.12 + t * sp);
                  const tl = sc * (0.1 + 0.06 * randR()) * (1 - t * 0.6);
                  ctx.save();
                  ctx.translate(p.x + Math.cos(a) * d, cy0 + Math.sin(a) * d * 0.85);
                  ctx.rotate(a);
                  ctx.fillRect(0, -Math.max(1, sc * 0.02) / 2, tl, Math.max(1, sc * 0.02));
                  ctx.restore();
                }
                // The pressure ring in the air — thin, near-circular
                // (the ground ring lives in the ground pass).
                if (t < 0.5) {
                  ctx.globalAlpha = (1 - t / 0.5) * 0.6;
                  ctx.strokeStyle = st.mid;
                  ctx.lineWidth = Math.max(1, sc * 0.025);
                  ctx.beginPath();
                  const ir = sc * (0.1 + t * 0.55);
                  ctx.ellipse(p.x, cy0, ir, ir * 0.85, 0, 0, Math.PI * 2);
                  ctx.stroke();
                }
                ctx.restore();
              },
            });
          }
          break;
        }

        case 'field': {
          // The hazard's STANDING furniture — frost spars, grave
          // splinters, thorn hooks, rubble slabs — y-sorts with the
          // world; you wade THROUGH the zone's matter. Flat glows
          // stay in the ground pass. SHARED-SEED LAW: 3 rand() per
          // piece, the same walk as the ground half.
          const standing = st.debris === 'ice' || st.debris === 'bone' || st.debris === 'leaf' || st.debris === 'rock';
          if (!standing) break;
          const edge = Math.min(1, age / 220, (life - age) / 420);
          const rand = srand(seed);
          for (let k = 0; k < 9; k++) {
            const a = rand() * Math.PI * 2;
            const rrW = fx.radius * (0.2 + rand() * 0.65);
            const sR = rand();
            const ex = fx.x + Math.cos(a) * rrW;
            const ey = fx.y + Math.sin(a) * rrW * squash;
            const kk = k;
            items.push({
              sortY: ey + 0.005,
              draw: () => {
                const q = this.liftedWTS(ex, ey);
                const jig = Math.sin(now / 260 + kk * 1.7) * sc * 0.015;
                ctx.save();
                ctx.globalAlpha = 0.9 * edge;
                if (st.debris === 'ice') {
                  // A faceted frost spar: shaded flank, lit flank.
                  const hK = sc * (0.14 + sR * 0.12);
                  ctx.fillStyle = shade(st.mid, -20);
                  ctx.beginPath();
                  ctx.moveTo(q.x, q.y - hK);
                  ctx.lineTo(q.x - sc * 0.05, q.y);
                  ctx.lineTo(q.x, q.y + sc * 0.012);
                  ctx.closePath();
                  ctx.fill();
                  ctx.fillStyle = kk % 3 === 0 ? st.core : st.mid;
                  ctx.beginPath();
                  ctx.moveTo(q.x, q.y - hK);
                  ctx.lineTo(q.x + sc * 0.05, q.y);
                  ctx.lineTo(q.x, q.y + sc * 0.012);
                  ctx.closePath();
                  ctx.fill();
                } else if (st.debris === 'bone') {
                  // Grave splinters standing crooked out of the ground.
                  ctx.fillStyle = kk % 3 === 0 ? st.core : st.mid;
                  ctx.translate(q.x, q.y);
                  ctx.rotate((sR - 0.5) * 0.9);
                  ctx.fillRect(-sc * 0.025, -sc * (0.1 + sR * 0.1), sc * 0.05, sc * (0.13 + sR * 0.1));
                } else if (st.debris === 'leaf') {
                  // Thorn hooks rearing out of the ground.
                  ctx.strokeStyle = kk % 2 === 0 ? st.deep : st.mid;
                  ctx.lineWidth = Math.max(1.5, sc * 0.045);
                  ctx.beginPath();
                  ctx.moveTo(q.x, q.y);
                  ctx.lineTo(q.x + sc * 0.04, q.y - sc * (0.12 + sR * 0.1) + jig);
                  ctx.lineTo(q.x + sc * 0.11, q.y - sc * 0.08 + jig);
                  ctx.stroke();
                } else {
                  // Rubble slabs, lit-top faceted.
                  const s = sc * (0.08 + sR * 0.08);
                  ctx.fillStyle = shade(st.mid, -14);
                  ctx.fillRect(q.x - s / 2, q.y - s + jig, s, s);
                  ctx.fillStyle = shade(st.mid, 8);
                  ctx.fillRect(q.x - s / 2, q.y - s + jig, s, s * 0.35);
                }
                ctx.restore();
              },
            });
          }
          break;
        }

        default:
          break;
      }

      // The motif's standing half, anchored at the far end for
      // traveling shapes and at the heart for everything else.
      if (st.motif && fx.kind !== 'telegraph') {
        let ax = fx.x;
        let ay = fx.y;
        if ((fx.kind === 'dash' || fx.kind === 'bolt' || fx.kind === 'beam') && fx.x2 !== undefined) {
          ax = fx.x2;
          ay = fx.y2 ?? fx.y;
        }
        this.collectMotifVolumes(items, ax, ay, Math.max(fx.radius, 0.9), st, t, seed, now);
      }
    }
  }

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
  private drawCombatFx(game: ClientGame): void {
    const ctx = this.ctx;
    const sc = this.camera.scale;
    const now = performance.now();
    const squash = Renderer.FX_SQUASH;
    this.runFxBeats(now);
    for (let i = game.fx.length - 1; i >= 0; i--) {
      const fx = game.fx[i]! as (typeof game.fx)[number] & { spawned?: boolean };
      const age = now - fx.bornAt;
      const life = this.fxLife(fx);
      if (age > life) {
        // A hazard zone doesn't just switch off: it exhales — a
        // dissipation puff and a lingering residue where it stood.
        if (fx.kind === 'field') {
          const stEnd = fxStyleFor(fx.id, fx.color);
          this.addDecal(fx.x, fx.y, fx.radius * 0.75, stEnd);
          this.particles.burst(fx.x, fx.y - 0.2, 8, [stEnd.mid, stEnd.deep], {
            speed: 0.8, life: 0.9, size: 0.11, gravity: -0.8, drag: 1.6, grow: 0.2,
          });
        }
        game.fx.splice(i, 1);
        continue;
      }
      const t = age / life;
      const st = fxStyleFor(fx.id, fx.color);
      const p = this.camera.worldToScreen(fx.x, fx.y, this.w, this.h);
      p.y -= this.renderLift(fx.x, fx.y) * sc;
      const rPx = fx.radius * sc;
      const seed = (fx.bornAt * 31) & 0x7fffffff;

      switch (fx.kind) {
        case 'arc': {
          // The sweep itself lives on the ground plane now; the air
          // keeps the moment's kick and the shedding edge.
          const dir = fx.dir ?? 0;
          const half = 1.05;
          if (!fx.spawned) {
            fx.spawned = true;
            this.particles.burst(
              fx.x + Math.cos(dir) * fx.radius * 0.6,
              fx.y + Math.sin(dir) * fx.radius * 0.6 * squash - 0.35,
              6,
              [st.mid, st.spark, st.core],
              { speed: 3.0, life: 0.3, size: 0.08, gravity: 2, dir, spread: 1.3 },
            );
            this.queueGlow(fx.x, fx.y - 0.3, fx.radius, st.glow, 0.3);
          }
          const sweep = Math.min(1, t / 0.62);
          const lead = dir - half + 2 * half * sweep;
          // The edge SHEDS as it cuts: streak sparks fly off the tip.
          if (sweep < 1 && Math.random() < this.frameDt * 30) {
            this.particles.burst(
              fx.x + Math.cos(lead) * fx.radius,
              fx.y + Math.sin(lead) * fx.radius * squash - 0.3,
              1,
              [st.spark, st.core],
              { speed: 2.6, life: 0.3, size: 0.06, gravity: 3, dir: lead + 0.5, spread: 0.5, shape: 'streak' },
            );
          }
          break;
        }

        case 'dash': {
          // Afterimages: the space you crossed remembers you crossing it.
          const q = this.camera.worldToScreen(fx.x2 ?? fx.x, fx.y2 ?? fx.y, this.w, this.h);
          q.y -= this.renderLift(fx.x2 ?? fx.x, fx.y2 ?? fx.y) * sc;
          if (!fx.spawned) {
            fx.spawned = true;
            this.particles.burst(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.3, 8, [st.mid, st.spark], { speed: 2.2, life: 0.35, size: 0.08, gravity: 3, up: true });
            this.queueGlow(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.3, 1.2, st.glow, 0.35);
            // Departure kick: the ground remembers where you left.
            this.particles.burst(fx.x, fx.y, 5, ['#4a4252', '#3a3442'], {
              speed: 0.9, life: 0.8, size: 0.11, gravity: -0.4, drag: 1.8, grow: 0.25, ground: true,
            });
          }
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;
          const fade = 1 - t;
          const lift = sc * 0.42; // the streak rides at body height
          ctx.save();
          // The tapered wake: wide at the arrival, thin at the origin.
          for (const [w0, w1, col, a] of [
            [0.05, 0.3, st.deep, 0.3],
            [0.03, 0.2, st.mid, 0.5],
            [0.012, 0.09, st.core, 0.85],
          ] as const) {
            ctx.globalAlpha = a * fade;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(p.x + nx * sc * w0, p.y + ny * sc * w0 - lift);
            ctx.lineTo(q.x + nx * sc * w1, q.y + ny * sc * w1 - lift);
            ctx.lineTo(q.x - nx * sc * w1, q.y - ny * sc * w1 - lift);
            ctx.lineTo(p.x - nx * sc * w0, p.y - ny * sc * w0 - lift);
            ctx.closePath();
            ctx.fill();
          }
          // Afterimage blocks dissolve in sequence toward the arrival.
          const rand = srand(seed);
          for (let k = 0; k < 5; k++) {
            const tk = 0.15 + k * 0.17;
            const alpha = Math.max(0, 1 - t * 2.2 - k * 0.12);
            if (alpha <= 0) continue;
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = k % 2 === 0 ? st.mid : st.core;
            const bx = p.x + dx * tk + nx * (rand() - 0.5) * sc * 0.2;
            const by = p.y + dy * tk + ny * (rand() - 0.5) * sc * 0.2 - lift;
            const s = sc * (0.1 + rand() * 0.1);
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.atan2(uy, ux));
            ctx.fillRect(-s, -s * 0.35, s * 2, s * 0.7);
            ctx.restore();
          }
          // Speed ticks chase the arrival point.
          ctx.globalAlpha = 0.7 * fade;
          ctx.strokeStyle = st.spark;
          ctx.lineWidth = Math.max(1.5, sc * 0.04);
          for (let k = 0; k < 3; k++) {
            const off = (k - 1) * sc * 0.26;
            ctx.beginPath();
            ctx.moveTo(q.x - ux * sc * (0.7 + k * 0.25) + nx * off, q.y - uy * sc * (0.7 + k * 0.25) + ny * off - lift);
            ctx.lineTo(q.x - ux * sc * (0.3 + k * 0.25) + nx * off, q.y - uy * sc * (0.3 + k * 0.25) + ny * off - lift);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'bolt': {
          // Jagged lightning that re-kinks as it lives, with branches.
          const q = this.camera.worldToScreen(fx.x2 ?? fx.x, fx.y2 ?? fx.y, this.w, this.h);
          q.y -= this.renderLift(fx.x2 ?? fx.x, fx.y2 ?? fx.y) * sc;
          if (!fx.spawned) {
            fx.spawned = true;
            this.fxDebris(fx.x2 ?? fx.x, fx.y2 ?? fx.y, st, 6);
            // The strike THROWS sparks: a fan of fast slivers off the
            // hit point — small and many beats big and one.
            this.particles.burst(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.4, 7, [st.spark, st.core], {
              speed: 3.4, life: 0.3, size: 0.05, gravity: 4, up: true, shape: 'streak',
            });
            this.queueGlow(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.3, 1.1, st.glow, 0.5);
            this.queueGlow(fx.x, fx.y - 0.3, 0.8, st.glow, 0.35);
          }
          const lift = sc * 0.5;
          const kinkSeed = seed + Math.floor(age / 70) * 13;
          const fade = 1 - t;
          ctx.save();
          ctx.lineJoin = 'miter';
          ctx.globalAlpha = 0.65 * fade;
          ctx.strokeStyle = st.mid;
          ctx.lineWidth = Math.max(3, sc * 0.11);
          ctx.beginPath();
          boltPath(ctx, p.x, p.y - lift, q.x, q.y - lift, kinkSeed, sc * 0.35);
          ctx.stroke();
          ctx.globalAlpha = 0.95 * fade;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(1.5, sc * 0.045);
          ctx.beginPath();
          boltPath(ctx, p.x, p.y - lift, q.x, q.y - lift, kinkSeed + 5, sc * 0.28);
          ctx.stroke();
          // A short branch forks off the middle.
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2 - lift;
          const ba = Math.atan2(q.y - p.y, q.x - p.x) + (seed % 2 === 0 ? 0.9 : -0.9);
          ctx.globalAlpha = 0.5 * fade;
          ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.beginPath();
          boltPath(ctx, mx, my, mx + Math.cos(ba) * sc * 0.9, my + Math.sin(ba) * sc * 0.9, kinkSeed + 11, sc * 0.2);
          ctx.stroke();
          // The strike's aftermath — no stamped star. Grounding forks
          // bite outward from the hit point, re-kinking on the bolt's
          // own 70ms clock so the splash WRITHES; a hot core point
          // cools where the charge landed; one thin ionization ring
          // snaps out and dies.
          ctx.globalAlpha = 0.95 * fade;
          ctx.strokeStyle = st.spark;
          ctx.lineWidth = Math.max(1.5, sc * 0.035);
          ctx.beginPath();
          this.fxForks(q.x, q.y - lift, kinkSeed ^ 0x1b, 5, sc * 0.55 * (1 - t * 0.35), 0, Math.PI * 2, sc * 0.12);
          ctx.stroke();
          if (t < 0.45) {
            const ft = 1 - t / 0.45;
            const cs = sc * 0.08 * (0.5 + 0.5 * ft);
            ctx.globalAlpha = ft;
            ctx.save();
            ctx.translate(q.x, q.y - lift);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = st.core;
            ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-cs * 0.4, -cs * 0.4, cs * 0.8, cs * 0.8);
            ctx.restore();
            ctx.globalAlpha = ft * 0.7;
            ctx.strokeStyle = st.core;
            ctx.lineWidth = Math.max(1, sc * 0.02);
            ctx.beginPath();
            const ir = sc * (0.08 + (1 - ft) * 0.5);
            ctx.ellipse(q.x, q.y - lift, ir, ir * 0.85, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'beam': {
          // The corridor of light: three nested bands that snap on,
          // hold, then shatter into blocks as they dissolve.
          const q = this.camera.worldToScreen(fx.x2 ?? fx.x, fx.y2 ?? fx.y, this.w, this.h);
          q.y -= this.renderLift(fx.x2 ?? fx.x, fx.y2 ?? fx.y) * sc;
          if (!fx.spawned) {
            fx.spawned = true;
            const dir = Math.atan2((fx.y2 ?? fx.y) - fx.y, (fx.x2 ?? fx.x) - fx.x);
            this.particles.burst(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.4, 10, [st.mid, st.spark, st.core], { speed: 3.2, life: 0.4, size: 0.09, gravity: 1, dir, spread: 1.6 });
            this.queueGlow(fx.x, fx.y - 0.4, 1.0, st.glow, 0.5);
            this.queueGlow((fx.x + (fx.x2 ?? fx.x)) / 2, (fx.y + (fx.y2 ?? fx.y)) / 2 - 0.4, 1.6, st.glow, 0.4);
            this.queueGlow(fx.x2 ?? fx.x, (fx.y2 ?? fx.y) - 0.4, 1.3, st.glow, 0.5);
            // The corridor leaves its mark where it terminated.
            this.addDecal(fx.x2 ?? fx.x, fx.y2 ?? fx.y, 0.9, st);
            this.queueBeat(now + 380, fx.x2 ?? fx.x, fx.y2 ?? fx.y, 0.8, 'settle', st);
          }
          const lift = sc * 0.5;
          const grow = Math.min(1, age / 70);
          const dissolve = Math.max(0, (t - 0.55) / 0.45);
          const fade = 1 - dissolve;
          const halfW = Math.max(2, rPx) * grow;
          ctx.save();
          ctx.lineCap = 'butt';
          if (dissolve > 0) {
            // The beam breaks into marching blocks as it dies.
            ctx.setLineDash([sc * 0.5 * (1 - dissolve * 0.5), sc * 0.5 * dissolve]);
            ctx.lineDashOffset = -now / 20;
          }
          for (const [w, col, a] of [
            [2.0, st.deep, 0.4],
            [1.25, st.mid, 0.6],
            [0.5 * (1 - t * 0.6), st.core, 0.95],
          ] as const) {
            ctx.globalAlpha = a * fade;
            ctx.strokeStyle = col;
            ctx.lineWidth = Math.max(1.5, halfW * 2 * w);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - lift);
            ctx.lineTo(q.x, q.y - lift);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          // Perpendicular edge ticks — energy bleeding off the corridor.
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const rand = srand(seed);
          ctx.globalAlpha = 0.8 * fade;
          ctx.strokeStyle = st.spark;
          ctx.lineWidth = Math.max(1.5, sc * 0.04);
          for (let k = 0; k < 6; k++) {
            const tk = 0.12 + rand() * 0.76;
            const side = k % 2 === 0 ? 1 : -1;
            const bx = p.x + dx * tk;
            const by = p.y + dy * tk - lift;
            ctx.beginPath();
            ctx.moveTo(bx + nx * side * halfW * 1.6, by + ny * side * halfW * 1.6);
            ctx.lineTo(bx + nx * side * (halfW * 1.6 + sc * (0.12 + rand() * 0.14)), by + ny * side * (halfW * 1.6 + sc * 0.12));
            ctx.stroke();
          }
          // MUZZLE: a charge slit standing on the corridor axis with
          // feed ticks converging INTO it — energy entering the line,
          // not a star badge stamped over it.
          const ux = dx / len;
          const uy = dy / len;
          const bAng = Math.atan2(dy, dx);
          ctx.globalAlpha = 0.9 * fade;
          ctx.save();
          ctx.translate(p.x, p.y - lift);
          ctx.rotate(bAng);
          ctx.fillStyle = st.core;
          const ms = sc * (0.2 + 0.05 * Math.sin(now / 90)) * grow;
          ctx.fillRect(-ms * 0.3, -halfW * 1.5, ms, halfW * 3);
          ctx.restore();
          ctx.strokeStyle = st.spark;
          ctx.lineWidth = Math.max(1, sc * 0.03);
          for (let k = 0; k < 3; k++) {
            const off = (k - 1) * halfW * 2.6;
            const pull = (now / 260 + k * 0.37) % 1;
            const d0 = sc * (0.55 - pull * 0.4);
            ctx.globalAlpha = (1 - pull) * 0.8 * fade;
            ctx.beginPath();
            ctx.moveTo(p.x - ux * d0 + nx * off, p.y - uy * d0 + ny * off - lift);
            ctx.lineTo(p.x - ux * (d0 - sc * 0.14) + nx * off * 0.6, p.y - uy * (d0 - sc * 0.14) + ny * off * 0.6 - lift);
            ctx.stroke();
          }
          // TERMINUS: the corridor SPLASHES — energy forks shear off
          // past the endpoint in the beam's own direction, and a hot
          // core point cools against the stop.
          ctx.globalAlpha = 0.85 * fade;
          ctx.strokeStyle = st.spark;
          ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.beginPath();
          this.fxForks(q.x, q.y - lift, (seed ^ 0x6c) + Math.floor(age / 90) * 17, 4, sc * 0.5 * grow, bAng, 1.9, sc * 0.1);
          ctx.stroke();
          {
            const cs = sc * 0.09 * grow * (1 - t * 0.35);
            ctx.globalAlpha = 0.95 * fade;
            ctx.save();
            ctx.translate(q.x, q.y - lift);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = st.core;
            ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
            ctx.restore();
          }
          ctx.restore();
          break;
        }

        case 'nova': {
          // Rings and wash live on the ground; the light kick stands
          // in the volume pass. The air keeps the aftermath schedule.
          if (!fx.spawned) {
            fx.spawned = true;
            this.fxDebris(fx.x, fx.y, st, 14);
            this.addDecal(fx.x, fx.y, fx.radius * 0.8, st);
            this.queueBeat(now + 260, fx.x, fx.y, fx.radius, 'dust', st);
            this.queueBeat(now + 520, fx.x, fx.y, fx.radius * 0.6, 'settle', st);
          }
          this.queueGlow(fx.x, fx.y, fx.radius * (0.5 + 0.7 * t), st.glow, 0.5 * (1 - t));
          break;
        }

        case 'blast': {
          // Ground ring + wash under the world, fire body in the
          // y-sort; here, the smoke, the crater, and the beats.
          if (!fx.spawned) {
            fx.spawned = true;
            this.fxDebris(fx.x, fx.y, st, 18);
            // The smoke column billows and drifts.
            this.particles.burst(fx.x, fx.y - 0.3, 6, [st.deep, '#3a3442'], { speed: 0.7, life: 1.1, size: 0.16, gravity: -1.2, drag: 1.6, grow: 0.35 });
            this.addDecal(fx.x, fx.y, fx.radius * 0.7, st);
            this.addRing(fx.x, fx.y, st.mid, fx.radius);
            this.queueBeat(now + 300, fx.x, fx.y, fx.radius * 1.1, 'dust', st);
            this.queueBeat(now + 620, fx.x, fx.y, fx.radius * 0.6, 'settle', st);
          }
          this.queueGlow(fx.x, fx.y, fx.radius * 1.6 * (1 - t), st.glow, 0.55 * (1 - t));
          break;
        }

        case 'buff': {
          // Halo on the ground, runes in the y-sort; the air keeps
          // the arrival lift and the glow.
          if (!fx.spawned) {
            fx.spawned = true;
            this.particles.burst(fx.x, fx.y - 0.6, 8, [st.mid, st.spark, st.core], { speed: 1.4, life: 0.5, size: 0.08, gravity: -2.4 });
          }
          this.queueGlow(fx.x, fx.y - 0.4, 1.1, st.glow, 0.4 * (1 - t));
          this.queueGlow(fx.x, fx.y - 1.1, 0.8, st.glow, 0.3 * (1 - t));
          break;
        }

        case 'summon': {
          // Ring on the ground, glyphs in the y-sort.
          if (!fx.spawned) {
            fx.spawned = true;
            this.particles.burst(fx.x, fx.y - 0.15, 8, [st.mid, st.deep], { speed: 1.6, life: 0.5, size: 0.1, gravity: 4, up: true, drag: 1.2 });
          }
          break;
        }

        case 'reaction': {
          // Ring on the ground, star in the y-sort; light stays here.
          if (!fx.spawned) fx.spawned = true;
          if (fx.radius > 0) {
            this.queueGlow(fx.x, fx.y - 0.2, fx.radius * (1 - t * 0.5), st.glow, 0.4 * (1 - t));
          }
          break;
        }

        case 'field': {
          // The floor lives in the ground pass, the standing
          // furniture in the y-sort; the air keeps the simmer and
          // the breathing rim membrane.
          const edge = Math.min(1, age / 220, (life - age) / 420);
          this.queueGlow(fx.x, fx.y, fx.radius * 0.9, st.glow, 0.2 * edge * (0.8 + 0.2 * Math.sin(now / 300)));
          if (Math.random() < this.frameDt * 12 * edge) {
            const a = Math.random() * Math.PI * 2;
            const rr = Math.sqrt(Math.random()) * fx.radius * 0.9;
            const px2 = fx.x + Math.cos(a) * rr;
            const py2 = fx.y + Math.sin(a) * rr * squash;
            if (st.debris === 'ember') {
              this.particles.burst(px2, py2 - 0.1, 1, [st.mid, st.spark], { speed: 0.5, life: 0.6, size: 0.08, gravity: -2.4 });
            } else if (st.debris === 'ice') {
              this.particles.burst(px2, py2 - 0.5, 1, [st.core, st.mid], { speed: 0.3, life: 0.7, size: 0.07, gravity: 0.9 });
            } else if (st.debris === 'shadow') {
              this.particles.burst(px2, py2 - 0.1, 1, [st.deep, st.mid], { speed: 0.4, life: 0.8, size: 0.11, gravity: -1.2, drag: 1.4 });
            } else if (st.debris === 'spark') {
              this.particles.burst(px2, py2 - 0.3, 1, [st.core, st.spark], { speed: 2.4, life: 0.16, size: 0.06, gravity: 0 });
            } else {
              this.particles.burst(px2, py2 - 0.15, 1, [st.mid, st.spark], { speed: 0.5, life: 0.5, size: 0.08, gravity: -1.4 });
            }
          }
          // The rim breathes matter: motes drift off the boundary (or
          // INTO it for vortex zones) so the edge reads as a living
          // membrane, not a painted line.
          if (Math.random() < this.frameDt * 10 * edge) {
            const a = Math.random() * Math.PI * 2;
            const inward = st.motif === 'vortex';
            this.particles.burst(fx.x + Math.cos(a) * fx.radius, fx.y + Math.sin(a) * fx.radius * squash, 1, [st.mid, st.spark], {
              speed: inward ? 1.5 : 0.4,
              life: 0.7,
              size: 0.06,
              gravity: -0.6,
              dir: inward ? a + Math.PI : a,
              spread: 0.4,
              drag: 1.4,
              flicker: 0.5,
            });
          }
          break;
        }

        default:
          // telegraph lives in the ground pass; vanish is pure particles.
          break;
      }
    }
  }

  /** An annular sector (arc band) path in ground perspective. */
  private fxSectorPath(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    a0: number,
    a1: number,
    squash: number,
  ): void {
    const ctx = this.ctx;
    if (a1 <= a0) return;
    const steps = Math.max(3, Math.ceil((a1 - a0) / 0.28));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = cx + Math.cos(a) * rOuter;
      const y = cy + Math.sin(a) * rOuter * squash;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / steps;
      ctx.lineTo(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner * squash);
    }
    ctx.closePath();
  }

  // ------------------------------------------------------------ overlay

  private drawBuildGhost(): void {
    if (!this.buildGhost) return;
    const ctx = this.ctx;
    const s = this.camera.scale;
    const p = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty, this.w, this.h);
    const sy = this.camera.worldToScreen(this.buildGhost.tx, this.buildGhost.ty + 1, this.w, this.h).y - p.y;
    p.y -= this.renderLift(this.buildGhost.tx + 0.5, this.buildGhost.ty + 0.5) * s;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = this.buildGhost.color;
    ctx.beginPath();
    chamferRect(ctx, p.x + 1, p.y + 1, s - 2, sy - 2, s * 0.16);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.buildGhost.valid ? '#4fc06a' : '#c4553d';
    ctx.beginPath();
    chamferRect(ctx, p.x + 1, p.y + 1, s - 2, sy - 2, s * 0.16);
    ctx.stroke();
  }

  private drawActionProgress(game: ClientGame): void {
    if (!game.action || game.ownEid === null) return;
    const frac = Math.min(
      1,
      (performance.now() - game.action.startedAt) / Math.max(1, game.action.durationMs),
    );
    const ctx = this.ctx;
    const s = this.camera.scale;
    const own = game.predictor.renderPos();
    const p = this.liftedWTS(own.x, own.y);
    const bw = s * 1.0;
    const bh = Math.max(4, s * 0.1);
    const bx = p.x - bw / 2;
    const by = p.y - s * 1.32;
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#e8b64c';
    ctx.fillRect(bx, by, Math.max(2, bw * frac), bh);
  }

  private drawFloaties(game: ClientGame): void {
    const ctx = this.ctx;
    const s = this.camera.scale;
    const now = performance.now();
    const LIFE = 850;
    for (let i = game.floaties.length - 1; i >= 0; i--) {
      const f = game.floaties[i]!;
      const age = now - f.bornAt;
      if (age > LIFE) {
        game.floaties.splice(i, 1);
        continue;
      }
      const frac = age / LIFE;
      const p = this.liftedWTS(f.x, f.y - frac * 0.8);
      ctx.globalAlpha = 1 - frac * frac;
      // Pop: numbers land big and settle — impact you can read.
      const pop = 1 + 0.55 * Math.max(0, 1 - age / 130);
      ctx.font = `700 ${Math.max(13, s * 0.38 * (f.sizeMul ?? 1) * pop)}px 'Trebuchet MS', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(24, 14, 32, 0.9)';
      ctx.fillText(f.text, p.x + 2, p.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }

  private drawHpBar(game: ClientGame): void {
    if (game.ownEid === null) return;
    // A cinematic owns the frame: the gauge bows out with the HUD
    // (it pokes over the letterbox otherwise — nothing may compete
    // with the scene).
    if (this.cineEid !== null) return;
    const ctx = this.ctx;
    const bw = Math.min(260, this.w * 0.36);
    const bh = 14;
    const bx = this.w / 2 - bw / 2;
    // Sits just above the hotbar (56px slots + 14px inset).
    const by = this.h - 96;
    // The main vitality gauge: a chamfered block, framed hard.
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.beginPath();
    chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
    ctx.fill();
    ctx.fillStyle = '#54303a';
    ctx.fillRect(bx, by, bw, bh);
    const frac = game.ownHpPct / 255;
    ctx.fillStyle = frac > 0.5 ? '#4fc06a' : frac > 0.25 ? '#e8b64c' : '#c4553d';
    ctx.fillRect(bx, by, Math.max(3, bw * frac), bh);
    ctx.strokeStyle = '#6a4f35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
    ctx.stroke();
  }
}

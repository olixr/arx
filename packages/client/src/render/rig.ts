import { CLOTH_COLORS, HAIR_COLORS, PoseState, SKIN_TONES, type Look } from '@arx/shared';
import { ELEMENT_COLORS, enchantDef, itemDef } from '@arx/content';
import { arxMark, markPulse, resolveWornLight, SLOT_GLINT_PHASE, type ArxMark, type SlotLight } from './wornLight.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  BOW_GRIP_X,
  bladeStyle,
  bowStyle,
  drawBow,
  drawGreatweapon,
  drawPole,
  drawSword,
  drawStaff,
  greatStyle,
  poleStyle,
  staffStyle,
  wieldClass,
  type BladeFx,
  type StaffFx,
} from './weapons.js';
import { drawTool, toolStyle } from './tools.js';
import {
  drawGolemArm,
  paintGolemBody,
  paintGolemFoot,
  paintGolemHead,
  type GolemLook,
} from './golems.js';
import {
  GUT_REST,
  drawOgreArm,
  paintOgreBody,
  paintOgreFoot,
  paintOgreHead,
  type GutSim,
  type OgreLook,
  type PendantSim,
} from './ogre.js';
import {
  drawSkralArm,
  drawSkralCrest,
  paintSkralBody,
  paintSkralFoot,
  paintSkralHead,
  paintSkralWrap,
  skralCrestCarriage,
  skralCrestStyle,
  type SkralLook,
} from './skral.js';
import {
  drawHobEar,
  drawHobgoblinArm,
  hobEarCarriage,
  hobEarStyle,
  paintHobgoblinBody,
  paintHobgoblinFoot,
  paintHobgoblinHead,
  type HobgoblinLook,
} from './hobgoblin.js';
import {
  LegRig,
  chooseLimbSign,
  solveLimb,
  solveLimb2Into,
  solveLimbInto,
  type LegPose,
  type LegRigConfig,
  type LimbSolve,
} from './legs.js';
import {
  FINISHER_PHASES,
  FLOURISH_OFF_PHASE_MS,
  bladeCarriage,
  finisherLean,
  icepickPath,
  idleFlourish,
  thrustPath,
  type Grip,
} from './carriage.js';
import {
  ECHO_START,
  echoWake,
  resolveEcho,
  resolveStrike,
  schoolPhases,
  strikeGhosts,
  strikeWake,
  variantCount,
  type EchoFrame,
  type ResolvedStrike,
  type StrikeSchool,
  type StrikeWake,
} from './strikes.js';
import { STOW_HANDOFF, sheathePhases, stowBack, stowBlade } from './sheath.js';
import {
  WORK_BOOK,
  WORK_VOICE_NEUTRAL,
  resolveWork,
  workCycleU,
  type CraftWorkKind,
  type WorkKind,
  type WorkVoice,
} from './work.js';
import {
  EarSim,
  drawWingEar,
  earRestChain,
  type EarCarriage,
  type EarChain,
  type EarStyle,
} from './earPhysics.js';
import {
  BOW_PLANE_SOFT,
  GREAT_FINISHER_PHASES,
  GREAT_POMMEL_CHOKE_S,
  POLE_GUARD_PITCH,
  STAFF_GUARD_CHOKE_S,
  WIELD_GROUND_K,
  armPump,
  awayPeekK,
  bandFlag,
  bowWield,
  easeRestSide,
  facingFrame,
  gaitK,
  lifelineYaw,
  LIFT_ALT_K,
  PEEK_HANG_K,
  projectAim,
  greatFinisherLean,
  greatFinisherPath,
  greatWield,
  poleWield,
  projectCarry,
  runnerLift,
  settleElbowPole,
  staffWield,
} from './wield.js';
import {
  drawShield,
  drawShieldStraps,
  isShieldKind,
  shieldStyle,
  solveShield,
  type ShieldFrame,
  type ShieldStyle,
} from './shields.js';
import { NPC_HAIR_STYLE, drawHairBack, drawHairFront, type HairCover } from './hair.js';
import { drawBeard } from './beard.js';
import {
  bodyStyle,
  bootStyle,
  drawHelmet,
  drawOffhandOnArm,
  drawPauldron,
  drawQuiver,
  drawTorsoGarment,
  gloveStyle,
  helmStyle,
  legStyle,
  offhandStyle,
  type GloveStyle,
} from './armor.js';

export type { LegPose } from './legs.js';

/**
 * Procedural rigs with genuine two-segment IK legs — the humanoid
 * puppet and the beast bodies both walk on the universal LegRig
 * (legs.ts): feet planted in world space, steps committed when the
 * body drifts, knees solved by two-bone IK. Everything here is the
 * PAINT over that shared skeleton.
 */

const OUTLINE = '#241a2e';
const SKIN = '#e8b98a';
const BOOT = '#4a3324';

/**
 * Gait proportions, all derived from one character height (in tiles) —
 * the same construction as herotown's puppet, ported to tile units.
 */
const HEIGHT = 1.0;
const LEG_LEN = HEIGHT * 0.46; // thigh + shin
const LEG_RISE = LEG_LEN * 0.9; // hip height above ground, near-straight
const HIP_HALF = HEIGHT * 0.1; // half stance width
const LIFT_AMP = HEIGHT * 0.14;
const STRETCH = 1.15; // legs may straighten slightly past 2L — bounding
const RUN_SPEED = 5; // full-tilt reference speed (tiles/sec)

/**
 * The humanoid gait is the herotown construction that finally nailed
 * it, now expressed as a CONFIG of the universal rig: a billboard
 * biped — hips fixed on the screen X axis, feet striding along the
 * travel from those fixed hips, alternating one-at-a-time.
 */
const HUMANOID_LEG_CFG: LegRigConfig = {
  legs: [
    { fwd: 0, side: -HIP_HALF, group: 0 },
    { fwd: 0, side: HIP_HALF, group: 1 },
  ],
  legLen: LEG_LEN,
  rise: LEG_RISE,
  liftAmp: LIFT_AMP,
  runSpeed: RUN_SPEED,
  stretch: STRETCH,
  billboard: true,
  // Bipeds RUN: at full tilt the gait goes airborne between strides.
  flight: true,
};

/**
 * THE GIANT GAIT (docs/ogres-plan.md): the humanoid solver, statured.
 * A 2.5× body walked on the size-1 config planted its feet on a
 * man-width track under giant-width hips — shins converged, the
 * side-on stance narrowing walked the far foot across the centerline,
 * and the human swing ceiling forced mincing double-time steps. The
 * statured solver runs WORLD-TRUE giant legs (track, stride, reach,
 * lift, swing time all × stature) and reports RIG-UNIT dynamics:
 * rise/bob/lift come back ÷ stature, because every painter multiplies
 * by `s` which already carries the size — world-true twice is a
 * double-lift. Positions stay world coordinates, untouched.
 *
 * Stature 1 is the exact legacy solver — no shipped body changes.
 * Future giant-kin (trolls rebuilt, true giants) pass their own.
 */
export class LegSolver extends LegRig {
  private readonly stature: number;
  constructor(stature = 1) {
    super(
      stature === 1
        ? HUMANOID_LEG_CFG
        : {
            ...HUMANOID_LEG_CFG,
            legs: [
              { fwd: 0, side: -HIP_HALF * stature, group: 0 },
              { fwd: 0, side: HIP_HALF * stature, group: 1 },
            ],
            legLen: LEG_LEN * stature,
            rise: LEG_RISE * stature,
            // THE MASS LAW: geometry scales with the body — DYNAMICS
            // do not. Mass grows with the CUBE of stature, and a body
            // that heavy moves nothing exuberantly:
            // • Foot lift grows at a third of the geometry (a linear
            //   lift forced a deep mid-swing knee and the FROG FLARE;
            //   the heaviest walkers on earth shuffle — feet skim).
            liftAmp: LIFT_AMP * (1 + 0.35 * (stature - 1)),
            // • Strides run relatively SHORTER than a man's — the
            //   column must stay under the mass; overreach is a fall.
            strideScale: 1.65 * 0.82,
            // • The vigor reference rises with stature, so the same
            //   world speed reads as a lower gait effort — less
            //   crouch, less bounce, the unhurried carry of weight.
            runSpeed: RUN_SPEED + 1.7 * (stature - 1),
            // • A giant NEVER leaves the ground — no aerial phase,
            //   whatever the speed. Flight is for bodies that weigh
            //   what their silhouette suggests.
            flight: false,
            // • The ponderous ceiling: swing time grows with the leg.
            swingMax: 0.35 + 0.16 * (stature - 1),
          },
    );
    this.stature = stature;
  }

  override update(bx: number, by: number, dirRaw: number, rawDt: number): LegPose {
    const lp = super.update(bx, by, dirRaw, rawDt);
    if (this.stature === 1) return lp;
    const inv = 1 / this.stature;
    return {
      ...lp,
      rise: lp.rise * inv,
      bob: lp.bob * inv,
      feet: lp.feet.map((f) => ({ x: f.x, y: f.y, lift: f.lift * inv })),
    };
  }
}

/**
 * Knee pole constraint — ANATOMICAL, never kinematic. The knee bends
 * toward the body's FACING (industry rigs parent the pole target to
 * the pelvis), so a backpedaling or strafing character keeps forward
 * knees while the feet stride along the travel — bending knees toward
 * velocity is what drew broken, inverted legs the moment aim and
 * travel disagreed. Side-on, the sagittal term dominates and knees bow
 * with the facing; front/back-on the flexion is edge-on to the camera,
 * so a gentle down-screen + outward preference takes over — one
 * continuous law with no speed blend, so the choice is deterministic
 * from the pose alone. Per-leg hysteresis (`memory`) still smooths the
 * boundary between regimes.
 *
 * `cx, cy` is one unit perpendicular of the hip→foot line (screen);
 * `fx, fy` is the facing unit; returns +1 to use the perpendicular,
 * -1 to use its negation.
 */
export function chooseKneeSign(
  cx: number,
  cy: number,
  fx: number,
  fy: number,
  sideSgn: number,
  memory: number,
): number {
  const frontal = 1 - Math.abs(fx);
  // Sagittal: bow with the facing. Frontal: bow down-screen (toward
  // the camera) with only a whisper of outward — down must DOMINATE
  // front-on, or steep chords let the outward term flip a knee upward.
  const prefX = fx * 0.9 + sideSgn * 0.1 * frontal;
  const prefY = 0.38 * frontal + Math.max(0, fy) * 0.25;
  const m = Math.hypot(prefX, prefY) || 1;
  const score = (cx * prefX + cy * prefY) / m;
  const target = score >= 0 ? 1 : -1;
  // Hysteresis: a weak winner doesn't overturn the standing choice.
  if (memory !== 0 && target !== memory && Math.abs(score) < 0.18) return memory;
  return target;
}

export interface RigPose {
  /** Screen position of the body's ground point. */
  x: number;
  y: number;
  scale: number;
  dir: number;
  pose: PoseState;
  poseT: number;
  /** 0..1 bow-draw charge (own: live input; remotes: time in Draw pose). */
  drawT: number;
  /**
   * 0..1 settle into rest carriage — time since leaving the last
   * non-restful pose. Runs on its own clock so Idle↔Walk transitions
   * never reset it (poseT resets on EVERY pose change, and blending
   * carriage on it made the weapon re-settle at each stop and start).
   */
  restT: number;
  /** Wall-clock ms for micro-motion (full-draw tremble, string buzz). */
  nowMs: number;
  /** Solved feet in screen space (already projected by the caller). */
  feet: Array<{ x: number; y: number; lift: number }>;
  /** Gait bob + hip rise from the solver (tile units). */
  bob: number;
  rise: number;
  /** Fake-3D squash factor from the solver. */
  wScale: number;
  /** Unit travel direction + strength from the solver (arm swing). */
  poleX: number;
  poleY: number;
  poleStrength: number;
  /** Gait blend from the solver: 0 walk mechanics → 1 sprint. */
  runF: number;
  /** Travel·facing alignment: 1 forward, -1 backpedal. */
  align: number;
  /** Per-leg knee-sign hysteresis, owned by the caller's anim state. */
  kneeMemory: number[];
  /**
   * Arm-carriage memory (caller-owned, like kneeMemory): the dual-wield
   * depth flip's hysteresis bit, plus the smoothed rest-side state —
   * when the facing crosses vertical the hands EASE across the body
   * over ~240ms instead of mirror-teleporting (the wrist-snap fix).
   * Absent = stateless fallbacks (single thresholds, instant side).
   */
  depthMemory?: {
    mainBehind: boolean;
    /** Facing-camera depth: the off arm rides in FRONT of the torso. */
    offFront?: boolean;
    side?: number;
    prevSide?: number;
    sideFlipMs?: number;
    /** When the facing first asked for a side flip (dwell debounce). */
    sideWantMs?: number;
    /** Low-passed arm-swing drive (see the SMOOTHED SWING law). */
    sw?: number;
    swMs?: number;
    /**
     * Per-arm elbow-side hysteresis (THE REMEMBERED ELBOW) — the same
     * chooseLimbSign memory the knees carry, so a borderline pole can
     * never snap an elbow through the arm. Lazily seeded by the rig.
     */
    mainElbow?: { sign: number };
    offElbow?: { sign: number };
    /**
     * THE FLIP EARNS ITS HYSTERESIS (arms-v3 Phase 4): per-flag layer
     * band states — every paint-order decision holds its last verdict
     * through the dead zone between its enter/exit thresholds.
     */
    bands?: Record<string, boolean>;
    /**
     * THE LATCHED SWING (strikes.ts): the pose byte this swing latched
     * on, the swing counter (variant picker), and the mirror side —
     * all frozen at the beat's first frame so a mid-swing turn can
     * never flip the arc and a combo string walks its variants.
     */
    strikePose?: number;
    strikeSeq?: number;
    strikeSide?: 1 | -1;
  };
  bodyColor: string;
  hurt: boolean;
  isOwn: boolean;
  weaponItem?: string;
  /** Mainhand enchant id — overlays the enchant's fx on the weapon art. */
  weaponEnch?: string;
  /** Offhand enchant id — a dual-wielded second blade burns its own hue. */
  offhandEnch?: string;
  /**
   * THE WORN LIGHT: enchant ids by armor slot (head/body/legs/gloves/
   * boots/offhand/cape). The rig resolves them into per-slot marks and
   * overlays each onto its piece's style — see withArx.
   */
  armorEnch?: Partial<Record<string, string>>;
  /** Cosmetic idle carry: 'rogue' rakes a blade down-back, reverse grip. */
  carryStyle?: 'normal' | 'rogue';
  /** Off-fist grip — a dual wielder's second blade rides its own way. */
  carryOff?: 'normal' | 'rogue';
  bodyItem?: string;
  /** Equipped head gear — drawn as a real helmet over the skull. */
  headItem?: string;
  /** Equipped leg armor — recolors/overlays the IK leg strokes. */
  legsItem?: string;
  /** Equipped boots — replace the bare foot chip with real footwear. */
  bootsItem?: string;
  /** Equipped gloves — dress the hand mitts and wrists on both arms. */
  glovesItem?: string;
  /** Equipped offhand — shield on the arm, quiver on the back, etc. */
  offhandItem?: string;
  /** A cape is worn — back-mounted gear drops to the hip to clear it. */
  hasCape?: boolean;
  /** Player-chosen base look (skin/hair/beard/cloth palettes). */
  look?: Look;
  /** Overall size multiplier (goblins ~0.8, champions ~1.2). */
  size?: number;
  skinColor?: string;
  /**
   * THE BONE DIALECT: swap every flesh painter for bone — skull for
   * head, ribcage for torso, bare bone strokes for limbs — while the
   * rig, carriage, capes, and helmets keep working untouched.
   */
  skeletal?: SkeletonLook;
  /**
   * THE SCALE DIALECT: swap the flesh head for the kobold's horned
   * muzzle, grow a tail off the hip, and claw the bare feet — while
   * the rig, carriage, and facing bands keep working untouched.
   */
  kobold?: KoboldLook;
  /**
   * THE FUR DIALECT: swap the flesh head for the gnoll's hyena muzzle
   * under tall round ears and a bristled crest, hunch the back, hang a
   * bushy tail off the hip, and paw the bare feet — while the rig,
   * carriage, and facing bands keep working untouched.
   */
  gnoll?: GnollLook;
  /**
   * THE GREENSKIN DIALECT: swap the flesh head for the goblin's wing
   * ears, hook nose, and needle grin, swell the pot gut over bandy
   * shanks, and bare the knuckly hands and flap feet — while the rig,
   * carriage, and facing bands keep working untouched.
   */
  goblin?: GoblinLook;
  /**
   * THE EAR IS A SIMULATION (earPhysics.ts): the goblin's wing ears
   * as elastic bodies — caller-owned on the anim map exactly like
   * kneeMemory and depthMemory, ticked by the rig (it owns the exact
   * skull anchor). Absent = the stateless rest chains, so audit
   * sheets, static previews, and tests paint the settled silhouette.
   */
  earSim?: EarSim;
  /**
   * THE CONSTRUCT DIALECT (docs/golems-plan.md): swap head, torso,
   * limbs, and feet for one of the four golem builds — stacked stone,
   * forged plate, cracked crust, sheared ice — while the rig,
   * carriage, and facing bands keep working untouched. Golems wear no
   * garment and hold no weapon; the body IS the wardrobe.
   */
  golem?: GolemLook;
  /**
   * THE GIANT DIALECT (docs/ogres-plan.md): the ogre — small sloped
   * skull, underbitten jaw, and a torso authored as a projected 3D
   * carriage whose gut is a live simulation. Ogres keep the weapon
   * lane (a greatclub is the point) but wear no tailored garment.
   */
  ogre?: OgreLook;
  /** Caller-owned gut mass sim — the rig ticks it at the true torso
   *  anchor; absent (posters, sheets, corpses) THE ONE REST paints. */
  ogreGut?: GutSim;
  /** Caller-owned belt-trophy pendant sim — same contract. */
  ogrePendant?: PendantSim;
  /**
   * THE BRINE DIALECT (docs/skral-plan.md): swap the flesh head for
   * the skral's lantern-eyed fish skull under a SIMULATED crest fin
   * (the earSim slot, brine verse), pale the belly, web the hands and
   * fan the feet — while the rig, carriage, and facing bands keep
   * working untouched.
   */
  skral?: SkralLook;
  /**
   * THE LEGION DIALECT (docs/hobgoblin-plan.md): swap the flesh head
   * for the hobgoblin's war mask — flat broad face, one brow ledge,
   * painted open helm — under SWEPT ear blades (the earSim slot) and
   * the SIMULATED war queue (its own sim slot below), square the
   * carriage, iron the habit, and shoe the feet — while the rig,
   * carriage, and facing bands keep working untouched. Shares not
   * one line with the greenskin dialect: the master race is a
   * different argument, not a bigger goblin.
   */
  hobgoblin?: HobgoblinLook;
  /** Time-based swing driver for the gather pose. */
  gatherPhase: number;
  /**
   * Which station a Craft pose is working: picks the choreography and
   * the conjured prop that goes with it. THE VERB IS VISIBLE — all
   * ten StationTypes speak their own body language (hammer-and-tongs,
   * stoking, the ladle stir, the mallet taps, the pour-and-swirl, the
   * hide scrape, the shuttle pass, the knife strokes, the rune trace,
   * the saw's push-pull).
   */
  craftKind?: CraftWorkKind | null;
  /**
   * The Gather target is a forage plant: bare-handed picking — one
   * hand steadies the stems while the other reaches, plucks, and
   * carries the harvest back to the belt pouch. No tool is drawn.
   */
  foraging?: boolean;
  /**
   * The Gather target is a fishing water: THE PATIENT LINE — the rod
   * casts, settles into the low two-hand hold, and tugs on the yield
   * beat. `fishTo` is the water point in SCREEN space (the caller
   * projects the node tile) — the cast line sags from the rod tip to
   * a bobber there, and the tug dips it. Absent, the rod works
   * without a drawn line (sheets, previews).
   */
  fishing?: boolean;
  fishTo?: { x: number; y: number };
  /**
   * Seated rest blend, 0..1, SMOOTHED BY THE CALLER (never poseT — it
   * resets on pose flips and would pop the stand-up). Drops the hips
   * to the ground, plants the hands, and forces knees up-screen; the
   * caller stretches the feet forward and leans the body back to
   * complete the armored wayside sit.
   */
  sitT?: number;
  /** Which seated posture: 0 = lounger (legs out), 1 = one knee up. */
  sitVariant?: 0 | 1;
  /**
   * WHERE the body sits. 'floor' (default) = the wayside sit above.
   * 'chair' = mounted furniture: hips ride at seatH on the seat
   * surface, feet drop square to the floor in front, knees keep the
   * anatomical facing pole, and the hands rest on the thighs.
   * 'throne' = the crown sit — upright spine, fists out to the
   * armrests. Callers pass it with the same smoothed sitT.
   * 'saddle' = the riding seat: hips at the saddle's own height, feet
   * to the caller-placed stirrups, both fists settled on the pommel.
   */
  sitStyle?: 'floor' | 'chair' | 'throne' | 'saddle';
  /** Seat surface height for chair/throne sits, tile units above ground. */
  seatH?: number;
  /**
   * Saddle sits only: the pommel grip in screen space — both hands
   * settle here (the reins are tied to the same knob by the mount
   * painter, on the same ruler, so leather and fists always meet).
   */
  reinX?: number;
  reinY?: number;
  /**
   * Sleeping blend, 0..1 (the lie recline, caller-smoothed): past 0.5
   * the eyes close — soft lid lines instead of the open pattern.
   */
  sleepT?: number;
  /**
   * Sheathe blend, 0..1, SMOOTHED BY THE CALLER (the sitT pattern —
   * never poseT). 0 = weapons in hand; rising, the hand carries the
   * weapon to its stow spot (blades to the belt, bow/staff over the
   * shoulder); past the handoff the weapon rides the BODY and the
   * empty hand walks home. Falling plays the same motion as the draw.
   */
  sheathT?: number;
}

/** Shortest signed rotation from angle `a` to angle `b` (radians). */
function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// The work-cycle clocks live in work.ts now (WORK_BOOK — THE IMPACT
// IS ONE TRUTH): the rig's swing, the renderer's particle gates, the
// sfx, and the station flash all read the same book.

/** Arm segment length (upper = fore), in tile units. */
const ARM_LEN = 0.17;

// ---- THE NAMED ANATOMY (arms-v3 Phase 1): the rest-carriage frame's
// load-bearing offsets, named and exported so the simulation tests can
// import the rig's OWN numbers instead of hand-copying them (the
// silent-desync copy the audit caught in armSolver.test.ts). All in
// units of s. NOTE: REST_HANG_DROP_S coincidentally equals ARM_LEN —
// they are different quantities; do not merge them.
/** The arm ring's height below the hip line (armY = hipY − this·s). */
export const ARM_RING_DROP_S = 0.26;
/** A relaxed fist's hang below the arm ring (main hand + bare hands). */
export const REST_HANG_DROP_S = 0.17;
/** The off blade's hang below the arm ring — a touch higher than the
 *  main: the trailing blade of a paired stance, never a mirror image. */
export const OFF_BLADE_HANG_DROP_S = 0.15;
/**
 * THE WAR GRIP's drive-fist seat: this far BEHIND the main fist along
 * the haft (negative = behind, the sign the cut book speaks). The
 * school's own cuts hand their weld down through ResolvedStrike.weldS;
 * this is the same seat held in the guard, where no cut is running.
 */
const POLE_WAR_WELD_S = -0.2;
/** Shoulder half-width (the torso trapezoid's top, before dialects). */
export const SHOULDER_HALF_S = 0.185;
/** Waist half-width (the trapezoid's bottom — the hang-width lane). */
export const WAIST_HALF_S = 0.125;
/** A settled shoulder's anatomical anchor along the shoulder bar. */
export const SHOULDER_SETTLE_K = 0.85;
/**
 * THE TURNED BAR (the turned silhouette's second channel): how much of
 * the settle spread survives the heading. Face-on the bar is a full
 * billboard bar; side-on the two shoulders stand nearly in line with
 * the camera axis, so their SCREEN spread must collapse toward the
 * body's centerline — the legs already narrow their stance 30% side-on
 * (legs.ts homes), and an upper body that keeps full spread over a
 * turned stance is exactly the "front-facing card with a turned head"
 * read. fx² keeps the falloff smooth through the diagonals. The floor
 * is 0.5, NEVER 0: the historic 3D-bar projection collapsed caps onto
 * the spine while the arms kept their spread (THE PROJECTION NEVER
 * OWNS THE BILLBOARD) — arms and sockets BOTH consume this one
 * function, so they collapse together or not at all (ONE SPREAD LAW).
 */
export function shoulderTuckK(fx: number): number {
  return 1 - 0.5 * fx * fx;
}
/**
 * THE TURNED BAR's fore-aft stagger (units of tw, signed along the
 * facing): side-on, the leading arm hangs a half-step ahead of the
 * chest line and the trailing arm behind it — the same stagger the
 * feet already take (legs.ts `stag`). Zero face-on; grows with the
 * profile so the diagonals inherit a taste of it.
 */
export function shoulderStagK(fx: number): number {
  return fx * Math.abs(fx);
}
/**
 * THE PERSPECTIVE SHEET (dev-only): when `on`, drawHumanoid records
 * the solved shoulder geometry of the last figure drawn so a lab can
 * overlay red/green calibration lines — the solved bar, the settle
 * anchors, the pauldron sockets and the honest 3D projection of the
 * shoulder bar — over the art. The labs flip it on (`?dbg=1`); the
 * game never does. Zero cost off: one boolean check per draw.
 */
export const RIG_DEBUG = {
  on: false,
  x: 0,
  hipY: 0,
  shoulderY: 0,
  s: 0,
  tw: 0,
  wS: 0,
  dir: 0,
  mainShX: 0,
  mainShY: 0,
  offShX: 0,
  offShY: 0,
  anchorMainX: 0,
  anchorOffX: 0,
  sockets: [] as Array<{ x: number; y: number; depthK: number }>,
  // THE HUNCH AUDIT extras: the hand-orbit ring, the clamped fist
  // targets, the final torso lean, and the head hull — plus every
  // solved arm chain (shoulder→elbow→hand) as drawArm actually drew
  // it. Labs overlay these in distinct colors to convict anchor bugs.
  armY: 0,
  lean: 0,
  headX: 0,
  headY: 0,
  headR: 0,
  mainFistX: 0,
  mainFistY: 0,
  offFistX: 0,
  offFistY: 0,
  arms: [] as Array<{ sx: number; sy: number; kx: number; ky: number; ex: number; ey: number }>,
  // THE PRIMARY-COLOR ARMS (the depth wheel's convicting instrument):
  // when set, each arm paints SOLID in its tint — main vs off become
  // unmistakable at a glance, so a layer flip that puts the far arm on
  // the chest convicts itself in a screenshot. Labs only; the game
  // never writes these. Independent of `on` (the overlay recorder).
  tintMain: null as string | null,
  tintOff: null as string | null,
};
/** The hang-width lane's flare off the waist line (hangW's ww term). */
export const HANG_WAIST_K = 1.08;
/** shoulderY sits this far below the shoulder line's top (units of s). */
export const SHOULDER_Y_DROP_S = 0.06;
/** Hip line → shoulder line rise before the crouch/squash factors. */
export const TORSO_RISE_S = 0.46;

/**
 * THE TWO PROFILE READS (arms-v3 Phase 1: named, single-sourced).
 * The RIG's facing weight is the honest cosine — `profileK = |fx|` —
 * and every arm/carry/depth law rides that. The FACE painters use this
 * snugger read instead: |fx| boosted 15% and clamped, so the head
 * commits to its profile band a beat before the body does (eyes and
 * muzzles read wrong mid-turn if the face lags the turn). Thirteen
 * mob-head painters each re-derived this inline before it was named —
 * one drifted constant away from thirteen different face laws.
 */
export function faceProfileK(fx: number): number {
  return Math.min(1, Math.abs(fx) * 1.15);
}

/** Shared per-frame IK scratches (see solveLimbInto's contract). */
const ARM_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
/**
 * THE FACE SANDWICH's segment channel (the stoop lane, round 2). On
 * the skral the skull out-widens the shoulder bar, so a front-layer
 * arm's root half genuinely lives BEHIND the head — painted whole
 * over the face it sprouted from the eye. The two sandwich stations
 * in drawHumanoid paint such arms twice around the head: upper arm
 * under the skull, forearm + hand over it, emerging past the head
 * silhouette (the depth read the flat pass could never give). The
 * segment rides a module channel exactly like RIG_DEBUG — rendering
 * is single-threaded, the stations set it around a drawArm call and
 * clear it after — so drawArm's crowded positional tail (a live
 * bench for every new dialect) never has to grow a parameter.
 */
let armSegPass: 'under' | 'over' | null = null;
/** Per-draw knee scratch (hot path, no alloc): the leg loop records
 * each solved knee so the seated arm vocabulary can drape a forearm
 * over the raised kneecap it actually drew. d = hip→foot span; the
 * SMALLER span is the more bent — the raised — knee. */
const KNEE_SCRATCH = [
  { x: 0, y: 0, d: 0 },
  { x: 0, y: 0, d: 0 },
];
/** Per-draw leg-frame scratch (hot path, no alloc): the solve loop
 * records each leg's hip and clamped foot so the deferred leg PAINT
 * layer (THE FAR SIDE GOES BEHIND THE LEGS) redraws without
 * re-solving. Knee lives in KNEE_SCRATCH. */
const LEG_POSE_SCRATCH = [
  { hipX: 0, footX: 0, footY: 0 },
  { hipX: 0, footX: 0, footY: 0 },
];
const LEG_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };
/** Hoisted per-foot paint tables — loop literals in the leg painter
 *  alloc once per LEG per frame otherwise. */
const CLAW_TOES = [-0.55, 0, 0.55] as const;
/** THE FOOT KNOWS THE GROUND — foot-frame digit tables. Bear digits:
 *  lateral seats (×foot width) of the four toe lobes across the pad's
 *  leading edge, one claw per digit. Turtle claws: the three-horn fan
 *  of the sprawled forefoot. */
const BEAR_TOES = [-0.63, -0.22, 0.22, 0.63] as const;
const TURTLE_CLAW_FAN = [-0.55, 0, 0.55] as const;
/** Species whose horn splits at the toe — the cloven line. Coursers
 *  and garrons keep the whole horn. */
const CLOVEN_HOOF = /^(cow|bull|boar|dire_boar|ram|sheep|stag|hind)/;

/**
 * One two-segment arm: shoulder → elbow (sleeve) → forearm (skin) →
 * hand, solved by the same two-bone IK as the legs. The preference
 * vector decides which way the elbow bends — down-and-out at rest,
 * back-and-up for a drawn bowstring.
 */
/**
 * Pure two-bone arm solve: clamps the hand into reach and places the
 * elbow on whichever side of the shoulder→hand line the preference
 * vector points. Exported for simulation tests.
 */
export function solveArm(
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  L: number,
  prefX: number,
  prefY: number,
): { ex: number; ey: number; kx: number; ky: number } {
  // Arms may straighten just a touch past full extension.
  return solveLimb(sx, sy, hx, hy, L, 1.08, prefX, prefY);
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  prefX: number,
  prefY: number,
  sleeve: string,
  skin: string,
  s: number,
  /** Full-sleeve cloth: forearm wears this color with a belled cuff. */
  cuff?: string,
  /** Equipped gloves — mitt recolor, wrist cuff, bracer, knuckle gear. */
  glove?: GloveStyle | null,
  hurt?: boolean,
  /** Bare bone: humerus + forearm as thin bone strokes with condyle
   *  knobs at the joints and a skeletal claw for a hand. Overrides
   *  every cloth/glove branch — the dead wear nothing on their arms. */
  bone?: SkeletonLook | null,
  /** Caller-owned elbow-side memory (THE REMEMBERED ELBOW). */
  elbow?: { sign: number },
  /** THE CROSSING LOCKS THE ELBOW: while the rest side eases across
   *  the body the flare pole collapses through zero, and the leftover
   *  gravity term scores pure chord noise — noise that COMMITS inboard
   *  sides mid-crossing (the wiggle-walk inversion). A held elbow
   *  keeps its standing side outright through the ease and flips
   *  exactly once, when the settled pole reclaims it. */
  elbowHold?: boolean,
  /** Wall-clock ms — the knuckle channel's breath (THE WORN LIGHT). */
  nowMs?: number,
  /** Fur dialect: heavy furred arms ending in broad clawed paws —
   *  overrides the cloth/glove branches the way bone does; a gnoll
   *  never owned a sleeve. */
  gno?: GnollLook | null,
  /** Construct dialect: stone, plate, crust, or ice — the whole limb
   *  machine swaps per build (golems.ts). Overrides everything the
   *  way bone does; a golem's arm IS its armor. */
  gol?: GolemLook | null,
  /** Greenskin dialect: wiry bare hide arms ending in knuckly hands
   *  too big for them — overrides the cloth/glove branches the way
   *  bone does; goblin tailoring stops at the rope belt. */
  gob?: GoblinLook | null,
  /** Giant dialect: THE KNUCKLE HANG — unequal bones (short upper,
   *  LONG forearm) solved right here, inverted taper, ham fists.
   *  Overrides everything the way bone does. */
  ogr?: OgreLook | null,
  /** Brine dialect: lean wet-hide arms with a forearm fin and webbed
   *  three-ray hands — overrides the cloth/glove branches the way
   *  bone does; the skral never owned a sleeve. */
  skr?: SkralLook | null,
  /** Legion dialect: a soldier's arm — bare hide above the elbow,
   *  the banded bracer below it, a gauntleted fist. Overrides the
   *  cloth/glove branches the way bone does; the legion issues its
   *  own kit. */
  hob?: HobgoblinLook | null,
): { ex: number; ey: number; kx: number; ky: number } {
  // THE REMEMBERED ELBOW: the arms carry the same side-choice
  // hysteresis the knees have had since the quadruped rig — score the
  // chord perpendicular against the anatomical pole and let a
  // borderline score NEVER overturn the standing choice. The frames
  // that used to invert an elbow are exactly the near-degenerate ones
  // (a pole almost parallel to the chord: the N/S run before the pole
  // fix, the 240ms side-flip ease where the flare sweeps through
  // zero); with memory they hold the last committed side, and the
  // elbow flips only when the pole genuinely claims the other side.
  // The clamp inside the solve scales the chord uniformly, so this
  // perpendicular is the solve's own.
  if (elbow) {
    const ddx = hx - sx;
    const ddy = hy - sy;
    const dd = Math.hypot(ddx, ddy) || 1e-4;
    const cxn = -ddy / dd;
    const cyn = ddx / dd;
    const sgn =
      elbowHold && elbow.sign !== 0
        ? elbow.sign
        : chooseLimbSign(cxn, cyn, prefX, prefY, elbow.sign);
    elbow.sign = sgn;
    prefX = cxn * sgn;
    prefY = cyn * sgn;
  }
  // Hot path: every visible humanoid solves two arms a frame — reuse
  // one scratch (destructured immediately) instead of allocating.
  // THE KNUCKLE HANG: the ogre alone solves UNEQUAL bones — a short
  // heavy upper arm over a LONG forearm (total reach past the knee),
  // so the rest hang crooks at the elbow like an ape's, not a man's.
  // THE APE BONES (the stoop lane): the hunched dialects carry a short
  // humerus over a LONG forearm — skeleton facts like the lynx's
  // segSplit, so the rest hang crooks high and reaches low the way
  // every knuckle-walker reference draws. Each total·stretch exceeds
  // the human arm's clamped span, so every fist target the frame
  // hands down stays reachable — mitt and steel meet at one point.
  const { ex, ey, kx, ky } = ogr
    ? solveLimb2Into(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * 0.88 * s, ARM_LEN * 1.26 * s, 1.08, prefX, prefY)
    : gno
      ? solveLimb2Into(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * 0.94 * s, ARM_LEN * 1.24 * s, 1.08, prefX, prefY)
      : skr
        ? solveLimb2Into(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * 0.92 * s, ARM_LEN * 1.18 * s, 1.08, prefX, prefY)
        : solveLimbInto(ARM_SOLVE, sx, sy, hx, hy, ARM_LEN * s, 1.08, prefX, prefY);

  if (RIG_DEBUG.on && armSegPass !== 'over') RIG_DEBUG.arms.push({ sx, sy, kx, ky, ex, ey });

  if (gol) {
    drawGolemArm(ctx, gol, sx, sy, kx, ky, ex, ey, s, hurt ?? false, nowMs ?? 0);
    return { ex, ey, kx, ky };
  }

  if (ogr) {
    drawOgreArm(ctx, ogr, sx, sy, kx, ky, ex, ey, s, hurt ?? false, nowMs ?? 0);
    return { ex, ey, kx, ky };
  }

  if (skr) {
    drawSkralArm(ctx, skr, sx, sy, kx, ky, ex, ey, s, hurt ?? false, nowMs ?? 0, armSegPass ?? undefined);
    return { ex, ey, kx, ky };
  }

  if (hob) {
    drawHobgoblinArm(ctx, hob, sx, sy, kx, ky, ex, ey, s, hurt ?? false, nowMs ?? 0);
    return { ex, ey, kx, ky };
  }

  if (bone) {
    const hv = bone.heavy;
    const bcol = hurt ? '#ffffff' : bone.bone;
    ctx.lineCap = 'round';
    // Humerus: one clean bone shaft, thinner than any sleeved arm.
    ctx.strokeStyle = hurt ? '#ffffff' : shade(bone.bone, -3);
    ctx.lineWidth = Math.max(2, s * 0.06 * hv);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    // Forearm: slightly slighter still — the taper of real bone.
    ctx.strokeStyle = bcol;
    ctx.lineWidth = Math.max(2, s * 0.048 * hv);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Elbow condyle: the joint knob wider than either shaft — the
    // single mark that makes a stroked limb read as articulated bone.
    ctx.fillStyle = bcol;
    ctx.beginPath();
    ctx.arc(kx, ky, Math.max(1.6, s * 0.038 * hv), 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(bone.bone, -22);
      ctx.fillRect(kx - s * 0.026 * hv, ky - s * 0.007, s * 0.052 * hv, s * 0.014);
    }
    // Skeletal claw: the tapered hand mold in bone, split by dark
    // finger seams so it reads as fleshless phalanges, not a mitt.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ey - ky, ex - kx));
    drawTaperedHand(ctx, bcol, s * 0.92);
    if (!hurt) {
      ctx.strokeStyle = shade(bone.bone, -30);
      ctx.lineWidth = Math.max(1, 0.014 * s);
      for (const oy of [-0.02, 0.02]) {
        ctx.beginPath();
        ctx.moveTo(0.024 * s, oy * 2.2 * s);
        ctx.lineTo(0.076 * s, oy * 1.4 * s);
        ctx.stroke();
      }
      // Wrist knob seats the claw on the forearm.
      ctx.fillStyle = shade(bone.bone, -10);
      ctx.beginPath();
      ctx.arc(-0.05 * s, 0, Math.max(1.2, s * 0.024 * hv), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return { ex, ey, kx, ky };
  }

  if (gno) {
    // THE FUR DIALECT arm: seven feet of scavenger swings from HEAVY
    // shoulders — a thick furred upper arm tapering through a leaner
    // forearm into a broad paw. The taper is the anatomy argument:
    // mass lives up top, exactly where the hunched species carries it.
    const hv = gno.heavy;
    const furC = hurt ? '#ffffff' : shade(gno.fur, -2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = furC;
    ctx.lineWidth = Math.max(2, s * 0.108 * (0.9 + 0.2 * hv));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = hurt ? '#ffffff' : shade(gno.fur, -10);
    ctx.lineWidth = Math.max(2, s * 0.08 * (0.92 + 0.16 * hv));
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (!hurt) {
      // The elbow tuft: two ragged fur wedges off the OUTSIDE of the
      // joint — the side the elbow actually bent toward — so every
      // silhouette edge on this body breaks like coat, never tube.
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      let tx = kx - mx;
      let ty = ky - my;
      const tl = Math.hypot(tx, ty);
      if (tl > s * 0.008) {
        tx /= tl;
        ty /= tl;
        ctx.fillStyle = shade(gno.fur, -6);
        for (const [along, sizeK] of [[-0.2, 1], [0.24, 0.75]] as const) {
          const bx = kx + (ex - kx) * along * 0.3;
          const by = ky + (ey - ky) * along * 0.3;
          const tuft = s * 0.05 * sizeK * (0.9 + 0.2 * hv);
          ctx.beginPath();
          ctx.moveTo(bx - ty * tuft * 0.5, by + tx * tuft * 0.5);
          ctx.lineTo(bx + tx * tuft * 1.5, by + ty * tuft * 1.5);
          ctx.lineTo(bx + ty * tuft * 0.5, by - tx * tuft * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // The paw: a broad hide-backed mitt wider than the forearm, split
    // by knuckle seams, with dark claws raking past the fingers — the
    // hand of a thing that digs through carcasses. Local +x runs down
    // the fingers, exactly like the glove frame.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ey - ky, ex - kx));
    const pawW = s * 0.082 * (0.92 + 0.16 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gno.skin, -4);
    ctx.beginPath();
    chamferRect(ctx, -0.05 * s, -pawW, 0.152 * s, pawW * 2, 0.032 * s);
    ctx.fill();
    if (!hurt) {
      // Fur cuff lapping the wrist: coat flows INTO the paw.
      ctx.fillStyle = shade(gno.fur, -10);
      ctx.beginPath();
      chamferRect(ctx, -0.062 * s, -pawW * 1.06, 0.05 * s, pawW * 2.12, 0.018 * s);
      ctx.fill();
      // Knuckle seams: two dark ticks splitting the mitt into fingers.
      ctx.strokeStyle = shade(gno.skin, -26);
      ctx.lineWidth = Math.max(1, 0.013 * s);
      for (const oy of [-0.34, 0.34]) {
        ctx.beginPath();
        ctx.moveTo(0.04 * s, oy * pawW);
        ctx.lineTo(0.092 * s, oy * pawW * 0.8);
        ctx.stroke();
      }
      // The claws: three dark hooks past the leading edge.
      ctx.fillStyle = shade(gno.mask, -12);
      for (const oy of [-0.62, 0, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(0.088 * s, oy * pawW - 0.016 * s);
        ctx.lineTo(0.148 * s, oy * pawW + 0.008 * s);
        ctx.lineTo(0.088 * s, oy * pawW + 0.02 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    return { ex, ey, kx, ky };
  }

  if (gob) {
    // THE GREENSKIN arm: overlong and WIRY — a thin hide limb with a
    // bony elbow knob, ending in a knuckly hand a size too big. The
    // mismatch is the anatomy argument: goblins are all hands, ears,
    // and appetite; the mass never reaches the limbs.
    const hv = gob.heavy;
    const hideC = hurt ? '#ffffff' : shade(gob.hide, -3);
    ctx.lineCap = 'round';
    ctx.strokeStyle = hideC;
    ctx.lineWidth = Math.max(2, s * 0.064 * (0.9 + 0.2 * hv));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = hurt ? '#ffffff' : shade(gob.hide, -11);
    ctx.lineWidth = Math.max(2, s * 0.055 * (0.9 + 0.2 * hv));
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (!hurt) {
      // The elbow knob: the joint wider than either shaft — a bony
      // arm articulates at its lumps.
      ctx.fillStyle = shade(gob.hide, -9);
      ctx.beginPath();
      ctx.arc(kx, ky, Math.max(1.5, s * 0.032 * (0.9 + 0.2 * hv)), 0, Math.PI * 2);
      ctx.fill();
    }
    // The hand: a broad knuckly mitt wider than the wrist feeding it,
    // split by finger seams, with short dark claws past the leading
    // edge — the grabbing hand of a thing that owns nothing long.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ey - ky, ex - kx));
    const handW = s * 0.072 * (0.92 + 0.16 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gob.hide, 2);
    ctx.beginPath();
    chamferRect(ctx, -0.044 * s, -handW, 0.138 * s, handW * 2, 0.028 * s);
    ctx.fill();
    if (!hurt) {
      // The pale palm heel lapping the wrist.
      ctx.fillStyle = shade(gob.belly, -8);
      ctx.beginPath();
      chamferRect(ctx, -0.052 * s, -handW * 0.72, 0.036 * s, handW * 1.44, 0.014 * s);
      ctx.fill();
      // Knuckle seams: two dark ticks splitting the mitt into fingers.
      ctx.strokeStyle = shade(gob.hide, -26);
      ctx.lineWidth = Math.max(1, 0.012 * s);
      for (const oy of [-0.34, 0.34]) {
        ctx.beginPath();
        ctx.moveTo(0.036 * s, oy * handW);
        ctx.lineTo(0.084 * s, oy * handW * 0.8);
        ctx.stroke();
      }
      // Short claws: a scrapper's nails, not a predator's hooks.
      ctx.fillStyle = shade(gob.ink, 6);
      for (const oy of [-0.6, 0, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(0.08 * s, oy * handW - 0.012 * s);
        ctx.lineTo(0.122 * s, oy * handW + 0.006 * s);
        ctx.lineTo(0.08 * s, oy * handW + 0.016 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    return { ex, ey, kx, ky };
  }

  ctx.lineCap = 'round';
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = Math.max(2, s * 0.085);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  if (cuff) {
    // Robed arms: cloth all the way down, WIDENING toward the wrist —
    // the belled sleeve that makes every gesture read as wizardry.
    ctx.strokeStyle = cuff;
    ctx.lineWidth = Math.max(2, s * 0.075);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const ang = Math.atan2(ey - ky, ex - kx);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    // The bell flares WIDER than the hand and its mouth hangs just past
    // the wrist, so the mitt sits inside the sleeve instead of over it.
    ctx.fillStyle = cuff;
    ctx.beginPath();
    ctx.moveTo(-0.16 * s, -0.045 * s);
    ctx.lineTo(0.035 * s, -0.098 * s);
    ctx.lineTo(0.055 * s, 0);
    ctx.lineTo(0.035 * s, 0.098 * s);
    ctx.lineTo(-0.16 * s, 0.045 * s);
    ctx.closePath();
    ctx.fill();
    // The mouth's inner shadow — the sleeve is OPEN, a tube not a mitt.
    ctx.fillStyle = 'rgba(24, 15, 26, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0.035 * s, -0.085 * s);
    ctx.quadraticCurveTo(0.06 * s, 0, 0.035 * s, 0.085 * s);
    ctx.quadraticCurveTo(0.01 * s, 0, 0.035 * s, -0.085 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (glove) {
    // Gloved forearm: armor from ELBOW to wrist — no skin ever shows.
    // A touch wider than the bare arm so the layer reads as WORN, and
    // round-capped so the elbow end tucks under the sleeve stroke.
    ctx.strokeStyle = hurt ? '#ffffff' : (glove.bracer ?? shade(glove.color, -8));
    ctx.lineWidth = Math.max(2, s * 0.076);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // The cuff is the SEAM piece: it sits at the top of the forearm
    // where glove meets sleeve, so the armor flows up the arm as one
    // unit instead of stopping at a naked elbow. Local +x = wrist-ward.
    const cf = glove.cuff;
    if (cf && !hurt) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(Math.atan2(ey - ky, ex - kx));
      ctx.fillStyle = cf.color;
      switch (cf.kind) {
        case 'band':
          // A buckled strap closing the glove below the elbow.
          ctx.fillRect(0.012 * s, -0.052 * s, 0.042 * s, 0.104 * s);
          break;
        case 'roll':
          // Folded-over top — quilted cloth or doubled leather.
          ctx.beginPath();
          chamferRect(ctx, -0.008 * s, -0.058 * s, 0.056 * s, 0.116 * s, 0.02 * s);
          ctx.fill();
          break;
        case 'flare': {
          // The vambrace mouth: a forged bell opening up the arm to
          // swallow the sleeve, bright-rimmed like the pauldron steel.
          ctx.beginPath();
          ctx.moveTo(0.075 * s, -0.048 * s);
          ctx.lineTo(-0.018 * s, -0.078 * s);
          ctx.lineTo(-0.018 * s, 0.078 * s);
          ctx.lineTo(0.075 * s, 0.048 * s);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(cf.color, 24);
          ctx.fillRect(-0.018 * s, -0.078 * s, 0.016 * s, 0.156 * s);
          // Mouth shadow under the rim — the sleeve disappears INTO it.
          ctx.fillStyle = 'rgba(24, 15, 26, 0.35)';
          ctx.fillRect(-0.002 * s, -0.066 * s, 0.012 * s, 0.132 * s);
          break;
        }
        case 'fur':
          // A pelt roll ringing the elbow — winter kit reads from afar.
          for (const oy of [-0.048, 0, 0.048]) {
            ctx.beginPath();
            ctx.arc((0.02 + (oy === 0 ? -0.012 : 0)) * s, oy * s, Math.max(1.6, 0.042 * s), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }
      ctx.restore();
    }
  } else {
    // Bare forearm — short-sleeved adventurers.
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(2, s * 0.062);
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Hand: aligned with the forearm — blocky, not a ball. Gloves own
  // this frame: local +x runs down the fingers, the wrist heel sits at
  // −x, so end caps square the fist and talons rake past it no matter
  // where the IK put the hand.
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(Math.atan2(ey - ky, ex - kx));
  if (!glove || hurt) {
    ctx.fillStyle = glove ? '#ffffff' : skin;
    ctx.beginPath();
    chamferRect(ctx, -0.055 * s, -0.06 * s, 0.13 * s, 0.12 * s, 0.03 * s);
    ctx.fill();
  } else {
    // The hand silhouette IS the glove's first read — four molds, so a
    // knight's fist and a conjurer's fingers never share an outline.
    const base = glove.color;
    switch (glove.hand ?? 'glove') {
      case 'gauntlet':
        // Squared plated fist: broad box, hard-lit end cap, one dark
        // lame seam — a fist you could knight someone with.
        ctx.fillStyle = base;
        ctx.beginPath();
        chamferRect(ctx, -0.058 * s, -0.068 * s, 0.148 * s, 0.136 * s, 0.014 * s);
        ctx.fill();
        ctx.fillStyle = shade(base, 20);
        ctx.fillRect(0.052 * s, -0.06 * s, 0.034 * s, 0.12 * s);
        ctx.fillStyle = shade(base, -24);
        ctx.fillRect(0.016 * s, -0.06 * s, 0.013 * s, 0.12 * s);
        break;
      case 'paw':
        // The beast mitt: rounder, bulkier, split at the toes.
        ctx.fillStyle = base;
        ctx.beginPath();
        chamferRect(ctx, -0.055 * s, -0.07 * s, 0.148 * s, 0.14 * s, 0.045 * s);
        ctx.fill();
        ctx.strokeStyle = shade(base, -22);
        ctx.lineWidth = Math.max(1, 0.015 * s);
        for (const oy of [-0.024, 0.024]) {
          ctx.beginPath();
          ctx.moveTo(0.088 * s, oy * s);
          ctx.lineTo(0.052 * s, oy * 0.75 * s);
          ctx.stroke();
        }
        break;
      case 'wrap':
        // Wound cloth: the tapered hand crossed by binding strips.
        drawTaperedHand(ctx, base, s);
        ctx.strokeStyle = shade(base, 16);
        ctx.lineWidth = Math.max(1, 0.018 * s);
        for (const ox of [-0.026, 0.014]) {
          ctx.beginPath();
          ctx.moveTo((ox - 0.022) * s, -0.058 * s);
          ctx.lineTo((ox + 0.022) * s, 0.058 * s);
          ctx.stroke();
        }
        break;
      default:
        // Fitted glove: tapers toward squared fingers with a seam, so
        // it reads as a HAND in leather, never a mitten.
        drawTaperedHand(ctx, base, s);
        ctx.strokeStyle = shade(base, -22);
        ctx.lineWidth = Math.max(1, 0.015 * s);
        ctx.beginPath();
        ctx.moveTo(0.044 * s, -0.042 * s);
        ctx.lineTo(0.044 * s, 0.042 * s);
        ctx.stroke();
        break;
    }
    // Fingerless cut: bare fingertips past a knuckle strap.
    if (glove.fingerless) {
      ctx.fillStyle = skin;
      ctx.fillRect(0.044 * s, -0.04 * s, 0.04 * s, 0.08 * s);
      ctx.fillStyle = shade(base, -18);
      ctx.fillRect(0.028 * s, -0.052 * s, 0.017 * s, 0.104 * s);
    }
    const kn = glove.knuckle;
    if (kn) {
      switch (kn.kind) {
        case 'studs': {
          // Riveted knuckle studs, each catching the light.
          const r = Math.max(1.3, 0.022 * s);
          for (const oy of [-0.036, 0.036]) {
            ctx.fillStyle = kn.color;
            ctx.beginPath();
            ctx.arc(0.028 * s, oy * s, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shade(kn.color, 42);
            ctx.beginPath();
            ctx.arc(0.028 * s - r * 0.32, oy * s - r * 0.32, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'spikes': {
          // Forged punch spikes: riveted to a knuckle bar, each with a
          // dark under-facet and a sun-caught top facet — smithed
          // steel, not paper triangles.
          ctx.fillStyle = shade(glove.color, -20);
          ctx.fillRect(0.042 * s, -0.066 * s, 0.026 * s, 0.132 * s);
          for (const oy of [-0.038, 0.038]) {
            ctx.fillStyle = shade(kn.color, -16);
            ctx.beginPath();
            ctx.moveTo(0.06 * s, (oy - 0.032) * s);
            ctx.lineTo(0.168 * s, oy * s);
            ctx.lineTo(0.06 * s, (oy + 0.032) * s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(kn.color, 24);
            ctx.beginPath();
            ctx.moveTo(0.06 * s, (oy - 0.032) * s);
            ctx.lineTo(0.168 * s, oy * s);
            ctx.lineTo(0.06 * s, oy * s);
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'claws': {
          // Curved talons off the paw: thick at the root, hooked belly,
          // needle tips — the middle claw reaches furthest.
          for (const [i, oy] of [-0.048, 0, 0.048].entries()) {
            const len = i === 1 ? 0.13 : 0.105;
            ctx.fillStyle = kn.color;
            ctx.beginPath();
            ctx.moveTo(0.055 * s, (oy - 0.026) * s);
            ctx.quadraticCurveTo(
              (0.07 + len * 0.6) * s, (oy - 0.034) * s,
              (0.062 + len) * s, (oy + 0.012) * s,
            );
            ctx.quadraticCurveTo(
              (0.065 + len * 0.4) * s, (oy + 0.014) * s,
              0.055 * s, (oy + 0.026) * s,
            );
            ctx.closePath();
            ctx.fill();
            // Root shadow seats each talon IN the paw.
            ctx.fillStyle = shade(kn.color, -28);
            ctx.fillRect(0.05 * s, (oy - 0.02) * s, 0.014 * s, 0.04 * s);
          }
          break;
        }
        case 'plate': {
          // A beveled plate over the back of the hand: lit crown facet
          // over the base plate, pinned by two rivets.
          ctx.fillStyle = kn.color;
          ctx.beginPath();
          chamferRect(ctx, -0.042 * s, -0.054 * s, 0.074 * s, 0.108 * s, 0.016 * s);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, 22);
          ctx.beginPath();
          chamferRect(ctx, -0.042 * s, -0.054 * s, 0.036 * s, 0.108 * s, 0.016 * s);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, -30);
          const rr = Math.max(0.9, 0.011 * s);
          for (const oy of [-0.033, 0.033]) {
            ctx.beginPath();
            ctx.arc(0.016 * s, oy * s, rr, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'gem': {
          // A set jewel: dark bezel, stone, one hard glint.
          const r = Math.max(1.4, 0.027 * s);
          ctx.fillStyle = shade(glove.color, -26);
          ctx.beginPath();
          ctx.arc(-0.002 * s, 0, r * 1.32, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = kn.color;
          ctx.beginPath();
          ctx.arc(-0.002 * s, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(kn.color, 45);
          ctx.beginPath();
          ctx.arc(-0.002 * s - r * 0.3, -r * 0.3, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    // THE KNUCKLES — the gloves' channel. Three ticks across the back
    // of the fist plus a bright bar over the first joint, drawn in the
    // rotated hand frame so the light rides the fist wherever it swings
    // and rakes across the screen during a strike. This is the one worn
    // channel whose whole job is to be seen IN MOTION, which is why it
    // lives on the hand and not on the forearm.
    if (glove.arx && !hurt) {
      const mark = glove.arx;
      const a = markPulse(mark, nowMs ?? 0, SLOT_GLINT_PHASE.gloves ?? 0, 1.35);
      if (a > 0.02) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = mark.mid;
        for (const oy of [-0.038, 0, 0.038]) {
          ctx.fillRect(0.03 * s, oy * s - 0.008 * s, 0.03 * s, 0.016 * s);
        }
        ctx.globalAlpha = Math.min(1, a * 1.15);
        ctx.fillStyle = mark.core;
        ctx.fillRect(0.056 * s, -0.05 * s, 0.012 * s, 0.1 * s);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
  // The solved joints, so gear (shields, tomes) can strap to the bone.
  return { ex, ey, kx, ky };
}

/**
 * The fitted-glove hand mold: tapering toward squared fingertips.
 * Shared by the 'glove' and 'wrap' hand kinds; drawn in the rotated
 * hand frame (+x = fingers).
 */
function drawTaperedHand(ctx: CanvasRenderingContext2D, color: string, s: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-0.055 * s, -0.06 * s);
  ctx.lineTo(0.048 * s, -0.052 * s);
  ctx.lineTo(0.084 * s, -0.034 * s);
  ctx.lineTo(0.084 * s, 0.034 * s);
  ctx.lineTo(0.048 * s, 0.052 * s);
  ctx.lineTo(-0.055 * s, 0.06 * s);
  ctx.closePath();
  ctx.fill();
}

/* ========================== THE BONE DIALECT ==========================
 * Skeletons are NOT reskinned villagers. When RigPose.skeletal is set,
 * the flesh painters swap out — skull for the head block, ribcage for
 * the torso garment, bare bone strokes with condyle knobs for every
 * limb — while the IK rig, the weapon carriage, capes, helmets, and
 * all eight facing bands keep working untouched. Each variant is its
 * own DESIGN, never a scale-up: the warrior's plain grave-iron frame,
 * the archer's bleached gracile build with frost-lit sockets, the
 * guard's stained heavy bones under a rusted helm, and the champion's
 * crowned, cracked, ember-eyed bulk.
 */
export interface SkeletonLook {
  /** Base bone tone — each variant aged differently in the ground. */
  bone: string;
  /** The dark of the rib cavity behind the rib bars — the depth read. */
  cavity: string;
  /** Light living in the sockets; undefined = the hollow dark stare. */
  glow?: string;
  /** Royalty among the dead wears its crown into battle. */
  crown?: { band: string; gem: string };
  /** Bone thickness multiplier: gracile archer 0.92 → champion 1.3. */
  heavy: number;
  /** Old battle damage: a skull crack down the trailing brow. */
  cracked: boolean;
}

export const SKELETON_LOOKS: Record<string, SkeletonLook> = {
  // The rank-and-file: parchment bone, hollow stare, grave iron.
  skeleton: { bone: '#d6cfba', cavity: '#2a2133', heavy: 1, cracked: false },
  // The archer: bleached lighter, built lighter, a cold frost light
  // behind the eyes — the crypt's patient marksman.
  skeleton_archer: {
    bone: '#dfd9c9',
    cavity: '#2a2133',
    glow: '#9fd8e8',
    heavy: 0.92,
    cracked: false,
  },
  // The guard: iron-stained heavy bone, cracked from old sieges — the
  // door that still stands its post.
  skeleton_guard: { bone: '#c6bda4', cavity: '#292031', heavy: 1.14, cracked: true },
  // The chanter: violet-washed bone, a pale arcane light standing in
  // the sockets — the crypt's one throat that still remembers words.
  skeleton_chanter: {
    bone: '#d6cfdf',
    cavity: '#2a2138',
    glow: '#b49af0',
    heavy: 1.0,
    cracked: false,
  },
  // The champion: aged ivory mass, ember-lit sockets, a gold crown —
  // whoever he was, the grave promoted him.
  skeleton_champion: {
    bone: '#e6ddc4',
    cavity: '#2d1f2e',
    glow: '#ff9a3d',
    crown: { band: '#d4a43c', gem: '#3fa8a0' },
    heavy: 1.3,
    cracked: true,
  },
  // THE ASHEN COURT (the Kingsdelf epic) — the Old Crown's dead, laid
  // properly in the processional vaults and woken slowly by the burn.
  // The kingsman: ash-stained soldier bone, drilled taller than barrow
  // dead, the vaults' grey cold standing in the sockets. UNCRACKED —
  // these were not robbed graves; they were honors.
  skeleton_kingsman: {
    bone: '#cfc6b4',
    cavity: '#2b2130',
    glow: '#9fb4c8',
    heavy: 1.12,
    cracked: false,
  },
  // The crownsguard: parade-perfect after a hundred and fifty years —
  // unbroken discipline reads eerier than any battle scar. The circlet
  // is the OLD realm's silver, tarnished, with the Brand's ember where
  // a royal stone sat: the crown the Silver Line never talks about.
  skeleton_crownsguard: {
    bone: '#c2b49a',
    cavity: '#2e2030',
    glow: '#cfd2e8',
    crown: { band: '#9aa4b2', gem: '#d86a35' },
    heavy: 1.34,
    cracked: false,
  },
  // THE FALLEN KING (the dread crown): old ivory gone gold at the
  // edges — richer bone than any soldier, aged in state, not in the
  // dirt. Gravelight stands in the sockets (the same cold breath his
  // court rises on), and the crown is the barrow's own heavy gold
  // around a grave-lit stone. Cracked — the long watch shows, and the
  // crack is the honest ledger of whoever finally sat him down the
  // first time. The heaviest dead in the ground: the throne fed him
  // well before it kept him.
  skeleton_fallen_king: {
    bone: '#ded2ae',
    cavity: '#241a2c',
    glow: '#7fe8c8',
    crown: { band: '#c9963a', gem: '#58c9a4' },
    heavy: 1.42,
    cracked: true,
  },
  // THE BARROW LORD (the dread crown): barrow-violet bone — the
  // gravecourt's damp stained him where the king aged in state. A
  // cold marsh-light stands in the sockets (grave mist's own breath
  // made permanent), and the circlet is grave SILVER around a mist-
  // pale stone — the quiet court's authority, never the king's gold.
  // UNCRACKED: nobody ever sat him down; the court has held
  // unbroken. Lighter than the king — a keeper, not a warrior.
  skeleton_barrow_lord: {
    bone: '#cdc4d8',
    cavity: '#231c30',
    glow: '#a8c8e0',
    crown: { band: '#8f96a8', gem: '#b9d8ea' },
    heavy: 1.28,
    cracked: false,
  },
};

/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function skeletonLook(defId: string): SkeletonLook {
  return SKELETON_LOOKS[defId] ?? SKELETON_LOOKS['skeleton']!;
}

export interface SkullFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat bite; 0 keeps the jaw seated. */
  gape: number;
}

/**
 * The skull, drawn in the head block's own frame so helmets still fit.
 * Reads skull by SILHOUETTE first: a broad cranium dome stepping in to
 * a narrower maxilla and a separate mandible — then the band-aware
 * face: sockets that slide with the facing and vanish around the
 * corner, a nasal wedge, a tooth row, suture lines on the back band.
 */
export function paintSkull(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: SkullFrame,
): void {
  const { headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const bone = hurt ? '#ffffff' : sk.bone;
  const dark = '#241a2e';
  const back = backK > 0.55;
  const jawDrop = f.gape * hh * 0.24;

  // --- cranium: the dome, slightly taller than the flesh block was,
  // ending high so the cheek step-in below can read.
  const crTop = headY - hh * 1.06;
  const crBot = headY + hh * 0.32;
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
  ctx.fill();

  // --- maxilla: the upper jaw, stepped in from the dome. From behind
  // the step is hidden — the nape runs long instead.
  const mxHw = hw * (back ? 0.8 : 0.72);
  const mxX = headX + fx * hw * 0.08;
  const mxTop = crBot - hh * 0.06;
  const mxBot = headY + hh * (back ? 0.78 : 0.66);
  ctx.beginPath();
  chamferRect(ctx, mxX - mxHw, mxTop, mxHw * 2, mxBot - mxTop, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- mandible: its own piece, narrower again, dropping with the
  // gape. Hidden from straight behind (the skull owns that view).
  const mdHw = hw * 0.58;
  const mdTop = headY + hh * 0.6 + jawDrop;
  const mdBot = headY + hh * 1.0 + jawDrop;
  if (!back) {
    // The open mouth: a dark gap behind the dropped jaw.
    if (jawDrop > hh * 0.02) {
      ctx.fillStyle = hurt ? dark : shade(sk.cavity, -6);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw * 0.94, mxBot - hh * 0.08, mdHw * 1.88, mdTop - mxBot + hh * 0.14, cut * 0.3);
      ctx.fill();
      ctx.fillStyle = bone;
    }
    ctx.beginPath();
    chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
    ctx.fill();
  }

  if (!hurt) {
    // THE FORM SPLIT, restated for bone: hard shade on the screen-right
    // half, a lit crown band, a temple under-shade rounding the dome.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.15, cut * 1.15, cut * 0.4, cut * 0.4]);
    ctx.clip();
    ctx.fillStyle = shade(sk.bone, -9);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(sk.bone, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.14, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(sk.bone, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.18);
    ctx.restore();
    // Maxilla sits recessed; the mandible breaks clearly darker — the
    // jaw must read as its OWN bone, not a chin band.
    if (!back) {
      ctx.fillStyle = shade(sk.bone, -8);
      ctx.beginPath();
      chamferRect(ctx, mxX, mxTop, mxHw, mxBot - mxTop, [0, 0, cut * 0.5, 0]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      chamferRect(ctx, mxX - mdHw, mdTop, mdHw * 2, mdBot - mdTop, [0, 0, cut * 0.55, cut * 0.55]);
      ctx.fill();
      ctx.fillStyle = shade(sk.bone, -20);
      ctx.beginPath();
      chamferRect(ctx, mxX, mdTop, mdHw, mdBot - mdTop, [0, 0, cut * 0.55, 0]);
      ctx.fill();
      // The jaw seam: a hard shadow line where mandible meets maxilla.
      ctx.fillStyle = shade(sk.bone, -30);
      ctx.fillRect(mxX - mdHw * 0.92, mdTop - hh * 0.015, mdHw * 1.84, hh * 0.03);
    }
  }

  if (back) {
    // The back of the skull: no face — the suture cross and the
    // occipital shelf are what make the turned head a SKULL still.
    if (!hurt) {
      ctx.strokeStyle = shade(sk.bone, -18);
      ctx.lineWidth = Math.max(1, headR * 0.05);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.22);
      ctx.lineTo(headX, headY + hh * 0.3);
      ctx.moveTo(headX - hw * 0.72, headY - hh * 0.34);
      ctx.lineTo(headX + hw * 0.72, headY - hh * 0.34);
      ctx.stroke();
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.beginPath();
      chamferRect(ctx, mxX - mxHw * 0.9, mxBot - hh * 0.16, mxHw * 1.8, hh * 0.16, [0, 0, cut * 0.5, cut * 0.5]);
      ctx.fill();
    }
  } else {
    // --- the face bands: sockets, nasal wedge, teeth — all sliding
    // with the facing, the far side narrowing through three-quarter
    // and slipping around the corner at profile.
    const pairX = headX + fx * headR * 0.4;
    const sep = headR * (0.44 - 0.18 * profileK);
    const sockY = headY - hh * 0.08;
    const sockW = headR * 0.34;
    const sockH = headR * 0.36;
    const sideK = (es: number): number =>
      es !== lead ? Math.max(0, 1 - Math.max(0, (profileK - 0.5) / 0.28)) : 1;
    // Brow shelf: one heavy shade bar over both sockets — the scowl
    // every skull wears.
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -26);
      const bw = (sep + sockW * 1.05) * 2 * (1 - 0.2 * profileK);
      ctx.beginPath();
      chamferRect(ctx, pairX - bw / 2, sockY - sockH * 0.86, bw, headR * 0.16, headR * 0.05);
      ctx.fill();
    }
    for (const es of [-1, 1]) {
      const wK = sideK(es);
      if (wK <= 0.02) continue;
      const w = sockW * wK;
      const cx = pairX + es * sep;
      ctx.fillStyle = dark;
      ctx.beginPath();
      chamferRect(ctx, cx - w / 2, sockY - sockH / 2, w, sockH, headR * 0.09);
      ctx.fill();
      // Zygomatic notch: a shade tick under the socket's outer corner
      // — the cheekbone that makes the socket sit IN bone.
      if (!hurt) {
        ctx.fillStyle = shade(sk.bone, -16);
        ctx.fillRect(cx + es * w * 0.32, sockY + sockH * 0.52, headR * 0.14 * wK, headR * 0.06);
      }
      // The light in the socket: ember or frost, breathing on its own
      // clock, and it OWNS the socket — a furnace behind bone, not a
      // pixel of tint. The rank-and-file keep the hollow dark.
      if (sk.glow && !hurt) {
        const pulse = 0.62 + 0.38 * Math.sin(f.nowMs * 0.004 + es * 1.7);
        ctx.globalAlpha = 0.45 + 0.3 * pulse;
        ctx.fillStyle = shade(sk.glow, -30);
        ctx.beginPath();
        chamferRect(ctx, cx - w * 0.42, sockY - sockH * 0.36, w * 0.84, sockH * 0.74, headR * 0.06);
        ctx.fill();
        ctx.globalAlpha = 0.75 + 0.25 * pulse;
        ctx.fillStyle = sk.glow;
        ctx.fillRect(cx - w * 0.26, sockY - sockH * 0.2, w * 0.52, sockH * 0.46);
        ctx.globalAlpha = 1;
        ctx.fillStyle = shade(sk.glow, 46);
        ctx.fillRect(cx - w * 0.1, sockY - sockH * 0.1, w * 0.2, sockH * 0.24);
      }
    }
    // Nasal aperture: front-on a downward wedge between the sockets;
    // at profile it becomes the notch cut into the leading edge.
    ctx.fillStyle = dark;
    if (profileK > 0.6) {
      const nx = mxX + lead * mxHw * 0.98;
      ctx.beginPath();
      ctx.moveTo(nx, headY + hh * 0.18);
      ctx.lineTo(nx - lead * headR * 0.18, headY + hh * 0.34);
      ctx.lineTo(nx, headY + hh * 0.44);
      ctx.closePath();
      ctx.fill();
    } else {
      const nx = pairX + fx * headR * 0.06;
      ctx.beginPath();
      ctx.moveTo(nx - headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx + headR * 0.09, headY + hh * 0.24);
      ctx.lineTo(nx, headY + hh * 0.48);
      ctx.closePath();
      ctx.fill();
    }
    // Teeth: the mandible's top strip in brighter ivory, cut by dark
    // separation ticks — the grin is the skeleton's signature, so it
    // stays bold at every band that shows a face.
    const tK = 1 - 0.35 * profileK;
    const tHw = mdHw * 0.86 * tK;
    const tX = mxX + fx * hw * 0.04;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 14);
    ctx.fillRect(tX - tHw, mdTop, tHw * 2, hh * 0.16);
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -40);
      for (const ot of [-0.62, -0.21, 0.21, 0.62]) {
        ctx.fillRect(tX + ot * tHw - headR * 0.028, mdTop, headR * 0.056, hh * 0.15);
      }
    }
    // Jaw hinge: the condyle knob where mandible meets skull — the
    // profile detail that articulates the jaw.
    if (profileK > 0.5 && !hurt) {
      ctx.fillStyle = shade(sk.bone, -12);
      ctx.beginPath();
      ctx.arc(headX - lead * hw * 0.52, headY + hh * 0.52 + jawDrop * 0.4, headR * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Old damage: a crack wandering down the trailing brow. Painted on
  // every band — a wound this old goes all the way around a story.
  if (sk.cracked && !hurt) {
    ctx.strokeStyle = shade(sk.bone, -26);
    ctx.lineWidth = Math.max(1, headR * 0.055);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(headX - lead * hw * 0.52, headY - hh * 0.5);
    ctx.lineTo(headX - lead * hw * 0.38, headY - hh * 0.16);
    ctx.stroke();
    ctx.lineJoin = 'miter';
  }

  // The crown: a gold band ringing the dome with rising points — worn
  // at every facing (a crown has no back), the gem only where a face
  // is. Painted last so it sits OVER the cracked old bone it outranks.
  if (sk.crown) {
    const bandCol = hurt ? '#ffffff' : sk.crown.band;
    const bandY = crTop + hh * 0.3;
    const bandH = hh * 0.26;
    ctx.fillStyle = bandCol;
    ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH);
    if (!hurt) {
      ctx.fillStyle = shade(sk.crown.band, -14);
      ctx.fillRect(headX, bandY, hw * 0.98, bandH);
      ctx.fillStyle = shade(sk.crown.band, 18);
      ctx.fillRect(headX - hw * 0.98, bandY, hw * 1.96, bandH * 0.3);
    }
    // Points: center tallest, the pair beside it shorter — every other
    // one shaded so the ring reads as depth, not a paper cutout.
    for (const [i, ot] of [-0.68, 0, 0.68].entries()) {
      const bx = headX + ot * hw;
      const hgt = hh * (ot === 0 ? 0.46 : 0.32);
      ctx.fillStyle = !hurt && i % 2 === 0 ? shade(sk.crown.band, -8) : bandCol;
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + hw * 0.14, bandY + bandH * 0.1);
      ctx.lineTo(bx + ot * hw * 0.06, bandY - hgt);
      ctx.closePath();
      ctx.fill();
    }
    if (!back && !hurt) {
      const gx = headX + fx * hw * 0.34;
      ctx.fillStyle = sk.crown.gem;
      ctx.fillRect(gx - headR * 0.07, bandY + bandH * 0.24, headR * 0.14, bandH * 0.55);
      ctx.fillStyle = shade(sk.crown.gem, 40);
      ctx.fillRect(gx - headR * 0.05, bandY + bandH * 0.3, headR * 0.055, bandH * 0.22);
    }
  }
}

export interface RibcageFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  lead: number;
  profileK: number;
  backK: number;
  hurt: boolean;
}

/** Rib row positions down the barrel (fractions of its height). */
const RIB_ROWS = [0.1, 0.36, 0.62, 0.88] as const;

/**
 * The skeletal torso, drawn in the garment's local frame (y=0 at the
 * hip line, −th at the shoulders): clavicle bar and shoulder knobs, a
 * rib barrel over the dark cavity with the sternum riding the leading
 * edge, scapulae and spine from behind — and below it a REAL gap where
 * a waist should be, crossed only by vertebrae down to the iliac-wing
 * pelvis. The see-through waist is the whole-body skeleton read.
 */
export function paintRibcage(
  ctx: CanvasRenderingContext2D,
  sk: SkeletonLook,
  f: RibcageFrame,
): void {
  const { s, tw, ww, th, fx, profileK, backK, hurt } = f;
  const hv = sk.heavy;
  const bone = hurt ? '#ffffff' : sk.bone;
  const back = backK > 0.55;

  // Barrel bounds: shoulders down to mid-torso.
  const y0 = -th + 0.055 * s;
  const y1 = -th * 0.48;
  const wTop = tw * 0.9;
  const wBot = ww * 1.0;
  const wAt = (t: number): number => wTop + (wBot - wTop) * t;

  const barrel = (): void => {
    ctx.beginPath();
    ctx.moveTo(-wTop, y0);
    ctx.lineTo(wTop, y0);
    ctx.lineTo(wBot, y1);
    ctx.lineTo(-wBot, y1);
    ctx.closePath();
  };

  if (back) {
    // From behind the cage is CLOSED: solid bone back, rib seams, the
    // spine column, and the two scapula plates riding the shoulders.
    ctx.fillStyle = bone;
    barrel();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      barrel();
      ctx.clip();
      ctx.fillStyle = shade(sk.bone, -9);
      ctx.fillRect(0, y0, wTop, y1 - y0);
      ctx.strokeStyle = shade(sk.bone, -15);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      for (const t of RIB_ROWS) {
        const ry = y0 + (y1 - y0) * t;
        ctx.beginPath();
        ctx.moveTo(-wAt(t), ry + 0.012 * s);
        ctx.quadraticCurveTo(0, ry - 0.022 * s, wAt(t), ry + 0.012 * s);
        ctx.stroke();
      }
      ctx.restore();
      // Scapulae: two proud blades high on the back, angled outward,
      // each with its own under-shade so they STAND OFF the rib wall.
      const spX = fx * tw * 0.3;
      for (const es of [-1, 1]) {
        ctx.fillStyle = shade(sk.bone, es > 0 ? 2 : 12);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.18, y0 + 0.012 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.2, y0 + 0.16 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(sk.bone, -22);
        ctx.beginPath();
        ctx.moveTo(spX + es * tw * 0.6, y0 + 0.22 * s);
        ctx.lineTo(spX + es * tw * 0.88, y0 + 0.03 * s);
        ctx.lineTo(spX + es * tw * 0.86, y0 + 0.075 * s);
        ctx.lineTo(spX + es * tw * 0.62, y0 + 0.245 * s);
        ctx.closePath();
        ctx.fill();
      }
      // The spine bar overlays the seam of the two halves.
      ctx.fillStyle = shade(sk.bone, -6);
      ctx.fillRect(spX - 0.032 * s, y0, 0.064 * s, y1 - y0);
      ctx.fillStyle = shade(sk.bone, -20);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(spX - 0.032 * s, y0 + (y1 - y0) * (0.14 + i * 0.24), 0.064 * s, 0.012 * s);
      }
    }
  } else {
    // Facing the camera (and every three-quarter): the OPEN cage.
    // Dark cavity first, rib bars over it, sternum over the ribs. The
    // cage only reads when the cavity WINS between the ribs — thin
    // bright bars over deep dark, never a pale slab with seams.
    ctx.fillStyle = hurt ? '#3a3346' : shade(sk.cavity, -8);
    barrel();
    ctx.fill();
    // Ribs: four near-horizontal bars filling the cage evenly — bone
    // band, dark band, bone band: the classic cage rhythm. A gentle
    // center dip bows each pair toward the sternum, and the whole row
    // tilts down-forward as the body turns to profile.
    const span = y1 - y0;
    const rh = Math.min(0.036 * s * (1 + 0.18 * (hv - 1)), (span / RIB_ROWS.length) * 0.58);
    const tilt = fx * 0.042 * s;
    const dip = (1 - profileK) * 0.016 * s;
    for (const [i, t] of RIB_ROWS.entries()) {
      const ry = y0 + span * t;
      const hwR = wAt(t) * 0.97;
      const cxR = fx * hwR * 0.12;
      for (const es of [-1, 1]) {
        ctx.fillStyle =
          hurt ? '#ffffff' : es > 0 ? shade(sk.bone, -6 - i * 2) : shade(sk.bone, 6 - i * 2);
        ctx.beginPath();
        ctx.moveTo(cxR, ry + dip - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt - rh / 2);
        ctx.lineTo(es * hwR, ry + es * tilt + rh / 2);
        ctx.lineTo(cxR, ry + dip + rh / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Sternum: a narrow breastbone bar running the cage's full height,
    // a step brighter than the ribs so the center line reads, sliding
    // from center to the leading edge with the turn.
    const stX = fx * (wTop * 0.86);
    const stW = 0.048 * s * hv;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, 10);
    ctx.beginPath();
    chamferRect(ctx, stX - stW / 2, y0 - 0.01 * s, stW, span * 0.92, 0.016 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(sk.bone, -14);
      ctx.fillRect(stX + stW * 0.14, y0 - 0.01 * s, stW * 0.36, span * 0.88);
      // Xiphoid tip: the sternum ends in a point, like the real bone.
      ctx.fillStyle = shade(sk.bone, -4);
      ctx.beginPath();
      ctx.moveTo(stX - stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX + stW / 2, y0 + span * 0.9);
      ctx.lineTo(stX, y0 + span * 1.04);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Clavicle bar + shoulder knobs: the coat-hanger the arms hang from.
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.98, y0 - 0.055 * s, tw * 1.96, 0.04 * s, 0.014 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(sk.bone, -12);
    ctx.fillRect(0, y0 - 0.055 * s, tw * 0.98, 0.04 * s);
  }
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.arc(es * tw * 0.94, y0 - 0.02 * s, Math.max(1.8, 0.048 * s * hv), 0, Math.PI * 2);
    ctx.fill();
  }

  // The waist: NOTHING but spine. Three vertebra beads crossing the
  // gap — whatever is behind the body (grass, cape, the far arm)
  // shows through beside them. This gap is the skeleton.
  const spX = fx * tw * 0.22;
  const gapTop = y1 + 0.012 * s;
  const pelvTop = -0.14 * s;
  const beadH = 0.038 * s;
  const step = (pelvTop - gapTop - beadH) / 2;
  for (let i = 0; i < 3; i++) {
    const by = gapTop + i * step;
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, i % 2 === 0 ? 0 : -8);
    ctx.beginPath();
    chamferRect(ctx, spX - 0.042 * s * hv, by, 0.084 * s * hv, beadH, 0.012 * s);
    ctx.fill();
  }

  // Pelvis: iliac wings flaring up-and-out from the sacrum wedge, the
  // dark inlet notch under it — a bone bowl, not a belt line. Each
  // wing carries a crest highlight so the flare reads as a rim.
  for (const es of [-1, 1]) {
    ctx.fillStyle = hurt ? '#ffffff' : shade(sk.bone, es > 0 ? -10 : 4);
    ctx.beginPath();
    ctx.moveTo(spX + es * 0.018 * s, pelvTop + 0.024 * s);
    ctx.lineTo(es * ww * 1.12, pelvTop - 0.012 * s);
    ctx.lineTo(es * ww * 0.8, 0.042 * s);
    ctx.lineTo(spX + es * 0.028 * s, 0.05 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // The crest: a lit lip along the wing's top edge.
      ctx.strokeStyle = shade(sk.bone, es > 0 ? 4 : 16);
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.beginPath();
      ctx.moveTo(spX + es * 0.02 * s, pelvTop + 0.02 * s);
      ctx.lineTo(es * ww * 1.1, pelvTop - 0.01 * s);
      ctx.stroke();
    }
  }
  ctx.fillStyle = bone;
  ctx.beginPath();
  chamferRect(ctx, spX - 0.052 * s * hv, pelvTop - 0.008 * s, 0.104 * s * hv, 0.07 * s, 0.016 * s);
  ctx.fill();
  ctx.fillStyle = hurt ? '#3a3346' : sk.cavity;
  ctx.beginPath();
  ctx.moveTo(spX - 0.036 * s, 0.022 * s);
  ctx.lineTo(spX + 0.036 * s, 0.022 * s);
  ctx.lineTo(spX, 0.058 * s);
  ctx.closePath();
  ctx.fill();
}

/* ========================== THE SCALE DIALECT ==========================
 * Kobolds are NOT small villagers with horns and a tail. When
 * RigPose.kobold is set, the flesh head swaps for a hunched tunnel-rat
 * skull — a low cranium sunk into the shoulders under two big dish
 * ears, a LONG drooping snout ending in a bare nose pad with whiskers
 * and buck incisors, and a lit tallow candle seated on the crown (a
 * miner carries its own light). The body hunches with it: the torso
 * tips forward, the head hangs low and thrust ahead over a bent
 * shoulder hump, a naked tail rides the hip, and the bare feet grow
 * claws — while the IK rig, weapon carriage, and all eight facing
 * bands keep working untouched. Each variant is its own DESIGN, never
 * a scale-up: the dusty rank-and-file digger under one candle, and
 * the digmaster's dark bulk under a ragged mane and a three-candle
 * crown.
 */
export interface KoboldLook {
  /** Hide base — each variant weathered its own tunnel. */
  hide: string;
  /** Pale under-hide: jaw, muzzle underside, the tail's low edge. */
  belly: string;
  /** The lit eye bead — small, bright, watching. */
  eye: string;
  /** The bare nose pad at the snout tip. */
  nose: string;
  /**
   * Ragged mane shag over crown and nape; undefined = the digger's
   * short bristle scruff instead.
   */
  mane?: string;
  /** Frame multiplier: jaw mass, ear dish, tail girth. */
  heavy: number;
}

/** The inner ear membrane — thin skin, always flesh-pink. */
const KOBOLD_EAR_INNER = '#c78e7f';

export const KOBOLD_LOOKS: Record<string, KoboldLook> = {
  // The rank-and-file digger: dusty tan hide, a short bristle scruff,
  // whiskers full of rock dust — a coward alone, a warren together.
  kobold: {
    hide: '#9c6a4a',
    belly: '#d8bf9a',
    eye: '#f0b93a',
    nose: '#43302c',
    heavy: 1,
  },
  // The digmaster: dark umber hide under a ragged slate mane — the
  // warren's one broad-backed silhouette.
  kobold_digmaster: {
    hide: '#6f4838',
    belly: '#c2a480',
    eye: '#ffd24a',
    nose: '#352624',
    mane: '#4a4252',
    heavy: 1.3,
  },
};

/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export function koboldLook(defId: string): KoboldLook {
  return KOBOLD_LOOKS[defId] ?? KOBOLD_LOOKS['kobold']!;
}

/**
 * A tapered filled ribbon along a quadratic spine — the law learned on
 * the ram's horns: curved mass reads as carved form only when drawn as
 * a filled shape with an outline, never as a stroke chain. Width
 * tapers base→tip; returns the sampled spine so callers can seat
 * details on it.
 */
export function scaleRibbon(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  w0: number,
  fill: string,
  outline: string,
): Array<{ x: number; y: number; px: number; py: number; w: number }> {
  const N = 8;
  const spine: Array<{ x: number; y: number; px: number; py: number; w: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    // Tangent of the bezier, for the perpendicular offset.
    const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    spine.push({ x, y, px: -ty / tl, py: tx / tl, w: w0 * (1 - t) * 0.5 });
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = spine.length - 1; i >= 0; i--) {
    const p = spine[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  return spine;
}

export interface KoboldHeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 jaw drop — the combat yip-and-snap; 0 keeps the jaw seated. */
  gape: number;
}

/**
 * The kobold head, drawn in the head block's own frame. Reads kobold
 * by SILHOUETTE first: a low cranium between big dish ears under the
 * candle crown, and a LONG snout that leads the facing — hanging low
 * face-on, run out level and drooping at profile — ending in a bare
 * nose pad with whiskers and buck incisors. The pale mandible drops
 * with the gape. From behind there is NO face: hide plates, the nape,
 * the ears' backs, and the scruff or mane riding the crown.
 */
export function paintKoboldHead(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt } = f;
  const hv = kb.heavy;
  const hide = hurt ? '#ffffff' : kb.hide;
  const belly = hurt ? '#ffffff' : kb.belly;
  const back = backK > 0.55;

  // --- the low cranium: a shallow dome sunk into the shoulders — all
  // ear and snout, no proud brow. Silhouette before detail.
  const crTop = headY - hh * 0.72;
  const crBot = headY + hh * 0.5;

  // --- dish ears: big round tunnel-rat ears riding high and wide.
  // Far-side-skip at profile; from behind both read (backs only —
  // the pink membrane faces forward, never the camera's back band).
  const drawEar = (side: number, depth: number): void => {
    const ex = headX - fx * hw * 0.38 + side * hw * 0.8;
    const ey = crTop + hh * 0.24 - (1 - depth) * hh * 0.06;
    const r = hh * 0.42 * (0.85 + 0.15 * hv) * depth;
    ctx.fillStyle = hide;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -24);
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.stroke();
      if (!back) {
        ctx.fillStyle = KOBOLD_EAR_INNER;
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.14, ey + r * 0.08, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(KOBOLD_EAR_INNER, -18);
        ctx.beginPath();
        ctx.arc(ex + fx * r * 0.18, ey + r * 0.16, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const nearSide = lead;
  // The far ear reads a step smaller and higher — the cheap perspective
  // cue that sells the head as a volume at the three-quarter bands.
  if (profileK < 0.7 || back) drawEar(-nearSide, back ? 1 : 0.86);
  drawEar(nearSide, 1);

  // --- cranium block.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for hide: hard shade right half, lit
    // crown band, jaw under-shade — the dome reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, crTop, hw * 2, crBot - crTop, [cut * 1.4, cut * 1.4, cut * 0.5, cut * 0.5]);
    ctx.clip();
    ctx.fillStyle = shade(kb.hide, -10);
    ctx.fillRect(headX, crTop, hw, crBot - crTop);
    ctx.fillStyle = shade(kb.hide, 9);
    ctx.fillRect(headX - hw, crTop, hw * 2, hh * 0.14);
    ctx.fillStyle = shade(kb.hide, -16);
    ctx.fillRect(headX - hw, crBot - hh * 0.1, hw * 2, hh * 0.1);
    ctx.restore();
  }

  // --- the crown: every kobold wears something up top. The digger
  // gets a short bristle scruff — a few stiff tufts, rock dust and
  // all; the digmaster's full mane replaces it below.
  if (!kb.mane && !hurt) {
    ctx.fillStyle = shade(kb.hide, -20);
    const sBase = headX - fx * hw * 0.28;
    for (let i = 0; i < 4; i++) {
      const t = (i / 3) * 2 - 1;
      const bx = sBase + t * hw * 0.42;
      const by = crTop + hh * 0.1;
      const tall = hh * (0.2 + 0.09 * Math.sin(i * 2.1 + 0.7));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.11, by + hh * 0.05);
      ctx.lineTo(bx - fx * hw * 0.12 + t * hw * 0.05, by - tall);
      ctx.lineTo(bx + hw * 0.11, by + hh * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the mane: ragged shag over the crown and pouring down the
  // nape. The digmaster's slate mop; the digger keeps the scruff.
  if (kb.mane && !hurt) {
    ctx.fillStyle = kb.mane;
    const mBase = headX - fx * hw * 0.24;
    for (let i = 0; i < 5; i++) {
      const t = (i / 4) * 2 - 1;
      const bx = mBase + t * hw * 0.72;
      const by = crTop + hh * 0.14;
      const tall = hh * (0.42 + 0.2 * Math.sin(i * 2.6 + 1)) * (1 + 0.2 * (1 - Math.abs(t)));
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.2, by + hh * 0.08);
      ctx.lineTo(bx - fx * hw * 0.24 + t * hw * 0.1, by - tall);
      ctx.lineTo(bx + hw * 0.2, by + hh * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // The nape shag: a heavy lock falling off the trailing edge of
    // the crown — the mop reads even at profile, under the candles.
    const nx0 = headX - fx * hw * 0.98;
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.3, crTop + hh * 0.1);
    ctx.lineTo(nx0 - fx * hw * 0.22, crTop + hh * 0.7);
    ctx.lineTo(nx0 - fx * hw * 0.1, crBot + hh * 0.16);
    ctx.lineTo(nx0 + fx * hw * 0.34, crBot - hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(kb.mane, -14);
    ctx.beginPath();
    ctx.moveTo(nx0 + fx * hw * 0.1, crTop + hh * 0.34);
    ctx.lineTo(nx0 - fx * hw * 0.16, crTop + hh * 0.9);
    ctx.lineTo(nx0 + fx * hw * 0.16, crBot + hh * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  if (back) {
    // --- the occiput: no face ever shows from behind. Hide plates in
    // courses, the nape shadow, the ears' backs — and the candlelight
    // still riding the crown.
    if (!hurt) {
      ctx.strokeStyle = shade(kb.hide, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.32, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + hw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      // The nape shadow where the head sinks into the hump.
      ctx.fillStyle = shade(kb.hide, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - hw * 0.4, crBot - hh * 0.16, hw * 0.8, hh * 0.16, cut * 0.3);
      ctx.fill();
      if (kb.mane) {
        // Nape shag trailing down the back of the skull.
        ctx.fillStyle = kb.mane;
        for (let i = 0; i < 3; i++) {
          const bx = headX + (i - 1) * hw * 0.3;
          ctx.beginPath();
          ctx.moveTo(bx - hw * 0.14, crTop + hh * 0.4);
          ctx.lineTo(bx + hw * 0.02, crBot + hh * (0.14 + 0.08 * Math.sin(i * 2.2)));
          ctx.lineTo(bx + hw * 0.16, crTop + hh * 0.42);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return;
  }

  // --- the snout: LONG, leading the facing. Face-on it hangs low and
  // narrow off the skull; at profile it runs out level, the bridge
  // easing down toward the nose pad. Two-piece with the mandible.
  const jawDrop = f.gape * hh * 0.3;
  const snLen = hw * (0.5 + 1.15 * profileK);
  const rootX = headX + fx * hw * 0.16;
  const tipX = rootX + fx * snLen;
  const snHw = hw * (0.44 - 0.12 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const topY = headY - hh * (0.24 - 0.08 * profileK);
  const botY = headY + hh * (0.6 + 0.26 * (1 - profileK));
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, x0, topY, x1 - x0, botY - topY, [cut * 0.4, cut * 0.4, cut * 0.6, cut * 0.6]);
  ctx.fill();
  if (!hurt) {
    // Bridge highlight sloping toward the tip, form-split shade, and
    // the drooped under-tip shadow that sells the hang of the snout.
    ctx.fillStyle = shade(kb.hide, 10);
    ctx.fillRect(x0 + (x1 - x0) * 0.12, topY, (x1 - x0) * 0.76, hh * 0.1);
    ctx.fillStyle = shade(kb.hide, -9);
    ctx.beginPath();
    chamferRect(ctx, headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX, topY, x1 - (headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX), botY - topY, [0, cut * 0.4, cut * 0.6, 0]);
    ctx.fill();
    ctx.fillStyle = shade(kb.hide, -14);
    ctx.fillRect(x0, botY - hh * 0.12, x1 - x0, hh * 0.12);
  }

  // --- the nose pad: bare flesh at the very tip, nostril dot beside.
  const nx = rootX + fx * snLen * 0.96;
  const ny = headY + hh * (0.12 * profileK) + (1 - profileK) * (botY - headY - hh * 0.26);
  const nr = hh * 0.15 * (0.9 + 0.2 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : kb.nose;
  ctx.beginPath();
  ctx.arc(nx, ny, nr, 0, Math.PI * 2);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = shade(kb.nose, 16);
    ctx.beginPath();
    ctx.arc(nx - nr * 0.3, ny - nr * 0.35, nr * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(kb.nose, -26);
    if (profileK < 0.55) {
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(nx + sd * nr * 0.5, ny + nr * 0.25, nr * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(nx + lead * nr * 0.45, ny + nr * 0.2, nr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- whiskers: dust-pale threads swept back off the snout. Near
  // side only at profile (the far cheek is around the corner).
  if (!hurt) {
    ctx.strokeStyle = 'rgba(238,228,205,0.85)';
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.7) continue;
      const wx = nx - fx * hw * 0.2 + sd * snHw * 0.4 * (1 - profileK * 0.6);
      const wy = ny - hh * 0.04;
      for (const [dy0, dy1] of [[-0.04, -0.14], [0.04, 0.1]] as const) {
        ctx.beginPath();
        ctx.moveTo(wx, wy + dy0 * hh * 3);
        ctx.quadraticCurveTo(
          wx - fx * hw * 0.1 + sd * hw * 0.34,
          wy + dy0 * hh * 3 + hh * 0.06,
          wx - fx * hw * 0.18 + sd * hw * 0.62,
          wy + dy1 * hh * 3 + hh * 0.22,
        );
        ctx.stroke();
      }
    }
  }

  // --- the mandible: pale under-jaw, its own piece, dropping with
  // the gape — the kobold yips and snaps through every swing.
  const mdHw = snHw * 0.82;
  const mdX = rootX + fx * snLen * 0.42;
  const mdTop = botY - hh * 0.08 + jawDrop;
  if (jawDrop > hh * 0.03) {
    // The open mouth behind the dropped jaw, and the tooth row above.
    ctx.fillStyle = hurt ? '#241a2e' : '#3a2028';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 0.94, botY - hh * 0.1, mdHw * 1.88, mdTop - botY + hh * 0.16, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#e8ddc2';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(mdX + i * mdHw * 0.5 - hh * 0.05, botY - hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5, botY + hh * 0.08);
        ctx.lineTo(mdX + i * mdHw * 0.5 + hh * 0.05, botY - hh * 0.08);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = belly;
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.24, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();

  // --- buck incisors: the tunnel-rat's chisels, proud of the jaw
  // even shut, hanging just behind the nose pad.
  if (!hurt) {
    ctx.fillStyle = '#efe6cf';
    for (const sd of [-1, 1]) {
      const ix = nx - fx * hw * 0.12 + sd * nr * 0.55;
      ctx.beginPath();
      chamferRect(ctx, ix - hh * 0.045, ny + nr * 0.5, hh * 0.09, hh * 0.2 * (1 + 0.25 * hv), [0, 0, hh * 0.03, hh * 0.03]);
      ctx.fill();
    }
  }

  // --- the eyes: small lit beads under a shading brow — watching,
  // not draconic. They slide with the facing; the far eye slips
  // around the corner at profile.
  const eyeY = headY - hh * 0.3;
  const pairX = headX + fx * hw * 0.34;
  const eyeDx = hw * 0.42 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = shade(kb.hide, -18);
    ctx.beginPath();
    chamferRect(ctx, pairX - hw * 0.62, eyeY - hh * 0.22, hw * 1.24, hh * 0.14, cut * 0.3);
    ctx.fill();
  }
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    if (!hurt) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = kb.eye;
      ctx.beginPath();
      ctx.arc(ex, eyeY, hh * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : kb.eye;
    ctx.beginPath();
    ctx.arc(ex, eyeY, hh * 0.115, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.02, eyeY + hh * 0.01, hh * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(ex - hh * 0.045, eyeY - hh * 0.05, hh * 0.028, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export interface KoboldHumpFrame {
  s: number;
  tw: number;
  th: number;
  fx: number;
  backK: number;
  hurt: boolean;
}

/**
 * The shoulder hump: the bent back the whole species carries, drawn
 * in the torso's local frame AFTER the garment and BEFORE the head —
 * a rounded mass rising behind the neck that the low-slung skull sinks
 * into. It trails the facing at profile and reads as bowed shoulders
 * face-on and from behind.
 */
export function paintKoboldHump(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  garment: string,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const cx = -fx * tw * 0.4;
  const cy = -th + th * 0.02;
  const rx = tw * (1.02 + 0.12 * backK);
  const ry = th * 0.24 * (1 + 0.18 * kb.heavy - 0.18);
  ctx.fillStyle = hurt ? '#ffffff' : garment;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.35);
  ctx.lineTo(cx - rx, cy + ry * 0.35);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // The form split carries over the hump: lit crown line, shaded
    // trailing slope — a bent back, not a collar.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(garment, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(garment, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.42);
    ctx.restore();
  }
}

export interface KoboldTailFrame {
  s: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  nowMs: number;
  runF: number;
  poleX: number;
  hurt: boolean;
}

/**
 * The naked tail — THE LIVING WHIP. Drawn in the torso's squashed
 * local frame BEFORE the garment so the root always tucks behind the
 * body. A wave travels root-to-tip on the wall clock, quickening and
 * widening with the gait, so the tail is never a dead ribbon: it
 * snakes at a stand, lashes at a run. Hide at the root eases to bare
 * flesh at the tip. It trails the facing — run out long at profile,
 * hanging low and swaying seen from behind, tip peeking past the hip
 * face-on.
 */
export function paintKoboldTail(
  ctx: CanvasRenderingContext2D,
  kb: KoboldLook,
  f: KoboldTailFrame,
): void {
  const { s, fx, fy, backK, profileK, lead, nowMs, runF, poleX, hurt } = f;
  const hide = hurt ? '#ffffff' : kb.hide;
  const frontK = Math.max(0, fy);
  const trail = -poleX * 0.12 * s;
  // Base spine: root planted at the hip, arcing out behind the facing.
  const rootX = -fx * 0.05 * s;
  const rootY = -0.06 * s;
  const tipX = -fx * (0.56 + 0.14 * profileK) * s + trail - lead * 0.2 * s * frontK;
  const tipY = 0.15 * s + 0.19 * s * backK;
  const cx = rootX + (tipX - rootX) * 0.42;
  const cy = rootY + 0.12 * s + 0.05 * s * backK;
  // The traveling wave: amplitude grows toward the tip (the root stays
  // planted in the pelvis), the whole thing runs faster at speed.
  const N = 10;
  const phase = nowMs * (0.0042 + 0.0038 * runF);
  const amp = s * (0.03 + 0.05 * runF);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    let x = mt * mt * rootX + 2 * mt * t * cx + t * t * tipX;
    let y = mt * mt * rootY + 2 * mt * t * cy + t * t * tipY;
    const tx = 2 * mt * (cx - rootX) + 2 * t * (tipX - cx);
    const ty = 2 * mt * (cy - rootY) + 2 * t * (tipY - cy);
    const tl = Math.hypot(tx, ty) || 1e-4;
    const wob = Math.sin(phase - t * 5.2) * amp * Math.pow(t, 1.4);
    x += (-ty / tl) * wob;
    y += (tx / tl) * wob;
    pts.push({ x, y });
  }
  // Per-point frames from the DISPLACED spine, then one filled ribbon
  // with an outline (the ram's carved-mass law) tapering to the tip.
  const w0 = 0.075 * s * kb.heavy;
  const sp = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(N, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1e-4;
    const t = i / N;
    return { x: p.x, y: p.y, px: -dy / dl, py: dx / dl, w: w0 * (1 - t * 0.92) * 0.5 };
  });
  ctx.fillStyle = hide;
  ctx.beginPath();
  for (let i = 0; i < sp.length; i++) {
    const p = sp[i]!;
    if (i === 0) ctx.moveTo(p.x + p.px * p.w, p.y + p.py * p.w);
    else ctx.lineTo(p.x + p.px * p.w, p.y + p.py * p.w);
  }
  for (let i = sp.length - 1; i >= 0; i--) {
    const p = sp[i]!;
    ctx.lineTo(p.x - p.px * p.w, p.y - p.py * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hurt ? '#ffffff' : shade(kb.hide, -26);
  ctx.lineWidth = Math.max(1, w0 * 0.16);
  ctx.stroke();
  if (hurt) return;
  // The bare flesh tip: the last third of the whip pales out.
  ctx.strokeStyle = shade(KOBOLD_EAR_INNER, -4);
  ctx.lineCap = 'round';
  for (let i = 7; i < sp.length - 1; i++) {
    const p = sp[i]!;
    const q = sp[i + 1]!;
    ctx.lineWidth = Math.max(1, p.w * 1.9);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Pale underside: the belly line along the low edge of the ribbon.
  ctx.strokeStyle = shade(kb.belly, -6);
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const p = sp[i]!;
    // The perpendicular can flip along the spine — always take the
    // down-screen side for the belly edge.
    const sgn = p.py >= 0 ? 1 : -1;
    const x = p.x + p.px * p.w * 0.7 * sgn;
    const y = p.y + p.py * p.w * 0.7 * sgn;
    if (i === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * THE FUR DIALECT — the gnoll, the hyena-headed scavenger. Like the
 * bone and scale dialects it swaps head, hair, and face wholesale and
 * adds species mass (crest hump, bushy tail, bare paws) while the IK
 * rig, carriage, and facing bands keep working untouched. Each variant
 * is its own DESIGN, never a scale-up: the rank-and-file skulker in
 * its speckled coat, and the packlord's storm-dark bulk under the
 * standing crest. The rank-and-file additionally rolls a COAT CLUSTER
 * from its spawn seed — a warband reads as individuals from one stock,
 * never as one body stamped four times.
 */
export interface GnollLook {
  /** Coat base — the speckled gray-brown fur that carries the body. */
  fur: string;
  /** Pale underfur: throat, belly panel, jaw underside, tail's low edge. */
  underfur: string;
  /** Bare umber hide where the fur thins: paw pads and the ear dish. */
  skin: string;
  /** Speckle ink — the hyena's broken spot field over the coat. */
  spot: string;
  /** The bristled crest: crown, nape, and down the hunched back. */
  mane: string;
  /**
   * The dark face mask — brow ledge, muzzle bridge, eye sockets, claw
   * ink, the dorsal saddle. The menace tone: everything that scowls
   * wears it.
   */
  mask: string;
  /** The lit eye bead — small, close-set, watching the weakest. */
  eye: string;
  /** The bare nose pad at the muzzle tip. */
  nose: string;
  /** Frame multiplier: jaw mass, ear reach, crest height, tail girth. */
  heavy: number;
  /** Battle-worn: notched ear and a muzzle scar — the packlord's ledger. */
  scarred?: boolean;
  /** Spawn seed carried on the resolved look — drives the spot field. */
  seed?: number;
}

export const GNOLL_LOOKS: Record<string, GnollLook> = {
  // The rank-and-file skulker: a dusty, dirt-matted coat over umber
  // hide, a dark hyena mask, a rust-brown roach, hungry amber eyes —
  // brave in fours.
  gnoll: {
    fur: '#7f6d4c',
    underfur: '#bfae87',
    skin: '#8a7358',
    spot: '#4c4030',
    mane: '#5c3d22',
    mask: '#42372a',
    eye: '#f2a93a',
    nose: '#241d17',
    heavy: 1,
  },
  // The packlord: storm-dark coat, an iron-gray standing crest twice
  // the skulker's reach, a notched ear and an old muzzle scar — the
  // warband's one broad-backed silhouette.
  gnoll_champion: {
    fur: '#4e463c',
    underfur: '#948a70',
    skin: '#6b5f4e',
    spot: '#332c24',
    mane: '#3d3f4c',
    mask: '#302a24',
    eye: '#ffd24a',
    nose: '#1d1815',
    heavy: 1.3,
    scarred: true,
  },
  // THE MATRIARCH (the dread crown): night-dark coat under a pale
  // bone-silver crest — the ONE gnoll whose roach runs cold. Every
  // other coat keeps the warm-crest reference law; the crown breaks
  // it on purpose, and the value gap is even wider than the law
  // asks, so her silhouette reads across the whole fort. Blood-
  // amber eyes, scarred: the mother's ledger is longer than any
  // packlord's.
  gnoll_matriarch: {
    fur: '#48413a',
    underfur: '#8c8274',
    skin: '#6b5f4e',
    spot: '#342d25',
    mane: '#b8b4a8',
    mask: '#332c25',
    eye: '#ff9a3d',
    nose: '#241d17',
    heavy: 1.5,
    scarred: true,
  },
};

/**
 * THE COAT CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a pack sorts into family groups (the beasts'
 * one-line fur-tint law, grown to a wardrobe): dust, ash, russet, and
 * the bone-pale runt. Champions never roll — a packlord is a DESIGN.
 */
const GNOLL_CLUSTERS: ReadonlyArray<
  Pick<GnollLook, 'fur' | 'underfur' | 'spot' | 'mane' | 'mask'>
> = [
  // The roach runs WARM against every coat (the reference hyena's
  // rust crest) — value-separated from the fur so it reads at scale.
  { fur: '#7f6d4c', underfur: '#bfae87', spot: '#4c4030', mane: '#5c3d22', mask: '#42372a' }, // dust
  { fur: '#65625a', underfur: '#a19e92', spot: '#37342e', mane: '#4a4a54', mask: '#35352f' }, // ash
  { fur: '#785a3c', underfur: '#b49e7c', spot: '#44342a', mane: '#63351f', mask: '#3d3026' }, // russet
  { fur: '#8a8164', underfur: '#c6bb9a', spot: '#4e4736', mane: '#6b5330', mask: '#443c30' }, // bone-pale
];

const GNOLL_LOOK_CACHE = new Map<string, GnollLook>();

/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the skulker's coat cluster plus a small
 * shade jitter; named looks (the packlord) hold their authored design.
 * Resolved looks are cached — this runs per body per frame.
 */
export function gnollLook(defId: string, seed = 0): GnollLook {
  const base = GNOLL_LOOKS[defId] ?? GNOLL_LOOKS['gnoll']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GNOLL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GnollLook;
  if (defId === 'gnoll') {
    // Hash the seed before picking: knot members spawn with
    // CONSECUTIVE eids, and raw high bits dressed a whole pack in one
    // coat — the hash spreads a spawned warband across the clusters.
    const h = (seed * 2654435761) | 0;
    const cl = GNOLL_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      fur: shade(cl.fur, jit),
      underfur: cl.underfur,
      spot: cl.spot,
      mane: shade(cl.mane, jit),
      mask: cl.mask,
      seed,
    };
  } else {
    // Named looks hold their authored design — only the spot field
    // stays the body's own.
    look = { ...base, seed };
  }
  GNOLL_LOOK_CACHE.set(key, look);
  return look;
}

/**
 * The gnoll head, drawn in the head block's own frame. Reads gnoll by
 * SILHOUETTE first: a broad low skull between TALL ROUND ears, a
 * bristled crest breaking off the crown, and a BLUNT DEEP muzzle — a
 * bone-cracking jaw, not the wolf's spike — ending in a broad nose
 * with the underbite's teeth proud of the lip. Muzzle length leads the
 * facing (short face-on, run out at profile) and the whole face is
 * gone from behind (the cattle muzzle law): occiput fur, spot courses,
 * ear backs, and the crest pouring down the nape.
 */
export function paintGnollHead(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHeadFrame,
  seed = 0,
): void {
  const { headX, headY, hw, hh, cut, fx, fy, profileK, backK, lead, hurt } = f;
  const hv = gn.heavy;
  const fur = hurt ? '#ffffff' : gn.fur;
  const under = hurt ? '#ffffff' : gn.underfur;
  const mask = hurt ? '#ffffff' : gn.mask;
  const back = backK > 0.55;
  const nearSide = lead;

  // --- the skull box: broad and LOW — all jaw and cheek, the brow
  // sunk between the shoulders. Wider than the old cut (the hyena's
  // cheek mass); the crown chamfers run HEAVY so the forehead reads
  // as the dome the Roman muzzle line falls away from.
  const gw = hw * 1.2;
  const crTop = headY - hh * 0.66;
  const crBot = headY + hh * 0.58;

  // --- THE MANE HOOD, laid down FIRST so the skull laps its base: a
  // connected sawtooth ridge breaking off the crown and pouring back
  // off the facing toward the hump — one ragged mass, never a row of
  // pasted thorns. Face-on it reads end-on as a bristle halo behind
  // the crown; at profile the full ridge runs crown → nape; from
  // behind it owns the whole occiput (drawn again there, wider).
  const hoodSpread = gw * (0.6 - 0.36 * profileK) * (1 - backK * 0.2) + backK * gw * 0.3;
  // Taller than the first cut: the roach is half the hyena's
  // silhouette — it must read from every band, not just profile.
  const hoodTall = hh * (0.62 + 0.58 * (hv - 1)) * (1 + 0.12 * profileK);
  const drawHood = (baseYLift: number, teeth: number): void => {
    const bx = (t: number): number =>
      headX + (1 - 2 * t) * hoodSpread - fx * gw * (0.08 + 0.9 * t) * (1 - backK);
    const by = (t: number): number =>
      crTop + hh * (0.04 + (0.5 * profileK + 0.1) * t * (1 - backK)) + baseYLift;
    ctx.beginPath();
    ctx.moveTo(bx(0) + fx * gw * 0.1, by(0) + hh * 0.3);
    for (let i = 0; i < teeth; i++) {
      const t = i / (teeth - 1);
      // Face-on the ridge is seen END-ON: the center locks stand
      // tallest and the corners taper away, so the silhouette above
      // the crown reads as one bristled mound — corner spikes at
      // full height read as a pair of horns.
      const centerBias = 1 - 0.45 * (1 - profileK) * Math.abs(t - 0.5) * 2;
      const tall = hoodTall * (0.72 + 0.38 * Math.sin(i * 2.3 + 1.1)) * centerBias;
      ctx.lineTo(bx(t) - fx * gw * 0.24 + (0.5 - t) * gw * 0.12, by(t) - tall);
      // The valley between bristles holds HALF the ridge height — the
      // roach is one bristled MOUND with a torn edge, never a picket
      // fence of separate thorns over a bare crown.
      ctx.lineTo(bx(Math.min(1, t + 0.75 / (teeth - 1))), by(t) - tall * 0.45);
    }
    // The nape skirt: the ridge falls off the trailing edge toward
    // the shoulder hump in ragged locks — never one flat-edged slab.
    ctx.lineTo(bx(1) - fx * gw * 0.3, crBot + hh * 0.1 * (1 - backK * 0.5));
    ctx.lineTo(bx(0.82) - fx * gw * 0.2, crBot - hh * 0.08);
    ctx.lineTo(bx(0.62), crBot + hh * 0.18 * (1 - backK * 0.5));
    ctx.lineTo(bx(0.5), crBot - hh * 0.05);
    ctx.closePath();
    ctx.fill();
  };
  if (!hurt) {
    ctx.fillStyle = gn.mane;
    drawHood(0, 6);
    if (gn.scarred) {
      // The packlord's frost: pale tips over the iron ridge — age worn
      // as rank. A second, smaller sawtooth inset into the first.
      ctx.fillStyle = shade(gn.mane, 42);
      const bx = (t: number): number =>
        headX + (1 - 2 * t) * hoodSpread * 0.86 - fx * gw * (0.08 + 0.86 * t) * (1 - backK);
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const tall = hoodTall * (0.78 + 0.34 * Math.sin(i * 2.3 + 1.4));
        const px = bx(t) - fx * gw * 0.22 + (0.5 - t) * gw * 0.1;
        const py = crTop + hh * (0.04 + 0.5 * profileK * t * (1 - backK)) - tall;
        ctx.beginPath();
        ctx.moveTo(px - gw * 0.055, py + hoodTall * 0.3);
        ctx.lineTo(px, py);
        ctx.lineTo(px + gw * 0.055, py + hoodTall * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // ==================== THE TRUE PROFILE ====================
  // The E/W bands get an AUTHORED side view (the goblin law, spoken
  // fur): every blended feature extrapolated to profileK 1.0 read as
  // a squashed front view wearing a snout — the skull box kept its
  // face-on width, so the muzzle never even cleared the cheek. Past
  // 0.9 the whole head swaps for a bespoke silhouette instead: ONE
  // long skull-to-muzzle outline (occiput → domed crown → brow step →
  // ROMAN SLOPE → proud blunt tip → deep masseter jaw), ONE
  // rear-rooted ear, ONE hooded eye, ONE grin rising to its cheek
  // corner. The blends below only ever serve the three-quarter bands;
  // NOTHING extrapolates here.
  if (profileK > 0.9 && !back) {
    const fwd = fx >= 0 ? 1 : -1;
    const pJaw = f.gape * hh * 0.46;
    const occX = headX - fwd * gw * 0.95; // the occiput wall
    const browX = headX + fwd * gw * 0.36; // the forehead step
    const tipPX = headX + fwd * gw * 1.3; // the blunt tip, PROUD of the cheek
    const browPY = headY - hh * 0.34;
    const nosePY = headY + hh * 0.02;
    // The chin runs DEEP — a shallow chin under the slope drifts the
    // read back toward the wolf's spike.
    const chinY = headY + hh * 0.56;
    const jawPY = headY + hh * 0.7;
    const ccp = cut * 0.6;

    // ONE ear at the occiput, leaning BACK off the crown — the dish
    // reads three-quarter from the side, never a floating ring.
    {
      const er = hh * 0.33 * (0.95 + 0.15 * hv);
      const dh = hh * 0.55 * (0.92 + 0.16 * hv);
      const notched = !!gn.scarred;
      ctx.save();
      ctx.translate(occX + fwd * gw * 0.3, crTop + hh * 0.14);
      ctx.rotate(-fwd * 0.46);
      ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, -8);
      ctx.beginPath();
      ctx.moveTo(-er * 0.92, 0);
      ctx.lineTo(-er, -dh + er);
      ctx.arc(0, -dh + er, er, Math.PI, notched ? Math.PI * 1.6 : Math.PI * 2);
      if (notched) {
        ctx.lineTo(er * 0.34, -dh + er * 0.66);
        ctx.lineTo(er, -dh + er * 0.94);
      }
      ctx.lineTo(er * 0.92, 0);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = shade(gn.fur, -20);
        ctx.lineWidth = Math.max(1, er * 0.13);
        ctx.stroke();
        // The cavity sits OBLIQUE — narrowed and pushed toward the
        // face side, the way a turned dish forecloses.
        ctx.fillStyle = shade(gn.skin, -46);
        ctx.beginPath();
        ctx.ellipse(fwd * er * 0.24, -dh + er * 0.96, er * 0.56, er * 0.84, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!notched) {
          const nickT = 0.34 + 0.3 * (((seed >>> 3) & 7) / 7);
          ctx.fillStyle = mask;
          ctx.beginPath();
          ctx.moveTo(-er * 1.02, -dh * nickT);
          ctx.lineTo(-er * 0.52, -dh * nickT - er * 0.2);
          ctx.lineTo(-er * 1.02, -dh * nickT - er * 0.38);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // The side silhouette: ONE closed outline, skull through muzzle —
    // longer than it is tall, the way a hyena's head actually reads.
    const headPath = (): void => {
      ctx.beginPath();
      ctx.moveTo(occX, jawPY - cut); // rear jaw chamfer
      ctx.lineTo(occX, crTop + cut * 1.4); // the occiput wall
      ctx.quadraticCurveTo(occX, crTop, occX + fwd * cut * 1.6, crTop);
      // The crown DOMES forward and falls to the brow step...
      ctx.quadraticCurveTo(headX - fwd * gw * 0.08, crTop - hh * 0.07, browX - fwd * cut * 0.8, crTop + hh * 0.03);
      ctx.lineTo(browX, browPY);
      // ...then THE ROMAN SLOPE: convex, brow to nose, one fall.
      ctx.quadraticCurveTo((browX + tipPX) / 2, browPY + (nosePY - browPY) * 0.26, tipPX - fwd * ccp, nosePY);
      ctx.lineTo(tipPX, nosePY + ccp); // the blunt front: straight down
      ctx.lineTo(tipPX, chinY - ccp);
      ctx.lineTo(tipPX - fwd * ccp * 1.6, chinY); // the chin corner
      // The throat line rises back into the DEEP masseter jaw.
      ctx.lineTo(headX + fwd * gw * 0.4, jawPY);
      ctx.lineTo(occX + fwd * cut * 1.2, jawPY);
      ctx.closePath();
    };
    ctx.fillStyle = fur;
    headPath();
    ctx.fill();
    if (!hurt) {
      ctx.save();
      headPath();
      ctx.clip();
      // The muzzle wedge forward of the brow is the LIGHTER volume.
      ctx.fillStyle = shade(gn.fur, 7);
      ctx.fillRect(Math.min(browX, tipPX), browPY - hh * 0.14, Math.abs(tipPX - browX), jawPY - browPY + hh * 0.2);
      // Rear form shade seats the occiput...
      ctx.fillStyle = shade(gn.fur, -10);
      ctx.fillRect(Math.min(occX, occX + fwd * gw * 0.4), crTop, gw * 0.4, jawPY - crTop);
      // ...a lit band tops the dome...
      ctx.fillStyle = shade(gn.fur, 9);
      ctx.fillRect(Math.min(occX, browX), crTop, Math.abs(browX - occX), hh * 0.12);
      // ...and the jowl under-shade carries the jaw's weight.
      ctx.fillStyle = shade(gn.fur, -20);
      ctx.fillRect(Math.min(occX, tipPX), jawPY - hh * 0.14, Math.abs(tipPX - occX), hh * 0.14);
      // THE BRIDGE SADDLE rides the slope and stops before the pad.
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(browX - fwd * cut * 0.5, browPY + hh * 0.02);
      ctx.lineTo(tipPX - fwd * hh * 0.24, nosePY + hh * 0.03);
      ctx.lineTo(tipPX - fwd * hh * 0.24, nosePY + hh * 0.22);
      ctx.lineTo(browX - fwd * cut * 0.5, browPY + hh * 0.3);
      ctx.closePath();
      ctx.fill();
      // The spot field walks the cheek and neck.
      ctx.fillStyle = shade(gn.spot, 0);
      for (let i = 0; i < 4; i++) {
        const h2 = ((seed >>> (i * 3)) ^ (seed * 41 + i * 97)) | 0;
        const sxr = (h2 & 15) / 15;
        const syr = ((h2 >> 4) & 15) / 15;
        const bx2 = occX + fwd * gw * (0.2 + 0.62 * sxr);
        const by2 = crTop + (jawPY - crTop) * (0.3 + 0.4 * syr);
        const br = hh * (0.055 + 0.03 * (((h2 >> 8) & 3) / 3));
        ctx.beginPath();
        ctx.ellipse(bx2, by2, br * 1.25, br, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // The cheek ruff flares BACK off the jaw hinge — the sideburn.
    if (!hurt) {
      const rx0 = occX + fwd * gw * 0.3;
      ctx.fillStyle = shade(gn.fur, -5);
      ctx.beginPath();
      ctx.moveTo(rx0, headY - hh * 0.06);
      ctx.lineTo(rx0 - fwd * gw * 0.34, headY + hh * 0.12);
      ctx.lineTo(rx0 - fwd * gw * 0.04, headY + hh * 0.24);
      ctx.lineTo(rx0 - fwd * gw * 0.3, headY + hh * 0.44);
      ctx.lineTo(rx0 - fwd * gw * 0.02, headY + hh * 0.5);
      ctx.lineTo(rx0 - fwd * gw * 0.2, headY + hh * 0.66);
      ctx.lineTo(rx0 + fwd * gw * 0.08, headY + hh * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // THE BROW LEDGE hoods the one eye, angled down the slope.
    const eX = browX - fwd * gw * 0.04;
    const eY = browPY + hh * 0.18;
    if (!hurt) {
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(browX - fwd * gw * 0.34, browPY - hh * 0.14);
      ctx.lineTo(browX + fwd * cut * 0.9, browPY - hh * 0.03);
      ctx.lineTo(browX + fwd * cut * 0.9, browPY + hh * 0.12);
      ctx.lineTo(browX - fwd * gw * 0.36, browPY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(gn.mask, -12);
      ctx.beginPath();
      ctx.ellipse(eX, eY, hh * 0.12, hh * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = gn.eye;
      ctx.beginPath();
      ctx.arc(eX, eY, hh * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : gn.eye;
    ctx.beginPath();
    ctx.arc(eX, eY, hh * 0.085, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(eX + fwd * hh * 0.024, eY + hh * 0.012, hh * 0.044, 0, Math.PI * 2);
      ctx.fill();
    }

    // THE NOSE PAD wraps the blunt front — taller than wide, seen on.
    ctx.fillStyle = hurt ? '#ffffff' : gn.nose;
    ctx.beginPath();
    chamferRect(ctx, Math.min(tipPX - fwd * hh * 0.28, tipPX + fwd * hh * 0.01), nosePY - hh * 0.02, hh * 0.29, hh * 0.36, ccp * 0.8);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(gn.nose, 24);
      ctx.beginPath();
      ctx.ellipse(tipPX - fwd * hh * 0.16, nosePY + hh * 0.06, hh * 0.07, hh * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // THE MOUTH: the shut grin, or the forward-gaping cackle.
    const mouthPY = headY + hh * 0.34;
    if (pJaw > hh * 0.03) {
      ctx.fillStyle = hurt ? '#241a2e' : '#2e1418';
      ctx.beginPath();
      ctx.moveTo(tipPX - fwd * hh * 0.04, mouthPY - hh * 0.02);
      ctx.lineTo(headX + fwd * gw * 0.34, mouthPY + hh * 0.04);
      ctx.lineTo(headX + fwd * gw * 0.4, mouthPY + hh * 0.16 + pJaw * 0.55);
      ctx.lineTo(tipPX - fwd * hh * 0.01, mouthPY + hh * 0.12 + pJaw);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = '#7c3234';
        ctx.beginPath();
        ctx.ellipse(headX + fwd * gw * 0.75, mouthPY + hh * 0.1 + pJaw * 0.5, gw * 0.2, hh * 0.06 + pJaw * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // The upper row hangs into the maw...
        ctx.fillStyle = '#efe6cf';
        for (const t of [0.2, 0.5, 0.78]) {
          const txx = tipPX + (headX + fwd * gw * 0.34 - tipPX) * t;
          const tyy = mouthPY - hh * 0.01 + hh * 0.05 * t;
          ctx.beginPath();
          ctx.moveTo(txx - hh * 0.05, tyy);
          ctx.lineTo(txx, tyy + hh * (t === 0.5 ? 0.13 : 0.2) + pJaw * 0.18);
          ctx.lineTo(txx + hh * 0.05, tyy);
          ctx.closePath();
          ctx.fill();
        }
        // ...and the dropped mandible answers with the underbite.
        ctx.fillStyle = shade(gn.underfur, -16);
        ctx.beginPath();
        chamferRect(
          ctx,
          Math.min(headX + fwd * gw * 0.3, tipPX - fwd * hh * 0.02),
          mouthPY + hh * 0.1 + pJaw,
          Math.abs(tipPX - fwd * hh * 0.02 - (headX + fwd * gw * 0.3)),
          hh * 0.17,
          [0, 0, cut * 0.4, cut * 0.4],
        );
        ctx.fill();
        ctx.fillStyle = '#efe6cf';
        const cx2 = tipPX - fwd * hh * 0.16;
        ctx.beginPath();
        ctx.moveTo(cx2 - hh * 0.055, mouthPY + hh * 0.12 + pJaw);
        ctx.lineTo(cx2 + fwd * hh * 0.015, mouthPY + hh * 0.12 + pJaw - hh * 0.24 * (1 + 0.25 * (hv - 1)));
        ctx.lineTo(cx2 + hh * 0.055, mouthPY + hh * 0.12 + pJaw);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      // The shut grin: the seam leaves the tip, sags, and RISES past
      // the muzzle root into its one cheek corner.
      ctx.strokeStyle = shade(gn.nose, -4);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.2, hh * 0.075);
      ctx.beginPath();
      ctx.moveTo(tipPX - fwd * hh * 0.05, mouthPY);
      ctx.quadraticCurveTo(headX + fwd * gw * 0.85, mouthPY + hh * 0.12, headX + fwd * gw * 0.16, mouthPY - hh * 0.2);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The meshed row rides the seam...
      ctx.fillStyle = '#e8dcc0';
      for (const t of [0.16, 0.42, 0.68]) {
        const txx = tipPX + (headX + fwd * gw * 0.16 - tipPX) * t;
        const tyy = mouthPY + hh * (0.1 - 0.28 * t * t);
        ctx.beginPath();
        ctx.moveTo(txx - hh * 0.045, tyy);
        ctx.lineTo(txx, tyy + hh * 0.12 * (1 + 0.2 * (hv - 1)));
        ctx.lineTo(txx + hh * 0.045, tyy);
        ctx.closePath();
        ctx.fill();
      }
      // ...and ONE canine juts UP proud near the tip.
      ctx.fillStyle = '#efe6cf';
      const cx2 = tipPX - fwd * hh * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx2 - hh * 0.055, mouthPY + hh * 0.1);
      ctx.lineTo(cx2 + fwd * hh * 0.015, mouthPY + hh * 0.1 - hh * 0.22 * (1 + 0.3 * (hv - 1)));
      ctx.lineTo(cx2 + hh * 0.055, mouthPY + hh * 0.1);
      ctx.closePath();
      ctx.fill();
    }

    // The packlord's ledger: the scar rakes DOWN the slope.
    if (gn.scarred && !hurt) {
      ctx.strokeStyle = shade(gn.fur, 52);
      ctx.lineWidth = Math.max(1.5, hh * 0.07);
      const scx = headX + fwd * gw * 0.78;
      ctx.beginPath();
      ctx.moveTo(scx - hh * 0.1, browPY + hh * 0.12);
      ctx.lineTo(scx + hh * 0.1, browPY + hh * 0.58);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, hh * 0.035);
      for (const t of [0.32, 0.64]) {
        const px0 = scx - hh * 0.1 + hh * 0.2 * t;
        const py0 = browPY + hh * (0.12 + 0.46 * t);
        ctx.beginPath();
        ctx.moveTo(px0 - hh * 0.06, py0 + hh * 0.03);
        ctx.lineTo(px0 + hh * 0.06, py0 - hh * 0.03);
        ctx.stroke();
      }
    }
    return;
  }

  // --- ROUND ears set LOW and WIDE — the hyena's dish, never the
  // wolf's point or the bear's upright button: a short stem under a
  // round blade, canted HARD off the skull's top corners, drawn
  // BEFORE the skull so the cranium laps their roots. Far ear steps
  // smaller at the three-quarter bands (the cheap perspective cue);
  // both read from behind as backs — the inner dish faces forward
  // only.
  const drawEar = (side: number, depth: number): void => {
    const er = hh * 0.32 * (0.95 + 0.15 * hv) * depth;
    const dh = hh * 0.54 * (0.92 + 0.16 * hv) * depth;
    const ex = headX - fx * gw * 0.22 + side * gw * 0.98;
    // The roots ride the skull's upper corners and LIFT toward the
    // turned bands — rooted at mid-face, a trailing ear read as a
    // droop on the cheek at three-quarter.
    const baseY = crTop + hh * (0.46 - 0.08 * profileK);
    const notched = gn.scarred && side === nearSide;
    ctx.save();
    ctx.translate(ex, baseY);
    // The hard out-cant: the dish roots on the skull's SIDE and leans
    // toward ten-and-two — the listening tilt that says hyena. Ears
    // perched upright on the crown corners were the teddy-bear tell.
    ctx.rotate(side * (0.58 + 0.08 * (1 - profileK)));
    // Front ears sit a value under the crown so they never glow; the
    // backs go darker still.
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, back ? -16 : -8);
    ctx.beginPath();
    ctx.moveTo(-er * 0.92, 0);
    ctx.lineTo(-er, -dh + er);
    ctx.arc(0, -dh + er, er, Math.PI, notched ? Math.PI * 1.6 : Math.PI * 2);
    if (notched) {
      // The notch: a bite taken out of the rim, healed ragged.
      ctx.lineTo(er * 0.34, -dh + er * 0.66);
      ctx.lineTo(er, -dh + er * 0.94);
    }
    ctx.lineTo(er * 0.92, 0);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -20);
      ctx.lineWidth = Math.max(1, er * 0.13);
      ctx.stroke();
      if (!back) {
        // The inner dish: a deep dark cavity FILLING the round blade —
        // concentric bright/dark rings read as a ring toy, so the
        // shadow owns the ear and only a soft rim of fur survives.
        ctx.fillStyle = shade(gn.skin, -40);
        ctx.beginPath();
        ctx.ellipse(fx * er * 0.1, -dh + er * 0.96, er * 0.8, er * 0.84, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!notched) {
          // Every skulker's ears carry a scrap-fight nick — a dark
          // wedge bitten into the outer rim, seeded per body.
          const nickT = 0.34 + 0.3 * (((seed >>> (side > 0 ? 3 : 9)) & 7) / 7);
          ctx.fillStyle = mask;
          ctx.beginPath();
          ctx.moveTo(side * er * 1.02, -dh * nickT);
          ctx.lineTo(side * er * 0.52, -dh * nickT - er * 0.2);
          ctx.lineTo(side * er * 1.02, -dh * nickT - er * 0.38);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Ear back: a fur seam up the middle keeps it a volume.
        ctx.strokeStyle = shade(gn.fur, -14);
        ctx.lineWidth = Math.max(1, er * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, -er * 0.3);
        ctx.lineTo(0, -dh + er * 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  if (profileK < 0.72 || back) drawEar(-nearSide, back ? 1 : 0.84);
  drawEar(nearSide, 1);

  // --- cranium block: heavy crown chamfers dome the forehead.
  ctx.fillStyle = fur;
  ctx.beginPath();
  chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.7, cut * 1.7, cut * 0.55, cut * 0.55]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for fur: hard shade right half, lit
    // crown band, jaw under-shade — the block reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.7, cut * 1.7, cut * 0.55, cut * 0.55]);
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -10);
    ctx.fillRect(headX, crTop, gw, crBot - crTop);
    ctx.fillStyle = shade(gn.fur, 9);
    ctx.fillRect(headX - gw, crTop, gw * 2, hh * 0.13);
    ctx.fillStyle = shade(gn.fur, -16);
    ctx.fillRect(headX - gw, crBot - hh * 0.1, gw * 2, hh * 0.1);
    // The spot field: seeded speckles over the trailing cheek and
    // crown — broken hyena dapple, never a grid. Deterministic from
    // the spawn seed so a body keeps its own coat frame to frame.
    ctx.fillStyle = shade(gn.spot, 0);
    for (let i = 0; i < 5; i++) {
      const h = ((seed >>> (i * 3)) ^ (seed * 41 + i * 97)) | 0;
      const sxr = ((h & 15) / 15) * 2 - 1;
      const syr = (((h >> 4) & 15) / 15) * 2 - 1;
      const bx = headX - fx * gw * 0.34 + sxr * gw * 0.52;
      // Crown and temples only — the muzzle repaints the lower face,
      // and a spot under it would vanish anyway.
      const by = crTop + (crBot - crTop) * (0.18 + 0.3 * (syr * 0.5 + 0.5));
      const br = hh * (0.055 + 0.03 * (((h >> 8) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.25, br, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- cheek ruffs: jagged fur flaring sideways off the jaw line —
  // the sideburn wedges that break the clean box and read "wild
  // animal" from every band. Far ruff first so the near one laps it.
  const drawRuff = (side: number, depth: number): void => {
    const rx0 = headX - fx * gw * 0.06 + side * gw * 0.88;
    const reach = gw * 0.36 * depth * (0.9 + 0.2 * hv);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gn.fur, -5);
    ctx.beginPath();
    ctx.moveTo(rx0, headY - hh * 0.08);
    ctx.lineTo(rx0 + side * reach, headY + hh * 0.1);
    ctx.lineTo(rx0 + side * gw * 0.06, headY + hh * 0.22);
    ctx.lineTo(rx0 + side * reach * 0.86, headY + hh * 0.42);
    ctx.lineTo(rx0 + side * gw * 0.04, headY + hh * 0.48);
    ctx.lineTo(rx0 + side * reach * 0.55, headY + hh * 0.66);
    ctx.lineTo(rx0 - side * gw * 0.08, headY + hh * 0.6);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // One mask-dark tooth in the ruff keeps it ratty, not fluffy.
      ctx.fillStyle = mask;
      ctx.beginPath();
      ctx.moveTo(rx0 + side * gw * 0.02, headY + hh * 0.26);
      ctx.lineTo(rx0 + side * reach * 0.7, headY + hh * 0.46);
      ctx.lineTo(rx0 + side * gw * 0.01, headY + hh * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  };
  if (!back) {
    if (profileK < 0.72) drawRuff(-nearSide, 0.8);
    drawRuff(nearSide, 1);
  }

  if (back) {
    // --- the occiput: no face from behind. Fur courses, the nape
    // shadow where the skull sinks into the hump, and the mane hood
    // owning the crown and pouring down the middle in falling locks.
    if (!hurt) {
      ctx.strokeStyle = shade(gn.fur, -14);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const t of [0.38, 0.64]) {
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + gw * 0.6, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      ctx.fillStyle = shade(gn.fur, -18);
      ctx.beginPath();
      chamferRect(ctx, headX - gw * 0.44, crBot - hh * 0.16, gw * 0.88, hh * 0.16, cut * 0.3);
      ctx.fill();
      // The mane from behind: ONE connected fall — a crown cap arcing
      // the full skull width whose bottom edge tears into ragged
      // locks pouring down the occiput, deepest at the spine line, so
      // the whole band reads as hair over the head, never a panel
      // strapped to it.
      ctx.fillStyle = gn.mane;
      ctx.beginPath();
      ctx.moveTo(headX - gw * 0.88, crTop + hh * 0.08);
      ctx.quadraticCurveTo(headX, crTop - hh * 0.16, headX + gw * 0.88, crTop + hh * 0.08);
      ctx.lineTo(headX + gw * 0.62, crTop + hh * 0.46);
      for (const [xk, dk] of [
        [0.5, 0.5],
        [0.34, 1.05],
        [0.18, 0.58],
        [0.02, 1.3],
        [-0.16, 0.6],
        [-0.34, 1.02],
        [-0.5, 0.48],
      ] as const) {
        ctx.lineTo(headX + xk * gw, crTop + hh * (0.42 + dk * 0.72 * (1 + 0.3 * (hv - 1))));
      }
      ctx.lineTo(headX - gw * 0.62, crTop + hh * 0.46);
      ctx.closePath();
      ctx.fill();
      // The center seam: a darker part line down the spine of the fall.
      ctx.strokeStyle = shade(gn.mane, -14);
      ctx.lineWidth = Math.max(1, hh * 0.07);
      ctx.beginPath();
      ctx.moveTo(headX, crTop + hh * 0.1);
      ctx.lineTo(headX + gw * 0.02, crTop + hh * (0.42 + 1.15 * 0.72 * (1 + 0.3 * (hv - 1))));
      ctx.stroke();
      if (gn.scarred) {
        // Frost tips streak the fall.
        ctx.strokeStyle = shade(gn.mane, 42);
        ctx.lineWidth = Math.max(1, hh * 0.05);
        for (const o of [-0.42, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(headX + o * gw * 0.6, crTop + hh * 0.3);
          ctx.lineTo(headX + o * gw * 0.68, crTop + hh * 1.0);
          ctx.stroke();
        }
      }
    }
    return;
  }

  // --- THE MUZZLE: SHORT, DEEP, BLUNT — the bone-cracker, never the
  // wolf's plank. The top edge is the hyena's ROMAN SLOPE: it leaves
  // the brow high and falls convex to a blunt tip barely past the
  // cheek, while the jaw beneath runs DEEP. Face-on the box is most
  // of the face; at profile it reads dome-then-drop. The long
  // horizontal box with a ball nose was the wolf tell.
  const jawDrop = f.gape * hh * 0.46;
  const snLen = gw * (0.34 + 0.36 * profileK);
  const rootX = headX + fx * gw * 0.24;
  const tipX = rootX + fx * snLen;
  const snHw = gw * (0.52 - 0.18 * profileK);
  const x0 = Math.min(rootX, tipX) - snHw * (1 - profileK);
  const x1 = Math.max(rootX, tipX) + snHw * (1 - profileK);
  const fxs = fx >= 0 ? 1 : -1;
  const xa = fxs > 0 ? x0 : x1; // rear edge, toward the skull
  const xb = fxs > 0 ? x1 : x0; // fore edge, the blunt tip
  const topRearY = headY - hh * (0.1 + 0.26 * profileK);
  const topForeY = headY - hh * (0.1 - 0.18 * profileK);
  // Face-on the box runs DEEP — the bone-cracker jaw is most of the
  // face; a shallow muzzle under a pale chin read plush, not gnoll.
  const botY = headY + hh * (0.88 - 0.26 * profileK);
  const cc = cut * 0.6;
  const muzzlePath = (): void => {
    ctx.beginPath();
    ctx.moveTo(xa, topRearY);
    // The convex bow on the slope — the Roman line. Face-on the two
    // top corners level out and the bow vanishes.
    ctx.quadraticCurveTo(
      (xa + xb) / 2,
      Math.min(topRearY, topForeY) - hh * 0.05 * profileK,
      xb - fxs * cc,
      topForeY,
    );
    ctx.lineTo(xb, topForeY + cc); // the blunt front: straight down,
    ctx.lineTo(xb, botY - cc * 1.3); // no taper, no point
    ctx.lineTo(xb - fxs * cc * 1.5, botY);
    ctx.lineTo(xa + fxs * cc * 1.5 * (1 - profileK), botY);
    ctx.lineTo(xa, botY - cc * 1.3 * (1 - profileK));
    ctx.closePath();
  };
  // A value LIGHTER than the skull — the muzzle must separate as its
  // own volume from every band, or the face reads as one flat slab.
  const muzC = hurt ? '#ffffff' : shade(gn.fur, 7);
  ctx.fillStyle = muzC;
  muzzlePath();
  ctx.fill();
  if (!hurt) {
    // The saddle, the form-split shade, and the deep jowl shadow —
    // the muzzle must read as a WEIGHTED box, and every mark inside
    // clips to the Roman slope so nothing paints past the bridge.
    ctx.save();
    muzzlePath();
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -12);
    const shX = headX > (x0 + x1) / 2 ? (x0 + x1) / 2 : headX;
    ctx.fillRect(shX, topRearY - hh * 0.32, x1 - shX, botY - topRearY + hh * 0.32);
    // THE BRIDGE SADDLE: mask ink riding the slope — at profile the
    // full run of the bridge; face-on a CENTER blaze down to the
    // nose, so saddle, brow, and sockets stay three separate marks.
    const brCx = (x0 + x1) / 2 + fx * (x1 - x0) * 0.06;
    const brHw = ((x1 - x0) / 2) * (0.42 + 0.58 * profileK);
    const brTop = Math.min(topRearY, topForeY) - hh * 0.08;
    // The blaze STOPS short of the nose — saddle, fur gap, then the
    // pad, or the two merge into one black T across the face.
    const brBot = headY + hh * (-0.08 + 0.24 * profileK);
    ctx.fillStyle = mask;
    ctx.fillRect(brCx - brHw, brTop, brHw * 2, brBot - brTop);
    ctx.fillStyle = shade(gn.mask, -10);
    ctx.fillRect(brCx - brHw, brTop, brHw * 2, Math.max(0, headY - hh * 0.18 - brTop));
    // Jowl under-shade seats the jaw.
    ctx.fillStyle = shade(gn.fur, -20);
    ctx.fillRect(Math.min(x0, x1), botY - hh * 0.15, Math.abs(x1 - x0), hh * 0.15);
    ctx.restore();
  }

  // --- the nose: a broad squared PAD wrapping the blunt tip — wider
  // than tall face-on, turned onto the front plane at profile. Never
  // a ball on a stick (the second wolf tell).
  const noseX =
    ((x0 + x1) / 2) * (1 - profileK) + (xb - fxs * hh * 0.16) * profileK + fx * gw * 0.02;
  const noseY = (headY + hh * 0.17) * (1 - profileK) + (topForeY + hh * 0.2) * profileK;
  const nw = snHw * (0.42 - 0.14 * profileK);
  const nh = hh * 0.14 * (0.95 + 0.15 * hv);
  ctx.fillStyle = hurt ? '#ffffff' : gn.nose;
  ctx.beginPath();
  chamferRect(ctx, noseX - nw, noseY - nh, nw * 2, nh * 2, Math.min(cc, nw * 0.5));
  ctx.fill();
  if (!hurt) {
    // One lit facet on the lead top corner keeps the pad a form.
    ctx.fillStyle = shade(gn.nose, 24);
    ctx.beginPath();
    ctx.ellipse(noseX - nw * 0.4 + fx * nw * 0.2, noseY - nh * 0.4, nw * 0.34, nh * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- THE GRIN: the hyena's whole argument. A bold dark seam runs
  // the muzzle's width and RISES toward the cheek corners, the lips
  // pulled off a meshed tooth row; the lower canines jut PROUD of the
  // seam even shut — the gnoll signature no other dialect carries
  // (the skeleton grins, the kobold bucks, the gnoll juts). The gape
  // drops the mandible off the seam into the open maw: the cackle.
  const mdHw = snHw * 0.58;
  const mdX = noseX * (1 - profileK) + (rootX + fx * snLen * 0.34) * profileK;
  const mouthY = (headY + hh * 0.46) * (1 - profileK) + (botY - hh * 0.42) * profileK;
  const mdTop = botY - hh * 0.1 + jawDrop;
  const lipInk = shade(gn.nose, -4);
  if (jawDrop > hh * 0.03) {
    // The open maw behind the dropped jaw — dark red meat, a tongue,
    // and the UPPER tooth row hanging into it: the cackle is a threat
    // display, and teeth are the whole message.
    ctx.fillStyle = hurt ? '#241a2e' : '#2e1418';
    ctx.beginPath();
    chamferRect(ctx, mdX - mdHw * 1.05, mouthY - hh * 0.06, mdHw * 2.1, mdTop - mouthY + hh * 0.12, cut * 0.25);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#7c3234';
      ctx.beginPath();
      ctx.ellipse(mdX + fx * mdHw * 0.2, mdTop - hh * 0.03, mdHw * 0.6, hh * 0.07 + jawDrop * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efe6cf';
      for (const off of [-0.62, -0.05, 0.55]) {
        const ixT = mdX + fx * mdHw * 0.3 + off * mdHw * 0.78 * (1 - profileK * 0.4);
        ctx.beginPath();
        ctx.moveTo(ixT - hh * 0.05, mouthY - hh * 0.03);
        ctx.lineTo(ixT, mouthY - hh * 0.03 + hh * (off === -0.05 ? 0.14 : 0.22) + jawDrop * 0.2);
        ctx.lineTo(ixT + hh * 0.05, mouthY - hh * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (!hurt) {
    // The shut-mouth GRIN SEAM: wide, sagging under the nose, rising
    // hard into the cheek corners — drawn as strokes (never fills:
    // the back-band ink law) with the tooth row meshed across it.
    ctx.strokeStyle = lipInk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, hh * 0.075);
    ctx.beginPath();
    if (profileK <= 0.55) {
      // Face-on: one wide swoop, both corners rising.
      ctx.moveTo(mdX - mdHw * 1.5, mouthY - hh * 0.14);
      ctx.quadraticCurveTo(mdX - mdHw * 0.8, mouthY + hh * 0.07, mdX, mouthY + hh * 0.06);
      ctx.quadraticCurveTo(mdX + mdHw * 0.8, mouthY + hh * 0.07, mdX + mdHw * 1.5, mouthY - hh * 0.14);
    } else {
      // Profile: the seam leaves the blunt tip, sags, and rises past
      // the muzzle root into the cheek — the grin runs DEEP.
      ctx.moveTo(xb - fxs * hh * 0.04, mouthY + hh * 0.02);
      ctx.quadraticCurveTo(
        (xb + rootX) / 2,
        mouthY + hh * 0.12,
        rootX - fxs * gw * 0.12,
        mouthY - hh * 0.18,
      );
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    // The meshed rows: upper teeth hang OFF the seam, lower canines
    // jut UP past it near the corners — shut, and still a threat.
    ctx.fillStyle = '#e8dcc0';
    const grinX = (t: number): number =>
      profileK <= 0.55 ? mdX + t * mdHw * 1.3 : xb - fxs * hh * 0.04 + (rootX - fxs * gw * 0.06 - (xb - fxs * hh * 0.04)) * (t * 0.5 + 0.5);
    const grinY = (t: number): number =>
      profileK <= 0.55
        ? mouthY + hh * 0.05 - Math.abs(t) * Math.abs(t) * hh * 0.16
        : mouthY + hh * 0.06 - (t * 0.5 + 0.5) * (t * 0.5 + 0.5) * hh * 0.2;
    for (const t of [-0.72, -0.24, 0.24, 0.72]) {
      const txx = grinX(t);
      const tyy = grinY(t);
      ctx.beginPath();
      ctx.moveTo(txx - hh * 0.045, tyy);
      ctx.lineTo(txx, tyy + hh * 0.12 * (1 + 0.2 * (hv - 1)));
      ctx.lineTo(txx + hh * 0.045, tyy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#efe6cf';
    for (const t of [-0.95, 0.95]) {
      if (profileK > 0.55 && t < 0) continue; // one canine at profile
      const txx = grinX(t * 0.92);
      const tyy = grinY(t * 0.92) + hh * 0.06;
      const fang = hh * 0.2 * (1 + 0.3 * (hv - 1));
      ctx.beginPath();
      ctx.moveTo(txx - hh * 0.055, tyy);
      ctx.lineTo(txx + fx * hh * 0.015, tyy - fang);
      ctx.lineTo(txx + hh * 0.055, tyy);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The mandible chin strap: pale underfur under the grin, dropping
  // with the gape — a strap, never a bib (the wide pale chin was the
  // first cut's plush-toy tell).
  ctx.fillStyle = hurt ? '#ffffff' : shade(gn.underfur, -16);
  ctx.beginPath();
  chamferRect(ctx, mdX - mdHw, mdTop, mdHw * 2, hh * 0.18, [0, 0, cut * 0.5, cut * 0.5]);
  ctx.fill();
  if (!hurt && jawDrop > hh * 0.03) {
    // The underbite row rides the dropped jaw's leading edge.
    ctx.fillStyle = '#efe6cf';
    for (const [off, tall] of [[-0.55, 0.2], [0, 0.28], [0.55, 0.2]] as const) {
      const ix = mdX + fx * mdHw * 0.3 + off * mdHw * 0.6 * (1 - profileK * 0.4);
      ctx.beginPath();
      ctx.moveTo(ix - hh * 0.05, mdTop + hh * 0.02);
      ctx.lineTo(ix + fx * hh * 0.02, mdTop + hh * 0.02 - hh * tall * (1 + 0.25 * (hv - 1)));
      ctx.lineTo(ix + hh * 0.05, mdTop + hh * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!hurt && f.gape > 0.25) {
    // Snarl creases: the bridge wrinkles up when the jaw drops — the
    // gape is a SNARL, not a yawn.
    ctx.strokeStyle = shade(gn.mask, -14);
    ctx.lineWidth = Math.max(1, hh * 0.04);
    for (const o of [0.2, 0.42]) {
      const wy = topRearY + (topForeY - topRearY) * o + hh * (0.16 + o * 0.3);
      ctx.beginPath();
      ctx.moveTo(rootX + fx * snLen * o - snHw * 0.32 * (1 - profileK), wy);
      ctx.quadraticCurveTo(
        rootX + fx * snLen * (o + 0.14),
        wy - hh * 0.1,
        rootX + fx * snLen * o + snHw * 0.32 * (1 - profileK) + fx * hh * 0.06,
        wy,
      );
      ctx.stroke();
    }
  }

  // --- the muzzle scar: the packlord's ledger, a pale seam raked
  // down the slope on the near side.
  if (gn.scarred && !hurt) {
    ctx.strokeStyle = shade(gn.fur, 52);
    ctx.lineWidth = Math.max(1.5, hh * 0.07);
    const scx = rootX + fx * snLen * 0.45 + nearSide * snHw * 0.16;
    const scTop = topRearY + (topForeY - topRearY) * 0.45;
    ctx.beginPath();
    ctx.moveTo(scx - hh * 0.12, scTop + hh * 0.1);
    ctx.lineTo(scx + hh * 0.1, scTop + hh * 0.58);
    ctx.stroke();
    // Two stitch ticks across it — an old wound, badly closed.
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const t of [0.3, 0.62]) {
      const px0 = scx - hh * 0.12 + hh * 0.22 * t;
      const py0 = scTop + hh * (0.1 + 0.48 * t);
      ctx.beginPath();
      ctx.moveTo(px0 - hh * 0.06, py0 + hh * 0.03);
      ctx.lineTo(px0 + hh * 0.06, py0 - hh * 0.03);
      ctx.stroke();
    }
  }

  // --- THE SCOWL: a heavy mask-dark brow ledge angled DOWN toward
  // the muzzle root — two wedges meeting in a V. This single mark
  // flips the face from curious to predatory; it paints OVER the
  // muzzle root so the brow visibly hoods the eyes.
  const eyeY = headY - hh * 0.3;
  const pairX = headX + fx * gw * 0.36;
  const eyeDx = gw * 0.34 * (1 - profileK * 0.5);
  if (!hurt) {
    ctx.fillStyle = mask;
    for (const sd of [-1, 1]) {
      if (sd !== nearSide && profileK > 0.78) continue;
      const inX = pairX + sd * gw * 0.04;
      const outX = pairX + sd * (eyeDx + gw * 0.3);
      ctx.beginPath();
      ctx.moveTo(inX, eyeY + hh * 0.02);
      ctx.lineTo(outX, eyeY - hh * 0.26);
      ctx.lineTo(outX + sd * gw * 0.02, eyeY - hh * 0.08);
      ctx.lineTo(inX + sd * gw * 0.02, eyeY + hh * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- the eyes: small, close-set, SUNK under the brow — lit amber
  // beads in dark sockets, the scavenger's sizing-you-up squint,
  // never round wonder. The far eye slips around the corner at
  // profile.
  for (const sd of [-1, 1]) {
    if (sd !== nearSide && profileK > 0.78) continue;
    const ex = pairX + sd * eyeDx;
    const eyY = eyeY + hh * 0.05;
    if (!hurt) {
      // The socket: a mask-dark pocket the bead burns inside.
      ctx.fillStyle = shade(gn.mask, -12);
      ctx.beginPath();
      ctx.ellipse(ex, eyY, hh * 0.125, hh * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
      // A faint burn, not a halo — a wide bright ring read cartoon.
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = gn.eye;
      ctx.beginPath();
      ctx.arc(ex, eyY, hh * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = hurt ? '#241a2e' : gn.eye;
    ctx.beginPath();
    ctx.arc(ex, eyY, hh * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      ctx.arc(ex + fx * hh * 0.022, eyY + hh * 0.014, hh * 0.046, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * The crest hump: the gnoll's hunched shoulders drawn in the torso's
 * local frame AFTER the garment and BEFORE the head — high withers in
 * FUR (the scraps a gnoll wears never cover its own back) with the
 * mane's bristle ridge marching down the slope. The low-slung skull
 * sinks into it; face-on and from behind it reads as the bowed back
 * the whole species carries.
 */
export function paintGnollCrest(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: KoboldHumpFrame,
): void {
  const { tw, th, fx, backK, hurt } = f;
  const hv = gn.heavy;
  const cx = -fx * tw * 0.34;
  const cy = -th + th * 0.02;
  const rx = tw * (0.96 + 0.12 * backK);
  const ry = th * 0.36 * (1 + 0.3 * (hv - 1));
  const fur = hurt ? '#ffffff' : gn.fur;
  // The withers: a heavy shoulder boulder the skull sinks into — the
  // species' whole silhouette argument. It rises well ABOVE the torso
  // line so the back reads bowed from every band.
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + rx, cy + ry * 0.4);
  ctx.lineTo(cx - rx, cy + ry * 0.4);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    // Form split over the hump, the shoulder dapple, then the mane
    // ridge marching the crown — the nape hood above pours into THIS.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(gn.fur, -9);
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.fillStyle = shade(gn.fur, 8);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.4);
    // The dorsal mask: the dark saddle tone creeping over the trailing
    // slope of the hump — the hyena's back is darker than its flank.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gn.mask;
    ctx.fillRect(cx - fx * rx * 0.5 - rx * (1 - Math.abs(fx)) * 0.2, cy - ry, rx * 0.9, ry * 0.55);
    ctx.globalAlpha = 1;
    // The shoulder dapple: the hump is the coat's widest field — the
    // speckled read lives or dies here, seeded per body like the head.
    ctx.fillStyle = gn.spot;
    const seed = gn.seed ?? 0;
    for (let i = 0; i < 4; i++) {
      const h = ((seed >>> (i * 5)) ^ (seed * 53 + i * 131)) | 0;
      const sx = cx + (((h & 15) / 15) * 2 - 1) * rx * 0.7;
      const sy = cy - ry * 0.1 - ((h >> 4) & 7) / 7 * ry * 0.5;
      const sr = ry * (0.13 + 0.07 * (((h >> 7) & 3) / 3));
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr * 1.3, sr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // THE MANE RIDGE: one connected sawtooth band riding the crown
    // arc, teeth raking toward the tail — a standing ridge of bristle,
    // never separate pasted triangles. Taller on the packlord.
    const n = 6;
    const ridge = (inset: number, tallK: number, col: string): void => {
      ctx.fillStyle = col;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        const bx = cx + t * rx * 0.72 * inset;
        const lift = Math.sqrt(Math.max(0, 1 - (t * 0.72 * inset) ** 2));
        const by = cy - ry * lift * 0.94;
        const tall =
          ry * (0.5 + 0.34 * Math.sin(i * 2.1 + 0.6)) * tallK * (1 + 0.6 * (hv - 1));
        if (!started) {
          ctx.moveTo(bx - tw * 0.1, by + ry * 0.18);
          started = true;
        }
        ctx.lineTo(bx - fx * tw * 0.12 + t * tw * 0.04, by - tall);
        ctx.lineTo(bx + tw * 0.1, by + ry * 0.1);
      }
      // The skirt closes the band back along the crown so the ridge
      // reads as one mass rooted in the hump.
      ctx.lineTo(cx + rx * 0.74 * inset, cy + ry * 0.06);
      ctx.lineTo(cx - rx * 0.74 * inset, cy + ry * 0.06);
      ctx.closePath();
      ctx.fill();
    };
    ridge(1, 1, gn.mane);
    if (gn.scarred) {
      // Packlord frost: a paler inner ridge over the iron one.
      ridge(0.82, 0.66, shade(gn.mane, 42));
    }
  }
}

/** Torso-local frame for the gnoll body coat overpaint. */
export interface GnollBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
}

/**
 * THE BODY COAT — the gnoll's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain fur) and
 * BEFORE the crest hump. It turns the flat tunic block into an
 * animal: pale belly panel face-on, the dark dorsal saddle from
 * behind, seeded rosettes on the flanks, a ragged pelt fringe over
 * the hip seam, and the scavenger's crude hide harness with its bone
 * fetishes — species dressing painted on, never equipment (nothing
 * here drops, so nothing here lies).
 */
export function paintGnollBody(
  ctx: CanvasRenderingContext2D,
  gn: GnollLook,
  f: GnollBodyFrame,
): void {
  const { s, tw, ww, th, fy, profileK, backK, lead, hurt } = f;
  const back = backK > 0.55;
  const frontK = Math.max(0, Math.min(1, (fy - 0.1) / 0.35));
  const seed = gn.seed ?? 0;
  if (hurt) return; // the hurt flash keeps the silhouette clean
  if (frontK > 0.05 && !back) {
    // The belly panel: pale underfur from the throat pit to the
    // waist, ragged along its edges — the soft underside every
    // predator body carries under a darker back.
    ctx.globalAlpha = frontK;
    ctx.fillStyle = shade(gn.underfur, -6);
    const bw = ww * 0.6 * (1 - profileK * 0.55);
    const yT = -th * 0.66;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.7, yT);
    ctx.quadraticCurveTo(0, yT - th * 0.08, bw * 0.7, yT);
    ctx.lineTo(bw, -th * 0.34);
    ctx.lineTo(bw * 0.8, -th * 0.3);
    ctx.lineTo(bw * 0.96, -th * 0.12);
    ctx.lineTo(bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.72, 0.005 * s);
    ctx.lineTo(-bw * 0.96, -th * 0.12);
    ctx.lineTo(-bw * 0.8, -th * 0.3);
    ctx.lineTo(-bw, -th * 0.34);
    ctx.closePath();
    ctx.fill();
    // The chest shadow: the head hangs OVER this torso — a soft dark
    // pocket under the jaw line seats the slung skull.
    ctx.fillStyle = shade(gn.fur, -18);
    ctx.beginPath();
    ctx.ellipse(0, -th * 0.86, tw * 0.5, th * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (backK > 0.25) {
    // The dorsal fall: the MANE keeps going — a tapering column of
    // bristle in the mane's own ink pouring from under the hump down
    // the spine, ragged at its tip. One continuous read from crown to
    // mid-back, never a bib strapped over a tunic.
    ctx.globalAlpha = Math.min(1, backK * 1.3) * 0.9;
    ctx.fillStyle = gn.mane;
    const sw = tw * 0.56;
    ctx.beginPath();
    ctx.moveTo(-sw, -th * 0.99);
    ctx.lineTo(sw, -th * 0.99);
    ctx.lineTo(sw * 0.66, -th * 0.62);
    ctx.lineTo(sw * 0.4, -th * 0.68);
    ctx.lineTo(sw * 0.3, -th * 0.34);
    ctx.lineTo(sw * 0.06, -th * 0.5);
    ctx.lineTo(-sw * 0.08, -th * 0.2);
    ctx.lineTo(-sw * 0.3, -th * 0.56);
    ctx.lineTo(-sw * 0.52, -th * 0.44);
    ctx.lineTo(-sw * 0.66, -th * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The flank rosettes: the hyena dapple across the widest field the
  // body owns, seeded per body — a warband of individuals.
  ctx.fillStyle = gn.spot;
  for (let i = 0; i < 5; i++) {
    const h = ((seed >>> (i * 4)) ^ (seed * 71 + i * 113)) | 0;
    const sxr = ((h & 15) / 15) * 2 - 1;
    const u = ((h >> 4) & 15) / 15;
    const sx = sxr * tw * 0.72;
    // Spots live on the FLANKS: skip the belly center face-on.
    if (!back && frontK > 0.4 && Math.abs(sxr) < 0.4) continue;
    const sy = -th * (0.2 + 0.55 * u);
    const sr = th * (0.045 + 0.03 * (((h >> 8) & 3) / 3));
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 1.35, sr, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The pelt fringe: ragged fur teeth breaking over the hip seam so
  // the torso ENDS in coat, never in a tailored hem.
  ctx.fillStyle = shade(gn.fur, -8);
  ctx.beginPath();
  const fw = ww * 1.06;
  ctx.moveTo(-fw, -0.035 * s);
  ctx.lineTo(fw, -0.035 * s);
  for (let i = 5; i >= 0; i--) {
    const u = i / 5;
    const bx = -fw + u * 2 * fw;
    const drop = 0.034 * s * (0.7 + 0.5 * Math.sin(i * 2.4 + seed * 0.7));
    ctx.lineTo(bx + fw * 0.09, 0.01 * s);
    ctx.lineTo(bx, 0.01 * s + drop);
  }
  ctx.closePath();
  ctx.fill();
  // THE HARNESS: one crude hide strap slung shoulder-to-hip — the
  // scavenger's only tailoring. It crosses the chest face-on and the
  // back from behind (a real strap wraps the body), and carries its
  // bone fetishes only on the chest run.
  const strap = '#3a2a1a';
  const sx0 = lead * tw * 0.72;
  const sy0 = -th * 0.94;
  const sx1 = -lead * ww * 0.8;
  const sy1 = -0.03 * s;
  ctx.strokeStyle = strap;
  ctx.lineWidth = Math.max(2, s * 0.042);
  ctx.beginPath();
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.stroke();
  // The strap's worn highlight — leather, not a painted line.
  ctx.strokeStyle = shade(strap, 20);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(sx0 - lead * s * 0.008, sy0 + s * 0.006);
  ctx.lineTo(sx1 - lead * s * 0.008, sy1 + s * 0.006);
  ctx.stroke();
  if (!back && frontK > 0.3) {
    // Bone fetishes riding the strap: teeth taken off things it ate.
    // The packlord strings more of them — rank counted in trophies.
    const nT = gn.scarred ? 4 : 2;
    for (let i = 0; i < nT; i++) {
      const u = 0.3 + (i / Math.max(1, nT - 1)) * 0.3;
      const bx = sx0 + (sx1 - sx0) * u;
      const by = sy0 + (sy1 - sy0) * u + s * 0.012;
      ctx.fillStyle = '#d8cbaa';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.012, by);
      ctx.lineTo(bx + (i % 2 === 0 ? 1 : -1) * s * 0.006, by + s * 0.036);
      ctx.lineTo(bx + s * 0.012, by);
      ctx.closePath();
      ctx.fill();
    }
    if (gn.scarred) {
      // The packlord's iron ring cinching the strap mid-chest.
      ctx.strokeStyle = '#5d6068';
      ctx.lineWidth = Math.max(1.5, s * 0.014);
      ctx.beginPath();
      ctx.arc(sx0 + (sx1 - sx0) * 0.5, sy0 + (sy1 - sy0) * 0.5, s * 0.028, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * THE GREENSKIN DIALECT — the goblin, done at last as its own species.
 * Fifth head-swap dialect after bone, scale, fur, and construct: it
 * swaps head, hair, and face wholesale and reshapes the body's ARGUMENT
 * — the biggest head in the game on the smallest frame, a pot gut over
 * bandy shanks, overlong arms ending in knuckly hands — while the IK
 * rig, carriage, and facing bands keep working untouched. Where the
 * skeleton grins, the kobold bucks, and the gnoll juts, the goblin
 * FLARES: enormous back-swept wing ears wider than the shoulders, the
 * one silhouette that reads goblin at any distance. Each variant is a
 * DESIGN, never a scale-up; the rank-and-file additionally roll a HIDE
 * CLUSTER from the spawn seed so a warband reads as family, never as
 * one body stamped five times.
 */
export interface GoblinLook {
  /** Hide base — the green that names the species. */
  hide: string;
  /** Pale underhide: the pot gut, jaw, palms, and the ear membranes. */
  belly: string;
  /** The dark face ink: pupils, nostrils, maw, claw ticks, the scowl. */
  ink: string;
  /** The lit eye bead — bright, mean, and too small for the head. */
  eye: string;
  /**
   * The loincloth wrap: every goblin owns real underwear — a cloth
   * band lapping the pelvis with a torn apron front and seat. Dirty
   * scrap-cloth on the rabble, school-dyed on the casters, oiled
   * leather under the warboss iron.
   */
  cloth: string;
  /**
   * The casters' ragged half-cowl and shawl; undefined = the bare
   * chest and scrap belt of the rank-and-file.
   */
  garb?: string;
  /** The warboss war-knot: a rag-tied bristle spike on the crown. */
  topknot?: string;
  /** Paired up-tusks proud of the lip — the warboss jaw. */
  tusks?: boolean;
  /** Battle-worn: a notched ear and a cheek scar — rank as ledger. */
  scarred?: boolean;
  /** Frame multiplier: jaw mass, ear reach, gut swell. */
  heavy: number;
  /** Spawn seed carried on the resolved look — per-body wear marks. */
  seed?: number;
}

/** Needle teeth and tusk bone — one tone for every goblin mouth. */
const GOBLIN_TOOTH = '#e9e0c6';

export const GOBLIN_LOOKS: Record<string, GoblinLook> = {
  // The rank-and-file chopper: moss hide over a pale gut, sulfur eyes
  // under a scowl it was born wearing — brave only in a crowd.
  goblin: {
    hide: '#6f9a44',
    belly: '#b9cb8c',
    ink: '#2a2416',
    eye: '#ffd84a',
    cloth: '#7c6648',
    heavy: 1,
  },
  // The thrower: a wirier build a shade toward olive — the arm that
  // lives at the back of every scrap, pockets full of river stones.
  goblin_thrower: {
    hide: '#7f9540',
    belly: '#c4c690',
    ink: '#2a2416',
    eye: '#ffd84a',
    cloth: '#6e6a52',
    heavy: 0.88,
  },
  // The firecaller: sallow hide under an ember-dyed rag cowl — the
  // camp's fire carried in a shawl that never stopped smouldering.
  goblin_firecaller: {
    hide: '#8a9a4a',
    belly: '#cbc892',
    ink: '#2b2214',
    eye: '#ffb23a',
    cloth: '#8a5230',
    garb: '#b85c26',
    heavy: 1,
  },
  // The gloomcaller: bog-dark hide in a murk-green cowl, eyes lit the
  // sick green of its own bile — even the warband walks around it.
  goblin_gloomcaller: {
    hide: '#5f7d3f',
    belly: '#a8bd82',
    ink: '#232a18',
    eye: '#b9e04a',
    cloth: '#3d4a34',
    garb: '#333f2a',
    heavy: 1.05,
  },
  // The warboss: deep war-green bulk under scavenged iron, true tusks
  // proud of the lip, a rag-tied war-knot and a cheek that lost an
  // argument once — the one goblin the others stand behind.
  goblin_champion: {
    hide: '#4e7a38',
    belly: '#9cb478',
    ink: '#241f14',
    eye: '#ff9a3a',
    cloth: '#54412e',
    topknot: '#33251a',
    tusks: true,
    scarred: true,
    heavy: 1.35,
  },
  // THE ASHEN TYRANT (the dread crown): the caster-king. Ash-scorched
  // hide — a green that has stood too near its own fires for years —
  // over a soot-pale gut, eyes lit the deep furnace orange no other
  // greenskin burns. Wears the court robe (a tyrant's ash-red, darker
  // than the firecaller's working shawl) over oiled leather, tusked
  // and burn-scarred; NO war-knot — this crown's crown is the fire
  // itself, spoken by the charge every time it winds.
  goblin_flame_tyrant: {
    hide: '#6d7a3a',
    belly: '#b8b184',
    ink: '#241c12',
    eye: '#ff7a2e',
    cloth: '#4a3524',
    garb: '#8f3a24',
    tusks: true,
    scarred: true,
    heavy: 1.2,
  },
};

/**
 * THE HIDE CLUSTERS — four curated greens for the rank-and-file,
 * picked by spawn seed so a camp sorts into family groups (the gnoll
 * coat-cluster law, kept): moss, olive, bog, and the sallow runt.
 * Casters and the warboss never roll — a named goblin is a DESIGN.
 */
const GOBLIN_CLUSTERS: ReadonlyArray<Pick<GoblinLook, 'hide' | 'belly'>> = [
  { hide: '#6f9a44', belly: '#b9cb8c' }, // moss
  { hide: '#847b38', belly: '#cabf8a' }, // olive-brown
  { hide: '#47713e', belly: '#96b47e' }, // bog-dark
  { hide: '#a5ad58', belly: '#ded9a4' }, // the sallow runt
];

const GOBLIN_LOOK_CACHE = new Map<string, GoblinLook>();

/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the chopper's and the thrower's hide
 * cluster plus a small shade jitter; named looks (the casters, the
 * warboss) hold their authored design. Resolved looks are cached —
 * this runs per body per frame.
 */
export function goblinLook(defId: string, seed = 0): GoblinLook {
  const base = GOBLIN_LOOKS[defId] ?? GOBLIN_LOOKS['goblin']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GOBLIN_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GoblinLook;
  if (defId === 'goblin' || defId === 'goblin_thrower') {
    // Hash the seed before picking: warband members spawn with
    // CONSECUTIVE eids, and raw high bits dressed a whole camp in one
    // hide — the hash spreads a spawned warband across the clusters.
    const h = (seed * 2654435761) | 0;
    const cl = GOBLIN_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = { ...base, hide: shade(cl.hide, jit), belly: cl.belly, seed };
  } else {
    // Named looks hold their authored design — only the wear marks
    // stay the body's own.
    look = { ...base, seed };
  }
  GOBLIN_LOOK_CACHE.set(key, look);
  return look;
}

/**
 * The goblin head, drawn in the head block's own frame. Reads goblin
 * by SILHOUETTE first: WING EARS swept back and out past the shoulder
 * line — the widest thing on the body — over a low broad cranium with
 * no chin to speak of, a HOOKED nose leading the facing, beady bright
 * eyes under a born scowl, and the needle grin ear to ear. The jaw
 * drops through every strike beat and the ears PIN BACK with it: the
 * goblin JEERS as it swings. From behind there is no face — occiput
 * hide, the nape wedge, the ears' backs, and the warboss war-knot.
 */
export function paintGoblinHead(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: KoboldHeadFrame,
): void {
  const { headX, headY, hw, hh, cut, fx, profileK, backK, lead, hurt } = f;
  const hv = gb.heavy;
  const hide = hurt ? '#ffffff' : gb.hide;
  const belly = hurt ? '#ffffff' : gb.belly;
  const back = backK > 0.55;
  const nearSide = lead;
  const gape = f.gape;

  // --- the skull box: broad and LOW — all ears and jaw under a flat
  // crown, the cranium of a thing that plans nothing past dinner.
  const gw = hw * 1.1;
  const crTop = headY - hh * 0.62;
  const crBot = headY + hh * 0.56;

  // --- THE WAR-KNOT, laid down first so the crown laps its root: a
  // rag-cinched bristle spike — the warboss banner the whole camp
  // rallies to. It reads from every band, the back included.
  if (gb.topknot && !hurt) {
    const kx = headX - fx * gw * 0.18;
    ctx.fillStyle = gb.topknot;
    ctx.beginPath();
    ctx.moveTo(kx - gw * 0.2, crTop + hh * 0.1);
    ctx.lineTo(kx - gw * 0.08, crTop - hh * (0.52 + 0.1 * (hv - 1)));
    ctx.lineTo(kx + gw * 0.04, crTop - hh * 0.22);
    ctx.lineTo(kx + gw * 0.16, crTop - hh * (0.42 + 0.1 * (hv - 1)));
    ctx.lineTo(kx + gw * 0.24, crTop + hh * 0.1);
    ctx.closePath();
    ctx.fill();
    // The rag tie: a worn red cinch at the root — the one dyed thing
    // a goblin owns.
    ctx.strokeStyle = '#8a4030';
    ctx.lineWidth = Math.max(1.5, hh * 0.09);
    ctx.beginPath();
    ctx.moveTo(kx - gw * 0.16, crTop + hh * 0.02);
    ctx.lineTo(kx + gw * 0.18, crTop - hh * 0.02);
    ctx.stroke();
  }

  // --- THE WING EARS ARE NOT PAINTED HERE: they are elastic bodies
  // (earPhysics.ts — THE EAR IS A SIMULATION), ticked and painted by
  // drawHumanoid in world space around the whole body: the skull-
  // azimuth projection owns the perspective and the per-ear depth
  // term owns the draw order at every band by construction.

  // --- cranium block: chamfered ROUND — a skull, not a crate. The
  // crown corners cut deep and the jaw corners deeper than the other
  // dialects because the jowls below rebuild the width the cuts take.
  ctx.fillStyle = hide;
  ctx.beginPath();
  chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.8, cut * 1.8, cut * 1.3, cut * 1.3]);
  ctx.fill();
  if (!hurt) {
    // THE FORM SPLIT restated for hide: hard shade right half, lit
    // crown band, jaw under-shade — the block reads as mass.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - gw, crTop, gw * 2, crBot - crTop, [cut * 1.8, cut * 1.8, cut * 1.3, cut * 1.3]);
    ctx.clip();
    ctx.fillStyle = shade(gb.hide, -10);
    ctx.fillRect(headX, crTop, gw, crBot - crTop);
    ctx.fillStyle = shade(gb.hide, 9);
    ctx.fillRect(headX - gw, crTop, gw * 2, hh * 0.14);
    ctx.fillStyle = shade(gb.hide, -16);
    ctx.fillRect(headX - gw, crBot - hh * 0.1, gw * 2, hh * 0.1);
    ctx.restore();
  }
  // --- the jowls: cheek masses bulging past the chamfer line, low
  // and wide — the fed-on-anything face. Far jowl steps smaller at
  // the three-quarter bands; both read from behind as skull width.
  const drawJowl = (side: number, depth: number): void => {
    // The jowl retreats toward the jaw's REAR as the head turns — a
    // cheek mass in front of the mouth at profile reads as a flap
    // folded over the face, never as anatomy.
    const jx = headX - fx * gw * (0.08 + 0.52 * profileK) + side * gw * 0.8 * (1 - 0.6 * profileK);
    const jy = headY + hh * 0.24;
    const jk = depth * (1 - 0.22 * profileK);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, side === (fx >= 0 ? 1 : -1) ? -2 : -9);
    ctx.beginPath();
    ctx.ellipse(jx, jy, gw * 0.3 * jk, hh * 0.3 * jk, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (profileK < 0.72 || back) drawJowl(-nearSide, back ? 0.9 : 0.78);
  // Past the profile threshold the authored side view seats its own
  // jowl at the jaw's REAR — the blended one would land mid-face.
  if (profileK <= 0.9 || back) drawJowl(nearSide, back ? 0.9 : 0.95);

  if (back) {
    // --- the occiput: no face from behind. Hide courses, the nape
    // wedge where the skull sinks toward the hunch, and the ear roots
    // reading as knobs off the skull sides.
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -13);
      ctx.lineWidth = Math.max(1, hh * 0.05);
      for (const t of [0.34, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.58, crTop + (crBot - crTop) * t);
        ctx.lineTo(headX + gw * 0.58, crTop + (crBot - crTop) * t);
        ctx.stroke();
      }
      ctx.fillStyle = shade(gb.hide, -20);
      ctx.beginPath();
      chamferRect(ctx, headX - gw * 0.4, crBot - hh * 0.18, gw * 0.8, hh * 0.18, cut * 0.3);
      ctx.fill();
      if (gb.scarred) {
        // The warboss keeps its ledger on the back of its head too: a
        // pale old crease across the occiput.
        ctx.strokeStyle = shade(gb.hide, 26);
        ctx.lineWidth = Math.max(1, hh * 0.05);
        ctx.beginPath();
        ctx.moveTo(headX - gw * 0.34, crTop + hh * 0.4);
        ctx.lineTo(headX + gw * 0.2, crTop + hh * 0.52);
        ctx.stroke();
      }
    }
    return;
  }

  // ============ THE TRUE PROFILE: AN AUTHORED MODEL, NOT A BLEND ====
  // At E/W every front-face element used to extrapolate its own
  // profileK arithmetic to 1.0 and the errors COMPOUNDED — a botched
  // eye here, a beached jowl there, a nose that read as an ear. Past
  // the swap threshold the head now paints a bespoke side view with
  // authored constants: one hooded eye forward on the face, the brow
  // shelf overhanging it, the short jeer seam running home to the
  // rear jowl, and the CROOK nose — bridge arcing up off the brow,
  // cresting, curling decisively DOWN past the grin. The blends below
  // this branch only ever serve the three-quarter band (profileK
  // ≈ 0.707) again — nothing extrapolates.
  if (profileK > 0.9) {
    const F = lead;
    const face = headX + F * gw;
    const pEyeY = headY - hh * 0.14;
    const pMouthY = headY + hh * 0.3;
    const jawDrop = gape * hh * 0.52;
    const mFront = face + F * hh * 0.02;
    const mBack = headX - F * gw * 0.42;

    // --- the brow shelf in silhouette: bone running rear-high to a
    // front overhang, dipping to the nose root.
    if (!hurt) {
      ctx.fillStyle = shade(gb.hide, -12);
      ctx.beginPath();
      ctx.moveTo(headX - F * gw * 0.55, pEyeY - hh * 0.34);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.48, face + F * hh * 0.12, pEyeY - hh * 0.24);
      ctx.lineTo(face + F * hh * 0.06, pEyeY - hh * 0.06);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.18, headX - F * gw * 0.5, pEyeY - hh * 0.16);
      ctx.closePath();
      ctx.fill();
      // The lit top plane — bone catching the sky.
      ctx.fillStyle = shade(gb.hide, 6);
      ctx.beginPath();
      ctx.moveTo(headX - F * gw * 0.48, pEyeY - hh * 0.32);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.44, face + F * hh * 0.08, pEyeY - hh * 0.24);
      ctx.lineTo(face + F * hh * 0.02, pEyeY - hh * 0.19);
      ctx.quadraticCurveTo(headX + F * gw * 0.2, pEyeY - hh * 0.37, headX - F * gw * 0.44, pEyeY - hh * 0.27);
      ctx.closePath();
      ctx.fill();
      // The hooded-eye shadow under the shelf.
      ctx.strokeStyle = gb.ink;
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.beginPath();
      ctx.moveTo(face - F * gw * 0.04, pEyeY - hh * 0.19);
      ctx.quadraticCurveTo(headX + F * gw * 0.44, pEyeY - hh * 0.28, headX + F * gw * 0.2, pEyeY - hh * 0.18);
      ctx.stroke();
    }

    // --- ONE eye, forward on the face under the shelf, slanted
    // toward the temple, slit pupil set toward where it looks.
    const ex = headX + F * gw * 0.5;
    ctx.fillStyle = hurt ? '#ffffff' : gb.eye;
    ctx.beginPath();
    ctx.ellipse(ex, pEyeY, hh * 0.13, hh * 0.085, -F * 0.3, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -22);
      ctx.lineWidth = Math.max(1, hh * 0.03);
      ctx.beginPath();
      ctx.ellipse(ex, pEyeY, hh * 0.13, hh * 0.085, -F * 0.3, Math.PI * 0.15, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(ex + F * hh * 0.045, pEyeY + hh * 0.005, hh * 0.034, hh * 0.068, -F * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- the warboss ledger rakes the visible cheek.
    if (gb.scarred && !hurt) {
      ctx.strokeStyle = shade(gb.hide, 26);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      for (const o of [0, 0.14] as const) {
        ctx.beginPath();
        ctx.moveTo(headX + F * gw * (0.3 + o * 0.2), pEyeY + hh * (0.16 + o));
        ctx.lineTo(headX + F * gw * (0.08 + o * 0.2), pEyeY + hh * (0.44 + o));
        ctx.stroke();
      }
    }

    // --- the maw, the mandible, and the short jeer seam. The seam's
    // REAR corner rises — the goblin smirks even side-on.
    if (gape > 0.05) {
      ctx.fillStyle = hurt ? '#ffffff' : gb.ink;
      ctx.beginPath();
      chamferRect(
        ctx,
        Math.min(mFront, mBack),
        pMouthY - hh * 0.03,
        Math.abs(mFront - mBack),
        jawDrop + hh * 0.08,
        cut * 0.4,
      );
      ctx.fill();
    }
    ctx.fillStyle = belly;
    ctx.beginPath();
    chamferRect(
      ctx,
      Math.min(mFront, mBack - F * gw * 0.06),
      pMouthY + jawDrop,
      Math.abs(mFront - (mBack - F * gw * 0.06)),
      hh * 0.24,
      [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
    );
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -24);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.beginPath();
      chamferRect(
        ctx,
        Math.min(mFront, mBack - F * gw * 0.06),
        pMouthY + jawDrop,
        Math.abs(mFront - (mBack - F * gw * 0.06)),
        hh * 0.24,
        [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
      );
      ctx.stroke();
      ctx.strokeStyle = gb.ink;
      ctx.lineWidth = Math.max(1, hh * 0.055);
      ctx.beginPath();
      ctx.moveTo(mFront, pMouthY - hh * 0.04);
      ctx.quadraticCurveTo(
        (mFront + mBack) / 2,
        pMouthY + hh * 0.06,
        mBack,
        pMouthY - hh * 0.12,
      );
      ctx.stroke();
      // Needle teeth off the seam — snaggled, never a tidy row.
      ctx.fillStyle = GOBLIN_TOOTH;
      for (const [u, len] of [
        [0.2, 0.15],
        [0.55, 0.1],
      ] as const) {
        const tx = mFront + (mBack - mFront) * u;
        const ty = pMouthY + hh * 0.01;
        ctx.beginPath();
        ctx.moveTo(tx - hh * 0.035, ty);
        ctx.lineTo(tx + hh * 0.005, ty + hh * len + jawDrop * 0.12);
        ctx.lineTo(tx + hh * 0.045, ty);
        ctx.closePath();
        ctx.fill();
      }
      if (gape > 0.05) {
        for (const u of [0.35, 0.72] as const) {
          const tx = mFront + (mBack - mFront) * u;
          const ty = pMouthY + jawDrop + hh * 0.02;
          ctx.beginPath();
          ctx.moveTo(tx - hh * 0.035, ty);
          ctx.lineTo(tx + hh * 0.005, ty - hh * 0.11 - jawDrop * 0.15);
          ctx.lineTo(tx + hh * 0.045, ty);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // --- ONE tusk rides the mandible front through the gape.
    if (gb.tusks && !hurt) {
      const bx = face - F * hh * 0.02;
      const by = pMouthY + jawDrop + hh * 0.1;
      scaleRibbon(
        ctx,
        bx,
        by,
        bx + F * gw * 0.2,
        by - hh * 0.26,
        bx + F * gw * 0.14,
        by - hh * (0.5 + 0.08 * (hv - 1)),
        hh * 0.15,
        GOBLIN_TOOTH,
        shade(GOBLIN_TOOTH, -38),
      );
    }

    // --- one nasolabial crease ages the cheek out of cartoon.
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -18);
      ctx.lineWidth = Math.max(1, hh * 0.035);
      ctx.beginPath();
      ctx.moveTo(face - F * gw * 0.08, pMouthY - hh * 0.26);
      ctx.quadraticCurveTo(face - F * gw * 0.18, pMouthY - hh * 0.12, face - F * gw * 0.32, pMouthY - hh * 0.02);
      ctx.stroke();
    }

    // --- THE NOSE, last so it overhangs everything: THE SAME broad
    // wedge the face-on band wears, simply turned side-on — flat
    // planes and a bony knuckle (FLAT FORGE LAW), never a rounded
    // tube. The bridge runs nearly straight off the brow, BREAKS at
    // the knuckle on the eye line, tapers to the pointed tip, and the
    // point turns DOWN past the grin; the underside is one flat plane
    // stepping back through the nostril. Always shorter than the
    // standing ear behind it (SILHOUETTE HIERARCHY).
    const reach = gw * 0.58;
    const nRootX = face - F * gw * 0.02;
    const rootTopY = pEyeY - hh * 0.12;
    const knX = face + F * reach * 0.5;
    const knY = pEyeY - hh * 0.02;
    const tipX = face + F * reach;
    const tipY = pMouthY - hh * 0.16;
    const hookX = face + F * reach * 0.84;
    const hookY = pMouthY + hh * 0.08;
    const underX = face + F * reach * 0.6;
    const underY = pMouthY - hh * 0.1;
    const nostX = face + F * gw * 0.12;
    const nostY = pMouthY - hh * 0.18;
    ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, 5);
    ctx.beginPath();
    ctx.moveTo(nRootX, rootTopY);
    ctx.lineTo(knX, knY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(hookX, hookY);
    ctx.lineTo(underX, underY);
    ctx.lineTo(nostX, nostY);
    ctx.quadraticCurveTo(face - F * gw * 0.05, pMouthY - hh * 0.2, nRootX, pEyeY + hh * 0.1);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.strokeStyle = shade(gb.hide, -26);
      ctx.lineWidth = Math.max(1, hh * 0.045);
      ctx.stroke();
      // The lit plane rides the bridge and breaks with the knuckle —
      // an angular facet, exactly the face-on wedge's bright top.
      ctx.fillStyle = shade(gb.hide, 14);
      ctx.beginPath();
      ctx.moveTo(nRootX, rootTopY + hh * 0.03);
      ctx.lineTo(knX - F * hh * 0.02, knY + hh * 0.04);
      ctx.lineTo(tipX - F * hh * 0.05, tipY + hh * 0.07);
      ctx.lineTo(knX - F * hh * 0.04, knY + hh * 0.11);
      ctx.lineTo(nRootX, pEyeY + hh * 0.01);
      ctx.closePath();
      ctx.fill();
      // The underside plane holds the shade that seats the wedge
      // over the mouth...
      ctx.fillStyle = shade(gb.hide, -14);
      ctx.beginPath();
      ctx.moveTo(hookX, hookY);
      ctx.lineTo(underX, underY);
      ctx.lineTo(nostX, nostY);
      ctx.lineTo(nostX + F * hh * 0.04, nostY + hh * 0.05);
      ctx.lineTo(underX + F * hh * 0.02, underY + hh * 0.05);
      ctx.closePath();
      ctx.fill();
      // ...and the ONE visible nostril flares off its base.
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(nostX - F * hh * 0.02, nostY + hh * 0.03, hh * 0.05, hh * 0.032, F * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // --- THE BROW LEDGE: one protruding shelf of bone dipping toward
  // the nose root — a carved form, not a drawn-on frown. Its shadow
  // line hoods the eyes, and the goblin is angry before anything has
  // happened.
  const eyeY = headY - hh * 0.14;
  const eCx = headX + fx * gw * 0.16;
  if (!hurt && !back) {
    const blW = gw * 0.82 * (1 - 0.38 * profileK);
    const blTop = eyeY - hh * 0.42;
    ctx.fillStyle = shade(gb.hide, -12);
    ctx.beginPath();
    ctx.moveTo(eCx - blW, blTop + hh * 0.1);
    ctx.quadraticCurveTo(eCx - blW * 0.4, blTop - hh * 0.04, eCx + fx * gw * 0.02, blTop + hh * 0.12);
    ctx.quadraticCurveTo(eCx + blW * 0.4, blTop - hh * 0.04, eCx + blW, blTop + hh * 0.1);
    ctx.lineTo(eCx + blW * 0.86, blTop + hh * 0.26);
    ctx.quadraticCurveTo(eCx + blW * 0.3, blTop + hh * 0.14, eCx + fx * gw * 0.02, blTop + hh * 0.3);
    ctx.quadraticCurveTo(eCx - blW * 0.3, blTop + hh * 0.14, eCx - blW * 0.86, blTop + hh * 0.26);
    ctx.closePath();
    ctx.fill();
    // The lit top plane of the shelf — bone catching the sky.
    ctx.fillStyle = shade(gb.hide, 6);
    ctx.beginPath();
    ctx.moveTo(eCx - blW * 0.9, blTop + hh * 0.1);
    ctx.quadraticCurveTo(eCx - blW * 0.4, blTop - hh * 0.02, eCx + fx * gw * 0.02, blTop + hh * 0.13);
    ctx.quadraticCurveTo(eCx + blW * 0.4, blTop - hh * 0.02, eCx + blW * 0.9, blTop + hh * 0.1);
    ctx.lineTo(eCx + blW * 0.7, blTop + hh * 0.16);
    ctx.quadraticCurveTo(eCx, blTop + hh * 0.04, eCx - blW * 0.7, blTop + hh * 0.16);
    ctx.closePath();
    ctx.fill();
    // The shadow under the shelf: the hooded-eye line.
    ctx.strokeStyle = gb.ink;
    ctx.lineWidth = Math.max(1, hh * 0.045);
    for (const side of [-1, 1] as const) {
      if (profileK > 0.72 && side !== nearSide) continue;
      const bx = eCx + side * gw * 0.38 * (1 - 0.3 * profileK);
      ctx.beginPath();
      ctx.moveTo(bx + side * gw * 0.2, eyeY - hh * 0.22);
      ctx.quadraticCurveTo(bx, eyeY - hh * 0.3, bx - side * gw * 0.14, eyeY - hh * 0.18);
      ctx.stroke();
    }
  }

  // --- the eyes: wide, SLANTED toward the temples under the brow
  // shelf — the D&D goblin read — with a slit pupil, the far eye
  // slipping around the corner at profile.
  for (const side of [-1, 1] as const) {
    if (profileK > 0.72 && side !== nearSide) continue;
    const ex = eCx + side * gw * 0.37 * (1 - 0.32 * profileK);
    const slant = -side * 0.3;
    ctx.fillStyle = hurt ? '#ffffff' : gb.eye;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, hh * 0.15, hh * 0.088, slant, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // The socket's inner corner shade seats the eye in the skull.
      ctx.strokeStyle = shade(gb.hide, -22);
      ctx.lineWidth = Math.max(1, hh * 0.03);
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, hh * 0.15, hh * 0.088, slant, Math.PI * 0.15, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = gb.ink;
      ctx.beginPath();
      ctx.ellipse(ex + fx * hh * 0.03, eyeY + hh * 0.005, hh * 0.036, hh * 0.07, slant * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- the warboss ledger: an old claw scar raking the near cheek.
  if (gb.scarred && !hurt && profileK < 0.9) {
    ctx.strokeStyle = shade(gb.hide, 26);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    for (const o of [0, 0.14] as const) {
      ctx.beginPath();
      ctx.moveTo(eCx + nearSide * gw * (0.5 + o * 0.3), eyeY + hh * (0.14 + o));
      ctx.lineTo(eCx + nearSide * gw * (0.28 + o * 0.3), eyeY + hh * (0.42 + o));
      ctx.stroke();
    }
  }

  // --- the mouth: the needle grin, ear to ear with the corners up —
  // and the jaw beneath it, a RECEDING chin narrower than the skull.
  // The gape drops the pale mandible, opens the dark maw, and bares
  // the needles; the warboss tusks ride the jaw through all of it.
  const mouthY = headY + hh * 0.3;
  const mCx = headX + fx * gw * 0.12;
  const mHw = gw * (0.72 - 0.22 * profileK);
  const jawDrop = gape * hh * 0.52;
  if (gape > 0.05) {
    // The maw: ink first, so teeth and jaw read against it.
    ctx.fillStyle = hurt ? '#ffffff' : gb.ink;
    ctx.beginPath();
    chamferRect(ctx, mCx - mHw * 0.86, mouthY - hh * 0.04, mHw * 1.72, jawDrop + hh * 0.1, cut * 0.4);
    ctx.fill();
  }
  // The mandible: pale, narrow, and slung under — the weak chin that
  // makes the cranium read all the bigger.
  ctx.fillStyle = belly;
  ctx.beginPath();
  chamferRect(
    ctx,
    mCx - mHw * 0.78,
    mouthY + jawDrop,
    mHw * 1.56,
    hh * 0.24,
    [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
  );
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(gb.hide, -24);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    ctx.beginPath();
    chamferRect(
      ctx,
      mCx - mHw * 0.78,
      mouthY + jawDrop,
      mHw * 1.56,
      hh * 0.24,
      [cut * 0.2, cut * 0.2, cut * 0.7, cut * 0.7],
    );
    ctx.stroke();
    // The grin seam: corners UP — a goblin's resting face is a jeer.
    ctx.strokeStyle = gb.ink;
    ctx.lineWidth = Math.max(1, hh * 0.055);
    ctx.beginPath();
    ctx.moveTo(mCx - mHw, mouthY - hh * 0.1);
    ctx.quadraticCurveTo(mCx, mouthY + hh * 0.06, mCx + mHw, mouthY - hh * 0.1);
    ctx.stroke();
    // Needle teeth: snaggled ticks hanging off the seam — never a
    // tidy row (a goblin's dentist is a rock).
    ctx.fillStyle = GOBLIN_TOOTH;
    for (const [u, len] of [
      [-0.66, 0.14],
      [-0.3, 0.1],
      [0.12, 0.15],
      [0.52, 0.09],
    ] as const) {
      const tx = mCx + u * mHw;
      const ty = mouthY + hh * 0.02 - u * u * hh * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx - hh * 0.035, ty);
      ctx.lineTo(tx + hh * 0.005, ty + hh * len + jawDrop * 0.12);
      ctx.lineTo(tx + hh * 0.045, ty);
      ctx.closePath();
      ctx.fill();
    }
    if (gape > 0.05) {
      // Lower needles rise off the dropped jaw to meet them.
      for (const u of [-0.48, 0.02, 0.42] as const) {
        const tx = mCx + u * mHw;
        const ty = mouthY + jawDrop + hh * 0.02;
        ctx.beginPath();
        ctx.moveTo(tx - hh * 0.035, ty);
        ctx.lineTo(tx + hh * 0.005, ty - hh * 0.11 - jawDrop * 0.15);
        ctx.lineTo(tx + hh * 0.045, ty);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // --- THE TUSKS: paired up-hooks proud of the lip, riding the
  // mandible through the gape — the warboss argument, drawn as filled
  // curved mass with an outline (the ram's-horn law), never strokes.
  if (gb.tusks && !hurt) {
    for (const side of [-1, 1] as const) {
      if (profileK > 0.72 && side !== nearSide) continue;
      const bx = mCx + side * mHw * 0.62;
      const by = mouthY + jawDrop + hh * 0.1;
      scaleRibbon(
        ctx,
        bx,
        by,
        bx + side * gw * 0.22,
        by - hh * 0.28,
        bx + side * gw * 0.16,
        by - hh * (0.52 + 0.08 * (hv - 1)),
        hh * 0.15,
        GOBLIN_TOOTH,
        shade(GOBLIN_TOOTH, -38),
      );
    }
  }

  // --- the cheek creases: the nasolabial folds from nostril flare
  // toward the mouth corners — the two lines that age a face out of
  // cartoon. Drawn before the nose so the flare overlaps their start.
  if (!hurt && profileK < 0.85) {
    ctx.strokeStyle = shade(gb.hide, -18);
    ctx.lineWidth = Math.max(1, hh * 0.035);
    for (const side of [-1, 1] as const) {
      if (profileK > 0.6 && side !== nearSide) continue;
      const cx0 = eCx + side * gw * 0.24;
      ctx.beginPath();
      ctx.moveTo(cx0, mouthY - hh * 0.32);
      ctx.quadraticCurveTo(cx0 + side * gw * 0.22, mouthY - hh * 0.16, mCx + side * mHw * 0.86, mouthY - hh * 0.06);
      ctx.stroke();
    }
  }

  // --- THE HOOK NOSE, last so it overhangs the grin: a BROAD wedge
  // off the brow root, hooking down to a pointed tip past the grin
  // seam — wide nostril flares at the underside, a lit bridge plane
  // on top. Carved planes with an outline, never a stick and a ball.
  // At profile the hook is a CROOK, never a spear: the bridge arcs UP
  // off the brow, crests, and the tip curls decisively DOWN — a
  // straight forward point reads as an ear worn on the face. Shorter
  // than the ear behind it, always. Face-on it still drops past the
  // grin seam, unchanged.
  const nl = gw * (0.3 + 0.5 * profileK);
  const nRootX = headX + fx * gw * 0.16;
  const nRootY = eyeY + hh * 0.02;
  const rootW = gw * 0.2;
  const tipX = headX + fx * (gw * 0.24 + nl);
  const tipY = mouthY + hh * 0.1 - hh * 0.18 * profileK;
  const flareY = mouthY - hh * 0.22;
  const flareW = gw * 0.3 * (1 - 0.4 * profileK);
  ctx.fillStyle = hurt ? '#ffffff' : shade(gb.hide, 5);
  ctx.beginPath();
  ctx.moveTo(nRootX - rootW, nRootY);
  // Leading edge: the bridge arcs high, then the hook curls down into
  // the tip — the arc IS the crook.
  ctx.quadraticCurveTo(
    nRootX + fx * nl * 0.75 - gw * 0.02,
    nRootY - hh * (0.06 + 0.3 * profileK),
    tipX,
    tipY,
  );
  // Underside: back up through the near nostril flare — the wide
  // goblin nostrils are the wedge's own base, not a dot on a ball.
  ctx.quadraticCurveTo(tipX - fx * gw * 0.1 + flareW * 0.4, tipY - hh * 0.015, nRootX + fx * gw * 0.06 + flareW, flareY + hh * 0.1);
  ctx.quadraticCurveTo(nRootX + fx * gw * 0.04, flareY + hh * 0.16, nRootX + fx * gw * 0.02 - flareW, flareY + hh * 0.09);
  ctx.lineTo(nRootX + rootW * (fx >= 0 ? -0.4 : 0.4), nRootY + hh * 0.06);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    ctx.strokeStyle = shade(gb.hide, -26);
    ctx.lineWidth = Math.max(1, hh * 0.045);
    ctx.stroke();
    // The lit bridge plane: one bright facet riding the arc's crest —
    // the carved read at a glance. It follows the crook, never
    // outruns it (a straight bright sliver re-spears the hook).
    ctx.fillStyle = shade(gb.hide, 14);
    ctx.beginPath();
    ctx.moveTo(nRootX - rootW * 0.4, nRootY + hh * 0.02);
    ctx.quadraticCurveTo(
      nRootX + fx * nl * 0.55,
      nRootY - hh * (0.02 + 0.22 * profileK),
      tipX - fx * gw * 0.14,
      tipY - hh * (0.1 + 0.06 * profileK),
    );
    ctx.quadraticCurveTo(nRootX + fx * nl * 0.45, nRootY + hh * 0.08, nRootX - rootW * 0.1, nRootY + hh * 0.09);
    ctx.closePath();
    ctx.fill();
    // The underside shade seats the wedge over the mouth...
    ctx.fillStyle = shade(gb.hide, -14);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX - fx * gw * 0.12, tipY - hh * 0.02, nRootX + fx * gw * 0.05 + flareW * 0.7, flareY + hh * 0.12);
    ctx.quadraticCurveTo(tipX - fx * gw * 0.06, tipY - hh * 0.09, tipX, tipY);
    ctx.closePath();
    ctx.fill();
    // ...and the nostrils flare wide off it: ink wedges, one each
    // side face-on, the near one alone at profile.
    ctx.fillStyle = gb.ink;
    for (const side of [-1, 1] as const) {
      if (profileK > 0.6 && side !== nearSide) continue;
      const nx = nRootX + fx * gw * 0.05 + side * flareW * 0.72;
      ctx.beginPath();
      ctx.ellipse(nx, flareY + hh * 0.1, hh * 0.045, hh * 0.03, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Torso-local frame for the goblin body overpaint. */
export interface GoblinBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
}

/**
 * THE LOINCLOTH — every goblin owns real underwear. A cloth wrap
 * lapping the pelvis hip to hip, with a torn apron hanging over the
 * front and a seat flap covering the back band: coverage from every
 * facing, never a naked hip line. Drawn in the torso's local frame
 * over the legs and UNDER the gut overpaint, and — unlike the gut —
 * for EVERY variant: the warboss wears its wrap under the scavenged
 * iron the way every soldier ever has.
 */
export function paintGoblinLoincloth(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: GoblinBodyFrame,
): void {
  const { s, ww, fx, backK, hurt } = f;
  if (hurt) return;
  const back = backK > 0.55;
  const cloth = gb.cloth;
  const bw = ww * 1.04;
  const topY = -0.05 * s;
  const bandH = 0.095 * s;
  // --- the wrap band: hip to hip, wider than the waist so it reads
  // as cloth AROUND the body, not paint on it.
  ctx.fillStyle = cloth;
  ctx.beginPath();
  chamferRect(ctx, -bw, topY, bw * 2, bandH, 0.018 * s);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  chamferRect(ctx, -bw, topY, bw * 2, bandH, 0.018 * s);
  ctx.clip();
  // Form split + the fold creases of wound cloth.
  ctx.fillStyle = shade(cloth, -11);
  ctx.fillRect(0, topY, bw, bandH);
  ctx.fillStyle = shade(cloth, 8);
  ctx.fillRect(-bw, topY, bw * 2, bandH * 0.3);
  ctx.strokeStyle = shade(cloth, -18);
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (const u of [-0.45, 0.15, 0.62]) {
    ctx.beginPath();
    ctx.moveTo(bw * u, topY + bandH * 0.15);
    ctx.lineTo(bw * (u + 0.12), topY + bandH);
    ctx.stroke();
  }
  ctx.restore();
  // --- the apron: a hanging flap with a torn hem — the front drape
  // facing the camera, the seat flap facing away. It leads the facing
  // a touch so profile bands keep their coverage too.
  const aw = ww * (0.62 + 0.1 * (1 - Math.abs(fx)));
  const ax = fx * ww * 0.16;
  const drop = 0.15 * s * (0.94 + 0.18 * (gb.heavy - 1));
  const hemY = topY + bandH + drop;
  ctx.fillStyle = back ? shade(cloth, -7) : shade(cloth, -3);
  ctx.beginPath();
  ctx.moveTo(ax - aw, topY + bandH - 0.024 * s);
  ctx.lineTo(ax + aw, topY + bandH - 0.024 * s);
  // The torn hem: ragged teeth, never a tailored edge.
  ctx.lineTo(ax + aw * 0.86, hemY - 0.02 * s);
  for (let i = 3; i >= 0; i--) {
    const u = (i / 3) * 2 - 1;
    const tear = 0.028 * s * (0.5 + 0.5 * Math.sin(i * 2.7 + 1.2));
    ctx.lineTo(ax + u * aw * 0.66 + aw * 0.1, hemY - 0.022 * s);
    ctx.lineTo(ax + u * aw * 0.66, hemY + tear - 0.01 * s);
  }
  ctx.lineTo(ax - aw * 0.86, hemY - 0.02 * s);
  ctx.closePath();
  ctx.fill();
  // The drape's center fold and one honest patch: cloth that has
  // been worn, washed never, and mended once.
  ctx.strokeStyle = shade(cloth, -16);
  ctx.lineWidth = Math.max(1, s * 0.013);
  ctx.beginPath();
  ctx.moveTo(ax + fx * aw * 0.2, topY + bandH);
  ctx.lineTo(ax + fx * aw * 0.26, hemY - 0.03 * s);
  ctx.stroke();
  if (!back) {
    ctx.fillStyle = shade(cloth, 12);
    ctx.beginPath();
    chamferRect(ctx, ax - aw * 0.46, topY + bandH + drop * 0.28, 0.05 * s, 0.04 * s, 0.008 * s);
    ctx.fill();
    ctx.strokeStyle = shade(cloth, -16);
    ctx.lineWidth = Math.max(1, s * 0.008);
    ctx.beginPath();
    chamferRect(ctx, ax - aw * 0.46, topY + bandH + drop * 0.28, 0.05 * s, 0.04 * s, 0.008 * s);
    ctx.stroke();
  }
}

/**
 * THE POT GUT — the goblin's torso overpaint, drawn in the torso's
 * local frame AFTER the garment quad (which paints in plain hide) and
 * gated OFF whenever a real body item is worn (the warboss keeps its
 * scavenged iron; nothing here may cover gear that drops). It turns
 * the flat tunic block into a body: the low-slung belly with its lit
 * pale panel and navel, the crease shading under the overhang, a
 * crude rope belt cinched UNDER the gut with the scrap pouch on the
 * hip — and for the casters, the ragged half-shawl with its torn hem
 * over the shoulders. Species dressing painted on, never equipment.
 */
export function paintGoblinTorso(
  ctx: CanvasRenderingContext2D,
  gb: GoblinLook,
  f: GoblinBodyFrame,
): void {
  const { s, tw, ww, th, fx, fy, backK, lead, hurt } = f;
  const back = backK > 0.55;
  const frontK = Math.max(0, Math.min(1, (fy - 0.1) / 0.35));
  const hv = gb.heavy;
  if (hurt) return; // the hurt flash keeps the silhouette clean
  // --- the gut: a low-slung swell wider than the hips, leading the
  // facing a touch — mass a body earns by eating everything it finds.
  const gx = fx * ww * 0.12;
  const gy = -th * 0.3;
  const grx = ww * (0.94 + 0.14 * (hv - 1) * 2);
  const gry = th * 0.33 * (1 + 0.3 * (hv - 1));
  ctx.fillStyle = gb.hide;
  ctx.beginPath();
  ctx.ellipse(gx, gy, grx, gry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gx, gy, grx, gry, 0, 0, Math.PI * 2);
  ctx.clip();
  // Form split: shade the trailing half, light the top of the swell.
  ctx.fillStyle = shade(gb.hide, -9);
  ctx.fillRect(gx, gy - gry, grx, gry * 2);
  ctx.fillStyle = shade(gb.hide, 8);
  ctx.fillRect(gx - grx, gy - gry, grx * 2, gry * 0.42);
  if (!back && frontK > 0.05) {
    // The pale panel: underhide belly with its navel tick — inside
    // the gut's own silhouette, never past it.
    ctx.globalAlpha = Math.min(1, frontK * 1.4);
    ctx.fillStyle = gb.belly;
    ctx.beginPath();
    ctx.ellipse(gx, gy + gry * 0.16, grx * 0.62, gry * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(gb.belly, -26);
    ctx.beginPath();
    ctx.ellipse(gx + fx * grx * 0.1, gy + gry * 0.34, gry * 0.07, gry * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (back) {
    // The sway back: a spine groove and two shoulder-blade ticks —
    // the gut read from behind is the bowed spine that carries it.
    ctx.strokeStyle = shade(gb.hide, -16);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, -th * 0.9);
    ctx.quadraticCurveTo(-fx * ww * 0.2, gy, 0, gy + gry * 0.7);
    ctx.stroke();
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(side * tw * 0.42, -th * 0.78);
      ctx.lineTo(side * tw * 0.6, -th * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  // The crease: one dark arc under the overhang seats the gut on the
  // hips — the line that makes the swell read as weight, not balloon.
  ctx.strokeStyle = shade(gb.hide, -22);
  ctx.lineWidth = Math.max(1.5, s * 0.018);
  ctx.beginPath();
  ctx.ellipse(gx, gy + gry * 0.5, grx * 0.66, gry * 0.5, 0, Math.PI * 0.22, Math.PI * 0.78);
  ctx.stroke();
  // --- the rope belt, cinched UNDER the gut so the swell overhangs
  // it, with the scrap pouch riding the lead hip. The rank-and-file's
  // whole wardrobe: a rope, a pouch, and optimism.
  const beltY = gy + gry * 0.72;
  ctx.strokeStyle = '#7a5c34';
  ctx.lineWidth = Math.max(2, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.92, beltY + s * 0.008);
  ctx.quadraticCurveTo(gx, beltY + s * 0.03, ww * 0.92, beltY + s * 0.008);
  ctx.stroke();
  ctx.strokeStyle = shade('#7a5c34', -22);
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(-ww * 0.92, beltY + s * 0.016);
  ctx.quadraticCurveTo(gx, beltY + s * 0.038, ww * 0.92, beltY + s * 0.016);
  ctx.stroke();
  if (!back) {
    // The knot: a lump with two rope ends flopped loose.
    const kx = gx - fx * ww * 0.3;
    ctx.fillStyle = '#7a5c34';
    ctx.beginPath();
    ctx.arc(kx, beltY + s * 0.012, s * 0.024, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4f2c';
    ctx.lineWidth = Math.max(1, s * 0.014);
    for (const o of [-0.02, 0.016] as const) {
      ctx.beginPath();
      ctx.moveTo(kx, beltY + s * 0.02);
      ctx.lineTo(kx + o * s, beltY + s * 0.06);
      ctx.stroke();
    }
  }
  // The scrap pouch: on the hip, behind the belt line.
  const px = lead * ww * 0.66;
  ctx.fillStyle = '#6b4a2e';
  ctx.beginPath();
  chamferRect(ctx, px - s * 0.045, beltY - s * 0.006, s * 0.09, s * 0.075, s * 0.02);
  ctx.fill();
  ctx.strokeStyle = shade('#6b4a2e', -24);
  ctx.lineWidth = Math.max(1, s * 0.01);
  ctx.beginPath();
  ctx.moveTo(px - s * 0.04, beltY + s * 0.022);
  ctx.lineTo(px + s * 0.04, beltY + s * 0.022);
  ctx.stroke();
  // --- the casters' half-shawl: a ragged drape over the shoulders
  // with a torn sawtooth hem — dyed in the school's color, ending
  // well above the gut so the body still reads goblin under it.
  if (gb.garb) {
    const hemY = -th * 0.42;
    ctx.fillStyle = gb.garb;
    ctx.beginPath();
    ctx.moveTo(-tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 0.94, hemY);
    for (let i = 4; i >= 0; i--) {
      const u = i / 4;
      const bx = -tw * 0.94 + u * 2 * tw * 0.94;
      const drop = th * 0.14 * (0.6 + 0.5 * Math.sin(i * 2.6 + 0.8));
      ctx.lineTo(bx + tw * 0.12, hemY);
      ctx.lineTo(bx, hemY + drop);
    }
    ctx.closePath();
    ctx.fill();
    // Form split + the collar roll at the throat.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 1.06, -th * 0.98);
    ctx.lineTo(tw * 0.94, hemY + th * 0.14);
    ctx.lineTo(-tw * 0.94, hemY + th * 0.14);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = shade(gb.garb, -12);
    ctx.fillRect(0, -th, tw * 1.1, th);
    ctx.restore();
    ctx.strokeStyle = shade(gb.garb, -20);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.ellipse(-fx * tw * 0.2, -th * 0.94, tw * 0.4, th * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}


export function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const skel = rig.skeletal ?? null;
  const kob = rig.kobold ?? null;
  const gno = rig.gnoll ?? null;
  const gob = rig.goblin ?? null;
  const gol = rig.golem ?? null;
  const ogr = rig.ogre ?? null;
  const skr = rig.skral ?? null;
  const hob = rig.hobgoblin ?? null;
  const skin = rig.hurt
    ? '#ffffff'
    : (skel?.bone ?? rig.skinColor ?? (rig.look ? SKIN_TONES[rig.look.skin]! : SKIN));
  const bodyColor = rig.hurt ? '#ffffff' : (itemDef(rig.bodyItem ?? '')?.color ?? rig.bodyColor);

  const fx = Math.cos(rig.dir);
  const fy = Math.sin(rig.dir);
  const px = -fy;
  const py = fx;
  // Facing bands, shared by the face, the helmet, and the armor.
  const profileK = Math.abs(fx);
  const backK = Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)); // 1 = facing away
  const lead = fx >= 0 ? 1 : -1;

  // Equipment styles, resolved once per frame (Record lookups).
  //
  // THE WORN LIGHT overlays each piece's working onto its resolved
  // style here — the same trick enchantedStyle has always played on
  // weapons, now for the rest of the body. Styles are plain data, so a
  // shallow clone re-aims a painter without touching any silhouette,
  // and a def that authored its own rune color simply gets recolored to
  // the bonded school (its shapes survive, its hue answers the enchant).
  const worn = resolveWornLight(rig.armorEnch);
  const bodySt = withArx(rig.bodyItem, rig.bodyItem ? bodyStyle(rig.bodyItem) : null, worn.slots.body);
  const legSt = withArx(rig.legsItem, rig.legsItem ? legStyle(rig.legsItem) : null, worn.slots.legs);
  const bootSt = withArx(rig.bootsItem, rig.bootsItem ? bootStyle(rig.bootsItem) : null, worn.slots.boots);
  const offSt = withArx(rig.offhandItem, rig.offhandItem ? offhandStyle(rig.offhandItem) : null, worn.slots.offhand);
  const gloveSt = withArx(rig.glovesItem, rig.glovesItem ? gloveStyle(rig.glovesItem) : null, worn.slots.gloves);
  // A shield is not an item held in a fist — it is a PLANE the body
  // stands behind, with its own dialect (shields.ts). Resolving it here
  // takes the offhand out of the held-item vocabulary entirely.
  const shieldSt: ShieldStyle | null = withArx(
    rig.offhandItem ? `shield:${rig.offhandItem}` : undefined,
    offSt && rig.offhandItem && isShieldKind(offSt.kind)
      ? shieldStyle(rig.offhandItem, offSt.kind, offSt.color, offSt.trim, offSt.boss)
      : null,
    worn.slots.offhand,
  );

  // Sneak crouch: dropping the hip line shortens the leg chain so the IK
  // bends the knees for free, and the whole arm frame (armY/shoulderY)
  // hangs off hipY so the weapon carriage ducks with the body. Milking
  // settles into a shallower working crouch at the flank.
  const crouch =
    rig.pose === PoseState.Sneak
      ? Math.min(1, rig.poseT)
      : rig.pose === PoseState.Milk
        ? 0.55 * Math.min(1, rig.poseT)
        : rig.pose === PoseState.Build
          ? // The raiser kneels to the work; the stow gear on the
            // back ducks with the same body (both copies of this
            // const stay identical — the drawBackGear twin law).
            0.3 * Math.min(1, rig.poseT)
          : 0;
  const sit = rig.sitT ?? 0;
  // A furniture sit: the hips ride the SEAT surface, not the ground.
  const chairSit = sit > 0 && rig.sitStyle !== undefined && rig.sitStyle !== 'floor';

  // The body rides the hip line, which rides the gait bob. Seated on
  // the ground, the hip line settles a hand's width off it; mounted
  // on furniture, it settles at the seat's own surface height — the
  // whole upper body (armY/shoulderY hang off hipY) comes down (or
  // up onto the throne) with it.
  const seatLift = chairSit ? (rig.seatH ?? 0.34) : 0.13;
  const hipYStand = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;
  const hipY = hipYStand + (rig.y - seatLift * s - hipYStand) * sit;

  // ---- legs: two-bone IK from SCREEN-FIXED hips to planted feet.
  const L = (LEG_LEN / 2) * s;
  for (let i = 0; i < 2; i++) {
    const sgn = i === 0 ? -1 : 1;
    const foot = rig.feet[i];
    if (!foot) continue;
    const hipX = rig.x + sgn * HIP_HALF * s;
    const footScreenY = foot.y - foot.lift * s;

    let ex = foot.x - hipX;
    let ey = footScreenY - hipY;
    let d = Math.hypot(ex, ey) || 1;
    // Legs may straighten fully and stretch a touch (bounding at speed).
    const dMax = L * 2 * STRETCH;
    if (d > dMax) {
      ex *= dMax / d;
      ey *= dMax / d;
      d = dMax;
    }

    // Knee: anatomical pole — bends with the FACING (sagittal side-on,
    // gentle down/outward front-on), never with travel, so backpedal
    // and strafe keep honest knees; hysteresis smooths the boundary.
    // THE COLUMN HOLDS: a giant's leg is wrapped in its own mass —
    // the visible articulation is a fraction of the kinematic one
    // (the full IK bend on a wide-tracked giant drew frog knees).
    // The damp is PAINT-ONLY: feet, plants, and stride are untouched.
    const bend = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2)) * (ogr ? 0.68 : 1);
    const cxn = -ey / d;
    const cyn = ex / d;
    // Seated ON THE GROUND, the anatomical pole yields to gravity's
    // law: a bent knee always rises UP-SCREEN — folding down would
    // bury it in the ground. A chair sit keeps the anatomical pole:
    // hips ride the seat, shins drop to the floor, and the knee folds
    // with the facing exactly as a standing bend would.
    const sign =
      sit > 0.4 && !chairSit
        ? cyn > 0
          ? -1
          : 1
        : chooseKneeSign(cxn, cyn, fx, fy, sgn, rig.kneeMemory[i] ?? 0);
    rig.kneeMemory[i] = sign;
    const kx = hipX + ex / 2 + cxn * sign * bend;
    const ky = hipY + ey / 2 + cyn * sign * bend;
    const kn = KNEE_SCRATCH[i]!;
    kn.x = kx;
    kn.y = ky;
    kn.d = d;
    const lp = LEG_POSE_SCRATCH[i]!;
    lp.hipX = hipX;
    lp.footX = hipX + ex;
    lp.footY = hipY + ey;
  }

  // THE LEG LAYER: solved above (the knee scratch feeds the seated arm
  // vocabulary), painted HERE as a deferred closure so the depth ladder
  // below can slip far-side gear underneath it (THE FAR SIDE GOES
  // BEHIND THE LEGS). Same pixels as the old inline paint: nothing
  // else painted between the old site and the ladder.
  const paintLegs = (): void => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      if (!rig.feet[i]) continue;
      const lp = LEG_POSE_SCRATCH[i]!;
      const hipX = lp.hipX;
      const kx = KNEE_SCRATCH[i]!.x;
      const ky = KNEE_SCRATCH[i]!.y;
      const fxx = lp.footX;
      const fyy = lp.footY;
      // Leg dressing: thigh and shin as separate strokes so greaves and
      // wraps can recolor the lower leg; default = today's exact colors.
      // Skeletal legs are bare bone: femur thicker than tibia, a condyle
      // knob at the knee — no cloth ever dressed these.
      // Kobold legs are bare scaled hide, never cloth — the shin a
      // touch darker so the digitigrade read survives at distance.
      const baseLeg = skel
        ? shade(skel.bone, -3)
        : kob
          ? shade(kob.hide, -5)
          : gno
            ? shade(gno.fur, -5)
            : gob
              ? shade(gob.hide, -6)
              : gol
                ? shade(gol.shell, -4)
                : ogr
                  ? shade(ogr.hide, -5)
                  : skr
                    ? shade(skr.hide, -6)
                    : hob
                      // The legion marches CLOTHED: wool breeches in
                      // harness brown — the first dialect leg that
                      // wears the quartermaster's issue, not its hide.
                      ? shade(hob.strap, 10)
                      : rig.look
                        ? shade(CLOTH_COLORS[rig.look.pants]!, -8)
                        : shade(bodyColor, -28);
      const thighCol = rig.hurt ? '#ffffff' : (legSt?.thigh ?? baseLeg);
      const shinCol = rig.hurt
        ? '#ffffff'
        : skel
          ? skel.bone
          : kob
            ? shade(kob.hide, -12)
            : gno
              ? shade(gno.fur, -14)
              : gob
                ? shade(gob.hide, -15)
                : gol
                  ? shade(gol.shell, -12)
                  : ogr
                    ? shade(ogr.hide, -13)
                    : skr
                      ? shade(skr.hide, -14)
                      : hob
                        ? shade(hob.strap, -4)
                        : (legSt?.shin ?? legSt?.thigh ?? baseLeg);
      // THE FOOT CAPS THE LEG: the shin stroke ends at the ANKLE — the
      // endpoint pulled back up the bone so its round cap tucks inside
      // the footwear painted below. Stroked all the way to the sole, the
      // cap's half-disc poked out under every foot chip at zoom.
      const shinLen0 = Math.hypot(fxx - kx, fyy - ky) || 1;
      const aux = (fxx - kx) / shinLen0;
      const auy = (fyy - ky) / shinLen0;
      // The gnoll leg TAPERS: a heavy furred haunch over a leaner
      // shank — the digitigrade read on a two-bone rig, mass up top
      // where the hunched species carries it.
      // The goblin shank is a SPINDLE: the bandy-leg read lives in the
      // taper — a little haunch up top over a shin two sizes too thin.
      // The ogre shank: a tree-trunk column — the one shin in the
      // game thicker than a hero's whole thigh, because the body it
      // holds up out-weighs three of them.
      // The skral shank is the goblin's spindle gone wet: the frog
      // haunch above carries all the leg's mass; the shin is a reed.
      const shinLW = Math.max(
        2,
        s * (skel ? 0.052 * skel.heavy : bootSt ? 0.1 : gno ? 0.078 : gob ? 0.062 : gol ? 0.128 : ogr ? 0.145 : skr ? 0.058 : hob ? 0.08 : 0.09),
      );
      const ankPull = shinLW * 0.55;
      const ankX = fxx - aux * ankPull;
      const ankY = fyy - auy * ankPull;
      ctx.strokeStyle = thighCol;
      ctx.lineWidth = Math.max(
        2,
        s *
          (skel
            ? 0.066 * skel.heavy
            : gno
              ? 0.126 * (0.9 + 0.2 * gno.heavy)
              : gob
                ? 0.098 * (0.85 + 0.2 * gob.heavy)
                : gol
                  ? 0.165 * (0.9 + 0.2 * gol.heavy)
                  : ogr
                    ? 0.185 * (0.9 + 0.2 * ogr.heavy)
                    : skr
                      ? 0.105 * (0.85 + 0.2 * skr.heavy)
                      // The soldier's leg: a drilled thigh over a
                      // wrapped shin — sturdy, never bandy.
                      : hob
                        ? 0.1 * (0.9 + 0.2 * hob.heavy)
                        : 0.09),
      );
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kx, ky);
      if (shinCol === thighCol && !skel && !gno && !gob && !gol && !ogr && !skr && !hob) {
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
      } else {
        ctx.stroke();
        ctx.strokeStyle = shinCol;
        if (skel || gno || gob || gol || ogr || skr || hob) ctx.lineWidth = shinLW;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
      }
      if (gno && !rig.hurt) {
        // The hock tuft: a ragged fur wedge off the knee's trailing
        // edge — the joint breaks like coat, and the tapered shank
        // below it reads as an animal's hock, not a shaved calf.
        const outX = Math.abs(fx) > 0.35 ? -Math.sign(fx) : i === 0 ? -1 : 1;
        ctx.fillStyle = shade(gno.fur, -7);
        ctx.beginPath();
        ctx.moveTo(kx + outX * 0.02 * s, ky - 0.045 * s);
        ctx.lineTo(kx + outX * 0.095 * s * (0.9 + 0.2 * gno.heavy), ky + 0.01 * s);
        ctx.lineTo(kx + outX * 0.015 * s, ky + 0.04 * s);
        ctx.closePath();
        ctx.fill();
      }
      if (gob && !rig.hurt) {
        // The knobby knee: a joint knob wider than the spindle shank
        // below it — the bandy-leg articulation mark, hide-toned.
        ctx.fillStyle = shade(gob.hide, -12);
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1.6, s * 0.036 * (0.9 + 0.2 * gob.heavy)), 0, Math.PI * 2);
        ctx.fill();
      }
      if (skr && !rig.hurt) {
        // The calf fin: a small raked blade off the shin's trailing
        // edge in the crest's accent — the leg stays a fish's even
        // when the fan foot is mid-swing (one-sided, the hock rule).
        const outX = Math.abs(fx) > 0.35 ? -Math.sign(fx) : i === 0 ? -1 : 1;
        ctx.fillStyle = shade(skr.fin, -6);
        ctx.beginPath();
        ctx.moveTo(kx + outX * 0.012 * s, ky + 0.01 * s);
        ctx.quadraticCurveTo(
          kx + outX * 0.085 * s * (0.9 + 0.2 * skr.heavy),
          ky + 0.05 * s,
          kx + outX * 0.014 * s,
          ky + 0.07 * s,
        );
        ctx.closePath();
        ctx.fill();
      }
      if (ogr && !rig.hurt) {
        // The knee fold: flesh creases where a joint would knob — one
        // dark seam across the column, the articulation mark of a leg
        // wrapped in its own weight.
        ctx.strokeStyle = shade(ogr.hide, -16);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(kx - s * 0.055, ky + s * 0.004);
        ctx.lineTo(kx + s * 0.055, ky - s * 0.004);
        ctx.stroke();
        ctx.lineWidth = shinLW;
      }
      if (skel) {
        // Knee condyle: the joint knob, wider than either shaft, with a
        // dark seam line — the articulation mark of the bone dialect.
        ctx.fillStyle = rig.hurt ? '#ffffff' : skel.bone;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1.8, s * 0.042 * skel.heavy), 0, Math.PI * 2);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(skel.bone, -22);
          ctx.fillRect(kx - s * 0.028 * skel.heavy, ky - s * 0.007, s * 0.056 * skel.heavy, s * 0.014);
        }
      }
      // Knee dressing: a plate chip riding the shin's angle, or wraps.
      if (legSt?.knee === 'plate' && !rig.hurt) {
        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(Math.atan2(fyy - ky, fxx - kx) - Math.PI / 2);
        ctx.fillStyle = legSt.kneeColor ?? shinCol;
        ctx.beginPath();
        chamferRect(ctx, -0.055 * s, -0.045 * s, 0.11 * s, 0.1 * s, 0.025 * s);
        ctx.fill();
        ctx.fillStyle = shade(legSt.kneeColor ?? shinCol, 14);
        ctx.fillRect(-0.04 * s, -0.038 * s, 0.08 * s, 0.028 * s);
        ctx.restore();
      } else if (legSt?.knee === 'wrap' && !rig.hurt) {
        ctx.strokeStyle = legSt.kneeColor ?? shade(shinCol, -16);
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        for (const o of [-0.02, 0.025]) {
          ctx.beginPath();
          ctx.moveTo(kx - 0.05 * s, ky + o * s - 0.012 * s);
          ctx.lineTo(kx + 0.05 * s, ky + o * s + 0.012 * s);
          ctx.stroke();
        }
        ctx.lineWidth = Math.max(2, s * 0.09);
      }

      // THE HUNTER'S LEGS — the leather lane's one-owner leg words.
      // Each paints ON the limb's own solved geometry (segments and
      // normals), so it rides every gait for free. One-sided words
      // pick the outward side the way the gnoll hock does.
      if (legSt && !rig.hurt && !skel && !kob && !gno && !gob && !skr && !hob) {
        const outX = Math.abs(fx) > 0.35 ? -Math.sign(fx) : i === 0 ? -1 : 1;
        // Thigh segment frame (hip→knee) for thigh-mounted words.
        const tLen = Math.hypot(kx - hipX, ky - hipY) || 1;
        const tux = (kx - hipX) / tLen;
        const tuy = (ky - hipY) / tLen;
        if (legSt.hock) {
          // Hare-fur hocks: a pale tuft off the back of the ankle —
          // three round flicks and a seat wedge, the spring visible.
          ctx.fillStyle = legSt.hock.color;
          ctx.beginPath();
          ctx.moveTo(ankX + outX * 0.012 * s, ankY - 0.052 * s);
          ctx.lineTo(ankX + outX * 0.062 * s, ankY - 0.012 * s);
          ctx.lineTo(ankX + outX * 0.014 * s, ankY + 0.014 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.hock.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.014);
          for (const [dx, dy] of [[0.07, -0.05], [0.085, -0.015], [0.075, 0.02]] as const) {
            ctx.beginPath();
            ctx.moveTo(ankX + outX * 0.02 * s, ankY - 0.02 * s);
            ctx.lineTo(ankX + outX * dx * s, ankY + dy * s);
            ctx.stroke();
          }
        }
        if (legSt.calffin) {
          // The calf fin: one small swept blade off the outer shin,
          // back-raked, bright leading edge — sharp even at a walk.
          const bk = 0.34;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.fillStyle = legSt.calffin.color;
          ctx.beginPath();
          ctx.moveTo(bx, by - 0.008 * s);
          ctx.lineTo(bx + outX * 0.044 * s, by + 0.022 * s);
          ctx.lineTo(bx, by + 0.034 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.calffin.edge;
          ctx.lineWidth = Math.max(1, s * 0.009);
          ctx.beginPath();
          ctx.moveTo(bx, by - 0.008 * s);
          ctx.lineTo(bx + outX * 0.044 * s, by + 0.022 * s);
          ctx.stroke();
        }
        if (legSt.wader) {
          // Waxed waders: the lower shin recolored to a hard
          // waterline break, one lit rim where the wax catches.
          const bk = 0.42;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.strokeStyle = legSt.wader.color;
          ctx.lineWidth = Math.max(2, s * 0.1);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ankX, ankY);
          ctx.stroke();
          ctx.strokeStyle = legSt.wader.rim;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(bx - auy * 0.055 * s, by + aux * 0.055 * s);
          ctx.lineTo(bx + auy * 0.055 * s, by - aux * 0.055 * s);
          ctx.stroke();
        }
        if (legSt.sock) {
          // The fox's socks: dark from mid-shin down, tied off with
          // an ember knot and one loose end.
          const bk = 0.5;
          const bx = kx + (ankX - kx) * bk;
          const by = ky + (ankY - ky) * bk;
          ctx.strokeStyle = legSt.sock.color;
          ctx.lineWidth = Math.max(2, s * 0.096);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ankX, ankY);
          ctx.stroke();
          if (legSt.sock.tie) {
            ctx.fillStyle = legSt.sock.tie;
            ctx.beginPath();
            ctx.arc(bx + outX * 0.045 * s, by, Math.max(1.2, s * 0.018), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = legSt.sock.tie;
            ctx.lineWidth = Math.max(1, s * 0.012);
            ctx.beginPath();
            ctx.moveTo(bx + outX * 0.045 * s, by);
            ctx.lineTo(bx + outX * 0.06 * s, by + 0.045 * s);
            ctx.stroke();
          }
        }
        if (legSt.shinlace) {
          // Snare-cord lacing: three X crossings climbing the shin.
          ctx.strokeStyle = legSt.shinlace.color;
          ctx.lineWidth = Math.max(1, s * 0.013);
          for (const k of [0.2, 0.48, 0.76]) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            const w = 0.05 * s;
            const h = 0.028 * s;
            ctx.beginPath();
            ctx.moveTo(cxx - w, cyy - h);
            ctx.lineTo(cxx + w, cyy + h);
            ctx.moveTo(cxx - w, cyy + h);
            ctx.lineTo(cxx + w, cyy - h);
            ctx.stroke();
          }
        }
        if (legSt.mossbind) {
          // Moss-bound bands: two green wraps on the shin, tufts
          // spilling off each band's lower edge.
          ctx.strokeStyle = legSt.mossbind.color;
          ctx.lineWidth = Math.max(1.5, s * 0.03);
          for (const k of [0.3, 0.62]) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(cxx - 0.05 * s, cyy - 0.012 * s);
            ctx.lineTo(cxx + 0.05 * s, cyy + 0.012 * s);
            ctx.stroke();
          }
          ctx.strokeStyle = legSt.mossbind.tuft;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.013);
          for (const [k, dx] of [[0.34, 0.045], [0.66, -0.04], [0.64, 0.05]] as const) {
            const cxx = kx + (ankX - kx) * k;
            const cyy = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(cxx, cyy);
            ctx.lineTo(cxx + dx * s, cyy + 0.035 * s);
            ctx.stroke();
          }
        }
        if (legSt.furknee) {
          // Winter fur bursting over the knee: a lumpy pale cap with
          // guard hairs flicking down and out.
          ctx.fillStyle = legSt.furknee.color;
          ctx.beginPath();
          ctx.arc(kx, ky - 0.02 * s, 0.055 * s, Math.PI * 0.95, Math.PI * 2.05);
          ctx.quadraticCurveTo(kx + 0.03 * s, ky + 0.03 * s, kx - 0.01 * s, ky + 0.025 * s);
          ctx.quadraticCurveTo(kx - 0.045 * s, ky + 0.03 * s, kx - 0.055 * s, ky - 0.01 * s);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = legSt.furknee.color;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, s * 0.014);
          for (const [dx, dy] of [[-0.05, 0.05], [0.01, 0.06], [0.055, 0.045]] as const) {
            ctx.beginPath();
            ctx.moveTo(kx + dx * s * 0.4, ky + 0.01 * s);
            ctx.lineTo(kx + dx * s, ky + dy * s);
            ctx.stroke();
          }
        }
        if (legSt.scalerows) {
          // THE SCALED THIGH: three lapped scute bands riding the
          // solved thigh, hip to knee, painted bottom-up so uppers
          // lap lowers — the plastron's language carried down, in
          // the legs' muted register (bright edges on small leg
          // devices read as floating teeth; the glint budget lives
          // on the torso and head).
          const srw = legSt.scalerows;
          for (const [bi, k] of [[2, 0.78], [1, 0.52], [0, 0.26]] as const) {
            const cxx = hipX + tux * tLen * k + outX * 0.006 * s;
            const cyy = hipY + tuy * tLen * k;
            const w = 0.062 * s * (1 - bi * 0.12);
            const h = 0.05 * s;
            ctx.fillStyle = shade(srw.plate, -4 - bi * 7);
            ctx.beginPath();
            ctx.moveTo(cxx - w, cyy - h * 0.5);
            ctx.lineTo(cxx + w, cyy - h * 0.5);
            ctx.lineTo(cxx + w * 0.86, cyy + h * 0.34);
            ctx.quadraticCurveTo(cxx, cyy + h * 0.62, cxx - w * 0.86, cyy + h * 0.34);
            ctx.closePath();
            ctx.fill();
            // The under-lap shadow line — never a bright rim.
            ctx.strokeStyle = shade(srw.plate, -26);
            ctx.lineWidth = Math.max(1, s * 0.01);
            ctx.beginPath();
            ctx.moveTo(cxx - w * 0.86, cyy + h * 0.36);
            ctx.quadraticCurveTo(cxx, cyy + h * 0.64, cxx + w * 0.86, cyy + h * 0.36);
            ctx.stroke();
            // One keel tick per band — the forge seam continued.
            ctx.fillStyle = shade(srw.plate, -18);
            ctx.fillRect(cxx - 0.006 * s, cyy - h * 0.4, 0.012 * s, h * 0.66);
          }
        }
        if (legSt.shadewrap) {
          // The veil's language carried to the ground: three hard
          // turns of dark cloth wound down the shin, edges on the
          // diagonal — bands, never a gradient.
          const swp = legSt.shadewrap;
          ctx.strokeStyle = swp.color;
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          for (const k of [0.28, 0.52, 0.76]) {
            const px = kx + (ankX - kx) * k;
            const py = ky + (ankY - ky) * k;
            ctx.beginPath();
            ctx.moveTo(px - 0.024 * s, py - 0.01 * s);
            ctx.lineTo(px + 0.024 * s, py + 0.008 * s);
            ctx.stroke();
          }
          // The tie: one loose end off the outward ankle — one leg
          // only; on both it reads as uniform print.
          if (i === 0 && swp.tie) {
            ctx.strokeStyle = swp.tie;
            ctx.lineWidth = Math.max(1, s * 0.009);
            ctx.beginPath();
            ctx.moveTo(ankX + outX * 0.014 * s, ankY - 0.024 * s);
            ctx.lineTo(ankX + outX * 0.038 * s, ankY - 0.004 * s);
            ctx.stroke();
          }
        }
        // One-sided words dress a single leg — a roll on both thighs
        // reads as uniform print, on one it reads as gear.
        if (i === 0) {
          if (legSt.thighsheath) {
            // The Knife's spare, flat to the outer thigh — muted
            // register (bright edges on small leg devices float as
            // teeth; the calffin verdict).
            const ts2 = legSt.thighsheath;
            const cxx = hipX + tux * tLen * 0.42 + outX * 0.024 * s;
            const cyy = hipY + tuy * tLen * 0.42;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = ts2.sheath;
            chamferRect(ctx, -0.019 * s, -0.048 * s, 0.038 * s, 0.098 * s, 0.009 * s);
            ctx.fill();
            ctx.strokeStyle = shade(ts2.sheath, -22);
            ctx.lineWidth = Math.max(1, s * 0.009);
            for (const o of [-0.022, 0.02]) {
              ctx.beginPath();
              ctx.moveTo(-0.019 * s, o * s);
              ctx.lineTo(0.019 * s, o * s);
              ctx.stroke();
            }
            // Grip stub and pommel above the throat — dulled brass,
            // no glint at the leg.
            ctx.fillStyle = shade(ts2.sheath, -32);
            ctx.fillRect(-0.006 * s, -0.06 * s, 0.012 * s, 0.013 * s);
            ctx.fillStyle = shade(ts2.pommel, -14);
            ctx.beginPath();
            ctx.arc(0, -0.066 * s, 0.01 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          if (legSt.pickroll) {
            // The thief's tool roll strapped flat to the thigh, pick
            // ends ticking out of the top.
            const cxx = hipX + tux * tLen * 0.5 + outX * 0.02 * s;
            const cyy = hipY + tuy * tLen * 0.5;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = legSt.pickroll.color;
            chamferRect(ctx, -0.032 * s, -0.055 * s, 0.064 * s, 0.11 * s, 0.012 * s);
            ctx.fill();
            ctx.strokeStyle = shade(legSt.pickroll.color, -24);
            ctx.lineWidth = Math.max(1, s * 0.01);
            for (const o of [-0.028, 0.024]) {
              ctx.beginPath();
              ctx.moveTo(-0.032 * s, o * s);
              ctx.lineTo(0.032 * s, o * s);
              ctx.stroke();
            }
            ctx.strokeStyle = legSt.pickroll.glint ?? shade(legSt.pickroll.color, 34);
            ctx.lineWidth = Math.max(1, s * 0.011);
            for (const o of [-0.016, 0, 0.016]) {
              ctx.beginPath();
              ctx.moveTo(o * s, -0.055 * s);
              ctx.lineTo(o * s, -0.075 * s);
              ctx.stroke();
            }
            ctx.restore();
          }
          if (legSt.garter) {
            // The assassin's garter: one strap high on the thigh, a
            // sheathed blade hanging off its outward edge.
            const cxx = hipX + tux * tLen * 0.34;
            const cyy = hipY + tuy * tLen * 0.34;
            ctx.strokeStyle = legSt.garter.color;
            ctx.lineWidth = Math.max(1.5, s * 0.024);
            ctx.beginPath();
            ctx.moveTo(cxx - 0.05 * s, cyy - 0.008 * s);
            ctx.lineTo(cxx + 0.05 * s, cyy + 0.008 * s);
            ctx.stroke();
            if (legSt.garter.blade) {
              const bx2 = cxx + outX * 0.038 * s;
              ctx.fillStyle = shade(legSt.garter.color, -18);
              ctx.fillRect(bx2 - 0.012 * s, cyy, 0.024 * s, 0.062 * s);
              ctx.fillStyle = legSt.garter.blade;
              ctx.beginPath();
              ctx.moveTo(bx2 - 0.008 * s, cyy + 0.062 * s);
              ctx.lineTo(bx2 + 0.008 * s, cyy + 0.062 * s);
              ctx.lineTo(bx2, cyy + 0.095 * s);
              ctx.closePath();
              ctx.fill();
            }
          }
          if (legSt.roadpatch) {
            // The road's mending: a squared patch sewn slightly
            // askew on the thigh, stitch ticks at its corners.
            const cxx = hipX + tux * tLen * 0.55;
            const cyy = hipY + tuy * tLen * 0.55;
            ctx.save();
            ctx.translate(cxx, cyy);
            ctx.rotate(0.16 + Math.atan2(tuy, tux) - Math.PI / 2);
            ctx.fillStyle = legSt.roadpatch.color;
            ctx.fillRect(-0.03 * s, -0.03 * s, 0.06 * s, 0.06 * s);
            ctx.strokeStyle = shade(legSt.roadpatch.color, -26);
            ctx.lineWidth = Math.max(1, s * 0.008);
            for (const [x0, y0, x1, y1] of [
              [-0.03, -0.012, -0.02, -0.012],
              [0.02, 0.008, 0.03, 0.008],
              [-0.008, -0.03, -0.008, -0.02],
              [0.006, 0.02, 0.006, 0.03],
            ] as const) {
              ctx.beginPath();
              ctx.moveTo(x0 * s, y0 * s);
              ctx.lineTo(x1 * s, y1 * s);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, s * 0.09);
      }

      // THE GREAVES — the legs' channel. A thin light down the outside
      // of the thigh, brightest when the leg is EXTENDED.
      //
      // The pulse is taken from the limb's own geometry rather than a
      // clock: extension is how straight the leg currently is, so the
      // light swells at the top of each stride and dims through the
      // swing, for free and perfectly in phase. A leg lit off a timer
      // would drift against the walk cycle within seconds and read as
      // two animations fighting.
      if (legSt?.arx && !rig.hurt) {
        const mark = legSt.arx;
        const reach = Math.hypot(ankX - hipX, ankY - hipY);
        const span = Math.hypot(kx - hipX, ky - hipY) + shinLen0 || 1;
        const extend = Math.max(0, Math.min(1, (reach / span - 0.72) / 0.26));
        const base = markPulse(mark, rig.nowMs, SLOT_GLINT_PHASE.legs ?? 0, 0.8);
        const a = base * (0.45 + 0.55 * extend);
        if (a > 0.02) {
          // Offset to the outside of the bone so the light reads as a
          // fitting ON the greave, never as the leg itself glowing.
          const nx = -(ky - hipY);
          const ny = kx - hipX;
          const nl = Math.hypot(nx, ny) || 1;
          const off = s * 0.03;
          ctx.globalAlpha = Math.min(1, a * 0.9);
          ctx.strokeStyle = mark.mid;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(hipX + (nx / nl) * off, hipY + (ny / nl) * off);
          ctx.lineTo(kx + (nx / nl) * off, ky + (ny / nl) * off);
          ctx.stroke();
          // A brighter cap at the knee: the line has a TERMINUS, which
          // is what separates a fitting from a smear of light.
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = mark.core;
          const cs = s * 0.02;
          ctx.fillRect(kx - cs / 2, ky - cs / 2, cs, cs);
          ctx.globalAlpha = 1;
        }
      }

      // Boots: a shaft climbing the shin, folded cuff, foot, toe cap —
      // or the bare hardcoded chip when nothing is worn.
      const bootCol = rig.hurt ? '#ffffff' : (bootSt?.color ?? BOOT);
      if (bootSt) {
        const shinLen = Math.hypot(fxx - kx, fyy - ky) || 1;
        const hK = Math.min(1, (bootSt.height * s) / shinLen);
        const topX = fxx + (kx - fxx) * hK;
        const topY = fyy + (ky - fyy) * hK;
        ctx.strokeStyle = bootCol;
        ctx.lineWidth = Math.max(2.5, s * 0.1);
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(ankX, ankY);
        ctx.stroke();
        if (bootSt.cuff && !rig.hurt) {
          ctx.strokeStyle = bootSt.cuff.color;
          ctx.lineWidth = Math.max(2.5, s * 0.115);
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(topX + (fxx - topX) * 0.22, topY + (fyy - topY) * 0.22);
          ctx.stroke();
        }
        // THE ANKLE BAND — the boots' body-space mark. Small, because
        // the boots already own the loudest channel in the grammar (the
        // trail) and this is not a second voice. Its only job is to
        // ATTACH that trail to a wearer: without a lit ankle the prints
        // read as ground decoration that happens to follow someone, and
        // with one they read as light coming off these boots.
        if (bootSt.arx && !rig.hurt) {
          const mark = bootSt.arx;
          const a = markPulse(mark, rig.nowMs, SLOT_GLINT_PHASE.boots ?? 0, 1.1);
          if (a > 0.02) {
            const dxn = (fxx - topX) / shinLen;
            const dyn = (fyy - topY) / shinLen;
            const px = -dyn;
            const py = dxn;
            const w = 0.05 * s;
            const bx = topX + (fxx - topX) * 0.32;
            const by = topY + (fyy - topY) * 0.32;
            ctx.globalAlpha = Math.min(1, a * 0.95);
            ctx.strokeStyle = mark.mid;
            ctx.lineWidth = Math.max(1.2, s * 0.022);
            ctx.beginPath();
            ctx.moveTo(bx + px * w, by + py * w);
            ctx.lineTo(bx - px * w, by - py * w);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        if (bootSt.spike && !rig.hurt) {
          // A knee-spike off the shaft top — dread sabatons bite upward.
          ctx.fillStyle = bootSt.toe ?? shade(bootCol, 18);
          ctx.beginPath();
          ctx.moveTo(topX + lead * 0.015 * s, topY + 0.015 * s);
          ctx.lineTo(topX + lead * 0.085 * s, topY - 0.055 * s);
          ctx.lineTo(topX + lead * 0.045 * s, topY + 0.035 * s);
          ctx.closePath();
          ctx.fill();
        }
        if (bootSt.wrap && !rig.hurt) {
          // Crossed straps lacing the shaft — drawn along the solved shin
          // so the X climbs the leg at any facing or terrain lift.
          const dxn = (fxx - topX) / shinLen;
          const dyn = (fyy - topY) / shinLen;
          const px = -dyn;
          const py = dxn;
          const w = 0.056 * s;
          ctx.strokeStyle = bootSt.wrap.color;
          ctx.lineWidth = Math.max(1.5, s * 0.032);
          ctx.beginPath();
          for (const [t0, t1] of [[0.1, 0.55], [0.55, 0.1]] as const) {
            ctx.moveTo(topX + (fxx - topX) * t0 + px * w, topY + (fyy - topY) * t0 + py * w);
            ctx.lineTo(topX + (fxx - topX) * t1 - px * w, topY + (fyy - topY) * t1 - py * w);
          }
          ctx.stroke();
        }
        if (bootSt.fur && !rig.hurt) {
          // A lumpy fur top instead of a clean cuff — winter boots.
          ctx.fillStyle = bootSt.fur.color;
          for (let i = 0; i < 3; i++) {
            const u = -1 + i;
            ctx.beginPath();
            ctx.arc(
              topX + u * 0.048 * s,
              topY + Math.sin(i * 2.4) * 0.012 * s,
              (0.04 + 0.009 * Math.sin(i * 3.1)) * s,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        ctx.lineWidth = Math.max(2, s * 0.09);
      }
      if (skel) {
        // Bare bone foot: a narrower chip split by dark toe seams on the
        // leading half — metatarsals, not a boot.
        ctx.fillStyle = rig.hurt ? '#ffffff' : skel.bone;
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.068 * s, fyy - 0.026 * s, 0.136 * s, 0.052 * s, 0.018 * s);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(skel.bone, -28);
          for (const ot of [0.018, 0.048]) {
            ctx.fillRect(fxx + lead * ot * s, fyy - 0.018 * s, 0.013 * s, 0.036 * s);
          }
        }
      } else if (gno && !bootSt) {
        // The bare gnoll paw: BROAD and heavy — a digger's foot wider
        // than the shank above it, hide-toned under the fur, with
        // three dark claw hooks raking off the leading edge — a
        // scavenger walks on what it was born with.
        const gv = 0.92 + 0.16 * gno.heavy;
        ctx.fillStyle = rig.hurt ? '#ffffff' : shade(gno.skin, -6);
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.095 * s * gv, fyy - 0.034 * s, 0.19 * s * gv, 0.068 * s, 0.024 * s);
        ctx.fill();
        if (!rig.hurt) {
          // A fur cuff where the shin meets the paw — stitches the
          // coat to the bare foot so the ankle never reads cut off.
          ctx.fillStyle = shade(gno.fur, -10);
          ctx.beginPath();
          chamferRect(ctx, fxx - 0.07 * s * gv, fyy - 0.054 * s, 0.14 * s * gv, 0.032 * s, 0.013 * s);
          ctx.fill();
          // Toe seams split the pad — a foot with anatomy.
          ctx.strokeStyle = shade(gno.skin, -24);
          ctx.lineWidth = Math.max(1, 0.012 * s);
          for (const o of [-0.012, 0.02]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.045 * s, fyy + o * s - 0.01 * s);
            ctx.lineTo(fxx + lead * 0.085 * s * gv, fyy + o * s);
            ctx.stroke();
          }
          ctx.fillStyle = shade(gno.mask, -12);
          for (const o of [-0.026, -0.002, 0.022]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.082 * s * gv, fyy + o * s - 0.008 * s);
            ctx.lineTo(fxx + lead * 0.128 * s * gv, fyy + o * s + 0.005 * s);
            ctx.lineTo(fxx + lead * 0.082 * s * gv, fyy + o * s + 0.014 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (gol && !bootSt) {
        // The construct footing: a slab wider than any boot — stone
        // block, riveted sabaton, cracked pad, or faceted wedge per
        // build. A golem stands on its own architecture.
        paintGolemFoot(ctx, gol, fxx, fyy, s, lead, rig.hurt);
      } else if (ogr && !bootSt) {
        // The giant footing: the widest bare slab in the game — four
        // toe seams and worn ivory nails. No boot was ever the size.
        paintOgreFoot(ctx, ogr, fxx, fyy, s, lead, rig.hurt);
      } else if (skr && !bootSt) {
        // THE FAN FOOT: the murloc footprint — a webbed triangle
        // twice the shank's width (skral.ts owns the anatomy).
        paintSkralFoot(ctx, skr, fxx, fyy, s, lead, rig.hurt);
      } else if (hob && !bootSt) {
        // THE MARCHING BOOT: iron toe, greave cuff, hobnails — the
        // legion is shod (hobgoblin.ts owns the anatomy).
        paintHobgoblinFoot(ctx, hob, fxx, fyy, s, fx, lead, rig.hurt);
      } else if (gob && !bootSt) {
        // The bare goblin foot: a FLAP a size too big for the spindle
        // shank above it — wide, flat, pale-soled, with two toe seams
        // and dark claw ticks off the leading edge. A goblin's boots
        // are the calluses it was born with.
        const gv = 0.9 + 0.18 * gob.heavy;
        ctx.fillStyle = rig.hurt ? '#ffffff' : shade(gob.hide, -4);
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.088 * s * gv, fyy - 0.03 * s, 0.176 * s * gv, 0.06 * s, 0.022 * s);
        ctx.fill();
        if (!rig.hurt) {
          // The ankle knuckle seats the spindle on the flap.
          ctx.fillStyle = shade(gob.hide, -10);
          ctx.beginPath();
          ctx.arc(fxx - lead * 0.02 * s, fyy - 0.034 * s, 0.026 * s, 0, Math.PI * 2);
          ctx.fill();
          // Toe seams split the flap — a foot with anatomy.
          ctx.strokeStyle = shade(gob.hide, -24);
          ctx.lineWidth = Math.max(1, 0.012 * s);
          for (const o of [-0.01, 0.018]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.04 * s, fyy + o * s - 0.008 * s);
            ctx.lineTo(fxx + lead * 0.078 * s * gv, fyy + o * s);
            ctx.stroke();
          }
          // Claw ticks past the leading edge.
          ctx.fillStyle = shade(gob.ink, 6);
          for (const o of [-0.022, 0.002, 0.024]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.076 * s * gv, fyy + o * s - 0.007 * s);
            ctx.lineTo(fxx + lead * 0.116 * s * gv, fyy + o * s + 0.004 * s);
            ctx.lineTo(fxx + lead * 0.076 * s * gv, fyy + o * s + 0.012 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (kob && !bootSt) {
        // The bare kobold foot: a scaled chip, slightly narrow, with
        // pale claw ticks raking off the leading edge — no kobold ever
        // owned boots worth drawing.
        ctx.fillStyle = rig.hurt ? '#ffffff' : shade(kob.hide, -8);
        ctx.beginPath();
        chamferRect(ctx, fxx - 0.07 * s, fyy - 0.028 * s, 0.14 * s, 0.056 * s, 0.02 * s);
        ctx.fill();
        if (!rig.hurt) {
          ctx.fillStyle = shade(kob.belly, 10);
          for (const o of [-0.02, 0.012]) {
            ctx.beginPath();
            ctx.moveTo(fxx + lead * 0.062 * s, fyy + o * s - 0.008 * s);
            ctx.lineTo(fxx + lead * 0.095 * s, fyy + o * s + 0.004 * s);
            ctx.lineTo(fxx + lead * 0.062 * s, fyy + o * s + 0.014 * s);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        // The shoe: a heel-to-toe sole block pointed by the facing, an
        // instep collar carrying the leg's line down into it, a sole
        // shadow along the ground and a lit toe face at profile —
        // footwear with anatomy, not a floating pill.
        const toe = fx * 0.026 * s;
        const fw = 0.082 * s;
        const x0 = fxx - fw + Math.min(0, toe);
        const wF = fw * 2 + Math.abs(toe);
        if (!rig.hurt) {
          // Instep first, so the sole block laps over its base.
          const pxw = -auy * shinLW * 0.62;
          const pyw = aux * shinLW * 0.62;
          ctx.fillStyle = shade(bootCol, -6);
          ctx.beginPath();
          ctx.moveTo(ankX - pxw, ankY - pyw);
          ctx.lineTo(ankX + pxw, ankY + pyw);
          ctx.lineTo(fxx + fw * 0.55, fyy - 0.02 * s);
          ctx.lineTo(fxx - fw * 0.55, fyy - 0.02 * s);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = bootCol;
        ctx.beginPath();
        chamferRect(ctx, x0, fyy - 0.031 * s, wF, 0.062 * s, 0.02 * s);
        ctx.fill();
        if (!rig.hurt) {
          // Sole shadow: the dark welt line the shoe stands on.
          ctx.fillStyle = shade(bootCol, -22);
          ctx.fillRect(x0 + 0.008 * s, fyy + 0.017 * s, wF - 0.016 * s, 0.014 * s);
          if (Math.abs(fx) > 0.35) {
            // Toe face catches the light at profile; the heel counter
            // behind darkens — the shoe points where the body walks.
            ctx.fillStyle = shade(bootCol, 9);
            ctx.beginPath();
            chamferRect(
              ctx,
              fx > 0 ? x0 + wF - 0.048 * s : x0 + 0.003 * s,
              fyy - 0.026 * s,
              0.045 * s,
              0.032 * s,
              0.012 * s,
            );
            ctx.fill();
            ctx.fillStyle = shade(bootCol, -12);
            ctx.fillRect(fx > 0 ? x0 + 0.004 * s : x0 + wF - 0.026 * s, fyy - 0.024 * s, 0.022 * s, 0.04 * s);
          }
        }
      }
      if (bootSt?.toe && !rig.hurt) {
        // Steel toe on the leading half of the foot.
        ctx.fillStyle = bootSt.toe;
        ctx.beginPath();
        chamferRect(ctx, fxx + (lead > 0 ? 0.022 : -0.088) * s, fyy - 0.028 * s, 0.066 * s, 0.056 * s, 0.018 * s);
        ctx.fill();
      }
      if (bootSt?.curl && !rig.hurt) {
        // The curled slipper toe — a hook of cloth rising off the tip.
        ctx.strokeStyle = bootSt.cuff?.color ?? shade(bootCol, 16);
        ctx.lineWidth = Math.max(2, s * 0.042);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fxx + lead * 0.068 * s, fyy - 0.004 * s);
        ctx.quadraticCurveTo(fxx + lead * 0.14 * s, fyy + 0.006 * s, fxx + lead * 0.118 * s, fyy - 0.052 * s);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  };

  // ---- arms + weapon. Hand targets change with what the character is
  // doing; two-segment IK arms connect them back to the shoulder line.
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  // The sheathe blend: before the handoff the weapon still lives in the
  // hand (carried toward its stow spot); past it the weapon is BODY
  // gear — the hand code below sees empty fists and relaxes into the
  // bare hang, while the stow painters put the steel on the belt/back.
  const sheath = rig.sheathT ?? 0;
  const stowed = sheath >= STOW_HANDOFF;
  const wornDef = itemDef(rig.weaponItem ?? '');
  const weapon = stowed ? undefined : wornDef;
  // ONE CLASS, ONE DETECTION (arms-v3 Phase 1): the held thing's kind
  // comes from wieldClass — the check-great-first law and the registry
  // probe order live THERE, once, instead of being re-derived at every
  // consumer. Identity still comes from the style registries; roster
  // ids (falchion, hush, stormcaller, ...) don't all say 'sword'.
  const heldKind = weapon !== undefined ? wieldClass(weapon.id) : 'none';
  const isBow = heldKind === 'bow';
  const isGreat = heldKind === 'great';
  // Blades — swords and daggers both — share the low carriage AND the
  // grip-aware strike vocabulary (incl. the reverse grip).
  const isSword = heldKind === 'blade';
  const isStaff = heldKind === 'staff';
  const isPole = heldKind === 'pole';
  // THE VERSATILE GRIP, render side — the server's own war-grip test
  // (gameServer's damage door): a quiver is WORN, not held, so only a
  // held offhand couches the haft. War grip = both fists on the wood;
  // couched = the shield keeps its arm and the pole goes one-handed.
  const poleCouched =
    isPole && rig.offhandItem !== undefined && itemDef(rig.offhandItem)?.backMounted !== true;
  // A reversed main fist changes the ATTACK choreography, not just the
  // carriage — tighter rakes, locked wrist, icepick finisher.
  const rogueMelee = isSword && rig.carryStyle === 'rogue';
  // Per-fist grips + the off blade, hoisted above the melee block: the
  // dual-wield echo choreography needs them at strike time, not just
  // at rest. Flip is a property of the GRIP, constant through swings.
  const mainGrip: Grip = rig.carryStyle === 'rogue' ? 'rogue' : 'normal';
  const offGrip: Grip = rig.carryOff === 'rogue' ? 'rogue' : 'normal';
  // A stowed off blade leaves the hand exactly like the main weapon —
  // offWorn remembers it for the stow painter and the grab blend.
  const offWorn = offSt?.kind === 'weapon' && rig.offhandItem !== undefined;
  const offBlade = offWorn && !stowed;
  // The tool TYPE picks the work cycle: an axe chops, a pick heaves
  // overhead and pries — different rhythms, different bodies. Rods (and
  // bare hands) keep the gentle working sway.
  const toolType = weapon?.tool?.type;
  // Foraging outranks the belt tool: picking herbs is hand-work even
  // with an axe on the hip (the caller also holsters the tool sprite).
  const foraging = rig.pose === PoseState.Gather && rig.foraging === true;
  // THE PATIENT LINE answers two doors: the classic Gather byte with
  // a classified water node, or the dedicated Fish byte (NPC anglers
  // at routine 'fish' stops — no rod in their equip, no node needed).
  const fishing =
    !foraging &&
    (rig.pose === PoseState.Fish || (rig.pose === PoseState.Gather && rig.fishing === true));
  // The raiser's verb — its own byte, so remote builders stopped
  // squaring up to trees (docs/work-cycles-plan.md Phase 2).
  const building = rig.pose === PoseState.Build;
  // Milking is its own pose (never Gather): bare-handed dairy work,
  // weapons stowed by the caller's sheathe blend.
  const milking = rig.pose === PoseState.Milk;
  const chopping = rig.pose === PoseState.Gather && toolType === 'axe' && !foraging;
  const mining = rig.pose === PoseState.Gather && toolType === 'pickaxe' && !foraging;
  const craftKind = rig.pose === PoseState.Craft ? (rig.craftKind ?? 'workbench') : null;
  // THE WORK LIVES IN THE WORLD (work.ts): the verb the engine speaks
  // this frame — gather swings, the dairy pull, station craft. Rod
  // and bare-hand gathers keep the gentle sway below until the fish
  // school lands (plan Phase 3).
  const workKind: WorkKind | null = foraging
    ? 'forage'
    : fishing
      ? 'fish'
      : building
        ? 'build'
        : milking
          ? 'milk'
          : chopping
            ? 'chop'
            : mining
              ? 'mine'
              : craftKind;
  const gatherSwing =
    rig.pose === PoseState.Gather && !chopping && !mining && !foraging
      ? Math.sin(rig.gatherPhase * 5.5) * 0.5
      : 0;

  // Torso proportions (needed for shoulders before the torso is drawn).
  // THE FRONT-HEAVY FRAME: the fur dialect widens the shoulder line
  // and barely the waist — the gnoll's mass lives in its upper torso
  // (arms anchor off tw, so the wider carriage propagates for free).
  // THE CONSTRUCT FRAME widens further than the fur dialect ever did:
  // a golem's mass IS its shoulder line (arms anchor off tw, so the
  // whole carriage broadens for free).
  // The goblin inverts the gnoll's argument: NARROW hunched shoulders
  // over a waist swollen past them — all gut, no chest.
  // THE GIANT INVERSION: the ogre's waist multiplier tops every body's
  // — the gut station in paintOgreBody widens it further still, so the
  // silhouette triangle points UP (heroes and golems point down).
  // The skral narrows the shoulders the goblin's way but keeps the
  // waist a frog's: sloped, slick, a little pot — the mass pools LOW.
  // THE PARADE FRAME: the hobgoblin's proportion argument INVERTS the
  // goblin's — broad squared shoulders over a soldier's waist (the
  // silhouette triangle points DOWN; the goblin's gut points it up).
  const tw = SHOULDER_HALF_S * s * (gno ? 1.28 : gob ? 0.92 : gol ? 1.4 * (0.94 + 0.12 * gol.heavy) : ogr ? 1.32 * (0.94 + 0.1 * ogr.heavy) : skr ? 0.88 : hob ? 1.14 * (0.95 + 0.08 * hob.heavy) : 1); // shoulder half-width
  const ww = WAIST_HALF_S * s * (gno ? 1.06 : gob ? 1.16 + 0.14 * gob.heavy : gol ? 1.22 : ogr ? 1.4 + 0.12 * ogr.heavy : skr ? 1.1 + 0.1 * skr.heavy : hob ? 0.94 + 0.1 * (hob.heavy - 1) : 1); // waist half-width
  const th = TORSO_RISE_S * s * (1 - 0.12 * crouch); // hip line → shoulders
  // ---- THE STOOP LANE (the hunched-biped carriage). The gnoll and
  // the skral carry their spine pitched and their skull sunk INTO the
  // shoulder girdle — but the hunch used to be paint only: the dialect
  // lean was added AFTER the arm frame solved, so the arms hung from
  // an upright skeleton behind the stooped body (roots inside the head
  // hull at the profiles), and the whole hand vocabulary — authored
  // against a human frame whose face sits a full head ABOVE the
  // shoulder line — worked at what is, on these bodies, face height
  // (the hilt-across-the-muzzle packlord, the deepking punching its
  // own jaw). The lane makes the stoop a SKELETON fact:
  //   pitch      the standing spine pitch (the same value the paint
  //              lean consumes below — one truth), projected by fx
  //              like every carriage read;
  //   handDropS  THE FACE OWNS ITS AIR: the whole hand-orbit ring
  //              (armY) drops below the sunken jaw, so rest hangs,
  //              walk pumps, guards, and strike arcs all ride at gut
  //              height on a body whose face lives at chest height;
  //   hangFwdS/  THE KNUCKLE REST (the ogre's giant-reach law with
  //   hangDropS  dialect numbers): relaxed fists hang forward-low
  //              under the leaned chest — the ape hang.
  // THE APE BONES (short humerus over a long forearm — the lynx
  // segSplit law spoken for arms) live in drawArm's solve, and THE
  // GIRDLE RIDES THE STOOP (roots rotate about the hip by the same
  // pitch the torso paints) lands at the shoulder solve below.
  // The ogre predates the lane and keeps its own hand-tuned patches —
  // its numbers are the precedent, not a client.
  const stoop = gno
    ? { pitch: 0.18, handDropS: 0.1, hangFwdS: 0.07, hangDropS: 0.05 }
    : skr
      ? { pitch: 0.18, handDropS: 0.09, hangFwdS: 0.06, hangDropS: 0.04 }
      : null;

  // Melee combo stages — THE CUT LIVES IN THE WORLD (strikes.ts, the
  // one strike engine): every cut is authored as a world-space arc —
  // yaw sweep × height track × radius track — projected through the
  // ONE GROUND law, so the fist, the steel, and the wake share a
  // single geometry at every heading. THE MIRROR LAW reflects the
  // whole arc across the facing axis (a cleave lands down-forward on
  // BOTH sides — the old adds-a-rotation model inverted the vertical
  // at west). Variants ride the swing counter, so a combo string
  // reads as combinations, not a metronome.
  let swingOffset = 0.5 + gatherSwing; // work cycles' arm channel (chop/mine/gather)
  let thrustR: number | null = null; // finisher: radial thrust (tiles)
  let strikeRes: ResolvedStrike | null = null;
  let strikeSchool: StrikeSchool | null = null;
  let strikeVariant = 0;
  let strikeSide: 1 | -1 = 1;
  let mainWake: StrikeWake | null = null;
  // Dual-wield echo: the off blade's own cut on the back of the beat
  // (the ONE-TWO law) — resolved through the same world engine, with
  // a ramp weight blending it out of and back into the combat guard.
  let echoRes: EchoFrame | null = null;
  let echoWk: StrikeWake | null = null;
  let echoW = 0;
  // Sneaking hunches forward along facing; no other pose branch runs in
  // Sneak, so this baseline survives to the torso draw.
  let lean = 0.15 * crouch * Math.sign(fx || 1); // torso lean (radians) inside the squash frame
  const meleeStage =
    rig.pose === PoseState.Attack
      ? 0
      : rig.pose === PoseState.Attack2
        ? 1
        : rig.pose === PoseState.Attack3
          ? 2
          : -1;
  // Icepick finisher path (reverse grip only) — set in stage 2 below.
  let ice: { r: number; lift: number } | null = null;
  // Finisher-only channels: the piston lift and the mountain's grip.
  let finLiftS = 0;
  let greatFinGrip: number | null = null;
  // THE MOUNTAIN FALLS (great finisher): the blade's world pitch
  // through the overhead haul — projected for heldAngle below.
  let greatFinPitch: number | null = null;
  // The shoulder carry's run-claim on the off fist (greatWield).
  let greatRunClaim = 0;
  // The port carry's war-grip claim on the off fist (poleWield); zero
  // under the couch — that hand belongs to the shield.
  let poleRunClaim = 0;
  // THE LATCHED SWING: the beat's variant and mirror side freeze at
  // the swing's first frame (a mid-swing turn can never flip the arc,
  // and the variant counter walks one step per pose-byte change — the
  // POSE ALTERNATION law guarantees every beat is a value change).
  // Stateless callers (CMS portraits) take variant 0 on the raw side.
  if (meleeStage >= 0) {
    strikeSchool = isStaff
      ? 'staff'
      : isGreat
        ? 'great'
        : isPole
          ? 'polearm'
          : rogueMelee
            ? 'rogue'
            : 'sword';
    const smem = rig.depthMemory;
    if (smem) {
      if (smem.strikePose !== rig.pose) {
        smem.strikePose = rig.pose;
        smem.strikeSeq = (smem.strikeSeq ?? -1) + 1;
        smem.strikeSide = (smem.side ?? (Math.sign(fx) || 1)) >= 0 ? 1 : -1;
      }
      strikeSide = smem.strikeSide ?? 1;
      strikeVariant = smem.strikeSeq ?? 0;
    } else {
      strikeSide = (Math.sign(fx) || 1) >= 0 ? 1 : -1;
    }
  }
  if ((meleeStage === 0 || meleeStage === 1) && strikeSchool) {
    const t = rig.poseT;
    const v = strikeVariant % variantCount(strikeSchool, meleeStage as 0 | 1);
    strikeVariant = v;
    strikeRes = resolveStrike(strikeSchool, meleeStage as 0 | 1, v, t, strikeSide, rig.dir);
    lean = strikeRes.lean;
    mainWake = strikeWake(strikeSchool, meleeStage as 0 | 1, v, t, strikeSide, rig.dir);
  } else if (meleeStage === 2) {
    // Finisher. Standard grip: haul the blade to the hip — tip on the
    // mark — then RAM it down the aim and hold it buried. Reverse
    // grip: the ICEPICK — coil high, POISE (the raised-dagger
    // telegraph), plunge down the aim line tip first. One shared lean
    // clock (finisherLean) lands the whole body together.
    const t = rig.poseT;
    swingOffset = 0;
    if (rogueMelee) {
      ice = icepickPath(t);
    } else if (isGreat) {
      // THE MOUNTAIN FALLS: both hands haul the blade straight
      // overhead — the LIFT does the talking while the fist barely
      // leaves the body — the longest poise in the game, then the
      // drive buries the edge in the ground ahead. The blade's pitch
      // is authored in the world and projected below.
      const gp = greatFinisherPath(t);
      thrustR = gp.r;
      finLiftS = gp.lift;
      greatFinPitch = gp.pitch;
      greatFinGrip = 0.26;
    } else {
      const tp = thrustPath(t);
      thrustR = tp.r;
      finLiftS = tp.lift;
    }
    lean = (isGreat ? greatFinisherLean(t) : finisherLean(t)) * Math.sign(fx || 1); // tip the torso along the strike
  }
  // The echo rides every stage of the main combo when an off blade is
  // worn: it coils while the main blade cuts and cuts while the main
  // recovers, on the opposite plane, in the OFF fist's own grip. The
  // ramp weight eases the fist out of its guard into the echo's coil
  // and back to guard by the beat's end, so nothing ever pops.
  if (offBlade && meleeStage >= 0) {
    const t = rig.poseT;
    echoRes = resolveEcho(offGrip, meleeStage as 0 | 1 | 2, t, strikeVariant, strikeSide, rig.dir);
    echoWk = echoWake(offGrip, meleeStage as 0 | 1 | 2, t, strikeVariant, strikeSide, rig.dir);
    if (echoRes) {
      const inU = Math.min(1, (t - ECHO_START) / 0.1);
      const outU = Math.max(0, Math.min(1, (t - 0.92) / 0.08));
      echoW = inU * inU * (3 - 2 * inU) * (1 - outU * outU * (3 - 2 * outU));
      // The body answers the second cut — a smaller counter-lean on
      // the echo's own clock, layered over the main lean's recovery.
      lean += echoRes.lean * 0.5 * echoW;
    }
  }

  const drawT = isBow ? rig.drawT : 0;
  const loosing = isBow && rig.pose === PoseState.Loose;
  const drawing = isBow && !loosing && (drawT > 0 || rig.pose === PoseState.Draw);
  if (drawing) lean = -Math.sign(fx || 1) * 0.07 * drawT; // braced back

  let reach = 0.25 * s;
  // THE WORK LIVES IN THE WORLD (work.ts, docs/work-cycles-plan.md):
  // every work cycle — the gather swings, the dairy pull, the station
  // crafts — resolves through the one world-space engine: yaw, radius,
  // height, and tool-PITCH tracks authored off the WORK BEARING (the
  // square-up heading the renderer aims at the worked tile), mirrored
  // across it by the BIT-LEADS predicate (workSideOf ≡ the cos(dir)
  // test in drawHeldItem — keep them identical or edge/poll desync
  // returns), and projected through WIELD_GROUND_K. The resolved
  // frame carries both fists, the tool rod's angle+fore, the
  // business-end tip the impact FX spawn at, the torso lean
  // (projected by the bearing's screen-x, so camera-line workers bow
  // instead of picking an arbitrary side), and the world depth THE
  // SWEEP EARNS ITS LAYER reads — an away-facing chop works honestly
  // behind the body's silhouette. The old screen-circle cycles
  // (swingOffset + radial reach on the flat card) died here.
  // EVERY RIG SPEAKS ITS OWN WORK — the voice (worklab's verdict made
  // law): the flesh frame's overhead haul parked the axe across the
  // gnoll's muzzle and laid the pick over the kobold's skull, so each
  // dialect caps its raises, clears its face sideways when the tool
  // is up, settles toward its own hand ring, and answers with the
  // lean its spine has left. Parameters into the one engine — never a
  // fork of the choreography.
  const workVoice: WorkVoice = gno
    ? { raiseK: 0.55, reachK: 1.06, clearYaw: 0.5, dropS: 0.04, leanK: 0.8 }
    : skr
      ? { raiseK: 0.6, reachK: 1, clearYaw: 0.45, dropS: 0.03, leanK: 0.8 }
      : gob
        ? { raiseK: 0.7, reachK: 0.96, clearYaw: 0.35, dropS: 0.02, leanK: 0.9 }
        : kob
          ? { raiseK: 0.6, reachK: 1, clearYaw: 0.55, dropS: 0.03, leanK: 0.9 }
          : ogr
            ? { raiseK: 0.85, reachK: 1.1, clearYaw: 0.15, dropS: 0, leanK: 0.7 }
            : gol
              ? { raiseK: 0.9, reachK: 1.05, clearYaw: 0.1, dropS: 0, leanK: 0.6 }
              : WORK_VOICE_NEUTRAL;
  const workRes = workKind
    ? resolveWork(workKind, workCycleU(workKind, rig.nowMs), rig.dir, rig.nowMs, workVoice)
    : null;
  if (workRes) lean = workRes.lean;
  // THE ARM RING RIDES THE SQUASH (arms-v3 Phase 1, the one flagged
  // pixel change): shoulderY has always compensated the fake-3D width
  // squash with hScale — the torso reads TALLER when it narrows at the
  // camera-line facings — but the hand-orbit line hung at a fixed drop,
  // so the shoulder→hand span quietly stretched ~6% on every N/S
  // facing. Both ends of the arm frame now agree about the squash.
  // THE FACE OWNS ITS AIR (the stoop lane): on the hunched dialects
  // the sunken skull's jaw reaches the human frame's hand-orbit line,
  // so the whole ring drops — every consumer (rest hangs, walk pumps,
  // guards, strike arcs, cast presents) rides down with it coherently
  // instead of each branch dodging the face on its own.
  const armY = hipY - (ARM_RING_DROP_S * hScale - (stoop?.handDropS ?? 0)) * s;
  const shoulderY = hipY - th * hScale + SHOULDER_Y_DROP_S * s;
  // ==================== THE ONE MOUTH BEGINS ====================
  // (arms-v3 Phase 2) Every write to the arm channels — heldAngle,
  // mainX/mainY, offX/offY, offBladeAngle, mainFore/offFore,
  // staffGrip, armSwingK — lives between this fence and its END
  // marker, as one ordered pipeline of labeled stages: baseline →
  // rest carriage → pump → seat → cast → draw → sheathe → claims.
  // armAssembly.test.ts walks the source and fails the build if a
  // write to any of these channels appears outside the fence, or if
  // the per-channel writer census drifts without the test being told.
  const mainAngle = rig.dir + swingOffset;
  // The free arm counter-swings a melee strike instead of floating on
  // a fixed circle — two arms in the fight, not one. An off BLADE
  // never counter-swings: it braces in guard, then its shoulder and
  // elbow follow the echo cut on the echo's own ramp.
  let offAngle = strikeRes ? rig.dir + strikeRes.counterYaw : rig.dir - 0.55;
  if (offBlade && meleeStage >= 0) {
    offAngle = rig.dir - 0.9;
  }
  // THE AIM IS A GROUND VECTOR (arms-v3 Phase 3): every radial reach
  // down the aim rides the projected unit direction — its depth
  // component carries the ground K, so a north thrust punches short
  // and high, a south thrust short and low, and the fist finally
  // travels the same ellipse its slash trail draws. The strike-stage
  // ORBITS (mainAngle sweeps) deliberately stay screen circles: the
  // schools' cut planes are authored facing-dependent art (Part 4 —
  // the choreography is law).
  const aim = projectAim(rig.dir);
  let mainX: number;
  let mainY: number;
  if (workRes) {
    // THE WORK LIVES IN THE WORLD: the fist rides the resolved work
    // frame — the same projected geometry the tool rod, the tip, and
    // the impact FX read, at every heading by construction.
    mainX = rig.x + workRes.fistDX * s * wS;
    mainY = armY + workRes.fistDY * s;
  } else if (thrustR !== null) {
    mainX = rig.x + aim.px * thrustR * s * wS;
    mainY = armY + aim.py * thrustR * s + finLiftS * s;
  } else if (ice) {
    // Icepick: the fist rides its coil-high/drive-down path.
    mainX = rig.x + aim.px * ice.r * s * wS;
    mainY = armY + aim.py * ice.r * s + ice.lift * s;
  } else if (strikeRes) {
    // THE CUT LIVES IN THE WORLD: the fist rides the resolved arc —
    // the same ground ellipse the blade angle and the wake project
    // through, the whole reason they can never disagree again.
    mainX = rig.x + strikeRes.fistDX * s * wS;
    mainY = armY + strikeRes.fistDY * s;
  } else {
    mainX = rig.x + Math.cos(mainAngle) * reach * wS;
    mainY = armY + Math.sin(mainAngle) * reach;
  }
  // The free hand hangs relaxed by the hip opposite the weapon hand;
  // during swings/casts it rides the counterbalance circle instead.
  let offX: number;
  let offY: number;
  if (offBlade && meleeStage >= 0) {
    // Dual wield, mid-combo: the off blade NEVER mirrors the main
    // swing (two arms windmilling in parallel was the flail). It
    // BRACES in guard while the main blade cuts — a fixed coiled
    // ready — then the echo beat takes the fist over on its own
    // choreography, eased in and out by the ramp weight.
    const gAngle = rig.dir - 0.9;
    let gx = rig.x + Math.cos(gAngle) * 0.18 * s * wS;
    let gy = armY + Math.sin(gAngle) * 0.18 * s + 0.02 * s;
    if (thrustR !== null || ice) {
      // Finisher counter-haul until the echo claims the arm.
      gx = rig.x - fx * 0.17 * s * wS;
      gy = armY + 0.09 * s;
    }
    if (echoRes && echoW > 0) {
      // The echo fist rides its own resolved arc — same world engine,
      // the off blade's own grip and mirror side.
      const ex = rig.x + echoRes.fistDX * s * wS;
      const ey = armY + echoRes.fistDY * s;
      offX = gx + (ex - gx) * echoW;
      offY = gy + (ey - gy) * echoW;
    } else {
      offX = gx;
      offY = gy;
    }
  } else if (thrustR !== null || ice) {
    // Finisher: the free arm hauls back behind the hip — the counter-
    // weight of the ram (or of the icepick drive).
    offX = rig.x - fx * 0.17 * s * wS;
    offY = armY + 0.09 * s;
  } else if (workRes) {
    // The off hand rides the resolved work frame: choked on the haft
    // behind the striking fist, planted steady (the tongs hand, the
    // stem-steadier), teamed on the carry, or pulling the off-beat of
    // the alternation — the spec's off-hand mode decides, projected
    // through the same geometry as everything else.
    offX = rig.x + workRes.offDX * s * wS;
    offY = armY + workRes.offDY * s;
  } else if (meleeStage === -1 && rig.pose !== PoseState.Cast) {
    offX = rig.x - Math.cos(mainAngle) * 0.15 * s * wS;
    offY = armY + 0.13 * s;
  } else {
    offX = rig.x + Math.cos(offAngle) * reach * wS;
    offY = armY + Math.sin(offAngle) * reach;
  }

  // ---- rest carriage: out of combat the weapon comes DOWN. Idle and
  // travel are where the character actually lives, so this is its own
  // vocabulary: hands hanging just outside the silhouette (BOTH arms
  // visible), a blade lowered with its tip trailing, a bow upright at
  // the side — and the staff planted as a true walking stick at rest,
  // leveling out into a low run carry as the gait becomes a sprint.
  // Everything blends on poseT, so a combat follow-through settles
  // into carriage over the same 280 ms every pose change uses.
  // Foreshortening from the projection law — threaded to the painter
  // so a weapon pointing into (or out of) the scene draws SHORT. The
  // length change, not the angle, is what tells the eye the steel
  // lives in the world's depth instead of rotating on a flat card.
  // THE STRIKE'S OWN MOUTH (arms-v3 Phase 2): the five mutually-
  // exclusive strike-angle sources resolve to ONE {angle, fore} pair
  // in one pure expression — the branch cascade that used to be
  // heldAngle's writers #1 and #2 is now a single resolved input to
  // the assembly below.
  const strikeHeld = ((): { angle: number; fore: number } => {
    if (workRes && workKind && WORK_BOOK[workKind].tipS > 0) {
      // THE TOOL IS A 3D ROD (work.ts): the axe, the pick, and the
      // smith's hammer ride the work engine's pitch track projected
      // through projectCarry — tip flung up-behind at the windup,
      // driving down-forward into the work — instead of lying rigid
      // along the arm ray. Bare-hand kinds fall through (nothing is
      // held; the blend-out of a sheathing tool keeps the arm ray).
      return { angle: workRes.toolAngle, fore: workRes.toolFore };
    }
    if (strikeRes) {
      // THE CUT LIVES IN THE WORLD: blade angle and foreshortening
      // come out of the same resolved arc the fist rides — the wrist
      // law (radial schools), the tangent bar (the pole school), and
      // the rogue lock all live inside the resolver.
      return { angle: strikeRes.bladeAngle, fore: strikeRes.fore };
    }
    if (ice) {
      // The reversed blade stays pointed at the strike mark all the
      // way through the coil and the drive — menace through the whole
      // beat. The mark lives on the projected ground plane now (the
      // fist's own ellipse), so blade, fist, and streak agree.
      const markX = rig.x + aim.px * 0.6 * s * wS;
      const markY = armY + aim.py * 0.6 * s + 0.26 * s;
      return {
        angle: Math.atan2(markY - mainY, markX - mainX),
        fore: aim.fore,
      };
    }
    if (greatFinPitch !== null) {
      // THE MOUNTAIN FALLS: the blade's overhead haul is a world
      // pitch — straight up through the poise, crashing to
      // down-forward at the bury — projected exactly like a carry.
      return projectCarry(rig.dir, greatFinPitch);
    }
    if (thrustR !== null) {
      // The lunge rams straight down the PROJECTED aim — the blade
      // rides the same ellipse the fist travels, honestly shorter
      // when the aim runs into the screen.
      return { angle: aim.angle, fore: aim.fore };
    }
    return { angle: mainAngle, fore: 1 };
  })();
  let mainFore = strikeHeld.fore;
  let offFore = 1;
  let heldAngle = strikeHeld.angle;
  let staffGrip = 0.34; // combat default: gripped low, business end forward
  if (strikeRes?.grip != null) staffGrip = strikeRes.grip;
  if (greatFinGrip !== null) staffGrip = greatFinGrip;
  let armSwingK = 1;
  let restSettle = 0;
  const restSide = Math.sign(fx) || 1;
  // THE SMOOTHED REST SIDE (wield.ts easeRestSide): the side eases
  // ±1→∓1 through 0 over 240ms, a flip needs 120ms of sustained
  // facing past ±0.12 to register (heading-jitter churn), and a
  // mid-ease reversal continues from the current blend, never
  // snapping back to a full side. Stateless callers take the raw sign.
  let sideS = restSide;
  const mem = rig.depthMemory;
  if (mem) sideS = easeRestSide(mem, restSide, fx, rig.nowMs);
  // THE FACING FRAME (arms-v3 Phase 2): the one side vocabulary,
  // computed once — every wield function takes the whole frame and
  // reads by field name, so a bare number can never be fed the wrong
  // meaning of "side" again (the drift the audit mapped).
  const face = facingFrame(rig.dir, sideS);
  // THE FACING-WEIGHT LAW: the carriage rake is a PROFILE read. Side-on
  // the blade rakes fully forward or back; facing the camera (or away)
  // there IS no screen-forward, so the rake relaxes toward a near-
  // vertical hang. The floor is a whisper (0.2): front-on there is no
  // direction for a rake to point, and the old 0.35 floor splayed the
  // blade diagonally at the viewer — "pointing the sword at the
  // camera" (user verdict). Grip identity front-on is carried by the
  // edge flip and the lean SIGN, not by rake magnitude. Feeding the
  // full ±1 at every facing is what held swords sideways and fists
  // high on a north-south run.
  const sideW = face.sideW;
  // THE SMOOTHED SWING LAW: the raw pump drive — the foot-lift
  // differential — saturates and kinks at every footfall, and wrists
  // driven straight off it hinge between two poses. An ~80ms low-pass
  // turns the drive into a sweep; the lag IS the lag of a relaxed arm.
  // Stateless callers fall back to the raw drive.
  const swRaw = Math.max(
    -1,
    Math.min(1, ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP),
  );
  let swS = swRaw;
  if (mem) {
    const dt = Math.max(0, Math.min(120, rig.nowMs - (mem.swMs ?? rig.nowMs)));
    const prev = mem.sw ?? swRaw;
    swS = prev + (swRaw - prev) * (1 - Math.exp(-dt / 80));
    mem.sw = swS;
    mem.swMs = rig.nowMs;
  }
  // Per-fist edge flips: a property of the GRIP (hoisted above the
  // melee block), constant through swings — a reversed fist keeps its
  // edge orientation mid-combo, so it can never pop.
  const mainFlip = isSword && mainGrip === 'rogue';
  const offFlip = offBlade && offGrip === 'rogue';
  // Knives ride tighter to the body than swords — the compact carry.
  const mainCompact = isSword && (weapon?.weapon?.range ?? 2) <= 1.5 ? 1 : 0;
  const offCompact =
    offBlade && (itemDef(rig.offhandItem!)?.weapon?.range ?? 2) <= 1.5 ? 1 : 0;
  // Off-blade baseline: the raised guard read it keeps through combat.
  let offBladeAngle = -Math.PI / 2 + sideW * 0.35;
  // The echo cut steers the off blade through its own wrist law —
  // blended on the same ramp weight as the fist, so the blade and the
  // hand leave (and rejoin) the guard together.
  if (echoRes && echoW > 0) {
    // The echo blade rides its own resolved arc — one world engine.
    offBladeAngle += angleDelta(offBladeAngle, echoRes.bladeAngle) * echoW;
    offFore = 1 + (echoRes.fore - 1) * echoW;
  }
  // THE SETTLE OUTLIVES THE POSE (arms-v3 Phase 2): the rest stage
  // used to gate on the restful POSES, so the first frame of a strike
  // dropped every rest channel to the combat baseline in one step —
  // the renderer's rest clock now GLIDES on exit, and this stage runs
  // wherever any settle remains, its lerps carrying the hands out of
  // the carriage and into the fight continuously. At restSettle 0 the
  // whole block is a no-op by construction (every write lerps by the
  // settle), so the gate change alone moves no pixel.
  restSettle = rig.restT * rig.restT * (3 - 2 * rig.restT);
  if (restSettle > 0 && !drawing && !loosing) {
    const wSide = sideS;
    // THE GAIT LADDER (wield.ts): idle → walk → run are three stances.
    // A slow walk lifts every carry a fraction of the run delta the
    // moment the feet move — the old two-stop blend held the full idle
    // hang until the legs were sprinting, a stroll with statue arms.
    const runK = gaitK(Math.min(1, rig.poleStrength), rig.runF);
    // THE HANG-WIDTH LAW: hands hang at shoulder width only in PROFILE
    // (where the near hand must clear the turned torso). Front-on and
    // back-on a relaxed arm tapers in from the shoulder to brush the
    // HIP line — full-width hands at a frontal facing floated outward
    // off the body, both fists splayed wide of the silhouette (the
    // "hands come outward" read). Linear in profileK, so the stance
    // breathes continuously through every diagonal.
    // THE SILHOUETTE PEEK (arms-v3 Phase 4): at the away diagonals the
    // hang lanes widen so held gear clears the torso silhouette — a
    // loadout stays readable from behind instead of vanishing into
    // the body (zero on the camera half and at profile, by the band).
    // THE TURNED BAR reaches the hands: the old profile lane WIDENED
    // to the shoulder corner (tw·1.02) side-on — hands splayed at both
    // silhouette edges, the frontal-card read. A profile hand hangs
    // along the body's side plane, near the centerline: the lane now
    // TUCKS toward tw·0.62 as the heading turns side-on, and each fist
    // inherits its own shoulder's fore-aft stagger below.
    const hangW =
      (ww * HANG_WAIST_K + (tw * 0.62 - ww * HANG_WAIST_K) * profileK) *
      (1 + PEEK_HANG_K * awayPeekK(fy));
    const hangStag = shoulderStagK(fx) * tw;
    // THE RUNNER'S ELBOW: an empty fist rises toward the ribs as the
    // gait becomes a sprint — bent arms pumping with the legs, the
    // shape every running reference draws. Armed fists keep their
    // carriage heights (a carry law is a verdict). Facing-weighted
    // inside runnerLift: full lift in profile, half at the camera
    // lines, where the full lift tucked both fists into the armpits.
    const elbowLift = runnerLift(Math.min(1, rig.poleStrength), rig.runF, profileK) * s;
    // THE VISIBLE BREATH (arms-v3 Phase 5): free fists alternate the
    // lift with the stride on camera-line gaits — one hand toward the
    // ribs as the other drops — dead at profile where the fore/aft
    // pump already owns the read. Rides the SMOOTHED swing, so it
    // sweeps instead of hinging.
    const liftAlt = LIFT_ALT_K * swS * (1 - Math.abs(rig.poleX));
    let hx = rig.x + wSide * hangW * wS + hangStag * 0.06;
    let hy = armY + REST_HANG_DROP_S * s - elbowLift * (1 + liftAlt);
    let hAngle = Math.PI / 2 + sideW * (0.3 + 0.35 * runK); // tip down, trailing
    let hFore = 1; // rest-carry foreshortening, blended in on the settle
    if (ogr) {
      // THE KNUCKLE HANG'S REST (THE GIANT REACH): the ogre's unequal
      // bones out-reach the human hang target by a whole forearm —
      // the surplus bend let the elbow solver throw arms REARWARD at
      // the turned bands. The giant's rest spends the surplus
      // honestly: knuckles a half-step LOWER (mid-thigh, the ape
      // hang) and FORWARD along the stooped facing, under the leaned
      // shoulders — the arms hang where the carriage put the weight.
      hx += fx * 0.06 * s;
      hy += 0.12 * s;
    } else if (stoop) {
      // THE KNUCKLE REST (the stoop lane): the same law with dialect
      // numbers — the ape-bone surplus spends as a forward-low hang
      // under the leaned chest, never as elbow slack.
      hx += fx * stoop.hangFwdS * s;
      hy += stoop.hangDropS * s;
    } else if (hob) {
      // THE SHIELD-WALL STANCE: the parade frame hangs its fists off
      // the shoulder-cap line, not the waist — a drilled soldier
      // stands WIDE, elbows clear of the cuirass, and the stance must
      // survive the diagonals (the squeeze there read as a pinched
      // body under broad shoulders — the user's SE verdict).
      hx += wSide * 0.07 * s * wS;
    }
    // How "at rest" the rest really is: flourishes and wrist life only
    // play when the figure is planted (no gait, no sneak crouch) —
    // a sneaking rogue does not twirl knives.
    const idleK = (1 - Math.min(1, rig.poleStrength)) * (1 - crouch);
    if (isSword) {
      // Hand lanes ride the facing weight; the ANGLE rides the
      // projection law — the carriage's profile rake is authored as a
      // world pitch and projected, so at E/W the user-approved angles
      // reproduce exactly while N/S carries genuinely foreshorten
      // (the blade points into the scene and draws short) instead of
      // being relaxed toward vertical by a screen-side floor.
      const c = bladeCarriage(mainGrip, sideW, runK, mainCompact);
      const canon = bladeCarriage(mainGrip, 1, runK, mainCompact);
      // THE LIFELINE: the blade's projection yaw biases toward the
      // eased side at the camera lines — a leveled run carry keeps a
      // readable diagonal instead of collapsing to a plumb line (the
      // "sword run S = a stick" verdict cell). Profile stays exact.
      const proj = projectCarry(lifelineYaw(face), Math.PI / 2 - canon.angle);
      hAngle = proj.angle;
      hFore = proj.fore;
      hx += c.dx * s * wS;
      hy = armY + (REST_HANG_DROP_S + c.dy) * s;
      // DUAL-WIELD PROFILE FLIP (position half): side-on you cannot see
      // both hilts, and it is the MAIN fist that reads as the body's
      // far hand — it slides in toward the body center as the facing
      // turns profile, and the paint order below drops it behind the
      // torso. The off hand keeps its visible hang at the side.
      if (offBlade) {
        const t = Math.max(0, Math.min(1, (profileK - 0.6) / 0.35));
        const tuckK = t * t * (3 - 2 * t);
        hx = rig.x + (hx - rig.x) * (1 - 0.82 * tuckK);
      }
      if (idleK > 0) {
        // Continuous wrist life: the resting blade breathes with the
        // hands instead of freezing — and every few seconds the fist
        // plays with it (a rogue wrist-spin, a standard tip-raise).
        hAngle += Math.sin(rig.nowMs * 0.0011) * 0.045 * idleK;
        // Flourishes take the side SIGN, not the weight — a fractional
        // side would shrink the rogue spin short of its full turn.
        const fl = idleFlourish(rig.nowMs, 0, mainGrip, sideS >= 0 ? 1 : -1);
        if (fl) {
          hAngle += fl.spin * idleK;
          hy -= fl.lift * s * idleK;
        }
      }
    }
    if (isGreat) {
      // THE SHOULDER CARRY (wield.ts): the flat of the greatblade
      // rests back over the trailing shoulder at every gait — the
      // woodcutter's carry, one motion from the guard. The walk rocks
      // the mass a beat behind the stride; the run levels the blade a
      // little into the drive, drops the fist toward the ribs, and
      // calls the off hand back to the grip (the second-fist claim
      // below reads gf.offClaim).
      const gf = greatWield(face, Math.min(1, rig.poleStrength), rig.runF, swS, rig.poleX);
      hAngle = gf.angle;
      hFore = gf.fore;
      hx = rig.x + gf.dx * s * wS + gf.fwd * s;
      hy = armY + gf.dy * s;
      if (ogr || stoop) {
        // THE LOG CARRY: the woodcutter's flat-back shoulder carry
        // threw a tree-length club far behind a stooped giant. An
        // ogre carries the club the way anyone carries a felled log:
        // the mass UPRIGHTED against the shoulder, butt-fist dropped
        // to the gut line — one motion from the overhead toll, and
        // the head stays clear at every idle band.
        // The stoop lane joins the branch (the packlord's audit: the
        // flat carry laid the blade ACROSS THE FACE and parked the
        // hilt fist on the muzzle at every toward-camera band — a
        // sunken skull leaves no shoulder shelf for a flat carry).
        hAngle += angleDelta(hAngle, -Math.PI / 2 + sideW * 0.38) * 0.5;
        hy += 0.11 * s;
        hx += fx * 0.04 * s;
      }
      // THE GRIP JOINS THE LADDER (arms-v3 Phase 2): grip and pumpK
      // ride the same settle blend every other rest channel rides —
      // they used to be plain overwrites, and the fist SNAPPED along
      // the haft at every combat entry and exit (the one channel the
      // audit found excluded from the neutral-at-boundary contract).
      staffGrip += (gf.grip - staffGrip) * restSettle;
      armSwingK += (gf.pumpK - armSwingK) * restSettle;
      greatRunClaim = gf.offClaim;
    }
    if (isPole) {
      // THE TWO CARRIES (wield.ts): war grip rides THE PORT — the
      // soldier's diagonal across the body, point up-forward over the
      // lead shoulder, the run lowering it down the travel line and
      // welding the second fist (the claim below reads pf.offClaim).
      // Couched, the same haft rides THE PLANT — the sentry's vertical
      // beside the wall — dropping to the level hip couch at a run.
      const pf = poleWield(face, Math.min(1, rig.poleStrength), rig.runF, swS, rig.poleX, poleCouched);
      hAngle = pf.angle;
      hFore = pf.fore;
      hx = rig.x + pf.dx * s * wS + pf.fwd * s;
      hy = armY + pf.dy * s;
      // THE GRIP JOINS THE LADDER: the fist slides along the haft on
      // the settle, never in one frame.
      staffGrip += (pf.grip - staffGrip) * restSettle;
      armSwingK += (pf.pumpK - armSwingK) * restSettle;
      poleRunClaim = pf.offClaim;
    }
    if (isStaff) {
      // THE STAFF LADDER v2 (wield.ts): planted walking stick at
      // idle, rocking with the stride at a walk (in the TRAVEL plane
      // now, alive at every facing), leveling into a ONE-hand balance
      // carry at a run — the off hand is free and pumps with the legs
      // (the user's verdict on the two-hand run: nobody crosses their
      // body to double-grip a pole at a dead sprint). Two hands meet
      // on the wood only in the quarterstaff guard and its strikes.
      const sf = staffWield(face, Math.min(1, rig.poleStrength), rig.runF, swS, rig.poleX);
      hAngle = sf.angle;
      hFore = sf.fore;
      hx = rig.x + sf.dx * s * wS + sf.fwd * s;
      hy = armY + sf.dy * s;
      // THE GRIP JOINS THE LADDER — the staff's fist slides to the
      // walking-stick grip on the settle, never in one frame.
      staffGrip += (sf.grip - staffGrip) * restSettle;
      armSwingK += (sf.pumpK - armSwingK) * restSettle;
    } else if (isBow) {
      // The walking carry, reference-true (wield.ts): gripped by the
      // wood with the STRING facing the body (upper side) and the
      // wooden belly curving down-forward — the bow leans half-ready,
      // top limb toward the shoulder line, lower limb by the thigh, so
      // raising it into the aim is one motion. Continuous in the
      // facing weight (no binary mirror snap at north/south), the gait
      // ladder firms the carry toward ready on the run, and the
      // projection law compresses the limbs gently at the camera-line
      // facings — a plane's half-measure of the rod law's depth.
      const bf = bowWield(face, Math.min(1, rig.poleStrength), rig.runF);
      hAngle = bf.angle;
      hFore = bf.fore;
      hx += bf.dx * s * wS;
      hy = armY + bf.dy * s;
    }
    // THE HANDS PASS FRONT-AND-BACK: mid side-ease both rest anchors
    // sweep through the body's center, and at the midpoint the two
    // fists (and their blades) landed on the SAME point — the "arms
    // crossed" overlap the user caught. A crossing splits on the
    // height axis instead: the main fist dips a breath, the off fist
    // rides a breath high, and the pair shears past each other like
    // real hands swapping — never through one another. crossK > 0
    // only while the ease is in flight; the settled stance is
    // untouched.
    const crossK = 1 - Math.min(1, Math.abs(sideS));
    hy += crossK * 0.035 * s;
    mainX += (hx - mainX) * restSettle;
    mainY += (hy - mainY) * restSettle;
    heldAngle += angleDelta(heldAngle, hAngle) * restSettle;
    mainFore += (hFore - mainFore) * restSettle;
    // The off fist: bare hands hang; a dual wielder's second blade gets
    // the same grip vocabulary as the main — its own side, its own
    // grip, its own flourish phase (the two never twirl in sync). The
    // hand rides a touch higher and tighter than the main: the trailing
    // blade of a paired stance, not a mirror image.
    let ox = rig.x - wSide * hangW * wS - hangStag * 0.12;
    let oy = armY + REST_HANG_DROP_S * s - elbowLift * (1 - liftAlt);
    if (ogr) {
      // The off fist hangs the same giant rest (THE GIANT REACH).
      ox += fx * 0.06 * s;
      oy += 0.12 * s;
    } else if (stoop) {
      // The off fist hangs the same knuckle rest (the stoop lane).
      ox += fx * stoop.hangFwdS * s;
      oy += stoop.hangDropS * s;
    } else if (hob) {
      // The off fist holds the same shield-wall width.
      ox -= wSide * 0.07 * s * wS;
    }
    if (offBlade) {
      // The carriage mirrors on FACING, not on the hanging side — the
      // off fist trails the facing, so its outward push (dx) mirrors
      // while the blade angles stay true to forward/backward.
      const oc = bladeCarriage(offGrip, sideW, runK, offCompact);
      // The off blade rides the same projection law as the main: its
      // profile rake becomes a world pitch, N/S carries draw honestly
      // short — and the same LIFELINE keeps its diagonal readable.
      const oCanon = bladeCarriage(offGrip, 1, runK, offCompact);
      const oProj = projectCarry(lifelineYaw(face), Math.PI / 2 - oCanon.angle);
      let oAngle = oProj.angle;
      offFore += (oProj.fore - offFore) * restSettle;
      // The off fist is the NEAR arm — visible at the side from every
      // facing; side-on it pulls part-way onto the body (where a near
      // arm actually hangs in profile) and the depth flip below paints
      // it FOREMOST, over the torso.
      ox -= oc.dx * s * wS;
      oy = armY + (OFF_BLADE_HANG_DROP_S + oc.dy) * s;
      const tn = Math.max(0, Math.min(1, (profileK - 0.55) / 0.4));
      const nearK = tn * tn * (3 - 2 * tn);
      ox = rig.x + (ox - rig.x) * (1 - 0.45 * nearK);
      if (idleK > 0) {
        oAngle += Math.sin(rig.nowMs * 0.0011 + 2.1) * 0.045 * idleK;
        const fl = idleFlourish(rig.nowMs, FLOURISH_OFF_PHASE_MS, offGrip, sideS >= 0 ? 1 : -1);
        if (fl) {
          oAngle += fl.spin * idleK;
          oy -= fl.lift * s * idleK;
        }
      }
      offBladeAngle += angleDelta(offBladeAngle, oAngle) * restSettle;
    }
    // The off fist takes the high lane of the crossing shear (see
    // crossK above the main blend).
    oy -= crossK * 0.035 * s;
    offX += (ox - offX) * restSettle;
    offY += (oy - offY) * restSettle;
  }

  // ---- THE READY CARRY (the reaching school). Out of rest the pole
  // levels into its guard — point forward, a breath above the horizon
  // (POLE_GUARD_PITCH) — the pitch every polearm cut coils from, and
  // the one carry both grips share once the fight starts. Projected on
  // the lifeline like the rest carries, so the point keeps a readable
  // diagonal at the camera lines and draws honestly short. The engines
  // that own the whole frame (a resolved cut, the finisher's ram, the
  // work cycles) keep it; the guard only holds the space between them.
  if (isPole && restSettle < 1 && !workRes && !strikeRes && thrustR === null) {
    const g = projectCarry(lifelineYaw(face), POLE_GUARD_PITCH);
    const guardK = 1 - restSettle;
    heldAngle += angleDelta(heldAngle, g.angle) * guardK;
    mainFore += (g.fore - mainFore) * guardK;
  }

  // Walking: arms swing counter to the legs along the travel direction.
  // Sneak walks the same law at a stalker's amplitude — the old gate
  // froze a sneaking figure's arms dead from the first crouched step.
  // THE PUMP RIDES THE SETTLE (arms-v3 Phase 2): this stage used to
  // gate on the restful POSES — pump, sway, and breath vanished in one
  // frame when a strike began, even though the rest carriage they
  // decorate blends out over restSettle. The stage now runs wherever
  // any rest carriage remains, and every contribution scales with the
  // settle: in from nothing as the body settles out of a fight, out
  // through the exit glide — no channel the settle owns ever snaps.
  // (The draw guard mirrors the rest stage's: the archer's anchors
  // own the hands outright, exactly as the old pose gate had it.)
  if (restSettle > 0 && !drawing && !loosing) {
    // The pump rides the SMOOTHED swing (clamped ±1 at the source):
    // the raw footfall drive hinges, the low-passed one sweeps.
    const sw = swS;
    // THE HONEST PUMP (wield.ts): arms swing along the TRAVEL,
    // foreshortened by the ground law — a north-south run keeps real
    // fore/aft arm life (smaller on screen because the world says so),
    // where the old front-on clamp suppressed armed hands near-dead.
    // THE ALIGNMENT DAMP: the full throw belongs to a body running the
    // way it faces. Strafing or backpedaling, the hands hang on the
    // FACING side while the pump drives along the TRAVEL — at full
    // amplitude that swings a fist across the shoulder line and folds
    // the elbow inside-out. A sidestepping body pumps small.
    const alignK = 0.5 + 0.5 * Math.max(0, rig.align);
    const amp =
      (0.07 + 0.055 * rig.runF) *
      s *
      Math.min(1, rig.poleStrength) *
      (1 - 0.45 * crouch) *
      alignK;
    const armed = isSword || isBow || isStaff || isGreat || isPole;
    const p = armPump(rig.poleX, rig.poleY, sw, amp, armed ? restSettle : 0);
    // THE PENDULUM ARC: a hand swinging from a shoulder rises at both
    // ends of its sweep — sw² is that arc. (|sw| had the same shape
    // but a hard CORNER at every zero crossing: the hands visibly
    // flicked twice a stride, the jitter the user caught.)
    const bounce = sw * sw * rig.runF * 0.03 * s;
    mainX += p.dx * armSwingK * restSettle;
    mainY += (p.dy - bounce) * armSwingK * restSettle;
    const offSwingK = offBlade ? 0.85 : 1;
    offX -= p.dx * offSwingK * restSettle;
    offY -= (p.dy - bounce) * offSwingK * restSettle;
    // The torso counter-sway of a real gait, living wherever the
    // fore/aft component leaves the screen (travel-true, not a
    // facing patch) — shared by both hands, never mirrored.
    const sway = p.sway * s * Math.min(1, rig.poleStrength) * restSettle;
    mainX += sway;
    offX += sway;
    // WRIST-FOLLOW: the blade angle rides the arm swing a few degrees
    // instead of staying frozen while the fist translates — a frozen
    // world-angle on a pumping hand reads as a broken wrist. Subtle,
    // counter-phased between the hands, alive from the first walking
    // step, scaled by the facing weight (quiet wrists on a front/back
    // gait — the same law the carriage rake follows), and it dies as
    // the figure stops.
    if (restSettle > 0 && rig.poleStrength > 0.05) {
      const follow =
        sw * (0.3 + 0.7 * rig.runF) * restSettle * Math.min(1, rig.poleStrength);
      // A reverse grip is LOCKED to the forearm (an assassin's blade
      // doesn't flop) — its follow is half the standard grip's lag.
      if (isSword) heldAngle += (mainGrip === 'rogue' ? 0.03 : -0.07) * sideW * follow;
      else if (isBow) heldAngle += -0.04 * sideW * follow;
      if (offBlade) offBladeAngle += (offGrip === 'rogue' ? -0.03 : 0.07) * sideW * follow;
    }
    // Standing breath: the hands ride a slow offset sine so the figure
    // is never a freeze-frame — alive even when idle.
    const rest = (1 - Math.min(1, rig.poleStrength)) * restSettle;
    if (rest > 0) {
      const b = Math.sin(rig.nowMs * 0.0019) * rest;
      const b2 = Math.sin(rig.nowMs * 0.0019 + 1.1) * rest;
      mainY += b * 0.011 * s;
      mainX += b2 * 0.005 * s;
      offY += b2 * 0.013 * s;
      offX -= b * 0.005 * s;
    }
  }

  // ---- the seat claims the arms and the spine. Sit is not a restful
  // pose (restT stays 0), so without this the hands hold the combat-
  // guard baseline — arms braced forward on a sitter, the "goofy sit"
  // read. Two arm vocabularies matched to the two leg postures:
  // LOUNGER plants both palms on the ground behind the hips (the
  // lean-back sunset watch); KNEE-UP drapes the forearm over the
  // raised kneecap — wrist hanging loose past the cap — while the
  // other palm props the ground beside the trailing hip. THE PROP
  // LEAN: the torso tips back off the planted arms, profile-weighted
  // (front-on there is no screen-backward to lean along). Everything
  // blends on the caller-smoothed sit channel, so the hands travel to
  // the ground and back with the body — never a pop.
  if (sit > 0) {
    const kneeUpSit = rig.sitVariant === 1;
    let smx: number;
    let smy: number;
    let sox: number;
    let soy: number;
    if (chairSit) {
      // FURNITURE CLAIMS ITS OWN CARRIAGE. Chair and bench: both
      // hands settle onto the thighs just shy of the solved kneecaps
      // — the patient tavern sit. Throne: the fists ride out to the
      // scrolled armrest ends, spine regal-straight (the armrest line
      // is the painter's own: arms end ~0.33s off center, a forearm
      // above the cushion).
      if (rig.sitStyle === 'throne') {
        smx = rig.x + 0.33 * s;
        smy = hipY - 0.16 * s;
        sox = rig.x - 0.33 * s;
        soy = hipY - 0.16 * s;
      } else if (rig.sitStyle === 'saddle') {
        // THE PORT HAND: both fists settle onto the pommel the mount
        // painter anchored — near hand a knuckle ahead of the far so
        // the stack reads as a hold, never a clasp.
        const rx = rig.reinX ?? rig.x;
        const ry = rig.reinY ?? hipY - 0.12 * s;
        smx = rx + 0.03 * s;
        smy = ry - 0.01 * s;
        sox = rx - 0.03 * s;
        soy = ry + 0.015 * s;
      } else {
        const a = KNEE_SCRATCH[0]!;
        const b = KNEE_SCRATCH[1]!;
        // Main hand takes the camera-side knee so the near forearm
        // paints over the lap; the off hand rests on the far thigh.
        const aNear = a.x >= rig.x;
        const near = aNear ? a : b;
        const far = aNear ? b : a;
        const mainNear = (Math.sign(sideS) || 1) >= 0;
        const mk = mainNear ? near : far;
        const ok = mainNear ? far : near;
        smx = mk.x + (mk.x - rig.x) * 0.1;
        smy = mk.y - 0.045 * s;
        sox = ok.x + (ok.x - rig.x) * 0.1;
        soy = ok.y - 0.045 * s;
      }
    } else if (kneeUpSit) {
      // The raised knee is the leg the IK bent hardest (smallest
      // hip→foot span) — drape the same-side fist over it.
      const a = KNEE_SCRATCH[0]!;
      const b = KNEE_SCRATCH[1]!;
      const rk = a.d <= b.d ? a : b;
      const kneeSide = Math.sign(rk.x - rig.x) || 1;
      const drapeX = rk.x + kneeSide * 0.05 * s * wS;
      const drapeY = rk.y + 0.05 * s;
      const propX = rig.x - kneeSide * tw * 1.35 * wS - fx * 0.1 * s * wS;
      const propY = hipY + 0.11 * s;
      const mainDrapes = kneeSide === (Math.sign(sideS) || 1);
      smx = mainDrapes ? drapeX : propX;
      smy = mainDrapes ? drapeY : propY;
      sox = mainDrapes ? propX : drapeX;
      soy = mainDrapes ? propY : drapeY;
    } else {
      // Both palms planted just outside and behind the hips.
      const backX = -fx * 0.13 * s * wS;
      smx = rig.x + sideS * tw * 1.5 * wS + backX;
      smy = hipY + 0.1 * s;
      sox = rig.x - sideS * tw * 1.5 * wS + backX;
      soy = hipY + 0.12 * s;
    }
    mainX += (smx - mainX) * sit;
    mainY += (smy - mainY) * sit;
    offX += (sox - offX) * sit;
    offY += (soy - offY) * sit;
    // Seated breath — the resting hands are never a freeze-frame.
    mainY += Math.sin(rig.nowMs * 0.0017) * 0.008 * s * sit;
    offY += Math.sin(rig.nowMs * 0.0017 + 1.4) * 0.008 * s * sit;
    // THE SEATED PLANT: the seat moved the FIST (to a knee, a prop
    // behind the hip, a chair arm) but a held blade used to keep its
    // STANDING carriage rake — from the new, low anchor that rammed
    // the steel through the shins and the floor, and read as a sword
    // floating beside empty hands (the user's screenshots). Seated, a
    // blade RESTS: it rotates to point from wherever the fist settled
    // toward the ground just outside the sitter — tip grounded beside
    // the body, the resting warrior's plant. Screen-plane, so the
    // fore relaxes home. The off blade plants on its own side.
    if (isSword) {
      const plantA = Math.atan2(
        rig.y - mainY,
        rig.x + (Math.sign(sideS) || 1) * 0.6 * s * wS - mainX,
      );
      heldAngle += angleDelta(heldAngle, plantA) * sit;
      mainFore += (1 - mainFore) * sit;
    }
    if (offBlade) {
      const plantO = Math.atan2(
        rig.y - offY,
        rig.x - (Math.sign(sideS) || 1) * 0.6 * s * wS - offX,
      );
      offBladeAngle += angleDelta(offBladeAngle, plantO) * sit;
      offFore += (1 - offFore) * sit;
    }
    // THE PROP LEAN belongs to the floor sit's planted arms; a chair
    // sit keeps the spine over the hips (the throne dead-upright).
    if (!chairSit) lean += -sideS * profileK * (kneeUpSit ? 0.1 : 0.2) * sit;
  }

  // Casting: the free hand punches a push toward the aim. The punch
  // amount is remembered so the staff's two-hand claim below yields
  // the fist for exactly as long as the spell owns it.
  let castPunch = 0;
  if (ogr && rig.pose === PoseState.Cast) {
    // THE BELLOWS DRAW (docs/ogres-plan.md) — the giant cast, whole.
    // The human cast is a one-hand jab; on a body whose art is a
    // VOICE it read as nothing. The giant casts with everything it
    // has, on one analytic curve in two movements:
    //   THE FILL (0..0.55): both fists rise wide and BACK, elbows
    //   flared past the silhouette, while the chest flare (already
    //   riding this beat in body and head) swells the bellows and
    //   the jaw tips into the roar.
    //   THE THROW (0.55..1): both fists drive down-forward along the
    //   PROJECTED aim at gut width — the shout, the heave, and the
    //   verse are all the same push. A self-aimed art (the haunch
    //   gnaw) throws to the JAW instead: the meal, drawn honestly.
    const T = Math.min(1, rig.poseT);
    const fill = Math.min(1, T / 0.55);
    const fillE = fill * fill * (3 - 2 * fill);
    const throwT = Math.max(0, (T - 0.55) / 0.45);
    const throwE = throwT * throwT * (3 - 2 * throwT);
    castPunch = throwE;
    // Self-aim: the kit's own mouth-ward verse (aim collapses home).
    const selfCast = Math.hypot(aim.px, aim.py) < 0.2;
    // THE FILL pose: fists beside the chest, wide and high and back.
    const fillX = 0.98 * tw;
    const fillUpY = armY - 0.16 * s;
    const backX = -fx * 0.1 * s;
    // THE THROW pose: a double-handed drive down the PROJECTED aim —
    // fists split on the aim's screen perpendicular AND staggered
    // along it (near fist short, far fist long), so the push reads as
    // two hands at every band instead of stacking into folded arms at
    // the camera lines. Or, self-aimed, up to the jaw.
    const throwR = 0.46 * s;
    for (const armSide of [1, -1] as const) {
      const spread = armSide * 0.5 * tw;
      const stagAim = armSide * 0.07 * s; // fore-aft stagger down the aim
      let tx: number;
      let ty: number;
      if (throwT <= 0) {
        tx = rig.x + armSide * fillX * wS + backX;
        ty = fillUpY;
      } else if (selfCast) {
        // The gnaw: both fists converge on the jaw line.
        tx = rig.x + armSide * 0.3 * tw * wS + fx * 0.08 * s;
        ty = armY - (0.3 + 0.1 * throwE) * s;
      } else {
        tx =
          rig.x +
          (armSide * fillX * wS + backX) * (1 - throwE) +
          (aim.px * (throwR + stagAim) * wS - aim.py * spread) * throwE;
        ty =
          fillUpY * (1 - throwE) +
          (armY + aim.py * (throwR + stagAim) + aim.px * spread * 0.55 + 0.08 * s) * throwE;
      }
      // The fill eases in from wherever the hands were resting.
      if (armSide === 1) {
        mainX += (tx - mainX) * fillE;
        mainY += (ty - mainY) * fillE;
      } else {
        offX += (tx - offX) * fillE;
        offY += (ty - offY) * fillE;
      }
    }
    // A club-armed caster keeps the fist but the haft rides the
    // motion: tip swept back through the fill, leveled on the throw.
    if (weapon) {
      heldAngle += angleDelta(heldAngle, -Math.PI / 2 - fx * 0.5) * fillE * (1 - throwE);
      if (throwT > 0 && !selfCast) {
        heldAngle += angleDelta(heldAngle, aim.angle) * throwE * 0.6;
        mainFore += (aim.fore - mainFore) * throwE * 0.6;
      }
    }
  } else if (rig.pose === PoseState.Cast && rig.poseT < 0.5) {
    const u = Math.sin((rig.poseT / 0.5) * Math.PI);
    castPunch = u;
    // The punch is a radial reach down the aim — it rides the ground
    // ellipse like every other reach (a north cast no longer punches
    // at the sky, a south cast no longer at the boots).
    offX = rig.x + aim.px * (0.14 + 0.18 * u) * s * wS;
    offY = armY + aim.py * (0.14 + 0.18 * u) * s;
    // THE PRESENT: a staff LEVELS onto the aim line for the beat of
    // the spell — crown at the mark, flaring — instead of hanging on
    // the guard angle while the free hand does all the talking. The
    // aim line is the PROJECTED one, and the crown honestly shortens
    // as it points into the scene (the fore blend rides the same u).
    if (isStaff) {
      heldAngle += angleDelta(heldAngle, aim.angle) * u;
      mainFore += (aim.fore - mainFore) * u;
      mainX += aim.px * 0.08 * s * wS * u;
      mainY += aim.py * 0.08 * s * u;
    }
  }

  // Archery: the FRONT hand holds the bow at arm's length toward the
  // aim; the string hand physically hauls the string back to the cheek.
  // THE DRAW RIDES THE ELLIPSE (arms-v3 Phase 3): the bow anchor is a
  // radial reach down the aim, so it projects — a south draw holds the
  // bow low-forward at the belt line instead of down at the boots, a
  // north draw high-forward instead of at the zenith. The string haul
  // runs along the aim's UNIT screen direction, and the elevation read
  // comes from the arrow's fore + the anchor, the way the trail
  // already tells depth. (The true fire direction is the server's —
  // this is the drawn POSE.)
  let bowX: number | null = null;
  let bowY = 0;
  let bowPull = 0;
  // THE DRAWN LIFELINE: at the exact camera lines the aim ellipse
  // degenerates to a screen vertical — the lab's verdict cells: a
  // south draw aimed the arrow between the archer's own feet, a north
  // draw straight at the zenith. The drawn POSE rides a lifeline-
  // biased yaw (the same eased-side bias every long carry takes, so
  // it mirrors and turns continuously and profiles stay exact) — a
  // south draw now holds low-forward, a north draw high-forward. The
  // true fire direction is the server's; this is only the pose.
  let aimDraw = aim;
  if (drawing || loosing) {
    aimDraw = projectAim(lifelineYaw(face));
    const bd = reach * 1.2;
    bowX = rig.x + aimDraw.px * bd * wS;
    bowY = armY + aimDraw.py * bd;
    if (loosing) {
      const t = rig.poseT;
      bowX -= aimDraw.ux * 0.05 * s * (1 - t); // recoil kick back into the grip
      bowPull = 0.03 * s;
      mainX = bowX - aimDraw.ux * 0.07 * s; // string hand snapped forward
      mainY = bowY + 0.02 * s;
    } else {
      bowPull = (0.08 + 0.3 * drawT) * s;
      mainX = bowX - aimDraw.ux * bowPull;
      mainY = bowY + (shoulderY + 0.06 * s - bowY) * (0.35 * drawT);
      if (drawT >= 0.97) {
        // Full-draw tension tremble — the whole aim quivers with
        // effort, perpendicular to the PROJECTED aim line.
        const tr = Math.sin(rig.nowMs * 0.05) * 0.008 * s;
        mainX += -aimDraw.uy * tr;
        mainY += aimDraw.ux * tr;
        bowX += -aimDraw.uy * tr * 0.5;
        bowY += aimDraw.ux * tr * 0.5;
      }
    }
    offX = bowX;
    offY = bowY;
  }

  // ---- the sheathe: one blend moves the weapons between hand and body.
  // Blades stow to the belt, bows and staffs sling across the back; the
  // spots live in sheath.ts (pure, test-pinned) and ride hipY/shoulderY,
  // so they duck with a crouch and settle with a sit for free.
  // The worn kind reads through the same one detection as the held —
  // the stow solve and the hand solve can never disagree about class.
  const wornKind = wornDef !== undefined ? wieldClass(wornDef.id) : 'none';
  const wornGreat = wornKind === 'great';
  const wornBow = wornKind === 'bow';
  const wornStaff = wornKind === 'staff';
  const wornPole = wornKind === 'pole';
  const wornBack = wornBow || wornStaff || wornGreat || wornPole;
  let mainStow: { x: number; y: number; angle: number } | null = null;
  if (wornDef) {
    if (wornBack) {
      // stowBack speaks painter space directly: staff angle = grip→
      // crown along local +X (the greatblade slings the same, lower
      // and steeper), bow angle = the mirrored-sling law.
      const spot = stowBack(
        wornBow ? 'bow' : wornGreat ? 'great' : wornPole ? 'pole' : 'staff',
        sideS,
      );
      mainStow = {
        x: rig.x - fx * 0.14 * s + spot.dx * s * wS,
        y: shoulderY + spot.dy * s,
        angle: spot.angle,
      };
    } else {
      // The lie-back law (a stowed blade rests along the ground
      // beside a sitter) belongs to the FLOOR sit — on furniture the
      // hips ride the seat and the scabbard hangs upright at the hip.
      const spot = stowBlade('main', sideS, sideW, chairSit ? sit * 0.15 : sit);
      mainStow = { x: rig.x + spot.dx * s * wS, y: hipY + spot.dy * s, angle: spot.angle };
    }
  }
  let offStow: { x: number; y: number; angle: number } | null = null;
  if (offWorn) {
    const spot = stowBlade('off', sideS, sideW, chairSit ? sit * 0.15 : sit);
    offStow = { x: rig.x + spot.dx * s * wS, y: hipY + spot.dy * s, angle: spot.angle };
  }
  if (sheath > 0 && mainStow) {
    const ph = sheathePhases(sheath);
    if (!stowed) {
      // The reach: hand and weapon travel together to the stow spot,
      // the blade rolling to its seated rake on the way in. Falling
      // (a draw) plays the same path out of the scabbard.
      mainX += (mainStow.x - mainX) * ph.grabK;
      mainY += (mainStow.y - mainY) * ph.grabK;
      heldAngle += angleDelta(heldAngle, mainStow.angle) * ph.grabK;
      staffGrip += (0.5 - staffGrip) * ph.grabK;
      if (offStow) {
        offX += (offStow.x - offX) * ph.grabK;
        offY += (offStow.y - offY) * ph.grabK;
        offBladeAngle += angleDelta(offBladeAngle, offStow.angle) * ph.grabK;
      }
    } else {
      // The weapon is body gear now — the empty hands walk home from
      // the spot they left it (or reach back toward it, drawing).
      mainX = mainStow.x + (mainX - mainStow.x) * ph.homeK;
      mainY = mainStow.y + (mainY - mainStow.y) * ph.homeK;
      if (offStow) {
        offX = offStow.x + (offX - offStow.x) * ph.homeK;
        offY = offStow.y + (offY - offStow.y) * ph.homeK;
      }
    }
  }

  // ---- THE QUARTERSTAFF GUARD. Out of rest the off hand belongs ON
  // the wood ahead of the main fist, so every staff sweep and thrust
  // is a two-handed cut — but ONLY in the fight: the rest ladder never
  // claims it (a run is a one-hand balance carry; the user's verdict).
  // The claim is placed AFTER the sheathe blend so a stowing staff
  // releases the second fist, and it yields to everything with a
  // better right to the hand: the cast punch (castPunch), the seat
  // (sit), a busy off blade, the bow, and the shield's own claim
  // below, which lands after and wins.
  if (isStaff && !offBlade && !drawing && !loosing) {
    let claim = (1 - restSettle) * (1 - sit) * (1 - castPunch);
    claim *= 1 - sheathePhases(sheath).grabK;
    if (claim > 0) {
      // The choke rides the drawn shaft — mainFore keeps the second
      // fist on the foreshortened wood at the camera-line facings.
      // Screen-space along the drawn art (heldAngle is post-squash):
      // no wScale here, or the fist slides off the wood at N/S.
      const chokeS = STAFF_GUARD_CHOKE_S * mainFore;
      const cx = mainX + Math.cos(heldAngle) * chokeS * s;
      const cy = mainY + Math.sin(heldAngle) * chokeS * s + 0.02 * s;
      offX += (cx - offX) * claim;
      offY += (cy - offY) * claim;
    }
  }

  // ---- THE SECOND FIST (the great school). Both hands belong to the
  // haft — but where the staff chokes the off hand up FRONT of the
  // main fist, great steel takes the pommel end BEHIND it: the true
  // two-hand hold. Combat welds it on (out of rest, through every
  // strike); the run's shoulder carry calls it back too (greatWield's
  // offClaim) — nobody sprints with six feet of iron in one fist.
  // Same yield order as the staff guard: cast punch, seat, sheathe,
  // and the shield claim below would win (a 2H stows the offhand, so
  // in practice the hand is always free to take the grip).
  if (isGreat && !offBlade && !drawing && !loosing) {
    let claim = Math.max(1 - restSettle, greatRunClaim);
    claim *= (1 - sit) * (1 - castPunch);
    claim *= 1 - sheathePhases(sheath).grabK;
    if (claim > 0) {
      // Same screen-space law as the staff choke: the pommel fist
      // sits ON the drawn grip at every facing.
      const chokeS = GREAT_POMMEL_CHOKE_S * mainFore;
      const cx = mainX - Math.cos(heldAngle) * chokeS * s;
      const cy = mainY - Math.sin(heldAngle) * chokeS * s + 0.03 * s;
      offX += (cx - offX) * claim;
      offY += (cy - offY) * claim;
    }
  }

  // ---- THE WAR GRIP (the reaching school's second fist). Both hands
  // belong on a war-gripped haft: the drive hand rides BEHIND the main
  // fist, near the butt, where the school's own cuts weld it
  // (ResolvedStrike.weldS — negative is behind). Combat welds it on,
  // and the port's run calls it back too (poleWield's offClaim). THE
  // COUCH NEVER ARGUES: poleCouched gates the whole claim off, so a
  // shielded off hand never leaves its boards, mid-strike included.
  if (isPole && !poleCouched) {
    let claim = Math.max(1 - restSettle, poleRunClaim);
    claim *= (1 - sit) * (1 - castPunch);
    claim *= 1 - sheathePhases(sheath).grabK;
    if (claim > 0) {
      // Same screen-space law as the staff and great chokes: the drive
      // fist sits ON the drawn haft at every facing.
      const weldS = (strikeRes?.weldS ?? POLE_WAR_WELD_S) * mainFore;
      const cx = mainX + Math.cos(heldAngle) * weldS * s;
      const cy = mainY + Math.sin(heldAngle) * weldS * s + 0.03 * s;
      offX += (cx - offX) * claim;
      offY += (cy - offY) * claim;
    }
  }

  // ---- THE SHIELD LEADS THE ARM. Everything above solved a HAND and
  // hung gear off it; a shield inverts that. The plane is placed first
  // — upright, in front of the chest, square to the threat — and the
  // off hand is then dragged to the grip behind it, elbow braced along
  // the boards. That inversion is the whole difference between "a
  // board taped to a wrist" and a body standing behind a wall.
  // An archer's off hand is busy holding the bow: the shield sits the
  // volley out (the existing law), and the arm keeps its own carriage.
  const shieldArcher = drawing || loosing;
  let shieldFr: ShieldFrame | null = null;
  if (shieldSt && !shieldArcher) {
    // The finisher's drive, normalized: the shield rams with the body.
    const thrustK =
      meleeStage === 2
        ? Math.max(0, Math.min(1, (thrustR ?? (ice ? ice.r : 0)) / 0.55))
        : 0;
    shieldFr = solveShield(shieldSt, {
      x: rig.x,
      hipY,
      shoulderY,
      s,
      wS,
      fx,
      fy,
      sideS,
      restSettle,
      swing: swS,
      runF: rig.runF,
      poleX: rig.poleX,
      poleY: rig.poleY,
      poleStrength: rig.poleStrength,
      crouch,
      sling: Math.max(0, Math.min(1, (sheath - STOW_HANDOFF) / (1 - STOW_HANDOFF))),
      melee: meleeStage,
      poseT: rig.poseT,
      thrust: thrustK,
      nowMs: rig.nowMs,
    });
    // The fist closes on the grip — the arm now answers to the shield.
    // Slung, the hand lets go and walks home to its own hang.
    const claim = 1 - shieldFr.sling;
    offX += (shieldFr.gripX - offX) * claim;
    offY += (shieldFr.gripY - offY) * claim;
  }
  // ===================== THE ONE MOUTH ENDS =====================
  // Everything below READS the assembled channels; nothing writes.

  // THE WAKE IS THE BLADE'S — the swoosh is a tapered ribbon built by
  // re-sampling the SAME resolved arc the fist and the steel ride, so
  // it passes through the blade at every frame of the sweep (the old
  // crescent was a fixed-radius ellipse centered on the torso — a
  // hula hoop that crossed the face at north and floated free at
  // south). The ribbon spans the blade's leading half: full width at
  // the leading edge, pinched to the tip line at the tail — the
  // classic hand-keyed smear. Two voices, the art style's pair: a
  // broad soft wash and a hot core hugging the last of the tip path.
  const drawWake = (wk: StrikeWake, k: number): void => {
    const a = Math.max(0, Math.min(1, wk.alpha)) * k;
    if (a <= 0 || wk.samples.length < 2) return;
    const pts = wk.samples.map((sm) => {
      const hx = rig.x + sm.dx * s * wS;
      const hy = armY + sm.dy * s;
      const cA = Math.cos(sm.angle);
      const sA = Math.sin(sm.angle);
      return {
        tx: hx + cA * wk.tipS * s * sm.fore,
        ty: hy + sA * wk.tipS * s * sm.fore,
        mx: hx + cA * wk.midS * s * sm.fore,
        my: hy + sA * wk.midS * s * sm.fore,
      };
    });
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.tx, pts[0]!.ty);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i]!.tx, pts[i]!.ty);
    for (let i = n - 1; i >= 0; i--) {
      // The tail pinches: the inner edge walks out to meet the tip
      // line as the sample ages, so the ribbon dies to a point.
      const age = 1 - i / (n - 1);
      ctx.lineTo(
        pts[i]!.mx + (pts[i]!.tx - pts[i]!.mx) * age,
        pts[i]!.my + (pts[i]!.ty - pts[i]!.my) * age,
      );
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(244, 239, 228, ${0.22 * a})`;
    ctx.fill();
    // The hot core: the freshest stretch of the tip path — alive only
    // through the snap (its own envelope), so a landed cut never
    // leaves a glow-stick lying where the blade stopped.
    const coreA = a * wk.core;
    if (coreA > 0.02) {
      const start = Math.max(0, n - 4);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.68 * coreA})`;
      ctx.lineWidth = 0.05 * s * (0.7 + 0.3 * k);
      ctx.beginPath();
      ctx.moveTo(pts[start]!.tx, pts[start]!.ty);
      for (let i = start + 1; i < n; i++) ctx.lineTo(pts[i]!.tx, pts[i]!.ty);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  };
  if (mainWake && (weapon?.weapon?.style === 'onehand' || weapon?.weapon?.style === 'twohand' || isStaff)) {
    drawWake(mainWake, 1);
  }
  if (echoWk && offBlade) drawWake(echoWk, 0.7);
  // THE CONTACT SNAP: a two-breath starburst at the blade tip on the
  // impact frame — the cut's own landing word, riding the same arc
  // (the target's hit sparks are main.ts's; this one belongs to the
  // swing and fires whether or not anything was there to catch it).
  // Gated on a held blade exactly like the wake above: a bare-handed
  // rig has no tip — the phantom tip point lands OFF the body (below
  // the feet at some facings) and the fan reads as a detached glitch.
  if (
    strikeRes &&
    strikeSchool &&
    mainWake &&
    (meleeStage === 0 || meleeStage === 1) &&
    (weapon?.weapon?.style === 'onehand' || weapon?.weapon?.style === 'twohand' || isStaff)
  ) {
    const P = schoolPhases(strikeSchool);
    const u = (rig.poseT - P.impact) / 0.09;
    if (u >= 0 && u <= 1) {
      const hx = rig.x + strikeRes.fistDX * s * wS;
      const hy = armY + strikeRes.fistDY * s;
      const tipX = hx + Math.cos(strikeRes.bladeAngle) * mainWake.tipS * s * strikeRes.fore;
      const tipY = hy + Math.sin(strikeRes.bladeAngle) * mainWake.tipS * s * strikeRes.fore;
      const fade = 1 - u;
      const rr = 0.08 * s + 0.1 * s * u;
      // A spark FAN thrown forward off the edge — three short rays
      // spread around the blade's own direction, never a symmetric
      // cross (a cross at the feet read as a dropped white knife).
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
      ctx.lineWidth = 0.03 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        const a2 = strikeRes.bladeAngle + i * 0.55;
        ctx.moveTo(tipX + Math.cos(a2) * rr * 0.5, tipY + Math.sin(a2) * rr * 0.5 * WIELD_GROUND_K);
        ctx.lineTo(tipX + Math.cos(a2) * rr, tipY + Math.sin(a2) * rr * WIELD_GROUND_K);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  if (meleeStage === 2 && isGreat) {
    // THE MOUNTAIN FALLS leaves its own mark: a vertical smash streak
    // dropping onto the strike point through the drive, dying through
    // the buried hold — the fall, drawn.
    const P = GREAT_FINISHER_PHASES;
    const t = rig.poseT;
    if (t >= P.hold + 0.02 && t < P.buried + 0.06) {
      const fade = 1 - Math.max(0, (t - P.drive) / (P.buried + 0.06 - P.drive));
      const reach = Math.min(weapon?.weapon?.range ?? 2.4, 2.8) * 0.3 * s;
      const tx = rig.x + aim.px * reach * wS;
      const ty = armY + aim.py * reach + 0.24 * s;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.3 * fade})`;
      ctx.lineWidth = 0.24 * s;
      ctx.beginPath();
      ctx.moveTo(rig.x + fx * 0.1 * s, armY - 0.75 * s);
      ctx.lineTo(tx, ty - 0.15 * s);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
      ctx.lineWidth = 0.09 * s;
      ctx.beginPath();
      ctx.moveTo(rig.x + fx * 0.2 * s, armY - 0.45 * s);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // THE GROUND ANSWERS: the bury drives a shock ring out across the
    // GROUND PLANE — an expanding ellipse under the strike point,
    // foreshortened by the one ground law. Nothing sells the world's
    // floor like the floor itself reacting.
    if (t >= P.drive && t < P.buried + 0.1) {
      const q = Math.min(1, (t - P.drive) / (P.buried + 0.1 - P.drive));
      const reach2 = Math.min(weapon?.weapon?.range ?? 2.4, 2.8) * 0.3 * s;
      const gx2 = rig.x + aim.px * reach2 * wS;
      const gy2 = armY + aim.py * reach2 + 0.3 * s;
      const rr = (0.12 + 0.55 * q) * s;
      const fade2 = (1 - q) * (1 - q);
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.5 * fade2})`;
      ctx.lineWidth = 0.05 * s * (1 - 0.5 * q);
      ctx.beginPath();
      ctx.ellipse(gx2, gy2, rr, rr * WIELD_GROUND_K, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.35 * fade2})`;
      ctx.lineWidth = 0.028 * s;
      ctx.beginPath();
      ctx.ellipse(gx2, gy2, rr * 0.72, rr * 0.72 * WIELD_GROUND_K, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (meleeStage === 2 && weapon?.weapon?.style === 'onehand') {
    // The finisher streak, on the shared finisher clock: alive from
    // the loosing of the drive, dying through the buried hold. The
    // icepick's streak runs down its plunge line to the mark; the
    // thrust's straight down the aim.
    const P = FINISHER_PHASES;
    const t = rig.poseT;
    if (t >= P.hold + 0.02 && t < P.buried + 0.06) {
      const fade = 1 - Math.max(0, (t - P.drive) / (P.buried + 0.06 - P.drive));
      const r1 = (weapon.weapon.range ?? 1.7) * 0.33 * s;
      const tx = ice ? rig.x + aim.px * 0.6 * s * wS : rig.x + aim.px * r1;
      const ty = ice ? armY + aim.py * 0.6 * s + 0.26 * s : armY + aim.py * r1;
      const sx = ice ? rig.x + aim.px * 0.08 * s : rig.x + aim.px * 0.15 * s;
      const sy = ice ? armY + aim.py * 0.08 * s - 0.2 * s : armY + aim.py * 0.15 * s;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(244, 239, 228, ${0.3 * fade})`;
      ctx.lineWidth = 0.2 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (tx - sx) * 0.85, sy + (ty - sy) * 0.85);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 252, 240, ${0.7 * fade})`;
      ctx.lineWidth = 0.08 * s;
      ctx.beginPath();
      ctx.moveTo(sx + (tx - sx) * 0.2, sy + (ty - sy) * 0.2);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  // Shoulders slide smoothly along the shoulder line toward each hand
  // (billboard-friendly: continuous, never pops). An archer anchors the
  // string arm on the rear shoulder, the bow arm on the front.
  const sleeve = rig.hurt ? '#ffffff' : (bodySt?.sleeve ?? shade(bodyColor, -12));
  const archer = drawing || loosing;
  // Shoulders: slide along the shoulder bar with an active swing, but
  // settle onto fixed anatomical anchors at rest — a hanging arm hangs
  // from its own shoulder, not from wherever the last swing left it.
  let mainShX = archer
    ? rig.x - fx * tw * 0.7 * wS
    : rig.x + Math.cos(mainAngle) * tw * 0.8 * wS;
  let offShX = archer
    ? rig.x + fx * tw * 0.8 * wS
    : rig.x + Math.cos(offAngle) * tw * 0.8 * wS;
  // Seated counts as fully settled: arms hang (or plant) from their
  // anatomical roots even though Sit is not a "restful" pose.
  const settleK = Math.max(restSettle, sit);
  // THE TRAILING ELBOW: a settled arm flares its elbow to its own
  // side of the body — but on the move both elbows swing BACK along
  // the travel. A runner's elbows trail; they never lead. (The rest
  // flare left the main elbow pointing AT the travel direction on a
  // profile run — the chicken-wing read the user caught.) Blended on
  // the gait so the flare returns the moment the body stops — and
  // gated on ALIGNMENT: trailing along the travel only makes sense
  // when the body travels the way it faces. Strafing or backpedaling
  // (facing one way, walking another) the arms belong to the BODY's
  // frame, and an un-gated travel pole folded the elbows inside-out
  // (the user's broken-elbow screenshot). The pole math itself lives
  // in wield.ts (settleElbowPole) with THE POLE NEVER VANISHES law:
  // the trail claims the flare only in proportion to |poleX|, so a
  // depth-axis run keeps its outboard elbows instead of collapsing
  // the preference to noise.
  const trailB =
    Math.min(1, rig.poleStrength) *
    (0.3 + 0.7 * rig.runF) *
    restSettle *
    Math.max(0, rig.align);
  const mainSettlePoleX = settleElbowPole(sideS, rig.poleX, trailB);
  const offSettlePoleX = settleElbowPole(-sideS, rig.poleX, trailB);
  // THE CROSSING LOCKS THE ELBOW: mid side-ease (|sideS| < 1) the
  // flare pole is collapsing through zero — every settled frame in
  // that window is degenerate, so the remembered sides hold outright
  // and the flip lands once, after the hands arrive. Rest carries
  // only: strikes and draws own their elbows dynamically.
  // THE FLIP EARNS ITS HYSTERESIS (arms-v3 Phase 4): every layer flag
  // below rides the one banded resolver on the caller's depth memory.
  // The bands straddle the old thresholds while leaving every CARDINAL
  // facing outside the dead zone — a settled heading resolves exactly
  // as the raw threshold did (det-pinned), but a slow arc across a
  // boundary now flips each layer exactly ONCE instead of flickering
  // with every heading wobble.
  const settleHalf = bandFlag(mem, 'settleHalf', restSettle, 0.55, 0.45);
  const awayDeep = bandFlag(mem, 'awayDeep', -fy, 0.42, 0.28);
  const fwdShoulder = bandFlag(mem, 'fwdShoulder', fy, 0.14, 0.02);
  const awayShoulder = bandFlag(mem, 'awayShoulder', -fy, 0.14, 0.02);
  const runTrail = bandFlag(mem, 'runTrail', rig.runF, 0.42, 0.28);
  const elbowEaseHold = settleHalf && Math.abs(sideS) < 0.98;
  // THE TURNED BAR: side-on the settle anchors tuck toward the body's
  // centerline (shoulderTuckK) and stagger along the facing — leading
  // arm a half-step ahead, trailing arm behind — the upper body's
  // answer to the profile stance the feet already take. The sockets
  // read the SAME tuck (ONE SPREAD LAW), so cap and root collapse as
  // one girdle.
  const barTuck = shoulderTuckK(fx);
  const barStag = shoulderStagK(fx) * tw;
  mainShX +=
    (rig.x + sideS * tw * SHOULDER_SETTLE_K * barTuck * wS + barStag * 0.06 - mainShX) * settleK;
  offShX +=
    (rig.x - sideS * tw * SHOULDER_SETTLE_K * barTuck * wS - barStag * 0.12 - offShX) * settleK;
  // ---- THE LIVING SHOULDER: the roots are not pins. The girdle
  // breathes on THE SAME CLOCK the hands ride (arms-v3 Phase 5's
  // standing breath, phases matched, quieter amplitude — the hand's
  // drift now visibly ORIGINATES at its own shoulder), and on the
  // move each root rolls with the stride, counter-phased across the
  // bar the way a real shoulder line seesaws over the footfalls.
  // Everything worn ON the root — the arm and the pauldron alike —
  // consumes these solved Ys, so shoulder, sleeve and cap move as
  // one body instead of a cap bolted over a living arm.
  const mainSideSign = Math.sign(sideS) || 1;
  const rootRest = (1 - Math.min(1, rig.poleStrength)) * restSettle * (1 - sit);
  const rootB = Math.sin(rig.nowMs * 0.0019) * rootRest;
  const rootB2 = Math.sin(rig.nowMs * 0.0019 + 1.1) * rootRest;
  const rootSw = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
  const rootRoll = 0.012 * s * rig.runF * Math.min(1, rig.poleStrength);
  let mainShY = shoulderY + rootB * 0.008 * s + rootSw * rootRoll * mainSideSign;
  let offShY = shoulderY + rootB2 * 0.009 * s - rootSw * rootRoll * mainSideSign;
  // THE GIRDLE RIDES THE STOOP (the stoop lane): the hunched dialects'
  // torso paints rotated about the hip by the standing pitch — so the
  // shoulder roots take the SAME rotation, and the arms hang from the
  // girdle the painter actually draws. Before this, the roots kept the
  // upright station: at the profiles they sat INSIDE the head hull and
  // the arms hung from behind the leaned body (the audit's green-dot-
  // in-the-magenta-circle conviction, both species, every profile
  // band). One truth: the same pitch·fx·(1−sit) the paint lean adds.
  if (stoop) {
    const sl = stoop.pitch * fx * (1 - sit);
    const cs = Math.cos(sl);
    const sn = Math.sin(sl);
    const rootRot = (px: number, py: number): { x: number; y: number } => {
      const dx = px - rig.x;
      const dy = py - hipY;
      return { x: rig.x + cs * dx - sn * dy, y: hipY + sn * dx + cs * dy };
    };
    const mR = rootRot(mainShX, mainShY);
    const oR = rootRot(offShX, offShY);
    mainShX = mR.x;
    mainShY = mR.y;
    offShX = oR.x;
    offShY = oR.y;
  }
  // THE FIST IS ONE FLESH (read-only derivation, post-assembly): the
  // arm solve clamps its chord to the anatomy (solveLimbInto's
  // L·2·stretch), so the drawn mitt can stop SHORT of the requested
  // hand target — and the held weapon, anchored on the raw target,
  // floated past the hand (the walk/run "gripping the blade" and the
  // detached-hilt reads). The weapon paints at the SAME clamped fist
  // the arm ends on: identical formula, identical roots, so steel and
  // mitt are one point by construction. Inside reach this is the
  // identity — strikes and draws pass through untouched.
  const fistClamp = (
    rx: number,
    ry: number,
    tx: number,
    ty: number,
  ): { x: number; y: number } => {
    const dx2 = tx - rx;
    const dy2 = ty - ry;
    const d2 = Math.hypot(dx2, dy2);
    const max2 = ARM_LEN * s * 2 * 1.08;
    if (d2 <= max2) return { x: tx, y: ty };
    const k2 = max2 / d2;
    return { x: rx + dx2 * k2, y: ry + dy2 * k2 };
  };
  const mainFistPt = fistClamp(mainShX, mainShY, mainX, mainY);
  const offFistPt = fistClamp(offShX, offShY, offX, offY);
  if (RIG_DEBUG.on) {
    RIG_DEBUG.x = rig.x;
    RIG_DEBUG.hipY = hipY;
    RIG_DEBUG.shoulderY = shoulderY;
    RIG_DEBUG.s = s;
    RIG_DEBUG.tw = tw;
    RIG_DEBUG.wS = wS;
    RIG_DEBUG.dir = rig.dir;
    RIG_DEBUG.mainShX = mainShX;
    RIG_DEBUG.mainShY = mainShY;
    RIG_DEBUG.offShX = offShX;
    RIG_DEBUG.offShY = offShY;
    RIG_DEBUG.anchorMainX =
      rig.x + sideS * tw * SHOULDER_SETTLE_K * barTuck * wS + barStag * 0.06;
    RIG_DEBUG.anchorOffX =
      rig.x - sideS * tw * SHOULDER_SETTLE_K * barTuck * wS - barStag * 0.12;
    RIG_DEBUG.armY = armY;
    RIG_DEBUG.mainFistX = mainX;
    RIG_DEBUG.mainFistY = mainY;
    RIG_DEBUG.offFistX = offX;
    RIG_DEBUG.offFistY = offY;
    RIG_DEBUG.arms.length = 0;
    RIG_DEBUG.sockets.length = 0;
  }
  // THE PIERCED CARRY: a LONG rest carry crossing the body no longer
  // throws the WHOLE weapon (and the fist that holds it) behind the
  // torso — the shaft SPLITS at the body line. The far half paints
  // behind the body, the near half and the fist stay in front, so a
  // trailing staff reads as passing THROUGH the space beside the hips
  // — never as "held behind the back" (the user's south-sprint
  // verdict on the old whole-weapon flip). The seam hides under the
  // body/fist mass by construction, exactly the split-the-shaft
  // technique the perspective grammar was built on. Strikes never
  // split: every band gates on the settle, and a strike drops the
  // settle before anything moves. A mid-sheathe carry keeps its whole
  // layer too — the blend walks the weapon to the back, and clipping
  // a moving shaft would march the seam out from under the body.
  //
  // The staff's leveled run trail at a camera-facing heading: butt
  // half up-behind the shoulder, crown half (and the fist) in front
  // beside the hip. Gated on the run trail itself — a planted stick
  // and the combat guard stay whole, in front, where the business
  // end lives.
  const staffTrailSplit = isStaff && settleHalf && runTrail && fwdShoulder && sheath === 0;
  // The great shoulder rest lays the blade up-BACK over the trailing
  // shoulder at EVERY gait — so everywhere the camera can see the
  // body's FRONT (the toward-camera half AND the profiles), the
  // blade's distal half belongs behind the head and torso while the
  // hilt and both fists stay in front of the chest. Facing AWAY the
  // same rest lies across the BACK the camera is looking at —
  // greatRestFront keeps it whole and in front.
  const greatRestFront = isGreat && settleHalf && awayShoulder;
  const greatRestSplit = isGreat && settleHalf && !awayShoulder && sheath === 0;
  // Split stations in item-local units of s along the shaft (fist at
  // 0, business end +x): the staff parts just behind the fist — the
  // seam lives under the forearm — and the great parts past the
  // shoulder line, under the neck mass. A whisker of overlap between
  // the passes so the outline can never show a hairline gap.
  const SPLIT_EPS = 0.03;
  const STAFF_SPLIT_AT = -0.05;
  // AT THE FIST (the staff's own law, mirrored): the hilt, the pommel
  // and both fists stay front; EVERYTHING above the fist — cross and
  // blade — may hide behind the head and torso, so the shoulder rest
  // can never paint steel across the face (the user's screenshot
  // verdict on the 0.38 station, whose near segment crossed the eyes
  // at the toward-camera facings). A split seam only shows where body
  // mass paints BETWEEN the passes — over open air the two clipped
  // passes butt-join exactly — so the seam belongs inside the fist
  // mass, the one station guaranteed to be covered.
  const GREAT_SPLIT_AT = 0.02;
  /** Item-local x range (units of s) the FRONT pass keeps. */
  let splitNear: readonly [number, number] | null = null;
  /** Item-local x range the BEHIND pass keeps (painted pre-torso). */
  let splitFar: readonly [number, number] | null = null;
  if (staffTrailSplit) {
    splitNear = [STAFF_SPLIT_AT - SPLIT_EPS, 99];
    splitFar = [-99, STAFF_SPLIT_AT + SPLIT_EPS];
  } else if (greatRestSplit) {
    splitNear = [-99, GREAT_SPLIT_AT + SPLIT_EPS];
    splitFar = [GREAT_SPLIT_AT - SPLIT_EPS, 99];
  }
  // Aiming up-and-away still puts the whole gear layer behind the
  // body (the splits live on the toward-camera half — the bands are
  // exclusive by construction).
  // THE SWEEP EARNS ITS LAYER: mid-strike the layer decision belongs
  // to the RESOLVED ARC, not the facing bands — when the fist's world
  // yaw crosses to the away side, the weapon and the striking arm
  // paint behind the torso, so a cut through the north arc passes
  // BEHIND the head instead of slicing across the face. The band is
  // deterministic in the sweep (one crossing per arc, at the station
  // where the steel is most foreshortened), so it needs no hysteresis.
  const strikeSweepBehind = strikeRes !== null && strikeRes.depthSin < -0.32;
  // THE WORK EARNS ITS LAYER too: an away-facing chop, heave, or
  // hammer blow carries its tool and striking pair behind the torso —
  // the work engine's depthSin, same law as the sweep's.
  const workBehind = workRes !== null && workRes.depthSin < -0.32;
  const weaponBehind =
    (awayDeep && !greatRestFront && strikeRes === null) || strikeSweepBehind || workBehind;
  const cuff = bodySt?.sleeves === 'full' ? sleeve : undefined;
  const paintOffArm = (seg?: 'under' | 'over'): void => {
    // DUAL WIELD: the off blade is the real weapon, carried by the off
    // fist in its OWN grip — raised guard in combat, settling into its
    // full carriage (standard or reversed) at rest. It paints BEFORE
    // the arm — weapon, then fist, the main hand's layering — so the
    // mitt visibly wraps the hilt instead of the grip floating on top
    // of the hand.
    // THE FACE SANDWICH: an 'under' pass paints only the arm's root
    // half — hand-anchored gear (weapon, shield, straps) belongs to
    // the 'over' pass with the forearm that carries it.
    const offWeapon =
      offSt?.kind === 'weapon' && rig.offhandItem !== undefined && !archer && seg !== 'under';
    if (offWeapon && offSt) {
      drawHeldItem(ctx, rig.offhandItem!, offSt.color, offFistPt.x, offFistPt.y, offBladeAngle, s, rig, {
        ench: rig.offhandEnch,
        flip: offFlip,
        fore: offFore,
      });
    }
    // THE SHIELD'S OWN LAYER ORDER, and it is not the arm's. Turned
    // toward us, the boards cover the fist that holds them — arm, then
    // shield. Turned away, we are looking at the shield's BACK, and
    // the forearm is between us and it: shield first, then the arm,
    // then the enarmes struck back over the sleeve so the limb reads
    // as genuinely threaded through the straps.
    const shieldBehindArm = shieldFr !== null && shieldFr.seeBack;
    if (shieldSt && shieldFr && shieldBehindArm && seg !== 'under') {
      drawShield(ctx, shieldSt, shieldFr, rig.hurt, rig.nowMs);
    }
    // The elbow braces along the boards when a shield claims the arm,
    // and lets go again as the shield swings onto the back.
    const freePoleX =
      (archer ? fx * 0.2 : Math.cos(offAngle) * 0.4) * (1 - settleK) + offSettlePoleX * settleK;
    const claim = shieldFr ? 1 - shieldFr.sling : 0;
    const armPoleX = freePoleX + (shieldFr ? (shieldFr.poleX - freePoleX) * claim : 0);
    const armPoleY = 1 + (shieldFr ? (shieldFr.poleY - 1) * claim : 0);
    armSegPass = seg ?? null;
    const offTint = RIG_DEBUG.tintOff;
    const joints = drawArm(
      ctx,
      offShX,
      offShY,
      offX,
      offY,
      armPoleX,
      armPoleY,
      offTint ?? sleeve,
      offTint ?? skin,
      s,
      offTint ? undefined : cuff,
      offTint ? null : gloveSt,
      rig.hurt,
      skel,
      mem ? (mem.offElbow ??= { sign: 0 }) : undefined,
      elbowEaseHold,
      rig.nowMs,
      gno,
      gol,
      gob,
      ogr,
      skr,
      hob,
    );
    armSegPass = null;
    if (shieldSt && shieldFr && seg !== 'under') {
      if (shieldBehindArm) drawShieldStraps(ctx, shieldSt, shieldFr, rig.hurt);
      else drawShield(ctx, shieldSt, shieldFr, rig.hurt, rig.nowMs);
    }
    // Arm-carried offhand rides the solved forearm, same depth layer as
    // the arm itself so the strap never breaks. An archer's off hand is
    // busy holding the bow — the shield sits this one out.
    if (offSt && offSt.kind !== 'quiver' && !archer && !offWeapon && !shieldSt && seg !== 'under') {
      drawOffhandOnArm(ctx, offSt, joints, s, profileK, rig.hurt, rig.nowMs);
    }
  };
  // Back-mounted quiver. Depth follows the cape's facing law — behind
  // the torso when the player faces the camera, in front when they face
  // away. With a cape worn the RENDERER owns this call (drawBackGear),
  // layered over the cloth — gear straps OVER a cape, never under it.
  const quiverFront = offSt?.kind === 'quiver' && bandFlag(mem, 'slingFront', -fy, 0.22, 0.1);
  const paintQuiver = (): void => {
    if (!offSt || offSt.kind !== 'quiver' || rig.hasCape) return;
    drawQuiver(ctx, offSt, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt, rig.nowMs);
  };
  // ---- stowed weapons on the body. A sheathed BLADE wears its
  // scabbard: a leather sleeve covering the steel from guard to point,
  // dressed with the blade's own guard metal (locket at the mouth,
  // chape at the tip) so every bespoke sword keeps its identity while
  // visibly put away. The belt FROG — the loop that hangs the scabbard
  // from the belt — paints over the mouth: that strap is what
  // attaches the steel to the body instead of floating it at the hip.
  const paintScabbard = (spot: { x: number; y: number; angle: number }, itemId: string): void => {
    const bSt = bladeStyle(itemId, '#8d9299');
    if (!bSt) return; // tools hang bare on the frog — no sleeve
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle);
    const mouth = 0.035 * s;
    const tip = 0.045 * s + (bSt.len ?? 1) * 0.44 * s + 0.02 * s;
    const leather = rig.hurt ? '#ffffff' : '#453324';
    // The sleeve: widest at the mouth, tapering to a rounded point.
    ctx.fillStyle = leather;
    ctx.beginPath();
    ctx.moveTo(mouth, -0.055 * s);
    ctx.lineTo(tip - 0.06 * s, -0.034 * s);
    ctx.quadraticCurveTo(tip + 0.015 * s, 0, tip - 0.06 * s, 0.034 * s);
    ctx.lineTo(mouth, 0.055 * s);
    ctx.closePath();
    ctx.fill();
    if (!rig.hurt) {
      // Stitched seam down the center line — worn leather, not a slab.
      ctx.strokeStyle = '#5d4732';
      ctx.lineWidth = Math.max(1, 0.014 * s);
      ctx.beginPath();
      ctx.moveTo(mouth + 0.05 * s, 0);
      ctx.lineTo(tip - 0.07 * s, 0);
      ctx.stroke();
      // Furniture in the blade's own guard metal: the locket banding
      // the mouth, the chape capping the point.
      const metal = bSt.guardColor ?? '#4a4554';
      ctx.fillStyle = metal;
      ctx.fillRect(mouth, -0.058 * s, 0.042 * s, 0.116 * s);
      ctx.beginPath();
      ctx.moveTo(tip - 0.075 * s, -0.037 * s);
      ctx.quadraticCurveTo(tip + 0.018 * s, 0, tip - 0.075 * s, 0.037 * s);
      ctx.lineTo(tip - 0.045 * s, 0.02 * s);
      ctx.lineTo(tip - 0.045 * s, -0.02 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  const paintFrog = (spot: { x: number; y: number; angle: number }): void => {
    if (rig.hurt) return; // the hurt flash keeps silhouettes clean
    ctx.save();
    ctx.translate(spot.x, spot.y);
    ctx.rotate(spot.angle);
    ctx.fillStyle = '#43331f';
    ctx.beginPath();
    ctx.roundRect(0.09 * s, -0.06 * s, 0.062 * s, 0.12 * s, 0.02 * s);
    ctx.fill();
    ctx.fillStyle = '#5d4a30';
    ctx.fillRect(0.104 * s, -0.06 * s, 0.014 * s, 0.12 * s);
    ctx.restore();
  };
  const paintStowedMain = (): void => {
    if (!stowed || !wornDef || !mainStow) return;
    drawHeldItem(ctx, wornDef.id, wornDef.color, mainStow.x, mainStow.y, mainStow.angle, s, rig, {
      ench: rig.weaponEnch,
      carry: wornBow ? 1 : 0,
      grip: 0.5,
    });
    if (!wornBack) {
      paintScabbard(mainStow, wornDef.id);
      paintFrog(mainStow);
    }
  };
  const paintStowedOff = (): void => {
    if (!stowed || !offStow || !offSt || !rig.offhandItem) return;
    drawHeldItem(ctx, rig.offhandItem, offSt.color, offStow.x, offStow.y, offStow.angle, s, rig, {
      ench: rig.offhandEnch,
    });
    paintScabbard(offStow, rig.offhandItem);
    paintFrog(offStow);
  };
  // Back slings share the quiver's depth law: behind the torso facing
  // the camera, over it facing away. With a cape the renderer owns the
  // call (drawBackGear) so the sling straps over the cloth. Belt gear
  // has its own depth: at PROFILE the main scabbard hangs off the
  // TRAILING hip — the blade rakes back behind the body, so it tucks
  // behind the torso — while the off scabbard rides the leading hip in
  // front; face-on both hips sit outside the waist and paint in front.
  const slingFront = bandFlag(mem, 'slingFront', -fy, 0.22, 0.1);
  // (The leg layer, belt gear, and quiver paint down at the depth
  // ladder — after every paint closure exists, before the torso.)
  const paintMainArm = (seg?: 'under' | 'over'): void => {
    armSegPass = seg ?? null;
    const mainTint = RIG_DEBUG.tintMain;
    drawArm(
      ctx,
      mainShX,
      mainShY,
      mainX,
      mainY,
      (archer ? -fx : Math.cos(mainAngle) * 0.4) * (1 - settleK) +
        mainSettlePoleX * settleK,
      archer ? -0.6 : 1,
      mainTint ?? sleeve,
      mainTint ?? skin,
      s,
      mainTint ? undefined : cuff,
      mainTint ? null : gloveSt,
      rig.hurt,
      skel,
      mem ? (mem.mainElbow ??= { sign: 0 }) : undefined,
      elbowEaseHold,
      rig.nowMs,
      gno,
      gol,
      gob,
      ogr,
      skr,
      hob,
    );
    armSegPass = null;
  };
  // ---- THE BILLBOARD SOCKET: pauldrons sit on the rig's SHOULDER
  // SOCKETS — and the sockets obey the BILLBOARD's law, not a 3D
  // projection's. This rig never yaws its torso: at every facing the
  // body is a front-ish billboard whose depth is spoken through the
  // wS squash, layering and size — the settled arms root at a
  // CONSTANT spread (±SHOULDER_SETTLE_K·tw, the anatomical anchor law
  // at line one of the shoulder settle) no matter the heading. The
  // previous frame projected the shoulder bar like true 3D (lx =
  // ∓fy·tw), so at a profile both caps collapsed onto the SPINE while
  // the arms kept their billboard spread — caps beside the head,
  // roots bare (the user's stormsinger E sheet). One law now serves
  // both: each cap's socket spreads by the SAME settle constant the
  // arm hangs from (widening to the garment corner only as the facing
  // squares to the camera), and runs through the exact matrix the
  // torso paints with — hip translate, combat lean, wS/hScale squash
  // — so cap and arm root can never disagree again. Depth is spoken
  // the billboard way: a small far-rise/near-drop on the shoulder
  // line, ±15% size in drawPauldron, and the layer flag — far cap
  // BEHIND the torso, crown peeking over the trapezius; near cap in
  // front, cupping the arm root. BOTH always paint: depth decides
  // layer, size and lean, never existence. Which screen side each
  // anatomical cap owns flips ONCE through a profile on its own
  // hysteresis band (the arms' remembered-side law), never per-frame.
  // The stride rolls each cap on its own end; the combat lean carries
  // both through every swing because the frame itself leans. History:
  // the caps once rode the solved ARM anchors and followed the HANDS
  // (akimbo dragged a cap to the cheek); then rode a projected 3D bar
  // and abandoned the billboard. The arm never owns the pauldron; the
  // projection never owns the billboard.
  //
  // ---- THE LIVING SOCKET (the third law, and the reconciliation):
  // the billboard owns the cap's HOME; the arm owns its MOTION. Each
  // cap now reads its own arm's SOLVED root and follows the root's
  // DEVIATION from the settle anchor — the strike's slide along the
  // bar, the archer's rotation into the draw, the girdle's standing
  // breath and stride roll — position and a matching lean. The
  // deviation is CLAMPED to a fifth of the torso, so the old akimbo
  // failure (a cap dragged to the cheek by a hand) stays impossible
  // BY CONSTRUCTION: at rest the deviation is zero and the billboard
  // law holds bit-exact; in motion the cap is an extension of the
  // arm, never its passenger. A pauldron that ignores its own arm
  // reads as bolted to the torso — the user's palethorn/kingsmane
  // catch that founded this law.
  const paintPauldrons = (layer: 'behind' | 'front'): void => {
    if (!bodySt || bodySt.pauldron === 'none') return;
    const cosL = Math.cos(lean);
    const sinL = Math.sin(lean);
    // The garment's shoulder line, in torso-local units — the same
    // height shoulderY resolves to, expressed inside the frame.
    const lyBar = -th + (SHOULDER_Y_DROP_S * s) / hScale;
    const strideSwP = ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP;
    // Socket spread: exactly the arm's anatomical settle spread at a
    // profile (cap ON the root), easing out to the garment's own
    // corner (0.98·tw) as the shoulder bar squares to the camera —
    // there the cap wraps the OUTSIDE of the root, as a worn cap does.
    // THE TURNED BAR: the settle spread itself now tucks side-on
    // (shoulderTuckK — the same function the arm anchors ride), so at
    // a profile the near cap stands over the body's centerline where
    // its arm actually roots, not parked at a frontal corner.
    const settleSpread = SHOULDER_SETTLE_K * shoulderTuckK(fx);
    const spread = tw * (settleSpread + (0.98 - settleSpread) * Math.abs(fy));
    for (const e of [1, -1] as const) {
      // Screen side, remembered: ±fy decides while the bar reads,
      // the band holds through the profile crossing so each cap
      // flips sides exactly once per half-turn. The ±1e-4 bias keeps
      // the stateless fallback deterministic (and opposite) at an
      // exact profile.
      const sideScr = bandFlag(
        mem,
        e === 1 ? 'capSideA' : 'capSideB',
        e * (-fy + 1e-4),
        0.1,
        -0.1,
      )
        ? 1
        : -1;
      const depthK = e * fx; // -1 far .. +1 near
      // Depth, spoken asymmetrically: the NEAR cap drops down its
      // root (we look down onto it); the FAR cap must NOT rise — a
      // tall device lifted at the far socket parks its crown at EYE
      // height beside the face (the stormsinger crystal lesson). The
      // far shoulder instead peeks OUTBOARD past the torso's back
      // edge at shoulder height — the classic side-view read — with
      // only a whisper of rise for the bird's-eye tilt.
      const nearK = Math.max(0, depthK);
      const farK = Math.max(0, -depthK);
      // The near drop deepens toward a full profile: the head slides
      // to the leading edge there and stands directly over the near
      // socket, so the cap seats at the jaw line — cupping the upper
      // arm — for the face to stay sovereign. (0.32 was the first
      // cut: it parked the cap over the CHEST, a floating device
      // divorced from its own arm — the user's palethorn E catch.
      // 0.2 lifted the stormspire crystals into the FACE. 0.26 holds
      // both laws: tall devices clear the jaw, compact caps still
      // read seated ON the root — with the living socket carrying
      // the attachment the drop was over-asked to fake.)
      // The near cap wraps the OUTSIDE of its shoulder: with the
      // turned bar tucking the roots toward the centerline, a cap
      // centered ON the root lands inside the head column at a
      // profile and fuses with the jaw. It biases outboard toward
      // the leading silhouette edge instead — worn over the arm,
      // clear of the chin — and seats a touch DEEPER as the bias
      // engages, so tall devices ride the deltoid, not the cheek.
      // Zero face-on (nearK is |fx|-driven).
      // The far peek is anchored to the torso's BACK EDGE, not to the
      // spread: a fixed offset from the tucked bar parked tall far
      // devices against the trailing cheek (the stormsinger crystal
      // lesson, round two). Whatever the spread does, the far cap
      // lands just past the garment's own edge (1.1·tw) — the classic
      // side-view sliver — and never nearer.
      const farOut = Math.max(0.34 * tw, 1.1 * tw - spread);
      const lx = sideScr * (spread + farK * farOut + nearK * tw * 0.14);
      const ly = lyBar + nearK * tw * 0.3 - farK * tw * 0.08;
      const px = lx * wS;
      const py = ly * hScale;
      // THE LIVING SOCKET: this cap's own arm root, solved above —
      // main arm settles on sign(sideS)'s screen side, off arm
      // opposite — and its deviation from the settle anchor, clamped
      // to a fifth of the torso. Zero at rest by construction.
      const capIsMain = sideScr === mainSideSign;
      const rootX = capIsMain ? mainShX : offShX;
      const rootY = capIsMain ? mainShY : offShY;
      const devLim = 0.2 * tw * wS;
      const devX = Math.max(
        -devLim,
        Math.min(devLim, rootX - (rig.x + sideScr * tw * settleSpread * wS)),
      );
      const devY = rootY - shoulderY;
      const wx = rig.x + cosL * px - sinL * py + devX;
      const wy = hipY + sinL * px + cosL * py + devY;
      const behind = bandFlag(
        mem,
        e === 1 ? 'capBehindA' : 'capBehindB',
        -depthK,
        0.18,
        0.08,
      );
      if ((layer === 'behind') !== behind) continue;
      if (RIG_DEBUG.on) RIG_DEBUG.sockets.push({ x: wx, y: wy, depthK });
      // Orientation: the outward perspective lean (strongest when the
      // bar points at the camera and we see the cap from its side),
      // the combat lean the frame itself carries, the stride's roll —
      // opposite ends of the bar counter-rotate on the run — and the
      // root-follow lean: a cap riding its arm's slide along the bar
      // TIPS with the travel, the way a shrugging shoulder carries
      // its spaulder. An extension of the arm, not a hat on a peg.
      const tilt =
        Math.max(
          -0.34,
          Math.min(0.34, Math.atan2(sideScr * depthK * 0.5, Math.abs(fy) + 0.45)),
        ) +
        lean * 0.6 +
        strideSwP * 0.055 * rig.runF * e +
        (devX / (tw * wS)) * 0.4;
      drawPauldron(
        ctx, bodySt, wx, wy, sideScr, s, wS, rig.hurt, sideScr < 0, rig.nowMs,
        depthK, tilt,
      );
    }
  };
  /**
   * The held main weapon (or station prop). `clip` = THE PIERCED
   * CARRY's item-local keep-range (units of s along the shaft): the
   * assembly paints the far range before the torso and the near range
   * after it, so a long carry honestly crosses the body's depth.
   * Undefined = the whole item on one layer, exactly as before.
   */
  const paintWeapon = (clip?: readonly [number, number]): void => {
    // Station props: the smith's own kit, drawn regardless of loadout.
    if (craftKind === 'anvil') {
      // Tongs gripping a glowing billet — the work in progress.
      const tang = Math.atan2(offY - (armY + 0.02 * s), offX - rig.x);
      const glow = 0.72 + Math.sin(rig.nowMs * 0.006) * 0.16;
      ctx.save();
      ctx.translate(offX, offY);
      ctx.rotate(tang);
      ctx.strokeStyle = '#4a4554';
      ctx.lineWidth = Math.max(2, s * 0.045);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-0.06 * s, side * 0.012 * s);
        ctx.lineTo(0.12 * s, side * 0.035 * s);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255, 176, 82, ${glow})`;
      ctx.beginPath();
      chamferRect(ctx, 0.1 * s, -0.038 * s, 0.2 * s, 0.076 * s, 0.02 * s);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 236, 180, ${glow * 0.85})`;
      ctx.fillRect(0.13 * s, -0.016 * s, 0.1 * s, 0.032 * s);
      ctx.restore();
      // The smith's hammer in the striking hand — rotated by the work
      // engine's projected haft (heldAngle), never the bare arm ray.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      ctx.roundRect(-0.06 * s, -0.02 * s, 0.3 * s, 0.04 * s, 0.015 * s);
      ctx.fill();
      ctx.fillStyle = '#9aa2ac';
      ctx.beginPath();
      chamferRect(ctx, 0.18 * s, -0.075 * s, 0.11 * s, 0.15 * s, 0.03 * s);
      ctx.fill();
      ctx.fillStyle = '#c9ccd4';
      ctx.fillRect(0.18 * s, -0.075 * s, 0.11 * s, 0.045 * s);
      ctx.restore();
      return;
    }
    if (craftKind === 'furnace') {
      // A charged crucible carried in both hands, mouth aglow.
      const cx2 = (mainX + offX) / 2;
      const cy2 = (mainY + offY) / 2 - 0.02 * s;
      const glow = 0.6 + Math.sin(rig.nowMs * 0.008) * 0.2;
      ctx.fillStyle = '#4a4554';
      ctx.beginPath();
      chamferRect(ctx, cx2 - 0.11 * s, cy2 - 0.07 * s, 0.22 * s, 0.13 * s, 0.03 * s);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 158, 66, ${glow})`;
      ctx.beginPath();
      chamferRect(ctx, cx2 - 0.08 * s, cy2 - 0.065 * s, 0.16 * s, 0.045 * s, 0.015 * s);
      ctx.fill();
      return;
    }
    if (craftKind === 'fire') {
      // The cook's ladle — long stem into a dark cup riding the stir,
      // a wet gleam of broth in the bowl. The empty-handed pot
      // pantomime dies here (docs/work-cycles-plan.md Phase 3).
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.strokeStyle = '#6d4a26';
      ctx.lineWidth = Math.max(2, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(-0.04 * s, 0);
      ctx.lineTo(0.26 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#4a4554';
      ctx.beginPath();
      ctx.ellipse(0.3 * s, 0, 0.058 * s, 0.042 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 206, 128, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0.3 * s, -0.008 * s, 0.038 * s, 0.024 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (craftKind === 'workbench' || building) {
      // The joiner's mallet — pale wood barrel head on a light haft,
      // unmistakably NOT the smith's steel. Rides the tap-tap beat.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = '#7a552e';
      ctx.beginPath();
      ctx.roundRect(-0.05 * s, -0.016 * s, 0.24 * s, 0.032 * s, 0.012 * s);
      ctx.fill();
      ctx.fillStyle = '#b08a52';
      ctx.beginPath();
      chamferRect(ctx, 0.14 * s, -0.062 * s, 0.09 * s, 0.124 * s, 0.024 * s);
      ctx.fill();
      ctx.fillStyle = '#c9a86b';
      ctx.fillRect(0.15 * s, -0.05 * s, 0.07 * s, 0.036 * s);
      ctx.restore();
      return;
    }
    if (craftKind === 'alembic') {
      // The alchemist's vial — pale glass, a bright charge of liquor
      // that pours when the wrist rolls it past level.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = 'rgba(214, 226, 236, 0.82)';
      ctx.beginPath();
      ctx.roundRect(0.02 * s, -0.036 * s, 0.15 * s, 0.072 * s, 0.028 * s);
      ctx.fill();
      ctx.fillStyle = 'rgba(122, 210, 168, 0.9)';
      ctx.beginPath();
      ctx.roundRect(0.075 * s, -0.026 * s, 0.084 * s, 0.052 * s, 0.02 * s);
      ctx.fill();
      // Cork + neck toward the grip.
      ctx.fillStyle = '#8a6534';
      ctx.fillRect(-0.008 * s, -0.017 * s, 0.036 * s, 0.034 * s);
      ctx.restore();
      return;
    }
    if (craftKind === 'tanning_rack') {
      // The tanner's scraper — a dark curved drawknife bar lying
      // ACROSS the stroke, both fists on its horns.
      ctx.save();
      ctx.translate((mainX + offX) / 2, (mainY + offY) / 2);
      ctx.rotate(Math.atan2(offY - mainY, offX - mainX));
      // The horns run PAST both fists — a drawknife's grips live
      // outside the hands, so the steel shows around the mitts that
      // are painted over its middle.
      const half = Math.hypot(offX - mainX, offY - mainY) / 2 + 0.11 * s;
      ctx.strokeStyle = '#4a4554';
      ctx.lineWidth = Math.max(2.5, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.quadraticCurveTo(0, 0.05 * s, half, 0);
      ctx.stroke();
      ctx.strokeStyle = '#9aa2ac';
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(-half * 0.82, 0.026 * s);
      ctx.quadraticCurveTo(0, 0.062 * s, half * 0.82, 0.026 * s);
      ctx.stroke();
      // Grip knobs on the horn tips.
      ctx.fillStyle = '#6d4a26';
      for (const hx2 of [-half, half]) {
        ctx.beginPath();
        ctx.arc(hx2, 0, 0.026 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (craftKind === 'loom') {
      // The weaver's shuttle — a smooth boat of pale wood with the
      // weft's eye, gliding level through the pass.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = '#b08a52';
      ctx.beginPath();
      ctx.moveTo(-0.11 * s, 0);
      ctx.quadraticCurveTo(0, -0.038 * s, 0.11 * s, 0);
      ctx.quadraticCurveTo(0, 0.038 * s, -0.11 * s, 0);
      ctx.fill();
      ctx.fillStyle = '#6d4a26';
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.032 * s, 0.014 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // The trailing weft thread, back toward the frame.
      ctx.strokeStyle = 'rgba(216, 196, 148, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(-0.1 * s, 0.004 * s);
      ctx.quadraticCurveTo(-0.2 * s, 0.05 * s, -0.3 * s, 0.04 * s);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (craftKind === 'carving_bench') {
      // The carver's knife — a short bright blade off a stub handle,
      // pushed AWAY down the grain.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = '#6d4a26';
      ctx.beginPath();
      ctx.roundRect(-0.06 * s, -0.015 * s, 0.09 * s, 0.03 * s, 0.012 * s);
      ctx.fill();
      ctx.fillStyle = '#c9ccd4';
      ctx.beginPath();
      ctx.moveTo(0.03 * s, -0.014 * s);
      ctx.lineTo(0.15 * s, -0.008 * s);
      ctx.lineTo(0.16 * s, 0.004 * s);
      ctx.lineTo(0.03 * s, 0.014 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (craftKind === 'enchanting_table') {
      // THE RUNE TRACE: nothing held — the hand itself carries a soft
      // working glow, motes orbiting the trace. The conjured prop is
      // LIGHT.
      const gl = ctx.createRadialGradient(mainX, mainY, 0, mainX, mainY, 0.13 * s);
      gl.addColorStop(0, 'rgba(168, 190, 255, 0.5)');
      gl.addColorStop(1, 'rgba(168, 190, 255, 0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(mainX, mainY, 0.13 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(214, 226, 255, 0.9)';
      for (let i = 0; i < 3; i++) {
        const a2 = rig.nowMs * 0.0035 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(
          mainX + Math.cos(a2) * 0.085 * s,
          mainY + Math.sin(a2) * 0.05 * s,
          Math.max(1, 0.012 * s),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      return;
    }
    if (craftKind === 'sawhorse') {
      // The sawyer's handsaw — a tapering blade down the stroke line
      // with a tooth edge, D-handle at the grip.
      ctx.save();
      ctx.translate(mainX, mainY);
      ctx.rotate(heldAngle);
      ctx.fillStyle = '#9aa2ac';
      ctx.beginPath();
      ctx.moveTo(0.02 * s, -0.05 * s);
      ctx.lineTo(0.42 * s, -0.028 * s);
      ctx.lineTo(0.42 * s, 0.008 * s);
      ctx.lineTo(0.02 * s, 0.028 * s);
      ctx.closePath();
      ctx.fill();
      // Tooth line along the working edge.
      ctx.strokeStyle = '#c9ccd4';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const x0 = (0.05 + i * 0.046) * s;
        ctx.moveTo(x0, 0.024 * s);
        ctx.lineTo(x0 + 0.023 * s, 0.032 * s);
      }
      ctx.stroke();
      ctx.fillStyle = '#6d4a26';
      ctx.beginPath();
      ctx.roundRect(-0.065 * s, -0.045 * s, 0.075 * s, 0.09 * s, 0.03 * s);
      ctx.fill();
      ctx.fillStyle = '#2a2733';
      ctx.beginPath();
      ctx.roundRect(-0.047 * s, -0.026 * s, 0.04 * s, 0.052 * s, 0.018 * s);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (!weapon) {
      if (fishing) paintConjuredRod();
      return;
    }
    if (bowX !== null) {
      // The drawn bow points down the PROJECTED aim and compresses at
      // the plane's half-measure — the arrow's angle and length are
      // the elevation read (a south draw reads low-forward, never
      // "aimed at the boots"; a north draw high-forward, never
      // straight up a flat card).
      drawHeldItem(ctx, weapon.id, weapon.color, bowX, bowY, aimDraw.angle, s, rig, {
        pull: bowPull,
        loose: loosing ? rig.poseT : undefined,
        ench: rig.weaponEnch,
        fore: 1 - BOW_PLANE_SOFT * (1 - aimDraw.fore),
      });
    } else {
      // THE SPEED GHOSTS: through the snap the steel outruns the eye —
      // two after-images at earlier beat times, dying fast, repainted
      // through the same resolver (the multi-exposure smear of a
      // hand-keyed action frame). Enchant fx sit the ghosts out.
      if (strikeRes && strikeSchool && (meleeStage === 0 || meleeStage === 1)) {
        for (const g of strikeGhosts(strikeSchool, rig.poseT)) {
          const gr = resolveStrike(
            strikeSchool,
            meleeStage as 0 | 1,
            strikeVariant,
            g.t,
            strikeSide,
            rig.dir,
          );
          ctx.globalAlpha = g.alpha;
          drawHeldItem(
            ctx,
            weapon.id,
            weapon.color,
            rig.x + gr.fistDX * s * wS,
            armY + gr.fistDY * s,
            gr.bladeAngle,
            s,
            rig,
            { grip: gr.grip ?? staffGrip, flip: mainFlip, fore: gr.fore },
          );
          ctx.globalAlpha = 1;
        }
      }
      drawHeldItem(ctx, weapon.id, weapon.color, mainFistPt.x, mainFistPt.y, heldAngle, s, rig, {
        grip: staffGrip,
        // THE BOW IS HELD BY THE WOOD — always. The old restSettle
        // blend slid the fist onto the string line whenever the settle
        // was partial: a hand carrying a bowstring like a suitcase.
        carry: isBow ? 1 : 0,
        ench: rig.weaponEnch,
        flip: mainFlip,
        fore: mainFore,
        clipLo: clip?.[0],
        clipHi: clip?.[1],
        rodCast: fishing && rig.fishTo !== undefined,
      });
      // THE PATIENT LINE rides the rod's layer — see paintFishLine.
      if (fishing && rig.fishTo && workRes) paintFishLine(mainFistPt.x, mainFistPt.y);
    }
  };
  /**
   * THE PATIENT LINE: the cast line lives in the world — it sags from
   * the ROD'S OWN TIP (the art's tip point, carried through the same
   * rotate + fore the wood painted with) to a bobber on the water
   * point the bearing names. Painted with the rod (real or conjured),
   * so an away-facing angler's line passes behind the body with the
   * wood that holds it.
   */
  const paintFishLine = (fx0: number, fy0: number): void => {
    if (!rig.fishTo) return;
    {
      {
        const fore = mainFore;
        const ca = Math.cos(heldAngle);
        const sa = Math.sin(heldAngle);
        const tipLX = 0.62 * s * fore;
        const tipLY = -0.235 * s;
        const tx2 = fx0 + ca * tipLX - sa * tipLY;
        const ty2 = fy0 + sa * tipLX + ca * tipLY;
        const u = workCycleU('fish', rig.nowMs);
        // Tension: taut through the cast fling and the tug, slack sag
        // through the long wait.
        const tug = u > 0.8 && u < 0.95 ? 1 - Math.abs((u - 0.86) / 0.09) : 0;
        const castK = u > 0.07 && u < 0.3 ? 1 : 0;
        const taut = Math.max(castK * 0.8, tug);
        // The bobber bobs on the wait, DIPS on the tug.
        const bobY =
          rig.fishTo.y +
          Math.sin(rig.nowMs * 0.0031) * 0.014 * s +
          Math.max(0, tug) * 0.05 * s;
        const bobX = rig.fishTo.x;
        const midX = (tx2 + bobX) / 2;
        const midY = Math.max(ty2, bobY) + (0.16 - 0.13 * taut) * s;
        ctx.strokeStyle = 'rgba(232, 226, 212, 0.7)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.quadraticCurveTo(midX, midY, bobX, bobY);
        ctx.stroke();
        // Bobber: red over white, riding the water line.
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 0.028 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c4553d';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 0.028 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        // Ripples: a faint standing ring, and on the tug a spreading
        // pair — the water answering the line (camera-squashed).
        const ring = (r: number, a: number): void => {
          ctx.strokeStyle = `rgba(226, 240, 248, ${a})`;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.ellipse(bobX, bobY + 0.02 * s, r, r * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        };
        ring(0.07 * s + Math.sin(rig.nowMs * 0.0024) * 0.008 * s, 0.22);
        if (u > 0.82) {
          const rp = (u - 0.82) / 0.18;
          ring((0.08 + rp * 0.2) * s, 0.5 * (1 - rp));
          if (rp > 0.25) ring((0.05 + (rp - 0.25) * 0.18) * s, 0.4 * (1 - rp));
        }
      }
    }
  };
  /** THE CONJURED ROD: an angler with empty hands (NPC 'fish' stops
   *  carry no equip) still fishes with real wood — the plain rod
   *  style, the same projected angle and fore, dangle suppressed,
   *  the cast line painted off its tip. */
  const paintConjuredRod = (): void => {
    ctx.save();
    ctx.translate(mainX, mainY);
    ctx.rotate(heldAngle);
    ctx.scale(mainFore, 1);
    drawTool(ctx, toolStyle('fishing_rod', '#c4a35a')!, s, rig.nowMs, rig.hurt, true);
    ctx.restore();
    if (rig.fishTo && workRes) paintFishLine(mainX, mainY);
  };

  // Far arm always sits behind the torso; the weapon + striking arm go
  // in front unless the character is aiming up and away.
  // DUAL-WIELD PROFILE FLIP (depth half) — the screen-side depth law:
  // facing right, the screen-LEFT hand is the near arm and paints
  // FOREMOST (after the torso); the screen-RIGHT hand is the far arm
  // and paints BEHIND it. So at profile the main pair drops before the
  // torso and the off pair moves after it — ONE flag drives both, so
  // the arms can never end up on the same layer with both weapons
  // reading as slung behind the back. Hysteresis on profileK (cape
  // front/back pattern, memory caller-owned) so aim jitter at the
  // boundary can never flicker the layering.
  const flipAt = mem ? (mem.mainBehind ? 0.78 : 0.86) : 0.82;
  const mainBehind = offBlade && restSettle > 0.5 && profileK > flipAt;
  if (mem) mem.mainBehind = mainBehind;
  // THE FACING-CAMERA DEPTH LAW: facing the viewer, BOTH arms hang on
  // the near side of the body — an off hand that overlaps the hip must
  // read in FRONT of the torso, not clip behind it (the frontal cone
  // where the depth effect "got lost"). Mirror of the weaponBehind law
  // for the opposite pole, with the same hysteresis pattern so aim
  // jitter at the boundary can never flicker the layering.
  // THE FRONTAL CONE EARNS ITS NAME (the depth-wheel audit): keyed on
  // fy alone the cone entered ~24° south of pure profile, so a
  // sideways run with a slight toward-camera tilt threw the far arm
  // ONTO the chest — at near-profile facings the off hand's lane is
  // tucked over the body's centerline, and painted on the front layer
  // it crossed the torso (both arms over the chest, the user's
  // screenshot). The measure now subtracts the profile weight, so
  // "facing the camera" demands fy DOMINATE |fx|: the flip lands
  // between SE and E (enter ≈42°, exit ≈33° south of profile) — the
  // S/SE/SW verdicts keep their approved both-arms-front read, and
  // the shallow band inherits the profile's far-arm-behind read,
  // where the torso honestly occludes the tucked far hand. Mirror
  // symmetric E/W by construction (|fx|).
  const offFrontCone = fy - 0.55 * profileK;
  const offFrontAt = mem ? (mem.offFront ? 0.1 : 0.24) : 0.17;
  // A shield overrides the hand's depth rule with the PLANE's: the arm
  // goes wherever its shield went, in or out of combat, so the boards
  // and the fist behind them can never end up on opposite sides of the
  // torso. The flip lands exactly at profile, where the shield is
  // edge-on beside the body and the swap is invisible by construction.
  const offFront = shieldFr
    ? shieldFr.front
    : !mainBehind && restSettle > 0.5 && offFrontCone > offFrontAt;
  if (mem) mem.offFront = offFront;
  // THE FAR SIDE GOES BEHIND THE LEGS: facing up-and-away, the hang
  // and the aim live on the body's FAR side — the whole gear layer
  // paints before the legs, not merely before the torso (dual blades
  // used to hang OVER the shins on a north-facing idle, the user's
  // screenshot). Same gate as weaponBehind's aim-away term, so the
  // layer swap shares that one boundary; the great rest's visible
  // back-carry keeps its front verdict, and the profile flip
  // (mainBehind) keeps its own torso-relative lanes.
  const gearBehindLegs = awayDeep && !greatRestFront;
  // THE HEAD SITS UPON THE SHOULDERS: at a settled rest with EMPTY
  // hands, the hanging arms belong UNDER the helm — a mantled hood
  // drapes over the arm root, a sleeve never juts over the head's own
  // cloth. Armed, striking, or aiming, the weapon pair keeps the old
  // front layer (the boldest thing on screen; an overhead swing must
  // cross in front of the face), so the flip rides the settle band
  // and the empty fist — it can never land mid-swing. The shoulder
  // caps still paint LAST either way: head upon shoulders, caps upon
  // the mantle.
  const headOverArms =
    settleHalf &&
    weapon === undefined &&
    !offBlade &&
    !weaponBehind &&
    !mainBehind &&
    !gearBehindLegs;
  if (gearBehindLegs && !mainBehind) {
    if (weaponBehind) {
      paintWeapon();
      paintMainArm();
    }
    if (!offFront) paintOffArm();
  }
  paintLegs();
  // Belt scabbards + the back quiver lie over the legs, under the
  // torso — exactly the layer they held when the legs painted early.
  const beltBehind = bandFlag(mem, 'beltBehind', profileK, 0.68, 0.56);
  if (!quiverFront) paintQuiver();
  if (stowed && offWorn && !beltBehind) paintStowedOff();
  if (stowed && !wornBack && beltBehind) paintStowedMain();
  if (stowed && wornBack && !slingFront && !rig.hasCape) paintStowedMain();
  if (mainBehind) {
    paintWeapon();
    paintMainArm();
  } else if (!offFront && !gearBehindLegs) {
    paintOffArm();
  }
  if (weaponBehind && !mainBehind && !gearBehindLegs) {
    paintWeapon();
    paintMainArm();
  } else if (splitFar && !mainBehind) {
    // THE PIERCED CARRY's far half: the shaft segment beyond the body
    // line paints under the torso (the arm and the near half follow
    // on the front layer — the fist never hides behind the chest).
    paintWeapon(splitFar);
  }

  // Sprint lean: the torso tips into a full-tilt forward run — reads
  // side-on only (fx), and never when backpedaling against the aim.
  lean += 0.09 * rig.runF * Math.max(0, rig.align) * fx;
  // The kobold hunch: the whole species stands bent over its next
  // hole — a standing forward tip that stacks under the sprint lean
  // (and eases out when seated; a sitting kobold just slumps).
  if (kob) lean += 0.12 * fx * (1 - sit);
  // The gnoll hunch: seven feet of scavenger carried low — a heavier
  // standing tip than the kobold's (the lore's stoop), easing out
  // when seated. The pitch is the stoop lane's own number (ONE TRUTH:
  // the shoulder roots above rotated by exactly this), and THE LOPE
  // rides on top: the scavenger nods INTO each footfall — a pitch
  // pulse on the stride clock, profile-read like every carriage term.
  if (gno) {
    lean += stoop!.pitch * fx * (1 - sit);
    lean += Math.abs(swS) * 0.05 * fx * Math.min(1, rig.poleStrength) * (1 - sit);
  }
  // The goblin hunch: between the kobold's and the gnoll's — the
  // slouch of a body led everywhere by its own nose, easing out when
  // seated.
  if (gob) lean += 0.14 * fx * (1 - sit);
  // The construct stands like a tower — no hunch. Only the rock golem
  // carries a lean: a stacked cairn was never plumb.
  if (gol) lean += (gol.build === 'rock' ? 0.06 : 0.015) * fx * (1 - sit);
  // The wader's crouch: the deepest hunch of any walker — a body
  // built to stand thigh-deep in current leads with its whole skull,
  // easing out when seated. The pitch is the stoop lane's own number
  // (ONE TRUTH with the shoulder roots), and THE FROG WADDLE rides on
  // top: at the camera-line facings a screen-plane lean is a SIDE
  // tilt, so the stride's lift differential rocks the body over each
  // planted foot — the web-footed gait read the profile can't carry
  // (there the pitch owns the lean, so the waddle fades on profileK).
  if (skr) {
    lean += stoop!.pitch * fx * (1 - sit);
    lean += swS * 0.07 * (1 - profileK) * Math.min(1, rig.poleStrength) * (1 - sit);
  }
  // The giant's stoop: the heaviest carriage in the game leads with
  // its brow — the gut hangs, the hump rises, the head arrives last.
  // THE MARCH STRAIGHTENS IT: a standing ogre looms over its supper;
  // a walking one pulls the mass up over the moving columns (the
  // full stoop at stride, with the profile's soft knees, read as a
  // crouch-walk — frame audit, the mass round).
  if (ogr) lean += (0.2 - 0.08 * Math.min(1, rig.poleStrength)) * fx * (1 - sit);

  // Seated drape info for the garment painter: the ground line and the
  // solved knees mapped into the torso local frame (translate → lean
  // rotate → squash scale, inverted) so a robe's skirt can pool at the
  // TRUE ground and tent over a raised knee. Knees read from
  // KNEE_SCRATCH — legs solve before the torso, the ordering is
  // load-bearing.
  let seatDrape: { groundY: number; knees: Array<{ x: number; y: number }> } | undefined;
  if (sit > 0.01 && bodySt && bodySt.skirt > 0) {
    const cosL = Math.cos(lean);
    const sinL = Math.sin(lean);
    const loc = (px: number, py: number): { x: number; y: number } => {
      const dx = px - rig.x;
      const dy = py - hipY;
      return { x: (dx * cosL + dy * sinL) / wS, y: (-dx * sinL + dy * cosL) / hScale };
    };
    seatDrape = {
      groundY: loc(rig.x, rig.y).y,
      knees: KNEE_SCRATCH.map((kn) => loc(kn.x, kn.y)),
    };
  }

  // The far shoulder's cap ducks under the garment (profile band only)
  // — painted before the torso frame OPENS so it peeks over the
  // shoulder line from behind the cloth. It must run in the same WORLD
  // space as the front pass: inside the frame its world-coordinate
  // anchors got the frame's translate applied twice, teleporting the
  // cap to (2x, ~2y) — off-screen in game, so the leading cap simply
  // VANISHED at profile facings (the floating-cap ghost on unclipped
  // render sheets).
  paintPauldrons('behind');

  // ---- THE EAR IS A SIMULATION (earPhysics.ts): the goblin's wing
  // ears are elastic bodies ticked HERE — the rig owns the exact
  // skull anchor — and painted in world space around the whole body:
  // far-depth ears under everything before the torso frame opens,
  // camera-side ears over the finished body at the end. The skull-
  // azimuth projection owns the perspective at every band; no ear
  // code below ever consults a facing blend.
  let paintEars: ((layer: 'behind' | 'front') => void) | null = null;
  if (gob || skr || hob) {
    const hv = (gob ?? skr ?? hob)!.heavy;
    // The head anchor, through the torso frame's own transform
    // (translate → lean → squash) so the roots ride the drawn skull.
    const earR = 0.15 * s * (gob ? 1.34 : skr ? 1.42 : 1.02);
    const ehx = fx * (gob ? 0.1 : skr ? 0.12 : 0.06) * s * rig.wScale;
    const ehy = (-th - earR * (gob ? 0.42 : skr ? 0.34 : 0.66)) * (1 + (1 - rig.wScale) * 0.55);
    const cosE = Math.cos(lean);
    const sinE = Math.sin(lean);
    const eax = rig.x + cosE * ehx - sinE * ehy;
    const eay = hipY + sinE * ehx + cosE * ehy;
    // The jeer pins the goblin's ears back through every strike beat;
    // the same clock FLARES the skral's crest — one beat, two threats.
    const jeer =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    const carriage: EarCarriage = gob
      ? {
          azimuth: 2.0,
          rootR: 0.19,
          rootLift: 0.05,
          length: 0.26 + 0.08 * (hv - 1),
          spread: 0.85,
          rise: 0.95,
          curl: [0, 0.16, 0.34],
        }
      : skr
        ? skralCrestCarriage(hv, jeer)
        : hobEarCarriage(hv, jeer);
    // The crest pins gently, never fully — a fin has no occiput to
    // fold against; its threat is the RISE the carriage already took.
    // The hobgoblin's blades pin HARD — the snarl lays them along the
    // skull like a horse's ears going back: fair warning, by drill.
    const pin = gob ? jeer : skr ? jeer * 0.3 : jeer * 0.85;
    let chains: Array<{ side: number; c: EarChain }>;
    if (rig.earSim) {
      rig.earSim.update(eax, eay, s, carriage, rig.dir, pin, rig.nowMs);
      chains = [-1, 1].map((side) => ({
        side,
        c: rig.earSim!.chain(side, carriage, rig.dir, pin),
      }));
    } else {
      // Stateless: THE ONE REST — the settled silhouette, listening
      // sway on the wall clock (audit sheets, previews, tests).
      chains = [-1, 1].map((side) => ({
        side,
        c: earRestChain(side, carriage, {
          dir: rig.dir,
          pin,
          sway: rig.hurt ? 0 : 0.05 * Math.sin(rig.nowMs / 640 + side * 1.7),
        }),
      }));
    }
    chains.sort((a, b) => a.c.depth - b.c.depth);
    const backHead = backK > 0.55;
    if (gob) {
      const st: EarStyle = {
        skin: shade(gob.hide, backHead ? -14 : -6),
        outline: shade(gob.hide, -26),
        membrane: shade(gob.belly, -6),
        rib: shade(gob.hide, -16),
        seam: shade(gob.hide, -18),
      };
      const earW = 0.038 * (0.9 + 0.2 * hv) * s;
      paintEars = (layer) => {
        for (const { side, c } of chains) {
          if ((c.depth > 0.05) !== (layer === 'front')) continue;
          drawWingEar(
            ctx,
            c.pts.map((p) => ({ x: eax + p.x * s, y: eay + p.y * s })),
            earW,
            st,
            {
              hurt: rig.hurt,
              back: backHead,
              notch: (gob.scarred ?? false) && side === lead,
              headX: eax,
              headY: eay,
            },
          );
        }
      };
    } else if (skr) {
      // THE CREST: two tight banks of one sail — the far bank paints
      // behind the skull, the near bank over it, and at profile they
      // stack into one deep blade by projection alone.
      const cst = skralCrestStyle(skr, backHead);
      const crestW = 0.1 * (0.9 + 0.2 * hv) * s;
      paintEars = (layer) => {
        for (const { side, c } of chains) {
          if ((c.depth > 0.05) !== (layer === 'front')) continue;
          drawSkralCrest(
            ctx,
            c.pts.map((p) => ({ x: eax + p.x * s, y: eay + p.y * s })),
            crestW,
            cst,
            { hurt: rig.hurt, notch: (skr.scarred ?? false) && side === lead },
          );
        }
      };
    } else {
      // THE SWEPT BLADES: the legion ear rakes back along the skull —
      // near/far order and the profile stack fall out of the same
      // projection the goblin wing rides; only the carriage argues.
      const hst = hobEarStyle(hob!, backHead);
      const earW = 0.032 * (0.9 + 0.2 * hv) * s;
      paintEars = (layer) => {
        for (const { side, c } of chains) {
          if ((c.depth > 0.05) !== (layer === 'front')) continue;
          drawHobEar(
            ctx,
            c.pts.map((p) => ({ x: eax + p.x * s, y: eay + p.y * s })),
            earW,
            hst,
            {
              hurt: rig.hurt,
              back: backHead,
              notch: (hob!.scarred ?? false) && side === lead,
              ringed: hob!.helm === 'crest' || hob!.helm === 'none',
            },
          );
        }
      };
    }
    paintEars('behind');
  }

  // ---- torso + head, drawn in a local frame at the hip line with the
  // fake-3D squash: narrow side profile, full front/back profile, height
  // compensating inversely so the turn reads as orientation.
  ctx.save();
  ctx.translate(rig.x, hipY);
  // Combat lean: the torso coils and tips with swings and braced draws.
  if (lean !== 0) ctx.rotate(lean);
  ctx.scale(wS, hScale);

  // The kobold tail rides the torso frame, painted BEFORE the garment
  // so its root always tucks behind the body — trailing the facing,
  // hanging low from behind, tip peeking past the hip face-on.
  if (kob) {
    paintKoboldTail(ctx, kob, {
      s,
      fx,
      fy,
      profileK,
      backK,
      lead,
      nowMs: rig.nowMs,
      runF: rig.runF,
      poleX: rig.poleX,
      hurt: rig.hurt,
    });
  }
  // The gnoll's tail is NOT painted here: it is a world-space verlet
  // simulation (tail.ts — the cape contract in muscle) ticked by the
  // caller and painted on the cape's facing-law side of the whole
  // body: behind facing the camera, in front facing away.

  // ---- head measurements, resolved BEFORE the torso paints. Hair is
  // a two-pass matter (THE HAIR RIDES THE SKULL RING, hair.ts): the
  // far-side pass lies UNDER the body — behind-the-head falls are
  // occluded by the torso from the front, exactly like real hair down
  // the back — while the near-side pass paints over the skull later.
  // Kobolds carry OVERSIZED heads for their frame — the big-headed
  // burrow-goblin proportion the whole species reads by; the kobold
  // skull hangs LOW and thrust FORWARD off the hump.
  // The gnoll skull hangs LOW and FORWARD — SUNK into the crest hump
  // (deeper than the kobold's), thrust ahead of the hunched
  // shoulders, and oversized so the jaw mass reads at distance: the
  // head is the predator's whole argument and the hunch is the pose
  // that presents it.
  // The golem head is SMALL for its frame and sunk INTO the shoulder
  // line — the neckless construct proportion: massive body, deep-set
  // capstone. The opposite argument to the kobold/gnoll oversize.
  // The goblin head is the BIGGEST proportion in the game — a third
  // of the body's whole read on the smallest frame that walks. It
  // sits LOW on the hunched shoulders with only a slight forward jut:
  // the wing ears carry the silhouette, so the skull needn't reach.
  // THE SLOPE (the giant inversion): the ogre's skull is the SMALLEST
  // proportion on the biggest frame that walks — a 0.98 head sunk
  // near-neckless in front of the hump. Nothing else says "giant" as
  // loudly as a head the body dwarfs.
  // The skral head out-proportions even the goblin's — the head is
  // half the animal (the murloc argument) — and it sits IN the
  // shoulders: the lowest carry of any dialect, because there is no
  // neck to carry it with.
  // The hobgoblin head is a MEASURED oversize — 1.08 on a near-human
  // frame, carried HIGH on a real neck (the only dialect that stands
  // parade-straight): every other monstrous head slumps, sinks, or
  // juts, and the upright carry against them IS the discipline read.
  const headR = 0.15 * s * (kob ? 1.16 : gno ? 1.22 : gob ? 1.34 : gol ? 1.04 : ogr ? 0.98 : skr ? 1.42 : hob ? 1.02 : 1);
  const headX =
    kob ? fx * 0.14 * s : gno ? fx * 0.19 * s : gob ? fx * 0.1 * s : gol ? fx * 0.08 * s : ogr ? fx * 0.12 * s : skr ? fx * 0.12 * s : hob ? fx * 0.06 * s : fx * 0.05 * s;
  const headY =
    kob
      ? -th - headR * 0.48
      : gno
        ? -th - headR * 0.3
        : gob
          ? -th - headR * 0.42
          : gol
            ? -th - headR * 0.08
            : ogr
              ? -th - headR * 0.34
              : skr
                ? -th - headR * 0.34
                : hob
                  ? -th - headR * 0.66
                  : -th - headR * 0.82;
  const hw = headR * 1.04; // half-width
  const hh = headR * 1.0; // half-height
  const cut = headR * 0.34;
  if (RIG_DEBUG.on) {
    // World-space head seat through the torso frame (the ear-anchor
    // approximation: per-axis squash, then the lean rotation about
    // the hip) — the overlay's reference for face-crossing hands.
    const cosH = Math.cos(lean);
    const sinH = Math.sin(lean);
    const dhx = headX * rig.wScale;
    const dhy = headY * hScale;
    RIG_DEBUG.lean = lean;
    RIG_DEBUG.headX = rig.x + cosH * dhx - sinH * dhy;
    RIG_DEBUG.headY = hipY + sinH * dhx + cosH * dhy;
    RIG_DEBUG.headR = headR;
  }
  const helm = itemDef(rig.headItem ?? '');
  // THE WORN LIGHT reaches the head too: the brow band (drawArxBrow)
  // only paints when the resolved style carries the working, exactly
  // like every other slot above.
  const helmSt = helm ? withArx(helm.id, helmStyle(helm.id), worn.slots.head) : null;
  // THE COVERAGE LAW: a helmet never deletes a hairstyle, it CONTAINS it.
  //   free   — bare head or a circlet: the full hairdo.
  //   brim   — the whole brim-hat family: the fringe cap only (cloth
  //            holds the rest). Sealed-mode nape falls poke past a
  //            wide brim as whiskers — every hat kind belongs here.
  //   sealed — every forged metal kind (THE FORGE LAW: all metal is
  //            full-face): only the nape falls escape below the rim.
  //   cloth  — hoods: the cloth wraps everything.
  const helmKind = helmSt?.kind;
  const cover: HairCover =
    !helm || helmKind === 'circlet'
      ? 'free'
      : helmKind === 'wizard' || helmKind === 'magus' ||
          helmKind === 'thistlehat' || helmKind === 'tidehat' ||
          helmKind === 'thunderhat' || helmKind === 'hedgehat' ||
          helmKind === 'zenithhat' || helmKind === 'showerhat' ||
          helmKind === 'sedgehat'
        ? 'brim'
        : helmKind === 'hood' || helmKind === 'guildcowl' ||
            helmKind === 'latchhood' || helmKind === 'veilwrap'
          ? 'cloth'
          : 'sealed';
  const hairCol = rig.hurt
    ? '#ffffff'
    : rig.look
      ? HAIR_COLORS[rig.look.hairColor]!
      : shade(bodyColor, -24);
  // NPC humanoids carry no Look — they wear the neutral short cut, not
  // the player default (a town where every crofter has collar-length
  // hair reads as a costume choice nobody made).
  const hairIx = rig.look?.hair ?? NPC_HAIR_STYLE;
  const hairFrame = {
    headX,
    headY,
    hw,
    hh,
    cut,
    fx,
    fy,
    col: hairCol,
    hurt: rig.hurt,
  };
  // The bone, scale, fur, and greenskin dialects replace head, hair,
  // and face wholesale.
  if (!skel && !kob && !gno && !gob && !gol && !ogr && !skr && !hob) drawHairBack(ctx, hairFrame, hairIx, cover);

  // The skral's behind-pass: the slung trident's shaft and the far-
  // side spine finlets paint UNDER the torso — occlusion by paint
  // order, decided by station depth, never by a band gate.
  if (skr) {
    paintSkralBody(
      ctx,
      skr,
      { s, tw, ww, th, fx, fy, profileK, backK, lead, hurt: rig.hurt, nowMs: rig.nowMs },
      bodySt != null,
      'behind',
    );
  }
  // The hobgoblin's behind-pass: the warlord's standard shaft paints
  // UNDER the torso — occlusion by paint order, decided by station
  // depth, never by a band gate (the skral carry law).
  if (hob) {
    paintHobgoblinBody(
      ctx,
      hob,
      { s, tw, ww, th, fx, fy, profileK, backK, lead, hurt: rig.hurt, nowMs: rig.nowMs },
      bodySt != null,
      'behind',
    );
  }

  // Torso garment: the styled body (robe, jerkin, brigandine, cuirass,
  // pauldrons) — the bare `tunic` default is the original silhouette.
  // The bone dialect wears no garment at all: the ribcage IS the torso.
  // (The far shoulder's behind-pass cap paints before this frame opens
  // — world coords never enter the torso frame.)
  if (skel) {
    paintRibcage(ctx, skel, {
      s,
      tw,
      ww,
      th,
      fx,
      lead,
      profileK,
      backK,
      hurt: rig.hurt,
    });
  } else if (gol) {
    // THE CONSTRUCT wears no garment — the stacked stone, forged
    // plate, cracked crust, or sheared ice IS the torso. The flare
    // input is the menace ramp: cracks gape and visors burn through
    // the wind of every art.
    paintGolemBody(ctx, gol, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      runF: rig.runF,
      flare:
        meleeStage >= 0 || rig.pose === PoseState.Cast
          ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
          : 0,
    });
  } else if (ogr) {
    // THE GIANT wears its own hide — gut, hump, wrap, and trophy are
    // one projected carriage (ogre.ts). The sims tick HERE, at the
    // rig's true torso anchor (the ear law: the part-owner ticks the
    // sim; the renderer owns only lifecycle). The anchor rides the
    // hip line, so every bob, lunge, and hard stop the legs produce
    // arrives at the gut as honest inertia.
    const gutAnchorX = rig.x;
    const gutAnchorY = hipY - th * 0.4;
    const gut = rig.ogreGut
      ? rig.ogreGut.update(gutAnchorX, gutAnchorY, s, rig.nowMs)
      : GUT_REST;
    const pendant = rig.ogrePendant
      ? rig.ogrePendant.update(gutAnchorX, gutAnchorY, s * 0.16, rig.nowMs)
      : null;
    paintOgreBody(ctx, ogr, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      runF: rig.runF,
      flare:
        meleeStage >= 0 || rig.pose === PoseState.Cast
          ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
          : 0,
      // THE WEIGHT CROSSES: the stride's lateral rock, from the live
      // lifts — positive toward the planted (screen-right) column.
      sway: Math.max(
        -1,
        Math.min(1, ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / (LIFT_AMP * 0.65)),
      ),
      gut,
      pendant,
    });
  } else {
    drawTorsoGarment(
      ctx,
      bodySt ?? {
        color: bodyColor,
        trim: shade(bodyColor, -20),
        cls: 'cloth',
        silhouette: 'tunic',
        pauldron: 'none',
        chest: 'none',
        skirt: 0,
      },
      {
        s,
        tw,
        ww,
        th,
        lead,
        profileK,
        backK,
        yaw: fx,
        hurt: rig.hurt,
        strideSw: ((rig.feet[0]?.lift ?? 0) - (rig.feet[1]?.lift ?? 0)) / LIFT_AMP,
        nowMs: rig.nowMs,
        runF: rig.runF,
        sit,
        groundY: seatDrape?.groundY,
        seatKnees: seatDrape?.knees,
        // Cloth trails the travel: the hem drags OPPOSITE the motion,
        // un-squashed into the local frame so profile runs still read.
        dragX:
          (-rig.poleX * Math.min(1, rig.poleStrength) * (0.1 + 0.14 * rig.runF)) /
          Math.max(0.6, wS),
      },
    );
  }

  // The kobold's shoulder hump rises OVER the garment and UNDER the
  // head — the bent back the low-slung skull sinks into.
  if (kob) {
    paintKoboldHump(ctx, kob, bodyColor, {
      s,
      tw,
      th,
      fx,
      backK,
      hurt: rig.hurt,
    });
  }
  // The gnoll's body coat overpaints the garment quad (belly panel,
  // dorsal saddle, rosettes, hip fringe, the scavenger harness), then
  // the crest hump rises OVER it and UNDER the head — high furred
  // withers with the mane ridge on top.
  if (gno) {
    paintGnollBody(ctx, gno, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
    });
    paintGnollCrest(ctx, gno, {
      s,
      tw,
      th,
      fx,
      backK,
      hurt: rig.hurt,
    });
  }
  // Every goblin wears the loincloth wrap — the warboss keeps it
  // under the scavenged iron the way every soldier ever has.
  if (gob) {
    paintGoblinLoincloth(ctx, gob, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
    });
  }
  // The goblin's pot gut and rope belt overpaint the garment quad —
  // but never real armor: a warboss in scavenged iron keeps its iron
  // (everything it wears really drops, and nothing may cover that).
  if (gob && !bodySt) {
    paintGoblinTorso(ctx, gob, {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
    });
  }
  // The skral body: belly plate, spine finlets, and the deepking's
  // back-slung trident (armor keeps the belly pass out, the loot-
  // story law) — then the net-sash, which every skral wears the way
  // every goblin wears the loincloth.
  if (skr) {
    const skFr = {
      s,
      tw,
      ww,
      th,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
    };
    paintSkralBody(ctx, skr, skFr, bodySt != null);
    paintSkralWrap(ctx, skr, skFr);
  }
  // THE IRON HABIT: the banded cuirass, girdle, sash, and pennant
  // overpaint the garment quad — but never real armor (the loot-story
  // law: what a body visibly wears really drops, and nothing may
  // cover it). The pteruges skirt paints ALWAYS: the harness law —
  // this body is issued, never bare.
  if (hob) {
    paintHobgoblinBody(
      ctx,
      hob,
      { s, tw, ww, th, fx, fy, profileK, backK, lead, hurt: rig.hurt, nowMs: rig.nowMs },
      bodySt != null,
    );
  }

  // ---- THE HEAD SITS UPON THE SHOULDERS: at a settled, empty-handed
  // rest the torso frame closes here so the hanging arms can paint in
  // world space UNDER everything that follows — the head stack and
  // the helm whose mantle drapes onto the shoulders — then the frame
  // re-opens with the exact same matrix for the head. The caps still
  // paint last at the tail (head upon shoulders, caps upon mantle).
  if (headOverArms) {
    ctx.restore();
    if (offFront) paintOffArm();
    paintMainArm();
    ctx.save();
    ctx.translate(rig.x, hipY);
    if (lean !== 0) ctx.rotate(lean);
    ctx.scale(wS, hScale);
  } else if (skr) {
    // THE FACE SANDWICH's under station (the stoop lane, round 2):
    // the skral skull out-widens the shoulder bar, so every front-
    // layer arm's ROOT half genuinely lives behind the head — during
    // strikes the shoulder even slides along the bar toward the hand,
    // parking the root at the spine center, dead behind the face.
    // Painted whole on the front layer the arm sprouted from the eye
    // (the deepking strike / tidecaller cast verdicts). Here — after
    // the body, before the head — each arm that the tail will paint
    // on the front layer lays down its UPPER segment, in world space
    // exactly like the headOverArms dance above; the skull then
    // paints over it, and the tail's 'over' pass draws the forearm +
    // hand emerging past the head silhouette. Same guards as the
    // tail stations, so the two halves can never disagree about
    // which arms are on the front layer.
    ctx.restore();
    if (offFront) paintOffArm('under');
    if (!weaponBehind && !mainBehind) paintMainArm('under');
    if (mainBehind) paintOffArm('under');
    ctx.save();
    ctx.translate(rig.x, hipY);
    if (lean !== 0) ctx.rotate(lean);
    ctx.scale(wS, hScale);
  }

  // ---- head (inside the squash frame so turning carries it too).
  // A chamfered block, not a ball — and a BILLBOARD FACE, not a dial:
  // the head reads in bands (front, three-quarter, profile, back).
  // Eyes live on one fixed eye line and slide only horizontally with
  // the facing; the pair narrows through three-quarter, the far eye
  // slips around the corner at profile, and the back of the head shows
  // hair, not features. Sliding features vertically with fy is what
  // made the old head read top-down. Measurements, the coverage tier,
  // and the far-side hair pass were all resolved above the torso.
  if (skel) {
    // THE SKULL replaces head, hair, and face wholesale — the helmet
    // (if the dead wear one) still fits over it below. The jaw gapes
    // through every strike beat: the skeleton BITES as it swings.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintSkull(ctx, skel, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      headR,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (kob) {
    // THE SCALE DIALECT head replaces head, hair, and face wholesale —
    // the muzzle leads the facing and the jaw yips through every
    // strike beat, same combat-bite clock as the skeleton's gape.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintKoboldHead(ctx, kob, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (gno) {
    // THE FUR DIALECT head replaces head, hair, and face wholesale —
    // the blunt muzzle leads the facing and the jaw drops through
    // every strike beat: the gnoll CACKLES as it swings.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintGnollHead(
      ctx,
      gno,
      {
        s,
        headX,
        headY,
        hw,
        hh,
        cut,
        fx,
        fy,
        profileK,
        backK,
        lead,
        hurt: rig.hurt,
        nowMs: rig.nowMs,
        gape,
      },
      gno.seed ?? 0,
    );
  } else if (gob) {
    // THE GREENSKIN DIALECT head replaces head, hair, and face
    // wholesale — the hook nose leads the facing, the jaw drops
    // through every strike beat and the wing ears pin back with it:
    // the goblin JEERS as it swings.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintGoblinHead(ctx, gob, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (skr) {
    // THE BRINE DIALECT head replaces head, hair, and face wholesale
    // — the lantern eyes ride the skull's sides, the needle grin
    // sweeps ear to ear, and the jaw drops through every strike beat
    // while the gular throat fills: the skral CROAKS as it swings
    // (the crest flares on the same clock — the sim block above).
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintSkralHead(ctx, skr, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (hob) {
    // THE LEGION DIALECT head replaces head, hair, and face wholesale
    // — the war mask under its painted open helm. The strike beat is
    // a WAR-SHOUT: the jaw drops, the one brow knits, and the swept
    // blades pin flat on the same clock (the sim block above); the
    // idle face holds dead STILL — against the goblin's constant
    // jeer, the stillness is the discipline.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintHobgoblinHead(ctx, hob, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      fx,
      fy,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
      gape,
    });
  } else if (gol) {
    // THE CONSTRUCT DIALECT head: capstone, helm block, crucible, or
    // sheared prism — the strike beat FLARES instead of biting (a
    // visor burns, a capstone nods, a pool surges, a crack flashes).
    const flare =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintGolemHead(
      ctx,
      gol,
      {
        s,
        headX,
        headY,
        hw,
        hh,
        cut,
        fx,
        fy,
        profileK,
        backK,
        lead,
        hurt: rig.hurt,
        nowMs: rig.nowMs,
        flare,
      },
      gol.seed ?? 0,
    );
  } else if (ogr) {
    // THE GIANT DIALECT head: the slope, the brow ledge, and the
    // underbite — the strike beat is a ROAR (the jaw drops, the brow
    // knits, the skull tips back), never a nibble.
    const gape =
      meleeStage >= 0 || rig.pose === PoseState.Cast
        ? Math.sin(Math.min(1, rig.poseT) * Math.PI)
        : 0;
    paintOgreHead(
      ctx,
      ogr,
      {
        s,
        headX,
        headY,
        hw,
        hh,
        cut,
        fx,
        fy,
        profileK,
        backK,
        lead,
        hurt: rig.hurt,
        nowMs: rig.nowMs,
        gape,
      },
      ogr.seed ?? 0,
    );
  } else {
  ctx.fillStyle = skin;
  ctx.beginPath();
  chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
  ctx.fill();
  if (!rig.hurt) {
    // THE FORM SPLIT: the head shares the torso's screen-fixed x=0
    // light — hard shade on the right half, a lit crown band, and a
    // jaw under-shade, so the block reads as a skull, not a sticker.
    // CLIPPED TO THE SKULL: chamferRect clamps a corner cut to half a
    // shape's height, so the thin crown/jaw bands used to end in
    // near-square corners that poked PAST the head's chamfer — pale
    // skin chips floating at the head corners under every hairline.
    // Inside the clip the bands are plain rects; the silhouette owns
    // every edge.
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, headX - hw, headY - hh, hw * 2, hh * 2, cut);
    ctx.clip();
    ctx.fillStyle = shade(skin, -9);
    ctx.fillRect(headX, headY - hh, hw, hh * 2);
    ctx.fillStyle = shade(skin, -16);
    ctx.fillRect(headX - hw, headY + hh * 0.8, hw * 2, hh * 0.2);
    ctx.fillStyle = shade(skin, 8);
    ctx.fillRect(headX - hw, headY - hh, hw * 2, hh * 0.18);
    ctx.restore();
  }
  // Ears ride the head sides UNDER the hair (curtains lie over the
  // roots; pointed tips break the silhouette — that is the point).
  // Round ears vanish into the block head; metal and cloth cover all.
  //
  // THE AZIMUTH LAW: each ear lives at a fixed bearing on the skull —
  // 90° either side of the nose — and every facing question is
  // answered by projecting that bearing, never by special-casing
  // bands. For ear `es`, azimuth φ = dir − es·π/2 gives:
  //   cosP = es·fy   — where the ear sits across the screen (±1 = the
  //                    silhouette edges, 0 = mid-skull at profile);
  //   sinP = −es·fx  — how much it faces the camera (>0 in front of
  //                    the skull, <0 tucked behind the turned head).
  // So the TRAILING ear stays in view through a turn (riding toward
  // mid-skull at profile, exactly where a portrait puts it) while the
  // LEADING ear forshortens and ducks behind the face — it never
  // crosses onto the eyes. From behind, the pair swaps screen sides
  // (a mirror does that) and shows ear BACKS: no concha, no seam.
  // Each ear is a FACETED LEAF: rib-split lit/shaded faces, a concha
  // hollow scaled by how much the flap faces the camera, a root seam
  // against the skull, and a sweep-back lean that grows as the radial
  // axis leaves the screen plane (elf ears trail the facing).
  const earStyle = rig.look?.ears ?? 0;
  if (earStyle > 0 && (cover === 'free' || cover === 'brim')) {
    for (const es of [-1, 1]) {
      const cosP = es * fy;
      const sinP = -es * fx;
      // Visible facing the camera, or protruding at the silhouette
      // edge (pure front/back). The leading ear fades smoothly as it
      // slides behind the turned face.
      const vis = Math.max((sinP + 0.12) / 0.6, (Math.abs(cosP) - 0.86) / 0.14);
      if (vis <= 0.05) continue;
      const v = Math.min(1, vis);
      const rootX = headX - fx * headR * 0.16 + cosP * hw * 0.94;
      const rootY = headY + headR * 0.1 + fy * headR * 0.05;
      // The leaf's horizontal run: radial reach plus sweep-back. At
      // the back quarters the two nearly cancel — the ear points at
      // the camera — so a floor keeps the flap a readable nub.
      const dirRaw = cosP + -fx * 0.85;
      const dSign = dirRaw >= 0 ? 1 : -1;
      const dLen = Math.max(0.5, Math.min(1, Math.abs(dirRaw))) * v;
      const earBack = backK > 0.55;
      // How much of the flap's front face shows: full at profile and
      // the front quarters, partial head-on, none from behind.
      const hollowK = earBack ? 0 : Math.max(0, Math.min(1, (sinP + 0.5) / 0.7));
      // Screen-side light law by actual screen position, so the pair
      // keeps the head's x=0 split even after the behind-the-head
      // mirror swap; ear backs sit a step darker (nape shadow).
      const earBase = rig.hurt
        ? skin
        : shade(skin, (cosP > 0 ? -9 : 0) + (earBack ? -7 : 0));
      // A flap riding IN FRONT of the skull (the profile band) is
      // skin against skin — it needs its own rim to read. Front and
      // back ears break the silhouette and the sky separates them.
      const contourK = Math.max(0, Math.min(1, (sinP - 0.45) / 0.55));
      const rimEar = (path: Path2D): void => {
        if (rig.hurt || contourK <= 0.15) return;
        ctx.strokeStyle = shade(skin, -22);
        ctx.lineWidth = headR * 0.055 * contourK;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        ctx.lineJoin = 'miter';
      };
      ctx.fillStyle = earBase;
      if (earStyle === 1) {
        // Pointed — the long leaf, tip rising as the head turns (the
        // swept-back drow read at profile, level at front).
        const eL = headR * 0.62 * dLen;
        const upT = 0.34 + 0.16 * (1 - Math.abs(cosP));
        const topY = rootY - headR * 0.26;
        const tipX = rootX + dSign * eL;
        const tipY = rootY - headR * upT;
        const botY = rootY + headR * 0.2;
        const leaf = new Path2D();
        leaf.moveTo(rootX, topY);
        leaf.lineTo(tipX, tipY);
        leaf.lineTo(rootX + dSign * eL * 0.3, rootY + headR * 0.08);
        leaf.lineTo(rootX, botY);
        leaf.closePath();
        rimEar(leaf);
        ctx.fill(leaf);
        if (!rig.hurt) {
          // Under-face: everything below the rib line falls into
          // shade, giving the leaf its fold and thickness.
          ctx.fillStyle = shade(earBase, -12);
          ctx.beginPath();
          ctx.moveTo(rootX, rootY - headR * 0.03);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX + dSign * eL * 0.3, rootY + headR * 0.08);
          ctx.lineTo(rootX, botY);
          ctx.closePath();
          ctx.fill();
          if (hollowK > 0.1) {
            // The hollow: a concha wedge nested against the root,
            // opening wider the more the flap faces the camera.
            ctx.fillStyle = shade(skin, -24);
            ctx.beginPath();
            ctx.moveTo(rootX + dSign * headR * 0.03, rootY - headR * 0.12);
            ctx.lineTo(rootX + dSign * eL * 0.42 * hollowK, rootY - headR * 0.16);
            ctx.lineTo(rootX + dSign * headR * 0.03, rootY + headR * 0.1);
            ctx.closePath();
            ctx.fill();
          }
          if (!earBack) {
            // Root seam: cartilage meets skull on a hard dark line.
            ctx.fillStyle = shade(skin, -30);
            ctx.fillRect(
              rootX - dSign * headR * 0.005,
              topY + headR * 0.06,
              dSign * headR * 0.035,
              botY - topY - headR * 0.12,
            );
          }
        }
      } else {
        // Upswept — the tall fey blade angling for the crown, leaning
        // with the sweep so it trails the facing through a turn.
        const kX = dSign * headR * dLen;
        const botY = rootY + headR * 0.2;
        const tipX = rootX + kX * 0.5;
        const tipY = rootY - headR * (0.74 - 0.1 * (1 - v));
        const blade = new Path2D();
        blade.moveTo(rootX, botY);
        blade.lineTo(rootX + kX * 0.34, rootY - headR * 0.06);
        blade.lineTo(tipX, tipY);
        blade.lineTo(rootX + dSign * headR * 0.05, rootY - headR * 0.24);
        blade.lineTo(rootX, rootY - headR * 0.02);
        blade.closePath();
        rimEar(blade);
        ctx.fill(blade);
        if (!rig.hurt) {
          // Leading face: the outer half of the blade catches light,
          // the inner half turns away — a standing fin, not a stripe.
          ctx.fillStyle = shade(earBase, 8);
          ctx.beginPath();
          ctx.moveTo(rootX + kX * 0.34, rootY - headR * 0.06);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(rootX + kX * 0.24, rootY - headR * 0.3);
          ctx.closePath();
          ctx.fill();
          if (hollowK > 0.1) {
            // The hollow nested low, against the skull.
            ctx.fillStyle = shade(skin, -24);
            ctx.beginPath();
            ctx.moveTo(rootX + dSign * headR * 0.04, rootY + headR * 0.08);
            ctx.lineTo(rootX + kX * 0.24 * hollowK, rootY - headR * 0.14);
            ctx.lineTo(rootX + dSign * headR * 0.05, rootY - headR * 0.12);
            ctx.closePath();
            ctx.fill();
          }
          // Dark tip bead: the point ends in shadow, and stays a
          // point at any zoom instead of dissolving into the sky.
          ctx.fillStyle = shade(earBase, -16);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - kX * 0.14, tipY + headR * 0.2);
          ctx.lineTo(tipX - kX * 0.02, tipY + headR * 0.22);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // The near-side hair: cap with its solved hairline + camera-facing
  // locks, painted OVER the ears (curtains overlay roots; pointed ear
  // tips break the cap silhouette sideways — that is the point).
  drawHairFront(ctx, hairFrame, hairIx, cover);

  // Face — only where a face actually is.
  if (backK <= 0.55) {
    const faceK = 1 - Math.max(0, Math.min(1, (-fy - 0.05) / 0.25)) * 0.35; // dim up-facing
    // One fixed eye line: a whisper of vertical drift for life, never
    // a slide onto the scalp or chin.
    const eyeLineY = headY + headR * 0.1 + fy * headR * 0.06;
    // The big symmetric slabs (beard, mouth line) ride a simple pair
    // slide; the face FEATURES project off the skull ring below.
    const pairX = headX + fx * headR * 0.36;
    const eyeStyle = rig.look?.eyes ?? 0;
    const feature = rig.look?.feature ?? 0;
    // THE FACE WRAPS THE SKULL (supersedes the pair-slide + far-side
    // collapse): every feature lives at a fixed bearing off the nose
    // (u = sin of its angle, −1..1 across the face) and every facing
    // question is answered by PROJECTING that bearing, the ears'
    // azimuth law brought onto the face:
    //   screen x       = (fx·√(1−u²) + fy·u)·headR
    //   camera-facing  =  fy·√(1−u²) − fx·u
    // So a turn slides BOTH eyes toward the leading edge: the leading
    // eye rides out to the silhouette, forshortens, and slips around
    // the corner (gone well before pure profile), while the trailing
    // eye crosses the face and lands by the nose as the single
    // profile eye. A feature only ever narrows while it is rounding
    // the corner — the exit is a slide off the edge, never an
    // in-place squish or crop.
    // ORBIT: features sit on the chamfered front FACET of the block
    // head, recessed inside the full silhouette — so a feature that
    // survives to profile lands just behind the nose instead of on
    // the outermost edge. Eyes are DEEP-SET a step further (EYE_R):
    // the surviving profile eye must stop short of the hair's dark
    // side curtain, or a black eye dies against it on every dark-
    // haired look at the cardinal E/W facings.
    const ORBIT = 0.875;
    const EYE_R = 0.78;
    const featX = (u: number, r = ORBIT): number =>
      headX + (fx * Math.sqrt(Math.max(0, 1 - u * u)) + fy * u) * headR * r;
    // Width factor: camera-facing normalized so a head-on face reads
    // exactly 1 (the front look is unchanged) and 0 = rounded the
    // corner. The 0.05 floor kills lingering one-pixel slivers.
    const featK = (u: number): number => {
      const c0 = Math.sqrt(Math.max(0, 1 - u * u));
      return Math.max(
        0,
        Math.min(1, (fy * c0 - fx * u - 0.05) / (c0 - 0.05)),
      );
    };
    // Eye bearing: sin picked so the FRONT separation stays exactly
    // the old 0.42·headR (0.538·EYE_R = 0.42) — every bearing below
    // is pre-divided by its recess the same way to hold every front
    // position where it has always been.
    const EYE_U = 0.538;

    // The scar rides UNDER the eye slit, so the slash reads as
    // crossing it — always on the leading side of the face.
    if (feature === 4 && !rig.hurt) {
      // The scar rides its eye's skull bearing, so it wraps out of
      // view with that cheek instead of squishing in place.
      const sk = featK(lead * EYE_U);
      if (sk > 0.05) {
        ctx.strokeStyle = shade(skin, -42);
        ctx.lineWidth = headR * 0.085;
        const sx = featX(lead * EYE_U, EYE_R);
        ctx.beginPath();
        ctx.moveTo(sx - lead * headR * 0.1 * sk, eyeLineY - headR * 0.42);
        ctx.lineTo(sx + lead * headR * 0.14 * sk, eyeLineY + headR * 0.46);
        ctx.stroke();
        // Two stitch ticks across the slash.
        ctx.lineWidth = headR * 0.045;
        for (const t of [-0.16, 0.2]) {
          const mx = sx + lead * headR * (0.02 + 0.24 * t) * sk;
          const my = eyeLineY + headR * 0.88 * t;
          ctx.beginPath();
          ctx.moveTo(mx - headR * 0.09 * sk, my - headR * 0.03);
          ctx.lineTo(mx + headR * 0.09 * sk, my + headR * 0.03);
          ctx.stroke();
        }
      }
    }

    // Eyes, per chosen pattern: the calm slit, the sharp blade, the
    // wide open pair (with a glint), and the lashed read.
    const eyeW = headR * (eyeStyle === 1 || eyeStyle === 2 ? 0.24 : 0.19);
    const eyeH = headR * (eyeStyle === 1 ? 0.26 : eyeStyle === 2 ? 0.44 : 0.36);
    // Brows carry the character's intent, one bar per eye in the hair
    // color: flat for calm, knived inward for sharp, lifted high for
    // wide, a thin gentle arch for lashed. They ride the same facing
    // slide and far-side narrowing as everything else on the face.
    if (!rig.hurt) {
      ctx.fillStyle = shade(hairCol, -6);
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.02) continue;
        const bw = eyeW * 1.3 * wK;
        const bx = featX(es * EYE_U, EYE_R);
        const by =
          eyeLineY - eyeH * (eyeStyle === 2 ? 0.98 : 0.85) - headR * 0.06;
        const innerX = bx - es * (bw / 2);
        const outerX = bx + es * (bw / 2);
        const slant =
          eyeStyle === 1 ? headR * 0.12 : eyeStyle === 3 ? -headR * 0.05 : 0;
        const bt = headR * (eyeStyle === 1 ? 0.1 : 0.07);
        ctx.beginPath();
        ctx.moveTo(innerX, by + slant / 2);
        ctx.lineTo(outerX, by - slant / 2);
        ctx.lineTo(outerX, by - slant / 2 + bt);
        ctx.lineTo(innerX, by + slant / 2 + bt);
        ctx.closePath();
        ctx.fill();
      }
    }
    const asleep = (rig.sleepT ?? 0) > 0.5;
    for (const es of [-1, 1]) {
      const wK = featK(es * EYE_U);
      if (wK <= 0.02) continue;
      const w = eyeW * wK;
      const cx = featX(es * EYE_U, EYE_R);
      ctx.fillStyle = OUTLINE;
      if (asleep) {
        // Closed lids: one soft line resting where the eye's lower
        // third sat, gently bowed — a sleeper, not a squint.
        ctx.fillRect(cx - w / 2, eyeLineY + eyeH * 0.08, w, headR * 0.06);
        continue;
      }
      if (eyeStyle === 1) {
        // Sharp: a hard slanted blade, outer corner riding high.
        const innerX = cx - es * (w / 2);
        const outerX = cx + es * (w / 2);
        ctx.beginPath();
        ctx.moveTo(innerX, eyeLineY + eyeH * 0.12 * faceK);
        ctx.lineTo(outerX, eyeLineY - eyeH * 0.5 * faceK);
        ctx.lineTo(outerX, eyeLineY + eyeH * 0.16 * faceK);
        ctx.lineTo(innerX, eyeLineY + eyeH * 0.5 * faceK);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(cx - w / 2, eyeLineY - eyeH / 2, w, eyeH * faceK);
        if (eyeStyle === 2 && !rig.hurt) {
          // Wide: a bright glint wakes the bigger eye.
          ctx.fillStyle = '#8fa0b5';
          ctx.fillRect(cx - w * 0.1, eyeLineY - eyeH * 0.34, w * 0.3, eyeH * 0.22);
        } else if (eyeStyle === 3 && !rig.hurt) {
          // Lashed: two ticks flicking up off the outer corner.
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = headR * 0.045;
          const ox = cx + es * (w / 2);
          const topY = eyeLineY - eyeH / 2;
          for (const l of [0, 1]) {
            ctx.beginPath();
            ctx.moveTo(ox, topY + eyeH * 0.16 * l);
            ctx.lineTo(ox + es * headR * 0.12 * wK, topY - headR * 0.07 + eyeH * 0.2 * l);
            ctx.stroke();
          }
        }
      }
    }
    // Profile nose: a small skin wedge off the leading edge — the one
    // mark that makes a side view a side view.
    if (profileK > 0.55) {
      const nk = Math.min(1, (profileK - 0.55) / 0.3);
      const nx = headX + lead * hw * 0.98;
      ctx.fillStyle = rig.hurt ? '#ffffff' : shade(skin, -14);
      ctx.beginPath();
      ctx.moveTo(nx, eyeLineY + headR * 0.06);
      ctx.lineTo(nx + lead * headR * 0.16 * nk, eyeLineY + headR * 0.17);
      ctx.lineTo(nx, eyeLineY + headR * 0.28);
      ctx.closePath();
      ctx.fill();
    }
    // Rosy cheeks under the eyes, riding the same face bands —
    // warpaint replaces the blush entirely.
    if (!rig.hurt && feature !== 3) {
      ctx.fillStyle = 'rgba(214, 118, 96, 0.45)';
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.02) continue;
        ctx.fillRect(
          featX(es * EYE_U, EYE_R) - headR * 0.14 * wK,
          eyeLineY + headR * 0.24,
          headR * 0.28 * wK,
          headR * 0.16,
        );
      }
    }
    if (feature === 3 && !rig.hurt) {
      // Warpaint: a three-finger claw rake down each cheek — stripes
      // shorten and drift as they descend, the way dragged fingers
      // actually land, each with a dried-blood edge beneath it.
      for (const es of [-1, 1]) {
        const wK = featK(es * EYE_U);
        if (wK <= 0.05) continue;
        for (const row of [0, 1, 2]) {
          const y0 = eyeLineY + headR * (0.18 + row * 0.15);
          const bw = headR * (0.4 - row * 0.06) * wK;
          const x0 = featX(es * EYE_U, EYE_R) - bw / 2 + es * headR * 0.03 * row;
          ctx.fillStyle = 'rgba(120, 24, 20, 0.55)';
          ctx.beginPath();
          ctx.moveTo(x0, y0 + headR * 0.075);
          ctx.lineTo(x0 + bw, y0 - headR * 0.005);
          ctx.lineTo(x0 + bw, y0 + headR * 0.075);
          ctx.lineTo(x0, y0 + headR * 0.155);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(186, 46, 38, 0.9)';
          ctx.beginPath();
          ctx.moveTo(x0, y0 + headR * 0.05);
          ctx.lineTo(x0 + bw, y0 - headR * 0.03);
          ctx.lineTo(x0 + bw, y0 + headR * 0.05);
          ctx.lineTo(x0, y0 + headR * 0.13);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (feature === 5 && !rig.hurt) {
      // Freckles: a scatter across the nose bridge and cheeks.
      ctx.fillStyle = shade(skin, -22);
      const spots: readonly (readonly [number, number])[] = [
        [-0.34, 0.24],
        [-0.18, 0.32],
        [-0.02, 0.26],
        [0.14, 0.33],
        [0.3, 0.25],
        [0.05, 0.4],
      ];
      // Each spot projects at its own bearing — the scatter bunches
      // toward the leading edge and wraps off spot by spot.
      for (const [ox, oy] of spots) {
        const u = ox * 1.2;
        if (featK(u) <= 0.15) continue;
        ctx.fillRect(
          featX(u),
          eyeLineY + oy * headR,
          headR * 0.055,
          headR * 0.055,
        );
      }
    }
    // Facial hair: a BAND around the jaw on the shared skull ring
    // (beard.ts), painted over the cheek marks it would really cover
    // and under the teeth that grow in front of it.
    drawBeard(ctx, hairFrame, rig.look?.beard ?? 0, cover);
    // Tusks and fangs rise off the underbite — teeth in front of skin.
    if (feature === 1 || feature === 2) {
      const big = feature === 1;
      const ivory = rig.hurt ? '#ffffff' : '#eae1c8';
      // The underbite: a dark mouth line the teeth rise out of, so
      // they grow from a jaw instead of floating on the chin.
      if (!rig.hurt) {
        const mw = headR * (big ? 0.42 : 0.3) * (1 - 0.25 * profileK);
        ctx.fillStyle = shade(skin, -30);
        ctx.beginPath();
        chamferRect(
          ctx,
          pairX - mw,
          headY + hh * (big ? 0.76 : 0.68),
          mw * 2,
          headR * 0.07,
          headR * 0.03,
        );
        ctx.fill();
      }
      for (const es of [-1, 1]) {
        const tu = es * (big ? 0.343 : 0.251);
        const wK = featK(tu);
        if (wK <= 0.05) continue;
        const bx = featX(tu);
        const baseY = headY + hh * (big ? 0.82 : 0.72);
        const len = headR * (big ? 0.52 : 0.28);
        const w = headR * (big ? 0.15 : 0.1) * wK;
        const tipX = bx + es * headR * (big ? 0.1 : 0.04);
        ctx.fillStyle = ivory;
        ctx.beginPath();
        ctx.moveTo(bx - w, baseY);
        ctx.lineTo(bx + w, baseY);
        ctx.lineTo(tipX, baseY - len);
        ctx.closePath();
        ctx.fill();
        if (!rig.hurt) {
          // Inner-edge shade curves the tooth; a glint caps the tip.
          ctx.strokeStyle = shade(ivory, -24);
          ctx.lineWidth = headR * (big ? 0.035 : 0.025);
          ctx.beginPath();
          ctx.moveTo(bx - es * w * 0.6, baseY);
          ctx.lineTo(tipX - es * headR * 0.03, baseY - len * 0.8);
          ctx.stroke();
          if (big) {
            ctx.fillStyle = '#f8f3e4';
            ctx.fillRect(
              tipX - headR * 0.035,
              baseY - len + headR * 0.02,
              headR * 0.07,
              headR * 0.07,
            );
          }
        }
      }
    }
  }
  } // end of the flesh head/hair/face branch (skeletal drew the skull)

  // Head gear: styled kinds (dome, greathelm, hood, circlet, horned) —
  // the classic dome is the fallback, so every helm is already dressed.
  if (helmSt) {
    drawHelmet(ctx, helmSt, {
      s,
      headX,
      headY,
      hw,
      hh,
      cut,
      headR,
      fx,
      profileK,
      backK,
      lead,
      hurt: rig.hurt,
      nowMs: rig.nowMs,
    });
  }
  ctx.restore();

  // A back-facing quiver reads over the torso, like a cape's front side.
  if (quiverFront) paintQuiver();
  // Stowed gear on the near side of the body paints over the torso —
  // the back sling when facing away, the belt pieces face-on, and the
  // off scabbard's leading hip at profile — but UNDER the arms, so a
  // hand hanging beside the hip reads in front of its own scabbard.
  if (stowed && wornBack && slingFront && !rig.hasCape) paintStowedMain();
  if (stowed && !wornBack && !beltBehind) paintStowedMain();
  if (stowed && offWorn && beltBehind) paintStowedOff();

  // ---- weapon + striking arm in front of the torso (the bold read) —
  // unless the dual-wield profile flip already painted them behind it,
  // in which case the NEAR (off) arm is the foremost thing instead.
  // Facing the camera the off arm joins the front layer too — under
  // the main pair, so the weapon stays the boldest thing on screen.
  // THE FACE SANDWICH's over station: the skral front-layer arms
  // painted their upper segments under the head above — here only the
  // forearm + webbed hand land, emerging past the skull's silhouette.
  const seg = skr ? ('over' as const) : undefined;
  if (offFront && !headOverArms) paintOffArm(seg);
  if (!weaponBehind && !mainBehind && !headOverArms) {
    // A split carry keeps only its near range here — the far half
    // already painted under the torso.
    paintWeapon(splitNear ?? undefined);
    paintMainArm(seg);
  }
  if (mainBehind) paintOffArm(seg);
  // Visible shoulder caps paint over everything on their layer — the
  // near cap over its arm's root, and from behind, both caps over the
  // backplate where the camera can actually see them.
  paintPauldrons('front');
  // Camera-side wing ears land over the finished body — the elastic
  // pair's near half, seated on the skull the head painter just drew.
  if (paintEars) paintEars('front');
}

/**
 * Back-mounted gear layered relative to the CAPE — called by the
 * renderer immediately after the cape paints, so a quiver straps OVER
 * the cloth (gear goes over a cape, never under it). Recomputes the
 * few shoulder measurements it needs; drawHumanoid skips its internal
 * quiver whenever hasCape is set.
 */
export function drawBackGear(ctx: CanvasRenderingContext2D, rig: RigPose): void {
  const st = rig.offhandItem ? offhandStyle(rig.offhandItem) : null;
  const worn = itemDef(rig.weaponItem ?? '');
  // ONE CLASS, ONE DETECTION — the cape-layer stow reads the same
  // wieldClass the main solve does; the two stow sites can't drift.
  const stowedKind = worn !== undefined ? wieldClass(worn.id) : 'none';
  const stowedGreat = stowedKind === 'great';
  const stowedBow = stowedKind === 'bow';
  const stowedStaff = stowedKind === 'staff';
  const stowedPole = stowedKind === 'pole';
  const sling =
    (rig.sheathT ?? 0) >= STOW_HANDOFF && (stowedBow || stowedStaff || stowedGreat || stowedPole);
  if (st?.kind !== 'quiver' && !sling) return;
  const k = rig.size ?? 1;
  const s = rig.scale * k;
  const fx = Math.cos(rig.dir);
  const crouch =
    rig.pose === PoseState.Sneak
      ? Math.min(1, rig.poseT)
      : rig.pose === PoseState.Milk
        ? 0.55 * Math.min(1, rig.poseT)
        : rig.pose === PoseState.Build
          ? // The raiser kneels to the work; the stow gear on the
            // back ducks with the same body (both copies of this
            // const stay identical — the drawBackGear twin law).
            0.3 * Math.min(1, rig.poseT)
          : 0;
  const hipY = rig.y - (rig.rise + rig.bob * 0.45) * s + 0.11 * s * crouch;
  const wS = rig.wScale;
  const hScale = 1 + (1 - wS) * 0.55;
  const th = TORSO_RISE_S * s * (1 - 0.12 * crouch);
  const shoulderY = hipY - th * hScale + SHOULDER_Y_DROP_S * s;
  const lead = fx >= 0 ? 1 : -1;
  if (st?.kind === 'quiver') {
    drawQuiver(ctx, st, rig.x - fx * 0.14 * s, shoulderY - 0.02 * s, s, lead, rig.hurt, rig.nowMs);
  }
  // A stowed bow/staff straps over the cape exactly like the quiver.
  if (sling && worn) {
    const side = rig.depthMemory?.side ?? (Math.sign(fx) || 1);
    const spot = stowBack(
      stowedBow ? 'bow' : stowedGreat ? 'great' : stowedPole ? 'pole' : 'staff',
      side,
    );
    drawHeldItem(
      ctx,
      worn.id,
      worn.color,
      rig.x - fx * 0.14 * s + spot.dx * s * wS,
      shoulderY + spot.dy * s,
      spot.angle,
      s,
      rig,
      { ench: rig.weaponEnch, carry: stowedBow ? 1 : 0, grip: 0.5 },
    );
  }
}

/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Part library: how each holdable draws in the hand. */
/**
 * Enchant fx channels per weapon family. Tier 1 is a colored glint;
 * tiers 2-3 ride the element's full mote channel. Staffs speak their
 * own fx dialect, so each element maps twice.
 */
const ENCH_BLADE_FX: Record<string, BladeFx> = {
  ember: 'ember',
  frost: 'frost',
  storm: 'storm',
  blood: 'blood',
  void: 'void',
  radiant: 'sun',
  arcane: 'star',
  // NINE SCHOOLS on the weapon channel too: astral drifts a small
  // constellation (never arcane's hard twinkle), and verdant grows a
  // living tendril instead of borrowing the tier-1 gleam.
  astral: 'drift',
  verdant: 'tendril',
};
const ENCH_STAFF_FX: Record<string, StaffFx> = {
  ember: 'embers',
  frost: 'frost',
  storm: 'sparks',
  blood: 'drip',
  void: 'motes',
  radiant: 'rays',
  arcane: 'runes',
  astral: 'stars',
  verdant: 'leaves',
};

/**
 * Overlay a worn working onto a resolved armor style. Null in, null
 * out, and unenchanted pieces return the SAME object they came in as —
 * this runs per piece per body per frame, so the common case must not
 * allocate.
 *
 * `runes` and `glowTrim` are recolored where a garment already owns
 * them: a robe authored with rune work keeps every shape its artist
 * drew and simply answers the bonded school instead of its own.
 */
function withArx<T extends { arx?: ArxMark; runes?: string; glowTrim?: string }>(
  itemId: string | undefined,
  st: T | null,
  slot: SlotLight | undefined,
): T | null {
  if (!st || !slot || !itemId) return st;
  // Cached on (item, school, tier). Keyed by ITEM ID rather than by the
  // style object, because the style resolvers return a registry object
  // for authored gear but build a fresh derived one every call for
  // anything unstyled — an identity cache would miss those every frame
  // forever. The id is stable for both, so this is one Map hit in the
  // steady state instead of five style clones per body per frame.
  const key = `${itemId}|${slot.element}|${slot.tier}`;
  const hit = ARX_STYLE_CACHE.get(key) as T | undefined;
  if (hit) return hit;
  const mark = arxMark(slot)!;
  const out: T = { ...st, arx: mark };
  // A garment that authored its own rune work keeps every shape its
  // artist drew and simply answers the bonded school in hue.
  if (st.runes) out.runes = mark.mid;
  if (st.glowTrim) out.glowTrim = mark.core;
  if (ARX_STYLE_CACHE.size >= ARX_STYLE_CACHE_MAX) ARX_STYLE_CACHE.clear();
  ARX_STYLE_CACHE.set(key, out);
  return out;
}

/**
 * Bounded because the key space is (worn item x school x tier) and a
 * session only ever sees the gear that walks past it. Cleared wholesale
 * rather than evicted one by one: this is a render cache, and rebuilding
 * it costs one clone per visible piece on a single frame.
 */
const ARX_STYLE_CACHE = new Map<string, object>();
const ARX_STYLE_CACHE_MAX = 512;

/**
 * Overlay an enchant's fx channel on a resolved weapon style — the
 * style object is data, so a shallow clone re-aims the existing mote
 * painters at the enchant's element without touching the silhouette.
 */
export function enchantedStyle<T extends { fx?: unknown; fxColor?: string; aura?: string }>(
  st: T,
  ench: string | undefined,
  family: 'blade' | 'staff',
): T {
  const def = ench ? enchantDef(ench) : undefined;
  if (!def) return st;
  const color = ELEMENT_COLORS[def.element];
  if (def.tier <= 1) {
    // A whisper of Arx: the traveling glint (staffs: drifting motes).
    return { ...st, fx: family === 'staff' ? 'motes' : 'gleam', fxColor: color };
  }
  const out: T = {
    ...st,
    fx:
      family === 'staff'
        ? (ENCH_STAFF_FX[def.element] ?? 'motes')
        : (ENCH_BLADE_FX[def.element] ?? 'gleam'),
    fxColor: color,
  };
  // THE AURA BLADE: a tier-5 working stands a second edge a hand's
  // width off the steel (drawBladeFx paints it under the fx channel).
  if (family === 'blade' && def.tier >= 5) out.aura = color;
  return out;
}

function drawHeldItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  color: string,
  hx: number,
  hy: number,
  angle: number,
  s: number,
  rig: RigPose,
  /**
   * Bow: string pull-back (px), release progress, and rest-carry blend
   * (0 aiming → 1 settled: slides the grip wrap into the fist so the
   * bow is carried by the wood, not the string). Staff: grip height.
   * ench: enchant id riding this instance — overlays its fx channel.
   * flip: mirror across the long axis — a reversed fist turns the
   * edge (and any guard/blade asymmetry) the other way.
   */
  extra?: {
    pull?: number;
    loose?: number;
    grip?: number;
    carry?: number;
    ench?: string;
    flip?: boolean;
    /**
     * THE PROJECTION LAW's length: 1 in the screen plane, shrinking as
     * the carry points into (or out of) the scene. Rod classes
     * compress along their long axis (local x); the bow — whose length
     * runs local ±y — compresses across it. The foreshortening is what
     * tells the eye the item lives in the world's depth.
     */
    fore?: number;
    /**
     * THE PIERCED CARRY's keep-range, item-local units of s along the
     * shaft axis (fist at 0). The rig paints a long body-crossing
     * carry twice — the far range under the torso, the near range
     * over it — and the clip rides every transform the art does (fore
     * compression included), so the two passes always meet on the
     * same shaft station, hidden under the body mass.
     */
    clipLo?: number;
    clipHi?: number;
    /**
     * THE PATIENT LINE: a rod mid-cast — the art's decorative dangle
     * (line + bobber off the tip) stays home, because the CAST line
     * to the water is painted by the rig on the real bearing.
     */
    rodCast?: boolean;
  },
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  if (extra?.flip) ctx.scale(1, -1);
  // ONE CLASS, ONE DETECTION (arms-v3 Phase 2): the painter's branch
  // SELECTION reads wieldClass — the same single detection the solve
  // and the stows use — while each branch still resolves its colored
  // style for the art. Tools and rods stay their own interleaved
  // probes: they are paintability questions (toolStyle), not carry
  // classes, and wieldClass pins them 'none' by test.
  const kind = wieldClass(itemId);
  const fore = extra?.fore ?? 1;
  if (fore !== 1) {
    if (kind === 'bow') ctx.scale(1, fore);
    else ctx.scale(fore, 1);
  }
  // Mid-arc wood point: the bow's belly passes through x = BOW_GRIP_X·s
  // at grip height BY CONSTRUCTION (weapons.ts owns the constant and
  // the quadratic that guarantees it) — align THAT to the fist, or the
  // bow reads as resting on the wrist.
  if (extra?.carry) ctx.translate(-BOW_GRIP_X * s * extra.carry, 0);
  // The pierced-carry clip, applied in the art's own final space so
  // the station lives ON the shaft through flip and foreshortening.
  if (extra?.clipLo !== undefined || extra?.clipHi !== undefined) {
    const lo = extra?.clipLo ?? -99;
    const hi = extra?.clipHi ?? 99;
    ctx.beginPath();
    ctx.rect(lo * s, -4 * s, (hi - lo) * s, 8 * s);
    ctx.clip();
  }

  // The item-space envelope each roster's art can reach — the outline
  // scratch is sized from this, so keep it tight per class (a bow is
  // tall, a blade is long, and paying the widest box for every belt
  // knife would bill the whole town).
  let env: readonly [number, number, number];
  let paint: (c: CanvasRenderingContext2D) => void;
  if (kind === 'great') {
    // (Check-great-first lives inside wieldClass now.) The grip
    // slides with the carry exactly like the staff's — high on the
    // shouldered rest, mid-haft through the cuts.
    env = [-1.3, 1.3, 0.45];
    paint = (c) => drawGreatweapon(c, greatStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.grip ?? 0.2);
  } else if (kind === 'blade') {
    // The blade + rogue rosters: every sword AND dagger resolves a
    // style — bespoke silhouette, guard, pommel, living fx channel.
    // Unknown '*sword'/'*dagger' ids get color-derived fallbacks.
    env = [-0.5, 1.2, 0.32];
    paint = (c) => drawSword(c, enchantedStyle(bladeStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt);
  } else if (kind === 'pole') {
    // The reaching school's roster: head archetype, haft, wrap and
    // furniture. Sits AHEAD of the tool probe for the check-great-first
    // reason — a 'poleaxe' is a weapon, not a woodcutter's axe. The
    // grip slides with the carry exactly as the staff's does: mid-haft
    // at the port, back toward the butt through the thrusts.
    // DEFERRED: enchantedStyle speaks the 'blade'/'staff' families
    // only and drawPole paints no fx channel yet — the pole's enchant
    // look lands with THE ARMORY (docs/polearm-plan.md Phase 4).
    env = [-1.2, 1.6, 0.35];
    paint = (c) => drawPole(c, poleStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.grip ?? 0.44);
  } else if (toolStyle(itemId, color) && !itemId.includes('rod')) {
    // The gatherer's roster: every axe and pickaxe resolves a style —
    // bespoke head, haft furniture, collar lashing, starsteel fx.
    // BIT-LEADS LAW: the head is authored with the bit on −y; a chop
    // facing right sweeps clockwise, so mirror the head across the
    // haft there — the honed edge (not the poll) buries in the work
    // at the bite, whichever way the body faces.
    env = [-0.7, 1.0, 0.35];
    paint = (c) => {
      c.save();
      if (Math.cos(rig.dir) > 0) c.scale(1, -1);
      drawTool(c, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt);
      c.restore();
    };
  } else if (kind === 'bow') {
    // The archer's roster: every bow resolves a style — limb kind,
    // wood, tip furniture, charms, and the living fx channel. The
    // painter keeps the classic behaviors: limbs flex with the pull,
    // the string hauls to the nock, release buzzes it straight.
    env = [-0.5, 0.7, 0.85];
    paint = (c) => drawBow(c, enchantedStyle(bowStyle(itemId, color)!, extra?.ench, 'blade'), s, rig.nowMs, rig.hurt, extra?.pull ?? 0, extra?.loose);
  } else if (kind === 'staff') {
    // The archmage's roster: every staff resolves a style — shaft
    // grammar, signature crown, element focus, living fx. The grip
    // slides with the carriage — high on a planted walking stick,
    // mid-shaft when the business end levels at something — and the
    // focus flares while a cast leaves.
    const castT = rig.pose === PoseState.Cast ? rig.poseT : 0;
    env = [-1.1, 1.5, 0.35];
    paint = (c) => drawStaff(c, enchantedStyle(staffStyle(itemId, color)!, extra?.ench, 'staff'), s, rig.nowMs, rig.hurt, extra?.grip ?? 0.34, castT);
  } else if (itemId.includes('rod')) {
    env = [-0.7, 1.0, 0.35];
    paint = (c) => drawTool(c, toolStyle(itemId, color)!, s, rig.nowMs, rig.hurt, extra?.rodCast);
  } else {
    env = [-0.1, 0.35, 0.18];
    paint = (c) => {
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(0.04 * s, -0.05 * s, 0.16 * s, 0.1 * s, 0.03 * s);
      c.fill();
    };
  }
  paintHeldOutlined(ctx, s, env, paint);
  ctx.restore();
}

// ---- THE WEAPON WEARS ITS OWN OUTLINE (the shield law bd69422,
// extended to everything a hand holds): the renderer's dilate rings
// the composed BODY silhouette, so a weapon crossing the torso met the
// shirt with no line at all and the two masses read as one blob. In
// this game every separate object is ringed — so the held item strikes
// its own ring, in the world's outline colour at the dilate's own
// weight, from its own alpha: paint the art into scratch A under the
// live transform, stamp eight tinted taps of it (scratch B) UNDER the
// art, then the art itself. Device-pixel identity blits — the
// bakeOutlineRing recipe, scratches module-scoped and grow-only.
//
// THE RING NEVER DOUBLES: the renderer's body dilate rings whatever
// alpha the rig leaves in its scratch — if this ring extended the
// weapon's silhouette, the exposed edges would wear this ring PLUS the
// body's ring around it (a 2r band against the body's r). So the ring
// is stamped `source-atop`: it exists ONLY over pixels the rig has
// already painted (the body the weapon crosses), and the exposed
// silhouette stays bare for the body pass to ring exactly once.
let heldOlA: HTMLCanvasElement | null = null;
let heldOlACtx: CanvasRenderingContext2D | null = null;
let heldOlB: HTMLCanvasElement | null = null;
let heldOlBCtx: CanvasRenderingContext2D | null = null;
const HELD_OL_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Paint a held item with its own outline ring. `env` is the item-space
 * envelope [x0, x1, ±y] in units of s. Contexts without full canvas
 * support (test stubs) fall back to ringless direct paint.
 */
function paintHeldOutlined(
  ctx: CanvasRenderingContext2D,
  s: number,
  env: readonly [number, number, number],
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  if (!heldOlA && typeof document !== 'undefined' && typeof ctx.getTransform === 'function') {
    heldOlA = document.createElement('canvas');
    heldOlB = document.createElement('canvas');
    heldOlACtx = heldOlA.getContext('2d');
    heldOlBCtx = heldOlB.getContext('2d');
  }
  const a = heldOlACtx;
  const b = heldOlBCtx;
  if (!a || !b || typeof ctx.getTransform !== 'function') {
    paint(ctx);
    return;
  }
  const m = ctx.getTransform();
  const x0 = env[0] * s;
  const x1 = env[1] * s;
  const ey = env[2] * s;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of [[x0, -ey], [x1, -ey], [x0, ey], [x1, ey]] as const) {
    const dx = m.a * px + m.c * py + m.e;
    const dy = m.b * px + m.d * py + m.f;
    if (dx < minX) minX = dx;
    if (dx > maxX) maxX = dx;
    if (dy < minY) minY = dy;
    if (dy > maxY) maxY = dy;
  }
  // Ring weight = the renderer's dilate in device pixels: the matrix
  // norm carries dpr (and any bake scale) into the item's px scale.
  const norm = Math.hypot(m.a, m.b) || 1;
  const ring = Math.max(1.25, s * norm * 0.04);
  const ri = Math.max(1, Math.round(ring));
  const rd = Math.max(1, Math.round(ring * 0.71));
  const pad = ri + 3;
  const ox = Math.floor(minX) - pad;
  const oy = Math.floor(minY) - pad;
  const w = Math.ceil(maxX) + pad - ox;
  const h = Math.ceil(maxY) + pad - oy;
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) {
    paint(ctx);
    return;
  }
  if (heldOlA!.width < w) heldOlA!.width = w;
  if (heldOlA!.height < h) heldOlA!.height = h;
  if (heldOlB!.width < w) heldOlB!.width = w;
  if (heldOlB!.height < h) heldOlB!.height = h;
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.clearRect(0, 0, w, h);
  a.setTransform(m.a, m.b, m.c, m.d, m.e - ox, m.f - oy);
  paint(a);
  a.setTransform(1, 0, 0, 1, 0, 0);
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, w, h);
  for (const [tx, ty] of HELD_OL_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    b.drawImage(heldOlA!, 0, 0, w, h, tx * (diag ? rd : ri), ty * (diag ? rd : ri), w, h);
  }
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = '#241a2e';
  b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.drawImage(heldOlB!, 0, 0, w, h, ox, oy, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(heldOlA!, 0, 0, w, h, ox, oy, w, h);
  ctx.restore();
}

/**
 * Beast bodies: every non-humanoid NPC walks on the same universal
 * LegRig as the player — planted feet, committed steps, two-segment
 * IK. Each species is a spec: where its legs live under the body,
 * how its joints bend, and what its feet look like.
 *
 * Joint law: front legs bow FORWARD at the knee, hind legs bow
 * BACKWARD at the hock — the classic quadruped silhouette. Birds bow
 * BACKWARD (the visible joint on a bird leg is the ankle). The
 * preference is anatomical and constant; it never flips with travel.
 */
export interface BeastSpec {
  rig: LegRigConfig;
  /** Half-length of the body mass along the facing (tiles). */
  bodyLen: number;
  /** Body-mass center height above ground (tiles). */
  bodyRise: number;
  /** Per-leg joint bow along the facing: +1 forward, -1 backward. */
  kneeFwd: number[];
  /** Where legs attach, as fractions of the leg spec offsets. */
  hipFwd: number;
  hipSide: number;
  /** Upper-leg thickness (tiles). */
  legW: number;
  foot: 'hoof' | 'paw' | 'claw' | 'bearpaw' | 'turtleclaw' | 'crabspike' | 'lizardclaw';
  /**
   * Species foot-size dial: multiplies the foot painter's base width
   * (which derives from legW). Heavy-bodied walkers whose legs are
   * already thick relative to their feet (cattle) push past 1; absent
   * = 1, the proportion the mid-size walkers wear.
   */
  footScale?: number;
  /** Bare shanks (chicken) instead of body-shaded legs. */
  legColor?: string;
  /**
   * Unequal limb bones: the UPPER bone's fraction of the total leg
   * length, [front, hind]. A cat carries a long thigh over a short
   * hock; absent = the equal-bone solve every other species runs.
   */
  segSplit?: [number, number];
}

/** Diagonal trot pairs: FL+BR swing together, FR+BL together. */
function quadLegs(fwd: number, side: number): LegRigConfig['legs'] {
  return [
    { fwd, side: -side, group: 0 },
    { fwd, side, group: 1 },
    { fwd: -fwd, side: -side, group: 1 },
    { fwd: -fwd, side, group: 0 },
  ];
}

const BEAST_SPECS: Record<string, BeastSpec> = {
  cow: {
    rig: {
      legs: quadLegs(0.3, 0.16),
      legLen: 0.33,
      rise: 0.29,
      liftAmp: 0.055,
      runSpeed: 1.8,
      turnRate: 4.5,
    },
    bodyLen: 0.48,
    bodyRise: 0.36,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    legW: 0.095,
    foot: 'hoof',
    // Cattle legs are already thick — the standard hoof proportion
    // over-blocks them, so the dial runs BELOW one (the 1.3 cut made
    // slippers; a hoof is barely wider than the cannon above it).
    footScale: 0.85,
    legColor: '#d9ccb8',
  },
  bull: {
    rig: {
      legs: quadLegs(0.32, 0.17),
      legLen: 0.35,
      rise: 0.31,
      liftAmp: 0.055,
      runSpeed: 2.4,
      turnRate: 4,
    },
    bodyLen: 0.52,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    legW: 0.105,
    foot: 'hoof',
    footScale: 0.85,
    legColor: '#584a3d',
  },
  wolf: {
    rig: {
      legs: quadLegs(0.28, 0.12),
      legLen: 0.38,
      rise: 0.325,
      liftAmp: 0.1,
      runSpeed: 4.6,
      turnRate: 8,
    },
    bodyLen: 0.4,
    bodyRise: 0.4,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.075,
    foot: 'paw',
    legColor: '#5d6270',
  },
  // The matriarch: longer-limbed and heavier than any wolf — she
  // covers ground in strides the pack can't match.
  dire_wolf: {
    rig: {
      legs: quadLegs(0.34, 0.15),
      legLen: 0.47,
      rise: 0.4,
      liftAmp: 0.11,
      runSpeed: 4.8,
      turnRate: 7,
    },
    bodyLen: 0.52,
    bodyRise: 0.49,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.1,
    foot: 'paw',
    legColor: '#3e3a48',
  },
  // OLD FANG: the crown's carriage — longer-strided than the wolf,
  // leaner than the dire, built around THE LOPE (the break-away
  // sprint is his signature move, and the legs must sell it).
  wolf_oldfang: {
    rig: {
      legs: quadLegs(0.32, 0.14),
      legLen: 0.45,
      rise: 0.38,
      liftAmp: 0.105,
      runSpeed: 4.8,
      turnRate: 8,
    },
    bodyLen: 0.5,
    bodyRise: 0.46,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.09,
    foot: 'paw',
    legColor: '#5a5448',
  },
  // THE COURT'S HOUND: the tallest, longest-legged canid in the wood
  // — never the dire's wall. The carriage is a gazehound's: stilted
  // height over a hard tuck, a floating high-lift stride, and the
  // quickest turn any wolf owns. The speed is the legend — only the
  // court's hound outpaces a worg.
  fey_wolf: {
    rig: {
      legs: quadLegs(0.37, 0.16),
      legLen: 0.56,
      // Hips seated INSIDE the haunch: the rise meets the stifle
      // drop's belly line so the leg roots emerge from the body at
      // every band, never from the air beside a pinched stern.
      rise: 0.49,
      liftAmp: 0.115,
      runSpeed: 5.2,
      turnRate: 9,
    },
    // The streamline pass: a touch shorter in the barrel than the
    // first cut — reach lives in the LEGS and the neck, and a long
    // hull on a narrow beam was starting to read train-car.
    bodyLen: 0.56,
    bodyRise: 0.56,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    // Fine-boned for its height: a dire's leg width on a taller frame
    // would read draft-horse, not court hound.
    legW: 0.09,
    foot: 'paw',
    legColor: '#7e7a98',
  },
  // The war-hound: front legs longer than the rear carriage suggests —
  // the hyena slope on the move, fast and wrong-looking.
  worg: {
    rig: {
      legs: quadLegs(0.3, 0.14),
      legLen: 0.4,
      rise: 0.33,
      liftAmp: 0.09,
      runSpeed: 5.0,
      turnRate: 9,
    },
    bodyLen: 0.46,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.085,
    foot: 'paw',
    legColor: '#4e4436',
  },
  // The tufted shadow: a short body slung between legs LONGER than a
  // wolf's — the stilted, light-footed carriage that reads "cat" the
  // moment it moves. High-stepping lift, the quickest turn in the wood.
  lynx: {
    rig: {
      legs: quadLegs(0.26, 0.11),
      legLen: 0.4,
      rise: 0.34,
      liftAmp: 0.11,
      runSpeed: 4.7,
      turnRate: 9,
    },
    bodyLen: 0.36,
    bodyRise: 0.42,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.085,
    foot: 'paw',
    // The cat's bones: a long thigh over a short hock behind, a
    // slightly long upper arm in front — the crouch-and-spring frame.
    segSplit: [0.53, 0.58],
  },
  // The year's litter: cub proportions are their own design — a short
  // body still catching up to its oversized paws and ears, never a
  // scaled-down adult.
  lynx_young: {
    rig: {
      legs: quadLegs(0.22, 0.1),
      legLen: 0.33,
      rise: 0.28,
      liftAmp: 0.11,
      runSpeed: 4.6,
      turnRate: 10,
    },
    bodyLen: 0.29,
    bodyRise: 0.35,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.07,
    foot: 'paw',
    segSplit: [0.53, 0.58],
  },
  // The duskruff: never a scaled lynx — a long low stalker whose mass
  // hangs between heavy shoulders and heavier haunches, on legs that
  // clear deadfall the pack goes around.
  lynx_champion: {
    rig: {
      legs: quadLegs(0.32, 0.14),
      legLen: 0.5,
      rise: 0.42,
      liftAmp: 0.12,
      runSpeed: 4.9,
      turnRate: 8,
    },
    bodyLen: 0.48,
    bodyRise: 0.52,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.105,
    foot: 'paw',
    legColor: '#3a3746',
    segSplit: [0.53, 0.58],
  },
  // THE FOX: the lightest hunter in the wood — a narrow-tracked frame
  // (a fox trots its feet nearly on one line) with the highest step of
  // any canid: the prance IS the gait read. Dainty bones, fast turn,
  // and the fastest ground speed in the low wood — you do not run a
  // fox down, it runs YOU down and thinks better of it.
  fox: {
    rig: {
      // A wider track than the first cut: the narrow line read
      // elegant at profile but let far legs cross the chest at the
      // quarter bands — the stance plants clear of the body now.
      legs: quadLegs(0.26, 0.115),
      legLen: 0.34,
      rise: 0.29,
      liftAmp: 0.13,
      runSpeed: 5.0,
      turnRate: 11,
    },
    // A touch shorter in the chest: the body defers to the brush.
    bodyLen: 0.32,
    bodyRise: 0.33,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.88,
    hipSide: 0.6,
    legW: 0.055,
    foot: 'paw',
    // The slightly long forearm over a fine pastern, the long thigh
    // behind — the featherweight spring, lighter than the cat's.
    segSplit: [0.52, 0.57],
  },
  // The dire fox: never a scaled fox and never the dire wolf's mass —
  // she is RANGY: legs longer than her body says they should be, a
  // deep but narrow chest, and the whole frame carried on the same
  // dainty feet. Where the dire wolf is a wall, the matriarch is a
  // blade's edge moving faster than anything her size.
  fox_champion: {
    rig: {
      legs: quadLegs(0.33, 0.14),
      legLen: 0.46,
      rise: 0.38,
      liftAmp: 0.12,
      runSpeed: 5.2,
      turnRate: 10,
    },
    bodyLen: 0.43,
    bodyRise: 0.45,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.88,
    hipSide: 0.6,
    legW: 0.07,
    foot: 'paw',
    segSplit: [0.52, 0.57],
  },
  rat: {
    rig: {
      legs: quadLegs(0.19, 0.13),
      legLen: 0.17,
      rise: 0.13,
      liftAmp: 0.05,
      runSpeed: 3.2,
      turnRate: 10,
    },
    bodyLen: 0.34,
    bodyRise: 0.19,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.048,
    foot: 'paw',
    legColor: '#786a5b',
  },
  chicken: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.075, group: 0 },
        { fwd: -0.02, side: 0.075, group: 1 },
      ],
      legLen: 0.2,
      rise: 0.17,
      liftAmp: 0.07,
      runSpeed: 2,
      turnRate: 9,
    },
    bodyLen: 0.28,
    bodyRise: 0.28,
    kneeFwd: [-1, -1], // bird ankles bow backward
    hipFwd: 0.9,
    hipSide: 0.9,
    legW: 0.035,
    foot: 'claw',
    legColor: '#e8a33d',
  },
  // The great owl: a two-post strider — bird ankles bow backward like
  // the chicken's, but the mass they carry is a keg the henyard never
  // dreamed of. Modest on foot; the kill lives in the pounce lunge.
  great_owl: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.11, group: 0 },
        { fwd: -0.02, side: 0.11, group: 1 },
      ],
      legLen: 0.34,
      rise: 0.28,
      liftAmp: 0.085,
      runSpeed: 4.4,
      turnRate: 8,
    },
    bodyLen: 0.3,
    bodyRise: 0.5,
    kneeFwd: [-1, -1], // bird ankles bow backward
    hipFwd: 0.9,
    hipSide: 0.85,
    legW: 0.062,
    foot: 'claw',
    legColor: '#c7b697',
  },
  // The elder: longer-shanked and half again the hunter's keg — the
  // high seat of the parliament walks like it owns the glade.
  elder_great_owl: {
    rig: {
      legs: [
        { fwd: -0.02, side: -0.13, group: 0 },
        { fwd: -0.02, side: 0.13, group: 1 },
      ],
      legLen: 0.42,
      rise: 0.35,
      liftAmp: 0.09,
      runSpeed: 4.6,
      turnRate: 7,
    },
    bodyLen: 0.38,
    bodyRise: 0.64,
    kneeFwd: [-1, -1],
    hipFwd: 0.9,
    hipSide: 0.85,
    legW: 0.078,
    foot: 'claw',
    legColor: '#a8adbd',
  },
  // THE RAZOR HUMP: short thick drivers under a front-loaded wedge —
  // a wider track than the old stilts (far legs never cross the chest
  // at quarter bands) and a lower ride, built to shove.
  boar: {
    rig: {
      legs: quadLegs(0.24, 0.14),
      legLen: 0.24,
      rise: 0.2,
      liftAmp: 0.06,
      runSpeed: 3.8,
      turnRate: 7.5,
    },
    bodyLen: 0.4,
    bodyRise: 0.26,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.6,
    legW: 0.085,
    foot: 'hoof',
    footScale: 0.9,
    legColor: '#3a2c21',
  },
  // THE MOUNTAIN AT THE SHOULDER: the dire boar is a DESIGN, never an
  // upscale — longer-boned than its cousin with the front pair
  // carrying a bison tower, split long-forearm over short cannon, on
  // cloven hooves sized to the leg (never slippers).
  dire_boar: {
    rig: {
      legs: quadLegs(0.31, 0.18),
      legLen: 0.34,
      rise: 0.29,
      liftAmp: 0.07,
      runSpeed: 4.2,
      turnRate: 6.5,
    },
    bodyLen: 0.54,
    bodyRise: 0.36,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.58,
    legW: 0.13,
    foot: 'hoof',
    footScale: 0.85,
    legColor: '#26201f',
    segSplit: [0.56, 0.54],
  },
  bear: {
    rig: {
      legs: quadLegs(0.3, 0.17),
      legLen: 0.34,
      rise: 0.29,
      liftAmp: 0.07,
      runSpeed: 4.0,
      turnRate: 5.5,
    },
    bodyLen: 0.52,
    bodyRise: 0.38,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.5,
    // A bear's limbs are TRUNKS: the thickest legs of the mid-size
    // walkers, with the long-femur/low-hock bone split — anything
    // thinner reads as a boar on stilts under the new clawed paws.
    legW: 0.2,
    foot: 'bearpaw',
    legColor: '#302620',
    segSplit: [0.52, 0.6],
  },
  // THE SNAPPER: a low long vault DRAGGING its rim near the ground on
  // a crocodilian sprawl — the widest relative track in the wood,
  // short thick legs, a shuffle that never truly hurries. Mass-law
  // spoken: slow cadence, short stride, the body barely leaves its
  // own line.
  giant_turtle: {
    rig: {
      legs: quadLegs(0.32, 0.24),
      // STUBBY IS THE SPECIES: the shortest, thickest legs of any
      // walker — barely more than feet with knees.
      legLen: 0.17,
      rise: 0.1,
      liftAmp: 0.045,
      runSpeed: 1.5,
      turnRate: 2.5,
    },
    bodyLen: 0.56,
    bodyRise: 0.2,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.8,
    hipSide: 0.78,
    legW: 0.15,
    foot: 'turtleclaw',
    legColor: '#6f7c50',
  },
  // THE MOUNTAIN: never a scaled snapper — a HIGH tortoise dome on
  // true elephant columns with daylight under the keep. The front
  // pair anchors wider and further forward than the hind (the
  // front-heavy tor of the old plates), the bones split long-thigh
  // over short shank, and the cadence drops again — a landmark's
  // patience.
  colossus_turtle: {
    rig: {
      legs: [
        { fwd: 0.48, side: -0.3, group: 0 },
        { fwd: 0.48, side: 0.3, group: 1 },
        { fwd: -0.44, side: -0.26, group: 1 },
        { fwd: -0.44, side: 0.26, group: 0 },
      ],
      // Columns, not stilts: short thick posts under the daylight —
      // a mountain squats on footings, it does not stride on stilts.
      legLen: 0.3,
      rise: 0.2,
      liftAmp: 0.055,
      runSpeed: 1.05,
      turnRate: 2,
    },
    bodyLen: 0.85,
    bodyRise: 0.4,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.82,
    hipSide: 0.72,
    legW: 0.25,
    foot: 'turtleclaw',
    legColor: '#68705a',
    // Elephant bones: long thigh over a short shank, front and hind.
    segSplit: [0.56, 0.52],
  },
  ram: {
    rig: {
      legs: quadLegs(0.23, 0.13),
      legLen: 0.29,
      rise: 0.25,
      liftAmp: 0.06,
      runSpeed: 3.4,
      turnRate: 7,
    },
    bodyLen: 0.36,
    bodyRise: 0.3,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.058,
    foot: 'hoof',
    legColor: '#6b5a48',
  },
  // The ewe: shorter-legged and rounder than her crag cousin — a
  // placid amble, never a charger's stance. Dark slim legs vanish
  // under the fleece cloud.
  sheep: {
    rig: {
      legs: quadLegs(0.2, 0.12),
      legLen: 0.26,
      rise: 0.22,
      liftAmp: 0.05,
      runSpeed: 3.0,
      turnRate: 6,
    },
    bodyLen: 0.34,
    bodyRise: 0.27,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.05,
    foot: 'hoof',
    legColor: '#4f4234',
  },
  stag: {
    rig: {
      legs: quadLegs(0.26, 0.13),
      legLen: 0.42,
      rise: 0.37,
      liftAmp: 0.09,
      runSpeed: 4.4,
      turnRate: 7,
    },
    bodyLen: 0.38,
    bodyRise: 0.44,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.052,
    foot: 'hoof',
    legColor: '#8a6f4d',
  },
  // The stag's build a hand smaller — same gait, same high daylight
  // under the belly, so the herd reads as one species at a glance.
  hind: {
    rig: {
      legs: quadLegs(0.24, 0.12),
      legLen: 0.4,
      rise: 0.35,
      liftAmp: 0.085,
      runSpeed: 4.4,
      turnRate: 7,
    },
    bodyLen: 0.34,
    bodyRise: 0.42,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.048,
    foot: 'hoof',
    legColor: '#93764f',
  },
  // Six legs, alternating tripods: each group keeps a stable triangle
  // planted (front+rear one side, middle the other) — the insect gait.
  mudcrab: {
    rig: {
      legs: [
        { fwd: 0.13, side: -0.19, group: 0 },
        { fwd: 0.13, side: 0.19, group: 1 },
        { fwd: 0, side: -0.22, group: 1 },
        { fwd: 0, side: 0.22, group: 0 },
        { fwd: -0.13, side: -0.19, group: 0 },
        { fwd: -0.13, side: 0.19, group: 1 },
      ],
      legLen: 0.15,
      rise: 0.09,
      liftAmp: 0.04,
      runSpeed: 2.2,
      turnRate: 12,
    },
    bodyLen: 0.24,
    bodyRise: 0.13,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.62,
    legW: 0.032,
    foot: 'claw',
    legColor: '#8a4f38',
  },
  // THE TIDE'S RAMPART: six stilts under a walking bastion. Where the
  // mudcrab squats in the wet, the giant crab STANDS — real daylight
  // under the hull on the widest tall track in the game, long-boned
  // high knees (the raised carpus of the true crab), and a siege pace
  // that re-aims far better than it hurries. Alternating tripods keep
  // a stable triangle planted at every beat of the march.
  giant_crab: {
    rig: {
      legs: [
        { fwd: 0.2, side: -0.3, group: 0 },
        { fwd: 0.2, side: 0.3, group: 1 },
        { fwd: 0, side: -0.34, group: 1 },
        { fwd: 0, side: 0.34, group: 0 },
        { fwd: -0.2, side: -0.3, group: 0 },
        { fwd: -0.2, side: 0.3, group: 1 },
      ],
      legLen: 0.42,
      rise: 0.26,
      liftAmp: 0.06,
      runSpeed: 1.9,
      turnRate: 6,
    },
    // Wider than long is the crab law — the width lives on the look's
    // bodyW; the spec keeps the fore-aft half-length.
    bodyLen: 0.34,
    bodyRise: 0.3,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.85,
    hipSide: 0.8,
    legW: 0.075,
    foot: 'crabspike',
    legColor: '#35493f',
    // Long merus over a short driven dactyl — the high crab knee is a
    // SKELETON fact, front and hind alike.
    segSplit: [0.58, 0.58],
  },
  // THE STONE COURT (the basilisks): six-legged dracolisk kin on the
  // crab's proven alternating tripod — a stable triangle planted at
  // every beat — but SPRAWLED, not stilted: elbows out, belly low,
  // the saurian march. Front and mid knees bow forward (the lizard
  // elbow), the rear pair hocks back and DRIVES.
  fen_basilisk: {
    rig: {
      legs: [
        { fwd: 0.3, side: -0.2, group: 0 },
        { fwd: 0.3, side: 0.2, group: 1 },
        { fwd: 0, side: -0.24, group: 1 },
        { fwd: 0, side: 0.24, group: 0 },
        { fwd: -0.3, side: -0.2, group: 0 },
        { fwd: -0.3, side: 0.2, group: 1 },
      ],
      legLen: 0.17,
      // The lurker's carriage: belly a finger off the mud.
      rise: 0.08,
      liftAmp: 0.05,
      runSpeed: 2.3,
      turnRate: 7,
    },
    // The longest torso-to-height ratio in the court — a log until
    // it isn't.
    bodyLen: 0.56,
    bodyRise: 0.14,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.85,
    hipSide: 0.7,
    legW: 0.05,
    foot: 'lizardclaw',
    segSplit: [0.54, 0.54],
  },
  basilisk: {
    rig: {
      legs: [
        { fwd: 0.3, side: -0.26, group: 0 },
        { fwd: 0.3, side: 0.26, group: 1 },
        { fwd: 0, side: -0.3, group: 1 },
        { fwd: 0, side: 0.3, group: 0 },
        { fwd: -0.3, side: -0.26, group: 0 },
        { fwd: -0.3, side: 0.26, group: 1 },
      ],
      legLen: 0.3,
      // Real daylight under the trunk, but a sprawl, never stilts.
      rise: 0.15,
      liftAmp: 0.06,
      // The sluggish metabolism of the lore: it never hurries.
      runSpeed: 1.8,
      turnRate: 5.5,
    },
    bodyLen: 0.52,
    bodyRise: 0.24,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.85,
    hipSide: 0.75,
    legW: 0.09,
    foot: 'lizardclaw',
    // Long femur over a short driven shank — the sprawled push-up.
    segSplit: [0.55, 0.57],
  },
  elder_basilisk: {
    rig: {
      legs: [
        { fwd: 0.32, side: -0.28, group: 0 },
        { fwd: 0.32, side: 0.28, group: 1 },
        { fwd: 0, side: -0.32, group: 1 },
        { fwd: 0, side: 0.32, group: 0 },
        { fwd: -0.32, side: -0.28, group: 0 },
        { fwd: -0.32, side: 0.28, group: 1 },
      ],
      legLen: 0.4,
      rise: 0.2,
      liftAmp: 0.06,
      runSpeed: 1.7,
      turnRate: 5,
    },
    bodyLen: 0.66,
    bodyRise: 0.32,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.85,
    hipSide: 0.78,
    // Column limbs: the crag walks on tree trunks.
    legW: 0.13,
    foot: 'lizardclaw',
    segSplit: [0.56, 0.56],
  },
  giant_beetle: {
    rig: {
      legs: [
        { fwd: 0.16, side: -0.15, group: 0 },
        { fwd: 0.16, side: 0.15, group: 1 },
        { fwd: 0, side: -0.17, group: 1 },
        { fwd: 0, side: 0.17, group: 0 },
        { fwd: -0.16, side: -0.15, group: 0 },
        { fwd: -0.16, side: 0.15, group: 1 },
      ],
      legLen: 0.15,
      rise: 0.11,
      liftAmp: 0.045,
      runSpeed: 2.8,
      turnRate: 8,
    },
    bodyLen: 0.32,
    bodyRise: 0.17,
    kneeFwd: [1, 1, 1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.6,
    legW: 0.03,
    foot: 'claw',
    legColor: '#252c3d',
  },
  // Eight legs in two alternating tetrapods — diagonal pairs of pairs,
  // so four feet always hold the ground while four reach.
  giant_spider: {
    rig: {
      legs: [
        { fwd: 0.22, side: -0.15, group: 0 },
        { fwd: 0.22, side: 0.15, group: 1 },
        { fwd: 0.08, side: -0.17, group: 1 },
        { fwd: 0.08, side: 0.17, group: 0 },
        { fwd: -0.06, side: -0.17, group: 0 },
        { fwd: -0.06, side: 0.17, group: 1 },
        { fwd: -0.2, side: -0.15, group: 1 },
        { fwd: -0.2, side: 0.15, group: 0 },
      ],
      legLen: 0.36,
      rise: 0.17,
      liftAmp: 0.07,
      runSpeed: 4.2,
      turnRate: 9,
    },
    bodyLen: 0.34,
    bodyRise: 0.22,
    kneeFwd: [1, 1, 1, 1, -1, -1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.034,
    foot: 'paw',
    legColor: '#2e2838',
  },
  // Legless bodies: the specs exist for the corpse ragdolls (spine
  // points only) and sprite bounds — the LIVE bodies never build a
  // LegRig; they draw through their own dedicated painters.
  adder: {
    rig: { legs: [], legLen: 0.1, rise: 0.06, liftAmp: 0, runSpeed: 3.6, turnRate: 9 },
    bodyLen: 0.62,
    bodyRise: 0.08,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
  cave_bat: {
    rig: { legs: [], legLen: 0.08, rise: 0.05, liftAmp: 0, runSpeed: 4.8, turnRate: 11 },
    bodyLen: 0.24,
    bodyRise: 0.9,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.025,
    foot: 'paw',
  },
  slime: {
    rig: { legs: [], legLen: 0.06, rise: 0.04, liftAmp: 0, runSpeed: 2.6, turnRate: 9 },
    bodyLen: 0.34,
    bodyRise: 0.26,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
  slime_small: {
    rig: { legs: [], legLen: 0.05, rise: 0.03, liftAmp: 0, runSpeed: 3.0, turnRate: 9 },
    bodyLen: 0.2,
    bodyRise: 0.16,
    kneeFwd: [],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: 0.03,
    foot: 'paw',
  },
};

/**
 * Spec for a beast id — named species get their tuned rig; anything
 * new walks on a generic quadruped scaled from its collision radius,
 * so future creatures have working legs before they have a look.
 */
export function beastSpec(defId: string, radius: number, speed: number): BeastSpec {
  const known = BEAST_SPECS[defId];
  if (known) return known;
  return {
    rig: {
      legs: quadLegs(radius * 0.8, radius * 0.42),
      legLen: radius * 1.1,
      rise: radius * 0.92,
      liftAmp: radius * 0.26,
      runSpeed: Math.max(1, speed),
      turnRate: 7,
    },
    bodyLen: radius * 1.3,
    bodyRise: radius * 1.15,
    kneeFwd: [1, 1, -1, -1],
    hipFwd: 0.9,
    hipSide: 0.55,
    legW: radius * 0.2,
    foot: 'paw',
  };
}

/**
 * Cattle are drawn as true 2.5D blocks — the same dialect as the wall
 * prisms: a chamfered footprint extruded straight up, lit back slab
 * over hard-shaded flanks. Everything species-flavored (hide, patches,
 * horns, muzzle, udder) lives in this look table so the dairy cow and
 * the bull share one painter.
 */
export interface CattleLook {
  hide: string;
  /** Seeded body patches; the count says how many. */
  patch: string;
  spots: number;
  muzzle: string;
  horn: string;
  hornTip: string;
  /** Horn reach (tiles) — stubs on the cow, sweeps on the bull. */
  hornLen: number;
  udder?: string;
  noseRing?: string;
  /** A strap-hung cowbell at the throat (dairy herd charm). */
  bell?: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  bellyH: number;
  backH: number;
  /** Extra shoulder mass ramped toward the chest (bull). */
  humpH: number;
  headW: number;
  headH: number;
}

export const CATTLE_LOOKS: Record<string, CattleLook> = {
  cow: {
    hide: '#e7ddca',
    patch: '#59463a',
    spots: 3,
    muzzle: '#d8a396',
    horn: '#ddd0b2',
    hornTip: '#8d7c64',
    hornLen: 0.09,
    udder: '#e2aba1',
    bell: '#c9a24a',
    bodyW: 0.26,
    bellyH: 0.3,
    backH: 0.66,
    humpH: 0,
    headW: 0.3,
    headH: 0.26,
  },
  bull: {
    hide: '#63503f',
    patch: '#473a2e',
    spots: 2,
    muzzle: '#a08872',
    horn: '#e4d8bc',
    hornTip: '#6f6350',
    hornLen: 0.17,
    noseRing: '#d9b054',
    bodyW: 0.29,
    bellyH: 0.31,
    backH: 0.7,
    humpH: 0.14,
    headW: 0.33,
    headH: 0.29,
  },
};

function ringPath(pts: Array<{ x: number; y: number }>): Path2D {
  const p = new Path2D();
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i]!;
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  p.closePath();
  return p;
}

/** Hoisted hull helpers — hullPath runs per beast slab per frame, so
 *  its comparator/scratch must not be rebuilt per call (GC churn). */
const hullCmp = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  a.x - b.x || a.y - b.y;
function hullCross(
  o: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
const hullSorted: Array<{ x: number; y: number }> = [];
const hullLower: Array<{ x: number; y: number }> = [];
const hullUpper: Array<{ x: number; y: number }> = [];

/** Convex hull (monotone chain) — the silhouette of an extruded slab. */
function hullPath(pts: Array<{ x: number; y: number }>): Path2D {
  const s = hullSorted;
  s.length = 0;
  for (const p of pts) s.push(p);
  s.sort(hullCmp);
  const lower = hullLower;
  lower.length = 0;
  for (const p of s) {
    while (lower.length >= 2 && hullCross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = hullUpper;
  upper.length = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i]!;
    while (upper.length >= 2 && hullCross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  // Ring the two chains directly (skip each chain's duplicated endpoint).
  const path = new Path2D();
  if (lower.length === 0) return path;
  path.moveTo(lower[0]!.x, lower[0]!.y);
  for (let i = 1; i < lower.length - 1; i++) path.lineTo(lower[i]!.x, lower[i]!.y);
  for (let i = 0; i < upper.length - 1; i++) path.lineTo(upper[i]!.x, upper[i]!.y);
  path.closePath();
  return path;
}

export interface CattleBodyFrame {
  /** Screen position of the body's ground point. */
  bx: number;
  gy: number;
  s: number;
  fx: number;
  fy: number;
  /** Camera foreshorten (1 for ragdolls drawn in screen space). */
  ys: number;
  seed: number;
  hurt: boolean;
  /** Gait bob (tiles) and side roll — 0 for corpses. */
  bob: number;
  roll: number;
  /** Heights (tiles) — corpses pass a collapsed backH. */
  backH: number;
  bellyH: number;
}

/**
 * The cattle body block: chamfered octagon footprint projected at
 * belly and back height, silhouette = convex hull of both rings.
 * Paint order inside the clip makes the light model: base hide, then
 * the seeded patches, then a hard shade step on everything below the
 * back plane, then the lit back facet — so each patch reads darker
 * where it spills over the flank, exactly like the torso shade-half.
 */
export function paintCattleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CattleLook,
  f: CattleBodyFrame,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const hl = spec.bodyLen * s;
  const hw = look.bodyW * s;
  const cut = Math.min(hl, hw) * 0.5;
  const oct: Array<[number, number]> = [
    [hl, -hw + cut],
    [hl, hw - cut],
    [hl - cut, hw],
    [-hl + cut, hw],
    [-hl, hw - cut],
    [-hl, -hw + cut],
    [-hl + cut, -hw],
    [hl - cut, -hw],
  ];
  const lift = f.bob * 0.35 * s;
  const hump = look.humpH * s;
  const gx = (X: number, Y: number): number => bx + fx * X + px * Y;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys;
  const top = oct.map(([X, Y]) => {
    let h = f.backH * s + lift - Y * f.roll * 0.4;
    if (hump > 0 && X > hl * 0.1) h += hump * ((X / hl - 0.1) / 0.9);
    return { x: gx(X, Y), y: gyy(X, Y) - h };
  });
  const bot = oct.map(([X, Y]) => ({
    x: gx(X, Y),
    // The chest runs deeper than the flank — the belly line climbs
    // toward the rump, which is most of what reads "cattle" side-on.
    y: gyy(X, Y) - (f.bellyH - 0.05 * Math.max(0, X / hl)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);

  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : look.hide;
  ctx.fill(hull);
  if (!f.hurt && look.spots > 0) {
    ctx.fillStyle = look.patch;
    for (let k = 0; k < look.spots; k++) {
      const b = (n: number): number => ((f.seed >>> ((k * 9 + n * 3) % 28)) & 7) / 7;
      const X = (b(0) * 1.7 - 0.85) * hl * 0.9;
      const Y = (b(1) * 2 - 1) * hw;
      const r = (0.55 + b(2) * 0.5) * hw;
      ctx.beginPath();
      facetBlob(
        ctx,
        gx(X, Y),
        gyy(X, Y) - f.backH * 0.72 * s - lift,
        r,
        (f.seed ^ (k * 0x9e37)) | 0,
        7,
        0.8,
        k * 2.1,
      );
      ctx.fill();
    }
  }
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}

/**
 * The cattle head: a billboard chamfered slab (like the humanoid head)
 * whose muzzle, ears, horns and eyes orbit with the facing. Shared by
 * the live rig and the ragdoll — corpses pass `dead` (no face marks)
 * and ys=1.
 */
export function drawCattleHead(
  ctx: CanvasRenderingContext2D,
  look: CattleLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Slow lateral cud-grind offset (screen px), idle only. */
    chew?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Ears: angular flaps riding the side axis, drooping at the tips,
  // pink inside when they face the camera.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.4;
    const byr = cy + py * es * w * 0.4 * ys - h * 0.1;
    const tx = cx + px * es * w * 0.95;
    const ty = cy + py * es * w * 0.95 * ys + h * 0.12;
    ctx.fillStyle = C(shade(look.hide, -12));
    ctx.beginPath();
    ctx.moveTo(bxr, byr - h * 0.12);
    ctx.lineTo(tx, ty - h * 0.08);
    ctx.lineTo(tx + px * es * w * 0.06, ty + h * 0.06);
    ctx.lineTo(bxr, byr + h * 0.14);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.muzzle;
      ctx.beginPath();
      ctx.moveTo(bxr + (tx - bxr) * 0.35, byr + (ty - byr) * 0.35 - h * 0.05);
      ctx.lineTo(bxr + (tx - bxr) * 0.85, byr + (ty - byr) * 0.85 - h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.4, byr + (ty - byr) * 0.4 + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Horns: tapered two-segment polygons sweeping out, then forward-up.
  const L = look.hornLen * s;
  for (const es of [-1, 1]) {
    const b0x = cx + px * es * w * 0.3;
    const b0y = cy + py * es * w * 0.3 * ys - h * 0.44;
    const m0x = b0x + px * es * L * 0.85;
    const m0y = b0y + py * es * L * 0.85 * ys - L * 0.55;
    const t0x = m0x + fx * L * 0.6;
    const t0y = m0y + fy * L * 0.6 * ys - L * 0.75;
    // Perpendicular half-widths shrinking base → mid → tip.
    const a1 = Math.atan2(m0y - b0y, m0x - b0x) + Math.PI / 2;
    const a2 = Math.atan2(t0y - m0y, t0x - m0x) + Math.PI / 2;
    const w0 = Math.max(1.2, L * 0.2);
    const w1 = Math.max(0.9, L * 0.13);
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(b0x + Math.cos(a1) * w0, b0y + Math.sin(a1) * w0);
    ctx.lineTo(m0x + Math.cos(a2) * w1, m0y + Math.sin(a2) * w1);
    ctx.lineTo(t0x, t0y);
    ctx.lineTo(m0x - Math.cos(a2) * w1, m0y - Math.sin(a2) * w1);
    ctx.lineTo(b0x - Math.cos(a1) * w0, b0y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Dark tip cap.
    ctx.fillStyle = C(look.hornTip);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 + Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 - Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 - Math.sin(a2) * w1 * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // Head block with a lit poll band and a hard jaw shade.
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.18)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
    // Poll tuft between the horns.
    ctx.fillStyle = look.patch;
    ctx.beginPath();
    chamferRect(ctx, cx - w * 0.17, cy - h * 0.56, w * 0.34, h * 0.16, 1.5);
    ctx.fill();
  }

  // The cowbell: a strapped trapezoid at the throat, clapper below.
  if (look.bell && fy > -0.35) {
    const kx = cx - fx * w * 0.1;
    const ky = cy + h * 0.62;
    const bw = w * 0.2;
    ctx.strokeStyle = C('#4a3324');
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(kx, ky - h * 0.14);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.fillStyle = C(look.bell);
    ctx.beginPath();
    ctx.moveTo(kx - bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.52, ky + bw * 0.78);
    ctx.lineTo(kx - bw * 0.52, ky + bw * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(shade(look.bell, -45));
    ctx.fillRect(kx - bw * 0.14, ky + bw * 0.78, bw * 0.28, bw * 0.3);
  }

  // Muzzle: a paler block pushed along the facing. It must TURN with
  // the head: full-face width head-on, foreshortened to a narrow
  // profile wedge side-on (a frontal muzzle pasted over a profile head
  // was the classic bug), gone entirely from behind.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const d = w * (0.42 + profileK * 0.14);
    const mx = cx + fx * d + (o.chew ?? 0) * (1 - profileK);
    const my = cy + fy * d * ys + h * 0.16;
    const mw = w * 0.74 * (1 - profileK * 0.58);
    const mh = h * 0.52;
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    chamferRect(ctx, mx - mw / 2, my - mh / 2, mw, mh, mw * 0.16);
    ctx.fill();
    if (!o.hurt) {
      ctx.fillStyle = 'rgba(30, 20, 36, 0.12)';
      ctx.fillRect(mx - mw * 0.4, my + mh * 0.18, mw * 0.8, mh * 0.24);
    }
    if (fy > -0.1 && !o.hurt) {
      // Nostril slits ride the muzzle's own frame — only the near one
      // survives the turn to profile.
      ctx.fillStyle = OUTLINE;
      for (const es of [-1, 1]) {
        if (profileK > 0.45 && es * py < 0) continue;
        const nx = mx + px * es * mw * 0.26 + fx * mw * 0.2 * profileK;
        const ny = my + py * es * mw * 0.26 * ys - mh * 0.18;
        ctx.fillRect(nx - mw * 0.05, ny, mw * 0.1, mh * 0.3);
      }
      if (look.noseRing) {
        ctx.strokeStyle = look.noseRing;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.arc(mx + fx * mw * 0.18 * profileK, my + mh * 0.22, mw * 0.16, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
  }

  // Lateral eyes — one per side of the skull, the far one hiding as
  // the head goes profile; none on the back of the skull, none dead.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.44;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.44) * ys - h * 0.08;
      ctx.fillRect(ex - w * 0.055, ey - h * 0.09, w * 0.11, h * 0.18);
    }
  }
}

/**
 * Shared 2.5D block-body core for the bespoke beasts: a footprint
 * polygon extruded from a belly line up to a lit back facet, the
 * silhouette the convex hull of both rings, hard flank shade between
 * them — the wall-prism dialect on legs. The wolf and rat ride this;
 * cattle keep their tuned copy above.
 */
export interface BeastBlockFrame {
  /** Screen position of the body's ground point. */
  bx: number;
  gy: number;
  s: number;
  fx: number;
  fy: number;
  /** Camera foreshorten (1 for ragdolls drawn in screen space). */
  ys: number;
  seed: number;
  hurt: boolean;
  /** Gait bob (tiles) and side roll — 0 for corpses. */
  bob: number;
  roll: number;
  /** Corpses collapse the extrusion onto its side. */
  topScale?: number;
  /** Corpses flatten the belly line to the ground. */
  botH?: number;
}

function paintBlockBody(
  ctx: CanvasRenderingContext2D,
  f: BeastBlockFrame,
  foot: Array<[number, number]>,
  topH: (X: number) => number,
  botH: (X: number) => number,
  base: string,
  marks?: (
    gx: (X: number, Y: number) => number,
    gyy: (X: number, Y: number) => number,
    lift: number,
  ) => void,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const gx = (X: number, Y: number): number => bx + (fx * X + px * Y) * s;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys * s;
  const top = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - topH(X) * tk * s - lift + Y * s * f.roll * 0.4,
  }));
  const bot = foot.map(([X, Y]) => ({
    x: gx(X, Y),
    y: gyy(X, Y) - (f.botH ?? botH(X)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : base;
  ctx.fill(hull);
  if (!f.hurt && marks) marks(gx, gyy, lift);
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}

/**
 * A tapered ribbon along a quadratic spine — the wolf's brush and the
 * rat's naked tail both build from this, live and dead. `widthAt`
 * returns the half-width at t∈[0,1] so species shape their own taper.
 */
export function taperedSpinePath(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  widthAt: (t: number) => number,
): Path2D {
  const N = 8;
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const qx = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const qy = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = u * (cx - x0) + t * (x1 - cx);
    const dy = u * (cy - y0) + t * (y1 - cy);
    const d = Math.hypot(dx, dy) || 1e-4;
    const w = widthAt(t);
    left.push({ x: qx + (-dy / d) * w, y: qy + (dx / d) * w });
    right.push({ x: qx - (-dy / d) * w, y: qy - (dx / d) * w });
  }
  return ringPath([...left, ...right.reverse()]);
}

/**
 * The wolf: a lean predator prism — deep chest, tucked waist, shoulder
 * hump, dark saddle cape over pale underparts, erect ears, long
 * foreshortening muzzle, amber eyes and a bushy dark-tipped brush.
 */
export interface WolfLook {
  coat: string;
  saddle: string;
  under: string;
  earIn: string;
  eye: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  backH: number;
  /** Extra mass ramped up over the shoulders. */
  shoulderH: number;
  /** Belly height at the chest (deep) and the waist (tucked). */
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const WOLF_LOOK: WolfLook = {
  coat: '#6a6f7d',
  saddle: '#4b4e5d',
  under: '#b7b2a2',
  earIn: '#3a3644',
  eye: '#e2a63c',
  bodyW: 0.165,
  backH: 0.54,
  shoulderH: 0.085,
  chestH: 0.25,
  tuckH: 0.33,
  headW: 0.3,
  headH: 0.245,
};

export function paintWolfBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: WolfLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Wedge footprint: broad chest and shoulders, waist pulling in
  // toward a narrow rump — the athletic taper that reads "predator"
  // against the cattle's even slab.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.8],
    [hl, hw * 0.8],
    [hl * 0.5, hw],
    [-hl * 0.45, hw * 0.9],
    [-hl, hw * 0.62],
    [-hl, -hw * 0.62],
    [-hl * 0.45, -hw * 0.9],
    [hl * 0.5, -hw],
  ];
  // Herd variance: each wolf's coat sits a step off the pack tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // THE RISING KEEL: withers ramp forward into a NECK ROOT that
    // climbs out of the shoulders (the wolf carries its head high —
    // the body must offer the neck, not butt-joint it), a gentle loin
    // ease behind, then the stern FALLS AWAY into the brush root so
    // the simulated tail reads grown, never pinned on.
    (X) =>
      look.backH +
      Math.max(0, X / hl - 0.05) * look.shoulderH +
      0.045 * Math.max(0, (X / hl - 0.55) / 0.45) -
      0.04 * Math.max(0, (-X / hl - 0.3) / 0.5) -
      0.06 * Math.max(0, (-X / hl - 0.72) / 0.28),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.2)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Dark saddle cape draped over the back, seeded per wolf.
      ctx.save();
      ctx.translate(gx(hl * 0.02, 0), gyy(hl * 0.02, 0) - look.backH * tk * s * 0.96 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.saddle;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.82, f.seed | 1, 9, (hw * 1.15) / (hl * 0.82), 0.35);
      ctx.fill();
      ctx.restore();
      // Pale bib at the chest — only while the chest can actually
      // face the camera; painted flat it would show through the back
      // when the wolf walks away. It rides the hull's own bob (the
      // chest face sits between the top ring's full lift and the
      // belly's 0.6) — a pinned bib stands still while the body
      // bounces around it.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.88, 0),
          gyy(hl * 0.88, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.8,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}

/** Pre-resolved canid-ear tones — the painter never learns a species. */
interface CanidEarStyle {
  /** The blade's frame fill, both faces. */
  fill: string;
  /** Pale inner fan, face-on only. */
  inner: string;
  /** Back cartilage seam. */
  seam: string;
}

/**
 * Paint one projected canid ear off a physics (or rest) chain — the
 * pricked blade every wolf-line head wears: straight tapered edges,
 * pale inner fan face-on, one cartilage seam behind, and the optional
 * NOTCH bitten from the trailing edge (the matriarch's history in
 * silhouette). Plain path calls so painter tests can walk every
 * coordinate.
 */
function paintCanidEar(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  w0: number,
  st: CanidEarStyle,
  o: { front: boolean; hurt: boolean; dead: boolean; notch: boolean; headX: number; headY: number },
): void {
  const prof = [1, 0.8, 0.45, 0];
  const ea: Array<{ x: number; y: number }> = [];
  const eb: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(3, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const ww = w0 * prof[i]!;
    ea.push({ x: pts[i]!.x + ty * ww, y: pts[i]!.y - tx * ww });
    eb.push({ x: pts[i]!.x - ty * ww, y: pts[i]!.y + tx * ww });
  }
  // The leading edge faces AWAY from the skull (the wing-ear law).
  const da = Math.hypot(ea[1]!.x - o.headX, ea[1]!.y - o.headY);
  const db = Math.hypot(eb[1]!.x - o.headX, eb[1]!.y - o.headY);
  const lead = da >= db ? ea : eb;
  const trail = da >= db ? eb : ea;
  const blade = (): void => {
    ctx.beginPath();
    ctx.moveTo(trail[0]!.x, trail[0]!.y);
    ctx.lineTo(lead[0]!.x, lead[0]!.y);
    ctx.lineTo(lead[1]!.x, lead[1]!.y);
    ctx.lineTo(lead[2]!.x, lead[2]!.y);
    ctx.lineTo(pts[3]!.x, pts[3]!.y);
    if (o.notch) {
      // The V bitten into the trailing edge on the way back down.
      const ax = trail[2]!.x * 0.6 + pts[3]!.x * 0.4;
      const ay = trail[2]!.y * 0.6 + pts[3]!.y * 0.4;
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax * 0.62 + pts[2]!.x * 0.38, ay * 0.62 + pts[2]!.y * 0.38);
      ctx.lineTo(trail[2]!.x * 0.8 + trail[1]!.x * 0.2, trail[2]!.y * 0.8 + trail[1]!.y * 0.2);
    } else {
      ctx.lineTo(trail[2]!.x, trail[2]!.y);
    }
    ctx.lineTo(trail[1]!.x, trail[1]!.y);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  ctx.fillStyle = o.hurt ? '#ffffff' : st.fill;
  blade();
  ctx.fill();
  if (o.hurt) return;
  if (o.front && !o.dead) {
    ctx.fillStyle = st.inner;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x + (trail[0]!.x - pts[0]!.x) * 0.45, pts[0]!.y + (trail[0]!.y - pts[0]!.y) * 0.45);
    ctx.lineTo(pts[0]!.x + (lead[0]!.x - pts[0]!.x) * 0.55, pts[0]!.y + (lead[0]!.y - pts[0]!.y) * 0.55);
    ctx.lineTo(lead[1]!.x * 0.6 + pts[1]!.x * 0.4, lead[1]!.y * 0.6 + pts[1]!.y * 0.4);
    ctx.lineTo(pts[2]!.x * 0.85 + pts[3]!.x * 0.15, pts[2]!.y * 0.85 + pts[3]!.y * 0.15);
    ctx.lineTo(trail[1]!.x * 0.6 + pts[1]!.x * 0.4, trail[1]!.y * 0.6 + pts[1]!.y * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (!o.front && !o.dead) {
    ctx.strokeStyle = st.seam;
    ctx.lineWidth = Math.max(1, w0 * 0.16);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
    ctx.stroke();
  }
}

/**
 * Resolve a canid head's ear chains: tick the live sim when the caller
 * owns one, else THE ONE REST — and split the pair by the projection's
 * own depth term so far ears paint under the skull, near ears over the
 * face. Never a hand-authored band.
 */
function canidEarChains(
  carr: EarCarriage,
  o: { fx: number; fy: number; dead?: boolean; nowMs?: number; ears?: EarSim },
  cx: number,
  cy: number,
  s: number,
  pin: number,
): { behind: Array<{ c: EarChain; side: number }>; front: Array<{ c: EarChain; side: number }> } {
  const dir = Math.atan2(o.fy, o.fx);
  if (o.ears && !o.dead && o.nowMs) o.ears.update(cx, cy, s, carr, dir, pin, o.nowMs);
  // The SIDE rides through the depth split: a mark worn on one ear
  // (the matriarch's notch) must stay on that ear at every facing.
  const chains = ([-1, 1] as const).map((side) => ({
    side: side as number,
    c:
      o.ears && !o.dead
        ? o.ears.chain(side, carr, dir, pin)
        : earRestChain(side, carr, { dir, pin: o.dead ? 0.55 : pin, sway: 0 }),
  }));
  return {
    behind: chains.filter((e) => e.c.depth <= 0.05),
    front: chains.filter((e) => e.c.depth > 0.05),
  };
}

/**
 * The wolf head: angular skull slab with erect ears and a long tapered
 * muzzle that turns with the facing (full-face wedge head-on, narrow
 * profile spike side-on). `snarl` pins the ears back and bares teeth
 * through the pounce telegraph; corpses pass `dead` (no eyes). THE EAR
 * IS A SIMULATION: pass `ears` + `nowMs` for the live elastic pair;
 * sim-less callers paint the settled rest.
 */
export function drawWolfHead(
  ctx: CanvasRenderingContext2D,
  look: WolfLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. */
    ears?: EarSim;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // THE EAR IS A SIMULATION: erect blades on the elastic-pair
  // contract — orientation, z-order, and foreshortening by the one
  // projection; the sim adds turn lag, gait flap, and the pin-back
  // sweeping AROUND the skull mid-snarl, never a hinge over the face.
  const earPin = Math.min(1, snarl * 0.65);
  const earCarr: EarCarriage = {
    azimuth: 2.05,
    rootR: look.headW * 0.26,
    rootLift: look.headH * 0.48,
    length: look.headW * 0.62,
    spread: 0.55,
    rise: 1.15,
    curl: [0, 0.06, 0.14],
  };
  const earSt: CanidEarStyle = {
    fill: C(shade(look.coat, -6)),
    inner: look.earIn,
    seam: shade(look.coat, -20),
  };
  const earW0 = w * 0.15;
  const earPair = canidEarChains(earCarr, o, cx, cy, s, earPin);
  const earFront = fy > 0.05;
  for (const e of earPair.behind) {
    paintCanidEar(ctx, e.c.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s })), earW0, earSt, {
      front: earFront,
      hurt: o.hurt === true,
      dead: o.dead === true,
      notch: false,
      headX: cx,
      headY: cy,
    });
  }

  // Skull block: lit brow, shaded jaw, pale cheek band low.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.24, w * 0.24, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.24, w * 0.24, w * 0.3, w * 0.3]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.14, w, h * 0.36);
    ctx.restore();
  }

  // Muzzle: a tapered snout wedge pushed along the facing. It must
  // TURN with the head — longer and narrower as the profile deepens,
  // gone from behind (the cattle muzzle law).
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.26;
    const by0 = cy + fy * w * 0.26 * ys + h * 0.12;
    const sl = w * (0.32 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.2 * (1 - profileK * 0.25);
    const ht = hb * 0.62;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Snarl: the jaw drops open below the snout tip, teeth bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.34 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + nx * ht * 0.9, ty + ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.4, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.45, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.02, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.02, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The pale under-jaw at profile: the white lip line every canid
    // carries — a PROFILE read (the fox's face-on drip lesson).
    if (!o.hurt && profileK > 0.25) {
      const low = ny >= 0 ? 1 : -1;
      ctx.strokeStyle = C(look.under);
      ctx.lineWidth = Math.max(1.2, w * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx0 + nx * hb * 0.72 * low, by0 + ny * hb * 0.72 * low);
      ctx.lineTo(tx + nx * ht * 0.62 * low, ty + ny * ht * 0.62 * low);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // Nose chip SEATED on the tip — pulled back along the axis so it
    // overlaps the wedge instead of floating past it at profile.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.09, 5, fx);
    ctx.fill();
  }

  // Amber hunter's eyes — slanted, DARK-LINED, one fixed light chip:
  // the liner is what carries the stare at world zoom (a bare amber
  // slit read as a sticker). The far one hides as the head goes
  // profile; none from behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.3) * ys - h * 0.1;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.3 + snarl * 0.3));
      ctx.fillStyle = C(shade(look.saddle, -12));
      ctx.fillRect(-w * 0.09, -h * 0.065, w * 0.18, h * 0.13);
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.076, -h * 0.052, w * 0.152, h * 0.104);
      if (!o.hurt) {
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
        ctx.fillRect(w * 0.026, -h * 0.04, w * 0.026, h * 0.03);
      }
      ctx.restore();
    }
  }

  // The near ears return over everything — the projection's z-order.
  const earFront2 = fy > 0.05;
  for (const e of earPair.front) {
    paintCanidEar(ctx, e.c.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s })), earW0, earSt, {
      front: earFront2,
      hurt: o.hurt === true,
      dead: o.dead === true,
      notch: false,
      headX: cx,
      headY: cy,
    });
  }
}

/**
 * The dire wolf: the matriarch — a storm-charcoal predator half again
 * the wolf's mass, designed around ONE silhouette element: the HACKLE
 * RIDGE, a serrated mane standing permanently proud of the spine from
 * skull to mid-back. Frost-grizzled guard hairs tick the dark saddle,
 * an old rake of scars crosses the near flank, the ears carry a
 * bitten-out notch, and the eyes burn ember — the champion tier reads
 * through them the way it does through a crowned skeleton's sockets.
 * Never a scale-up of the wolf: heavier skull, deeper chest over a
 * gaunter tuck, and the brush ends PALE where the wolf's ends dark.
 */
export interface DireWolfLook {
  coat: string;
  saddle: string;
  under: string;
  /** Frost-tipped guard hairs ticking the saddle line. */
  grizzle: string;
  /** The raised mane crest — darker than the saddle, near-black. */
  hackle: string;
  earIn: string;
  eye: string;
  eyeCore: string;
  /** Old rake scars, pale where fur never grew back. */
  scar: string;
  bodyW: number;
  backH: number;
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const DIREWOLF_LOOK: DireWolfLook = {
  coat: '#4b4854',
  saddle: '#312e3c',
  under: '#9d97a0',
  grizzle: '#8d8fa0',
  hackle: '#232030',
  earIn: '#241f2c',
  eye: '#ff9a3d',
  eyeCore: '#ffe4ac',
  scar: '#8f8494',
  bodyW: 0.215,
  backH: 0.68,
  shoulderH: 0.16,
  chestH: 0.3,
  tuckH: 0.46,
  headW: 0.385,
  headH: 0.3,
};

/**
 * OLD FANG (the dread crown, the wolf boss): the dire painter worn
 * by an authored DESIGN, never a reskin — aged iron-grey where the
 * dire runs storm-charcoal, and the frost ticking laid on HEAVY: a
 * coat gone white at the guard hairs the way an old muzzle goes
 * white. Old-gold eyes (the dire's burn ember), pale scar rake wider
 * than hers — his ledger is longer. Frame reads OLD AND RANGY:
 * leaner in the body and lower at the back than the matriarch,
 * carried on the longest lope in the wood.
 */
export const OLDFANG_LOOK: DireWolfLook = {
  coat: '#7a7468',
  saddle: '#4e4838',
  under: '#c2bba8',
  grizzle: '#dcd8c8',
  hackle: '#38332a',
  earIn: '#3d3226',
  eye: '#f2c23a',
  eyeCore: '#fff4cc',
  scar: '#b8b0a0',
  bodyW: 0.205,
  backH: 0.66,
  shoulderH: 0.15,
  chestH: 0.28,
  tuckH: 0.44,
  headW: 0.37,
  headH: 0.29,
};

export function paintDireWolfBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: DireWolfLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Harder wedge than the wolf: the chest carries even more of the
  // width and the waist pulls in tighter — massive AND gaunt, the
  // starved-winter matriarch, never a fattened scale-up.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.84],
    [hl, hw * 0.84],
    [hl * 0.55, hw],
    [-hl * 0.42, hw * 0.82],
    [-hl, hw * 0.56],
    [-hl, -hw * 0.56],
    [-hl * 0.42, -hw * 0.82],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  // Withers carry the drama: a taller shoulder ramp than the wolf's,
  // a NECK ROOT climbing off them into her high-held skull, then the
  // spine falls away down a low-slung rump whose stern drops hard
  // into the brush root — the simulated tail reads grown, never
  // pinned on.
  const topH = (X: number): number =>
    look.backH +
    Math.max(0, X / hl + 0.05) * look.shoulderH +
    0.05 * Math.max(0, (X / hl - 0.55) / 0.45) -
    0.07 * Math.max(0, (-X / hl - 0.3) / 0.7) -
    0.055 * Math.max(0, (-X / hl - 0.74) / 0.26);
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.1)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // The great saddle cape: broader and darker than a wolf's,
      // reaching down the flanks.
      ctx.save();
      ctx.translate(gx(hl * 0.02, 0), gyy(hl * 0.02, 0) - look.backH * tk * s * 0.92 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.saddle;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.88, f.seed | 1, 9, (hw * 1.3) / (hl * 0.88), 0.35);
      ctx.fill();
      // Frost grizzle: pale guard-hair ticks riding the saddle's
      // edge — the winters she's carried, seeded so no two matriarchs
      // frost alike.
      ctx.strokeStyle = look.grizzle;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const gseed = (f.seed >>> (i * 3)) & 15;
        const tx = hl * s * (0.62 - 0.19 * i) * 0.9;
        const ty = -hw * s * (0.35 + (gseed & 3) * 0.14) * ((i & 1) === 0 ? 1 : -1);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - s * 0.05, ty + s * 0.028 * ((i & 1) === 0 ? 1 : -1));
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
      // Pale chest bib — only while the chest can face the camera.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.9, 0),
          gyy(hl * 0.9, 0) - (look.chestH + 0.12) * s - lift * 0.8,
          hw * s * 0.82,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
      // The old rake: three parallel scar lines across the ribs,
      // near flank only — the story the pack reads at a glance.
      if (Math.abs(f.fy) < 0.92) {
        ctx.strokeStyle = look.scar;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const sx = gx(hl * (0.34 - i * 0.13), hw * 0.55);
          const sy = gyy(hl * (0.34 - i * 0.13), hw * 0.55) - (look.chestH + 0.2) * s - lift * 0.6;
          ctx.beginPath();
          ctx.moveTo(sx - s * 0.02, sy - s * 0.075);
          ctx.lineTo(sx + s * 0.024, sy + s * 0.055);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    },
  );
  // THE HACKLE RIDGE — the signature. Serrated mane spikes standing
  // proud of the spine, tallest over the withers, dying out mid-back.
  // Painted AFTER the body: the hull clip eats anything above it.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  ctx.fillStyle = f.hurt ? '#ffffff' : look.hackle;
  const N = 5;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Skull to mid-back only — the rump stays smooth.
    const X0 = hl * (0.92 - 0.95 * t);
    const X1 = X0 - hl * 0.16;
    const a = spineAt(X0);
    const b = spineAt(X1);
    // Serration: alternating tall/short teeth, all raked BACK.
    const hgt = s * tk * (0.115 - 0.055 * t) * ((i & 1) === 0 ? 1 : 0.72);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + s * 0.012);
    ctx.lineTo((a.x + b.x) / 2 - fx * s * 0.035, (a.y + b.y) / 2 - hgt);
    ctx.lineTo(b.x, b.y + s * 0.012);
    ctx.closePath();
    ctx.fill();
  }
  // Frost tips on the tallest hackles — the ridge catches the light.
  if (!f.hurt) {
    ctx.fillStyle = look.grizzle;
    for (const i of [0, 2]) {
      const t = i / (N - 1);
      const X0 = hl * (0.92 - 0.95 * t);
      const X1 = X0 - hl * 0.16;
      const a = spineAt(X0);
      const b = spineAt(X1);
      const hgt = s * tk * (0.115 - 0.055 * t);
      const tipX = (a.x + b.x) / 2 - fx * s * 0.035;
      const tipY = (a.y + b.y) / 2 - hgt;
      ctx.beginPath();
      ctx.moveTo(tipX - s * 0.014, tipY + s * 0.03);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX + s * 0.014, tipY + s * 0.03);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The dire wolf head: a heavier skull than any wolf's — broad brow
 * ledge over ember eyes, a longer deeper muzzle whose fangs show even
 * at rest, and tall ears with a bitten-out notch on the near side.
 * `snarl` drops the whole jaw and bares the full rack.
 */
export function drawDireWolfHead(
  ctx: CanvasRenderingContext2D,
  look: DireWolfLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. */
    ears?: EarSim;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // THE EAR IS A SIMULATION: taller heavier blades than any wolf's,
  // on the elastic-pair contract — and the +1 ear carries the NOTCH,
  // the triangular bite out of its trailing edge (the matriarch's
  // history in silhouette), riding THAT ear through every facing.
  const earPin = Math.min(1, snarl * 0.6);
  const earCarr: EarCarriage = {
    azimuth: 2.05,
    rootR: look.headW * 0.27,
    rootLift: look.headH * 0.5,
    length: look.headW * 0.66,
    spread: 0.55,
    rise: 1.1,
    curl: [0, 0.06, 0.14],
  };
  const earSt: CanidEarStyle = {
    fill: C(shade(look.coat, -8)),
    inner: look.earIn,
    seam: shade(look.coat, -22),
  };
  const earW0 = w * 0.155;
  const earPair = canidEarChains(earCarr, o, cx, cy, s, earPin);
  const dEarFront = fy > 0.05;
  const paintDireEar = (e: { c: EarChain; side: number }): void => {
    paintCanidEar(ctx, e.c.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s })), earW0, earSt, {
      front: dEarFront,
      hurt: o.hurt === true,
      dead: o.dead === true,
      notch: e.side > 0,
      headX: cx,
      headY: cy,
    });
  };
  for (const e of earPair.behind) paintDireEar(e);

  // Skull block: broader than the wolf's, chamfered heavier.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    // Lit crown, then the BROW LEDGE: a hard dark band over the eye
    // line that the wolf head doesn't carry — the glower.
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.18);
    ctx.fillStyle = C(shade(look.saddle, -6));
    ctx.fillRect(cx - w / 2, cy - h * 0.28, w, h * 0.17);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.18, w, h * 0.34);
    ctx.restore();
  }

  // Muzzle: longer and deeper than the wolf's — the bone-crusher jaw.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.28;
    const by0 = cy + fy * w * 0.28 * ys + h * 0.12;
    const sl = w * (0.36 + 0.32 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.23 * (1 - profileK * 0.22);
    const ht = hb * 0.66;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      // The full rack: a deeper gape than any wolf, three fangs and a
      // dark gum line.
      const gape = h * 0.46 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.95, ty - ny * ht * 0.95);
      ctx.lineTo(tx + nx * ht * 0.95, ty + ny * ht * 0.95);
      ctx.lineTo(tx + (axv / al) * ht * 0.45, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.55, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!o.dead && !o.hurt && fy > 0.05) {
      // At rest the fangs still show — two pale ticks hooking down
      // from the jawline near the tip. The wolf hides its teeth; the
      // matriarch never does.
      ctx.fillStyle = '#e8e2d0';
      for (const ts of [-0.62, 0.52]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.016, ty + ny * ht * ts + h * 0.05);
        ctx.lineTo(tx + nx * ht * ts + w * 0.016, ty + ny * ht * ts + h * 0.05);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + h * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Nose chip seated on the tip.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.095, 5, fx);
    ctx.fill();
  }

  // Ember eyes under the brow ledge — a soft heat-glow OWNS the
  // socket (the tiny-tint failure from the skeleton epic), then the
  // slit, then a hot core. Dark and dead on a corpse.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.3) * ys - h * 0.08;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.28 + snarl * 0.3));
      if (!o.hurt) {
        ctx.fillStyle = 'rgba(255, 154, 61, 0.28)';
        ctx.fillRect(-w * 0.13, -h * 0.1, w * 0.26, h * 0.2);
      }
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.088, -h * 0.06, w * 0.176, h * 0.12);
      if (!o.hurt) {
        ctx.fillStyle = look.eyeCore;
        ctx.fillRect(-w * 0.032, -h * 0.032, w * 0.064, h * 0.064);
      }
      ctx.restore();
    }
  }

  // The near ears return over everything — the projection's z-order;
  // the notch stays on its own ear whichever side the turn puts it.
  for (const e of earPair.front) paintDireEar(e);
}

/**
 * THE FEY WOLF: the court's hound — the highest rung of the wolfkin
 * ladder, designed around TWO silhouette elements no other body owns:
 * THE TWIN BANNERS (two full simulated brushes off the stern, tips
 * dipped in cold light — the renderer runs the pair) and THE COURT'S
 * SILVER (chamfron crown-plate on the skull, gorget at the throat —
 * worn gear in the collar's tradition, never a palette swap). Never a
 * scaled dire: where the matriarch is a wall, the hound is a TOWER ON
 * STILTS — gazehound-tall on the longest canid legs in the wood, a
 * LEVEL high topline where the dire's spine falls away, a hard
 * sight-hound tuck, and a coat of moon-lavender under a dusk mantle
 * that sheds seeded glimmer motes above the spine. The eyes are cold
 * spring-green lamps; the glow OWNS the socket. It keeps its teeth
 * covered at rest — the dire never does. Composure is the tell.
 */
export interface FeyWolfLook {
  coat: string;
  /** The dusk mantle draped over shoulders and back. */
  mantle: string;
  under: string;
  /** The court's cold light: motes, tips, gem, and eye-glow. */
  glimmer: string;
  /** The court's silver: chamfron, tines, gorget, ear tips. */
  silver: string;
  silverDeep: string;
  earIn: string;
  eye: string;
  eyeCore: string;
  bodyW: number;
  backH: number;
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const FEYWOLF_LOOK: FeyWolfLook = {
  coat: '#9a94b4',
  mantle: '#5c5480',
  under: '#e0dcec',
  glimmer: '#9ff0d8',
  silver: '#c8cede',
  silverDeep: '#6e7590',
  earIn: '#4a4468',
  eye: '#8cf0cc',
  eyeCore: '#f2fff6',
  // THE SLENDER BEAM: narrower than the matriarch on a longer body —
  // the hound's mass is height and reach, never width.
  bodyW: 0.2,
  // The streamline pass thins the BARREL too: the height stays in
  // the legs and the carried head, not in a deep body slab — profile
  // depth at the chest is now ~0.29 tiles where the first cut ran
  // 0.38 (the "big long chest" the user called out).
  backH: 0.73,
  shoulderH: 0.1,
  // The chest is a KEEL: deep enough to read athletic, shallow
  // enough that the front half never becomes the pack's barrel.
  chestH: 0.44,
  tuckH: 0.61,
  headW: 0.36,
  headH: 0.28,
};

export function paintFeyWolfBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: FeyWolfLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // THE STREAMLINE (the user's second-pass verdict: the first cut
  // borrowed the pack's broad chest wall — a dire habit the hound
  // never earned). A gazehound is DEEP, never WIDE: the plan view is
  // one continuous flowing line — a narrow keeled PROW (the chest is
  // a blade, not a barrel), the widest point BRIEF at the shoulder,
  // then a long unbroken taper through the wasp waist, one soft hip
  // flare where the driving muscle lives, and a pinched croup the
  // twin banners grow from. No slab-sided run anywhere: every
  // segment is mid-taper. Twelve stations so the curve flows where
  // the pack's eight-point wedges chop.
  // ...and THE HAUNCH (the rear-end pass): the wasp waist hands off
  // to a REAL hindquarter — the plan flares back out over the thigh
  // (that muscle is where a gazehound's whole engine lives, and the
  // hull must reach out to OWN the leg roots), then pinches to the
  // croup. The first streamline cut pinched the whole rear and left
  // the hip anchors rooting in open air beside the body.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.56],
    [hl, hw * 0.56],
    [hl * 0.6, hw],
    [hl * 0.08, hw * 0.86],
    [-hl * 0.44, hw * 0.6],
    [-hl * 0.72, hw * 0.74],
    [-hl, hw * 0.34],
    [-hl, -hw * 0.34],
    [-hl * 0.72, -hw * 0.74],
    [-hl * 0.44, -hw * 0.6],
    [hl * 0.08, -hw * 0.86],
    [hl * 0.6, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  // THE LEVEL CARRIAGE, ARCHED: high and level where the dire falls
  // away, a swan neck root climbing off gentle withers — and the
  // streamline pass adds THE LOIN ARCH, the gazehound's signature
  // roach: a soft rise over the coupling that carries the whole
  // topline in one drawn bow into the stern fall. Aligned, never
  // boxy: the back is a curve under tension, not a roof.
  const topH = (X: number): number => {
    const lt = Math.min(1, Math.max(0, (-X / hl - 0.05) / 0.55));
    return (
      look.backH +
      Math.max(0, X / hl) * look.shoulderH +
      0.065 * Math.max(0, (X / hl - 0.5) / 0.5) +
      0.026 * Math.sin(Math.PI * lt) -
      0.018 * Math.max(0, (-X / hl - 0.55) / 0.45) -
      0.08 * Math.max(0, (-X / hl - 0.78) / 0.22)
    );
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    // THE RISING UNDERLINE, THEN THE STIFLE DROP: the belly's
    // deepest point is the forechest, climbing in one sweep to the
    // tuck APEX AT THE LOIN — and then the flank FALLS again over
    // the hindquarter (the gazehound's flank-to-stifle line), so
    // the hull reaches down to seat the hind-leg roots instead of
    // leaving thighs hanging from open air under a high stern.
    (X) => {
      const sweep = Math.min(1, Math.max(0, (0.9 - X / hl) / 1.6));
      const stifle = Math.min(1, Math.max(0, (-X / hl - 0.3) / 0.7));
      return look.chestH + (look.tuckH - look.chestH) * sweep - 0.13 * Math.pow(stifle, 1.5);
    },
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // The dusk mantle: a NARROW fall of nightfall along the spine —
      // the streamline pass pulled it off the flanks (a full-width
      // saddle read as bulk), so the moon-lavender coat shows down
      // both sides and the body reads drawn, not draped.
      ctx.save();
      ctx.translate(gx(hl * 0.04, 0), gyy(hl * 0.04, 0) - look.backH * tk * s * 0.94 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.mantle;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.82, f.seed | 1, 9, (hw * 0.9) / (hl * 0.82), 0.35);
      ctx.fill();
      ctx.restore();
      // Moonlight dapples: three soft pale pools along the upper
      // flank — light through a canopy that is not there. Seeded, so
      // no two hounds are dappled alike; near-flank only.
      if (Math.abs(f.fy) < 0.92) {
        ctx.fillStyle = 'rgba(224, 220, 236, 0.18)';
        for (let i = 0; i < 3; i++) {
          const dseed = (f.seed >>> (i * 5)) & 15;
          const dxp = hl * (0.42 - i * 0.34 + ((dseed & 3) - 1.5) * 0.04);
          const dyp = hw * (0.3 + (dseed >> 2) * 0.05);
          ctx.beginPath();
          facetCircle(
            ctx,
            gx(dxp, dyp),
            // Mid-flank, on the visible coat — the slimmed mantle
            // pulled off the flanks, so the dapples ride below it.
            gyy(dxp, dyp) - (look.chestH + 0.14) * s - lift * 0.7,
            s * (0.042 + (dseed & 1) * 0.012),
            5,
            f.fx,
          );
          ctx.fill();
        }
      }
      // THE THIGH LINE: one quiet contour bowed over the haunch —
      // the muscle that drives the fastest thing in the wood, read
      // as anatomy instead of a box corner. Near flank only.
      if (Math.abs(f.fy) < 0.9) {
        ctx.strokeStyle = shade(look.coat, -16);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.lineCap = 'round';
        const h0x = gx(-hl * 0.38, hw * 0.42);
        const h0y = gyy(-hl * 0.38, hw * 0.42) - (look.tuckH - 0.06) * s - lift * 0.65;
        const h1x = gx(-hl * 0.66, hw * 0.56);
        const h1y = gyy(-hl * 0.66, hw * 0.56) - (look.chestH + 0.05) * s - lift * 0.6;
        const hcx = gx(-hl * 0.62, hw * 0.62);
        const hcy = gyy(-hl * 0.62, hw * 0.62) - (look.tuckH - 0.02) * s - lift * 0.62;
        ctx.beginPath();
        ctx.moveTo(h0x, h0y);
        ctx.quadraticCurveTo(hcx, hcy, h1x, h1y);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      // The moonlight KEEL — the streamline pass traded the pack's
      // broad bib for a slim vertical blaze down the chest's prow: a
      // narrow mark that says DEPTH where the old blob said girth.
      // Only while the chest can face the camera, riding the hull's
      // own bob (the pinned-bib law).
      if (f.fy > -0.15) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.9, 0),
          gyy(hl * 0.9, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.52,
          f.seed ^ 0x33,
          7,
          0.6,
          2.4,
        );
        ctx.fill();
      }
    },
  );
  // THE GLIMMER WAKE — the signature laid where the dire wears her
  // hackles: the coat sheds cold light. A thin pale dorsal seam rides
  // the spine crest, and five seeded motes float just above it,
  // tallest over the withers — painted AFTER the body (the hull clip
  // eats anything above it), riding the same lift the spine rides so
  // THE BODY MOVES AS ONE.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  // The dorsal seam: withers to croup, one quiet stroke of light.
  ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.under, -6);
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.lineCap = 'round';
  const sa = spineAt(hl * 0.7);
  const sm = spineAt(-hl * 0.05);
  const sb = spineAt(-hl * 0.72);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y + s * 0.008);
  ctx.quadraticCurveTo(sm.x, sm.y + s * 0.004, sb.x, sb.y + s * 0.01);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // The motes: five diamonds hovering off the crest on seeded
  // stations — the hurt flash keeps them (the signature must
  // survive the silhouette read).
  ctx.fillStyle = f.hurt ? '#ffffff' : look.glimmer;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const mseed = (f.seed >>> (i * 3)) & 7;
    const X = hl * (0.66 - 1.3 * t);
    const p = spineAt(X);
    const hgt = s * tk * (0.1 - 0.045 * t + (mseed & 3) * 0.012);
    const rr = s * (0.02 - 0.006 * t);
    const mx = p.x + fx * s * ((mseed & 1) === 0 ? 0.02 : -0.02);
    const my = p.y - hgt;
    ctx.beginPath();
    ctx.moveTo(mx, my - rr);
    ctx.lineTo(mx + rr * 0.7, my);
    ctx.lineTo(mx, my + rr);
    ctx.lineTo(mx - rr * 0.7, my);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The fey wolf head: a fine long skull carried highest of any canid —
 * narrow where the dire is broad, composed where she glowers. THE
 * COURT'S SILVER lives here: the chamfron brow-plate with its three
 * crown tines (worn gear, kept on the corpse) and a glimmer gem at
 * the center station that slides on the sphere law's cosine. Cold
 * spring-green eyes; the glow owns the socket. The teeth stay covered
 * at rest — only the snarl bares them, and the snarl is the last
 * thing most hunters read. THE EAR IS A SIMULATION: the tallest,
 * narrowest blades in the wolf line, silver-tipped, on the elastic
 * pair contract.
 */
export function drawFeyWolfHead(
  ctx: CanvasRenderingContext2D,
  look: FeyWolfLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. */
    ears?: EarSim;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // THE EAR IS A SIMULATION: the court hound's blades run taller and
  // narrower than any wolf's — almost elven — with silver tips
  // carried per ear through the depth split.
  const earPin = Math.min(1, snarl * 0.6);
  const earCarr: EarCarriage = {
    azimuth: 2.05,
    rootR: look.headW * 0.25,
    rootLift: look.headH * 0.5,
    length: look.headW * 0.74,
    spread: 0.5,
    rise: 1.28,
    curl: [0, 0.05, 0.12],
  };
  const earSt: CanidEarStyle = {
    fill: C(shade(look.coat, -6)),
    inner: look.earIn,
    seam: shade(look.coat, -20),
  };
  const earW0 = w * 0.13;
  const earPair = canidEarChains(earCarr, o, cx, cy, s, earPin);
  const fEarFront = fy > 0.05;
  const paintFeyEar = (e: { c: EarChain; side: number }): void => {
    const spts = e.c.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s }));
    paintCanidEar(ctx, spts, earW0, earSt, {
      front: fEarFront,
      hurt: o.hurt === true,
      dead: o.dead === true,
      notch: false,
      headX: cx,
      headY: cy,
    });
    // The silver tip: the court's mark on both blades — a small
    // bright chip seated at the last knuckle, riding the sim.
    if (!o.hurt) {
      const tp = spts[3]!;
      const pv = spts[2]!;
      const tdx = tp.x - pv.x;
      const tdy = tp.y - pv.y;
      ctx.fillStyle = look.silver;
      ctx.beginPath();
      ctx.moveTo(tp.x, tp.y);
      ctx.lineTo(tp.x - tdx * 0.4 + tdy * 0.22, tp.y - tdy * 0.4 - tdx * 0.22);
      ctx.lineTo(tp.x - tdx * 0.4 - tdy * 0.22, tp.y - tdy * 0.4 + tdx * 0.22);
      ctx.closePath();
      ctx.fill();
    }
  };
  for (const e of earPair.behind) paintFeyEar(e);

  // Skull block: narrower than the dire's, chamfered fine — the
  // fine-boned read against her bone-crusher.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.26, w * 0.26, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.26, w * 0.26, w * 0.3, w * 0.3]);
    ctx.clip();
    // Lit crown, then moonlight low — no brow ledge: the hound does
    // not glower, and the open brow is half its composure.
    ctx.fillStyle = 'rgba(255, 248, 240, 0.15)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.16, w, h * 0.36);
    ctx.restore();
  }

  // THE CHAMFRON: the court's brow plate — a silver band across the
  // upper skull with a shaded lower arris, and the glimmer gem at
  // the center STATION (the sphere law: it slides on the ring's
  // cosine as the head yaws, never rotates). Kept on the hurt flash
  // (the silhouette signature) and on the corpse (silver survives
  // the hound).
  const plY = cy - h * 0.3 + fy * h * 0.06;
  ctx.fillStyle = C(look.silver);
  ctx.beginPath();
  chamferRect(ctx, cx - w * 0.42, plY - h * 0.09, w * 0.84, h * 0.18, [w * 0.1, w * 0.1, w * 0.05, w * 0.05]);
  ctx.fill();
  if (!o.hurt) {
    ctx.fillStyle = look.silverDeep;
    ctx.fillRect(cx - w * 0.42 + w * 0.05, plY + h * 0.045, w * 0.74, h * 0.045);
  }
  // THE THREE TINES: the crown read — short silver points off the
  // plate's top edge, center tallest. The side pair rides ±azimuth
  // stations (they slide and collapse toward profile on the cosine;
  // width scales with their own facing — nothing ever pops).
  const profileK = faceProfileK(fx);
  const tineW = w * 0.055 * (1 - profileK * 0.4);
  for (const es of [-1, 0, 1]) {
    if (es !== 0 && Math.abs(fx) > 0.82 && es * py < 0) continue;
    const tx0 = cx + px * es * w * 0.24 + fx * w * 0.02;
    const ty0 = plY - h * 0.07 + py * es * w * 0.05 * ys;
    const tall = h * (es === 0 ? 0.3 : 0.19);
    ctx.fillStyle = C(look.silver);
    ctx.beginPath();
    ctx.moveTo(tx0 - tineW, ty0);
    ctx.lineTo(tx0, ty0 - tall);
    ctx.lineTo(tx0 + tineW, ty0);
    ctx.closePath();
    ctx.fill();
    if (!o.hurt && es === 0) {
      // The center tine carries one cold spark at its point.
      ctx.fillStyle = look.glimmer;
      ctx.beginPath();
      facetCircle(ctx, tx0, ty0 - tall, w * 0.03, 5, fx);
      ctx.fill();
    }
  }
  // The gem: seated on the plate at the forward station.
  if (!o.hurt && fy > -0.35) {
    ctx.fillStyle = o.dead ? look.silverDeep : look.glimmer;
    ctx.beginPath();
    facetCircle(ctx, cx + fx * w * 0.1, plY + fy * h * 0.03, w * 0.045, 5, fx);
    ctx.fill();
  }

  // Muzzle: the longest, finest wedge in the wolf line — a hunting
  // hound's needle against the dire's bone-crusher.
  if (fy > -0.3) {
    const bx0 = cx + fx * w * 0.26;
    const by0 = cy + fy * w * 0.26 * ys + h * 0.12;
    const sl = w * (0.38 + 0.34 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.19 * (1 - profileK * 0.25);
    const ht = hb * 0.6;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      // The composure breaks all at once: a deep gape, fine fangs,
      // and cold light curling off the open jaw — the gloaming
      // breath. Most hunters read this once.
      const gape = h * 0.4 * Math.min(1, snarl);
      ctx.fillStyle = '#241a30';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.92, ty - ny * ht * 0.92);
      ctx.lineTo(tx + nx * ht * 0.92, ty + ny * ht * 0.92);
      ctx.lineTo(tx + (axv / al) * ht * 0.42, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eef2e8';
      for (const ts of [-0.5, 0.1, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.018, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.018, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.48);
        ctx.closePath();
        ctx.fill();
      }
      // The gloaming breath: two cold wisps off the jaw corners.
      ctx.strokeStyle = look.glimmer;
      ctx.lineWidth = Math.max(1, w * 0.03);
      ctx.lineCap = 'round';
      for (const ws of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ws * 0.8, ty + ny * ht * ws * 0.8 + gape * 0.3);
        ctx.quadraticCurveTo(
          tx + nx * ht * ws * 1.5 + (axv / al) * w * 0.06,
          ty + ny * ht * ws * 1.5 + gape * 0.15,
          tx + nx * ht * ws * 1.9 + (axv / al) * w * 0.12,
          ty + ny * ht * ws * 1.9 - h * 0.05,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // The pale under-jaw at profile — the canid lip line, kept.
    if (!o.hurt && profileK > 0.25) {
      const lowSide = ny >= 0 ? 1 : -1;
      ctx.strokeStyle = C(look.under);
      ctx.lineWidth = Math.max(1.2, w * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx0 + nx * hb * 0.72 * lowSide, by0 + ny * hb * 0.72 * lowSide);
      ctx.lineTo(tx + nx * ht * 0.62 * lowSide, ty + ny * ht * 0.62 * lowSide);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // Nose chip seated on the tip.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.085, 5, fx);
    ctx.fill();
  }

  // Cold spring-green lamps — the glow OWNS the socket (the
  // tiny-tint law), then the slit, then a white-green core. The
  // court's light goes out on a corpse.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.29;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.29) * ys - h * 0.08;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.32 + snarl * 0.28));
      if (!o.hurt) {
        ctx.fillStyle = 'rgba(140, 240, 204, 0.3)';
        ctx.fillRect(-w * 0.125, -h * 0.095, w * 0.25, h * 0.19);
      }
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.082, -h * 0.055, w * 0.164, h * 0.11);
      if (!o.hurt) {
        ctx.fillStyle = look.eyeCore;
        ctx.fillRect(-w * 0.03, -h * 0.03, w * 0.06, h * 0.06);
      }
      ctx.restore();
    }
  }

  // The near ears return over everything — the projection's z-order;
  // the silver tips ride their own blades through every facing.
  for (const e of earPair.front) paintFeyEar(e);
}

/**
 * The worg: goblin-kin war-hound, designed around ONE silhouette
 * element: the HYENA SLOPE — towering shoulders falling hard down a
 * pencil-thin rump, the head slung LOW off the withers. A bear-trap
 * skull with an underbite whose fang-tusks hook up past the muzzle,
 * big ragged bat ears torn at the edges, mange-dappled dun hide over
 * a bare-skin chest, a short ratty kink of a tail — nothing about it
 * reads noble. The eyes are sickly green and set forward: it is
 * thinking about you specifically.
 */
export interface WorgLook {
  hide: string;
  /** Mange dapple blotches across the shoulders. */
  dapple: string;
  /** The short choppy bristle strip down the nape — patchy, not a mane. */
  mane: string;
  /** Bare skin: chest bib, muzzle, tail hide. */
  bare: string;
  earIn: string;
  eye: string;
  fang: string;
  bodyW: number;
  /** Withers height — the tall front of the slope. */
  shoulderH: number;
  /** Rump height — the low rear of the slope. */
  rumpH: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const WORG_LOOK: WorgLook = {
  hide: '#6b5f47',
  dapple: '#544a36',
  mane: '#38301f',
  bare: '#8f7a62',
  earIn: '#4a3a30',
  eye: '#b8d44a',
  fang: '#e8dfc8',
  bodyW: 0.2,
  shoulderH: 0.6,
  rumpH: 0.34,
  chestH: 0.22,
  headW: 0.34,
  headH: 0.27,
};

export function paintWorgBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: WorgLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Front-loaded footprint: all the width lives at the shoulders, the
  // haunches pinch to almost nothing — the slope in plan view.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.85],
    [hl, hw * 0.85],
    [hl * 0.5, hw],
    [-hl * 0.55, hw * 0.68],
    [-hl, hw * 0.42],
    [-hl, -hw * 0.42],
    [-hl * 0.55, -hw * 0.68],
    [hl * 0.5, -hw],
  ];
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  // THE HYENA SLOPE: withers tower at the front and the spine falls
  // away in one hard line to the low rump — the anti-wolf silhouette.
  const topH = (X: number): number => {
    const t = Math.min(1, Math.max(0, (X / hl + 1) / 1.5));
    return look.rumpH + (look.shoulderH - look.rumpH) * t * t;
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    // Deep chest shallowing toward the tucked rear.
    (X) => look.chestH + 0.05 * Math.min(1, Math.max(0, (0.4 - X / hl) / 1.4)),
    hide,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Mange dapple: seeded blotches scattered down the upper flank,
      // painted in the body's rotated frame so they ride every facing.
      ctx.save();
      ctx.translate(gx(hl * 0.06, 0), gyy(hl * 0.06, 0) - look.shoulderH * tk * s * 0.7 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.dapple;
      for (let i = 0; i < 5; i++) {
        const dseed = (f.seed >>> (i * 4)) & 31;
        const dx = hl * s * (0.55 - 0.28 * i + (dseed & 3) * 0.02);
        const dy = ((dseed >> 2) & 3) * hw * s * 0.22 * ((i & 1) === 0 ? 1 : -1);
        ctx.beginPath();
        facetBlob(ctx, dx, dy, s * (0.055 + (dseed & 1) * 0.02), f.seed ^ (i * 77), 6, 0.8);
        ctx.fill();
      }
      ctx.restore();
      // Bare-skin chest bib, camera-side only.
      if (f.fy > -0.15) {
        ctx.fillStyle = look.bare;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.88, 0),
          gyy(hl * 0.88, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.72,
          f.seed ^ 0x2f,
          7,
          0.85,
          1.6,
        );
        ctx.fill();
      }
    },
  );
  // The nape bristle strip: short choppy spikes from skull to
  // mid-back — PATCHY, with seeded gaps. A mangy war-hound's roach,
  // never the matriarch's proud ridge. Painted after the body.
  const { bx, gy, s, fx, fy, ys } = f;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  ctx.fillStyle = f.hurt ? '#ffffff' : look.mane;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + fx * X * s,
    y: gy + fy * X * ys * s - topH(X) * tk * s - lift,
  });
  const N = 8;
  for (let i = 0; i < N; i++) {
    // Mange gaps: the seeded bits eat two of the eight tufts.
    if (((f.seed >>> (i + 2)) & 7) === 3) continue;
    const t = i / (N - 1);
    const X0 = hl * (0.95 - 1.0 * t);
    const X1 = X0 - hl * 0.1;
    const a = spineAt(X0);
    const b = spineAt(X1);
    const hgt = s * tk * (0.055 - 0.02 * t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + s * 0.01);
    ctx.lineTo((a.x + b.x) / 2 - fx * s * 0.012, (a.y + b.y) / 2 - hgt);
    ctx.lineTo(b.x, b.y + s * 0.01);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The worg head: a bear-trap — broad short skull, heavier below than
 * above, the UNDERBITE fang-tusks hooking up past the muzzle sides
 * even at rest. Big ragged bat ears with torn edges; forward-set
 * sickly-green eyes. `gape` swings the whole lower jaw open through
 * the lunge — the trap showing you its hinge.
 */
export function drawWorgHead(
  ctx: CanvasRenderingContext2D,
  look: WorgLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph — the trap opens. */
    gape?: number;
    /** 0..1 idle ear swivel. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const gape = o.gape ?? 0;

  // Ragged bat ears: broad-based sails with a torn V down the outer
  // edge. Painted in the MANE tone — the head hangs low against the
  // worg's own withers, and hide-toned ears vanished into the body
  // mass (caught in matrix v2).
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.08;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.08) * ys - h * 0.34;
    const swiv = es > 0 ? (o.flick ?? 0) * 0.2 : 0;
    const tx = bxr + px * es * w * (0.24 + swiv);
    const ty = byr - h * 0.82;
    ctx.fillStyle = C(look.mane);
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.2, byr + h * 0.05);
    // Inner edge straight up to the tip.
    ctx.lineTo(tx - px * es * w * 0.12, ty + h * 0.08);
    ctx.lineTo(tx, ty);
    // Outer edge falls with a torn V halfway down.
    ctx.lineTo(tx + px * es * w * 0.14, ty + h * 0.28);
    ctx.lineTo(tx + px * es * w * 0.03, ty + h * 0.4);
    ctx.lineTo(tx + px * es * w * 0.2, ty + h * 0.54);
    ctx.lineTo(bxr + px * es * w * 0.26, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.08, byr + h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.66, byr + (ty - byr) * 0.66);
      ctx.lineTo(bxr + px * es * w * 0.14, byr + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Skull: broad and SHORT — wider than the dire wolf's in proportion,
  // bottom-heavy chamfer (the jaw carries the mass).
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.16, w * 0.16]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.16, w * 0.16]);
    ctx.clip();
    // Heavy brow shade, bare-skin jaw band low.
    ctx.fillStyle = 'rgba(30, 20, 36, 0.22)';
    ctx.fillRect(cx - w / 2, cy - h * 0.5, w, h * 0.2);
    ctx.fillStyle = C(look.bare);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.32);
    ctx.restore();
  }

  // Muzzle: SHORT and thick — a stub next to the wolves' spike, the
  // trap's front plate. Gone from behind.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.14;
    const sl = w * (0.22 + 0.18 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.08;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.27 * (1 - profileK * 0.18);
    const ht = hb * 0.78;
    ctx.fillStyle = C(shade(look.bare, -4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    if (gape > 0.15 && !o.dead && !o.hurt) {
      // THE TRAP OPENS: the whole lower jaw swings, dark gullet
      // behind a fence of teeth, the fang-tusks riding the jaw down.
      const drop = h * 0.55 * Math.min(1, gape);
      ctx.fillStyle = '#241018';
      ctx.beginPath();
      ctx.moveTo(bx0 - nx * hb * 0.9, by0 - ny * hb * 0.9);
      ctx.lineTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.2, ty + drop);
      ctx.lineTo(bx0, by0 + drop * 0.8);
      ctx.closePath();
      ctx.fill();
      // The dropped jaw slab under the gullet.
      ctx.fillStyle = C(shade(look.bare, -12));
      ctx.beginPath();
      ctx.moveTo(bx0 - nx * hb * 0.7, by0 + drop * 0.82);
      ctx.lineTo(tx - nx * ht * 0.6, ty + drop * 0.98);
      ctx.lineTo(tx + nx * ht * 0.6, ty + drop);
      ctx.lineTo(bx0 + nx * hb * 0.7, by0 + drop * 0.86);
      ctx.closePath();
      ctx.fill();
      // Teeth fence on the upper plate.
      ctx.fillStyle = look.fang;
      for (const ts of [-0.5, -0.05, 0.42]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.018, ty + ny * ht * ts + h * 0.02);
        ctx.lineTo(tx + nx * ht * ts + w * 0.018, ty + ny * ht * ts + h * 0.02);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + drop * 0.42);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE UNDERBITE — the signature read. Two fang-tusks hooking UP
    // from the lower jaw past the muzzle sides, always shown (rest or
    // gape), obeying the far-side-skip law at profile.
    if (!o.hurt) {
      const jawDrop = gape > 0.15 && !o.dead ? h * 0.5 * Math.min(1, gape) : 0;
      for (const ts of [-1, 1]) {
        if (Math.abs(fx) > 0.7 && ts * py < 0) continue;
        const fxp = tx + nx * ht * ts * 0.82;
        const fyp = ty + ny * ht * ts * 0.82 + h * 0.1 + jawDrop;
        ctx.fillStyle = look.fang;
        ctx.beginPath();
        ctx.moveTo(fxp - w * 0.028, fyp);
        ctx.lineTo(fxp + w * 0.028, fyp + h * 0.02);
        // The up-hook: tip pulled back toward the skull.
        ctx.lineTo(fxp + w * 0.012 - fx * w * 0.05, fyp - h * 0.2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Broad nose bar across the stub tip.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.015, ty - (ayv / al) * w * 0.015, w * 0.1, 5, fx);
    ctx.fill();
  }

  // Sickly green eyes — round and FORWARD-SET (closer to the muzzle
  // root than any wolf's), a black slit pupil. It is not hunting; it
  // is planning.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.17 + px * es * w * 0.22;
      const ey = cy + (fy * w * 0.17 + py * es * w * 0.22) * ys - h * 0.12;
      ctx.fillStyle = C(look.eye);
      ctx.beginPath();
      ctx.arc(ex, ey, w * 0.075, 0, Math.PI * 2);
      ctx.fill();
      if (!o.hurt) {
        ctx.fillStyle = '#1a1610';
        ctx.fillRect(ex - w * 0.014, ey - w * 0.055, w * 0.028, w * 0.11);
      }
    }
  }
}

/**
 * THE FEATHER-AND-DISC DIALECT — the great owl, the parliament's
 * hunter. A TWO-POST beast unlike anything else on the rig: an
 * upright keg of plumage on backward-kneed bird legs, a facial disc
 * that carries BOTH eyes forward (the one face in the bestiary that
 * meets yours), and a head that turns on its own clock while the
 * body stands stone-still. Straight out of the oldest bestiaries — a
 * horned hunter the size of a shepherd — rebuilt in the Arx facet
 * dialect: block-prism body, chamfered feather fans, hard shade
 * steps, square pupils, no soft pill anywhere.
 */
export interface OwlLook {
  /** Mantle — the folded-wing cloak that IS the back and shoulders. */
  mantle: string;
  /** Breast keel and underwing — the pale flash of the threat bloom. */
  breast: string;
  /** Barring ink: breast chevrons, feather tips, tail bands. */
  bar: string;
  /** The facial disc plate. */
  disc: string;
  /** The disc's dark rim — what makes the disc a DISC. */
  discRim: string;
  /** The iris — the lamp of the face. */
  eye: string;
  /** Beak horn. */
  horn: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  /** Shoulder-dome height of the upright keg (tiles). */
  backH: number;
  /** Belly clearance over the shanks (tiles). */
  bellyH: number;
  headW: number;
  headH: number;
  /** Ear-tuft reach (tiles) — the horned crown; the elder's is a crest. */
  tuftLen: number;
  /** Tail-fan blade reach past the rump (tiles). */
  tailLen: number;
  /** Leading-primary reach of one spread wing (tiles). */
  wingSpan: number;
  /** Doubled disc ring, frost crown ticks — the elder's ledger. */
  elder?: boolean;
  /** Spawn seed carried on the resolved look — drives barring phase. */
  seed?: number;
}

/** The rank-and-file hunter: tawny bark camouflage, amber lamps. */
export const GREAT_OWL_LOOK: OwlLook = {
  mantle: '#8a7458',
  breast: '#d8c9a4',
  bar: '#5a4a38',
  disc: '#c9b488',
  discRim: '#4a3c30',
  eye: '#e8b23c',
  horn: '#3a3028',
  bodyW: 0.25,
  backH: 0.72,
  bellyH: 0.3,
  headW: 0.4,
  headH: 0.27,
  tuftLen: 0.16,
  tailLen: 0.38,
  wingSpan: 1.35,
};

/**
 * The elder: the parliament's high seat — never a scale-up. Storm
 * slate over moon-pale cream where the wing is bark over buff, a
 * TALL tufted crest for a crown, the disc ring doubled like a
 * weathered court seal, and frost ticked through the crown feathers.
 * It out-masses the hunter in every dimension that counts.
 */
export const ELDER_GREAT_OWL_LOOK: OwlLook = {
  mantle: '#4e5262',
  breast: '#d7d3be',
  bar: '#343846',
  disc: '#b9bdc9',
  discRim: '#2c303c',
  eye: '#f2e6a0',
  horn: '#2a2a34',
  bodyW: 0.34,
  backH: 0.94,
  bellyH: 0.38,
  headW: 0.53,
  headH: 0.35,
  tuftLen: 0.34,
  tailLen: 0.55,
  wingSpan: 1.85,
  elder: true,
};

/**
 * THE PLUMAGE CLUSTERS — four curated colorways for the rank-and-file,
 * picked by spawn seed so a parliament sorts into kin groups (the
 * gnoll coat-cluster law, feathered): tawny bark, ash gray, deep-wood
 * moss, and the birch-pale ghost. Elders never roll — an elder is a
 * DESIGN.
 */
const OWL_PLUMAGES: ReadonlyArray<
  Pick<OwlLook, 'mantle' | 'breast' | 'bar' | 'disc' | 'discRim' | 'eye'>
> = [
  // tawny bark — the shipped def color
  { mantle: '#8a7458', breast: '#d8c9a4', bar: '#5a4a38', disc: '#c9b488', discRim: '#4a3c30', eye: '#e8b23c' },
  // ash gray — the great gray of the high boughs
  { mantle: '#767c88', breast: '#ccc9bd', bar: '#474c58', disc: '#b8b5a8', discRim: '#3c4048', eye: '#e8d24c' },
  // deep-wood moss — olive umber, the pine-shadow coat
  { mantle: '#777052', breast: '#cfc298', bar: '#4c4734', disc: '#b5ab7e', discRim: '#3e3a2c', eye: '#e09a38' },
  // birch-pale — the winter ghost the loggers swear at
  { mantle: '#a8a290', breast: '#e4ddc8', bar: '#6e675a', disc: '#d5cdb4', discRim: '#575044', eye: '#f0c84a' },
];

const OWL_LOOK_CACHE = new Map<string, OwlLook>();

/**
 * Variant lookup with the hunter as the unknown-id fallback. The seed
 * (spawn eid) rolls the rank-and-file's plumage cluster plus a small
 * shade jitter — hashed first, because knot members spawn with
 * CONSECUTIVE eids and raw bits would dress a whole wing in one coat.
 * The elder holds its authored design. Cached; runs per body per frame.
 */
export function owlLook(defId: string, seed = 0): OwlLook {
  const base = defId === 'elder_great_owl' ? ELDER_GREAT_OWL_LOOK : GREAT_OWL_LOOK;
  const key = `${defId}|${seed & 0xff}`;
  const hit = OWL_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: OwlLook;
  if (defId === 'great_owl') {
    const h = (seed * 2654435761) | 0;
    const cl = OWL_PLUMAGES[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      mantle: shade(cl.mantle, jit),
      breast: cl.breast,
      bar: cl.bar,
      disc: shade(cl.disc, jit),
      discRim: cl.discRim,
      eye: cl.eye,
      seed,
    };
  } else {
    look = { ...base, seed };
  }
  OWL_LOOK_CACHE.set(key, look);
  return look;
}

/**
 * One feathered wing fan in the facet dialect: a bone-dark leading
 * arm and four chamfered primary blades stepping back from it — a
 * STEPPED silhouette, never a soft fan. Pale on the underside, so a
 * raised wing flashes the mantle warning every prey animal in the
 * wood understands. Screen-space like the bat's membranes (billboard
 * wings read at every body facing); the corpse splay squashes the
 * same fan onto the ground.
 */
export function owlWingFan(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Shoulder pivot on screen. */
    x: number;
    y: number;
    s: number;
    /** Screen angle of the leading edge (radians). */
    ang: number;
    /** 0..1 fan opening. */
    spread: number;
    /** Leading-primary reach (tiles). */
    span: number;
    /** Show the pale underside (wings up = the mantle flash). */
    under?: boolean;
    /** Vertical squash for corpse splays flat on the ground. */
    squash?: number;
    /**
     * Fan-opening scale: 1 = the full mantling droop (the standing
     * threat bloom). Level flight carries the blade flatter — cruise
     * ~0.6, a locked-out glide flatter still.
     */
    openK?: number;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const s = o.s;
  const sy = o.squash ?? 1;
  const reach = o.span * s * (0.5 + 0.5 * o.spread);
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const rib = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -11) : shade(look.mantle, -12);
  // The fan droops from the leading edge toward the ground, whichever
  // side of the screen the wing points.
  const droop = Math.cos(o.ang) >= 0 ? 1 : -1;
  const open = droop * (0.28 + 0.62 * Math.max(0.3, o.spread)) * (o.openK ?? 1);
  // ONE solid fan silhouette with a stepped trailing edge — a wing is
  // a MASS, never a rake of ribs. Five primary tips, notched between.
  const N = 5;
  const tip = (k: number): { x: number; y: number; a: number } => {
    const t = k / (N - 1);
    const a = o.ang + open * t;
    const len = reach * (1 - 0.15 * t);
    return { x: o.x + Math.cos(a) * len, y: o.y + Math.sin(a) * len * sy, a };
  };
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  for (let k = 0; k < N; k++) {
    const p = tip(k);
    ctx.lineTo(p.x, p.y);
    // The notch: a step back toward the pivot between primaries.
    if (k < N - 1) {
      const a = o.ang + open * ((k + 0.5) / (N - 1));
      const len = reach * (1 - 0.15 * ((k + 0.5) / (N - 1))) * 0.84;
      ctx.lineTo(o.x + Math.cos(a) * len, o.y + Math.sin(a) * len * sy);
    }
  }
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // Rachis lines: the feather shafts fanning through the mass.
    ctx.strokeStyle = rib;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 1; k < N - 1; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.2, o.y + (p.y - o.y) * 0.2);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    // The bar band riding the tips — one broken arc of bar ink.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.3, s * 0.024);
    for (let k = 0; k < N; k++) {
      const p = tip(k);
      ctx.beginPath();
      ctx.moveTo(o.x + (p.x - o.x) * 0.8, o.y + (p.y - o.y) * 0.8);
      ctx.lineTo(o.x + (p.x - o.x) * 0.9, o.y + (p.y - o.y) * 0.9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // The leading arm rides the front edge — the wing's bone line.
  ctx.strokeStyle = o.hurt ? '#ffffff' : shade(look.mantle, -18);
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  ctx.lineTo(o.x + Math.cos(o.ang) * reach * 0.96, o.y + Math.sin(o.ang) * reach * 0.96 * sy);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Covert chip seating the fan on the shoulder.
  ctx.fillStyle = base;
  ctx.beginPath();
  facetCircle(ctx, o.x, o.y, s * 0.08, 6, o.ang, sy);
  ctx.fill();
}

/**
 * THE BROAD WING — the great owl's living wing, drawn in BODY SPACE
 * and projected through the caller's lens, so the same mass
 * foreshortens correctly at every one of the eight facings: a
 * profile bird shows a near wing crossing its body and a far wing
 * behind it, a bird flying away shows both wings from above, and
 * nothing ever points sideways-on-screen because the screen said so.
 *
 * The planform is a real owl's: a bone-dark leading arm sweeping out
 * to the wrist, a broad slab of secondaries behind it, and FINGERED
 * primaries stepping back from the wingtip — each finger shorter and
 * further back-swept than the last — closing along a curved trailing
 * edge into the flank. Coverts shingle the shoulder, a dark
 * flight-feather band rides the outer half, and bar ink ticks the
 * finger tips. Pale underside for the mantling flash.
 */
function owlWingBroad(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    /** Body-space projector: (F fwd, L starboard, Z up) tiles → screen. */
    P: (F: number, L: number, Z: number) => [number, number];
    /** Which wing: -1 port, +1 starboard. */
    es: number;
    s: number;
    /** Wing carriage: 0 = level, + = raised (mantling), − = swept low. */
    raise: number;
    /** The HAND's carriage, trailing the arm through the beat — the
     *  tip whip. Defaults to `raise` (a held pose). */
    raiseHand?: number;
    /** Load flex: + bends the primaries UP under the power stroke,
     *  − droops them through the recovery. */
    flex?: number;
    /** Rowing swing: forward wrist offset (tiles) through the power
     *  stroke, backward on recovery. */
    swing?: number;
    /** 0..1 downwash window — pale gust streaks fall away under the
     *  wingtips right after the stroke bottoms out. */
    gust?: number;
    /** 0..1 how far the wing is unfolded from the body. */
    spread: number;
    /** Back-sweep of the primary fingers: 0.25 mantling → 1 diving. */
    sweepK: number;
    /** Leading-primary reach in tiles (the look's wingSpan). */
    span: number;
    /** Show the pale underside (raised wings flash the warning). */
    under?: boolean;
    hurt?: boolean;
    seed?: number;
  },
): void {
  const { P, es, s } = o;
  const spread = Math.max(0.05, o.spread);
  const raiseA = o.raise;
  const base = o.hurt ? '#ffffff' : o.under ? look.breast : look.mantle;
  const flightInk = o.hurt ? '#ffffff' : o.under ? shade(look.breast, -9) : shade(look.mantle, -10);
  const boneInk = o.hurt ? '#ffffff' : shade(look.mantle, -22);

  // The skeleton in body space. The arm reaches out and slightly
  // forward; the hand carries the reach and the fingers sweep back.
  const armL = o.span * 0.42 * spread;
  const handL = o.span * 0.58 * spread;
  const handA = o.raiseHand ?? raiseA;
  const flex = o.flex ?? 0;
  const shF = 0.14;
  const shL = es * look.bodyW * 0.72;
  const shZ = 0.1 + look.bodyW * 0.35;
  const cosR = Math.cos(raiseA);
  const sinR = Math.sin(raiseA);
  const wrF = shF + 0.1 * spread + (o.swing ?? 0);
  const wrL = shL + es * cosR * armL;
  const wrZ = shZ + sinR * armL;
  // Five primary fingers: tip k reaches shorter and sweeps further
  // back; the whole hand droops through the fan so a level wing
  // curves like a held glide, and a raised wing blooms.
  const N = 5;
  const tips: Array<[number, number, number]> = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const len = handL * (1 - 0.36 * u);
    // The hand carries its own (trailing) angle, and the primaries
    // BEND under load — outer fingers most, the tip-flex that turns
    // a hinged plank into a wing pushing against real air.
    const tipRaise = handA - (0.28 + 0.5 * u) * spread * 0.55;
    const backF = (0.1 + 0.85 * u) * len * o.sweepK;
    tips.push([
      wrF + 0.06 * spread - backF,
      wrL + es * Math.cos(tipRaise) * len,
      wrZ + Math.sin(tipRaise) * len * 0.85 - 0.04 * u + flex * u * u * o.span * 0.3,
    ]);
  }
  // The trailing edge closes into the flank at the tail root.
  const rootF = -0.34;
  const rootL = es * look.bodyW * 0.5;
  const rootZ = 0.06;

  // One solid slab: shoulder → leading edge → fingered tips (with the
  // stepped notches of the facet dialect) → trailing root.
  ctx.fillStyle = base;
  ctx.beginPath();
  const p0 = P(shF, shL, shZ);
  ctx.moveTo(p0[0], p0[1]);
  const pw = P(wrF, wrL, wrZ);
  ctx.lineTo(pw[0], pw[1]);
  for (let k = 0; k < N; k++) {
    const t = tips[k]!;
    const pt = P(t[0], t[1], t[2]);
    ctx.lineTo(pt[0], pt[1]);
    if (k < N - 1) {
      // The notch between primaries: step back toward the wrist.
      const n = tips[k + 1]!;
      const nx = t[0] * 0.35 + n[0] * 0.35 + wrF * 0.3;
      const nl = t[1] * 0.35 + n[1] * 0.35 + wrL * 0.3;
      const nz = t[2] * 0.35 + n[2] * 0.35 + wrZ * 0.3;
      const pn = P(nx, nl, nz);
      ctx.lineTo(pn[0], pn[1]);
    }
  }
  const pr = P(rootF, rootL, rootZ);
  ctx.lineTo(pr[0], pr[1]);
  ctx.closePath();
  ctx.fill();

  if (!o.hurt) {
    // The flight-feather band: the outer half of the slab a step
    // darker — secondaries and primaries against the paler coverts.
    ctx.fillStyle = flightInk;
    ctx.beginPath();
    const mixF = (a: [number, number, number], t: number): [number, number] =>
      P(
        a[0] * t + (shF * 0.5 + rootF * 0.5) * (1 - t),
        a[1] * t + (shL * 0.7 + rootL * 0.3) * (1 - t),
        a[2] * t + (shZ * 0.5 + rootZ * 0.5) * (1 - t),
      );
    const pm0 = mixF([wrF, wrL, wrZ], 0.45);
    ctx.moveTo(pm0[0], pm0[1]);
    const pwF = P(wrF, wrL, wrZ);
    ctx.lineTo(pwF[0], pwF[1]);
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const pt = P(t[0], t[1], t[2]);
      ctx.lineTo(pt[0], pt[1]);
    }
    const prF = mixF(tips[N - 1]!, 0.55);
    ctx.lineTo(prF[0], prF[1]);
    ctx.closePath();
    ctx.fill();
    // Bar ink ticking every finger tip — the parliament's barring.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const a = P(
        t[0] * 0.82 + wrF * 0.18,
        t[1] * 0.82 + wrL * 0.18,
        t[2] * 0.82 + wrZ * 0.18,
      );
      const b = P(
        t[0] * 0.93 + wrF * 0.07,
        t[1] * 0.93 + wrL * 0.07,
        t[2] * 0.93 + wrZ * 0.07,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // Covert shingles: two short arcs seating the wing on the body.
    ctx.strokeStyle = shade(base, -8);
    ctx.lineWidth = Math.max(1.1, s * 0.018);
    for (let r = 0; r < 2; r++) {
      const t0 = 0.2 + r * 0.16;
      const a = P(
        shF + (wrF - shF) * t0,
        shL + (wrL - shL) * t0 * 0.9,
        shZ + (wrZ - shZ) * t0 - 0.02,
      );
      const b = P(
        rootF * (0.4 + r * 0.2) + shF * (0.6 - r * 0.2),
        shL + (rootL - shL) * (0.3 + r * 0.2),
        shZ * 0.7 + rootZ * 0.3 - 0.01,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // The leading arm — the wing's bone line, shoulder to wingtip.
  ctx.strokeStyle = boneInk;
  ctx.lineWidth = Math.max(1.5, s * 0.042);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(pw[0], pw[1]);
  const lead = tips[0]!;
  const pl = P(lead[0], lead[1], lead[2]);
  ctx.lineTo(pl[0], pl[1]);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // THE DOWNWASH: right after the power stroke bottoms out, pale air
  // falls away beneath the outer primaries — brief slanting streaks
  // that sink and fade as the window closes. The whoosh, drawn.
  const gust = o.gust ?? 0;
  if (gust > 0.03 && !o.hurt) {
    const fall = (1 - gust) * 0.3;
    ctx.strokeStyle = `rgba(238, 234, 218, ${(0.3 * gust).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, s * 0.032);
    ctx.lineCap = 'round';
    for (const k of [0, 2]) {
      const t = tips[k]!;
      const a = P(t[0] - 0.03, t[1] * 1.01, t[2] - 0.08 - fall);
      const b = P(t[0] - 0.16, t[1] * 1.07, t[2] - 0.22 - fall * 1.3);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}

/**
 * The owl body: the upright keg — a tall block-prism (the wall-prism
 * dialect stood on end) under a lit shoulder dome, the folded wings
 * drawn as darker saddle panels meeting in a spine seam, the pale
 * breast keel barred in seeded chevron rows, primary steps ticking
 * the low flanks toward the tail. The attack telegraph MANTLES:
 * wings rise and spread through the windup — the threat bloom that
 * doubles the owl on screen — then snap down-forward with the strike.
 */
export function paintOwlBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: OwlLook,
  f: BeastBlockFrame,
  attackT = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const s = f.s;
  // Keg footprint: broad through the wing butts, easing at both ends.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.62],
    [hl, hw * 0.62],
    [hl * 0.42, hw],
    [-hl * 0.48, hw * 0.94],
    [-hl, hw * 0.6],
    [-hl, -hw * 0.6],
    [-hl * 0.48, -hw * 0.94],
    [hl * 0.42, -hw],
  ];
  // Parliament variance: each owl's mantle sits a step off its
  // cluster tone — a wing of owls reads as kin, never as stamps.
  const coat = shade(look.mantle, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The shoulder dome: highest over the wing butts, easing into the
    // chest front, dropping harder into the tail root.
    (X) =>
      look.backH -
      0.09 * Math.max(0, X / hl - 0.2) -
      0.07 * Math.max(0, (-X / hl - 0.4) / 0.6),
    // Deep keel chest; the stern lifts for tail clearance.
    (X) =>
      look.bellyH -
      0.04 * Math.max(0, X / hl - 0.2) +
      0.05 * Math.max(0, (-X / hl - 0.4) / 0.6),
    coat,
    (gx, gyy, lift) => {
      const tk = f.topScale ?? 1;
      const bodyA = Math.atan2(f.fy * f.ys, f.fx);
      // Folded wing panels: one long saddle blob per side, a shade
      // darker than the mantle — the closed wings ARE the back.
      for (const es of [-1, 1]) {
        ctx.save();
        ctx.translate(
          gx(-hl * 0.08, es * hw * 0.42),
          gyy(-hl * 0.08, es * hw * 0.42) - look.backH * tk * s * 0.88 - lift,
        );
        ctx.rotate(bodyA);
        ctx.fillStyle = shade(coat, -9);
        ctx.beginPath();
        facetBlob(
          ctx,
          0,
          0,
          hl * s * 0.78,
          (f.seed ^ (es * 0x2f)) | 1,
          9,
          (hw * 0.62) / (hl * 0.78),
          0.35,
        );
        ctx.fill();
        ctx.restore();
      }
      // Primary steps: folded flight feathers ticking the low flanks,
      // converging on the tail root — three hard strokes per side.
      if (!f.hurt) {
        ctx.strokeStyle = shade(coat, -18);
        ctx.lineWidth = Math.max(1.2, s * 0.02);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const X0 = -hl * (0.1 + 0.24 * k);
            ctx.beginPath();
            ctx.moveTo(
              gx(X0, es * hw * (0.82 - 0.1 * k)),
              gyy(X0, es * hw * (0.82 - 0.1 * k)) - (look.bellyH + 0.12) * s - lift,
            );
            ctx.lineTo(
              gx(X0 - hl * 0.32, es * hw * (0.52 - 0.1 * k)),
              gyy(X0 - hl * 0.32, es * hw * (0.52 - 0.1 * k)) - (look.bellyH + 0.07) * s - lift,
            );
            ctx.stroke();
          }
        }
        ctx.lineCap = 'butt';
      }
      // The breast keel: a pale bib on the camera side of the chest,
      // BARRED in seeded chevron rows — painted only while the chest
      // can actually face the camera (the wolf-bib law: flat paint
      // shows through the back when the body walks away).
      if (f.fy > -0.15) {
        const bibX = gx(hl * 0.72, 0);
        const bibY =
          gyy(hl * 0.72, 0) -
          (look.bellyH + (look.backH - look.bellyH) * 0.42) * s -
          lift;
        ctx.fillStyle = f.hurt ? '#ffffff' : look.breast;
        ctx.beginPath();
        facetBlob(ctx, bibX, bibY, hw * s * 1.0, f.seed ^ 0x51, 8, 1.5, 1.6);
        ctx.fill();
        if (!f.hurt) {
          ctx.strokeStyle = look.bar;
          ctx.lineWidth = Math.max(1.1, s * 0.016);
          ctx.lineCap = 'round';
          for (let rIdx = 0; rIdx < 3; rIdx++) {
            // Seeded phase: no two owls wear the same bars.
            const ph = (((f.seed >>> (rIdx * 2)) & 3) - 1.5) * hw * s * 0.09;
            const rw = hw * s * (0.62 - rIdx * 0.13);
            const ry = bibY + (rIdx - 0.9) * hw * s * 0.42;
            ctx.beginPath();
            ctx.moveTo(bibX - rw + ph, ry - hw * s * 0.06);
            ctx.lineTo(bibX + ph, ry + hw * s * 0.08);
            ctx.lineTo(bibX + rw + ph, ry - hw * s * 0.06);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // Spine seam from behind: the closed wings MEET — one dark part
      // line down the back, only when the rump faces the camera.
      if (f.fy < -0.2 && !f.hurt) {
        ctx.strokeStyle = shade(coat, -16);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(gx(hl * 0.3, 0), gyy(hl * 0.3, 0) - look.backH * tk * s * 0.98 - lift);
        ctx.lineTo(gx(-hl * 0.85, 0), gyy(-hl * 0.85, 0) - look.backH * tk * s * 0.62 - lift);
        ctx.stroke();
      }
    },
  );
  // THE MANTLE: only a live, standing body blooms — corpses pass a
  // collapsed topScale and never reach here with an attack running.
  if (attackT > 0 && (f.topScale ?? 1) === 1) {
    const wind = Math.min(1, attackT / 0.7);
    const strike =
      attackT > 0.7 ? Math.sin(Math.PI * Math.min(1, (attackT - 0.7) / 0.3)) : 0;
    // Windup lifts the wings high (pale undersides out); the strike
    // snaps them down-forward past level. Body-space wings: the
    // mantle blooms around the BODY's facing at every camera band.
    const raise = 0.95 * wind - 1.3 * strike;
    const spread = Math.min(1, wind * 1.15);
    const mpx = -f.fy;
    const mpy = f.fx;
    const MP = (F: number, L: number, Z: number): [number, number] => [
      f.bx + (f.fx * F + mpx * L) * s,
      f.gy - f.bob * 0.35 * s + (f.fy * F + mpy * L) * f.ys * s - (Z + look.backH * 0.45) * s,
    ];
    for (const es of [-1, 1]) {
      owlWingBroad(ctx, look, {
        P: MP,
        es,
        s,
        raise,
        spread,
        sweepK: 0.25 + 0.75 * strike,
        span: look.wingSpan,
        under: raise > 0.3,
        hurt: f.hurt,
        seed: f.seed,
      });
    }
  }
}

/**
 * The owl head, drawn in its own frame with its OWN facing — the
 * swivel means the gaze rarely matches the body line. Reads owl by
 * silhouette alone: the horned tufts, the broad low dome, and THE
 * FACIAL DISC — two rimmed lobes carrying both eyes FORWARD, thinning
 * to a crescent at profile and gone entirely from behind (no face on
 * a backskull, ever). The elder's disc ring is doubled and its crown
 * wears frost.
 */
export function drawOwlHead(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    x: number;
    y: number;
    s: number;
    /** HEAD facing (post-swivel), not the body's. */
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 beak gape through the strike — the elder's scream. */
    screech?: number;
    /** 0..1 slow two-beat blink. */
    blink?: number;
    seed?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const screech = o.dead ? 0 : (o.screech ?? 0);

  // Ear tufts on the crown — the horned silhouette. A fore/aft
  // stagger keeps the pair from collapsing to one sliver at profile
  // (the paired-gear law); the screech pins them low and flat.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.09) * ys - h * 0.42;
    const pin = screech * 0.55;
    const reach = Math.max(h * 0.2, look.tuftLen * s * (1 - 0.4 * pin));
    const tx = bxr + px * es * w * 0.2;
    const ty = byr - reach - fy * w * 0.06 * pin * ys;
    ctx.fillStyle = C(shade(look.mantle, -7));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.14, byr + h * 0.08);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // Frost tips the elder's crest — the crown it grew, not one it took.
    if (look.elder && !o.hurt) {
      ctx.strokeStyle = look.breast;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bxr + (tx - bxr) * 0.7, byr + (ty - byr) * 0.7);
      ctx.lineTo(bxr + (tx - bxr) * 0.9, byr + (ty - byr) * 0.9);
      ctx.stroke();
    }
  }

  // Skull dome — broad and low, wider than tall. The crown catches
  // the light: a round head still shows the camera its cap (the
  // top-plane law).
  ctx.fillStyle = C(look.mantle);
  ctx.beginPath();
  facetCircle(ctx, cx, cy, w * 0.56, 7, fx * 0.4 - Math.PI / 2, (h * 0.82) / (w * 0.56));
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    facetCircle(ctx, cx, cy, w * 0.56, 7, fx * 0.4 - Math.PI / 2, (h * 0.82) / (w * 0.56));
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w * 0.58, cy - h * 0.52, w * 1.16, h * 0.24);
    ctx.restore();
  }

  // THE FACE IS A TURNED SURFACE (user verdict: a feature may NEVER
  // pop). Every face station — disc lobe, eye, brow, beak — lives at
  // an AZIMUTH on the skull: the head's facing plus the station's own
  // offset. Projection is continuous: a station SLIDES around the
  // dome as the head turns, its width foreshortens toward the
  // silhouette edge (style-compressed, so the read survives deep into
  // the three-quarter), and it thins to nothing EXACTLY as it crosses
  // the horizon onto the backskull — no gate, no cull, no pop, at any
  // of the 360 degrees. Everything inside a lobe draws in the lobe's
  // own foreshortened space, so eyes, brows, blinks and shut-lines
  // all turn with the face for free.
  // THE SPHERE LAW (user verdict, the core 2.5D rule spoken once):
  // this camera never rolls. A head yawing on its vertical axis
  // SLIDES its features horizontally around the skull-sphere and
  // squashes their WIDTH — height stays screen-vertical, always.
  // Every face feature is therefore an (azimuth, height) STATION
  // projected through ONE formula — x slides on the ring, y takes
  // only the small front-back depth bow plus the feature's own
  // height — and foreshortening is a pure horizontal scale from the
  // station's own facing (style-compressed pow 0.45 so the read
  // survives the three-quarter). No local frames, no tangent
  // rotation — the earlier tangent-rotated transform ROLLED the lobe
  // into a lifted pancake at the profile bands, the exact opposite
  // of wrapping. Features never pop: width reaches zero exactly at
  // the sphere's horizon.
  const hAng = Math.atan2(fy, fx);
  const SRX = w * 0.46;
  const SRY = h * 0.24;
  const faceY = cy + h * 0.12;
  /** ONE projector: azimuth + height (+ ring-radius scale) → screen. */
  const proj = (a: number, dy: number, rK = 1): [number, number] => [
    cx + Math.cos(a) * SRX * rK,
    faceY + Math.sin(a) * SRY * ys * rK + dy,
  ];
  const fore = (a: number): number => Math.sin(a);
  const wOf = (a: number): number => Math.pow(Math.max(0, fore(a)), 0.45);
  // The two disc lobes, far-first: ascending foreshorten IS the
  // correct overlap order — the near lobe always wins the seam.
  const lobeR = w * 0.3;
  const lobes = [-1, 1]
    .map((es) => ({ es, a: hAng + es * 0.58 }))
    .sort((p, q) => fore(p.a) - fore(q.a));
  for (const { es, a } of lobes) {
    const fL = fore(a);
    if (fL <= 0.02) continue; // width has reached the horizon — gone
    const wK = wOf(a);
    const [lx, ly] = proj(a, 0);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(wK, 1);
    // Horizontal squash only — the lobe is a vertical disc on the
    // sphere's surface; its height never tips.
    ctx.fillStyle = C(look.disc);
    ctx.beginPath();
    facetCircle(ctx, 0, 0, lobeR, 7, es * 0.35, 1.02);
    ctx.fill();
    if (!o.hurt) {
      ctx.strokeStyle = look.discRim;
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.beginPath();
      facetCircle(ctx, 0, 0, lobeR * 0.95, 7, es * 0.35, 1.02);
      ctx.stroke();
      // The elder's court seal: a WHISPER of a second ring.
      if (look.elder) {
        ctx.strokeStyle = shade(look.discRim, 12);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        facetCircle(ctx, 0, 0, lobeR * 0.78, 7, -es * 0.2, 1.02);
        ctx.stroke();
      }
    }
    ctx.restore();
    // THE QUIET LAMP rides its OWN azimuth, crowded toward the face's
    // center — projected through the same formula as the lobe, so eye
    // and lobe wrap the sphere together and can never shear apart.
    const er = lobeR * (look.elder ? 0.3 : 0.27);
    const aE = hAng + es * 0.42;
    const fE = fore(aE);
    if (!o.dead && fE > 0.03) {
      const eK = wOf(aE);
      const [ex, ey] = proj(aE, lobeR * 0.04, 0.98);
      // "Inner" on screen = toward the face's center column.
      const inner = -Math.sign(Math.cos(a) || es);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(eK, 1);
      const squint = 1 - 0.3 * screech;
      ctx.fillStyle = o.hurt ? '#ffffff' : OUTLINE;
      ctx.beginPath();
      facetCircle(ctx, 0, 0, er, 6, es * 0.5, squint);
      ctx.fill();
      if (!o.hurt) {
        ctx.strokeStyle = look.eye;
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        facetCircle(ctx, 0, 0, er * 0.94, 6, es * 0.5, squint);
        ctx.stroke();
        // One pin of light, up-inner and mirrored.
        ctx.fillStyle = '#fff7e0';
        ctx.beginPath();
        facetCircle(ctx, inner * er * 0.28, -er * 0.3, er * 0.16, 5, 0.4);
        ctx.fill();
        const blink = o.blink ?? 0;
        if (blink > 0.05) {
          ctx.fillStyle = look.disc;
          ctx.fillRect(-er * 1.15, -er * 1.15, er * 2.3, er * 2.3 * Math.min(1, blink));
        }
      }
      ctx.restore();
      if (!o.hurt) {
        // The brow: TWO stations of its own — inner-high near the
        // blaze, outer-low past the eye — so the ledge wraps the
        // sphere like everything else instead of riding a local
        // frame. A line of thought, not a scowl bar.
        const b1 = proj(hAng + es * 0.2, -er * (1.6 + 0.15 * screech), 0.99);
        const b2 = proj(hAng + es * 0.62, -er * (1.2 - 0.15 * screech), 0.99);
        ctx.strokeStyle = C(shade(look.discRim, -4));
        ctx.lineWidth = Math.max(1.2, s * (look.elder ? 0.024 : 0.019));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b1[0], b1[1]);
        ctx.lineTo(b2[0], b2[1]);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    } else if (o.dead && fL > 0.03) {
      // Dead: the lamps are out — a shut-line across the lobe, its
      // two ends wrapping the sphere like any other stations.
      const d1 = proj(hAng + es * 0.24, lobeR * 0.02);
      const d2 = proj(hAng + es * 0.6, lobeR * 0.1);
      ctx.strokeStyle = C(look.discRim);
      ctx.lineWidth = Math.max(1.2, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(d1[0], d1[1]);
      ctx.lineTo(d2[0], d2[1]);
      ctx.stroke();
    }
  }
  // THE BEAK: the sphere's front station, a protruding hook — it
  // keeps its presence at profile (the silhouette's leading hook)
  // and fades by SIZE as it truly rounds the horizon. Never a gate.
  const bFore = fore(hAng);
  const bT = (bFore + 0.32) / 0.4;
  const bSizeK = bT <= 0 ? 0 : bT >= 1 ? 1 : bT * bT * (3 - 2 * bT);
  if (bSizeK > 0.02) {
    const [bx2, by2] = proj(hAng, h * 0.16, 1.14);
    ctx.save();
    ctx.translate(bx2, by2);
    const bw2 = w * 0.085 * bSizeK;
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(-bw2, -h * 0.06);
    ctx.lineTo(bw2, -h * 0.06);
    ctx.lineTo(0, h * (0.2 + 0.06 * screech));
    ctx.closePath();
    ctx.fill();
    if (screech > 0.15 && !o.hurt && !o.dead) {
      // The scream: the lower mandible drops, dark gape under it.
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(-bw2 * 0.6, h * 0.1);
      ctx.lineTo(bw2 * 0.6, h * 0.1);
      ctx.lineTo(0, h * (0.12 + 0.16 * screech));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Flight ceiling per rank (tiles over the ground anchor): the elder
 *  rides higher — rank you can read from across the glade. */
export function owlHoverHeight(look: OwlLook): number {
  return look.elder ? 1.18 : 0.98;
}

/**
 * The giant rat: a low hunched wedge — rump high and round, body
 * tapering into a pointed twitchy head with big dish ears, whiskers,
 * buck teeth and a long naked tail dragging an S behind it.
 */
export interface RatLook {
  fur: string;
  dorsal: string;
  belly: string;
  /** Naked skin — tail, nose, inner ear. */
  skin: string;
  earIn: string;
  bodyW: number;
  /** Height of the hunched rump peak. */
  humpH: number;
  headW: number;
  headH: number;
}

export const RAT_LOOK: RatLook = {
  fur: '#8a7a6a',
  dorsal: '#69594b',
  belly: '#b5a68f',
  skin: '#c9a68a',
  earIn: '#d8a396',
  bodyW: 0.2,
  humpH: 0.29,
  headW: 0.25,
  headH: 0.18,
};

export function paintRatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Teardrop footprint: full-width haunches, shoulders pinching in
  // where the head takes over.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.45],
    [hl, hw * 0.45],
    [hl * 0.2, hw * 0.85],
    [-hl * 0.5, hw],
    [-hl, hw * 0.55],
    [-hl, -hw * 0.55],
    [-hl * 0.5, -hw],
    [hl * 0.2, -hw * 0.85],
  ];
  const fur = shade(look.fur, (((f.seed >>> 7) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The hunched arch: peak over the haunches, falling away to the
    // shoulders — THE rat silhouette side-on.
    (X) => look.humpH - 0.05 * (X / hl + 0.35) * (X / hl + 0.35),
    (X) => 0.05 + 0.02 * Math.max(0, X / hl),
    fur,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Greasy dorsal stripe down the spine.
      ctx.save();
      ctx.translate(gx(-hl * 0.12, 0), gyy(-hl * 0.12, 0) - look.humpH * tk * s * 0.9 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = look.dorsal;
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.78, f.seed | 1, 9, (hw * 0.62) / (hl * 0.78), 0.9);
      ctx.fill();
      ctx.restore();
    },
  );
}

/**
 * The rat head: pointed snout wedge off a small skull, dish ears
 * behind, beady eyes, whiskers and buck teeth. Muzzle and eyes obey
 * the same foreshortening laws as the cattle and wolf.
 */
export function drawRatHead(
  ctx: CanvasRenderingContext2D,
  look: RatLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** -1..1 fast whisker twitch, idle only. */
    twitch?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Big dish ears behind the skull, pink inside when they face us. A
  // touch of along-facing stagger keeps them apart at full profile.
  for (const es of [-1, 1]) {
    const exr = cx + px * es * w * 0.5 + fx * es * w * 0.07;
    const eyr = cy + (py * es * w * 0.5 + fy * es * w * 0.07) * ys - h * 0.42;
    ctx.fillStyle = C(shade(look.fur, -8));
    ctx.beginPath();
    facetCircle(ctx, exr, eyr, w * 0.36, 6, es * 0.4);
    ctx.fill();
    if (fy > -0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      facetCircle(ctx, exr + fx * w * 0.04, eyr + fy * w * 0.04, w * 0.2, 6, es * 0.4);
      ctx.fill();
    }
  }

  // Small skull block — a step lighter than the body fur so the head
  // reads against the haunches at profile.
  ctx.fillStyle = C(shade(look.fur, 8));
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.24);
    ctx.fillStyle = C(look.belly);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Pointed snout — longer and narrower in profile, pink nose tip.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.1;
    const sl = w * (0.3 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.12;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.16 * (1 - profileK * 0.3);
    const ht = hb * 0.25;
    ctx.fillStyle = C(shade(look.fur, 8));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(look.skin);
    ctx.beginPath();
    facetCircle(ctx, tx, ty, w * 0.062, 5, fx);
    ctx.fill();
    // Buck teeth under the nose when the face shows.
    if (fy > 0.1 && !o.hurt && !o.dead) {
      ctx.fillStyle = '#efe9d8';
      ctx.fillRect(tx - w * 0.05, ty + h * 0.08, w * 0.044, h * 0.16);
      ctx.fillRect(tx + w * 0.008, ty + h * 0.08, w * 0.044, h * 0.16);
    }
    // Whiskers fanning back off the snout — the near side only once
    // the head goes full profile.
    if (!o.dead && !o.hurt) {
      ctx.strokeStyle = 'rgba(240, 236, 224, 0.7)';
      ctx.lineWidth = Math.max(0.8, s * 0.007);
      const wbx = bx0 + (axv / al) * sl * 0.55;
      const wby = by0 + (ayv / al) * sl * 0.55;
      const baseA = Math.atan2(ayv, axv);
      const tw = (o.twitch ?? 0) * 0.12;
      for (const es of [-1, 1]) {
        if (profileK > 0.75 && es * py < 0) continue;
        for (const k of [-1, 0, 1]) {
          const a = baseA + es * (1.5 - k * 0.3) + tw * es;
          ctx.beginPath();
          ctx.moveTo(wbx, wby);
          ctx.lineTo(wbx + Math.cos(a) * w * 0.52, wby + Math.sin(a) * w * 0.4);
          ctx.stroke();
        }
      }
    }
  }

  // Beady eyes at the snout root.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.16 + px * es * w * 0.27;
      const ey = cy + (fy * w * 0.16 + py * es * w * 0.27) * ys - h * 0.06;
      ctx.fillRect(ex - w * 0.05, ey - w * 0.05, w * 0.1, w * 0.1);
    }
  }
}

/**
 * The boar: a battering wedge built around four reads owned by no
 * other body — THE RAZOR HUMP (a shoulder tower falling away to a
 * lean low stern; the whole topline is a charge waiting to happen),
 * THE HEDGE CREST (a continuous serrated bristle ridge crown-to-
 * midback that erects when the charge winds up), THE RAVAGER TUSKS
 * (up-swept ivory crescents off the jaw corners), and THE GRIZZLE
 * MASK (a pale band down the snout ridge under furious little eyes).
 * The dire boar is a DESIGN, never an upscale: the mountain hump,
 * frost-tipped quills over cold iron, four aged tusks, rake scars.
 */
export interface BoarLook {
  hide: string;
  bristle: string;
  /** Lit quill tips — the crest must read on its own dark hedge. */
  quillTip: string;
  /** Grizzled dust: the snout-ridge mask and the flank band. */
  grizzle: string;
  snout: string;
  tusk: string;
  earIn: string;
  /** The furious little lamp set in the dark eye mask. */
  eye: string;
  bodyW: number;
  /** Stern topline height — the LOW end of the razorback slope. */
  backH: number;
  /** Shoulder-hump rise over the withers — the tower the slope falls from. */
  humpH: number;
  /** Bristle-quill height over the hump line. */
  crestH: number;
  /** Belly clearance at the deep chest / at the tucked stern. */
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  /** Tusk reach as a fraction of headW — the ravager dial. */
  tuskLen: number;
  /** The dire pair: upper hooks seated over the lower scimitars. */
  fourTusk?: boolean;
  /** Pale rake-scars on the flank — the dire's war record (seeded). */
  scar?: string;
  /** Heavy jowl masses framing the jaw (the dire's old-bruiser face). */
  jowl?: boolean;
  /** Tail cord length multiplier — the dire drags a longer rope. */
  tailK: number;
}

export const BOAR_LOOK: BoarLook = {
  hide: '#5e4736',
  bristle: '#291e16',
  quillTip: '#8d6c4c',
  grizzle: '#93765a',
  snout: '#c9917c',
  tusk: '#f1e8d2',
  earIn: '#241a14',
  eye: '#d8a03c',
  bodyW: 0.23,
  backH: 0.4,
  humpH: 0.15,
  crestH: 0.1,
  chestH: 0.1,
  tuckH: 0.19,
  headW: 0.33,
  headH: 0.27,
  tuskLen: 0.52,
  tailK: 1,
};

/**
 * THE SCARRED IRON: the dire boar wears a cold iron-umber coat under
 * a frost-tipped quill hedge — a mountain at the shoulder where the
 * boar is a wedge, aged four-tusk jaws where the boar carries two
 * clean crescents, and garnet eyes sunk in heavy jowls. At any zoom
 * the two must never read as one silhouette twice.
 */
export const DIREBOAR_LOOK: BoarLook = {
  hide: '#423c3e',
  bristle: '#1d181a',
  quillTip: '#a89c8a',
  grizzle: '#6f655c',
  snout: '#8d6a60',
  tusk: '#dccfa8',
  earIn: '#161113',
  eye: '#c74a35',
  bodyW: 0.3,
  backH: 0.5,
  humpH: 0.26,
  crestH: 0.13,
  chestH: 0.13,
  tuckH: 0.26,
  headW: 0.42,
  headH: 0.34,
  tuskLen: 0.62,
  fourTusk: true,
  scar: '#78685c',
  jowl: true,
  tailK: 1.55,
};

export function paintBoarBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BoarLook,
  f: BeastBlockFrame,
  /** 0..1 charge windup — the hackles stand and the crest leans in. */
  hackle = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const dire = look.fourTusk === true;
  // THE RAZOR HUMP footprint: the SHOULDERS are the widest station —
  // wider than the chest face and far wider than the stern — so the
  // battering wedge reads face-on (mass coming at you) and from
  // behind (the body falls away). A boar is all front.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.68],
    [hl, hw * 0.68],
    [hl * 0.42, hw],
    [-hl * 0.3, hw * 0.78],
    [-hl, hw * 0.5],
    [-hl, -hw * 0.5],
    [-hl * 0.3, -hw * 0.78],
    [hl * 0.42, -hw],
  ];
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  // THE RAZOR HUMP topline: one smooth curve — a shoulder tower
  // cresting just behind the neck root, falling away hard to a low
  // lean stern. The slope IS the species; a flat back is a pig.
  const topH = (X: number): number => {
    const t = X / hl; // -1 stern .. +1 chest
    const tower = Math.exp(-Math.pow((t - 0.38) / 0.56, 2));
    // The stern eases down and then FALLS into the tail root, and the
    // chest face dips a hair so the head reads carried low in front.
    const stern = 0.16 * Math.max(0, (-t - 0.25) / 0.75);
    const prow = 0.06 * Math.max(0, (t - 0.7) / 0.3);
    return look.backH * (1 - stern) + look.humpH * tower - look.backH * prow;
  };
  // Deep chest, tucked waist: the belly line climbs toward the stern
  // — the streamlined undercarriage the charge is built on.
  const botH = (X: number): number =>
    look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.42 - X / hl) / 1.1));
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    botH,
    hide,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk2 = f.topScale ?? 1;
      // THE SHOULDER SHIELD: the gristle plate every old boar carries
      // — a darker saddle over the hump, seated on the top plane so it
      // rides the mass (and the lift) like the wolf's cape.
      ctx.fillStyle = shade(look.hide, -10);
      ctx.beginPath();
      facetBlob(
        ctx,
        gx(hl * 0.34, 0),
        gyy(hl * 0.34, 0) - topH(hl * 0.34) * tk2 * s * 0.82 - lift,
        hw * s * 0.78,
        f.seed ^ 0x2f,
        7,
        0.62,
        1.6,
      );
      ctx.fill();
      // Grizzled flank band — lighter dust low on the barrel, chest-
      // side only so it never pastes onto the rump from behind.
      if (f.fy > -0.15) {
        ctx.fillStyle = shade(look.grizzle, -18);
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.18, 0),
          gyy(hl * 0.18, 0) - (botH(hl * 0.18) + 0.1) * s - lift * 0.8,
          hw * s * 0.8,
          f.seed ^ 0x55,
          7,
          0.62,
          1.7,
        );
        ctx.fill();
      }
      // THE HAMS: walking away, the stern face needs muscle — two
      // soft creases splitting the rump into haunches, or the back
      // band reads as a shipping crate.
      if (f.fy < -0.35) {
        ctx.strokeStyle = shade(look.hide, -14);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          const Y = es * hw * 0.34;
          ctx.beginPath();
          ctx.moveTo(gx(-hl * 0.92, Y), gyy(-hl * 0.92, Y) - (botH(-hl) + 0.06) * s - lift * 0.7);
          ctx.quadraticCurveTo(
            gx(-hl * 0.98, Y * 0.5), gyy(-hl * 0.98, Y * 0.5) - topH(-hl) * s * 0.45 - lift * 0.7,
            gx(-hl * 0.9, Y * 0.3), gyy(-hl * 0.9, Y * 0.3) - topH(-hl) * s * 0.68 - lift * 0.7,
          );
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // THE WAR RECORD (dire only): pale rake-scars combed down the
      // near flank — seeded so every dire carries different history.
      if (look.scar && f.fy > -0.3) {
        ctx.strokeStyle = look.scar;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.lineCap = 'round';
        const n = 2 + ((f.seed >>> 3) & 1);
        for (let i = 0; i < n; i++) {
          const hsh = ((f.seed * 2654435761) >>> (5 + i * 4)) & 15;
          const X0 = hl * (0.42 - 0.34 * i - (hsh & 3) * 0.03);
          const y0 = -(botH(X0) + 0.14 + (hsh >> 2) * 0.012) * s;
          ctx.beginPath();
          ctx.moveTo(gx(X0, 0), gyy(X0, 0) + y0 - lift * 0.7);
          ctx.lineTo(gx(X0 - hl * 0.1, 0), gyy(X0 - hl * 0.1, 0) + y0 - s * 0.085 - lift * 0.7);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    },
  );
  // THE HEDGE CREST: a continuous serrated bristle ridge running from
  // the crown down past the hump — painted after the body (the clip
  // would eat anything above the hull) as ONE saw-toothed polygon, so
  // it reads as a hedge, never scattered ticks. THE RIDGE RIDES THE
  // CROWN (turtle law): the root slides up-crown by the lateral
  // projection so it sits dead-center going away and on the skyline
  // at profile. The charge stands the hackles.
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const ridgeY = -py * hw * 0.66;
  const spineAt = (X: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * ridgeY) * s,
    y: gy + (fy * X + py * ridgeY) * ys * s - topH(X) * tk * s - lift,
  });
  // Face-on the hedge is a sagittal fin seen edge-on: full height
  // stacks into a lone antenna over the crown, so it crops to a
  // stubble ridge coming toward camera and keeps its full skyline
  // everywhere else (going away it reads as the marching caps).
  const rise = (1 + 0.5 * hackle) * (1 - 0.42 * Math.max(0, fy));
  const lean = hackle * hl * 0.05;
  const N = dire ? 9 : 7;
  const X_HI = hl * 0.68;
  const X_LO = -hl * 0.34;
  const hedge = new Path2D();
  const first = spineAt(X_HI);
  hedge.moveTo(first.x, first.y + s * 0.03);
  const teeth: Array<{ bx0: number; by0: number; x: number; y: number; w: number }> = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const X0 = X_HI + (X_LO - X_HI) * t;
    const X1 = X_HI + (X_LO - X_HI) * (t + 0.5 / (N - 1));
    const a = spineAt(X0);
    // Quill height follows the hump — tallest over the tower, dying
    // toward the stern — and stands with the hackle.
    const hump = Math.exp(-Math.pow((X0 / hl - 0.3) / 0.62, 2));
    const hgt = s * tk * look.crestH * (0.45 + 0.85 * hump) * rise;
    const mid = spineAt(Math.min(X_HI, X1 + lean));
    teeth.push({ bx0: a.x, by0: a.y, x: mid.x, y: (a.y + mid.y) / 2 - hgt, w: hgt });
    hedge.lineTo(mid.x, (a.y + mid.y) / 2 - hgt);
    const b = spineAt(X_HI + (X_LO - X_HI) * Math.min(1, t + 1 / (N - 1)));
    hedge.lineTo(b.x, b.y + s * 0.03);
  }
  ctx.fillStyle = f.hurt ? '#ffffff' : look.bristle;
  ctx.fill(hedge);
  if (!f.hurt) {
    // Every quill wears a lit LEADING edge — without it the hedge
    // sinks into the hide at the back bands (dark teeth on dark coat,
    // the worg ears-vanish lesson at spine scale)...
    ctx.strokeStyle = look.quillTip;
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    for (const q of teeth) {
      ctx.moveTo(q.bx0, q.by0 + s * 0.015);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    // ...and a pale cap at the apex — the frost tip that names the
    // dire's hedge from any distance.
    ctx.fillStyle = look.quillTip;
    for (const q of teeth) {
      const tw = Math.max(s * 0.014, q.w * 0.16);
      ctx.beginPath();
      ctx.moveTo(q.x - tw, q.y + tw * 2.4);
      ctx.lineTo(q.x, q.y);
      ctx.lineTo(q.x + tw, q.y + tw * 2.4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The boar head: the wedge's PROW — a deep skull carried low, pinned
 * bristle ears, a grizzle-mask ridge running down to the flat SNOUT
 * DISC, and THE RAVAGER TUSKS: ivory crescents sweeping up-and-out
 * from dark gum seats at the jaw corners, with the mouth's gape line
 * carved between them. The dire look adds the second (upper) pair,
 * heavy jowls, and a seeded chipped tip — an old jaw, not a clean
 * one. `charge` pins the ears and bares the gape.
 */
export function drawBoarHead(
  ctx: CanvasRenderingContext2D,
  look: BoarLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph — ears pin, gape bares. */
    charge?: number;
    /** Stable per-entity seed — the dire's chipped tusk picks a side. */
    seed?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const charge = o.charge ?? 0;
  const seed = o.seed ?? 0;

  // Small pointed ears swept back along the crest, staggered fore/aft
  // so profile keeps the pair readable; the charge pins them flat.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.07 - fx * w * 0.18;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.07) * ys - h * 0.46 - fy * w * 0.18 * ys;
    const pin = 0.3 + charge * 0.55;
    const tx = bxr - fx * w * 0.34 * pin + px * es * w * 0.12;
    const ty = byr - h * (0.6 - 0.3 * pin) - fy * w * 0.34 * pin * ys;
    ctx.fillStyle = C(look.bristle);
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.14, byr + h * 0.06);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // Inner-ear shadow keeps the blade from reading as a horn nub.
    if (!o.hurt && fy > 0.1) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.06, byr + h * 0.04);
      ctx.lineTo(tx - (tx - bxr) * 0.25, ty + (byr - ty) * 0.25);
      ctx.lineTo(bxr + px * es * w * 0.08, byr + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Skull block — deep jaw, bristled crown, lit brow ledge. A step
  // brighter than the body's shaded flanks (the turtle mail lesson: a
  // face darker than its mass reads as a WINDOW, never a head).
  ctx.fillStyle = C(shade(look.hide, 10));
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.18, w * 0.18, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.18, w * 0.18, w * 0.3, w * 0.3]);
    ctx.clip();
    // The bristle FORELOCK: a modest peaked wedge rolling off the
    // crown — never a flat band (a full-width bar read as a hat
    // brim), lifted off pure crest ink so the face keeps its values.
    ctx.fillStyle = C(shade(look.bristle, 22));
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, cy - h / 2);
    ctx.lineTo(cx, cy - h / 2 + h * 0.2);
    ctx.lineTo(cx + w * 0.3, cy - h / 2);
    ctx.closePath();
    ctx.fill();
    // ...over a lit brow ledge (the light the eyes glower under).
    ctx.fillStyle = 'rgba(255, 244, 220, 0.13)';
    ctx.fillRect(cx - w / 2, cy - h / 2 + h * 0.2, w, h * 0.14);
    // THE BLAZE: the grizzle ridge climbing from the muzzle root up
    // between the eyes — it splits the dark face into planes and
    // carries the mask read to the front bands.
    if (fy > -0.2) {
      ctx.fillStyle = C(shade(look.grizzle, -6));
      ctx.beginPath();
      ctx.moveTo(cx + fx * w * 0.05 - px * w * 0.07, cy + (fy * w * 0.05 - py * w * 0.07) * ys - h * 0.16);
      ctx.lineTo(cx + fx * w * 0.05 + px * w * 0.07, cy + (fy * w * 0.05 + py * w * 0.07) * ys - h * 0.16);
      ctx.lineTo(cx + fx * w * 0.3 + px * w * 0.055, cy + (fy * w * 0.3 + py * w * 0.055) * ys + h * 0.18);
      ctx.lineTo(cx + fx * w * 0.3 - px * w * 0.055, cy + (fy * w * 0.3 - py * w * 0.055) * ys + h * 0.18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // THE JOWLS (dire): heavy cheek masses hung at the jaw line — the
  // old bruiser's face, framing the tusk roots.
  if (look.jowl && !o.hurt && fy > -0.35) {
    ctx.fillStyle = shade(look.hide, -7);
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.62 && es * py < 0) continue;
      ctx.beginPath();
      facetCircle(
        ctx,
        cx + px * es * w * 0.4 + fx * w * 0.08,
        cy + (py * es * w * 0.4 + fy * w * 0.08) * ys + h * 0.28,
        w * 0.15,
        6,
        es * 3 + seed,
      );
      ctx.fill();
    }
  }

  // Muzzle wedge → snout disc, foreshortening with the facing.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.26;
    const by0 = cy + fy * w * 0.26 * ys + h * 0.16;
    const sl = w * (0.28 + 0.26 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.08;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const ax = axv / al;
    const ay = ayv / al;
    const nx = -ay;
    const ny = ax;
    const hb = w * 0.24 * (1 - profileK * 0.2);
    const ht = hb * 0.74;
    ctx.fillStyle = C(shade(look.hide, 4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // THE GRIZZLE MASK: the pale dust band riding the snout ridge
    // from the brow to the disc — the read that ages the face.
    if (!o.hurt) {
      ctx.fillStyle = C(look.grizzle);
      ctx.beginPath();
      ctx.moveTo(bx0 - ax * w * 0.1 + nx * hb * 0.34, by0 - ay * w * 0.1 + ny * hb * 0.34);
      ctx.lineTo(tx - ax * w * 0.04 + nx * ht * 0.42, ty - ay * w * 0.04 + ny * ht * 0.42);
      ctx.lineTo(tx - ax * w * 0.04 - nx * ht * 0.42, ty - ay * w * 0.04 - ny * ht * 0.42);
      ctx.lineTo(bx0 - ax * w * 0.1 - nx * hb * 0.34, by0 - ay * w * 0.1 - ny * hb * 0.34);
      ctx.closePath();
      ctx.fill();
    }
    // THE GAPE: the dark mouth line carved back from under the disc
    // toward the tusk roots — bared wider through the charge.
    if (!o.hurt) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, w * (0.028 + 0.02 * charge));
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.6 && es * py < 0) continue;
        ctx.beginPath();
        ctx.moveTo(tx - ax * w * 0.03 + nx * es * ht * 0.7, ty - ay * w * 0.03 + ny * es * ht * 0.7 + h * 0.14);
        ctx.quadraticCurveTo(
          bx0 + ax * sl * 0.4 + nx * es * hb * 0.95,
          by0 + ay * sl * 0.4 + ny * es * hb * 0.95 + h * (0.24 + 0.05 * charge),
          bx0 + nx * es * hb * 1.02,
          by0 + ny * es * hb * 1.02 + h * 0.2,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // THE RAVAGER TUSKS: ivory crescents rooted in dark gum seats at
    // the jaw corners, sweeping OUT then UP past the snout line —
    // weapons first, dentistry second. The far one hides at profile.
    // The dire carries the FOURFOLD JAW: upper hooks over the lower
    // scimitars, and one seeded CHIP — the tip an old fight kept.
    const reach = w * look.tuskLen;
    const chipSide = look.fourTusk ? ((seed >>> 2) & 1) * 2 - 1 : 0;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const rx = bx0 + ax * sl * 0.42 + nx * es * hb * 0.92;
      const ry = by0 + ay * sl * 0.42 + ny * es * hb * 0.92 + h * 0.18;
      // Gum seat: the dark socket the ivory grows from.
      ctx.fillStyle = C(shade(look.hide, -20));
      ctx.beginPath();
      facetCircle(ctx, rx, ry, w * 0.06, 5, es + seed);
      ctx.fill();
      // Lower scimitar: root → outward flare → up-curved tip. Chipped
      // tusks stop short and end blunt.
      const chip = es === chipSide ? 0.72 : 1;
      const tipX = rx + nx * es * reach * 0.5 + ax * reach * 0.18;
      const tipY = ry + ny * es * reach * 0.5 * 0.8 - reach * 0.78 * chip + ay * reach * 0.14;
      const midX = rx + nx * es * reach * 0.42 + ax * reach * 0.1;
      const midY = ry + ny * es * reach * 0.3 - reach * 0.18;
      ctx.fillStyle = C(look.tusk);
      ctx.beginPath();
      ctx.moveTo(rx - nx * es * w * 0.07 + ax * w * 0.02, ry + h * 0.06);
      ctx.quadraticCurveTo(midX + nx * es * w * 0.075, midY + h * 0.07, tipX, tipY);
      ctx.quadraticCurveTo(midX - nx * es * w * 0.085, midY - h * 0.01, rx + ax * w * 0.06, ry - h * 0.04);
      ctx.closePath();
      ctx.fill();
      // The ivory's shadowed inner edge — volume, not a paper sliver.
      if (!o.hurt) {
        ctx.strokeStyle = shade(look.tusk, -32);
        ctx.lineWidth = Math.max(1, w * 0.022);
        ctx.beginPath();
        ctx.moveTo(rx + ax * w * 0.03, ry);
        ctx.quadraticCurveTo(midX - nx * es * w * 0.02, midY + h * 0.02, tipX, tipY);
        ctx.stroke();
      }
      // The dire's upper hook: shorter, curling back over the gape.
      if (look.fourTusk) {
        const ur = w * 0.3;
        const urx = rx + ax * w * 0.09 + nx * es * w * 0.02;
        const ury = ry - h * 0.16;
        ctx.fillStyle = C(shade(look.tusk, -12));
        ctx.beginPath();
        ctx.moveTo(urx - nx * es * w * 0.03, ury + h * 0.04);
        ctx.quadraticCurveTo(
          urx + nx * es * ur * 0.5,
          ury - ur * 0.3,
          urx + nx * es * ur * 0.52 - ax * ur * 0.3,
          ury - ur * 0.62,
        );
        ctx.quadraticCurveTo(urx + nx * es * ur * 0.2, ury - ur * 0.2, urx + ax * w * 0.03, ury);
        ctx.closePath();
        ctx.fill();
      }
    }
    // THE SNOUT DISC — the flat pad seated on the tip, nostrils when
    // it faces the camera.
    ctx.fillStyle = C(look.snout);
    ctx.beginPath();
    facetCircle(
      ctx,
      tx - ax * w * 0.015,
      ty - ay * w * 0.015,
      w * 0.14 * (1 - profileK * 0.35),
      6,
      fx,
      1 - profileK * 0.3,
    );
    ctx.fill();
    if (profileK < 0.55 && !o.hurt && !o.dead) {
      ctx.fillStyle = shade(look.snout, -38);
      for (const es of [-1, 1]) {
        ctx.fillRect(tx + nx * es * w * 0.05 - w * 0.017, ty - h * 0.03, w * 0.034, h * 0.08);
      }
    }
  }

  // THE FURIOUS EYE: a small lamp sunk in a dark mask patch under the
  // brow — tiny on purpose (the small eye sells the mass), lit in the
  // species color. Dead pigs show only the mask.
  if (fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.3) * ys - h * 0.1;
      ctx.fillStyle = C(shade(look.hide, -26));
      ctx.beginPath();
      facetCircle(ctx, ex, ey, w * 0.085, 5, es * 2 + 1);
      ctx.fill();
      if (!o.dead && !o.hurt) {
        ctx.fillStyle = look.eye;
        ctx.fillRect(ex - w * 0.032, ey - w * 0.026, w * 0.064, w * 0.052);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(ex - w * 0.016, ey - w * 0.02, w * 0.032, w * 0.04);
      }
    }
  }
}

/**
 * The giant spider: two block masses — a low cephalothorax carrying the
 * eye cluster and fang chips, a domed abdomen behind wearing pale
 * chevrons — slung between eight thin stalking legs. No head or tail
 * painter: the whole animal is the body.
 */
export interface SpiderLook {
  carapace: string;
  abdomen: string;
  mark: string;
  eye: string;
  fang: string;
  /** Abdomen half-width; the cephalothorax runs narrower. */
  bodyW: number;
  abdH: number;
  cephH: number;
}

export const SPIDER_LOOK: SpiderLook = {
  carapace: '#3a3244',
  abdomen: '#453a55',
  mark: '#b7a76a',
  eye: '#d95763',
  fang: '#efe9d8',
  bodyW: 0.21,
  abdH: 0.34,
  cephH: 0.19,
};

export function paintSpiderBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SpiderLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const s = f.s;
  const fx = f.fx;
  const fy = f.fy;
  const px = -fy;
  const py = fx;
  const carapace = shade(look.carapace, (((f.seed >>> 5) & 7) - 3) * 2);

  // Abdomen: a domed octagon over the rear half, peaked mid-mass.
  const aC = -hl * 0.45;
  const aR = hl * 0.55;
  const abdomen: Array<[number, number]> = [
    [aC + aR, -hw * 0.55],
    [aC + aR, hw * 0.55],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  paintBlockBody(
    ctx,
    f,
    abdomen,
    (X) => look.abdH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
    () => 0.1,
    shade(look.abdomen, (((f.seed >>> 5) & 7) - 3) * 2),
    (gx, gyy, lift) => {
      const tk = f.topScale ?? 1;
      // Pale chevrons marching rearward down the dome — drawn in the
      // abdomen's own rotated frame so every facing keeps the V shape.
      ctx.save();
      ctx.translate(gx(aC, 0), gyy(aC, 0) - look.abdH * tk * s * 0.86 - lift);
      ctx.rotate(Math.atan2(fy * f.ys, fx));
      ctx.strokeStyle = look.mark;
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.lineCap = 'round';
      const wv = hw * s * 0.42;
      for (const q of [0.3, 0, -0.3]) {
        const mx = aR * q * s;
        ctx.beginPath();
        ctx.moveTo(mx - wv * 0.5, -wv);
        ctx.lineTo(mx + wv * 0.45, 0);
        ctx.lineTo(mx - wv * 0.5, wv);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    },
  );
  // Spinneret nub off the abdomen's stern.
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.abdomen, -18);
  ctx.beginPath();
  facetCircle(
    ctx,
    f.bx + fx * (aC - aR) * s * 1.02,
    f.gy + fy * (aC - aR) * s * 1.02 * f.ys - 0.12 * s,
    s * 0.045,
    5,
    fx,
  );
  ctx.fill();

  // Cephalothorax: the lower front plate the legs crowd around.
  const cC = hl * 0.4;
  const cR = hl * 0.5;
  const cw = hw * 0.62;
  const ceph: Array<[number, number]> = [
    [cC + cR, -cw * 0.6],
    [cC + cR, cw * 0.6],
    [cC + cR * 0.45, cw],
    [cC - cR * 0.55, cw * 0.95],
    [cC - cR, cw * 0.55],
    [cC - cR, -cw * 0.55],
    [cC - cR * 0.55, -cw * 0.95],
    [cC + cR * 0.45, -cw],
  ];
  paintBlockBody(
    ctx,
    f,
    ceph,
    (X) => look.cephH * (1 - 0.3 * Math.pow((X - cC) / cR, 2)),
    () => 0.08,
    carapace,
  );

  // Eye cluster: four hunter's beads across the front plate brow —
  // far-side pair hiding at profile, none from behind, none dead.
  const dead = f.topScale !== undefined && f.topScale < 1;
  if (fy > -0.45 && !f.hurt && !dead) {
    ctx.fillStyle = look.eye;
    for (const [ex0, es] of [
      [0.86, -0.5],
      [0.86, 0.5],
      [0.78, -1.1],
      [0.78, 1.1],
    ] as Array<[number, number]>) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = f.bx + (fx * hl * ex0 + px * es * cw * 0.4) * s;
      const ey =
        f.gy + (fy * hl * ex0 + py * es * cw * 0.4) * f.ys * s - look.cephH * s * 0.82 - f.bob * 0.35 * s;
      const er = s * (Math.abs(es) < 0.8 ? 0.028 : 0.02);
      ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    }
  }
  // Fang chips under the brow — flared mid-pounce.
  if (fy > -0.3 && !f.hurt) {
    const flare = 1 + Math.min(1, at * 1.6) * 0.5;
    ctx.fillStyle = look.fang;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      const fx0 = f.bx + (fx * hl * 0.92 + px * es * cw * 0.3) * s;
      const fy0 =
        f.gy + (fy * hl * 0.92 + py * es * cw * 0.3) * f.ys * s - look.cephH * s * 0.4 - f.bob * 0.35 * s;
      ctx.beginPath();
      ctx.moveTo(fx0 - s * 0.022, fy0);
      ctx.lineTo(fx0 + es * px * s * 0.012, fy0 + s * 0.075 * flare);
      ctx.lineTo(fx0 + s * 0.022, fy0);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The wild ram: a boxy fleece loaf on sturdy legs with a dark bare
 * face — and the signature, big ridged horns curling back around the
 * ears. The charge drops the whole head into a battering line.
 */
export interface RamLook {
  wool: string;
  /** Bare face and leg tone — dark against the fleece. */
  face: string;
  horn: string;
  hornRib: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** Horn curl radius (tiles). */
  hornR: number;
}

export const RAM_LOOK: RamLook = {
  wool: '#cfc6b4',
  face: '#6b5a48',
  horn: '#9d8257',
  hornRib: '#77613f',
  bodyW: 0.21,
  backH: 0.44,
  chestH: 0.15,
  headW: 0.26,
  headH: 0.22,
  hornR: 0.165,
};

export function paintRamBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RamLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Nearly a full rectangle — the fleece hides the taper a leaner
  // animal would show; the loaf read IS the sheep read.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.72],
    [hl, hw * 0.72],
    [hl * 0.55, hw],
    [-hl * 0.55, hw],
    [-hl, hw * 0.72],
    [-hl, -hw * 0.72],
    [-hl * 0.55, -hw],
    [hl * 0.55, -hw],
  ];
  const wool = shade(look.wool, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.backH * (1 - 0.1 * Math.pow(X / hl, 2)),
    () => look.chestH,
    wool,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Lumpy fleece: lighter wool clumps drifting along the back in
      // the body's rotated frame, seeded per animal.
      ctx.save();
      ctx.translate(gx(0, 0), gyy(0, 0) - look.backH * tk * s * 0.88 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = shade(wool, 14);
      for (let k = 0; k < 3; k++) {
        const b = ((f.seed >>> (k * 5 + 3)) & 7) / 7;
        ctx.beginPath();
        facetBlob(
          ctx,
          (k - 1) * hl * s * 0.58,
          (b - 0.5) * hw * s * 0.5,
          hl * s * 0.36,
          (f.seed ^ (k * 0x51)) | 0,
          7,
          (hw * 0.75) / (hl * 0.72),
          k * 1.9,
        );
        ctx.fill();
      }
      ctx.restore();
    },
  );
}

/**
 * The ram head: horns first — each curls in its sagittal plane, up
 * over the ear, back, down and forward, drifting outward through the
 * spiral so the front view reads as two curls flanking the poll.
 * Growth ribs cross the curl. The bare face is a dark slab under a
 * wool cap.
 */
export function drawRamHead(
  ctx: CanvasRenderingContext2D,
  look: RamLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph. */
    charge?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const fsx = fx;
  const fsy = fy * ys;

  for (const es of [-1, 1]) {
    // The far horn only vanishes deep into profile — it is the ram's
    // whole identity, so it holds on longer than an ear would.
    if (Math.abs(fx) > 0.75 && es * py < 0) continue;
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.05) * ys - h * 0.28;
    const R = look.hornR * s;
    const NPT = 9;
    // A solid tapered ribbon along the spiral — inner and outer edges
    // offset radially from the curl center, so the horn reads as one
    // carved mass, never a wire loop.
    const outer: Array<{ x: number; y: number }> = [];
    const inner: Array<{ x: number; y: number }> = [];
    const at = (t: number, rOff: number): { x: number; y: number } => {
      const phi = 1.95 + t * 4.05;
      const r = Math.max(R * 0.12, R * (1 - 0.38 * t) + rOff);
      const out = Math.sin(Math.PI * Math.min(1, t * 1.15)) * R * 0.78;
      return {
        x: bxr + Math.cos(phi) * fsx * r + px * es * out,
        y: byr + Math.cos(phi) * fsy * r - Math.sin(phi) * r + py * es * out * ys,
      };
    };
    for (let i = 0; i <= NPT; i++) {
      const t = i / NPT;
      const wdt = w * (0.19 - 0.13 * t);
      outer.push(at(t, wdt));
      inner.push(at(t, -wdt));
    }
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(outer[0]!.x, outer[0]!.y);
    for (let i = 1; i <= NPT; i++) ctx.lineTo(outer[i]!.x, outer[i]!.y);
    for (let i = NPT; i >= 0; i--) ctx.lineTo(inner[i]!.x, inner[i]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    // Growth ribs across the curl — what makes it horn, not hose.
    if (!o.hurt) {
      ctx.strokeStyle = C(look.hornRib);
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const rt of [0.2, 0.42, 0.64]) {
        const a = at(rt, w * (0.19 - 0.13 * rt));
        const b = at(rt, -w * (0.19 - 0.13 * rt));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Bare dark face under a wool poll cap.
  ctx.fillStyle = C(look.face);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = C(look.wool);
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.3);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.24, w, h * 0.26);
    ctx.restore();
  }

  // Roman-nose muzzle wedge, foreshortening with the facing.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.16;
    const sl = w * (0.18 + 0.18 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.21 * (1 - profileK * 0.22);
    const ht = hb * 0.66;
    ctx.fillStyle = C(shade(look.face, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.07, 5, fx);
    ctx.fill();
  }

  // Small dark eyes under the horn bases.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.3) * ys - h * 0.06;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}

/**
 * The kept ewe — THE FLEECE TELLS THE TIME. Two bodies in one
 * painter: a full cloud of scalloped cream fleece while the wool
 * stands ready for the shears, and a clipped, slimmer trim while it
 * regrows — the produce clock worn as silhouette, readable across a
 * whole yard. Dark bare face, drooping ears, no horns: kin to the
 * crag ram, but nobody's charger.
 */
export interface SheepLook {
  /** Standing fleece — and the duller clipped tone beneath it. */
  wool: string;
  woolShorn: string;
  /** Bare face, ears, and legs — dark against the cream. */
  face: string;
  bodyW: number;
  /** Fleece height standing full — and trimmed after the shears. */
  backH: number;
  backHShorn: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const SHEEP_LOOK: SheepLook = {
  wool: '#e6dfcd',
  woolShorn: '#d6cab0',
  face: '#4f4234',
  bodyW: 0.23,
  backH: 0.48,
  backHShorn: 0.35,
  chestH: 0.16,
  headW: 0.21,
  headH: 0.19,
};

export function paintSheepBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SheepLook,
  f: BeastBlockFrame,
  shorn: boolean,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW * (shorn ? 0.84 : 1);
  // Full fleece: a rounded cloud, widest amidships, scalloped at the
  // waist. Shorn: the trimmer animal underneath, straighter-sided.
  const foot: Array<[number, number]> = shorn
    ? [
        [hl * 0.92, -hw * 0.7],
        [hl * 0.92, hw * 0.7],
        [hl * 0.5, hw],
        [-hl * 0.5, hw],
        [-hl * 0.92, hw * 0.7],
        [-hl * 0.92, -hw * 0.7],
        [-hl * 0.5, -hw],
        [hl * 0.5, -hw],
      ]
    : [
        [hl, -hw * 0.6],
        [hl, hw * 0.6],
        [hl * 0.62, hw * 0.96],
        [0, hw],
        [-hl * 0.62, hw * 0.96],
        [-hl, hw * 0.6],
        [-hl, -hw * 0.6],
        [-hl * 0.62, -hw * 0.96],
        [0, -hw],
        [hl * 0.62, -hw * 0.96],
      ];
  const base = shade(shorn ? look.woolShorn : look.wool, (((f.seed >>> 5) & 7) - 3) * 2);
  const backH = shorn ? look.backHShorn : look.backH;
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => backH * (1 - (shorn ? 0.12 : 0.18) * Math.pow(X / hl, 2)),
    () => look.chestH,
    base,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      ctx.save();
      ctx.translate(gx(0, 0), gyy(0, 0) - backH * tk * s * 0.88 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      if (shorn) {
        // Shear tracks — the rows the blades left across the back —
        // and one spared tuft at the rump: regrowth's first word.
        ctx.strokeStyle = shade(base, -12);
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(-hl * s * 0.72, k * hw * s * 0.42);
          ctx.quadraticCurveTo(0, k * hw * s * 0.58, hl * s * 0.7, k * hw * s * 0.4);
          ctx.stroke();
        }
        ctx.fillStyle = shade(look.wool, 6);
        ctx.beginPath();
        facetBlob(ctx, -hl * s * 0.74, 0, hl * s * 0.2, f.seed | 0, 6, 0.8, 1.3);
        ctx.fill();
      } else {
        // The cloud: five scalloped clumps in two drifted rows, each
        // a shadowed base under a lit crown, seeded per animal — the
        // cauliflower read that says WOOL, not hide.
        const CLUMPS: Array<[number, number, number]> = [
          [-0.62, -0.3, 0.34],
          [-0.6, 0.32, 0.36],
          [0.02, -0.02, 0.42],
          [0.6, -0.3, 0.34],
          [0.58, 0.3, 0.33],
        ];
        for (let k = 0; k < CLUMPS.length; k++) {
          const [ckx, cky, ckr] = CLUMPS[k]!;
          const jx = (((f.seed >>> (k * 3 + 2)) & 3) - 1.5) * 0.04;
          const jy = (((f.seed >>> (k * 3 + 5)) & 3) - 1.5) * 0.04;
          const mx = (ckx + jx) * hl * s;
          const my = (cky + jy) * hw * s * 0.9;
          const mr = ckr * hl * s;
          const asp = (hw * 0.8) / hl;
          ctx.fillStyle = shade(base, -14);
          ctx.beginPath();
          facetBlob(ctx, mx + s * 0.016, my + s * 0.02, mr, (f.seed ^ (k * 0x9e)) | 0, 7, asp, k * 1.7);
          ctx.fill();
          ctx.fillStyle = shade(base, 16);
          ctx.beginPath();
          facetBlob(ctx, mx, my - s * 0.012, mr * 0.94, (f.seed ^ (k * 0x9e)) | 0, 7, asp, k * 1.7);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  );
  // The crown scallops: the block hull is convex, so the cloud's
  // bumpy top can't come from the footprint — clumps ride OVER the
  // back line instead, breaking the straight roof into wool. Full
  // fleece only; the clipped trim keeps its flat top.
  if (!shorn && !f.hurt) {
    const { bx, gy, s, fx, fy, ys } = f;
    const px = -fy;
    const py = fx;
    const lift = f.bob * 0.35 * s;
    const tk = f.topScale ?? 1;
    const CROWN: Array<[number, number, number]> = [
      [-0.6, -0.12, 0.24],
      [-0.16, 0.14, 0.26],
      [0.28, -0.14, 0.25],
      [0.64, 0.1, 0.21],
    ];
    for (let k = 0; k < CROWN.length; k++) {
      const [ckx, cky, ckr] = CROWN[k]!;
      const jx = (((f.seed >>> (k * 4 + 1)) & 3) - 1.5) * 0.05;
      const X = (ckx + jx) * hl;
      const Y = cky * hw;
      const topY = backH * (1 - 0.18 * Math.pow(X / hl, 2)) * tk * s;
      const gxp = bx + (fx * X + px * Y) * s;
      const gyp = gy + (fy * X + py * Y) * ys * s - topY - lift + Y * s * f.roll * 0.4;
      const mr = ckr * hl * s;
      // Soft wool: a shadow crescent tucked under a lit clump — no
      // ink (a stroked ring on the lit top face reads as a hoop).
      ctx.fillStyle = shade(base, -7);
      ctx.beginPath();
      facetBlob(ctx, gxp + s * 0.018, gyp + s * 0.028, mr, (f.seed ^ (k * 0x77)) | 0, 7, 0.68, k * 2.3);
      ctx.fill();
      ctx.fillStyle = shade(base, 22);
      ctx.beginPath();
      facetBlob(ctx, gxp, gyp - s * 0.006, mr * 0.96, (f.seed ^ (k * 0x77)) | 0, 7, 0.68, k * 2.3);
      ctx.fill();
    }
  }
}

/**
 * The ewe head: drooping dark ears off the poll, a bare slab face
 * under a puffed wool cap, a short straight muzzle — everything the
 * ram's skull is not (no horns, no Roman nose, no menace).
 */
export function drawSheepHead(
  ctx: CanvasRenderingContext2D,
  look: SheepLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Body tone behind the poll cap — the shorn trim dulls it. */
    capTone?: string;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const cap = o.capTone ?? look.wool;

  // Drooping ears first, behind the face: soft dark lobes angled
  // down and out from the poll, the far one hiding into profile.
  ctx.lineCap = 'round';
  for (const es of [-1, 1]) {
    if (Math.abs(fx) > 0.8 && es * py < 0) continue;
    const bx0 = cx + px * es * w * 0.48 + fx * w * 0.02;
    const by0 = cy + (py * es * w * 0.48 + fy * w * 0.02) * ys - h * 0.26;
    const tx = bx0 + px * es * w * 0.3;
    const ty = by0 + py * es * w * 0.3 * ys + h * 0.44;
    ctx.strokeStyle = C(look.face);
    ctx.lineWidth = Math.max(2, w * 0.26);
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // A warm inner line when the lobe faces the camera.
    if (!o.hurt && fy > 0) {
      ctx.strokeStyle = shade(look.face, 18);
      ctx.lineWidth = Math.max(1, w * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx0 + fx * w * 0.04, by0 + fy * w * 0.04 * ys + h * 0.05);
      ctx.lineTo(tx + fx * w * 0.03, ty + fy * w * 0.03 * ys - h * 0.06);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // Bare dark face slab.
  ctx.fillStyle = C(look.face);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.18, w * 0.18, w * 0.3, w * 0.3]);
  ctx.fill();

  // The poll cap: a puffed wool crown overhanging the brow — drawn
  // OVER the face, the fleece spilling forward, never a painted band.
  ctx.fillStyle = C(cap);
  ctx.beginPath();
  facetBlob(ctx, cx, cy - h * 0.46, w * 0.46, 0x5eeb ^ (w | 0), 7, 0.62, 2.1);
  ctx.fill();

  // Short straight muzzle with the ink nose chip.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.18;
    const sl = w * (0.12 + 0.14 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.05;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.19 * (1 - profileK * 0.2);
    const ht = hb * 0.72;
    ctx.fillStyle = C(shade(look.face, 8));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.06, 5, fx);
    ctx.fill();
  }

  // Gentle wide-set eyes below the cap's shadow.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.08 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.08 + py * es * w * 0.3) * ys - h * 0.02;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}

/**
 * The stag: elegance by proportion — a slim barrel held HIGH on long
 * legs, a proud rising neck column, pale rump patch, and branched
 * antlers swept back off the crown. The alarm-charge levels the
 * antlers forward.
 */
export interface StagLook {
  coat: string;
  belly: string;
  /** The pale rump patch — the deer flag. */
  rump: string;
  antler: string;
  muzzle: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** How far the head rides above the back line (tiles). */
  neckRise: number;
  /**
   * Branched crown or bare poll — the hind shares the whole deer
   * dialect and differs exactly here: no beams, leaf ears instead
   * (everything species-flavored lives in the look table).
   */
  antlers: boolean;
}

export const STAG_LOOK: StagLook = {
  coat: '#a67c52',
  belly: '#c4a97f',
  rump: '#e2d6b9',
  antler: '#9c8563',
  muzzle: '#5f4c38',
  bodyW: 0.16,
  backH: 0.62,
  chestH: 0.38,
  headW: 0.22,
  headH: 0.19,
  neckRise: 0.3,
  antlers: true,
};

/**
 * The hind: the stag's dialect at herd scale — a hand smaller, a
 * shade warmer, the neck a touch lower, and big leaf ears where the
 * stag carries his crown. Reads "deer" beside the stag and "not the
 * stag" on her own.
 */
export const HIND_LOOK: StagLook = {
  coat: '#b18a60',
  belly: '#d1b98f',
  rump: '#e9ddc2',
  antler: '#9c8563',
  muzzle: '#63503a',
  bodyW: 0.145,
  backH: 0.56,
  chestH: 0.35,
  headW: 0.19,
  headH: 0.17,
  neckRise: 0.26,
  antlers: false,
};

export function paintStagBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: StagLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Slim barrel, chest a touch deeper than the flank — the daylight
  // under the high belly line is what reads "deer" at a glance.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.78],
    [hl, hw * 0.78],
    [hl * 0.5, hw],
    [-hl * 0.5, hw * 0.95],
    [-hl, hw * 0.66],
    [-hl, -hw * 0.66],
    [-hl * 0.5, -hw * 0.95],
    [hl * 0.5, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.backH + 0.03 * Math.max(0, X / hl - 0.2) - 0.04 * Math.max(0, -X / hl - 0.5),
    (X) => look.chestH - 0.04 * Math.max(0, X / hl - 0.3),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // The pale rump patch — only while the rump can actually face
      // the camera (body-frame marks show through the back otherwise).
      if (f.fy < 0.2) {
        ctx.fillStyle = look.rump;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(-hl * 0.86, 0),
          gyy(-hl * 0.86, 0) - look.backH * tk * s * 0.55 - lift,
          hw * s * 0.95,
          f.seed ^ 0x77,
          7,
          0.9,
          2.3,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * The stag head: a small wedge carried high, alert ears, and the
 * crown — branched antlers, each a swept-back beam with a brow tine,
 * a mid tine and a forked top, drifting outward so the front view
 * spreads them wide.
 */
export function drawStagHead(
  ctx: CanvasRenderingContext2D,
  look: StagLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const fsx = fx;
  const fsy = fy * ys;

  // Antlers — drawn before the skull so the beams root under it.
  for (const es of [-1, 1]) {
    // (forward, up, outward) in head units → screen. The constant
    // along-facing stagger keeps the pair readable at full profile.
    const A = (fw: number, up: number, sd: number): { x: number; y: number } => ({
      x: cx + fsx * fw * w + px * es * sd * w + fx * es * w * 0.08,
      y: cy + fsy * fw * w - up * w + (py * es * sd * w + fy * es * w * 0.08) * ys,
    });
    ctx.lineCap = 'round';
    const seg = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      lw: number,
    ): void => {
      ctx.lineWidth = Math.max(1.2, lw);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    if (look.antlers) {
      const b0 = A(0.05, 0.28, 0.24);
      const b1 = A(-0.32, 0.85, 0.5);
      const b2 = A(-0.42, 1.45, 0.72);
      const brow = A(0.5, 0.85, 0.36);
      const mid = A(0.1, 1.35, 0.62);
      const tipA = A(-0.12, 1.9, 0.8);
      const tipB = A(-0.95, 1.72, 0.84);
      ctx.strokeStyle = C(look.antler);
      seg(b0, b1, w * 0.1);
      seg(b1, b2, w * 0.08);
      seg(b0, brow, w * 0.06);
      seg(b1, mid, w * 0.055);
      ctx.strokeStyle = C(shade(look.antler, 16));
      seg(b2, tipA, w * 0.05);
      seg(b2, tipB, w * 0.05);
    } else {
      // The bare poll wears leaf ears instead — a coat-dark blade
      // with a pale inner lick, angled back off the crown. Without
      // them an antlerless deer head reads horse at a glance.
      const e0 = A(0.12, 0.26, 0.26);
      const e1 = A(-0.22, 0.78, 0.52);
      const eIn = A(-0.1, 0.62, 0.44);
      ctx.strokeStyle = C(shade(look.coat, -10));
      seg(e0, e1, w * 0.13);
      ctx.strokeStyle = C(look.belly);
      seg(eIn, e1, w * 0.05);
    }
    ctx.lineCap = 'butt';
  }

  // Alert ears flaring out below the antlers.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.36 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.36 + fy * es * w * 0.09) * ys - h * 0.3;
    const tx = bxr + px * es * w * 0.34;
    const ty = byr - h * 0.42 + py * es * w * 0.1 * ys;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.1, byr + h * 0.08);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.14, byr + h * 0.14);
    ctx.closePath();
    ctx.fill();
  }

  // Small chamfered skull.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.3, w * 0.3]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.3, w * 0.3]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    if (fy > 0) {
      // Pale chin patch when the throat faces the camera.
      ctx.fillStyle = C(look.belly);
      ctx.fillRect(cx - w * 0.24, cy + h * 0.26, w * 0.48, h * 0.24);
    }
    ctx.restore();
  }

  // Tapered muzzle dipping to a dark nose.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.24;
    const by0 = cy + fy * w * 0.24 * ys + h * 0.14;
    const sl = w * (0.24 + 0.22 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.12;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.17 * (1 - profileK * 0.25);
    const ht = hb * 0.6;
    ctx.fillStyle = C(shade(look.coat, 5));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.075, 5, fx);
    ctx.fill();
  }

  // Wide-set dark eyes.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.34;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.34) * ys - h * 0.08;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.055, ey - h * 0.07, w * 0.11, h * 0.14);
    }
  }
}

/**
 * The black bear: sheer mass — a broad slab with the shoulder hump
 * peaked over the front legs, belly nearly brushing the ground, and a
 * huge low head with round ears and a pale short muzzle. The pounce
 * bares teeth like the wolf, but everything about it is heavier.
 */
export interface BearLook {
  fur: string;
  muzzle: string;
  earIn: string;
  bodyW: number;
  backH: number;
  /** Extra shoulder mass over the front legs. */
  humpH: number;
  chestH: number;
  headW: number;
  headH: number;
}

export const BEAR_LOOK: BearLook = {
  fur: '#3d332a',
  muzzle: '#a8865f',
  earIn: '#241c16',
  bodyW: 0.27,
  backH: 0.6,
  humpH: 0.12,
  chestH: 0.16,
  headW: 0.34,
  headH: 0.3,
};

export function paintBearBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BearLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.7],
    [hl, hw * 0.7],
    [hl * 0.5, hw],
    [-hl * 0.5, hw],
    [-hl, hw * 0.7],
    [-hl, -hw * 0.7],
    [-hl * 0.5, -hw],
    [hl * 0.5, -hw],
  ];
  const fur = shade(look.fur, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) =>
      look.backH * (1 - 0.08 * Math.pow(X / hl, 2)) +
      look.humpH * Math.max(0, 1 - Math.abs(X / hl - 0.4) / 0.55),
    () => look.chestH,
    fur,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Grizzled shoulder saddle riding the hump, seeded per bear.
      ctx.save();
      ctx.translate(
        gx(hl * 0.35, 0),
        gyy(hl * 0.35, 0) - (look.backH + look.humpH * 0.6) * tk * s * 0.9 - lift,
      );
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = shade(fur, 9);
      ctx.beginPath();
      facetBlob(ctx, 0, 0, hl * s * 0.5, f.seed | 1, 8, (hw * 0.9) / (hl * 0.5), 0.6);
      ctx.fill();
      ctx.restore();
    },
  );
}

/**
 * The bear head: a wide chamfered slab with small round ears, a short
 * broad tan muzzle and a heavy nose. `snarl` opens the jaw and pins
 * the ears through the pounce telegraph.
 */
export function drawBearHead(
  ctx: CanvasRenderingContext2D,
  look: BearLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;

  // Round ears riding the crown corners — flattened mid-snarl. The
  // far one hides at profile so it never floats free of the skull.
  for (const es of [-1, 1]) {
    if (Math.abs(fx) > 0.7 && es * py < 0) continue;
    const exr = cx + px * es * w * 0.34 + fx * es * w * 0.05;
    const eyr = cy + (py * es * w * 0.34 + fy * es * w * 0.05) * ys - h * (0.44 - snarl * 0.1);
    const er = w * 0.17 * (1 - snarl * 0.25);
    ctx.fillStyle = C(shade(look.fur, -5));
    ctx.beginPath();
    facetCircle(ctx, exr, eyr, er, 6, es * 0.7);
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      facetCircle(ctx, exr, eyr + er * 0.15, er * 0.5, 5, es);
      ctx.fill();
    }
  }

  // The skull slab — wide, heavy-jawed.
  ctx.fillStyle = C(look.fur);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.22, w * 0.22, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.13)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.22);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.16)';
    ctx.fillRect(cx - w / 2, cy + h * 0.22, w, h * 0.28);
    ctx.restore();
  }

  // Short broad muzzle in the pale tan — the bear face read.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.14;
    const sl = w * (0.16 + 0.16 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.08;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.24 * (1 - profileK * 0.2);
    const ht = hb * 0.78;
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Snarl: the jaw swings open under the muzzle, teeth bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.4 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.95, ty - ny * ht * 0.95);
      ctx.lineTo(tx + nx * ht * 0.95, ty + ny * ht * 0.95);
      ctx.lineTo(tx + (axv / al) * ht * 0.3, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.55, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.022, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The heavy nose block.
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.095, 5, fx);
    ctx.fill();
  }

  // Small dark eyes — tiny against the mass, which is the point.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.28;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.28) * ys - h * 0.12;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.045, ey - h * 0.05, w * 0.09, h * 0.1);
    }
  }
}

/**
 * The mudcrab: a wide flat carapace slung sideways across the facing,
 * two chunky pincers held forward (the left one the bigger crusher),
 * and stalked eyes off the front rim. The whole animal is the body
 * painter — head and tail branches return early.
 *
 * THE LIVING STALKS, inherited (the giant crab's doctrine come home):
 * the eyes ride the ear sim — they lag the turn, sway with the
 * scuttle, and pin flat through the clamp. The old rigged eyes hid
 * behind two facing gates (`fy > -0.5`, the far-eye profile skip);
 * stalks that grow off the TOP of the animal have no business
 * disappearing at any band — THE SOCKET RIDES THE CROWN slides the
 * root station onto visible shell instead, and the stalks always
 * paint over the hull.
 */
export interface CrabLook {
  shell: string;
  claw: string;
  eye: string;
  /** Half-WIDTH across the facing — wider than the body is long. */
  bodyW: number;
  shellH: number;
}

export const CRAB_LOOK: CrabLook = {
  shell: '#b06a4a',
  claw: '#c97f55',
  eye: '#241a2e',
  bodyW: 0.3,
  shellH: 0.2,
};

export function paintCrabBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CrabLook,
  f: BeastBlockFrame,
  at = 0,
  nowMs = 0,
  /** THE LIVING STALKS: the live ear sim; absent = the ONE REST chain. */
  eyes?: EarSim,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const dead = f.topScale !== undefined && f.topScale < 1;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  const drawClaw = (es: number): void => {
    // Arm off the front corner, then the pincer held forward — open
    // through the windup, snapped shut (and lunged) on the strike.
    const sx0 = bx + (fx * hl * 0.4 + px * es * hw * 0.72) * s;
    const sy0 = gy + (fy * hl * 0.4 + py * es * hw * 0.72) * ys * s - look.shellH * 0.45 * tk * s - lift;
    const lunge = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) * 0.1 : 0;
    const raise = at > 0 && at <= 0.7 ? (at / 0.7) * 0.05 : 0;
    const ex0 = sx0 + (fx * (0.15 + lunge) + px * es * 0.12) * s;
    const ey0 = sy0 + (fy * (0.15 + lunge) + py * es * 0.12) * ys * s - (0.02 + raise) * s;
    ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.claw, -14);
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(ex0, ey0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Pincer palm: a faceted pad aimed along the facing. The left
    // claw is the oversized crusher — real crabs are lopsided.
    const pR = (es < 0 ? 0.105 : 0.085) * s;
    const aim = Math.atan2(fy * ys, fx);
    const cxp = ex0 + fx * 0.07 * s;
    const cyp = ey0 + fy * 0.07 * ys * s;
    ctx.fillStyle = f.hurt ? '#ffffff' : look.claw;
    ctx.beginPath();
    facetCircle(ctx, cxp, cyp, pR, 6, aim, 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.stroke();
    // Fingers: two tapered chips off the palm — the gap between them
    // gapes through the windup and snaps flat on the strike.
    const gapeK = dead ? 0.2 : at > 0 && at <= 0.7 ? 0.3 + (at / 0.7) * 0.7 : at > 0.7 ? 0 : 0.25;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.claw, 10);
    for (const fu of [-1, 1]) {
      const fa = aim + es * fu * (0.12 + gapeK * 0.3);
      const fLen = pR * (1.15 + (fu < 0 ? 0.15 : 0));
      const fx1 = cxp + Math.cos(fa) * pR * 0.55;
      const fy1 = cyp + Math.sin(fa) * pR * 0.55;
      const fx2 = cxp + Math.cos(fa) * (pR * 0.55 + fLen);
      const fy2 = cyp + Math.sin(fa) * (pR * 0.55 + fLen);
      const pnx = -Math.sin(fa);
      const pny = Math.cos(fa);
      ctx.beginPath();
      ctx.moveTo(fx1 + pnx * pR * 0.28, fy1 + pny * pR * 0.28);
      ctx.lineTo(fx2, fy2);
      ctx.lineTo(fx1 - pnx * pR * 0.28, fy1 - pny * pR * 0.28);
      ctx.closePath();
      ctx.fill();
    }
  };

  // A claw whose screen-y offset puts it below the body center is the
  // near one — it paints over the shell; the other tucks behind.
  const clawNear = (es: number): boolean => (fy * hl * 0.55 + py * es * hw * 0.8) * ys > 0;
  for (const es of [-1, 1]) if (!clawNear(es)) drawClaw(es);

  // The carapace: wider than long, low-domed, mottled.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.55],
    [hl, hw * 0.55],
    [hl * 0.45, hw],
    [-hl * 0.45, hw],
    [-hl, hw * 0.55],
    [-hl, -hw * 0.55],
    [-hl * 0.45, -hw],
    [hl * 0.45, -hw],
  ];
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.shellH * (1 - 0.35 * Math.pow(X / hl, 2)),
    () => 0.05,
    shell,
    (gx, gyy, lift2) => {
      // Mottle specks scattered across the crown.
      ctx.fillStyle = shade(shell, -14);
      for (let k = 0; k < 4; k++) {
        const b = (n: number): number => ((f.seed >>> ((k * 7 + n * 3) % 28)) & 7) / 7;
        ctx.beginPath();
        facetCircle(
          ctx,
          gx((b(0) * 1.5 - 0.75) * hl, (b(1) * 1.6 - 0.8) * hw),
          gyy((b(0) * 1.5 - 0.75) * hl, (b(1) * 1.6 - 0.8) * hw) - look.shellH * 0.8 * tk * s - lift2,
          s * (0.016 + b(2) * 0.014),
          5,
          k * 1.7,
        );
        ctx.fill();
      }
    },
  );

  // THE LIVING STALKS, mudcrab-sized — the giant crab's whole
  // attachment doctrine at pebble scale: a turret socket seated on
  // the shell's true curve, THE SOCKET RIDES THE CROWN (the station
  // slides from the front rim onto the visible crown as the bow
  // turns from the camera — the old rigged eyes simply VANISHED at
  // the back bands and at profile, and stalks that grow off the top
  // of the animal must show at every band), and THE GRAFT (one
  // continuous curve from the socket's surface point into the live
  // sim — or the ONE REST chain when no sim rides along).
  if (!dead && !f.hurt) {
    const dir = Math.atan2(fy, fx);
    const phase = ((f.seed % 89) + 89) * 0.53;
    const backK = Math.min(1, Math.max(0, (fy + 0.75) / 0.85));
    const sockF = hl * 0.78 * (0.28 + 0.72 * backK);
    const topAt = (X: number, Y: number): number =>
      0.05 + look.shellH * (1 - 0.35 * Math.pow(X / hl, 2)) * (1 - 0.25 * Math.pow(Y / hw, 2));
    const axp = bx + fx * (sockF + hl * 0.04) * s;
    const ayp = gy + fy * (sockF + hl * 0.04) * ys * s - topAt(sockF, 0) * tk * s - lift;
    // The socket stations and the chain roots must agree on spacing —
    // a socket wider than its chain root bows every stem inward and
    // the pair reads crossed (pass-one failure, paid).
    const carriage: EarCarriage = {
      azimuth: 0.55,
      rootR: 0.055,
      rootLift: 0.005,
      length: 0.14,
      spread: 0.4,
      rise: 1.5,
      curl: [0.1, 0.13, 0.16],
    };
    // The stalks pin flat through the clamp — the animal aims itself.
    const pin = at > 0.55 ? Math.min(1, (at - 0.55) / 0.25) : 0;
    if (eyes) eyes.update(axp, ayp, s, carriage, dir, pin, nowMs);
    for (const side of [-1, 1] as const) {
      const chain = eyes
        ? eyes.chain(side, carriage, dir, pin)
        : earRestChain(side, carriage, {
            dir,
            pin,
            sway: 0.06 * Math.sin(nowMs / 560 + phase + side * 1.7),
          });
      const pts = chain.pts;
      // The socket: a small dome on the shell at the slid station.
      const sockY = side * hw * 0.2;
      const sock = {
        x: bx + (fx * sockF + px * sockY) * s,
        y: gy + (fy * sockF + py * sockY) * ys * s - topAt(sockF, sockY) * tk * s - lift,
      };
      ctx.fillStyle = shade(shell, -10);
      ctx.beginPath();
      facetCircle(ctx, sock.x, sock.y, s * 0.026, 6, side * 1.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.stroke();
      // THE GRAFT: base exactly ON the shell, tip exactly where the
      // physics put it, one continuous curve between — no seam for
      // any projection to open.
      ctx.strokeStyle = shade(look.shell, -22);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.beginPath();
      const gx0 = sock.x;
      const gy0 = sock.y - s * 0.008;
      let ex1 = gx0;
      let ey1 = gy0;
      ctx.moveTo(gx0, gy0);
      for (let i = 0; i < pts.length; i++) {
        const t = pts.length > 1 ? i / (pts.length - 1) : 1;
        const w2 = t * t * (3 - 2 * t);
        ex1 = gx0 + (axp + pts[i]!.x * s - gx0) * (0.35 + 0.65 * w2);
        ey1 = gy0 + (ayp + pts[i]!.y * s - gy0) * (0.35 + 0.65 * w2);
        if (i === 0) {
          ex1 = gx0 + (ex1 - gx0) * 0.4;
          ey1 = gy0 + (ey1 - gy0) * 0.4;
        }
        ctx.lineTo(ex1, ey1);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The eye bead stays the mudcrab's humble dark chip (the
      // anti-twin law: only the rampart earns the amber lamp) — but
      // it earns one wet glint.
      ctx.fillStyle = look.eye;
      ctx.beginPath();
      facetCircle(ctx, ex1, ey1, s * 0.03, 5, side * 1.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 235, 0.7)';
      ctx.fillRect(ex1 + s * 0.004, ey1 - s * 0.012, s * 0.009, s * 0.009);
    }
  }

  for (const es of [-1, 1]) if (clawNear(es)) drawClaw(es);
}

/**
 * THE TIDE'S RAMPART — the giant crab. Four reads owned by no other
 * body: THE RAMPART (a storm-worn faceted bastion of a carapace,
 * wider than long, a crenellated bow wall raked back over the crown
 * boss and hooked marginal horns off the skirt), THE SIEGE CRUSHER
 * (the colossal left claw carried across the bow like a tower shield
 * on a true two-bone arm — the animal is asymmetric at any zoom; the
 * right cutter rides low and lean), THE STILT MARCH (six tall
 * armored legs with real daylight under the hull — the mudcrab
 * squats in the wet, the bulwark STANDS), and THE LIVING STALKS
 * (eye stalks on the ear sim: they lag the turn, sway with the
 * march, and pin flat through the clamp).
 *
 * NEVER A RESKIN: the mudcrab is a low mottled pebble with stroke
 * arms. This body shares no table with it — own look, own authored
 * plate mail, own jointed arms, own foot word, own gait numbers.
 * THE CLAMP follows the turtles' law: the hull plants (massK damps
 * the pounce) and the CRUSHER spends the strike — windup coils the
 * arm home and the jaws gape; the strike drives the palm through
 * the facing and snaps them shut.
 */
export interface GiantCrabLook {
  /** Carapace base — plates derive a step brighter (the mail law). */
  shell: string;
  /** Bow-wall blades, rim horns, and the darker armor accents. */
  crest: string;
  claw: string;
  /** Keratin: jaw edges, palm studs, the pale worn tips. */
  clawTip: string;
  barnacle: string;
  /** The under-mass filling the rim shadow. */
  under: string;
  eye: string;
  /** Tide-line rust wash riding the skirt. */
  stain: string;
  /** Half-width across the facing — WIDER than the body is long. */
  bodyW: number;
  /** Vault height at the crown boss. */
  shellH: number;
  /** Bow-wall blade rise above the vault. */
  crestH: number;
  /** Daylight under the hull: the skirt's height off the ground. */
  rimBot: number;
}

export const GIANTCRAB_LOOK: GiantCrabLook = {
  shell: '#46655c',
  crest: '#2f4a41',
  // A step brighter and warmer than the shell: the arms and fists
  // must separate from the hull at any zoom — the claw IS the read.
  claw: '#5e8272',
  clawTip: '#cfc9ad',
  barnacle: '#c9c2a6',
  under: '#33473f',
  eye: '#e0a83c',
  stain: '#7c5a41',
  bodyW: 0.52,
  shellH: 0.34,
  // PASS-ONE FAILURE, paid: tall thin crest pyramids read as PINE
  // TREES standing on a crate — the wall is LOW and wide, a
  // crenellation, never a copse.
  crestH: 0.08,
  rimBot: 0.16,
};

/**
 * THE RAMPART'S MAIL — one row per plate: [X, Y, halfLen, halfWid,
 * keelK] in body fractions (the turtle mail's grammar, a crab's
 * layout): a central crown boss, a crenellated BOW WALL of three
 * storm-raked blades running ACROSS the facing (the perpendicular
 * signature — the turtle's ridge runs nose-to-tail, the crab's wall
 * runs shoulder-to-shoulder), branchial terraces on the flanks, and
 * a stern pair over the tucked abdomen. Authored, never generated.
 */
const GIANTCRAB_PLATES: ReadonlyArray<[number, number, number, number, number]> = [
  // The crown boss — the shield at the center of the shield.
  [-0.02, 0, 0.3, 0.26, 0.45],
  // THE BOW WALL: three WIDE low merlons across the bow, tallest at
  // the center — a battlement, never a treeline (base wider than the
  // rise by law; the pass-one thin pyramids read as pines).
  [0.42, 0, 0.16, 0.17, 1],
  [0.38, -0.46, 0.14, 0.19, 0.78],
  [0.38, 0.46, 0.14, 0.19, 0.78],
  // Branchial terraces, port and starboard.
  [-0.3, -0.56, 0.2, 0.2, 0.5],
  [-0.3, 0.56, 0.2, 0.2, 0.5],
  // The stern pair.
  [-0.68, -0.24, 0.13, 0.14, 0.4],
  [-0.68, 0.24, 0.13, 0.14, 0.4],
];

const CRABARM_SOLVE: LimbSolve = { ex: 0, ey: 0, kx: 0, ky: 0 };

/**
 * THE SIEGE CRUSHER + the cutter — the giant crab's arms, a
 * standalone pass so drawBeast can compose them in TRUE depth: the
 * far claw tucks behind the hull (the body painter runs the 'far'
 * pass), and the near claws paint TOPMOST, after the near legs (THE
 * CLAW IS NEVER UNDER A LEG — a stilt crossing in front of the
 * crusher broke the whole read, user-flagged).
 *
 * THE WIDE GUARD: a crab holds its arms OUT of its body, never
 * hugged to the bow — shoulders root at the wide bow corners under
 * a coxa collar, elbows flare outboard past the rim, and the palms
 * ride clearly OUTSIDE the hull's width with the pincer tips aimed
 * in-and-forward at the shared focus ahead of the bow (the pinch
 * that is always about to happen). The clamp is the crusher's
 * alone: the windup swings it wider and higher (the harbor opens),
 * the strike sweeps it in and through the facing line.
 */
export function paintGiantCrabClaws(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: GiantCrabLook,
  f: BeastBlockFrame,
  which: 'far' | 'near' | 'all',
  at = 0,
  nowMs = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const dead = f.topScale !== undefined && f.topScale < 1;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const phase = ((f.seed % 89) + 89) * 0.53;

  // A claw whose palm carry projects below the body center on screen
  // is the near one; with the arms out wide the LATERAL term rules,
  // so profile bands split the pair cleanly.
  const clawNear = (es: number): boolean => (fy * hl * 0.45 + py * es * hw * 1.1) * ys > 0;

  const drawClaw = (es: number): void => {
    const crusher = es < 0;
    // Shoulder: the wide bow corner, rooted under a coxa collar so
    // the arm visibly ARTICULATES off the hull instead of floating.
    const shF = hl * 0.32;
    const shS = es * hw * 0.75;
    const shZ = look.rimBot + look.shellH * 0.32;
    const sx = bx + (fx * shF + px * shS) * s;
    const sy = gy + (fy * shF + py * shS) * ys * s - shZ * tk * s - lift;
    // THE WIDE GUARD carry: palms OUTSIDE the hull width, forward of
    // the widest station — the whole armspan frames the animal.
    const sway = dead ? 0 : Math.sin(nowMs / 940 + phase + (crusher ? 0 : 2.1)) * 0.025;
    let tF = crusher ? hl * 0.5 : hl * 0.38;
    let tS = es * hw * (crusher ? 1.18 : 1.05) + sway;
    // Both chelipeds carry ABOVE stilt height — a claw riding at leg
    // level tangles with the near legs at profile even when it paints
    // over them; the raised carry is what separates arm from stilt.
    let tZ = look.rimBot + look.shellH * (crusher ? 0.58 : 0.46);
    let gape = dead ? 0.16 : 0.2 + 0.06 * Math.sin(nowMs / 760 + phase);
    if (!dead && at > 0 && crusher) {
      if (at <= 0.7) {
        // The harbor opens: the crusher swings WIDER and higher, and
        // the jaws gape — the warning is the whole armspan.
        const w = at / 0.7;
        tS += es * hw * 0.22 * w;
        tZ += 0.14 * w;
        tF -= hl * 0.06 * w;
        gape = 0.25 + w * 0.75;
      } else {
        // The clamp: the arm sweeps IN and through the facing line,
        // jaws snapping flat where the crescent closes.
        const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
        tF += (hl * 1.15 - tF) * k;
        tS += (es * hw * 0.28 - tS) * k;
        tZ -= 0.08 * k;
        gape = Math.max(0, 0.25 * (1 - k * 4));
      }
    } else if (!dead && at > 0.55 && !crusher) {
      // The cutter braces wide and flares open in sympathy.
      tS += es * hw * 0.06;
      gape = 0.5;
    }
    if (dead) {
      // Slack arms: dropped out wide to the ground line, jaws ajar —
      // the span stays honest even in death.
      tZ = 0.03;
      tF = hl * 0.3;
      tS = es * hw * 1.2;
    }
    const txp = bx + (fx * tF + px * tS) * s;
    const typ = gy + (fy * tF + py * tS) * ys * s - tZ * tk * s - lift;
    // Elbow pole: hard outboard on the claw's own screen side, and
    // up — a crab's arm breaks upward and OUTWARD at the carpus.
    const outSgn = Math.sign(txp - bx) || es;
    const arm = solveLimbInto(
      CRABARM_SOLVE,
      sx,
      sy,
      txp,
      typ,
      (crusher ? 0.33 : 0.25) * s,
      1.12,
      outSgn,
      -0.45,
    );
    // The coxa collar: the joint plate the arm roots through — the
    // connection read at every band.
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.claw, -14);
    ctx.beginPath();
    facetCircle(ctx, sx, sy, s * (crusher ? 0.085 : 0.06), 6, es * 0.8);
    ctx.fill();
    if (!f.hurt) {
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.stroke();
    }
    const armC = f.hurt ? '#ffffff' : shade(look.claw, -8);
    const foreC = f.hurt ? '#ffffff' : shade(look.claw, 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = armC;
    ctx.lineWidth = Math.max(2, s * (crusher ? 0.13 : 0.075));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(arm.kx, arm.ky);
    ctx.stroke();
    ctx.strokeStyle = foreC;
    ctx.lineWidth = Math.max(1.8, s * (crusher ? 0.105 : 0.06));
    ctx.beginPath();
    ctx.moveTo(arm.kx, arm.ky);
    ctx.lineTo(arm.ex, arm.ey);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // The elbow spur — one thorn of armor at the carpus break.
    if (!f.hurt) {
      const ew = s * (crusher ? 0.05 : 0.034);
      ctx.fillStyle = look.crest;
      ctx.beginPath();
      ctx.moveTo(arm.kx - ew, arm.ky - ew * 0.4);
      ctx.lineTo(arm.kx + ew * 0.1, arm.ky - ew * 2);
      ctx.lineTo(arm.kx + ew, arm.ky - ew * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // The palm: a faceted fist. THE PINCH THAT IS ALWAYS COMING: the
    // pincer aims from wherever the palm rides toward the shared
    // focus ahead of the bow — out wide at rest, the tips still
    // point in-and-forward exactly as a living crab holds them.
    const pR = (crusher ? 0.25 : 0.135) * s;
    const fpx = bx + (fx * hl * 1.5 + px * es * hw * 0.1) * s;
    const fpy = gy + (fy * hl * 1.5 + py * es * hw * 0.1) * ys * s - tZ * tk * s - lift;
    const aim = dead
      ? Math.atan2(fy * ys, fx) + es * 0.5
      : Math.atan2(fpy - arm.ey, fpx - arm.ex);
    const cxp = arm.ex + Math.cos(aim) * pR * 0.35;
    const cyp = arm.ey + Math.sin(aim) * pR * 0.35;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.claw, 6);
    ctx.beginPath();
    facetCircle(ctx, cxp, cyp, pR, 7, aim, 0.88);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    if (!f.hurt) {
      // Knuckle studs marching the palm's outer edge.
      ctx.fillStyle = look.crest;
      for (const q of [-0.55, 0, 0.55]) {
        const qa = aim + es * (Math.PI / 2) + q;
        ctx.beginPath();
        facetCircle(
          ctx,
          cxp + Math.cos(qa) * pR * 0.78,
          cyp + Math.sin(qa) * pR * 0.78,
          pR * (crusher ? 0.16 : 0.13),
          5,
          q * 3.1,
        );
        ctx.fill();
      }
      // The palm's top catches the light — the fist has a back.
      ctx.fillStyle = shade(look.claw, 18);
      ctx.beginPath();
      facetCircle(ctx, cxp - pR * 0.15, cyp - pR * 0.3, pR * 0.5, 6, aim + 1.3, 0.9);
      ctx.fill();
    }
    // The jaws: CHUNKY PALE KERATIN — the one bright mass on the
    // animal, so the pincer reads at any zoom (pass-one dark jaws
    // with thin white edge lines scattered as sticks). Crusher: two
    // heavy blunt slabs with dark molar teeth waiting in the gape.
    // Cutter: two lean shear blades. Dark seams, no thin strokes.
    // THE ASYMMETRY IS THE FIELD MARK: the crusher's jaws are the one
    // big pale mass; the cutter's shears run slimmer and a step
    // darker, so no band ever reads two equal claws.
    const jawL = pR * (crusher ? 1.25 : 1.2);
    for (const fu of [-1, 1]) {
      const fa = aim + es * fu * (0.1 + gape * (crusher ? 0.34 : 0.42));
      const rx = cxp + Math.cos(fa) * pR * 0.5;
      const ry2 = cyp + Math.sin(fa) * pR * 0.5;
      const txx = cxp + Math.cos(fa) * (pR * 0.5 + jawL);
      const tyy = cyp + Math.sin(fa) * (pR * 0.5 + jawL);
      const pnx = -Math.sin(fa);
      const pny = Math.cos(fa);
      const wRoot = pR * (crusher ? 0.46 : 0.22);
      ctx.fillStyle = f.hurt
        ? '#ffffff'
        : shade(look.clawTip, crusher ? (fu < 0 ? 2 : -12) : fu < 0 ? -16 : -26);
      ctx.beginPath();
      ctx.moveTo(rx + pnx * wRoot, ry2 + pny * wRoot);
      // The crusher jaw keeps its depth to the tip; the cutter tapers.
      ctx.quadraticCurveTo(
        rx + (txx - rx) * 0.6 + pnx * wRoot * (crusher ? 0.95 : 0.5),
        ry2 + (tyy - ry2) * 0.6 + pny * wRoot * (crusher ? 0.95 : 0.5),
        txx,
        tyy,
      );
      ctx.lineTo(txx - pnx * wRoot * 0.1, tyy - pny * wRoot * 0.1);
      ctx.quadraticCurveTo(
        rx + (txx - rx) * 0.5 - pnx * wRoot * 0.55,
        ry2 + (tyy - ry2) * 0.5 - pny * wRoot * 0.55,
        rx - pnx * wRoot * 0.72,
        ry2 - pny * wRoot * 0.72,
      );
      ctx.closePath();
      ctx.fill();
      if (!f.hurt) {
        ctx.strokeStyle = 'rgba(26, 20, 36, 0.45)';
        ctx.lineWidth = Math.max(1, pR * 0.06);
        ctx.stroke();
        if (crusher) {
          // Dark molar teeth inside the pale gape — visible exactly
          // when the jaws stand open, which is when they matter.
          ctx.fillStyle = shade(look.crest, -6);
          for (const tt of [0.35, 0.62]) {
            const mx = rx + (txx - rx) * tt - pnx * wRoot * 0.55;
            const my = ry2 + (tyy - ry2) * tt - pny * wRoot * 0.55;
            const mw = pR * 0.11;
            ctx.beginPath();
            ctx.moveTo(mx + pnx * mw, my + pny * mw);
            ctx.lineTo(mx - Math.cos(fa) * mw * 1.4, my - Math.sin(fa) * mw * 1.4);
            ctx.lineTo(mx - pnx * mw, my - pny * mw);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  };

  for (const es of [-1, 1]) {
    const near = clawNear(es);
    if ((which === 'far' && !near) || (which === 'near' && near) || which === 'all') {
      drawClaw(es);
    }
  }
}

export function paintGiantCrabBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: GiantCrabLook,
  f: BeastBlockFrame,
  at = 0,
  nowMs = 0,
  /** THE LIVING STALKS: the live ear sim; absent = the ONE REST chain. */
  eyes?: EarSim,
  /**
   * drawBeast composes the near claws itself as the TOPMOST pass
   * (after the near legs — a stilt must never cross the crusher);
   * standalone callers leave this false and get the whole animal.
   */
  deferNearClaws = false,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const dead = f.topScale !== undefined && f.topScale < 1;
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  const dir = Math.atan2(fy, fx);
  // Per-body menace phase — a pair of bulwarks never breathes in sync.
  const phase = ((f.seed % 89) + 89) * 0.53;

  const domeC = -hl * 0.06;
  const topH = (X: number): number =>
    Math.max(0.05, look.shellH * (1 - 0.42 * Math.pow((X - domeC) / hl, 2)));
  const surf = (X: number, Y: number): number => topH(X) * (1 - 0.32 * Math.pow(Y / hw, 2));
  const P3 = (X: number, Y: number, Z: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * Y) * s,
    y: gy + (fy * X + py * Y) * ys * s - (look.rimBot + Z) * tk * s - lift,
  });

  // The far claw tucks behind the hull; the near claws are drawn by
  // the caller's topmost pass (drawBeast) or, for standalone callers
  // (ragdoll, portraits, sheets without the composed path), by the
  // trailing pass at the end of this painter.
  paintGiantCrabClaws(ctx, spec, look, f, 'far', at, nowMs);

  // THE BODY UNDER THE RAMPART: the ground-frame under-mass (THE
  // BELLY TUCKS LIKE A LION'S) with honest stilt daylight — screen
  // width follows the facing between the two half-dims, depth
  // squashes with ys, and the ground line is authored bottom-up.
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const brx = (hl * 0.7 * ax + hw * 0.78 * ay) * s;
  const bry = (hw * 0.3 * ax + hl * 0.28 * ay) * ys * s;
  const bellyClear = (dead ? 0.02 : 0.1) * s;
  ctx.fillStyle = f.hurt ? '#ffffff' : look.under;
  ctx.save();
  ctx.translate(bx, gy - bellyClear - lift * 0.6 - bry);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, brx, f.seed | 5, 8, bry / brx, 0.5);
  ctx.fill();
  ctx.restore();

  // ---- the hull: a wide angular bastion footprint — flat bow face,
  // lateral horn points at the widest station, drawn stern.
  const foot: Array<[number, number]> = [
    [hl * 0.9, -hw * 0.38],
    [hl * 0.9, hw * 0.38],
    [hl * 0.45, hw * 0.8],
    [0, hw],
    [-hl * 0.55, hw * 0.82],
    [-hl * 0.95, hw * 0.4],
    [-hl * 0.95, -hw * 0.4],
    [-hl * 0.55, -hw * 0.82],
    [0, -hw],
    [hl * 0.45, -hw * 0.8],
  ];
  const drawStalks = (): void => {
    if (dead || f.hurt) return;
    // THE STALK GROWS FROM A SOCKET (the attachment law): every
    // appendage roots at a visible fixture ON the body's surface, at
    // every band — a stem that begins in open air reads as a severed
    // prop. Each stalk owns a turret socket seated on the shell's
    // true curve; the stem GRAFTS onto that socket point, so no
    // projection can ever open daylight between stalk and shell.
    //
    // THE SOCKET RIDES THE CROWN (the ridge law, applied to a
    // fixture): anatomically the stalks root at the bow, but a bow
    // socket walks behind the skyline as the facing turns away and
    // the stems read severed at the back quarters (user-flagged
    // twice — paint-order tricks cannot fix what the projection
    // hides). The socket station slides toward the crown's peak as
    // the bow turns from the camera: dead-on it sits at the bow;
    // from behind it rides the visible crown top. The stalks then
    // always paint OVER the hull — dome and stem on readable
    // surface at all eight bands, by construction.
    const backK = Math.min(1, Math.max(0, (fy + 0.75) / 0.85));
    const sockF = domeC + (hl * 0.52 - domeC) * (0.25 + 0.75 * backK);
    const axp = bx + fx * (sockF + hl * 0.03) * s;
    const ayp =
      gy + fy * (sockF + hl * 0.03) * ys * s - (look.rimBot + topH(sockF)) * tk * s - lift;
    const carriage: EarCarriage = {
      azimuth: 0.5,
      rootR: 0.09,
      rootLift: 0.01,
      length: 0.26,
      spread: 0.32,
      rise: 1.15,
      curl: [0.12, 0.16, 0.2],
    };
    // The stalks pin flat through the clamp — the animal aims itself.
    const pin = at > 0.55 ? Math.min(1, (at - 0.55) / 0.25) : 0;
    if (eyes) eyes.update(axp, ayp, s, carriage, dir, pin, nowMs);
    for (const side of [-1, 1] as const) {
      const chain = eyes
        ? eyes.chain(side, carriage, dir, pin)
        : earRestChain(side, carriage, {
            dir,
            pin,
            sway: 0.05 * Math.sin(nowMs / 640 + phase + side * 1.7),
          });
      const pts = chain.pts;
      // The socket: a small turret dome on the shell at this stalk's
      // own station (the slid crown station), painted first so the
      // stem rises out of it.
      const sockX = sockF;
      const sockY = side * hw * 0.16;
      const sock = P3(sockX, sockY, surf(sockX, sockY));
      ctx.fillStyle = shade(shell, -8);
      ctx.beginPath();
      facetCircle(ctx, sock.x, sock.y, s * 0.038, 6, side * 1.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.stroke();
      ctx.strokeStyle = shade(look.shell, -20);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.4, s * 0.032);
      ctx.beginPath();
      // THE GRAFT: the drawn stalk interpolates from the socket's own
      // surface point INTO the sim chain — base exactly ON the shell,
      // tip exactly where the physics put it, one continuous curve
      // between. A separate bridge segment kinked above the skyline
      // at the diagonals (user-flagged); a graft has no seam to kink,
      // at any band, live sim or rest chain alike.
      const gx0 = sock.x;
      const gy0 = sock.y - s * 0.012;
      let ex1 = gx0;
      let ey1 = gy0;
      ctx.moveTo(gx0, gy0);
      for (let i = 0; i < pts.length; i++) {
        const t = pts.length > 1 ? i / (pts.length - 1) : 1;
        // Ease into the chain: the lower stalk belongs to the socket,
        // the upper stalk to the sim — full physics by the tip.
        const w = t * t * (3 - 2 * t);
        ex1 = gx0 + (axp + pts[i]!.x * s - gx0) * (0.35 + 0.65 * w);
        ey1 = gy0 + (ayp + pts[i]!.y * s - gy0) * (0.35 + 0.65 * w);
        if (i === 0) {
          // The first grafted node sits just off the socket — the
          // stem leaves the dome, never teleports past it.
          ex1 = gx0 + (ex1 - gx0) * 0.4;
          ey1 = gy0 + (ey1 - gy0) * 0.4;
        }
        ctx.lineTo(ex1, ey1);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The eye bead: a faceted amber drop with a dark core and one
      // wet glint — the only warm note on the whole cold animal.
      ctx.fillStyle = look.eye;
      ctx.beginPath();
      facetCircle(ctx, ex1, ey1, s * 0.048, 6, side * 1.3);
      ctx.fill();
      ctx.fillStyle = '#241a2e';
      ctx.beginPath();
      facetCircle(ctx, ex1, ey1, s * 0.024, 5, side * 2.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
      ctx.fillRect(ex1 - s * 0.006 + s * 0.012, ey1 - s * 0.018, s * 0.012, s * 0.012);
    }
  };
  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    () => look.rimBot,
    shell,
    (gx, gyy, lift2) => {
      // Quiet under-mail work: value patches so the big vault never
      // bands flat, and THE TIDE STAIN — the rust waterline riding
      // the skirt that says this wall stands in the sea half its life.
      ctx.save();
      ctx.translate(gx(domeC, 0), gyy(domeC, 0) - look.shellH * tk * s * 0.8 - lift2);
      ctx.rotate(Math.atan2(fy * ys, fx));
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = shade(shell, -9);
      ctx.beginPath();
      facetBlob(ctx, -hl * 0.32 * s, hw * 0.28 * s, hl * 0.46 * s, f.seed ^ 0x2b, 7, 0.6, 0.8);
      ctx.fill();
      ctx.fillStyle = shade(shell, 7);
      ctx.beginPath();
      facetBlob(ctx, hl * 0.22 * s, -hw * 0.24 * s, hl * 0.4 * s, f.seed ^ 0x6d, 7, 0.6, 0.8);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = look.stain;
      ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(hl * 0.8 * s, -hw * 0.62 * s);
      ctx.quadraticCurveTo(0, -hw * 1.02 * s, -hl * 0.8 * s, -hw * 0.58 * s);
      ctx.moveTo(hl * 0.8 * s, hw * 0.62 * s);
      ctx.quadraticCurveTo(0, hw * 1.02 * s, -hl * 0.8 * s, hw * 0.58 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      // THE YEARS ON THE WALL: the barnacle colonies live INSIDE the
      // hull-clipped marks pass (the mudcrab mottle law) — a surface
      // fixture painted as a free overlay escapes the silhouette on
      // far-flank projections and floats beside the animal (user-
      // flagged at the quarters). Clipped, a colony can only ever
      // sit ON the body, at every band, by construction.
      if (!dead) {
        const cb = (n: number): number => ((f.seed >>> ((n * 5) % 26)) & 7) / 7;
        const colX = (-0.35 + cb(0) * 0.3) * hl;
        const colY = (0.25 + cb(1) * 0.3) * hw * (cb(5) > 0.5 ? 1 : -1);
        ctx.fillStyle = shade(look.barnacle, -5);
        for (let k = 0; k < 6; k++) {
          const b = (n: number): number => ((f.seed >>> ((k * 5 + n * 3) % 27)) & 7) / 7;
          const cX = (k < 4 ? colX : hl * 0.34) + (b(0) - 0.5) * 0.14 * hl;
          const cY = (k < 4 ? colY : -colY * 0.5) + (b(1) - 0.5) * 0.16 * hw;
          const bpx = gx(cX, cY);
          const bpy = gyy(cX, cY) - surf(cX, cY) * tk * s - lift2;
          const r0 = s * (0.013 + b(2) * 0.013);
          ctx.beginPath();
          facetCircle(ctx, bpx, bpy, r0, 5, k * 1.9);
          ctx.fill();
          if (r0 > s * 0.019) {
            ctx.fillStyle = shade(look.barnacle, -30);
            ctx.beginPath();
            facetCircle(ctx, bpx, bpy, r0 * 0.4, 4, k * 2.7);
            ctx.fill();
            ctx.fillStyle = shade(look.barnacle, -5);
          }
        }
      }
    },
  );

  // THE HOOKED SKIRT: marginal horns off the near rim — bigger and
  // meaner than any saw-tooth, hooked back like breakwater iron.
  if (!f.hurt) {
    const rimY = (X: number, Y: number): number =>
      gy + (fy * X + py * Y) * ys * s - look.rimBot * s - lift * 0.6;
    const rimX = (X: number, Y: number): number => bx + (fx * X + px * Y) * s;
    const cyd = gy - lift;
    ctx.fillStyle = shade(look.crest, -4);
    for (let i = 0; i < foot.length; i++) {
      const a = foot[i]!;
      const b = foot[(i + 1) % foot.length]!;
      const mX = (a[0] + b[0]) / 2;
      const mY = (a[1] + b[1]) / 2;
      const sx0 = rimX(mX, mY);
      const sy0 = rimY(mX, mY);
      if (sy0 <= cyd - 0.02 * s) continue; // near-side segments only
      // The bow face stays clean: horns there compete with the claws,
      // and the claws own the front by law.
      if (a[0] >= hl * 0.85 && b[0] >= hl * 0.85) continue;
      let ox = sx0 - bx;
      let oy = sy0 - cyd;
      const od = Math.hypot(ox, oy) || 1e-4;
      ox /= od;
      oy /= od;
      const tw = s * 0.075;
      const ex0 = rimX(a[0] * 0.7 + mX * 0.3, a[1] * 0.7 + mY * 0.3);
      const ey0 = rimY(a[0] * 0.7 + mX * 0.3, a[1] * 0.7 + mY * 0.3);
      const ex1 = rimX(b[0] * 0.7 + mX * 0.3, b[1] * 0.7 + mY * 0.3);
      const ey1 = rimY(b[0] * 0.7 + mX * 0.3, b[1] * 0.7 + mY * 0.3);
      // The hook: the point sweeps sternward, not straight out.
      const hx2 = sx0 + ox * tw - fx * tw * 0.55;
      const hy2 = sy0 + oy * tw + tw * 0.4 - fy * ys * tw * 0.55;
      ctx.beginPath();
      ctx.moveTo(ex0, ey0);
      ctx.quadraticCurveTo(sx0 + ox * tw * 0.5, sy0 + oy * tw * 0.5, hx2, hy2);
      ctx.lineTo(ex1, ey1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- THE RAMPART'S MAIL: authored plates, each a 4-facet pyramid
  // seated on the vault's true curve, lit by screen orientation, far
  // rows first (the turtle mail's whole discipline; a crab's layout).
  const ridgeY = -py * hw * 0.66;
  const plates = GIANTCRAB_PLATES.map(([txx, tyy, lk, wk2, kk], idx) => {
    const jb = (f.seed ^ (idx * 0x9e3779b9)) >>> 0;
    const js = 0.93 + ((jb >>> 4) & 15) * 0.009;
    const jx = (((jb >>> 8) & 7) - 3.5) * 0.008;
    const X = (txx + jx) * hl;
    const Y = tyy === 0 ? ridgeY : tyy * hw;
    const LX = lk * hl * js;
    const WY = wk2 * hw * js;
    const zBase = tyy === 0 ? topH(X) : surf(X, Y);
    const corners = [
      P3(X + LX, Y - WY, zBase * 0.94),
      P3(X + LX, Y + WY, zBase * 0.94),
      P3(X - LX, Y + WY * 0.62, zBase * 0.94),
      P3(X - LX, Y - WY * 0.62, zBase * 0.94),
    ];
    // Storm-raked: every apex sweeps aft, the bow wall hardest.
    const apex = P3(X - LX * 0.45, Y, zBase + look.crestH * kk * tk);
    return { corners, apex, sortY: P3(X, Y, 0).y, wall: txx > 0.3 };
  }).sort((a, b2) => a.sortY - b2.sortY);
  for (const pl of plates) {
    const { corners, apex } = pl;
    if (f.hurt) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      for (const c of corners) ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    // Plates sit a step BRIGHTER than the vault (the window law); the
    // bow wall wears the crest ink lifted hardest — the crenellation
    // must read at world zoom.
    const base = pl.wall ? shade(look.crest, 22) : shade(shell, 7);
    for (let e = 0; e < 4; e++) {
      const ci = corners[e]!;
      const cj = corners[(e + 1) % 4]!;
      const midY = (ci.y + cj.y) / 2;
      const dn = Math.hypot((ci.x + cj.x) / 2 - apex.x, midY - apex.y) || 1e-4;
      const ny = (midY - apex.y) / dn;
      // The wall carries the relief; the field plates stay quieter so
      // face-on undercuts never band into dark windows.
      ctx.fillStyle = shade(base, Math.round(-ny * (pl.wall ? 22 : 15)) + (pl.wall ? 8 : 6));
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(ci.x, ci.y);
      ctx.lineTo(cj.x, cj.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.22)';
    ctx.lineWidth = Math.max(1, s * 0.013);
    ctx.beginPath();
    ctx.moveTo(corners[0]!.x, corners[0]!.y);
    for (let e = 1; e < 4; e++) ctx.lineTo(corners[e]!.x, corners[e]!.y);
    ctx.closePath();
    ctx.stroke();
    if (pl.wall) {
      // The wall blades flash their swept edge.
      ctx.strokeStyle = shade(shell, 30);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(corners[0]!.x, corners[0]!.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.lineTo(corners[1]!.x, corners[1]!.y);
      ctx.stroke();
    }
  }

  // (THE YEARS ON THE WALL moved inside the hull-clipped marks pass
  // above — a barnacle can no longer float off the silhouette.)

  // THE WORKING MOUTH: two small dim maxilliped chevrons tucked in
  // the rim shadow under the bow, fluttering — the idle read that
  // says alive, front bands only. QUIET by law: bright chevrons at
  // hull height read as floating glyphs, not mouthparts.
  if (!f.hurt && !dead && fy > 0.2) {
    ctx.strokeStyle = shade(look.under, 26);
    ctx.lineWidth = Math.max(1, s * 0.016);
    for (const mSide of [-1, 1]) {
      const flut = Math.sin(nowMs / 190 + phase + mSide * 1.6) * 0.01;
      const mx = bx + (fx * hl * 0.88 + px * mSide * hw * 0.09) * s;
      const my =
        gy + (fy * hl * 0.88 + py * mSide * hw * 0.09) * ys * s -
        (look.rimBot * 0.3 + flut) * s -
        lift * 0.6;
      ctx.beginPath();
      ctx.moveTo(mx - s * 0.02 * mSide, my - s * 0.02);
      ctx.lineTo(mx, my);
      ctx.lineTo(mx - s * 0.02 * mSide, my + s * 0.02);
      ctx.stroke();
    }
  }

  drawStalks();

  if (!deferNearClaws) paintGiantCrabClaws(ctx, spec, look, f, 'near', at, nowMs);
}

/**
 * The giant beetle: domed elytra split by a center seam with an
 * iridescent sheen, a darker pronotum plate at the front, and a rhino
 * horn hooking up off the head between two elbowed antennae. Whole
 * animal in the body painter — head and tail branches return early.
 */
export interface BeetleLook {
  shell: string;
  plate: string;
  seam: string;
  /** Iridescent highlight glazed over the lit dome. */
  sheen: string;
  horn: string;
  bodyW: number;
  elyH: number;
  plateH: number;
}

export const BEETLE_LOOK: BeetleLook = {
  shell: '#42527a',
  plate: '#333f5e',
  seam: '#1f2740',
  sheen: '#7fd8c9',
  horn: '#242c44',
  bodyW: 0.2,
  elyH: 0.3,
  plateH: 0.17,
};

export function paintBeetleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BeetleLook,
  f: BeastBlockFrame,
  at = 0,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  // Elytra: one big domed shell over the rear three-quarters.
  const aC = -hl * 0.18;
  const aR = hl * 0.8;
  const ely: Array<[number, number]> = [
    [aC + aR, -hw * 0.62],
    [aC + aR, hw * 0.62],
    [aC + aR * 0.5, hw],
    [aC - aR * 0.5, hw],
    [aC - aR, hw * 0.55],
    [aC - aR, -hw * 0.55],
    [aC - aR * 0.5, -hw],
    [aC + aR * 0.5, -hw],
  ];
  const drawEly = (): void =>
    paintBlockBody(
      ctx,
      f,
      ely,
      (X) => look.elyH * (1 - 0.45 * Math.pow((X - aC) / aR, 2)),
      () => 0.06,
      shell,
      (gx, gyy, lift2) => {
        // Seam, striations and sheen live in the elytra's rotated
        // frame so every facing keeps them running nose-to-tail.
        ctx.save();
        ctx.translate(gx(aC, 0), gyy(aC, 0) - look.elyH * tk * s * 0.88 - lift2);
        ctx.rotate(Math.atan2(fy * ys, fx));
        // The center split — two wing cases, not one shell — opening
        // from a scutellum notch at the front.
        ctx.strokeStyle = look.seam;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(aR * 0.8 * s, 0);
        ctx.lineTo(-aR * 0.95 * s, 0);
        ctx.stroke();
        ctx.fillStyle = look.seam;
        ctx.beginPath();
        ctx.moveTo(aR * 0.92 * s, -hw * s * 0.28);
        ctx.lineTo(aR * 0.55 * s, 0);
        ctx.lineTo(aR * 0.92 * s, hw * s * 0.28);
        ctx.closePath();
        ctx.fill();
        // Pit striations flanking the seam.
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.globalAlpha = 0.45;
        for (const q of [-0.5, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(aR * 0.5 * s, q * hw * s * 0.55);
          ctx.lineTo(-aR * 0.8 * s, q * hw * s * 0.55);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Iridescent glaze catching on the lit dome.
        ctx.fillStyle = look.sheen;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        facetBlob(ctx, aR * 0.28 * s, -hw * s * 0.32, aR * 0.5 * s, f.seed | 3, 7, 0.62, 0.8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      },
    );

  // Pronotum plate + head + horn + antennae as one forequarter group.
  const drawFore = (): void => {
    const cC = hl * 0.72;
    const cR = hl * 0.3;
    const cw = hw * 0.78;
    const pro: Array<[number, number]> = [
      [cC + cR, -cw * 0.6],
      [cC + cR, cw * 0.6],
      [cC + cR * 0.4, cw],
      [cC - cR * 0.5, cw],
      [cC - cR, cw * 0.6],
      [cC - cR, -cw * 0.6],
      [cC - cR * 0.5, -cw],
      [cC + cR * 0.4, -cw],
    ];
    paintBlockBody(
      ctx,
      f,
      pro,
      (X) => look.plateH * (1 - 0.35 * Math.pow((X - cC) / cR, 2)),
      () => 0.06,
      f.hurt ? '#ffffff' : look.plate,
    );
    // Head chip in front of the plate.
    const hx0 = bx + fx * hl * 1.08 * s;
    const hy0 = gy + fy * hl * 1.08 * ys * s - look.plateH * 0.4 * tk * s - lift;
    ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.plate, -8);
    ctx.beginPath();
    facetCircle(ctx, hx0, hy0, s * 0.06, 6, Math.atan2(fy * ys, fx));
    ctx.fill();
    // THE HORN: a rhino hook curving up-forward off the head — tossed
    // upward through the strike.
    const toss = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) * 0.12 : 0;
    const P = (fw: number, up: number): { x: number; y: number } => ({
      x: bx + fx * fw * s,
      y: gy + fy * fw * ys * s - up * tk * s - lift,
    });
    const hB = P(hl * 1.06, look.plateH * 0.5);
    const hM = P(hl * 1.32, look.plateH * 0.5 + 0.18);
    const hT = P(hl * 1.34, look.plateH * 0.5 + 0.4 + toss);
    const a1 = Math.atan2(hM.y - hB.y, hM.x - hB.x) + Math.PI / 2;
    const a2 = Math.atan2(hT.y - hM.y, hT.x - hM.x) + Math.PI / 2;
    const w0 = Math.max(1.6, s * 0.05);
    const w1 = Math.max(1.2, s * 0.028);
    ctx.fillStyle = f.hurt ? '#ffffff' : look.horn;
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0, hB.y + Math.sin(a1) * w0);
    ctx.lineTo(hM.x + Math.cos(a2) * w1, hM.y + Math.sin(a2) * w1);
    ctx.lineTo(hT.x, hT.y);
    ctx.lineTo(hM.x - Math.cos(a2) * w1, hM.y - Math.sin(a2) * w1);
    ctx.lineTo(hB.x - Math.cos(a1) * w0, hB.y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Lit leading edge so the hook reads against the dark shell.
    ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.shell, 26);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(hB.x + Math.cos(a1) * w0 * 0.7, hB.y + Math.sin(a1) * w0 * 0.7);
    ctx.lineTo(hM.x + Math.cos(a2) * w1 * 0.7, hM.y + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(hT.x, hT.y);
    ctx.stroke();
    // Elbowed antennae with club tips, staggered; far one hides at
    // profile.
    const dead = f.topScale !== undefined && f.topScale < 1;
    // No antennae from behind — over the dome they read as stray
    // grass, and the horn already carries the silhouette.
    if (!dead && !f.hurt && fy > -0.35) {
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.65 && es * py < 0) continue;
        const a0x = hx0 + px * es * s * 0.05;
        const a0y = hy0 + py * es * s * 0.05 * ys;
        const a1x = a0x + (fx * 0.1 + px * es * 0.08) * s;
        const a1y = a0y + (fy * 0.1 + py * es * 0.08) * ys * s - s * 0.035;
        const a2x = a1x + (fx * 0.05 + px * es * 0.055) * s;
        const a2y = a1y - s * 0.055;
        ctx.strokeStyle = look.horn;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(a0x, a0y);
        ctx.lineTo(a1x, a1y);
        ctx.lineTo(a2x, a2y);
        ctx.stroke();
        ctx.fillStyle = look.horn;
        ctx.fillRect(a2x - s * 0.018, a2y - s * 0.018, s * 0.036, s * 0.036);
      }
    }
  };

  // True depth between the two masses: walking away, the forequarter
  // tucks behind the dome instead of pasting over it.
  if (fy < -0.2) {
    drawFore();
    drawEly();
  } else {
    drawEly();
    drawFore();
  }
}

/**
 * THE SHELL WALKS — the giant turtles. Four reads owned by no other
 * body: THE KEEP (a scute-mailed dome with a serrated rim — the
 * whole silhouette is the shell), THE HOOK (a beaked shear on a neck
 * that fires like a sprung trap while the feet stay planted), THE
 * COLUMNS (pillar legs splayed from under the rim on the widest
 * track in the wood), and THE MAIL (every scute an individually lit
 * pyramid seated on the dome's curve — armor built plate by plate,
 * never a painted grid).
 *
 * TWO BODIES, TWO SPECIES (this is the law of the pair): the giant
 * turtle is THE SNAPPER — a low, long, jagged vault dragging its rim
 * near the ground on a sprawled track, blade-keeled like the old
 * bestiary plates; the colossus is THE MOUNTAIN — a high tortoise
 * dome on true elephant columns with daylight under the keep, moss
 * on its crown plates and a head like a stone outcrop. They must
 * never read as one silhouette at two zooms.
 */
export interface TurtleLook {
  /** Crown plates — the mail's base tone; facets derive from it. */
  shell: string;
  /** The marginal band riding the shell's lower edge. */
  rim: string;
  /** Keel blades and rim saw-teeth. */
  spike: string;
  /** Hide: neck, legs, tail. */
  skin: string;
  /** Pale throat and lower jaw. */
  throat: string;
  beak: string;
  eye: string;
  /** The colossus wears the years: moss caps on the crown plates. */
  moss?: string;
  /** Shell half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  /** Dome height at the peak. */
  shellH: number;
  /** Keel blade height above the crown at the tallest station. */
  spikeH: number;
  headW: number;
  headH: number;
  /** Head carry height above ground (the rim line). */
  headRise: number;
  /** Daylight under the keep: the rim's height off the ground. */
  rimBot: number;
  /** Heavier brow, barbels, moss, crown plate — the ancient read. */
  ancient?: boolean;
}

export const TURTLE_LOOK: TurtleLook = {
  shell: '#4a5238',
  rim: '#6e7449',
  // The horn is its own material — raised olive bone, never the
  // shell's tone (a thorn the shell's color reads as a bump, not
  // grown armor).
  spike: '#6f6d49',
  skin: '#7a8455',
  throat: '#cdc7a3',
  beak: '#a89d72',
  eye: '#d29b3f',
  bodyW: 0.44,
  shellH: 0.3,
  spikeH: 0.22,
  headW: 0.27,
  headH: 0.19,
  headRise: 0.22,
  rimBot: 0.08,
};

export const COLOSSUS_LOOK: TurtleLook = {
  shell: '#555c49',
  rim: '#7b775c',
  // Weathered stone-horn — the mountain's studs, a step above the
  // vault they crown but carved by their own shadow.
  spike: '#746e58',
  skin: '#6d7462',
  throat: '#c3bd9d',
  beak: '#a8a184',
  eye: '#d0b26a',
  moss: '#5d7442',
  bodyW: 0.62,
  shellH: 0.6,
  spikeH: 0.34,
  headW: 0.38,
  headH: 0.26,
  headRise: 0.34,
  rimBot: 0.18,
  ancient: true,
};

/**
 * THE SPIKE IS THE PLATE — the carapace is ONE lattice. A shared
 * vertex grid tiles the dome into scute plates, and EVERY plate
 * grows its own horn whose base ring IS the plate's corners (inset
 * a hair so the seam still reads between neighbors). Base-of-spike
 * matches base-of-shell at every band by construction — there is
 * no separate thorn layout left to drift against the mesh at the
 * quarters. The authored hand lives in the PROFILES: a per-column
 * height rank (the crown column is the vertebral saw, the flanks
 * step down toward the rim) and a per-band taper (tallest
 * amidships, dropping to bow and stern), per species.
 */
const SNAPPER_BANDS: readonly number[] = [-0.9, -0.56, -0.2, 0.16, 0.54, 0.97];
const SNAPPER_BAND_K: readonly number[] = [0.6, 0.9, 1, 0.85, 0.55];
const COLOSSUS_BANDS: readonly number[] = [-0.86, -0.56, -0.26, 0.06, 0.38, 0.68, 0.95];
const COLOSSUS_BAND_K: readonly number[] = [0.5, 0.82, 1, 0.95, 0.75, 0.5];
/** Column edges as fractions of the hull's local half-width. */
const MESH_COLS: readonly number[] = [-1, -0.6, -0.22, 0.22, 0.6, 1];
/** Per-column height rank and cant class (crown, inner, outer). */
const MESH_COL_K: readonly number[] = [0.5, 0.78, 1, 0.78, 0.5];
const MESH_COL_RANK: readonly number[] = [2, 1, 0, 1, 2];

export function paintTurtleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: TurtleLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const shell = shade(look.shell, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;
  // THE DOME IS THE SPECIES: the snapper's vault is LOW and long
  // (peak shoved aft, steep bow falloff); the mountain's dome is
  // HIGH and central — the two silhouettes must never rhyme.
  const domeC = look.ancient ? -hl * 0.02 : -hl * 0.1;
  const fall = look.ancient ? 0.36 : 0.52;
  const topH = (X: number): number =>
    Math.max(0.05, look.shellH * (1 - fall * Math.pow((X - domeC) / hl, 2)));
  const P3 = (X: number, Y: number, Z: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * Y) * s,
    y: gy + (fy * X + py * Y) * ys * s - Z * tk * s - lift,
  });

  // THE BODY UNDER THE KEEP: a skin mass filling the rim's shadow so
  // legs and neck root into flesh instead of poking from an empty
  // shelf (the hollow-crate cheat, retired). THE BELLY TUCKS LIKE A
  // LION'S: the mass is a GROUND-frame lens — its screen width
  // follows the facing between the two half-dims, its depth squashes
  // with ys, and its ground LINE is authored bottom-up with real
  // clearance (daylight under the mountain, the snapper's keel a
  // finger off the dirt). The old body-rotated blob projected the
  // hull's full lateral width as belly DEPTH at profile — a bloated
  // sack scraping the ground.
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const brx = (hl * 0.76 * ax + hw * 0.82 * ay) * s;
  const bry = (hw * 0.34 * ax + hl * 0.3 * ay) * ys * s;
  const bellyClear = (look.ancient ? 0.06 : 0.02) * s;
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.skin, -20);
  ctx.save();
  ctx.translate(bx, gy - bellyClear - lift * 0.6 - bry);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, brx, f.seed | 5, 8, bry / brx, 0.5);
  ctx.fill();
  ctx.restore();

  // Footprints fork with the species: the snapper's rim is long and
  // slightly angular (a jagged skirt wants corners to hang teeth
  // on); the mountain's is round-shouldered.
  const foot: Array<[number, number]> = look.ancient
    ? [
        [hl * 0.95, -hw * 0.36],
        [hl * 0.95, hw * 0.36],
        [hl * 0.72, hw * 0.74],
        [hl * 0.34, hw * 0.95],
        [-hl * 0.4, hw],
        [-hl * 0.76, hw * 0.72],
        [-hl * 0.9, hw * 0.34],
        [-hl * 0.9, -hw * 0.34],
        [-hl * 0.76, -hw * 0.72],
        [-hl * 0.4, -hw],
        [hl * 0.34, -hw * 0.95],
        [hl * 0.72, -hw * 0.74],
      ]
    : [
        [hl * 1.0, -hw * 0.42],
        [hl * 1.0, hw * 0.42],
        [hl * 0.72, hw * 0.8],
        [hl * 0.3, hw * 0.98],
        [-hl * 0.34, hw],
        [-hl * 0.72, hw * 0.76],
        [-hl * 0.94, hw * 0.4],
        [-hl * 0.94, -hw * 0.4],
        [-hl * 0.72, -hw * 0.76],
        [-hl * 0.34, -hw],
        [hl * 0.3, -hw * 0.98],
        [hl * 0.72, -hw * 0.8],
      ];

  // THE THORNED SKIRT: the marginal rim wears true horn all the way
  // around — every foot edge hangs a two-facet thorn pointing
  // outward in the BODY frame (projected, so the hem rotates and
  // foreshortens with the hull). Far thorns paint UNDER the keep so
  // the dome occludes their roots while the tips still break the
  // skyline at the back bands; near thorns paint over the flank —
  // a full 360° hem, never a near-side decal.
  const cyd = gy - lift;
  const skirtLen = (look.ancient ? 0.14 : 0.17) * hl;
  const rootZ = look.rimBot + (look.ancient ? 0.1 : 0.05);
  type SkirtThorn = {
    a: { x: number; y: number };
    b: { x: number; y: number };
    m: { x: number; y: number };
    t: { x: number; y: number };
    near: boolean;
  };
  const skirt: SkirtThorn[] = [];
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i]!;
    const b = foot[(i + 1) % foot.length]!;
    const jb = (f.seed ^ (i * 0x85ebca6b)) >>> 0;
    const jl = 0.78 + ((jb >>> 3) & 15) * 0.035; // a jagged hem, never a comb
    const mX = (a[0] + b[0]) / 2;
    const mY = (a[1] + b[1]) / 2;
    const el = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4;
    const ex2 = (b[0] - a[0]) / el;
    const ey2 = (b[1] - a[1]) / el;
    let nx = ey2;
    let ny2 = -ex2;
    if (nx * mX + ny2 * mY < 0) {
      nx = -nx;
      ny2 = -ny2;
    }
    const bw = Math.min(el * 0.3, hl * 0.09);
    const A2 = P3(mX - ex2 * bw, mY - ey2 * bw, rootZ);
    const B2 = P3(mX + ex2 * bw, mY + ey2 * bw, rootZ);
    const T2 = P3(mX + nx * skirtLen * jl, mY + ny2 * skirtLen * jl, rootZ - 0.035);
    const M2 = P3(mX, mY, rootZ + 0.02);
    skirt.push({ a: A2, b: B2, m: M2, t: T2, near: M2.y > cyd - 0.02 * s });
  }
  const hornRim = shade(look.rim, -4);
  const paintSkirtThorn = (th: SkirtThorn): void => {
    // Two facets split along the thorn's axis, lit by true screen
    // orientation — the same light every dome thorn answers to.
    const halves: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [th.a, th.t],
      [th.t, th.b],
    ];
    for (const [c0, c1] of halves) {
      const midY2 = (c0.y + c1.y) / 2;
      const dn2 = Math.hypot((c0.x + c1.x) / 2 - th.m.x, midY2 - th.m.y) || 1e-4;
      const nyF = (midY2 - th.m.y) / dn2;
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(hornRim, Math.round(-nyF * 24) + 4);
      ctx.beginPath();
      ctx.moveTo(th.m.x, th.m.y);
      ctx.lineTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.closePath();
      ctx.fill();
    }
    // The hem takes THE BROKEN INK too — the down-screen edge only,
    // tip toward base, so each skirt horn breaks from the flank it
    // rides without ringing the hem into a chain.
    if (!f.hurt) {
      const low = th.a.y >= th.b.y ? th.a : th.b;
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(th.t.x, th.t.y);
      ctx.lineTo(th.t.x + (low.x - th.t.x) * 0.62, th.t.y + (low.y - th.t.y) * 0.62);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    }
  };
  for (const th of skirt) if (!th.near) paintSkirtThorn(th);

  // THE SPIKE IS THE PLATE: one shared lattice serves plate and horn
  // alike. The vertex grid lives in the BODY frame on the dome's
  // true surface — jitter is seeded ON the vertex so neighboring
  // plates always meet edge-to-edge, column widths ride the hull's
  // own foot polygon band by band, and the center column remaps onto
  // the crown line (the same slide the old vertebral saw rode) so
  // the ridge stays dead-center face-on and on the skyline at
  // profile. Every projection — plate fill, horn base, horn tip —
  // derives from this one grid, so the mail agrees with itself at
  // all eight bands by construction.
  const xs = look.ancient ? COLOSSUS_BANDS : SNAPPER_BANDS;
  const bandK = look.ancient ? COLOSSUS_BAND_K : SNAPPER_BAND_K;
  const ridgeY = -py * hw * 0.66;
  const port = foot.filter((p) => p[1] < 0).sort((p1, p2) => p1[0] - p2[0]);
  const wAt = (X: number): number => {
    if (X <= port[0]![0]) return -port[0]![1];
    for (let i2 = 1; i2 < port.length; i2++) {
      const p1 = port[i2 - 1]!;
      const p2 = port[i2]!;
      if (X <= p2[0]) {
        const t2 = (X - p1[0]) / (p2[0] - p1[0] || 1e-4);
        return -(p1[1] + (p2[1] - p1[1]) * t2);
      }
    }
    return -port[port.length - 1]![1];
  };
  // One projector for the whole lattice (P3 plus the top face's roll
  // term, so plates sit exactly on the painted vault).
  const pv = (X: number, Y: number, z: number): { x: number; y: number } => ({
    x: bx + (fx * X + px * Y) * s,
    y: gy + (fy * X + py * Y) * ys * s - z * tk * s - lift + Y * s * f.roll * 0.4,
  });
  type MeshV = { X: number; Y: number; z: number; x: number; y: number };
  const grid: MeshV[][] = [];
  for (let i2 = 0; i2 < xs.length; i2++) {
    const row: MeshV[] = [];
    for (let j2 = 0; j2 < MESH_COLS.length; j2++) {
      const jb2 = (f.seed ^ ((i2 * 7 + j2) * 0x45d9f3b)) >>> 0;
      const X = (xs[i2]! + (((jb2 >>> 3) & 7) - 3.5) * 0.008) * hl;
      const wX = wAt(X) * 0.985;
      const edge = Math.abs(MESH_COLS[j2]!) > 0.9;
      const jy2 = (((jb2 >>> 7) & 7) - 3.5) * (edge ? 0.004 : 0.012);
      const cfr = MESH_COLS[j2]! + jy2;
      const Yv = cfr * wX + ridgeY * (1 - cfr * cfr);
      const z2 = topH(X) * (1 - 0.3 * Math.pow((cfr * wX) / hw, 2));
      const sp = pv(X, Yv, z2);
      row.push({ X, Y: Yv, z: z2, x: sp.x, y: sp.y });
    }
    grid.push(row);
  }
  // Cost containment: the whole lattice — vertices, plates, horns —
  // is ONE O(cells) pass with no Path2D and no per-frame caches to
  // invalidate, and in the world it paints through the body-sprite
  // cache: an idle shell re-bakes on the OL_IDLE_CADENCE stagger,
  // not per frame.

  paintBlockBody(
    ctx,
    f,
    foot,
    topH,
    () => look.rimBot,
    shell,
    (gx, gyy, lift2) => {
      // THE MAIL HAS NO GAPS: the SHARED lattice paints its plates
      // here, inside the hull clip (the crab's fixture law) — full
      // at the quarters and the profiles, not just N/S. The horns
      // grown from these same cells paint after, unclipped, so
      // their tips break the silhouette while their bases can
      // never leave it.
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let i2 = 0; i2 < grid.length - 1; i2++) {
        for (let j2 = 0; j2 < MESH_COLS.length - 1; j2++) {
          const jb2 = (f.seed ^ ((i2 * 5 + j2) * 0x9e3779b9)) >>> 0;
          // Plates sit a step brighter than the vault (the law),
          // brightest on the crown column — the global top-face
          // wash and flank shade re-model the dome OVER the mesh.
          const mid2 = Math.abs(MESH_COLS[j2]! + MESH_COLS[j2 + 1]!) / 2;
          const step = mid2 < 0.15 ? 7 : mid2 < 0.5 ? 4 : 2;
          ctx.fillStyle = shade(shell, step + (((jb2 >>> 5) & 7) - 3.5));
          ctx.beginPath();
          ctx.moveTo(grid[i2]![j2]!.x, grid[i2]![j2]!.y);
          ctx.lineTo(grid[i2 + 1]![j2]!.x, grid[i2 + 1]![j2]!.y);
          ctx.lineTo(grid[i2 + 1]![j2 + 1]!.x, grid[i2 + 1]![j2 + 1]!.y);
          ctx.lineTo(grid[i2]![j2 + 1]!.x, grid[i2]![j2 + 1]!.y);
          ctx.closePath();
          ctx.fill();
          // The seams ARE the mesh read — quiet ink, never a grid.
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.28)';
          ctx.stroke();
        }
      }
      // The marginal band: lighter rim scutes hugging the skirt.
      ctx.save();
      ctx.translate(gx(domeC, 0), gyy(domeC, 0) - look.shellH * tk * s * 0.8 - lift2);
      ctx.rotate(Math.atan2(fy * ys, fx));
      ctx.strokeStyle = look.rim;
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(hl * 0.92 * s, -hw * 0.5 * s);
      ctx.quadraticCurveTo(hl * 0.18 * s, -hw * 0.98 * s, -hl * 0.62 * s, -hw * 0.8 * s);
      ctx.moveTo(hl * 0.92 * s, hw * 0.5 * s);
      ctx.quadraticCurveTo(hl * 0.18 * s, hw * 0.98 * s, -hl * 0.62 * s, hw * 0.8 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  );

  // The near half of the hem rides over the painted flank.
  for (const th of skirt) if (th.near) paintSkirtThorn(th);

  // ---- THE HORNS OF THE LATTICE: every plate grows its spike —
  // the base ring IS the plate's own corners (inset a hair so the
  // seam still reads between neighbors), the apex rakes aft and
  // cants outward by the plate's column, and the height follows the
  // authored column × band profiles (the crown column is the
  // vertebral saw). Painted far-to-near so each near tip overlaps
  // the base behind it — the imbricated read of grown armor, with
  // base-of-spike matching base-of-shell at every band by
  // construction. The species wears its own horn (TWO BODIES, TWO
  // SPECIES): the snapper's blades rake hard and curve like sabres;
  // the mountain's studs rise blunt and broad. shadeAmp: the
  // mountain's blunt studs need HARDER facet light — shallow cones
  // at this camera pitch flatten to lozenges unless the light
  // carves them (the colossus pass-one failure).
  const horn = look.ancient
    ? { rake: 0.42, cant: [0, 0.62, 1.05], curve: 0.14, shadeAmp: 36 }
    : { rake: 0.62, cant: [0, 0.4, 0.75], curve: 0.3, shadeAmp: 26 };
  const thorns = [] as Array<{
    T: { x: number; y: number };
    ring: Array<{ x: number; y: number }>;
    K: { x: number; y: number };
    R: number;
    rank: number;
    mossy: boolean;
    scarred: boolean;
    mseed: number;
    sortY: number;
  }>;
  for (let ib = 0; ib < grid.length - 1; ib++) {
    for (let jc = 0; jc < MESH_COLS.length - 1; jc++) {
      const vs = [grid[ib]![jc]!, grid[ib + 1]![jc]!, grid[ib + 1]![jc + 1]!, grid[ib]![jc + 1]!];
      // Seeded smith's-hand jitter: no two horns the same, no two
      // shells the same mail — and the same shell forever.
      const jb = (f.seed ^ ((ib * 9 + jc) * 0x2545f491)) >>> 0;
      const jh = 0.88 + ((jb >>> 12) & 15) * 0.016;
      const h = look.spikeH * MESH_COL_K[jc]! * bandK[ib]! * jh;
      const Xc = (vs[0]!.X + vs[1]!.X + vs[2]!.X + vs[3]!.X) / 4;
      const Yc = (vs[0]!.Y + vs[1]!.Y + vs[2]!.Y + vs[3]!.Y) / 4;
      const zc = (vs[0]!.z + vs[1]!.z + vs[2]!.z + vs[3]!.z) / 4;
      const rank = MESH_COL_RANK[jc]!;
      const latSgn = jc < 2 ? -1 : jc > 2 ? 1 : 0;
      const T = pv(Xc - horn.rake * h, Yc + latSgn * horn.cant[rank]! * h, zc + h);
      const K = pv(Xc, Yc, zc);
      const ring = vs.map((v) => ({
        x: v.x + (K.x - v.x) * 0.14,
        y: v.y + (K.y - v.y) * 0.14,
      }));
      const R = Math.hypot(ring[0]!.x - ring[2]!.x, ring[0]!.y - ring[2]!.y) / (2 * s);
      // The years are CELL facts, decided HERE where the cell id is
      // stable — never off the depth-sorted index (a sort-order pick
      // made the moss JUMP between plates as the body turned; the
      // sort permutes with facing, the lattice does not).
      const mossy = !!look.moss && ((jb >>> 16) & 15) < 2;
      const scarred = !!look.moss && ((jb >>> 20) & 31) === 3;
      thorns.push({ T, ring, K, R, rank, mossy, scarred, mseed: jb, sortY: pv(Xc, Yc, 0).y });
    }
  }
  thorns.sort((q1, q2) => q1.sortY - q2.sortY);
  const curveK = horn.curve;
  for (const th of thorns) {
    const { T, ring, K } = th;
    if (f.hurt) {
      ctx.fillStyle = '#ffffff';
      for (let e = 0; e < 4; e++) {
        const ci = ring[e]!;
        const cj = ring[(e + 1) % 4]!;
        ctx.beginPath();
        ctx.moveTo(T.x, T.y);
        ctx.lineTo(ci.x, ci.y);
        ctx.lineTo(cj.x, cj.y);
        ctx.closePath();
        ctx.fill();
      }
      continue;
    }
    // No separate socket anymore — the horn's socket IS its plate;
    // the plate margin left by the base inset does the rooting.
    // Four facets, edges bowed to the tip (the sabre curve —
    // straight triangles read as stamped tin), lit by TRUE screen
    // orientation: sky-facing horn catches the light, the undercut
    // falls into its own shadow. The horn sits BRIGHTER than the
    // vault it grows from (dark plates on a lit dome read as
    // windows — the law still binds).
    const base = th.rank === 0 ? shade(look.spike, 8) : look.spike;
    const ctrl = (p: { x: number; y: number }): { x: number; y: number } => {
      const mx2 = (p.x + T.x) / 2;
      const my2 = (p.y + T.y) / 2;
      const ox = mx2 - K.x;
      const oy = my2 - K.y;
      const od = Math.hypot(ox, oy) || 1e-4;
      const el2 = Math.hypot(p.x - T.x, p.y - T.y);
      return { x: mx2 + (ox / od) * el2 * curveK, y: my2 + (oy / od) * el2 * curveK };
    };
    for (let e = 0; e < 4; e++) {
      const ci = ring[e]!;
      const cj = ring[(e + 1) % 4]!;
      const midX = (ci.x + cj.x) / 2;
      const midY = (ci.y + cj.y) / 2;
      const dn = Math.hypot(midX - T.x, midY - T.y) || 1e-4;
      const nyF = (midY - T.y) / dn;
      ctx.fillStyle = shade(base, Math.round(-nyF * horn.shadeAmp) + 6);
      const c0 = ctrl(ci);
      const c1 = ctrl(cj);
      ctx.beginPath();
      ctx.moveTo(ci.x, ci.y);
      ctx.quadraticCurveTo(c0.x, c0.y, T.x, T.y);
      ctx.quadraticCurveTo(c1.x, c1.y, cj.x, cj.y);
      ctx.closePath();
      ctx.fill();
    }
    // Quiet base seam + a lit keel on the saw blades — the facets
    // carry the relief, never the ink.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.2)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(ring[0]!.x, ring[0]!.y);
    for (let e = 1; e < 4; e++) ctx.lineTo(ring[e]!.x, ring[e]!.y);
    ctx.closePath();
    ctx.stroke();
    // THE BROKEN INK: the outline shader rings only the OUTER
    // silhouette — interior thorns melt together exactly where the
    // 3D overlap needs definition. Each horn takes a PARTIAL stroke
    // of the world's own ink (#241a2e): the shadow-side edge from
    // the tip down two-thirds, a short flick on the lit edge —
    // enough to definitively break every spike from the one behind
    // it, never a closed ring (a ringed base grids the mail and
    // muddies the read). Strokes follow the sabre's own quadratic,
    // so the ink IS the edge, not a halo beside it.
    const inkEdge = (p: { x: number; y: number }, frac: number, alpha: number): void => {
      const c = ctrl(p);
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(T.x, T.y);
      for (let i2 = 1; i2 <= 5; i2++) {
        const t2 = (frac * i2) / 5;
        const u2 = 1 - t2;
        ctx.lineTo(
          u2 * u2 * T.x + 2 * u2 * t2 * c.x + t2 * t2 * p.x,
          u2 * u2 * T.y + 2 * u2 * t2 * c.y + t2 * t2 * p.y,
        );
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
    };
    const inkA = look.ancient ? 0.5 : 0.62;
    const shadowSh = ring[0]!.y >= ring[2]!.y ? ring[0]! : ring[2]!;
    const litSh = shadowSh === ring[0] ? ring[2]! : ring[0]!;
    inkEdge(shadowSh, 0.66, inkA);
    inkEdge(litSh, 0.3, inkA * 0.7);
    // The saw flashes its keel only where the blade shows its side —
    // face-on the five keels would chain into one pale zipper down
    // the spine (the pass-one failure of this pass).
    if (th.rank === 0 && Math.abs(fx) > 0.35) {
      ctx.strokeStyle = shade(base, 26);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.globalAlpha = Math.min(1, Math.abs(fx) * 1.3);
      // The keel springs from the bow edge's midpoint — ring[1] and
      // ring[2] are the plate's bow-ward corners.
      const nose = {
        x: (ring[1]!.x + ring[2]!.x) / 2,
        y: (ring[1]!.y + ring[2]!.y) / 2,
      };
      const cn = ctrl(nose);
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.quadraticCurveTo(cn.x, cn.y, T.x, T.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // The years, grown ON the horn and painted WITH the horn — moss
    // caps and lichen scars ride their own plate's paint slot in the
    // depth order, so a nearer spike overlaps them exactly as it
    // overlaps the horn they cap. Position and shape both derive
    // from the cell (K→T axis, cell seed): the growth is AFFIXED —
    // it turns with the spike and never redraws elsewhere (the
    // painted-on-top jitter, retired).
    if (th.mossy) {
      ctx.fillStyle = look.moss!;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      facetBlob(
        ctx,
        K.x + (T.x - K.x) * 0.32,
        K.y + (T.y - K.y) * 0.32,
        th.R * s * 0.6,
        th.mseed,
        6,
        0.7,
        0.9,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (th.scarred) {
      ctx.strokeStyle = shade(look.shell, 20);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(ring[0]!.x, ring[0]!.y);
      ctx.lineTo(T.x, T.y);
      ctx.stroke();
    }
  }
}

export function drawTurtleHead(
  ctx: CanvasRenderingContext2D,
  look: TurtleLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: lids down, jaw slack, nothing watching. */
    dead?: boolean;
  },
): void {
  const { x, y, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const hw = look.headW * s;
  const hh = look.headH * s;
  const gape = o.dead ? 0.12 : (o.gape ?? 0);
  const skin = o.hurt ? '#ffffff' : shade(look.skin, 4);

  // THE SNAPPER MOUTH — a CUT, never a cone. The rework's law: the
  // muzzle is the skull's own flesh, the keratin lip is a narrow
  // band on its leading edge with the hook notch at the tip, and
  // the mouth is the long dark line sweeping from the hook back to
  // a corner below the eye — the grim saurian smile of every
  // reference plate. Nothing pale ever projects off the face like a
  // bird's bill again.
  const pk = Math.abs(fx);
  const tipR = look.ancient ? 0.88 : 0.98;
  const tipX = x + fx * hw * tipR;
  const tipY = y + fy * hw * tipR * ys + hh * 0.02;
  const jawDrop = gape * hh * 0.6;
  // Mouth corners: below and behind the eye line, one per side —
  // the cut's far end, and the lower jaw's hinge.
  const corner = (es: number): { x: number; y: number } => ({
    x: x + px * es * hw * 0.46 + fx * hw * 0.16,
    y: y + (py * es * hw * 0.46 + fy * hw * 0.16) * ys + hh * 0.2,
  });
  const cL = corner(-1);
  const cR = corner(1);
  // The lower jaw: one wide pale shovel spanning corner to corner —
  // never a narrow chin — swinging down through the gape.
  ctx.fillStyle = o.hurt ? '#ffffff' : look.throat;
  ctx.beginPath();
  ctx.moveTo(cL.x, cL.y);
  ctx.lineTo(tipX, tipY + hh * 0.24 + jawDrop);
  ctx.lineTo(cR.x, cR.y);
  ctx.lineTo(x + fx * hw * 0.08, y + fy * hw * 0.08 * ys + hh * 0.36);
  ctx.closePath();
  ctx.fill();
  // The gape's dark room between lip and jaw.
  if (gape > 0.12 && !o.hurt) {
    ctx.fillStyle = '#4a2e28';
    ctx.beginPath();
    ctx.moveTo(cL.x, cL.y);
    ctx.lineTo(tipX, tipY + hh * 0.1 + jawDrop * 0.5);
    ctx.lineTo(cR.x, cR.y);
    ctx.lineTo(x + fx * hw * 0.14, y + fy * hw * 0.14 * ys + hh * 0.14);
    ctx.closePath();
    ctx.fill();
  }

  // THE SKULL: a blunt armored wedge with a foreshortened crown
  // plane — the head must carry its share of the body's mass.
  ctx.fillStyle = skin;
  ctx.beginPath();
  facetCircle(ctx, x, y, hw * 0.6, 7, Math.atan2(fy * ys, fx));
  ctx.fill();
  if (!o.hurt) {
    ctx.fillStyle = shade(look.skin, 12);
    ctx.beginPath();
    facetCircle(ctx, x - fx * hw * 0.05, y - fy * hw * 0.05 * ys - hh * 0.18, hw * 0.38, 6, 1.1);
    ctx.fill();
    // THE CROWN PLATE (the ancient only): a darker armored slab
    // SEATED on the skull top between the brows — snug, or it reads
    // as a hat floating behind the head.
    if (look.ancient) {
      ctx.fillStyle = shade(look.shell, -4);
      ctx.beginPath();
      facetCircle(ctx, x - fx * hw * 0.06, y - fy * hw * 0.06 * ys - hh * 0.18, hw * 0.26, 5, 0.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.stroke();
    }
  }

  // THE MUZZLE: the skull's own flesh reaching forward to the lip —
  // one mass with the cranium, wider than it is long, so the head
  // reads reptile, never bird.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x - px * hw * 0.46 + fx * hw * 0.16, y + (-py * hw * 0.46 + fy * hw * 0.16) * ys - hh * 0.12);
  ctx.lineTo(tipX - px * hw * 0.24, tipY - py * hw * 0.24 * ys - hh * 0.08);
  ctx.lineTo(tipX, tipY + hh * 0.08);
  ctx.lineTo(tipX + px * hw * 0.24, tipY + py * hw * 0.24 * ys - hh * 0.08);
  ctx.lineTo(x + px * hw * 0.46 + fx * hw * 0.16, y + (py * hw * 0.46 + fy * hw * 0.16) * ys - hh * 0.12);
  ctx.lineTo(x + fx * hw * 0.1, y + fy * hw * 0.1 * ys + hh * 0.18);
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // The muzzle's top plane catches the light with the crown.
    ctx.fillStyle = shade(look.skin, 10);
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.26 + fx * hw * 0.2, y + (-py * hw * 0.26 + fy * hw * 0.2) * ys - hh * 0.16);
    ctx.lineTo(tipX - px * hw * 0.13, tipY - py * hw * 0.13 * ys - hh * 0.1);
    ctx.lineTo(tipX + px * hw * 0.13, tipY + py * hw * 0.13 * ys - hh * 0.1);
    ctx.lineTo(x + px * hw * 0.26 + fx * hw * 0.2, y + (py * hw * 0.26 + fy * hw * 0.2) * ys - hh * 0.16);
    ctx.closePath();
    ctx.fill();

    // THE LIP: a narrow keratin band along the leading edge — the
    // beak is TRIM on the mouth, never the mouth itself.
    ctx.strokeStyle = shade(look.beak, 4);
    ctx.lineWidth = Math.max(1.5, hh * 0.13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX - px * hw * 0.22, tipY - py * hw * 0.22 * ys + hh * 0.0);
    ctx.quadraticCurveTo(
      tipX + fx * hw * 0.05,
      tipY + fy * hw * 0.05 * ys + hh * 0.05,
      tipX + px * hw * 0.22,
      tipY + py * hw * 0.22 * ys + hh * 0.0,
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
    // THE HOOK NOTCH: the lip's point dropping past the jaw line —
    // deep on the snapper, a blunt chisel on the mountain.
    ctx.fillStyle = shade(look.beak, -6);
    ctx.beginPath();
    ctx.moveTo(tipX - px * hw * 0.08, tipY - py * hw * 0.08 * ys + hh * 0.02);
    ctx.lineTo(tipX + fx * hw * 0.04, tipY + fy * hw * 0.04 * ys + hh * (look.ancient ? 0.2 : 0.3));
    ctx.lineTo(tipX + px * hw * 0.08, tipY + py * hw * 0.08 * ys + hh * 0.02);
    ctx.closePath();
    ctx.fill();

    // THE CUT: the mouth line sweeping from under the hook back to
    // the corner below the eye — a sag, then the rise into the grim
    // corner. Both cheeks show face-on (the iconic front smile);
    // the far cheek hides at profile. The open mouth replaces it.
    if (gape < 0.3) {
      ctx.strokeStyle = 'rgba(30, 20, 24, 0.72)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        if (pk > 0.6 && es * py < 0) continue;
        const c = corner(es);
        const midXc = (tipX + c.x) / 2 + fx * hw * 0.02;
        const midYc = (tipY + c.y) / 2 + hh * 0.16;
        ctx.beginPath();
        ctx.moveTo(tipX + px * es * hw * 0.05, tipY + py * es * hw * 0.05 * ys + hh * 0.1);
        ctx.quadraticCurveTo(midXc, midYc, c.x, c.y - hh * 0.05);
        ctx.stroke();
        // The snapper's teeth: two points hanging off the upper lip
        // along the cut — the bestiary-plate bite. The mountain is
        // beyond needing to show its teeth.
        if (!look.ancient && !o.dead) {
          ctx.fillStyle = shade(look.beak, -14);
          for (const t of [0.3, 0.55]) {
            const u = 1 - t;
            const qx = u * u * (tipX + px * es * hw * 0.05) + 2 * u * t * midXc + t * t * c.x;
            const qy =
              u * u * (tipY + py * es * hw * 0.05 * ys + hh * 0.1) +
              2 * u * t * midYc +
              t * t * (c.y - hh * 0.05);
            ctx.beginPath();
            ctx.moveTo(qx - hw * 0.035, qy - hh * 0.02);
            ctx.lineTo(qx, qy + hh * 0.09);
            ctx.lineTo(qx + hw * 0.035, qy - hh * 0.02);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      ctx.lineCap = 'butt';
    }
    // Nostril pits on the muzzle tip's top plane.
    if (fy > 0.05) {
      ctx.fillStyle = shade(look.skin, -24);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          tipX - fx * hw * 0.1 + px * es * hw * 0.08,
          tipY + (-fy * hw * 0.1 + py * es * hw * 0.08) * ys - hh * 0.1,
          Math.max(0.6, s * 0.012),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  // THE BROW: a heavy ledge over the eyes. The snapper crowns its
  // ledge with HORN NUBS (the bestiary plate's devil points); the
  // ancient just wears the ledge darker and half again wider.
  if (!o.hurt) {
    ctx.strokeStyle = shade(look.skin, look.ancient ? -30 : -24);
    ctx.lineWidth = Math.max(1.2, s * (look.ancient ? 0.036 : 0.026));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.5 + fx * hw * 0.1, y + (-py * hw * 0.5 + fy * hw * 0.1) * ys - hh * 0.22);
    ctx.quadraticCurveTo(
      x + fx * hw * 0.34,
      y + fy * hw * 0.34 * ys - hh * 0.32,
      x + px * hw * 0.5 + fx * hw * 0.1,
      y + (py * hw * 0.5 + fy * hw * 0.1) * ys - hh * 0.22,
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (!look.ancient && !o.dead) {
      ctx.fillStyle = shade(look.skin, -18);
      for (const es of [-1, 1]) {
        if (Math.abs(fx) > 0.7 && es * py < 0) continue;
        const hx0 = x + px * es * hw * 0.4 + fx * hw * 0.12;
        const hy0 = y + (py * es * hw * 0.4 + fy * hw * 0.12) * ys - hh * 0.26;
        ctx.beginPath();
        ctx.moveTo(hx0 - hw * 0.07, hy0);
        ctx.lineTo(hx0, hy0 - hh * 0.18);
        ctx.lineTo(hx0 + hw * 0.07, hy0);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Eyes: side-set under the ledge — the far one hides at profile.
  // THE SMALL EYE SELLS THE MOUNTAIN (the giant-frame inversion): the
  // ancient's eye is a coal in a cliff, never a doll's button.
  const eyeK = look.ancient ? 0.1 : 0.13;
  if (!o.hurt && fy > -0.5) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const ex0 = x + px * es * hw * 0.42 + fx * hw * 0.18;
      const ey0 = y + (py * es * hw * 0.42 + fy * hw * 0.18) * ys - hh * 0.08;
      if (o.dead) {
        // The lid down — a closed seam where the watch was.
        ctx.strokeStyle = shade(look.skin, -26);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(ex0 - hw * 0.08, ey0);
        ctx.lineTo(ex0 + hw * 0.08, ey0 + hw * 0.02);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#241a14';
      ctx.beginPath();
      facetCircle(ctx, ex0, ey0, Math.max(1, hw * eyeK), 5, es * 0.8);
      ctx.fill();
      ctx.fillStyle = look.eye;
      ctx.beginPath();
      ctx.arc(ex0 - hw * 0.02, ey0 - hw * 0.02, Math.max(0.7, hw * eyeK * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The snapper's hide tubercles: two seeded wart-dots on the cheek
  // — camera-facing bands, live heads only.
  if (!look.ancient && !o.hurt && !o.dead && fy > 0) {
    ctx.fillStyle = shade(look.skin, -12);
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      ctx.beginPath();
      ctx.arc(
        x + px * es * hw * 0.34 + fx * hw * 0.02,
        y + (py * es * hw * 0.34 + fy * hw * 0.02) * ys + hh * 0.1,
        Math.max(0.7, s * 0.014),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // The ancient's chin barbels — old-catfish whiskers of hide,
  // hanging where the camera can see the chin at all.
  if (look.ancient && !o.hurt && !o.dead && fy > -0.2) {
    ctx.strokeStyle = shade(look.skin, -14);
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.lineCap = 'round';
    for (const es of [-1, 1]) {
      const bx0 = x + fx * hw * 0.5 + px * es * hw * 0.14;
      const by0 = y + (fy * hw * 0.5 + py * es * hw * 0.14) * ys + hh * 0.26;
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.quadraticCurveTo(bx0 + px * es * hw * 0.06, by0 + hh * 0.2, bx0 + px * es * hw * 0.02, by0 + hh * 0.34);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}

// ================================================================
// THE STONE COURT — the basilisks (six-legged dracolisk kin).
// Three bodies, three designs: the FEN LURKER (long, low, keel-
// finned, gazeless), the BASILISK (the stone-hided gaze line with
// the vertebral saw), and the ELDER (a horn-crowned walking crag in
// cracked osteoderm plate). The family reads: sprawled hexapod
// carriage, a head carried LOW and forward off a thick neck, the
// yellowish underbelly of the old bestiary plates, and eyes lit
// with pale-green fire — the gaze IS the species.
// ================================================================

export interface BasiliskLook {
  /** Body base hide. */
  hide: string;
  /** The canonical yellowish underbelly + throat + jaw shovel. */
  belly: string;
  /** Osteoderm scute rows — a step BRIGHTER than the hide (the
   *  turtle mail law: darker plates read as windows). */
  plate: string;
  /** Ridge saw, brow horns, claws — raised horn, its own material. */
  horn: string;
  /** Pale-green fire. */
  eye: string;
  /** Half-width of the hull (tiles). */
  bodyW: number;
  /** Back height of the block extrusion (tiles). */
  bodyH: number;
  /** Vertebral saw height (tiles). */
  ridgeH: number;
  headW: number;
  headH: number;
  /** Head-carry height above the ground line (tiles) — LOW: the
   *  court carries its skull level with the back, never raised. */
  headRise: number;
  /** Tail sim weight dial. */
  tailHeavy: number;
  /** The fen cousin: keeled swimming fin instead of the saw. */
  fin?: boolean;
  /** The elder alone: horn crown, plate mass, lichen, barbels. */
  elder?: boolean;
  /** Elder lichen saddles. */
  moss?: string;
}

/**
 * Seeded hide clusters (the lynx law): wild basilisks scatter across
 * four stone-country coats, the fen line across three marsh coats —
 * hash BEFORE picking so consecutive eids never twin. The elder
 * never rolls: a crag has exactly one geology.
 */
const BASILISK_CLUSTERS: readonly Omit<
  BasiliskLook,
  'bodyW' | 'bodyH' | 'ridgeH' | 'headW' | 'headH' | 'headRise' | 'tailHeavy'
>[] = [
  // Greystone: the bestiary plate — dull grey-brown, pale-green fire.
  { hide: '#6b6a52', belly: '#c9bd8e', plate: '#7d7c62', horn: '#8a8567', eye: '#b9d18c' },
  // Dun: dust-country brown, the yellowish belly strongest.
  { hide: '#75684e', belly: '#d1bf8b', plate: '#87795c', horn: '#93865f', eye: '#bcd48a' },
  // Umber: dark iron-earth, horn near-bone.
  { hide: '#5e5747', belly: '#bcab7e', plate: '#6f6754', horn: '#8f8468', eye: '#b2cc85' },
  // Mossback: green-grey stone that stood too long in one wood.
  { hide: '#5c6450', belly: '#c2bb8a', plate: '#6e765e', horn: '#848b66', eye: '#c0d792' },
];
const FEN_CLUSTERS: readonly Omit<
  BasiliskLook,
  'bodyW' | 'bodyH' | 'ridgeH' | 'headW' | 'headH' | 'headRise' | 'tailHeavy'
>[] = [
  // Peat: the standing water's own olive-dark.
  { hide: '#57603f', belly: '#b9b284', plate: '#68724c', horn: '#7d7a55', eye: '#a3b578' },
  // Murk: deep bottle-green, near-black in the reeds.
  { hide: '#4b5642', belly: '#aeab7f', plate: '#5c684e', horn: '#747a58', eye: '#9cb173' },
  // Rustmarsh: iron-water brown along the keel and limbs.
  { hide: '#5f5644', belly: '#bfae7f', plate: '#6f664f', horn: '#82795a', eye: '#a8b87c' },
];

const ELDER_BASILISK_LOOK: BasiliskLook = {
  // Basalt-dark hide under pale worked plate — the crag, not a
  // bigger basilisk (the design-not-reskin law).
  hide: '#4f5548',
  belly: '#b5ad83',
  plate: '#666d58',
  horn: '#8c8465',
  eye: '#c6e392',
  moss: '#78885a',
  bodyW: 0.44,
  bodyH: 0.46,
  ridgeH: 0.24,
  headW: 0.42,
  headH: 0.26,
  headRise: 0.28,
  tailHeavy: 2.3,
  elder: true,
};

/** Resolve a basilisk body's full look from its defId + spawn seed. */
export function basiliskLook(defId: string, seed: number): BasiliskLook {
  if (defId === 'elder_basilisk') return ELDER_BASILISK_LOOK;
  if (defId === 'fen_basilisk') {
    const c = FEN_CLUSTERS[((seed * 2654435761) >>> 8) % 3]!;
    return {
      ...c,
      bodyW: 0.24,
      bodyH: 0.2,
      ridgeH: 0.09,
      headW: 0.3,
      headH: 0.15,
      headRise: 0.1,
      tailHeavy: 1.5,
      fin: true,
    };
  }
  const c = BASILISK_CLUSTERS[((seed * 2654435761) >>> 8) & 3]!;
  return {
    ...c,
    bodyW: 0.32,
    bodyH: 0.34,
    ridgeH: 0.17,
    headW: 0.33,
    headH: 0.2,
    headRise: 0.2,
    tailHeavy: 1.8,
  };
}

/**
 * THE COURT'S HULL: the basilisk body is a sprawled saurian trunk —
 * shoulder swell, a saddle over the mid-legs, the haunch swell where
 * the drivers root, tapering into neck and tail stubs the dedicated
 * painters continue. Painted as a block extrusion (the shared 2.5D
 * dialect) with the family's three reads layered INSIDE the
 * hull-clipped marks pass (the crab fixture law — nothing floats):
 * the yellowish BELLY BAND on the down-screen flank, the OSTEODERM
 * ROWS a step brighter than the hide, and — after the hull — the
 * VERTEBRAL SAW riding the crown by the ridge law.
 */
export function paintBasiliskBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: BasiliskLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const hide = shade(look.hide, (((f.seed >>> 5) & 7) - 3) * 2);
  const lift = f.bob * 0.35 * s;
  const tk = f.topScale ?? 1;

  // THE BELLY TUCKS LIKE A LION'S: the under-mass is a ground-frame
  // lens with an authored ground line — the fen keel drags a finger
  // off the mud, the elder keeps honest daylight.
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const brx = (hl * 0.7 * ax + hw * 0.85 * ay) * s;
  const bry = (hw * 0.4 * ax + hl * 0.26 * ay) * ys * s;
  const bellyClear = (look.elder ? 0.07 : look.fin ? 0.015 : 0.04) * s;
  ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.hide, -22);
  ctx.save();
  ctx.translate(bx, gy - bellyClear - lift * 0.6 - bry);
  ctx.beginPath();
  facetBlob(ctx, 0, 0, brx, f.seed | 3, 8, bry / brx, 0.5);
  ctx.fill();
  ctx.restore();

  // The footprint: long-shouldered, waist barely pinched, haunches
  // full — a trunk built to carry six roots.
  const foot: Array<[number, number]> = [
    [hl * 0.98, -hw * 0.4],
    [hl * 0.98, hw * 0.4],
    [hl * 0.62, hw * 0.86],
    [hl * 0.2, hw * 0.94],
    [-hl * 0.14, hw * 0.88],
    [-hl * 0.52, hw * 0.98],
    [-hl * 0.9, hw * 0.6],
    [-hl * 0.9, -hw * 0.6],
    [-hl * 0.52, -hw * 0.98],
    [-hl * 0.14, -hw * 0.88],
    [hl * 0.2, -hw * 0.94],
    [hl * 0.62, -hw * 0.86],
  ];
  // The topline: shoulder swell forward, saddle amidships, the
  // haunch swell aft — never a flat prism wall (the lynx lesson at
  // reptile scale). The fen runs flatter: a log's topline.
  const swellK = look.fin ? 0.12 : 0.26;
  const topH = (X: number): number => {
    const t = X / hl;
    const shoulder = Math.exp(-Math.pow((t - 0.42) / 0.42, 2));
    const haunch = Math.exp(-Math.pow((t + 0.45) / 0.4, 2));
    return Math.max(0.04, look.bodyH * (0.78 + swellK * Math.max(shoulder, haunch * 0.92) - 0.1 * Math.pow(t, 2)));
  };
  const botH = (X: number): number => {
    const t = X / hl;
    // The belly line rides clear of the ground plane between the
    // sprawled hips, sagging lowest amidships.
    return (look.fin ? 0.035 : 0.09) + 0.03 * Math.pow(t, 2);
  };

  paintBlockBody(ctx, f, foot, topH, botH, hide, (gx, gyy) => {
    // ---- THE BELLY BAND: the canonical yellowish underbelly,
    // painted along the DOWN-SCREEN flank inside the clip so it
    // hugs the hull at every band. Pure N/S facings show back or
    // chest — the band fades out with |py|.
    const bandK = Math.min(1, Math.abs(py) * 1.6);
    if (bandK > 0.05) {
      const sgn = Math.sign(py) || 1;
      ctx.fillStyle = shade(look.belly, -6);
      // A soft margin, not a beach towel: the band stays low on the
      // flank and quiet, tapering out at nose and stern.
      ctx.globalAlpha = 0.55 * bandK;
      ctx.beginPath();
      const bandY = hw * 0.94 * sgn;
      const xs = [-0.82, -0.5, -0.1, 0.3, 0.66, 0.9];
      for (let i = 0; i < xs.length; i++) {
        const X = xs[i]! * hl;
        const h = botH(X) * 0.5 * s;
        const xq = gx(X, bandY);
        const yq = gyy(X, bandY) - h - lift * 0.6;
        if (i === 0) ctx.moveTo(xq, yq);
        else ctx.lineTo(xq, yq);
      }
      for (let i = xs.length - 1; i >= 0; i--) {
        const X = xs[i]! * hl;
        // The inner edge pinches to nothing at both ends — a lens of
        // pale, widest amidships.
        const endK = 1 - Math.pow(Math.abs(xs[i]!) / 0.92, 2);
        const innerY = hw * (0.94 - 0.36 * endK) * sgn;
        const h = (botH(X) + (topH(X) - botH(X)) * 0.24 * endK) * tk * s;
        ctx.lineTo(gx(X, innerY), gyy(X, innerY) - h - lift * 0.8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ---- THE OSTEODERM ROWS: two lateral files of grown plate per
    // side riding the back's own curve — a step BRIGHTER than the
    // hide (the mail law), trapezoid-cut (grown armor, never stamped
    // tile), seams quiet. The fen wears none: its read is the keel.
    if (!look.fin) {
      const rows: Array<{ Y: number; k: number }> = look.elder
        ? [
            { Y: 0.34, k: 1 },
            { Y: -0.34, k: 1 },
            { Y: 0.66, k: 0.8 },
            { Y: -0.66, k: 0.8 },
          ]
        : [
            { Y: 0.4, k: 1 },
            { Y: -0.4, k: 1 },
          ];
      const nPlates = look.elder ? 6 : 5;
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]!;
        for (let i = 0; i < nPlates; i++) {
          const jit = (((f.seed * 31 + i * 0x9e37 + Math.round(row.Y * 100)) >>> 3) & 15) / 15;
          const jit2 = (((f.seed * 17 + i * 0x85eb + ri * 0x5f3) >>> 4) & 15) / 15;
          // Stagger alternate plates fore-aft and let each row wander
          // in Y — grown armor scatters, a grid is stamped tile.
          const X =
            (-0.62 + ((i + 0.5) / nPlates) * 1.4 + (jit - 0.5) * 0.08 + (i % 2) * 0.03) * hl;
          const Y = row.Y * hw * (0.92 + jit2 * 0.16);
          const h = (botH(X) + (topH(X) - botH(X)) * (0.94 - 0.1 * Math.abs(row.Y))) * tk * s;
          const pw = hw * (look.elder ? 0.17 : 0.13) * (0.82 + jit * 0.34) * row.k * s;
          const pl = hl * (look.elder ? 0.095 : 0.082) * (0.82 + jit2 * 0.34) * s;
          const cxp = gx(X, Y);
          const cyp = gyy(X, Y) - h - lift;
          // Trapezoid seated along the body axis: fore edge full,
          // aft edge cut (the grown-armor read), lit from the sky —
          // with a shaded aft facet carrying the relief so the seam
          // strokes can stay whisper-quiet.
          const fxs = fx * pl;
          const fys = fy * pl * ys;
          const pxs = px * pw;
          const pys = py * pw * ys;
          ctx.fillStyle = shade(look.plate, 7 + Math.round(jit * 5));
          ctx.beginPath();
          ctx.moveTo(cxp + fxs - pxs, cyp + fys - pys);
          ctx.lineTo(cxp + fxs + pxs, cyp + fys + pys);
          ctx.lineTo(cxp - fxs + pxs * 0.62, cyp - fys + pys * 0.62);
          ctx.lineTo(cxp - fxs - pxs * 0.62, cyp - fys - pys * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(look.plate, -6);
          ctx.beginPath();
          ctx.moveTo(cxp - fxs * 0.2 - pxs * 0.9, cyp - fys * 0.2 - pys * 0.9);
          ctx.lineTo(cxp - fxs * 0.2 + pxs * 0.9, cyp - fys * 0.2 + pys * 0.9);
          ctx.lineTo(cxp - fxs + pxs * 0.62, cyp - fys + pys * 0.62);
          ctx.lineTo(cxp - fxs - pxs * 0.62, cyp - fys - pys * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(26, 20, 36, 0.16)';
          ctx.lineWidth = Math.max(0.6, s * 0.007);
          ctx.stroke();
        }
      }
    } else {
      // The fen's hide read: faint diamond speckle files along the
      // flank — wet keeled leather, not plate.
      ctx.fillStyle = shade(look.hide, 9);
      for (let i = 0; i < 8; i++) {
        const jit = (((f.seed * 17 + i * 0x85eb) >>> 4) & 15) / 15;
        const X = (-0.7 + (i + 0.5) / 8 * 1.5) * hl;
        const Y = (i % 2 === 0 ? 0.38 : -0.38) * hw * (0.9 + jit * 0.2);
        const h = (botH(X) + (topH(X) - botH(X)) * 0.85) * tk * s;
        const r0 = hw * 0.07 * (0.8 + jit * 0.5) * s;
        ctx.beginPath();
        ctx.ellipse(gx(X, Y), gyy(X, Y) - h - lift, r0 * 1.5, r0 * 0.8, Math.atan2(fy * ys, fx), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ---- THE ELDER'S YEARS: crack scars and lichen saddles, cell
    // facts off the stable seed (never a facing-sorted lottery).
    if (look.elder && look.moss) {
      ctx.fillStyle = look.moss;
      ctx.globalAlpha = 0.55;
      for (const [mx, my, mr] of [
        [-0.42, 0.2, 0.16],
        [0.18, -0.28, 0.13],
        [-0.1, 0.42, 0.1],
      ] as const) {
        const X = mx * hl;
        const Y = my * hw;
        const h = (botH(X) + (topH(X) - botH(X)) * 0.9) * tk * s;
        ctx.beginPath();
        facetBlob(ctx, gx(X, Y), gyy(X, Y) - h - lift, mr * s, f.seed ^ 0x5f3, 6, 0.55, 0.4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // The crack: one old wound across the plate country.
      ctx.strokeStyle = 'rgba(24, 20, 30, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      const c0x = gx(0.34 * hl, -0.5 * hw);
      const c0y = gyy(0.34 * hl, -0.5 * hw) - (topH(0.34 * hl) * 0.9) * tk * s - lift;
      ctx.moveTo(c0x, c0y);
      ctx.lineTo(gx(0.18 * hl, -0.2 * hw), gyy(0.18 * hl, -0.2 * hw) - topH(0.18 * hl) * 0.95 * tk * s - lift);
      ctx.lineTo(gx(0.3 * hl, 0.08 * hw), gyy(0.3 * hl, 0.08 * hw) - topH(0.3 * hl) * 0.97 * tk * s - lift);
      ctx.stroke();
    }
  });

  // ---- THE VERTEBRAL SAW / THE KEEL FIN: the crown read, painted
  // OVER the hull. The ridge law: blades root on the 3D centerline,
  // so the root slides up-crown by the lateral projection — dead
  // center face-on, on the skyline side-on.
  if (f.hurt) return;
  const ridgeY = -py * hw * 0.66;
  const blades = look.fin ? 9 : look.elder ? 7 : 6;
  const items: Array<{ X: number; y0: number; x0: number; h: number; w: number }> = [];
  for (let i = 0; i < blades; i++) {
    const t = -0.78 + ((i + 0.5) / blades) * 1.62;
    const X = t * hl;
    const jit = (((f.seed * 13 + i * 0x9e37) >>> 5) & 15) / 15;
    // Tallest amidships, stepping down to neck and stern.
    const bandK = 1 - 0.5 * Math.pow(Math.abs(t + 0.06) / 0.84, 2);
    const h = look.ridgeH * (0.7 + 0.3 * jit) * bandK * s;
    const w = (look.fin ? 0.16 : look.elder ? 0.13 : 0.11) * hl * s * (0.9 + 0.2 * jit);
    const x0 = bx + (fx * X + px * ridgeY) * s;
    const y0 =
      gy + (fy * X + py * ridgeY) * ys * s - topH(X) * tk * s - lift + ridgeY * s * f.roll * 0.4;
    items.push({ X, y0, x0, h, w });
  }
  // Far-to-near by screen y so raked blades imbricate honestly.
  items.sort((a, b) => a.y0 - b.y0);
  for (const it of items) {
    const rake = fx * it.w * (look.fin ? 0.5 : 0.72);
    const rakeY = fy * it.w * 0.4 * ys;
    if (look.fin) {
      // The keel: low connected fin waves — a swimmer's tail speaking
      // all the way up the spine, never a saw.
      ctx.fillStyle = shade(look.horn, -4);
      ctx.beginPath();
      ctx.moveTo(it.x0 - it.w * 0.6, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 - it.w * 0.1 - rake * 0.3, it.y0 - it.h, it.x0 + it.w * 0.5 - rake, it.y0 - it.h * 0.7 - rakeY);
      ctx.quadraticCurveTo(it.x0 + it.w * 0.5, it.y0 - it.h * 0.2, it.x0 + it.w * 0.6, it.y0 + 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // The saw blade: a 2-facet horn bowed aft — lit fore facet,
      // shadowed aft, partial BROKEN INK on the shadow edge only.
      const tipX = it.x0 - rake;
      const tipY = it.y0 - it.h - rakeY;
      ctx.fillStyle = shade(look.horn, 8);
      ctx.beginPath();
      ctx.moveTo(it.x0 + it.w * 0.55, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 + it.w * 0.2 - rake * 0.4, it.y0 - it.h * 0.62, tipX, tipY);
      ctx.lineTo(it.x0 - it.w * 0.1, it.y0 - it.h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(look.horn, -14);
      ctx.beginPath();
      ctx.moveTo(it.x0 - it.w * 0.55, it.y0 + 0.5);
      ctx.quadraticCurveTo(it.x0 - it.w * 0.35 - rake * 0.3, it.y0 - it.h * 0.5, tipX, tipY);
      ctx.lineTo(it.x0 - it.w * 0.1, it.y0 - it.h * 0.18);
      ctx.closePath();
      ctx.fill();
      // The broken ink: one partial stroke off the tip down the
      // shadow edge — never a closed ring (the turtle ink law).
      ctx.strokeStyle = '#241a2e';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(0.8, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(
        it.x0 - it.w * 0.35 - rake * 0.3,
        it.y0 - it.h * 0.5,
        it.x0 - it.w * 0.42,
        it.y0 - it.h * 0.24,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * THE COURT'S SKULL — dragon out of crocodile: a long broad muzzle
 * that is the skull's own flesh (MOUTH IS A CUT, never a cone), the
 * grim saurian grin with interlocked teeth, raised nostril bumps on
 * the snout's top plane, a heavy brow ledge — and the species read:
 * eyes lit with pale-green fire. The basilisk wears two backswept
 * brow horns; the elder a four-point crown and chin barbels; the fen
 * keeps a low hunter's brow and nothing it doesn't need.
 */
export function drawBasiliskHead(
  ctx: CanvasRenderingContext2D,
  look: BasiliskLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    /** 0..1 jaw gape — open through the windup, clamped on the hit. */
    gape?: number;
    /** Corpse: fire out, jaw slack. */
    dead?: boolean;
    /** Which family body (horn dress + fen brow fork). */
    fen?: boolean;
  },
): void {
  const { x, y, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const hw = look.headW * s;
  const hh = look.headH * s;
  const gape = o.dead ? 0.15 : (o.gape ?? 0);
  const skin = o.hurt ? '#ffffff' : shade(look.hide, 6);
  const pk = Math.abs(fx);

  // The muzzle reaches long — a croc's proportion, not a turtle's.
  const tipR = 1.28;
  const tipX = x + fx * hw * tipR;
  const tipY = y + fy * hw * tipR * ys + hh * 0.04;
  const jawDrop = gape * hh * 0.72;
  const corner = (es: number): { x: number; y: number } => ({
    x: x + px * es * hw * 0.44 + fx * hw * 0.1,
    y: y + (py * es * hw * 0.44 + fy * hw * 0.1) * ys + hh * 0.22,
  });
  const cL = corner(-1);
  const cR = corner(1);

  // The lower jaw: one wide pale shovel corner to corner, swinging
  // down through the gape — the belly tone carried up the throat.
  ctx.fillStyle = o.hurt ? '#ffffff' : look.belly;
  ctx.beginPath();
  ctx.moveTo(cL.x, cL.y);
  ctx.lineTo(tipX - fx * hw * 0.06, tipY - fy * hw * 0.06 * ys + hh * 0.26 + jawDrop);
  ctx.lineTo(cR.x, cR.y);
  ctx.lineTo(x + fx * hw * 0.04, y + fy * hw * 0.04 * ys + hh * 0.4);
  ctx.closePath();
  ctx.fill();
  // The gape's dark room, and the LOWER teeth rising out of it —
  // the croc's interlock, absent on the closed mouth.
  if (gape > 0.12 && !o.hurt) {
    ctx.fillStyle = '#3c2a26';
    ctx.beginPath();
    ctx.moveTo(cL.x, cL.y);
    ctx.lineTo(tipX - fx * hw * 0.03, tipY - fy * hw * 0.03 * ys + hh * 0.1 + jawDrop * 0.55);
    ctx.lineTo(cR.x, cR.y);
    ctx.lineTo(x + fx * hw * 0.1, y + fy * hw * 0.1 * ys + hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.dead ? shade(look.belly, -10) : '#e8e0c4';
    for (const t of [0.3, 0.6, 0.85]) {
      const jx = x + (tipX - x) * t;
      const jy = y + (tipY - y) * t + hh * 0.2 + jawDrop * 0.7 * t;
      ctx.beginPath();
      ctx.moveTo(jx - hw * 0.03, jy + hh * 0.05);
      ctx.lineTo(jx, jy - hh * 0.14);
      ctx.lineTo(jx + hw * 0.03, jy + hh * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  // THE SKULL: heavy cranium mass with a lit crown plane.
  ctx.fillStyle = skin;
  ctx.beginPath();
  facetCircle(ctx, x, y, hw * 0.58, 7, Math.atan2(fy * ys, fx));
  ctx.fill();
  if (!o.hurt) {
    ctx.fillStyle = shade(look.hide, 14);
    ctx.beginPath();
    facetCircle(ctx, x - fx * hw * 0.04, y - fy * hw * 0.04 * ys - hh * 0.2, hw * 0.36, 6, 1.1);
    ctx.fill();
  }

  // THE MUZZLE: one mass with the cranium, long and broad, walls
  // pinching slightly ahead of the eyes then flaring at the nose —
  // the croc's spatulate snout in the flat dialect.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x - px * hw * 0.44 + fx * hw * 0.1, y + (-py * hw * 0.44 + fy * hw * 0.1) * ys - hh * 0.14);
  ctx.lineTo(x - px * hw * 0.3 + fx * hw * 0.72, y + (-py * hw * 0.3 + fy * hw * 0.72) * ys - hh * 0.12);
  ctx.lineTo(tipX - px * hw * 0.26, tipY - py * hw * 0.26 * ys - hh * 0.1);
  ctx.lineTo(tipX, tipY + hh * 0.1);
  ctx.lineTo(tipX + px * hw * 0.26, tipY + py * hw * 0.26 * ys - hh * 0.1);
  ctx.lineTo(x + px * hw * 0.3 + fx * hw * 0.72, y + (py * hw * 0.3 + fy * hw * 0.72) * ys - hh * 0.12);
  ctx.lineTo(x + px * hw * 0.44 + fx * hw * 0.1, y + (py * hw * 0.44 + fy * hw * 0.1) * ys - hh * 0.14);
  ctx.lineTo(x + fx * hw * 0.06, y + fy * hw * 0.06 * ys + hh * 0.2);
  ctx.closePath();
  ctx.fill();
  if (!o.hurt) {
    // The muzzle's lit top plane, running snout to brow.
    ctx.fillStyle = shade(look.hide, 12);
    ctx.beginPath();
    ctx.moveTo(x - px * hw * 0.24 + fx * hw * 0.2, y + (-py * hw * 0.24 + fy * hw * 0.2) * ys - hh * 0.2);
    ctx.lineTo(tipX - px * hw * 0.13, tipY - py * hw * 0.13 * ys - hh * 0.14);
    ctx.lineTo(tipX + px * hw * 0.13, tipY + py * hw * 0.13 * ys - hh * 0.14);
    ctx.lineTo(x + px * hw * 0.24 + fx * hw * 0.2, y + (py * hw * 0.24 + fy * hw * 0.2) * ys - hh * 0.2);
    ctx.closePath();
    ctx.fill();

    // THE CUT: the mouth line — a long sag from under the snout tip
    // back to the grim corner below the eye, with the croc's
    // interlocked TEETH ticking both ways along it. The far cheek
    // yields at profile; the open gape replaces the closed grin.
    if (gape < 0.3) {
      ctx.strokeStyle = 'rgba(30, 20, 24, 0.72)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        if (pk > 0.6 && es * py < 0) continue;
        const c = corner(es);
        const m0x = tipX + px * es * hw * 0.07;
        const m0y = tipY + py * es * hw * 0.07 * ys + hh * 0.12;
        const midXc = (m0x + c.x) / 2 + fx * hw * 0.02;
        const midYc = (m0y + c.y) / 2 + hh * 0.14;
        ctx.beginPath();
        ctx.moveTo(m0x, m0y);
        ctx.quadraticCurveTo(midXc, midYc, c.x, c.y - hh * 0.06);
        ctx.stroke();
        // Interlocked teeth: uppers hang, lowers rise, alternating
        // along the cut's own curve — the croc grin, filled wedges.
        for (let ti = 0; ti < 4; ti++) {
          const t = 0.18 + ti * 0.2;
          const u = 1 - t;
          const qx = u * u * m0x + 2 * u * t * midXc + t * t * c.x;
          const qy = u * u * m0y + 2 * u * t * midYc + t * t * (c.y - hh * 0.06);
          const up = ti % 2 === 0;
          ctx.fillStyle = up ? '#e8e0c4' : shade(look.belly, 6);
          ctx.beginPath();
          if (up) {
            ctx.moveTo(qx - hw * 0.028, qy - hh * 0.02);
            ctx.lineTo(qx, qy + hh * 0.09);
            ctx.lineTo(qx + hw * 0.028, qy - hh * 0.02);
          } else {
            ctx.moveTo(qx - hw * 0.026, qy + hh * 0.03);
            ctx.lineTo(qx, qy - hh * 0.075);
            ctx.lineTo(qx + hw * 0.026, qy + hh * 0.03);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.lineCap = 'butt';
    }

    // Nostril bumps: RAISED domes on the snout tip's top plane (the
    // croc periscope), each with its dark pit — front reads only.
    if (fy > 0.02) {
      for (const es of [-1, 1]) {
        const nx = tipX - fx * hw * 0.08 + px * es * hw * 0.1;
        const ny = tipY + (-fy * hw * 0.08 + py * es * hw * 0.1) * ys - hh * 0.14;
        ctx.fillStyle = shade(look.hide, 16);
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(0.8, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(look.hide, -26);
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(0.5, hw * 0.022), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // THE BROW LEDGE and the FIRE: heavy orbital shelves with the
    // pale-green ember under each — the gaze the bestiary promises.
    // Eye stations ride the skull ring (the sphere law): they slide
    // with facing and the far one yields past the profile.
    for (const es of [-1, 1]) {
      if (pk > 0.72 && es * py < 0) continue;
      const ex0 = x + px * es * hw * 0.4 + fx * hw * 0.34;
      const ey0 = y + (py * es * hw * 0.4 + fy * hw * 0.34) * ys - hh * 0.3;
      // The ledge.
      ctx.fillStyle = shade(look.hide, -8);
      ctx.beginPath();
      ctx.ellipse(ex0, ey0 - hh * 0.08, hw * 0.14, hh * 0.1, Math.atan2(fy * ys, fx), 0, Math.PI * 2);
      ctx.fill();
      if (!o.dead) {
        // The soft fire halo — the gaze must read at gameplay zoom.
        ctx.fillStyle = look.eye;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(ex0, ey0, hw * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // The ember itself.
        ctx.beginPath();
        ctx.arc(ex0, ey0, Math.max(1.2, hw * 0.072), 0, Math.PI * 2);
        ctx.fill();
        // The slit pupil, close-up only.
        if (s > 110) {
          ctx.strokeStyle = 'rgba(20, 24, 14, 0.85)';
          ctx.lineWidth = Math.max(0.6, hw * 0.02);
          ctx.beginPath();
          ctx.moveTo(ex0, ey0 - hw * 0.05);
          ctx.lineTo(ex0, ey0 + hw * 0.05);
          ctx.stroke();
        }
      } else {
        // Dead: the fire is out — a dull chip where it lived.
        ctx.fillStyle = shade(look.hide, -18);
        ctx.beginPath();
        ctx.arc(ex0, ey0, Math.max(1, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // THE HORN DRESS: the family fork. Basilisk — two backswept brow
    // horns; elder — the four-point crown plus chin barbels; fen —
    // a low brow ridge line only (the lurker carries no crown).
    if (!o.fen) {
      const horns: Array<{ es: number; back: number; len: number }> = look.elder
        ? [
            { es: -1, back: 0.5, len: 0.34 },
            { es: 1, back: 0.5, len: 0.34 },
            { es: -1, back: 0.14, len: 0.24 },
            { es: 1, back: 0.14, len: 0.24 },
          ]
        : [
            { es: -1, back: 0.4, len: 0.26 },
            { es: 1, back: 0.4, len: 0.26 },
          ];
      for (const hspec of horns) {
        const hx = x - fx * hw * hspec.back + px * hspec.es * hw * 0.34;
        const hy = y + (-fy * hw * hspec.back + py * hspec.es * hw * 0.34) * ys - hh * 0.42;
        const hl2 = hw * hspec.len;
        // Swept back and out in the BODY frame, projected.
        const dxh = -fx * 0.8 + px * hspec.es * 0.5;
        const dyh = (-fy * 0.8 + py * hspec.es * 0.5) * ys - 0.5;
        const nl = Math.hypot(dxh, dyh) || 1;
        const tx2 = hx + (dxh / nl) * hl2;
        const ty2 = hy + (dyh / nl) * hl2;
        ctx.fillStyle = shade(look.horn, 4);
        ctx.beginPath();
        ctx.moveTo(hx - px * hw * 0.05, hy - py * hw * 0.05 * ys + hh * 0.05);
        ctx.quadraticCurveTo((hx + tx2) / 2 - hw * 0.02, (hy + ty2) / 2 - hh * 0.1, tx2, ty2);
        ctx.lineTo(hx + px * hw * 0.05, hy + py * hw * 0.05 * ys + hh * 0.05);
        ctx.closePath();
        ctx.fill();
        // Partial ink off the tip (the broken-ink law).
        ctx.strokeStyle = '#241a2e';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(0.7, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.quadraticCurveTo((hx + tx2) / 2 - hw * 0.02, (hy + ty2) / 2 - hh * 0.1, hx + (tx2 - hx) * 0.3, hy + (ty2 - hy) * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (look.elder && fy > -0.2) {
        // Chin barbels: the old fisher-dragon's whiskers, front reads.
        ctx.strokeStyle = shade(look.belly, -14);
        ctx.lineWidth = Math.max(0.8, s * 0.012);
        ctx.lineCap = 'round';
        for (const es of [-1, 1]) {
          const bx0 = tipX + px * es * hw * 0.14 - fx * hw * 0.1;
          const by0 = tipY + (py * es * hw * 0.14 - fy * hw * 0.1) * ys + hh * 0.24;
          ctx.beginPath();
          ctx.moveTo(bx0, by0);
          ctx.quadraticCurveTo(bx0 + px * es * hw * 0.05, by0 + hh * 0.2, bx0 + px * es * hw * 0.12, by0 + hh * 0.3);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    } else {
      // The fen brow: one low ridge line over each orbit — a log's
      // eyebrows, nothing the reeds would notice.
      ctx.strokeStyle = shade(look.hide, -16);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const es of [-1, 1]) {
        if (pk > 0.72 && es * py < 0) continue;
        const ex0 = x + px * es * hw * 0.4 + fx * hw * 0.34;
        const ey0 = y + (py * es * hw * 0.4 + fy * hw * 0.34) * ys - hh * 0.4;
        ctx.beginPath();
        ctx.moveTo(ex0 - fx * hw * 0.12 - px * es * hw * 0.04, ey0);
        ctx.quadraticCurveTo(ex0, ey0 - hh * 0.06, ex0 + fx * hw * 0.14, ey0 + hh * 0.02);
        ctx.stroke();
      }
    }
  }
}

/**
 * THE OOZE FAMILY (docs/ooze-family-plan.md) — THE SLIME SHAPE LAW,
 * final form (user verdict 2026-08-15, round three): the family owns
 * exactly TWO silhouettes — the HOPPER (the chamfered gel block that
 * carries the whole brand) and the CUBE (the corridor prism). Every
 * other body plan is dead. Variety lives in the DRESS: bespoke
 * material dressings on the hopper — verdant gel, stone-gray grit,
 * frost rime and shards, dripping tar — never a naked palette swap.
 * And A SLIME ATTACKS WITH ITS BODY: the strike is a crouch, a leap,
 * and a flat-out landing slam — no pseudopods, no punches, ever.
 */
export type OozePlan = 'hopper' | 'cube';

/** The material a hopper is made of — each dress is its own kit of
 *  inclusions, sheen, and weather, painted bespoke inside the gel. */
export type OozeDress = 'verdant' | 'stone' | 'frost' | 'tar';

export interface OozeLook {
  plan: OozePlan;
  /** Landmark hoppers carry swallowed pebbles and a second gloss. */
  giant: boolean;
  dress: OozeDress;
}

const OOZE_LOOKS: Record<string, OozeLook> = {
  slime: { plan: 'hopper', giant: false, dress: 'verdant' },
  slime_small: { plan: 'hopper', giant: false, dress: 'verdant' },
  giant_slime: { plan: 'hopper', giant: true, dress: 'verdant' },
  gray_ooze: { plan: 'hopper', giant: false, dress: 'stone' },
  frost_slime: { plan: 'hopper', giant: false, dress: 'frost' },
  tar_slime: { plan: 'hopper', giant: false, dress: 'tar' },
  gelatinous_cube: { plan: 'cube', giant: true, dress: 'verdant' },
};

/** The family register, painter-side: routing + the no-corpse law. */
export function oozeLook(defId: string): OozeLook | undefined {
  return OOZE_LOOKS[defId];
}

export interface OozeOpts {
  x: number;
  y: number;
  s: number;
  dir: number;
  radius: number;
  color: string;
  hurt: boolean;
  walkPhase: number;
  nowMs: number;
  seed: number;
  /** 0..1 how much the body is actually travelling — stills the cycle. */
  moveK: number;
  attackT?: number;
  ys: number;
}

/**
 * Sprite-cache extents in TILES — the hopper buys HEADROOM for the
 * strike leap (a body cropped mid-jump is the cache's oldest sin),
 * the cube buys room for its surge.
 */
export function oozeExtents(
  look: OozeLook,
  radius: number,
): { halfW: number; top: number; bottom: number } {
  if (look.plan === 'cube') {
    return { halfW: radius * 1.6 + 0.5, top: radius * 2.5 + 0.3, bottom: 0.45 };
  }
  return { halfW: radius * 2.2 + 0.35, top: radius * 3.0 + 0.85, bottom: 0.4 };
}

/**
 * The cube's strike clock: gather (0..0.7), then the forward surge
 * (0.7..1) — a wall deciding to include you. (The hopper's jump-slam
 * runs its own three-beat curve inside the painter.)
 */
function oozeStrike(at: number): { gath: number; spr: number } {
  if (at <= 0) return { gath: 0, spr: 0 };
  if (at < 0.7) return { gath: at / 0.7, spr: 0 };
  const k = Math.min(1, (at - 0.7) / 0.3);
  return { gath: 1 - k, spr: Math.sin(Math.PI * k) };
}

/** One ooze, routed by its body plan. */
export function drawOoze(ctx: CanvasRenderingContext2D, look: OozeLook, o: OozeOpts): void {
  if (look.plan === 'cube') drawOozeCube(ctx, o);
  else drawOozeHopper(ctx, o, look);
}

const OOZE_INK = 'rgba(26, 20, 36, 0.4)';

/**
 * THE HOPPER: the brand — a gel block in the wall-prism dialect that
 * squashes on landing, stretches mid-hop, breathes at rest, and RINGS
 * a damped beat just after touchdown. THE JUMP-SLAM is the only
 * strike a slime knows: crouch low and wide, LEAP (the server's
 * pounce carries the ground, the painter carries the air), and come
 * down FLAT on what it hit. The dress is the variant: verdant gel,
 * stone grit, frost rime, falling tar — each painted bespoke inside
 * the mass, and the giant carries its swallowed history on top.
 */
function drawOozeHopper(ctx: CanvasRenderingContext2D, o: OozeOpts, look: OozeLook): void {
  const s = o.s;
  const t = o.nowMs * 0.001;
  const giant = look.giant;
  const dress = look.dress;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const w = o.radius * 2.1 * s;
  const h = o.radius * 1.7 * s;
  const hsh = (o.seed * 2654435761) >>> 8;

  // Hop cycle from travelled distance; landing squash → launch stretch.
  const hp = (o.walkPhase * 1.35) % 1;
  const lift = Math.max(0, Math.sin(Math.PI * hp)) * 0.2 * s * o.moveK;
  let sqy = 1 + (Math.sin(Math.PI * 2 * hp) * 0.14 - 0.02) * o.moveK;
  // The landing rings: a damped jiggle dies out as the next hop loads.
  sqy += Math.sin(hp * 26) * Math.exp(-hp * 9) * 0.05 * o.moveK;
  // Idle breathing: the mass never quite holds still. A landmark body
  // breathes SLOWER — bulk reads in the clock, not just the box.
  sqy += Math.sin(o.nowMs * (giant ? 0.0021 : 0.0032) + o.seed) * 0.045 * (1 - o.moveK);
  let sqx = 2 - sqy; // area-preserving squash

  // THE JUMP-SLAM: crouch (0..0.4), leap (0.4..0.78), slam (0.78..1).
  // One analytic curve — no pseudopods, no punches: the body IS the
  // weapon, and the landing is the hit.
  const at = o.attackT ?? 0;
  let bx = o.x;
  let by = o.y - lift;
  if (at > 0) {
    if (at < 0.4) {
      // The crouch loads: low, wide, unmistakable.
      const k = at / 0.4;
      sqx += k * 0.3;
      sqy -= k * 0.24;
    } else if (at < 0.78) {
      // The leap: airborne stretch along the arc's rise and fall —
      // taller, but still unmistakably the block (over-narrowing
      // reads as a pill, and a slime is never a pill).
      const k = (at - 0.4) / 0.38;
      const arc = Math.sin(Math.PI * k);
      by -= arc * (0.5 + o.radius * 0.6) * s;
      sqy += arc * 0.24;
      sqx -= arc * 0.18;
      bx += fx * k * 0.16 * s;
      by += fy * k * 0.05 * s;
    } else {
      // The slam: flat-out on impact, then the gel remembers its shape.
      const k = Math.min(1, (at - 0.78) / 0.22);
      const imp = Math.sin(Math.PI * k);
      sqy -= imp * 0.32;
      sqx += imp * 0.38;
    }
  }

  const bw = w * sqx;
  const bh = h * sqy;
  const cut = bw * 0.24;
  const bodyPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, bx - bw / 2, by - bh, bw, bh, [cut, cut, cut * 0.55, cut * 0.55]);
  };

  // Gel mass, then flat bands clipped inside it: dark contact base,
  // lit top slab — the block read with zero gradients.
  ctx.fillStyle = o.hurt ? '#ffffff' : o.color;
  bodyPath();
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    bodyPath();
    ctx.clip();
    ctx.fillStyle = shade(o.color, -16);
    ctx.fillRect(bx - bw / 2, by - bh * 0.24, bw, bh * 0.24);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.17)';
    ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.3);
    const drift = Math.sin(o.nowMs * 0.00045 + o.seed) * bh * 0.02;
    // The nucleus: a darker core low in the body, seeded off-center.
    // (Tar skips it — a dark heart in a near-black body is nothing.)
    if (dress !== 'tar') {
      ctx.fillStyle = shade(o.color, -30);
      ctx.beginPath();
      facetBlob(
        ctx,
        bx + ((o.seed % 7) - 3) * bw * 0.016,
        by - bh * 0.38,
        bw * 0.19,
        o.seed,
        7,
        0.85,
      );
      ctx.fill();
    }
    if (giant) {
      // Swallowed history, riding the mass: three dark pebbles and a
      // pale bone chip, each at its own seeded station, all drifting
      // on a slow internal current — suspended, never pinned.
      ctx.fillStyle = shade(o.color, -42);
      for (let k = 0; k < 3; k++) {
        const kx = bx + (((hsh >> (k * 4)) & 15) / 15 - 0.5) * bw * 0.52;
        const ky = by - bh * (0.2 + (((hsh >> (k * 4 + 2)) & 7) / 7) * 0.32) + drift * (k % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        facetCircle(ctx, kx, ky, bw * (0.035 + ((hsh >> k) & 3) * 0.008), 5, k * 1.3);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(216, 210, 192, 0.6)';
      ctx.save();
      ctx.translate(bx + bw * 0.14, by - bh * 0.55 - drift);
      ctx.rotate(0.6 + ((hsh & 7) / 7) * 0.5);
      ctx.fillRect(-bw * 0.09, -bh * 0.02, bw * 0.18, bh * 0.045);
      ctx.restore();
    }
    switch (dress) {
      case 'stone': {
        // Swallowed grit the gel never digested: angular chips hanging
        // mid-mass, denser than the giant's pebbles and duller — the
        // gray eats gravel and shines like wet slate, not like sap.
        ctx.fillStyle = shade(o.color, -34);
        for (let k = 0; k < 4; k++) {
          const kx = bx + (((hsh >> (k * 3)) & 15) / 15 - 0.5) * bw * 0.5;
          const ky = by - bh * (0.22 + (((hsh >> (k * 3 + 2)) & 7) / 7) * 0.36) + drift * (k % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          facetCircle(ctx, kx, ky, bw * (0.028 + ((hsh >> k) & 3) * 0.007), 5, k * 1.9);
          ctx.fill();
        }
        ctx.fillStyle = shade(o.color, 18);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        break;
      }
      case 'frost': {
        // Suspended ice: pale slivers adrift in the chill, and a rime
        // crust riding the crown — winter kept in a jar.
        ctx.fillStyle = 'rgba(234, 246, 252, 0.7)';
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.translate(
            bx + (((hsh >> (k * 4)) & 15) / 15 - 0.5) * bw * 0.5,
            by - bh * (0.3 + (((hsh >> (k * 3 + 1)) & 7) / 7) * 0.34) + drift * (k % 2 === 0 ? 1 : -1),
          );
          ctx.rotate(((hsh >> (k * 5)) & 31) / 31 * Math.PI);
          ctx.fillRect(-bw * 0.055, -bh * 0.011, bw * 0.11, bh * 0.022);
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(240, 250, 255, 0.5)';
        ctx.fillRect(bx - bw / 2, by - bh, bw, bh * 0.07);
        ctx.fillStyle = shade(o.color, 30);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        break;
      }
      case 'tar': {
        // The tar keeps falling off itself: beads run the face on
        // their own slow clocks and the ground drinks them — and the
        // only light it gives back is two hard chips (the shine IS
        // the material on a body this dark).
        ctx.fillStyle = shade(o.color, 34);
        for (let k = 0; k < 2; k++) {
          const dxr = (k === 0 ? -1 : 1) * bw * (0.16 + (((hsh >> (k * 3)) & 7) / 7) * 0.14);
          const startY = by - bh * (0.6 + (((hsh >> (k * 4)) & 7) / 7) * 0.2);
          const clock = (t * 0.5 + ((hsh >> (k * 5)) & 31) / 31) % 1;
          if (clock < 0.8) {
            const fall = clock * clock * (by - startY);
            ctx.beginPath();
            facetCircle(ctx, bx + dxr, startY + fall, bw * 0.03 * (1 - clock * 0.35), 5, k);
            ctx.fill();
          } else {
            const kk = (clock - 0.8) / 0.2;
            ctx.beginPath();
            facetCircle(ctx, bx + dxr, by - bh * 0.02, bw * 0.045 * (1 - kk), 5, k, 0.4);
            ctx.fill();
          }
        }
        ctx.fillStyle = shade(o.color, 72);
        ctx.fillRect(bx - bw * 0.32, by - bh * 0.8, bw * 0.11, bh * 0.08);
        ctx.fillRect(bx + bw * 0.14, by - bh * 0.6, bw * 0.05, bh * 0.11);
        break;
      }
      default: {
        // One flat gloss chip high on the lit corner (two on the
        // giant — a bigger dome catches the light twice).
        ctx.fillStyle = shade(o.color, 30);
        ctx.fillRect(bx - bw * 0.3, by - bh * 0.82, bw * 0.13, bh * 0.1);
        if (giant) ctx.fillRect(bx + bw * 0.18, by - bh * 0.88, bw * 0.08, bh * 0.07);
      }
    }
    ctx.restore();
  }
  // Eyes track the facing; none on the back of the mass. On tar the
  // ink eyes would drown — the eyes go pale instead.
  if (fy > -0.45) {
    ctx.fillStyle = dress === 'tar' ? '#cfc9dc' : OUTLINE;
    for (const es of [-1, 1]) {
      const eex = bx + fx * bw * 0.15 + es * px * bw * 0.19;
      const eey = by - bh * 0.62 + (fy * bh * 0.1 + es * py * bw * 0.19) * o.ys;
      ctx.fillRect(eex - bw * 0.035, eey - bh * 0.07, bw * 0.07, bh * 0.14);
    }
  }
  ctx.strokeStyle = OOZE_INK;
  ctx.lineWidth = 1;
  bodyPath();
  ctx.stroke();
}

/**
 * THE CUBE (gelatinous): the corridor made flesh. A translucent
 * chamfered prism — the ground reads THROUGH the gel — wearing the
 * 2.5D top-plane law (lit top slab, shaded far edge, bright front
 * arris), with everything it ever engulfed suspended inside at its
 * own depth: bones, a sword, coins. The debris IS the loot table,
 * told honestly, and it floats on a current too slow to watch. The
 * strike is a SURGE: the whole prism shoves forward — a wall deciding
 * to include you.
 */
function drawOozeCube(ctx: CanvasRenderingContext2D, o: OozeOpts): void {
  const s = o.s;
  const t = o.nowMs * 0.001;
  const { gath, spr } = oozeStrike(o.attackT ?? 0);
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const hsh = (o.seed * 2654435761) >>> 8;

  // The slide breath: far slower than a hopper — a mass this size has
  // one gear. The surge shoves the whole prism along the facing.
  const breath = 1 + Math.sin(t * 1.5 + o.seed) * 0.025 + Math.sin(o.walkPhase * Math.PI * 2) * 0.02 * o.moveK;
  const cx = o.x + fx * (spr * 0.38 - gath * 0.1) * s;
  const cy = o.y + fy * (spr * 0.38 - gath * 0.1) * s * o.ys;
  const W = o.radius * 2.0 * s * (1 + gath * 0.06 + spr * 0.05);
  const frontH = o.radius * 1.7 * s * breath * (1 - gath * 0.08);
  const topD = W * 0.34 * o.ys;
  const cut = W * 0.055;
  const body = o.hurt ? '#ffffff' : o.color;

  const frontPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, cx - W / 2, cy - frontH, W, frontH, [0, 0, cut, cut]);
  };
  const topPath = (): void => {
    ctx.beginPath();
    chamferRect(ctx, cx - W / 2, cy - frontH - topD, W, topD, [cut, cut, 0, 0]);
  };

  if (o.hurt) {
    ctx.fillStyle = body;
    frontPath();
    ctx.fill();
    topPath();
    ctx.fill();
  } else {
    // The gel: translucent — the dungeon floor reads through it.
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = o.color;
    frontPath();
    ctx.fill();
    ctx.restore();

    // The swallowed: each item at its own seeded station and DEPTH —
    // deeper is dimmer and smaller (the parallax read) — bobbing on
    // a current too slow to watch. Bones, a sword, coins: the loot
    // table, suspended.
    ctx.save();
    frontPath();
    ctx.clip();
    const station = (k: number): { x: number; y: number; d: number } => ({
      x: cx + (((hsh >> (k * 3)) & 15) / 15 - 0.5) * W * 0.66,
      y:
        cy -
        frontH * (0.22 + (((hsh >> (k * 3 + 2)) & 15) / 15) * 0.58) +
        Math.sin(t * 0.45 + k * 1.9) * frontH * 0.014,
      d: ((hsh >> (k * 2 + 1)) & 3) / 3,
    });
    // The skull: a pale chamfered block with two dark sockets.
    {
      const p = station(1);
      ctx.globalAlpha = 0.78 - p.d * 0.3;
      const r = W * (0.11 - p.d * 0.025);
      ctx.fillStyle = '#ddd6c4';
      ctx.beginPath();
      chamferRect(ctx, p.x - r, p.y - r * 0.9, r * 2, r * 1.6, r * 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(40, 32, 48, 0.85)';
      ctx.fillRect(p.x - r * 0.55, p.y - r * 0.35, r * 0.4, r * 0.45);
      ctx.fillRect(p.x + r * 0.15, p.y - r * 0.35, r * 0.4, r * 0.45);
    }
    // Two rib sticks at seeded angles.
    ctx.fillStyle = '#d2cab6';
    for (let k = 0; k < 2; k++) {
      const p = station(3 + k);
      ctx.globalAlpha = 0.7 - p.d * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((hsh >> (k * 7)) & 31) / 31 * Math.PI);
      ctx.fillRect(-W * 0.09, -W * 0.012, W * 0.18, W * 0.024);
      ctx.restore();
    }
    // The sword: blade down-angled, guard and grip — somebody's whole
    // last stand, kept.
    {
      const p = station(6);
      ctx.globalAlpha = 0.82 - p.d * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.5 + ((hsh >> 9) & 7) / 7 * 0.6);
      ctx.fillStyle = '#9aa1ad';
      ctx.fillRect(-W * 0.014, -W * 0.16, W * 0.028, W * 0.24);
      ctx.fillStyle = '#5c4a32';
      ctx.fillRect(-W * 0.05, -W * 0.19, W * 0.1, W * 0.03);
      ctx.fillRect(-W * 0.014, -W * 0.25, W * 0.028, W * 0.06);
      ctx.restore();
    }
    // Coins: a scatter of small bright discs, deepest of all.
    ctx.fillStyle = '#e8c25a';
    for (let k = 0; k < 4; k++) {
      const p = station(8 + k);
      ctx.globalAlpha = 0.6 - p.d * 0.25;
      ctx.beginPath();
      facetCircle(ctx, p.x, p.y + frontH * 0.16, W * 0.028, 6, k * 1.1, 0.7);
      ctx.fill();
    }
    // The gel between the swallowed and the eye: one pale glaze, and
    // a few suspended air beads rising slower than the patience of
    // anything watching.
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(232, 248, 244, 0.1)';
    frontPath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 252, 250, 0.35)';
    for (let k = 0; k < 3; k++) {
      const bx = cx + (((hsh >> (k * 5 + 2)) & 15) / 15 - 0.5) * W * 0.7;
      const clock = (t * 0.09 + ((hsh >> (k * 4)) & 15) / 15) % 1;
      ctx.beginPath();
      facetCircle(ctx, bx, cy - frontH * (0.1 + clock * 0.8), W * 0.014, 5, k);
      ctx.fill();
    }
    ctx.restore();

    // The top plane: the 2.5D law — lit slab, shaded far edge.
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = shade(o.color, 18);
    topPath();
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = shade(o.color, -8);
    ctx.fillRect(cx - W / 2 + cut, cy - frontH - topD, W - cut * 2, topD * 0.22);
    ctx.restore();

    // The arrises: a prism is its edges. Bright front-top edge, faint
    // bright verticals — the crisp geometry against the soft world.
    ctx.strokeStyle = shade(o.color, 46);
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx - W / 2 + cut * 0.5, cy - frontH);
    ctx.lineTo(cx + W / 2 - cut * 0.5, cy - frontH);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - W / 2, cy - frontH);
    ctx.lineTo(cx - W / 2, cy - cut);
    ctx.moveTo(cx + W / 2, cy - frontH);
    ctx.lineTo(cx + W / 2, cy - cut);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // One outline around the whole standing silhouette.
  ctx.strokeStyle = OOZE_INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  chamferRect(ctx, cx - W / 2, cy - frontH - topD, W, frontH + topD, [cut, cut, cut, cut]);
  ctx.stroke();
}

/**
 * THE TRAIL DAB: one glisten print on the ground an ooze crossed —
 * painted by the renderer's shadow pass so every body walks OVER the
 * wet. A flattened seeded facet, never a stamped circle.
 */
export function drawOozeTrailDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  color: string,
  alpha: number,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  facetBlob(ctx, x, y, r, seed, 7, 0.42, ((seed >> 3) & 7) * 0.8);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * The giant adder: a slithering tapered ribbon — the body is a sampled
 * S-wave behind the head, diamond-patterned down the spine, with a
 * raised viper head that strikes along the facing.
 */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    walkPhase: number;
    nowMs: number;
    seed: number;
    moveK: number;
    attackT?: number;
    ys: number;
  },
): void {
  const s = o.s;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const body = o.hurt ? '#ffffff' : o.color;

  // Strike: the head and fore-body pull back, then whip forward.
  let strike = 0;
  if (at > 0) {
    strike = at < 0.7 ? -0.08 * (at / 0.7) : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
  }

  const LEN = 1.3; // tiles of body behind the head
  const N = 12;
  const amp = s * (0.05 + 0.07 * o.moveK);
  const phase = o.walkPhase * Math.PI * 2 * 1.15 + Math.sin(o.nowMs * 0.0008 + o.seed) * 0.6 * (1 - o.moveK);
  const pts: Array<{ x: number; y: number; w: number }> = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const d = t * LEN * s;
    // The head holds its line; the wave grows behind the neck.
    const lat = Math.sin(phase - t * 5.2) * amp * Math.min(1, t * 3);
    // Fore-body rides the strike; rear stays planted.
    const lunge = strike * Math.max(0, 1 - t * 2.4) * s;
    const rise = Math.max(0, 0.22 - t) / 0.22 * (0.1 + at * 0.06) * s;
    pts.push({
      x: o.x - fx * d + px * lat + fx * lunge,
      y: o.y - (fy * d - py * lat - fy * lunge) * o.ys - rise,
      w: s * (0.055 * Math.sin(Math.PI * Math.pow(Math.min(1, t * 1.12), 0.7)) + 0.014 * (1 - t) + 0.004),
    });
  }
  // Ribbon body: perpendicular offsets per sample, one closed fill.
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let k = 0; k <= N; k++) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    if (k === 0) ctx.moveTo(p.x + nx * p.w, p.y + ny * p.w);
    else ctx.lineTo(p.x + nx * p.w, p.y + ny * p.w);
  }
  for (let k = N; k >= 0; k--) {
    const a = pts[Math.max(0, k - 1)]!;
    const b = pts[Math.min(N, k + 1)]!;
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-4;
    const nx = -(b.y - a.y) / dl;
    const ny = (b.x - a.x) / dl;
    const p = pts[k]!;
    ctx.lineTo(p.x - nx * p.w, p.y - ny * p.w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Dorsal diamonds march the spine — the adder's zigzag.
  if (!o.hurt) {
    ctx.fillStyle = shade(o.color, -24);
    for (let k = 1; k < N; k += 2) {
      const p = pts[k]!;
      const dw = p.w * 0.85;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - dw);
      ctx.lineTo(p.x + dw, p.y);
      ctx.lineTo(p.x, p.y + dw);
      ctx.lineTo(p.x - dw, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Viper head: a flat wedge wider than the neck, riding the rise.
  const h = pts[0]!;
  const hw = s * 0.085;
  const hl = s * 0.15;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(Math.atan2(fy * o.ys, fx));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.3, -hw);
  ctx.lineTo(hl * 0.45, -hw * 0.72);
  ctx.lineTo(hl, -hw * 0.3);
  ctx.lineTo(hl, hw * 0.3);
  ctx.lineTo(hl * 0.45, hw * 0.72);
  ctx.lineTo(-hl * 0.3, hw);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.stroke();
  // Tongue: a rare forked flick, eager through the strike.
  const flick = Math.max(0, Math.sin(o.nowMs * 0.0031 + o.seed) - 0.88) / 0.12;
  const tk = Math.max(flick, at > 0.5 ? 1 : 0);
  if (tk > 0.05 && !o.hurt) {
    ctx.strokeStyle = '#c4485a';
    ctx.lineWidth = Math.max(1, s * 0.012);
    const tl = s * 0.11 * tk;
    ctx.beginPath();
    ctx.moveTo(hl, 0);
    ctx.lineTo(hl + tl * 0.7, 0);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, -s * 0.02 * tk);
    ctx.moveTo(hl + tl * 0.7, 0);
    ctx.lineTo(hl + tl, s * 0.02 * tk);
    ctx.stroke();
  }
  ctx.restore();
  // Eyes sit on the head's sides — skipped facing away.
  if (fy > -0.45 && !o.hurt) {
    ctx.fillStyle = '#e2a63c';
    for (const es of [-1, 1]) {
      const eex = h.x + fx * hl * 0.25 + es * px * hw * 0.72;
      const eey = h.y + (fy * hl * 0.25 + es * py * hw * 0.72) * o.ys;
      ctx.fillRect(eex - s * 0.014, eey - s * 0.02, s * 0.028, s * 0.04);
    }
  }
}

/**
 * The Dawnlands courser — the first saddle beast (THE ROAD GROWS
 * SHORT). A working horse in the brutalist dialect: tall block barrel
 * held high on long hoofed legs, a strong rising neck under a fallen
 * mane, a long plain head, and its tack worn honestly — blanket, seat,
 * girth, reins looped to the pommel. Coats keyed by MOUNT def id.
 */
export interface CourserLook {
  coat: string;
  belly: string;
  mane: string;
  muzzle: string;
  /** Lower-leg tone (the socks) — becomes the spec's legColor. */
  sock: string;
  /** Tack cloth under the saddle — the owner-visible identity color. */
  blanket: string;
  leather: string;
  /** Grey coats dapple; solid coats stay plain. */
  dapple?: boolean;
  /** Mountain shag: belly fringe and a heavier mane fall (the garron). */
  shaggy?: boolean;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  neckRise: number;
}

export const COURSER_LOOKS: Record<string, CourserLook> = {
  courser_bay: {
    coat: '#7b4a2e',
    belly: '#93613f',
    mane: '#2b2018',
    muzzle: '#241a12',
    sock: '#3a2c20',
    blanket: '#7d3f3a',
    leather: '#4a3423',
    bodyW: 0.185,
    backH: 0.72,
    chestH: 0.42,
    headW: 0.27,
    headH: 0.2,
    neckRise: 0.44,
  },
};

// Leather reads one way across every coat — the tack is the constant,
// the horse is the variable.
COURSER_LOOKS.courser_grey = {
  ...COURSER_LOOKS.courser_bay!,
  coat: '#b7b3a8',
  belly: '#d0ccc2',
  mane: '#6b675f',
  muzzle: '#4e4a44',
  sock: '#8b867c',
  blanket: '#3d5a68',
  dapple: true,
};
COURSER_LOOKS.courser_dun = {
  ...COURSER_LOOKS.courser_bay!,
  coat: '#b2905e',
  belly: '#c8ad80',
  mane: '#2e241a',
  muzzle: '#33281c',
  sock: '#2e241a',
  blanket: '#5a6238',
};
// The Hoargate garron: stocky pass pony under a winter shag — smaller
// in every measure, deeper in the barrel, pine-green tack.
COURSER_LOOKS.garron_hoargate = {
  coat: '#6d5c49',
  belly: '#857462',
  mane: '#3a322a',
  muzzle: '#2c241c',
  sock: '#3a322a',
  blanket: '#4c5a45',
  leather: '#4a3423',
  shaggy: true,
  bodyW: 0.2,
  backH: 0.58,
  chestH: 0.3,
  headW: 0.24,
  headH: 0.19,
  neckRise: 0.3,
};

/**
 * Rider anchor geometry, tile units above the beast's ground point.
 * The renderer builds the rider's seat, stirrups, and pommel grip from
 * these; the tack painter draws to the same numbers — one ruler, so
 * the boot always meets the stirrup iron and the fists the pommel.
 */
export const COURSER_SADDLE = {
  seatH: 0.84,
  stirrupH: 0.36,
  stirrupSide: 0.185,
  stirrupFwd: 0.05,
  pommelFwd: 0.16,
  pommelH: 0.97,
  radius: 0.42,
};

/**
 * THE GALLOP HAS FOUR BEATS: a saddle beast's legs each own a gait
 * group, so an amble walks a true four-beat (one hoof at a time — a
 * horse never trots its walk) and full tilt rolls the beats down the
 * body instead of stamping diagonal pairs. Every mount is a FLIGHT
 * rig: past a canter the rhythm nudge staggers launches and the duty
 * factor drops under 0.5 — the aerial beat, the whole reason a gallop
 * reads as flying where a trot reads as sewing.
 */
function saddleLegs(fwd: number, side: number): LegRigConfig['legs'] {
  return [
    { fwd, side: -side, group: 0 },
    { fwd, side, group: 1 },
    { fwd: -fwd, side: -side, group: 2 },
    { fwd: -fwd, side, group: 3 },
  ];
}

/** One rig for every coat — only the sock color varies. */
export function mountSpec(mountId: string): BeastSpec {
  let spec = MOUNT_SPEC_CACHE.get(mountId);
  if (!spec && mountId.startsWith('sabercat')) {
    // The cat: long and low on springy paws, quick through the turn —
    // the wolf family's athletic grammar at riding scale.
    const catLook = SABERCAT_LOOKS[mountId] ?? SABERCAT_LOOKS.sabercat_night!;
    spec = {
      rig: {
        legs: saddleLegs(0.34, 0.14),
        legLen: 0.46,
        rise: 0.4,
        liftAmp: 0.1,
        runSpeed: 7.5,
        turnRate: 7.5,
        flight: true,
        flightEager: 0.26,
      },
      bodyLen: 0.62,
      bodyRise: 0.46,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.52,
      legW: 0.085,
      foot: 'paw',
      legColor: shade(catLook.coat, -14),
      // The cat's bones: the lynx lane's long thigh over a short hock
      // — the crouch-and-spring frame at riding scale.
      segSplit: [0.53, 0.58],
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
    return spec;
  }
  const look = COURSER_LOOKS[mountId] ?? COURSER_LOOKS.courser_bay!;
  if (!spec) {
    // The garron is the courser's rig a hand shorter and a hand
    // stockier — same gait laws, lower center, thicker bone.
    const garron = mountId.startsWith('garron');
    spec = {
      rig: {
        legs: saddleLegs(garron ? 0.32 : 0.36, garron ? 0.16 : 0.15),
        legLen: garron ? 0.42 : 0.52,
        rise: garron ? 0.37 : 0.46,
        liftAmp: garron ? 0.08 : 0.085,
        runSpeed: 6.5,
        // A horse commits to a line — statelier than a wolf's snap.
        turnRate: garron ? 6 : 5.5,
        flight: true,
        flightEager: 0.26,
      },
      bodyLen: garron ? 0.5 : 0.58,
      bodyRise: garron ? 0.44 : 0.54,
      kneeFwd: [1, 1, -1, -1],
      hipFwd: 0.9,
      hipSide: 0.5,
      legW: garron ? 0.105 : 0.09,
      foot: 'hoof',
      legColor: look.sock,
      // Horse bones: a long forearm over a short cannon in front, the
      // hock riding HIGH behind — the equine silhouette's whole lower
      // story, and what keeps the gallop's folded knees honest.
      segSplit: [0.55, 0.6],
    };
    MOUNT_SPEC_CACHE.set(mountId, spec);
  }
  return spec;
}

/**
 * Rider geometry per body — the garron seats lower than the courser.
 * Same shape as COURSER_SADDLE; the renderer picks by mount id.
 */
export function saddleFor(mountId: string): typeof COURSER_SADDLE {
  if (mountId.startsWith('sabercat')) return SABER_SADDLE;
  return mountId.startsWith('garron') ? GARRON_SADDLE : COURSER_SADDLE;
}
const GARRON_SADDLE = {
  seatH: 0.7,
  stirrupH: 0.28,
  stirrupSide: 0.19,
  stirrupFwd: 0.05,
  pommelFwd: 0.14,
  pommelH: 0.82,
  radius: 0.4,
};
// The cat is ridden LOW and close — the night-saber crouch: seat on
// the harness pad behind the shoulder rise, feet tucked high, grip on
// the strap-ring horn.
const SABER_SADDLE = {
  seatH: 0.64,
  stirrupH: 0.26,
  stirrupSide: 0.19,
  stirrupFwd: 0.02,
  pommelFwd: 0.15,
  pommelH: 0.76,
  radius: 0.42,
};
const MOUNT_SPEC_CACHE = new Map<string, BeastSpec>();

export function paintCourserBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CourserLook,
  f: BeastBlockFrame,
  saddle: typeof COURSER_SADDLE = COURSER_SADDLE,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Deep chest, level back, round croup — the working-horse barrel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.8],
    [hl, hw * 0.8],
    [hl * 0.55, hw],
    [-hl * 0.5, hw * 0.98],
    [-hl, hw * 0.7],
    [-hl, -hw * 0.7],
    [-hl * 0.5, -hw * 0.98],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // Level back with the faint wither rise at the neck end.
    (X) => look.backH + 0.035 * Math.max(0, X / hl - 0.45),
    // The chest drops deeper forward — daylight under the flank only.
    (X) => look.chestH - 0.05 * Math.max(0, X / hl - 0.2),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Mountain shag: a ragged fringe along the belly line — the
      // winter coat that makes a garron read garron beside a courser.
      if (look.shaggy && !f.hurt) {
        ctx.strokeStyle = shade(look.coat, -12);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        for (let k = 0; k < 6; k++) {
          const X = (k / 5 - 0.5) * 1.5 * hl;
          const fx0 = gx(X, 0);
          const fy0 = gyy(X, 0) - look.chestH * tk * s * 0.72 - lift;
          ctx.beginPath();
          ctx.moveTo(fx0, fy0);
          ctx.lineTo(fx0 + s * 0.012 * ((k % 3) - 1), fy0 + s * (0.07 + 0.02 * (k % 2)));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Grey coats dapple: a scatter of paler facets over the croup
      // and shoulder, seeded per body so no two greys match.
      if (look.dapple && !f.hurt) {
        ctx.fillStyle = shade(look.coat, 10);
        for (let k = 0; k < 5; k++) {
          const rr = (h: number): number =>
            ((((f.seed >>> (h % 13)) * 2654435761 + k * 97) >>> 0) % 1000) / 1000;
          const X = (rr(k) * 1.6 - 0.8) * hl;
          const Y = (rr(k + 5) * 1.4 - 0.7) * hw;
          ctx.beginPath();
          facetCircle(ctx, gx(X, Y), gyy(X, Y) - bh * 0.62 - lift, s * 0.035, 5, f.seed + k);
          ctx.fill();
        }
      }
      // ---- THE TACK, on the one ruler (COURSER_SADDLE).
      // Blanket: a cloth lozenge laid along the spine under the seat,
      // plus its hem hanging down the camera-near flank.
      const bx0 = gx(-0.16 * hl * 2, 0);
      const by0 = gyy(-0.16 * hl * 2, 0) - bh * 0.92 - lift;
      const bx1 = gx(0.4 * hl, 0);
      const by1 = gyy(0.4 * hl, 0) - bh * 0.92 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.blanket;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.19);
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx1, by1);
      ctx.stroke();
      // The hem band a half-step lower, in the cloth's shade.
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.blanket, -14);
      ctx.lineWidth = Math.max(2.5, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(bx0, by0 + s * 0.13);
      ctx.lineTo(bx1, by1 + s * 0.13);
      ctx.stroke();
      // Saddle seat: the leather lozenge riding the blanket, shorter,
      // with the girth strap dropping to the belly line at its middle.
      const sx0 = gx(-0.05 * hl * 2, 0);
      const sy0 = gyy(-0.05 * hl * 2, 0) - bh * 1.0 - lift;
      const sx1 = gx(0.3 * hl, 0);
      const sy1 = gyy(0.3 * hl, 0) - bh * 1.0 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
      ctx.lineWidth = Math.max(3, s * 0.13);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
      // Cantle and pommel: the seat's two rises, pommel forward.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 12);
      ctx.beginPath();
      facetCircle(ctx, sx1, sy1 - s * 0.045, s * 0.045, 5, f.seed ^ 0x11);
      ctx.fill();
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 4);
      ctx.beginPath();
      facetCircle(ctx, sx0, sy0 - s * 0.03, s * 0.038, 5, f.seed ^ 0x2f);
      ctx.fill();
      // Girth: down the visible flank to the belly, mid-seat.
      const gxm = gx(0.12 * hl, 0);
      const gym = gyy(0.12 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -10);
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(gxm, gym - bh * 0.94 - lift);
      ctx.lineTo(gxm, gym - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // Stirrup leather: seat edge down the near flank to the iron,
      // on the same ruler the rider's boot lands on — a hung boot
      // with no strap is a floating boot. Side-on bands only; dead
      // ahead the legs own that column.
      if (Math.abs(f.fx) > 0.25) {
        const stx = gx(0.04 * hl, 0);
        const sty = gyy(0.04 * hl, 0);
        const ironY = sty - saddle.stirrupH * tk * s - lift;
        ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(stx, sty - bh * 0.98 - lift);
        ctx.lineTo(stx + f.fx * s * 0.02, ironY);
        ctx.stroke();
        ctx.strokeStyle = f.hurt ? '#ffffff' : '#55545c';
        ctx.lineWidth = Math.max(1.5, s * 0.025);
        ctx.beginPath();
        ctx.arc(stx + f.fx * s * 0.02, ironY + s * 0.022, s * 0.028, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
  );
}

/**
 * The courser's head: a long plain skull with pricked ears, the
 * muzzle running well past the cheek to a soft dark nose — the length
 * is what separates horse from deer at a glance. The forelock falls
 * between the ears in the mane's color.
 */
export function drawCourserHead(
  ctx: CanvasRenderingContext2D,
  look: CourserLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Pricked ears, tighter and shorter than any deer's leaf.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.05) * ys - h * 0.42;
    const tx = bxr + px * es * w * 0.14;
    const ty = byr - h * 0.52;
    ctx.fillStyle = C(shade(look.coat, -8));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.09, byr + h * 0.06);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.11, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // The forelock: mane falling between the ears onto the brow.
  ctx.strokeStyle = C(look.mane);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, w * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - fx * w * 0.1, cy - fy * w * 0.1 * ys - h * 0.5);
  ctx.lineTo(cx + fx * w * 0.12, cy + fy * w * 0.12 * ys - h * 0.16);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Long chamfered skull.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.26, w * 0.26]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.24);
    ctx.restore();
  }

  // The long muzzle: the horse's whole argument. Runs a full head
  // farther than the deer's taper, square-ended, nose soft and dark.
  if (fy > -0.35) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.1;
    const sl = w * (0.34 + 0.3 * profileK);
    const tx = bx0 + fx * sl;
    // The head axis BREAKS DOWN off the poll — seen side-on the nose
    // line falls near 45 degrees; head-on it stays a hung drop. This
    // angle is the whole difference between a horse and a llama.
    const ty = by0 + fy * sl * ys + h * (0.16 + 0.62 * profileK);
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    // The jaw DEEPENS at the cheek side-on (never narrows) and tapers
    // to a squared nose — the working head, not a stuffed sock.
    const hb = w * (0.19 + 0.055 * profileK);
    const ht = hb * 0.62;
    ctx.fillStyle = C(shade(look.coat, 4));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Soft nose block, plus the bit line where the rein meets.
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.03, ty - (ayv / al) * w * 0.03, w * 0.085, 5, fx);
    ctx.fill();
  }

  // Calm dark eyes, wide-set.
  if (fy > -0.45 && !o.hurt) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.06 + px * es * w * 0.32;
      const ey = cy + (fy * w * 0.06 + py * es * w * 0.32) * ys - h * 0.1;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(ex - s * 0.014, ey - s * 0.018, s * 0.028, s * 0.036);
    }
  }
}

/**
 * The night sabercat — the prestige saddle beast (THE ROAD GROWS
 * SHORT Phase 5). A cat is not a horse and is not painted like one:
 * low-slung length, shoulder blades riding ABOVE the spine line, a
 * deep waist tuck, flank stripes, a round skull with a short broad
 * muzzle, and the two ivory sabers that name it. It wears a HARNESS,
 * not a saddle: strap ring at the shoulders, low seat pad, breast
 * band. Ridden low — the seat sits where the cat's back actually is.
 */
export interface SabercatLook {
  coat: string;
  /** Flank banding — the saber stripe read. */
  stripe: string;
  under: string;
  earIn: string;
  eye: string;
  fang: string;
  /** Harness leather (the tack constant) and the seat pad's cloth. */
  leather: string;
  pad: string;
  bodyW: number;
  backH: number;
  /** The feline shoulder rise — blades above the spine at the walk. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
}

export const SABERCAT_LOOKS: Record<string, SabercatLook> = {
  sabercat_night: {
    coat: '#4a4f63',
    stripe: '#343849',
    under: '#9aa0b5',
    earIn: '#2c2938',
    eye: '#c9d97a',
    fang: '#efe9da',
    leather: '#4a3423',
    pad: '#5d3550',
    bodyW: 0.19,
    backH: 0.5,
    shoulderH: 0.11,
    chestH: 0.24,
    tuckH: 0.34,
    headW: 0.3,
    headH: 0.24,
  },
};

export function paintSabercatBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: SabercatLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Longer than the wolf's wedge, rump fuller — a cat is carried
  // between its shoulders and its haunches, not on a chest keel.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.78],
    [hl, hw * 0.78],
    [hl * 0.55, hw],
    [-hl * 0.4, hw * 0.96],
    [-hl, hw * 0.74],
    [-hl, -hw * 0.74],
    [-hl * 0.4, -hw * 0.96],
    [hl * 0.55, -hw],
  ];
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // The feline topline: shoulder rise forward, a shallow dip, the
    // haunch swelling again over the rear legs.
    (X) =>
      look.backH +
      Math.max(0, X / hl - 0.15) * look.shoulderH -
      0.03 * Math.max(0, 1 - Math.abs(X / hl + 0.1) / 0.5) +
      0.05 * Math.max(0, -X / hl - 0.45),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.55 - X / hl) / 1.1)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // Flank stripes: dark bands raking down-back from the spine to
      // mid-flank, seeded per body — the saber tiger's name written
      // on it. Length, rake, weight, and seat all jitter off the
      // seed: five identical ticks in a row read as a picket fence,
      // never a coat (the anti-rubber-stamp law).
      if (!f.hurt) {
        ctx.strokeStyle = shade(look.stripe, -8);
        ctx.lineCap = 'round';
        const nS = 4 + ((f.seed >>> 3) & 1);
        for (let k = 0; k < nS; k++) {
          const rr = ((((f.seed >>> (k % 11)) * 2654435761 + k * 131) >>> 0) % 1000) / 1000;
          const rq = ((((f.seed >>> ((k + 4) % 13)) * 2246822519 + k * 97) >>> 0) % 1000) / 1000;
          const X = (-0.7 + (1.34 * (k + 0.5)) / nS + (rr - 0.5) * 0.2) * hl;
          const sx0 = gx(X, 0);
          const sy0 = gyy(X, 0) - bh * (0.97 - 0.07 * rq) - lift;
          const len = s * (0.15 + 0.11 * rq);
          const rake = f.fx * s * (0.09 + 0.07 * rr);
          ctx.lineWidth = Math.max(1.6, s * (0.046 - 0.01 * rr));
          ctx.beginPath();
          ctx.moveTo(sx0, sy0);
          ctx.quadraticCurveTo(sx0 - rake * 0.45, sy0 + len * 0.55, sx0 - rake, sy0 + len);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // Pale bib at the chest (the wolf's law: only while the chest
      // can face the camera). Sized a ruff, not a boulder — at the
      // quarter bands the old 0.78 blob out-massed the skull beside
      // it and read as a dewlap sack — and gated to the true front
      // bands: at profile the chest is edge-on, and the old −0.15
      // gate pasted the bib on the shoulder like a patch of daylight.
      if (f.fy > 0.08 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.86, 0),
          gyy(hl * 0.86, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.62,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
      // ---- THE HARNESS (SABER_SADDLE ruler): a low seat pad between
      // the shoulder rise and the haunch, shoulder strap ring forward,
      // breast band dropping at the chest line. No blanket, no cantle:
      // a cat is ridden close.
      const px0 = gx(-0.04 * hl * 2, 0);
      const py0 = gyy(-0.04 * hl * 2, 0) - bh * 0.98 - lift;
      const px1 = gx(0.26 * hl, 0);
      const py1 = gyy(0.26 * hl, 0) - bh * 0.98 - lift;
      ctx.strokeStyle = f.hurt ? '#ffffff' : look.pad;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, s * 0.11);
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      // The strap ring at the shoulders and its girth line.
      const rgx = gx(0.34 * hl, 0);
      const rgy = gyy(0.34 * hl, 0);
      ctx.strokeStyle = f.hurt ? '#ffffff' : shade(look.leather, -8);
      ctx.lineWidth = Math.max(1.8, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(rgx, rgy - bh * 1.02 - lift);
      ctx.lineTo(rgx, rgy - look.chestH * tk * s * 0.5 - lift);
      ctx.stroke();
      // The breast band: girth to chest front along the near flank —
      // the strap that says harness-broken, not saddle-broken. Side
      // bands only; dead ahead the bib owns that column.
      if (Math.abs(f.fx) > 0.25) {
        const bbx = gx(hl * 0.9, 0);
        const bby = gyy(hl * 0.9, 0) - look.chestH * tk * s * 0.86 - lift;
        const bmy = rgy - bh * 0.62 - lift;
        ctx.strokeStyle = f.hurt ? '#ffffff' : look.leather;
        ctx.lineWidth = Math.max(1.6, s * 0.036);
        ctx.beginPath();
        ctx.moveTo(rgx, bmy);
        ctx.quadraticCurveTo((rgx + bbx) / 2, (bmy + bby) / 2 + s * 0.035, bbx, bby);
        ctx.stroke();
      }
      // The pommel horn on the strap ring — the rider's grip point,
      // on the same ruler the hands settle to.
      ctx.fillStyle = f.hurt ? '#ffffff' : shade(look.leather, 10);
      ctx.beginPath();
      facetCircle(ctx, px1, py1 - s * 0.035, s * 0.04, 5, f.seed ^ 0x59);
      ctx.fill();
      ctx.lineCap = 'butt';
    },
  );
}

/**
 * The sabercat head: a round skull where the wolf carries a slab, a
 * short broad muzzle where the wolf runs a spike, blunt round-backed
 * ears, pale-gold eyes, and the two ivory sabers dropping past the
 * jaw — visible at every facing the muzzle is, because they ARE the
 * animal.
 */
export function drawSabercatHead(
  ctx: CanvasRenderingContext2D,
  look: SabercatLook,
  o: { x: number; y: number; s: number; fx: number; fy: number; ys: number; hurt?: boolean; dead?: boolean },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Blunt round-backed ears, set wide and low.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.08;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.08) * ys - h * 0.34;
    const tx = bxr + px * es * w * 0.12;
    const ty = byr - h * 0.5;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.15, byr + h * 0.04);
    ctx.quadraticCurveTo(tx - px * es * w * 0.02, ty, tx + px * es * w * 0.1, byr - h * 0.1);
    ctx.lineTo(bxr + px * es * w * 0.16, byr + h * 0.1);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.04, byr);
      ctx.lineTo(bxr + (tx - bxr) * 0.55, byr + (ty - byr) * 0.55);
      ctx.lineTo(bxr + px * es * w * 0.09, byr + h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Round skull: deeper chamfers than any canid — the cat's circle.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
  }

  // Short broad muzzle + THE SABERS. The muzzle barely leaves the
  // skull (the feline read); the fangs drop from its leading corners,
  // splayed a whisker outward, ivory over everything.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.12;
    const sl = w * (0.14 + 0.12 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.06;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.2 * (1 - profileK * 0.15);
    const ht = hb * 0.85;
    ctx.fillStyle = C(shade(look.coat, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // Dark nose leather at the muzzle tip.
    ctx.fillStyle = C(look.earIn);
    ctx.beginPath();
    facetCircle(ctx, tx, ty - h * 0.04, w * 0.06, 5, fx);
    ctx.fill();
    // The sabers: two tapered ivory drops off the muzzle corners.
    if (!o.hurt) {
      ctx.fillStyle = look.fang;
      for (const es of [-1, 1]) {
        // At full profile the far saber hides behind the near one.
        if (Math.abs(fx) > 0.75 && es * py < 0) continue;
        const fx0 = tx + nx * es * ht * 0.72;
        const fy0 = ty + ny * es * ht * 0.72 + h * 0.06;
        const drop = h * 0.52;
        ctx.beginPath();
        ctx.moveTo(fx0 - w * 0.035, fy0);
        ctx.lineTo(fx0 + w * 0.035, fy0);
        ctx.lineTo(fx0 + px * es * w * 0.03 + fx * w * 0.02, fy0 + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The eyes: pale gold-green, set wide, unblinking.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.08 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.08 + py * es * w * 0.3) * ys - h * 0.12;
      ctx.fillStyle = o.hurt ? '#ffffff' : look.eye;
      ctx.fillRect(ex - s * 0.016, ey - s * 0.014, s * 0.032, s * 0.028);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(ex - s * 0.005, ey - s * 0.012, s * 0.01, s * 0.024);
      }
    }
  }
}

/**
 * The lynx: the tufted shadow of the deep wood, designed around FOUR
 * reads no other beast owns — black EAR TUFTS spiking off triangular
 * ears, the pale facial RUFF framing the face in fur chops, a
 * black-tipped BOBTAIL perched high, and a RUMP-HIGH topline on legs
 * longer than a wolf's (the cat's mass sits over its haunches, the
 * inverse of the wolf's shoulder keel). Rosette spots write the coat.
 */
export interface LynxLook {
  coat: string;
  /** Rosette ink — the spots that name the cat. */
  rosette: string;
  under: string;
  /** Dark streaks seaming the pale ruff chops. */
  ruffDark: string;
  earIn: string;
  /** Ear-tuft and tail-tip ink. Tufts are STROKES (the fur-dialect law). */
  tuft: string;
  eye: string;
  /** Nose-leather ink — the downward triangle every cat face carries. */
  nose: string;
  bodyW: number;
  backH: number;
  /** The cat carries its mass BEHIND: extra height ramped over the haunches. */
  haunchH: number;
  /** A modest shoulder rise — always below the haunch line. */
  shoulderH: number;
  chestH: number;
  tuckH: number;
  headW: number;
  headH: number;
  /**
   * The duskruff dresses further: the storm mantle, silver grizzle,
   * and the old scar rake. Champions never roll a cluster — the
   * duskruff is a DESIGN (the packlord law).
   */
  champion?: boolean;
  grizzle?: string;
  scar?: string;
  seed?: number;
}

export const LYNX_LOOKS: Record<string, LynxLook> = {
  lynx: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.15,
    backH: 0.47,
    haunchH: 0.12,
    shoulderH: 0.045,
    chestH: 0.24,
    tuckH: 0.35,
    headW: 0.27,
    headH: 0.225,
  },
  // The year's litter: the head and paws lead the body — cub
  // proportions, rolled into the same coat clusters as the tribe.
  lynx_young: {
    coat: '#9c7f55',
    rosette: '#5d4a33',
    under: '#d8cdb4',
    ruffDark: '#4a3c2c',
    earIn: '#3d3226',
    tuft: '#332e2a',
    eye: '#cfd97a',
    nose: '#7a4448',
    bodyW: 0.125,
    backH: 0.39,
    haunchH: 0.1,
    shoulderH: 0.035,
    chestH: 0.19,
    tuckH: 0.29,
    headW: 0.25,
    headH: 0.21,
  },
  // The duskruff: storm-slate where the pack runs tawny, and marked in
  // SILVER rosettes — the inverse of the pack's dark spots, the way
  // the dire wolf's brush ends pale where the pack's ends dark. Her
  // ONE silhouette element is THE GREAT RUFF: a storm collar of
  // layered fur chops no lean lynx carries.
  lynx_champion: {
    coat: '#565064',
    rosette: '#8d8a9c',
    under: '#9d99a8',
    ruffDark: '#3a3546',
    earIn: '#322d3c',
    tuft: '#332e3a',
    eye: '#ffd24d',
    nose: '#403a4c',
    bodyW: 0.2,
    backH: 0.58,
    haunchH: 0.17,
    shoulderH: 0.06,
    chestH: 0.27,
    tuckH: 0.42,
    headW: 0.34,
    headH: 0.27,
    champion: true,
    grizzle: '#8f8c9e',
    scar: '#8a8494',
  },
};

/**
 * THE COAT CLUSTERS (the gnoll law, spoken feline): four curated wild
 * colorways a spawned tribe spreads across — never a random hue roll,
 * always one of the four coats the wood actually breeds.
 */
const LYNX_CLUSTERS: ReadonlyArray<Pick<LynxLook, 'coat' | 'under' | 'rosette' | 'ruffDark'>> = [
  // Dun — the common tawny.
  { coat: '#9c7f55', under: '#d8cdb4', rosette: '#5d4a33', ruffDark: '#4a3c2c' },
  // Ash — the grey shade of the old burns.
  { coat: '#8a8a80', under: '#cfcabb', rosette: '#54514a', ruffDark: '#45423c' },
  // Rufous — the red cats of the bracken slopes.
  { coat: '#a4744a', under: '#d9c4a4', rosette: '#66452c', ruffDark: '#523823' },
  // Frost — the pale winter-born.
  { coat: '#b0a98f', under: '#e2dcc8', rosette: '#6a5f4c', ruffDark: '#57503f' },
];

const LYNX_LOOK_CACHE = new Map<string, LynxLook>();

export function lynxLook(defId: string, seed = 0): LynxLook {
  const base = LYNX_LOOKS[defId] ?? LYNX_LOOKS['lynx']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = LYNX_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: LynxLook;
  if (defId === 'lynx' || defId === 'lynx_young') {
    // Hash the seed before picking: knot members spawn with
    // CONSECUTIVE eids, and raw high bits would dress a whole tribe
    // in one coat — the hash spreads a spawned ambush across the
    // clusters (the gnoll lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = LYNX_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      coat: shade(cl.coat, jit),
      under: cl.under,
      rosette: shade(cl.rosette, jit),
      ruffDark: cl.ruffDark,
      seed,
    };
  } else {
    // The duskruff holds her authored design.
    look = { ...base, seed };
  }
  LYNX_LOOK_CACHE.set(key, look);
  return look;
}

export function paintLynxBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: LynxLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // The cat's wedge runs BACKWARD: the rump carries the width and the
  // chest tapers — the inverse of the wolf's chest keel, and the
  // second thing (after the topline) that says feline at world zoom.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.74],
    [hl, hw * 0.74],
    [hl * 0.5, hw * 0.92],
    [-hl * 0.35, hw],
    [-hl, hw * 0.8],
    [-hl, -hw * 0.8],
    [-hl * 0.35, -hw],
    [hl * 0.5, -hw * 0.92],
  ];
  // Tribe variance: each cat's coat sits a step off the cluster tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // THE RUMP-HIGH TOPLINE: a modest shoulder rise forward, a shallow
    // spine dip, then the haunches SWELL PAST the shoulder line — the
    // coiled-spring rear that fires the pounce. At the very front the
    // NECK ROOT falls away out of the shoulders: the prowler head
    // hangs off a descending slope, never off a flat prism wall.
    (X) =>
      look.backH +
      look.shoulderH * Math.max(0, X / hl - 0.25) -
      0.035 * Math.max(0, 1 - Math.abs(X / hl - 0.1) / 0.5) +
      look.haunchH * Math.max(0, (-X / hl - 0.05) / 0.75) -
      0.07 * Math.max(0, (X / hl - 0.62) / 0.38),
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 1.05)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // The duskruff's storm mantle: a darker cape over shoulders and
      // spine, laid FIRST so her silver reads against it.
      if (look.champion && !f.hurt) {
        ctx.save();
        ctx.translate(gx(hl * 0.05, 0), gyy(hl * 0.05, 0) - bh * 0.94 - lift);
        ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
        ctx.fillStyle = shade(coat, -12);
        ctx.beginPath();
        facetBlob(ctx, 0, 0, hl * s * 0.8, f.seed | 1, 9, (hw * 1.2) / (hl * 0.8), 0.35);
        ctx.fill();
        ctx.restore();
      }
      // THE ROSETTES: seeded spot rows riding the back and upper
      // flanks — big enough to survive daylight at world zoom, never
      // a stipple. Each cat's spots land differently.
      if (!f.hurt) {
        ctx.fillStyle = look.champion ? (look.grizzle ?? look.rosette) : look.rosette;
        for (let k = 0; k < 8; k++) {
          const rr = ((((f.seed >>> (k % 13)) * 2654435761 + k * 197) >>> 0) % 1000) / 1000;
          const X = (-0.78 + 0.22 * k + (rr - 0.5) * 0.1) * hl;
          const Y = ((k & 1) === 0 ? 1 : -1) * hw * (0.2 + 0.34 * rr);
          const sx = gx(X, Y);
          const sy = gyy(X, Y) - bh * (0.82 + 0.1 * rr) - lift;
          ctx.beginPath();
          facetCircle(ctx, sx, sy, s * (0.024 + 0.014 * rr), 5, (f.seed >>> k) | 1);
          ctx.fill();
        }
        // The scar rake: three pale lines across the duskruff's near
        // haunch — the seasons she's won, fur that never grew back.
        if (look.champion && look.scar) {
          ctx.strokeStyle = look.scar;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const sx = gx(-hl * (0.5 + 0.06 * i), hw * 0.5);
            const sy = gyy(-hl * (0.5 + 0.06 * i), hw * 0.5) - bh * (0.5 - 0.05 * i) - lift;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - f.fx * s * 0.02 + s * 0.012, sy + s * 0.075);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // Pale bib at the chest — the wolf's law: only while the chest
      // can actually face the camera.
      if (f.fy > -0.15 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.86, 0),
          gyy(hl * 0.86, 0) - (look.chestH + 0.1) * s - lift * 0.8,
          hw * s * 0.8,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * THE MUSCLED LIMB: the lynx's leg is drawn as MASS, never as stick
 * strokes — a filled haunch ball feeding a tapered thigh, a slim hock,
 * and the oversized paw a snow-cat actually stands on. Every shape is
 * built in the solved bones' own frames (hip→knee, knee→paw), so the
 * masses articulate honestly through all eight facing bands, the
 * pounce stretch, and every mid-turn joint memory — flat value planes
 * per the forge law, one coat family per cluster.
 */
export function drawCatLimb(
  ctx: CanvasRenderingContext2D,
  o: {
    hipX: number;
    hipY: number;
    kx: number;
    ky: number;
    ex: number;
    ey: number;
    /** Upper-leg thickness in px (spec.legW × scale). */
    w: number;
    s: number;
    hind: boolean;
    coat: string;
    champion: boolean;
    /** Far-side legs step into shadow so pairs never merge mid-stride. */
    far: boolean;
    hurt: boolean;
  },
): void {
  const { hipX, hipY, kx, ky, ex, ey, w, s, hind } = o;
  const dim = o.far ? -13 : 0;
  const C = (c: string): string => (o.hurt ? '#ffffff' : shade(c, dim));
  // Segment frames.
  const u1x = kx - hipX;
  const u1y = ky - hipY;
  const l1 = Math.hypot(u1x, u1y) || 1e-4;
  const p1x = -u1y / l1;
  const p1y = u1x / l1;
  const u2x = ex - kx;
  const u2y = ey - ky;
  const l2 = Math.hypot(u2x, u2y) || 1e-4;
  const p2x = -u2y / l2;
  const p2y = u2x / l2;

  // The thigh (or upper arm): a tapered quad, broad at the body and
  // pulling in toward the joint. The hind thigh is the biggest muscle
  // on the animal; the foreleg column runs leaner.
  const wHip = w * (hind ? 1.35 : 1.05);
  const wKnee = w * (hind ? 0.62 : 0.58);
  ctx.fillStyle = C(shade(o.coat, hind ? -10 : -14));
  ctx.beginPath();
  ctx.moveTo(hipX + p1x * wHip, hipY + p1y * wHip);
  ctx.lineTo(kx + p1x * wKnee, ky + p1y * wKnee);
  ctx.lineTo(kx - p1x * wKnee, ky - p1y * wKnee);
  ctx.lineTo(hipX - p1x * wHip, hipY - p1y * wHip);
  ctx.closePath();
  ctx.fill();

  // The shank: hock or forearm, slim and tapering to the ankle.
  const wShin = w * 0.55;
  const wAnkle = w * 0.4;
  ctx.fillStyle = C(shade(o.coat, -22));
  ctx.beginPath();
  ctx.moveTo(kx + p2x * wShin, ky + p2y * wShin);
  ctx.lineTo(ex + p2x * wAnkle, ey + p2y * wAnkle);
  ctx.lineTo(ex - p2x * wAnkle, ey - p2y * wAnkle);
  ctx.lineTo(kx - p2x * wShin, ky - p2y * wShin);
  ctx.closePath();
  ctx.fill();

  // Joint fill: a disc bridging the two quads so the knee/hock never
  // opens a wedge of daylight mid-stride.
  ctx.fillStyle = C(shade(o.coat, -16));
  ctx.beginPath();
  ctx.arc(kx, ky, w * 0.58, 0, Math.PI * 2);
  ctx.fill();

  // THE HAUNCH BALL (hind) / shoulder chip (fore): the muscle mass
  // seated over the limb's root, riding the thigh's own angle so it
  // rolls with the stride instead of sticking to the body like a
  // decal. This is what makes the leg read FED, not scrawny.
  const massR = w * (hind ? 1.6 : 1.1);
  const mx = hipX + (u1x / l1) * l1 * (hind ? 0.2 : 0.16);
  const my = hipY + (u1y / l1) * l1 * (hind ? 0.2 : 0.16);
  ctx.fillStyle = C(shade(o.coat, hind ? -5 : -9));
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(u1y, u1x));
  ctx.beginPath();
  ctx.ellipse(0, 0, massR, massR * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();
  // One quiet under-edge on the mass — a stroke, never a bright rim —
  // so the muscle separates from the flank it overlaps.
  if (!o.hurt) {
    ctx.strokeStyle = shade(o.coat, -30 + dim);
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.ellipse(0, 0, massR, massR * 0.76, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // THE PAW: broad and snowshoe-big, seated square on the shank's own
  // axis, with the toe cleft seams that read at the sheet zoom and
  // vanish quietly at world zoom.
  const pw = w * 0.95;
  const shinA = Math.atan2(ey - ky, ex - kx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(shinA - Math.PI / 2);
  ctx.fillStyle = C(shade(o.coat, -32));
  ctx.beginPath();
  ctx.ellipse(0, pw * 0.1, pw * 0.72, pw * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!o.hurt && s > 100) {
    ctx.strokeStyle = shade(o.coat, -48 + dim);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.lineCap = 'round';
    for (const t of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(t * pw * 0.4, pw * 0.22);
      ctx.lineTo(t * pw * 0.48, pw * 0.5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

/**
 * The lynx head: a round feline skull wearing the THREE face reads —
 * tall triangular ears firing black TUFTS off their tips, the pale
 * RUFF chops framing the jaw like a layered beard, and slanted
 * gold-green eyes. The muzzle barely leaves the skull (the feline
 * law); mid-snarl the ears pin, the tufts rake back, the jaw gapes.
 */
export function drawLynxHead(
  ctx: CanvasRenderingContext2D,
  look: LynxLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** 0..1 quick idle ear twitch. */
    flick?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;
  const great = look.champion === true;

  // Tall triangular ears set high on the crown, pinned flat mid-snarl,
  // the near one twitching at idle. The along-facing stagger keeps the
  // pair from collapsing into one sliver at full profile.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.3 + fx * es * w * 0.09;
    const byr = cy + (py * es * w * 0.3 + fy * es * w * 0.09) * ys - h * 0.36;
    const pin = Math.min(1, snarl * 0.7 + (es > 0 ? (o.flick ?? 0) * 0.35 : 0));
    const tx = bxr + px * es * w * 0.12 - fx * w * 0.24 * pin;
    const ty = byr - h * (0.72 - 0.34 * pin) - fy * w * 0.24 * pin * ys;
    ctx.fillStyle = C(shade(look.coat, -6));
    ctx.beginPath();
    ctx.moveTo(bxr - px * es * w * 0.16, byr + h * 0.05);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bxr + px * es * w * 0.18, byr + h * 0.11);
    ctx.closePath();
    ctx.fill();
    // THE TUFT: the black spike off the ear tip — a stroke, never a
    // fill (the fur-dialect law), riding the ear's own axis so it
    // pins and rakes with the snarl.
    if (!o.dead) {
      const al = Math.hypot(tx - bxr, ty - byr) || 1e-4;
      const ux = (tx - bxr) / al;
      const uy = (ty - byr) / al;
      const tlen = w * (great ? 0.38 : 0.3);
      ctx.strokeStyle = C(look.tuft);
      ctx.lineWidth = Math.max(1.4, w * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + ux * tlen, ty + uy * tlen);
      ctx.stroke();
      // The duskruff's tufts end SILVER — her winters, worn high.
      if (great && !o.hurt && look.grizzle) {
        ctx.strokeStyle = look.grizzle;
        ctx.lineWidth = Math.max(1, w * 0.05);
        ctx.beginPath();
        ctx.moveTo(tx + ux * tlen * 0.72, ty + uy * tlen * 0.72);
        ctx.lineTo(tx + ux * tlen, ty + uy * tlen);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(bxr - px * es * w * 0.05, byr + h * 0.01);
      ctx.lineTo(bxr + (tx - bxr) * 0.58, byr + (ty - byr) * 0.58);
      ctx.lineTo(bxr + px * es * w * 0.1, byr + h * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Round skull: the cat's circle — deep chamfers, no canid slab.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.34, w * 0.34, w * 0.38, w * 0.38]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.18, w, h * 0.32);
    ctx.restore();
  }

  // THE RUFF: layered fur chops hanging off the skull's lower sides —
  // the framed face that reads "lynx" before the tufts do. Broad
  // overlapping wedges, never fang-thin spikes; a FACE frame, so it
  // hides as the head turns away (from behind it read as tusks). The
  // duskruff's great ruff runs a third chop per side and wider.
  if (!o.hurt && fy > -0.35) {
    const chops = great ? 3 : 2;
    for (const es of [-1, 1]) {
      // At full profile the far side's ruff hides behind the skull.
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      for (let i = 0; i < chops; i++) {
        const spread = 0.3 + i * (great ? 0.18 : 0.22);
        const rx = cx + px * es * w * spread + fx * w * 0.06;
        const ry = cy + (py * es * w * spread + fy * w * 0.06) * ys + h * (0.16 + i * 0.05);
        const drop = h * (great ? 0.42 - i * 0.07 : 0.34 - i * 0.06);
        ctx.fillStyle = C(look.under);
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.18, ry - h * 0.14);
        ctx.lineTo(rx + px * es * w * (0.17 + i * 0.03), ry - h * 0.02);
        ctx.lineTo(rx + px * es * w * 0.04, ry + drop);
        ctx.closePath();
        ctx.fill();
        // The dark seam streaking each chop — a stroke, per the law.
        ctx.strokeStyle = C(look.ruffDark);
        ctx.lineWidth = Math.max(1, w * 0.035);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rx, ry - h * 0.04);
        ctx.lineTo(rx + px * es * w * 0.02, ry + drop * 0.62);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    // The chin beard — short and broad, front-facing only.
    if (fy > -0.1) {
      const bx0 = cx + fx * w * 0.18;
      const by0 = cy + fy * w * 0.18 * ys + h * 0.32;
      ctx.fillStyle = C(look.under);
      ctx.beginPath();
      ctx.moveTo(bx0 - w * 0.13, by0 - h * 0.08);
      ctx.lineTo(bx0 + w * 0.13, by0 - h * 0.08);
      ctx.lineTo(bx0, by0 + h * (great ? 0.22 : 0.18));
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- THE CAT FACE. No canid wedge, ever: a cat's face is FLAT.
  // The pale muzzle PLATE with its split whisker pads sits ON the
  // skull and barely leaves it at profile — the one read that says
  // feline before anything else. Gone from behind (the muzzle law).
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    // The plate slides toward the leading edge as the head turns and
    // narrows — the flat face holding its read side-on.
    const sl = w * (0.08 + 0.08 * profileK);
    const mx = cx + fx * (w * 0.2 + sl);
    const my = cy + fy * (w * 0.2 + sl) * ys + h * 0.17;
    const prx = w * 0.23 * (1 - 0.3 * profileK);
    const pry = h * 0.185;
    ctx.fillStyle = C(look.under);
    ctx.beginPath();
    ctx.ellipse(mx, my, prx, pry, 0, 0, Math.PI * 2);
    ctx.fill();
    // The whisker pads: two bumps splitting the upper lip.
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      ctx.fillStyle = C(shade(look.under, 7));
      ctx.beginPath();
      ctx.ellipse(
        mx + px * es * prx * 0.42,
        my - pry * 0.28,
        prx * 0.42,
        pry * 0.5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    // The nose leather: the downward triangle, seated where the pads
    // meet.
    const nx = mx;
    const ny = my - pry * 0.62;
    const nw = w * 0.075 * (1 - 0.2 * profileK);
    ctx.fillStyle = C(look.nose);
    ctx.beginPath();
    ctx.moveTo(nx - nw, ny - h * 0.035);
    ctx.lineTo(nx + nw, ny - h * 0.035);
    ctx.lineTo(nx, ny + h * 0.05);
    ctx.closePath();
    ctx.fill();
    // The philtrum: nose to lip split — a stroke, per the law.
    if (!o.hurt) {
      ctx.strokeStyle = look.ruffDark;
      ctx.lineWidth = Math.max(1, w * 0.022);
      ctx.beginPath();
      ctx.moveTo(nx, ny + h * 0.05);
      ctx.lineTo(nx, my + pry * 0.5);
      ctx.stroke();
    }
    // The chin drop below the plate, front-facing only.
    if (fy > 0) {
      ctx.fillStyle = C(shade(look.under, -4));
      ctx.beginPath();
      ctx.ellipse(mx, my + pry * 1.05, prx * 0.4, pry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Whiskers: sheet-zoom detail off the pads; they vanish quietly
    // at world zoom.
    if (!o.hurt && !o.dead && s > 110 && fy > 0.05) {
      ctx.strokeStyle = 'rgba(238, 232, 214, 0.75)';
      ctx.lineWidth = Math.max(0.8, w * 0.012);
      for (const es of [-1, 1]) {
        for (const wa of [0.12, 0.3]) {
          ctx.beginPath();
          ctx.moveTo(mx + px * es * prx * 0.55, my - pry * 0.2 + wa * pry);
          ctx.lineTo(
            mx + px * es * (prx * 0.55 + w * 0.3),
            my - pry * 0.1 + wa * pry * 2.4,
          );
          ctx.stroke();
        }
      }
    }
    // Snarl: the jaw gapes below the plate, fangs bared.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.34 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(mx - prx * 0.72, my + pry * 0.5);
      ctx.lineTo(mx + prx * 0.72, my + pry * 0.5);
      ctx.lineTo(mx + fx * prx * 0.2, my + pry * 0.5 + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.5, 0.5]) {
        const fx0 = mx + ts * prx * 0.66;
        ctx.beginPath();
        ctx.moveTo(fx0 - w * 0.02, my + pry * 0.5);
        ctx.lineTo(fx0 + w * 0.02, my + pry * 0.5);
        ctx.lineTo(fx0, my + pry * 0.5 + gape * 0.55);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Crown stripes between the ears — the lynx's written forehead.
  if (!o.hurt && fy > -0.2) {
    ctx.strokeStyle = C(look.ruffDark);
    ctx.lineWidth = Math.max(1, w * 0.028);
    ctx.lineCap = 'round';
    for (const es of [-1, 0, 1]) {
      if (es !== 0 && Math.abs(fx) > 0.7 && es * py < 0) continue;
      const sx0 = cx + px * es * w * 0.13 + fx * w * (es === 0 ? -0.02 : -0.05);
      const sy0 = cy + py * es * w * 0.13 * ys - h * 0.42;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + px * es * w * 0.03 + fx * w * 0.1, sy0 + h * 0.16 + fy * w * 0.1 * ys);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // Almond hunter's eyes: lined in dark, gold-green with the vertical
  // cat pupil and one fixed light chip — set forward on the flat
  // face. The far one hides as the head goes profile; none from
  // behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.26;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.26) * ys - h * 0.11;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.3 + snarl * 0.25));
      // The liner rim first, then the iris inside it.
      ctx.fillStyle = C(look.ruffDark);
      ctx.fillRect(-w * 0.1, -h * 0.062, w * 0.2, h * 0.124);
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.085, -h * 0.048, w * 0.17, h * 0.096);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(-w * 0.018, -h * 0.048, w * 0.036, h * 0.096);
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
        ctx.fillRect(w * 0.03, -h * 0.04, w * 0.026, h * 0.03);
      }
      ctx.restore();
      // The tear-line: the dark streak from the inner eye down the
      // muzzle's side — the lynx's war-paint, its signature stripe.
      if (!o.hurt && fy > -0.15) {
        ctx.strokeStyle = C(look.ruffDark);
        ctx.lineWidth = Math.max(1, w * 0.026);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - px * es * w * 0.06, ey + h * 0.05);
        ctx.quadraticCurveTo(
          ex - px * es * w * 0.02 + fx * w * 0.04,
          ey + h * 0.16,
          ex - px * es * w * 0.05 + fx * w * 0.07,
          ey + h * 0.26,
        );
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }
}

/**
 * THE FOX — the cunning made flesh, and none of it borrowed: not the
 * wolf's slab skull, not the lynx's flat plate, not the worg's slope.
 * Four reads own the species. THE BRUSH: a tail nearly the body's own
 * length ending in the white flag — the one mark that survives any
 * zoom, any coat, any light. THE SOOT EARS: oversized triangles,
 * black-backed, so the fox reads from BEHIND by its ears alone. THE
 * SNIPE: a fine tapering muzzle under amber eyes cut with the vertical
 * pupil — the only canid in the wood wearing a cat's eye. THE
 * STOCKINGS: dark legs under a warm coat, the fox stepping in soot.
 */
export interface FoxLook {
  coat: string;
  /** Cream bib, underbelly, and the pale side of every mark. */
  under: string;
  /** The dark stockings — a fox walks in soot to the knee. */
  sock: string;
  /** Soot backing the oversized ears — the from-behind read. */
  earBack: string;
  earIn: string;
  eye: string;
  nose: string;
  /** The brush flag: white for the wild skulk, smoke for the queen. */
  tip: string;
  /** The brush's darker root third — volume, not a banded raccoon. */
  brushRoot: string;
  /**
   * The cross-fox mark: a dark dorsal stripe crossed by a shoulder
   * bar. One wild cluster wears it faint; the matriarch wears it
   * burned deep — the cross writ large.
   */
  mantle?: string;
  /** Silver ticking — the sable cluster's frost, the queen's winters. */
  grizzle?: string;
  bodyW: number;
  backH: number;
  /** A modest wither rise — the fox carries its head HIGH and alert. */
  shoulderH: number;
  /** The light spring coiled behind — well under the lynx's ramp. */
  haunchH: number;
  chestH: number;
  /** High tuck: the leggy waist that says featherweight at any zoom. */
  tuckH: number;
  headW: number;
  headH: number;
  /**
   * The matriarch dresses further: the great pale ruff collar, the
   * silvered mask, the ember ring on her smoke brush. Champions never
   * roll a cluster — the vixen is a DESIGN (the packlord law).
   */
  champion?: boolean;
  /** The queen's ember ring, banded below her smoke tip. */
  ember?: string;
  /** The great ruff collar — pale, chest-deep, no lean fox carries it. */
  ruff?: string;
  seed?: number;
}

export const FOX_LOOKS: Record<string, FoxLook> = {
  fox: {
    coat: '#b4622a',
    under: '#ead9bf',
    sock: '#33241c',
    earBack: '#2c1f18',
    earIn: '#d8b992',
    eye: '#e8a83c',
    nose: '#241a16',
    tip: '#efe8d8',
    brushRoot: '#8a4b22',
    bodyW: 0.13,
    backH: 0.42,
    shoulderH: 0.05,
    haunchH: 0.055,
    chestH: 0.22,
    tuckH: 0.33,
    // The head carries a fuller share of the animal than the first
    // cut gave it — proportional to the body, and broad enough that
    // the ear roots seat ON the skull at every band.
    headW: 0.27,
    headH: 0.22,
  },
  // THE DIRE FOX — the smokebrush vixen, the matriarch. Never a scaled
  // fox and never the dire wolf's wall of meat: she is RANGY, an
  // ember-dark blade on legs too long for her shadow. Her marks are
  // her own: the cross-fox mantle burned charcoal-deep, a silvered
  // mask (her winters, worn on the face), the great pale ruff collar,
  // cold jade eyes where the dire wolf burns ember — and THE SMOKE
  // BRUSH: her flag ends DARK with one ember-bright ring where the
  // whole skulk's ends white. The inversion detail, kept.
  fox_champion: {
    coat: '#6b3226',
    under: '#b9a68f',
    sock: '#221a1e',
    earIn: '#a08a80',
    eye: '#9fd8a8',
    nose: '#1f181a',
    tip: '#2c2430',
    // The worg lesson: ears in the coat's own value VANISH — the
    // queen's soot runs frost-plum, two full steps lighter than her
    // head, so the blades stand against her at every band.
    earBack: '#5a4750',
    brushRoot: '#542a22',
    mantle: '#3a2830',
    grizzle: '#b8aab4',
    bodyW: 0.16,
    backH: 0.54,
    shoulderH: 0.06,
    haunchH: 0.07,
    chestH: 0.25,
    tuckH: 0.43,
    headW: 0.33,
    headH: 0.26,
    champion: true,
    ember: '#d97a35',
    ruff: '#cbb9a4',
  },
};

/**
 * THE COAT CLUSTERS (the gnoll law, spoken vulpine): four curated wild
 * colorways a spawned skulk spreads across — the ember red, the frost
 * white, the dusk cross, and the sable silver. Never a random hue
 * roll; always one of the four coats the wood actually breeds.
 */
const FOX_CLUSTERS: ReadonlyArray<
  Pick<FoxLook, 'coat' | 'under' | 'sock' | 'brushRoot' | 'tip' | 'mantle' | 'grizzle'>
> = [
  // Ember — the classic red, soot to the knee.
  { coat: '#b4622a', under: '#ead9bf', sock: '#33241c', brushRoot: '#8a4b22', tip: '#efe8d8' },
  // Frost — the white fox of the high snows; even its soot runs pale.
  { coat: '#d9d2c1', under: '#f2ede1', sock: '#8d8478', brushRoot: '#a89f8e', tip: '#f8f4ea' },
  // Dusk — the cross fox: bracken brown wearing the faint dark cross.
  {
    coat: '#8a5c38',
    under: '#d9c8ac',
    sock: '#2c211b',
    brushRoot: '#6b3f26',
    tip: '#e8dfc9',
    mantle: '#4a3526',
  },
  // Sable — the silver fox: near-black ticked in frost, the white
  // flag popping hardest of all four.
  {
    coat: '#45414c',
    under: '#8f8a96',
    sock: '#26232c',
    brushRoot: '#37333e',
    tip: '#f0ece2',
    grizzle: '#9a95a4',
  },
];

const FOX_LOOK_CACHE = new Map<string, FoxLook>();

export function foxLook(defId: string, seed = 0): FoxLook {
  const base = FOX_LOOKS[defId] ?? FOX_LOOKS['fox']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = FOX_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: FoxLook;
  if (defId === 'fox') {
    // Hash the seed before picking: skulk members spawn with
    // CONSECUTIVE eids, and raw high bits would dress a whole earth
    // in one coat — the hash spreads the litter across the clusters
    // (the gnoll lesson, kept).
    const h = (seed * 2654435761) | 0;
    const cl = FOX_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      coat: shade(cl.coat, jit),
      under: cl.under,
      sock: cl.sock,
      brushRoot: shade(cl.brushRoot, jit),
      tip: cl.tip,
      mantle: cl.mantle,
      grizzle: cl.grizzle,
      seed,
    };
  } else {
    // The smokebrush vixen holds her authored design.
    look = { ...base, seed };
  }
  FOX_LOOK_CACHE.set(key, look);
  return look;
}

export function paintFoxBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: FoxLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // THE STREAMLINED HULL: a fox is an arrow, not a barrel — the deep
  // narrow chest CARRIES the width, the waist draws in hard, and the
  // rump runs to a NARROW stern that pours straight into the brush
  // root. Neither the wolf's keel-and-slab nor the cat's wide-rumped
  // wedge: the taper is the species. What says fox at world zoom is
  // how little body rides how much brush.
  // The widest station sits just AHEAD of midship and the rump holds
  // its width — a lithe barrel, never a dart: the first cut's
  // chest-widest linear taper read as a triangle.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.7],
    [hl, hw * 0.7],
    [hl * 0.35, hw],
    [-hl * 0.35, hw * 0.88],
    [-hl, hw * 0.58],
    [-hl, -hw * 0.58],
    [-hl * 0.35, -hw * 0.88],
    [hl * 0.35, -hw],
  ];
  // Skulk variance: each fox's coat sits a step off the cluster tone.
  const coat = shade(look.coat, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    // THE ARROW TOPLINE: the neck root RISES out of the chest (the
    // fox listens UP — the head must grow from the body, never hover
    // off it), a shallow dip behind the withers, a light loin arch
    // over the coiled rear, then the stern FALLS AWAY into the brush
    // root — the tail reads attached because the body hands it off.
    (X) =>
      look.backH +
      (look.shoulderH + 0.045) * Math.max(0, (X / hl - 0.45) / 0.55) -
      0.02 * Math.max(0, 1 - Math.abs(X / hl - 0.15) / 0.45) +
      look.haunchH * Math.max(0, 1 - Math.abs(-X / hl - 0.55) / 0.45) -
      0.075 * Math.max(0, (-X / hl - 0.72) / 0.28),
    // The deep little chest into the HIGH hard tuck — the leggy
    // waist, drawn tighter than any other beast wears it.
    (X) => look.chestH + (look.tuckH - look.chestH) * Math.min(1, Math.max(0, (0.5 - X / hl) / 0.85)),
    coat,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      const bh = look.backH * tk * s;
      // THE CROSS: the dark dorsal stripe with its shoulder bar — the
      // dusk cluster wears it faint, the matriarch wears it burned.
      // Laid FIRST so ticking and bib read against it.
      if (look.mantle && !f.hurt) {
        ctx.save();
        ctx.translate(gx(0, 0), gyy(0, 0) - bh * 0.96 - lift);
        ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
        ctx.fillStyle = look.mantle;
        // The spine stripe, nape to brush root.
        ctx.beginPath();
        facetBlob(ctx, -hl * s * 0.06, 0, hl * s * 0.78, f.seed | 1, 9, (hw * 0.3) / (hl * 0.78), 0.3);
        ctx.fill();
        // The bar across the shoulders — the second stroke of the
        // cross, drawn in its own quarter-turned frame.
        ctx.save();
        ctx.translate(hl * s * 0.42, 0);
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        facetBlob(ctx, 0, 0, hw * s * 0.92, f.seed ^ 0x2b, 7, 0.32, 0.4);
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }
      // Silver ticking riding the saddle line — STROKES, never fills
      // (the fur-dialect law): the sable cluster's frost, and the
      // matriarch's winters worn down her back.
      if (look.grizzle && !f.hurt) {
        ctx.strokeStyle = look.grizzle;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          const rr = ((((f.seed >>> (k % 11)) * 2654435761 + k * 131) >>> 0) % 1000) / 1000;
          const X = (-0.6 + 0.24 * k + (rr - 0.5) * 0.12) * hl;
          const Y = ((k & 1) === 0 ? 1 : -1) * hw * (0.12 + 0.2 * rr);
          const sx = gx(X, Y);
          const sy = gyy(X, Y) - bh * (0.9 + 0.06 * rr) - lift;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - f.fx * s * 0.03, sy + s * 0.028);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
      // THE BIB: the fox's white front — bigger and brighter than the
      // wolf's, the second-surest read after the flag. Only while the
      // chest can actually face the camera.
      if (f.fy > -0.15 && !f.hurt) {
        ctx.fillStyle = look.under;
        ctx.beginPath();
        facetBlob(
          ctx,
          gx(hl * 0.84, 0),
          gyy(hl * 0.84, 0) - (look.chestH + 0.09) * s - lift * 0.8,
          hw * s * 0.92,
          f.seed ^ 0x33,
          7,
          0.85,
          1.7,
        );
        ctx.fill();
      }
    },
  );
}

/**
 * The fox head: a compact near-round skull (deeper chamfers than the
 * wolf slab, shy of the cat's circle) crowned by the SOOT EARS —
 * triangles taller than any canid's, black-backed so the species reads
 * from behind — over THE SNIPE: a fine tapering muzzle, pale-jawed,
 * dotted with the small black nose. The eyes are the fox's secret:
 * amber almonds cut with the VERTICAL pupil — a cat's eye in a canid
 * face, the cunning made visible. `snarl` pins the ears and gapes the
 * needle jaw through the pounce telegraph; corpses pass `dead`.
 */
export function drawFoxHead(
  ctx: CanvasRenderingContext2D,
  look: FoxLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the attack telegraph. */
    snarl?: number;
    /** Wall clock for the ear sim tick; absent = the settled rest. */
    nowMs?: number;
    /** THE EAR IS A SIMULATION: the live elastic pair. Sim-less
     *  callers (portraits, CMS, ragdoll) fall to earRestChain — THE
     *  ONE REST, the exact silhouette the live game relaxes to. */
    ears?: EarSim;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const snarl = o.snarl ?? 0;
  const queen = look.champion === true;

  // THE EAR IS A SIMULATION, spoken vulpine: the pricked blades are
  // elastic bodies on the goblin's exact contract — ONE 3D carriage
  // projected through the fixed camera, so orientation, near/far
  // z-order, and foreshortening at every band fall out BY
  // CONSTRUCTION; the sim adds the lag, the gait flap, and the
  // settle no rigged triangle ever had. A fox ear is stiff cartilage:
  // tall rise, tight curl, and the strength law keeps it a blade.
  const dir = Math.atan2(fy, fx);
  const pin = Math.min(1, snarl * 0.75);
  const carr: EarCarriage = {
    azimuth: 2.1,
    // Roots tucked DOWN and IN onto the skull: at the quarter bands
    // the old high wide orbit projected the root past the drawn
    // skull's edge and the blades floated free of the head.
    rootR: look.headW * 0.24,
    rootLift: look.headH * 0.46,
    length: look.headW * (queen ? 0.95 : 0.85),
    spread: 0.5,
    rise: 1.3,
    curl: [0, 0.05, 0.12],
  };
  if (o.ears && !o.dead && o.nowMs) o.ears.update(cx, cy, s, carr, dir, pin, o.nowMs);
  const chains = ([-1, 1] as const).map((side) =>
    o.ears && !o.dead
      ? o.ears.chain(side, carr, dir, pin)
      : earRestChain(side, carr, { dir, pin: o.dead ? 0.55 : pin, sway: 0 }),
  );
  const earW0 = w * (queen ? 0.2 : 0.18);
  const paintEar = (chain: { pts: Array<{ x: number; y: number }>; depth: number }): void => {
    const pts = chain.pts.map((p) => ({ x: cx + p.x * s, y: cy + p.y * s }));
    const prof = [1, 0.78, 0.42, 0];
    const ea: Array<{ x: number; y: number }> = [];
    const eb: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 4; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(3, i + 1)]!;
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const ww = earW0 * prof[i]!;
      ea.push({ x: pts[i]!.x + ty * ww, y: pts[i]!.y - tx * ww });
      eb.push({ x: pts[i]!.x - ty * ww, y: pts[i]!.y + tx * ww });
    }
    // The leading edge faces AWAY from the skull (the wing-ear law).
    const da = Math.hypot(ea[1]!.x - cx, ea[1]!.y - cy);
    const db = Math.hypot(eb[1]!.x - cx, eb[1]!.y - cy);
    const lead = da >= db ? ea : eb;
    const trail = da >= db ? eb : ea;
    const blade = (): void => {
      ctx.beginPath();
      ctx.moveTo(trail[0]!.x, trail[0]!.y);
      ctx.lineTo(lead[0]!.x, lead[0]!.y);
      ctx.lineTo(lead[1]!.x, lead[1]!.y);
      ctx.lineTo(lead[2]!.x, lead[2]!.y);
      ctx.lineTo(pts[3]!.x, pts[3]!.y);
      ctx.lineTo(trail[2]!.x, trail[2]!.y);
      ctx.lineTo(trail[1]!.x, trail[1]!.y);
      ctx.closePath();
    };
    // The visible face follows the HEAD's facing: toward the camera
    // shows the pale inner fan in a soot frame; away shows the black
    // back — the fox's whole from-behind identity.
    const front = fy > 0.05;
    ctx.lineJoin = 'round';
    // The blade frame is ALWAYS soot — face-on the pale fan sits
    // inside it; the black-backed ear never stops reading.
    ctx.fillStyle = C(look.earBack);
    blade();
    ctx.fill();
    if (o.hurt) return;
    if (front && !o.dead) {
      // The pale inner fan, inset so the soot frame survives it.
      ctx.fillStyle = look.earIn;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x + (trail[0]!.x - pts[0]!.x) * 0.45, pts[0]!.y + (trail[0]!.y - pts[0]!.y) * 0.45);
      ctx.lineTo(pts[0]!.x + (lead[0]!.x - pts[0]!.x) * 0.55, pts[0]!.y + (lead[0]!.y - pts[0]!.y) * 0.55);
      ctx.lineTo(lead[1]!.x * 0.6 + pts[1]!.x * 0.4, lead[1]!.y * 0.6 + pts[1]!.y * 0.4);
      ctx.lineTo(pts[2]!.x * 0.85 + pts[3]!.x * 0.15, pts[2]!.y * 0.85 + pts[3]!.y * 0.15);
      ctx.lineTo(trail[1]!.x * 0.6 + pts[1]!.x * 0.4, trail[1]!.y * 0.6 + pts[1]!.y * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (!front && !o.dead) {
      // Ear back: one cartilage seam keeps the black blade a volume.
      ctx.strokeStyle = shade(look.earBack, 14);
      ctx.lineWidth = Math.max(1, earW0 * 0.16);
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
      ctx.stroke();
    }
    // The queen's silver rim — her winters, worn on the leading edge.
    if (queen && look.grizzle && !o.dead) {
      ctx.strokeStyle = look.grizzle;
      ctx.lineWidth = Math.max(1, earW0 * 0.18);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lead[0]!.x, lead[0]!.y);
      ctx.lineTo(lead[1]!.x, lead[1]!.y);
      ctx.lineTo(lead[2]!.x, lead[2]!.y);
      ctx.lineTo(pts[3]!.x, pts[3]!.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  };
  // Far ears first — the skull and face paint over their roots; near
  // ears return at the very end, over everything (the projection's
  // own z-order, never a hand-authored band).
  const earsBehind = chains.filter((c) => c.depth <= 0.05);
  const earsFront = chains.filter((c) => c.depth > 0.05);
  for (const c of earsBehind) paintEar(c);

  // THE GREAT RUFF: the matriarch's pale collar, laid down before the
  // ears so skull and ears both lap it — a full frame of layered chops
  // around the lower skull, chest-deep. No lean fox carries it.
  if (queen && look.ruff && !o.hurt && fy > -0.5) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.8 && es * py < 0) continue;
      for (let i = 0; i < 3; i++) {
        const spread = 0.34 + i * 0.16;
        const rx = cx + px * es * w * spread - fx * w * 0.04;
        const ry = cy + (py * es * w * spread - fy * w * 0.04) * ys + h * (0.1 + i * 0.08);
        const drop = h * (0.5 - i * 0.08);
        ctx.fillStyle = C(shade(look.ruff, -i * 5));
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.2, ry - h * 0.18);
        ctx.lineTo(rx + px * es * w * (0.2 + i * 0.04), ry - h * 0.02);
        ctx.lineTo(rx + px * es * w * 0.02, ry + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The skull: compact and fine-boned — chamfers deeper than the wolf
  // slab, shy of the cat's full round. A fox's head is a small neat
  // thing under two enormous ears.
  ctx.fillStyle = C(look.coat);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.34, w * 0.34]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.3, w * 0.3, w * 0.34, w * 0.34]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.15)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    // The pale lower face: cheek and jaw in the under tone — the
    // white-cheeked mask every fox wears.
    ctx.fillStyle = C(look.under);
    ctx.fillRect(cx - w / 2, cy + h * 0.16, w, h * 0.34);
    ctx.restore();
  }

  // THE CHEEK FLARES: short fur chops flaring OUT at the jaw line —
  // sideways, where the lynx's ruff hangs down. They widen the small
  // skull into the fox's heart-shaped face without borrowing the
  // cat's frame. Far side yields at profile; gone from behind.
  if (!o.hurt && fy > -0.3) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.75 && es * py < 0) continue;
      for (let i = 0; i < 2; i++) {
        // Seated at the JAW line — flares riding the eye line read as
        // tusks (the lynx ruff lesson, relearned at the cheek).
        const rx = cx + px * es * w * (0.4 + i * 0.1) + fx * w * 0.02;
        const ry = cy + (py * es * w * (0.4 + i * 0.1) + fy * w * 0.02) * ys + h * (0.22 + i * 0.08);
        ctx.fillStyle = C(i === 0 ? look.under : shade(look.coat, -4));
        ctx.beginPath();
        ctx.moveTo(rx - px * es * w * 0.14, ry - h * 0.1);
        ctx.lineTo(rx + px * es * w * 0.16, ry + h * (0.0 + i * 0.03));
        ctx.lineTo(rx - px * es * w * 0.02, ry + h * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // The queen's silvered mask: frost ticks across brow and muzzle
  // root — her winters, worn on the face. Strokes, per the law.
  if (queen && look.grizzle && !o.hurt && !o.dead && fy > -0.2) {
    ctx.strokeStyle = look.grizzle;
    ctx.lineWidth = Math.max(1, w * 0.024);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const es = i < 2 ? -1 : 1;
      if (Math.abs(fx) > 0.7 && es * py < 0) continue;
      const sx0 = cx + px * es * w * (0.14 + (i % 2) * 0.12) + fx * w * 0.1;
      const sy0 = cy + (py * es * w * (0.14 + (i % 2) * 0.12) + fy * w * 0.1) * ys - h * (0.22 - (i % 2) * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + fx * w * 0.09, sy0 + h * 0.07 + fy * w * 0.09 * ys);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // ---- THE SNIPE: the fine tapering muzzle pushed along the facing —
  // longer and narrower than the wolf's wedge, turning with the head,
  // gone from behind (the muzzle law). Its underside runs pale: the
  // white jaw is half the fox's face.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.2;
    const by0 = cy + fy * w * 0.2 * ys + h * 0.14;
    // THE SNIPE EARNS ITS LENGTH: a fox is a THIRD muzzle — the long
    // fine taper is half the head's identity, and the first cut ran
    // it too short (the goofy read). It grows from deep on the face,
    // reaches, and drops.
    const sl = w * (0.48 + 0.36 * profileK);
    const tx = bx0 + fx * sl;
    // The tip drops below the bridge line — a fox noses DOWN; a level
    // snipe read as a bill.
    const ty = by0 + fy * sl * ys + h * (0.1 + 0.09 * profileK);
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.165 * (1 - profileK * 0.2);
    const ht = hb * 0.4;
    // The snipe wears the COAT — a lightened wedge read as a beak at
    // profile (the duck-bill lesson); the pale jaw below carries the
    // white, the coat carries the bridge.
    ctx.fillStyle = C(shade(look.coat, -2));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    // The pale jaw: the muzzle's DOWN-SCREEN edge in the under tone —
    // the white lip line that carries the mask onto the snipe. A
    // PROFILE read: face-on it ran down the wedge's center as a white
    // drip, so it waits for the head to turn.
    if (!o.hurt && profileK > 0.25) {
      const low = ny >= 0 ? 1 : -1;
      ctx.strokeStyle = C(look.under);
      ctx.lineWidth = Math.max(1.2, w * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx0 + nx * hb * 0.72 * low, by0 + ny * hb * 0.72 * low);
      ctx.lineTo(tx + nx * ht * 0.6 * low, ty + ny * ht * 0.6 * low);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // The whisker smudge: one dark dash on the muzzle's near side —
      // the fox's spotted lip, a stroke, small on purpose.
      ctx.strokeStyle = C(shade(look.sock, 12));
      ctx.lineWidth = Math.max(1, w * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx0 + axv * 0.42 - nx * hb * 0.3 * low, by0 + ayv * 0.42 - ny * hb * 0.3 * low);
      ctx.lineTo(bx0 + axv * 0.56 - nx * hb * 0.24 * low, by0 + ayv * 0.56 - ny * hb * 0.24 * low);
      ctx.stroke();
    }
    // Snarl: the needle jaw gapes below the snipe — fangs finer than
    // any wolf's, the quick nip that bleeds.
    if (snarl > 0.15 && !o.dead && !o.hurt) {
      const gape = h * 0.3 * Math.min(1, snarl);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(tx - nx * ht * 0.9, ty - ny * ht * 0.9);
      ctx.lineTo(tx + nx * ht * 0.9, ty + ny * ht * 0.9);
      ctx.lineTo(tx + (axv / al) * ht * 0.4, ty + gape);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe9d8';
      for (const ts of [-0.5, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(tx + nx * ht * ts - w * 0.014, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts + w * 0.014, ty + ny * ht * ts);
        ctx.lineTo(tx + nx * ht * ts, ty + ny * ht * ts + gape * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The small black nose, seated on the tip — pulled back along the
    // axis so it overlaps the wedge instead of floating at profile.
    ctx.fillStyle = C(look.nose);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.015, ty - (ayv / al) * w * 0.015, w * 0.058, 5, fx);
    ctx.fill();
  }

  // THE CUNNING EYE: amber almonds cut with the VERTICAL pupil — the
  // cat's eye in the canid face, the one detail that says fox and
  // nothing else at close zoom. Dark-lined, one light chip. The far
  // one hides as the head goes profile; none from behind, none dead.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.12 + px * es * w * 0.27;
      const ey = cy + (fy * w * 0.12 + py * es * w * 0.27) * ys - h * 0.1;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(es * (0.34 + snarl * 0.25));
      // The soot liner first, then the iris inside it.
      ctx.fillStyle = C(look.earBack);
      ctx.fillRect(-w * 0.092, -h * 0.056, w * 0.184, h * 0.112);
      ctx.fillStyle = C(look.eye);
      ctx.fillRect(-w * 0.078, -h * 0.044, w * 0.156, h * 0.088);
      if (!o.hurt) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(-w * 0.016, -h * 0.044, w * 0.032, h * 0.088);
        ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
        ctx.fillRect(w * 0.028, -h * 0.036, w * 0.024, h * 0.028);
      }
      ctx.restore();
    }
  }

  // The near ears return over everything — roots on the viewer's side
  // of the skull paint over brow and crown (the projection's own
  // z-order, never a hand-authored band).
  for (const c of earsFront) paintEar(c);
}

export function drawBeast(
  ctx: CanvasRenderingContext2D,
  opts: {
    /** Screen position of the body's ground point. */
    x: number;
    y: number;
    scale: number;
    /** Slewed facing from the rig pose — body and legs agree. */
    dir: number;
    radius: number;
    color: string;
    defId: string;
    spec: BeastSpec;
    pose: LegPose;
    /** Feet already projected to screen (terrain lift applied). */
    feet: Array<{ x: number; y: number; lift: number }>;
    /** Camera y foreshorten for body-frame offsets. */
    yScale: number;
    walkPhase: number;
    hurt: boolean;
    /** Per-leg joint-side hysteresis, owned by the caller's anim state. */
    kneeMemory: number[];
    /** 0..1 through an attack: crouch back, then pounce. */
    attackT?: number;
    /** Stable per-entity seed — patch layouts differ cow to cow. */
    seed?: number;
    /** Clock for idle life (cud chewing, tail swish, ear time). */
    nowMs?: number;
    /**
     * THE RIDER SEAM: drawn between the near legs and a down-screen
     * head — the one slot where a body on the saddle reads correctly
     * at every facing (behind the neck coming toward camera, over the
     * barrel going away).
     */
    rider?: () => void;
    /**
     * THE SIMULATED TAIL: when the caller ticks a physics tail
     * (BobtailSim on its anim map), this paints the projected nodes.
     * drawBeast keeps the depth law (tailFront) and skips its
     * analytic stub; callers without a sim (portraits, the CMS
     * viewport) fall back to the analytic pose.
     */
    tail?: () => void;
    /**
     * THE EAR IS A SIMULATION (fox lane): the renderer-owned elastic
     * pair; the fox head branch ticks it at the exact skull anchor
     * (the goblin contract). Sim-less callers get THE ONE REST.
     */
    ears?: EarSim;
    /**
     * THE COLLAR TELLS THE TALE (beastcraft v2): strap color for a
     * tamed body — worn gear in the saddle's tradition, never a
     * palette swap. Absent on every wild thing.
     */
    collar?: string;
    /**
     * THE FLEECE TELLS THE TIME (sheep only): true while the wool
     * regrows — the painter trades the cloud for the clipped trim.
     */
    shorn?: boolean;
  },
): void {
  const s = opts.scale;
  const r = opts.radius * s;
  const spec = opts.spec;
  const ys = opts.yScale;
  const fx = Math.cos(opts.dir);
  const fy = Math.sin(opts.dir);
  const px = -fy;
  const py = fx;

  // Telegraphed pounce: rock back through the windup (matching the
  // server's 300ms telegraph), then snap forward for the strike. Only
  // the BODY lunges — the feet stay planted and the IK legs stretch
  // into the strike, which is what sells the weight.
  const at = opts.attackT ?? 0;
  let bx = opts.x;
  let by = opts.y;
  if (at > 0) {
    // The turtles never pounce: the keep plants and the NECK fires
    // (the head branch spends the strike) — the shell only heaves a
    // fraction of the beat, or a fortress would hop like a fox.
    // The giant crab plants like the keeps do — THE CLAMP spends the
    // strike through the crusher arm, never a hopping hull.
    // The basilisks half-plant: the sprawl drives a short heavy
    // surge while the NECK spends the rest of the strike (the head
    // branch) — a crag lunges like a landslide, not a fox.
    const massK =
      opts.defId.endsWith('_turtle') || opts.defId === 'giant_crab'
        ? 0.3
        : opts.defId.endsWith('basilisk')
          ? 0.45
          : 1;
    const pounce =
      (at < 0.7
        ? -0.12 * (at / 0.7) // crouch away
        : 0.3 * Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3))) * massK; // strike!
    bx += fx * pounce * s;
    by += fy * pounce * s * ys;
  }
  const color = opts.hurt ? '#ffffff' : opts.color;
  const len = spec.bodyLen * s;

  // The body rides the legs: height from the spec, dipping with bob,
  // plus a subtle roll toward whichever side is mid-swing.
  const bodyY = by - (spec.bodyRise + opts.pose.bob * 0.35) * s;
  let roll = 0;
  for (let i = 0; i < spec.rig.legs.length; i++) {
    roll += (opts.feet[i]?.lift ?? 0) * -Math.sign(spec.rig.legs[i]!.side);
  }
  roll *= 0.2;

  // ---- legs: two-segment IK from body-frame hips to planted feet.
  // Far-side legs draw behind the body mass, near-side in front.
  const L = (spec.rig.legLen / 2) * s;
  const stretch = spec.rig.stretch ?? 1.15;
  // The stable per-entity seed, hoisted above the legs: the lynx limb
  // painter jitters its muscle coat off the SAME hash the body wears.
  let seed = 0;
  for (let i = 0; i < opts.defId.length; i++) {
    seed = (seed * 31 + opts.defId.charCodeAt(i)) | 0;
  }
  seed = (seed ^ ((opts.seed ?? 0) * 2654435761)) | 0;
  // A lynx's legs wear its ROLLED cluster coat, not the def color —
  // an ash cat on tawny stockings read as a stranger's legs. The full
  // look resolves here (cached) so the bespoke limb painter can dress
  // muscle, not strokes.
  const lynxLegL = opts.defId.startsWith('lynx') ? lynxLook(opts.defId, opts.seed ?? 0) : undefined;
  // THE STOCKING LAW: a fox's legs wear its rolled cluster — thigh in
  // the coat, shin in the soot sock, paw darkest — so the dark
  // stockings read under a warm body at every zoom. An ember fox on
  // def-color stockings walked on a stranger's legs.
  const foxLegL = opts.defId.startsWith('fox') ? foxLook(opts.defId, opts.seed ?? 0) : undefined;
  // The basilisks roll hide clusters too — LEGS FOLLOW THE ROLLED
  // COAT (the lynx law): a mossback on greystone stockings walks on
  // a stranger's legs.
  const basiliskLegL = opts.defId.endsWith('basilisk')
    ? basiliskLook(opts.defId, opts.seed ?? 0)
    : undefined;
  const legBase = lynxLegL
    ? lynxLegL.coat
    : foxLegL
      ? foxLegL.coat
      : basiliskLegL
        ? basiliskLegL.hide
        : opts.color;
  const legColor = opts.hurt
    ? '#ffffff'
    : foxLegL
      ? shade(foxLegL.coat, -10)
      : (spec.legColor ?? shade(legBase, -35));
  const shinColor = opts.hurt
    ? '#ffffff'
    : foxLegL
      ? foxLegL.sock
      : (spec.legColor ?? shade(legBase, -22));
  const footColor = opts.hurt
    ? '#ffffff'
    : foxLegL
      ? shade(foxLegL.sock, -22)
      : shade(spec.legColor ?? legBase, -55);
  const drawLeg = (i: number, dim = false): void => {
    const foot = opts.feet[i];
    const leg = spec.rig.legs[i];
    if (!foot || !leg) return;
    // THE FAR LEG STEPS INTO THE SHELL'S SHADOW (shell-mount only):
    // a far foot poking past the hull's overhang is drawn BEHIND the
    // keep, but without a depth cue the visible sliver reads as
    // riding ON the rim — one tone step down tells the eye where it
    // stands. `dim` is the depth loop's verdict; every color the leg
    // and its foot wear routes through tone().
    const dimK = dim && !opts.hurt ? -16 : 0;
    const tone = (c: string): string => (dimK ? shade(c, dimK) : c);
    // Hip: body-frame attach point, projected like the world plane and
    // raised to the rig's (crouch-scaled) hip height. THE ROOT RIDES
    // THE BODY: the hip dips with the gait bob at the belly line's own
    // coupling (lift · 0.6 — the edge the legs emerge from), so the
    // leg roots stay seated in the bouncing mass instead of hanging
    // pinned in the air while the body moves around them.
    const hf = leg.fwd * spec.hipFwd;
    const hs = leg.side * spec.hipSide;
    const wx = fx * hf - fy * hs;
    const wy = fy * hf + fx * hs;
    const hipX = bx + wx * s;
    const hipY = by + wy * s * ys - (opts.pose.rise + opts.pose.bob * 0.35 * 0.6) * s;
    const footY = foot.y - foot.lift * s;
    // Anatomical joint preference: along the facing (front knees bow
    // forward, hocks and bird ankles backward) plus a SCREEN-space
    // outward lean from whichever side of the body this hip actually
    // sits on — front-on legs bow outward, never across the belly.
    // The outward sign comes from the projected hip, not the body
    // frame: body-frame lateral flips meaning as the facing crosses
    // the screen axis, which is what twisted knees mid-turn.
    const bow = spec.kneeFwd[i] ?? 1;
    const out = Math.sign(hipX - bx) || Math.sign(leg.side) || 1;
    const prefX = bow * fx * 0.9 + out * 0.45;
    const prefY = bow * fy * ys * 0.9;
    // Chord perpendicular, then a REMEMBERED side choice: hysteresis
    // stops the joint snapping 180° while a turning body carries the
    // pole past perpendicular to a still-planted leg.
    let ddx = foot.x - hipX;
    let ddy = footY - hipY;
    const dd = Math.hypot(ddx, ddy) || 1e-4;
    const cxn = -ddy / dd;
    const cyn = ddx / dd;
    const sign = chooseLimbSign(cxn, cyn, prefX, prefY, opts.kneeMemory[i] ?? 0);
    opts.kneeMemory[i] = sign;
    // Species with authored bone proportions run the unequal solve —
    // the cat's long thigh over its short hock is a SKELETON fact,
    // not a paint trick, so the joint sits where the anatomy puts it.
    const split = spec.segSplit ? (leg.fwd >= 0 ? spec.segSplit[0] : spec.segSplit[1]) : 0.5;
    const { ex, ey, kx, ky } =
      split === 0.5
        ? solveLimbInto(LEG_SOLVE, hipX, hipY, foot.x, footY, L, stretch, cxn * sign, cyn * sign)
        : solveLimb2Into(
            LEG_SOLVE,
            hipX,
            hipY,
            foot.x,
            footY,
            L * 2 * split,
            L * 2 * (1 - split),
            stretch,
            cxn * sign,
            cyn * sign,
          );

    // THE MUSCLED LIMB: the lynx never wears the stick strokes — its
    // legs are filled masses riding the solved bones at every facing.
    if (lynxLegL) {
      drawCatLimb(ctx, {
        hipX,
        hipY,
        kx,
        ky,
        ex,
        ey,
        w: spec.legW * s,
        s,
        hind: leg.fwd < 0,
        coat: shade(lynxLegL.coat, (((seed >>> 5) & 7) - 3) * 2),
        champion: lynxLegL.champion === true,
        // The far pair steps into shadow: without the tone step, two
        // same-coat legs mid-stride merge into one blob at profile.
        far: (opts.feet[i]?.y ?? opts.y) < opts.y,
        hurt: opts.hurt,
      });
      return;
    }

    const paintShin = (): void => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = tone(legColor);
      ctx.lineWidth = Math.max(2, spec.legW * s);
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      ctx.strokeStyle = tone(shinColor);
      ctx.lineWidth = Math.max(1.5, spec.legW * s * 0.78);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.lineCap = 'butt';
    };

    // Feet: the species' contact chip, painted in THE GROUND FRAME.
    // THE FOOT KNOWS THE GROUND: a foot is a ground-plane object — its
    // bearing is the body's slewed facing plus a small anatomical
    // splay from its own side of the body (hooves run near-true, paws
    // toe out a hair, bears walk pigeon-toed, turtles sprawl wide),
    // NEVER the shin's screen axis. A shin-framed foot whips with the
    // IK chord — up to a half-turn as a swing crosses the hip line —
    // which was the rotating-foot bug. The transform maps foot-local
    // tiles (u forward, v sideways) through the world projection, so
    // pads, lobes, and claws foreshorten with the ground plane like
    // every other flat mass. Mid-swing the digits CURL — reach
    // shortens and the claws tuck — so a lifted foot reads carried,
    // never stamped on the air.
    const sideSgn = Math.sign(leg.side) || 1;
    const digitCurl = Math.min(1, foot.lift / Math.max(0.02, spec.rig.liftAmp * 1.2));
    const splay =
      spec.foot === 'turtleclaw'
        ? leg.fwd >= 0
          ? 0.38
          : 0.26
        : spec.foot === 'crabspike'
          ? leg.fwd >= 0
            ? 0.5
            : 0.34
          : spec.foot === 'lizardclaw'
            ? leg.fwd >= 0
              ? 0.3
              : 0.2
            : spec.foot === 'bearpaw'
              ? leg.fwd >= 0
                ? -0.14
                : 0.1
              : spec.foot === 'hoof'
                ? 0.05
                : 0.1;
    const footA = opts.dir + sideSgn * splay;
    const ffx = Math.cos(footA);
    const ffy = Math.sin(footA) * ys;
    const fsx = -Math.sin(footA);
    const fsy = Math.cos(footA) * ys;
    // THE FOOT SITS UNDER ITS LEG (the 2.5D skew law): 0 toward the
    // camera → 1 pointing dead away. A foot bearing away shows its
    // HEEL — the claws foreshorten to nubs — and it paints BEFORE
    // the shin (below, in the layering), so the leg overlaps the
    // pad's rear exactly as the bird's-eye skew demands. Painted
    // after the shin at the back bands, pads and talons stacked OVER
    // the leg and the foot read as inverted.
    const away = Math.max(0, -Math.sin(footA));
    const paintFoot = (): void => {
    if (spec.foot === 'claw') {
      // Splayed bird toes, fanning along the facing.
      ctx.strokeStyle = footColor;
      ctx.lineWidth = Math.max(1.5, spec.legW * s * 0.7);
      ctx.lineCap = 'round';
      for (const t of CLAW_TOES) {
        const ta = opts.dir + t;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(ta) * 0.07 * s, ey + Math.sin(ta) * 0.07 * s * ys);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (spec.foot === 'hoof') {
      // The hoof is a horn BLOCK with real height: the dark wall
      // carries the footprint on the ground and the lit top plane
      // rides one wall-height up — the foreshortened-top law at
      // ankle scale. The cloven species split the toe with a center
      // cleft; a courser's horn stays whole.
      const W = spec.legW * 1.5 * (spec.footScale ?? 1);
      const wallH = W * 0.55 * s;
      const HX = (u: number, v: number): number => ex + (ffx * u + fsx * v) * s;
      const HY = (u: number, v: number): number => ey + (ffy * u + fsy * v) * s;
      const trace = (dz: number): void => {
        ctx.beginPath();
        ctx.moveTo(HX(-0.42 * W, -0.34 * W), HY(-0.42 * W, -0.34 * W) - dz);
        ctx.lineTo(HX(0.16 * W, -0.44 * W), HY(0.16 * W, -0.44 * W) - dz);
        ctx.quadraticCurveTo(
          HX(0.68 * W, -0.34 * W),
          HY(0.68 * W, -0.34 * W) - dz,
          HX(0.68 * W, 0),
          HY(0.68 * W, 0) - dz,
        );
        ctx.quadraticCurveTo(
          HX(0.68 * W, 0.34 * W),
          HY(0.68 * W, 0.34 * W) - dz,
          HX(0.16 * W, 0.44 * W),
          HY(0.16 * W, 0.44 * W) - dz,
        );
        ctx.lineTo(HX(-0.42 * W, 0.34 * W), HY(-0.42 * W, 0.34 * W) - dz);
        ctx.closePath();
      };
      ctx.fillStyle = tone(footColor);
      trace(0);
      ctx.fill();
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(spec.legColor ?? legBase, -38));
      trace(wallH);
      ctx.fill();
      if (CLOVEN_HOOF.test(opts.defId)) {
        ctx.strokeStyle = 'rgba(12,9,7,0.5)';
        ctx.lineWidth = Math.max(1, W * s * 0.09);
        ctx.beginPath();
        ctx.moveTo(HX(0.66 * W, 0), HY(0.66 * W, 0) - wallH);
        ctx.lineTo(HX(0.2 * W, 0), HY(0.2 * W, 0) - wallH * 0.9);
        ctx.stroke();
      }
    } else if (spec.foot === 'bearpaw') {
      // THE BEAR PAW EARNS ITS CLAWS: a broad plantigrade pad, four
      // knuckle lobes stepping into the light across the leading
      // edge, and four honest keratin claws — filled curved wedges,
      // never scratch-lines. The fore paws splay INWARD (negative
      // splay above): bears walk pigeon-toed, the field mark of the
      // amble. The base rides trunk-thick bear legs, so the paw's
      // multiplier is small — the paw grew first and the legs grew
      // to meet it, not the reverse.
      const W = spec.legW * 0.85 * (spec.footScale ?? 1);
      const curl = 1 - 0.26 * digitCurl;
      const skin = spec.legColor ?? opts.color;
      ctx.save();
      ctx.transform(ffx * s, ffy * s, fsx * s, fsy * s, ex, ey);
      // Claws first — the roots hide under the digits.
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone('#d8cbb2');
      for (const v of BEAR_TOES) {
        const ru = (0.5 + 0.12 * (1 - Math.abs(v))) * W * curl;
        const rv = v * W;
        const cl = W * (0.52 - 0.2 * digitCurl) * (1 - 0.68 * away);
        const tu = ru + cl;
        const tv = rv + v * W * 0.28;
        ctx.beginPath();
        ctx.moveTo(ru, rv - 0.1 * W);
        ctx.quadraticCurveTo(ru + cl * 0.55, rv - 0.09 * W + (tv - rv) * 0.45, tu, tv);
        ctx.quadraticCurveTo(ru + cl * 0.5, rv + 0.1 * W + (tv - rv) * 0.45, ru, rv + 0.1 * W);
        ctx.closePath();
        ctx.fill();
      }
      // The pad: heel arc behind the ankle, flanks swelling to the
      // toe line.
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -8));
      ctx.beginPath();
      ctx.moveTo(-0.5 * W, -0.52 * W);
      ctx.quadraticCurveTo(-0.85 * W, 0, -0.5 * W, 0.52 * W);
      ctx.lineTo(0.42 * W * curl, 0.7 * W);
      ctx.quadraticCurveTo(0.78 * W * curl, 0, 0.42 * W * curl, -0.7 * W);
      ctx.closePath();
      ctx.fill();
      // Knuckle lobes, one per digit, a step lighter than the pad.
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, 7));
      for (const v of BEAR_TOES) {
        const u = (0.48 + 0.12 * (1 - Math.abs(v))) * W * curl;
        ctx.beginPath();
        ctx.arc(u, v * W, 0.2 * W, 0, Math.PI * 2);
        ctx.fill();
      }
      // The crease that seats the digits ON the pad — quiet ink.
      ctx.strokeStyle = 'rgba(16,11,8,0.28)';
      ctx.lineWidth = 0.05 * W;
      ctx.beginPath();
      ctx.moveTo(0.3 * W * curl, -0.56 * W);
      ctx.quadraticCurveTo(0.46 * W * curl, 0, 0.3 * W * curl, 0.56 * W);
      ctx.stroke();
      ctx.restore();
    } else if (spec.foot === 'turtleclaw') {
      // THE TURTLE TREADS ON CLAWS — two species, two feet. The
      // snapper plants a webbed crocodilian forefoot: three long horn
      // claws splayed on the sprawl with the web scalloped between
      // their knuckles. The colossus sets an elephant footing: a
      // round column base rimmed with three BLUNT toenail wedges —
      // no web, no rake, just weight.
      const heavy = opts.defId === 'colossus_turtle';
      const W = spec.legW * (heavy ? 0.95 : 1.2) * (spec.footScale ?? 1);
      const curl = 1 - 0.3 * digitCurl;
      const skin = spec.legColor ?? opts.color;
      ctx.save();
      ctx.transform(ffx * s, ffy * s, fsx * s, fsy * s, ex, ey);
      if (heavy) {
        // The footing first, then the toenails ON its front rim — an
        // elephant's nails ride the visible face of the column base,
        // never hide beneath it (buried roots left only the tips
        // showing, and they read as scattered debris chips).
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -12));
        ctx.beginPath();
        ctx.ellipse(0.05 * W, 0, 0.78 * W, 0.68 * W, 0, 0, Math.PI * 2);
        ctx.fill();
        // The base's front rim catches the light — the column seats.
        ctx.strokeStyle = opts.hurt ? '#ffffff' : tone(shade(skin, 6));
        ctx.lineWidth = 0.09 * W;
        ctx.beginPath();
        ctx.ellipse(0.05 * W, 0, 0.64 * W, 0.55 * W, 0, -0.9, 0.9);
        ctx.stroke();
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone('#b9b193');
        for (const v of TURTLE_CLAW_FAN) {
          const rv = v * 0.95 * W;
          const u0 = 0.42 * W * curl;
          const tip = u0 + 0.58 * W * curl * (1 - 0.7 * away);
          ctx.beginPath();
          ctx.moveTo(u0, rv - 0.21 * W);
          ctx.lineTo(tip, rv - 0.12 * W + v * 0.12 * W);
          ctx.lineTo(tip, rv + 0.12 * W + v * 0.12 * W);
          ctx.lineTo(u0, rv + 0.21 * W);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Horn claws first — long, curved, fanned on the sprawl.
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone('#cfc49e');
        for (const v of TURTLE_CLAW_FAN) {
          const ru = (0.5 + 0.1 * (1 - Math.abs(v))) * W * curl;
          const rv = v * 0.95 * W;
          const cl = W * (0.62 - 0.24 * digitCurl) * (1 - 0.15 * Math.abs(v)) * (1 - 0.68 * away);
          const tu = ru + cl;
          const tv = rv + v * W * 0.5;
          ctx.beginPath();
          ctx.moveTo(ru, rv - 0.11 * W);
          ctx.quadraticCurveTo(ru + cl * 0.5, rv - 0.1 * W + (tv - rv) * 0.5, tu, tv);
          ctx.quadraticCurveTo(ru + cl * 0.45, rv + 0.11 * W + (tv - rv) * 0.5, ru, rv + 0.11 * W);
          ctx.closePath();
          ctx.fill();
        }
        // The webbed pad: heel arc, flank swell, and a leading edge
        // SCALLOPED between the claw knuckles — the web.
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -6));
        ctx.beginPath();
        ctx.moveTo(-0.38 * W, -0.62 * W);
        ctx.quadraticCurveTo(-0.75 * W, 0, -0.38 * W, 0.62 * W);
        ctx.quadraticCurveTo(0.1 * W, 0.95 * W, 0.52 * W * curl, 0.55 * W);
        ctx.quadraticCurveTo(0.34 * W * curl, 0.27 * W, 0.56 * W * curl, 0);
        ctx.quadraticCurveTo(0.34 * W * curl, -0.27 * W, 0.52 * W * curl, -0.55 * W);
        ctx.quadraticCurveTo(0.1 * W, -0.95 * W, -0.38 * W, -0.62 * W);
        ctx.closePath();
        ctx.fill();
        // Scaled skin: two quiet plate seams across the metatarsus.
        ctx.strokeStyle = 'rgba(14,18,10,0.25)';
        ctx.lineWidth = 0.05 * W;
        for (const u of [-0.05, 0.2] as const) {
          ctx.beginPath();
          ctx.moveTo(u * W, -0.42 * W);
          ctx.quadraticCurveTo((u + 0.14) * W, 0, u * W, 0.42 * W);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (spec.foot === 'crabspike') {
      // THE STILT TIP: a crab walks on the points of its armor — one
      // down-driven chitin dactyl per leg, no pad at all. A tapered
      // horn wedge on the ground bearing with a pale worn point and a
      // joint ring seating it on the shin; mid-swing the point curls
      // home, and seen from behind it foreshortens to a ferrule under
      // the leg (THE FOOT SITS UNDER ITS LEG holds at spike scale).
      const W = spec.legW * 1.1 * (spec.footScale ?? 1);
      const skin = spec.legColor ?? opts.color;
      ctx.save();
      ctx.transform(ffx * s, ffy * s, fsx * s, fsy * s, ex, ey);
      const tipL = W * (2.1 - 0.85 * digitCurl) * (1 - 0.62 * away);
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -14));
      ctx.beginPath();
      ctx.moveTo(-0.3 * W, -0.36 * W);
      ctx.quadraticCurveTo(tipL * 0.45, -0.3 * W, tipL, 0);
      ctx.quadraticCurveTo(tipL * 0.45, 0.3 * W, -0.3 * W, 0.36 * W);
      ctx.closePath();
      ctx.fill();
      // The worn point: one quiet chip a stilt leaves in the mud —
      // short and soft, or eight legs scatter pale debris everywhere.
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone('#b9b193');
      ctx.beginPath();
      ctx.moveTo(tipL * 0.72, -0.11 * W);
      ctx.lineTo(tipL, 0);
      ctx.lineTo(tipL * 0.72, 0.11 * W);
      ctx.closePath();
      ctx.fill();
      // Joint ring where the dactyl seats on the shin's armor.
      ctx.strokeStyle = 'rgba(14, 18, 10, 0.35)';
      ctx.lineWidth = 0.15 * W;
      ctx.beginPath();
      ctx.moveTo(-0.12 * W, -0.3 * W);
      ctx.quadraticCurveTo(0.02 * W, 0, -0.12 * W, 0.3 * W);
      ctx.stroke();
      ctx.restore();
    } else if (spec.foot === 'lizardclaw') {
      // THE SPRAWLED HAND: a basilisk plants a wide saurian foot —
      // three long toes fanned on the ground bearing, each a filled
      // tapered digit ending in a horn claw, with a low palm pad
      // seating the fan on the ankle. Ground-frame by law (the foot
      // knows the ground); mid-swing the digits CURL home and seen
      // from behind the fan foreshortens to a heel under the shin.
      const W = spec.legW * 1.2 * (spec.footScale ?? 1);
      const skin = spec.legColor ?? opts.color;
      ctx.save();
      ctx.transform(ffx * s, ffy * s, fsx * s, fsy * s, ex, ey);
      // The palm: a low pad behind the toe fan, the mass the digits
      // grow from — a fan with no palm reads as dropped twigs.
      ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -10));
      ctx.beginPath();
      ctx.ellipse(0.1 * W, 0, 0.62 * W, 0.52 * W, 0, 0, Math.PI * 2);
      ctx.fill();
      const toeL = W * (2.0 - 0.8 * digitCurl) * (1 - 0.62 * away);
      const clawL = W * 0.55 * (1 - 0.7 * away);
      for (const tv of [-0.42, 0, 0.42] as const) {
        // Each digit: its own bearing off the foot's, tapering from
        // palm knuckle to tip — filled muscle, never a scratch line.
        const ca = tv * (1 - 0.3 * digitCurl);
        const dx = Math.cos(ca);
        const dy = Math.sin(ca) * 0.9;
        const tx = dx * toeL;
        const ty = dy * toeL;
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone(shade(skin, -16));
        ctx.beginPath();
        ctx.moveTo(-dy * 0.24 * W, dx * 0.24 * W);
        ctx.quadraticCurveTo(tx * 0.5 - dy * 0.2 * W, ty * 0.5 + dx * 0.2 * W, tx, ty);
        ctx.quadraticCurveTo(tx * 0.5 + dy * 0.2 * W, ty * 0.5 - dx * 0.2 * W, dy * 0.24 * W, -dx * 0.24 * W);
        ctx.closePath();
        ctx.fill();
        // The claw: one pale horn wedge riding the digit's own tip —
        // short and worn (six feet scatter debris otherwise).
        ctx.fillStyle = opts.hurt ? '#ffffff' : tone('#b6ad8c');
        ctx.beginPath();
        ctx.moveTo(tx - dy * 0.1 * W, ty + dx * 0.1 * W);
        ctx.lineTo(tx + dx * clawL, ty + dy * clawL);
        ctx.lineTo(tx + dy * 0.1 * W, ty - dx * 0.1 * W);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Paw chip: a ground oval set toes-forward of the ankle on the
      // facing's bearing, its leading edge split by two soft digit
      // seams — the read of a paw at the cost the zoom can afford.
      const W = spec.legW * 1.35 * (spec.footScale ?? 1);
      ctx.save();
      ctx.transform(ffx * s, ffy * s, fsx * s, fsy * s, ex, ey);
      ctx.fillStyle = tone(footColor);
      ctx.beginPath();
      ctx.ellipse(0.22 * W * (1 - 0.2 * digitCurl), 0, 0.68 * W, 0.5 * W, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = opts.hurt ? '#ffffff' : tone(shade(spec.legColor ?? legBase, -30));
      ctx.lineWidth = 0.06 * W;
      for (const v of [-0.2, 0.2] as const) {
        ctx.beginPath();
        ctx.moveTo(0.5 * W, v * W * 1.4);
        ctx.lineTo(0.8 * W, v * W * 2.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    };
    if (Math.sin(footA) < 0) {
      paintFoot();
      paintShin();
    } else {
      paintShin();
      paintFoot();
    }
  };
  // Depth split by where each foot ACTUALLY is, not its rest pose —
  // during a turn a planted foot can be anywhere around the body, and
  // classifying by home spec is what drew legs across faces. The line
  // a foot must cross to paint IN FRONT is the body's NEAR silhouette
  // edge, not its center: facing to or away from the camera the whole
  // leg column stands inside the hull's footprint, so it tucks BEHIND
  // the mass and emerges below the belly — split at the center, the
  // near legs painted their thighs across the chest face. The margin
  // walks out with |fy|, so profile keeps the flank-overlap split and
  // the swap always lands where the leg crosses the silhouette (where
  // both orders paint the same pixels).
  const farLegs: number[] = [];
  const nearLegs: number[] = [];
  const nearEdge = by + Math.abs(fy) * len * 0.85 * ys;
  // THE SHELL OWNS ITS LEGS: a turtle's hull overhangs every foot at
  // every band, so the foot-position split flickers — a swinging
  // foot crosses the silhouette line mid-stride and the leg PHASES
  // through the shell. Shell-mounted legs classify by the HIP's
  // body-frame seat instead (stable per facing, slews smoothly with
  // the body): near-half hips paint over the skirt, far-half hips
  // tuck behind the keep. Every other beast keeps the foot rule —
  // their bodies never overhang the stride.
  // The crabs join the turtles here: a carapace overhangs every foot
  // at every band, so the foot rule flickers on them the same way.
  // The basilisks join too: a sprawled trunk wider than its stance
  // overhangs the short legs at every band.
  const shellMount =
    opts.defId.endsWith('_turtle') || opts.defId.endsWith('crab') || opts.defId.endsWith('basilisk');
  for (let i = 0; i < spec.rig.legs.length; i++) {
    if (shellMount) {
      const leg = spec.rig.legs[i]!;
      const hipDepth = fy * leg.fwd * spec.hipFwd + py * leg.side * spec.hipSide;
      // THE MARGIN TUCKS BEHIND: every hip sits strictly INSIDE the
      // hull's footprint (hipFwd/hipSide < 1), so a near-classified
      // leg paints over the shell face from its hip down — honest
      // only when the hip is deep enough toward the camera that the
      // leg emerges under the skirt. A hip riding the silhouette
      // tangent (the quarter bands) drew its whole leg ACROSS the
      // flank; the near verdict now demands real depth margin, and
      // everything marginal tucks behind the keep.
      (hipDepth < spec.bodyLen * 0.15 ? farLegs : nearLegs).push(i);
    } else {
      ((opts.feet[i]?.y ?? opts.y) < nearEdge ? farLegs : nearLegs).push(i);
    }
  }
  // ---- paint closures, composed in true depth order below. (The
  // per-entity seed hash is hoisted above the legs — the limb painter
  // shares it.)
  const cattle = CATTLE_LOOKS[opts.defId];
  const wolfL = opts.defId === 'wolf' ? WOLF_LOOK : undefined;
  const direL =
    opts.defId === 'dire_wolf'
      ? DIREWOLF_LOOK
      : opts.defId === 'wolf_oldfang'
        ? OLDFANG_LOOK
        : undefined;
  const feyL = opts.defId === 'fey_wolf' ? FEYWOLF_LOOK : undefined;
  const worgL = opts.defId === 'worg' ? WORG_LOOK : undefined;
  const ratL = opts.defId === 'rat' ? RAT_LOOK : undefined;
  const boarL =
    opts.defId === 'boar' ? BOAR_LOOK : opts.defId === 'dire_boar' ? DIREBOAR_LOOK : undefined;
  const spiderL = opts.defId === 'giant_spider' ? SPIDER_LOOK : undefined;
  const ramL = opts.defId === 'ram' ? RAM_LOOK : undefined;
  const sheepL = opts.defId === 'sheep' ? SHEEP_LOOK : undefined;
  const stagL =
    opts.defId === 'stag' ? STAG_LOOK : opts.defId === 'hind' ? HIND_LOOK : undefined;
  const courserL =
    opts.defId.startsWith('courser') || opts.defId.startsWith('garron')
      ? (COURSER_LOOKS[opts.defId] ?? COURSER_LOOKS.courser_bay)
      : undefined;
  const sabercatL = opts.defId.startsWith('sabercat')
    ? (SABERCAT_LOOKS[opts.defId] ?? SABERCAT_LOOKS.sabercat_night)
    : undefined;
  // The tufted shadows: wild cats roll a coat CLUSTER from the spawn
  // eid; the duskruff holds her authored design.
  const lynxL = opts.defId.startsWith('lynx') ? lynxLook(opts.defId, opts.seed ?? 0) : undefined;
  // The skulk rolls the four wild coats; the smokebrush vixen holds
  // hers. (Already resolved for the stocking law — the cache pays.)
  const foxL = foxLegL;
  const bearL = opts.defId === 'bear' ? BEAR_LOOK : undefined;
  const crabL = opts.defId === 'mudcrab' ? CRAB_LOOK : undefined;
  const giantCrabL = opts.defId === 'giant_crab' ? GIANTCRAB_LOOK : undefined;
  const beetleL = opts.defId === 'giant_beetle' ? BEETLE_LOOK : undefined;
  const turtleL =
    opts.defId === 'giant_turtle'
      ? TURTLE_LOOK
      : opts.defId === 'colossus_turtle'
        ? COLOSSUS_LOOK
        : undefined;
  // The stone court: rolled hide clusters, already resolved for the
  // stocking law — the cache pays.
  const basiliskL = basiliskLegL;
  const idle = 1 - opts.pose.poleStrength;
  const now = opts.nowMs ?? 0;
  const blockFrame = (): BeastBlockFrame => ({
    bx,
    gy: by,
    s,
    fx,
    fy,
    ys,
    seed,
    hurt: opts.hurt,
    bob: opts.pose.bob,
    roll,
  });
  const paintBody = (): void => {
    if (basiliskL) {
      paintBasiliskBody(ctx, spec, basiliskL, blockFrame());
      return;
    }
    if (lynxL) {
      paintLynxBody(ctx, spec, lynxL, blockFrame());
      return;
    }
    if (foxL) {
      paintFoxBody(ctx, spec, foxL, blockFrame());
      return;
    }
    if (wolfL) {
      paintWolfBody(ctx, spec, wolfL, blockFrame());
      return;
    }
    if (direL) {
      paintDireWolfBody(ctx, spec, direL, blockFrame());
      return;
    }
    if (feyL) {
      paintFeyWolfBody(ctx, spec, feyL, blockFrame());
      return;
    }
    if (worgL) {
      paintWorgBody(ctx, spec, worgL, blockFrame());
      return;
    }
    if (ratL) {
      paintRatBody(ctx, spec, ratL, blockFrame());
      return;
    }
    if (boarL) {
      // THE HACKLES STAND: the charge windup erects the hedge crest.
      paintBoarBody(ctx, spec, boarL, blockFrame(), at > 0 ? Math.min(1, at / 0.5) : 0);
      return;
    }
    if (spiderL) {
      paintSpiderBody(ctx, spec, spiderL, blockFrame(), at);
      return;
    }
    if (ramL) {
      paintRamBody(ctx, spec, ramL, blockFrame());
      return;
    }
    if (sheepL) {
      paintSheepBody(ctx, spec, sheepL, blockFrame(), opts.shorn === true);
      return;
    }
    if (stagL) {
      paintStagBody(ctx, spec, stagL, blockFrame());
      return;
    }
    if (courserL) {
      paintCourserBody(ctx, spec, courserL, blockFrame(), saddleFor(opts.defId));
      return;
    }
    if (sabercatL) {
      paintSabercatBody(ctx, spec, sabercatL, blockFrame());
      return;
    }
    if (bearL) {
      paintBearBody(ctx, spec, bearL, blockFrame());
      return;
    }
    if (crabL) {
      // The mudcrab's live stalks ride the caller's ear sim too (the
      // giant crab's contract, pebble-sized).
      paintCrabBody(ctx, spec, crabL, blockFrame(), at, now, opts.ears);
      return;
    }
    if (giantCrabL) {
      // THE TIDE'S RAMPART: the body painter runs hull + far claw;
      // the near claws are composed TOPMOST below, after the near
      // legs — a stilt must never cross the crusher. The live stalks
      // ride the caller's ear sim (fox-ear contract).
      paintGiantCrabBody(ctx, spec, giantCrabL, blockFrame(), at, now, opts.ears, true);
      return;
    }
    if (beetleL) {
      paintBeetleBody(ctx, spec, beetleL, blockFrame(), at);
      return;
    }
    if (turtleL) {
      paintTurtleBody(ctx, spec, turtleL, blockFrame());
      return;
    }
    if (cattle) {
      paintCattleBody(ctx, spec, cattle, {
        bx,
        gy: by,
        s,
        fx,
        fy,
        ys,
        seed,
        hurt: opts.hurt,
        bob: opts.pose.bob,
        roll,
        backH: cattle.backH,
        bellyH: cattle.bellyH,
      });
      return;
    }
    // Faceted low-poly mass along the facing — same dialect as the
    // boulders and canopies.
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(bx, bodyY);
    ctx.rotate(opts.dir + roll);
    ctx.beginPath();
    facetBlob(ctx, 0, 0, len, seed, 9, (r * 0.78) / len, 0.4);
    ctx.fill();
    // Flat back highlight facet.
    ctx.fillStyle = opts.hurt ? '#ffffff' : shade(opts.color, 14);
    ctx.beginPath();
    facetBlob(ctx, -len * 0.15, -r * 0.25, len * 0.5, seed ^ 0x5f5f, 7, (r * 0.32) / (len * 0.5), 1.1);
    ctx.fill();
    ctx.restore();
  };

  // Head anchor: a chicken pecks its head forward with each step.
  const peck = opts.defId === 'chicken' ? opts.pose.bob * 1.6 : 0;
  const headX = bx + fx * (len * 0.92 + peck * s);
  const headY = bodyY + fy * (len * 0.35 + peck * s * ys) - r * 0.15;
  const headR = r * (opts.defId === 'chicken' ? 0.5 : 0.55);
  const paintHead = (): void => {
    if (spiderL) return; // the spider's face lives in its body painter
    if (crabL || giantCrabL || beetleL) return; // whole animal drawn by the body painter
    if (ramL) {
      const hl = spec.bodyLen * s;
      const hw2 = ramL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The charge drops the whole head into a battering line.
      const drop = at > 0 ? Math.min(1, at / 0.7) * 0.14 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.44);
      const chy = by + fy * (hl + hw2 * 0.44) * ys - ramL.backH * 0.98 * s - nod + drop;
      // Wool shoulder roll into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ramL.wool, -7);
      ctx.beginPath();
      const nb = ramL.backH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * ramL.bodyW * 0.6 * s;
      const nwy = py * ramL.bodyW * 0.6 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.9);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.9);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + ramL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + ramL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      drawRamHead(ctx, ramL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        charge: at > 0 ? Math.min(1, at * 1.6) : 0,
      });
      return;
    }
    if (sheepL) {
      const shorn = opts.shorn === true;
      const backH = shorn ? sheepL.backHShorn : sheepL.backH;
      const tone = shorn ? sheepL.woolShorn : sheepL.wool;
      const hl = spec.bodyLen * s;
      const hw2 = sheepL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The graze: at rest the head sinks toward the grass on its own
      // slow clock — the yard's idle life, and it lifts on the move.
      const graze =
        now > 0 ? Math.max(0, Math.sin(now * 0.00042 + seed * 1.3)) * idle * 0.16 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.42);
      const chy = by + fy * (hl + hw2 * 0.42) * ys - backH * 0.92 * s - nod + graze;
      // Wool ruff into the skull — the clipped body keeps a thinner one.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(tone, -7);
      ctx.beginPath();
      const nb = backH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * sheepL.bodyW * (shorn ? 0.45 : 0.58) * s;
      const nwy = py * sheepL.bodyW * (shorn ? 0.45 : 0.58) * s;
      ctx.moveTo(bx + fx * hl * 0.7 + nwx, by + (fy * hl * 0.7 + nwy) * ys - nb * 0.88);
      ctx.lineTo(bx + fx * hl * 0.7 - nwx, by + (fy * hl * 0.7 - nwy) * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + sheepL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + sheepL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      drawSheepHead(ctx, sheepL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        capTone: tone,
      });
      return;
    }
    if (stagL) {
      const hl = spec.bodyLen * s;
      const hw2 = stagL.headW * s;
      const nod = opts.pose.bob * 0.4 * s;
      // The alarm-charge levels the antlers: the high head drops.
      const drop = at > 0 ? Math.min(1, at / 0.7) * 0.2 * s : 0;
      const chx = bx + fx * (hl * 0.9 + hw2 * 0.5);
      const chy =
        by + fy * (hl * 0.9 + hw2 * 0.5) * ys - (stagL.backH + stagL.neckRise) * s - nod + drop;
      // The neck column — the proud riser that makes a deer read deer.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(stagL.coat, -6);
      ctx.beginPath();
      const nb = stagL.backH * 0.92 * s + opts.pose.bob * 0.35 * s;
      const nwx = px * stagL.bodyW * 0.52 * s;
      const nwy = py * stagL.bodyW * 0.52 * s;
      ctx.moveTo(bx + fx * hl * 0.68 + nwx, by + (fy * hl * 0.68 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.68 - nwx, by + (fy * hl * 0.68 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.32, chy - py * hw2 * 0.32 * ys + stagL.headH * s * 0.3);
      ctx.lineTo(chx + px * hw2 * 0.32, chy + py * hw2 * 0.32 * ys + stagL.headH * s * 0.3);
      ctx.closePath();
      ctx.fill();
      drawStagHead(ctx, stagL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (courserL) {
      const hl = spec.bodyLen * s;
      const hw2 = courserL.headW * s;
      const nod = opts.pose.bob * 0.45 * s;
      // The head rides HIGH on the neck: not far past the chest, but
      // well above the back line — the proud carriage that separates
      // horse from hound at a glance.
      const chx = bx + fx * (hl * 0.86 + hw2 * 0.3);
      const chy =
        by +
        fy * (hl * 0.86 + hw2 * 0.3) * ys -
        (courserL.backH + courserL.neckRise) * s -
        nod;
      // The neck: a strong arched column off the withers, wide at the
      // shoulder, tapering under the jaw.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(courserL.coat, -5);
      ctx.beginPath();
      const nb = courserL.backH * 0.88 * s + opts.pose.bob * 0.35 * s;
      const nwx = px * courserL.bodyW * 0.78 * s;
      const nwy = py * courserL.bodyW * 0.78 * s;
      ctx.moveTo(bx + fx * hl * 0.6 + nwx, by + (fy * hl * 0.6 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.6 - nwx, by + (fy * hl * 0.6 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.3, chy - py * hw2 * 0.3 * ys + courserL.headH * s * 0.42);
      ctx.lineTo(chx + px * hw2 * 0.3, chy + py * hw2 * 0.3 * ys + courserL.headH * s * 0.42);
      ctx.closePath();
      ctx.fill();
      // The mane: the crest line first, then the fall — hung to one
      // seed-stable side so it reads at every facing.
      if (!opts.hurt) {
        ctx.strokeStyle = courserL.mane;
        ctx.lineCap = 'round';
        // Crest: one continuous stroke withers → poll.
        ctx.lineWidth = Math.max(2, s * 0.055);
        ctx.beginPath();
        ctx.moveTo(bx + fx * hl * 0.62, by + fy * hl * 0.62 * ys - nb - s * 0.02);
        ctx.quadraticCurveTo(
          bx + fx * hl * 0.78,
          by + fy * hl * 0.78 * ys - nb - courserL.neckRise * s * 0.75,
          chx - fx * hw2 * 0.2,
          chy - fy * hw2 * 0.2 * ys - courserL.headH * s * 0.3,
        );
        ctx.stroke();
        // The fall: a hanging ribbon of hair off the crest's rear
        // edge. Side-on it drapes BEHIND the neck line as one mass
        // (never a rope down the centerline); head-on it slims to the
        // top ridge. At speed the whole fall streams back.
        const run = opts.pose.poleStrength;
        const wxp = bx + fx * hl * 0.62;
        const wyp = by + fy * hl * 0.62 * ys - nb - s * 0.02;
        const pxp = chx - fx * hw2 * 0.2;
        const pyp = chy - fy * hw2 * 0.2 * ys - courserL.headH * s * 0.3;
        const cqx = bx + fx * hl * 0.78;
        const cqy = by + fy * hl * 0.78 * ys - nb - courserL.neckRise * s * 0.75;
        const slim = 0.35 + 0.65 * Math.min(1, Math.abs(fx) * 1.2);
        const offx = -fx * s * (0.055 + 0.05 * run) * slim;
        const offy = s * (0.11 - 0.04 * run) * slim;
        ctx.fillStyle = courserL.mane;
        ctx.beginPath();
        ctx.moveTo(wxp, wyp);
        ctx.quadraticCurveTo(cqx, cqy, pxp, pyp);
        ctx.lineTo(pxp + offx * 0.5, pyp + offy * 0.6);
        ctx.quadraticCurveTo(cqx + offx, cqy + offy, wxp + offx * 0.8, wyp + offy);
        ctx.closePath();
        ctx.fill();
        // Three loose strands off the ribbon's hem for texture.
        ctx.lineWidth = Math.max(1.5, s * 0.035);
        for (let k = 0; k < 3; k++) {
          const t = 0.2 + 0.3 * k;
          const hx = wxp + (pxp - wxp) * t + offx * (0.6 + 0.3 * (k % 2));
          const hy = wyp + (pyp - wyp) * t + offy * 0.8;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + offx * 0.6 - fx * s * 0.03 * run, hy + s * (0.05 + 0.015 * (k % 2)));
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // The rein: bit to pommel, sagging its own weight — tied, so
        // it never has to find a hand it can't see. Pale against the
        // coat (tack must READ), breathing with the gait.
        const bitX = chx + fx * hw2 * 0.5;
        const bitY = chy + fy * hw2 * 0.5 * ys + courserL.headH * s * 0.3;
        const pomX = bx + fx * COURSER_SADDLE.pommelFwd * s;
        const pomY = by + fy * COURSER_SADDLE.pommelFwd * s * ys - COURSER_SADDLE.pommelH * s;
        ctx.strokeStyle = shade(courserL.leather, 22);
        ctx.lineWidth = Math.max(1.5, s * 0.032);
        ctx.beginPath();
        ctx.moveTo(bitX, bitY);
        ctx.quadraticCurveTo(
          (bitX + pomX) / 2,
          (bitY + pomY) / 2 + s * 0.085 + nod * 0.5,
          pomX,
          pomY,
        );
        ctx.stroke();
      }
      drawCourserHead(ctx, courserL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (foxL) {
      // THE LISTENING CARRIAGE: the fox is the wood's one HIGH-headed
      // hunter — the skull rides alert above the topline on a slender
      // rising neck (the lynx hangs low off a slope, the wolf's neck
      // is a thick climbing keel; the fox PERKS). A run streamlines
      // it toward level, and the pounce windup drops it nose-down
      // into the mousing dive — the head telegraphs the leap the way
      // the whole species hunts: ears up, then straight down.
      const hl = spec.bodyLen * s;
      const hw2 = foxL.headW * s;
      const nod = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const dive = at > 0 ? Math.min(1, at / 0.7) * (foxL.champion ? 0.16 : 0.13) * s : 0;
      const perk = (foxL.champion ? 0.2 : 0.16) * (1 - run * 0.45) * s;
      const reach = hl * 0.98 + hw2 * 0.3;
      const chx = bx + fx * reach;
      const chy =
        by + fy * reach * ys - (foxL.backH + foxL.shoulderH) * s - perk - nod + dive;
      // The neck: a SLENDER rising wedge — never the wolf's keel.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(foxL.coat, -5);
      ctx.beginPath();
      const nb = (foxL.backH + foxL.shoulderH * 0.6) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * foxL.bodyW * 0.62 * s;
      const nwy = py * foxL.bodyW * 0.62 * s;
      ctx.moveTo(bx + fx * hl * 0.55 + nwx, by + (fy * hl * 0.55 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.55 - nwx, by + (fy * hl * 0.55 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.36, chy - py * hw2 * 0.36 * ys + foxL.headH * s * 0.32);
      ctx.lineTo(chx + px * hw2 * 0.36, chy + py * hw2 * 0.36 * ys + foxL.headH * s * 0.32);
      ctx.closePath();
      ctx.fill();
      // The pale throat riding the neck's front — the bib climbing to
      // the chin, camera-facing bands only.
      if (fy > -0.1 && !opts.hurt) {
        ctx.fillStyle = foxL.under;
        ctx.beginPath();
        ctx.moveTo(bx + fx * hl * 0.62 + nwx * 0.5, by + (fy * hl * 0.62 + nwy * 0.5) * ys - nb * 0.9);
        ctx.lineTo(bx + fx * hl * 0.62 - nwx * 0.5, by + (fy * hl * 0.62 - nwy * 0.5) * ys - nb * 0.9);
        ctx.lineTo(chx - px * hw2 * 0.18, chy - py * hw2 * 0.18 * ys + foxL.headH * s * 0.4);
        ctx.lineTo(chx + px * hw2 * 0.18, chy + py * hw2 * 0.18 * ys + foxL.headH * s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      // No hand-rolled flick: the elastic pair carries its own idle
      // sway, gait flap, and turn lag — physics, not a metronome.
      drawFoxHead(ctx, foxL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        nowMs: now > 0 ? now : undefined,
        ears: opts.ears,
      });
      return;
    }
    if (lynxL) {
      // THE PROWLER CARRIAGE: a cat's head never SITS on its
      // shoulders — it hangs FORWARD and LOW off them. The skull
      // rides level with the shoulder line at rest, drops with the
      // lope (the prowl), and sinks to the chest line through the
      // pounce windup while the high haunches stay coiled — the
      // stalking wedge every big-cat silhouette is built on. The
      // wolves carry their heads high on a rising neck; the lynx
      // must never borrow that.
      const hl = spec.bodyLen * s;
      const hw2 = lynxL.headW * s;
      const nod = opts.pose.bob * 0.4 * s;
      const run = opts.pose.poleStrength;
      const stalk =
        ((at > 0 ? Math.min(1, at / 0.7) * (lynxL.champion ? 0.1 : 0.08) : 0) + run * 0.035) * s;
      const reach = hl * 1.1 + hw2 * 0.34;
      const chx = bx + fx * reach;
      const chy = by + fy * reach * ys - (lynxL.backH * 0.94 + 0.02) * s - nod + stalk;
      // Neck: a thick coat wedge sloping DOWN-forward from the
      // shoulder top into the head sides — the descending line IS the
      // prowler read; the ruff does the rest at the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(lynxL.coat, -5);
      ctx.beginPath();
      const nb = (lynxL.backH + lynxL.shoulderH * 0.5) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * lynxL.bodyW * (lynxL.champion ? 0.95 : 0.85) * s;
      const nwy = py * lynxL.bodyW * (lynxL.champion ? 0.95 : 0.85) * s;
      ctx.moveTo(bx + fx * hl * 0.5 + nwx, by + (fy * hl * 0.5 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.5 - nwx, by + (fy * hl * 0.5 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.42, chy - py * hw2 * 0.42 * ys + lynxL.headH * s * 0.3);
      ctx.lineTo(chx + px * hw2 * 0.42, chy + py * hw2 * 0.42 * ys + lynxL.headH * s * 0.3);
      ctx.closePath();
      ctx.fill();
      // Idle ear flick: a rare quick pulse, never a metronome.
      const flick =
        now > 0 ? (Math.max(0, Math.sin(now * 0.0023 + seed) - 0.94) / 0.06) * idle : 0;
      drawLynxHead(ctx, lynxL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (sabercatL) {
      // The cat carries its head LOW and forward on a thick ruff — no
      // horse column: a broad short wedge off the shoulder rise.
      const hl = spec.bodyLen * s;
      const hw2 = sabercatL.headW * s;
      const nod = opts.pose.bob * 0.35 * s;
      const chx = bx + fx * (hl * 0.92 + hw2 * 0.3);
      const chy =
        by +
        fy * (hl * 0.92 + hw2 * 0.3) * ys -
        (sabercatL.backH + sabercatL.shoulderH + 0.2) * s -
        nod;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(sabercatL.coat, -4);
      ctx.beginPath();
      const nb = (sabercatL.backH + sabercatL.shoulderH * 0.8) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * sabercatL.bodyW * 0.8 * s;
      const nwy = py * sabercatL.bodyW * 0.8 * s;
      ctx.moveTo(bx + fx * hl * 0.62 + nwx, by + (fy * hl * 0.62 + nwy) * ys - nb);
      ctx.lineTo(bx + fx * hl * 0.62 - nwx, by + (fy * hl * 0.62 - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + sabercatL.headH * s * 0.34);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + sabercatL.headH * s * 0.34);
      ctx.closePath();
      ctx.fill();
      drawSabercatHead(ctx, sabercatL, { x: chx, y: chy, s, fx, fy, ys, hurt: opts.hurt });
      return;
    }
    if (basiliskL) {
      // THE COURT'S STRIKE: half landslide, half jaw. The body
      // surges on the damped pounce (massK 0.45) while the neck
      // spends the rest — the windup coils the skull HOME with the
      // gape opening (the tell every band can read), then the head
      // drives past the shoulder line and the jaws clamp shut. One
      // analytic curve, shared with the gape (the beat law).
      const hl = spec.bodyLen * s;
      const hw2 = basiliskL.headW * s;
      const nod = opts.pose.bob * 0.35 * s;
      let ext = 0;
      let gape = 0;
      if (at > 0) {
        if (at < 0.7) {
          const k = at / 0.7;
          ext = -k * 0.1 * s;
          gape = k;
        } else {
          const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
          ext = k * (basiliskL.elder ? 0.34 : 0.26) * s;
          gape = Math.max(0, 1 - (at - 0.7) / 0.15);
        }
      }
      // THE SCAN: at rest the gaze sweeps — the skull traverses on a
      // slow clock, the idle life of a hunter whose weapon is
      // looking. Walking, the sweep stands down.
      const scan = now > 0 ? Math.sin(now * 0.00035 + seed * 1.3) * idle : 0;
      // The carriage tucks mildly at the back bands: the head drops
      // toward the ridge shadow and reads smaller, never a balloon.
      const tuck = Math.min(1, Math.max(0, (-fy - 0.25) / 0.5));
      const reach = (hl * 0.95 + hw2 * 0.5) * (1 - 0.12 * tuck) + ext;
      const carry = basiliskL.headRise * s * (1 - 0.45 * tuck);
      const headS = s * (1 - 0.2 * tuck);
      const chx = bx + fx * reach + px * scan * hw2 * 0.3;
      const chy = by + fy * reach * ys + py * scan * hw2 * 0.3 * ys - carry - nod;
      // The neck: a thick saurian wedge out of the shoulder swell,
      // with the screen-space column core that keeps its depth at
      // profile (the turtle's neck law — a head on a ribbon floats).
      const rootF = hl * 0.72;
      const nb = basiliskL.bodyH * 0.74 * s + opts.pose.bob * 0.35 * s;
      const nwx = px * hw2 * 0.56;
      const nwy = py * hw2 * 0.56;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(basiliskL.hide, -2);
      ctx.lineWidth = Math.max(2, hw2 * 0.8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx + fx * rootF, by + fy * rootF * ys - nb * 0.76);
      ctx.lineTo(chx - fx * hw2 * 0.1, chy + basiliskL.headH * s * 0.08);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(basiliskL.hide, -2);
      ctx.beginPath();
      ctx.moveTo(bx + fx * rootF + nwx, by + (fy * rootF + nwy) * ys - nb);
      ctx.lineTo(bx + fx * rootF - nwx, by + (fy * rootF - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.48, chy - py * hw2 * 0.48 * ys + basiliskL.headH * s * 0.28);
      ctx.lineTo(chx + px * hw2 * 0.48, chy + py * hw2 * 0.48 * ys + basiliskL.headH * s * 0.28);
      ctx.closePath();
      ctx.fill();
      if (!opts.hurt && fy > 0.28) {
        // The pale throat runs the belly tone up under the jaw —
        // front reads only (the white-sleeve lesson).
        ctx.fillStyle = basiliskL.belly;
        ctx.beginPath();
        ctx.moveTo(bx + fx * rootF + nwx * 0.36, by + (fy * rootF + nwy * 0.36) * ys - nb * 0.82);
        ctx.lineTo(bx + fx * rootF - nwx * 0.36, by + (fy * rootF - nwy * 0.36) * ys - nb * 0.82);
        ctx.lineTo(chx - px * hw2 * 0.14, chy - py * hw2 * 0.14 * ys + basiliskL.headH * s * 0.44);
        ctx.lineTo(chx + px * hw2 * 0.14, chy + py * hw2 * 0.14 * ys + basiliskL.headH * s * 0.44);
        ctx.closePath();
        ctx.fill();
      }
      if (!opts.hurt && basiliskL.elder) {
        // The elder's neck wears stacked hide folds — each ring
        // rotated to the column's own screen axis (the dinner-plate
        // lesson from the mountain turtle, honored).
        const nA =
          Math.atan2(chy - (by + fy * rootF * ys - nb * 0.76), chx - (bx + fx * rootF)) +
          Math.PI / 2;
        ctx.strokeStyle = shade(basiliskL.hide, -18);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (const t of [0.3, 0.58]) {
          const wf = rootF + (reach - rootF) * t;
          const wh = nb * (1 - t) + (carry + nod - basiliskL.headH * s * 0.2) * t;
          const wx0 = bx + fx * wf;
          const wy0 = by + fy * wf * ys - wh;
          const ww = hw2 * (0.56 - 0.12 * t);
          ctx.beginPath();
          ctx.ellipse(wx0, wy0, ww, ww * 0.42, nA, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      drawBasiliskHead(ctx, basiliskL, {
        x: chx,
        y: chy,
        s: headS,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        gape,
        fen: basiliskL.fin,
      });
      return;
    }
    if (turtleL) {
      // THE SNAP: a turtle's strike lives in the NECK. The windup
      // draws the head HOME toward the shell mouth (the coil is the
      // tell), then the neck fires past the rim and the shear clamps
      // — the feet never leave their plants. One smooth curve start
      // to finish (the analytic-beat law), shared with the gape.
      const hl = spec.bodyLen * s;
      const hw2 = turtleL.headW * s;
      const nod = opts.pose.bob * 0.35 * s;
      let ext = 0;
      let gape = 0;
      if (at > 0) {
        if (at < 0.7) {
          const k = at / 0.7;
          ext = -k * 0.13 * s;
          gape = k;
        } else {
          const k = Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3));
          ext = k * (turtleL.ancient ? 0.4 : 0.32) * s;
          gape = Math.max(0, 1 - (at - 0.7) / 0.15);
        }
      }
      // THE BASK: at rest the head eases up sunward on a slow clock —
      // the idle life of a creature whose hurry is geological.
      const bask =
        now > 0 ? Math.max(0, Math.sin(now * 0.00022 + seed * 1.7)) * idle * 0.045 * s : 0;
      // THE KEEP HIDES THE HEAD: walking away, a snapper shows you
      // shell — the head settles low and draws in as the facing
      // crosses up-screen (smooth, so the tuck never pops), instead
      // of ballooning over the dome the way a raw carry projects.
      const tuck = Math.min(1, Math.max(0, (-fy - 0.25) / 0.5));
      const reach = (hl * 0.98 + hw2 * 0.42) * (1 - 0.14 * tuck) + ext;
      const carry = turtleL.headRise * s * (1 - 0.8 * tuck);
      // The head RECEDES as it tucks: walking away, the skull slides
      // into the shell's shadow and reads smaller — scaling the whole
      // head painter is the perspective truth of a neck drawing in.
      const headS = s * (1 - 0.28 * tuck);
      const chx = bx + fx * reach;
      const chy = by + fy * reach * ys - carry - nod - bask * (1 - tuck);
      // The neck: a thick hide column out of the shell's mouth — it
      // widens at the root (the keep swallows it whole on the tuck).
      const rootF = hl * 0.78;
      const nb = (turtleL.headRise + turtleL.shellH * 0.28) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * hw2 * 0.62;
      const nwy = py * hw2 * 0.62;
      // The column's core: a screen-space stroke shell-mouth → skull,
      // so the neck keeps its DEPTH at profile where the projected
      // quad thins to a ribbon (a head on a ribbon floats; a head on
      // a column belongs to the body).
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(turtleL.skin, -4);
      ctx.lineWidth = Math.max(2, hw2 * 0.88);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx + fx * rootF, by + fy * rootF * ys - nb * 0.72);
      ctx.lineTo(chx - fx * hw2 * 0.12, chy + turtleL.headH * s * 0.06);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(turtleL.skin, -4);
      ctx.beginPath();
      ctx.moveTo(bx + fx * rootF + nwx, by + (fy * rootF + nwy) * ys - nb);
      ctx.lineTo(bx + fx * rootF - nwx, by + (fy * rootF - nwy) * ys - nb);
      ctx.lineTo(chx - px * hw2 * 0.52, chy - py * hw2 * 0.52 * ys + turtleL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.52, chy + py * hw2 * 0.52 * ys + turtleL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      if (!opts.hurt) {
        // The pale throat under the column — a FRONT-facing read
        // only: at the profile bands the projected band lands on the
        // neck's middle and reads as a white sleeve, so it stays home
        // there (the jaw's pale underside carries the profile).
        if (fy > 0.28) {
          ctx.fillStyle = turtleL.throat;
          ctx.beginPath();
          ctx.moveTo(bx + fx * rootF + nwx * 0.38, by + (fy * rootF + nwy * 0.38) * ys - nb * 0.8);
          ctx.lineTo(bx + fx * rootF - nwx * 0.38, by + (fy * rootF - nwy * 0.38) * ys - nb * 0.8);
          ctx.lineTo(chx - px * hw2 * 0.16, chy - py * hw2 * 0.16 * ys + turtleL.headH * s * 0.42);
          ctx.lineTo(chx + px * hw2 * 0.16, chy + py * hw2 * 0.16 * ys + turtleL.headH * s * 0.42);
          ctx.closePath();
          ctx.fill();
        }
        // The telescoping hide: the snapper wears two fine wrinkle
        // rings; the mountain's neck is STACKED FOLDS — three heavy
        // rolls of old hide, each a full ring with its own shadow
        // line, the dragon-turtle mass the references carry.
        if (turtleL.ancient) {
          // Each fold is a RING around the neck's own axis — the
          // ellipse rotates with the column, or profile folds read
          // as a stack of dinner plates.
          const nA =
            Math.atan2(chy - (by + fy * rootF * ys - nb * 0.72), chx - (bx + fx * rootF)) +
            Math.PI / 2;
          for (const t of [0.22, 0.45, 0.68]) {
            const wf = rootF + (reach - rootF) * t;
            const wh = nb * (1 - t) + (carry + nod + bask - turtleL.headH * s * 0.24) * t;
            const wx0 = bx + fx * wf;
            const wy0 = by + fy * wf * ys - wh;
            const ww = hw2 * (0.62 - 0.16 * t);
            ctx.fillStyle = shade(turtleL.skin, -2 - Math.round(t * 8));
            ctx.beginPath();
            ctx.ellipse(wx0, wy0, ww, ww * 0.5 + hw2 * 0.2, nA, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = shade(turtleL.skin, -20);
            ctx.lineWidth = Math.max(1, s * 0.014);
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.ellipse(wx0, wy0 + ww * 0.18, ww * 0.92, ww * 0.42 + hw2 * 0.16, nA, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.strokeStyle = shade(turtleL.skin, -18);
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.globalAlpha = 0.5;
          for (const t of [0.3, 0.55]) {
            const wf = rootF + (reach - rootF) * t;
            const wh = nb * (1 - t) + (carry + nod + bask - turtleL.headH * s * 0.24) * t;
            const wx0 = bx + fx * wf;
            const wy0 = by + fy * wf * ys - wh;
            const ww = hw2 * (0.6 - 0.14 * t);
            ctx.beginPath();
            ctx.moveTo(wx0 - px * ww, wy0 - py * ww * ys);
            ctx.quadraticCurveTo(wx0, wy0 + s * 0.02, wx0 + px * ww, wy0 + py * ww * ys);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      drawTurtleHead(ctx, turtleL, {
        x: chx,
        y: chy,
        s: headS,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        gape,
      });
      return;
    }
    if (bearL) {
      const hl = spec.bodyLen * s;
      const hw2 = bearL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The head stays LOW — slung off the hump, dropping further
      // through the pounce windup.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.08 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.32);
      const chy = by + fy * (hl + hw2 * 0.32) * ys - bearL.backH * 0.82 * s - nod + stalk;
      // Thick fur neck from the hump into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(bearL.fur, -6);
      ctx.beginPath();
      const nb = (bearL.backH + bearL.humpH * 0.7) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * bearL.bodyW * 0.62 * s;
      const nwy = py * bearL.bodyW * 0.62 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.88);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.44, chy - py * hw2 * 0.44 * ys + bearL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.44, chy + py * hw2 * 0.44 * ys + bearL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      drawBearHead(ctx, bearL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2) : 0,
      });
      return;
    }
    if (boarL) {
      const hl = spec.bodyLen * s;
      const hw2 = boarL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // THE HEAD IS THE PROW: carried LOW, under the hump line — the
      // wedge's leading edge, not a periscope. The charge windup
      // drops it toward the ground lining up the tusks, then THE
      // GORE THROWS IT UP through the strike — the ripping upward
      // toss that is the whole verb of the species.
      const windup = at > 0 ? Math.min(1, at / 0.7) : 0;
      const throwK = at > 0.7 ? Math.sin(Math.PI * Math.min(1, (at - 0.7) / 0.3)) : 0;
      const drop = windup * 0.14 * s - throwK * 0.24 * s;
      const carry = (boarL.backH + boarL.humpH * 0.3) * 0.78;
      const chx = bx + fx * (hl + hw2 * 0.26);
      const chy = by + fy * (hl + hw2 * 0.26) * ys - carry * s - nod + drop;
      // THE BRISTLE COLLAR: the neck the crest rolls over — a hide-
      // toned wedge from the hump's shoulder line onto the crown (so
      // head and body are ONE mass at every band), wearing a SERRATED
      // mane strip along its top edge that hands the hedge crest off
      // to the skull. Never a flat dark curtain (the face-on window).
      const nb = (boarL.backH + boarL.humpH * 0.85) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * boarL.bodyW * 0.5 * s;
      const nwy = py * boarL.bodyW * 0.5 * s;
      const cAx = bx + fx * hl * 0.62 + nwx;
      const cAy = by + (fy * hl * 0.62 + nwy) * ys - nb * 0.9;
      const cBx = bx + fx * hl * 0.62 - nwx;
      const cBy = by + (fy * hl * 0.62 - nwy) * ys - nb * 0.9;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(boarL.hide, -4);
      ctx.beginPath();
      ctx.moveTo(cAx, cAy);
      ctx.lineTo(cBx, cBy);
      ctx.lineTo(chx - px * hw2 * 0.44, chy - py * hw2 * 0.44 * ys + boarL.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.44, chy + py * hw2 * 0.44 * ys + boarL.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      // The mane strip: short bristle teeth marching along the neck's
      // shoulder edge — the crest arriving at the crown.
      if (!opts.hurt) {
        ctx.fillStyle = boarL.bristle;
        const mane = 4;
        for (let mi = 0; mi < mane; mi++) {
          const t0 = mi / mane;
          const t1 = (mi + 1) / mane;
          const mx0 = cAx + (cBx - cAx) * t0;
          const my0 = cAy + (cBy - cAy) * t0;
          const mx1 = cAx + (cBx - cAx) * t1;
          const my1 = cAy + (cBy - cAy) * t1;
          const mh = s * boarL.crestH * 0.55;
          ctx.beginPath();
          ctx.moveTo(mx0, my0 + s * 0.015);
          ctx.lineTo((mx0 + mx1) / 2, (my0 + my1) / 2 - mh);
          ctx.lineTo(mx1, my1 + s * 0.015);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Hide throat under the collar: a hide quad seating the jaw.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(boarL.hide, -8);
      ctx.beginPath();
      ctx.moveTo(bx + fx * hl * 0.78 + nwx * 0.7, by + (fy * hl * 0.78 + nwy * 0.7) * ys - nb * 0.6);
      ctx.lineTo(bx + fx * hl * 0.78 - nwx * 0.7, by + (fy * hl * 0.78 - nwy * 0.7) * ys - nb * 0.6);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + boarL.headH * s * 0.34);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + boarL.headH * s * 0.34);
      ctx.closePath();
      ctx.fill();
      drawBoarHead(ctx, boarL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        charge: at > 0 ? Math.min(1, at * 1.6) : 0,
        seed,
      });
      return;
    }
    if (cattle) {
      const hl = spec.bodyLen * s;
      const hw2 = cattle.headW * s;
      // The head hangs off the shoulder line, nodding with the gait.
      const nod = opts.pose.bob * 0.5 * s;
      const chx = bx + fx * (hl + hw2 * 0.35);
      const chy =
        by + fy * (hl + hw2 * 0.35) * ys - cattle.backH * (opts.defId === 'bull' ? 0.72 : 0.78) * s - nod;
      // Neck: a hide quad from the chest top to the head sides.
      const nb = cattle.backH * s + opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(cattle.hide, -8);
      ctx.beginPath();
      const nwx = px * cattle.bodyW * 0.5 * s;
      const nwy = py * cattle.bodyW * 0.5 * s;
      ctx.moveTo(bx + fx * hl * 0.75 + nwx, by + (fy * hl * 0.75 + nwy) * ys - nb * 0.92);
      ctx.lineTo(bx + fx * hl * 0.75 - nwx, by + (fy * hl * 0.75 - nwy) * ys - nb * 0.92);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + cattle.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + cattle.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Idle cud-grind: a slow lateral figure the muzzle rides.
      const chew = now > 0 ? Math.sin(now * 0.005 + seed) * hw2 * 0.035 * idle : 0;
      drawCattleHead(ctx, cattle, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        chew,
      });
      return;
    }
    if (wolfL) {
      const hl = spec.bodyLen * s;
      const hw2 = wolfL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The head drops toward the ground through the pounce windup —
      // a stalking crouch that matches the body rocking back.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.08 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.42);
      const chy =
        by +
        fy * (hl + hw2 * 0.42) * ys -
        (wolfL.backH + wolfL.shoulderH * 0.6) * 1.12 * s -
        nod +
        stalk;
      // Neck: a coat quad from the shoulder top into the head sides.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(wolfL.coat, -8);
      ctx.beginPath();
      const nb = (wolfL.backH + wolfL.shoulderH) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * wolfL.bodyW * 0.55 * s;
      const nwy = py * wolfL.bodyW * 0.55 * s;
      ctx.moveTo(bx + fx * hl * 0.72 + nwx, by + (fy * hl * 0.72 + nwy) * ys - nb * 0.9);
      ctx.lineTo(bx + fx * hl * 0.72 - nwx, by + (fy * hl * 0.72 - nwy) * ys - nb * 0.9);
      ctx.lineTo(chx - px * hw2 * 0.36, chy - py * hw2 * 0.36 * ys + wolfL.headH * s * 0.24);
      ctx.lineTo(chx + px * hw2 * 0.36, chy + py * hw2 * 0.36 * ys + wolfL.headH * s * 0.24);
      ctx.closePath();
      ctx.fill();
      // No hand-rolled flick: the elastic pair carries its own idle
      // sway, gait flap, and turn lag — physics, not a metronome.
      drawWolfHead(ctx, wolfL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        nowMs: now > 0 ? now : undefined,
        ears: opts.ears,
      });
      return;
    }
    if (direL) {
      const hl = spec.bodyLen * s;
      const hw2 = direL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The matriarch stalks lower and longer than her pack through
      // the windup — the whole front end sinks toward the kill line.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.11 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.44);
      const chy =
        by +
        fy * (hl + hw2 * 0.44) * ys -
        (direL.backH + direL.shoulderH * 0.7) * 1.1 * s -
        nod +
        stalk;
      // The ruff: a thick coat quad off the withers into the head
      // sides, its lower edge breaking into fur chops — the storm
      // collar no lean wolf carries.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(direL.coat, -9);
      ctx.beginPath();
      const nb = (direL.backH + direL.shoulderH) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * direL.bodyW * 0.62 * s;
      const nwy = py * direL.bodyW * 0.62 * s;
      const rax = bx + fx * hl * 0.7;
      const ray = by + fy * hl * 0.7 * ys;
      ctx.moveTo(rax + nwx, ray + nwy * ys - nb * 0.88);
      ctx.lineTo(rax - nwx, ray - nwy * ys - nb * 0.88);
      ctx.lineTo(chx - px * hw2 * 0.4, chy - py * hw2 * 0.4 * ys + direL.headH * s * 0.26);
      ctx.lineTo(chx + px * hw2 * 0.4, chy + py * hw2 * 0.4 * ys + direL.headH * s * 0.26);
      ctx.closePath();
      ctx.fill();
      // Fur chops hanging off the ruff's throat line.
      if (!opts.hurt) {
        ctx.fillStyle = shade(direL.coat, -9);
        for (const cs of [-0.55, 0, 0.55]) {
          const chpx = chx - px * hw2 * 0.4 * cs - fx * hw2 * 0.18;
          const chpy =
            chy - (py * hw2 * 0.4 * cs + fy * hw2 * 0.18) * ys + direL.headH * s * 0.3;
          ctx.beginPath();
          ctx.moveTo(chpx - hw2 * 0.09, chpy - hw2 * 0.04);
          ctx.lineTo(chpx + hw2 * 0.09, chpy - hw2 * 0.04);
          ctx.lineTo(chpx, chpy + hw2 * 0.14);
          ctx.closePath();
          ctx.fill();
        }
      }
      drawDireWolfHead(ctx, direL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        nowMs: now > 0 ? now : undefined,
        ears: opts.ears,
      });
      return;
    }
    if (feyL) {
      const hl = spec.bodyLen * s;
      const hw2 = feyL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The court's hound barely stoops through the windup — a small
      // settle, nothing like the matriarch's kill-line sink. The
      // composure holds until the composure is the last thing you
      // read.
      const stalk = at > 0 ? Math.min(1, at / 0.7) * 0.06 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.4);
      // THE HIGHEST CARRIAGE: the skull rides further above the
      // withers than any canid in the wood — the swan neck the level
      // topline was built to offer.
      const chy =
        by +
        fy * (hl + hw2 * 0.4) * ys -
        (feyL.backH + feyL.shoulderH * 0.6) * 1.24 * s -
        nod +
        stalk;
      // Neck: a SLENDER upright quad — long and narrow where the
      // dire's ruff is storm mass.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(feyL.coat, -7);
      ctx.beginPath();
      const nb = (feyL.backH + feyL.shoulderH) * s + opts.pose.bob * 0.35 * s;
      const nwx = px * feyL.bodyW * 0.48 * s;
      const nwy = py * feyL.bodyW * 0.48 * s;
      const rax = bx + fx * hl * 0.76;
      const ray = by + fy * hl * 0.76 * ys;
      const nlx = chx - px * hw2 * 0.34;
      const nly = chy - py * hw2 * 0.34 * ys + feyL.headH * s * 0.26;
      const nrx = chx + px * hw2 * 0.34;
      const nry = chy + py * hw2 * 0.34 * ys + feyL.headH * s * 0.26;
      ctx.moveTo(rax + nwx, ray + nwy * ys - nb * 0.92);
      ctx.lineTo(rax - nwx, ray - nwy * ys - nb * 0.92);
      ctx.lineTo(nlx, nly);
      ctx.lineTo(nrx, nry);
      ctx.closePath();
      ctx.fill();
      // THE GORGET: the court's collar — a silver band crossing the
      // neck's lower third (worn gear, the collar law), with the
      // hanging gem at the forward station while the throat can face
      // the camera.
      if (!opts.hurt) {
        const gt = 0.62;
        const glx = rax + nwx + (nlx - (rax + nwx)) * gt;
        const gly = ray + nwy * ys - nb * 0.92 + (nly - (ray + nwy * ys - nb * 0.92)) * gt;
        const grx = rax - nwx + (nrx - (rax - nwx)) * gt;
        const gry = ray - nwy * ys - nb * 0.92 + (nry - (ray - nwy * ys - nb * 0.92)) * gt;
        ctx.strokeStyle = feyL.silver;
        ctx.lineWidth = Math.max(1.5, s * 0.045);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(glx, gly);
        ctx.lineTo(grx, gry);
        ctx.stroke();
        ctx.strokeStyle = feyL.silverDeep;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(glx, gly + s * 0.02);
        ctx.lineTo(grx, gry + s * 0.02);
        ctx.stroke();
        ctx.lineCap = 'butt';
        if (fy > -0.1) {
          const gmx = (glx + grx) / 2 + fx * s * 0.02;
          const gmy = (gly + gry) / 2 + s * 0.045;
          ctx.fillStyle = feyL.glimmer;
          ctx.beginPath();
          facetCircle(ctx, gmx, gmy, s * 0.032, 5, fx);
          ctx.fill();
        }
      }
      drawFeyWolfHead(ctx, feyL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        snarl: at > 0 ? Math.min(1, at * 2.2) : 0,
        nowMs: now > 0 ? now : undefined,
        ears: opts.ears,
      });
      return;
    }
    if (worgL) {
      const hl = spec.bodyLen * s;
      const hw2 = worgL.headW * s;
      const nod = opts.pose.bob * 0.5 * s;
      // The lunge THRUSTS the head forward off the low carriage — the
      // worg doesn't stalk down like a wolf, it snaps OUT.
      const thrust = at > 0 ? Math.min(1, at / 0.7) * 0.14 * s : 0;
      const chx = bx + fx * (hl + hw2 * 0.46 + thrust);
      // THE LOW CARRIAGE: the skull hangs well BELOW the withers peak —
      // the hyena head-slung read that makes the slope mean something.
      const chy =
        by + (fy * (hl + hw2 * 0.46) + fy * thrust * 0.5) * ys - worgL.shoulderH * 0.78 * s - nod;
      // Neck: a thick quad falling DOWN from the withers to the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(worgL.hide, -8);
      ctx.beginPath();
      const nb = worgL.shoulderH * s + opts.pose.bob * 0.35 * s;
      const nwx = px * worgL.bodyW * 0.6 * s;
      const nwy = py * worgL.bodyW * 0.6 * s;
      const rax = bx + fx * hl * 0.68;
      const ray = by + fy * hl * 0.68 * ys;
      ctx.moveTo(rax + nwx, ray + nwy * ys - nb * 0.95);
      ctx.lineTo(rax - nwx, ray - nwy * ys - nb * 0.95);
      ctx.lineTo(chx - px * hw2 * 0.38, chy - py * hw2 * 0.38 * ys + worgL.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.38, chy + py * hw2 * 0.38 * ys + worgL.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      const flick =
        now > 0 ? Math.max(0, Math.sin(now * 0.0026 + seed) - 0.92) / 0.08 * idle : 0;
      drawWorgHead(ctx, worgL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        gape: at > 0 ? Math.min(1, at * 2.2) : 0,
        flick,
      });
      return;
    }
    if (ratL) {
      const hl = spec.bodyLen * s;
      const hw2 = ratL.headW * s;
      // The head rides low off the shoulders, forever sniffing — a
      // busy little bob on its own clock, stilled by running.
      const sniff = now > 0 ? Math.sin(now * 0.004 + seed) * 0.012 * s * idle : 0;
      const chx = bx + fx * (hl + hw2 * 0.28);
      const chy =
        by + fy * (hl + hw2 * 0.28) * ys - 0.17 * s - opts.pose.bob * 0.3 * s + sniff;
      // Short neck wedge bridging the shoulder pinch into the skull.
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ratL.fur, -6);
      ctx.beginPath();
      const nwx = px * ratL.bodyW * 0.42 * s;
      const nwy = py * ratL.bodyW * 0.42 * s;
      ctx.moveTo(bx + fx * hl * 0.7 + nwx, by + (fy * hl * 0.7 + nwy) * ys - 0.22 * s);
      ctx.lineTo(bx + fx * hl * 0.7 - nwx, by + (fy * hl * 0.7 - nwy) * ys - 0.22 * s);
      ctx.lineTo(chx - px * hw2 * 0.34, chy - py * hw2 * 0.34 * ys + ratL.headH * s * 0.2);
      ctx.lineTo(chx + px * hw2 * 0.34, chy + py * hw2 * 0.34 * ys + ratL.headH * s * 0.2);
      ctx.closePath();
      ctx.fill();
      const twitch = now > 0 ? Math.sin(now * 0.02 + seed) * idle : 0;
      drawRatHead(ctx, ratL, {
        x: chx,
        y: chy,
        s,
        fx,
        fy,
        ys,
        hurt: opts.hurt,
        twitch,
      });
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    facetCircle(ctx, headX, headY, headR, 6, opts.dir + Math.PI / 6);
    ctx.fill();
    if (opts.defId === 'chicken') {
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.moveTo(headX + fx * headR * 0.8 - py * headR * 0.25, headY + fy * headR * 0.8 - py * headR * 0.25);
      ctx.lineTo(headX + fx * headR * 1.8, headY + fy * headR * 1.8);
      ctx.lineTo(headX + fx * headR * 0.8 + py * headR * 0.25, headY + fy * headR * 0.8 + py * headR * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d95763';
      ctx.beginPath();
      ctx.arc(headX - fx * headR * 0.1, headY - headR * 0.85, headR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    // Eyes track the facing — and a head facing away from the camera
    // SHOWS NO EYES. Painting them regardless put eyes on the back of
    // the skull whenever an animal looked up-screen.
    if (fy > -0.45) {
      ctx.fillStyle = OUTLINE;
      for (const es of [-1, 1]) {
        const eex = headX + fx * headR * 0.42 + es * px * headR * 0.35;
        const eey = headY + fy * headR * 0.42 + es * py * headR * 0.35;
        ctx.fillRect(eex - headR * 0.13, eey - headR * 0.15, headR * 0.26, headR * 0.3);
      }
    }
  };

  const paintTail = (): void => {
    if (spiderL || crabL || giantCrabL || beetleL) return;
    if (basiliskL) {
      // THE DRAGON TRAILER: the live game runs the full TailSim
      // chain (muscle, low carriage) painted by drawBasiliskTail.
      // The analytic spine below is THE ONE REST for sim-less
      // callers (portraits, CMS, sheets): exactly where it settles.
      if (opts.tail) {
        opts.tail();
        return;
      }
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const rootX = bx - fx * hl * 0.85;
      const rootY = by - fy * hl * 0.85 * ys - basiliskL.bodyH * 0.42 * s - lift * 0.6;
      const backA = Math.atan2(-fy * ys, -fx);
      const tLen = s * (basiliskL.elder ? 0.9 : basiliskL.fin ? 0.78 : 0.72);
      const sway = now > 0 ? Math.sin(now * 0.0008 + seed * 1.1) * 0.12 : 0;
      const cxq = rootX + Math.cos(backA + sway * 0.4) * tLen * 0.5;
      const cyq = rootY + Math.sin(backA + sway * 0.4) * tLen * 0.5 * ys + tLen * 0.24;
      const tipx = rootX + Math.cos(backA + sway) * tLen;
      const tipy = cyq + tLen * 0.2;
      const wk = s * (basiliskL.elder ? 0.085 : basiliskL.fin ? 0.06 : 0.07);
      const cone = taperedSpinePath(rootX, rootY, cxq, cyq, tipx, tipy, (t) => wk * (1 - 0.8 * t));
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(basiliskL.hide, -6);
      ctx.fill(cone);
      if (!opts.hurt) {
        // The ridge marches down the trailer — saw chips on the
        // stone line, fin waves on the fen.
        ctx.fillStyle = basiliskL.fin ? shade(basiliskL.horn, -4) : basiliskL.horn;
        for (const t of [0.18, 0.42, 0.64, 0.84]) {
          const u = 1 - t;
          const sxp = u * u * rootX + 2 * u * t * cxq + t * t * tipx;
          const syp = u * u * rootY + 2 * u * t * cyq + t * t * tipy;
          const sw = wk * (1 - 0.55 * t) * (basiliskL.fin ? 1.3 : 1);
          ctx.beginPath();
          ctx.moveTo(sxp - sw * 0.5, syp - sw * 0.3);
          if (basiliskL.fin) {
            ctx.quadraticCurveTo(sxp - sw * 0.1, syp - sw * 1.6, sxp + sw * 0.45, syp - sw * 0.3);
          } else {
            ctx.lineTo(sxp - sw * 0.05, syp - sw * 1.5);
            ctx.lineTo(sxp + sw * 0.5, syp - sw * 0.3);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }
    if (turtleL) {
      // THE SIMULATED TAIL: the live game runs the verlet stub (a
      // heavy, low-carried BobtailSim) painted by drawTurtleTail.
      // The analytic cone below is THE ONE REST for sim-less callers
      // (portraits, the CMS, corpses): exactly where the sim settles.
      if (opts.tail) {
        opts.tail();
        return;
      }
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const rootX = bx - fx * hl * 0.86;
      const rootY = by - fy * hl * 0.86 * ys - (turtleL.rimBot + 0.05) * s - lift * 0.6;
      const backA = Math.atan2(-fy * ys, -fx);
      const tLen = s * (turtleL.ancient ? 0.5 : 0.34);
      const sway = now > 0 ? Math.sin(now * 0.0009 + seed * 0.9) * 0.1 : 0;
      const cxq = rootX + Math.cos(backA + sway * 0.4) * tLen * 0.5;
      const cyq = rootY + Math.sin(backA + sway * 0.4) * tLen * 0.5 * ys + tLen * 0.22;
      const tipx = rootX + Math.cos(backA + sway) * tLen;
      const tipy = cyq + tLen * 0.16;
      const wk = s * (turtleL.ancient ? 0.075 : 0.06);
      const cone = taperedSpinePath(rootX, rootY, cxq, cyq, tipx, tipy, (t) => wk * (1 - 0.75 * t));
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(turtleL.skin, -6);
      ctx.fill(cone);
      if (!opts.hurt) {
        // The armored ridge: spikelets marching down the dorsal line.
        ctx.fillStyle = turtleL.spike;
        for (const t of [0.22, 0.52, 0.78]) {
          const u = 1 - t;
          const sxp = u * u * rootX + 2 * u * t * cxq + t * t * tipx;
          const syp = u * u * rootY + 2 * u * t * cyq + t * t * tipy;
          const sw = wk * (1 - 0.6 * t);
          ctx.beginPath();
          ctx.moveTo(sxp - sw * 0.5, syp - sw * 0.3);
          ctx.lineTo(sxp, syp - sw * 1.5);
          ctx.lineTo(sxp + sw * 0.5, syp - sw * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }
    if (ramL) {
      // A wool nub dropped off the fleece stern.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(ramL.wool, -5);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.02,
        by - fy * hl * 1.02 * ys - ramL.backH * 0.68 * s - lift,
        s * 0.045,
        5,
        seed * 0.3,
      );
      ctx.fill();
      return;
    }
    if (sheepL) {
      // The ewe's tail HANGS — a wool drop off the stern, low, where
      // the ram's nub perches high.
      const shorn = opts.shorn === true;
      const backH = shorn ? sheepL.backHShorn : sheepL.backH;
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(shorn ? sheepL.woolShorn : sheepL.wool, -6);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.0,
        by - fy * hl * 1.0 * ys - backH * 0.48 * s - lift,
        s * 0.05,
        5,
        seed * 0.4,
      );
      ctx.fill();
      return;
    }
    if (foxL) {
      // THE SIMULATED BRUSH: the live game runs the verlet plume
      // (TailSim + drawFoxBrush) — physics, not pose. The analytic
      // brush below survives only for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // THE BRUSH: nearly the body's own length, the biggest tail any
      // beast in the wood carries — a soft low arc off the rump,
      // streaming out level at a run, ending in the flag: white for
      // the skulk, smoke-over-ember for the queen. The read that
      // names the species at any zoom.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const sway = now > 0 ? Math.sin(now * 0.0016 + seed * 0.7) * 0.22 * (1 - run * 0.7) : 0;
      const tbx = bx - fx * hl * 0.96;
      const tby = by - fy * hl * 0.96 * ys - foxL.backH * 0.62 * s - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      const len = s * (foxL.champion ? 0.52 : 0.44);
      // Droop: a soft hanging arc at rest, lifting level for the run.
      const droop = (1 - run * 0.85) * 0.34;
      const cxq = tbx + Math.cos(backA + sway * 0.3) * len * 0.5;
      const cyq = tby + Math.sin(backA + sway * 0.3) * len * 0.5 * ys + len * droop;
      const tipx = tbx + Math.cos(backA + sway) * len;
      // The tip curls gently back UP out of the arc's low point.
      const tipy = cyq + len * (droop * 0.35) - len * 0.1 * (1 - run);
      const wk = s * (foxL.champion ? 0.066 : 0.056);
      const brush = taperedSpinePath(tbx, tby, cxq, cyq, tipx, tipy, (t) =>
        wk * (0.5 + 0.85 * Math.sin(Math.min(1, t * 1.08) * Math.PI)),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(foxL.coat, -4);
      ctx.fill(brush);
      if (!opts.hurt) {
        // The darker root third — volume, never a banded raccoon.
        ctx.strokeStyle = foxL.brushRoot;
        ctx.lineWidth = wk * 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tbx + (cxq - tbx) * 0.12, tby + (cyq - tby) * 0.12);
        ctx.lineTo(tbx + (cxq - tbx) * 0.6, tby + (cyq - tby) * 0.6);
        ctx.stroke();
        ctx.lineCap = 'butt';
        // The queen's ember ring, banded below her smoke tip.
        if (foxL.champion && foxL.ember) {
          ctx.strokeStyle = foxL.ember;
          ctx.lineWidth = Math.max(1.4, s * 0.03);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cxq + (tipx - cxq) * 0.5, cyq + (tipy - cyq) * 0.5);
          ctx.lineTo(cxq + (tipx - cxq) * 0.66, cyq + (tipy - cyq) * 0.66);
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }
      // The flag — the read that survives any zoom.
      ctx.fillStyle = opts.hurt ? '#ffffff' : foxL.tip;
      ctx.beginPath();
      facetCircle(ctx, tipx, tipy, s * (foxL.champion ? 0.05 : 0.044), 5, seed * 0.5);
      ctx.fill();
      return;
    }
    if (lynxL) {
      // THE SIMULATED BOB: the live game runs the verlet stub
      // (BobtailSim) — physics, not pose. The analytic stub below
      // survives only for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // THE BOBTAIL: a stub perched HIGH on the raised rump, black at
      // the tip — nothing like the wolf's hanging brush or the
      // sabercat's long sweep. It flicks upright when the cat is
      // wound (idle interest, the pounce crouch), and tucks flat at a
      // flat run.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const rumpH = (lynxL.backH + lynxL.haunchH) * s;
      const flickT = now > 0 ? Math.max(0, Math.sin(now * 0.0017 + seed * 0.8) - 0.5) * 2 : 0;
      // Perk: upright at idle and through the crouch, flat at speed.
      const perk = Math.min(1, (1 - run * 0.85) + at * 0.8) * (0.55 + 0.3 * flickT);
      const tbx = bx - fx * hl * 0.98;
      const tby = by - fy * hl * 0.98 * ys - rumpH * 0.9 - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      const len = s * (lynxL.champion ? 0.17 : 0.14);
      const sway = now > 0 ? Math.sin(now * 0.0021 + seed) * 0.2 * (1 - run) : 0;
      // The stub rides back-and-UP: its tip lifts with the perk.
      const tipx = tbx + Math.cos(backA + sway) * len * (1 - perk * 0.45);
      const tipy =
        tby + Math.sin(backA + sway) * len * (1 - perk * 0.45) * ys - len * (0.45 + perk * 0.75);
      const cxq = tbx + Math.cos(backA) * len * 0.5;
      const cyq = tby + Math.sin(backA) * len * 0.5 * ys - len * perk * 0.3;
      const stub = taperedSpinePath(tbx, tby, cxq, cyq, tipx, tipy, (t) =>
        s * (lynxL.champion ? 0.052 : 0.042) * (1 - t * 0.25),
      );
      // Walking away the perked stub stands against the cat's own
      // back — show its pale UNDERSIDE there, or the dark tip reads
      // as a hole punched in the coat.
      ctx.fillStyle = opts.hurt ? '#ffffff' : fy < -0.2 ? lynxL.under : shade(lynxL.coat, -3);
      ctx.fill(stub);
      // The black tip — the read that survives any zoom.
      ctx.fillStyle = opts.hurt ? '#ffffff' : lynxL.tuft;
      ctx.beginPath();
      facetCircle(ctx, tipx, tipy, s * (lynxL.champion ? 0.042 : 0.034), 5, seed * 0.4);
      ctx.fill();
      // The duskruff banded in silver below her black tip.
      if (lynxL.champion && !opts.hurt && lynxL.grizzle) {
        ctx.strokeStyle = lynxL.grizzle;
        ctx.lineWidth = Math.max(1.4, s * 0.03);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tbx + (tipx - tbx) * 0.55, tby + (tipy - tby) * 0.55);
        ctx.lineTo(tbx + (tipx - tbx) * 0.72, tby + (tipy - tby) * 0.72);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      return;
    }
    if (sabercatL) {
      // THE SIMULATED SWEEP: the live game runs the verlet chain
      // (TailSim + drawSabercatTail) — physics, not pose. The
      // analytic sweep below is THE ONE REST for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // The feline tail: one long low sweep off the haunch, curling UP
      // at the tip — swaying at rest, streaming flat at speed, dark
      // banding near the end.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const sway = now > 0 ? Math.sin(now * 0.0014 + seed * 0.9) * (1 - run * 0.7) : 0;
      const tbx = bx - fx * hl * 0.98;
      const tby = by - fy * hl * 0.98 * ys - sabercatL.backH * 0.7 * s - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      const len = s * 0.42;
      const droop = (1 - run * 0.8) * 0.3;
      const midx = tbx + Math.cos(backA + sway * 0.25) * len * 0.55;
      const midy = tby + Math.sin(backA + sway * 0.25) * len * 0.55 * ys + len * droop;
      const tipx = tbx + Math.cos(backA + sway * 0.4) * len;
      // The curl: the tip lifts back up past the sweep's low point.
      const tipy = midy - len * (0.22 + 0.1 * (1 - run)) + Math.sin(backA) * len * 0.3 * ys;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : sabercatL.coat;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(midx, midy, tipx, tipy);
      ctx.stroke();
      // Dark tip band.
      if (!opts.hurt) {
        ctx.strokeStyle = sabercatL.stripe;
        ctx.lineWidth = Math.max(2, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(midx + (tipx - midx) * 0.6, midy + (tipy - midy) * 0.6);
        ctx.quadraticCurveTo(
          midx + (tipx - midx) * 0.8,
          midy + (tipy - midy) * 0.8,
          tipx,
          tipy,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    if (courserL) {
      // THE SIMULATED FALL: the live game runs the verlet chain
      // (TailSim + drawHorseTail) — physics, not pose. The analytic
      // drape below is THE ONE REST for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // The tail: a full fall of hair off the croup, streaming back
      // with speed, swishing on its own clock at rest.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const run = opts.pose.poleStrength;
      const swish = now > 0 ? Math.sin(now * 0.0011 + seed * 0.7) * (1 - run) : 0;
      const tbx = bx - fx * hl * 1.0;
      const tby = by - fy * hl * 1.0 * ys - courserL.backH * 0.9 * s - lift;
      const backA = Math.atan2(-fy * ys, -fx);
      // The fall has MASS: a filled tapered drape first, so the tail
      // reads as hair from every facing — straight from behind it is
      // a full dark fall down the croup, never three shadow threads.
      // It ends above the hocks; a tail that touches the ground reads
      // as a fourth shadow, not a tail.
      const droop = (1 - run * 0.75) * 0.5 + 0.22;
      const len = s * 0.3;
      const a0 = backA + swish * 0.22;
      const tipx = tbx + Math.cos(a0) * len;
      const tipy = tby + Math.sin(a0) * len * ys + len * droop;
      const pxr = -Math.sin(a0);
      const pyr = Math.cos(a0);
      const w0 = s * 0.06;
      const w1 = s * 0.026;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(courserL.mane, 18);
      ctx.beginPath();
      ctx.moveTo(tbx + pxr * w0, tby + pyr * w0);
      ctx.quadraticCurveTo(
        tbx + Math.cos(a0) * len * 0.5 + pxr * w0,
        tby + Math.sin(a0) * len * 0.5 * ys + len * droop * 0.3 + pyr * w0,
        tipx + pxr * w1,
        tipy + pyr * w1,
      );
      ctx.lineTo(tipx - pxr * w1, tipy - pyr * w1);
      ctx.quadraticCurveTo(
        tbx + Math.cos(a0) * len * 0.5 - pxr * w0,
        tby + Math.sin(a0) * len * 0.5 * ys + len * droop * 0.3 - pyr * w0,
        tbx - pxr * w0,
        tby - pyr * w0,
      );
      ctx.closePath();
      ctx.fill();
      // Two strands over the mass keep the hair read.
      ctx.strokeStyle = opts.hurt ? '#ffffff' : courserL.mane;
      ctx.lineCap = 'round';
      for (const k of [-1, 1]) {
        const a = a0 + k * 0.14;
        const kl = len * 0.94;
        const tex = tbx + Math.cos(a) * kl;
        const tey = tby + Math.sin(a) * kl * ys + kl * droop;
        ctx.lineWidth = Math.max(1.5, s * 0.038);
        ctx.beginPath();
        ctx.moveTo(tbx, tby);
        ctx.quadraticCurveTo(
          tbx + Math.cos(a) * kl * 0.5,
          tby + Math.sin(a) * kl * 0.5 * ys + kl * droop * 0.3,
          tex,
          tey,
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    if (stagL) {
      // The white flick riding the rump patch, twitching at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const flick = now > 0 ? Math.max(0, Math.sin(now * 0.0019 + seed) - 0.9) / 0.1 : 0;
      const tbx = bx - fx * hl * 1.0;
      const tby = by - fy * hl * 1.0 * ys - stagL.backH * 0.82 * s - lift;
      ctx.fillStyle = opts.hurt ? '#ffffff' : stagL.rump;
      ctx.beginPath();
      ctx.moveTo(tbx - px * s * 0.03, tby);
      ctx.lineTo(tbx - fx * s * 0.045 + px * flick * s * 0.03, tby + s * (0.085 - flick * 0.03));
      ctx.lineTo(tbx + px * s * 0.03, tby);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (bearL) {
      // Barely a tail at all — a fur nub lost in the rump.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(bearL.fur, -4);
      ctx.beginPath();
      facetCircle(
        ctx,
        bx - fx * hl * 1.0,
        by - fy * hl * 1.0 * ys - bearL.backH * 0.6 * s - lift,
        s * 0.038,
        5,
        seed * 0.3,
      );
      ctx.fill();
      return;
    }
    if (boarL) {
      // The corded kink: a rope hooking up off the low stern into a
      // dark bristle tassel, flicking with the gait and lashing on
      // its own clock at idle. The dire drags a longer, heavier rope
      // (tailK) — the one tail dial the pair shares.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const tk2 = boarL.tailK;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.022 * s +
        (now > 0 ? Math.sin(now * 0.0017 + seed) * 0.03 * s * idle : 0);
      const tbx = bx - fx * hl * 0.88;
      const tby = by - fy * hl * 0.88 * ys - boarL.backH * 0.58 * s - lift;
      const tex = tbx - fx * hl * 0.26 * tk2 + px * sway * 2;
      const tey = tby + s * (0.03 + 0.06 * (tk2 - 1));
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(boarL.hide, -26);
      ctx.lineWidth = Math.max(2, s * (0.03 + 0.01 * (tk2 - 1)));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(tbx - fx * hl * 0.16 * tk2 + px * sway, tby - s * 0.1 * tk2, tex, tey);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : boarL.bristle;
      ctx.beginPath();
      facetCircle(ctx, tex, tey + s * 0.012, s * (0.032 + 0.014 * (tk2 - 1)), 5, seed * 0.3);
      ctx.fill();
      return;
    }
    if (cattle) {
      // Rope tail hanging off the rump, swishing slowly at idle and
      // swaying with the gait, ending in a dark tuft.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.03 * s +
        (now > 0 ? Math.sin(now * 0.0013 + seed * 0.7) * 0.045 * s * idle : 0);
      const tbx = bx - fx * hl * 0.92;
      const tby = by - fy * hl * 0.92 * ys - cattle.backH * 0.95 * s - lift;
      const tex = tbx - fx * hl * 0.14 + px * sway * 1.7;
      const tey = tby + cattle.backH * 0.72 * s + py * sway * 0.4;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(cattle.hide, -24);
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(tbx - fx * hl * 0.1 + px * sway * 0.6, tby + cattle.backH * 0.3 * s, tex, tey);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = opts.hurt ? '#ffffff' : cattle.patch;
      ctx.beginPath();
      facetCircle(ctx, tex, tey + s * 0.03, s * 0.047, 5, seed * 0.3);
      ctx.fill();
      return;
    }
    if (wolfL) {
      // THE SIMULATED BRUSH: the live game runs the verlet chain
      // (TailSim + drawWolfBrush) — physics, not pose. The analytic
      // hang below survives only for sim-less callers.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // The brush: a full bushy tail hanging off the rump in a lazy
      // curve, dark-tipped, swaying with the gait and drifting at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.04 * s +
        (now > 0 ? Math.sin(now * 0.0011 + seed) * 0.05 * s * idle : 0);
      const tbx = bx - fx * hl * 0.95;
      const tby = by - fy * hl * 0.95 * ys - wolfL.backH * 0.8 * s - lift;
      const cxq = tbx - fx * hl * 0.42 + px * sway * 0.7;
      const cyq = tby + wolfL.backH * 0.1 * s;
      const tex = tbx - fx * hl * 0.78 + px * sway * 1.6;
      const tey = tby + wolfL.backH * 0.52 * s;
      const brush = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.034 + 0.058 * Math.sin(Math.PI * Math.pow(t, 0.9))),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(wolfL.coat, -4);
      ctx.fill(brush);
      ctx.fillStyle = opts.hurt ? '#ffffff' : wolfL.saddle;
      ctx.beginPath();
      facetCircle(ctx, tex, tey, s * 0.042, 5, seed * 0.4);
      ctx.fill();
      return;
    }
    if (direL) {
      // THE SIMULATED BRUSH — the sim-less analytic hang below is for
      // portraits and the CMS only.
      if (opts.tail) {
        opts.tail();
        return;
      }
      // The matriarch's brush: heavier than any wolf's, hung low and
      // ending PALE — the frost tip, the inverse of the pack's dark
      // ones. Sways slower; she wastes no motion.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.035 * s +
        (now > 0 ? Math.sin(now * 0.0008 + seed) * 0.045 * s * idle : 0);
      const tbx = bx - fx * hl * 0.96;
      const tby = by - fy * hl * 0.96 * ys - direL.backH * 0.74 * s - lift;
      const cxq = tbx - fx * hl * 0.4 + px * sway * 0.7;
      const cyq = tby + direL.backH * 0.16 * s;
      const tex = tbx - fx * hl * 0.74 + px * sway * 1.5;
      const tey = tby + direL.backH * 0.58 * s;
      const brush = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.042 + 0.072 * Math.sin(Math.PI * Math.pow(t, 0.9))),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : shade(direL.coat, -6);
      ctx.fill(brush);
      ctx.fillStyle = opts.hurt ? '#ffffff' : direL.grizzle;
      ctx.beginPath();
      facetCircle(ctx, tex, tey, s * 0.05, 5, seed * 0.4);
      ctx.fill();
      return;
    }
    if (feyL) {
      // THE TWIN BANNERS ARE A SIMULATION — the live game runs two
      // TailSim chains on splayed anchors, painted by drawFeyBrush
      // through the caller's tail slot. The analytic pair below is
      // THE ONE REST for sim-less callers (portraits, the CMS):
      // exactly the crossed-at-rest carriage the sims settle to.
      if (opts.tail) {
        opts.tail();
        return;
      }
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.03 * s +
        (now > 0 ? Math.sin(now * 0.0007 + seed) * 0.04 * s * idle : 0);
      for (const bs of [-1, 1]) {
        // Each banner roots off its own croup corner and falls
        // toward the center line — the crossed lyre at rest.
        const tbx = bx - fx * hl * 0.94 + px * bs * s * 0.07;
        const tby = by - (fy * hl * 0.94 - py * bs * 0.07) * ys - feyL.backH * 0.76 * s - lift;
        const cxq = tbx - fx * hl * 0.4 + px * (sway * 0.7 - bs * s * 0.02);
        const cyq = tby + feyL.backH * 0.14 * s;
        const tex = tbx - fx * hl * 0.76 + px * (sway * 1.4 - bs * s * 0.09);
        const tey = tby + feyL.backH * 0.5 * s;
        const banner = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
          s * (0.026 + 0.048 * Math.sin(Math.PI * Math.pow(t, 0.85))),
        );
        ctx.fillStyle = opts.hurt ? '#ffffff' : shade(feyL.coat, -3);
        ctx.fill(banner);
        // The tip dipped in cold light — the inversion past frost.
        ctx.fillStyle = opts.hurt ? '#ffffff' : feyL.glimmer;
        ctx.beginPath();
        facetCircle(ctx, tex, tey, s * 0.04, 5, seed * 0.4 + bs);
        ctx.fill();
      }
      return;
    }
    if (worgL) {
      // The ratty crook: a thin kinked whip off the low rump, bare at
      // the tip — nothing a wolf would admit to. Flicks fast at idle.
      const hl = spec.bodyLen * s;
      const lift = opts.pose.bob * 0.35 * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2) * 0.03 * s +
        (now > 0 ? Math.sin(now * 0.0023 + seed) * 0.035 * s * idle : 0);
      const tbx = bx - fx * hl * 0.94;
      const tby = by - fy * hl * 0.94 * ys - worgL.rumpH * 0.82 * s - lift;
      ctx.strokeStyle = opts.hurt ? '#ffffff' : shade(worgL.hide, -14);
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      // Down, then the kink hooks it back up — the crook.
      ctx.quadraticCurveTo(
        tbx - fx * hl * 0.2 + px * sway,
        tby + s * 0.12,
        tbx - fx * hl * 0.3 + px * sway * 2,
        tby + s * 0.05,
      );
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.strokeStyle = opts.hurt ? '#ffffff' : worgL.bare;
      ctx.beginPath();
      ctx.moveTo(tbx - fx * hl * 0.3 + px * sway * 2, tby + s * 0.05);
      ctx.lineTo(tbx - fx * hl * 0.36 + px * sway * 2.4, tby + s * 0.11);
      ctx.stroke();
      ctx.lineCap = 'butt';
      return;
    }
    if (ratL) {
      // The naked tail: long, thin, dragging a slithering S on the
      // ground behind the haunches.
      const hl = spec.bodyLen * s;
      const sway =
        Math.sin(opts.walkPhase * Math.PI * 2 + Math.PI * 0.5) * 0.09 * s +
        (now > 0 ? Math.sin(now * 0.0009 + seed) * 0.06 * s * idle : 0);
      const tbx = bx - fx * hl * 0.88;
      const tby = by - fy * hl * 0.88 * ys - 0.11 * s;
      const cxq = bx - fx * hl * 1.42 + px * sway * 2.2;
      const cyq = by - fy * hl * 1.42 * ys - 0.05 * s;
      const tex = bx - fx * hl * 1.95 + px * sway * 1.1;
      const tey = by - fy * hl * 1.95 * ys - 0.01 * s;
      const tail = taperedSpinePath(tbx, tby, cxq, cyq, tex, tey, (t) =>
        s * (0.02 * (1 - t) + 0.006),
      );
      ctx.fillStyle = opts.hurt ? '#ffffff' : ratL.skin;
      ctx.fill(tail);
      return;
    }
  };

  // The dairy udder: a pink faceted mass under the rear belly with
  // teat chips, visible side-on and from behind — never through the
  // body when the rump faces away.
  const paintUdder = (): void => {
    if (!cattle?.udder) return;
    const hl = spec.bodyLen * s;
    const lift = opts.pose.bob * 0.35 * s;
    const ux = bx - fx * hl * 0.52;
    const uy = by - fy * hl * 0.52 * ys - (cattle.bellyH - 0.06) * s - lift * 0.6;
    const ur = cattle.bodyW * 0.62 * s;
    ctx.fillStyle = opts.hurt ? '#ffffff' : cattle.udder;
    ctx.beginPath();
    facetCircle(ctx, ux, uy, ur, 6, seed * 0.5, 0.75);
    ctx.fill();
    if (!opts.hurt && fy < 0.25) {
      ctx.fillStyle = shade(cattle.udder, -18);
      for (const es of [-1, 1]) {
        ctx.fillRect(ux + es * ur * 0.38 - s * 0.012, uy + ur * 0.5, s * 0.024, s * 0.05);
      }
    }
  };

  // ---- compose in depth order. The facing decides where head and
  // tail sit relative to the mass: facing down-screen the head is the
  // closest thing (nothing may paint over the face); facing up-screen
  // it tucks behind the body and the tail comes forward.
  const headFront = fy > 0.2;
  const headBack = fy < -0.25;
  const tailFront = fy < -0.2;
  const udderBehind = fy > 0.15;
  // THE COLLAR: a strap across the hull's neck end with a brass tag
  // hung under it — one universal anchor (every species hull runs
  // bodyLen along the facing), painted over the body and under a
  // down-screen head so the face is never covered. Shell-bodied
  // species (crab, beetle, spider) have no neck to strap: their tag
  // rides the shell rim instead, same brass, same read.
  const paintCollar = (): void => {
    if (!opts.collar) return;
    // The turtle keeps its neck, but a strap on a telescoping neck
    // is a lie — the keeper rivets the tag to the front rim over the
    // neck's door instead, same brass, same read.
    const shellBody = !!(crabL || giantCrabL || beetleL || spiderL || turtleL);
    // The sheep has no neck to see — the fleece swallows it — so her
    // strap rides the wool line right behind the skull, short and
    // thin, or it reads as a plank across the cloud.
    const cx = bx + fx * len * (turtleL ? 0.82 : shellBody ? 0.5 : sheepL ? 0.95 : 0.72);
    const cy = bodyY + fy * len * (turtleL ? 0.5 : shellBody ? 0.34 : sheepL ? 0.6 : 0.5) * ys;
    const bw = Math.max(2, r * (shellBody ? 0.4 : sheepL ? 0.34 : 0.58));
    ctx.save();
    ctx.translate(cx, cy);
    if (!shellBody) {
      ctx.rotate(Math.atan2(fy * ys, fx) + Math.PI / 2);
      ctx.fillStyle = opts.collar;
      const hw3 = r * (sheepL ? 0.1 : 0.17);
      ctx.fillRect(-hw3, -bw, hw3 * 2, bw * 2);
      ctx.strokeStyle = 'rgba(26, 20, 36, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.strokeRect(-hw3, -bw, hw3 * 2, bw * 2);
    }
    // The tag: one brass drop — the thing a keeper's eye finds first.
    ctx.fillStyle = '#d8a83d';
    ctx.beginPath();
    ctx.arc(0, bw * (shellBody ? 0.4 : 1.05), Math.max(1.4, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    ctx.restore();
  };

  if (!tailFront) paintTail();
  if (headBack) paintHead();
  if (udderBehind) paintUdder();
  for (const i of farLegs) drawLeg(i, shellMount);
  paintBody();
  paintCollar();
  if (!udderBehind) paintUdder();
  if (!headBack && !headFront) paintHead();
  for (const i of nearLegs) drawLeg(i);
  // THE CLAW IS NEVER UNDER A LEG: the giant crab's near claws are
  // the TOPMOST layer of the whole animal — over the hull, over
  // every stilt — exactly as the raised guard carries in life.
  if (giantCrabL) paintGiantCrabClaws(ctx, spec, giantCrabL, blockFrame(), 'near', at, now);
  opts.rider?.();
  if (headFront) paintHead();
  if (tailFront) paintTail();
}

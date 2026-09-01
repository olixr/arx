export * from './rigKit.js';
import { PoseState, type Look } from '@arx/shared';
import { shade } from './tint.js';
import type { CrabLook } from './rigArthropod.js';
import type { BasiliskLook } from './rigBasilisk.js';
import type { WolfLook, WorgLook } from './rigCanid.js';
import type { BoarLook } from './rigCritter.js';
import type { HousecatLook, LynxLook } from './rigFeline.js';
import type { GnollLook } from './rigGnoll.js';
import type { GoblinLook } from './rigGoblin.js';
import type { RamLook, SheepLook, StagLook } from './rigHerd.js';
import type { KoboldLook } from './rigKobold.js';
import type { OwlLook } from './rigOwl.js';
import type { SkeletonLook } from './rigSkeleton.js';
import type { BearLook } from './rigUrsine.js';
export * from './rigArthropod.js';
export * from './rigBasilisk.js';
export * from './rigCanid.js';
export * from './rigCritter.js';
export * from './rigFeline.js';
export * from './rigFox.js';
export * from './rigGnoll.js';
export * from './rigGoblin.js';
export * from './rigHerd.js';
export * from './rigKobold.js';
export * from './rigMount.js';
export * from './rigOoze.js';
export * from './rigOwl.js';
export * from './rigSkeleton.js';
export * from './rigTurtle.js';
export * from './rigUrsine.js';
import { type GolemLook } from './golems.js';
import { type GutSim, type OgreLook, type PendantSim } from './ogre.js';
import { type SkralLook } from './skral.js';
import { type HobgoblinLook } from './hobgoblin.js';
import { LegRig, type LegPose, type LegRigConfig } from './legs.js';
import { type CraftWorkKind } from './work.js';
import { EarSim } from './earPhysics.js';
export type { LegPose } from './legs.js';
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
export declare class LegSolver extends LegRig {
    private readonly stature;
    constructor(stature?: number);
    update(bx: number, by: number, dirRaw: number, rawDt: number): LegPose;
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
export declare function chooseKneeSign(cx: number, cy: number, fx: number, fy: number, sideSgn: number, memory: number): number;
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
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
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
        mainElbow?: {
            sign: number;
        };
        offElbow?: {
            sign: number;
        };
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
    fishTo?: {
        x: number;
        y: number;
    };
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
/** The arm ring's height below the hip line (armY = hipY − this·s). */
export declare const ARM_RING_DROP_S = 0.26;
/** A relaxed fist's hang below the arm ring (main hand + bare hands). */
export declare const REST_HANG_DROP_S = 0.17;
/** The off blade's hang below the arm ring — a touch higher than the
 *  main: the trailing blade of a paired stance, never a mirror image. */
export declare const OFF_BLADE_HANG_DROP_S = 0.15;
/** Shoulder half-width (the torso trapezoid's top, before dialects). */
export declare const SHOULDER_HALF_S = 0.185;
/** Waist half-width (the trapezoid's bottom — the hang-width lane). */
export declare const WAIST_HALF_S = 0.125;
/** A settled shoulder's anatomical anchor along the shoulder bar. */
export declare const SHOULDER_SETTLE_K = 0.85;
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
export declare function shoulderTuckK(fx: number): number;
/**
 * THE PERSPECTIVE SHEET (dev-only): when `on`, drawHumanoid records
 * the solved shoulder geometry of the last figure drawn so a lab can
 * overlay red/green calibration lines — the solved bar, the settle
 * anchors, the pauldron sockets and the honest 3D projection of the
 * shoulder bar — over the art. The labs flip it on (`?dbg=1`); the
 * game never does. Zero cost off: one boolean check per draw.
 */
export declare const RIG_DEBUG: {
    on: boolean;
    x: number;
    hipY: number;
    shoulderY: number;
    s: number;
    tw: number;
    wS: number;
    dir: number;
    mainShX: number;
    mainShY: number;
    offShX: number;
    offShY: number;
    anchorMainX: number;
    anchorOffX: number;
    sockets: Array<{
        x: number;
        y: number;
        depthK: number;
    }>;
    armY: number;
    lean: number;
    headX: number;
    headY: number;
    headR: number;
    mainFistX: number;
    mainFistY: number;
    offFistX: number;
    offFistY: number;
    arms: Array<{
        sx: number;
        sy: number;
        kx: number;
        ky: number;
        ex: number;
        ey: number;
    }>;
    tintMain: string | null;
    tintOff: string | null;
};
/** The hang-width lane's flare off the waist line (hangW's ww term). */
export declare const HANG_WAIST_K = 1.08;
/** shoulderY sits this far below the shoulder line's top (units of s). */
export declare const SHOULDER_Y_DROP_S = 0.06;
/** Hip line → shoulder line rise before the crouch/squash factors. */
export declare const TORSO_RISE_S = 0.46;
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
export declare function solveArm(sx: number, sy: number, hx: number, hy: number, L: number, prefX: number, prefY: number): {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
};
export declare function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void;
/**
 * Back-mounted gear layered relative to the CAPE — called by the
 * renderer immediately after the cape paints, so a quiver straps OVER
 * the cloth (gear goes over a cape, never under it). Recomputes the
 * few shoulder measurements it needs; drawHumanoid skips its internal
 * quiver whenever hasCape is set.
 */
export declare function drawBackGear(ctx: CanvasRenderingContext2D, rig: RigPose): void;
export { shade };
/**
 * Overlay an enchant's fx channel on a resolved weapon style — the
 * style object is data, so a shallow clone re-aims the existing mote
 * painters at the enchant's element without touching the silhouette.
 */
export declare function enchantedStyle<T extends {
    fx?: unknown;
    fxColor?: string;
    aura?: string;
}>(st: T, ench: string | undefined, family: 'blade' | 'staff'): T;
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
/**
 * Spec for a beast id — named species get their tuned rig; anything
 * new walks on a generic quadruped scaled from its collision radius,
 * so future creatures have working legs before they have a look.
 */
export declare function beastSpec(defId: string, radius: number, speed: number): BeastSpec;
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
/**
 * A tapered ribbon along a quadratic spine — the wolf's brush and the
 * rat's naked tail both build from this, live and dead. `widthAt`
 * returns the half-width at t∈[0,1] so species shape their own taper.
 */
export declare function taperedSpinePath(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, widthAt: (t: number) => number): Path2D;
export declare function paintWolfBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: WolfLook, f: BeastBlockFrame): void;
/**
 * The wolf head: angular skull slab with erect ears and a long tapered
 * muzzle that turns with the facing (full-face wedge head-on, narrow
 * profile spike side-on). `snarl` pins the ears back and bares teeth
 * through the pounce telegraph; corpses pass `dead` (no eyes). THE EAR
 * IS A SIMULATION: pass `ears` + `nowMs` for the live elastic pair;
 * sim-less callers paint the settled rest.
 */
export declare function drawWolfHead(ctx: CanvasRenderingContext2D, look: WolfLook, o: {
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
}): void;
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
export declare function paintDireWolfBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: DireWolfLook, f: BeastBlockFrame): void;
/**
 * The dire wolf head: a heavier skull than any wolf's — broad brow
 * ledge over ember eyes, a longer deeper muzzle whose fangs show even
 * at rest, and tall ears with a bitten-out notch on the near side.
 * `snarl` drops the whole jaw and bares the full rack.
 */
export declare function drawDireWolfHead(ctx: CanvasRenderingContext2D, look: DireWolfLook, o: {
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
}): void;
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
export declare function paintFeyWolfBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: FeyWolfLook, f: BeastBlockFrame): void;
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
export declare function drawFeyWolfHead(ctx: CanvasRenderingContext2D, look: FeyWolfLook, o: {
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
}): void;
export declare function paintWorgBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: WorgLook, f: BeastBlockFrame): void;
/**
 * The worg head: a bear-trap — broad short skull, heavier below than
 * above, the UNDERBITE fang-tusks hooking up past the muzzle sides
 * even at rest. Big ragged bat ears with torn edges; forward-set
 * sickly-green eyes. `gape` swings the whole lower jaw open through
 * the lunge — the trap showing you its hinge.
 */
export declare function drawWorgHead(ctx: CanvasRenderingContext2D, look: WorgLook, o: {
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
}): void;
/**
 * The owl body: the upright keg — a tall block-prism (the wall-prism
 * dialect stood on end) under a lit shoulder dome, the folded wings
 * drawn as darker saddle panels meeting in a spine seam, the pale
 * breast keel barred in seeded chevron rows, primary steps ticking
 * the low flanks toward the tail. The attack telegraph MANTLES:
 * wings rise and spread through the windup — the threat bloom that
 * doubles the owl on screen — then snap down-forward with the strike.
 */
export declare function paintOwlBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: OwlLook, f: BeastBlockFrame, attackT?: number): void;
/**
 * The owl head, drawn in its own frame with its OWN facing — the
 * swivel means the gaze rarely matches the body line. Reads owl by
 * silhouette alone: the horned tufts, the broad low dome, and THE
 * FACIAL DISC — two rimmed lobes carrying both eyes FORWARD, thinning
 * to a crescent at profile and gone entirely from behind (no face on
 * a backskull, ever). The elder's disc ring is doubled and its crown
 * wears frost.
 */
export declare function drawOwlHead(ctx: CanvasRenderingContext2D, look: OwlLook, o: {
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
}): void;
export declare function paintBoarBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BoarLook, f: BeastBlockFrame, 
/** 0..1 charge windup — the hackles stand and the crest leans in. */
hackle?: number): void;
/**
 * The boar head: the wedge's PROW — a deep skull carried low, pinned
 * bristle ears, a grizzle-mask ridge running down to the flat SNOUT
 * DISC, and THE RAVAGER TUSKS: ivory crescents sweeping up-and-out
 * from dark gum seats at the jaw corners, with the mouth's gape line
 * carved between them. The dire look adds the second (upper) pair,
 * heavy jowls, and a seeded chipped tip — an old jaw, not a clean
 * one. `charge` pins the ears and bares the gape.
 */
export declare function drawBoarHead(ctx: CanvasRenderingContext2D, look: BoarLook, o: {
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
}): void;
export declare const RAM_LOOK: RamLook;
export declare function paintSheepBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: SheepLook, f: BeastBlockFrame, shorn: boolean): void;
/**
 * The ewe head: drooping dark ears off the poll, a bare slab face
 * under a puffed wool cap, a short straight muzzle — everything the
 * ram's skull is not (no horns, no Roman nose, no menace).
 */
export declare function drawSheepHead(ctx: CanvasRenderingContext2D, look: SheepLook, o: {
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
}): void;
export declare function paintStagBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: StagLook, f: BeastBlockFrame): void;
/**
 * The stag head: a small wedge carried high, alert ears, and the
 * crown — branched antlers, each a swept-back beam with a brow tine,
 * a mid tine and a forked top, drifting outward so the front view
 * spreads them wide.
 */
export declare function drawStagHead(ctx: CanvasRenderingContext2D, look: StagLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
}): void;
export declare function paintBearBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BearLook, f: BeastBlockFrame): void;
/**
 * The bear head: a wide chamfered slab with small round ears, a short
 * broad tan muzzle and a heavy nose. `snarl` opens the jaw and pins
 * the ears through the pounce telegraph.
 */
export declare function drawBearHead(ctx: CanvasRenderingContext2D, look: BearLook, o: {
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
}): void;
export declare function paintCrabBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CrabLook, f: BeastBlockFrame, at?: number, nowMs?: number, 
/** THE LIVING STALKS: the live ear sim; absent = the ONE REST chain. */
eyes?: EarSim): void;
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
export declare function paintGiantCrabClaws(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: GiantCrabLook, f: BeastBlockFrame, which: 'far' | 'near' | 'all', at?: number, nowMs?: number): void;
export declare function paintGiantCrabBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: GiantCrabLook, f: BeastBlockFrame, at?: number, nowMs?: number, 
/** THE LIVING STALKS: the live ear sim; absent = the ONE REST chain. */
eyes?: EarSim, 
/**
 * drawBeast composes the near claws itself as the TOPMOST pass
 * (after the near legs — a stilt must never cross the crusher);
 * standalone callers leave this false and get the whole animal.
 */
deferNearClaws?: boolean): void;
/** Resolve a basilisk body's full look from its defId + spawn seed. */
export declare function basiliskLook(defId: string, seed: number): BasiliskLook;
export declare function lynxLook(defId: string, seed?: number): LynxLook;
export declare function paintLynxBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: LynxLook, f: BeastBlockFrame): void;
/**
 * THE EQUINE LIMB: a horse's leg is not a stroke — it is a muscled
 * upper story over a bone-and-tendon lower story, and the break
 * between them is the whole silhouette. Fore: the shoulder/forearm
 * column tapering hard into the carpus (the "knee"), then the clean
 * near-parallel CANNON down to a fetlock knot and a short sprung
 * pastern. Hind: the deep GASKIN off the quarters into the
 * high-riding HOCK — whose calcaneal point juts past the joint on
 * the bend side, the one landmark that says horse from any band —
 * then the same cannon story. The upper leg wears the COAT (only
 * the lower leg ever wore socks); the fetlock and pastern wear the
 * sock tone so the existing horn-block hoof caps a leg that darkens
 * honestly toward the ground. Species-blind: any hoofed heavy can
 * adopt it. Far legs step into shadow (the doctrine's far-pair law)
 * so profile strides never merge.
 */
export declare function drawHorseLimb(ctx: CanvasRenderingContext2D, o: {
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
    /** Body coat (seed-jittered by the caller — legs match the barrel). */
    coat: string;
    /** Lower-leg tone below the fetlock (the sock). */
    sock: string;
    /** Far-side legs step into shadow so pairs never merge mid-stride. */
    far: boolean;
    hurt: boolean;
    /** Winter shag: fetlock feathering (the garron). */
    feather?: boolean;
    /**
     * Screen y of the belly line at this hip. The upper story CLIPS
     * below it: the thigh is implied inside the barrel, and the box
     * face owns every pixel above the belly — painted over it, the
     * muscle read as a translucent body. The clip keeps the true hip
     * root (mid-gallop folds emerge honestly) without face-paint.
     */
    clipY?: number;
    /**
     * |cos(facing)| — how side-on the body is. The gaskin and
     * forearm are SAGITTAL masses: broad in profile, narrow head-on.
     * Painted at profile width on the N/S bands they poked past the
     * chest face as saddlebag lumps — the width breathes with the
     * facing while the bone gauges below stay true.
     */
    horiz?: number;
}): void;
/**
 * The lynx head: a round feline skull wearing the THREE face reads —
 * tall triangular ears firing black TUFTS off their tips, the pale
 * RUFF chops framing the jaw like a layered beard, and slanted
 * gold-green eyes. The muzzle barely leaves the skull (the feline
 * law); mid-snarl the ears pin, the tufts rake back, the jaw gapes.
 */
export declare function drawLynxHead(ctx: CanvasRenderingContext2D, look: LynxLook, o: {
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
}): void;
/**
 * Resolve one cat's whole look from its stable seed. Wild bodies
 * dress off their eid; a kept companion dresses off the lookSeed the
 * wire carries (THE COAT OUTLIVES THE BODY) — the FULL seed keys the
 * cache because pet seeds are 31-bit rolls, not small eids.
 */
export declare function housecatLook(defId: string, seed?: number): HousecatLook;
export declare function drawBeast(ctx: CanvasRenderingContext2D, opts: {
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
    feet: Array<{
        x: number;
        y: number;
        lift: number;
    }>;
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
    /**
     * THE SIT (house cat): 0..1 into the settled upright rest —
     * haunches folded under the body, forelegs posted straight from
     * a lifted chest, head carried high. The renderer eases it in
     * off stillness; the body, legs, and head all read the one dial.
     */
    sit?: number;
}): void;
//# sourceMappingURL=rig.d.ts.map
import { PoseState, type Look } from '@arx/shared';
import type { BobtailDrawOpts } from './tail.js';
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
 * THE TURNED BAR's fore-aft stagger (units of tw, signed along the
 * facing): side-on, the leading arm hangs a half-step ahead of the
 * chest line and the trailing arm behind it — the same stagger the
 * feet already take (legs.ts `stag`). Zero face-on; grows with the
 * profile so the diagonals inherit a taste of it.
 */
export declare function shoulderStagK(fx: number): number;
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
 * THE TWO PROFILE READS (arms-v3 Phase 1: named, single-sourced).
 * The RIG's facing weight is the honest cosine — `profileK = |fx|` —
 * and every arm/carry/depth law rides that. The FACE painters use this
 * snugger read instead: |fx| boosted 15% and clamped, so the head
 * commits to its profile band a beat before the body does (eyes and
 * muzzles read wrong mid-turn if the face lags the turn). Thirteen
 * mob-head painters each re-derived this inline before it was named —
 * one drifted constant away from thirteen different face laws.
 */
export declare function faceProfileK(fx: number): number;
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
export interface SkeletonLook {
    /** Base bone tone — each variant aged differently in the ground. */
    bone: string;
    /** The dark of the rib cavity behind the rib bars — the depth read. */
    cavity: string;
    /** Light living in the sockets; undefined = the hollow dark stare. */
    glow?: string;
    /** Royalty among the dead wears its crown into battle. */
    crown?: {
        band: string;
        gem: string;
    };
    /** Bone thickness multiplier: gracile archer 0.92 → champion 1.3. */
    heavy: number;
    /** Old battle damage: a skull crack down the trailing brow. */
    cracked: boolean;
}
export declare const SKELETON_LOOKS: Record<string, SkeletonLook>;
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export declare function skeletonLook(defId: string): SkeletonLook;
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
export declare function paintSkull(ctx: CanvasRenderingContext2D, sk: SkeletonLook, f: SkullFrame): void;
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
/**
 * The skeletal torso, drawn in the garment's local frame (y=0 at the
 * hip line, −th at the shoulders): clavicle bar and shoulder knobs, a
 * rib barrel over the dark cavity with the sternum riding the leading
 * edge, scapulae and spine from behind — and below it a REAL gap where
 * a waist should be, crossed only by vertebrae down to the iliac-wing
 * pelvis. The see-through waist is the whole-body skeleton read.
 */
export declare function paintRibcage(ctx: CanvasRenderingContext2D, sk: SkeletonLook, f: RibcageFrame): void;
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
export declare const KOBOLD_LOOKS: Record<string, KoboldLook>;
/** Variant lookup with the rank-and-file as the unknown-id fallback. */
export declare function koboldLook(defId: string): KoboldLook;
/**
 * A tapered filled ribbon along a quadratic spine — the law learned on
 * the ram's horns: curved mass reads as carved form only when drawn as
 * a filled shape with an outline, never as a stroke chain. Width
 * tapers base→tip; returns the sampled spine so callers can seat
 * details on it.
 */
export declare function scaleRibbon(ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, fill: string, outline: string): Array<{
    x: number;
    y: number;
    px: number;
    py: number;
    w: number;
}>;
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
export declare function paintKoboldHead(ctx: CanvasRenderingContext2D, kb: KoboldLook, f: KoboldHeadFrame): void;
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
export declare function paintKoboldHump(ctx: CanvasRenderingContext2D, kb: KoboldLook, garment: string, f: KoboldHumpFrame): void;
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
export declare function paintKoboldTail(ctx: CanvasRenderingContext2D, kb: KoboldLook, f: KoboldTailFrame): void;
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
export declare const GNOLL_LOOKS: Record<string, GnollLook>;
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the skulker's coat cluster plus a small
 * shade jitter; named looks (the packlord) hold their authored design.
 * Resolved looks are cached — this runs per body per frame.
 */
export declare function gnollLook(defId: string, seed?: number): GnollLook;
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
export declare function paintGnollHead(ctx: CanvasRenderingContext2D, gn: GnollLook, f: KoboldHeadFrame, seed?: number): void;
/**
 * The crest hump: the gnoll's hunched shoulders drawn in the torso's
 * local frame AFTER the garment and BEFORE the head — high withers in
 * FUR (the scraps a gnoll wears never cover its own back) with the
 * mane's bristle ridge marching down the slope. The low-slung skull
 * sinks into it; face-on and from behind it reads as the bowed back
 * the whole species carries.
 */
export declare function paintGnollCrest(ctx: CanvasRenderingContext2D, gn: GnollLook, f: KoboldHumpFrame): void;
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
export declare function paintGnollBody(ctx: CanvasRenderingContext2D, gn: GnollLook, f: GnollBodyFrame): void;
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
export declare const GOBLIN_LOOKS: Record<string, GoblinLook>;
/**
 * Variant lookup with the rank-and-file as the unknown-id fallback.
 * The seed (spawn eid) rolls the chopper's and the thrower's hide
 * cluster plus a small shade jitter; named looks (the casters, the
 * warboss) hold their authored design. Resolved looks are cached —
 * this runs per body per frame.
 */
export declare function goblinLook(defId: string, seed?: number): GoblinLook;
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
export declare function paintGoblinHead(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: KoboldHeadFrame): void;
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
export declare function paintGoblinLoincloth(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: GoblinBodyFrame): void;
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
export declare function paintGoblinTorso(ctx: CanvasRenderingContext2D, gb: GoblinLook, f: GoblinBodyFrame): void;
export declare function drawHumanoid(ctx: CanvasRenderingContext2D, rig: RigPose): void;
/**
 * Back-mounted gear layered relative to the CAPE — called by the
 * renderer immediately after the cape paints, so a quiver straps OVER
 * the cloth (gear goes over a cape, never under it). Recomputes the
 * few shoulder measurements it needs; drawHumanoid skips its internal
 * quiver whenever hasCape is set.
 */
export declare function drawBackGear(ctx: CanvasRenderingContext2D, rig: RigPose): void;
/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export declare function shade(hex: string, amount: number): string;
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
export declare const CATTLE_LOOKS: Record<string, CattleLook>;
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
export declare function paintCattleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CattleLook, f: CattleBodyFrame): void;
/**
 * The cattle head: a billboard chamfered slab (like the humanoid head)
 * whose muzzle, ears, horns and eyes orbit with the facing. Shared by
 * the live rig and the ragdoll — corpses pass `dead` (no face marks)
 * and ys=1.
 */
export declare function drawCattleHead(ctx: CanvasRenderingContext2D, look: CattleLook, o: {
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
}): void;
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
export declare const WOLF_LOOK: WolfLook;
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
export declare const DIREWOLF_LOOK: DireWolfLook;
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
export declare const OLDFANG_LOOK: DireWolfLook;
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
export declare const FEYWOLF_LOOK: FeyWolfLook;
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
export declare const WORG_LOOK: WorgLook;
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
export declare const GREAT_OWL_LOOK: OwlLook;
/**
 * The elder: the parliament's high seat — never a scale-up. Storm
 * slate over moon-pale cream where the wing is bark over buff, a
 * TALL tufted crest for a crown, the disc ring doubled like a
 * weathered court seal, and frost ticked through the crown feathers.
 * It out-masses the hunter in every dimension that counts.
 */
export declare const ELDER_GREAT_OWL_LOOK: OwlLook;
/**
 * Variant lookup with the hunter as the unknown-id fallback. The seed
 * (spawn eid) rolls the rank-and-file's plumage cluster plus a small
 * shade jitter — hashed first, because knot members spawn with
 * CONSECUTIVE eids and raw bits would dress a whole wing in one coat.
 * The elder holds its authored design. Cached; runs per body per frame.
 */
export declare function owlLook(defId: string, seed?: number): OwlLook;
/**
 * One feathered wing fan in the facet dialect: a bone-dark leading
 * arm and four chamfered primary blades stepping back from it — a
 * STEPPED silhouette, never a soft fan. Pale on the underside, so a
 * raised wing flashes the mantle warning every prey animal in the
 * wood understands. Screen-space like the bat's membranes (billboard
 * wings read at every body facing); the corpse splay squashes the
 * same fan onto the ground.
 */
export declare function owlWingFan(ctx: CanvasRenderingContext2D, look: OwlLook, o: {
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
/** Flight ceiling per rank (tiles over the ground anchor): the elder
 *  rides higher — rank you can read from across the glade. */
export declare function owlHoverHeight(look: OwlLook): number;
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
export declare const RAT_LOOK: RatLook;
export declare function paintRatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: RatLook, f: BeastBlockFrame): void;
/**
 * The rat head: pointed snout wedge off a small skull, dish ears
 * behind, beady eyes, whiskers and buck teeth. Muzzle and eyes obey
 * the same foreshortening laws as the cattle and wolf.
 */
export declare function drawRatHead(ctx: CanvasRenderingContext2D, look: RatLook, o: {
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
}): void;
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
export declare const BOAR_LOOK: BoarLook;
/**
 * THE SCARRED IRON: the dire boar wears a cold iron-umber coat under
 * a frost-tipped quill hedge — a mountain at the shoulder where the
 * boar is a wedge, aged four-tusk jaws where the boar carries two
 * clean crescents, and garnet eyes sunk in heavy jowls. At any zoom
 * the two must never read as one silhouette twice.
 */
export declare const DIREBOAR_LOOK: BoarLook;
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
export declare const SPIDER_LOOK: SpiderLook;
export declare function paintSpiderBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: SpiderLook, f: BeastBlockFrame, at?: number): void;
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
export declare const RAM_LOOK: RamLook;
export declare function paintRamBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: RamLook, f: BeastBlockFrame): void;
/**
 * The ram head: horns first — each curls in its sagittal plane, up
 * over the ear, back, down and forward, drifting outward through the
 * spiral so the front view reads as two curls flanking the poll.
 * Growth ribs cross the curl. The bare face is a dark slab under a
 * wool cap.
 */
export declare function drawRamHead(ctx: CanvasRenderingContext2D, look: RamLook, o: {
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
}): void;
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
export declare const SHEEP_LOOK: SheepLook;
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
export declare const STAG_LOOK: StagLook;
/**
 * The hind: the stag's dialect at herd scale — a hand smaller, a
 * shade warmer, the neck a touch lower, and big leaf ears where the
 * stag carries his crown. Reads "deer" beside the stag and "not the
 * stag" on her own.
 */
export declare const HIND_LOOK: StagLook;
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
export declare const BEAR_LOOK: BearLook;
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
export declare const CRAB_LOOK: CrabLook;
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
export declare const GIANTCRAB_LOOK: GiantCrabLook;
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
export declare const BEETLE_LOOK: BeetleLook;
export declare function paintBeetleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BeetleLook, f: BeastBlockFrame, at?: number): void;
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
export declare const TURTLE_LOOK: TurtleLook;
export declare const COLOSSUS_LOOK: TurtleLook;
export declare function paintTurtleBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: TurtleLook, f: BeastBlockFrame): void;
export declare function drawTurtleHead(ctx: CanvasRenderingContext2D, look: TurtleLook, o: {
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
}): void;
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
    /** Tail sim weight dial (crest heights, ring weights, settle mass). */
    tailHeavy: number;
    /** THE WEAPON OFF THE STERN: total tail length (tiles) — longer
     *  than the body on every member of the court; the sim, painter,
     *  analytic rest, corpse, and sprite bounds all read this ONE
     *  number so the tail can never be cropped or shortchanged. */
    tailLen: number;
    /** Tail root half-width (tiles) — meets the hull's stern width so
     *  the tail is the body continuing, never a rope tied on. */
    tailRootW: number;
    /** Sim rigidity 0..1 (THE UNBENDING ROOT dial). */
    tailStiff: number;
    /** Scull wave amplitude scale (the swimmer beats hardest). */
    tailWave: number;
    /** The fen cousin: keeled swimming fin instead of the saw. */
    fin?: boolean;
    /** The elder alone: horn crown, plate mass, lichen, barbels. */
    elder?: boolean;
    /** Elder lichen saddles. */
    moss?: string;
}
/** Resolve a basilisk body's full look from its defId + spawn seed. */
export declare function basiliskLook(defId: string, seed: number): BasiliskLook;
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
export declare function paintBasiliskBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BasiliskLook, f: BeastBlockFrame): void;
/**
 * THE COURT'S SKULL — dragon out of crocodile: a long broad muzzle
 * that is the skull's own flesh (MOUTH IS A CUT, never a cone), the
 * grim saurian grin with interlocked teeth, raised nostril bumps on
 * the snout's top plane, a heavy brow ledge — and the species read:
 * eyes lit with pale-green fire. The basilisk wears two backswept
 * brow horns; the elder a four-point crown and chin barbels; the fen
 * keeps a low hunter's brow and nothing it doesn't need.
 */
export declare function drawBasiliskHead(ctx: CanvasRenderingContext2D, look: BasiliskLook, o: {
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
}): void;
export interface BasiliskTailStyle {
    hide: string;
    horn: string;
    /** The yellowish underbelly, carried down the tail's lower edge. */
    belly: string;
    /** Root half-width (tiles) — MUST meet the body's stern width so
     *  the tail reads as the hull continuing, never a rope tied on. */
    rootW: number;
    /** Mass dial: crest heights and ring weights. */
    heavy: number;
    /** The fen cousin: the tall swimmer's fin instead of the crests. */
    fin?: boolean;
}
/**
 * THE WEAPON OFF THE STERN — the basilisk tail painter, rebuilt for
 * the croc-tail sim (user mandate: huge, meaty, dramatic). The
 * silhouette is a MUSCLE WEDGE: root as wide as the hull's stern,
 * holding most of its width through the first half (meat), then
 * closing on a hard whip point. The reads, in croc grammar: the
 * DOUBLE CREST — two scute rows riding the tail base that MERGE into
 * one tall keel saw at mid-length (the signature of every reference
 * crocodilian) — the BELLY BAND carried down the lower edge, and
 * quiet muscle rings at the joints. The fen swaps the crests for one
 * tall swimmer's fin. Dials ride the style (the canid-lane law);
 * plain path calls — no Path2D — so node tests walk every coordinate.
 */
export declare function drawBasiliskTail(ctx: CanvasRenderingContext2D, pts: Array<{
    x: number;
    y: number;
}>, st: BasiliskTailStyle, wk: number, opts: BobtailDrawOpts): void;
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
/** The family register, painter-side: routing + the no-corpse law. */
export declare function oozeLook(defId: string): OozeLook | undefined;
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
export declare function oozeExtents(look: OozeLook, radius: number): {
    halfW: number;
    top: number;
    bottom: number;
};
/** One ooze, routed by its body plan. */
export declare function drawOoze(ctx: CanvasRenderingContext2D, look: OozeLook, o: OozeOpts): void;
/**
 * THE TRAIL DAB: one glisten print on the ground an ooze crossed —
 * painted by the renderer's shadow pass so every body walks OVER the
 * wet. A flattened seeded facet, never a stamped circle.
 */
export declare function drawOozeTrailDab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, color: string, alpha: number): void;
/**
 * The giant adder: a slithering tapered ribbon — the body is a sampled
 * S-wave behind the head, diamond-patterned down the spine, with a
 * raised viper head that strikes along the facing.
 */
export declare function drawSnake(ctx: CanvasRenderingContext2D, o: {
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
}): void;
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
export declare const COURSER_LOOKS: Record<string, CourserLook>;
/**
 * Rider anchor geometry, tile units above the beast's ground point.
 * The renderer builds the rider's seat, stirrups, and pommel grip from
 * these; the tack painter draws to the same numbers — one ruler, so
 * the boot always meets the stirrup iron and the fists the pommel.
 */
export declare const COURSER_SADDLE: {
    seatH: number;
    stirrupH: number;
    stirrupSide: number;
    stirrupFwd: number;
    pommelFwd: number;
    pommelH: number;
    radius: number;
};
/** One rig for every coat — only the sock color varies. */
export declare function mountSpec(mountId: string): BeastSpec;
/**
 * Rider geometry per body — the garron seats lower than the courser.
 * Same shape as COURSER_SADDLE; the renderer picks by mount id.
 */
export declare function saddleFor(mountId: string): typeof COURSER_SADDLE;
export declare function paintCourserBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CourserLook, f: BeastBlockFrame, saddle?: typeof COURSER_SADDLE): void;
/**
 * The courser's head: a long plain skull with pricked ears, the
 * muzzle running well past the cheek to a soft dark nose — the length
 * is what separates horse from deer at a glance. The forelock falls
 * between the ears in the mane's color.
 */
export declare function drawCourserHead(ctx: CanvasRenderingContext2D, look: CourserLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
}): void;
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
export declare const SABERCAT_LOOKS: Record<string, SabercatLook>;
export declare function paintSabercatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: SabercatLook, f: BeastBlockFrame): void;
/**
 * The sabercat head: a round skull where the wolf carries a slab, a
 * short broad muzzle where the wolf runs a spike, blunt round-backed
 * ears, pale-gold eyes, and the two ivory sabers dropping past the
 * jaw — visible at every facing the muzzle is, because they ARE the
 * animal.
 */
export declare function drawSabercatHead(ctx: CanvasRenderingContext2D, look: SabercatLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
}): void;
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
export declare const LYNX_LOOKS: Record<string, LynxLook>;
export declare function lynxLook(defId: string, seed?: number): LynxLook;
export declare function paintLynxBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: LynxLook, f: BeastBlockFrame): void;
/**
 * THE MUSCLED LIMB: the lynx's leg is drawn as MASS, never as stick
 * strokes — a filled haunch ball feeding a tapered thigh, a slim hock,
 * and the oversized paw a snow-cat actually stands on. Every shape is
 * built in the solved bones' own frames (hip→knee, knee→paw), so the
 * masses articulate honestly through all eight facing bands, the
 * pounce stretch, and every mid-turn joint memory — flat value planes
 * per the forge law, one coat family per cluster.
 */
export declare function drawCatLimb(ctx: CanvasRenderingContext2D, o: {
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
    /** Paw fill override (white mitts, seal points). Absent = the coat's dark step. */
    paw?: string;
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
 * THE HOUSE CAT — the hearth's shadow, the first animal in the game
 * that exists purely for company. Nothing here is borrowed from the
 * lynx beyond the feline LAWS it must obey (the flat muzzle plate,
 * the canid wedge ban, the long-thigh bones): where the lynx is a
 * wild ambusher built on four predator reads, the house cat is built
 * on WARDROBE and CARRIAGE — a curated coat cabinet a whole town's
 * cats spread across (seeded, never random-hued), the raised
 * question-mark tail no wild cat carries, and THE SIT, the settled
 * upright rest that says "domestic" from across a market square.
 */
export interface HousecatLook {
    /** Base coat. */
    coat: string;
    /** Underparts: belly, chest, muzzle plate — and the tuxedo's dress. */
    under: string;
    /** Pattern ink: tabby bars, the cap, patches, the points. */
    mark: string;
    /** Second patch ink (calico, tortoiseshell). */
    mark2?: string;
    /** Inner-ear fan. */
    earIn: string;
    eye: string;
    nose: string;
    /**
     * The written pattern. 'solid' wears the coat plain; 'tabby' bars
     * the back and flanks and writes the crown M; 'bicolor' carries
     * white underparts high up the flank; 'tuxedo' is the black dress
     * over a white bib and blaze; 'capped' is a clean pale body under
     * a dark skullcap (the head painter owns the cap); 'patched'
     * scatters seeded color patches (calico, tortie); 'points' darkens
     * the extremities only — mask, ears, paws, tail.
     */
    pattern: 'solid' | 'tabby' | 'bicolor' | 'tuxedo' | 'capped' | 'patched' | 'points';
    /**
     * Long hair reads in the TAIL first (the plume vs the whip), then
     * the cheek fluff, the chest ruff, and the belly fringe.
     */
    longhair: boolean;
    /** Tail dress: ringed (the raccoon read), dark-tipped, plain coat, or mark-dark end to end. */
    tail: 'rings' | 'tip' | 'coat' | 'dark';
    /** White mitts on all four paws. */
    mitts?: boolean;
    /** The chest locket — one pale patch where the collarbones meet. */
    locket?: boolean;
    /** Body half-width (tiles); length comes from the BeastSpec. */
    bodyW: number;
    backH: number;
    /** The mild rump rise — a kept cat, never the lynx's coiled ramp. */
    haunchH: number;
    shoulderH: number;
    chestH: number;
    tuckH: number;
    headW: number;
    headH: number;
    seed?: number;
}
/**
 * Resolve one cat's whole look from its stable seed. Wild bodies
 * dress off their eid; a kept companion dresses off the lookSeed the
 * wire carries (THE COAT OUTLIVES THE BODY) — the FULL seed keys the
 * cache because pet seeds are 31-bit rolls, not small eids.
 */
export declare function housecatLook(defId: string, seed?: number): HousecatLook;
/**
 * The house cat's body: a compact level-backed loaf on the block
 * dialect, morphing continuously into THE SIT — haunches folded
 * under, spine sloping up to a lifted chest — as `sitK` rises. The
 * sit is the species' whole domestic identity, so the morph is a
 * first-class body state, not a pose hack: footprint, topline, and
 * belly all interpolate, and the folded haunch paints as real mass.
 */
export declare function paintHousecatBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: HousecatLook, f: BeastBlockFrame, sitK?: number): void;
/**
 * The house cat's head — the feline grammar (the lynx's law: a FLAT
 * face, the muzzle plate barely leaving the skull at profile, the
 * canid wedge banned forever) recut CUTE: a round skull, eyes a full
 * size up from any wild cat's, small neat ears on the elastic pair,
 * the pink leather triangle, and the whisker fan at close zoom. The
 * ears ride EarSim — they lag the turn, flap with the trot, and
 * flick at rest; sim-less callers get THE ONE REST.
 */
export declare function drawHousecatHead(ctx: CanvasRenderingContext2D, look: HousecatLook, o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Wall clock for the ear sim and the blink; absent = settled rest. */
    nowMs?: number;
    ears?: EarSim;
    /** 0..1 through THE SIT — steadies the ears, slows the blink. */
    sitK?: number;
}): void;
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
export declare const FOX_LOOKS: Record<string, FoxLook>;
export declare function foxLook(defId: string, seed?: number): FoxLook;
export declare function paintFoxBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: FoxLook, f: BeastBlockFrame): void;
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
export declare function drawFoxHead(ctx: CanvasRenderingContext2D, look: FoxLook, o: {
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
}): void;
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
import { PoseState, type Look } from '@devcraft/shared';
import { LegRig, type LegPose, type LegRigConfig } from './legs.js';
export type { LegPose } from './legs.js';
export declare class LegSolver extends LegRig {
    constructor();
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
        /** Low-passed arm-swing drive (see the SMOOTHED SWING law). */
        sw?: number;
        swMs?: number;
    };
    bodyColor: string;
    hurt: boolean;
    isOwn: boolean;
    weaponItem?: string;
    /** Mainhand enchant id — overlays the enchant's fx on the weapon art. */
    weaponEnch?: string;
    /** Offhand enchant id — a dual-wielded second blade burns its own hue. */
    offhandEnch?: string;
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
    /** Time-based swing driver for the gather pose. */
    gatherPhase: number;
    /**
     * Which station a Craft pose is working: picks the choreography
     * (hammer-and-tongs, furnace stoking, fire tending, bench work) and
     * the bespoke props that go with it.
     */
    craftKind?: 'anvil' | 'furnace' | 'fire' | 'workbench' | null;
    /**
     * The Gather target is a forage plant: bare-handed picking — one
     * hand steadies the stems while the other reaches, plucks, and
     * carries the harvest back to the belt pouch. No tool is drawn.
     */
    foraging?: boolean;
}
/** Duration of one mining swing (windup→heave→strike→pry), ms. */
export declare const MINE_CYCLE_MS = 880;
/** Duration of one woodcutting chop, ms. */
export declare const CHOP_CYCLE_MS = 700;
/** Duration of one anvil hammer blow, ms. */
export declare const ANVIL_CYCLE_MS = 640;
/** Duration of one forage pluck (reach→tug→snap→pouch), ms. */
export declare const FORAGE_CYCLE_MS = 1050;
/** Duration of one furnace stoking push, ms. */
export declare const FURNACE_CYCLE_MS = 1700;
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
/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export declare function shade(hex: string, amount: number): string;
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
    foot: 'hoof' | 'paw' | 'claw' | 'bearpaw';
    /** Bare shanks (chicken) instead of body-shaded legs. */
    legColor?: string;
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
 * through the pounce telegraph; corpses pass `dead` (no eyes).
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
    /** 0..1 quick idle ear twitch. */
    flick?: number;
}): void;
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
 * The boar: a front-loaded battering wedge — massive shoulders under a
 * bristle crest, deep low-slung barrel, short muzzle ending in a flat
 * pink snout disc flanked by up-curved tusks.
 */
export interface BoarLook {
    hide: string;
    bristle: string;
    snout: string;
    tusk: string;
    earIn: string;
    bodyW: number;
    backH: number;
    /** Extra bristle-crest mass peaked over the shoulders. */
    crestH: number;
    chestH: number;
    headW: number;
    headH: number;
}
export declare const BOAR_LOOK: BoarLook;
export declare function paintBoarBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: BoarLook, f: BeastBlockFrame): void;
/**
 * The boar head: a short deep wedge with pinned-back ears, a stubby
 * muzzle ending in the flat SNOUT DISC (the pig read), and white tusk
 * chips hooking up from the jaw. `charge` lowers everything.
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
    /** 0..1 through the charge telegraph — ears pin, head drops. */
    charge?: number;
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
}
export declare const STAG_LOOK: StagLook;
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
export declare function paintCrabBody(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: CrabLook, f: BeastBlockFrame, at?: number): void;
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
 * The slime: a hopping gel block in the wall-prism dialect — a chamfered
 * cube that squashes on landing, stretches mid-hop, and breathes at
 * rest, with a darker nucleus riding low in the mass. One body reads at
 * both sizes (the halves pass `radius` small).
 */
export declare function drawSlime(ctx: CanvasRenderingContext2D, o: {
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
    /** 0..1 how much the body is actually travelling — stills the hop. */
    moveK: number;
    attackT?: number;
    ys: number;
}): void;
/**
 * The cave bat: an airborne body — leathery wing fans beating on their
 * own clock, a round tuft body hovering shoulder-high, big dish ears.
 * The ground never touches it; the renderer throws its shadow.
 */
export declare function drawBat(ctx: CanvasRenderingContext2D, o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    nowMs: number;
    seed: number;
    attackT?: number;
    ys: number;
}): void;
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
}): void;
//# sourceMappingURL=rig.d.ts.map
import { PoseState, type Look } from '@arx/shared';
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
     */
    sitStyle?: 'floor' | 'chair' | 'throne';
    /** Seat surface height for chair/throne sits, tile units above ground. */
    seatH?: number;
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
/** Duration of one mining swing (windup→heave→strike→pry), ms. */
export declare const MINE_CYCLE_MS = 880;
/** Duration of one woodcutting chop, ms. */
export declare const CHOP_CYCLE_MS = 700;
/** Duration of one anvil hammer blow, ms. */
export declare const ANVIL_CYCLE_MS = 640;
/** Duration of one forage pluck (reach→tug→snap→pouch), ms. */
export declare const FORAGE_CYCLE_MS = 1050;
/** Duration of one two-hand milking beat (each hand pulls once), ms. */
export declare const MILK_CYCLE_MS = 640;
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
    /** Pale underfur: throat, jaw underside, the tail's low edge. */
    underfur: string;
    /** The dull green-gray hide where the fur thins: muzzle and paws. */
    skin: string;
    /** Speckle ink — the hyena's broken spot field over the coat. */
    spot: string;
    /** The bristled crest: crown, nape, and down the hunched back. */
    mane: string;
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
/**
 * The bushy tail — short and heavy, carried LOW (a hyena's flag only
 * rises for a fight; ours stays sunk, which keeps the silhouette
 * hunched even from behind). A stub spine with a fat fur ribbon and a
 * dark tip cap, wagging a little harder with the gait. Drawn in the
 * torso's squashed frame BEFORE the garment so the root tucks behind
 * the body.
 */
export declare function paintGnollTail(ctx: CanvasRenderingContext2D, gn: GnollLook, f: KoboldTailFrame): void;
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
    /** 0..1 quick idle ear twitch. */
    flick?: number;
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
/**
 * Death ragdolls: a small position-based physics skeleton simulated in
 * the billboard plane (screen-x, height), anchored to a world ground
 * point that the renderer slides along the killing blow. The victim's
 * limbs go limp and trail the body's momentum, the trunk topples, and
 * everything thuds into the ground line and stays down — no restitution
 * to speak of, no spinning. This is the model behind every defeated
 * character and creature.
 *
 * Coordinates: local tiles, x = screen right, y = screen DOWN (so the
 * ground line is y = point.floor, and airborne is negative y). The
 * caller owns the world anchor; frame-to-frame anchor velocity changes
 * are fed back in as `carry` so limbs keep their world momentum when
 * the body decelerates — that inertia is what pitches a sliding corpse
 * over its own pinned feet.
 */
import { type BeastSpec, type GnollLook, type GoblinLook, type KoboldLook, type OwlLook, type SkeletonLook } from './rig.js';
import { type GolemLook } from './golems.js';
import { type OgreLook } from './ogre.js';
import { type SkralLook } from './skral.js';
import { type HobgoblinLook } from './hobgoblin.js';
export interface RagPoint {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** This point's own rest line — tiny scatter so a body lies staggered. */
    floor: number;
    grounded: boolean;
}
interface RagStick {
    /** Fraction of the constraint correction the `b` end absorbs
     *  (0.5 = symmetric). Light cloth anchored on heavy bone rides at
     *  0.75–0.9 so the cape follows the body, never drags it. */
    bias?: number;
    a: number;
    b: number;
    len: number;
    /** 1 = rigid bone; <1 = soft brace (trunk bend resistance). */
    stiffness: number;
}
/** A touchdown worth reacting to (dust, thud sfx). */
export interface RagImpact {
    x: number;
    y: number;
    speed: number;
    /** True for the trunk points — the body landing, not a hand flopping. */
    heavy: boolean;
}
export declare class Ragdoll {
    readonly pts: RagPoint[];
    private readonly sticks;
    /** Indices whose touchdown counts as the body hitting the ground. */
    private readonly heavySet;
    private stillFor;
    settled: boolean;
    /**
     * Seeded launch jitter (mulberry32). Math.random here made every
     * death — and the ragdoll test suite — nondeterministic; two clients
     * watching the same kill each rolled a different corpse. Seed it per
     * ragdoll and the tumble is a pure function of (victim, blow).
     */
    private rngState;
    /** The build seed, kept whole for deterministic corpse painters
     *  (the launch RNG mutates its own copy). */
    readonly seed: number;
    constructor(pts: RagPoint[], sticks: RagStick[], heavy: number[], seed?: number);
    private rand;
    /**
     * Advance the simulation. `carryX/carryY` is the velocity DELTA of the
     * moving anchor frame this step (screen-tile units): points inherit
     * the opposite so their world-space momentum is conserved.
     * Touchdowns hard enough to matter are pushed onto `impacts`.
     */
    step(dt: number, carryX: number, carryY: number, impacts?: RagImpact[]): void;
    /** Fraction of points resting on the ground — the caller's slide drag. */
    groundedFrac(): number;
    /** Local-space bounds (tiles) for outline/culling rectangles. */
    bounds(): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    /**
     * The killing blow. `kx/ky` is the blow's screen-plane direction
     * (unit-ish), `power` 0..1 the severity. The trunk and head take the
     * hit hardest — the differential against friction-pinned feet is what
     * pitches the body over instead of spinning it like a prop.
     */
    launch(kx: number, ky: number, power: number, upper: number[], feet: number[]): void;
}
/** Humanoid skeleton point indices (see buildHumanoidRagdoll). */
export declare const H: {
    readonly pelvis: 0;
    readonly chest: 1;
    readonly head: 2;
    readonly kneeL: 3;
    readonly footL: 4;
    readonly kneeR: 5;
    readonly footR: 6;
    readonly elbowL: 7;
    readonly handL: 8;
    readonly elbowR: 9;
    readonly handR: 10;
};
/** Simulated cape stations riding a caped ragdoll: the mid-cloth
 *  point and three hem stations, in `Ragdoll.pts` index space. */
export interface RagCapeIdx {
    mid: number;
    hem: [number, number, number];
}
/**
 * Standing humanoid skeleton, proportioned like the live rig (HEIGHT=1
 * scaled by `size`). Floor scatter comes from the seed so two goblins
 * never sprawl identically. `cape` appends a light cloth chain off the
 * chest — mid-cloth plus three hem stations on mass-biased soft sticks
 * — so the banner STREAMS through the tumble on the same simulation,
 * floors with the body, and freezes with it when the sim sleeps: the
 * settled corpse costs exactly what it cost before.
 */
export declare function buildHumanoidRagdoll(size: number, seed: number, cape?: boolean): Ragdoll;
/** Upper-body / feet index groups for launch(). */
export declare const HUMANOID_UPPER: (1 | 2 | 7 | 8 | 9 | 10)[];
export declare const HUMANOID_FEET: (4 | 6)[];
/**
 * Beast skeleton: rear hip, front chest, head, then one two-segment
 * chain per leg in the species spec's order. Chains attach to the rear
 * spine point for hind legs (fwd < 0) and the front for the rest.
 */
export declare function buildBeastRagdoll(spec: BeastSpec, radius: number, seed: number): Ragdoll;
export declare const BEAST_UPPER: number[];
/** Screen-space projection of local ragdoll points. */
export interface RagFrame {
    /** Anchor ground point on screen (pixels). */
    ax: number;
    ay: number;
    /** Pixels per tile. */
    s: number;
}
/**
 * The gear a humanoid was wearing at the death instant. Death never
 * strips a body: the corpse falls in the same armor colors, the helmet
 * stays seated, the shield rides the fallen forearm, and the weapon
 * lies along the fist that held it — defeating a knight leaves a
 * knight on the ground, not an undressed villager.
 */
export interface CorpseGear {
    head?: string;
    body?: string;
    legs?: string;
    boots?: string;
    gloves?: string;
    weapon?: string;
    offhand?: string;
    /** The banner comes down with its bearer — spilled cloth under the
     *  fallen trunk, in the cape's own colors, hem cut and emblem. */
    cape?: string;
    /** Enchant ids riding the weapons — the fx channel survives death. */
    weaponEnch?: string;
    offhandEnch?: string;
}
export interface HumanoidCorpseLook {
    bodyColor: string;
    skinColor: string;
    hairColor: string;
    size: number;
    /** Set = this corpse is a skeleton: paint bones, not flesh. */
    skel?: SkeletonLook;
    /** Set = this corpse is a kobold: horns, muzzle, and tail stay. */
    kob?: KoboldLook;
    /** Set = this corpse is a gnoll: muzzle, crest, and coat stay. */
    gno?: GnollLook;
    /** Set = this corpse is a goblin: wing ears, hook nose, and tusks stay. */
    gob?: GoblinLook;
    /** Set = this corpse is a golem: the construct comes APART — the
     *  stack slides, the plates spring, the furnace goes out. */
    gol?: GolemLook;
    /** Set = this corpse is an ogre: THE FELLED HILL — the gut is the
     *  mound, the jaw still juts, the club lies by the open hand. */
    ogr?: OgreLook;
    /** Set = this corpse is a skral: the lantern eye gone dull, the
     *  crest flopped flat over the skull, the needle grin slack. */
    skr?: SkralLook;
    /** Set = this corpse is a hobgoblin: the painted helm still
     *  seated, the corner fang proud of a jaw that gives no more
     *  orders. */
    hob?: HobgoblinLook;
    /** Worn equipment — the corpse keeps everything it died in. */
    gear?: CorpseGear;
}
/**
 * Paint a humanoid ragdoll in the rig's own dialect: trapezoid torso
 * with a hard shade half, chamfered block head with the hair slab,
 * two-segment limbs, square mitts, boot chips. Far-side limbs go
 * behind the trunk, near-side in front — a sprawl, not a stack.
 */
export declare function drawHumanoidRagdoll(ctx: CanvasRenderingContext2D, rag: Ragdoll, f: RagFrame, look: HumanoidCorpseLook, nowMs?: number): void;
export interface BeastCorpseLook {
    spec: BeastSpec;
    radius: number;
    color: string;
    defId: string;
    seed: number;
    /**
     * The plumage the owl wore alive — resolved from the RAW eid at the
     * death instant (the gnoll corpse-coat law), so the fallen body
     * keeps its cluster instead of rolling a stranger's.
     */
    owl?: OwlLook;
}
export declare function drawBeastRagdoll(ctx: CanvasRenderingContext2D, rag: Ragdoll, f: RagFrame, look: BeastCorpseLook): void;
export {};
//# sourceMappingURL=ragdoll.d.ts.map
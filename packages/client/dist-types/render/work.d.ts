/**
 * Work — THE WORK LIVES IN THE WORLD.
 *
 * The one work engine every laboring body swings through — gathering,
 * station craft, dairy work, and (in later phases) every verb the
 * world can be worked with. The old vocabulary was the last survivor
 * of the pre-strike-engine geometry: eight piecewise cycles inside
 * drawHumanoid sweeping the hands on an UNFORESHORTENED SCREEN CIRCLE
 * (`swingOffset` added to the facing, a radial `reach`), mirrored by a
 * bare cos(dir) sign, with the tool rigidly colinear with the arm ray.
 * A north-facing chop swung flat across the card, the axe never
 * passed behind the head, and stations didn't even get the mirror.
 *
 * THE LAWS (docs/work-cycles-plan.md — strikes.ts's laws, spoken for
 * labor):
 * 1. ONE GEOMETRY — a work beat is authored in the WORLD: a yaw track
 *    off the work bearing, a radius track, a height track, and a tool
 *    PITCH track (tools are long; their tips live in the world too).
 *    Fist, haft, tip, and impact FX project through WIELD_GROUND_K,
 *    so they agree at every heading by construction.
 * 2. THE WORK HAS A BEARING — every cycle aims at the worked tile.
 *    The rig hands the engine the square-up heading; the impact
 *    station reaches the node ring, and the burst spawns at the
 *    RESOLVED TIP, never at a guessed offset behind the swinger.
 * 3. THE MIRROR LAW — arcs are authored side = +1 and reflected
 *    across the bearing axis; height and pitch never mirror (gravity
 *    has one sign). The side predicate is cos(bearing) > 0 — the SAME
 *    test as the BIT-LEADS art flip in drawHeldItem; keep the two
 *    identical or edge/poll desync returns.
 * 4. THE SWEEP EARNS ITS LAYER — the resolved frame carries depthSin;
 *    when the work crosses the away side, the tool and the working
 *    pair paint behind the torso (an away-facing chop works BEHIND
 *    the body's silhouette, exactly like a cut through the north arc).
 * 5. THE IMPACT IS ONE TRUTH — this module owns the phase tables.
 *    The rig's swing, the particle gate, the sfx call, the haptic
 *    buzz, the station flash, and the node shiver all read the same
 *    book. Nothing beats on a private clock.
 * 6. EVERY RIG SPEAKS ITS OWN WORK — the engine resolves the shared
 *    arc; a per-dialect WORK VOICE (reach scale, raise cap, stoop
 *    deepening, tempo) adapts it to the body as parameters, never as
 *    forked choreography.
 *
 * Frame conventions match strikes.ts: screen radians, +y down.
 * Resolved offsets: dx PRE-SQUASH (the rig multiplies by wScale), dy
 * absolute from armY, both in units of the rig scale s. Tool pitch
 * follows projectCarry: 0 = straight down, positive tips toward the
 * bearing, |pitch| past π/2 climbs above level, negative trails away.
 */
/** The ten station verbs — one per StationType, THE VERB IS VISIBLE:
 *  the weaver, the tanner, the alchemist, the carver, the enchanter,
 *  and the sawyer each speak their own body language now, never the
 *  collapsed workbench pantomime. */
export type StationWorkKind = 'anvil' | 'furnace' | 'fire' | 'workbench' | 'alembic' | 'tanning_rack' | 'loom' | 'carving_bench' | 'enchanting_table' | 'sawhorse';
/**
 * The Craft-pose verbs: the ten true stations plus 'tend' — the
 * generic vessel-work read the async farm stations (windmill, churn,
 * press, keg, smoker, drying rack, compost bin, apiary) share for
 * their brief load/collect beats.
 */
export type CraftWorkKind = StationWorkKind | 'tend';
/** The verbs the engine speaks today (later phases widen this). */
export type WorkKind = 'chop' | 'mine' | 'fish' | 'forage' | 'milk' | 'build' | CraftWorkKind;
/**
 * One keyframe station of a cycle. Channels hold the value AT this
 * phase; the segment arriving here eases from the previous station
 * with this station's ease shape. Cycles wrap: the segment after the
 * last station arrives back at the first (phase 1.0 ≡ 0.0).
 */
interface WorkStation {
    /** Phase fraction [0, 1) this station sits at. */
    at: number;
    /**
     * Ease of the ARRIVING segment: 'out' decelerates in (windups —
     * heavy things gather speed leaving, not arriving), 'in'
     * accelerates in (drives — the blow lands at full speed), 'smooth'
     * eases both ends, 'hold' copies the previous station (a frozen
     * beat; channel values here must equal the previous station's).
     */
    ease: 'in' | 'out' | 'smooth' | 'hold';
    /** Fist yaw off the bearing, radians, authored for side = +1. */
    yaw: number;
    /** Fist reach from the body axis, units of s. */
    r: number;
    /** Fist height off armY, units of s (negative = raised). */
    dy: number;
    /** Tool pitch (projectCarry convention). Bare-hand kinds omit. */
    pitch?: number;
    /** Tool yaw off the bearing (mirrored like the fist yaw). Defaults
     *  to the fist yaw — tool square to the work. */
    toolYaw?: number;
    /** Torso lean peak (projected by the bearing's screen-x — a body
     *  facing the camera line bows instead of tipping sideways). */
    lean?: number;
    /** Work crouch 0..1 — knees give, hips settle (dairy work, low
     *  benches; the voices deepen it for the hunched dialects). */
    crouch?: number;
    /** Effort tremor amplitude at this station (radians on yaw, ×0.4 on
     *  dy) — the buried bite, the gripped tug. Interpolated, so shivers
     *  fade in and out instead of switching. */
    shiver?: number;
}
/** The off hand's job during a cycle. */
type OffHandSpec = 
/** Both hands on the haft: choked `d` (units of s) behind the main
 *  fist along the TOOL's screen direction, dropped `drop`. */
{
    mode: 'choke';
    d: number;
    drop: number;
}
/** Planted steady at a fixed bearing offset — the tongs hand, the
 *  stem-steadying hand. `sway` adds a slow breathing drift. */
 | {
    mode: 'steady';
    yawOff: number;
    r: number;
    dy: number;
    sway?: number;
}
/** Both hands carry together: off rides a screen-perpendicular
 *  offset from the main fist (the crucible carry). */
 | {
    mode: 'team';
    d: number;
    drop: number;
}
/** Alternation: the off hand replays the MAIN dy track a half-beat
 *  later at its own bearing offset (the milking pull). */
 | {
    mode: 'alt';
    yawOff: number;
    r: number;
};
export interface WorkSpec {
    /** One full beat, ms. */
    cycleMs: number;
    /** Phase of the contact moment — the particle gate, the sfx, the
     *  haptic, the node shiver, and the station flash all fire here.
     *  Null = continuous work with no discrete impact. */
    impactAt: number | null;
    /** Fist→business-end length along the tool direction, units of s.
     *  0 = bare hands (the tip IS the fist). */
    tipS: number;
    /** Whether the arc mirrors across the bearing (asymmetric swings do;
     *  symmetric two-hand work doesn't). */
    mirror: boolean;
    stations: WorkStation[];
    off: OffHandSpec;
}
export interface ResolvedWork {
    /** Main fist offset from (x, armY): dx pre-squash, units of s. */
    fistDX: number;
    fistDY: number;
    /** Off fist offset, same conventions. */
    offDX: number;
    offDY: number;
    /** The held tool's painter inputs (projected world rod). */
    toolAngle: number;
    toolFore: number;
    /** Business-end offset from (x, armY) — the truth the impact FX
     *  spawn at. Equals the fist for bare-hand kinds. */
    tipDX: number;
    tipDY: number;
    /** The business end on the WORLD ground plane (tiles off the body,
     *  no camera compression) — where the renderer's particle bursts
     *  and glows land, since particles live in world coordinates. */
    tipGX: number;
    tipGY: number;
    /** World depth of the fist's yaw: sin(worldYaw). Negative = the
     *  away side — the rig's layer law (THE SWEEP EARNS ITS LAYER). */
    depthSin: number;
    /** Torso lean, projected by the bearing's screen-x. */
    lean: number;
    /** Work crouch 0..1 for the knee/hip channel. */
    crouch: number;
}
/**
 * THE CHOREOGRAPHY BOOK. Authored side = +1: asymmetric swings pass
 * over the DOWN-SCREEN shoulder of a right-facer, exactly where the
 * old right-facer cycles lived, so the east-facing read every prior
 * verdict was passed on survives the projection unchanged.
 */
export declare const WORK_BOOK: Record<WorkKind, WorkSpec>;
/**
 * THE WORK MIRROR: the side predicate — cos(bearing) > 0. The SAME
 * test as the BIT-LEADS art flip in drawHeldItem (rig.ts): keep the
 * two identical or the honed edge stops leading the sweep.
 */
export declare function workSideOf(bearing: number): 1 | -1;
/**
 * EVERY RIG SPEAKS ITS OWN WORK — the voice: per-dialect parameters
 * that adapt the shared arc to the body carrying it, never a fork of
 * the choreography. The worklab verdict that demanded it: the flesh
 * frame's overhead haul parked the axe across the gnoll's muzzle
 * (a sunken skull lives at human chest height — the stoop-lane
 * failure class), and the kobold's ready carry laid the pick over
 * its oversized head.
 */
export interface WorkVoice {
    /** Cap on RAISED heights (negative dy scales by this): hunched
     *  skulls and small folk never haul a tool through their own face
     *  band. 1 = the full human raise. */
    raiseK: number;
    /** Reach scale — long ape arms work a little further out. */
    reachK: number;
    /** Outboard yaw pushed into raised stations (radians at full
     *  raise, mirrored with the arc): the haft clears the skull
     *  sideways exactly when it is up. */
    clearYaw: number;
    /** Extra fist drop across the whole cycle, units of s — the work
     *  settles toward the dropped hand ring of a stooped carriage. */
    dropS: number;
    /** Torso-lean scale: a spine already pitched by its stoop answers
     *  the work with less extra bend. */
    leanK: number;
}
export declare const WORK_VOICE_NEUTRAL: WorkVoice;
/**
 * Resolve one work frame. `u` is cycle phase [0,1) — callers derive it
 * from the ONE clock (`workCycleU`). `bearing` is the square-up
 * heading toward the worked tile (world radians).
 */
export declare function resolveWork(kind: WorkKind, u: number, bearing: number, nowMs: number, voice?: WorkVoice): ResolvedWork;
/** Phase of the ONE work clock for an entity. `phaseMs` is the
 *  caller's per-body offset (the renderer's lifeMs de-sync — a work
 *  crew never swings in lockstep). */
export declare function workCycleU(kind: WorkKind, nowMs: number, phaseMs?: number): number;
/** Integer beat counter — the impact gate's once-per-cycle latch. */
export declare function workCycleN(kind: WorkKind, nowMs: number, phaseMs?: number): number;
export {};
//# sourceMappingURL=work.d.ts.map
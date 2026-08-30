/**
 * THE FLIGHT RIG — the dedicated carriage every flying creature rides.
 *
 * Fliers never touch the walking LegRig: a wing is not a leg with
 * feathers, and a flying body is not a standing body lifted off the
 * grass. This module owns the whole problem once, under the motion
 * doctrine's three laws:
 *
 * 1. FLIGHT IS A CARRIAGE, NOT A SET OF POSES. One rig blends three
 *    canonical carriages off smoothed travel — THE HOVER (body pitched
 *    near upright, deep slow rowing beats, treading its own column of
 *    air), SLOW FLIGHT (half-pitched, working beats), and CRUISE
 *    (streamlined level, quick shallow beats broken by seeded glides).
 *    Every channel — pitch, tempo, depth, sweep, tail fan — derives
 *    from the same continuous blend, so the transitions the states
 *    live between are smooth BY CONSTRUCTION, never authored twice.
 *
 * 2. THE BONE IS RIGGED, THE SURFACE IS SIMULATED. The wing skeleton
 *    (shoulder → wrist → hand) swings on one analytic two-harmonic
 *    beat curve through a phase ACCUMULATOR — tempo can change
 *    mid-stroke without a pop, which a `now × frequency` clock can
 *    never promise. The wing SURFACE — the feather vane or the
 *    membrane — is a chain of spring-damped trailing-edge stations
 *    driven by the bone's angular acceleration: the flap wave washing
 *    tipward, the billow under the power stroke, the tip whip at the
 *    turn of the beat, and the settle after a brake all EMERGE from
 *    the sim instead of being posed. The strike's mantle snap runs
 *    through the same rig, so the feathers visibly drag behind it.
 *
 * 3. ONE PITCHED HULL, ONE PROJECTOR. Nose, vent, shoulders, tail
 *    root and head seat all live on one body axis that pitches from
 *    upright to level; every part projects through the same
 *    (F fwd, L lateral, Z up) lens the great owl proved out. The
 *    hover and the cruise are the same anatomy at two dial positions
 *    — which is exactly why the band between them reads as one
 *    animal changing its mind, not two drawings cross-fading.
 */
import { type BeastSpec, type OwlLook } from './rig.js';
export interface WingBeat {
    /** Arm carriage sample, −1..1 (+ = raised). */
    arm: number;
    /** The hand trails the arm by a fixed phase — the skeletal lag. */
    hand: number;
    /** 0..1 smoothstepped power-stroke window (wing sweeping down). */
    power: number;
    /** 0..1 recovery window (wing rising). */
    recover: number;
    /** 0..1 downwash window, lagging the velocity peak. */
    gust: number;
}
/**
 * THE WINGBEAT — one smooth analytic curve, asymmetric by construction
 * and continuous to every derivative (a piecewise beat carries a
 * velocity kink at the stroke bottom that reads as frame-skip). Two
 * phase-locked harmonics give the bird stroke for free: a breath of
 * overswing at the top, a short accelerating POWER stroke down (~36%
 * of the period), and a long decelerating recovery. `u` is the phase
 * in CYCLES — the rig accumulates it, so tempo changes never jump the
 * stroke.
 */
export declare function wingBeat(u: number): WingBeat;
/**
 * THE SURFACE IS A SIMULATION — the vane behind the bone. Each wing
 * carries a chain of trailing-edge stations, shoulder to tip. Every
 * station holds a LAG angle: how far its stretch of vane trails
 * behind the leading edge's carriage. The bone's angular acceleration
 * drives the chain (a surface with inertia is LEFT BEHIND by a bone
 * that snaps), an inboard-coupling spring washes the wave tipward,
 * and every station springs home to rest — feathers with TONE, a
 * membrane with billow, the same class either way, tiered by damping
 * exactly like cloth < ear < tail in the ground lineage.
 *
 * Shared sim contracts kept: snap-to-rest on first sight and teleport
 * (never whip across the map), THE ONE REST (a settled sim is
 * identical to the stateless rest chain, so sheets and pinned cards
 * paint exactly what the game relaxes to), the STRENGTH LAW hard cap
 * (a vane bends, never folds through itself), and a `restless` flag
 * for the renderer's re-bake cue.
 */
export declare class WingSim {
    readonly stations: number;
    readonly tone: number;
    /** Per-station trailing lag (radians behind the bone's carriage). */
    readonly lag: number[];
    /** Per-station angular velocity (rad/s). */
    readonly vel: number[];
    /** True while any station still genuinely moves. */
    restless: boolean;
    private armPrev;
    private armVelPrev;
    private live;
    /** STRENGTH LAW: the vane bends, never folds. */
    private readonly cap;
    private readonly w2;
    private readonly damp;
    private readonly couple;
    /**
     * `stations` is the segment count of the vane; `tone` is muscle —
     * 1 = feather (stiff, near-critical, comes home in one swing),
     * ~0.55 = membrane (loose, billows, a beat late at the scallops).
     */
    constructor(stations: number, tone: number);
    /** First sight, teleport, corpse: the vane lies at rest instantly. */
    snap(arm?: number): void;
    /**
     * Advance one frame. `arm` is the leading edge's carriage angle
     * (radians) — the rig's raise channel, attack shaping included, so
     * a mantle snap drags the vane exactly like a beat does.
     */
    update(arm: number, dt: number): void;
}
/**
 * A species' flight dial sheet. Everything a body needs to ride the
 * rig — the art (span, palettes, silhouettes) stays in its painter.
 */
export interface FlierSpec {
    /** Idle altitude over the ground anchor (tiles). */
    hover: number;
    /** Cruise wingbeat (Hz). */
    beatHz: number;
    /** Hover tempo multiplier (<1 = the hover slows and deepens). */
    hoverBeatK: number;
    /** Whether cruise seeds glide windows (owls yes, bats never). */
    glides: boolean;
    /** Trailing-edge sim stations per wing. */
    stations: number;
    /** Vane tone: 1 = feather, ~0.55 = membrane. */
    tone: number;
    /** Hover pitch-up (radians from level — the near-vertical tread). */
    uprightA: number;
    /** Simulated tail-chain length (tiles); 0 = the species has none. */
    tail: number;
    /** Stern reach (tiles aft of the anchor) where the tail docks. */
    stern: number;
}
/** The great owl: slow heavy feathered beats, seeded glides. */
export declare const OWL_FLIER: FlierSpec;
/** The elder: more mass on the wing — slower still, higher seat. */
export declare const ELDER_OWL_FLIER: FlierSpec;
/** The cave bat: quick loose membrane flutter, never a glide. */
export declare const BAT_FLIER: FlierSpec;
/**
 * The giant bat: the orchard-shadow soarer — a flying fox's build.
 * Long slow strokes on a broad sail, but still a MEMBRANE: it never
 * earns the feathered glide, its languor lives in the tempo alone.
 */
export declare const GIANT_BAT_FLIER: FlierSpec;
/**
 * The dire bat: the ragged hunter. Heavy hammering strokes — quicker
 * than the giant, far heavier than the cave flutter — on the loosest
 * sail in the sky (the torn trailing edge billows a beat behind), and
 * the deepest hover hunch: it hangs in the air like a threat.
 */
export declare const DIRE_BAT_FLIER: FlierSpec;
/** The rig ledger by def id — the renderer's one lookup. */
export declare function flierSpec(defId: string): FlierSpec;
/**
 * One frame of flight — everything a painter reads. All lengths in
 * TILES (the painter scales), all angles in radians.
 */
export interface FlightFrame {
    /** 1 = treading the hover, 0 = fully underway. */
    hoverK: number;
    /** 1 = full streamlined cruise. */
    cruiseK: number;
    /** Body pitch blend: 1 = level cruise hull, 0 = upright hover. */
    pitchK: number;
    /** The hull's actual pitch-up angle (radians). */
    pitchA: number;
    /** Signed banking roll (radians) — the whole projected bird rolls. */
    bank: number;
    /** Altitude of the body center over the ground anchor (tiles). */
    lift: number;
    /** Hover tread drift (tiles): forward / lateral wander. */
    driftF: number;
    driftL: number;
    /** The beat sample the skeleton rides. */
    beat: WingBeat;
    /** Arm / hand carriage angles (radians; beat + attack shaping). */
    raise: number;
    raiseHand: number;
    /** Rowing wrist offset (tiles) through the stroke. */
    swing: number;
    /** 0..1 wing unfold. */
    spread: number;
    /** Primary back-sweep: grows with cruise speed and the dive. */
    sweepK: number;
    /** 0..1 downwash window. */
    gust: number;
    /** 0..1 seeded glide lock. */
    glideK: number;
    /** Pale-underside flash (mantling raises past the warning line). */
    under: boolean;
    /** 0..1 landing-gear channel — the strike drops and opens talons. */
    talonK: number;
    /** Strike lunge along the facing (tiles). */
    lungeF: number;
    /** Trailing-vane lag per station, port (−L) and starboard (+L). */
    port: readonly number[];
    star: readonly number[];
    /** Tip angular velocity per wing — the painter's flex cue (rad/s). */
    portTipVel: number;
    starTipVel: number;
    /**
     * THE TAIL IS A SIMULATION: world-relative chain node offsets from
     * the ground anchor (dx, dy in world tiles; z tiles up). The tail
     * lives in WORLD space — it drags, streams and flops behind the
     * body by physics, and deliberately does NOT ride the bank roll
     * (a free appendage lags the body's roll; that IS the read).
     * Empty for tailless species.
     */
    tail: ReadonlyArray<{
        dx: number;
        dy: number;
        z: number;
    }>;
    /** True while any sim still moves — the renderer's re-bake cue. */
    restless: boolean;
}
export declare class FlightRig {
    readonly spec: FlierSpec;
    private readonly portWing;
    private readonly starWing;
    /** Wingbeat phase in CYCLES — accumulated, never derived from the
     *  clock, so tempo changes can't jump the stroke. */
    private phase;
    /** Rig-local seconds — accumulated for the seeded life waves. */
    private t;
    private moveS;
    private pitchA;
    private bank;
    private glide;
    private lastX;
    private lastY;
    private lastDir;
    private readonly seedF;
    /** The simulated tail chain (world space); empty when spec.tail=0. */
    private readonly tailNodes;
    /** Scratch: world-relative tail offsets handed out each frame. */
    private readonly tailOut;
    constructor(spec: FlierSpec, seed: number);
    /** Lay the tail chain at rest behind the facing — first sight and
     *  teleports never whip an appendage across the map. */
    private snapTail;
    /**
     * Advance the tail one frame: a world-space verlet chain rooted at
     * the vent, with feather TONE — every node springs toward the rest
     * carriage (streamed behind the facing, drooping toward the tip) so
     * the fan drags through turns, streams at speed, flops past a hard
     * stop, and always comes home. The dive whips it up and behind by
     * pure physics — nothing here is posed.
     */
    private tickTail;
    /**
     * Advance one frame and return the carriage. `moveK` is the
     * renderer's smoothed 0..1 travel activity; `attackT` the pounce
     * clock (0..0.7 windup, 0.7..1 strike); `air` scales altitude for
     * species that ever ride low (default full flight).
     */
    update(o: {
        x: number;
        y: number;
        dir: number;
        moveK: number;
        dt: number;
        attackT?: number;
        air?: number;
    }): FlightFrame;
}
/**
 * THE PARLIAMENT RIDES THE RIG: the great owl's one body painter.
 *
 * The hover is a WATCH — body swung near upright on the pitched hull,
 * deep slow rowing beats, fanned tail braced underneath, head level
 * on top sweeping the glade. Speed pitches the same anatomy down
 * through slow flight into the streamlined cruise: long level hull,
 * quick shallow beats broken by seeded glides, tail trailing the
 * flight line. Banking rolls body, wings and tail into the turn while
 * the head — computed pre-roll and painted LAST, UNROTATED — holds
 * the horizon: THE GIMBAL LAW, never broken. The swoop mantles high
 * through the windup (pale undersides flashing) and dives with both
 * talons thrown forward — and because the mantle snap runs through
 * the rig, the wing vanes visibly drag behind the strike.
 */
export declare function drawGreatOwl(ctx: CanvasRenderingContext2D, spec: BeastSpec, look: OwlLook, o: {
    /** Ground anchor on screen (terrain-lifted) — where the shadow lives. */
    x: number;
    y: number;
    s: number;
    dir: number;
    ys: number;
    /** The rig's carriage this frame. */
    flight: FlightFrame;
    attackT?: number;
    hurt?: boolean;
    nowMs: number;
    seed: number;
    /** Keeper's strap for a tamed companion — worn gear, never a dye. */
    collar?: string;
}): void;
/**
 * THE COLONY'S DIAL SHEET — one look interface, three bespoke bodies.
 * Every dial the painter reads lives here, so a new bat is a design
 * decision, never a code fork: the CAVE BAT (the minimal dusk
 * flutterer — big dish ears on a small tuft body), the GIANT BAT (the
 * orchard-shadow soarer: a fox-muzzled head, a maned ruff, one broad
 * slow sail), and the DIRE BAT (the ragged hunter: gaunt hunched
 * hull, horn-swept ears, bared fangs, wrist hooks, and a torn
 * trailing edge). Art dials only — motion lives in the FlierSpec.
 */
export interface BatLook {
    /** Body and head fur. */
    coat: string;
    /** The pale chest tuft — the hull's keel tone. */
    chest: string;
    /** Membrane leather — the camera-side (top) face. */
    sail: string;
    /** Membrane underside — the paler lit leather. */
    sailUnder: string;
    /** Arm and finger bone ink. */
    bone: string;
    /** Inner-ear skin — the dish's lining. */
    earSkin: string;
    /** Eye lamp. */
    eye: string;
    /** Fang ivory. */
    fang: string;
    /** Nose-pad leather. */
    nose: string;
    /** Hull half-length (tiles). */
    bodyR: number;
    /** Hull half-width (tiles). */
    bodyW: number;
    /** Skull radius (tiles). */
    headR: number;
    /** Muzzle reach past the skull rim (tiles) — the fox dial. */
    muzzle: number;
    /** Ear reach off the crown (tiles). */
    earLen: number;
    /** Ear base half-width (tiles). */
    earW: number;
    /** Ear back-sweep 0..1: 0 an upright dish, 1 a swept horn. */
    earBack: number;
    /** One wing's reach (tiles). */
    wingSpan: number;
    /** Membrane fingers (3..5) — each rides a sim station. */
    fingers: number;
    /** Trailing-edge scallop depth 0..1. */
    scallop: number;
    /** 0 = a clean trailing edge, 1 = the dire's torn rag. */
    ragged: number;
    /** Wrist thumb-hook reach (tiles); 0 = none. */
    thumbClaw: number;
    /** Shoulder mane mass 0..1 — the giant's ruff. */
    ruff: number;
    /** Dorsal hump 0..1 — the dire's hunch. */
    hunch: number;
    /** Tail-membrane reach past the vent (tiles); 0 = none. */
    tailSail: number;
    /** Fang length as a skull-radius fraction. */
    fangLen: number;
    /** Eye lamp radius as a skull-radius fraction. */
    eyeR: number;
    /** Fangs bared at rest — the dire never closes its mouth. */
    fangBare: boolean;
    /** Seeded modular: one torn ear. */
    earNotch?: boolean;
    /** Seeded modular: fur mottle patches on the hull. */
    mottle?: boolean;
    variant: 'cave' | 'giant' | 'dire';
    seed?: number;
}
/** The dusk flutterer — kept minimal on purpose: ears, eyes, wings. */
export declare const CAVE_BAT_LOOK: BatLook;
/**
 * The orchard-shadow soarer — a flying fox, drawn from life and then
 * sized for menace: a long fox muzzle where the cave bat wears a
 * snub, SMALL ears (the fruit-eater's face, unmistakable beside the
 * hunter's dishes), a maned russet ruff over the shoulders, and one
 * broad shallow-scalloped sail per side. It carries NO tail membrane
 * — the flying fox's honest silhouette.
 */
export declare const GIANT_BAT_LOOK: BatLook;
/**
 * The ragged hunter — gaunt where the giant is heavy: a lean hunched
 * hull under a dorsal hump, horn-swept ears, blood-lamp eyes, fangs
 * BARED AT REST, wrist thumb-hooks riding the leading edge, and the
 * deepest, torn trailing edge in the sky — every scallop ripped into
 * seeded sub-notches, a sail that has been through other creatures.
 */
export declare const DIRE_BAT_LOOK: BatLook;
/**
 * Variant lookup with the cave bat as the unknown-id fallback. The
 * seed (spawn eid) is hashed first — roost-mates spawn with
 * CONSECUTIVE eids, and raw bits would dress a whole cave in one coat
 * — then rolls the skin cluster, a shade jitter, and the modular
 * bits. Cached; runs per body per frame.
 */
export declare function batLook(defId: string, seed?: number): BatLook;
/** A body-space point: (F fwd, L lateral, Z up) in tiles. */
type V3 = [number, number, number];
/**
 * ONE WING'S BONE CARRIAGE, in rig-local (F = forward, L = lateral,
 * Z = up) TILES. Solved once and read twice: the painter hangs the
 * membrane off these points, and `batExtent` measures the sprite's
 * true reach from the very same numbers — so the frame can never
 * disagree with the body it frames.
 */
export interface BatBones {
    /** Sail's inner anchor, tucked inside the hull core. */
    tuckF: number;
    tuckL: number;
    tuckZ: number;
    /** Shoulder. */
    shF: number;
    shL: number;
    shZ: number;
    /** Elbow — the apex that breaks the leading edge. */
    elbF: number;
    elbL: number;
    elbZ: number;
    /** Wrist — the wing's high outer apex; the thumb-hook's seat. */
    wrF: number;
    wrL: number;
    wrZ: number;
    /** Ankle — the last bay's low inner mooring. */
    ankF: number;
    ankL: number;
    ankZ: number;
    /** Finger tips, leading first; tips[0] carries the wingtip. */
    tips: V3[];
    /** Finger count (= tips.length). */
    N: number;
    /** Load flex cue folded into the tips. */
    flex: number;
}
/**
 * The bat's sprite reach this frame, in TILES off the ground anchor
 * (left/right signed on x, top/bottom positive away from the anchor).
 *
 * THE FRAME IS DERIVED, NEVER GUESSED — the same law the forest
 * learned. A bat's silhouette is not a fixed box: the beat swings the
 * wrists a third of a span above the hull, the bank rolls the whole
 * projected body so a horizontal span tips into vertical reach, and
 * the hover lifts the mass a full tile off its own shadow. A hand-set
 * constant that fits the cruise clips the downbeat of a giant bat
 * bearing down on the camera — the wingtips shear off at the top of
 * the composite box. So every candidate below is a real point out of
 * the SAME solver the painter draws from, run through the SAME
 * projection (facing basis → camera squash → bank roll), and the box
 * is their bound plus the membrane's own stroke half-width.
 */
export declare function batExtent(look: BatLook, fr: FlightFrame, dir: number, ys: number, 
/** Px per tile — a few of the painter's inks carry PIXEL floors
 *  (`Math.max(1.5, …)`) that outgrow their tile width at low zoom;
 *  the box has to hold the ink at the size it is actually laid. */
s?: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
};
/**
 * THE COLONY RIDES THE RIG — the one painter all three bat designs
 * share, every dial drawn from the BatLook. Root laws, all inherited
 * from the owl rounds and applied here at membrane dials:
 *
 * - THE CHEST RIDES THE PITCH: the hull is a real pitched solid
 *   between nose and vent poles — the hover stands it upright, cruise
 *   lays it flat, and the pale chest tuft is GEOMETRY (facing × pitch,
 *   dying to zero on away bands), never a sticker on a circle.
 * - THE FACE IS A TURNED SURFACE (THE SPHERE LAW): ears, eyes,
 *   muzzle, nose and fangs are (azimuth, height) STATIONS sliding
 *   around the skull sphere with pure-horizontal foreshortening — no
 *   visibility gates, nothing pops at any of 360°.
 * - THE FACE OF THE SAIL IS ITS OWN NORMAL (THE NORMAL LAW): which
 *   membrane face shows comes from the wing plane's 3D normal dotted
 *   with the true view ray — never projected winding, never a pose
 *   threshold.
 * - ROOT TUCK + SCAPULAR: the sail anchors INSIDE the hull core and a
 *   fur mass seats the joint — wings can never separate from the body.
 * - THE SHANK LAW: the hook feet (giant and dire only — the cave bat
 *   keeps its minimal read) stay under a tenth of a tile; the strike's
 *   reach is the body's lunge.
 */
export declare function drawBat(ctx: CanvasRenderingContext2D, look: BatLook, o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    hurt: boolean;
    nowMs: number;
    seed: number;
    ys: number;
    flight: FlightFrame;
    attackT?: number;
}): void;
/**
 * A deterministic staged frame for pinned contexts — studio cards,
 * portraits, tests. Runs a throwaway rig through fixed 60Hz steps at
 * a held travel dial, so the same arguments always paint the same
 * bird, and what they paint is exactly what the live rig settles to
 * (THE ONE REST, extended to the whole carriage).
 */
export declare function stagedFlight(spec: FlierSpec, o: {
    seed: number;
    moveK: number;
    attackT?: number;
    air?: number;
    steps?: number;
}): FlightFrame;
export {};
//# sourceMappingURL=flight.d.ts.map
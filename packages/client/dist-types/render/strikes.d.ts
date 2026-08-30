/**
 * Strikes — THE CUT LIVES IN THE WORLD.
 *
 * The one strike engine every melee school swings through (players and
 * every armed NPC alike — the rig is the only consumer). The old
 * vocabulary swept the fist on an UNFORESHORTENED SCREEN CIRCLE while
 * the slash trail rode a ground ellipse and the blade angle rode a
 * third projection — three geometries that could only agree at the
 * profile facings (the audit's "screen circles by design" comment was
 * the confession). This module replaces all of it with one law:
 *
 * THE LAWS
 * 1. ONE GEOMETRY — a cut is authored in the WORLD: a yaw sweep around
 *    the body, a height track, a radius track. Fist, steel, and wake
 *    all project through the same ground factor (WIELD_GROUND_K), so
 *    they agree at every one of the 360 headings by construction.
 * 2. THE MIRROR LAW — every arc is authored for the right-hand side
 *    (side = +1) and REFLECTED across the facing axis for the other:
 *    a cleave that lands down-forward at east lands down-forward at
 *    west. (The old adds-a-rotation model landed it up-forward — the
 *    inverted-vertical family of audit cells.) Height never mirrors:
 *    gravity has one sign.
 * 3. THE WAKE IS THE BLADE'S — the swoosh is built by re-sampling this
 *    same closed form over the swept beat, so it passes through the
 *    steel at every frame. A trail that can float free of the weapon
 *    cannot be drawn with this API.
 * 4. THE SWEEP EARNS ITS LAYER — the resolved frame carries the
 *    fist's world depth (sin of the world yaw); the rig paints the
 *    weapon (and the striking pair) behind the torso when the sweep
 *    crosses the away side. A cut through the north arc goes BEHIND
 *    the head, never across the face.
 * 5. COIL CLEARS THE CROWN — coils are authored outboard and high/low,
 *    never across the head cone; with law 4 a coil that drifts behind
 *    the body drops behind it honestly.
 * 6. THE BEAT IS SACRED — phase fractions are the schools' existing,
 *    server-aligned tables (impact frames land where damage lands).
 *    This engine changes every pixel of a swing and zero ticks of it.
 *
 * Channel skeleton per beat (unchanged grammar, test-pinned): ease into
 * the coil, HOLD cocked, SNAP through impact with overshoot, hold the
 * landed extension, recover to the combat guard. Every channel starts
 * and ends on the guard pose, so pose blends can never pop.
 *
 * THE MANY CUTS — each school's stages carry VARIANTS: same phase
 * clock, same damage, different arcs (a high cleave one swing, a level
 * cross-cut the next). The rig picks per-swing via its swing counter,
 * so a combo string reads as combinations, not a metronome. Stage
 * families keep the plane-alternation law: every stage-0 variant cuts
 * the forward/descending family, every stage-1 variant answers on the
 * rising/reverse family.
 *
 * Frame conventions: screen radians, +y down. Resolved fist offsets:
 * dx is PRE-SQUASH (the rig multiplies by wScale), dy is absolute from
 * armY, both in units of the rig scale s. Blade angle/fore are the
 * painter's final inputs — wake stations ride them exactly as the art
 * does.
 */
import { type Grip } from './carriage.js';
export type StrikeSchool = 'sword' | 'rogue' | 'great' | 'staff' | 'polearm';
/** The pole school's beat (moved here — the one strike clock source
 *  alongside the blade schools' strikePhases and GREAT_PHASES). */
export declare const STAFF_STRIKE_PHASES: {
    coil: number;
    hold: number;
    impact: number;
    ext: number;
};
/** THE REACHING SCHOOL's beat: a longer gather than the staff's turn
 *  (the point draws back before it flies), impact at the half, and a
 *  long held extension — the thrust hangs at full reach before the
 *  withdraw. Lives inside the polearm STRIKE_CLOCKS (340/520ms). */
export declare const POLEARM_STRIKE_PHASES: {
    coil: number;
    hold: number;
    impact: number;
    ext: number;
};
export interface StrikePhaseTable {
    coil: number;
    hold: number;
    impact: number;
    ext: number;
}
export declare function schoolPhases(school: StrikeSchool): StrikePhaseTable;
/** Base combat reach every radius multiplier scales (units of s —
 *  the rig's historic 0.25s hand orbit). */
export declare const STRIKE_R0 = 0.25;
export declare function variantCount(school: StrikeSchool, stage: 0 | 1): number;
export interface ResolvedStrike {
    /** Fist offset from (x, armY): dx pre-squash, units of s. */
    fistDX: number;
    fistDY: number;
    /** The painter's blade inputs. */
    bladeAngle: number;
    fore: number;
    /** World depth of the fist's yaw: sin(worldYaw). Negative = the
     *  away side — the rig's layer law (THE SWEEP EARNS ITS LAYER). */
    depthSin: number;
    /** Torso lean, mirror applied. */
    lean: number;
    /** Shaft fraction behind the fist, or null for painter default. */
    grip: number | null;
    /** Off-fist weld station along the blade dir (units of s, PRE-fore
     *  — the weld rides the same compression the art does), or null
     *  when the school frees the off hand. Negative = behind the fist
     *  (the great pommel), positive = ahead (the staff choke). */
    weldS: number | null;
    /** Counter-arm hint: the free arm's yaw offset from the aim. */
    counterYaw: number;
}
/**
 * Resolve one strike frame. `side` is the swing's mirror sign (+1 =
 * authored side), latched by the rig at the swing's first frame from
 * the eased rest side so a mid-swing turn can never flip the arc.
 * `dir` is the aim heading (world radians).
 */
export declare function resolveStrike(school: StrikeSchool, stage: 0 | 1, variant: number, t: number, side: 1 | -1, dir: number): ResolvedStrike;
export interface WakeSample {
    /** Same conventions as the resolved fist (dx pre-squash). */
    dx: number;
    dy: number;
    angle: number;
    fore: number;
    /** Beat time this sample was lifted from. */
    t: number;
}
export interface StrikeWake {
    samples: WakeSample[];
    /** 0..1 die-off through the held extension. */
    alpha: number;
    /** The hot core's own envelope: full through the snap, dead a
     *  breath after impact — the smear may linger, the glow may not. */
    core: number;
    /** Blade stations the ribbon spans (units of s, pre-fore): the
     *  leading tip and the mid-blade anchor. Signed — the butt cut's
     *  wake rides the ferrule end. */
    tipS: number;
    midS: number;
}
/**
 * THE WAKE — the blade's own smear, sampled from the same closed form
 * the fist rides. Alive from the loosing of the cut, chasing the
 * steel to the impact station, dying through the held extension.
 * The rig assembles the ribbon in screen space so it inherits wScale
 * exactly as the weapon does — law 3 by construction.
 */
export declare function strikeWake(school: StrikeSchool, stage: 0 | 1, variant: number, tNow: number, side: 1 | -1, dir: number, n?: number): StrikeWake | null;
export declare const ECHO_START = 0.34;
export declare function echoStage(mainStage: 0 | 1 | 2): 0 | 1;
export interface EchoFrame extends ResolvedStrike {
    /** The echo's own beat time (for its wake). */
    u: number;
}
export declare function resolveEcho(offGrip: Grip, mainStage: 0 | 1 | 2, t: number, variant: number, side: 1 | -1, dir: number): EchoFrame | null;
export declare function echoWake(offGrip: Grip, mainStage: 0 | 1 | 2, t: number, variant: number, side: 1 | -1, dir: number): StrikeWake | null;
export interface GhostFrame {
    t: number;
    alpha: number;
}
export declare function strikeGhosts(school: StrikeSchool, tNow: number): GhostFrame[];
//# sourceMappingURL=strikes.d.ts.map
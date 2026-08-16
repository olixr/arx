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

import { strikePhases, STRIKE_REST_ARM, type Grip } from './carriage.js';
import { WIELD_GROUND_K, GREAT_PHASES } from './wield.js';

export type StrikeSchool = 'sword' | 'rogue' | 'great' | 'staff' | 'polearm';

/** The pole school's beat (moved here — the one strike clock source
 *  alongside the blade schools' strikePhases and GREAT_PHASES). */
export const STAFF_STRIKE_PHASES = { coil: 0.24, hold: 0.3, impact: 0.42, ext: 0.58 };

/** THE REACHING SCHOOL's beat: a longer gather than the staff's turn
 *  (the point draws back before it flies), impact at the half, and a
 *  long held extension — the thrust hangs at full reach before the
 *  withdraw. Lives inside the polearm STRIKE_CLOCKS (340/520ms). */
export const POLEARM_STRIKE_PHASES = { coil: 0.26, hold: 0.34, impact: 0.5, ext: 0.7 };

export interface StrikePhaseTable {
  coil: number;
  hold: number;
  impact: number;
  ext: number;
}

export function schoolPhases(school: StrikeSchool): StrikePhaseTable {
  if (school === 'great') return GREAT_PHASES;
  if (school === 'staff') return STAFF_STRIKE_PHASES;
  if (school === 'polearm') return POLEARM_STRIKE_PHASES;
  return strikePhases(school === 'rogue' ? 'rogue' : 'normal');
}

/** Base combat reach every radius multiplier scales (units of s —
 *  the rig's historic 0.25s hand orbit). */
export const STRIKE_R0 = 0.25;

interface CutSpec {
  /** Authored for side = +1, radians of world yaw off the aim. */
  coilYaw: number;
  impactYaw: number;
  /** Radius track, multiplier of STRIKE_R0. */
  coilR: number;
  impactR: number;
  /** Fist height track, units of s off armY (negative = raised). */
  coilDy: number;
  impactDy: number;
  /** Wrist: cocked against the sweep at the coil, leading at impact. */
  cock: number;
  lead: number;
  /** Peak torso lean into the cut (resolver applies the mirror). */
  lean: number;
  /** Tangent-bar lead for the pole school: +1 crown leads, -1 butt.
   *  Absent = radial blade (arm-extension schools). */
  bar?: 1 | -1;
  /** Shaft fraction behind the fist through the cut (pole/great). */
  grip?: { coil: number; impact: number };
}

/**
 * The choreography book. Stage families keep the plane-alternation
 * law; variants within a family trade arc shape, never plane.
 */
const CUT_BOOK: Record<StrikeSchool, [CutSpec[], CutSpec[]]> = {
  sword: [
    [
      // THE HIGH CLEAVE: coiled high over the outboard shoulder, cut
      // crashing down-forward to a long low extension.
      {
        coilYaw: -1.9, impactYaw: 1.15,
        coilR: 0.95, impactR: 1.55,
        coilDy: -0.5, impactDy: 0.14,
        cock: 0.9, lead: 0.55, lean: 0.16,
      },
      // THE CROSS CUT: a level chest-height sweep dragged the whole
      // way across the front — the widest one-hand arc.
      {
        coilYaw: -2.1, impactYaw: 1.3,
        coilR: 0.9, impactR: 1.5,
        coilDy: -0.24, impactDy: -0.06,
        cock: 0.8, lead: 0.5, lean: 0.13,
      },
    ],
    [
      // THE RISING RETURN: low coil at the hip, backhand carving up.
      {
        coilYaw: 1.5, impactYaw: -1.3,
        coilR: 0.8, impactR: 1.45,
        coilDy: 0.16, impactDy: -0.34,
        cock: 0.85, lead: 0.5, lean: 0.14,
      },
      // THE HIGH BACKHAND: shoulder-height reverse cut finishing high
      // — the flourish return.
      {
        coilYaw: 1.8, impactYaw: -0.85,
        coilR: 0.85, impactR: 1.4,
        coilDy: -0.02, impactDy: -0.52,
        cock: 0.8, lead: 0.45, lean: 0.12,
      },
    ],
  ],
  rogue: [
    [
      // THE CROSS RAKE: reach far out at shoulder line, PULL in hard
      // across the body — the collapsing radius is the signature. The
      // pull lands beside the OPPOSITE hip (past the body, radius
      // still collapsed) so the reversed steel finishes clear of the
      // chest instead of lying across it.
      {
        coilYaw: -1.7, impactYaw: 1.35,
        coilR: 1.25, impactR: 0.85,
        coilDy: -0.22, impactDy: 0.1,
        cock: 0.5, lead: 0.35, lean: 0.12,
      },
      // THE EAR SLASH: a high-line rip — short cocked gather at the
      // ear, then a full-extension slash across the mark's jaw. The
      // tight windup buys the snap its contrast; the high landing
      // line keeps it a different cut from the rake's low pull.
      {
        coilYaw: -1.1, impactYaw: 1.2,
        coilR: 0.85, impactR: 0.9,
        coilDy: -0.25, impactDy: -0.18,
        cock: 0.45, lead: 0.32, lean: 0.1,
      },
    ],
    [
      // THE BACKSLASH: fling back out from the tucked hip, low line.
      {
        coilYaw: 1.2, impactYaw: -1.15,
        coilR: 0.55, impactR: 1.3,
        coilDy: 0.12, impactDy: -0.18,
        cock: 0.5, lead: 0.35, lean: 0.11,
      },
      // THE LOW RIP: gut-height fling, tighter and meaner.
      {
        coilYaw: 1.0, impactYaw: -1.35,
        coilR: 0.6, impactR: 1.25,
        coilDy: 0.22, impactDy: 0.02,
        cock: 0.45, lead: 0.32, lean: 0.1,
      },
    ],
  ],
  great: [
    [
      // THE FELLING STROKE: hauled far overhead, crashed down-forward
      // into the ground's opinion — the vertical showpiece.
      {
        coilYaw: -1.5, impactYaw: 0.9,
        coilR: 0.8, impactR: 1.6,
        coilDy: -0.72, impactDy: 0.3,
        cock: 1.1, lead: 0.35, lean: 0.22,
        grip: { coil: 0.2, impact: 0.3 },
      },
      // THE SHOULDER CLEAVE: the same weight on the long diagonal.
      {
        coilYaw: -1.9, impactYaw: 1.15,
        coilR: 0.9, impactR: 1.55,
        coilDy: -0.55, impactDy: 0.1,
        cock: 1.0, lead: 0.32, lean: 0.18,
        grip: { coil: 0.2, impact: 0.3 },
      },
    ],
    [
      // THE WIDE REAP: the level full harvest — the biggest arc in
      // the game, the ground ellipse made visible.
      {
        coilYaw: 2.2, impactYaw: -1.9,
        coilR: 0.9, impactR: 1.5,
        coilDy: 0.05, impactDy: -0.12,
        cock: 0.95, lead: 0.3, lean: 0.17,
        grip: { coil: 0.25, impact: 0.32 },
      },
      // THE RISING GUT: low-to-high reverse heave, tip climbing.
      {
        coilYaw: 1.4, impactYaw: -1.0,
        coilR: 0.75, impactR: 1.5,
        coilDy: 0.25, impactDy: -0.5,
        cock: 0.9, lead: 0.3, lean: 0.15,
        grip: { coil: 0.25, impact: 0.32 },
      },
    ],
  ],
  staff: [
    [
      // THE MOULINET: wide level two-hand sweep, crown leading, shaft
      // riding tangent to the arc — the turning bar.
      {
        coilYaw: -2.0, impactYaw: 1.7,
        coilR: 0.75, impactR: 1.15,
        coilDy: -0.12, impactDy: 0,
        cock: 0.5, lead: 0.4, lean: 0.13, bar: 1,
        grip: { coil: 0.42, impact: 0.5 },
      },
      // THE CROWN SNAP: short overhead chop — the height track does
      // the talking, crown whipping down past the mark.
      {
        coilYaw: -0.95, impactYaw: 0.7,
        coilR: 0.7, impactR: 1.15,
        coilDy: -0.6, impactDy: 0.15,
        cock: 0.55, lead: 0.42, lean: 0.12, bar: 1,
        grip: { coil: 0.42, impact: 0.5 },
      },
    ],
    [
      // THE BUTT CUT: reverse sweep on the low line, ferrule leading.
      {
        coilYaw: 1.8, impactYaw: -1.6,
        coilR: 0.7, impactR: 1.1,
        coilDy: 0.1, impactDy: -0.06,
        cock: 0.5, lead: 0.4, lean: 0.12, bar: -1,
        grip: { coil: 0.42, impact: 0.5 },
      },
      // THE HIGH BAR: the reverse pass climbing to shoulder height.
      {
        coilYaw: 1.5, impactYaw: -1.25,
        coilR: 0.75, impactR: 1.1,
        coilDy: 0.05, impactDy: -0.38,
        cock: 0.5, lead: 0.4, lean: 0.11, bar: -1,
        grip: { coil: 0.42, impact: 0.5 },
      },
    ],
  ],
  // THE REACHING SCHOOL: a thrust is the RADIUS TRACK doing the
  // talking — yaw nearly fixed (just enough lateral travel for the
  // wake to read as a streak), radius exploding coil→impact to the
  // longest extension in the book. RADIAL (no bar): the shaft
  // continues the arm, so the point leads outward by construction at
  // every facing. THE SLIDE LIVES IN THE GRIP NUMBERS: the shaft
  // fraction behind the fist collapses through the thrust — the drive
  // hand runs toward the butt to buy the reach, real spear technique
  // spoken in the engine's own vocabulary.
  polearm: [
    [
      // THE HIGH LINE: gathered at the ear, driven down-forward to a
      // long low landing — the sentry's first answer.
      {
        coilYaw: -0.6, impactYaw: 0.3,
        coilR: 0.5, impactR: 1.75,
        coilDy: -0.42, impactDy: 0.05,
        cock: 0.4, lead: 0.5, lean: 0.2,
        grip: { coil: 0.5, impact: 0.18 },
      },
      // THE MEASURED JAB: shorter gather, flatter line — the probing
      // beat that keeps a foe honest at the point.
      {
        coilYaw: -0.4, impactYaw: 0.2,
        coilR: 0.6, impactR: 1.6,
        coilDy: -0.2, impactDy: -0.05,
        cock: 0.35, lead: 0.45, lean: 0.15,
        grip: { coil: 0.45, impact: 0.22 },
      },
    ],
    [
      // THE RISING DRIVE: coiled at the hip, driven up the low line
      // to the chest — the underneath answer.
      {
        coilYaw: 0.55, impactYaw: -0.25,
        coilR: 0.5, impactR: 1.7,
        coilDy: 0.18, impactDy: -0.3,
        cock: 0.4, lead: 0.5, lean: 0.18,
        grip: { coil: 0.5, impact: 0.18 },
      },
      // THE UNDER SLIP: the flatter reverse — slipped past a guard at
      // the ribs, quick home and quick back.
      {
        coilYaw: 0.4, impactYaw: -0.2,
        coilR: 0.55, impactR: 1.65,
        coilDy: 0.1, impactDy: -0.15,
        cock: 0.35, lead: 0.45, lean: 0.15,
        grip: { coil: 0.45, impact: 0.2 },
      },
    ],
  ],
};

export function variantCount(school: StrikeSchool, stage: 0 | 1): number {
  return CUT_BOOK[school][stage].length;
}

/** Yaw overshoot past the impact station the extension settles from. */
const YAW_OVERSHOOT = 0.1;
/** The assassin snaps harder. */
const YAW_OVERSHOOT_ROGUE = 0.13;

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

/**
 * The ground projection shared by every resolved point: world yaw →
 * screen direction (px, py) with the depth axis compressed, plus the
 * soft-floored length cue for the painter (the strike floor keeps the
 * steel — a cue, never a stub).
 */
const FORE_SOFT = 0.35;
const FORE_FLOOR_STRIKE = 0.85;

function foreOf(len: number): number {
  return Math.max(FORE_FLOOR_STRIKE, 1 - (1 - Math.min(1.06, len)) * FORE_SOFT);
}

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
 * One point of the strike skeleton in channel space (yawRel, r, dy,
 * wrist, grip), interpolated per the shared beat grammar.
 */
interface ChannelPoint {
  yawRel: number;
  r: number;
  dy: number;
  wrist: number;
  gripF: number | null;
  leanK: number; // -0.6 coil … +1 impact … 0 ends
}

function channelsAt(spec: CutSpec, P: StrikePhaseTable, school: StrikeSchool, t: number): ChannelPoint {
  const sgn = Math.sign(spec.impactYaw - spec.coilYaw);
  const ov = sgn * (school === 'rogue' ? YAW_OVERSHOOT_ROGUE : YAW_OVERSHOOT);
  // Rest: the combat guard the rig holds between beats (yawRel here is
  // consumed unmirrored at the guard — see resolveStrike).
  const REST: ChannelPoint = { yawRel: STRIKE_REST_ARM, r: 1, dy: 0, wrist: 0, gripF: null, leanK: 0 };
  const g = spec.grip;
  if (t < P.coil) {
    const e = smooth(t / P.coil);
    return {
      yawRel: REST.yawRel + (spec.coilYaw - REST.yawRel) * e,
      r: 1 + (spec.coilR - 1) * e,
      dy: spec.coilDy * e,
      wrist: -sgn * spec.cock * e,
      gripF: g ? 0.34 + (g.coil - 0.34) * e : null,
      leanK: -0.6 * e,
    };
  }
  if (t < P.hold) {
    return {
      yawRel: spec.coilYaw,
      r: spec.coilR,
      dy: spec.coilDy,
      wrist: -sgn * spec.cock,
      gripF: g ? g.coil : null,
      leanK: -0.6,
    };
  }
  if (t < P.impact) {
    const e = smooth((t - P.hold) / (P.impact - P.hold));
    return {
      yawRel: spec.coilYaw + (spec.impactYaw + ov - spec.coilYaw) * e,
      r: spec.coilR + (spec.impactR - spec.coilR) * e,
      dy: spec.coilDy + (spec.impactDy - spec.coilDy) * e,
      wrist: -sgn * spec.cock + sgn * (spec.cock + spec.lead) * e,
      gripF: g ? g.coil + (g.impact - g.coil) * e : null,
      leanK: -0.6 + 1.6 * e,
    };
  }
  if (t < P.ext) {
    const e = smooth((t - P.impact) / (P.ext - P.impact));
    return {
      yawRel: spec.impactYaw + ov * (1 - e),
      r: spec.impactR,
      dy: spec.impactDy,
      wrist: sgn * spec.lead * (1 - 0.35 * e),
      gripF: g ? g.impact : null,
      leanK: 1 - 0.25 * e,
    };
  }
  const e = smooth((t - P.ext) / (1 - P.ext));
  return {
    yawRel: spec.impactYaw + (REST.yawRel - spec.impactYaw) * e,
    r: spec.impactR + (1 - spec.impactR) * e,
    dy: spec.impactDy * (1 - e),
    wrist: sgn * spec.lead * 0.65 * (1 - e),
    gripF: g ? g.impact + (0.34 - g.impact) * e : null,
    leanK: 0.75 * (1 - e),
  };
}

/**
 * Resolve one strike frame. `side` is the swing's mirror sign (+1 =
 * authored side), latched by the rig at the swing's first frame from
 * the eased rest side so a mid-swing turn can never flip the arc.
 * `dir` is the aim heading (world radians).
 */
export function resolveStrike(
  school: StrikeSchool,
  stage: 0 | 1,
  variant: number,
  t: number,
  side: 1 | -1,
  dir: number,
): ResolvedStrike {
  const specs = CUT_BOOK[school][stage];
  const spec = specs[((variant % specs.length) + specs.length) % specs.length]!;
  const P = schoolPhases(school);
  const c = channelsAt(spec, P, school, t);
  // THE MIRROR LAW: the whole yaw lane reflects across the aim axis
  // with the side — a hard reflection is safe because the rig LATCHES
  // the side at the swing's first frame (a swing never changes side
  // mid-beat, so there is no seam to ease). The reflected recover
  // lands on the reflected guard, and the guard-to-guard pose blend
  // between beats rides the renderer's own pose clock.
  const yawWorld = dir + (side === 1 ? c.yawRel : mirroredYaw(c.yawRel));
  const px = Math.cos(yawWorld);
  const py = Math.sin(yawWorld) * WIELD_GROUND_K;
  const rS = STRIKE_R0 * c.r;
  const fistDX = px * rS;
  const fistDY = py * rS + c.dy;
  // THE BLADE IS A 3D ROD. Radial schools: the steel CONTINUES THE
  // ARM in world space — ground radial plus the height track's
  // vertical — so a high coil tips the blade up over the shoulder and
  // a low extension runs it down-forward, at every heading, without a
  // single facing-special case. The wrist law rotates the ground
  // component only (a wrist cocks around the forearm axis). The pole
  // school rides TANGENT to the swept arc instead (the turning bar),
  // and the rogue lock is the radial reversed. Every screen angle and
  // every fore comes from projecting that one world vector.
  const sideK = side === 1 ? 1 : -1;
  const wristYaw = yawWorld + sideK * c.wrist;
  let bladeAngle: number;
  let fore: number;
  if (spec.bar) {
    // The bar's direction: the swept arc's own tangent, sampled from
    // the coil→impact lane (stable even in the frozen hold, where a
    // velocity tangent would degenerate), with a small wrist cock
    // rotating it past true tangent.
    const cYaw = spec.coilYaw;
    const iYaw = spec.impactYaw;
    const u = Math.max(0, Math.min(1, (c.yawRel - cYaw) / (iYaw - cYaw || 1e-9)));
    const eps = 0.02;
    const p0 = sweepPoint(spec, Math.max(0, u - eps), side, dir);
    const p1 = sweepPoint(spec, Math.min(1, u + eps), side, dir);
    const dsx = p1.sx - p0.sx;
    const dsy = p1.sy - p0.sy;
    const dw = Math.hypot(p1.wg[0] - p0.wg[0], p1.wg[1] - p0.wg[1], p1.wz - p0.wz) || 1e-9;
    const lead = spec.bar;
    bladeAngle = Math.atan2(dsy * lead, dsx * lead) + sideK * c.wrist * 0.35;
    fore = foreOf(Math.hypot(dsx, dsy) / dw);
  } else {
    const gx = Math.cos(wristYaw) * rS;
    const gyD = Math.sin(wristYaw) * rS * WIELD_GROUND_K;
    const gz = c.dy;
    const sxB = gx;
    const syB = gyD + gz;
    const worldLen = Math.hypot(rS, gz) || 1e-9;
    bladeAngle = Math.atan2(syB, sxB) + (school === 'rogue' ? Math.PI : 0);
    fore = foreOf(Math.hypot(sxB, syB) / worldLen);
  }
  return {
    fistDX,
    fistDY,
    bladeAngle,
    fore,
    depthSin: Math.sin(yawWorld),
    lean: spec.lean * c.leanK * side,
    grip: c.gripF,
    // The polearm weld sits BEHIND the main fist — the drive hand near
    // the butt. The rig gates it on the WAR GRIP only (a shielded off
    // fist never welds); resolveStrike itself is equipment-blind.
    weldS: school === 'staff' ? 0.18 : school === 'great' ? -0.13 : school === 'polearm' ? -0.2 : null,
    counterYaw: -(side === 1 ? c.yawRel : mirroredYaw(c.yawRel)) * 0.55,
  };
}

/** Reflect an authored yaw offset across the aim axis. */
function mirroredYaw(yawRel: number): number {
  return -yawRel;
}

/**
 * One point of the coil→impact sweep lane at normalized parameter u:
 * screen position plus the world-space components (ground pair,
 * vertical) the fore ratio needs. The bar tangent samples this.
 */
function sweepPoint(
  spec: CutSpec,
  u: number,
  side: 1 | -1,
  dir: number,
): { sx: number; sy: number; wg: [number, number]; wz: number } {
  const yawRel = spec.coilYaw + (spec.impactYaw - spec.coilYaw) * u;
  const r = STRIKE_R0 * (spec.coilR + (spec.impactR - spec.coilR) * u);
  const dy = spec.coilDy + (spec.impactDy - spec.coilDy) * u;
  const yawW = dir + (side === 1 ? yawRel : -yawRel);
  const wx = Math.cos(yawW) * r;
  const wy = Math.sin(yawW) * r;
  return { sx: wx, sy: wy * WIELD_GROUND_K + dy, wg: [wx, wy], wz: dy };
}

// --------------------------------------------------------- the wake

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

/** Wake stations per school (units of s along the drawn art). */
const WAKE_TIP: Record<StrikeSchool, number> = {
  sword: 0.62,
  rogue: 0.34,
  great: 0.95,
  staff: 0.55,
  // The point leads far out the longest art in the game; the near-
  // fixed yaw collapses the ribbon into the thrust's own line streak.
  polearm: 1.05,
};

/**
 * THE WAKE — the blade's own smear, sampled from the same closed form
 * the fist rides. Alive from the loosing of the cut, chasing the
 * steel to the impact station, dying through the held extension.
 * The rig assembles the ribbon in screen space so it inherits wScale
 * exactly as the weapon does — law 3 by construction.
 */
export function strikeWake(
  school: StrikeSchool,
  stage: 0 | 1,
  variant: number,
  tNow: number,
  side: 1 | -1,
  dir: number,
  n = 13,
): StrikeWake | null {
  const P = schoolPhases(school);
  if (tNow <= P.hold || tNow > P.ext) return null;
  const alpha = tNow <= P.impact ? 1 : 1 - smooth((tNow - P.impact) / (P.ext - P.impact));
  const core = tNow <= P.impact ? 1 : Math.max(0, 1 - (tNow - P.impact) / 0.07);
  const t0 = P.hold;
  // The ribbon spans the SNAP — the fast arc the eye couldn't follow.
  // Through the extension it fades where it was; stretching it on
  // into the slow settle turned the smear into draped paper bands
  // (the first capture's verdict).
  const t1 = Math.min(tNow, P.impact + (P.ext - P.impact) * 0.1);
  const samples: WakeSample[] = [];
  for (let k = 0; k < n; k++) {
    const t = t0 + ((t1 - t0) * k) / (n - 1);
    const r = resolveStrike(school, stage, variant, t, side, dir);
    samples.push({ dx: r.fistDX, dy: r.fistDY, angle: r.bladeAngle, fore: r.fore, t });
  }
  const specs = CUT_BOOK[school][stage];
  const spec = specs[((variant % specs.length) + specs.length) % specs.length]!;
  // The wake rides the LEADING end in the art's own frame: fist→tip is
  // +x for every class (the rogue's π reversal already lives inside
  // the blade angle), and only the butt cut's ferrule lead flips to
  // the −x half of the shaft.
  const lead = spec.bar ?? 1;
  const tip = WAKE_TIP[school] * (school === 'staff' ? lead : 1);
  return {
    samples,
    alpha,
    core,
    tipS: tip,
    midS: tip * 0.42,
  };
}

// --------------------------------------------------------- the echo
//
// THE ONE-TWO LAW (dual wield), re-based on the world engine: the off
// blade NEVER moves during the main blade's strike phase — it coils
// while the main blade cuts and cuts while the main recovers, always
// on the OPPOSITE plane, in the off fist's own grip. Same timing
// constants the law shipped with.

export const ECHO_START = 0.34;

export function echoStage(mainStage: 0 | 1 | 2): 0 | 1 {
  return mainStage === 1 ? 0 : 1;
}

export interface EchoFrame extends ResolvedStrike {
  /** The echo's own beat time (for its wake). */
  u: number;
}

export function resolveEcho(
  offGrip: Grip,
  mainStage: 0 | 1 | 2,
  t: number,
  variant: number,
  side: 1 | -1,
  dir: number,
): EchoFrame | null {
  if (t <= ECHO_START) return null;
  const u = Math.min(1, (t - ECHO_START) / (1 - ECHO_START));
  const school: StrikeSchool = offGrip === 'rogue' ? 'rogue' : 'sword';
  const r = resolveStrike(school, echoStage(mainStage), variant, u, side, dir);
  return { ...r, u };
}

export function echoWake(
  offGrip: Grip,
  mainStage: 0 | 1 | 2,
  t: number,
  variant: number,
  side: 1 | -1,
  dir: number,
): StrikeWake | null {
  if (t <= ECHO_START) return null;
  const u = Math.min(1, (t - ECHO_START) / (1 - ECHO_START));
  const school: StrikeSchool = offGrip === 'rogue' ? 'rogue' : 'sword';
  return strikeWake(school, echoStage(mainStage), variant, u, side, dir, 9);
}

// ---------------------------------------------------- the ghost law
//
// THE SPEED GHOSTS: through the snap the steel is faster than the eye
// — two after-images of the blade at earlier beat times, dying fast,
// sell the velocity at a glance (the multi-exposure smear every
// hand-keyed action frame uses). Pure schedule: the rig re-resolves
// and repaints the weapon at the ghost times with these alphas.

export interface GhostFrame {
  t: number;
  alpha: number;
}

export function strikeGhosts(school: StrikeSchool, tNow: number): GhostFrame[] {
  const P = schoolPhases(school);
  if (tNow <= P.hold + 0.02 || tNow > P.impact + 0.04) return [];
  const span = P.impact - P.hold;
  const out: GhostFrame[] = [];
  const g1 = tNow - span * 0.22;
  const g2 = tNow - span * 0.44;
  if (g1 > P.hold) out.push({ t: g1, alpha: 0.28 });
  if (g2 > P.hold) out.push({ t: g2, alpha: 0.13 });
  return out;
}

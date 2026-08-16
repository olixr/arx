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

import { WIELD_GROUND_K, projectCarry } from './wield.js';

/** The ten station verbs — one per StationType, THE VERB IS VISIBLE:
 *  the weaver, the tanner, the alchemist, the carver, the enchanter,
 *  and the sawyer each speak their own body language now, never the
 *  collapsed workbench pantomime. */
export type StationWorkKind =
  | 'anvil'
  | 'furnace'
  | 'fire'
  | 'workbench'
  | 'alembic'
  | 'tanning_rack'
  | 'loom'
  | 'carving_bench'
  | 'enchanting_table'
  | 'sawhorse';

/** The verbs the engine speaks today (later phases widen this). */
export type WorkKind = 'chop' | 'mine' | 'fish' | 'forage' | 'milk' | StationWorkKind;

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
  | { mode: 'choke'; d: number; drop: number }
  /** Planted steady at a fixed bearing offset — the tongs hand, the
   *  stem-steadying hand. `sway` adds a slow breathing drift. */
  | { mode: 'steady'; yawOff: number; r: number; dy: number; sway?: number }
  /** Both hands carry together: off rides a screen-perpendicular
   *  offset from the main fist (the crucible carry). */
  | { mode: 'team'; d: number; drop: number }
  /** Alternation: the off hand replays the MAIN dy track a half-beat
   *  later at its own bearing offset (the milking pull). */
  | { mode: 'alt'; yawOff: number; r: number };

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

function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function easeOf(kind: WorkStation['ease'], t: number): number {
  if (kind === 'hold') return 0;
  if (kind === 'in') return t * t;
  if (kind === 'out') return 1 - (1 - t) * (1 - t);
  return smooth(t);
}

/** Interpolated channel bundle at phase u (side unapplied). */
interface ChannelsAt {
  yaw: number;
  r: number;
  dy: number;
  pitch: number;
  toolYaw: number;
  lean: number;
  crouch: number;
  shiver: number;
}

function lerpA(a: number, b: number, e: number): number {
  // Angles in the channel lanes are authored continuous (no wraps),
  // so a plain lerp is exact — never re-derive through atan2, which
  // would fold an over-vertical pitch back through the short way.
  return a + (b - a) * e;
}

function channelsAt(spec: WorkSpec, u: number): ChannelsAt {
  const st = spec.stations;
  const n = st.length;
  // Find the arriving station: first station with at > u (cyclic).
  let i = 0;
  while (i < n && st[i]!.at <= u) i++;
  const to = st[i % n]!;
  const from = st[(i + n - 1) % n]!;
  const span = (to.at - from.at + 1) % 1 || 1;
  const t = ((u - from.at + 1) % 1) / span;
  const e = easeOf(to.ease, t);
  const pick = (f: (s: WorkStation) => number | undefined, dflt: number): number =>
    lerpA(f(from) ?? dflt, to.ease === 'hold' ? (f(from) ?? dflt) : (f(to) ?? dflt), e);
  return {
    yaw: pick((s) => s.yaw, 0),
    r: pick((s) => s.r, 0.2),
    dy: pick((s) => s.dy, 0),
    pitch: pick((s) => s.pitch, 0.6),
    toolYaw: pick((s) => s.toolYaw ?? s.yaw, 0),
    lean: pick((s) => s.lean, 0),
    crouch: pick((s) => s.crouch, 0),
    shiver: pick((s) => s.shiver, 0),
  };
}

/**
 * THE CHOREOGRAPHY BOOK. Authored side = +1: asymmetric swings pass
 * over the DOWN-SCREEN shoulder of a right-facer, exactly where the
 * old right-facer cycles lived, so the east-facing read every prior
 * verdict was passed on survives the projection unchanged.
 */
export const WORK_BOOK: Record<WorkKind, WorkSpec> = {
  /**
   * The chop: haul the axe up and back over the shoulder, slam it
   * down-forward into the trunk, hold the bite with a shiver of
   * effort while the blade sits buried in the wood, lever out and
   * recover. The tool pitch carries the arc: tip climbing up-back
   * past vertical at the windup, driving to down-forward at the bite.
   */
  chop: {
    cycleMs: 700,
    impactAt: 0.54,
    tipS: 0.52,
    mirror: true,
    off: { mode: 'choke', d: 0.16, drop: 0.03 },
    stations: [
      // Ready: a working carry just off the bearing.
      { at: 0, ease: 'smooth', yaw: 0.5, r: 0.2, dy: -0.04, pitch: 0.9, lean: 0 },
      // Windup: fist back past the shoulder, tip flung up-behind.
      { at: 0.42, ease: 'out', yaw: 2.1, r: 0.17, dy: -0.4, pitch: -2.35, lean: -0.08 },
      // The strike: everything comes down-forward at once.
      { at: 0.54, ease: 'in', yaw: 0, r: 0.35, dy: 0.1, pitch: 0.62, lean: 0.16 },
      // The bite: blade buried in the trunk, arms long, quivering.
      { at: 0.72, ease: 'hold', yaw: 0, r: 0.35, dy: 0.1, pitch: 0.62, lean: 0.16, shiver: 0.02 },
      // Recover: lever free, drift back toward the ready carry.
      { at: 0.9, ease: 'smooth', yaw: 0.42, r: 0.24, dy: -0.02, pitch: 0.85, lean: 0.04 },
    ],
  },
  /**
   * The mine: a pick is NOT an axe. Haul it straight overhead with
   * the whole back, HANG at the top of the heave gathering weight,
   * drive the spike down into the seam, quiver buried, then LEVER the
   * head back out — the pry is what says "rock".
   */
  mine: {
    cycleMs: 880,
    impactAt: 0.54,
    tipS: 0.52,
    mirror: true,
    off: { mode: 'choke', d: 0.2, drop: 0.03 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0.55, r: 0.22, dy: -0.02, pitch: 0.95, lean: 0 },
      // Windup: the pick climbs past the shoulder to straight overhead.
      { at: 0.32, ease: 'out', yaw: 2.5, r: 0.12, dy: -0.52, pitch: -2.9, lean: -0.11 },
      // The heave: hanging at the top, the whole body loaded.
      { at: 0.44, ease: 'hold', yaw: 2.5, r: 0.12, dy: -0.52, pitch: -2.9, lean: -0.11, shiver: 0.012 },
      // The drive: spike-first into the seam.
      { at: 0.54, ease: 'in', yaw: 0, r: 0.37, dy: 0.15, pitch: 0.55, lean: 0.28 },
      // Buried: point deep in the rock, shoulders hunched, quivering.
      { at: 0.7, ease: 'hold', yaw: 0, r: 0.37, dy: 0.15, pitch: 0.55, lean: 0.28, shiver: 0.022 },
      // The pry: lever the head back out — the haft rocks toward the
      // body while the tip stays low in the seam.
      { at: 0.86, ease: 'smooth', yaw: 0.3, r: 0.3, dy: 0.02, pitch: 1.25, lean: -0.02 },
    ],
  },
  /**
   * The fish: the PATIENT LINE. A quick two-beat cast — rod hauled
   * back over the shoulder, flung out over the water — then the long
   * settled hold, both hands low on the grip, the rod tip breathing
   * with the angler, and at the beat's end a short TUG as the line
   * answers. One cycle per gather beat (the 3s server floor). The
   * rod's own painter carries the cast line to the water tile the
   * bearing names (rig fishTo); the impact instant is the tug — the
   * splash and the ripple fire on it.
   */
  fish: {
    cycleMs: 3000,
    impactAt: 0.82,
    tipS: 0.62,
    mirror: true,
    off: { mode: 'choke', d: 0.13, drop: 0.045 },
    stations: [
      // The settled hold: low two-hand grip, tip up-forward. The
      // toolYaw rides OUTBOARD of the fist yaw (the lifeline law's
      // argument): at the camera-line facings a bearing-true rod
      // projects to a plumb line — the outboard bias keeps a readable
      // diagonal at S/N and reads as the angler's natural cross-body
      // hold everywhere else.
      { at: 0, ease: 'smooth', yaw: 0.28, r: 0.23, dy: 0.02, pitch: 1.16, toolYaw: 0.62, lean: 0.02 },
      // Back-cast: rod hauled up past the shoulder.
      { at: 0.07, ease: 'out', yaw: 1.7, r: 0.17, dy: -0.28, pitch: -2.45, lean: -0.06 },
      // The fling: out over the water, body following through.
      { at: 0.17, ease: 'in', yaw: 0.05, r: 0.31, dy: -0.05, pitch: 1.45, lean: 0.1 },
      // Settle back into the hold...
      { at: 0.32, ease: 'smooth', yaw: 0.26, r: 0.24, dy: 0.02, pitch: 1.18, toolYaw: 0.62, lean: 0.03 },
      // ...and WAIT, breathing (the patient line).
      { at: 0.78, ease: 'hold', yaw: 0.26, r: 0.24, dy: 0.02, pitch: 1.18, toolYaw: 0.62, lean: 0.03, shiver: 0.006 },
      // The tug: the tip hauls up short and sharp.
      { at: 0.86, ease: 'in', yaw: 0.34, r: 0.2, dy: -0.09, pitch: 0.92, toolYaw: 0.56, lean: -0.04 },
      // Ease the rod back down toward the hold.
      { at: 0.95, ease: 'smooth', yaw: 0.29, r: 0.23, dy: 0.01, pitch: 1.14, toolYaw: 0.62, lean: 0.01 },
    ],
  },
  /**
   * The forage: no tool — herbalist's hands. Bend toward the plant,
   * reach the working hand deep into the foliage, TUG with a shiver
   * of effort, snap the stem free with a little rock-back, then carry
   * the pluck home to the belt pouch and settle toward the next reach.
   */
  forage: {
    cycleMs: 1050,
    impactAt: 0.44,
    tipS: 0,
    mirror: true,
    off: { mode: 'steady', yawOff: -0.42, r: 0.23, dy: 0.11, sway: 0.012 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0, r: 0.14, dy: 0.08, lean: 0 },
      // Reach in and down, the body bending with it.
      { at: 0.3, ease: 'out', yaw: 0, r: 0.36, dy: 0.16, lean: 0.13 },
      // The tug: gripped in the plant.
      { at: 0.42, ease: 'hold', yaw: 0, r: 0.36, dy: 0.16, lean: 0.13, shiver: 0.014 },
      // Snap free — quick, rocking back with the release.
      { at: 0.5, ease: 'in', yaw: 0.12, r: 0.22, dy: 0.1, lean: -0.07 },
      // Carry the pluck to the pouch on the belt.
      { at: 0.78, ease: 'smooth', yaw: 1.15, r: 0.09, dy: 0.13, lean: -0.01 },
    ],
  },
  /**
   * The milking: dairy hands, settled LOW at the flank in a real
   * working crouch, both hands pulling down in alternation — a steady
   * squeeze-and-release the shoulders rock faintly against.
   */
  milk: {
    cycleMs: 640,
    impactAt: null,
    tipS: 0,
    mirror: false,
    off: { mode: 'alt', yawOff: -0.34, r: 0.27 },
    stations: [
      // The dy track IS the pull: down fast, ride back easy. The alt
      // off hand replays it a half-beat later.
      { at: 0, ease: 'smooth', yaw: 0, r: 0.3, dy: 0.06, lean: 0.13, crouch: 0.3 },
      { at: 0.4, ease: 'smooth', yaw: 0, r: 0.3, dy: 0.145, lean: 0.15, crouch: 0.3 },
      { at: 0.7, ease: 'smooth', yaw: 0, r: 0.3, dy: 0.075, lean: 0.13, crouch: 0.3 },
    ],
  },
  /**
   * The anvil: raise the hammer over the shoulder, ring it down off
   * the billet the tongs hold to the anvil face, let the head BOUNCE
   * on the rebound, reset. Now mirrored like every asymmetric swing —
   * a west-facing smith finally works honestly.
   */
  anvil: {
    cycleMs: 640,
    impactAt: 0.42,
    tipS: 0.27,
    mirror: true,
    off: { mode: 'steady', yawOff: -0.32, r: 0.31, dy: 0.04 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0.35, r: 0.24, dy: -0.06, pitch: 0.8, lean: 0 },
      // Raise: hammer up over the shoulder — a working lift, never the
      // woodsman's full haul.
      { at: 0.3, ease: 'out', yaw: 1.7, r: 0.16, dy: -0.38, pitch: -2.5, lean: -0.05 },
      // The blow: down onto the billet.
      { at: 0.42, ease: 'in', yaw: 0, r: 0.31, dy: 0.05, pitch: 0.55, lean: 0.11 },
      // The ring: a crisp rebound off the metal.
      { at: 0.5, ease: 'out', yaw: 0.12, r: 0.28, dy: -0.06, pitch: 0.95, lean: 0.07 },
      { at: 0.58, ease: 'in', yaw: 0.05, r: 0.29, dy: 0, pitch: 0.7, lean: 0.04 },
    ],
  },
  /**
   * The furnace: lean in and feed the mouth with both hands, hold the
   * charge against the heat, pull back. Symmetric two-hand work — no
   * mirror, no tool (the crucible is a conjured prop riding the fists).
   */
  furnace: {
    cycleMs: 1700,
    impactAt: 0.42,
    tipS: 0,
    mirror: false,
    off: { mode: 'team', d: 0.13, drop: 0.05 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0.1, r: 0.18, dy: 0.02, lean: 0 },
      { at: 0.38, ease: 'smooth', yaw: 0.1, r: 0.37, dy: 0.04, lean: 0.13 },
      // Held in the mouth, against the draft.
      { at: 0.6, ease: 'hold', yaw: 0.1, r: 0.37, dy: 0.04, lean: 0.13, shiver: 0.006 },
    ],
  },
  /**
   * The fire: tending the pot — a slow, patient stir. The wrist rides
   * a small flat circle over the vessel; the tool pitch stays shallow
   * (a ladle works nearly level).
   */
  fire: {
    cycleMs: 2600,
    impactAt: null,
    tipS: 0.3,
    mirror: false,
    off: { mode: 'steady', yawOff: -0.5, r: 0.2, dy: 0.09, sway: 0.01 },
    stations: [
      // The ladle works nearly level (shallow pitch), riding a slow
      // flat circle over the vessel's mouth.
      { at: 0, ease: 'smooth', yaw: 0.34, r: 0.24, dy: 0.06, pitch: 1.05, lean: 0.03 },
      { at: 0.25, ease: 'smooth', yaw: 0, r: 0.29, dy: 0.08, pitch: 0.92, lean: 0.05 },
      { at: 0.5, ease: 'smooth', yaw: -0.34, r: 0.24, dy: 0.06, pitch: 1.0, lean: 0.03 },
      { at: 0.75, ease: 'smooth', yaw: 0, r: 0.2, dy: 0.045, pitch: 1.12, lean: 0.02 },
    ],
  },
  /**
   * The bench: the joiner's tap-tap — a light mallet lifts a hand's
   * width and knocks the piece home, twice per beat at two spots
   * along the work, while the off hand holds the piece steady.
   */
  workbench: {
    cycleMs: 900,
    impactAt: 0.24,
    tipS: 0.2,
    mirror: true,
    off: { mode: 'steady', yawOff: -0.38, r: 0.26, dy: 0.05, sway: 0.008 },
    stations: [
      // First lift, over the near spot...
      { at: 0, ease: 'smooth', yaw: 0.24, r: 0.26, dy: -0.1, pitch: -0.35, lean: 0.02 },
      // ...tap down.
      { at: 0.24, ease: 'in', yaw: 0.2, r: 0.29, dy: 0.05, pitch: 0.7, lean: 0.04 },
      // Second lift, walked along the piece...
      { at: 0.52, ease: 'smooth', yaw: -0.02, r: 0.25, dy: -0.08, pitch: -0.25, lean: 0.0 },
      // ...second tap.
      { at: 0.72, ease: 'in', yaw: -0.06, r: 0.28, dy: 0.045, pitch: 0.65, lean: 0.02 },
    ],
  },
  /**
   * The alembic: the alchemist's pour-and-swirl — the vial lifts and
   * TIPS over the vessel's mouth (the pitch rolls past level, the
   * pour), rights itself, then rides a small contemplative swirl
   * while the off hand steadies the glass below.
   */
  alembic: {
    cycleMs: 2400,
    impactAt: null,
    tipS: 0.16,
    mirror: true,
    off: { mode: 'steady', yawOff: -0.4, r: 0.24, dy: 0.08, sway: 0.008 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0.2, r: 0.22, dy: 0.02, pitch: -0.2, lean: 0.01 },
      // Lift the vial high over the mouth...
      { at: 0.2, ease: 'smooth', yaw: 0.05, r: 0.26, dy: -0.2, pitch: -0.35, lean: 0.03 },
      // ...and POUR: the glass rolls past level, held.
      { at: 0.34, ease: 'smooth', yaw: 0.02, r: 0.28, dy: -0.16, pitch: 0.85, lean: 0.05 },
      { at: 0.5, ease: 'hold', yaw: 0.02, r: 0.28, dy: -0.16, pitch: 0.85, lean: 0.05, shiver: 0.004 },
      // Right the glass, come down to the swirl...
      { at: 0.66, ease: 'smooth', yaw: 0.18, r: 0.23, dy: 0.0, pitch: -0.25, lean: 0.02 },
      { at: 0.84, ease: 'smooth', yaw: 0.3, r: 0.2, dy: 0.035, pitch: -0.15, lean: 0.0 },
    ],
  },
  /**
   * The tanning rack: the two-hand SCRAPE — both fists on the beam,
   * long strokes drawn down the hide: reach high, drive down-forward
   * with the shoulders in it, ease back up. Honest leather work.
   */
  tanning_rack: {
    cycleMs: 1150,
    impactAt: null,
    tipS: 0.3,
    mirror: true,
    off: { mode: 'team', d: 0.15, drop: 0.02 },
    stations: [
      // High on the hide, blade across the work (toolYaw near
      // perpendicular — the scraper bar lies ACROSS the stroke).
      { at: 0, ease: 'smooth', yaw: 0.08, r: 0.26, dy: -0.22, pitch: 1.35, toolYaw: 1.25, lean: -0.02 },
      // The stroke: down the hide, weight behind it.
      { at: 0.4, ease: 'in', yaw: 0.04, r: 0.32, dy: 0.1, pitch: 1.3, toolYaw: 1.3, lean: 0.12 },
      // Feather off the bottom edge...
      { at: 0.56, ease: 'smooth', yaw: 0.1, r: 0.28, dy: 0.13, pitch: 1.28, toolYaw: 1.28, lean: 0.06 },
      // ...and ride back up light.
      { at: 0.82, ease: 'smooth', yaw: 0.1, r: 0.24, dy: -0.14, pitch: 1.32, toolYaw: 1.26, lean: -0.01 },
    ],
  },
  /**
   * The loom: the weaver's two beats — the SHUTTLE PASS gliding
   * level across the warp (the whole travel is a yaw sweep, side to
   * side), then the BATTEN PULL hauled back toward the chest to seat
   * the weft. The off hand rides the frame.
   */
  loom: {
    cycleMs: 2000,
    impactAt: null,
    tipS: 0.12,
    mirror: false,
    off: { mode: 'steady', yawOff: -0.55, r: 0.26, dy: -0.06, sway: 0.006 },
    stations: [
      // Shuttle at the near selvedge...
      { at: 0, ease: 'smooth', yaw: 0.55, r: 0.27, dy: -0.05, pitch: 1.5, toolYaw: 1.5, lean: 0.02 },
      // ...glides across the warp...
      { at: 0.3, ease: 'smooth', yaw: -0.55, r: 0.27, dy: -0.05, pitch: 1.5, toolYaw: -1.5, lean: -0.02 },
      // ...hand rises to the batten...
      { at: 0.48, ease: 'smooth', yaw: -0.2, r: 0.3, dy: -0.18, pitch: 1.4, toolYaw: -0.4, lean: 0.0 },
      // ...and PULLS it home to the chest, seating the weft.
      { at: 0.62, ease: 'in', yaw: 0.1, r: 0.16, dy: -0.02, pitch: 1.45, toolYaw: 0.6, lean: -0.05 },
      // Back out to the selvedge for the next pass.
      { at: 0.82, ease: 'smooth', yaw: 0.45, r: 0.25, dy: -0.05, pitch: 1.5, toolYaw: 1.3, lean: 0.01 },
    ],
  },
  /**
   * The carving bench: knife work — short controlled strokes pushed
   * AWAY down the grain (every whittler's law: never toward the
   * body), the off hand clamped on the piece. Quick, busy, precise.
   */
  carving_bench: {
    cycleMs: 820,
    impactAt: null,
    tipS: 0.14,
    mirror: true,
    off: { mode: 'steady', yawOff: -0.34, r: 0.28, dy: 0.05, sway: 0.005 },
    stations: [
      // Set the edge close to the grip hand...
      { at: 0, ease: 'smooth', yaw: 0.22, r: 0.18, dy: 0.0, pitch: 1.1, lean: 0.02 },
      // ...push the stroke away down the grain...
      { at: 0.34, ease: 'in', yaw: 0.02, r: 0.33, dy: 0.05, pitch: 1.25, lean: 0.05 },
      // ...lift off the work...
      { at: 0.5, ease: 'smooth', yaw: 0.06, r: 0.3, dy: -0.04, pitch: 0.9, lean: 0.02 },
      // ...and return to set the next cut.
      { at: 0.78, ease: 'smooth', yaw: 0.2, r: 0.2, dy: -0.01, pitch: 1.05, lean: 0.01 },
    ],
  },
  /**
   * The enchanting table: THE RUNE TRACE — the working hand rides a
   * slow figure over the table, drawing the sigil in the air (the
   * conjured glow is the prop), while the off hand rests open on the
   * wood. Deliberate, unhurried, nothing struck.
   */
  enchanting_table: {
    cycleMs: 3400,
    impactAt: null,
    tipS: 0,
    mirror: false,
    off: { mode: 'steady', yawOff: -0.45, r: 0.25, dy: 0.06, sway: 0.006 },
    stations: [
      { at: 0, ease: 'smooth', yaw: 0.4, r: 0.24, dy: -0.1, lean: 0.01 },
      { at: 0.18, ease: 'smooth', yaw: 0.0, r: 0.3, dy: -0.22, lean: 0.02 },
      { at: 0.36, ease: 'smooth', yaw: -0.4, r: 0.24, dy: -0.08, lean: 0.0 },
      { at: 0.54, ease: 'smooth', yaw: -0.05, r: 0.2, dy: -0.16, lean: 0.01 },
      { at: 0.72, ease: 'smooth', yaw: 0.3, r: 0.27, dy: -0.2, lean: 0.02 },
      { at: 0.88, ease: 'smooth', yaw: 0.42, r: 0.22, dy: -0.13, lean: 0.01 },
    ],
  },
  /**
   * The sawhorse: THE SAW — both hands on the grip, the blade level
   * down the bearing, and the whole body in the push-pull: drive
   * forward through the cut (fast, weight into it), draw back easy.
   * The stroke IS the reach channel.
   */
  sawhorse: {
    cycleMs: 950,
    impactAt: 0.38,
    tipS: 0.44,
    mirror: true,
    off: { mode: 'choke', d: 0.1, drop: 0.03 },
    stations: [
      // Drawn back, saw seated in the kerf...
      { at: 0, ease: 'smooth', yaw: 0.3, r: 0.16, dy: 0.04, pitch: 1.42, lean: -0.04 },
      // ...the PUSH: drive the blade through the cut.
      { at: 0.38, ease: 'in', yaw: 0.06, r: 0.38, dy: 0.08, pitch: 1.5, lean: 0.12 },
      // A breath at full extension...
      { at: 0.5, ease: 'smooth', yaw: 0.05, r: 0.37, dy: 0.075, pitch: 1.5, lean: 0.09 },
      // ...and the easy draw back.
      { at: 0.88, ease: 'smooth', yaw: 0.27, r: 0.18, dy: 0.045, pitch: 1.44, lean: -0.03 },
    ],
  },
};

/**
 * THE WORK MIRROR: the side predicate — cos(bearing) > 0. The SAME
 * test as the BIT-LEADS art flip in drawHeldItem (rig.ts): keep the
 * two identical or the honed edge stops leading the sweep.
 */
export function workSideOf(bearing: number): 1 | -1 {
  return Math.cos(bearing) > 0 ? 1 : -1;
}

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

export const WORK_VOICE_NEUTRAL: WorkVoice = {
  raiseK: 1,
  reachK: 1,
  clearYaw: 0,
  dropS: 0,
  leanK: 1,
};

/**
 * Resolve one work frame. `u` is cycle phase [0,1) — callers derive it
 * from the ONE clock (`workCycleU`). `bearing` is the square-up
 * heading toward the worked tile (world radians).
 */
export function resolveWork(
  kind: WorkKind,
  u: number,
  bearing: number,
  nowMs: number,
  voice: WorkVoice = WORK_VOICE_NEUTRAL,
): ResolvedWork {
  const spec = WORK_BOOK[kind];
  const c = channelsAt(spec, u);
  // The voice bends the resolved channels, never the book: raises cap
  // (and push outboard by how raised the station is), the whole cycle
  // drops toward the dialect's hand ring, reach and lean rescale.
  if (voice !== WORK_VOICE_NEUTRAL) {
    const raisedK = Math.min(1, Math.max(0, -c.dy / 0.35));
    if (c.dy < 0) c.dy *= voice.raiseK;
    c.dy += voice.dropS;
    c.r *= voice.reachK;
    c.yaw += voice.clearYaw * raisedK;
    c.toolYaw += voice.clearYaw * raisedK;
    c.lean *= voice.leanK;
  }
  const side = spec.mirror ? workSideOf(bearing) : 1;
  // Effort tremor: high-frequency, amplitude authored per station and
  // interpolated, so it fades in at the bite and out through recovery.
  const trem = c.shiver > 0 ? Math.sin(nowMs * 0.15) * c.shiver : 0;
  const yawW = bearing + side * (c.yaw + trem);
  const fistDX = Math.cos(yawW) * c.r;
  const fistDY = Math.sin(yawW) * WIELD_GROUND_K * c.r + c.dy + trem * 0.4;
  // THE TOOL IS A 3D ROD: yaw mirrored with the arc, pitch never
  // (gravity has one sign). projectCarry gives the honest screen
  // angle and the softened length at every heading.
  const toolYawW = bearing + side * c.toolYaw;
  const proj = projectCarry(toolYawW, c.pitch + trem * 1.4);
  // The business end, projected through the same law: ground
  // component sin(pitch) along the tool yaw, vertical cos(pitch).
  const th = Math.sin(c.pitch);
  const tv = Math.cos(c.pitch);
  const tipDX = fistDX + Math.cos(toolYawW) * th * spec.tipS;
  const tipDY = fistDY + (Math.sin(toolYawW) * th * WIELD_GROUND_K + tv) * spec.tipS;
  // The tip's world-plane station (no K): fist ground radius plus the
  // haft's ground extent — the FX anchor.
  const tipGX = Math.cos(yawW) * c.r + Math.cos(toolYawW) * th * spec.tipS;
  const tipGY = Math.sin(yawW) * c.r + Math.sin(toolYawW) * th * spec.tipS;
  // The off hand.
  let offDX: number;
  let offDY: number;
  const off = spec.off;
  if (off.mode === 'choke') {
    // Both hands on the haft: choked behind the main fist along the
    // TOOL's screen direction (the projected haft, not the arm ray).
    offDX = fistDX - Math.cos(proj.angle) * off.d * proj.fore;
    offDY = fistDY - Math.sin(proj.angle) * off.d * proj.fore + off.drop;
  } else if (off.mode === 'steady') {
    const oy = bearing + side * off.yawOff;
    const sway = off.sway ? Math.sin(nowMs * 0.0021) * off.sway : 0;
    offDX = Math.cos(oy) * off.r;
    offDY = Math.sin(oy) * WIELD_GROUND_K * off.r + off.dy + sway;
  } else if (off.mode === 'team') {
    // Carrying together: the off hand rides beside the main across
    // the bearing — a screen-perpendicular of the PROJECTED heading.
    const px = Math.cos(yawW);
    const py = Math.sin(yawW) * WIELD_GROUND_K;
    const pl = Math.hypot(px, py) || 1;
    offDX = fistDX - (py / pl) * off.d;
    offDY = fistDY + (px / pl) * off.d * 0.5 + off.drop;
  } else {
    // Alternation: replay the main dy track a half-beat later.
    const c2 = channelsAt(spec, (u + 0.5) % 1);
    const oy = bearing + side * off.yawOff;
    offDX = Math.cos(oy) * off.r;
    offDY = Math.sin(oy) * WIELD_GROUND_K * off.r + c2.dy;
  }
  // The lean projects by the bearing's screen-x: side-on it tips the
  // torso into the work at full strength; on the camera lines there
  // is no screen-forward to tip along, so it relaxes instead of
  // picking an arbitrary side (the old workSide collapse).
  const fx = Math.cos(bearing);
  return {
    fistDX,
    fistDY,
    offDX,
    offDY,
    toolAngle: proj.angle,
    toolFore: proj.fore,
    tipDX,
    tipDY,
    tipGX,
    tipGY,
    depthSin: Math.sin(yawW),
    lean: c.lean * fx,
    crouch: c.crouch,
  };
}

/** Phase of the ONE work clock for an entity. `phaseMs` is the
 *  caller's per-body offset (the renderer's lifeMs de-sync — a work
 *  crew never swings in lockstep). */
export function workCycleU(kind: WorkKind, nowMs: number, phaseMs = 0): number {
  const ms = WORK_BOOK[kind].cycleMs;
  return (((nowMs + phaseMs) % ms) + ms) % ms / ms;
}

/** Integer beat counter — the impact gate's once-per-cycle latch. */
export function workCycleN(kind: WorkKind, nowMs: number, phaseMs = 0): number {
  return Math.floor((nowMs + phaseMs) / WORK_BOOK[kind].cycleMs);
}

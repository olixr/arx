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
import {
  drawOwlHead,
  shade,
  type BeastSpec,
  type OwlLook,
} from './rig.js';
import { facetBlob, facetCircle } from './shapes.js';

// ---------------------------------------------------------------- beat

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
export function wingBeat(u: number): WingBeat {
  const TAU = Math.PI * 2;
  const f = (p: number): number => Math.cos(TAU * p) + 0.26 * Math.sin(2 * TAU * p);
  const fp = (p: number): number =>
    -TAU * Math.sin(TAU * p) + 0.52 * TAU * Math.cos(2 * TAU * p);
  const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const NORM = 1.11;
  const VN = TAU * 1.3;
  const vel = -fp(u) / VN; // + = the wing sweeping DOWN
  const velLag = -fp(u - 0.055) / VN;
  return {
    arm: f(u) / NORM,
    hand: f(u - 0.07) / NORM,
    power: sm((vel - 0.15) / 0.85),
    recover: sm((-vel - 0.15) / 0.85),
    gust: sm((velLag - 0.5) / 0.5),
  };
}

// ----------------------------------------------------------- wing sim

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
export class WingSim {
  /** Per-station trailing lag (radians behind the bone's carriage). */
  readonly lag: number[];
  /** Per-station angular velocity (rad/s). */
  readonly vel: number[];
  /** True while any station still genuinely moves. */
  restless = false;
  private armPrev = 0;
  private armVelPrev = 0;
  private live = false;
  /** STRENGTH LAW: the vane bends, never folds. */
  private readonly cap: number;
  private readonly w2: number;
  private readonly damp: number;
  private readonly couple: number;

  /**
   * `stations` is the segment count of the vane; `tone` is muscle —
   * 1 = feather (stiff, near-critical, comes home in one swing),
   * ~0.55 = membrane (loose, billows, a beat late at the scallops).
   */
  constructor(
    readonly stations: number,
    readonly tone: number,
  ) {
    this.lag = new Array<number>(stations).fill(0);
    this.vel = new Array<number>(stations).fill(0);
    const omega = 11 + 8 * tone; // rad/s natural frequency
    this.w2 = omega * omega;
    this.damp = 2 * (0.3 + 0.32 * tone) * omega;
    this.couple = this.w2 * 0.85;
    this.cap = 0.62 + 0.32 * (1 - tone);
  }

  /** First sight, teleport, corpse: the vane lies at rest instantly. */
  snap(arm = 0): void {
    this.lag.fill(0);
    this.vel.fill(0);
    this.armPrev = arm;
    this.armVelPrev = 0;
    this.live = true;
    this.restless = false;
  }

  /**
   * Advance one frame. `arm` is the leading edge's carriage angle
   * (radians) — the rig's raise channel, attack shaping included, so
   * a mantle snap drags the vane exactly like a beat does.
   */
  update(arm: number, dt: number): void {
    if (!this.live) this.snap(arm);
    const step = Math.min(0.05, Math.max(1e-4, dt));
    // Bone kinematics from the caller's channel — velocity and the
    // acceleration that actually drives the vane.
    const armVel = (arm - this.armPrev) / step;
    const armAcc = (armVel - this.armVelPrev) / step;
    this.armPrev = arm;
    this.armVelPrev = armVel;
    // Two substeps keep the stiff feather springs crisp at 30Hz tabs.
    const n = this.stations;
    const h = step / 2;
    // The drive saturates: a teleport-grade snap shoves the vane to
    // its cap, never launches the integrator.
    const drive = Math.max(-260, Math.min(260, armAcc));
    for (let sub = 0; sub < 2; sub++) {
      for (let k = 0; k < n; k++) {
        const u = n === 1 ? 1 : k / (n - 1);
        // Outboard vane carries more inertia — the wave grows tipward.
        const inertia = 0.0016 * (0.35 + 0.85 * u);
        const inboard = k === 0 ? 0 : this.lag[k - 1]!;
        const acc =
          -this.w2 * this.lag[k]! +
          this.couple * (inboard - this.lag[k]!) * (k === 0 ? 0.4 : 1) -
          this.damp * this.vel[k]! -
          drive * inertia * (1 + 1.6 * u);
        this.vel[k] = this.vel[k]! + acc * h;
        let nx = this.lag[k]! + this.vel[k]! * h;
        // STRENGTH LAW: bend, never fold — and kill the velocity at
        // the stop so the cap never stores energy.
        if (nx > this.cap) {
          nx = this.cap;
          if (this.vel[k]! > 0) this.vel[k] = 0;
        } else if (nx < -this.cap) {
          nx = -this.cap;
          if (this.vel[k]! < 0) this.vel[k] = 0;
        }
        this.lag[k] = nx;
      }
    }
    let hot = 0;
    for (let k = 0; k < n; k++) hot = Math.max(hot, Math.abs(this.vel[k]!));
    this.restless = hot > 0.05;
  }
}

// ---------------------------------------------------------- rig specs

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
export const OWL_FLIER: FlierSpec = {
  hover: 0.98,
  beatHz: 1.3,
  hoverBeatK: 0.72,
  glides: true,
  stations: 5,
  tone: 1,
  uprightA: 0.92,
  tail: 0.36,
  stern: 0.44,
};

/** The elder: more mass on the wing — slower still, higher seat. */
export const ELDER_OWL_FLIER: FlierSpec = {
  hover: 1.18,
  beatHz: 1.04,
  hoverBeatK: 0.72,
  glides: true,
  stations: 5,
  tone: 1,
  uprightA: 0.88,
  tail: 0.5,
  stern: 0.6,
};

/** The cave bat: quick loose membrane flutter, never a glide. */
export const BAT_FLIER: FlierSpec = {
  hover: 0.85,
  beatHz: 3.3,
  hoverBeatK: 0.82,
  glides: false,
  stations: 4,
  tone: 0.55,
  uprightA: 0.72,
  tail: 0,
  stern: 0,
};

/** The rig ledger by def id — the renderer's one lookup. */
export function flierSpec(defId: string): FlierSpec {
  if (defId === 'elder_great_owl') return ELDER_OWL_FLIER;
  if (defId === 'cave_bat') return BAT_FLIER;
  return OWL_FLIER;
}

// -------------------------------------------------------------- frame

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
  tail: ReadonlyArray<{ dx: number; dy: number; z: number }>;
  /** True while any sim still moves — the renderer's re-bake cue. */
  restless: boolean;
}

// ---------------------------------------------------------------- rig

const TAU = Math.PI * 2;

/** exp-decay blend rate helper: frame-rate independent easing. */
const ease = (cur: number, target: number, dt: number, rate: number): number =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

const smooth = (x: number, lo: number, hi: number): number => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/**
 * THE FLIGHT RIG — one per flying body, living on the renderer's anim
 * map. The renderer owns only the lifecycle (create on first sight,
 * evict on def change); the rig owns every motion channel and ticks
 * its own wing sims, because it computes the exact bone carriage they
 * hang from (the owner-ticks law).
 */
/** One verlet node of the simulated tail chain (world tiles). */
interface TailNode {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
}

/** Tail chain segment count — short, feathered, floppy. */
const TAIL_SEGS = 4;

export class FlightRig {
  private readonly portWing: WingSim;
  private readonly starWing: WingSim;
  /** Wingbeat phase in CYCLES — accumulated, never derived from the
   *  clock, so tempo changes can't jump the stroke. */
  private phase: number;
  /** Rig-local seconds — accumulated for the seeded life waves. */
  private t: number;
  private moveS = 0;
  private pitchA: number;
  private bank = 0;
  private glide = 0;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private lastDir = 0;
  private readonly seedF: number;
  /** The simulated tail chain (world space); empty when spec.tail=0. */
  private readonly tailNodes: TailNode[] = [];
  /** Scratch: world-relative tail offsets handed out each frame. */
  private readonly tailOut: Array<{ dx: number; dy: number; z: number }> = [];

  constructor(
    readonly spec: FlierSpec,
    seed: number,
  ) {
    this.portWing = new WingSim(spec.stations, spec.tone);
    this.starWing = new WingSim(spec.stations, spec.tone);
    // Seeded determinism: phase scatter so a knot never beats in sync.
    this.seedF = ((seed >>> 0) % 97) * 0.613;
    this.phase = this.seedF;
    this.t = this.seedF * 1.7;
    this.pitchA = spec.uprightA; // first sight of a still body = hover
  }

  /** Lay the tail chain at rest behind the facing — first sight and
   *  teleports never whip an appendage across the map. */
  private snapTail(x: number, y: number, z: number, fx: number, fy: number): void {
    const seg = this.spec.tail / TAIL_SEGS;
    this.tailNodes.length = 0;
    for (let i = 0; i <= TAIL_SEGS; i++) {
      const nx = x - fx * seg * i;
      const ny = y - fy * seg * i;
      const nz = z - 0.06 * i * seg * TAIL_SEGS;
      this.tailNodes.push({ x: nx, y: ny, z: nz, px: nx, py: ny, pz: nz });
    }
  }

  /**
   * Advance the tail one frame: a world-space verlet chain rooted at
   * the vent, with feather TONE — every node springs toward the rest
   * carriage (streamed behind the facing, drooping toward the tip) so
   * the fan drags through turns, streams at speed, flops past a hard
   * stop, and always comes home. The dive whips it up and behind by
   * pure physics — nothing here is posed.
   */
  private tickTail(
    rx: number,
    ry: number,
    rz: number,
    fx: number,
    fy: number,
    dt: number,
    droopA: number,
  ): void {
    const seg = this.spec.tail / TAIL_SEGS;
    if (
      this.tailNodes.length !== TAIL_SEGS + 1 ||
      Math.hypot(rx - this.tailNodes[0]!.x, ry - this.tailNodes[0]!.y) > 2
    ) {
      this.snapTail(rx, ry, rz, fx, fy);
      return;
    }
    const root = this.tailNodes[0]!;
    root.x = rx;
    root.y = ry;
    root.z = rz;
    const damp = Math.pow(0.0025, dt); // heavy air damping on feathers
    for (let i = 1; i <= TAIL_SEGS; i++) {
      const n = this.tailNodes[i]!;
      const u = i / TAIL_SEGS;
      // Rest carriage PITCHES WITH THE BODY: streamed straight behind
      // at cruise, hanging down-behind through the hover (a treading
      // bird braces its fan under itself — and a decisive rest keeps
      // the hanging chain from wandering forward under the belly,
      // where the fan read as a pair of feet on the sheet).
      const cd = Math.cos(droopA);
      const sd = Math.sin(droopA);
      const restX = rx - fx * seg * i * cd;
      const restY = ry - fy * seg * i * cd;
      const restZ = rz - seg * i * sd - 0.04 * u * this.spec.tail;
      const tone = 26 * (1 - 0.45 * u); // stiff at the dock, free at the fan
      const vx = (n.x - n.px) * damp + (restX - n.x) * tone * dt * dt;
      const vy = (n.y - n.py) * damp + (restY - n.y) * tone * dt * dt;
      const vz = (n.z - n.pz) * damp + (restZ - n.z) * tone * dt * dt - 0.35 * dt * dt;
      n.px = n.x;
      n.py = n.y;
      n.pz = n.z;
      n.x += vx;
      n.y += vy;
      n.z += vz;
    }
    // Distance constraints keep the chain a chain (two passes).
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i <= TAIL_SEGS; i++) {
        const a = this.tailNodes[i - 1]!;
        const b = this.tailNodes[i]!;
        const ddx = b.x - a.x;
        const ddy = b.y - a.y;
        const ddz = b.z - a.z;
        const d = Math.hypot(ddx, ddy, ddz) || 1e-6;
        const k = (d - seg) / d;
        if (i === 1) {
          b.x -= ddx * k;
          b.y -= ddy * k;
          b.z -= ddz * k;
        } else {
          b.x -= ddx * k * 0.5;
          b.y -= ddy * k * 0.5;
          b.z -= ddz * k * 0.5;
          a.x += ddx * k * 0.5;
          a.y += ddy * k * 0.5;
          a.z += ddz * k * 0.5;
        }
      }
    }
  }

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
  }): FlightFrame {
    const spec = this.spec;
    const dt = Math.min(0.05, Math.max(1e-4, o.dt));
    const at = o.attackT ?? 0;
    const air = o.air ?? 1;
    this.t += dt;

    // Teleport / first sight: place every channel at rest — the bird
    // arrives already flying its state, never whipping to catch up.
    const jumped =
      !Number.isFinite(this.lastX) || Math.hypot(o.x - this.lastX, o.y - this.lastY) > 2;
    if (jumped) {
      this.moveS = o.moveK;
      this.bank = 0;
      this.lastDir = o.dir;
      this.pitchA = spec.uprightA * (1 - smooth(o.moveK, 0.04, 0.55));
      this.portWing.snap();
      this.starWing.snap();
    }
    this.lastX = o.x;
    this.lastY = o.y;

    // ---- the state blend: one smoothed travel scalar drives it all.
    // Rising travel answers fast (a flushed bird is instantly flying);
    // settling into the hover takes a beat longer — birds arrive.
    this.moveS = ease(this.moveS, Math.min(1, o.moveK), dt, o.moveK > this.moveS ? 6 : 2.6);
    // A strike is flight, whatever the feet were doing.
    const hoverK = (1 - smooth(this.moveS, 0.04, 0.55)) * (at > 0 ? 0 : 1);
    const cruiseK = smooth(this.moveS, 0.5, 0.95);

    // ---- pitch: the hull swings upright into the hover, levels out
    // through slow flight, and streamlines flat at cruise — one spring
    // so entries and exits are the same motion at every speed.
    const pitchTarget = spec.uprightA * hoverK * (1 - 0.1 * cruiseK);
    this.pitchA = ease(this.pitchA, pitchTarget, dt, 5.2);
    const pitchK = 1 - this.pitchA / spec.uprightA;

    // ---- banking: the body rolls into the turn rate, smoothed; the
    // roll differential also twists the two vanes apart (below).
    let dd = o.dir - this.lastDir;
    while (dd > Math.PI) dd -= TAU;
    while (dd < -Math.PI) dd += TAU;
    this.lastDir = o.dir;
    const bankPrev = this.bank;
    const bankTarget = Math.max(-0.38, Math.min(0.38, (dd / dt) * 0.09));
    this.bank = ease(this.bank, bankTarget, dt, 5);
    const bankVel = (this.bank - bankPrev) / dt;

    // ---- glide gate: only a leveled, traveling, peaceful bird locks
    // its wings out — and only species that glide at all.
    const gwave = Math.sin(this.t * 0.42 * TAU * 0.1 + this.seedF * 7.1);
    const glideTarget =
      spec.glides && hoverK < 0.05 && at === 0 && pitchK > 0.9
        ? Math.min(1, Math.max(0, (gwave - 0.15) / 0.35)) * Math.min(1, this.moveS * 1.6)
        : 0;
    this.glide = ease(this.glide, glideTarget, dt, 4);
    const glideK = this.glide;
    const beatK = 1 - glideK;

    // ---- the beat: tempo blends hover-slow → cruise-quick through
    // the PHASE ACCUMULATOR — continuous through every transition.
    const hz = spec.beatHz * (1 - (1 - spec.hoverBeatK) * hoverK) * (1 - 0.45 * glideK);
    this.phase += dt * hz;
    const B = wingBeat(this.phase);

    // ---- wing carriage channels. The hover works higher and deeper
    // (rowing the air it stands on); cruise flattens and quickens; a
    // glide holds the blades level with only a feather flutter.
    // The hover WORKS HIGH: carriage rides up so the beat lives in
    // the raised-V band (the mantling silhouette) instead of towel-
    // dropping across the body at profile — the amp shallows a touch
    // and the slower tempo keeps the read deep.
    const carriage =
      (0.14 + 0.38 * hoverK) * beatK +
      (0.05 + Math.sin(this.t * 3.6 + this.seedF) * 0.04) * glideK;
    const beatAmp = (0.5 + 0.18 * hoverK - 0.1 * cruiseK) * beatK;
    let raise = carriage + B.arm * beatAmp;
    let raiseHand = carriage + B.hand * beatAmp * 1.18;
    let swing = (B.power - B.recover) * 0.06 * beatK;
    let spread = Math.min(1, 0.96 - 0.2 * B.recover * beatK + 0.04 * glideK);
    let sweepK = 0.5 + 0.25 * glideK + 0.22 * cruiseK + 0.3 * (1 - spread);
    let gust = B.gust * beatK * Math.min(1, this.moveS * 0.55 + 0.55);

    // ---- altitude: the body hangs off the wingbeat — it SURGES on
    // the power stroke and settles through recovery; the hover adds
    // the long breath of the column, a glide barely whispers.
    let lift =
      spec.hover * (0.55 + 0.45 * air) +
      (B.power * 0.055 - B.recover * 0.022) * beatK +
      Math.sin(this.t * 3.6 + this.seedF) * 0.012 * glideK +
      Math.sin(this.t * 1.05 + this.seedF * 2.1) * 0.055 * hoverK;
    const driftL = Math.sin(this.t * 0.68 + this.seedF * 1.4) * 0.055 * hoverK;
    const driftF = Math.sin(this.t * 0.47 + this.seedF * 0.9) * 0.03 * hoverK;

    // ---- THE SWOOP, spoken in the body: the windup REARS — the hull
    // pitches back, climbs, wings mantle to the full pale-underside
    // bloom, talons cocking under the chest — a drawn bow. The strike
    // is a NOSE-DOWN DIVE: the body whips through level into a hard
    // downward attitude, lunging deep along the facing, wings snapped
    // back into a delta, both talons thrown. All shaped HERE so the
    // vane sims and the tail chain feel the snap and drag behind it —
    // the violence is physics, not paint.
    let lungeF = 0;
    let talonK = 0;
    let atkPitch = 0;
    let under = raise > 0.4;
    if (at > 0) {
      const quiet = Math.min(1, at * 3);
      swing *= 1 - quiet;
      gust *= 1 - quiet;
      if (at < 0.7) {
        const w = at / 0.7;
        const wE = w * w * (3 - 2 * w);
        atkPitch = 0.42 * wE;
        lift += 0.2 * wE;
        raise += (1.15 - raise) * wE;
        raiseHand += (1.28 - raiseHand) * wE;
        spread = Math.min(1, spread + wE * 0.35);
        sweepK = sweepK + (0.16 - sweepK) * wE;
        talonK = wE * 0.7;
        under = true;
      } else {
        const wp = Math.min(1, (at - 0.7) / 0.3);
        const k = Math.sin(Math.PI * wp);
        // The rear decays as the dive takes over — the whole attitude
        // whips from +0.42 back through level to −0.66 nose-down.
        atkPitch = 0.42 * (1 - wp) - 0.66 * k;
        lungeF = 0.78 * k;
        lift -= 0.48 * k;
        raise += (-0.55 - raise) * k;
        raiseHand += (-0.74 - raiseHand) * k;
        spread += (0.85 - spread) * k;
        sweepK = sweepK + (1.2 - sweepK) * k;
        talonK = 1;
        under = false;
      }
    }
    const pitchEff = this.pitchA + atkPitch;
    const pitchKEff = 1 - clamp(Math.max(0, pitchEff) / spec.uprightA, 0, 1);

    // ---- the vanes: each wing's sim rides the finished carriage.
    // Banking twists them apart — the inside wing's surface loads up,
    // the outside wing's washes out — honest roll physics for free.
    const twist = bankVel * 0.04;
    this.portWing.update(raise + twist, dt);
    this.starWing.update(raise - twist, dt);

    // ---- the tail: simulated in WORLD space off the PAINTED stern
    // (lunge and drift included — the tail rides the pounce), so the
    // fan drags turns, streams the cruise, flops the stop, and gets
    // whipped up-and-over by the dive without a single posed frame.
    this.tailOut.length = 0;
    if (spec.tail > 0) {
      const fx = Math.cos(o.dir);
      const fy = Math.sin(o.dir);
      const lx = -fy;
      const ly = fx;
      // The dock sits INSIDE the stern (0.8 of the reach) — the chain
      // emerges from feathers, never from a point floating behind them.
      const sternR = spec.stern * 0.8 * Math.cos(pitchEff);
      const rootX = o.x + fx * (lungeF + driftF - sternR) + lx * driftL;
      const rootY = o.y + fy * (lungeF + driftF - sternR) + ly * driftL;
      const rootZ = lift - Math.sin(pitchEff) * spec.stern * 0.8;
      // The fan's rest droop follows the hull pitch — down-braced in
      // the upright hover, streamed flat at cruise and in the dive.
      const droopA = 0.12 + Math.max(0, pitchEff) * 0.8;
      this.tickTail(rootX, rootY, rootZ, fx, fy, dt, droopA);
      for (const n of this.tailNodes) {
        this.tailOut.push({ dx: n.x - o.x, dy: n.y - o.y, z: n.z });
      }
    }

    return {
      hoverK,
      cruiseK,
      pitchK: pitchKEff,
      pitchA: pitchEff,
      bank: this.bank,
      lift,
      driftF,
      driftL,
      beat: B,
      raise,
      raiseHand,
      swing,
      spread,
      sweepK,
      gust,
      glideK,
      under,
      talonK,
      lungeF,
      port: this.portWing.lag,
      star: this.starWing.lag,
      portTipVel: this.portWing.vel[spec.stations - 1] ?? 0,
      starTipVel: this.starWing.vel[spec.stations - 1] ?? 0,
      tail: this.tailOut,
      restless: this.portWing.restless || this.starWing.restless || this.moveS > 0.02,
    };
  }
}

// -------------------------------------------------------- pitch frame

/**
 * The pitched hull's basis vectors, all living in the F–Z plane (the
 * lateral axis is untouched by pitch): the hull AXIS â (nose-ward),
 * the DORSAL d̂ (out of the bird's back), and the WING plane's forward
 * f̂w / up ŵ — wings beat in a plane that splits the difference
 * between the world and the hull, which is how a near-vertical hover
 * still rows the air underneath itself instead of fanning sideways.
 */
interface PitchFrame {
  aF: number;
  aZ: number;
  dF: number;
  dZ: number;
  wfF: number;
  wfZ: number;
  wuF: number;
  wuZ: number;
}

function pitchFrame(pitchA: number, wingTiltK = 0.5): PitchFrame {
  const th = pitchA;
  const tw = pitchA * wingTiltK;
  return {
    aF: Math.cos(th),
    aZ: Math.sin(th),
    dF: -Math.sin(th),
    dZ: Math.cos(th),
    wfF: Math.cos(tw),
    wfZ: Math.sin(tw),
    wuF: -Math.sin(tw),
    wuZ: Math.cos(tw),
  };
}

/** Body-space screen projector: (F, L, Z) tiles → screen px. */
type Projector = (F: number, L: number, Z: number) => [number, number];

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

// ----------------------------------------------------- the owl's wing

/**
 * THE LIVING WING — leading edge rigged, vane simulated. The bone
 * line (shoulder → wrist → leading primary) carries the rig's raise
 * channels; the five primary feather groups behind it each ride ONE
 * WingSim station, so their droop, load flex and settle come off the
 * physics, not the pose. Fingered silhouette in the facet dialect:
 * each primary shorter and further back-swept than the last, stepped
 * notches between, closing along the secondaries into the flank.
 */
function owlWingSim(
  ctx: CanvasRenderingContext2D,
  look: OwlLook,
  o: {
    P: Projector;
    pf: PitchFrame;
    /** Which wing: −1 port, +1 starboard. */
    es: number;
    s: number;
    fr: FlightFrame;
    /** This wing's sim stations + tip velocity (the flex cue). */
    lag: readonly number[];
    tipVel: number;
    /** Body half-length (tiles) — the trailing root's seat. */
    hl: number;
    hurt?: boolean;
  },
): void {
  const { P, pf, es, s, fr } = o;
  const spread = Math.max(0.05, fr.spread);
  const span = look.wingSpan;
  const boneInk = o.hurt ? '#ffffff' : shade(look.mantle, -22);

  const armL = span * 0.42 * spread;
  const handL = span * 0.58 * spread;
  // Shoulder seats on the pitched hull: forward of center, dorsal of
  // the axis — it rides up the back as the body swings vertical.
  const shA = 0.14;
  const shD = 0.1 + look.bodyW * 0.35;
  const shF = pf.aF * shA + pf.dF * shD;
  const shZ = pf.aZ * shA + pf.dZ * shD;
  const shL = es * look.bodyW * 0.72;
  // The wrist: the arm reaches out and slightly forward in the WING
  // plane, raised on the rig's arm channel.
  const rowF = 0.1 * spread + fr.swing;
  const wrF = shF + pf.wfF * rowF + pf.wuF * Math.sin(fr.raise) * armL;
  const wrZ = shZ + pf.wfZ * rowF + pf.wuZ * Math.sin(fr.raise) * armL;
  const wrL = shL + es * Math.cos(fr.raise) * armL;
  // The vane's own velocity bends the primaries — up under the power
  // stroke, drooping through recovery. Physics, not a scripted dial.
  const flex = clamp(-o.tipVel * 0.085, -0.5, 0.5);
  // Five primary feather groups, one sim station each.
  const N = 5;
  const tips: Array<[number, number, number]> = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const len = handL * (1 - 0.36 * u);
    const lagK = o.lag[Math.min(k, o.lag.length - 1)] ?? 0;
    // The hand carries its own trailing angle, and each feather group
    // drags its SIMULATED lag behind that — the flap wave, visible.
    const tipRaise = fr.raiseHand - (0.28 + 0.5 * u) * spread * 0.55 - lagK * 0.55;
    const backW = (0.1 + 0.85 * u) * len * fr.sweepK;
    const rise = Math.sin(tipRaise) * len * 0.85 - 0.04 * u + flex * u * u * span * 0.3;
    tips.push([
      wrF + pf.wfF * (0.06 * spread - backW) + pf.wuF * rise,
      wrL + es * Math.cos(tipRaise) * len,
      wrZ + pf.wfZ * (0.06 * spread - backW) + pf.wuZ * rise,
    ]);
  }
  // The trailing edge closes into the flank at the tail root, its
  // secondaries drooping on the innermost station's sim angle.
  const rootF = pf.aF * -(o.hl * 0.62) + pf.dF * 0.06;
  const rootZ = pf.aZ * -(o.hl * 0.62) + pf.dZ * 0.06;
  const rootL = es * look.bodyW * 0.5;
  const innerLag = o.lag[N - 1] ?? 0;
  const inner = tips[N - 1]!;
  const secDroop = 0.22 + innerLag * 0.6;
  const midF = (inner[0] + rootF) * 0.5 - pf.wuF * secDroop * span * 0.18;
  const midL = (inner[1] + rootL) * 0.5;
  const midZ = (inner[2] + rootZ) * 0.5 - pf.wuZ * secDroop * span * 0.18;

  // THE ROOT TUCK: the wing's inner anchor lives INSIDE the hull —
  // a point at the body's core that the slab polygon always includes,
  // so no raise angle, bank, or drift can ever open daylight between
  // wing and body (the user's separation verdict). The visible
  // shoulder is just where the wing CLEARS the hull, not where it
  // attaches.
  const tuckF = pf.aF * 0.02 + pf.dF * 0.04;
  const tuckZ = pf.aZ * 0.02 + pf.dZ * 0.04;
  const tuckL = es * look.bodyW * 0.18;

  // One solid slab: core tuck → shoulder → leading edge → fingered
  // tips (stepped notches of the facet dialect) → sim-drooped
  // secondaries → root, closing back through the core. The outline is
  // COLLECTED first: its shoelace area is the honest measure of how
  // edge-on the wing is (a probe along any single chord lies — the
  // plane can collapse in a direction the probe misses).
  const outline: Array<[number, number]> = [];
  const pt0 = P(tuckF, tuckL, tuckZ);
  outline.push(pt0);
  const p0 = P(shF, shL, shZ);
  outline.push(p0);
  const pw = P(wrF, wrL, wrZ);
  outline.push(pw);
  for (let k = 0; k < N; k++) {
    const t = tips[k]!;
    outline.push(P(t[0], t[1], t[2]));
    if (k < N - 1) {
      const nx = tips[k + 1]!;
      outline.push(
        P(
          t[0] * 0.35 + nx[0] * 0.35 + wrF * 0.3,
          t[1] * 0.35 + nx[1] * 0.35 + wrL * 0.3,
          t[2] * 0.35 + nx[2] * 0.35 + wrZ * 0.3,
        ),
      );
    }
  }
  const pm = P(midF, midL, midZ);
  outline.push(pm);
  const pr = P(rootF, rootL, rootZ);
  outline.push(pr);
  // The gate measures the OUTER slab only (shoulder → tips → mid) —
  // the root wedge at the body always keeps area and would blind the
  // gate to an edge-on outer wing.
  let area2 = 0;
  const outer = outline.slice(1, outline.length - 1);
  for (let k = 0; k < outer.length; k++) {
    const a = outer[k]!;
    const b = outer[(k + 1) % outer.length]!;
    area2 += a[0] * b[1] - b[0] * a[1];
  }
  const slabArea = Math.abs(area2) / 2;
  /** 1 = a full broad slab, →0 as the wing turns edge-on. */
  const slabK = Math.min(1, slabArea / (0.1 * span * span * s * s));
  // WHICH FACE SHOWS IS GEOMETRY, NOT A THRESHOLD: the projected
  // polygon's WINDING flips exactly when the camera crosses the wing
  // plane — and at that instant the slab is edge-on and invisible,
  // so the top↔underside swap can never flash (the old raise>0.4
  // flip popped pale at the crest of every hover beat).
  const underVis = area2 * o.es > 0;
  const base = o.hurt ? '#ffffff' : underVis ? look.breast : look.mantle;
  const flightInk = o.hurt
    ? '#ffffff'
    : underVis
      ? shade(look.breast, -9)
      : shade(look.mantle, -10);
  /** Detail ink fades out with the slab: an edge-on wing keeps its
   *  pale sliver, but bands, barring, coverts and bones — the DARK
   *  ink — vanish with the surface they decorate (the wire verdict). */
  const detailA = slabK <= 0.22 ? 0 : Math.min(1, (slabK - 0.22) / 0.3);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(outline[0]![0], outline[0]![1]);
  for (let k = 1; k < outline.length; k++) ctx.lineTo(outline[k]![0], outline[k]![1]);
  ctx.closePath();
  ctx.fill();
  // THE WING HAS THICKNESS: seen edge-on, a real wing shows the
  // folded feather-stack edge — never a screen hairline. As the
  // projected slab thins, an edge-mass stroke along the leading
  // polyline fattens to take its place, so the far wing at the
  // quarter bands reads as a pale blade with body, at every phase
  // of the beat, with no pop and no vanish.
  if (slabK < 0.3) {
    const edgeW = s * span * 0.05 * (1 - slabK / 0.3);
    if (edgeW > 1) {
      ctx.strokeStyle = base;
      ctx.lineWidth = edgeW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(pw[0], pw[1]);
      const lead0 = tips[0]!;
      const pl0 = P(lead0[0], lead0[1], lead0[2]);
      ctx.lineTo(pl0[0], pl0[1]);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }
  }

  if (!o.hurt && detailA > 0.02) {
    ctx.globalAlpha = detailA;
    // The flight-feather band: the outer half a step darker —
    // primaries and secondaries against the paler coverts.
    ctx.fillStyle = flightInk;
    ctx.beginPath();
    const mixF = (a: [number, number, number], t: number): [number, number] =>
      P(
        a[0] * t + (shF * 0.5 + rootF * 0.5) * (1 - t),
        a[1] * t + (shL * 0.7 + rootL * 0.3) * (1 - t),
        a[2] * t + (shZ * 0.5 + rootZ * 0.5) * (1 - t),
      );
    const pm0 = mixF([wrF, wrL, wrZ], 0.45);
    ctx.moveTo(pm0[0], pm0[1]);
    ctx.lineTo(pw[0], pw[1]);
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const pt = P(t[0], t[1], t[2]);
      ctx.lineTo(pt[0], pt[1]);
    }
    const prF = mixF(tips[N - 1]!, 0.55);
    ctx.lineTo(prF[0], prF[1]);
    ctx.closePath();
    ctx.fill();
    // Bar ink ticking every feather group — the parliament's barring.
    ctx.strokeStyle = look.bar;
    ctx.lineWidth = Math.max(1.2, s * 0.022);
    ctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const t = tips[k]!;
      const a = P(t[0] * 0.82 + wrF * 0.18, t[1] * 0.82 + wrL * 0.18, t[2] * 0.82 + wrZ * 0.18);
      const b = P(t[0] * 0.93 + wrF * 0.07, t[1] * 0.93 + wrL * 0.07, t[2] * 0.93 + wrZ * 0.07);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // Covert shingles seating the wing on the body.
    ctx.strokeStyle = shade(base, -8);
    ctx.lineWidth = Math.max(1.1, s * 0.018);
    for (let rr = 0; rr < 2; rr++) {
      const t0 = 0.2 + rr * 0.16;
      const a = P(
        shF + (wrF - shF) * t0,
        shL + (wrL - shL) * t0 * 0.9,
        shZ + (wrZ - shZ) * t0 - 0.02,
      );
      const b = P(
        rootF * (0.4 + rr * 0.2) + shF * (0.6 - rr * 0.2),
        shL + (rootL - shL) * (0.3 + rr * 0.2),
        shZ * 0.7 + rootZ * 0.3 - 0.01,
      );
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // The leading arm — the wing's bone line. The whole stroke FADES
  // WITH THE SLAB: when a wing turns edge-on its surface collapses to
  // a sliver, and a full-weight bone there reads as a stray wire
  // hanging in the air (flier-sheet audit, twice) — so the bone's
  // weight follows the projected chord. The hand segment thins
  // further; the arm carries what weight remains.
  // Below a fraction of its broad-side area the wing is a sliver —
  // the bone vanishes WITH its slab (alpha, not just width: a 2px
  // wire at high zoom still read as a stray hair on the sheet).
  if (detailA > 0.02) {
    const boneA = detailA;
    const boneW = 0.35 + 0.65 * slabK;
    ctx.globalAlpha = boneA;
    ctx.strokeStyle = boneInk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, s * 0.042 * boneW);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(pw[0], pw[1]);
    ctx.stroke();
    const lead = tips[0]!;
    const pl = P(lead[0], lead[1], lead[2]);
    ctx.lineWidth = Math.max(1, s * 0.026 * boneW);
    ctx.beginPath();
    ctx.moveTo(pw[0], pw[1]);
    ctx.lineTo(pl[0], pl[1]);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  }
  // THE SCAPULAR: a feather mass over the wing root, seating the
  // wing INTO the hull silhouette — the second half of the no-gap
  // law (the tuck guarantees overlap; the scapular sells the joint).
  // NO wind/air effect lines live on the model — air is the particle
  // system's job, never the rig's.
  if (!o.hurt) {
    const sc = P(
      shF * 0.55 + tuckF * 0.45,
      shL * 0.7 + tuckL * 0.3,
      shZ * 0.55 + tuckZ * 0.45,
    );
    ctx.fillStyle = shade(base, -4);
    ctx.beginPath();
    facetCircle(ctx, sc[0], sc[1], look.bodyW * s * 0.34, 7, es * 0.7, 0.72);
    ctx.fill();
  }
}

// ---------------------------------------------------------- the owl

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
export function drawGreatOwl(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: OwlLook,
  o: {
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
  },
): void {
  const s = o.s;
  const ys = o.ys;
  const fr = o.flight;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const now = o.nowMs;
  const seed = o.seed;
  const hl = spec.bodyLen;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const pf = pitchFrame(fr.pitchA);

  // Altitude comes from the rig alone (spec.hover owns the elder's
  // higher seat) — a painter-side rank multiplier desynced the body
  // from the tail chain the rig anchored at ITS lift (the detached-
  // tail verdict: the elder's fan floated a fifth of a tile low).
  const lift = fr.lift * s;
  const bcx = o.x + fx * (fr.lungeF + fr.driftF) * s + px * fr.driftL * s;
  const bcy = o.y + (fy * (fr.lungeF + fr.driftF) + py * fr.driftL) * ys * s - lift;
  // THE GIMBAL: the bank rolls the whole projected bird around its
  // center — wings, body, tail — while the head, painted last and
  // level, holds the horizon.
  const roll = fr.bank * fr.pitchK * 0.6;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const P: Projector = (F, L, Z) => {
    const wx = (fx * F + px * L) * s;
    const wy = (fy * F + py * L) * ys * s - Z * s;
    return [bcx + wx * cosR - wy * sinR, bcy + wx * sinR + wy * cosR];
  };
  const coat = C(shade(look.mantle, (((seed >>> 5) & 7) - 3) * 2));

  // The hull's poles ride the pitched axis: the same anatomy stands
  // upright in the hover and lies level at cruise. The hover's poles
  // stretch through STYLE-COMPRESSED PITCH (the silhouette-hierarchy
  // law): projected truly, the upright hull foreshortens into a stub
  // under the head — the defining body read never collapses.
  const hullStretch = 1 + 0.24 * (1 - fr.pitchK);
  const noseA = hl * (0.72 + 0.06 * fr.pitchK) * hullStretch;
  const ventA = hl * 0.88 * hullStretch;
  const noseF = pf.aF * noseA;
  const noseZ = pf.aZ * noseA;
  const ventF = -pf.aF * ventA;
  const ventZ = -pf.aZ * ventA;

  const drawTail = (): void => {
    // THE TAIL IS A SIMULATION: the rig hands a world-space verlet
    // chain (dragged, streamed, flopped, dive-whipped by physics) and
    // the painter dresses it — a covert dock wedge blending into the
    // stern, then the stepped feather fan fanned around the chain's
    // OWN tip direction. Nothing here is posed; the floppy life IS
    // the sim. The chain deliberately ignores the bank roll — a free
    // appendage lags the body's roll.
    const chain = fr.tail;
    if (chain.length < 2) return;
    const S = (n: { dx: number; dy: number; z: number }): [number, number] => [
      o.x + n.dx * s,
      o.y + n.dy * ys * s - n.z * s,
    ];
    const pts = chain.map(S);
    const dock = pts[0]!;
    const mid = pts[Math.max(1, pts.length - 3)]!;
    const last = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    let ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
    if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) < s * 0.02) {
      // Chain streaming dead toward/away from the camera: fall back
      // to the screen-projected reverse facing so the fan never spins.
      ang = Math.atan2(-fy * ys, -fx);
    }
    // The fan keeps its feather length even when the chain hangs
    // nearly vertical under the hover (a compressed screen chain must
    // not shrink the plumage).
    const fanLen = Math.max(
      Math.hypot(last[0] - mid[0], last[1] - mid[1]) + look.tailLen * s * 0.55,
      look.tailLen * s * 1.0,
    );
    const tSpread = 0.55 + 1.05 * (1 - fr.pitchK) + Math.min(0.5, Math.abs(fr.bank)) * 0.4;
    // THE STEM: a tapered feather ribbon following the chain from
    // inside the hull out to the fan root — a CONTINUOUS mass, so the
    // fan can never float detached behind the body (the user's gap
    // verdict, three screenshots' worth). Widths in tiles, perp per
    // sample, one closed fill.
    const midIdx = Math.max(1, pts.length - 3);
    const stem = pts.slice(0, midIdx + 1);
    if (stem.length >= 2) {
      const wAt = (t: number): number => s * (0.16 - 0.08 * t);
      ctx.fillStyle = C(shade(look.mantle, -3));
      ctx.beginPath();
      const perp = (i: number): [number, number] => {
        const a = stem[Math.max(0, i - 1)]!;
        const b = stem[Math.min(stem.length - 1, i + 1)]!;
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4;
        return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
      };
      for (let i = 0; i < stem.length; i++) {
        const p = stem[i]!;
        const n = perp(i);
        const w2 = wAt(i / (stem.length - 1));
        if (i === 0) ctx.moveTo(p[0] + n[0] * w2, p[1] + n[1] * w2);
        else ctx.lineTo(p[0] + n[0] * w2, p[1] + n[1] * w2);
      }
      for (let i = stem.length - 1; i >= 0; i--) {
        const p = stem[i]!;
        const n = perp(i);
        const w2 = wAt(i / (stem.length - 1));
        ctx.lineTo(p[0] - n[0] * w2, p[1] - n[1] * w2);
      }
      ctx.closePath();
      ctx.fill();
    }
    // The fan: five stepped blades around the chain's live direction.
    const TN = 5;
    ctx.fillStyle = C(shade(look.mantle, -6));
    ctx.beginPath();
    ctx.moveTo(mid[0], mid[1]);
    const tips: Array<[number, number]> = [];
    for (let k = 0; k < TN; k++) {
      const u = k / (TN - 1) - 0.5;
      const a = ang + u * tSpread;
      const ln = fanLen * (1 - 0.32 * Math.abs(u) * 2);
      tips.push([mid[0] + Math.cos(a) * ln, mid[1] + Math.sin(a) * ln]);
    }
    for (let k = 0; k < TN; k++) {
      const t = tips[k]!;
      ctx.lineTo(t[0], t[1]);
      if (k < TN - 1) {
        const n = tips[k + 1]!;
        ctx.lineTo(
          t[0] * 0.35 + n[0] * 0.35 + mid[0] * 0.3,
          t[1] * 0.35 + n[1] * 0.35 + mid[1] * 0.3,
        );
      }
    }
    ctx.closePath();
    ctx.fill();
    if (!o.hurt && fanLen > s * 0.22) {
      // Bar ticks riding every blade tip — the parliament's barring.
      // (Skipped on a tightly folded fan, where tip ticks read as
      // toes — the sheet's talon-mirage verdict.)
      ctx.strokeStyle = look.bar;
      ctx.lineWidth = Math.max(1.2, s * 0.02);
      ctx.lineCap = 'round';
      for (const t of tips) {
        ctx.beginPath();
        ctx.moveTo(mid[0] + (t[0] - mid[0]) * 0.8, mid[1] + (t[1] - mid[1]) * 0.8);
        ctx.lineTo(mid[0] + (t[0] - mid[0]) * 0.92, mid[1] + (t[1] - mid[1]) * 0.92);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  };

  const drawWing = (es: number): void =>
    owlWingSim(ctx, look, {
      P,
      pf,
      es,
      s,
      fr,
      lag: es < 0 ? fr.port : fr.star,
      tipVel: es < 0 ? fr.portTipVel : fr.starTipVel,
      hl,
      hurt: o.hurt,
    });

  const drawBody = (): void => {
    // One streamlined mass between nose and vent — foreshortened by
    // the projection itself: a bird flying at the camera is a compact
    // chest, a profile bird a long hull, a hovering bird an upright
    // keg — all the same blob between two pitched poles.
    const pN = P(noseF, 0, noseZ);
    const pV = P(ventF, 0, ventZ);
    const mx = (pN[0] + pV[0]) / 2;
    const my = (pN[1] + pV[1]) / 2;
    const ax = Math.atan2(pV[1] - pN[1], pV[0] - pN[0]);
    const half = Math.max(
      Math.hypot(pV[0] - pN[0], pV[1] - pN[1]) / 2 + look.bodyW * 0.55 * s,
      look.bodyW * 1.05 * s,
    );
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ax);
    ctx.fillStyle = coat;
    ctx.beginPath();
    facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.0 * s) / half, 0.35);
    ctx.fill();
    if (!o.hurt) {
      ctx.beginPath();
      facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.0 * s) / half, 0.35);
      ctx.clip();
      ctx.rotate(-ax);
      // The pale keel: the under-half of the hull in breast tone —
      // strongest flying at the camera, and OWNED by the hover, whose
      // upright chest shows the whole barred bib to the glade.
      const keelK = clamp(0.55 + fy * 0.7 * fr.pitchK + 0.4 * (1 - fr.pitchK), 0, 1);
      if (keelK > 0.05) {
        ctx.globalAlpha = keelK;
        ctx.fillStyle = shade(look.breast, -3);
        ctx.fillRect(-half * 1.4, look.bodyW * 0.12 * s * fr.pitchK - half * 0.5 * (1 - fr.pitchK), half * 2.8, half * 2.4);
        ctx.globalAlpha = 1;
        // Barred keel rows when the chest truly meets the camera.
        if (fy > 0.25 || fr.pitchK < 0.55) {
          ctx.strokeStyle = look.bar;
          ctx.lineWidth = Math.max(1.1, s * 0.016);
          ctx.lineCap = 'round';
          for (let rIdx = 0; rIdx < 3; rIdx++) {
            const ph = (((seed >>> (rIdx * 2)) & 3) - 1.5) * s * 0.02;
            const rw = look.bodyW * s * (0.5 - rIdx * 0.11);
            const ry = look.bodyW * s * (0.05 + rIdx * 0.24) - half * 0.28 * (1 - fr.pitchK);
            ctx.beginPath();
            ctx.moveTo(ph - rw, ry - s * 0.028);
            ctx.lineTo(ph, ry + s * 0.028);
            ctx.lineTo(ph + rw, ry - s * 0.028);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // The sunlit top rim — the camera always reads the back plane.
      ctx.fillStyle = 'rgba(255, 244, 220, 0.13)';
      ctx.rotate(ax);
      ctx.fillRect(-half, -look.bodyW * 1.0 * s, half * 2, look.bodyW * 0.3 * s);
    }
    ctx.restore();
    // The keeper's strap: a thin collar band cinched at the neck seam
    // — worn gear riding the hull, never a dye.
    if (o.collar && !o.hurt) {
      const c0 = P(noseF * 0.68, -look.bodyW * 0.66, noseZ * 0.68);
      const c1 = P(noseF * 0.74, 0, noseZ * 0.74 - look.bodyW * 0.5);
      const c2 = P(noseF * 0.68, look.bodyW * 0.66, noseZ * 0.68);
      ctx.strokeStyle = o.collar;
      ctx.lineWidth = Math.max(1.6, s * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c0[0], c0[1]);
      ctx.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  };

  const drawTalon = (es: number): void => {
    // ONE leg, so the pair can z-split around the hull like the
    // wings do. The hip anchors at the BELLY — slightly aft of the
    // hull's center, below its keel — so the legs read as landing
    // gear under the mass at every pitch (the old stern-derived
    // anchor climbed the torso as the hull pitched, worst on the
    // elder's stretched hull: the user's legs-up-the-body verdict).
    const talonK = fr.talonK;
    if (talonK < 0.15 && at === 0) return;
    const shankInk = C(shade(spec.legColor ?? look.mantle, -20));
    const clawInk = C(shade(spec.legColor ?? look.mantle, -50));
    const striking = at >= 0.7;
    const hipA = -hl * 0.14;
    const hipD = -(look.bodyW * 0.62);
    const hipF = pf.aF * hipA + pf.dF * hipD;
    const hipZ = pf.aZ * hipA + pf.dZ * hipD;
    const hipL = es * look.bodyW * 0.4;
    // The shank stays SHORT at every band — the dive's reach is the
    // BODY's lunge, and the weapon is the claw: a long foot throw
    // projected at the south bands re-grew the wader (twice now —
    // this is the law, keep the shank under a tenth of a tile).
    const footF = hipF + (striking ? 0.13 * talonK : 0.05 * talonK);
    const footZ = hipZ - (striking ? 0.07 : 0.05) * talonK - 0.03;
    ctx.lineCap = 'round';
    const a = P(hipF, hipL, hipZ);
    const b = P(footF, hipL * 1.12, footZ);
    ctx.strokeStyle = shankInk;
    ctx.lineWidth = Math.max(2, spec.legW * s * (striking ? 1.2 : 0.95));
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    if (talonK > 0.25) {
      // Cocked claws curl under through the windup; the strike
      // SPLAYS them — the swoop's exclamation mark.
      ctx.strokeStyle = clawInk;
      ctx.lineWidth = Math.max(1.5, spec.legW * s * (striking ? 0.72 : 0.5));
      for (const ta of [-1, 0, 1]) {
        const c = P(
          footF + (striking ? 0.17 : 0.04) * talonK + ta * (striking ? 0.045 : 0.02),
          hipL * 1.12 + es * ta * (striking ? 0.085 : 0.045) * talonK,
          footZ - (striking ? 0.11 : 0.07) * talonK + (striking ? 0.02 : 0) * Math.abs(ta),
        );
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  };

  const drawHead = (): void => {
    // The head — LAST and LEVEL: the gimbal. Its position rides the
    // pitched hull and the bank; its art never rolls, never pitches.
    // The hover frees the slow sweep of the watch; travel locks the
    // gaze near the flight line; the telegraph snaps it dead ahead
    // and screams through the strike.
    const seatA = noseA + look.headW * 0.28;
    const seatD = look.headH * (0.4 + 0.35 * fr.pitchK);
    const hp = P(pf.aF * seatA + pf.dF * seatD, 0, pf.aZ * seatA + pf.dZ * seatD);
    // The watch sweeps, but never so far the far disc lobe culls —
    // a one-eyed still frame reads broken (flier-sheet audit).
    const gazeAmp = 0.25 + 0.3 * fr.hoverK;
    const hdir =
      o.dir + (at > 0 ? 0 : (now > 0 ? Math.sin(now * 0.00037 + seed * 0.83) : 0) * gazeAmp);
    const blink =
      now > 0 && at === 0 ? Math.max(0, Math.sin(now * 0.0009 + seed * 1.7) - 0.975) / 0.025 : 0;
    // The neck ruff: a wedge seating the head on the hull — no
    // floating skull, whatever the pitch.
    if (!o.hurt) {
      const r0 = P(
        pf.aF * (seatA - look.headW * 0.42) + pf.dF * seatD * 0.75,
        0,
        pf.aZ * (seatA - look.headW * 0.42) + pf.dZ * seatD * 0.75,
      );
      ctx.fillStyle = shade(look.mantle, -4);
      ctx.beginPath();
      facetCircle(ctx, r0[0], r0[1], look.headW * s * 0.42, 7, seed * 0.3, 0.8);
      ctx.fill();
    }
    drawOwlHead(ctx, look, {
      x: hp[0],
      y: hp[1],
      s,
      fx: Math.cos(hdir),
      fy: Math.sin(hdir),
      ys,
      hurt: o.hurt,
      screech: at > 0.55 ? Math.min(1, (at - 0.55) / 0.3) : 0,
      blink,
      seed,
    });
  };

  // Assembly — painter's order from the facing: the far wing always
  // seats behind the hull, the near wing over it; the tail and head
  // swap ends as the bird turns through the camera line.
  // Assembly — painter's order from the facing: far wing and far leg
  // seat behind the hull, near leg and near wing over it; with the
  // back to the camera BOTH legs tuck behind the body mass (the
  // stubs-on-the-back verdict), and tail and head swap ends.
  const farEs = py < 0 ? 1 : py > 0 ? -1 : 1;
  if (fy >= -0.15) {
    drawTail();
    drawWing(farEs);
    drawTalon(farEs);
    drawBody();
    drawTalon(-farEs);
    drawWing(-farEs);
    drawHead();
  } else {
    drawHead();
    drawWing(farEs);
    drawTalon(farEs);
    drawTalon(-farEs);
    drawBody();
    drawTail();
    drawWing(-farEs);
  }
}

// ---------------------------------------------------------- the bat

/**
 * THE CAVE BAT RIDES THE RIG: the membrane flier. The same carriage
 * as the owl at different dials — quick loose flutter, no glides, a
 * hover that hangs more vertical than it pitches. The wing is one
 * leathery plane: a rigged arm-and-finger leading edge with the
 * membrane's scalloped trailing edge riding the sim stations, so the
 * whole sail billows a beat behind the bones — leather, not feather,
 * told entirely by tone and damping. Identity kept: round tuft body,
 * tall ragged dish ears, amber eyes, fangs on the lunge.
 */
export function drawBat(
  ctx: CanvasRenderingContext2D,
  o: {
    x: number;
    y: number;
    s: number;
    dir: number;
    radius: number;
    color: string;
    hurt: boolean;
    nowMs: number;
    seed: number;
    ys: number;
    flight: FlightFrame;
    attackT?: number;
  },
): void {
  const s = o.s;
  const ys = o.ys;
  const fr = o.flight;
  const fx = Math.cos(o.dir);
  const fy = Math.sin(o.dir);
  const px = -fy;
  const py = fx;
  const at = o.attackT ?? 0;
  const rt = o.radius * 2.6; // body radius in tiles (the old bulk)
  const span = rt * 1.55;
  const pf = pitchFrame(fr.pitchA, 0.42);
  const body = o.hurt ? '#ffffff' : o.color;
  const membrane = o.hurt ? '#ffffff' : shade(o.color, -10);
  const boneInk = o.hurt ? '#ffffff' : shade(o.color, -30);

  // The strike dips then lunges — carried by the rig's channels.
  const bcx = o.x + fx * (fr.lungeF * 0.65 + fr.driftF) * s + px * fr.driftL * s;
  const bcy = o.y + (fy * (fr.lungeF * 0.65 + fr.driftF) + py * fr.driftL) * ys * s - fr.lift * s;
  const roll = fr.bank * 0.5;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const P: Projector = (F, L, Z) => {
    const wx = (fx * F + px * L) * s;
    const wy = (fy * F + py * L) * ys * s - Z * s;
    return [bcx + wx * cosR - wy * sinR, bcy + wx * sinR + wy * cosR];
  };

  const drawWing = (es: number): void => {
    const lag = es < 0 ? fr.port : fr.star;
    const spread = Math.max(0.15, fr.spread);
    const armL = span * 0.5 * spread;
    const handL = span * 0.5 * spread;
    const shF = pf.dF * rt * 0.12;
    const shZ = pf.dZ * rt * 0.12;
    const shL = es * rt * 0.24;
    const wrF = shF + pf.wuF * Math.sin(fr.raise) * armL + pf.wfF * fr.swing;
    const wrZ = shZ + pf.wuZ * Math.sin(fr.raise) * armL + pf.wfZ * fr.swing;
    const wrL = shL + es * Math.cos(fr.raise) * armL;
    // Two finger spikes carry the membrane's outer edge.
    const fingers: Array<[number, number, number]> = [];
    for (let k = 0; k < 2; k++) {
      const u = k * 0.5;
      const len = handL * (1 - 0.28 * u);
      const a = fr.raiseHand - (0.2 + 0.5 * u) * spread * 0.5 - (lag[k + 1] ?? 0) * 0.4;
      const backW = (0.15 + 0.6 * u) * len * fr.sweepK;
      fingers.push([
        wrF - pf.wfF * backW + pf.wuF * Math.sin(a) * len * 0.9,
        wrL + es * Math.cos(a) * len,
        wrZ - pf.wfZ * backW + pf.wuZ * Math.sin(a) * len * 0.9,
      ]);
    }
    // The membrane closes into the flank through SIMULATED scallops:
    // each dip between anchor points sags on its station's lag — the
    // leather breathing a beat behind the bones.
    const ankF = -pf.aF * rt * 0.42;
    const ankZ = -pf.aZ * rt * 0.42 - rt * 0.1;
    const ankL = es * rt * 0.3;
    // The sail keeps a resting belly even between beats — a membrane
    // with no sag collapses to a dagger at the frontal bands.
    const sag = (k: number): number => 0.24 + clamp((lag[k] ?? 0) * 0.9, -0.3, 0.55);
    const tip = fingers[1]!;
    const m1: [number, number, number] = [
      (tip[0] + ankF) * 0.55 - pf.wuF * sag(2) * span * 0.3,
      (tip[1] + ankL) * 0.55,
      (tip[2] + ankZ) * 0.55 - pf.wuZ * sag(2) * span * 0.3,
    ];
    const m2: [number, number, number] = [
      (tip[0] * 0.3 + ankF * 0.7) - pf.wuF * sag(3) * span * 0.22,
      (tip[1] * 0.3 + ankL * 0.7),
      (tip[2] * 0.3 + ankZ * 0.7) - pf.wuZ * sag(3) * span * 0.22,
    ];
    ctx.fillStyle = membrane;
    ctx.beginPath();
    const p0 = P(shF, shL, shZ);
    ctx.moveTo(p0[0], p0[1]);
    const pw = P(wrF, wrL, wrZ);
    ctx.lineTo(pw[0], pw[1]);
    for (const f of fingers) {
      const pfp = P(f[0], f[1], f[2]);
      ctx.lineTo(pfp[0], pfp[1]);
    }
    const pm1 = P(m1[0], m1[1], m1[2]);
    ctx.lineTo(pm1[0], pm1[1]);
    const pm2 = P(m2[0], m2[1], m2[2]);
    ctx.lineTo(pm2[0], pm2[1]);
    const pa = P(ankF, ankL, ankZ);
    ctx.lineTo(pa[0], pa[1]);
    ctx.closePath();
    ctx.fill();
    // Wing-arm bones ride the leading edge, wrist to finger tips.
    ctx.strokeStyle = boneInk;
    ctx.lineWidth = Math.max(1.5, rt * s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(pw[0], pw[1]);
    const f0 = fingers[0]!;
    const pf0 = P(f0[0], f0[1], f0[2]);
    ctx.lineTo(pf0[0], pf0[1]);
    ctx.stroke();
    // The second finger rays off the wrist through the membrane.
    ctx.lineWidth = Math.max(1.1, rt * s * 0.045);
    ctx.beginPath();
    ctx.moveTo(pw[0], pw[1]);
    const f1 = fingers[1]!;
    const pf1 = P(f1[0], f1[1], f1[2]);
    ctx.lineTo(pf1[0], pf1[1]);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };

  const drawBody = (): void => {
    // Round tuft hull on the pitched axis — the hover hangs it
    // near-vertical, travel lays it into the flight line.
    const pC = P(0, 0, 0);
    ctx.fillStyle = body;
    ctx.beginPath();
    facetBlob(ctx, pC[0], pC[1], rt * 0.42 * s, o.seed, 8, 1.1);
    ctx.fill();
    // Pale belly tuft toward the vent.
    const pB = P(-pf.aF * rt * 0.16, 0, -pf.aZ * rt * 0.16);
    ctx.fillStyle = o.hurt ? '#ffffff' : shade(o.color, 12);
    ctx.beginPath();
    facetBlob(ctx, pB[0], pB[1], rt * 0.2 * s, o.seed ^ 0x33, 6, 0.8);
    ctx.fill();
  };

  const drawHead = (): void => {
    const hA = rt * 0.34;
    const hD = rt * 0.3;
    const hp = P(pf.aF * hA + pf.dF * hD, 0, pf.aZ * hA + pf.dZ * hD);
    const hr = rt * 0.3 * s;
    // Tall ragged dish ears split fore/aft at profile — the
    // paired-gear stagger law.
    for (const es of [-1, 1]) {
      const ex = hp[0] + es * px * hr * 0.7 + fx * es * hr * 0.14;
      const ey = hp[1] + (es * py * hr * 0.7 + fy * es * hr * 0.14) * ys - hr * 0.5;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.24, ey);
      ctx.lineTo(ex, ey - hr * 1.05);
      ctx.lineTo(ex + hr * 0.24, ey);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    facetCircle(ctx, hp[0], hp[1], hr, 6, o.dir + Math.PI / 6);
    ctx.fill();
    if (fy > -0.45 && !o.hurt) {
      ctx.fillStyle = '#e2a63c';
      for (const es of [-1, 1]) {
        const eex = hp[0] + fx * hr * 0.35 + es * px * hr * 0.34;
        const eey = hp[1] + (fy * hr * 0.35 + es * py * hr * 0.34) * ys;
        ctx.fillRect(eex - hr * 0.09, eey - hr * 0.09, hr * 0.18, hr * 0.18);
      }
      if (at > 0.4) {
        ctx.fillStyle = '#efe9d8';
        for (const es of [-1, 1]) {
          ctx.fillRect(hp[0] + es * hr * 0.18 - hr * 0.05, hp[1] + hr * 0.5, hr * 0.1, hr * 0.26);
        }
      }
    }
  };

  const farEs = py < 0 ? 1 : py > 0 ? -1 : 1;
  if (fy >= -0.15) {
    drawWing(farEs);
    drawBody();
    drawWing(-farEs);
    drawHead();
  } else {
    drawHead();
    drawWing(farEs);
    drawBody();
    drawWing(-farEs);
  }
}

/**
 * A deterministic staged frame for pinned contexts — studio cards,
 * portraits, tests. Runs a throwaway rig through fixed 60Hz steps at
 * a held travel dial, so the same arguments always paint the same
 * bird, and what they paint is exactly what the live rig settles to
 * (THE ONE REST, extended to the whole carriage).
 */
export function stagedFlight(
  spec: FlierSpec,
  o: { seed: number; moveK: number; attackT?: number; air?: number; steps?: number },
): FlightFrame {
  const rig = new FlightRig(spec, o.seed);
  const steps = Math.max(2, o.steps ?? 150);
  let frame!: FlightFrame;
  for (let i = 0; i < steps; i++) {
    frame = rig.update({
      x: o.moveK * i * (1 / 60) * 3,
      y: 0,
      dir: 0,
      moveK: o.moveK,
      dt: 1 / 60,
      attackT: i === steps - 1 ? o.attackT : 0,
      air: o.air,
    });
  }
  return frame;
}

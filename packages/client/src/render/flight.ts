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

/**
 * The giant bat: the orchard-shadow soarer — a flying fox's build.
 * Long slow strokes on a broad sail, but still a MEMBRANE: it never
 * earns the feathered glide, its languor lives in the tempo alone.
 */
export const GIANT_BAT_FLIER: FlierSpec = {
  hover: 1.05,
  beatHz: 1.7,
  hoverBeatK: 0.75,
  glides: false,
  stations: 5,
  tone: 0.6,
  uprightA: 0.78,
  tail: 0,
  stern: 0,
};

/**
 * The dire bat: the ragged hunter. Heavy hammering strokes — quicker
 * than the giant, far heavier than the cave flutter — on the loosest
 * sail in the sky (the torn trailing edge billows a beat behind), and
 * the deepest hover hunch: it hangs in the air like a threat.
 */
export const DIRE_BAT_FLIER: FlierSpec = {
  hover: 0.95,
  beatHz: 2.3,
  hoverBeatK: 0.78,
  glides: false,
  stations: 5,
  tone: 0.48,
  uprightA: 0.62,
  tail: 0,
  stern: 0,
};

/** The rig ledger by def id — the renderer's one lookup. */
export function flierSpec(defId: string): FlierSpec {
  if (defId === 'elder_great_owl') return ELDER_OWL_FLIER;
  if (defId === 'cave_bat') return BAT_FLIER;
  if (defId === 'giant_bat') return GIANT_BAT_FLIER;
  if (defId === 'dire_bat') return DIRE_BAT_FLIER;
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
    /** World facing + lateral basis and the camera's y-squash — the
     *  surface-normal test needs the true 3D frame. */
    fx: number;
    fy: number;
    px: number;
    py: number;
    ysK: number;
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
  // WHICH FACE SHOWS IS THE SURFACE'S OWN 3D NORMAL — the one robust
  // answer (user verdict: the projected-winding shortcut lied at the
  // back bands, because the outline is NON-planar — swept fingers and
  // drooped secondaries can hold a winding the flat surface lost).
  // The wing's MAIN PLANE is spanned by the arm (shoulder→wrist) and
  // the chord (leading mid → trailing mid); its normal, carried to
  // world axes and dotted with the camera's true view ray (0, 1, ys),
  // says which face the camera sees — flipping through zero exactly
  // at the invisible edge-on instant. Hand-proven at the four poles:
  // hover-S pale underwings, hover-N dark mantle, cruise-S underwings
  // (a bird flying at you), cruise-N mantle (flying away).
  const aF = wrF - shF;
  const aL2 = wrL - shL;
  const aZ = wrZ - shZ;
  const cF = midF - (shF + wrF) / 2;
  const cL = midL - (shL + wrL) / 2;
  const cZ = midZ - (shZ + wrZ) / 2;
  const nF = aL2 * cZ - aZ * cL;
  const nL = aZ * cF - aF * cZ;
  const nZ = aF * cL - aL2 * cF;
  const nwy = nF * o.fy + nL * o.py;
  const topDot = es * (nwy + nZ * o.ysK);
  const underVis = topDot < 0;
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
    // THE TAIL GROWS FROM THE BODY: the stem's root is BURIED inside
    // the hull — an anchor point deep under the body mass, prepended
    // to the chain — because the hull blob's jittered stern facet can
    // retreat inside the nominal pole and open a notch behind any
    // stem that merely touches it (the user's detached-shape verdict,
    // silhouette-proven). From that buried root the stem is a
    // FEATHERED CONE in the hull's own coat: stern-wide where it
    // leaves the body, tapering smoothly into the fan's neck, and
    // overlapping the fan's base by a full node — one grown mass,
    // interlayered the way this style wants, never three shapes in a
    // queue. Widths in tiles, perp per sample, one closed fill.
    const midIdx = Math.max(1, pts.length - 3);
    const buried = P(ventF * 0.4, 0, ventZ * 0.4);
    const stem: Array<[number, number]> = [
      buried,
      ...pts.slice(0, Math.min(pts.length, midIdx + 2)),
    ];
    if (stem.length >= 2) {
      // Streamlined: the stem leaves at HALF the hull's half-width and
      // slips to a slim neck — an extension of the body, never a bag
      // over the rump (the user's slipped-bag verdict).
      const neckW = 0.045;
      const rootW = look.bodyW * 0.5;
      const wAt = (t: number): number =>
        s * (rootW * Math.pow(1 - t, 1.15) + neckW);
      ctx.fillStyle = coat;
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
      fx,
      fy,
      px,
      py,
      ysK: ys,
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
      // The pale keel: the under-half of the hull in breast tone.
      // Visibility is GEOMETRY — facing times pitch: the hover's
      // upright chest shows the whole barred bib WHEN it faces the
      // camera, and the term dies to zero facing away (the bib was
      // painting straight onto the away-facing hull at the north
      // bands: the user's inside-out verdict).
      const keelK = clamp(0.5 + fy * (0.7 + 0.5 * Math.sin(Math.max(0, fr.pitchA))), 0, 1);
      if (keelK > 0.05) {
        ctx.globalAlpha = keelK;
        ctx.fillStyle = shade(look.breast, -3);
        ctx.fillRect(-half * 1.4, look.bodyW * 0.12 * s * fr.pitchK - half * 0.5 * (1 - fr.pitchK), half * 2.8, half * 2.4);
        ctx.globalAlpha = 1;
        // Barred keel rows when the chest truly meets the camera.
        if (keelK > 0.55 && fy > -0.05) {
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

// ---------------------------------------------------------- the bats

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
export const CAVE_BAT_LOOK: BatLook = {
  coat: '#4a3d55',
  chest: '#766585',
  sail: '#382e46',
  sailUnder: '#5c5270',
  bone: '#2a2236',
  earSkin: '#8a6274',
  eye: '#e2a63c',
  fang: '#efe9d8',
  nose: '#2e2638',
  bodyR: 0.26,
  bodyW: 0.2,
  headR: 0.16,
  muzzle: 0.045,
  earLen: 0.23,
  earW: 0.075,
  earBack: 0.12,
  wingSpan: 1.15,
  fingers: 3,
  scallop: 0.5,
  ragged: 0,
  thumbClaw: 0,
  ruff: 0,
  hunch: 0,
  tailSail: 0.1,
  fangLen: 0.2,
  eyeR: 0.16,
  fangBare: false,
  variant: 'cave',
};

/**
 * The orchard-shadow soarer — a flying fox, drawn from life and then
 * sized for menace: a long fox muzzle where the cave bat wears a
 * snub, SMALL ears (the fruit-eater's face, unmistakable beside the
 * hunter's dishes), a maned russet ruff over the shoulders, and one
 * broad shallow-scalloped sail per side. It carries NO tail membrane
 * — the flying fox's honest silhouette.
 */
export const GIANT_BAT_LOOK: BatLook = {
  coat: '#7a5638',
  chest: '#a47c50',
  sail: '#42302a',
  sailUnder: '#6c5648',
  bone: '#291d1a',
  earSkin: '#5c4034',
  eye: '#d89a3c',
  fang: '#efe9d8',
  nose: '#2a1e1c',
  bodyR: 0.5,
  bodyW: 0.3,
  headR: 0.24,
  muzzle: 0.15,
  earLen: 0.15,
  earW: 0.055,
  earBack: 0.32,
  wingSpan: 2.05,
  fingers: 4,
  scallop: 0.3,
  ragged: 0,
  thumbClaw: 0.08,
  ruff: 0.7,
  hunch: 0,
  tailSail: 0,
  fangLen: 0.22,
  eyeR: 0.13,
  fangBare: false,
  variant: 'giant',
};

/**
 * The ragged hunter — gaunt where the giant is heavy: a lean hunched
 * hull under a dorsal hump, horn-swept ears, blood-lamp eyes, fangs
 * BARED AT REST, wrist thumb-hooks riding the leading edge, and the
 * deepest, torn trailing edge in the sky — every scallop ripped into
 * seeded sub-notches, a sail that has been through other creatures.
 */
export const DIRE_BAT_LOOK: BatLook = {
  coat: '#3c3742',
  chest: '#5e5866',
  sail: '#2b2530',
  sailUnder: '#4e4656',
  bone: '#191521',
  earSkin: '#6e4650',
  eye: '#d84040',
  fang: '#f2ead6',
  nose: '#201a24',
  bodyR: 0.44,
  bodyW: 0.24,
  headR: 0.21,
  muzzle: 0.12,
  earLen: 0.3,
  earW: 0.07,
  earBack: 0.72,
  wingSpan: 2.4,
  fingers: 5,
  scallop: 0.85,
  ragged: 1,
  thumbClaw: 0.13,
  ruff: 0.2,
  hunch: 0.55,
  tailSail: 0.15,
  fangLen: 0.38,
  eyeR: 0.15,
  fangBare: true,
  variant: 'dire',
};

/**
 * THE COLONY SORTS INTO ROOSTS — seeded skin clusters per design (the
 * coat-cluster law, membraned): each variant rolls one of four curated
 * colorways plus a shade jitter, so a cave full of bats reads as kin
 * groups, never rubber stamps. Modular bits ride the same hash: a
 * torn ear here, a mottled coat there — small survivals, not costumes.
 */
type BatSkin = Pick<BatLook, 'coat' | 'chest' | 'sail' | 'sailUnder' | 'earSkin' | 'eye'>;

const CAVE_BAT_SKINS: readonly BatSkin[] = [
  // dusk violet — the shipped def color
  { coat: '#4a3d55', chest: '#766585', sail: '#382e46', sailUnder: '#5c5270', earSkin: '#8a6274', eye: '#e2a63c' },
  // ash brown — the barn-eave roost
  { coat: '#57493e', chest: '#837260', sail: '#40352c', sailUnder: '#635649', earSkin: '#8a6a58', eye: '#e0b04a' },
  // slate — the cave-mouth grey
  { coat: '#46505e', chest: '#74808c', sail: '#333c48', sailUnder: '#586472', earSkin: '#74606e', eye: '#d8c452' },
  // moss dun — the hollow-tree sleeper
  { coat: '#4e4f3d', chest: '#7d7c62', sail: '#3a3b2c', sailUnder: '#5d5e48', earSkin: '#7e6a58', eye: '#e8a838' },
];

const GIANT_BAT_SKINS: readonly BatSkin[] = [
  // russet — the authored design
  { coat: '#7a5638', chest: '#a47c50', sail: '#42302a', sailUnder: '#6c5648', earSkin: '#5c4034', eye: '#d89a3c' },
  // tawny gold — the sunset-orchard coat
  { coat: '#8a6c40', chest: '#b49262', sail: '#4a3a2a', sailUnder: '#75604a', earSkin: '#66503c', eye: '#e0aa48' },
  // dark chocolate — the deep-grove elder tone
  { coat: '#5e4432', chest: '#8a6a4c', sail: '#362824', sailUnder: '#5a4840', earSkin: '#4e3830', eye: '#cc9040' },
  // silver-frosted — the old one the pickers name
  { coat: '#6e6154', chest: '#9c9080', sail: '#3e3630', sailUnder: '#645a50', earSkin: '#5a4c44', eye: '#d8b45c' },
];

const DIRE_BAT_SKINS: readonly BatSkin[] = [
  // barrow ash — the authored design
  { coat: '#3c3742', chest: '#5e5866', sail: '#2b2530', sailUnder: '#4e4656', earSkin: '#6e4650', eye: '#d84040' },
  // blood-dark — old stains that never washed out
  { coat: '#442e34', chest: '#6a4a50', sail: '#301f24', sailUnder: '#54393e', earSkin: '#7a4650', eye: '#e05038' },
  // tar black — the lampless deep
  { coat: '#302c34', chest: '#504a56', sail: '#221e28', sailUnder: '#443c4a', earSkin: '#5c3e4c', eye: '#cc3c50' },
  // bone-pale — the one the miners saw and swore off the shaft
  { coat: '#6a6258', chest: '#948a7c', sail: '#3c3730', sailUnder: '#5e574e', earSkin: '#7c5a54', eye: '#c83232' },
];

const BAT_LOOK_CACHE = new Map<string, BatLook>();

/**
 * Variant lookup with the cave bat as the unknown-id fallback. The
 * seed (spawn eid) is hashed first — roost-mates spawn with
 * CONSECUTIVE eids, and raw bits would dress a whole cave in one coat
 * — then rolls the skin cluster, a shade jitter, and the modular
 * bits. Cached; runs per body per frame.
 */
export function batLook(defId: string, seed = 0): BatLook {
  const base =
    defId === 'giant_bat' ? GIANT_BAT_LOOK : defId === 'dire_bat' ? DIRE_BAT_LOOK : CAVE_BAT_LOOK;
  const key = `${defId}|${seed & 0xff}`;
  const hit = BAT_LOOK_CACHE.get(key);
  if (hit) return hit;
  const skins =
    base.variant === 'giant' ? GIANT_BAT_SKINS : base.variant === 'dire' ? DIRE_BAT_SKINS : CAVE_BAT_SKINS;
  const h = (seed * 2654435761) | 0;
  const cl = skins[(h >>> 8) & 3]!;
  const jit = (((h >>> 12) & 7) - 3) * 2;
  const look: BatLook = {
    ...base,
    coat: shade(cl.coat, jit),
    chest: cl.chest,
    sail: shade(cl.sail, jit),
    sailUnder: cl.sailUnder,
    earSkin: cl.earSkin,
    eye: cl.eye,
    earNotch: ((h >>> 16) & 7) === 0,
    mottle: ((h >>> 19) & 3) === 0,
    seed,
  };
  BAT_LOOK_CACHE.set(key, look);
  return look;
}

/** A body-space point: (F fwd, L lateral, Z up) in tiles. */
type V3 = [number, number, number];

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
export function drawBat(
  ctx: CanvasRenderingContext2D,
  look: BatLook,
  o: {
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
  const seed = o.seed;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const pf = pitchFrame(fr.pitchA, 0.45);
  const coat = C(shade(look.coat, (((seed >>> 4) & 7) - 3) * 2));
  const boneInk = C(look.bone);

  // Altitude and lunge come from the rig alone (one owner).
  const lift = fr.lift * s;
  const bcx = o.x + fx * (fr.lungeF * 0.85 + fr.driftF) * s + px * fr.driftL * s;
  const bcy = o.y + (fy * (fr.lungeF * 0.85 + fr.driftF) + py * fr.driftL) * ys * s - lift;
  // THE GIMBAL: the bank rolls the projected body; the head, painted
  // last and level, holds the horizon like every flier here.
  const roll = fr.bank * fr.pitchK * 0.55;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const P: Projector = (F, L, Z) => {
    const wx = (fx * F + px * L) * s;
    const wy = (fy * F + py * L) * ys * s - Z * s;
    return [bcx + wx * cosR - wy * sinR, bcy + wx * sinR + wy * cosR];
  };

  // THE HULL IS A PITCHED SOLID — nose and vent poles on the one
  // axis, hover-stretched so the upright tread never collapses to a
  // dot under the head (the style-compressed pitch, membraned).
  const hullStretch = 1 + 0.18 * (1 - fr.pitchK);
  const noseA = look.bodyR * 0.8 * hullStretch;
  const ventA = look.bodyR * 1.0 * hullStretch;
  const noseF = pf.aF * noseA;
  const noseZ = pf.aZ * noseA;
  const ventF = -pf.aF * ventA;
  const ventZ = -pf.aZ * ventA;
  const screechK = at > 0.4 ? Math.min(1, (at - 0.4) / 0.25) : 0;

  const drawWing = (es: number): void => {
    const lag = es < 0 ? fr.port : fr.star;
    const tipVel = es < 0 ? fr.portTipVel : fr.starTipVel;
    const spread = Math.max(0.1, fr.spread);
    const span = look.wingSpan;
    const armL = span * 0.42 * spread;
    const handL = span * 0.62 * spread;
    // Shoulder on the pitched hull — dorsal and forward, so it rides
    // up the back as the body swings vertical.
    const shA = look.bodyR * 0.22;
    const shD = look.bodyW * 0.42;
    const shF = pf.aF * shA + pf.dF * shD;
    const shZ = pf.aZ * shA + pf.dZ * shD;
    const shL = es * look.bodyW * 0.62;
    // ROOT TUCK: the sail's inner anchor lives INSIDE the hull core —
    // no raise angle or bank can ever open daylight at the joint.
    const tuckF = pf.aF * 0.01 + pf.dF * 0.02;
    const tuckZ = pf.aZ * 0.01 + pf.dZ * 0.02;
    const tuckL = es * look.bodyW * 0.16;
    const rowF = 0.08 * spread + fr.swing;
    const wrF = shF + pf.wfF * rowF + pf.wuF * Math.sin(fr.raise) * armL;
    const wrZ = shZ + pf.wfZ * rowF + pf.wuZ * Math.sin(fr.raise) * armL;
    const wrL = shL + es * Math.cos(fr.raise) * armL;
    const flex = clamp(-tipVel * 0.09, -0.5, 0.5);
    // The fingers: each carries the membrane's outer edge, each rides
    // its own sim station — the sail billows a beat behind the bones.
    const N = look.fingers;
    const tips: V3[] = [];
    for (let k = 0; k < N; k++) {
      const u = N === 1 ? 1 : k / (N - 1);
      // THE WING IS THE ANIMAL: long fingers with a gentle taper —
      // the outermost still carries most of the reach, so the sail
      // reads LONG at every phase (the user's exaggeration verdict).
      const len = handL * (1 - 0.22 * u);
      const lagK = lag[Math.min(k, lag.length - 1)] ?? 0;
      // THE SAIL LOADS UP AT SPEED: the hover's deep finger droop
      // eases toward level as cruise takes over, and lift arches the
      // tips — real membrane physics, and the projection fix in one:
      // a full anhedral droop at cruise nearly cancels the back-sweep
      // under the camera's y-squash at the south bands, collapsing
      // the whole sail to a wire exactly where players see it most.
      const droop = (0.16 + 0.5 * u) * spread * 0.6 * (1 - 0.5 * fr.cruiseK);
      const tipRaise = fr.raiseHand - droop - lagK * 0.5;
      // A DEEP chord: the inner fingers rake far back, so the sail
      // carries real vertical body instead of a shallow sliver.
      const backW = (0.12 + 1.05 * u) * len * fr.sweepK;
      const rise =
        Math.sin(tipRaise) * len * 0.95 +
        flex * u * u * span * 0.3 +
        fr.cruiseK * u * u * span * 0.05;
      tips.push([
        wrF + pf.wfF * (0.05 * spread - backW) + pf.wuF * rise,
        wrL + es * Math.cos(tipRaise) * len,
        wrZ + pf.wfZ * (0.05 * spread - backW) + pf.wuZ * rise,
      ]);
    }
    // The ankle: where the sail docks the hull's flank, low and aft.
    const ankF = -pf.aF * look.bodyR * 0.55 - pf.dF * look.bodyW * 0.1;
    const ankZ = -pf.aZ * look.bodyR * 0.55 - pf.dZ * look.bodyW * 0.1;
    const ankL = es * look.bodyW * 0.4;
    // The trailing edge SCALLOPS between the fingers: each dip is the
    // membrane sagging on its station's simulated lag — leather
    // breathing a beat behind the bones — and the dire's edge is TORN:
    // each scallop ripped into seeded sub-notches built into the
    // outline itself, never decals.
    const pts3: V3[] = [[tuckF, tuckL, tuckZ], [shF, shL, shZ], [wrF, wrL, wrZ]];
    const dip = (a: V3, b: V3, t: number, pull: number): V3 => {
      const mx = a[0] * (1 - t) + b[0] * t;
      const ml = a[1] * (1 - t) + b[1] * t;
      const mz = a[2] * (1 - t) + b[2] * t;
      return [mx + (wrF - mx) * pull, ml + (wrL - ml) * pull, mz + (wrZ - mz) * pull];
    };
    for (let k = 0; k < N; k++) {
      pts3.push(tips[k]!);
      const nxt = k < N - 1 ? tips[k + 1]! : [ankF, ankL, ankZ] as V3;
      const lagK = lag[Math.min(k, lag.length - 1)] ?? 0;
      const sagK = 0.2 + clamp(lagK * 0.9, -0.25, 0.55);
      const closing = k === N - 1;
      // Scallops stay GENTLE: the trailing edge breathes, it never
      // saws — a spiked edge shrank the whole wing's read (the user's
      // spiky verdict). Depth caps well short of the wrist.
      const pull = Math.min(
        0.45,
        (closing ? 0.13 : 0.08) + (0.18 * look.scallop) * (0.75 + sagK),
      );
      if (look.ragged > 0.3) {
        const j1 = (((seed >>> (k * 3)) & 3) / 3) * 0.1 * look.ragged;
        const j2 = (((seed >>> (k * 3 + 5)) & 3) / 3) * 0.1 * look.ragged;
        pts3.push(dip(tips[k]!, nxt, 0.3, pull * (0.55 + j1)));
        pts3.push(dip(tips[k]!, nxt, 0.52, pull * (1.15 + j2)));
        pts3.push(dip(tips[k]!, nxt, 0.74, pull * 0.6));
      } else {
        pts3.push(dip(tips[k]!, nxt, 0.5, pull));
      }
    }
    pts3.push([ankF, ankL, ankZ]);
    const outline: Array<[number, number]> = pts3.map((v) => P(v[0], v[1], v[2]));
    // The slab gate measures the OUTER sail only — the tuck wedge at
    // the body always keeps area and would blind an edge-on gate.
    let area2 = 0;
    const outer = outline.slice(1);
    for (let k = 0; k < outer.length; k++) {
      const a = outer[k]!;
      const b = outer[(k + 1) % outer.length]!;
      area2 += a[0] * b[1] - b[0] * a[1];
    }
    const slabArea = Math.abs(area2) / 2;
    const slabK = Math.min(1, slabArea / (0.1 * span * span * s * s));
    // THE NORMAL LAW: which membrane face shows is the wing plane's
    // OWN 3D normal (arm × chord, world axes) dotted with the true
    // view ray (0, 1, ys) — flips through zero exactly at the
    // invisible edge-on instant, at every band, every beat phase.
    const aF = wrF - shF;
    const aL2 = wrL - shL;
    const aZ = wrZ - shZ;
    const trF = (tips[N - 1]![0] + ankF) / 2;
    const trL = (tips[N - 1]![1] + ankL) / 2;
    const trZ = (tips[N - 1]![2] + ankZ) / 2;
    const cF = trF - (shF + wrF) / 2;
    const cL = trL - (shL + wrL) / 2;
    const cZ = trZ - (shZ + wrZ) / 2;
    const nF = aL2 * cZ - aZ * cL;
    const nL = aZ * cF - aF * cZ;
    const nZ = aF * cL - aL2 * cF;
    const nwy = nF * fy + nL * py;
    const underVis = es * (nwy + nZ * ys) < 0;
    const base = o.hurt ? '#ffffff' : underVis ? look.sailUnder : look.sail;
    const detailA = slabK <= 0.22 ? 0 : Math.min(1, (slabK - 0.22) / 0.3);
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(outline[0]![0], outline[0]![1]);
    for (let k = 1; k < outline.length; k++) ctx.lineTo(outline[k]![0], outline[k]![1]);
    ctx.closePath();
    ctx.fill();
    // THE WING HAS THICKNESS: the edge-on sail keeps a leather-edge
    // mass along the leading bones — never a screen hairline.
    const p0 = outline[1]!;
    const pw = outline[2]!;
    if (slabK < 0.3) {
      const edgeW = s * span * 0.045 * (1 - slabK / 0.3);
      if (edgeW > 1) {
        ctx.strokeStyle = base;
        ctx.lineWidth = edgeW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(pw[0], pw[1]);
        const lead = tips[0]!;
        const pl = P(lead[0], lead[1], lead[2]);
        ctx.lineTo(pl[0], pl[1]);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
      }
    }
    // Detail ink fades with the slab (the wire verdict, kept): finger
    // bones raying wrist → tips, the arm bone, one plagiopatagium
    // crease, the furred forearm, and the wrist thumb-hook.
    if (detailA > 0.02) {
      const boneW = 0.35 + 0.65 * slabK;
      ctx.globalAlpha = detailA;
      ctx.strokeStyle = boneInk;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.4, s * span * 0.032 * boneW);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(pw[0], pw[1]);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * span * 0.016 * boneW);
      for (let k = 0; k < N; k++) {
        const t = tips[k]!;
        const pt = P(t[0], t[1], t[2]);
        ctx.beginPath();
        ctx.moveTo(pw[0], pw[1]);
        ctx.lineTo(pt[0], pt[1]);
        ctx.stroke();
      }
      // The membrane's body-fold crease, wrist toward the ankle.
      ctx.globalAlpha = detailA * 0.45;
      ctx.strokeStyle = shade(base, -9);
      ctx.lineWidth = Math.max(1, s * span * 0.012);
      const cr = P(
        wrF * 0.45 + ankF * 0.55,
        wrL * 0.45 + ankL * 0.55,
        wrZ * 0.45 + ankZ * 0.55,
      );
      ctx.beginPath();
      ctx.moveTo(pw[0], pw[1]);
      ctx.lineTo(cr[0], cr[1]);
      ctx.stroke();
      // The furred forearm: coat washing out over the arm's root half.
      ctx.globalAlpha = detailA * (0.5 + 0.4 * look.ruff);
      ctx.strokeStyle = coat;
      ctx.lineWidth = Math.max(1.5, s * look.bodyW * 0.5);
      const fm = P(
        shF * 0.45 + wrF * 0.55,
        shL * 0.45 + wrL * 0.55,
        shZ * 0.45 + wrZ * 0.55,
      );
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(fm[0], fm[1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // THE THUMB-HOOK: the wrist's climbing claw, ivory, curling
      // forward-down off the leading edge — the dire's is a weapon.
      if (look.thumbClaw > 0 && slabK > 0.12) {
        const tc = look.thumbClaw;
        const c1: V3 = [
          wrF + pf.wfF * tc * 0.8 + pf.wuF * tc * 0.5,
          wrL + es * tc * 0.15,
          wrZ + pf.wfZ * tc * 0.8 + pf.wuZ * tc * 0.5,
        ];
        const c2: V3 = [
          c1[0] + pf.wfF * tc * 0.35 - pf.wuF * tc * 0.5,
          c1[1] + es * tc * 0.1,
          c1[2] + pf.wfZ * tc * 0.35 - pf.wuZ * tc * 0.5,
        ];
        const q1 = P(c1[0], c1[1], c1[2]);
        const q2 = P(c2[0], c2[1], c2[2]);
        ctx.globalAlpha = detailA;
        ctx.strokeStyle = C(look.fang);
        ctx.lineWidth = Math.max(1.3, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(pw[0], pw[1]);
        ctx.lineTo(q1[0], q1[1]);
        ctx.lineTo(q2[0], q2[1]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineCap = 'butt';
    }
    // THE SCAPULAR: a fur mass over the wing root seating the sail
    // INTO the hull silhouette — the no-gap law's second half. And NO
    // wind lines on any model, ever — air belongs to the particles.
    if (!o.hurt) {
      const sc = P(
        shF * 0.55 + tuckF * 0.45,
        shL * 0.7 + tuckL * 0.3,
        shZ * 0.55 + tuckZ * 0.45,
      );
      ctx.fillStyle = shade(coat, -4);
      ctx.beginPath();
      facetCircle(ctx, sc[0], sc[1], look.bodyW * s * 0.32, 7, es * 0.7, 0.72);
      ctx.fill();
    }
  };

  const drawTailSail = (): void => {
    // The uropatagium — the tail membrane stretched behind the vent.
    // The cave bat carries a small clean one, the dire a ragged one,
    // and the giant NONE (the flying fox's honest silhouette).
    if (look.tailSail <= 0) return;
    const rootL = look.bodyW * 0.5;
    const reach = look.tailSail * 1.7;
    const a = P(ventF * 0.7, -rootL, ventZ * 0.7);
    const b = P(ventF * 0.7, rootL, ventZ * 0.7);
    const tF = ventF - pf.aF * reach;
    const tZ = ventZ - pf.aZ * reach - 0.03;
    ctx.fillStyle = C(look.sail);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    if (look.ragged > 0.3) {
      // The torn fan: a notched V instead of one point.
      const t1 = P(tF + pf.aF * reach * 0.25, -rootL * 0.4, tZ + pf.aZ * reach * 0.25);
      const t2 = P(tF, 0, tZ + 0.02);
      const t3 = P(tF + pf.aF * reach * 0.3, rootL * 0.45, tZ + pf.aZ * reach * 0.3);
      ctx.lineTo(t1[0], t1[1]);
      ctx.lineTo(t2[0], t2[1]);
      ctx.lineTo(t3[0], t3[1]);
    } else {
      const t2 = P(tF, 0, tZ);
      ctx.lineTo(t2[0], t2[1]);
    }
    ctx.lineTo(b[0], b[1]);
    ctx.closePath();
    ctx.fill();
  };

  const drawBody = (): void => {
    // THE CHEST RIDES THE PITCH: one streamlined mass between the
    // pitched poles — an upright keg treading the hover, a level
    // dart at cruise, foreshortened by the projection itself. The
    // old billboard blob never rotated; this is the root fix.
    const pN = P(noseF, 0, noseZ);
    const pV = P(ventF, 0, ventZ);
    // The dire's hunch: a dorsal hump over the shoulders, painted
    // first in the same coat so the silhouette grows one mass.
    if (look.hunch > 0 && !o.hurt) {
      const hb = P(
        pf.aF * look.bodyR * 0.12 + pf.dF * look.bodyW * (0.55 + 0.35 * look.hunch),
        0,
        pf.aZ * look.bodyR * 0.12 + pf.dZ * look.bodyW * (0.55 + 0.35 * look.hunch),
      );
      ctx.fillStyle = coat;
      ctx.beginPath();
      facetCircle(ctx, hb[0], hb[1], look.bodyW * s * (0.45 + 0.25 * look.hunch), 7, seed * 0.4, 0.8);
      ctx.fill();
    }
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
    facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.05 * s) / half, 0.35);
    ctx.fill();
    if (!o.hurt) {
      ctx.beginPath();
      facetBlob(ctx, 0, 0, half, seed | 1, 9, (look.bodyW * 1.05 * s) / half, 0.35);
      ctx.clip();
      ctx.rotate(-ax);
      // The pale chest tuft is GEOMETRY — facing × pitch, the same
      // gate the owl's keel rides: full on a camera-facing hover
      // chest, dead zero on an away-facing back (the inside-out law).
      const keelK = clamp(0.5 + fy * (0.7 + 0.5 * Math.sin(Math.max(0, fr.pitchA))), 0, 1);
      if (keelK > 0.05) {
        ctx.globalAlpha = keelK;
        ctx.fillStyle = C(look.chest);
        ctx.fillRect(
          -half * 1.4,
          look.bodyW * 0.1 * s * fr.pitchK - half * 0.5 * (1 - fr.pitchK),
          half * 2.8,
          half * 2.4,
        );
        ctx.globalAlpha = 1;
      }
      // Seeded mottle patches — the modular coat wear.
      if (look.mottle) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = shade(look.coat, -8);
        for (let k = 0; k < 2; k++) {
          const ox = ((((seed >>> (7 + k * 4)) & 7) / 7) - 0.5) * half * 1.1;
          const oy = ((((seed >>> (9 + k * 4)) & 7) / 7) - 0.3) * half * 0.8;
          ctx.beginPath();
          facetCircle(ctx, ox, oy, half * 0.22, 6, seed * 0.3 + k, 0.8);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // The sunlit top rim — the camera always reads the back plane.
      ctx.fillStyle = 'rgba(255, 244, 220, 0.11)';
      ctx.rotate(ax);
      ctx.fillRect(-half, -look.bodyW * 1.05 * s, half * 2, look.bodyW * 0.3 * s);
    }
    ctx.restore();
    // The giant's ruff: a maned collar cinched at the neck seam, a
    // shade warmer than the coat, with fur ticks combing aft.
    if (look.ruff > 0 && !o.hurt) {
      const nk = P(noseF * 0.62, 0, noseZ * 0.62);
      ctx.fillStyle = shade(look.coat, 9);
      ctx.beginPath();
      facetCircle(ctx, nk[0], nk[1], look.bodyW * s * (0.6 + 0.35 * look.ruff), 8, seed * 0.2, 0.82);
      ctx.fill();
      ctx.strokeStyle = shade(look.coat, -6);
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.lineCap = 'round';
      const rr = look.bodyW * s * (0.6 + 0.35 * look.ruff);
      for (let k = 0; k < 4; k++) {
        const aT = Math.PI * (0.25 + 0.17 * k);
        ctx.beginPath();
        ctx.moveTo(nk[0] + Math.cos(aT) * rr * 0.55, nk[1] + Math.sin(aT) * rr * 0.55);
        ctx.lineTo(nk[0] + Math.cos(aT) * rr * 0.95, nk[1] + Math.sin(aT) * rr * 0.95);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  };

  const drawFoot = (es: number): void => {
    // Hook feet — the giant and the dire only; the cave bat keeps its
    // minimal read. THE SHANK LAW: the reach is the body's lunge, the
    // weapon is the hook — the shank never crosses a tenth of a tile.
    if (look.variant === 'cave') return;
    const talonK = fr.talonK;
    if (talonK < 0.15 && at === 0) return;
    const striking = at >= 0.7;
    const shankInk = C(shade(look.coat, -18));
    const clawInk = C(shade(look.coat, -45));
    const hipA = -look.bodyR * 0.35;
    const hipD = -(look.bodyW * 0.5);
    const hipF = pf.aF * hipA + pf.dF * hipD;
    const hipZ = pf.aZ * hipA + pf.dZ * hipD;
    const hipL = es * look.bodyW * 0.34;
    const footF = hipF + (striking ? 0.09 : 0.04) * talonK;
    const footZ = hipZ - (striking ? 0.06 : 0.04) * talonK - 0.02;
    ctx.lineCap = 'round';
    const a = P(hipF, hipL, hipZ);
    const b = P(footF, hipL * 1.1, footZ);
    ctx.strokeStyle = shankInk;
    ctx.lineWidth = Math.max(1.6, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    if (talonK > 0.25) {
      ctx.strokeStyle = clawInk;
      ctx.lineWidth = Math.max(1.2, s * 0.024);
      for (const ta of [-1, 1]) {
        const c = P(
          footF + (striking ? 0.1 : 0.03) * talonK + ta * 0.02,
          hipL * 1.1 + es * ta * 0.04 * talonK,
          footZ - (striking ? 0.07 : 0.04) * talonK,
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
    // THE FACE IS A TURNED SURFACE — every feature an (azimuth,
    // height) station on the skull sphere through ONE projector:
    // x slides on the ring's cosine, y takes only the small depth bow
    // plus the feature's height, width foreshortens PURE-HORIZONTALLY
    // (this camera never rolls), so nothing pops at any of 360°.
    const seatA = noseA + look.headR * 0.55;
    const seatD = look.headR * (0.2 + 0.3 * fr.pitchK);
    const hp = P(pf.aF * seatA + pf.dF * seatD, 0, pf.aZ * seatA + pf.dZ * seatD);
    // The echolocation scan: a small quick gaze jitter in the hover;
    // the strike locks dead ahead.
    const gazeAmp = 0.12 * fr.hoverK;
    const hdir =
      o.dir + (at > 0 ? 0 : (o.nowMs > 0 ? Math.sin(o.nowMs * 0.0011 + seed * 1.3) : 0) * gazeAmp);
    const hfx = Math.cos(hdir);
    const hfy = Math.sin(hdir);
    const hr = look.headR * s;
    const hAng = Math.atan2(hfy, hfx);
    const SRX = hr * 0.88;
    const SRY = hr * 0.34;
    const proj = (a: number, dz: number, rK = 1): [number, number] => [
      hp[0] + Math.cos(a) * SRX * rK,
      hp[1] + Math.sin(a) * SRY * ys * rK + dz,
    ];
    const fore = (a: number): number => Math.sin(a);
    const wOf = (a: number): number => Math.pow(Math.max(0, fore(a)), 0.45);
    // The muzzle's size-fade: full face-on, gone past the shoulder.
    const mzK = clamp((fore(hAng) + 0.32) / 0.4, 0, 1);
    const earBackK = Math.min(1, look.earBack + 0.35 * screechK);
    const earL = look.earLen * s;

    const drawEar = (es2: number): void => {
      const aE = hAng + es2 * 0.6;
      const bp = proj(aE, -hr * 0.45);
      // The ear keeps a width floor — from behind you see ear BACKS,
      // the bat's honest silhouette from every side.
      const bw = look.earW * s * (0.4 + 0.6 * Math.max(wOf(aE), 0.2));
      const sweep = earBackK * earL;
      const tipX = bp[0] - hfx * sweep * 0.7 + Math.cos(aE) * hr * 0.28;
      const tipY = bp[1] - hfy * ys * sweep * 0.7 - earL * (1 - 0.35 * earBackK);
      const notched = look.earNotch && es2 > 0;
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.moveTo(bp[0] - bw, bp[1]);
      ctx.lineTo(tipX, tipY);
      if (notched) {
        // One torn bite out of the trailing edge — a survival.
        ctx.lineTo(
          bp[0] + bw * 0.55 + (tipX - bp[0]) * 0.45,
          bp[1] + (tipY - bp[1]) * 0.45,
        );
        ctx.lineTo(bp[0] + bw * 0.3 + (tipX - bp[0]) * 0.32, bp[1] + (tipY - bp[1]) * 0.28);
      }
      ctx.lineTo(bp[0] + bw, bp[1]);
      ctx.closePath();
      ctx.fill();
      // The dish lining shows only while the dish faces the camera —
      // a smooth gate on the station's own facing, never a pop.
      const inA = clamp((fore(aE) - 0.08) / 0.3, 0, 1);
      if (inA > 0.02 && !o.hurt) {
        ctx.globalAlpha = inA;
        ctx.fillStyle = look.earSkin;
        ctx.beginPath();
        ctx.moveTo(bp[0] - bw * 0.5, bp[1] - hr * 0.04);
        ctx.lineTo(bp[0] + (tipX - bp[0]) * 0.55, bp[1] + (tipY - bp[1]) * 0.55);
        ctx.lineTo(bp[0] + bw * 0.5, bp[1] - hr * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    // Far ear first — the pair z-splits around the skull by facing.
    const earOrder = fore(hAng + 0.6) < fore(hAng - 0.6) ? [1, -1] : [-1, 1];
    drawEar(earOrder[0]!);
    // The skull.
    ctx.fillStyle = coat;
    ctx.beginPath();
    facetCircle(ctx, hp[0], hp[1], hr, 7, hAng * 0.3 + seed * 0.2, 0.92);
    ctx.fill();
    // The muzzle: a wedge from the cheek stations to the protruding
    // nose tip — the fox dial. It fades by SIZE as the head turns
    // away (the owl-beak law): never a gate, never a pop.
    if (mzK > 0.03 && !o.hurt) {
      const mzR = 1 + (look.muzzle / look.headR) * 1.05 * mzK;
      const ckL = proj(hAng - 0.34, hr * 0.2);
      const ckR = proj(hAng + 0.34, hr * 0.2);
      const nt = proj(hAng, hr * 0.24, mzR);
      ctx.fillStyle = shade(coat, -5);
      ctx.beginPath();
      ctx.moveTo(ckL[0], ckL[1]);
      ctx.lineTo(nt[0], nt[1]);
      ctx.lineTo(ckR[0], ckR[1]);
      ctx.closePath();
      ctx.fill();
      // The nose pad; the cave bat wears its little nose-leaf above.
      ctx.fillStyle = look.nose;
      ctx.beginPath();
      facetCircle(ctx, nt[0], nt[1], hr * 0.11 * (0.4 + 0.6 * mzK), 5, hAng, 0.85);
      ctx.fill();
      if (look.variant === 'cave') {
        ctx.fillStyle = look.earSkin;
        ctx.beginPath();
        ctx.moveTo(nt[0] - hr * 0.07 * mzK, nt[1] - hr * 0.06);
        ctx.lineTo(nt[0], nt[1] - hr * 0.22 * mzK);
        ctx.lineTo(nt[0] + hr * 0.07 * mzK, nt[1] - hr * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // The gape and the fangs hang off the muzzle's underrim.
      const fangK = Math.max(look.fangBare ? 0.65 + 0.35 * screechK : 0, screechK);
      if (fangK > 0.05) {
        if (screechK > 0.1) {
          const gp = proj(hAng, hr * 0.42, 0.88);
          ctx.fillStyle = '#2a1620';
          ctx.beginPath();
          ctx.ellipse(
            gp[0],
            gp[1],
            Math.max(0.5, hr * 0.28 * (0.3 + 0.7 * wOf(hAng))),
            hr * 0.2 * screechK,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = C(look.fang);
        for (const es2 of [-1, 1]) {
          const aFg = hAng + es2 * 0.14;
          const tp = proj(aFg, hr * 0.32, 0.96 + (look.muzzle / look.headR) * 0.55 * mzK);
          const fw = hr * 0.085 * (0.45 + 0.55 * wOf(aFg));
          const fl = hr * look.fangLen * fangK * (0.4 + 0.6 * mzK);
          if (fw > 0.3 && fl > 0.5) {
            ctx.beginPath();
            ctx.moveTo(tp[0] - fw, tp[1]);
            ctx.lineTo(tp[0], tp[1] + fl);
            ctx.lineTo(tp[0] + fw, tp[1]);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
    // THE QUIET LAMPS: each eye a station at its own azimuth — a dark
    // socket, the lamp, one glint — sliding around the sphere and
    // slimming by pure horizontal width to zero at its own horizon.
    if (!o.hurt) {
      for (const es2 of [-1, 1]) {
        const aEye = hAng + es2 * 0.36;
        const ep = proj(aEye, -hr * 0.06);
        const er = hr * look.eyeR;
        const rw = er * wOf(aEye);
        if (rw < 0.35) continue;
        ctx.fillStyle = shade(look.coat, -16);
        ctx.beginPath();
        ctx.ellipse(ep[0], ep[1], rw * 1.3, er * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = look.eye;
        ctx.beginPath();
        ctx.ellipse(ep[0], ep[1], rw, er, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.ellipse(ep[0] - rw * 0.25, ep[1] - er * 0.3, rw * 0.28, er * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawEar(earOrder[1]!);
  };

  // Assembly — painter's order from the facing, the owl's proven
  // ledger: far wing and far foot behind the hull, near foot and near
  // wing over it; with the back to the camera the head leads and the
  // tail sail tucks behind the body mass.
  const farEs = py < 0 ? 1 : py > 0 ? -1 : 1;
  if (fy >= -0.15) {
    drawTailSail();
    drawWing(farEs);
    drawFoot(farEs);
    drawBody();
    drawFoot(-farEs);
    drawWing(-farEs);
    drawHead();
  } else {
    drawHead();
    drawWing(farEs);
    drawFoot(farEs);
    drawFoot(-farEs);
    drawBody();
    drawTailSail();
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

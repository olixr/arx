import { shade } from './rig.js';

/* ======================= THE SHIELD IS A PLANE =======================
 *
 * A shield is not a prop bolted to a forearm. It is a standing PLANE
 * in the world — upright, its face turned toward whatever the bearer
 * is facing — and the arm is what hangs off IT, not the other way
 * round. Every law in this file follows from that one sentence.
 *
 * THE YAW LAW. The plane's orientation is one angle, θ, measured
 * between the face normal and the camera:
 *
 *   θ = atan2(|fx|, fy) − twist        0 = face-on · π/2 = edge-on · π = back-on
 *
 *   across-face axis  h = ( oside·cos θ,  K·sin θ ) · halfW
 *   face normal       n = ( sgnP ·sin θ,  K·cos θ ) · depth
 *
 * K is the ground foreshortening of this 2.5D camera (we look slightly
 * down, so a tile of DEPTH reads as a short screen drop). Everything
 * the eye needs falls out of those two vectors:
 *
 *   - face-on  (θ≈0)   h is level and full-width → the whole face;
 *   - profile  (θ≈π/2) h collapses into the screen's depth axis → the
 *     face turns edge-on, the slab's real thickness becomes the whole
 *     silhouette, and the top rim opens into a foreshortened plane —
 *     the honest-angle law, for free, from the same two vectors;
 *   - back-on  (θ≈π)   cos θ flips sign, so h mirrors BY CONSTRUCTION
 *     and we paint the shield's back: planks, enarmes, the grip block,
 *     with the bearer's forearm threaded through the straps.
 *
 * The design space is the shield's own flat face: u ∈ [−1,1] across
 * (+u = the OUTER, off-hand side), t ∈ [−1,1] top→bottom. All the art
 * is authored there, once, and the yaw law projects it to all eight
 * facings — no per-facing sprites, ever.
 *
 * THE DISHED SHELL. Both rings (front face and back) ride the same
 * dome displacement, so the slab is a shell of constant thickness that
 * bulges toward the enemy — which is what draws the bowed crescent
 * silhouette when the shield turns edge-on.
 *
 * THE SUN LAW holds through the turn: the lit band is chosen by the
 * SCREEN side of the h axis, never by a design-space constant, so the
 * highlight stays up-screen-left at all eight facings instead of
 * swimming around the face as the body spins.
 *
 * THE SIGNATURE LAW. The plane above is the substrate — shell, rings,
 * side wall, rim, dish. It is not the art. Every shield in the roster
 * owns a bespoke FACE PAINTER keyed by `sig`, which paints that shield
 * and no other: its fittings, its charge, its account of how it was
 * made. The generic material dialect still exists, but only as the
 * floor an unknown or derived shield lands on. Two shields sharing a
 * shape and a material must still be told apart across a room.
 *
 * THE LADDER. Rungs buy METAL, not noise. A higher tier wears more
 * real fittings, cut in more planes, and its charge is worked rather
 * than painted: rung one is stitched hide on iron, rung two is bronze
 * riveted to oak, rung three is a bright plate bolted to enamel. The
 * detail count climbs, the palette's value range widens, and nothing
 * anywhere becomes busier for its own sake.
 *
 * Painter laws, shared with armor.ts/weapons.ts:
 *  - hurt ⇒ flat #ffffff silhouette, no detail;
 *  - fills on the live ctx, no allocation in the draw path;
 *  - the silhouette outline is the renderer's dilate pass — never
 *    stroked here; INTERNAL boldness (rim binding, boss ring, plank
 *    seams) is painted as real bands in the house's dark tone.
 */

/** Ground foreshortening: a step of DEPTH reads as this much screen drop. */
const GROUND_K = 0.52;

/**
 * THE CARRY-HEIGHT LAW. Held out toward the camera, a shield's forward
 * reach is honestly a screen DROP — and at full GROUND_K a shield in
 * guard slid off the chest and hung at the belly on every camera-facing
 * angle, which is precisely where the player is looking. The carriage
 * offset takes a shallower drop than the geometry does: the arm is
 * reaching out and UP at once, and the eye reads coverage of the chest
 * as the truth of the pose. The plane's own yaw stays fully honest —
 * only where it hangs is trimmed.
 */
const CARRY_DROP = 0.24;

/** The house dark — internal seams and the shadowed inside of the shell. */
const SEAM = '#241a2e';

/**
 * The ladder's one warm metal. Spent sparingly and only high on the
 * ladder: a few brass rivets against cold steel do more for "this is a
 * treasure" than any amount of extra grey detail, because they are the
 * only hue contrast on the piece.
 */
const BRASS = '#c9a45e';

export type ShieldShape = 'buckler' | 'round' | 'heater' | 'kite' | 'tower';

/**
 * The material dialect. Wood is BUILT — staves, seams, a bound rim you
 * can count the rivets on. Metal is FORGED — one continuous face,
 * beveled facets, a hard specular band. They must never paint alike.
 */
export type ShieldMaterial = 'wood' | 'iron' | 'steel' | 'bronze';

/** The heraldic charge across the face. */
export type ShieldDevice =
  | 'none'
  | 'chevron'
  | 'diamond'
  | 'cross'
  | 'crown'
  | 'moon'
  | 'star'
  | 'fang';

/** Field division — how the face is quartered before the charge lands. */
export type ShieldField = 'plain' | 'pale' | 'bend' | 'chief' | 'quarter';

export interface ShieldStyle {
  shape: ShieldShape;
  material: ShieldMaterial;
  /** The field: the face's own color. */
  face: string;
  /** Second tincture for a divided field. */
  faceAlt?: string;
  field?: ShieldField;
  /** Bound rim / edge metal. */
  rim: string;
  /** Umbo. Undefined = a strapped shield with no boss. */
  boss?: string;
  device?: ShieldDevice;
  deviceColor?: string;
  /** Rivets around the bound rim — the built read. */
  studs?: boolean;
  /** Forged punch spikes (buckler dialect). */
  spikes?: boolean;
  /** Stave count for wood faces. */
  planks?: number;
  /** Dish depth, 0 flat → 1 deeply bowled. */
  curve?: number;
  /** Leather of the enarmes on the back. */
  strapColor?: string;
  /**
   * THE SIGNATURE LAW (see below): the bespoke face painter for THIS
   * shield. Unset = the generic material dialect, which is what an
   * unknown or derived shield falls back to.
   */
  sig?: string;
  /**
   * THE LADDER: 1 a footsoldier's kit → 4 a treasure. It buys fittings,
   * not noise — a higher rung wears more real METAL, cut in more
   * planes, and its charge is worked rather than painted on.
   */
  tier?: number;
}

// ------------------------------------------------------------- roster

export const SHIELD_STYLES: Record<string, ShieldStyle> = {
  /**
   * RUNG ONE — the fist's little wall. A forged iron disc faced in
   * oiled hide, drawn tight over the boss so the leather CREASES
   * radially out of the umbo; a saddler's stitch line rings the edge,
   * four punch spikes sit on plates at the quarters, and the binding
   * is blackened iron so the bright steel umbo is the one thing on it
   * that shines. Cheap kit, honestly made — the read is workmanship,
   * not wealth, and the palette carries the whole ladder's darkest
   * metal against its brightest highlight.
   */
  spiked_buckler: {
    shape: 'buckler',
    material: 'iron',
    face: '#8f7449',
    rim: '#5a6070',
    boss: '#ccd5e2',
    device: 'none',
    studs: true,
    spikes: true,
    curve: 0.5,
    strapColor: '#4a3524',
    sig: 'buckler',
    tier: 1,
  },
  /**
   * RUNG TWO — the wood dialect's showpiece. Five riven oak staves,
   * each CROWNED by the dish so it catches its own edge of light, laid
   * under a bound bronze rim bright enough to separate from the boards
   * at any range. A hammered bronze chevron rides the honor point with
   * a rivet at every terminal and a rondel at its peak. No boss: it
   * straps to the arm, and the arm is the point.
   */
  oak_kiteshield: {
    shape: 'kite',
    material: 'wood',
    face: '#79512a',
    faceAlt: '#5c3c1f',
    field: 'plain',
    rim: '#c08a4e',
    device: 'chevron',
    deviceColor: '#e3b06a',
    studs: true,
    planks: 5,
    curve: 0.45,
    strapColor: '#4a3524',
    sig: 'oak_kite',
    tier: 2,
  },
  /**
   * RUNG THREE — a door you carry into arguments, and the roster's
   * showpiece. A fluted steel pavise: seven vertical flutes running
   * crown to heel, a deep enamelled pale painted down the middle in
   * the house indigo, a raised spine holding a hard specular the whole
   * height of it, two riveted cross-bands, cornerplates bolted over
   * all four heels, and a brow band following the arch. Its charge is
   * not painted — it is a bright lozenge PLATE riveted onto the
   * enamel, which is the difference between a soldier's shield and a
   * thing a smith was proud of.
   */
  tower_shield: {
    shape: 'tower',
    material: 'steel',
    face: '#9aa1ab',
    faceAlt: '#2f3a5e',
    field: 'pale',
    rim: '#5d6472',
    // No umbo: on a pavise the riveted lozenge PLATE is the boss, and
    // the signature paints it in the face's own design space.
    device: 'diamond',
    deviceColor: '#dde3ec',
    studs: true,
    curve: 0.3,
    strapColor: '#3f3830',
    sig: 'pavise',
    tier: 3,
  },
};

/**
 * The shield for an item — the bespoke record when one exists, else a
 * coherent one derived from the offhand's palette so an unknown shield
 * still paints as a real shield in the right dialect, never as a slab.
 */
export function shieldStyle(
  itemId: string,
  kind: 'buckler' | 'kite' | 'tower',
  color: string,
  trim: string,
  boss?: string,
): ShieldStyle {
  const st = SHIELD_STYLES[itemId];
  if (st) return st;
  // Derived fallback: the palette decides the dialect. A warm face is
  // wood (staved and bound); a cool one is forged metal.
  const n = parseInt(color.slice(1), 16);
  const warm = (n >> 16) - (n & 0xff) > 24;
  const shape: ShieldShape = kind === 'kite' ? 'kite' : kind === 'tower' ? 'tower' : 'buckler';
  return {
    shape,
    material: warm ? 'wood' : 'steel',
    face: color,
    rim: trim,
    boss: boss ?? (shape === 'buckler' ? shade(trim, 40) : undefined),
    studs: true,
    planks: warm ? 4 : undefined,
    curve: shape === 'buckler' ? 0.8 : 0.5,
    strapColor: '#4a3524',
  };
}

// ----------------------------------------------------------- geometry

/** Design-space outlines, u across / t top→bottom, both in [−1,1]. */
function ngon(n: number, rot: number): number[] {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    p.push(Math.cos(a), Math.sin(a));
  }
  return p;
}

const OUTLINES: Record<ShieldShape, number[]> = {
  // Faceted discs — low-poly by construction, flat facet dead top.
  buckler: ngon(12, -Math.PI / 2 + Math.PI / 12),
  round: ngon(14, -Math.PI / 2 + Math.PI / 14),
  // The knightly heater: flat top, chamfered shoulders, a belly that
  // converges on a soft point.
  heater: [
    -0.92, -1, 0.92, -1, 1.0, -0.86, 0.99, -0.42, 0.93, 0.0, 0.78, 0.42,
    0.52, 0.74, 0.22, 0.94, 0, 1, -0.22, 0.94, -0.52, 0.74, -0.78, 0.42,
    -0.93, 0.0, -0.99, -0.42, -1.0, -0.86,
  ],
  // The Norman almond: a rounded crown over a long taper that actually
  // arrives at a POINT — a kite that rounds off is just an oval.
  kite: [
    0, -1, 0.42, -0.93, 0.74, -0.7, 0.9, -0.38, 0.95, -0.02, 0.84, 0.32,
    0.62, 0.62, 0.34, 0.85, 0.12, 0.97, 0, 1, -0.12, 0.97, -0.34, 0.85,
    -0.62, 0.62, -0.84, 0.32, -0.95, -0.02, -0.9, -0.38, -0.74, -0.7,
    -0.42, -0.93,
  ],
  // The pavise: a shallow arched crown, straight walls, cut heels.
  tower: [
    0, -1, 0.55, -0.95, 0.9, -0.86, 0.96, -0.72, 1.0, -0.2, 1.0, 0.55,
    0.92, 0.86, 0.72, 1, -0.72, 1, -0.92, 0.86, -1.0, 0.55, -1.0, -0.2,
    -0.96, -0.72, -0.9, -0.86, -0.55, -0.95,
  ],
};

/**
 * Per-shape body measurements, in body-height units (× s):
 *  hw/hh  half-width, half-height of the face;
 *  hang   the plane's center relative to the HIP line (negative = up);
 *  depth  the shell's thickness;
 *  strap  true = the arm threads enarmes; false = a center-boss fist grip.
 *
 * Sized against the rig itself (shoulders sit 0.40 s above the hip,
 * the ground 0.414 s below it): a tower spans shoulder → shin, a kite
 * shoulder → below the hip, a buckler is one fist wide.
 */
const METRIC: Record<
  ShieldShape,
  {
    hw: number;
    hh: number;
    hang: number;
    depth: number;
    strap: boolean;
    /** Extra reach past the chest — a buckler is PUNCHED out, a wall is leaned on. */
    fwdK: number;
    /**
     * Extra deflecting turn. MORE twist turns the face toward the eye,
     * so the small shields take a positive bias — a buckler is used on
     * an angle anyway, and dead square it collapses to a coin's edge at
     * profile. A wall stays squarer: it is meant to be a flat surface
     * between its bearer and the world.
     */
    twistK: number;
  }
> = {
  buckler: { hw: 0.13, hh: 0.13, hang: -0.25, depth: 0.034, strap: false, fwdK: 0.08, twistK: 0.18 },
  round: { hw: 0.175, hh: 0.175, hang: -0.21, depth: 0.036, strap: false, fwdK: 0.03, twistK: 0.1 },
  heater: { hw: 0.16, hh: 0.21, hang: -0.19, depth: 0.05, strap: true, fwdK: 0, twistK: 0 },
  kite: { hw: 0.152, hh: 0.27, hang: -0.14, depth: 0.05, strap: true, fwdK: 0, twistK: 0 },
  tower: { hw: 0.185, hh: 0.315, hang: -0.09, depth: 0.06, strap: true, fwdK: -0.01, twistK: -0.04 },
};

/** The solved plane — everything the painters and the arm both need. */
export interface ShieldFrame {
  shape: ShieldShape;
  /** Screen center of the plane. */
  cx: number;
  cy: number;
  /** The yaw law's angle: 0 face-on, π/2 edge-on, π back-on. */
  theta: number;
  /** Screen-plane roll. */
  tilt: number;
  /** ±1: which screen side design +u (the outer edge) runs toward. */
  oside: number;
  /** ±1: the profile sign (which way the face normal rakes at profile). */
  sgnP: number;
  /** Screen half-extents and shell thickness, in pixels. */
  hw: number;
  hh: number;
  depth: number;
  curve: number;
  /** Where the fist actually closes — the arm's IK target. */
  gripX: number;
  gripY: number;
  /** Elbow pole preference for the off arm's two-bone solve. */
  poleX: number;
  poleY: number;
  /** cos θ < 0: the bearer is turned away and we read the shield's back. */
  seeBack: boolean;
  /** |cos θ|: how open the face is, 0 edge-on → 1 square to the camera. */
  open: number;
  /**
   * THE DEPTH LAW: the plane sits on the camera's side of the body, so
   * it paints over the torso. Held, that is true when the bearer faces
   * us; slung, when they are walking away — one flag, both cases.
   */
  front: boolean;
  /** How far onto the back the shield has traveled, 0 in hand → 1 slung. */
  sling: number;
}

/**
 * THE GUARD LAW. Out of combat the shield rides at a relaxed carry —
 * turned a little off the line, hanging at the chest. The instant the
 * body means it, the shield squares up, rises, and comes across the
 * centerline: the tank read. It never rotates onto the forearm, never
 * lies flat, never leaves the front of the body.
 *
 * Everything here is continuous in its channels, so a shield settling
 * out of a fight travels back to the carry over the same blend every
 * other piece of carriage uses.
 */
export function solveShield(
  st: ShieldStyle,
  o: {
    /** Body center and the hip line it hangs from. */
    x: number;
    hipY: number;
    /** The shoulder line — where the guige carries a slung shield. */
    shoulderY: number;
    s: number;
    /** Fake-3D width squash from the solver. */
    wS: number;
    /** Facing (fx = screen x, fy > 0 = toward the camera). */
    fx: number;
    fy: number;
    /** Smoothed profile side from the rig (sign of fx, eased through 0). */
    sideS: number;
    /** 1 = settled into rest carriage, 0 = combat guard. */
    restSettle: number;
    /** Gait: smoothed swing drive, run blend, travel pole, its strength. */
    swing: number;
    runF: number;
    poleX: number;
    poleY: number;
    poleStrength: number;
    /** Sneak crouch blend. */
    crouch: number;
    /**
     * THE SLING: 0 = in the fist, 1 = carried on the back by its guige.
     * Rides the body's own sheathe clock, so a shield goes away with
     * the sword it fights beside and comes back with it.
     */
    sling: number;
    /** Melee combo stage (−1 none) and its normalized clock. */
    melee: number;
    poseT: number;
    /** Finisher drive, 0..1 — the shield rams forward with the body. */
    thrust: number;
    nowMs: number;
  },
): ShieldFrame {
  const m = METRIC[st.shape];
  const s = o.s;
  // The off hand's screen side: the rig hangs it opposite the smoothed
  // profile side, so the shield inherits that same eased flip and can
  // never disagree with the arm that carries it.
  const sgnP = o.sideS === 0 ? 1 : o.sideS;
  const oside = -sgnP;
  const guard = 1 - o.restSettle;

  // ---- the carriage channels, in body-height units.
  // Forward of the chest, across toward the off side, and how high the
  // rim rides. Guard brings the shield up, square, and to the center.
  let fwd = 0.15 + 0.08 * guard + m.fwdK;
  // THE LEADING-EDGE LAW. Turned side-on, the plane is edge-on to the
  // camera and its whole silhouette is the shell's thickness — which
  // the body will swallow if the shield is still tucked at the chest.
  // A fighter at profile presents the shield EDGE FIRST anyway, arm
  // out along the line of the threat, so the carriage reaches with the
  // facing: at profile the shield clears the torso and reads as a bowed
  // slab standing proud of the body, which is what it should be.
  fwd += 0.11 * Math.abs(o.fx);
  // Across the body toward the off side. It never goes to zero: a
  // shield that centers perfectly on the spine disappears behind its
  // own bearer at the back facings, and a shield you cannot see from
  // behind is a shield the player stops believing in.
  let lat = 0.15 - 0.045 * guard;
  // Walking AWAY, the shield slides further onto the off flank: held
  // dead in front of a receding body it hides behind its own bearer,
  // and a shield the player cannot see is a shield they stop trusting.
  lat += 0.12 * Math.max(0, -o.fy);
  let lift = -0.03 * guard;
  // The deflecting angle: a carried shield sits turned off the line; a
  // raised one squares to the threat but keeps a slope to skate blows.
  // Kept modest — past ~0.4 rad the face turns so far out of the frame
  // at profile that the shield stops reading as a shield at all.
  // Squaring up in guard turns the face toward the THREAT, which at a
  // profile facing is away from the camera — so the squaring is kept
  // shallow. Past about a tenth of a radian of it, a defending fighter
  // seen side-on holds a shield the player can no longer see.
  let twist = 0.44 - 0.1 * guard + m.twistK;
  // THE TURN-AWAY LAW: the deflecting angle belongs to a body that is
  // FACING something. Walking away there is nothing to angle against,
  // and a full twist stacked on a back facing turned the plane so far
  // edge-on that it vanished behind its own bearer at the away
  // diagonals — the one facing where a shield used to disappear.
  twist *= 0.4 + 0.6 * (o.fy * 0.5 + 0.5);
  let tilt = oside * (0.13 - 0.07 * guard);

  // The strike beat: the shield PRESSES — forward, square, and a touch
  // high — while the sword works, then eases back onto the guard.
  if (o.melee === 0 || o.melee === 1) {
    const surge = Math.sin(Math.max(0, Math.min(1, o.poseT)) * Math.PI);
    fwd += 0.05 * surge;
    twist -= 0.06 * surge;
    lift -= 0.025 * surge;
    tilt += oside * 0.05 * surge;
  }
  // The finisher: the body rams and the shield goes with it, edge first.
  if (o.thrust > 0) {
    fwd += 0.11 * o.thrust;
    lat -= 0.03 * o.thrust;
    twist += 0.3 * o.thrust;
    tilt += oside * 0.09 * o.thrust;
  }

  // Running pulls the shield IN and forward-canted — a sprinting body
  // does not hold a door out at arm's length.
  fwd -= 0.035 * o.runF;
  lat -= 0.02 * o.runF;
  lift -= 0.012 * o.runF;
  twist += 0.16 * o.runF;

  // Sneaking tucks it low and turned in, out of the silhouette.
  fwd -= 0.045 * o.crouch;
  twist += 0.3 * o.crouch;
  lift += 0.02 * o.crouch;

  // ---- THE SLING. Put away, the shield rides the back on its guige:
  // the plane turns over (its face now points the way the bearer's
  // BACK does), lies at a rakish angle across the shoulders, and the
  // depth law inverts with it — walking away from the camera, a slung
  // shield shows its whole face, which is the read every knight in
  // every good painting has. Blended, so the shield swings around the
  // body on the same clock that puts the sword on the belt.
  const sling = Math.max(0, Math.min(1, o.sling));
  if (sling > 0) {
    twist += (0.14 - twist) * sling;
    tilt += (oside * 0.42 - tilt) * sling;
  }
  // The face's yaw is measured against the side of the body it rides:
  // held it answers the facing, slung it answers the back.
  const fyE = o.fy * (1 - 2 * sling);

  // ---- the plane's yaw, THE YAW LAW.
  let theta = Math.atan2(Math.abs(o.fx), fyE) - twist;
  // Roll and float from the gait: a carried mass answers the stride
  // with a lag, never a pump. Damped hard — the shield is heavy.
  const gait = Math.min(1, o.poleStrength);
  const bob = o.swing * gait;
  tilt += bob * (0.035 + 0.03 * o.runF);
  theta += bob * 0.06;
  // Standing breath, on the rig's own idle clock.
  const still = 1 - gait;
  tilt += Math.sin(o.nowMs * 0.0019 + 0.7) * 0.014 * still;

  // ---- where the plane lands on screen.
  const hipY = o.hipY;
  const chestY = hipY + m.hang * s;
  // Forward rides the facing, foreshortened into the screen. ACROSS is
  // a fact about the BODY, not about the plane: the off side stays the
  // off side whether the bearer faces us or not, so it takes |cos θ|
  // (never the signed cosine, which flipped the shield onto the wrong
  // hip the moment the character turned their back) plus a near-side
  // depth term that carries it toward the camera at profile — where
  // the off arm is the near arm, by the rig's own law.
  // The off side is the ground perpendicular of the FACING — it does
  // not turn with the plane's twist, so it takes |fy| across and |fx|
  // into the depth. (Reading it off the twisted plane instead shrank
  // the offset at the diagonals and swallowed the whole shield behind
  // its own bearer on the three-quarter-away facings.)
  let cx = o.x + o.fx * fwd * s * o.wS + oside * Math.abs(o.fy) * lat * s * o.wS;
  // The across-the-body offset keeps the FULL ground drop: side-on it
  // is what carries the shield onto the near side of the body, where
  // the rig already says the off arm lives — and that separation is
  // what keeps an edge-on shield from merging into the sword sharing
  // its screen column. Only the forward REACH is trimmed (see above).
  let cy = chestY + o.fy * fwd * s * CARRY_DROP + GROUND_K * Math.abs(o.fx) * lat * s + lift * s;
  // The stride's lateral lag: the mass trails the body a little.
  cx -= o.poleX * bob * 0.02 * s;
  cy -= o.poleY * bob * 0.02 * s * GROUND_K;
  // The slung anchor: high across the back, off-side shoulder.
  if (sling > 0) {
    const bx = o.x - o.fx * 0.15 * s * o.wS + oside * 0.09 * s * o.wS;
    const by = o.shoulderY + 0.19 * s - o.fy * 0.15 * s * GROUND_K;
    cx += (bx - cx) * sling;
    cy += (by - cy) * sling;
  }

  // Slung shields sit a touch further from the eye, and read smaller.
  const shrink = 1 - 0.1 * sling;
  const hw = m.hw * s * o.wS * shrink;
  const hh = m.hh * s * shrink;
  const depth = m.depth * s;
  const curve = st.curve ?? 0.5;

  // ---- the grip: where the fist closes, BEHIND the plane.
  // A center-boss shield is punched from a fist under the umbo; a
  // strapped shield is gripped at the inner edge with the forearm laid
  // across the enarmes, so the hand rides in and high.
  const gu = m.strap ? -0.42 : 0;
  const gt = m.strap ? -0.1 : 0;
  const hxU = oside * Math.cos(theta) * hw;
  const hyU = GROUND_K * Math.sin(theta) * hw;
  const nxU = sgnP * Math.sin(theta) * depth;
  const nyU = GROUND_K * Math.cos(theta) * depth;
  const ct = Math.cos(tilt);
  const stt = Math.sin(tilt);
  // Local (untilted) grip offset, then rolled with the plane.
  const back = 0.5 + curve + 0.55; // behind the shell, a hand's depth
  const lx = gu * hxU - nxU * back;
  const ly = gu * hyU + gt * hh - nyU * back;
  const gripX = cx + lx * ct - ly * stt;
  const gripY = cy + lx * stt + ly * ct;
  // The elbow bulges outward and down along the plane — the braced
  // arm of someone actually holding a door up, not a hanging wrist.
  const ex = 0.5 * hxU;
  const ey = 0.5 * hyU + 0.62 * hh;
  const poleX = ex * ct - ey * stt;
  const poleY = ex * stt + ey * ct;

  return {
    shape: st.shape,
    cx,
    cy,
    theta,
    tilt,
    oside,
    sgnP,
    hw,
    hh,
    depth,
    curve,
    gripX,
    gripY,
    poleX,
    poleY,
    seeBack: Math.cos(theta) < 0,
    open: Math.abs(Math.cos(theta)),
    front: fyE > -0.14,
    sling,
  };
}

// ----------------------------------------------------------- painters

/** The dome displacement of the shell at a design point, 0 rim → 1 crown. */
function dome(u: number, t: number): number {
  const d = 1 - 0.86 * u * u - 0.86 * t * t;
  return d > 0 ? d : 0;
}

/**
 * Ring scratch: the projected front and back silhouettes of the shell,
 * rebuilt per shield and read by every pass below. Sized for the
 * longest outline in the roster — shared, never allocated in the draw.
 */
const RING_FAR = new Float64Array(64);
const RING_NEAR = new Float64Array(64);

/**
 * The shield, painted from the plane out: the far ring, the shell's
 * side wall (which becomes the whole silhouette at profile and carries
 * the foreshortened top plane), then the near ring wearing either the
 * face's heraldry or the back's straps and staves.
 */
export function drawShield(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  hurt: boolean,
  nowMs: number,
): void {
  const outline = OUTLINES[fr.shape];
  const n = outline.length / 2;
  const cθ = Math.cos(fr.theta);
  const sθ = Math.sin(fr.theta);
  const hxU = fr.oside * cθ * fr.hw;
  const hyU = GROUND_K * sθ * fr.hw;
  const nxU = fr.sgnP * sθ * fr.depth;
  const nyU = GROUND_K * cθ * fr.depth;
  // Which ring is nearer the camera: the front face when it is turned
  // our way, the back when the bearer is. The near one is painted last
  // and wears the art.
  const front = fr.seeBack ? -1 : 1;
  const dNear = front > 0 ? 0.5 : -0.5;
  const dFar = -dNear;

  ctx.save();
  ctx.translate(fr.cx, fr.cy);
  ctx.rotate(fr.tilt);

  const rimDark = hurt ? '#ffffff' : shade(st.rim, -12);
  const rimLit = hurt ? '#ffffff' : shade(st.rim, 36);
  const inner = hurt ? '#ffffff' : shade(st.rim, -48);

  // ---- both rings, projected ONCE into scratch. The painters below
  // read these back instead of re-solving the dome per edge: this runs
  // for every shield-bearing body on screen, every frame, and the
  // painter law here is no allocation and no repeated trig.
  for (let i = 0; i < n; i++) {
    const u = outline[i * 2]!;
    const t = outline[i * 2 + 1]!;
    const dm = front * fr.curve * dome(u, t);
    const bx = u * hxU;
    const by = u * hyU + t * fr.hh;
    RING_FAR[i * 2] = bx + nxU * (dFar + dm);
    RING_FAR[i * 2 + 1] = by + nyU * (dFar + dm);
    RING_NEAR[i * 2] = bx + nxU * (dNear + dm);
    RING_NEAR[i * 2 + 1] = by + nyU * (dNear + dm);
  }

  // ---- the far ring: the shell's other side, in shadow.
  ctx.fillStyle = hurt ? '#ffffff' : inner;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (i === 0) ctx.moveTo(RING_FAR[0]!, RING_FAR[1]!);
    else ctx.lineTo(RING_FAR[i * 2]!, RING_FAR[i * 2 + 1]!);
  }
  ctx.closePath();
  ctx.fill();

  // ---- the side wall. EVERY quad goes into ONE path and is filled
  // ONCE. Turned nearly edge-on these quads are long slivers stacked
  // on each other, and sorting them into two tone buckets painted the
  // shell as a bundle of loose boards — a comb of stripes where there
  // should be one bowed slab. A nonzero-winding union cannot stripe.
  ctx.fillStyle = hurt ? '#ffffff' : rimDark;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.moveTo(RING_FAR[i * 2]!, RING_FAR[i * 2 + 1]!);
    ctx.lineTo(RING_FAR[j * 2]!, RING_FAR[j * 2 + 1]!);
    ctx.lineTo(RING_NEAR[j * 2]!, RING_NEAR[j * 2 + 1]!);
    ctx.lineTo(RING_NEAR[i * 2]!, RING_NEAR[i * 2 + 1]!);
    ctx.closePath();
  }
  ctx.fill();
  // The UP-SCREEN walls are then re-struck as the lit TOP PLANE — the
  // foreshortened crown this camera owes every standing form.
  ctx.fillStyle = hurt ? '#ffffff' : rimLit;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mid =
      (RING_FAR[i * 2 + 1]! + RING_FAR[j * 2 + 1]! + RING_NEAR[i * 2 + 1]! + RING_NEAR[j * 2 + 1]!) /
      4;
    if (mid >= -fr.hh * 0.12) continue;
    ctx.moveTo(RING_FAR[i * 2]!, RING_FAR[i * 2 + 1]!);
    ctx.lineTo(RING_FAR[j * 2]!, RING_FAR[j * 2 + 1]!);
    ctx.lineTo(RING_NEAR[j * 2]!, RING_NEAR[j * 2 + 1]!);
    ctx.lineTo(RING_NEAR[i * 2]!, RING_NEAR[i * 2 + 1]!);
    ctx.closePath();
  }
  ctx.fill();

  // THE CREST. Turned far enough that the shell carries the
  // silhouette, the near edge takes a hard line of light. Without it
  // an edge-on shield is a dark strip that merges into the renderer's
  // outline — and into whatever blade shares its screen column.
  if (!hurt && fr.open < 0.4) {
    ctx.strokeStyle = shade(st.rim, 56);
    ctx.lineWidth = Math.max(1, fr.depth * 0.34);
    ctx.globalAlpha = 1 - fr.open / 0.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.moveTo(RING_NEAR[0]!, RING_NEAR[1]!);
      else ctx.lineTo(RING_NEAR[i * 2]!, RING_NEAR[i * 2 + 1]!);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---- the near ring. Edge-on there is no face left to paint: the
  // wall above IS the shield, and a bright crest line finishes it.
  if (fr.open < 0.07) {
    if (!hurt) {
      ctx.strokeStyle = shade(st.rim, 46);
      ctx.lineWidth = Math.max(1, fr.depth * 0.3);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (i === 0) ctx.moveTo(RING_NEAR[0]!, RING_NEAR[1]!);
        else ctx.lineTo(RING_NEAR[i * 2]!, RING_NEAR[i * 2 + 1]!);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // The face art rides the shell's crown: one translation onto the
  // dome, then the design space itself becomes the canvas.
  const crown = dNear + front * fr.curve;
  ctx.save();
  ctx.translate(nxU * crown, nyU * crown);
  ctx.transform(hxU, hyU, 0, fr.hh, 0, 0);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = outline[i * 2]!;
    const t = outline[i * 2 + 1]!;
    if (i === 0) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  if (hurt) {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.clip();
  // THE SUN LAW through the turn: the lit side is a SCREEN fact, so it
  // is read off the h axis's direction, never off a design constant.
  const litU = hxU >= 0 ? -1 : 1;
  if (fr.seeBack) drawBack(ctx, st, fr, litU);
  else drawFace(ctx, st, fr, litU, nowMs);
  ctx.restore();

  // ---- the bound rim: a real band around the face, not a stroke.
  drawRim(ctx, st, fr, outline, n, litU);
  ctx.restore();

  // ---- the umbo stands PROUD of the face, so it is projected in the
  // local frame with its own dome height — at profile it survives as a
  // bump on the silhouette, which is exactly what a real boss does.
  if (st.boss && !fr.seeBack) drawBoss(ctx, st, fr, hxU, hyU, nxU, nyU, crown);
  if (st.spikes && !hurt) drawSpikes(ctx, st, fr, hxU, hyU, nxU, nyU, crown);
  ctx.restore();
}

/**
 * THE SIGNATURE LAW. A shield is not a shape plus a swatch. Every
 * shield in the roster owns a painter that paints IT — its own
 * fittings, its own charge, its own story of how it was made — and the
 * generic material dialect exists only as the floor an unknown shield
 * lands on. Two shields of the same shape and material must still be
 * recognizable from across a room with no name plate.
 */
type FacePainter = (
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
  nowMs: number,
) => void;

const SIGNATURES: Record<string, FacePainter> = {
  buckler: sigBuckler,
  oak_kite: sigOakKite,
  pavise: sigPavise,
};

/** The face: field, signature (or the generic dialect), dish. */
function drawFace(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
  nowMs: number,
): void {
  // The field, and its division.
  ctx.fillStyle = st.face;
  ctx.fillRect(-1.1, -1.1, 2.2, 2.2);
  // THE GRAZING-ANGLE LAW: past a certain turn the face is a few
  // pixels wide and every piece of detail on it — seams, charges,
  // gores — collapses into the same one-pixel column and reads as
  // shattered debris. Near edge-on the face keeps its field and its
  // light, and nothing else. What sells the shield there is the SLAB,
  // which the side-wall pass has already drawn.
  if (fr.open < 0.24) {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = litU > 0 ? '#ffffff' : SEAM;
    ctx.fillRect(0, -1.1, 1.1, 2.2);
    ctx.fillStyle = litU > 0 ? SEAM : '#ffffff';
    ctx.fillRect(-1.1, -1.1, 1.1, 2.2);
    ctx.globalAlpha = 1;
    return;
  }
  drawField(ctx, st);

  const sig = st.sig ? SIGNATURES[st.sig] : undefined;
  if (sig) sig(ctx, st, fr, litU, nowMs);
  else {
    drawGenericDialect(ctx, st, fr);
    drawDevice(ctx, st, fr);
  }

  drawDish(ctx, litU);
  drawGlint(ctx, nowMs);
}

/** Heraldic division of the field, under everything else. */
function drawField(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  if (!st.faceAlt || !st.field || st.field === 'plain') return;
  ctx.fillStyle = st.faceAlt;
  if (st.field === 'pale') ctx.fillRect(-0.32, -1.1, 0.64, 2.2);
  else if (st.field === 'chief') ctx.fillRect(-1.1, -1.1, 2.2, 0.62);
  else if (st.field === 'quarter') {
    ctx.fillRect(0, -1.1, 1.1, 1.1);
    ctx.fillRect(-1.1, 0, 1.1, 1.1);
  } else if (st.field === 'bend') {
    ctx.beginPath();
    ctx.moveTo(-1.1, 1.1);
    ctx.lineTo(1.1, -1.1);
    ctx.lineTo(1.1, 1.1);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * THE DISH, sculpted. Not a stack of vertical bars: the terminator
 * LEANS, because the surface it crosses is a dome and the light comes
 * from up-screen. Three flat planes and one belly shadow, all quiet —
 * the dish is a hint of turn across a face whose real subject is its
 * own material and charge. Loud bands read as wet plastic and bury the
 * heraldry under a glare.
 */
function drawDish(ctx: CanvasRenderingContext2D, litU: number): void {
  // A leaning chord: wide at the top where the dome faces the light,
  // narrowing toward the belly as the surface rolls away.
  const chord = (x0: number, x1: number, lean: number, alpha: number, tone: string): void => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(litU * x0, -1.15);
    ctx.lineTo(litU * x1, -1.15);
    ctx.lineTo(litU * x1, 1.15);
    ctx.lineTo(litU * (x0 + lean), 1.15);
    ctx.closePath();
    ctx.fill();
  };
  chord(0.44, 1.18, 0.34, 0.13, '#ffffff');
  chord(0.06, 0.5, 0.3, 0.06, '#ffffff');
  chord(-1.18, -0.72, -0.3, 0.19, SEAM);
  // The lower belly always falls into shadow — the light is up-screen.
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.15, 0.64, 2.3, 0.6);
  ctx.globalAlpha = 1;
}

/** A slow travelling glint — the face is polished, and alive. */
function drawGlint(ctx: CanvasRenderingContext2D, nowMs: number): void {
  const g = (nowMs % 5600) / 5600;
  if (g >= 0.16) return;
  const u = g / 0.16;
  ctx.globalAlpha = Math.sin(u * Math.PI) * 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-1.15 + u * 2.4, -1.15);
  ctx.lineTo(-1.03 + u * 2.4, -1.15);
  ctx.lineTo(-1.27 + u * 2.4, 1.15);
  ctx.lineTo(-1.39 + u * 2.4, 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * The floor: a coherent material read for a shield with no signature
 * of its own — a derived drop, a colorway, an NPC's kit. It must never
 * look like a slab, but it must never outshine an authored shield.
 */
function drawGenericDialect(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
): void {
  if (st.material === 'wood') {
    staves(ctx, st, st.planks ?? 4);
    ctx.fillStyle = shade(st.face, -24);
    for (let i = 0; i < 7; i++) {
      const u = -0.86 + i * 0.29;
      const t = -0.62 + ((i * 37) % 13) * 0.1;
      ctx.fillRect(u, t, 0.02, 0.5 + ((i * 17) % 5) * 0.08);
    }
    return;
  }
  if (fr.shape === 'buckler' || fr.shape === 'round') {
    gores(ctx, st, 8);
    return;
  }
  // Tall forged shields get a spine and two riveted cross-bands.
  ctx.fillStyle = shade(st.face, 20);
  ctx.fillRect(-0.1, -1.1, 0.2, 2.2);
  ctx.fillStyle = shade(st.face, -22);
  ctx.fillRect(0.1, -1.1, 0.05, 2.2);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.125, -1.1, 0.022, 2.2);
  ctx.fillRect(0.152, -1.1, 0.022, 2.2);
  for (const t of [-0.56, 0.42]) {
    ctx.fillStyle = shade(st.rim, 12);
    ctx.fillRect(-1.1, t, 2.2, 0.16);
    ctx.fillStyle = SEAM;
    ctx.fillRect(-1.1, t + 0.16, 2.2, 0.028);
  }
}

// ------------------------------------------------- shared face pieces

/**
 * Riven staves: boards running the shield's height, each seam a hard
 * dark line. THE CROWNED STAVE — every board is a piece of a dished
 * shell, so it carries its own little bevel: lit on the side that
 * turns into the light, dark on the side that rolls away. This is what
 * separates a face made of boards from a face painted to look like it.
 */
function staves(ctx: CanvasRenderingContext2D, st: ShieldStyle, k: number, crown = 0): void {
  const w = 2 / k;
  for (let i = 0; i < k; i++) {
    const u0 = -1 + w * i;
    ctx.fillStyle = i % 2 ? shade(st.face, -13) : shade(st.face, 5);
    ctx.fillRect(u0, -1.15, w, 2.3);
    if (crown > 0) {
      ctx.fillStyle = shade(st.face, crown);
      ctx.fillRect(u0 + w * 0.14, -1.15, w * 0.26, 2.3);
      ctx.fillStyle = shade(st.face, -crown);
      ctx.fillRect(u0 + w * 0.74, -1.15, w * 0.2, 2.3);
    }
    ctx.fillStyle = SEAM;
    ctx.fillRect(u0 - 0.012, -1.15, 0.024, 2.3);
  }
}

/**
 * Gores: the wedges a round shield is raised in, struck out from the
 * umbo. Alternating tones make a dome out of flat fills — the low-poly
 * way to curve steel without a single gradient.
 */
function gores(ctx: CanvasRenderingContext2D, st: ShieldStyle, k: number): void {
  for (let i = 0; i < k; i++) {
    const a0 = (i / k) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / k) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = i % 2 ? shade(st.face, -14) : shade(st.face, 8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * 1.3, Math.sin(a0) * 1.3);
    ctx.lineTo(Math.cos(a1) * 1.3, Math.sin(a1) * 1.3);
    ctx.closePath();
    ctx.fill();
  }
}

/** A riveted band across the face — the fitting every tier is built from. */
function band(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  t: number,
  h: number,
  studs: number,
  studColor?: string,
): void {
  ctx.fillStyle = st.rim;
  ctx.fillRect(-1.15, t, 2.3, h);
  ctx.fillStyle = shade(st.rim, 26);
  ctx.fillRect(-1.15, t, 2.3, h * 0.3);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.15, t + h, 2.3, 0.026);
  ctx.fillStyle = studColor ?? shade(st.rim, 44);
  for (let i = 0; i < studs; i++) {
    const u = -0.78 + (1.56 * i) / Math.max(1, studs - 1);
    rivet(ctx, u, t + h * 0.52, 0.045);
  }
}

/**
 * One rivet: a lit diamond seated on its own shadow. The shadow is the
 * SAME diamond nudged down-screen — an earlier cut used a separate
 * triangle hanging below the head, and at every size in the game it
 * read as a little tick mark, so the shields wore rows of check marks
 * instead of rows of rivets.
 */
function rivet(ctx: CanvasRenderingContext2D, u: number, t: number, r: number): void {
  const head = ctx.fillStyle;
  const dia = (du: number, dt: number, k: number): void => {
    ctx.beginPath();
    ctx.moveTo(u + du - r * k, t + dt);
    ctx.lineTo(u + du, t + dt - r * k);
    ctx.lineTo(u + du + r * k, t + dt);
    ctx.lineTo(u + du, t + dt + r * k);
    ctx.closePath();
    ctx.fill();
  };
  // A CENTERED dark ring, never an offset drop-shadow: any dark shape
  // hanging below a light head resolves, at gameplay size, into a tick
  // mark, and a row of them turns a riveted band into a row of ticks.
  ctx.fillStyle = SEAM;
  dia(0, 0, 1.34);
  ctx.fillStyle = head;
  dia(0, 0, 1);
  // The struck facet: rivets are peened, so each one holds a highlight
  // on the same up-screen shoulder as everything else on the shield.
  ctx.fillStyle = shade(typeof head === 'string' ? head : '#ffffff', 34);
  ctx.beginPath();
  ctx.moveTo(u - r, t);
  ctx.lineTo(u, t - r);
  ctx.lineTo(u, t - r * 0.4);
  ctx.lineTo(u - r * 0.45, t);
  ctx.closePath();
  ctx.fill();
}

// -------------------------------------------------------- signatures

/**
 * SPIKED BUCKLER — oiled hide stretched over a forged iron disc.
 * The whole design is the tension: the leather is pulled down onto the
 * umbo and CREASES radially out of it, a saddler runs a stitch line
 * around the edge to hold the facing to the boards, and the four
 * spikes are bedded on their own punched plates. Rung one, so nothing
 * here is precious — it is a well-made cheap thing, and it reads that
 * way on purpose.
 */
function sigBuckler(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  _fr: ShieldFrame,
  litU: number,
): void {
  // The creases: thin wedges thrown out from under the umbo. They fan
  // from a point, so they carry the dome without a single curve.
  ctx.fillStyle = shade(st.face, -26);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 24;
    const w = 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 0.26, Math.sin(a) * 0.26);
    ctx.lineTo(Math.cos(a + w) * 1.25, Math.sin(a + w) * 1.25);
    ctx.lineTo(Math.cos(a - w) * 1.25, Math.sin(a - w) * 1.25);
    ctx.closePath();
    ctx.fill();
  }
  // Each crease throws its own thread of light on the lit side.
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = shade(st.face, 30);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 24;
    if (Math.cos(a) * litU < 0.1) continue;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 0.28, Math.sin(a) * 0.28);
    ctx.lineTo(Math.cos(a - 0.05) * 1.25, Math.sin(a - 0.05) * 1.25);
    ctx.lineTo(Math.cos(a - 0.1) * 1.25, Math.sin(a - 0.1) * 1.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The saddler's stitch: short tangential marks holding the hide down
  // just inside the binding. It is the one detail that says "sewn".
  ctx.fillStyle = shade(st.face, -44);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const cu = Math.cos(a);
    const cs = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cu * 0.82 - cs * 0.05, cs * 0.82 + cu * 0.05);
    ctx.lineTo(cu * 0.82 + cs * 0.05, cs * 0.82 - cu * 0.05);
    ctx.lineTo(cu * 0.88 + cs * 0.05, cs * 0.88 - cu * 0.05);
    ctx.lineTo(cu * 0.88 - cs * 0.05, cs * 0.88 + cu * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  // Punched plates bedding the four spikes — the spikes themselves are
  // projected in the shell's own frame, past the rim, by drawSpikes.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cu = Math.cos(a) * 0.66;
    const cs = Math.sin(a) * 0.66;
    ctx.fillStyle = shade(st.rim, 22);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const b = (k / 6) * Math.PI * 2 + a;
      const x = cu + Math.cos(b) * 0.19;
      const y = cs + Math.sin(b) * 0.19;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(st.rim, 46);
    rivet(ctx, cu, cs, 0.06);
  }
}

/**
 * OAK KITESHIELD — five riven staves under bright bronze.
 * The staves are CROWNED (each board carries its own bevel of light),
 * the grain runs their length, and the charge is a hammered bronze
 * chevron: two bars meeting at a peak, riveted at all three terminals
 * with a rondel washer capping the joint. Rung two buys real metal on
 * the face, and the bronze is pitched bright enough that the shield
 * never merges into the wood it is made of.
 */
function sigOakKite(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  _fr: ShieldFrame,
  _litU: number,
): void {
  staves(ctx, st, st.planks ?? 5, 19);
  // Grain: long ticks running with the boards, never across them.
  ctx.fillStyle = shade(st.face, -26);
  for (let i = 0; i < 9; i++) {
    const u = -0.9 + i * 0.225;
    const t = -0.72 + ((i * 37) % 13) * 0.11;
    ctx.fillRect(u, t, 0.018, 0.46 + ((i * 17) % 5) * 0.1);
  }
  // A bronze foot-cap: the point of a kite is what gets driven into
  // the mud, so it is the one place the binding doubles.
  ctx.fillStyle = shade(st.rim, -14);
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.74);
  ctx.lineTo(0.3, 0.74);
  ctx.lineTo(0.1, 1.15);
  ctx.lineTo(-0.1, 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(st.rim, 12);
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.74);
  ctx.lineTo(-0.06, 0.74);
  ctx.lineTo(-0.1, 1.15);
  ctx.closePath();
  ctx.fill();

  // ---- the chevron, hammered from bar stock.
  // The bar is fitted INSIDE the binding: a kite narrows fast, so a
  // chevron drawn to full width runs off the boards and welds itself
  // to the rim. Arms end where the shield still has face to give them.
  const c = st.deviceColor ?? shade(st.rim, 30);
  const peak = -0.36;
  const arm = 0.4;
  const ax = 0.88;
  const w = 0.34;
  const bar = (o: number, tone: string): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(-ax, arm + o);
    ctx.lineTo(0, peak + o);
    ctx.lineTo(ax, arm + o);
    ctx.lineTo(ax, arm + w + o);
    ctx.lineTo(0, peak + w * 1.5 + o);
    ctx.lineTo(-ax, arm + w + o);
    ctx.closePath();
    ctx.fill();
  };
  bar(0.06, SEAM); // the shadow the bar throws on the boards
  bar(0, shade(c, -34));
  // The lit top edge of the bar: a hammered face catches one plane.
  ctx.fillStyle = shade(c, 26);
  ctx.beginPath();
  ctx.moveTo(-ax, arm);
  ctx.lineTo(0, peak);
  ctx.lineTo(ax, arm);
  ctx.lineTo(ax, arm + 0.1);
  ctx.lineTo(0, peak + 0.15);
  ctx.lineTo(-ax, arm + 0.1);
  ctx.closePath();
  ctx.fill();
  // Hammer marks: short facets stepping down each arm.
  ctx.fillStyle = shade(c, -14);
  for (let i = 1; i < 4; i++) {
    const f = i / 4;
    for (const sx of [-1, 1]) {
      const x = sx * ax * f;
      const y = arm + (peak - arm) * (1 - f);
      ctx.fillRect(x - 0.035, y + 0.09, 0.07, 0.14);
    }
  }
  // Rivets at both terminals, and the rondel capping the joint.
  ctx.fillStyle = shade(c, 44);
  rivet(ctx, -ax + 0.1, arm + 0.15, 0.065);
  rivet(ctx, ax - 0.1, arm + 0.15, 0.065);
  const rt = peak + 0.24;
  const disc = (r: number, tone: string): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = rt + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };
  disc(0.22, SEAM);
  disc(0.19, shade(c, -26));
  disc(0.14, shade(c, 14));
  ctx.fillStyle = shade(c, 50);
  rivet(ctx, 0, rt, 0.055);
}

/**
 * TOWER SHIELD — the fluted pavise, and the top of the ladder.
 * Seven flutes run crown to heel so the steel turns the light seven
 * times across its width; a deep enamelled pale is painted down the
 * middle and a raised spine riveted along it; two cross-bands, a brow
 * band following the arch, and cornerplates bolted over all four
 * heels. Its charge is not painted on — it is a bright lozenge PLATE
 * riveted to the enamel, standing proud of everything around it.
 */
function sigPavise(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  _fr: ShieldFrame,
  litU: number,
): void {
  // ---- the flutes. Alternating planes with a hard seam in every
  // valley: this is how flat fills read as corrugated steel.
  const k = 7;
  const w = 2.3 / k;
  for (let i = 0; i < k; i++) {
    const u0 = -1.15 + w * i;
    ctx.fillStyle = i % 2 ? shade(st.face, -24) : shade(st.face, 12);
    ctx.fillRect(u0, -1.15, w, 2.3);
    ctx.fillStyle = shade(st.face, 34);
    ctx.fillRect(u0 + w * (litU > 0 ? 0.62 : 0.12), -1.15, w * 0.2, 2.3);
    ctx.fillStyle = SEAM;
    ctx.fillRect(u0 - 0.011, -1.15, 0.022, 2.3);
  }

  // ---- the enamelled pale, laid over the flutes and hard-edged.
  const enamel = st.faceAlt ?? shade(st.face, -60);
  ctx.fillStyle = enamel;
  ctx.fillRect(-0.34, -1.15, 0.68, 2.3);
  ctx.fillStyle = shade(enamel, 20);
  ctx.fillRect(-0.34, -1.15, 0.1, 2.3);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.36, -1.15, 0.026, 2.3);
  ctx.fillRect(0.334, -1.15, 0.026, 2.3);
  // The raised spine down the enamel, holding one hard specular the
  // whole height of the shield — the line the eye follows first.
  ctx.fillStyle = shade(st.rim, 10);
  ctx.fillRect(-0.09, -1.15, 0.18, 2.3);
  ctx.fillStyle = shade(st.rim, 54);
  ctx.fillRect(-0.075, -1.15, 0.06, 2.3);
  ctx.fillStyle = SEAM;
  ctx.fillRect(0.09, -1.15, 0.024, 2.3);

  // ---- the fittings.
  band(ctx, st, -0.62, 0.15, 7, BRASS);
  band(ctx, st, 0.5, 0.15, 7, BRASS);
  // The brow: a band following the crown, where a pavise takes the
  // blows it is actually raised against.
  ctx.fillStyle = shade(st.rim, 8);
  ctx.fillRect(-1.15, -1.0, 2.3, 0.17);
  ctx.fillStyle = shade(st.rim, 32);
  ctx.fillRect(-1.15, -1.0, 2.3, 0.05);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.15, -0.83, 2.3, 0.026);
  // Cornerplates over the four heels — bolted iron where a carried
  // door gets set down and dragged.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.fillStyle = shade(st.rim, sy < 0 ? 20 : -8);
      ctx.beginPath();
      ctx.moveTo(sx * 1.15, sy * 1.15);
      ctx.lineTo(sx * 0.42, sy * 1.15);
      ctx.lineTo(sx * 1.15, sy * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SEAM;
      ctx.beginPath();
      ctx.moveTo(sx * 0.42, sy * 1.15);
      ctx.lineTo(sx * 1.15, sy * 0.5);
      ctx.lineTo(sx * 1.1, sy * 0.44);
      ctx.lineTo(sx * 0.36, sy * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = BRASS;
      rivet(ctx, sx * 0.78, sy * 0.92, 0.05);
    }
  }

  // ---- the charge: a lozenge plate, riveted on. Not heraldry painted
  // onto a board — a piece of bright steel a smith cut and fixed.
  const c = st.deviceColor ?? shade(st.rim, 40);
  const ty = -0.06;
  const lozenge = (r: number, tone: string): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(0, ty - 0.46 * r);
    ctx.lineTo(0.33 * r, ty);
    ctx.lineTo(0, ty + 0.46 * r);
    ctx.lineTo(-0.33 * r, ty);
    ctx.closePath();
    ctx.fill();
  };
  lozenge(1.14, SEAM);
  lozenge(1, shade(c, -46));
  // The plate's two cut planes: lit up-screen, shadowed below.
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(0, ty - 0.46);
  ctx.lineTo(0.33, ty);
  ctx.lineTo(0, ty);
  ctx.lineTo(-0.33, ty);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(c, -44);
  ctx.beginPath();
  ctx.moveTo(-0.33, ty);
  ctx.lineTo(0.33, ty);
  ctx.lineTo(0, ty + 0.46);
  ctx.closePath();
  ctx.fill();
  // A sunk centre, so the plate reads as struck rather than flat.
  ctx.fillStyle = shade(c, -78);
  ctx.beginPath();
  ctx.moveTo(0, ty - 0.11);
  ctx.lineTo(0.08, ty);
  ctx.lineTo(0, ty + 0.11);
  ctx.lineTo(-0.08, ty);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(c, 30);
  rivet(ctx, 0, ty - 0.36, 0.05);
  rivet(ctx, 0, ty + 0.36, 0.05);
}

/** The heraldic charge, cut in flat planes with one lit facet. */
function drawDevice(ctx: CanvasRenderingContext2D, st: ShieldStyle, fr: ShieldFrame): void {
  const dev = st.device ?? 'none';
  if (dev === 'none') return;
  const c = st.deviceColor ?? shade(st.rim, 30);
  const lit = shade(c, 30);
  const dk = shade(c, -34);
  // Charges sit high on a tall shield (the honor point), centered on a
  // round one — where a real device is placed to be seen over a rim.
  const cy = fr.shape === 'kite' || fr.shape === 'tower' ? -0.34 : -0.04;
  ctx.save();
  ctx.translate(0, cy);
  switch (dev) {
    case 'chevron': {
      // Two hammered bars meeting at a peak, with the underside dark.
      for (const [w, tone] of [[0.2, dk] as const, [0.15, c] as const]) {
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(-0.78, 0.4);
        ctx.lineTo(0, -0.34);
        ctx.lineTo(0.78, 0.4);
        ctx.lineTo(0.78 - w * 0.6, 0.4 + w);
        ctx.lineTo(0, -0.34 + w * 1.5);
        ctx.lineTo(-0.78 + w * 0.6, 0.4 + w);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = lit;
      ctx.beginPath();
      ctx.moveTo(-0.78, 0.4);
      ctx.lineTo(0, -0.34);
      ctx.lineTo(0, -0.26);
      ctx.lineTo(-0.72, 0.42);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamond': {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, -0.46);
      ctx.lineTo(0.36, 0);
      ctx.lineTo(0, 0.46);
      ctx.lineTo(-0.36, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lit;
      ctx.beginPath();
      ctx.moveTo(0, -0.46);
      ctx.lineTo(0, 0.46);
      ctx.lineTo(-0.36, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.moveTo(0, -0.16);
      ctx.lineTo(0.16, 0);
      ctx.lineTo(0, 0.16);
      ctx.lineTo(-0.16, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cross': {
      ctx.fillStyle = c;
      ctx.fillRect(-0.16, -0.52, 0.32, 1.04);
      ctx.fillRect(-0.56, -0.16, 1.12, 0.32);
      ctx.fillStyle = lit;
      ctx.fillRect(-0.16, -0.52, 0.11, 1.04);
      ctx.fillRect(-0.56, -0.16, 1.12, 0.1);
      break;
    }
    case 'crown': {
      // The house sigil: a banded crown with three points and a stone.
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-0.46, 0.2);
      ctx.lineTo(-0.46, -0.16);
      ctx.lineTo(-0.24, 0.02);
      ctx.lineTo(0, -0.36);
      ctx.lineTo(0.24, 0.02);
      ctx.lineTo(0.46, -0.16);
      ctx.lineTo(0.46, 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dk;
      ctx.fillRect(-0.46, 0.2, 0.92, 0.14);
      ctx.fillStyle = lit;
      ctx.beginPath();
      ctx.arc(0, -0.06, 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'moon': {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, 0, 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.face;
      ctx.beginPath();
      ctx.arc(0.2, -0.08, 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'star': {
      ctx.fillStyle = c;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 0.18 : 0.48;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'fang': {
      ctx.fillStyle = c;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 0.34, -0.4);
        ctx.lineTo(sx * 0.1, 0.42);
        ctx.lineTo(sx * 0.02, -0.36);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/**
 * The back: the honest inside. Staves and cross-battens on wood, a
 * plate core on metal, then the ENARMES — the two leather loops the
 * forearm threads — the padded elbow cup, and the guige over the
 * shoulder. This is the side most games never draw at all.
 */
function drawBack(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  const base = shade(st.face, -30);
  ctx.fillStyle = base;
  ctx.fillRect(-1.15, -1.15, 2.3, 2.3);
  // The grazing-angle law holds on the inside too.
  if (fr.open < 0.24) return;
  if (st.material === 'wood') {
    // Unplaned boards: the inside of a shield is where the carpentry
    // shows, so the seams are wider and the battens are real timber
    // with a lit top edge and a shadow thrown under them.
    const k = st.planks ?? 4;
    for (let i = 0; i < k; i++) {
      const u0 = -1 + (2 * i) / k;
      ctx.fillStyle = SEAM;
      ctx.fillRect(u0 - 0.015, -1.15, 0.03, 2.3);
    }
    for (const t of [-0.52, 0.36]) {
      ctx.fillStyle = SEAM;
      ctx.fillRect(-1.15, t + 0.16, 2.3, 0.05);
      ctx.fillStyle = shade(base, 14);
      ctx.fillRect(-1.15, t, 2.3, 0.16);
      ctx.fillStyle = shade(base, 34);
      ctx.fillRect(-1.15, t, 2.3, 0.05);
      // Pegs holding the batten into the boards.
      ctx.fillStyle = shade(base, -18);
      for (let i = 0; i < 4; i++) rivet(ctx, -0.66 + i * 0.44, t + 0.08, 0.04);
    }
  } else {
    // A plate core, ribbed vertically — and the rivets that hold the
    // face's fittings come THROUGH, peened flat on this side. The
    // honesty of that is the whole reason to draw a back at all.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? shade(base, 16) : shade(base, -12);
      ctx.fillRect(-1.15 + i * 0.46, -1.15, 0.46, 2.3);
    }
    ctx.fillStyle = shade(base, -20);
    ctx.fillRect(-1.15, -0.1, 2.3, 0.2);
    ctx.fillStyle = shade(base, 26);
    for (const t of [-0.62, 0.5]) {
      for (let i = 0; i < 7; i++) rivet(ctx, -0.78 + i * 0.26, t + 0.08, 0.04);
    }
  }
  // THE HOLLOW UMBO. A fist-gripped shield is punched, not solid: the
  // dome that stands proud of the face is a CAVITY on this side, and
  // the hand lives inside it. Drawing that hollow is the difference
  // between a back and the back of THIS shield.
  if (st.boss && !METRIC[fr.shape].strap) {
    const cup = (r: number, tone: string): void => {
      ctx.fillStyle = tone;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };
    // Kept small and read as METAL in shadow, not as a hole: a cavity
    // pitched at the house dark punches a black window through the
    // middle of the shield and swallows the grip bar crossing it.
    cup(0.32, shade(st.rim, -12));
    cup(0.26, shade(st.rim, -38));
  }
  // The inside is a bowl: it darkens toward the middle, opposite the
  // face's dish — the single tell that we are seeing the other side.
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.6, -1.1, 1.2, 2.2);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(litU > 0 ? 0.6 : -1.1, -1.1, 0.5, 2.2);
  ctx.globalAlpha = 1;
  drawEnarmes(ctx, st, fr);
}

/** The straps themselves — also painted OVER the forearm, see below. */
function drawEnarmes(ctx: CanvasRenderingContext2D, st: ShieldStyle, fr: ShieldFrame): void {
  const leather = st.strapColor ?? '#4a3524';
  const strap = METRIC[fr.shape].strap;
  if (!strap) {
    // A fist-gripped shield hangs on one bar behind the umbo.
    ctx.fillStyle = leather;
    ctx.fillRect(-0.62, -0.12, 1.24, 0.24);
    ctx.fillStyle = shade(leather, 18);
    ctx.fillRect(-0.62, -0.12, 1.24, 0.07);
    ctx.fillStyle = SEAM;
    ctx.fillRect(-0.2, -0.13, 0.4, 0.26);
    return;
  }
  for (const [t, w] of [
    [0.16, 0.2] as const,
    [-0.3, 0.17] as const,
  ]) {
    ctx.fillStyle = leather;
    ctx.fillRect(-0.86, t, 1.5, w);
    ctx.fillStyle = shade(leather, 20);
    ctx.fillRect(-0.86, t, 1.5, w * 0.34);
    ctx.fillStyle = SEAM;
    ctx.fillRect(-0.86, t + w, 1.5, 0.03);
    // Buckle plates pinning each end into the boards.
    ctx.fillStyle = shade(st.rim, 8);
    ctx.fillRect(-0.9, t - 0.03, 0.14, w + 0.06);
    ctx.fillRect(0.6, t - 0.03, 0.14, w + 0.06);
  }
  // The guige: the long strap that carries the weight off the neck.
  ctx.fillStyle = shade(leather, -10);
  ctx.save();
  ctx.rotate(-0.5);
  ctx.fillRect(-0.2, -1.3, 0.13, 2.6);
  ctx.restore();
}

/** The bound rim, as a real band of metal around the face. */
function drawRim(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  outline: number[],
  n: number,
  litU: number,
): void {
  const band = st.material === 'wood' ? 0.1 : 0.062;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = outline[i * 2]!;
    const t = outline[i * 2 + 1]!;
    if (i === 0) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  for (let i = n - 1; i >= 0; i--) {
    const u = outline[i * 2]! * (1 - band);
    const t = outline[i * 2 + 1]! * (1 - band);
    if (i === n - 1) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  ctx.fillStyle = st.rim;
  ctx.fill('evenodd');
  // The binding's own light: the up-screen-lit quarter brighter, so
  // the band reads as raised metal wrapping a curve. The ring path is
  // REBUILT under the clip — clipping consumes the current path, and
  // re-filling it after painted the clip rectangle itself across half
  // the body (the white slab that ate the first pass).
  ctx.save();
  ctx.beginPath();
  ctx.rect(litU > 0 ? 0 : -1.12, -1.12, 1.12, 1.5);
  ctx.clip();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = outline[i * 2]!;
    const t = outline[i * 2 + 1]!;
    if (i === 0) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  for (let i = n - 1; i >= 0; i--) {
    const u = outline[i * 2]! * (1 - band);
    const t = outline[i * 2 + 1]! * (1 - band);
    if (i === n - 1) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#ffffff';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.globalAlpha = 1;
  // The seam under the binding: one dark line where the metal laps
  // over the field. Without it the rim is a color change; with it the
  // rim is a separate PIECE, bolted over the boards.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = outline[i * 2]! * (1 - band);
    const t = outline[i * 2 + 1]! * (1 - band);
    if (i === 0) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  for (let i = n - 1; i >= 0; i--) {
    const u = outline[i * 2]! * (1 - band - 0.035);
    const t = outline[i * 2 + 1]! * (1 - band - 0.035);
    if (i === n - 1) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  ctx.fillStyle = SEAM;
  ctx.globalAlpha = 0.55;
  ctx.fill('evenodd');
  ctx.globalAlpha = 1;
  // Rivets: one at every facet corner of the binding — the count IS
  // the craftsmanship read, and it survives to small zooms.
  if (st.studs) {
    ctx.fillStyle = shade(st.rim, 34);
    const r = 0.052;
    for (let i = 0; i < n; i++) {
      const u = outline[i * 2]! * (1 - band * 0.5);
      const t = outline[i * 2 + 1]! * (1 - band * 0.5);
      ctx.beginPath();
      ctx.moveTo(u - r, t);
      ctx.lineTo(u, t - r);
      ctx.lineTo(u + r, t);
      ctx.lineTo(u, t + r);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** The umbo: a faceted dome standing proud of the face. */
function drawBoss(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  hxU: number,
  hyU: number,
  nxU: number,
  nyU: number,
  crown: number,
): void {
  const boss = st.boss!;
  const strap = METRIC[fr.shape].strap;
  const ru = strap ? 0.15 : 0.26;
  const h = strap ? 0.5 : 0.85; // how far it stands off the face
  const bx = nxU * (crown + h);
  const by = nyU * (crown + h);
  // The dome's screen footprint follows the plane: it foreshortens
  // with the face across the u axis and keeps its height along t.
  const rx = Math.hypot(hxU, hyU) * ru;
  const ax = (hxU / (Math.hypot(hxU, hyU) || 1)) * rx;
  const ay = (hyU / (Math.hypot(hxU, hyU) || 1)) * rx;
  const ry = fr.hh * ru;
  ctx.save();
  ctx.translate(bx, by);
  // A hexagonal umbo — the low-poly dome, never a circle.
  ctx.fillStyle = SEAM;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const u = Math.cos(a);
    const t = Math.sin(a);
    const x = u * ax * 1.16;
    const y = u * ay * 1.16 + t * ry * 1.16;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = boss;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const u = Math.cos(a);
    const t = Math.sin(a);
    if (i === 0) ctx.moveTo(u * ax, u * ay + t * ry);
    else ctx.lineTo(u * ax, u * ay + t * ry);
  }
  ctx.closePath();
  ctx.fill();
  // The crown facet: one hard highlight up-screen-left, the glint that
  // tells the eye this is polished metal and not a painted circle.
  ctx.fillStyle = shade(boss, 46);
  ctx.beginPath();
  ctx.moveTo(-ax * 0.42, -ay * 0.42 - ry * 0.5);
  ctx.lineTo(ax * 0.1, ay * 0.1 - ry * 0.62);
  ctx.lineTo(-ax * 0.1, -ay * 0.1 - ry * 0.12);
  ctx.lineTo(-ax * 0.5, -ay * 0.5 - ry * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Forged punch spikes on the quarters — the buckler's teeth. */
function drawSpikes(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  hxU: number,
  hyU: number,
  nxU: number,
  nyU: number,
  crown: number,
): void {
  // Forged from the SHIELD's iron, never from the bright umbo — spikes
  // pitched at boss brightness read as white shards thrown off the
  // face instead of teeth grown out of the rim.
  const c = shade(st.rim, 18);
  const bx = nxU * (crown + 0.3);
  const by = nyU * (crown + 0.3);
  const px = (u2: number): number => u2 * hxU + bx;
  const py = (u2: number, t2: number): number => u2 * hyU + t2 * fr.hh + by;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cu = Math.cos(a);
    const ct2 = Math.sin(a);
    // Rooted under the binding and tipped a short way past it. Kept
    // SHORT and narrow on purpose: a buckler's spikes are punched
    // studs, not a crown of blades, and long ones stop reading as part
    // of the shield the moment the plane turns.
    const root = 0.9;
    const tip = 1.2;
    const wu = -ct2 * 0.125;
    const wt = cu * 0.125;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(cu * root + wu), py(cu * root + wu, ct2 * root + wt));
    ctx.lineTo(px(cu * tip), py(cu * tip, ct2 * tip));
    ctx.lineTo(px(cu * root - wu), py(cu * root - wu, ct2 * root - wt));
    ctx.closePath();
    ctx.fill();
    // A lit facet down one side: forged steel, never a paper triangle.
    ctx.fillStyle = shade(c, 30);
    ctx.beginPath();
    ctx.moveTo(px(cu * root + wu), py(cu * root + wu, ct2 * root + wt));
    ctx.lineTo(px(cu * tip), py(cu * tip, ct2 * tip));
    ctx.lineTo(px(cu * root + wu * 0.15), py(cu * root + wu * 0.15, ct2 * root + wt * 0.15));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The strap pass, painted AFTER the arm when the bearer is turned
 * away: the forearm goes THROUGH the enarmes, so the leather crosses
 * over the sleeve instead of the arm floating on the boards.
 */
export function drawShieldStraps(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  hurt: boolean,
): void {
  if (hurt || !fr.seeBack || fr.open < 0.12) return;
  const cθ = Math.cos(fr.theta);
  const sθ = Math.sin(fr.theta);
  const hxU = fr.oside * cθ * fr.hw;
  const hyU = GROUND_K * sθ * fr.hw;
  const nxU = fr.sgnP * sθ * fr.depth;
  const nyU = GROUND_K * cθ * fr.depth;
  const crown = -0.5 - fr.curve;
  const leather = st.strapColor ?? '#4a3524';
  ctx.save();
  ctx.translate(fr.cx, fr.cy);
  ctx.rotate(fr.tilt);
  ctx.translate(nxU * crown, nyU * crown);
  ctx.transform(hxU, hyU, 0, fr.hh, 0, 0);
  const strap = METRIC[fr.shape].strap;
  if (strap) {
    for (const [t, w] of [
      [0.16, 0.2] as const,
      [-0.3, 0.17] as const,
    ]) {
      ctx.fillStyle = leather;
      ctx.fillRect(-0.86, t, 1.5, w);
      ctx.fillStyle = shade(leather, 20);
      ctx.fillRect(-0.86, t, 1.5, w * 0.34);
      ctx.fillStyle = SEAM;
      ctx.fillRect(-0.86, t + w, 1.5, 0.03);
    }
  } else {
    ctx.fillStyle = leather;
    ctx.fillRect(-0.62, -0.12, 1.24, 0.24);
    ctx.fillStyle = shade(leather, 18);
    ctx.fillRect(-0.62, -0.12, 1.24, 0.07);
  }
  ctx.restore();
}

/** True when an offhand kind is a shield and belongs to this dialect. */
export function isShieldKind(kind: string): kind is 'buckler' | 'kite' | 'tower' {
  return kind === 'buckler' || kind === 'kite' || kind === 'tower';
}

/**
 * A free-standing shield in an arbitrary frame — the inventory icon and
 * the fallen shield of a ragdoll both come through here, so a shield
 * looks like ITSELF wherever it appears. Nothing is re-authored: the
 * icon is the world art, turned three-quarters on and lit by the same
 * sun.
 */
export function drawShieldAt(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  o: {
    cx: number;
    cy: number;
    /** Half-height in the caller's units; the width follows the shape. */
    size: number;
    /** Plane yaw: 0 square to the eye, π/2 edge-on, π showing its back. */
    theta: number;
    tilt: number;
    /** Which way the design's outer edge runs (+1 screen-right). */
    oside?: number;
    hurt?: boolean;
    nowMs?: number;
  },
): void {
  const m = METRIC[st.shape];
  const oside = o.oside ?? 1;
  const hh = o.size;
  const hw = (o.size * m.hw) / m.hh;
  drawShield(
    ctx,
    st,
    {
      shape: st.shape,
      cx: o.cx,
      cy: o.cy,
      theta: o.theta,
      tilt: o.tilt,
      oside,
      sgnP: -oside,
      hw,
      hh,
      depth: (o.size * m.depth) / m.hh,
      curve: st.curve ?? 0.5,
      gripX: o.cx,
      gripY: o.cy,
      poleX: 0,
      poleY: 1,
      seeBack: Math.cos(o.theta) < 0,
      open: Math.abs(Math.cos(o.theta)),
      front: true,
      sling: 0,
    },
    o.hurt ?? false,
    o.nowMs ?? 0,
  );
}

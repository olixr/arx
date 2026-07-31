import { markPulse, SLOT_GLINT_PHASE, type ArxMark } from './wornLight.js';
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

/**
 * THE GREATSHIELD CLASS. Above the pavise the roster stops sharing a
 * silhouette: a tank's shield is the first thing anyone sees of them,
 * and three top-tier walls that differ only in paint are three copies
 * of the same shield. `wall`, `bastion` and `aegis` are all "a tower
 * shield" to the equipment system, and three different objects to the
 * eye — a calved slab, a battlement, and a crowned greatshield.
 */
export type ShieldShape =
  | 'buckler'
  | 'round'
  | 'heater'
  | 'kite'
  | 'tower'
  | 'wall'
  | 'bastion'
  | 'aegis'
  | 'targe'
  | 'ribwall'
  | 'thorn';

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
  /** THE WORN LIGHT: the bonded working, overlaid per instance. */
  arx?: ArxMark;
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
  /**
   * THE SPIKE PLAN. Spikes are not trim — they are the weapon half of
   * a shield's character, and a goblin's bent nails, a wolf-earned
   * fang crown and a champion's bone spurs must not all wear the same
   * four studs on the quarters. Angles are design-space (−π/2 = the
   * crown); unset = the quarters, which is the buckler's honest
   * default. All of it still roots on the OUTLINE via reachAlong.
   */
  spikeAngles?: number[];
  /** Tip reach past the binding, 1 = flush. Default 1.2. */
  spikeLen?: number;
  /** Half-width of a spike's root. Default 0.125. */
  spikeW?: number;
  /** Spike metal. Default: forged from the rim. Bone spurs are not. */
  spikeColor?: string;
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
   * THE GOBLIN'S — every nail bent twice, and it holds anyway. A round
   * of scavenged boards, one of them visibly the wrong board, patched
   * with a rusty plate that doesn't match and studded with SEVEN iron
   * nails driven through from behind at whatever angle they went in.
   * The dented pot-lid boss is the one piece of real metal on it.
   * Crude is the craft: nothing here is parallel, and that is the
   * signature.
   */
  gobnail_warboard: {
    shape: 'round',
    material: 'wood',
    face: '#6b5233',
    faceAlt: '#57422a',
    rim: '#66513a',
    boss: '#9aa1ab',
    device: 'none',
    studs: true,
    spikes: true,
    // Nails, not spikes: many, thin, and none of them agree on an
    // angle — the plan IS the crookedness.
    spikeAngles: [-1.9, -1.1, -0.4, 0.5, 1.3, 2.3, 3.0],
    spikeLen: 1.16,
    spikeW: 0.05,
    spikeColor: '#7d838f',
    planks: 3,
    curve: 0.55,
    strapColor: '#4a3524',
    sig: 'warboard',
    tier: 2,
  },
  /**
   * WOLF-EARNED — the bite marks are the design. A leather-faced targe
   * with a wedge already torn out of its edge, three claw-rake gashes
   * across the face, and a crown of five bone fangs set around the top
   * of the binding: the teeth that tried, kept. Drops from the packs
   * and their matriarch, and looks like it was taken from them.
   */
  wolfjaw_targe: {
    shape: 'targe',
    material: 'wood',
    face: '#7a5a38',
    faceAlt: '#5f452c',
    rim: '#6a7080',
    boss: '#565c68',
    device: 'none',
    studs: true,
    spikes: true,
    // A fanged crown across the top arc — the maw read.
    spikeAngles: [-2.5, -2.0, -1.57, -1.14, -0.64],
    spikeLen: 1.34,
    spikeW: 0.09,
    spikeColor: '#e8e2d0',
    curve: 0.5,
    strapColor: '#4a3524',
    sig: 'wolfjaw',
    tier: 3,
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
  /**
   * RUNG FOUR — a slab of the glacier, carried. Where the pavise is a
   * built thing, this one reads as CALVED: a squared wall of pale steel
   * under a deep glacier chief, three icicle teeth hanging off the
   * chief's edge into the field, and a rime-white star struck in the
   * crown. The rim is the brightest metal on the ladder so far — the
   * whole shield is cold light — and the umbo is a bead of clear ice.
   */
  frostplate_greatshield: {
    shape: 'wall',
    material: 'steel',
    face: '#9db6cc',
    faceAlt: '#2c4a6b',
    field: 'chief',
    rim: '#dbe9f4',
    boss: '#eaf7ff',
    device: 'star',
    deviceColor: '#f2fbff',
    studs: true,
    curve: 0.28,
    strapColor: '#3a4652',
    sig: 'frost',
    tier: 4,
  },
  /**
   * RUNG FIVE — the fortress you wear. A battlemented crown steps down
   * to the shoulders, the walls run dead straight, and the heel comes
   * to a point you can set in the dirt and lean on. Brass-bound
   * gunmetal, to the same recipe as the plate it is issued with, and
   * across the whole face a broad brass cross — the bulwark's own
   * daylight — with a brass umbo standing proud at the crossing.
   */
  bulwark_bastion: {
    shape: 'bastion',
    material: 'steel',
    face: '#5a6270',
    faceAlt: '#454d5a',
    field: 'quarter',
    // The binding is DARK brass and the cross is bright: both are the
    // set's one warm metal, separated by value instead of hue, or the
    // crenellated crown and the charge merge into one brass jumble
    // exactly where the eye lands first.
    rim: '#7d6330',
    boss: '#d8b76a',
    device: 'cross',
    deviceColor: BRASS,
    studs: true,
    curve: 0.32,
    strapColor: '#3f3830',
    sig: 'bulwark',
    tier: 5,
  },
  /**
   * THE CHAMPION'S OWN — grown, not forged. The Skeleton Champion's
   * wall: fused ribs standing in a scalloped silhouette (every bump on
   * the edge is a rib end), a black iron band bolted across where a
   * living smith repaired a dead thing's shield, twin dark fangs for a
   * charge, and bone spurs at the shoulders and flanks that are still
   * lengthening. Bone palette against black iron — nothing else in the
   * roster is within a county of the look.
   */
  bonespur_ward: {
    shape: 'ribwall',
    material: 'iron',
    face: '#d9d2bd',
    faceAlt: '#b8ac8e',
    rim: '#4a505c',
    boss: '#5a616e',
    device: 'fang',
    deviceColor: '#3a3f4a',
    studs: true,
    spikes: true,
    // Spurs off the shoulders and the mid flanks — where bone grows.
    spikeAngles: [-2.62, -0.52, 0, Math.PI],
    spikeLen: 1.3,
    spikeW: 0.08,
    spikeColor: '#e8e2d0',
    curve: 0.35,
    strapColor: '#3f3830',
    sig: 'bonespur',
    tier: 5,
  },
  /**
   * THE ROYAL IMPALEMENT — Silverfall's own heraldry, carried. A
   * knightly heater impaled per pale: the King's crimson on the dexter
   * half, the Queen's moonpale on the sinister, a gold crown over the
   * seam, and a hex-cut moonstone set at the heart where the two
   * houses meet. Ivory-gold binding. No spikes, no teeth — this one is
   * pure ceremony that happens to stop swords.
   */
  kingsward: {
    shape: 'heater',
    material: 'steel',
    face: '#8a2431',
    faceAlt: '#c9d2e4',
    field: 'pale',
    rim: '#d8b76a',
    boss: '#dfe6f4',
    device: 'crown',
    deviceColor: '#e6c36a',
    studs: true,
    curve: 0.3,
    strapColor: '#5a4a2a',
    sig: 'kingsward',
    tier: 5,
  },
  /**
   * THE DREADFORGE THORNWALL — black steel and gold thorns, for the
   * tank whose answer is the shield itself. A waisted angular wall
   * with a ground-spike heel forged into the silhouette, gilded thorns
   * at the shoulders and flanks, one broad gold bend across the black,
   * and a black diamond riveted at the crossing. The dreadforge rule:
   * everything bright on it is a warning.
   */
  dreadforge_thornwall: {
    shape: 'thorn',
    material: 'steel',
    face: '#3a3d46',
    faceAlt: '#23252c',
    field: 'bend',
    rim: BRASS,
    boss: '#d8b76a',
    device: 'diamond',
    deviceColor: '#23252c',
    studs: true,
    spikes: true,
    spikeAngles: [-2.44, -0.7, 0.15, 2.99],
    spikeLen: 1.32,
    spikeW: 0.1,
    curve: 0.32,
    strapColor: '#3f3830',
    sig: 'thornwall',
    tier: 5,
  },
  /**
   * RUNG SIX — the last rung, and it is meant to stop conversation. A
   * crowned greatshield: an apex at the crown, shoulders that FLARE
   * wider than the crown does, and a long taper to a point at the
   * heel — a silhouette no other shield in the game has. Eight rays of
   * gold and ivory strike out from a white-hot umbo, four gilded rays
   * escape the binding entirely at the quarters, and the rim is ivory
   * so the whole thing carries its own daylight.
   *
   * This is the top of the ladder. Nothing above it is planned, and
   * everything on it is spent on ONE idea — the sun — instead of on a
   * fifth kind of fitting.
   */
  sunforged_aegis: {
    shape: 'aegis',
    material: 'steel',
    face: '#d4a43c',
    // The ivory ray is a shade UNDER the ivory binding on purpose: the
    // rim has to stay the brightest metal on the piece, or the rays run
    // straight into it and the shield loses its own edge.
    faceAlt: '#e6d3a6',
    field: 'quarter',
    rim: '#f0e2bd',
    boss: '#fff8e4',
    device: 'star',
    deviceColor: '#fff8e4',
    studs: true,
    spikes: true,
    curve: 0.34,
    strapColor: '#5a4a2a',
    sig: 'sunforged',
    tier: 6,
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
  // Faceted discs — few, wide facets with a flat one dead top. An
  // 8-gon reads as a shield; a 14-gon reads as a circle, and a circle
  // is a smooth 3D form, which is not what this game is made of.
  buckler: ngon(8, -Math.PI / 2 + Math.PI / 8),
  round: ngon(10, -Math.PI / 2 + Math.PI / 10),
  // The knightly heater: flat top, cut shoulders, the belly falling to
  // a point in three straight runs.
  heater: [
    -0.9, -1, 0.9, -1, 1.0, -0.55, 0.86, 0.16, 0.44, 0.74, 0, 1, -0.44, 0.74,
    -0.86, 0.16, -1.0, -0.55,
  ],
  // The Norman almond: a cut crown over a long taper that arrives at a
  // real POINT. Ten vertices, every one of them a corner you can see.
  kite: [
    0, -1, 0.62, -0.78, 0.95, -0.3, 0.82, 0.28, 0.44, 0.72, 0, 1, -0.44, 0.72,
    -0.82, 0.28, -0.95, -0.3, -0.62, -0.78,
  ],
  // The pavise: a cut crown, straight walls, clipped heels.
  tower: [
    0, -1, 0.72, -0.88, 1.0, -0.5, 1.0, 0.62, 0.7, 1, -0.7, 1, -1.0, 0.62,
    -1.0, -0.5, -0.72, -0.88,
  ],
  // The calved slab: a flat crown, walls that never taper, a flat heel,
  // and one clipped corner at each of the four turns. The squarest
  // thing in the roster on purpose — it is a piece of a wall.
  wall: [
    -0.82, -1, 0.82, -1, 1.0, -0.78, 1.0, 0.8, 0.8, 1, -0.8, 1, -1.0, 0.8,
    -1.0, -0.78,
  ],
  // The battlement: a raised center merlon between two dropped
  // shoulders, straight walls, and a heel cut to a shallow point. The
  // notch in the crown is the whole silhouette — it reads as
  // architecture from across a field.
  bastion: [
    -0.56, -1, 0.56, -1, 0.56, -0.88, 1.0, -0.88, 1.0, 0.5, 0.62, 0.9, 0, 1.0,
    -0.62, 0.9, -1.0, 0.5, -1.0, -0.88, -0.56, -0.88,
  ],
  // The crowned greatshield: an apex at the crown and shoulders that
  // FLARE wider than the crown — the one outline here whose widest
  // point is not its middle — falling in a long taper to a point.
  aegis: [
    0, -1, 0.46, -0.86, 1.0, -0.62, 0.92, -0.1, 0.66, 0.5, 0, 1, -0.66, 0.5,
    -0.92, -0.1, -1.0, -0.62, -0.46, -0.86,
  ],
  // The bitten targe: a rugged ten-facet round with a WEDGE torn out
  // of the upper-right edge. The notch is the whole story — a shield
  // something has already been at, and kept anyway.
  targe: [
    -0.17, -0.98, 0.5, -0.85, 0.38, -0.52, 0.92, -0.4, 1.0, 0.17, 0.6, 0.8,
    0, 1.0, -0.6, 0.8, -1.0, 0.17, -0.92, -0.5,
  ],
  // The rib wall: a squared crown over SCALLOPED sides — every bump a
  // rib end — tapering to a bone heel. The silhouette is the anatomy.
  ribwall: [
    -0.6, -1, 0.6, -1, 0.95, -0.72, 0.72, -0.4, 0.95, -0.08, 0.72, 0.24,
    0.88, 0.55, 0.4, 0.9, 0, 1, -0.4, 0.9, -0.88, 0.55, -0.72, 0.24,
    -0.95, -0.08, -0.72, -0.4, -0.95, -0.72,
  ],
  // The thornwall: a waisted angular wall whose walls step IN and back
  // OUT — an aggressive silhouette even before the thorns land on it —
  // ending in a ground-spike heel forged into the outline itself.
  thorn: [
    -0.7, -1, 0.7, -1, 1.0, -0.62, 0.86, 0.05, 1.0, 0.52, 0.5, 0.92,
    0, 1.14, -0.5, 0.92, -1.0, 0.52, -0.86, 0.05, -1.0, -0.62,
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
  // The greatshield class. Each rung is a little more shield than the
  // last — measured against the rig, `aegis` spans shoulder line to
  // mid-shin, which is as far as a shield can grow before the legs
  // stop reading as legs.
  wall: { hw: 0.205, hh: 0.33, hang: -0.07, depth: 0.062, strap: true, fwdK: -0.015, twistK: -0.05 },
  bastion: { hw: 0.195, hh: 0.335, hang: -0.07, depth: 0.062, strap: true, fwdK: -0.015, twistK: -0.05 },
  aegis: { hw: 0.2, hh: 0.35, hang: -0.06, depth: 0.064, strap: true, fwdK: -0.02, twistK: -0.05 },
  // The bitten targe carries like a round — fist-gripped, angled out.
  targe: { hw: 0.165, hh: 0.165, hang: -0.22, depth: 0.036, strap: false, fwdK: 0.04, twistK: 0.12 },
  // The Champion's rib wall: kite-tall, worn on the arm.
  ribwall: { hw: 0.17, hh: 0.3, hang: -0.1, depth: 0.056, strap: true, fwdK: -0.01, twistK: -0.03 },
  // The thornwall: bastion class, and its heel spike wants ground room.
  thorn: { hw: 0.18, hh: 0.32, hang: -0.08, depth: 0.06, strap: true, fwdK: -0.015, twistK: -0.05 },
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
  // THE FOREARM LAW: seen from behind, a carried shield rides where
  // the forearm carries it — mid-torso, top rim by the shoulder — not
  // hanging at the hip. Without this rise the away facings drew the
  // boards over the LEGS, which read as a shield strapped to the
  // bearer's back(side) instead of hanging off a bent arm.
  let lift = -0.03 * guard - 0.16 * Math.max(0, -o.fy);
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
  // THE CLEAR-OF-THE-RIBS LAW: in the mid-band between face-on and
  // profile (the three-quarter camera facings) the forward reach runs
  // diagonally ACROSS the screen while the |fy| across-term has gone
  // small — the narrowing slab landed on the torso column and merged
  // with the body's silhouette ("cutting off the body", the user's
  // catch). A dedicated lateral clearance, peaking in that band and
  // zero at both pure facings, keeps the boards beside the ribs where
  // the carrying arm actually is.
  const clearBand =
    Math.max(0, Math.min(1, o.fy / 0.15)) * Math.max(0, Math.min(1, (0.7 - o.fy) / 0.25));
  const clearX = 0.14 * Math.abs(o.fx) * clearBand;
  let cx =
    o.x +
    o.fx * fwd * s * o.wS +
    oside * (Math.abs(o.fy) * lat + clearX) * s * o.wS;
  // The across-the-body offset keeps the FULL ground drop: side-on it
  // is what carries the shield onto the near side of the body, where
  // the rig already says the off arm lives — and that separation is
  // what keeps an edge-on shield from merging into the sword sharing
  // its screen column. Only the forward REACH is trimmed (see above).
  // The across-the-body depth drop is a NEAR-side fact: facing the
  // camera the off arm is on the near side and the drop carries the
  // shield toward the eye (down-screen). Facing AWAY the off arm is
  // the FAR side — deeper into the scene — so the drop fades out
  // rather than pulling the boards down over the legs (the away-
  // diagonal bug: the shield read as strapped behind the knees).
  const nearK = 1 + Math.min(0, o.fy) * 0.75;
  let cy =
    chestY + o.fy * fwd * s * CARRY_DROP + GROUND_K * Math.abs(o.fx) * lat * s * nearK + lift * s;
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

  // ---- THE SHIELD WEARS ITS OWN OUTLINE.
  //
  // The renderer's outline "shader" dilates the whole BODY silhouette,
  // so it rings the shield only where the shield sticks out past the
  // bearer. Across the torso — which is most of a raised shield — the
  // boards met the chest with no line at all and the two shapes read
  // as one blob. A shield is a separate object held in front of a
  // person, and in this game every separate object is ringed. So it
  // strikes its own, in the world's outline colour, at the same weight
  // the dilate uses: on the FAR ring before the wall buries it, and on
  // the NEAR ring once the art is down.
  // PROPORTIONAL ONLY — never an absolute pixel floor. The rig paints
  // in screen pixels but the inventory icons paint in a UNIT SQUARE
  // (renderIcon scales the whole context by the icon's size), so a
  // `Math.max(1.3, …)` floor became a stroke wider than the entire
  // icon and swallowed all three shields whole. Anything given a
  // lineWidth in this file has to be expressed in the shield's own
  // units for both callers to survive it.
  const ol = fr.hh * 0.062;
  const strokeRing = (ring: Float64Array): void => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.moveTo(ring[0]!, ring[1]!);
      else ctx.lineTo(ring[i * 2]!, ring[i * 2 + 1]!);
    }
    ctx.closePath();
    ctx.stroke();
  };
  if (!hurt) {
    ctx.strokeStyle = SEAM;
    ctx.lineWidth = ol;
    ctx.lineJoin = 'round';
    strokeRing(RING_FAR);
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

  // ---- the near ring. Edge-on there is no face left to paint: the
  // wall above IS the shield, and a bright crest line finishes it.
  if (fr.open < 0.07) {
    if (!hurt) {
      ctx.strokeStyle = shade(st.rim, 46);
      ctx.lineWidth = fr.depth * 0.3;
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
  else drawFace(ctx, st, fr, litU);
  ctx.restore();

  // ---- the bound rim: a real band around the face, not a stroke.
  drawRim(ctx, st, fr, outline, n);
  ctx.restore();

  if (!hurt) {
    ctx.strokeStyle = SEAM;
    ctx.lineWidth = ol;
    ctx.lineJoin = 'round';
    strokeRing(RING_NEAR);
  }

  // ---- the umbo stands PROUD of the face, so it is projected in the
  // local frame with its own dome height — at profile it survives as a
  // bump on the silhouette, which is exactly what a real boss does.
  if (st.boss && !fr.seeBack) drawBoss(ctx, st, fr, hxU, hyU, nxU, nyU, crown);
  if (st.spikes && !hurt) drawSpikes(ctx, st, fr, outline, hxU, hyU, nxU, nyU, crown);
  if (st.arx && !hurt) drawArxFace(ctx, st.arx, fr, hxU, hyU, nxU, nyU, crown, nowMs);
  ctx.restore();
}

/**
 * THE RUNE FACE — the offhand's channel. A ring of sigil ticks laid ON
 * the shield's near face, following the same projection the charge and
 * the boss use, so the ring foreshortens with the plane instead of
 * floating in front of it as a flat circle.
 *
 * The offhand gets the largest, calmest mark in the whole grammar
 * because it has the largest, flattest surface to carry one, and
 * because a shield is a thing you present: light on it should read as
 * deliberate heraldry, not as a leak.
 *
 * Drawn only on the near face. A ring painted while the bearer's back
 * is turned would be sitting on the straps.
 */
function drawArxFace(
  ctx: CanvasRenderingContext2D,
  mark: ArxMark,
  fr: ShieldFrame,
  hxU: number,
  hyU: number,
  nxU: number,
  nyU: number,
  crown: number,
  nowMs: number,
): void {
  if (fr.seeBack) return;
  const a = markPulse(mark, nowMs, SLOT_GLINT_PHASE.offhand ?? 0, 0.6);
  if (a <= 0.02) return;
  // The face's own basis: `hxU/hyU` runs across the plane, `nxU/nyU`
  // stands out of it. Every fitting on this shield is placed through
  // these, so the ring lands in the same space as the boss.
  const proj = (u: number, v: number): { x: number; y: number } => ({
    x: fr.cx + hxU * u + nxU * 0.5,
    y: fr.cy + hyU * u + nyU * 0.5 - v * crown,
  });
  const R = 0.62;
  ctx.save();
  // Twelve ticks around the rim of the charge field, three of them
  // long: a clock face, which is what makes it read as WORKED rather
  // than as a glowing donut.
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + nowMs * 0.00018;
    const long = i % 4 === 0;
    const r0 = R * (long ? 0.78 : 0.86);
    const r1 = R * 1.0;
    const p0 = proj(Math.cos(ang) * r0, Math.sin(ang) * r0);
    const p1 = proj(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.globalAlpha = Math.min(1, a * (long ? 1 : 0.72));
    ctx.strokeStyle = long ? mark.core : mark.mid;
    ctx.lineWidth = Math.max(1, fr.hw * (long ? 0.035 : 0.024));
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  // A tier-3 face closes its ring: the working is complete, and the
  // silhouette says so from across the field.
  if (mark.tier >= 3) {
    ctx.globalAlpha = Math.min(1, a * 0.6);
    ctx.strokeStyle = mark.mid;
    ctx.lineWidth = Math.max(1, fr.hw * 0.018);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const p = proj(Math.cos(ang) * R * 0.82, Math.sin(ang) * R * 0.82);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
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
) => void;

const SIGNATURES: Record<string, FacePainter> = {
  buckler: sigBuckler,
  oak_kite: sigOakKite,
  pavise: sigPavise,
  frost: sigFrost,
  bulwark: sigBulwark,
  sunforged: sigSunforged,
  warboard: sigWarboard,
  wolfjaw: sigWolfjaw,
  bonespur: sigBonespur,
  kingsward: sigKingsward,
  thornwall: sigThornwall,
};

/**
 * THE BUDGET. This game paints a sword as a base fill, ONE lit plane
 * and ONE line. A shield is a bigger object, not a different game: a
 * face gets its field, at most three structural planes, one charge cut
 * from flat shapes, and the dish's two planes. That is the whole
 * allowance. Stitch rings, hammer marks, grain ticks, glints and
 * one-rivet-per-facet all lived here once and made the shields read as
 * photographed 3D props standing in a flat vector world.
 *
 * Everything below is FLAT FILLS. No gradients, no strokes on the
 * face, no soft edges anywhere.
 */
function drawFace(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  ctx.fillStyle = st.face;
  ctx.fillRect(-1.15, -1.15, 2.3, 2.3);
  // THE GRAZING-ANGLE LAW: past a certain turn the face is a few
  // pixels wide and every piece of detail on it collapses into the
  // same one-pixel column and reads as shattered debris. Near edge-on
  // the face keeps its field and its light, and nothing else.
  if (fr.open < 0.24) {
    ctx.fillStyle = shade(st.face, litU > 0 ? 22 : -26);
    ctx.fillRect(litU > 0 ? 0 : -1.15, -1.15, 1.15, 2.3);
    return;
  }
  const sig = st.sig ? SIGNATURES[st.sig] : undefined;
  if (sig) sig(ctx, st, fr, litU);
  else {
    drawGenericDialect(ctx, st, fr);
    drawDevice(ctx, st, fr);
  }
  drawDish(ctx, litU);
}

/**
 * THE DISH, in two planes. The light comes from up-screen, the surface
 * is a dome, so one side of it turns into the light and the other
 * falls away — one lit plane, one shadowed plane, both hard-edged and
 * both leaning with the curve. Nothing else. Three chords and a belly
 * band used to live here and they buried every charge under a glare.
 */
function drawDish(ctx: CanvasRenderingContext2D, litU: number): void {
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(litU * 0.42, -1.2);
  ctx.lineTo(litU * 1.2, -1.2);
  ctx.lineTo(litU * 1.2, 1.2);
  ctx.lineTo(litU * 0.78, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = SEAM;
  ctx.beginPath();
  ctx.moveTo(-litU * 1.2, -1.2);
  ctx.lineTo(-litU * 0.72, -1.2);
  ctx.lineTo(-litU * 0.96, 1.2);
  ctx.lineTo(-litU * 1.2, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * The floor: a coherent material read for a shield with no signature
 * of its own. Two planes and a seam — never more than an authored one.
 */
function drawGenericDialect(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
): void {
  if (st.material === 'wood') {
    staves(ctx, st, 3);
    return;
  }
  if (fr.shape === 'buckler' || fr.shape === 'round') {
    gores(ctx, st, 4);
    return;
  }
  ctx.fillStyle = shade(st.face, 18);
  ctx.fillRect(-0.12, -1.15, 0.24, 2.3);
  ctx.fillStyle = SEAM;
  ctx.fillRect(0.12, -1.15, 0.03, 2.3);
  band(ctx, st, -0.5, 0.16);
  band(ctx, st, 0.42, 0.16);
}

// ------------------------------------------------- shared face pieces

/**
 * Riven staves as BLOCKS. Three or four wide boards, each a flat tone
 * with one hard seam — a board is a plane, and the eye reads planks
 * from the seams between them, not from grain drawn on top of them.
 */
function staves(ctx: CanvasRenderingContext2D, st: ShieldStyle, k: number): void {
  const w = 2.3 / k;
  for (let i = 0; i < k; i++) {
    const u0 = -1.15 + w * i;
    ctx.fillStyle = i % 2 ? shade(st.face, -16) : shade(st.face, 6);
    ctx.fillRect(u0, -1.15, w, 2.3);
    if (i > 0) {
      ctx.fillStyle = SEAM;
      ctx.fillRect(u0 - 0.018, -1.15, 0.036, 2.3);
    }
  }
}

/**
 * Gores: the wedges a round shield is raised in, struck out from the
 * umbo. FOUR of them — big flat facets that turn a disc into a dome
 * without a single gradient. Eight read as a sunburst decal.
 */
function gores(ctx: CanvasRenderingContext2D, st: ShieldStyle, k: number): void {
  for (let i = 0; i < k; i++) {
    const a0 = (i / k) * Math.PI * 2 - Math.PI * 0.75;
    const a1 = ((i + 1) / k) * Math.PI * 2 - Math.PI * 0.75;
    ctx.fillStyle = i % 2 ? shade(st.face, -18) : shade(st.face, 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * 1.6, Math.sin(a0) * 1.6);
    ctx.lineTo(Math.cos(a1) * 1.6, Math.sin(a1) * 1.6);
    ctx.closePath();
    ctx.fill();
  }
}

/** A band across the face: one plate, one lit top edge, one seam. */
function band(ctx: CanvasRenderingContext2D, st: ShieldStyle, t: number, h: number): void {
  ctx.fillStyle = st.rim;
  ctx.fillRect(-1.2, t, 2.4, h);
  ctx.fillStyle = shade(st.rim, 30);
  ctx.fillRect(-1.2, t, 2.4, h * 0.32);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.2, t + h, 2.4, 0.03);
}

/**
 * A stud: one flat diamond on a dark seat. Studs are spent by the
 * HANDFUL, not one per facet — a countable few read as fixings, a ring
 * of them reads as machine trim and drags the piece toward 3D.
 */
function stud(ctx: CanvasRenderingContext2D, u: number, t: number, r: number, c: string): void {
  ctx.fillStyle = SEAM;
  ctx.beginPath();
  ctx.moveTo(u - r * 1.4, t);
  ctx.lineTo(u, t - r * 1.4);
  ctx.lineTo(u + r * 1.4, t);
  ctx.lineTo(u, t + r * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(u - r, t);
  ctx.lineTo(u, t - r);
  ctx.lineTo(u + r, t);
  ctx.lineTo(u, t + r);
  ctx.closePath();
  ctx.fill();
}

// -------------------------------------------------------- signatures

/**
 * SPIKED BUCKLER — a forged disc in four struck facets, a dark iron
 * band across it, and four studs on the quarters where the spikes are
 * bedded. The umbo does the rest of the talking.
 */
function sigBuckler(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  gores(ctx, st, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    stud(ctx, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.1, shade(st.rim, 30));
  }
}

/**
 * OAK KITESHIELD — three wide boards and a bronze chevron. That is the
 * entire shield: the boards are the material, the chevron is the
 * charge, and the bound rim frames both.
 */
function sigOakKite(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 3);
  const c = st.deviceColor ?? shade(st.rim, 30);
  const peak = -0.34;
  const arm = 0.42;
  const ax = 0.86;
  const w = 0.36;
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
  bar(0.07, SEAM);
  bar(0, c);
  // ONE lit plane along the bar's top — the house's whole shading law.
  ctx.fillStyle = shade(c, 30);
  ctx.beginPath();
  ctx.moveTo(-ax, arm);
  ctx.lineTo(0, peak);
  ctx.lineTo(ax, arm);
  ctx.lineTo(ax, arm + 0.11);
  ctx.lineTo(0, peak + 0.16);
  ctx.lineTo(-ax, arm + 0.11);
  ctx.closePath();
  ctx.fill();
  stud(ctx, 0, peak + 0.34, 0.1, shade(c, 44));
}

/**
 * TOWER SHIELD — three steel planes, an enamelled pale down the
 * middle, two riveted bands, and a lozenge plate. The flutes, brow
 * band and cornerplates are gone: they were seven more edges arguing
 * with a body drawn in four.
 */
function sigPavise(ctx: CanvasRenderingContext2D, st: ShieldStyle, fr: ShieldFrame, litU: number): void {
  // Three plates across the width, the middle one standing proud.
  plates(ctx, st, litU);

  const enamel = st.faceAlt ?? shade(st.face, -60);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.42, -1.2, 0.84, 2.4);
  ctx.fillStyle = enamel;
  ctx.fillRect(-0.38, -1.2, 0.76, 2.4);
  ctx.fillStyle = shade(enamel, 22);
  ctx.fillRect(-0.38, -1.2, 0.16, 2.4);

  band(ctx, st, -0.62, 0.17);
  band(ctx, st, 0.46, 0.17);
  stud(ctx, -0.72, -0.53, 0.075, BRASS);
  stud(ctx, 0.72, -0.53, 0.075, BRASS);
  stud(ctx, -0.72, 0.55, 0.075, BRASS);
  stud(ctx, 0.72, 0.55, 0.075, BRASS);

  // The charge: a lozenge plate in three flat planes — seat, face,
  // shadow. Riveted on, not painted on.
  const c = st.deviceColor ?? shade(st.rim, 40);
  const ty = -0.08;
  const R = 0.52;
  const W = 0.38;
  poly(ctx, SEAM, [0, ty - R * 1.2, W * 1.2, ty, 0, ty + R * 1.2, -W * 1.2, ty]);
  poly(ctx, c, [0, ty - R, W, ty, 0, ty + R, -W, ty]);
  // ONE shadowed plane below the waist — the plate's second cut face.
  poly(ctx, shade(c, -52), [-W, ty, W, ty, 0, ty + R]);
}

/**
 * The forged field: one plate to the light, one away. Every metal
 * greatshield starts here, so the sun reads the same across the class
 * before any of them says anything of its own.
 */
function plates(ctx: CanvasRenderingContext2D, st: ShieldStyle, litU: number): void {
  ctx.fillStyle = shade(st.face, litU > 0 ? -16 : 12);
  ctx.fillRect(-1.2, -1.2, 1.2, 2.4);
  ctx.fillStyle = shade(st.face, litU > 0 ? 12 : -16);
  ctx.fillRect(0, -1.2, 1.2, 2.4);
}

/** A flat polygon from a point list — the only shape the face knows. */
function poly(ctx: CanvasRenderingContext2D, tone: string, pts: number[]): void {
  ctx.fillStyle = tone;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) ctx.moveTo(pts[i]!, pts[i + 1]!);
    else ctx.lineTo(pts[i]!, pts[i + 1]!);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * FROSTPLATE GREATSHIELD — a deep glacier CHIEF across the crown with
 * a rime star struck in it, three icicle teeth hanging off its lower
 * edge into the pale field, and nothing else. The teeth are the whole
 * signature: they are the one place in the roster where a charge leaves
 * its band and grows down into the field, and they cost three flat
 * triangles.
 */
function sigFrost(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  // The chief: the crown of the shield in glacier blue, cut off by one
  // hard seam. Ice over steel, not ice painted on steel.
  const ice = st.faceAlt ?? shade(st.face, -60);
  ctx.fillStyle = ice;
  ctx.fillRect(-1.2, -1.2, 2.4, 0.78);
  // ONE lit plane along the chief's top — the house's whole shading law.
  ctx.fillStyle = shade(ice, 26);
  ctx.fillRect(-1.2, -1.2, 2.4, 0.2);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.2, -0.42, 2.4, 0.05);
  // The teeth: a curtain of ice hanging out of the chief and most of
  // the way down the field. Uneven lengths — a matched set reads as a
  // machined comb — and long, because the field below the chief is the
  // biggest empty surface in the roster and this is what fills it.
  const teeth: Array<[number, number, number]> = [
    [-0.86, 0.13, 0.5],
    [-0.5, 0.17, 1.02],
    [-0.04, 0.2, 1.5],
    [0.44, 0.16, 0.86],
    [0.84, 0.13, 0.42],
  ];
  for (const [u, w, len] of teeth) {
    poly(ctx, ice, [u - w, -0.4, u + w, -0.4, u, -0.4 + len]);
    // The lit side of each tooth, one plane, always up-screen-lit.
    poly(ctx, shade(ice, 30), [u - w * litU, -0.4, u, -0.4, u, -0.4 + len]);
  }
  // The charge, struck in the chief: a rime mullet in two planes.
  const c = st.deviceColor ?? '#ffffff';
  const ty = -0.79;
  const r = 0.36;
  const pts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(Math.cos(a) * rr, ty + Math.sin(a) * rr);
  }
  poly(ctx, c, pts);
  poly(ctx, shade(c, -34), [-r * 0.42, ty, r * 0.42, ty, 0, ty + r]);
}

/**
 * BULWARK BASTION — brass-bound gunmetal under a broad brass cross.
 * Two bars, each with a dark shadow bar under it and one lit plane on
 * top, four studs in the quarters the cross leaves empty, and the umbo
 * lands on the crossing. The cross is the bulwark set's own device;
 * the shield is where it finally gets room to be big.
 */
function sigBulwark(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  // The quartered field: the two panels the cross will divide, darkened
  // on the diagonal so the brass has something to sit against.
  const alt = st.faceAlt ?? shade(st.face, -18);
  ctx.fillStyle = alt;
  ctx.fillRect(-1.2, -1.2, 1.2, 1.2);
  ctx.fillRect(0, 0, 1.2, 1.2);

  const c = st.deviceColor ?? BRASS;
  const w = 0.2; // half-width of a bar — narrow enough to clear the merlon
  // Shadow first, then the bar, then the one lit plane along its
  // up-screen edge. Painted vertical-then-horizontal so the horizontal
  // laps OVER — which is how a real cross is riveted together.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-w - 0.05, -1.2, (w + 0.05) * 2, 2.4);
  ctx.fillStyle = c;
  ctx.fillRect(-w, -1.2, w * 2, 2.4);
  ctx.fillStyle = shade(c, 30);
  ctx.fillRect(litU > 0 ? w - 0.09 : -w, -1.2, 0.09, 2.4);

  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.2, -w - 0.19, 2.4, (w + 0.05) * 2);
  ctx.fillStyle = c;
  ctx.fillRect(-1.2, -w - 0.14, 2.4, w * 2);
  ctx.fillStyle = shade(c, 30);
  ctx.fillRect(-1.2, -w - 0.14, 2.4, 0.09);

  // Four studs, one in each quarter — where the cross is bolted through
  // the boards, and nowhere else.
  for (const u of [-0.72, 0.72]) {
    for (const t of [-0.7, 0.66]) stud(ctx, u, t, 0.085, shade(c, 40));
  }
}

/**
 * SUNFORGED AEGIS — the top of the ladder, spent entirely on one idea.
 * Eight rays strike out of the center in alternating gold and ivory,
 * a dark seat rings the middle so the white-hot umbo has somewhere to
 * land, and that is the whole face. No bands, no plates, no pale: a
 * sun does not need a second thought on top of it.
 */
function sigSunforged(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  const ivory = st.faceAlt ?? '#f4ead2';
  // The blazing sun: eight wedges struck from the umbo. Eight reads as
  // a sunburst — which everywhere else in this file is the failure
  // mode, and here is precisely the point.
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI * 0.625;
    const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI * 0.625;
    poly(ctx, i % 2 ? ivory : shade(st.face, 14), [
      0, 0,
      Math.cos(a0) * 2, Math.sin(a0) * 2,
      Math.cos(a1) * 2, Math.sin(a1) * 2,
    ]);
  }
  // The sun's own shading, honest to the screen: the away side of every
  // ray falls off together, in ONE plane laid over the whole burst.
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = SEAM;
  ctx.fillRect(litU > 0 ? -1.2 : 0.34, -1.2, 0.86, 2.4);
  ctx.globalAlpha = 1;
  // The seat the umbo lands in — a dark RING, not a well. Cut wide it
  // reads as a hole punched through the sun; it only has to be thick
  // enough to give a white boss on a gold field an edge.
  const seat: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    seat.push(Math.cos(a) * 0.21, Math.sin(a) * 0.21);
  }
  poly(ctx, SEAM, seat);
  // Nothing else. The rim's own studs are the only fitting on it: the
  // whole rung is spent on the sun, not on a fifth kind of rivet.
}

/**
 * GOBNAIL WARBOARD — crude is the craft. Three boards, one of them
 * visibly the WRONG board (it sits crooked, its seams don't line up),
 * and a rusty patch plate that matches nothing, held on with two
 * studs. Nothing on this shield is parallel to anything else on it,
 * and that is the signature. The nails and the pot-lid boss come from
 * the substrate passes.
 */
function sigWarboard(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 3);
  // The replacement board: a plank from some OTHER shield, nailed on
  // at the angle it happened to land.
  ctx.save();
  ctx.rotate(0.07);
  ctx.fillStyle = shade(st.face, 16);
  ctx.fillRect(-0.55, -1.3, 0.42, 2.6);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.57, -1.3, 0.04, 2.6);
  ctx.fillRect(-0.15, -1.3, 0.04, 2.6);
  ctx.restore();
  // The patch: a rusty plate over the split, one lit edge, two studs.
  const rust = '#8a6a52';
  ctx.save();
  ctx.rotate(-0.1);
  ctx.fillStyle = SEAM;
  ctx.fillRect(0.12, -0.28, 0.68, 0.6);
  ctx.fillStyle = rust;
  ctx.fillRect(0.16, -0.24, 0.6, 0.52);
  ctx.fillStyle = shade(rust, 22);
  ctx.fillRect(0.16, -0.24, 0.6, 0.12);
  stud(ctx, 0.26, 0.02, 0.07, shade(rust, 40));
  stud(ctx, 0.66, 0.02, 0.07, shade(rust, 40));
  ctx.restore();
}

/**
 * WOLFJAW TARGE — the bite marks are the design. Four leather panels,
 * then three claw-rake gashes dragged across the face on one diagonal:
 * each gash is a dark slit with a pale torn edge, cut clean through
 * whatever panel it crosses. The bone fang crown and the torn-out
 * notch live in the silhouette; the face only has to corroborate them.
 */
function sigWolfjaw(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  gores(ctx, st, 4);
  ctx.save();
  ctx.rotate(-0.55);
  const pale = shade(st.face, 34);
  for (const x of [-0.36, -0.02, 0.32]) {
    // THE WOUND READS DARK. The slit is the mark and it dominates; the
    // pale torn edge is a thin curl on ONE side of it. Weighted the
    // other way round these painted as light streaks, and a shield of
    // light streaks is decorated, not survived.
    ctx.fillStyle = SEAM;
    ctx.fillRect(x - 0.055, -0.82, 0.13, 1.64);
    ctx.fillStyle = pale;
    ctx.fillRect(x + 0.075, -0.72, 0.045, 1.44);
  }
  ctx.restore();
}

/**
 * BONESPUR WARD — grown, not forged. Three fused ribs in alternating
 * bone tones, a black iron repair band bolted across them, and the
 * Champion's twin fangs in dark iron at the honor point. The scalloped
 * silhouette and the growing spurs carry the anatomy; the face stays
 * calm bone so the black iron reads like a scar across it.
 */
function sigBonespur(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 3);
  // THE JAW. The Champion's charge is not the little heraldic fang —
  // it is two broad black-iron fangs hanging from under the crown of
  // the shield like the front of a bite, each with one lit inner
  // facet. Sized to the shield, not to a kite's honor point.
  // A fang is SHORT and broad — drawn long and narrow these hung like
  // a pair of dark curtains off the crown instead of teeth.
  const dark = st.deviceColor ?? '#3a3f4a';
  for (const sx of [-1, 1]) {
    poly(ctx, SEAM, [sx * 0.7, -1.2, sx * 0.05, -1.2, sx * 0.38, -0.3]);
    poly(ctx, dark, [sx * 0.64, -1.2, sx * 0.11, -1.2, sx * 0.38, -0.4]);
    poly(ctx, shade(dark, 26), [sx * 0.11, -1.2, sx * 0.38, -0.4, sx * 0.3, -1.2]);
  }
  band(ctx, st, 0.34, 0.18);
  stud(ctx, -0.8, 0.43, 0.08, shade(st.rim, 30));
  stud(ctx, 0.8, 0.43, 0.08, shade(st.rim, 30));
}

/**
 * KINGSWARD — the royal impalement. The field is divided per pale:
 * the King's crimson dexter, the Queen's moonpale sinister, one gold
 * fillet standing where the houses meet. The crown rides the seam at
 * the honor point; the moonstone boss (substrate pass) sets at the
 * heart below it. Ceremony first, and not one plane more.
 */
function sigKingsward(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
): void {
  // The impalement: sinister half in the Queen's moonpale.
  ctx.fillStyle = st.faceAlt ?? shade(st.face, 40);
  ctx.fillRect(0, -1.2, 1.2, 2.4);
  // One shadowed plane on each field so both halves read as cloth
  // hung on the same board, lit by the same sun.
  ctx.fillStyle = shade(st.face, -18);
  ctx.fillRect(-1.2, -1.2, 0.22, 2.4);
  ctx.fillStyle = shade(st.faceAlt ?? st.face, -14);
  ctx.fillRect(0.98, -1.2, 0.22, 2.4);
  // The gold fillet on the seam.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.075, -1.2, 0.15, 2.4);
  ctx.fillStyle = st.deviceColor ?? shade(st.rim, 20);
  ctx.fillRect(-0.045, -1.2, 0.09, 2.4);
  drawDevice(ctx, st, fr);
}

/**
 * DREADFORGE THORNWALL — black steel, gold warning. Two black plates,
 * one broad gold bend across them with a dark shadow bar and one lit
 * edge, and a black diamond riveted at the crossing. The thorns and
 * the heel spike are silhouette work; the face keeps to the dreadforge
 * rule that everything bright on it is a warning.
 */
function sigThornwall(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  const c = st.rim;
  ctx.save();
  ctx.rotate(-0.6);
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.26, -1.7, 0.52, 3.4);
  ctx.fillStyle = c;
  ctx.fillRect(-0.21, -1.7, 0.42, 3.4);
  ctx.fillStyle = shade(c, 30);
  ctx.fillRect(-0.21, -1.7, 0.1, 3.4);
  ctx.restore();
  // The black diamond at the crossing: seat, face, one lit facet.
  const dark = st.deviceColor ?? '#23252c';
  poly(ctx, SEAM, [0, -0.52, 0.42, 0, 0, 0.52, -0.42, 0]);
  poly(ctx, dark, [0, -0.44, 0.35, 0, 0, 0.44, -0.35, 0]);
  poly(ctx, shade(dark, 26), [0, -0.44, 0, 0.44, -0.35, 0]);
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
  const cy = fr.shape === 'buckler' || fr.shape === 'round' ? -0.04 : -0.34;
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
    // The same three boards, seen from behind, plus the two battens
    // without which they would fall apart. Two planes each, no pegs.
    for (let i = 1; i < 3; i++) {
      ctx.fillStyle = SEAM;
      ctx.fillRect(-1.15 + (2.3 / 3) * i - 0.018, -1.15, 0.036, 2.3);
    }
    for (const t of [-0.5, 0.38]) {
      ctx.fillStyle = SEAM;
      ctx.fillRect(-1.2, t + 0.18, 2.4, 0.05);
      ctx.fillStyle = shade(base, 16);
      ctx.fillRect(-1.2, t, 2.4, 0.18);
      ctx.fillStyle = shade(base, 36);
      ctx.fillRect(-1.2, t, 2.4, 0.055);
    }
  } else {
    // A plate core in two planes with one hard seam down it.
    ctx.fillStyle = shade(base, 14);
    ctx.fillRect(-1.2, -1.2, 1.2, 2.4);
    ctx.fillStyle = SEAM;
    ctx.fillRect(-0.02, -1.2, 0.04, 2.4);
  }
  // The inside is a bowl: one shadowed plane where the face carries a
  // lit one. That inversion is the single tell that we are looking at
  // the other side of the shield.
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = SEAM;
  ctx.fillRect(litU > 0 ? -1.2 : 0.2, -1.2, 1.0, 2.4);
  ctx.globalAlpha = 1;
  // THE HOLLOW UMBO. A fist-gripped shield is punched, not solid: the
  // dome standing proud of the face is a CAVITY on this side, and the
  // hand lives inside it.
  if (st.boss && !METRIC[fr.shape].strap) {
    const cup = (r: number, tone: string): void => {
      ctx.fillStyle = tone;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    };
    cup(0.34, SEAM);
    cup(0.28, shade(st.rim, -34));
  }
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

/**
 * The bound rim: ONE flat band and ONE dark seam under it. The band
 * used to carry a clipped half-highlight and a second graduated
 * under-seam and a stud at every facet corner — four passes making a
 * bevelled 3D moulding out of what should be a flat frame.
 */
function drawRim(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  outline: number[],
  n: number,
): void {
  const w = st.material === 'wood' ? 0.115 : 0.085;
  const ring = (k: number): void => {
    for (let i = 0; i < n; i++) {
      const u = outline[i * 2]! * k;
      const t = outline[i * 2 + 1]! * k;
      if (i === 0) ctx.moveTo(u, t);
      else ctx.lineTo(u, t);
    }
    ctx.closePath();
  };
  ctx.beginPath();
  ring(1);
  for (let i = n - 1; i >= 0; i--) {
    const u = outline[i * 2]! * (1 - w);
    const t = outline[i * 2 + 1]! * (1 - w);
    if (i === n - 1) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  ctx.fillStyle = st.rim;
  ctx.fill('evenodd');
  // One dark line where the metal laps over the field: without it the
  // rim is a colour change, with it the rim is a separate PIECE.
  ctx.beginPath();
  ring(1 - w);
  for (let i = n - 1; i >= 0; i--) {
    const u = outline[i * 2]! * (1 - w - 0.045);
    const t = outline[i * 2 + 1]! * (1 - w - 0.045);
    if (i === n - 1) ctx.moveTo(u, t);
    else ctx.lineTo(u, t);
  }
  ctx.closePath();
  ctx.fillStyle = SEAM;
  ctx.fill('evenodd');
  // A handful of studs, on the corners the eye already reads — never
  // one per facet. Four on a disc, four down a tall shield.
  if (st.studs) {
    const c = shade(st.rim, 36);
    const k = 1 - w * 0.5;
    if (fr.shape === 'buckler' || fr.shape === 'round') {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        stud(ctx, Math.cos(a) * k, Math.sin(a) * k, 0.075, c);
      }
    } else {
      // Every other vertex of the binding, so the count stays low and
      // the studs land where the frame actually turns a corner.
      for (let i = 1; i < n; i += 2) {
        stud(ctx, outline[i * 2]! * k, outline[i * 2 + 1]! * k, 0.075, c);
      }
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
  // ONE lit facet across the dome's up-screen half — the same single
  // shading plane every other piece of metal in the game gets.
  ctx.fillStyle = shade(boss, 40);
  ctx.beginPath();
  for (let i = 3; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const u = Math.cos(a);
    const t = Math.sin(a);
    const x = u * ax * 0.94;
    const y = u * ay * 0.94 + t * ry * 0.94;
    if (i === 3) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * How far the outline reaches in a design-space direction. Spikes are
 * ROOTED IN THE BINDING, so they have to know where the binding
 * actually is: placed on a circle instead, they sit correctly on a
 * disc and float free of any shape that tapers — on the aegis, whose
 * heel comes to a point, a spike at the lower quarters hung in the air
 * a third of a shield away from the metal it is supposedly forged out
 * of. One ray/edge intersection makes them right on every outline.
 */
function reachAlong(outline: number[], cu: number, ct: number): number {
  const n = outline.length / 2;
  let best = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = outline[i * 2]!;
    const ay = outline[i * 2 + 1]!;
    const ex = outline[j * 2]! - ax;
    const ey = outline[j * 2 + 1]! - ay;
    // Solve  k·(cu,ct) = a + s·e  for k, with s confined to the edge.
    const den = cu * ey - ct * ex;
    if (Math.abs(den) < 1e-9) continue;
    const s = (ax * ct - ay * cu) / den;
    if (s < 0 || s > 1) continue;
    const k =
      Math.abs(cu) > Math.abs(ct) ? (ax + s * ex) / cu : (ay + s * ey) / ct;
    // The FARTHEST crossing: a concave outline (the bastion's crown) is
    // pierced more than once, and a spike belongs on the outer wall.
    if (k > best) best = k;
  }
  return best || 1;
}

/** Forged punch spikes on the quarters — the buckler's teeth. */
function drawSpikes(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  outline: number[],
  hxU: number,
  hyU: number,
  nxU: number,
  nyU: number,
  crown: number,
): void {
  // Forged from the SHIELD's iron, never from the bright umbo — spikes
  // pitched at boss brightness read as white shards thrown off the
  // face instead of teeth grown out of the rim. Organic spikes (bone
  // fangs, spurs) override with their own material via the spike plan.
  const c = st.spikeColor ?? shade(st.rim, 18);
  const bx = nxU * (crown + 0.3);
  const by = nyU * (crown + 0.3);
  const px = (u2: number): number => u2 * hxU + bx;
  const py = (u2: number, t2: number): number => u2 * hyU + t2 * fr.hh + by;
  // The spike plan: bespoke angles when the style has a story to tell,
  // the quarters when it doesn't.
  const angles =
    st.spikeAngles ??
    [0, 1, 2, 3].map((i) => (i / 4) * Math.PI * 2 + Math.PI / 4);
  const lenK = st.spikeLen ?? 1.2;
  const wK = st.spikeW ?? 0.125;
  for (const a of angles) {
    const cu = Math.cos(a);
    const ct2 = Math.sin(a);
    // Rooted under the binding and tipped a short way past it. Kept
    // SHORT and narrow on purpose: a buckler's spikes are punched
    // studs, not a crown of blades, and long ones stop reading as part
    // of the shield the moment the plane turns.
    const reach = reachAlong(outline, cu, ct2);
    const root = reach * 0.86;
    const tip = reach * lenK;
    const wu = -ct2 * wK * reach;
    const wt = cu * wK * reach;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(cu * root + wu), py(cu * root + wu, ct2 * root + wt));
    ctx.lineTo(px(cu * tip), py(cu * tip, ct2 * tip));
    ctx.lineTo(px(cu * root - wu), py(cu * root - wu, ct2 * root - wt));
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

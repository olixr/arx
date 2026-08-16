import { markPulse, SLOT_GLINT_PHASE, type ArxMark } from './wornLight.js';
import { shade } from './rig.js';
import { WIELD_GROUND_K } from './wield.js';

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

/** Ground foreshortening: a step of DEPTH reads as this much screen
 *  drop. THE ONE GROUND (arms-v3 Phase 1): the constant lives in
 *  wield.ts — the plane and the carries project through the same K by
 *  construction, never by coincidence of two literals. */
const GROUND_K = WIELD_GROUND_K;

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
  | 'thorn'
  // THE SHIELD WAVE (docs/shield-wave-plan.md): twelve more, each its
  // own silhouette — the class law says a new rung is a new OUTLINE.
  | 'breach'
  | 'door'
  | 'palisade'
  | 'gate'
  | 'carapace'
  | 'courtround'
  | 'pinion'
  | 'reliquary'
  | 'furnace'
  | 'leaf'
  | 'riftward'
  | 'falls';

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
  // ================= THE SHIELD WAVE (docs/shield-wave-plan.md) =====
  /**
   * THE RED COMPANY'S — a tool that got promoted. Dark lacquered
   * boards, an iron boot plate stepping past the heel (you kick a door
   * with the shield so your foot doesn't have to), two crowbar scars
   * that never buffed out, and the company's red slash struck across
   * the top corner. Nothing on it is ceremony; everything on it has
   * been used twice.
   */
  lowhall_breacher: {
    shape: 'breach',
    material: 'wood',
    face: '#4a3a30',
    faceAlt: '#3a2d25',
    // The red slash is a BEND in anyone's rolls of arms — the company
    // just paints theirs faster.
    field: 'bend',
    rim: '#565b66',
    // The knocker came with the door.
    boss: '#6a707c',
    device: 'none',
    studs: true,
    planks: 3,
    curve: 0.28,
    strapColor: '#3f3830',
    sig: 'breacher',
    tier: 3,
  },
  /**
   * THE LEGION'S — issue iron, drill-ground geometry. A blackened slab
   * to the quartermaster's template: two columns of forged diamond
   * bosses, one crimson campaign band, and three punch spikes off the
   * OUTER edge only — the shield-wall's free edge, where the line
   * ends. Ten thousand of these exist and every one is this one.
   */
  legion_doorwall: {
    shape: 'door',
    material: 'iron',
    face: '#3f434e',
    faceAlt: '#33363f',
    rim: '#565b68',
    // The charge is the drill columns of forged diamonds themselves.
    device: 'diamond',
    deviceColor: '#8e2f2c',
    studs: true,
    spikes: true,
    // The free edge bears the teeth: +u is the outer side. LONG —
    // these are the line's answer, not trim.
    spikeAngles: [-0.5, 0, 0.5],
    spikeLen: 1.42,
    spikeW: 0.1,
    curve: 0.26,
    strapColor: '#3f3830',
    sig: 'doorwall',
    tier: 3,
  },
  /**
   * THE HUNTER'S WALL — fence, carried. Pale ash staves cut to three
   * stake points across the crown, two rawhide lashings holding the
   * boards the way a hide is racked, and the stand's own mark — a tar
   * antler-brow — painted where the stakes part. The shield you plant
   * at the treeline and shoot beside all season.
   */
  stagheart_palisade: {
    shape: 'palisade',
    material: 'wood',
    face: '#b09a6e',
    faceAlt: '#94805a',
    rim: '#6a5a40',
    // An antler burr mounted at the boards' center — the stand's own
    // trophy, and something to hang a lantern on.
    boss: '#8a7458',
    // The tar antler-brow, in the rolls' nearest word.
    device: 'fang',
    deviceColor: '#2e2a24',
    studs: true,
    planks: 4,
    curve: 0.3,
    strapColor: '#4a3524',
    sig: 'palisade',
    tier: 4,
  },
  /**
   * THE BARROW GATE — a door off its hinges, and the hinges came too.
   * Weathered pale planks under an arched crown, iron scroll-straps
   * still bolted where the jamb used to be, the tar fell-mark low on
   * the boards, and a fell-ram's skull set at the crown with its horns
   * curled down the arch. Bone and old iron; nothing on it shines.
   */
  fellhorn_gate: {
    shape: 'gate',
    material: 'wood',
    face: '#a89878',
    faceAlt: '#8c7c60',
    rim: '#4e535e',
    device: 'fang',
    deviceColor: '#ddd4bc',
    studs: true,
    spikes: true,
    // The ram's own horns, rising off the arch either side of the
    // skull — bone breaking the silhouette, the way the fell marks
    // its gates. Sized to the MOUNTED skull, not to a trinket.
    spikeAngles: [-2.03, -1.11],
    spikeLen: 1.48,
    spikeW: 0.14,
    spikeColor: '#ddd4bc',
    planks: 3,
    curve: 0.3,
    strapColor: '#3f3830',
    sig: 'fellhorn',
    tier: 4,
  },
  /**
   * THE TIDE'S RAMPART, MADE BEARABLE — a shell wall in storm-green,
   * three plate courses lapping downward the way a carapace grows,
   * barnacle studs where they chose to live, and a deepking's pearl
   * set proud at the heart. The sea builds symmetric and the smith
   * had the sense not to argue.
   */
  brinehold_carapace: {
    shape: 'carapace',
    material: 'steel',
    face: '#46655c',
    faceAlt: '#3a5148',
    rim: '#7ba892',
    boss: '#dfe3d6',
    device: 'none',
    studs: true,
    spikes: true,
    // Lateral spines, both flanks — a crab grows them and the smith
    // kept them. Short, pale chitin, nothing forged about them.
    spikeAngles: [-0.25, 0.3, 2.84, 3.39],
    spikeLen: 1.16,
    spikeW: 0.07,
    spikeColor: '#cfc9b4',
    curve: 0.42,
    strapColor: '#3a4652',
    sig: 'carapace',
    tier: 4,
  },
  /**
   * THE COURT'S TOKEN — cold ceremony. A birch-silver disc in nine
   * facets, a court-silver crescent inlaid off-center, and a rime star
   * struck from the heart in everfrost splinters — uneven, as ice
   * grows. Fist-gripped and light: the Court does not carry weight,
   * it confers it.
   */
  wintercourt_rime: {
    shape: 'courtround',
    material: 'steel',
    face: '#cfd8d2',
    faceAlt: '#b4c0bc',
    rim: '#8fa8b8',
    boss: '#9ad4e8',
    device: 'moon',
    deviceColor: '#dce4f0',
    studs: true,
    curve: 0.5,
    strapColor: '#3a4652',
    sig: 'wintercourt',
    tier: 4,
  },
  /**
   * THE VEIL'S WING — blued night-steel with its outer edge FLETCHED:
   * three swept barbs cut into the silhouette, a gilded rachis seam
   * running crown to heel where a feather keeps its spine, and one
   * gold stud bedding each barb. The ladder's warm metal spent the
   * veil's way: three thin lines in the dark.
   */
  nightveil_pinion: {
    shape: 'pinion',
    material: 'steel',
    face: '#2e3345',
    faceAlt: '#262a38',
    // The gilded rachis runs crown to heel on the slant — a bend, as
    // the rolls would blazon it, if the rolls knew what they saw.
    field: 'bend',
    rim: '#4a5068',
    // The barbs, in the nearest heraldic word for a blade.
    device: 'fang',
    deviceColor: BRASS,
    studs: true,
    curve: 0.3,
    strapColor: '#3f3830',
    sig: 'pinion',
    tier: 5,
  },
  /**
   * THE PILGRIM WAY'S SILVER — wayside-shrine architecture in shield
   * form. Deep lake-indigo enamel under a worked moonsilver cross,
   * slender where the bulwark's brass is broad: flared finials at all
   * four ends and a moonstone at the crossing. Carried down the whole
   * pilgrim way and polished by every mile of it.
   */
  vale_reliquary: {
    shape: 'reliquary',
    material: 'steel',
    face: '#28324f',
    faceAlt: '#1f2740',
    rim: '#c9d2e0',
    // The moonstone stands proud at the crossing — the substrate's
    // boss, set where the silver meets.
    boss: '#eef4ff',
    device: 'cross',
    deviceColor: '#dce4f0',
    studs: true,
    curve: 0.32,
    strapColor: '#5a4a2a',
    sig: 'reliquary',
    tier: 4,
  },
  /**
   * THE BRAND'S FURNACE DOOR — charred iron plates with the fire still
   * between them: every seam on it is an EMBER seam, the grate mouth
   * at the heart glows in its own dark plate, and one heat-crack has
   * opened across the crown corner and been left, because the smiths
   * of the Brand sign their work with what it survived.
   */
  cindermaw_bulwark: {
    shape: 'furnace',
    material: 'iron',
    face: '#3e3a38',
    faceAlt: '#2e2b29',
    // Four plates quartered by burning seams: an ember cross on a
    // quartered field, and every word of that blazon is literal.
    field: 'quarter',
    rim: '#5a5248',
    device: 'cross',
    deviceColor: '#ff8a3c',
    studs: true,
    curve: 0.3,
    strapColor: '#3f3830',
    sig: 'cindermaw',
    tier: 5,
  },
  /**
   * THE EVERWOOD'S GIFT — a silverbark leaf the length of a body. One
   * midrib spine carrying its own pale light, three vein pairs laid
   * the way the tree laid them, a green-gold margin shade where the
   * blade turns from the sun. The Everwood gives and no axe takes;
   * this one was GIVEN, and the grain remembers agreeing.
   */
  everwood_crest: {
    shape: 'leaf',
    material: 'wood',
    face: '#e8e0cc',
    faceAlt: '#cfc4a8',
    // The midrib divides the blade its whole height: a pale, grown.
    field: 'pale',
    rim: '#a39072',
    // The imbued heartwood knot, standing proud where the working sits.
    boss: '#e6f0c2',
    // The paired veins, in the rolls' word for them.
    device: 'chevron',
    deviceColor: '#9db86a',
    // Silver pins, not soldier studs — the binding is still ELVEN.
    studs: true,
    curve: 0.36,
    strapColor: '#5a4a2a',
    sig: 'everwood',
    tier: 5,
  },
  /**
   * THE RIFTWARD — gate-stone, dressed. An obelisk-cut wall in void
   * violet with a tall bezel of gate glass set clean through it: the
   * glass carries one bright facet, splinters of its light escape the
   * bezel at two corners, and four bolts hold a window onto a place
   * nobody has finished looking into.
   */
  gatefall_bulwark: {
    shape: 'riftward',
    material: 'steel',
    face: '#3e3560',
    faceAlt: '#37304f',
    // The bezel column runs the face's height: a pale of glass.
    field: 'pale',
    rim: '#494259',
    // The shard that would not sit flush — the substrate's boss, in
    // gate glass, standing off the window it broke from.
    boss: '#cbb4ff',
    device: 'diamond',
    deviceColor: '#a985ff',
    studs: true,
    spikes: true,
    // Two splinters of the glass's light that got past the binding
    // entirely and stayed, frozen mid-escape.
    spikeAngles: [-0.85, 2.55],
    spikeLen: 1.24,
    spikeW: 0.06,
    spikeColor: '#cbb4ff',
    curve: 0.26,
    strapColor: '#3f3830',
    sig: 'riftward',
    tier: 6,
  },
  /**
   * ALDAREN'S GATE — the capital, carried. Moonpale steel under a gold
   * crown chief whose three points ARE the silhouette's own crest, and
   * three cascade stripes falling the full height of the face — the
   * crowned falls of Silverfall as heraldry. The biggest plane in the
   * game, a hair past the aegis, and the top of the wall ladder: the
   * king's answer to the sun.
   */
  aldarens_gate: {
    shape: 'falls',
    material: 'steel',
    face: '#c9d2e4',
    faceAlt: '#aab6cc',
    // The gold chief over the moonpale field — the blazon reads
    // itself: or, a chief; argent, three falls.
    field: 'chief',
    rim: '#d8b76a',
    // The gate's own gold ring, mounted at the boards' center.
    boss: '#e6c36a',
    device: 'crown',
    deviceColor: '#e6c36a',
    studs: true,
    spikes: true,
    // The crown's three points stand PROUD of the crest — real gold
    // rising off the binding, not a notch cut into the slab.
    spikeAngles: [-2.09, -1.57, -1.05],
    spikeLen: 1.28,
    spikeW: 0.13,
    spikeColor: '#e6c36a',
    curve: 0.3,
    strapColor: '#5a4a2a',
    sig: 'falls',
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
  // The Red Company's arguing door: a working slab with clipped top
  // corners and a narrower iron BOOT PLATE stepping down past the heel
  // — a tool that got promoted, and the step in the heel is its résumé.
  breach: [
    -0.84, -1, 0.84, -1, 1.0, -0.8, 1.0, 0.84, 0.66, 0.84, 0.66, 1.02,
    -0.66, 1.02, -0.66, 0.84, -1.0, 0.84, -1.0, -0.8,
  ],
  // The legion's doorwall: issue iron, corners clipped to the
  // quartermaster's template. The squarest rectangle in the roster —
  // drill-ground geometry; the spike plan owns its free edge.
  door: [
    -0.9, -1, 0.9, -1, 1.0, -0.84, 1.0, 0.82, 0.86, 1, -0.86, 1,
    -1.0, 0.82, -1.0, -0.84,
  ],
  // The hunter's palisade: three stake-cut points across the crown —
  // fence, carried. The valleys between the stakes are the read.
  palisade: [
    -0.65, -1, -0.33, -0.6, 0, -1, 0.33, -0.6, 0.65, -1, 0.95, -0.55,
    0.95, 0.78, 0.6, 1, -0.6, 1, -0.95, 0.78, -0.95, -0.55,
  ],
  // The barrow gate: an arched crown over straight jambs, heels cut to
  // a threshold — a door that remembers its hinges.
  gate: [
    0, -1, 0.6, -0.93, 0.95, -0.7, 0.95, 0.68, 0.78, 0.9, 0.42, 1,
    -0.42, 1, -0.78, 0.9, -0.95, 0.68, -0.95, -0.7, -0.6, -0.93,
  ],
  // The tide's rampart: a shell wall — domed crown, flared shoulders,
  // one scallop bitten into each flank, a skirt falling to a point.
  // Symmetric, unlike the targe: the sea builds true.
  carapace: [
    0, -0.96, 0.5, -0.88, 0.9, -0.6, 1.0, -0.15, 0.8, 0.2, 0.92, 0.5,
    0.55, 0.85, 0, 1, -0.55, 0.85, -0.92, 0.5, -0.8, 0.2, -1.0, -0.15,
    -0.9, -0.6, -0.5, -0.88,
  ],
  // The Court's round: nine facets — between the buckler's eight and
  // the round's ten, and the odd count seats one facet flat at the
  // crown with a point at the heel, which no other disc here does.
  courtround: ngon(9, -Math.PI / 2 + Math.PI / 9),
  // The veil's pinion: the INNER edge sweeps clean; the OUTER (+u,
  // off-side) edge is FLETCHED — three swept barbs stepping down the
  // free edge, a raised wing's trailing feathers cut into the steel.
  pinion: [
    0, -1, 0.68, -0.84, 0.5, -0.58, 1.0, -0.42, 0.58, -0.12, 0.98, 0.04,
    0.56, 0.36, 0.88, 0.54, 0.3, 0.86, 0, 1, -0.58, 0.82, -0.86, 0.42,
    -0.9, -0.3, -0.58, -0.8,
  ],
  // The reliquary: a cusped crown rising to a center finial over long
  // kite walls — wayside-shrine architecture in shield form.
  reliquary: [
    -0.16, -0.86, 0, -1.02, 0.16, -0.86, 0.62, -0.94, 0.92, -0.68,
    0.92, 0.28, 0.5, 0.74, 0, 1, -0.5, 0.74, -0.92, 0.28, -0.92, -0.68,
    -0.62, -0.94,
  ],
  // The furnace door: stepped shoulders, a vent notch waisting each
  // wall, and a wedge heel that overshoots — built to be set down in
  // front of a fire and lived behind.
  furnace: [
    -0.7, -1, 0.7, -1, 1.0, -0.74, 0.84, -0.28, 1.0, 0.12, 0.84, 0.46,
    0.58, 0.9, 0, 1.06, -0.58, 0.9, -0.84, 0.46, -1.0, 0.12, -0.84, -0.28,
    -1.0, -0.74,
  ],
  // The Everwood leaf: tip at the crown, margins swelling past the
  // waist, and a narrow STEM heel — the one outline here that pinches
  // in before the ground instead of spreading.
  leaf: [
    0, -1, 0.45, -0.74, 0.8, -0.34, 0.95, 0.12, 0.68, 0.56, 0.3, 0.86,
    0.13, 1, -0.13, 1, -0.3, 0.86, -0.68, 0.56, -0.95, 0.12, -0.8, -0.34,
    -0.45, -0.74,
  ],
  // The riftward obelisk: a narrow flat crown over canted upper walls,
  // then dead-straight sides to a chamfered heel — gate-stone, dressed.
  riftward: [
    -0.45, -1, 0.45, -1, 0.9, -0.6, 0.9, 0.64, 0.6, 1, -0.6, 1,
    -0.9, 0.64, -0.9, -0.6,
  ],
  // Aldaren's Gate: a broad crested slab falling to a shallow point —
  // the royal three crown points stand PROUD of this crest as real
  // gold (the spike plan), not as notches cut into the wall.
  falls: [
    -0.95, -0.84, -0.55, -1, 0.55, -1, 0.95, -0.84, 1.0, 0.56,
    0.6, 0.94, 0, 1.06, -0.6, 0.94, -1.0, 0.56,
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
    /**
     * THE WALL CARRY — the second rig. True marks the full-body class:
     * tower and everything above it. A wall is not a bigger heater —
     * settled in guard it PLANTS (grounds, squares, stops breathing),
     * running it SHOULDERS (rises and cants into the stride like a
     * carried door), and the finisher is a face-first BASH. The fist
     * and arm classes keep the living carriage.
     */
    wall?: boolean;
  }
> = {
  buckler: { hw: 0.13, hh: 0.13, hang: -0.25, depth: 0.034, strap: false, fwdK: 0.08, twistK: 0.18 },
  round: { hw: 0.175, hh: 0.175, hang: -0.21, depth: 0.036, strap: false, fwdK: 0.03, twistK: 0.1 },
  heater: { hw: 0.16, hh: 0.21, hang: -0.19, depth: 0.05, strap: true, fwdK: 0, twistK: 0 },
  kite: { hw: 0.152, hh: 0.27, hang: -0.14, depth: 0.05, strap: true, fwdK: 0, twistK: 0 },
  tower: { hw: 0.185, hh: 0.315, hang: -0.09, depth: 0.06, strap: true, fwdK: -0.01, twistK: -0.04, wall: true },
  // The greatshield class. Each rung is a little more shield than the
  // last — measured against the rig, `aegis` spans shoulder line to
  // mid-shin, which is as far as a shield can grow before the legs
  // stop reading as legs.
  wall: { hw: 0.205, hh: 0.33, hang: -0.07, depth: 0.062, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  bastion: { hw: 0.195, hh: 0.335, hang: -0.07, depth: 0.062, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  aegis: { hw: 0.2, hh: 0.35, hang: -0.06, depth: 0.064, strap: true, fwdK: -0.02, twistK: -0.05, wall: true },
  // The bitten targe carries like a round — fist-gripped, angled out.
  targe: { hw: 0.165, hh: 0.165, hang: -0.22, depth: 0.036, strap: false, fwdK: 0.04, twistK: 0.12 },
  // The Champion's rib wall: kite-tall, worn on the arm.
  ribwall: { hw: 0.17, hh: 0.3, hang: -0.1, depth: 0.056, strap: true, fwdK: -0.01, twistK: -0.03 },
  // The thornwall: bastion class, and its heel spike wants ground room.
  thorn: { hw: 0.18, hh: 0.32, hang: -0.08, depth: 0.06, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  // THE SHIELD WAVE. The working doors first — tower class, sized a
  // shade under the greatshields their rungs answer to.
  breach: { hw: 0.19, hh: 0.31, hang: -0.09, depth: 0.06, strap: true, fwdK: -0.01, twistK: -0.04, wall: true },
  door: { hw: 0.2, hh: 0.3, hang: -0.1, depth: 0.062, strap: true, fwdK: -0.01, twistK: -0.04, wall: true },
  palisade: { hw: 0.195, hh: 0.325, hang: -0.075, depth: 0.058, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  gate: { hw: 0.2, hh: 0.33, hang: -0.07, depth: 0.06, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  // The carapace is the BROADEST wall — a shell spreads.
  carapace: { hw: 0.21, hh: 0.32, hang: -0.08, depth: 0.064, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  // The Court's round carries like the fist discs — punched, angled.
  courtround: { hw: 0.18, hh: 0.18, hang: -0.21, depth: 0.038, strap: false, fwdK: 0.04, twistK: 0.12 },
  pinion: { hw: 0.195, hh: 0.34, hang: -0.065, depth: 0.06, strap: true, fwdK: -0.02, twistK: -0.05, wall: true },
  // The reliquary and the leaf are ARM class: kite-blooded, guarded at
  // the chest, alive — ceremony does not plant.
  reliquary: { hw: 0.16, hh: 0.3, hang: -0.11, depth: 0.054, strap: true, fwdK: 0, twistK: 0 },
  furnace: { hw: 0.2, hh: 0.335, hang: -0.07, depth: 0.064, strap: true, fwdK: -0.015, twistK: -0.05, wall: true },
  leaf: { hw: 0.165, hh: 0.31, hang: -0.1, depth: 0.05, strap: true, fwdK: 0, twistK: 0 },
  riftward: { hw: 0.195, hh: 0.35, hang: -0.06, depth: 0.064, strap: true, fwdK: -0.02, twistK: -0.05, wall: true },
  // The Gate outgrows the aegis by a hair — the biggest plane in the
  // game, and the last one planned. Its crown clears the bearer's own
  // by construction: hang −0.055 keeps the crest under the head line.
  falls: { hw: 0.21, hh: 0.36, hang: -0.055, depth: 0.066, strap: true, fwdK: -0.02, twistK: -0.05, wall: true },
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
  /**
   * 1 = combat guard, 0 = the relaxed carry. The rune face reads this
   * ("flares on guard" — the offhand's documented rhythm): the sigil
   * ring brightens as the shield squares up. Optional because the
   * free-standing frames (icons, ragdolls) have no bearer to guard.
   */
  guard?: number;
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

  // ---- THE WALL CARRY, the second rig. The tower class is not a
  // bigger heater: a body does different things with a door.
  let plantK = 0;
  if (m.wall) {
    // THE PLANT. Settled into guard and standing still, the wall
    // GROUNDS: the face squares to the threat, the roll drains out of
    // it, and the whole plane rides low enough that the bottom rim
    // stands by the shin — a fortification the body lives behind, not
    // a prop the arm holds up. Every factor is continuous, so a step
    // or a swing melts the plant back into the living carriage.
    const planted =
      guard *
      (1 - Math.min(1, o.poleStrength)) *
      (1 - Math.max(0, Math.min(1, o.sling))) *
      (1 - o.thrust);
    plantK = planted;
    twist *= 1 - 0.55 * planted;
    tilt *= 1 - 0.85 * planted;
    lift += 0.045 * planted;
    fwd -= 0.03 * planted;
    // THE SHOULDER. Running, nobody keeps a door planted — it rises
    // off the ground line and cants into the stride, carried edge-
    // forward on the shoulder (the shared run law already turns it).
    lift -= 0.022 * o.runF;
    tilt += oside * 0.05 * o.runF;
    // THE BASH. The finisher is the wall's one attack: it goes in
    // face-first and square — the shared thrust adds reach and
    // opening; the wall doubles the drive and refuses the extra roll.
    fwd += 0.06 * o.thrust;
    tilt -= oside * 0.05 * o.thrust;
    // Crouched behind a wall, the body TUCKS — the shield stays tall
    // and the cover deepens instead of the shield shrinking away.
    lift += 0.03 * o.crouch;
    twist -= 0.18 * o.crouch;
  }

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
  // with a lag, never a pump. Damped hard — the shield is heavy, and
  // a WALL is heavier still: the tower class answers the stride and
  // the idle breath at two-thirds weight.
  const heft = m.wall ? 0.66 : 1;
  const gait = Math.min(1, o.poleStrength);
  const bob = o.swing * gait * heft;
  tilt += bob * (0.035 + 0.03 * o.runF);
  theta += bob * 0.06;
  // Standing breath, on the rig's own idle clock — and a PLANTED door
  // does not breathe: the ground is holding it, not the arm.
  const still = 1 - gait;
  tilt += Math.sin(o.nowMs * 0.0019 + 0.7) * 0.014 * still * heft * (1 - 0.85 * plantK);

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
  // THE SILHOUETTE PEEK (arms-v3 Phase 4): the away-DIAGONAL mirror of
  // the clearance above. The |fy| across-term decays exactly at the
  // three-quarter-away facings while the forward reach carries the
  // plane onto the torso column — the kiteshield vanished COMPLETELY
  // at NE and NW (the audit's invisible-loadout verdict: a sword-and-
  // board knight read as unarmed from a quarter of the compass). A
  // dedicated away clearance, peaking through the away diagonals and
  // zero at pure north (already readable) and both profiles, keeps a
  // rim's worth of boards outside the silhouette.
  const awayBand =
    Math.max(0, Math.min(1, -o.fy / 0.2)) * Math.max(0, Math.min(1, (0.95 + o.fy) / 0.2));
  const awayClearX = 0.16 * Math.abs(o.fx) * awayBand;
  let cx =
    o.x +
    o.fx * fwd * s * o.wS +
    oside * (Math.abs(o.fy) * lat + clearX + awayClearX) * s * o.wS;
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
  // The slung anchor: high across the back, off-side shoulder. The
  // lateral seat is REAL shoulder width — at the straight-away facing
  // fx is 0 and the old 0.09 offset parked the boards on the spine,
  // fused with the head column (the lab's board-N verdict cell); the
  // guige hangs a shield ON a shoulder, beside the neck, a notch
  // below the shoulder line.
  if (sling > 0) {
    const bx = o.x - o.fx * 0.15 * s * o.wS + oside * 0.18 * s * o.wS;
    const by = o.shoulderY + 0.24 * s - o.fy * 0.15 * s * GROUND_K;
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
    // Slung, nobody is guarding with it — the flare fades with the swing
    // onto the back.
    guard: guard * (1 - sling),
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
  // ---- THE RELIEF PASS: the shield's raised fittings, projected off
  // the face with real height the way the umbo always was. Painted
  // between the rim and the boss so a proud charge can still duck
  // under a prouder stone.
  // THE FURNITURE TIER: raised surface work — plates, bands, lips,
  // worked charges. Furniture obeys the face's own grazing law (past
  // open 0.24 the face is a sliver and anything on it collapses into
  // floating sheets — the steep-yaw verdict), and it is clipped to
  // THE SWEPT SILHOUETTE: the union of the outline ring at the face
  // and at the furniture ceiling, which is the volume the shield
  // actually occupies through its own thickness. Furniture may stand
  // off the plane; it can never leave the shield.
  if (!hurt && !fr.seeBack && fr.open >= 0.24) {
    const relief = st.sig ? RELIEFS[st.sig] : undefined;
    if (relief) {
      const litU2 = hxU >= 0 ? -1 : 1;
      ctx.save();
      ctx.beginPath();
      const grow = 1.03;
      for (const h of [0, 0.95]) {
        for (let i = 0; i < n; i++) {
          const u = outline[i * 2]! * grow;
          const t = outline[i * 2 + 1]! * grow;
          const x = u * hxU + nxU * (crown + h);
          const y = u * hyU + t * fr.hh + nyU * (crown + h);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      ctx.clip();
      relief({ ctx, fr, hxU, hyU, nxU, nyU, crown, litU: litU2 }, st);
      ctx.restore();
    }
  }
  if (st.boss && !fr.seeBack) drawBoss(ctx, st, fr, hxU, hyU, nxU, nyU, crown);
  if (st.spikes && !hurt) drawSpikes(ctx, st, fr, outline, hxU, hyU, nxU, nyU, crown);
  // THE CREST TIER: the free-standing solids — face spires, mounted
  // bone, crown finials. A crest is a 3D object that happens to be
  // bolted to a 2.5D plane: face-on its apex foreshortens toward the
  // eye, turned it PROTRUDES with its whole length, and near edge-on
  // it is still there, breaking the slab's profile — which is the
  // entire point of a spiked shield. No clip, no grazing gate; only
  // the shield's back hides it.
  if (!hurt && !fr.seeBack) {
    const crest = st.sig ? CRESTS[st.sig] : undefined;
    if (crest) {
      const litU2 = hxU >= 0 ? -1 : 1;
      crest({ ctx, fr, hxU, hyU, nxU, nyU, crown, litU: litU2 }, st);
    }
  }
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
  // "Flares on guard": the ring brightens as the shield squares up —
  // the raised shield IS the offhand's rhythm. Tier 1 keeps its glint
  // vocabulary only; a steady guard-lit face would be a channel it has
  // not earned.
  const flare = mark.tier >= 2 ? 0.3 * (fr.guard ?? 0) : 0;
  const a = markPulse(mark, nowMs, SLOT_GLINT_PHASE.offhand ?? 0, 0.6) + flare;
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
  // THE SHIELD WAVE.
  breacher: sigBreacher,
  doorwall: sigDoorwall,
  palisade: sigPalisade,
  fellhorn: sigFellhorn,
  carapace: sigCarapace,
  wintercourt: sigWintercourt,
  pinion: sigPinion,
  reliquary: sigReliquary,
  cindermaw: sigCindermaw,
  everwood: sigEverwood,
  riftward: sigRiftward,
  falls: sigFalls,
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

// --------------------------------------- THE SHIELD WAVE's signatures

/**
 * LOWHALL BREACHER — a tool that got promoted. Three lacquered boards,
 * the iron boot plate at the heel (one band, two bolts), two crowbar
 * scars that never buffed out, and the company's red slash struck
 * across the top corner. Everything on it has been used twice.
 */
function sigBreacher(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 3);
  // The boot plate: the working end. One iron band low on the boards.
  band(ctx, st, 0.68, 0.24);
  stud(ctx, -0.5, 0.8, 0.08, shade(st.rim, 30));
  stud(ctx, 0.5, 0.8, 0.08, shade(st.rim, 30));
  // Crowbar scars: two pale nicks where somebody argued back — bare
  // wood showing through the lacquer, nothing more.
  const bare = shade(st.face, 38);
  ctx.save();
  ctx.rotate(-0.28);
  ctx.fillStyle = bare;
  ctx.fillRect(0.28, -0.32, 0.34, 0.05);
  ctx.fillRect(0.12, 0.1, 0.26, 0.045);
  ctx.restore();
  // The company's mark: one broad red slash, painted fast by hand —
  // it OWNS the door's top corner, because the crew signs a finished
  // job where everyone will see it, and a short second stroke keeps
  // the tally. Paint, not metal: no lit plane, one darker drip edge.
  const red = '#a83430';
  poly(ctx, red, [-1.1, -1.02, -0.18, -0.42, -0.4, -0.26, -1.1, -0.74]);
  poly(ctx, shade(red, -24), [-0.4, -0.26, -0.18, -0.42, -0.22, -0.24, -0.38, -0.16]);
  poly(ctx, red, [-0.62, -1.02, -0.3, -0.82, -0.44, -0.68, -0.78, -0.92]);
}

/**
 * LEGION DOORWALL — issue iron. Two forged plates, one crimson
 * campaign band, and six diamond bosses in two drill columns. The
 * three edge spikes ride the spike plan on the OUTER edge — where the
 * shield-wall's line ends and the argument starts.
 */
function sigDoorwall(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  // The campaign band: crimson, high on the slab, one lit edge — the
  // one thing on the wall that says WHICH war.
  const red = st.deviceColor ?? '#8e2f2c';
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.2, -0.72, 2.4, 0.28);
  ctx.fillStyle = red;
  ctx.fillRect(-1.2, -0.7, 2.4, 0.22);
  ctx.fillStyle = shade(red, 24);
  ctx.fillRect(-1.2, -0.7, 2.4, 0.07);
  // The six forged bosses are THE RELIEF PASS's now — pyramids at
  // real height (relDoorwall). The flat pass keeps only their seat
  // shadows so a grazing view still hints at the drill columns.
  for (const u of [-0.5, 0.5]) {
    for (const t of [-0.14, 0.32, 0.78]) {
      poly(ctx, shade(st.face, -20), [u, t - 0.2, u + 0.165, t, u, t + 0.2, u - 0.165, t]);
    }
  }
}

/**
 * STAGHEART PALISADE — fence, carried. Four ash staves, a dark shadow
 * wedge under each crown valley (the stakes part and the light does
 * too), two rawhide lashings racked across the boards, and the tar
 * antler-brow painted where a hunter marks a claimed stand.
 */
function sigPalisade(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 4);
  // The valleys between the stakes throw their own shade.
  poly(ctx, SEAM, [-0.42, -0.66, -0.24, -0.66, -0.33, -0.44]);
  poly(ctx, SEAM, [0.24, -0.66, 0.42, -0.66, 0.33, -0.44]);
  // Two rawhide lashings, each a band with one lit pass — hide, not
  // metal, so they take the strap leather and not the rim.
  const hide = st.strapColor ?? '#4a3524';
  for (const t of [-0.32, 0.34]) {
    ctx.fillStyle = SEAM;
    ctx.fillRect(-1.2, t + 0.16, 2.4, 0.04);
    ctx.fillStyle = hide;
    ctx.fillRect(-1.2, t, 2.4, 0.16);
    ctx.fillStyle = shade(hide, 24);
    ctx.fillRect(-1.2, t, 2.4, 0.05);
  }
  // The tar antler-brow: two mirrored beams, two tines each, painted
  // in one sitting with a stick. It is a MARK, not a picture.
  const tar = st.deviceColor ?? '#2e2a24';
  for (const sx of [-1, 1]) {
    poly(ctx, tar, [sx * 0.06, 0.06, sx * 0.5, -0.14, sx * 0.56, -0.06, sx * 0.1, 0.14]);
    poly(ctx, tar, [sx * 0.3, -0.05, sx * 0.4, -0.3, sx * 0.48, -0.26, sx * 0.38, -0.02]);
    poly(ctx, tar, [sx * 0.48, -0.12, sx * 0.64, -0.3, sx * 0.7, -0.24, sx * 0.55, -0.05]);
  }
}

/**
 * FELLHORN GATE — a door off its hinges, hinges included. Three
 * weathered planks, two iron scroll-straps still bolted where the
 * jambs were, the tar fell-mark low on the boards, and the ram's
 * skull at the crown: dome, sockets, and two horns curling DOWN the
 * arch — the one figurative charge in the roster, cut in seven flat
 * planes and no more.
 */
function sigFellhorn(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  staves(ctx, st, 3);
  // The hinge straps: iron reaching in from each edge, ending in a
  // rolled scroll — one plate, one lit pass, one curl.
  const iron = st.rim;
  for (const sx of [-1, 1]) {
    const x0 = sx * 1.2;
    const x1 = sx * 0.3;
    poly(ctx, SEAM, [x0, -0.06, x1, -0.06, x1, 0.18, x0, 0.18]);
    poly(ctx, iron, [x0, -0.03, x1, -0.03, x1, 0.15, x0, 0.15]);
    poly(ctx, shade(iron, 22), [x0, -0.03, x1, -0.03, x1, 0.02, x0, 0.02]);
    // The scroll: the strap's end rolled back on itself.
    stud(ctx, sx * 0.3, 0.06, 0.09, shade(iron, 30));
  }
  // The fell-mark: a tar chevron POINTING DOWN — the walker's sign for
  // "barrow below", struck low where a hand reaches.
  const tar = '#332e26';
  poly(ctx, tar, [-0.6, 0.42, 0, 0.72, 0.6, 0.42, 0.6, 0.56, 0, 0.86, -0.6, 0.56]);
  // The ram's skull at the crown: dome, muzzle, brow shade, two dark
  // sockets. The HORNS are the spike plan's — real bone rising off
  // the arch either side, breaking the silhouette the way the fell
  // marks its gates — so the face only mounts the skull between them.
  const bone = st.deviceColor ?? '#ddd4bc';
  const boneDk = shade(bone, -24);
  poly(ctx, SEAM, [-0.36, -0.96, 0.36, -0.96, 0.42, -0.46, 0.19, -0.1, -0.19, -0.1, -0.42, -0.46]);
  poly(ctx, bone, [-0.31, -0.92, 0.31, -0.92, 0.36, -0.49, 0.16, -0.17, -0.16, -0.17, -0.36, -0.49]);
  // The brow shelf: one darker plane across the dome's lower third.
  poly(ctx, boneDk, [-0.34, -0.52, 0.34, -0.52, 0.16, -0.17, -0.16, -0.17]);
  // The muzzle, a shade lighter than the brow it hangs from.
  poly(ctx, bone, [-0.1, -0.3, 0.1, -0.3, 0.06, -0.08, -0.06, -0.08]);
  poly(ctx, SEAM, [-0.24, -0.56, -0.07, -0.56, -0.14, -0.36]);
  poly(ctx, SEAM, [0.07, -0.56, 0.24, -0.56, 0.14, -0.36]);
}

/**
 * BRINEHOLD CARAPACE — the sea builds symmetric. Three shell courses
 * lapping downward (each one plate, one lit pass, one seam under its
 * scalloped edge), a keel seam down the middle, and four barnacle
 * studs where they chose to live. The pearl is the substrate's boss.
 */
function sigCarapace(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  ctx.fillStyle = st.face;
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  // Three courses lapping downward, each ending in a SCALLOPED chord:
  // two arcs meeting at a center point, the way shell actually grows.
  // The course below is a full step darker so the lap reads as depth,
  // and the seam is a thin line riding the scallop — never a bar.
  const alt = st.faceAlt ?? shade(st.face, -16);
  const scallop = (t0: number, dip: number, tone: string): void => {
    // The course: everything below its scalloped top edge.
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(-1.2, t0);
    ctx.quadraticCurveTo(-0.55, t0 + dip, 0, t0 + dip * 0.45);
    ctx.quadraticCurveTo(0.55, t0 + dip, 1.2, t0);
    ctx.lineTo(1.2, 1.25);
    ctx.lineTo(-1.2, 1.25);
    ctx.closePath();
    ctx.fill();
    // The lap's thin shadow line, riding the same curve.
    ctx.fillStyle = SEAM;
    ctx.beginPath();
    ctx.moveTo(-1.2, t0);
    ctx.quadraticCurveTo(-0.55, t0 + dip, 0, t0 + dip * 0.45);
    ctx.quadraticCurveTo(0.55, t0 + dip, 1.2, t0);
    ctx.lineTo(1.2, t0 + 0.05);
    ctx.quadraticCurveTo(0.55, t0 + dip + 0.05, 0, t0 + dip * 0.45 + 0.05);
    ctx.quadraticCurveTo(-0.55, t0 + dip + 0.05, -1.2, t0 + 0.05);
    ctx.closePath();
    ctx.fill();
    // One lit pass under the lap — the new plate catching the sun.
    ctx.fillStyle = shade(tone, 16);
    ctx.beginPath();
    ctx.moveTo(-1.2, t0 + 0.05);
    ctx.quadraticCurveTo(-0.55, t0 + dip + 0.05, 0, t0 + dip * 0.45 + 0.05);
    ctx.quadraticCurveTo(0.55, t0 + dip + 0.05, 1.2, t0 + 0.05);
    ctx.lineTo(1.2, t0 + 0.14);
    ctx.quadraticCurveTo(0.55, t0 + dip + 0.14, 0, t0 + dip * 0.45 + 0.14);
    ctx.quadraticCurveTo(-0.55, t0 + dip + 0.14, -1.2, t0 + 0.14);
    ctx.closePath();
    ctx.fill();
  };
  scallop(-0.5, 0.3, shade(st.face, -8));
  scallop(0.14, 0.34, alt);
  scallop(0.72, 0.3, shade(alt, -10));
  // The keel: one dark seam, one lit side — the ridge the shell grew
  // out from, and the sun picks its up-screen flank.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.025, -1.2, 0.05, 2.4);
  ctx.fillStyle = shade(st.face, 22);
  ctx.fillRect(litU > 0 ? 0.025 : -0.115, -1.2, 0.09, 2.4);
  // Barnacles: pale, few, riding the course edges where the water
  // actually leaves them.
  const pale = '#cfc9b4';
  stud(ctx, -0.62, -0.62, 0.07, pale);
  stud(ctx, 0.72, -0.14, 0.06, pale);
  stud(ctx, -0.44, 0.52, 0.06, pale);
}

/**
 * WINTERCOURT RIME — cold ceremony. Nine pale facets, a court-silver
 * crescent inlaid high on the off quarter, and the rime star: eight
 * everfrost splinters struck from the heart at the lengths ice
 * actually grows — uneven, and each one a single flat shard.
 */
function sigWintercourt(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  gores(ctx, st, 4);
  // The crescent: inlay, not paint — a seam ring under a silver moon,
  // and the bite cut back out in the FACE's own unshaded tone, so
  // what remains is honestly a crescent and not a coin.
  const silver = st.deviceColor ?? '#dce4f0';
  ctx.fillStyle = SEAM;
  ctx.beginPath();
  ctx.arc(-0.42, -0.4, 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = silver;
  ctx.beginPath();
  ctx.arc(-0.42, -0.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = st.face;
  ctx.beginPath();
  ctx.arc(-0.24, -0.48, 0.28, 0, Math.PI * 2);
  ctx.fill();
  // The rime star: splinters at ice's own lengths, each on its own
  // seam-dark shard so the ice reads against the pale face — the one
  // charge on the disc, and it has to carry from across a room.
  const frost = '#6db8d8';
  const lit = '#b8e6f6';
  const lens = [0.98, 0.55, 0.84, 0.5, 0.94, 0.52, 0.8, 0.48];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + 0.12;
    const L = lens[i]!;
    const w = 0.085 + 0.035 * (L > 0.8 ? 1 : 0);
    const cu = Math.cos(a);
    const ct = Math.sin(a);
    // The shard's shadow first — a hair wider and longer.
    poly(ctx, SEAM, [
      -ct * (w + 0.025), cu * (w + 0.025), cu * (L + 0.05), ct * (L + 0.05),
      ct * (w + 0.025), -cu * (w + 0.025),
    ]);
    poly(ctx, i < 2 || i === 7 ? lit : frost, [
      -ct * w, cu * w, cu * L, ct * L, ct * w, -cu * w,
    ]);
  }
  poly(ctx, SEAM, [0, -0.18, 0.16, 0, 0, 0.18, -0.16, 0]);
}

/**
 * NIGHTVEIL PINION — the veil's wing. Two night-steel plates, the
 * feather shade wedges stepping down the fletched edge so each barb
 * reads as its own laid feather, the gilded rachis seam crown to
 * heel, and one gold stud bedding each barb root. The warm metal
 * spent the veil's way: three thin lines in the dark.
 */
function sigPinion(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  // The laid feathers: a LIGHTER wedge over each barb of the outline,
  // so the silhouette's steps continue INTO the face as laid vanes —
  // dark-on-dark hid them entirely; a step of light is the read.
  const vane = shade(st.face, 14);
  poly(ctx, vane, [0.24, -0.6, 1.1, -0.46, 0.52, -0.14, 0.2, -0.3]);
  poly(ctx, vane, [0.22, -0.12, 1.05, 0.02, 0.5, 0.34, 0.16, 0.14]);
  poly(ctx, vane, [0.18, 0.34, 0.95, 0.52, 0.34, 0.84, 0.12, 0.6]);
  // The rachis: one gilded seam holding the whole wing, riding NEAR
  // the fletched edge the way a feather's spine actually does, with
  // its own shadow line and one bright pass.
  const gold = st.deviceColor ?? BRASS;
  poly(ctx, SEAM, [0.14, -1.1, 0.28, -1.1, 0.52, 1.1, 0.34, 1.1]);
  poly(ctx, gold, [0.17, -1.1, 0.27, -1.1, 0.49, 1.1, 0.37, 1.1]);
  poly(ctx, shade(gold, 30), [0.17, -1.1, 0.22, -1.1, 0.43, 1.1, 0.37, 1.1]);
  // A gold bead where each feather beds into the spine.
  stud(ctx, 0.3, -0.44, 0.07, gold);
  stud(ctx, 0.36, 0.06, 0.07, gold);
  stud(ctx, 0.42, 0.52, 0.07, gold);
}

/**
 * VALE RELIQUARY — shrine architecture. The enamel field steps once
 * (a darker border course inside the binding), then the moonsilver
 * cross: slender bars, flared finials at all four ends, a moonstone
 * at the crossing. Polished by every mile of the pilgrim way.
 */
function sigReliquary(ctx: CanvasRenderingContext2D, st: ShieldStyle): void {
  const border = st.faceAlt ?? shade(st.face, -20);
  ctx.fillStyle = border;
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  ctx.fillStyle = st.face;
  ctx.fillRect(-0.74, -0.82, 1.48, 1.66);
  ctx.fillStyle = shade(st.face, 12);
  ctx.fillRect(-0.74, -0.82, 0.2, 1.66);
  // The cross: shadow first, then silver, then one lit pass down the
  // stem — worked metal, not a painted charge. The crossing sits at
  // the face's center, because the substrate's moonstone boss lands
  // there and the stone belongs where the silver meets.
  const silver = st.deviceColor ?? '#dce4f0';
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.115, -0.78, 0.23, 1.56);
  ctx.fillRect(-0.54, -0.115, 1.08, 0.23);
  ctx.fillStyle = silver;
  ctx.fillRect(-0.08, -0.76, 0.16, 1.5);
  ctx.fillRect(-0.51, -0.085, 1.02, 0.17);
  ctx.fillStyle = shade(silver, 24);
  ctx.fillRect(-0.08, -0.76, 0.055, 1.5);
  // Diamond finials: each bar ends in a set lozenge on its own seam
  // seat — reliquary metalwork, not an arrowhead. Four times.
  const fin = (u: number, t: number): void => {
    poly(ctx, SEAM, [u, t - 0.17, u + 0.14, t, u, t + 0.17, u - 0.14, t]);
    poly(ctx, silver, [u, t - 0.13, u + 0.105, t, u, t + 0.13, u - 0.105, t]);
    poly(ctx, shade(silver, -30), [u, t, u + 0.105, t, u, t + 0.13, u - 0.105, t]);
  };
  fin(0, -0.76);
  fin(0, 0.74);
  fin(-0.51, 0);
  fin(0.51, 0);
}

/**
 * CINDERMAW BULWARK — the fire is still between the plates. Four
 * charred panels whose SEAMS are embers (deep coal, live core, one
 * white-hot hairline), the grate mouth at the heart venting three
 * slots of the same fire, and a heat-crack across the crown corner,
 * left there because the Brand signs its work with what it survived.
 */
function sigCindermaw(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  const deep = '#b8481e';
  const core = st.deviceColor ?? '#ff8a3c';
  const hot = '#ffc06a';
  // The ember seams: the cross between the four plates, burning.
  const emberV = (u: number, t0: number, t1: number): void => {
    ctx.fillStyle = deep;
    ctx.fillRect(u - 0.06, t0, 0.12, t1 - t0);
    ctx.fillStyle = core;
    ctx.fillRect(u - 0.03, t0, 0.06, t1 - t0);
    ctx.fillStyle = hot;
    ctx.fillRect(u - 0.008, t0, 0.016, t1 - t0);
  };
  const emberH = (t: number): void => {
    ctx.fillStyle = deep;
    ctx.fillRect(-1.2, t - 0.055, 2.4, 0.11);
    ctx.fillStyle = core;
    ctx.fillRect(-1.2, t - 0.028, 2.4, 0.056);
    ctx.fillStyle = hot;
    ctx.fillRect(-1.2, t - 0.007, 2.4, 0.014);
  };
  emberH(-0.38);
  emberH(0.5);
  emberV(0, -1.2, -0.38);
  emberV(0, 0.5, 1.2);
  // The grate mouth: one dark plate, three burning slots. The heart
  // of the door, and the reason for its name.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.5, -0.18, 1.0, 0.5);
  ctx.fillStyle = shade(st.face, 14);
  ctx.fillRect(-0.5, -0.18, 1.0, 0.08);
  for (const u of [-0.3, 0, 0.3]) {
    ctx.fillStyle = deep;
    ctx.fillRect(u - 0.065, -0.06, 0.13, 0.3);
    ctx.fillStyle = core;
    ctx.fillRect(u - 0.035, -0.06, 0.07, 0.3);
    ctx.fillStyle = hot;
    ctx.fillRect(u - 0.012, -0.06, 0.024, 0.14);
  }
  // The crack: three chords of ember walking out of the crown corner.
  poly(ctx, core, [-0.95, -1.1, -0.88, -1.1, -0.62, -0.78, -0.7, -0.62, -0.76, -0.66, -0.68, -0.8]);
}

/**
 * EVERWOOD CREST — the tree laid the design. A margin shade where the
 * blade turns from the sun, the midrib carrying its own pale light
 * from tip to stem, and three vein pairs at the angles leaves
 * actually hold. The middle pair is the IMBUED one — the single
 * brightest thing on the face, and the only working on it.
 */
function sigEverwood(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  ctx.fillStyle = st.face;
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  // The margin turns from the sun: one shade plane along the off side.
  poly(ctx, st.faceAlt ?? shade(st.face, -14), [
    -litU * 1.2, -1.2, -litU * 0.5, -1.2, -litU * 0.85, 0.2, -litU * 0.4, 1.2, -litU * 1.2, 1.2,
  ]);
  const vein = st.deviceColor ?? '#9db86a';
  const deep = shade(vein, -28);
  const glow = '#e6f0c2';
  // Three vein pairs, tip-ward angles. Thin quads, nothing soft —
  // each on a deeper under-vein so the growth reads on the pale blade.
  const pair = (t: number, len: number, tone: string, w: number): void => {
    for (const sx of [-1, 1]) {
      poly(ctx, tone, [
        sx * 0.05, t, sx * len, t + len * 0.55, sx * len, t + len * 0.55 + w, sx * 0.05, t + w,
      ]);
    }
  };
  pair(-0.55, 0.66, deep, 0.075);
  pair(-0.55, 0.66, vein, 0.04);
  pair(0.35, 0.58, deep, 0.075);
  pair(0.35, 0.58, vein, 0.04);
  // The midrib: seam, rib, and the light it carries.
  poly(ctx, SEAM, [-0.11, -0.9, 0.11, -0.9, 0.09, 1.05, -0.09, 1.05]);
  poly(ctx, deep, [-0.085, -0.92, 0.085, -0.92, 0.07, 1.05, -0.07, 1.05]);
  poly(ctx, glow, [-0.032, -0.92, 0.032, -0.92, 0.024, 1.02, -0.024, 1.02]);
  // The imbued pair, over the midrib so the light reads as ONE vein
  // system: the working the Everwood put in, not an ornament bolted
  // on — and a seam seat at the heart so the knot boss lands SET.
  pair(-0.12, 0.72, glow, 0.034);
  poly(ctx, SEAM, [0, -0.2, 0.17, 0, 0, 0.2, -0.17, 0]);
}

/**
 * GATEFALL BULWARK — a window onto a place nobody has finished
 * looking into. Two void plates, the bezel (a seam frame with four
 * bolts), the gate glass with one bright facet and one deep one, and
 * two splinters of its light that have escaped the frame and stayed.
 */
function sigRiftward(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  const glass = st.deviceColor ?? '#a985ff';
  const bright = '#cbb4ff';
  const deep = '#7a5fd0';
  // The bezel: one dark frame, standing a seam's width proud.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-0.5, -0.82, 1.0, 1.44);
  // The glass, in three facets: base, one bright diagonal, one deep
  // heel — cut planes, not a gradient in sight.
  ctx.fillStyle = glass;
  ctx.fillRect(-0.42, -0.74, 0.84, 1.28);
  poly(ctx, bright, [-0.42, -0.74, 0.42, -0.74, -0.42, 0.2]);
  poly(ctx, deep, [-0.42, 0.54, 0.42, 0.54, 0.42, -0.1]);
  // The splinters: light that got OUT. Two shards past the frame,
  // frozen mid-escape — the only asymmetry on the piece.
  poly(ctx, bright, [0.5, -0.6, 0.78, -0.78, 0.6, -0.44]);
  poly(ctx, glass, [-0.5, 0.12, -0.76, 0.02, -0.52, 0.3]);
  // Four bolts holding a window shut.
  const bolt = shade(st.rim, 34);
  stud(ctx, -0.58, -0.88, 0.07, bolt);
  stud(ctx, 0.58, -0.88, 0.07, bolt);
  stud(ctx, -0.58, 0.68, 0.07, bolt);
  stud(ctx, 0.58, 0.68, 0.07, bolt);
}

/**
 * ALDAREN'S GATE — the crowned falls as heraldry. The gold chief
 * rides the outline's own three crown points, and below it three
 * cascade stripes fall the full height of the face: the capital's
 * water, moonpale on moonpale, each stripe one plate and one bright
 * edge. The king's answer to the sun.
 */
function sigFalls(
  ctx: CanvasRenderingContext2D,
  st: ShieldStyle,
  fr: ShieldFrame,
  litU: number,
): void {
  plates(ctx, st, litU);
  const gold = st.deviceColor ?? '#e6c36a';
  // The chief: gold to the crown line, one seam, one lit pass — the
  // spike plan's three crown points rise out of THIS band, so the
  // crest reads as solid gold from the standing points to the seam.
  ctx.fillStyle = SEAM;
  ctx.fillRect(-1.2, -0.58, 2.4, 0.06);
  ctx.fillStyle = gold;
  ctx.fillRect(-1.2, -1.2, 2.4, 0.62);
  ctx.fillStyle = shade(gold, 24);
  ctx.fillRect(-1.2, -0.72, 2.4, 0.09);
  // The falls: three cascades off the chief, the middle one wider —
  // water finds the middle of a spillway. The field between them
  // steps DOWN to the alt tone first: white water only reads against
  // rock, and the first cut washed out into its own face.
  ctx.fillStyle = st.faceAlt ?? shade(st.face, -14);
  ctx.fillRect(-1.2, -0.52, 2.4, 1.72);
  ctx.fillStyle = shade(st.faceAlt ?? st.face, -12);
  ctx.fillRect(litU > 0 ? -1.2 : 0, -0.52, 1.2, 1.72);
  const water = '#eef4fc';
  const bright = '#ffffff';
  const stripe = (u: number, w: number): void => {
    ctx.fillStyle = SEAM;
    ctx.fillRect(u - w / 2 - 0.03, -0.52, w + 0.06, 1.72);
    ctx.fillStyle = water;
    ctx.fillRect(u - w / 2, -0.52, w, 1.72);
    ctx.fillStyle = bright;
    ctx.fillRect(litU > 0 ? u + w / 2 - 0.05 : u - w / 2, -0.52, 0.05, 1.72);
  };
  stripe(-0.55, 0.17);
  stripe(0, 0.24);
  stripe(0.55, 0.17);
  // Two gold rivets where the chief is bolted through the face —
  // spent low and countable, the ladder's whole discipline.
  stud(ctx, -0.88, -0.66, 0.075, shade(gold, 30));
  stud(ctx, 0.88, -0.66, 0.075, shade(gold, 30));
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
  // THE RELIEF LAW reaches the teeth: a spike is a RIDGED solid now —
  // two facets meeting on a raised spine from root to tip, the sun
  // dealt to whichever facet rides up-screen. The silhouette the old
  // flat triangle drew is preserved exactly; the ridge lives inside it.
  const pxh = (u2: number, h: number): number => u2 * hxU + nxU * (crown + h);
  const pyh = (u2: number, t2: number, h: number): number =>
    u2 * hyU + t2 * fr.hh + nyU * (crown + h);
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
    // The flat base keeps the exact old silhouette under the facets.
    ctx.fillStyle = shade(c, -18);
    ctx.beginPath();
    ctx.moveTo(px(cu * root + wu), py(cu * root + wu, ct2 * root + wt));
    ctx.lineTo(px(cu * tip), py(cu * tip, ct2 * tip));
    ctx.lineTo(px(cu * root - wu), py(cu * root - wu, ct2 * root - wt));
    ctx.closePath();
    ctx.fill();
    // The spine: the mid-root raised, the tip lifted a hair with it.
    const spineX = pxh(cu * root, 0.42);
    const spineY = pyh(cu * root, ct2 * root, 0.42);
    const tipX = pxh(cu * tip, 0.12);
    const tipY = pyh(cu * tip, ct2 * tip, 0.12);
    const e1x = px(cu * root + wu);
    const e1y = py(cu * root + wu, ct2 * root + wt);
    const e2x = px(cu * root - wu);
    const e2y = py(cu * root - wu, ct2 * root - wt);
    const facet = (ex: number, ey: number, tone: string): void => {
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(spineX, spineY);
      ctx.closePath();
      ctx.fill();
    };
    facet(e1x, e1y, e1y <= e2y ? shade(c, 26) : shade(c, -14));
    facet(e2x, e2y, e2y < e1y ? shade(c, 26) : shade(c, -14));
  }
}

/* ========================= THE RELIEF LAW ===========================
 *
 * (2026-08-16, the depth verdict.) A charge painted ON the plane is a
 * decal; a charge that STANDS OFF the plane is a fitting. The umbo
 * proved the projection years of shields ago — a dome at height
 * `crown + h` along the face normal survives to the silhouette at
 * profile — and this pass extends that citizenship to every raised
 * thing a smith would actually raise: bosses in drill columns, a
 * skull mounted on a gate, a chief that physically laps its field.
 *
 * The vocabulary is three solids and a shadow:
 *  - PRISM   an outline extruded from h0 to h1: side walls in one
 *            dark tone, the up-screen walls re-struck a step lighter
 *            (the shell's own trick), a flat top plate;
 *  - PYRAMID four facets to an apex, tones dealt by screen height so
 *            the sun stays up-screen through the whole yaw;
 *  - the CAST SHADOW: the footprint at face level, displaced down-
 *    screen by the height — one translucent SEAM fill, and the one
 *    thing that makes a raised element read as raised at a glance.
 *
 * The FLAT budget still owns the face itself (fields, seats, marks —
 * paint, not metal). Height is spent the way the ladder spends brass:
 * on the few fittings that ARE the shield's character, never on
 * texture. Everything projects through the same basis the boss and
 * the spikes use, so relief foreshortens, slides, and hides with the
 * plane by construction at all eight facings.
 */

interface ReliefCtx {
  ctx: CanvasRenderingContext2D;
  fr: ShieldFrame;
  hxU: number;
  hyU: number;
  nxU: number;
  nyU: number;
  crown: number;
  litU: number;
}

type ReliefPainter = (rc: ReliefCtx, st: ShieldStyle) => void;

/** Design-space (u, t) at height h (in shell-depth multiples) → local px. */
function rPx(rc: ReliefCtx, u: number, h: number): number {
  return u * rc.hxU + rc.nxU * (rc.crown + h);
}
function rPy(rc: ReliefCtx, u: number, t: number, h: number): number {
  return u * rc.hyU + t * rc.fr.hh + rc.nyU * (rc.crown + h);
}

/** A flat polygon projected at height h — top-plate detail work. */
function polyAt(rc: ReliefCtx, pts: number[], h: number, tone: string): void {
  const { ctx } = rc;
  ctx.fillStyle = tone;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = rPx(rc, pts[i]!, h);
    const y = rPy(rc, pts[i]!, pts[i + 1]!, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * THE CAST SHADOW: the element's footprint at face level, displaced
 * down-screen by its height. Light lives up-screen everywhere in this
 * game, so the displacement is a screen fact, not a design one.
 */
function reliefShadow(rc: ReliefCtx, pts: number[], h: number): void {
  const { ctx } = rc;
  const dy = rc.fr.depth * h * 0.85;
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = SEAM;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = rPx(rc, pts[i]!, 0);
    const y = rPy(rc, pts[i]!, pts[i + 1]!, 0) + dy;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * THE PRISM: an outline extruded from h0 to h1. Walls are one nonzero
 * union (slivers cannot stripe), the up-screen walls re-struck a step
 * lighter, then the top plate. The caller details the top with polyAt.
 */
function prism(
  rc: ReliefCtx,
  pts: number[],
  h0: number,
  h1: number,
  top: string,
  opts?: { wallDark?: string; wallLit?: string; shadow?: boolean; topFill?: boolean },
): void {
  const { ctx } = rc;
  const n = pts.length / 2;
  if (opts?.shadow !== false) reliefShadow(rc, pts, h1);
  // Centroid of the top ring — the up/down screen split.
  let cy0 = 0;
  for (let i = 0; i < n; i++) cy0 += rPy(rc, pts[i * 2]!, pts[i * 2 + 1]!, h1);
  cy0 /= n;
  const wall = (tone: string, upOnly: boolean): void => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ui = pts[i * 2]!;
      const ti = pts[i * 2 + 1]!;
      const uj = pts[j * 2]!;
      const tj = pts[j * 2 + 1]!;
      if (upOnly) {
        const mid = (rPy(rc, ui, ti, h1) + rPy(rc, uj, tj, h1)) / 2;
        if (mid >= cy0) continue;
      }
      ctx.moveTo(rPx(rc, ui, h0), rPy(rc, ui, ti, h0));
      ctx.lineTo(rPx(rc, uj, h0), rPy(rc, uj, tj, h0));
      ctx.lineTo(rPx(rc, uj, h1), rPy(rc, uj, tj, h1));
      ctx.lineTo(rPx(rc, ui, h1), rPy(rc, ui, ti, h1));
      ctx.closePath();
    }
    ctx.fill();
  };
  wall(opts?.wallDark ?? shade(top, -34), false);
  wall(opts?.wallLit ?? shade(top, -8), true);
  if (opts?.topFill !== false) polyAt(rc, pts, h1, top);
}

/**
 * THE PYRAMID: a forged boss — four facets rising to an apex, tones
 * dealt by each facet's screen height so the brightest face is always
 * the one turned to the sun, at every yaw of the plane.
 */
function pyramid(
  rc: ReliefCtx,
  u: number,
  t: number,
  ru: number,
  rt: number,
  h0: number,
  h1: number,
  tone: string,
): void {
  const { ctx } = rc;
  const base: Array<[number, number]> = [
    [u, t - rt],
    [u + ru, t],
    [u, t + rt],
    [u - ru, t],
  ];
  // Tall spires clamp their cast shadow — a six-inch spike does not
  // drag a six-inch stain down the boards.
  reliefShadow(rc, [u, t - rt, u + ru, t, u, t + rt, u - ru, t], Math.min(h1, 0.9));
  const ax = rPx(rc, u, h1);
  const ay = rPy(rc, u, t, h1);
  // Facet order by screen height of the base-edge midpoint: the
  // up-screen facet takes the light, the down-screen one the shade.
  const faces: Array<{ i: number; midY: number }> = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const midY =
      (rPy(rc, base[i]![0], base[i]![1], h0) + rPy(rc, base[j]![0], base[j]![1], h0)) / 2;
    faces.push({ i, midY });
  }
  faces.sort((a, b) => a.midY - b.midY);
  const tones = [shade(tone, 30), shade(tone, 4), shade(tone, -6), shade(tone, -30)];
  for (let k = 0; k < 4; k++) {
    const f = faces[k]!;
    const j = (f.i + 1) % 4;
    ctx.fillStyle = tones[k]!;
    ctx.beginPath();
    ctx.moveTo(rPx(rc, base[f.i]![0], h0), rPy(rc, base[f.i]![0], base[f.i]![1], h0));
    ctx.lineTo(rPx(rc, base[j]![0], h0), rPy(rc, base[j]![0], base[j]![1], h0));
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fill();
  }
}

// ------------------------------------------------ the twelve reliefs

/**
 * LOWHALL BREACHER — the knocker came with the door, and now it HANGS
 * off it: a raised iron mount plate (the substrate boss lands on it
 * as the pivot), a hanging ring below, and the boot plate's top edge
 * standing a lip proud of the boards.
 */
function relBreacher(rc: ReliefCtx, st: ShieldStyle): void {
  const iron = shade(st.rim, 6);
  // The boot plate's working lip.
  prism(rc, [-1.02, 0.66, 1.02, 0.66, 1.02, 0.76, -1.02, 0.76], 0, 0.3, shade(st.rim, 14));
  // The knocker mount.
  prism(rc, [-0.2, -0.13, 0.2, -0.13, 0.26, 0.03, 0, 0.13, -0.26, 0.03], 0, 0.42, iron);
  // The ring, hanging from the mount: an annulus at height, evenodd.
  const { ctx } = rc;
  reliefShadow(rc, [-0.22, 0.12, 0.22, 0.12, 0.22, 0.5, -0.22, 0.5], 0.5);
  ctx.fillStyle = shade(iron, -14);
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = rPx(rc, Math.cos(a) * 0.21, 0.5);
    const y = rPy(rc, Math.cos(a) * 0.21, 0.31 + Math.sin(a) * 0.19, 0.5);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let k = 10; k >= 0; k--) {
    const a = (k / 10) * Math.PI * 2;
    const x = rPx(rc, Math.cos(a) * 0.12, 0.5);
    const y = rPy(rc, Math.cos(a) * 0.12, 0.31 + Math.sin(a) * 0.11, 0.5);
    if (k === 10) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill('evenodd');
  // One lit pass on the ring's up-screen arc.
  ctx.fillStyle = shade(iron, 22);
  ctx.beginPath();
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    const x = rPx(rc, Math.cos(a) * 0.21, 0.5);
    const y = rPy(rc, Math.cos(a) * 0.21, 0.31 + Math.sin(a) * 0.19, 0.5);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let k = 6; k >= 0; k--) {
    const a = Math.PI + (k / 6) * Math.PI;
    const x = rPx(rc, Math.cos(a) * 0.16, 0.5);
    const y = rPy(rc, Math.cos(a) * 0.16, 0.31 + Math.sin(a) * 0.15, 0.5);
    if (k === 6) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * LEGION DOORWALL — the drill columns FORGED: six pyramid bosses at
 * real height, and the campaign band raised as its own riveted plate
 * lapping the slab.
 */
function relDoorwall(rc: ReliefCtx, st: ShieldStyle): void {
  const red = st.deviceColor ?? '#8e2f2c';
  prism(rc, [-1.04, -0.72, 1.04, -0.72, 1.04, -0.46, -1.04, -0.46], 0, 0.3, red);
  polyAt(rc, [-1.04, -0.72, 1.04, -0.72, 1.04, -0.65, -1.04, -0.65], 0.3, shade(red, 24));
  // The six spikes are THE CREST TIER's — real solids, no clip.
}

/**
 * STAGHEART PALISADE — the stakes get their CAPS: a beveled wedge of
 * end-grain standing off each stake tip, and the lashings tie off in
 * raised knots at the edges. Carpentry, not carving.
 */
function relPalisade(rc: ReliefCtx, st: ShieldStyle): void {
  const pale = shade(st.face, 20);
  // End-grain caps on the three stake tips (outline t≈-1 at u -0.65/0/0.65).
  for (const u of [-0.65, 0, 0.65]) {
    prism(rc, [u - 0.14, -0.98, u + 0.14, -0.98, u + 0.09, -0.78, u - 0.09, -0.78], 0, 0.34, pale);
  }
  // The lashing knots, where the rawhide ties off at the binding.
  const hide = st.strapColor ?? '#4a3524';
  for (const t of [-0.24, 0.42]) {
    prism(rc, [0.88, t - 0.09, 1.04, t - 0.09, 1.04, t + 0.09, 0.88, t + 0.09], 0, 0.4, shade(hide, 12));
    prism(rc, [-1.04, t - 0.09, -0.88, t - 0.09, -0.88, t + 0.09, -1.04, t + 0.09], 0, 0.4, shade(hide, 12));
  }
}

/**
 * FELLHORN GATE — the skull is a MOUNTED THING now: the brow dome
 * stands most of a shell-depth off the boards (walls, cast shadow,
 * the sockets cut into its top plate), the muzzle steps down from it
 * at its own height, and the hinge scrolls rise as true bosses. The
 * horns were already real — the spike plan carries them.
 */
function relFellhorn(rc: ReliefCtx, st: ShieldStyle): void {
  // The skull is THE CREST TIER's now — a mounted solid, no clip.
  // The furniture keeps the ironwork: the hinge scrolls, standing
  // proud where the jambs were.
  const iron = st.rim;
  for (const sx of [-1, 1]) {
    prism(
      rc,
      [sx * 0.28, -0.02, sx * 0.46, -0.02, sx * 0.46, 0.14, sx * 0.28, 0.14],
      0,
      0.45,
      shade(iron, 12),
    );
  }
}

/**
 * BRINEHOLD CARAPACE — the courses LAP at real height: each scallop
 * seam is a lipped edge standing off the plate below it (sampled
 * along its own curve), and the keel rises as a ridge the whole
 * height of the shell. Grown structure, not surface stripes.
 */
function relCarapace(rc: ReliefCtx, st: ShieldStyle): void {
  const alt = st.faceAlt ?? shade(st.face, -16);
  const courses: Array<[number, number, string]> = [
    [-0.5, 0.3, shade(st.face, 2)],
    [0.14, 0.34, shade(alt, 10)],
    [0.72, 0.3, alt],
  ];
  for (const [t0, dip, tone] of courses) {
    // Sample the two quadratics the flat pass draws (control at
    // ±0.55, t0+dip; midpoint t0+dip·0.45) and build a lipped band.
    const pts: number[] = [];
    const N = 5;
    for (let k = 0; k <= N; k++) {
      const s = k / N;
      const u = -1.1 + 2.2 * s;
      const abs = Math.abs(u);
      // A serviceable stand-in for the drawn curve: deepest at center.
      const t = t0 + dip * (0.45 + 0.55 * (1 - abs / 1.1) * (abs / 1.1) * 2);
      pts.push(u, t);
    }
    for (let k = N; k >= 0; k--) {
      pts.push(pts[k * 2]!, pts[k * 2 + 1]! + 0.12);
    }
    prism(rc, pts, 0, 0.26, tone, { shadow: false });
  }
  // The keel ridge.
  prism(rc, [-0.05, -1.05, 0.05, -1.05, 0.035, 0.95, -0.035, 0.95], 0, 0.34, shade(st.face, 14));
  polyAt(rc, [-0.012, -1.02, 0.012, -1.02, 0.01, 0.92, -0.01, 0.92], 0.34, shade(st.face, 30));
}

/**
 * WINTERCOURT RIME — the star grows OUT of the disc: every splinter
 * is a crystal ridge, two facets meeting on a spine that stands
 * tallest at the heart and falls to the tip, the way ice actually
 * grows off a seed. The everfrost bead crowns the seed point.
 */
function relWintercourt(rc: ReliefCtx, st: ShieldStyle): void {
  const { ctx } = rc;
  const frost = '#6db8d8';
  const lit = '#c8ecf8';
  const lens = [0.98, 0.55, 0.84, 0.5, 0.94, 0.52, 0.8, 0.48];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + 0.12;
    const L = lens[i]!;
    const w = 0.085 + 0.035 * (L > 0.8 ? 1 : 0);
    const cu = Math.cos(a);
    const ct = Math.sin(a);
    const hRoot = 0.55 * (L > 0.8 ? 1 : 0.7);
    // Shadow along the shard.
    reliefShadow(rc, [-ct * w, cu * w, cu * L, ct * L, ct * w, -cu * w], hRoot * 0.6);
    // Two facets meeting on the spine.
    const sx = [-ct * w, cu * w];
    const sy = [ct * w, -cu * w];
    const tipX = rPx(rc, cu * L, 0.1);
    const tipY = rPy(rc, cu * L, ct * L, 0.1);
    const spineX = rPx(rc, cu * 0.06, hRoot);
    const spineY = rPy(rc, cu * 0.06, ct * 0.06, hRoot);
    const e1y = rPy(rc, sx[0]!, sx[1]!, 0);
    const e2y = rPy(rc, sy[0]!, sy[1]!, 0);
    const base = i < 2 || i === 7 ? lit : frost;
    const face = (ex: number, ey: number, tone: string): void => {
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.moveTo(rPx(rc, ex, 0), ey);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(spineX, spineY);
      ctx.closePath();
      ctx.fill();
    };
    face(sx[0]!, e1y, e1y < e2y ? shade(base, 24) : shade(base, -18));
    face(sy[0]!, e2y, e2y <= e1y ? shade(base, 24) : shade(base, -18));
  }
}

/**
 * NIGHTVEIL PINION — the rachis is a RIDGE of gold now, standing off
 * the wing its whole length, and each barb root beds under a raised
 * gold ferrule instead of a painted bead.
 */
function relPinion(rc: ReliefCtx, st: ShieldStyle): void {
  const gold = st.deviceColor ?? BRASS;
  prism(rc, [0.17, -1.05, 0.27, -1.05, 0.49, 1.05, 0.37, 1.05], 0, 0.42, gold, {
    wallDark: shade(gold, -38),
  });
  polyAt(rc, [0.18, -1.02, 0.22, -1.02, 0.43, 1.02, 0.38, 1.02], 0.42, shade(gold, 30));
  pyramid(rc, 0.16, -0.44, 0.09, 0.1, 0, 0.55, gold);
  pyramid(rc, 0.24, 0.06, 0.09, 0.1, 0, 0.55, gold);
  pyramid(rc, 0.32, 0.52, 0.09, 0.1, 0, 0.55, gold);
}

/**
 * VALE RELIQUARY — the cross is WORKED silver at height: the stem
 * rises off the enamel, the arm laps OVER the stem a step prouder,
 * the four diamond finials are set stones at each end, and the
 * moonstone (the substrate boss) crowns the crossing above it all.
 */
function relReliquary(rc: ReliefCtx, st: ShieldStyle): void {
  const silver = st.deviceColor ?? '#dce4f0';
  prism(rc, [-0.08, -0.76, 0.08, -0.76, 0.08, 0.74, -0.08, 0.74], 0, 0.34, silver, {
    wallDark: shade(silver, -42),
  });
  polyAt(rc, [-0.08, -0.76, -0.025, -0.76, -0.025, 0.74, -0.08, 0.74], 0.34, shade(silver, 24));
  prism(rc, [-0.51, -0.085, 0.51, -0.085, 0.51, 0.085, -0.51, 0.085], 0.2, 0.5, silver, {
    wallDark: shade(silver, -42),
  });
  polyAt(rc, [-0.51, -0.085, 0.51, -0.085, 0.51, -0.03, -0.51, -0.03], 0.5, shade(silver, 24));
  pyramid(rc, 0, -0.82, 0.13, 0.15, 0, 0.5, silver);
  pyramid(rc, 0, 0.8, 0.13, 0.15, 0, 0.5, silver);
  pyramid(rc, -0.58, 0, 0.13, 0.15, 0, 0.5, silver);
  pyramid(rc, 0.58, 0, 0.13, 0.15, 0, 0.5, silver);
}

/**
 * CINDERMAW BULWARK — FORGED, finally: four charred plates stand a
 * half-depth off a live ember bed, so the glow comes up BETWEEN them
 * through real gaps; the grate mouth is the proudest plate on the
 * door with its slots venting the same fire; the crown crack rides
 * the raised plate it split.
 */
function relCindermaw(rc: ReliefCtx, st: ShieldStyle): void {
  const char = shade(st.face, 8);
  // Plates inset to the furnace outline's own waist — a plate that
  // overhangs its silhouette reads as a sticker, not a forging.
  const plates: number[][] = [
    [-0.96, -0.98, -0.09, -0.98, -0.09, -0.47, -0.82, -0.47],
    [0.09, -0.98, 0.96, -0.98, 0.82, -0.47, 0.09, -0.47],
    [-0.8, -0.29, -0.09, -0.29, -0.09, 0.41, -0.86, 0.41],
    [0.09, -0.29, 0.8, -0.29, 0.86, 0.41, 0.09, 0.41],
    [-0.72, 0.59, 0.72, 0.59, 0.42, 1.0, -0.42, 1.0],
  ];
  for (const p of plates) prism(rc, p, 0, 0.42, char, { wallDark: shade(char, -40) });
  // One lit arris per plate, up-screen edge.
  for (const p of plates) {
    polyAt(rc, [p[0]!, p[1]!, p[2]!, p[3]!, p[2]!, p[3]! + 0.06, p[0]!, p[1]! + 0.06], 0.42, shade(char, 20));
  }
  // The crown crack, split through the raised plate's own top.
  polyAt(
    rc,
    [-0.95, -1.06, -0.88, -1.06, -0.62, -0.78, -0.7, -0.62, -0.76, -0.66, -0.68, -0.8],
    0.42,
    '#ff8a3c',
  );
  // The grate mouth: the proudest plate, slots venting the bed below.
  const mouth = shade(st.face, -6);
  prism(rc, [-0.52, -0.2, 0.52, -0.2, 0.52, 0.32, -0.52, 0.32], 0, 0.7, mouth, {
    wallDark: shade(mouth, -38),
  });
  for (const u of [-0.3, 0, 0.3]) {
    polyAt(rc, [u - 0.07, -0.12, u + 0.07, -0.12, u + 0.07, 0.24, u - 0.07, 0.24], 0.7, '#b8481e');
    polyAt(rc, [u - 0.04, -0.12, u + 0.04, -0.12, u + 0.04, 0.24, u - 0.04, 0.24], 0.7, '#ff8a3c');
    polyAt(rc, [u - 0.07, -0.12, u + 0.07, -0.12, u + 0.07, -0.06, u - 0.07, -0.06], 0.7, SEAM);
  }
  pyramid(rc, -0.42, 0.06, 0.07, 0.08, 0.7, 0.95, shade(st.rim, 16));
  pyramid(rc, 0.42, 0.06, 0.07, 0.08, 0.7, 0.95, shade(st.rim, 16));
}

/**
 * EVERWOOD CREST — the midrib is a living RIDGE: it rises off the
 * blade, carries its light on its own spine, and the vein pairs lift
 * with it a finger's height. The knot (the substrate boss) stands
 * where the working sits.
 */
function relEverwood(rc: ReliefCtx, st: ShieldStyle): void {
  const vein = st.deviceColor ?? '#9db86a';
  const deep = shade(vein, -28);
  prism(rc, [-0.085, -0.9, 0.085, -0.9, 0.07, 1.02, -0.07, 1.02], 0, 0.32, deep, {
    wallDark: shade(deep, -30),
  });
  polyAt(rc, [-0.03, -0.88, 0.03, -0.88, 0.022, 0.99, -0.022, 0.99], 0.32, '#e6f0c2');
  for (const [t, len] of [
    [-0.55, 0.66],
    [0.35, 0.58],
  ] as const) {
    for (const sx of [-1, 1]) {
      prism(
        rc,
        [sx * 0.06, t, sx * len, t + len * 0.55, sx * len, t + len * 0.55 + 0.05, sx * 0.06, t + 0.05],
        0,
        0.14,
        vein,
        { shadow: false },
      );
    }
  }
}

/**
 * GATEFALL BULWARK — the bezel is a FRAME now: four raised bars of
 * void-iron standing off the face, the glass reading sunk between
 * them, and the corner bolts forged as pyramids. The splinters
 * escaping the binding were already real — the spike plan's.
 */
function relRiftward(rc: ReliefCtx, st: ShieldStyle): void {
  const frame = shade(st.rim, 18);
  const bars: number[][] = [
    [-0.54, -0.86, 0.54, -0.86, 0.54, -0.72, -0.54, -0.72],
    [-0.54, 0.5, 0.54, 0.5, 0.54, 0.64, -0.54, 0.64],
    [-0.54, -0.86, -0.4, -0.86, -0.4, 0.64, -0.54, 0.64],
    [0.4, -0.86, 0.54, -0.86, 0.54, 0.64, 0.4, 0.64],
  ];
  for (const b of bars) prism(rc, b, 0, 0.4, frame, { wallDark: shade(frame, -30) });
  pyramid(rc, -0.47, -0.79, 0.075, 0.085, 0.4, 0.72, shade(st.rim, 40));
  pyramid(rc, 0.47, -0.79, 0.075, 0.085, 0.4, 0.72, shade(st.rim, 40));
  pyramid(rc, -0.47, 0.57, 0.075, 0.085, 0.4, 0.72, shade(st.rim, 40));
  pyramid(rc, 0.47, 0.57, 0.075, 0.085, 0.4, 0.72, shade(st.rim, 40));
  // The standing shard is THE CREST TIER's — it leans, and it is tall.
}

/**
 * ALDAREN'S GATE — the chief physically LAPS the field: a raised
 * plate of gold whose bottom wall shows over the moonpale, each
 * cascade lifted on its own lip, the crown points already standing
 * as solid gold (the spike plan), the ring (the substrate boss)
 * mounted at the boards' center.
 */
function relFalls(rc: ReliefCtx, st: ShieldStyle): void {
  const gold = st.deviceColor ?? '#e6c36a';
  prism(rc, [-1.06, -1.02, 1.06, -1.02, 1.06, -0.58, -1.06, -0.58], 0, 0.36, gold, {
    wallDark: shade(gold, -36),
  });
  polyAt(rc, [-1.06, -1.02, 1.06, -1.02, 1.06, -0.93, -1.06, -0.93], 0.36, shade(gold, 26));
  // The chief's finial studs ride THE CREST TIER, off the raised plate.
  const water = '#eef4fc';
  for (const [u, w] of [
    [-0.55, 0.17],
    [0, 0.24],
    [0.55, 0.17],
  ] as const) {
    prism(rc, [u - w / 2, -0.56, u + w / 2, -0.56, u + w / 2, 1.02, u - w / 2, 1.02], 0, 0.16, water, {
      shadow: false,
      wallDark: shade(water, -30),
    });
    polyAt(
      rc,
      rc.litU > 0
        ? [u + w / 2 - 0.05, -0.56, u + w / 2, -0.56, u + w / 2, 1.02, u + w / 2 - 0.05, 1.02]
        : [u - w / 2, -0.56, u - w / 2 + 0.05, -0.56, u - w / 2 + 0.05, 1.02, u - w / 2, 1.02],
      0.16,
      '#ffffff',
    );
  }
}

// -------------------------------------------------- the crest solids

/**
 * LEGION DOORWALL — the six spikes, at LENGTH: pyramidal spires two
 * and a half shell-depths long, rising off the slab where the flat
 * pass keeps their seats. Face-on they foreshorten to bosses aimed at
 * the eye; a quarter turn and they protrude with their whole reach;
 * edge-on they are the profile of a spiked door, which is the entire
 * argument for carrying one.
 */
function crestDoorwall(rc: ReliefCtx, st: ShieldStyle): void {
  const iron = shade(st.face, 30);
  for (const t of [-0.14, 0.32, 0.78]) {
    for (const u of [-0.5, 0.5]) pyramid(rc, u, t, 0.16, 0.2, 0, 2.4, iron);
  }
}

/**
 * FELLHORN GATE — the skull, MOUNTED: half again the old size and a
 * full shell-depth proud. Brow dome with its walls and cast shadow,
 * the shelf and sockets cut into its top plate, the muzzle stepping
 * down and forward at its own height. It reads as bone bolted to
 * boards from every angle the boards themselves read at all.
 */
function crestFellhorn(rc: ReliefCtx, st: ShieldStyle): void {
  const bone = st.deviceColor ?? '#ddd4bc';
  const boneDk = shade(bone, -24);
  prism(
    rc,
    [-0.44, -1.0, 0.44, -1.0, 0.5, -0.42, 0.22, -0.02, -0.22, -0.02, -0.5, -0.42],
    0,
    1.15,
    bone,
    { wallDark: shade(bone, -42), wallLit: boneDk },
  );
  polyAt(rc, [-0.47, -0.46, 0.47, -0.46, 0.22, -0.02, -0.22, -0.02], 1.15, boneDk);
  polyAt(rc, [-0.34, -0.54, -0.08, -0.54, -0.19, -0.24], 1.15, SEAM);
  polyAt(rc, [0.08, -0.54, 0.34, -0.54, 0.19, -0.24], 1.15, SEAM);
  // The muzzle: forward of the brow, lower than it, its own solid.
  prism(rc, [-0.18, -0.1, 0.18, -0.1, 0.11, 0.3, -0.11, 0.3], 0, 0.72, bone, {
    wallDark: shade(bone, -36),
  });
  polyAt(rc, [-0.035, -0.02, 0.035, -0.02, 0.026, 0.2, -0.026, 0.2], 0.72, boneDk);
}

/**
 * GATEFALL BULWARK — the shard that would not sit flush, at its true
 * size: a leaning crystal spire out of the pane, two facets to an
 * offset apex, catching more light than the glass it broke from.
 */
function crestRiftward(rc: ReliefCtx): void {
  const { ctx } = rc;
  const ax = rPx(rc, 0.16, 1.35);
  const ay = rPy(rc, 0.16, -0.34, 1.35);
  const e1x = rPx(rc, -0.14, 0);
  const e1y = rPy(rc, -0.14, 0.12, 0);
  const e2x = rPx(rc, 0.2, 0);
  const e2y = rPy(rc, 0.2, 0.02, 0);
  const mBase = rPy(rc, 0.03, 0.07, 0);
  reliefShadow(rc, [-0.14, 0.12, 0.2, 0.02, 0.24, 0.18, -0.1, 0.26], 0.7);
  ctx.fillStyle = e1y < e2y ? '#e2d6ff' : '#a985ff';
  ctx.beginPath();
  ctx.moveTo(e1x, e1y);
  ctx.lineTo(ax, ay);
  ctx.lineTo(rPx(rc, 0.03, 0), mBase);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = e2y <= e1y ? '#e2d6ff' : '#8a6ade';
  ctx.beginPath();
  ctx.moveTo(e2x, e2y);
  ctx.lineTo(ax, ay);
  ctx.lineTo(rPx(rc, 0.03, 0), mBase);
  ctx.closePath();
  ctx.fill();
}

/**
 * ALDAREN'S GATE — the chief's twin finial studs, standing off the
 * raised gold plate itself: small spires, royal height.
 */
function crestFalls(rc: ReliefCtx, st: ShieldStyle): void {
  const gold = st.deviceColor ?? '#e6c36a';
  pyramid(rc, -0.88, -0.8, 0.085, 0.1, 0.36, 1.0, shade(gold, 30));
  pyramid(rc, 0.88, -0.8, 0.085, 0.1, 0.36, 1.0, shade(gold, 30));
}

const CRESTS: Record<string, ReliefPainter> = {
  doorwall: crestDoorwall,
  fellhorn: crestFellhorn,
  riftward: crestRiftward,
  falls: crestFalls,
};

const RELIEFS: Record<string, ReliefPainter> = {
  breacher: relBreacher,
  doorwall: relDoorwall,
  palisade: relPalisade,
  fellhorn: relFellhorn,
  carapace: relCarapace,
  wintercourt: relWintercourt,
  pinion: relPinion,
  reliquary: relReliquary,
  cindermaw: relCindermaw,
  everwood: relEverwood,
  riftward: relRiftward,
  falls: relFalls,
};

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

import { itemDef } from '@arx/content';
import { chamferRect } from './shapes.js';
import { shade } from './rig.js';

/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */

export type ArmorClassStyle = 'cloth' | 'leather' | 'plate';

export interface BodyStyle {
  color: string;
  trim: string;
  /** Rivets, buckles, plate edges. Default shade(color, -20). */
  metal?: string;
  cls: ArmorClassStyle;
  silhouette: 'tunic' | 'robe' | 'jerkin' | 'cuirass' | 'brigandine';
  pauldron:
    | 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur'
    | 'feathered' | 'orbs' | 'shards';
  pauldronColor?: string;
  /** Bright edge accent on the pauldron rim / blade edge. */
  pauldronTrim?: string;
  /** Spike count for 'spiked' pauldrons, 1..3. Default 1. */
  pauldronSpikes?: number;
  chest: 'none' | 'straps' | 'plate' | 'emblem' | 'stitch' | 'scales' | 'diamondhide';
  /** Hanging leather fringe strips off the chest yoke — the buckskin read. */
  fringe?: boolean;
  /** Big mismatched cloth patches with stitch ticks — the homespun read. */
  patches?: string;
  emblem?:
    | 'chevron' | 'diamond' | 'bolt' | 'skull' | 'sun' | 'leaf' | 'star'
    | 'moon' | 'eye' | 'moth' | 'coin' | 'bullhead';
  /** Glowing rune dashes riding the hem trim — the enchanted-cloth read. */
  runes?: string;
  /** A waist sash: band, hip knot, two swinging tails. */
  sash?: string;
  /** Hip plates hanging from the fauld — the heavy-knight lower read. */
  tassets?: boolean;
  /** Vertical fluting on the breastplate — the Gothic-plate read. */
  ridges?: boolean;
  /** Robe/coat skirt length below the belt line, tiles. 0 = none. */
  skirt: number;
  skirtSlit?: boolean;
  /** drawArm sleeve override. Default shade(color, -12) — today's law. */
  sleeve?: string;
  /** Neck treatment: plate gorget ring or a fur ruff. */
  collar?: 'gorget' | 'fur';
  /** A belt pouch on the hip — the adventurer's secondary read. */
  pouch?: boolean;
  /** A diagonal shoulder-to-hip cord with bone toggles — the trapper. */
  bandolier?: string;
  /** A brush tail swinging off the trailing hip — the fox trophy read. */
  tail?: { color: string; tip: string };
  /** Hem/trim accent that breathes with a slow ember pulse. */
  glowTrim?: string;
  /** Full sleeves: the forearm wears cloth with a belled cuff (robes). */
  sleeves?: 'full';
  /** Shoulder mantle (cope) color — the layered wizard majesty read. */
  mantle?: string;
  /** A second hem layer beneath the skirt — flowing depth. */
  underskirt?: string;
  /** Drifting magic motes in this color — the quiet aura. */
  motes?: string;
  /**
   * Gravity folds: hanging-cloth creases down the torso and skirt with
   * a catch-light beside the deepest one — what turns a flat fill into
   * FABRIC. Every robe should want this.
   */
  folds?: boolean;
  /**
   * A short shoulder cape with a SHAPED hem ringing the upper chest —
   * the garment-over-garment layer for sets whose mantle story isn't
   * the wizard cope. scallop = foam/feather covers, point = leaf tips,
   * dag = storm flags. Colors default shade(color, -10) / trim.
   */
  capelet?: { color?: string; trim?: string; hem: 'scallop' | 'point' | 'dag' };
  /**
   * Two cloth bands hanging from the shoulders past the belt, tick-
   * marked — the ordained read. From behind they cross the shoulders
   * as short tabs. Colors default shade(color, -16) / trim.
   */
  stole?: { color?: string; trim?: string };
  /**
   * The knight's cloth front panel over the cuirass, pointed hem past
   * the fauld; the waist crosses it (a surcoat is CINCHED). The chest
   * emblem rides the tabard. Back gets a shorter plain panel.
   */
  tabard?: { color: string; trim?: string };
  /** Gambeson quilting: two-value diagonal stitch channels. */
  quilt?: boolean;
  /** Front X-lacing cord up the chest opening — how a jerkin closes.
   *  `true` derives shade(trim, -10). */
  lace?: boolean | string;
  /**
   * A contrasting shoulder-yoke panel, front AND back (a yoke wraps),
   * optionally stitch-ticked at its hem — the hunter's tailored cut.
   * Color defaults shade(color, -14).
   */
  yoke?: { color?: string; stitch?: boolean };
  /**
   * A real belt where the anonymous waist band was: two-tone strap,
   * buckle plate, hanging strap end. Colors default shade(trim, -8) /
   * metal. Skipped when a sash owns the waist.
   */
  belt?: { color?: string; buckle?: string } | true;
  /** Chest device size multiplier — sets whose identity IS the device
   *  wear it bolder. Default 1. */
  emblemScale?: number;
  /** Breastplate anatomy: center forge crease with a light/dark split
   *  down the chest plate — two halves hammered and joined. */
  midline?: boolean;
  /** Rivet rows along the chest plate's seam lines — the boilerwork
   *  read. Rides the 'plate' chest. */
  rivetSeams?: boolean;
  /**
   * Hanging charms off the waist line — small bells on cords that
   * sway with the stride. The moonbell read: jewelry that lives on
   * the garment, not a device stamped on it.
   */
  charms?: { color: string };
  /**
   * Silk binding cords crossing the torso both ways, front AND back
   * (a wrap that vanished on turn would break the garment), knotted
   * where they meet — the broodsilk read.
   */
  cords?: { color: string };
  /**
   * Bone inlay: three lapped ivory arcs across the chest plate — the
   * barrow-king's ribs, worn on the outside. Front only; the back
   * keeps its spine ridge.
   */
  ribs?: { color: string };
}

export interface HelmStyle {
  color: string;
  trim: string;
  /** THE FORGE LAW: every metal kind is a FULL-FACE helm with its own
   *  forged silhouette — a knight's helm owns the whole head. The old
   *  open `dome`/`horned` caps are gone; caps read as placeholders.
   *  `bascinet` is the pig-faced full helm (protruding snout box);
   *  `barbute` wears a bold T-cut; `armet` a slatted wedge visor with
   *  pivot roundels; `sallet` a swept tail + icicle bevor; `radiant` a
   *  sculpted sun-mask; `ramfort` the riveted siege bucket; `warmask`
   *  the raider's bronze face plate; `dread` the tooth-visored maw;
   *  `briar` the woven thorn-cage visor; `drake` the lapped-scale
   *  visage with a copper snout. */
  kind:
    | 'greathelm' | 'bascinet' | 'barbute' | 'armet' | 'sallet'
    | 'radiant' | 'ramfort' | 'warmask' | 'dread' | 'briar' | 'drake'
    | 'aurochs' | 'barrow'
    | 'hood' | 'circlet' | 'wizard';
  visor?: 'slit' | 'cross';
  plume?: { color: string };
  /** `curl` bends the sweep into a ram's spiral beside the temples;
   *  `tine` forks a second point off each horn — the bramble read. */
  horns?: { color: string; size: number; curl?: boolean; tine?: boolean };
  /** Up-curved boar tusks flanking the jaw — the charge read. */
  tusks?: { color: string };
  /** A row of forged spikes riding the crown centerline, front-to-back
   *  — the mohawk of war. Reads as rising points frontal, a full
   *  spiked ridge at profile. */
  spikesCrown?: { color: string };
  /** Swept-back side fins — blade silhouettes off the temples. */
  fins?: { color: string };
  /** Upswept feathered wing blades — the valkyrie read. */
  wings?: { color: string };
  /** A solid metal ridge crest riding the crown centerline. */
  crest?: { color: string };
  /** The forge-accent metal: warmask cheek plates, dread bevor teeth,
   *  briar cage bars, ramfort keel plate, drake snout. Each kind
   *  interprets it as ITS structural second metal — never a tint. */
  jaw?: string;
  /** Wizard hats: a band buckle / star charm on the crown. */
  charm?: string;
  /** Hoods: a lumpy fur ruff ringing the face opening. */
  ruff?: { color: string };
  /** Hoods: pricked ear points on the crown. `tall` is the hare read
   *  (long upright blades); `tip` paints the top third — black-tipped
   *  hare and fox ears both. */
  ears?: { color: string; tall?: boolean; tip?: string };
  /** Hoods: a swept feather tucked at the temple, trailing back. */
  feather?: { color: string };
  /** Hoods: a half-mask across the lower face — the rogue read.
   *  Warmask: the sculpted face-plate metal behind the bronze work. */
  mask?: string;
  /** Hoods: two bold curled moth feelers off the crown, clubbed tips. */
  antennae?: { color: string };
  /** Hoods: branched ivory antlers — the forest-king crown. */
  antlers?: { color: string };
  /** Hoods/domes: a cut gem set at the brow band. */
  gem?: { color: string };
  /** A floating ring above the crown that never quite touches down. */
  halo?: { color: string };
  /** Hoods: bell-flowers tucked at the temple, open and hanging —
   *  the moonbell picked and worn. */
  blooms?: { color: string };
  /** Hoods: two dry fangs at the mouth of the face opening — the
   *  adder's own, pointed down. */
  fangs?: { color: string };
  /** Three slivers of night glass floating above the crown, each on
   *  its own slow bob — the rift's answer to a halo. */
  shards?: { color: string };
}

export interface LegStyle {
  kind: 'pants' | 'greaves' | 'wraps';
  /** Default: today's pants-color law (look pants / darkened body). */
  thigh?: string;
  shin?: string;
  knee?: 'none' | 'plate' | 'wrap';
  kneeColor?: string;
}

export interface BootStyle {
  color: string;
  /** Shaft height up the shin, tiles. 0.06 ≈ the bare foot chip. */
  height: number;
  cuff?: { color: string };
  /** Metal toe cap color (sabatons). */
  toe?: string;
  /** A short spike off the shaft top — dread sabatons. */
  spike?: boolean;
  /** Crossed straps climbing the shaft — the scout's lacing. */
  wrap?: { color: string };
  /** A lumpy fur top instead of a clean cuff — winter boots. */
  fur?: { color: string };
  /** A curled slipper toe — the wizard's footnote. */
  curl?: boolean;
}

/**
 * Gloves dress BOTH solved arms as one armor unit: the hand (in one of
 * four silhouette molds), the FULL forearm from elbow to wrist (skin
 * never shows on a gloved arm), and a cuff at the elbow seam where the
 * glove flows into the sleeve. Devices (spikes, talons, studs, gems)
 * ride the hand. Robed sleeves win the forearm: under a belled cuff a
 * glove keeps only its hand and knuckle device — the sleeve is a tube
 * the hand lives in.
 */
export interface GloveStyle {
  /** The hand itself. */
  color: string;
  /** Hand silhouette: gauntlet = squared plated fist with a hard end
   * cap, glove = fitted taper with a finger seam, wrap = taper crossed
   * by binding strips, paw = round beast mitt with toe splits. */
  hand?: 'glove' | 'gauntlet' | 'wrap' | 'paw';
  /** Forearm color, elbow to wrist. Absent = shade(color, −8). */
  bracer?: string;
  /** The elbow-seam treatment where glove meets sleeve. */
  cuff?: {
    color: string;
    /** band = buckled strap, flare = forged vambrace mouth, fur = pelt
     * roll, roll = folded-over top. */
    kind: 'band' | 'flare' | 'fur' | 'roll';
  };
  /** Device on the back of the hand / past the knuckles. */
  knuckle?: {
    color: string;
    /** studs = riveted domes, spikes = forged punch spikes on a
     * knuckle bar, claws = curved talons, plate = beveled hand plate,
     * gem = a bezel-set jewel. */
    kind: 'studs' | 'spikes' | 'claws' | 'plate' | 'gem';
  };
  /** Fingertips stay bare — the thief's fingerless cut. */
  fingerless?: boolean;
}

export interface OffhandStyle {
  /** 'weapon' = a dual-wielded blade: the rig paints the actual weapon. */
  kind: 'buckler' | 'kite' | 'tower' | 'tome' | 'quiver' | 'orb' | 'weapon';
  color: string;
  trim: string;
  boss?: string;
  spikes?: boolean;
  emblem?: 'chevron' | 'diamond';
}

// ------------------------------------------------------------- rosters

export const BODY_STYLES: Record<string, BodyStyle> = {
  apprentice_robe: {
    color: '#5a6ea0', trim: '#c9c4cf', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.34,
    sleeves: 'full', mantle: '#48587e', underskirt: '#3e4a6e',
    folds: true,
  },
  emberweave_robe: {
    color: '#c4553d', trim: '#e8a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.34, skirtSlit: true, glowTrim: '#ffb054',
    sleeves: 'full', mantle: '#8a3428', underskirt: '#7e2f24',
    motes: '#ffc26a', folds: true,
    stole: { color: '#8a3428', trim: '#e8a23c' }, emblemScale: 1.15,
  },
  leather_body: {
    color: '#b08a5c', trim: '#6b4a26', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true, yoke: { color: '#8a6a45', stitch: true }, lace: true,
    belt: true,
  },
  huntsman_jerkin: {
    color: '#3f6b3a', trim: '#2e4a28', metal: '#6b4a26', cls: 'leather',
    silhouette: 'brigandine', pauldron: 'layered', pauldronColor: '#5a3f1e',
    chest: 'straps', skirt: 0.12, collar: 'fur', pouch: true,
    lace: '#2e4a28', belt: { color: '#6b4a26', buckle: '#d8cfae' },
  },
  iron_platebody: {
    color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', chest: 'plate', skirt: 0,
    collar: 'gorget', midline: true, rivetSeams: true,
  },
  steel_platebody: {
    color: '#b8bec8', trim: '#c9a23c', metal: '#d4dae2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', chest: 'plate',
    emblem: 'diamond', skirt: 0, collar: 'gorget',
    midline: true, rivetSeams: true,
  },
  // The themed plate sets: one silhouette vocabulary, five color
  // stories. A new colorway is a spread + palette — never a painter.
  warden_platebody: {
    color: '#4a7a5a', trim: '#2e4a38', metal: '#87b294', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#5a8a6a',
    pauldronTrim: '#d69a55', chest: 'plate', emblem: 'leaf', skirt: 0,
    collar: 'gorget',
  },
  frostplate_platebody: {
    color: '#9db6cc', trim: '#4a6a9c', metal: '#cfe0ee', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronTrim: '#e8f4ff',
    chest: 'plate', emblem: 'diamond', skirt: 0, collar: 'gorget',
  },
  bulwark_platebody: {
    color: '#5a6270', trim: '#b08a3c', metal: '#787f8e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#6a7280',
    chest: 'plate', skirt: 0, collar: 'gorget', tassets: true,
    tabard: { color: '#6e5a28', trim: '#b08a3c' }, emblem: 'diamond',
    emblemScale: 1.1,
  },
  dreadforge_platebody: {
    color: '#4a4553', trim: '#a83232', metal: '#625c6e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'spiked', pauldronColor: '#3a3542',
    pauldronSpikes: 3, chest: 'plate', emblem: 'skull', skirt: 0,
    collar: 'gorget', tassets: true,
  },
  sunforged_platebody: {
    color: '#d4a43c', trim: '#f4e0a0', metal: '#e8c05c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#e0b04a',
    pauldronTrim: '#fff2c8', chest: 'plate', emblem: 'sun', skirt: 0,
    collar: 'gorget', tassets: true,
  },
  // The themed leather sets: fur, feathers, scales and antlers — the
  // skirmisher's wardrobe. Same colorway law as the plate sets.
  wayfarer_jerkin: {
    color: '#a8895a', trim: '#6b4a2e', metal: '#8a6a45', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#8a6a45',
    chest: 'straps', fringe: true, skirt: 0, pouch: true,
    yoke: { color: '#8a6a45', stitch: true }, belt: true,
  },
  wolfstalker_jerkin: {
    color: '#5f6470', trim: '#424652', metal: '#9aa0ae', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#9aa0ae',
    chest: 'straps', skirt: 0, collar: 'fur', pouch: true,
  },
  nightveil_jerkin: {
    color: '#3a3648', trim: '#7e6ba8', metal: '#8c4a5a', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true, yoke: { color: '#2e2a3c' }, sash: '#584a78',
  },
  drakescale_body: {
    color: '#8c3a32', trim: '#c9713c', metal: '#d49a4a', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#a04a38',
    pauldronTrim: '#d49a4a', chest: 'scales', skirt: 0,
  },
  stagheart_jerkin: {
    color: '#6b5138', trim: '#d4a43c', metal: '#3e5a30', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'feathered', pauldronColor: '#d8cfae',
    chest: 'straps', fringe: true, skirt: 0.14, pouch: true,
  },
  // The themed cloth sets: sashes, hem runes, orbs and halos — the
  // caster's wardrobe. Same colorway law as plate and leather.
  hedgemage_robe: {
    color: '#5a6b3a', trim: '#c9a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.32,
    sash: '#c9a23c', sleeves: 'full', underskirt: '#42502c', pouch: true,
    folds: true, capelet: { color: '#42502c', hem: 'point', trim: '#c9a23c' },
  },
  tidecaller_robe: {
    color: '#2f6a78', trim: '#bfe8e0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'moon',
    skirt: 0.34, runes: '#bfe8e0', sleeves: 'full',
    underskirt: '#1f4a55', motes: '#bfe8e0', folds: true,
    capelet: { color: '#245663', hem: 'scallop', trim: '#bfe8e0' },
    emblemScale: 1.25,
  },
  voidwhisper_robe: {
    color: '#453a5c', trim: '#b8a8d8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'eye',
    skirt: 0.34, skirtSlit: true, sash: '#2e2740', sleeves: 'full',
    underskirt: '#332b47', motes: '#9a86c8', folds: true,
    stole: { color: '#2e2740', trim: '#b8a8d8' }, emblemScale: 1.25,
  },
  cindersworn_robe: {
    color: '#4a3a38', trim: '#e05438', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.34,
    sash: '#8a2f24', glowTrim: '#ff9a4a', runes: '#ff9a4a',
    sleeves: 'full', mantle: '#3a2d2b', underskirt: '#332826',
    motes: '#ffb054', folds: true,
  },
  starweaver_robe: {
    color: '#2c3260', trim: '#c8cee8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'orbs', pauldronColor: '#9db6ff',
    chest: 'emblem', emblem: 'star', skirt: 0.36, runes: '#c8cee8',
    sleeves: 'full', mantle: '#232850', underskirt: '#1e2244',
    motes: '#aebeff', folds: true,
  },
  // The early-game cloth sets: five color stories for the leveling
  // road. Each ships in four dye lots via registerColorways below.
  thistledown_robe: {
    color: '#c9bfa3', trim: '#8a7a5c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.3,
    patches: '#8a9a6a', sash: '#8a7a5c', underskirt: '#b0a688',
    folds: true,
  },
  mothwing_robe: {
    color: '#8a8a72', trim: '#d8d4b8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'moth',
    skirt: 0.32, sleeves: 'full', underskirt: '#6e6e5a', motes: '#d8d4b8',
    folds: true, capelet: { hem: 'scallop' }, emblemScale: 1.15,
  },
  dawnsworn_robe: {
    color: '#d9c9a0', trim: '#c9922f', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'sun',
    skirt: 0.32, sash: '#b0703c', sleeves: 'full', underskirt: '#b8a87e',
    folds: true, stole: { color: '#c9922f', trim: '#d9c9a0' },
    emblemScale: 1.1,
  },
  fenwalker_robe: {
    color: '#4a6b5c', trim: '#a8c8a0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'leaf',
    skirt: 0.34, runes: '#9ae8c8', sleeves: 'full', underskirt: '#3a564a',
    motes: '#9ae8c8', folds: true,
    capelet: { hem: 'point' }, emblemScale: 1.2,
  },
  stormwoven_robe: {
    color: '#4e5a78', trim: '#e8d878', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.34, runes: '#a8c4e8', sleeves: 'full', mantle: '#3e4860',
    underskirt: '#3c4660', folds: true, emblemScale: 1.15,
  },
  // The early-game leather sets: the skirmisher's leveling road. Each
  // ships in four dye lots via registerColorways below.
  hareswift_jerkin: {
    color: '#c2a878', trim: '#8a6f48', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    collar: 'fur', pouch: true, quilt: true, belt: true,
  },
  kingfisher_jerkin: {
    color: '#2f7a8a', trim: '#d87f3c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'feathered', pauldronColor: '#57a8b8',
    chest: 'emblem', emblem: 'chevron', skirt: 0, pouch: true,
    belt: { color: '#1f5866', buckle: '#d87f3c' },
  },
  cutpurse_jerkin: {
    color: '#4e4438', trim: '#c9a23c', metal: '#8a7a5c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'emblem', emblem: 'coin',
    skirt: 0, pouch: true, yoke: { color: '#3e362c' }, lace: '#2e2820',
    belt: { color: '#2e2820', buckle: '#c9a23c' }, emblemScale: 1.15,
  },
  trapline_jerkin: {
    color: '#8a7248', trim: '#5a4a34', metal: '#d8cfae', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#6e5a3c',
    chest: 'none', bandolier: '#5a4a34', skirt: 0, pouch: true,
    quilt: true, belt: { color: '#5a4a34', buckle: '#d8cfae' },
  },
  emberfox_jerkin: {
    color: '#b05a30', trim: '#e8dcc4', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#c9713c',
    chest: 'none', collar: 'fur', tail: { color: '#b05a30', tip: '#e8dcc4' },
    skirt: 0, pouch: true,
  },
  // The early-game plate sets: the knight's leveling road. Each ships
  // in four lots via registerColorways below — craft lots are the same
  // silhouette RE-FORGED from another bar, and some lots change the
  // structure itself (extra spikes, wings for fins), never just hue.
  tuskguard_platebody: {
    color: '#a4744b', trim: '#6e4a30', metal: '#c9955c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#b5854f',
    pauldronTrim: '#d9a86a', chest: 'plate', skirt: 0, collar: 'gorget',
    rivetSeams: true,
  },
  valiant_platebody: {
    color: '#c9ccd4', trim: '#c9a23c', metal: '#e2e6ec', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#d4d8e0',
    pauldronTrim: '#e8c04c', chest: 'plate', emblem: 'chevron', skirt: 0,
    collar: 'gorget', tabard: { color: '#a83240', trim: '#e8c04c' },
    emblemScale: 1.1,
  },
  ramwall_platebody: {
    color: '#6a7080', trim: '#4a4f5c', metal: '#8a92a4', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#7a8294',
    pauldronTrim: '#9aa4b8', chest: 'plate', ridges: true, skirt: 0,
    collar: 'gorget', tassets: true, rivetSeams: true,
  },
  briarplate_platebody: {
    color: '#3e4a38', trim: '#8a9a6e', metal: '#6a7a58', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'spiked', pauldronColor: '#33402e',
    pauldronSpikes: 2, pauldronTrim: '#8a9a6e', chest: 'plate', skirt: 0,
    tassets: true, midline: true,
  },
  sentinel_platebody: {
    color: '#55607a', trim: '#d4c28a', metal: '#707c9a', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#606c88',
    pauldronTrim: '#d4c28a', chest: 'plate', ridges: true, skirt: 0,
    collar: 'gorget', tassets: true,
  },
  // The named wardrobe: six chase sets with owners. Every record here
  // is a full outfit story — the vocabulary earns its keep.
  moonbell_robe: {
    color: '#545a86', trim: '#cdd6f0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'none', skirt: 0.34,
    sleeves: 'full', folds: true, underskirt: '#434871',
    capelet: { color: '#464b74', hem: 'scallop', trim: '#cdd6f0' },
    sash: '#3a3f63', charms: { color: '#cdd6f0' }, motes: '#bfd0ff',
  },
  riftweave_robe: {
    color: '#2b2438', trim: '#f2ecff', cls: 'cloth',
    silhouette: 'robe', pauldron: 'shards', pauldronColor: '#3a3050',
    pauldronTrim: '#f2ecff', chest: 'none', skirt: 0.36, skirtSlit: true,
    sleeves: 'full', folds: true, underskirt: '#221c2e',
    mantle: '#241e30', runes: '#8a6ad8', glowTrim: '#f2ecff',
    motes: '#cdc4ec',
  },
  adderfang_jerkin: {
    color: '#74683c', trim: '#4c5a30', metal: '#d8a03c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#655a34',
    pauldronTrim: '#d8a03c', chest: 'diamondhide',
    bandolier: '#584d2c', belt: { color: '#4c4126', buckle: '#d8a03c' },
    skirt: 0, pouch: true,
  },
  broodsilk_jerkin: {
    color: '#2c2a34', trim: '#e8e6f0', metal: '#9a96a8', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'round', pauldronColor: '#38353f',
    pauldronTrim: '#e8e6f0', chest: 'none', cords: { color: '#e8e6f0' },
    collar: 'fur', belt: { color: '#232028', buckle: '#9a96a8' },
    skirt: 0, pouch: true,
  },
  aurochs_platebody: {
    color: '#4a3f36', trim: '#b8925c', metal: '#6e5c4c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#564a3e',
    pauldronTrim: '#b8925c', chest: 'plate', emblem: 'bullhead',
    emblemScale: 1.15, midline: true, rivetSeams: true, tassets: true,
    skirt: 0, collar: 'gorget',
  },
  barrowking_platebody: {
    color: '#3a4038', trim: '#c9b25c', metal: '#565e52', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#434a40',
    pauldronTrim: '#c9b25c', chest: 'plate', ribs: { color: '#ded6b8' },
    rivetSeams: true, tassets: true, skirt: 0, collar: 'gorget',
  },
};

export const HELM_STYLES: Record<string, HelmStyle> = {
  flower_crown: { color: '#e8c04c', trim: '#79a355', kind: 'circlet' },
  // The soldier's barbute: one hammered iron shell, a bold dark T cut
  // clean through it — honest metal, forged with intent.
  iron_helm: { color: '#8d9299', trim: '#6a6f7d', kind: 'barbute' },
  leather_hood: { color: '#8a6a45', trim: '#6b4a26', kind: 'hood' },
  wolfhide_hood: { color: '#6a6f7d', trim: '#9aa0ae', kind: 'hood' },
  runecloth_cowl: { color: '#7a5ac4', trim: '#c9a8e8', kind: 'hood' },
  wizards_hat: { color: '#4a5a9c', trim: '#c9a23c', kind: 'wizard', charm: '#e8d06a' },
  steel_greathelm: {
    color: '#b8bec8', trim: '#8d9299', kind: 'greathelm',
    visor: 'slit', plume: { color: '#8a2f3c' },
  },
  // The sea-wolf's war mask: a Vendel face plate with sculpted bronze
  // brow, nose bar and mustache flare under ivory horns.
  horned_raider_helm: {
    color: '#7d6a52', trim: '#e0d4ac', kind: 'warmask',
    mask: '#c9b06a', jaw: '#4a3a2c', horns: { color: '#e6e0d0', size: 1 },
  },
  // The grove-keeper's armet: slatted wedge visor, pivot roundels, a
  // bronze leaf-blade crest riding green enamel steel.
  warden_helm: {
    color: '#4a7a5a', trim: '#6f9a7f', kind: 'armet',
    jaw: '#b0703c', crest: { color: '#b0703c' },
  },
  // The glacier sallet: swept pointed tail, one cold eye slit, an
  // icicle-toothed bevor under crystal temple fins.
  frostplate_helm: {
    color: '#9db6cc', trim: '#cfe0ee', kind: 'sallet',
    jaw: '#b6cede', fins: { color: '#cfe0ee' },
  },
  bulwark_greathelm: {
    color: '#5a6270', trim: '#b08a3c', kind: 'greathelm', visor: 'cross',
  },
  // The black maw: an overhanging brow shelf shading an ember-lit
  // slit, a saw-tooth bevor biting down over darkness.
  dreadforge_helm: {
    color: '#4a4553', trim: '#a83232', kind: 'dread',
    horns: { color: '#35313e', size: 1.45 }, jaw: '#625c6e',
  },
  // The radiant mask: a serene sculpted gold face under a brow
  // sun-disc and its corona — the sun god read.
  sunforged_helm: {
    color: '#d4a43c', trim: '#e8c05c', kind: 'radiant',
    wings: { color: '#e8e2d0' },
  },
  wayfarer_hood: {
    color: '#a8895a', trim: '#6b4a2e', kind: 'hood',
    feather: { color: '#c94f38' },
  },
  wolfstalker_hood: {
    color: '#5f6470', trim: '#424652', kind: 'hood',
    ruff: { color: '#9aa0ae' }, ears: { color: '#4f5460' },
  },
  nightveil_cowl: {
    color: '#3a3648', trim: '#6a5a8c', kind: 'hood', mask: '#4a4260',
  },
  // The drake visage: lapped scale rows, a copper snout mask with an
  // up-curved tooth ridge, amber-glint eyes, a dorsal fin crest.
  drakescale_coif: {
    color: '#8c3a32', trim: '#e8b060', kind: 'drake', jaw: '#c9713c',
  },
  stagheart_hood: {
    color: '#6b5138', trim: '#3e5a30', kind: 'hood',
    antlers: { color: '#e6e0d0' }, ruff: { color: '#8a7a52' },
  },
  hedgemage_hat: {
    color: '#5a6b3a', trim: '#c9a23c', kind: 'wizard', charm: '#e8d06a',
  },
  tidecaller_hood: {
    color: '#2f6a78', trim: '#bfe8e0', kind: 'hood',
    gem: { color: '#e8f0f4' },
  },
  voidwhisper_cowl: {
    color: '#453a5c', trim: '#b8a8d8', kind: 'hood', mask: '#5a4e78',
  },
  cindersworn_hood: {
    color: '#4a3a38', trim: '#e05438', kind: 'hood',
    gem: { color: '#ff9a4a' },
  },
  starweaver_circlet: {
    color: '#c8cee8', trim: '#9db6ff', kind: 'circlet',
    halo: { color: '#c8cee8' },
  },
  thistledown_hood: { color: '#c9bfa3', trim: '#8a7a5c', kind: 'hood' },
  mothwing_cowl: {
    color: '#8a8a72', trim: '#d8d4b8', kind: 'hood',
    antennae: { color: '#d8d4b8' },
  },
  dawnsworn_hood: {
    color: '#d9c9a0', trim: '#c9922f', kind: 'hood',
    gem: { color: '#f2c94c' },
  },
  fenwalker_hood: {
    color: '#4a6b5c', trim: '#a8c8a0', kind: 'hood',
    feather: { color: '#7a9a5c' },
  },
  stormwoven_hood: {
    color: '#4e5a78', trim: '#c9d4e8', kind: 'hood',
    gem: { color: '#e8d878' },
  },
  hareswift_hood: {
    color: '#c2a878', trim: '#8a6f48', kind: 'hood',
    ears: { color: '#cfc0a0', tall: true, tip: '#4a4038' },
  },
  kingfisher_hood: {
    color: '#2f7a8a', trim: '#d87f3c', kind: 'hood',
    feather: { color: '#e8a03c' },
  },
  cutpurse_cowl: {
    color: '#4e4438', trim: '#c9a23c', kind: 'hood', mask: '#3a332c',
  },
  trapline_hood: {
    color: '#8a7248', trim: '#5a4a34', kind: 'hood',
    ruff: { color: '#b8a888' },
  },
  emberfox_hood: {
    color: '#b05a30', trim: '#e8dcc4', kind: 'hood',
    ears: { color: '#b05a30', tip: '#3a3230' },
  },
  // The early plate helms: every one a different silhouette — tusked
  // boar, crested-and-plumed hero, ram spiral, thorn crown, spiked
  // greathelm. A knight's helm is half the knight.
  tuskguard_helm: {
    color: '#a4744b', trim: '#6e4a30', kind: 'bascinet',
    tusks: { color: '#e8dcc0' }, spikesCrown: { color: '#38281c' },
  },
  valiant_helm: {
    color: '#c9ccd4', trim: '#c9a23c', kind: 'greathelm', visor: 'slit',
    crest: { color: '#b8bec8' }, plume: { color: '#a83a38' },
  },
  // The battering tower: a riveted siege bucket wider than the head,
  // twin eye slots, a keel plate — ram spirals bolted on roundels.
  ramwall_helm: {
    color: '#6a7080', trim: '#4a4f5c', kind: 'ramfort',
    horns: { color: '#cfc4a8', size: 1, curl: true }, jaw: '#7a8294',
  },
  // The thorn cage: a woven briar-bar visor under a twisted wreath
  // brow band — the hedge grown into a helm.
  briarplate_helm: {
    color: '#3e4a38', trim: '#8a9a6e', kind: 'briar',
    horns: { color: '#8a9a6e', size: 1.25, tine: true }, jaw: '#55644c',
  },
  sentinel_greathelm: {
    color: '#55607a', trim: '#d4c28a', kind: 'greathelm', visor: 'cross',
    spikesCrown: { color: '#d4c28a' }, fins: { color: '#707c9a' },
  },
  // The named wardrobe's heads: two new forged shells (aurochs,
  // barrow) and four hoods that earn their names.
  moonbell_hood: {
    color: '#545a86', trim: '#cdd6f0', kind: 'hood',
    gem: { color: '#bfd0ff' }, blooms: { color: '#bfd0ff' },
  },
  riftweave_cowl: {
    color: '#2b2438', trim: '#8a6ad8', kind: 'hood',
    gem: { color: '#f2ecff' }, shards: { color: '#3a3050' },
  },
  adderfang_hood: {
    color: '#74683c', trim: '#4c5a30', kind: 'hood',
    gem: { color: '#d8a03c' }, fangs: { color: '#e8e2ce' },
  },
  broodsilk_cowl: {
    color: '#2c2a34', trim: '#e8e6f0', kind: 'hood',
    ruff: { color: '#c8c4d8' }, mask: '#3a3742',
  },
  aurochs_helm: {
    color: '#4a3f36', trim: '#b8925c', kind: 'aurochs',
    jaw: '#6e5c4c', horns: { color: '#e8dcc4', size: 1.05 },
  },
  barrowking_helm: {
    color: '#3a4038', trim: '#c9b25c', kind: 'barrow', jaw: '#565e52',
  },
};

export const LEG_STYLES: Record<string, LegStyle> = {
  woven_trousers: { kind: 'pants', thigh: '#8f9ed6' },
  leather_chaps: { kind: 'wraps', thigh: '#b08a5c', shin: '#8a6a45', knee: 'wrap', kneeColor: '#6b4a26' },
  iron_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#8d9299', knee: 'plate', kneeColor: '#9aa2ac' },
  steel_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#b8bec8', knee: 'plate', kneeColor: '#d4dae2' },
  warden_greaves: { kind: 'greaves', thigh: '#3e5a48', shin: '#4a7a5a', knee: 'plate', kneeColor: '#b0703c' },
  frostplate_greaves: { kind: 'greaves', thigh: '#55647a', shin: '#9db6cc', knee: 'plate', kneeColor: '#cfe0ee' },
  bulwark_greaves: { kind: 'greaves', thigh: '#454b58', shin: '#5a6270', knee: 'plate', kneeColor: '#b08a3c' },
  dreadforge_greaves: { kind: 'greaves', thigh: '#322f3a', shin: '#4a4553', knee: 'plate', kneeColor: '#a83232' },
  sunforged_greaves: { kind: 'greaves', thigh: '#8a6a2c', shin: '#d4a43c', knee: 'plate', kneeColor: '#f4e0a0' },
  wayfarer_chaps: { kind: 'wraps', thigh: '#a8895a', shin: '#8a6a45', knee: 'wrap', kneeColor: '#6b4a2e' },
  wolfstalker_chaps: { kind: 'wraps', thigh: '#5f6470', shin: '#4f5460', knee: 'wrap', kneeColor: '#9aa0ae' },
  nightveil_leggings: { kind: 'wraps', thigh: '#3a3648', shin: '#302c3c', knee: 'wrap', kneeColor: '#6a5a8c' },
  drakescale_chaps: { kind: 'greaves', thigh: '#6e2f28', shin: '#8c3a32', knee: 'plate', kneeColor: '#d49a4a' },
  stagheart_chaps: { kind: 'wraps', thigh: '#6b5138', shin: '#5a4430', knee: 'wrap', kneeColor: '#3e5a30' },
  thistledown_skirts: { kind: 'pants', thigh: '#a89a80' },
  mothwing_skirts: { kind: 'pants', thigh: '#6e6e5a' },
  dawnsworn_skirts: { kind: 'pants', thigh: '#b8a87e' },
  fenwalker_skirts: { kind: 'pants', thigh: '#3a564a' },
  stormwoven_skirts: { kind: 'pants', thigh: '#3c4660' },
  hedgemage_skirts: { kind: 'pants', thigh: '#4e5c33' },
  tidecaller_skirts: { kind: 'pants', thigh: '#245562' },
  voidwhisper_skirts: { kind: 'pants', thigh: '#332b47' },
  cindersworn_skirts: { kind: 'pants', thigh: '#3a2d2b' },
  starweaver_skirts: { kind: 'pants', thigh: '#232850' },
  hareswift_chaps: { kind: 'wraps', thigh: '#c2a878', shin: '#a88f60', knee: 'wrap', kneeColor: '#8a6f48' },
  kingfisher_chaps: { kind: 'wraps', thigh: '#2f7a8a', shin: '#256575', knee: 'wrap', kneeColor: '#d87f3c' },
  cutpurse_leggings: { kind: 'wraps', thigh: '#4e4438', shin: '#3e362c', knee: 'wrap', kneeColor: '#6e6050' },
  trapline_chaps: { kind: 'wraps', thigh: '#8a7248', shin: '#6e5a3c', knee: 'wrap', kneeColor: '#5a4a34' },
  // The fox's own socks: russet thigh into black shin.
  emberfox_leggings: { kind: 'wraps', thigh: '#b05a30', shin: '#3a3230', knee: 'wrap', kneeColor: '#8a4526' },
  tuskguard_greaves: { kind: 'greaves', thigh: '#6e5138', shin: '#a4744b', knee: 'plate', kneeColor: '#c9955c' },
  valiant_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#c9ccd4', knee: 'plate', kneeColor: '#e8c04c' },
  ramwall_greaves: { kind: 'greaves', thigh: '#454b58', shin: '#6a7080', knee: 'plate', kneeColor: '#8a92a4' },
  briarplate_greaves: { kind: 'greaves', thigh: '#2e382a', shin: '#3e4a38', knee: 'plate', kneeColor: '#8a9a6e' },
  sentinel_greaves: { kind: 'greaves', thigh: '#3e4658', shin: '#55607a', knee: 'plate', kneeColor: '#d4c28a' },
  // The named wardrobe.
  moonbell_skirts: { kind: 'pants', thigh: '#434871' },
  riftweave_skirts: { kind: 'pants', thigh: '#221c2e' },
  adderfang_leggings: { kind: 'wraps', thigh: '#74683c', shin: '#5c5230', knee: 'wrap', kneeColor: '#4c5a30' },
  broodsilk_leggings: { kind: 'wraps', thigh: '#2c2a34', shin: '#232028', knee: 'wrap', kneeColor: '#e8e6f0' },
  aurochs_greaves: { kind: 'greaves', thigh: '#38302a', shin: '#4a3f36', knee: 'plate', kneeColor: '#b8925c' },
  barrowking_greaves: { kind: 'greaves', thigh: '#2d322c', shin: '#3a4038', knee: 'plate', kneeColor: '#ded6b8' },
};

export const BOOT_STYLES: Record<string, BootStyle> = {
  swiftstep_boots: { color: '#7fc9b3', height: 0.1, cuff: { color: '#4a8a78' } },
  leather_boots: { color: '#6b4a26', height: 0.08 },
  wanderer_boots: { color: '#8a6a45', height: 0.16, cuff: { color: '#6b4a26' } },
  iron_sabatons: { color: '#8d9299', height: 0.12, toe: '#c9ccd4' },
  steel_sabatons: { color: '#b8bec8', height: 0.13, toe: '#d4dae2' },
  warden_sabatons: { color: '#4a7a5a', height: 0.12, toe: '#b0703c' },
  frostplate_sabatons: { color: '#9db6cc', height: 0.12, toe: '#cfe0ee' },
  bulwark_sabatons: { color: '#5a6270', height: 0.14, toe: '#b08a3c', cuff: { color: '#787f8e' } },
  dreadforge_sabatons: { color: '#4a4553', height: 0.14, toe: '#625c6e', spike: true },
  sunforged_sabatons: { color: '#d4a43c', height: 0.13, toe: '#f4e0a0' },
  wayfarer_boots: { color: '#8a6a45', height: 0.12, wrap: { color: '#6b4a2e' } },
  wolfstalker_boots: { color: '#4f5460', height: 0.13, fur: { color: '#9aa0ae' } },
  nightveil_boots: { color: '#302c3c', height: 0.11, cuff: { color: '#6a5a8c' } },
  drakescale_boots: { color: '#8c3a32', height: 0.13, toe: '#d49a4a', cuff: { color: '#c9713c' } },
  stagheart_boots: { color: '#5a4430', height: 0.14, wrap: { color: '#3e5a30' }, cuff: { color: '#d4a43c' } },
  thistledown_slippers: { color: '#a89a80', height: 0.07 },
  mothwing_slippers: { color: '#6e6e5a', height: 0.08, cuff: { color: '#d8d4b8' } },
  dawnsworn_slippers: { color: '#b8a87e', height: 0.08, cuff: { color: '#c9922f' } },
  fenwalker_slippers: { color: '#3a564a', height: 0.1, wrap: { color: '#a8c8a0' } },
  stormwoven_slippers: { color: '#3c4660', height: 0.09, cuff: { color: '#e8d878' } },
  hedgemage_slippers: { color: '#8a7a3c', height: 0.07, curl: true },
  tidecaller_slippers: { color: '#1f4a55', height: 0.08, cuff: { color: '#bfe8e0' } },
  voidwhisper_slippers: { color: '#2e2740', height: 0.08, cuff: { color: '#b8a8d8' } },
  cindersworn_slippers: { color: '#332826', height: 0.08, cuff: { color: '#e05438' } },
  starweaver_slippers: { color: '#232850', height: 0.08, curl: true, cuff: { color: '#c8cee8' } },
  hareswift_boots: { color: '#a88f60', height: 0.1, fur: { color: '#e8e2d4' } },
  kingfisher_boots: { color: '#256575', height: 0.1, cuff: { color: '#d87f3c' } },
  cutpurse_boots: { color: '#3a332c', height: 0.09, cuff: { color: '#6e6050' } },
  trapline_boots: { color: '#6e5a3c', height: 0.13, wrap: { color: '#d8cfae' } },
  emberfox_boots: { color: '#3a3230', height: 0.11, fur: { color: '#c9713c' } },
  tuskguard_sabatons: { color: '#a4744b', height: 0.12, toe: '#c9955c' },
  valiant_sabatons: { color: '#c9ccd4', height: 0.13, toe: '#e8c04c' },
  ramwall_sabatons: { color: '#6a7080', height: 0.14, toe: '#8a92a4', cuff: { color: '#7a8294' } },
  briarplate_sabatons: { color: '#3e4a38', height: 0.13, toe: '#55644c', spike: true },
  sentinel_sabatons: { color: '#55607a', height: 0.14, toe: '#d4c28a' },
  // The named wardrobe.
  // No curl toe: the long robe owns the foot line; a curl peeking past
  // the hem reads as a stray hook, not a slipper.
  moonbell_slippers: { color: '#434871', height: 0.09, cuff: { color: '#cdd6f0' } },
  riftweave_slippers: { color: '#221c2e', height: 0.1, cuff: { color: '#8a6ad8' } },
  adderfang_boots: { color: '#5c5230', height: 0.13, wrap: { color: '#e8e2ce' } },
  broodsilk_boots: { color: '#232028', height: 0.12, wrap: { color: '#e8e6f0' } },
  // The dark toe is the hoof.
  aurochs_sabatons: { color: '#4a3f36', height: 0.14, toe: '#2e2622', cuff: { color: '#b8925c' } },
  barrowking_sabatons: { color: '#3a4038', height: 0.14, toe: '#565e52', cuff: { color: '#c9b25c' } },
};

/**
 * The glove wardrobe. Every themed set's pair is designed against that
 * set's own devices — a Warden glove grows the leaf-bladed patina, a
 * Dreadforge glove spikes like its pauldrons — never a generic mitt
 * with a new tint. Populated per-set in the wardrobe passes below.
 */
export const GLOVE_STYLES: Record<string, GloveStyle> = {
  // Starter basics: the three classes' plainest working pairs.
  leather_gloves: {
    color: '#b08a5c', hand: 'glove', bracer: '#a17c50',
    cuff: { color: '#6b4a26', kind: 'band' },
  },
  padded_mitts: {
    color: '#8a8ab0', hand: 'wrap', bracer: '#7c7ca2',
    cuff: { color: '#c9c4cf', kind: 'roll' },
  },
  iron_gauntlets: {
    color: '#8d9299', hand: 'gauntlet', bracer: '#7a7f8a',
    cuff: { color: '#b0b6be', kind: 'flare' },
    knuckle: { color: '#b0b6be', kind: 'plate' },
  },
  steel_gauntlets: {
    color: '#b8bec8', hand: 'gauntlet', bracer: '#a4aab6',
    cuff: { color: '#d4dae2', kind: 'flare' },
    knuckle: { color: '#c9a23c', kind: 'studs' },
  },
  // Themed plate: each gauntlet quotes its set's own devices — copper
  // leaf, rime studs, brass joints, blood spikes, ivory-cuffed gold.
  warden_gauntlets: {
    color: '#4a7a5a', hand: 'gauntlet', bracer: '#416c4f',
    cuff: { color: '#5a8a6a', kind: 'flare' },
    knuckle: { color: '#d69a55', kind: 'plate' },
  },
  frostplate_gauntlets: {
    color: '#9db6cc', hand: 'gauntlet', bracer: '#8ca6bc',
    cuff: { color: '#cfe0ee', kind: 'flare' },
    knuckle: { color: '#e8f4ff', kind: 'studs' },
  },
  bulwark_gauntlets: {
    color: '#5a6270', hand: 'gauntlet', bracer: '#505866',
    cuff: { color: '#787f8e', kind: 'flare' },
    knuckle: { color: '#b08a3c', kind: 'plate' },
  },
  dreadforge_gauntlets: {
    color: '#4a4553', hand: 'gauntlet', bracer: '#403b48',
    cuff: { color: '#625c6e', kind: 'flare' },
    knuckle: { color: '#a83232', kind: 'spikes' },
  },
  sunforged_gauntlets: {
    color: '#d4a43c', hand: 'gauntlet', bracer: '#c09330',
    cuff: { color: '#f4e0a0', kind: 'flare' },
    knuckle: { color: '#fff2c8', kind: 'plate' },
  },
  // Themed leather: fur, claws, scale rivets and moss — the wilds'
  // own hand-me-downs.
  wayfarer_gloves: {
    color: '#a8895a', hand: 'glove', bracer: '#8a6a45',
    cuff: { color: '#6b4a2e', kind: 'band' },
  },
  wolfstalker_gloves: {
    color: '#5f6470', hand: 'paw', bracer: '#555a66',
    cuff: { color: '#9aa0ae', kind: 'fur' },
    knuckle: { color: '#c9c4b4', kind: 'claws' },
  },
  nightveil_gloves: {
    color: '#302c3c', hand: 'glove', bracer: '#3a3648',
    cuff: { color: '#6a5a8c', kind: 'band' },
  },
  drakescale_gloves: {
    color: '#8c3a32', hand: 'gauntlet', bracer: '#7a332c',
    cuff: { color: '#c9713c', kind: 'band' },
    knuckle: { color: '#d49a4a', kind: 'studs' },
  },
  stagheart_gloves: {
    color: '#5a4430', hand: 'glove', bracer: '#4f3c2a',
    cuff: { color: '#4e6a3c', kind: 'fur' },
    knuckle: { color: '#d4a43c', kind: 'studs' },
  },
  // Themed cloth: the casters keep their fingers free and their
  // devices close — pearl, eye, ember and star ride the hand.
  hedgemage_gloves: {
    color: '#5a6b3a', hand: 'glove', bracer: '#506033',
    cuff: { color: '#8a7a3c', kind: 'roll' }, fingerless: true,
  },
  tidecaller_gloves: {
    color: '#2f6a78', hand: 'glove', bracer: '#2a5f6c',
    cuff: { color: '#bfe8e0', kind: 'roll' },
    knuckle: { color: '#e8e2d4', kind: 'gem' },
  },
  voidwhisper_gloves: {
    color: '#352c48', hand: 'glove', bracer: '#2e2740',
    cuff: { color: '#6a5a8c', kind: 'band' },
    knuckle: { color: '#b8a8d8', kind: 'gem' },
  },
  cindersworn_gloves: {
    color: '#332826', hand: 'glove', bracer: '#3e2f2c',
    cuff: { color: '#e05438', kind: 'band' },
    knuckle: { color: '#ff9a3c', kind: 'gem' },
  },
  starweaver_gloves: {
    color: '#2c3260', hand: 'glove', bracer: '#272c54',
    cuff: { color: '#c8cee8', kind: 'roll' },
    knuckle: { color: '#aab8e8', kind: 'gem' },
  },
  // Early cloth: the leveling road's wraps, in four dye lots each.
  thistledown_wraps: {
    color: '#c9bfa3', hand: 'wrap', bracer: '#bcb193',
    cuff: { color: '#a89a80', kind: 'roll' },
  },
  mothwing_wraps: {
    color: '#8a8a72', hand: 'wrap', bracer: '#7e7e67',
    cuff: { color: '#d8d4b8', kind: 'roll' },
    knuckle: { color: '#c8c4a0', kind: 'studs' },
  },
  dawnsworn_wraps: {
    color: '#d9c9a0', hand: 'wrap', bracer: '#ccbc92',
    cuff: { color: '#c9922f', kind: 'band' },
    knuckle: { color: '#e8b84a', kind: 'gem' },
  },
  fenwalker_wraps: {
    color: '#4a6b5c', hand: 'wrap', bracer: '#426053',
    cuff: { color: '#a8c8a0', kind: 'band' },
    knuckle: { color: '#a8e8c8', kind: 'gem' },
  },
  stormwoven_wraps: {
    color: '#4e5a78', hand: 'wrap', bracer: '#46516c',
    cuff: { color: '#e8d878', kind: 'band' },
    knuckle: { color: '#e8d878', kind: 'studs' },
  },
  // Early leather: fur cuffs, the flipped kingfisher, THE fingerless
  // thief pair, snare-cord wrists and the fox's black socks.
  hareswift_gloves: {
    color: '#c2a878', hand: 'paw', bracer: '#b0966a',
    cuff: { color: '#e8e2d4', kind: 'fur' },
  },
  kingfisher_gloves: {
    color: '#2f7a8a', hand: 'glove', bracer: '#2a6f7e',
    cuff: { color: '#d87f3c', kind: 'band' },
  },
  cutpurse_gloves: {
    color: '#4e4438', hand: 'glove', bracer: '#453c31',
    cuff: { color: '#6e6050', kind: 'band' }, fingerless: true,
  },
  trapline_gloves: {
    color: '#8a7248', hand: 'glove', bracer: '#6e5a3c',
    cuff: { color: '#d8cfae', kind: 'band' },
  },
  // The fox's black socks: dark paw, russet forearm — the pelt runs
  // unbroken from the jerkin sleeve down into the hand.
  emberfox_gloves: {
    color: '#3a3230', hand: 'paw', bracer: '#b05a30',
    cuff: { color: '#c9713c', kind: 'fur' },
  },
  // Early plate: ivory tusk studs, tourney polish, fluted slate,
  // thorned knuckles and the vigil's gold.
  tuskguard_gauntlets: {
    color: '#a4744b', hand: 'gauntlet', bracer: '#8a5f3c',
    cuff: { color: '#c9955c', kind: 'flare' },
    knuckle: { color: '#e8dcc0', kind: 'studs' },
  },
  valiant_gauntlets: {
    color: '#c9ccd4', hand: 'gauntlet', bracer: '#b4b9c4',
    cuff: { color: '#e8c04c', kind: 'flare' },
    knuckle: { color: '#e8ecf2', kind: 'plate' },
  },
  ramwall_gauntlets: {
    color: '#6a7080', hand: 'gauntlet', bracer: '#5e6473',
    cuff: { color: '#7a8294', kind: 'flare' },
    knuckle: { color: '#8a92a4', kind: 'plate' },
  },
  briarplate_gauntlets: {
    color: '#3e4a38', hand: 'gauntlet', bracer: '#374231',
    cuff: { color: '#55644c', kind: 'band' },
    knuckle: { color: '#8a9a6e', kind: 'spikes' },
  },
  sentinel_gauntlets: {
    color: '#55607a', hand: 'gauntlet', bracer: '#4b556c',
    cuff: { color: '#6a7694', kind: 'flare' },
    knuckle: { color: '#d4c28a', kind: 'studs' },
  },
  // The named wardrobe.
  moonbell_wraps: {
    color: '#545a86', hand: 'wrap', bracer: '#4b5178',
    cuff: { color: '#cdd6f0', kind: 'roll' },
    knuckle: { color: '#bfd0ff', kind: 'gem' },
  },
  riftweave_wraps: {
    color: '#2b2438', hand: 'wrap', bracer: '#262032',
    cuff: { color: '#8a6ad8', kind: 'band' },
    knuckle: { color: '#f2ecff', kind: 'gem' },
  },
  adderfang_gloves: {
    color: '#74683c', hand: 'glove', bracer: '#685d36',
    cuff: { color: '#4c5a30', kind: 'band' },
    knuckle: { color: '#e8e2ce', kind: 'claws' },
  },
  broodsilk_gloves: {
    color: '#2c2a34', hand: 'wrap', bracer: '#282631',
    cuff: { color: '#e8e6f0', kind: 'roll' },
  },
  aurochs_gauntlets: {
    color: '#4a3f36', hand: 'gauntlet', bracer: '#41372f',
    cuff: { color: '#b8925c', kind: 'flare' },
    knuckle: { color: '#6e5c4c', kind: 'studs' },
  },
  barrowking_gauntlets: {
    color: '#3a4038', hand: 'gauntlet', bracer: '#343a33',
    cuff: { color: '#c9b25c', kind: 'flare' },
    knuckle: { color: '#ded6b8', kind: 'plate' },
  },
};

export const OFFHAND_STYLES: Record<string, OffhandStyle> = {
  spiked_buckler: { kind: 'buckler', color: '#8f7449', trim: '#3f4450', boss: '#e4e9f1', spikes: true },
  oak_kiteshield: { kind: 'kite', color: '#79512a', trim: '#c08a4e', emblem: 'chevron' },
  frost_quiver: { kind: 'quiver', color: '#8ac4e8', trim: '#4a6a8a' },
  tome_of_embers: { kind: 'tome', color: '#e8763c', trim: '#6b3a1e' },
  arcane_orb: { kind: 'orb', color: '#8f9ed6', trim: '#c9c4cf' },
  tower_shield: { kind: 'tower', color: '#9aa1ab', trim: '#5d6472', boss: '#cdd4de' },
  // The greatshield class. `kind` only routes them into the shield
  // dialect — each one's real silhouette and art come from its
  // authored SHIELD_STYLES record.
  frostplate_greatshield: { kind: 'tower', color: '#9db6cc', trim: '#dbe9f4', boss: '#eaf7ff' },
  bulwark_bastion: { kind: 'tower', color: '#5a6270', trim: '#9c7c3a', boss: '#d8b76a' },
  sunforged_aegis: { kind: 'tower', color: '#d4a43c', trim: '#f0e2bd', boss: '#fff8e4' },
  gobnail_warboard: { kind: 'buckler', color: '#6b5233', trim: '#66513a', boss: '#9aa1ab', spikes: true },
  wolfjaw_targe: { kind: 'buckler', color: '#7a5a38', trim: '#6a7080', boss: '#565c68', spikes: true },
  bonespur_ward: { kind: 'tower', color: '#d9d2bd', trim: '#4a505c', boss: '#5a616e', spikes: true },
  kingsward: { kind: 'kite', color: '#8a2431', trim: '#d8b76a', boss: '#dfe6f4' },
  dreadforge_thornwall: { kind: 'tower', color: '#3a3d46', trim: '#c9a45e', boss: '#d8b76a', spikes: true },
  hunters_quiver: { kind: 'quiver', color: '#8a6a45', trim: '#3f6b3a' },
  scholars_tome: { kind: 'tome', color: '#4a5a9c', trim: '#c8cee8' },
};

// ---------------------------------------------------------- colorways

/**
 * The colorway law as a record generator: a dye lot reuses its base
 * piece's whole silhouette record and overrides only palette fields.
 * Every override below is intentional art — trims and accents are
 * re-picked per dye, never hue-rotated.
 */
function registerColorways<T>(
  table: Record<string, T>,
  baseId: string,
  dyes: Record<string, Partial<T>>,
): void {
  for (const [key, over] of Object.entries(dyes)) {
    table[`${baseId}_${key}`] = { ...table[baseId]!, ...over };
  }
}

// Thistledown dye lots: patch, rope and hem tones follow the cloth.
registerColorways(BODY_STYLES, 'thistledown_robe', {
  madder: { color: '#a8524a', trim: '#d9b08a', patches: '#c98a6a', sash: '#6b4038', underskirt: '#8a4038' },
  woad: { color: '#54688e', trim: '#c9c4b0', patches: '#7a8aa8', sash: '#3e4c68', underskirt: '#42527a' },
  bracken: { color: '#8a6f4a', trim: '#c9b088', patches: '#a89060', sash: '#5c4a30', underskirt: '#6e5738' },
});
registerColorways(HELM_STYLES, 'thistledown_hood', {
  madder: { color: '#a8524a', trim: '#d9b08a' },
  woad: { color: '#54688e', trim: '#c9c4b0' },
  bracken: { color: '#8a6f4a', trim: '#c9b088' },
});
registerColorways(LEG_STYLES, 'thistledown_skirts', {
  madder: { thigh: '#8a4038' },
  woad: { thigh: '#42527a' },
  bracken: { thigh: '#6e5738' },
});
registerColorways(BOOT_STYLES, 'thistledown_slippers', {
  madder: { color: '#8a4038' },
  woad: { color: '#42527a' },
  bracken: { color: '#6e5738' },
});

// Mothwing dye lots: wing dust and antennae follow the moth.
registerColorways(BODY_STYLES, 'mothwing_robe', {
  luna: { color: '#9ab88e', trim: '#e2eecc', underskirt: '#7a9670', motes: '#d8eec0' },
  dusk: { color: '#7a6280', trim: '#d0c0dc', underskirt: '#615068', motes: '#c8b4d8' },
  ember: { color: '#a8705c', trim: '#e8c8a0', underskirt: '#8a5a48', motes: '#e8b088' },
});
registerColorways(HELM_STYLES, 'mothwing_cowl', {
  luna: { color: '#9ab88e', trim: '#e2eecc', antennae: { color: '#e2eecc' } },
  dusk: { color: '#7a6280', trim: '#d0c0dc', antennae: { color: '#d0c0dc' } },
  ember: { color: '#a8705c', trim: '#e8c8a0', antennae: { color: '#e8c8a0' } },
});
registerColorways(LEG_STYLES, 'mothwing_skirts', {
  luna: { thigh: '#7a9670' },
  dusk: { thigh: '#615068' },
  ember: { thigh: '#8a5a48' },
});
registerColorways(BOOT_STYLES, 'mothwing_slippers', {
  luna: { color: '#7a9670', cuff: { color: '#e2eecc' } },
  dusk: { color: '#615068', cuff: { color: '#d0c0dc' } },
  ember: { color: '#8a5a48', cuff: { color: '#e8c8a0' } },
});

// Dawnsworn dye lots: the sun device keeps its gold except at noon,
// when it burns red on bleached white; eclipse rings gold on charcoal.
registerColorways(BODY_STYLES, 'dawnsworn_robe', {
  duskvow: {
    color: '#9a6a86', trim: '#e0b0c0', sash: '#6e4860', underskirt: '#7e5670',
    stole: { color: '#6e4860', trim: '#e0b0c0' },
  },
  highnoon: {
    color: '#eae4d2', trim: '#c04a3a', sash: '#b0703c', underskirt: '#c8c2b0',
    stole: { color: '#c04a3a', trim: '#eae4d2' },
  },
  eclipse: {
    color: '#4a4550', trim: '#d4a43c', sash: '#38343e', underskirt: '#3a3642',
    stole: { color: '#38343e', trim: '#d4a43c' },
  },
});
registerColorways(HELM_STYLES, 'dawnsworn_hood', {
  duskvow: { color: '#9a6a86', trim: '#e0b0c0', gem: { color: '#d97a9a' } },
  highnoon: { color: '#eae4d2', trim: '#c04a3a', gem: { color: '#e05438' } },
  eclipse: { color: '#4a4550', trim: '#d4a43c', gem: { color: '#e8c04c' } },
});
registerColorways(LEG_STYLES, 'dawnsworn_skirts', {
  duskvow: { thigh: '#7e5670' },
  highnoon: { thigh: '#c8c2b0' },
  eclipse: { thigh: '#3a3642' },
});
registerColorways(BOOT_STYLES, 'dawnsworn_slippers', {
  duskvow: { color: '#7e5670', cuff: { color: '#e0b0c0' } },
  highnoon: { color: '#c8c2b0', cuff: { color: '#c04a3a' } },
  eclipse: { color: '#3a3642', cuff: { color: '#d4a43c' } },
});

// Fenwalker dye lots: wisp runes and reed feather follow the water.
registerColorways(BODY_STYLES, 'fenwalker_robe', {
  mirebloom: { color: '#7a5a78', trim: '#d0b0d8', runes: '#e0b0e8', underskirt: '#614760', motes: '#d8b0e0' },
  rustsedge: { color: '#96603c', trim: '#d9a86a', runes: '#e8c088', underskirt: '#784c30', motes: '#e8c088' },
  graymist: { color: '#7d8580', trim: '#c8d0cc', runes: '#d0e0dc', underskirt: '#646a66', motes: '#c8d8d4' },
});
registerColorways(HELM_STYLES, 'fenwalker_hood', {
  mirebloom: { color: '#7a5a78', trim: '#d0b0d8', feather: { color: '#a878a0' } },
  rustsedge: { color: '#96603c', trim: '#d9a86a', feather: { color: '#b8823c' } },
  graymist: { color: '#7d8580', trim: '#c8d0cc', feather: { color: '#98a49c' } },
});
registerColorways(LEG_STYLES, 'fenwalker_skirts', {
  mirebloom: { thigh: '#614760' },
  rustsedge: { thigh: '#784c30' },
  graymist: { thigh: '#646a66' },
});
registerColorways(BOOT_STYLES, 'fenwalker_slippers', {
  mirebloom: { color: '#614760', wrap: { color: '#d0b0d8' } },
  rustsedge: { color: '#784c30', wrap: { color: '#d9a86a' } },
  graymist: { color: '#646a66', wrap: { color: '#c8d0cc' } },
});

// Stormwoven dye lots: the bolt stays gold under every weather but
// aurora, where the sky itself changes color.
registerColorways(BODY_STYLES, 'stormwoven_robe', {
  thunderhead: { color: '#3a3f4e', trim: '#e8c04c', runes: '#8898b8', mantle: '#2e323e', underskirt: '#2e323e' },
  sunshower: { color: '#c9a85c', trim: '#f4ecd0', runes: '#fff0b0', mantle: '#a8894a', underskirt: '#a8894a' },
  aurora: { color: '#3e7a6a', trim: '#b8e8d0', runes: '#c8a8e8', mantle: '#326256', underskirt: '#326256' },
});
registerColorways(HELM_STYLES, 'stormwoven_hood', {
  thunderhead: { color: '#3a3f4e', trim: '#e8c04c', gem: { color: '#e8c04c' } },
  sunshower: { color: '#c9a85c', trim: '#f4ecd0', gem: { color: '#fff0b0' } },
  aurora: { color: '#3e7a6a', trim: '#b8e8d0', gem: { color: '#c8a8e8' } },
});
registerColorways(LEG_STYLES, 'stormwoven_skirts', {
  thunderhead: { thigh: '#2e323e' },
  sunshower: { thigh: '#a8894a' },
  aurora: { thigh: '#326256' },
});
registerColorways(BOOT_STYLES, 'stormwoven_slippers', {
  thunderhead: { color: '#2e323e', cuff: { color: '#e8c04c' } },
  sunshower: { color: '#a8894a', cuff: { color: '#f4ecd0' } },
  aurora: { color: '#326256', cuff: { color: '#b8e8d0' } },
});

// Hareswift dye lots: the fur stays a coat, the ear tips stay black —
// a hare is a hare in any season.
registerColorways(BODY_STYLES, 'hareswift_jerkin', {
  clover: { color: '#7a9a58', trim: '#4e6a38' },
  snowmelt: { color: '#cfd2ca', trim: '#9aa096' },
  sorrel: { color: '#a86a48', trim: '#6e4530' },
});
registerColorways(HELM_STYLES, 'hareswift_hood', {
  clover: { color: '#7a9a58', trim: '#4e6a38', ears: { color: '#8ab868', tall: true, tip: '#3a4a2c' } },
  snowmelt: { color: '#cfd2ca', trim: '#9aa096', ears: { color: '#e0e2da', tall: true, tip: '#4a4038' } },
  sorrel: { color: '#a86a48', trim: '#6e4530', ears: { color: '#b87e58', tall: true, tip: '#3a2c24' } },
});
registerColorways(LEG_STYLES, 'hareswift_chaps', {
  clover: { thigh: '#7a9a58', shin: '#62804a', kneeColor: '#4e6a38' },
  snowmelt: { thigh: '#cfd2ca', shin: '#b0b4aa', kneeColor: '#9aa096' },
  sorrel: { thigh: '#a86a48', shin: '#8a5638', kneeColor: '#6e4530' },
});
registerColorways(BOOT_STYLES, 'hareswift_boots', {
  clover: { color: '#62804a', fur: { color: '#e8f0d8' } },
  snowmelt: { color: '#b0b4aa', fur: { color: '#f4f4ee' } },
  sorrel: { color: '#8a5638', fur: { color: '#e8dcc4' } },
});

// Kingfisher dye lots: plumage swaps whole — sundart flips the bird,
// teal feather on gold.
registerColorways(BODY_STYLES, 'kingfisher_jerkin', {
  reedmace: {
    color: '#6a8a4a', trim: '#c9a23c', pauldronColor: '#82a862',
    belt: { color: '#54703a', buckle: '#c9a23c' },
  },
  stormgull: {
    color: '#9aa8b0', trim: '#4e5a64', pauldronColor: '#c0ccd2',
    belt: { color: '#7e8c94', buckle: '#4e5a64' },
  },
  sundart: {
    color: '#d8a03c', trim: '#2f7a8a', pauldronColor: '#e8bc60',
    belt: { color: '#b58230', buckle: '#2f7a8a' },
  },
});
registerColorways(HELM_STYLES, 'kingfisher_hood', {
  reedmace: { color: '#6a8a4a', trim: '#c9a23c', feather: { color: '#d8b84c' } },
  stormgull: { color: '#9aa8b0', trim: '#4e5a64', feather: { color: '#e8ecee' } },
  sundart: { color: '#d8a03c', trim: '#2f7a8a', feather: { color: '#2f7a8a' } },
});
registerColorways(LEG_STYLES, 'kingfisher_chaps', {
  reedmace: { thigh: '#6a8a4a', shin: '#54703a', kneeColor: '#c9a23c' },
  stormgull: { thigh: '#9aa8b0', shin: '#7e8c94', kneeColor: '#4e5a64' },
  sundart: { thigh: '#d8a03c', shin: '#b58230', kneeColor: '#2f7a8a' },
});
registerColorways(BOOT_STYLES, 'kingfisher_boots', {
  reedmace: { color: '#54703a', cuff: { color: '#c9a23c' } },
  stormgull: { color: '#7e8c94', cuff: { color: '#e8ecee' } },
  sundart: { color: '#b58230', cuff: { color: '#2f7a8a' } },
});

// Cutpurse dye lots: the coin is the tell — brass on umber and
// oxblood, silver in the gutter, pale moon-metal after dark.
registerColorways(BODY_STYLES, 'cutpurse_jerkin', {
  alleyrat: {
    color: '#5c5c56', trim: '#b0b6be', metal: '#8a8e96',
    yoke: { color: '#4a4a44' }, lace: '#3e3e38',
    belt: { color: '#3e3e38', buckle: '#b0b6be' },
  },
  moonless: {
    color: '#33303c', trim: '#a8b0cc', metal: '#5c5a6e',
    yoke: { color: '#28252f' }, lace: '#201d28',
    belt: { color: '#201d28', buckle: '#a8b0cc' },
  },
  redhand: {
    color: '#6e3a34', trim: '#c9a23c', metal: '#8a6a4a',
    yoke: { color: '#582e28' }, lace: '#442420',
    belt: { color: '#442420', buckle: '#c9a23c' },
  },
});
registerColorways(HELM_STYLES, 'cutpurse_cowl', {
  alleyrat: { color: '#5c5c56', trim: '#b0b6be', mask: '#45453e' },
  moonless: { color: '#33303c', trim: '#a8b0cc', mask: '#262330' },
  redhand: { color: '#6e3a34', trim: '#c9a23c', mask: '#4e2a26' },
});
registerColorways(LEG_STYLES, 'cutpurse_leggings', {
  alleyrat: { thigh: '#5c5c56', shin: '#4a4a44', kneeColor: '#767670' },
  moonless: { thigh: '#33303c', shin: '#28252f', kneeColor: '#4e4a5c' },
  redhand: { thigh: '#6e3a34', shin: '#582e28', kneeColor: '#8a5a4a' },
});
registerColorways(BOOT_STYLES, 'cutpurse_boots', {
  alleyrat: { color: '#4a4a44', cuff: { color: '#767670' } },
  moonless: { color: '#28252f', cuff: { color: '#4e4a5c' } },
  redhand: { color: '#582e28', cuff: { color: '#8a5a4a' } },
});

// Trapline dye lots: the bone toggles and snare cords stay bone —
// only the country the line runs through changes.
registerColorways(BODY_STYLES, 'trapline_jerkin', {
  juniper: {
    color: '#4e6a52', trim: '#34483a', bandolier: '#34483a',
    pauldronColor: '#3e5642', belt: { color: '#34483a', buckle: '#d8cfae' },
  },
  riverclay: {
    color: '#96604c', trim: '#6a4034', bandolier: '#6a4034',
    pauldronColor: '#7a4e3c', belt: { color: '#6a4034', buckle: '#d8cfae' },
  },
  nightsnare: {
    color: '#3e4450', trim: '#2c303a', bandolier: '#2c303a',
    pauldronColor: '#333844', belt: { color: '#2c303a', buckle: '#b8c0cc' },
  },
});
registerColorways(HELM_STYLES, 'trapline_hood', {
  juniper: { color: '#4e6a52', trim: '#34483a', ruff: { color: '#a8c0aa' } },
  riverclay: { color: '#96604c', trim: '#6a4034', ruff: { color: '#c9ab98' } },
  nightsnare: { color: '#3e4450', trim: '#2c303a', ruff: { color: '#9aa2b0' } },
});
registerColorways(LEG_STYLES, 'trapline_chaps', {
  juniper: { thigh: '#4e6a52', shin: '#3e5642', kneeColor: '#34483a' },
  riverclay: { thigh: '#96604c', shin: '#7a4e3c', kneeColor: '#6a4034' },
  nightsnare: { thigh: '#3e4450', shin: '#333844', kneeColor: '#2c303a' },
});
registerColorways(BOOT_STYLES, 'trapline_boots', {
  juniper: { color: '#3e5642', wrap: { color: '#d8cfae' } },
  riverclay: { color: '#7a4e3c', wrap: { color: '#d8cfae' } },
  nightsnare: { color: '#333844', wrap: { color: '#b8c0cc' } },
});

// Emberfox dye lots: whole pelts, not tints — silver, shadow and dawn
// foxes each keep the dark socks and the pale-tipped tail.
registerColorways(BODY_STYLES, 'emberfox_jerkin', {
  silverfox: { color: '#8a8e96', trim: '#ececf0', pauldronColor: '#a4a8b0', tail: { color: '#8a8e96', tip: '#ececf0' } },
  shadowfox: { color: '#3a3640', trim: '#b8b4c0', pauldronColor: '#4c4856', tail: { color: '#3a3640', tip: '#b8b4c0' } },
  dawnfox: { color: '#d8b878', trim: '#f4ecd8', pauldronColor: '#e0c890', tail: { color: '#d8b878', tip: '#f4ecd8' } },
});
registerColorways(HELM_STYLES, 'emberfox_hood', {
  silverfox: { color: '#8a8e96', trim: '#ececf0', ears: { color: '#8a8e96', tip: '#26242c' } },
  shadowfox: { color: '#3a3640', trim: '#b8b4c0', ears: { color: '#3a3640', tip: '#16141c' } },
  dawnfox: { color: '#d8b878', trim: '#f4ecd8', ears: { color: '#d8b878', tip: '#6e5838' } },
});
registerColorways(LEG_STYLES, 'emberfox_leggings', {
  silverfox: { thigh: '#8a8e96', shin: '#33303a', kneeColor: '#6a6e78' },
  shadowfox: { thigh: '#3a3640', shin: '#232028', kneeColor: '#4c4856' },
  dawnfox: { thigh: '#d8b878', shin: '#6e5838', kneeColor: '#b09258' },
});
registerColorways(BOOT_STYLES, 'emberfox_boots', {
  silverfox: { color: '#33303a', fur: { color: '#a4a8b0' } },
  shadowfox: { color: '#232028', fur: { color: '#4c4856' } },
  dawnfox: { color: '#6e5838', fur: { color: '#e0c890' } },
});

// Tuskguard forge lots: the same boar hammered from iron, gold and
// coal-quenched bronze — the tusks stay ivory; that IS the helmet.
registerColorways(BODY_STYLES, 'tuskguard_platebody', {
  ironshod: { color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', pauldronColor: '#9aa0aa', pauldronTrim: '#c9ccd4' },
  gilded: { color: '#d8ac44', trim: '#a4772c', metal: '#e8c05c', pauldronColor: '#e0b44e', pauldronTrim: '#f4e0a0' },
  ashen: { color: '#4a4644', trim: '#332f2e', metal: '#6a6462', pauldronColor: '#54504e', pauldronTrim: '#7d7674' },
});
registerColorways(HELM_STYLES, 'tuskguard_helm', {
  ironshod: { color: '#8d9299', trim: '#6a6f7d', spikesCrown: { color: '#3a3e46' } },
  gilded: { color: '#d8ac44', trim: '#a4772c', tusks: { color: '#f4ecd8' }, spikesCrown: { color: '#8a6a24' } },
  ashen: { color: '#4a4644', trim: '#332f2e', spikesCrown: { color: '#211e1d' } },
});
registerColorways(LEG_STYLES, 'tuskguard_greaves', {
  ironshod: { thigh: '#5c5460', shin: '#8d9299', kneeColor: '#b0b6be' },
  gilded: { thigh: '#8a6a2c', shin: '#d8ac44', kneeColor: '#e8c05c' },
  ashen: { thigh: '#332f2e', shin: '#4a4644', kneeColor: '#6a6462' },
});
registerColorways(BOOT_STYLES, 'tuskguard_sabatons', {
  ironshod: { color: '#8d9299', toe: '#b0b6be' },
  gilded: { color: '#d8ac44', toe: '#e8c05c' },
  ashen: { color: '#4a4644', toe: '#6a6462' },
});

// Valiant tourney lots: enamel over bright iron; every lot re-picks
// its plume — the heraldry is the point.
registerColorways(BODY_STYLES, 'valiant_platebody', {
  crimson: {
    color: '#a83a38', metal: '#c04a44', pauldronColor: '#b04240',
    pauldronTrim: '#e8c04c', tabard: { color: '#e8e4da', trim: '#e8c04c' },
  },
  azure: {
    color: '#4a5f9c', metal: '#5a70b0', pauldronColor: '#5468a4',
    pauldronTrim: '#e8e4da', tabard: { color: '#e8e4da', trim: '#e8c04c' },
  },
  gilded: {
    color: '#d8ac44', trim: '#f4e0a0', metal: '#e8c05c',
    pauldronColor: '#e0b44e', pauldronTrim: '#f4e0a0',
    tabard: { color: '#a83240', trim: '#f4e0a0' },
  },
});
registerColorways(HELM_STYLES, 'valiant_helm', {
  crimson: { color: '#a83a38', trim: '#e8c04c', crest: { color: '#8a2f2c' }, plume: { color: '#e8e4da' } },
  azure: { color: '#4a5f9c', trim: '#e8e4da', crest: { color: '#3e5188' }, plume: { color: '#e8e4da' } },
  gilded: { color: '#d8ac44', trim: '#f4e0a0', crest: { color: '#b8912e' }, plume: { color: '#a83a38' } },
});
registerColorways(LEG_STYLES, 'valiant_greaves', {
  crimson: { thigh: '#6e2a28', shin: '#a83a38', kneeColor: '#e8c04c' },
  azure: { thigh: '#324070', shin: '#4a5f9c', kneeColor: '#e8e4da' },
  gilded: { thigh: '#8a6a2c', shin: '#d8ac44', kneeColor: '#f4e0a0' },
});
registerColorways(BOOT_STYLES, 'valiant_sabatons', {
  crimson: { color: '#a83a38', toe: '#e8c04c' },
  azure: { color: '#4a5f9c', toe: '#e8e4da' },
  gilded: { color: '#d8ac44', toe: '#f4e0a0' },
});

// Ramwall lots: steel re-forge, gilded horns for rank, and the
// stormram — coal-dark with SPIKED shoulders, a structural upgrade.
registerColorways(BODY_STYLES, 'ramwall_platebody', {
  steelhorn: { color: '#b8bec8', trim: '#8d9299', metal: '#d4dae2', pauldronColor: '#c4cad4', pauldronTrim: '#e2e6ec' },
  goldhorn: { color: '#7a7466', trim: '#585349', metal: '#9a927e', pauldronColor: '#8a8272', pauldronTrim: '#e8c04c' },
  stormram: {
    color: '#3e4148', trim: '#2c2e34', metal: '#5a5e68',
    pauldron: 'spiked', pauldronColor: '#4a4d56', pauldronSpikes: 1, pauldronTrim: '#7d8290',
  },
});
registerColorways(HELM_STYLES, 'ramwall_helm', {
  steelhorn: { color: '#b8bec8', trim: '#8d9299', jaw: '#c4cad4' },
  goldhorn: { color: '#7a7466', trim: '#585349', horns: { color: '#e8c04c', size: 1, curl: true }, jaw: '#8a8272' },
  stormram: { color: '#3e4148', trim: '#2c2e34', horns: { color: '#9aa0ae', size: 1.1, curl: true }, jaw: '#4a4d56' },
});
registerColorways(LEG_STYLES, 'ramwall_greaves', {
  steelhorn: { thigh: '#5c5460', shin: '#b8bec8', kneeColor: '#d4dae2' },
  goldhorn: { thigh: '#585349', shin: '#7a7466', kneeColor: '#e8c04c' },
  stormram: { thigh: '#2c2e34', shin: '#3e4148', kneeColor: '#7d8290' },
});
registerColorways(BOOT_STYLES, 'ramwall_sabatons', {
  steelhorn: { color: '#b8bec8', toe: '#d4dae2', cuff: { color: '#c4cad4' } },
  goldhorn: { color: '#7a7466', toe: '#e8c04c', cuff: { color: '#8a8272' } },
  stormram: { color: '#3e4148', toe: '#7d8290', cuff: { color: '#4a4d56' }, spike: true },
});

// Briarplate lots: whole hedges, not tints — bonebriar grows a THIRD
// shoulder thorn and ivory horns; the briar thickens as it pales.
registerColorways(BODY_STYLES, 'briarplate_platebody', {
  bloodbriar: { color: '#5c3230', trim: '#c9a88a', metal: '#744240', pauldronColor: '#4c2a28', pauldronTrim: '#c9a88a' },
  bonebriar: {
    color: '#b0a890', trim: '#e6e0d0', metal: '#c4bca4',
    pauldronColor: '#a09880', pauldronSpikes: 3, pauldronTrim: '#e6e0d0',
  },
  nightbriar: { color: '#38304a', trim: '#9a8ab8', metal: '#4a4060', pauldronColor: '#2e2740', pauldronTrim: '#9a8ab8' },
});
registerColorways(HELM_STYLES, 'briarplate_helm', {
  bloodbriar: { color: '#5c3230', trim: '#c9a88a', horns: { color: '#c9a88a', size: 1.25, tine: true }, jaw: '#744240' },
  bonebriar: { color: '#b0a890', trim: '#e6e0d0', horns: { color: '#e6e0d0', size: 1.5, tine: true }, jaw: '#c4bca4' },
  nightbriar: { color: '#38304a', trim: '#9a8ab8', horns: { color: '#9a8ab8', size: 1.25, tine: true }, jaw: '#4a4060' },
});
registerColorways(LEG_STYLES, 'briarplate_greaves', {
  bloodbriar: { thigh: '#442624', shin: '#5c3230', kneeColor: '#c9a88a' },
  bonebriar: { thigh: '#8a8270', shin: '#b0a890', kneeColor: '#e6e0d0' },
  nightbriar: { thigh: '#282238', shin: '#38304a', kneeColor: '#9a8ab8' },
});
registerColorways(BOOT_STYLES, 'briarplate_sabatons', {
  bloodbriar: { color: '#5c3230', toe: '#744240' },
  bonebriar: { color: '#b0a890', toe: '#c4bca4' },
  nightbriar: { color: '#38304a', toe: '#4a4060' },
});

// Sentinel lots: the watch by hour — daybreak trades the fins for
// WINGS (structural), midnight pales the crown against the dark.
registerColorways(BODY_STYLES, 'sentinel_platebody', {
  daybreak: { color: '#cfc4a8', trim: '#e8c04c', metal: '#e0d8c0', pauldronColor: '#d8cfae', pauldronTrim: '#e8c04c' },
  bloodwatch: { color: '#6e3038', trim: '#d8cfae', metal: '#8a4048', pauldronColor: '#5c2830', pauldronTrim: '#d8cfae' },
  midnight: { color: '#2e3244', trim: '#aab4d0', metal: '#3e4458', pauldronColor: '#262a3a', pauldronTrim: '#aab4d0' },
});
registerColorways(HELM_STYLES, 'sentinel_greathelm', {
  daybreak: {
    color: '#cfc4a8', trim: '#e8c04c', spikesCrown: { color: '#e8c04c' },
    fins: undefined, wings: { color: '#e8e2d0' },
  },
  bloodwatch: { color: '#6e3038', trim: '#d8cfae', spikesCrown: { color: '#d8cfae' }, fins: { color: '#8a4048' } },
  midnight: { color: '#2e3244', trim: '#aab4d0', spikesCrown: { color: '#aab4d0' }, fins: { color: '#3e4458' } },
});
registerColorways(LEG_STYLES, 'sentinel_greaves', {
  daybreak: { thigh: '#a89e84', shin: '#cfc4a8', kneeColor: '#e8c04c' },
  bloodwatch: { thigh: '#502228', shin: '#6e3038', kneeColor: '#d8cfae' },
  midnight: { thigh: '#20233a', shin: '#2e3244', kneeColor: '#aab4d0' },
});
registerColorways(BOOT_STYLES, 'sentinel_sabatons', {
  daybreak: { color: '#cfc4a8', toe: '#e8c04c' },
  bloodwatch: { color: '#6e3038', toe: '#d8cfae' },
  midnight: { color: '#2e3244', toe: '#aab4d0' },
});

// Glove dye lots: every early set's pair follows its wardrobe's
// established palette — furs whiten with the snowmelt hare, the
// sundart kingfisher flips teal-on-gold, tusk studs stay ivory.
registerColorways(GLOVE_STYLES, 'thistledown_wraps', {
  madder: { color: '#a8524a', bracer: '#9c4a43', cuff: { color: '#8a4038', kind: 'roll' } },
  woad: { color: '#54688e', bracer: '#4c5e82', cuff: { color: '#42527a', kind: 'roll' } },
  bracken: { color: '#8a6f4a', bracer: '#7e6543', cuff: { color: '#6e5738', kind: 'roll' } },
});
registerColorways(GLOVE_STYLES, 'mothwing_wraps', {
  luna: { color: '#9ab88e', bracer: '#8dab82', cuff: { color: '#e2eecc', kind: 'roll' }, knuckle: { color: '#d8eec0', kind: 'studs' } },
  dusk: { color: '#7a6280', bracer: '#6f5975', cuff: { color: '#d0c0dc', kind: 'roll' }, knuckle: { color: '#c8b4d8', kind: 'studs' } },
  ember: { color: '#a8705c', bracer: '#9b6653', cuff: { color: '#e8c8a0', kind: 'roll' }, knuckle: { color: '#e8b088', kind: 'studs' } },
});
registerColorways(GLOVE_STYLES, 'dawnsworn_wraps', {
  duskvow: { color: '#9a6a86', bracer: '#8d607a', cuff: { color: '#e0b0c0', kind: 'band' } },
  highnoon: { color: '#eae4d2', bracer: '#ddd6c1', cuff: { color: '#c04a3a', kind: 'band' } },
  eclipse: { color: '#4a4550', bracer: '#413d47', cuff: { color: '#d4a43c', kind: 'band' } },
});
registerColorways(GLOVE_STYLES, 'fenwalker_wraps', {
  mirebloom: { color: '#7a5a78', bracer: '#6f516d', cuff: { color: '#d0b0d8', kind: 'band' }, knuckle: { color: '#e0c0e8', kind: 'gem' } },
  rustsedge: { color: '#96603c', bracer: '#885636', cuff: { color: '#d9a86a', kind: 'band' }, knuckle: { color: '#f0d0a0', kind: 'gem' } },
  graymist: { color: '#7d8580', bracer: '#727a75', cuff: { color: '#c8d0cc', kind: 'band' }, knuckle: { color: '#e0e8e4', kind: 'gem' } },
});
registerColorways(GLOVE_STYLES, 'stormwoven_wraps', {
  thunderhead: { color: '#3a3f4e', bracer: '#333744', cuff: { color: '#e8c04c', kind: 'band' }, knuckle: { color: '#e8c04c', kind: 'studs' } },
  sunshower: { color: '#c9a85c', bracer: '#bb9b52', cuff: { color: '#f4ecd0', kind: 'band' }, knuckle: { color: '#f4ecd0', kind: 'studs' } },
  aurora: { color: '#4e8a7a', bracer: '#467d6e', cuff: { color: '#b8e8d0', kind: 'band' }, knuckle: { color: '#b8e8d0', kind: 'studs' } },
});
registerColorways(GLOVE_STYLES, 'hareswift_gloves', {
  clover: { color: '#7a9a58', bracer: '#6e8c4f', cuff: { color: '#e8f0d8', kind: 'fur' } },
  snowmelt: { color: '#cfd2ca', bracer: '#c0c4bb', cuff: { color: '#f4f4ee', kind: 'fur' } },
  sorrel: { color: '#a86a48', bracer: '#9a6041', cuff: { color: '#e8dcc4', kind: 'fur' } },
});
registerColorways(GLOVE_STYLES, 'kingfisher_gloves', {
  reedmace: { color: '#6a8a4a', bracer: '#5f7d42', cuff: { color: '#c9a23c', kind: 'band' } },
  stormgull: { color: '#9aa8b0', bracer: '#8c9aa2', cuff: { color: '#4e5a64', kind: 'band' } },
  sundart: { color: '#d8a03c', bracer: '#c89336', cuff: { color: '#2f7a8a', kind: 'band' } },
});
registerColorways(GLOVE_STYLES, 'cutpurse_gloves', {
  alleyrat: { color: '#5c5c56', bracer: '#53534d', cuff: { color: '#767670', kind: 'band' } },
  moonless: { color: '#33303c', bracer: '#2c2935', cuff: { color: '#4e4a5c', kind: 'band' } },
  redhand: { color: '#6e3a34', bracer: '#62342e', cuff: { color: '#8a5a4a', kind: 'band' } },
});
registerColorways(GLOVE_STYLES, 'trapline_gloves', {
  juniper: { color: '#4e6a52', bracer: '#3e5642' },
  riverclay: { color: '#96604c', bracer: '#7a4e3c' },
  nightsnare: { color: '#3e4450', bracer: '#333844', cuff: { color: '#b8c0cc', kind: 'band' } },
});
// Emberfox lots: each pelt keeps the law — dark paw, jerkin-toned
// forearm, so the sock runs unbroken up into the sleeve.
registerColorways(GLOVE_STYLES, 'emberfox_gloves', {
  silverfox: { color: '#33303a', bracer: '#8a8e96', cuff: { color: '#a4a8b0', kind: 'fur' } },
  shadowfox: { color: '#232028', bracer: '#3a3640', cuff: { color: '#4c4856', kind: 'fur' } },
  dawnfox: { color: '#6e5838', bracer: '#d8b878', cuff: { color: '#e0c890', kind: 'fur' } },
});
registerColorways(GLOVE_STYLES, 'tuskguard_gauntlets', {
  ironshod: { color: '#8d9299', bracer: '#767b84', cuff: { color: '#b0b6be', kind: 'flare' } },
  gilded: { color: '#d8ac44', bracer: '#b8902f', cuff: { color: '#f4e0a0', kind: 'flare' }, knuckle: { color: '#f4ecd8', kind: 'studs' } },
  ashen: { color: '#4a4644', bracer: '#3c3836', cuff: { color: '#6a6462', kind: 'flare' } },
});
registerColorways(GLOVE_STYLES, 'valiant_gauntlets', {
  crimson: { color: '#a83a38', bracer: '#8e302e', cuff: { color: '#e8c04c', kind: 'flare' } },
  azure: { color: '#4a5f9c', bracer: '#3e5084', cuff: { color: '#e8e4da', kind: 'flare' } },
  gilded: { color: '#d8ac44', bracer: '#b8902f', cuff: { color: '#f4e0a0', kind: 'flare' }, knuckle: { color: '#fff2c8', kind: 'plate' } },
});
registerColorways(GLOVE_STYLES, 'ramwall_gauntlets', {
  steelhorn: { color: '#b8bec8', bracer: '#a0a6b2', cuff: { color: '#c4cad4', kind: 'flare' }, knuckle: { color: '#d4dae2', kind: 'plate' } },
  goldhorn: { color: '#7a7466', bracer: '#686254', cuff: { color: '#8a8272', kind: 'flare' }, knuckle: { color: '#e8c04c', kind: 'plate' } },
  // Stormram spikes its fists like its shoulders — a structural lot.
  stormram: { color: '#3e4148', bracer: '#33363c', cuff: { color: '#4a4d56', kind: 'flare' }, knuckle: { color: '#7d8290', kind: 'spikes' } },
});
registerColorways(GLOVE_STYLES, 'briarplate_gauntlets', {
  bloodbriar: { color: '#5c3230', bracer: '#4c2a28', cuff: { color: '#744240', kind: 'band' }, knuckle: { color: '#a86a5c', kind: 'spikes' } },
  bonebriar: { color: '#b0a890', bracer: '#988f78', cuff: { color: '#c4bca4', kind: 'band' }, knuckle: { color: '#e8e0c8', kind: 'spikes' } },
  nightbriar: { color: '#38304a', bracer: '#2c2540', cuff: { color: '#4a4060', kind: 'band' }, knuckle: { color: '#8a7ab0', kind: 'spikes' } },
});
registerColorways(GLOVE_STYLES, 'sentinel_gauntlets', {
  daybreak: { color: '#cfc4a8', bracer: '#b8ac8e', cuff: { color: '#e8e2d0', kind: 'flare' }, knuckle: { color: '#d4a43c', kind: 'studs' } },
  bloodwatch: { color: '#6e3038', bracer: '#5c282e', cuff: { color: '#84424a', kind: 'flare' }, knuckle: { color: '#d8cfae', kind: 'studs' } },
  midnight: { color: '#2e3244', bracer: '#262a3a', cuff: { color: '#3c4258', kind: 'flare' }, knuckle: { color: '#aab4d0', kind: 'studs' } },
});

// ---------------------------------------------------------- resolvers

/** Unknown body item: a plain tunic in the item's color — today's read. */
export function bodyStyle(itemId: string): BodyStyle {
  const st = BODY_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a7a5f';
  return { color: c, trim: shade(c, -20), cls: 'cloth', silhouette: 'tunic', pauldron: 'none', chest: 'none', skirt: 0 };
}

/** Unknown head item: a tinted barbute — full-face even as a stand-in,
 *  because a cap reads as a placeholder (THE FORGE LAW). */
export function helmStyle(itemId: string): HelmStyle {
  const st = HELM_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8d9299';
  return { color: c, trim: shade(c, -22), kind: 'barbute' };
}

export function legStyle(itemId: string): LegStyle {
  const st = LEG_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color;
  return c ? { kind: 'pants', thigh: c } : { kind: 'pants' };
}

export function bootStyle(itemId: string): BootStyle {
  const st = BOOT_STYLES[itemId];
  if (st) return st;
  return { color: itemDef(itemId)?.color ?? '#4a3324', height: 0.08 };
}

/** Unknown glove item: a plain mitt in the item's color, strap cuff. */
export function gloveStyle(itemId: string): GloveStyle {
  const st = GLOVE_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a6a45';
  return { color: c, cuff: { color: shade(c, -20), kind: 'band' } };
}

export function offhandStyle(itemId: string): OffhandStyle {
  const st = OFFHAND_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a744a';
  // A dual-wielded weapon in the off hand paints as ITSELF, not as a
  // fallback shield — the rig routes 'weapon' to the weapon painters.
  if (itemDef(itemId)?.weapon) return { kind: 'weapon', color: c, trim: shade(c, -20) };
  return { kind: 'buckler', color: c, trim: shade(c, -20) };
}

// ------------------------------------------------------------ painters

/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
  s: number;
  /** Shoulder / waist half-widths, hip→shoulder height (local units). */
  tw: number;
  ww: number;
  th: number;
  lead: number;
  profileK: number;
  backK: number;
  hurt: boolean;
  /** Foot-lift differential — the gait beat hems sway on. */
  strideSw: number;
  /** Wall-clock ms — hem flutter, ember pulses, living details. */
  nowMs: number;
  /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
  runF: number;
  /**
   * Cloth drag in local x: the hem trails the direction of travel like
   * real cloth (screen travel, un-squashed by the caller). Signed.
   */
  dragX: number;
  /**
   * Seated blend 0..1 (the caller-smoothed sit channel). A seated robe
   * cannot hang its full length — the skirt pools on the ground.
   */
  sit?: number;
  /** Ground line under the body in torso-local units (seated drape). */
  groundY?: number;
  /** Solved knees in the torso local frame (seated knee tents). */
  seatKnees?: Array<{ x: number; y: number }>;
}

/**
 * Torso garment. Replaces the fixed tunic: the `tunic` silhouette with
 * no details is stroke-for-stroke the original body. Pauldrons are NOT
 * drawn here — they are true shoulder joints, painted in screen space
 * on the solved shoulder anchors (drawPauldron) so they ride the arms.
 */
export function drawTorsoGarment(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  f: TorsoFrame,
): void {
  const { s, tw, ww, th, hurt, nowMs, runF, backK } = f;
  const col = hurt ? '#ffffff' : st.color;
  const wide = st.silhouette === 'cuirass' ? 1.04 : 1;
  const tww = tw * wide;
  const back = backK > 0.55;
  const metal = st.metal ?? shade(st.color, -20);

  // ---- the living skirt: a full-length robe hem that DRAGS behind the
  // travel, billows as the gait becomes a run, and ripples on its own
  // clock — cloth as motion, not a static trapezoid. Legs painted
  // earlier are covered naturally; hem stays above the boots.
  if (st.skirt > 0) {
    const y0 = -0.075 * s;
    // THE SEATED POOL: a seated hip line rides a hand's width off the
    // ground, so a full-length hem hanging from it would plunge through
    // the floor. Seated, the hem pulls UP to the true ground line and
    // SPREADS around the hips — cloth tucked under the sitter, not a
    // standing tube — while the travel life calms to a resting breath.
    const seatK = f.sit ?? 0;
    const hemYHang = 0.02 * s + st.skirt * s;
    const hemY = hemYHang + ((f.groundY ?? 0) + 0.05 * s - hemYHang) * seatK;
    const hemW = ww * (1.3 + 0.65 * seatK);
    const calm = 1 - 0.85 * seatK;
    const stride = f.strideSw * 0.025 * s * calm;
    const trail = f.dragX === 0 ? 0 : Math.sign(f.dragX);
    // Five hem points, left to right; drag bows the middle hardest,
    // flutter gives each point its own beat, speed lifts the trailing
    // edge so the cloth planes out behind a sprint.
    const hem: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const bx = -hemW + u * 2 * hemW;
      const flutter =
        Math.sin(nowMs * 0.005 + i * 1.9) * 0.013 * s * (0.3 + 0.7 * runF) * calm +
        stride * Math.sin(u * Math.PI);
      const dx = f.dragX * (0.5 + 0.4 * Math.sin(u * Math.PI)) * s * calm + flutter;
      const lift =
        (runF * 0.055 * s * Math.max(0, (bx * trail) / hemW) +
          Math.abs(f.dragX) * 0.18 * s * Math.sin(u * Math.PI) * runF) *
        calm;
      // Pooled mounds: resting cloth holds FOLDS, not waves — a fixed
      // per-point undulation, no clock.
      const pool = seatK * 0.016 * s * Math.sin(i * 2.6 + 1.1);
      hem.push({ x: bx + dx, y: hemY - lift + pool });
    }
    // The underskirt: a second cloth layer swinging on a counter-phase
    // beneath the hem — layered depth is what makes a robe MAJESTIC
    // instead of a colored cone.
    if (st.underskirt && !hurt) {
      ctx.fillStyle = st.underskirt;
      ctx.beginPath();
      ctx.moveTo(-ww, y0);
      ctx.lineTo(ww, y0);
      for (let i = 4; i >= 0; i--) {
        const counter = Math.sin(nowMs * 0.005 + i * 1.9 + Math.PI) * 0.012 * s * (0.3 + 0.7 * runF);
        ctx.lineTo(hem[i]!.x * 1.06 + counter, hem[i]!.y + 0.045 * s);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww, y0);
    ctx.lineTo(ww, y0);
    for (let i = 4; i >= 0; i--) ctx.lineTo(hem[i]!.x, hem[i]!.y);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Trailing-half shade keeps the torso's x=0 form split.
      ctx.fillStyle = shade(st.color, -18);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(ww, y0);
      ctx.lineTo(hem[4]!.x, hem[4]!.y);
      ctx.lineTo(hem[3]!.x, hem[3]!.y);
      ctx.lineTo(hem[2]!.x, hem[2]!.y);
      ctx.closePath();
      ctx.fill();
      // A second, deeper fold line rides the drag — the crease that
      // says the cloth has weight.
      ctx.strokeStyle = shade(st.color, -28);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.4 + f.dragX * 0.3 * s, y0 + 0.05 * s);
      ctx.quadraticCurveTo(
        -ww * 0.3 + f.dragX * 0.5 * s,
        (y0 + hemY) / 2,
        hem[1]!.x + hemW * 0.18,
        hem[1]!.y - 0.01 * s,
      );
      ctx.stroke();
      if (st.folds) {
        // Gravity folds: a second crease on the trailing half and a
        // catch-light rising beside the deep one — hanging cloth holds
        // more than one opinion about the wind.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.013);
        ctx.beginPath();
        ctx.moveTo(ww * 0.5 + f.dragX * 0.25 * s, y0 + 0.06 * s);
        ctx.quadraticCurveTo(
          ww * 0.44 + f.dragX * 0.45 * s,
          (y0 + hemY) / 2,
          hem[3]!.x - hemW * 0.12,
          hem[3]!.y - 0.015 * s,
        );
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, 12);
        ctx.beginPath();
        ctx.moveTo(-ww * 0.22 + f.dragX * 0.3 * s, y0 + 0.055 * s);
        ctx.quadraticCurveTo(
          -ww * 0.14 + f.dragX * 0.5 * s,
          (y0 + hemY) / 2,
          hem[1]!.x + hemW * 0.32,
          hem[1]!.y - 0.014 * s,
        );
        ctx.stroke();
      }
      // Hem trim follows the moving hem points.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
      for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
      ctx.stroke();
      // Emberweave-style hems breathe: a warm pulse over the trim.
      if (st.glowTrim) {
        const pulse = 0.3 + 0.22 * Math.sin(nowMs * 0.0035);
        ctx.strokeStyle = st.glowTrim;
        ctx.globalAlpha = pulse;
        ctx.lineWidth = Math.max(2, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(hem[0]!.x, hem[0]!.y - 0.012 * s);
        for (let i = 1; i <= 4; i++) ctx.lineTo(hem[i]!.x, hem[i]!.y - 0.012 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (st.runes) {
        // Rune dashes floating just above the hem, each breathing on
        // its own phase — enchantment as punctuation, not a light show.
        ctx.strokeStyle = st.runes;
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (let i = 0; i < 4; i++) {
          const p0 = hem[i]!;
          const p1 = hem[i + 1]!;
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2 - 0.048 * s;
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(nowMs * 0.0028 + i * 1.9);
          ctx.beginPath();
          ctx.moveTo(mx, my - 0.018 * s);
          ctx.lineTo(mx, my + 0.018 * s);
          if (i % 2 === 0) {
            ctx.moveTo(mx - 0.015 * s, my - 0.004 * s);
            ctx.lineTo(mx + 0.015 * s, my - 0.004 * s);
          } else {
            ctx.moveTo(mx - 0.012 * s, my + 0.012 * s);
            ctx.lineTo(mx + 0.012 * s, my - 0.014 * s);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (st.skirtSlit && !back && seatK < 0.5) {
        // The center slit lets the stride read through the cloth —
        // pooled seated cloth has no stride, the slit closes.
        ctx.fillStyle = 'rgba(24, 15, 26, 0.55)';
        ctx.beginPath();
        ctx.moveTo(hem[2]!.x * 0.5, hemY - st.skirt * s * 0.6);
        ctx.lineTo(hem[2]!.x + 0.035 * s, hem[2]!.y);
        ctx.lineTo(hem[2]!.x - 0.035 * s, hem[2]!.y);
        ctx.closePath();
        ctx.fill();
      }
      if (back) {
        // Back panel seam — robes are tailored, front and back.
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, y0 + 0.02 * s);
        ctx.lineTo(hem[2]!.x * 0.8, hem[2]!.y - 0.02 * s);
        ctx.stroke();
      }
    }
  }

  // ---- base torso quad — the original tunic geometry.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-tww, -th);
  ctx.lineTo(tww, -th);
  ctx.lineTo(ww, 0.02 * s);
  ctx.lineTo(-ww, 0.02 * s);
  ctx.closePath();
  ctx.fill();

  if (!hurt) {
    ctx.fillStyle = shade(st.color, -18);
    ctx.beginPath();
    ctx.moveTo(0, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(ww, 0.02 * s);
    ctx.lineTo(0, 0.02 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(st.color, 14);
    ctx.beginPath();
    ctx.moveTo(-tww, -th);
    ctx.lineTo(tww, -th);
    ctx.lineTo(tww * 0.9, -th + 0.07 * s);
    ctx.lineTo(-tww * 0.9, -th + 0.07 * s);
    ctx.closePath();
    ctx.fill();

    // ---- gambeson quilting: diagonal stitch channels crossing into
    // diamonds, one value down — padding you can SEE was sewn, never a
    // texture wash.
    if (st.quilt) {
      ctx.strokeStyle = shade(st.color, -13);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const cx = i * tw * 0.52;
        ctx.moveTo(cx - tw * 0.55, -th * 0.94);
        ctx.lineTo(cx + tw * 0.55, -0.1 * s);
        ctx.moveTo(cx + tw * 0.55, -th * 0.94);
        ctx.lineTo(cx - tw * 0.55, -0.1 * s);
      }
      ctx.stroke();
    }

    // ---- gravity folds on the standing torso: creases falling from
    // the chest toward the waist with one catch-light beside the
    // deepest — the difference between a fill and a garment.
    if (st.folds) {
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.strokeStyle = shade(st.color, -22);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.55, -th * 0.62);
      ctx.quadraticCurveTo(-ww * 0.62, -th * 0.28, -ww * 0.5, -0.015 * s);
      ctx.moveTo(tww * 0.4, -th * 0.48);
      ctx.quadraticCurveTo(ww * 0.5, -th * 0.2, ww * 0.42, -0.015 * s);
      ctx.stroke();
      ctx.strokeStyle = shade(st.color, 10);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.55 + 0.016 * s, -th * 0.6);
      ctx.quadraticCurveTo(
        -ww * 0.62 + 0.016 * s, -th * 0.28,
        -ww * 0.5 + 0.016 * s, -0.015 * s,
      );
      ctx.stroke();
    }

    // ---- patches: big honest squares of mismatched cloth crossed by
    // stitch ticks — the homespun read. Every patch was a lesson.
    if (st.patches) {
      const pCol = st.patches;
      const patch = (px: number, py: number, pr: number, rot: number) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = pCol;
        ctx.fillRect(-pr, -pr, pr * 2, pr * 2);
        // Stitches straddle the patch edge, top and bottom.
        ctx.strokeStyle = shade(pCol, -26);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(i * pr * 0.55, -pr * 1.28);
          ctx.lineTo(i * pr * 0.55, -pr * 0.75);
          ctx.moveTo(i * pr * 0.55, pr * 0.75);
          ctx.lineTo(i * pr * 0.55, pr * 1.28);
        }
        ctx.stroke();
        ctx.restore();
      };
      patch(-tww * 0.48, -th * 0.46, tw * 0.29, -0.1);
      // A second patch rides the skirt, drifting with the hem drag.
      if (st.skirt > 0.2) patch(ww * 0.42 + f.dragX * 0.55 * s, 0.17 * s, tw * 0.33, 0.14);
    }

    // ---- the shoulder yoke: a contrasting panel across the upper
    // chest, worn front AND back — a yoke is construction, not
    // decoration, and construction wraps the body.
    if (st.yoke) {
      const yCol = st.yoke.color ?? shade(st.color, -14);
      const yh = th * 0.42;
      ctx.fillStyle = yCol;
      ctx.beginPath();
      ctx.moveTo(-tww, -th);
      ctx.lineTo(tww, -th);
      ctx.lineTo(tww * 0.93, -th + yh);
      ctx.lineTo(-tww * 0.93, -th + yh);
      ctx.closePath();
      ctx.fill();
      // Same one-sun form split the base torso wears.
      ctx.fillStyle = shade(yCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.lineTo(tww, -th);
      ctx.lineTo(tww * 0.93, -th + yh);
      ctx.lineTo(0, -th + yh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(yCol, 12);
      ctx.fillRect(-tww * 0.96, -th, tww * 1.92, 0.045 * s);
      if (st.yoke.stitch) {
        // Saddle stitches straddling the yoke hem — the tailor's tick.
        ctx.strokeStyle = shade(yCol, 24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sx = -tww * 0.74 + i * tww * 0.37;
          ctx.moveTo(sx, -th + yh - 0.02 * s);
          ctx.lineTo(sx + 0.018 * s, -th + yh - 0.005 * s);
        }
        ctx.stroke();
      }
    }

    // ---- front lacing: the cord that closes a jerkin, crossing an
    // open placket in fat X rungs — front only; the back is seam
    // country. Rides ON a yoke when one is worn (a laced yoke).
    if (st.lace && !back) {
      const lCol = st.lace === true ? shade(st.trim, -10) : st.lace;
      const lw = tw * 0.17;
      const y0l = -th * 0.94;
      const y1l = -th * 0.58;
      // The placket shadow: the jerkin opens a hair at the throat.
      ctx.fillStyle = shade(st.yoke ? (st.yoke.color ?? shade(st.color, -14)) : st.color, -14);
      ctx.beginPath();
      ctx.moveTo(-lw * 0.55, y0l);
      ctx.lineTo(lw * 0.55, y0l);
      ctx.lineTo(lw * 0.3, y1l);
      ctx.lineTo(-lw * 0.3, y1l);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = lCol;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const yy = y0l + ((y1l - y0l) / 2) * i;
        const w2 = lw * (0.6 - 0.18 * i);
        const dy = ((y1l - y0l) / 2) * 0.92;
        ctx.moveTo(-w2, yy);
        ctx.lineTo(w2 * 0.82, yy + dy);
        ctx.moveTo(w2, yy);
        ctx.lineTo(-w2 * 0.82, yy + dy);
      }
      ctx.stroke();
    }

    // ---- the tabard: the knight's cloth panel over the steel, painted
    // BEFORE the waist so the fauld cinches it — a surcoat is worn
    // belted, and the chest emblem rides it afterward. The back wears
    // a shorter plain panel.
    if (st.tabard) {
      const tCol = st.tabard.color;
      const half = tww * 0.56;
      const hemYt = back ? 0.09 * s : 0.155 * s;
      ctx.fillStyle = tCol;
      ctx.beginPath();
      ctx.moveTo(-half, -th * 0.94);
      ctx.lineTo(half, -th * 0.94);
      ctx.lineTo(half * 0.9, hemYt);
      ctx.lineTo(0, hemYt + 0.05 * s);
      ctx.lineTo(-half * 0.9, hemYt);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(tCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th * 0.94);
      ctx.lineTo(half, -th * 0.94);
      ctx.lineTo(half * 0.9, hemYt);
      ctx.lineTo(0, hemYt + 0.05 * s);
      ctx.closePath();
      ctx.fill();
      if (st.tabard.trim && !back) {
        ctx.strokeStyle = st.tabard.trim;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(-half * 0.9, hemYt - 0.008 * s);
        ctx.lineTo(0, hemYt + 0.042 * s);
        ctx.lineTo(half * 0.9, hemYt - 0.008 * s);
        ctx.stroke();
      }
    }

    // ---- waist: cloth belt, or the cuirass' ARTICULATED fauld — two
    // overlapping plates stepping down, a real joint instead of a band.
    if (st.silhouette === 'cuirass') {
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      chamferRect(ctx, -ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.075 * s, 0.016 * s);
      ctx.fill();
      ctx.fillStyle = metal;
      ctx.fillRect(-ww - 0.02 * s, -0.115 * s, ww * 2 + 0.04 * s, 0.018 * s);
      ctx.fillStyle = shade(st.color, -34);
      ctx.beginPath();
      chamferRect(ctx, -ww * 0.92 - 0.01 * s, -0.052 * s, ww * 1.84 + 0.02 * s, 0.062 * s, 0.014 * s);
      ctx.fill();
      // Gold edging on the champion fauld.
      if (st.trim !== metal) {
        ctx.fillStyle = st.trim;
        ctx.fillRect(-ww * 0.92, -0.052 * s, ww * 1.84, 0.012 * s);
      }
    } else if (st.belt && !st.sash) {
      // A real belt where the anonymous band was: two-tone strap,
      // buckle plate with a tongue, and a strap end swinging past it.
      const b = st.belt === true ? {} : st.belt;
      const bCol = b.color ?? shade(st.trim, -8);
      const buck = b.buckle ?? metal;
      ctx.fillStyle = bCol;
      ctx.fillRect(-ww - 0.01 * s, -0.082 * s, ww * 2 + 0.02 * s, 0.062 * s);
      ctx.fillStyle = shade(bCol, -18);
      ctx.fillRect(0, -0.082 * s, ww + 0.01 * s, 0.062 * s);
      ctx.fillStyle = shade(bCol, 14);
      ctx.fillRect(-ww - 0.01 * s, -0.082 * s, ww * 2 + 0.02 * s, 0.012 * s);
      if (!back) {
        const sway = f.strideSw * 0.014 * s;
        ctx.fillStyle = shade(bCol, -10);
        ctx.beginPath();
        ctx.moveTo(0.014 * s, -0.032 * s);
        ctx.lineTo(0.046 * s, -0.032 * s);
        ctx.lineTo(0.042 * s + sway, 0.082 * s);
        ctx.lineTo(0.008 * s + sway, 0.076 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = buck;
        ctx.beginPath();
        chamferRect(ctx, -0.036 * s, -0.094 * s, 0.072 * s, 0.078 * s, 0.014 * s);
        ctx.fill();
        ctx.fillStyle = shade(buck, -26);
        ctx.fillRect(-0.008 * s, -0.086 * s, 0.016 * s, 0.06 * s);
      }
    } else {
      ctx.fillStyle = shade(st.color, -38);
      ctx.fillRect(-ww - 0.008 * s, -0.075 * s, ww * 2 + 0.016 * s, 0.075 * s);
    }

    // ---- the sash: a wide waist band with a hip knot and two tails
    // that swing on the stride — how cloth says "belt" with feeling.
    if (st.sash) {
      const sCol = st.sash;
      ctx.fillStyle = sCol;
      ctx.fillRect(-ww - 0.01 * s, -0.092 * s, ww * 2 + 0.02 * s, 0.056 * s);
      ctx.fillStyle = shade(sCol, -16);
      ctx.fillRect(0, -0.092 * s, ww + 0.01 * s, 0.056 * s);
      const kx = f.lead * ww * 0.6;
      ctx.fillStyle = shade(sCol, 14);
      ctx.beginPath();
      chamferRect(ctx, kx - 0.032 * s, -0.104 * s, 0.064 * s, 0.062 * s, 0.016 * s);
      ctx.fill();
      const sway = f.strideSw * 0.02 * s;
      ctx.fillStyle = shade(sCol, -8);
      for (const [dx, len] of [[-0.02, 0.15], [0.024, 0.115]] as const) {
        ctx.beginPath();
        ctx.moveTo(kx + dx * s - 0.017 * s, -0.05 * s);
        ctx.lineTo(kx + dx * s + 0.017 * s, -0.05 * s);
        ctx.lineTo(kx + dx * s + 0.011 * s + sway, len * s - 0.045 * s);
        ctx.lineTo(kx + dx * s - 0.024 * s + sway, len * s - 0.05 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- waist charms: small bells hung on cords off the belt line,
    // each swinging on its own beat — jewelry that lives on the
    // garment. Front only; the back keeps its tailoring quiet.
    if (st.charms && !back) {
      const chCol = hurt ? '#ffffff' : st.charms.color;
      const hang = [
        { u: -0.42, len: 0.075, ph: 0.9 },
        { u: 0.12, len: 0.095, ph: 2.1 },
        { u: f.lead * 0.62, len: 0.065, ph: 3.4 },
      ];
      for (const b of hang) {
        const bx0 = b.u * ww;
        const sway =
          f.strideSw * 0.014 * s +
          Math.sin(nowMs * 0.004 + b.ph) * 0.006 * s * (0.4 + 0.6 * runF);
        const by = -0.02 * s + b.len * s;
        // The cord.
        ctx.strokeStyle = shade(chCol, -24);
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(bx0, -0.03 * s);
        ctx.lineTo(bx0 + sway, by);
        ctx.stroke();
        // The bell: a small flared cup with a lit lip and a clapper
        // dot below — drawn fat enough to survive world zoom.
        const bx = bx0 + sway;
        ctx.fillStyle = chCol;
        ctx.beginPath();
        ctx.moveTo(bx - 0.016 * s, by);
        ctx.quadraticCurveTo(bx, by - 0.02 * s, bx + 0.016 * s, by);
        ctx.lineTo(bx + 0.024 * s, by + 0.026 * s);
        ctx.lineTo(bx - 0.024 * s, by + 0.026 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(chCol, -22);
        ctx.fillRect(bx - 0.024 * s, by + 0.02 * s, 0.048 * s, 0.008 * s);
        ctx.fillStyle = shade(chCol, 26);
        ctx.beginPath();
        ctx.arc(bx, by + 0.036 * s, 0.008 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- tassets: hip plates hanging off the fauld, swinging a hair
    // with the stride — the heavy knight keeps armor below the waist.
    if (st.tassets) {
      const sway = f.strideSw * 0.015 * s;
      for (const es of [-1, 1]) {
        const hx = es * ww * 0.78;
        ctx.fillStyle = es === f.lead ? shade(metal, -4) : shade(metal, -20);
        ctx.beginPath();
        ctx.moveTo(hx - 0.062 * s, 0.0 * s);
        ctx.lineTo(hx + 0.062 * s, 0.0 * s);
        ctx.lineTo(hx + 0.046 * s + es * sway, 0.115 * s);
        ctx.lineTo(hx - 0.046 * s + es * sway, 0.115 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(metal, es === f.lead ? 16 : -8);
        ctx.fillRect(hx - 0.052 * s, 0.008 * s, 0.104 * s, 0.016 * s);
      }
    }

    // ---- the mantle: a layered shoulder cope draping over the chest —
    // the garment-over-garment read that says HIGH wizardry. Its point
    // drapes lower in front; from behind it reads as a clean yoke.
    if (st.mantle) {
      const mCol = st.mantle;
      const drop = back ? th * 0.34 : th * 0.48;
      ctx.fillStyle = mCol;
      ctx.beginPath();
      ctx.moveTo(-tww * 1.02, -th);
      ctx.lineTo(tww * 1.02, -th);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.lineTo(-tww * 0.72, -th + drop * 0.72);
      ctx.closePath();
      ctx.fill();
      // Trailing-half shade keeps the mantle in the same light.
      ctx.fillStyle = shade(mCol, -16);
      ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.lineTo(tww * 1.02, -th);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.closePath();
      ctx.fill();
      // Trim edge along the drape + a clasp at the throat, front only.
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(-tww * 0.72, -th + drop * 0.72);
      ctx.lineTo(0, -th + drop);
      ctx.lineTo(tww * 0.72, -th + drop * 0.72);
      ctx.stroke();
      if (!back) {
        ctx.fillStyle = st.glowTrim ?? st.trim;
        ctx.beginPath();
        ctx.moveTo(0, -th + 0.015 * s);
        ctx.lineTo(0.024 * s, -th + 0.048 * s);
        ctx.lineTo(0, -th + 0.08 * s);
        ctx.lineTo(-0.024 * s, -th + 0.048 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- the capelet: a short shoulder cape with a SHAPED hem — the
    // layered garment for stories the wizard cope doesn't tell.
    // scallop = foam and feather covers, point = leaf tips, dag =
    // storm pennons. One path, filled then clipped for the form split.
    if (st.capelet) {
      const cCol = st.capelet.color ?? shade(st.color, -10);
      const cTrim = st.capelet.trim ?? st.trim;
      const drop = th * (back ? 0.32 : 0.4);
      const half = tww * 1.04;
      const hemKind = st.capelet.hem;
      const segs = 4;
      const pts: Array<[number, number]> = [];
      for (let i = segs; i >= 0; i--) {
        const u = i / segs;
        pts.push([-half + u * 2 * half, -th + drop * (0.84 + 0.16 * Math.sin(u * Math.PI))]);
      }
      const traceHem = () => {
        for (let k = 1; k < pts.length; k++) {
          const [px0, py0] = pts[k - 1]!;
          const [px1, py1] = pts[k]!;
          const mx = (px0 + px1) / 2;
          const my = (py0 + py1) / 2 + drop * 0.32;
          if (hemKind === 'scallop') ctx.quadraticCurveTo(mx, my, px1, py1);
          else if (hemKind === 'point') { ctx.lineTo(mx, my); ctx.lineTo(px1, py1); }
          else { ctx.lineTo(mx + (px1 - px0) * 0.16, my); ctx.lineTo(px1, py1); }
        }
      };
      const shape = () => {
        ctx.beginPath();
        ctx.moveTo(-half, -th);
        ctx.lineTo(half, -th);
        ctx.lineTo(pts[0]![0], pts[0]![1]);
        traceHem();
        ctx.closePath();
      };
      shape();
      ctx.fillStyle = cCol;
      ctx.fill();
      ctx.save();
      shape();
      ctx.clip();
      ctx.fillStyle = shade(cCol, -16);
      ctx.fillRect(0, -th, half, drop * 1.8);
      ctx.fillStyle = shade(cCol, 12);
      ctx.fillRect(-half, -th, half * 2, 0.045 * s);
      ctx.restore();
      // Trim traces only the shaped hem, never the shoulder line.
      ctx.strokeStyle = cTrim;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      traceHem();
      ctx.stroke();
    }

    // ---- collar: the neck joint that ties helmet to breastplate.
    if (st.collar === 'gorget') {
      ctx.fillStyle = metal;
      ctx.beginPath();
      chamferRect(ctx, -tw * 0.42, -th - 0.028 * s, tw * 0.84, 0.05 * s, 0.014 * s);
      ctx.fill();
      ctx.fillStyle = shade(metal, -22);
      ctx.fillRect(-tw * 0.42, -th + 0.012 * s, tw * 0.84, 0.012 * s);
    } else if (st.collar === 'fur') {
      // A lumpy fur ruff across the shoulder line — the huntsman read.
      ctx.fillStyle = shade(st.trim, 34);
      for (let i = 0; i < 5; i++) {
        const u = -1 + i * 0.5;
        const r = (0.045 + 0.012 * Math.sin(i * 2.7)) * s;
        ctx.beginPath();
        ctx.arc(u * tw * 0.82, -th + 0.012 * s + Math.sin(i * 1.9) * 0.008 * s, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- the stole: two ordained bands falling from the shoulders
    // past the belt, tick-marked at their ends; from behind they read
    // as short tabs crossing the shoulders — the vestment wraps.
    if (st.stole) {
      const sCol = st.stole.color ?? shade(st.color, -16);
      const sTrim = st.stole.trim ?? st.trim;
      const bw = tw * 0.24;
      const len = back ? th * 0.28 : th + 0.13 * s;
      const sway = f.strideSw * 0.012 * s;
      for (const es of [-1, 1]) {
        const bx = es * tw * 0.5;
        ctx.fillStyle = es === f.lead ? sCol : shade(sCol, -12);
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, -th);
        ctx.lineTo(bx + bw / 2, -th);
        ctx.lineTo(bx + bw / 2 + es * sway, -th + len);
        ctx.lineTo(bx - bw / 2 + es * sway, -th + len);
        ctx.closePath();
        ctx.fill();
        if (!back) {
          // The embroidered end: a hem bar plus a small upright tick.
          ctx.strokeStyle = sTrim;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(bx - bw / 2 + es * sway, -th + len - 0.026 * s);
          ctx.lineTo(bx + bw / 2 + es * sway, -th + len - 0.026 * s);
          ctx.moveTo(bx, -th + len * 0.6);
          ctx.lineTo(bx, -th + len * 0.6 - 0.03 * s);
          ctx.stroke();
        }
      }
    }

    if (st.silhouette === 'brigandine') {
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (const yk of [0.62, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(-tw * 0.92, -th * yk);
        ctx.lineTo(tw * 0.92, -th * yk);
        ctx.stroke();
      }
      ctx.fillStyle = metal;
      for (const yk of [0.62, 0.4]) {
        for (const xk of [-0.6, 0, 0.6]) {
          ctx.fillRect(tw * xk - 0.008 * s, -th * yk - 0.008 * s, 0.016 * s, 0.016 * s);
        }
      }
    }

    // ---- scale coat: overlapping scallop rows wrapping the whole
    // torso — a scale coat has no front or back, only more scales.
    // Each row overlaps the one below; the lit crescent on every
    // scallop is what makes it read as metal-on-leather, not polka dots.
    if (st.chest === 'scales') {
      // Scales are BODY-toned rows with metal only as thin lit
      // crescents — the leather stays the identity color; gold-filled
      // scallops turned the whole torso into stripes (v1 verdict).
      const rows = 4;
      const perRow = 4;
      const y0s = -th * 0.88;
      const y1s = -0.14 * s;
      const rowH = (y1s - y0s) / (rows - 1);
      const sr = tw * 0.22;
      const span = tw * 0.78;
      for (let r = 0; r < rows; r++) {
        const yy = y0s + r * rowH;
        const off = (r % 2) * sr;
        ctx.fillStyle = shade(st.color, r % 2 === 0 ? -10 : -20);
        ctx.beginPath();
        for (let i = 0; i < perRow; i++) {
          const sx = -span + off + i * sr * 2;
          if (sx - sr > span || sx + sr < -span) continue;
          ctx.moveTo(sx + sr, yy);
          ctx.arc(sx, yy, sr, 0, Math.PI);
        }
        ctx.fill();
        // The copper crescent riding each scallop's crown.
        ctx.strokeStyle = shade(metal, 8);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        for (let i = 0; i < perRow; i++) {
          const sx = -span + off + i * sr * 2;
          if (sx > span || sx < -span) continue;
          ctx.moveTo(sx - sr * 0.55, yy + sr * 0.3);
          ctx.quadraticCurveTo(sx, yy + sr * 0.66, sx + sr * 0.55, yy + sr * 0.3);
        }
        ctx.stroke();
      }
    }

    // ---- diamondback hide: the adder's pattern worn as a coat — ONE
    // bold band of big diamonds across the belly, wrapping the whole
    // torso (a skin has no front or back). One row is a hide; a field
    // of small ones is a sweater (v1 verdict).
    if (st.chest === 'diamondhide') {
      const yy = -th * 0.52;
      const dw = tw * 0.44;
      const dh = th * 0.22;
      // The band's own ground: a darker strip seats the diamonds.
      ctx.fillStyle = shade(st.color, -8);
      ctx.fillRect(-tw * 0.98, yy - dh, tw * 1.96, dh * 2);
      ctx.fillStyle = shade(st.trim, -2);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const dx = i * dw * 2;
        if (dx - dw > tw * 0.98 || dx + dw < -tw * 0.98) continue;
        ctx.moveTo(dx, yy - dh);
        ctx.lineTo(dx + dw, yy);
        ctx.lineTo(dx, yy + dh);
        ctx.lineTo(dx - dw, yy);
        ctx.closePath();
      }
      ctx.fill();
      // The pale keel: one stitch line across each diamond's waist,
      // and a bright rim on the band's edges — hide, sewn on.
      ctx.strokeStyle = shade(st.color, 22);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const dx = i * dw * 2;
        if (dx > tw * 0.98 || dx < -tw * 0.98) continue;
        ctx.moveTo(dx - dw * 0.45, yy);
        ctx.lineTo(dx + dw * 0.45, yy);
      }
      ctx.moveTo(-tw * 0.96, yy - dh);
      ctx.lineTo(tw * 0.96, yy - dh);
      ctx.moveTo(-tw * 0.96, yy + dh);
      ctx.lineTo(tw * 0.96, yy + dh);
      ctx.stroke();
    }

    // ---- binding cords: silk wraps crossing the torso both ways and
    // cinching at the sternum knot — the spider's own thread, worn
    // back at it. Front and back both carry the cross (a wrap that
    // vanished on turn would break the garment).
    if (st.cords) {
      const cCol = hurt ? '#ffffff' : st.cords.color;
      ctx.strokeStyle = cCol;
      ctx.lineWidth = Math.max(2, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.78, -th * 0.96);
      ctx.lineTo(ww * 0.6, -0.09 * s);
      ctx.moveTo(tw * 0.78, -th * 0.96);
      ctx.lineTo(-ww * 0.6, -0.09 * s);
      ctx.stroke();
      // The under-shadow that seats the cords ON the leather.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.78, -th * 0.96 + 0.02 * s);
      ctx.lineTo(ww * 0.6, -0.09 * s + 0.02 * s);
      ctx.moveTo(tw * 0.78, -th * 0.96 + 0.02 * s);
      ctx.lineTo(-ww * 0.6, -0.09 * s + 0.02 * s);
      ctx.stroke();
      if (!back) {
        // The sternum knot: a wound button of silk where they cross.
        ctx.fillStyle = shade(cCol, -10);
        ctx.beginPath();
        ctx.arc(0, -th * 0.52, 0.034 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shade(cCol, 18);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.arc(0, -th * 0.52, 0.021 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ---- buckskin fringe: leather strips swinging off the chest yoke,
    // kicked by the stride — motion the plainest jerkin can afford.
    if (st.fringe) {
      const yokeY = -th * 0.52;
      ctx.strokeStyle = shade(st.trim, -6);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.86, yokeY - 0.012 * s);
      ctx.lineTo(tw * 0.86, yokeY - 0.012 * s);
      for (let i = 0; i < 6; i++) {
        const u = -0.78 + i * 0.312;
        const len = (0.082 + 0.018 * Math.sin(i * 2.3)) * s;
        const kick =
          f.strideSw * 0.016 * s * (0.4 + 0.6 * Math.abs(u)) +
          Math.sin(nowMs * 0.004 + i * 1.7) * 0.007 * s * (0.3 + 0.7 * runF);
        ctx.moveTo(u * tw, yokeY);
        ctx.lineTo(u * tw + kick, yokeY + len);
      }
      ctx.stroke();
    }

    // ---- front and back are DIFFERENT garments: chest marks face the
    // camera; turn around and you get backplates, crossed straps, seams.
    if (!back) {
      if (st.chest === 'straps') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.96);
        ctx.lineTo(ww * 0.5, -0.1 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-tw * 0.16, -th * 0.55, 0.03 * s, 0.03 * s);
      } else if (st.chest === 'plate' && !st.tabard) {
        ctx.fillStyle = metal;
        ctx.beginPath();
        chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
        ctx.fill();
        ctx.fillStyle = shade(metal, 16);
        ctx.fillRect(-tw * 0.52, -th * 0.86, tw * 1.04, th * 0.1);
        // Rivets pin the breastplate at its corners.
        ctx.fillStyle = shade(metal, -26);
        for (const rx of [-tw * 0.42, tw * 0.42]) {
          ctx.fillRect(rx - 0.008 * s, -th * 0.82, 0.016 * s, 0.016 * s);
          ctx.fillRect(rx - 0.008 * s, -th * 0.42, 0.016 * s, 0.016 * s);
        }
        if (st.midline) {
          // The forge crease: two hammered halves joined down the
          // center — dark seam, catch-light along its east side.
          ctx.strokeStyle = shade(metal, -20);
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(0, -th * 0.84);
          ctx.lineTo(0, -th * 0.36);
          ctx.stroke();
          ctx.strokeStyle = shade(metal, 18);
          ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath();
          ctx.moveTo(0.014 * s, -th * 0.83);
          ctx.lineTo(0.014 * s, -th * 0.37);
          ctx.stroke();
        }
        if (st.rivetSeams) {
          // Seam the plate: a border stroke plus mid-edge rivets
          // joining the corner set — boilerwork, every plate PINNED.
          // Each rivet is a dark seat with a lit dome cap: a BUMP,
          // never a hole.
          ctx.strokeStyle = shade(metal, -16);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          chamferRect(ctx, -tw * 0.52, -th * 0.86, tw * 1.04, th * 0.52, 0.035 * s);
          ctx.stroke();
          const rivets: Array<[number, number]> = [
            [0, -th * 0.855], [0, -th * 0.36],
            [-tw * 0.51, -th * 0.62], [tw * 0.51, -th * 0.62],
          ];
          ctx.fillStyle = shade(metal, -26);
          for (const [rx, ry] of rivets) {
            ctx.fillRect(rx - 0.008 * s, ry - 0.008 * s, 0.016 * s, 0.016 * s);
          }
          ctx.fillStyle = shade(metal, 22);
          for (const [rx, ry] of rivets) {
            ctx.fillRect(rx - 0.008 * s, ry - 0.008 * s, 0.008 * s, 0.008 * s);
          }
        }
        if (st.ribs) {
          // Bone inlay: three lapped ivory arcs riding the plate, each
          // seated by a dark line beneath — the barrow-king wears his
          // ribs on the outside, and every arc is FAT enough to read
          // as inlay, never as scratches.
          const bCol = st.ribs.color;
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const ry = -th * (0.74 - i * 0.15);
            const rw2 = tw * (0.44 - i * 0.05);
            ctx.strokeStyle = shade(bCol, -30);
            ctx.lineWidth = Math.max(2, s * 0.03);
            ctx.beginPath();
            ctx.moveTo(-rw2, ry - th * 0.02);
            ctx.quadraticCurveTo(0, ry + th * 0.1, rw2, ry - th * 0.02);
            ctx.stroke();
            ctx.strokeStyle = bCol;
            ctx.lineWidth = Math.max(1.5, s * 0.024);
            ctx.beginPath();
            ctx.moveTo(-rw2, ry - th * 0.03);
            ctx.quadraticCurveTo(0, ry + th * 0.09, rw2, ry - th * 0.03);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
        if (st.ridges) {
          // Gothic fluting: three channels hammered down the plate,
          // converging toward the waist — each a shadow stroke with a
          // catch-light beside it, both FAT enough to survive world
          // zoom (hairline fluting reads as scratches, not smithing).
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          for (const rx of [-0.26, 0, 0.26]) {
            ctx.strokeStyle = shade(metal, -22);
            ctx.beginPath();
            ctx.moveTo(tw * rx, -th * 0.8);
            ctx.lineTo(tw * rx * 0.55, -th * 0.4);
            ctx.stroke();
            ctx.strokeStyle = shade(metal, 22);
            ctx.beginPath();
            ctx.moveTo(tw * rx + 0.016 * s, -th * 0.8);
            ctx.lineTo(tw * rx * 0.55 + 0.016 * s, -th * 0.4);
            ctx.stroke();
          }
        }
      } else if (st.chest === 'stitch') {
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.98);
        ctx.lineTo(0, -0.09 * s);
        ctx.stroke();
        // Rope belt knot — the apprentice's whole budget.
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(0, -0.04 * s, 0.022 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (st.emblem && (st.chest === 'emblem' || st.chest === 'plate')) {
        ctx.fillStyle = st.trim;
        // A mantle or capelet claims the upper chest — the emblem sits
        // below the layered garment, never behind its hem.
        const ey = -th * (st.mantle || st.capelet ? 0.3 : 0.58);
        const r = tw * 0.3 * (st.emblemScale ?? 1);
        if (st.emblem === 'skull') {
          // The dread device: a grinning skull etched into the plate —
          // drawn large; a timid skull is no skull at all.
          const rs = r * 1.45;
          ctx.beginPath();
          ctx.arc(0, ey - rs * 0.12, rs * 0.5, Math.PI * 0.95, Math.PI * 2.05);
          ctx.lineTo(rs * 0.34, ey + rs * 0.42);
          ctx.lineTo(-rs * 0.34, ey + rs * 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          for (const exx of [-rs * 0.22, rs * 0.22]) {
            ctx.fillRect(exx - rs * 0.12, ey - rs * 0.24, rs * 0.24, rs * 0.26);
          }
          ctx.fillRect(-rs * 0.055, ey + rs * 0.12, rs * 0.11, rs * 0.18);
        } else if (st.emblem === 'sun') {
          // The radiant device: a core diamond ringed by eight rays —
          // drawn large; a timid sun is a freckle.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(r * 0.5, ey);
          ctx.lineTo(0, ey + r * 0.6);
          ctx.lineTo(-r * 0.5, ey);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = st.trim;
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.moveTo(Math.cos(a) * r * 0.72, ey + Math.sin(a) * r * 0.72);
            ctx.lineTo(Math.cos(a) * r * 1.12, ey + Math.sin(a) * r * 1.12);
          }
          ctx.stroke();
        } else if (st.emblem === 'leaf') {
          // The warden device: a single leaf with its center vein —
          // drawn large; a timid leaf reads as lint.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.8);
          ctx.quadraticCurveTo(r * 0.72, ey - r * 0.14, 0, ey + r * 0.8);
          ctx.quadraticCurveTo(-r * 0.72, ey - r * 0.14, 0, ey - r * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -24);
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(0, ey + r * 0.6);
          ctx.stroke();
        } else if (st.emblem === 'star') {
          // The celestial device: a four-point star with two pinprick
          // companions — a constellation, not a logo.
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.75);
          ctx.lineTo(r * 0.17, ey - r * 0.17);
          ctx.lineTo(r * 0.58, ey);
          ctx.lineTo(r * 0.17, ey + r * 0.17);
          ctx.lineTo(0, ey + r * 0.75);
          ctx.lineTo(-r * 0.17, ey + r * 0.17);
          ctx.lineTo(-r * 0.58, ey);
          ctx.lineTo(-r * 0.17, ey - r * 0.17);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(r * 0.48, ey - r * 0.66, 0.018 * s, 0.018 * s);
          ctx.fillRect(-r * 0.68, ey + r * 0.46, 0.018 * s, 0.018 * s);
        } else if (st.emblem === 'moon') {
          // The tide device: a waxing crescent, horns to the right —
          // drawn large; a timid device is no device at all.
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.82, -Math.PI * 0.5, Math.PI * 0.5, false);
          ctx.arc(r * 0.34, ey, r * 0.66, Math.PI * 0.5, -Math.PI * 0.5, true);
          ctx.closePath();
          ctx.fill();
        } else if (st.emblem === 'eye') {
          // The arcane device: an unblinking almond eye. It reads back.
          ctx.beginPath();
          ctx.moveTo(-r * 0.88, ey);
          ctx.quadraticCurveTo(0, ey - r * 0.7, r * 0.88, ey);
          ctx.quadraticCurveTo(0, ey + r * 0.7, -r * 0.88, ey);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.27, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.trim, 34);
          ctx.fillRect(r * 0.05, ey - r * 0.2, 0.018 * s, 0.018 * s);
        } else if (st.emblem === 'moth') {
          // The moth device: four broad wing lobes about a slender body,
          // eye-spots in shadow — drawn WIDE; a timid moth is a smudge.
          const rw = r * 1.35;
          for (const sx of [-1, 1]) {
            // Upper lobe: big, swept up and out.
            ctx.beginPath();
            ctx.moveTo(sx * r * 0.06, ey - r * 0.14);
            ctx.quadraticCurveTo(sx * rw * 0.55, ey - r * 1.3, sx * rw, ey - r * 0.5);
            ctx.quadraticCurveTo(sx * rw * 0.6, ey + r * 0.04, sx * r * 0.06, ey + r * 0.08);
            ctx.closePath();
            ctx.fill();
            // Lower lobe: smaller, hanging.
            ctx.beginPath();
            ctx.moveTo(sx * r * 0.08, ey + r * 0.1);
            ctx.quadraticCurveTo(sx * rw * 0.62, ey + r * 0.3, sx * rw * 0.5, ey + r * 0.85);
            ctx.quadraticCurveTo(sx * r * 0.2, ey + r * 0.8, sx * r * 0.06, ey + r * 0.26);
            ctx.closePath();
            ctx.fill();
          }
          // Eye-spots on the upper wings.
          ctx.fillStyle = shade(st.color, -28);
          for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(sx * rw * 0.58, ey - r * 0.55, r * 0.19, 0, Math.PI * 2);
            ctx.fill();
          }
          // The body: a slender taper, antennae curling off the head.
          ctx.fillStyle = shade(st.trim, -22);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.6);
          ctx.lineTo(r * 0.11, ey + r * 0.15);
          ctx.lineTo(0, ey + r * 0.75);
          ctx.lineTo(-r * 0.11, ey + r * 0.15);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -22);
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.moveTo(0, ey - r * 0.55);
          ctx.quadraticCurveTo(r * 0.22, ey - r * 0.95, r * 0.4, ey - r * 1.15);
          ctx.moveTo(0, ey - r * 0.55);
          ctx.quadraticCurveTo(-r * 0.22, ey - r * 0.95, -r * 0.4, ey - r * 1.15);
          ctx.stroke();
        } else if (st.emblem === 'bullhead') {
          // The pasture device: a broad horn sweep over a square
          // muzzle — drawn WIDE; a timid bull is a goat. Horns are fat
          // round-cap arcs, the muzzle a solid block with dark
          // nostril punches.
          const rb = r * 1.3;
          ctx.strokeStyle = st.trim;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2.5, s * 0.042);
          ctx.beginPath();
          ctx.moveTo(-rb * 0.24, ey + rb * 0.1);
          ctx.quadraticCurveTo(-rb * 0.95, ey + rb * 0.02, -rb * 0.78, ey - rb * 0.72);
          ctx.moveTo(rb * 0.24, ey + rb * 0.1);
          ctx.quadraticCurveTo(rb * 0.95, ey + rb * 0.02, rb * 0.78, ey - rb * 0.72);
          ctx.stroke();
          ctx.lineCap = 'butt';
          ctx.fillStyle = st.trim;
          ctx.beginPath();
          chamferRect(ctx, -rb * 0.3, ey - rb * 0.18, rb * 0.6, rb * 0.62, rb * 0.12);
          ctx.fill();
          ctx.fillStyle = '#1c1722';
          ctx.fillRect(-rb * 0.17, ey + rb * 0.2, rb * 0.11, rb * 0.14);
          ctx.fillRect(rb * 0.06, ey + rb * 0.2, rb * 0.11, rb * 0.14);
        } else if (st.emblem === 'coin') {
          // The thief's device: one fat brass coin over the heart —
          // rim, punched square hole, a glint that never sleeps.
          // Drawn large; a timid coin is a button.
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.95, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = shade(st.trim, -22);
          ctx.lineWidth = Math.max(1.5, s * 0.02);
          ctx.beginPath();
          ctx.arc(0, ey, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#1c1722';
          ctx.fillRect(-r * 0.19, ey - r * 0.19, r * 0.38, r * 0.38);
          ctx.fillStyle = shade(st.trim, 34);
          ctx.fillRect(r * 0.4, ey - r * 0.62, 0.024 * s, 0.024 * s);
        } else {
        ctx.beginPath();
        if (st.emblem === 'chevron') {
          // The breast-band device: drawn WIDE and deep — a timid
          // chevron is a crumb (the kingfisher's whole chest is orange).
          const rc = r * 1.5;
          ctx.moveTo(-rc, ey - rc * 0.45);
          ctx.lineTo(0, ey + rc * 0.62);
          ctx.lineTo(rc, ey - rc * 0.45);
          ctx.lineTo(rc * 0.52, ey - rc * 0.72);
          ctx.lineTo(0, ey - rc * 0.05);
          ctx.lineTo(-rc * 0.52, ey - rc * 0.72);
        } else if (st.emblem === 'diamond') {
          ctx.moveTo(0, ey - r * 0.7);
          ctx.lineTo(r * 0.6, ey);
          ctx.lineTo(0, ey + r * 0.7);
          ctx.lineTo(-r * 0.6, ey);
        } else {
          ctx.moveTo(r * 0.25, ey - r * 0.75);
          ctx.lineTo(-r * 0.3, ey + r * 0.1);
          ctx.lineTo(r * 0.02, ey + r * 0.1);
          ctx.lineTo(-r * 0.25, ey + r * 0.8);
          ctx.lineTo(r * 0.35, ey - r * 0.12);
          ctx.lineTo(r * 0.02, ey - r * 0.12);
        }
        ctx.closePath();
        ctx.fill();
        }
      }
    } else {
      if (st.silhouette === 'cuirass' && !st.tabard) {
        // Backplate: spine ridge + shoulder-blade facets + strap line.
        ctx.fillStyle = shade(st.color, -16);
        ctx.fillRect(-0.014 * s, -th * 0.96, 0.028 * s, th * 0.88);
        ctx.fillStyle = shade(st.color, 8);
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          chamferRect(ctx, sx * tw * 0.52 - tw * 0.26, -th * 0.84, tw * 0.52, th * 0.34, 0.03 * s);
          ctx.fill();
        }
        ctx.fillStyle = shade(metal, -18);
        ctx.fillRect(-tww * 0.9, -th * 0.44, tww * 1.8, 0.016 * s);
      } else if (st.chest === 'straps' || st.silhouette === 'brigandine') {
        // Crossed back straps + buckle — how a jerkin actually closes.
        ctx.strokeStyle = shade(st.trim, -6);
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(-tw * 0.7, -th * 0.94);
        ctx.lineTo(tw * 0.55, -0.11 * s);
        ctx.moveTo(tw * 0.7, -th * 0.94);
        ctx.lineTo(-tw * 0.55, -0.11 * s);
        ctx.stroke();
        ctx.fillStyle = metal;
        ctx.fillRect(-0.016 * s, -th * 0.52, 0.032 * s, 0.032 * s);
      } else if (st.silhouette === 'robe') {
        ctx.strokeStyle = shade(st.color, -24);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, -th * 0.95);
        ctx.lineTo(0, -0.08 * s);
        ctx.stroke();
      }
    }

    // ---- the bandolier: a shoulder-to-hip cord toggled with bone —
    // the trapline worn as clothing. Front and back both carry it; a
    // strap that vanished when you turned would break the garment.
    if (st.bandolier) {
      const bone = hurt ? '#ffffff' : '#d8cfae';
      ctx.strokeStyle = hurt ? '#ffffff' : st.bandolier;
      ctx.lineWidth = Math.max(2.5, s * 0.048);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.74, -th * 0.94);
      ctx.lineTo(ww * 0.56, -0.07 * s);
      ctx.stroke();
      if (!back) {
        // Three bone toggles riding the cord, each a fat crossbar —
        // timid toggles read as lint on the strap.
        ctx.fillStyle = bone;
        for (let i = 0; i < 3; i++) {
          const u = 0.24 + i * 0.26;
          const bxx = -tw * 0.74 + (ww * 0.56 + tw * 0.74) * u;
          const byy = -th * 0.94 + (th * 0.94 - 0.07 * s) * u;
          ctx.save();
          ctx.translate(bxx, byy);
          ctx.rotate(-0.65);
          ctx.fillRect(-0.011 * s, -0.036 * s, 0.022 * s, 0.072 * s);
          ctx.restore();
        }
      }
    }

    // ---- the brush tail: a fox trophy swinging off the trailing hip,
    // kicked by the stride like the fringe — the pelt still has an
    // opinion about being worn.
    if (st.tail) {
      const u = -f.lead;
      const bx = u * ww * 0.82;
      const kick =
        f.strideSw * 0.022 * s +
        Math.sin(nowMs * 0.0035) * 0.009 * s * (0.3 + 0.7 * runF) +
        f.dragX * 0.5 * s;
      const tipX = bx + u * 0.055 * s + kick;
      const tipY = 0.27 * s;
      ctx.fillStyle = hurt ? '#ffffff' : st.tail.color;
      ctx.beginPath();
      ctx.moveTo(bx - 0.02 * s, -0.03 * s);
      // Fat through the middle, tapering to the tip — a brush, not a rope.
      ctx.quadraticCurveTo(bx - 0.055 * s + kick * 0.5, 0.16 * s, tipX - 0.012 * s, tipY);
      ctx.lineTo(tipX + 0.012 * s, tipY);
      ctx.quadraticCurveTo(bx + 0.055 * s + kick * 0.5, 0.16 * s, bx + 0.02 * s, -0.03 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The pale tip: the last third dips in cream.
        ctx.fillStyle = st.tail.tip;
        ctx.beginPath();
        ctx.moveTo(bx - 0.045 * s + kick * 0.72, 0.165 * s);
        ctx.quadraticCurveTo(bx - 0.04 * s + kick * 0.86, 0.225 * s, tipX - 0.012 * s, tipY);
        ctx.lineTo(tipX + 0.012 * s, tipY);
        ctx.quadraticCurveTo(bx + 0.045 * s + kick * 0.86, 0.215 * s, bx + 0.045 * s + kick * 0.72, 0.155 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- the belt pouch: gear you LIVE out of, riding the lead hip.
    if (st.pouch && !back) {
      const pxx = f.lead * ww * 0.72;
      ctx.fillStyle = shade(st.trim, 10);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.038 * s, -0.055 * s, 0.076 * s, 0.075 * s, 0.018 * s);
      ctx.fill();
      ctx.fillStyle = shade(st.trim, -14);
      ctx.beginPath();
      chamferRect(ctx, pxx - 0.042 * s, -0.06 * s, 0.084 * s, 0.032 * s, 0.014 * s);
      ctx.fill();
    }

    // ---- the aura: three magic motes drifting slowly up the robe,
    // each on its own phase, fading in and out — quiet power, never a
    // particle storm. Deterministic from the clock alone.
    if (st.motes) {
      ctx.fillStyle = st.motes;
      for (let i = 0; i < 3; i++) {
        const ph = nowMs * 0.00042 + i * 0.37;
        const cyc = ph - Math.floor(ph);
        const a = Math.sin(cyc * Math.PI) * 0.55;
        if (a <= 0.03) continue;
        const mx = Math.sin(i * 2.4 + Math.floor(ph) * 1.7) * ww * 1.5;
        // Motes are born at the hem — seated, the hem is the POOL, so
        // they rise from the pooled cloth, never from under the floor.
        const born = 0.05 * s + st.skirt * s;
        const moteK = f.sit ?? 0;
        const myBase = born + ((f.groundY ?? 0) + 0.05 * s - born) * moteK;
        const my = myBase - cyc * (th + st.skirt * s) * 0.9;
        const r = (0.016 + 0.006 * Math.sin(i * 5.1)) * s;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(mx, my - r * 1.4);
        ctx.lineTo(mx + r, my);
        ctx.lineTo(mx, my + r * 1.4);
        ctx.lineTo(mx - r, my);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- seated knee tents: a raised knee lifts the robe's front into
  // a cloth peak — the skirt drapes OVER the leg instead of the shin
  // punching bare through the pooled hem. Painted last: the tented
  // cloth is the nearest layer of the whole garment (it covers the
  // lower torso exactly as a knee held to the chest does). Facing away
  // the legs live behind the torso and the back panel hides them.
  const seatK = f.sit ?? 0;
  if (st.skirt > 0 && seatK > 0.35 && f.seatKnees && !back) {
    const gy = (f.groundY ?? 0) + 0.05 * s;
    const a = Math.min(1, (seatK - 0.35) / 0.4);
    for (const kn of f.seatKnees) {
      const peakY = kn.y - 0.02 * s;
      // A low knee (the lounger's stretch) stays under the pool; only
      // a genuinely raised knee tents the cloth.
      if (peakY > gy - 0.1 * s) continue;
      if (Math.abs(kn.x) > ww * 2.6) continue;
      const bw = 0.115 * s;
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(kn.x - bw, gy);
      ctx.quadraticCurveTo(kn.x - bw * 0.55, peakY + 0.02 * s, kn.x, peakY);
      ctx.quadraticCurveTo(kn.x + bw * 0.55, peakY + 0.02 * s, kn.x + bw, gy);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The trailing face folds dark; the ridge line catches light —
        // the same one-cut shading the hanging skirt lives by.
        ctx.fillStyle = shade(st.color, -18);
        ctx.beginPath();
        ctx.moveTo(kn.x, peakY);
        ctx.quadraticCurveTo(kn.x + bw * 0.55, peakY + 0.02 * s, kn.x + bw, gy);
        ctx.lineTo(kn.x, gy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, 12);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(kn.x - bw * 0.72, gy - (gy - peakY) * 0.35);
        ctx.quadraticCurveTo(kn.x - bw * 0.3, peakY + 0.016 * s, kn.x, peakY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * A pauldron as a real shoulder JOINT: painted in screen space on the
 * solved shoulder anchor, after its arm, so it caps the arm root and
 * rides swings instead of staying glued to the torso corners. `side`
 * is the outward direction sign; `squashK` is the body's facing squash.
 */
export function drawPauldron(
  ctx: CanvasRenderingContext2D,
  st: BodyStyle,
  x: number,
  y: number,
  side: number,
  s: number,
  squashK: number,
  hurt: boolean,
  near: boolean,
  nowMs = 0,
): void {
  if (st.pauldron === 'none') return;
  const base = st.pauldronColor ?? st.metal ?? shade(st.color, -14);
  const col = hurt ? '#ffffff' : near ? shade(base, 8) : shade(base, -12);
  ctx.save();
  ctx.translate(x, y - 0.035 * s);
  ctx.scale(Math.max(0.55, squashK), 1);
  if (st.pauldron === 'orbs') {
    // A conjured orb in patient orbit over each shoulder — floating,
    // never mounted; the gap between orb and shoulder IS the magic.
    // Pushed OUTWARD past the skull silhouette: the head paints after
    // the pauldrons, so an orb hovering straight up simply vanishes.
    const bob = Math.sin(nowMs * 0.0021 + side * 1.3) * 0.014 * s;
    const ox = side * 0.14 * s;
    const oy = -0.095 * s + bob;
    const orx = 0.072 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ox, oy, orx, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // Shadowed underside + a hard glint — a sphere, not a dot.
      ctx.fillStyle = shade(base, -22);
      ctx.beginPath();
      ctx.arc(ox, oy, orx, Math.PI * 0.12, Math.PI * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(base, 38);
      ctx.beginPath();
      ctx.arc(ox - orx * 0.32, oy - orx * 0.34, orx * 0.27, 0, Math.PI * 2);
      ctx.fill();
      // One trailing spark falling out of the orbit.
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(nowMs * 0.003 + side * 2.1);
      ctx.fillStyle = shade(base, 20);
      const spy = oy + orx + 0.03 * s;
      ctx.beginPath();
      ctx.moveTo(ox, spy - 0.013 * s);
      ctx.lineTo(ox + 0.01 * s, spy);
      ctx.lineTo(ox, spy + 0.013 * s);
      ctx.lineTo(ox - 0.01 * s, spy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'shards') {
    // Night-glass slivers in orbit where an orb would hang — angular
    // where the orb is serene, each pane tilted like it was broken
    // off something larger. Same outward-offset law as the orbs: the
    // head paints after the pauldrons.
    const bob = Math.sin(nowMs * 0.0019 + side * 1.7) * 0.012 * s;
    const ox = side * 0.145 * s;
    const oy = -0.1 * s + bob;
    const glint = st.pauldronTrim ?? shade(base, 55);
    const pane = (px: number, py: number, w: number, h: number, tilt: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt * side);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(-w * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        // The ONE bright thing: a hard lit edge down the leading face.
        ctx.strokeStyle = glint;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.92);
        ctx.lineTo(w * 0.92, 0);
        ctx.stroke();
      }
      ctx.restore();
    };
    pane(ox, oy, 0.052 * s, 0.085 * s, 0.28);
    pane(ox + side * 0.055 * s, oy + 0.055 * s + bob * 0.4, 0.032 * s, 0.05 * s, -0.35);
    ctx.restore();
    return;
  }
  if (st.pauldron === 'fur') {
    // A fur mantle over the shoulder: a dark under-row of tufts with a
    // lit row riding on top — mass first, texture second. Lumpy on
    // purpose; fur that lines up stops being fur.
    for (let i = 0; i < 4; i++) {
      const u = -0.9 + i * 0.6;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, -18);
      ctx.beginPath();
      ctx.arc(u * 0.085 * s, 0.012 * s + Math.sin(i * 2.1) * 0.01 * s, (0.052 + 0.012 * Math.sin(i * 3.3)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const u = -0.62 + i * 0.62;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, near ? 14 : -2);
      ctx.beginPath();
      ctx.arc(u * 0.085 * s, -0.028 * s + Math.sin(i * 1.7) * 0.008 * s, (0.048 + 0.01 * Math.sin(i * 2.6)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!hurt) {
      // A few guard-hair strokes flicking off the outer edge.
      ctx.strokeStyle = shade(base, 22);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const bx = side * (0.06 + i * 0.028) * s;
        const by = (-0.05 + i * 0.024) * s;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + side * 0.038 * s, by - 0.03 * s);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'feathered') {
    // A feathered mantle: three blades fanning off the shoulder, from
    // an upswept crown feather to a drooping cover feather — a wing at
    // rest, not a wing in flight.
    const tips: Array<[number, number, number, number, number, number]> = [
      // [baseX, baseY, ctrlX, ctrlY, tipX, tipY] — outward = +x, ×side.
      [0.0, -0.05, 0.15, -0.155, 0.235, -0.185],
      [0.015, -0.022, 0.175, -0.065, 0.25, -0.05],
      [0.028, 0.01, 0.165, 0.025, 0.225, 0.09],
    ];
    for (let i = 0; i < 3; i++) {
      const [bx, by, cx, cy, txx, tyy] = tips[i]!;
      ctx.fillStyle = hurt ? '#ffffff' : shade(base, (near ? 16 : 2) - i * 14);
      ctx.beginPath();
      ctx.moveTo(side * bx * s, by * s);
      ctx.quadraticCurveTo(side * cx * s, cy * s, side * txx * s, tyy * s);
      ctx.quadraticCurveTo(side * (cx + 0.01) * s, (cy + 0.055) * s, side * (bx + 0.02) * s, (by + 0.06) * s);
      ctx.closePath();
      ctx.fill();
    }
    if (!hurt) {
      // The crown feather's spine — one stroke sells the anatomy.
      ctx.strokeStyle = shade(base, -22);
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.moveTo(side * 0.02 * s, -0.028 * s);
      ctx.quadraticCurveTo(side * 0.13 * s, -0.1 * s, side * 0.19 * s, -0.145 * s);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (st.pauldron === 'layered') {
    // Three lames stepping down the arm — articulation you can read.
    for (let i = 0; i < 3; i++) {
      const w = 0.105 * s * (1 - i * 0.16);
      const yy = -0.02 * s + i * 0.038 * s;
      ctx.fillStyle = hurt ? '#ffffff' : shade(col, -i * 8);
      ctx.beginPath();
      chamferRect(ctx, -w + side * i * 0.012 * s, yy, w * 2, 0.042 * s, 0.014 * s);
      ctx.fill();
    }
    if (!hurt) {
      ctx.fillStyle = shade(col, 18);
      ctx.fillRect(-0.08 * s, -0.016 * s, 0.16 * s, 0.014 * s);
    }
  } else {
    // Dome cap over the deltoid, flat base, lit crown, dark rim.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-0.105 * s, 0.045 * s);
    ctx.quadraticCurveTo(-0.115 * s, -0.05 * s, 0, -0.062 * s);
    ctx.quadraticCurveTo(0.115 * s, -0.05 * s, 0.105 * s, 0.045 * s);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = shade(col, 18);
      ctx.beginPath();
      ctx.moveTo(-0.07 * s, -0.028 * s);
      ctx.quadraticCurveTo(0, -0.055 * s, 0.07 * s, -0.028 * s);
      ctx.lineTo(0.06 * s, -0.008 * s);
      ctx.quadraticCurveTo(0, -0.03 * s, -0.06 * s, -0.008 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(col, -24);
      ctx.fillRect(-0.1 * s, 0.038 * s, 0.2 * s, 0.014 * s);
      if (st.pauldron === 'spiked') {
        // A fan of spikes off the crown — one is a soldier, three are a
        // warlord. Outermost is longest; each rides its own base point.
        const n = Math.max(1, Math.min(3, st.pauldronSpikes ?? 1));
        const tips: Array<[number, number, number, number]> = [
          [0.06, -0.03, 0.16, -0.09],
          [0.0, -0.05, 0.035, -0.13],
          [-0.05, -0.04, -0.1, -0.1],
        ];
        ctx.fillStyle = col;
        for (let i = 0; i < n; i++) {
          const [bx, by, txx, tyy] = tips[i]!;
          ctx.beginPath();
          ctx.moveTo(side * bx * s, by * s);
          ctx.lineTo(side * txx * s, tyy * s);
          ctx.lineTo(side * (bx + 0.038) * s, (by + 0.032) * s);
          ctx.closePath();
          ctx.fill();
        }
      } else if (st.pauldron === 'bladed') {
        // A swept blade-wing rising off the shoulder — the hero cut.
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(side * 0.015 * s, -0.052 * s);
        ctx.quadraticCurveTo(side * 0.15 * s, -0.095 * s, side * 0.205 * s, -0.21 * s);
        ctx.quadraticCurveTo(side * 0.125 * s, -0.125 * s, side * 0.078 * s, -0.018 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = st.pauldronTrim ?? shade(col, 24);
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(side * 0.03 * s, -0.058 * s);
        ctx.quadraticCurveTo(side * 0.145 * s, -0.1 * s, side * 0.195 * s, -0.2 * s);
        ctx.stroke();
      }
      if (st.pauldronTrim && st.pauldron !== 'bladed') {
        // Bright edging along the dome rim — the gilded read.
        ctx.strokeStyle = st.pauldronTrim;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(-0.098 * s, 0.036 * s);
        ctx.quadraticCurveTo(-0.108 * s, -0.048 * s, 0, -0.058 * s);
        ctx.quadraticCurveTo(0.108 * s, -0.048 * s, 0.098 * s, 0.036 * s);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  headR: number;
  fx: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  /** Wall-clock ms — hat-tip sway, living micro-motion. */
  nowMs: number;
}

/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
export function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void {
  const { s, headX, headY, hw, hh, cut, headR, fx, profileK, backK, lead, hurt } = f;
  const mc = hurt ? '#ffffff' : st.color;

  if (st.halo && !hurt) {
    // The floating ring: hovers on its own slow clock, never touching
    // the crown, with one glint sliding around the rim. Works at every
    // facing because a ring has no face to lose.
    const hy = headY - hh * 1.55 + Math.sin(f.nowMs * 0.0017) * hh * 0.06;
    ctx.strokeStyle = st.halo.color;
    ctx.lineWidth = Math.max(1.5, s * 0.022);
    ctx.beginPath();
    ctx.ellipse(headX, hy, hw * 0.92, hh * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    const ga = f.nowMs * 0.0011;
    ctx.fillStyle = shade(st.halo.color, 34);
    ctx.beginPath();
    ctx.arc(headX + Math.cos(ga) * hw * 0.92, hy + Math.sin(ga) * hh * 0.2, s * 0.016, 0, Math.PI * 2);
    ctx.fill();
  }

  if (st.shards && !hurt) {
    // The rift's answer to a halo: three slivers of night glass riding
    // above the crown, the tall one centered, each on its own slow
    // bob. Nothing holds them; the gap IS the wonder. Centered on the
    // skull axis, so like the halo they never lose a face.
    const sCol = st.shards.color;
    const glint = shade(sCol, 58);
    const sliver = (u: number, w: number, h: number, ph: number) => {
      const px = headX + u * hw;
      const py =
        headY - hh * 1.5 - h * 0.5 + Math.sin(f.nowMs * 0.0016 + ph) * hh * 0.07;
      ctx.fillStyle = sCol;
      ctx.beginPath();
      ctx.moveTo(px, py - h);
      ctx.lineTo(px + w, py);
      ctx.lineTo(px, py + h);
      ctx.lineTo(px - w * 0.55, py);
      ctx.closePath();
      ctx.fill();
      // The one bright edge — the same law the riftglass blade obeys.
      ctx.strokeStyle = glint;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(px, py - h * 0.9);
      ctx.lineTo(px + w * 0.9, py);
      ctx.stroke();
    };
    sliver(0, hw * 0.16, hh * 0.34, 0);
    sliver(-0.62, hw * 0.12, hh * 0.22, 2.2);
    sliver(0.6, hw * 0.11, hh * 0.2, 4.1);
  }

  if (st.kind === 'wizard') {
    // THE wizard hat, done properly: a broad down-turned brim, a CHUNKY
    // crown that tapers with gentle concave sides, and the top third
    // slumping over into a BLUNT, thick, rounded tip — mass through the
    // whole bend, never a pinched wisp. The slump breathes on a slow
    // clock so the hat is quietly alive. A cone has no face to lose, so
    // the silhouette holds at every one of the 360 facings.
    const bandY = headY - hh * 0.55;
    const u = -lead; // the bend direction: the crown slumps trailing
    const sway = Math.sin(f.nowMs * 0.0019) * hw * 0.07;
    const tipX = headX + u * (hw * 1.02 + sway);
    const tipY = bandY - hh * 1.42;
    ctx.fillStyle = mc;
    ctx.beginPath();
    // Windward edge: base → concave climb → over the crown apex.
    ctx.moveTo(headX - u * hw * 0.92, bandY);
    ctx.quadraticCurveTo(headX - u * hw * 0.5, bandY - hh * 0.95, headX - u * hw * 0.14, bandY - hh * 1.52);
    // Over the slump to the tip's upper shoulder — thickness held.
    ctx.quadraticCurveTo(headX + u * hw * 0.28, bandY - hh * 1.86, tipX, tipY - hh * 0.3);
    // The BLUNT tip: a rounded end cap, not a point.
    ctx.quadraticCurveTo(tipX + u * hw * 0.26, tipY - hh * 0.12, tipX + u * hw * 0.08, tipY + hh * 0.12);
    // Underside of the slump back into the crown.
    ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.28, headX + u * hw * 0.62, bandY - hh * 0.85);
    // Bend-side edge down to the base.
    ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.4, headX + u * hw * 0.92, bandY);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Hard-shade the bend side — the slump's own shadow half.
      ctx.fillStyle = shade(st.color, -16);
      ctx.beginPath();
      ctx.moveTo(headX, bandY);
      ctx.quadraticCurveTo(headX + u * hw * 0.05, bandY - hh * 0.9, headX - u * hw * 0.02, bandY - hh * 1.45);
      ctx.quadraticCurveTo(headX + u * hw * 0.3, bandY - hh * 1.78, tipX, tipY - hh * 0.28);
      ctx.quadraticCurveTo(tipX + u * hw * 0.24, tipY - hh * 0.1, tipX + u * hw * 0.08, tipY + hh * 0.1);
      ctx.quadraticCurveTo(headX + u * hw * 0.5, bandY - hh * 1.26, headX + u * hw * 0.62, bandY - hh * 0.84);
      ctx.quadraticCurveTo(headX + u * hw * 0.8, bandY - hh * 0.4, headX + u * hw * 0.92, bandY);
      ctx.closePath();
      ctx.fill();
      // The crown's lit ridge — the plane the light actually catches.
      ctx.strokeStyle = shade(st.color, 18);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(headX - u * hw * 0.3, bandY - hh * 0.5);
      ctx.quadraticCurveTo(headX - u * hw * 0.08, bandY - hh * 1.2, headX + u * hw * 0.22, bandY - hh * 1.62);
      ctx.stroke();
      // One soft crease under the slump sells the cloth's weight.
      ctx.strokeStyle = shade(st.color, -26);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.16, bandY - hh * 1.32);
      ctx.quadraticCurveTo(headX + u * hw * 0.46, bandY - hh * 1.4, tipX - u * hw * 0.14, tipY);
      ctx.stroke();
    }
    // The broad brim, softly down-turned at the edges: a shallow arc
    // slab rather than a flat ellipse — the silhouette that says
    // "weathered wizard", lit on top, shadowed beneath.
    ctx.fillStyle = hurt ? '#ffffff' : shade(st.color, 6);
    ctx.beginPath();
    ctx.moveTo(headX - hw * 1.95, bandY + hh * 0.18);
    ctx.quadraticCurveTo(headX - hw * 1.2, bandY - hh * 0.22, headX, bandY - hh * 0.24);
    ctx.quadraticCurveTo(headX + hw * 1.2, bandY - hh * 0.22, headX + hw * 1.95, bandY + hh * 0.18);
    ctx.quadraticCurveTo(headX + hw * 1.3, bandY + hh * 0.34, headX, bandY + hh * 0.36);
    ctx.quadraticCurveTo(headX - hw * 1.3, bandY + hh * 0.34, headX - hw * 1.95, bandY + hh * 0.18);
    ctx.closePath();
    ctx.fill();
    if (!hurt) {
      // Brim underside shadow.
      ctx.fillStyle = shade(st.color, -24);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 1.8, bandY + hh * 0.2);
      ctx.quadraticCurveTo(headX, bandY + hh * 0.42, headX + hw * 1.8, bandY + hh * 0.2);
      ctx.quadraticCurveTo(headX + hw * 1.2, bandY + hh * 0.32, headX, bandY + hh * 0.34);
      ctx.quadraticCurveTo(headX - hw * 1.2, bandY + hh * 0.32, headX - hw * 1.8, bandY + hh * 0.2);
      ctx.closePath();
      ctx.fill();
      // Band + charm buckle above the brim, tracking the face.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 0.8, bandY - hh * 0.42, hw * 1.6, hh * 0.22);
      if (backK <= 0.55 && st.charm) {
        const bxx = headX + fx * headR * 0.36;
        ctx.fillStyle = st.charm;
        ctx.beginPath();
        chamferRect(ctx, bxx - headR * 0.09, bandY - hh * 0.46, headR * 0.18, headR * 0.26, headR * 0.05);
        ctx.fill();
      }
      // A single faint star winks near the tip — the aura, whispered.
      const wink = 0.25 + 0.45 * Math.max(0, Math.sin(f.nowMs * 0.0016 + 1.2));
      ctx.globalAlpha = wink;
      ctx.fillStyle = st.charm ?? '#e8d06a';
      const sxx = tipX + u * hw * 0.34;
      const syy = tipY - hh * 0.5;
      ctx.beginPath();
      ctx.moveTo(sxx, syy - hh * 0.12);
      ctx.lineTo(sxx + hw * 0.08, syy);
      ctx.lineTo(sxx, syy + hh * 0.12);
      ctx.lineTo(sxx - hw * 0.08, syy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return;
  }

  if (st.kind === 'circlet') {
    // A brow band + center gem over the hair — hair stays visible.
    ctx.fillStyle = mc;
    ctx.fillRect(headX - hw * 1.02, headY - hh * 0.62, hw * 2.04, headR * 0.18);
    if (!hurt && backK <= 0.55) {
      ctx.fillStyle = st.trim;
      const gx = headX + fx * headR * 0.36;
      ctx.beginPath();
      chamferRect(ctx, gx - headR * 0.11, headY - hh * 0.68, headR * 0.22, headR * 0.24, headR * 0.06);
      ctx.fill();
    }
    return;
  }

  if (st.kind === 'hood') {
    // A TRUE cowl: one continuous shell that owns the whole skull —
    // crown, cheeks and jaw — with the face opening cut clean through
    // it (even-odd), so from the front only the face shows. The shell
    // is asymmetric with the facing: the leading edge hugs the brow
    // while the trailing side swells into the swept-back volume every
    // hood hangs from; at profile that swell becomes the classic peak
    // and the opening narrows to a leading-edge window. The back band
    // closes the opening entirely and hangs the drape tail. One shape
    // grammar, three reads, no bolted-on side curtains.
    const t = profileK;
    const front = backK <= 0.55;
    // The face opening tracks the face bands exactly like the eyes do.
    const cx = headX + fx * headR * 0.34;
    const ohw = hw * 0.74 * (1 - 0.45 * t);
    const oTop = headY - hh * 0.6;
    const oBot = headY + hh * 0.84;
    const shell = () => {
      ctx.moveTo(headX + lead * hw * 1.26, headY + hh * 1.2);
      // Leading edge: hugs the brow line up and over.
      ctx.quadraticCurveTo(headX + lead * hw * 1.32, headY + hh * 0.2, headX + lead * hw * 1.14, headY - hh * 0.55);
      ctx.quadraticCurveTo(headX + lead * hw * 1.05, headY - hh * 1.28, headX + lead * hw * 0.3, headY - hh * 1.34);
      // Crown into the trailing swell — the swept-back drape, deepening
      // toward profile into the classic hood peak.
      ctx.quadraticCurveTo(headX - lead * hw * (0.95 + t * 0.45), headY - hh * 1.38, headX - lead * hw * (1.18 + t * 0.55), headY - hh * 0.62);
      ctx.quadraticCurveTo(headX - lead * hw * (1.32 + t * 0.5), headY + hh * 0.15, headX - lead * hw * 1.3, headY + hh * 1.2);
      // The hem sags onto the shoulders — the cowl becomes a mantle.
      ctx.quadraticCurveTo(headX, headY + hh * 1.44, headX + lead * hw * 1.26, headY + hh * 1.2);
      ctx.closePath();
    };
    const opening = () => {
      chamferRect(ctx, cx - ohw, oTop, ohw * 2, oBot - oTop, cut * 0.8);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    if (front) opening();
    ctx.fill('evenodd');
    if (!hurt) {
      // Cloth planes, clipped to the shell — the hole in the clip keeps
      // every shading pass off the face automatically.
      ctx.save();
      ctx.beginPath();
      shell();
      if (front) opening();
      ctx.clip('evenodd');
      // Trailing-half shade — the same split the torso lives by.
      ctx.fillStyle = shade(st.color, -13);
      ctx.fillRect(lead === 1 ? headX - hw * 2.4 : headX, headY - hh * 1.6, hw * 2.4, hh * 3.2);
      // The crown's lit fold.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.72, headY - hh * 0.78);
      ctx.quadraticCurveTo(headX, headY - hh * 1.52, headX + hw * 0.72, headY - hh * 0.78);
      ctx.stroke();
      // One crease down the trailing side — cloth remembers gravity.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(headX - lead * hw * 0.55, headY - hh * 1.1);
      ctx.quadraticCurveTo(headX - lead * hw * (0.9 + t * 0.3), headY - hh * 0.2, headX - lead * hw * 0.85, headY + hh * 0.9);
      ctx.stroke();
      ctx.restore();
      if (front) {
        // The opening reads as depth: shadow just inside the rim, the
        // rolled hem edge on it, and the trim bar across the brow.
        ctx.strokeStyle = 'rgba(24, 15, 26, 0.32)';
        ctx.lineWidth = Math.max(2, s * 0.034);
        ctx.beginPath();
        chamferRect(ctx, cx - ohw + s * 0.012, oTop + s * 0.012, (ohw - s * 0.012) * 2, oBot - oTop - s * 0.024, cut * 0.7);
        ctx.stroke();
        ctx.strokeStyle = shade(st.color, 20);
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        opening();
        ctx.stroke();
        ctx.fillStyle = st.trim;
        ctx.fillRect(cx - ohw * 0.98, oTop - headR * 0.05, ohw * 1.96, headR * 0.1);
        if (st.gem) {
          // A cut gem at the brow, tracking the face like the eyes do.
          const gx = headX + fx * headR * 0.36;
          ctx.fillStyle = st.gem.color;
          ctx.beginPath();
          ctx.moveTo(gx, headY - hh * 0.8);
          ctx.lineTo(gx + headR * 0.1, headY - hh * 0.62);
          ctx.lineTo(gx, headY - hh * 0.44);
          ctx.lineTo(gx - headR * 0.1, headY - hh * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(st.gem.color, 36);
          ctx.fillRect(gx - headR * 0.03, headY - hh * 0.74, headR * 0.06, headR * 0.06);
        }
        if (st.fangs) {
          // The adder's own: two dry fangs hanging at the mouth of the
          // opening, points down, each seated in a dark root so they
          // read as SEWN ON, not painted. Fat enough to survive zoom.
          const fCol = st.fangs.color;
          for (const es of [-1, 1]) {
            const fxx = cx + es * ohw * 0.55;
            const fw = headR * 0.09;
            const fl = hh * 0.3;
            ctx.fillStyle = shade(fCol, -28);
            ctx.fillRect(fxx - fw * 0.7, oTop - headR * 0.02, fw * 1.4, headR * 0.07);
            ctx.fillStyle = fCol;
            ctx.beginPath();
            ctx.moveTo(fxx - fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + es * fw * 0.2, oTop + fl);
            ctx.closePath();
            ctx.fill();
            // The curve's shadow side — a fang is round, not flat.
            ctx.fillStyle = shade(fCol, -16);
            ctx.beginPath();
            ctx.moveTo(fxx + es * fw * 0.6, oTop + headR * 0.04);
            ctx.lineTo(fxx + es * fw * 0.2, oTop + fl);
            ctx.lineTo(fxx + es * fw * 0.05, oTop + fl * 0.55);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (st.blooms) {
          // Moonbell blooms tucked at the leading temple: two bell
          // flowers nodding off short arced stems, mouths down — the
          // meadow picked and worn. The far one sits smaller.
          const bCol = st.blooms.color;
          const bx0 = cx + lead * ohw * 0.92;
          const by0 = oTop - headR * 0.02;
          ctx.strokeStyle = shade(st.color, 26);
          ctx.lineWidth = Math.max(1, s * 0.012);
          const bloom = (bx: number, by: number, r: number, nod: number) => {
            // Stem first, arcing up and over.
            ctx.beginPath();
            ctx.moveTo(bx - lead * r * 1.6, by + r * 0.8);
            ctx.quadraticCurveTo(bx - lead * r * 0.4, by - r * 2.2, bx, by - r * 0.9);
            ctx.stroke();
            // The bell: flared cup hanging mouth-down, lip scalloped.
            ctx.fillStyle = bCol;
            ctx.beginPath();
            ctx.moveTo(bx - r * 0.55, by - r * 0.9);
            ctx.quadraticCurveTo(bx, by - r * 1.5, bx + r * 0.55, by - r * 0.9);
            ctx.lineTo(bx + r * 0.8 + nod, by + r * 0.5);
            ctx.quadraticCurveTo(bx + nod, by + r * 0.15, bx - r * 0.8 + nod, by + r * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shade(bCol, -18);
            ctx.beginPath();
            ctx.moveTo(bx + nod, by + r * 0.28);
            ctx.lineTo(bx + r * 0.8 + nod, by + r * 0.5);
            ctx.quadraticCurveTo(bx + nod, by + r * 0.15, bx - r * 0.8 + nod, by + r * 0.5);
            ctx.closePath();
            ctx.fill();
          };
          bloom(bx0, by0 - headR * 0.1, headR * 0.2, headR * 0.03);
          bloom(bx0 - lead * headR * 0.3, by0 - headR * 0.28, headR * 0.14, -headR * 0.02);
        }
      } else {
        // From behind, the drape tail: the point every hood hangs from.
        ctx.fillStyle = shade(st.color, -10);
        ctx.beginPath();
        ctx.moveTo(headX - hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + hw * 0.36, headY + hh * 0.9);
        ctx.lineTo(headX + lead * hw * 0.1, headY + hh * 1.95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shade(st.color, -22);
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(headX, headY - hh * 1.05);
        ctx.lineTo(headX + lead * hw * 0.08, headY + hh * 0.85);
        ctx.stroke();
      }
    }
    if (st.antlers && !hurt) {
      // Branched antlers off the crown: one main beam each side with
      // two tines, stroked round so they read as bone, not wire. The
      // far beam narrows with the facing like the far eye.
      ctx.strokeStyle = st.antlers.color;
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const bx = headX + es * hw * 0.62;
        const by = headY - hh * 0.95;
        const mx = bx + es * hw * 0.55 * wK;
        const my = by - hh * 0.62;
        const txx = bx + es * hw * 1.3 * wK;
        const tyy = by - hh * 1.35;
        ctx.lineWidth = Math.max(2, s * 0.032);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(mx, my, txx, tyy);
        ctx.stroke();
        ctx.lineWidth = Math.max(1.5, s * 0.024);
        ctx.beginPath();
        ctx.moveTo(bx + es * hw * 0.3 * wK, by - hh * 0.38);
        ctx.lineTo(bx + es * hw * 0.16 * wK, by - hh * 0.95);
        ctx.moveTo(bx + es * hw * 0.88 * wK, by - hh * 0.95);
        ctx.lineTo(bx + es * hw * 0.78 * wK, by - hh * 1.5);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    if (st.ears && !hurt) {
      // Pricked ears on the crown; dark inner ear when frontal. The
      // tall variant is the hare: long upright blades, a touch closer
      // to center. A tip color claims the top third — hare and fox
      // ears alike are black-tipped, and the tip is what sells them.
      const tall = st.ears.tall ? 1.75 : 1;
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const bx = headX + es * hw * (st.ears.tall ? 0.46 : 0.58);
        const by = headY - hh * 1.02;
        const ax = bx + es * hw * 0.14 * wK;
        const ay = by - hh * 0.62 * tall;
        ctx.fillStyle = st.ears.color;
        ctx.beginPath();
        ctx.moveTo(bx - es * hw * 0.26 * wK, by);
        ctx.lineTo(ax, ay);
        ctx.lineTo(bx + es * hw * 0.36 * wK, by + hh * 0.06);
        ctx.closePath();
        ctx.fill();
        if (st.ears.tip) {
          // The tip triangle: apex down 35% of each edge — a clean
          // color break, never a stroked outline.
          ctx.fillStyle = st.ears.tip;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - es * hw * 0.26 * wK - ax) * 0.35, ay + (by - ay) * 0.35);
          ctx.lineTo(ax + (bx + es * hw * 0.36 * wK - ax) * 0.35, ay + (by + hh * 0.06 - ay) * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        if (backK <= 0.55) {
          ctx.fillStyle = shade(st.ears.color, -26);
          ctx.beginPath();
          ctx.moveTo(bx - es * hw * 0.1 * wK, by - hh * 0.04);
          ctx.lineTo(bx + es * hw * 0.12 * wK, by - hh * 0.42 * tall);
          ctx.lineTo(bx + es * hw * 0.22 * wK, by);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    if (st.antennae && !hurt) {
      // Moth antennae: two bold curled feelers off the crown with
      // clubbed tips, swaying on their own clock — thin reads as wire,
      // so these are stroked fat and round-capped.
      ctx.strokeStyle = st.antennae.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      const sway = Math.sin(f.nowMs * 0.0031) * hw * 0.05;
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.35, 1 - profileK * 0.6) : 1;
        const bx = headX + es * hw * 0.34;
        const by = headY - hh * 1.0;
        const txx = bx + es * hw * 0.72 * wK + sway * es;
        const tyy = by - hh * 0.98;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + es * hw * 0.05 * wK, by - hh * 0.75, txx, tyy);
        ctx.stroke();
        ctx.fillStyle = st.antennae.color;
        ctx.beginPath();
        ctx.arc(txx, tyy, hw * 0.11 * (far ? wK : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineCap = 'butt';
    }
    if (st.ruff && !hurt) {
      // A lumpy fur ruff. From the front it RINGS THE FACE OPENING —
      // fur trim on the cowl's hem, framing the face in winter; from
      // behind it stays a band across the crown of the hood.
      ctx.fillStyle = st.ruff.color;
      if (front) {
        // Across the brow hem, hugging the opening's top edge.
        for (let i = 0; i < 5; i++) {
          const u = -1 + i * 0.5;
          const r = (0.05 + 0.013 * Math.sin(i * 2.7)) * hw * 2;
          ctx.beginPath();
          ctx.arc(cx + u * ohw * 1.02, oTop + Math.sin(i * 1.9) * hh * 0.05, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Down the opening's sides, past the cheeks.
        for (const es of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + es * ohw * 1.05, headY + hh * 0.05, hw * 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(st.ruff.color, -14);
          ctx.beginPath();
          ctx.arc(cx + es * ohw * 1.02, headY + hh * 0.52, hw * 0.13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = st.ruff.color;
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const u = -1 + i * 0.5;
          const r = (0.05 + 0.013 * Math.sin(i * 2.7)) * hw * 2;
          ctx.beginPath();
          ctx.arc(headX + u * hw * 0.88, headY - hh * 0.92 + Math.sin(i * 1.9) * hh * 0.06, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (st.feather && !hurt) {
      // One swept feather tucked at the temple, trailing behind the
      // travel — the scout's whole heraldry. A BROAD vane with a pale
      // spine; a thin feather reads as a wire (the fins-v1 verdict).
      const u = -lead;
      const bx = headX + u * hw * 0.5;
      const by = headY - hh * 0.85;
      const sway = Math.sin(f.nowMs * 0.0023) * hw * 0.07;
      const txx = bx + u * hw * 1.5 + sway;
      const tyy = by - hh * 1.15;
      ctx.fillStyle = st.feather.color;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.12);
      // Upper vane edge: over the crown to the tip.
      ctx.quadraticCurveTo(bx + u * hw * 0.5, by - hh * 0.95, txx, tyy);
      // Lower vane edge: back beneath the spine, fat in the middle.
      ctx.quadraticCurveTo(bx + u * hw * 0.85, by - hh * 0.28, bx + u * hw * 0.16, by + hh * 0.22);
      ctx.closePath();
      ctx.fill();
      // Trailing-half shade splits the vane along the spine.
      ctx.fillStyle = shade(st.feather.color, -16);
      ctx.beginPath();
      ctx.moveTo(bx + u * hw * 0.1, by + hh * 0.1);
      ctx.quadraticCurveTo(bx + u * hw * 0.75, by - hh * 0.52, txx, tyy);
      ctx.quadraticCurveTo(bx + u * hw * 0.85, by - hh * 0.28, bx + u * hw * 0.16, by + hh * 0.22);
      ctx.closePath();
      ctx.fill();
      // The pale spine — one stroke sells the anatomy.
      ctx.strokeStyle = shade(st.feather.color, 30);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bx + u * hw * 0.08, by + hh * 0.06);
      ctx.quadraticCurveTo(bx + u * hw * 0.72, by - hh * 0.55, txx - u * hw * 0.08, tyy + hh * 0.06);
      ctx.stroke();
    }
    if (st.mask && !hurt && backK <= 0.55) {
      // The half-mask: a kerchief over the lower face, pointed at the
      // chin. Eyes stay the character's; the rest belongs to the job.
      const mw = hw * 0.78 * (1 - profileK * 0.25);
      const mx = headX + fx * headR * 0.18;
      ctx.fillStyle = st.mask;
      ctx.beginPath();
      ctx.moveTo(mx - mw, headY + hh * 0.18);
      ctx.lineTo(mx + mw, headY + hh * 0.18);
      ctx.lineTo(mx + mw * 0.72, headY + hh * 0.6);
      ctx.lineTo(mx, headY + hh * 0.82);
      ctx.lineTo(mx - mw * 0.72, headY + hh * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(st.mask, 16);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(mx - mw, headY + hh * 0.2);
      ctx.lineTo(mx + mw, headY + hh * 0.2);
      ctx.stroke();
    }
    return;
  }

  // ---- THE FORGE LAW: every metal helm is FULL-FACE — it owns the
  // crown, the cheeks, the jaw AND the face. The old open caps are
  // gone; a cap reads as a placeholder, a helm reads as a hero. Each
  // kind forges its own shell below, then the shared furniture
  // vocabulary (horns, fins, wings, crest, spikes, tusks, plume)
  // bolts onto whichever shell it was made for.
  const ld = lead || 1; // icon frames pass lead 0 — forge a facing
  const vx = headX + fx * headR * 0.36; // the pairX law: the face anchor
  const sw = 1 - profileK * 0.45; // face furniture squashes at profile
  const front = backK <= 0.55;
  // The DEPTH-PASS light, clipped to the shell: the same screen-fixed
  // x=0 form split the bare head wears — trailing half in shade, lit
  // crown, jaw in under-shade — so all steel stands under ONE sun.
  const shellLight = (shell: () => void, topY: number, botY: number): void => {
    if (hurt) return;
    ctx.save();
    ctx.beginPath();
    shell();
    ctx.clip();
    ctx.fillStyle = shade(st.color, -10);
    ctx.fillRect(headX, topY - hh, hw * 3, botY - topY + hh * 2.4);
    ctx.fillStyle = shade(st.color, 15);
    ctx.fillRect(headX - hw * 1.4, topY, hw * 2.8, hh * 0.28);
    ctx.fillStyle = shade(st.color, -20);
    ctx.fillRect(headX - hw * 1.4, botY - hh * 0.2, hw * 2.8, hh * 0.6);
    ctx.restore();
  };

  if (st.kind === 'greathelm' || st.kind === 'bascinet') {
    // The tournament box: flat-crowned, riveted, faceless. Visor cut
    // tracks the face like the eyes do (the pairX law).
    const shell = () => {
      chamferRect(ctx, headX - hw * 1.06, headY - hh * 1.1, hw * 2.12, hh * 2.08, cut);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, headY - hh * 1.1, headY + hh * 0.98);
    if (!hurt) {
      ctx.fillStyle = shade(st.color, 16);
      ctx.fillRect(headX - hw * 0.8, headY - hh * 1.0, hw * 1.6, hh * 0.26);
      ctx.fillStyle = shade(st.color, -22);
      ctx.fillRect(headX - hw * 1.06, headY - hh * 0.16, hw * 2.12, headR * 0.2);
      // Brow rivets pin the band — the smith's signature.
      ctx.fillStyle = shade(st.color, 26);
      for (const rx of [-0.62, 0, 0.62]) {
        ctx.fillRect(headX + rx * hw - headR * 0.035, headY - hh * 0.12, headR * 0.07, headR * 0.07);
      }
    }
    if (!hurt && front) {
      if (st.kind === 'bascinet') {
        // The pig-face: an eye slit above a PROTRUDING snout box with
        // breath holes — the muzzle is the helmet's whole identity, so
        // it is drawn fat, bright-edged, and never as a thin line.
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.44 * sw, headY - hh * 0.28, headR * 0.88 * sw, hh * 0.17);
        ctx.fillStyle = shade(st.color, 12);
        ctx.beginPath();
        chamferRect(ctx, vx - headR * 0.4 * sw, headY - hh * 0.02, headR * 0.8 * sw, hh * 0.66, cut * 0.6);
        ctx.fill();
        // The muzzle's top plane catches the sun; its underside sits
        // in contact shade so the box reads as sticking OUT.
        ctx.fillStyle = shade(st.color, 30);
        ctx.fillRect(vx - headR * 0.4 * sw, headY - hh * 0.02, headR * 0.8 * sw, hh * 0.12);
        ctx.fillStyle = shade(st.color, -22);
        ctx.fillRect(vx - headR * 0.4 * sw, headY + hh * 0.52, headR * 0.8 * sw, hh * 0.12);
        // Breath holes: a row of fat punched dots, never pinpricks.
        ctx.fillStyle = shade(st.color, -34);
        for (const bx of [-0.2, 0, 0.2]) {
          ctx.fillRect(vx + bx * headR * sw - headR * 0.045, headY + hh * 0.24, headR * 0.09, headR * 0.09);
        }
      } else if (st.visor === 'cross') {
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.07, headY - hh * 0.05, headR * 0.14, hh * 0.6);
        ctx.fillRect(vx - headR * 0.4, headY + hh * 0.08, headR * 0.8, hh * 0.16);
      } else {
        ctx.fillStyle = '#170f1c';
        ctx.fillRect(vx - headR * 0.42 * sw, headY + hh * 0.02, headR * 0.84 * sw, hh * 0.15);
      }
    } else if (!hurt) {
      // Plain back plates: a riveted seam instead of a face.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, headY - hh * 0.9, 0.02 * s, hh * 1.7);
    }
  } else if (st.kind === 'barbute') {
    // THE SOLDIER'S BARBUTE: one hammered iron shell, and a bold T cut
    // clean through it — the darkness inside IS the face. Honest
    // metal, forged with intent: riveted brow band, a low forge ridge
    // over the crown, a flared nape skirt behind.
    const topY = headY - hh * 1.18;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.72, botY);
      ctx.lineTo(headX - hw * 1.04, headY + hh * 0.42);
      ctx.lineTo(headX - hw * 1.06, headY - hh * 0.5);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY - hh * 0.05);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.06, headY - hh * 0.5);
      ctx.lineTo(headX + hw * 1.04, headY + hh * 0.42);
      ctx.lineTo(headX + hw * 0.72, botY);
      ctx.closePath();
    };
    const tCut = () => {
      // One cut: the eye band flowing into the mouth slot, chin point.
      const ew = headR * 0.5 * sw;
      const mw = headR * 0.15 * sw;
      ctx.moveTo(vx - ew, headY - hh * 0.36);
      ctx.lineTo(vx + ew, headY - hh * 0.36);
      ctx.lineTo(vx + ew, headY - hh * 0.02);
      ctx.lineTo(vx + mw, headY + hh * 0.08);
      ctx.lineTo(vx + mw, headY + hh * 0.72);
      ctx.lineTo(vx, headY + hh * 0.84);
      ctx.lineTo(vx - mw, headY + hh * 0.72);
      ctx.lineTo(vx - mw, headY + hh * 0.08);
      ctx.lineTo(vx - ew, headY - hh * 0.02);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // Hammer-mark facet: one quiet lit plane — the hand-forged read.
      ctx.fillStyle = shade(st.color, 7);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.62, headY - hh * 0.96);
      ctx.lineTo(headX - hw * 0.18, topY + hh * 0.1);
      ctx.lineTo(headX - hw * 0.34, headY - hh * 0.72);
      ctx.closePath();
      ctx.fill();
      // The forge ridge: a low keel over the crown, front-to-back.
      const arcK = 0.35 + 0.65 * profileK;
      ctx.strokeStyle = shade(st.color, 18);
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(headX - ld * hw * 0.7 * arcK, headY - hh * 0.92);
      ctx.quadraticCurveTo(headX, topY - hh * 0.08, headX + ld * hw * 0.66 * arcK, headY - hh * 0.9);
      ctx.stroke();
      // Riveted brow band — worn where the work is.
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 1.05, headY - hh * 0.64, hw * 2.1, hh * 0.2);
      ctx.fillStyle = shade(st.color, 26);
      for (const rx of [-0.82, -0.52, 0.52, 0.82]) {
        ctx.fillRect(headX + rx * hw - headR * 0.032, headY - hh * 0.6, headR * 0.064, headR * 0.064);
      }
    }
    if (!hurt && front) {
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      tCut();
      ctx.fill();
      // The ground rim: a bright filed edge where the cut was dressed.
      ctx.strokeStyle = shade(st.color, 24);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      tCut();
      ctx.stroke();
    } else if (!hurt) {
      // Behind: the riveted center seam and the flared nape skirt.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.16, 0.022 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.9, headY + hh * 0.6);
      ctx.lineTo(headX + hw * 0.9, headY + hh * 0.6);
      ctx.lineTo(headX + hw * 0.7, botY + hh * 0.14);
      ctx.lineTo(headX - hw * 0.7, botY + hh * 0.14);
      ctx.closePath();
      ctx.fill();
    }
  } else if (st.kind === 'armet') {
    // THE GROVE-KEEPER'S ARMET: a rounded skull with a slatted wedge
    // visor standing proud of the face, pivot roundels at the temples
    // (the armet's mechanical truth), and a gorget flare at the jaw so
    // the helm SEATS on the collar instead of ending at it.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 1.14, botY);
      ctx.lineTo(headX - hw * 0.96, headY + hh * 0.4);
      ctx.lineTo(headX - hw * 1.04, headY - hh * 0.45);
      ctx.quadraticCurveTo(headX - hw * 0.98, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 0.98, topY, headX + hw * 1.04, headY - hh * 0.45);
      ctx.lineTo(headX + hw * 0.96, headY + hh * 0.4);
      ctx.lineTo(headX + hw * 1.14, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The wedge visor: a POINTED beak standing proud of the face —
      // its top plane catches the sun, its keel edge stays bright, so
      // the wedge reads as a wedge and never as a grille. Slats cut
      // ACROSS the beak's slope, snout-short, breathing not speaking.
      const vw = headR * 0.54 * sw;
      ctx.fillStyle = shade(st.color, -6);
      ctx.beginPath();
      ctx.moveTo(vx - vw, headY - hh * 0.42);
      ctx.lineTo(vx + vw, headY - hh * 0.42);
      ctx.lineTo(vx + vw * 0.7, headY + hh * 0.5);
      ctx.lineTo(vx, headY + hh * 0.84);
      ctx.lineTo(vx - vw * 0.7, headY + hh * 0.5);
      ctx.closePath();
      ctx.fill();
      // Sun on the top plane; the beak's bright keel down the center.
      ctx.fillStyle = shade(st.color, 28);
      ctx.fillRect(vx - vw, headY - hh * 0.42, vw * 2, hh * 0.1);
      ctx.strokeStyle = shade(st.color, 20);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(vx, headY + hh * 0.02);
      ctx.lineTo(vx, headY + hh * 0.8);
      ctx.moveTo(vx - vw * 0.7, headY + hh * 0.5);
      ctx.lineTo(vx, headY + hh * 0.84);
      ctx.lineTo(vx + vw * 0.7, headY + hh * 0.5);
      ctx.stroke();
      // The eye slit, deep under the brow line.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - vw * 0.88, headY - hh * 0.28, vw * 1.76, hh * 0.16);
      // Three short breath cuts riding the beak's slopes, ANGLED with
      // the wedge — never a flat stack.
      for (const es of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const y0 = headY + hh * (0.06 + i * 0.17);
          ctx.beginPath();
          ctx.moveTo(vx + es * vw * 0.16, y0 + hh * 0.05);
          ctx.lineTo(vx + es * vw * (0.62 - i * 0.1), y0 - hh * 0.03);
          ctx.lineTo(vx + es * vw * (0.62 - i * 0.1), y0 + hh * 0.05);
          ctx.lineTo(vx + es * vw * 0.16, y0 + hh * 0.13);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Pivot roundels: bossed discs where the visor hinges.
      const pc = st.jaw ?? st.trim;
      for (const es of [-1, 1]) {
        ctx.fillStyle = pc;
        ctx.beginPath();
        ctx.arc(headX + es * hw * 0.86, headY - hh * 0.32, headR * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(pc, 30);
        ctx.beginPath();
        ctx.arc(headX + es * hw * 0.86, headY - hh * 0.35, headR * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!hurt) {
      // Behind: center seam + the gorget flare's shade step.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.12, 0.02 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -8);
      ctx.fillRect(headX - hw * 1.0, headY + hh * 0.56, hw * 2.0, hh * 0.14);
    }
  } else if (st.kind === 'sallet') {
    // THE GLACIER SALLET: one smooth swept shell running past the
    // skull into a pointed tail, a single cold slit, and a bevor whose
    // lower edge hangs icicle teeth. The mountain wore it first.
    const topY = headY - hh * 1.16;
    const botY = headY + hh * 0.96;
    const u = -ld; // the tail trails the travel, like hair does
    const tailX = headX + u * hw * (1.45 + profileK * 0.6);
    const shell = () => {
      ctx.moveTo(headX + ld * hw * 0.78, botY);
      ctx.lineTo(headX + ld * hw * 1.05, headY + hh * 0.45);
      ctx.lineTo(headX + ld * hw * 1.06, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX + ld * hw * 0.9, topY, headX - ld * hw * 0.08, topY);
      // The crown sweeps back and DOWN into the tail point.
      ctx.quadraticCurveTo(headX + u * hw * 1.14, topY + hh * 0.14, tailX, headY + hh * 0.3);
      ctx.quadraticCurveTo(headX + u * hw * 1.02, headY + hh * 0.34, headX + u * hw * 0.94, headY + hh * 0.6);
      ctx.lineTo(headX + u * hw * 0.72, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The frost glaze: one broad sheen streak across the crown —
      // steel cold enough to fog.
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      ctx.strokeStyle = shade(st.color, 22);
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.7, headY - hh * 0.55);
      ctx.quadraticCurveTo(headX - hw * 0.1, topY + hh * 0.12, headX + hw * 0.62, headY - hh * 0.75);
      ctx.stroke();
      ctx.restore();
      // The tail's under-facet: the swept edge keeps its thickness.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(headX + u * hw * 0.7, headY + hh * 0.05);
      ctx.quadraticCurveTo(headX + u * hw * 1.05, headY + hh * 0.14, tailX - u * hw * 0.05, headY + hh * 0.28);
      ctx.stroke();
    }
    if (!hurt && front) {
      // The cold slit, with an ice gleam riding its upper lip.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.26, headR * 0.92 * sw, hh * 0.15);
      ctx.fillStyle = st.trim;
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.32, headR * 0.92 * sw, hh * 0.05);
      // The bevor: a paler chin plate rising to guard the jaw...
      const bw = headR * 0.52 * sw;
      ctx.fillStyle = st.jaw ?? shade(st.color, 8);
      ctx.beginPath();
      ctx.moveTo(vx - bw, headY + hh * 0.08);
      ctx.lineTo(vx + bw, headY + hh * 0.08);
      ctx.lineTo(vx + bw * 0.8, botY);
      ctx.lineTo(vx - bw * 0.8, botY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.jaw ?? st.color, -14);
      ctx.fillRect(vx - bw * 0.8, botY - hh * 0.1, bw * 1.6, hh * 0.1);
      // ...whose lower edge hangs icicle teeth: winter's dagged hem —
      // four NARROW drips of uneven length, never a pair of tusks.
      ctx.fillStyle = st.trim;
      for (const [tu, tl] of [[-0.36, 0.2], [-0.13, 0.38], [0.12, 0.26], [0.34, 0.14]] as const) {
        const px = vx + tu * headR * sw;
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.045, botY - hh * 0.02);
        ctx.lineTo(px, botY + hh * tl);
        ctx.lineTo(px + headR * 0.045, botY - hh * 0.02);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.2, 0.02 * s, hh * 1.8);
    }
  } else if (st.kind === 'radiant') {
    // THE RADIANT MASK: not a helmet with a face hole — a second FACE,
    // serene and gold. Narrow calm eyes, a brow sun-disc, a corona of
    // engraved rays over the crown. The wings ride separately.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.66, botY);
      ctx.quadraticCurveTo(headX - hw * 1.1, headY + hh * 0.6, headX - hw * 1.05, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.05, headY - hh * 0.3);
      ctx.quadraticCurveTo(headX + hw * 1.1, headY + hh * 0.6, headX + hw * 0.66, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The polish: one hard specular arc — gold answers the sun.
      ctx.strokeStyle = shade(st.color, 34);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.55, headY - hh * 0.82);
      ctx.quadraticCurveTo(headX - hw * 0.08, topY + hh * 0.06, headX + hw * 0.42, headY - hh * 0.92);
      ctx.stroke();
    }
    if (!hurt && front) {
      // The corona: engraved rays radiating from the brow disc — cut
      // deep enough to shadow, or the crown reads blank at zoom.
      ctx.strokeStyle = shade(st.color, -22);
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const a = -Math.PI / 2 + i * 0.44;
        const dy = headY - hh * 0.5;
        ctx.moveTo(vx + Math.cos(a) * headR * 0.32, dy + Math.sin(a) * headR * 0.3);
        ctx.lineTo(vx + Math.cos(a) * headR * 0.68, dy + Math.sin(a) * headR * 0.64);
      }
      ctx.stroke();
      // The sun-disc at the brow, ringed with its own engraving so it
      // separates from the gold behind it.
      ctx.strokeStyle = shade(st.color, -24);
      ctx.lineWidth = Math.max(1, s * 0.015);
      ctx.beginPath();
      ctx.arc(vx, headY - hh * 0.5, headR * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.arc(vx, headY - hh * 0.5, headR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(st.trim, 32);
      ctx.beginPath();
      ctx.arc(vx - headR * 0.05, headY - hh * 0.55, headR * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // The sculpted nose ridge — a face, not a plate.
      ctx.strokeStyle = shade(st.color, 16);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(vx, headY - hh * 0.02);
      ctx.lineTo(vx, headY + hh * 0.26);
      ctx.stroke();
      // The serene eyes: two dark almonds, calm as noon — wide enough
      // to read as a gaze, not a squint.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(vx + es * headR * 0.27 * sw, headY - hh * 0.08, headR * 0.16 * sw, headR * 0.062, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mouth line: gold keeps its counsel.
      ctx.strokeStyle = shade(st.color, -18);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.16 * sw, headY + hh * 0.5);
      ctx.quadraticCurveTo(vx, headY + hh * 0.58, vx + headR * 0.16 * sw, headY + hh * 0.5);
      ctx.stroke();
    } else if (!hurt) {
      // Behind: the corona rays continue over the crown to the nape.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.14, 0.02 * s, hh * 1.9);
      ctx.strokeStyle = shade(st.color, -10);
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      for (const rx of [-0.55, 0.55]) {
        ctx.moveTo(headX + rx * hw, headY - hh * 0.7);
        ctx.lineTo(headX + rx * hw * 1.5, headY - hh * 0.3);
      }
      ctx.stroke();
    }
  } else if (st.kind === 'ramfort') {
    // THE BATTERING TOWER: a flat-topped siege bucket WIDER than the
    // head — armor as architecture. Riveted corner seams, a keel
    // plate down the face, twin eye slots, a punched breath grid; the
    // ram spirals bolt onto temple roundels.
    const wx = hw * 1.16;
    const topY = headY - hh * 1.08;
    const botY = headY + hh * 1.0;
    const shell = () => {
      chamferRect(ctx, headX - wx, topY, wx * 2, botY - topY, cut * 0.55);
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The rolled crown lip: a reinforcing edge, not a decoration.
      ctx.fillStyle = shade(st.color, 20);
      ctx.fillRect(headX - wx * 0.94, topY, wx * 1.88, hh * 0.14);
      // Corner seams, riveted — the bucket is BUILT, not raised.
      ctx.fillStyle = shade(st.color, -16);
      for (const sx of [-0.72, 0.72]) {
        ctx.fillRect(headX + sx * wx - s * 0.006, topY + hh * 0.16, s * 0.012, botY - topY - hh * 0.24);
      }
      ctx.fillStyle = shade(st.color, 24);
      for (const sx of [-0.72, 0.72]) {
        for (const ry of [-0.55, 0.05, 0.6]) {
          ctx.fillRect(headX + sx * wx - headR * 0.03, headY + ry * hh - headR * 0.03, headR * 0.06, headR * 0.06);
        }
      }
      // Temple roundels: the horn mounts, bolted clean through.
      for (const es of [-1, 1]) {
        const far = es !== ld;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.arc(headX + es * wx * 0.78 * wK, headY - hh * 0.5, headR * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(st.trim, 26);
        ctx.beginPath();
        ctx.arc(headX + es * wx * 0.78 * wK, headY - hh * 0.5, headR * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!hurt && front) {
      // The keel plate: a vertical reinforcement the face hides behind.
      const kc = st.jaw ?? shade(st.color, 8);
      ctx.fillStyle = kc;
      ctx.fillRect(vx - headR * 0.13 * sw, topY + hh * 0.14, headR * 0.26 * sw, botY - topY - hh * 0.2);
      ctx.fillStyle = shade(kc, 22);
      for (const ry of [0.3, 0.6]) {
        ctx.fillRect(vx - headR * 0.03, headY + ry * hh, headR * 0.06, headR * 0.06);
      }
      // Twin eye slots flanking the keel — the wall watches back.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        const exx = vx + es * headR * 0.32 * sw;
        ctx.fillRect(exx - headR * 0.16 * sw, headY - hh * 0.28, headR * 0.32 * sw, hh * 0.15);
      }
      // The breath grid: punched squares low on the face.
      ctx.fillStyle = shade(st.color, -30);
      for (const es of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          ctx.fillRect(vx + es * headR * 0.32 * sw - headR * 0.04, headY + hh * (0.3 + i * 0.22), headR * 0.08, headR * 0.08);
        }
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.16, 0.02 * s, botY - topY - hh * 0.3);
    }
  } else if (st.kind === 'warmask') {
    // THE SEA-WOLF'S WAR MASK: a weathered dome over a full bronze
    // face plate — sculpted brow arcs, a straight nose bar, the
    // mustache flare. The raider brings a SECOND face to the wall.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.78, botY);
      ctx.lineTo(headX - hw * 1.05, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 1.05, headY - hh * 0.4);
      ctx.quadraticCurveTo(headX - hw * 0.96, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 0.96, topY, headX + hw * 1.05, headY - hh * 0.4);
      ctx.lineTo(headX + hw * 1.05, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.78, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // Cheek plates first, hinged and darker, flanking the mask.
      const mw = headR * 0.58 * sw;
      ctx.fillStyle = st.jaw ?? shade(st.color, -12);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        chamferRect(ctx, vx + es * mw * 1.26 - headR * 0.19, headY + hh * 0.04, headR * 0.38, hh * 0.76, cut * 0.4);
        ctx.fill();
      }
      // The face plate: paler bronze, inset from the shell.
      ctx.fillStyle = st.mask ?? shade(st.color, 14);
      ctx.beginPath();
      chamferRect(ctx, vx - mw, headY - hh * 0.5, mw * 2, hh * 1.4, cut * 0.5);
      ctx.fill();
      // Rivets seat the plate on the shell — dots around the rim say
      // METAL before anything else gets to speak.
      ctx.fillStyle = st.trim;
      for (const [rx, ry] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.55], [0.8, 0.55]] as const) {
        ctx.beginPath();
        ctx.arc(vx + rx * mw, headY + ry * hh, headR * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mask is GEOMETRY, not a portrait: dark bronze inlay cut in
      // hard angles — a T of brow bars and nose over wide angular eye
      // holes, a handlebar below. Curves made it a creepy little man;
      // angles make it a WAR MASK.
      const ink = st.jaw ?? shade(st.color, -22);
      // The eye holes: wide angular trapezoid cuts.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        const ex = vx + es * headR * 0.3 * sw;
        ctx.beginPath();
        ctx.moveTo(ex - es * headR * 0.2 * sw, headY - hh * 0.24);
        ctx.lineTo(ex + es * headR * 0.16 * sw, headY - hh * 0.3);
        ctx.lineTo(ex + es * headR * 0.19 * sw, headY - hh * 0.06);
        ctx.lineTo(ex - es * headR * 0.2 * sw, headY - hh * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // The brow bar: one straight dark bar across both eyes...
      ctx.fillStyle = ink;
      ctx.fillRect(vx - headR * 0.54 * sw, headY - hh * 0.4, headR * 1.08 * sw, hh * 0.14);
      // ...dropping into the nose bar (a BAR, never a snout)...
      ctx.fillRect(vx - headR * 0.08, headY - hh * 0.4, headR * 0.16, hh * 0.62);
      // ...and the handlebar: two straight angled blades, tips out and
      // DOWN-swept — heraldry with an edge, nothing that smiles.
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(vx + es * headR * 0.05, headY + hh * 0.3);
        ctx.lineTo(vx + es * headR * 0.5 * sw, headY + hh * 0.4);
        ctx.lineTo(vx + es * headR * 0.54 * sw, headY + hh * 0.56);
        ctx.lineTo(vx + es * headR * 0.05, headY + hh * 0.44);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.12, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // The crest band: nose-to-nape over the crown — the dragon's
      // back, riveted at the ends. Reads at every facing.
      const arcK = 0.35 + 0.65 * profileK;
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(headX - ld * hw * 0.8 * arcK, headY - hh * 0.88);
      ctx.quadraticCurveTo(headX, topY - hh * 0.18, headX + ld * hw * 0.8 * arcK, headY - hh * 0.88);
      ctx.lineTo(headX + ld * hw * 0.64 * arcK, headY - hh * 0.82);
      ctx.quadraticCurveTo(headX, topY + hh * 0.02, headX - ld * hw * 0.64 * arcK, headY - hh * 0.82);
      ctx.closePath();
      ctx.fill();
    }
  } else if (st.kind === 'dread') {
    // THE BLACK MAW: an overhanging brow shelf keeps the slit in its
    // own night; below it a saw-tooth bevor bites down over darkness.
    // The ember in the slit is the only warmth this helm ever holds.
    const topY = headY - hh * 1.14;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.62, botY);
      ctx.lineTo(headX - hw * 1.06, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 1.12, headY - hh * 0.44);
      ctx.lineTo(headX - hw * 0.92, topY);
      ctx.lineTo(headX + hw * 0.92, topY);
      ctx.lineTo(headX + hw * 1.12, headY - hh * 0.44);
      ctx.lineTo(headX + hw * 1.06, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.62, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The brow shelf: a plate overhanging the slit, hard-shaded
      // beneath — the eyes live in architectural shadow. Its lit top
      // plane is the ONE bright value on the whole black helm, so the
      // jut reads even against the dark.
      ctx.fillStyle = shade(st.color, 22);
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.66 * sw, headY - hh * 0.58);
      ctx.lineTo(vx + headR * 0.66 * sw, headY - hh * 0.58);
      ctx.lineTo(vx + headR * 0.54 * sw, headY - hh * 0.24);
      ctx.lineTo(vx - headR * 0.54 * sw, headY - hh * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(st.color, -34);
      ctx.fillRect(vx - headR * 0.54 * sw, headY - hh * 0.28, headR * 1.08 * sw, hh * 0.09);
      // The slit, and the ember banked inside it — a COOL core over
      // darkness, never a glare.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.46 * sw, headY - hh * 0.18, headR * 0.92 * sw, hh * 0.16);
      ctx.fillStyle = st.trim;
      ctx.fillRect(vx - headR * 0.34 * sw, headY - hh * 0.14, headR * 0.68 * sw, hh * 0.08);
      ctx.fillStyle = shade(st.trim, 40);
      ctx.fillRect(vx - headR * 0.12 * sw, headY - hh * 0.13, headR * 0.24 * sw, hh * 0.06);
      // The maw: darkness for the teeth to bite into.
      ctx.fillStyle = '#170f1c';
      ctx.fillRect(vx - headR * 0.44 * sw, headY + hh * 0.12, headR * 0.88 * sw, hh * 0.64);
      // Saw teeth: forged, descending, deliberate.
      ctx.fillStyle = st.jaw ?? shade(st.color, 6);
      for (let i = -2; i <= 2; i++) {
        const px = vx + i * headR * 0.19 * sw;
        const tl = hh * (0.46 - Math.abs(i) * 0.08);
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.09 * sw, headY + hh * 0.1);
        ctx.lineTo(px, headY + hh * 0.1 + tl);
        ctx.lineTo(px + headR * 0.09 * sw, headY + hh * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      // The chin spike: the maw resolves to a point.
      ctx.beginPath();
      ctx.moveTo(vx - headR * 0.1 * sw, botY - hh * 0.06);
      ctx.lineTo(vx, botY + hh * 0.2);
      ctx.lineTo(vx + headR * 0.1 * sw, botY - hh * 0.06);
      ctx.closePath();
      ctx.fill();
    } else if (!hurt) {
      // Behind: a studded spine ridge climbs the skull.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.1, 0.022 * s, hh * 2.0);
      ctx.fillStyle = shade(st.color, 10);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(headX - headR * 0.045, topY + hh * (0.3 + i * 0.5), headR * 0.09, headR * 0.09);
      }
    }
  } else if (st.kind === 'briar') {
    // THE THORN CAGE: the visor is a WOVEN lattice of briar bars over
    // darkness — a hedge you cannot see into — under a twisted wreath
    // band at the brow. The forest forged this one.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 0.98;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.7, botY);
      ctx.quadraticCurveTo(headX - hw * 1.08, headY + hh * 0.5, headX - hw * 1.05, headY - hh * 0.35);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.05, headY - hh * 0.35);
      ctx.quadraticCurveTo(headX + hw * 1.08, headY + hh * 0.5, headX + hw * 0.7, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The cage window, and the weave across it.
      const cw = headR * 0.52 * sw;
      const window = () => {
        chamferRect(ctx, vx - cw, headY - hh * 0.3, cw * 2, hh * 1.02, cut * 0.5);
      };
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      window();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      window();
      ctx.clip();
      // FAT woven bars — a lattice of grown wood, never wire. The two
      // weave directions take different values so the over/under
      // reads even at world zoom.
      const barC = st.jaw ?? st.trim;
      ctx.lineWidth = Math.max(2.5, s * 0.036);
      ctx.strokeStyle = shade(barC, -10);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(vx - cw + i * cw, headY - hh * 0.42);
        ctx.lineTo(vx + cw + i * cw, headY + hh * 0.84);
      }
      ctx.stroke();
      ctx.strokeStyle = shade(barC, 8);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(vx + cw + i * cw, headY - hh * 0.42);
        ctx.lineTo(vx - cw + i * cw, headY + hh * 0.84);
      }
      ctx.stroke();
      // Thorn nubs ride two crossings — the cage still grows.
      ctx.fillStyle = shade(barC, 22);
      for (const [nx, ny] of [[-0.5, 0.05], [0.5, 0.62]] as const) {
        ctx.beginPath();
        ctx.moveTo(vx + nx * cw - headR * 0.05, headY + ny * hh);
        ctx.lineTo(vx + nx * cw + headR * 0.02, headY + ny * hh - headR * 0.09);
        ctx.lineTo(vx + nx * cw + headR * 0.06, headY + ny * hh + headR * 0.03);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.14, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // The wreath: briar beads twisting around the brow, the weave
      // alternating its lit half — over, under, over.
      const by = headY - hh * 0.56;
      for (let i = 0; i < 6; i++) {
        const u2 = -1 + (i + 0.5) / 3;
        ctx.fillStyle = i % 2 === 0 ? st.trim : shade(st.trim, -20);
        ctx.beginPath();
        ctx.ellipse(headX + u2 * hw * 0.9, by + (i % 2 === 0 ? -1 : 1) * hh * 0.035, hw * 0.19, hh * 0.1, u2 * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (st.kind === 'drake') {
    // THE DRAKE VISAGE: lapped scale rows over the skull, a copper
    // snout standing off the lower face, amber-glint eyes under
    // scaled brows, a serrated dorsal fin over the crown. Leather
    // that remembers the beast it was.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 0.96;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.76, botY);
      ctx.lineTo(headX - hw * 1.04, headY + hh * 0.36);
      ctx.lineTo(headX - hw * 1.04, headY - hh * 0.42);
      ctx.quadraticCurveTo(headX - hw * 0.95, topY, headX, topY);
      ctx.quadraticCurveTo(headX + hw * 0.95, topY, headX + hw * 1.04, headY - hh * 0.42);
      ctx.lineTo(headX + hw * 1.04, headY + hh * 0.36);
      ctx.lineTo(headX + hw * 0.76, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The lap: three scale rows, darkening as they descend, EVERY
      // scallop rimmed pale so the lap reads as armor plate and never
      // as hair. Clipped to the shell so the hem cannot leak.
      ctx.save();
      ctx.beginPath();
      shell();
      ctx.clip();
      for (let row = 0; row < 3; row++) {
        const ry = topY + hh * (0.55 + row * 0.44);
        for (let i = 0; i < 5; i++) {
          const px = headX + (-0.84 + i * 0.42 + (row % 2) * 0.21) * hw;
          ctx.fillStyle = shade(st.color, -6 - row * 10);
          ctx.beginPath();
          ctx.arc(px, ry, hw * 0.26, 0, Math.PI);
          ctx.fill();
          // The rim: each scale's ground lower edge catches light.
          ctx.strokeStyle = shade(st.color, 20);
          ctx.lineWidth = Math.max(1, s * 0.013);
          ctx.beginPath();
          ctx.arc(px, ry, hw * 0.24, Math.PI * 0.12, Math.PI * 0.88);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (!hurt && front) {
      // Scaled brows: two swept spikes over the eyes.
      ctx.fillStyle = st.jaw ?? st.trim;
      for (const es of [-1, 1]) {
        const bx = vx + es * headR * 0.3 * sw;
        ctx.beginPath();
        ctx.moveTo(bx - es * headR * 0.14 * sw, headY - hh * 0.22);
        ctx.lineTo(bx + es * headR * 0.2 * sw, headY - hh * 0.52);
        ctx.lineTo(bx + es * headR * 0.16 * sw, headY - hh * 0.16);
        ctx.closePath();
        ctx.fill();
      }
      // The amber eyes: dark sockets, a glint that watches back.
      for (const es of [-1, 1]) {
        const exx = vx + es * headR * 0.28 * sw;
        ctx.fillStyle = '#170f1c';
        ctx.beginPath();
        ctx.ellipse(exx, headY - hh * 0.06, headR * 0.12 * sw, headR * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = st.trim;
        ctx.fillRect(exx - headR * 0.025, headY - hh * 0.1, headR * 0.05, headR * 0.08);
      }
      // The snout: a copper wedge standing OFF the face — top plane
      // lit, underside in contact shade (the bascinet's own law).
      // Drawn BIG: the snout is the visage's whole identity.
      const sn = st.jaw ?? '#c9713c';
      ctx.fillStyle = sn;
      ctx.beginPath();
      chamferRect(ctx, vx - headR * 0.44 * sw, headY + hh * 0.04, headR * 0.88 * sw, hh * 0.64, cut * 0.5);
      ctx.fill();
      ctx.fillStyle = shade(sn, 28);
      ctx.fillRect(vx - headR * 0.44 * sw, headY + hh * 0.04, headR * 0.88 * sw, hh * 0.13);
      ctx.fillStyle = shade(sn, -20);
      ctx.fillRect(vx - headR * 0.44 * sw, headY + hh * 0.55, headR * 0.88 * sw, hh * 0.13);
      // Nostrils flare at the snout's leading edge.
      ctx.fillStyle = shade(sn, -34);
      for (const es of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(vx + es * headR * 0.2 * sw, headY + hh * 0.24, headR * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      // The tooth ridge: pale hooks riding the snout's lip.
      ctx.fillStyle = '#e8dcc0';
      for (const tu of [-0.24, 0, 0.24]) {
        const px = vx + tu * headR * sw;
        ctx.beginPath();
        ctx.moveTo(px - headR * 0.05, headY + hh * 0.68);
        ctx.lineTo(px, headY + hh * 0.5);
        ctx.lineTo(px + headR * 0.05, headY + hh * 0.68);
        ctx.closePath();
        ctx.fill();
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.2, 0.02 * s, hh * 1.8);
    }
    if (!hurt) {
      // The dorsal fin: serrated crest riding the crown front-to-back,
      // tips swept toward the tail — bright amber membrane so the fin
      // separates from the scale field at world zoom.
      const arcK = 0.35 + 0.65 * profileK;
      for (let i = 0; i < 3; i++) {
        const u2 = (-0.5 + i * 0.5) * arcK;
        const px = headX + ld * u2 * hw;
        const seat = topY + hh * (0.18 + u2 * u2 * 0.5);
        const tall = hh * (0.56 - Math.abs(u2) * 0.18);
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.16, seat);
        ctx.lineTo(px - ld * hw * 0.16, seat - tall);
        ctx.lineTo(px + hw * 0.16, seat);
        ctx.closePath();
        ctx.fill();
        // A darker leading rib per point — the fin has bones.
        ctx.fillStyle = st.jaw ?? shade(st.trim, -24);
        ctx.beginPath();
        ctx.moveTo(px + hw * 0.06, seat);
        ctx.lineTo(px - ld * hw * 0.14, seat - tall * 0.94);
        ctx.lineTo(px + hw * 0.16, seat);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (st.kind === 'aurochs') {
    // THE AUROCHS: a bull's skull in black bronze — flat wide crown,
    // a heavy riveted brow shelf, wide-set eye slits, and a broad
    // muzzle standing OFF the lower face with a brass ring hung from
    // its lip. Wider than the head like the ramfort: a siege animal
    // wearing armor, not a soldier wearing a bucket.
    const topY = headY - hh * 1.12;
    const botY = headY + hh * 1.0;
    const wx = 1.14;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.8, botY);
      ctx.lineTo(headX - hw * wx, headY + hh * 0.3);
      ctx.lineTo(headX - hw * wx, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX - hw * (wx - 0.12), topY, headX - hw * 0.4, topY - hh * 0.04);
      ctx.lineTo(headX + hw * 0.4, topY - hh * 0.04);
      ctx.quadraticCurveTo(headX + hw * (wx - 0.12), topY, headX + hw * wx, headY - hh * 0.6);
      ctx.lineTo(headX + hw * wx, headY + hh * 0.3);
      ctx.lineTo(headX + hw * 0.8, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt) {
      // The flat crown's lit plane — the 2.5D top the camera earns.
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(headX - hw * 0.84, topY - hh * 0.02, hw * 1.68, hh * 0.2);
      // The brow shelf: one heavy dark bar the whole face hangs from,
      // pinned with bright rivets — the forged line between skull
      // and muzzle.
      ctx.fillStyle = shade(st.color, -20);
      ctx.fillRect(headX - hw * 1.02, headY - hh * 0.5, hw * 2.04, hh * 0.17);
      ctx.fillStyle = shade(st.color, 24);
      for (const rx of [-0.72, -0.24, 0.24, 0.72]) {
        ctx.fillRect(headX + rx * hw - headR * 0.032, headY - hh * 0.46, headR * 0.064, headR * 0.064);
      }
    }
    if (!hurt && front) {
      // Wide-set eye slits under the shelf — a bull watches you from
      // the sides of its head.
      ctx.fillStyle = '#170f1c';
      for (const es of [-1, 1]) {
        ctx.fillRect(
          vx + es * headR * 0.42 * sw - headR * 0.17 * sw,
          headY - hh * 0.26,
          headR * 0.34 * sw,
          hh * 0.13,
        );
      }
      // The muzzle: broader than the bascinet's snout — top plane in
      // sun, underside in contact shade, nostril slots punched dark.
      const mzTop = headY + hh * 0.02;
      ctx.fillStyle = shade(st.color, 10);
      ctx.beginPath();
      chamferRect(ctx, vx - headR * 0.52 * sw, mzTop, headR * 1.04 * sw, hh * 0.7, cut * 0.55);
      ctx.fill();
      ctx.fillStyle = shade(st.color, 30);
      ctx.fillRect(vx - headR * 0.52 * sw, mzTop, headR * 1.04 * sw, hh * 0.13);
      ctx.fillStyle = shade(st.color, -22);
      ctx.fillRect(vx - headR * 0.52 * sw, mzTop + hh * 0.57, headR * 1.04 * sw, hh * 0.13);
      // Nostril slots: two fat vertical punches, flared outward.
      ctx.fillStyle = shade(st.color, -36);
      for (const es of [-1, 1]) {
        ctx.save();
        ctx.translate(vx + es * headR * 0.26 * sw, mzTop + hh * 0.34);
        ctx.rotate(es * 0.2);
        ctx.fillRect(-headR * 0.045, -hh * 0.12, headR * 0.09, hh * 0.24);
        ctx.restore();
      }
      // THE RING: brass, hung from the muzzle's lip — the one piece
      // of jewelry a siege animal respects. Drawn fat, glinted once.
      const ringR = headR * 0.17;
      const ry = mzTop + hh * 0.72 + ringR * 0.5;
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(2, headR * 0.075);
      ctx.beginPath();
      ctx.arc(vx, ry, ringR * sw, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = shade(st.trim, 36);
      ctx.beginPath();
      ctx.arc(vx - ringR * 0.55 * sw, ry - ringR * 0.55, headR * 0.045, 0, Math.PI * 2);
      ctx.fill();
    } else if (!hurt) {
      // From behind: the nape band and a riveted spine seam.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.011 * s, topY + hh * 0.16, 0.022 * s, hh * 1.9);
      ctx.fillStyle = shade(st.color, -24);
      ctx.fillRect(headX - hw * 0.86, headY + hh * 0.52, hw * 1.72, hh * 0.16);
    }
  } else if (st.kind === 'barrow') {
    // THE BARROW CROWN: the king under the hill. A tall dome of
    // green-black iron, the face a dark cavity behind straight bars,
    // and the crown itself — old gold, blunt-pointed — forged AROUND
    // the helm. Rank as structure, never a hat on a hat.
    const topY = headY - hh * 1.2;
    const botY = headY + hh * 1.0;
    const shell = () => {
      ctx.moveTo(headX - hw * 0.78, botY);
      ctx.lineTo(headX - hw * 1.05, headY + hh * 0.44);
      ctx.lineTo(headX - hw * 1.06, headY - hh * 0.72);
      ctx.quadraticCurveTo(headX - hw * 1.0, topY, headX - hw * 0.34, topY - hh * 0.03);
      ctx.lineTo(headX + hw * 0.34, topY - hh * 0.03);
      ctx.quadraticCurveTo(headX + hw * 1.0, topY, headX + hw * 1.06, headY - hh * 0.72);
      ctx.lineTo(headX + hw * 1.05, headY + hh * 0.44);
      ctx.lineTo(headX + hw * 0.78, botY);
      ctx.closePath();
    };
    ctx.fillStyle = mc;
    ctx.beginPath();
    shell();
    ctx.fill();
    shellLight(shell, topY, botY);
    if (!hurt && front) {
      // The cavity: one dark window where a face would be. Whoever is
      // in there has been in there a long time.
      const cw = headR * 0.52 * sw;
      ctx.fillStyle = '#170f1c';
      ctx.beginPath();
      chamferRect(ctx, vx - cw, headY - hh * 0.4, cw * 2, hh * 1.14, cut * 0.5);
      ctx.fill();
      // The bars: three fat iron uprights over the dark — the briar
      // law holds, bars carry mass or they read as scratches.
      ctx.fillStyle = shade(st.color, 10);
      for (const u of [-0.6, 0, 0.6]) {
        ctx.fillRect(vx + u * cw - headR * 0.05 * sw, headY - hh * 0.38, headR * 0.1 * sw, hh * 1.1);
      }
      // Each bar's lit east edge — round iron, not flat straps.
      ctx.fillStyle = shade(st.color, 26);
      for (const u of [-0.6, 0, 0.6]) {
        ctx.fillRect(vx + u * cw + headR * 0.02 * sw, headY - hh * 0.36, headR * 0.025 * sw, hh * 1.06);
      }
      // The bevor: a jaw plate seating the cage from below.
      const jc = st.jaw ?? shade(st.color, -12);
      ctx.fillStyle = jc;
      ctx.fillRect(vx - cw * 1.12, headY + hh * 0.74, cw * 2.24, hh * 0.24);
      ctx.fillStyle = shade(jc, 16);
      ctx.fillRect(vx - cw * 1.12, headY + hh * 0.74, cw * 2.24, hh * 0.06);
    } else if (!hurt) {
      // From behind: the spine seam and two weather notches the hill
      // bit out of the rim.
      ctx.fillStyle = shade(st.color, -16);
      ctx.fillRect(headX - 0.01 * s, topY + hh * 0.2, 0.02 * s, hh * 1.9);
    }
    if (!hurt) {
      // THE CROWN: an old-gold band ringing the skull, blunt trapezoid
      // points rising off it — rising frontal, a full ring at profile
      // (the spikesCrown arc grammar, worn as gold).
      const bandY = headY - hh * 0.66;
      ctx.fillStyle = shade(st.trim, -18);
      ctx.fillRect(headX - hw * 1.02, bandY, hw * 2.04, hh * 0.16);
      ctx.fillStyle = st.trim;
      ctx.fillRect(headX - hw * 1.02, bandY, hw * 2.04, hh * 0.1);
      const arcK = 0.35 + 0.65 * profileK;
      for (let i = 0; i < 3; i++) {
        const u2 = (-0.62 + i * 0.62) * arcK;
        const px = headX + ld * u2 * hw;
        const tall = hh * (0.34 - Math.abs(u2) * 0.1);
        ctx.fillStyle = st.trim;
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.16, bandY + hh * 0.02);
        ctx.lineTo(px - hw * 0.09, bandY - tall);
        ctx.lineTo(px + hw * 0.09, bandY - tall);
        ctx.lineTo(px + hw * 0.16, bandY + hh * 0.02);
        ctx.closePath();
        ctx.fill();
        // The point's shaded west facet — forged gold, not foil.
        ctx.fillStyle = shade(st.trim, -20);
        ctx.beginPath();
        ctx.moveTo(px - hw * 0.16, bandY + hh * 0.02);
        ctx.lineTo(px - hw * 0.09, bandY - tall);
        ctx.lineTo(px - hw * 0.02, bandY - tall);
        ctx.lineTo(px - hw * 0.05, bandY + hh * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // Weather notches: the hill kept its king a long time.
      ctx.fillStyle = shade(st.color, -30);
      ctx.fillRect(headX - hw * 0.98, headY + hh * 0.18, headR * 0.09, headR * 0.07);
      ctx.fillRect(headX + hw * 0.82, headY - hh * 0.12, headR * 0.07, headR * 0.09);
    }
  }
  if (st.fins && !hurt) {
    // Side fins: broad blades swept up off the temples — real mass, a
    // glacier's calving edge; the far fin narrows like the far eye.
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * hw * 0.88;
      const by = headY - hh * 0.4;
      ctx.fillStyle = st.fins.color;
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.06, by + hh * 0.42 * wK);
      ctx.quadraticCurveTo(bx + es * hw * 0.55 * wK, by + hh * 0.2, bx + es * hw * 1.0 * wK, by - hh * 0.85);
      ctx.quadraticCurveTo(bx + es * hw * 0.5 * wK, by - hh * 0.2, bx + es * hw * 0.16 * wK, by - hh * 0.1);
      ctx.closePath();
      ctx.fill();
      // A darker under-facet keeps the blade from reading flat.
      ctx.fillStyle = shade(st.fins.color, -16);
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.06, by + hh * 0.42 * wK);
      ctx.quadraticCurveTo(bx + es * hw * 0.5 * wK, by + hh * 0.24, bx + es * hw * 0.86 * wK, by - hh * 0.55);
      ctx.lineTo(bx + es * hw * 0.5 * wK, by - hh * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (st.wings && !hurt) {
    // Feathered wing blades: three ascending points, tallest outermost.
    ctx.fillStyle = st.wings.color;
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * hw * 0.82;
      const by = headY - hh * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.35 * wK);
      ctx.lineTo(bx + es * hw * 0.3 * wK, by - hh * 0.42);
      ctx.lineTo(bx + es * hw * 0.44 * wK, by - hh * 0.1);
      ctx.lineTo(bx + es * hw * 0.68 * wK, by - hh * 0.72);
      ctx.lineTo(bx + es * hw * 0.8 * wK, by - hh * 0.25);
      ctx.lineTo(bx + es * hw * 1.05 * wK, by - hh * 1.05);
      ctx.lineTo(bx + es * hw * 0.62 * wK, by + hh * 0.38 * wK);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (st.crest && !hurt) {
    // A solid metal ridge riding the crown: narrow blade frontal, full
    // arc at profile — the plume grammar, forged instead of feathered.
    const arcK = 0.35 + 0.65 * profileK;
    ctx.fillStyle = st.crest.color;
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.88 * arcK, headY - hh * 0.98);
    ctx.quadraticCurveTo(headX, headY - hh * (1.72 + 0.34 * arcK), headX + lead * hw * 0.7 * arcK, headY - hh * 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(st.crest.color, 24);
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.74 * arcK, headY - hh * 1.04);
    ctx.quadraticCurveTo(headX, headY - hh * (1.6 + 0.3 * arcK), headX + lead * hw * 0.58 * arcK, headY - hh * 1.04);
    ctx.stroke();
  }
  if (st.horns && !hurt) {
    const hz = st.horns.size;
    if (st.horns.curl) {
      // Ram horns: a thick spiral hugging each temple. Drawn in a
      // per-side MIRRORED local frame (translate + scale) so left and
      // right curl toward the face symmetrically and stay oriented as
      // the head turns — a spiral painted once and flipped can never
      // point the wrong way. The far horn narrows like the far eye.
      ctx.lineCap = 'round';
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const rr = hh * 0.52 * hz;
        ctx.save();
        ctx.translate(headX + es * hw * 0.98 * wK, headY - hh * 0.42);
        ctx.scale(es * wK, 1);
        // Root sweep: from the crown, up over the top and down the
        // cheek — the fat outer curl.
        ctx.strokeStyle = st.horns.color;
        ctx.lineWidth = Math.max(2.5, s * 0.052 * hz);
        ctx.beginPath();
        ctx.arc(0, 0, rr, -Math.PI * 0.65, Math.PI * 0.62, false);
        ctx.stroke();
        // The tail: a tighter inner turn finishing forward, toward
        // where the face is — how a real ram's horn resolves.
        ctx.lineWidth = Math.max(2, s * 0.036 * hz);
        ctx.beginPath();
        ctx.arc(hw * 0.08, hh * 0.1, rr * 0.55, Math.PI * 0.6, Math.PI * 1.35, false);
        ctx.stroke();
        // The spiral's heart: filled so the curl reads as horn mass,
        // never an empty hoop earring.
        ctx.fillStyle = shade(st.horns.color, -12);
        ctx.beginPath();
        ctx.arc(hw * 0.06, hh * 0.08, rr * 0.32, 0, Math.PI * 2);
        ctx.fill();
        // Growth ridges: fat ticks across the outer sweep — readable
        // at world zoom, never hairlines.
        ctx.strokeStyle = shade(st.horns.color, -24);
        ctx.lineWidth = Math.max(1.5, s * 0.022);
        ctx.beginPath();
        for (const aa of [-0.35, 0.25]) {
          const tx = Math.cos(aa) * rr;
          const ty = Math.sin(aa) * rr;
          ctx.moveTo(tx - hw * 0.11, ty - hh * 0.06);
          ctx.lineTo(tx + hw * 0.11, ty + hh * 0.06);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineCap = 'butt';
    } else {
      // Horns sweep up and out — built from a sampled SPINE with real
      // taper: perpendicular offsets fat at the root closing to a
      // point, so the horn can NEVER collapse to a sliver (two
      // hand-laid edge curves twisted into a bowtie once — this is
      // the fix). The far horn narrows like the far eye.
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
        const bx = headX + es * hw * 0.84;
        const by = headY - hh * 0.6;
        const cxp = bx + es * hw * 0.64 * hz * wK;
        const cyp = by - hh * 0.32 * hz;
        const txp = bx + es * hw * 0.7 * hz * wK;
        const typ = by - hh * 0.98 * hz;
        const N = 7;
        const lft: Array<{ x: number; y: number }> = [];
        const rgt: Array<{ x: number; y: number }> = [];
        const px: number[] = [];
        const py: number[] = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const a0 = (1 - t) * (1 - t);
          const a1 = 2 * (1 - t) * t;
          const a2 = t * t;
          px.push(a0 * bx + a1 * cxp + a2 * txp);
          py.push(a0 * by + a1 * cyp + a2 * typ);
        }
        for (let i = 0; i <= N; i++) {
          const qx = px[Math.min(N, i + 1)]! - px[Math.max(0, i - 1)]!;
          const qy = py[Math.min(N, i + 1)]! - py[Math.max(0, i - 1)]!;
          const dl = Math.hypot(qx, qy) || 1;
          const w = hw * 0.23 * hz * (1 - (i / N) * 0.9) * (far ? 0.55 + wK * 0.45 : 1);
          lft.push({ x: px[i]! - (qy / dl) * w, y: py[i]! + (qx / dl) * w });
          rgt.push({ x: px[i]! + (qy / dl) * w, y: py[i]! - (qx / dl) * w });
        }
        ctx.fillStyle = st.horns.color;
        ctx.beginPath();
        ctx.moveTo(lft[0]!.x, lft[0]!.y);
        for (let i = 1; i <= N; i++) ctx.lineTo(lft[i]!.x, lft[i]!.y);
        for (let i = N; i >= 0; i--) ctx.lineTo(rgt[i]!.x, rgt[i]!.y);
        ctx.closePath();
        ctx.fill();
        // Growth ridges: fat ticks across the sweep — readable at
        // world zoom, never hairlines.
        ctx.strokeStyle = shade(st.horns.color, -22);
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.beginPath();
        for (const gi of [2, 4]) {
          ctx.moveTo(lft[gi]!.x, lft[gi]!.y);
          ctx.lineTo(rgt[gi]!.x, rgt[gi]!.y);
        }
        ctx.stroke();
        if (st.horns.tine) {
          // The bramble fork: a second, lower point splitting off the
          // main horn — one fork turns a horn into a thorn branch.
          // A fat wedge: curved top edge, straight chord home.
          ctx.fillStyle = shade(st.horns.color, -12);
          ctx.beginPath();
          ctx.moveTo(bx + es * hw * 0.04 * wK, by + hh * 0.1);
          ctx.quadraticCurveTo(
            bx + es * hw * 0.6 * wK,
            by - hh * 0.05 * hz,
            bx + es * hw * 0.98 * hz * wK,
            by - hh * 0.34 * hz,
          );
          ctx.lineTo(bx + es * hw * 0.34 * wK, by + hh * 0.22);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  if (st.tusks && !hurt && backK <= 0.55) {
    // Boar tusks: two fat ivory hooks curving up past the jaw line —
    // drawn WIDE at the root and TALL past the cheek; timid tusks
    // read as whiskers and a whiskered knight is no knight.
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
      const bx = headX + es * hw * 0.78 * wK + fx * headR * 0.18;
      const by = headY + hh * 0.68;
      ctx.fillStyle = st.tusks.color;
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.24 * wK, by);
      ctx.quadraticCurveTo(
        bx + es * hw * 0.68 * wK, by - hh * 0.04,
        bx + es * hw * 0.56 * wK, by - hh * 0.98,
      );
      ctx.quadraticCurveTo(bx + es * hw * 0.24 * wK, by - hh * 0.38, bx + es * hw * 0.1 * wK, by);
      ctx.closePath();
      ctx.fill();
      // Root shade seats the tusk in the jaw instead of floating on it.
      ctx.fillStyle = shade(st.tusks.color, -18);
      ctx.beginPath();
      ctx.moveTo(bx - es * hw * 0.2 * wK, by);
      ctx.quadraticCurveTo(bx + es * hw * 0.38 * wK, by - hh * 0.08, bx + es * hw * 0.36 * wK, by - hh * 0.4);
      ctx.lineTo(bx + es * hw * 0.14 * wK, by - hh * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (st.spikesCrown && !hurt) {
    // The spiked crown: forged points riding the centerline front-to-
    // back — rising spikes frontal, a full ridge of war at profile.
    // The crest grammar with teeth.
    const arcK = 0.35 + 0.65 * profileK;
    const baseY = headY - hh * 1.06;
    ctx.fillStyle = st.spikesCrown.color;
    for (let i = 0; i < 4; i++) {
      const u = (-0.66 + i * 0.44) * arcK;
      const px = headX + lead * u * hw;
      // The crown line bows like the skull: center spikes stand tallest.
      const seat = baseY - hh * 0.22 * (1 - u * u * 1.6);
      const tall = hh * (0.62 + 0.3 * (1 - Math.abs(u / arcK || 0)));
      const half = hw * 0.15 * (0.8 + 0.4 * arcK);
      ctx.beginPath();
      ctx.moveTo(px - half, seat);
      ctx.lineTo(px + lead * half * 0.1, seat - tall);
      ctx.lineTo(px + half, seat);
      ctx.closePath();
      ctx.fill();
    }
    // A seam bar seats the row on the crown.
    ctx.fillStyle = shade(st.spikesCrown.color, -20);
    ctx.fillRect(headX - hw * 0.8 * arcK, baseY - hh * 0.06, hw * 1.6 * arcK, hh * 0.1);
  }
  if (st.plume && !hurt) {
    // Crest: short center fin frontal, full arc at profile (its hero
    // read), falling tail from behind — the beard's band narrowing.
    ctx.fillStyle = st.plume.color;
    const arcK = 0.35 + 0.65 * profileK;
    ctx.beginPath();
    ctx.moveTo(headX - lead * hw * 0.7 * arcK, headY - hh * 1.02);
    ctx.quadraticCurveTo(headX, headY - hh * (1.5 + 0.35 * arcK), headX + lead * hw * 0.72 * arcK, headY - hh * 1.02);
    ctx.lineTo(headX + lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.quadraticCurveTo(headX, headY - hh * (1.3 + 0.28 * arcK), headX - lead * hw * 0.4 * arcK, headY - hh * 0.98);
    ctx.closePath();
    ctx.fill();
    if (backK > 0.55) {
      ctx.fillRect(headX - hw * 0.1, headY - hh * 1.0, hw * 0.2, hh * 1.1);
    }
  }
}

/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export function drawOffhandOnArm(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  arm: { ex: number; ey: number; kx: number; ky: number },
  s: number,
  profileK: number,
  hurt: boolean,
): void {
  const col = hurt ? '#ffffff' : st.color;
  if (st.kind === 'tome') {
    // A chunky book held flat in the off hand, spine toward the thumb.
    ctx.save();
    ctx.translate(arm.ex, arm.ey);
    ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx));
    ctx.fillStyle = col;
    ctx.beginPath();
    chamferRect(ctx, -0.02 * s, -0.085 * s, 0.16 * s, 0.17 * s, 0.02 * s);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.fillRect(-0.02 * s, -0.085 * s, 0.035 * s, 0.17 * s);
      ctx.fillStyle = shade(st.color, 22);
      ctx.fillRect(0.03 * s, -0.06 * s, 0.09 * s, 0.026 * s);
    }
    ctx.restore();
    return;
  }
  if (st.kind === 'orb') {
    // Floats just off the palm with a slow glint — the focus dialect.
    const ox = arm.ex;
    const oy = arm.ey - 0.05 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ox, oy, 0.062 * s, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.arc(ox - 0.018 * s, oy - 0.02 * s, 0.02 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // Shields ride the forearm midpoint, rotated with the bone; facing
  // squashes the face toward a rim at profile.
  const mx = (arm.kx + arm.ex) / 2;
  const my = (arm.ky + arm.ey) / 2;
  const faceK = 0.3 + 0.7 * (1 - profileK);
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(Math.atan2(arm.ey - arm.ky, arm.ex - arm.kx) + Math.PI / 2);
  if (st.kind === 'tower') {
    // A walking wall: tall slab, riveted border, center boss band. At
    // profile it collapses to a bright structural rim like the others.
    const w = 0.155 * s * faceK;
    const h = 0.34 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    chamferRect(ctx, -w, -h * 0.5, w * 2, h, 0.035 * s);
    ctx.fill();
    if (!hurt && faceK > 0.55) {
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      chamferRect(ctx, -w * 0.78, -h * 0.42, w * 1.56, h * 0.84, 0.025 * s);
      ctx.stroke();
      ctx.fillStyle = st.boss ?? shade(st.color, 22);
      ctx.fillRect(-w * 0.22, -h * 0.42, w * 0.44, h * 0.84);
      ctx.fillStyle = shade(st.color, -22);
      for (const ry of [-h * 0.36, h * 0.3]) {
        for (const rx of [-w * 0.6, w * 0.6]) {
          ctx.fillRect(rx - 0.011 * s, ry, 0.022 * s, 0.022 * s);
        }
      }
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(-w, -h * 0.5, w * 0.55, h);
    }
    ctx.restore();
    return;
  }
  if (st.kind === 'kite') {
    const w = 0.15 * s * faceK;
    const h = 0.24 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.45);
    ctx.lineTo(w, -h * 0.45);
    ctx.lineTo(w * 0.85, h * 0.15);
    ctx.lineTo(0, h * 0.62);
    ctx.lineTo(-w * 0.85, h * 0.15);
    ctx.closePath();
    ctx.fill();
    if (!hurt && faceK > 0.55) {
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -h * 0.2);
      ctx.lineTo(0, h * 0.12);
      ctx.lineTo(w * 0.55, -h * 0.2);
      ctx.lineTo(w * 0.3, -h * 0.28);
      ctx.lineTo(0, -h * 0.08);
      ctx.lineTo(-w * 0.3, -h * 0.28);
      ctx.closePath();
      ctx.fill();
    } else if (!hurt) {
      ctx.fillStyle = shade(st.color, 18);
      ctx.fillRect(-w, -h * 0.45, w * 0.5, h * 1.05);
    }
  } else {
    // Buckler: round face, trim ring, boss — spikes when frontal.
    const r = 0.115 * s;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * faceK, r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      if (faceK > 0.6) {
        if (st.spikes) {
          ctx.fillStyle = '#dde2ea';
          for (const a of [0.6, 2.2, 3.9, 5.5]) {
            const sx2 = Math.cos(a) * r * 1.28 * faceK;
            const sy2 = Math.sin(a) * r * 1.28;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a + 0.5) * r * 0.8 * faceK, Math.sin(a + 0.5) * r * 0.8);
            ctx.lineTo(sx2, sy2);
            ctx.lineTo(Math.cos(a - 0.5) * r * 0.8 * faceK, Math.sin(a - 0.5) * r * 0.8);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.strokeStyle = st.trim;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.72 * faceK, r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = st.boss ?? shade(st.color, 26);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.3 * faceK, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rim read at profile: a bright edge line.
        ctx.fillStyle = shade(st.color, 20);
        ctx.fillRect(-r * faceK, -r, r * faceK * 0.9, r * 2);
      }
    }
  }
  ctx.restore();
}

/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export function drawQuiver(
  ctx: CanvasRenderingContext2D,
  st: OffhandStyle,
  x: number,
  y: number,
  s: number,
  lead: number,
  hurt: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lead * 0.6);
  ctx.fillStyle = hurt ? '#ffffff' : st.color;
  ctx.beginPath();
  chamferRect(ctx, -0.05 * s, -0.16 * s, 0.1 * s, 0.3 * s, 0.03 * s);
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = st.trim;
    ctx.fillRect(-0.05 * s, -0.16 * s, 0.1 * s, 0.045 * s);
    // Fletching sprouting from the mouth.
    ctx.fillStyle = '#e6e0d0';
    for (const k of [-0.026, 0.004, 0.03]) {
      ctx.fillRect(k * s - 0.008 * s, -0.225 * s, 0.016 * s, 0.07 * s);
    }
  }
  ctx.restore();
}

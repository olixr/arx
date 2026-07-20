import { itemDef } from '@devcraft/content';
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
  pauldron: 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur' | 'feathered' | 'orbs';
  pauldronColor?: string;
  /** Bright edge accent on the pauldron rim / blade edge. */
  pauldronTrim?: string;
  /** Spike count for 'spiked' pauldrons, 1..3. Default 1. */
  pauldronSpikes?: number;
  chest: 'none' | 'straps' | 'plate' | 'emblem' | 'stitch' | 'scales';
  /** Hanging leather fringe strips off the chest yoke — the buckskin read. */
  fringe?: boolean;
  /** Big mismatched cloth patches with stitch ticks — the homespun read. */
  patches?: string;
  emblem?: 'chevron' | 'diamond' | 'bolt' | 'skull' | 'sun' | 'leaf' | 'star' | 'moon' | 'eye' | 'moth';
  /** Glowing rune dashes riding the hem trim — the enchanted-cloth read. */
  runes?: string;
  /** A waist sash: band, hip knot, two swinging tails. */
  sash?: string;
  /** Hip plates hanging from the fauld — the heavy-knight lower read. */
  tassets?: boolean;
  /** Robe/coat skirt length below the belt line, tiles. 0 = none. */
  skirt: number;
  skirtSlit?: boolean;
  /** drawArm sleeve override. Default shade(color, -12) — today's law. */
  sleeve?: string;
  /** Neck treatment: plate gorget ring or a fur ruff. */
  collar?: 'gorget' | 'fur';
  /** A belt pouch on the hip — the adventurer's secondary read. */
  pouch?: boolean;
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
}

export interface HelmStyle {
  color: string;
  trim: string;
  kind: 'dome' | 'greathelm' | 'hood' | 'circlet' | 'horned' | 'wizard';
  noseGuard?: boolean;
  visor?: 'slit' | 'cross';
  plume?: { color: string };
  horns?: { color: string; size: number };
  /** Swept-back side fins — blade silhouettes off the temples. */
  fins?: { color: string };
  /** Upswept feathered wing blades — the valkyrie read. */
  wings?: { color: string };
  /** A solid metal ridge crest riding the crown centerline. */
  crest?: { color: string };
  /** Cheek/jaw guard plates flanking the face opening. */
  jaw?: string;
  /** Wizard hats: a band buckle / star charm on the crown. */
  charm?: string;
  /** Hoods: a lumpy fur ruff ringing the face opening. */
  ruff?: { color: string };
  /** Hoods: pricked wolf-ear points on the crown. */
  ears?: { color: string };
  /** Hoods: a swept feather tucked at the temple, trailing back. */
  feather?: { color: string };
  /** Hoods: a half-mask across the lower face — the rogue read. */
  mask?: string;
  /** Hoods: two bold curled moth feelers off the crown, clubbed tips. */
  antennae?: { color: string };
  /** Hoods: branched ivory antlers — the forest-king crown. */
  antlers?: { color: string };
  /** Hoods/domes: a cut gem set at the brow band. */
  gem?: { color: string };
  /** A floating ring above the crown that never quite touches down. */
  halo?: { color: string };
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

export interface OffhandStyle {
  kind: 'buckler' | 'kite' | 'tower' | 'tome' | 'quiver' | 'orb';
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
  },
  emberweave_robe: {
    color: '#c4553d', trim: '#e8a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.34, skirtSlit: true, glowTrim: '#ffb054',
    sleeves: 'full', mantle: '#8a3428', underskirt: '#7e2f24',
    motes: '#ffc26a',
  },
  leather_body: {
    color: '#b08a5c', trim: '#6b4a26', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true,
  },
  huntsman_jerkin: {
    color: '#3f6b3a', trim: '#2e4a28', metal: '#6b4a26', cls: 'leather',
    silhouette: 'brigandine', pauldron: 'layered', pauldronColor: '#5a3f1e',
    chest: 'straps', skirt: 0.12, collar: 'fur', pouch: true,
  },
  iron_platebody: {
    color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', chest: 'plate', skirt: 0,
    collar: 'gorget',
  },
  steel_platebody: {
    color: '#b8bec8', trim: '#c9a23c', metal: '#d4dae2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', chest: 'plate',
    emblem: 'diamond', skirt: 0, collar: 'gorget',
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
  },
  wolfstalker_jerkin: {
    color: '#5f6470', trim: '#424652', metal: '#9aa0ae', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#9aa0ae',
    chest: 'straps', skirt: 0, collar: 'fur', pouch: true,
  },
  nightveil_jerkin: {
    color: '#3a3648', trim: '#6a5a8c', metal: '#8c4a5a', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true,
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
  hedgewitch_robe: {
    color: '#5a6b3a', trim: '#c9a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.32,
    sash: '#c9a23c', sleeves: 'full', underskirt: '#42502c', pouch: true,
  },
  tidecaller_robe: {
    color: '#2f6a78', trim: '#bfe8e0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'moon',
    skirt: 0.34, runes: '#bfe8e0', sleeves: 'full',
    underskirt: '#1f4a55', motes: '#bfe8e0',
  },
  voidwhisper_robe: {
    color: '#453a5c', trim: '#b8a8d8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'eye',
    skirt: 0.34, skirtSlit: true, sash: '#2e2740', sleeves: 'full',
    underskirt: '#332b47', motes: '#9a86c8',
  },
  cindersworn_robe: {
    color: '#4a3a38', trim: '#e05438', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.34,
    sash: '#8a2f24', glowTrim: '#ff9a4a', runes: '#ff9a4a',
    sleeves: 'full', mantle: '#3a2d2b', underskirt: '#332826',
    motes: '#ffb054',
  },
  starweaver_robe: {
    color: '#2c3260', trim: '#c8cee8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'orbs', pauldronColor: '#9db6ff',
    chest: 'emblem', emblem: 'star', skirt: 0.36, runes: '#c8cee8',
    sleeves: 'full', mantle: '#232850', underskirt: '#1e2244',
    motes: '#aebeff',
  },
  // The early-game cloth sets: five color stories for the leveling
  // road. Each ships in four dye lots via registerColorways below.
  thistledown_robe: {
    color: '#c9bfa3', trim: '#8a7a5c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.3,
    patches: '#8a9a6a', sash: '#8a7a5c', underskirt: '#b0a688',
  },
  mothwing_robe: {
    color: '#8a8a72', trim: '#d8d4b8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'moth',
    skirt: 0.32, sleeves: 'full', underskirt: '#6e6e5a', motes: '#d8d4b8',
  },
  dawnsworn_robe: {
    color: '#d9c9a0', trim: '#c9922f', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'sun',
    skirt: 0.32, sash: '#b0703c', sleeves: 'full', underskirt: '#b8a87e',
  },
  fenwalker_robe: {
    color: '#4a6b5c', trim: '#a8c8a0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'leaf',
    skirt: 0.34, runes: '#9ae8c8', sleeves: 'full', underskirt: '#3a564a',
    motes: '#9ae8c8',
  },
  stormwoven_robe: {
    color: '#4e5a78', trim: '#e8d878', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.34, runes: '#a8c4e8', sleeves: 'full', mantle: '#3e4860',
    underskirt: '#3c4660',
  },
};

export const HELM_STYLES: Record<string, HelmStyle> = {
  flower_crown: { color: '#e8c04c', trim: '#79a355', kind: 'circlet' },
  iron_helm: { color: '#8d9299', trim: '#6a6f7d', kind: 'dome', noseGuard: true },
  leather_hood: { color: '#8a6a45', trim: '#6b4a26', kind: 'hood' },
  wolfhide_hood: { color: '#6a6f7d', trim: '#9aa0ae', kind: 'hood' },
  runecloth_cowl: { color: '#7a5ac4', trim: '#c9a8e8', kind: 'hood' },
  wizards_hat: { color: '#4a5a9c', trim: '#c9a23c', kind: 'wizard', charm: '#e8d06a' },
  steel_greathelm: {
    color: '#b8bec8', trim: '#8d9299', kind: 'greathelm',
    visor: 'slit', plume: { color: '#8a2f3c' },
  },
  horned_raider_helm: {
    color: '#7d6a52', trim: '#5a4a38', kind: 'horned',
    noseGuard: true, horns: { color: '#e6e0d0', size: 1 },
  },
  warden_helm: {
    color: '#4a7a5a', trim: '#6f9a7f', kind: 'dome',
    noseGuard: true, crest: { color: '#b0703c' },
  },
  frostplate_helm: {
    color: '#9db6cc', trim: '#7a94ac', kind: 'dome',
    noseGuard: true, fins: { color: '#cfe0ee' },
  },
  bulwark_greathelm: {
    color: '#5a6270', trim: '#b08a3c', kind: 'greathelm', visor: 'cross',
  },
  dreadforge_helm: {
    color: '#4a4553', trim: '#a83232', kind: 'horned', noseGuard: true,
    horns: { color: '#35313e', size: 1.45 }, jaw: '#625c6e',
  },
  sunforged_helm: {
    color: '#d4a43c', trim: '#e8c05c', kind: 'dome',
    noseGuard: true, wings: { color: '#e8e2d0' },
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
  drakescale_coif: {
    color: '#8c3a32', trim: '#c9713c', kind: 'dome',
    noseGuard: true, jaw: '#c9713c',
  },
  stagheart_hood: {
    color: '#6b5138', trim: '#3e5a30', kind: 'hood',
    antlers: { color: '#e6e0d0' }, ruff: { color: '#8a7a52' },
  },
  hedgewitch_hat: {
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
  hedgewitch_skirts: { kind: 'pants', thigh: '#4e5c33' },
  tidecaller_skirts: { kind: 'pants', thigh: '#245562' },
  voidwhisper_skirts: { kind: 'pants', thigh: '#332b47' },
  cindersworn_skirts: { kind: 'pants', thigh: '#3a2d2b' },
  starweaver_skirts: { kind: 'pants', thigh: '#232850' },
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
  hedgewitch_slippers: { color: '#8a7a3c', height: 0.07, curl: true },
  tidecaller_slippers: { color: '#1f4a55', height: 0.08, cuff: { color: '#bfe8e0' } },
  voidwhisper_slippers: { color: '#2e2740', height: 0.08, cuff: { color: '#b8a8d8' } },
  cindersworn_slippers: { color: '#332826', height: 0.08, cuff: { color: '#e05438' } },
  starweaver_slippers: { color: '#232850', height: 0.08, curl: true, cuff: { color: '#c8cee8' } },
};

export const OFFHAND_STYLES: Record<string, OffhandStyle> = {
  spiked_buckler: { kind: 'buckler', color: '#8a744a', trim: '#6b5a38', boss: '#dde2ea', spikes: true },
  oak_kiteshield: { kind: 'kite', color: '#6b4a26', trim: '#a4744b', emblem: 'chevron' },
  frost_quiver: { kind: 'quiver', color: '#8ac4e8', trim: '#4a6a8a' },
  tome_of_embers: { kind: 'tome', color: '#e8763c', trim: '#6b3a1e' },
  arcane_orb: { kind: 'orb', color: '#8f9ed6', trim: '#c9c4cf' },
  tower_shield: { kind: 'tower', color: '#8d9299', trim: '#6a6f7d', boss: '#b0b6be' },
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
  duskvow: { color: '#9a6a86', trim: '#e0b0c0', sash: '#6e4860', underskirt: '#7e5670' },
  highnoon: { color: '#eae4d2', trim: '#c04a3a', sash: '#b0703c', underskirt: '#c8c2b0' },
  eclipse: { color: '#4a4550', trim: '#d4a43c', sash: '#38343e', underskirt: '#3a3642' },
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

// ---------------------------------------------------------- resolvers

/** Unknown body item: a plain tunic in the item's color — today's read. */
export function bodyStyle(itemId: string): BodyStyle {
  const st = BODY_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a7a5f';
  return { color: c, trim: shade(c, -20), cls: 'cloth', silhouette: 'tunic', pauldron: 'none', chest: 'none', skirt: 0 };
}

/** Unknown head item: the classic tinted dome — today's helmet. */
export function helmStyle(itemId: string): HelmStyle {
  const st = HELM_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8d9299';
  return { color: c, trim: shade(c, -22), kind: 'dome', noseGuard: true };
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

export function offhandStyle(itemId: string): OffhandStyle {
  const st = OFFHAND_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a744a';
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
    const hemY = 0.02 * s + st.skirt * s;
    const hemW = ww * 1.3;
    const stride = f.strideSw * 0.025 * s;
    const trail = f.dragX === 0 ? 0 : Math.sign(f.dragX);
    // Five hem points, left to right; drag bows the middle hardest,
    // flutter gives each point its own beat, speed lifts the trailing
    // edge so the cloth planes out behind a sprint.
    const hem: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const bx = -hemW + u * 2 * hemW;
      const flutter =
        Math.sin(nowMs * 0.005 + i * 1.9) * 0.013 * s * (0.3 + 0.7 * runF) +
        stride * Math.sin(u * Math.PI);
      const dx = f.dragX * (0.5 + 0.4 * Math.sin(u * Math.PI)) * s + flutter;
      const lift =
        runF * 0.055 * s * Math.max(0, (bx * trail) / hemW) +
        Math.abs(f.dragX) * 0.18 * s * Math.sin(u * Math.PI) * runF;
      hem.push({ x: bx + dx, y: hemY - lift });
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
      if (st.skirtSlit && !back) {
        // The center slit lets the stride read through the cloth.
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
      } else if (st.chest === 'plate') {
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
        // A mantle claims the upper chest — the emblem sits below it.
        const ey = -th * (st.mantle ? 0.3 : 0.58);
        const r = tw * 0.3;
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
          // The occult device: an unblinking almond eye. It reads back.
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
        } else {
        ctx.beginPath();
        if (st.emblem === 'chevron') {
          ctx.moveTo(-r, ey - r * 0.4);
          ctx.lineTo(0, ey + r * 0.5);
          ctx.lineTo(r, ey - r * 0.4);
          ctx.lineTo(r * 0.55, ey - r * 0.55);
          ctx.lineTo(0, ey);
          ctx.lineTo(-r * 0.55, ey - r * 0.55);
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
      if (st.silhouette === 'cuirass') {
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
        const my = 0.05 * s + st.skirt * s - cyc * (th + st.skirt * s) * 0.9;
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
      // Pricked wolf ears on the crown; dark inner ear when frontal.
      for (const es of [-1, 1]) {
        const far = es !== lead;
        const wK = far ? Math.max(0.3, 1 - profileK * 0.65) : 1;
        const bx = headX + es * hw * 0.58;
        const by = headY - hh * 1.02;
        ctx.fillStyle = st.ears.color;
        ctx.beginPath();
        ctx.moveTo(bx - es * hw * 0.26 * wK, by);
        ctx.lineTo(bx + es * hw * 0.14 * wK, by - hh * 0.62);
        ctx.lineTo(bx + es * hw * 0.36 * wK, by + hh * 0.06);
        ctx.closePath();
        ctx.fill();
        if (backK <= 0.55) {
          ctx.fillStyle = shade(st.ears.color, -26);
          ctx.beginPath();
          ctx.moveTo(bx - es * hw * 0.1 * wK, by - hh * 0.04);
          ctx.lineTo(bx + es * hw * 0.12 * wK, by - hh * 0.42);
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

  // Metal family: dome (original), greathelm (full face), horned.
  const full = st.kind === 'greathelm';
  ctx.fillStyle = mc;
  ctx.beginPath();
  chamferRect(ctx, headX - hw * 1.06, headY - hh * 1.1, hw * 2.12, hh * (full ? 2.08 : 1.06), cut);
  ctx.fill();
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
  if (full) {
    if (!hurt && backK <= 0.55) {
      // Visor cut tracks the face like the eyes do (the pairX law).
      const vx = headX + fx * headR * 0.36;
      ctx.fillStyle = '#170f1c';
      if (st.visor === 'cross') {
        ctx.fillRect(vx - headR * 0.07, headY - hh * 0.05, headR * 0.14, hh * 0.6);
        ctx.fillRect(vx - headR * 0.4, headY + hh * 0.08, headR * 0.8, hh * 0.16);
      } else {
        const sw = 1 - profileK * 0.45;
        ctx.fillRect(vx - headR * 0.42 * sw, headY + hh * 0.02, headR * 0.84 * sw, hh * 0.15);
      }
    } else if (!hurt) {
      // Plain back plates: a riveted seam instead of a face.
      ctx.fillStyle = shade(st.color, -14);
      ctx.fillRect(headX - 0.01 * s, headY - hh * 0.9, 0.02 * s, hh * 1.7);
    }
  } else if (st.noseGuard) {
    ctx.fillStyle = mc;
    if (backK < 0.4 && profileK < 0.6) {
      ctx.fillRect(headX + fx * headR * 0.36 - headR * 0.09, headY - hh * 0.16, headR * 0.18, hh * 0.62);
    } else if (backK < 0.4) {
      ctx.fillRect(headX - lead * hw * 1.02, headY - hh * 0.16, hw * 0.58, hh * 0.6);
    }
  }
  if (st.jaw && !hurt && backK <= 0.55 && !full) {
    // Cheek guards flank the face opening — the war-mask read.
    ctx.fillStyle = st.jaw;
    for (const es of [-1, 1]) {
      const near = es === lead;
      ctx.beginPath();
      chamferRect(
        ctx,
        headX + es * hw * (near ? 0.66 : 0.78) - hw * 0.19,
        headY - hh * 0.1,
        hw * 0.38,
        hh * (near ? 0.72 : 0.6),
        cut * 0.5,
      );
      ctx.fill();
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
    // Horns sweep up and out; the far horn narrows like the far eye.
    ctx.fillStyle = st.horns.color;
    const hz = st.horns.size;
    for (const es of [-1, 1]) {
      const far = es !== lead;
      const wK = far ? Math.max(0.25, 1 - profileK * 0.7) : 1;
      const bx = headX + es * hw * 0.9;
      const by = headY - hh * 0.75;
      ctx.beginPath();
      ctx.moveTo(bx, by + hh * 0.22 * wK);
      ctx.quadraticCurveTo(
        bx + es * hw * 0.55 * hz * wK,
        by - hh * 0.25 * hz,
        bx + es * hw * 0.62 * hz * wK,
        by - hh * 0.85 * hz,
      );
      ctx.lineTo(bx + es * hw * 0.28 * wK, by - hh * 0.2);
      ctx.closePath();
      ctx.fill();
    }
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

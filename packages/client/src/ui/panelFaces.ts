/**
 * THE PANEL'S FACE TABLES (foundations F7 endgame) — the wield words,
 * skill faces and station faces both panel hosts and their split wings
 * read. A leaf on purpose: tables flow downhill, and the last value
 * edges between wing and host die.
 */
/** The when clause's word for each weapon style in hand. */
export const WIELD_WORD: Record<string, string> = {
  onehand: 'a one-hand blade',
  twohand: 'a two-hander',
  polearm: 'a polearm',
  archery: 'a bow',
  arx: 'a staff',
};

/**
 * Every skill's face: an item that embodies the craft, and an accent
 * the card's plaque and meter wear. Pure data — a new skill is a row.
 */
export const SKILL_FACE: Record<string, { icon: string; color: string }> = {
  vitality: { icon: 'bread', color: '#d95763' },
  combat: { icon: 'iron_helm', color: '#b0623c' },
  onehand: { icon: 'bronze_sword', color: '#c4553d' },
  defence: { icon: 'oak_kiteshield', color: '#8ac4e8' },
  archery: { icon: 'stickbow', color: '#7dc46a' },
  arx: { icon: 'apprentice_staff', color: '#b49af0' },
  mining: { icon: 'bronze_pickaxe', color: '#9aa2ac' },
  woodcutting: { icon: 'bronze_axe', color: '#b08a5c' },
  fishing: { icon: 'fishing_rod', color: '#7fb2d9' },
  smithing: { icon: 'bronze_bar', color: '#e8944a' },
  woodworking: { icon: 'oak_log', color: '#a8794a' },
  leatherworking: { icon: 'leather', color: '#b08a5c' },
  tailoring: { icon: 'cloth', color: '#c9a8e8' },
  cooking: { icon: 'trout', color: '#e8b64c' },
  construction: { icon: 'log', color: '#c98d4b' },
  farming: { icon: 'carrot', color: '#7ac46a' },
  foraging: { icon: 'berries', color: '#9ac46a' },
  herbalism: { icon: 'sagewort', color: '#7ac4a0' },
  enchanting: { icon: 'arcane_dust', color: '#b49af0' },
  beastcraft: { icon: 'bones', color: '#c4b590' },
  sneak: { icon: 'bronze_dagger', color: '#8a7fae' },
  twohand: { icon: 'iron_greatblade', color: '#c47a3d' },
  // The reaching school's coin wears the CREST (the head half zoomed
  // to the box), not the item icon — a full-length spear at coin size
  // reads as a hairline.
  polearm: { icon: 'polearm_crest', color: '#9a8560' },
  dualwield: { icon: 'bronze_dagger', color: '#d9a441' },
  shield: { icon: 'tower_shield', color: '#9db6cc' },
};

/** Every crafting station's face: name, icon, accent, and craft verb. */
export const STATION_FACE: Record<
  string,
  { label: string; icon: string | null; accent: string; verb: string; hint: string }
> = {
  fire: {
    label: 'Cooking',
    icon: 'trout',
    accent: '#e8944a',
    verb: 'Cook',
    hint: 'The fire is lit. Raw makings come straight from your pack.',
  },
  furnace: {
    label: 'Smelting',
    icon: 'bronze_bar',
    accent: '#ff8a4a',
    verb: 'Smelt',
    hint: 'Ore in, bars out. The furnace does not negotiate.',
  },
  anvil: {
    label: 'Smithing',
    icon: 'bronze_sword',
    accent: '#9aa2ac',
    verb: 'Forge',
    hint: 'Bars become blades here. Bring metal and intent.',
  },
  workbench: {
    label: 'Handiwork',
    icon: null,
    accent: '#d9a441',
    verb: 'Make',
    hint: 'Work that needs only your two hands.',
  },
  alembic: {
    label: 'Herbalism',
    icon: 'sagewort',
    accent: '#7ac4a0',
    verb: 'Brew',
    hint: 'Leaf and root, distilled to their useful truth.',
  },
  tanning_rack: {
    label: 'Leatherworking',
    icon: 'leather',
    accent: '#b08a5c',
    verb: 'Cure',
    hint: 'Hides cure into armor under patient hands.',
  },
  loom: {
    label: 'Tailoring',
    icon: 'cloth',
    accent: '#c9a8e8',
    verb: 'Weave',
    hint: 'Thread crosses thread until it counts as cloth.',
  },
  carving_bench: {
    label: 'Woodworking',
    icon: 'oak_log',
    accent: '#a8794a',
    verb: 'Carve',
    hint: 'Lumber shaped to purpose, one pass at a time.',
  },
  enchanting_table: {
    label: 'Enchanting',
    icon: 'arcane_dust',
    accent: '#b49af0',
    verb: 'Bind',
    hint: 'Power pressed into gear, for good.',
  },
  sawhorse: {
    label: 'Sawing',
    icon: 'board',
    accent: '#c98d4b',
    verb: 'Saw',
    hint: 'One log, three boards. The saw keeps an honest count.',
  },
};

export const HANDIWORK_FACE = STATION_FACE.workbench!;

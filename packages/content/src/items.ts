import type { EquipSlot, PassiveId } from '@devcraft/shared';

export type ToolType = 'axe' | 'pickaxe' | 'rod';
export type CombatStyle = 'melee' | 'archery' | 'magic';

export interface WeaponStats {
  style: CombatStyle;
  /** Max hit before level scaling. */
  damage: number;
  /** Ticks between attacks. */
  cooldownTicks: number;
  /** Reach (melee) or projectile range in tiles. */
  range: number;
  /** Ammo item consumed per shot (archery). */
  ammo?: string;
  /** Projectile speed, tiles/sec (ranged styles). */
  projectileSpeed?: number;
  /** Weapon Art — the signature ability this weapon grants (Q). */
  art?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  stackable: boolean;
  /** Vendor value in coins. */
  value: number;
  equipSlot?: EquipSlot;
  /** Gathering tool kind + power (higher = faster gathering). */
  tool?: { type: ToolType; power: number };
  weapon?: WeaponStats;
  /** Defence bonus when equipped (armor). */
  armor?: number;
  /** HP restored when eaten. */
  heals?: number;
  /** Relic active ability granted while worn in the relic slot (E). */
  relic?: string;
  /** Sigil ultimate granted while worn in the sigil slot (T). */
  sigil?: string;
  /** Gear-carried passive (shown in the hotbar tray while worn). */
  passive?: PassiveId;
  /** Short display color for the placeholder icon. */
  color: string;
  /** Two-letter icon code until real icons land. */
  code: string;
  /** One-line flavor text for the inspect card. */
  desc?: string;
}

const defs: ItemDef[] = [
  { id: 'coins', name: 'Coins', stackable: true, value: 1, desc: 'The realm\'s only universal language.', color: '#f2c94c', code: 'GP' },

  // Logs
  { id: 'log', name: 'Logs', stackable: false, value: 4, desc: 'Fresh-cut timber, still smelling of the woods.', color: '#8a6a45', code: 'Lg' },
  { id: 'oak_log', name: 'Oak logs', stackable: false, value: 12, desc: 'Dense oak heartwood — bowyers pay well for it.', color: '#6b4a26', code: 'Ok' },

  // Ores
  { id: 'copper_ore', name: 'Copper ore', stackable: false, value: 6, desc: 'Soft red-brown ore. Half of every bronze bar.', color: '#b87333', code: 'Cu' },
  { id: 'tin_ore', name: 'Tin ore', stackable: false, value: 6, desc: 'Pale ore that hardens copper into bronze.', color: '#c9c4cf', code: 'Sn' },
  { id: 'iron_ore', name: 'Iron ore', stackable: false, value: 18, desc: 'Rust-flecked stone with real metal in its bones.', color: '#8d9299', code: 'Fe' },
  { id: 'coal', name: 'Coal', stackable: false, value: 22, desc: 'Black rock that burns hot enough for steelwork.', color: '#2e2b33', code: 'Co' },
  { id: 'gold_ore', name: 'Gold ore', stackable: false, value: 45, desc: 'Glittering seams of the mountain\'s treasure.', color: '#e8b64c', code: 'Au' },

  // Fish & food
  { id: 'raw_trout', name: 'Raw trout', stackable: false, value: 8, desc: 'A river trout, cold and slick. Cook it over a fire.', color: '#7fb2d9', code: 'Tr' },
  { id: 'raw_chicken', name: 'Raw chicken', stackable: false, value: 4, desc: 'Best not eaten as-is. The fire fixes that.', color: '#e8c9b0', code: 'Ch' },
  { id: 'raw_beef', name: 'Raw beef', stackable: false, value: 5, desc: 'A hearty cut from the pasture. Needs a fire.', color: '#c46a5a', code: 'Bf' },

  // Cooked food (heals on click)
  { id: 'trout', name: 'Trout', stackable: false, value: 12, heals: 4, desc: 'Flaky and hot off the fire.', color: '#d98a6a', code: 'Tr' },
  { id: 'cooked_chicken', name: 'Cooked chicken', stackable: false, value: 7, heals: 3, desc: 'Simple food that keeps an adventurer standing.', color: '#d9a86a', code: 'Ch' },
  { id: 'cooked_beef', name: 'Cooked beef', stackable: false, value: 8, heals: 4, desc: 'A proper meal after a proper fight.', color: '#b06a4a', code: 'Bf' },
  { id: 'burnt_food', name: 'Burnt food', stackable: false, value: 1, desc: 'You looked away for one moment. It noticed.', color: '#3a363f', code: 'Bt' },

  // Metal bars
  { id: 'bronze_bar', name: 'Bronze bar', stackable: false, value: 16, desc: 'The classic alloy — one part copper, one part tin.', color: '#a4744b', code: 'Bb' },
  { id: 'iron_bar', name: 'Iron bar', stackable: false, value: 30, desc: 'Honest metal, ready for the anvil.', color: '#8d9299', code: 'Ib' },
  { id: 'steel_bar', name: 'Steel bar', stackable: false, value: 80, desc: 'Iron improved by coal and patience.', color: '#b8bec8', code: 'Sb' },
  { id: 'gold_bar', name: 'Gold bar', stackable: false, value: 95, desc: 'Soft, heavy, and worth its weight in itself.', color: '#f2c94c', code: 'Gb' },

  // Crafting materials & gear
  { id: 'leather', name: 'Leather', stackable: false, value: 12, desc: 'Cured hide, supple and strong.', color: '#b08a5c', code: 'Le' },
  {
    id: 'leather_body',
    name: 'Leather body',
    stackable: false,
    value: 40,
    equipSlot: 'body',
    armor: 2,
    desc: 'Boiled leather that turns a blade\'s first bite.',
    color: '#b08a5c',
    code: 'LB',
  },
  {
    id: 'iron_sword',
    name: 'Iron sword',
    stackable: false,
    value: 90,
    equipSlot: 'weapon',
    // Better metal, longer blade: reach is part of the upgrade.
    weapon: { style: 'melee', damage: 2, cooldownTicks: 7, range: 1.95, art: 'lunge' },
    desc: 'A longer reach and a colder edge than bronze.',
    color: '#8d9299',
    code: 'Is',
  },
  {
    id: 'steel_sword',
    name: 'Steel sword',
    stackable: false,
    value: 240,
    equipSlot: 'weapon',
    weapon: { style: 'melee', damage: 3, cooldownTicks: 7, range: 2.05, art: 'shockwave' },
    desc: 'Anvil-song made solid. It hums when it swings.',
    color: '#b8bec8',
    code: 'Ss',
  },
  // Smithed valuables — the goldsmith's vendor line.
  { id: 'gold_ring', name: 'Gold ring', stackable: false, value: 180, desc: 'A goldsmith\'s staple. Vendors adore them.', color: '#f2c94c', code: 'Gr' },

  // Monster drops
  { id: 'bones', name: 'Bones', stackable: false, value: 2, desc: 'Every creature leaves some behind.', color: '#e6e0d0', code: 'Bn' },
  { id: 'feather', name: 'Feather', stackable: true, value: 1, desc: 'Light as rumor. Fletchers want them by the fistful.', color: '#f4efe4', code: 'Ft' },
  { id: 'cowhide', name: 'Cowhide', stackable: false, value: 8, desc: 'A whole hide, ready for the tanner\'s bench.', color: '#a08468', code: 'Hd' },
  { id: 'wolf_fur', name: 'Wolf fur', stackable: false, value: 20, desc: 'Thick winter fur, smoke-grey and warm.', color: '#6a6f7d', code: 'Wf' },

  // Weapons — one per combat style to start.
  {
    id: 'bronze_sword',
    name: 'Bronze sword',
    stackable: false,
    value: 32,
    equipSlot: 'weapon',
    // Hack-and-slash cadence: swings every 0.35 s that chip small; the
    // combo finisher and Arts carry the big numbers.
    weapon: { style: 'melee', damage: 1, cooldownTicks: 7, range: 1.7, art: 'crescent_sweep' },
    desc: 'Every hero\'s first blade. Swings quick, bites small.',
    color: '#a4744b',
    code: 'Sw',
  },
  {
    id: 'oak_shortbow',
    name: 'Oak shortbow',
    stackable: false,
    value: 40,
    equipSlot: 'weapon',
    // Hold-to-draw: damage/speed/range scale with the draw; the cooldown
    // is just release recovery — pacing lives in the draw itself.
    weapon: {
      style: 'archery',
      damage: 5,
      cooldownTicks: 8,
      range: 7,
      ammo: 'arrow',
      projectileSpeed: 16,
      art: 'volley',
    },
    desc: 'Draw deep and the arrow flies true and hard.',
    color: '#8a6a45',
    code: 'Bw',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    stackable: true,
    value: 2,
    desc: 'Feather, shaft, and a broad iron head.',
    color: '#c4b590',
    code: 'Ar',
  },
  {
    id: 'apprentice_staff',
    name: 'Apprentice staff',
    stackable: false,
    value: 45,
    equipSlot: 'weapon',
    weapon: {
      // Rapid chip bolts — the wand rhythm is bolt-bolt-HEAVY; its real
      // power lives in the heavy beat and the Art (statuses, reactions).
      style: 'magic',
      damage: 1,
      cooldownTicks: 8,
      range: 7,
      projectileSpeed: 13,
      art: 'frost_nova',
    },
    desc: 'A student\'s wand — bolt, bolt, then the heavy beat.',
    color: '#7a5ac4',
    code: 'St',
  },
  {
    id: 'ember_staff',
    name: 'Ember staff',
    stackable: false,
    value: 210,
    equipSlot: 'weapon',
    weapon: {
      style: 'magic',
      damage: 2,
      cooldownTicks: 8,
      range: 7,
      projectileSpeed: 13,
      art: 'fireburst',
    },
    desc: 'Warm to the touch. Its bolts leave scorch marks.',
    color: '#c4623c',
    code: 'Es',
  },
  {
    id: 'willow_longbow',
    name: 'Willow longbow',
    stackable: false,
    value: 190,
    equipSlot: 'weapon',
    weapon: {
      style: 'archery',
      damage: 6,
      cooldownTicks: 9,
      range: 8,
      ammo: 'arrow',
      projectileSpeed: 17,
      art: 'piercing_bolt',
    },
    desc: 'Willow bends far and sends arrows farther.',
    color: '#6b8a5a',
    code: 'Wl',
  },

  // Relics — worn actives (E). The Minecraft-Dungeons-artifact slot:
  // your second ability comes from the trinket you hunt down, so build
  // identity is a loot chase, not a menu pick.
  {
    id: 'ember_charm',
    name: 'Ember charm',
    stackable: false,
    value: 260,
    equipSlot: 'relic',
    relic: 'ember_dash',
    desc: 'A coal that never cooled, caged in copper wire.',
    color: '#ff8a3c',
    code: 'Ec',
  },
  {
    id: 'verdant_totem',
    name: 'Verdant totem',
    stackable: false,
    value: 320,
    equipSlot: 'relic',
    relic: 'healing_totem',
    desc: 'Carved wood that remembers the forest\'s kindness.',
    color: '#7ac47a',
    code: 'Vt',
  },
  {
    id: 'snare_kit',
    name: 'Snare kit',
    stackable: false,
    value: 220,
    equipSlot: 'relic',
    relic: 'snare_trap',
    desc: 'Cord, stakes, and a hunter\'s patience.',
    color: '#a08a4a',
    code: 'Sk',
  },
  {
    id: 'storm_bell',
    name: 'Storm bell',
    stackable: false,
    value: 340,
    equipSlot: 'relic',
    relic: 'storm_bell',
    desc: 'Ring it and the sky answers back.',
    color: '#e8e06a',
    code: 'Sb',
  },
  {
    id: 'straw_decoy',
    name: 'Straw decoy',
    stackable: false,
    value: 200,
    equipSlot: 'relic',
    relic: 'hunters_decoy',
    desc: 'From a distance, it\'s you. Close up, it\'s straw.',
    color: '#c4a35a',
    code: 'Sd',
  },

  // Sigils — boss-trophy ultimates (T). One per boss, forever.
  {
    id: 'sigil_fallen_champion',
    name: 'Sigil of the Fallen Champion',
    stackable: false,
    value: 1200,
    equipSlot: 'sigil',
    sigil: 'bone_tempest',
    desc: 'Torn from the champion\'s brow. The bones still answer it.',
    color: '#e8e2d0',
    code: 'Sc',
  },

  // Passive gear — the offhand slot carries your style passive; a
  // crafted cloak covers the scrapper. Build layering, not stat sticks.
  {
    id: 'spiked_buckler',
    name: 'Spiked buckler',
    stackable: false,
    value: 180,
    equipSlot: 'offhand',
    armor: 1,
    passive: 'thorns',
    desc: 'Blocking with it is an attack of its own.',
    color: '#8a744a',
    code: 'Sb',
  },
  {
    id: 'frost_quiver',
    name: 'Frost quiver',
    stackable: false,
    value: 240,
    equipSlot: 'offhand',
    passive: 'chill_charged',
    desc: 'Arrows drawn from it come out rimed with cold.',
    color: '#8ac4e8',
    code: 'Fq',
  },
  {
    id: 'tome_of_embers',
    name: 'Tome of Embers',
    stackable: false,
    value: 260,
    equipSlot: 'offhand',
    passive: 'ember_bolt',
    desc: 'The margins are singed. The last page is ash.',
    color: '#e8763c',
    code: 'Te',
  },
  {
    id: 'wolf_pelt_cloak',
    name: 'Wolf-pelt cloak',
    stackable: false,
    value: 220,
    equipSlot: 'cape',
    armor: 1,
    passive: 'dodge_haste',
    desc: 'Wolves dodge sideways out of trouble. Now so do you.',
    color: '#6a6f7d',
    code: 'Wc',
  },

  // Capes — worn gear with real properties, never mere decoration.
  // Each has its own cloth character on the back: weight, length, flow.
  {
    id: 'cape_traveler',
    name: "Traveler's cape",
    stackable: false,
    value: 140,
    equipSlot: 'cape',
    passive: 'fleet_footed',
    desc: 'Stitched for the road — the miles pass a little easier.',
    color: '#7da35a',
    code: 'Tc',
  },
  {
    id: 'cape_emberweave',
    name: 'Emberweave cape',
    stackable: false,
    value: 320,
    equipSlot: 'cape',
    armor: 1,
    passive: 'second_wind',
    desc: 'Woven with emberthread that flares when you falter.',
    color: '#c4553d',
    code: 'Ec',
  },
  {
    id: 'cape_champion',
    name: "Champion's mantle",
    stackable: false,
    value: 620,
    equipSlot: 'cape',
    armor: 1,
    passive: 'battle_rush',
    desc: 'He wore it into every battle. He only lost the last one.',
    color: '#8a2f3c',
    code: 'Cm',
  },
  {
    id: 'cape_ragged',
    name: 'Ragged cloak',
    stackable: false,
    value: 25,
    equipSlot: 'cape',
    desc: 'Torn, patched, and honest about both.',
    color: '#8a7a5f',
    code: 'Rg',
  },
  {
    id: 'cape_banner',
    name: 'Weathered banner',
    stackable: false,
    value: 120,
    equipSlot: 'cape',
    passive: 'thorns',
    desc: 'A warband\'s colors, cut down and worn in spite.',
    color: '#a34434',
    code: 'Wb',
  },
  {
    id: 'cape_huntsman',
    name: "Huntsman's drape",
    stackable: false,
    value: 280,
    equipSlot: 'cape',
    armor: 1,
    passive: 'chill_charged',
    desc: 'Forest-green wool that moves quiet through the brush.',
    color: '#3f6b3a',
    code: 'Hd',
  },
  {
    id: 'cape_midnight',
    name: 'Midnight shade',
    stackable: false,
    value: 380,
    equipSlot: 'cape',
    armor: 1,
    passive: 'dodge_haste',
    desc: 'Cloth so dark it drinks the lamplight.',
    color: '#2e2a3e',
    code: 'Ms',
  },
  {
    id: 'cape_gilded',
    name: 'Gilded cape',
    stackable: false,
    value: 420,
    equipSlot: 'cape',
    armor: 1,
    passive: 'fleet_footed',
    desc: 'Gold thread catches every glance in town.',
    color: '#c9a23c',
    code: 'Gc',
  },
  {
    id: 'cape_storm',
    name: 'Stormcaller shroud',
    stackable: false,
    value: 520,
    equipSlot: 'cape',
    armor: 1,
    passive: 'battle_rush',
    desc: 'The hem crackles when the clouds roll in.',
    color: '#3c4a66',
    code: 'Ss',
  },
  {
    id: 'cape_royal',
    name: 'Royal regalia',
    stackable: false,
    value: 680,
    equipSlot: 'cape',
    armor: 1,
    passive: 'fleet_footed',
    desc: 'Purple silk and gold border — worn by exactly one king.',
    color: '#6b3fa0',
    code: 'Rr',
  },
  {
    id: 'cape_celestial',
    name: 'Celestial cape',
    stackable: false,
    value: 800,
    equipSlot: 'cape',
    armor: 2,
    passive: 'dodge_haste',
    desc: 'A piece of the night sky, still twinkling.',
    color: '#1f2247',
    code: 'Cc',
  },
  {
    id: 'cape_phoenix',
    name: 'Phoenix mantle',
    stackable: false,
    value: 900,
    equipSlot: 'cape',
    armor: 2,
    // Rebirth in cloth: the phoenix rises exactly when you're nearly down.
    passive: 'second_wind',
    desc: 'It smolders but never burns. Neither, quite, do you.',
    color: '#c4372a',
    code: 'Px',
  },

  // Tools
  {
    id: 'bronze_axe',
    name: 'Bronze axe',
    stackable: false,
    value: 20,
    equipSlot: 'tool',
    tool: { type: 'axe', power: 1 },
    desc: 'Bites timber all day without complaint.',
    color: '#a4744b',
    code: 'Ax',
  },
  {
    id: 'bronze_pickaxe',
    name: 'Bronze pickaxe',
    stackable: false,
    value: 20,
    equipSlot: 'tool',
    tool: { type: 'pickaxe', power: 1 },
    desc: 'Turns stubborn rock into honest ore.',
    color: '#a4744b',
    code: 'Pk',
  },
  {
    id: 'fishing_rod',
    name: 'Fishing rod',
    stackable: false,
    value: 15,
    equipSlot: 'tool',
    tool: { type: 'rod', power: 1 },
    desc: 'Line, hook, and somewhere quiet to stand.',
    color: '#c4a35a',
    code: 'Rd',
  },
];

export const ITEMS: ReadonlyMap<string, ItemDef> = new Map(defs.map((d) => [d.id, d]));

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS.get(id);
}

/** What a fresh character carries. */
export const STARTER_KIT: Array<{ item: string; qty: number }> = [
  { item: 'bronze_axe', qty: 1 },
  { item: 'bronze_pickaxe', qty: 1 },
  { item: 'fishing_rod', qty: 1 },
  { item: 'bronze_sword', qty: 1 },
  { item: 'oak_shortbow', qty: 1 },
  { item: 'arrow', qty: 50 },
  { item: 'apprentice_staff', qty: 1 },
  { item: 'coins', qty: 25 },
];

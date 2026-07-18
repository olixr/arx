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
}

const defs: ItemDef[] = [
  { id: 'coins', name: 'Coins', stackable: true, value: 1, color: '#f2c94c', code: 'GP' },

  // Logs
  { id: 'log', name: 'Logs', stackable: false, value: 4, color: '#8a6a45', code: 'Lg' },
  { id: 'oak_log', name: 'Oak logs', stackable: false, value: 12, color: '#6b4a26', code: 'Ok' },

  // Ores
  { id: 'copper_ore', name: 'Copper ore', stackable: false, value: 6, color: '#b87333', code: 'Cu' },
  { id: 'tin_ore', name: 'Tin ore', stackable: false, value: 6, color: '#c9c4cf', code: 'Sn' },
  { id: 'iron_ore', name: 'Iron ore', stackable: false, value: 18, color: '#8d9299', code: 'Fe' },
  { id: 'coal', name: 'Coal', stackable: false, value: 22, color: '#2e2b33', code: 'Co' },
  { id: 'gold_ore', name: 'Gold ore', stackable: false, value: 45, color: '#e8b64c', code: 'Au' },

  // Fish & food
  { id: 'raw_trout', name: 'Raw trout', stackable: false, value: 8, color: '#7fb2d9', code: 'Tr' },
  { id: 'raw_chicken', name: 'Raw chicken', stackable: false, value: 4, color: '#e8c9b0', code: 'Ch' },
  { id: 'raw_beef', name: 'Raw beef', stackable: false, value: 5, color: '#c46a5a', code: 'Bf' },

  // Cooked food (heals on click)
  { id: 'trout', name: 'Trout', stackable: false, value: 12, heals: 4, color: '#d98a6a', code: 'Tr' },
  { id: 'cooked_chicken', name: 'Cooked chicken', stackable: false, value: 7, heals: 3, color: '#d9a86a', code: 'Ch' },
  { id: 'cooked_beef', name: 'Cooked beef', stackable: false, value: 8, heals: 4, color: '#b06a4a', code: 'Bf' },
  { id: 'burnt_food', name: 'Burnt food', stackable: false, value: 1, color: '#3a363f', code: 'Bt' },

  // Metal bars
  { id: 'bronze_bar', name: 'Bronze bar', stackable: false, value: 16, color: '#a4744b', code: 'Bb' },
  { id: 'iron_bar', name: 'Iron bar', stackable: false, value: 30, color: '#8d9299', code: 'Ib' },
  { id: 'steel_bar', name: 'Steel bar', stackable: false, value: 80, color: '#b8bec8', code: 'Sb' },
  { id: 'gold_bar', name: 'Gold bar', stackable: false, value: 95, color: '#f2c94c', code: 'Gb' },

  // Crafting materials & gear
  { id: 'leather', name: 'Leather', stackable: false, value: 12, color: '#b08a5c', code: 'Le' },
  {
    id: 'leather_body',
    name: 'Leather body',
    stackable: false,
    value: 40,
    equipSlot: 'body',
    armor: 2,
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
    weapon: { style: 'melee', damage: 5, cooldownTicks: 24, range: 1.95, art: 'lunge' },
    color: '#8d9299',
    code: 'Is',
  },
  {
    id: 'steel_sword',
    name: 'Steel sword',
    stackable: false,
    value: 240,
    equipSlot: 'weapon',
    weapon: { style: 'melee', damage: 7, cooldownTicks: 24, range: 2.05, art: 'shockwave' },
    color: '#b8bec8',
    code: 'Ss',
  },
  // Smithed valuables — the goldsmith's vendor line.
  { id: 'gold_ring', name: 'Gold ring', stackable: false, value: 180, color: '#f2c94c', code: 'Gr' },

  // Monster drops
  { id: 'bones', name: 'Bones', stackable: false, value: 2, color: '#e6e0d0', code: 'Bn' },
  { id: 'feather', name: 'Feather', stackable: true, value: 1, color: '#f4efe4', code: 'Ft' },
  { id: 'cowhide', name: 'Cowhide', stackable: false, value: 8, color: '#a08468', code: 'Hd' },
  { id: 'wolf_fur', name: 'Wolf fur', stackable: false, value: 20, color: '#6a6f7d', code: 'Wf' },

  // Weapons — one per combat style to start.
  {
    id: 'bronze_sword',
    name: 'Bronze sword',
    stackable: false,
    value: 32,
    equipSlot: 'weapon',
    weapon: { style: 'melee', damage: 3, cooldownTicks: 24, range: 1.7, art: 'crescent_sweep' },
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
      damage: 6,
      cooldownTicks: 8,
      range: 7,
      ammo: 'arrow',
      projectileSpeed: 16,
      art: 'volley',
    },
    color: '#8a6a45',
    code: 'Bw',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    stackable: true,
    value: 2,
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
      // Quick weak bolt — magic's basic is a rhythm keeper; its power
      // lives in the Art (statuses, AoE, reactions).
      style: 'magic',
      damage: 2,
      cooldownTicks: 14,
      range: 7,
      projectileSpeed: 13,
      art: 'frost_nova',
    },
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
      damage: 3,
      cooldownTicks: 14,
      range: 7,
      projectileSpeed: 13,
      art: 'fireburst',
    },
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
      damage: 7,
      cooldownTicks: 9,
      range: 8,
      ammo: 'arrow',
      projectileSpeed: 17,
      art: 'piercing_bolt',
    },
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
    color: '#e8763c',
    code: 'Te',
  },
  {
    id: 'wolf_pelt_cloak',
    name: 'Wolf-pelt cloak',
    stackable: false,
    value: 220,
    equipSlot: 'body',
    armor: 1,
    passive: 'dodge_haste',
    color: '#6a6f7d',
    code: 'Wc',
  },

  // Tools
  {
    id: 'bronze_axe',
    name: 'Bronze axe',
    stackable: false,
    value: 20,
    equipSlot: 'tool',
    tool: { type: 'axe', power: 1 },
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

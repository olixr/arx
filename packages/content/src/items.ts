import type { EquipSlot, PassiveId, RarityTier, SkillId, StatusApply } from '@arx/shared';
import { COMPILED_EQUIPMENT } from './equipment/defs.js';
import { ELEMENT_COLORS, ENCHANT_DEFS, type EnchantEffect } from './equipment/enchants.js';
import type { ArmorClass, GearSlot } from './equipment/types.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';

export type ToolType = 'axe' | 'pickaxe' | 'rod';
export type CombatStyle = 'melee' | 'archery' | 'magic' | 'twohand';

/**
 * The elemental schools of magic. A staff's element rides its bolts —
 * the client tints every projectile, muzzle flash, and impact from
 * this — and names the school its Art belongs to. Purely cosmetic on
 * the wire (`magic:<element>` in the projectile defId); the gameplay
 * lives in the Art and status the weapon carries.
 */
export type MagicElement =
  | 'arcane'
  | 'ember'
  | 'frost'
  | 'storm'
  | 'verdant'
  | 'void'
  | 'radiant'
  | 'blood'
  /** The legendary school: starlight from before the sky settled. */
  | 'astral';

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
  /** Backstab damage multiplier — daggers carry a big one; other melee falls back to the default. */
  backstabMult?: number;
  /** Magic school (staves) — tints bolts, flashes, and impacts. */
  element?: MagicElement;
}

/**
 * A consumable buff. One buff may be active per channel: drinking a new
 * tonic replaces your tonic buff, eating new buff food replaces your food
 * buff — the two channels stack with each other.
 */
export interface ConsumableBuff {
  /** Display name, e.g. "Sugar Rush". */
  name: string;
  channel: 'tonic' | 'food';
  durationSec: number;
  /** Movement speed multiplier. */
  speedMult?: number;
  /** Damage soaked before HP is touched. */
  shieldHp?: number;
  /** Gathering speed multiplier (mining, woodcutting, foraging, ...). */
  gatherSpeed?: number;
  /** HP restored every 4 seconds. */
  regenPer4s?: number;
}

/**
 * A weapon oil — the poison-maker's craft. Using the vial coats the
 * EQUIPPED melee or archery weapon: while the coating lasts, every
 * landed basic attack carries the status. Magic focuses take no oil —
 * poison is a craft of edges and arrowheads, never of light. One
 * coating at a time; a new vial replaces the old. Vials are ordinary
 * items, so a poison-maker can brew for the whole party.
 */
export interface CoatingDef {
  /** Buff-chip display name, e.g. "Adderfang oil". */
  name: string;
  /** How long the edge stays wet, seconds. */
  durationSec: number;
  /** Applied by every landed melee/archery basic while coated. */
  status: StatusApply;
}

/**
 * Compiled equipment facts (from an EquipmentDef). Presence of `gear`
 * is what makes an item ROLL — carry rarity, affixes, requirements.
 */
export interface GearInfo {
  slot: GearSlot;
  armorClass?: ArmorClass;
  /** Equip gate, checked against the BASE skill level. */
  levelReq?: { skill: SkillId; level: number };
  affixPool: Array<{ stat: SkillId | 'maxHp' | 'regen'; w: number }>;
  rarities: readonly RarityTier[];
  acquisition: { drop: boolean; craft: boolean; shop: boolean };
  /** Native always-on effects (enchant vocabulary, baked into the def). */
  effects?: EnchantEffect[];
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
  /** Timed buff granted when consumed (may accompany heals). */
  buff?: ConsumableBuff;
  /** Weapon oil: coats the equipped melee/archery weapon when used. */
  coating?: CoatingDef;
  /**
   * Enchant scroll: using it bonds this EnchantDef id onto the gear
   * worn in the enchant's target slot. Scrolls are ordinary tradeable
   * items — inscribing them is the enchanter's craft, applying one
   * takes no skill at all (that's how you enchant a friend's blade).
   */
  enchant?: string;
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
  /**
   * Offhand items only: worn on the back (a quiver), not held in the
   * fist — the one offhand kind a two-handed weapon tolerates.
   */
  backMounted?: boolean;
  /** Rolled-equipment facts — compiled from the equipment schema. */
  gear?: GearInfo;
  /**
   * Dungeon key: the instance roll IS the dungeon (seed = layout,
   * rarity = tier, pwr = power level — see shared/dungeon/key.ts).
   * The loot resolver mints these rolls specially; the Riftgate
   * reads them.
   */
  dungeonKey?: boolean;
  /**
   * Recipe scroll: using it teaches this RECIPE id, permanently and
   * per character (character_recipes). Refused if already known —
   * the scroll survives to trade on. Generated one-per-unlockable
   * recipe below; never hand-authored.
   */
  teaches?: string;
  /**
   * Quest item: exists only to be asked for. Worthless by law (value
   * 0, shops refuse to buy it) so it never touches the gear economy —
   * the flood law's price for quest-gated drops. Droppable like
   * anything else; losing one just means earning it again.
   */
  quest?: boolean;
  /**
   * Using this item BEGINS the named quest — a torn note, a sealed
   * writ, a thing found in the world that is itself the ask. Consumed
   * on accept; refused (and kept) while the quest is underway or its
   * gates don't pass.
   */
  startsQuest?: string;
}

const defs: ItemDef[] = [
  { id: 'coins', name: 'Coins', stackable: true, value: 1, desc: 'The realm\'s only universal language.', color: '#f2c94c', code: 'GP' },

  // Logs
  { id: 'log', name: 'Logs', stackable: false, value: 4, desc: 'Fresh-cut timber, still smelling of the woods.', color: '#8a6a45', code: 'Lg' },
  { id: 'oak_log', name: 'Oak logs', stackable: false, value: 12, desc: 'Dense oak heartwood — bowyers pay well for it.', color: '#6b4a26', code: 'Ok' },
  { id: 'willow_log', name: 'Willow logs', stackable: false, value: 24, desc: 'Supple riverside wood that bends without breaking.', color: '#8a9455', code: 'Wq' },
  { id: 'yew_log', name: 'Yew logs', stackable: false, value: 52, desc: 'Slow-grown heartwood of the war bows. Kings taxed it.', color: '#7d4436', code: 'Yl' },

  // Ores
  { id: 'copper_ore', name: 'Copper ore', stackable: false, value: 6, desc: 'Soft red-brown ore. Half of every bronze bar.', color: '#b87333', code: 'Cu' },
  { id: 'tin_ore', name: 'Tin ore', stackable: false, value: 6, desc: 'Pale ore that hardens copper into bronze.', color: '#c9c4cf', code: 'Sn' },
  { id: 'iron_ore', name: 'Iron ore', stackable: false, value: 18, desc: 'Rust-flecked stone with real metal in its bones.', color: '#8d9299', code: 'Fe' },
  { id: 'coal', name: 'Coal', stackable: false, value: 22, desc: 'Black rock that burns hot enough for steelwork.', color: '#2e2b33', code: 'Co' },
  { id: 'gold_ore', name: 'Gold ore', stackable: false, value: 45, desc: 'Glittering seams of the mountain\'s treasure.', color: '#e8b64c', code: 'Au' },
  { id: 'silver_ore', name: 'Silver ore', stackable: false, value: 30, desc: 'Cold pale metal — moonlight the mountain kept.', color: '#dce4f0', code: 'Ag' },
  { id: 'mithril_ore', name: 'Mithril ore', stackable: false, value: 90, desc: 'Sky-blue and feather-light. The smith-songs all start here.', color: '#7fa8d9', code: 'Mi' },
  { id: 'adamant_ore', name: 'Adamant ore', stackable: false, value: 180, desc: 'Green-veined stone hard enough to chip the pick that wins it.', color: '#5fa06a', code: 'Ad' },
  { id: 'obsidian_shard', name: 'Obsidian shard', stackable: false, value: 240, desc: 'Volcanic glass, sharper than any whetstone will ever make steel.', color: '#453a52', code: 'Ob' },
  { id: 'starmetal_ore', name: 'Starmetal ore', stackable: false, value: 400, desc: 'It fell burning from the old sky. It remembers being a star.', color: '#cabdf2', code: 'St' },

  // Fish & food
  { id: 'raw_trout', name: 'Raw trout', stackable: false, value: 8, desc: 'A river trout, cold and slick. Cook it over a fire.', color: '#7fb2d9', code: 'Tr' },
  { id: 'raw_chicken', name: 'Raw chicken', stackable: false, value: 4, desc: 'Best not eaten as-is. The fire fixes that.', color: '#e8c9b0', code: 'Ch' },
  { id: 'raw_beef', name: 'Raw beef', stackable: false, value: 5, desc: 'A hearty cut from the pasture. Needs a fire.', color: '#c46a5a', code: 'Bf' },

  // Cooked food (heals on click)
  { id: 'trout', name: 'Trout', stackable: false, value: 12, heals: 4, desc: 'Flaky and hot off the fire.', color: '#d98a6a', code: 'Tr' },
  { id: 'cooked_chicken', name: 'Cooked chicken', stackable: false, value: 7, heals: 3, desc: 'Simple food that keeps an adventurer standing.', color: '#d9a86a', code: 'Ch' },
  { id: 'cooked_beef', name: 'Cooked beef', stackable: false, value: 8, heals: 4, desc: 'A proper meal after a proper fight.', color: '#b06a4a', code: 'Bf' },
  { id: 'burnt_food', name: 'Burnt food', stackable: false, value: 1, desc: 'You looked away for one moment. It noticed.', color: '#3a363f', code: 'Bt' },

  // Seeds — the start of every field
  { id: 'carrot_seed', name: 'Carrot seeds', stackable: true, value: 2, desc: 'Fast, forgiving, and sweet. Every farm starts here.', color: '#e8873d', code: 'Cs' },
  { id: 'sagewort_seed', name: 'Sagewort seeds', stackable: true, value: 5, desc: 'Papery seeds smelling faintly of medicine.', color: '#8fb083', code: 'Ss' },
  { id: 'sunflower_seed', name: 'Sunflower seeds', stackable: true, value: 7, desc: 'Plant a little sun. Harvest a tall one.', color: '#e8c04c', code: 'Fs' },
  { id: 'wheat_seed', name: 'Wheat seeds', stackable: true, value: 8, desc: 'A handful of gold-to-be.', color: '#d9b45c', code: 'Ws' },
  { id: 'cotton_seed', name: 'Cotton seeds', stackable: true, value: 12, desc: 'Fluff futures, sold by the pinch.', color: '#e8e4da', code: 'Ct' },
  { id: 'moonbell_seed', name: 'Moonbell seeds', stackable: true, value: 20, desc: 'They only sprout for patient hands.', color: '#8f9ed6', code: 'Ms' },

  // Produce & foraged goods
  { id: 'carrot', name: 'Carrot', stackable: false, value: 4, heals: 2, desc: 'Crunchy straight from the soil.', color: '#e8873d', code: 'Ca' },
  { id: 'sagewort', name: 'Sagewort', stackable: false, value: 10, desc: 'A healer\'s herb — bitter leaf, kind intentions.', color: '#8fb083', code: 'Sw' },
  { id: 'sunflower', name: 'Sunflower', stackable: false, value: 8, desc: 'Follows the light. So do we all.', color: '#e8c04c', code: 'Sf' },
  { id: 'wheat', name: 'Wheat', stackable: false, value: 6, desc: 'A sheaf of ripe grain, ready for the mill.', color: '#d9b45c', code: 'Wh' },
  { id: 'cotton', name: 'Cotton', stackable: false, value: 10, desc: 'A cloud you can spin.', color: '#f2efe6', code: 'Cn' },
  { id: 'moonbell', name: 'Moonbell', stackable: false, value: 25, desc: 'Pale blue bells that glow faintly after dusk.', color: '#8f9ed6', code: 'Mb' },
  { id: 'berries', name: 'Berries', stackable: true, value: 3, heals: 2, desc: 'Sweet, wild, and occasionally shared with birds.', color: '#a04a6e', code: 'Br' },
  { id: 'plant_fibre', name: 'Plant fibre', stackable: true, value: 3, desc: 'Tough green strands, good for twisting into twine.', color: '#79a355', code: 'Pf' },

  // Farm-processed materials
  { id: 'twine', name: 'Twine', stackable: true, value: 8, desc: 'Fibre twisted until it agrees to hold things together.', color: '#b0a068', code: 'Tw' },
  { id: 'cloth', name: 'Cloth', stackable: false, value: 24, desc: 'A tidy bolt of woven cotton.', color: '#e8e4da', code: 'Cl' },
  { id: 'flour', name: 'Flour', stackable: true, value: 10, desc: 'Ground wheat. The quiet half of every bakery.', color: '#f2efe6', code: 'Fl' },
  { id: 'milk', name: 'Milk', stackable: false, value: 8, desc: 'A pail of fresh milk, still warm from the cow.', color: '#f4f2ec', code: 'Mk' },
  { id: 'egg', name: 'Egg', stackable: true, value: 4, desc: 'Laid this morning, judging by the smugness of the hen.', color: '#e8d9b0', code: 'Eg' },

  // Homestead cooking
  { id: 'bread', name: 'Bread', stackable: false, value: 14, heals: 6, desc: 'A warm loaf with a crust worth fighting over.', color: '#c49a5c', code: 'Bd' },
  { id: 'fried_egg', name: 'Fried egg', stackable: false, value: 6, heals: 3, desc: 'Sunny side up, like all good mornings.', color: '#f2d98a', code: 'Fe' },
  {
    id: 'hearty_stew',
    name: 'Hearty stew',
    stackable: false,
    value: 22,
    heals: 8,
    buff: { name: 'Hearty', channel: 'food', durationSec: 240, regenPer4s: 1 },
    desc: 'Beef and carrots that keep mending you long after the bowl.',
    color: '#b06a4a',
    code: 'Hs',
  },
  {
    id: 'cake',
    name: 'Cake',
    stackable: false,
    value: 40,
    heals: 10,
    buff: { name: 'Sugar Rush', channel: 'food', durationSec: 180, speedMult: 1.08 },
    desc: 'Flour, egg, milk, and a spring in your step.',
    color: '#e8b6c9',
    code: 'Ck',
  },

  // Herbalism — tinctures and tonics from the alembic bench
  { id: 'healing_tincture', name: 'Healing tincture', stackable: false, value: 30, heals: 8, desc: 'Sagewort distilled to its kindest form.', color: '#d65a5a', code: 'Ht' },
  {
    id: 'gatherers_brew',
    name: 'Gatherer\'s brew',
    stackable: false,
    value: 45,
    buff: { name: 'Gatherer\'s Eye', channel: 'tonic', durationSec: 180, gatherSpeed: 1.25 },
    desc: 'The world gives up its goods a little faster.',
    color: '#7fc9b3',
    code: 'Gb',
  },
  {
    id: 'swiftness_tonic',
    name: 'Swiftness tonic',
    stackable: false,
    value: 60,
    buff: { name: 'Swiftness', channel: 'tonic', durationSec: 60, speedMult: 1.2 },
    desc: 'Tastes like wind. Works like it too.',
    color: '#8fd0e8',
    code: 'St',
  },
  {
    id: 'ironbark_tonic',
    name: 'Ironbark tonic',
    stackable: false,
    value: 70,
    buff: { name: 'Ironbark', channel: 'tonic', durationSec: 120, shieldHp: 6 },
    desc: 'Your skin remembers being a tree.',
    color: '#9c7440',
    code: 'It',
  },
  {
    id: 'mending_salve',
    name: 'Mending salve',
    stackable: false,
    value: 90,
    buff: { name: 'Mending', channel: 'tonic', durationSec: 40, regenPer4s: 2 },
    desc: 'Moonbell and milk, whipped into quiet miracles.',
    color: '#c9a8e8',
    code: 'Msv',
  },

  // Poison-making — the alembic's dark branch. Vials coat melee
  // weapons and bows (never magic); the maker's herbalism gates the
  // tiers, and the vials trade hands like any other goods.
  {
    id: 'venom_gland',
    name: 'Venom gland',
    stackable: true,
    value: 12,
    desc: 'A bitter little sac that vermin keep behind their teeth. Handle by the edges.',
    color: '#8a9a3a',
    code: 'Vg',
  },
  {
    id: 'adderfang_oil',
    name: 'Adderfang oil',
    stackable: false,
    value: 45,
    coating: { name: 'Adderfang oil', durationSec: 180, status: { status: 'venom', power: 1, durationTicks: 80 } },
    desc: 'The apprentice poisoner\'s first argument. Thin, green, and persuasive.',
    color: '#a0c050',
    code: 'Ao',
  },
  {
    id: 'hobble_brew',
    name: 'Hobblebrew',
    stackable: false,
    value: 55,
    coating: { name: 'Hobblebrew', durationSec: 180, status: { status: 'chill', power: 1, durationTicks: 70 } },
    desc: 'Moonbell distilled to a numbing syrup. Whatever you cut walks home slowly.',
    color: '#8f9ed6',
    code: 'Hb',
  },
  {
    id: 'vipers_kiss',
    name: 'Viper\'s kiss',
    stackable: false,
    value: 110,
    coating: { name: 'Viper\'s kiss', durationSec: 300, status: { status: 'venom', power: 2, durationTicks: 100 } },
    desc: 'Twice the gland, half the mercy. The journeyman\'s vial.',
    color: '#7a9a2a',
    code: 'Vk',
  },
  {
    id: 'leadfoot_oil',
    name: 'Leadfoot oil',
    stackable: false,
    value: 130,
    coating: { name: 'Leadfoot oil', durationSec: 360, status: { status: 'chill', power: 2, durationTicks: 110 } },
    desc: 'The chase ends where this begins. Boots of lead, sold by the drop.',
    color: '#6a7ab8',
    code: 'Lo',
  },
  {
    id: 'wyrmtongue_oil',
    name: 'Wyrmtongue oil',
    stackable: false,
    value: 240,
    coating: { name: 'Wyrmtongue oil', durationSec: 480, status: { status: 'venom', power: 3, durationTicks: 120 } },
    desc: 'The master\'s reserve — green-black, slow to pour, quick to collect debts.',
    color: '#4a6a2a',
    code: 'Wy',
  },

  // Homestead sundries — flower_crown now lives in equipment/defs.ts.
  { id: 'watering_can', name: 'Watering can', stackable: false, value: 30, desc: 'Carry a little rain wherever you garden.', color: '#7a8fa5', code: 'Wc' },

  // Metal bars
  { id: 'bronze_bar', name: 'Bronze bar', stackable: false, value: 16, desc: 'The classic alloy — one part copper, one part tin.', color: '#a4744b', code: 'Bb' },
  { id: 'iron_bar', name: 'Iron bar', stackable: false, value: 30, desc: 'Honest metal, ready for the anvil.', color: '#8d9299', code: 'Ib' },
  { id: 'steel_bar', name: 'Steel bar', stackable: false, value: 80, desc: 'Iron improved by coal and patience.', color: '#b8bec8', code: 'Sb' },
  { id: 'gold_bar', name: 'Gold bar', stackable: false, value: 95, desc: 'Soft, heavy, and worth its weight in itself.', color: '#f2c94c', code: 'Gb' },
  { id: 'silver_bar', name: 'Silver bar', stackable: false, value: 60, desc: 'Takes a mirror polish and an enchanter\'s whisper equally well.', color: '#dce4f0', code: 'Vb' },
  { id: 'mithril_bar', name: 'Mithril bar', stackable: false, value: 200, desc: 'Half the weight of steel, twice the spine.', color: '#7fa8d9', code: 'Mb' },
  { id: 'adamant_bar', name: 'Adamant bar', stackable: false, value: 420, desc: 'The anvil complains the whole time. It\'s worth it.', color: '#5fa06a', code: 'Ab' },
  { id: 'starsteel_bar', name: 'Starsteel bar', stackable: false, value: 950, desc: 'Sky-metal folded over coal-fire until it holds its own faint light.', color: '#cabdf2', code: 'Xb' },

  // Crafting materials & gear — armor pieces live in equipment/defs.ts.
  { id: 'leather', name: 'Leather', stackable: false, value: 12, desc: 'Cured hide, supple and strong.', color: '#b08a5c', code: 'Le' },
  // Swords live in equipment/defs.ts (the blade roster) — rolled gear.
  // Smithed valuables — the goldsmith's vendor line.
  { id: 'gold_ring', name: 'Gold ring', stackable: false, value: 180, desc: 'A goldsmith\'s staple. Vendors adore them.', color: '#f2c94c', code: 'Gr' },
  { id: 'silver_ring', name: 'Silver ring', stackable: false, value: 120, desc: 'Moon-pale and mirror-bright. The quiet fortune-maker.', color: '#dce4f0', code: 'Sr' },

  // Monster drops
  { id: 'bones', name: 'Bones', stackable: false, value: 2, desc: 'Every creature leaves some behind.', color: '#e6e0d0', code: 'Bn' },
  { id: 'feather', name: 'Feather', stackable: true, value: 1, desc: 'Light as rumor. Fletchers want them by the fistful.', color: '#f4efe4', code: 'Ft' },
  { id: 'cowhide', name: 'Cowhide', stackable: false, value: 8, desc: 'A whole hide, ready for the tanner\'s bench.', color: '#a08468', code: 'Hd' },
  { id: 'wolf_fur', name: 'Wolf fur', stackable: false, value: 20, desc: 'Thick winter fur, smoke-grey and warm.', color: '#6a6f7d', code: 'Wf' },
  { id: 'direwolf_pelt', name: 'Dire wolf pelt', stackable: false, value: 110, desc: 'Broad as a bedroll, storm-dark and frost-tipped — her winters written in the scars.', color: '#4b4854', code: 'Dp' },
  { id: 'worg_fang', name: 'Worg fang', stackable: false, value: 38, desc: 'An up-hooked lower fang, long as a skinning knife. The goblins drill them for war-charms.', color: '#d8ccb0', code: 'Wg' },
  { id: 'scrap_hide', name: 'Scrap hide', stackable: true, value: 3, desc: 'Small pelts and offcuts. Three make an honest leather.', color: '#8a6f52', code: 'Sh' },
  { id: 'linen_scrap', name: 'Linen scrap', stackable: true, value: 3, desc: 'Torn cloth off someone who stopped needing it.', color: '#ddd6c2', code: 'Ls' },
  { id: 'gloomsilk_thread', name: 'Gloomsilk thread', stackable: true, value: 14, desc: 'Cold spun shadow from the crypt. It drinks the light.', color: '#5a4a78', code: 'Gt' },

  // Trade-prepared materials — the tanner's and weaver's stock in trade.
  { id: 'linen', name: 'Linen', stackable: false, value: 20, desc: 'A bolt woven from salvaged scrap — humble, tough, everywhere.', color: '#e4dcc4', code: 'Ln' },
  { id: 'gloomsilk', name: 'Gloomsilk', stackable: false, value: 90, desc: 'A bolt of woven midnight. Tailors whisper around it.', color: '#6a5690', code: 'Gs' },
  { id: 'hardened_leather', name: 'Hardened leather', stackable: false, value: 45, desc: 'Leather boiled with oak tannin until it argues back.', color: '#7d5636', code: 'Hl' },

  // Daggers live in equipment/defs.ts (the rogue's roster) — rolled gear.
  // Bows live in equipment/defs.ts (the archer's roster) — rolled gear.
  // Hold-to-draw law: damage/speed/range scale with the draw; cooldown
  // is just release recovery — pacing lives in the draw itself.
  {
    id: 'arrow',
    name: 'Arrow',
    stackable: true,
    value: 2,
    desc: 'Feather, shaft, and a broad iron head.',
    color: '#c4b590',
    code: 'Ar',
  },
  // Staves live in equipment/defs.ts (the archmage's roster) — rolled
  // gear. apprentice_staff and ember_staff adopted their shipped ids.
  // Wand rhythm law: rapid chip bolts, bolt-bolt-HEAVY; the real power
  // lives in the heavy beat and the Art (statuses, reactions).

  // Elemental gems — the battlestaff swap stones. The land itself sheds
  // them: ore seams and berry roots give them up as rare bonus finds,
  // and the wilder NPCs hoard them.
  {
    id: 'emberstone',
    name: 'Emberstone',
    stackable: false,
    value: 120,
    desc: 'A red gem, warm as a held coal. Copper seams hide them.',
    color: '#e8683c',
    code: 'Eo',
  },
  {
    id: 'frostshard',
    name: 'Frostshard',
    stackable: false,
    value: 120,
    desc: 'Blue crystal, cold through the glove. Iron veins weep them.',
    color: '#9ad0ec',
    code: 'Fd',
  },
  {
    id: 'stormpearl',
    name: 'Stormpearl',
    stackable: false,
    value: 120,
    desc: 'It hums faintly and lifts the hair on your arm. Struck gold seams grow them.',
    color: '#e8e29a',
    code: 'Zq',
  },
  {
    id: 'bloomstone',
    name: 'Bloomstone',
    stackable: false,
    value: 120,
    desc: 'A green seed that chose stone over sprouting. Found among old roots.',
    color: '#7ac46a',
    code: 'Bq',
  },
  // Enchanting reagents. Arcane dust is the universal binder — crypt
  // bones shed it, and any elemental gem grinds down into it at the
  // enchanting table. The essences are the elements themselves, shaken
  // loose from the creatures (and countryside) that embody them.
  {
    id: 'arcane_dust',
    name: 'Arcane dust',
    stackable: true,
    value: 14,
    desc: 'Glittering grit that was recently something magical. Every enchantment starts here.',
    color: '#b8a8e0',
    code: 'xd',
  },
  {
    id: 'ember_essence',
    name: 'Ember essence',
    stackable: true,
    value: 26,
    desc: 'A drop of stubborn fire in a bead of glass. Goblin camps reek of it.',
    color: '#e8683c',
    code: 'xe',
  },
  {
    id: 'frost_essence',
    name: 'Frost essence',
    stackable: true,
    value: 26,
    desc: 'Cold that learned to keep. The crypt air condenses it on old bones.',
    color: '#9ad0ec',
    code: 'xf',
  },
  {
    id: 'storm_essence',
    name: 'Storm essence',
    stackable: true,
    value: 26,
    desc: 'A sealed argument between two clouds. Throwers and champions carry them like coin.',
    color: '#e8e29a',
    code: 'xs',
  },
  {
    id: 'verdant_essence',
    name: 'Verdant essence',
    stackable: true,
    value: 26,
    desc: 'Green vigor pressed from the living wild. The meadows part with it grudgingly.',
    color: '#7ac46a',
    code: 'xv',
  },
  {
    id: 'crimson_essence',
    name: 'Crimson essence',
    stackable: true,
    value: 26,
    desc: 'Vitality itself, drawn off warm. Wolves are unreasonably rich in it.',
    color: '#c04848',
    code: 'xc',
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
    id: 'brass_key',
    name: 'Brass key',
    stackable: true,
    value: 65,
    desc: 'Heavy, cold, and exactly the shape of a strongchest\'s appetite. Spent in the turning.',
    color: '#c9a23e',
    code: 'Bk',
  },
  {
    id: 'dungeon_key',
    name: 'Dungeon key',
    stackable: false,
    value: 120,
    desc: 'A rift-cut key humming with somewhere else. The same key always opens the same halls — never spent, only carried.',
    color: '#8f7bd9',
    code: 'Dk',
    dungeonKey: true,
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
  {
    id: 'aegis_stone',
    name: 'Aegis stone',
    stackable: false,
    value: 360,
    equipSlot: 'relic',
    relic: 'stone_aegis',
    desc: 'A river-worn shield the size of a palm. It still thinks big.',
    color: '#8a9484',
    code: 'Qg',
  },
  {
    id: 'storm_coil',
    name: 'Storm coil',
    stackable: false,
    value: 380,
    equipSlot: 'relic',
    relic: 'coil_lance',
    desc: 'Copper wound tight around a thunderclap that never finished.',
    color: '#e8e06a',
    code: 'Qy',
  },
  {
    id: 'bramble_band',
    name: 'Bramble band',
    stackable: false,
    value: 340,
    equipSlot: 'relic',
    relic: 'bramble_burst',
    desc: 'A ring of living briar. It grows where you point it.',
    color: '#5a7a42',
    code: 'Qv',
  },
  {
    id: 'seeker_stone',
    name: 'Seeker stone',
    stackable: false,
    value: 380,
    equipSlot: 'relic',
    relic: 'arcane_seekers',
    desc: 'A cut of pale crystal that always faces something. Ask it nicely.',
    color: '#b49af0',
    code: 'Qk',
  },
  {
    id: 'fang_band',
    name: 'Fang band',
    stackable: false,
    value: 360,
    equipSlot: 'relic',
    relic: 'venom_dart',
    desc: 'A serpent\'s tooth bent into a ring. It still knows the way to a vein.',
    color: '#a0c050',
    code: 'Qf',
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
    color: '#8f7449',
    code: 'Sb',
  },
  {
    id: 'frost_quiver',
    name: 'Frost quiver',
    stackable: false,
    value: 240,
    equipSlot: 'offhand',
    backMounted: true,
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

/**
 * Tier name by tool power, for gate messages ("You need an Iron
 * pickaxe or better"). Power 1 is the shop-bought bronze starter;
 * everything above it must be forged.
 */
export const TOOL_TIER_NAMES: Record<number, string> = {
  1: 'Bronze',
  2: 'Iron',
  3: 'Steel',
  4: 'Mithril',
  5: 'Adamant',
  6: 'Starsteel',
};

// The tool ladder: every metal tier smiths a faster axe and pickaxe,
// so each new ore bracket immediately pays the gatherer back. Power
// climbs one point per tier; recipes live in recipes.ts (smith_*).
const TOOL_LADDER: Array<{
  metal: string; name: string; power: number; value: number; color: string;
  axeCode: string; pickCode: string; axeDesc: string; pickDesc: string;
}> = [
  { metal: 'iron', name: 'Iron', power: 2, value: 70, color: '#8d9299',
    axeCode: 'A2', pickCode: 'P2',
    axeDesc: 'Holds its edge through a full stand of oaks.',
    pickDesc: 'Rings truer and bites deeper than bronze.' },
  { metal: 'steel', name: 'Steel', power: 3, value: 210, color: '#b8bec8',
    axeCode: 'A3', pickCode: 'P3',
    axeDesc: 'The forester\'s pride — one swing, one wedge of wood.',
    pickDesc: 'Coal seams open like bread before it.' },
  { metal: 'mithril', name: 'Mithril', power: 4, value: 620, color: '#7fa8d9',
    axeCode: 'A4', pickCode: 'P4',
    axeDesc: 'So light the swing feels borrowed from someone stronger.',
    pickDesc: 'Sky-metal that makes the mountain feel soft.' },
  { metal: 'adamant', name: 'Adamant', power: 5, value: 1400, color: '#5fa06a',
    axeCode: 'A5', pickCode: 'P5',
    axeDesc: 'Green-edged and tireless. The tree loses every argument.',
    pickDesc: 'Nothing in the rock argues back anymore.' },
  { metal: 'starsteel', name: 'Starsteel', power: 6, value: 3200, color: '#cabdf2',
    axeCode: 'A6', pickCode: 'P6',
    axeDesc: 'It hums a note the forest seems to recognise.',
    pickDesc: 'A star digging for its buried kin.' },
];
for (const t of TOOL_LADDER) {
  defs.push(
    {
      id: `${t.metal}_axe`, name: `${t.name} axe`, stackable: false, value: t.value,
      equipSlot: 'tool', tool: { type: 'axe', power: t.power },
      desc: t.axeDesc, color: t.color, code: t.axeCode,
    },
    {
      id: `${t.metal}_pickaxe`, name: `${t.name} pickaxe`, stackable: false, value: t.value,
      equipSlot: 'tool', tool: { type: 'pickaxe', power: t.power },
      desc: t.pickDesc, color: t.color, code: t.pickCode,
    },
  );
}

// Enchant scrolls — one per EnchantDef, pure generation. A scroll is a
// plain stackable trade good: the enchanter's skill went into
// INSCRIBING it (see recipes.ts); anyone may apply one, which is how a
// specialist enchanter powers up the whole town's gear.
const SCROLL_VALUE_BY_TIER: Record<1 | 2 | 3, number> = { 1: 90, 2: 260, 3: 700 };
const scrollDefs: ItemDef[] = ENCHANT_DEFS.map((e, i) => ({
  id: `scroll_${e.id}`,
  name: `${e.name} Scroll`,
  stackable: true,
  value: SCROLL_VALUE_BY_TIER[e.tier],
  enchant: e.id,
  desc: `${e.desc} Use to bond onto your equipped ${e.slot === 'weapon' ? 'weapon' : e.slot + ' gear'}.`,
  color: ELEMENT_COLORS[e.element],
  code: `x${i.toString(36).toUpperCase()}`,
}));

// Recipe scrolls — one per unlockable recipe, pure generation. Each
// profession writes in its own voice (a smith draws schematics, a cook
// jots recipes), and the scroll is an ordinary stackable trade good:
// buy it from a trainer, loot it from a chest, sell it to a friend.
// Using it is what turns paper into knowledge (see gameServer.useItem).
const RECIPE_NOUN: Partial<Record<SkillId, string>> = {
  cooking: 'Recipe',
  smithing: 'Schematic',
  leatherworking: 'Pattern',
  tailoring: 'Pattern',
  woodworking: 'Plans',
  herbalism: 'Formula',
  enchanting: 'Treatise',
};
const RECIPE_INK: Partial<Record<SkillId, string>> = {
  cooking: '#e0995a',
  smithing: '#9aa7b8',
  leatherworking: '#b07d4f',
  tailoring: '#b06fb8',
  woodworking: '#8a9455',
  herbalism: '#69a869',
  enchanting: '#8f7fd4',
};
const recipeScrollDefs: ItemDef[] = UNLOCKABLE_RECIPES.map((r) => ({
  id: recipeScrollId(r.id),
  name: `${RECIPE_NOUN[r.skill] ?? 'Recipe'}: ${r.name}`,
  stackable: true,
  // Found lore prices above taught lore — it can't simply be bought.
  value: Math.round((20 + r.levelReq * 12) * (r.unlock === 'drop' ? 2 : 1)),
  teaches: r.id,
  desc: `Study to learn ${r.name.toLowerCase()} (${r.skill} ${r.levelReq}).`,
  color: RECIPE_INK[r.skill] ?? '#c9b98a',
  code: 'Rx',
}));

const allDefs: ItemDef[] = [...defs, ...scrollDefs, ...recipeScrollDefs, ...COMPILED_EQUIPMENT.items];

export const ITEMS: ReadonlyMap<string, ItemDef> = new Map(allDefs.map((d) => [d.id, d]));

if (ITEMS.size !== allDefs.length) {
  throw new Error('duplicate item id between inline defs and compiled equipment');
}

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS.get(id);
}

/**
 * THE TWO-HANDS LAW: every bow needs a drawing hand, every staff a
 * channeling one, and every greatweapon a second fist on the haft —
 * archery, magic, and twohand weapons are two-handed, derived from
 * style rather than flagged per item so no def can forget it.
 * A two-handed weapon shares the body with nothing HELD in the off
 * fist: no off blade, no shield, no tome, no orb. Back-mounted
 * offhands (quivers) ride the shoulders and are exempt. If one-handed
 * casters (wands) ever land, this is the law to widen.
 */
export function isTwoHanded(def: ItemDef): boolean {
  return def.weapon !== undefined && def.weapon.style !== 'melee';
}

/** What a fresh character carries. */
export const STARTER_KIT: Array<{ item: string; qty: number }> = [
  { item: 'bronze_axe', qty: 1 },
  { item: 'bronze_pickaxe', qty: 1 },
  { item: 'fishing_rod', qty: 1 },
  { item: 'bronze_sword', qty: 1 },
  { item: 'shortbow', qty: 1 },
  { item: 'arrow', qty: 50 },
  { item: 'apprentice_staff', qty: 1 },
  { item: 'coins', qty: 25 },
];

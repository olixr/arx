import type { EquipSlot, PassiveId, RarityTier, SkillId, StatusApply } from '@arx/shared';
import { COMPILED_EQUIPMENT } from './equipment/defs.js';
import { ELEMENT_COLORS, ENCHANT_DEFS, registerProc, type EnchantEffect, type EnchantTier } from './equipment/enchants.js';
import type { ArmorClass, GearSlot } from './equipment/types.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';
import { GRADED_PRODUCE, GRADE_NAMES, GRADE_VALUE_MULT, gradedId } from './farming.js';

export type ToolType = 'axe' | 'pickaxe' | 'rod';
export type CombatStyle = 'onehand' | 'archery' | 'arx' | 'twohand' | 'polearm';

/**
 * The elemental schools of Arx. A staff's element rides its bolts —
 * the client tints every projectile, muzzle flash, and impact from
 * this — and names the school its Art belongs to. Purely cosmetic on
 * the wire (`arx:<element>` in the projectile defId); the gameplay
 * lives in the Art and status the weapon carries.
 */
export type ArxElement =
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

/**
 * The schools, as a roster you can walk. The union alone cannot be
 * iterated, which meant nothing could ever ask "does every school have
 * workings of its own" — and the answer, for a long time, was no:
 * astral had none at all and void had two. Keep this in step with the
 * union above; the enchant tests walk it.
 */
export const ARX_ELEMENTS: readonly ArxElement[] = [
  'arcane',
  'ember',
  'frost',
  'storm',
  'verdant',
  'void',
  'radiant',
  'blood',
  'astral',
];

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
  /** Arx school (staves) — tints bolts, flashes, and impacts. */
  element?: ArxElement;
  /**
   * THE MOVESET BOOK: the weapon's authored fighting string. Unset =
   * the class default (daggers split off by the census identity in
   * `movesetFor`). Authoring this is how a design family gets its own
   * hands.
   */
  moveset?: MovesetId;
}

/** The moveset pages that exist — grown deliberately, per design family. */
export type MovesetId =
  | 'sword_string'
  | 'dagger_flurry'
  | 'great_string'
  | 'wand_rhythm'
  | 'fencer_line'
  | 'reaver_arc'
  | 'crusher_drop'
  | 'stormcall_weave'
  | 'kingsbane_verdict'
  | 'line_of_lance';

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
  /**
   * THE SWING CHANNEL's consumable lane (statusBook Phase 5): swing
   * cadence while the drink holds — folded with every other source,
   * band-clamped at the one pay site. Scarce by the same law as the
   * combat dials below.
   */
  attackSpeedMult?: number;
  /** Damage soaked before HP is touched. */
  shieldHp?: number;
  /** Gathering speed multiplier (mining, woodcutting, foraging, ...). */
  gatherSpeed?: number;
  /** HP restored every 4 seconds. */
  regenPer4s?: number;
  // THE LADEN TABLE (farming v2 Phase 5): the combat dials — held
  // DELIBERATELY scarce (top-end feasts and two named draughts).
  // The farmer feeds the raid; the raid still swings its own arms.
  /** Flat armor while the buff holds (folds beside gear armor). */
  armor?: number;
  /** Outgoing damage multiplier (1.05 = a feast, never a doubling). */
  dmgMult?: number;
  /** Additive crit chance in percent points. */
  critPct?: number;
  /**
   * THE SLIPPED BLOW's cup: percentage points of chance a blow misses
   * the drinker (folds beside the worn, leather and trained lanes;
   * capped at the roll). As scarce as the other combat dials.
   */
  evadePct?: number;
}

/**
 * A weapon oil — the poison-maker's craft. Using the vial coats the
 * EQUIPPED melee or archery weapon: while the coating lasts, every
 * landed basic attack carries the status. Arx focuses take no oil —
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
  /**
   * THE HOUSE WORD: the armor family this piece belongs to,
   * mechanically. An EXPLICIT field, never parsed from the id —
   * colorway lots share their family's set. Worn pieces of one set
   * are counted at the aggregate and speak the family's words
   * (SET_WORDS) at 2 and 4 pieces. Absent = no set (early lots,
   * weapons, offhands, capes).
   */
  set?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  stackable: boolean;
  /**
   * THE MEASURED STACK: how many of a stackable fit in one pack slot.
   * Absent = unlimited (coins, ammo, seeds — the featherweights).
   * Present (5–20) = the materials band: ores, logs, bars, food, and
   * brews stack for convenience, but a pack still fills — inventory
   * management stays a mechanic, just an optional one. Meaningless on
   * a non-stackable def; rolled gear NEVER stacks at any cap.
   */
  maxStack?: number;
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
  /**
   * THE CARRIED FLAME (lighting v4 phase 4): equipped, this item is a
   * real scene light — reach in tiles, color, peak intensity, held
   * height. Registered at entity-collect time, so a carried light
   * casts THIS frame's shadows. Flame-gated like every man-made fire
   * (it sleeps by day); above ground it is the night-walking verb,
   * below it replaces the underground courtesy lamp.
   */
  carryLight?: { r: number; rgb: readonly [number, number, number]; intensity: number; z: number };
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
  /**
   * Saddle paper: using it adds this MountDef id to the character's
   * stable (consumed on the grant) — the recipe-scroll pattern for
   * beasts. The mount itself is never an inventory item.
   */
  mount?: string;
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
  { id: 'log', name: 'Logs', stackable: true, maxStack: 10, value: 4, desc: 'Fresh-cut timber, still smelling of the woods.', color: '#8a6a45', code: 'Lg' },
  { id: 'oak_log', name: 'Oak logs', stackable: true, maxStack: 10, value: 12, desc: 'Dense oak heartwood — bowyers pay well for it.', color: '#6b4a26', code: 'Ok' },
  // THE MILLED-AND-WHOLE LAW (building v2): milled wood stacks FREE —
  // the builder hauls a wall in one slot, not a packful of trunks. One
  // log rips into three at the sawhorse; whole timber stays whole in
  // the RECIPES (posts, fires, gate beams, hafts, bow staves keep
  // costing logs), and THE MEASURED STACK caps a slot of trunks at 10
  // so milling still wins the hauling argument.
  { id: 'board', name: 'Boards', stackable: true, value: 2, desc: 'Sawn true and stacked flat; a wall is mostly patience.', color: '#a8794a', code: 'Bd' },
  { id: 'oak_board', name: 'Oak boards', stackable: true, value: 5, desc: 'Heavy heartwood planks, sawn slow so they stay honest.', color: '#6b4a26', code: 'Ob' },
  { id: 'pine_log', name: 'Pine logs', stackable: true, maxStack: 10, value: 18, desc: 'Straight-grained northwood, sticky with resin. It splits true.', color: '#b08050', code: 'Pq' },
  { id: 'pine_resin', name: 'Pine resin', stackable: true, value: 5, desc: 'Amber tears bled from cut northwood. They never quite dry.', color: '#d8963c', code: 'Rz' },
  { id: 'willow_log', name: 'Willow logs', stackable: true, maxStack: 10, value: 24, desc: 'Supple riverside wood that bends without breaking.', color: '#8a9455', code: 'Wq' },
  { id: 'yew_log', name: 'Yew logs', stackable: true, maxStack: 10, value: 52, desc: 'Slow-grown heartwood of the war bows. Kings taxed it.', color: '#7d4436', code: 'Yl' },

  // Ores
  { id: 'copper_ore', name: 'Copper ore', stackable: true, maxStack: 10, value: 6, desc: 'Soft red-brown ore. Half of every bronze bar.', color: '#b87333', code: 'Cu' },
  { id: 'tin_ore', name: 'Tin ore', stackable: true, maxStack: 10, value: 6, desc: 'Pale ore that hardens copper into bronze.', color: '#c9c4cf', code: 'Sn' },
  { id: 'iron_ore', name: 'Iron ore', stackable: true, maxStack: 10, value: 18, desc: 'Rust-flecked stone with real metal in its bones.', color: '#8d9299', code: 'Fe' },
  { id: 'coal', name: 'Coal', stackable: true, maxStack: 10, value: 22, desc: 'Black rock that burns hot enough for steelwork.', color: '#2e2b33', code: 'Co' },
  { id: 'gold_ore', name: 'Gold ore', stackable: true, maxStack: 10, value: 45, desc: 'Glittering seams of the mountain\'s treasure.', color: '#e8b64c', code: 'Au' },
  { id: 'silver_ore', name: 'Silver ore', stackable: true, maxStack: 10, value: 30, desc: 'Cold pale metal — moonlight the mountain kept.', color: '#dce4f0', code: 'Ag' },
  { id: 'mithril_ore', name: 'Mithril ore', stackable: true, maxStack: 10, value: 90, desc: 'Sky-blue and feather-light. The smith-songs all start here.', color: '#7fa8d9', code: 'Mi' },
  { id: 'adamant_ore', name: 'Adamant ore', stackable: true, maxStack: 10, value: 180, desc: 'Green-veined stone hard enough to chip the pick that wins it.', color: '#5fa06a', code: 'Ad' },
  { id: 'obsidian_shard', name: 'Obsidian shard', stackable: true, maxStack: 10, value: 240, desc: 'Volcanic glass, sharper than any whetstone will ever make steel.', color: '#453a52', code: 'Ob' },
  { id: 'starmetal_ore', name: 'Starmetal ore', stackable: true, maxStack: 10, value: 400, desc: 'It fell burning from the old sky. It remembers being a star.', color: '#cabdf2', code: 'St' },

  // Fish & food
  { id: 'raw_trout', name: 'Raw trout', stackable: true, maxStack: 10, value: 8, desc: 'A river trout, cold and slick. Cook it over a fire.', color: '#7fb2d9', code: 'Tr' },
  { id: 'raw_pike', name: 'Raw pike', stackable: true, maxStack: 10, value: 16, desc: 'A fen pike, all teeth and temper. Cook it over a fire.', color: '#7fa8c9', code: 'Pk' },
  { id: 'raw_eel', name: 'Raw eel', stackable: true, maxStack: 10, value: 26, desc: 'A channel eel, dark and strong. Cook it over a fire.', color: '#6b87a8', code: 'El' },
  { id: 'raw_salmon', name: 'Raw salmon', stackable: true, maxStack: 10, value: 38, desc: 'A cold-water salmon, bright as struck silver. Cook it over a fire.', color: '#9fb8d9', code: 'Sa' },
  { id: 'raw_glimmerfish', name: 'Raw glimmerfish', stackable: true, maxStack: 10, value: 60, desc: 'It shines faintly even out of the water. Cook it over a fire.', color: '#a8c4e8', code: 'Gl' },
  { id: 'raw_chicken', name: 'Raw chicken', stackable: true, maxStack: 10, value: 4, desc: 'Best not eaten as-is. The fire fixes that.', color: '#e8c9b0', code: 'Ch' },
  { id: 'raw_beef', name: 'Raw beef', stackable: true, maxStack: 10, value: 5, desc: 'A hearty cut from the pasture. Needs a fire.', color: '#c46a5a', code: 'Bf' },

  // Cooked food (heals on click)
  { id: 'trout', name: 'Trout', stackable: true, maxStack: 10, value: 12, heals: 4, desc: 'Flaky and hot off the fire.', color: '#d98a6a', code: 'Tr' },
  { id: 'pike', name: 'Pike', stackable: true, maxStack: 10, value: 24, heals: 6, desc: 'White flakes under crisp skin. Worth the teeth.', color: '#d9925f', code: 'Pk' },
  { id: 'eel', name: 'Eel', stackable: true, maxStack: 10, value: 38, heals: 9, desc: 'Rich and buttery. Best eaten hot.', color: '#d99a54', code: 'El' },
  { id: 'salmon', name: 'Salmon', stackable: true, maxStack: 10, value: 55, heals: 13, desc: 'Deep pink and hot off the fire.', color: '#e08a72', code: 'Sa' },
  { id: 'glimmerfish', name: 'Glimmerfish', stackable: true, maxStack: 10, value: 85, heals: 18, desc: 'The shine cooks into the flesh. It tastes like a clear night.', color: '#e8b072', code: 'Gl' },
  { id: 'cooked_chicken', name: 'Cooked chicken', stackable: true, maxStack: 10, value: 7, heals: 3, desc: 'Simple food that keeps an adventurer standing.', color: '#d9a86a', code: 'Ch' },
  { id: 'cooked_beef', name: 'Cooked beef', stackable: true, maxStack: 10, value: 8, heals: 4, desc: 'A proper meal after a proper fight.', color: '#b06a4a', code: 'Bf' },
  { id: 'burnt_food', name: 'Burnt food', stackable: true, maxStack: 20, value: 1, desc: 'You looked away for one moment. It noticed.', color: '#3a363f', code: 'Bt' },
  // Saltmere: the pans' harvest and the smokehouse school's dishes.
  { id: 'salt', name: 'Salt', stackable: true, value: 6, desc: 'The white harvest of the Saltmere pans. Half of cooking is knowing when.', color: '#f0ede4', code: 'Sa' },
  { id: 'smoked_trout', name: 'Smoked trout', stackable: true, maxStack: 10, value: 30, heals: 9, desc: 'Slow smoke, honest fish. Keeps for a long road.', color: '#c98a54', code: 'St' },
  {
    id: 'fishers_pot',
    name: "Fisher's pot",
    stackable: true,
    maxStack: 5,
    value: 48,
    heals: 13,
    buff: { name: 'Off the Mere', channel: 'food', durationSec: 300, regenPer4s: 1 },
    desc: 'Trout, milk, and pan salt, the way the crews eat it. Warms from the keel up.',
    color: '#d9b48a',
    code: 'Fp',
  },

  // Seeds — the start of every field
  { id: 'carrot_seed', name: 'Carrot seeds', stackable: true, value: 2, desc: 'Fast, forgiving, and sweet. Every farm starts here.', color: '#e8873d', code: 'Cs' },
  { id: 'sagewort_seed', name: 'Sagewort seeds', stackable: true, value: 5, desc: 'Papery seeds smelling faintly of medicine.', color: '#8fb083', code: 'Ss' },
  // THE SOWN LINE (second-growth Phase 4): a felled wood spills its
  // seed, and a planted seed joins the wild's own growth ledger.
  { id: 'tree_seed', name: 'Tree seeds', stackable: true, value: 3, desc: 'A handful of wild seeds. Any common wood may rise from them.', color: '#7a9b4a', code: 'Ts' },
  { id: 'acorn', name: 'Acorn', stackable: true, value: 8, desc: 'A fat oak seed, heavy with patience.', color: '#8a6a3a', code: 'Ac' },
  { id: 'pine_cone', name: 'Pine cone', stackable: true, value: 10, desc: 'A resin-sticky cone from the cold woods.', color: '#6f5a3c', code: 'Pc' },
  { id: 'willow_cutting', name: 'Willow cutting', stackable: true, value: 12, desc: 'A supple withy that roots where the ground is soft.', color: '#87a06b', code: 'Wc' },
  { id: 'yew_seed', name: 'Yew seeds', stackable: true, value: 20, desc: 'Dark seeds of the slowest, surest wood.', color: '#4a6b52', code: 'Yw' },
  { id: 'bush_cutting', name: 'Bush cutting', stackable: true, value: 4, desc: 'A berry cane ready to strike root in open ground.', color: '#9b5a6b', code: 'Bc' },
  { id: 'sunflower_seed', name: 'Sunflower seeds', stackable: true, value: 7, desc: 'Plant a little sun. Harvest a tall one.', color: '#e8c04c', code: 'Fs' },
  { id: 'wheat_seed', name: 'Wheat seeds', stackable: true, value: 8, desc: 'A handful of gold-to-be.', color: '#d9b45c', code: 'Ws' },
  { id: 'cotton_seed', name: 'Cotton seeds', stackable: true, value: 12, desc: 'Fluff futures, sold by the pinch.', color: '#e8e4da', code: 'Ct' },
  { id: 'moonbell_seed', name: 'Moonbell seeds', stackable: true, value: 20, desc: 'They only sprout for patient hands.', color: '#8f9ed6', code: 'Ms' },
  // THE FULL FIELD (Phase 2): the wave's seed pouches. Staples and
  // orchard starts sell in shops; the high herbs, the dark bed, and
  // the far-band roots come only from Jorel's seed stall, harvest
  // returns, and trade.
  { id: 'potato_seed', name: 'Seed potatoes', stackable: true, value: 3, desc: 'Eyes already open, looking for soil.', color: '#c9a26e', code: 'Ps' },
  { id: 'onion_seed', name: 'Onion sets', stackable: true, value: 5, desc: 'Small bulbs with big intentions.', color: '#d8c4a8', code: 'Os' },
  { id: 'cabbage_seed', name: 'Cabbage seeds', stackable: true, value: 7, desc: 'A whole patch folded very small.', color: '#8fb083', code: 'Cg' },
  { id: 'pumpkin_seed', name: 'Pumpkin seeds', stackable: true, value: 14, desc: 'Flat white promises of great weight.', color: '#e08a3d', code: 'Pu' },
  { id: 'barley_seed', name: 'Barley seed', stackable: true, value: 18, desc: 'The keg\'s first quiet word.', color: '#c9b45c', code: 'Bs' },
  { id: 'redroot_seed', name: 'Redroot seeds', stackable: true, value: 36, desc: 'Stain the pouch. Stain the hands. Worth it.', color: '#a8383d', code: 'Rs' },
  { id: 'kingsquash_seed', name: 'Kingsquash seeds', stackable: true, value: 64, desc: 'Each one the size of a thumbnail, and prouder.', color: '#e2d8b8', code: 'Ks' },
  { id: 'bittercress_seed', name: 'Bittercress seeds', stackable: true, value: 48, desc: 'The brewer\'s garden starts sour.', color: '#7a9c6e', code: 'Bt' },
  { id: 'silverleaf_seed', name: 'Silverleaf seeds', stackable: true, value: 80, desc: 'Sown under a bright moon, they say. They say a lot.', color: '#b8c4c9', code: 'Sv' },
  { id: 'duskthorn_seed', name: 'Duskthorn seeds', stackable: true, value: 130, desc: 'Handle with gloves and respect.', color: '#5e4a78', code: 'Du' },
  { id: 'dawnveil_seed', name: 'Dawnveil seeds', stackable: true, value: 200, desc: 'Rare as a quiet morning.', color: '#e8d8a8', code: 'Dw' },
  { id: 'adderstongue_seed', name: 'Adderstongue seeds', stackable: true, value: 100, desc: 'Sown by the careful. Harvested by the careful. Everything by the careful.', color: '#7aa83d', code: 'At' },
  { id: 'palegill_spores', name: 'Palegill spores', stackable: true, value: 120, desc: 'A twist of paper, a breath of pale dust, a log\'s new tenant.', color: '#c9c2b4', code: 'Pg' },
  { id: 'apple_sapling', name: 'Apple sapling', stackable: true, value: 10, desc: 'A whip of appletree, roots wrapped in damp cloth.', color: '#c94a3d', code: 'As' },
  { id: 'bramble_cutting', name: 'Bramble cutting', stackable: true, value: 12, desc: 'It will grab the whole fence if you let it.', color: '#a04a6e', code: 'Bm' },
  { id: 'plum_sapling', name: 'Plum sapling', stackable: true, value: 16, desc: 'Patience with a dusk-colored reward.', color: '#6e4a78', code: 'Pm' },
  { id: 'mirefig_sapling', name: 'Mirefig sapling', stackable: true, value: 28, desc: 'It remembers the mire. Water it like one.', color: '#8a6a45', code: 'Mg' },

  // Produce & foraged goods
  { id: 'carrot', name: 'Carrot', stackable: true, maxStack: 20, value: 4, heals: 2, desc: 'Crunchy straight from the soil.', color: '#e8873d', code: 'Ca' },
  { id: 'sagewort', name: 'Sagewort', stackable: true, maxStack: 20, value: 10, desc: 'A healer\'s herb — bitter leaf, kind intentions.', color: '#8fb083', code: 'Sw' },
  { id: 'sunflower', name: 'Sunflower', stackable: true, maxStack: 20, value: 8, desc: 'Follows the light. So do we all.', color: '#e8c04c', code: 'Sf' },
  { id: 'wheat', name: 'Wheat', stackable: true, maxStack: 20, value: 6, desc: 'A sheaf of ripe grain, ready for the mill.', color: '#d9b45c', code: 'Wh' },
  { id: 'cotton', name: 'Cotton', stackable: true, maxStack: 20, value: 10, desc: 'A cloud you can spin.', color: '#f2efe6', code: 'Cn' },
  { id: 'moonbell', name: 'Moonbell', stackable: true, maxStack: 20, value: 25, desc: 'Pale blue bells that glow faintly after dusk.', color: '#8f9ed6', code: 'Mb' },
  { id: 'berries', name: 'Berries', stackable: true, value: 3, heals: 2, desc: 'Sweet, wild, and occasionally shared with birds.', color: '#a04a6e', code: 'Br' },
  { id: 'plant_fibre', name: 'Plant fibre', stackable: true, value: 3, desc: 'Tough green strands, good for twisting into twine.', color: '#79a355', code: 'Pf' },
  // THE LIVING SOIL (farming v2 Phase 1): the bin's two harvests.
  // Made, never sold — the shop carries no shortcut to rich ground.
  { id: 'compost', name: 'Compost', stackable: true, value: 6, desc: 'Dark and crumbly. The field eats first.', color: '#4a3a28', code: 'Cp' },
  { id: 'prime_compost', name: 'Prime compost', stackable: true, value: 14, desc: 'Black gold, worked warm in the bin.', color: '#352a1e', code: 'Pc' },
  // THE FULL FIELD (Phase 2): the crop wave's harvests. Staples for
  // the pot, high herbs for the alembic, the dark bed's reagents,
  // and the orchard's fruit. Every one has a consumer (the law).
  { id: 'potato', name: 'Potato', stackable: true, maxStack: 20, value: 3, heals: 2, desc: 'Honest weight. A field you can hold.', color: '#c9a26e', code: 'Po' },
  { id: 'onion', name: 'Onion', stackable: true, maxStack: 20, value: 4, heals: 2, desc: 'Paper skin, sharp heart.', color: '#d8c4a8', code: 'On' },
  { id: 'cabbage', name: 'Cabbage', stackable: true, maxStack: 20, value: 5, heals: 3, desc: 'A hundred leaves keeping one secret.', color: '#8fb083', code: 'Cb' },
  { id: 'pumpkin', name: 'Pumpkin', stackable: true, maxStack: 20, value: 12, heals: 4, desc: 'The field\'s proudest lantern.', color: '#e08a3d', code: 'Pk' },
  { id: 'barley', name: 'Barley', stackable: true, maxStack: 20, value: 8, desc: 'Bearded grain, patient as winter.', color: '#c9b45c', code: 'Ba' },
  { id: 'redroot', name: 'Redroot', stackable: true, maxStack: 20, value: 16, heals: 5, desc: 'Bleeds crimson when the knife goes in.', color: '#a8383d', code: 'Rr' },
  { id: 'kingsquash', name: 'Kingsquash', stackable: true, maxStack: 20, value: 25, heals: 6, desc: 'Pale as the moon and twice as heavy.', color: '#e2d8b8', code: 'Kq' },
  { id: 'bittercress', name: 'Bittercress', stackable: true, maxStack: 20, value: 18, desc: 'Bitter on the tongue, kind in the kettle.', color: '#7a9c6e', code: 'Bc' },
  { id: 'silverleaf', name: 'Silverleaf', stackable: true, maxStack: 20, value: 26, desc: 'Catches lamplight like still water.', color: '#b8c4c9', code: 'Sl' },
  { id: 'duskthorn', name: 'Duskthorn', stackable: true, maxStack: 20, value: 36, desc: 'Picked at dusk, and it pricks back.', color: '#5e4a78', code: 'Dt' },
  { id: 'dawnveil', name: 'Dawnveil', stackable: true, maxStack: 20, value: 50, desc: 'Petals that hold the first light a while.', color: '#e8d8a8', code: 'Dv' },
  { id: 'venom_sac', name: 'Venom sac', stackable: true, maxStack: 10, value: 30, desc: 'The adder\'s tongue grows what the adder guards.', color: '#7aa83d', code: 'Vs' },
  { id: 'spore_dust', name: 'Spore dust', stackable: true, value: 22, desc: 'Pale motes off the palegill. Do not breathe in.', color: '#c9c2b4', code: 'Sd' },
  { id: 'apple', name: 'Apple', stackable: true, maxStack: 20, value: 5, heals: 3, desc: 'Sweet, crisp, and worth the wait.', color: '#c94a3d', code: 'Ap' },
  { id: 'plum', name: 'Plum', stackable: true, maxStack: 20, value: 7, heals: 4, desc: 'Dusk-dark skin over honey.', color: '#6e4a78', code: 'Pl' },
  { id: 'mirefig', name: 'Mirefig', stackable: true, maxStack: 20, value: 14, heals: 6, desc: 'The mire\'s one sweetness.', color: '#8a6a45', code: 'Mf' },

  // Farm-processed materials
  { id: 'twine', name: 'Twine', stackable: true, value: 8, desc: 'Fibre twisted until it agrees to hold things together.', color: '#b0a068', code: 'Tw' },
  { id: 'cloth', name: 'Cloth', stackable: true, maxStack: 10, value: 24, desc: 'A tidy bolt of woven cotton.', color: '#e8e4da', code: 'Cl' },
  { id: 'flour', name: 'Flour', stackable: true, value: 10, desc: 'Ground wheat. The quiet half of every bakery.', color: '#f2efe6', code: 'Fl' },
  { id: 'milk', name: 'Milk', stackable: true, maxStack: 5, value: 8, desc: 'A pail of fresh milk, still warm from the cow.', color: '#f4f2ec', code: 'Mk' },
  { id: 'egg', name: 'Egg', stackable: true, value: 4, desc: 'Laid this morning, judging by the smugness of the hen.', color: '#e8d9b0', code: 'Eg' },
  // THE ANIMALS OF THE YARD (farming v2 Phase 3): what the kept
  // herd pays, and the crated young the drover sells. A crate is
  // used at your OWN feed trough to release its animal into the
  // yard; the lead walks one away again at half the crate's worth.
  { id: 'wool', name: 'Wool', stackable: true, maxStack: 10, value: 12, desc: 'A whole fleece, oily and warm and enormous.', color: '#e8e2d4', code: 'Wl' },
  { id: 'truffle', name: 'Truffle', stackable: true, maxStack: 10, value: 60, desc: 'Ugly as sin. Chefs will duel over it.', color: '#4a3a30', code: 'Tf' },
  { id: 'chick_crate', name: 'Cheeping crate', stackable: false, value: 30, desc: 'A slat crate, very much alive. Release at your feed trough.', color: '#e8d9b0', code: 'Ck' },
  { id: 'calf_crate', name: 'Calf on a lead', stackable: false, value: 175, desc: 'All legs and appetite. Release at your feed trough.', color: '#e7ddca', code: 'Cf' },
  { id: 'lamb_crate', name: 'Lamb on a lead', stackable: false, value: 140, desc: 'A cloud with opinions. Release at your feed trough.', color: '#e8e2d4', code: 'Lb' },
  { id: 'boarlet_crate', name: 'Boarlet in a barrow', stackable: false, value: 350, desc: 'Striped, furious, and priceless in a few seasons. Release at your feed trough.', color: '#8a6a45', code: 'Bo' },
  { id: 'drovers_lead', name: "Drover's lead", stackable: false, value: 20, desc: 'A soft rope halter. Walks one yard animal back to the drover trade.', color: '#b0a068', code: 'Dl' },
  { id: 'truffle_roast', name: 'Truffle roast', stackable: true, maxStack: 10, value: 130, heals: 16, desc: 'The boar found it. The pan made it famous.', color: '#6e4a38', code: 'Tr' },
  // THE WORKING YARD (farming v2 Phase 4): what the stations turn
  // out, and the table it all lands on. Every one has a consumer.
  { id: 'butter', name: 'Butter', stackable: true, maxStack: 10, value: 24, heals: 2, desc: 'Churned gold. The pan\'s first friend.', color: '#e8c04c', code: 'Bu' },
  { id: 'soft_cheese', name: 'Soft cheese', stackable: true, maxStack: 10, value: 55, heals: 8, desc: 'Young, mild, and gone by supper.', color: '#efe9d4', code: 'Sc' },
  { id: 'hard_cheese', name: 'Hard cheese', stackable: true, maxStack: 10, value: 120, heals: 14, desc: 'Aged in the churn\'s long patience. Knock it; it answers.', color: '#d8b45c', code: 'Hc' },
  { id: 'cooking_oil', name: 'Cooking oil', stackable: true, maxStack: 10, value: 40, desc: 'Pressed sunflower, bright as morning.', color: '#e0c46a', code: 'Co' },
  { id: 'cider', name: 'Cider', stackable: true, maxStack: 10, value: 50, heals: 6, desc: 'Orchard sunshine with a low hum.', color: '#d8963c', code: 'Ci' },
  { id: 'vinegar', name: 'Vinegar', stackable: true, maxStack: 10, value: 30, desc: 'Cider that chose a working life.', color: '#c9a86a', code: 'Vn' },
  { id: 'pickled_cabbage', name: 'Pickled cabbage', stackable: true, maxStack: 10, value: 40, heals: 7, desc: 'Sour, loud, and it keeps all winter.', color: '#a3b877', code: 'Pj' },
  {
    id: 'farmhouse_ale',
    name: 'Farmhouse ale',
    stackable: true,
    maxStack: 5,
    value: 85,
    heals: 6,
    buff: { name: 'Hearty Ale', channel: 'tonic', durationSec: 120, shieldHp: 6 },
    desc: 'Barley\'s answer to a long day. Best shared.',
    color: '#b8862e',
    code: 'Fa',
  },
  {
    id: 'honeybrew',
    name: 'Honeybrew',
    stackable: true,
    maxStack: 5,
    value: 160,
    heals: 8,
    buff: { name: 'Honeybrew', channel: 'tonic', durationSec: 100, regenPer4s: 2 },
    desc: 'The hive\'s sweetness, kegged and warming.',
    color: '#e0a83c',
    code: 'Hb',
  },
  { id: 'smoked_beef', name: 'Smoked beef', stackable: true, maxStack: 10, value: 35, heals: 8, desc: 'Cured slow. Travels far.', color: '#8a4a38', code: 'Sb' },
  { id: 'smoked_eel', name: 'Smoked eel', stackable: true, maxStack: 10, value: 70, heals: 12, desc: 'The mere\'s slipperiest, made honest by smoke.', color: '#6e5a4a', code: 'Se' },
  { id: 'dried_sagewort', name: 'Dried sagewort', stackable: true, maxStack: 10, value: 30, desc: 'Two herbs\' strength in one papery twist.', color: '#7a9c6e', code: 'Ds' },
  { id: 'dried_moonbell', name: 'Dried moonbell', stackable: true, maxStack: 10, value: 70, desc: 'The glow fades. The power keeps.', color: '#8f9ed6', code: 'Dm' },
  { id: 'dried_bittercress', name: 'Dried bittercress', stackable: true, maxStack: 10, value: 55, desc: 'Concentrated argument, herbalist-grade.', color: '#5e7a52', code: 'Db' },
  { id: 'honey', name: 'Honey', stackable: true, maxStack: 10, value: 35, heals: 3, desc: 'The apiary\'s rent, paid in gold.', color: '#e0a83c', code: 'Hn' },
  { id: 'beeswax', name: 'Beeswax', stackable: true, value: 25, desc: 'The comb\'s quiet second gift.', color: '#d8c98e', code: 'Bw' },
  { id: 'buttered_potatoes', name: 'Buttered potatoes', stackable: true, maxStack: 10, value: 34, heals: 9, desc: 'The field and the churn, agreeing.', color: '#d8b45c', code: 'Bp' },
  { id: 'panfried_trout', name: 'Panfried trout', stackable: true, maxStack: 10, value: 60, heals: 11, desc: 'Crisp-skinned in bright oil.', color: '#c9915c', code: 'Pt' },
  {
    id: 'ploughmans_board',
    name: "Ploughman's board",
    stackable: true,
    maxStack: 5,
    value: 130,
    heals: 15,
    buff: { name: "Ploughman's Rest", channel: 'food', durationSec: 300, regenPer4s: 1 },
    desc: 'Bread, hard cheese, and an apple. A whole afternoon\'s peace.',
    color: '#c9a86a',
    code: 'Pb',
  },
  {
    id: 'travelers_draught',
    name: "Traveler's draught",
    stackable: true,
    maxStack: 5,
    value: 150,
    heals: 10,
    buff: { name: "Traveler's Draught", channel: 'tonic', durationSec: 240, gatherSpeed: 1.3 },
    desc: 'Dried sagewort steeped strong for the long road.',
    color: '#7a9c6e',
    code: 'Td',
  },
  {
    id: 'moonlit_salve',
    name: 'Moonlit salve',
    stackable: true,
    maxStack: 5,
    value: 220,
    buff: { name: 'Moonlit', channel: 'tonic', durationSec: 90, regenPer4s: 3 },
    desc: 'Dried moonbell in beeswax. Cool as its namesake.',
    color: '#8f9ed6',
    code: 'Ml',
  },
  {
    id: 'ironroot_draught',
    name: 'Ironroot draught',
    stackable: true,
    maxStack: 5,
    value: 280,
    buff: { name: 'Ironroot', channel: 'tonic', durationSec: 240, shieldHp: 18 },
    desc: 'Bittercress and redroot holding the line together.',
    color: '#a8383d',
    code: 'Ir',
  },
  // THE LADEN TABLE (farming v2 Phase 5): the buff kitchen — the
  // farmer feeds the raid. Combat dials stay scarce and modest.
  {
    id: 'honeyed_carrots',
    name: 'Honeyed carrots',
    stackable: true,
    maxStack: 5,
    value: 60,
    heals: 8,
    buff: { name: 'Honeyed', channel: 'food', durationSec: 240, armor: 2 },
    desc: 'The hive glazes the field. Everyone wins.',
    color: '#e8873d',
    code: 'Hy',
  },
  {
    id: 'pumpkin_pie',
    name: 'Pumpkin pie',
    stackable: true,
    maxStack: 5,
    value: 150,
    heals: 14,
    buff: { name: 'Harvest Warmth', channel: 'food', durationSec: 300, armor: 3, regenPer4s: 1 },
    desc: 'The showpiece gourd, crowned in crust.',
    color: '#e08a3d',
    code: 'Pp',
  },
  {
    id: 'shepherds_pie',
    name: "Shepherd's pie",
    stackable: true,
    maxStack: 5,
    value: 240,
    heals: 16,
    buff: { name: "Shepherd's Rest", channel: 'food', durationSec: 300, armor: 4 },
    desc: 'Potato roof, smoked-beef heart. A wall you can eat.',
    color: '#a8875c',
    code: 'Sp',
  },
  {
    id: 'orchard_tart',
    name: 'Orchard tart',
    stackable: true,
    maxStack: 5,
    value: 280,
    heals: 15,
    buff: { name: 'Orchard Bright', channel: 'food', durationSec: 240, critPct: 3 },
    desc: 'Sharp fruit, sweet honey, steady hands.',
    color: '#c94a3d',
    code: 'Ot',
  },
  {
    id: 'harvest_feast',
    name: 'Harvest feast',
    stackable: true,
    maxStack: 5,
    value: 520,
    heals: 20,
    buff: { name: 'Harvest Feast', channel: 'food', durationSec: 300, dmgMult: 1.05 },
    desc: 'The whole farm on one board. Armies have marched on less.',
    color: '#c9a86a',
    code: 'Hf',
  },
  {
    id: 'royal_banquet',
    name: 'Royal banquet',
    stackable: true,
    maxStack: 5,
    value: 950,
    heals: 24,
    buff: { name: 'Royal Banquet', channel: 'food', durationSec: 360, dmgMult: 1.06, regenPer4s: 1 },
    desc: 'Prime everything. The crown would approve, if invited.',
    color: '#e8c04c',
    code: 'Rb',
  },
  // Herbalism's high shelf: the ladder runs to 90, and the master
  // brews ASK for prime herbs by name (grade scales magnitude
  // through the recipe tier — the alembic reads labels, not luck).
  {
    id: 'ironhide_draught',
    name: 'Ironhide draught',
    stackable: true,
    maxStack: 5,
    value: 240,
    buff: { name: 'Ironhide', channel: 'tonic', durationSec: 240, armor: 4 },
    desc: 'Redroot\'s stubbornness boiled to a standstill.',
    color: '#8a4a38',
    code: 'Ih',
  },
  {
    id: 'hunters_eye_brew',
    name: "Hunter's eye brew",
    stackable: true,
    maxStack: 5,
    value: 340,
    buff: { name: "Hunter's Eye", channel: 'tonic', durationSec: 180, critPct: 4 },
    desc: 'Silverleaf sharpens what the dusk hides.',
    color: '#b8c4c9',
    code: 'He',
  },
  {
    id: 'prime_tincture',
    name: 'Prime tincture',
    stackable: true,
    maxStack: 10,
    value: 420,
    heals: 26,
    desc: 'Prime bittercress, and nothing less would do.',
    color: '#c94a3d',
    code: 'Pi',
  },
  {
    id: 'dawnfire_elixir',
    name: 'Dawnfire elixir',
    stackable: true,
    maxStack: 5,
    value: 560,
    heals: 24,
    buff: { name: 'Dawnfire', channel: 'tonic', durationSec: 120, regenPer4s: 3 },
    desc: 'Dawnveil steeped until it glows twice.',
    color: '#e8a83c',
    code: 'Df',
  },
  {
    id: 'master_draught',
    name: "Master's draught",
    stackable: true,
    maxStack: 5,
    value: 900,
    heals: 30,
    buff: { name: "Master's Draught", channel: 'tonic', durationSec: 300, shieldHp: 20 },
    desc: 'The high shelf\'s whole argument in one bottle.',
    color: '#e8d8a8',
    code: 'Md',
  },

  // Homestead cooking
  { id: 'bread', name: 'Bread', stackable: true, maxStack: 10, value: 14, heals: 6, desc: 'A warm loaf with a crust worth fighting over.', color: '#c49a5c', code: 'Bd' },
  { id: 'fried_egg', name: 'Fried egg', stackable: true, maxStack: 10, value: 6, heals: 3, desc: 'Sunny side up, like all good mornings.', color: '#f2d98a', code: 'Fe' },
  // THE FULL FIELD (Phase 2): the crop kitchen returns — plain
  // hearth food from the new staples (the buff-feast wave is THE
  // LADEN TABLE's; these carry heals and the farm's good name).
  { id: 'baked_potato', name: 'Baked potato', stackable: true, maxStack: 10, value: 8, heals: 4, desc: 'Ash on the skin, cloud in the middle.', color: '#c9a26e', code: 'Bp' },
  { id: 'onion_soup', name: 'Onion soup', stackable: true, maxStack: 10, value: 16, heals: 6, desc: 'Slow-browned and honest.', color: '#c99c5c', code: 'Ou' },
  { id: 'hearty_pottage', name: 'Hearty pottage', stackable: true, maxStack: 10, value: 26, heals: 9, desc: 'Potato, onion, and cabbage holding council.', color: '#a8905c', code: 'Hp' },
  { id: 'roast_pumpkin', name: 'Roast pumpkin', stackable: true, maxStack: 10, value: 34, heals: 11, desc: 'Sweet enough to argue with dessert.', color: '#e08a3d', code: 'Rp' },
  { id: 'barley_porridge', name: 'Barley porridge', stackable: true, maxStack: 10, value: 30, heals: 10, desc: 'Milk and grain. The wall a cold morning breaks against.', color: '#d8c9a0', code: 'Bl' },
  { id: 'orchard_crumble', name: 'Orchard crumble', stackable: true, maxStack: 10, value: 44, heals: 12, desc: 'Apple and plum under a flour lid.', color: '#c98a5c', code: 'Oc' },
  { id: 'roast_redroot', name: 'Roast redroot', stackable: true, maxStack: 10, value: 52, heals: 14, desc: 'Crimson to the plate\'s edge.', color: '#a8383d', code: 'Rt' },
  { id: 'kingsquash_bake', name: 'Kingsquash bake', stackable: true, maxStack: 10, value: 72, heals: 18, desc: 'A slice feeds a shift. The whole one feeds a crew.', color: '#e2d8b8', code: 'Kb' },
  {
    id: 'hearty_stew',
    name: 'Hearty stew',
    stackable: true,
    maxStack: 5,
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
    stackable: true,
    maxStack: 5,
    value: 40,
    heals: 10,
    buff: { name: 'Sugar Rush', channel: 'food', durationSec: 180, speedMult: 1.08 },
    desc: 'Flour, egg, milk, and a spring in your step.',
    color: '#e8b6c9',
    code: 'Ck',
  },

  // Herbalism — tinctures and tonics from the alembic bench
  { id: 'healing_tincture', name: 'Healing tincture', stackable: true, maxStack: 10, value: 30, heals: 8, desc: 'Sagewort distilled to its kindest form.', color: '#d65a5a', code: 'Ht' },
  {
    id: 'gatherers_brew',
    name: 'Gatherer\'s brew',
    stackable: true,
    maxStack: 5,
    value: 45,
    buff: { name: 'Gatherer\'s Eye', channel: 'tonic', durationSec: 180, gatherSpeed: 1.25 },
    desc: 'The world gives up its goods a little faster.',
    color: '#7fc9b3',
    code: 'Gb',
  },
  {
    id: 'swiftness_tonic',
    name: 'Swiftness tonic',
    stackable: true,
    maxStack: 5,
    value: 60,
    buff: { name: 'Swiftness', channel: 'tonic', durationSec: 60, speedMult: 1.2 },
    desc: 'Tastes like wind. Works like it too.',
    color: '#8fd0e8',
    code: 'St',
  },
  {
    // THE SWING CHANNEL's roster debut (statusBook Phase 5): the first
    // authored swing haste in the game — modest, inside the band, on
    // the exclusive tonic channel (drinking it costs you the shelf's
    // other draughts; the chip's HONEST RING drains it in plain sight).
    id: 'quickstep_tonic',
    name: 'Quickstep tonic',
    stackable: true,
    maxStack: 5,
    value: 85,
    buff: { name: 'Quickstep', channel: 'tonic', durationSec: 75, attackSpeedMult: 1.1 },
    desc: 'The hand arrives before the thought does. Blades first, questions after.',
    color: '#ffd76a',
    code: 'Qt',
  },
  // ---- THE STABLE DOOR (docs/mounts-plan.md Phase 4): a saddle item
  // IS the purchase — using it brings the beast to your string and the
  // paper leaves the pack. Sold at Osa's yard in Silverfall.
  {
    id: 'bay_courser',
    name: 'Bay courser',
    stackable: false,
    value: 1200,
    mount: 'courser_bay',
    desc: 'A steady bay off the High Road strings, sold saddled and shod.',
    color: '#7b4a2e',
    code: 'Cb',
  },
  {
    id: 'grey_courser',
    name: 'Grey courser',
    stackable: false,
    value: 1200,
    mount: 'courser_grey',
    desc: "A thaw grey courser out of Osa's yard, sold saddled and shod.",
    color: '#b7b3a8',
    code: 'Cg',
  },
  {
    id: 'dun_courser',
    name: 'Dun courser',
    stackable: false,
    value: 1200,
    mount: 'courser_dun',
    desc: 'A black legged dun, mountain bred, sold saddled and shod.',
    color: '#b2905e',
    code: 'Cd',
  },
  {
    id: 'hoargate_garron',
    name: 'Hoargate garron',
    stackable: false,
    value: 1200,
    mount: 'garron_hoargate',
    desc: 'A shaggy pass pony off the Pinewatch strings, sold saddled and shod.',
    color: '#6d5c49',
    code: 'Gh',
  },
  {
    id: 'night_sabercat',
    name: 'Night sabercat',
    stackable: false,
    value: 5000,
    mount: 'sabercat_night',
    desc: 'A harness cut for no horse, and the cat that answers to it. Nobody sells these.',
    color: '#4a4f63',
    code: 'Sn',
  },
  {
    id: 'ironbark_tonic',
    name: 'Ironbark tonic',
    stackable: true,
    maxStack: 5,
    value: 70,
    buff: { name: 'Ironbark', channel: 'tonic', durationSec: 120, shieldHp: 6 },
    desc: 'Your skin remembers being a tree.',
    color: '#9c7440',
    code: 'It',
  },
  // THE FULL FIELD (Phase 2): the high herbs find their bottles —
  // the bridge brews that carry herbalism past 40 (the full ladder
  // and its new buff dials land with THE LADEN TABLE).
  {
    id: 'greater_healing_tincture',
    name: 'Greater healing tincture',
    stackable: true,
    maxStack: 10,
    value: 130,
    heals: 16,
    desc: 'Bittercress does the work. The honey makes it bearable.',
    color: '#c94a3d',
    code: 'Gt',
  },
  {
    id: 'silverleaf_salve',
    name: 'Silverleaf salve',
    stackable: true,
    maxStack: 5,
    value: 160,
    buff: { name: 'Silverleaf', channel: 'tonic', durationSec: 60, regenPer4s: 3 },
    desc: 'Cool as the leaf it came from.',
    color: '#b8c4c9',
    code: 'Sx',
  },
  {
    id: 'duskthorn_draught',
    name: 'Duskthorn draught',
    stackable: true,
    maxStack: 5,
    value: 210,
    buff: { name: 'Duskthorn', channel: 'tonic', durationSec: 180, shieldHp: 14 },
    desc: 'The thorn\'s stubbornness, decanted.',
    color: '#5e4a78',
    code: 'Dd',
  },
  {
    id: 'dawnveil_elixir',
    name: 'Dawnveil elixir',
    stackable: true,
    maxStack: 5,
    value: 320,
    heals: 20,
    buff: { name: 'Dawnveil', channel: 'tonic', durationSec: 120, regenPer4s: 2 },
    desc: 'First light, kept. Drink it slowly.',
    color: '#e8d8a8',
    code: 'De',
  },
  {
    id: 'mending_salve',
    name: 'Mending salve',
    stackable: true,
    maxStack: 5,
    value: 90,
    buff: { name: 'Mending', channel: 'tonic', durationSec: 40, regenPer4s: 2 },
    desc: 'Moonbell and milk, whipped into quiet miracles.',
    color: '#c9a8e8',
    code: 'Msv',
  },

  // Poison-making — the alembic's dark branch. Vials coat melee
  // weapons and bows (never Arx); the maker's herbalism gates the
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
    stackable: true,
    maxStack: 5,
    value: 45,
    coating: { name: 'Adderfang oil', durationSec: 180, status: { status: 'venom', power: 1, durationTicks: 80 } },
    desc: 'The apprentice poisoner\'s first argument. Thin, green, and persuasive.',
    color: '#a0c050',
    code: 'Ao',
  },
  {
    id: 'hobble_brew',
    name: 'Hobblebrew',
    stackable: true,
    maxStack: 5,
    value: 55,
    coating: { name: 'Hobblebrew', durationSec: 180, status: { status: 'chill', power: 1, durationTicks: 70 } },
    desc: 'Moonbell distilled to a numbing syrup. Whatever you cut walks home slowly.',
    color: '#8f9ed6',
    code: 'Hb',
  },
  {
    id: 'vipers_kiss',
    name: 'Viper\'s kiss',
    stackable: true,
    maxStack: 5,
    value: 110,
    coating: { name: 'Viper\'s kiss', durationSec: 300, status: { status: 'venom', power: 2, durationTicks: 100 } },
    desc: 'Twice the gland, half the mercy. The journeyman\'s vial.',
    color: '#7a9a2a',
    code: 'Vk',
  },
  {
    id: 'firepitch_oil',
    name: 'Firepitch oil',
    stackable: true,
    maxStack: 5,
    value: 60,
    coating: { name: 'Firepitch', durationSec: 180, status: { status: 'burn', power: 1, durationTicks: 80 } },
    desc: 'Resin cut with ground emberstone. It wants one excuse to light.',
    color: '#e07a38',
    code: 'Fo',
  },
  {
    id: 'leadfoot_oil',
    name: 'Leadfoot oil',
    stackable: true,
    maxStack: 5,
    value: 130,
    coating: { name: 'Leadfoot oil', durationSec: 360, status: { status: 'chill', power: 2, durationTicks: 110 } },
    desc: 'The chase ends where this begins. Boots of lead, sold by the drop.',
    color: '#6a7ab8',
    code: 'Lo',
  },
  {
    id: 'wyrmtongue_oil',
    name: 'Wyrmtongue oil',
    stackable: true,
    maxStack: 5,
    value: 240,
    coating: { name: 'Wyrmtongue oil', durationSec: 480, status: { status: 'venom', power: 3, durationTicks: 120 } },
    desc: 'The master\'s reserve — green-black, slow to pour, quick to collect debts.',
    color: '#4a6a2a',
    code: 'Wy',
  },
  {
    // THE FULL FIELD: the dark bed's own masterwork — grown venom,
    // ground spores, and a longer bite than anything looted.
    id: 'palegill_oil',
    name: 'Palegill oil',
    stackable: true,
    maxStack: 5,
    value: 320,
    coating: { name: 'Palegill oil', durationSec: 600, status: { status: 'venom', power: 4, durationTicks: 130 } },
    desc: 'Pale going on, invisible dried. The gardener\'s quiet argument.',
    color: '#c9c2b4',
    code: 'Pv',
  },

  // Homestead sundries — flower_crown now lives in equipment/defs.ts.
  { id: 'watering_can', name: 'Watering can', stackable: false, value: 30, desc: 'Carry a little rain wherever you garden.', color: '#7a8fa5', code: 'Wc' },

  // Metal bars
  { id: 'bronze_bar', name: 'Bronze bar', stackable: true, maxStack: 10, value: 16, desc: 'The classic alloy — one part copper, one part tin.', color: '#a4744b', code: 'Bb' },
  { id: 'iron_bar', name: 'Iron bar', stackable: true, maxStack: 10, value: 30, desc: 'Honest metal, ready for the anvil.', color: '#8d9299', code: 'Ib' },
  { id: 'steel_bar', name: 'Steel bar', stackable: true, maxStack: 10, value: 80, desc: 'Iron improved by coal and patience.', color: '#b8bec8', code: 'Sb' },
  { id: 'gold_bar', name: 'Gold bar', stackable: true, maxStack: 10, value: 95, desc: 'Soft, heavy, and worth its weight in itself.', color: '#f2c94c', code: 'Gb' },
  { id: 'silver_bar', name: 'Silver bar', stackable: true, maxStack: 10, value: 60, desc: 'Takes a mirror polish and an enchanter\'s whisper equally well.', color: '#dce4f0', code: 'Vb' },
  { id: 'mithril_bar', name: 'Mithril bar', stackable: true, maxStack: 10, value: 200, desc: 'Half the weight of steel, twice the spine.', color: '#7fa8d9', code: 'Mb' },
  { id: 'adamant_bar', name: 'Adamant bar', stackable: true, maxStack: 10, value: 420, desc: 'The anvil complains the whole time. It\'s worth it.', color: '#5fa06a', code: 'Ab' },
  { id: 'starsteel_bar', name: 'Starsteel bar', stackable: true, maxStack: 10, value: 950, desc: 'Sky-metal folded over coal-fire until it holds its own faint light.', color: '#cabdf2', code: 'Xb' },

  // Crafting materials & gear — armor pieces live in equipment/defs.ts.
  { id: 'leather', name: 'Leather', stackable: true, maxStack: 10, value: 12, desc: 'Cured hide, supple and strong.', color: '#b08a5c', code: 'Le' },
  // Swords live in equipment/defs.ts (the blade roster) — rolled gear.
  // Smithed valuables — the goldsmith's vendor line.
  { id: 'gold_ring', name: 'Gold ring', stackable: true, maxStack: 10, value: 180, desc: 'A goldsmith\'s staple. Vendors adore them.', color: '#f2c94c', code: 'Gr' },
  { id: 'silver_ring', name: 'Silver ring', stackable: true, maxStack: 10, value: 120, desc: 'Moon-pale and mirror-bright. The quiet fortune-maker.', color: '#dce4f0', code: 'Sr' },

  // Monster drops
  { id: 'bones', name: 'Bones', stackable: true, maxStack: 20, value: 2, desc: 'Every creature leaves some behind.', color: '#e6e0d0', code: 'Bn' },
  { id: 'feather', name: 'Feather', stackable: true, value: 1, desc: 'Light as rumor. Fletchers want them by the fistful.', color: '#f4efe4', code: 'Ft' },
  { id: 'cowhide', name: 'Cowhide', stackable: true, maxStack: 10, value: 8, desc: 'A whole hide, ready for the tanner\'s bench.', color: '#a08468', code: 'Hd' },
  { id: 'wolf_fur', name: 'Wolf fur', stackable: true, maxStack: 10, value: 20, desc: 'Thick winter fur, smoke-grey and warm.', color: '#6a6f7d', code: 'Wf' },
  { id: 'direwolf_pelt', name: 'Dire wolf pelt', stackable: true, maxStack: 5, value: 110, desc: 'Broad as a bedroll, storm-dark and frost-tipped — her winters written in the scars.', color: '#4b4854', code: 'Dp' },
  { id: 'worg_fang', name: 'Worg fang', stackable: true, maxStack: 10, value: 38, desc: 'An up-hooked lower fang, long as a skinning knife. The goblins drill them for war-charms.', color: '#d8ccb0', code: 'Wg' },
  { id: 'feywolf_pelt', name: 'Fey wolf pelt', stackable: true, maxStack: 5, value: 260, desc: 'Moon-lavender and cold to the hand years after the skinning. In the right dark it still glimmers, and the furrier will not say what the wrong dark is.', color: '#9a94b4', code: 'Fp' },
  { id: 'lynx_pelt', name: 'Lynx pelt', stackable: true, maxStack: 10, value: 24, desc: 'Rosette-spotted and soft as ash. The ear tufts are still on it — furriers pay for the tufts, and the tanning rack takes everything under them.', color: '#9c7f55', code: 'Lx' },
  { id: 'duskruff_pelt', name: 'Duskruff pelt', stackable: true, maxStack: 5, value: 120, desc: 'Storm-grey with silver rosettes, the great ruff intact. It was the wood\'s quietest killer, and now it is a coat.', color: '#565064', code: 'Dk' },
  { id: 'fox_pelt', name: 'Fox pelt', stackable: true, maxStack: 10, value: 22, desc: 'Winter-plush with the white-flagged brush still on it. Furriers pay for the flag; the rack pays for the rest, three leathers at a time.', color: '#b4622a', code: 'Fx' },
  { id: 'smokebrush_pelt', name: 'Smokebrush pelt', stackable: true, maxStack: 5, value: 115, desc: 'Ember-dark under a silvered mask, the great brush ending in smoke and one ring of fire. The hedges are quieter now.', color: '#6b3226', code: 'Sb' },
  { id: 'turtle_scute', name: 'Turtle scute', stackable: true, maxStack: 10, value: 24, desc: 'One keeled plate off a giant turtle\'s shell, harder than boiled leather and half the weight. Shieldwrights argue over the good ones.', color: '#4a5238', code: 'Ts' },
  { id: 'colossus_plate', name: 'Colossus shell plate', stackable: true, maxStack: 5, value: 135, desc: 'A moss-grown slab of shell wider than a tower shield. The scars on it are older than the road you carried it home on.', color: '#59604f', code: 'Cp' },
  { id: 'crab_carapace', name: 'Crab carapace', stackable: true, maxStack: 8, value: 42, desc: 'A storm-worn plate off a giant crab\'s back, barnacles and all. Armorers boil it, curse it, and buy another.', color: '#46655c', code: 'Cc' },
  { id: 'crusher_claw', name: 'Crusher claw', stackable: true, maxStack: 5, value: 125, desc: 'The great claw entire, heavy as a smith\'s anvil and shaped like a verdict. What it closed on, it kept.', color: '#587566', code: 'Cw' },
  // THE STONE COURT — the basilisk drops. Scale off the gaze line, hide
  // off the fen, and the elder's eye for the collectors brave enough.
  { id: 'basilisk_scale', name: 'Basilisk scale', stackable: true, maxStack: 8, value: 48, desc: 'A palm-wide scute of dull grey horn, heavier than it looks. Held to the light it shows a faint green sheen, like something in it is still watching. Tanners lap them over boiled leather and let it keep watching.', color: '#6b6a52', code: 'Bs' },
  { id: 'fen_basilisk_hide', name: 'Fen basilisk hide', stackable: true, maxStack: 10, value: 24, desc: 'Olive-dark keeled leather off a marsh lurker, smelling of still water. Tanners prize it; the fen wants it back.', color: '#5c6644', code: 'Fh' },
  { id: 'petrified_eye', name: 'Petrified eye', stackable: true, maxStack: 5, value: 155, desc: 'An elder basilisk\'s eye, gone all the way to agate. It no longer turns anything to stone, as far as anyone has proven.', color: '#b9d18c', code: 'Pe' },
  { id: 'skral_frill', name: 'Skral frill', stackable: true, maxStack: 10, value: 28, desc: 'A crest fin off a brine-folk skull, rays and membrane whole. Dried flat it holds its colors; wet, it almost stands up again.', color: '#5f9a84', code: 'Sf' },
  { id: 'deepking_pearl', name: 'Deepking\'s pearl', stackable: true, maxStack: 5, value: 130, desc: 'A pale sphere the size of a plum, worn smooth against a king\'s throat. The bank is quieter now, and the water is not.', color: '#dfe3d6', code: 'Dp' },
  { id: 'legion_ring', name: 'Legion queue-ring', stackable: true, maxStack: 10, value: 30, desc: 'An iron band cut from a hobgoblin\'s war braid, the rank-notches still legible. The legion counts its dead by these.', color: '#767c86', code: 'Lq' },
  { id: 'warlord_crest', name: 'Warlord\'s crest', stackable: true, maxStack: 5, value: 135, desc: 'The crimson comb off an officer\'s galea, horsehair stiff with march dust. Somewhere a legion is standing very still, waiting for an order that is not coming.', color: '#8e2f2c', code: 'Wc' },
  { id: 'gnoll_hide', name: 'Gnoll hide', stackable: true, maxStack: 10, value: 26, desc: 'Speckled gray-brown fur over dull green skin. Smells of old camps and older kills. Scraped and boiled it makes perfectly honest leather, which it would hate.', color: '#8a7a58', code: 'Gh' },
  { id: 'packlord_mane', name: 'Packlord mane', stackable: true, maxStack: 5, value: 120, desc: 'A bristled crest cut from the biggest back in the warband. The cackling stopped when it fell.', color: '#4e4034', code: 'Pm' },
  { id: 'warboss_tusk', name: 'Warboss tusk', stackable: true, maxStack: 5, value: 110, desc: 'A worn yellow tusk off the biggest jaw in the camp. The arguments are quieter now.', color: '#e9e0c6', code: 'Wt' },
  { id: 'razorback_tusk', name: 'Razorback tusk', stackable: true, maxStack: 5, value: 120, desc: 'An aged ivory scimitar off the old razorback. The chip in it belonged to something bigger.', color: '#dccfa8', code: 'Rk' },
  { id: 'scrap_hide', name: 'Scrap hide', stackable: true, value: 3, desc: 'Small pelts and offcuts. Three make an honest leather.', color: '#8a6f52', code: 'Sh' },
  { id: 'owl_plume', name: 'Owl plume', stackable: true, value: 26, desc: 'A flight feather longer than your forearm. It fell without a sound. Bowyers fletch yew with them, and the arrow keeps the habit.', color: '#d8ccae', code: 'Op' },
  { id: 'elder_plume', name: 'Elder plume', stackable: true, maxStack: 5, value: 140, desc: 'Moon-pale at the edge, storm-dark at the root. The wood is louder now.', color: '#5a5e70', code: 'Ep' },
  // THE EARTH STANDS UP — the golem drops (docs/golems-plan.md). One
  // shared heart plus a signature piece per build.
  { id: 'golem_core', name: 'Golem core', stackable: true, maxStack: 10, value: 160, desc: 'A fist of grey stone, worked all over with a mason\'s marks. It is still faintly warm, and nobody taught it to be.', color: '#9a94a8', code: 'Go' },
  { id: 'hillstone_heart', name: 'Hillstone heart', stackable: true, maxStack: 10, value: 60, desc: 'The keystone off a walking cairn, moss still in the seams. Heavier than honest rock has any right to be.', color: '#8a8164', code: 'Hh' },
  { id: 'forgeplate_scrap', name: 'Forgeplate scrap', stackable: true, maxStack: 10, value: 95, desc: 'An old riveted plate pulled from the lodestone\'s gathered body. Some smith made it once. The golem only kept it.', color: '#6f665e', code: 'Fs' },
  { id: 'molten_slag', name: 'Molten slag', stackable: true, maxStack: 10, value: 110, desc: 'Furnace-melt gone hard, black outside, ember-veined within. It never quite cools.', color: '#d84c1e', code: 'Mg' },
  { id: 'everfrost_shard', name: 'Everfrost shard', stackable: true, maxStack: 10, value: 130, desc: 'A faceted slab of old winter. It does not melt, and the room it sits in forgets summer.', color: '#9ad4e8', code: 'Ev' },
  // THE HILL COMES DOWN — the ogre drops (docs/ogres-plan.md). A
  // giant's hoard is a sack of dented junk with one true prize in it.
  { id: 'ogre_tooth', name: 'Ogre tooth', stackable: true, maxStack: 10, value: 48, desc: 'A lower tooth the size of a hand axe, worn flat from grinding bones. The underbite is quieter now, and the goldsmiths have found the only ivory wide enough to cut a wing from.', color: '#e3d7b4', code: 'Ot' },
  { id: 'bonegrinder_girdle', name: 'Bonegrinder girdle', stackable: true, maxStack: 5, value: 150, desc: 'A rope-and-hide belt off the biggest gut in the camp, trophies still knotted on. It took two hands to carry it home.', color: '#96685a', code: 'Bg' },

  // Quest items — worthless by law (the flood law's price for
  // quest-gated drops), stackable so an errand rides one slot.
  { id: 'wardstone', name: 'Boundary stone', stackable: true, value: 0, quest: true, desc: "Blazed on one face, chiselled flat on the other. They pulled up the line and ate their supper off it.", color: '#8f9099', code: 'Ws' },
  { id: 'redmask_writ', name: 'Redmask writ', stackable: true, value: 0, quest: true, desc: 'Marching orders in a hand Captain Aldis would know asleep.', color: '#b0392e', code: 'Rw' },
  { id: 'reavers_mark', name: "Reaver's mark", stackable: true, value: 0, quest: true, desc: 'A crew\'s iron token. Whoever holds it keeps the shares.', color: '#2b2735', code: 'Rm' },
  { id: 'torn_ledger_page', name: 'Torn ledger page', stackable: true, value: 0, quest: true, startsQuest: 'the_stolen_ledger', desc: 'Bank-ruled lines torn out rough. Someone kept accounts; someone else kept the accounts.', color: '#efe3c2', code: 'Lp' },
  { id: 'marked_tool', name: 'Marked tool', stackable: true, value: 0, quest: true, desc: "A pick-head struck with a mason's mark. Twenty years of kobold hands, and the mark still reads.", color: '#8d94a3', code: 'Mt' },
  { id: 'spade_mark', name: 'Spade mark', stackable: true, value: 0, quest: true, desc: 'A Red Company crew tally struck with a spade. Companies pay by the head. Somebody up here is on the books.', color: '#a3452e', code: 'Sm' },
  { id: 'grave_band', name: 'Grave band', stackable: true, value: 0, quest: true, desc: 'A twisted arm ring of old gold, cold in every weather. It was counted into a barrow with somebody, and it wants counting back.', color: '#c9a94c', code: 'Gb' },
  { id: 'seal_ring', name: 'The foreman\'s seal ring', stackable: true, value: 0, quest: true, desc: 'The signet that closed the deep workings, worn smooth. It was sealed OUTSIDE the door a hundred and fifty years ago. It was found inside the burn last night.', color: '#9aa4b2', code: 'Sr' },
  { id: 'survey_pages', name: 'Cipher pages', stackable: true, value: 0, quest: true, desc: 'Survey notes in a Crown cipher, ash-stained and spoil-crushed. The measurements are excellent. The questions between them are better.', color: '#e8ddc0', code: 'Cp' },
  { id: 'crew_paytin', name: 'Crew pay-tin', stackable: true, value: 0, quest: true, desc: 'A dented tin, wages still inside. Nobody came up to spend them.', color: '#a9976a', code: 'Pt' },
  { id: 'gilded_locket', name: 'Gilded locket', stackable: true, value: 0, quest: true, desc: 'Gold over brass, warm even in a dead hand. The clasp still works.', color: '#d8b45a', code: 'Gl' },
  { id: 'weathered_letter', name: 'Weathered letter', stackable: true, value: 0, quest: true, startsQuest: 'the_last_patrol', desc: 'Rain-run ink, folded to a worn crease. The last line is still legible.', color: '#cfc5ab', code: 'Wl' },
  // THE CAUSEWAY OR THE SLUICE (contested lands band 7, plan §3.1): the
  // fork's four tokens and the one plain good. Four are quest paper and
  // timber, worthless by law; the corn is a real thing with a real price,
  // sold back to the road off the Charter's counter at the ford.
  { id: 'dike_stake', name: 'Dike stake', stackable: true, value: 0, quest: true, desc: "An ochre survey stake with a brass plate. Driven, it is the Charter's ground.", color: '#c4783a', code: 'Dk' },
  { id: 'levy_sheet', name: 'Levy sheet', stackable: true, value: 0, quest: true, desc: "Ingram's levy, signed at the ford. Margit posts what she is handed.", color: '#e6dcbe', code: 'Lv' },
  { id: 'charter_pass', name: 'Charter pass', stackable: true, value: 0, quest: true, desc: "Charter paper with the ford's seal. The Company honours paper.", color: '#d9c98a', code: 'Ch' },
  { id: 'kelp_string', name: 'Kelp string', stackable: true, value: 0, quest: true, desc: 'A string of fen kelp tied the way the shoal ties them. It means paid.', color: '#4f6b48', code: 'Ks' },
  { id: 'green_corn', name: 'Green corn', stackable: true, maxStack: 20, value: 1, desc: 'Corn cut green and going soft. It keeps a week on boards.', color: '#9fb35a', code: 'Gc' },
  // THE HUSK AND THE WARD LINE (contested lands band 8, plan §3.2, §3.3):
  // the north's four pockets. The pelt is the one plain good (a quest
  // drop off the veil pack while the fleece asks for it, ordinary loot
  // never); the wool, the thread and the chip are quest paper by law,
  // worthless, each consumed or held exactly where its journal says.
  // The drover's cloak is gear and lives with the capes below.
  { id: 'wolf_pelt', name: 'Veil wolf pelt', stackable: true, maxStack: 10, value: 6, desc: "A veil wolf's pelt, grey at the guard hairs. It smells of the wood it came out of.", color: '#8a8c96', code: 'Vp' },
  { id: 'grey_wool', name: "The order's grey wool", stackable: true, value: 0, quest: true, desc: "A hank of the order's grey, off a gnoll's stake. It goes back on a post.", color: '#a9aab0', code: 'Gw' },
  { id: 'cut_thread', name: 'Cut thread', stackable: true, maxStack: 8, value: 0, quest: true, desc: "A cut length of the court's thread. A knot at one end and a chip of moonglass at the other. It is not for tying anything.", color: '#c9d4e8', code: 'Ct' },
  { id: 'moonglass_chip', name: 'Moonglass chip', stackable: true, value: 0, quest: true, desc: "A chip off the fork's waystone. It draws nothing, and that is the point of it.", color: '#dce8f4', code: 'Mc' },
  { id: 'linen_scrap', name: 'Linen scrap', stackable: true, value: 3, desc: 'Torn cloth off someone who stopped needing it.', color: '#ddd6c2', code: 'Ls' },
  { id: 'gloomsilk_thread', name: 'Gloomsilk thread', stackable: true, value: 14, desc: 'Cold spun shadow from the crypt. It drinks the light.', color: '#5a4a78', code: 'Gt' },

  // Trade-prepared materials — the tanner's and weaver's stock in trade.
  { id: 'linen', name: 'Linen', stackable: true, maxStack: 10, value: 20, desc: 'A bolt woven from salvaged scrap — humble, tough, everywhere.', color: '#e4dcc4', code: 'Ln' },
  { id: 'gloomsilk', name: 'Gloomsilk', stackable: true, maxStack: 10, value: 90, desc: 'A bolt of woven midnight. Tailors whisper around it.', color: '#6a5690', code: 'Gs' },
  // THE FAIR MATERIALS (the Evenfall epic): the old folk's three
  // trades, dispersed into the whole craft economy — the silk into
  // the star cloth, the bark into the bows, the lens into the deep
  // workings. Never bulk goods: the finest, never the most.
  { id: 'moonpale_silk', name: 'Moonpale silk', stackable: true, maxStack: 10, value: 150, desc: 'Not white. Look again, slower. A hundred quiet years in every thread.', color: '#cdd8ec', code: 'Mp' },
  { id: 'silverbark', name: 'Silverbark', stackable: true, maxStack: 10, value: 60, desc: 'Pale timber the Everwood gives and no axe takes. The grain remembers agreeing.', color: '#a39072', code: 'Sv' },
  { id: 'moonglass_lens', name: 'Moonglass lens', stackable: true, maxStack: 5, value: 180, desc: 'Glass worked cold over years. It holds a light the way a promise holds a word.', color: '#9fe0d8', code: 'Ml' },
  { id: 'hardened_leather', name: 'Hardened leather', stackable: true, maxStack: 10, value: 45, desc: 'Leather boiled with oak tannin until it argues back.', color: '#7d5636', code: 'Hl' },

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
    stackable: true,
    maxStack: 5,
    value: 120,
    desc: 'A red gem, warm as a held coal. Copper seams hide them.',
    color: '#e8683c',
    code: 'Eo',
  },
  {
    id: 'frostshard',
    name: 'Frostshard',
    stackable: true,
    maxStack: 5,
    value: 120,
    desc: 'Blue crystal, cold through the glove. Iron veins weep them.',
    color: '#9ad0ec',
    code: 'Fd',
  },
  {
    id: 'stormpearl',
    name: 'Stormpearl',
    stackable: true,
    maxStack: 5,
    value: 120,
    desc: 'It hums faintly and lifts the hair on your arm. Struck gold seams grow them.',
    color: '#e8e29a',
    code: 'Zq',
  },
  {
    id: 'bloomstone',
    name: 'Bloomstone',
    stackable: true,
    maxStack: 5,
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
    desc: 'Glittering grit still humming with spent Arx. Every enchantment starts here.',
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
  // The three late schools. Void and radiant used to borrow a tailor's
  // thread and a farmer's flower because neither had anything of its
  // own; astral had nothing at all, which is why no astral enchant
  // existed to want it.
  {
    id: 'deepening_sigil',
    name: 'Deepening sigil',
    stackable: true,
    value: 2400,
    // THE DEEPENING's key. Found, never made: the trade can teach you
    // to inscribe a masterwork, but nobody alive remembers how to open
    // steel to a second working.
    desc: 'A sigil cut on a plate of something older than the forge. Steel it touches opens, and stays open.',
    color: '#e8d8a8',
    code: 'xS',
  },
  {
    id: 'focused_dust',
    name: 'Focused dust',
    stackable: true,
    value: 110,
    desc: 'Binder worked down until it stops glittering and starts pulling. The greater workings will not hold without it.',
    color: '#d8c8ff',
    code: 'xF',
  },
  {
    id: 'umbral_essence',
    name: 'Umbral essence',
    stackable: true,
    value: 34,
    desc: 'A pinch of the dark that stays dark with a lamp on it.',
    color: '#8a78b0',
    code: 'xu',
  },
  {
    id: 'radiant_essence',
    name: 'Radiant essence',
    stackable: true,
    value: 34,
    desc: 'Caught daylight, still warm at midnight. It will not sit still in the hand.',
    color: '#f2d98a',
    code: 'xr',
  },
  {
    id: 'astral_essence',
    name: 'Astral essence',
    stackable: true,
    value: 40,
    desc: 'A bead of far-off cold. Hold it up and the whole sky is in there, very small.',
    color: '#9ae8de',
    code: 'xa',
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
    desc: 'A rift-cut key humming with somewhere else. The same key always opens the same halls — and its ward holds three turns before it wears through.',
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

  // THE SAND AND THE ROAR: the arena's own trophy — found ONLY in the
  // headline purse (arena_purse_t4). Worth a small fortune to a
  // collector and everything to the shelf it stands on.
  {
    id: 'sand_laurel',
    name: 'Laurel of the Sands',
    stackable: false,
    value: 900,
    desc: 'Hammered gold leaves on an iron band. The crowd remembers who wore one, longer than the wearers did.',
    color: '#e8b74a',
    code: 'Ls',
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
    id: 'lantern',
    name: 'Lantern',
    stackable: false,
    value: 60,
    equipSlot: 'offhand',
    // THE CARRIED FLAME: stronger than the underground courtesy lamp
    // (4.6 / 0.5) — an owned light beats the freebie, and it works
    // under the night sky too.
    carryLight: { r: 5.2, rgb: [255, 209, 150], intensity: 0.62, z: 0.8 },
    desc: 'A hooded candle-lantern. The dark keeps its distance.',
    color: '#e8c06a',
    code: 'La',
  },
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
    passive: 'wolf_reflexes',
    desc: 'Wolves slip sideways out of trouble. Now so do you.',
    color: '#6a6f7d',
    code: 'Wc',
  },
  // THE FLEECE (contested lands band 8): Sorrel's cloak, lined with the
  // veil pack. The wolf cloak's shape and the wolf cloak's reflex, in a
  // drover's cloth; the lining is the point and she never says so.
  {
    id: 'drover_fleece_cloak',
    name: "Drover's fleece cloak",
    stackable: false,
    value: 220,
    equipSlot: 'cape',
    armor: 1,
    passive: 'wolf_reflexes',
    desc: "A drover's cloak lined with veil wolf. Sorrel put her hand on the lining once and said nothing.",
    color: '#9a8f7a',
    code: 'Dc',
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
    passive: 'wolf_reflexes',
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
    passive: 'wolf_reflexes',
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

// Enchant scrolls — one per EnchantDef, pure generation. A scroll is an
// UNSTACKABLE trade good (each carries its inscriber's quality roll,
// and addItem drops the roll when merging stackables): the enchanter's
// skill went into INSCRIBING it (see recipes.ts); anyone may apply one,
// which is how a specialist enchanter powers up the whole town's gear.
const SCROLL_VALUE_BY_TIER: Record<EnchantTier, number> = {
  1: 90, 2: 260, 3: 700, 4: 1800, 5: 4500,
};
const scrollDefs: ItemDef[] = ENCHANT_DEFS.map((e, i) => ({
  id: `scroll_${e.id}`,
  name: `${e.name} Scroll`,
  // THE ENCHANTER'S HAND: a scroll carries the quality of the hand that
  // inscribed it, so two Keen Edge scrolls are no longer the same
  // object — exactly the dungeon-key law ("the instance roll IS the
  // dungeon"), applied to inscriptions. Stacking would throw the roll
  // away (addItem drops it for stackables) and with it the maker's
  // mark, which is the whole point of the quality system.
  stackable: false,
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

// THE RETIRED SCROLL — taught lore that later went core. The item must
// outlive its shelf: live inventories may still hold the paper, and a
// vanished id becomes a ghost slot. Study refuses core recipes without
// consuming (gameServer.useItem answers "you already know"), so the
// page stays honest and trades on. Never shelved, never looted again.
export const LEGACY_RECIPE_SCROLLS: readonly ItemDef[] = [
  {
    // Sold as trainer lore until THE FIRST TRADE made every bronze
    // design core knowledge; value keeps its old shelf price.
    id: recipeScrollId('craft_scimitar'),
    name: 'Schematic: Scimitar',
    stackable: true,
    value: 164,
    teaches: 'craft_scimitar',
    desc: 'The scimitar\'s measures. Every smith learns these at the anvil now.',
    color: RECIPE_INK.smithing ?? '#c9b98a',
    code: 'Rx',
  },
  {
    // Retired with the scimitar's, same law, same shelf price.
    id: recipeScrollId('craft_kris'),
    name: 'Schematic: Kris',
    stackable: true,
    value: 188,
    teaches: 'craft_kris',
    desc: 'The kris and its seven bends. Every smith learns these at the anvil now.',
    color: RECIPE_INK.smithing ?? '#c9b98a',
    code: 'Rx',
  },
];

// THE LIVING SOIL: graded produce — pure generation from the crop
// yields (the scroll pattern). A Fine carrot is its OWN item id, so
// every stack, drop-merge, recipe, and shop path treats grades
// correctly by construction; QUALITY IS EARNED, NEVER ROLLED means
// the grade was decided by the care fold at harvest, and the id is
// simply what it earned. Value and heals both grow with the grade.
const GRADE_DESCS = ['', 'Grown with a careful hand.', 'The pride of a well-kept field.'] as const;
const gradedProduceDefs: ItemDef[] = defs
  .filter((d) => GRADED_PRODUCE.has(d.id))
  .flatMap((base) =>
    ([1, 2] as const).map((grade): ItemDef => ({
      id: gradedId(base.id, grade),
      name: `${GRADE_NAMES[grade]} ${base.name.toLowerCase()}`,
      stackable: base.stackable,
      ...(base.maxStack !== undefined ? { maxStack: base.maxStack } : {}),
      value: Math.round(base.value * GRADE_VALUE_MULT[grade]),
      ...(base.heals !== undefined ? { heals: Math.ceil(base.heals * GRADE_VALUE_MULT[grade]) } : {}),
      desc: GRADE_DESCS[grade],
      color: base.color,
      code: base.code,
    })),
  );

const allDefs: ItemDef[] = [...defs, ...scrollDefs, ...recipeScrollDefs, ...LEGACY_RECIPE_SCROLLS, ...gradedProduceDefs, ...COMPILED_EQUIPMENT.items];

// NATIVE procs pass the same load guards a bonded working does. A proc
// baked into a chase item's def.gear.effects fires through the same
// runtime and keys the same per-id timer, so it must obey every law the
// enchant roster is held to (icd > 0, a firable pairing, strike
// triggers on steel only, ONE id = ONE working). None exist today —
// this is the door being locked before anyone walks through it wrong.
for (const d of allDefs) {
  for (const fx of d.gear?.effects ?? []) {
    if (fx.kind === 'proc') registerProc(fx, d.gear!.slot, d.id);
  }
}

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
 * archery, arx, and twohand weapons are two-handed, derived from
 * style rather than flagged per item so no def can forget it.
 * A two-handed weapon shares the body with nothing HELD in the off
 * fist: no off blade, no shield, no tome, no orb. Back-mounted
 * offhands (quivers) ride the shoulders and are exempt.
 *
 * THE VERSATILE GRIP AMENDMENT (the widening this law foretold):
 * polearms equip ONE-HANDED — the knight's lance shares the body with
 * a shield — and an empty off fist takes the war grip for the damage
 * step (POLEARM_WAR_GRIP_MULT, resolved live at the damage door).
 * Equipment law sees one hand; only the damage door and the render
 * carry the second. NO SECOND POLE: the equip path sheds a held
 * offhand WEAPON when a polearm takes the main hand — a haft pairs
 * with a wall, never with a second edge.
 */
export function isTwoHanded(def: ItemDef): boolean {
  return (
    def.weapon !== undefined &&
    def.weapon.style !== 'onehand' &&
    def.weapon.style !== 'polearm'
  );
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

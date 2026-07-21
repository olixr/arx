import type { PassiveId, RarityTier, SkillId, StationType } from '@devcraft/shared';
import type { WeaponStats } from '../items.js';
import type { EnchantEffect } from './enchants.js';

/**
 * The interchangeable equipment schema. An EquipmentDef is JSON-safe by
 * construction (plain data, no functions, no class instances) and round-
 * trips through equipment/serialize.ts — the surface a future content
 * tool authors against. Defs are compiled at module load into ordinary
 * ItemDefs (+ generated RecipeDefs), so every existing system — icons,
 * cards, inventory, shops, crafting — consumes equipment without knowing
 * this schema exists.
 */

/**
 * Armor weight class. Counted per worn piece over head/body/legs/
 * gloves/boots to derive playstyle modifiers: plate favors melee and defence at a
 * mobility/magic cost, leather favors archery, cloth favors magic.
 * Only plate carries penalties — mixing dilutes, it never punishes.
 */
export type ArmorClass = 'cloth' | 'leather' | 'plate';

/**
 * What an affix can grant: any skill (+N levels, the core stat system —
 * stats ARE skills here), or the two survival extras.
 */
export type AffixStat = SkillId | 'maxHp' | 'regen';

/** Slots the equipment schema may target (relic/sigil/tool stay bespoke). */
export type GearSlot =
  | 'head'
  | 'body'
  | 'legs'
  | 'gloves'
  | 'boots'
  | 'weapon'
  | 'offhand'
  | 'cape';

export const GEAR_SLOTS: readonly GearSlot[] = [
  'head',
  'body',
  'legs',
  'gloves',
  'boots',
  'weapon',
  'offhand',
  'cape',
];

/** The five slots whose armorClass feeds the class-count modifiers. */
export const ARMOR_CLASS_SLOTS: readonly GearSlot[] = ['head', 'body', 'legs', 'gloves', 'boots'];

export interface AffixPoolEntry {
  stat: AffixStat;
  /** Sampling weight, default 1. */
  w?: number;
}

export interface EquipmentDef {
  id: string;
  name: string;
  slot: GearSlot;
  /** REQUIRED for head/body/legs/boots (compile-checked). */
  armorClass?: ArmorClass;
  /**
   * Equip requirement, checked against the BASE skill level (gear
   * bonuses never bootstrap more gear). Also drives affix magnitude:
   * higher-requirement pieces roll bigger numbers.
   */
  levelReq?: { skill: SkillId; level: number };
  /** Base armor before the rarity multiplier. */
  armor?: number;
  /** Weapons only — base damage scales with the rarity multiplier. */
  weapon?: WeaponStats;
  /**
   * Offhand only: worn on the back (a quiver), never held in the fist —
   * the one offhand kind that pairs with a two-handed bow or staff.
   */
  backMounted?: boolean;
  /** Gear-carried passive (hotbar tray), same field ItemDef carries. */
  passive?: PassiveId;
  /**
   * Native always-on effects — the same vocabulary enchants use, baked
   * into the def itself. This is what makes a chase item DO something
   * beyond stats; an enchant stacks a second layer on top.
   */
  effects?: EnchantEffect[];
  /** Which stats this piece may roll, weighted. */
  affixPool: AffixPoolEntry[];
  /** Tiers this item can exist at; default all five. */
  rarities?: RarityTier[];
  /** How the world hands this out. At least one must be true. */
  acquisition: { drop?: boolean; craft?: boolean; shop?: boolean };
  /** Required iff acquisition.craft — compiled into a RecipeDef. */
  recipe?: {
    skill: SkillId;
    levelReq: number;
    xp: number;
    station: StationType | null;
    ticks: number;
    inputs: Array<{ item: string; qty: number }>;
  };
  /** Vendor value at common; rarity multiplies it. */
  value: number;
  color: string;
  code: string;
  desc?: string;
}

import type { EquipSlot, ItemRoll, RarityTier, SkillId } from '@devcraft/shared';
import { Rng, hashCoords, hashString, rarityIndex } from '@devcraft/shared';
import type { CombatStyle } from '../items.js';
import { itemDef } from '../items.js';
import type { AffixStat, ArmorClass } from './types.js';
import { ARMOR_CLASS_SLOTS } from './types.js';
import {
  AFFIX_ROLL_FRAC,
  ARMOR_CLASS_MODS,
  RARITY_BASE_MULT,
  RARITY_VALUE_MULT,
  affixCount,
  affixMagnitudeCap,
} from './tables.js';

/**
 * The pure roll core: stats are DERIVED, never stored. Client and
 * server both call these, so an instance's card, its combat effect, and
 * its vendor price always agree — the DB and the wire only ever carry
 * `{ rar, seed }`.
 *
 * Accepted drift law: the derivation samples the item's affix pool by
 * index, so editing a pool's entries, weights, or ranges silently
 * re-rolls every existing instance of that item. That is intended —
 * a content rebalance reaches gear already in the world — but it means
 * pool edits are balance changes, not cosmetic refactors.
 */

export interface RolledAffix {
  stat: AffixStat;
  value: number;
}

export interface RolledStats {
  /** Post-rarity armor, rounded. */
  armor: number;
  /** Post-rarity weapon damage (fractional — maxHit rounds downstream). */
  damage?: number;
  affixes: RolledAffix[];
  /** Post-rarity vendor value. */
  value: number;
}

/** The neutral instance every roll-less item resolves to. */
const LEGACY_ROLL: ItemRoll = { rar: 'common', seed: 0 };

/**
 * Derive an instance's stats. Returns null for non-gear items (no
 * `gear` block). Deterministic in (itemId, rar, seed).
 */
export function rolledStats(itemId: string, roll?: ItemRoll): RolledStats | null {
  const def = itemDef(itemId);
  const gear = def?.gear;
  if (!def || !gear) return null;
  const r = roll ?? LEGACY_ROLL;
  const rng = new Rng(hashCoords(r.seed, hashString(itemId), rarityIndex(r.rar)));
  const mult = RARITY_BASE_MULT[r.rar];

  const cap = affixMagnitudeCap(gear.levelReq?.level ?? 1);
  const [fLo, fHi] = AFFIX_ROLL_FRAC[r.rar];
  const n = Math.min(affixCount(r.rar, rng), gear.affixPool.length);

  // Weighted sampling without replacement — one affix per distinct stat.
  const pool = gear.affixPool.map((p) => ({ stat: p.stat, w: p.w ?? 1 }));
  const affixes: RolledAffix[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    let total = 0;
    for (const p of pool) total += p.w;
    let pick = rng.next() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      pick -= pool[idx]!.w;
      if (pick < 0) break;
    }
    const chosen = pool.splice(idx, 1)[0]!;
    const base = Math.max(1, Math.round(cap * rng.range(fLo, fHi)));
    const value =
      chosen.stat === 'maxHp' ? base * 2 : chosen.stat === 'regen' ? Math.ceil(base / 3) : base;
    affixes.push({ stat: chosen.stat, value });
  }

  return {
    armor: def.armor ? Math.round(def.armor * mult) : 0,
    damage: def.weapon ? def.weapon.damage * mult : undefined,
    affixes,
    value: Math.round(def.value * RARITY_VALUE_MULT[r.rar]),
  };
}

/** Mint a fresh roll — server-side loot/craft use. */
export function makeRoll(rar: RarityTier, seed?: number): ItemRoll {
  return { rar, seed: seed ?? Math.floor(Math.random() * 0x100000000) };
}

/** Weighted rarity pick restricted to the item's allowed tiers. */
export function pickRarity(
  weights: Record<RarityTier, number>,
  allowed: readonly RarityTier[],
  rand: () => number,
): RarityTier {
  let total = 0;
  for (const rar of allowed) total += weights[rar];
  if (total <= 0) return allowed[0] ?? 'common';
  let pick = rand() * total;
  for (const rar of allowed) {
    pick -= weights[rar];
    if (pick < 0) return rar;
  }
  return allowed[allowed.length - 1] ?? 'common';
}

/** An equipped-instance reference, mirrored by the protocol's shape. */
export interface EquippedRef {
  id: string;
  roll?: ItemRoll;
}

/**
 * Everything worn gear does to a player, aggregated once per equipment
 * change and cached — never recomputed per hit or per frame.
 */
export interface GearStats {
  armor: number;
  skillBonus: Partial<Record<SkillId, number>>;
  maxHp: number;
  regenPer4s: number;
  classCounts: Record<ArmorClass, number>;
  /** Multiplier on each style's max hit (1 = neutral). */
  styleDmgMult: Record<CombatStyle, number>;
  speedMult: number;
  /** Multiplier on ability cooldowns (<1 = faster). */
  cooldownMult: number;
}

export function emptyGearStats(): GearStats {
  return {
    armor: 0,
    skillBonus: {},
    maxHp: 0,
    regenPer4s: 0,
    classCounts: { cloth: 0, leather: 0, plate: 0 },
    styleDmgMult: { melee: 1, archery: 1, magic: 1 },
    speedMult: 1,
    cooldownMult: 1,
  };
}

export function aggregateGearStats(
  equipment: Partial<Record<EquipSlot, EquippedRef | undefined>>,
): GearStats {
  const out = emptyGearStats();
  for (const slot of Object.keys(equipment) as EquipSlot[]) {
    const worn = equipment[slot];
    if (!worn) continue;
    const def = itemDef(worn.id);
    if (!def) continue;
    const rolled = rolledStats(worn.id, worn.roll);
    if (rolled) {
      out.armor += rolled.armor;
      for (const a of rolled.affixes) {
        if (a.stat === 'maxHp') out.maxHp += a.value;
        else if (a.stat === 'regen') out.regenPer4s += a.value;
        else out.skillBonus[a.stat] = (out.skillBonus[a.stat] ?? 0) + a.value;
      }
      const cls = def.gear?.armorClass;
      if (cls && (ARMOR_CLASS_SLOTS as readonly string[]).includes(slot)) {
        out.classCounts[cls]++;
      }
    } else {
      // Legacy non-gear items (capes, bucklers) still contribute their
      // flat armor — old defs keep protecting without a gear block.
      out.armor += def.armor ?? 0;
    }
  }
  for (const cls of Object.keys(out.classCounts) as ArmorClass[]) {
    const count = out.classCounts[cls];
    if (count === 0) continue;
    const mods = ARMOR_CLASS_MODS[cls];
    for (const style of Object.keys(mods.dmgPct) as CombatStyle[]) {
      out.styleDmgMult[style] += (mods.dmgPct[style]! * count) / 100;
    }
    out.speedMult += (mods.speedPct * count) / 100;
    out.cooldownMult += (mods.cooldownPct * count) / 100;
  }
  return out;
}

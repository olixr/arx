import type { EquipSlot, ItemRoll, RarityTier, SkillId, StatusId } from '@arx/shared';
import { Rng, hashCoords, hashString, isStowedSlot, rarityIndex } from '@arx/shared';
import type { CombatStyle, ArxElement } from '../items.js';
import { ITEMS, itemDef } from '../items.js';
import type { EnchantEffect, ProcEffect } from './enchants.js';
import { addProc, instanceEffects, isStrikeTrigger } from './enchants.js';
import type { AffixStat, ArmorClass } from './types.js';
import { ARMOR_CLASS_SLOTS } from './types.js';
import { setWordsFor } from './setWords.js';
import {
  AFFIX_ROLL_FRAC,
  ARMOR_CLASS_MODS,
  HEIRLOOM_MIN_SURPLUS,
  POWER_VALUE_PER_LEVEL,
  RARITY_BASE_MULT,
  RARITY_VALUE_MULT,
  affixCount,
  affixMagnitudeCap,
  gearPowerMult,
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
  // Item power: an instance re-issued above its native requirement
  // scales its base stats and rolls affixes at its FULL effective
  // level — the same visuals, promoted numbers. Power below native is
  // ignored (heirlooms never downgrade).
  const native = gear.levelReq?.level ?? 1;
  const eff = Math.max(native, r.pwr ?? 0);
  const mult = RARITY_BASE_MULT[r.rar] * gearPowerMult(native, eff);

  const cap = affixMagnitudeCap(eff);
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
    value: Math.round(
      def.value * RARITY_VALUE_MULT[r.rar] * (1 + (eff - native) * POWER_VALUE_PER_LEVEL),
    ),
  };
}

/**
 * The level actually required to equip an instance: a re-issued piece
 * demands its POWER, not its native floor — a power-45 Thistledown robe
 * is endgame loot and gates like it. Null for ungated defs.
 */
export function effectiveReq(
  itemId: string,
  roll?: ItemRoll,
): { skill: SkillId; level: number } | null {
  const req = itemDef(itemId)?.gear?.levelReq;
  if (!req) return null;
  return { skill: req.skill, level: Math.max(req.level, roll?.pwr ?? 0) };
}

/**
 * The heirloom pool for a foe of `npcLevel`: every rolled-gear def
 * whose native requirement sits comfortably below the foe — old sets
 * and old weapons alike, re-issued at the foe's power. Uniform pick;
 * null when nothing qualifies.
 */
export function heirloomFor(npcLevel: number, rand: () => number): string | null {
  const pool: string[] = [];
  for (const [id, def] of ITEMS) {
    const gear = def.gear;
    if (!gear) continue;
    // The acquisition law holds here too: drop and craft lanes re-issue
    // as heirlooms; a shop-only piece never falls off a foe (the pool
    // was the one gear route with no acquisition filter, and it leaked
    // exactly one shop-only staff before this line).
    if (!gear.acquisition.drop && !gear.acquisition.craft) continue;
    if ((gear.levelReq?.level ?? 1) > npcLevel - HEIRLOOM_MIN_SURPLUS) continue;
    pool.push(id);
  }
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]!;
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
  /**
   * THE SWING CHANNEL (buff forge, Phase 2): swing-cadence multiplier
   * (>1 = faster basics), folded with riding buffs and band-clamped
   * at the one server pay site. Distinct from cooldownMult (ability
   * slots) — the two hastes never touch. No shipped effect authors it
   * yet; the kind exists so wave-one gear can.
   */
  attackSpeedMult: number;
  /** Multiplier on ability cooldowns (<1 = faster). */
  cooldownMult: number;
  /** Multiplier on Arx max hits of a specific school (1 = neutral). */
  elementDmgMult: Partial<Record<ArxElement, number>>;
  /** Flat damage reflected to attackers that strike the wearer. */
  thorns: number;
  /** Additional crit chance, percentage points on the base roll. */
  critPct: number;
  /**
   * THE SLIPPED BLOW's worn lane: percentage points of chance a blow
   * misses the wearer (house words, native effects, scrolls — summed).
   * Capped with every other lane at the one roll site.
   */
  evadePct: number;
  /** Ability-cooldown ticks shaved on every kill. */
  onKillHasteTicks: number;
  /**
   * THE READING EDGE: per-state "takes more from me" percentages,
   * HIGHEST WINS at the fold (same-state clauses never stack across
   * pieces). The seam turns each into a clause and multiplies
   * distinct states only.
   */
  vsState: Partial<Record<StatusId, number>>;
  /** THE HOUSE WORD: worn pieces per set id (armor slots only). */
  setCounts: Record<string, number>;
  /**
   * On-hit afflictions granted by WORDS (the Envenom stance pattern:
   * every landed basic carries them, whichever blade landed). Kept
   * OFF foldEffect on purpose — a weapon's own onHitStatus rides the
   * strike channel, and folding both would double-apply.
   */
  wordOnHit: Array<{ status: StatusId; power: number; durationTicks: number; chance: number }>;
  /**
   * Workings whose trigger belongs to the BODY (kill, hurt, block,
   * cast, lowHp, stacks, gather, stride) rather than to the steel that
   * landed. Deduplicated by proc id, so a matched set carrying one
   * working fires it once.
   */
  procs: ProcEffect[];
}

export function emptyGearStats(): GearStats {
  return {
    armor: 0,
    skillBonus: {},
    maxHp: 0,
    regenPer4s: 0,
    classCounts: { cloth: 0, leather: 0, plate: 0 },
    styleDmgMult: { onehand: 1, archery: 1, arx: 1, twohand: 1, polearm: 1 },
    speedMult: 1,
    attackSpeedMult: 1,
    cooldownMult: 1,
    elementDmgMult: {},
    thorns: 0,
    critPct: 0,
    evadePct: 0,
    onKillHasteTicks: 0,
    vsState: {},
    setCounts: {},
    wordOnHit: [],
    procs: [],
  };
}

/**
 * Fold one aggregate-channel effect into the stats. STRIKE effects
 * (onHitStatus / lifesteal / backstab) are deliberately ignored here —
 * they are read at hit time from the weapon instance that landed
 * (weaponStrikeEffects below), never from the worn aggregate.
 *
 * Procs are the one kind that reads its own routing: a body-triggered
 * working lands here, a steel-triggered one is left for the strike
 * channel to collect.
 */
export function foldEffect(out: GearStats, fx: EnchantEffect): void {
  switch (fx.kind) {
    case 'proc':
      if (!isStrikeTrigger(fx.trigger.on)) addProc(out.procs, fx);
      break;
    case 'skill':
      out.skillBonus[fx.skill] = (out.skillBonus[fx.skill] ?? 0) + fx.amount;
      break;
    case 'maxHp':
      out.maxHp += fx.amount;
      break;
    case 'regen':
      out.regenPer4s += fx.amount;
      break;
    case 'armor':
      out.armor += fx.amount;
      break;
    case 'styleDmg':
      out.styleDmgMult[fx.style] += fx.pct / 100;
      break;
    case 'elementDmg':
      out.elementDmgMult[fx.element] = (out.elementDmgMult[fx.element] ?? 1) + fx.pct / 100;
      break;
    case 'cooldown':
      out.cooldownMult -= fx.pct / 100;
      break;
    case 'speed':
      out.speedMult += fx.pct / 100;
      break;
    case 'swingSpeed':
      // THE SWING CHANNEL: additive pct onto the mult, the speed
      // idiom; the band clamp lives at the server's one pay site.
      out.attackSpeedMult += fx.pct / 100;
      break;
    case 'thorns':
      out.thorns += fx.amount;
      break;
    case 'crit':
      out.critPct += fx.pct;
      break;
    case 'evade':
      out.evadePct += fx.pct;
      break;
    case 'onKillHaste':
      out.onKillHasteTicks += fx.ticks;
      break;
    case 'vsState':
      // HIGHEST WINS: two pieces reading the same state answer once,
      // with the stronger clause — the anti-stacking constitution.
      out.vsState[fx.status] = Math.max(out.vsState[fx.status] ?? 0, fx.pct);
      break;
  }
}

/**
 * Strike-channel view of one weapon instance: what fires when THIS
 * weapon lands a basic. Combines the def's native effects with the
 * instance's enchant — the poison-coat law generalized.
 */
export interface StrikeEffects {
  onHit: Array<{ status: StatusId; power: number; durationTicks: number; chance: number }>;
  lifestealFrac: number;
  backstabBonus: number;
  /**
   * Workings triggered by THIS steel landing (hit, crit, cadence). Two
   * dual-wielded blades each carry their own, and each fires only when
   * its own edge connects.
   */
  procs: ProcEffect[];
}

export function weaponStrikeEffects(itemId: string, roll?: ItemRoll): StrikeEffects {
  const out: StrikeEffects = { onHit: [], lifestealFrac: 0, backstabBonus: 0, procs: [] };
  const def = itemDef(itemId);
  for (const fx of instanceEffects(def?.gear?.effects, roll)) {
    if (fx.kind === 'proc') {
      if (isStrikeTrigger(fx.trigger.on)) addProc(out.procs, fx);
    } else if (fx.kind === 'onHitStatus') {
      out.onHit.push({
        status: fx.status,
        power: fx.power,
        durationTicks: fx.durationTicks,
        chance: fx.chance,
      });
    } else if (fx.kind === 'lifesteal') {
      out.lifestealFrac += fx.frac;
    } else if (fx.kind === 'backstab') {
      out.backstabBonus += fx.bonus;
    }
  }
  return out;
}

export function aggregateGearStats(
  equipment: Partial<Record<EquipSlot, EquippedRef | undefined>>,
): GearStats {
  const out = emptyGearStats();
  const setCounts = new Map<string, number>();
  for (const slot of Object.keys(equipment) as EquipSlot[]) {
    // THE SLEEPING STEEL: the stowed pair is furniture — it folds
    // nothing (no armor, affixes, class counts, set words, enchants)
    // until a swap brings it to the hands. This is the ONE fold, so
    // excluding here keeps server combat and client cards agreeing.
    if (isStowedSlot(slot)) continue;
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
        // THE HOUSE WORD: set membership counts on the armor slots
        // alone — the same five slots the class mods read.
        const set = def.gear?.set;
        if (set) setCounts.set(set, (setCounts.get(set) ?? 0) + 1);
      }
    } else {
      // Legacy non-gear items (capes, bucklers) still contribute their
      // flat armor — old defs keep protecting without a gear block.
      out.armor += def.armor ?? 0;
    }
    // Native effects + enchant — the aggregate channels only; strike
    // channels stay with the weapon instance (weaponStrikeEffects).
    // THE ENCHANTER'S HAND: the bonded working folds in at the strength
    // it was inscribed at, so a master's scroll is felt in the numbers.
    for (const fx of instanceEffects(def.gear?.effects, worn.roll)) {
      foldEffect(out, fx);
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
  // THE HOUSE WORD: every threshold met speaks, cumulatively (the 2pc
  // line stays live under the 4pc word). Effects reuse the whole
  // enchant vocabulary through the same fold — a word's proc dedupes
  // by id like any matched set, a word's vsState folds highest-wins.
  for (const [set, count] of setCounts) {
    out.setCounts[set] = count;
    for (const word of setWordsFor(set)) {
      if (count < word.pieces) continue;
      for (const fx of word.effects) {
        if (fx.kind === 'onHitStatus') {
          // The word's affliction rides the worn aggregate, never the
          // strike channel — see the wordOnHit doc above.
          out.wordOnHit.push({
            status: fx.status,
            power: fx.power,
            durationTicks: fx.durationTicks,
            chance: fx.chance,
          });
        } else {
          foldEffect(out, fx);
        }
      }
    }
  }
  return out;
}

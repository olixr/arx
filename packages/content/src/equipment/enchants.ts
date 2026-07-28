import type { SkillId, StatusId } from '@arx/shared';
import type { CombatStyle, MagicElement } from '../items.js';
import type { GearSlot } from './types.js';

/**
 * Enchanting — the customization layer OVER the roll system.
 *
 * One typed effect vocabulary serves two carriers:
 *  - NATIVE effects authored on bespoke gear (EquipmentDef.effects) —
 *    the "unique capability" identity of chase items, alongside the
 *    older boolean PassiveId system;
 *  - ENCHANTS bonded to an instance (ItemRoll.ench, one per item,
 *    re-enchanting replaces) via scrolls inscribed at the enchanting
 *    table. Scrolls are ordinary tradeable items — handing one to a
 *    friend IS how you enchant their gear.
 *
 * Effect routing law (mirrors the poison-coat law):
 *  - AGGREGATE effects (skill/maxHp/regen/armor/styleDmg/elementDmg/
 *    cooldown/speed/thorns/crit/onKillHaste) fold into GearStats from
 *    every worn piece at equip time.
 *  - STRIKE effects (onHitStatus/lifesteal/backstab) are read at hit
 *    time from the WEAPON INSTANCE that landed the blow — so two dual-
 *    wielded blades can carry two different edge enchants and each
 *    fires only when its own steel connects.
 */

export type EnchantEffect =
  | { kind: 'skill'; skill: SkillId; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'regen'; amount: number }
  | { kind: 'armor'; amount: number }
  | { kind: 'styleDmg'; style: CombatStyle; pct: number }
  | { kind: 'elementDmg'; element: MagicElement; pct: number }
  | { kind: 'cooldown'; pct: number }
  | { kind: 'speed'; pct: number }
  | { kind: 'thorns'; amount: number }
  | { kind: 'crit'; pct: number }
  | { kind: 'onKillHaste'; ticks: number }
  | { kind: 'onHitStatus'; status: StatusId; power: number; durationTicks: number; chance: number }
  | { kind: 'lifesteal'; frac: number }
  | { kind: 'backstab'; bonus: number };

/** Effect kinds resolved at strike time from the landed weapon instance. */
export const STRIKE_EFFECT_KINDS: readonly EnchantEffect['kind'][] = [
  'onHitStatus',
  'lifesteal',
  'backstab',
];

export interface EnchantDef {
  id: string;
  /** Full label ("Kindled Edge") — scroll names, card rows. */
  name: string;
  /** Adjective prepended to the item's display name ("Kindled ..."). */
  prefix: string;
  /** Visual + cost tier: 1 glint, 2 elemental motes, 3 full aura. */
  tier: 1 | 2 | 3;
  /** The single equip slot a scroll of this enchant targets. */
  slot: GearSlot;
  /** Drives tint, fx channel, and the reagent theme. */
  element: MagicElement;
  effects: EnchantEffect[];
  /** Enchanting level to inscribe the scroll (also drives xp/cost). */
  level: number;
  desc: string;
}

const E = (e: EnchantEffect): EnchantEffect => e;

/**
 * The enchant roster. Weapon edges come in elemental lines that climb
 * the tiers; armor enchants specialize by slot so a full kit is a set
 * of choices, not one stat. venom is deliberately ABSENT — poison
 * stays the herbalist's craft (coatings), never an enchant.
 */
export const ENCHANT_DEFS: EnchantDef[] = [
  // ---- Weapon edges: tier 1 ----
  {
    id: 'keen_edge', name: 'Keen Edge', prefix: 'Keen', tier: 1, slot: 'weapon',
    element: 'radiant', level: 2,
    effects: [E({ kind: 'crit', pct: 3 })],
    desc: 'A honed gleam that finds the gaps. Critical strikes come easier.',
  },
  {
    id: 'balanced_edge', name: 'Balanced Edge', prefix: 'Balanced', tier: 1, slot: 'weapon',
    element: 'arcane', level: 5,
    effects: [
      E({ kind: 'styleDmg', style: 'melee', pct: 4 }),
      E({ kind: 'styleDmg', style: 'archery', pct: 4 }),
      E({ kind: 'styleDmg', style: 'magic', pct: 4 }),
    ],
    desc: 'The weight settles true in any hand. All strikes hit a touch harder.',
  },
  {
    id: 'kindled_edge', name: 'Kindled Edge', prefix: 'Kindled', tier: 1, slot: 'weapon',
    element: 'ember', level: 8,
    effects: [E({ kind: 'onHitStatus', status: 'burn', power: 1, durationTicks: 60, chance: 0.12 })],
    desc: 'A patient heat sleeps in the metal. Strikes sometimes catch fire.',
  },
  {
    id: 'frosted_edge', name: 'Frosted Edge', prefix: 'Frosted', tier: 1, slot: 'weapon',
    element: 'frost', level: 8,
    effects: [E({ kind: 'onHitStatus', status: 'chill', power: 1, durationTicks: 60, chance: 0.12 })],
    desc: 'Rime gathers along the edge. Strikes sometimes slow the foe.',
  },
  {
    id: 'charged_edge', name: 'Charged Edge', prefix: 'Charged', tier: 1, slot: 'weapon',
    element: 'storm', level: 12,
    effects: [E({ kind: 'onHitStatus', status: 'shock', power: 1, durationTicks: 50, chance: 0.12 })],
    desc: 'A faint hum rides the steel. Strikes sometimes jolt.',
  },
  // ---- Weapon edges: tier 2 ----
  {
    id: 'blazing_edge', name: 'Blazing Edge', prefix: 'Blazing', tier: 2, slot: 'weapon',
    element: 'ember', level: 24,
    effects: [
      E({ kind: 'onHitStatus', status: 'burn', power: 1, durationTicks: 70, chance: 0.22 }),
      E({ kind: 'elementDmg', element: 'ember', pct: 10 }),
    ],
    desc: 'The blade wears a working flame. Fire magic burns brighter in your hands.',
  },
  {
    id: 'frostbound_edge', name: 'Frostbound Edge', prefix: 'Frostbound', tier: 2, slot: 'weapon',
    element: 'frost', level: 24,
    effects: [
      E({ kind: 'onHitStatus', status: 'chill', power: 1, durationTicks: 70, chance: 0.22 }),
      E({ kind: 'elementDmg', element: 'frost', pct: 10 }),
    ],
    desc: 'Cold has soaked to the core. Frost magic bites deeper in your hands.',
  },
  {
    id: 'storming_edge', name: 'Storming Edge', prefix: 'Storming', tier: 2, slot: 'weapon',
    element: 'storm', level: 28,
    effects: [
      E({ kind: 'onHitStatus', status: 'shock', power: 1, durationTicks: 60, chance: 0.22 }),
      E({ kind: 'elementDmg', element: 'storm', pct: 10 }),
    ],
    desc: 'Sparks walk the edge unbidden. Storm magic strikes harder in your hands.',
  },
  {
    id: 'leeching_edge', name: 'Leeching Edge', prefix: 'Leeching', tier: 2, slot: 'weapon',
    element: 'blood', level: 32,
    effects: [E({ kind: 'lifesteal', frac: 0.05 })],
    desc: 'The steel drinks a little of every wound it opens.',
  },
  {
    id: 'shadow_edge', name: 'Shadow Edge', prefix: 'Shadowed', tier: 2, slot: 'weapon',
    element: 'void', level: 34,
    effects: [E({ kind: 'backstab', bonus: 0.4 }), E({ kind: 'skill', skill: 'sneak', amount: 1 })],
    desc: 'The blade forgets to glint. Strikes from hiding cut crueler.',
  },
  // ---- Weapon edges: tier 3 ----
  {
    id: 'inferno_edge', name: 'Inferno Edge', prefix: 'Inferno', tier: 3, slot: 'weapon',
    element: 'ember', level: 44,
    effects: [
      E({ kind: 'onHitStatus', status: 'burn', power: 2, durationTicks: 80, chance: 0.3 }),
      E({ kind: 'elementDmg', element: 'ember', pct: 20 }),
    ],
    desc: 'The weapon is a torch that refuses to gutter. Foes carry its fire away with them.',
  },
  {
    id: 'glacial_edge', name: 'Glacial Edge', prefix: 'Glacial', tier: 3, slot: 'weapon',
    element: 'frost', level: 44,
    effects: [
      E({ kind: 'onHitStatus', status: 'chill', power: 2, durationTicks: 80, chance: 0.3 }),
      E({ kind: 'elementDmg', element: 'frost', pct: 20 }),
    ],
    desc: 'Deep-ice cold pours off the edge. Winter follows every swing.',
  },
  {
    id: 'tempest_edge', name: 'Tempest Edge', prefix: 'Tempest', tier: 3, slot: 'weapon',
    element: 'storm', level: 48,
    effects: [
      E({ kind: 'onHitStatus', status: 'shock', power: 2, durationTicks: 70, chance: 0.3 }),
      E({ kind: 'elementDmg', element: 'storm', pct: 20 }),
    ],
    desc: 'A caged storm rides the haft. Thunder answers every blow.',
  },
  {
    id: 'vampiric_edge', name: 'Vampiric Edge', prefix: 'Vampiric', tier: 3, slot: 'weapon',
    element: 'blood', level: 50,
    effects: [
      E({ kind: 'lifesteal', frac: 0.09 }),
      E({ kind: 'onHitStatus', status: 'bleed', power: 1, durationTicks: 60, chance: 0.15 }),
    ],
    desc: 'The steel is thirsty now. Wounds it opens feed the hand that holds it.',
  },
  {
    id: 'nightfall_edge', name: 'Nightfall Edge', prefix: 'Nightfall', tier: 3, slot: 'weapon',
    element: 'void', level: 52,
    effects: [E({ kind: 'backstab', bonus: 0.8 }), E({ kind: 'skill', skill: 'sneak', amount: 2 })],
    desc: 'Light bends politely around the blade. From behind, it is the last word.',
  },
  {
    id: 'dawnflash_edge', name: 'Dawnflash Edge', prefix: 'Dawnflash', tier: 3, slot: 'weapon',
    element: 'radiant', level: 54,
    effects: [E({ kind: 'crit', pct: 6 }), E({ kind: 'elementDmg', element: 'radiant', pct: 15 })],
    desc: 'Every swing carries a sliver of sunrise. Weak points shine like beacons.',
  },
  // ---- Body ----
  {
    id: 'hearty', name: 'Hearty Ward', prefix: 'Hearty', tier: 1, slot: 'body',
    element: 'verdant', level: 3,
    effects: [E({ kind: 'maxHp', amount: 6 })],
    desc: 'Green vigor woven through the lining. You can simply take more.',
  },
  {
    id: 'bristling', name: 'Bristling Ward', prefix: 'Bristling', tier: 1, slot: 'body',
    element: 'verdant', level: 10,
    effects: [E({ kind: 'thorns', amount: 1 })],
    desc: 'Briar-spirit in the weave. Those who strike you are pricked in return.',
  },
  {
    id: 'stalwart', name: 'Stalwart Ward', prefix: 'Stalwart', tier: 2, slot: 'body',
    element: 'verdant', level: 22,
    effects: [E({ kind: 'maxHp', amount: 14 }), E({ kind: 'armor', amount: 1 })],
    desc: 'Oak-heart patience settles into the garment. Harder to fell, harder to dent.',
  },
  {
    id: 'briarheart', name: 'Briarheart Ward', prefix: 'Briarheart', tier: 2, slot: 'body',
    element: 'verdant', level: 30,
    effects: [E({ kind: 'thorns', amount: 2 }), E({ kind: 'armor', amount: 1 })],
    desc: "A thicket's answer to violence: give every blow back with interest.",
  },
  {
    id: 'titanic', name: 'Titanic Ward', prefix: 'Titanic', tier: 3, slot: 'body',
    element: 'verdant', level: 46,
    effects: [E({ kind: 'maxHp', amount: 25 }), E({ kind: 'regen', amount: 2 })],
    desc: 'The endurance of old forests. Wounds close while you are still swinging.',
  },
  // ---- Head ----
  {
    id: 'clever', name: 'Clever Sigilwork', prefix: 'Clever', tier: 1, slot: 'head',
    element: 'arcane', level: 6,
    effects: [E({ kind: 'cooldown', pct: 3 })],
    desc: 'A thought-loosening rune at the brow. Abilities return a shade sooner.',
  },
  {
    id: 'focused', name: 'Focused Sigilwork', prefix: 'Focused', tier: 2, slot: 'head',
    element: 'arcane', level: 26,
    effects: [E({ kind: 'cooldown', pct: 6 })],
    desc: 'The mind runs quiet and quick. Abilities return noticeably sooner.',
  },
  {
    id: 'mindstorm', name: 'Mindstorm Sigilwork', prefix: 'Mindstorm', tier: 3, slot: 'head',
    element: 'arcane', level: 48,
    effects: [E({ kind: 'cooldown', pct: 10 }), E({ kind: 'skill', skill: 'magic', amount: 1 })],
    desc: 'Ideas arrive before you reach for them. The arts barely rest at all.',
  },
  // ---- Legs ----
  {
    id: 'ironbound', name: 'Ironbound Ward', prefix: 'Ironbound', tier: 2, slot: 'legs',
    element: 'arcane', level: 20,
    effects: [E({ kind: 'armor', amount: 3 })],
    desc: 'The weave remembers being an anvil. Blows land duller.',
  },
  // ---- Boots ----
  {
    id: 'swift', name: 'Swift Stride', prefix: 'Swift', tier: 1, slot: 'boots',
    element: 'storm', level: 4,
    effects: [E({ kind: 'speed', pct: 1.5 })],
    desc: 'The ground lets go of you a little easier.',
  },
  {
    id: 'fleet', name: 'Fleet Stride', prefix: 'Fleet', tier: 2, slot: 'boots',
    element: 'storm', level: 25,
    effects: [E({ kind: 'speed', pct: 3 })],
    desc: 'Wind under the heel. You arrive before you are expected.',
  },
  {
    id: 'windborne', name: 'Windborne Stride', prefix: 'Windborne', tier: 3, slot: 'boots',
    element: 'storm', level: 45,
    effects: [E({ kind: 'speed', pct: 4.5 })],
    desc: 'The gale claims you as its own. Few things outrun you now.',
  },
  // ---- Cape ----
  {
    id: 'battlecharged', name: 'Battlecharged Mantle', prefix: 'Battlecharged', tier: 3, slot: 'cape',
    element: 'storm', level: 50,
    effects: [E({ kind: 'onKillHaste', ticks: 10 })],
    desc: 'Victory feeds the storm at your shoulders. Every kill hastens your next art.',
  },
  // ---- Gloves ----
  {
    id: 'brutish', name: 'Brutish Grip', prefix: 'Brutish', tier: 1, slot: 'gloves',
    element: 'blood', level: 7,
    effects: [E({ kind: 'skill', skill: 'melee', amount: 1 })],
    desc: 'The hands remember old brawls. Melee comes easier.',
  },
  {
    id: 'deadeye', name: 'Deadeye Grip', prefix: 'Deadeye', tier: 1, slot: 'gloves',
    element: 'radiant', level: 7,
    effects: [E({ kind: 'skill', skill: 'archery', amount: 1 })],
    desc: 'The fingers loose without asking. Archery comes easier.',
  },
  {
    id: 'sagacious', name: 'Sagacious Grip', prefix: 'Sagacious', tier: 1, slot: 'gloves',
    element: 'arcane', level: 7,
    effects: [E({ kind: 'skill', skill: 'magic', amount: 1 })],
    desc: 'Sigils rise to meet the fingertips. Magic comes easier.',
  },
  {
    id: 'fieldhand', name: 'Fieldhand Grip', prefix: 'Fieldhand', tier: 1, slot: 'gloves',
    element: 'verdant', level: 14,
    effects: [
      E({ kind: 'skill', skill: 'mining', amount: 1 }),
      E({ kind: 'skill', skill: 'woodcutting', amount: 1 }),
      E({ kind: 'skill', skill: 'fishing', amount: 1 }),
    ],
    desc: 'Honest work sits lighter in these hands. The land gives a little more.',
  },
  {
    id: 'adept', name: 'Adept Grip', prefix: 'Adept', tier: 2, slot: 'gloves',
    element: 'arcane', level: 36,
    effects: [
      E({ kind: 'skill', skill: 'melee', amount: 1 }),
      E({ kind: 'skill', skill: 'archery', amount: 1 }),
      E({ kind: 'skill', skill: 'magic', amount: 1 }),
    ],
    desc: 'Every discipline answers the same steady hands.',
  },
  // ---- Offhand ----
  {
    id: 'warding', name: 'Warding Rune', prefix: 'Warded', tier: 1, slot: 'offhand',
    element: 'arcane', level: 5,
    effects: [E({ kind: 'armor', amount: 2 })],
    desc: 'A quiet rune that leans into the blow.',
  },
  {
    id: 'bulwark', name: 'Bulwark Rune', prefix: 'Bulwark', tier: 2, slot: 'offhand',
    element: 'arcane', level: 28,
    effects: [E({ kind: 'armor', amount: 4 }), E({ kind: 'maxHp', amount: 5 })],
    desc: 'The rune has opinions about what gets through. Most things do not.',
  },
  {
    id: 'aegis', name: 'Aegis Rune', prefix: 'Aegis', tier: 3, slot: 'offhand',
    element: 'arcane', level: 52,
    effects: [
      E({ kind: 'armor', amount: 6 }),
      E({ kind: 'maxHp', amount: 10 }),
      E({ kind: 'thorns', amount: 1 }),
    ],
    desc: 'A fortress compressed into a sigil. It holds, and it answers back.',
  },
];

export const ENCHANTS = new Map<string, EnchantDef>();
for (const e of ENCHANT_DEFS) {
  if (ENCHANTS.has(e.id)) throw new Error(`duplicate enchant id: ${e.id}`);
  if (e.effects.length === 0) throw new Error(`enchant ${e.id} has no effects`);
  ENCHANTS.set(e.id, e);
}

export function enchantDef(id: string | undefined): EnchantDef | undefined {
  return id ? ENCHANTS.get(id) : undefined;
}

/** Reagent theme per element: the essence a scroll of that element needs. */
export const ELEMENT_REAGENT: Partial<Record<MagicElement, string>> = {
  ember: 'ember_essence',
  frost: 'frost_essence',
  storm: 'storm_essence',
  verdant: 'verdant_essence',
  blood: 'crimson_essence',
  void: 'gloomsilk_thread',
  radiant: 'sunflower',
  // arcane runs on dust alone.
};

/** Tier-3 capstone reagent: the element's gem, or gold for the rest. */
export const ELEMENT_GEM: Partial<Record<MagicElement, string>> = {
  ember: 'emberstone',
  frost: 'frostshard',
  storm: 'stormpearl',
  verdant: 'bloomstone',
};

/** Identity hex per element — scroll items, card rows, loot labels. */
export const ELEMENT_COLORS: Record<MagicElement, string> = {
  arcane: '#b8a8e0',
  ember: '#e8683c',
  frost: '#9ad0ec',
  storm: '#e8e29a',
  verdant: '#7ac46a',
  void: '#8a78b0',
  radiant: '#f2d98a',
  blood: '#c04848',
  astral: '#9ae8de',
};

/** One-line human reading of an effect — cards, scroll tooltips. */
export function describeEffect(fx: EnchantEffect): string {
  switch (fx.kind) {
    case 'skill':
      return `+${fx.amount} ${fx.skill}`;
    case 'maxHp':
      return `+${fx.amount} max HP`;
    case 'regen':
      return `+${fx.amount} regeneration`;
    case 'armor':
      return `+${fx.amount} armor`;
    case 'styleDmg':
      return `+${fx.pct}% ${fx.style} damage`;
    case 'elementDmg':
      return `+${fx.pct}% ${fx.element} damage`;
    case 'cooldown':
      return `−${fx.pct}% ability cooldowns`;
    case 'speed':
      return `+${fx.pct}% move speed`;
    case 'thorns':
      return `attackers take ${fx.amount} damage`;
    case 'crit':
      return `+${fx.pct}% critical chance`;
    case 'onKillHaste':
      return `kills hasten your abilities`;
    case 'onHitStatus':
      return `${Math.round(fx.chance * 100)}% chance to ${fx.status} on hit`;
    case 'lifesteal':
      return `heal ${Math.round(fx.frac * 100)}% of damage dealt`;
    case 'backstab':
      return `backstabs +${Math.round(fx.bonus * 100)}% crueler`;
  }
}

/** Effects granted by an instance = native gear effects + its enchant. */
export function instanceEffects(
  nativeEffects: EnchantEffect[] | undefined,
  ench: string | undefined,
): EnchantEffect[] {
  const e = enchantDef(ench);
  if (!e) return nativeEffects ?? [];
  return nativeEffects ? [...nativeEffects, ...e.effects] : e.effects;
}

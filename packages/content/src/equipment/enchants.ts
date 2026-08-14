import type { ItemRoll, RarityTier, SkillId, StatusId } from '@arx/shared';
import { QUALITY_BASE, QUALITY_CEIL, QUALITY_FLOOR } from '@arx/shared';
import type { CombatStyle, ArxElement } from '../items.js';
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
 *  - PROCS route by their TRIGGER, not by their slot (see below).
 */

// ------------------------------------------------------- the proc grammar

/**
 * THE PROC GRAMMAR: a working that waits for a moment, then answers.
 *
 * Every other effect in this file is a flat number folded into the
 * wearer's stats, and before this grammar the only conditional in the
 * whole vocabulary was an on-hit chance. A proc is trigger x response:
 * WHEN it wakes, WHAT it does, and how long it must rest after.
 *
 * The internal cooldown (`icd`, in ticks) is not a dial to leave at
 * zero. It is the law that keeps a proc a MOMENT instead of a texture:
 * a 12%-chance nova that may fire three times a second is not a proc,
 * it is a damage aura wearing a disguise.
 */
export type EnchantTrigger =
  /** A basic attack landed. Rolls `chance` on each landed blow. */
  | { on: 'hit'; chance: number }
  /**
   * THE READING EDGE: a basic landed on a body already carrying
   * `status`. Strike channel — it reads the steel that connected.
   * The state check happens AT THE DOOR (an unmarked body means no
   * roll and no rest, the targeted-moment law), so the published
   * chance holds against marked bodies alone.
   */
  | { on: 'hitState'; status: StatusId; chance: number }
  /** A critical landed. Rare of its own nature, so it needs no chance. */
  | { on: 'crit' }
  /** Something died to you. */
  | { on: 'kill' }
  /** A blow got past armor into flesh. Rolls `chance`. */
  | { on: 'hurt'; chance: number }
  /** A raised shield turned a real bite of a blow. */
  | { on: 'block' }
  /** An ability fired. */
  | { on: 'cast' }
  /**
   * Health crossed this fraction of maximum, DOWNWARD. Fires on the
   * crossing alone and re-arms only when the wearer climbs back above
   * the line, so a string of small hits cannot re-trigger it every
   * tick. (The Second Wind law, generalized to the whole grammar.)
   */
  | { on: 'lowHp'; pct: number }
  /** Every Nth landed strike. Whiffs never count, the whiff-0 law. */
  | { on: 'cadence'; every: number }
  /**
   * Build and spend: each `per` moment adds a charge and the working
   * fires at `count`. THE METER IS THE FIGHTER'S, never the blade's —
   * a dual wielder keeps ONE meter however many edges carry the same
   * working, which is why stacks route aggregate-side whatever slot
   * they ride on.
   */
  | { on: 'stacks'; per: StackSource; count: number }
  /** A harvest completed. Rolls `chance`. */
  | { on: 'gather'; chance: number }
  /** Every N tiles covered on foot. */
  | { on: 'stride'; tiles: number };

/**
 * The moments a stacking working may count toward its charge.
 * `gather` is here so a yield working can be a RHYTHM (every Nth
 * harvest, deterministically) rather than a chance — the doubling
 * channel belongs to the Callings, and a chance-gated extra yield
 * would be that channel wearing an enchant's clothes.
 */
export type StackSource = 'hit' | 'crit' | 'hurt' | 'block' | 'cast' | 'kill' | 'gather';

/**
 * What a timed surge lifts. Each maps to exactly one live dial.
 *
 * `armor` and `regen` are RESERVED GRAMMAR: the server resolves both
 * as FLAT lifts (+pct armor, +pct health every 4s), describeAction
 * speaks them in those units, and no roster working uses them yet.
 * They are held open on purpose for future content, not leftovers —
 * remove one and the /proc dev lever loses a shape the vocabulary
 * already knows how to say.
 */
export type SurgeStat = 'speed' | 'armor' | 'crit' | 'damage' | 'regen';

/** What a woken working actually does. */
export type ProcAction =
  /** Lay a status on the struck foe. */
  | { do: 'status'; status: StatusId; power: number; ticks: number }
  /** A burst around the moment's point. */
  | { do: 'nova'; damage: number; radius: number }
  /** A single mote into the foe that woke it. */
  | { do: 'bolt'; damage: number }
  /** Damage that walks on to nearby foes. */
  | { do: 'chain'; damage: number; jumps: number }
  /** A shell that eats damage before flesh does. */
  | { do: 'ward'; absorb: number; ticks: number }
  /** Close some of the wearer's own wounds. */
  | { do: 'heal'; amount: number }
  /** A timed lift on one dial. */
  | { do: 'surge'; stat: SurgeStat; pct: number; ticks: number }
  /**
   * Strip every status riding the wearer. RESERVED GRAMMAR: no roster
   * working casts it yet (only the /proc dev lever reaches it). Kept
   * deliberately — it is the vocabulary's one defensive answer to
   * statuses, waiting for the working that earns it.
   */
  | { do: 'cleanse' }
  /** Gathering only: more in the basket. */
  | { do: 'yield'; extra: number }
  /**
   * Mark what is nearby but unseen. `of: 'chest'` is RESERVED GRAMMAR:
   * node and foe reveals ship on the roster, the cache reveal awaits
   * the working that wants it. Intent, not rot.
   */
  | { do: 'reveal'; radius: number; of: 'node' | 'chest' | 'foe' };

/**
 * Triggers that belong to the steel which LANDED, and so resolve from
 * the weapon instance that swung it (the strike channel). Everything
 * else belongs to the body wearing it and folds into the aggregate.
 *
 * `stacks` is deliberately absent even when it counts hits: see the
 * meter law on the trigger itself.
 */
export const STRIKE_TRIGGERS: readonly EnchantTrigger['on'][] = [
  'hit',
  'crit',
  'cadence',
  'hitState',
];

export function isStrikeTrigger(on: EnchantTrigger['on']): boolean {
  return (STRIKE_TRIGGERS as readonly string[]).includes(on);
}

/**
 * Triggers that arrive with a FOE in hand. A working whose action needs
 * a target (a status to lay, a mote to send) is authored nonsense on any
 * other trigger: it would pass every test, bond onto a real item, wake
 * exactly on schedule, and then do nothing at all, forever, because
 * there is nobody for it to do it to.
 *
 * `kill` is absent on purpose. The foe that died is the only candidate,
 * and poisoning a corpse is not an effect.
 */
export const TARGETED_TRIGGERS: readonly EnchantTrigger['on'][] = [
  'hit',
  'crit',
  'cadence',
  'hitState',
  'hurt',
  'block',
];

/** Actions that cannot do anything without a foe. */
export const TARGETED_ACTIONS: readonly ProcAction['do'][] = ['status', 'bolt'];

export function triggerHasTarget(t: EnchantTrigger): boolean {
  if (t.on === 'stacks') {
    return (TARGETED_TRIGGERS as readonly string[]).includes(t.per);
  }
  return (TARGETED_TRIGGERS as readonly string[]).includes(t.on);
}

/**
 * Why this working could never fire, or null if it is sound. Checked at
 * load for the whole roster, so an unfirable pairing cannot ship.
 */
export function procMismatch(p: ProcEffect): string | null {
  const needsFoe = (TARGETED_ACTIONS as readonly string[]).includes(p.action.do);
  if (needsFoe && !triggerHasTarget(p.trigger)) {
    return `'${p.action.do}' needs a foe, and '${p.trigger.on}' never brings one`;
  }
  // A yield answers a harvest and nothing else — either the harvest
  // itself, or a rhythm counted in harvests. Any other pairing fills a
  // basket that was never held out.
  const gatherPaced =
    p.trigger.on === 'gather' || (p.trigger.on === 'stacks' && p.trigger.per === 'gather');
  if (p.action.do === 'yield' && !gatherPaced) {
    return `'yield' fills a basket, so it only answers 'gather'`;
  }
  if (gatherPaced && p.action.do !== 'yield' && p.action.do !== 'reveal') {
    return `'gather' happens away from any fight; '${p.action.do}' has nothing to work on`;
  }
  return null;
}

export type EnchantEffect =
  | { kind: 'skill'; skill: SkillId; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'regen'; amount: number }
  | { kind: 'armor'; amount: number }
  | { kind: 'styleDmg'; style: CombatStyle; pct: number }
  | { kind: 'elementDmg'; element: ArxElement; pct: number }
  | { kind: 'cooldown'; pct: number }
  | { kind: 'speed'; pct: number }
  | { kind: 'thorns'; amount: number }
  | { kind: 'crit'; pct: number }
  | { kind: 'onKillHaste'; ticks: number }
  | { kind: 'onHitStatus'; status: StatusId; power: number; durationTicks: number; chance: number }
  | { kind: 'lifesteal'; frac: number }
  | { kind: 'backstab'; bonus: number }
  /**
   * THE READING EDGE: bodies carrying `status` take `pct`% more from
   * the wearer. Aggregate channel, and HIGHEST WINS at the fold —
   * same-state clauses never stack across pieces, by law. The seam
   * multiplies distinct states only.
   */
  | { kind: 'vsState'; status: StatusId; pct: number }
  | ProcEffect;

/**
 * A named working. `id` keys its rest timer and its charge, so two
 * pieces carrying the SAME proc id share one timer and one meter —
 * that is what stops a matched set from firing the same working five
 * times at once. `name` is what floats when it wakes; procs announce
 * themselves once by name and never by number, so a working reads as
 * an event instead of adding noise to the damage stream.
 */
export interface ProcEffect {
  kind: 'proc';
  id: string;
  name: string;
  trigger: EnchantTrigger;
  action: ProcAction;
  /** Ticks the working must rest before it may wake again. */
  icd: number;
  /** Tint for the moment. Defaults to the carrying enchant's element. */
  element?: ArxElement;
}

/**
 * Effect kinds resolved at strike time from the landed weapon instance.
 * Procs are absent on purpose: they route by TRIGGER, not by kind, so
 * asking `isStrikeEffect` about one is always the wrong question.
 */
export const STRIKE_EFFECT_KINDS: readonly EnchantEffect['kind'][] = [
  'onHitStatus',
  'lifesteal',
  'backstab',
];

/**
 * THE LONG LADDER. Enchanting caps at 99 like every other trade, and
 * for a long time the roster stopped at 54 — forty-five levels of a
 * named profession with nothing in them. Tiers 4 and 5 are the answer.
 *
 * The bands are law, not suggestion: a working authored outside its
 * tier's band is rejected at load. Without that guard the ladder drifts
 * one enchant at a time until the tiers stop meaning anything, and the
 * cost tables (which key off tier, not level) quietly stop matching the
 * power they are paying for.
 */
export type EnchantTier = 1 | 2 | 3 | 4 | 5;

/**
 * How much of its school's essence a scroll of each tier costs. Lives
 * here, beside the tier itself, because two systems need it and must
 * never disagree: recipes.ts spends it, and THE UNMAKING pays a
 * fraction of it back. A second copy would drift the day one of them
 * was rebalanced and the other was not, and the drift would silently
 * open or close a farming cycle.
 */
export const ESSENCE_BY_TIER: Record<EnchantTier, number> = {
  1: 1, 2: 2, 3: 4, 4: 7, 5: 12,
};

export const TIER_BANDS: Record<EnchantTier, { lo: number; hi: number }> = {
  1: { lo: 1, hi: 19 },
  2: { lo: 20, hi: 39 },
  3: { lo: 40, hi: 57 },
  4: { lo: 58, hi: 79 },
  5: { lo: 80, hi: 99 },
};

export interface EnchantDef {
  id: string;
  /** Full label ("Kindled Edge") — scroll names, card rows. */
  name: string;
  /** Adjective prepended to the item's display name ("Kindled ..."). */
  prefix: string;
  /**
   * Visual + cost tier. THE WORN LIGHT reads this as loudness:
   *   1 a glint, 2 a steady channel, 3 the living corona,
   *   4 a greater working, 5 a masterwork.
   * See TIER_BANDS for the level each tier is authored inside.
   */
  tier: EnchantTier;
  /** The single equip slot a scroll of this enchant targets. */
  slot: GearSlot;
  /** Drives tint, fx channel, and the reagent theme. */
  element: ArxElement;
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
      E({ kind: 'styleDmg', style: 'onehand', pct: 4 }),
      E({ kind: 'styleDmg', style: 'archery', pct: 4 }),
      E({ kind: 'styleDmg', style: 'arx', pct: 4 }),
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
    desc: 'The blade wears a working flame. Fire Arx burns brighter in your hands.',
  },
  {
    id: 'frostbound_edge', name: 'Frostbound Edge', prefix: 'Frostbound', tier: 2, slot: 'weapon',
    element: 'frost', level: 24,
    effects: [
      E({ kind: 'onHitStatus', status: 'chill', power: 1, durationTicks: 70, chance: 0.22 }),
      E({ kind: 'elementDmg', element: 'frost', pct: 10 }),
    ],
    desc: 'Cold has soaked to the core. Frost Arx bites deeper in your hands.',
  },
  {
    id: 'storming_edge', name: 'Storming Edge', prefix: 'Storming', tier: 2, slot: 'weapon',
    element: 'storm', level: 28,
    effects: [
      E({ kind: 'onHitStatus', status: 'shock', power: 1, durationTicks: 60, chance: 0.22 }),
      E({ kind: 'elementDmg', element: 'storm', pct: 10 }),
    ],
    desc: 'Sparks walk the edge unbidden. Storm Arx strikes harder in your hands.',
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
    effects: [E({ kind: 'cooldown', pct: 10 }), E({ kind: 'skill', skill: 'arx', amount: 1 })],
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
    effects: [E({ kind: 'skill', skill: 'onehand', amount: 1 })],
    desc: 'The hands remember old brawls. The blade hand comes easier.',
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
    effects: [E({ kind: 'skill', skill: 'arx', amount: 1 })],
    desc: 'Sigils rise to meet the fingertips. Arx comes easier.',
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
      E({ kind: 'skill', skill: 'onehand', amount: 1 }),
      E({ kind: 'skill', skill: 'archery', amount: 1 }),
      E({ kind: 'skill', skill: 'arx', amount: 1 }),
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

  // ==================================================================
  // THE LONG LADDER
  //
  // Everything above is the original roster, which stopped at level 54
  // and left legs, cape, and half the schools with nothing. What
  // follows fills those holes and runs the trade to 99.
  //
  // Two things change in kind above tier 3. First, WORKINGS: the top
  // bands are where procs live, so a greater working is not a bigger
  // number, it is a thing that happens. Second, the non-combat family
  // becomes real, and it competes for the same slots as the combat
  // lines. That competition IS the build decision.
  //
  // Gathering workings take RHYTHM AND REACH on purpose. The thrift and
  // doubling channels belong to the Callings (Dust Thrift, Gentle Hand,
  // Prospector), and an enchant that also doubled a yield would be a
  // second copy of a system that already exists.
  // ==================================================================

  // ---------------------------------------------------------- weapon
  {
    id: 'starlit_edge', name: 'Starlit Edge', prefix: 'Starlit', tier: 2, slot: 'weapon',
    element: 'astral', level: 32,
    effects: [E({ kind: 'elementDmg', element: 'astral', pct: 10 }), E({ kind: 'crit', pct: 2 })],
    desc: 'Cold pinpoints travel the steel, always a little behind the swing.',
  },
  {
    id: 'emberwake_edge', name: 'Emberwake', prefix: 'Emberwake', tier: 4, slot: 'weapon',
    element: 'ember', level: 60,
    effects: [
      E({ kind: 'elementDmg', element: 'ember', pct: 22 }),
      E({
        kind: 'proc', id: 'emberwake', name: 'Emberwake',
        trigger: { on: 'cadence', every: 4 },
        action: { do: 'nova', damage: 9, radius: 2.6 },
        icd: 100,
      }),
    ],
    desc: 'Heat gathers across four blows and lets go of all of it at once.',
  },
  {
    id: 'frostbinder_edge', name: 'Frostbinder', prefix: 'Frostbinding', tier: 4, slot: 'weapon',
    element: 'frost', level: 62,
    effects: [
      E({ kind: 'elementDmg', element: 'frost', pct: 22 }),
      E({
        kind: 'proc', id: 'frostbind', name: 'Frostbind',
        trigger: { on: 'hit', chance: 0.18 },
        action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
        icd: 60,
      }),
    ],
    desc: 'The cold does not spread from the wound. It arrives already everywhere.',
  },
  {
    id: 'thunderchain_edge', name: 'Thunderchain', prefix: 'Thunderchain', tier: 4, slot: 'weapon',
    element: 'storm', level: 66,
    effects: [
      E({ kind: 'elementDmg', element: 'storm', pct: 22 }),
      E({
        kind: 'proc', id: 'thunderchain', name: 'Thunderchain',
        trigger: { on: 'crit' },
        action: { do: 'chain', damage: 11, jumps: 3 },
        icd: 120,
      }),
    ],
    desc: 'A clean hit finds the next three throats without being asked.',
  },
  {
    id: 'sanguine_edge', name: 'Sanguine Edge', prefix: 'Sanguine', tier: 4, slot: 'weapon',
    element: 'blood', level: 70,
    effects: [
      E({ kind: 'lifesteal', frac: 0.11 }),
      E({
        kind: 'proc', id: 'red_harvest', name: 'Red Harvest',
        trigger: { on: 'cadence', every: 6 },
        action: { do: 'heal', amount: 18 },
        icd: 140,
      }),
    ],
    desc: 'It keeps a tally. Every sixth wound, it settles up in your favor.',
  },
  {
    id: 'duskfang', name: 'Duskfang', prefix: 'Dusk', tier: 4, slot: 'weapon',
    element: 'void', level: 74,
    effects: [
      E({ kind: 'backstab', bonus: 1 }),
      E({ kind: 'skill', skill: 'sneak', amount: 2 }),
      E({
        kind: 'proc', id: 'open_vein', name: 'Open Vein',
        trigger: { on: 'crit' },
        action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
        icd: 80,
      }),
    ],
    desc: 'It does not cut so much as decline to be stopped.',
  },
  {
    id: 'sunspear_edge', name: 'Sunspear', prefix: 'Sunspear', tier: 5, slot: 'weapon',
    element: 'radiant', level: 82,
    effects: [
      E({ kind: 'crit', pct: 8 }),
      E({ kind: 'elementDmg', element: 'radiant', pct: 26 }),
      E({
        kind: 'proc', id: 'sunlance', name: 'Sunlance',
        trigger: { on: 'crit' },
        action: { do: 'bolt', damage: 26 },
        icd: 90,
      }),
    ],
    desc: 'Every weak point is lit for you, and something answers the light.',
  },
  {
    id: 'starfall_edge', name: 'Starfall Edge', prefix: 'Starfall', tier: 5, slot: 'weapon',
    element: 'astral', level: 88,
    effects: [
      E({ kind: 'elementDmg', element: 'astral', pct: 26 }),
      E({
        kind: 'proc', id: 'starfall', name: 'Starfall',
        trigger: { on: 'cadence', every: 5 },
        action: { do: 'nova', damage: 16, radius: 3.4 },
        icd: 120,
      }),
    ],
    desc: 'Something very far away is keeping count of your swings.',
  },
  {
    id: 'worldbreaker_edge', name: 'Worldbreaker', prefix: 'Worldbreaking', tier: 5, slot: 'weapon',
    element: 'arcane', level: 95,
    effects: [
      E({ kind: 'styleDmg', style: 'onehand', pct: 10 }),
      E({ kind: 'styleDmg', style: 'twohand', pct: 10 }),
      E({ kind: 'styleDmg', style: 'archery', pct: 10 }),
      E({ kind: 'styleDmg', style: 'arx', pct: 10 }),
      E({
        kind: 'proc', id: 'sunder', name: 'Sunder',
        trigger: { on: 'cadence', every: 3 },
        action: { do: 'nova', damage: 14, radius: 3 },
        icd: 90,
      }),
    ],
    desc: 'The binding of things is a suggestion, and this argues with it.',
  },

  // ------------------------------------------------------------ body
  {
    id: 'warded_weave', name: 'Sealed Weave', prefix: 'Sealed', tier: 1, slot: 'body',
    element: 'arcane', level: 6,
    effects: [E({ kind: 'armor', amount: 1 })],
    desc: 'A closing rune at every seam. Small work, honestly done.',
  },
  {
    id: 'emberweave', name: 'Emberweave Ward', prefix: 'Emberweave', tier: 2, slot: 'body',
    element: 'ember', level: 30,
    effects: [
      E({ kind: 'maxHp', amount: 12 }),
      E({
        kind: 'proc', id: 'backdraft', name: 'Backdraft',
        trigger: { on: 'hurt', chance: 0.25 },
        action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
        icd: 80,
      }),
    ],
    desc: 'Struck hard, the cloth remembers it was fire first.',
  },
  {
    id: 'dragonhide_ward', name: 'Dragonhide Ward', prefix: 'Dragonhide', tier: 3, slot: 'body',
    element: 'ember', level: 48,
    effects: [E({ kind: 'maxHp', amount: 20 }), E({ kind: 'armor', amount: 2 })],
    desc: 'Scale-logic worked into ordinary cloth. Blows slide where they meant to bite.',
  },
  {
    id: 'voidweave_ward', name: 'Voidweave Ward', prefix: 'Voidweave', tier: 3, slot: 'body',
    element: 'void', level: 52,
    effects: [E({ kind: 'armor', amount: 3 }), E({ kind: 'skill', skill: 'sneak', amount: 2 })],
    desc: 'The garment declines to be looked at directly. So, mostly, do you.',
  },
  {
    id: 'stoneheart_ward', name: 'Stoneheart Ward', prefix: 'Stoneheart', tier: 4, slot: 'body',
    element: 'frost', level: 64,
    effects: [
      E({ kind: 'maxHp', amount: 30 }),
      E({ kind: 'armor', amount: 3 }),
      E({
        kind: 'proc', id: 'stoneheart', name: 'Stoneheart',
        trigger: { on: 'lowHp', pct: 0.35 },
        action: { do: 'ward', absorb: 70, ticks: 160 },
        icd: 1200,
      }),
    ],
    desc: 'It waits until things are genuinely bad, and then it holds.',
  },
  {
    id: 'thornlord_ward', name: 'Thornlord Ward', prefix: 'Thornlord', tier: 4, slot: 'body',
    element: 'verdant', level: 70,
    effects: [
      E({ kind: 'thorns', amount: 4 }),
      E({ kind: 'armor', amount: 2 }),
      E({
        kind: 'proc', id: 'briarburst', name: 'Briarburst',
        trigger: { on: 'hurt', chance: 0.3 },
        action: { do: 'nova', damage: 10, radius: 2.4 },
        icd: 100,
      }),
    ],
    desc: 'A thicket does not defend itself politely, and neither does this.',
  },
  {
    id: 'worldheart_ward', name: 'Worldheart Ward', prefix: 'Worldheart', tier: 5, slot: 'body',
    element: 'verdant', level: 86,
    effects: [
      E({ kind: 'maxHp', amount: 45 }),
      E({ kind: 'regen', amount: 3 }),
      E({
        kind: 'proc', id: 'worldheart', name: 'Worldheart',
        trigger: { on: 'lowHp', pct: 0.4 },
        action: { do: 'heal', amount: 60 },
        icd: 1400,
      }),
    ],
    desc: 'Old forest patience, worn on the body. It has seen worse than this and stayed.',
  },

  // ------------------------------------------------------------ head
  {
    id: 'keen_sight', name: 'Keen Sight', prefix: 'Keen-eyed', tier: 1, slot: 'head',
    element: 'astral', level: 6,
    effects: [E({ kind: 'skill', skill: 'archery', amount: 1 })],
    desc: 'Distance stops arguing with you. The loose comes easier.',
  },
  {
    id: 'warded_crown', name: 'Frostbrow Sigilwork', prefix: 'Frostbrow', tier: 2, slot: 'head',
    element: 'frost', level: 30,
    effects: [E({ kind: 'armor', amount: 2 }), E({ kind: 'maxHp', amount: 8 })],
    desc: 'Cold sits in the brow band and takes the edge off what lands there.',
  },
  {
    id: 'farseers_crown', name: "Farseer's Sigilwork", prefix: 'Farseeing', tier: 3, slot: 'head',
    element: 'astral', level: 50,
    effects: [
      E({ kind: 'skill', skill: 'arx', amount: 2 }),
      E({
        kind: 'proc', id: 'farsight', name: 'Farsight',
        trigger: { on: 'stride', tiles: 34 },
        action: { do: 'reveal', radius: 9, of: 'node' },
        icd: 300,
      }),
    ],
    desc: 'Walk long enough and the ground starts telling you what it is holding.',
  },
  {
    id: 'runethinkers_crown', name: "Runethinker's Sigilwork", prefix: 'Runethinking', tier: 4, slot: 'head',
    element: 'arcane', level: 68,
    effects: [
      E({ kind: 'cooldown', pct: 12 }),
      E({
        kind: 'proc', id: 'second_thought', name: 'Second Thought',
        trigger: { on: 'cast' },
        action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
        icd: 220,
      }),
    ],
    desc: 'One art fires and the next is already half-assembled behind your eyes.',
  },
  {
    id: 'oracles_crown', name: "Oracle's Sigilwork", prefix: 'Oracular', tier: 5, slot: 'head',
    element: 'astral', level: 88,
    effects: [
      E({ kind: 'skill', skill: 'arx', amount: 3 }),
      E({ kind: 'cooldown', pct: 12 }),
      E({
        kind: 'proc', id: 'oracle_eye', name: 'The Eye Opens',
        trigger: { on: 'stride', tiles: 26 },
        action: { do: 'reveal', radius: 12, of: 'foe' },
        icd: 260,
      }),
    ],
    desc: 'Nothing gets to be behind you any more. It is restful and it is not.',
  },

  // ------------------------------------------------------------ legs
  //
  // Legs carried exactly ONE working for the whole game before this,
  // which is not a choice, it is a formality. The line below is built
  // around the two things legs actually do: carry you, and keep
  // carrying you after something hits you.
  {
    id: 'sure_footed', name: 'Sure-footed Ward', prefix: 'Sure-footed', tier: 1, slot: 'legs',
    element: 'verdant', level: 6,
    effects: [E({ kind: 'speed', pct: 1 })],
    desc: 'Roots and loose stone stop mattering quite so much.',
  },
  {
    id: 'padded_greaves', name: 'Padded Ward', prefix: 'Padded', tier: 1, slot: 'legs',
    element: 'arcane', level: 12,
    effects: [E({ kind: 'armor', amount: 1 })],
    desc: 'Quiet stuffing in the places that always get hit first.',
  },
  {
    id: 'longstride', name: 'Longstride Ward', prefix: 'Longstride', tier: 2, slot: 'legs',
    element: 'storm', level: 26,
    effects: [E({ kind: 'speed', pct: 2.5 })],
    desc: 'The same walk covers more ground. Nobody can say quite how.',
  },
  {
    id: 'unyielding_greaves', name: 'Unyielding Ward', prefix: 'Unyielding', tier: 3, slot: 'legs',
    element: 'frost', level: 45,
    effects: [E({ kind: 'armor', amount: 5 }), E({ kind: 'maxHp', amount: 8 })],
    desc: 'Set once, and the ground under you becomes the argument.',
  },
  {
    id: 'wayfarers_greaves', name: "Wayfarer's Ward", prefix: 'Wayfaring', tier: 3, slot: 'legs',
    element: 'astral', level: 50,
    effects: [
      E({ kind: 'speed', pct: 3 }),
      E({
        kind: 'proc', id: 'second_wind_stride', name: 'Second Wind',
        trigger: { on: 'stride', tiles: 46 },
        action: { do: 'surge', stat: 'speed', pct: 20, ticks: 90 },
        icd: 260,
      }),
    ],
    desc: 'The long road stops taking from you somewhere around the third mile.',
  },
  {
    id: 'bulwark_greaves', name: 'Anchored Ward', prefix: 'Anchored', tier: 4, slot: 'legs',
    element: 'frost', level: 62,
    effects: [
      E({ kind: 'armor', amount: 8 }),
      E({ kind: 'maxHp', amount: 14 }),
      E({
        kind: 'proc', id: 'dig_in', name: 'Dig In',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'ward', absorb: 26, ticks: 120 },
        icd: 300,
      }),
    ],
    desc: 'Every blow that lands teaches the legs to be somewhere harder to move.',
  },
  {
    id: 'stormstep_greaves', name: 'Stormstep Ward', prefix: 'Stormstep', tier: 4, slot: 'legs',
    element: 'storm', level: 68,
    effects: [
      E({ kind: 'speed', pct: 4 }),
      E({
        kind: 'proc', id: 'stormstep', name: 'Stormstep',
        trigger: { on: 'stride', tiles: 32 },
        action: { do: 'surge', stat: 'speed', pct: 28, ticks: 70 },
        icd: 200,
      }),
    ],
    desc: 'The weather gets behind you and pushes, for a while, at intervals.',
  },
  {
    id: 'titanstride', name: 'Titanstride Ward', prefix: 'Titanstride', tier: 5, slot: 'legs',
    element: 'verdant', level: 84,
    effects: [
      E({ kind: 'armor', amount: 10 }),
      E({ kind: 'maxHp', amount: 25 }),
      E({ kind: 'speed', pct: 3 }),
      E({
        kind: 'proc', id: 'rooted', name: 'Rooted',
        trigger: { on: 'lowHp', pct: 0.3 },
        action: { do: 'ward', absorb: 90, ticks: 200 },
        icd: 1400,
      }),
    ],
    desc: 'Something under the ground has opinions about you falling over.',
  },

  // ----------------------------------------------------------- boots
  {
    id: 'pathfinders_step', name: "Pathfinder's Stride", prefix: 'Pathfinding', tier: 1, slot: 'boots',
    element: 'astral', level: 6,
    effects: [E({ kind: 'speed', pct: 1 })],
    desc: 'The way ahead reads a little clearer than it has any right to.',
  },
  {
    id: 'prospectors_step', name: "Prospector's Stride", prefix: 'Prospecting', tier: 2, slot: 'boots',
    element: 'verdant', level: 28,
    effects: [
      E({
        // A RHYTHM, not a roll: the doubling-by-chance channel belongs
        // to the Callings (see the law comment atop THE LONG LADDER),
        // so the enchant counts harvests instead. Every sixth take
        // answers, deterministically — expected value sits just under
        // the old 18%-per-gather it replaced.
        kind: 'proc', id: 'good_footing', name: 'Good Footing',
        trigger: { on: 'stacks', per: 'gather', count: 6 },
        action: { do: 'yield', extra: 1 },
        icd: 40,
      }),
    ],
    desc: 'The ground falls into step with you. Every sixth take comes up heavier.',
  },
  {
    id: 'emberstep', name: 'Emberstep Stride', prefix: 'Emberstep', tier: 3, slot: 'boots',
    element: 'ember', level: 46,
    effects: [
      E({ kind: 'speed', pct: 3 }),
      E({
        kind: 'proc', id: 'cinder_trail', name: 'Cinder Trail',
        trigger: { on: 'stride', tiles: 24 },
        action: { do: 'nova', damage: 8, radius: 2.2 },
        icd: 160,
      }),
    ],
    desc: 'What you leave behind keeps burning for a moment after you have gone.',
  },
  {
    id: 'voidstep', name: 'Voidstep Stride', prefix: 'Voidstep', tier: 4, slot: 'boots',
    element: 'void', level: 62,
    effects: [
      E({ kind: 'speed', pct: 4 }),
      E({ kind: 'skill', skill: 'sneak', amount: 2 }),
      E({
        kind: 'proc', id: 'slip_away', name: 'Slip Away',
        trigger: { on: 'stride', tiles: 36 },
        action: { do: 'surge', stat: 'speed', pct: 24, ticks: 80 },
        icd: 220,
      }),
    ],
    desc: 'The ground lets go early and the sound arrives late.',
  },
  {
    id: 'stormrunner', name: 'Stormrunner Stride', prefix: 'Stormrunner', tier: 5, slot: 'boots',
    element: 'storm', level: 92,
    effects: [
      E({ kind: 'speed', pct: 6 }),
      E({
        kind: 'proc', id: 'stormrunner', name: 'Stormrunner',
        trigger: { on: 'stride', tiles: 22 },
        action: { do: 'chain', damage: 12, jumps: 3 },
        icd: 180,
      }),
    ],
    desc: 'A running charge builds up in the heel and has to go somewhere.',
  },

  // ------------------------------------------------------------ cape
  //
  // Capes had exactly one working, at tier 3, which meant a cape was
  // unenchantable for the first forty-nine levels of the trade. The
  // cape's channel is the WAKE, so its line is built around motion and
  // aftermath: what happens when you kill, when you cast, when you run.
  {
    id: 'travellers_mantle', name: "Traveller's Mantle", prefix: 'Travelling', tier: 1, slot: 'cape',
    element: 'astral', level: 8,
    effects: [E({ kind: 'speed', pct: 1.5 })],
    desc: 'Cut for long roads by somebody who had walked a few.',
  },
  {
    id: 'warm_mantle', name: 'Warm Mantle', prefix: 'Warm', tier: 2, slot: 'cape',
    element: 'ember', level: 26,
    effects: [E({ kind: 'maxHp', amount: 10 })],
    desc: 'Banked heat in the lining. You last longer at everything, including winter.',
  },
  {
    id: 'quickened_mantle', name: 'Quickened Mantle', prefix: 'Quickened', tier: 2, slot: 'cape',
    element: 'arcane', level: 34,
    effects: [E({ kind: 'cooldown', pct: 4 })],
    desc: 'The cloth hurries a little. Whatever you were about to do comes back sooner.',
  },
  {
    id: 'shrouded_mantle', name: 'Shrouded Mantle', prefix: 'Shrouded', tier: 3, slot: 'cape',
    element: 'void', level: 46,
    effects: [E({ kind: 'skill', skill: 'sneak', amount: 2 }), E({ kind: 'speed', pct: 2 })],
    desc: 'It hangs wrong on purpose. Eyes slide off the shape of you.',
  },
  {
    id: 'revenants_mantle', name: "Revenant's Mantle", prefix: 'Revenant', tier: 4, slot: 'cape',
    element: 'blood', level: 64,
    effects: [
      E({ kind: 'maxHp', amount: 15 }),
      E({
        kind: 'proc', id: 'blood_price', name: 'Blood Price',
        trigger: { on: 'kill' },
        action: { do: 'heal', amount: 14 },
        icd: 60,
      }),
    ],
    desc: 'What goes out of them comes back into you. Nobody is comfortable about it.',
  },
  {
    id: 'stormcallers_mantle', name: "Stormcaller's Mantle", prefix: 'Stormcalling', tier: 4, slot: 'cape',
    element: 'storm', level: 72,
    effects: [
      E({ kind: 'cooldown', pct: 7 }),
      E({
        kind: 'proc', id: 'gathering_storm', name: 'Gathering Storm',
        trigger: { on: 'stacks', per: 'cast', count: 3 },
        action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
        icd: 200,
      }),
    ],
    desc: 'Three arts in and the air behind your shoulders has made up its mind.',
  },
  {
    id: 'comet_mantle', name: 'Comet Mantle', prefix: 'Comet', tier: 5, slot: 'cape',
    element: 'astral', level: 86,
    effects: [
      E({ kind: 'speed', pct: 4 }),
      E({
        kind: 'proc', id: 'comet_tail', name: 'Comet Tail',
        trigger: { on: 'stride', tiles: 28 },
        action: { do: 'nova', damage: 15, radius: 3 },
        icd: 170,
      }),
    ],
    desc: 'You are the near end of something long and very bright.',
  },

  // ---------------------------------------------------------- gloves
  {
    id: 'quarriers_grip', name: "Quarrier's Grip", prefix: 'Quarrying', tier: 2, slot: 'gloves',
    element: 'verdant', level: 30,
    effects: [
      // +1, matching Adept's shape at the same tier. It carried +2 to
      // three skills AND a working, which made it the only sensible
      // tier-2 glove and quietly deleted the choice.
      E({ kind: 'skill', skill: 'mining', amount: 1 }),
      E({ kind: 'skill', skill: 'woodcutting', amount: 1 }),
      E({ kind: 'skill', skill: 'fishing', amount: 1 }),
      E({
        // Same law as Good Footing: harvests counted, never rolled.
        // Every seventh, a shade under the old 15% per gather.
        kind: 'proc', id: 'good_seam', name: 'Good Seam',
        trigger: { on: 'stacks', per: 'gather', count: 7 },
        action: { do: 'yield', extra: 1 },
        icd: 60,
      }),
    ],
    desc: 'Hands that have done this before, lent to hands that are learning.',
  },
  {
    id: 'masters_grip', name: "Master's Grip", prefix: 'Masterful', tier: 3, slot: 'gloves',
    element: 'arcane', level: 46,
    effects: [
      E({ kind: 'skill', skill: 'onehand', amount: 2 }),
      E({ kind: 'skill', skill: 'twohand', amount: 2 }),
      E({ kind: 'skill', skill: 'archery', amount: 2 }),
      E({ kind: 'skill', skill: 'arx', amount: 2 }),
    ],
    desc: 'Whatever you pick up, the hands have already met one of those.',
  },
  {
    id: 'bloodletters_grip', name: "Bloodletter's Grip", prefix: 'Bloodletting', tier: 3, slot: 'gloves',
    element: 'blood', level: 50,
    effects: [
      E({ kind: 'crit', pct: 4 }),
      E({
        kind: 'proc', id: 'bloodletting', name: 'Bloodletting',
        trigger: { on: 'stacks', per: 'crit', count: 4 },
        action: { do: 'status', status: 'bleed', power: 3, ticks: 90 },
        icd: 100,
      }),
    ],
    desc: 'The fourth clean hit opens something that does not close on its own.',
  },
  {
    id: 'reapers_grip', name: "Reaper's Grip", prefix: 'Reaping', tier: 4, slot: 'gloves',
    element: 'blood', level: 64,
    effects: [
      E({ kind: 'crit', pct: 5 }),
      E({
        kind: 'proc', id: 'toll_taken', name: 'Toll Taken',
        trigger: { on: 'stacks', per: 'hit', count: 10 },
        action: { do: 'heal', amount: 22 },
        icd: 120,
      }),
    ],
    desc: 'It counts to ten and takes its fee out of somebody else.',
  },
  {
    id: 'godhands', name: 'Sovereign Grip', prefix: 'Sovereign', tier: 5, slot: 'gloves',
    element: 'radiant', level: 90,
    effects: [
      E({ kind: 'skill', skill: 'onehand', amount: 3 }),
      E({ kind: 'skill', skill: 'twohand', amount: 3 }),
      E({ kind: 'skill', skill: 'archery', amount: 3 }),
      E({ kind: 'skill', skill: 'arx', amount: 3 }),
      E({ kind: 'crit', pct: 6 }),
      E({
        kind: 'proc', id: 'perfect_form', name: 'Perfect Form',
        trigger: { on: 'stacks', per: 'crit', count: 3 },
        action: { do: 'surge', stat: 'damage', pct: 22, ticks: 90 },
        icd: 180,
      }),
    ],
    desc: 'Three in a row and the hands stop consulting you about the fourth.',
  },

  // --------------------------------------------------------- offhand
  {
    id: 'mending_rune', name: 'Mending Rune', prefix: 'Mending', tier: 1, slot: 'offhand',
    element: 'verdant', level: 10,
    effects: [E({ kind: 'regen', amount: 1 })],
    desc: 'A slow green mark that thinks wounds are untidy.',
  },
  {
    id: 'thorn_rune', name: 'Thorn Rune', prefix: 'Thorned', tier: 2, slot: 'offhand',
    element: 'verdant', level: 32,
    effects: [E({ kind: 'thorns', amount: 2 }), E({ kind: 'armor', amount: 2 })],
    desc: 'Whatever comes at this hand gets a little of itself back.',
  },
  {
    id: 'wardens_rune', name: "Warden's Rune", prefix: 'Wardenly', tier: 3, slot: 'offhand',
    element: 'frost', level: 48,
    effects: [
      E({ kind: 'armor', amount: 5 }),
      E({
        kind: 'proc', id: 'held_line', name: 'Held Line',
        trigger: { on: 'block' },
        action: { do: 'ward', absorb: 20, ticks: 100 },
        icd: 240,
      }),
    ],
    desc: 'A blow turned is not a blow survived. It is a blow you learned from.',
  },
  {
    id: 'sentinels_rune', name: "Sentinel's Rune", prefix: 'Sentinel', tier: 4, slot: 'offhand',
    element: 'radiant', level: 64,
    effects: [
      E({ kind: 'armor', amount: 7 }),
      E({ kind: 'maxHp', amount: 8 }),
      E({
        kind: 'proc', id: 'answering_light', name: 'Answering Light',
        trigger: { on: 'block' },
        action: { do: 'nova', damage: 12, radius: 2.4 },
        icd: 120,
      }),
    ],
    desc: 'It does not simply stop things. It has something to say about them.',
  },
  {
    id: 'bastion_rune', name: 'Bastion Rune', prefix: 'Bastion', tier: 5, slot: 'offhand',
    element: 'arcane', level: 90,
    effects: [
      E({ kind: 'armor', amount: 10 }),
      E({ kind: 'maxHp', amount: 20 }),
      E({ kind: 'thorns', amount: 2 }),
      E({
        kind: 'proc', id: 'bastion', name: 'Bastion',
        trigger: { on: 'stacks', per: 'block', count: 4 },
        action: { do: 'ward', absorb: 100, ticks: 220 },
        icd: 400,
      }),
    ],
    desc: 'Four turned in a row and the sigil decides the wall is the point.',
  },
];

export const ENCHANTS = new Map<string, EnchantDef>();
/**
 * Every proc shape seen at load, by id. Sharing an id is LEGAL and
 * meaningful (one rest timer, one meter across a matched set), but two
 * workings that share an id must be the same working — otherwise the
 * timer they share is silently arbitrating between two different
 * effects. Checked at load so it can never reach a player. Native
 * gear-def procs register into the SAME ledger (items.ts), because the
 * runtime keys their timers from the same id space.
 */
const PROC_SHAPES = new Map<string, string>();

/**
 * A working's identity for the ONE-ID law. `icd` is part of the shape
 * on purpose: two same-id workings differing only in their rest would
 * share one timer arbitrating two different rest laws, which is the
 * exact drift the ledger exists to catch.
 */
export function procShape(fx: ProcEffect): string {
  return JSON.stringify([fx.name, fx.trigger, fx.action, fx.icd]);
}

/**
 * Why this working would be rejected at load, or null if it is sound.
 * One helper, two callers: the enchant roster below, and the item
 * registry (items.ts) for NATIVE def.gear.effects procs — a proc baked
 * into a chase item obeys every law a bonded one does.
 */
export function procLoadFault(fx: ProcEffect, slot: GearSlot): string | null {
  if (fx.icd <= 0) return 'must rest: icd > 0';
  const bad = procMismatch(fx);
  if (bad) return `can never fire: ${bad}`;
  // A strike-triggered working on a piece that never lands a blow is
  // the other unfirable pairing: hit/crit/cadence resolve from the
  // WEAPON INSTANCE, so a glove or a helm carrying one is silent.
  if (isStrikeTrigger(fx.trigger.on) && slot !== 'weapon' && slot !== 'offhand') {
    return `triggers on '${fx.trigger.on}', which only steel can answer`;
  }
  return null;
}

/** Run every load guard on one proc and enter it in the ONE-ID ledger. */
export function registerProc(fx: ProcEffect, slot: GearSlot, owner: string): void {
  const fault = procLoadFault(fx, slot);
  if (fault) throw new Error(`proc ${fx.id} (${owner}) ${fault}`);
  const shape = procShape(fx);
  const seen = PROC_SHAPES.get(fx.id);
  if (seen !== undefined && seen !== shape) {
    throw new Error(`proc id ${fx.id} carries two different workings`);
  }
  PROC_SHAPES.set(fx.id, shape);
}

for (const e of ENCHANT_DEFS) {
  if (ENCHANTS.has(e.id)) throw new Error(`duplicate enchant id: ${e.id}`);
  if (e.effects.length === 0) throw new Error(`enchant ${e.id} has no effects`);
  const band = TIER_BANDS[e.tier];
  if (e.level < band.lo || e.level > band.hi) {
    throw new Error(
      `enchant ${e.id} is tier ${e.tier} at level ${e.level}, outside ${band.lo}-${band.hi}`,
    );
  }
  for (const fx of e.effects) {
    if (fx.kind !== 'proc') continue;
    registerProc(fx, e.slot, e.id);
  }
  ENCHANTS.set(e.id, e);
}

export function enchantDef(id: string | undefined): EnchantDef | undefined {
  return id ? ENCHANTS.get(id) : undefined;
}

/** Reagent theme per element: the essence a scroll of that element needs. */
/**
 * The essence a scroll of each school needs. Every school but arcane
 * has one of its own now; arcane runs on dust alone, because arcane IS
 * the dust.
 *
 * Void used to borrow `gloomsilk_thread` and radiant `sunflower` —
 * a tailoring material and a farm crop pressed into service because
 * neither school had anything else. Both schools now have their own
 * essence, and both of those items keep every other use they had.
 */
export const ELEMENT_REAGENT: Partial<Record<ArxElement, string>> = {
  ember: 'ember_essence',
  frost: 'frost_essence',
  storm: 'storm_essence',
  verdant: 'verdant_essence',
  blood: 'crimson_essence',
  void: 'umbral_essence',
  radiant: 'radiant_essence',
  astral: 'astral_essence',
  // arcane runs on dust alone.
};

/**
 * Tier-3 capstone reagent: the element's gem, or gold for the rest.
 *
 * Deliberately NOT filled out for the other five schools. These four
 * gems are the battlestaff swap stones (GEM_BATTLESTAFFS), so minting
 * a voidglass or a starstone would put a gem in the world that looks
 * exactly like a socketing stone and cannot socket anything. The gap is
 * the honest reading: four schools have staves, and those four schools
 * have gems. Everyone else pays the capstone in gold.
 */
export const ELEMENT_GEM: Partial<Record<ArxElement, string>> = {
  ember: 'emberstone',
  frost: 'frostshard',
  storm: 'stormpearl',
  verdant: 'bloomstone',
};

/** Identity hex per element — scroll items, card rows, loot labels. */
export const ELEMENT_COLORS: Record<ArxElement, string> = {
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

/** Ticks to a spoken duration. The sim runs at 20 ticks a second. */
function secs(ticks: number): string {
  const s = ticks / 20;
  return `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
}

function pct(frac: number): string {
  return `${Math.round(frac * 100)}%`;
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const STACK_WORD: Record<StackSource, string> = {
  hit: 'landed blows',
  crit: 'critical strikes',
  hurt: 'wounds taken',
  block: 'blows turned',
  cast: 'abilities fired',
  kill: 'kills',
  gather: 'harvests',
};

/** The moment a working waits for, as a phrase that follows "on". */
export function describeTrigger(t: EnchantTrigger): string {
  switch (t.on) {
    case 'hit':
      return `${pct(t.chance)} of landed blows`;
    case 'hitState':
      return `${pct(t.chance)} of blows on a ${t.status} ridden foe`;
    case 'crit':
      return 'a critical strike';
    case 'kill':
      return 'a kill';
    case 'hurt':
      return `${pct(t.chance)} of wounds taken`;
    case 'block':
      return 'a blow your shield turns';
    case 'cast':
      return 'an ability fired';
    case 'lowHp':
      return `falling below ${pct(t.pct)} health`;
    case 'cadence':
      return `every ${ordinal(t.every)} landed strike`;
    case 'stacks':
      return `every ${t.count} ${STACK_WORD[t.per]}`;
    case 'gather':
      return `${pct(t.chance)} of harvests`;
    case 'stride':
      return `every ${t.tiles} tiles run`;
  }
}

/** What the working does when it wakes, as a noun phrase. */
export function describeAction(a: ProcAction): string {
  switch (a.do) {
    case 'status':
      return `${a.status} on the foe for ${secs(a.ticks)}`;
    case 'nova':
      return `a burst of ${a.damage} to everything within ${a.radius} tiles`;
    case 'bolt':
      return `a mote into the foe for ${a.damage}`;
    case 'chain':
      return `${a.damage} damage walking to ${a.jumps} more foes`;
    case 'ward':
      return `a shell that eats ${a.absorb} damage for ${secs(a.ticks)}`;
    case 'heal':
      return `${a.amount} health closed`;
    case 'surge':
      // The card owes the player the server's own units: armor and
      // regen surges resolve FLAT (+pct armor, +pct health every 4s),
      // so printing them as percentages would be a polite lie.
      if (a.stat === 'armor') return `+${a.pct} armor for ${secs(a.ticks)}`;
      if (a.stat === 'regen') return `+${a.pct} health every 4s for ${secs(a.ticks)}`;
      return `+${a.pct}% ${a.stat} for ${secs(a.ticks)}`;
    case 'cleanse':
      return 'every status on you stripped';
    case 'yield':
      return `+${a.extra} to the basket`;
    case 'reveal':
      return `nearby ${a.of === 'node' ? 'ore and growth' : a.of === 'chest' ? 'caches' : 'foes'} marked within ${a.radius} tiles`;
  }
}

/** One-line human reading of an effect — cards, scroll tooltips. */
export function describeEffect(fx: EnchantEffect): string {
  switch (fx.kind) {
    case 'proc':
      return `${fx.name}: on ${describeTrigger(fx.trigger)}, ${describeAction(fx.action)}`;
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
      // ASCII hyphen-minus on purpose: U+2212 MINUS SIGN reads as an
      // en dash on a card and slips past the dash-ban regex.
      return `-${fx.pct}% ability cooldowns`;
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
    case 'vsState':
      return `${fx.status} ridden foes take ${fx.pct}% more from you`;
  }
}

// ------------------------------------------------ THE ENCHANTER'S HAND

/**
 * How well a working was done, and why it matters.
 *
 * Before this, a level-12 enchanter and a level-96 enchanter inscribed
 * the identical scroll. Nothing about the craftsman survived into the
 * craft, so there was no reason to seek out a master and no market
 * above the recipe floor. Quality is the fix: it is the maker's mark,
 * and it rides the scroll into whatever it is bonded to.
 *
 * THE MEASURE IS MASTERY, NOT LEVEL. What counts is how far past the
 * work's own requirement the hand sits, so a level-99 enchanter turning
 * out entry scrolls runs them perfectly, and that same enchanter's
 * first masterwork at exactly level 80 comes out honest but plain. An
 * absolute-level measure would have made the whole low band worthless
 * to a master and unreachable to everyone else.
 */
export const QUALITY_AT_REQUIREMENT = 90;
/** Quality gained per level of mastery past the requirement. */
export const QUALITY_PER_LEVEL = 0.8;

export function inscriptionQuality(skillLevel: number, recipeLevel: number, bonus = 0): number {
  const mastery = Math.max(0, skillLevel - recipeLevel);
  const raw = QUALITY_AT_REQUIREMENT + mastery * QUALITY_PER_LEVEL + bonus;
  return Math.max(QUALITY_FLOOR, Math.min(QUALITY_CEIL, Math.round(raw)));
}

/** The band a quality sits in, for cards and bench copy. */
export function qualityWord(q: number): string {
  if (q >= 112) return 'masterwork';
  if (q >= 105) return 'fine';
  if (q >= 96) return 'true';
  if (q >= QUALITY_AT_REQUIREMENT) return 'honest';
  return 'rough';
}

/**
 * RESONANCE. A piece that already carries a working of the same school
 * accepts another of that school gladly; a different school has to be
 * argued into the same steel, and the working lands weaker for it.
 *
 * This is a CHOICE WITH A SHAPE, not a dice roll. Nothing is ever
 * destroyed and no materials are ever eaten by bad luck: the player can
 * take the discord knowingly, or sunder the old working first and bond
 * onto bare steel. Fail-and-lose-your-reagents is a rage mechanic and
 * this system will not have one.
 */
export const RESONANCE_BONUS = 6;
export const DISCORD_PENALTY = 8;

export function resonanceShift(
  incoming: ArxElement,
  standing: ArxElement | undefined,
): number {
  if (!standing) return 0;
  return standing === incoming ? RESONANCE_BONUS : -DISCORD_PENALTY;
}

/**
 * Quality scales MAGNITUDE and never TIMING. A finer inscription sits
 * deeper in the steel; it does not make a working wake more often, rest
 * less, or reach further. Chances, cooldowns, durations, radii and jump
 * counts are all authored balance and stay exactly where the designer
 * put them, which keeps a masterwork a stronger version of the working
 * rather than a different one.
 */
function scaleN(v: number, q: number): number {
  const out = (v * q) / 100;
  // Anything authored as a whole number stays whole, and never rounds
  // away to nothing: a +1 that became +0 would read as a broken item.
  return Number.isInteger(v) ? Math.max(v > 0 ? 1 : v, Math.round(out)) : Math.round(out * 100) / 100;
}

/**
 * QUALITY IS FELT WHERE THERE IS SOMETHING TO FEEL IT IN, and this is a
 * deliberate consequence rather than an oversight. A +/-15% band around
 * a whole number of 1, 2 or 3 rounds back to itself, so a small working
 * reads the same at every quality while a Worldheart's +45 maxHp or a
 * Sunlance's 26-damage bolt move properly.
 *
 * The alternative was biasing the rounding so 110% of 3 became 4, which
 * turns every small working into a coin flip worth 33% of its own
 * strength. A +1 is a +1; craftsmanship shows on work that has room to
 * show it. The card prints the percentage either way, so nothing is
 * hidden from the player.
 */

function scaleAction(a: ProcAction, q: number): ProcAction {
  switch (a.do) {
    case 'status':
      return { ...a, power: scaleN(a.power, q) };
    case 'nova':
      return { ...a, damage: scaleN(a.damage, q) };
    case 'bolt':
      return { ...a, damage: scaleN(a.damage, q) };
    case 'chain':
      return { ...a, damage: scaleN(a.damage, q) };
    case 'ward':
      return { ...a, absorb: scaleN(a.absorb, q) };
    case 'heal':
      return { ...a, amount: scaleN(a.amount, q) };
    case 'surge':
      return { ...a, pct: scaleN(a.pct, q) };
    // A yield working hands over whole objects and a reveal marks whole
    // things; there is no fraction of either to scale.
    case 'cleanse':
    case 'yield':
    case 'reveal':
      return a;
  }
}

export function scaleEffect(fx: EnchantEffect, q: number): EnchantEffect {
  if (q === QUALITY_BASE) return fx;
  switch (fx.kind) {
    case 'skill':
    case 'maxHp':
    case 'regen':
    case 'armor':
    case 'thorns':
      return { ...fx, amount: scaleN(fx.amount, q) };
    case 'styleDmg':
    case 'elementDmg':
    case 'cooldown':
    case 'speed':
    case 'crit':
    case 'vsState':
      return { ...fx, pct: scaleN(fx.pct, q) };
    case 'onKillHaste':
      return { ...fx, ticks: scaleN(fx.ticks, q) };
    case 'lifesteal':
      return { ...fx, frac: scaleN(fx.frac, q) };
    case 'backstab':
      return { ...fx, bonus: scaleN(fx.bonus, q) };
    case 'onHitStatus':
      // Power only. The chance a coated edge catches is balance, not
      // craftsmanship.
      return { ...fx, power: scaleN(fx.power, q) };
    case 'proc':
      return { ...fx, action: scaleAction(fx.action, q) };
  }
}

/** Effects granted by an instance = native gear effects + its enchant. */
// ----------------------------------------------------- THE DEEPENING

/**
 * THE DEEPENING — the customization ceiling, and the one law that makes
 * it possible.
 *
 * A deepened piece holds TWO workings: its WARD and its ART.
 *   - the ward is any working at all, and it is what an ordinary piece
 *     has always carried;
 *   - **the art must be a working that DOES something** — one that
 *     carries a proc.
 *
 * That restriction is not a balance dial, it is what lets the feature
 * exist at all. THE WORN LIGHT gives every slot exactly ONE continuous
 * channel (the brow, the weave, the knuckles, the trail), because eight
 * slots each glowing their own way is the difference between a
 * character you can read and a lit blob. Two passive workings on one
 * piece would mean a second working that is mechanically live and
 * visually silent, and this epic exists on the premise that an
 * enchantment you cannot see is a spreadsheet entry.
 *
 * A proc has no continuous channel. It lives in the EVENT layer: it
 * announces itself by firing, with its own name and its own
 * action-shaped moment. So the ward keeps the slot's channel, the art
 * speaks when it wakes, and nothing has to share.
 *
 * It also keeps the rest of the system unambiguous. RESONANCE reads the
 * ward, because the ward is the piece's school. SUNDERING names a seat.
 * Neither had to grow a "which one?" question.
 */
export function carriesProc(ench: string | undefined): boolean {
  return enchantDef(ench)?.effects.some((fx) => fx.kind === 'proc') ?? false;
}

/** Rarity a piece must reach before it can be opened to a second seat. */
export const DEEPEN_MIN_RARITY: RarityTier = 'epic';

/** Which seat a working takes on a piece, or why it cannot take one. */
export function seatFor(
  roll: ItemRoll | undefined,
  incoming: string,
): 'ward' | 'art' | null {
  if (!enchantDef(incoming)) return null;
  // Only a deepened piece has an art seat, and only a working that
  // does something may sit in it.
  if (roll?.deep && carriesProc(incoming)) return 'art';
  return 'ward';
}

/**
 * Effects granted by an instance: the def's own native effects, plus
 * its ward, plus its art. Takes the whole ROLL rather than loose
 * fields, so a piece's full identity travels as one thing and no caller
 * can read half of it by accident.
 */
export function instanceEffects(
  nativeEffects: EnchantEffect[] | undefined,
  roll: ItemRoll | undefined,
): EnchantEffect[] {
  const ward = bondedEffects(roll?.ench, roll?.q);
  const art = roll?.ench2 ? bondedEffects(roll.ench2, roll.q2) : [];
  if (ward.length === 0 && art.length === 0) return nativeEffects ?? [];
  return nativeEffects ? [...nativeEffects, ...ward, ...art] : [...ward, ...art];
}

/**
 * One bonded working's effects, at the strength it was inscribed at.
 * Quality scales the ENCHANT's effects only: a def's native effects are
 * the item's own identity and no enchanter's hand touches them.
 */
export function bondedEffects(ench: string | undefined, quality = QUALITY_BASE): EnchantEffect[] {
  const e = enchantDef(ench);
  if (!e) return [];
  return e.effects.map((fx0) => {
    const fx = scaleEffect(fx0, quality);
    // A proc inherits its carrier's element unless it names its own —
    // so an ember edge's working burns ember without saying so twice.
    return fx.kind === 'proc' && fx.element === undefined ? { ...fx, element: e.element } : fx;
  });
}

// ------------------------------------------------ the working's own clock

/**
 * One working's live state. Held per player, keyed by proc id, and
 * in-memory only: a charge half-built and a timer half-spent are facts
 * about THIS fight, not about the character.
 */
export interface ProcRuntime {
  /** Tick before which the working is still resting. */
  restUntil: number;
  /** Charge built so far (stacks triggers). */
  stacks: number;
  /** Landed strikes counted so far (cadence triggers). */
  strikes: number;
  /** Tiles covered so far (stride triggers). */
  tiles: number;
  /**
   * lowHp only: ready to answer a crossing. Cleared when the working
   * fires, set again when the wearer climbs back over the line, so one
   * dive past the mark is one answer however many blows carried it.
   */
  armed: boolean;
}

export function mkProcRuntime(): ProcRuntime {
  return { restUntil: 0, stacks: 0, strikes: 0, tiles: 0, armed: true };
}

/** The moments that can be offered to a working through procWakes. */
export type ProcMoment = StackSource | 'gather';

/**
 * THE ARBITRATION, kept pure so it can be reasoned about and pinned.
 * Given a working, its live state, the moment that just happened, and
 * the clock, decide whether it wakes. Mutates the state's counters,
 * because the tally IS the state.
 *
 * Two orderings matter and are deliberate:
 *
 *  - COUNTERS ADVANCE WHILE THE WORKING RESTS. A cadence or a stack
 *    keeps an honest tally through the rest, so the charge is banked
 *    rather than lost and the working answers on the first moment
 *    after it wakes. A meter that silently dropped its count during
 *    the rest would read to a player as the game eating their hits.
 *
 *  - CHANCE IS NOT ROLLED WHILE IT RESTS. Spending a roll that a
 *    resting working could never have answered would quietly push
 *    every published proc rate below what its card promises.
 *
 * `roll` is injected so the law is testable without stubbing global
 * randomness.
 */
export function procWakes(
  p: ProcEffect,
  st: ProcRuntime,
  on: ProcMoment,
  tick: number,
  roll: () => number = Math.random,
): boolean {
  const t = p.trigger;
  // A stacking working listens for its OWN source moment rather than
  // for its name; a cadence counts landed strikes, so it listens for
  // the hit. Everything else answers to the moment it is named after.
  // hitState listens for the HIT moment too: the state check is the
  // door's (server-side, target in hand), never the arbitration's.
  const listens =
    t.on === 'stacks'
      ? t.per === on
      : t.on === 'cadence' || t.on === 'hitState'
        ? on === 'hit'
        : t.on === on;
  if (!listens) return false;
  const resting = tick < st.restUntil;

  switch (t.on) {
    case 'cadence':
      if (++st.strikes < t.every) return false;
      if (resting) return false; // the charge waits; it is never spent unheard
      st.strikes = 0;
      break;
    case 'stacks':
      if (++st.stacks < t.count) return false;
      if (resting) return false;
      st.stacks = 0;
      break;
    case 'hit':
    case 'hitState':
    case 'hurt':
    case 'gather':
      if (resting || roll() >= t.chance) return false;
      break;
    default:
      if (resting) return false;
      break;
  }
  st.restUntil = tick + p.icd;
  return true;
}

/**
 * Add a proc to a list, keeping ONE entry per proc id. Two pieces
 * carrying the same working share a rest timer and a meter, so a
 * matched set must not fire it five times over — the fold has to
 * collapse them at the gathering point, not at the firing point.
 */
export function addProc(out: ProcEffect[], fx: ProcEffect): void {
  if (out.some((p) => p.id === fx.id)) return;
  out.push(fx);
}

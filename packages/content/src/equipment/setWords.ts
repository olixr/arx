/**
 * THE HOUSE WORD — set bonuses (buildcraft Phase 3).
 *
 * A five piece armor family speaks at 2 and at 4 worn pieces,
 * cumulatively: the 2pc line is a flat stat sentence (boring on
 * purpose), the 4pc word is the family's BEHAVIOR — a proc, a
 * vs-state clause, or an on-hit affliction. The free fifth slot is
 * design: an off piece, or a second family's 2pc, always fits.
 *
 * The laws (buildcraft plan Part 1, pinned in setWords.test.ts):
 *
 * - THE SET IS WORTH ONE EXTRA ITEM. 2pc prices ~2-3% throughput
 *   equivalent, 4pc ~5-7%, the full set never past 12%. A word must
 *   make a build, not outbid the slots it rides.
 * - BEHAVIOR OVER NUMBERS. Every 4pc word carries at least one
 *   behavioral effect (proc, vsState, onHitStatus). Bare percentages
 *   live in 2pc lines and affixes.
 * - Words fold through the SAME vocabulary and laws as enchants:
 *   procs dedupe by id (ONE ID, ONE TIMER), vsState folds highest
 *   wins, and word procs use BODY triggers only — the strike channel
 *   belongs to the steel that landed, and a set is worn, not swung.
 *   `lifesteal`/`backstab` are strike-only kinds and refused here.
 * - A word's onHitStatus rides the WORN aggregate (the Envenom stance
 *   pattern): every landed basic carries it, whichever blade landed.
 *   It must never fold through foldEffect (a weapon's own native
 *   onHitStatus already rides the strike channel; folding both would
 *   double-apply) — aggregateGearStats routes it to `wordOnHit`.
 * - Early wardrobes have NO words. Identity starts where the chase
 *   starts; the craft lane keeps its edge through the craft-only
 *   themed families (wayfarer, drakescale, stagheart, hedgemage,
 *   cindersworn, starweaver) speaking words like any drop set.
 */
import type { EnchantEffect } from './enchants.js';

export interface SetWord {
  /** Worn pieces of the family that wake this word. */
  pieces: 2 | 4;
  /** The word's spoken name (the card's line lead). */
  name: string;
  /** One printed sentence — the tooltip law. */
  desc: string;
  effects: EnchantEffect[];
}

/** Effect kinds a word may never carry (strike-channel exclusives). */
export const WORD_FORBIDDEN_KINDS: readonly EnchantEffect['kind'][] = [
  'lifesteal',
  'backstab',
];

const W = (pieces: 2 | 4, name: string, desc: string, ...effects: EnchantEffect[]): SetWord => ({
  pieces,
  name,
  desc,
  effects,
});

/**
 * The roster: 35 chase families + 17 themed families. Keys are the
 * `set` ids stamped in defs.ts; a stamped set without words (or words
 * without a stamped set) fails the coverage test. Wave one shipped
 * 31 + 15; THE WORN BOOK added four hunted houses and two craft-only
 * ones, and with them the game's first pet, fishing and crafting
 * words.
 */
export const SET_WORDS: Record<string, SetWord[]> = {
  // ================================================ themed plate
  warden: [
    W(2, 'The Grown Guard', '+1 foraging and +1 farming.',
      { kind: 'skill', skill: 'foraging', amount: 1 },
      { kind: 'skill', skill: 'farming', amount: 1 }),
    W(4, 'The Eighth Furrow', 'Every eighth harvest adds one to the basket.',
      { kind: 'proc', id: 'word_warden_furrow', name: 'The Eighth Furrow',
        trigger: { on: 'stacks', per: 'gather', count: 8 },
        action: { do: 'yield', extra: 1 }, icd: 40, element: 'verdant' }),
  ],
  frostplate: [
    W(2, 'Cold Temper', '+3% arx damage.',
      { kind: 'styleDmg', style: 'arx', pct: 3 }),
    W(4, 'The Cold Answers', 'A fifth of wounds taken chill the striker.',
      { kind: 'proc', id: 'word_frostplate_answer', name: 'The Cold Answers',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'status', status: 'chill', power: 0, ticks: 60 }, icd: 200,
        element: 'frost' }),
  ],
  bulwark: [
    W(2, 'Thick Iron', '+3 armor.',
      { kind: 'armor', amount: 3 }),
    W(4, 'The Standing Line', 'A turned blow raises a small ward.',
      { kind: 'proc', id: 'word_bulwark_line', name: 'The Standing Line',
        trigger: { on: 'block' },
        action: { do: 'ward', absorb: 8, ticks: 100 }, icd: 300 }),
  ],
  dreadforge: [
    W(2, 'Dread Edge', '+2% critical chance.',
      { kind: 'crit', pct: 2 }),
    W(4, 'The Dread Feeds', 'Bleeding foes take 25% more from you.',
      { kind: 'vsState', status: 'bleed', pct: 25 }),
  ],
  sunforged: [
    W(2, 'Gilded Health', '+20 max HP.',
      { kind: 'maxHp', amount: 20 }),
    W(4, 'A Small Sunrise', 'Each felled foe lifts your damage briefly.',
      { kind: 'proc', id: 'word_sunforged_dawn', name: 'A Small Sunrise',
        trigger: { on: 'kill' },
        action: { do: 'surge', stat: 'damage', pct: 8, ticks: 60 }, icd: 200,
        element: 'radiant' }),
  ],
  // ================================================ themed leather
  wayfarer: [
    W(2, 'Road Legs', '+2% move speed.',
      { kind: 'speed', pct: 2 }),
    W(4, 'The Long Stride', 'Every forty tiles on foot quicken the next few steps.',
      { kind: 'proc', id: 'word_wayfarer_stride', name: 'The Long Stride',
        trigger: { on: 'stride', tiles: 40 },
        action: { do: 'surge', stat: 'speed', pct: 10, ticks: 60 }, icd: 200 }),
  ],
  wolfstalker: [
    W(2, 'Pack Sense', '+3% archery damage.',
      { kind: 'styleDmg', style: 'archery', pct: 3 }),
    W(4, 'The Pack Tears', 'Your basics sometimes open a bleed.',
      { kind: 'onHitStatus', status: 'bleed', power: 2, durationTicks: 100, chance: 0.15 }),
  ],
  nightveil: [
    W(2, 'Quiet Cloth', '+2 sneak.',
      { kind: 'skill', skill: 'sneak', amount: 2 }),
    W(4, 'The Poisoned Seam', 'Venomed foes take 25% more from you.',
      { kind: 'vsState', status: 'venom', pct: 25 }),
  ],
  drakescale: [
    W(2, 'Scale Guard', '+2 armor.',
      { kind: 'armor', amount: 2 }),
    W(4, 'Scales Still Hot', 'Your basics sometimes set the foe burning.',
      { kind: 'onHitStatus', status: 'burn', power: 2, durationTicks: 80, chance: 0.15 }),
  ],
  stagheart: [
    W(2, 'Heartwood', '+25 max HP.',
      { kind: 'maxHp', amount: 25 }),
    W(4, 'The Forest Mends Its King', 'Falling low calls a healing from the wood.',
      { kind: 'proc', id: 'word_stagheart_crown', name: 'The Forest Mends Its King',
        trigger: { on: 'lowHp', pct: 0.4 },
        action: { do: 'heal', amount: 12 }, icd: 1000, element: 'verdant' }),
  ],
  // ================================================ themed cloth
  hedgemage: [
    W(2, 'Garden Hands', '+2 herbalism.',
      { kind: 'skill', skill: 'herbalism', amount: 2 }),
    W(4, 'The Fifth Working Blooms', 'Every fifth cast closes a little of your wounds.',
      { kind: 'proc', id: 'word_hedgemage_bloom', name: 'The Fifth Working Blooms',
        trigger: { on: 'stacks', per: 'cast', count: 5 },
        action: { do: 'heal', amount: 6 }, icd: 100, element: 'verdant' }),
  ],
  tidecaller: [
    W(2, 'Sea Voice', '+4% frost damage.',
      { kind: 'elementDmg', element: 'frost', pct: 4 }),
    W(4, 'The Eighth Wave', 'Every eighth landed blow drags the foe into a chill.',
      { kind: 'proc', id: 'word_tidecaller_undertow', name: 'The Eighth Wave',
        trigger: { on: 'stacks', per: 'hit', count: 8 },
        action: { do: 'status', status: 'chill', power: 0, ticks: 50 }, icd: 120,
        element: 'frost' }),
  ],
  voidwhisper: [
    W(2, 'Absent Weight', 'Ability cooldowns 3% shorter.',
      { kind: 'cooldown', pct: 3 }),
    W(4, 'The Name Taken Away', 'A quarter of wounds taken whisper your ailments gone.',
      { kind: 'proc', id: 'word_voidwhisper_hush', name: 'The Name Taken Away',
        trigger: { on: 'hurt', chance: 0.25 },
        action: { do: 'cleanse' }, icd: 400, element: 'void' }),
  ],
  cindersworn: [
    W(2, 'Sworn Ember', '+4% ember damage.',
      { kind: 'elementDmg', element: 'ember', pct: 4 }),
    W(4, 'Fire Keeps Its Oath', 'Burning foes take 25% more from you.',
      { kind: 'vsState', status: 'burn', pct: 25 }),
  ],
  starweaver: [
    W(2, 'Woven Focus', '+2 arx.',
      { kind: 'skill', skill: 'arx', amount: 2 }),
    W(4, 'The Stitched Orbit', 'Casting flares the woven stars around you.',
      { kind: 'proc', id: 'word_starweaver_orbit', name: 'The Stitched Orbit',
        trigger: { on: 'cast' },
        action: { do: 'nova', damage: 5, radius: 2 }, icd: 120, element: 'astral' }),
  ],
  // ================================================ chase cloth
  moonbell: [
    W(2, 'Meadow Learning', '+2 herbalism.',
      { kind: 'skill', skill: 'herbalism', amount: 2 }),
    W(4, 'What Poisons the Fen', 'Venomed foes take 30% more from you.',
      { kind: 'vsState', status: 'venom', pct: 30 }),
  ],
  riftweave: [
    W(2, 'Cut From Between', 'Ability cooldowns 4% shorter.',
      { kind: 'cooldown', pct: 4 }),
    W(4, 'A Step Through the Dark', 'A fifth of wounds taken open a burst of speed.',
      { kind: 'proc', id: 'word_riftweave_step', name: 'A Step Through the Dark',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'surge', stat: 'speed', pct: 15, ticks: 40 }, icd: 300,
        element: 'void' }),
  ],
  wintercourt: [
    W(2, 'Glacial Silk', '+5% frost damage.',
      { kind: 'elementDmg', element: 'frost', pct: 5 }),
    W(4, 'The Court Decrees Winter', 'Every sixth cast bursts into a ring of frost.',
      { kind: 'proc', id: 'word_wintercourt_decree', name: 'The Court Decrees Winter',
        trigger: { on: 'stacks', per: 'cast', count: 6 },
        action: { do: 'nova', damage: 8, radius: 2.4 }, icd: 160, element: 'frost' }),
  ],
  vigil: [
    W(2, 'Kept Flame', '+2 regeneration.',
      { kind: 'regen', amount: 2 }),
    W(4, 'The Watch Does Not End', 'Falling low raises a lasting ward.',
      { kind: 'proc', id: 'word_vigil_flame', name: 'The Watch Does Not End',
        trigger: { on: 'lowHp', pct: 0.3 },
        action: { do: 'ward', absorb: 15, ticks: 150 }, icd: 1200, element: 'radiant' }),
  ],
  skydancer: [
    W(2, 'Light Feet', '+3% move speed.',
      { kind: 'speed', pct: 3 }),
    W(4, 'Ribbons Ahead of the Storm', 'Every thirty tiles on foot sharpen your eye.',
      { kind: 'proc', id: 'word_skydancer_ribbon', name: 'Ribbons Ahead of the Storm',
        trigger: { on: 'stride', tiles: 30 },
        action: { do: 'surge', stat: 'crit', pct: 6, ticks: 80 }, icd: 240,
        element: 'storm' }),
  ],
  orrery: [
    W(2, 'Brass Precision', 'Ability cooldowns 4% shorter.',
      { kind: 'cooldown', pct: 4 }),
    W(4, 'The Seventh Sphere', 'Every seventh cast aligns, and your damage rises.',
      { kind: 'proc', id: 'word_orrery_alignment', name: 'The Seventh Sphere',
        trigger: { on: 'stacks', per: 'cast', count: 7 },
        action: { do: 'surge', stat: 'damage', pct: 10, ticks: 60 }, icd: 200,
        element: 'astral' }),
  ],
  sunhallow: [
    W(2, 'Dawn Lit', '+2 regeneration.',
      { kind: 'regen', amount: 2 }),
    W(4, 'A Small Dawn Each Ending', 'Each felled foe closes a little of your wounds.',
      { kind: 'proc', id: 'word_sunhallow_rite', name: 'A Small Dawn Each Ending',
        trigger: { on: 'kill' },
        action: { do: 'heal', amount: 8 }, icd: 160, element: 'radiant' }),
  ],
  stormsinger: [
    W(2, 'Charged Hem', '+5% storm damage.',
      { kind: 'elementDmg', element: 'storm', pct: 5 }),
    W(4, 'The Third Verse Arcs', 'Every sixth landed blow arcs to the foes nearby.',
      { kind: 'proc', id: 'word_stormsinger_verse', name: 'The Third Verse Arcs',
        trigger: { on: 'stacks', per: 'hit', count: 6 },
        action: { do: 'chain', damage: 7, jumps: 3 }, icd: 160, element: 'storm' }),
  ],
  gloamsight: [
    W(2, 'Veiled Eye', '+2% critical chance.',
      { kind: 'crit', pct: 2 }),
    W(4, 'What the Veil Sees', 'Casting marks the foes that hide nearby.',
      { kind: 'proc', id: 'word_gloamsight_eye', name: 'What the Veil Sees',
        trigger: { on: 'cast' },
        action: { do: 'reveal', of: 'foe', radius: 8 }, icd: 300, element: 'void' }),
  ],
  flamewrought: [
    W(2, 'Read In Fire', '+5% ember damage.',
      { kind: 'elementDmg', element: 'ember', pct: 5 }),
    W(4, 'The Text Burns Hottest', 'Burning foes take 30% more from you.',
      { kind: 'vsState', status: 'burn', pct: 30 }),
  ],
  duskwarden: [
    W(2, 'Traveling Weight', '+2% move speed.',
      { kind: 'speed', pct: 2 }),
    W(4, 'The Raised Lantern', 'A fifth of wounds taken raise a warding light.',
      { kind: 'proc', id: 'word_duskwarden_lantern', name: 'The Raised Lantern',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'ward', absorb: 10, ticks: 100 }, icd: 400, element: 'radiant' }),
  ],
  aetherion: [
    W(2, 'Living Script', '+3 arx.',
      { kind: 'skill', skill: 'arx', amount: 3 }),
    W(4, 'The Ring Turns', 'Casting deepens the next moments of your work.',
      { kind: 'proc', id: 'word_aetherion_ring', name: 'The Ring Turns',
        trigger: { on: 'cast' },
        action: { do: 'surge', stat: 'damage', pct: 6, ticks: 40 }, icd: 160,
        element: 'astral' }),
  ],
  // ================================================ chase leather
  adderfang: [
    W(2, 'Fanged Draw', '+2 archery.',
      { kind: 'skill', skill: 'archery', amount: 2 }),
    W(4, 'The Fangs Still Bite', 'Your basics sometimes envenom the foe.',
      { kind: 'onHitStatus', status: 'venom', power: 2, durationTicks: 120, chance: 0.2 }),
  ],
  hartsong: [
    W(2, 'Greenwood Keeping', '+2 regeneration.',
      { kind: 'regen', amount: 2 }),
    W(4, 'The Wood Sings Back', 'Every tenth landed shot closes a little of your wounds.',
      { kind: 'proc', id: 'word_hartsong_chorus', name: 'The Wood Sings Back',
        trigger: { on: 'stacks', per: 'hit', count: 10 },
        action: { do: 'heal', amount: 8 }, icd: 200, element: 'verdant' }),
  ],
  skytalon: [
    W(2, 'Hawk Eye', '+2% critical chance.',
      { kind: 'crit', pct: 2 }),
    W(4, 'The Stoop', 'Three clean strikes and the hawk dives.',
      { kind: 'proc', id: 'word_skytalon_dive', name: 'The Stoop',
        trigger: { on: 'stacks', per: 'crit', count: 3 },
        action: { do: 'surge', stat: 'speed', pct: 20, ticks: 40 }, icd: 240,
        element: 'storm' }),
  ],
  broodsilk: [
    W(2, 'Silk Steps', '+2 sneak.',
      { kind: 'skill', skill: 'sneak', amount: 2 }),
    W(4, 'What Bites the Web', 'A quarter of wounds taken envenom the striker.',
      { kind: 'proc', id: 'word_broodsilk_bite', name: 'What Bites the Web',
        trigger: { on: 'hurt', chance: 0.25 },
        action: { do: 'status', status: 'venom', power: 2, ticks: 100 }, icd: 240,
        element: 'verdant' }),
  ],
  cindershade: [
    W(2, 'Warm Seams', '+2% critical chance.',
      { kind: 'crit', pct: 2 }),
    W(4, 'Seams That Never Cooled', 'Your basics sometimes set the foe burning.',
      { kind: 'onHitStatus', status: 'burn', power: 2, durationTicks: 80, chance: 0.15 }),
  ],
  rookfeather: [
    W(2, 'Oiled Feathers', '+2% move speed.',
      { kind: 'speed', pct: 2 }),
    W(4, 'Molt and Be Elsewhere', 'A third of wounds taken shed into a burst of speed.',
      { kind: 'proc', id: 'word_rookfeather_molt', name: 'Molt and Be Elsewhere',
        trigger: { on: 'hurt', chance: 0.3 },
        action: { do: 'surge', stat: 'speed', pct: 20, ticks: 30 }, icd: 300 }),
  ],
  // ================================================ chase plate
  aurochs: [
    W(2, 'Bull Chest', '+25 max HP.',
      { kind: 'maxHp', amount: 25 }),
    W(4, 'The Horns Answer', 'A turned blow staggers the striker.',
      { kind: 'proc', id: 'word_aurochs_horn', name: 'The Horns Answer',
        trigger: { on: 'block' },
        action: { do: 'status', status: 'shock', power: 0, ticks: 20 }, icd: 300,
        element: 'storm' }),
  ],
  barrowking: [
    W(2, 'Barrow Iron', '+3 armor.',
      { kind: 'armor', amount: 3 }),
    W(4, "The King's Answer", "A turned blow cracks the striker's guard.",
      { kind: 'proc', id: 'word_barrowking_crown', name: "The King's Answer",
        trigger: { on: 'block' },
        action: { do: 'status', status: 'sunder', power: 15, ticks: 60 }, icd: 240 }),
  ],
  stormcrown: [
    W(2, 'Slate Weight', '+2 armor.',
      { kind: 'armor', amount: 2 }),
    W(4, 'The Crown Peals', 'A fifth of wounds taken arc thunder back through the field.',
      { kind: 'proc', id: 'word_stormcrown_peal', name: 'The Crown Peals',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'chain', damage: 6, jumps: 3 }, icd: 300, element: 'storm' }),
  ],
  forgeheart: [
    W(2, 'Hot Iron', 'Attackers take 2 damage.',
      { kind: 'thorns', amount: 2 }),
    W(4, 'The Forge Roars', 'When the iron runs low, your damage climbs.',
      { kind: 'proc', id: 'word_forgeheart_vent', name: 'The Forge Roars',
        trigger: { on: 'lowHp', pct: 0.5 },
        action: { do: 'surge', stat: 'damage', pct: 12, ticks: 100 }, icd: 900,
        element: 'ember' }),
  ],
  wyrmsteel: [
    W(2, 'Sung Steel', '+20 max HP.',
      { kind: 'maxHp', amount: 20 }),
    W(4, 'Steel Sung By Fire', 'Burning foes take 25% more from you.',
      { kind: 'vsState', status: 'burn', pct: 25 }),
  ],
  oathgold: [
    W(2, 'Gold Standard', '+20 max HP.',
      { kind: 'maxHp', amount: 20 }),
    W(4, 'The Oath Holds', 'Falling low raises a champion ward.',
      { kind: 'proc', id: 'word_oathgold_vow', name: 'The Oath Holds',
        trigger: { on: 'lowHp', pct: 0.35 },
        action: { do: 'ward', absorb: 20, ticks: 150 }, icd: 1200, element: 'radiant' }),
  ],
  jadeskull: [
    W(2, 'Jade Edge', '+2% critical chance.',
      { kind: 'crit', pct: 2 }),
    W(4, 'The Eyes Brighten', 'Each felled foe sharpens your eye for a while.',
      { kind: 'proc', id: 'word_jadeskull_gaze', name: 'The Eyes Brighten',
        trigger: { on: 'kill' },
        action: { do: 'surge', stat: 'crit', pct: 8, ticks: 80 }, icd: 200 }),
  ],
  fellbone: [
    W(2, 'Fell Guard', '+2 armor.',
      { kind: 'armor', amount: 2 }),
    W(4, 'The Fells Feed', 'A wounded bearer hits harder while the hunger lasts.',
      { kind: 'proc', id: 'word_fellbone_hunger', name: 'The Fells Feed',
        trigger: { on: 'lowHp', pct: 0.5 },
        action: { do: 'surge', stat: 'damage', pct: 15, ticks: 200 }, icd: 600 }),
  ],
  redmarch: [
    W(2, 'March Order', '+2% move speed.',
      { kind: 'speed', pct: 2 }),
    W(4, 'The Gems Signal', 'A turned blow signals the counter-march.',
      { kind: 'proc', id: 'word_redmarch_signal', name: 'The Gems Signal',
        trigger: { on: 'block' },
        action: { do: 'surge', stat: 'damage', pct: 10, ticks: 60 }, icd: 300,
        element: 'ember' }),
  ],
  rimethorn: [
    W(2, 'Thorned Quench', 'Attackers take 2 damage.',
      { kind: 'thorns', amount: 2 }),
    W(4, 'The Thorns Hold Winter', 'A quarter of wounds taken chill the striker.',
      { kind: 'proc', id: 'word_rimethorn_frost', name: 'The Thorns Hold Winter',
        trigger: { on: 'hurt', chance: 0.25 },
        action: { do: 'status', status: 'chill', power: 0, ticks: 60 }, icd: 240,
        element: 'frost' }),
  ],
  palethorn: [
    W(2, 'Pale Quench', 'Attackers take 2 damage.',
      { kind: 'thorns', amount: 2 }),
    W(4, 'The Pale Cut', 'A fifth of wounds taken open a bleed on the striker.',
      { kind: 'proc', id: 'word_palethorn_cut', name: 'The Pale Cut',
        trigger: { on: 'hurt', chance: 0.2 },
        action: { do: 'status', status: 'bleed', power: 2, ticks: 100 }, icd: 240 }),
  ],
  kingsmane: [
    W(2, 'Guard Bearing', '+20 max HP.',
      { kind: 'maxHp', amount: 20 }),
    W(4, 'The Lion Answers', 'A turned blow roars into everything nearby.',
      { kind: 'proc', id: 'word_kingsmane_roar', name: 'The Lion Answers',
        trigger: { on: 'block' },
        action: { do: 'nova', damage: 7, radius: 2.5 }, icd: 300, element: 'radiant' }),
  ],
  gatefall: [
    W(2, 'Fallen Weight', '+3 armor.',
      { kind: 'armor', amount: 3 }),
    W(4, 'The Gate Falls One Way', 'Falling low raises the last wall.',
      { kind: 'proc', id: 'word_gatefall_stand', name: 'The Gate Falls One Way',
        trigger: { on: 'lowHp', pct: 0.3 },
        action: { do: 'ward', absorb: 25, ticks: 200 }, icd: 1500 }),
  ],
  // ============================================ THE WORN BOOK wave
  // Six houses opening six lanes the census proved empty: the venom
  // endgame, the archer's ceiling, melee's first set identity, the
  // pet's first gear, the fisher's first word, and the bench's.
  adderking: [
    W(2, 'The Long Coil', '+2% move speed.',
      { kind: 'speed', pct: 2 }),
    // The lane's endgame home: past 29 the venom build had no armor
    // to grow into, and the frozen-six page needs no license.
    W(4, 'What the Fangs Left', 'Venomed foes take 30% more from you.',
      { kind: 'vsState', status: 'venom', pct: 30 }),
  ],
  stormtalon: [
    W(2, 'Storm Eye', '+3% archery damage.',
      { kind: 'styleDmg', style: 'archery', pct: 3 }),
    // THE COUNT CHASE: the recorded count-model word, and the gear
    // lane's first licensed boon (statusWave GEAR_LICENSED). Quicken
    // stacks price it, and the band clamp prices the stack.
    W(4, 'The Fifth Stoop', 'Every fifth landed blow quickens your hands.',
      { kind: 'proc', id: 'word_stormtalon_stoop', name: 'The Fifth Stoop',
        trigger: { on: 'stacks', per: 'hit', count: 5 },
        action: { do: 'boon', status: 'quicken', power: 1, ticks: 100 }, icd: 300,
        element: 'storm' }),
  ],
  warvaliant: [
    W(2, 'Legion Drill', '+3% one-handed damage.',
      { kind: 'styleDmg', style: 'onehand', pct: 3 }),
    // The stateApplied trigger's armor debut: sunder is the shield
    // and sword line's own page, so the word answers the build that
    // already lays it. Frozen-six reader, no license needed.
    W(4, 'Into the Gap', 'A guard you crack lifts your damage for a while.',
      { kind: 'proc', id: 'word_warvaliant_gap', name: 'Into the Gap',
        trigger: { on: 'stateApplied', status: 'sunder' },
        action: { do: 'surge', stat: 'damage', pct: 10, ticks: 80 }, icd: 300 }),
  ],
  packlord: [
    W(2, 'Pack Tongue', '+2 beastcraft.',
      { kind: 'skill', skill: 'beastcraft', amount: 2 }),
    // THE PET LANE OPENS: the page goes to the companion through the
    // pet's own apply door, and is refused silently when none stands.
    // Licensed by container id in statusWave GEAR_LICENSED.
    W(4, 'The Pack Sets the Pace', 'Every sixth landed blow quickens your companion.',
      { kind: 'proc', id: 'word_packlord_pace', name: 'The Pack Sets the Pace',
        trigger: { on: 'stacks', per: 'hit', count: 6 },
        action: { do: 'boon', status: 'quicken', power: 1, ticks: 100, target: 'pet' }, icd: 300 }),
  ],
  weirkeeper: [
    W(2, 'Weir Sense', '+2 fishing.',
      { kind: 'skill', skill: 'fishing', amount: 2 }),
    // The warden mold spoken in the fisher's voice: a small line and
    // a real capability, counted never rolled (the doubling channel
    // belongs to the Callings).
    W(4, 'The Eighth Haul', 'Every eighth harvest comes up one heavier.',
      { kind: 'proc', id: 'word_weirkeeper_haul', name: 'The Eighth Haul',
        trigger: { on: 'stacks', per: 'gather', count: 8 },
        action: { do: 'yield', extra: 1 }, icd: 40, element: 'frost' }),
  ],
  wrightcloth: [
    W(2, 'Two Trades', '+1 smithing and +1 tailoring.',
      { kind: 'skill', skill: 'smithing', amount: 1 },
      { kind: 'skill', skill: 'tailoring', amount: 1 }),
    // THE FIRST CRAFTING WORD: the same counted rhythm, moved from
    // the field to the bench through the 'craft' StackSource.
    W(4, 'Every Eighth Working', 'Every eighth finished working comes off the bench twice.',
      { kind: 'proc', id: 'word_wrightcloth_working', name: 'Every Eighth Working',
        trigger: { on: 'stacks', per: 'craft', count: 8 },
        action: { do: 'yield', extra: 1 }, icd: 40, element: 'ember' }),
  ],
};

/** The words a set speaks, threshold order. Empty for wordless sets. */
export function setWordsFor(set: string): SetWord[] {
  return SET_WORDS[set] ?? [];
}

/**
 * THE HOUSE ANSWERS TO A NAME (visible-buildcraft V3): authored
 * display names for every worded family — never derived from the id
 * (capitalize() gave "Voidwhisper" and "Barrowking"; a house deserves
 * its spaces back). Coverage is pinned two ways in setWords.test.ts.
 */
export const SET_NAMES: Record<string, string> = {
  warden: 'Warden',
  frostplate: 'Frostplate',
  bulwark: 'Bulwark',
  dreadforge: 'Dreadforge',
  sunforged: 'Sunforged',
  wayfarer: 'Wayfarer',
  wolfstalker: 'Wolfstalker',
  nightveil: 'Nightveil',
  drakescale: 'Drakescale',
  stagheart: 'Stagheart',
  hedgemage: 'Hedgemage',
  tidecaller: 'Tidecaller',
  voidwhisper: 'Void Whisper',
  cindersworn: 'Cindersworn',
  starweaver: 'Starweaver',
  moonbell: 'Moonbell',
  riftweave: 'Riftweave',
  wintercourt: 'Winter Court',
  vigil: 'Vigil',
  skydancer: 'Skydancer',
  orrery: 'Orrery',
  sunhallow: 'Sunhallow',
  stormsinger: 'Stormsinger',
  gloamsight: 'Gloamsight',
  flamewrought: 'Flamewrought',
  duskwarden: 'Duskwarden',
  aetherion: 'Aetherion',
  adderfang: 'Adderfang',
  hartsong: 'Hartsong',
  skytalon: 'Skytalon',
  broodsilk: 'Broodsilk',
  cindershade: 'Cindershade',
  rookfeather: 'Rookfeather',
  aurochs: 'Aurochs',
  barrowking: 'Barrow King',
  stormcrown: 'Stormcrown',
  forgeheart: 'Forgeheart',
  wyrmsteel: 'Wyrmsteel',
  oathgold: 'Oathgold',
  jadeskull: 'Jadeskull',
  fellbone: 'Fellbone',
  redmarch: 'Redmarch',
  rimethorn: 'Rimethorn',
  palethorn: 'Palethorn',
  kingsmane: 'Kingsmane',
  gatefall: 'Gatefall',
  // THE WORN BOOK wave.
  adderking: 'Adderking',
  stormtalon: 'Stormtalon',
  warvaliant: 'War Valiant',
  packlord: 'Packlord',
  weirkeeper: 'Weirkeeper',
  wrightcloth: 'Wrightcloth',
};

/** A house's display name; the raw id only if it was never christened. */
export function setName(set: string): string {
  return SET_NAMES[set] ?? set;
}

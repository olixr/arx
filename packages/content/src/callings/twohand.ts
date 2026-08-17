/**
 * THE FILLED HALL — twohand's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE GREAT SCHOOL's arc: the heavy hand (5), the planted stance (10),
 * the ringing blow that holds them (15), the far edge (20), the fall
 * that opens the seam (25, LAYS sunder), the millstone (30, the first
 * damage moment), the quarryman's back (35, outward), the reaping
 * beat (40), the stone in the haft (45, the boon shelf), the loosened
 * grip (50, LAYS and READS weaken), the red rhythm (55, READS bleed,
 * outward),
 * the executioner (60), the split seam (65, READS sunder, the ladder's
 * own pair closes), the yard master (70, outward), the mountain's
 * bearing (75), and Giantsfall (80, THE MASTER'S LICENSE).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const TWOHAND_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------------ 5
  {
    id: 'hewers_shoulders',
    skill: 'twohand',
    unlockLevel: 5,
    focusCost: 1,
    name: "Hewer's Shoulders",
    desc: 'You learned the swing on timber and it shows. Greatweapon blows land heavier.',
    color: '#b57a55',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } }],
    ranks: [
      { note: 'The shoulders fill out. Greatweapon damage climbs.', effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } }] },
      { note: 'The whole back is in it now. Greatweapon damage climbs again.', effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } }] },
      {
        note: 'The hewer knows the grain. Heavier still, and the edge finds a seam more often.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 10
  {
    id: 'timber_stance',
    skill: 'twohand',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Timber Stance',
    desc: 'Feet set like a felled trunk. With a greatweapon in hand, blows glance off you.',
    color: '#8f7f6b',
    effects: [{ kind: 'when', cond: { when: 'wielding', style: 'twohand' }, grant: { name: 'Timber Stance', armor: 6 } }],
    ranks: [
      { note: 'The stance settles deeper. More armor while the greatweapon is out.', effects: [{ kind: 'when', cond: { when: 'wielding', style: 'twohand' }, grant: { name: 'Timber Stance', armor: 8 } }] },
      { note: 'Roots go down. Armor climbs and the body knits itself while you stand.', effects: [{ kind: 'when', cond: { when: 'wielding', style: 'twohand' }, grant: { name: 'Timber Stance', armor: 10, regenPer4s: 1 } }] },
      { note: 'Old growth. Armor and knitting both deepen while the greatweapon is out.', effects: [{ kind: 'when', cond: { when: 'wielding', style: 'twohand' }, grant: { name: 'Timber Stance', armor: 12, regenPer4s: 2 } }] },
    ],
  },
  // ------------------------------------------------------------ 15
  {
    id: 'ringing_blow',
    skill: 'twohand',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Ringing Blow',
    desc: 'Every fifth landed stroke rings through the bones. The struck foe staggers.',
    color: '#c9a36b',
    effects: [
      {
        kind: 'proc',
        proc: { kind: 'proc', id: 'calling:ringing_blow', name: 'Ringing Blow', trigger: { on: 'cadence', every: 5 }, action: { do: 'status', status: 'stagger', power: 0, ticks: 12 }, icd: 120 },
      },
    ],
    ranks: [
      {
        note: 'The ring carries. The stagger holds a beat longer and comes round sooner.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:ringing_blow', name: 'Ringing Blow', trigger: { on: 'cadence', every: 5 }, action: { do: 'status', status: 'stagger', power: 0, ticks: 14 }, icd: 100 } },
        ],
      },
      {
        note: 'Every fourth stroke rings now.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:ringing_blow', name: 'Ringing Blow', trigger: { on: 'cadence', every: 4 }, action: { do: 'status', status: 'stagger', power: 0, ticks: 14 }, icd: 100 } },
        ],
      },
      {
        note: 'The held one takes the full weight. Staggered foes take more from you.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:ringing_blow', name: 'Ringing Blow', trigger: { on: 'cadence', every: 4 }, action: { do: 'status', status: 'stagger', power: 0, ticks: 14 }, icd: 80 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'stagger', pct: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 20 (founding)
  {
    id: 'farcleaver',
    skill: 'twohand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Farcleaver',
    desc: 'The edge arrives before the argument. Greatweapon reach grows.',
    color: '#c47a3d',
    effects: [{ kind: 'perk', perk: 'greatReach', magnitude: 0.35 }],
    ranks: [
      { note: 'The arms learn the full haft. Reach grows.', effects: [{ kind: 'perk', perk: 'greatReach', magnitude: 0.45 }] },
      { note: 'The last hand slides to the pommel. Reach grows again.', effects: [{ kind: 'perk', perk: 'greatReach', magnitude: 0.55 }] },
      {
        note: 'The whole horizon is in range, and you close it quicker.',
        effects: [
          { kind: 'perk', perk: 'greatReach', magnitude: 0.6 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 25
  {
    id: 'sundering_fall',
    skill: 'twohand',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Sundering Fall',
    desc: 'A clean overhead splits more than flesh. Critical blows sunder the foe.',
    color: '#b8b2a6',
    effects: [
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:sundering_fall', name: 'Sundering Fall', trigger: { on: 'crit' }, action: { do: 'status', status: 'sunder', power: 10, ticks: 100 }, icd: 120 } },
    ],
    ranks: [
      {
        note: 'The seam runs deeper. The sunder bites harder.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:sundering_fall', name: 'Sundering Fall', trigger: { on: 'crit' }, action: { do: 'status', status: 'sunder', power: 12, ticks: 100 }, icd: 120 } }],
      },
      {
        note: 'The crack holds open longer.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:sundering_fall', name: 'Sundering Fall', trigger: { on: 'crit' }, action: { do: 'status', status: 'sunder', power: 14, ticks: 120 }, icd: 100 } }],
      },
      {
        note: 'You read the grain before the swing. Deeper sunder, and clean blows come oftener.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:sundering_fall', name: 'Sundering Fall', trigger: { on: 'crit' }, action: { do: 'status', status: 'sunder', power: 15, ticks: 140 }, icd: 100 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 30
  {
    id: 'millstone_turn',
    skill: 'twohand',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Millstone Turn',
    desc: 'The weight gathers across five strokes and comes round all at once. A crushing burst.',
    color: '#a8907a',
    effects: [
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:millstone_turn', name: 'Millstone Turn', trigger: { on: 'cadence', every: 5 }, action: { do: 'nova', damage: 12, radius: 2.4 }, icd: 160 } },
    ],
    ranks: [
      {
        note: 'The stone grinds harder.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:millstone_turn', name: 'Millstone Turn', trigger: { on: 'cadence', every: 5 }, action: { do: 'nova', damage: 15, radius: 2.4 }, icd: 160 } }],
      },
      {
        note: 'The wheel takes a wider yard.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:millstone_turn', name: 'Millstone Turn', trigger: { on: 'cadence', every: 5 }, action: { do: 'nova', damage: 17, radius: 2.7 }, icd: 160 } }],
      },
      {
        note: 'Every fourth stroke turns the stone, and nothing near it stands.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:millstone_turn', name: 'Millstone Turn', trigger: { on: 'cadence', every: 4 }, action: { do: 'nova', damage: 19, radius: 2.9 }, icd: 160 } }],
      },
    ],
  },
  // ------------------------------------------------------------ 35 (outward)
  {
    id: 'quarry_shoulders',
    skill: 'twohand',
    unlockLevel: 35,
    focusCost: 1,
    name: "Quarryman's Back",
    desc: 'A maul is a pick by another name. You mine deeper and carry more life in the frame.',
    color: '#9a8a70',
    effects: [
      { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 3 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
    ],
    ranks: [
      {
        note: 'The seam answers a heavier hand. Mining and life both climb.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 4 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'Quarry lungs. Mining climbs again and the frame holds more.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 5 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
        ],
      },
      {
        note: 'Stone dust in the blood. The frame holds most, and ore struck from the seam coats you.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 5 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:quarry_shoulders', name: 'Quarry Dust', trigger: { on: 'gather', chance: 0.25 }, action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 }, icd: 300 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 40
  {
    id: 'reaping_beat',
    skill: 'twohand',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Reaping Beat',
    desc: 'Fell, reap, and the third beat is the whole harvest. The finishing stroke hits harder.',
    color: '#a3542f',
    effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.2 }],
    ranks: [
      { note: 'The third beat lands heavier.', effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.27 }] },
      { note: 'The whole string is timed to the reap. Heavier again.', effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.34 }] },
      {
        note: 'The harvest feeds the next row. Heaviest finisher, and a kill quickens your arts.',
        effects: [
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.4 },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 45 (outward)
  {
    id: 'stone_in_the_haft',
    skill: 'twohand',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Stone in the Haft',
    desc: 'Pressed hard, you go still as kerbstone. Below two fifths health, stonehide coats you.',
    color: '#7d6b5d',
    effects: [
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:stone_in_the_haft', name: 'Stone in the Haft', trigger: { on: 'lowHp', pct: 0.4 }, action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 }, icd: 1000 } },
    ],
    ranks: [
      {
        note: 'The coats hold longer.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:stone_in_the_haft', name: 'Stone in the Haft', trigger: { on: 'lowHp', pct: 0.4 }, action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 }, icd: 1000 } }],
      },
      {
        note: 'The stone comes sooner and stays longer.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:stone_in_the_haft', name: 'Stone in the Haft', trigger: { on: 'lowHp', pct: 0.45 }, action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 }, icd: 900 } }],
      },
      {
        note: 'Stone swings heavy. It comes at half health, and while it coats you, blows land harder.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:stone_in_the_haft', name: 'Stone in the Haft', trigger: { on: 'lowHp', pct: 0.5 }, action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 }, icd: 800 } },
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Stone Weight', dmgMult: 1.08 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 50
  {
    id: 'shaking_blow',
    skill: 'twohand',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Loosened Grip',
    desc: 'The weight lands and the fight goes slack in their hands. Struck foes hit softer.',
    color: '#7d6b73',
    effects: [
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:shaking_blow', name: 'Loosened Grip', trigger: { on: 'hit', chance: 0.15 }, action: { do: 'status', status: 'weaken', power: 8, ticks: 100 }, icd: 100 } },
    ],
    ranks: [
      {
        note: 'The grip loosens further. Weakened foes hit softer still.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:shaking_blow', name: 'Loosened Grip', trigger: { on: 'hit', chance: 0.15 }, action: { do: 'status', status: 'weaken', power: 10, ticks: 100 }, icd: 100 } }],
      },
      {
        note: 'The slack lingers. The weaken holds longer and lands oftener.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:shaking_blow', name: 'Loosened Grip', trigger: { on: 'hit', chance: 0.18 }, action: { do: 'status', status: 'weaken', power: 12, ticks: 120 }, icd: 100 } }],
      },
      {
        note: 'What they cannot hold cannot stop you. Deeper weaken, and weakened foes take more.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:shaking_blow', name: 'Loosened Grip', trigger: { on: 'hit', chance: 0.2 }, action: { do: 'status', status: 'weaken', power: 14, ticks: 140 }, icd: 100 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'weaken', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 55 (outward, READS bleed)
  {
    id: 'red_rhythm',
    skill: 'twohand',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Red Rhythm',
    desc: 'An opened wound sets the tempo. When you lay a bleed, your hands quicken.',
    color: '#c4372a',
    effects: [
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:red_rhythm', name: 'Red Rhythm', trigger: { on: 'stateApplied', status: 'bleed' }, action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 }, icd: 100 } },
    ],
    ranks: [
      {
        note: 'The tempo holds longer.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:red_rhythm', name: 'Red Rhythm', trigger: { on: 'stateApplied', status: 'bleed' }, action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 }, icd: 100 } }],
      },
      {
        note: 'The rhythm comes round sooner and holds longer.',
        effects: [{ kind: 'proc', proc: { kind: 'proc', id: 'calling:red_rhythm', name: 'Red Rhythm', trigger: { on: 'stateApplied', status: 'bleed' }, action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 }, icd: 80 } }],
      },
      {
        note: 'You know where the wound is. Bleeding foes take more from you.',
        effects: [
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:red_rhythm', name: 'Red Rhythm', trigger: { on: 'stateApplied', status: 'bleed' }, action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 }, icd: 60 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 60 (founding)
  {
    id: 'executioner',
    skill: 'twohand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Executioner',
    desc: 'The nearly-felled are already spoken for. Greatblows bite deeper into them.',
    color: '#8a5a4a',
    effects: [{ kind: 'perk', perk: 'greatExecute', magnitude: 0.3 }],
    ranks: [
      { note: 'The sentence is read sooner. Deeper bite into the nearly-felled.', effects: [{ kind: 'perk', perk: 'greatExecute', magnitude: 0.4 }] },
      { note: 'The block is worn smooth. Deeper still.', effects: [{ kind: 'perk', perk: 'greatExecute', magnitude: 0.5 }] },
      {
        note: 'The deepest bite, and a kill sends you striding to the next neck.',
        effects: [
          { kind: 'perk', perk: 'greatExecute', magnitude: 0.6 },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:executioner', name: 'The Next Neck', trigger: { on: 'kill' }, action: { do: 'surge', stat: 'speed', pct: 20, ticks: 80 }, icd: 200 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 65 (READS sunder, the pair closes)
  {
    id: 'split_seam',
    skill: 'twohand',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Split Seam',
    desc: 'A sundered body shows its grain. Sundered foes take more, and a stroke into one splits.',
    color: '#d0b48c',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      { kind: 'proc', proc: { kind: 'proc', id: 'calling:split_seam', name: 'Split Seam', trigger: { on: 'hitState', status: 'sunder', chance: 0.3 }, action: { do: 'bolt', damage: 18 }, icd: 160 } },
    ],
    ranks: [
      {
        note: 'The split runs deeper.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:split_seam', name: 'Split Seam', trigger: { on: 'hitState', status: 'sunder', chance: 0.3 }, action: { do: 'bolt', damage: 22 }, icd: 160 } },
        ],
      },
      {
        note: 'You read the grain plainer. Sundered foes take more, and the split comes oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:split_seam', name: 'Split Seam', trigger: { on: 'hitState', status: 'sunder', chance: 0.35 }, action: { do: 'bolt', damage: 25 }, icd: 160 } },
        ],
      },
      {
        note: 'Nothing sundered stays whole. The deepest read and the hardest split.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:split_seam', name: 'Split Seam', trigger: { on: 'hitState', status: 'sunder', chance: 0.4 }, action: { do: 'bolt', damage: 28 }, icd: 160 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 70 (outward)
  {
    id: 'yard_master',
    skill: 'twohand',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Yard Master',
    desc: 'Whoever drills the greatweapon drills the yard. Every school rises, and you move quicker.',
    color: '#ba8b5c',
    effects: [
      { kind: 'perk', perk: 'warSchooling', magnitude: 2 },
      { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
    ],
    ranks: [
      {
        note: 'The yard listens closer. Every school climbs another step.',
        effects: [
          { kind: 'perk', perk: 'warSchooling', magnitude: 3 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
      {
        note: 'You cross the yard quicker.',
        effects: [
          { kind: 'perk', perk: 'warSchooling', magnitude: 3 },
          { kind: 'gear', effect: { kind: 'speed', pct: 6 } },
        ],
      },
      {
        note: 'Master of the yard. Every school climbs, you move quickest, and arts rest shorter.',
        effects: [
          { kind: 'perk', perk: 'warSchooling', magnitude: 4 },
          { kind: 'gear', effect: { kind: 'speed', pct: 7 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 75
  {
    id: 'mountains_bearing',
    skill: 'twohand',
    unlockLevel: 75,
    focusCost: 2,
    name: "Mountain's Bearing",
    desc: 'Crowded, you get bigger. Against three or more you hit harder and shrug more.',
    color: '#6f5a52',
    effects: [
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: "Mountain's Bearing", dmgMult: 1.08, armor: 4 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
    ],
    ranks: [
      {
        note: 'The crowd only makes you taller. Harder blows and more armor when outnumbered.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: "Mountain's Bearing", dmgMult: 1.1, armor: 5 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'The crowd meets more mountain. Deeper bearing, and more of you to move.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: "Mountain's Bearing", dmgMult: 1.12, armor: 6 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 18 } },
        ],
      },
      {
        note: 'The mountain does not fall. A hard blow may raise stone shoulders that eat the next ones.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: "Mountain's Bearing", dmgMult: 1.12, armor: 6 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'proc', proc: { kind: 'proc', id: 'calling:mountains_bearing', name: 'Stone Shoulders', trigger: { on: 'hurt', chance: 0.2 }, action: { do: 'ward', absorb: 40, ticks: 160 }, icd: 300 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 80 (THE MASTER'S LICENSE)
  {
    id: 'giantsfall_hand',
    skill: 'twohand',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Giantsfall Hand',
    desc: 'The stroke that felled the biggest thing you ever swung at. Giantsfall is yours.',
    color: '#d88a4a',
    effects: [
      { kind: 'art', ability: 'giantsfall' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The memory swings heavier. Greatweapon damage climbs.',
        effects: [
          { kind: 'art', ability: 'giantsfall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } },
        ],
      },
      {
        note: 'You know where giants keep their knees. Heavier, and the edge finds the seam oftener.',
        effects: [
          { kind: 'art', ability: 'giantsfall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'Everything falls the same height in the end. Heaviest hand, the fall comes sooner.',
        effects: [
          { kind: 'art', ability: 'giantsfall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, twohand's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding
 * / vsState) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const TWOHAND_LICENSES: CallingLicense[] = [
  { calling: 'ringing_blow', status: 'stagger', via: 'lay:status' },
  { calling: 'ringing_blow', status: 'stagger', via: 'read:vsState' },
  { calling: 'sundering_fall', status: 'sunder', via: 'lay:status' },
  { calling: 'quarry_shoulders', status: 'stonehide', via: 'lay:boon' },
  { calling: 'stone_in_the_haft', status: 'stonehide', via: 'lay:boon' },
  { calling: 'stone_in_the_haft', status: 'stonehide', via: 'read:stateRiding' },
  { calling: 'shaking_blow', status: 'weaken', via: 'lay:status' },
  { calling: 'shaking_blow', status: 'weaken', via: 'read:vsState' },
  { calling: 'red_rhythm', status: 'bleed', via: 'read:stateApplied' },
  { calling: 'red_rhythm', status: 'quicken', via: 'lay:boon' },
  { calling: 'red_rhythm', status: 'bleed', via: 'read:vsState' },
  { calling: 'split_seam', status: 'sunder', via: 'read:hitState' },
  { calling: 'split_seam', status: 'sunder', via: 'read:vsState' },
];

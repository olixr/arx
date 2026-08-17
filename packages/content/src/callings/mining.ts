/**
 * THE FILLED HALL — mining's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE DEEP'S ARC: a copper hand learns the pick (5), the dark, and the
 * ore glint (10, 15); the seam starts paying double (20); the miner
 * learns that stone fights back (25 grit, 30 the props that set a ward, 35 the sledge
 * arm); the dust becomes a coat (40) and the blow learns to split
 * armor like a face of rock (45, 50 read the crack); the coated
 * miner fights as granite (55), breathes the deep (60), keeps time
 * with the pick (65), holds the narrow drift (70), strikes the
 * motherlode (75), and at 80 the maul sings against the seam and the
 * seam sings back (Ore Song, THE MASTER'S LICENSE).
 *
 * Pages laid: weaken (grit), stonehide (dust), sunder (the split),
 * quicken (pick tempo). Pages read: sunder (the cracked face, twice),
 * stonehide (granite temper). The hinges a smith's sunder and an
 * herbalist's stonehide are expected to meet.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const MINING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5..15: three identities
  {
    id: 'copper_knuckle',
    skill: 'mining',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Copper Knuckle',
    desc: 'The first blisters have hardened. Every rock face comes down quicker under your pick.',
    color: '#b87a4a',
    effects: [{ kind: 'gatherSpeed', skill: 'mining', mult: 1.1 }],
    ranks: [
      {
        note: 'The swing finds its own weight. Ore comes quicker still.',
        effects: [{ kind: 'gatherSpeed', skill: 'mining', mult: 1.13 }],
      },
      {
        note: 'You stop counting strokes. Faster yet at the face.',
        effects: [{ kind: 'gatherSpeed', skill: 'mining', mult: 1.16 }],
      },
      {
        note: 'A quick hand makes a quick foot. Fastest at the face, and you walk quicker too.',
        effects: [
          { kind: 'gatherSpeed', skill: 'mining', mult: 1.18 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'adit_feet',
    skill: 'mining',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Adit Feet',
    desc: 'You know a tunnel floor by the sole of your boot. You move quicker underground.',
    color: '#6e6a78',
    effects: [{ kind: 'when', cond: { when: 'underground' }, grant: { name: 'Adit Step', speedMult: 1.06 } }],
    ranks: [
      {
        note: 'The dark holds no surprises for your feet. Quicker still below.',
        effects: [{ kind: 'when', cond: { when: 'underground' }, grant: { name: 'Adit Step', speedMult: 1.08 } }],
      },
      {
        note: 'You could run a drift blind. Quicker yet below.',
        effects: [{ kind: 'when', cond: { when: 'underground' }, grant: { name: 'Adit Step', speedMult: 1.1 } }],
      },
      {
        note: 'You lean into the walls as you go. Speed below, and the stone shoulders a little for you.',
        effects: [
          { kind: 'when', cond: { when: 'underground' }, grant: { name: 'Adit Step', speedMult: 1.1, armor: 4 } },
        ],
      },
    ],
  },
  {
    id: 'ore_eye',
    skill: 'mining',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Seam Glint',
    desc: 'A glint in the rock, a color in the dirt. As you walk, nearby ore shows itself.',
    color: '#c9a44a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ore_eye', name: 'Seam Glint',
          trigger: { on: 'stride', tiles: 30 },
          action: { do: 'reveal', radius: 8, of: 'node' },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The eye reaches farther through the dirt.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ore_eye', name: 'Seam Glint',
              trigger: { on: 'stride', tiles: 30 },
              action: { do: 'reveal', radius: 10, of: 'node' },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'You need fewer steps between glints.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ore_eye', name: 'Seam Glint',
              trigger: { on: 'stride', tiles: 26 },
              action: { do: 'reveal', radius: 10, of: 'node' },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'The whole hillside confesses. Farther, oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ore_eye', name: 'Seam Glint',
              trigger: { on: 'stride', tiles: 22 },
              action: { do: 'reveal', radius: 12, of: 'node' },
              icd: 160,
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 20..50: the verbs arrive
  {
    id: 'prospector',
    skill: 'mining',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Prospector',
    desc: 'You read the seam before you swing. Ore sometimes comes double.',
    color: '#8a8474',
    effects: [{ kind: 'doubleGather', skill: 'mining', chance: 0.1 }],
    ranks: [
      {
        note: 'The seam gives up its second lump oftener.',
        effects: [{ kind: 'doubleGather', skill: 'mining', chance: 0.13 }],
      },
      {
        note: 'You strike where the ore is thickest. Doubles oftener yet.',
        effects: [{ kind: 'doubleGather', skill: 'mining', chance: 0.16 }],
      },
      {
        note: 'The rock reads back to you. One in five swings pays double, and your craft deepens.',
        effects: [
          { kind: 'doubleGather', skill: 'mining', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'grit_in_the_eye',
    skill: 'mining',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Grit in the Eye',
    desc: 'A fist of rock dust for whoever bloodies you. Those who wound you sometimes strike weaker.',
    color: '#7c7466',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:grit_in_the_eye', name: 'Grit',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'status', status: 'weaken', power: 8, ticks: 60 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'A bigger fistful. The weakening bites deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grit_in_the_eye', name: 'Grit',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 60 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'You throw oftener, and they rub at their eyes longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grit_in_the_eye', name: 'Grit',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'You keep a pocket full. Deeper, longer, oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grit_in_the_eye', name: 'Grit',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 180,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'shoring_timber',
    skill: 'mining',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Shoring Timber',
    desc: 'A roof you propped never falls on you. Every fifth blow taken, the props set and ward you.',
    color: '#8a6a48',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:shoring_timber', name: 'Props Set',
          trigger: { on: 'stacks', per: 'hurt', count: 5 },
          action: { do: 'ward', absorb: 30, ticks: 160 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'Thicker props. The ward takes more before it splinters.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:shoring_timber', name: 'Props Set',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'ward', absorb: 40, ticks: 160 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'You hear the roof groan a blow sooner. Every fourth blow taken, and the ward holds longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:shoring_timber', name: 'Props Set',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'ward', absorb: 50, ticks: 200 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'The whole gallery is yours. Stoutest ward, oftener, and your wounds knit on their own.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:shoring_timber', name: 'Props Set',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'ward', absorb: 60, ticks: 200 },
              icd: 240,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  {
    id: 'sledge_arm',
    skill: 'mining',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Sledge Arm',
    desc: 'Years on the double jack put a haft in your hands for good. Greatweapons hit harder.',
    color: '#9a8a78',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } }],
    ranks: [
      {
        note: 'The shoulders remember every stroke. Greatweapons hit harder yet.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } }],
      },
      {
        note: 'You find the flaw in a thing before you hit it. Harder, and you crit a little oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'The stone taught you where things break. Hardest, and the crit sharpens.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  {
    id: 'dust_mantle',
    skill: 'mining',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Dust Mantle',
    desc: 'You come up out of the pit grey to the eyebrows. Mining sometimes coats you in stonehide.',
    color: '#98a4b0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:dust_mantle', name: 'Rock Dust',
          trigger: { on: 'gather', chance: 0.3 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'More of the mountain comes up with you. The coat lands oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:dust_mantle', name: 'Rock Dust',
              trigger: { on: 'gather', chance: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The dust settles in and stays. The coat holds longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:dust_mantle', name: 'Rock Dust',
              trigger: { on: 'gather', chance: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'Half stone yourself. The coat lands on half your swings, holds longest, and armor stays.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:dust_mantle', name: 'Rock Dust',
              trigger: { on: 'gather', chance: 0.5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 140,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'splitting_blow',
    skill: 'mining',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Feather and Wedge',
    desc: 'Feathers and wedges taught your arm where rock gives. Every fifth blow sunders the target.',
    color: '#a06a48',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:splitting_blow', name: 'Split Stone',
          trigger: { on: 'cadence', every: 5 },
          action: { do: 'status', status: 'sunder', power: 10, ticks: 80 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The crack runs deeper. The sunder bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splitting_blow', name: 'Split Stone',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'A split face does not close. The sunder holds longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splitting_blow', name: 'Split Stone',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'You hear the fault before you hit it. Deepest sunder, longest, and your crit sharpens.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splitting_blow', name: 'Split Stone',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 14, ticks: 120 },
              icd: 90,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  {
    id: 'cracked_face',
    skill: 'mining',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Cracked Face',
    desc: 'Where the rock is split, you finish it. Sundered foes take more, and a seam may break.',
    color: '#b8b2a6',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cracked_face', name: 'Seam Break',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'You lean harder on the crack. Sundered foes take more still.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cracked_face', name: 'Seam Break',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
              action: { do: 'bolt', damage: 14 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The seam breaks oftener, and wider.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cracked_face', name: 'Seam Break',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'Nothing split stays whole near you. Most against the sundered; the break hits hardest.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cracked_face', name: 'Seam Break',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 55..75: the outward seats, the pair closes
  {
    id: 'granite_temper',
    skill: 'mining',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Granite Temper',
    desc: 'Coated in stone, you fight like stone. While stonehide rides you, hit harder, turn more.',
    color: '#6f7f6a',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'stonehide' },
        grant: { name: 'Granite', dmgMult: 1.08, armor: 4 },
      },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
    ],
    ranks: [
      {
        note: 'The stone in you weighs heavier on every blow.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Granite', dmgMult: 1.1, armor: 4 },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
      {
        note: 'The coat and the flesh grow together. More armor coated, and a stouter frame.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Granite', dmgMult: 1.1, armor: 6 },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'Granite through and through. Hardest coated blows, most coated armor, stoutest frame.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Granite', dmgMult: 1.12, armor: 8 },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 15 } },
        ],
      },
    ],
  },
  {
    id: 'deep_lungs',
    skill: 'mining',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Lungs',
    desc: 'The bad air stopped bothering you years ago. Below ground, every stroke comes quicker.',
    color: '#5a5464',
    effects: [{ kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.15 }],
    ranks: [
      {
        note: 'The dark is your workshop. Faster below.',
        effects: [{ kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.2 }],
      },
      {
        note: 'You breathe stone dust like a hill breathes weather. Faster below, and you mend alone.',
        effects: [
          { kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.25 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
      {
        note: 'The deep is home. Fastest below, and your wounds close at a miner\'s steady pace.',
        effects: [
          { kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.3 },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
  {
    id: 'pick_tempo',
    skill: 'mining',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Pick Tempo',
    desc: 'Strike, breathe, strike; the face keeps the beat. Every sixth landed blow quickens you.',
    color: '#c9b06a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:pick_tempo', name: 'Keep Time',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 200,
        },
      },
      { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
    ],
    ranks: [
      {
        note: 'The beat comes round a blow sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pick_tempo', name: 'Keep Time',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'You hold the tempo longer once you have it.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pick_tempo', name: 'Keep Time',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 110 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'The face sings back. Longest tempo, and every stroke finds the flaw oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pick_tempo', name: 'Keep Time',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },
  {
    id: 'narrow_drift',
    skill: 'mining',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Narrow Drift',
    desc: 'In a tunnel they come one at a time. Outnumbered, you wear armor and turn blows back.',
    color: '#4f5a66',
    effects: [
      {
        kind: 'when',
        cond: { when: 'outnumbered', count: 3 },
        grant: { name: 'One at a Time', armor: 8, reflectFrac: 0.08 },
      },
      { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
    ],
    ranks: [
      {
        note: 'You set your back to the wall. More armor when pressed.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'One at a Time', armor: 10, reflectFrac: 0.08 },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
        ],
      },
      {
        note: 'The wall gives their blows back to them. More turned when pressed.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'One at a Time', armor: 10, reflectFrac: 0.12 },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 5 } },
        ],
      },
      {
        note: 'The drift is a fortress. Most armor and most turned when pressed, and sharper thorns.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'One at a Time', armor: 12, reflectFrac: 0.15 },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 6 } },
        ],
      },
    ],
  },
  {
    id: 'motherlode',
    skill: 'mining',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Motherlode',
    desc: 'Every seam has a heart and you can hear it. Every sixth swing at the rock pays extra ore.',
    color: '#d4b04c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:motherlode', name: 'Motherlode',
          trigger: { on: 'stacks', per: 'gather', count: 6 },
          action: { do: 'yield', extra: 1 },
          icd: 20,
        },
      },
      { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 3 } },
    ],
    ranks: [
      {
        note: 'The heart is closer to the surface than most think. Every fifth swing.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:motherlode', name: 'Motherlode',
              trigger: { on: 'stacks', per: 'gather', count: 5 },
              action: { do: 'yield', extra: 1 },
              icd: 20,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 3 } },
        ],
      },
      {
        note: 'When it pays, it pays twice over.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:motherlode', name: 'Motherlode',
              trigger: { on: 'stacks', per: 'gather', count: 5 },
              action: { do: 'yield', extra: 2 },
              icd: 20,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 3 } },
        ],
      },
      {
        note: 'You could find the heart of a mountain blindfold. Every fourth swing pays double extra.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:motherlode', name: 'Motherlode',
              trigger: { on: 'stacks', per: 'gather', count: 4 },
              action: { do: 'yield', extra: 2 },
              icd: 20,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'mining', amount: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 80: the capstone, THE MASTER'S LICENSE
  {
    id: 'the_deep_sings',
    skill: 'mining',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Deep Sings',
    desc: 'The seam knows your maul. Ore Song is yours to cast, and the deep lends its weight.',
    color: '#3a3444',
    effects: [
      { kind: 'art', ability: 'ore_song' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
      { kind: 'when', cond: { when: 'underground' }, grant: { name: 'Deepsong', dmgMult: 1.06, armor: 6 } },
    ],
    ranks: [
      {
        note: 'The song carries. Greatweapons hit harder, and harder still below.',
        effects: [
          { kind: 'art', ability: 'ore_song' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } },
          { kind: 'when', cond: { when: 'underground' }, grant: { name: 'Deepsong', dmgMult: 1.08, armor: 6 } },
        ],
      },
      {
        note: 'The stone answers in kind. Harder yet, and thicker armor below.',
        effects: [
          { kind: 'art', ability: 'ore_song' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'when', cond: { when: 'underground' }, grant: { name: 'Deepsong', dmgMult: 1.08, armor: 8 } },
        ],
      },
      {
        note: 'The mountain sings with you. Hardest blows, the deep at its fullest, and a stouter frame.',
        effects: [
          { kind: 'art', ability: 'ore_song' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'when', cond: { when: 'underground' }, grant: { name: 'Deepsong', dmgMult: 1.1, armor: 10 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, mining's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding
 * / vsState) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const MINING_LICENSES: CallingLicense[] = [
  // Lays.
  { calling: 'grit_in_the_eye', status: 'weaken', via: 'lay:status' },
  { calling: 'dust_mantle', status: 'stonehide', via: 'lay:boon' },
  { calling: 'splitting_blow', status: 'sunder', via: 'lay:status' },
  { calling: 'pick_tempo', status: 'quicken', via: 'lay:boon' },
  // Reads.
  { calling: 'cracked_face', status: 'sunder', via: 'read:vsState' },
  { calling: 'cracked_face', status: 'sunder', via: 'read:hitState' },
  { calling: 'granite_temper', status: 'stonehide', via: 'read:stateRiding' },
];

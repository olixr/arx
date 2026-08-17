/**
 * THE FILLED HALL — defence's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE ARMORED STAND, the ladder's arc: the low seats teach the body
 * to be hit (hide, jaw, harness); the middle seats learn that a blow
 * TAKEN is a blow SPENT (stone coats, the anvil, the dulled edge, the
 * pressed crack); the high seats are the desperation stands and the
 * ring of spears; the capstone is the great stand itself, licensed to
 * a hand that has been hit more than any other in the hall.
 *
 * Pages: LAYS stonehide (Set Jaw), weaken (Bluntwork), stagger
 * (Press the Crack), mend (Knitted Sinew); READS stonehide riding
 * (Granite Knuckle) and sunder on the struck (Press the Crack, both
 * hitState and THE READING EDGE). The capstone lays stonehide on its
 * own cast, so the mountain feeds the granite fist at 30. Outward
 * seats: Granite Knuckle, The Anvil Answers, Press the Crack, The
 * Tally Stick, No Step Back, The Standing Mountain.
 * Licenses: Hold Fast (The Ring Closes), The Standing Stone (capstone).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const DEFENCE_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5..15: three identities
  {
    id: 'oxhide',
    skill: 'defence',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Oxhide',
    desc: 'You learned young that a blow is only weather. Flat armor, awake or asleep.',
    color: '#8c8478',
    effects: [{ kind: 'gear', effect: { kind: 'armor', amount: 5 } }],
    ranks: [
      { note: 'The hide thickens: six armor.', effects: [{ kind: 'gear', effect: { kind: 'armor', amount: 6 } }] },
      { note: 'Eight armor, and you stopped flinching years ago.', effects: [{ kind: 'gear', effect: { kind: 'armor', amount: 8 } }] },
      {
        note: 'Ox all through: ten armor and a deeper well of health.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 10 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  {
    id: 'set_jaw',
    skill: 'defence',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Set Jaw',
    desc: 'A hard blow sets your jaw and your skin with it. Being hurt may coat you in stone.',
    color: '#98a4b0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:set_jaw', name: 'Set Jaw',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The jaw sets oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:set_jaw', name: 'Set Jaw',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'The stone rests less between coats.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:set_jaw', name: 'Set Jaw',
              trigger: { on: 'hurt', chance: 0.35 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'Every third blow, near enough, and the coats keep longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:set_jaw', name: 'Set Jaw',
              trigger: { on: 'hurt', chance: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 220,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'burr_harness',
    skill: 'defence',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Burr Harness',
    desc: 'You wear your harness like a burr wears its hooks. Whatever strikes you takes thorns.',
    color: '#7e8a6e',
    effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 4 } }],
    ranks: [
      { note: 'The hooks bite deeper: five thorns.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 5 } }] },
      { note: 'Six thorns; whatever grabs you lets go bleeding.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 6 } }] },
      {
        note: 'The burr grows a shell: eight hooks, and armor under them.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 8 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },

  // -------------------------------------------- 20..50: the verbs arrive
  {
    id: 'bulwark',
    skill: 'defence',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bulwark',
    desc: 'Hold your ground and the ground holds you. Armor while standing firm.',
    color: '#8a94a4',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }],
    ranks: [
      { note: 'The planted stance carries more iron.', effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 8 }] },
      {
        note: 'Held ground knits you: while still, health returns.',
        effects: [
          { kind: 'perk', perk: 'stillArmor', magnitude: 10 },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Held Ground', regenPer4s: 1 } },
        ],
      },
      {
        note: 'The wall you make of yourself is twice as thick, and it mends.',
        effects: [
          { kind: 'perk', perk: 'stillArmor', magnitude: 12 },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Held Ground', regenPer4s: 2 } },
        ],
      },
    ],
  },
  {
    id: 'backed_to_the_wall',
    skill: 'defence',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Backed to the Wall',
    desc: 'Nowhere left to step, so you stop stepping. Below two fifths health, armor climbs.',
    color: '#6a7484',
    effects: [
      { kind: 'when', cond: { when: 'hpBelow', frac: 0.4 }, grant: { name: 'Wall at Your Back', armor: 8 } },
    ],
    ranks: [
      {
        note: 'The wall stands thicker.',
        effects: [{ kind: 'when', cond: { when: 'hpBelow', frac: 0.4 }, grant: { name: 'Wall at Your Back', armor: 10 } }],
      },
      {
        note: 'Cornered, you give blows back: a tenth of every hit returns.',
        effects: [
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.4 }, grant: { name: 'Wall at Your Back', armor: 12, reflectFrac: 0.1 } },
        ],
      },
      {
        note: 'The wall stands earlier and gives back more.',
        effects: [
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.45 }, grant: { name: 'Wall at Your Back', armor: 12, reflectFrac: 0.15 } },
        ],
      },
    ],
  },
  {
    id: 'granite_knuckle',
    skill: 'defence',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Granite Knuckle',
    desc: 'Coated in stone, your fist is stone too. While stonehide rides you, blows land harder.',
    color: '#a09a90',
    effects: [
      { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Granite Knuckle', dmgMult: 1.08 } },
    ],
    ranks: [
      {
        note: 'The stone fist lands heavier.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Granite Knuckle', dmgMult: 1.1 } },
        ],
      },
      {
        note: 'Twelve parts in a hundred heavier while the stone holds.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Granite Knuckle', dmgMult: 1.12 } },
        ],
      },
      {
        note: 'The stone finds the seam: harder blows, and more of them critical.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Granite Knuckle', dmgMult: 1.12, critPct: 3 },
          },
        ],
      },
    ],
  },
  {
    id: 'anvil_answers',
    skill: 'defence',
    unlockLevel: 35,
    focusCost: 1,
    name: 'The Anvil Answers',
    desc: 'The anvil takes six blows and rings back one. Every sixth wound bursts around you.',
    color: '#7c8696',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:anvil_answers', name: 'Anvil Answers',
          trigger: { on: 'stacks', per: 'hurt', count: 6 },
          action: { do: 'nova', damage: 12, radius: 2.0 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The anvil rings harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_answers', name: 'Anvil Answers',
              trigger: { on: 'stacks', per: 'hurt', count: 6 },
              action: { do: 'nova', damage: 15, radius: 2.0 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Five blows fill the anvil now.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_answers', name: 'Anvil Answers',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'nova', damage: 17, radius: 2.0 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The ring carries wider and harder, and the anvil cools sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_answers', name: 'Anvil Answers',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'nova', damage: 20, radius: 2.4 },
              icd: 180,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'harnessed',
    skill: 'defence',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Harnessed',
    desc: 'Plate sits on you like it grew there. Every worn plate piece adds armor and health.',
    color: '#8894a8',
    effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1, maxHp: 2 }],
    ranks: [
      { note: 'Each plate carries more health.', effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1, maxHp: 3 }] },
      { note: 'Each plate carries more armor.', effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 2, maxHp: 3 }] },
      {
        note: 'The harness is a second body: more of both, and it breathes with you.',
        effects: [
          { kind: 'perPiece', armorClass: 'plate', armor: 2, maxHp: 4 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  {
    id: 'bluntwork',
    skill: 'defence',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Bluntwork',
    desc: 'Steel that meets you comes away duller. A blow that lands may weaken the hand behind it.',
    color: '#7c7488',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:bluntwork', name: 'Bluntwork',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'status', status: 'weaken', power: 10, ticks: 100 },
          icd: 240,
        },
      },
    ],
    ranks: [
      {
        note: 'The edge dulls further.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bluntwork', name: 'Bluntwork',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'It dulls oftener and stays dull longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bluntwork', name: 'Bluntwork',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 120 },
              icd: 220,
            },
          },
        ],
      },
      {
        note: 'Whatever strikes you strikes soft: the dulling is deep and near constant.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bluntwork', name: 'Bluntwork',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 15, ticks: 120 },
              icd: 200,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'press_the_crack',
    skill: 'defence',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Press the Crack',
    desc: 'A sundered guard is an open door. Sundered foes take more from you and may stagger.',
    color: '#b8b2a6',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:press_the_crack', name: 'Press the Crack',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
          action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
          icd: 240,
        },
      },
    ],
    ranks: [
      {
        note: 'You lean harder on the crack.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_the_crack', name: 'Press the Crack',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'The stagger comes oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_the_crack', name: 'Press the Crack',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.4 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
              icd: 220,
            },
          },
        ],
      },
      {
        note: 'The door is off its hinges: sundered foes take far more, and reel longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 15 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_the_crack', name: 'Press the Crack',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.4 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 200,
            },
          },
        ],
      },
    ],
  },

  // ---------------------------------------- 55..75: the deep packages
  {
    id: 'knitted_sinew',
    skill: 'defence',
    unlockLevel: 55,
    focusCost: 2,
    name: 'The Arming Coat',
    desc: 'The quilting under the plate soaks blow and blood alike. Health returns; low, you mend.',
    color: '#9a8e7e',
    effects: [
      { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:knitted_sinew', name: 'Arming Coat',
          trigger: { on: 'lowHp', pct: 0.35 },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 120 },
          icd: 600,
        },
      },
    ],
    ranks: [
      {
        note: 'The quilting is thicker: the mend heals four a second.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knitted_sinew', name: 'Arming Coat',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 600,
            },
          },
        ],
      },
      {
        note: 'Blood is slower to leave you, and the coat is sooner ready to soak more.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knitted_sinew', name: 'Arming Coat',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 500,
            },
          },
        ],
      },
      {
        note: 'The mend wakes earlier and heals harder, and the coat is sooner ready.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knitted_sinew', name: 'Arming Coat',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 440,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'stonewall',
    skill: 'defence',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Stonewall',
    desc: 'Every ward that settles on you is a quarter thicker, and a hard blow may raise one.',
    color: '#6e7888',
    effects: [
      { kind: 'perk', perk: 'shieldMult', magnitude: 1.25 },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:stonewall', name: 'Stonewall',
          trigger: { on: 'hurt', chance: 0.12 },
          action: { do: 'ward', absorb: 26, ticks: 160 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'Every ward a third thicker, and the answering ward is broader.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.35 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stonewall', name: 'Stonewall',
              trigger: { on: 'hurt', chance: 0.12 },
              action: { do: 'ward', absorb: 32, ticks: 160 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'Near half again on every ward, and the wall answers oftener.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.45 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stonewall', name: 'Stonewall',
              trigger: { on: 'hurt', chance: 0.15 },
              action: { do: 'ward', absorb: 40, ticks: 160 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'Half again on every ward, and the answering ward stands ten seconds.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.5 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stonewall', name: 'Stonewall',
              trigger: { on: 'hurt', chance: 0.15 },
              action: { do: 'ward', absorb: 50, ticks: 200 },
              icd: 260,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'the_ring_closes',
    skill: 'defence',
    unlockLevel: 65,
    focusCost: 2,
    name: 'The Ring Closes',
    desc: 'Three on one is where you were trained. Outnumbered you harden, and Hold Fast is yours.',
    color: '#5e6c7c',
    effects: [
      { kind: 'art', ability: 'hold_fast' },
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', armor: 8, reflectFrac: 0.12 } },
    ],
    ranks: [
      {
        note: 'The ring hardens you further, and Hold Fast is still yours.',
        effects: [
          { kind: 'art', ability: 'hold_fast' },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', armor: 10, reflectFrac: 0.12 } },
        ],
      },
      {
        note: 'More of every blow goes back where it came from.',
        effects: [
          { kind: 'art', ability: 'hold_fast' },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', armor: 12, reflectFrac: 0.16 } },
        ],
      },
      {
        note: 'Two is a ring now, and inside it your blows land harder too.',
        effects: [
          { kind: 'art', ability: 'hold_fast' },
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 2 },
            grant: { name: 'Ringed', armor: 12, reflectFrac: 0.16, dmgMult: 1.06 },
          },
        ],
      },
    ],
  },
  {
    id: 'the_tally_stick',
    skill: 'defence',
    unlockLevel: 70,
    focusCost: 2,
    name: 'The Tally Stick',
    desc: 'Every blow taken is a notch on the stick. At seven notches you spend them as strength.',
    color: '#a4988a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:the_tally_stick', name: 'Tally Spent',
          trigger: { on: 'stacks', per: 'hurt', count: 7 },
          action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The notches are worth more: blows land eighteen parts harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally_stick', name: 'Tally Spent',
              trigger: { on: 'stacks', per: 'hurt', count: 7 },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'Six notches fill the stick, and it is sooner ready to be cut again.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally_stick', name: 'Tally Spent',
              trigger: { on: 'stacks', per: 'hurt', count: 6 },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 100 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'The debt is paid in full: a longer, harder surge, and iron between the notches.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally_stick', name: 'Tally Spent',
              trigger: { on: 'stacks', per: 'hurt', count: 6 },
              action: { do: 'surge', stat: 'damage', pct: 22, ticks: 120 },
              icd: 260,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'no_step_back',
    skill: 'defence',
    unlockLevel: 75,
    focusCost: 2,
    name: 'No Step Back',
    desc: 'The last third of your health is where you fight best. Low, your blows quicken and feed.',
    color: '#a05a48',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
      {
        kind: 'when',
        cond: { when: 'hpBelow', frac: 0.3 },
        grant: { name: 'No Step Back', dmgMult: 1.12, attackSpeedMult: 1.05, meleeLifesteal: 0.08 },
      },
    ],
    ranks: [
      {
        note: 'The low blows land harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.3 },
            grant: { name: 'No Step Back', dmgMult: 1.15, attackSpeedMult: 1.05, meleeLifesteal: 0.08 },
          },
        ],
      },
      {
        note: 'More of what you take comes home as health.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.3 },
            grant: { name: 'No Step Back', dmgMult: 1.15, attackSpeedMult: 1.06, meleeLifesteal: 0.12 },
          },
        ],
      },
      {
        note: 'The stand begins earlier and every part of it is sharper.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.35 },
            grant: { name: 'No Step Back', dmgMult: 1.18, attackSpeedMult: 1.08, meleeLifesteal: 0.12 },
          },
        ],
      },
    ],
  },

  // -------------------------------------------------- 80: the capstone
  {
    id: 'the_standing_mountain',
    skill: 'defence',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Standing Mountain',
    desc: 'The mountain raises the stone. The Standing Stone in any hand, and iron sits on you.',
    color: '#c0b8a8',
    effects: [
      { kind: 'art', ability: 'standing_stone' },
      { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
    ],
    ranks: [
      {
        note: 'The mountain wears more iron.',
        effects: [
          { kind: 'art', ability: 'standing_stone' },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'More health under the iron, arts come sooner, and every cast coats you in stone.',
        effects: [
          { kind: 'art', ability: 'standing_stone' },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_standing_mountain', name: 'Mountain Rises',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'The whole mountain: ten armor, twenty health, arts a tenth quicker, stone on every cast.',
        effects: [
          { kind: 'art', ability: 'standing_stone' },
          { kind: 'gear', effect: { kind: 'armor', amount: 10 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_standing_mountain', name: 'Mountain Rises',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 240,
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, defence's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const DEFENCE_LICENSES: CallingLicense[] = [
  { calling: 'set_jaw', status: 'stonehide', via: 'lay:boon' },
  { calling: 'granite_knuckle', status: 'stonehide', via: 'read:stateRiding' },
  { calling: 'bluntwork', status: 'weaken', via: 'lay:status' },
  { calling: 'press_the_crack', status: 'sunder', via: 'read:hitState' },
  { calling: 'press_the_crack', status: 'sunder', via: 'read:vsState' },
  { calling: 'press_the_crack', status: 'stagger', via: 'lay:status' },
  { calling: 'knitted_sinew', status: 'mend', via: 'lay:boon' },
  { calling: 'the_standing_mountain', status: 'stonehide', via: 'lay:boon' },
];

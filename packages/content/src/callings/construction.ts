/**
 * THE FILLED HALL — construction's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE RAISED WALL, the ladder's arc: the low seats are the site itself
 * (the mason's planted stance, the hod on the shoulder, the first
 * palisade); the middle seats learn that a builder knows where a thing
 * is JOINED and where it is not (mortar that sets on the skin, stone
 * laid course by course, the pry bar that opens a seam, the wrecking
 * bar that brings the opened thing down); the high seats are the
 * finished works (the load-bearing wall, the roof, the garrison, the
 * hearth); the capstone is the master who can raze as well as raise,
 * licensed the stonebreaker's maul.
 *
 * Pages: LAYS stonehide (Course by Course, Raze and Raise), sunder (Pry
 * Bar), stagger (Wrecking Bar), mend (Hearthstone); READS stonehide
 * riding (Mortar Sets) and sunder on the struck (Wrecking Bar, both
 * hitState and THE READING EDGE). Outward seats: Hod Carrier, Palisade,
 * Mortar Sets, Course by Course, Pry Bar, Wrecking Bar, Load Bearing,
 * Roof First, Garrison Wall, Bring the House Down, Hearthstone.
 * License: Quakefall (capstone).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const CONSTRUCTION_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5..15: three identities
  {
    id: 'footings',
    skill: 'construction',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Footings',
    desc: 'A mason plants before he lifts. Standing still, you carry more armor.',
    color: '#a49484',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 4 }],
    ranks: [
      { note: 'The stance sets like footings poured in fair weather.', effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }] },
      { note: 'Bedrock under the boots: the stance holds harder yet.', effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 7 }] },
      {
        note: 'Planted like a post: more still armor, and breath comes back while you stand.',
        effects: [
          { kind: 'perk', perk: 'stillArmor', magnitude: 8 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  {
    id: 'hod_carrier',
    skill: 'construction',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Hod Carrier',
    desc: 'You hauled brick up the ladder before you laid one. You move faster, laden or not.',
    color: '#b8a48c',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 5 } }],
    ranks: [
      { note: 'The legs remember the ladder.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 6 } }] },
      { note: 'The legs remember every ladder.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 7 } }] },
      {
        note: 'Faster yet, and the shoulders that carried the hod carry a deeper well of health.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 8 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  {
    id: 'palisade',
    skill: 'construction',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Palisade',
    desc: 'The first wall you ever raised was sharpened stakes. Whatever strikes you bleeds for it.',
    color: '#9c8468',
    effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 3 } }],
    ranks: [
      { note: 'The stakes are sharper.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 4 } }] },
      { note: 'The stakes are sharper and set closer.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 5 } }] },
      {
        note: 'A proper stockade: sharper stakes and a lined wall of armor behind them.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 6 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 20..50: the verbs arrive
  {
    id: 'salvager',
    skill: 'construction',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Salvager',
    desc: 'You build with the offcuts too. One board in ten comes back to the pile.',
    color: '#8a7a64',
    effects: [{ kind: 'materialSave', skill: 'construction', chance: 0.1 }],
    ranks: [
      { note: 'The offcut pile gives a little more.', effects: [{ kind: 'materialSave', skill: 'construction', chance: 0.13 }] },
      { note: 'Nothing on the site goes to the burn heap.', effects: [{ kind: 'materialSave', skill: 'construction', chance: 0.16 }] },
      {
        note: 'One board in five comes free, and the offcuts have taught you the trade itself.',
        effects: [
          { kind: 'materialSave', skill: 'construction', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'course_by_course',
    skill: 'construction',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Course by Course',
    desc: 'A wall goes up one course at a time. Every sixth blow you take lays a coat of stonehide.',
    color: '#8a9aa4',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:course_by_course', name: 'Course by Course',
          trigger: { on: 'stacks', per: 'hurt', count: 6 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The course is laid on the fifth blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:course_by_course', name: 'Course by Course',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The stone keeps longer between courses.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:course_by_course', name: 'Course by Course',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'Every fourth blow lays a coat, and it hardly rests between them.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:course_by_course', name: 'Course by Course',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mortar_sets',
    skill: 'construction',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Mortar Sets',
    desc: 'You know how lime cures on the skin. While stonehide rides you, it sets: armor and breath.',
    color: '#c4b49c',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'stonehide' },
        grant: { name: 'Mortar Sets', armor: 4, regenPer4s: 1 },
      },
    ],
    ranks: [
      {
        note: 'The mortar cures harder.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Mortar Sets', armor: 6, regenPer4s: 1 },
          },
        ],
      },
      {
        note: 'The mortar cures harder and the breath comes back quicker under it.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Mortar Sets', armor: 8, regenPer4s: 2 },
          },
        ],
      },
      {
        note: 'Cured through: the set coat also throws a share of every blow back at the hand.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Mortar Sets', armor: 10, regenPer4s: 2, reflectFrac: 0.1 },
          },
        ],
      },
    ],
  },
  {
    id: 'pry_bar',
    skill: 'construction',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Pry Bar',
    desc: 'You know where a thing is joined. Your blows may open a seam and leave the foe sundered.',
    color: '#74685c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:pry_bar', name: 'Pry Bar',
          trigger: { on: 'hit', chance: 0.2 },
          action: { do: 'status', status: 'sunder', power: 8, ticks: 80 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The seam opens wider.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pry_bar', name: 'Pry Bar',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 90 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The bar finds the joint oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pry_bar', name: 'Pry Bar',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 100 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'A master pry: the seam gapes wide and stays open a full six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:pry_bar', name: 'Pry Bar',
              trigger: { on: 'hit', chance: 0.28 },
              action: { do: 'status', status: 'sunder', power: 14, ticks: 120 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'wrecking_bar',
    skill: 'construction',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Wrecking Bar',
    desc: 'An opened seam is an invitation. Sundered foes take more from you and may be staggered.',
    color: '#6e6258',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:wrecking_bar', name: 'Wrecking Bar',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
          action: { do: 'status', status: 'stagger', power: 0, ticks: 10 },
          icd: 240,
        },
      },
    ],
    ranks: [
      {
        note: 'The bar bites deeper into an opened seam.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wrecking_bar', name: 'Wrecking Bar',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'The wall comes down oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wrecking_bar', name: 'Wrecking Bar',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.4 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
              icd: 220,
            },
          },
        ],
      },
      {
        note: 'Demolition proper: sundered foes take far more, and the stagger lands longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 15 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wrecking_bar', name: 'Wrecking Bar',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.45 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 200,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'load_bearing',
    skill: 'construction',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Load Bearing',
    desc: 'A wall stands because everything leans on it. With three foes close, you carry more armor.',
    color: '#7c8c94',
    effects: [
      {
        kind: 'when',
        cond: { when: 'outnumbered', count: 3 },
        grant: { name: 'Load Bearing', armor: 6 },
      },
    ],
    ranks: [
      {
        note: 'The wall bears more.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Load Bearing', armor: 8 },
          },
        ],
      },
      {
        note: 'The wall bears more, and you swing with the weight of the house behind you.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Load Bearing', armor: 10, dmgMult: 1.05 },
          },
        ],
      },
      {
        note: 'A bearing wall through and through: more armor, harder blows, and it mends itself.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Load Bearing', armor: 12, dmgMult: 1.08, regenPer4s: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'roof_first',
    skill: 'construction',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Roof First',
    desc: 'Get a roof over your head before the weather turns. Falling low raises a ward over you.',
    color: '#b09070',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:roof_first', name: 'Roof First',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'ward', absorb: 40, ticks: 200 },
          icd: 900,
        },
      },
    ],
    ranks: [
      {
        note: 'The roof holds more weather.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:roof_first', name: 'Roof First',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 50, ticks: 200 },
              icd: 900,
            },
          },
        ],
      },
      {
        note: 'The roof holds more, and goes back up sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:roof_first', name: 'Roof First',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 60, ticks: 220 },
              icd: 800,
            },
          },
        ],
      },
      {
        note: 'Slate, not thatch: the ward is thick, and the house under it holds more health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:roof_first', name: 'Roof First',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 72, ticks: 240 },
              icd: 720,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 55..75: the finished works
  {
    id: 'master_of_works',
    skill: 'construction',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Master of Works',
    desc: 'You have run a site or two. Higher works open early, and you walk the yard quick.',
    color: '#c8b090',
    effects: [
      { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 4 } },
      {
        kind: 'when',
        cond: { when: 'outOfCombat' },
        grant: { name: 'Site Walk', speedMult: 1.06 },
      },
    ],
    ranks: [
      {
        note: 'The plans read easier.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 5 } },
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Site Walk', speedMult: 1.08 },
          },
        ],
      },
      {
        note: 'The plans read easier and the site walk is brisker.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 6 } },
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Site Walk', speedMult: 1.1 },
          },
        ],
      },
      {
        note: 'Works well past your years open to you, and the yard itself mends you as you walk it.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 8 } },
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Site Walk', speedMult: 1.12, regenPer4s: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'homesteader',
    skill: 'construction',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Homesteader',
    desc: 'Walls rise quickly for the hand that has raised a hundred. You build faster.',
    color: '#cc9a58',
    effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.85 }],
    ranks: [
      { note: 'The walls rise quicker.', effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.8 }] },
      { note: 'The walls rise quicker still.', effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.75 }] },
      {
        note: 'A house in an afternoon, and a roof of your own puts more health under it.',
        effects: [
          { kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.7 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
  {
    id: 'garrison_wall',
    skill: 'construction',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Garrison Wall',
    desc: 'You raised the garrison walls. A raised shield is a wall to you: more armor, and it bites.',
    color: '#7a7068',
    effects: [
      { kind: 'perk', perk: 'shieldArm', magnitude: 5 },
      { kind: 'perk', perk: 'shieldThorns', magnitude: 4 },
    ],
    ranks: [
      {
        note: 'The rampart stands taller.',
        effects: [
          { kind: 'perk', perk: 'shieldArm', magnitude: 7 },
          { kind: 'perk', perk: 'shieldThorns', magnitude: 5 },
        ],
      },
      {
        note: 'The rampart stands taller and its stakes are set closer.',
        effects: [
          { kind: 'perk', perk: 'shieldArm', magnitude: 9 },
          { kind: 'perk', perk: 'shieldThorns', magnitude: 7 },
        ],
      },
      {
        note: 'Garrison work: the raised shield is a fortress and a hurt while raised bleeds the hand.',
        effects: [
          { kind: 'perk', perk: 'shieldArm', magnitude: 11 },
          { kind: 'perk', perk: 'shieldThorns', magnitude: 9 },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'bring_the_house_down',
    skill: 'construction',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Bring the House Down',
    desc: 'Every sixth blow lands like a wall coming down. The ground bursts around you.',
    color: '#9a8a7a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:bring_the_house_down', name: 'The House Comes Down',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'nova', damage: 16, radius: 2.2 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'More of the house comes down.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bring_the_house_down', name: 'The House Comes Down',
              trigger: { on: 'stacks', per: 'hit', count: 6 },
              action: { do: 'nova', damage: 19, radius: 2.2 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The fall comes on the fifth blow and spreads wider.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bring_the_house_down', name: 'The House Comes Down',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'nova', damage: 22, radius: 2.6 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'The whole street comes down, and the great weapons in your hands hit harder besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bring_the_house_down', name: 'The House Comes Down',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'nova', damage: 26, radius: 3.0 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 6 } },
        ],
      },
    ],
  },
  {
    id: 'hearthstone',
    skill: 'construction',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Hearthstone',
    desc: 'Every fight ends at your own hearth. A kill lays mending on you, and the house holds more.',
    color: '#d0c0a4',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:hearthstone', name: 'Hearthstone',
          trigger: { on: 'kill' },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
          icd: 400,
        },
      },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
    ],
    ranks: [
      {
        note: 'The hearth burns warmer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hearthstone', name: 'Hearthstone',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 400,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'The hearth burns warmer and longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hearthstone', name: 'Hearthstone',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 340,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 15 } },
        ],
      },
      {
        note: 'A great hearth: deeper mending, sooner ready, and a house of many rooms.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hearthstone', name: 'Hearthstone',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 280,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 80: the capstone
  {
    id: 'raze_and_raise',
    skill: 'construction',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Raze and Raise',
    desc: 'A master builder can unbuild anything. Quakefall is yours, and great weapons hit harder.',
    color: '#b8b2a6',
    effects: [
      { kind: 'art', ability: 'quakefall' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The maul swings truer.',
        effects: [
          { kind: 'art', ability: 'quakefall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } },
        ],
      },
      {
        note: 'The maul swings truer, and the mason under it wears a wall of armor.',
        effects: [
          { kind: 'art', ability: 'quakefall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 5 } },
        ],
      },
      {
        note: 'The signature: every art you cast raises the maul, and lifting it sets stone on your skin.',
        effects: [
          { kind: 'art', ability: 'quakefall' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:raze_and_raise', name: 'Raise the Maul',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 300,
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, construction's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const CONSTRUCTION_LICENSES: CallingLicense[] = [
  { calling: 'mortar_sets', status: 'stonehide', via: 'read:stateRiding' },
  { calling: 'course_by_course', status: 'stonehide', via: 'lay:boon' },
  { calling: 'pry_bar', status: 'sunder', via: 'lay:status' },
  { calling: 'wrecking_bar', status: 'sunder', via: 'read:vsState' },
  { calling: 'wrecking_bar', status: 'sunder', via: 'read:hitState' },
  { calling: 'wrecking_bar', status: 'stagger', via: 'lay:status' },
  { calling: 'hearthstone', status: 'mend', via: 'lay:boon' },
  { calling: 'raze_and_raise', status: 'stonehide', via: 'lay:boon' },
];

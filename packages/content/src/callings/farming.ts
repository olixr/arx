/**
 * THE FILLED HALL — farming's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding four
 * (green_thumb 20, the_composter 35, marketeer 45, bounty 60) keep
 * their ids and seats by THE NO-LOSS LAW; everything else here is this
 * epoch's authorship.
 *
 * THE TENDED EARTH'S ARC: a new hand learns that the soil gives back
 * (5, every harvest mends), grows the ploughman's frame (10) and the
 * long stride between plots (15); the seed starts coming home (20);
 * the field mud dries to a hide (25) and the bramblevine teaches the
 * snare (30); the heap closes early (35); the well fed farmer hits
 * like a plough horse (40); the larder pays (45); the dark bed is
 * grown and understood (50 reads venom, 55 lays it); the doubled
 * basket (60); stubble is burned off the field (65 answers a burning
 * foe); the mended body fights with the sap up (70); the swathe finds
 * its rhythm (75, quicken); and at 80 the glaive remembers the harvest
 * (Reaper's Turn, THE MASTER'S LICENSE) and the row lies down.
 *
 * Pages laid: mend (the field's thanks), stonehide (loam), root (the
 * vine catch), venom (palegill dust), quicken (the long swathe).
 * Pages read: venom (vsState, the adder's bed), burn (hitState and
 * vsState, stubble fire), mend (stateRiding, sap rising), root
 * (vsState, the row lies down). Hinges the herbalist's venom, an
 * arx hand's burn, and any healer's mend are expected to meet.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FARMING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5..15: three identities
  {
    id: 'fields_thanks',
    skill: 'farming',
    unlockLevel: 5,
    focusCost: 1,
    name: "Field's Thanks",
    desc: 'The soil gives back what you put into it. Harvests sometimes leave you mending.',
    color: '#7fbf62',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:fields_thanks', name: "Field's Thanks",
          trigger: { on: 'gather', chance: 0.5 },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 60 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The green lingers on the hands. The mend runs longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fields_thanks', name: "Field's Thanks",
              trigger: { on: 'gather', chance: 0.6 },
              action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Richer soil, richer thanks. The mend closes more each second.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fields_thanks', name: "Field's Thanks",
              trigger: { on: 'gather', chance: 0.7 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Nearly every basket answers. The mend runs a full five seconds and rests less.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fields_thanks', name: "Field's Thanks",
              trigger: { on: 'gather', chance: 0.8 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'ploughmans_shoulders',
    skill: 'farming',
    unlockLevel: 10,
    focusCost: 1,
    name: "Ploughman's Shoulders",
    desc: 'Years behind the plough put beef on the frame. More health, and it comes back on its own.',
    color: '#b08a4e',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
    ],
    ranks: [
      {
        note: 'The frame fills out. More health still.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
      {
        note: 'A ploughman heals like a ploughman eats. Health returns twice as quick.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'Ox shoulders. Most health, quick return, and the hide turns a little steel.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'between_the_rows',
    skill: 'farming',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Between the Rows',
    desc: 'Plot to plot, hoe on the shoulder. Out of a fight you walk quicker and mend as you go.',
    color: '#9db85a',
    effects: [
      {
        kind: 'when',
        cond: { when: 'outOfCombat' },
        grant: { name: 'Between the Rows', speedMult: 1.05, regenPer4s: 1 },
      },
    ],
    ranks: [
      {
        note: 'The path between plots is worn smooth. Quicker still.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Between the Rows', speedMult: 1.06, regenPer4s: 1 },
          },
        ],
      },
      {
        note: 'The walk itself is a rest. Quicker yet, and the mend doubles.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Between the Rows', speedMult: 1.07, regenPer4s: 2 },
          },
        ],
      },
      {
        note: 'You reach the next job already working. Quickest, and every gather goes faster too.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outOfCombat' },
            grant: { name: 'Between the Rows', speedMult: 1.08, regenPer4s: 2, gatherSpeed: 1.06 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 20..50: the verbs arrive
  {
    id: 'green_thumb',
    skill: 'farming',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Green Thumb',
    desc: 'Some harvests hand you next season for free. Seeds sometimes return.',
    color: '#8ac46a',
    effects: [{ kind: 'perk', perk: 'seedRefundChance', magnitude: 0.1 }],
    ranks: [
      {
        note: 'The seed comes home a little oftener.',
        effects: [{ kind: 'perk', perk: 'seedRefundChance', magnitude: 0.13 }],
      },
      {
        note: 'You pull the plant, not the root. Oftener still.',
        effects: [{ kind: 'perk', perk: 'seedRefundChance', magnitude: 0.16 }],
      },
      {
        note: 'One harvest in five returns its seed, and the practiced hand reads three levels deeper.',
        effects: [
          { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'farming', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'loamskin',
    skill: 'farming',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Loamskin',
    desc: 'Field mud dries into a second hide. Being struck sometimes coats you in stone.',
    color: '#8a6e48',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:loamskin', name: 'Loamskin',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The mud cakes thicker. The coats hold longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:loamskin', name: 'Loamskin',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 130 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'You are muddy more often than not. The coats come oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:loamskin', name: 'Loamskin',
              trigger: { on: 'hurt', chance: 0.3, },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 130 },
              icd: 260,
            },
          },
        ],
      },
      {
        note: 'Clay to the elbows. Oftener, longer, and it rests least.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:loamskin', name: 'Loamskin',
              trigger: { on: 'hurt', chance: 0.35 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 220,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'vine_catch',
    skill: 'farming',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Vine Catch',
    desc: 'The bramblevine taught you where a foot goes wrong. Your blows sometimes root a foe.',
    color: '#5f8f3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:vine_catch', name: 'Vine Catch',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'root', power: 0, ticks: 40 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The vine finds the ankle oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:vine_catch', name: 'Vine Catch',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The snare re-sets sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:vine_catch', name: 'Vine Catch',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 170,
            },
          },
        ],
      },
      {
        note: 'Bramble everywhere. Oftener, soonest, and rooted foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:vine_catch', name: 'Vine Catch',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 150,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'the_composter',
    skill: 'farming',
    unlockLevel: 35,
    focusCost: 1,
    name: 'The Composter',
    desc: 'Your heaps close early. Rot respects experience.',
    color: '#6e5433',
    effects: [{ kind: 'perk', perk: 'compostDiscount', magnitude: 2 }],
    ranks: [
      {
        note: 'You know a ready heap by the smell. Batches close three worth sooner.',
        effects: [{ kind: 'perk', perk: 'compostDiscount', magnitude: 3 }],
      },
      {
        note: 'You turn the heap in your sleep. Four worth sooner.',
        effects: [{ kind: 'perk', perk: 'compostDiscount', magnitude: 4 }],
      },
      {
        note: 'Five worth sooner, and the heap\'s warmth gets into the bones. More health.',
        effects: [
          { kind: 'perk', perk: 'compostDiscount', magnitude: 5 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
    ],
  },
  {
    id: 'barley_fed',
    skill: 'farming',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Barley Fed',
    desc: 'A farmer eats what a farmer grows. While well fed you hit harder and stand sturdier.',
    color: '#d9b45c',
    effects: [
      {
        kind: 'when',
        cond: { when: 'wellFed' },
        grant: { name: 'Barley Fed', dmgMult: 1.05, armor: 2 },
      },
    ],
    ranks: [
      {
        note: 'A second helping. Harder still.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wellFed' },
            grant: { name: 'Barley Fed', dmgMult: 1.06, armor: 2 },
          },
        ],
      },
      {
        note: 'Bread, bacon, and a full keg. Harder, sturdier.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wellFed' },
            grant: { name: 'Barley Fed', dmgMult: 1.07, armor: 3 },
          },
        ],
      },
      {
        note: 'Plough horse strength. Hardest, sturdiest, and a fed body knits its own wounds.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wellFed' },
            grant: { name: 'Barley Fed', dmgMult: 1.08, armor: 4, regenPer4s: 1 },
          },
        ],
      },
    ],
  },
  {
    id: 'marketeer',
    skill: 'farming',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Marketeer',
    desc: 'The larder boards know your name. Orders pay a tenth more to you.',
    color: '#e8c04c',
    effects: [{ kind: 'perk', perk: 'larderSellMult', magnitude: 1.1 }],
    ranks: [
      {
        note: 'The clerks wave you to the front. Orders pay better.',
        effects: [{ kind: 'perk', perk: 'larderSellMult', magnitude: 1.13 }],
      },
      {
        note: 'You set the price and they write it down. Better still.',
        effects: [{ kind: 'perk', perk: 'larderSellMult', magnitude: 1.16 }],
      },
      {
        note: 'A fifth over the board, and the cart knows every road. You walk quicker.',
        effects: [
          { kind: 'perk', perk: 'larderSellMult', magnitude: 1.2 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'adderstongue_bed',
    skill: 'farming',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Adderstongue Bed',
    desc: 'You grow the dark bed and know what its venom does. Poisoned foes take more from you.',
    color: '#6f8f2e',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 10 } }],
    ranks: [
      {
        note: 'You read a poisoned body like a wilting leaf. More still.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 12 } }],
      },
      {
        note: 'You know where the venom sits. More yet, and a little of the green rides every blow.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 14 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 6 } },
        ],
      },
      {
        note: 'Most against the poisoned, and the green in your blows runs strongest.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 16 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 10 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 55..75: the outward seats
  {
    id: 'palegill_dust',
    skill: 'farming',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Palegill Dust',
    desc: 'Palegill spores cling under the nails. Your blows sometimes lay venom.',
    color: '#a0c050',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:palegill_dust', name: 'Palegill Dust',
          trigger: { on: 'hit', chance: 0.2 },
          action: { do: 'status', status: 'venom', power: 2, ticks: 80 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'The spores take longer to shake. Venom lasts longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:palegill_dust', name: 'Palegill Dust',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 100 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'A ripe log throws more dust. Venom bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:palegill_dust', name: 'Palegill Dust',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'You are never quite clean of it. Oftener, longer, and the hand rests least.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:palegill_dust', name: 'Palegill Dust',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 120 },
              icd: 90,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'bounty',
    skill: 'farming',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Bounty',
    desc: 'The field answers the practiced hand. Harvests sometimes come double.',
    color: '#a8b84a',
    effects: [{ kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.1 }],
    ranks: [
      {
        note: 'The basket overflows a little oftener.',
        effects: [{ kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.13 }],
      },
      {
        note: 'Doubles come oftener still.',
        effects: [{ kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.16 }],
      },
      {
        note: 'One harvest in five doubles, and the doubled basket sometimes hands back its seed.',
        effects: [
          { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.2 },
          { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.05 },
        ],
      },
    ],
  },
  {
    id: 'stubble_fire',
    skill: 'farming',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Stubble Fire',
    desc: 'You burn the stubble off every autumn. Striking a burning foe may burst the flame outward.',
    color: '#d4783a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:stubble_fire', name: 'Stubble Fire',
          trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
          action: { do: 'nova', damage: 12, radius: 2.4 },
          icd: 200,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'Drier stubble. The burst bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stubble_fire', name: 'Stubble Fire',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'nova', damage: 14, radius: 2.4 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'You know which way the wind takes it. Harder, and it wakes oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stubble_fire', name: 'Stubble Fire',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'nova', damage: 16, radius: 2.6 },
              icd: 180,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The whole field goes up. Widest, hardest, soonest, and burning foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:stubble_fire', name: 'Stubble Fire',
              trigger: { on: 'hitState', status: 'burn', chance: 0.4 },
              action: { do: 'nova', damage: 18, radius: 2.8 },
              icd: 160,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'sap_rising',
    skill: 'farming',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Sap Rising',
    desc: 'A mending body is a growing body. While a mend rides you, you hit harder and move quicker.',
    color: '#7ad0a0',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'mend' },
        grant: { name: 'Sap Rising', dmgMult: 1.06, speedMult: 1.03 },
      },
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
    ],
    ranks: [
      {
        note: 'The sap runs quicker. Harder still while mending.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Sap Rising', dmgMult: 1.08, speedMult: 1.03 },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
      {
        note: 'Green to the fingertips. Harder, quicker, and the body mends on its own besides.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Sap Rising', dmgMult: 1.09, speedMult: 1.04 },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'Spring in the veins. Hardest, quickest, and the mending hand finds the soft place.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Sap Rising', dmgMult: 1.1, speedMult: 1.05, critPct: 2 },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
  {
    id: 'long_swathe',
    skill: 'farming',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Long Swathe',
    desc: 'The scythe swings on a count, and the count carries. Every sixth blow quickens your hand.',
    color: '#e0c060',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:long_swathe', name: 'Long Swathe',
          trigger: { on: 'cadence', every: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The count shortens. Every fifth blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:long_swathe', name: 'Long Swathe',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The rhythm holds longer between swings.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:long_swathe', name: 'Long Swathe',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 80,
            },
          },
        ],
      },
      {
        note: 'Every fourth blow, held longest, and the reaching arm swings truer besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:long_swathe', name: 'Long Swathe',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 8 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 80: the master's seat
  {
    id: 'the_row_lies_down',
    skill: 'farming',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Row Lies Down',
    desc: "The glaive remembers the harvest. Reaper's Turn is yours to seat; the long arm bites deep.",
    color: '#c9a44a',
    effects: [
      { kind: 'art', ability: 'reapers_turn' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 8 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
    ],
    ranks: [
      {
        note: 'The turn comes wider. The reaching arm bites harder, the frame carries more.',
        effects: [
          { kind: 'art', ability: 'reapers_turn' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 10 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'A whole row in one turn. Harder yet, and hardier.',
        effects: [
          { kind: 'art', ability: 'reapers_turn' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
        ],
      },
      {
        note: 'The master reaper. Hardest, hardiest, and a rooted foe cannot step out of the swathe.',
        effects: [
          { kind: 'art', ability: 'reapers_turn' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 14 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 12 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, farming's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const FARMING_LICENSES: CallingLicense[] = [
  // The field's thanks: every harvest may leave a mend on the harvester.
  { calling: 'fields_thanks', status: 'mend', via: 'lay:boon' },
  // Loamskin: field mud dries to stone coats.
  { calling: 'loamskin', status: 'stonehide', via: 'lay:boon' },
  // The vine catch lays root, and at IV reads it back through the edge.
  { calling: 'vine_catch', status: 'root', via: 'lay:status' },
  { calling: 'vine_catch', status: 'root', via: 'read:vsState' },
  // The adder's bed reads venom (the herbalist's and the sneak's page too).
  { calling: 'adderstongue_bed', status: 'venom', via: 'read:vsState' },
  // Palegill dust lays venom.
  { calling: 'palegill_dust', status: 'venom', via: 'lay:status' },
  // Stubble fire answers a burning body (an arx hand's or a cook's fire) twice.
  { calling: 'stubble_fire', status: 'burn', via: 'read:hitState' },
  { calling: 'stubble_fire', status: 'burn', via: 'read:vsState' },
  // Sap rising reads a mend riding the body, whoever laid it.
  { calling: 'sap_rising', status: 'mend', via: 'read:stateRiding' },
  // The long swathe lays quicken on the reaper.
  { calling: 'long_swathe', status: 'quicken', via: 'lay:boon' },
  // The row lies down: rooted foes cannot step out of the master's turn.
  { calling: 'the_row_lies_down', status: 'root', via: 'read:vsState' },
];

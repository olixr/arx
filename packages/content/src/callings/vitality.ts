/**
 * THE FILLED HALL — vitality's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE HALE, THE LONG-LIVED, THE ONES WHO GET BACK UP. Vitality is the
 * body itself: hearts, breath, blood, hunger, sleep, endurance. The
 * ladder's arc — three clean identities (thick blood, a full belly, a
 * body that clots), then the verbs (the crossing that puts you back on
 * your feet, the unhurt body that works quicker, the eye that reads a
 * bleeding foe), then the long-haul packages (blood that hardens to
 * stone, the kill that feeds, the mend that knits bone, the taste of
 * iron, the desperation stand, the ward bone deep, the quickening
 * blood) and at 80 the master's seat: SCARWORN, the art that collects
 * on every scar, licensed to the oldest blood in the hall.
 *
 * Pages: LAYS mend (15), stonehide (40), quicken (75); READS bleed
 * (35 hitState + vsState, 55 stateRiding) and mend (50 stateRiding).
 * Outward: 30 (every trade works quicker unhurt), 35/55/65 (a hale
 * body fights harder), 75 (the quickened hand), 80 (a combat art).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const VITALITY_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------------ 5
  {
    id: 'hale_and_whole',
    skill: 'vitality',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Hale and Whole',
    desc: 'The blood runs thick and warm in you. +8 health to lose before you fall.',
    color: '#e8b898',
    effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 8 } }],
    ranks: [
      { note: 'Broader in the chest: +10 max health.', effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 10 } }] },
      { note: 'Thicker still: +12 max health.', effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 12 } }] },
      {
        note: '+14 max health, and the blood mends itself a little every four seconds.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 10
  {
    id: 'trencherman',
    skill: 'vitality',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Trencherman',
    desc: 'A trencherman eats to walk. While a meal sits in you, your feet are quicker.',
    color: '#e0a070',
    effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Belly', speedMult: 1.05 } }],
    ranks: [
      {
        note: 'A fuller belly walks quicker: +6% speed while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Belly', speedMult: 1.06 } }],
      },
      {
        note: '+7% speed while fed, and the meal knits a little flesh as you go.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Belly', speedMult: 1.07, regenPer4s: 1 } }],
      },
      {
        note: '+8% speed and +2 health every four seconds, for as long as the meal lasts.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Belly', speedMult: 1.08, regenPer4s: 2 } }],
      },
    ],
  },
  // ------------------------------------------------------------ 15
  {
    id: 'quick_clotting',
    skill: 'vitality',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Quick Clotting',
    desc: 'Your blood knows its work. A blow that reaches flesh may raise a mend in you.',
    color: '#cc5540',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:quick_clotting', name: 'Clotting',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
          icd: 400, element: 'blood',
        },
      }
    ],
    ranks: [
      {
        note: 'The mend runs deeper: 3 health a second for four seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:quick_clotting', name: 'Clotting',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 400, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The clot holds longer: 3 health a second for five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:quick_clotting', name: 'Clotting',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
              icd: 400, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'One wound in four clots, 4 health a second for five seconds, resting less between.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:quick_clotting', name: 'Clotting',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 340, element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 20 (founding)
  {
    id: 'hearty_meals',
    skill: 'vitality',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Hearty Meals',
    desc: 'Every meal goes further. Food heals a quarter more.',
    color: '#d98a5a',
    effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.25 }],
    ranks: [
      { note: 'Food heals a third more.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.35 }] },
      { note: 'Food heals half again.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.5 }] },
      {
        note: 'Food heals half again, and a meal in you thickens the hide: +4 armor while fed.',
        effects: [
          { kind: 'perk', perk: 'foodHealMult', magnitude: 1.5 },
          { kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Well Supped', armor: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 25
  {
    id: 'back_on_your_feet',
    skill: 'vitality',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Back on Your Feet',
    desc: 'You are one of the ones who get up. Dropping to a third of your health closes 24 of it.',
    color: '#f0c090',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:back_on_your_feet', name: 'Back on Your Feet',
          trigger: { on: 'lowHp', pct: 0.35 },
          action: { do: 'heal', amount: 24 },
          icd: 600, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'You rise with more in you: heals 30.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_on_your_feet', name: 'Back on Your Feet',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 30 },
              icd: 600, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Heals 36, and you may rise again sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_on_your_feet', name: 'Back on Your Feet',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 36 },
              icd: 500, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Heals 40 at the crossing, and the body carries +8 health besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_on_your_feet', name: 'Back on Your Feet',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 40 },
              icd: 500, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 30 (outward: every trade)
  {
    id: 'sound_wind',
    skill: 'vitality',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Sound Wind',
    desc: 'An unhurt body never tires at the work. Near full health, every harvest goes quicker.',
    color: '#c78a6a',
    effects: [{ kind: 'when', cond: { when: 'hpAbove', frac: 0.85 }, grant: { name: 'Sound Wind', gatherSpeed: 1.08 } }],
    ranks: [
      {
        note: 'The wind holds: harvests 10% quicker while unhurt.',
        effects: [{ kind: 'when', cond: { when: 'hpAbove', frac: 0.85 }, grant: { name: 'Sound Wind', gatherSpeed: 1.1 } }],
      },
      {
        note: 'Harvests 12% quicker while unhurt.',
        effects: [{ kind: 'when', cond: { when: 'hpAbove', frac: 0.85 }, grant: { name: 'Sound Wind', gatherSpeed: 1.12 } }],
      },
      {
        note: 'Harvests 12% quicker and the walk between them 4% quicker, while unhurt.',
        effects: [
          { kind: 'when', cond: { when: 'hpAbove', frac: 0.85 }, grant: { name: 'Sound Wind', gatherSpeed: 1.12, speedMult: 1.04 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 35 (reads bleed; outward: the fight)
  {
    id: 'red_reckoning',
    skill: 'vitality',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Red Reckoning',
    desc: 'You know blood when you see it. Bleeding foes take more, and a blow on one lifts your arm.',
    color: '#b0362c',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:red_reckoning', name: 'Red Reckoning',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
          action: { do: 'surge', stat: 'damage', pct: 10, ticks: 80 },
          icd: 240, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'Bleeding foes take 10% more; the surge lifts your blows 12%.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_reckoning', name: 'Red Reckoning',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
              icd: 240, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Bleeding foes take 12% more; the surge holds five seconds.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_reckoning', name: 'Red Reckoning',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'surge', stat: 'damage', pct: 12, ticks: 100 },
              icd: 240, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Bleeding foes take 14% more; a blow in three on them lifts your arm 15% for five seconds.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_reckoning', name: 'Red Reckoning',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.33 },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
              icd: 220, element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 40 (lays stonehide)
  {
    id: 'old_scars',
    skill: 'vitality',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Old Scars',
    desc: 'Every wound taught the skin something. Five blows taken coat you in stone.',
    color: '#9c6a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:old_scars', name: 'Old Scars',
          trigger: { on: 'stacks', per: 'hurt', count: 5 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 200, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The stone stays longer: seven and a half seconds a coat.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_scars', name: 'Old Scars',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 150 },
              icd: 200, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The skin learns quicker: four blows taken coat you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_scars', name: 'Old Scars',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 150 },
              icd: 200, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Four blows coat you for nine seconds, and the old scars alone are worth +4 armor.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_scars', name: 'Old Scars',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 180, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 45
  {
    id: 'fed_by_the_fight',
    skill: 'vitality',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Fed by the Fight',
    desc: 'A long fight is a long meal. Every kill closes 16 of your wounds.',
    color: '#a83a2e',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:fed_by_the_fight', name: 'Fed by the Fight',
          trigger: { on: 'kill' },
          action: { do: 'heal', amount: 16 },
          icd: 100, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'Each kill closes 20.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fed_by_the_fight', name: 'Fed by the Fight',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 20 },
              icd: 100, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Each kill closes 24, and the meals come closer together.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fed_by_the_fight', name: 'Fed by the Fight',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 24 },
              icd: 80, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Each kill closes 28, and the fight itself keeps you at pace: +12 haste ticks on a kill.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:fed_by_the_fight', name: 'Fed by the Fight',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 28 },
              icd: 80, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 50 (reads mend)
  {
    id: 'knit_bone',
    skill: 'vitality',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Knit Bone',
    desc: 'A mend in you knits more than flesh. While mending, the bone hardens: +6 armor.',
    color: '#d8a888',
    effects: [{ kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Knit Bone', armor: 6 } }],
    ranks: [
      {
        note: '+8 armor while a mend rides you.',
        effects: [{ kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Knit Bone', armor: 8 } }],
      },
      {
        note: '+8 armor and +2 health every four seconds while mending.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Knit Bone', armor: 8, regenPer4s: 2 } },
        ],
      },
      {
        note: '+10 armor and +2 health every four seconds while mending, and +8 max health always.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Knit Bone', armor: 10, regenPer4s: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 55 (reads bleed on YOU; outward: the fight)
  {
    id: 'taste_of_iron',
    skill: 'vitality',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Taste of Iron',
    desc: 'Your own blood in your mouth wakes you up. While you bleed, you strike harder and truer.',
    color: '#8c2f26',
    effects: [
      { kind: 'when', cond: { when: 'stateRiding', status: 'bleed' }, grant: { name: 'Taste of Iron', dmgMult: 1.06, critPct: 2 } },
    ],
    ranks: [
      {
        note: 'Bleeding, you strike 8% harder.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'bleed' }, grant: { name: 'Taste of Iron', dmgMult: 1.08, critPct: 2 } },
        ],
      },
      {
        note: 'Bleeding, you strike 8% harder and crit 3% more.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'bleed' }, grant: { name: 'Taste of Iron', dmgMult: 1.08, critPct: 3 } },
        ],
      },
      {
        note: 'Bleeding, you strike 10% harder, crit 4% more, and the hand comes 5% quicker.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'bleed' },
            grant: { name: 'Taste of Iron', dmgMult: 1.1, critPct: 4, attackSpeedMult: 1.05 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 60 (founding)
  {
    id: 'ironblood',
    skill: 'vitality',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironblood',
    desc: 'Wounds close on their own schedule, and iron blood may throw off what a wound carries.',
    color: '#c4372a',
    effects: [
      { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ironblood', name: 'Ironblood',
          trigger: { on: 'hurt', chance: 0.15 },
          action: { do: 'cleanse' },
          icd: 300, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: '+2 health every four seconds, +14 max health; a blow in six throws off poison and burning.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironblood', name: 'Ironblood',
              trigger: { on: 'hurt', chance: 0.15 },
              action: { do: 'cleanse' },
              icd: 300, element: 'blood',
            },
          },
        ],
      },
      {
        note: '+3 health every four seconds, +16 max health; the blood cleanses a blow in five.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironblood', name: 'Ironblood',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'cleanse' },
              icd: 300, element: 'blood',
            },
          },
        ],
      },
      {
        note: '+4 health each four seconds, +20 max health, quicker cleansing, and +4 thorns.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 4 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironblood', name: 'Ironblood',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'cleanse' },
              icd: 240, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 65 (outward: the desperation stand)
  {
    id: 'bloody_but_unbowed',
    skill: 'vitality',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Bloody but Unbowed',
    desc: 'Half your blood on the ground, head still up. Under half health you harden and hit harder.',
    color: '#b8503c',
    effects: [
      { kind: 'when', cond: { when: 'hpBelow', frac: 0.5 }, grant: { name: 'Unbowed', armor: 6, dmgMult: 1.06 } },
    ],
    ranks: [
      {
        note: 'Under half health: +8 armor, +6% damage.',
        effects: [
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.5 }, grant: { name: 'Unbowed', armor: 8, dmgMult: 1.06 } },
        ],
      },
      {
        note: 'Under half health: +8 armor, +8% damage.',
        effects: [
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.5 }, grant: { name: 'Unbowed', armor: 8, dmgMult: 1.08 } },
        ],
      },
      {
        note: 'Under half health: +10 armor, +10% damage, and every landed blow drinks a twentieth back.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.5 },
            grant: { name: 'Unbowed', armor: 10, dmgMult: 1.1, meleeLifesteal: 0.05 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 70
  {
    id: 'bone_deep',
    skill: 'vitality',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Bone Deep',
    desc: 'The toughness goes bone deep. A blow that finds flesh may raise a shell over the rest.',
    color: '#a07060',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:bone_deep', name: 'Bone Deep',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'ward', absorb: 40, ticks: 150 },
          icd: 400, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The shell holds 50, the body +12 health.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bone_deep', name: 'Bone Deep',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'ward', absorb: 50, ticks: 150 },
              icd: 400, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The shell holds 60, the body +14 health.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bone_deep', name: 'Bone Deep',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'ward', absorb: 60, ticks: 150 },
              icd: 400, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The shell holds 70 for eight seconds, the body +16 health, and it rises again sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bone_deep', name: 'Bone Deep',
              trigger: { on: 'hurt', chance: 0.22 },
              action: { do: 'ward', absorb: 70, ticks: 160 },
              icd: 340, element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 75 (lays quicken; outward: the quickened hand)
  {
    id: 'blood_rising',
    skill: 'vitality',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Blood Rising',
    desc: 'The long fight warms the blood until it sings. Every sixth landed blow quickens your hand.',
    color: '#e07a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:blood_rising', name: 'Blood Rising',
          trigger: { on: 'cadence', every: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 200, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The quickening holds five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:blood_rising', name: 'Blood Rising',
              trigger: { on: 'cadence', every: 6 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 200, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Every fifth landed blow quickens you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:blood_rising', name: 'Blood Rising',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 200, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Every fifth blow quickens you six seconds, and the singing blood crits 3% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:blood_rising', name: 'Blood Rising',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 180, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 80, the capstone (THE MASTER'S LICENSE)
  {
    id: 'elder_blood',
    skill: 'vitality',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Elder Blood',
    desc: 'The oldest blood in the hall. Scarworn is yours to cast, and a deeper well of health.',
    color: '#7a2a22',
    effects: [
      { kind: 'art', ability: 'scarworn' },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
    ],
    ranks: [
      {
        note: 'Scarworn casts at the second rank; +16 max health.',
        effects: [
          { kind: 'art', ability: 'scarworn' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
        ],
      },
      {
        note: 'Scarworn casts at the third rank; +20 max health.',
        effects: [
          { kind: 'art', ability: 'scarworn' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
        ],
      },
      {
        note: 'Scarworn at its fullest; +24 max health, and the old blood mends 2 every four seconds.',
        effects: [
          { kind: 'art', ability: 'scarworn' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 24 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, vitality's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const VITALITY_LICENSES: CallingLicense[] = [
  // Quick Clotting lays a mend on the wounded body.
  { calling: 'quick_clotting', status: 'mend', via: 'lay:boon' },
  // Red Reckoning reads a bleeding foe twice: THE READING EDGE and the hitState wake.
  { calling: 'red_reckoning', status: 'bleed', via: 'read:vsState' },
  { calling: 'red_reckoning', status: 'bleed', via: 'read:hitState' },
  // Old Scars coats the wearer in stone.
  { calling: 'old_scars', status: 'stonehide', via: 'lay:boon' },
  // Knit Bone reads a mend riding the wearer (its own, a gardener's, a keeper's balm).
  { calling: 'knit_bone', status: 'mend', via: 'read:stateRiding' },
  // Taste of Iron reads the wearer's own bleeding (the wild's fangs, a reaver's knife).
  { calling: 'taste_of_iron', status: 'bleed', via: 'read:stateRiding' },
  // Blood Rising quickens the wearer through the book.
  { calling: 'blood_rising', status: 'quicken', via: 'lay:boon' },
];

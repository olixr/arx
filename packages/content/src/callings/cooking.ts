/**
 * THE FILLED HALL — cooking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE HEARTH's arc: the eater (the ladle's share, the fed fighter, both
 * pans going), the palate (the burn smelled before it comes, the fat
 * that spits onto a foe, coals raked hot), the larder (nothing wasted,
 * the cellar's cold laid on what burns, the pot that is always on, the
 * crackling that hardens), the field kitchen (the boning knife's arm,
 * the fanned coals, the pot that boils over, every pot at once), and
 * the hearth's master: the hand that spreads a fan of embers.
 * Pages: LAYS burn / chill / mend / stonehide / quicken; READS burn
 * (vsState, hitState, stateApplied), bleed (vsState).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const COOKING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5: the eater
  {
    id: 'ladles_share',
    skill: 'cooking',
    unlockLevel: 5,
    focusCost: 1,
    name: "Ladle's Share",
    desc: 'The cook eats first and eats best. Food you eat heals a quarter again as much.',
    color: '#e8a05a',
    effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.25 }],
    ranks: [
      { note: 'A fuller ladle: food heals 35% more.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.35 }] },
      { note: 'The good bowl is yours: food heals 45% more.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.45 }] },
      {
        note: 'Well kept: food heals half again as much, and you carry +8 health.',
        effects: [
          { kind: 'perk', perk: 'foodHealMult', magnitude: 1.5 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 10: the fed fighter
  {
    id: 'fed_and_fierce',
    skill: 'cooking',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Fed and Fierce',
    desc: 'Nobody fights well hungry, and you are never hungry. While fed you hit 5% harder.',
    color: '#cf7a2e',
    effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Fed and Fierce', dmgMult: 1.05 } }],
    ranks: [
      {
        note: 'A better supper: 6% harder while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Fed and Fierce', dmgMult: 1.06 } }],
      },
      {
        note: 'The meal sits in the arm: 6% harder and +2% crit while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Fed and Fierce', dmgMult: 1.06, critPct: 2 } }],
      },
      {
        note: 'Fed to the eyes: 8% harder and +2% crit while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Fed and Fierce', dmgMult: 1.08, critPct: 2 } }],
      },
    ],
  },
  // ------------------------------------------------------ 15: both pans
  {
    id: 'both_pans_going',
    skill: 'cooking',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Both Pans Going',
    desc: 'One hand stirs while the other turns. You cook 10% faster.',
    color: '#c9a26e',
    effects: [{ kind: 'craftSpeed', skill: 'cooking', mult: 0.9 }],
    ranks: [
      { note: 'The second pan never waits: cook 14% faster.', effects: [{ kind: 'craftSpeed', skill: 'cooking', mult: 0.86 }] },
      { note: 'Three pans, one cook: cook 18% faster.', effects: [{ kind: 'craftSpeed', skill: 'cooking', mult: 0.82 }] },
      {
        note: 'The whole range at once: cook 22% faster, +3 cooking.',
        effects: [
          { kind: 'craftSpeed', skill: 'cooking', mult: 0.78 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'cooking', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 20: founding
  {
    id: 'seasoned_palate',
    skill: 'cooking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Seasoned Palate',
    desc: 'You smell the turn before it comes. Far fewer meals burn.',
    color: '#d9825a',
    effects: [{ kind: 'perk', perk: 'burnChanceMult', magnitude: 0.7 }],
    ranks: [
      { note: 'The nose sharpens: burns fall by 40%.', effects: [{ kind: 'perk', perk: 'burnChanceMult', magnitude: 0.6 }] },
      {
        note: 'Half as many burns, and a palate that knows bad meat: poison and fire tick 8% softer.',
        effects: [
          { kind: 'perk', perk: 'burnChanceMult', magnitude: 0.5 },
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.92 },
        ],
      },
      {
        note: 'Almost nothing burns on your watch, and every lingering wound ticks 12% softer.',
        effects: [
          { kind: 'perk', perk: 'burnChanceMult', magnitude: 0.45 },
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.88 },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 25: the fat spits
  {
    id: 'spitting_fat',
    skill: 'cooking',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Spitting Fat',
    desc: 'Years of hot fat off the pan. Your blows sometimes catch a foe alight.',
    color: '#ff8a3c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:spitting_fat',
          name: 'Spitting Fat',
          trigger: { on: 'hit', chance: 0.14 },
          action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
          icd: 90,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The pan spits oftener: 17% a blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:spitting_fat',
              name: 'Spitting Fat',
              trigger: { on: 'hit', chance: 0.17 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
              icd: 90,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The fire keeps hold four seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:spitting_fat',
              name: 'Spitting Fat',
              trigger: { on: 'hit', chance: 0.17 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 80 },
              icd: 90,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Grease and flame: 20% a blow, the burn holds longer, and ember bites 6% harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:spitting_fat',
              name: 'Spitting Fat',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 90 },
              icd: 80,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 30: the coals
  {
    id: 'coal_raker',
    skill: 'cooking',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Coal Raker',
    desc: 'You know how to bank a fire and how to wake it. Ember damage bites 8% harder.',
    color: '#e0663a',
    effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 8 } }],
    ranks: [
      { note: 'The coals rake hotter: ember +10%.', effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 10 } }] },
      {
        note: 'Ember +12%, and what already burns takes 6% more from you.',
        effects: [
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 6 } },
        ],
      },
      {
        note: 'White heat: ember +14%, burning foes take 8% more from you.',
        effects: [
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 35: the stockpot
  {
    id: 'stockpot_thrift',
    skill: 'cooking',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Stockpot Thrift',
    desc: 'Bones, peel, and trimmings all go in the pot. One dish in ten costs nothing.',
    color: '#a8905c',
    effects: [{ kind: 'materialSave', skill: 'cooking', chance: 0.1 }],
    ranks: [
      { note: 'The pot stretches further: 13% of dishes cost nothing.', effects: [{ kind: 'materialSave', skill: 'cooking', chance: 0.13 }] },
      { note: 'Nothing goes to the pigs: 16% of dishes cost nothing.', effects: [{ kind: 'materialSave', skill: 'cooking', chance: 0.16 }] },
      {
        note: 'A dish in five costs nothing, and you eat the trimmings: +8 health.',
        effects: [
          { kind: 'materialSave', skill: 'cooking', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 40: the cellar
  {
    id: 'cellar_cold',
    skill: 'cooking',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Cellar Cold',
    desc: 'You keep the ice house as well as the hearth. Strike a burning foe and cold may grip it.',
    color: '#9cc8d8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:cellar_cold',
          name: 'Cellar Cold',
          trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
          action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
          icd: 100,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The cold comes up quicker: 35% a blow on a burning foe.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cellar_cold',
              name: 'Cellar Cold',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
              icd: 100,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The chill holds five seconds and rests less.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cellar_cold',
              name: 'Cellar Cold',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 100 },
              icd: 90,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Hearth and ice house: 40% a blow, the chill holds longer, and frost bites 6% harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cellar_cold',
              name: 'Cellar Cold',
              trigger: { on: 'hitState', status: 'burn', chance: 0.4 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 110 },
              icd: 80,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 45: the pot on the fire
  {
    id: 'pot_always_on',
    skill: 'cooking',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Pot Always On',
    desc: 'There is always something warm on your fire. Under 40% health you sup and mend.',
    color: '#d8c9a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:pot_always_on',
          name: 'Pot Always On',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
          icd: 600,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'A richer broth: mends 4 a second.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_always_on',
              name: 'Pot Always On',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 600,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The bowl is deeper: mends six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_always_on',
              name: 'Pot Always On',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 600,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The stock never runs dry: mends 5 a second, rests 25s, and +1 regen always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_always_on',
              name: 'Pot Always On',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 500,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 50: the crackling
  {
    id: 'crackling',
    skill: 'cooking',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Crackling',
    desc: 'Skin goes hard in the heat. Take six blows and a crust of stone forms on you.',
    color: '#b86a3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:crackling',
          name: 'Crackling',
          trigger: { on: 'stacks', per: 'hurt', count: 6 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
          icd: 200,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The crust forms at five blows.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:crackling',
              name: 'Crackling',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The crust holds eight seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:crackling',
              name: 'Crackling',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Rind and bone: four blows raise the crust, it holds nine seconds, and +4 armor always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:crackling',
              name: 'Crackling',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 180,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 55: the boning knife
  {
    id: 'boning_knife',
    skill: 'cooking',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Boning Knife',
    desc: 'You have taken a thousand carcasses apart. One-hand blades cut 8% deeper.',
    color: '#a8383d',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } }],
    ranks: [
      { note: 'The knife finds the joint: one-hand +10%.', effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } }] },
      {
        note: 'One-hand +12%, and a bleeding foe takes 8% more from you.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
      {
        note: "Butcher's certainty: one-hand +14%, bleeding foes take 10% more, +2% crit.",
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 60: founding
  {
    id: 'field_kitchen',
    skill: 'cooking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Field Kitchen',
    desc: 'Your cooking keeps working after the plate is clean. Food buffs last longer.',
    color: '#8c5a3c',
    effects: [{ kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.25 }],
    ranks: [
      { note: 'The meal carries further: food buffs last 35% longer.', effects: [{ kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.35 }] },
      {
        note: 'Food buffs last 40% longer, and while fed you wear +3 armor.',
        effects: [
          { kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.4 },
          { kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Field Kitchen', armor: 3 } },
        ],
      },
      {
        note: 'The camp eats and the camp holds: buffs last half again, +4 armor and +1 regen while fed.',
        effects: [
          { kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.5 },
          { kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Field Kitchen', armor: 4, regenPer4s: 1 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 65: the fanned coals
  {
    id: 'fanned_coals',
    skill: 'cooking',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Fanned Coals',
    desc: 'A fire you set is a fire you feed. Burn a foe by art or edge and press 12% harder.',
    color: '#f0a05a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:fanned_coals',
          name: 'Fanned Coals',
          trigger: { on: 'stateApplied', status: 'burn' },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
          icd: 240,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The bellows work harder: +14% damage.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fanned_coals',
              name: 'Fanned Coals',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 14, ticks: 80 },
              icd: 240,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The press holds five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fanned_coals',
              name: 'Fanned Coals',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 14, ticks: 100 },
              icd: 240,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Roaring draught: +18% damage for 5s, rests 10s, and +2% crit always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fanned_coals',
              name: 'Fanned Coals',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 200,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 70: the pot boils over
  {
    id: 'pot_boils_over',
    skill: 'cooking',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Pot Boils Over',
    desc: 'Knock the cook and the pot goes with you. Struck, you sometimes scald everything near.',
    color: '#e6b35a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:pot_boils_over',
          name: 'Pot Boils Over',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'nova', damage: 10, radius: 2.2 },
          icd: 200,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The scald bites deeper: 12 to all near.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_boils_over',
              name: 'Pot Boils Over',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'nova', damage: 12, radius: 2.2 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'A bigger pot: the scald reaches farther.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_boils_over',
              name: 'Pot Boils Over',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'nova', damage: 12, radius: 2.6 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The cauldron: 24% a blow, 14 to all near, rests 9s, and +10 health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pot_boils_over',
              name: 'Pot Boils Over',
              trigger: { on: 'hurt', chance: 0.24 },
              action: { do: 'nova', damage: 14, radius: 2.6 },
              icd: 180,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 75: every pot at once
  {
    id: 'every_pot_at_once',
    skill: 'cooking',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Every Pot at Once',
    desc: 'A dozen pots and all of them ready together. Your arts come round 8% sooner.',
    color: '#f2c078',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 8 } }],
    ranks: [
      { note: 'The timing tightens: cooldowns 10% shorter.', effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 10 } }] },
      {
        note: 'Cooldowns 12% shorter, +2% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'Head of the kitchen: cooldowns 14% shorter, +4% crit, and a kill hastens you a second.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 20 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 80: the capstone
  {
    id: 'hearthmaster',
    skill: 'cooking',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Hearthmaster',
    desc: 'The fire has answered you all your life. Ember Fan is yours; ember bites 8% harder.',
    color: '#ff9a44',
    effects: [
      { kind: 'art', ability: 'ember_fan' },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The fan spreads hotter: ember +10%, arts come round 5% sooner.',
        effects: [
          { kind: 'art', ability: 'ember_fan' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 10 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
      {
        note: 'Ember +12%, arts come round 8% sooner.',
        effects: [
          { kind: 'art', ability: 'ember_fan' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 12 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
        ],
      },
      {
        note: 'Master of the hearth: ember +14%, cooldowns 10% shorter, every cast quickens your hand.',
        effects: [
          { kind: 'art', ability: 'ember_fan' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 14 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hearthmaster',
              name: 'Hearthmaster',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 100,
              element: 'ember',
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, cooking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / vsState) is
 * licensed here by a conscious row, never by authoring the def alone.
 */
export const COOKING_LICENSES: CallingLicense[] = [
  { calling: 'spitting_fat', status: 'burn', via: 'lay:status' },
  { calling: 'coal_raker', status: 'burn', via: 'read:vsState' },
  { calling: 'cellar_cold', status: 'burn', via: 'read:hitState' },
  { calling: 'cellar_cold', status: 'chill', via: 'lay:status' },
  { calling: 'pot_always_on', status: 'mend', via: 'lay:boon' },
  { calling: 'crackling', status: 'stonehide', via: 'lay:boon' },
  { calling: 'boning_knife', status: 'bleed', via: 'read:vsState' },
  { calling: 'fanned_coals', status: 'burn', via: 'read:stateApplied' },
  { calling: 'hearthmaster', status: 'quicken', via: 'lay:boon' },
];

/**
 * THE FILLED HALL — beastcraft's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding rows (20/35/60)
 * keep their ids and seats by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE WILD AT HEEL's arc: the yard (the whistle the beasts answer, the
 * saddle, the trusted hand), the bond (the friend at heel, the pack's
 * blood up on a kill, the shepherd's eye that sees the wolf first), the
 * hunt (the worrying bite that bleeds, the hobble that roots, the fang
 * that finds the open wound), the drove (the drover's market, the old
 * bull's hide, the poultice, the herd that turns on what corners it),
 * and the keeper's master: the crook that raises briar.
 * Pages: LAYS bleed / root / quicken / stonehide / mend; READS bleed
 * (hitState, stateApplied), root (vsState), quicken (stateRiding),
 * chill (vsState).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const BEASTCRAFT_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5: the whistle
  {
    id: 'first_whistle',
    skill: 'beastcraft',
    unlockLevel: 5,
    focusCost: 1,
    name: 'First Whistle',
    desc: 'The beasts already turn when you whistle. Your beastcraft counts higher than it is.',
    color: '#b8dcc0',
    effects: [{ kind: 'gear', effect: { kind: 'skill', skill: 'beastcraft', amount: 3 } }],
    ranks: [
      { note: 'The whistle carries: +4 beastcraft.', effects: [{ kind: 'gear', effect: { kind: 'skill', skill: 'beastcraft', amount: 4 } }] },
      {
        note: 'The wild knows the note: +5 beastcraft, and the straw bed mends +1 every 4s at rest.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'beastcraft', amount: 5 } },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Straw Bed', regenPer4s: 1 } },
        ],
      },
      {
        note: 'You sleep among the animals: +6 beastcraft, and out of the fight you mend +2 every 4s.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'beastcraft', amount: 6 } },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Straw Bed', regenPer4s: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 10: the friend at heel
  {
    id: 'at_heel',
    skill: 'beastcraft',
    unlockLevel: 10,
    focusCost: 1,
    name: 'At Heel',
    desc: 'Two sets of eyes miss less. While your companion walks beside you, you are harder to hurt.',
    color: '#8fc7a4',
    effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Sets of Eyes', armor: 4 } }],
    ranks: [
      { note: 'The friend watches your back: +5 armor while it walks with you.', effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Sets of Eyes', armor: 5 } }] },
      { note: 'The bond steadies you both: +6 armor while it walks with you.', effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Sets of Eyes', armor: 6 } }] },
      {
        note: 'You fight as one animal: +6 armor and +2% crit while the friend is out.',
        effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Sets of Eyes', armor: 6, critPct: 2 } }],
      },
    ],
  },
  // ------------------------------------------------------ 15: the saddle
  {
    id: 'saddle_sure',
    skill: 'beastcraft',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Saddle Sure',
    desc: 'You ride low and easy, as keepers do. In the saddle you are harder and a shade quicker.',
    color: '#a48a4a',
    effects: [{ kind: 'when', cond: { when: 'mounted' }, grant: { name: 'Saddle Sure', armor: 4, speedMult: 1.03 } }],
    ranks: [
      { note: 'The seat settles: +5 armor and 4% quicker while mounted.', effects: [{ kind: 'when', cond: { when: 'mounted' }, grant: { name: 'Saddle Sure', armor: 5, speedMult: 1.04 } }] },
      { note: 'Horse and rider breathe together: +6 armor and 5% quicker while mounted.', effects: [{ kind: 'when', cond: { when: 'mounted' }, grant: { name: 'Saddle Sure', armor: 6, speedMult: 1.05 } }] },
      {
        note: 'The long ride mends you: +6 armor, 6% quicker, and +1 health every 4s while mounted.',
        effects: [{ kind: 'when', cond: { when: 'mounted' }, grant: { name: 'Saddle Sure', armor: 6, speedMult: 1.06, regenPer4s: 1 } }],
      },
    ],
  },
  // ------------------------------------------------------ 20: founding
  {
    id: 'gentle_hand',
    skill: 'beastcraft',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gentle Hand',
    desc: 'The animals give more to the hand they trust. Produce sometimes doubles.',
    color: '#c4a35a',
    effects: [{ kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.1 }],
    ranks: [
      { note: 'The trust deepens: 13% of produce comes double.', effects: [{ kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.13 }] },
      { note: 'They come to the gate for you: 16% of produce comes double.', effects: [{ kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.16 }] },
      {
        note: 'The whole yard knows your step: 20% double, and +3 beastcraft.',
        effects: [
          { kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'beastcraft', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 25: the worrying bite
  {
    id: 'worrying_bite',
    skill: 'beastcraft',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Worrying Bite',
    desc: 'You learned from wolves where the throat is. Your blows sometimes worry a wound open.',
    color: '#c46a4a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:worrying_bite',
          name: 'Worrying Bite',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 90 },
          icd: 120,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The wound runs longer: bleed 2 for 100t on 15% of blows.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:worrying_bite',
              name: 'Worrying Bite',
              trigger: { on: 'hit', chance: 0.15 },
              action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
              icd: 120,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The teeth find the vein: bleed 3 for 100t on 18% of blows.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:worrying_bite',
              name: 'Worrying Bite',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
              icd: 100,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The pack way: bleed 3 for 110t on 20% of blows, and bleeding bodies take 8% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:worrying_bite',
              name: 'Worrying Bite',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 110 },
              icd: 100,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 30: the pack's blood
  {
    id: 'pack_blood',
    skill: 'beastcraft',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Cry of the Pack',
    desc: 'A kill runs through the pack like a shout. Each kill quickens your hand a while.',
    color: '#d98a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:pack_blood',
          name: 'Cry of the Pack',
          trigger: { on: 'kill' },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 60 },
          icd: 60,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The blood stays up longer: a quicken stack for 80t on each kill.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pack_blood',
              name: 'Cry of the Pack',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
              icd: 60,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The pack runs hot: a quicken stack for 100t on each kill, and kills haste your feet 10t.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pack_blood',
              name: 'Cry of the Pack',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 40,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 10 } },
        ],
      },
      {
        note: 'The howl in the blood: quicken 120t on each kill, kills haste your feet 16t, +2% crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:pack_blood',
              name: 'Cry of the Pack',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 40,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 16 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 35: founding
  {
    id: 'shepherds_eye',
    skill: 'beastcraft',
    unlockLevel: 35,
    focusCost: 1,
    name: "Shepherd's Eye",
    desc: 'You see what each animal needs sooner. The brush window opens faster.',
    color: '#96703f',
    effects: [{ kind: 'perk', perk: 'brushRestMult', magnitude: 0.75 }],
    ranks: [
      { note: 'The eye quickens: the brush window opens 30% sooner.', effects: [{ kind: 'perk', perk: 'brushRestMult', magnitude: 0.7 }] },
      {
        note: 'You see the wolf before the flock does: brush 35% sooner, foes marked every 34 tiles.',
        effects: [
          { kind: 'perk', perk: 'brushRestMult', magnitude: 0.65 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:shepherds_eye',
              name: "Shepherd's Eye",
              trigger: { on: 'stride', tiles: 34 },
              action: { do: 'reveal', radius: 8, of: 'foe' },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'Nothing crosses the fell unseen: brush 40% sooner, foes marked every 28 tiles, wider.',
        effects: [
          { kind: 'perk', perk: 'brushRestMult', magnitude: 0.6 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:shepherds_eye',
              name: "Shepherd's Eye",
              trigger: { on: 'stride', tiles: 28 },
              action: { do: 'reveal', radius: 10, of: 'foe' },
              icd: 160,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 40: the hobble
  {
    id: 'drovers_hobble',
    skill: 'beastcraft',
    unlockLevel: 40,
    focusCost: 2,
    name: "Drover's Hobble",
    desc: 'A hand that hobbles a bull can hobble a man. When struck, you sometimes root the striker.',
    color: '#a8814f',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:drovers_hobble',
          name: 'Hobbled',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'status', status: 'root', power: 0, ticks: 30 },
          icd: 200,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The knot holds: root 36t on 25% of blows taken.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drovers_hobble',
              name: 'Hobbled',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'status', status: 'root', power: 0, ticks: 36 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The hand is quicker than the eye: root 40t on 30% of blows taken.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drovers_hobble',
              name: 'Hobbled',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The hobbled beast is easy meat: root 40t on 30% of blows taken, the rooted take 10% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drovers_hobble',
              name: 'Hobbled',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 180,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 45: the old bull's hide
  {
    id: 'old_bulls_hide',
    skill: 'beastcraft',
    unlockLevel: 45,
    focusCost: 2,
    name: "Old Bull's Hide",
    desc: 'Years of horn and hoof have thickened you. Pressed low, your skin turns to stone a while.',
    color: '#98a4b0',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:old_bulls_hide',
          name: "Old Bull's Hide",
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 400,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The hide thickens: +10 health, and the stone holds 140t.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:old_bulls_hide',
              name: "Old Bull's Hide",
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 400,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The bull does not go down easy: +12 health, stone for 160t, and it wakes sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:old_bulls_hide',
              name: "Old Bull's Hide",
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 340,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The old bull of the fell: +14 health, +4 armor always, stone for 180t when pressed.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:old_bulls_hide',
              name: "Old Bull's Hide",
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 340,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 50: the fang finds blood
  {
    id: 'fang_finds_blood',
    skill: 'beastcraft',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Fang Finds Blood',
    desc: 'The pack finishes what bleeds. Your blows on a bleeding body sometimes bite deep.',
    color: '#c4372a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:fang_finds_blood',
          name: 'Fang Finds Blood',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The bite goes deeper: 16 on 30% of blows against the bleeding.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fang_finds_blood',
              name: 'Fang Finds Blood',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The nose never misses red: 18 on 35% of blows against the bleeding.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fang_finds_blood',
              name: 'Fang Finds Blood',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.35 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The kill is the pack\'s: 20 on 40% of blows against the bleeding, and +6% blood damage.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fang_finds_blood',
              name: 'Fang Finds Blood',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.4 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'blood', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 55: the poultice
  {
    id: 'keepers_poultice',
    skill: 'beastcraft',
    unlockLevel: 55,
    focusCost: 2,
    name: "Keeper's Poultice",
    desc: 'You dress your own wounds the way you dress a hound\'s. Hurt, you sometimes start mending.',
    color: '#a8d978',
    effects: [
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:keepers_poultice',
          name: "Keeper's Poultice",
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
          icd: 240,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The herbs are fresher: mend 3 a second for 80t on a fifth of blows taken.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:keepers_poultice',
              name: "Keeper's Poultice",
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 240,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The wrap holds longer: mend 3 for 100t, and +2 health every 4s always.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:keepers_poultice',
              name: "Keeper's Poultice",
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
              icd: 220,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The keeper\'s own balm: mend 4 for 120t on a quarter of blows taken, +2 regen always.',
        effects: [
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:keepers_poultice',
              name: "Keeper's Poultice",
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 60: founding
  {
    id: 'drovers_bond',
    skill: 'beastcraft',
    unlockLevel: 60,
    focusCost: 2,
    name: "Drover's Bond",
    desc: 'Beasts kept by a true drover give again sooner. In time the larder pays for the name.',
    color: '#caa53d',
    effects: [{ kind: 'perk', perk: 'produceRestMult', magnitude: 0.85 }],
    ranks: [
      { note: 'The yard gives sooner: produce readies 20% faster.', effects: [{ kind: 'perk', perk: 'produceRestMult', magnitude: 0.8 }] },
      {
        note: 'The drover knows the market: produce readies 25% faster and the larder pays 8% over.',
        effects: [
          { kind: 'perk', perk: 'produceRestMult', magnitude: 0.75 },
          { kind: 'perk', perk: 'larderSellMult', magnitude: 1.08 },
        ],
      },
      {
        note: 'The drove moves at your pace: produce 30% faster, larder pays 12% over, 5% quicker feet.',
        effects: [
          { kind: 'perk', perk: 'produceRestMult', magnitude: 0.7 },
          { kind: 'perk', perk: 'larderSellMult', magnitude: 1.12 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 65: blood on the wind
  {
    id: 'blood_on_the_wind',
    skill: 'beastcraft',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Blood on the Wind',
    desc: 'Blood on the wind wakes the pack in you. Laying a bleed quickens you; quick, you cut true.',
    color: '#c84a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:blood_on_the_wind',
          name: 'Blood on the Wind',
          trigger: { on: 'stateApplied', status: 'bleed' },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 160,
          element: 'blood',
        },
      },
      { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'Pack Fever', critPct: 3 } },
    ],
    ranks: [
      {
        note: 'The scent lingers: quicken 100t on a bleed laid, +4% crit while quickened.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_on_the_wind',
              name: 'Blood on the Wind',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 160,
              element: 'blood',
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'Pack Fever', critPct: 4 } },
        ],
      },
      {
        note: 'The pack answers sooner: quicken 100t, the wind rests 120t, +5% crit while quickened.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_on_the_wind',
              name: 'Blood on the Wind',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 120,
              element: 'blood',
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'Pack Fever', critPct: 5 } },
        ],
      },
      {
        note: 'The fever runs the pack: quicken 120t on a bleed laid, +5% crit, +4% damage quickened.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_on_the_wind',
              name: 'Blood on the Wind',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 120,
              element: 'blood',
            },
          },
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Pack Fever', critPct: 5, dmgMult: 1.04 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 70: two fangs
  {
    id: 'two_fangs',
    skill: 'beastcraft',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Two Fangs',
    desc: 'You and the friend hunt as one mouth. Beside it you strike harder and swing faster.',
    color: '#e8d8a0',
    effects: [
      { kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Fangs', dmgMult: 1.05, attackSpeedMult: 1.03 } },
    ],
    ranks: [
      {
        note: 'The rhythm sets: +6% damage and 4% swing haste while the friend is out.',
        effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Fangs', dmgMult: 1.06, attackSpeedMult: 1.04 } }],
      },
      {
        note: 'One mouth, two fangs: +8% damage and 5% swing haste while the friend is out.',
        effects: [{ kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Fangs', dmgMult: 1.08, attackSpeedMult: 1.05 } }],
      },
      {
        note: 'As the wild hunts: +8% damage, 6% haste, +2% crit beside the friend, +2% crit always.',
        effects: [
          { kind: 'when', cond: { when: 'petOut' }, grant: { name: 'Two Fangs', dmgMult: 1.08, attackSpeedMult: 1.06, critPct: 2 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 75: the herd turns
  {
    id: 'herd_turns',
    skill: 'beastcraft',
    unlockLevel: 75,
    focusCost: 2,
    name: 'The Herd Turns',
    desc: 'Corner a herd and the herd comes at you. Take five blows and you lash out at all near.',
    color: '#7d5b33',
    effects: [
      { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:herd_turns',
          name: 'The Herd Turns',
          trigger: { on: 'stacks', per: 'hurt', count: 5 },
          action: { do: 'nova', damage: 14, radius: 2.6 },
          icd: 200,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The horns come down harder: a burst of 16 to all near after five blows taken.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:herd_turns',
              name: 'The Herd Turns',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'nova', damage: 16, radius: 2.6 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The herd turns quicker: 18 to all near after four blows taken, +5 armor.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:herd_turns',
              name: 'The Herd Turns',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'nova', damage: 18, radius: 2.8 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The stampede: 20 to all near after four blows taken, +6 armor, and +3 thorns.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
          { kind: 'gear', effect: { kind: 'thorns', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:herd_turns',
              name: 'The Herd Turns',
              trigger: { on: 'stacks', per: 'hurt', count: 4 },
              action: { do: 'nova', damage: 20, radius: 3.0 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 80: the capstone
  {
    id: 'crook_and_briar',
    skill: 'beastcraft',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Crook and Briar',
    desc: 'The crook that turns a flock can raise briar. Overgrowth is yours; the green cuts deeper.',
    color: '#7ac46a',
    effects: [
      { kind: 'art', ability: 'overgrowth' },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The thicket thickens: +10% verdant damage beside the crook\'s art.',
        effects: [
          { kind: 'art', ability: 'overgrowth' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 10 } },
        ],
      },
      {
        note: 'The briar holds what it catches: +12% verdant, and chilled bodies take 8% more from you.',
        effects: [
          { kind: 'art', ability: 'overgrowth' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } },
        ],
      },
      {
        note: 'The keeper of the fell: +14% verdant, chilled bodies take 12% more, +2 health every 4s.',
        effects: [
          { kind: 'art', ability: 'overgrowth' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, beastcraft's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const BEASTCRAFT_LICENSES: CallingLicense[] = [
  { calling: 'worrying_bite', status: 'bleed', via: 'lay:status' },
  { calling: 'worrying_bite', status: 'bleed', via: 'read:vsState' },
  { calling: 'pack_blood', status: 'quicken', via: 'lay:boon' },
  { calling: 'drovers_hobble', status: 'root', via: 'lay:status' },
  { calling: 'drovers_hobble', status: 'root', via: 'read:vsState' },
  { calling: 'old_bulls_hide', status: 'stonehide', via: 'lay:boon' },
  { calling: 'fang_finds_blood', status: 'bleed', via: 'read:hitState' },
  { calling: 'keepers_poultice', status: 'mend', via: 'lay:boon' },
  { calling: 'blood_on_the_wind', status: 'bleed', via: 'read:stateApplied' },
  { calling: 'blood_on_the_wind', status: 'quicken', via: 'lay:boon' },
  { calling: 'blood_on_the_wind', status: 'quicken', via: 'read:stateRiding' },
  { calling: 'crook_and_briar', status: 'chill', via: 'read:vsState' },
];

/**
 * THE FILLED HALL — foraging's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE HEDGEROW YEAR — the arc. A forager's ladder is written by the
 * gleaners of the lanes: the walker first (5..15: hedge legs, the
 * bramble coat, the full pocket), then the basket's own rhythms
 * (20..40: pickings that come double, sap that salves as you pick, the
 * clause that rewards never standing still, the nightshade knowing that
 * LAYS venom, the hedge that tells where the good ground is), the
 * bitter-berry read that closes the ladder's own venom pair (45), the
 * hedgerow leathers and the seed pouch that reaches into the farmer's
 * field (50..55), the verdant eye and the bell light night (60..65), the
 * thicket snare that LAYS root on whoever bites you (70), the salved
 * stride that reads the ladder's own mend (75), and at 80 THE MASTER'S
 * LICENSE: Thorn Fan, the hedge of briar shafts every lane walker has
 * crawled through and can finally loose.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FORAGING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5..15: the walker
  {
    id: 'hedge_legs',
    skill: 'foraging',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Hedge Legs',
    desc: 'You learned the lanes before you learned the roads. You walk quicker everywhere.',
    color: '#7ac46a',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 5 } }],
    ranks: [
      { note: 'The stile is a step, not a climb.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 6 } }] },
      { note: 'Every lane between here and the ford is yours.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 7 } }] },
      {
        note: 'The miles put wind in you as well as pace.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 8 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 6 } },
        ],
      },
    ],
  },
  {
    id: 'bramble_coat',
    skill: 'foraging',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Bramble Coat',
    desc: 'Every hedge you pushed through left teeth in your sleeves. Whoever strikes you bleeds.',
    color: '#8a5a3c',
    effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 3 } }],
    ranks: [
      { note: 'The thorns sit deeper in the weave.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 4 } }] },
      { note: 'A whole season of briar in the coat.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 5 } }] },
      {
        note: 'The coat is half hedge now, and turns a blow as well as bites back.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 6 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'full_pocket',
    skill: 'foraging',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Full Pocket',
    desc: 'Berries in every pocket and a mouth that never stops. Food heals you more.',
    color: '#a04a6e',
    effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.12 }],
    ranks: [
      { note: 'You know which berries are worth the stain.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.18 }] },
      { note: 'Nothing on the road goes to waste.', effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.24 }] },
      {
        note: 'A pocket always full is a body always mending.',
        effects: [
          { kind: 'perk', perk: 'foodHealMult', magnitude: 1.3 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },

  // ------------------------------------------ 20..40: the basket's rhythms
  {
    id: 'gleaner',
    skill: 'foraging',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gleaner',
    desc: 'Nothing worth taking escapes you. Pickings sometimes come double.',
    color: '#6aa84f',
    effects: [{ kind: 'doubleGather', skill: 'foraging', chance: 0.1 }],
    ranks: [
      { note: 'The second berry hides behind the first less often.', effects: [{ kind: 'doubleGather', skill: 'foraging', chance: 0.13 }] },
      { note: 'You strip a hedge the way rain does.', effects: [{ kind: 'doubleGather', skill: 'foraging', chance: 0.16 }] },
      {
        note: 'One handful in five comes as two, and every hedge reads richer to you.',
        effects: [
          { kind: 'doubleGather', skill: 'foraging', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'foraging', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'sap_and_salve',
    skill: 'foraging',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Sap and Salve',
    desc: 'Green sap on the fingers closes small cuts. A harvest sometimes leaves you mending.',
    color: '#7ad0a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:sap_and_salve', name: 'Green Salve',
          trigger: { on: 'gather', chance: 0.25 },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
          icd: 200,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The sap runs thicker and mends more each second.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sap_and_salve', name: 'Green Salve',
              trigger: { on: 'gather', chance: 0.25 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The salve holds longer and comes oftener to the hand.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sap_and_salve', name: 'Green Salve',
              trigger: { on: 'gather', chance: 0.3 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'A lifetime of sap in the skin thickens the blood beneath it.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sap_and_salve', name: 'Green Salve',
              trigger: { on: 'gather', chance: 0.3 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 160,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  {
    id: 'never_still',
    skill: 'foraging',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Never Still',
    desc: 'A gleaner is hard to catch and quick to heal. While you walk you mend and turn blows.',
    color: '#9cb86a',
    effects: [{ kind: 'when', cond: { when: 'moving' }, grant: { name: 'Never Still', regenPer4s: 1, armor: 2 } }],
    ranks: [
      { note: 'The road turns a little more of the blow.', effects: [{ kind: 'when', cond: { when: 'moving' }, grant: { name: 'Never Still', regenPer4s: 1, armor: 3 } }] },
      { note: 'Walking is how you heal now.', effects: [{ kind: 'when', cond: { when: 'moving' }, grant: { name: 'Never Still', regenPer4s: 2, armor: 4 } }] },
      {
        note: 'The walker mends, turns blows, and quickens with every step.',
        effects: [{ kind: 'when', cond: { when: 'moving' }, grant: { name: 'Never Still', regenPer4s: 2, armor: 4, speedMult: 1.03 } }],
      },
    ],
  },
  {
    id: 'nightshade_knowing',
    skill: 'foraging',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Nightshade Knowing',
    desc: 'You know which berries kill and carry a few. Your blows sometimes leave venom behind.',
    color: '#a0c050',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:nightshade_knowing', name: 'Nightshade',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'venom', power: 2, ticks: 100 },
          icd: 200,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The berry is riper and the venom lingers.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nightshade_knowing', name: 'Nightshade',
              trigger: { on: 'hit', chance: 0.15 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 120 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'You know a stronger berry, and reach for it oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nightshade_knowing', name: 'Nightshade',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 120 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The venom lasts, and the green in the wound answers a verdant hand.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nightshade_knowing', name: 'Nightshade',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 140 },
              icd: 160,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 6 } },
        ],
      },
    ],
  },
  {
    id: 'the_hedge_tells',
    skill: 'foraging',
    unlockLevel: 40,
    focusCost: 2,
    name: 'The Hedge Tells',
    desc: 'One bush tells you what the whole bank grows. A harvest sometimes shows the good ground.',
    color: '#5d8a3e',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:the_hedge_tells', name: 'The Bank Shows',
          trigger: { on: 'gather', chance: 0.25 },
          action: { do: 'reveal', radius: 8, of: 'node' },
          icd: 300,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The bank shows itself further out.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_hedge_tells', name: 'The Bank Shows',
              trigger: { on: 'gather', chance: 0.25 },
              action: { do: 'reveal', radius: 10, of: 'node' },
              icd: 300,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The hedge speaks oftener and rests less between tellings.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_hedge_tells', name: 'The Bank Shows',
              trigger: { on: 'gather', chance: 0.3 },
              action: { do: 'reveal', radius: 11, of: 'node' },
              icd: 260,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'You know where the good ground is before you reach it, and go there quicker.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_hedge_tells', name: 'The Bank Shows',
              trigger: { on: 'gather', chance: 0.3 },
              action: { do: 'reveal', radius: 12, of: 'node' },
              icd: 240,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },

  // ---------------------------------------- 45..55: the read and the field
  {
    id: 'bitter_berry',
    skill: 'foraging',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Bitter Berry',
    desc: 'You have watched what nightshade does to a hare. Poisoned foes take more from you.',
    color: '#6b8e23',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 8 } }],
    ranks: [
      { note: 'You read the sickness a beat sooner.', effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 10 } }] },
      { note: 'The poisoned falter and you find the gap.', effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 12 } }] },
      {
        note: 'A blow on a poisoned foe sometimes drives a green thorn of its own.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bitter_berry', name: 'Green Thorn',
              trigger: { on: 'hitState', status: 'venom', chance: 0.3 },
              action: { do: 'bolt', damage: 18 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'hedgerow_leathers',
    skill: 'foraging',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Hedgerow Leathers',
    desc: 'Soft leather is what the hedge does not catch. Each leather piece speeds and steadies you.',
    color: '#a8814f',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.8, maxHp: 2 }],
    ranks: [
      { note: 'The leathers are worn in and worn quiet.', effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1, maxHp: 2 }] },
      { note: 'The suit fits like a second hide.', effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1, maxHp: 3 }] },
      {
        note: 'Every piece of leather is a lane walked in it, and each one turns a little steel.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1.2, maxHp: 3, armor: 1 }],
      },
    ],
  },
  {
    id: 'seed_pouch',
    skill: 'foraging',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Seed Pouch',
    desc: 'Every hedge is a seed bank to you. Harvests sometimes return their seed or double.',
    color: '#8fb083',
    effects: [
      { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.06 },
      { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.04 },
    ],
    ranks: [
      {
        note: 'You pocket seed the farmer never sees.',
        effects: [
          { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.08 },
          { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.05 },
        ],
      },
      {
        note: 'The pouch is never quite empty.',
        effects: [
          { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.1 },
          { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.06 },
        ],
      },
      {
        note: 'The field is one more hedge to you, and reads a few seasons wiser.',
        effects: [
          { kind: 'perk', perk: 'seedRefundChance', magnitude: 0.12 },
          { kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.08 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'farming', amount: 3 } },
        ],
      },
    ],
  },

  // ---------------------------------------- 60..75: the eye and the thicket
  {
    id: 'verdant_eye',
    skill: 'foraging',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Verdant Eye',
    desc: 'The green sorts itself for you. You gather faster.',
    color: '#4a8a3a',
    effects: [{ kind: 'gatherSpeed', skill: 'foraging', mult: 1.12 }],
    ranks: [
      { note: 'The ripe and the rotten part before your hand.', effects: [{ kind: 'gatherSpeed', skill: 'foraging', mult: 1.15 }] },
      { note: 'You pick the way other folk glance.', effects: [{ kind: 'gatherSpeed', skill: 'foraging', mult: 1.18 }] },
      {
        note: 'The green sorts itself for you in the fight as well as the hedge.',
        effects: [
          { kind: 'gatherSpeed', skill: 'foraging', mult: 1.22 },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'by_bell_light',
    skill: 'foraging',
    unlockLevel: 65,
    focusCost: 2,
    name: 'By Bell Light',
    desc: 'Wild moonbell glows after dusk and lights the bank. By night you gather and walk quicker.',
    color: '#8f9ed6',
    effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'By Bell Light', gatherSpeed: 1.06, speedMult: 1.03 } }],
    ranks: [
      { note: 'The glow reaches a little further down the lane.', effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'By Bell Light', gatherSpeed: 1.08, speedMult: 1.04 } }] },
      { note: 'The whole night is a picking night.', effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'By Bell Light', gatherSpeed: 1.1, speedMult: 1.05 } }] },
      {
        note: 'By bell light you find the gap in a guard as easily as a berry.',
        effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'By Bell Light', gatherSpeed: 1.12, speedMult: 1.06, critPct: 2 } }],
      },
    ],
  },
  {
    id: 'thicket_snare',
    skill: 'foraging',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Thicket Snare',
    desc: 'The hedge grabs whoever grabs you. A blow that finds flesh sometimes roots the striker.',
    color: '#6b4a26',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:thicket_snare', name: 'Briar Grip',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'status', status: 'root', power: 1, ticks: 32 },
          icd: 360,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The briar closes oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:thicket_snare', name: 'Briar Grip',
              trigger: { on: 'hurt', chance: 0.24 },
              action: { do: 'status', status: 'root', power: 1, ticks: 36 },
              icd: 340,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The thicket regrows sooner after it lets go.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:thicket_snare', name: 'Briar Grip',
              trigger: { on: 'hurt', chance: 0.28 },
              action: { do: 'status', status: 'root', power: 1, ticks: 40 },
              icd: 320,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The thicket holds longer, and its wall of briar turns steel besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:thicket_snare', name: 'Briar Grip',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'root', power: 1, ticks: 40 },
              icd: 300,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'salved_stride',
    skill: 'foraging',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Salved Stride',
    desc: 'A mending body picks best. While a mend rides you, you walk, pick, and turn blows better.',
    color: '#5fb08a',
    effects: [
      { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Salved Stride', speedMult: 1.05, gatherSpeed: 1.06, armor: 2 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
    ],
    ranks: [
      {
        note: 'The salve carries you a little further and a little faster.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Salved Stride', speedMult: 1.06, gatherSpeed: 1.08, armor: 3 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
      {
        note: 'While the green works in you, nothing on the bank is out of reach.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Salved Stride', speedMult: 1.07, gatherSpeed: 1.1, armor: 4 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'A mending walker is the hardest thing in the hedgerow to bring down.',
        effects: [
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Salved Stride', speedMult: 1.08, gatherSpeed: 1.12, armor: 4, regenPer4s: 1 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
        ],
      },
    ],
  },

  // ---------------------------------------------- 80: the master's seat
  {
    id: 'hedge_of_briars',
    skill: 'foraging',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Hedge of Briars',
    desc: 'Every hedge you ever crawled through, loosed at once. Thorn Fan seats; bows bite harder.',
    color: '#4f7a2e',
    effects: [
      { kind: 'art', ability: 'thorn_fan' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The fan is thicker with briar.',
        effects: [
          { kind: 'art', ability: 'thorn_fan' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } },
        ],
      },
      {
        note: 'The shafts fly truer and find the soft places.',
        effects: [
          { kind: 'art', ability: 'thorn_fan' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'The hedge is yours to loose, and it grows back green in the blood of what it holds.',
        effects: [
          { kind: 'art', ability: 'thorn_fan' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'verdant', pct: 8 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, foraging's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const FORAGING_LICENSES: CallingLicense[] = [
  { calling: 'sap_and_salve', status: 'mend', via: 'lay:boon' },
  { calling: 'nightshade_knowing', status: 'venom', via: 'lay:status' },
  { calling: 'bitter_berry', status: 'venom', via: 'read:vsState' },
  { calling: 'bitter_berry', status: 'venom', via: 'read:hitState' },
  { calling: 'thicket_snare', status: 'root', via: 'lay:status' },
  { calling: 'salved_stride', status: 'mend', via: 'read:stateRiding' },
];

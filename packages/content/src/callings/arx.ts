/**
 * THE FILLED HALL — arx's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE ARC (the staff and the elemental schools):
 *  - 5..15  three school identities: the ember tongue, the storm's
 *           step, the frost reader. One entry each; a fresh budget of
 *           three chooses a school.
 *  - 20..50 the verbs. Kindled Mind deepens; the reaction hinges open
 *           (you laid burn: now shock; you laid chill: now a bolt);
 *           the still caster, the hollow ward, the fifth word, and the
 *           verdant mend on cast.
 *  - 55..75 the outward seats and the second hinge: the void word
 *           cracks a guard (sunder laid AND read), Attuned deepens, the blood school's kill draught, the
 *           runeskin at low health, and the answering sky (you laid
 *           shock: the sky answers).
 *  - 80     THE RENDING WORD: the master's license on the legendary beam,
 *           Realm Rend, spoken without the splinter in hand.
 *
 * Element on gear.elementDmg is a STAFF fact (the equipped staff's
 * element), so each school seat is a commitment to that school's wood.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ARX_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5: the ember tongue
  {
    id: 'ember_tongue',
    skill: 'arx',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Ember Tongue',
    desc: 'The first word you learned was heat. Ember words and ember staves cast +8% harder.',
    color: '#e8783c',
    effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 8 } }],
    ranks: [
      {
        note: 'The tongue burns hotter: ember casts +10%.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 10 } }],
      },
      {
        note: 'The tongue burns hotter still: ember casts +12%.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 12 } }],
      },
      {
        note: 'Ember casts +14%, and the flame finds the seam: +3% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 10: the storm's step
  {
    id: 'stormtaught',
    skill: 'arx',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Stormtaught',
    desc: 'The sky taught you to speak on the move. Every cast puts wind under your heels.',
    color: '#e8e06a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:stormtaught',
          name: 'Stormstep Word',
          trigger: { on: 'cast' },
          action: { do: 'surge', stat: 'speed', pct: 10, ticks: 60 },
          icd: 200,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The wind blows harder: +12% speed for 3.5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormtaught',
              name: 'Stormstep Word',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'speed', pct: 12, ticks: 70 },
              icd: 200,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The wind blows longer: +14% speed for 4s, resting 9s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormtaught',
              name: 'Stormstep Word',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'speed', pct: 14, ticks: 80 },
              icd: 180,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The gust reaches +16% for 4.5s, and the wind never quite leaves: +5% speed always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormtaught',
              name: 'Stormstep Word',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'speed', pct: 16, ticks: 90 },
              icd: 180,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 15: the frost reader
  {
    id: 'rimebound',
    skill: 'arx',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Rimebound',
    desc: 'You read the frost on a body like a page. Chilled foes take more from you.',
    color: '#8ac4e8',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } }],
    ranks: [
      {
        note: 'The chilled take +10% from you.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } }],
      },
      {
        note: 'The chilled take +12% from you.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } }],
      },
      {
        note: 'The chilled take +14% from you, and the frost school casts +8% in your hands.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 20: founding, the kindled mind
  {
    id: 'kindled_mind',
    skill: 'arx',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Kindled Mind',
    desc: 'The words come back to you sooner. Ability cooldowns shorten by 6%.',
    color: '#b49af0',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 6 } }],
    ranks: [
      {
        note: 'The words return sooner: cooldowns shorten by 8%.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 8 } }],
      },
      {
        note: 'The words return sooner still: cooldowns shorten by 10%.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 10 } }],
      },
      {
        note: 'Cooldowns shorten by 12%, and the mind knows more than it was taught: +3 arx.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'gear', effect: { kind: 'skill', skill: 'arx', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 25: burn, then shock (Combust)
  {
    id: 'cinder_answer',
    skill: 'arx',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Cinder Answer',
    desc: 'You set the fire; the sky answers it. Laying burn on a foe lays shock on it too.',
    color: '#f0a05a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:cinder_answer',
          name: 'Cinder Answer',
          trigger: { on: 'stateApplied', status: 'burn' },
          action: { do: 'status', status: 'shock', power: 1, ticks: 80 },
          icd: 140,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The answer comes oftener: rests 6s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cinder_answer',
              name: 'Cinder Answer',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 80 },
              icd: 120,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The charge clings longer: shock for 5s, resting 6s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cinder_answer',
              name: 'Cinder Answer',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 100 },
              icd: 120,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'Shock for 5s resting 5s, and the fire itself burns hotter: ember casts +8%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cinder_answer',
              name: 'Cinder Answer',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 100 },
              icd: 100,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 30: the still caster
  {
    id: 'rooted_voice',
    skill: 'arx',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Rooted Voice',
    desc: 'A planted foot carries the word further. While standing still you deal +6% damage.',
    color: '#7ac46a',
    effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Rooted Voice', dmgMult: 1.06 } }],
    ranks: [
      {
        note: 'The planted word lands +8%.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Rooted Voice', dmgMult: 1.08 } }],
      },
      {
        note: 'The planted word lands +10%.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Rooted Voice', dmgMult: 1.1 } }],
      },
      {
        note: 'The planted word lands +10%, and it finds the seam: +3% crit while still.',
        effects: [
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Rooted Voice', dmgMult: 1.1, critPct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 35: the hollow ward
  {
    id: 'hollow_ward',
    skill: 'arx',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Hollow Ward',
    desc: 'A blow that reaches flesh sometimes finds nothing there. Being hurt may raise a ward.',
    color: '#5a4a8a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:hollow_ward',
          name: 'Hollow Ward',
          trigger: { on: 'hurt', chance: 0.3 },
          action: { do: 'ward', absorb: 24, ticks: 120 },
          icd: 300,
          element: 'void',
        },
      },
    ],
    ranks: [
      {
        note: 'The nothing holds more: a 30 point ward.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hollow_ward',
              name: 'Hollow Ward',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'ward', absorb: 30, ticks: 120 },
              icd: 300,
              element: 'void',
            },
          },
        ],
      },
      {
        note: 'A 36 point ward that lasts 7s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hollow_ward',
              name: 'Hollow Ward',
              trigger: { on: 'hurt', chance: 0.35 },
              action: { do: 'ward', absorb: 36, ticks: 140 },
              icd: 280,
              element: 'void',
            },
          },
        ],
      },
      {
        note: 'A 44 point ward for 8s, and the hollow keeps a little of you back: +8 max health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hollow_ward',
              name: 'Hollow Ward',
              trigger: { on: 'hurt', chance: 0.35 },
              action: { do: 'ward', absorb: 44, ticks: 160 },
              icd: 260,
              element: 'void',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 40: chill, then a bolt
  {
    id: 'shatter_word',
    skill: 'arx',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Shatter Word',
    desc: 'What you have chilled, you may break. Laying chill on a foe sends a frost bolt after it.',
    color: '#b0d8e8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:shatter_word',
          name: 'Shatter Word',
          trigger: { on: 'stateApplied', status: 'chill' },
          action: { do: 'bolt', damage: 14 },
          icd: 180,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The bolt bites for 16.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:shatter_word',
              name: 'Shatter Word',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'bolt', damage: 16 },
              icd: 180,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The bolt bites for 18 and winter answers sooner: rests 8s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:shatter_word',
              name: 'Shatter Word',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The bolt bites for 20, and the cold keeps its own time: cooldowns shorten by 5%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:shatter_word',
              name: 'Shatter Word',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 45: the fifth word
  {
    id: 'charged_air',
    skill: 'arx',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Charged Air',
    desc: 'Every word thickens the air. The fifth cast lands like thunder: a surge of damage.',
    color: '#f0e88a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:charged_air',
          name: 'Charged Air',
          trigger: { on: 'stacks', per: 'cast', count: 5 },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
          icd: 100,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The thunder lands harder: +15% damage for 4s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:charged_air',
              name: 'Charged Air',
              trigger: { on: 'stacks', per: 'cast', count: 5 },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 80 },
              icd: 100,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The thunder rolls longer: +18% damage for 5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:charged_air',
              name: 'Charged Air',
              trigger: { on: 'stacks', per: 'cast', count: 5 },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 100,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The air charges on the fourth word: +20% damage for 5s every four casts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:charged_air',
              name: 'Charged Air',
              trigger: { on: 'stacks', per: 'cast', count: 4 },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 100 },
              icd: 100,
              element: 'storm',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 50: the verdant mend on cast
  {
    id: 'greenword',
    skill: 'arx',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Greenword',
    desc: 'The verdant school speaks and the body listens. Casting lays a mend on you.',
    color: '#7ad0a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:greenword',
          name: 'Greenword',
          trigger: { on: 'cast' },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 60 },
          icd: 200,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The mend runs deeper: 3 a second for 3s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:greenword',
              name: 'Greenword',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 60 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The mend runs longer: 3 a second for 4s, resting 9s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:greenword',
              name: 'Greenword',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 180,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The mend runs 4 a second for 5s, and the green stays in the blood: +2 regen.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:greenword',
              name: 'Greenword',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 180,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 55: the crack conducts
  {
    id: 'fissure_cant',
    skill: 'arx',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Fissure Cant',
    desc: 'The void word finds the seam. Your fifth blow sunders; the sundered take more from you.',
    color: '#b8b2a6',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:fissure_cant',
          name: 'Fissure Cant',
          trigger: { on: 'stacks', per: 'hit', count: 5 },
          action: { do: 'status', status: 'sunder', power: 8, ticks: 100 },
          icd: 200,
          element: 'void',
        },
      },
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The crack runs deeper: sunder 10, and the sundered take +10% from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fissure_cant',
              name: 'Fissure Cant',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 100 },
              icd: 200,
              element: 'void',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
        ],
      },
      {
        note: 'The crack holds 6s and rests 8s; the sundered take +12% from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fissure_cant',
              name: 'Fissure Cant',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 120 },
              icd: 160,
              element: 'void',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
        ],
      },
      {
        note: 'The fourth bolt cracks the guard: sunder 12 for 6s, +14% vs the sundered, void casts +8%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fissure_cant',
              name: 'Fissure Cant',
              trigger: { on: 'stacks', per: 'hit', count: 4 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 120 },
              icd: 160,
              element: 'void',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'void', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 60: founding, attuned
  {
    id: 'attuned',
    skill: 'arx',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Attuned',
    desc: 'The current runs closer to the skin. Every arx word you speak lands 7% harder.',
    color: '#8a6ac8',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 7 } }],
    ranks: [
      {
        note: 'The current runs closer: arx casts +9%.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 9 } }],
      },
      {
        note: 'The current runs closer still: arx casts +11%.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 11 } }],
      },
      {
        note: 'Arx casts +12%, and the attuned hand looses its bolts quicker: staff basics 6% faster.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 12 } },
          { kind: 'when', cond: { when: 'wielding', style: 'arx' }, grant: { name: 'Attuned Hand', attackSpeedMult: 1.06 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 65: the blood school's due
  {
    id: 'heartsblood_draw',
    skill: 'arx',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Heartsblood Draw',
    desc: 'The blood school takes its due at the end. Every kill closes some of your wounds.',
    color: '#c84a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:heartsblood_draw',
          name: 'Heartsblood Draw',
          trigger: { on: 'kill' },
          action: { do: 'heal', amount: 16 },
          icd: 160,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The draw runs deeper: heals 22 on a kill.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:heartsblood_draw',
              name: 'Heartsblood Draw',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 22 },
              icd: 160,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Heals 28 on a kill, resting 7s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:heartsblood_draw',
              name: 'Heartsblood Draw',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 28 },
              icd: 140,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Heals 34 on a kill, and the blood staff learns your name: blood casts +8%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:heartsblood_draw',
              name: 'Heartsblood Draw',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 34 },
              icd: 140,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'blood', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 70: the runeskin
  {
    id: 'runeskin',
    skill: 'arx',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Runeskin',
    desc: 'The runes are written on you, not the staff. Low health raises stonehide on your skin.',
    color: '#98a4b0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:runeskin',
          name: 'Runeskin',
          trigger: { on: 'lowHp', pct: 0.35 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
          icd: 600,
          element: 'arcane',
        },
      },
    ],
    ranks: [
      {
        note: 'The runes wake sooner: under 40% health, and the stone lasts 8s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runeskin',
              name: 'Runeskin',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 600,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The stone lasts 9s and the runes rest only 25s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runeskin',
              name: 'Runeskin',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 500,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The stone lasts 10s resting 20s, and the runes thicken the skin: +4 armor always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runeskin',
              name: 'Runeskin',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 400,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 75: shock, then the sky answers
  {
    id: 'answering_sky',
    skill: 'arx',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Answering Sky',
    desc: 'You put the charge in them; the sky finishes the sentence. Laying shock calls a chain.',
    color: '#c8d0e8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:answering_sky',
          name: 'Answering Sky',
          trigger: { on: 'stateApplied', status: 'shock' },
          action: { do: 'chain', damage: 12, jumps: 3 },
          icd: 180,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The chain bites for 14.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answering_sky',
              name: 'Answering Sky',
              trigger: { on: 'stateApplied', status: 'shock' },
              action: { do: 'chain', damage: 14, jumps: 3 },
              icd: 180,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The chain bites for 16 and the sky answers sooner: rests 8.5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answering_sky',
              name: 'Answering Sky',
              trigger: { on: 'stateApplied', status: 'shock' },
              action: { do: 'chain', damage: 16, jumps: 3 },
              icd: 170,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The chain bites for 18 across four throats, and the storm school casts +8% for you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answering_sky',
              name: 'Answering Sky',
              trigger: { on: 'stateApplied', status: 'shock' },
              action: { do: 'chain', damage: 18, jumps: 4 },
              icd: 160,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 80: THE RENDING WORD (the master's license)
  {
    id: 'the_rending_word',
    skill: 'arx',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Rending Word',
    desc: 'You know the word the splinter knows. Realm Rend seats in your codex; you crit oftener.',
    color: '#9ae8de',
    effects: [
      { kind: 'art', ability: 'realm_rend' },
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
    ],
    ranks: [
      {
        note: 'The word lands where it must: +4% crit.',
        effects: [
          { kind: 'art', ability: 'realm_rend' },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
      {
        note: '+5% crit, and the starlight remembers you: astral staves cast +8% in your hands.',
        effects: [
          { kind: 'art', ability: 'realm_rend' },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'astral', pct: 8 } },
        ],
      },
      {
        note: '+6% crit and astral casts +12%. Realm Rend speaks at this rank.',
        effects: [
          { kind: 'art', ability: 'realm_rend' },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'astral', pct: 12 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, arx's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / vsState /
 * stateRiding) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const ARX_LICENSES: CallingLicense[] = [
  // Rimebound reads the frost on a body: chill via THE READING EDGE.
  { calling: 'rimebound', status: 'chill', via: 'read:vsState' },
  // Cinder Answer: you laid burn, now shock (the Combust hinge).
  { calling: 'cinder_answer', status: 'burn', via: 'read:stateApplied' },
  { calling: 'cinder_answer', status: 'shock', via: 'lay:status' },
  // Shatter Word: you laid chill, now a bolt.
  { calling: 'shatter_word', status: 'chill', via: 'read:stateApplied' },
  // Greenword lays the verdant mend on the caster.
  { calling: 'greenword', status: 'mend', via: 'lay:boon' },
  // Fissure Cant cracks the guard itself (the fifth staff bolt lays sunder)
  // and reads the smith's crack too: sunder via THE READING EDGE.
  { calling: 'fissure_cant', status: 'sunder', via: 'lay:status' },
  { calling: 'fissure_cant', status: 'sunder', via: 'read:vsState' },
  // Runeskin lays stonehide on the caster at the low line.
  { calling: 'runeskin', status: 'stonehide', via: 'lay:boon' },
  // Answering Sky: you laid shock, now the chain.
  { calling: 'answering_sky', status: 'shock', via: 'read:stateApplied' },
];

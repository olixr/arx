/**
 * THE FILLED HALL — woodcutting's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE FELLING RHYTHM — the arc. A woodcutter's ladder is written by the
 * timber crews: the axe arm first (5..15: the splitting stroke, the haul
 * road, the resin that seals a cut), then the trade's own rhythms
 * (20..40: the grain that splits double, the every-Nth-log rhythm, the
 * sunup stroke, the knot reader), the wounded-tree pair that closes its
 * own synergy (35 lays bleed, 45 reads it into sunder), then the outward
 * seats of the crew that fights (55..75: the widowmaker's execute, the
 * bark that answers a blow, winter felling's reads, the falling crown on
 * a kill), and at 80 THE MASTER'S LICENSE: Fell Timber, the twohand art
 * every feller already knows in the arm.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const WOODCUTTING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5..15: the axe arm
  {
    id: 'splitting_arm',
    skill: 'woodcutting',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Splitting Arm',
    desc: 'A season at the block puts weight behind the swing. Greatweapons hit harder.',
    color: '#8c5a2c',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 6 } }],
    ranks: [
      { note: 'The swing carries more of the shoulder.', effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } }] },
      { note: 'The whole back goes into the stroke.', effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } }] },
      {
        note: 'The stroke lands from a step further out.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'perk', perk: 'greatReach', magnitude: 0.15 },
        ],
      },
    ],
  },
  {
    id: 'haul_road',
    skill: 'woodcutting',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Haul Road',
    desc: 'You have dragged logs down worse tracks than this. You walk quicker everywhere.',
    color: '#a8814f',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 6 } }],
    ranks: [
      { note: 'The road shortens under a practised stride.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 7 } }] },
      { note: 'Even the uphill drag feels level.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 8 } }] },
      {
        note: 'The load built a back to match the legs.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 9 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  {
    id: 'resin_skin',
    skill: 'woodcutting',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Resin Skin',
    desc: 'Pine sap in every scar. When a blow finds flesh, a shell of amber sometimes seals it.',
    color: '#c49a3c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:resin_skin', name: 'Amber Seal',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'ward', absorb: 26, ticks: 140 },
          icd: 500,
        },
      },
    ],
    ranks: [
      {
        note: 'The seal takes more of the next blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:resin_skin', name: 'Amber Seal',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'ward', absorb: 32, ticks: 140 },
              icd: 500,
            },
          },
        ],
      },
      {
        note: 'The sap runs sooner after it is spent.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:resin_skin', name: 'Amber Seal',
              trigger: { on: 'hurt', chance: 0.22 },
              action: { do: 'ward', absorb: 38, ticks: 150 },
              icd: 440,
            },
          },
        ],
      },
      {
        note: 'Amber under the skin, and the wound knits between blows.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:resin_skin', name: 'Amber Seal',
              trigger: { on: 'hurt', chance: 0.24 },
              action: { do: 'ward', absorb: 48, ticks: 160 },
              icd: 400,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },

  // ------------------------------------------ 20..40: the trade's rhythms
  {
    id: 'timber_sense',
    skill: 'woodcutting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Timber Sense',
    desc: 'You know where the grain wants to split. Logs sometimes come double.',
    color: '#6b4a26',
    effects: [{ kind: 'doubleGather', skill: 'woodcutting', chance: 0.1 }],
    ranks: [
      { note: 'The grain speaks a little louder.', effects: [{ kind: 'doubleGather', skill: 'woodcutting', chance: 0.13 }] },
      { note: 'You read the split before the axe does.', effects: [{ kind: 'doubleGather', skill: 'woodcutting', chance: 0.16 }] },
      {
        note: 'One log in five comes as two, and every tree reads a few rings older to you.',
        effects: [
          { kind: 'doubleGather', skill: 'woodcutting', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'felling_rhythm',
    skill: 'woodcutting',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Felling Rhythm',
    desc: 'Swing, breathe, swing. Every sixth log the rhythm pays a length over.',
    color: '#7d5a36',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:felling_rhythm', name: 'The Sixth Stroke',
          trigger: { on: 'stacks', per: 'gather', count: 6 },
          action: { do: 'yield', extra: 1 },
          icd: 20,
        },
      },
    ],
    ranks: [
      {
        note: 'The rhythm closes on the fifth log.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:felling_rhythm', name: 'The Fifth Stroke',
              trigger: { on: 'stacks', per: 'gather', count: 5 },
              action: { do: 'yield', extra: 1 },
              icd: 20,
            },
          },
        ],
      },
      {
        note: 'The rhythm closes on the fourth log.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:felling_rhythm', name: 'The Fourth Stroke',
              trigger: { on: 'stacks', per: 'gather', count: 4 },
              action: { do: 'yield', extra: 1 },
              icd: 20,
            },
          },
        ],
      },
      {
        note: 'The rhythm holds one more beat and pays two lengths over.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:felling_rhythm', name: 'The Fifth Stroke',
              trigger: { on: 'stacks', per: 'gather', count: 5 },
              action: { do: 'yield', extra: 2 },
              icd: 20,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'sunup_stroke',
    skill: 'woodcutting',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Sunup Stroke',
    desc: 'The crews cut by daylight and walk home by dusk. In sunlight you gather and walk quicker.',
    color: '#e0b060',
    effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Sunup Stroke', gatherSpeed: 1.06, speedMult: 1.03 } }],
    ranks: [
      { note: 'The light finds more work in the hands.', effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Sunup Stroke', gatherSpeed: 1.08, speedMult: 1.04 } }] },
      { note: 'The whole day is a felling day.', effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Sunup Stroke', gatherSpeed: 1.1, speedMult: 1.05 } }] },
      {
        note: 'Under the sun the crew is never tired, and rests light between blows.',
        effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Sunup Stroke', gatherSpeed: 1.12, speedMult: 1.06, regenPer4s: 1 } }],
      },
    ],
  },
  {
    id: 'splinter_edge',
    skill: 'woodcutting',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Splinter Edge',
    desc: 'An axe hand strikes to open, not to bruise. Blows sometimes leave a bleeding split.',
    color: '#a0522d',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:splinter_edge', name: 'Splinters',
          trigger: { on: 'hit', chance: 0.18 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The split runs deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splinter_edge', name: 'Splinters',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The edge finds the grain oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splinter_edge', name: 'Splinters',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 110 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'The split bleeds longer, and the edge finds the weak grain oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:splinter_edge', name: 'Splinters',
              trigger: { on: 'hit', chance: 0.24 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 130 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  {
    id: 'knot_reader',
    skill: 'woodcutting',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Knot Reader',
    desc: 'You read a whole stand from one stump. Trees read older to you; a cut shows the good wood.',
    color: '#5d6b2e',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:knot_reader', name: 'The Stand Shows',
          trigger: { on: 'gather', chance: 0.25 },
          action: { do: 'reveal', radius: 9, of: 'node' },
          icd: 300,
        },
      },
      { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 3 } },
    ],
    ranks: [
      {
        note: 'The stand shows itself further out.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knot_reader', name: 'The Stand Shows',
              trigger: { on: 'gather', chance: 0.25 },
              action: { do: 'reveal', radius: 11, of: 'node' },
              icd: 300,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 3 } },
        ],
      },
      {
        note: 'You read it from more stumps, more often.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knot_reader', name: 'The Stand Shows',
              trigger: { on: 'gather', chance: 0.32 },
              action: { do: 'reveal', radius: 12, of: 'node' },
              icd: 260,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 3 } },
        ],
      },
      {
        note: 'The whole hillside reads like a ledger, and every tree stands a little lower to you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:knot_reader', name: 'The Stand Shows',
              trigger: { on: 'gather', chance: 0.35 },
              action: { do: 'reveal', radius: 14, of: 'node' },
              icd: 240,
            },
          },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 4 } },
        ],
      },
    ],
  },

  // ---------------------------------------- 45..55: the wounded-tree pair
  {
    id: 'back_cut',
    skill: 'woodcutting',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Back Cut',
    desc: 'The second cut goes where the first one opened. Bleeding foes you strike sometimes sunder.',
    color: '#b8863c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:back_cut', name: 'Back Cut',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
          action: { do: 'status', status: 'sunder', power: 8, ticks: 80 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The sunder bites deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_cut', name: 'Back Cut',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The wound stays open longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_cut', name: 'Back Cut',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.34 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 100 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'The open wound takes the second cut harder: bleeding foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:back_cut', name: 'Back Cut',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.36 },
              action: { do: 'status', status: 'sunder', power: 14, ticks: 110 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'yew_heart',
    skill: 'woodcutting',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Yew Heart',
    desc: 'Yew heartwood eats lesser edges, and so do you. More health, and deep rest on the stump.',
    color: '#4f6b3a',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
      { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Stump Rest', regenPer4s: 2 } },
    ],
    ranks: [
      {
        note: 'The heartwood thickens.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Stump Rest', regenPer4s: 2 } },
        ],
      },
      {
        note: 'The sap runs stronger.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Stump Rest', regenPer4s: 3 } },
        ],
      },
      {
        note: 'A yew that has stood two hundred winters, and walks light off the stump between fights.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 24 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Stump Rest', regenPer4s: 3, speedMult: 1.03 } },
        ],
      },
    ],
  },
  {
    id: 'widowmaker',
    skill: 'woodcutting',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Widowmaker',
    desc: 'Named for the branch that falls unseen. Greatblows crit oftener and finish the leaning.',
    color: '#6f4f2a',
    effects: [
      { kind: 'perk', perk: 'greatExecute', magnitude: 0.1 },
      { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
    ],
    ranks: [
      {
        note: 'The finishing stroke falls heavier.',
        effects: [
          { kind: 'perk', perk: 'greatExecute', magnitude: 0.14 },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'You see the lean before the branch does.',
        effects: [
          { kind: 'perk', perk: 'greatExecute', magnitude: 0.18 },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
      {
        note: 'Nothing that leans stays standing, and the whole arm goes into the last stroke.',
        effects: [
          { kind: 'perk', perk: 'greatExecute', magnitude: 0.22 },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
        ],
      },
    ],
  },

  // ---------------------------------- 60..75: the crew that fights back
  {
    id: 'heartwood_eye',
    skill: 'woodcutting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Heartwood Eye',
    desc: 'Every tree tells you where to stand. You fell them faster.',
    color: '#7d5a36',
    effects: [{ kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.12 }],
    ranks: [
      { note: 'The first cut lands where the last one should have.', effects: [{ kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.16 }] },
      {
        note: 'You stand where the tree wants you, and read it a few rings older.',
        effects: [
          { kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 3 } },
        ],
      },
      {
        note: 'The tree is down before it knows it was seen.',
        effects: [
          { kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.24 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodcutting', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'ironbark',
    skill: 'woodcutting',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Ironbark',
    desc: 'Struck hard enough, you bark over. Blows sometimes coat you in stone; stonehide bites.',
    color: '#8a6a3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ironbark', name: 'Bark Over',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
          icd: 400,
        },
      },
      { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Ironbark', armor: 4, reflectFrac: 0.06 } },
    ],
    ranks: [
      {
        note: 'The bark grows thicker.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironbark', name: 'Bark Over',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 400,
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Ironbark', armor: 6, reflectFrac: 0.08 } },
        ],
      },
      {
        note: 'The bark comes quicker after a blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironbark', name: 'Bark Over',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 340,
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Ironbark', armor: 7, reflectFrac: 0.1 } },
        ],
      },
      {
        note: 'Ironbark from heel to crown: whatever bites you bites stone, and pays for it.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironbark', name: 'Bark Over',
              trigger: { on: 'hurt', chance: 0.32 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 300,
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'stonehide' }, grant: { name: 'Ironbark', armor: 8, reflectFrac: 0.12 } },
        ],
      },
    ],
  },
  {
    id: 'winter_felling',
    skill: 'woodcutting',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Winter Felling',
    desc: 'Timber is felled when the sap sleeps. Chilled and sundered foes split like frozen oak.',
    color: '#9fb4c8',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The frost goes deeper into the grain.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
        ],
      },
      {
        note: 'A split body splits again under the axe.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 16 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
        ],
      },
      {
        note: 'The hardest winter, the cleanest split, and every strike bites a shade deeper.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 18 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  {
    id: 'timber_call',
    skill: 'woodcutting',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Timber Call',
    desc: 'What you fell lands on whoever stands too near. Kills burst outward; the hands stay quick.',
    color: '#d1a054',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:timber_call', name: 'TIMBER',
          trigger: { on: 'kill' },
          action: { do: 'nova', damage: 14, radius: 2.6 },
          icd: 220,
        },
      },
      { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 20 } },
    ],
    ranks: [
      {
        note: 'The crown falls heavier.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:timber_call', name: 'TIMBER',
              trigger: { on: 'kill' },
              action: { do: 'nova', damage: 18, radius: 2.6 },
              icd: 220,
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 24 } },
        ],
      },
      {
        note: 'The crown falls wider, and sooner again.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:timber_call', name: 'TIMBER',
              trigger: { on: 'kill' },
              action: { do: 'nova', damage: 22, radius: 2.9 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 28 } },
        ],
      },
      {
        note: 'The whole stand comes down at the call.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:timber_call', name: 'TIMBER',
              trigger: { on: 'kill' },
              action: { do: 'nova', damage: 26, radius: 3.2 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 32 } },
        ],
      },
    ],
  },

  // ------------------------------------------- 80: THE MASTER'S LICENSE
  {
    id: 'master_feller',
    skill: 'woodcutting',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Master Feller',
    desc: 'The tree comes down where you say. Fell Timber seats for you, and the arm to swing it.',
    color: '#c47a3d',
    effects: [
      { kind: 'art', ability: 'fell_timber' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The felling stroke lands heavier.',
        effects: [
          { kind: 'art', ability: 'fell_timber' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } },
        ],
      },
      {
        note: 'You find the weak fibre in every trunk.',
        effects: [
          { kind: 'art', ability: 'fell_timber' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'A master of the fell: the arm, the eye, and a stroke that comes back around sooner.',
        effects: [
          { kind: 'art', ability: 'fell_timber' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, woodcutting's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const WOODCUTTING_LICENSES: CallingLicense[] = [
  // The wounded-tree pair: Splinter Edge lays the bleed Back Cut reads,
  // and at IV Back Cut strikes any bleeding body harder (vsState).
  { calling: 'splinter_edge', status: 'bleed', via: 'lay:status' },
  { calling: 'back_cut', status: 'bleed', via: 'read:hitState' },
  { calling: 'back_cut', status: 'bleed', via: 'read:vsState' },
  { calling: 'back_cut', status: 'sunder', via: 'lay:status' },
  // Ironbark coats itself in stone and answers any stonehide it rides.
  { calling: 'ironbark', status: 'stonehide', via: 'lay:boon' },
  { calling: 'ironbark', status: 'stonehide', via: 'read:stateRiding' },
  // Winter Felling reads the frost other hands lay, and its own sunder.
  { calling: 'winter_felling', status: 'chill', via: 'read:vsState' },
  { calling: 'winter_felling', status: 'sunder', via: 'read:vsState' },
];

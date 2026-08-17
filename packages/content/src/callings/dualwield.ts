/**
 * THE FILLED HALL — dualwield's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE TWIN SCHOOL's dialect: tempo. Everything arrives in pairs, the
 * second beat is the identity. The ladder's arc:
 *  - 5..15   three clean identities: the second beat, the quick wrists,
 *            the paired cut that leaves a red thread.
 *  - 20..50  the verbs: Ambidexter tightens the echo, the knives work
 *            between fights, the kept time quickens the wearer,
 *            the second wound reads the first, the ring is answered.
 *  - 55..75  the outward seats and the synergy pair close: the split
 *            armor is read and weakened, Twin Tempo lifts the echo,
 *            the tally settles up, the ringing steel staggers, the
 *            cornered pair fights hardest at the wall.
 *  - 80      THE MASTER'S LICENSE: Hundred Hands, seated at eighty.
 *
 * Pages: LAYS bleed (15), quicken (30), weaken (55), shock (70);
 * READS bleed by hitState + vsState (40), quicken by stateRiding (50),
 * sunder by hitState + vsState (55), chill by vsState (55 IV).
 *
 * The fresh-eyes pass (the critic's cut): Second Beat swings a felt
 * 5..8%; Quick Wrists IV resets the arts on a kill instead of a third
 * "+2 crit"; Paired Cuts IV lost its dead vsState (Second Wound IV holds
 * the bleed edge, HIGHEST WINS); Busy Hands became Knife Work (two
 * knives are a toolkit, that is the root); Both Sides became Either
 * Kidney.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const DUALWIELD_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------------ 5
  {
    id: 'second_beat',
    skill: 'dualwield',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Second Beat',
    desc: 'You count in twos now. With a blade in each hand, the basics swing faster.',
    color: '#d9a441',
    effects: [
      { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Second Beat', attackSpeedMult: 1.05 } },
    ],
    ranks: [
      {
        note: 'The count comes quicker.',
        effects: [
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Second Beat', attackSpeedMult: 1.06 } },
        ],
      },
      {
        note: 'The two hands share one tempo.',
        effects: [
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Second Beat', attackSpeedMult: 1.07 } },
        ],
      },
      {
        note: 'The second beat lands where the first one looked.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'dualWielding' },
            grant: { name: 'Second Beat', attackSpeedMult: 1.08, critPct: 2 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 10
  {
    id: 'quick_wrists',
    skill: 'dualwield',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Quick Wrists',
    desc: 'Two light blades and no shield to lug. You move faster, everywhere.',
    color: '#e0c060',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 5 } }],
    ranks: [
      { note: 'The feet learn what the wrists know.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 6 } }] },
      { note: 'The stride keeps the count.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 7 } }] },
      {
        note: 'A kill and the wrists reset. Your arts come round sooner after every kill.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 8 } },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 15
  {
    id: 'paired_cuts',
    skill: 'dualwield',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Paired Cuts',
    desc: 'Two edges cross in the same wound. Landed blows sometimes leave a bleed.',
    color: '#c44a3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:paired_cuts', name: 'Paired Cuts',
          trigger: { on: 'hit', chance: 0.16 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 80 },
          icd: 60, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The cross runs longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:paired_cuts', name: 'Paired Cuts',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
              icd: 60, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The cross runs deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:paired_cuts', name: 'Paired Cuts',
              trigger: { on: 'hit', chance: 0.20 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
              icd: 50, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Every fourth blow crosses, and the red thread runs the whole minute.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:paired_cuts', name: 'Paired Cuts',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 40, element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 20 (founding)
  {
    id: 'ambidexter',
    skill: 'dualwield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Ambidexter',
    desc: 'The off hand stops waiting its turn. The echo lands tighter.',
    color: '#b8a88a',
    effects: [{ kind: 'perk', perk: 'offhandDelayTicks', magnitude: 3 }],
    ranks: [
      {
        note: 'The tightened echo finds openings.',
        effects: [
          { kind: 'perk', perk: 'offhandDelayTicks', magnitude: 3 },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Ambidexter', critPct: 2 } },
        ],
      },
      {
        note: 'The echo lands a beat closer still.',
        effects: [
          { kind: 'perk', perk: 'offhandDelayTicks', magnitude: 2 },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Ambidexter', critPct: 3 } },
        ],
      },
      {
        note: 'There is no off hand. Both hands are the first hand.',
        effects: [
          { kind: 'perk', perk: 'offhandDelayTicks', magnitude: 2 },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Ambidexter', critPct: 4, dmgMult: 1.04 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 25 (outward)
  {
    id: 'busy_hands',
    skill: 'dualwield',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Knife Work',
    desc: 'Two knives are a whole toolkit between fights. Out of combat you gather and walk faster.',
    color: '#c8b078',
    effects: [
      { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Knife Work', gatherSpeed: 1.06, speedMult: 1.03 } },
    ],
    ranks: [
      {
        note: 'The skinning knife works quicker.',
        effects: [
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Knife Work', gatherSpeed: 1.08, speedMult: 1.03 } },
        ],
      },
      {
        note: 'The road shortens between jobs.',
        effects: [
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Knife Work', gatherSpeed: 1.1, speedMult: 1.04 } },
        ],
      },
      {
        note: 'Two knives at every task. The idle hour is a stranger.',
        effects: [
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Knife Work', gatherSpeed: 1.12, speedMult: 1.05 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 30
  {
    id: 'kept_time',
    skill: 'dualwield',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Kept Time',
    desc: 'The rhythm feeds itself. Every sixth landed blow quickens your hands.',
    color: '#ffd76a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:kept_time', name: 'Kept Time',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 100, element: 'radiant',
        },
      },
    ],
    ranks: [
      {
        note: 'The quickening holds longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:kept_time', name: 'Kept Time',
              trigger: { on: 'stacks', per: 'hit', count: 6 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 100, element: 'radiant',
            },
          },
        ],
      },
      {
        note: 'The count shortens to five.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:kept_time', name: 'Kept Time',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 80, element: 'radiant',
            },
          },
        ],
      },
      {
        note: 'The tempo never quite lets go of you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:kept_time', name: 'Kept Time',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 60, element: 'radiant',
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 35 (outward)
  {
    id: 'both_sides',
    skill: 'dualwield',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Either Kidney',
    desc: 'A knife for each kidney. Backstabs hit harder and your crouch is quieter.',
    color: '#8a7a6a',
    effects: [
      { kind: 'perk', perk: 'backstabBonus', magnitude: 0.15 },
      { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.03 },
    ],
    ranks: [
      {
        note: 'The turned back pays more.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.2 },
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.03 },
        ],
      },
      {
        note: 'Quieter on the approach.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.2 },
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 },
        ],
      },
      {
        note: 'They never hear the second knife either.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.3 },
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'sneak', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 40
  {
    id: 'second_wound',
    skill: 'dualwield',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Second Wound',
    desc: 'The second edge reads the first. Striking a bleeding foe may drive a bolt into the wound.',
    color: '#a83a30',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:second_wound', name: 'Second Wound',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
          action: { do: 'bolt', damage: 14 },
          icd: 160, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The bolt bites deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:second_wound', name: 'Second Wound',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'bolt', damage: 18 },
              icd: 160, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The second edge reads oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:second_wound', name: 'Second Wound',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'bolt', damage: 22 },
              icd: 160, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'What bleeds, you finish. Bleeding foes take more from every cut.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:second_wound', name: 'Second Wound',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'bolt', damage: 26 },
              icd: 160, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 45
  {
    id: 'ringed',
    skill: 'dualwield',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Ringed',
    desc: 'Two blades were made for the circle. With three or more foes close, you cut harder.',
    color: '#b8a070',
    effects: [
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', critPct: 3, dmgMult: 1.06 } },
    ],
    ranks: [
      {
        note: 'The circle pays more.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', critPct: 4, dmgMult: 1.08 } },
        ],
      },
      {
        note: 'The more of them, the surer your hands.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ringed', critPct: 5, dmgMult: 1.1 } },
        ],
      },
      {
        note: 'Ringed, you bleed less than they expect.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Ringed', critPct: 6, dmgMult: 1.1, armor: 4 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 50
  {
    id: 'quickened_edge',
    skill: 'dualwield',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Quickened Edge',
    desc: 'Speed is where the openings are. While quickened, your cuts crit and bite harder.',
    color: '#e8c878',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'quicken' },
        grant: { name: 'Quickened Edge', critPct: 4, dmgMult: 1.05 },
      },
    ],
    ranks: [
      {
        note: 'The quick hand crits oftener.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Quickened Edge', critPct: 5, dmgMult: 1.06 },
          },
        ],
      },
      {
        note: 'The quick hand cuts deeper.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Quickened Edge', critPct: 6, dmgMult: 1.08 },
          },
        ],
      },
      {
        note: 'Quickened, the two hands drink a little of what they cut.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Quickened Edge', critPct: 7, dmgMult: 1.08, meleeLifesteal: 0.04 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 55
  {
    id: 'through_the_split',
    skill: 'dualwield',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Through the Split',
    desc: 'Where armor is sundered, the edge finds the arm. Sundered foes take more, and may weaken.',
    color: '#b8b2a6',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:through_the_split', name: 'Through the Split',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
          action: { do: 'status', status: 'weaken', power: 8, ticks: 80 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The edge goes further in.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_split', name: 'Through the Split',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The weakness lasts.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_split', name: 'Through the Split',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.35 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'Cold slows the arm too. Chilled foes take more from you as well.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_split', name: 'Through the Split',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.35 },
              action: { do: 'status', status: 'weaken', power: 14, ticks: 100 },
              icd: 80,
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 60 (founding)
  {
    id: 'twin_tempo',
    skill: 'dualwield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Twin Tempo',
    desc: 'Two hands, one intention. The echo strikes harder.',
    color: '#a8927a',
    effects: [{ kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.05 }],
    ranks: [
      {
        note: 'The echo carries more of the weight.',
        effects: [{ kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.07 }],
      },
      {
        note: 'Both blades are melee steel, and it shows.',
        effects: [
          { kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.08 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 6 } },
        ],
      },
      {
        note: 'One intention, two answers, neither of them the softer.',
        effects: [
          { kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.1 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 65 (outward)
  {
    id: 'the_tally',
    skill: 'dualwield',
    unlockLevel: 65,
    focusCost: 2,
    name: 'The Tally',
    desc: 'Two hands keep count for you. Every sixth landed blow settles up in health.',
    color: '#c47a5a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:the_tally', name: 'The Tally',
          trigger: { on: 'cadence', every: 6 },
          action: { do: 'heal', amount: 18 },
          icd: 120, element: 'blood',
        },
      },
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
    ],
    ranks: [
      {
        note: 'The count pays more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally', name: 'The Tally',
              trigger: { on: 'cadence', every: 6 },
              action: { do: 'heal', amount: 24 },
              icd: 120, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
      {
        note: 'The tally closes on the fifth.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally', name: 'The Tally',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'heal', amount: 28 },
              icd: 100, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'You are owed, and the ledger knows it.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_tally', name: 'The Tally',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'heal', amount: 34 },
              icd: 100, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 70
  {
    id: 'ringing_steel',
    skill: 'dualwield',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Ringing Steel',
    desc: 'Both bells strike true. Your crits come oftener and a clean hit rings a foe with shock.',
    color: '#e8e06a',
    effects: [
      { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ringing_steel', name: 'Ringing Steel',
          trigger: { on: 'crit' },
          action: { do: 'status', status: 'shock', power: 1, ticks: 40 },
          icd: 100, element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The bells ring oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ringing_steel', name: 'Ringing Steel',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 40 },
              icd: 100, element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The peal holds them longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ringing_steel', name: 'Ringing Steel',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 50 },
              icd: 90, element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The carillon: crits ring hard, and storm steel bites deeper.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 8 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ringing_steel', name: 'Ringing Steel',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 60 },
              icd: 80, element: 'storm',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 75
  {
    id: 'cornered_pair',
    skill: 'dualwield',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Cornered Pair',
    desc: 'Backed to the wall, both hands wake. Under two fifths health you swing faster and drink.',
    color: '#8a3a30',
    effects: [
      {
        kind: 'when',
        cond: { when: 'hpBelow', frac: 0.4 },
        grant: { name: 'Cornered Pair', attackSpeedMult: 1.05, meleeLifesteal: 0.05 },
      },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cornered_pair', name: 'Cornered Pair',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'ward', absorb: 36, ticks: 160 },
          icd: 600, element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The wall gives you more.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.4 },
            grant: { name: 'Cornered Pair', attackSpeedMult: 1.06, meleeLifesteal: 0.06 },
          },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cornered_pair', name: 'Cornered Pair',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 48, ticks: 160 },
              icd: 600, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The shell holds longer and returns sooner.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.4 },
            grant: { name: 'Cornered Pair', attackSpeedMult: 1.07, meleeLifesteal: 0.07 },
          },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cornered_pair', name: 'Cornered Pair',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 60, ticks: 180 },
              icd: 500, element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Cornered, the pair finds the soft place and the shell comes back sooner.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.4 },
            grant: { name: 'Cornered Pair', attackSpeedMult: 1.08, meleeLifesteal: 0.08, critPct: 3 },
          },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cornered_pair', name: 'Cornered Pair',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 72, ticks: 180 },
              icd: 400, element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 80 (capstone)
  {
    id: 'hundredfold',
    skill: 'dualwield',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Hundredfold',
    desc: 'The master\'s seat. Hundred Hands answers ten rungs early, and paired steel cuts deeper.',
    color: '#f0d890',
    effects: [
      { kind: 'art', ability: 'hundred_hands' },
      { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Hundredfold', dmgMult: 1.06, critPct: 3 } },
    ],
    ranks: [
      {
        note: 'Every hand hits harder.',
        effects: [
          { kind: 'art', ability: 'hundred_hands' },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Hundredfold', dmgMult: 1.08, critPct: 4 } },
        ],
      },
      {
        note: 'The arts come round sooner.',
        effects: [
          { kind: 'art', ability: 'hundred_hands' },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Hundredfold', dmgMult: 1.1, critPct: 5 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
        ],
      },
      {
        note: 'Count the hands later. Every eighth landed blow surges your damage.',
        effects: [
          { kind: 'art', ability: 'hundred_hands' },
          { kind: 'when', cond: { when: 'dualWielding' }, grant: { name: 'Hundredfold', dmgMult: 1.1, critPct: 6 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hundredfold', name: 'Hundredfold',
              trigger: { on: 'stacks', per: 'hit', count: 8 },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
              icd: 200, element: 'radiant',
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, dualwield's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const DUALWIELD_LICENSES: CallingLicense[] = [
  { calling: 'paired_cuts', status: 'bleed', via: 'lay:status' },
  { calling: 'kept_time', status: 'quicken', via: 'lay:boon' },
  { calling: 'second_wound', status: 'bleed', via: 'read:hitState' },
  { calling: 'second_wound', status: 'bleed', via: 'read:vsState' },
  { calling: 'quickened_edge', status: 'quicken', via: 'read:stateRiding' },
  { calling: 'through_the_split', status: 'sunder', via: 'read:vsState' },
  { calling: 'through_the_split', status: 'sunder', via: 'read:hitState' },
  { calling: 'through_the_split', status: 'weaken', via: 'lay:status' },
  { calling: 'through_the_split', status: 'chill', via: 'read:vsState' },
  { calling: 'ringing_steel', status: 'shock', via: 'lay:status' },
];

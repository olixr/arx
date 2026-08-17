/**
 * THE FILLED HALL — onehand's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE BLADE SCHOOL'S ARC: the first three seats are the sword hand's
 * identities (the edge, the tempo, the placed cut); 20..50 are the
 * verbs of the string — the finisher, the opened vein, the riposte,
 * the drumroll that quickens the hand, the seam a smith's sunder
 * shows you, the ledger a bleed opens; 55..75 close the ladder's own
 * pair (Drumroll lays quicken, In Tempo reads it) and send the
 * school outward (any hand that lands a blow rides the strike-channel
 * seats); 80 is THE MASTER'S LICENSE — Last Word, the finisher's art.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ONEHAND_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5: the edge
  {
    id: 'edge_alive',
    skill: 'onehand',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Edge Alive',
    desc: 'The steel wakes in your grip. One-hand blades cut harder.',
    color: '#c9c2b4',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } }],
    ranks: [
      {
        note: 'The edge bites a little deeper.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } }],
      },
      {
        note: 'The blade knows the line before you do.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } }],
      },
      {
        note: 'The cut is placed, not thrown: a whetstone of crit rides the edge.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 10: the tempo
  {
    id: 'tempo_kept',
    skill: 'onehand',
    unlockLevel: 10,
    focusCost: 1,
    name: 'The Quick Wrist',
    desc: 'The string never breathes. With a one-hand blade in hand your swings come quicker.',
    color: '#e8d8a8',
    effects: [
      { kind: 'when', cond: { when: 'wielding', style: 'onehand' }, grant: { name: 'Tempo', attackSpeedMult: 1.05 } },
    ],
    ranks: [
      {
        note: 'The beat tightens.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'onehand' }, grant: { name: 'Tempo', attackSpeedMult: 1.06 } },
        ],
      },
      {
        note: 'The wrist forgets to rest between blows.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'onehand' }, grant: { name: 'Tempo', attackSpeedMult: 1.07 } },
        ],
      },
      {
        note: 'The feet keep the beat too: the hand at its quickest, and a step of speed rides the tempo.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wielding', style: 'onehand' },
            grant: { name: 'Tempo', attackSpeedMult: 1.08, speedMult: 1.04 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 15: the placed cut
  {
    id: 'hairline_cut',
    skill: 'onehand',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Hairline Cut',
    desc: 'You find the seam a hair wide, and put the point there. Your blows crit more.',
    color: '#d46a4a',
    effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 4 } }],
    ranks: [
      {
        note: 'The seam widens to the eye.',
        effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 5 } }],
      },
      {
        note: 'Every guard has a gap, and you have found it.',
        effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 6 } }],
      },
      {
        note: 'The cut finds the wound already open: bleeding foes take more from your steel.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 7 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 20: the finisher (founding)
  {
    id: 'follow_through',
    skill: 'onehand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Follow-Through',
    desc: 'The third blow carries the first two. Finishers hit a tenth harder.',
    color: '#d9a05a',
    effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.1 }],
    ranks: [
      {
        note: 'The finisher lands with more of the string behind it.',
        effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.15 }],
      },
      {
        note: 'Swing, swing, and the third blow is the whole argument.',
        effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.2 }],
      },
      {
        note: 'The weight carries into every blow: a one-hand blade in hand deals more.',
        effects: [
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.25 },
          { kind: 'when', cond: { when: 'wielding', style: 'onehand' }, grant: { name: 'Weight Behind', dmgMult: 1.05 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 25: the opened vein
  {
    id: 'red_follow',
    skill: 'onehand',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Red Follow',
    desc: 'The fourth cut is drawn, not struck. Every fourth landed blow opens a bleed.',
    color: '#a83c3c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:red_follow', name: 'Red Follow',
          trigger: { on: 'cadence', every: 4 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 80 },
          icd: 40,
        },
      },
    ],
    ranks: [
      {
        note: 'The wound stays open longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_follow', name: 'Red Follow',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
              icd: 40,
            },
          },
        ],
      },
      {
        note: 'The cut goes deeper before it is drawn.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_follow', name: 'Red Follow',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
              icd: 40,
            },
          },
        ],
      },
      {
        note: 'The vein is found by eye: the bleed runs long and a whetstone of crit rides it.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:red_follow', name: 'Red Follow',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 40,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 30: the riposte
  {
    id: 'the_riposte',
    skill: 'onehand',
    unlockLevel: 30,
    focusCost: 1,
    name: 'The Riposte',
    desc: 'A blow that reaches you shows you the line back. Getting hurt sharpens your crit.',
    color: '#b0b8c0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:the_riposte', name: 'Riposte',
          trigger: { on: 'hurt', chance: 0.35 },
          action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'You read the line back more often.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_riposte', name: 'Riposte',
              trigger: { on: 'hurt', chance: 0.45 },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The answer comes sharper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_riposte', name: 'Riposte',
              trigger: { on: 'hurt', chance: 0.45 },
              action: { do: 'surge', stat: 'crit', pct: 16, ticks: 100 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The parry holds as it answers: the riposte sharpens longer and a guard of armor stays.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_riposte', name: 'Riposte',
              trigger: { on: 'hurt', chance: 0.5 },
              action: { do: 'surge', stat: 'crit', pct: 18, ticks: 120 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 35: bloodwise
  {
    id: 'bloodwise',
    skill: 'onehand',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Bloodwise',
    desc: 'An open wound tells you where to stand. Striking a bleeding foe closes some of yours.',
    color: '#8a2e2a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:bloodwise', name: 'Bloodwise',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
          action: { do: 'heal', amount: 12 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'More of the red is yours to keep.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bloodwise', name: 'Bloodwise',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'heal', amount: 16 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'You read the wound sooner and oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bloodwise', name: 'Bloodwise',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'heal', amount: 20 },
              icd: 80,
            },
          },
        ],
      },
      {
        note: 'The wise hand carries more life to spend: a deeper heal and a broader chest.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:bloodwise', name: 'Bloodwise',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'heal', amount: 24 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 40: the drumroll
  {
    id: 'drumroll',
    skill: 'onehand',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Drumroll',
    desc: 'Six clean blows and the hand runs ahead of the mind. Landed strikes build a Quicken.',
    color: '#e0b070',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:drumroll', name: 'Drumroll',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The roll builds on five.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:drumroll', name: 'Drumroll',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The quickening lingers in the wrist.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:drumroll', name: 'Drumroll',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'Four blows and the roll breaks; the whole hand runs quicker and arts recover sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:drumroll', name: 'Drumroll',
              trigger: { on: 'stacks', per: 'hit', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 45: the sundered seam
  {
    id: 'sundered_seam',
    skill: 'onehand',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Sundered Seam',
    desc: 'A broken plate is a door. Sundered foes take more from you, and blows past it Weaken.',
    color: '#7c8894',
    effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sundered_seam', name: 'Past the Plate',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
              action: { do: 'status', status: 'weaken', power: 8, ticks: 80 },
              icd: 140,
            },
          },
    ],
    ranks: [
      {
        note: 'The door opens wider, and the arm behind it goes softer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sundered_seam', name: 'Past the Plate',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 80 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'You go through the gap as if it were made for you; the Weaken lingers.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sundered_seam', name: 'Past the Plate',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'Through the gap to the arm behind it: a sundered foe takes a sixth more and hits softer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:sundered_seam', name: 'Past the Plate',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 14, ticks: 100 },
              icd: 120,
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 50: the cutter's ledger
  {
    id: 'cutters_ledger',
    skill: 'onehand',
    unlockLevel: 50,
    focusCost: 2,
    name: "Cutter's Ledger",
    desc: 'First blood opens the account. When you lay a bleed, your blows surge for a breath.',
    color: '#c05040',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cutters_ledger', name: 'The Ledger Opens',
          trigger: { on: 'stateApplied', status: 'bleed' },
          action: { do: 'surge', stat: 'damage', pct: 10, ticks: 80 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The account pays better.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutters_ledger', name: 'The Ledger Opens',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 13, ticks: 80 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The surge holds through the whole string.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutters_ledger', name: 'The Ledger Opens',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'The book is kept in red ink: a stronger surge, and one-hand blades cut harder besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutters_ledger', name: 'The Ledger Opens',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 140,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 55: in tempo
  {
    id: 'in_tempo',
    skill: 'onehand',
    unlockLevel: 55,
    focusCost: 2,
    name: 'In Tempo',
    desc: 'A quickened hand is a deadly one. While Quickened you deal more, and arts recover sooner.',
    color: '#f0e6c8',
    effects: [
      { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
      { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'In Tempo', dmgMult: 1.06 } },
    ],
    ranks: [
      {
        note: 'The tempo carries more weight.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
          { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'In Tempo', dmgMult: 1.08 } },
        ],
      },
      {
        note: 'The arts fall into the beat as well.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
          { kind: 'when', cond: { when: 'stateRiding', status: 'quicken' }, grant: { name: 'In Tempo', dmgMult: 1.1 } },
        ],
      },
      {
        note: 'In tempo, every cut is placed: the quickened hand deals more and crits besides.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'In Tempo', dmgMult: 1.12, critPct: 3 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 60: warpath (founding)
  {
    id: 'warpath',
    skill: 'onehand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Warpath',
    desc: 'Every kill feeds the next. Each fallen foe hands back cooldown and speeds your stride.',
    color: '#b8433a',
    effects: [
      { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:warpath', name: 'Warpath',
          trigger: { on: 'kill' },
          action: { do: 'surge', stat: 'speed', pct: 14, ticks: 60 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'Each fallen foe hands back a little more, and the stride holds longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:warpath', name: 'Warpath',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 16, ticks: 70 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'The path runs hotter.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 20 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:warpath', name: 'Warpath',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 18, ticks: 80 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'The road opens under you: the surge at its fullest, and your stride quickens for good.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 24 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:warpath', name: 'Warpath',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 20, ticks: 90 },
              icd: 120,
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 65: brittle cold
  {
    id: 'brittle_cold',
    skill: 'onehand',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Brittle Cold',
    desc: 'Cold makes a body brittle. Chilled foes take more, and a placed thrust may break them.',
    color: '#9cc0d0',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:brittle_cold', name: 'Brittle Cold',
          trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The frozen crack sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:brittle_cold', name: 'Brittle Cold',
              trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The thrust goes through like a nail through ice.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:brittle_cold', name: 'Brittle Cold',
              trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'Winter is a whetstone: chilled foes take a sixth more, and the break lands harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:brittle_cold', name: 'Brittle Cold',
              trigger: { on: 'hitState', status: 'chill', chance: 0.4 },
              action: { do: 'bolt', damage: 24 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 70: through and through
  {
    id: 'through_and_through',
    skill: 'onehand',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Through and Through',
    desc: 'A perfect cut does not stop at one body. Crits carry on to the next foe.',
    color: '#c8a06a',
    effects: [
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:through_and_through', name: 'Through and Through',
          trigger: { on: 'crit' },
          action: { do: 'chain', damage: 12, jumps: 2 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The carried cut bites deeper.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_and_through', name: 'Through and Through',
              trigger: { on: 'crit' },
              action: { do: 'chain', damage: 14, jumps: 2 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The cut finds a third throat.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_and_through', name: 'Through and Through',
              trigger: { on: 'crit' },
              action: { do: 'chain', damage: 16, jumps: 3 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The signature: the crit carries to three, and the finisher carries the whole string.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_and_through', name: 'Through and Through',
              trigger: { on: 'crit' },
              action: { do: 'chain', damage: 18, jumps: 3 },
              icd: 160,
            },
          },
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.08 },
        ],
      },
    ],
  },
  // ------------------------------------------------ 75: ring of steel
  {
    id: 'ring_of_steel',
    skill: 'onehand',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Turning Circle',
    desc: 'The duelist turns a circle when the crowd closes. Outnumbered, you harden and quicken.',
    color: '#d8c8b0',
    effects: [
      { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
      {
        kind: 'when',
        cond: { when: 'outnumbered', count: 3 },
        grant: { name: 'Turning Circle', armor: 8, attackSpeedMult: 1.05 },
      },
    ],
    ranks: [
      {
        note: 'The circle holds firmer.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Turning Circle', armor: 10, attackSpeedMult: 1.05 },
          },
        ],
      },
      {
        note: 'Those who press the ring cut themselves on it.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 6 } },
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Turning Circle', armor: 12, attackSpeedMult: 1.06 },
          },
        ],
      },
      {
        note: 'The circle turns until the crowd is gone: harder, quicker, and it closes its own cuts.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 7 } },
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Turning Circle', armor: 14, attackSpeedMult: 1.07, regenPer4s: 2 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 80: the master's license
  {
    id: 'the_last_word',
    skill: 'onehand',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Last Word',
    desc: 'The school licenses its finisher. Last Word seats in your codex; finishers hit harder.',
    color: '#f4e2b0',
    effects: [
      { kind: 'art', ability: 'last_word' },
      { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.15 },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The word carries further: one-hand blades cut harder.',
        effects: [
          { kind: 'art', ability: 'last_word' },
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.15 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } },
        ],
      },
      {
        note: 'The finisher is said with the whole arm.',
        effects: [
          { kind: 'art', ability: 'last_word' },
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.22 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } },
        ],
      },
      {
        note: 'Said and done: after each kill the master breathes, and a Mend closes the fight.',
        effects: [
          { kind: 'art', ability: 'last_word' },
          { kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.3 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_last_word', name: 'Said and Done',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
              icd: 120,
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, onehand's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding
 * / vsState) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const ONEHAND_LICENSES: CallingLicense[] = [
  // The placed cut reads the open wound.
  { calling: 'hairline_cut', status: 'bleed', via: 'read:vsState' },
  // The fourth cut opens the vein.
  { calling: 'red_follow', status: 'bleed', via: 'lay:status' },
  // A bleeding foe tells the wise hand where to stand.
  { calling: 'bloodwise', status: 'bleed', via: 'read:hitState' },
  // The drumroll quickens the hand.
  { calling: 'drumroll', status: 'quicken', via: 'lay:boon' },
  // The smith's mark is the blade's door; through it, the arm goes soft.
  { calling: 'sundered_seam', status: 'sunder', via: 'read:vsState' },
  { calling: 'sundered_seam', status: 'sunder', via: 'read:hitState' },
  { calling: 'sundered_seam', status: 'weaken', via: 'lay:status' },
  // First blood opens the account (a bleed laid by the player's own hand).
  { calling: 'cutters_ledger', status: 'bleed', via: 'read:stateApplied' },
  // The ladder's own pair closes: Drumroll lays quicken, In Tempo reads it.
  { calling: 'in_tempo', status: 'quicken', via: 'read:stateRiding' },
  // Winter is a whetstone: the caster's chill, the blade's break.
  { calling: 'brittle_cold', status: 'chill', via: 'read:vsState' },
  { calling: 'brittle_cold', status: 'chill', via: 'read:hitState' },
  // The master breathes after the last word.
  { calling: 'the_last_word', status: 'mend', via: 'lay:boon' },
];

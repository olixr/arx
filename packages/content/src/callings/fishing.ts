/**
 * THE FILLED HALL — fishing's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE PATIENT LINE's arc: the reed bed (stillness pays: armor, regen,
 * the still shot), the water read (speed on the reel, the doubled
 * catch, the shoal seen before it is fished), the given line (the
 * running fish is not fought: a shell of calm under blows), the cold
 * catch (the channel's cold laid on a foe and then answered), the dark
 * water (dusk, the leap, oilskins), and the mere's master: the gaff hand,
 * whose hook chills, whose net holds, whose cold catch takes more.
 * Pages: LAYS chill / mend / root; READS chill (hitState, stateApplied,
 * vsState), shock (vsState), mend (stateRiding).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FISHING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5: the reed bed
  {
    id: 'reed_stance',
    skill: 'fishing',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Reed Stance',
    desc: 'You learned to stand like the reeds. Standing still, you are harder and you mend.',
    color: '#7aa9b8',
    effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Reed Stance', armor: 5, regenPer4s: 1 } }],
    ranks: [
      {
        note: 'The stillness mends sooner: +6 armor, +2 health every 4s while still.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Reed Stance', armor: 6, regenPer4s: 2 } }],
      },
      {
        note: 'Rooted as the reed bed: +8 armor, +2 regen while still.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Reed Stance', armor: 8, regenPer4s: 2 } }],
      },
      {
        note: 'The heron in the reeds: +8 armor, +2 regen, and +2% crit while still.',
        effects: [
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Reed Stance', armor: 8, regenPer4s: 2, critPct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 10: the reel
  {
    id: 'tight_line',
    skill: 'fishing',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Tight Line',
    desc: 'Slack loses fish. You keep the line taut and land the catch faster.',
    color: '#5b8ca8',
    effects: [{ kind: 'gatherSpeed', skill: 'fishing', mult: 1.1 }],
    ranks: [
      { note: 'The reel turns quicker: fishing 13% faster.', effects: [{ kind: 'gatherSpeed', skill: 'fishing', mult: 1.13 }] },
      { note: 'The strike comes at the first tug: fishing 16% faster.', effects: [{ kind: 'gatherSpeed', skill: 'fishing', mult: 1.16 }] },
      {
        note: 'Rod and hand are one thing: fishing 20% faster, +3 fishing.',
        effects: [
          { kind: 'gatherSpeed', skill: 'fishing', mult: 1.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'fishing', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 15: the creel
  {
    id: 'full_creel',
    skill: 'fishing',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Full Creel',
    desc: 'You eat what the water gives and it stays with you. While fed, you mend faster.',
    color: '#8fb4c8',
    effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Creel', regenPer4s: 2 } }],
    ranks: [
      {
        note: 'The meal sits well: +2 regen and +2 armor while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Creel', regenPer4s: 2, armor: 2 } }],
      },
      {
        note: 'A good supper carries a long walk: +3 regen, +2 armor while fed.',
        effects: [{ kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Creel', regenPer4s: 3, armor: 2 } }],
      },
      {
        note: 'Fed from the quay: +3 regen, +3 armor, and 3% quicker on your feet.',
        effects: [
          { kind: 'when', cond: { when: 'wellFed' }, grant: { name: 'Full Creel', regenPer4s: 3, armor: 3, speedMult: 1.03 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 20: founding
  {
    id: 'patient_line',
    skill: 'fishing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Patient Line',
    desc: 'The water rewards the unhurried. Catches sometimes come double.',
    color: '#6aa0c8',
    effects: [{ kind: 'doubleGather', skill: 'fishing', chance: 0.12 }],
    ranks: [
      { note: 'The wait pays oftener: 15% of catches come double.', effects: [{ kind: 'doubleGather', skill: 'fishing', chance: 0.15 }] },
      { note: 'The water knows you now: 18% of catches come double.', effects: [{ kind: 'doubleGather', skill: 'fishing', chance: 0.18 }] },
      {
        note: 'Still water: 20% double, and one catch in five leaves you mending.',
        effects: [
          { kind: 'doubleGather', skill: 'fishing', chance: 0.2 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:patient_line',
              name: 'Still Water',
              trigger: { on: 'gather', chance: 0.2 },
              action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
              icd: 200,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 25: the channel
  {
    id: 'channel_cold',
    skill: 'fishing',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Channel Cold',
    desc: 'Years waist deep in the eel runs. Your blows carry the channel and sometimes chill.',
    color: '#8ac4e8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:channel_cold',
          name: 'Channel Cold',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
          icd: 80,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The cold comes up the line oftener: 18% a blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:channel_cold',
              name: 'Channel Cold',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
              icd: 80,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The chill lingers five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:channel_cold',
              name: 'Channel Cold',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 100 },
              icd: 80,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Cold-water blood: 22% a blow, the chill holds longer, and frost bites 8% harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:channel_cold',
              name: 'Channel Cold',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 110 },
              icd: 70,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 30: reading the water
  {
    id: 'reading_the_water',
    skill: 'fishing',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Reading the Water',
    desc: 'You see the shoal before the first cast. Walking the shore marks what grows nearby.',
    color: '#9fb8d9',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:reading_the_water',
          name: 'Reading the Water',
          trigger: { on: 'stride', tiles: 30 },
          action: { do: 'reveal', radius: 9, of: 'node' },
          icd: 100,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The eye reaches farther: 11 tiles marked.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:reading_the_water',
              name: 'Reading the Water',
              trigger: { on: 'stride', tiles: 30 },
              action: { do: 'reveal', radius: 11, of: 'node' },
              icd: 100,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'You read the water every 26 tiles, 12 tiles wide.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:reading_the_water',
              name: 'Reading the Water',
              trigger: { on: 'stride', tiles: 26 },
              action: { do: 'reveal', radius: 12, of: 'node' },
              icd: 100,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The shore walker: every 24 tiles, 13 wide, and 5% quicker on your feet.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:reading_the_water',
              name: 'Reading the Water',
              trigger: { on: 'stride', tiles: 24 },
              action: { do: 'reveal', radius: 13, of: 'node' },
              icd: 100,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 35: give it line
  {
    id: 'give_it_line',
    skill: 'fishing',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Give It Line',
    desc: 'A running fish is given line, not fought. When struck, a shell of calm sometimes takes it.',
    color: '#4f7f9e',
    effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:give_it_line',
              name: 'Give It Line',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'ward', absorb: 26, ticks: 120 },
              icd: 300,
              element: 'frost',
            },
          },
    ],
    ranks: [
      {
        note: 'The reel sings out longer: the shell eats 32 harm.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:give_it_line',
              name: 'Give It Line',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'ward', absorb: 32, ticks: 120 },
              icd: 300,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'You feel the run coming: 25% a blow, 36 harm over seven seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:give_it_line',
              name: 'Give It Line',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'ward', absorb: 36, ticks: 140 },
              icd: 300,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The drag set just so: 44 harm shelled, rests 13 seconds, and +8 health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:give_it_line',
              name: 'Give It Line',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'ward', absorb: 44, ticks: 150 },
              icd: 260,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 40: the still shot
  {
    id: 'herons_patience',
    skill: 'fishing',
    unlockLevel: 40,
    focusCost: 2,
    name: "Heron's Patience",
    desc: 'The heron does not chase. Standing still, your blows crit oftener and land harder.',
    color: '#b0c8d8',
    effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: "Heron's Patience", critPct: 4, dmgMult: 1.04 } }],
    ranks: [
      {
        note: 'The neck coils longer: +5% crit, +5% damage while still.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: "Heron's Patience", critPct: 5, dmgMult: 1.05 } }],
      },
      {
        note: 'The strike is certain: +6% crit, +6% damage while still.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: "Heron's Patience", critPct: 6, dmgMult: 1.06 } }],
      },
      {
        note: 'The grey heron at dawn: +8% crit, +8% damage while still.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: "Heron's Patience", critPct: 8, dmgMult: 1.08 } }],
      },
    ],
  },
  // ------------------------------------------------------ 45: the cold catch
  {
    id: 'cold_catch',
    skill: 'fishing',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Cold Catch',
    desc: 'A chilled fish is a slow fish. Blows on a chilled foe sometimes drive a spike of frost.',
    color: '#a8c4e8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:cold_catch',
          name: 'Cold Catch',
          trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The spike bites deeper: 17 frost.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cold_catch',
              name: 'Cold Catch',
              trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
              action: { do: 'bolt', damage: 17 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'You find the slow ones oftener: 40% a blow, 20 frost.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cold_catch',
              name: 'Cold Catch',
              trigger: { on: 'hitState', status: 'chill', chance: 0.4 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The gaff finds the gill: 50% a blow, 24 frost.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cold_catch',
              name: 'Cold Catch',
              trigger: { on: 'hitState', status: 'chill', chance: 0.5 },
              action: { do: 'bolt', damage: 24 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 50: the run
  {
    id: 'salmons_leap',
    skill: 'fishing',
    unlockLevel: 50,
    focusCost: 2,
    name: "Salmon's Leap",
    desc: 'The salmon does not rest between falls. A kill throws you forward on a burst of speed.',
    color: '#c9d9e8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:salmons_leap',
          name: "Salmon's Leap",
          trigger: { on: 'kill' },
          action: { do: 'surge', stat: 'speed', pct: 18, ticks: 80 },
          icd: 200,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The leap carries harder: 22% speed for four seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:salmons_leap',
              name: "Salmon's Leap",
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 22, ticks: 80 },
              icd: 200,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The run holds five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:salmons_leap',
              name: "Salmon's Leap",
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 22, ticks: 100 },
              icd: 200,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Upstream to the source: 24% speed for five seconds, and every kill hastens your arts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:salmons_leap',
              name: "Salmon's Leap",
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 24, ticks: 100 },
              icd: 180,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 55: oilskins
  {
    id: 'oilskins',
    skill: 'fishing',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Oilskins',
    desc: 'Leather worn the way the crews wear it, oiled and easy. Each piece speeds and shields.',
    color: '#6b87a8',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.5, armor: 1 }],
    ranks: [
      { note: 'The oil soaks deeper: 0.6% speed and 1 armor a piece.', effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.6, armor: 1 }] },
      { note: 'Cut for the quay: 0.7% speed and 1.5 armor a piece.', effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.7, armor: 1.5 }] },
      {
        note: 'Storm gear: 0.8% speed, 1.5 armor, and 2 health a piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.8, armor: 1.5, maxHp: 2 }],
      },
    ],
  },
  // ------------------------------------------------------ 60: founding
  {
    id: 'night_angler',
    skill: 'fishing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Night Angler',
    desc: 'The best water is the dark water. You fish faster after dusk.',
    color: '#3a5a78',
    effects: [{ kind: 'perk', perk: 'nightGatherMult', magnitude: 1.2 }],
    ranks: [
      { note: 'The dark gives more: fishing 25% faster after dusk.', effects: [{ kind: 'perk', perk: 'nightGatherMult', magnitude: 1.25 }] },
      {
        note: 'You know the shore blind: 30% faster after dusk, 4% quicker afoot at night.',
        effects: [
          { kind: 'perk', perk: 'nightGatherMult', magnitude: 1.3 },
          { kind: 'when', cond: { when: 'night' }, grant: { name: 'Dark Water', speedMult: 1.04 } },
        ],
      },
      {
        note: 'Dark water: 35% faster after dusk, and by night 5% quicker and +4 armor.',
        effects: [
          { kind: 'perk', perk: 'nightGatherMult', magnitude: 1.35 },
          { kind: 'when', cond: { when: 'night' }, grant: { name: 'Dark Water', speedMult: 1.05, armor: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 65: the stunned pool
  {
    id: 'stunned_water',
    skill: 'fishing',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Stunned Water',
    desc: 'The old poacher knows: a stunned pool is an easy pool. Shocked foes take more from you.',
    color: '#86b0c4',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 12 } }],
    ranks: [
      { note: 'The wade is surer: shocked foes take 14% more.', effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 14 } }] },
      {
        note: 'You net them while they float: 16% more, and +2% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 16 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'The whole pool belly up: shocked foes take 18% more, +3% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 18 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 70: slack water
  {
    id: 'slack_water',
    skill: 'fishing',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Slack Water',
    desc: 'When the tide turns, the fisher rests. Hard pressed you mend, and mending steadies you.',
    color: '#4a6a88',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:slack_water',
          name: 'Slack Water',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
          icd: 600,
          element: 'frost',
        },
      },
      { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Slack Water', armor: 4 } },
    ],
    ranks: [
      {
        note: 'The turn mends deeper: 4 health a second for five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:slack_water',
              name: 'Slack Water',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 500,
              element: 'frost',
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Slack Water', armor: 4 } },
        ],
      },
      {
        note: 'The tide waits less: rests 22 seconds, mends longer, and mending grants +5 armor.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:slack_water',
              name: 'Slack Water',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 110 },
              icd: 440,
              element: 'frost',
            },
          },
          { kind: 'when', cond: { when: 'stateRiding', status: 'mend' }, grant: { name: 'Slack Water', armor: 5 } },
        ],
      },
      {
        note: 'The still boat: mends 5 a second, rests 20, and pays +6 armor, +2 regen while it rides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:slack_water',
              name: 'Slack Water',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 400,
              element: 'frost',
            },
          },
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Slack Water', armor: 6, regenPer4s: 2 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 75: the steady cast
  {
    id: 'steady_cast',
    skill: 'fishing',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Steady Cast',
    desc: 'The rod taught the bow. You walk quicker while drawing, and your shots bite truer.',
    color: '#cfe0ee',
    effects: [
      { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.65 },
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
    ],
    ranks: [
      {
        note: 'The feet stay under the draw: a quicker walk, +4% crit.',
        effects: [
          { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.7 },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
      {
        note: 'The cast never wavers: quicker still, +5% crit.',
        effects: [
          { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.75 },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
        ],
      },
      {
        note: 'The flick of the wrist: quickest draw walk, +5% crit, and snap shots hit 15% harder.',
        effects: [
          { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.8 },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          { kind: 'perk', perk: 'snapShotMult', magnitude: 1.15 },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 80: the capstone
  {
    id: 'the_gaff_hand',
    skill: 'fishing',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Gaff Hand',
    desc: 'Master of the mere. The Hooking Reap is yours, the chilled take more, the net holds them.',
    color: '#2f4a62',
    effects: [
      { kind: 'art', ability: 'hooking_reap' },
      { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:the_gaff_hand',
          name: 'The Cast Net',
          trigger: { on: 'stateApplied', status: 'chill' },
          action: { do: 'status', status: 'root', power: 0, ticks: 30 },
          icd: 300,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The hook goes deeper: chilled foes take 14% more.',
        effects: [
          { kind: 'art', ability: 'hooking_reap' },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_gaff_hand',
              name: 'The Cast Net',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'root', power: 0, ticks: 30 },
              icd: 300,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The net is thrown oftener: rests 13 seconds, holds longer, 16% more on the chilled.',
        effects: [
          { kind: 'art', ability: 'hooking_reap' },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_gaff_hand',
              name: 'The Cast Net',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'root', power: 0, ticks: 36 },
              icd: 260,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Master of the mere: the net holds two full seconds, 18% more on the chilled, +3% crit.',
        effects: [
          { kind: 'art', ability: 'hooking_reap' },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 18 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_gaff_hand',
              name: 'The Cast Net',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'root', power: 0, ticks: 40 },
              icd: 240,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, fishing's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding
 * / vsState) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const FISHING_LICENSES: CallingLicense[] = [
  { calling: 'patient_line', status: 'mend', via: 'lay:boon' },
  { calling: 'channel_cold', status: 'chill', via: 'lay:status' },
  { calling: 'cold_catch', status: 'chill', via: 'read:hitState' },
  { calling: 'stunned_water', status: 'shock', via: 'read:vsState' },
  { calling: 'slack_water', status: 'mend', via: 'lay:boon' },
  { calling: 'slack_water', status: 'mend', via: 'read:stateRiding' },
  { calling: 'the_gaff_hand', status: 'chill', via: 'read:vsState' },
  { calling: 'the_gaff_hand', status: 'chill', via: 'read:stateApplied' },
  { calling: 'the_gaff_hand', status: 'root', via: 'lay:status' },
];

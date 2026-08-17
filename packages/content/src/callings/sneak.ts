/**
 * THE FILLED HALL — sneak's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE QUIET WALK's arc: the first three seats are the night road, the
 * cutpurse's poisoned pin, and the empty alley (an unseen hand's
 * identities); the middle rungs bring the knife's verbs (staggers and
 * weakenings from the shadows, the quickening rhythm of six cuts, the
 * leather that carries light) and the ladder's first reads (the slowed
 * quarry, the scent of red); the high rungs send the craft outward
 * (the sword arm through a smith's sunder, the killer's mending walk,
 * the steeped blade that answers any venom) and the capstone licenses
 * THOUSAND CUTS, the quiet walk's own ninetieth rung, ten rungs early
 * and at its fullest.
 *
 * The register this ladder writes: it LAYS venom (the hall's first
 * venom hand), stagger, weaken, quicken and mend; it READS chill,
 * root, stagger, bleed, sunder and venom.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SNEAK_CALLINGS: CallingDef[] = [
  // ------------------------------------------------- 5..15: identities
  {
    id: 'lampless_road',
    skill: 'sneak',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Lampless Road',
    desc: 'You learned the roads by starlight. From dusk to sunrise you walk faster.',
    color: '#55607a',
    effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'Lampless Road', speedMult: 1.07 } }],
    ranks: [
      {
        note: 'The night road runs quicker underfoot: +9% speed after dusk.',
        effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'Lampless Road', speedMult: 1.09 } }],
      },
      {
        note: 'You know every unlit turning: +11% speed after dusk.',
        effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: 'Lampless Road', speedMult: 1.11 } }],
      },
      {
        note: 'The dark is where you were always going: +12% speed and +2% crit after dusk.',
        effects: [
          { kind: 'when', cond: { when: 'night' }, grant: { name: 'Lampless Road', speedMult: 1.12, critPct: 2 } },
        ],
      },
    ],
  },
  {
    id: 'cutpurses_pin',
    skill: 'sneak',
    unlockLevel: 10,
    focusCost: 1,
    name: "Cutpurse's Pin",
    desc: 'A pin in the sleeve, dipped in something green. Some blows leave venom in the wound.',
    color: '#8ea04a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cutpurses_pin', name: "Cutpurse's Pin",
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'venom', power: 2, ticks: 60 },
          icd: 140,
        },
      },
    ],
    ranks: [
      {
        note: 'The pin finds flesh oftener: 18% of blows may envenom.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutpurses_pin', name: "Cutpurse's Pin",
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 60 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'A longer steep: the venom holds four seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutpurses_pin', name: "Cutpurse's Pin",
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 80 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'You never draw a clean pin: 22% of blows, a stronger green, five seconds, resting six.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cutpurses_pin', name: "Cutpurse's Pin",
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 100 },
              icd: 120,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'empty_alley',
    skill: 'sneak',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Empty Alley',
    desc: 'Nobody saw who did it. A kill sends you off at a run for a few seconds.',
    color: '#625a78',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:empty_alley', name: 'Empty Alley',
          trigger: { on: 'kill' },
          action: { do: 'surge', stat: 'speed', pct: 16, ticks: 70 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The getaway lasts longer: +16% speed for four seconds after a kill.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:empty_alley', name: 'Empty Alley',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 16, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'You are gone before the body lands: +20% speed for four seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:empty_alley', name: 'Empty Alley',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 20, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The alley is always empty: +20% for five seconds, and +8% pace whenever no one is on you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:empty_alley', name: 'Empty Alley',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 20, ticks: 100 },
              icd: 160,
            },
          },
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Empty Alley', speedMult: 1.08 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 20..50: the verbs
  {
    id: 'soft_step',
    skill: 'sneak',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Soft Step',
    desc: 'The floor forgets you faster. Harder to notice, and the crouch moves quicker.',
    color: '#8a7fae',
    effects: [
      { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 },
      { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Step', speedMult: 1.08 } },
    ],
    ranks: [
      {
        note: 'Quieter still, and +10% pace to the crouch.',
        effects: [
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.06 },
          { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Step', speedMult: 1.1 } },
        ],
      },
      {
        note: 'You could cross a sleeping camp: quieter, and +12% crouch pace.',
        effects: [
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.07 },
          { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Step', speedMult: 1.12 } },
        ],
      },
      {
        note: 'The floor never knew you: quietest, +14% crouch pace, +2% crit while hidden.',
        effects: [
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.08 },
          { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Step', speedMult: 1.14, critPct: 2 } },
        ],
      },
    ],
  },
  {
    id: 'nerve_cut',
    skill: 'sneak',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Nerve Cut',
    desc: 'A knife knows where the strings are. Some blows stagger the foe a moment.',
    color: '#7c6c92',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:nerve_cut', name: 'Nerve Cut',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
          icd: 140,
        },
      },
    ],
    ranks: [
      {
        note: 'The hand finds the string oftener: 18% of blows may stagger.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nerve_cut', name: 'Nerve Cut',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'The stagger comes back sooner: 21% of blows, resting six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nerve_cut', name: 'Nerve Cut',
              trigger: { on: 'hit', chance: 0.21 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'You cut the strings, then the meat: 24% of blows, resting five, and +6% blade damage.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:nerve_cut', name: 'Nerve Cut',
              trigger: { on: 'hit', chance: 0.24 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 100,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 6 } },
        ],
      },
    ],
  },
  {
    id: 'slow_quarry',
    skill: 'sneak',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Slow Quarry',
    desc: 'The lamed are the easiest to circle. Chilled or staggered foes take 8% more from you.',
    color: '#8ac4e8',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } },
      { kind: 'gear', effect: { kind: 'vsState', status: 'stagger', pct: 8 } },
    ],
    ranks: [
      {
        note: 'You circle tighter: chilled and staggered foes take 10% more.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'stagger', pct: 10 } },
        ],
      },
      {
        note: 'Nothing held still is safe: 12% more on the chilled and staggered, 10% on the rooted.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'stagger', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 10 } },
        ],
      },
      {
        note: 'Anything held still is already yours: chilled and staggered 14% more, rooted 12% more.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'stagger', pct: 14 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 12 } },
        ],
      },
    ],
  },
  {
    id: 'six_cuts_one_breath',
    skill: 'sneak',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Six Cuts, One Breath',
    desc: 'The rhythm of the knife feeds itself. Every sixth landed blow quickens your hand.',
    color: '#c0b4d0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:six_cuts_one_breath', name: 'One Breath',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 60,
        },
      },
    ],
    ranks: [
      {
        note: 'The breath holds longer: quickened for five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:six_cuts_one_breath', name: 'One Breath',
              trigger: { on: 'stacks', per: 'hit', count: 6 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 60,
            },
          },
        ],
      },
      {
        note: 'The rhythm comes in fives now: every fifth blow quickens.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:six_cuts_one_breath', name: 'One Breath',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 60,
            },
          },
        ],
      },
      {
        note: 'The knife never loses the beat: fifth blow, six seconds, and the breath rests only two.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:six_cuts_one_breath', name: 'One Breath',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 40,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'cured_and_quiet',
    skill: 'sneak',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Cured and Quiet',
    desc: 'Leather oiled until it stops creaking. Each leather piece worn adds pace and armor.',
    color: '#a88a68',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1, armor: 1 }],
    ranks: [
      {
        note: 'The hides sit closer: +1.5% pace per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1.5, armor: 1 }],
      },
      {
        note: 'Doubled seams, no creak: +1.5% pace and +2 armor per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1.5, armor: 2 }],
      },
      {
        note: 'A second skin: +1.5% pace, +2 armor, and +2 health per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1.5, armor: 2, maxHp: 2 }],
      },
    ],
  },
  {
    id: 'scent_of_red',
    skill: 'sneak',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Scent of Red',
    desc: 'First blood wakes the hunter. Opening a bleed sharpens your crits for a few seconds.',
    color: '#a04a48',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:scent_of_red', name: 'Scent of Red',
          trigger: { on: 'stateApplied', status: 'bleed' },
          action: { do: 'surge', stat: 'crit', pct: 10, ticks: 80 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The scent is stronger: +12% crit for four seconds after a bleed opens.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_red', name: 'Scent of Red',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The hunt lasts longer: +12% crit for five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_red', name: 'Scent of Red',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 100 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'You follow red like a hound: +14% crit for five seconds, bleeding foes take 8% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_red', name: 'Scent of Red',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'crit', pct: 14, ticks: 100 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'marked_for_the_knife',
    skill: 'sneak',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Marked for the Knife',
    desc: 'A crit is a promise. Critical blows leave the foe weakened, their own blows softened.',
    color: '#8a6a9a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:marked_for_the_knife', name: 'Marked',
          trigger: { on: 'crit' },
          action: { do: 'status', status: 'weaken', power: 10, ticks: 100 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The mark bites deeper: weakened by 12%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:marked_for_the_knife', name: 'Marked',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The mark lasts longer: weakened by 12% for six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:marked_for_the_knife', name: 'Marked',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 120 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'Nobody shrugs off your mark: weakened by 14% for six seconds, +5% cooldowns.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:marked_for_the_knife', name: 'Marked',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'weaken', power: 14, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },

  // ---------------------------------------- 55..75: the outward hand
  {
    id: 'smoke_and_gone',
    skill: 'sneak',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Smoke and Gone',
    desc: 'You never planned to die here. Falling low breaks you into a run; you are quicker besides.',
    color: '#9a9aa8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:smoke_and_gone', name: 'Smoke and Gone',
          trigger: { on: 'lowHp', pct: 0.35 },
          action: { do: 'surge', stat: 'speed', pct: 24, ticks: 80 },
          icd: 400,
        },
      },
      { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
    ],
    ranks: [
      {
        note: 'The smoke is thicker: +26% speed for four seconds when you fall low.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:smoke_and_gone', name: 'Smoke and Gone',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'surge', stat: 'speed', pct: 26, ticks: 80 },
              icd: 400,
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
      {
        note: 'You break sooner and run longer: +28% for five seconds below 40% health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:smoke_and_gone', name: 'Smoke and Gone',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'surge', stat: 'speed', pct: 28, ticks: 100 },
              icd: 360,
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
      {
        note: 'They will tell it as a ghost story: +30% for six seconds, +6% speed, +8 health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:smoke_and_gone', name: 'Smoke and Gone',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'surge', stat: 'speed', pct: 30, ticks: 120 },
              icd: 360,
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 6 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  {
    id: 'opportunist',
    skill: 'sneak',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Opportunist',
    desc: 'A turned back is a signed invitation. Backstabs cut deeper and every blow crits oftener.',
    color: '#5a4a6a',
    effects: [
      { kind: 'perk', perk: 'backstabBonus', magnitude: 0.25 },
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
    ],
    ranks: [
      {
        note: 'The invitation is read more carefully: backstabs +30%, +4% crit.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.3 },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
      {
        note: 'You take every opening offered: backstabs +35%, +5% crit.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.35 },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
        ],
      },
      {
        note: 'One kill is the next opening: backstabs +40%, +6% crit, and a kill sharpens your crits.',
        effects: [
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.4 },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:opportunist', name: 'Second Opening',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
              icd: 120,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'through_the_seam',
    skill: 'sneak',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Through the Seam',
    desc: 'Split armor is an open door. Blows on sundered foes may drive a bolt through the gap.',
    color: '#b8b2a6',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:through_the_seam', name: 'Through the Seam',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.35 },
          action: { do: 'bolt', damage: 20 },
          icd: 160,
        },
      },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The point drives deeper: 22 through the seam, 40% of blows on the sundered; +7% blades.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_seam', name: 'Through the Seam',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.4 },
              action: { do: 'bolt', damage: 22 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 7 } },
        ],
      },
      {
        note: 'You find the split by feel: 24 through the seam, 45% of blows; +8% blades.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_seam', name: 'Through the Seam',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.45 },
              action: { do: 'bolt', damage: 24 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } },
        ],
      },
      {
        note: 'Split armor is an open door: 26 damage, half of blows; +9% blades; sundered take 8% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_seam', name: 'Through the Seam',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.5 },
              action: { do: 'bolt', damage: 26 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 9 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'grave_quiet',
    skill: 'sneak',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Grave Quiet',
    desc: 'The killer breathes easiest over the still. A kill sets you mending; you heal on the walk.',
    color: '#46405a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:grave_quiet', name: 'Grave Quiet',
          trigger: { on: 'kill' },
          action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
          icd: 100,
        },
      },
      { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
    ],
    ranks: [
      {
        note: 'The quiet lasts longer: mending 4 a second for six seconds after a kill.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grave_quiet', name: 'Grave Quiet',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 100,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'You mend on the walk between bodies: 5 a second for six seconds, +3 regen.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grave_quiet', name: 'Grave Quiet',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
        ],
      },
      {
        note: 'Every grave is a rest: 5 a second for six seconds, +3 regen, +10 health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grave_quiet', name: 'Grave Quiet',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
    ],
  },
  {
    id: 'steeped_blade',
    skill: 'sneak',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Steeped Blade',
    desc: 'You know a poisoning when you see one. Venomed foes take more; laying venom lends an edge.',
    color: '#a0c050',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:steeped_blade', name: 'Steeped Blade',
          trigger: { on: 'stateApplied', status: 'venom' },
          action: { do: 'surge', stat: 'damage', pct: 14, ticks: 100 },
          icd: 200,
        },
      },
      { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The steeping runs stronger: +16% damage for five seconds after a venom lands.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:steeped_blade', name: 'Steeped Blade',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 16, ticks: 100 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 8 } },
        ],
      },
      {
        note: 'The edge holds longer: +18% damage for six seconds; venomed foes take 10% more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:steeped_blade', name: 'Steeped Blade',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 120 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 10 } },
        ],
      },
      {
        note: 'Poison and steel are one craft: +20% damage six seconds, venomed take 12% more, +4% crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:steeped_blade', name: 'Steeped Blade',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 120 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------- 80: the capstone
  {
    id: 'stop_counting',
    skill: 'sneak',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Stop Counting',
    desc: 'You stopped counting cuts years ago. Thousand Cuts seats for you; turned backs pay more.',
    color: '#3a3450',
    effects: [
      { kind: 'art', ability: 'thousand_cuts' },
      { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
      { kind: 'perk', perk: 'backstabBonus', magnitude: 0.08 },
    ],
    ranks: [
      {
        note: 'The flurry cuts at rank II; +5% crit, backstabs +10%.',
        effects: [
          { kind: 'art', ability: 'thousand_cuts' },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.1 },
        ],
      },
      {
        note: 'The flurry cuts at rank III; +6% crit, backstabs +12%, arts recover 5% sooner.',
        effects: [
          { kind: 'art', ability: 'thousand_cuts' },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.12 },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
      {
        note: 'The flurry at its fullest; +6% crit, backstabs +15%, arts recover 8% sooner.',
        effects: [
          { kind: 'art', ability: 'thousand_cuts' },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          { kind: 'perk', perk: 'backstabBonus', magnitude: 0.15 },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, sneak's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / vsState) is
 * licensed here by a conscious row, never by authoring the def alone.
 */
export const SNEAK_LICENSES: CallingLicense[] = [
  // Lays.
  { calling: 'cutpurses_pin', status: 'venom', via: 'lay:status' },
  { calling: 'nerve_cut', status: 'stagger', via: 'lay:status' },
  { calling: 'six_cuts_one_breath', status: 'quicken', via: 'lay:boon' },
  { calling: 'marked_for_the_knife', status: 'weaken', via: 'lay:status' },
  { calling: 'grave_quiet', status: 'mend', via: 'lay:boon' },
  // Reads.
  { calling: 'slow_quarry', status: 'chill', via: 'read:vsState' },
  { calling: 'slow_quarry', status: 'root', via: 'read:vsState' },
  { calling: 'slow_quarry', status: 'stagger', via: 'read:vsState' },
  { calling: 'scent_of_red', status: 'bleed', via: 'read:stateApplied' },
  { calling: 'scent_of_red', status: 'bleed', via: 'read:vsState' },
  { calling: 'through_the_seam', status: 'sunder', via: 'read:hitState' },
  { calling: 'through_the_seam', status: 'sunder', via: 'read:vsState' },
  { calling: 'steeped_blade', status: 'venom', via: 'read:stateApplied' },
  { calling: 'steeped_blade', status: 'venom', via: 'read:vsState' },
];

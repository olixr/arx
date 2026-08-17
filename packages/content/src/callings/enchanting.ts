/**
 * THE FILLED HALL — enchanting's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE BOUND WORKING'S ARC (the table, the ink, the sigil that answers):
 *  - 5..15  three identities: the steady stylus (inscriptions run
 *           quicker), the binder's tongue (arcane casts harder), the
 *           astral press (the far road quickens; the astral school
 *           grows in at rank II, when astral staves become real,
 *           arx 26+). One entry each at rank I.
 *  - 20..50 the verbs. Dust Thrift deepens; the ink goes live on every
 *           cast (crit surge); Emberscript LAYS burn; the moonglass
 *           lens shortens every cooldown; Glassfault READS a chill and
 *           LAYS shock (Shatter is the reaction it feeds); the warded
 *           weave pays per cloth piece; the moonbell hour wakes after
 *           dusk.
 *  - 55..75 the outward seats and the pairs closing: Fired Ink READS
 *           the burn Emberscript wrote (bolt + vsState); Deep Sigils
 *           deepens the maker's mark; Bindrune READS a smith's sunder
 *           and LAYS weaken; Chainscript's fifth cast arcs; Stormbind
 *           READS the shock Glassfault laid (surge + vsState).
 *  - 80     RUNESPEAKER: THE MASTER'S LICENSE on Rune Echo, the
 *           runegnarl's art spoken without the rootwood in hand, and
 *           the arcane school at its fullest.
 *
 * Pages laid: burn (Emberscript), shock (Glassfault), weaken (Bindrune),
 * and the stonehide boon (Warded Weave IV, the ladder's one defensive
 * moment).
 * Pages read: chill (Glassfault, twice), burn (Fired Ink, twice),
 * sunder (Bindrune), shock (Stormbind, twice). The hinges an archer's
 * or arx hand's chill, a smith's sunder, and a onehand's shock are
 * expected to meet; the burn Emberscript writes feeds arx's Cinder
 * Answer.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ENCHANTING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5: the steady stylus
  {
    id: 'steady_stylus',
    skill: 'enchanting',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Steady Stylus',
    desc: 'The stylus stops shaking in your grip. Every inscription at the table runs quicker.',
    color: '#c8b8f0',
    effects: [{ kind: 'craftSpeed', skill: 'enchanting', mult: 0.9 }],
    ranks: [
      {
        note: 'The stroke comes surer: inscriptions 13% quicker.',
        effects: [{ kind: 'craftSpeed', skill: 'enchanting', mult: 0.87 }],
      },
      {
        note: 'The wrist knows the letterforms by heart: inscriptions 16% quicker.',
        effects: [{ kind: 'craftSpeed', skill: 'enchanting', mult: 0.84 }],
      },
      {
        note: 'Inscriptions a fifth quicker, and the hand works three levels wiser: +3 enchanting.',
        effects: [
          { kind: 'craftSpeed', skill: 'enchanting', mult: 0.8 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'enchanting', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 10: the binder's tongue
  {
    id: 'binders_tongue',
    skill: 'enchanting',
    unlockLevel: 10,
    focusCost: 1,
    name: "Binder's Tongue",
    desc: 'Arcane dust binds every working, and you speak its grammar. Arcane casts hit harder.',
    color: '#b8a8e0',
    effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 8 } }],
    ranks: [
      {
        note: 'The binder answers louder: arcane casts +10%.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 10 } }],
      },
      {
        note: 'The dust knows your voice now: arcane casts +12%.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 12 } }],
      },
      {
        note: 'Arcane casts +14%, and the grammar carries to the staff: +3 arx.',
        effects: [
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 14 } },
          { kind: 'gear', effect: { kind: 'skill', skill: 'arx', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 15: the astral press
  {
    id: 'astral_press',
    skill: 'enchanting',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Astral Press',
    // The far school's first gift is DISTANCE, not damage: the earliest
    // astral staff sits at arx 26, so an elementDmg identity would be
    // dead in a level-15 hand. Speed is felt by every build the minute
    // the seat is answered; the astral school grows in at rank II,
    // right when astral staves become real.
    desc: 'Moonbell pressed at dusk taught you the far school. Every road runs shorter under you.',
    color: '#9ad0e0',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 5 } }],
    ranks: [
      {
        note: 'The far school opens to you: astral casts +8%.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'astral', pct: 8 } },
        ],
      },
      {
        note: 'Astral casts +11%, and the road runs shorter: +6% speed.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 6 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'astral', pct: 11 } },
        ],
      },
      {
        note: 'Astral casts +14%, +7% speed. The far school walks beside you.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 7 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'astral', pct: 14 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 20: dust thrift (founding)
  {
    id: 'dust_thrift',
    skill: 'enchanting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Dust Thrift',
    desc: 'Not a mote wasted. Reagents at the enchanting table are sometimes saved.',
    color: '#b49af0',
    effects: [{ kind: 'materialSave', skill: 'enchanting', chance: 0.15 }],
    ranks: [
      {
        note: 'The thrift sharpens: reagents saved 18% of the time.',
        effects: [{ kind: 'materialSave', skill: 'enchanting', chance: 0.18 }],
      },
      {
        note: 'The motes come home to the jar: reagents saved 22% of the time.',
        effects: [{ kind: 'materialSave', skill: 'enchanting', chance: 0.22 }],
      },
      {
        note: 'Reagents saved a quarter of the time; the saved motes settle into the sigil: +2 quality.',
        effects: [
          { kind: 'materialSave', skill: 'enchanting', chance: 0.25 },
          { kind: 'perk', perk: 'inscribeQuality', magnitude: 2 },
        ],
      },
    ],
  },
  // ------------------------------------------------ 25: the ink goes live
  {
    id: 'live_ink',
    skill: 'enchanting',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Live Ink',
    desc: 'The ink never quite dries on your fingers. Every cast sharpens your aim: a crit surge.',
    color: '#d0b0ff',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:live_ink',
          name: 'Live Ink',
          trigger: { on: 'cast' },
          action: { do: 'surge', stat: 'crit', pct: 8, ticks: 60 },
          icd: 200,
          element: 'arcane',
        },
      },
    ],
    ranks: [
      {
        note: 'The ink runs hotter: +10% crit for 3s after a cast.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:live_ink',
              name: 'Live Ink',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'crit', pct: 10, ticks: 60 },
              icd: 200,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The ink stays wet longer: +12% crit for 4s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:live_ink',
              name: 'Live Ink',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 80 },
              icd: 200,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: '+12% crit for 4.5s, resting 9s, and the live ink hurries every art: 5% cooldown.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:live_ink',
              name: 'Live Ink',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'crit', pct: 12, ticks: 90 },
              icd: 180,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 30: emberscript LAYS burn
  {
    id: 'emberscript',
    skill: 'enchanting',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Emberscript',
    desc: 'Ember essence stains the hand that presses it. Your blows may write a burn on the foe.',
    color: '#d89a7a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:emberscript',
          name: 'Emberscript',
          trigger: { on: 'hit', chance: 0.2 },
          action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
          icd: 100,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The script holds longer: burn for 4s, written on 22% of blows.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:emberscript',
              name: 'Emberscript',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 80 },
              icd: 100,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Written on a quarter of blows, burning 4.5s, and the hand rests only 4.5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:emberscript',
              name: 'Emberscript',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 90 },
              icd: 90,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The burn bites deeper (power 3), and the stain reaches your staff: ember casts +6%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:emberscript',
              name: 'Emberscript',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'burn', power: 3, ticks: 90 },
              icd: 90,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 35: the moonglass lens
  {
    id: 'moonglass_focus',
    skill: 'enchanting',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Moonglass Focus',
    desc: 'You have looked through the cold lens too long. Every art comes ready sooner.',
    color: '#a8c4e8',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 6 } }],
    ranks: [
      {
        note: 'The lens sharpens: 8% cooldown.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 8 } }],
      },
      {
        note: 'The lens grinds truer: 10% cooldown.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 10 } }],
      },
      {
        note: '12% cooldown, and the lens shows the seam: +2% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 40: glassfault READS chill, LAYS shock
  {
    id: 'glassfault',
    skill: 'enchanting',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Glassfault',
    desc: 'Frost essence cracks like glass when it is struck. A chill you lay is answered with shock.',
    color: '#9ad0ec',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:glassfault',
          name: 'Glassfault',
          trigger: { on: 'stateApplied', status: 'chill' },
          action: { do: 'status', status: 'shock', power: 1, ticks: 80 },
          icd: 120,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The fault runs longer: shock holds 5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:glassfault',
              name: 'Glassfault',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 100 },
              icd: 120,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The glass cracks oftener: the fault rests only 5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:glassfault',
              name: 'Glassfault',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 100 },
              icd: 100,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'Shock holds 5s and rests 5s, and chilled bodies take +8% from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:glassfault',
              name: 'Glassfault',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'status', status: 'shock', power: 1, ticks: 100 },
              icd: 100,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 45: the warded weave
  {
    id: 'warded_weave',
    skill: 'enchanting',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Warded Weave',
    desc: 'You have inscribed a hundred wards on cloth. Every worn cloth piece adds armor and health.',
    color: '#8a7ab8',
    effects: [{ kind: 'perPiece', armorClass: 'cloth', armor: 1, maxHp: 3 }],
    ranks: [
      {
        note: 'Each cloth piece carries more health.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', armor: 1, maxHp: 4 }],
      },
      {
        note: 'Each cloth piece carries more armor.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', armor: 2, maxHp: 4 }],
      },
      {
        // The IV signature: the ladder's ONE defensive moment. A blow
        // that gets past armor may raise stonehide (3 fading coats of
        // +4 armor) — the ward the enchanter inscribed answering on its
        // wearer's skin. Boon lane, self door, 15s rest.
        note: 'A second skin: more of both, +1 regen, and a blow that bites may raise stonehide.',
        effects: [
          { kind: 'perPiece', armorClass: 'cloth', armor: 2, maxHp: 5 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:warded_weave',
              name: 'Warded Weave',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 300,
              element: 'arcane',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 50: the moonbell hour
  {
    id: 'moonbell_hour',
    skill: 'enchanting',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Moonbell Hour',
    desc: 'Moonbell glows after dusk, and so do the sigils on your hands. By night: crit and speed.',
    color: '#8ab0d8',
    effects: [
      { kind: 'when', cond: { when: 'night' }, grant: { name: 'Moonbell Hour', critPct: 3, speedMult: 1.04 } },
    ],
    ranks: [
      {
        note: 'The night glows brighter: +4% crit, +5% speed after dusk.',
        effects: [
          { kind: 'when', cond: { when: 'night' }, grant: { name: 'Moonbell Hour', critPct: 4, speedMult: 1.05 } },
        ],
      },
      {
        note: 'The sigils drink the dark: +5% crit, +6% speed after dusk.',
        effects: [
          { kind: 'when', cond: { when: 'night' }, grant: { name: 'Moonbell Hour', critPct: 5, speedMult: 1.06 } },
        ],
      },
      {
        note: '+6% crit, +7% speed after dusk, and the moonlight knits: +2 regen by night.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'night' },
            grant: { name: 'Moonbell Hour', critPct: 6, speedMult: 1.07, regenPer4s: 2 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 55: fired ink READS burn
  {
    id: 'fired_ink',
    skill: 'enchanting',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Fired Ink',
    desc: 'A burn is a page you can read. Burning foes take more; a blow on one may loose a bolt.',
    color: '#e0a080',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:fired_ink',
          name: 'Fired Ink',
          trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
          element: 'arcane',
        },
      },
      { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The bolt hits harder (16), and burning bodies take +10%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fired_ink',
              name: 'Fired Ink',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 10 } },
        ],
      },
      {
        note: 'The bolt hits harder (18) and looses oftener (35%); burning bodies take +12%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fired_ink',
              name: 'Fired Ink',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 12 } },
        ],
      },
      {
        // No cooldown rider here: three other seats already carry the
        // dial (Live Ink IV, Moonglass, Runespeaker) and a fourth would
        // stack the ladder to 28%. The bolt and the read are the seat.
        note: 'The bolt hits 20, and burning bodies take +14% from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:fired_ink',
              name: 'Fired Ink',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 14 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 60: deep sigils (founding)
  {
    id: 'deep_sigils',
    skill: 'enchanting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Sigils',
    // THE ENCHANTER'S HAND: this Calling always SAID its workings sat
    // deeper in the steel and then quietly handed out a cooldown, which
    // is a personal buff and not a fact about the craft at all. Quality
    // is what "deeper" actually means now, so the text is finally true
    // and the trade's own Calling is about the trade.
    desc: 'Your workings settle deeper into the steel. Every inscription you make runs truer.',
    color: '#8a6ac8',
    effects: [{ kind: 'perk', perk: 'inscribeQuality', magnitude: 5 }],
    ranks: [
      {
        note: 'The sigils sit deeper: +6 quality on every inscription.',
        effects: [{ kind: 'perk', perk: 'inscribeQuality', magnitude: 6 }],
      },
      {
        note: 'The sigils sit deeper still: +8 quality on every inscription.',
        effects: [{ kind: 'perk', perk: 'inscribeQuality', magnitude: 8 }],
      },
      {
        note: '+10 quality on every inscription, and the deep sigil finds the seam in a foe: +3% crit.',
        effects: [
          { kind: 'perk', perk: 'inscribeQuality', magnitude: 10 },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 65: bindrune READS sunder, LAYS weaken
  {
    id: 'bindrune',
    skill: 'enchanting',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Bindrune',
    desc: 'A broken guard is a page to write on. Sunder a foe and a bindrune weakens its arm.',
    color: '#9a86d8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:bindrune',
          name: 'Bindrune',
          trigger: { on: 'stateApplied', status: 'sunder' },
          action: { do: 'status', status: 'weaken', power: 8, ticks: 100 },
          icd: 120,
          element: 'arcane',
        },
      },
    ],
    ranks: [
      {
        note: 'The rune binds tighter: weakened foes deal 10% less.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bindrune',
              name: 'Bindrune',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 100 },
              icd: 120,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The rune holds 6s and the hand rests only 5s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bindrune',
              name: 'Bindrune',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 120 },
              icd: 100,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'Weakened foes deal 12% less, and the rune you write on them you wear yourself: +5 armor.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bindrune',
              name: 'Bindrune',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 120 },
              icd: 100,
              element: 'arcane',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 70: chainscript, the fifth cast arcs
  {
    id: 'chainscript',
    skill: 'enchanting',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Chainscript',
    desc: 'Every cast leaves a charge in the sigils. The fifth arcs out and walks foe to foe.',
    color: '#c0b0f8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:chainscript',
          name: 'Chainscript',
          trigger: { on: 'stacks', per: 'cast', count: 5 },
          action: { do: 'chain', damage: 16, jumps: 3 },
          icd: 200,
          element: 'arcane',
        },
      },
    ],
    ranks: [
      {
        note: 'The arc bites harder: 18 to each body it walks to.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:chainscript',
              name: 'Chainscript',
              trigger: { on: 'stacks', per: 'cast', count: 5 },
              action: { do: 'chain', damage: 18, jumps: 3 },
              icd: 200,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The arc walks a fourth body, at 20 each.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:chainscript',
              name: 'Chainscript',
              trigger: { on: 'stacks', per: 'cast', count: 5 },
              action: { do: 'chain', damage: 20, jumps: 4 },
              icd: 200,
              element: 'arcane',
            },
          },
        ],
      },
      {
        note: 'The fourth cast arcs, at 22 across four bodies, resting 9s.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:chainscript',
              name: 'Chainscript',
              trigger: { on: 'stacks', per: 'cast', count: 4 },
              action: { do: 'chain', damage: 22, jumps: 4 },
              icd: 180,
              element: 'arcane',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 75: stormbind READS shock
  {
    id: 'stormbind',
    skill: 'enchanting',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Stormbind',
    desc: 'A stored charge begs to be spent. Shocked foes take more; a blow on one may surge you.',
    color: '#d8d0a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:stormbind',
          name: 'Stormbind',
          trigger: { on: 'hitState', status: 'shock', chance: 0.35 },
          action: { do: 'surge', stat: 'damage', pct: 15, ticks: 80 },
          icd: 200,
          element: 'storm',
        },
      },
      { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The argument opens wider: +18% damage for 4s, shocked bodies take +10%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormbind',
              name: 'Stormbind',
              trigger: { on: 'hitState', status: 'shock', chance: 0.35 },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 80 },
              icd: 200,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 10 } },
        ],
      },
      {
        note: 'The surge holds 5s at +20%, and shocked bodies take +12%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormbind',
              name: 'Stormbind',
              trigger: { on: 'hitState', status: 'shock', chance: 0.35 },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 100 },
              icd: 200,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 12 } },
        ],
      },
      {
        note: '+22% damage for 5s on 40% of shocked blows, resting 9s; shocked bodies take +14%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:stormbind',
              name: 'Stormbind',
              trigger: { on: 'hitState', status: 'shock', chance: 0.4 },
              action: { do: 'surge', stat: 'damage', pct: 22, ticks: 100 },
              icd: 180,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'shock', pct: 14 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 80: RUNESPEAKER (the master's license)
  {
    id: 'runespeaker',
    skill: 'enchanting',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Runespeaker',
    desc: 'You read runes older than their alphabet. Rune Echo is yours; arcane casts hit harder.',
    color: '#7a5cb8',
    effects: [
      { kind: 'art', ability: 'rune_echo' },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The runes light louder: arcane casts +10%.',
        effects: [
          { kind: 'art', ability: 'rune_echo' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 10 } },
        ],
      },
      {
        note: 'Arcane casts +12%, and every art comes ready sooner: 5% cooldown.',
        effects: [
          { kind: 'art', ability: 'rune_echo' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 12 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
      {
        note: 'Arcane casts +14%, 6% cooldown, and the speaker finds the seam: +3% crit.',
        effects: [
          { kind: 'art', ability: 'rune_echo' },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 14 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, enchanting's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const ENCHANTING_LICENSES: CallingLicense[] = [
  // Lays.
  { calling: 'emberscript', status: 'burn', via: 'lay:status' },
  { calling: 'glassfault', status: 'shock', via: 'lay:status' },
  { calling: 'bindrune', status: 'weaken', via: 'lay:status' },
  { calling: 'warded_weave', status: 'stonehide', via: 'lay:boon' },
  // Reads.
  { calling: 'glassfault', status: 'chill', via: 'read:stateApplied' },
  { calling: 'glassfault', status: 'chill', via: 'read:vsState' },
  { calling: 'fired_ink', status: 'burn', via: 'read:hitState' },
  { calling: 'fired_ink', status: 'burn', via: 'read:vsState' },
  { calling: 'bindrune', status: 'sunder', via: 'read:stateApplied' },
  { calling: 'stormbind', status: 'shock', via: 'read:hitState' },
  { calling: 'stormbind', status: 'shock', via: 'read:vsState' },
];

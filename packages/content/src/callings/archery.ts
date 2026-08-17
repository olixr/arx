/**
 * THE FILLED HALL — archery's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE ARC — the bow's people write it in draw, snap, stride, and eye:
 *  5..15   three clean identities: the barbed head, the daylight eye,
 *          the leather-clad runner.
 *  20..50  the verbs: the snap shot (founding), the frozen mark laid and
 *          read (chill), the hobbling shot (root), the planted loose,
 *          the kill rhythm (quicken laid and ridden), the night eye.
 *  55..75  the outward seats and the hinges: the poacher's road, the
 *          walking draw (founding), the blood trail (bleed read), the
 *          hawk's mark (sunder laid and read), the sixth shaft.
 *  80      THE MASTER'S LICENSE: The Full Draw, past the ear.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ARCHERY_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------------ 5
  {
    id: 'barbed_heads',
    skill: 'archery',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Barbed Heads',
    desc: 'You file a hook into every head you fletch. Bow damage bites deeper.',
    color: '#9a6a4a',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } }],
    ranks: [
      {
        note: 'The hooks bite deeper: bow damage climbs.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } }],
      },
      {
        note: 'Every head you loose is barbed now.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } }],
      },
      {
        note: 'The barbs find the seam: more bow damage and a whisper of crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 10
  {
    id: 'noon_eye',
    skill: 'archery',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Noon Eye',
    desc: 'A hunter sees keenest under an honest sun. By day, every weapon you hold crits oftener.',
    color: '#d8c46a',
    effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Noon Eye', critPct: 3 } }],
    ranks: [
      {
        note: 'The daylight eye sharpens.',
        effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Noon Eye', critPct: 4 } }],
      },
      {
        note: 'Under the sun, little escapes you.',
        effects: [{ kind: 'when', cond: { when: 'day' }, grant: { name: 'Noon Eye', critPct: 5 } }],
      },
      {
        note: 'By day you crit oftener still, and the light lifts your stride.',
        effects: [
          { kind: 'when', cond: { when: 'day' }, grant: { name: 'Noon Eye', critPct: 6, speedMult: 1.03 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 15
  {
    id: 'huntsmans_leathers',
    skill: 'archery',
    unlockLevel: 15,
    focusCost: 1,
    name: "Huntsman's Leathers",
    desc: 'Soft hide, oiled and quiet. Each piece of leather you wear lends your stride some speed.',
    color: '#7a6a48',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1.5 }],
    ranks: [
      {
        note: 'The leathers sit better: more speed per piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 2 }],
      },
      {
        note: 'Broken in and silent: more speed per piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 2.5 }],
      },
      {
        note: 'Every piece of leather also thickens your hide a little.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 2.5, maxHp: 2 }],
      },
    ],
  },
  // ------------------------------------------------------------ 20 (founding)
  {
    id: 'fletchers_eye',
    skill: 'archery',
    unlockLevel: 20,
    focusCost: 1,
    name: "Fletcher's Eye",
    desc: 'Snap shots stop being apologies. Quick arrows bite harder.',
    color: '#8a9a5a',
    effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.15 }],
    ranks: [
      {
        note: 'The snap shot bites harder.',
        effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.2 }],
      },
      {
        note: 'From the hip, and it still means it.',
        effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.25 }],
      },
      {
        note: 'Snap shots bite harder still, and the practiced eye finds the seam.',
        effects: [
          { kind: 'perk', perk: 'snapShotMult', magnitude: 1.3 },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 25
  {
    id: 'rime_fletching',
    skill: 'archery',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Rime Fletching',
    desc: 'Feathers cut from winter birds. Some arrows land cold and slow the quarry.',
    color: '#a8d0e0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:rime_fletching',
          name: 'Rimeshaft',
          trigger: { on: 'hit', chance: 0.18 },
          action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
          icd: 100,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'More of your arrows land cold.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rime_fletching',
              name: 'Rimeshaft',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
              icd: 100,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The cold clings longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rime_fletching',
              name: 'Rimeshaft',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 110 },
              icd: 100,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Every third arrow or so lands cold, the rime clings six seconds, the fletch rests less.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rime_fletching',
              name: 'Rimeshaft',
              trigger: { on: 'hit', chance: 0.3 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 120 },
              icd: 80,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 30
  {
    id: 'frozen_mark',
    skill: 'archery',
    unlockLevel: 30,
    focusCost: 1,
    name: 'The Frozen Mark',
    desc: 'A slowed thing is a marked thing. Chilled foes take more, and your arrows shatter them.',
    color: '#c8e0f0',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:frozen_mark',
          name: 'Shatter Shot',
          trigger: { on: 'hitState', status: 'chill', chance: 0.25 },
          action: { do: 'bolt', damage: 12 },
          icd: 180,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The chilled take more, and the shatter hits harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:frozen_mark',
              name: 'Shatter Shot',
              trigger: { on: 'hitState', status: 'chill', chance: 0.25 },
              action: { do: 'bolt', damage: 14 },
              icd: 180,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The frozen mark widens: more taken, and the shatter comes oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:frozen_mark',
              name: 'Shatter Shot',
              trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
              action: { do: 'bolt', damage: 16 },
              icd: 180,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Ice breaks at a touch: the shatter is heavier, likelier, and rests less.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:frozen_mark',
              name: 'Shatter Shot',
              trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 35
  {
    id: 'snarewright',
    skill: 'archery',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Snarewright',
    desc: 'Aim for the leg. A critical arrow holds the quarry to the spot a moment.',
    color: '#a8814f',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:snarewright',
          name: 'Hobbling Shot',
          trigger: { on: 'crit' },
          action: { do: 'status', status: 'root', power: 1, ticks: 30 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The hold lasts longer and the snare resets sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:snarewright',
              name: 'Hobbling Shot',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'root', power: 1, ticks: 34 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'A longer hold, and the eye that finds the leg finds the seam too.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:snarewright',
              name: 'Hobbling Shot',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'root', power: 1, ticks: 38 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'The full two-second hold, ready oftener, with a keener critical eye.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:snarewright',
              name: 'Hobbling Shot',
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'root', power: 1, ticks: 40 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 40
  {
    id: 'planted_loose',
    skill: 'archery',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Planted Loose',
    desc: 'Feet set, breath held, the shot that means it. Standing still, you deal more.',
    color: '#6a4f30',
    effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Planted', dmgMult: 1.08 } }],
    ranks: [
      {
        note: 'The planted shot lands heavier.',
        effects: [{ kind: 'when', cond: { when: 'still' }, grant: { name: 'Planted', dmgMult: 1.1 } }],
      },
      {
        note: 'Standing still you also catch your breath: a trickle of regen.',
        effects: [
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Planted', dmgMult: 1.1, regenPer4s: 2 } },
        ],
      },
      {
        note: 'The planted stance deals more, breathes deeper, and crits oftener.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'still' },
            grant: { name: 'Planted', dmgMult: 1.12, regenPer4s: 3, critPct: 2 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 45
  {
    id: 'loosing_rhythm',
    skill: 'archery',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Loosing Rhythm',
    desc: 'A kill is a beat in the song. Each one quickens your hand.',
    color: '#d8b860',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:loosing_rhythm',
          name: 'Quickened String',
          trigger: { on: 'kill' },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 60,
        },
      },
    ],
    ranks: [
      {
        note: 'The beat holds longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:loosing_rhythm',
              name: 'Quickened String',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 60,
            },
          },
        ],
      },
      {
        note: 'The song lingers a full six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:loosing_rhythm',
              name: 'Quickened String',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 60,
            },
          },
        ],
      },
      {
        note: 'Kills quicken you oftener, and while quickened you run lighter.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:loosing_rhythm',
              name: 'Quickened String',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 40,
            },
          },
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Strung Tight', speedMult: 1.06 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 50
  {
    id: 'owls_hour',
    skill: 'archery',
    unlockLevel: 50,
    focusCost: 2,
    name: "Owl's Hour",
    desc: 'The dark is loud to one who learns to hear it. After dusk, your blows land harder.',
    color: '#4a5a8a',
    effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: "Owl's Hour", dmgMult: 1.06 } }],
    ranks: [
      {
        note: 'The night eye opens wider: more damage after dusk.',
        effects: [{ kind: 'when', cond: { when: 'night' }, grant: { name: "Owl's Hour", dmgMult: 1.08 } }],
      },
      {
        note: 'You move through the dark like something that lives there.',
        effects: [
          { kind: 'when', cond: { when: 'night' }, grant: { name: "Owl's Hour", dmgMult: 1.08, speedMult: 1.03 } },
        ],
      },
      {
        note: 'The night is yours: harder blows and a lighter stride from dusk to sunrise.',
        effects: [
          { kind: 'when', cond: { when: 'night' }, grant: { name: "Owl's Hour", dmgMult: 1.1, speedMult: 1.05 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 55
  {
    id: 'poachers_road',
    skill: 'archery',
    unlockLevel: 55,
    focusCost: 2,
    name: "Poacher's Road",
    desc: 'A poacher runs before he aims. Struck, you break for cover; sneaking, you move quicker.',
    color: '#5a6a48',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:poachers_road',
          name: 'Break Cover',
          trigger: { on: 'hurt', chance: 0.35 },
          action: { do: 'surge', stat: 'speed', pct: 15, ticks: 60 },
          icd: 240,
        },
      },
      { kind: 'when', cond: { when: 'sneaking' }, grant: { name: "Poacher's Step", speedMult: 1.05 } },
    ],
    ranks: [
      {
        note: 'You break for cover faster.',
        effects: [
        {
          kind: 'proc',
          proc: {
            kind: 'proc',
            id: 'calling:poachers_road',
            name: 'Break Cover',
            trigger: { on: 'hurt', chance: 0.35 },
            action: { do: 'surge', stat: 'speed', pct: 18, ticks: 60 },
            icd: 240,
          },
        },
        { kind: 'when', cond: { when: 'sneaking' }, grant: { name: "Poacher's Step", speedMult: 1.05 } },
        ],
      },
      {
        note: 'The burst holds four seconds and comes oftener; the sneak runs quicker.',
        effects: [
        {
          kind: 'proc',
          proc: {
            kind: 'proc',
            id: 'calling:poachers_road',
            name: 'Break Cover',
            trigger: { on: 'hurt', chance: 0.35 },
            action: { do: 'surge', stat: 'speed', pct: 18, ticks: 80 },
            icd: 200,
          },
        },
        { kind: 'when', cond: { when: 'sneaking' }, grant: { name: "Poacher's Step", speedMult: 1.06 } },
        ],
      },
      {
        note: 'Nobody catches a poacher: a longer, faster break, and the first arrow from cover bites.',
        effects: [
        {
          kind: 'proc',
          proc: {
            kind: 'proc',
            id: 'calling:poachers_road',
            name: 'Break Cover',
            trigger: { on: 'hurt', chance: 0.35 },
            action: { do: 'surge', stat: 'speed', pct: 22, ticks: 80 },
            icd: 200,
          },
        },
        { kind: 'when', cond: { when: 'sneaking' }, grant: { name: "Poacher's Step", speedMult: 1.08, critPct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 60 (founding)
  {
    id: 'longstride',
    skill: 'archery',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Longstride',
    desc: 'The full draw no longer roots you. Walk your aim.',
    color: '#6b8a5a',
    effects: [{ kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.7 }],
    ranks: [
      {
        note: 'The drawn walk quickens.',
        effects: [{ kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.75 }],
      },
      {
        note: 'You draw at nearly a walking pace.',
        effects: [{ kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.8 }],
      },
      {
        note: 'The draw barely slows you, and a moving hand strikes harder.',
        effects: [
          { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.85 },
          { kind: 'when', cond: { when: 'moving' }, grant: { name: 'Walking Draw', dmgMult: 1.06 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 65
  {
    id: 'blood_trail',
    skill: 'archery',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Blood Trail',
    desc: 'Where the quarry bleeds, the hunter follows. Fresh wounds sharpen you; the bled take more.',
    color: '#b04838',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:blood_trail',
          name: 'Follow the Blood',
          trigger: { on: 'stateApplied', status: 'bleed' },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
          icd: 200,
          element: 'blood',
        },
      },
      { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The scent runs hotter: a stronger surge when a wound opens.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_trail',
              name: 'Follow the Blood',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 80 },
              icd: 200,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
      {
        note: 'The surge holds five seconds, and the bleeding take more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_trail',
              name: 'Follow the Blood',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
              icd: 200,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
        ],
      },
      {
        note: 'The trail never goes cold: a heavier surge, oftener, and the bleeding take more still.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:blood_trail',
              name: 'Follow the Blood',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 160,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 70
  {
    id: 'hawks_mark',
    skill: 'archery',
    unlockLevel: 70,
    focusCost: 2,
    name: "Hawk's Mark",
    desc: 'The hawk marks what it means to take. A critical arrow opens the quarry to everyone.',
    color: '#a89880',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:hawks_mark',
          name: "Hawk's Mark",
          trigger: { on: 'crit' },
          action: { do: 'status', status: 'sunder', power: 10, ticks: 80 },
          icd: 120,
        },
      },
      { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
    ],
    ranks: [
      {
        note: 'The mark opens the quarry wider.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hawks_mark',
              name: "Hawk's Mark",
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 80 },
              icd: 120,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
      {
        note: 'The mark holds five seconds and the eye that makes it grows keener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hawks_mark',
              name: "Hawk's Mark",
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 100 },
              icd: 120,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
        ],
      },
      {
        note: 'The deepest mark, a keener eye, and the sundered take more from your own bow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hawks_mark',
              name: "Hawk's Mark",
              trigger: { on: 'crit' },
              action: { do: 'status', status: 'sunder', power: 14, ticks: 100 },
              icd: 100,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 75
  {
    id: 'sixth_shaft',
    skill: 'archery',
    unlockLevel: 75,
    focusCost: 2,
    name: 'The Sixth Shaft',
    desc: 'Count your arrows. The sixth flies on past its mark to find the next.',
    color: '#8ab4c8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:sixth_shaft',
          name: 'Sixth Shaft',
          trigger: { on: 'cadence', every: 6 },
          action: { do: 'chain', damage: 12, jumps: 3 },
          icd: 160,
          element: 'storm',
        },
      },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The wandering shaft bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sixth_shaft',
              name: 'Sixth Shaft',
              trigger: { on: 'cadence', every: 6 },
              action: { do: 'chain', damage: 14, jumps: 3 },
              icd: 160,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 6 } },
        ],
      },
      {
        note: 'The wandering shaft lands heavier yet, and the bow hits harder besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sixth_shaft',
              name: 'Sixth Shaft',
              trigger: { on: 'cadence', every: 6 },
              action: { do: 'chain', damage: 16, jumps: 3 },
              icd: 160,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } },
        ],
      },
      {
        note: 'The sixth shaft finds a fourth throat and lands heaviest; the bow bites harder still.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sixth_shaft',
              name: 'Sixth Shaft',
              trigger: { on: 'cadence', every: 6 },
              action: { do: 'chain', damage: 18, jumps: 4 },
              icd: 160,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 80 (the capstone)
  {
    id: 'past_the_ear',
    skill: 'archery',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Past the Ear',
    desc: 'Draw past the ear and hold it. The Full Draw is yours to seat, and every bow hits harder.',
    color: '#b08a3c',
    effects: [
      { kind: 'art', ability: 'full_draw' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The master\'s bow bites harder.',
        effects: [
          { kind: 'art', ability: 'full_draw' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } },
        ],
      },
      {
        note: 'Harder still, and the held breath finds the seam.',
        effects: [
          { kind: 'art', ability: 'full_draw' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'The Full Draw at its height: heavier bow, keener eye, and your arts return sooner.',
        effects: [
          { kind: 'art', ability: 'full_draw' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, archery's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const ARCHERY_LICENSES: CallingLicense[] = [
  // The frozen mark: chill laid at 25, read at 25 (IV) and 30.
  { calling: 'rime_fletching', status: 'chill', via: 'lay:status' },
  { calling: 'frozen_mark', status: 'chill', via: 'read:vsState' },
  { calling: 'frozen_mark', status: 'chill', via: 'read:hitState' },
  // The hobbling shot: root laid at 35.
  { calling: 'snarewright', status: 'root', via: 'lay:status' },
  // The kill rhythm: quicken laid on the wearer at 45, ridden at IV.
  { calling: 'loosing_rhythm', status: 'quicken', via: 'lay:boon' },
  { calling: 'loosing_rhythm', status: 'quicken', via: 'read:stateRiding' },
  // The blood trail: bleed read at 65 (the echo and the reading edge).
  { calling: 'blood_trail', status: 'bleed', via: 'read:stateApplied' },
  { calling: 'blood_trail', status: 'bleed', via: 'read:vsState' },
  // The hawk's mark: sunder laid at 70, read at IV.
  { calling: 'hawks_mark', status: 'sunder', via: 'lay:status' },
  { calling: 'hawks_mark', status: 'sunder', via: 'read:vsState' },
];

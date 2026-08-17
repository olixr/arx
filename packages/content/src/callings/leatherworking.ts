/**
 * THE FILLED HALL — leatherworking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE TANNER'S ARC: the cured hide (oakbark armor per piece, the offcut
 * thrift, the soft sole), the kept edge (the whetstone, the skinner's
 * cut that opens a bleed, the awl's pace), the trapline (chilled quarry
 * takes more, boiled hide coats you in stone, the flensing that reads
 * the bleed), the road (saddle stitch while moving, the huntsman's cut
 * that answers a laid bleed, the supple fit), and the master's bench
 * (the split found in sundered armor, warmed leather quickening the
 * hands, the vat-cured body, and the Hunter's Wardrobe: Broadhead
 * licensed, its trail read by the whole ladder).
 * Pages: LAYS bleed / stonehide / quicken; READS bleed (hitState,
 * stateApplied, vsState), chill (vsState), sunder (vsState).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const LEATHERWORKING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5: the cured hide
  {
    id: 'oakbark_tan',
    skill: 'leatherworking',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Oakbark Tan',
    desc: 'Hides you cured yourself turn a blade. Each worn leather piece hardens you.',
    color: '#8a5a34',
    effects: [{ kind: 'perPiece', armorClass: 'leather', armor: 1 }],
    ranks: [
      {
        note: 'A longer soak in the vat: +1.5 armor per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', armor: 1.5 }],
      },
      {
        note: 'Bark tanned through the grain: +2 armor per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', armor: 2 }],
      },
      {
        note: 'Hide as good as your own skin: +2 armor and +2 health per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', armor: 2, maxHp: 2 }],
      },
    ],
  },
  // ------------------------------------------------------ 10: the offcuts
  {
    id: 'nothing_wasted',
    skill: 'leatherworking',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Nothing Wasted',
    desc: 'A tanner cuts to the grain and keeps the offcuts. Leatherwork sometimes spends no hide.',
    color: '#a3733f',
    effects: [{ kind: 'materialSave', skill: 'leatherworking', chance: 0.1 }],
    ranks: [
      {
        note: 'The scrap bin fills slower: 13% of leatherwork spends no material.',
        effects: [{ kind: 'materialSave', skill: 'leatherworking', chance: 0.13 }],
      },
      {
        note: 'You cut nested patterns: 16% of leatherwork spends no material.',
        effects: [{ kind: 'materialSave', skill: 'leatherworking', chance: 0.16 }],
      },
      {
        note: 'A whole hide, every inch used: 20% saved and +3 leatherworking.',
        effects: [
          { kind: 'materialSave', skill: 'leatherworking', chance: 0.2 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'leatherworking', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 15: the soft sole
  {
    id: 'soft_soled',
    skill: 'leatherworking',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Soft Soled',
    desc: 'Boots you stitched yourself make no sound. Your steps carry less to wary ears.',
    color: '#6b4a2c',
    effects: [{ kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.03 }],
    ranks: [
      {
        note: 'The sole is doubled and the seam turned in: quieter still.',
        effects: [{ kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.04 }],
      },
      {
        note: 'You could pass a dozing hound: quieter, and the crouch moves 4% quicker.',
        effects: [
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 },
          { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Soled', speedMult: 1.04 } },
        ],
      },
      {
        note: 'Buckskin over felt: quieter, and the crouch moves 6% quicker.',
        effects: [
          { kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.06 },
          { kind: 'when', cond: { when: 'sneaking' }, grant: { name: 'Soft Soled', speedMult: 1.06 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 20: founding
  {
    id: 'whetstone_habit',
    skill: 'leatherworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Whetstone Habit',
    desc: 'A worker of edges keeps their own keen. Strikes crit more often.',
    color: '#9a6a45',
    effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 2 } }],
    ranks: [
      { note: 'The stone comes out every evening: +3% crit.', effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 3 } }] },
      { note: 'You strop before every job: +4% crit.', effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 4 } }] },
      {
        note: 'Kept keen: +5% crit, and a critical sharpens your blows 12% for four seconds.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:whetstone_habit',
              name: 'Kept Keen',
              trigger: { on: 'crit' },
              action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
              icd: 220,
              element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 25: the skinner's knife
  {
    id: 'skinners_cut',
    skill: 'leatherworking',
    unlockLevel: 25,
    focusCost: 1,
    name: "Skinner's Cut",
    desc: 'You know where hide parts from meat. Your blows sometimes open a bleed.',
    color: '#b46a4a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:skinners_cut',
          name: "Skinner's Cut",
          trigger: { on: 'hit', chance: 0.18 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
          icd: 120,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The knife finds the seam oftener: 20% on a blow, the bleed runs longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:skinners_cut',
              name: "Skinner's Cut",
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'bleed', power: 2, ticks: 120 },
              icd: 120,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'A deeper cut: 22% on a blow, the bleed bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:skinners_cut',
              name: "Skinner's Cut",
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 110,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The flenser\'s hand: 25% on a blow, a hard bleed, and the knife rests only five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:skinners_cut',
              name: "Skinner's Cut",
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 140 },
              icd: 100,
              element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 30: the awl's pace
  {
    id: 'awl_and_sinew',
    skill: 'leatherworking',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Awl and Sinew',
    desc: 'The awl goes through and the sinew follows without a thought. Leatherwork goes quicker.',
    color: '#c8905a',
    effects: [{ kind: 'craftSpeed', skill: 'leatherworking', mult: 0.9 }],
    ranks: [
      {
        note: 'The stitch runs even: leatherwork 13% quicker.',
        effects: [{ kind: 'craftSpeed', skill: 'leatherworking', mult: 0.87 }],
      },
      {
        note: 'Two hands, one rhythm: leatherwork 16% quicker.',
        effects: [{ kind: 'craftSpeed', skill: 'leatherworking', mult: 0.84 }],
      },
      {
        note: 'The bench knows your hands: leatherwork 20% quicker and +3 leatherworking.',
        effects: [
          { kind: 'craftSpeed', skill: 'leatherworking', mult: 0.8 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'leatherworking', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 35: the trapline
  {
    id: 'trapline_reckoning',
    skill: 'leatherworking',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Trapline Reckoning',
    desc: 'A trapper knows a hobbled beast is a dead one. Chilled foes take more from you.',
    color: '#7f5b3b',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } }],
    ranks: [
      {
        note: 'You read the slowed track: chilled foes take 10% more.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } }],
      },
      {
        note: 'The snare closes: chilled foes take 12% more.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } }],
      },
      {
        note: 'Cold quarry, warm knife: chilled foes take 14% more, and you walk the line 5% quicker.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 40: boiled hide
  {
    id: 'boiled_hide',
    skill: 'leatherworking',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Boiled Hide',
    desc: 'Leather boiled in wax turns hard as plate. Being struck sometimes coats you in stone.',
    color: '#5c3d24',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:boiled_hide',
          name: 'Boiled Hide',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The wax takes deeper: one blow in four coats you in stone.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:boiled_hide',
              name: 'Boiled Hide',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'The coats hold longer: stone for seven seconds, resting twelve.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:boiled_hide',
              name: 'Boiled Hide',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'Cuirbouilli, the old word: 30% to stone for eight seconds, and +4 armor always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:boiled_hide',
              name: 'Boiled Hide',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 240,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 45: the flensing
  {
    id: 'the_flensing',
    skill: 'leatherworking',
    unlockLevel: 45,
    focusCost: 2,
    name: 'The Flensing',
    desc: 'Once the hide is open the knife knows the way. Blows on a bleeding foe sometimes cut deep.',
    color: '#8c3a2c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:the_flensing',
          name: 'The Flensing',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.2 },
          action: { do: 'bolt', damage: 12 },
          icd: 160,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The knife follows the red: 12 damage, one blow in four on a bleeding foe.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_flensing',
              name: 'The Flensing',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'bolt', damage: 12 },
              icd: 160,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'Deeper into the seam: 16 damage on the bleeding.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_flensing',
              name: 'The Flensing',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'To the bone: 20 damage, one blow in three on the bleeding, and +2% crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:the_flensing',
              name: 'The Flensing',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 50: the road
  {
    id: 'saddle_stitch',
    skill: 'leatherworking',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Saddle Stitch',
    desc: 'Seams sewn to be walked in, not stood in. While moving you go quicker and take it lighter.',
    color: '#c8a070',
    effects: [{ kind: 'when', cond: { when: 'moving' }, grant: { name: 'Saddle Stitch', speedMult: 1.04, armor: 2 } }],
    ranks: [
      {
        note: 'The straps sit right: 5% quicker and +3 armor on the move.',
        effects: [
          { kind: 'when', cond: { when: 'moving' }, grant: { name: 'Saddle Stitch', speedMult: 1.05, armor: 3 } },
        ],
      },
      {
        note: 'Miles in and nothing chafes: 6% quicker and +4 armor on the move.',
        effects: [
          { kind: 'when', cond: { when: 'moving' }, grant: { name: 'Saddle Stitch', speedMult: 1.06, armor: 4 } },
        ],
      },
      {
        note: 'Made for the long road: 6% quicker, +4 armor, and you mend a little as you walk.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'moving' },
            grant: { name: 'Saddle Stitch', speedMult: 1.06, armor: 4, regenPer4s: 1 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 55: the huntsman's cut
  {
    id: 'huntsmans_cut',
    skill: 'leatherworking',
    unlockLevel: 55,
    focusCost: 2,
    name: "Huntsman's Cut",
    desc: 'You dress the hunt and know its rhythm. Bows hit harder; a bleed you lay quickens you.',
    color: '#7a5a36',
    effects: [
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:huntsmans_cut',
          name: 'The Hunt Is Up',
          trigger: { on: 'stateApplied', status: 'bleed' },
          action: { do: 'surge', stat: 'speed', pct: 12, ticks: 60 },
          icd: 200,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The jerkin fits the draw: bows +10%, and the chase runs 14% quicker.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:huntsmans_cut',
              name: 'The Hunt Is Up',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'speed', pct: 14, ticks: 60 },
              icd: 200,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'You follow the trail longer: bows +12%, the chase 14% quicker for four seconds.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:huntsmans_cut',
              name: 'The Hunt Is Up',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'speed', pct: 14, ticks: 80 },
              icd: 180,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The hunt master: bows +14%, the chase 16% quicker for four seconds, and +2% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:huntsmans_cut',
              name: 'The Hunt Is Up',
              trigger: { on: 'stateApplied', status: 'bleed' },
              action: { do: 'surge', stat: 'speed', pct: 16, ticks: 80 },
              icd: 180,
              element: 'blood',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 60: founding
  {
    id: 'supple_fit',
    skill: 'leatherworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Supple Fit',
    desc: 'Leather you understand never binds. Each worn piece quickens you.',
    color: '#b8865a',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.5 }],
    ranks: [
      {
        note: 'Oiled at the joints: 0.7% quicker per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.7 }],
      },
      {
        note: 'Cut to your own frame: 1% quicker per leather piece.',
        effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 1 }],
      },
      {
        note: 'A second skin: 1.2% quicker per leather piece, and cooldowns 6% shorter.',
        effects: [
          { kind: 'perPiece', armorClass: 'leather', speedPct: 1.2 },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 65: the split
  {
    id: 'find_the_split',
    skill: 'leatherworking',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Find the Split',
    desc: 'Skiving hide teaches where armor straps gap. Sundered foes take more; you crit oftener.',
    color: '#8a4a3a',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
      { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
    ],
    ranks: [
      {
        note: 'The eye for the gap sharpens: sundered foes take 12% more, +3% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'Through the buckle and the strap: sundered foes take 14% more, +3% crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'The plate falls off in pieces: sundered foes take 16% more, +4% crit, +6% one hand blades.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 16 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 70: warmed leather
  {
    id: 'warmed_leather',
    skill: 'leatherworking',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Warmed Leather',
    desc: 'Worn leather warms and gives with the work. Every sixth blow you land quickens your hands.',
    color: '#d2a86e',
    effects: [
      { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:warmed_leather',
          name: 'Warmed Leather',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The straps give sooner: every fifth blow quickens you.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:warmed_leather',
              name: 'Warmed Leather',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The warmth lasts: quickened five seconds, and cooldowns 7% shorter.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 7 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:warmed_leather',
              name: 'Warmed Leather',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'Broken in and living: quickened six seconds, cooldowns 8% shorter, and 5% quicker afoot.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:warmed_leather',
              name: 'Warmed Leather',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 140,
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 75: the vat
  {
    id: 'vat_cured',
    skill: 'leatherworking',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Vat Cured',
    desc: 'Years with your arms in the tanning vat. Poison and burning grip you weakly; you mend.',
    color: '#6e4b2f',
    effects: [
      { kind: 'perk', perk: 'dotResistMult', magnitude: 0.9 },
      { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
    ],
    ranks: [
      {
        note: 'The skin thickens: lingering harm 15% weaker, +2 regen, +10 health.',
        effects: [
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.85 },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
      {
        note: 'Cured through: lingering harm 20% weaker, +2 regen, +12 health.',
        effects: [
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.8 },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'Old hide, hard hide: harm 20% weaker, +2 regen, +14 health, +6 armor when pressed.',
        effects: [
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.8 },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 14 } },
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.35 }, grant: { name: 'Thick Hide', armor: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 80: the capstone
  {
    id: 'hunters_wardrobe',
    skill: 'leatherworking',
    unlockLevel: 80,
    focusCost: 3,
    name: "The Hunter's Wardrobe",
    desc: 'You outfit the hunt and loose its shaft. Broadhead is yours; bleeding foes take more.',
    color: '#5a3f2a',
    effects: [
      { kind: 'art', ability: 'broadhead' },
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
      { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The shaft flies truer: +4% crit, bleeding foes take 10% more.',
        effects: [
          { kind: 'art', ability: 'broadhead' },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
        ],
      },
      {
        note: 'The trail runs red and you follow it: +4% crit, bleeding foes take 12% more.',
        effects: [
          { kind: 'art', ability: 'broadhead' },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 12 } },
        ],
      },
      {
        note: 'Master of the hunt: +5% crit, bleeding foes take 14% more, and every kill hastens you.',
        effects: [
          { kind: 'art', ability: 'broadhead' },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 14 } },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 40 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, leatherworking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const LEATHERWORKING_LICENSES: CallingLicense[] = [
  { calling: 'skinners_cut', status: 'bleed', via: 'lay:status' },
  { calling: 'trapline_reckoning', status: 'chill', via: 'read:vsState' },
  { calling: 'boiled_hide', status: 'stonehide', via: 'lay:boon' },
  { calling: 'the_flensing', status: 'bleed', via: 'read:hitState' },
  { calling: 'huntsmans_cut', status: 'bleed', via: 'read:stateApplied' },
  { calling: 'find_the_split', status: 'sunder', via: 'read:vsState' },
  { calling: 'warmed_leather', status: 'quicken', via: 'lay:boon' },
  { calling: 'hunters_wardrobe', status: 'bleed', via: 'read:vsState' },
];

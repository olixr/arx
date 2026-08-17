/**
 * THE FILLED HALL — tailoring's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE NEEDLE'S ARC: an apprentice of the Row learns a quick needle
 * (5), sews light (10), and threads the first sigil into a hem (15);
 * the seams stop fraying (20) and the lining learns to turn a blow
 * (25); the emberweave cuff scorches (30), the deep cowl cools the
 * mind (35), the tailor's eye finds where any seam gives (40, reads
 * sunder), the moonpale weft lays cold (45) and the darning needle
 * mends the wearer the moment the cloth tears past half (50); the cold sewn into a foe stays out of the
 * lining (55, reads the chill this ladder lays), the quilting thickens
 * (60), the shuttle flies and quickens the hand (65), quickened hands
 * sew ninefold (70, reads quicken), the scorched thread answers a
 * burning foe (75, reads the burn this ladder lays), and at 80 the
 * spindle turns: Red Thread, THE MASTER'S LICENSE, the spinner's own
 * art, winding while the tailor holds still.
 *
 * Pages laid: burn (ember cuff), chill (moonpale weft), mend (darning
 * needle), quicken (the shuttle). Pages read: sunder (vsState, the
 * smith's and the miner's mark), chill (stateApplied), quicken
 * (stateRiding), burn (hitState, the arx hand's and the cook's fire).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const TAILORING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5..15: three identities
  {
    id: 'quick_needle',
    skill: 'tailoring',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Quick Needle',
    desc: 'The first callus on the finger. Every pattern comes off the bench sooner.',
    color: '#c8a8d8',
    effects: [{ kind: 'craftSpeed', skill: 'tailoring', mult: 0.9 }],
    ranks: [
      {
        note: 'The thimble stops slipping. Patterns finish sooner still.',
        effects: [{ kind: 'craftSpeed', skill: 'tailoring', mult: 0.87 }],
      },
      {
        note: 'You sew without looking at your hands. Sooner yet.',
        effects: [{ kind: 'craftSpeed', skill: 'tailoring', mult: 0.84 }],
      },
      {
        note: 'The needle is a blur. Fastest bench on the Row, and your craft deepens.',
        effects: [
          { kind: 'craftSpeed', skill: 'tailoring', mult: 0.8 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'tailoring', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'featherstitch',
    skill: 'tailoring',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Featherstitch',
    desc: 'You sew light and wear lighter. Each worn piece of cloth quickens your step.',
    color: '#e0d0e8',
    effects: [{ kind: 'perPiece', armorClass: 'cloth', speedPct: 1.2 }],
    ranks: [
      {
        note: 'The hems come up an inch. Each piece of cloth quickens you more.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', speedPct: 1.5 }],
      },
      {
        note: 'Nothing on you drags. Quicker still per piece.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', speedPct: 1.8 }],
      },
      {
        note: 'You move like a dropped scarf. Two percent a piece, and quiet padding in every hem.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', speedPct: 2, armor: 1 }],
      },
    ],
  },
  {
    id: 'sigil_stitch',
    skill: 'tailoring',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Sigil Stitch',
    desc: 'The first sigil threaded into a hem. Your arcane workings strike harder.',
    color: '#b06fb8',
    effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 8 } }],
    ranks: [
      {
        note: 'A second sigil, sewn tighter. Arcane workings harder still.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 10 } }],
      },
      {
        note: 'The thread hums when you cast. Harder yet.',
        effects: [{ kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 12 } }],
      },
      {
        note: 'The whole hem is a sentence. Hardest arcane, and your workings bite truer.',
        effects: [
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'arcane', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 20..50: the verbs arrive
  {
    id: 'fine_seams',
    skill: 'tailoring',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Fine Seams',
    desc: 'Nothing frays under your needle. Cloth and thread are sometimes saved.',
    color: '#d8c8a8',
    effects: [{ kind: 'materialSave', skill: 'tailoring', chance: 0.08 }],
    ranks: [
      {
        note: 'Less on the cutting floor. Cloth is saved oftener.',
        effects: [{ kind: 'materialSave', skill: 'tailoring', chance: 0.11 }],
      },
      {
        note: 'You cut every bolt to the last thread. Saved oftener still.',
        effects: [{ kind: 'materialSave', skill: 'tailoring', chance: 0.14 }],
      },
      {
        note: 'Master Ottilie would nod. Nearly one bolt in five is saved, and your craft deepens.',
        effects: [
          { kind: 'materialSave', skill: 'tailoring', chance: 0.18 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'tailoring', amount: 3 } },
        ],
      },
    ],
  },
  {
    id: 'turned_lining',
    skill: 'tailoring',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Turned Lining',
    desc: 'A blow that lands finds padding, not flesh. Being wounded sometimes raises a ward.',
    color: '#a898b8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:turned_lining', name: 'Turned',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'ward', absorb: 24, ticks: 120 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'A thicker batting. The ward takes more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:turned_lining', name: 'Turned',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'ward', absorb: 30, ticks: 120 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'The lining turns oftener, and takes more still.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:turned_lining', name: 'Turned',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'ward', absorb: 36, ticks: 140 },
              icd: 260,
            },
          },
        ],
      },
      {
        note: 'Quilted through and through. The stoutest ward, and the cloth itself wears like armor.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:turned_lining', name: 'Turned',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'ward', absorb: 44, ticks: 160 },
              icd: 240,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'ember_cuff',
    skill: 'tailoring',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Ember Cuff',
    desc: 'Emberweave sewn at the wrist. Your blows sometimes set a foe burning.',
    color: '#e0a070',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ember_cuff', name: 'Ember Cuff',
          trigger: { on: 'hit', chance: 0.18 },
          action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
          icd: 200,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The cuff glows longer. The burn lasts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ember_cuff', name: 'Ember Cuff',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 90 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'A second thread of ember. The cuff wakes oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ember_cuff', name: 'Ember Cuff',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 90 },
              icd: 180,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The whole sleeve is emberweave. Hotter, oftener, and your ember workings hit harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ember_cuff', name: 'Ember Cuff',
              trigger: { on: 'hit', chance: 0.24 },
              action: { do: 'status', status: 'burn', power: 3, ticks: 90 },
              icd: 160,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 6 } },
        ],
      },
    ],
  },
  {
    id: 'deep_cowl',
    skill: 'tailoring',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Deep Cowl',
    desc: 'A runecloth cowl keeps the mind cool and close. Your arts return sooner.',
    color: '#6a5a80',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 8 } }],
    ranks: [
      {
        note: 'The cowl is drawn deeper. Arts return sooner still.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 10 } }],
      },
      {
        note: 'Runes stitched inside the hood. Sooner yet.',
        effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 12 } }],
      },
      {
        note: 'The world narrows to the work. Soonest, and with a staff in hand your eye finds the flaw.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 14 } },
          { kind: 'when', cond: { when: 'wielding', style: 'arx' }, grant: { name: 'Cowled', critPct: 3 } },
        ],
      },
    ],
  },
  {
    id: 'where_the_seam_gives',
    skill: 'tailoring',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Where the Seam Gives',
    desc: 'Every suit of armor is stitched somewhere. Foes with sundered armor take more from you.',
    color: '#8a6a9a',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
    ],
    ranks: [
      {
        note: 'You see the loose rivet from across the room. Sundered foes take more.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'The eye that finds a flaw finds them all. More vs sundered, and a keener eye everywhere.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'No seam holds against you. Most vs sundered, and the keenest eye.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },
  {
    id: 'moonpale_weft',
    skill: 'tailoring',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Moonpale Weft',
    desc: 'Moonpale silk holds the cold of the night it was spun. Every fifth blow chills.',
    color: '#9ab8d8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:moonpale_weft', name: 'Moonpale',
          trigger: { on: 'cadence', every: 5 },
          action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
          icd: 160,
          element: 'frost',
        },
      },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The cold clings. Chill lasts longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:moonpale_weft', name: 'Moonpale',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 110 },
              icd: 160,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 8 } },
        ],
      },
      {
        note: 'Every fourth blow now. Frost workings bite harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:moonpale_weft', name: 'Moonpale',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 110 },
              icd: 140,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 10 } },
        ],
      },
      {
        note: 'Woven under a full moon. Longest chill, hardest frost, and a quicker step for you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:moonpale_weft', name: 'Moonpale',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 130 },
              icd: 120,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 12 } },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'darning_needle',
    skill: 'tailoring',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Darning Needle',
    desc: 'You darn flesh the way you darn wool. Torn below half health, you set to mending.',
    color: '#9ac8b0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:darning_needle', name: 'Darning',
          trigger: { on: 'lowHp', pct: 0.5 },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
          icd: 500,
        },
      },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
    ],
    ranks: [
      {
        note: 'A longer thread on the needle. The mending runs longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:darning_needle', name: 'Darning',
              trigger: { on: 'lowHp', pct: 0.5 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 120 },
              icd: 450,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
      {
        note: 'Tighter stitches. The mending closes more each second, and you are hardier.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:darning_needle', name: 'Darning',
              trigger: { on: 'lowHp', pct: 0.5 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 400,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
      {
        note: 'You could darn a wound shut in the dark. The strongest mending, and the hardiest frame.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:darning_needle', name: 'Darning',
              trigger: { on: 'lowHp', pct: 0.5 },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 350,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 55..75: the packages widen
  {
    id: 'frost_lining',
    skill: 'tailoring',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Cold Comfort',
    desc: 'The cold you sew into a foe stays out of you. Chilling a foe raises a ward on you.',
    color: '#b8cce0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:frost_lining', name: 'Cold Comfort',
          trigger: { on: 'stateApplied', status: 'chill' },
          action: { do: 'ward', absorb: 28, ticks: 160 },
          icd: 240,
          element: 'frost',
        },
      },
      { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
    ],
    ranks: [
      {
        note: 'The lining holds more cold. A stouter ward.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:frost_lining', name: 'Cold Comfort',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'ward', absorb: 36, ticks: 160 },
              icd: 240,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
      {
        note: 'The ward comes round sooner, and the cloth wears thicker.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:frost_lining', name: 'Cold Comfort',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'ward', absorb: 44, ticks: 180 },
              icd: 200,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
        ],
      },
      {
        note: 'Rime in every fold. Stoutest ward, thickest cloth, and chilled foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:frost_lining', name: 'Cold Comfort',
              trigger: { on: 'stateApplied', status: 'chill' },
              action: { do: 'ward', absorb: 54, ticks: 200 },
              icd: 180,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 8 } },
        ],
      },
    ],
  },
  {
    id: 'quilted_lining',
    skill: 'tailoring',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Quilted Lining',
    desc: 'Your cloth carries hidden padding. Each worn piece toughens you.',
    color: '#a888c8',
    effects: [{ kind: 'perPiece', armorClass: 'cloth', maxHp: 2 }],
    ranks: [
      {
        note: 'A second layer of batting. Each piece toughens you more.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', maxHp: 3 }],
      },
      {
        note: 'Wool between the silks. Each piece toughens and armors you.',
        effects: [{ kind: 'perPiece', armorClass: 'cloth', maxHp: 3, armor: 1 }],
      },
      {
        note: 'A robe a knight would envy. Most toughness and armor a piece, and you knit as you walk.',
        effects: [
          { kind: 'perPiece', armorClass: 'cloth', maxHp: 4, armor: 1 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  {
    id: 'the_shuttle_flies',
    skill: 'tailoring',
    unlockLevel: 65,
    focusCost: 2,
    name: 'The Shuttle Flies',
    desc: 'Cast enough and the hands find the loom rhythm. Every fifth art quickens you.',
    color: '#d8c070',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:the_shuttle_flies', name: 'Shuttle',
          trigger: { on: 'stacks', per: 'cast', count: 5 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 200,
        },
      },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The shuttle stays in the air longer. Quickening lasts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_shuttle_flies', name: 'Shuttle',
              trigger: { on: 'stacks', per: 'cast', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 110 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 8 } },
        ],
      },
      {
        note: 'Every fourth art now, and stormwoven thread bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_shuttle_flies', name: 'Shuttle',
              trigger: { on: 'stacks', per: 'cast', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 110 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 10 } },
        ],
      },
      {
        note: 'The loom sings. Longest quickening, hardest storm, and every art returns sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:the_shuttle_flies', name: 'Shuttle',
              trigger: { on: 'stacks', per: 'cast', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 140 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'storm', pct: 12 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'ninefold_stitch',
    skill: 'tailoring',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Ninefold Stitch',
    desc: 'Quickened hands sew nine where others sew one. Quickened, you strike harder and truer.',
    color: '#c89ad0',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'quicken' },
        grant: { name: 'Ninefold', dmgMult: 1.06, critPct: 2 },
      },
      { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
    ],
    ranks: [
      {
        note: 'The ninth stitch lands harder. More damage while quickened.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Ninefold', dmgMult: 1.08, critPct: 2 },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
      {
        note: 'Every quick stitch finds the flaw. Truer while quickened, and truer at rest.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Ninefold', dmgMult: 1.08, critPct: 4 },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'Nine stitches, one breath. Hardest and truest while quickened, and quicker on your feet.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'quicken' },
            grant: { name: 'Ninefold', dmgMult: 1.1, critPct: 4, speedMult: 1.05 },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },
  {
    id: 'scorchthread',
    skill: 'tailoring',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Scorchthread',
    desc: 'A burning foe is a loose thread, and you pull it. Striking one sometimes sends fire.',
    color: '#d88858',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:scorchthread', name: 'Scorchthread',
          trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
          action: { do: 'bolt', damage: 16 },
          icd: 200,
          element: 'ember',
        },
      },
      { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The thread pulls harder. A hotter bolt.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scorchthread', name: 'Scorchthread',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'bolt', damage: 20 },
              icd: 200,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 8 } },
        ],
      },
      {
        note: 'You find the thread oftener, and ember workings hit harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scorchthread', name: 'Scorchthread',
              trigger: { on: 'hitState', status: 'burn', chance: 0.35 },
              action: { do: 'bolt', damage: 24 },
              icd: 180,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 10 } },
        ],
      },
      {
        note: 'The whole garment unravels in flame. Hottest bolt, soonest, and burning foes take more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scorchthread', name: 'Scorchthread',
              trigger: { on: 'hitState', status: 'burn', chance: 0.4 },
              action: { do: 'bolt', damage: 28 },
              icd: 160,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 12 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------ 80: the capstone, THE MASTER'S LICENSE
  {
    id: 'the_spindle_turns',
    skill: 'tailoring',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Spindle Turns',
    desc: 'The spinner\'s art was always yours. Red Thread is yours, and it winds while you stand.',
    color: '#c4587a',
    effects: [
      { kind: 'art', ability: 'red_thread' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 8 } },
      { kind: 'when', cond: { when: 'still' }, grant: { name: 'Spinner\'s Stillness', dmgMult: 1.06 } },
    ],
    ranks: [
      {
        note: 'The spindle turns truer. Staff arts harder, and harder still while you stand.',
        effects: [
          { kind: 'art', ability: 'red_thread' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 10 } },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Spinner\'s Stillness', dmgMult: 1.08 } },
        ],
      },
      {
        note: 'The thread winds thick. Harder yet, and standing still you wear the wound as cloth.',
        effects: [
          { kind: 'art', ability: 'red_thread' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 12 } },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Spinner\'s Stillness', dmgMult: 1.08, armor: 6 } },
        ],
      },
      {
        note: 'Master of the Row. Hardest staff arts, the fullest stillness, and a stouter frame.',
        effects: [
          { kind: 'art', ability: 'red_thread' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 14 } },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Spinner\'s Stillness', dmgMult: 1.1, armor: 8 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, tailoring's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding
 * / vsState) is licensed here by a conscious row, never by authoring
 * the def alone.
 */
export const TAILORING_LICENSES: CallingLicense[] = [
  // Lays.
  { calling: 'ember_cuff', status: 'burn', via: 'lay:status' },
  { calling: 'moonpale_weft', status: 'chill', via: 'lay:status' },
  { calling: 'darning_needle', status: 'mend', via: 'lay:boon' },
  { calling: 'the_shuttle_flies', status: 'quicken', via: 'lay:boon' },
  // Reads.
  { calling: 'where_the_seam_gives', status: 'sunder', via: 'read:vsState' },
  { calling: 'frost_lining', status: 'chill', via: 'read:stateApplied' },
  { calling: 'frost_lining', status: 'chill', via: 'read:vsState' },
  { calling: 'ninefold_stitch', status: 'quicken', via: 'read:stateRiding' },
  { calling: 'scorchthread', status: 'burn', via: 'read:hitState' },
  { calling: 'scorchthread', status: 'burn', via: 'read:vsState' },
];

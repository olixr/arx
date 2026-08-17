/**
 * THE FILLED HALL — smithing's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE FORGE'S ARC: a new hand works the bellows (5), builds anvil
 * shoulders (10) and learns the banked fire that knits wounds between
 * fights (15); the sparing hammer arrives (20) and the hammer hand
 * learns where iron gives, laying sunder on the field (25); the smith
 * fits her own plate (30) and reads cold steel for the crack (35, the
 * quench-master's Cold Shut); the hammer's rhythm follows her out of
 * the smithy (40 quicken), she counts rivets on sundered foes (45),
 * and heat she lays becomes heat she uses (50 reads burn). Then THE
 * MASTER SMITH: she wields what she forges (55 Warsmith), the metal
 * answers her like an old friend and her hands never quite cool (60
 * Forgeheat lays burn), the slag sets on her skin when pressed (65
 * stonehide), every edge is ground true (70), the anvil chorus rings
 * out through open seams (75, the sunder pair closes), and at 80 the
 * forge itself is licensed: WHITE HEAT, the Forgewrath's art, hers
 * without the hammer (THE MASTER'S LICENSE).
 *
 * Pages laid: sunder (the hammer hand), quicken (forge tempo), burn
 * (forgeheat), stonehide (slag coat). Pages read: chill (cold shut,
 * hitState), sunder (rivet counter vsState, anvil chorus hitState),
 * burn (emberstone heart, stateApplied). Hinges: an arx hand's burn
 * and White Heat's own burning edge wake Emberstone Heart; the
 * archer's and caster's chill feed Cold Shut; the smith's sunder is
 * the page half the melee hall already reads.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SMITHING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5..15: three identities
  {
    id: 'bellows_hand',
    skill: 'smithing',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Bellows Hand',
    desc: 'You learned to keep the fire honest before you touched a hammer. You smith faster.',
    color: '#b87a4a',
    effects: [{ kind: 'craftSpeed', skill: 'smithing', mult: 0.9 }],
    ranks: [
      {
        note: 'The fire answers before you ask. Faster still at the anvil.',
        effects: [{ kind: 'craftSpeed', skill: 'smithing', mult: 0.86 }],
      },
      {
        note: 'Bellows, tongs, hammer, quench, no wasted motion between. Faster yet.',
        effects: [{ kind: 'craftSpeed', skill: 'smithing', mult: 0.82 }],
      },
      {
        note: 'The forge keeps your pace and your blood keeps the forge. Fastest, and you mend a little.',
        effects: [
          { kind: 'craftSpeed', skill: 'smithing', mult: 0.78 },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  {
    id: 'anvil_shoulders',
    skill: 'smithing',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Anvil Shoulders',
    desc: 'A season of hammer work builds a frame that takes hits. Your health rises.',
    color: '#6f7683',
    effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 8 } }],
    ranks: [
      {
        note: 'The frame thickens. More health.',
        effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 11 } }],
      },
      {
        note: 'You could carry the anvil home. More health yet.',
        effects: [{ kind: 'gear', effect: { kind: 'maxHp', amount: 14 } }],
      },
      {
        note: 'Broad as the anvil and near as hard. Most health, and a coat of armor besides.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 17 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'banked_fire',
    skill: 'smithing',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Banked Fire',
    desc: 'A forge left banked is warm by morning. Out of combat, your wounds knit faster.',
    color: '#d0783a',
    effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Banked Fire', regenPer4s: 2 } }],
    ranks: [
      {
        note: 'The coals hold longer. You knit faster between fights.',
        effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Banked Fire', regenPer4s: 3 } }],
      },
      {
        note: 'Warm to the bone by the time you reach the road. Faster still.',
        effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Banked Fire', regenPer4s: 4 } }],
      },
      {
        note: 'You leave the fight already mending, and your step lightens with it.',
        effects: [
          { kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Banked Fire', regenPer4s: 4, speedMult: 1.04 } },
        ],
      },
    ],
  },

  // ---------------------------------------------- 20..50: the verbs arrive
  {
    id: 'sparing_hammer',
    skill: 'smithing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Sparing Hammer',
    desc: 'No blow wasted, no bar spent twice. Materials are sometimes saved.',
    color: '#8a94a4',
    effects: [{ kind: 'materialSave', skill: 'smithing', chance: 0.08 }],
    ranks: [
      {
        note: 'You read the bar before you heat it. Materials saved oftener.',
        effects: [{ kind: 'materialSave', skill: 'smithing', chance: 0.11 }],
      },
      {
        note: 'Off-cuts go back in the crucible, never the slag heap. Oftener yet.',
        effects: [{ kind: 'materialSave', skill: 'smithing', chance: 0.14 }],
      },
      {
        note: 'The sparing hand spares the arm too. Most saved, and your fighting arts return sooner.',
        effects: [
          { kind: 'materialSave', skill: 'smithing', chance: 0.16 },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'hammer_hand',
    skill: 'smithing',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Hammer Hand',
    desc: 'The forge taught your arm where iron gives. Your blows sometimes sunder armor.',
    color: '#9c8f7c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:hammer_hand', name: 'Hammer Hand',
          trigger: { on: 'hit', chance: 0.2 },
          action: { do: 'status', status: 'sunder', power: 8, ticks: 60 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'The seam opens wider. Sunder bites deeper and lasts longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hammer_hand', name: 'Hammer Hand',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 70 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'You find the rivet without looking. Deeper, longer, and the hand rests less.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hammer_hand', name: 'Hammer Hand',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'Every plate you meet was made by a lesser smith. Oftener, deepest, longest.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:hammer_hand', name: 'Hammer Hand',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'sunder', power: 14, ticks: 90 },
              icd: 100,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'plate_wise',
    skill: 'smithing',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Plate Wise',
    desc: 'You set every rivet yourself. Each plate piece you wear guards more and drags less.',
    color: '#a9b0bc',
    effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1, speedPct: 0.5 }],
    ranks: [
      {
        note: 'The fit tightens: 1.5 armor a piece, half a percent of speed each.',
        effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1.5, speedPct: 0.5 }],
      },
      {
        note: 'Plate hung on you like skin: 2 armor a piece, 0.7% speed each.',
        effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 2, speedPct: 0.7 }],
      },
      {
        note: 'You forget you are wearing it: 2 armor, 0.8% speed, and 2 health a piece.',
        effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 2, speedPct: 0.8, maxHp: 2 }],
      },
    ],
  },
  {
    id: 'cold_shut',
    skill: 'smithing',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Cold Shut',
    desc: 'Steel worked cold cracks along the fold. Blows on chilled foes sometimes shatter for more.',
    color: '#7a8ea0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cold_shut', name: 'Cold Shut',
          trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
          action: { do: 'bolt', damage: 12 },
          icd: 160,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'You know the fold line by eye. The shatter hits harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cold_shut', name: 'Cold Shut',
              trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
              action: { do: 'bolt', damage: 15 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'Cold metal has no argument left in it. Harder still.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cold_shut', name: 'Cold Shut',
              trigger: { on: 'hitState', status: 'chill', chance: 0.3 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'One tap and the whole piece goes. Oftener and hardest.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cold_shut', name: 'Cold Shut',
              trigger: { on: 'hitState', status: 'chill', chance: 0.36 },
              action: { do: 'bolt', damage: 22 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'forge_tempo',
    skill: 'smithing',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Forge Tempo',
    desc: 'The hammer keeps its beat outside the smithy. Every fifth landed blow quickens your hand.',
    color: '#d9a441',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:forge_tempo', name: 'Forge Tempo',
          trigger: { on: 'cadence', every: 5 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The beat carries longer once it starts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forge_tempo', name: 'Forge Tempo',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Every fourth blow now, and the hand rests less between beats.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forge_tempo', name: 'Forge Tempo',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The whole fight is hammer music. Longest beat, and your arts return sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forge_tempo', name: 'Forge Tempo',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 140,
            },
          },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'rivet_counter',
    skill: 'smithing',
    unlockLevel: 45,
    focusCost: 2,
    name: 'The Missing Rivet',
    desc: 'You know where the plate is riveted and where it is not. Sundered foes take more from you.',
    color: '#c0b8a8',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } }],
    ranks: [
      {
        note: 'You count the gaps at a glance. Sundered foes take more still.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } }],
      },
      {
        note: 'An open seam is an invitation. More yet.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } }],
      },
      {
        note: 'You set the edge where the plate ends. Most vs the sundered, and crits come oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  {
    id: 'emberstone_heart',
    skill: 'smithing',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Emberstone Heart',
    desc: 'Heat you lay is heat you use. Set a foe burning and your blows carry the forge a while.',
    color: '#e8602c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:emberstone_heart', name: 'Emberstone Heart',
          trigger: { on: 'stateApplied', status: 'burn' },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
          icd: 240,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'The forge burns hotter in you, and longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:emberstone_heart', name: 'Emberstone Heart',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 14, ticks: 90 },
              icd: 240,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'You bank the heat between burnings. Hotter, longer, sooner again.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:emberstone_heart', name: 'Emberstone Heart',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 16, ticks: 100 },
              icd: 220,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The stone never cools. Hottest and longest, and your health rises with the heat.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:emberstone_heart', name: 'Emberstone Heart',
              trigger: { on: 'stateApplied', status: 'burn' },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 120 },
              icd: 200,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },

  // ---------------------------------------- 55..75: the master smith
  {
    id: 'warsmith',
    skill: 'smithing',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Warsmith',
    desc: 'She who forges the steel swings it truest. Blade, greatblade, and pole all strike harder.',
    color: '#b06a30',
    effects: [
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 7 } },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 7 } },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 7 } },
    ],
    ranks: [
      {
        note: 'You know the balance point of every piece you ever made. Harder across all three.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 9 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 9 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 9 } },
        ],
      },
      {
        note: 'The steel and the arm were tempered in the same fire. Harder still.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 11 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 11 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 11 } },
        ],
      },
      {
        note: 'No hand alive knows steel like yours. Hardest across all three, and crits come oftener.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  {
    id: 'forgeheat',
    skill: 'smithing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Forgeheat',
    desc: 'The metal answers you like an old friend. Smith as three levels wiser.',
    color: '#c46a3a',
    effects: [{ kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 3 } }],
    ranks: [
      {
        note: 'Your hands never quite cool. Your blows sometimes set foes burning.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forgeheat', name: 'Forgeheat',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'burn', power: 1, ticks: 60 },
              icd: 120,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Four levels wiser, and the heat lingers longer on those you strike.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forgeheat', name: 'Forgeheat',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'burn', power: 1, ticks: 70 },
              icd: 100,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Five levels wiser, and the heat in your hands burns hotter and longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:forgeheat', name: 'Forgeheat',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 80 },
              icd: 100,
              element: 'ember',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'slag_coat',
    skill: 'smithing',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Slag Coat',
    desc: 'The forge leaves a crust on those who work it. Hurt badly, your skin sets like slag.',
    color: '#5a5560',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:slag_coat', name: 'Slag Coat',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 600,
        },
      },
    ],
    ranks: [
      {
        note: 'The crust holds longer before it flakes.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:slag_coat', name: 'Slag Coat',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 150 },
              icd: 560,
            },
          },
        ],
      },
      {
        note: 'It sets before you are so far gone, holds longer, and re-forms quicker.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:slag_coat', name: 'Slag Coat',
              trigger: { on: 'lowHp', pct: 0.45 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 500,
            },
          },
        ],
      },
      {
        note: 'You wear the forge. It sets at half blood, holds longest, and a coat of armor always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:slag_coat', name: 'Slag Coat',
              trigger: { on: 'lowHp', pct: 0.5 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 440,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  {
    id: 'ground_true',
    skill: 'smithing',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Ground True',
    desc: 'Every edge you swing, you ground yourself. Crits come oftener and your arts return sooner.',
    color: '#e2e6ec',
    effects: [
      { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
      { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
    ],
    ranks: [
      {
        note: 'The bevel is truer. More crit, arts sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 7 } },
        ],
      },
      {
        note: 'You could shave with a plough blade you sharpened. More crit yet, arts sooner still.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
        ],
      },
      {
        note: 'You made the steel and know its every art. Most crit, soonest arts, schools two wiser.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
          { kind: 'perk', perk: 'warSchooling', magnitude: 2 },
        ],
      },
    ],
  },
  {
    id: 'anvil_chorus',
    skill: 'smithing',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Anvil Chorus',
    desc: 'Where the seam is open the hammer falls through. Blows on sundered foes may ring out wide.',
    color: '#c7d0dc',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:anvil_chorus', name: 'Anvil Chorus',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
          action: { do: 'nova', damage: 12, radius: 2.5 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The ring carries harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_chorus', name: 'Anvil Chorus',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
              action: { do: 'nova', damage: 14, radius: 2.5 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Harder still, and the anvil rests less between chords.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_chorus', name: 'Anvil Chorus',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.25 },
              action: { do: 'nova', damage: 16, radius: 2.5 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'The whole yard hears it. Oftener, hardest, and the ring reaches wider.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:anvil_chorus', name: 'Anvil Chorus',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'nova', damage: 18, radius: 3 },
              icd: 180,
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------- 80: the capstone
  {
    id: 'working_orange',
    skill: 'smithing',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Forge Goes With You',
    desc: 'The metal never fully cools, and neither do you. White Heat seats with any weapon.',
    color: '#f0a050',
    effects: [
      { kind: 'art', ability: 'white_heat' },
      { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
      { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
    ],
    ranks: [
      {
        note: 'The heat comes back sooner. Arts return quicker.',
        effects: [
          { kind: 'art', ability: 'white_heat' },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 8 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'You work at a temper other hands could not stand near. Quicker arts, more mending.',
        effects: [
          { kind: 'art', ability: 'white_heat' },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
        ],
      },
      {
        note: 'The master at the forge. Quickest arts, most mending, and the frame to carry the heat.',
        effects: [
          { kind: 'art', ability: 'white_heat' },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 3 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, smithing's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const SMITHING_LICENSES: CallingLicense[] = [
  // The hammer hand opens the seam.
  { calling: 'hammer_hand', status: 'sunder', via: 'lay:status' },
  // The quench-master reads cold steel.
  { calling: 'cold_shut', status: 'chill', via: 'read:hitState' },
  // The hammer's beat quickens the hand.
  { calling: 'forge_tempo', status: 'quicken', via: 'lay:boon' },
  // The rivet counter reads the open seam.
  { calling: 'rivet_counter', status: 'sunder', via: 'read:vsState' },
  // Heat laid is heat used.
  { calling: 'emberstone_heart', status: 'burn', via: 'read:stateApplied' },
  // Hands that never cool.
  { calling: 'forgeheat', status: 'burn', via: 'lay:status' },
  // The slag sets on the skin.
  { calling: 'slag_coat', status: 'stonehide', via: 'lay:boon' },
  // The anvil rings through the sundered seam: the pair closes.
  { calling: 'anvil_chorus', status: 'sunder', via: 'read:hitState' },
];

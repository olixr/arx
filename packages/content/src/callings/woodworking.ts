/**
 * THE FILLED HALL — woodworking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE ARC — the bowyer and the joiner write it in grain, glue, and yew:
 *  5..15   three clean identities: the fletcher (bow damage), the whittler
 *          at the drawknife (craft speed), the joiner's square (build
 *          speed, outward to construction).
 *  20..50  the verbs: clean grain (founding, materials saved), heartwood
 *          shafts (bleed LAID), the light stave (snap shot, walking draw),
 *          the ironwood boss (stonehide on a block), wedge and mallet
 *          (sunder READ, stagger LAID), the living stave (mend on a cast), the
 *          grain reader (bleed READ: the ladder's own pair closes).
 *  55..75  the outward seats and the hinges: the long haft (polearm reach),
 *          master grain (founding, the bench flies), tillered true (bow in hand),
 *          the charcoal burner (burn READ: the arx hand's page), the yard
 *          of thunder (the signature nova).
 *  80      THE MASTER'S LICENSE: Windsong, the Bowyer's House's own note.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const WOODWORKING_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------------ 5
  {
    id: 'fletchers_thumb',
    skill: 'woodworking',
    unlockLevel: 5,
    focusCost: 1,
    name: "Fletcher's Thumb",
    desc: 'You fletch every shaft you loose, and they fly straight. Bow damage climbs.',
    color: '#b08050',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 6 } }],
    ranks: [
      {
        note: 'The vanes sit truer: more bow damage.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } }],
      },
      {
        note: 'Every shaft spined to its bow: more bow damage.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } }],
      },
      {
        note: 'The nock finds the string blind: bow damage and a whisper of crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 10
  {
    id: 'drawknife_habit',
    skill: 'woodworking',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Drawknife Habit',
    desc: 'Straddle the shaving horse and pull the blade toward you. You work wood faster.',
    color: '#9a8c78',
    effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.92 }],
    ranks: [
      {
        note: 'Longer shavings, fewer strokes: the bench moves quicker.',
        effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.9 }],
      },
      {
        note: 'You rough out a stave without measuring twice: faster work still.',
        effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.88 }],
      },
      {
        note: 'The drawknife is a habit now: wood leaves the bench faster still.',
        effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.86 }],
      },
    ],
  },
  // ------------------------------------------------------------ 15
  {
    id: 'joiners_square',
    skill: 'woodworking',
    unlockLevel: 15,
    focusCost: 1,
    name: "Joiner's Square",
    desc: 'True corners, tight tenons, no second fitting. You raise buildings faster.',
    color: '#c89a4a',
    effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.9 }],
    ranks: [
      {
        note: 'The frame goes up quicker.',
        effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.86 }],
      },
      {
        note: 'Every joint is cut once and cut right: faster building.',
        effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.82 }],
      },
      {
        note: 'You raise a frame before the mortar sets, and build as three levels wiser.',
        effects: [
          { kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.78 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'construction', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 20 (founding)
  {
    id: 'clean_grain',
    skill: 'woodworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Clean Grain',
    desc: 'The wood offers its spare. Materials are sometimes saved.',
    color: '#a4744b',
    effects: [{ kind: 'materialSave', skill: 'woodworking', chance: 0.08 }],
    ranks: [
      {
        note: 'You read the run of the grain: materials saved oftener.',
        effects: [{ kind: 'materialSave', skill: 'woodworking', chance: 0.11 }],
      },
      {
        note: 'No knot surprises you: materials saved oftener still.',
        effects: [{ kind: 'materialSave', skill: 'woodworking', chance: 0.14 }],
      },
      {
        note: 'The offcuts teach: more saved, and you work wood as three levels wiser.',
        effects: [
          { kind: 'materialSave', skill: 'woodworking', chance: 0.16 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'woodworking', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 25
  {
    id: 'heartwood_shafts',
    skill: 'woodworking',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Heartwood Shafts',
    desc: 'You cut shafts from the heart of the log and the splinters stay in. Blows sometimes bleed.',
    color: '#8a4a30',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:heartwood_shafts', name: 'Heartwood Shafts',
          trigger: { on: 'hit', chance: 0.15 },
          action: { do: 'status', status: 'bleed', power: 2, ticks: 100 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'The splinter sits longer: the bleed lasts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:heartwood_shafts', name: 'Heartwood Shafts',
              trigger: { on: 'hit', chance: 0.15 },
              action: { do: 'status', status: 'bleed', power: 2, ticks: 120 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'Barbed heartwood: the bleed bites deeper and lands oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:heartwood_shafts', name: 'Heartwood Shafts',
              trigger: { on: 'hit', chance: 0.18 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'Every shaft is heartwood: the bleed lands oftener, and you crit a whisper more.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:heartwood_shafts', name: 'Heartwood Shafts',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 100,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 30
  {
    id: 'light_stave',
    skill: 'woodworking',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Light Stave',
    desc: 'You tiller a limb until it comes to hand like a reed. Snap shots hit harder.',
    color: '#a88a5a',
    effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.1 }],
    ranks: [
      {
        note: 'The stave springs quicker: harder snap shots.',
        effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.13 }],
      },
      {
        note: 'Willow limbs forgive the hurried draw: harder snap shots.',
        effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.16 }],
      },
      {
        note: 'The lightest bow you ever bent: harder snap shots, and the drawn walk quickens.',
        effects: [
          { kind: 'perk', perk: 'snapShotMult', magnitude: 1.2 },
          { kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.65 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 35
  {
    id: 'ironwood_boss',
    skill: 'woodworking',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Ironwood Boss',
    desc: 'Oak boards under an ironwood boss. A turned blow coats you in stonehide.',
    color: '#5a4a3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:ironwood_boss', name: 'Ironwood Boss',
          trigger: { on: 'block' },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The coats hold longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironwood_boss', name: 'Ironwood Boss',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The boss answers sooner and the stone stays.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironwood_boss', name: 'Ironwood Boss',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'Ironwood through and through: stonehide longer and sooner, and the boards armor you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:ironwood_boss', name: 'Ironwood Boss',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 180 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 40
  {
    id: 'wedge_and_mallet',
    skill: 'woodworking',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Wedge and Mallet',
    desc: 'Find the split, set the wedge, swing. Striking a sundered foe can stagger it.',
    color: '#6b4a26',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:wedge_and_mallet', name: 'Wedge and Mallet',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.35 },
          action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
          icd: 140,
        },
      },
    ],
    ranks: [
      {
        note: 'The wedge bites oftener into a sundered guard.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wedge_and_mallet', name: 'Wedge and Mallet',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.4 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 12 },
              icd: 140,
            },
          },
        ],
      },
      {
        note: 'The mallet comes round sooner and the split runs longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wedge_and_mallet', name: 'Wedge and Mallet',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.45 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'You split what is already cracked: staggers oftener, and sundered foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:wedge_and_mallet', name: 'Wedge and Mallet',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.5 },
              action: { do: 'status', status: 'stagger', power: 0, ticks: 14 },
              icd: 120,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 45
  {
    id: 'living_stave',
    skill: 'woodworking',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Living Stave',
    desc: 'You carve staves that remember the living tree. Casting an art seals your wounds with sap.',
    color: '#8a9455',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:living_stave', name: 'Living Stave',
          trigger: { on: 'cast' },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 60 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The sap runs thicker: more healed each second.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:living_stave', name: 'Living Stave',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 60 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The mending lasts longer and returns sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:living_stave', name: 'Living Stave',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'Spring in the stave: the strongest sap, longest, soonest, and your regen climbs.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:living_stave', name: 'Living Stave',
              trigger: { on: 'cast' },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 80 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 50
  {
    id: 'grain_reader',
    skill: 'woodworking',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Grain Reader',
    desc: 'You read a wound the way you read grain. Striking a bleeding foe drives a splinter deep.',
    color: '#b8843c',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:grain_reader', name: 'Grain Reader',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
          action: { do: 'bolt', damage: 14 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The splinter drives deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grain_reader', name: 'Grain Reader',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'bolt', damage: 17 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'You find the wound oftener and the splinter drives deeper still.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grain_reader', name: 'Grain Reader',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.35 },
              action: { do: 'bolt', damage: 20 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The deepest splinter, and every bleeding foe takes more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:grain_reader', name: 'Grain Reader',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.35 },
              action: { do: 'bolt', damage: 22 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 55
  {
    id: 'long_haft',
    skill: 'woodworking',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Long Haft',
    desc: 'Ash hafts, straight and long, drawn onto the head without a shim. Polearms reach farther.',
    color: '#9a7a50',
    effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.25 }],
    ranks: [
      {
        note: 'Another span of seasoned ash: polearms reach farther.',
        effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.3 }],
      },
      {
        note: 'The longest ash you ever seasoned: polearms reach farther still.',
        effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.35 }],
      },
      {
        note: 'Haft and head balanced as one: farthest reach, and polearms hit harder.',
        effects: [
          { kind: 'perk', perk: 'poleReach', magnitude: 0.4 },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 60 (founding)
  {
    id: 'master_grain',
    skill: 'woodworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Master Grain',
    desc: 'Your hands know the next cut before you do. You work wood faster.',
    color: '#7d5a36',
    effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.85 }],
    ranks: [
      {
        note: 'The next cut is already made in your head: faster still.',
        effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.81 }],
      },
      {
        note: 'The bench flies.',
        effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.78 }],
      },
      {
        note: 'The master\'s hand: fastest woodwork, and the same hand raises buildings quicker.',
        effects: [
          { kind: 'craftSpeed', skill: 'woodworking', mult: 0.75 },
          { kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.9 },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 65
  {
    id: 'tillered_true',
    skill: 'woodworking',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Tillered True',
    desc: 'You tillered this bow and it bends to your hand. Bows in hand crit oftener, hit harder.',
    color: '#7d4436',
    effects: [
      { kind: 'when', cond: { when: 'wielding', style: 'archery' }, grant: { name: 'Tillered True', critPct: 3, dmgMult: 1.04 } },
    ],
    ranks: [
      {
        note: 'The tiller runs even limb to limb: more crit, more damage with a bow in hand.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'archery' }, grant: { name: 'Tillered True', critPct: 4, dmgMult: 1.05 } },
        ],
      },
      {
        note: 'You know its cast before the loose: more crit still.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'archery' }, grant: { name: 'Tillered True', critPct: 5, dmgMult: 1.06 } },
        ],
      },
      {
        note: 'Bow and hand are one work: most crit and damage, and the string comes back quicker.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wielding', style: 'archery' },
            grant: { name: 'Tillered True', critPct: 6, dmgMult: 1.06, attackSpeedMult: 1.04 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 70
  {
    id: 'charcoal_burner',
    skill: 'woodworking',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Charcoal Burner',
    desc: 'You tended the clamp all night and know what burns. Burning foes take more, and stoke you.',
    color: '#b86a3a',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:charcoal_burner', name: 'Charcoal Burner',
          trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
          action: { do: 'surge', stat: 'damage', pct: 8, ticks: 60 },
          icd: 220,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'Dry from green at a glance: burning foes take more, and the stoke burns brighter.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:charcoal_burner', name: 'Charcoal Burner',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'surge', stat: 'damage', pct: 9, ticks: 70 },
              icd: 220,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'You feed the flame where it is thinnest: more still, and the stoke lingers.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:charcoal_burner', name: 'Charcoal Burner',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'surge', stat: 'damage', pct: 10, ticks: 70 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Most damage to burning foes, and the stoke drives your blows hardest.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:charcoal_burner', name: 'Charcoal Burner',
              trigger: { on: 'hitState', status: 'burn', chance: 0.3 },
              action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
              icd: 200,
              element: 'ember',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 75
  {
    id: 'yard_of_thunder',
    skill: 'woodworking',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Yard of Thunder',
    desc: 'Six blows loosed, then a crack like a yew stave breaking. Every sixth strike bursts.',
    color: '#8a5c30',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:yard_of_thunder', name: 'Yard of Thunder',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'nova', damage: 14, radius: 2.4 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The crack lands harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:yard_of_thunder', name: 'Yard of Thunder',
              trigger: { on: 'stacks', per: 'hit', count: 6 },
              action: { do: 'nova', damage: 17, radius: 2.4 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'The stave breaks on the fifth blow, and harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:yard_of_thunder', name: 'Yard of Thunder',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'nova', damage: 20, radius: 2.4 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'A yard of bent thunder: the widest, hardest crack, and a whisper more crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:yard_of_thunder', name: 'Yard of Thunder',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'nova', damage: 22, radius: 2.6 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ 80 (capstone)
  {
    id: 'the_singing_yew',
    skill: 'woodworking',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Singing Yew',
    desc: 'You drilled the song holes at the Bowyer\'s House. Windsong is yours, and bows hit harder.',
    color: '#8ab4c8',
    effects: [
      { kind: 'art', ability: 'windsong' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 10 } },
    ],
    ranks: [
      {
        note: 'The note carries: more bow damage.',
        effects: [
          { kind: 'art', ability: 'windsong' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 12 } },
        ],
      },
      {
        note: 'The song holes are tuned by ear now: more bow damage.',
        effects: [
          { kind: 'art', ability: 'windsong' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 14 } },
        ],
      },
      {
        note: 'The bow you will be buried with: most bow damage, and your arts return sooner.',
        effects: [
          { kind: 'art', ability: 'windsong' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 16 } },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, woodworking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const WOODWORKING_LICENSES: CallingLicense[] = [
  { calling: 'heartwood_shafts', status: 'bleed', via: 'lay:status' },
  { calling: 'ironwood_boss', status: 'stonehide', via: 'lay:boon' },
  { calling: 'wedge_and_mallet', status: 'sunder', via: 'read:hitState' },
  { calling: 'wedge_and_mallet', status: 'sunder', via: 'read:vsState' },
  { calling: 'wedge_and_mallet', status: 'stagger', via: 'lay:status' },
  { calling: 'living_stave', status: 'mend', via: 'lay:boon' },
  { calling: 'grain_reader', status: 'bleed', via: 'read:hitState' },
  { calling: 'grain_reader', status: 'bleed', via: 'read:vsState' },
  { calling: 'charcoal_burner', status: 'burn', via: 'read:vsState' },
  { calling: 'charcoal_burner', status: 'burn', via: 'read:hitState' },
];

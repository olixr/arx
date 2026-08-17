/**
 * THE FILLED HALL — polearm's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE LONG STEEL's arc: the point (5..20, reach and the planted
 * stance), the verbs (25..50: the hook that pins, the cold ground the
 * point reads, the runnel that bleeds, the boar spear's crossbar, the
 * quickened second point, the knight's harness), the outward hall
 * (55..75: the seam any smith opens, the war grip, the gatewarden's
 * stand, the yard drillmaster, the turning haft), and the crown at 80:
 * THE SUNDERING ROAD, the school's own crown licensed ten levels early.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const POLEARM_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5: the first lesson
  {
    id: 'point_foremost',
    skill: 'polearm',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Point Foremost',
    desc: 'Everything begins out of reach. Polearm strikes and arts hit harder.',
    color: '#c8d4e0',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 7 } }],
    ranks: [
      {
        note: 'The point lands heavier.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 8 } }],
      },
      {
        note: 'The line is drawn straighter still.',
        effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 10 } }],
      },
      {
        note: 'The point finds the seam on its own; a crit chance joins the weight.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 10: the planted stance
  {
    id: 'planted_ferrule',
    skill: 'polearm',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Planted Ferrule',
    desc: 'The ferrule bites the ground and the ground bites back. Standing still, you take less.',
    color: '#8b7355',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 4 }],
    ranks: [
      {
        note: 'The plant sits deeper in the ground.',
        effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 5 }],
      },
      {
        note: 'The wall grows thicker.',
        effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }],
      },
      {
        note: 'The braced point drives harder: standing still, your blows land heavier.',
        effects: [
          { kind: 'perk', perk: 'stillArmor', magnitude: 8 },
          { kind: 'when', cond: { when: 'still' }, grant: { name: 'Braced Point', dmgMult: 1.06 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 15: the march
  {
    id: 'walking_staff',
    skill: 'polearm',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Walking Staff',
    desc: 'The haft is a road companion before it is a weapon. Polearm in hand, you walk quicker.',
    color: '#a08a68',
    effects: [
      { kind: 'when', cond: { when: 'wielding', style: 'polearm' }, grant: { name: 'Long Stride', speedMult: 1.05 } },
    ],
    ranks: [
      {
        note: 'The stride lengthens.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'polearm' }, grant: { name: 'Long Stride', speedMult: 1.06 } },
        ],
      },
      {
        note: 'The road passes under the ferrule quicker still.',
        effects: [
          { kind: 'when', cond: { when: 'wielding', style: 'polearm' }, grant: { name: 'Long Stride', speedMult: 1.08 } },
        ],
      },
      {
        note: 'The march restores you: the haft in hand mends a little as you walk.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'wielding', style: 'polearm' },
            grant: { name: 'Long Stride', speedMult: 1.08, regenPer4s: 1 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 20: the founding reach
  {
    id: 'longarm',
    skill: 'polearm',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Longarm',
    desc: 'The point ends the argument a pace sooner. Polearm reach grows.',
    color: '#9a8560',
    effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.35 }],
    ranks: [
      {
        note: 'The reach lengthens.',
        effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.45 }],
      },
      {
        note: 'The argument ends from farther off.',
        effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.55 }],
      },
      {
        note: 'The far point reads the seam: reach at its fullest, and a crit chance beside it.',
        effects: [
          { kind: 'perk', perk: 'poleReach', magnitude: 0.7 },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 25: the hook that pins
  {
    id: 'hook_behind_the_knee',
    skill: 'polearm',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Hook Behind the Knee',
    desc: 'The beak takes the leg and the fight stops walking. Blows may pin a foe in place.',
    color: '#7d8696',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:hook_behind_the_knee',
          name: 'Pinned',
          trigger: { on: 'hit', chance: 0.18 },
          action: { do: 'status', status: 'root', power: 0, ticks: 30 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The hook finds the leg oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hook_behind_the_knee',
              name: 'Pinned',
              trigger: { on: 'hit', chance: 0.22 },
              action: { do: 'status', status: 'root', power: 0, ticks: 30 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The pin holds a breath longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hook_behind_the_knee',
              name: 'Pinned',
              trigger: { on: 'hit', chance: 0.26 },
              action: { do: 'status', status: 'root', power: 0, ticks: 36 },
              icd: 180,
            },
          },
        ],
      },
      {
        note: 'A pinned body cannot turn the point: rooted foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:hook_behind_the_knee',
              name: 'Pinned',
              trigger: { on: 'hit', chance: 0.3 },
              action: { do: 'status', status: 'root', power: 0, ticks: 36 },
              icd: 160,
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'root', pct: 10 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 30: the point reads the cold
  {
    id: 'cold_ground',
    skill: 'polearm',
    unlockLevel: 30,
    focusCost: 1,
    name: 'The Cold Ground',
    desc: 'A chilled foe stands where the point wants it. Blows on the chilled may drive a bolt home.',
    color: '#9fb8cc',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:cold_ground',
          name: 'Cold Ground',
          trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
          action: { do: 'bolt', damage: 14 },
          icd: 180,
          element: 'frost',
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
              kind: 'proc',
              id: 'calling:cold_ground',
              name: 'Cold Ground',
              trigger: { on: 'hitState', status: 'chill', chance: 0.35 },
              action: { do: 'bolt', damage: 17 },
              icd: 180,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The point reads the cold oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cold_ground',
              name: 'Cold Ground',
              trigger: { on: 'hitState', status: 'chill', chance: 0.4 },
              action: { do: 'bolt', damage: 20 },
              icd: 180,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The cold ground answers sooner and harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:cold_ground',
              name: 'Cold Ground',
              trigger: { on: 'hitState', status: 'chill', chance: 0.45 },
              action: { do: 'bolt', damage: 22 },
              icd: 160,
              element: 'frost',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 35: the runnel bleeds
  {
    id: 'runnel_point',
    skill: 'polearm',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Runnel Point',
    desc: 'The groove down the head lets the wound run. Every fourth blow opens a bleed.',
    color: '#a8483a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:runnel_point',
          name: 'Runnel',
          trigger: { on: 'cadence', every: 4 },
          action: { do: 'status', status: 'bleed', power: 3, ticks: 100 },
          icd: 60,
          element: 'blood',
        },
      },
    ],
    ranks: [
      {
        note: 'The wound runs a full breath longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runnel_point',
              name: 'Runnel',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 3, ticks: 120 },
              icd: 60,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The groove is cut deeper; the bleed bites harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runnel_point',
              name: 'Runnel',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 4, ticks: 120 },
              icd: 60,
              element: 'blood',
            },
          },
        ],
      },
      {
        note: 'The point follows the blood: bleeding foes take more from you.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:runnel_point',
              name: 'Runnel',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'bleed', power: 4, ticks: 120 },
              icd: 60,
              element: 'blood',
            },
          },
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 40: the boar spear's crossbar
  {
    id: 'boar_spear_crossbar',
    skill: 'polearm',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Boar Spear Crossbar',
    desc: 'The bar behind the head stops the charge on the point. Thorns, and armor when outnumbered.',
    color: '#74604c',
    effects: [
      { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Crossbar Set', armor: 4 } },
    ],
    ranks: [
      {
        note: 'The bar is set wider; more of the charge stops on it.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 5 } },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Crossbar Set', armor: 5 } },
        ],
      },
      {
        note: 'The stand holds against a wider ring.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 6 } },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Crossbar Set', armor: 6 } },
        ],
      },
      {
        note: 'The crossbar throws the charge back: outnumbered, a share of every bite returns.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 8 } },
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Crossbar Set', armor: 8, reflectFrac: 0.05 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 45: the second point
  {
    id: 'second_point',
    skill: 'polearm',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Second Point',
    desc: 'The line advances over the fallen. A kill quickens your hand for a while.',
    color: '#d8c48a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:second_point',
          name: 'Second Point',
          trigger: { on: 'kill' },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 80 },
          icd: 100,
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
              kind: 'proc',
              id: 'calling:second_point',
              name: 'Second Point',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The hand stays quick from one body to the next.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:second_point',
              name: 'Second Point',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 80,
            },
          },
        ],
      },
      {
        note: 'The advance carries you: a kill also lends your feet a burst of haste.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:second_point',
              name: 'Second Point',
              trigger: { on: 'kill' },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 80,
            },
          },
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 50: the knight's harness
  {
    id: 'knights_harness',
    skill: 'polearm',
    unlockLevel: 50,
    focusCost: 2,
    name: "Knight's Harness",
    desc: 'The lance was always worn with iron. Every plate piece worn adds armor and life.',
    color: '#a3a9b5',
    effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1, maxHp: 3 }],
    ranks: [
      {
        note: 'The harness sits closer; each piece carries more life.',
        effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 1, maxHp: 4 }],
      },
      {
        note: 'The plates are doubled at the seams.',
        effects: [{ kind: 'perPiece', armorClass: 'plate', armor: 2, maxHp: 4 }],
      },
      {
        note: 'The full harness: each piece stronger, and a knight\'s constitution beneath it.',
        effects: [
          { kind: 'perPiece', armorClass: 'plate', armor: 2, maxHp: 5 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 55: the seam any smith opens
  {
    id: 'seam_driver',
    skill: 'polearm',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Seam Driver',
    desc: 'A sundered guard is a door. Sundered foes take more, and opening one surges your damage.',
    color: '#b8b2a6',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:seam_driver',
          name: 'Seam Found',
          trigger: { on: 'stateApplied', status: 'sunder' },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 100 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The point knows the seam better.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:seam_driver',
              name: 'Seam Found',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'surge', stat: 'damage', pct: 14, ticks: 100 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'The surge runs longer once the door is open.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:seam_driver',
              name: 'Seam Found',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'surge', stat: 'damage', pct: 16, ticks: 120 },
              icd: 280,
            },
          },
        ],
      },
      {
        note: 'Every door opens onto the next: the seam surge at its fullest, and it rests less.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:seam_driver',
              name: 'Seam Found',
              trigger: { on: 'stateApplied', status: 'sunder' },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 120 },
              icd: 240,
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ 60: the founding war grip
  {
    id: 'impaler',
    skill: 'polearm',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Impaler',
    desc: 'Both hands answer as one. The war grip drives the point deeper.',
    color: '#7a5a48',
    effects: [{ kind: 'perk', perk: 'warGripBonus', magnitude: 0.1 }],
    ranks: [
      {
        note: 'The second hand adds its weight.',
        effects: [{ kind: 'perk', perk: 'warGripBonus', magnitude: 0.13 }],
      },
      {
        note: 'The grip finds the seam: a crit chance rides the war grip.',
        effects: [
          { kind: 'perk', perk: 'warGripBonus', magnitude: 0.16 },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
      {
        note: 'The impaler at full weight: the war grip at its deepest, the crit chance sharper.',
        effects: [
          { kind: 'perk', perk: 'warGripBonus', magnitude: 0.2 },
          { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 65: the gatewarden's stand
  {
    id: 'gatewardens_stand',
    skill: 'polearm',
    unlockLevel: 65,
    focusCost: 2,
    name: "Gatewarden's Stand",
    desc: 'The halberd at the gate never steps back. Armor, and stone on your hide when pressed low.',
    color: '#6f7d8c',
    effects: [
      { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:gatewardens_stand',
          name: 'Gate Held',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 150 },
          icd: 600,
        },
      },
    ],
    ranks: [
      {
        note: 'The stand is set in heavier iron.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:gatewardens_stand',
              name: 'Gate Held',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 150 },
              icd: 600,
            },
          },
        ],
      },
      {
        note: 'The stone holds longer, and the gate is held again sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:gatewardens_stand',
              name: 'Gate Held',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 500,
            },
          },
        ],
      },
      {
        note: 'Backs to the gate: pressed low, your blows land heavier until the line is won.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:gatewardens_stand',
              name: 'Gate Held',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 200 },
              icd: 440,
            },
          },
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.4 }, grant: { name: 'Backs to the Gate', dmgMult: 1.08 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 70: the yard drillmaster
  {
    id: 'yard_drillmaster',
    skill: 'polearm',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Yard Drillmaster',
    desc: 'Whoever drills the pike yard has drilled every yard. All five weapon schools count higher.',
    color: '#b0885a',
    effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 3 }],
    ranks: [
      {
        note: 'The yard learns another lesson.',
        effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 4 }],
      },
      {
        note: 'The drill runs in every hand.',
        effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 5 }],
      },
      {
        note: 'The master\'s cadence: every school at its highest, and every art rests a little less.',
        effects: [
          { kind: 'perk', perk: 'warSchooling', magnitude: 6 },
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 75: the turning haft
  {
    id: 'turning_haft',
    skill: 'polearm',
    unlockLevel: 75,
    focusCost: 2,
    name: 'The Turning Haft',
    desc: 'Step inside the point and meet the whole haft. Being struck may spin it into a wheel.',
    color: '#5c6b7a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:turning_haft',
          name: 'Moulinet',
          trigger: { on: 'hurt', chance: 0.2 },
          action: { do: 'nova', damage: 12, radius: 2.2 },
          icd: 200,
        },
      },
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ring of Steel', critPct: 4 } },
    ],
    ranks: [
      {
        note: 'The wheel bites deeper.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:turning_haft',
              name: 'Moulinet',
              trigger: { on: 'hurt', chance: 0.2 },
              action: { do: 'nova', damage: 14, radius: 2.2 },
              icd: 200,
            },
          },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ring of Steel', critPct: 4 } },
        ],
      },
      {
        note: 'The wheel spins wider, and turns oftener when struck.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:turning_haft',
              name: 'Moulinet',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'nova', damage: 16, radius: 2.4 },
              icd: 180,
            },
          },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ring of Steel', critPct: 5 } },
        ],
      },
      {
        note: 'The full wheel: heavier, sooner, and the ring of steel finds the seam oftener.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:turning_haft',
              name: 'Moulinet',
              trigger: { on: 'hurt', chance: 0.25 },
              action: { do: 'nova', damage: 18, radius: 2.4 },
              icd: 160,
            },
          },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Ring of Steel', critPct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------ 80: THE MASTER'S LICENSE
  {
    id: 'sundering_road',
    skill: 'polearm',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Sundering Road',
    desc: "The school's crown, lent ten levels early. Seat the Sundering Lance and hit harder.",
    color: '#dfd6c0',
    effects: [
      { kind: 'art', ability: 'sundering_lance' },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The road runs heavier.',
        effects: [
          { kind: 'art', ability: 'sundering_lance' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 10 } },
        ],
      },
      {
        note: 'The crown sits closer; every polearm blow carries the gallop.',
        effects: [
          { kind: 'art', ability: 'sundering_lance' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
        ],
      },
      {
        note: 'The road at full gallop: the crown, the heaviest point, and a crit chance to close it.',
        effects: [
          { kind: 'art', ability: 'sundering_lance' },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 14 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, polearm's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / vsState) is
 * licensed here by a conscious row, never by authoring the def alone.
 */
export const POLEARM_LICENSES: CallingLicense[] = [
  { calling: 'hook_behind_the_knee', status: 'root', via: 'lay:status' },
  { calling: 'hook_behind_the_knee', status: 'root', via: 'read:vsState' },
  { calling: 'cold_ground', status: 'chill', via: 'read:hitState' },
  { calling: 'runnel_point', status: 'bleed', via: 'lay:status' },
  { calling: 'runnel_point', status: 'bleed', via: 'read:vsState' },
  { calling: 'second_point', status: 'quicken', via: 'lay:boon' },
  { calling: 'seam_driver', status: 'sunder', via: 'read:vsState' },
  { calling: 'seam_driver', status: 'sunder', via: 'read:stateApplied' },
  { calling: 'gatewardens_stand', status: 'stonehide', via: 'lay:boon' },
];

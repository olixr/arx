/**
 * THE FILLED HALL — herbalism's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * BREWS AND BITTER BLOOD's arc: the physic garden (a leaf chewed when
 * hurt, the steady alembic, the thorn that pricks back), the bitter
 * years (poison and burning grip weakly, the adder's oil on the edge,
 * the salve up the sleeve), the poisoner's bench (the second dose into
 * a poisoned body, nothing wasted, firepitch on the fifth stroke, the
 * salved hand striking sure), the long steeping (bad blood answering
 * every venom laid, tonics that outlast the fight, the poisoner's edge
 * that takes more from the poisoned and the burning, ironroot in the
 * veins, leadfoot on the sixth blow), and the master's seat: the
 * garden nobody plants twice, whose Nightshade Kiss the herbalist
 * knows better than any knife hand.
 * Pages: LAYS mend / venom / burn / chill; READS venom (hitState,
 * stateApplied, vsState), burn (vsState), mend (stateRiding).
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const HERBALISM_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ 5: the physic garden
  {
    id: 'sagewort_habit',
    skill: 'herbalism',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Sagewort Habit',
    desc: 'A bitter leaf kept under the tongue. When you are hurt, you sometimes start mending.',
    color: '#8fb083',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:sagewort_habit',
          name: 'Sagewort',
          trigger: { on: 'hurt', chance: 0.25 },
          action: { do: 'boon', status: 'mend', power: 2, ticks: 60 },
          icd: 400,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'A fresher leaf: one hurt in three starts you mending.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sagewort_habit',
              name: 'Sagewort',
              trigger: { on: 'hurt', chance: 0.33 },
              action: { do: 'boon', status: 'mend', power: 2, ticks: 60 },
              icd: 400,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The leaf lasts: mending 4 seconds long, and the habit rests only 16 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sagewort_habit',
              name: 'Sagewort',
              trigger: { on: 'hurt', chance: 0.33 },
              action: { do: 'boon', status: 'mend', power: 2, ticks: 80 },
              icd: 320,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'Dried sagewort, two herbs strong: mends 3 a second for 4 seconds, resting 15.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sagewort_habit',
              name: 'Sagewort',
              trigger: { on: 'hurt', chance: 0.33 },
              action: { do: 'boon', status: 'mend', power: 3, ticks: 80 },
              icd: 300,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 10: the alembic
  {
    id: 'steady_alembic',
    skill: 'herbalism',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Steady Alembic',
    desc: 'You know the flame and the drip by ear. Brews come off the bench sooner.',
    color: '#69a869',
    effects: [{ kind: 'craftSpeed', skill: 'herbalism', mult: 0.9 }],
    ranks: [
      { note: 'The drip finds its rhythm: brewing 15% faster.', effects: [{ kind: 'craftSpeed', skill: 'herbalism', mult: 0.85 }] },
      { note: 'The flame never wanders: brewing 20% faster.', effects: [{ kind: 'craftSpeed', skill: 'herbalism', mult: 0.8 }] },
      {
        note: 'Bench and hand are one thing: brewing 22% faster, +3 herbalism.',
        effects: [
          { kind: 'craftSpeed', skill: 'herbalism', mult: 0.78 },
          { kind: 'gear', effect: { kind: 'skill', skill: 'herbalism', amount: 3 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 15: the thorn
  {
    id: 'duskthorn_skin',
    skill: 'herbalism',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Duskthorn Skin',
    desc: 'Duskthorn is picked bare handed or not at all. Whoever lays hands on you gets pricked.',
    color: '#5e4a78',
    effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 4 } }],
    ranks: [
      { note: 'The thorns sit deeper: 5 thorns.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 5 } }] },
      { note: 'A hedge of it under the skin: 6 thorns.', effects: [{ kind: 'gear', effect: { kind: 'thorns', amount: 6 } }] },
      {
        note: 'The thorn keeps its venom: 8 thorns, and a hand that wounds you may be poisoned for it.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:duskthorn_skin',
              name: 'Duskthorn',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 80 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 20: founding
  {
    id: 'bitter_blood',
    skill: 'herbalism',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bitter Blood',
    desc: 'Years of tasting your own brews. Poison and burning grip you weakly.',
    color: '#a0c050',
    effects: [{ kind: 'perk', perk: 'dotResistMult', magnitude: 0.7 }],
    ranks: [
      { note: 'The palate hardens: poison and burning tick for 60% of their bite.', effects: [{ kind: 'perk', perk: 'dotResistMult', magnitude: 0.6 }] },
      { note: 'Bitter to the marrow: poison and burning tick for half.', effects: [{ kind: 'perk', perk: 'dotResistMult', magnitude: 0.5 }] },
      {
        note: 'The Purge: when your health falls past 40%, every page riding you is stripped.',
        effects: [
          { kind: 'perk', perk: 'dotResistMult', magnitude: 0.5 },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bitter_blood',
              name: 'The Purge',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'cleanse' },
              icd: 600,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 25: the oiled edge
  {
    id: 'adderfang_edge',
    skill: 'herbalism',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Adderfang Edge',
    desc: 'You never carry a clean blade. One blow in five leaves the adder\'s venom behind.',
    color: '#9ab848',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:adderfang_edge',
          name: 'Adderfang',
          trigger: { on: 'hit', chance: 0.2 },
          action: { do: 'status', status: 'venom', power: 2, ticks: 80 },
          icd: 100,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'A thicker oil: the venom holds 4.5 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:adderfang_edge',
              name: 'Adderfang',
              trigger: { on: 'hit', chance: 0.2 },
              action: { do: 'status', status: 'venom', power: 2, ticks: 90 },
              icd: 100,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'Rendered from the sac itself: venom at power 3, one blow in four.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:adderfang_edge',
              name: 'Adderfang',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 90 },
              icd: 100,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The oil finds the soft places: venom 5 seconds long, rests 4, and +2% crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:adderfang_edge',
              name: 'Adderfang',
              trigger: { on: 'hit', chance: 0.25 },
              action: { do: 'status', status: 'venom', power: 3, ticks: 100 },
              icd: 80,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 30: the sleeve
  {
    id: 'sleeve_salve',
    skill: 'herbalism',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Salve in the Sleeve',
    desc: 'You keep one salve back. When your health falls past a third, it is already on the wound.',
    color: '#7ad0a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:sleeve_salve',
          name: 'Mending Salve',
          trigger: { on: 'lowHp', pct: 0.35 },
          action: { do: 'heal', amount: 24 },
          icd: 600,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'A fuller pot: heals 30.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sleeve_salve',
              name: 'Mending Salve',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 30 },
              icd: 600,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'Silverleaf in the mix: heals 36, and the sleeve refills in 25 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sleeve_salve',
              name: 'Silverleaf Salve',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 36 },
              icd: 500,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The salve is second nature: heals 40, and you mend +1 every 4 seconds besides.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:sleeve_salve',
              name: 'Silverleaf Salve',
              trigger: { on: 'lowHp', pct: 0.35 },
              action: { do: 'heal', amount: 40 },
              icd: 500,
              element: 'verdant',
            },
          },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 35: the second dose
  {
    id: 'second_dose',
    skill: 'herbalism',
    unlockLevel: 35,
    focusCost: 1,
    name: 'The Second Dose',
    desc: 'A poisoned body takes the next draught worse. Striking a venomed foe may drive it deep.',
    color: '#7c9e30',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:second_dose',
          name: 'Second Dose',
          trigger: { on: 'hitState', status: 'venom', chance: 0.3 },
          action: { do: 'bolt', damage: 12 },
          icd: 160,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The dose lands harder: 14 damage into a venomed body.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:second_dose',
              name: 'Second Dose',
              trigger: { on: 'hitState', status: 'venom', chance: 0.3 },
              action: { do: 'bolt', damage: 14 },
              icd: 160,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'You read the pallor: 16 damage, one venomed blow in three.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:second_dose',
              name: 'Second Dose',
              trigger: { on: 'hitState', status: 'venom', chance: 0.33 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The killing measure: 18 damage into a venomed body, two venomed blows in five.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:second_dose',
              name: 'Second Dose',
              trigger: { on: 'hitState', status: 'venom', chance: 0.4 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 40: the thrifty bench
  {
    id: 'every_drop',
    skill: 'herbalism',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Every Drop',
    desc: 'The alembic gives back what a careless hand loses. Brews sometimes cost no herbs at all.',
    color: '#b0c860',
    effects: [{ kind: 'materialSave', skill: 'herbalism', chance: 0.1 }],
    ranks: [
      { note: 'The rinse is worth keeping: 15% of brews cost nothing.', effects: [{ kind: 'materialSave', skill: 'herbalism', chance: 0.15 }] },
      { note: 'Not a leaf on the floor: 20% of brews cost nothing.', effects: [{ kind: 'materialSave', skill: 'herbalism', chance: 0.2 }] },
      {
        note: 'Nothing wasted, not even in you: 22% free brews and +2 health every 4 seconds.',
        effects: [
          { kind: 'materialSave', skill: 'herbalism', chance: 0.22 },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 45: the fire oil
  {
    id: 'firepitch_hand',
    skill: 'herbalism',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Firepitch Hand',
    desc: 'The pitch never quite washes off. Every fifth blow you land catches and burns.',
    color: '#cc7a3a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:firepitch_hand',
          name: 'Firepitch',
          trigger: { on: 'cadence', every: 5 },
          action: { do: 'status', status: 'burn', power: 2, ticks: 70 },
          icd: 120,
          element: 'ember',
        },
      },
    ],
    ranks: [
      {
        note: 'A longer burn: 4 seconds of fire.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:firepitch_hand',
              name: 'Firepitch',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 80 },
              icd: 120,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'The pitch catches sooner: every fourth blow, resting 5 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:firepitch_hand',
              name: 'Firepitch',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'burn', power: 2, ticks: 80 },
              icd: 100,
              element: 'ember',
            },
          },
        ],
      },
      {
        note: 'Wyrmtongue in the pitch: burn at power 3, and all your ember damage +6%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:firepitch_hand',
              name: 'Firepitch',
              trigger: { on: 'cadence', every: 4 },
              action: { do: 'status', status: 'burn', power: 3, ticks: 80 },
              icd: 100,
              element: 'ember',
            },
          },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'ember', pct: 6 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 50: the salved hand
  {
    id: 'salved_and_sure',
    skill: 'herbalism',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Salved and Sure',
    desc: 'A mending body does not flinch. While Mending rides you, you strike surer and harder.',
    color: '#a8c8b0',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'mend' },
        grant: { name: 'Salved and Sure', critPct: 3, dmgMult: 1.05 },
      },
    ],
    ranks: [
      {
        note: 'The steadier hand: +4% crit, +6% damage while Mending.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Salved and Sure', critPct: 4, dmgMult: 1.06 },
          },
        ],
      },
      {
        note: 'Whole in the fight: +4% crit, +8% damage while Mending.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Salved and Sure', critPct: 4, dmgMult: 1.08 },
          },
        ],
      },
      {
        note: 'The salve carries the feet too: +5% crit, +8% damage, 3% quicker while Mending.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'mend' },
            grant: { name: 'Salved and Sure', critPct: 5, dmgMult: 1.08, speedMult: 1.03 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 55: bad blood
  {
    id: 'bad_blood',
    skill: 'herbalism',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Bad Blood',
    desc: 'Watching the venom take is its own tonic. When you lay venom, your blows surge a while.',
    color: '#8aa050',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:bad_blood',
          name: 'Bad Blood',
          trigger: { on: 'stateApplied', status: 'venom' },
          action: { do: 'surge', stat: 'damage', pct: 10, ticks: 80 },
          icd: 240,
          element: 'verdant',
        },
      },
    ],
    ranks: [
      {
        note: 'The rush runs stronger: +12% damage for 4 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bad_blood',
              name: 'Bad Blood',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
              icd: 240,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The rush runs longer: +14% damage for 5 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bad_blood',
              name: 'Bad Blood',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 14, ticks: 100 },
              icd: 240,
              element: 'verdant',
            },
          },
        ],
      },
      {
        note: 'The poisoner\'s calm: +15% damage for 5 seconds, ready again in 10.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:bad_blood',
              name: 'Bad Blood',
              trigger: { on: 'stateApplied', status: 'venom' },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
              icd: 200,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 60: founding
  {
    id: 'long_brew',
    skill: 'herbalism',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Long Brew',
    desc: 'Your tonics are steeped, not stirred. They last longer in the blood.',
    color: '#6a9a4a',
    effects: [{ kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.25 }],
    ranks: [
      { note: 'Steeped overnight: tonics last 35% longer.', effects: [{ kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.35 }] },
      { note: 'Steeped a week: tonics last 45% longer.', effects: [{ kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.45 }] },
      {
        note: 'The blood remembers the brew: tonics last half again as long, and +8 max health.',
        effects: [
          { kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.5 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 65: the poisoner's edge
  {
    id: 'poisoners_edge',
    skill: 'herbalism',
    unlockLevel: 65,
    focusCost: 2,
    name: "Poisoner's Edge",
    desc: 'You know exactly where a poisoned body is weakest. Venomed foes take more from you.',
    color: '#5e7a52',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 10 } }],
    ranks: [
      { note: 'The weakness reads clearer: +12% against venomed foes.', effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 12 } }] },
      { note: 'Every symptom is a seam: +14% against venomed foes.', effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 14 } }] },
      {
        note: 'Fire and venom, the same lesson: +16% against venomed foes, +8% against burning ones.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'venom', pct: 16 } },
          { kind: 'gear', effect: { kind: 'vsState', status: 'burn', pct: 8 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 70: ironroot
  {
    id: 'ironroot_veins',
    skill: 'herbalism',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Ironroot in the Veins',
    desc: 'The draught you drink for others lives in you now. Below half health you harden and mend.',
    color: '#4f8a5a',
    effects: [
      {
        kind: 'when',
        cond: { when: 'hpBelow', frac: 0.5 },
        grant: { name: 'Ironroot', armor: 5, regenPer4s: 2 },
      },
    ],
    ranks: [
      {
        note: 'The root goes deeper: +6 armor, +3 regen below half.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.5 },
            grant: { name: 'Ironroot', armor: 6, regenPer4s: 3 },
          },
        ],
      },
      {
        note: 'Bark over the wound: +8 armor, +3 regen below half.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.5 },
            grant: { name: 'Ironroot', armor: 8, regenPer4s: 3 },
          },
        ],
      },
      {
        note: 'The tree does not fall: +8 armor, +4 regen, and 4% quicker below half.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'hpBelow', frac: 0.5 },
            grant: { name: 'Ironroot', armor: 8, regenPer4s: 4, speedMult: 1.04 },
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 75: leadfoot
  {
    id: 'leadfoot_step',
    skill: 'herbalism',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Leadfoot Oil',
    desc: 'The oil that slows a mount slows a man. Every sixth blow you land leaves a foe chilled.',
    color: '#6f5a8a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:leadfoot_step',
          name: 'Leadfoot',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
          icd: 150,
          element: 'frost',
        },
      },
    ],
    ranks: [
      {
        note: 'The oil sets faster: every fifth blow.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:leadfoot_step',
              name: 'Leadfoot',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 90 },
              icd: 150,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'The chill clings: 5 seconds slow, resting 6.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:leadfoot_step',
              name: 'Leadfoot',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 100 },
              icd: 120,
              element: 'frost',
            },
          },
        ],
      },
      {
        note: 'You know which foot to slow: every fourth blow chills, and your own step is 5% quicker.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:leadfoot_step',
              name: 'Leadfoot',
              trigger: { on: 'stacks', per: 'hit', count: 4 },
              action: { do: 'status', status: 'chill', power: 2, ticks: 100 },
              icd: 120,
              element: 'frost',
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  // ------------------------------------------------------ 80: the capstone
  {
    id: 'unplanted_garden',
    skill: 'herbalism',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Unplanted Garden',
    desc: 'You keep the garden nobody plants twice. Nightshade Kiss is yours, and your hand is truer.',
    color: '#b8c4c9',
    effects: [
      { kind: 'art', ability: 'nightshade_kiss' },
      { kind: 'gear', effect: { kind: 'crit', pct: 4 } },
    ],
    ranks: [
      {
        note: 'The steeping runs deeper: +5% crit.',
        effects: [
          { kind: 'art', ability: 'nightshade_kiss' },
          { kind: 'gear', effect: { kind: 'crit', pct: 5 } },
        ],
      },
      {
        note: 'A week in the garden: +6% crit.',
        effects: [
          { kind: 'art', ability: 'nightshade_kiss' },
          { kind: 'gear', effect: { kind: 'crit', pct: 6 } },
        ],
      },
      {
        note: 'The Gardener: +8% crit, and every art you cast sharpens your eye, +15% crit a while.',
        effects: [
          { kind: 'art', ability: 'nightshade_kiss' },
          { kind: 'gear', effect: { kind: 'crit', pct: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:unplanted_garden',
              name: 'The Gardener',
              trigger: { on: 'cast' },
              action: { do: 'surge', stat: 'crit', pct: 15, ticks: 100 },
              icd: 240,
              element: 'verdant',
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, herbalism's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / stateRiding /
 * vsState) is licensed here by a conscious row, never by authoring the
 * def alone.
 */
export const HERBALISM_LICENSES: CallingLicense[] = [
  { calling: 'sagewort_habit', status: 'mend', via: 'lay:boon' },
  { calling: 'duskthorn_skin', status: 'venom', via: 'lay:status' },
  { calling: 'adderfang_edge', status: 'venom', via: 'lay:status' },
  { calling: 'second_dose', status: 'venom', via: 'read:hitState' },
  { calling: 'firepitch_hand', status: 'burn', via: 'lay:status' },
  { calling: 'salved_and_sure', status: 'mend', via: 'read:stateRiding' },
  { calling: 'bad_blood', status: 'venom', via: 'read:stateApplied' },
  { calling: 'poisoners_edge', status: 'venom', via: 'read:vsState' },
  { calling: 'poisoners_edge', status: 'burn', via: 'read:vsState' },
  { calling: 'leadfoot_step', status: 'chill', via: 'lay:status' },
];

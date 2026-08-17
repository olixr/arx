/**
 * THE FILLED HALL — combat's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE VETERAN'S SCHOOL, as a class: the school every fighter is already
 * in. No weapon owns it, so its callings speak in feet, breath, drill
 * and the read of a guard — dust and brass, never an element. The arc:
 *   5..15   the recruit: the march, the first cut, the cold camp;
 *   20..50  the campaign: footing, the square, kill rhythm, and the
 *           veteran's two reads of a body (sunder laid and read,
 *           weaken laid);
 *   55..75  the drill sergeant: haste by cadence, the schools taught,
 *           the outward hands (bleed read, a weakened arm pressed for a
 *           ward, the three melee schools sharpened);
 *   80      the old soldier's license: The Long Fight in any hand.
 *
 * A note on the weaken hinge: PROCS NEVER BEGET PROCS, so a page a
 * calling's proc lays can never ring stateApplied. The ladder's own
 * weaken (Answered Blow) is READ at the strike instead (hitState), so
 * the pair closes on the body, not the echo.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const COMBAT_CALLINGS: CallingDef[] = [
  // ------------------------------------------------------ the recruit
  {
    id: 'muster_step',
    skill: 'combat',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Muster Step',
    desc: 'You learned to march before you learned to fight. Your feet cover ground faster.',
    color: '#c4885a',
    effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 5 } }],
    ranks: [
      { note: 'The column keeps a quicker pace.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 6 } }] },
      { note: 'The road stops arguing with your legs.', effects: [{ kind: 'gear', effect: { kind: 'speed', pct: 7 } }] },
      {
        note: 'Miles in the legs put iron in the body.',
        effects: [
          { kind: 'gear', effect: { kind: 'speed', pct: 7 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 6 } },
        ],
      },
    ],
  },
  {
    id: 'blooded',
    skill: 'combat',
    unlockLevel: 10,
    focusCost: 1,
    name: 'Blooded',
    desc: 'The first cut settles the nerves. While a fight is on, your blows land harder.',
    color: '#c4553d',
    effects: [{ kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Blooded', dmgMult: 1.06 } }],
    ranks: [
      {
        note: 'The nerves settle sooner and the hand hits harder.',
        effects: [{ kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Blooded', dmgMult: 1.07 } }],
      },
      {
        note: 'A fight is where you are most yourself.',
        effects: [{ kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Blooded', dmgMult: 1.08 } }],
      },
      {
        note: 'The blooded eye finds the seam as well as the strength.',
        effects: [{ kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Blooded', dmgMult: 1.08, critPct: 2 } }],
      },
    ],
  },
  {
    id: 'bivouac',
    skill: 'combat',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Bivouac',
    desc: 'You can sleep in your boots and wake whole. Out of the fight, wounds knit faster.',
    color: '#8a8f98',
    effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Bivouac', regenPer4s: 2 } }],
    ranks: [
      {
        note: 'The cold camp gives more back.',
        effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Bivouac', regenPer4s: 3 } }],
      },
      {
        note: 'A night under a cloak is as good as a bed.',
        effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Bivouac', regenPer4s: 4 } }],
      },
      {
        note: 'You break camp quicker than the rest.',
        effects: [{ kind: 'when', cond: { when: 'outOfCombat' }, grant: { name: 'Bivouac', regenPer4s: 4, speedMult: 1.04 } }],
      },
    ],
  },

  // ----------------------------------------------------- the campaign
  {
    id: 'war_footing',
    skill: 'combat',
    unlockLevel: 20,
    focusCost: 1,
    name: 'War Footing',
    desc: 'A soldier is hardest to hurt mid stride. Armor while you move.',
    color: '#b0623c',
    effects: [{ kind: 'perk', perk: 'marchArmor', magnitude: 5 }],
    ranks: [
      { note: 'The stride sets deeper.', effects: [{ kind: 'perk', perk: 'marchArmor', magnitude: 6 }] },
      { note: 'Blows slide off a body already moving.', effects: [{ kind: 'perk', perk: 'marchArmor', magnitude: 8 }] },
      {
        note: 'The march itself becomes armor, and quicker for it.',
        effects: [
          { kind: 'perk', perk: 'marchArmor', magnitude: 8 },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },
  {
    id: 'form_square',
    skill: 'combat',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Form Square',
    desc: 'Three on one and the drill takes over. Outnumbered, you wear the line\'s armor.',
    color: '#7a8494',
    effects: [{ kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Form Square', armor: 6 } }],
    ranks: [
      {
        note: 'The square closes tighter.',
        effects: [{ kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Form Square', armor: 8 } }],
      },
      {
        note: 'A crowd is only a wall of mistakes.',
        effects: [{ kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Form Square', armor: 10 } }],
      },
      {
        note: 'What breaks on the square breaks back a little.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Form Square', armor: 10, reflectFrac: 0.06 } },
        ],
      },
    ],
  },
  {
    id: 'press_on',
    skill: 'combat',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Press On',
    desc: 'A soldier does not stop to admire the work. Kills shave your arts and quicken your feet.',
    color: '#d9b04a',
    effects: [
      { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 12 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:press_on', name: 'Press On',
          trigger: { on: 'kill' },
          action: { do: 'surge', stat: 'speed', pct: 15, ticks: 60 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The next one is closer than it looks.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 16 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_on', name: 'Press On',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 18, ticks: 70 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The arts come back faster and the feet stay lit longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 20 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_on', name: 'Press On',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 20, ticks: 80 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'Momentum sharpens the eye as well as the pace.',
        effects: [
          { kind: 'gear', effect: { kind: 'onKillHaste', ticks: 20 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:press_on', name: 'Press On',
              trigger: { on: 'kill' },
              action: { do: 'surge', stat: 'speed', pct: 22, ticks: 90 },
              icd: 100,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'read_the_guard',
    skill: 'combat',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Read the Guard',
    desc: 'Every fifth blow you are watching, not swinging. It lands where the guard is thin: sunder.',
    color: '#b09a7a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:read_the_guard', name: 'Read the Guard',
          trigger: { on: 'cadence', every: 5 },
          action: { do: 'status', status: 'sunder', power: 8, ticks: 80 },
          icd: 100,
        },
      },
    ],
    ranks: [
      {
        note: 'The read goes deeper into the guard.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:read_the_guard', name: 'Read the Guard',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 10, ticks: 90 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'The crack stays open longer.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:read_the_guard', name: 'Read the Guard',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
      {
        note: 'You read the guard oftener, and the eye that reads it also finds the crit.',
        effects: [
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:read_the_guard', name: 'Read the Guard',
              trigger: { on: 'cadence', every: 5 },
              action: { do: 'status', status: 'sunder', power: 12, ticks: 120 },
              icd: 80,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'through_the_gap',
    skill: 'combat',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Storm the Breach',
    desc: 'A sundered guard is a breach. You hit marked foes harder and sometimes go straight in.',
    color: '#a8927a',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:through_the_gap', name: 'Storm the Breach',
          trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
          action: { do: 'bolt', damage: 12 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The breach opens wider.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_gap', name: 'Storm the Breach',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'bolt', damage: 14 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'More of you gets through the breach.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_gap', name: 'Storm the Breach',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.3 },
              action: { do: 'bolt', damage: 16 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'You find the breach oftener and it costs them dearer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'sunder', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:through_the_gap', name: 'Storm the Breach',
              trigger: { on: 'hitState', status: 'sunder', chance: 0.35 },
              action: { do: 'bolt', damage: 18 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'old_soldiers_breath',
    skill: 'combat',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Field Dressing',
    desc: 'An old hand binds the wound and fights on. Under two fifths health, you start mending.',
    color: '#a8c4b0',
    effects: [
      { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:old_soldiers_breath', name: 'Field Dressing',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'boon', status: 'mend', power: 3, ticks: 100 },
          icd: 600,
        },
      },
    ],
    ranks: [
      {
        note: 'The dressing closes more each second.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_soldiers_breath', name: 'Field Dressing',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 100 },
              icd: 600,
            },
          },
        ],
      },
      {
        note: 'The dressing holds longer, and the body it binds is bigger.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_soldiers_breath', name: 'Field Dressing',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 4, ticks: 120 },
              icd: 600,
            },
          },
        ],
      },
      {
        note: 'Under two fifths you dig in as you bind: armor while low.',
        effects: [
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:old_soldiers_breath', name: 'Field Dressing',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'boon', status: 'mend', power: 5, ticks: 120 },
              icd: 500,
            },
          },
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.4 }, grant: { name: 'Dug In', armor: 5 } },
        ],
      },
    ],
  },
  {
    id: 'answered_blow',
    skill: 'combat',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Answered Blow',
    desc: 'Take the hit and mark the arm that gave it. Struck, you often weaken your attacker.',
    color: '#8f6a7a',
    effects: [
      { kind: 'gear', effect: { kind: 'thorns', amount: 3 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:answered_blow', name: 'Answered Blow',
          trigger: { on: 'hurt', chance: 0.3 },
          action: { do: 'status', status: 'weaken', power: 10, ticks: 80 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'The answer takes more out of the arm.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:answered_blow', name: 'Answered Blow',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 90 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'The weakness lingers, and your hide gives more back.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:answered_blow', name: 'Answered Blow',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 14, ticks: 100 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'You answer sooner and stand harder for it: armor joins the thorns.',
        effects: [
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:answered_blow', name: 'Answered Blow',
              trigger: { on: 'hurt', chance: 0.3 },
              action: { do: 'status', status: 'weaken', power: 15, ticks: 100 },
              icd: 100,
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------ the drill sergeant
  {
    id: 'cadence_drill',
    skill: 'combat',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Cadence Drill',
    desc: 'The yard\'s count lives in your wrists. Six blows landed and your hands quicken.',
    color: '#d8c48a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:cadence_drill', name: 'Cadence Drill',
          trigger: { on: 'stacks', per: 'hit', count: 6 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
          icd: 60,
        },
      },
    ],
    ranks: [
      {
        note: 'The count comes round in five, and the quickening lingers.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cadence_drill', name: 'Cadence Drill',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 60,
            },
          },
        ],
      },
      {
        note: 'The drilled hands barely rest between counts.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cadence_drill', name: 'Cadence Drill',
              trigger: { on: 'stacks', per: 'hit', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 50,
            },
          },
        ],
      },
      {
        note: 'Four blows to the count, and the drilled hand rests its arts sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 6 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:cadence_drill', name: 'Cadence Drill',
              trigger: { on: 'stacks', per: 'hit', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 40,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'old_campaigner',
    skill: 'combat',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Old Campaigner',
    desc: 'Every road taught you something. All five weapon schools fight two levels higher.',
    color: '#8f7a4a',
    effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 2 }],
    ranks: [
      { note: 'Three levels higher, every school.', effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 3 }] },
      { note: 'Four levels higher. The roads keep teaching.', effects: [{ kind: 'perk', perk: 'warSchooling', magnitude: 4 }] },
      {
        note: 'The schooling shows in the crit as well as the letter.',
        effects: [
          { kind: 'perk', perk: 'warSchooling', magnitude: 4 },
          { kind: 'gear', effect: { kind: 'crit', pct: 3 } },
        ],
      },
    ],
  },
  {
    id: 'scent_of_blood',
    skill: 'combat',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Bleed Them Out',
    desc: 'A bleeding foe is a fight half won. You hit the bleeding harder and take heart from it.',
    color: '#a05a48',
    effects: [
      { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 10 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:scent_of_blood', name: 'Bleed Them Out',
          trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
          action: { do: 'surge', stat: 'damage', pct: 12, ticks: 80 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The bleeding pay more, and the heart rises higher.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 12 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_blood', name: 'Bleed Them Out',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'surge', stat: 'damage', pct: 15, ticks: 80 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The surge holds longer.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 14 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_blood', name: 'Bleed Them Out',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.25 },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'The bleeding pay dearest, and the veteran\'s eye grows keener for the sight.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'bleed', pct: 16 } },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:scent_of_blood', name: 'Bleed Them Out',
              trigger: { on: 'hitState', status: 'bleed', chance: 0.3 },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 100 },
              icd: 180,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'braced_for_it',
    skill: 'combat',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Take the Weak Side',
    desc: 'A weakened arm shows you its side. Striking a weakened foe often raises a ward on you.',
    color: '#7d6b52',
    effects: [
      { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
      {
        kind: 'proc',
        proc: {
          kind: 'proc', id: 'calling:braced_for_it', name: 'Take the Weak Side',
          trigger: { on: 'hitState', status: 'weaken', chance: 0.35 },
          action: { do: 'ward', absorb: 30, ticks: 160 },
          icd: 300,
        },
      },
    ],
    ranks: [
      {
        note: 'The ward takes more before you do.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:braced_for_it', name: 'Take the Weak Side',
              trigger: { on: 'hitState', status: 'weaken', chance: 0.35 },
              action: { do: 'ward', absorb: 40, ticks: 160 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'The brace holds longer, and the body under it is harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 5 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:braced_for_it', name: 'Take the Weak Side',
              trigger: { on: 'hitState', status: 'weaken', chance: 0.35 },
              action: { do: 'ward', absorb: 50, ticks: 200 },
              icd: 300,
            },
          },
        ],
      },
      {
        note: 'You press sooner, and what lands on the brace bites back.',
        effects: [
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
          { kind: 'gear', effect: { kind: 'thorns', amount: 3 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:braced_for_it', name: 'Take the Weak Side',
              trigger: { on: 'hitState', status: 'weaken', chance: 0.35 },
              action: { do: 'ward', absorb: 60, ticks: 200 },
              icd: 260,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'drillmaster',
    skill: 'combat',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Drillmaster',
    desc: 'You have drilled every hand the army fields. Sword, greatblade and spear all cut harder.',
    color: '#b8a45a',
    effects: [
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 8 } },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 8 } },
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 8 } },
    ],
    ranks: [
      {
        note: 'The melee schools cut a tenth harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 10 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 10 } },
        ],
      },
      {
        note: 'The drill shows in every swing.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
        ],
      },
      {
        note: 'The archers and the arx hands fall in too.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'twohand', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'polearm', pct: 12 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'archery', pct: 8 } },
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 8 } },
        ],
      },
    ],
  },

  // ------------------------------------------- the old soldier's seat
  {
    id: 'last_one_standing',
    skill: 'combat',
    unlockLevel: 80,
    focusCost: 3,
    name: 'The Long Campaign',
    desc: 'You have been here before. The Long Fight seats in any hand, and you stand the harder.',
    color: '#c9a44a',
    effects: [
      { kind: 'art', ability: 'the_long_fight' },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
    ],
    ranks: [
      {
        note: 'The body that has been here before is bigger for it.',
        effects: [
          { kind: 'art', ability: 'the_long_fight' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 16 } },
        ],
      },
      {
        note: 'The wounds close on their own now, slowly, always.',
        effects: [
          { kind: 'art', ability: 'the_long_fight' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 20 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 1 } },
        ],
      },
      {
        note: 'It ends the way it always ends. Every kill closes a wound.',
        effects: [
          { kind: 'art', ability: 'the_long_fight' },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 24 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc', id: 'calling:last_one_standing', name: 'Still Standing',
              trigger: { on: 'kill' },
              action: { do: 'heal', amount: 20 },
              icd: 160,
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, combat's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState / vsState) is
 * licensed here by a conscious row, never by authoring the def alone.
 */
export const COMBAT_LICENSES: CallingLicense[] = [
  { calling: 'read_the_guard', status: 'sunder', via: 'lay:status' },
  { calling: 'through_the_gap', status: 'sunder', via: 'read:vsState' },
  { calling: 'through_the_gap', status: 'sunder', via: 'read:hitState' },
  { calling: 'old_soldiers_breath', status: 'mend', via: 'lay:boon' },
  { calling: 'answered_blow', status: 'weaken', via: 'lay:status' },
  { calling: 'cadence_drill', status: 'quicken', via: 'lay:boon' },
  { calling: 'scent_of_blood', status: 'bleed', via: 'read:vsState' },
  { calling: 'scent_of_blood', status: 'bleed', via: 'read:hitState' },
  { calling: 'braced_for_it', status: 'weaken', via: 'read:hitState' },
];

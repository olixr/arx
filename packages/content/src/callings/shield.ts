/**
 * THE FILLED HALL — shield's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 *
 * THE WALL'S ARC. 5..15 are the three first identities of a shield hand:
 * the rim that coats you in stone when it turns a blow (Rimwise), the
 * wall that stands taller the more press it (The Press), the roof that
 * makes every skin of iron thicker (Roofwright). 20..50 bring the verbs:
 * Shieldarm's iron, the numbing rim that LAYS weaken, the struck bell
 * that READS shock, the frost that READS chill, the sword behind the
 * boss, the answered blow, the portcullis. 55..75 close the ladder's own
 * synergy pair (Rimwise lays stonehide, Stone Rider reads it) and send
 * the outward seats: the oiled hinge (every art comes round sooner), the
 * drumming rim (quicken for whatever arm swings behind the wall), the
 * rampart shrug. 80 is Doorwarden: THE MASTER'S LICENSE on Unbroken, the
 * great stand called whatever your rung.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SHIELD_CALLINGS: CallingDef[] = [
  // ------------------------------------------------ 5: the first stone
  {
    id: 'rimwise',
    skill: 'shield',
    unlockLevel: 5,
    focusCost: 1,
    name: 'Rimwise',
    desc: 'Take it on the rim, never the arm. A turned blow coats you in stone.',
    color: '#9db4c8',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:rimwise',
          name: 'Rimwise',
          trigger: { on: 'block' },
          action: { do: 'boon', status: 'stonehide', power: 0, ticks: 100 },
          icd: 240,
        },
      },
    ],
    ranks: [
      {
        note: 'The stone stays a breath longer and comes sooner.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rimwise',
              name: 'Rimwise',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 120 },
              icd: 220,
            },
          },
        ],
      },
      {
        note: 'Seven seconds of stone; the rim answers every ten.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rimwise',
              name: 'Rimwise',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 140 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: 'Eight seconds of stone, and the arm itself hardens: +4 armor always.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rimwise',
              name: 'Rimwise',
              trigger: { on: 'block' },
              action: { do: 'boon', status: 'stonehide', power: 0, ticks: 160 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 10: the wall against many
  {
    id: 'the_press',
    skill: 'shield',
    unlockLevel: 10,
    focusCost: 1,
    name: 'The Press',
    desc: 'Three on one is a shield hand\'s weather. Armor while three or more press you.',
    color: '#7d8fa3',
    effects: [
      { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Pressed', armor: 6 } },
    ],
    ranks: [
      {
        note: 'The press finds a harder wall: +8 armor.',
        effects: [
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Pressed', armor: 8 } },
        ],
      },
      {
        note: 'The wall breathes under the press: +9 armor and it knits as it holds.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Pressed', armor: 9, regenPer4s: 1 },
          },
        ],
      },
      {
        note: 'Twelve iron under the press, and the wall knits twice as fast while they crowd you.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'outnumbered', count: 3 },
            grant: { name: 'Pressed', armor: 12, regenPer4s: 2 },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------ 15: the roof
  {
    id: 'roofwright',
    skill: 'shield',
    unlockLevel: 15,
    focusCost: 1,
    name: 'Roofwright',
    desc: 'You know how a roof is built. Skins of iron your arts raise hold more; +6 health.',
    color: '#8a7a5e',
    effects: [
      { kind: 'perk', perk: 'shieldMult', magnitude: 1.25 },
      { kind: 'gear', effect: { kind: 'maxHp', amount: 6 } },
    ],
    ranks: [
      {
        note: 'The roof takes a third more weather, and the frame under it stands +8 health.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.35 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
      {
        note: 'Two beams for every one: skins of iron gain nearly half; +10 health.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.45 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
        ],
      },
      {
        note: 'Half again on every skin of iron, and the body under the roof grows: +12 health.',
        effects: [
          { kind: 'perk', perk: 'shieldMult', magnitude: 1.5 },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 20: THE FOUNDING ROW
  {
    id: 'shieldarm',
    skill: 'shield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Shieldarm',
    desc: 'The arm and the wall stop being two things. Armor while a shield is raised.',
    color: '#8ea4b8',
    effects: [{ kind: 'perk', perk: 'shieldArm', magnitude: 4 }],
    ranks: [
      {
        note: 'The raised wall lends five iron.',
        effects: [{ kind: 'perk', perk: 'shieldArm', magnitude: 5 }],
      },
      {
        note: 'Six iron behind the wall.',
        effects: [{ kind: 'perk', perk: 'shieldArm', magnitude: 6 }],
      },
      {
        note: 'Eight iron, and the wall no longer costs you steps: +5% speed with it raised.',
        effects: [
          { kind: 'perk', perk: 'shieldArm', magnitude: 8 },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Shieldarm', speedMult: 1.05 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 25: the rim that numbs (LAYS weaken)
  {
    id: 'numbing_rim',
    skill: 'shield',
    unlockLevel: 25,
    focusCost: 1,
    name: 'Numbing Rim',
    desc: 'Meet the blow on the iron edge and the arm that sent it goes dead. Blocks weaken.',
    color: '#6f8aa0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:numbing_rim',
          name: 'Numbing Rim',
          trigger: { on: 'block' },
          action: { do: 'status', status: 'weaken', power: 8, ticks: 80 },
          icd: 160,
        },
      },
    ],
    ranks: [
      {
        note: 'The numbness bites deeper: their blows lose a tenth.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:numbing_rim',
              name: 'Numbing Rim',
              trigger: { on: 'block' },
              action: { do: 'status', status: 'weaken', power: 10, ticks: 90 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'Their blows lose 12% for five seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:numbing_rim',
              name: 'Numbing Rim',
              trigger: { on: 'block' },
              action: { do: 'status', status: 'weaken', power: 12, ticks: 100 },
              icd: 160,
            },
          },
        ],
      },
      {
        note: 'Six seconds of a dead arm, sooner, and the rim itself bites: +3 thorns.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:numbing_rim',
              name: 'Numbing Rim',
              trigger: { on: 'block' },
              action: { do: 'status', status: 'weaken', power: 14, ticks: 120 },
              icd: 140,
            },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 3 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 30: the bell (READS shock)
  {
    id: 'struck_bell',
    skill: 'shield',
    unlockLevel: 30,
    focusCost: 1,
    name: 'Struck Bell',
    desc: 'The toll leaves them ringing. Your blows on a shocked foe peal outward and burst.',
    color: '#c9a45e',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:struck_bell',
          name: 'Struck Bell',
          trigger: { on: 'hitState', status: 'shock', chance: 0.5 },
          action: { do: 'nova', damage: 12, radius: 2.4 },
          icd: 200,
          element: 'storm',
        },
      },
    ],
    ranks: [
      {
        note: 'The bell rings harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:struck_bell',
              name: 'Struck Bell',
              trigger: { on: 'hitState', status: 'shock', chance: 0.5 },
              action: { do: 'nova', damage: 14, radius: 2.4 },
              icd: 200,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The peal carries wider.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:struck_bell',
              name: 'Struck Bell',
              trigger: { on: 'hitState', status: 'shock', chance: 0.5 },
              action: { do: 'nova', damage: 16, radius: 2.6 },
              icd: 200,
              element: 'storm',
            },
          },
        ],
      },
      {
        note: 'The bell answers sooner and the hand that rings it learns the sweet spot: +2% crit.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:struck_bell',
              name: 'Struck Bell',
              trigger: { on: 'hitState', status: 'shock', chance: 0.55 },
              action: { do: 'nova', damage: 18, radius: 2.8 },
              icd: 180,
              element: 'storm',
            },
          },
          { kind: 'gear', effect: { kind: 'crit', pct: 2 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 35: frost (READS chill)
  {
    id: 'frost_on_the_boss',
    skill: 'shield',
    unlockLevel: 35,
    focusCost: 1,
    name: 'Frost on the Boss',
    desc: 'What the cold has slowed, the wall breaks. +10% damage to chilled foes.',
    color: '#a8c8e0',
    effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 10 } }],
    ranks: [
      {
        note: 'The chilled take 12% more from you.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 12 } }],
      },
      {
        note: 'Fourteen parts more against the slowed.',
        effects: [{ kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 14 } }],
      },
      {
        note: '+16% against the chilled, and the boss rimes over: your frost bites 8% deeper.',
        effects: [
          { kind: 'gear', effect: { kind: 'vsState', status: 'chill', pct: 16 } },
          { kind: 'gear', effect: { kind: 'elementDmg', element: 'frost', pct: 8 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 40: the sword behind the wall (OUTWARD)
  {
    id: 'boss_and_blade',
    skill: 'shield',
    unlockLevel: 40,
    focusCost: 2,
    name: 'Boss and Blade',
    desc: 'The wall makes the opening; the blade takes it. One hand damage, crit behind the wall.',
    color: '#b87a5e',
    effects: [
      { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 10 } },
      { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Boss and Blade', critPct: 2 } },
    ],
    ranks: [
      {
        note: 'The blade behind the boss cuts 12% harder.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 12 } },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Boss and Blade', critPct: 2 } },
        ],
      },
      {
        note: '+14% one hand damage and the openings come clearer: +3% crit behind the wall.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 14 } },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Boss and Blade', critPct: 3 } },
        ],
      },
      {
        note: '+16% one hand damage, +4% crit behind the wall.',
        effects: [
          { kind: 'gear', effect: { kind: 'styleDmg', style: 'onehand', pct: 16 } },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Boss and Blade', critPct: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 45: the answered blow
  {
    id: 'answered_rim',
    skill: 'shield',
    unlockLevel: 45,
    focusCost: 2,
    name: 'The Answered Rim',
    desc: 'Blood on the wall wakes the arm. Being hurt surges your damage for five seconds.',
    color: '#d0a070',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:answered_rim',
          name: 'Answered',
          trigger: { on: 'hurt', chance: 0.4 },
          action: { do: 'surge', stat: 'damage', pct: 15, ticks: 100 },
          icd: 200,
        },
      },
    ],
    ranks: [
      {
        note: 'The answer comes harder: +18% damage.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answered_rim',
              name: 'Answered',
              trigger: { on: 'hurt', chance: 0.4 },
              action: { do: 'surge', stat: 'damage', pct: 18, ticks: 100 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: '+20% for six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answered_rim',
              name: 'Answered',
              trigger: { on: 'hurt', chance: 0.4 },
              action: { do: 'surge', stat: 'damage', pct: 20, ticks: 120 },
              icd: 200,
            },
          },
        ],
      },
      {
        note: '+24% for seven seconds, sooner; past half blood every blow carries +8%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:answered_rim',
              name: 'Answered',
              trigger: { on: 'hurt', chance: 0.45 },
              action: { do: 'surge', stat: 'damage', pct: 24, ticks: 140 },
              icd: 180,
            },
          },
          { kind: 'when', cond: { when: 'hpBelow', frac: 0.5 }, grant: { name: 'Blood Answer', dmgMult: 1.08 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 50: the gate drops (OUTWARD)
  {
    id: 'portcullis',
    skill: 'shield',
    unlockLevel: 50,
    focusCost: 2,
    name: 'Portcullis',
    desc: 'When the wall is nearly down, the gate drops. Under 40% health a ward eats the next blows.',
    color: '#5e6a7a',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:portcullis',
          name: 'Portcullis',
          trigger: { on: 'lowHp', pct: 0.4 },
          action: { do: 'ward', absorb: 50, ticks: 160 },
          icd: 600,
        },
      },
    ],
    ranks: [
      {
        note: 'The gate is heavier: 60 absorbed.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:portcullis',
              name: 'Portcullis',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 60, ticks: 160 },
              icd: 600,
            },
          },
        ],
      },
      {
        note: '70 absorbed, and the chain is oiled: it drops again after 25 seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:portcullis',
              name: 'Portcullis',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 70, ticks: 180 },
              icd: 500,
            },
          },
        ],
      },
      {
        note: '80 absorbed for ten seconds, every 20, and the body behind it grows: +12 health.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:portcullis',
              name: 'Portcullis',
              trigger: { on: 'lowHp', pct: 0.4 },
              action: { do: 'ward', absorb: 80, ticks: 200 },
              icd: 400,
            },
          },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 12 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 55: the hinge (OUTWARD)
  {
    id: 'oiled_hinge',
    skill: 'shield',
    unlockLevel: 55,
    focusCost: 2,
    name: 'Oiled Hinge',
    desc: 'A door that swings easy swings again. Arts come round sooner; you knit while in a fight.',
    color: '#a09070',
    effects: [
      { kind: 'gear', effect: { kind: 'cooldown', pct: 10 } },
      { kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Oiled Hinge', regenPer4s: 1 } },
    ],
    ranks: [
      {
        note: 'Arts come round 12% sooner.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Oiled Hinge', regenPer4s: 1 } },
        ],
      },
      {
        note: 'The knitting doubles while the fight is on.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 12 } },
          { kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Oiled Hinge', regenPer4s: 2 } },
        ],
      },
      {
        note: 'Arts come round 14% sooner, and the frame is stouter: +8 health.',
        effects: [
          { kind: 'gear', effect: { kind: 'cooldown', pct: 14 } },
          { kind: 'when', cond: { when: 'inCombat' }, grant: { name: 'Oiled Hinge', regenPer4s: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 8 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 60: THE FOUNDING ROW
  {
    id: 'ironback',
    skill: 'shield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironback',
    desc: 'The wall bites back. Blows that land on the boss cost the striker.',
    color: '#6a7484',
    effects: [{ kind: 'perk', perk: 'shieldThorns', magnitude: 5 }],
    ranks: [
      {
        note: 'Six points off every blow that meets the wall.',
        effects: [{ kind: 'perk', perk: 'shieldThorns', magnitude: 6 }],
      },
      {
        note: 'Seven points, and the wall turns a sliver of every blow home.',
        effects: [
          { kind: 'perk', perk: 'shieldThorns', magnitude: 7 },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Ironback', reflectFrac: 0.06 } },
        ],
      },
      {
        note: 'Eight points and a tenth of every blow sent home while the wall is raised.',
        effects: [
          { kind: 'perk', perk: 'shieldThorns', magnitude: 8 },
          { kind: 'when', cond: { when: 'shieldRaised' }, grant: { name: 'Ironback', reflectFrac: 0.1 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 65: the stone rider (READS stonehide, OUTWARD)
  {
    id: 'stone_rider',
    skill: 'shield',
    unlockLevel: 65,
    focusCost: 2,
    name: 'Stone Rider',
    desc: 'Stone on the skin steadies the whole body. While stonehide rides you: damage and armor.',
    color: '#98a4b0',
    effects: [
      {
        kind: 'when',
        cond: { when: 'stateRiding', status: 'stonehide' },
        grant: { name: 'Stone Rider', dmgMult: 1.08, armor: 3 },
      },
    ],
    ranks: [
      {
        note: 'The stone steadies harder: +10% damage, +4 armor.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Stone Rider', dmgMult: 1.1, armor: 4 },
          },
        ],
      },
      {
        note: '+12% damage, +5 armor while the stone rides.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Stone Rider', dmgMult: 1.12, armor: 5 },
          },
        ],
      },
      {
        note: '+14% damage, +6 armor under stone, and the stone bristles: +4 thorns always.',
        effects: [
          {
            kind: 'when',
            cond: { when: 'stateRiding', status: 'stonehide' },
            grant: { name: 'Stone Rider', dmgMult: 1.14, armor: 6 },
          },
          { kind: 'gear', effect: { kind: 'thorns', amount: 4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 70: the drumming rim (LAYS quicken, OUTWARD)
  {
    id: 'drumming_rim',
    skill: 'shield',
    unlockLevel: 70,
    focusCost: 2,
    name: 'Drumming Rim',
    desc: 'Blows on the wall keep a beat the arm learns. Every fifth block quickens your hand.',
    color: '#e8d5a0',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:drumming_rim',
          name: 'Drumming Rim',
          trigger: { on: 'stacks', per: 'block', count: 5 },
          action: { do: 'boon', status: 'quicken', power: 0, ticks: 100 },
          icd: 120,
        },
      },
    ],
    ranks: [
      {
        note: 'The beat holds six seconds.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drumming_rim',
              name: 'Drumming Rim',
              trigger: { on: 'stacks', per: 'block', count: 5 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'Four blocks find the beat.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drumming_rim',
              name: 'Drumming Rim',
              trigger: { on: 'stacks', per: 'block', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 120,
            },
          },
        ],
      },
      {
        note: 'Four blocks find the beat, the drum rests less, and the feet learn it: +5% speed.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:drumming_rim',
              name: 'Drumming Rim',
              trigger: { on: 'stacks', per: 'block', count: 4 },
              action: { do: 'boon', status: 'quicken', power: 0, ticks: 120 },
              icd: 100,
            },
          },
          { kind: 'gear', effect: { kind: 'speed', pct: 5 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 75: the rampart shrugs
  {
    id: 'rampart_shrug',
    skill: 'shield',
    unlockLevel: 75,
    focusCost: 2,
    name: 'Rampart Shrug',
    desc: 'Six blows and the wall shrugs the yard off. Every sixth wound bursts outward; iron always.',
    color: '#7a8494',
    effects: [
      {
        kind: 'proc',
        proc: {
          kind: 'proc',
          id: 'calling:rampart_shrug',
          name: 'Rampart Shrug',
          trigger: { on: 'stacks', per: 'hurt', count: 6 },
          action: { do: 'nova', damage: 16, radius: 2.8 },
          icd: 200,
        },
      },
      { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
    ],
    ranks: [
      {
        note: 'The shrug throws harder.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rampart_shrug',
              name: 'Rampart Shrug',
              trigger: { on: 'stacks', per: 'hurt', count: 6 },
              action: { do: 'nova', damage: 18, radius: 2.8 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
        ],
      },
      {
        note: 'Wider and heavier, and the rampart itself thickens: +7 armor.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rampart_shrug',
              name: 'Rampart Shrug',
              trigger: { on: 'stacks', per: 'hurt', count: 6 },
              action: { do: 'nova', damage: 20, radius: 3.0 },
              icd: 200,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 7 } },
        ],
      },
      {
        note: 'Five wounds shrug the yard off; +8 armor; and hedged in, the wall hits +6%.',
        effects: [
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:rampart_shrug',
              name: 'Rampart Shrug',
              trigger: { on: 'stacks', per: 'hurt', count: 5 },
              action: { do: 'nova', damage: 22, radius: 3.0 },
              icd: 180,
            },
          },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'when', cond: { when: 'outnumbered', count: 3 }, grant: { name: 'Hedged In', dmgMult: 1.06 } },
        ],
      },
    ],
  },

  // ------------------------------------------------ 80: THE MASTER'S LICENSE
  {
    id: 'doorwarden',
    skill: 'shield',
    unlockLevel: 80,
    focusCost: 3,
    name: 'Doorwarden',
    desc: 'The great stand is yours whatever your rung. Unbroken is licensed; iron and mending.',
    color: '#f0dca8',
    effects: [
      { kind: 'art', ability: 'unbroken' },
      { kind: 'gear', effect: { kind: 'armor', amount: 6 } },
    ],
    ranks: [
      {
        note: 'The warden stands in eight iron and knits between stands.',
        effects: [
          { kind: 'art', ability: 'unbroken' },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
        ],
      },
      {
        note: 'The door mends its keeper: a turned blow closes 18 of your wounds, every twelve seconds.',
        effects: [
          { kind: 'art', ability: 'unbroken' },
          { kind: 'gear', effect: { kind: 'armor', amount: 8 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:doorwarden',
              name: 'Doorwarden',
              trigger: { on: 'block' },
              action: { do: 'heal', amount: 18 },
              icd: 240,
            },
          },
        ],
      },
      {
        note: 'Ten iron, a stouter frame, and a turned blow closes 26 wounds every ten seconds.',
        effects: [
          { kind: 'art', ability: 'unbroken' },
          { kind: 'gear', effect: { kind: 'armor', amount: 10 } },
          { kind: 'gear', effect: { kind: 'regen', amount: 2 } },
          { kind: 'gear', effect: { kind: 'maxHp', amount: 10 } },
          {
            kind: 'proc',
            proc: {
              kind: 'proc',
              id: 'calling:doorwarden',
              name: 'Doorwarden',
              trigger: { on: 'block' },
              action: { do: 'heal', amount: 26 },
              icd: 200,
            },
          },
        ],
      },
    ],
  },
];

/**
 * THE REGISTER, shield's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const SHIELD_LICENSES: CallingLicense[] = [
  // Rimwise coats the blocker in stone; Stone Rider reads that stone
  // (and anyone else's: a herbalist's tonic, a smith's temper).
  { calling: 'rimwise', status: 'stonehide', via: 'lay:boon' },
  { calling: 'stone_rider', status: 'stonehide', via: 'read:stateRiding' },
  // The numbing rim deadens the striker's arm: the mark lane, for any
  // vsState:weaken reader in the hall.
  { calling: 'numbing_rim', status: 'weaken', via: 'lay:status' },
  // The struck bell rings the shocked: shield's own Shield Bash and
  // Iron Toll lay it, and every storm hand in the hall.
  { calling: 'struck_bell', status: 'shock', via: 'read:hitState' },
  // Frost on the boss: the shield's own cold arts and every frost hand.
  { calling: 'frost_on_the_boss', status: 'chill', via: 'read:vsState' },
  // The drumming rim quickens the arm behind the wall.
  { calling: 'drumming_rim', status: 'quicken', via: 'lay:boon' },
];

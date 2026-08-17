/**
 * THE FILLED HALL — farming's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FARMING_CALLINGS: CallingDef[] = [
  {
    id: 'the_composter',
    skill: 'farming',
    unlockLevel: 35,
    focusCost: 1,
    name: 'The Composter',
    desc: 'Your heaps close early. Rot respects experience.',
    color: '#6e5433',
    effects: [{ kind: 'perk', perk: 'compostDiscount', magnitude: 2 }],
  },
  {
    id: 'marketeer',
    skill: 'farming',
    unlockLevel: 45,
    focusCost: 2,
    name: 'Marketeer',
    desc: 'The larder boards know your name. Orders pay a tenth more to you.',
    color: '#e8c04c',
    effects: [{ kind: 'perk', perk: 'larderSellMult', magnitude: 1.1 }],
  },
  {
    id: 'green_thumb',
    skill: 'farming',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Green Thumb',
    desc: 'Some harvests hand you next season for free. Seeds sometimes return.',
    color: '#8ac46a',
    effects: [{ kind: 'perk', perk: 'seedRefundChance', magnitude: 0.1 }],
  },
  {
    id: 'bounty',
    skill: 'farming',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Bounty',
    desc: 'The field answers the practiced hand. Harvests sometimes come double.',
    color: '#a8b84a',
    effects: [{ kind: 'perk', perk: 'doubleHarvestChance', magnitude: 0.1 }],
  },
];

/**
 * THE REGISTER, farming's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const FARMING_LICENSES: CallingLicense[] = [];

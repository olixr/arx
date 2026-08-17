/**
 * THE FILLED HALL — herbalism's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const HERBALISM_CALLINGS: CallingDef[] = [
  {
    id: 'bitter_blood',
    skill: 'herbalism',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bitter Blood',
    desc: 'Years of tasting your own brews. Poison and burning grip you weakly.',
    color: '#a0c050',
    effects: [{ kind: 'perk', perk: 'dotResistMult', magnitude: 0.7 }],
  },
  {
    id: 'long_brew',
    skill: 'herbalism',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Long Brew',
    desc: 'Your tonics are steeped, not stirred. They last longer in the blood.',
    color: '#6a9a4a',
    effects: [{ kind: 'perk', perk: 'tonicBuffDurMult', magnitude: 1.25 }],
  },
];

/**
 * THE REGISTER, herbalism's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const HERBALISM_LICENSES: CallingLicense[] = [];

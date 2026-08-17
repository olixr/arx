/**
 * THE FILLED HALL — cooking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const COOKING_CALLINGS: CallingDef[] = [
  {
    id: 'seasoned_palate',
    skill: 'cooking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Seasoned Palate',
    desc: 'You smell the turn before it comes. Far fewer meals burn.',
    color: '#d9825a',
    effects: [{ kind: 'perk', perk: 'burnChanceMult', magnitude: 0.7 }],
  },
  {
    id: 'field_kitchen',
    skill: 'cooking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Field Kitchen',
    desc: 'Your cooking keeps working after the plate is clean. Food buffs last longer.',
    color: '#b86a3a',
    effects: [{ kind: 'perk', perk: 'foodBuffDurMult', magnitude: 1.25 }],
  },
];

/**
 * THE REGISTER, cooking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const COOKING_LICENSES: CallingLicense[] = [];

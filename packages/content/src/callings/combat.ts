/**
 * THE FILLED HALL — combat's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const COMBAT_CALLINGS: CallingDef[] = [
  {
    id: 'war_footing',
    skill: 'combat',
    unlockLevel: 20,
    focusCost: 1,
    name: 'War Footing',
    desc: 'A soldier is hardest to hurt mid stride. Armor while you move.',
    color: '#b0623c',
    effects: [{ kind: 'perk', perk: 'marchArmor', magnitude: 4 }],
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
  },
];

/**
 * THE REGISTER, combat's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const COMBAT_LICENSES: CallingLicense[] = [];

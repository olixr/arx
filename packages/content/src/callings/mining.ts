/**
 * THE FILLED HALL — mining's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const MINING_CALLINGS: CallingDef[] = [
  {
    id: 'prospector',
    skill: 'mining',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Prospector',
    desc: 'You read the seam before you swing. Ore sometimes comes double.',
    color: '#8a8474',
    effects: [{ kind: 'doubleGather', skill: 'mining', chance: 0.1 }],
  },
  {
    id: 'deep_lungs',
    skill: 'mining',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Lungs',
    desc: 'The dark is your workshop. You mine faster underground.',
    color: '#5a5464',
    effects: [{ kind: 'perk', perk: 'undergroundGatherMult', magnitude: 1.15 }],
  },
];

/**
 * THE REGISTER, mining's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const MINING_LICENSES: CallingLicense[] = [];

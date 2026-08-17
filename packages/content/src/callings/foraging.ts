/**
 * THE FILLED HALL — foraging's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FORAGING_CALLINGS: CallingDef[] = [
  {
    id: 'gleaner',
    skill: 'foraging',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gleaner',
    desc: 'Nothing worth taking escapes you. Pickings sometimes come double.',
    color: '#7ac46a',
    effects: [{ kind: 'doubleGather', skill: 'foraging', chance: 0.1 }],
  },
  {
    id: 'verdant_eye',
    skill: 'foraging',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Verdant Eye',
    desc: 'The green sorts itself for you. You gather faster.',
    color: '#4a8a3a',
    effects: [{ kind: 'gatherSpeed', skill: 'foraging', mult: 1.12 }],
  },
];

/**
 * THE REGISTER, foraging's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const FORAGING_LICENSES: CallingLicense[] = [];

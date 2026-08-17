/**
 * THE FILLED HALL — woodcutting's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const WOODCUTTING_CALLINGS: CallingDef[] = [
  {
    id: 'timber_sense',
    skill: 'woodcutting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Timber Sense',
    desc: 'You know where the grain wants to split. Logs sometimes come double.',
    color: '#6b4a26',
    effects: [{ kind: 'doubleGather', skill: 'woodcutting', chance: 0.1 }],
  },
  {
    id: 'heartwood_eye',
    skill: 'woodcutting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Heartwood Eye',
    desc: 'Every tree tells you where to stand. You fell them faster.',
    color: '#7d5a36',
    effects: [{ kind: 'gatherSpeed', skill: 'woodcutting', mult: 1.12 }],
  },
];

/**
 * THE REGISTER, woodcutting's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const WOODCUTTING_LICENSES: CallingLicense[] = [];

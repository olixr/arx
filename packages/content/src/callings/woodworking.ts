/**
 * THE FILLED HALL — woodworking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const WOODWORKING_CALLINGS: CallingDef[] = [
  {
    id: 'clean_grain',
    skill: 'woodworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Clean Grain',
    desc: 'The wood offers its spare. Materials are sometimes saved.',
    color: '#a4744b',
    effects: [{ kind: 'materialSave', skill: 'woodworking', chance: 0.08 }],
  },
  {
    id: 'master_grain',
    skill: 'woodworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Master Grain',
    desc: 'Your hands know the next cut before you do. You work wood faster.',
    color: '#7d5a36',
    effects: [{ kind: 'craftSpeed', skill: 'woodworking', mult: 0.85 }],
  },
];

/**
 * THE REGISTER, woodworking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const WOODWORKING_LICENSES: CallingLicense[] = [];

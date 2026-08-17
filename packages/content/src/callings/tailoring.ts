/**
 * THE FILLED HALL — tailoring's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const TAILORING_CALLINGS: CallingDef[] = [
  {
    id: 'fine_seams',
    skill: 'tailoring',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Fine Seams',
    desc: 'Nothing frays under your needle. Materials are sometimes saved.',
    color: '#c8a8d8',
    effects: [{ kind: 'materialSave', skill: 'tailoring', chance: 0.08 }],
  },
  {
    id: 'quilted_lining',
    skill: 'tailoring',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Quilted Lining',
    desc: 'Your cloth carries hidden padding. Each worn piece toughens you.',
    color: '#a888c8',
    effects: [{ kind: 'perPiece', armorClass: 'cloth', maxHp: 2 }],
  },
];

/**
 * THE REGISTER, tailoring's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const TAILORING_LICENSES: CallingLicense[] = [];

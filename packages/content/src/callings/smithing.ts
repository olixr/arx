/**
 * THE FILLED HALL — smithing's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SMITHING_CALLINGS: CallingDef[] = [
  {
    id: 'sparing_hammer',
    skill: 'smithing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Sparing Hammer',
    desc: 'No blow wasted, no bar spent twice. Materials are sometimes saved.',
    color: '#8a94a4',
    effects: [{ kind: 'materialSave', skill: 'smithing', chance: 0.08 }],
  },
  {
    id: 'forgeheat',
    skill: 'smithing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Forgeheat',
    desc: 'The metal answers you like an old friend. Smith as three levels wiser.',
    color: '#c46a3a',
    effects: [{ kind: 'gear', effect: { kind: 'skill', skill: 'smithing', amount: 3 } }],
  },
];

/**
 * THE REGISTER, smithing's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const SMITHING_LICENSES: CallingLicense[] = [];

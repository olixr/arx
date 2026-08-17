/**
 * THE FILLED HALL — construction's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const CONSTRUCTION_CALLINGS: CallingDef[] = [
  {
    id: 'salvager',
    skill: 'construction',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Salvager',
    desc: 'You build with the offcuts too. Materials are sometimes saved.',
    color: '#a49484',
    effects: [{ kind: 'materialSave', skill: 'construction', chance: 0.1 }],
  },
  {
    id: 'homesteader',
    skill: 'construction',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Homesteader',
    desc: 'Walls rise quickly for the hand that has raised a hundred. You build faster.',
    color: '#8a7a64',
    effects: [{ kind: 'perk', perk: 'buildSpeedMult', magnitude: 0.85 }],
  },
];

/**
 * THE REGISTER, construction's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const CONSTRUCTION_LICENSES: CallingLicense[] = [];

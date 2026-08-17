/**
 * THE FILLED HALL — twohand's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const TWOHAND_CALLINGS: CallingDef[] = [
  {
    id: 'farcleaver',
    skill: 'twohand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Farcleaver',
    desc: 'The edge arrives before the argument. Greatweapon reach grows.',
    color: '#c47a3d',
    effects: [{ kind: 'perk', perk: 'greatReach', magnitude: 0.35 }],
  },
  {
    id: 'executioner',
    skill: 'twohand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Executioner',
    desc: 'The nearly-felled are already spoken for. Greatblows bite deeper into them.',
    color: '#8a5a4a',
    effects: [{ kind: 'perk', perk: 'greatExecute', magnitude: 0.3 }],
  },
];

/**
 * THE REGISTER, twohand's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const TWOHAND_LICENSES: CallingLicense[] = [];

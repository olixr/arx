/**
 * THE FILLED HALL — dualwield's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const DUALWIELD_CALLINGS: CallingDef[] = [
  {
    id: 'ambidexter',
    skill: 'dualwield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Ambidexter',
    desc: 'The off hand stops waiting its turn. The echo lands tighter.',
    color: '#b8a88a',
    effects: [{ kind: 'perk', perk: 'offhandDelayTicks', magnitude: 3 }],
  },
  {
    id: 'twin_tempo',
    skill: 'dualwield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Twin Tempo',
    desc: 'Two hands, one intention. The echo strikes harder.',
    color: '#a8927a',
    effects: [{ kind: 'perk', perk: 'offhandFactorBonus', magnitude: 0.05 }],
  },
];

/**
 * THE REGISTER, dualwield's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const DUALWIELD_LICENSES: CallingLicense[] = [];

/**
 * THE FILLED HALL — leatherworking's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const LEATHERWORKING_CALLINGS: CallingDef[] = [
  {
    id: 'whetstone_habit',
    skill: 'leatherworking',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Whetstone Habit',
    desc: 'A worker of edges keeps their own keen. Strikes crit more often.',
    color: '#9a6a45',
    effects: [{ kind: 'gear', effect: { kind: 'crit', pct: 2 } }],
  },
  {
    id: 'supple_fit',
    skill: 'leatherworking',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Supple Fit',
    desc: 'Leather you understand never binds. Each worn piece quickens you.',
    color: '#b8865a',
    effects: [{ kind: 'perPiece', armorClass: 'leather', speedPct: 0.5 }],
  },
];

/**
 * THE REGISTER, leatherworking's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const LEATHERWORKING_LICENSES: CallingLicense[] = [];

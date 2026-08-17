/**
 * THE FILLED HALL — onehand's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ONEHAND_CALLINGS: CallingDef[] = [
  {
    id: 'follow_through',
    skill: 'onehand',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Follow-Through',
    desc: 'The third blow carries the first two. Finishers hit a tenth harder.',
    color: '#d9a05a',
    effects: [{ kind: 'perk', perk: 'finisherBonusMult', magnitude: 1.1 }],
  },
  {
    id: 'warpath',
    skill: 'onehand',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Warpath',
    desc: 'Every kill feeds the next. Abilities recover on each fallen foe.',
    color: '#b8433a',
    effects: [{ kind: 'gear', effect: { kind: 'onKillHaste', ticks: 10 } }],
  },
];

/**
 * THE REGISTER, onehand's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const ONEHAND_LICENSES: CallingLicense[] = [];

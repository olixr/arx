/**
 * THE FILLED HALL — archery's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ARCHERY_CALLINGS: CallingDef[] = [
  {
    id: 'fletchers_eye',
    skill: 'archery',
    unlockLevel: 20,
    focusCost: 1,
    name: "Fletcher's Eye",
    desc: 'Snap shots stop being apologies. Quick arrows bite harder.',
    color: '#8a9a5a',
    effects: [{ kind: 'perk', perk: 'snapShotMult', magnitude: 1.15 }],
  },
  {
    id: 'longstride',
    skill: 'archery',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Longstride',
    desc: 'The full draw no longer roots you. Walk your aim.',
    color: '#6b8a5a',
    effects: [{ kind: 'perk', perk: 'drawMoveFactor', magnitude: 0.7 }],
  },
];

/**
 * THE REGISTER, archery's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const ARCHERY_LICENSES: CallingLicense[] = [];

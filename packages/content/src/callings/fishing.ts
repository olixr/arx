/**
 * THE FILLED HALL — fishing's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const FISHING_CALLINGS: CallingDef[] = [
  {
    id: 'patient_line',
    skill: 'fishing',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Patient Line',
    desc: 'The water rewards the unhurried. Catches sometimes come double.',
    color: '#6aa0c8',
    effects: [{ kind: 'doubleGather', skill: 'fishing', chance: 0.12 }],
  },
  {
    id: 'night_angler',
    skill: 'fishing',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Night Angler',
    desc: 'The best water is the dark water. You fish faster after dusk.',
    color: '#3a5a78',
    effects: [{ kind: 'perk', perk: 'nightGatherMult', magnitude: 1.2 }],
  },
];

/**
 * THE REGISTER, fishing's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const FISHING_LICENSES: CallingLicense[] = [];

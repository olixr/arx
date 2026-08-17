/**
 * THE FILLED HALL — defence's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const DEFENCE_CALLINGS: CallingDef[] = [
  {
    id: 'bulwark',
    skill: 'defence',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Bulwark',
    desc: 'Hold your ground and the ground holds you. Armor while standing firm.',
    color: '#8a94a4',
    effects: [{ kind: 'perk', perk: 'stillArmor', magnitude: 6 }],
  },
  {
    id: 'stonewall',
    skill: 'defence',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Stonewall',
    desc: 'Every shield you raise is a quarter thicker.',
    color: '#6a7484',
    effects: [{ kind: 'perk', perk: 'shieldMult', magnitude: 1.25 }],
  },
];

/**
 * THE REGISTER, defence's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const DEFENCE_LICENSES: CallingLicense[] = [];

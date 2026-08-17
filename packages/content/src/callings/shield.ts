/**
 * THE FILLED HALL — shield's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SHIELD_CALLINGS: CallingDef[] = [
  {
    id: 'shieldarm',
    skill: 'shield',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Shieldarm',
    desc: 'The arm and the wall stop being two things. Armor while a shield is raised.',
    color: '#8ea4b8',
    effects: [{ kind: 'perk', perk: 'shieldArm', magnitude: 3 }],
  },
  {
    id: 'ironback',
    skill: 'shield',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironback',
    desc: 'The wall bites back. Blows that land on the boss cost the striker.',
    color: '#6a7484',
    effects: [{ kind: 'perk', perk: 'shieldThorns', magnitude: 4 }],
  },
];

/**
 * THE REGISTER, shield's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const SHIELD_LICENSES: CallingLicense[] = [];

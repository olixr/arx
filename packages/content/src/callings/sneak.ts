/**
 * THE FILLED HALL — sneak's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const SNEAK_CALLINGS: CallingDef[] = [
  {
    id: 'soft_step',
    skill: 'sneak',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Soft Step',
    desc: 'The floor forgets you faster. Harder to notice, sooner unseen.',
    color: '#8a7fae',
    effects: [{ kind: 'perk', perk: 'sneakFactorBonus', magnitude: 0.05 }],
  },
  {
    id: 'opportunist',
    skill: 'sneak',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Opportunist',
    desc: 'A turned back is a signed invitation. Backstabs cut deeper.',
    color: '#5a4a6a',
    effects: [{ kind: 'perk', perk: 'backstabBonus', magnitude: 0.25 }],
  },
];

/**
 * THE REGISTER, sneak's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const SNEAK_LICENSES: CallingLicense[] = [];

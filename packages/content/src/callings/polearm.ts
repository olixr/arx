/**
 * THE FILLED HALL — polearm's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const POLEARM_CALLINGS: CallingDef[] = [
  {
    id: 'longarm',
    skill: 'polearm',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Longarm',
    desc: 'The point ends the argument a pace sooner. Polearm reach grows.',
    color: '#9a8560',
    effects: [{ kind: 'perk', perk: 'poleReach', magnitude: 0.35 }],
  },
  {
    id: 'impaler',
    skill: 'polearm',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Impaler',
    desc: 'Both hands answer as one. The war grip drives the point deeper.',
    color: '#7a5a48',
    effects: [{ kind: 'perk', perk: 'warGripBonus', magnitude: 0.1 }],
  },
];

/**
 * THE REGISTER, polearm's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const POLEARM_LICENSES: CallingLicense[] = [];

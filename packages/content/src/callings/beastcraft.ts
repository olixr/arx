/**
 * THE FILLED HALL — beastcraft's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const BEASTCRAFT_CALLINGS: CallingDef[] = [
  {
    id: 'shepherds_eye',
    skill: 'beastcraft',
    unlockLevel: 35,
    focusCost: 1,
    name: "Shepherd's Eye",
    desc: 'You see what each animal needs sooner. The brush window opens faster.',
    color: '#96703f',
    effects: [{ kind: 'perk', perk: 'brushRestMult', magnitude: 0.75 }],
  },
  {
    id: 'gentle_hand',
    skill: 'beastcraft',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Gentle Hand',
    desc: 'The animals give more to the hand they trust. Produce sometimes doubles.',
    color: '#c4a35a',
    effects: [{ kind: 'perk', perk: 'doubleProduceChance', magnitude: 0.1 }],
  },
  {
    id: 'drovers_bond',
    skill: 'beastcraft',
    unlockLevel: 60,
    focusCost: 2,
    name: "Drover's Bond",
    desc: 'Beasts kept by a true drover recover their gifts sooner.',
    color: '#a48a4a',
    effects: [{ kind: 'perk', perk: 'produceRestMult', magnitude: 0.85 }],
  },
];

/**
 * THE REGISTER, beastcraft's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const BEASTCRAFT_LICENSES: CallingLicense[] = [];

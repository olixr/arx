/**
 * THE FILLED HALL — vitality's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const VITALITY_CALLINGS: CallingDef[] = [
  {
    id: 'hearty_meals',
    skill: 'vitality',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Hearty Meals',
    desc: 'Every meal goes further. Food heals a quarter more.',
    color: '#d98a5a',
    effects: [{ kind: 'perk', perk: 'foodHealMult', magnitude: 1.25 }],
  },
  {
    id: 'ironblood',
    skill: 'vitality',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Ironblood',
    desc: 'Your wounds close on their own schedule. Steady regeneration.',
    color: '#c4372a',
    effects: [{ kind: 'gear', effect: { kind: 'regen', amount: 1 } }],
  },
];

/**
 * THE REGISTER, vitality's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const VITALITY_LICENSES: CallingLicense[] = [];

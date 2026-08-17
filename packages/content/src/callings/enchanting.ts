/**
 * THE FILLED HALL — enchanting's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ENCHANTING_CALLINGS: CallingDef[] = [
  {
    id: 'dust_thrift',
    skill: 'enchanting',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Dust Thrift',
    desc: 'Not a mote wasted. Reagents are sometimes saved.',
    color: '#b49af0',
    effects: [{ kind: 'materialSave', skill: 'enchanting', chance: 0.15 }],
  },
  {
    id: 'deep_sigils',
    skill: 'enchanting',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Deep Sigils',
    // THE ENCHANTER'S HAND: this Calling always SAID its workings sat
    // deeper in the steel and then quietly handed out a cooldown, which
    // is a personal buff and not a fact about the craft at all. Quality
    // is what "deeper" actually means now, so the text is finally true
    // and the trade's own Calling is about the trade.
    desc: 'Your workings settle deeper into the steel. Every inscription you make runs truer.',
    color: '#8a6ac8',
    effects: [{ kind: 'perk', perk: 'inscribeQuality', magnitude: 5 }],
  },
];

/**
 * THE REGISTER, enchanting's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const ENCHANTING_LICENSES: CallingLicense[] = [];

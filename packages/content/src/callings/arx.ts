/**
 * THE FILLED HALL — arx's ladder (callings-v2-plan.md, the content
 * epoch). Sixteen seats on THE SIXTEEN RUNGS (5..80 by fives), each a
 * package over ONE GRAMMAR, each honed I..IV. The founding pair (20/60)
 * keeps its id and seat by THE NO-LOSS LAW; everything else here is
 * this epoch's authorship.
 */
import type { CallingDef, CallingLicense } from '../callingTypes.js';

export const ARX_CALLINGS: CallingDef[] = [
  {
    id: 'kindled_mind',
    skill: 'arx',
    unlockLevel: 20,
    focusCost: 1,
    name: 'Kindled Mind',
    desc: 'The words come back to you sooner. Ability cooldowns shorten.',
    color: '#b49af0',
    effects: [{ kind: 'gear', effect: { kind: 'cooldown', pct: 5 } }],
  },
  {
    id: 'attuned',
    skill: 'arx',
    unlockLevel: 60,
    focusCost: 2,
    name: 'Attuned',
    desc: 'The current runs closer to the skin. Arx strikes harder.',
    color: '#8a6ac8',
    effects: [{ kind: 'gear', effect: { kind: 'styleDmg', style: 'arx', pct: 6 } }],
  },
];

/**
 * THE REGISTER, arx's column: every page a calling on this ladder
 * lays (status / boon) or reads (stateApplied / hitState) is licensed
 * here by a conscious row, never by authoring the def alone.
 */
export const ARX_LICENSES: CallingLicense[] = [];

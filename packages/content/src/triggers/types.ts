import type { SkillId } from '@arx/shared';
import type { FactionBand } from '../factions/types.js';

/**
 * THE WATCHFUL GROUND (docs/triggers-plan.md) — the trigger vocabulary.
 *
 * A trigger is CONTENT: a slugged patch of watching ground (or a whole
 * zone) with an edge to care about, gates to hold, and one named event
 * it fires into the server's trigger door when a player crosses it
 * lawfully. Subscribers are code; which triggers feed which event slug,
 * with what payload, is the content team's to compose in the Studio.
 *
 * Laws that live here:
 * - THE CONDITION UNION IS CODE (the SLOTS-ARE-CODE spirit): every
 *   `when` kind below has a server read that mirrors the predicate its
 *   precedent already trusts. A Studio-invented kind would never
 *   answer, so the validator refuses unknown kinds by name; new kinds
 *   arrive with the read that answers them.
 * - THE BOUNCE RULE: enter and exit share one cooldown group (default:
 *   the trigger's own id), so a walk-in walk-out inside the refractory
 *   fires exactly once; `minInsideSec` additionally holds the exit
 *   edge until the visit was real.
 * - `once` latches per character forever through the flag door as
 *   `trig:<id>` (dialogue-gateable for free); `setFlag` stamps a plain
 *   character flag on every lawful fire, so triggers chain into
 *   dialogue gates and each other with zero code.
 */

export interface TriggerVec {
  x: number;
  y: number;
}

export type TriggerArea =
  /** A whole authored zone's rect, resolved LIVE (zones are runtime-mutable). */
  | { kind: 'zone'; zone: string }
  | { kind: 'rect'; plane?: string; x: number; y: number; w: number; h: number }
  /** A closed ring of world-tile vertices, 3..64 points. */
  | { kind: 'polygon'; plane?: string; points: TriggerVec[] };

export type TriggerCondition =
  /** Game-clock hours [0,24); from > to wraps past midnight. */
  | { when: 'timeBetween'; from: number; to: number }
  | { when: 'hpBelow'; frac: number }
  | { when: 'hpAbove'; frac: number }
  | { when: 'hasItem'; item: string; qty?: number }
  | { when: 'skillAtLeast'; skill: SkillId; level: number }
  | { when: 'standingAtLeast'; faction: string; band: FactionBand }
  | { when: 'standingAtMost'; faction: string; band: FactionBand }
  /** Plain character flags only (world:/quest:/faction: are answered, never stored). */
  | { when: 'flag'; flag: string }
  | { when: 'notFlag'; flag: string }
  /** A discovery-ledger id, e.g. 'zone:amberford' or 'poi:3,-1'. */
  | { when: 'discovered'; place: string }
  | { when: 'undiscovered'; place: string }
  | { when: 'sneaking' }
  | { when: 'night' }
  | { when: 'day' };

export type TriggerConditionKind = TriggerCondition['when'];

/** The closed roster the validator and the Studio's builder both read. */
export const TRIGGER_CONDITION_KINDS: readonly TriggerConditionKind[] = [
  'timeBetween',
  'hpBelow',
  'hpAbove',
  'hasItem',
  'skillAtLeast',
  'standingAtLeast',
  'standingAtMost',
  'flag',
  'notFlag',
  'discovered',
  'undiscovered',
  'sneaking',
  'night',
  'day',
];

export type TriggerEdge = 'enter' | 'exit';

export interface TriggerDef {
  /** Slug; the trigger's name in the world and its content_docs row id. */
  id: string;
  /** Studio display name. */
  label?: string;
  area: TriggerArea;
  on: TriggerEdge | 'both';
  /** The event slug fired into the trigger door. */
  event: string;
  /** Opaque payload handed to every subscriber of the event. */
  data?: Record<string, string>;
  /** ALL must hold at the edge for the fire to be lawful. */
  conditions?: TriggerCondition[];
  /** Per-character refractory, seconds (in-memory; theatre, not state). */
  cooldownSec?: number;
  /** Shared refractory key; absent = the trigger's own id. */
  cooldownGroup?: string;
  /** The exit edge holds until the player was inside this long. */
  minInsideSec?: number;
  /** Fires once per character forever (character_flags 'trig:<id>'). */
  once?: boolean;
  /** Plain character flag stamped on every lawful fire. */
  setFlag?: string;
  /** Studio kill switch: the trigger stands but never fires. */
  disabled?: boolean;
}

/** The once-latch flag a `once` trigger stamps and checks. */
export function triggerOnceFlag(id: string): string {
  return `trig:${id}`;
}

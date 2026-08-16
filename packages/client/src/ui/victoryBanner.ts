/**
 * THE CHAMPION'S MARK ceremony — "the camp is broken, and the land
 * knows your name."
 *
 * A thin adapter over the Place Herald (herald.ts), fired ONLY by a
 * live S2CPoiCleared — the server sends it to each participant the
 * moment the last fighting body falls, so suppression is structural
 * (a welcome-time banner roster never replays anyone's victory).
 *
 * The voice: the slayer reads THE FELLING BLOW, everyone else who
 * bled the garrison reads STRONGHOLD CLEARED; the lore line speaks
 * the banner's signature (the felling hand, then the fellowship);
 * the facts row lights the broken camp's danger pips on the one
 * ladder and names the tier's walk in THREAT_WORDS — the same facts
 * the discovery ceremony spoke when this place was first found, now
 * answered.
 */
import { THREAT_WORDS, dangerLaw } from '@arx/content';
import type { S2CPoiCleared } from '@arx/shared';
import { dismissHerald, raiseHerald } from './herald.js';

/** The longest hold in the hall — a victory is savored, not glimpsed. */
const HOLD_MS = 5600;

/** The standard's gold — the banner prop and the ceremony agree. */
const ACCENT = '#e2b356';

/** The signature line: the felling hand first, then the fellowship. */
function championsLine(by: string[]): string {
  if (by.length === 0) return 'The deed stands unsigned — the land only knows it is free.';
  if (by.length === 1) return `Broken by ${by[0]}. The banner bears the name.`;
  const fellows = by.slice(1);
  const roll =
    fellows.length === 1 ? fellows[0]! : `${fellows.slice(0, -1).join(', ')} and ${fellows[fellows.length - 1]!}`;
  return `Broken by ${by[0]}, with ${roll}. The banner bears their names.`;
}

export function showPoiCleared(e: S2CPoiCleared): void {
  const tier = Math.max(1, Math.min(5, e.tier ?? 1));
  const [lo, hi] = dangerLaw(tier).npcLevel;
  const threat = THREAT_WORDS[Math.max(0, Math.min(THREAT_WORDS.length - 1, tier))]!;
  raiseHerald({
    kind: 'victory',
    accent: ACCENT,
    kicker: e.slayer ? 'the felling blow' : 'stronghold cleared',
    name: e.name,
    lore: championsLine(e.by),
    facts: {
      tier,
      notes: [`Levels ${lo} to ${hi}`, threat, 'The mark is staked'],
    },
    holdMs: HOLD_MS,
  });
}

export function dismissVictory(): void {
  dismissHerald();
}

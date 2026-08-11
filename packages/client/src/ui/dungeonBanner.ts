/**
 * THE DUNGEON ENTRY BANNER — the threshold announcement.
 *
 * The moment the veil sets you down, the Place Herald names where you
 * now stand: the delve's title in serif, the key that brought you
 * seated above a kicker keyed to its tier, the sigil and power spoken
 * in the facts row. A thin adapter over herald.ts — same ceremony
 * dialect as discovery, different act.
 */
import { RARITY_COLORS, isRarityTier } from '@arx/shared';
import { itemIconUrl } from '../render/icons.js';
import { dismissHerald, raiseHerald } from './herald.js';

/** Enter + hold before the bow-out begins — brief; the halls await. */
const HOLD_MS = 3200;

export function showDungeonEntry(o: {
  name: string;
  sigil: string;
  tier: string;
  theme: string;
  power: number;
}): void {
  const tint = (isRarityTier(o.tier) ? RARITY_COLORS[o.tier] : null) ?? 'var(--gold)';
  raiseHerald({
    kind: 'dungeon',
    accent: tint,
    kicker: `${o.tier} ${o.theme}`,
    name: o.name,
    iconUrl: itemIconUrl('dungeon_key', 64),
    facts: { notes: [`Sigil ${o.sigil}`, `Power ${o.power}`] },
    holdMs: HOLD_MS,
  });
}

/** Clear any showing banner (a fresh crossing restarts the show). */
export function dismissDungeonEntry(): void {
  dismissHerald();
}

/**
 * THE DISCOVERY CEREMONY — "you found a place worth naming."
 *
 * A thin adapter over the Place Herald (herald.ts): it turns a live
 * S2CDiscovery into the herald's spec — accent by kind, the chart
 * sigil, an epithet kicker, and the informed lines the wire and
 * content can speak. Towns read the GAZETTEER; frontier sites read
 * their PoiDef story by the wire's defId; the danger facts come from
 * the one law table (DANGER_LAWS) and the threat ladder's words.
 *
 * Fires ONLY on a live S2CDiscovery — the server sends one per place
 * per lifetime, so suppression is structural. Dungeon-kind entries
 * never splash here: the riftgate's threshold banner is their
 * ceremony.
 */
import { GAZETTEER, POI_DEFS, THREAT_WORDS, dangerLaw } from '@arx/content';
import type { DiscoveryWire } from '@arx/shared';
import { dismissHerald, raiseHerald } from './herald.js';
import { drawDiscoveryMarker } from './map/markers.js';

/** Longer than the dungeon threshold — there is more here to read. */
const HOLD_MS = 4400;

const KIND_WORD: Record<DiscoveryWire['kind'], string> = {
  town: 'A settlement stands here',
  poi: 'A place of note',
  dungeon: 'A delve mouth',
  landmark: 'A landmark of the wilds',
};

const KIND_ACCENT: Record<DiscoveryWire['kind'], string> = {
  town: '#f2c94c',
  poi: '#d9b06c',
  dungeon: '#7ec8e3',
  landmark: '#a8c8a0',
};

/**
 * The sigil is a pure function of the discovery's kind (faded is
 * forced off), and toDataURL is a synchronous canvas readback + PNG
 * encode paid at the exact moment the ceremony fires — memoized so
 * each kind pays it once per session.
 */
const sigilCache = new Map<DiscoveryWire['kind'], string>();

function sigilUrl(d: DiscoveryWire): string {
  const hit = sigilCache.get(d.kind);
  if (hit) return hit;
  const S = 128;
  const cnv = document.createElement('canvas');
  cnv.width = S;
  cnv.height = S;
  const ctx = cnv.getContext('2d')!;
  drawDiscoveryMarker(ctx, { ...d, faded: undefined }, S / 2, S / 2, S * 0.34);
  const url = cnv.toDataURL();
  sigilCache.set(d.kind, url);
  return url;
}

/** The story line stays one breath: the description's first sentence. */
function firstSentence(text: string): string {
  const cut = text.indexOf('. ');
  return cut === -1 ? text : text.slice(0, cut + 1);
}

/** The danger facts a tier speaks: level band and the walk-out's name. */
function tierNotes(tier: number): string[] {
  const [lo, hi] = dangerLaw(tier).npcLevel;
  const threat = THREAT_WORDS[Math.max(0, Math.min(THREAT_WORDS.length - 1, tier))]!;
  return [`Levels ${lo} to ${hi}`, threat];
}

export function showDiscovery(d: DiscoveryWire): void {
  let kicker = KIND_WORD[d.kind];
  let lore: string | undefined;
  let facts: { tier?: number; notes: string[] } | undefined;

  const def = d.defId ? POI_DEFS.get(d.defId) : undefined;
  if (d.id.startsWith('zone:')) {
    const entry = GAZETTEER[d.id.slice(5)];
    if (entry) {
      kicker = entry.epithet;
      lore = entry.line;
      if (entry.country !== undefined) {
        // The pips speak for the land around the walls, not the town —
        // say so, or a haven wearing five pips reads as a deathtrap.
        facts = { tier: entry.country, notes: ['The country beyond', ...tierNotes(entry.country)] };
      }
    }
  } else if (def) {
    if (def.haven) kicker = d.kind === 'town' ? 'A haven on the road' : kicker;
    if (def.description) lore = firstSentence(def.description);
    if (d.tier !== undefined) {
      const notes = tierNotes(d.tier);
      // A site grown bold is BUSIER, not quietly deadlier — say so.
      if ((d.stage ?? 0) > 0) notes.push('Grown bold');
      facts = { tier: d.tier, notes };
    }
  } else if (d.tier !== undefined) {
    facts = { tier: d.tier, notes: tierNotes(d.tier) };
  }

  raiseHerald({
    kind: d.kind,
    accent: KIND_ACCENT[d.kind],
    kicker,
    name: d.name,
    iconUrl: sigilUrl(d),
    lore,
    facts,
    holdMs: HOLD_MS,
  });
}

export function dismissDiscovery(): void {
  dismissHerald();
}

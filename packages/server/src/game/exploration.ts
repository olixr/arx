import { DISCOVER_TILES, DUNGEON_MIN_Y, type DiscoveryWire } from '@arx/shared';

/**
 * THE PLACE LEDGER — pure discovery detection (the SocialSystem law:
 * subsystem logic lives behind plain data, testable without the
 * 10k-line GameServer).
 *
 * A discovery is keyed forever: 'zone:<id>' for authored places,
 * 'poi:<cx>,<cy>' for frontier sites, 'dungeon:<x>,<y>' for riftgates
 * delved. Zones discover by rect containment (you are IN the town);
 * POI sites by anchor proximity (DISCOVER_TILES — the camp announces
 * itself when you can see its fires). Landmark-kind discoveries wait
 * on geography landforms carrying display names (they don't yet).
 *
 * Rediscovery: a faded 'poi:' marker whose cell holds a LIVE site
 * again fires a fresh discovery — the world turned over and something
 * new stands on the old ground.
 */

export interface DiscoveryZone {
  id: string;
  name: string;
  origin: { x: number; y: number };
  width: number;
  height: number;
}

export interface DiscoverySite {
  cellX: number;
  cellY: number;
  tier: number;
  anchorX: number;
  anchorY: number;
  defId: string;
}

export interface FoundDiscovery {
  d: DiscoveryWire;
  /** Ledger epoch at the moment of discovery ('poi:' kind only). */
  epoch?: number;
  /** True when this overwrites a faded marker for the same cell. */
  rediscovered: boolean;
}

export function zoneDiscoveryId(zoneId: string): string {
  return `zone:${zoneId}`;
}

export function poiDiscoveryId(cellX: number, cellY: number): string {
  return `poi:${cellX},${cellY}`;
}

export function dungeonDiscoveryId(tx: number, ty: number): string {
  return `dungeon:${tx},${ty}`;
}

export function findDiscoveries(
  x: number,
  y: number,
  zones: Iterable<DiscoveryZone>,
  sites: Iterable<{ site: DiscoverySite; epoch: number }>,
  defInfo: (defId: string) => { name: string; haven?: boolean } | undefined,
  known: ReadonlyMap<string, { faded?: boolean }>,
): FoundDiscovery[] {
  const out: FoundDiscovery[] = [];

  for (const z of zones) {
    // Composed POI zones (id 'poi:cx,cy') belong to the site path, and
    // anything standing in instance space is a per-run dungeon, not a
    // place. The dark band's authored zones DO count — finding the
    // Undercroft is a discovery.
    if (z.id.startsWith('poi:') || z.origin.y >= DUNGEON_MIN_Y) continue;
    if (x < z.origin.x || x >= z.origin.x + z.width) continue;
    if (y < z.origin.y || y >= z.origin.y + z.height) continue;
    const id = zoneDiscoveryId(z.id);
    if (known.has(id)) continue;
    out.push({
      d: {
        id,
        kind: 'town',
        name: z.name,
        x: Math.round(z.origin.x + z.width / 2),
        y: Math.round(z.origin.y + z.height / 2),
      },
      rediscovered: false,
    });
  }

  const r2 = DISCOVER_TILES * DISCOVER_TILES;
  for (const { site, epoch } of sites) {
    const dx = site.anchorX - x;
    const dy = site.anchorY - y;
    if (dx * dx + dy * dy > r2) continue;
    const id = poiDiscoveryId(site.cellX, site.cellY);
    const prior = known.get(id);
    // Known and still standing = nothing new; known but faded with a
    // live site here = the frontier turned over and was found again.
    if (prior && !prior.faded) continue;
    const info = defInfo(site.defId);
    if (!info) continue;
    out.push({
      d: {
        id,
        kind: info.haven ? 'town' : 'poi',
        name: info.name,
        x: site.anchorX,
        y: site.anchorY,
        tier: site.tier,
      },
      epoch,
      rediscovered: prior !== undefined,
    });
  }

  return out;
}

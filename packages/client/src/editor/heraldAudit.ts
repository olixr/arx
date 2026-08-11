/**
 * THE HERALD BENCH — `?herald` replays the Place Herald ceremonies on
 * a loop so the show can be photographed and judged without walking
 * the frontier. Fixtures run through the REAL adapters (discovery +
 * dungeon threshold), so what the bench shows is what the wire shows.
 * `?herald=N` pins one fixture. Same contract as `?kit`: dev-only,
 * read-only, never shipped logic.
 */
import { showDiscovery } from '../ui/discoveryBanner.js';
import { showDungeonEntry } from '../ui/dungeonBanner.js';

const FIXTURES: ReadonlyArray<() => void> = [
  () => showDiscovery({ id: 'zone:dawnmead', kind: 'town', name: 'Dawnmead', x: 0, y: 0 }),
  () => showDiscovery({ id: 'zone:hartfell', kind: 'town', name: 'Hartfell', x: 0, y: 0 }),
  () =>
    showDiscovery({
      id: 'poi:12,-4',
      kind: 'poi',
      name: 'Goblin warcamp',
      x: 0,
      y: 0,
      tier: 3,
      defId: 'goblin_warcamp',
    }),
  () =>
    showDiscovery({
      id: 'poi:9,2',
      kind: 'poi',
      name: 'Barrow of the old north',
      x: 0,
      y: 0,
      tier: 5,
      stage: 2,
      defId: 'fell_barrow',
    }),
  () =>
    showDiscovery({
      id: 'poi:3,3',
      kind: 'town',
      name: "Wayfarers' waystation",
      x: 0,
      y: 0,
      tier: 3,
      defId: 'waystation',
    }),
  () => showDiscovery({ id: 'zone:the_sisters', kind: 'landmark', name: 'The Sisters', x: 0, y: 0 }),
  () =>
    showDungeonEntry({ name: 'The Sunken Crypt', sigil: 'KAR VOTH', tier: 'rare', theme: 'crypt', power: 30 }),
];

/** A beat longer than the longest hold, so the bow-out fully plays. */
const CYCLE_MS = 5600;

export function showHeraldAudit(): void {
  const search = new URLSearchParams(location.search);
  const param = search.get('herald');
  const pin = param === null || param === '' ? NaN : Number(param);
  let i = 0;
  const fire = (): void => {
    const idx = Number.isFinite(pin)
      ? ((Math.trunc(pin) % FIXTURES.length) + FIXTURES.length) % FIXTURES.length
      : i++ % FIXTURES.length;
    FIXTURES[idx]!();
  };
  fire();
  // `&freeze=MS` pins the first show mid-flight for a choreography
  // photograph — no cycling, no bow-out.
  const freezeAt = Number(search.get('freeze'));
  if (Number.isFinite(freezeAt) && search.has('freeze')) {
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        const { freezeHerald } = await import('../ui/herald.js');
        freezeHerald(freezeAt);
      }),
    );
    return;
  }
  window.setInterval(fire, CYCLE_MS);
}

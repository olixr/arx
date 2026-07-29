import { hashCoords } from '@arx/shared';

/**
 * THE FRONTIER DIALS — content's half of the living frontier
 * (docs/living-frontier-plan.md; the server's tickFrontier owns the
 * clockwork). Every pacing constant of the ember/fallow/renewal loop
 * lives HERE and nowhere else — the dial law: tuning the frontier is a
 * content edit, never a hunt through server literals. Phase 6 lifts
 * this table into a content doc; the shape ships now so nothing has to
 * move later.
 */
export const FRONTIER = {
  /** Ticks between frontier passes (~15 s at 20 Hz). */
  tickTicks: 300,
  /**
   * How long a cleared site stands as the player's broken trophy
   * before it may dissolve — long enough to loot, savor, and screenshot;
   * short enough that the world visibly moves on. [min, max] ms,
   * hash-jittered per site so camps never fade in lockstep.
   */
  emberLingerMs: [8 * 60_000, 12 * 60_000] as const,
  /**
   * How long a dissolved cell rests before it may host again — the
   * meadow heals before anything new moves in. [min, max] ms.
   */
  fallowMs: [3 * 3_600_000, 6 * 3_600_000] as const,
  /**
   * No site dissolves or stands within this many tiles of any player
   * (anchor distance). Comfortably past the screen at every zoom — the
   * dignity law, promoted from bodies to whole zones.
   */
  dignityTiles: 48,
  /**
   * Renewal annulus (tiles from the chosen player) where a banked
   * credit stands the frontier's next site: past dignity and the
   * screen, inside the materialization pad so it stands soon.
   */
  renewalRing: [64, 160] as const,
  /** Candidate cells probed per renewal attempt before the credit waits. */
  renewalTries: 6,
  // ---- Phase 2: THE BOLDNESS LADDER ----
  /**
   * Real time a DISCOVERED, unanswered site stands before it climbs one
   * boldness rung. [min, max] ms, hash-jittered per cell+stage so a
   * frontier of camps never stages up in lockstep. Observation never
   * escalates — only time does, and only after first discovery.
   */
  stageMs: [1.75 * 86_400_000, 2.25 * 86_400_000] as const,
  /** The ladder's top — bounded escalation by construction. */
  stageMax: 3,
  /** Boldness rung at which a core may seed satellite camps. */
  satelliteStage: 2,
  /** Live satellites a core may keep at once. */
  satelliteMax: 2,
  /**
   * How long a scattered satellite lingers after its core breaks —
   * the family dissolves quickly once word spreads, but never in view.
   * [min, max] ms.
   */
  scatterLingerMs: [2 * 60_000, 4 * 60_000] as const,
  /**
   * Regional escalation ceiling: at most this many stage-2+ cores per
   * (2·regionCells+1)² cell neighborhood — the spiral has a roof.
   */
  regionBoldMax: 2,
  /** Neighborhood radius (in POI cells) for the cap and the calm law. */
  regionCells: 2,
  /**
   * THE RELAX WINDOW: real hours after ANY garrison wipe during which
   * the surrounding cells see no stage-ups, no satellites, no fallow
   * wakes, and no renewal landings — the player's victory audibly
   * holds (the RimWorld/L4D cooldown-floor law).
   */
  calmMs: 12 * 3_600_000,
} as const;

/** Frontier RNG salts — the named-streams law (the ST_* family's kin). */
const ST_EMBER = 0x501e5c;
const ST_FALLOW = 0x501e5d;
const ST_STAGE = 0x501e5e;

function jitter(
  seed: number,
  salt: number,
  cellX: number,
  cellY: number,
  epoch: number,
  range: readonly [number, number],
): number {
  const h = hashCoords(hashCoords((seed ^ salt) >>> 0, cellX, cellY), epoch, salt);
  return range[0] + (h % (range[1] - range[0] + 1));
}

/** Ember linger for a site — pure, stable for the cell's epoch. */
export function emberLingerFor(seed: number, cellX: number, cellY: number, epoch: number): number {
  return jitter(seed, ST_EMBER, cellX, cellY, epoch, FRONTIER.emberLingerMs);
}

/** Fallow rest for a dissolved cell — pure, stable for the cell's epoch. */
export function fallowRestFor(seed: number, cellX: number, cellY: number, epoch: number): number {
  return jitter(seed, ST_FALLOW, cellX, cellY, epoch, FRONTIER.fallowMs);
}

/** Time on the current rung before the next stage-up — pure per cell+stage. */
export function stageWaitFor(
  seed: number,
  cellX: number,
  cellY: number,
  stage: number,
): number {
  return jitter(seed, ST_STAGE, cellX, cellY, stage, FRONTIER.stageMs);
}

/** Scatter linger for a satellite whose core broke — pure per cell. */
export function scatterLingerFor(seed: number, cellX: number, cellY: number): number {
  return jitter(seed, ST_EMBER ^ 0x5ca7, cellX, cellY, 0, FRONTIER.scatterLingerMs);
}

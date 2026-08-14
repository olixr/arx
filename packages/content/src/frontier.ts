import { hashCoords } from '@arx/shared';

/** A jitter band in ms: [min, max], inclusive. */
export type FrontierRange = readonly [number, number];

/**
 * The whole dial table's shape — the Studio edits exactly this. Every
 * field is REQUIRED: a frontier with a missing dial is a frontier with
 * an undefined law, and the validator refuses it.
 */
export interface FrontierDef {
  tickTicks: number;
  emberLingerMs: FrontierRange;
  fallowMs: FrontierRange;
  dignityTiles: number;
  renewalRing: FrontierRange;
  renewalTries: number;
  stageMs: FrontierRange;
  stageMax: number;
  satelliteStage: number;
  satelliteMax: number;
  scatterLingerMs: FrontierRange;
  regionBoldMax: number;
  regionCells: number;
  calmMs: number;
  watchTiles: number;
  marchTiles: number;
  creepMs: FrontierRange;
  claimR: number;
  claimReach: number;
  claimPad: number;
  raidRollMs: number;
  raidChance: number;
  raidCooldownMs: number;
  raidLossCooldownMs: number;
  raidStandoffTiles: number;
  peddlerChance: number;
  peddlerLingerMs: FrontierRange;
  wildBudgetBase: number;
  wildKnotProbes: number;
  trailReach: number;
  holdEmberMs: FrontierRange;
  /** THE LONG WAR (strongholds Phase 5): a broken CAPITAL lingers. */
  strongholdEmberMs: FrontierRange;
  /** The seat rests before new walls rise (long — a capital is an age). */
  strongholdFallowMs: FrontierRange;
  /** Countries whose heart reads below this tier keep no capital. */
  capitalTierFloor: number;
  /** Rough-ground fraction the relaxed capital siting tolerates. */
  capitalRoughMax: number;
  /**
   * THE GATHERED MARCHES (the hybrid charter): how far past a
   * capital's masked ground its camps gather, in tiles — the band
   * where the clusters-of-clusters read lives.
   */
  marchBand: number;
  /** POI-chance multiplier inside the march band (clamped by law). */
  marchGather: number;
  territoryBias: number;
}

/**
 * THE FRONTIER DIALS — content's half of the living frontier
 * (docs/living-frontier-plan.md; the server's tickFrontier owns the
 * clockwork). Every pacing constant of the ember/fallow/renewal loop
 * lives HERE and nowhere else — the dial law: tuning the frontier is a
 * content edit, never a hunt through server literals. Phase 6 lifted
 * the table into a live content doc (kind 'frontier', the two-hash
 * law): the DB is the truth, this object is the shipped seed AND the
 * live registry — replaceFrontier swaps the fields in place, so every
 * consumer that reads FRONTIER.x at call time sees the Studio's edit
 * on the very next beat. Never destructure a dial into a long-lived
 * variable.
 */
export const FRONTIER: FrontierDef = {
  /** Ticks between frontier passes (~15 s at 20 Hz). */
  tickTicks: 300,
  /**
   * How long a cleared site stands as the player's broken trophy
   * before it may dissolve — long enough to loot, savor, and screenshot;
   * short enough that the world visibly moves on. [min, max] ms,
   * hash-jittered per site so camps never fade in lockstep.
   */
  emberLingerMs: [8 * 60_000, 12 * 60_000],
  /**
   * How long a dissolved cell rests before it may host again — the
   * meadow heals before anything new moves in. [min, max] ms.
   */
  fallowMs: [3 * 3_600_000, 6 * 3_600_000],
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
  renewalRing: [64, 160],
  /** Candidate cells probed per renewal attempt before the credit waits. */
  renewalTries: 6,
  // ---- Phase 2: THE BOLDNESS LADDER ----
  /**
   * Real time a DISCOVERED, unanswered site stands before it climbs one
   * boldness rung. [min, max] ms, hash-jittered per cell+stage so a
   * frontier of camps never stages up in lockstep. Observation never
   * escalates — only time does, and only after first discovery.
   */
  stageMs: [1.75 * 86_400_000, 2.25 * 86_400_000],
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
  scatterLingerMs: [2 * 60_000, 4 * 60_000],
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
  // ---- Phase 3: THE TOWN FEELS IT ----
  /**
   * The speaker's watch (tiles): how far a guard, warden, or keeper can
   * credibly know about from their post. Every `world:` dialogue answer
   * — threat_near, threat_bold, calm, relief, toll_near — is scoped to
   * standing sites within this range of the SPEAKING actor.
   */
  watchTiles: 96,
  /**
   * A town's marches (tiles from its danger anchor): the reach within
   * which a full-boldness family is close enough to answer the town's
   * road. Wider than the watch — the toll forks before the guards can
   * see the camp from the wall.
   */
  marchTiles: 192,
  /**
   * How long a stage-3 (full-strength) family inside a town's marches
   * stands unanswered before the creep forks the road: a road_toll
   * micro-site stands on the townward side. [min, max] ms,
   * hash-jittered per cell. Towns are never sacked — the failure state
   * is MORE game on the road, not less town.
   */
  creepMs: [1.0 * 86_400_000, 1.5 * 86_400_000],
  // ---- Phase 4: THE HEARTH WATCH ----
  /**
   * A claimed hearth's base ring (tiles): the yard a home commands
   * even before a fence goes up. One zone clearance — nothing may
   * materialize inside it.
   */
  claimR: 24,
  /**
   * How far from the bed the owner's built tiles still grow the ring
   * (tiles): the ring covers the whole homestead flood within reach,
   * never a fence-post teleported across the map.
   */
  claimReach: 48,
  /** Padding past the farthest counted built tile (tiles). */
  claimPad: 8,
  /**
   * THE COVETOUS DICE (the Valheim law): one roll per shard on this
   * cadence; most rolls pass in silence.
   */
  raidRollMs: 46 * 60_000,
  /** Chance a roll picks anyone at all. */
  raidChance: 0.2,
  /**
   * Real hours of raid quiet after a squat is answered — cleared, or
   * paid for in blood (losses earn mercy, not a chain-raid).
   */
  raidCooldownMs: 48 * 3_600_000,
  /** The shorter mercy stamp for dying to the squat. */
  raidLossCooldownMs: 24 * 3_600_000,
  /**
   * The squat stands in a cell edge-adjacent to the claim ring but its
   * anchor keeps at least this many tiles from the ring's edge — heard
   * about, walked to, never looming over the fence.
   */
  raidStandoffTiles: 16,
  // ---- Phase 5: THE ROAD'S FORTUNE ----
  /**
   * When a renewal credit is spent, the chance the world deals fortune
   * instead of trouble: a peddler's rest stands where a camp would
   * have. Rare on purpose — a kindness you remember, not a shop you
   * schedule around.
   */
  peddlerChance: 0.18,
  /**
   * How long a peddler's rest stands before she packs the cart and
   * moves on — the ember clock is stamped ON ARRIVAL (no clear needed;
   * nobody "solves" a peddler). [min, max] ms, hash-jittered per site.
   */
  peddlerLingerMs: [2 * 3_600_000, 4 * 3_600_000],
  /**
   * THE HERD AND THE PACK (docs/lived-in-land-plan.md Phase 1): the
   * ambient-body budget near each player is wildBudgetBase ×
   * DANGER_LAWS[tier].wildDensity, counted in BODIES and spawned in
   * KNOTS. 14 reads: ~4 bodies at tier 1, ~8 in the deep frontier —
   * a walk with company, never a wall of teeth.
   */
  wildBudgetBase: 14,
  /**
   * Anchor candidates the wild spawner probes per pass for an
   * under-budget player. One lawful anchor deals one whole knot; more
   * probes fill the budget faster without ever bursting into view
   * (the annulus and dignity guards are per-probe).
   */
  wildKnotProbes: 3,
  /**
   * THE WORN PATH (lived-in-land Phase 3): how far a site's trail arm
   * walks toward the road it watches before tapering out (tiles).
   * Occupation wears the ground — a camp that has stood for weeks has
   * a path to the road it raids, and the path is both fiction and the
   * discovery affordance: cross it anywhere and follow it home.
   */
  trailReach: 48,
  /**
   * THE WAR-GROUND (lived-in-land Phase 4): how long a broken hold
   * stands as the player's trophy before dissolving — longer than a
   * camp's ember because a five-to-ten-minute clear earns a longer
   * savor. [min, max] ms, hash-jittered per site.
   */
  holdEmberMs: [15 * 60_000, 20 * 60_000],
  strongholdEmberMs: [25 * 60_000, 35 * 60_000],
  strongholdFallowMs: [12 * 60 * 60_000, 24 * 60 * 60_000],
  capitalTierFloor: 3,
  capitalRoughMax: 0.15,
  marchBand: 160,
  marchGather: 1.6,
  /**
   * THE TERRITORY FIELD (lived-in-land Phase 5): how hard the land
   * leans toward its country's family — a matching archetype's pick
   * weight multiplies by this in sites, finds, and wild knots alike.
   * 1 turns territory off; the lean NEVER gates (every eligible
   * archetype still rolls everywhere — the land leans, it does not
   * repeat).
   */
  territoryBias: 3,
};

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

/** How long a stage-3 family in the marches waits before the toll forks. */
export function creepWaitFor(seed: number, cellX: number, cellY: number): number {
  return jitter(seed, ST_STAGE ^ 0xc4ee, cellX, cellY, 0, FRONTIER.creepMs);
}

/** How long a peddler's rest stands — pure per cell + epoch. */
export function peddlerLingerFor(
  seed: number,
  cellX: number,
  cellY: number,
  epoch: number,
): number {
  return jitter(seed, ST_EMBER ^ 0x9edd, cellX, cellY, epoch, FRONTIER.peddlerLingerMs);
}

/** How long a broken WAR-GROUND lingers (Phase 4) — pure per cell + epoch. */
export function holdEmberFor(
  seed: number,
  cellX: number,
  cellY: number,
  epoch: number,
): number {
  return jitter(seed, ST_EMBER ^ 0x401d, cellX, cellY, epoch, FRONTIER.holdEmberMs);
}

/** How long a broken CAPITAL lingers as loot-walk (strongholds Phase 5). */
export function strongholdEmberFor(
  seed: number,
  latticeX: number,
  latticeY: number,
  epoch: number,
): number {
  return jitter(seed, ST_EMBER ^ 0x5ca7, latticeX, latticeY, epoch, FRONTIER.strongholdEmberMs);
}

/** How long the seat rests before new walls rise on it. */
export function strongholdFallowFor(
  seed: number,
  latticeX: number,
  latticeY: number,
  epoch: number,
): number {
  return jitter(seed, ST_FALLOW ^ 0x5ca7, latticeX, latticeY, epoch, FRONTIER.strongholdFallowMs);
}

// ------------------------------------------------- the Studio's half

/** The authored dials exactly as shipped — the CMS revert target. */
export const AUTHORED_FRONTIER: Readonly<FrontierDef> = Object.freeze({
  ...FRONTIER,
  emberLingerMs: [...FRONTIER.emberLingerMs] as [number, number],
  fallowMs: [...FRONTIER.fallowMs] as [number, number],
  renewalRing: [...FRONTIER.renewalRing] as [number, number],
  stageMs: [...FRONTIER.stageMs] as [number, number],
  scatterLingerMs: [...FRONTIER.scatterLingerMs] as [number, number],
  creepMs: [...FRONTIER.creepMs] as [number, number],
  peddlerLingerMs: [...FRONTIER.peddlerLingerMs] as [number, number],
  holdEmberMs: [...FRONTIER.holdEmberMs] as [number, number],
  strongholdEmberMs: [...FRONTIER.strongholdEmberMs] as [number, number],
  strongholdFallowMs: [...FRONTIER.strongholdFallowMs] as [number, number],
});

export type ValidateFrontierResult =
  | { ok: true; def: FrontierDef }
  | { ok: false; errors: string[] };

/**
 * THE ONE VALIDATOR for the weather: every dial bounds-checked, every
 * cross-law named. Runs on the authored seed at module load, on DB
 * rows at boot, and on every Studio save — a frontier that could hang
 * the clockwork (zero cadence, inverted band, a mercy stamp longer
 * than the crime) never reaches the live registry.
 */
export function validateFrontier(raw: unknown): ValidateFrontierResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['frontier doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const num = (key: keyof FrontierDef, lo: number, hi: number, int = false): number => {
    const v = doc[key];
    // THE BACKFILL LAW: an ABSENT dial adopts the shipped default, so
    // a doc the Studio saved before the dial existed keeps its edits
    // when the table grows (the geography `fens` precedent). Only
    // absence is forgiven — a present-but-malformed dial is refused,
    // and a typo still dies loudly as an unknown key below.
    if (v === undefined) return AUTHORED_FRONTIER[key] as number;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (int && !Number.isInteger(v)) errors.push(`${key} must be an integer`);
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };
  const range = (key: keyof FrontierDef, lo: number, hi: number): [number, number] => {
    const v = doc[key];
    // THE BACKFILL LAW — see num() above.
    if (v === undefined) {
      const a = AUTHORED_FRONTIER[key] as FrontierRange;
      return [a[0], a[1]];
    }
    if (
      !Array.isArray(v) ||
      v.length !== 2 ||
      typeof v[0] !== 'number' ||
      typeof v[1] !== 'number' ||
      !Number.isFinite(v[0]) ||
      !Number.isFinite(v[1])
    ) {
      errors.push(`${key} must be a [min, max] pair of numbers`);
      return [lo, lo];
    }
    if (v[0] < lo || v[1] > hi) errors.push(`${key} must sit inside [${lo}, ${hi}]`);
    if (v[0] > v[1]) errors.push(`${key} min must not exceed max`);
    return [v[0], v[1]];
  };
  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const def: FrontierDef = {
    tickTicks: num('tickTicks', 20, 12_000, true),
    emberLingerMs: range('emberLingerMs', 10_000, 24 * HOUR),
    fallowMs: range('fallowMs', MIN, 14 * DAY),
    dignityTiles: num('dignityTiles', 8, 256),
    renewalRing: range('renewalRing', 16, 1024),
    renewalTries: num('renewalTries', 1, 64, true),
    stageMs: range('stageMs', MIN, 30 * DAY),
    stageMax: num('stageMax', 1, 3, true),
    satelliteStage: num('satelliteStage', 1, 3, true),
    satelliteMax: num('satelliteMax', 0, 8, true),
    scatterLingerMs: range('scatterLingerMs', 10_000, 2 * HOUR),
    regionBoldMax: num('regionBoldMax', 1, 16, true),
    regionCells: num('regionCells', 1, 8, true),
    calmMs: num('calmMs', 0, 7 * DAY),
    watchTiles: num('watchTiles', 16, 512),
    marchTiles: num('marchTiles', 16, 1024),
    creepMs: range('creepMs', MIN, 30 * DAY),
    claimR: num('claimR', 4, 64),
    claimReach: num('claimReach', 4, 256),
    claimPad: num('claimPad', 0, 64),
    raidRollMs: num('raidRollMs', MIN, 24 * HOUR),
    raidChance: num('raidChance', 0, 1),
    raidCooldownMs: num('raidCooldownMs', 0, 14 * DAY),
    raidLossCooldownMs: num('raidLossCooldownMs', 0, 14 * DAY),
    raidStandoffTiles: num('raidStandoffTiles', 0, 128),
    peddlerChance: num('peddlerChance', 0, 1),
    peddlerLingerMs: range('peddlerLingerMs', MIN, 24 * HOUR),
    wildBudgetBase: num('wildBudgetBase', 0, 64, true),
    wildKnotProbes: num('wildKnotProbes', 1, 8, true),
    trailReach: num('trailReach', 16, 96, true),
    holdEmberMs: range('holdEmberMs', MIN, 2 * HOUR),
    strongholdEmberMs: range('strongholdEmberMs', MIN, 4 * HOUR),
    strongholdFallowMs: range('strongholdFallowMs', HOUR, 7 * DAY),
    capitalTierFloor: num('capitalTierFloor', 3, 5, true),
    capitalRoughMax: num('capitalRoughMax', 0, 0.5),
    marchBand: num('marchBand', 64, 320, true),
    marchGather: num('marchGather', 1, 2.5),
    territoryBias: num('territoryBias', 1, 10),
  };
  // Unknown keys are refused loudly — a typoed dial must never sit in
  // the doc pretending to steer anything.
  const known = new Set(Object.keys(def));
  for (const key of Object.keys(doc)) {
    if (!known.has(key)) errors.push(`unknown dial '${key}'`);
  }
  // The cross-laws, named:
  if (def.satelliteStage > def.stageMax) {
    errors.push('satelliteStage must not exceed stageMax (satellites need a rung to stand on)');
  }
  if (def.marchTiles < def.watchTiles) {
    errors.push('marchTiles must not be narrower than watchTiles (word travels farther than sight)');
  }
  if (def.raidLossCooldownMs > def.raidCooldownMs) {
    errors.push('raidLossCooldownMs must not exceed raidCooldownMs (a loss earns the SHORTER mercy)');
  }
  if (def.claimReach < def.claimR) {
    errors.push('claimReach must not be narrower than claimR (the flood grows the yard, never shrinks it)');
  }
  if (def.strongholdEmberMs[0] < def.holdEmberMs[0]) {
    errors.push('strongholdEmberMs must not start below holdEmberMs (a capital is savored longer than a hold)');
  }
  if (def.strongholdFallowMs[0] < def.fallowMs[0]) {
    errors.push('strongholdFallowMs must not start below fallowMs (a fallen age rests longer than a camp)');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def };
}

/**
 * THE CMS HOOK: swap the live dials in place — object identity stable,
 * so every consumer that reads FRONTIER.x at call time sees the edit
 * on the next beat, and nothing re-registers. Only ever runs against a
 * validated doc.
 */
export function replaceFrontier(next: FrontierDef): void {
  Object.assign(FRONTIER, next, {
    emberLingerMs: [...next.emberLingerMs],
    fallowMs: [...next.fallowMs],
    renewalRing: [...next.renewalRing],
    stageMs: [...next.stageMs],
    scatterLingerMs: [...next.scatterLingerMs],
    creepMs: [...next.creepMs],
    peddlerLingerMs: [...next.peddlerLingerMs],
    holdEmberMs: [...next.holdEmberMs],
  });
}

// The shipped seed must satisfy its own law — loudly, at build time.
{
  const res = validateFrontier(AUTHORED_FRONTIER);
  if (!res.ok) throw new Error(`shipped FRONTIER dials invalid:\n  ${res.errors.join('\n  ')}`);
}

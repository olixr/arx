import { BOSS_KIT_MAX, TEMPERAMENT_BOUNDS } from './npcs/limits.js';
export { BOSS_KIT_MAX, TEMPERAMENT_BOUNDS } from './npcs/limits.js';
import { NPC_DEFS } from './npcs/defs.js';
export { NPC_DEFS } from './npcs/defs.js';
export { validateNpcDef } from './npcs/validate.js';
import { STATUS_IDS, type StatusApply, type StatusId, PACE_HP_MULT } from '@arx/shared';
import { DAMAGE_LANES, NPC_LANES, type NpcLanes } from './npcLanes.js';


/**
 * THE KIT (docs/enemy-arts-plan.md) — one authored voice in a foe's
 * repertoire, run through the one ability interpreter with fromNpc.
 * Pacing lives HERE, never on the AbilityDef (standing law: NPC
 * abilities author cooldownTicks 0). A windup makes it a true cast:
 * the body plants, the conjure shows, and the fire waits — the
 * interrupt window and the shape's own fuse are two honest clocks
 * in series. Damage above the def's basic die must buy its premium
 * with warning time (THE TELEGRAPH PREMIUM, contract-tested).
 */
export interface NpcKitEntry {
  /** AbilityDef id (content/abilities.ts); shape must be NPC-safe. */
  ability: string;
  /** Ticks between uses, paid when the cast FIRES. */
  cooldownTicks: number;
  /** The drawn breath: planted wind-up ticks before the fire. 0/absent = instant. */
  windupTicks?: number;
  /** Eligibility band vs target distance (absent = any). */
  minRange?: number;
  maxRange?: number;
  /** HP-fraction gates (0..1): enrages and desperation casts. */
  hpBelow?: number;
  hpAbove?: number;
  /** Selection weight among eligible entries (default 1). */
  weight?: number;
  /** Cooldown seeded at spawn; default min(cooldownTicks, 60) — never open with the special. */
  initialCooldownTicks?: number;
  /**
   * Where a ground shape stakes its point at fire: the quarry's feet
   * ('target', default), the caster itself ('self'), or the quarry's
   * projected stride ('lead') — the orbit-breaker, capped and
   * walkability-checked server-side.
   */
  aim?: 'target' | 'self' | 'lead';
  /** Entry wakes only at def level >= this — scaled reissues learn new voices at depth. */
  minLevel?: number;
  /** Fire also rallies the pack (bounded), the old howl behavior — authored, not implied. */
  rally?: boolean;
  /**
   * THE LOPE (docs/boss-system-plan.md, the wolf crown): this voice is
   * spoken FROM DISTANCE — picked in close, the body breaks away at a
   * sprint and opens the gap to `minRange` before the wind begins
   * (cornered at a wall or timed out, the word is spoken where it
   * stands). minRange is the DESTINATION, not an eligibility gate, so
   * a lope entry stays pickable at any closer range. Requires
   * minRange > 0. The hit-and-run verb: harry, break, call, return.
   */
  lope?: boolean;
  /**
   * THE DREAD CROWN (docs/boss-system-plan.md): entry wakes at this
   * boss phase and after (0-based; absent = 0, the opening stance).
   * Only meaningful on a def that wears a `boss` block.
   */
  phase?: number;
  /** ...and retires after this phase — an early voice the crown outgrows. */
  phaseMax?: number;
  /**
   * THE CHAIN: after this entry fires, the kit entry carrying the
   * named ability is queued next — cooldown waived, its OWN windup
   * still telegraphs (every link in a combo is honest). Chains are
   * acyclic and cap at 3 links, validator-enforced. Boss-only.
   */
  then?: string;
}

/** Thrown/shot basic attack instead of a melee lunge. */
export interface NpcRanged {
  range: number;
  projectileSpeed: number;
}

/**
 * THE DREAD CROWN — one rung of a boss's phase ladder
 * (docs/boss-system-plan.md LAW 3, THE TURNING). The ladder is
 * one-way: healing never demotes, and a full leash reset is the only
 * road back to the opening stance.
 */
export interface BossPhaseDef {
  /**
   * The fight turns when the live HP fraction crosses under this.
   * Absent only on the first rung (the opening stance); later rungs
   * author strictly descending fractions in (0, 1).
   */
  hpBelow?: number;
  /** "The Breaking" — the client's phase reveal line. */
  name?: string;
  /** Said aloud on entry (sayAloud: log + bubble — the public voice). */
  bark?: string;
  /**
   * Ability cast FREE on phase entry (cooldown waived). Must name an
   * ability carried by one of this def's own kit entries — the turn
   * fires through the one cast engine, and the entry's own windup
   * still telegraphs it. The phase turn is loud, never cheap.
   */
  entry?: string;
  /**
   * Kit cooldown scale while this phase holds (0.5..1) — the fight
   * accelerates honestly: same voices, drawn breath, shorter rests.
   */
  cdMult?: number;
  /** Movement scale while this phase holds (0.75..1.5). */
  speedMult?: number;
}

/**
 * THE DREAD CROWN (docs/boss-system-plan.md): the boss block. A LAYER
 * on the kit rail, never a second brain — remove it and the def
 * degrades to a lawful champion. Phases gate kit entries, chains give
 * authored combo beats, the CC dials end stun-locks and knockback
 * juggling without silencing statuses, and the arena law walks a
 * cheesed boss home to a full heal and a reset crown.
 */
export interface NpcBossDef {
  /** "Warden of the Sunken Court" — the nameplate's second line. */
  title?: string;
  /** 1..4 rungs; the first is the opening stance (no hpBelow). */
  phases: BossPhaseDef[];
  /**
   * Scales every knockback landed on this body (0 = immovable,
   * 1 = ordinary flesh). Default 0.25 — a crowned foe is shoved a
   * step, not juggled. Above 1 is an authored WEAKNESS.
   */
  knockbackMult?: number;
  /**
   * Scales shock's hard-stagger ticks (0 = immune, 1 = ordinary).
   * Default 0.5. The status itself still LANDS and still fuels
   * reactions — only the hard control is dialed.
   */
  stunMult?: number;
  /** Leash override in tiles; the break walks home, heals, resets the crown. */
  arenaR?: number;
  /** Said aloud the moment the fight truly opens. */
  engageBark?: string;
  /** Last words, said at the kill. */
  defeatBark?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  /** Displayed combat level. */
  level: number;
  maxHp: number;
  /** Max hit per attack. */
  damage: number;
  /** Attack reach in tiles. */
  attackRange: number;
  attackCooldownTicks: number;
  /** 0 = passive (never initiates). */
  aggroRange: number;
  /** Gives up beyond this distance from its spawn point. */
  leashRange: number;
  speed: number;
  /** Split across combat skills on kill. */
  xpReward: number;
  /** Loot-table ids (loot/tables.ts), each rolled at this foe's level. */
  loot: string[];
  respawnSec: number;
  /** Rendering: body color + radius in tiles. */
  color: string;
  radius: number;
  /**
   * How far the visual body extends NORTH of the ground point in
   * world-y tiles (screen height ÷ camera pitch). Projectiles test a
   * feet→crown band, not a circle at the feet — a shot that visually
   * crosses the chest or head must connect. See npcHitHeight().
   */
  hitHeight?: number;
  /** THE KIT: authored abilities on their own cooldowns (docs/enemy-arts-plan.md). */
  kit?: NpcKitEntry[];
  /**
   * THE STANDOFF CASTER: preferred fighting distance in tiles — in a
   * chase the body backs away inside it and plants at it, letting the
   * ranged basic and the kit speak (the thrower's kiting, generalized
   * and authored). Melee-caster hybrids simply omit it. A standoff
   * body should always carry a ranged basic or a short-cooldown kit
   * voice, or its cooldown gaps leave it inert at range.
   */
  standoff?: number;
  /** Basic attacks are projectiles with this flight profile. */
  ranged?: NpcRanged;
  /** Status carried by this NPC's basic attacks (wolves make you bleed). */
  attackStatus?: StatusApply;
  /** Statuses this NPC shrugs off entirely. */
  resist?: readonly StatusId[];
  /** Statuses that hit this NPC twice as hard. */
  weak?: readonly StatusId[];
  /**
   * THE MARKED WORLD: combat-lane temperament (npcLanes.ts registry,
   * merged at the map build). Categorical — a lane is turned or
   * bitten at one game-wide pair of multipliers, folded at the one
   * damage seam and taught in play by the floating word.
   */
  lanes?: NpcLanes;
  /** Livestock: what interacting yields (milking), on a per-animal cooldown. */
  produce?: { item: string; cooldownSec: number; xp: number };
  /** Livestock: lays this item on the ground every minSec–maxSec while players are near. */
  lays?: { item: string; minSec: number; maxSec: number; xp: number };
  /**
   * Death spawns these in place of a corpse (slimes divide). Children are
   * ephemeral — no spawn point, no respawn — and must not split themselves.
   */
  splitInto?: { npc: string; count: number };
  /** Melee windup ends in a leap that closes the gap (wolves, boars). */
  pounce?: boolean;
  /**
   * Pack tag: bodies sharing a tag hunt together. When one enters
   * combat, idle packmates within PACK_RALLY_RANGE join the same
   * target — wolves are never a duel, and the matriarch's rallying
   * howl re-gathers the pack mid-fight.
   */
  pack?: string;
  /**
   * The craven break: badly hurt, this body SOMETIMES turns and runs
   * for the nearest packmate still at rest, shouting the whole camp
   * onto you when it gets there — and sometimes it steels itself and
   * fights to the end. One decision per life. Bandits and goblins
   * scream for their fellows; the dead and the beasts never do.
   * Meaningless without a pack tag (nobody to run to).
   */
  craven?: boolean;
  /**
   * THE EYE'S ARC (degrees, full angle): how wide this body watches
   * while at rest. aggroRange is the eye's REACH; this is its shape.
   * Beasts read wide (ears and nose count), people read narrower,
   * and 360 is the unsleeping watcher nothing walks behind. Absent =
   * the shared DEFAULT_SIGHT_ARC. Sneaking past the arc's edge is
   * the whole point — approach from behind and the watcher only
   * gets its dim all-round peripheral sense.
   */
  sightArc?: number;
  /**
   * THE HUNTER'S HEART (docs/aggro-temperament-plan.md): the species'
   * temperament — how keen the eye, how quick the nerve, how long the
   * hunt, how far past the leash circle a chase survives, and how much
   * each individual BODY differs from its kin. All optional; absent
   * fields read the shared defaults, so every shipped def behaves
   * exactly as before the epic (the backfill law).
   */
  temperament?: NpcTemperament;
  /**
   * THE DREAD CROWN (docs/boss-system-plan.md): phases, chains, CC
   * dials, arena law, and the spoken fight. Requires a kit — a boss
   * with no voices is a contradiction the validator refuses.
   */
  boss?: NpcBossDef;
}

/**
 * THE HUNTER'S HEART — the tunable temperament of a species. The
 * state machine every body rides stays ONE machine; these dials are
 * why a fox, a skeleton, and a legion drillmaster feel nothing alike
 * on it. Bounds live in TEMPERAMENT_BOUNDS and the validator refuses
 * anything outside them (a NaN nerve is a combat-law bug, not a
 * flavor choice).
 */
export interface NpcTemperament {
  /** Alert-gain multiplier: the eye's keenness (hawk vs dull bone). */
  keen?: number;
  /**
   * Standoff-nerve multiplier — how long a wary watcher holds the
   * stare before committing through the aggro door. LOWER is BOLDER:
   * a bear at 0.5 charges in half the time, a fox at 2.5 studies you.
   */
  nerve?: number;
  /** Seconds the walk-over-and-look investigation runs. */
  investigateSec?: number;
  /**
   * Seconds the post-line-of-sight-break hunt runs. Each hunt also
   * rolls ×1..1.5 — the authored 20 becomes the living 20–30 s
   * window, and no two escapes read the same.
   */
  searchSec?: number;
  /**
   * THE LONG PULL: seconds a chase survives BEYOND the leash circle.
   * The clock only runs past the ring, and a landed exchange refills
   * it — a fight in your face is never abandoned for homesickness.
   * 0 = the classic hard leash (the wall, for defs that want it).
   */
  gritSec?: number;
  /**
   * THE COMMITTED PURSUIT: seconds a body keeps RUNNING blind after
   * the eye loses the quarry — around the corner, to the last-seen
   * ground and its anticipated overshoot — before conceding to a
   * search. Arrival with nothing there concedes sooner; this clock
   * is the cap for a corner it never reaches.
   */
  pursuitSec?: number;
  /**
   * How far ahead of the last-seen point the blind run leads its
   * quarry, in tiles along their last stride — "he went THAT way."
   * High is cunning (wolves cut the corner), low is literal (a
   * skeleton runs to where it SAW you, not where you went), 0 turns
   * anticipation off entirely.
   */
  anticipateTiles?: number;
  /**
   * THE SEARCH THAT WALKS: how many second looks a hunt actually
   * WALKS before settling into its last watch (standing, scanning,
   * until the clock shrugs). The searchSec clock is always the
   * master — legs shape what fills it. High is a comber (the wolf
   * sweeps widening gyres over the ground), low is a plodder that
   * checks a spot or two, and 0 is the sentinel: it walks only to
   * the last-known ground and stands its whole watch there.
   * Investigate (the peacetime stroll) walks half these, rounded up.
   */
  searchLegs?: number;
  /**
   * THE QUIRK's reach: per-body spread on one timid↔bold axis rolled
   * once per life. 0 = a uniform species (the drilled, the dead);
   * 0.4 = a rabble where no two bodies share a heart.
   */
  variance?: number;
}

/** Resolved temperament — every dial present, defaults filled. */
export interface ResolvedTemperament {
  keen: number;
  nerve: number;
  investigateSec: number;
  searchSec: number;
  gritSec: number;
  pursuitSec: number;
  anticipateTiles: number;
  searchLegs: number;
  variance: number;
}

/**
 * The shared defaults every unauthored def reads — chosen to match
 * the pre-epic constants exactly, except gritSec: the old behavior
 * was a hard wall (gritSec 0), and the epic's whole point is that the
 * DEFAULT world supports the lure. 45 s of grit means a default mob
 * follows a warm fight well past its circle but still gives up on a
 * cold silent march; authored hearts push both ways from here.
 */
export const TEMPERAMENT_DEFAULTS: ResolvedTemperament = {
  keen: 1,
  nerve: 1,
  investigateSec: 15,
  searchSec: 20,
  gritSec: 45,
  pursuitSec: 5,
  anticipateTiles: 4,
  searchLegs: 4,
  variance: 0.15,
};


/** One resolved heart: authored dials over the shared defaults. */
export function npcTemperament(def: NpcDef): ResolvedTemperament {
  const t = def.temperament;
  if (!t) return TEMPERAMENT_DEFAULTS;
  return {
    keen: t.keen ?? TEMPERAMENT_DEFAULTS.keen,
    nerve: t.nerve ?? TEMPERAMENT_DEFAULTS.nerve,
    investigateSec: t.investigateSec ?? TEMPERAMENT_DEFAULTS.investigateSec,
    searchSec: t.searchSec ?? TEMPERAMENT_DEFAULTS.searchSec,
    gritSec: t.gritSec ?? TEMPERAMENT_DEFAULTS.gritSec,
    pursuitSec: t.pursuitSec ?? TEMPERAMENT_DEFAULTS.pursuitSec,
    anticipateTiles: t.anticipateTiles ?? TEMPERAMENT_DEFAULTS.anticipateTiles,
    searchLegs: t.searchLegs ?? TEMPERAMENT_DEFAULTS.searchLegs,
    variance: t.variance ?? TEMPERAMENT_DEFAULTS.variance,
  };
}

/**
 * THE QUIRK — one personality axis, timid↔bold, rolled once per life
 * (quirk ∈ [-1, 1]) and scaled by the species' variance. ONE axis so
 * a body is COHERENT: the bold wolf commits sooner (nerve ÷), chases
 * farther (grit ×), and is a shade keener — never "fearless but gives
 * up early". Multiplicative and clamped inside the validator bounds,
 * so no roll escapes the rails the dials themselves obey.
 */
export function quirkTemperament(base: ResolvedTemperament, quirk: number): ResolvedTemperament {
  const v = base.variance;
  if (v <= 0 || quirk === 0) return base;
  const q = Math.max(-1, Math.min(1, quirk));
  const bold = 1 + q * v;
  const clamp = (x: number, b: readonly [number, number]) =>
    Math.max(b[0], Math.min(b[1], x));
  return {
    keen: clamp(base.keen * (1 + q * v * 0.5), TEMPERAMENT_BOUNDS.keen),
    nerve: clamp(base.nerve / bold, TEMPERAMENT_BOUNDS.nerve),
    investigateSec: base.investigateSec,
    searchSec: clamp(base.searchSec * (1 + q * v * 0.5), TEMPERAMENT_BOUNDS.searchSec),
    gritSec: clamp(base.gritSec * bold, TEMPERAMENT_BOUNDS.gritSec),
    // The bold run the corner longer; anticipation is species CUNNING,
    // not courage — the quirk leaves it alone.
    pursuitSec: clamp(base.pursuitSec * bold, TEMPERAMENT_BOUNDS.pursuitSec),
    anticipateTiles: base.anticipateTiles,
    // The bold body WALKS its hunt harder — more ground combed before
    // the last watch; the timid one checks a spot or two and settles.
    searchLegs: Math.round(clamp(base.searchLegs * bold, TEMPERAMENT_BOUNDS.searchLegs)),
    variance: v,
  };
}

/** A crowned foe is shoved a step, not juggled (default knockback scale). */
export const BOSS_KNOCKBACK_MULT = 0.25;
/** ...and staggered a beat, not stun-chained (default shock-stagger scale). */
export const BOSS_STUN_MULT = 0.5;

/** How far a pack answers a packmate's aggro (tiles). */
export const PACK_RALLY_RANGE = 7;

/**
 * THE OOZE FAMILY (docs/ooze-family-plan.md): the formless, as one
 * set. One membership answer for every reader — the tame refusal, the
 * client's legless routing, the no-corpse law. Ids, not a prefix: the
 * family outgrew 'slime*' the day the grays and puddings arrived.
 */
export const OOZE_IDS: ReadonlySet<string> = new Set([
  'slime',
  'slime_small',
  'giant_slime',
  'gray_ooze',
  'frost_slime',
  'tar_slime',
  'gelatinous_cube',
]);

export function isOozeId(id: string): boolean {
  return OOZE_IDS.has(id);
}

/** How far a craven body will run looking for a resting packmate (tiles). */
export const HELP_SEEK_RANGE = 12;

/**
 * THE SIZING-UP LAW: aggro range scales by how the beast reads you.
 * A wolf that outclasses a waker marks them far beyond its posted
 * range (nothing to fear, everything to eat); the same wolf gives a
 * seasoned slayer a wide berth and only bristles at close insult.
 * Ratio-based so the law self-normalizes across the ladder — five
 * levels means everything at level 5 and almost nothing at level 80.
 * Floored, never zeroed: no beast is ever perfectly safe to stand on.
 */
export function levelAggroFactor(npcLevel: number, playerLevel: number): number {
  const K = 8; // softening: keeps low-level ratios from exploding
  const f = (npcLevel + K) / (playerLevel + K);
  return Math.min(1.75, Math.max(0.35, f));
}

const defs: NpcDef[] = NPC_DEFS;

// THE MARKED WORLD: combat-lane temperaments join their bodies here —
// one registry page (npcLanes.ts), merged at the map build so the
// def literals stay about the body and the lanes read as one roster.
const laned = (d: NpcDef): NpcDef => (NPC_LANES[d.id] ? { ...d, lanes: NPC_LANES[d.id] } : d);

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, laned(d)]));

/** The authored bestiary exactly as shipped — the CMS revert target. */
export const AUTHORED_NPCS: ReadonlyMap<string, NpcDef> = new Map(
  defs.map((d) => [d.id, laned(d)]),
);

/**
 * THE CMS HOOK: repopulate the live bestiary in place. Every runtime
 * consumer resolves through NPCS.get() at call time, so future spawns
 * and respawns read the new truth immediately; bodies already standing
 * keep their captured def until they respawn (the server despawns the
 * edited kind to hurry that along). Content-as-code remains the seed —
 * this only ever runs against validated DB-loaded docs.
 */
export function replaceNpcDefs(next: Iterable<NpcDef>): void {
  const map = NPCS as Map<string, NpcDef>;
  map.clear();
  for (const d of next) map.set(d.id, d);
}


/**
 * ONE BESTIARY, EVERY TIER — scale a def to a target combat level.
 * Dungeon garrisons are the authored beasts re-issued at the key's
 * power: hp grows a touch superlinearly (fights lengthen with the
 * ladder), xp tracks level honestly. The damage DIE drifts only
 * gently (^0.5) — under THE THREAT LAW the level itself already
 * multiplies every strike (shared/sim/damage.ts npcMaxHit), so a
 * steeper die here would compound into one-shot territory; a
 * level-68 skeleton bites hard, it doesn't delete. Everything else —
 * speed, reach, specials, resists, art — is the def's own; a scaled
 * troll still fights like a troll. Loot rolls read the SCALED level,
 * so deep dungeon beasts pay out deep-level loot by construction.
 */
/**
 * THE PACE DIAL applied: the hit points a body stands up with. Hostile
 * bodies (aggroRange > 0 — the wild, the camps, the crowns) wear the
 * dial; townsfolk, livestock and other quiet bodies keep their authored
 * pool. The server's spawn door and every bracket read THIS, never
 * def.maxHp, for a fighting body.
 */
export function combatHp(def: NpcDef): number {
  return def.aggroRange > 0 ? Math.max(1, Math.round(def.maxHp * PACE_HP_MULT)) : def.maxHp;
}

export function scaleNpcDef(def: NpcDef, level: number, name?: string): NpcDef {
  if (level === def.level && !name) return def;
  const ratio = level / Math.max(1, def.level);
  return {
    ...def,
    name: name ?? def.name,
    level,
    maxHp: Math.max(1, Math.round(def.maxHp * Math.pow(ratio, 1.12))),
    damage: def.damage > 0 ? Math.max(1, Math.round(def.damage * Math.pow(ratio, 0.5))) : 0,
    xpReward: Math.max(1, Math.round(def.xpReward * Math.pow(ratio, 1.05))),
  };
}

/**
 * World-y extent of the visual body above the ground point. Projectile
 * hit tests (and the client's stuck-arrow attach) measure against the
 * feet→crown band [y − hitHeight, y], never a bare circle at the feet —
 * otherwise shots that visually cross the chest or head sail through.
 */
export function npcHitHeight(def: NpcDef): number {
  return def.hitHeight ?? Math.max(0.6, def.radius * 3);
}

/**
 * Y-distance from `y` to the nearest lip of an NPC's feet→crown band.
 * Zero while inside the band; pairs with the x-gap for the hit test.
 */
export function bandDy(y: number, npcY: number, hitHeight: number): number {
  const dyRaw = npcY - y;
  return dyRaw < 0 ? -dyRaw : Math.max(0, dyRaw - hitHeight);
}

export function npcDef(id: string): NpcDef | undefined {
  return NPCS.get(id);
}

/**
 * Livestock and critters: kept animals (they produce or lay — the
 * stolen cows in a brigand pen) and creatures that can neither hurt
 * nor aggro. They never spring traps and never count as a POI
 * garrison keeper — a warded chest opens over a cow's objection. A
 * bear (real damage, provoked-only) is NOT livestock: it fights.
 */
export function npcLivestock(
  def: Pick<NpcDef, 'damage' | 'aggroRange' | 'produce' | 'lays'>,
): boolean {
  if (def.produce !== undefined || def.lays !== undefined) return true;
  return def.damage <= 0 && def.aggroRange === 0;
}

/** Fixed spawn points around the starter town. */
export interface SpawnPoint {
  npc: string;
  x: number;
  y: number;
  /** Wander/respawn scatter radius. */
  radius: number;
  count: number;
}

/**
 * Fixed spawn points ringing Dawnmead, the starter village — the ONLY
 * authored wilderness left. Everything farther out belongs to the
 * procedural frontier (the danger field, POIs, and the wild roster).
 * THE CORRIDOR LAW: the village core and the east lane (y ~40-60 out
 * to the hedgerows) stay predator-free — new spawns keep clear.
 */
export const TOWN_SPAWNS: readonly SpawnPoint[] = [
  // The wolfkin dens in the north-western woods, past the orchard rim
  // — far enough that only a waker who goes LOOKING for trouble finds
  // the matriarch roaming between her packs.
  // (Pushed outward again for THE DAWN COMES OPEN: the rect grew to
  // (-160,-64)-(31,159), so every den keeps ≥8 tiles off the hems and
  // the re-headed hunters' trail threads them without touching the
  // village. They sit NORTH-WEST of the town, which is where the
  // matriarch's quest card has always said they are.)
  { npc: 'wolf', x: -96, y: -76, radius: 6, count: 2 },
  { npc: 'wolf', x: -124, y: -80, radius: 6, count: 2 },
  { npc: 'dire_wolf', x: -110, y: -86, radius: 8, count: 1 },
  // The Gloamwood — the dark forest south of the brook meadow: webs
  // above, wings at dusk, and the old threats deeper in. Clear of the
  // old-road gate at (-52,160).
  { npc: 'giant_spider', x: -26, y: 176, radius: 7, count: 2 },
  { npc: 'cave_bat', x: -48, y: 172, radius: 6, count: 2 },
  { npc: 'bear', x: -64, y: 180, radius: 6, count: 1 },
  { npc: 'troll', x: -80, y: 188, radius: 6, count: 1 },
  // Gentle life on the village's shoulders: stags browse the east
  // meadow along the lane, rams keep the rocky rise out west.
  { npc: 'stag', x: 52, y: 20, radius: 7, count: 2 },
  { npc: 'ram', x: -184, y: 16, radius: 7, count: 2 },
];

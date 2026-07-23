import type { EquipSlot, Look } from '@devcraft/shared';

/**
 * NPC ACTORS — the people (and befriended beasts) of the world.
 *
 * THE ACTOR / ARCHETYPE / PLACEMENT SPLIT (the law of this system):
 *
 *   1. ARCHETYPE — `NpcDef` (npcs.ts): a combat stat block + bestiary
 *      body. "What a goblin is."
 *   2. ACTOR — `NpcActorDef` (this file): an IDENTITY. A named
 *      individual with a face, wardrobe, pockets, and disposition.
 *      "Who Captain Alda is." Actors may wear the player-humanoid rig
 *      or any bestiary body.
 *   3. PLACEMENT — `ZoneActorSpawn` (maps/types.ts): where an actor
 *      stands in a zone. "Alda keeps the north arch."
 *
 * Never fold one layer into another: a hundred guards can share one
 * actor def, an actor can wear any archetype's body, and the same
 * actor can stand in ten zones. Future systems (dialogue trees,
 * shops, waypoint routes, factions, quests) attach to the actor's
 * slug — they get their own defs and reference `NpcActorDef.id`,
 * they do NOT grow fields inside it beyond the reserved hook ids.
 *
 * INTERCHANGE FORMAT: actors are authored as JSON files in
 * `src/actors/defs/*.json` — one actor per file, filename = slug.
 * The same JSON shape is what dev tools read/write and what the
 * server syncs into its relational tables (db/npcActors.ts). One
 * validator (validate.ts) guards every path: authored JSON, DB
 * round-trips, and future editor output all pass through it.
 */

/** The actor wears the player rig: a full Look plus worn equipment. */
export interface NpcModelHumanoid {
  kind: 'humanoid';
  /**
   * Base appearance — palette indices, exactly the player's Look
   * (shared/look.ts). Authored JSON may omit fields; the validator
   * fills gaps from DEFAULT_LOOK so old defs survive look expansions
   * under the INDEX STABILITY LAW.
   */
  look: Look;
}

/** The actor wears a bestiary body (NpcDef id) — Grib is still a goblin. */
export interface NpcModelCreature {
  kind: 'creature';
  /** Bestiary NpcDef id (npcs.ts) — body art, radius, hit band. */
  creature: string;
}

export type NpcModel = NpcModelHumanoid | NpcModelCreature;

/**
 * How the actor meets the world:
 *  - friendly: never attackable — the talk/trade side of the world.
 *  - neutral:  attackable when a combat block exists, but never aggros.
 *  - hostile:  a named enemy — combat block required, aggros per stats.
 */
export type NpcDisposition = 'friendly' | 'neutral' | 'hostile';

/** One inventory row — what the actor carries (future: pickpocketing, trade stock). */
export interface NpcActorStock {
  item: string;
  qty: number;
}

/** Per-stat overrides on top of the derived base (all optional). */
export interface NpcActorCombatStats {
  maxHp?: number;
  damage?: number;
  attackRange?: number;
  attackCooldownTicks?: number;
  aggroRange?: number;
  leashRange?: number;
  speed?: number;
  xpReward?: number;
}

/**
 * Makes an actor fightable. Stats derive from a bestiary base scaled
 * to `level` (scaleNpcDef — the one-bestiary-every-tier law), then
 * `stats` overrides land on top. Humanoid actors with no `base` use
 * the built-in HUMANOID_BASE guard block; creature actors default to
 * their own body's def.
 */
export interface NpcActorCombat {
  /** Displayed combat level; the base def is scaled to it. */
  level: number;
  /** Bestiary NpcDef id to derive stats from (optional). */
  base?: string;
  /** Loot-table ids rolled on death (loot/tables.ts). Default: none. */
  loot?: string[];
  /** Respawn delay for placed spawns. Default: the base def's. */
  respawnSec?: number;
  stats?: NpcActorCombatStats;
}

/**
 * A defined NPC — the unit of content this system exists for.
 * Everything else in the game references actors by `id`.
 */
export interface NpcActorDef {
  /** Unique slug: ^[a-z][a-z0-9_]*$ — THE reference key, never renamed once shipped. */
  id: string;
  /** Display name on the nameplate. */
  name: string;
  /** Optional epithet — "Captain of the Watch". */
  title?: string;
  /** One-line examine/flavor text. */
  examine?: string;
  disposition: NpcDisposition;
  model: NpcModel;
  /**
   * Worn gear by slot (humanoid models only) — item ids whose defs
   * carry the matching equipSlot. This is how a guard gets plate and
   * a farmer gets cloth; it drives the rig's rendering exactly like a
   * player's worn set.
   */
  equipment?: Partial<Record<EquipSlot, string>>;
  /** Carried goods (max 28 rows, mirroring the player pack). */
  inventory?: NpcActorStock[];
  /**
   * Spoken lines — interacting rotates through them. A placeholder
   * voice until the dialogue system lands and `dialogue` takes over.
   */
  lines?: string[];
  /** Present ⇒ the actor can fight/be fought (per disposition). */
  combat?: NpcActorCombat;
  /** RESERVED HOOK: dialogue-tree id (future dialogue system). */
  dialogue?: string;
  /** RESERVED HOOK: shop id (future shop system; general_store today). */
  shop?: string;
}

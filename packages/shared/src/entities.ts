export type EntityId = number;

export enum EntityKind {
  Player = 1,
  Npc = 2,
  ResourceNode = 3,
  ItemDrop = 4,
  Projectile = 5,
  Prop = 6,
  BuildSite = 7,
}

/** Animation/pose state carried in snapshots (u8 on the wire). */
export enum PoseState {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Gather = 3,
  Hurt = 4,
  Dead = 5,
  Cast = 6,
  Draw = 7,
  /** Bow release recoil — the moment after Draw lets go. */
  Loose = 8,
  /** Melee combo stages: 2 = forehand, 9 = backhand, 10 = finisher. */
  Attack2 = 9,
  Attack3 = 10,
  /**
   * Working a crafting station. The client reads the nearest station
   * tile to pick the choreography — hammer-and-tongs at an anvil,
   * stoking at a furnace — so the wire stays one byte.
   */
  Craft = 11,
  /** Firing a weapon Art or relic active — big committed animation. */
  Art = 12,
  /** Crouch-walk stealth carriage — covers both sneak-moving and sneak-idle. */
  Sneak = 13,
  /**
   * Seated rest — the wayside emote. One byte covers players (X
   * toggle) and NPCs (routine `sit` stops); the client varies the
   * posture per entity so a campfire circle never sits identically.
   */
  Sit = 14,
  /**
   * Milking livestock: bare-handed dairy work at the animal's flank.
   * No tool comes out — the client stows weapons and plays the
   * settled two-hand rhythm for the action's whole run.
   */
  Milk = 15,
  /**
   * Lying down — a body resting in a bed. Only ever set while the
   * sitter occupies a Tile.Bed (players via Rest, NPCs via routine
   * `lie` stops); the client reads the bed under the body for the
   * axis and deck height, so the wire stays one byte.
   */
  Lie = 16,
  /**
   * In the saddle — the travel stance. WHAT is ridden travels on
   * AppearanceData (the flaming-blade law: identity every watcher
   * needs rides appearance), so the wire stays one byte; the client
   * derives gait from motion exactly as it does for beasts.
   */
  Ride = 17,
}

/**
 * Static-ish metadata sent as JSON when an entity enters a client's
 * interest set. Volatile state (position, pose, hp) travels in binary
 * snapshots keyed by eid.
 */
export interface EntityMeta {
  eid: EntityId;
  kind: EntityKind;
  x: number;
  y: number;
  name?: string;
  /** NPC actors: epithet under the name — "Captain of the Watch". */
  title?: string;
  /**
   * NPC actors: this one cannot be attacked — clients offer Talk
   * instead of a fight. Absent on every fightable thing.
   */
  friendly?: boolean;
  /**
   * NPC actors: this one has a voice (a dialogue tree or spoken
   * lines) — clients offer Talk even on fightable neutrals.
   */
  talk?: boolean;
  /**
   * NPC actors: the actor def slug (v20). Static identity, safe on the
   * global meta — the client resolves its OWN quest marks against it
   * (giver of an available quest wears the "!", turn-in of a ready one
   * the raised mark), so per-viewer truth never rides the wire.
   */
  actor?: string;
  /** Content definition id, e.g. npc/item/node/prop type. */
  defId?: string;
  /** Player/NPC visual loadout for the procedural rig. */
  appearance?: AppearanceData;
  /** Combat level or node level requirement, for nameplates. */
  level?: number;
  /** Stack size for item drops — drives loot labels and pile sizes. */
  qty?: number;
  /** Instance roll for dropped gear — tints the nameplate, survives pickup. */
  roll?: import('./rarity.js').ItemRoll;
  /**
   * Projectiles: who fired it — with `seq`, the identity a client
   * needs to hand its zero-latency predicted tracer off to the real
   * entity (v8). Tamed companions (v27): the keeper — the one
   * ownership fact every watcher must know, because it changes what
   * the entity IS (somebody's, not the wild's; never a fight offer).
   */
  ownerEid?: EntityId;
  /**
   * THE ANIMALS OF THE YARD (farming v2 Phase 3): a kept yard animal.
   * Owner is a CHARACTER (offline-safe) so this marker, not ownerEid,
   * is what says "livestock" — ownerEid rides beside it only while
   * the keeper is online (it aims the keeper's own prompts). Wears
   * the drover's tag in the renderer; never a pet, never fightable.
   */
  stock?: boolean;
  /**
   * THE FLEECE TELLS THE TIME: a kept sheep mid-regrow — clipped
   * tight from the shear until its next fleece readies, when the
   * server flips this off with a meta update. Absent = full fleece,
   * shearable at a glance. Sheep-only, additive.
   */
  shorn?: boolean;
  /** Projectiles only: the input-frame seq whose press/release fired
   *  this shot — the tracer↔entity matching key. */
  seq?: number;
  /**
   * Projectiles only (v9): flight heading at spawn, radians. With
   * `speed`, the client renders the shot ballistically from its very
   * first sample — no waiting for a snapshot pair to infer velocity.
   */
  dir?: number;
  /** Projectiles only (v9): flight speed, tiles/sec. */
  speed?: number;
  /**
   * Projectiles only (v9): a boomerang flight — its return leg ghosts
   * through walls by law, so clients must not wall-clamp its path.
   */
  returns?: boolean;
}

export interface AppearanceData {
  bodyColor: string;
  /** Equipment part ids by slot, drives combinatorial rendering. */
  equip: Partial<Record<EquipSlot, string>>;
  /**
   * Enchant ids by slot, only for enchanted pieces. The one instance
   * fact that IS appearance: a flaming blade must burn for everyone,
   * so unlike rolls/coats this rides the wire to every watcher.
   */
  ench?: Partial<Record<EquipSlot, string>>;
  /** Player-chosen base look (palette indices) — see shared/look.ts. */
  look?: import('./look.js').Look;
  /**
   * Cosmetic weapon carriage at rest: 'rogue' = reverse grip, blade
   * raked down-back. Absent = standard carry. Purely visual.
   */
  carry?: CarryStyle;
  /**
   * Off-hand grip for dual wielders. Absent = standard. Each fist
   * carries its own way — grips belong to hands, not to weapons.
   */
  carryOff?: CarryStyle;
  /**
   * Active mount def id while PoseState.Ride — the beast every watcher
   * must draw under this body (the flaming-blade law). Absent afoot.
   */
  mount?: string;
}

/** Cosmetic idle weapon-carry preference (never affects combat). */
export type CarryStyle = 'normal' | 'rogue';

/** Which fist a grip preference belongs to. */
export type GripHand = 'main' | 'off';

export type EquipSlot =
  | 'head'
  | 'body'
  | 'legs'
  | 'gloves'
  | 'boots'
  | 'weapon'
  | 'offhand'
  | 'tool'
  | 'relic'
  | 'sigil'
  | 'cape';

export const EQUIP_SLOTS: readonly EquipSlot[] = [
  'head',
  'body',
  'legs',
  'gloves',
  'boots',
  'weapon',
  'offhand',
  'tool',
  'relic',
  'sigil',
  'cape',
];

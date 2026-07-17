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
  /** Content definition id, e.g. npc/item/node/prop type. */
  defId?: string;
  /** Player/NPC visual loadout for the procedural rig. */
  appearance?: AppearanceData;
  /** Combat level or node level requirement, for nameplates. */
  level?: number;
}

export interface AppearanceData {
  bodyColor: string;
  /** Equipment part ids by slot, drives combinatorial rendering. */
  equip: Partial<Record<EquipSlot, string>>;
}

export type EquipSlot = 'head' | 'body' | 'legs' | 'weapon' | 'offhand' | 'tool';

export const EQUIP_SLOTS: readonly EquipSlot[] = [
  'head',
  'body',
  'legs',
  'weapon',
  'offhand',
  'tool',
];

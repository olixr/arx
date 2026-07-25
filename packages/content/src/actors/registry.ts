import type { AppearanceData } from '@devcraft/shared';
import { NPCS, scaleNpcDef, type NpcDef } from '../npcs.js';
import type { NpcActorDef } from './types.js';
import { validateNpcActor } from './validate.js';

import artisanWeslin from './defs/artisan_weslin.json';
import bramblewickGateGuard from './defs/bramblewick_gate_guard.json';
import captainAlda from './defs/captain_alda.json';
import elderRowan from './defs/elder_rowan.json';
import farmerHetty from './defs/farmer_hetty.json';
import farmerHobb from './defs/farmer_hobb.json';
import grib from './defs/grib.json';
import hearthkeeperIona from './defs/hearthkeeper_iona.json';
import merchantTobbin from './defs/merchant_tobbin.json';
import oldMaren from './defs/old_maren.json';
import sageOdile from './defs/sage_odile.json';
import smithBrannock from './defs/smith_brannock.json';
import tinkerFen from './defs/tinker_fen.json';
import wardenBryn from './defs/warden_bryn.json';
import wayfarerDray from './defs/wayfarer_dray.json';
import wayfarerPetch from './defs/wayfarer_petch.json';
import wayfarerSenna from './defs/wayfarer_senna.json';
import waywardWatch from './defs/wayward_watch.json';
import youngPip from './defs/young_pip.json';

/**
 * Every authored actor JSON, registered here. A def that isn't listed
 * doesn't exist — actors.test.ts walks the defs/ directory and fails
 * if a file is missing from this roster, so forgetting the import is
 * a test failure, not a silent hole in the world.
 */
const SOURCES: readonly unknown[] = [
  artisanWeslin,
  bramblewickGateGuard,
  captainAlda,
  elderRowan,
  farmerHetty,
  farmerHobb,
  grib,
  hearthkeeperIona,
  merchantTobbin,
  oldMaren,
  sageOdile,
  smithBrannock,
  tinkerFen,
  wardenBryn,
  wayfarerDray,
  wayfarerPetch,
  wayfarerSenna,
  waywardWatch,
  youngPip,
];

function buildRegistry(): ReadonlyMap<string, NpcActorDef> {
  const map = new Map<string, NpcActorDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateNpcActor(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.actor.id)) errors.push(`${res.actor.id}: duplicate actor id`);
    else map.set(res.actor.id, res.actor);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid NPC actor defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const NPC_ACTORS: ReadonlyMap<string, NpcActorDef> = buildRegistry();

export function npcActor(id: string): NpcActorDef | undefined {
  return NPC_ACTORS.get(id);
}

/**
 * The baseline stat block for fightable humanoid actors that name no
 * bestiary base — a level-10 town-guard chassis that scaleNpcDef
 * re-issues at any level, same as every dungeon garrison.
 */
export const HUMANOID_BASE: NpcDef = {
  id: 'actor_humanoid',
  name: 'Fellow',
  level: 10,
  maxHp: 30,
  damage: 3,
  attackRange: 1.0,
  attackCooldownTicks: 44,
  aggroRange: 0,
  leashRange: 10,
  speed: 3.6,
  xpReward: 90,
  loot: [],
  respawnSec: 60,
  color: '#c8b89a',
  radius: 0.3,
  hitHeight: 2.0,
};

/**
 * Wire appearance for a humanoid actor — exactly the shape a player
 * broadcasts, so the client's one humanoid rig renders both. Creature
 * actors return null: their body IS the bestiary art, addressed by
 * defId.
 */
export function actorAppearance(actor: NpcActorDef): AppearanceData | null {
  if (actor.model.kind !== 'humanoid') return null;
  return {
    bodyColor: '',
    equip: { ...(actor.equipment ?? {}) },
    look: actor.model.look,
  };
}

/**
 * Synthesize the combat NpcDef for an attackable actor: base def
 * (named base > own creature body > HUMANOID_BASE) scaled to the
 * authored level, stat overrides applied, actor-owned loot/respawn.
 * Friendly actors (no combat block) return null — they simply never
 * enter the combat registry, which is what makes them unhittable.
 */
export function actorCombatDef(actor: NpcActorDef): NpcDef | null {
  const combat = actor.combat;
  if (!combat) return null;
  const base =
    (combat.base ? NPCS.get(combat.base) : undefined) ??
    (actor.model.kind === 'creature' ? NPCS.get(actor.model.creature) : undefined) ??
    HUMANOID_BASE;
  const scaled = scaleNpcDef(base, combat.level, actor.name);
  const merged: NpcDef = {
    ...scaled,
    id: `actor:${actor.id}`,
    loot: combat.loot ?? [],
    respawnSec: combat.respawnSec ?? scaled.respawnSec,
    ...combat.stats,
  };
  // Neutral actors defend themselves but never start it — this clamp
  // outranks any authored stat override.
  if (actor.disposition !== 'hostile') merged.aggroRange = 0;
  return merged;
}

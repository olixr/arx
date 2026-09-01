/**
 * THE SERVER'S FORMULAS (foundations F7 endgame) — pure free functions
 * shared by the class and its split systems: the compass word, the
 * buff forge's constructor, the basic roll and the surge reads. A leaf
 * on purpose: formulas flow downhill, never through a cycle.
 */
import { buffCritPct, buffDmgMult } from '@arx/shared';
import type { PlayerBuff, PlayerComp } from './gameServer.js';

/**
 * Eight-way spoken bearing for a world-space offset (map north = -y),
 * the quartermaster's dialect: "north-east", never degrees.
 */
export function compass8(dx: number, dy: number): string {
  const names = [
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west',
    'north',
    'north-east',
  ];
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) & 7;
  return names[oct]!;
}
/** Buff with the passive-combat defaults filled in. */
export function mkBuff(partial: Partial<PlayerBuff> & { untilTick: number }): PlayerBuff {
  return {
    speedMult: 1,
    attackSpeedMult: 1,
    shieldHp: 0,
    meleeLifesteal: 0,
    armor: 0,
    reflectFrac: 0,
    offhandWeight: 0,
    gatherSpeed: 1,
    regenPer4s: 0,
    critPct: 0,
    dmgMult: 1,
    beastTruce: false,
    beastPart: 0,
    ...partial,
  };
}
/**
 * Basic-attack roll: a landed basic ALWAYS chips at least 1. At
 * hack-and-slash cadence a stream of zero-rolls reads as broken, and
 * reliable chips are what make on-hit haste a rhythm you can trust.
 */
export function rollBasic(maxHit: number, critBonusPct = 0): { dmg: number; crit: boolean } {
  const roll = rollDamage(maxHit, critBonusPct);
  return { dmg: Math.max(1, roll.dmg), crit: roll.crit };
}
/**
 * The two surge dials, folded by THE BUFF FORGE's declared table
 * (crit additive, dmgMult additive-of-excess — two workings that each
 * sharpen the edge are both felt, and neither replaces the other).
 */
export function surgeCritPct(player: PlayerComp): number {
  return buffCritPct(player.buffs);
}
export function surgeDmgMult(player: PlayerComp): number {
  return buffDmgMult(player.buffs);
}

export function rollDamage(maxHit: number, critBonusPct = 0): { dmg: number; crit: boolean } {
  if (Math.random() < 0.1 + critBonusPct / 100) {
    return { dmg: maxHit + Math.ceil(maxHit * 0.5), crit: true };
  }
  return { dmg: Math.floor(Math.random() * (maxHit + 1)), crit: false };
}

/** Parse a hearth-tied origin back to its settler, or null. */
export function hearthOwnerOf(originCell: string | null | undefined): number | null {
  if (!originCell || !originCell.startsWith('hearth:')) return null;
  const id = Number(originCell.slice(7));
  return Number.isFinite(id) ? id : null;
}

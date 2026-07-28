import {
  DEFAULT_LOOK,
  EQUIP_SLOTS,
  sanitizeLook,
  type EquipSlot,
} from '@arx/shared';
import { ITEMS } from '../items.js';
import { LOOT_TABLES } from '../loot/tables.js';
import { NPCS } from '../npcs.js';
import type {
  NpcActorCombat,
  NpcActorDef,
  NpcActorStock,
  NpcModel,
} from './types.js';

/**
 * THE ONE VALIDATOR — every path an actor def can travel goes through
 * here: authored JSON at registry init, DB rows reassembled at server
 * boot, and (later) dev-tool submissions. Errors are collected, not
 * thrown, so tooling can show a full report; the registry turns them
 * into a hard failure because shipped content must be clean.
 */

export type ValidateActorResult =
  | { ok: true; actor: NpcActorDef }
  | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/** Combat-stat override keys, checked as finite positive numbers. */
const STAT_KEYS = [
  'maxHp',
  'damage',
  'attackRange',
  'attackCooldownTicks',
  'aggroRange',
  'leashRange',
  'speed',
  'xpReward',
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optString(v: unknown, name: string, max: number, errors: string[]): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || v.length === 0 || v.length > max) {
    errors.push(`${name} must be a non-empty string of at most ${max} chars`);
    return undefined;
  }
  return v;
}

function validateModel(raw: unknown, errors: string[]): NpcModel | undefined {
  if (!isRecord(raw)) {
    errors.push('model must be an object');
    return undefined;
  }
  if (raw.kind === 'humanoid') {
    // Partial looks are legal authoring: missing fields default from
    // DEFAULT_LOOK, so defs written before a look expansion stay valid
    // (the same INDEX STABILITY LAW the player DB rows live under).
    const merged = isRecord(raw.look) ? { ...DEFAULT_LOOK, ...raw.look } : undefined;
    const look = merged ? sanitizeLook(merged) : null;
    if (!look) {
      errors.push('humanoid model needs a valid look (palette indices in range)');
      return undefined;
    }
    return { kind: 'humanoid', look };
  }
  if (raw.kind === 'creature') {
    if (typeof raw.creature !== 'string' || !NPCS.has(raw.creature)) {
      errors.push(`creature model references unknown bestiary id '${String(raw.creature)}'`);
      return undefined;
    }
    return { kind: 'creature', creature: raw.creature };
  }
  errors.push(`model.kind must be 'humanoid' or 'creature'`);
  return undefined;
}

function validateEquipment(
  raw: unknown,
  model: NpcModel | undefined,
  errors: string[],
): Partial<Record<EquipSlot, string>> | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('equipment must be an object of slot -> item id');
    return undefined;
  }
  if (model && model.kind !== 'humanoid') {
    errors.push('equipment is only valid on humanoid models');
    return undefined;
  }
  const out: Partial<Record<EquipSlot, string>> = {};
  for (const [slot, itemId] of Object.entries(raw)) {
    if (!EQUIP_SLOTS.includes(slot as EquipSlot)) {
      errors.push(`equipment slot '${slot}' is not a valid slot`);
      continue;
    }
    if (typeof itemId !== 'string') {
      errors.push(`equipment.${slot} must be an item id string`);
      continue;
    }
    const def = ITEMS.get(itemId);
    if (!def) {
      errors.push(`equipment.${slot} references unknown item '${itemId}'`);
      continue;
    }
    if (def.equipSlot !== slot) {
      errors.push(
        `equipment.${slot}: item '${itemId}' equips to '${def.equipSlot ?? 'nothing'}', not '${slot}'`,
      );
      continue;
    }
    out[slot as EquipSlot] = itemId;
  }
  return out;
}

function validateInventory(raw: unknown, errors: string[]): NpcActorStock[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('inventory must be an array of { item, qty }');
    return undefined;
  }
  if (raw.length > 28) errors.push('inventory holds at most 28 rows (the pack law)');
  const out: NpcActorStock[] = [];
  for (const [i, entry] of raw.entries()) {
    if (!isRecord(entry) || typeof entry.item !== 'string') {
      errors.push(`inventory[${i}] must be { item, qty }`);
      continue;
    }
    if (!ITEMS.has(entry.item)) {
      errors.push(`inventory[${i}] references unknown item '${entry.item}'`);
      continue;
    }
    const qty = entry.qty;
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 10_000) {
      errors.push(`inventory[${i}].qty must be an integer 1..10000`);
      continue;
    }
    out.push({ item: entry.item, qty });
  }
  return out;
}

function validateCombat(raw: unknown, errors: string[]): NpcActorCombat | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('combat must be an object');
    return undefined;
  }
  const level = raw.level;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 126) {
    errors.push('combat.level must be an integer 1..126');
    return undefined;
  }
  const out: NpcActorCombat = { level };
  if (raw.base !== undefined) {
    if (typeof raw.base !== 'string' || !NPCS.has(raw.base)) {
      errors.push(`combat.base references unknown bestiary id '${String(raw.base)}'`);
    } else {
      out.base = raw.base;
    }
  }
  if (raw.loot !== undefined) {
    if (!Array.isArray(raw.loot)) {
      errors.push('combat.loot must be an array of loot-table ids');
    } else {
      const loot: string[] = [];
      for (const t of raw.loot) {
        if (typeof t !== 'string' || !LOOT_TABLES.has(t)) {
          errors.push(`combat.loot references unknown table '${String(t)}'`);
        } else {
          loot.push(t);
        }
      }
      out.loot = loot;
    }
  }
  if (raw.respawnSec !== undefined) {
    if (typeof raw.respawnSec !== 'number' || raw.respawnSec < 1 || raw.respawnSec > 86_400) {
      errors.push('combat.respawnSec must be a number 1..86400');
    } else {
      out.respawnSec = raw.respawnSec;
    }
  }
  if (raw.stats !== undefined) {
    if (!isRecord(raw.stats)) {
      errors.push('combat.stats must be an object');
    } else {
      const stats: Record<string, number> = {};
      for (const key of Object.keys(raw.stats)) {
        if (!(STAT_KEYS as readonly string[]).includes(key)) {
          errors.push(`combat.stats.${key} is not a known stat`);
          continue;
        }
        const v = raw.stats[key];
        // aggroRange 0 is meaningful (never initiates); the rest must be > 0.
        const min = key === 'aggroRange' ? 0 : Number.EPSILON;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < min) {
          errors.push(`combat.stats.${key} must be a positive finite number`);
          continue;
        }
        stats[key] = v;
      }
      if (Object.keys(stats).length > 0) out.stats = stats;
    }
  }
  return out;
}

/** Validate one untrusted actor def (parsed JSON, DB row, tool input). */
export function validateNpcActor(raw: unknown): ValidateActorResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['actor def must be an object'] };

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
  }
  const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : '';
  if (!name || name.length > 40) errors.push('name must be a non-empty string of at most 40 chars');

  const title = optString(raw.title, 'title', 60, errors);
  const examine = optString(raw.examine, 'examine', 200, errors);
  const dialogue = optString(raw.dialogue, 'dialogue', 48, errors);
  const shop = optString(raw.shop, 'shop', 48, errors);

  const disposition = raw.disposition;
  if (disposition !== 'friendly' && disposition !== 'neutral' && disposition !== 'hostile') {
    errors.push(`disposition must be friendly | neutral | hostile`);
  }

  const protection = raw.protection;
  if (protection !== undefined && protection !== 'invulnerable' && protection !== 'untargetable') {
    errors.push(`protection must be invulnerable | untargetable (or absent)`);
  }

  const model = validateModel(raw.model, errors);
  const equipment = validateEquipment(raw.equipment, model, errors);
  const inventory = validateInventory(raw.inventory, errors);
  const combat = validateCombat(raw.combat, errors);

  let lines: string[] | undefined;
  if (raw.lines !== undefined) {
    if (!Array.isArray(raw.lines) || raw.lines.some((l) => typeof l !== 'string' || l.length === 0 || l.length > 200)) {
      errors.push('lines must be an array of non-empty strings (max 200 chars each)');
    } else {
      lines = raw.lines as string[];
    }
  }

  // Disposition/combat coherence — the rules that keep a def honest.
  if (disposition === 'friendly' && combat) {
    errors.push('friendly actors cannot carry a combat block (make them neutral)');
  }
  if (disposition === 'hostile' && !combat) {
    errors.push('hostile actors require a combat block');
  }
  // Protection coherence: friendly is already beyond combat's reach;
  // an invulnerable actor must be fightable for the ward to mean
  // anything; a hostile nobody can strike back against is griefing
  // by construction, not content.
  if (disposition === 'friendly' && protection !== undefined) {
    errors.push('friendly actors cannot carry protection (they are already unhittable)');
  }
  if (protection === 'invulnerable' && !combat) {
    errors.push('invulnerable requires a combat block (there is nothing to ward without one)');
  }
  if (disposition === 'hostile' && protection === 'untargetable') {
    errors.push('hostile actors cannot be untargetable (an unstrikeable aggressor is incoherent)');
  }

  if (errors.length > 0) return { ok: false, errors: errors.map((e) => `${id || '<actor>'}: ${e}`) };
  return {
    ok: true,
    actor: {
      id,
      name,
      title,
      examine,
      disposition: disposition as NpcActorDef['disposition'],
      protection: protection as NpcActorDef['protection'],
      model: model!,
      equipment,
      inventory,
      lines,
      combat,
      dialogue,
      shop,
    },
  };
}

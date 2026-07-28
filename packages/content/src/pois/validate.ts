import { Tile, sanitizeSignText } from '@devcraft/shared';
import { NPC_ACTORS } from '../actors/registry.js';
import { DANGER_LAWS } from '../danger.js';
import { LOOT_TABLES } from '../loot/tables.js';
import { NPCS } from '../npcs.js';
import { ROUTINES } from '../routines/registry.js';
import type { PoiActorEntry, PoiCues, PoiDef, PoiGarrisonEntry } from './types.js';

/**
 * THE ONE VALIDATOR — every path a PoiDef can enter the game walks
 * through here: authored JSON at registry init (throws on bad
 * content), DB rows reassembled at boot, and tool submissions from
 * the Content Studio bench. Collects ALL errors (tooling wants the
 * full list, not the first). Mirrors validateNpcActor.
 */

export type ValidatePoiResult =
  | { ok: true; def: PoiDef }
  | { ok: false; errors: string[] };

const POI_ID_RE = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_TIER = DANGER_LAWS.length - 1;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIntPair(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) && v.length === 2 &&
    Number.isInteger(v[0]) && Number.isInteger(v[1])
  );
}

/**
 * Flag keys the cleared ledger accepts — the same slug shape dialogue
 * requires/forbids read, so a broken warcamp can gate a guard's line.
 * (No colons: the dlg: namespace stays the system's by construction.)
 */
const FLAG_RE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * Validate a raw doc into a normalized PoiDef. `refs.prefabIds`
 * (when supplied — the server knows the live library, authored code
 * knows the builtins) turns unknown-prefab references into errors;
 * without it they pass here and warn at compose time. Actor, routine,
 * and loot-table references check the live registries by default;
 * refs may override with the server's DB-loaded sets.
 */
export function validatePoiDef(
  raw: unknown,
  refs: {
    prefabIds?: ReadonlySet<string>;
    actorIds?: ReadonlySet<string>;
    routineIds?: ReadonlySet<string>;
    lootTables?: ReadonlySet<string>;
  } = {},
): ValidatePoiResult {
  const hasActor = (id: string) => refs.actorIds?.has(id) ?? NPC_ACTORS.has(id);
  const hasRoutine = (id: string) => refs.routineIds?.has(id) ?? ROUTINES.has(id);
  const hasTable = (id: string) => refs.lootTables?.has(id) ?? LOOT_TABLES.has(id);
  if (!isRecord(raw)) return { ok: false, errors: ['poi def must be an object'] };
  const errors: string[] = [];
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!POI_ID_RE.test(id)) errors.push(`id '${String(raw.id)}' must match ${POI_ID_RE}`);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) errors.push('name is empty');
  const description =
    raw.description === undefined
      ? undefined
      : typeof raw.description === 'string'
        ? raw.description
        : (errors.push('description must be a string'), undefined);

  // Tiers.
  let tiers: [number, number] = [1, 1];
  if (!isIntPair(raw.tiers)) {
    errors.push('tiers must be [min, max] integers');
  } else {
    tiers = [raw.tiers[0], raw.tiers[1]];
    if (tiers[0] < 1 || tiers[1] > MAX_TIER || tiers[0] > tiers[1]) {
      errors.push(`tiers ${tiers[0]}..${tiers[1]} outside 1..${MAX_TIER} or inverted`);
    }
  }

  // Weight.
  // Weight 0 is legal and means "never rolls on its own" — the
  // authored-sites law places these by hand (the Last Lamp).
  const weight = typeof raw.weight === 'number' ? raw.weight : NaN;
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    errors.push('weight must be a number in [0, 100]');
  }

  // Prefab pool.
  const prefabs: string[] = [];
  if (!Array.isArray(raw.prefabs) || raw.prefabs.length === 0) {
    errors.push('prefabs must be a non-empty array of prefab ids');
  } else {
    for (const p of raw.prefabs) {
      if (typeof p !== 'string' || !p.trim()) {
        errors.push('prefab ids must be non-empty strings');
        continue;
      }
      if (refs.prefabIds && !refs.prefabIds.has(p)) {
        errors.push(`unknown prefab '${p}'`);
      }
      if (prefabs.includes(p)) errors.push(`duplicate prefab '${p}' in the pool`);
      prefabs.push(p);
    }
  }

  // Garrison.
  const garrison: PoiGarrisonEntry[] = [];
  if (raw.garrison !== undefined && !Array.isArray(raw.garrison)) {
    errors.push('garrison must be an array');
  } else {
    for (const [i, g] of ((raw.garrison as unknown[]) ?? []).entries()) {
      const at = `garrison[${i}]`;
      if (!isRecord(g)) {
        errors.push(`${at}: must be an object`);
        continue;
      }
      const npc = typeof g.npc === 'string' ? g.npc : '';
      if (!NPCS.has(npc)) errors.push(`${at}: unknown npc '${String(g.npc)}'`);
      let count: [number, number] = [1, 1];
      if (!isIntPair(g.count)) {
        errors.push(`${at}: count must be [min, max] integers`);
      } else {
        count = [g.count[0], g.count[1]];
        if (count[0] < 0 || count[1] < count[0] || count[1] > 12) {
          errors.push(`${at}: count ${count[0]}..${count[1]} invalid (0 ≤ min ≤ max ≤ 12)`);
        }
      }
      const role = g.role === 'holdfast' || g.role === 'sentry' ? g.role : null;
      if (!role) errors.push(`${at}: role must be 'holdfast' or 'sentry'`);
      const minTier =
        g.minTier === undefined
          ? undefined
          : Number.isInteger(g.minTier)
            ? (g.minTier as number)
            : (errors.push(`${at}: minTier must be an integer`), undefined);
      if (minTier !== undefined && (minTier < tiers[0] || minTier > tiers[1])) {
        errors.push(`${at}: minTier ${minTier} outside the archetype's tiers ${tiers[0]}..${tiers[1]}`);
      }
      const levelOffset =
        g.levelOffset === undefined
          ? undefined
          : Number.isInteger(g.levelOffset) && (g.levelOffset as number) >= 0 &&
              (g.levelOffset as number) <= 20
            ? (g.levelOffset as number)
            : (errors.push(`${at}: levelOffset must be an integer 0..20`), undefined);
      const gname =
        g.name === undefined
          ? undefined
          : typeof g.name === 'string' && g.name.trim()
            ? g.name
            : (errors.push(`${at}: name must be a non-empty string`), undefined);
      const patrol =
        g.patrol === undefined
          ? undefined
          : typeof g.patrol === 'boolean'
            ? g.patrol
            : (errors.push(`${at}: patrol must be a boolean`), undefined);
      // The patrol walks the ring — only sentries stand on the ring.
      if (patrol && role === 'holdfast') {
        errors.push(`${at}: patrol is a sentry trait (holdfast bodies keep the heart)`);
      }
      let hours: { from: number; to: number } | undefined;
      if (g.hours !== undefined) {
        const h = g.hours as Record<string, unknown>;
        const okHour = (v: unknown): v is number =>
          typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 24;
        if (!isRecord(g.hours) || !okHour(h.from) || !okHour(h.to)) {
          errors.push(`${at}: hours must be {from, to} in [0, 24)`);
        } else if (h.from === h.to) {
          errors.push(`${at}: hours from === to (an empty window; omit hours for always-on)`);
        } else {
          hours = { from: h.from, to: h.to };
        }
      }
      let names: string[] | undefined;
      if (g.names !== undefined) {
        if (!Array.isArray(g.names) || g.names.length === 0) {
          errors.push(`${at}: names must be a non-empty array of strings`);
        } else if (g.names.some((n) => typeof n !== 'string' || !n.trim())) {
          errors.push(`${at}: names entries must be non-empty strings`);
        } else {
          names = g.names as string[];
          if (count[1] > 1) {
            errors.push(`${at}: a name pool crowns one champion — count must be [1, 1]`);
          }
        }
      }
      if (role) {
        garrison.push({
          npc,
          count,
          role,
          ...(minTier !== undefined ? { minTier } : {}),
          ...(levelOffset !== undefined ? { levelOffset } : {}),
          ...(gname !== undefined ? { name: gname } : {}),
          ...(patrol !== undefined ? { patrol } : {}),
          ...(hours !== undefined ? { hours } : {}),
          ...(names !== undefined ? { names } : {}),
        });
      }
    }
  }

  // Chest bonus.
  const chestTierBonus =
    raw.chestTierBonus === undefined
      ? undefined
      : Number.isInteger(raw.chestTierBonus) && (raw.chestTierBonus as number) >= 0 &&
          (raw.chestTierBonus as number) <= 2
        ? (raw.chestTierBonus as number)
        : (errors.push('chestTierBonus must be an integer 0..2'), undefined);

  // Cues.
  let cues: PoiCues | undefined;
  if (raw.cues !== undefined) {
    if (!isRecord(raw.cues)) {
      errors.push('cues must be an object');
    } else {
      const c = raw.cues;
      const clearing =
        c.clearing === undefined
          ? undefined
          : Number.isInteger(c.clearing) && (c.clearing as number) >= 1 &&
              (c.clearing as number) <= 10
            ? (c.clearing as number)
            : (errors.push('cues.clearing must be an integer 1..10'), undefined);
      const approachPath =
        c.approachPath === undefined
          ? undefined
          : typeof c.approachPath === 'boolean'
            ? c.approachPath
            : (errors.push('cues.approachPath must be a boolean'), undefined);
      const scatter: Array<{ tile: string; count: number }> = [];
      if (c.scatter !== undefined) {
        if (!Array.isArray(c.scatter)) {
          errors.push('cues.scatter must be an array');
        } else {
          for (const [i, s] of c.scatter.entries()) {
            if (!isRecord(s) || typeof s.tile !== 'string' || !Number.isInteger(s.count)) {
              errors.push(`cues.scatter[${i}]: needs {tile: string, count: int}`);
              continue;
            }
            if (!(s.tile in Tile) || typeof Tile[s.tile as keyof typeof Tile] !== 'number') {
              errors.push(`cues.scatter[${i}]: unknown tile name '${s.tile}'`);
              continue;
            }
            if ((s.count as number) < 1 || (s.count as number) > 8) {
              errors.push(`cues.scatter[${i}]: count must be 1..8`);
              continue;
            }
            scatter.push({ tile: s.tile, count: s.count as number });
          }
        }
      }
      cues = {
        ...(clearing !== undefined ? { clearing } : {}),
        ...(approachPath !== undefined ? { approachPath } : {}),
        ...(scatter.length > 0 ? { scatter } : {}),
      };
      if (Object.keys(cues).length === 0) cues = undefined;
    }
  }

  // Friendly staff.
  const actors: PoiActorEntry[] = [];
  if (raw.actors !== undefined && !Array.isArray(raw.actors)) {
    errors.push('actors must be an array');
  } else {
    for (const [i, a] of ((raw.actors as unknown[]) ?? []).entries()) {
      const at = `actors[${i}]`;
      if (!isRecord(a)) {
        errors.push(`${at}: must be an object`);
        continue;
      }
      const pool: string[] = [];
      if (!Array.isArray(a.pool) || a.pool.length === 0) {
        errors.push(`${at}: pool must be a non-empty array of actor slugs`);
      } else {
        for (const p of a.pool) {
          if (typeof p !== 'string' || !hasActor(p)) {
            errors.push(`${at}: unknown actor '${String(p)}'`);
            continue;
          }
          pool.push(p);
        }
      }
      const post = a.post === 'hearth' || a.post === 'watch' ? a.post : null;
      if (!post) errors.push(`${at}: post must be 'hearth' or 'watch'`);
      const routine =
        a.routine === undefined
          ? undefined
          : typeof a.routine === 'string' && hasRoutine(a.routine)
            ? a.routine
            : (errors.push(`${at}: unknown routine '${String(a.routine)}'`), undefined);
      if (pool.length > 0 && post) {
        actors.push({ pool, post, ...(routine !== undefined ? { routine } : {}) });
      }
    }
  }

  // Haven.
  const haven =
    raw.haven === undefined
      ? undefined
      : isRecord(raw.haven) && Number.isInteger(raw.haven.safeR) &&
          (raw.haven.safeR as number) >= 6 && (raw.haven.safeR as number) <= 40
        ? { safeR: raw.haven.safeR as number }
        : (errors.push('haven must be {safeR: int 6..40}'), undefined);

  // Strongbox overrides.
  const chestLoot =
    raw.chestLoot === undefined
      ? undefined
      : typeof raw.chestLoot === 'string' && hasTable(raw.chestLoot)
        ? raw.chestLoot
        : (errors.push(`unknown chestLoot table '${String(raw.chestLoot)}'`), undefined);
  const chestWarded =
    raw.chestWarded === undefined
      ? undefined
      : typeof raw.chestWarded === 'boolean'
        ? raw.chestWarded
        : (errors.push('chestWarded must be a boolean'), undefined);
  if (chestWarded && (!Array.isArray(raw.garrison) || raw.garrison.length === 0)) {
    errors.push('chestWarded needs a garrison — a ward with no keeper never breaks');
  }

  // Sign copy: a pool of boards' words. The shared sanitizer is the
  // only length law — it trims rather than rejects, so a def written
  // by a tool can't fail validation over a stray character, but the
  // SHAPE must be right or the words would never reach a board.
  let signs: Array<{ title: string; lines?: string[] }> | undefined;
  if (raw.signs !== undefined) {
    if (!Array.isArray(raw.signs) || raw.signs.length === 0) {
      errors.push('signs must be a non-empty array of {title, lines?}');
    } else {
      signs = [];
      for (const entry of raw.signs) {
        if (!isRecord(entry) || typeof entry.title !== 'string') {
          errors.push('each sign needs a string title');
          continue;
        }
        if (entry.lines !== undefined) {
          if (!Array.isArray(entry.lines) || entry.lines.some((l) => typeof l !== 'string')) {
            errors.push(`sign '${entry.title}': lines must be strings`);
            continue;
          }
        }
        const text = sanitizeSignText({
          title: entry.title,
          lines: (entry.lines as string[] | undefined) ?? [],
        });
        if (text.title === '' && text.lines.length === 0) {
          errors.push('a sign with nothing on it is not content — drop the entry');
          continue;
        }
        signs.push({ title: text.title, ...(text.lines.length > 0 ? { lines: text.lines } : {}) });
      }
    }
  }

  // The cleared-flag hook.
  const clearedFlag =
    raw.clearedFlag === undefined
      ? undefined
      : typeof raw.clearedFlag === 'string' && FLAG_RE.test(raw.clearedFlag)
        ? raw.clearedFlag
        : (errors.push(
            `clearedFlag '${String(raw.clearedFlag)}' must match ${FLAG_RE}`,
          ), undefined);

  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e) => `${id || '<poi>'}: ${e}`) };
  }
  return {
    ok: true,
    def: {
      id,
      name,
      ...(description !== undefined ? { description } : {}),
      tiers,
      weight,
      prefabs,
      garrison,
      ...(chestTierBonus !== undefined ? { chestTierBonus } : {}),
      ...(cues !== undefined ? { cues } : {}),
      ...(actors.length > 0 ? { actors } : {}),
      ...(haven !== undefined ? { haven } : {}),
      ...(chestLoot !== undefined ? { chestLoot } : {}),
      ...(chestWarded !== undefined ? { chestWarded } : {}),
      ...(clearedFlag !== undefined ? { clearedFlag } : {}),
      ...(signs !== undefined && signs.length > 0 ? { signs } : {}),
    },
  };
}

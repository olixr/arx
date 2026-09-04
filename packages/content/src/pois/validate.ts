import { Tile, sanitizeSignText } from '@arx/shared';
import { NPC_ACTORS } from '../actors/registry.js';
import { DANGER_LAWS } from '../danger.js';
import { LOOT_TABLES } from '../loot/tables.js';
import { NPCS } from '../npcs.js';
import { ROUTINES } from '../routines/registry.js';
import type {
  PoiActorEntry,
  PoiBoldness,
  PoiBoldnessStage,
  PoiCompound,
  PoiCues,
  PoiDef,
  PoiGarrisonEntry,
} from './types.js';

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
  // THE TERRITORY FIELD (Phase 5): the family slug.
  const family =
    raw.family === undefined
      ? undefined
      : typeof raw.family === 'string' && /^[a-z][a-z0-9_]*$/.test(raw.family)
        ? raw.family
        : (errors.push('family must be a lowercase slug'), undefined);

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

  // Garrison — one vetting law for the base muster AND every boldness
  // rung (the boldness ladder may never invent laxer rules).
  const vetGarrisonList = (rawList: unknown, listName: string): PoiGarrisonEntry[] => {
    const out: PoiGarrisonEntry[] = [];
    if (rawList !== undefined && !Array.isArray(rawList)) {
      errors.push(`${listName} must be an array`);
      return out;
    }
    for (const [i, g] of ((rawList as unknown[]) ?? []).entries()) {
      const at = `${listName}[${i}]`;
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
      // THE WILD CROWN: the flag the server's champion forge reads.
      // It was silently dropped here before the drowned villages —
      // the type promised it, the forge read it, the vet ate it.
      const crowned =
        g.crowned === undefined
          ? undefined
          : typeof g.crowned === 'boolean'
            ? g.crowned
            : (errors.push(`${at}: crowned must be a boolean`), undefined);
      if (crowned) {
        // A crown is ONE named body: an unnamed crowned row could have
        // its bodies peeled onto posts (posted spawns carry no crown —
        // the crown evaporates), and a count above one would expand
        // into N spawn points all carrying the same crown seed and
        // name — N identical bosses.
        if (names === undefined) {
          errors.push(`${at}: a crowned row needs a names pool (the crown wants a name)`);
        }
        if (count[1] > 1) {
          errors.push(`${at}: a crowned row musters one body — count must be [1, 1]`);
        }
      }
      // THE WILD TAKES SIDES: the per-row tribe override. Typed on
      // PoiGarrisonEntry and read by the composer since the hostility
      // epic — and, like `crowned` before it, silently EATEN here: a
      // def could wear `tribe: 'gnoll'` and every body mustered in the
      // bestiary's own colours. The contested lands stand on this
      // field (gnoll days / dead nights, the Doorless, the pressed
      // Legion, Aske's crew), so it is carried now.
      const tribe =
        g.tribe === undefined
          ? undefined
          : typeof g.tribe === 'string' && /^[a-z][a-z0-9_]*$/.test(g.tribe)
            ? g.tribe
            : (errors.push(`${at}: tribe must be a lowercase slug`), undefined);
      if (role) {
        out.push({
          npc,
          count,
          role,
          ...(minTier !== undefined ? { minTier } : {}),
          ...(levelOffset !== undefined ? { levelOffset } : {}),
          ...(gname !== undefined ? { name: gname } : {}),
          ...(patrol !== undefined ? { patrol } : {}),
          ...(hours !== undefined ? { hours } : {}),
          ...(names !== undefined ? { names } : {}),
          ...(crowned !== undefined ? { crowned } : {}),
          ...(tribe !== undefined ? { tribe } : {}),
        });
      }
    }
    return out;
  };
  const garrison = vetGarrisonList(raw.garrison, 'garrison');

  // Chest bonus.
  const chestTierBonus =
    raw.chestTierBonus === undefined
      ? undefined
      : Number.isInteger(raw.chestTierBonus) && (raw.chestTierBonus as number) >= 0 &&
          (raw.chestTierBonus as number) <= 2
        ? (raw.chestTierBonus as number)
        : (errors.push('chestTierBonus must be an integer 0..2'), undefined);

  // Scatter vetting — shared by the base cues and the boldness rungs.
  const vetScatter = (
    rawList: unknown,
    listName: string,
  ): Array<{ tile: string; count: number }> => {
    const out: Array<{ tile: string; count: number }> = [];
    if (rawList === undefined) return out;
    if (!Array.isArray(rawList)) {
      errors.push(`${listName} must be an array`);
      return out;
    }
    for (const [i, s] of rawList.entries()) {
      if (!isRecord(s) || typeof s.tile !== 'string' || !Number.isInteger(s.count)) {
        errors.push(`${listName}[${i}]: needs {tile: string, count: int}`);
        continue;
      }
      if (!(s.tile in Tile) || typeof Tile[s.tile as keyof typeof Tile] !== 'number') {
        errors.push(`${listName}[${i}]: unknown tile name '${s.tile}'`);
        continue;
      }
      if ((s.count as number) < 1 || (s.count as number) > 8) {
        errors.push(`${listName}[${i}]: count must be 1..8`);
        continue;
      }
      out.push({ tile: s.tile, count: s.count as number });
    }
    return out;
  };

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
      const scatter = vetScatter(c.scatter, 'cues.scatter');
      cues = {
        ...(clearing !== undefined ? { clearing } : {}),
        ...(approachPath !== undefined ? { approachPath } : {}),
        ...(scatter.length > 0 ? { scatter } : {}),
      };
      if (Object.keys(cues).length === 0) cues = undefined;
    }
  }

  // The boldness ladder (the living frontier, phase 2). THE FREQUENCY
  // LAW is enforced here: a rung's levelOffset may never exceed the
  // base garrison's own ceiling — an emboldened camp grows busier,
  // never silently deadlier at the same map dot.
  let boldness: PoiBoldness | undefined;
  if (raw.boldness !== undefined) {
    if (!isRecord(raw.boldness)) {
      errors.push('boldness must be an object');
    } else {
      const b = raw.boldness;
      const stages: PoiBoldnessStage[] = [];
      if (!Array.isArray(b.stages) || b.stages.length === 0 || b.stages.length > 3) {
        errors.push('boldness.stages must be an array of 1..3 rungs');
      } else {
        const baseCap = garrison.reduce((m, g) => Math.max(m, g.levelOffset ?? 0), 0);
        for (const [si, st] of b.stages.entries()) {
          const at = `boldness.stages[${si}]`;
          if (!isRecord(st)) {
            errors.push(`${at}: must be an object`);
            continue;
          }
          const stGarrison = vetGarrisonList(st.garrison, `${at}.garrison`);
          const stScatter = vetScatter(st.scatter, `${at}.scatter`);
          for (const g of stGarrison) {
            if ((g.levelOffset ?? 0) > baseCap) {
              errors.push(
                `${at}: levelOffset ${g.levelOffset} exceeds the base garrison's ceiling ` +
                  `${baseCap} — boldness adds bodies, never a deadlier camp (the frequency law)`,
              );
            }
          }
          if (stGarrison.length === 0 && stScatter.length === 0) {
            errors.push(`${at}: an empty rung escalates nothing — give it garrison or scatter`);
            continue;
          }
          stages.push({
            ...(stGarrison.length > 0 ? { garrison: stGarrison } : {}),
            ...(stScatter.length > 0 ? { scatter: stScatter } : {}),
          });
        }
      }
      const satellites =
        b.satellites === undefined
          ? undefined
          : typeof b.satellites === 'boolean'
            ? b.satellites
            : (errors.push('boldness.satellites must be a boolean'), undefined);
      let satelliteDef: string | undefined;
      if (b.satelliteDef !== undefined) {
        if (typeof b.satelliteDef !== 'string' || b.satelliteDef.length === 0) {
          errors.push('boldness.satelliteDef must be a def id');
        } else if (satellites !== true) {
          errors.push('boldness.satelliteDef needs satellites: true (a reach with no arm)');
        } else {
          satelliteDef = b.satelliteDef;
        }
      }
      let rivalDef: string | undefined;
      if (b.rivalDef !== undefined) {
        if (typeof b.rivalDef !== 'string' || b.rivalDef.length === 0) {
          errors.push('boldness.rivalDef must be a def id');
        } else if (satellites !== true) {
          errors.push('boldness.rivalDef needs satellites: true (a rival is dealt as the reach)');
        } else if (b.rivalDef === id) {
          errors.push('boldness.rivalDef must not name the def itself (that is the default reach)');
        } else {
          rivalDef = b.rivalDef;
        }
      }
      if (garrison.length === 0) {
        errors.push('boldness needs a garrison — a site with no muster has nothing to embolden');
      }
      if (stages.length > 0) {
        boldness = {
          stages,
          ...(satellites !== undefined ? { satellites } : {}),
          ...(satelliteDef !== undefined ? { satelliteDef } : {}),
          ...(rivalDef !== undefined ? { rivalDef } : {}),
        };
      }
    }
  }

  // THE WAR-GROUND (Phase 4): the compound block.
  let compound: PoiCompound | undefined;
  if (raw.compound !== undefined) {
    if (!isRecord(raw.compound)) {
      errors.push('compound must be an object');
    } else {
      const c = raw.compound;
      const wings = isRecord(c.wings) ? c.wings : undefined;
      const pool: string[] = [];
      if (!wings || !Array.isArray(wings.pool) || wings.pool.length === 0) {
        errors.push('compound.wings.pool must be a non-empty array of prefab ids');
      } else {
        for (const p of wings.pool) {
          if (typeof p !== 'string' || p.length === 0) {
            errors.push('compound.wings.pool entries must be prefab ids');
            continue;
          }
          if (refs.prefabIds && !refs.prefabIds.has(p)) {
            errors.push(`compound wing prefab '${p}' is not in the library`);
          }
          pool.push(p);
        }
      }
      let count: readonly [number, number] = [2, 3];
      const rawCount = wings?.count;
      if (
        !Array.isArray(rawCount) ||
        rawCount.length !== 2 ||
        !Number.isInteger(rawCount[0]) ||
        !Number.isInteger(rawCount[1]) ||
        (rawCount[0] as number) < 1 ||
        (rawCount[0] as number) > (rawCount[1] as number) ||
        (rawCount[1] as number) > 4
      ) {
        errors.push('compound.wings.count must be integers [min, max] inside [1, 4]');
      } else {
        count = [rawCount[0] as number, rawCount[1] as number];
      }
      const wingGarrison = vetGarrisonList(c.wingGarrison, 'compound.wingGarrison');
      if (wingGarrison.length === 0) {
        errors.push('compound.wingGarrison must field at least one entry — a wing IS its chapter');
      }
      if (garrison.length === 0) {
        errors.push('a compound hold needs a court garrison — the last stand is the point');
      }
      if (raw.actors !== undefined || raw.haven !== undefined) {
        errors.push('compound is hostile by definition — it cannot carry actors or a haven');
      }
      // weight is the PROMOTION weight among holds — zero would make
      // the def unreachable even by promotion; refuse the confusion.
      if (typeof raw.weight === 'number' && !(raw.weight > 0)) {
        errors.push('a compound def needs weight > 0 (its weight is the promotion pick weight)');
      }
      if (errors.length === 0 || pool.length > 0) {
        compound = { wings: { pool, count }, wingGarrison };
      }
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

  // THE SHORE CAMP flag: this def only stands where the water is.
  const shore =
    raw.shore === undefined
      ? undefined
      : typeof raw.shore === 'boolean'
        ? raw.shore
        : (errors.push('shore must be a boolean'), undefined);

  // The cleared-flag hook.
  const clearedFlag =
    raw.clearedFlag === undefined
      ? undefined
      : typeof raw.clearedFlag === 'string' && FLAG_RE.test(raw.clearedFlag)
        ? raw.clearedFlag
        : (errors.push(
            `clearedFlag '${String(raw.clearedFlag)}' must match ${FLAG_RE}`,
          ), undefined);

  // THE CLOSED SHAPE (the crowned lesson): this validator rebuilds the
  // def field-by-field, so a key it doesn't know is a key that silently
  // vanishes — exactly how `crowned` was eaten for its whole first
  // life. Unknown keys are errors now; the next typed-but-uncarried
  // field fails the build instead of degrading a shipped def.
  const KNOWN_KEYS = new Set([
    'id', 'name', 'description', 'family', 'shore', 'tiers', 'weight', 'prefabs',
    'garrison', 'chestTierBonus', 'cues', 'boldness', 'actors', 'haven',
    'chestLoot', 'chestWarded', 'clearedFlag', 'signs', 'compound',
  ]);
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) errors.push(`unknown field '${key}'`);
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e) => `${id || '<poi>'}: ${e}`) };
  }
  return {
    ok: true,
    def: {
      id,
      name,
      ...(description !== undefined ? { description } : {}),
      ...(family !== undefined ? { family } : {}),
      ...(shore !== undefined ? { shore } : {}),
      tiers,
      weight,
      prefabs,
      garrison,
      ...(chestTierBonus !== undefined ? { chestTierBonus } : {}),
      ...(cues !== undefined ? { cues } : {}),
      ...(boldness !== undefined ? { boldness } : {}),
      ...(actors.length > 0 ? { actors } : {}),
      ...(haven !== undefined ? { haven } : {}),
      ...(chestLoot !== undefined ? { chestLoot } : {}),
      ...(chestWarded !== undefined ? { chestWarded } : {}),
      ...(clearedFlag !== undefined ? { clearedFlag } : {}),
      ...(signs !== undefined && signs.length > 0 ? { signs } : {}),
      ...(compound !== undefined ? { compound } : {}),
    },
  };
}

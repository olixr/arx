/**
 * THE ROSTER STANDS INSPECTION — validateNpcDef whole (foundations
 * F6.3; moved verbatim from npcs.ts).
 */
import { DAMAGE_LANES } from '../npcLanes.js';
import { STATUS_IDS, StatusId } from '@arx/shared';
import { BOSS_KIT_MAX, TEMPERAMENT_BOUNDS } from '../npcs.js';
import type { NpcTemperament } from '../npcs.js';

/**
 * JSON-shape validator for a bestiary doc — the DB-first gate. Field
 * errors name the field; reference checks (loot tables, split
 * children) run against the caller-provided id sets so a whole
 * candidate registry can validate as one world.
 */
export function validateNpcDef(
  doc: unknown,
  refs: { lootTables: ReadonlySet<string>; npcIds: ReadonlySet<string> },
): string[] {
  const errors: string[] = [];
  if (typeof doc !== 'object' || doc === null) return ['doc is not an object'];
  const d = doc as Record<string, unknown>;
  const need = (field: string, type: 'string' | 'number'): void => {
    if (typeof d[field] !== type) errors.push(`${field} must be a ${type}`);
  };
  need('id', 'string');
  need('name', 'string');
  need('color', 'string');
  for (const f of [
    'level', 'maxHp', 'damage', 'attackRange', 'attackCooldownTicks', 'aggroRange',
    'leashRange', 'speed', 'xpReward', 'respawnSec', 'radius',
  ]) {
    need(f, 'number');
    if (typeof d[f] === 'number' && (!Number.isFinite(d[f] as number) || (d[f] as number) < 0)) {
      errors.push(`${f} must be a non-negative number`);
    }
  }
  if (typeof d.id === 'string' && !/^[a-z][a-z0-9_]*$/.test(d.id)) {
    errors.push('id must be lowercase [a-z0-9_]');
  }
  if (!Array.isArray(d.loot)) {
    errors.push('loot must be an array of loot-table ids');
  } else {
    for (const t of d.loot) {
      if (typeof t !== 'string' || !refs.lootTables.has(t)) {
        errors.push(`loot table '${String(t)}' does not exist`);
      }
    }
  }
  if (
    d.hitHeight !== undefined &&
    (typeof d.hitHeight !== 'number' || !Number.isFinite(d.hitHeight) || d.hitHeight < 0)
  ) {
    // A negative height inverts the feet→crown hit band.
    errors.push('hitHeight must be a non-negative number');
  }
  // THE COMBAT FIELDS ARE COMBAT LAW (audit 2026-08-15): attackStatus,
  // resist/weak, and lanes are typed, shipped on dozens of defs, and
  // applied to players on every landed blow — yet the CMS door never
  // vetted them, so a live edit could ride any shape (a NaN power, an
  // unknown status) straight into damage math. Checked whole now.
  if (d.attackStatus !== undefined) {
    const a = d.attackStatus as Record<string, unknown>;
    if (
      typeof a !== 'object' ||
      a === null ||
      !STATUS_IDS.includes(a.status as StatusId) ||
      typeof a.power !== 'number' ||
      !Number.isFinite(a.power) ||
      (a.power as number) < 0 ||
      typeof a.durationTicks !== 'number' ||
      !Number.isInteger(a.durationTicks) ||
      (a.durationTicks as number) < 1
    ) {
      errors.push(
        `attackStatus must be {status: ${STATUS_IDS.join('|')}, power >= 0, durationTicks >= 1}`,
      );
    }
  }
  for (const f of ['resist', 'weak'] as const) {
    if (d[f] !== undefined) {
      if (
        !Array.isArray(d[f]) ||
        (d[f] as unknown[]).some((s) => !STATUS_IDS.includes(s as StatusId))
      ) {
        errors.push(`${f} must be an array of status ids (${STATUS_IDS.join('|')})`);
      }
    }
  }
  if (d.lanes !== undefined) {
    const l = d.lanes as Record<string, unknown>;
    if (typeof l !== 'object' || l === null) {
      errors.push('lanes must be an object');
    } else {
      for (const f of ['weak', 'resist'] as const) {
        if (
          l[f] !== undefined &&
          (!Array.isArray(l[f]) ||
            (l[f] as unknown[]).some((s) => !DAMAGE_LANES.includes(s as (typeof DAMAGE_LANES)[number])))
        ) {
          errors.push(`lanes.${f} must be an array of lanes (${DAMAGE_LANES.join('|')})`);
        }
      }
      for (const key of Object.keys(l)) {
        if (key !== 'weak' && key !== 'resist') errors.push(`lanes has unknown field '${key}'`);
      }
    }
  }
  if (d.special !== undefined) {
    errors.push("special is retired — author kit: [{ability, cooldownTicks, ...}] (docs/enemy-arts-plan.md)");
  }
  // THE HUNTER'S HEART: temperament is combat law like lanes — every
  // dial rides straight into the state machine's clocks, so a NaN
  // nerve or a 10-hour grit is refused at the door, and unknown keys
  // die here instead of silently in a drawer.
  if (d.temperament !== undefined) {
    const t = d.temperament as Record<string, unknown>;
    if (typeof t !== 'object' || t === null || Array.isArray(t)) {
      errors.push('temperament must be an object');
    } else {
      for (const key of Object.keys(t)) {
        const bounds = TEMPERAMENT_BOUNDS[key as keyof NpcTemperament];
        if (bounds === undefined) {
          errors.push(`temperament has unknown field '${key}'`);
          continue;
        }
        const v = t[key];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < bounds[0] || v > bounds[1]) {
          errors.push(`temperament.${key} must be a number in [${bounds[0]}, ${bounds[1]}]`);
        }
      }
    }
  }
  if (d.kit !== undefined) {
    const kitMax = d.boss !== undefined ? BOSS_KIT_MAX : 6;
    if (!Array.isArray(d.kit) || d.kit.length === 0 || d.kit.length > kitMax) {
      errors.push(`kit must be an array of 1..${kitMax} entries`);
    } else {
      d.kit.forEach((raw, i) => {
        const k = raw as Record<string, unknown>;
        const at = `kit[${i}]`;
        if (typeof k?.ability !== 'string') errors.push(`${at}.ability must be a string`);
        if (typeof k?.cooldownTicks !== 'number' || (k.cooldownTicks as number) < 50) {
          errors.push(`${at}.cooldownTicks must be a number >= 50 (no spam voices)`);
        }
        for (const f of ['windupTicks', 'minRange', 'maxRange', 'weight', 'initialCooldownTicks', 'minLevel'] as const) {
          if (k?.[f] !== undefined && (typeof k[f] !== 'number' || !Number.isFinite(k[f] as number) || (k[f] as number) < 0)) {
            errors.push(`${at}.${f} must be a non-negative number`);
          }
        }
        for (const f of ['hpBelow', 'hpAbove'] as const) {
          if (k?.[f] !== undefined && (typeof k[f] !== 'number' || (k[f] as number) <= 0 || (k[f] as number) > 1)) {
            errors.push(`${at}.${f} must be a fraction in (0, 1]`);
          }
        }
        if (k?.windupTicks !== undefined && (k.windupTicks as number) > 100) {
          errors.push(`${at}.windupTicks must be <= 100 (a breath, not a siege)`);
        }
        if (k?.aim !== undefined && k.aim !== 'target' && k.aim !== 'self' && k.aim !== 'lead') {
          errors.push(`${at}.aim must be 'target' | 'self' | 'lead'`);
        }
        if (k?.rally !== undefined && typeof k.rally !== 'boolean') {
          errors.push(`${at}.rally must be a boolean`);
        }
        if (k?.lope !== undefined) {
          if (typeof k.lope !== 'boolean') {
            errors.push(`${at}.lope must be a boolean`);
          } else if (k.lope && (typeof k.minRange !== 'number' || (k.minRange as number) <= 0)) {
            errors.push(`${at}.lope requires minRange > 0 (the gap the body opens before it speaks)`);
          }
        }
        if (
          typeof k?.minRange === 'number' && typeof k?.maxRange === 'number' &&
          (k.minRange as number) > (k.maxRange as number)
        ) {
          errors.push(`${at}: minRange must not exceed maxRange`);
        }
        for (const f of ['phase', 'phaseMax'] as const) {
          if (
            k?.[f] !== undefined &&
            (typeof k[f] !== 'number' || !Number.isInteger(k[f] as number) ||
              (k[f] as number) < 0 || (k[f] as number) > 3)
          ) {
            errors.push(`${at}.${f} must be an integer phase index in [0, 3]`);
          }
        }
        if ((k?.phase !== undefined || k?.phaseMax !== undefined || k?.then !== undefined) && d.boss === undefined) {
          errors.push(`${at}: phase/phaseMax/then are boss laws — the def wears no boss block`);
        }
        if (
          typeof k?.phase === 'number' && typeof k?.phaseMax === 'number' &&
          (k.phase as number) > (k.phaseMax as number)
        ) {
          errors.push(`${at}: phase must not exceed phaseMax`);
        }
        if (k?.then !== undefined && typeof k.then !== 'string') {
          errors.push(`${at}.then must be an ability id string`);
        }
      });
      // THE CHAIN's shape laws: every link lands on a kit-mate, no
      // entry chains to itself, no cycle, no combo past 3 links.
      if (d.boss !== undefined) {
        const kit = d.kit as Array<Record<string, unknown>>;
        const idxOf = new Map<string, number>();
        kit.forEach((k, i) => {
          if (typeof k?.ability === 'string') idxOf.set(k.ability as string, i);
        });
        kit.forEach((k, i) => {
          if (typeof k?.then !== 'string') return;
          const at = `kit[${i}]`;
          if (!idxOf.has(k.then as string)) {
            errors.push(`${at}.then '${String(k.then)}' names no kit-mate of this def`);
            return;
          }
          let hops = 0;
          let cur: number | undefined = i;
          const seen = new Set<number>();
          while (cur !== undefined && typeof kit[cur]?.then === 'string') {
            if (seen.has(cur)) {
              errors.push(`${at}: chain loops — combos must end`);
              return;
            }
            seen.add(cur);
            cur = idxOf.get(kit[cur]!.then as string);
            if (++hops > 3) {
              errors.push(`${at}: chain runs past 3 links — a combo, not a script`);
              return;
            }
          }
        });
      }
    }
  }
  if (d.boss !== undefined) {
    const b = d.boss as Record<string, unknown>;
    if (typeof b !== 'object' || b === null) {
      errors.push('boss must be an object');
    } else {
      if (d.kit === undefined) {
        errors.push('boss requires a kit — a crowned foe with no voices is a contradiction');
      }
      if (!Array.isArray(b.phases) || b.phases.length === 0 || b.phases.length > 4) {
        errors.push('boss.phases must be an array of 1..4 rungs');
      } else {
        const kitAbilities = new Set(
          Array.isArray(d.kit)
            ? (d.kit as Array<Record<string, unknown>>)
                .map((k) => k?.ability)
                .filter((a): a is string => typeof a === 'string')
            : [],
        );
        let prev = 1;
        (b.phases as unknown[]).forEach((raw, i) => {
          const p = raw as Record<string, unknown>;
          const at = `boss.phases[${i}]`;
          if (i === 0) {
            if (p?.hpBelow !== undefined) {
              errors.push(`${at}.hpBelow must be absent — the first rung is the opening stance`);
            }
          } else if (
            typeof p?.hpBelow !== 'number' || (p.hpBelow as number) <= 0 || (p.hpBelow as number) >= prev
          ) {
            errors.push(`${at}.hpBelow must be a fraction in (0, 1), strictly descending the ladder`);
          } else {
            prev = p.hpBelow as number;
          }
          for (const f of ['name', 'bark', 'entry'] as const) {
            if (p?.[f] !== undefined && typeof p[f] !== 'string') {
              errors.push(`${at}.${f} must be a string`);
            }
          }
          for (const f of ['name', 'bark'] as const) {
            if (typeof p?.[f] === 'string' && (p[f] as string).length > 200) {
              errors.push(`${at}.${f} must be 200 chars or fewer`);
            }
          }
          if (typeof p?.entry === 'string' && !kitAbilities.has(p.entry as string)) {
            errors.push(`${at}.entry '${String(p.entry)}' names no kit-mate — the turn fires through the kit`);
          }
          if (
            p?.cdMult !== undefined &&
            (typeof p.cdMult !== 'number' || (p.cdMult as number) < 0.5 || (p.cdMult as number) > 1)
          ) {
            errors.push(`${at}.cdMult must be a number in [0.5, 1]`);
          }
          if (
            p?.speedMult !== undefined &&
            (typeof p.speedMult !== 'number' || (p.speedMult as number) < 0.75 || (p.speedMult as number) > 1.5)
          ) {
            errors.push(`${at}.speedMult must be a number in [0.75, 1.5]`);
          }
        });
      }
      if (b.title !== undefined && typeof b.title !== 'string') errors.push('boss.title must be a string');
      for (const f of ['engageBark', 'defeatBark'] as const) {
        if (b[f] !== undefined && (typeof b[f] !== 'string' || (b[f] as string).length > 200)) {
          errors.push(`boss.${f} must be a string of 200 chars or fewer`);
        }
      }
      if (
        b.knockbackMult !== undefined &&
        (typeof b.knockbackMult !== 'number' || (b.knockbackMult as number) < 0 || (b.knockbackMult as number) > 1.5)
      ) {
        errors.push('boss.knockbackMult must be a number in [0, 1.5]');
      }
      if (
        b.stunMult !== undefined &&
        (typeof b.stunMult !== 'number' || (b.stunMult as number) < 0 || (b.stunMult as number) > 2)
      ) {
        errors.push('boss.stunMult must be a number in [0, 2]');
      }
      if (
        b.arenaR !== undefined &&
        (typeof b.arenaR !== 'number' || (b.arenaR as number) < 4 || (b.arenaR as number) > 40)
      ) {
        errors.push('boss.arenaR must be a number in [4, 40] tiles');
      }
    }
  }
  if (d.ranged !== undefined) {
    const r = d.ranged as Record<string, unknown>;
    if (typeof r?.range !== 'number' || typeof r?.projectileSpeed !== 'number') {
      errors.push('ranged needs {range: number, projectileSpeed: number}');
    }
  }
  if (d.splitInto !== undefined) {
    const s = d.splitInto as Record<string, unknown>;
    if (typeof s?.npc !== 'string' || !refs.npcIds.has(s.npc as string)) {
      errors.push(`splitInto.npc '${String((s as { npc?: unknown })?.npc)}' does not exist`);
    }
    if (typeof s?.count !== 'number' || (s.count as number) < 1) {
      errors.push('splitInto.count must be ≥ 1');
    }
    // The engine caps split recursion "by data" — this is where that
    // data is capped: a def splitting into itself (or any cycle the
    // CMS lets through) makes death spawn exponentially.
    if (typeof d.id === 'string' && s?.npc === d.id) {
      errors.push('splitInto.npc may not be the def itself (death would spawn exponentially)');
    }
  }
  if (d.produce !== undefined) {
    const p = d.produce as Record<string, unknown>;
    if (typeof p?.item !== 'string' || typeof p?.cooldownSec !== 'number' || typeof p?.xp !== 'number') {
      errors.push('produce needs {item, cooldownSec, xp}');
    }
  }
  if (d.lays !== undefined) {
    const p = d.lays as Record<string, unknown>;
    if (
      typeof p?.item !== 'string' ||
      typeof p?.minSec !== 'number' ||
      typeof p?.maxSec !== 'number' ||
      typeof p?.xp !== 'number'
    ) {
      // The error message always claimed xp; the check now agrees
      // (an unchecked xp paid undefined beastcraft XP at pickup).
      errors.push('lays needs {item, minSec, maxSec, xp}');
    }
  }
  for (const f of ['pounce', 'craven'] as const) {
    if (d[f] !== undefined && typeof d[f] !== 'boolean') errors.push(`${f} must be a boolean`);
  }
  if (d.pack !== undefined && typeof d.pack !== 'string') errors.push('pack must be a string');
  if (
    d.sightArc !== undefined &&
    (typeof d.sightArc !== 'number' || d.sightArc < 30 || d.sightArc > 360)
  ) {
    errors.push('sightArc must be a number in [30, 360] degrees');
  }
  if (
    d.standoff !== undefined &&
    (typeof d.standoff !== 'number' || d.standoff < 1 || d.standoff > 12)
  ) {
    errors.push('standoff must be a number in [1, 12] tiles');
  }
  return errors;
}

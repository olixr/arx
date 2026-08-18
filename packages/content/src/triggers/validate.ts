import { isSkillId } from '@arx/shared';
import { FACTION_BAND_ORDER } from '../factions/factions.js';
import type { FactionBand } from '../factions/types.js';
import type {
  TriggerArea,
  TriggerCondition,
  TriggerDef,
  TriggerVec,
} from './types.js';
import { TRIGGER_CONDITION_KINDS } from './types.js';

/**
 * THE ONE VALIDATOR (the routines law): every path a trigger def can
 * travel goes through here — authored JSON at registry init, DB rows
 * at boot, and Studio submissions. Errors are collected, not thrown,
 * so tooling can show a full report. Reference existence (zones,
 * items, factions, planes) is checked ONLY when refs are passed: the
 * Studio door is strict, boot is tolerant (a dangling zone must never
 * silence a shipped roster at startup — the compile step logs and
 * stands the trigger down instead).
 */

export interface ValidateTriggerRefs {
  zoneIds?: ReadonlySet<string>;
  itemIds?: ReadonlySet<string>;
  factionIds?: ReadonlySet<string>;
  planeIds?: ReadonlySet<string>;
}

export type ValidateTriggerResult =
  | { ok: true; def: TriggerDef }
  | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
/** Plain flag, or another trigger's once-latch ('trig:<slug>'). */
const FLAG_RE = /^(trig:)?[a-z][a-z0-9_]*$/;
/** A discovery-ledger id: 'zone:<slug>', 'poi:<cx>,<cy>', 'dungeon:<x>,<y>'. */
const PLACE_RE = /^(zone:[a-z][a-z0-9_]*|(poi|dungeon):-?\d+,-?\d+)$/;
const COORD_LIMIT = 100_000;
const POLYGON_MIN = 3;
const POLYGON_MAX = 64;
const CONDITIONS_MAX = 8;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finiteIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function refuseUnknownKeys(
  raw: Record<string, unknown>,
  allowed: readonly string[],
  where: string,
  errors: string[],
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) errors.push(`${where} has unknown key '${key}'`);
  }
}

function validateArea(
  raw: unknown,
  refs: ValidateTriggerRefs | undefined,
  errors: string[],
): TriggerArea | undefined {
  if (!isRecord(raw)) {
    errors.push('area must be an object');
    return undefined;
  }
  if (raw.kind === 'zone') {
    refuseUnknownKeys(raw, ['kind', 'zone'], 'area', errors);
    if (typeof raw.zone !== 'string' || !SLUG_RE.test(raw.zone)) {
      errors.push(`area.zone must be a zone slug`);
      return undefined;
    }
    if (refs?.zoneIds && !refs.zoneIds.has(raw.zone)) {
      errors.push(`area.zone '${raw.zone}' is not a known zone`);
      return undefined;
    }
    return { kind: 'zone', zone: raw.zone };
  }
  const plane = raw.plane;
  if (plane !== undefined) {
    if (typeof plane !== 'string' || !SLUG_RE.test(plane)) {
      errors.push(`area.plane must be a plane slug`);
      return undefined;
    }
    if (refs?.planeIds && !refs.planeIds.has(plane)) {
      errors.push(`area.plane '${plane}' is not a known plane`);
      return undefined;
    }
  }
  if (raw.kind === 'rect') {
    refuseUnknownKeys(raw, ['kind', 'plane', 'x', 'y', 'w', 'h'], 'area', errors);
    if (
      !finiteIn(raw.x, -COORD_LIMIT, COORD_LIMIT) ||
      !finiteIn(raw.y, -COORD_LIMIT, COORD_LIMIT)
    ) {
      errors.push(`area.x/y must be finite world coordinates (|v| <= ${COORD_LIMIT})`);
      return undefined;
    }
    if (!finiteIn(raw.w, 1, 4096) || !finiteIn(raw.h, 1, 4096)) {
      errors.push('area.w/h must be numbers 1..4096');
      return undefined;
    }
    const out: TriggerArea = { kind: 'rect', x: raw.x, y: raw.y, w: raw.w, h: raw.h };
    if (plane !== undefined) out.plane = plane as string;
    return out;
  }
  if (raw.kind === 'polygon') {
    refuseUnknownKeys(raw, ['kind', 'plane', 'points'], 'area', errors);
    if (
      !Array.isArray(raw.points) ||
      raw.points.length < POLYGON_MIN ||
      raw.points.length > POLYGON_MAX
    ) {
      errors.push(`area.points must be an array of ${POLYGON_MIN}..${POLYGON_MAX} vertices`);
      return undefined;
    }
    const points: TriggerVec[] = [];
    for (const [i, p] of raw.points.entries()) {
      if (
        !isRecord(p) ||
        !finiteIn(p.x, -COORD_LIMIT, COORD_LIMIT) ||
        !finiteIn(p.y, -COORD_LIMIT, COORD_LIMIT)
      ) {
        errors.push(`area.points[${i}] must be {x, y} finite world coordinates`);
        return undefined;
      }
      points.push({ x: p.x, y: p.y });
    }
    const out: TriggerArea = { kind: 'polygon', points };
    if (plane !== undefined) out.plane = plane as string;
    return out;
  }
  errors.push(`area.kind must be 'zone', 'rect', or 'polygon'`);
  return undefined;
}

function validateCondition(
  raw: unknown,
  where: string,
  refs: ValidateTriggerRefs | undefined,
  errors: string[],
): TriggerCondition | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const when = raw.when;
  if (typeof when !== 'string' || !(TRIGGER_CONDITION_KINDS as readonly string[]).includes(when)) {
    errors.push(
      `${where}.when '${String(when)}' is unknown (conditions are code; the roster: ` +
        `${TRIGGER_CONDITION_KINDS.join(', ')})`,
    );
    return undefined;
  }
  switch (when as TriggerCondition['when']) {
    case 'timeBetween': {
      refuseUnknownKeys(raw, ['when', 'from', 'to'], where, errors);
      if (!finiteIn(raw.from, 0, 24) || raw.from === 24 || !finiteIn(raw.to, 0, 24) || raw.to === 24) {
        errors.push(`${where}.from/to must be game-clock hours in [0, 24)`);
        return undefined;
      }
      if (raw.from === raw.to) {
        errors.push(`${where} covers no hours (from == to)`);
        return undefined;
      }
      return { when: 'timeBetween', from: raw.from, to: raw.to };
    }
    case 'hpBelow':
    case 'hpAbove': {
      refuseUnknownKeys(raw, ['when', 'frac'], where, errors);
      if (!finiteIn(raw.frac, 0.01, 1)) {
        errors.push(`${where}.frac must be a number 0.01..1`);
        return undefined;
      }
      return { when: when as 'hpBelow' | 'hpAbove', frac: raw.frac };
    }
    case 'hasItem': {
      refuseUnknownKeys(raw, ['when', 'item', 'qty'], where, errors);
      if (typeof raw.item !== 'string' || !SLUG_RE.test(raw.item)) {
        errors.push(`${where}.item must be an item slug`);
        return undefined;
      }
      if (refs?.itemIds && !refs.itemIds.has(raw.item)) {
        errors.push(`${where}.item '${raw.item}' is not a known item`);
        return undefined;
      }
      const out: TriggerCondition = { when: 'hasItem', item: raw.item };
      if (raw.qty !== undefined) {
        if (!finiteIn(raw.qty, 1, 9999) || !Number.isInteger(raw.qty)) {
          errors.push(`${where}.qty must be an integer 1..9999`);
          return undefined;
        }
        out.qty = raw.qty;
      }
      return out;
    }
    case 'skillAtLeast': {
      refuseUnknownKeys(raw, ['when', 'skill', 'level'], where, errors);
      if (typeof raw.skill !== 'string' || !isSkillId(raw.skill)) {
        errors.push(`${where}.skill '${String(raw.skill)}' is not a skill id`);
        return undefined;
      }
      if (!finiteIn(raw.level, 1, 99) || !Number.isInteger(raw.level)) {
        errors.push(`${where}.level must be an integer 1..99`);
        return undefined;
      }
      return { when: 'skillAtLeast', skill: raw.skill, level: raw.level };
    }
    case 'standingAtLeast':
    case 'standingAtMost': {
      refuseUnknownKeys(raw, ['when', 'faction', 'band'], where, errors);
      if (typeof raw.faction !== 'string' || !SLUG_RE.test(raw.faction)) {
        errors.push(`${where}.faction must be a faction slug`);
        return undefined;
      }
      if (refs?.factionIds && !refs.factionIds.has(raw.faction)) {
        errors.push(`${where}.faction '${raw.faction}' is not in the roster`);
        return undefined;
      }
      if (
        typeof raw.band !== 'string' ||
        !(FACTION_BAND_ORDER as readonly string[]).includes(raw.band)
      ) {
        errors.push(`${where}.band must be one of ${FACTION_BAND_ORDER.join(', ')}`);
        return undefined;
      }
      return {
        when: when as 'standingAtLeast' | 'standingAtMost',
        faction: raw.faction,
        band: raw.band as FactionBand,
      };
    }
    case 'flag':
    case 'notFlag': {
      refuseUnknownKeys(raw, ['when', 'flag'], where, errors);
      if (typeof raw.flag !== 'string' || !FLAG_RE.test(raw.flag)) {
        errors.push(
          `${where}.flag must be a plain character flag (world:/quest:/faction: are answered, never stored)`,
        );
        return undefined;
      }
      return { when: when as 'flag' | 'notFlag', flag: raw.flag };
    }
    case 'discovered':
    case 'undiscovered': {
      refuseUnknownKeys(raw, ['when', 'place'], where, errors);
      if (typeof raw.place !== 'string' || !PLACE_RE.test(raw.place)) {
        errors.push(`${where}.place must be a discovery id (zone:<slug>, poi:<cx>,<cy>, dungeon:<x>,<y>)`);
        return undefined;
      }
      return { when: when as 'discovered' | 'undiscovered', place: raw.place };
    }
    case 'sneaking':
    case 'night':
    case 'day':
    case 'dark':
    case 'lit': {
      refuseUnknownKeys(raw, ['when'], where, errors);
      return { when: when as 'sneaking' | 'night' | 'day' | 'dark' | 'lit' };
    }
  }
}

/** Validate one untrusted trigger def (parsed JSON, DB row, tool input). */
export function validateTrigger(
  raw: unknown,
  refs?: ValidateTriggerRefs,
): ValidateTriggerResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['trigger def must be an object'] };

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
  }

  refuseUnknownKeys(
    raw,
    [
      'id',
      'label',
      'area',
      'on',
      'event',
      'data',
      'conditions',
      'cooldownSec',
      'cooldownGroup',
      'minInsideSec',
      'once',
      'setFlag',
      'disabled',
    ],
    'def',
    errors,
  );

  let label: string | undefined;
  if (raw.label !== undefined) {
    if (typeof raw.label !== 'string' || raw.label.length > 80) {
      errors.push('label must be a string of at most 80 chars');
    } else if (raw.label.length > 0) {
      label = raw.label;
    }
  }

  const area = validateArea(raw.area, refs, errors);

  if (raw.on !== 'enter' && raw.on !== 'exit' && raw.on !== 'both') {
    errors.push(`on must be 'enter', 'exit', or 'both'`);
  }

  const event = typeof raw.event === 'string' ? raw.event : '';
  if (!SLUG_RE.test(event) || event.length > 32) {
    errors.push(`event '${String(raw.event)}' must be a slug (max 32 chars)`);
  }

  let data: Record<string, string> | undefined;
  if (raw.data !== undefined) {
    if (!isRecord(raw.data)) {
      errors.push('data must be an object of string values');
    } else {
      data = {};
      for (const [k, v] of Object.entries(raw.data)) {
        if (!SLUG_RE.test(k) || typeof v !== 'string' || v.length > 120) {
          errors.push(`data.${k} must map a slug key to a string of at most 120 chars`);
          continue;
        }
        data[k] = v;
      }
      if (Object.keys(data).length === 0) data = undefined;
    }
  }

  let conditions: TriggerCondition[] | undefined;
  if (raw.conditions !== undefined) {
    if (!Array.isArray(raw.conditions) || raw.conditions.length > CONDITIONS_MAX) {
      errors.push(`conditions must be an array of at most ${CONDITIONS_MAX}`);
    } else {
      conditions = [];
      for (const [i, c] of raw.conditions.entries()) {
        const v = validateCondition(c, `conditions[${i}]`, refs, errors);
        if (v) conditions.push(v);
      }
      if (conditions.length === 0) conditions = undefined;
    }
  }

  let cooldownSec: number | undefined;
  if (raw.cooldownSec !== undefined) {
    if (!finiteIn(raw.cooldownSec, 0, 86_400)) {
      errors.push('cooldownSec must be a number 0..86400');
    } else if (raw.cooldownSec > 0) {
      cooldownSec = raw.cooldownSec;
    }
  }

  let cooldownGroup: string | undefined;
  if (raw.cooldownGroup !== undefined) {
    if (typeof raw.cooldownGroup !== 'string' || !SLUG_RE.test(raw.cooldownGroup)) {
      errors.push('cooldownGroup must be a slug');
    } else {
      cooldownGroup = raw.cooldownGroup;
    }
  }

  let minInsideSec: number | undefined;
  if (raw.minInsideSec !== undefined) {
    if (!finiteIn(raw.minInsideSec, 0, 3600)) {
      errors.push('minInsideSec must be a number 0..3600');
    } else if (raw.minInsideSec > 0) {
      minInsideSec = raw.minInsideSec;
    }
  }

  let setFlag: string | undefined;
  if (raw.setFlag !== undefined) {
    if (typeof raw.setFlag !== 'string' || !SLUG_RE.test(raw.setFlag)) {
      errors.push('setFlag must be a plain flag slug (no namespace)');
    } else {
      setFlag = raw.setFlag;
    }
  }

  const once = raw.once === true ? true : undefined;
  if (raw.once !== undefined && typeof raw.once !== 'boolean') {
    errors.push('once must be a boolean');
  }
  const disabled = raw.disabled === true ? true : undefined;
  if (raw.disabled !== undefined && typeof raw.disabled !== 'boolean') {
    errors.push('disabled must be a boolean');
  }

  if (errors.length > 0 || !area) {
    return { ok: false, errors: errors.map((e) => `${id || '<trigger>'}: ${e}`) };
  }
  const def: TriggerDef = { id, area, on: raw.on as TriggerDef['on'], event };
  if (label) def.label = label;
  if (data) def.data = data;
  if (conditions) def.conditions = conditions;
  if (cooldownSec !== undefined) def.cooldownSec = cooldownSec;
  if (cooldownGroup) def.cooldownGroup = cooldownGroup;
  if (minInsideSec !== undefined) def.minInsideSec = minInsideSec;
  if (once) def.once = once;
  if (setFlag) def.setFlag = setFlag;
  if (disabled) def.disabled = disabled;
  return { ok: true, def };
}

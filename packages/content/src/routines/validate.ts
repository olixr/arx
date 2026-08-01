import { mountDef } from '../mounts.js';
import type {
  RoutineDef,
  RoutineSlot,
  RoutineTask,
  RoutineWaypoint,
} from './types.js';

/**
 * THE ONE VALIDATOR — every path a routine def can travel goes through
 * here: authored JSON at registry init, DB rows reassembled at server
 * boot, and dev-tool submissions. Errors are collected, not thrown, so
 * tooling can show a full report.
 */

export type ValidateRoutineResult =
  | { ok: true; routine: RoutineDef }
  | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
/** Offsets stay within one zone's reach of the post. */
const MAX_OFFSET = 128;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finiteIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function validateOffset(
  raw: Record<string, unknown>,
  where: string,
  required: boolean,
  errors: string[],
): { x?: number; y?: number } {
  const out: { x?: number; y?: number } = {};
  for (const axis of ['x', 'y'] as const) {
    const v = raw[axis];
    if (v === undefined) {
      if (required) errors.push(`${where}.${axis} is required`);
      continue;
    }
    if (!finiteIn(v, -MAX_OFFSET, MAX_OFFSET)) {
      errors.push(`${where}.${axis} must be a finite number within ±${MAX_OFFSET}`);
      continue;
    }
    out[axis] = v;
  }
  return out;
}

function validateDir(raw: unknown, where: string, errors: string[]): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || Math.abs(raw) > Math.PI * 2) {
    errors.push(`${where}.dir must be a finite angle in radians (|dir| ≤ 2π)`);
    return undefined;
  }
  return raw;
}

function validateFlag(
  raw: unknown,
  where: string,
  key: 'work' | 'sit' | 'lie',
  errors: string[],
): boolean | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'boolean') {
    errors.push(`${where}.${key} must be a boolean`);
    return undefined;
  }
  return raw ? true : undefined;
}

/** A stop is ONE posture: working, sitting, and lying are exclusive. */
function rejectWorkSit(
  work: boolean | undefined,
  sit: boolean | undefined,
  lie: boolean | undefined,
  where: string,
  errors: string[],
): void {
  if (work && sit) errors.push(`${where} cannot both work and sit`);
  if (work && lie) errors.push(`${where} cannot both work and lie`);
  if (sit && lie) errors.push(`${where} cannot both sit and lie`);
}

/** Strides live between a hobble and a sprint (player speed is 5). */
function validateSpeed(raw: unknown, where: string, errors: string[]): number | undefined {
  if (raw === undefined) return undefined;
  if (!finiteIn(raw, 0.3, 6)) {
    errors.push(`${where}.speed must be a number 0.3..6 (tiles/sec)`);
    return undefined;
  }
  return raw;
}

/** The task's saddle: a mount id must name a registered beast. */
function validateMount(raw: unknown, where: string, errors: string[]): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !mountDef(raw)) {
    errors.push(`${where}.mount '${String(raw)}' is not a registered mount id`);
    return undefined;
  }
  return raw;
}

function validateWaypoint(
  raw: unknown,
  where: string,
  errors: string[],
): RoutineWaypoint | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const off = validateOffset(raw, where, true, errors);
  if (off.x === undefined || off.y === undefined) return undefined;
  const wp: RoutineWaypoint = { x: off.x, y: off.y };
  if (raw.waitSec !== undefined) {
    if (!finiteIn(raw.waitSec, 0, 900)) {
      errors.push(`${where}.waitSec must be a number 0..900`);
    } else if (raw.waitSec > 0) {
      wp.waitSec = raw.waitSec;
    }
  }
  wp.dir = validateDir(raw.dir, where, errors);
  wp.work = validateFlag(raw.work, where, 'work', errors);
  wp.sit = validateFlag(raw.sit, where, 'sit', errors);
  wp.lie = validateFlag(raw.lie, where, 'lie', errors);
  rejectWorkSit(wp.work, wp.sit, wp.lie, where, errors);
  wp.speed = validateSpeed(raw.speed, where, errors);
  if (raw.ride !== undefined) {
    if (typeof raw.ride !== 'boolean') {
      errors.push(`${where}.ride must be a boolean`);
    } else if (!raw.ride) {
      wp.ride = false; // only the on-foot override is worth storing
    }
  }
  return wp;
}

function validateTask(raw: unknown, where: string, errors: string[]): RoutineTask | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  if (raw.kind === 'post') {
    const off = validateOffset(raw, where, false, errors);
    const task: RoutineTask = { kind: 'post' };
    if (off.x !== undefined) task.x = off.x;
    if (off.y !== undefined) task.y = off.y;
    task.dir = validateDir(raw.dir, where, errors);
    task.work = validateFlag(raw.work, where, 'work', errors);
    task.sit = validateFlag(raw.sit, where, 'sit', errors);
    task.lie = validateFlag(raw.lie, where, 'lie', errors);
    rejectWorkSit(task.work, task.sit, task.lie, where, errors);
    task.speed = validateSpeed(raw.speed, where, errors);
    task.mount = validateMount(raw.mount, where, errors);
    return task;
  }
  if (raw.kind === 'path') {
    let mode: 'loop' | 'bounce' | 'once' | undefined;
    if (raw.mode !== undefined) {
      if (raw.mode !== 'loop' && raw.mode !== 'bounce' && raw.mode !== 'once') {
        errors.push(`${where}.mode must be 'loop', 'bounce', or 'once'`);
      } else if (raw.mode !== 'loop') {
        mode = raw.mode;
      }
    }
    if (!Array.isArray(raw.waypoints) || raw.waypoints.length < 1 || raw.waypoints.length > 32) {
      errors.push(`${where}.waypoints must be an array of 1..32 waypoints`);
      return undefined;
    }
    const waypoints: RoutineWaypoint[] = [];
    for (const [i, wp] of raw.waypoints.entries()) {
      const v = validateWaypoint(wp, `${where}.waypoints[${i}]`, errors);
      if (v) waypoints.push(v);
    }
    const mount = validateMount(raw.mount, where, errors);
    if (!mount) {
      for (const [i, wp] of waypoints.entries()) {
        if (wp.ride === false) {
          errors.push(`${where}.waypoints[${i}].ride is meaningless without a task mount`);
        }
      }
    }
    return {
      kind: 'path',
      mode,
      waypoints,
      speed: validateSpeed(raw.speed, where, errors),
      mount,
    };
  }
  if (raw.kind === 'wander') {
    const off = validateOffset(raw, where, false, errors);
    if (!finiteIn(raw.radius, 0.5, 32)) {
      errors.push(`${where}.radius must be a number 0.5..32`);
      return undefined;
    }
    const task: RoutineTask = { kind: 'wander', radius: raw.radius };
    if (off.x !== undefined) task.x = off.x;
    if (off.y !== undefined) task.y = off.y;
    task.speed = validateSpeed(raw.speed, where, errors);
    task.mount = validateMount(raw.mount, where, errors);
    return task;
  }
  errors.push(`${where}.kind must be 'post', 'path', or 'wander'`);
  return undefined;
}

/** Validate one untrusted routine def (parsed JSON, DB row, tool input). */
export function validateRoutine(raw: unknown): ValidateRoutineResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['routine def must be an object'] };

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
  }

  const base = validateTask(raw.base, 'base', errors);

  let slots: RoutineSlot[] | undefined;
  if (raw.slots !== undefined) {
    if (!Array.isArray(raw.slots) || raw.slots.length > 16) {
      errors.push('slots must be an array of at most 16 windows');
    } else {
      slots = [];
      for (const [i, s] of raw.slots.entries()) {
        const where = `slots[${i}]`;
        if (!isRecord(s)) {
          errors.push(`${where} must be an object`);
          continue;
        }
        if (!finiteIn(s.from, 0, 24) || s.from === 24) {
          errors.push(`${where}.from must be a game-clock hour in [0, 24)`);
          continue;
        }
        if (!finiteIn(s.to, 0, 24) || s.to === 24) {
          errors.push(`${where}.to must be a game-clock hour in [0, 24)`);
          continue;
        }
        if (s.from === s.to) {
          errors.push(`${where} covers no hours (from == to; an all-day task belongs in base)`);
          continue;
        }
        const task = validateTask(s.task, `${where}.task`, errors);
        if (task) slots.push({ from: s.from, to: s.to, task });
      }
      if (slots.length === 0) slots = undefined;
    }
  }

  if (errors.length > 0 || !base) {
    if (!base && errors.length === 0) errors.push('base task is required');
    return { ok: false, errors: errors.map((e) => `${id || '<routine>'}: ${e}`) };
  }
  return { ok: true, routine: { id, base, slots } };
}

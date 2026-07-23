import type { RoutineDef, RoutineTask } from './types.js';

/**
 * Schedule resolution — pure functions of the game-clock hour, shared
 * by the server's routine ticker and the content tests so both read
 * the same day.
 */

/** Does a [from, to) window contain the hour? from > to wraps midnight. */
export function slotContains(from: number, to: number, hours: number): boolean {
  return from < to ? hours >= from && hours < to : hours >= from || hours < to;
}

/**
 * The slot index owning this hour, or -1 for the base task. Authored
 * order is priority order: the first matching window wins, so a
 * specific lunch break may sit on top of a broad workday.
 */
export function pickRoutineSlot(def: RoutineDef, hours: number): number {
  const slots = def.slots ?? [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    if (slotContains(s.from, s.to, hours)) return i;
  }
  return -1;
}

/** The task a routine assigns at this hour (base when no slot claims it). */
export function routineTaskAt(def: RoutineDef, hours: number): RoutineTask {
  const slot = pickRoutineSlot(def, hours);
  return slot === -1 ? def.base : def.slots![slot]!.task;
}

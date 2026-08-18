import {
  bandAtLeast,
  slotContains,
  standingBand,
  type TriggerCondition,
  type TriggerDef,
  type TriggerEdge,
} from '@arx/content';
import { pointInPolygon, TICK_RATE, type Bounds, polyBounds } from '@arx/shared';

/**
 * THE WATCHFUL GROUND's engine half (docs/triggers-plan.md), pure by
 * the exploration.ts law: compile, containment, edge bookkeeping,
 * gates. GameServer owns the sweep cadence, the fact reads, and the
 * event door; everything here runs against plain data so the laws are
 * testable without the 32k-line host.
 */

const SURFACE = 'surface';

export interface ZoneRectLive {
  plane: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** LIVE zone lookup — zones are runtime-mutable, so this answers at test time. */
export type ZoneRectResolver = (zoneId: string) => ZoneRectLive | null;

export interface CompiledTrigger {
  def: TriggerDef;
  /** Static plane for rect/polygon areas; null = the zone's own, read live. */
  plane: string | null;
  /** Static bbox for rect/polygon areas; the zone kind IS its box. */
  bounds: Bounds | null;
  contains(plane: string, x: number, y: number, zones: ZoneRectResolver): boolean;
}

export function compileTriggers(defs: Iterable<TriggerDef>): CompiledTrigger[] {
  const out: CompiledTrigger[] = [];
  for (const def of defs) {
    const area = def.area;
    if (area.kind === 'zone') {
      out.push({
        def,
        plane: null,
        bounds: null,
        contains(plane, x, y, zones) {
          const z = zones(area.zone);
          if (!z || z.plane !== plane) return false;
          return x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;
        },
      });
    } else if (area.kind === 'rect') {
      const aPlane = area.plane ?? SURFACE;
      out.push({
        def,
        plane: aPlane,
        bounds: { minX: area.x, minY: area.y, maxX: area.x + area.w, maxY: area.y + area.h },
        contains(plane, x, y) {
          return (
            plane === aPlane &&
            x >= area.x &&
            x < area.x + area.w &&
            y >= area.y &&
            y < area.y + area.h
          );
        },
      });
    } else {
      const aPlane = area.plane ?? SURFACE;
      const box = polyBounds(area.points);
      out.push({
        def,
        plane: aPlane,
        bounds: box,
        contains(plane, x, y) {
          if (plane !== aPlane) return false;
          if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) return false;
          return pointInPolygon(area.points, x, y);
        },
      });
    }
  }
  return out;
}

export interface TriggerCrossing {
  def: TriggerDef;
  edge: TriggerEdge;
  /** The tick the body stepped inside (exit crossings read dwell off it). */
  sinceTick: number;
}

/**
 * One look at one body: update the inside ledger and report lawful
 * crossings. THE FIRST SWEEP IS A CENSUS, NOT AN EDGE — with `census`
 * true the ledger is primed from present containment and nothing
 * fires, so a relog inside the walls never fakes a crossing. A
 * disabled trigger keeps its ledger honest (the Studio flipping it
 * back on mid-visit must not read as an entry) but reports nothing.
 */
export function sweepCrossings(
  compiled: readonly CompiledTrigger[],
  inside: Map<string, number>,
  plane: string,
  x: number,
  y: number,
  tick: number,
  zones: ZoneRectResolver,
  census: boolean,
): TriggerCrossing[] {
  const out: TriggerCrossing[] = [];
  for (const c of compiled) {
    const here = c.contains(plane, x, y, zones);
    const since = inside.get(c.def.id);
    if (here && since === undefined) {
      inside.set(c.def.id, tick);
      if (!census && !c.def.disabled && c.def.on !== 'exit') {
        out.push({ def: c.def, edge: 'enter', sinceTick: tick });
      }
    } else if (!here && since !== undefined) {
      inside.delete(c.def.id);
      if (!census && !c.def.disabled && c.def.on !== 'enter') {
        out.push({ def: c.def, edge: 'exit', sinceTick: since });
      }
    }
  }
  return out;
}

/** Enter and exit share the group by default — THE BOUNCE RULE's first half. */
export function cooldownKey(def: TriggerDef): string {
  return def.cooldownGroup ?? def.id;
}

/** The facts a gate reads, injected by the host (the QuestPlayerCtx law). */
export interface TriggerFacts {
  hours: number;
  night: boolean;
  hpFrac: number;
  sneaking: boolean;
  /** THE DARKNESS LEDGER, lazily — costs a 15×15 tile scan only when
   *  a trigger actually asks (the levelOf pattern). */
  dark(): boolean;
  levelOf(skill: string): number;
  standingWith(faction: string): number;
  hasFlag(flag: string): boolean;
  discovered(place: string): boolean;
  countItem(item: string): number;
}

export function conditionHolds(cond: TriggerCondition, facts: TriggerFacts): boolean {
  switch (cond.when) {
    case 'timeBetween':
      return slotContains(cond.from, cond.to, facts.hours);
    case 'hpBelow':
      return facts.hpFrac <= cond.frac;
    case 'hpAbove':
      return facts.hpFrac >= cond.frac;
    case 'hasItem':
      return facts.countItem(cond.item) >= (cond.qty ?? 1);
    case 'skillAtLeast':
      return facts.levelOf(cond.skill) >= cond.level;
    case 'standingAtLeast':
      return bandAtLeast(standingBand(facts.standingWith(cond.faction)), cond.band);
    case 'standingAtMost':
      return bandAtLeast(cond.band, standingBand(facts.standingWith(cond.faction)));
    case 'flag':
      return facts.hasFlag(cond.flag);
    case 'notFlag':
      return !facts.hasFlag(cond.flag);
    case 'discovered':
      return facts.discovered(cond.place);
    case 'undiscovered':
      return !facts.discovered(cond.place);
    case 'sneaking':
      return facts.sneaking;
    case 'night':
      return facts.night;
    case 'day':
      return !facts.night;
    case 'dark':
      return facts.dark();
    case 'lit':
      return !facts.dark();
  }
}

export type GateVerdict = 'fire' | 'once' | 'dwell' | 'cooldown' | 'conditions';

/**
 * The full gate ladder for one crossing, cheapest refusal first:
 * the once-latch, the exit dwell (THE BOUNCE RULE's second half),
 * the shared cooldown, then the condition slate. 'fire' means the
 * caller must stamp (stampFire) and dispatch.
 */
export function gateCrossing(
  crossing: TriggerCrossing,
  tick: number,
  cooldowns: ReadonlyMap<string, number>,
  facts: TriggerFacts,
  hasOnceFired: boolean,
): GateVerdict {
  const def = crossing.def;
  if (def.once && hasOnceFired) return 'once';
  if (
    crossing.edge === 'exit' &&
    def.minInsideSec !== undefined &&
    tick - crossing.sinceTick < def.minInsideSec * TICK_RATE
  ) {
    return 'dwell';
  }
  if (def.cooldownSec !== undefined && (cooldowns.get(cooldownKey(def)) ?? 0) > tick) {
    return 'cooldown';
  }
  for (const cond of def.conditions ?? []) {
    if (!conditionHolds(cond, facts)) return 'conditions';
  }
  return 'fire';
}

/** Stamp the shared refractory for a lawful fire. */
export function stampFire(cooldowns: Map<string, number>, def: TriggerDef, tick: number): void {
  if (def.cooldownSec !== undefined) {
    cooldowns.set(cooldownKey(def), tick + Math.round(def.cooldownSec * TICK_RATE));
  }
}

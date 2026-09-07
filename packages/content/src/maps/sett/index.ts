/**
 * THE SETT (contested lands, band 9d) — THE COMPOSITION (L1 FRAME):
 * one module, many frames; the SETT frame now.
 *
 * The Dolmen's quarry bowl at cell [1,2] (docs/contested-lands-plan.md
 * §11.3, §11.6; band9d/blockout.md §1-§4; rulings R-A..R-H): the first
 * sunk authored zone. THE SHAPE IS READ, NOT DRAWN: worldgen's own
 * levels are stamped per cell (the −1 ring, the −2 core) with the rim
 * painted Cliff verbatim and three listed edits (E1 the lip, E2 and
 * E3 the tongues the floor pass left standing as cut faces); the north
 * flight comes down from the lip, the core steps from the ring to the
 * floor; the Marl's rim-set, the Plug, the Sinter's authored wet floor
 * with the ninth course standing in it, the Gossan's weight-yard with
 * the stile as its one door, the Culm's hearth-cells with the set's
 * only two lights, and the south ring and gully empty on purpose.
 * Eleven bodies on actor rows and Vorl's one spawn row through the
 * builder's passthrough (E1). A patch on worldgen (TILE_SKIP
 * everywhere the bowl is not): no core, no spawn (R-D: a Sett spawn
 * would be a respawn hearth; `reachFrom` proves the floors instead),
 * no chest, no board (the Dolmen keep a count and say it), no haven.
 *
 * THE ORDER, which is the whole law of this file:
 *   makeCtx(SETT) → mask (the bowl read and stamped; the rim as Cliff;
 *   E1-E3) → the six treads → ground (the aprons, the two worn lines
 *   and the laid course, the wet floor, the ash, the yard's ground,
 *   the walk, the posts' patches) → head
 *   → rimset → plug → wetfloor → yard → shelf → south → people → the
 *   deferred details → NO sign flush (none) → growth 'wild' →
 *   reachFrom → build.
 *   9e: for each course frame: makeCtx(frame) → course(pts) → growth
 *   'wild' → build; meadow: makeCtx → sheet → lastcourses → people →
 *   build.
 *
 * LAWS THIS FRAME KEEPS:
 * - The base is TILE_SKIP; the border ring publishes nothing but the
 *   one seam cell (150,267), THE SEAM EXEMPTION, so 9e's COURSE_A picks
 *   the run up with no hole.
 * - Every level<0 cell is painted; every rim is Cliff or a tread; a
 *   floor tile is never a rim; WaterShallow only on the −2 floor.
 * - No prop on a rim; nothing solid on the stair crowns, the mouths,
 *   the Plug's walk, the desire lines, the cart's second foot or the
 *   water (KEEP_OUT).
 * - No timber but the taken; no light but the two hearths; one loop.
 * - Byte-identical across builds (settRng and the mask's read are
 *   pure).
 */
import { TILE_SKIP, type Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import type { ZoneDef } from '../types.js';
import { courseA, courseB, courseC } from './course.js';
import { makeCtx, type SettRegistry } from './ctx.js';
import { ground } from './ground.js';
import { head } from './head.js';
import { mask } from './mask.js';
import { meadow } from './meadow.js';
import { meadowPeople, people } from './people.js';
import { PINS, type Frame } from './pins.js';
import { plug } from './plug.js';
import { rimset } from './rimset.js';
import { shelf } from './shelf.js';
import { south } from './south.js';
import { wetfloor } from './wetfloor.js';
import { yard } from './yard.js';

function open(frame: Frame): { b: ZoneBuilder; ctx: ReturnType<typeof makeCtx>['ctx']; registry: SettRegistry } {
  // G0 THE BASE: transparent, so the field shows through until the
  // mask or a scene authors a cell.
  const b = new ZoneBuilder(frame.id, frame.name, { x: frame.ORIGIN.x, y: frame.ORIGIN.y }, frame.WIDTH, frame.HEIGHT, TILE_SKIP as unknown as Tile);
  const { ctx, registry } = makeCtx(b, frame);
  return { b, ctx, registry };
}

function close(b: ZoneBuilder, frame: Frame, registry: SettRegistry, reachFrom?: readonly [number, number]): ZoneDef {
  // The deferred details land over the props. No sign flush: the Sett
  // has no board.
  for (const d of registry.details) b.setDetail(d.x - frame.ORIGIN.x, d.y - frame.ORIGIN.y, d.d);
  // G-3: authored wilderness, untended.
  b.growth('wild');
  // THE REACH ANCHOR (R-D, E2): the flood starts on the lip; never a spawn.
  if (reachFrom !== undefined) b.reachFrom(reachFrom[0] - frame.ORIGIN.x, reachFrom[1] - frame.ORIGIN.y);
  return b.build();
}

/** THE SETT with its registry, for the lints and the block-out shots. */
export function buildSettWithRegistry(): { zone: ZoneDef; registry: SettRegistry } {
  const frame = PINS.SETT;
  const { b, ctx, registry } = open(frame);
  // THE SHAPE IS READ: the bowl, the rim, E1.
  mask(ctx, registry);
  // THE TWO FLIGHTS: six treads, the fence's only gaps (the builder
  // validates the straight-edge law on every one).
  for (const [x, y] of PINS.STAIRS) b.stairs(x - frame.ORIGIN.x, y - frame.ORIGIN.y);
  ground(ctx);
  head(ctx);
  rimset(ctx);
  plug(ctx);
  wetfloor(ctx);
  yard(ctx);
  shelf(ctx);
  south(ctx);
  people(ctx);
  return { zone: close(b, frame, registry, PINS.REACH_FROM), registry };
}

/** The zone alone: the shape every registry and test consumes. */
export function buildSett(): ZoneDef {
  return buildSettWithRegistry().zone;
}

// ---------------------------------------------------------------------
// THE COURSE (band 9e): four more frames of the same module, the same
// brush, the same counter (pins.COURSE_START per frame, derived from
// the run before it, never remembered). Each is level 0 (no mask, no
// treads, no reach anchor: the builder floods nothing flat), TILE_SKIP
// everywhere the line is not, growth 'wild', no spawn, no chest, no
// board. The order per course frame: makeCtx(frame) → course(pts) →
// build; the meadow: makeCtx → the sheets and the strip → the last
// courses, the END stone, the cairn → people → build.
// ---------------------------------------------------------------------

/** COURSE_A with its registry: THE BELT RUN from the Sett's seam to the bank. */
export function buildCourseAWithRegistry(): { zone: ZoneDef; registry: SettRegistry } {
  const frame = PINS.COURSE_A;
  const { b, ctx, registry } = open(frame);
  courseA(ctx);
  return { zone: close(b, frame, registry), registry };
}
/** COURSE_B with its registry: THE BANK RUN and THE FORD. */
export function buildCourseBWithRegistry(): { zone: ZoneDef; registry: SettRegistry } {
  const frame = PINS.COURSE_B;
  const { b, ctx, registry } = open(frame);
  courseB(ctx);
  return { zone: close(b, frame, registry), registry };
}
/** COURSE_C with its registry: THE STRIP RUN west to the meadow's corner. */
export function buildCourseCWithRegistry(): { zone: ZoneDef; registry: SettRegistry } {
  const frame = PINS.COURSE_C;
  const { b, ctx, registry } = open(frame);
  courseC(ctx);
  return { zone: close(b, frame, registry), registry };
}
/** THE DROWNED MEADOW with its registry: the last courses, the END stone, the cairn, Sarsen and the sheep. */
export function buildMeadowWithRegistry(): { zone: ZoneDef; registry: SettRegistry } {
  const frame = PINS.MEADOW;
  const { b, ctx, registry } = open(frame);
  meadow(ctx);
  meadowPeople(ctx);
  return { zone: close(b, frame, registry), registry };
}

export function buildCourseA(): ZoneDef {
  return buildCourseAWithRegistry().zone;
}
export function buildCourseB(): ZoneDef {
  return buildCourseBWithRegistry().zone;
}
export function buildCourseC(): ZoneDef {
  return buildCourseCWithRegistry().zone;
}
export function buildMeadow(): ZoneDef {
  return buildMeadowWithRegistry().zone;
}

/** The five frames with their registries, in the counter's order (the lints that walk the whole line read this). */
export function buildCourseWithRegistries(): Array<{ zone: ZoneDef; registry: SettRegistry }> {
  return [buildSettWithRegistry(), buildCourseAWithRegistry(), buildCourseBWithRegistry(), buildCourseCWithRegistry(), buildMeadowWithRegistry()];
}

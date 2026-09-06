/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — THE
 * COMPOSITION (L1 FRAME): one module, three zones.
 *
 * The north of the hunters' trail, 61 to 125 tiles from Dawnmead's
 * hem (docs/contested-lands-plan.md §3.2, §3.3; band8/blockout.md
 * §2, §3.2; rulings G1-G6): TORSTEN'S PICKET on the trail's east
 * shoulder where the wood opens (the lamps, the slate as THE TALLY,
 * the bell, the bench, the four mounds and the rag on the ring), THE
 * WARD LINE across the High Road at the fork (the Court's thread as
 * an L round the dying stand, the three grey points in their dead
 * rings, the root past the end, and Bodil's licensed cut at the
 * stand's west skirt with its crew of three and the wolves that walk
 * the south leg), and THE TURN east along the road (the cairn that
 * fell and one dead tree). Three SMALL AUTHORED ZONES on the fen
 * waist's module pattern COPIED: one ctx bound to one frame at a
 * time, the pins, the lints, one scene module per scene, a sentence
 * above every placement. None is a core (§13.2 says so); each is
 * TILE_SKIP everywhere it does not author; the fork rest and the
 * husk are the pinned POIs whose footprints the rects were measured
 * to stay clear of.
 *
 * THE ORDER, which is the whole law of this file:
 *   wardthread: makeCtx → ground (the fells, G3) → line → stones →
 *               cut → people → the deferred details → growth 'wild' →
 *               build.
 *   picket:     makeCtx → picket (its fells, G1-G4, the props) → the
 *               sign flush → growth 'wild' → build.
 *   turnoff:    makeCtx → turnoff → growth 'wild' → build.
 *
 * LAWS THIS FRAME KEEPS:
 * - The base is TILE_SKIP; the border ring publishes no edge profile.
 * - No authored cell inside any bed, by the route's own half; every
 *   authored shoulder cell is listed with its reason.
 * - One Signpost per eyeful: THE TALLY at the picket; the fork's
 *   board is forty tiles north; the Court and the Charter letter
 *   nothing.
 * - THE TRUNK LAW: every fell pocket is the zone's own decision with
 *   its sentence in pins.ts; no sentence about the wood is a worldgen
 *   read; the stand's dying is the blight stroke (geography.ts) and
 *   the authored rings.
 * - No hug on any north pin; no chest; no haven; no spawn.
 * - growth 'wild'; byte-identical across builds (wardRng is pure).
 */
import { TILE_SKIP, type Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import type { ZoneDef } from '../types.js';
import { makeCtx, type WardRegistry } from './ctx.js';
import { cut } from './cut.js';
import { ground } from './ground.js';
import { line } from './line.js';
import { people } from './people.js';
import { picket } from './picket.js';
import { PINS, type Frame } from './pins.js';
import { stones } from './stones.js';
import { turnoff } from './turnoff.js';

function open(frame: Frame): { b: ZoneBuilder; ctx: ReturnType<typeof makeCtx>['ctx']; registry: WardRegistry } {
  // G0 THE BASE: transparent, so the field shows through until a
  // scene authors a cell.
  const b = new ZoneBuilder(frame.id, frame.name, { x: frame.ORIGIN.x, y: frame.ORIGIN.y }, frame.WIDTH, frame.HEIGHT, TILE_SKIP as unknown as Tile);
  const { ctx, registry } = makeCtx(b, frame);
  return { b, ctx, registry };
}

function close(b: ZoneBuilder, frame: Frame, registry: WardRegistry): ZoneDef {
  // The deferred details land over the props; the sign flush lays
  // the boards last so nothing overwrites a slate.
  for (const d of registry.details) b.setDetail(d.x - frame.ORIGIN.x, d.y - frame.ORIGIN.y, d.d);
  for (const s of registry.signs) b.sign(s.x - frame.ORIGIN.x, s.y - frame.ORIGIN.y, s.title, [...s.lines], s.tile);
  // G-3: authored wilderness, untended.
  b.growth('wild');
  return b.build();
}

/** THE WARD LINE with its registry, for the lints and the block-out shots. */
export function buildWardthreadWithRegistry(): { zone: ZoneDef; registry: WardRegistry } {
  const { b, ctx, registry } = open(PINS.WARDTHREAD);
  ground(ctx);
  line(ctx);
  stones(ctx);
  cut(ctx);
  people(ctx);
  return { zone: close(b, PINS.WARDTHREAD, registry), registry };
}

/** THE PICKET with its registry. */
export function buildPicketWithRegistry(): { zone: ZoneDef; registry: WardRegistry } {
  const { b, ctx, registry } = open(PINS.PICKET);
  picket(ctx);
  return { zone: close(b, PINS.PICKET, registry), registry };
}

/** THE TURN with its registry. */
export function buildTurnoffWithRegistry(): { zone: ZoneDef; registry: WardRegistry } {
  const { b, ctx, registry } = open(PINS.TURNOFF);
  turnoff(ctx);
  return { zone: close(b, PINS.TURNOFF, registry), registry };
}

/** The zones alone: the shapes every registry and test consumes. */
export function buildWardthread(): ZoneDef {
  return buildWardthreadWithRegistry().zone;
}
export function buildPicket(): ZoneDef {
  return buildPicketWithRegistry().zone;
}
export function buildTurnoff(): ZoneDef {
  return buildTurnoffWithRegistry().zone;
}

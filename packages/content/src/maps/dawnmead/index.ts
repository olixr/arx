/**
 * DAWNMEAD UNDER SIEGE (band 6) — THE COMPOSITION (L1 FRAME).
 *
 * Dawnmead, the village that raises wakers, in the spring the war
 * came to its hem (docs/contested-lands-plan.md §7). This directory
 * replaces the one-file THE DAWN COMES OPEN build with a frame and
 * twenty-two district modules, each one lane's, each coding against
 * the frozen ctx (ctx.ts) and the sacred pins (pins.ts).
 *
 * THE ORDER (brief §9.1), which is the whole law of this file:
 *   makeCtx → ground (G0-G46) → the districts west to south →
 *   people → scatter + the flower thinning → flush the deferred
 *   details → the golden Ring box → the edge woods → the golden box
 *   again (the woods never touch it) → the sign flush → spawn → build.
 *
 * LAWS THIS FRAME KEEPS (the shipped file's, and the brief's):
 * - Spawn (78.5,112.5) = world (-81.5,48.5), unchanged across every
 *   rebuild (worldgen.test pins it; the rescue law depends on it).
 * - THE TUTORIAL IS SACRED: the Ring box (64,100)-(93,124) is
 *   byte-identical to the shipped build by construction (pins.RING_BOX_GOLDEN).
 * - Lane rows 111-113 reach x191 as Path; the hunters' trail leaves at
 *   (60,0); the old road leaves at (108,223). The geography pts agree.
 * - ONE Campfire, Workbench, ChestWood, Furnace, Anvil, CookPot,
 *   BeastPen, MarketStall; TWO RockCopper, TWO RockTin.
 * - The knoll (100,138) 7x4 at level 1 is the zone's ONE raise; every
 *   other tile is level 0.
 * - Signs flush last (§7.6): no fill can bury a board. One Signpost per
 *   eyeful; shingles are nameplates.
 * - The corridor law, the awning host law, the occlusion law, the
 *   cardinal-stand law, gates authored open: lint.ts proves them.
 * - NO fountain and NO founder statue, ever. No second Campfire, no
 *   TentHide inside the hem, no madder on a stand.
 */
import { Detail, Tile } from '@arx/shared';
import { ZoneBuilder } from '../builder.js';
import type { ZoneDef } from '../types.js';
import { makeCtx, meadRng, type DawnRegistry } from './ctx.js';
import { NO_FLOWER_ZONES, ground } from './ground.js';
import { KEEP_OUT_BASE, RING_BOX, RING_BOX_GOLDEN, type Rect4 } from './pins.js';
import { ring } from './ring.js';
import { keepers } from './keepers.js';
import { green } from './green.js';
import { inn } from './inn.js';
import { cottageRow } from './cottageRow.js';
import { common } from './common.js';
import { farmstead } from './farmstead.js';
import { orchard } from './orchard.js';
import { waterside } from './waterside.js';
import { stalls } from './stalls.js';
import { works } from './works.js';
import { cookhouse } from './cookhouse.js';
import { muster } from './muster.js';
import { pell } from './pell.js';
import { butts } from './butts.js';
import { spark } from './spark.js';
import { copse } from './copse.js';
import { granary } from './granary.js';
import { gate } from './gate.js';
import { oldRoad } from './oldRoad.js';
import { quiet } from './quiet.js';
import { people } from './people.js';

/** The districts in composition order (west, north, east, south, roads). */
const DISTRICTS = [
  ring, keepers, green, inn,
  cottageRow, common, farmstead, orchard,
  waterside, stalls, works, cookhouse,
  muster, pell, butts, spark, copse,
  granary, gate, oldRoad, quiet,
] as const;

/** Flower cover the scatter keeps at 0.05: the Ring's box, the orchard, Wren's garden. */
const FLOWER_KEEP: ReadonlyArray<Rect4> = [
  [RING_BOX.x0, RING_BOX.y0, RING_BOX.x1, RING_BOX.y1],
  [44, 30, 92, 72],
  [86, 97, 99, 109],
];

const inRect4 = (r: Rect4, x: number, y: number): boolean =>
  x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

/** Stamp the golden Ring box, ground and detail (J17). */
function stampGolden(b: ZoneBuilder): void {
  let k = 0;
  for (let y = RING_BOX.y0; y <= RING_BOX.y1; y++) {
    for (let x = RING_BOX.x0; x <= RING_BOX.x1; x++, k++) {
      b.set(x, y, RING_BOX_GOLDEN.ground[k]! as Tile);
      b.setDetail(x, y, RING_BOX_GOLDEN.detail[k]! as Detail);
    }
  }
}

/**
 * Build Dawnmead and hand back the districts' registry with it, for
 * the lints (content.test) and the block-out screenshots.
 */
export function buildDawnmeadWithRegistry(): { zone: ZoneDef; registry: DawnRegistry } {
  // G0 THE BASE — 192x224 at world (-160,-64), grass; the brook's
  // centre column is ctx.brookX.
  const b = new ZoneBuilder('dawnmead', 'Dawnmead', { x: -160, y: -64 }, 192, 224, Tile.Grass);
  const { ctx, registry } = makeCtx(b);

  // THE GROUND FIRST (G1-G46).
  ground(ctx);

  // THE DISTRICTS, then the people (bodies and spawn clusters last).
  for (const district of DISTRICTS) district(ctx);
  people(ctx);

  // G47 MEADOW LIFE — the shipped scatter, same draws; then the flower
  // thinning (§7.2: 0.05 inside the Ring, the orchard and Wren's
  // garden; 0.015 everywhere else, and none inside the Road Row); then
  // the tufts; then every authored detail lands over the RNG's.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.05);
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 192; x++) {
      if (b.get(x, y) !== Tile.Grass || b.getDetail(x, y) !== Detail.Flowers) continue;
      if (FLOWER_KEEP.some((r) => inRect4(r, x, y))) continue;
      const bare = NO_FLOWER_ZONES.some((r) => inRect4(r, x, y));
      if (bare || meadRng(x, y) > 0.3) b.setDetail(x, y, Detail.None);
    }
  }
  b.scatterDetail(Detail.Tuft, 0.06);
  for (const d of registry.details) b.setDetail(d.x, d.y, d.d);

  // G48 THE GOLDEN BOX — identical inside eight tiles by construction.
  stampGolden(b);

  // G49 EDGE WOODS — dense at the rim, thinning inward, off every
  // worked place: the KEEP_OUT union, the lane band, every off-level
  // tile and every rim tile (the knoll fences itself to Cliff).
  const keepOut: Rect4[] = [
    ...KEEP_OUT_BASE,
    ...registry.keepOuts.map((k): Rect4 => [k.x0, k.y0, k.x1, k.y1]),
  ];
  const inKeepOut = (x: number, y: number): boolean => keepOut.some((r) => inRect4(r, x, y));
  const offLevel = (x: number, y: number): boolean => {
    if (b.levelAt(x, y) !== 0) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && b.levelAt(x + dx, y + dy) !== 0) return true;
      }
    }
    return false;
  };
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 192; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 112) <= 4 && x >= 66) continue; // the lane breathes
      if (inKeepOut(x, y)) continue;
      if (offLevel(x, y)) continue;
      const edge = Math.min(x, y, 191 - x, 223 - y);
      const density = edge < 5 ? 0.4 : edge < 12 ? 0.14 : 0.01;
      if (meadRng(x, y) < density) b.set(x, y, edge < 5 && meadRng(y, x) < 0.3 ? Tile.TreeOak : Tile.Tree);
    }
  }
  // The woods reproduce the shipped rim of the box tile for tile (same
  // hash, same grass); the second stamp makes that a law, not a hope.
  stampGolden(b);

  // G50 THE SIGN FLUSH — every board after every fill; validateSigns
  // still gates the build.
  for (const s of registry.signs) b.sign(s.x, s.y, s.title, [...s.lines], s.tile);

  b.spawn(78.5, 112.5);
  return { zone: b.build(), registry };
}

/** The zone alone: the shape every registry and test consumes. */
export function buildDawnmead(): ZoneDef {
  return buildDawnmeadWithRegistry().zone;
}

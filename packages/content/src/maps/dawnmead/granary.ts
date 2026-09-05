/**
 * DAWNMEAD UNDER SIEGE (band 6) — granary.ts [L6 ROADS + PEOPLE].
 *
 * D21 THE OLD GRANARY MEADOW (brief §3 D21; box (130,150)-(165,189)).
 *
 * Hobb's people stored grain here before the family took the road to
 * Amberford; the rats hold it in daylight, one knot now on the open
 * dirt at the south breach so the fight reads from the road (ruling
 * 8). The village chest waits inside for whoever thins them. Long
 * grass round the shell, the old fence leaning in, one working cat.
 *
 * GROUND (L1 ground.ts, G43): the ruin's floor Dirt x139..154
 * y158..169; the breach apron ellipse (142.5,172.5, 3, 2); the track
 * off the spur along y164 and its bend to the breach (142..143,170).
 * SIGN: THE OLD GRANARY (137,152) Signpost, three lines (pins; one
 * col east of the kept tile, FIX PASS 1 defect 2: 25 cols from THE
 * OLD ROAD at the true 48x45 eyeful).
 * CAST HOOKS: ward #3 post (134.5,154.5) + its dusk loop stop (147,166)
 * on the ruin floor; rat knots (147.5,166.5) (141.5,176.5) (142.5,172.5)
 * and the cat (136.5,166.5) are people.ts's; their centres stay open.
 *
 * The box is trimmed to y189 (the brief's y192 rode over THE SOUTH
 * MEADOW's y190); nothing of the granary stands south of y184.
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function granary(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(130, 150, 165, 189, 'granary: THE OLD GRANARY MEADOW');
  // FIX PASS 1 (defect 6): the inland edge-wood roll seeded two Trees
  // on the track's verge inside the S6 corridor (122,166) (127,168);
  // the track and the meadow between the spur and the breach hold
  // nothing tall so the fight reads from the road.
  ctx.keepOut(110, 164, 141, 176, 'the S6 corridor: the granary track and the meadow to the breach');

  // ================================================================
  // THE SHELL — the roofless ruin. PRIMARY.
  // ================================================================
  // The four walls Hobb's people raised, stone because grain is worth
  // stone; the roof went to the rats year before last and the walls
  // stayed because nobody has a use for them and nobody will pull a
  // wall the parish's urns still stand inside (verbatim, J19).
  b.outlineRect(138, 157, 18, 14, Tile.WallStone);
  // The doorway went with the roof: the north wall opens where the
  // cart once backed in, and the meadow walks straight onto the floor.
  b.set(146, 157, Tile.Grass).set(147, 157, Tile.Grass);
  // The south wall sagged open the winter after: the breach the rats
  // use and the one the fight is read through from the track.
  b.set(142, 170, Tile.Grass).set(143, 170, Tile.Grass);
  // And the east wall went the same way, two courses at once.
  b.set(155, 163, Tile.Grass).set(155, 164, Tile.Grass);
  // A roofless ruin grows things: weeds have the floor, and the rats
  // came for what the weeds did not take (verbatim).
  for (const [wx, wy] of [
    [140, 160], [143, 166], [149, 159], [152, 167], [145, 162], [153, 161],
  ] as const) b.set(wx, wy, Tile.GrassTall);
  for (const [wx, wy] of [
    [141, 165], [148, 168], [151, 163], [142, 159], [150, 165], [146, 159], [154, 166],
  ] as const) b.set(wx, wy, Tile.Grass);

  // ================================================================
  // WHAT THE ROOF LEFT BEHIND. SECONDARY.
  // ================================================================
  // The village chest, the ONE ChestWood in Dawnmead (pins.SINGLETONS):
  // it waits in the middle of the floor for whoever thins the rats,
  // because a reward kept where the fight is teaches the fight.
  b.set(147, 164, Tile.ChestWood);
  // The last crate by the north-west corner, never carried out.
  b.set(139, 158, Tile.Crate);
  // A barrel in the south-east corner the sag did not reach.
  b.set(154, 169, Tile.Barrel);
  // The parish's urns, kept in the dry corner before the roof went: two
  // stacks nobody has moved, because moving them would mean deciding
  // where they go (verbatim + NEW second stack, ruling Kit 12).
  b.set(141, 161, Tile.BurialUrns);
  b.set(140, 166, Tile.BurialUrns);
  // The east wall's fallen courses, heaped where they came down: the
  // one silhouette the track reads above the walls (SpoilHeap in the
  // shipped CaveRubble's place; S6).
  b.set(152, 159, Tile.SpoilHeap);
  // Loose rubble on the floor and in the north wall's second gap,
  // walkable, the rats' own ground (verbatim; ruling Kit 1).
  b.set(150, 161, Tile.CaveRubble);
  b.set(153, 157, Tile.CaveRubble);
  // The last of the grain, sacked and never carted, which is why the
  // rats came back a season early.
  b.set(144, 168, Tile.GrainSacks);
  // Barrels stacked against the west wall for a harvest that never came in.
  b.set(143, 163, Tile.BarrelStack);

  // TERTIARY: what grows on a floor the rain reaches.
  for (const [mx, my] of [[147, 161], [144, 166]] as const) ctx.detail(mx, my, Detail.Mushroom);
  // Straw the sacks shed, dragged about by the rats.
  for (const [sx, sy] of [
    [143, 160], [149, 166], [152, 162], [141, 167], [148, 160],
  ] as const) ctx.detail(sx, sy, Detail.Straw);

  // ================================================================
  // THE MEADOW THE RATS CLAIMED.
  // ================================================================
  // The old fence's last three posts, leaning in toward the shell,
  // where the granary yard's west rail once ran (verbatim).
  b.set(134, 172, Tile.Fence).set(135, 172, Tile.Fence).set(136, 173, Tile.Fence);
  // The stump of the meadow's one tree, felled for the roof beams that
  // are gone now too (verbatim).
  b.set(158, 174, Tile.Stump);
  // Long grass nobody scythes because nobody grazes the granary meadow
  // any more; the cat hunts the rats through it (verbatim).
  for (const [gx, gy] of [
    [134, 160], [136, 166], [157, 158], [157, 168], [140, 176], [150, 178],
    [132, 154], [145, 152], [155, 152], [160, 178], [136, 182], [148, 184],
  ] as const) b.set(gx, gy, Tile.GrassTall);
  // A mushroom in the fence's shade, straw blown out of the breach, and
  // pebbles where the track's foot meets the meadow (verbatim).
  ctx.detail(138, 175, Detail.Mushroom);
  ctx.detail(152, 176, Detail.Straw);
  ctx.detail(144, 155, Detail.Pebbles);
  // The willow at the east sag, leaning over the brook the way the
  // wall leaned over the floor (verbatim; listed once in D12).
  b.set(156, 168, Tile.TreeWillow);

  // ward #3 stands the meadow at dusk on grass north-west of the shell,
  // the sign three cols east and two rows north of him so the board is
  // never south of the body (people.ts places him).
  ctx.post(134, 154);

  // THE OLD GRANARY, the village's board on the track's near end: the
  // kept tile stepped one col east (FIX PASS 1, defect 2), new lines
  // (pins.SIGN_LEDGER.old_granary).
  const s = ctx.pins.SIGN_LEDGER.old_granary;
  ctx.sign(s.x, s.y, s.title, s.lines, s.tile);
}

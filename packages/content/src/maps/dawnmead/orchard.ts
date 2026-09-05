/**
 * DAWNMEAD UNDER SIEGE (band 6) — orchard.ts [L3 NORTH].
 *
 * D9 THE ORCHARD + THE TRAIL HEAD (40,16)-(99,63) ∪ (54,0)-(66,15):
 * the one place in Dawnmead bounded by hedge, not rail, because an
 * orchard is a garden; fifty years of wakers learning shears kept it
 * square and the trees do not know what year it is. The siege is at
 * its north arch, where the wolves came down in the spring and
 * stripped two trees, and Rill answered with two fletched posts and a
 * skull (J13). Everything inside the hedge stands verbatim (J19).
 *
 * SCENES / BOXES: THE ORCHARD (44,30)-(92,72) (the hedge ring; the
 * brief's D9 bounds reach x99, but the fields box begins at x98 and
 * the coop box at x99, so this lane's boxes stop at the hedge and at
 * the walk's verge); THE BEES ON THE WALK'S VERGE + THE ORCHARD board
 * (96,44)-(98,58); THE ARCH AND RILL'S MARKS (60,18)-(78,29); THE
 * TRAIL HEAD (54,0)-(66,17), empty on purpose.
 * GROUND (L1): G12 the orchard walk + the east-gate approach (93,52);
 * G20 the trail worn three wide + the arch apron (68,27..29); G21 the
 * harvest corner's Dirt. This module lays no ground.
 * SIGNS: THE ORCHARD (90,28) Signpost (moved from (94,54) by J16 to
 * (98,45), then by FIX PASS 1 (defect 2) to the hedge's north-east
 * corner on the trail's verge: at the true 48x45 eyeful (98,45) shared
 * a frame with BRAMMEL'S FIELD and THE COOP); HUNTERS' TRAIL (62,28)
 * Signpost (kept, 28 cols west).
 * CAST HOOKS: none (nothing of Rill's routine touches y < 150); the
 * keepOut [60,18,78,31] keeps the edge woods off the arch.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law (the two
 * stripped trees stand off the trail column and the arch column, two
 * rows clear of any door, board or post); gates authored open (both
 * HedgeGates); wear is never a rectangle; one Signpost per eyeful
 * (THE ORCHARD (90,28) to HUNTERS' TRAIL 28 cols, to BRAMMEL'S FIELD
 * 27 cols; THE COOP is cut).
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function orchard(ctx: DawnCtx): void {
  const { b } = ctx;

  // ================================================================
  // THE ORCHARD (kept)
  // ================================================================
  // SENTENCE: fifty years of wakers learning shears kept it square and
  // the trees do not know what year it is.
  ctx.box(44, 30, 92, 72, 'orchard: the orchard (the hedge ring)');

  // The clipped hedgerow, x44..92 by y30..72: hedge, not rail, because
  // livestock gets post and timber and an orchard is a garden.
  b.outlineRect(44, 30, 49, 43, Tile.Hedge);
  // The east arch onto the orchard walk, open: the wakers' way in to
  // learn shears; the approach (93,52) is worn to it (G12).
  b.set(92, 52, Tile.HedgeGate);
  ctx.door(92, 52);
  // The north arch onto the hunters' trail, open: the living arch the
  // wolves came down to this spring (the marks stand outside it).
  b.set(68, 30, Tile.HedgeGate);
  ctx.door(68, 30);
  // The planted lines: six rows of eight, apples on the even rows and
  // plums on the odd, the odd rows set two columns over so the sun
  // reaches every crown; the trees do not know what year it is.
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const tx = 48 + col * 5 + (row % 2 ? 2 : 0);
      const ty = 34 + row * 6;
      if (tx >= 91) continue;
      b.set(tx, ty, row % 2 === 0 ? Tile.AppleTreeRipe : Tile.PlumTreeMid);
    }
  }
  // Two saplings between the lines: an oak a waker planted where a
  // plum died, and a whip nobody has named yet; the orchard is still
  // being taught.
  b.set(63, 51, Tile.SaplingOak).set(79, 47, Tile.Sapling);

  // THE HARVEST CORNER, mid-picking, on its own Dirt (G21): the crates,
  // the press, the barrel, the cart and the ladder, left where the
  // last picker set them down, because picking is never finished.
  // The full crate and the open one by the north hedge.
  b.set(46, 67, Tile.CrateStack).set(47, 67, Tile.CrateGoods);
  // The fruit press: windfalls go in here, and windfalls are anybody's.
  b.set(50, 67, Tile.FruitPress);
  // The barrel the press fills and the hand cart that carries it to
  // the barn.
  b.set(46, 70, Tile.Barrel).set(48, 70, Tile.HandCart);
  // The ladder leaning at the corner's south edge, the picker's own.
  b.set(51, 70, Tile.LeanLadder);
  // Sawdust under the press and pebbles where the cart's wheel bites.
  ctx.detail(49, 69, Detail.Sawdust);
  ctx.detail(47, 69, Detail.Pebbles);
  // Two skeps inside the south-east corner: the orchard's own bees,
  // set where the plum blossom is thickest.
  b.set(86, 68, Tile.Apiary).set(88, 70, Tile.Apiary);
  // Flowers between the lines where the bees go, a mushroom ring by
  // the south hedge, and a tuft under the first apple: an orchard
  // floor, kept at the flower cover the scatter allows here.
  ctx.detail(60, 45, Detail.Flowers);
  ctx.detail(76, 58, Detail.Flowers);
  ctx.detail(54, 62, Detail.Flowers);
  ctx.detail(84, 38, Detail.Flowers);
  ctx.detail(70, 66, Detail.Mushroom);
  ctx.detail(58, 36, Detail.Tuft);

  // ================================================================
  // THE BEES ON THE WALK'S VERGE + THE ORCHARD BOARD
  // ================================================================
  // SENTENCE: the orchard's three skeps stand on the walk's east verge
  // between the hedge and the farmhouse, where the stray eggs end up
  // and the wakers walking north pass the bees at arm's length.
  ctx.box(96, 44, 98, 58, "orchard: the bees on the walk's verge");

  // Three skeps on the verge, east of the walk (x93-95) so no boot
  // ever kicks one: the hives the hedge's blossom feeds.
  b.set(97, 50, Tile.Apiary).set(97, 54, Tile.Apiary).set(98, 57, Tile.Apiary);
  // Flowers at the skeps' feet: the bees' own dooryard.
  ctx.detail(98, 52, Detail.Flowers);
  ctx.detail(98, 56, Detail.Flowers);
  // THE ORCHARD in the village's voice: "Windfalls are anybody's.
  // Shake nothing. Ask Alder." FIX PASS 1 (defect 2): it stands at the
  // hedge's north-east corner (90,28), two rows north of the north
  // run on the trail's south verge, where the trail turns down the
  // walk and every waker going north passes it; the only Signpost in
  // its eyeful (28 cols from HUNTERS' TRAIL, 27 from BRAMMEL'S FIELD).
  // Its south rows are grass and the hedge, never a door.
  const orch = ctx.pins.SIGN_LEDGER.orchard;
  ctx.sign(orch.x, orch.y, orch.title, orch.lines, orch.tile);

  // ================================================================
  // THE ARCH AND RILL'S MARKS
  // ================================================================
  // SENTENCE: the wolves came down to the north arch in the spring and
  // stripped bark from the two trees outside it, so Rill drove two
  // fletched posts at the arch and hung a skull at the foot of one,
  // because the people who take this trail cannot all read and she
  // does not walk it herself.
  ctx.box(60, 18, 78, 29, "orchard: the arch and Rill's marks");
  // The edge woods stay off the arch: the two stripped trees and the
  // marks are the only tall things here, and the trail reads through
  // them.
  ctx.keepOut(60, 18, 78, 31, "the arch's stripped trees and Rill's marks");

  // The two trees the wolves stripped, bark gone to the height of a
  // standing wolf, either side of the trail's elbow: west of the arch
  // column and east of it, off the trail column x59-61, and nothing
  // with a door, a board or a post within two rows north of either.
  ctx.deadTree(64, 23);
  ctx.deadTree(73, 23);
  // Rill's two marks, fletched posts in her own colour, one either side
  // of the arch apron (68,27..29): "wolves, this way" for anyone who
  // cannot read a board (ArrowPost, not a rag stake: J13).
  b.set(66, 28, Tile.ArrowPost).set(70, 28, Tile.ArrowPost);
  // The skull at the west post's foot, against the hedge's north face:
  // the one the wolves left, hung there so the sign reads in every
  // language.
  b.set(66, 29, Tile.BonePile);
  // Pebbles on the elbow's dirt where the hunters' boots turn.
  ctx.detail(69, 27, Detail.Pebbles);
  // Long grass either side of the elbow where nobody walks: the trail
  // is worn three wide because the hunters go out in a line, and the
  // grass beside it says nobody strays.
  b.set(62, 24, Tile.GrassTall).set(75, 26, Tile.GrassTall);
  // HUNTERS' TRAIL in Halla's voice, kept: "No lamps this way. Wolves
  // den in the north wood." West of the trail column at the elbow, six
  // cols west of the arch, 36 cols from THE ORCHARD.
  const trail = ctx.pins.SIGN_LEDGER.hunters_trail;
  ctx.sign(trail.x, trail.y, trail.title, trail.lines, trail.tile);

  // ================================================================
  // THE TRAIL HEAD
  // ================================================================
  // SENTENCE: single-file dirt out the north hem, no lamps, and nothing
  // placed beside it on purpose: the trail is the one road in Dawnmead
  // that does not want you, and the emptiness either side is its sign.
  // The box is declared so the flood proves the trail walks from the
  // spawn to (60,0); no tile is authored in it.
  ctx.box(54, 0, 66, 17, 'orchard: the trail head (empty on purpose)');
}

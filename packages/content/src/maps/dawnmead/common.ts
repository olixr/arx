/**
 * DAWNMEAD UNDER SIEGE (band 6) — common.ts [L3 NORTH].
 *
 * D7 THE COMMON (94,64)-(137,82): the big fenced pasture between the
 * farm and the village, shrunk to x96..134 (J4) so Sorrel's rails
 * stand four clear. Brammel's cows graze west; the crofters' three
 * ewes came in at the south-east corner where the rail was already
 * leaning; the hay moved to the far rail; and the Charter's two brass
 * posts went in at his own gate where he could not fail to see them.
 *
 * SCENES / BOXES: THE PASTURE (94,64)-(137,82) (x137, not the brief's
 * x138: Sorrel's yard box (L4) begins at x138 and boxes never overlap).
 * GROUND (L1): G17 the homestead way through both gates; G22 the
 * inside-gate ellipse, the crofters' drive off the walk, the crofters'
 * way in up the strip to the broken corner. The interior stays grass.
 * SIGNS: THE COMMON (95,79) Signpost (moved from (95,86), J16).
 * CAST HOOKS (people.ts places the bodies): crofter C post (94.5,74.5)
 * outside the west gate; Brammel's added stand (97,74) inside it; the
 * stops (120,74) (120,66) (120,82) open; cows (106.5,74.5) r4 n2;
 * ewes (128.5,74.5) r4 n3.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; gates
 * authored open; wear is never a rectangle; one Signpost per eyeful.
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function common(ctx: DawnCtx): void {
  const { b } = ctx;

  // ================================================================
  // THE PASTURE
  // ================================================================
  // SENTENCE: it is grass because Brammel keeps it grass; this spring
  // the crofters' ewes came in at the south-east corner where the rail
  // was already leaning, so the hay moved to the far rail and the
  // Charter's two posts went in at his own gate where he could not
  // fail to see them.
  ctx.box(94, 64, 137, 82, 'common: the pasture');

  // The fence: post and timber round x96..134, y66..82; livestock gets
  // rail, never hedge. Thirty-nine wide since the east run came in
  // (J4) so the crofters' way up the strip has four open columns.
  b.outlineRect(96, 66, 39, 17, Tile.Fence);
  // The west gate, open: Brammel's own, onto the crofters' drive.
  b.set(96, 74, Tile.FenceGate);
  ctx.door(96, 74);
  // The north gate, two wide and open: the homestead way comes down
  // from the farm yard through it.
  b.set(120, 66, Tile.FenceGate).set(121, 66, Tile.FenceGate);
  ctx.door(120, 66);
  ctx.door(121, 66);
  // The south gate, two wide and open: the homestead way goes on to
  // the inn's gable and the green.
  b.set(120, 82, Tile.FenceGate).set(121, 82, Tile.FenceGate);
  ctx.door(120, 82);
  ctx.door(121, 82);
  // The leaning rail at the south-east corner: where the crofters'
  // ewes came in this spring, and nobody has mended it because mending
  // it would be a statement. The corner post (134,82) still stands;
  // the crofters' way in (G22) ends on the tile south of it.
  b.set(133, 82, Tile.FenceBroken);

  // Hay against the north-west rail: the far rail from the ewes. It
  // used to stand at the east run; Brammel carried it the width of
  // the field rather than watch three strange sheep eat his winter.
  b.set(97, 67, Tile.HayBale).set(98, 67, Tile.HayBale).set(98, 68, Tile.HayBale);
  // The trough by the west rail, where the cows drink (kept).
  b.set(99, 69, Tile.WaterTrough);
  // The Charter's two brass posts inside the west gate, one either side
  // of his stand: the Charter measures grazing by the post and Brammel
  // walks between them every noon on his way to argue with the crofter
  // through his own gate.
  b.set(98, 72, Tile.CharterPost);
  b.set(98, 76, Tile.CharterPost);

  // Straw where the beasts lay: two cows' worth west, three ewes'
  // worth east.
  ctx.detail(106, 72, Detail.Straw);
  ctx.detail(115, 78, Detail.Straw);
  ctx.detail(130, 74, Detail.Straw);
  // A tuft the ewes have not reached yet.
  ctx.detail(125, 70, Detail.Tuft);
  // Long grass the cows leave: a pasture is not a lawn. ((134,73) is
  // the fence now and is cut.)
  b.set(101, 76, Tile.GrassTall).set(112, 68, Tile.GrassTall);
  b.set(128, 79, Tile.GrassTall).set(108, 81, Tile.GrassTall);

  // Crofter C's post outside the west gate, facing in through it at
  // Brammel's stand (97,74).
  ctx.post(94, 74);

  // THE COMMON's board in Brammel's voice: "Cows west, sheep east, and
  // the gate stays open." Now half true, which is canon. Six rows
  // north of the crowded roof, five south of the crofter's post, and
  // the only Signpost in its eyeful.
  const s = ctx.pins.SIGN_LEDGER.common;
  ctx.sign(s.x, s.y, s.title, s.lines, s.tile);
}

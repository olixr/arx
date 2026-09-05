/**
 * DAWNMEAD UNDER SIEGE (band 6) — ring.ts [L2 WEST].
 *
 * D1 THE WAKING RING (golden) and D2 THE WEST MEADOW: the burnt
 * cottage, the meadow oaks, the survey line and the hem's dead oak.
 *
 * D1 places NOTHING by hand. The Ring box (64,100)-(93,124) is stamped
 * from pins.RING_BOX_GOLDEN by index.ts after scatter and again after
 * the edge woods (J17); THE TUTORIAL IS SACRED. This module snapshots
 * the box on entry and throws if any of its own placements changed a
 * box cell, so the golden is a law here and not a hope.
 *
 * D2 is the first eyeful after waking read from the pad: seven pillars
 * centre, one chimney with a hearth under it top-left, and a lane of
 * lamps going the other way (J1, sight line S1). Everything west of
 * the survey line is empty on purpose (§9.3).
 *
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G7 pad, G8 Ring trace, G9 cousin's way, G42 ash (the shell's Dirt
 *   floor under Detail.Ash, its open-face row and the lobe).
 * SIGNS IT QUEUES: HOBB'S COUSIN'S ROOF (53,109) Signpost.
 * KEEP_OUT it registers: [50,96,66,112] [38,126,58,130] [7,104,15,112].
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates open; wear is never a rectangle; one Signpost per
 * eyeful. CONTENT BOUNDARY holds; no dashes in any player-facing string.
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

/** Ground + detail of the Ring box, row-major, for the untouched check. */
function snapshotBox(ctx: DawnCtx): { ground: number[]; detail: number[] } {
  const { x0, y0, x1, y1 } = ctx.pins.RING_BOX;
  const ground: number[] = [];
  const detail: number[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      ground.push(ctx.b.get(x, y));
      detail.push(ctx.b.getDetail(x, y));
    }
  }
  return { ground, detail };
}

export function ring(ctx: DawnCtx): void {
  const { b, pins } = ctx;
  const S = pins.SIGN_LEDGER;

  // ==================================================================
  // D1 THE WAKING RING — the golden box (64,100)-(93,124).
  // ==================================================================
  // SENTENCE: nobody set the seven stones up; the village only tends
  // them; the box is identical inside eight tiles because THE TUTORIAL
  // IS SACRED. The pad, the seven PillarStones, the two fallen rocks,
  // the pebbles and the seventeen flowers, the four tall grasses, the
  // two oaks, the two ring lamps, Wren's hedge, skep and planter, her
  // west and south walls, door and porch row, and the muster court's
  // north-west rim (Halla's rota board NoticeBoard (93,119), chalked by
  // her hand every seventh day; the engine cannot letter it, so THE
  // MUSTER LINE sign carries the words) all arrive with the golden
  // stamp. ring.ts authors nothing here: it only proves it did not.
  const before = snapshotBox(ctx);
  ctx.box(pins.RING_BOX.x0, pins.RING_BOX.y0, pins.RING_BOX.x1, pins.RING_BOX.y1, 'ring:D1 THE WAKING RING (golden)');

  // ==================================================================
  // D2 THE BURNT COTTAGE — Hobb's cousin's roof [BOX (50,96)-(63,111)].
  // ==================================================================
  // SENTENCE: the cousin built apart from the Row on the meadow's edge
  // by the Ring's lamps in his father's time; the roof went up at dusk
  // in the spring, after the family had already walked east to
  // Amberford (canon 8.1: nobody died here); the shell stands open to
  // the south so the first eyeful after waking holds seven pillars,
  // one chimney with a hearth under it, and a lane of lamps going the
  // other way.
  ctx.box(50, 96, 63, 111, "ring:D2 THE BURNT COTTAGE (Hobb's cousin's roof)");
  ctx.keepOut(50, 96, 66, 112, 'the burnt cottage and the smoke corridor (S1)');

  // PRIMARY the shell. The north footings that did not burn: stone at
  // both corners of the north run.
  b.set(54, 100, Tile.RuinWallStone);
  b.set(61, 100, Tile.RuinWallStone);
  // The north run's studs the fire left, an open frame the lamplight
  // passes between; the flue's slot at x59 is the stack's.
  for (const x of [55, 56, 57, 58, 60]) b.set(x, 100, Tile.RuinWallWood);
  // The ChimneyStack stands IN the north run where the flue was
  // (wall-shadow law: north; LIGHT_BLOCKING; the kit's tallest piece,
  // painting (59,98..99), which is meadow).
  b.set(59, 100, Tile.ChimneyStack);
  // The west and east studs, y101..106: the fire took the wattle and
  // left the frame.
  for (let y = 101; y <= 106; y++) {
    b.set(54, y, Tile.RuinWallWood);
    b.set(61, y, Tile.RuinWallWood);
  }
  // The south corner stubs in stone; the south wall is gone between
  // them: the open face the Ring reads the interior through.
  b.set(54, 107, Tile.RuinWallStone);
  b.set(61, 107, Tile.RuinWallStone);

  // SECONDARY the hearth. The EmberBed directly south of the stack,
  // over its own ash (K1): the column the Ring sees at dusk, a coal
  // glow at night; by day the shell reads by its stack, its fallen
  // roof and its ash (ruling Kit 11).
  ctx.emberBed(59, 101);
  // Where the thatch came down: two domes of rafters through burnt
  // thatch, one against the north-west corner, one mid-floor.
  b.set(56, 102, Tile.CollapsedRoof);
  b.set(58, 105, Tile.CollapsedRoof);
  // A rafter that slid to the west wall when the ridge went.
  b.set(55, 105, Tile.CharredBeam);

  // TERTIARY the floor. Ankle-high ash pans a boot goes through.
  b.set(57, 104, Tile.AshHeap);
  b.set(60, 106, Tile.AshHeap);
  // The walkable debris floor, daub and cracked hearthstone (ruling
  // Kit 1: CaveRubble is the rubble the kit has).
  b.set(56, 103, Tile.CaveRubble);
  b.set(57, 106, Tile.CaveRubble);
  b.set(60, 104, Tile.CaveRubble);
  // Weeds have the floor: a spring's growth up through the ash, three
  // tufts where the rain got in.
  b.set(55, 102, Tile.GrassTall);
  b.set(60, 103, Tile.GrassTall);
  b.set(58, 107, Tile.GrassTall);
  // The salvage the family loaded and never came back for, one tile
  // off the open face where the cart was backed to the door.
  b.set(63, 108, Tile.BelongingsCart);

  // SIGN: Wren raised it so wakers would stop asking her; her refusal
  // in wood. Twenty-five columns from the spawn, one outside the 1080p
  // eyeful, so the first frame holds the smoke and no board.
  ctx.sign(S.hobbs_cousins_roof.x, S.hobbs_cousins_roof.y, S.hobbs_cousins_roof.title, S.hobbs_cousins_roof.lines, S.hobbs_cousins_roof.tile);

  // ==================================================================
  // D2 THE MEADOW OAKS [BOX (26,100)-(42,125)].
  // ==================================================================
  // SENTENCE: two oaks older than the Ring's tending stand where the
  // meadow was never ploughed, and the eye needs them to measure the
  // emptiness west of the stones.
  ctx.box(26, 100, 42, 125, 'ring:D2 THE MEADOW OAKS');
  // Two oaks and no more: the edge woods' inland thinning would seed
  // three stray trees inside this box (one two tiles from the older
  // crown), and a measured emptiness cannot be scatter (CURATION 2).
  ctx.keepOut(26, 100, 42, 125, 'the meadow oaks: two crowns measure the emptiness');
  b.set(38, 104, Tile.TreeOak);
  b.set(30, 122, Tile.TreeOak);
  // Grass the scythe never reached under the older crown, and a second
  // stand where the ground holds water below the second.
  b.set(34, 110, Tile.GrassTall);
  b.set(28, 118, Tile.GrassTall);
  // Two beds of meadow flowers between the oaks, the only colour west
  // of the stones, and deferred so the thinning cannot take them.
  ctx.detail(36, 116, Detail.Flowers);
  ctx.detail(32, 106, Detail.Flowers);

  // ==================================================================
  // D2 THE SURVEY LINE [BOX (38,126)-(58,130)].
  // ==================================================================
  // SENTENCE: Steinar's Charter chain ran east across the west meadow
  // toward the stones in the spring and stopped where the village
  // stopped it; the stake nearest the Ring is down, and Wren, Halla and
  // Alder each know who did it and none says.
  ctx.box(38, 126, 58, 130, 'ring:D2 THE SURVEY LINE');
  ctx.keepOut(38, 126, 58, 130, 'the survey line');
  // PRIMARY two brass stakes ruled eight apart: a chain is ruled; that
  // is the point.
  b.set(40, 128, Tile.CharterPost);
  b.set(48, 128, Tile.CharterPost);
  // SECONDARY the fallen third: the stone it was footed in, and the
  // brass chips where it was knocked out (CairnFallen is a cairn's
  // posture, not a post's; kit.md #16).
  b.set(56, 128, Tile.Rock);
  ctx.detail(57, 128, Detail.Pebbles);
  ctx.detail(56, 129, Detail.Pebbles);
  // TERTIARY none: a chain leaves no path and the grass stays unbroken.

  // ==================================================================
  // D2 THE HEM'S DEAD OAK [BOX (7,104)-(15,111)].
  // ==================================================================
  // SENTENCE: the oak at the west hem died the winter the water table
  // dropped; Alder marked it and has not come, and it is the one grey
  // crown on the western green.
  ctx.box(7, 104, 15, 111, "ring:D2 THE HEM'S DEAD OAK");
  ctx.keepOut(7, 104, 15, 112, "the west hem's dead oak");
  // PRIMARY the grey crown (FADE_TALL; nothing south of it but meadow;
  // off every route).
  ctx.deadTree(11, 108);
  // TERTIARY the grass nobody cuts under a tree nobody fells.
  b.set(13, 111, Tile.GrassTall);
  b.set(8, 105, Tile.GrassTall);

  // ==================================================================
  // D1 PROOF — ring.ts changed no cell of the golden box.
  // ==================================================================
  const after = snapshotBox(ctx);
  for (let k = 0; k < after.ground.length; k++) {
    if (after.ground[k] !== before.ground[k] || after.detail[k] !== before.detail[k]) {
      const x = pins.RING_BOX.x0 + (k % pins.RING_BOX.w);
      const y = pins.RING_BOX.y0 + Math.floor(k / pins.RING_BOX.w);
      throw new Error(`dawnmead ring.ts: touched the golden Ring box at (${x},${y}); THE TUTORIAL IS SACRED`);
    }
  }
}

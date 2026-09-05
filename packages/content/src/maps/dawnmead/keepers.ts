/**
 * DAWNMEAD UNDER SIEGE (band 6) — keepers.ts [L2 WEST].
 *
 * D3 KEEPER'S WAY (86,94)-(106,116) minus the golden box: Wren's house
 * and garden verbatim, the parcels on her porch (ruling 6), THE HOUND
 * at the proving way's mouth, and the two lanterns the village keeps
 * lit on the cottage lane.
 *
 * Wren's house straddles the Ring box: its west and south walls, the
 * door, the porch row and the garden's hedge, skep and planter fall
 * inside (64,100)-(93,124) and are golden. This module re-authors the
 * whole house VERBATIM from the shipped build and then asserts every
 * tile it wrote inside the box equals pins.RING_BOX_GOLDEN, before the
 * stamp (J17, J19).
 *
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G10 Wren's step, G13 ginnel, G15 Hilde's way.
 * SIGNS IT QUEUES: THE KEEPER'S HOUSE (100,110) HangingSign.
 * KEEP_OUT it registers: [99,94,111,104] (the ginnel and Hilde's way).
 * CAST HOOKS: Wren post (92.5,110.5), her chair (91,109) staged from
 *   (91,110), her step (93,110) and night path (92,110)>(93,109)>(93,108)
 *   >...>(96,101) stay open; people.ts places the body.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates open; wear is never a rectangle; one Signpost per
 * eyeful. CONTENT BOUNDARY holds; no dashes in any player-facing string.
 */
import { Detail, Tile, herbBundlesDetail, sillHerbsDetail, trellisDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function keepers(ctx: DawnCtx): void {
  const { b, pins } = ctx;
  const S = pins.SIGN_LEDGER;
  const box = pins.RING_BOX;

  // Every cell this module writes, so the golden check below can
  // compare exactly what it authored and nothing the scatter owns.
  const touched = new Set<number>();
  const touch = (x: number, y: number): void => {
    touched.add(y * ctx.W + x);
  };
  const set = (x: number, y: number, t: Tile): void => {
    b.set(x, y, t);
    touch(x, y);
  };
  // Cells whose DETAIL this module authored (a rug, a mat, a hanging):
  // those are compared to the golden exactly; every other touched
  // cell may carry the meadow's own Flowers or Tuft in the golden
  // (the shipped Ring's authored flowers crowd the hedge's foot at
  // (86,105) and the scatter owns the grass), and nothing else.
  const touchedDetail = new Set<number>();
  const det = (x: number, y: number, d: Detail): void => {
    b.setDetail(x, y, d);
    touch(x, y);
    touchedDetail.add(y * ctx.W + x);
  };

  // ==================================================================
  // D3 WREN'S HOUSE — untouched as a home.
  // ==================================================================
  // SENTENCE: fifty years of keeping the Ring from this porch; nothing
  // here changes but the parcels.
  ctx.box(86, 96, 99, 99, "keepers:D3 WREN'S HOUSE north (the hedge's corner and the north wall)");
  ctx.box(94, 100, 101, 112, "keepers:D3 WREN'S HOUSE east (the house past the box, the porch, the parcels, the woodpile, the shingle)");
  ctx.keepOut(99, 94, 111, 104, "the ginnel and Hilde's way");

  // PRIMARY the house: timber walls on a board floor, the door south
  // onto her porch, a window each side of it and one on every other
  // face so the porch chair has the west light (verbatim).
  b.building(88, 98, 11, 11, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [
      { side: 's', at: 2 }, { side: 's', at: 8 },
      { side: 'w', at: 4 }, { side: 'e', at: 4 }, { side: 'n', at: 5 },
    ],
  });
  for (let y = 98; y <= 108; y++) for (let x = 88; x <= 98; x++) touch(x, y);
  ctx.door(93, 108);
  // The keeper's corner: the shelf, and the lectern where the letters
  // she never sent are stacked.
  set(89, 99, Tile.Bookshelf);
  set(90, 99, Tile.Lectern);
  // Two hangings on the north wall, the only colour she allows herself.
  det(91, 98, Detail.Tapestry);
  det(92, 98, Detail.Tapestry);
  // The knitting chair in the west light.
  set(89, 101, Tile.Chair);
  // The hearth on the west wall, and the bench beside it where a waker
  // is sat down and given tea before anything is explained.
  set(89, 104, Tile.Hearth);
  set(89, 106, Tile.Bench);
  // The table she eats at alone, two chairs because she was not always
  // alone.
  set(92, 102, Tile.Table);
  set(93, 102, Tile.Table);
  set(92, 103, Tile.Chair);
  set(93, 101, Tile.Chair);
  // The rug the table stands off, worn to the weave at the hearth side.
  det(92, 104, Detail.Rug);
  det(93, 104, Detail.Rug);
  // Her bed: head north, foot at (96,101), the night path's last tile
  // (PIN; stand (96,102)).
  set(96, 100, Tile.Bed);
  set(96, 101, Tile.Bed);
  // The cabinet at the bed's head, the basket stack by the east wall,
  // the round rug her feet find in the dark.
  set(97, 100, Tile.Cabinet);
  set(97, 103, Tile.BasketStack);
  det(95, 101, Detail.RugRound);
  // The doormat inside the door, the herb bundles on the west wall,
  // the trellis on the east, the sill herbs in the south window.
  det(93, 107, Detail.Doormat);
  det(88, 100, herbBundlesDetail(0));
  det(98, 100, trellisDetail(1));
  det(90, 108, sillHerbsDetail(0));

  // SECONDARY the porch, facing the stones: a deck the width of the
  // house between two posts.
  for (let x = 90; x <= 96; x++) set(x, 109, Tile.PorchDeck);
  set(90, 109, Tile.TimberPost);
  set(96, 109, Tile.TimberPost);
  // The porch chair where she knits and has seen every waker's first
  // step for fifty years (PIN sit (91,109), staged from (91,110)).
  set(91, 109, Tile.Chair);
  // The stool a waker is told to sit on while she looks at them.
  set(95, 109, Tile.WoodStool);
  // Wren's two flower boxes at the porch ends, kept (the green's boxes
  // are cut; hers are hers).
  set(89, 109, Tile.FlowerBox);
  set(97, 109, Tile.FlowerBox);
  // The worn step onto the lane (PIN; G10 laid it; re-set so the golden
  // check covers it).
  set(93, 110, Tile.Dirt);
  // The keeper's garden: a clipped hedge shelters the flower bed and
  // the bee skep against the west wall, fifty years of tending. The
  // run x86 y98..107 and the corner (86..87,97); (86,100..107), the
  // planter and the skep are golden.
  for (let y = 98; y <= 107; y++) set(86, y, Tile.Hedge);
  set(86, 97, Tile.Hedge);
  set(87, 97, Tile.Hedge);
  // Two beds of flowers inside the hedge, hers to cut for the porch.
  det(87, 100, Detail.Flowers);
  det(87, 105, Detail.Flowers);
  // The herb planter under the west window, the skep at the hedge's
  // south end where the bees work the Ring's flowers.
  set(87, 102, Tile.HerbPlanter);
  set(87, 107, Tile.Apiary);
  // The woodpile against the east wall, split by whichever waker is
  // told to.
  set(99, 106, Tile.Woodpile);

  // TERTIARY NEW: the tied parcels on the deck east of the door (ruling
  // 6): the letters going out with whoever walks east; none go west.
  // Never on (93,109) or the (92..94,110) approach.
  set(94, 109, Tile.TiedParcels);

  // SIGN: her shingle at the porch's east end, on open ground.
  ctx.sign(S.keepers_house.x, S.keepers_house.y, S.keepers_house.title, S.keepers_house.lines, S.keepers_house.tile);
  // Wren's post on the lane (people.ts places the body).
  ctx.post(92, 110);

  // THE GOLDEN CHECK (J17): every cell this module wrote inside the
  // Ring box equals pins.RING_BOX_GOLDEN, ground always, detail where
  // the scatter cannot have touched it (grass carries the RNG's
  // flowers and tufts; nothing else does).
  for (const i of touched) {
    const x = i % ctx.W;
    const y = Math.floor(i / ctx.W);
    if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue;
    const k = (y - box.y0) * box.w + (x - box.x0);
    const g = b.get(x, y);
    const gg = pins.RING_BOX_GOLDEN.ground[k];
    const grass = g === Tile.Grass || g === Tile.GrassTall;
    // A garden bed is grass now and may be the scatter's tall grass in
    // the golden; every other tile is compared exactly.
    const ok = grass ? gg === Tile.Grass || gg === Tile.GrassTall : g === gg;
    if (!ok) {
      throw new Error(`dawnmead keepers.ts: (${x},${y}) ground ${g} differs from the golden ${gg}; Wren's house is verbatim`);
    }
    if (grass) continue;
    const gd = pins.RING_BOX_GOLDEN.detail[k];
    if (touchedDetail.has(i)) {
      const d = b.getDetail(x, y);
      if (d !== gd) {
        throw new Error(`dawnmead keepers.ts: (${x},${y}) detail ${d} differs from the golden ${gd}; Wren's house is verbatim`);
      }
      continue;
    }
    // A cell this module wrote no detail on may carry the meadow's own
    // Flowers or Tuft in the golden (the shipped Ring's flowers at the
    // hedge's foot; the scatter's tufts) and never an authored decor.
    if (gd !== Detail.None && gd !== Detail.Flowers && gd !== Detail.Tuft) {
      throw new Error(`dawnmead keepers.ts: (${x},${y}) golden carries detail ${gd} this module never wrote; Wren's house is verbatim`);
    }
  }

  // ==================================================================
  // D3 THE HOUND [BOX (100,113)-(106,116)] + THE KEEPER'S LAMP.
  // ==================================================================
  // SENTENCE: the old wayshrine where the proving way leaves the lane,
  // worn smooth by hands going south to learn a weapon; it stood before
  // the Ring had seven stones.
  ctx.box(100, 113, 106, 116, 'keepers:D3 THE HOUND');
  // The shrine itself, two columns west of the proving way's x107.
  b.set(103, 115, Tile.WayShrine);
  // The pebbles at its foot, where the hands that rub it stand.
  ctx.detail(103, 116, Detail.Pebbles);
  // The stone bench beside it for whoever is not ready to go south yet.
  b.set(101, 115, Tile.StoneBench);
  // THE PROVING WAY board (105,115) is CUT (J16): the hound needs no
  // words and the DAWNMEAD post owns this eyeful.

  // SENTENCE: the keeper's lamp on the lane's north verge, the third of
  // the cadence that marches east from the Ring's pair (S2).
  ctx.box(102, 108, 106, 112, "keepers:D3 THE KEEPER'S LAMP");
  b.set(105, 109, Tile.LampPost);

  // ==================================================================
  // D3 THE LANE'S LANTERNS [BOXES (87,94)-(89,95), (102,94)-(103,96)].
  // ==================================================================
  // SENTENCE: the two lanterns the village keeps lit on the cottage
  // lane, one where the walk bends between the roofs and one at the
  // ginnel's head, because the crofters come home up it in the dark.
  // (The shipped (95,92) and (107,92) stood where a wall and a rail now
  // stand.) Neither is on a door column.
  ctx.box(87, 94, 89, 95, "keepers:D3 THE LANE'S LANTERNS west");
  b.set(88, 94, Tile.StreetLantern);
  ctx.box(102, 94, 103, 96, "keepers:D3 THE LANE'S LANTERNS east");
  b.set(102, 95, Tile.StreetLantern);
}

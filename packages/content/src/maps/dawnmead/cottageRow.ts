/**
 * DAWNMEAD UNDER SIEGE (band 6) — cottageRow.ts [L3 NORTH].
 *
 * D6 COTTAGE ROW (76,83)-(107,93): two roofs where the village once
 * had three. Hilde's green cottage slid west (J3) so the orchard walk
 * could bend between the roofs; the crowded roof stepped east of the
 * walk and leans its borrowed pen on the inn's side; the third roof
 * was the cousin's and he built on the meadow, which is now the burnt
 * cottage (J1, ring.ts). Margit boards with Hilde (J2, ruling 5).
 *
 * SCENES / BOXES: THE RETURNER'S HOUSE (76,83)-(87,92); THE CROWDED
 * ROOF + pen (88,84)-(107,93); THE EMPTY WEST END (72,86)-(75,92).
 * GROUND (L1): G11 cottage lane + steps + yard ellipse; G12 the walk's
 * bend between the roofs. This module lays ONLY the pen's own interior
 * Dirt and its gate mouth (104..106,86..89) + (105,90), inside its box.
 * SIGNS: none (THE COMMON's board stands six rows north of the roof).
 * NOT PLACED: the lane's StreetLanterns (keepers.ts's pair, §3 D3).
 * CAST HOOKS (people.ts places the bodies): Hilde post (83.5,91.5) +
 * bed foot (80,85); Margit's bed foot (83,85); crofter B post
 * (105.5,91.5) at the pen gap (105,90); three crofter bed feet (95,87)
 * (97,87) (99,87); the pen sheep (105.5,87.5) r1 n2.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands for every lie; gates authored open (the pen's gate is a gap,
 * ruling 14); wear is never a rectangle; one Signpost per eyeful.
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function cottageRow(ctx: DawnCtx): void {
  const { b } = ctx;

  // ================================================================
  // THE RETURNER'S HOUSE (Hilde and Margit, the green cottage)
  // ================================================================
  // SENTENCE: Hilde came out of the stones twenty-two years ago and
  // married into this roof; she pays the oil subscription for lamps on
  // the old road and has not lit the one at her own door; the hedge
  // has not been clipped since; and this spring the Charter's clerk
  // sleeps in the second bed because Gilly would not take a chit and
  // Hilde would.
  ctx.box(76, 83, 87, 92, "cottageRow: the Returner's house");

  // The green cottage itself: eight by eight, the door facing the lane
  // (83,90), a window either side of the morning and one on the lane.
  b.building(79, 83, 8, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 4 }],
    windows: [{ side: 's', at: 2 }, { side: 'w', at: 3 }, { side: 'e', at: 5 }],
  });
  ctx.door(83, 90);
  // Hilde's bed, head north on the west wall: the one she has slept in
  // for twenty-two years (lie (80,85), stand (80,86)).
  b.set(80, 84, Tile.Bed).set(80, 85, Tile.Bed);
  // Margit's bed, head north, three planks east of Hilde's: the
  // Charter's clerk under a Returner's roof, because Gilly refused the
  // chit and Hilde took it (lie (83,85), stand (83,86); ruling 5).
  b.set(83, 84, Tile.Bed).set(83, 85, Tile.Bed);
  // The lectern between the two beds: Hilde's oil slate, the lamps she
  // pays for on the old road, tallied each night before she lies down.
  b.set(81, 84, Tile.Lectern);
  // The cabinet in the north-east corner: her plates and the marriage
  // linen, and lately Margit's ledgers on the top shelf.
  b.set(85, 84, Tile.Cabinet);
  // The hearth on the east wall: lit every evening; the one fire in
  // this house that is.
  b.set(85, 86, Tile.Hearth);
  // The table and its one chair: two women eat here now and neither
  // has said so out loud; the second chair is the bed's edge.
  b.set(81, 87, Tile.Table).set(82, 87, Tile.Chair);
  // Baskets by the door wall: the market comes home in them.
  b.set(85, 88, Tile.BasketStack);
  // The round rug on the floor between hearth and door: the one soft
  // thing in a Returner's house.
  b.setDetail(84, 88, Detail.RugRound);
  // The doormat inside the door: the lane's mud stops here.
  b.setDetail(83, 89, Detail.Doormat);
  // The unclipped hedge on the west side: nobody has taken shears to it
  // since the spring, and grass stands at its foot where the clippings
  // used to fall (no unclipped posture exists; the honest read).
  for (let y = 84; y <= 89; y++) b.set(77, y, Tile.Hedge);
  ctx.detail(78, 86, Detail.Tuft);
  ctx.detail(78, 88, Detail.Tuft);
  b.set(77, 90, Tile.GrassTall).set(78, 90, Tile.GrassTall);
  // The herb planter outside the east wall, gone to seed: the kitchen
  // herbs she stopped tending when the lamps started going out.
  b.set(87, 85, Tile.HerbPlanter);
  // The unlit pit lamp one tile EAST of her door column, never south
  // of the door (ruling Kit 9): she pays for every lamp on the old
  // road and this one at her own step stays dark. It paints the wall
  // east of the door, never the door itself.
  b.set(84, 91, Tile.PitLampDark);
  ctx.occluder(84, 91);
  // Hilde's post: her own step, slate in hand, facing the lane.
  ctx.post(83, 91);

  // ================================================================
  // THE CROWDED ROOF (the worn cottage)
  // ================================================================
  // SENTENCE: two drowned-out families under one roof the village lent
  // them in the spring; the sheep they walked in with live in a pen with
  // no gate because the rails were borrowed too; the pen leans on the
  // east gable because that was the only wall they were allowed to
  // lean on.
  ctx.box(88, 84, 107, 93, 'cottageRow: the crowded roof');

  // The worn cottage: the same eight by eight as Hilde's, the door on
  // the lane (98,92), the yard ellipse worn in front of it.
  b.building(94, 85, 8, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 4 }],
    windows: [{ side: 's', at: 2 }, { side: 'w', at: 3 }, { side: 'e', at: 5 }],
  });
  ctx.door(98, 92);
  // Three beds along the north wall, head north, a plank between each:
  // the crofters lie in them at night (feet (95,87) (97,87) (99,87);
  // stands (95,88) (97,88) (99,88)). Three families, three beds, and
  // the children sleep across the feet.
  b.set(95, 86, Tile.Bed).set(95, 87, Tile.Bed);
  b.set(97, 86, Tile.Bed).set(97, 87, Tile.Bed);
  b.set(99, 86, Tile.Bed).set(99, 87, Tile.Bed);
  // The hearth in the south-east corner: one fire for three pots.
  b.set(100, 89, Tile.Hearth);
  // The table and the one stool: the rest sit on the beds.
  b.set(96, 90, Tile.Table).set(95, 90, Tile.WoodStool);
  // A crate inside the door: what they carried in that has not found
  // a shelf, because there are no shelves.
  b.set(100, 91, Tile.Crate);
  // Baskets by the west wall: the day's gleaning from the Common's
  // hedgerows.
  b.set(95, 91, Tile.BasketStack);
  // The doormat: the village lent the roof; somebody lent the mat.
  b.setDetail(98, 91, Detail.Doormat);

  // The borrowed pen on the east gable: RailWood on three sides and the
  // gable for the fourth, the ONE-tile gap (105,90) its only gate
  // (ruling 14), because the rails were borrowed and a gate was not.
  // Its floor is the pen's own trodden Dirt and the gate mouth is worn
  // the same (laid here, inside this box; the brief's D6 ground).
  for (let y = 86; y <= 89; y++) for (let x = 104; x <= 106; x++) b.set(x, y, Tile.Dirt);
  b.set(105, 90, Tile.Dirt);
  ctx.pen(103, 85, 5, 6, { rail: Tile.RailWood, gaps: [{ side: 's', at: 2 }] });
  // The trough in the one-wide strip between gable and rail: the two
  // ewes drink where the roof's rain runs off.
  b.set(102, 88, Tile.WaterTrough);
  // Straw in the pen: bedding for two sheep that are the whole of three
  // families' wealth.
  ctx.detail(105, 87, Detail.Straw);
  ctx.detail(104, 89, Detail.Straw);
  // Crofter B's post at the gap's mouth, facing the ewes.
  ctx.post(105, 91);

  // The belongings cart backed to the west gable: the cart they came in,
  // still loaded, because unloading it would mean staying.
  b.set(92, 89, Tile.BelongingsCart);
  // The drying rack at the south-east corner: sacking and blankets
  // drying, the smell of the fen still in them.
  b.set(102, 91, Tile.DryingRack);

  // NOT PLACED HERE: the lane's two lanterns. They are keepers.ts's
  // (brief §3 D3 THE LANE'S LANTERNS, (88,94) at the walk's bend and
  // (102,95) at the ginnel's head); the shipped pair (95,92) (107,92)
  // stood where the roof and the pen now stand, and a lane of thirty
  // tiles carries two lanterns, not four. The sentence still holds from
  // Hilde's step: the lane is lit and her own lamp is not, and both are
  // visible from the same tile.

  // ================================================================
  // THE EMPTY WEST END
  // ================================================================
  // SENTENCE: west of Hilde's hedge the Row never grew a third roof;
  // the cousin built on the meadow instead, and the grass between the
  // hedge (x77) and the walk's bend is the composed emptiness the eye
  // rests on before the burnt cottage.
  ctx.box(72, 86, 75, 92, 'cottageRow: the empty west end');
  // Two stands of long grass where a third roof's footings never went
  // in: the only tall thing on this end of the Row.
  b.set(75, 88, Tile.GrassTall);
  b.set(73, 92, Tile.GrassTall);
}

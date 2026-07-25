import { Detail, Tile } from '@devcraft/shared';
import { COTTAGE_SMALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Dawnmead — the awakening village. 96x64 tiles due west of
 * Bramblewick, joined to it by the hedgerow lane: the lane's rows sit
 * at world y 47-49 so it meets Bramblewick's west road head-on at the
 * zone seam (world x 0).
 *
 * New characters wake inside the Waking Ring at the west end — a
 * moss-grown circle of standing stones the village has tended for
 * generations — and the whole village unfolds eastward from that
 * first step: the green, the elder, the farmstead, the berry brook,
 * and finally the lane east toward the wider world. Death respawn
 * stays in Bramblewick; only brand-new souls arrive here.
 *
 * Anchors that must NOT move (server/NPC/dialogue dependencies): the
 * spawn inside the ring, the lane rows 31-33, the campfire + workbench
 * stations, the rat shed + its traveller's chest, the pens and their
 * gates, and every actor post (routine offsets hang off them).
 */
export function buildDawnmead(): ZoneDef {
  const b = new ZoneBuilder('dawnmead', 'Dawnmead', { x: -96, y: 16 }, 96, 64, Tile.Grass);

  // The hedgerow lane: one honest road, west green to the east edge,
  // where it becomes Bramblewick's west road (world y 47-49).
  b.path({ x: 10, y: 32 }, { x: 95, y: 32 }, 3);

  // ---------------------------------------------------------------
  // The Waking Ring — the arrival. A stone-floored circle inside five
  // weathered standing stones, flowers crowding the cracks. The lane
  // begins at its lip; the spawn sits at its heart.
  // ---------------------------------------------------------------
  b.fillEllipse(14, 32, 4, 3, Tile.StoneFloor);
  b.set(14, 28, Tile.Rock);
  b.set(10, 30, Tile.Rock);
  b.set(18, 29, Tile.Rock);
  b.set(10, 35, Tile.Rock);
  b.set(17, 36, Tile.Rock);
  b.setDetail(12, 29, Detail.Flowers).setDetail(16, 35, Detail.Flowers);
  b.setDetail(11, 33, Detail.Flowers).setDetail(15, 29, Detail.Flowers);
  b.setDetail(13, 36, Detail.Flowers).setDetail(18, 33, Detail.Flowers);

  // ---------------------------------------------------------------
  // The village green — benches, the well, and lamplight around the
  // lane. Everything a waker needs stands within one gaze of it.
  // ---------------------------------------------------------------
  b.set(33, 27, Tile.WallStone).set(34, 27, Tile.WallStone); // the well
  b.set(33, 28, Tile.WallStone).set(34, 28, Tile.WallStone);
  b.set(26, 35, Tile.Bench).set(27, 35, Tile.Bench);
  b.set(22, 30, Tile.LampPost);
  b.set(36, 30, Tile.LampPost);
  b.set(22, 35, Tile.LampPost);
  b.set(36, 35, Tile.LampPost);
  b.set(56, 30, Tile.BannerPole); // the east gate of the green, such as it is

  // Elder Rowan's cottage, north of the green, door opening south onto
  // a short path down to the lane.
  b.stamp(COTTAGE_SMALL, 26, 20);
  b.path({ x: 29, y: 26 }, { x: 29, y: 30 }, 1);
  b.set(27, 26, Tile.FlowerBox).set(31, 26, Tile.FlowerBox);

  // The hearth-house — Iona's cottage south of the green, door re-cut
  // north to face it, with the village campfire and a table setting on
  // the grass outside: the closest thing Dawnmead has to an inn.
  b.stamp(COTTAGE_SMALL, 26, 38, { flipX: true });
  recutCottageDoorNorth(b, 26, 38);
  // Boxes west of the door only — Iona's walk home from the fire
  // comes in from the east and the lane past the door stays clear.
  b.set(27, 37, Tile.FlowerBox).set(28, 37, Tile.FlowerBox);
  b.set(34, 36, Tile.Campfire);
  b.set(37, 38, Tile.Table);
  b.set(36, 38, Tile.Chair).set(38, 38, Tile.Chair);

  // The tinker's bench — Fen's open-air workshop on the green's east
  // shoulder: the workbench station, sawdust, and honest clutter.
  b.set(40, 35, Tile.Workbench);
  b.set(39, 36, Tile.Barrel);
  b.set(41, 36, Tile.Crate);
  b.setDetail(40, 36, Detail.Sawdust).setDetail(41, 35, Detail.Sawdust);

  // ---------------------------------------------------------------
  // The farmstead — Hobb's house, the chicken coop, and the cow
  // pasture, laid so the farmhand's rounds run on straight open legs
  // (coop gate faces EAST, pasture gate faces WEST — the corridor
  // between them at x 34-35 is Hobb's whole commute).
  // ---------------------------------------------------------------
  b.building(36, 18, 8, 6, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 3 }],
    windows: [{ side: 's', at: 1 }, { side: 's', at: 6 }, { side: 'n', at: 3 }],
  });
  b.set(37, 19, Tile.Bed).set(42, 19, Tile.Bed); // Hobb's, and Pip's
  b.set(41, 19, Tile.Cabinet);
  // The chicken coop: fenced dirt, straw bedding, gate on the east.
  b.fillRect(27, 14, 6, 4, Tile.Dirt);
  b.outlineRect(26, 13, 8, 6, Tile.Fence);
  b.set(33, 16, Tile.Dirt); // gate
  b.setDetail(28, 15, Detail.Straw).setDetail(30, 16, Detail.Straw);
  b.setDetail(31, 14, Detail.Straw);
  // The cow pasture: grass kept, trough by the north rail, west gate.
  b.outlineRect(45, 14, 12, 9, Tile.Fence);
  b.set(45, 18, Tile.Grass); // gate
  b.set(50, 15, Tile.Basin);
  b.setDetail(47, 16, Detail.Straw).setDetail(53, 19, Detail.Straw);

  // ---------------------------------------------------------------
  // The warden's lodge — Bryn's stone watch-house on a dirt yard south
  // of the ring, hung with the village's few arms.
  // ---------------------------------------------------------------
  b.fillRect(14, 38, 12, 9, Tile.Dirt);
  b.building(16, 40, 6, 5, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 2 }],
    windows: [{ side: 's', at: 2 }],
  });
  // Racks on the yard's north hem — Bryn's walk to the lodge door and
  // his dusk patrol both thread the yard on clear lines.
  b.set(23, 38, Tile.WeaponRack);
  b.set(25, 38, Tile.ToolRack);
  b.set(17, 41, Tile.Bed).set(20, 41, Tile.Bed); // the warden's, and a spare
  b.set(14, 39, Tile.Barrel);
  b.set(15, 46, Tile.Crate);
  b.set(24, 45, Tile.Bench);

  // ---------------------------------------------------------------
  // The berry brook — down from the north woods, under the lane
  // bridge, past the berry banks, over the wading ford, and out the
  // south hem. Shallows line every reach so nothing ever traps a
  // waker on the wrong bank.
  // ---------------------------------------------------------------
  for (let y = 0; y < 64; y++) {
    const cx = 60 + Math.round(Math.sin(y * 0.16) * 1.6);
    b.set(cx - 1, y, Tile.WaterShallow);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.WaterShallow);
  }
  // The lane bridge: a raised plank deck carrying rows 31-33.
  for (let y = 31; y <= 33; y++) {
    const cx = 60 + Math.round(Math.sin(y * 0.16) * 1.6);
    for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, Tile.Bridge);
  }
  // The ford: knee-deep the whole way across, the honest shortcut to
  // the old shed.
  for (let y = 43; y <= 45; y++) {
    const cx = 60 + Math.round(Math.sin(y * 0.16) * 1.6);
    b.set(cx, y, Tile.WaterShallow);
  }
  b.set(58, 26, Tile.FishingSpot);
  b.set(61, 50, Tile.FishingSpot);
  // Berry banks on the village side — the foraging lesson grows here —
  // with fibre and sageroot tucked among them.
  b.set(55, 38, Tile.BerryBush);
  b.set(56, 40, Tile.BerryBush);
  b.set(54, 42, Tile.BerryBush);
  b.set(56, 43, Tile.BerryBush);
  b.set(55, 45, Tile.BerryBush);
  b.set(56, 26, Tile.BerryBush);
  b.set(53, 39, Tile.FibrePlant);
  b.set(52, 44, Tile.FibrePlant);
  b.set(53, 25, Tile.WildSagewort);
  b.set(54, 46, Tile.WildSagewort);

  // ---------------------------------------------------------------
  // The old shed — across the ford, half given back to the weather,
  // where the rats moved in. Bryn's first errand for every waker, and
  // the village traveller's chest waits inside for whoever clears it.
  // ---------------------------------------------------------------
  b.fillRect(65, 47, 5, 4, Tile.Dirt);
  b.outlineRect(64, 46, 7, 6, Tile.WallWood);
  b.set(67, 46, Tile.DoorwayWood);
  b.set(64, 49, Tile.Grass); // the west wall sags open
  b.set(70, 48, Tile.Grass); // and the east one too
  b.set(66, 51, Tile.Grass); // the south corner went first
  b.set(65, 50, Tile.Crate);
  b.set(69, 47, Tile.Barrel);
  b.set(68, 50, Tile.ChestWood);
  b.setDetail(66, 48, Detail.Straw).setDetail(68, 47, Detail.Straw);
  b.setDetail(65, 49, Detail.Straw);
  // The dirt trail from the ford to the shed door.
  b.set(62, 44, Tile.Dirt);
  b.set(63, 44, Tile.Dirt);
  b.set(64, 44, Tile.Dirt);
  b.set(65, 45, Tile.Dirt);
  b.set(66, 45, Tile.Dirt);
  b.set(67, 45, Tile.Dirt);

  // ---------------------------------------------------------------
  // The orchard rows north of the lane, east of the brook — planted
  // lines, not wild wood, so the eye reads tended land.
  // ---------------------------------------------------------------
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      b.set(67 + col * 3 + (row % 2), 20 + row * 3, Tile.Tree);
    }
  }

  // The lane east: a shingle sign where the village lets go of you,
  // and lamps so the walk to Bramblewick never feels like leaving
  // safety, because it isn't.
  b.set(65, 30, Tile.HangingSign);
  b.set(78, 30, Tile.LampPost);
  b.set(88, 34, Tile.LampPost);

  // Meadow life.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.04);
  b.scatterDetail(Detail.Tuft, 0.06);

  // Edge woods (hand-placed feel: dense at the rim, thinning inward),
  // keeping the lane shoulders and the ford approach open.
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 96; x++) {
      const t = b.get(x, y);
      if (t !== Tile.Grass && t !== Tile.GrassTall) continue;
      if (Math.abs(y - 32) <= 4) continue; // the lane breathes
      if (x >= 56 && x <= 71 && y >= 42 && y <= 47) continue; // the ford path
      if (x >= 8 && x <= 58 && y >= 11 && y <= 48) continue; // the village core is tended land
      const edge = Math.min(x, y, 95 - x, 63 - y);
      const density = edge < 4 ? 0.35 : edge < 9 ? 0.12 : 0.012;
      if (meadRng(x, y) < density) b.set(x, y, Tile.Tree);
    }
  }
  // A pair of old oaks shading the green's south-west shoulder.
  b.set(20, 37, Tile.TreeOak);
  b.set(24, 39, Tile.TreeOak);

  // ---------------------------------------------------------------
  // The animals: penned hens and cows, and the shed rats — the
  // village's whole syllabus of first combat and first produce.
  // ---------------------------------------------------------------
  b.npcSpawn('chicken', 29.5, 15.5, 1.7, 4);
  b.npcSpawn('cow', 50.5, 18.5, 2.4, 2);
  b.npcSpawn('rat', 67, 48.5, 2, 3);

  // ---------------------------------------------------------------
  // The villagers — six lives, each keeping the hours of a routine
  // whose coordinates hang off these posts (the post-is-the-origin
  // law: move a post, and the life moves with it).
  // ---------------------------------------------------------------
  // Rowan waits beside the ring for wakers, and has for forty years.
  b.actor('elder_rowan', 19.5, 30.5, Math.PI, 'rowan_hours');
  // Bryn keeps the yard, walks the green at first light and dusk.
  b.actor('warden_bryn', 23.5, 43.5, -Math.PI / 2, 'warden_rounds');
  // Iona owns the campfire the way captains own ships.
  b.actor('hearthkeeper_iona', 33.5, 37.6, -Math.PI / 2, 'hearth_hours');
  // Hobb's whole day is the corridor between coop and pasture.
  b.actor('farmer_hobb', 34.5, 20.5, -Math.PI / 2, 'dawnmead_farmhand');
  // Fen taps away at the bench and lunches at Iona's fire.
  b.actor('tinker_fen', 40.5, 34.3, Math.PI / 2, 'tinker_hours');
  // Pip orbits the green at a dead run until bedtime.
  b.actor('young_pip', 28.5, 33.5, 0, 'green_scamp');

  b.spawn(14.5, 32.5);
  return b.build();
}

/**
 * The cottage template's door is on the south face and templates never
 * rotate, so a cottage fronting the village from the south gets its
 * door re-cut north (the Bramblewick precedent): north wall opened,
 * south doorway healed to a window, doormat moved inside the new door.
 */
function recutCottageDoorNorth(b: ZoneBuilder, x: number, y: number): void {
  b.set(x + 3, y, Tile.DoorwayWood);
  b.set(x + 3, y + 5, Tile.WallWoodWindow);
  b.setDetail(x + 3, y + 4, Detail.None);
  b.setDetail(x + 3, y + 1, Detail.Doormat);
}

/** Stable per-tile randomness so the village is identical every boot. */
function meadRng(x: number, y: number): number {
  let h = (x * 668265263 + y * 374761393) ^ 0x2f61a3b7;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

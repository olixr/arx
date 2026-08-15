import { Detail, Tile } from '@arx/shared';
import { EVENFALL_RECT } from '../geography.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * Evenfall — the city of the old folk in the Everwood. Level 35-50
 * country: the sixth haven's relief grades the hem and everything
 * past the waystones is honestly tier 4-5. The first non-human town
 * in the Dawnlands, and the first with NO CURTAIN WALL: the wood is
 * the wall, the Evenguard are the gate, and the difference between
 * "outside" and "inside" is a pair of waystones and how carefully
 * you are being watched.
 *
 * THE CITY EXISTS BECAUSE IT ALWAYS DID. The old folk kept this city
 * before the roads were roads; the ones who went east raised the old
 * realm and thinned into its bloodlines, and when the mountain woke
 * a hundred and fifty years ago the whole ones walked home and shut
 * the gate. It is open now because the Evenking decided it should
 * be, and not everyone under the boughs thinks he is right.
 *
 * THE ONE IMAGE: THE EVENHALL BETWEEN THE TWIN FALLS. The spring
 * rises on the high terrace, splits around the king's hall, and goes
 * down the city in two white curtains — the Moonstair, because on a
 * clear night the moon walks down it step by step. From the gate
 * court the whole ascent reads in one look: mere, stair, falls,
 * hall, flame.
 *
 * THE TOWN-PLAN LAW (Amberford's, kept whole, worn silver): streets
 * first — the Evenway Avenue runs gate to stair court, the Gallery
 * crosses the Fair Court, the shore walk rings the mere — every
 * building fronts one, >= 3 open tiles between structures, and the
 * groves keep the GROVE APRON (trees >= 2 off every wall and walk).
 * A DIAGONAL BUDGET OF TWO: the Evenhall's south prow shoulders,
 * nothing else — elven work bows, it does not chamfer. ROOM INTENT:
 * one job per room, furniture proves it, and the furniture is the
 * FAIR HOUSE kit end to end: this city is what those twenty-five
 * props were made for.
 *
 * THE TERRACES. Three, climbing north-west: L1 the Fair Court (the
 * artisan terrace), L2 the Moonwell Court (the civic crescent), L3
 * the Evenhall (the king's ground). The Moonstair's dry twin — the
 * three stair flights — climbs south-face by south-face, each flight
 * offset west, so the ascent zigzags up the city the way the falls
 * zigzag down it.
 *
 * THE WATERS. The spring pool on L3; the twin races south around the
 * hall; a fall at every lip (feed row above, foot-water below — the
 * Silverfall law); the outflows converge on the meadow and feed THE
 * EVENMERE, the city's dark mirror, which sinks into reed marsh well
 * inside the south hem (the Amberford reed-sink law: no water at a
 * border, no procgen seam).
 *
 * THE LIMITS (a town is not an end-all): no farm, no fold, no
 * stable, no sawpit, no bulk forge, no chapel. The bank is small.
 * The wood provides, and what the wood does not provide, Evenfall
 * courteously does without. There is NO Low Hall door here and never
 * will be: the Company's camps on the hem keep getting taken apart
 * by morning, politely.
 *
 * Anchors that must NOT move (the people pass hangs routines off
 * them): every door, every bed, the Moonwell, the Everflame, the
 * spring pool rim, the gate arch, the north wicket, the stair
 * flights, the Gallery rows, the mere shore walk. The Evenway lands
 * at world (-601,-176) = local (159,56); the Heartwood Walk leaves
 * at world (-744,-232) = local (16,0).
 *
 * THE PEOPLE (cast by the people pass; every room keeps its promised
 * name): Aldaren the Evenking (the Evenhall), Sylwen the Warden (the
 * Warden's Roost), Keeper Ilvane (the flame), Loresinger Maelis (the
 * Songhouse), Aewyn the bowyer (the Bowyer's House), Myrren the
 * weaver (the Silk Hall), Selorne of the glass (the Moonglass Hall),
 * Faelar at the forge (the Mithril Forge), Inscriber Vessa (the
 * Inscriber's House), Elarin of the Outward House, Corwen the
 * provisioner (the gate court), Sentinel Serel (the Evengate), and
 * the Evenguard on the walks.
 */
export function buildEvenfall(): ZoneDef {
  const R = EVENFALL_RECT;
  const b = new ZoneBuilder('evenfall', 'Evenfall', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE TERRACES FIRST — nested raises, rims kept bare for the
  // auto-fence (nothing but fenceable ground on a rim, ever).
  // ---------------------------------------------------------------
  b.raise(6, 16, 90, 80, 1); // L1 x6..95, y16..95 — the Fair Court
  b.raise(10, 26, 62, 54, 2); // L2 x10..71, y26..79 — the Moonwell Court
  b.raise(14, 30, 34, 26, 3); // L3 x14..47, y30..55 — the Evenhall

  // THE MOONSTAIR'S DRY TWIN: three south-facing flights, each offset
  // west of the one below, so the climb zigzags. 7 ramps per flight.
  for (let x = 78; x <= 84; x++) b.stairs(x, 95); // L0 -> L1
  for (let x = 56; x <= 62; x++) b.stairs(x, 79); // L1 -> L2
  for (let x = 28; x <= 34; x++) b.stairs(x, 55); // L2 -> L3

  // ---------------------------------------------------------------
  // THE WATERS — spring, twin races, falls at every lip, the mere.
  // ---------------------------------------------------------------
  // The spring pool on L3, north of the hall: shallow rim, clear
  // heart. The pool the city drinks from and the falls are born in.
  b.fillRect(26, 31, 10, 3, Tile.WaterShallow);
  b.fillRect(28, 32, 6, 2, Tile.Water);
  // Splitter channels west and east to the race heads.
  b.fillRect(20, 33, 6, 1, Tile.WaterShallow);
  b.fillRect(36, 33, 6, 1, Tile.WaterShallow);
  // The twin races south around the hall (x18-19 west, x42-43 east).
  // Each stops a row short of the feed row; the rim itself stays
  // fenceable and the curtain draws itself (waterfalls.ts).
  b.fillRect(18, 33, 2, 20, Tile.Water); // y33..52
  b.fillRect(42, 33, 2, 20, Tile.Water);
  b.fillRect(18, 53, 2, 1, Tile.WaterShallow); // the lip shallows
  b.fillRect(42, 53, 2, 1, Tile.WaterShallow);
  // (y54 = open feed row, y55 = the L3 rim — both stay ground.)
  // Foot-water on L2 below each fall, then the races run on.
  b.fillRect(17, 56, 4, 2, Tile.WaterShallow); // west plunge
  b.fillRect(41, 56, 4, 2, Tile.WaterShallow); // east plunge
  b.fillRect(18, 58, 2, 19, Tile.Water); // y58..76
  b.fillRect(42, 58, 2, 19, Tile.Water);
  b.fillRect(18, 77, 2, 1, Tile.WaterShallow);
  b.fillRect(42, 77, 2, 1, Tile.WaterShallow);
  // (y78 feed row, y79 the L2 rim.)
  b.fillRect(17, 80, 4, 2, Tile.WaterShallow); // L1 plunges
  b.fillRect(41, 80, 4, 2, Tile.WaterShallow);
  b.fillRect(18, 82, 2, 11, Tile.Water); // y82..92
  b.fillRect(42, 82, 2, 11, Tile.Water);
  b.fillRect(18, 93, 2, 1, Tile.WaterShallow);
  b.fillRect(42, 93, 2, 1, Tile.WaterShallow);
  // (y94 feed row, y95 the L1 rim.)
  b.fillRect(17, 96, 4, 2, Tile.WaterShallow); // the meadow plunges
  b.fillRect(41, 96, 4, 2, Tile.WaterShallow);
  // The outflows bend south then east: one stream, meandering, to
  // the mere's west lobe — kept south of the stair court so the
  // ascent stays dry-shod. The meander paints its own step tiles so
  // the water never breaks (a stream with holes is a puddle chain).
  b.fillRect(18, 98, 2, 4, Tile.Water); // west outflow drops
  b.fillRect(42, 98, 2, 4, Tile.Water);
  b.fillRect(20, 101, 24, 2, Tile.Water); // join west->east
  b.fillRect(20, 100, 24, 1, Tile.WaterShallow);
  b.fillRect(20, 103, 24, 1, Tile.WaterShallow);
  // The east reach: biased a row south so the stair court's hem
  // stays dry, seeded from the join so the first bend is watertight,
  // and run all the way into the reed marsh (a stream that dead-ends
  // in a meadow is a puddle with ambitions).
  let streamY = 102;
  for (let x = 44; x <= 109; x++) {
    const want = 102 + Math.round(Math.sin(x * 0.16) * 1.2);
    if (want > streamY) streamY++;
    else if (want < streamY) streamY--;
    b.set(x, streamY, Tile.Water);
    b.set(x, streamY + 1, Tile.Water);
    b.set(x, streamY - 1, Tile.WaterShallow);
    b.set(x, streamY + 2, Tile.WaterShallow);
  }
  // THE EVENMERE — the city's dark mirror: shallow rim, deep heart.
  b.fillEllipse(118, 84, 18, 11, Tile.WaterShallow);
  b.fillEllipse(118, 84, 15, 9, Tile.Water);
  b.fillEllipse(118, 84, 9, 5, Tile.WaterDeep);
  // The fishing the mere owes the band: salmon in the moving water,
  // the glimmer shoal over the deep.
  b.set(104, 80, Tile.FishingSpot);
  b.set(130, 90, Tile.FishingSpot);
  b.set(110, 88, Tile.SalmonRun);
  b.set(118, 84, Tile.GlimmerShoal);
  // The reed sink: the mere spends itself in marsh well inside the
  // south hem. No water touches a border.
  b.fillRect(112, 95, 12, 3, Tile.WaterShallow);
  b.fillRect(110, 98, 16, 4, Tile.Swamp);
  b.fillRect(114, 102, 8, 3, Tile.Swamp);
  b.set(112, 100, Tile.FibrePlant).set(121, 101, Tile.FibrePlant);
  b.set(116, 103, Tile.FibrePlant).set(124, 99, Tile.FibrePlant);

  // ---------------------------------------------------------------
  // THE STREETS — the avenue, the cliff-foot walks, the courts.
  // Paths first (the town-plan law); buildings front them.
  // ---------------------------------------------------------------
  // The Evenway Avenue: the gate to the cliff-foot, three wide.
  b.path({ x: 158, y: 56 }, { x: 98, y: 56 }, 3);
  // The cliff-foot walk: south along the L1 east face to the stair
  // court (x96..98, one tile of gutter kept against the fence).
  b.path({ x: 97, y: 56 }, { x: 97, y: 97 }, 3);
  // The stair court: the dry ground under the first flight, between
  // the falls' outflows and the mere.
  b.fillRect(74, 96, 20, 4, Tile.StoneFloor);
  // The wicket walk: the Heartwood Walk's city end — north border at
  // local (16,0), along the L1 north cliff foot, east to the avenue
  // country (the walk skirts the city's high hem; the wood does not
  // pave, so the city paves only its own half).
  b.fillRect(15, 0, 3, 2, Tile.Dirt);
  b.path({ x: 16, y: 2 }, { x: 16, y: 13 }, 2, Tile.Dirt);
  b.path({ x: 16, y: 13 }, { x: 97, y: 13 }, 2, Tile.Dirt);
  b.path({ x: 97, y: 13 }, { x: 97, y: 55 }, 3);
  // The gate court: organic stone ground, not a stamped plaza.
  b.fillRect(140, 50, 16, 13, Tile.StoneFloor);
  b.fillRect(138, 53, 2, 7, Tile.StoneFloor);
  b.fillRect(156, 53, 3, 7, Tile.StoneFloor);
  // The mere shore walk: fountain court on the north-west shore.
  b.path({ x: 100, y: 58 }, { x: 108, y: 68 }, 2);
  b.fillRect(102, 68, 9, 6, Tile.StoneFloor);
  // L1 the Gallery: two facing colonnade rows with a stone walk
  // between — the market that is not a market.
  b.fillRect(74, 52, 19, 5, Tile.StoneFloor);
  // L2 the crescent: the Moonwell Court's swept stone.
  b.fillRect(48, 38, 19, 18, Tile.StoneFloor);
  b.fillRect(46, 42, 2, 10, Tile.StoneFloor);
  // L2 walks: crescent to the stair head and the terrace doors.
  b.path({ x: 57, y: 56 }, { x: 57, y: 78 }, 3);
  b.path({ x: 48, y: 36 }, { x: 66, y: 36 }, 2);
  // L3 the hall forecourt: the sealed-pocket law's walk — nothing
  // solid ever stands on the forecourt rows (y52..54).
  b.fillRect(24, 51, 15, 4, Tile.StoneFloor);
  // L1 court walks: the Fair Court's spine, stair head to gallery.
  b.path({ x: 81, y: 92 }, { x: 81, y: 58 }, 3);
  b.path({ x: 74, y: 33 }, { x: 92, y: 33 }, 2);
  b.path({ x: 81, y: 33 }, { x: 81, y: 18 }, 2);

  // ---------------------------------------------------------------
  // THE EVENGATE (L0 east) — arch, waystones, the Outward House.
  // ---------------------------------------------------------------
  // The gate mouth: the trail lands at local (159,56); path rows to
  // the border column (the gate-mouth law), arch over the way.
  b.fillRect(156, 55, 4, 3, Tile.Path);
  b.set(157, 54, Tile.ArchStone).set(157, 58, Tile.ArchStone);
  b.set(155, 53, Tile.ElvenWaystone).set(155, 59, Tile.ElvenWaystone);
  b.set(153, 51, Tile.ElvenBanner).set(153, 61, Tile.ElvenBanner);
  // The sentinel arbor at the gate: open rails, a kept fire — the
  // Evengate is people, not portcullis.
  b.fillRect(148, 64, 6, 4, Tile.WoodFloor);
  b.set(148, 64, Tile.RailWood).set(153, 64, Tile.RailWood);
  b.set(148, 67, Tile.RailWood).set(153, 67, Tile.RailWood);
  b.set(150, 65, Tile.Hearth);
  b.set(146, 66, Tile.ElvenBench);
  // THE OUTWARD HOUSE — the travelers' inn: the one building raised
  // in a hundred and fifty years, and the city's whole welcome.
  b.building(138, 36, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 7 }],
    windows: [
      { side: 's', at: 3 },
      { side: 's', at: 11 },
      { side: 'e', at: 6 },
      { side: 'w', at: 6 },
    ],
  });
  // The bar hall (west): counter, hearth, tables that invite.
  b.set(140, 38, Tile.Hearth);
  b.fillRect(141, 41, 3, 1, Tile.Table);
  b.set(140, 44, Tile.ElvenTable).set(144, 45, Tile.ElvenTable);
  b.set(139, 44, Tile.ElvenChair).set(145, 45, Tile.ElvenChair);
  b.set(140, 45, Tile.Chair).set(144, 44, Tile.Chair);
  // The guest wing (east): partition, daybeds under the windows.
  for (let y = 37; y <= 47; y++) b.set(147, y, Tile.WallWood);
  b.set(147, 42, Tile.DoorwayWood);
  b.set(149, 38, Tile.ElvenDaybed).set(151, 41, Tile.ElvenDaybed);
  b.set(149, 44, Tile.ElvenDaybed).set(151, 47, Tile.Bed);
  b.set(149, 41, Tile.ElvenMirror);
  b.setDetail(150, 43, Detail.RugRound);
  // Elarin's corner: the innkeep sleeps behind the bar.
  b.set(139, 40, Tile.Bed);
  b.setDetail(142, 43, Detail.CarpetMoon);
  // The provisioner's stand: Corwen's gathered-goods pitch on the
  // gate court, roofed by sky (the wood provides; he just weighs it).
  b.set(143, 52, Tile.MarketStall);
  b.set(141, 54, Tile.CrateGoods).set(145, 54, Tile.Barrel);
  // Gate-court dressing: the beacons take the street-light watch.
  b.set(141, 50, Tile.ArcaneBeacon).set(152, 50, Tile.ArcaneBeacon);
  b.set(141, 62, Tile.ArcaneBeacon).set(152, 62, Tile.ArcaneBeacon);
  b.set(138, 51, Tile.ElvenPlanter).set(138, 61, Tile.ElvenPlanter);
  b.set(147, 60, Tile.ElvenFountain);
  b.set(144, 58, Tile.ElvenBench).set(150, 58, Tile.ElvenBench);

  // ---------------------------------------------------------------
  // THE EVENMERE SHORE (L0) — the fountain court and the reed walks.
  // ---------------------------------------------------------------
  b.set(106, 70, Tile.ElvenFountain);
  b.set(103, 69, Tile.ElvenBench).set(109, 69, Tile.ElvenBench);
  b.set(104, 72, Tile.ElvenPlanter).set(108, 72, Tile.ElvenPlanter);
  b.set(101, 66, Tile.ElvenChimes);
  b.set(111, 66, Tile.ArcaneBeacon);
  // The mere's east shore: one bench, one runestone, a long view.
  b.set(136, 78, Tile.ElvenBench);
  b.set(138, 82, Tile.Runestone);

  // ---------------------------------------------------------------
  // THE STAIR COURT (L0) — the ascent's front door, framed by falls.
  // ---------------------------------------------------------------
  b.set(75, 97, Tile.ElvenStatue).set(90, 97, Tile.ElvenStatue);
  b.set(77, 99, Tile.ArcaneBeacon).set(88, 99, Tile.ArcaneBeacon);
  // The south lane: over the stream to the reed meadow (one span —
  // laid AFTER the meander, decking exactly the water it crosses).
  for (let y = 99; y <= 106; y++) {
    const t = b.get(86, y);
    if (t === Tile.Water || t === Tile.WaterShallow) b.set(86, y, Tile.Bridge);
    else if (t === Tile.Grass) b.set(86, y, Tile.Path);
  }

  // ---------------------------------------------------------------
  // L1 — THE FAIR COURT: the artisan terrace.
  // ---------------------------------------------------------------
  // THE BOWYER'S HOUSE — the bow lane's home: benches, staves, the
  // gallery of finished work.
  b.building(74, 18, 15, 13, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 7 }],
    windows: [
      { side: 's', at: 3 },
      { side: 's', at: 11 },
      { side: 'n', at: 7 },
    ],
  });
  b.set(76, 20, Tile.CarvingBench).set(76, 23, Tile.CarvingBench);
  b.set(79, 20, Tile.WeaponRack).set(86, 20, Tile.ElvenArmsRack);
  b.set(86, 23, Tile.ElvenArmsRack);
  b.set(82, 24, Tile.ElvenTable);
  b.set(76, 27, Tile.Bed);
  b.setDetail(81, 26, Detail.RugRound);
  b.set(86, 27, Tile.ElvenBookcase);
  // THE SILK HALL — the loom house: moonpale weave, silver thread.
  b.building(74, 36, 11, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [
      { side: 'n', at: 3 },
      { side: 'n', at: 7 },
    ],
  });
  b.set(76, 38, Tile.ElvenLoom).set(76, 41, Tile.ElvenLoom);
  b.set(80, 38, Tile.ElvenTable);
  b.set(82, 41, Tile.ElvenMirror);
  b.set(79, 41, Tile.Bed);
  b.setDetail(80, 40, Detail.CarpetMoon);
  // THE MITHRIL FORGE — the one warm room in the city, and remarked
  // upon: stone walls, the swept-horn anvil, the cool metal worked
  // by the only fire the elves keep for work.
  b.building(87, 36, 7, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 3 }],
    windows: [{ side: 'n', at: 3 }],
  });
  b.set(89, 38, Tile.Furnace);
  b.set(91, 40, Tile.MithrilAnvil);
  b.set(88, 42, Tile.Anvil);
  b.set(92, 42, Tile.CrateGoods);
  b.set(92, 37, Tile.Bed);
  // THE GALLERY — two facing colonnade rows: pillars, planters, low
  // counters. The market that is not a market: nothing shouts.
  for (const gx of [75, 79, 83, 87, 91]) {
    b.set(gx, 51, Tile.PillarStone);
    b.set(gx, 57, Tile.PillarStone);
  }
  b.set(77, 51, Tile.ElvenPlanter).set(85, 51, Tile.ElvenPlanter);
  b.set(77, 57, Tile.ElvenPlanter).set(89, 57, Tile.ElvenPlanter);
  b.set(81, 51, Tile.ElvenTable).set(89, 51, Tile.ElvenTable);
  b.set(85, 57, Tile.ElvenTable);
  b.set(93, 54, Tile.ArcaneBeacon);
  b.set(73, 54, Tile.RunePillar);
  // THE MOONGLASS HALL — glass worked cold: benches, the quench
  // basin, the gallery of finished lenses.
  b.building(72, 60, 13, 9, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [
      { side: 's', at: 3 },
      { side: 's', at: 9 },
    ],
  });
  b.set(74, 62, Tile.Basin);
  b.set(77, 62, Tile.ElvenTable).set(80, 62, Tile.ElvenTable);
  b.set(74, 66, Tile.CrystalCluster);
  b.set(82, 66, Tile.ElvenBookcase);
  b.set(78, 66, Tile.Bed);
  // The Fair Court's own light and green.
  b.set(90, 62, Tile.RunePillar);
  b.set(90, 66, Tile.ElvenPlanter);
  // L1 north strip: the guest terrace — a quiet house for the people
  // pass, facing the wicket country over the north rim (one full
  // tile of bare rim gutter kept, the auto-fence's law).
  b.building(62, 18, 9, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 's', at: 4 }],
  });
  b.set(64, 20, Tile.Bed).set(68, 20, Tile.ElvenBookcase);
  b.set(64, 23, Tile.ElvenTable).set(65, 23, Tile.ElvenChair);
  // (second guest house intentionally deferred to the people pass —
  // the terrace keeps its green until a name needs a door.)
  // L1 south band: the orchard groves and the home terrace west of
  // the stair — homes come with the people pass; the ground holds
  // yew and quiet.
  b.set(50, 84, Tile.TreeYew).set(54, 88, Tile.TreeOak);
  b.set(60, 85, Tile.TreeYew).set(66, 89, Tile.TreeOak);
  b.set(48, 90, Tile.TreeOak).set(70, 84, Tile.TreeYew);
  b.set(57, 91, Tile.ElvenBench);
  b.set(63, 82, Tile.Runestone);
  b.set(8, 84, Tile.TreeYew).set(12, 88, Tile.TreeOak);
  b.set(9, 92, Tile.TreeWillow);

  // ---------------------------------------------------------------
  // L2 — THE MOONWELL COURT: the civic crescent.
  // ---------------------------------------------------------------
  // The Moonwell at the crescent's heart: lit water older than the
  // city around it.
  b.set(56, 46, Tile.Moonwell);
  b.set(53, 44, Tile.ElvenBench).set(59, 44, Tile.ElvenBench);
  b.set(53, 49, Tile.ElvenBench).set(59, 49, Tile.ElvenBench);
  b.set(50, 40, Tile.ElvenStatue).set(63, 40, Tile.ElvenStatue);
  b.set(50, 53, Tile.ArcaneBeacon).set(63, 53, Tile.ArcaneBeacon);
  b.set(48, 46, Tile.ElvenPlanter).set(65, 47, Tile.ElvenPlanter);
  // The crescent's own green and voice (the walk found the center
  // sparse; the court gets what a court sits still for).
  b.set(52, 42, Tile.ElvenPlanter).set(61, 51, Tile.ElvenPlanter);
  b.set(61, 43, Tile.ElvenChimes);
  // THE KEEPING — the bank: two vaults, one chest, and a keeper who
  // does not count out loud. The smallest, finest bank in the world.
  b.building(48, 28, 11, 8, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [{ side: 's', at: 2 }],
  });
  b.set(50, 30, Tile.Vault).set(52, 30, Tile.Vault);
  b.set(56, 30, Tile.BankChest);
  b.set(53, 33, Tile.Table);
  b.setDetail(53, 34, Detail.CarpetMoon);
  // THE SONGHOUSE — the loresinger's hall: the harp, the chimes, the
  // lectern where the memory is kept in verse.
  b.building(61, 28, 10, 8, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 5 }],
    windows: [{ side: 'n', at: 3 }, { side: 'n', at: 7 }],
  });
  b.set(63, 30, Tile.ElvenHarp);
  b.set(67, 30, Tile.ElvenLectern);
  b.set(68, 33, Tile.Bed);
  b.setDetail(65, 32, Detail.RugRound);
  b.set(63, 33, Tile.ElvenBookcase);
  // THE INSCRIBER'S HOUSE — the third table in the Dawnlands, and
  // the oldest by every count that matters. The rear wall carries
  // what the Arcanum forgot; the people pass hangs the showing off
  // the quest flag.
  b.building(60, 58, 11, 11, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 5 }],
    windows: [{ side: 'e', at: 5 }],
  });
  b.set(63, 61, Tile.EnchantingTable);
  b.set(62, 65, Tile.ArcaneTome);
  b.set(66, 65, Tile.ElvenBookcase).set(68, 65, Tile.ElvenBookcase);
  b.set(68, 61, Tile.ElvenLectern);
  b.set(62, 67, Tile.Bed);
  b.setDetail(65, 63, Detail.CarpetMoon);
  // THE STILLROOM — the healers' house and the hanging gardens: the
  // herb terrace between the races, planted, never tilled.
  b.building(48, 60, 9, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'n', at: 4 }],
    windows: [{ side: 's', at: 4 }],
  });
  b.set(50, 62, Tile.Alembic);
  b.set(54, 62, Tile.ElvenTable);
  b.set(50, 66, Tile.Bed);
  b.set(54, 66, Tile.ElvenPlanter);
  // THE WARDEN'S ROOST — Sylwen's hall on the garden terrace between
  // the races: the warden watches the ascent and both falls, and the
  // king trusts what she sees more than what he is told.
  b.building(24, 58, 9, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 4 }],
    windows: [{ side: 'w', at: 3 }, { side: 'e', at: 3 }],
  });
  b.set(26, 60, Tile.ElvenArmsRack);
  b.set(30, 60, Tile.Bed);
  b.set(26, 62, Tile.ElvenTable).set(27, 62, Tile.ElvenChair);
  // The hanging gardens: the terrace south of the roost, green with
  // gathered herbs (planted in earth, never in rows — the wood does
  // not do rows).
  b.set(24, 67, Tile.WildSagewort).set(28, 69, Tile.FibrePlant);
  b.set(33, 67, Tile.WildSagewort).set(37, 69, Tile.WildSagewort);
  b.set(25, 72, Tile.FibrePlant).set(31, 73, Tile.WildSagewort);
  b.set(36, 74, Tile.BerryBush).set(27, 76, Tile.BerryBush);
  b.set(30, 70, Tile.ElvenPlanter);
  b.set(24, 74, Tile.ElvenBench);
  b.set(35, 76, Tile.ArcaneBeacon);
  // The mithril vein: the one modest face the west's whole argument
  // stands on (the reconciliation canon — the old folk knew mithril
  // from their OWN vein long before the delf).
  b.set(12, 64, Tile.RockMithril);
  b.set(12, 68, Tile.Rock);
  // L2 walks get their light.
  b.set(56, 58, Tile.RunePillar).set(56, 74, Tile.RunePillar);
  b.set(46, 36, Tile.ArcaneBeacon).set(67, 36, Tile.ArcaneBeacon);

  // ---------------------------------------------------------------
  // L3 — THE EVENHALL: the king's ground between the falls.
  // ---------------------------------------------------------------
  // The hall: stone, prow south, the diagonal budget spent here and
  // nowhere else.
  b.building(22, 36, 19, 15, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 's', at: 9 }],
    windows: [
      { side: 'w', at: 5 },
      { side: 'w', at: 9 },
      { side: 'e', at: 5 },
      { side: 'e', at: 9 },
    ],
  });
  // The prow shoulders: the two diagonal statements.
  b.set(22, 50, Tile.WallStoneDiagNE);
  b.set(40, 50, Tile.WallStoneDiagNW);
  // THE EVERFLAME — the hall's heart: the silver-white fire that was
  // old when the roads were young. Never destructible; never out.
  b.set(31, 41, Tile.Everflame);
  // The king's seat and the queen-that-was's empty one: two chairs,
  // one table, a very long view. Thrones are not the register.
  b.set(30, 38, Tile.ElvenChair).set(32, 38, Tile.ElvenChair);
  b.setDetail(31, 38, Detail.BannerMoon);
  b.setDetail(30, 39, Detail.CarpetMoon).setDetail(32, 39, Detail.CarpetMoon);
  // The feast floor: two long tables, benches between.
  b.fillRect(26, 44, 4, 1, Tile.ElvenTable);
  b.fillRect(33, 44, 4, 1, Tile.ElvenTable);
  b.set(25, 46, Tile.ElvenBench).set(37, 46, Tile.ElvenBench);
  // The solar (east wing): the king receives here, and mostly he
  // listens.
  for (let y = 37; y <= 49; y++) b.set(36, y, Tile.WallStone);
  b.set(36, 43, Tile.DoorwayStone);
  b.set(38, 38, Tile.ElvenBookcase);
  b.set(38, 41, Tile.ElvenTable).set(39, 41, Tile.ElvenChair);
  b.set(38, 47, Tile.ElvenDaybed);
  b.set(37, 45, Tile.ElvenMirror);
  // Hall dressing.
  b.set(24, 38, Tile.ElvenHarp);
  b.setDetail(27, 40, Detail.Tapestry).setDetail(35, 40, Detail.Tapestry);
  // The forecourt: banners and beacons frame the door; the walk rows
  // y52-54 stay open (the sealed-pocket law).
  b.set(26, 51, Tile.ElvenBanner).set(37, 51, Tile.ElvenBanner);
  b.set(24, 56, Tile.ArcaneBeacon).set(39, 56, Tile.ArcaneBeacon);
  // (The Warden's Roost stands below on the garden terrace — the
  // warden watches the ascent, not the king's back.)
  // THE KING'S GROVE — the yew ring east of the hall: the oldest
  // trees inside any wall in the world, except there is no wall.
  b.set(44, 37, Tile.TreeYew).set(46, 41, Tile.TreeYew);
  b.set(44, 45, Tile.TreeYew).set(46, 49, Tile.TreeYew);
  b.set(44, 53, Tile.TreeYew);
  b.set(45, 43, Tile.Runestone);
  b.set(45, 51, Tile.WardArch);
  // The spring's rim: stone, chimes, and the pool's own quiet.
  b.set(24, 32, Tile.ElvenChimes).set(38, 32, Tile.ElvenChimes);
  b.set(22, 31, Tile.ArcaneBeacon).set(40, 31, Tile.ArcaneBeacon);

  // ---------------------------------------------------------------
  // THE GROVES — the city is groves with buildings in them. Hand
  // clusters with the apron kept; scatter only dresses the grass.
  // ---------------------------------------------------------------
  // L0 north-east: the wicket country's open wood.
  b.set(24, 4, Tile.TreeOak).set(30, 7, Tile.TreeYew);
  b.set(38, 3, Tile.TreeOak).set(46, 8, Tile.TreeWillow);
  b.set(56, 5, Tile.TreeOak).set(66, 9, Tile.TreeYew);
  b.set(76, 4, Tile.TreeOak).set(88, 7, Tile.TreeOak);
  b.set(104, 6, Tile.TreeYew).set(112, 10, Tile.TreeOak);
  b.set(124, 5, Tile.TreeOak).set(134, 9, Tile.TreeWillow);
  b.set(146, 6, Tile.TreeOak).set(152, 12, Tile.TreeYew);
  b.set(108, 16, Tile.TreeOak).set(120, 20, Tile.TreeOak);
  b.set(132, 17, Tile.TreeYew).set(144, 22, Tile.TreeOak);
  b.set(112, 28, Tile.TreeWillow).set(126, 30, Tile.TreeOak);
  b.set(138, 28, Tile.TreeOak).set(150, 30, Tile.TreeOak);
  b.set(104, 38, Tile.TreeOak).set(116, 42, Tile.TreeYew);
  b.set(128, 40, Tile.TreeOak);
  // L0 south-west: the reed meadow's willows.
  b.set(10, 100, Tile.TreeWillow).set(24, 106, Tile.TreeWillow);
  b.set(38, 105, Tile.TreeWillow).set(52, 107, Tile.TreeOak);
  b.set(66, 106, Tile.TreeWillow).set(14, 96, Tile.TreeOak);
  b.set(58, 107, Tile.TreeOak).set(70, 107, Tile.TreeYew);
  b.set(96, 108, Tile.TreeWillow).set(104, 106, Tile.TreeWillow);
  b.set(130, 100, Tile.TreeWillow).set(140, 96, Tile.TreeOak);
  b.set(148, 90, Tile.TreeOak).set(152, 78, Tile.TreeYew);
  b.set(148, 70, Tile.TreeOak).set(154, 44, Tile.TreeOak);
  b.set(146, 32, Tile.TreeYew).set(136, 66, Tile.TreeOak);
  // The south-east shore grove.
  b.set(140, 86, Tile.TreeWillow);
  // Grass texture: tall grass and flowers, nothing else scattered.
  b.scatter(Tile.GrassTall, 0.05);
  b.scatterDetail(Detail.Flowers, 0.03);
  b.scatterDetail(Detail.Tuft, 0.02);

  // ---------------------------------------------------------------
  // THE SIGNS — few, plain, and true (the dash ban holds).
  // ---------------------------------------------------------------
  b.sign(156, 59, 'EVENFALL', ['the city the old folk kept', 'the wood is the wall'], Tile.Signpost);
  b.sign(139, 49, 'THE OUTWARD HOUSE', ['beds for travelers', 'the fire is old, the welcome is new'], Tile.Signpost);
  b.sign(93, 51, 'THE GALLERY', ['the fair court', 'ask, do not shout'], Tile.Signpost);
  b.sign(85, 96, 'THE MOONSTAIR', ['the moon walks down it', 'you may walk up'], Tile.Signpost);
  b.sign(59, 34, 'THE KEEPING', ['what is kept is kept'], Tile.HangingSign);
  b.sign(66, 57, 'THE INSCRIBER', ['the third table', 'the first answer'], Tile.Signpost);
  b.sign(14, 2, 'THE HEARTWOOD WALK', ['the wood past the arch is not walked', 'this is not a rule, it is a fact'], Tile.Signpost);
  b.sign(100, 65, 'THE EVENMERE', ['the city keeps its mirror clean'], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE PEOPLE — every keeper at their promised post (dir 1.5707963
  // faces the camera, the royal law; the watch faces the way you
  // came from).
  // ---------------------------------------------------------------
  const CAM = 1.5707963;
  const UP = 4.7123889;
  const E = 0.0;
  const W = 3.1415927;
  b.actor('king_aldaren', 31, 39, CAM, 'ef_king');
  b.actor('warden_sylwen', 28, 65, CAM, 'ef_warden');
  b.actor('keeper_ilvane', 31, 42, UP, 'ef_keeper');
  b.actor('loresinger_maelis', 64, 31, W, 'ef_singer');
  b.actor('bowyer_aewyn', 77, 20, W, 'ef_bowyer');
  b.actor('weaver_myrren', 77, 38, W, 'ef_weaver');
  b.actor('glasswright_selorne', 78, 63, UP, 'ef_glasswright');
  b.actor('smith_faelar', 90, 40, E, 'ef_smith');
  b.actor('inscriber_vessa', 64, 61, W, 'ef_inscriber');
  b.actor('innkeep_elarin', 142, 40, CAM, 'ef_innkeep');
  b.actor('provisioner_corwen', 143, 53, CAM, 'ef_provisioner');
  b.actor('sentinel_serel', 155, 56, E, 'ef_gate');
  b.actor('stillkeeper_naia', 51, 62, W, 'ef_stillkeeper');
  // Othiel holds the Keeping's still bench (the Orla precedent: one
  // keeper is allowed to simply BE where the keeping is).
  b.actor('keeper_othiel', 53, 31, CAM);
  // The Evenguard on the walks; the watch faces the way you came.
  b.actor('evenguard_watch', 152, 55, E);
  b.actor('evenguard_watch', 152, 58, E);
  b.actor('evenguard_watch', 76, 96, CAM);
  b.actor('evenguard_watch', 17, 12, UP);
  // The Fair Court keeps its own company.
  b.actor('fair_artisan', 79, 52, CAM);
  b.actor('fair_artisan', 87, 56, UP);
  b.actor('fair_artisan', 75, 55, E);

  // ---------------------------------------------------------------
  // THE SPAWN — the gate court: every waker's first sight of the
  // city is the ascent, framed by the arch.
  // ---------------------------------------------------------------
  b.spawn(146.5, 56.5);

  return b.build();
}

import { Detail, Tile } from '@arx/shared';
import { MARKET_STALL } from '../structures/templates.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * THE UNDERCROFT — the cavern district under Silverfall, cut into
 * the dark band (world y >= 512, where the world defaults to solid
 * cave) directly beneath the mountain that owns it. The Masons'
 * Guild carved it, worked it, and sealed it a generation ago when
 * the kobolds broke through from below. Epic 5 opens the seal.
 *
 * The district reads as ONE STORY walked west to east:
 *
 *   THE LANDING — the guild stair from the surface: dressed stone,
 *       paired pillars, the up-portal home. The lamp of the deep;
 *       dying anywhere below sends you back here (zone spawn).
 *   THE DEEP MARKET — the great vaulted cavern: a stone promenade
 *       of stall rows fed by a cold spring, lit by guild braziers.
 *       (Keepers arrive in Epic 6: the ore-broker, the lamp-oil
 *       seller, the cave-fish monger, the curio dealer.)
 *   THE RIFTGATE VAULT — north: the resident Riftgate in a pillar
 *       ring. Keys turn here; places answer.
 *   THE HIGH-ORE GALLERIES — east: three worked faces climbing the
 *       metal ladder — silver and mithril on the swept upper walk,
 *       adamant and obsidian on the mid, and at the bottom of the
 *       dark the starfall vein the guild never reached. A cracked
 *       wall keeps one last secret.
 *   THE KOBOLD FRONT — southeast: the warren that ended the first
 *       Undercroft. Rubble chokes the way in, bones and glowshrooms
 *       past it, and the digmaster's tunnel aims straight at the
 *       starfall — the guild sweeps NOTHING past the rubble.
 *   THE OLD WORKS & CISTERN — southwest: the masons' abandoned
 *       benches, the black water, blind cave-fish, and the
 *       glowshroom grotto between.
 *
 * LAWS OBSERVED: underground ambient/cutaway ride world-y (>=512)
 * automatically; danger tier is 0 down here so every threat is
 * AUTHORED (kobolds, bats, beetles, one spider — a real ladder);
 * chests pay their own kind's law; the market/landing/vault are the
 * guild-swept safe spine, and nothing hostile spawns on it. ZERO
 * actors by design — the Deep Market's keepers are Epic 6.
 */
export function buildUndercroft(): ZoneDef {
  // THE UNDERCROFT REVOICED (docs/silverfall-vale-plan.md): the rect
  // grows east and south into solid dark-band rock (96x64 -> 128x96,
  // origin fixed, both portals untouched) and the district finally
  // BREATHES — the drowned working the spring took back, the masons'
  // deep chapel with its memorial count, the winch head at the end
  // of the long haulage dark, and the warren's unswept back door.
  // Negative dark is a material: most of the new claim stays solid.
  const b = new ZoneBuilder(
    'undercroft',
    'The Undercroft',
    { x: -344, y: 520 },
    128,
    96,
    Tile.CaveWall,
  );

  // ---------------------------------------------------------------
  // THE LANDING — the guild stair. Dressed stone in raw rock.
  // ---------------------------------------------------------------
  b.fillRect(6, 28, 12, 9, Tile.CaveFloor);
  b.fillRect(7, 31, 9, 3, Tile.StoneFloor);
  // The way home: lands you on the Undercroft apron at Silverfall.
  b.portal(8, 32, Tile.PortalUp, { x: -497.5, y: -323.5 });
  b.set(10, 30, Tile.PillarStone).set(10, 34, Tile.PillarStone);
  b.set(13, 30, Tile.PillarStone).set(13, 34, Tile.PillarStone);
  b.set(7, 30, Tile.Brazier).set(7, 34, Tile.Brazier);
  b.sign(16, 34, 'THE UNDERCROFT', ["the Masons' Guild keeps", 'the stair']);
  b.set(6, 29, Tile.Crate).set(6, 35, Tile.Barrel);
  b.set(20, 31, Tile.Counter); // the guild's toll desk — the stair is kept, not free
  b.setDetail(11, 31, Detail.Pebbles).setDetail(14, 33, Detail.Pebbles);

  // ---------------------------------------------------------------
  // THE DEEP MARKET — the vaulted heart. The tunnel from the stair
  // opens into a cavern with a stone promenade at its center.
  // ---------------------------------------------------------------
  b.fillRect(18, 31, 10, 3, Tile.CaveFloor); // the stair tunnel
  b.fillEllipse(43, 32, 15, 10, Tile.CaveFloor); // the great cavern
  b.fillEllipse(34, 26, 6, 4, Tile.CaveFloor); // the spring alcove
  b.fillEllipse(52, 39, 6, 4, Tile.CaveFloor); // the southeast lobe
  // The cold spring that waters the market.
  b.fillEllipse(33, 25, 3, 2, Tile.WaterShallow);
  b.fillRect(32, 25, 3, 1, Tile.Water);
  b.set(36, 23, Tile.GlowShroom).set(30, 28, Tile.GlowShroom);
  b.set(37, 25, Tile.DripPool); // the spring seeps past its own rim
  // The promenade: two facing stall rows on dressed stone, braziers
  // at the corners — the guild sweeps and lights this spine.
  b.fillRect(36, 29, 16, 7, Tile.StoneFloor);
  b.stamp(MARKET_STALL, 37, 29);
  b.stamp(MARKET_STALL, 43, 29);
  b.stamp(MARKET_STALL, 49, 29);
  b.stamp(MARKET_STALL, 40, 33);
  b.stamp(MARKET_STALL, 46, 33);
  b.set(36, 28, Tile.Brazier).set(51, 28, Tile.Brazier);
  b.set(36, 36, Tile.Brazier).set(51, 36, Tile.Brazier);
  b.set(39, 37, Tile.Bench).set(47, 37, Tile.Bench);
  b.set(54, 31, Tile.Crate).set(55, 33, Tile.Barrel).set(30, 33, Tile.CrateGoods);
  b.set(54, 35, Tile.MossBarrel); // the cask the damp got to first
  b.sign(30, 29, 'THE DEEP MARKET', ['weights honest, lamps lit']);
  b.set(54, 26, Tile.Stalagmite).set(32, 38, Tile.Stalagmite).set(48, 24, Tile.Stalagmite);
  // The keepers' trades arrive around their stalls: the broker's
  // weighing corner, the live catch in the spring's own cold, the
  // curio dealer's honest lies laid out flat.
  b.set(34, 30, Tile.IngotRack).set(34, 32, Tile.HangingScale); // Varga weighs true
  b.set(37, 24, Tile.KeepPool); // blind cave-fish, kept fresh where the spring runs
  b.set(48, 36, Tile.DisplayTable); // Ninebrass's stories, priced by size
  // And ONE broom leans where no broom should be. The market floor
  // was found SWEPT after twenty sealed years. Nobody says whose.
  b.set(31, 30, Tile.BroomAndPail);

  // ---------------------------------------------------------------
  // THE RIFTGATE VAULT — north of the market, up its own tunnel:
  // the resident gate in a pillar ring. (The riftgate law: interact
  // opens the key panel; a dungeon key IS a place.)
  // ---------------------------------------------------------------
  b.fillRect(42, 16, 3, 6, Tile.CaveFloor);
  b.fillEllipse(43, 11, 7, 5, Tile.CaveFloor);
  b.fillEllipse(43, 11, 3.5, 2.5, Tile.StoneFloor);
  b.portal(43, 11, Tile.PortalDown, 'delve');
  b.set(39, 7, Tile.PillarStone).set(47, 7, Tile.PillarStone);
  b.set(39, 15, Tile.PillarStone).set(47, 15, Tile.PillarStone);
  b.set(41, 9, Tile.Brazier).set(45, 9, Tile.Brazier);
  b.set(41, 13, Tile.Brazier).set(45, 13, Tile.Brazier);
  b.set(37, 11, Tile.Stalagmite).set(49, 11, Tile.Stalagmite);
  // The gate-watch keeps its flames: wax generations deep, and no one
  // has ever seen who lights them.
  b.set(40, 11, Tile.CandleShrine).set(46, 11, Tile.CandleShrine);
  b.sign(44, 17, 'THE RIFTGATE', ['keys turn, places answer']);

  // ---------------------------------------------------------------
  // THE HIGH-ORE GALLERIES — east through the junction chamber.
  // ---------------------------------------------------------------
  b.fillRect(58, 28, 6, 3, Tile.CaveFloor); // market -> junction
  b.fillEllipse(65, 24, 5, 7, Tile.CaveFloor); // the junction
  b.set(61, 20, Tile.Crate).set(62, 29, Tile.Barrel).set(66, 18, Tile.ToolRack);
  b.set(63, 22, Tile.Brazier).set(67, 27, Tile.Brazier);
  // The UPPER WALK (gallery A): silver into mithril. Guild-swept.
  b.fillRect(68, 16, 20, 3, Tile.CaveFloor);
  b.fillEllipse(88, 16, 4, 3, Tile.CaveFloor);
  b.set(72, 16, Tile.RockSilver).set(79, 18, Tile.RockSilver);
  b.set(89, 15, Tile.RockMithril).set(90, 17, Tile.RockMithril);
  b.set(75, 16, Tile.PillarStone).set(75, 18, Tile.PillarStone); // shoring
  // The guild's own timber holds the swept walk.
  b.set(70, 16, Tile.TimberBrace).set(77, 16, Tile.TimberBrace).set(82, 16, Tile.TimberBrace);
  b.set(83, 17, Tile.Brazier);
  b.set(91, 15, Tile.ChestIron);
  b.set(86, 18, Tile.CaveRubble);
  // The MID WALK (gallery B): adamant and the obsidian flow — and
  // behind one cracked wall, the guild's last unswept secret.
  b.fillRect(70, 22, 18, 3, Tile.CaveFloor);
  b.fillEllipse(87, 23, 3.5, 3, Tile.CaveFloor);
  b.set(89, 22, Tile.RockAdamant).set(89, 24, Tile.RockAdamant);
  b.set(78, 22, Tile.RockObsidian).set(74, 24, Tile.RockSilver);
  b.set(81, 22, Tile.PillarStone).set(81, 24, Tile.PillarStone);
  b.set(76, 22, Tile.TimberBrace).set(84, 22, Tile.TimberBrace); // the mid walk's timber
  b.set(72, 22, Tile.WallChains); // where the haulage ran
  b.set(85, 25, Tile.Brazier);
  b.set(91, 23, Tile.CrackedCaveWall); // three blows say otherwise
  b.fillRect(92, 22, 3, 3, Tile.CaveFloor);
  b.set(94, 23, Tile.ChestGilded).set(92, 22, Tile.BonePile);
  // The DEEP WALK (gallery C): obsidian, bones, and the STARFALL
  // vein at the very bottom of the dark. No braziers past the
  // junction — the guild never swept this far, and something webbed
  // the hollows. (The kobold link tunnel below aims right at it.)
  b.fillRect(66, 28, 16, 3, Tile.CaveFloor);
  b.fillEllipse(86, 31, 5, 4, Tile.CaveFloor);
  b.set(83, 28, Tile.RockObsidian).set(88, 34, Tile.RockObsidian);
  b.set(90, 31, Tile.RockStarfall);
  b.set(84, 33, Tile.BonePile).set(88, 28, Tile.BonePile);
  b.set(90, 33, Tile.ChestIron);
  b.set(85, 34, Tile.Stalagmite);
  // The webbed hollows the sign warned about — and, in the rock, ribs
  // older than any guild.
  b.set(72, 28, Tile.WallWeb).set(78, 28, Tile.WallWeb).set(85, 28, Tile.WallWeb);
  b.set(74, 28, Tile.WallFossil);
  // Somebody tried for the starfall before the guild sealed the door:
  // their ring is cold, their bedroll is laid, and they never left.
  b.set(84, 32, Tile.ColdCamp);
  // THE LONG HAULAGE — the deep walk keeps going (the revoice): past
  // the starfall the old drift runs east through true dark to THE
  // WINCH HEAD, where the guild's chains still hang and the second
  // sealed door has never been reopened. No braziers. No sweeping.
  // The dark out here is exactly as long as it feels.
  b.fillRect(91, 29, 17, 3, Tile.CaveFloor); // the drift, x91-107
  b.set(95, 29, Tile.WallWeb).set(102, 29, Tile.WallWeb);
  b.set(99, 29, Tile.WallFossil); // ribs older than any guild, again
  b.fillEllipse(114, 29, 7, 5, Tile.CaveFloor); // the winch head
  b.set(110, 25, Tile.WallChains).set(116, 25, Tile.WallChains); // the haulage line
  b.set(114, 29, Tile.MineCart); // the last load never went up
  b.set(108, 29, Tile.TimberBrace).set(118, 27, Tile.TimberBrace);
  b.set(111, 33, Tile.BonePile).set(119, 31, Tile.CaveRubble);
  b.set(109, 26, Tile.Stalagmite).set(117, 33, Tile.Stalagmite);
  b.set(117, 32, Tile.LootedChest); // the winch pay, long since visited
  // THE EAST DOOR: the guild sealed two ways down that winter.
  // This one never reopened. (It is not for this epic to open it.)
  b.set(120, 28, Tile.CaveRubble).set(121, 29, Tile.CaveRubble).set(120, 30, Tile.CaveRubble);
  b.sign(118, 31, 'THE EAST DOOR', ['sealed the same winter.', 'never reopened']);

  // ---------------------------------------------------------------
  // THE KOBOLD FRONT — southeast. Rubble chokes the market door;
  // past it the warren is theirs: bones, shrooms, stolen goods, and
  // the digmaster's tunnel climbing toward the starfall vein.
  // ---------------------------------------------------------------
  b.fillRect(56, 40, 8, 3, Tile.CaveFloor); // the choked way in
  b.set(57, 40, Tile.CaveRubble).set(59, 42, Tile.CaveRubble).set(61, 41, Tile.CaveRubble);
  b.set(58, 41, Tile.SpikeBarrier); // the guild's abandoned barricade — the war it walked away from
  b.set(62, 42, Tile.LootedChest); // the first Undercroft's pay, long since visited
  b.sign(55, 39, 'BEYOND THIS MARK', ['the guild does not sweep', 'past the rubble']);
  b.fillEllipse(67, 45, 6, 5, Tile.CaveFloor); // the outer warren
  b.fillEllipse(78, 51, 7, 5, Tile.CaveFloor); // the deep warren
  b.fillEllipse(87, 46, 4, 3, Tile.CaveFloor); // the digmaster's dig
  b.fillRect(70, 46, 6, 3, Tile.CaveFloor); // warren throat
  b.fillRect(82, 46, 4, 3, Tile.CaveFloor); // dig throat
  b.fillRect(87, 36, 2, 8, Tile.CaveFloor); // the dig, climbing at the starfall
  b.set(64, 43, Tile.BonePile).set(70, 48, Tile.BonePile).set(76, 53, Tile.BonePile);
  b.set(83, 47, Tile.BonePile);
  b.set(63, 47, Tile.CaveRubble).set(74, 50, Tile.CaveRubble).set(80, 55, Tile.CaveRubble);
  b.set(86, 44, Tile.CaveRubble);
  b.set(62, 44, Tile.GlowShroom).set(72, 52, Tile.GlowShroom).set(81, 48, Tile.GlowShroom);
  b.set(66, 49, Tile.Stalagmite).set(79, 49, Tile.Stalagmite).set(84, 54, Tile.Stalagmite);
  b.set(65, 41, Tile.WallWeb).set(76, 47, Tile.WallWeb); // the warren keeps its corners webbed
  b.set(75, 47, Tile.ChainedSkeleton); // the delver the kobolds caught
  b.set(89, 45, Tile.ChestMossy); // the hoard
  b.set(88, 47, Tile.Crate).set(90, 46, Tile.Crate); // stolen, unopened

  // ---------------------------------------------------------------
  // THE OLD WORKS & THE CISTERN — southwest, off the landing.
  // ---------------------------------------------------------------
  b.fillRect(9, 37, 3, 8, Tile.CaveFloor); // the works stair
  b.fillEllipse(16, 49, 8, 6, Tile.CaveFloor); // the old works
  b.fillRect(12, 47, 6, 4, Tile.StoneFloor); // the masonry floor
  b.set(12, 47, Tile.Workbench).set(12, 50, Tile.Workbench);
  b.set(15, 45, Tile.PillarStone).set(18, 45, Tile.PillarStone); // stock, still racked
  b.set(20, 47, Tile.Crate).set(14, 52, Tile.CrateGoods).set(19, 52, Tile.Barrel);
  b.set(10, 48, Tile.ToolRack);
  b.set(13, 44, Tile.TimberBrace).set(19, 44, Tile.TimberBrace); // the masons' own shoring
  b.set(20, 52, Tile.MossBarrel); // stores gone green since the sealing
  b.set(14, 53, Tile.IronGrate); // the works' drain, breathing cold
  b.set(16, 44, Tile.Brazier); // the one lamp the guild still feeds
  b.setDetail(15, 48, Detail.Pebbles).setDetail(18, 51, Detail.Pebbles);
  // The cistern: black water, blind fish.
  b.fillEllipse(28, 52, 5, 4, Tile.CaveFloor);
  b.fillEllipse(28, 52, 3, 2, Tile.WaterShallow);
  b.fillRect(27, 52, 3, 1, Tile.Water);
  b.set(31, 50, Tile.DripPool); // the cistern keeps the mountain's clock
  b.set(26, 52, Tile.FishingSpot).set(30, 52, Tile.FishingSpot);
  b.set(25, 49, Tile.GlowShroom).set(31, 54, Tile.GlowShroom).set(22, 52, Tile.GlowShroom);
  // The glowshroom grotto between cistern and market.
  b.fillRect(32, 53, 10, 3, Tile.CaveFloor); // cistern -> grotto
  b.fillEllipse(46, 51, 6, 5, Tile.CaveFloor);
  b.fillRect(45, 42, 3, 5, Tile.CaveFloor); // grotto -> market
  b.set(43, 49, Tile.GlowShroom).set(48, 48, Tile.GlowShroom).set(50, 52, Tile.GlowShroom);
  b.set(44, 53, Tile.GlowShroom).set(42, 51, Tile.GlowShroom);
  b.set(42, 48, Tile.Stalagmite).set(51, 49, Tile.Stalagmite);
  b.set(44, 47, Tile.WallFossil); // the grotto grew around older ribs
  b.set(49, 54, Tile.ChestMossy);

  // ---------------------------------------------------------------
  // THE DROWNED WORKING — south of the cistern: the gallery the
  // spring took back. The guild cut it, the water claimed it, and
  // the chest on the islet has been VISIBLE from the north rim for
  // twenty years — the long way round is the whole design.
  // ---------------------------------------------------------------
  b.fillRect(27, 56, 3, 10, Tile.CaveFloor); // the works stair down, y56-65
  b.fillEllipse(28, 75, 13, 10, Tile.CaveFloor); // the drowned chamber
  b.fillEllipse(28, 76, 10, 7, Tile.WaterShallow); // the flood's rim
  b.fillEllipse(28, 76, 8, 5.5, Tile.Water); // the black heart
  b.fillEllipse(28, 81, 2, 1.5, Tile.CaveFloor); // the islet
  b.set(28, 81, Tile.ChestIron); // seen for twenty years, reached by few
  b.fillRect(27, 83, 2, 3, Tile.Dock); // the south planks — the guild's dry-foot walk
  b.set(22, 70, Tile.DripPool).set(35, 80, Tile.DripPool);
  b.set(17, 72, Tile.TimberBrace).set(39, 77, Tile.TimberBrace);
  b.set(21, 79, Tile.IronGrate); // the drain that lost the argument
  b.set(33, 68, Tile.BonePile);
  b.set(16, 76, Tile.GlowShroom).set(37, 71, Tile.GlowShroom).set(24, 84, Tile.GlowShroom);
  b.set(19, 68, Tile.Stalagmite).set(36, 84, Tile.Stalagmite);
  b.set(30, 66, Tile.MossBarrel); // stores that floated, then didn't
  b.sign(25, 66, 'THE DROWNED WORKING', ['the spring won.', 'the guild let it']);

  // ---------------------------------------------------------------
  // THE DEEP CHAPEL — the masons' quiet room, off the market's
  // south lobe: where the shifts prayed before the seal, and THE
  // COUNT keeps its one empty name. Lit by its own candles, swept
  // by nobody official, and NOTHING hostile stands here — the
  // quiet is load-bearing.
  // ---------------------------------------------------------------
  b.fillRect(51, 44, 3, 14, Tile.CaveFloor); // the processional down, y44-57
  b.fillEllipse(52, 64, 9, 7, Tile.CaveFloor); // the chapel vault
  b.fillEllipse(52, 64, 4, 3, Tile.StoneFloor); // the dressed circle
  b.set(48, 61, Tile.GrandPillar).set(56, 61, Tile.GrandPillar);
  b.set(49, 67, Tile.CandleShrine).set(55, 67, Tile.CandleShrine);
  b.set(48, 64, Tile.CandleShrine).set(56, 64, Tile.CandleShrine);
  b.set(51, 68, Tile.Bench).set(53, 68, Tile.Bench);
  // THE MEMORIAL — the alcove at the chapel's throat: the count
  // that never matched, cut in stone. Three candles burn. One of
  // them is always fresh. Nobody official lights it.
  b.fillRect(50, 55, 5, 3, Tile.CaveFloor);
  b.set(50, 55, Tile.CandleShrine).set(52, 55, Tile.CandleShrine).set(54, 55, Tile.CandleShrine);
  b.sign(54, 57, 'THE COUNT', ['thirty-one down, thirty out.', 'the wall holds a name empty']);
  b.set(44, 61, Tile.Stalagmite).set(60, 68, Tile.Stalagmite);
  // The west link: chapel to the drowned working — the deep loops.
  b.fillRect(39, 69, 10, 2, Tile.CaveFloor);

  // ---------------------------------------------------------------
  // THE BLACKREACH — the warren's unswept back door, south out of
  // the deep warren: shroom-lit, beetle-walked, and exactly as
  // unofficial as everything the kobolds keep.
  // ---------------------------------------------------------------
  b.fillRect(77, 57, 3, 12, Tile.CaveFloor); // the crack, y57-68
  b.set(78, 58, Tile.WallWeb);
  b.fillEllipse(84, 75, 8, 6, Tile.CaveFloor); // the back grotto
  b.set(79, 72, Tile.GlowShroom).set(88, 79, Tile.GlowShroom).set(83, 70, Tile.GlowShroom).set(90, 73, Tile.GlowShroom);
  b.set(78, 76, Tile.Stalagmite).set(86, 71, Tile.Stalagmite).set(89, 80, Tile.Stalagmite);
  b.set(84, 70, Tile.WallFossil);
  b.set(81, 78, Tile.BonePile).set(87, 74, Tile.BonePile);
  b.set(89, 78, Tile.ChestMossy); // what the warren hides from the warren
  b.set(76, 70, Tile.CaveRubble).set(91, 76, Tile.CaveRubble);

  // ---------------------------------------------------------------
  // Cave life: the authored ladder (danger tier is 0 down here — the
  // dark is exactly as dangerous as we say it is). The market spine
  // stays clean; everything else has teeth.
  // ---------------------------------------------------------------
  b.npcSpawn('cave_bat', 65, 24, 4, 3); // the junction flutters
  b.npcSpawn('cave_bat', 46, 51, 4, 4); // the grotto roost
  b.npcSpawn('cave_bat', 28, 74, 5, 3); // the drowned working's ceiling
  b.npcSpawn('giant_beetle', 16, 50, 4, 3); // the old works skitter
  b.npcSpawn('giant_beetle', 84, 75, 5, 3); // the Blackreach walks
  b.npcSpawn('giant_spider', 86, 31.5, 3, 1); // what webbed the deep walk
  b.npcSpawn('kobold', 66, 45.5, 4, 4); // the outer warren
  b.npcSpawn('kobold', 78, 51.5, 4, 4); // the deep warren
  b.npcSpawn('kobold_digmaster', 87.5, 46, 2, 1); // the dig's owner

  // ---------------------------------------------------------------
  // THE PEOPLE (Epic 6): the Deep Market's keepers. The reeve walks
  // her spine, Skarn watches the rubble line from his brazier, and
  // the two counters hold the promenade.
  // ---------------------------------------------------------------
  b.actor('reeve_coppin', 40.5, 32.5, 0, 'croft_reeve');
  b.actor('veteran_skarn', 51.5, 35.4, Math.PI / 2, 'croft_veteran');
  b.actor('broker_varga', 38.5, 28.4, Math.PI / 2, 'croft_trader');
  b.actor('curio_ninebrass', 44.5, 28.4, Math.PI / 2, 'croft_trader');

  // Cave-floor texture everywhere the rock shows.
  b.scatterDetail(Detail.Pebbles, 0.05, [Tile.CaveFloor]);
  b.scatterDetail(Detail.Mushroom, 0.02, [Tile.CaveFloor]);

  // The lamp of the deep: die below, wake at the Landing.
  b.spawn(11.5, 32.5);
  return b.build();
}

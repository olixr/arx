/**
 * DAWNMEAD UNDER SIEGE (band 6) — waterside.ts [L4 EAST].
 *
 * The one calm district and the two banks: Weir's fishery with its
 * pier stopping mid-channel and four springs of flood stakes marching
 * up the bank (J18); the crab bank left exactly as the first mark for
 * a beginner was; the berry banks in open sun south of the bridge,
 * and the two poles the village kept at the bridge's west foot
 * (ruling 9).
 *
 * SCENES / BOXES (brief §3; pairwise disjoint, so the nested stakes
 * box and the poles-versus-works overlap the brief drew are cut apart
 * here: the fishery stops at y52, the reach's verge and the stakes
 * share y53..62 across x149/150, the poles stand at x155..159 y108..117
 * and the works' box ends at x154 on those rows):
 *   D10 WEIR'S FISHERY + THE PIER (140,28)-(159,52)
 *   D10 THE FLOOD STAKES (150,53)-(159,62)
 *   D10 WEIR'S REACH, the sign's verge (140,53)-(149,62)
 *   D11 THE CRAB BANK (160,14)-(191,82)
 *   D12 THE BRIDGE'S POLES (155,108)-(159,117)
 *   D12 THE BERRY BANKS (146,118)-(159,149)
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G2-G6 water/bridge/ford/pier/shoulders, G24 water way (north part),
 *   G25 Weir's yard, G41 sand
 * SIGNS IT QUEUES (strings FINAL in pins.SIGN_LEDGER):
 *   WEIR'S REACH (140,55), THE CRAB BANK (176,70) Signposts
 * CAST HOOKS (kept open; people.ts places the bodies):
 *   keepOut [150,53,159,60]; Weir post (156.5,46.5) / wander (152.5,48.5)
 *   r2 / night path (152,45) (151,42) (150,36) / bed (141,34); day ward
 *   post (151.5,112.5); mudcrab spawn centres (174.5,44.5) (180.5,60.5)
 *   on sand; TimberPosts (158,58) (156,57) (154,56) (152,55) (J18);
 *   BannerPole (155,108) (155,116) kept, (166,108) (166,116) CUT.
 *
 * Placed here by the brief's word though they stand in another box of
 * this lane: the upstream BerryBush (154,92) (D14's box) and the two
 * far FishingSpots (161,128) (159,190) (the last lies in D21's box;
 * granary.ts places nothing on that tile). The willows (165,78)
 * (156,168) (164,204) are gate.ts's, granary.ts's and quiet.ts's.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates authored open; wear is a wobbling one-wide Dirt line
 * or an ellipse, never a rectangle; one Signpost per eyeful. Never
 * b.sign / b.actor / b.npcSpawn / b.scatter* / b.spawn / b.raise /
 * b.stairs, or b.setDetail on open ground. CONTENT BOUNDARY holds; no
 * dashes in any player-facing string.
 */
import { Detail, Tile, awningTile, herbBundlesDetail, sillHerbsDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function waterside(ctx: DawnCtx): void {
  const { b } = ctx;

  ctx.box(140, 28, 159, 52, "D10 WEIR'S FISHERY + THE PIER");
  ctx.box(150, 53, 159, 62, 'D10 THE FLOOD STAKES');
  ctx.box(140, 53, 149, 62, "D10 WEIR'S REACH (the sign's verge)");
  ctx.box(160, 14, 191, 82, 'D11 THE CRAB BANK');
  ctx.box(155, 108, 159, 117, "D12 THE BRIDGE'S POLES");
  ctx.box(146, 118, 159, 149, 'D12 THE BERRY BANKS');

  // ================================================================
  // D10 WEIR'S FISHERY — THE HOUSE AND YARD (the one calm district).
  // SENTENCE: everything a river gives you and everything you give
  // back; the second weir because the water is up a finger.
  // ================================================================
  // Weir's house: one room with its door on the east, toward the
  // water, because he goes to the pier before he goes anywhere.
  b.building(140, 32, 11, 9, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 'e', at: 4 }],
    windows: [{ side: 's', at: 4 }, { side: 'w', at: 4 }, { side: 'n', at: 6 }],
  });
  ctx.door(150, 36);
  // His bed, head north against the west wall (PIN: the lie tile is
  // (141,34), staged from (141,35)).
  b.set(141, 33, Tile.Bed).set(141, 34, Tile.Bed);
  // The cabinet holds the hooks he has not lost yet.
  b.set(144, 33, Tile.Cabinet);
  // The hearth dries boots more than it cooks.
  b.set(141, 38, Tile.Hearth);
  // One table and one chair by the door: he eats looking at the water.
  b.set(148, 34, Tile.Table).set(148, 35, Tile.Chair);
  // The indoor withy store: the split rods he weaves on wet nights.
  b.set(148, 38, Tile.WithyStore);
  // A round rug on the floor's middle, and the mat where the boots stop.
  b.setDetail(143, 36, Detail.RugRound);
  b.setDetail(149, 36, Detail.Doormat);
  // Herbs hung from the north beam; sill herbs on the south window.
  b.setDetail(145, 32, herbBundlesDetail(0));
  b.setDetail(144, 40, sillHerbsDetail(0));
  // The awning on the south wall (host law: (142,41) (143,41) sit under
  // the wall run y40), a shed roof where the day's nets hang to drip.
  b.set(142, 41, awningTile('shed', 7)).set(143, 41, awningTile('shed', 7));

  // The yard (G25): the bench is where the whole trade actually happens.
  // The mending bench, mid-repair; it is always mid-repair.
  b.set(141, 43, Tile.MendingBench);
  // Two net frames with the nets stretched to dry.
  b.set(143, 43, Tile.NetFrame).set(145, 43, Tile.NetFrame);
  // The first weir's panels, woven last spring, stacked by the frames.
  b.set(148, 43, Tile.WeirPanels);
  // The fish rack and the drying rack along the west fence line.
  b.set(140, 46, Tile.FishRack).set(140, 48, Tile.DryingRack);
  // The smoke tripod at the yard's south-west corner, downwind of the door.
  b.set(140, 51, Tile.SmokeTripod);
  // A catch basket by the racks and a fish trap by the tripod.
  b.set(143, 46, Tile.CatchBasket).set(143, 51, Tile.FishTrap);
  // The outdoor withy store: rods soaking for the next panel.
  b.set(145, 49, Tile.WithyStore);
  // The harpoon rack: for the pike that takes the line off the pier.
  b.set(148, 46, Tile.HarpoonRack);
  // The lure pole by the skiff, feathers and tin.
  b.set(150, 51, Tile.LurePole);
  // The skiff hauled out and its mooring post: he rows the far bank
  // for the crabs' shells when Berrit asks.
  b.set(155, 51, Tile.BeachedSkiff).set(156, 52, Tile.MooringPost);
  // A barrel and a crate stack at the yard's east edge: salt and boxes.
  b.set(151, 43, Tile.Barrel).set(152, 44, Tile.CrateStack);
  // The shell bench where the crabs are cleaned, and the stool he
  // sits on to do it.
  b.set(146, 52, Tile.ShellBench).set(150, 48, Tile.WoodStool);
  // Two more mooring posts: the north one for a visitor's boat, the
  // south one for the skiff when the water is up.
  b.set(153, 42, Tile.MooringPost).set(153, 52, Tile.MooringPost);
  // NEW (J18): the second weir's panels, at the bank north of the pier.
  // The brook came up over the first weir's stakes; he is weaving the
  // next one taller.
  b.set(156, 42, Tile.WeirPanels);
  // Pebbles the river left on the yard's trodden dirt.
  ctx.detail(147, 45, Detail.Pebbles);
  ctx.detail(149, 50, Detail.Pebbles);
  ctx.detail(144, 52, Detail.Pebbles);
  ctx.detail(142, 49, Detail.Pebbles);
  ctx.detail(146, 47, Detail.Pebbles);
  // The willow leaning over the shallows north of the yard, clear of
  // every path and node (verbatim; it stands in the water's edge).
  b.set(156, 34, Tile.TreeWillow);
  ctx.occluder(156, 34);

  // SIGN: WEIR'S REACH, on the verge south of the yard (kept).
  const reach = ctx.pins.SIGN_LEDGER.weirs_reach;
  ctx.sign(reach.x, reach.y, reach.title, reach.lines, reach.tile);

  // ================================================================
  // D10 THE PIER.
  // SENTENCE: planks off the near bank over deep water, stopping
  // mid-channel; the waker's first line goes in here.
  // ================================================================
  // The Dock is G5's (PIN: never x >= 161). Two mooring posts, one on
  // the bank at the pier's root and one in the shallows off its head.
  b.set(154, 45, Tile.MooringPost).set(157, 44, Tile.MooringPost);
  // The catch basket at the pier's root, where the fish come off.
  b.set(154, 47, Tile.CatchBasket);
  // The keep pool: the morning's catch alive until Berrit sends.
  b.set(155, 44, Tile.KeepPool);
  // Fishing spots where the water sounds busiest (>= 3 PIN; the far
  // two are D12's by the brief, placed here so the four are one list).
  b.set(161, 20, Tile.FishingSpot);
  b.set(159, 62, Tile.FishingSpot);
  b.set(161, 128, Tile.FishingSpot);
  b.set(159, 190, Tile.FishingSpot);
  for (const [x, y] of [[161, 20], [159, 62], [161, 128], [159, 190]] as const) ctx.station(x, y);
  // Weir's post on the dock (PIN): Weir is always on his pier.
  ctx.post(156, 46);

  // ================================================================
  // D10 THE FLOOD STAKES (ruling 12, J18).
  // SENTENCE: each spring Weir drives a stake at the high-water line on
  // the near bank below the pier; four springs stand in a line marching
  // up the bank away from the water, the newest furthest from it and
  // one row higher each, and that is the whole of "up a finger"
  // without a word.
  // ================================================================
  // The oldest, at the shallow's edge (shallow x160 at y58).
  b.set(158, 58, Tile.TimberPost);
  // The second spring, two cols in and one row up.
  b.set(156, 57, Tile.TimberPost);
  // The third.
  b.set(154, 56, Tile.TimberPost);
  // This spring's, the newest and the highest: the water is up a finger.
  b.set(152, 55, Tile.TimberPost);
  // Pebbles where the flood dropped them at the oldest and the newest.
  ctx.detail(157, 58, Detail.Pebbles);
  ctx.detail(153, 55, Detail.Pebbles);
  // The sagewort on the bank below the newest stake: the last of the
  // upstream pair (the berry bush (154,92) is the other).
  b.set(152, 60, Tile.WildSagewort);
  // The edge woods never take the bank the record is written on.
  ctx.keepOut(150, 53, 159, 60, "Weir's flood stakes");

  // ================================================================
  // D11 THE CRAB BANK (untouched: the first mark for a beginner stays
  // the calm one).
  // SENTENCE: the far shore spreads into sand shoals where the mudcrabs
  // sun themselves in the OPEN, readable from the near bank.
  // ================================================================
  // Two shell middens: the crabs' own leavings, and Weir's.
  b.set(170, 26, Tile.ShellMidden).set(183, 50, Tile.ShellMidden);
  // The reed shelter between the pools: shade a crab will fight for.
  b.set(178, 36, Tile.ReedShelter);
  // Two rocks the bank was made round.
  b.set(185, 42, Tile.Rock).set(168, 54, Tile.Rock);
  // Pebbles on the sand where the water sorts them.
  ctx.detail(172, 42, Detail.Pebbles);
  ctx.detail(178, 48, Detail.Pebbles);
  ctx.detail(176, 56, Detail.Pebbles);
  ctx.detail(170, 34, Detail.Pebbles);
  // Long grass at the sand's edges, where the bank is still a bank.
  b.set(186, 30, Tile.GrassTall).set(167, 44, Tile.GrassTall);
  b.set(188, 62, Tile.GrassTall).set(172, 68, Tile.GrassTall);
  // The one oak on the bank's south end, above the sign.
  b.set(186, 76, Tile.TreeOak);
  ctx.occluder(186, 76);
  // SIGN: THE CRAB BANK (kept), 14 rows north of the wold hedge's top.
  const crab = ctx.pins.SIGN_LEDGER.crab_bank;
  ctx.sign(crab.x, crab.y, crab.title, crab.lines, crab.tile);

  // ================================================================
  // D12 THE BRIDGE'S POLES (ruling 9).
  // SENTENCE: carts pull onto the verge to pass on the bridge's
  // approach, and the two poles the village kept mark the crossing
  // from the west bank. The east pair (166,108) (166,116) are CUT.
  // ================================================================
  b.set(155, 108, Tile.BannerPole).set(155, 116, Tile.BannerPole);
  // The lane's east lamp at the works' end, on the bank at the
  // bridge's west foot. FIX PASS 2: the shipped tile (157,109) is the
  // brook's west shallow (brookX(109) = 159), so the shipped lamp was
  // buried by water and never stood; it stands one tile west on
  // ground, and the S2 cadence reads (156) on y109 (its y115 partner
  // never existed).
  b.set(156, 109, Tile.LampPost);
  ctx.occluder(156, 109);
  // The day ward's post on the lane at the bridge's west foot (PIN).
  ctx.post(151, 112);

  // ================================================================
  // D12 THE BERRY BANKS (kept).
  // SENTENCE: the foraging lesson in open sun on the near bank south of
  // the bridge, where Berrit sends you: berries, the tall fibre plants,
  // sagewort and moonbell, each standing in the open with a cardinal
  // tile free and nothing tall on the two rows south of it.
  // ================================================================
  // Seven bushes staggered down the bank (>= 6 PIN), never a row.
  for (const [x, y] of ctx.pins.TEACHING.berryBushes) {
    if (y >= 118) b.set(x, y, Tile.BerryBush);
  }
  // The eighth, upstream in the works' grass north of the forge, so the
  // wanderer who never comes south still finds one (the brief places
  // it here; it stands in D14's box of this same lane).
  b.set(154, 92, Tile.BerryBush);
  // Three fibre plants for boards_and_twine, tall in the open.
  for (const [x, y] of ctx.pins.TEACHING.fibrePlants) b.set(x, y, Tile.FibrePlant);
  // Sagewort at the bank's head and its middle.
  b.set(150, 118, Tile.WildSagewort).set(155, 135, Tile.WildSagewort);
  // Moonbell at the bank's foot above the ford's approach.
  b.set(147, 148, Tile.WildMoonbell);
  // Two tufts where the bank is walked between the bushes.
  ctx.detail(151, 124, Detail.Tuft);
  ctx.detail(148, 139, Detail.Tuft);
}

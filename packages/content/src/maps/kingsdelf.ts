import { Tile } from '@arx/shared';
import { KINGSDELF_RECT } from '../geography.js';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * KINGSDELF — the town in the King's Delf (the seventh town; the
 * Kingsdelf epic, docs/kingsdelf-plan.md). Level 50-60: the Overband's
 * town.
 *
 * The delf cut the Old Crown's stone until the Brandfall ended the old
 * realm a hundred and fifty years ago; the Silver Line's first king
 * was foreman here the day the deep workings were sealed with the
 * night shift inside — 214 names on the stone, 215 marks. Eighteen
 * years ago the Returning came back down the unlit road for the ore
 * the fire seeded, and the town stands INSIDE the quarry: the
 * mountain's toe closes the north as two worked crag shelves, the
 * benches and the floor descend southward, and the Ashmere — the
 * drowned lower workings — receives the south-west, quay and all.
 *
 * THE ECONOMY: ore and glass and light. Mithril and adamant in the
 * town's own Delfworks faces (the only safe high-ore in the game);
 * obsidian and starfall OUT in the burn at Overband prices; starfall
 * glass from the Glasshouse; cut stone as ever. It buys everything
 * else: Amberford grain, Pinewatch boards, Hartfell tallow for the
 * lamps. THE LIMITS: no loom, no crops, no chapel, no castle, no
 * sawmill. The bank is the Charter's countinghouse built against the
 * east shelf's rock face.
 *
 * THE TOWN-PLAN LAW (Amberford's, restated): streets first; every
 * building fronts a street or the round; >=3 open tiles between
 * structures; ROOM INTENT — one job per room, furniture proves it.
 * Materials: mortared ashlar out of the delf itself — stone walls,
 * stone floors; timber is an import the town spends like spice.
 * DIAGONAL BUDGET: five statements — the east gate tower pair, the
 * Glasshouse kiln, the Countinghouse face, the Sealed Stair front,
 * the crane base by the Unfinished Stone. All else honest and blocky.
 *
 * THE WATERS: the Ashmere owns the south-west; the south curtain's
 * west end dies into it (the mole law) and the quay works the shore
 * OUTSIDE the water gate. The Sump — the cold spring that made the
 * pocket livable — rises on the floor east of the round and spends
 * itself south toward the mere without ever piercing the curtain
 * (the tailrace law: the run stops at the wall; the fiction owns the
 * culvert).
 *
 * ANCHORS THAT MUST NOT MOVE (routes + tests pin these):
 *  - EAST GATE: the Old Road lands at local (126,20) (world -194,260);
 *    mouth fill rows 19-21 reach the border; the curtain gate stands
 *    at x121 with the tower pair flanking.
 *  - NORTH WICKET: the Processional leaves at local (60,0) (world
 *    -260,240) through the notch between the crag shelves.
 *  - Zone spawn (62.5, 65.5) on the market round beside the
 *    Unfinished Stone = the south-west's respawn hearth.
 *  - The Unfinished Stone (55-59, 61-64); the Sealed Stair front
 *    against the west shelf face (34-40, 25-27), names-stone beside.
 *  - The Countinghouse against the east shelf face (84-96, 17-27);
 *    vault room windowless; BankChest x2 = the bank probes.
 *
 * THE PEOPLE (the casting pass keeps this roster; rooms are promised
 * here): delfmaster_ruen (the Delfhall), factor_venn (Countinghouse),
 * sealkeeper_annik (the keeper hut by the Sealed Stair),
 * innkeep_brekka (the Foreman's Rest), stablemaster_orin (the
 * Beastyard), smith_ferrun (the Starfall Forge), glasswright_mirena
 * (the Glasshouse), enchanter_veyle (the Focus House), assayer_lorn
 * (the assay house), lampwright_soren (the Flamehouse, west shelf),
 * waykeeper_liv (the east gate post), surveyor_hedda (lodges at the
 * Rest), provisioner_etta + outfitter_cass (the round's shops),
 * salvewright_ida (the dispensary), fisher_denna (the quay shack),
 * broker_slate (the hatch — placed with the Company pass),
 * kingsdelf_watch x4, kingsdelf_delver x3, kingsdelf_glasshand x2.
 */

const R = KINGSDELF_RECT;

export function buildKingsdelf(): ZoneDef {
  const b = new ZoneBuilder('kingsdelf', 'Kingsdelf', { x: R.x, y: R.y }, R.w, R.h, Tile.Grass);

  // ---------------------------------------------------------------
  // THE WATERS FIRST — the Ashmere decides the south-west. The
  // drowned workings lap into the corner as a broad grey arm: deep
  // past the old bench line, wading over the sunken spoil, ash-silt
  // sand at the beach. The wobble keeps every ruler off the
  // waterline (the Hartfell law).
  // ---------------------------------------------------------------
  for (let y = 56; y < R.h; y++) {
    const reach = y - 56 + Math.round(Math.sin(y * 0.65) * 1.6);
    const edge = Math.max(0, Math.min(R.w - 1, reach));
    for (let x = 0; x <= edge; x++) {
      b.set(x, y, x <= edge - 4 ? Tile.Water : Tile.WaterShallow);
    }
    if (edge + 1 < R.w && b.get(edge + 1, y) === Tile.Grass) b.set(edge + 1, y, Tile.Sand);
  }
  // The west flank strand above the arm: sand where meadow meets it.
  for (let y = 50; y <= 55; y++) {
    const s = Math.round(Math.sin(y * 0.5));
    for (let x = 0; x <= 1 + s; x++) {
      if (b.get(x, y) === Tile.Grass) b.set(x, y, Tile.Sand);
    }
  }

  // ---------------------------------------------------------------
  // THE WORKING FACE — the mountain's toe closes the north as two
  // raised crag shelves; their auto-fenced cliffs ARE the north
  // wall. Between them the wicket notch stays at grade: the
  // Processional's door, walled by living rock on both hands. Each
  // shelf steps L2 crown -> L1 walk -> floor by south flights (the
  // stair law), so the upper town is real ground, not backdrop.
  // ---------------------------------------------------------------
  b.raise(2, 2, 54, 22, 1); // west shelf walk: lx 2-55, ly 2-23
  b.raise(2, 2, 54, 10, 2); // west shelf crown: ly 2-11
  b.raise(66, 2, 60, 14, 1); // east shelf walk: lx 66-125, ly 2-15
  b.raise(66, 2, 60, 8, 2); // east shelf crown: ly 2-9
  // Flights. West: crown->walk at the Flamehouse court, walk->town
  // twice (the Bench Stair by the Sealed Stair, the West Stair by
  // the Delfworks). East: crown->walk at the lookout, walk->town
  // above the Countinghouse court.
  b.stairs(26, 11).stairs(27, 11).stairs(28, 11);
  b.stairs(26, 23).stairs(27, 23).stairs(28, 23);
  b.stairs(46, 23).stairs(47, 23).stairs(48, 23);
  b.stairs(100, 9).stairs(101, 9).stairs(102, 9);
  b.stairs(74, 15).stairs(75, 15).stairs(76, 15);
  b.stairs(108, 15).stairs(109, 15).stairs(110, 15);

  // ---------------------------------------------------------------
  // THE STREETS — laid before anything was allowed to stand on them.
  // ---------------------------------------------------------------
  // The Processional's town half FIRST (dirt yields to paving where
  // the streets cross it — the town maintains its stone): dirt from
  // the wicket, down the notch, dying into the Market Walk.
  b.fillRect(59, 0, 3, 24, Tile.Dirt);
  b.path({ x: 60, y: 24 }, { x: 60, y: 44 }, 2, Tile.Dirt);
  // The Gate Street: the east gate west under the shelf, then the
  // Descent south to the round.
  b.path({ x: 124, y: 20 }, { x: 70, y: 20 }, 3);
  b.path({ x: 70, y: 20 }, { x: 70, y: 60 }, 3);
  // The Market Walk: Delfworks to Glasshouse across the floor.
  b.path({ x: 26, y: 44 }, { x: 96, y: 44 }, 2);
  // The Floor Lane: the round south-west to the water gate.
  b.path({ x: 62, y: 70 }, { x: 45, y: 84 }, 2);
  // The east gate mouth: paving reaches the border so the Old Road
  // lands tile-exact at (126,20).
  b.fillRect(122, 19, 6, 3, Tile.Path);

  // ---------------------------------------------------------------
  // THE MARKET ROUND + THE UNFINISHED STONE — the one image. The
  // monument block the old realm never finished: crisp chisel
  // lines, rotted rope stubs, and a town that grew around it the
  // way a town grows around a well. Nobody will finish it and
  // nobody will break it.
  // ---------------------------------------------------------------
  b.fillEllipse(61, 65, 12, 8, Tile.StoneFloor);
  b.fillRect(55, 61, 5, 4, Tile.Rock); // the Stone itself — solid, climbless
  b.set(54, 62, Tile.PillarStone).set(60, 64, Tile.PillarStone); // the sheer-legs stubs
  b.sign(53, 66, 'THE UNFINISHED STONE', [
    'the last order of the old crown',
    'never countermanded',
    'mind your barrows around it',
  ], Tile.Signpost);
  // The crane base: the old mast crane's octagon footing, the round's
  // second statement — a diagonal-budget spend.
  b.set(68, 60, Tile.PillarStone).set(69, 60, Tile.PillarStone);
  b.set(67, 61, Tile.PillarStone).set(70, 61, Tile.PillarStone);
  b.set(68, 62, Tile.PillarStone).set(69, 62, Tile.PillarStone);

  // ---------------------------------------------------------------
  // THE SUMP — the cold spring that made the pocket livable. It
  // rises east of the round, pools, and spends itself south toward
  // the mere; the run stops inside the curtain (the tailrace law).
  // Pale sump-fish live in the pool and nowhere else.
  // ---------------------------------------------------------------
  b.fillEllipse(84, 72, 4, 3, Tile.WaterShallow);
  b.fillEllipse(84, 72, 2, 1.4, Tile.Water);
  const SUMP_RUN: Array<[number, number]> = [
    [83, 75], [82, 76], [82, 77], [81, 78], [81, 79], [80, 80], [80, 81], [79, 82], [79, 83],
  ];
  for (const [x, y] of SUMP_RUN) b.set(x, y, Tile.WaterShallow);
  b.set(80, 69, Tile.Bench).set(88, 71, Tile.Bench);
  b.sign(88, 75, 'THE SUMP', [
    'the one sweet water in the ash',
    'wash downstream of the drinking steps',
  ], Tile.Signpost);

  // ---------------------------------------------------------------
  // THE CURTAIN — ashlar on the open sides, living rock on the
  // north, and the west end standing in the Ashmere (the mole law).
  // Three ways in: the east gate (the Old Road), the north wicket
  // (the Processional), and the water gate to the quay.
  // ---------------------------------------------------------------
  // East curtain: from the east shelf's cliff corner down to the
  // south wall, with the Old Road gate at rows 19-21.
  for (let y = 16; y <= 86; y++) b.set(121, y, Tile.WallGarrison);
  b.set(121, 19, Tile.GateGarrison).set(121, 20, Tile.GateGarrison).set(121, 21, Tile.GateGarrison);
  // South curtain: east corner to the water, the west end standing
  // in deepened water (the mole law again — no wading route around
  // the quay).
  for (let x = 27; x <= 121; x++) b.set(x, 86, Tile.WallGarrison);
  for (let y = 83; y <= 88; y++) {
    for (let x = 22; x <= 26; x++) {
      if (b.get(x, y) !== Tile.WallGarrison) b.set(x, y, Tile.Water);
    }
  }
  b.set(44, 86, Tile.GateGarrison).set(45, 86, Tile.GateGarrison).set(46, 86, Tile.GateGarrison);
  // West flank curtain: the shelf cliff's foot down INTO the mere —
  // the mole law: the wall's last stones stand wet, and the water at
  // both moles is DEEP (the Hartfell bay law: cold water, not a
  // wading route — the old bench drops sheer where the walls end,
  // because the walls end where the old bench dropped).
  for (let y = 24; y <= 63; y++) b.set(6, y, Tile.WallGarrison);
  for (let y = 59; y <= 66; y++) {
    for (let x = 0; x <= 8; x++) {
      if (b.get(x, y) !== Tile.WallGarrison) b.set(x, y, Tile.Water);
    }
  }
  // The wicket bar: cliff to cliff across the whole notch — the
  // notch is barred at night; the dead walk the Processional and the
  // braziers never go out.
  for (let x = 56; x <= 65; x++) b.set(x, 2, Tile.WallGarrison);
  b.set(59, 2, Tile.GateGarrison).set(60, 2, Tile.GateGarrison).set(61, 2, Tile.GateGarrison);
  b.set(57, 4, Tile.Brazier).set(64, 4, Tile.Brazier);
  // Gate fires and words.
  b.set(123, 17, Tile.Brazier).set(123, 23, Tile.Brazier);
  b.set(42, 88, Tile.Brazier).set(48, 88, Tile.Brazier);
  b.sign(124, 23, 'KINGSDELF', [
    'the old road is not lit',
    'be inside when the horn goes',
  ], Tile.Signpost);
  b.sign(58, 6, 'THE PROCESSIONAL', [
    'the old way to the old crown',
    'the dead walk it home by night',
    'bar goes down at dusk',
  ], Tile.Signpost);
  b.sign(48, 82, 'THE QUAY', [
    'boats out by the horn',
    'what the net holds, the assay sees',
  ], Tile.Signpost);

  // Spawn on the round beside the Stone — the south-west's hearth.
  b.spawn(62.5, 65.5);

  return b.build();
}

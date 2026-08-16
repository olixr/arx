import { TILE_SKIP, Tile } from '@arx/shared';
import type { PrefabDef } from '../maps/prefab.js';
import { at, blob, canvas, finish, put, route, ruinRect, scatter, seedOf, track } from './canvas.js';
import { declareInfluence } from './influence.js';
import {
  beastPen,
  brazierWalk,
  cageRow,
  cairn,
  drillYard,
  drumRing,
  dryingGround,
  feastTrestles,
  fireCircle,
  kelpGarth,
  keepRow,
  kerbMound,
  lureWay,
  mendingRow,
  ossuaryRun,
  reedHamlet,
  ribShrine,
  saltGarth,
  spoilYard,
  standardRow,
  tentCluster,
  totemRow,
  trenchScar,
  watchKnoll,
} from './modules.js';

/**
 * THE LANDMARKS (the hybrid charter) — expansive pre-authored POIs,
 * 3-5× the ordinary camp's footprint (the shelf's median is 14 tiles
 * across; these run 60-68), built for EXPLORATION: loose clusters,
 * open ground between them, a heart worth walking to. They are the
 * authored half of the clusters-of-clusters vision — the procedural
 * scaffold decides WHERE one stands; what stands there is curated.
 *
 * Authored the Foundry way: deterministic builders at PINNED seeds —
 * the same artifact forever, validated at build, seeded to
 * data/prefabs at boot (FILE WINS — Map Studio polish sticks). The
 * interiors are PAINTED ground (the claimed-yard lesson: transparent
 * hearts get swallowed by whatever wilderness the site lands on);
 * only the fringes stay meadow.
 *
 * No spawn markers — a POI's bodies come from its def's garrison,
 * composed semantically (holdfasts inside, sentries on the approach).
 */

// The painting toolkit lives on the shared canvas (canvas.ts) since
// THE PEOPLED LANDMARKS — the module shelf draws with the same hand.

// --------------------------------------------------------------------
// THE GREAT BARROWFIELD (dead) — rows of kerbed mounds on open turf, a
// stone processional walking north to the great barrow's open door.
function buildBarrowfield(): PrefabDef {
  const c = canvas(66, 50);
  const rng = seedOf('poi_barrowfield_great');
  // The turf: one broad meadow blob, tufted.
  blob(c, 33, 25, 29, Tile.Grass, rng, 0);
  for (let i = 0; i < 90; i++) {
    const x = rng.int(4, 61);
    const y = rng.int(4, 45);
    if (at(c, x, y) === Tile.Grass && rng.chance(0.8)) put(c, x, y, Tile.GrassTall);
  }
  // Barrow rows: kerbed mounds, some levered open (the robbed ones).
  const mounds: Array<[number, number]> = [];
  for (const [mx, my] of [
    [12, 12], [24, 14], [37, 12], [50, 14],
    [10, 24], [22, 27], [48, 26], [56, 22],
    [14, 37], [27, 40], [40, 38], [53, 38],
  ] as const) {
    mounds.push([mx, my]);
    const opened = rng.chance(0.4);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const edge = Math.abs(dx) === 3 || Math.abs(dy) === 2;
        if (edge) {
          if (opened && dy === 2 && Math.abs(dx) <= 1) put(c, mx + dx, my + dy, Tile.CaveRubble);
          else put(c, mx + dx, my + dy, Tile.Rock);
        } else if (dx === 0 && dy === 0) {
          put(c, mx, my, Tile.BonePile);
        }
      }
    }
    if (opened) scatter(c, mx, my + 4, 3, 2, [Tile.BonePile, Tile.CaveRubble], rng);
  }
  // The great barrow: a double kerb, an arch standing open, the cache.
  ruinRect(c, 27, 17, 39, 27, Tile.Rock, Tile.CaveRubble, rng, 0.08);
  for (let y = 19; y <= 25; y++) for (let x = 29; x <= 37; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 33, 27, Tile.ArchStone);
  put(c, 33, 20, Tile.ChestIron);
  put(c, 30, 20, Tile.Brazier);
  put(c, 36, 20, Tile.Brazier);
  // The processional: pillar pairs walking from the south fringe —
  // and the wardens' watch-lights burning between them (vigil posts:
  // the peopled charter gives the rows their grave-watch).
  for (const py of [46, 41, 36, 31] as const) {
    put(c, 30, py, Tile.PillarStone);
    put(c, 36, py, Tile.PillarStone);
  }
  put(c, 30, 38, Tile.Brazier);
  put(c, 36, 33, Tile.Brazier);
  put(c, 14, 20, Tile.Brazier);
  put(c, 52, 30, Tile.Brazier);
  track(c, 33, 47, 33, 28, rng);
  // Tracks wander mound to mound — grave-tenders kept their rounds.
  for (const [mx, my] of mounds) if (rng.chance(0.6)) track(c, mx, my + 3, 33, 34, rng);
  scatter(c, 33, 25, 26, 14, [Tile.BonePile, Tile.Rock], rng);
  // The round the wardens still keep: up the processional, along the
  // rows, standing a spell at the kerbs — the dead don't sit.
  route(c, [
    { dx: 33, dy: 46 },
    { dx: 33, dy: 40 },
    { dx: 33, dy: 32, dwell: 60 },
    { dx: 36, dy: 28 },
    { dx: 44, dy: 26 },
    { dx: 50, dy: 20, dwell: 80 },
    { dx: 40, dy: 16 },
    { dx: 28, dy: 13, dwell: 60 },
    { dx: 16, dy: 16 },
    { dx: 12, dy: 24, dwell: 80 },
    { dx: 18, dy: 34 },
    { dx: 27, dy: 41 },
  ]);
  return finish(c, 'poi_barrowfield_great', 'The great barrowfield');
}

// --------------------------------------------------------------------
// THE FALLEN KEEP (dead) — a curtain wall that lost its war, a husk of
// a keep still holding its floor, and the wood eating the courtyard.
function buildGreatkeep(): PrefabDef {
  const c = canvas(62, 48);
  const rng = seedOf('poi_ruin_greatkeep');
  blob(c, 31, 24, 27, Tile.Grass, rng, 0);
  // The curtain: broken badly on the south and east.
  ruinRect(c, 8, 7, 53, 40, Tile.WallStone, Tile.CaveRubble, rng, 0.3);
  // Corner towers; the southeast one came down whole.
  for (const [tx, ty, fallen] of [
    [8, 7, false], [53, 7, false], [8, 40, false], [53, 40, true],
  ] as const) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        put(c, tx + dx, ty + dy, fallen ? Tile.CaveRubble : Tile.WallStone);
      }
    }
  }
  // The courtyard: worn floor going back to weed.
  for (let y = 9; y <= 38; y++) {
    for (let x = 10; x <= 51; x++) {
      if (at(c, x, y) === Tile.Grass && rng.chance(0.3)) {
        put(c, x, y, rng.chance(0.7) ? Tile.Dirt : Tile.GrassTall);
      }
    }
  }
  // The keep husk: floor intact, roof long gone, the cache inside.
  ruinRect(c, 24, 13, 38, 24, Tile.WallStone, Tile.CaveRubble, rng, 0.16);
  for (let y = 14; y <= 23; y++) for (let x = 25; x <= 37; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 31, 24, Tile.DoorwayStone);
  put(c, 31, 15, Tile.ChestIron);
  put(c, 27, 15, Tile.Brazier);
  put(c, 35, 15, Tile.Brazier);
  put(c, 26, 21, Tile.PillarStone);
  put(c, 36, 21, Tile.PillarStone);
  // The garrison's old racks still stand their wall — the unrelieved
  // watch drills against nobody (the peopled charter's drill posts).
  put(c, 26, 18, Tile.WeaponRack);
  put(c, 36, 18, Tile.SpearRack);
  // Gate-lights on the south breach: the watch keeps its door lit.
  put(c, 27, 38, Tile.Brazier);
  put(c, 35, 38, Tile.Brazier);
  // The gate the road remembers: a gap in the south run, rubble-flanked.
  for (const gx of [29, 30, 31, 32, 33] as const) put(c, gx, 40, Tile.Dirt);
  track(c, 31, 45, 31, 25, rng);
  scatter(c, 31, 24, 20, 18, [Tile.CaveRubble, Tile.Rock, Tile.BonePile], rng);
  scatter(c, 31, 30, 14, 8, [Tile.GrassTall], rng);
  // The unrelieved watch: the courtyard circuit past every breach,
  // held longest at the gate and the keep door.
  route(c, [
    { dx: 31, dy: 44 },
    { dx: 31, dy: 38, dwell: 60 },
    { dx: 31, dy: 28 },
    { dx: 24, dy: 26 },
    { dx: 14, dy: 24, dwell: 80 },
    { dx: 13, dy: 12 },
    { dx: 24, dy: 11 },
    { dx: 31, dy: 11, dwell: 60 },
    { dx: 38, dy: 11 },
    { dx: 48, dy: 13 },
    { dx: 49, dy: 25, dwell: 80 },
    { dx: 44, dy: 36 },
    { dx: 37, dy: 38 },
    { dx: 31, dy: 39 },
  ]);
  return finish(c, 'poi_ruin_greatkeep', 'The fallen keep');
}

// --------------------------------------------------------------------
// THE GOBLIN SPRAWL (goblin) — a tent city that never learned walls:
// five camp clusters on worn ground, paths braiding to the moot fire.
function buildGoblinSprawl(): PrefabDef {
  const c = canvas(68, 50);
  const rng = seedOf('poi_goblin_sprawl');
  blob(c, 34, 25, 30, Tile.Grass, rng, 0);
  const heart: [number, number] = [34, 25];
  blob(c, heart[0], heart[1], 6, Tile.Dirt, rng, 0.1);
  put(c, heart[0], heart[1], Tile.Bonfire);
  put(c, heart[0] - 3, heart[1] - 2, Tile.WarDrum);
  put(c, heart[0] + 3, heart[1] - 2, Tile.SkullTotem);
  // The heart fire pours and discards: the sprawl's shared tub on
  // one hand, five camps' worth of gnawed dinners on the other.
  put(c, 37, 27, Tile.GrogTub);
  put(c, 30, 27, Tile.BoneMidden);
  const clusters: Array<[number, number]> = [
    [14, 12], [50, 11], [56, 32], [16, 36], [36, 40],
  ];
  clusters.forEach(([kx, ky], ci) => {
    blob(c, kx, ky, 6, Tile.Dirt, rng, 0.2);
    const tents = ci === 0 ? 4 : rng.int(3, 4);
    for (let i = 0; i < tents; i++) {
      const a = (i / tents) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const tx = Math.round(kx + Math.cos(a) * 4);
      const ty = Math.round(ky + Math.sin(a) * 3);
      put(c, tx, ty, ci === 0 && i === 0 ? Tile.TentWar : Tile.TentHide);
    }
    put(c, kx, ky, Tile.Campfire);
    scatter(c, kx, ky, 5, 3, [Tile.SkullPile, Tile.MeatRack, Tile.WarBanner], rng);
    track(c, kx, ky + 1, heart[0], heart[1] + 1, rng);
  });
  // The chief's cluster keeps the cache and a cage of the unlucky —
  // inside the trampled ring, under the war tent's eye. The southeast
  // camp sleeps one outside the hides (a sprawl always outgrows its
  // tents before it raises new ones).
  put(c, 12, 10, Tile.ChestIron);
  put(c, 17, 14, Tile.PrisonCage);
  put(c, 58, 36, Tile.RagNest);
  // A worg pen gone half to ruin on the east side — the stake still
  // stands with its collar thrown open on the ground: the pen is
  // ruined BECAUSE the worg left, and nobody has argued with it since.
  ruinRect(c, 44, 20, 52, 26, Tile.Fence, Tile.BonePile, rng, 0.25);
  for (let y = 21; y <= 25; y++) for (let x = 45; x <= 51; x++) {
    if (at(c, x, y) === Tile.Grass) put(c, x, y, Tile.Dirt);
  }
  put(c, 48, 23, Tile.BeastNest);
  put(c, 46, 24, Tile.BeastStake);
  track(c, 48, 27, heart[0], heart[1], rng);
  scatter(c, 34, 25, 28, 20, [Tile.SkullPile, Tile.BonePile, Tile.WarBanner, Tile.MeatSpit], rng);
  // The sprawl's gossip round: camp to camp, a squat at every fire —
  // the patrol that eats five suppers a night.
  route(c, [
    { dx: 34, dy: 32 },
    { dx: 36, dy: 41, dwell: 100, sit: true },
    { dx: 26, dy: 38 },
    { dx: 16, dy: 35, dwell: 120, sit: true },
    { dx: 15, dy: 24 },
    { dx: 15, dy: 13, dwell: 100, sit: true },
    { dx: 24, dy: 12 },
    { dx: 34, dy: 18 },
    { dx: 44, dy: 13 },
    { dx: 50, dy: 12, dwell: 100, sit: true },
    { dx: 56, dy: 20 },
    { dx: 56, dy: 31, dwell: 100, sit: true },
    { dx: 46, dy: 30 },
    { dx: 34, dy: 26, dwell: 80 },
  ]);
  return finish(c, 'poi_goblin_sprawl', 'The goblin sprawl');
}

// --------------------------------------------------------------------
// THE KILL-FIELD (wolfkin) — where the pack drags what it takes: bone
// drifts, den mounds, hide racks, and a rib-ringed heart of trophies.
function buildKillfield(): PrefabDef {
  const c = canvas(64, 48);
  const rng = seedOf('poi_wolfkin_killfield');
  blob(c, 32, 24, 28, Tile.Grass, rng, 0);
  // Bone drifts: long smears of old kills.
  for (const [bx, by, br] of [
    [16, 14, 5], [44, 12, 4], [52, 28, 5], [20, 34, 4], [38, 36, 5],
  ] as const) {
    blob(c, bx, by, br, Tile.Dirt, rng, 0.3);
    scatter(c, bx, by, br + 1, 6, [Tile.BonePile, Tile.SkullPile], rng);
  }
  // Den mounds: rock lips over nests.
  for (const [dx, dy] of [
    [10, 22], [26, 10], [54, 18], [46, 40], [14, 42],
  ] as const) {
    for (let i = -2; i <= 2; i++) put(c, dx + i, dy - 1, Tile.Rock);
    put(c, dx - 2, dy, Tile.Rock);
    put(c, dx + 2, dy, Tile.Rock);
    blob(c, dx, dy + 1, 2, Tile.Dirt, rng, 0);
    put(c, dx, dy, Tile.BeastNest);
    track(c, dx, dy + 2, 32, 24, rng);
  }
  // The racks: hides and meat strung between posts.
  for (let i = 0; i < 4; i++) {
    put(c, 24 + i * 4, 28, i % 2 === 0 ? Tile.HideFrame : Tile.MeatRack);
  }
  // The heart: a rib-ring of skulls around the pack's hoard.
  blob(c, 32, 20, 5, Tile.Dirt, rng, 0.1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    put(c, Math.round(32 + Math.cos(a) * 4), Math.round(20 + Math.sin(a) * 3), Tile.SkullPile);
  }
  put(c, 32, 20, Tile.ChestIron);
  scatter(c, 32, 24, 26, 16, [Tile.BonePile, Tile.SkullPile], rng);
  // The pack walks its bounds: den to den, drift to drift, nose down
  // at every kill — no fires on this round.
  route(c, [
    { dx: 32, dy: 30 },
    { dx: 24, dy: 26, dwell: 60 },
    { dx: 16, dy: 22 },
    { dx: 12, dy: 14 },
    { dx: 24, dy: 12, dwell: 80 },
    { dx: 36, dy: 12 },
    { dx: 44, dy: 14, dwell: 60 },
    { dx: 52, dy: 22 },
    { dx: 52, dy: 30, dwell: 80 },
    { dx: 42, dy: 34 },
    { dx: 32, dy: 36, dwell: 60 },
    { dx: 22, dy: 36 },
    { dx: 22, dy: 32 },
  ]);
  return finish(c, 'poi_wolfkin_killfield', 'The kill-field');
}

// --------------------------------------------------------------------
// THE LOST WAYSTEAD (brigand) — a king's waystation the road forgot
// and the robbers remembered: broken yard, wagon ring, stores kept
// under a watch-mound with a torch that still burns.
function buildWaystead(): PrefabDef {
  const c = canvas(60, 46);
  const rng = seedOf('poi_brigand_waystead');
  blob(c, 30, 23, 26, Tile.Grass, rng, 0);
  // The old yard wall: timber, mostly down.
  ruinRect(c, 9, 8, 50, 38, Tile.Fence, Tile.CaveRubble, rng, 0.4);
  for (let y = 10; y <= 36; y++) {
    for (let x = 11; x <= 48; x++) {
      if (at(c, x, y) === Tile.Grass && rng.chance(0.25)) put(c, x, y, Tile.Dirt);
    }
  }
  // The stable husk, now the stores: wood walls, plunder inside.
  ruinRect(c, 14, 12, 27, 20, Tile.WallWood, Tile.CaveRubble, rng, 0.18);
  for (let y = 13; y <= 19; y++) for (let x = 15; x <= 26; x++) put(c, x, y, Tile.WoodFloor);
  put(c, 20, 20, Tile.DoorwayWood);
  put(c, 17, 14, Tile.ChestIron);
  put(c, 24, 14, Tile.PlunderSacks);
  put(c, 16, 18, Tile.Crate);
  put(c, 25, 18, Tile.Barrel);
  // The wagon ring: where the takes get sorted.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const wx = Math.round(38 + Math.cos(a) * 6);
    const wy = Math.round(27 + Math.sin(a) * 4);
    put(c, wx, wy, i % 3 === 0 ? Tile.PlunderSacks : i % 3 === 1 ? Tile.Crate : Tile.Barrel);
  }
  blob(c, 38, 27, 4, Tile.Dirt, rng, 0.15);
  put(c, 38, 27, Tile.Campfire);
  // Supper hangs by the fire — a road-agent's larder (cook posts).
  put(c, 40, 25, Tile.MeatSpit);
  // The watch-mound: high ground by the gate, torch and banner.
  blob(c, 44, 13, 4, Tile.Dirt, rng, 0);
  put(c, 44, 12, Tile.StandingTorch);
  put(c, 46, 14, Tile.WarBanner);
  put(c, 42, 14, Tile.TargetDummy);
  put(c, 46, 12, Tile.SpearRack);
  // The gate gap the road still finds.
  for (const gx of [28, 29, 30, 31] as const) put(c, gx, 38, Tile.Dirt);
  track(c, 29, 43, 29, 30, rng);
  track(c, 29, 30, 38, 27, rng);
  track(c, 29, 30, 20, 21, rng);
  scatter(c, 30, 23, 22, 12, [Tile.Crate, Tile.Barrel, Tile.CaveRubble], rng);
  // The waystead's round: gate, fire (a long sit with supper), the
  // watch-mound, the stores — a road-agent's honest working night.
  route(c, [
    { dx: 29, dy: 42 },
    { dx: 29, dy: 36, dwell: 60 },
    { dx: 36, dy: 30 },
    { dx: 39, dy: 28, dwell: 120, sit: true },
    { dx: 44, dy: 22 },
    { dx: 44, dy: 14, dwell: 100 },
    { dx: 36, dy: 14 },
    { dx: 26, dy: 16, dwell: 60 },
    { dx: 16, dy: 22 },
    { dx: 20, dy: 28 },
    { dx: 28, dy: 32 },
  ]);
  return finish(c, 'poi_brigand_waystead', 'The lost waystead');
}

// --------------------------------------------------------------------
// THE WARREN DOOR (goblin) — a warren dug into a rock hummock: the
// door is a cave mouth, and everything the warren does — sorting,
// cooking, keeping the unlucky — happens in the yard outside it.
function buildGoblinWarren(): PrefabDef {
  const c = canvas(54, 44);
  const rng = seedOf('poi_goblin_warren');
  blob(c, 27, 22, 24, Tile.Grass, rng, 0);
  // The hummock: a rock mass with one dug mouth, spoil fanning out.
  for (let y = 6; y <= 13; y++) {
    for (let x = 21; x <= 37; x++) {
      const d = Math.hypot(x - 29, y - 9);
      if (d < 6.5 + rng.range(-1, 1)) put(c, x, y, Tile.CaveWall);
    }
  }
  // The mouth: floor pocket, a cracked back wall (the warren goes on).
  for (let y = 10; y <= 14; y++) for (let x = 27; x <= 31; x++) put(c, x, y, Tile.CaveFloor);
  put(c, 29, 9, Tile.CrackedCaveWall);
  put(c, 29, 11, Tile.ChestIron);
  put(c, 27, 11, Tile.Brazier);
  // The doorkeeper's bed, just inside the mouth — warren goblins dig,
  // they don't pitch tents; somebody sleeps within arm's reach of
  // the take.
  put(c, 31, 13, Tile.RagNest);
  // Spoil heaps below the door — a warren never stops digging.
  blob(c, 24, 17, 3, Tile.Dirt, rng, 0.2);
  blob(c, 34, 17, 3, Tile.Dirt, rng, 0.2);
  scatter(c, 24, 17, 3, 4, [Tile.CaveRubble, Tile.Rock], rng);
  scatter(c, 34, 17, 3, 4, [Tile.CaveRubble, Tile.Rock], rng);
  // The door keeps its wards.
  put(c, 25, 14, Tile.SkullTotem);
  put(c, 33, 14, Tile.SkullTotem);
  // The yard: cook terrace, sorting ground, the cage row, the pen.
  fireCircle(c, 20, 22, rng, { pot: true, spit: true });
  // A warren never carries a bone back inside — the midden grows
  // an arm's throw from the cook terrace, downwind of nobody.
  put(c, 17, 23, Tile.BoneMidden);
  spoilYard(c, 38, 22, rng);
  cageRow(c, 16, 30, 2, rng);
  beastPen(c, 38, 30, 46, 36, 2, rng);
  // Watch stakes flank the south walk.
  put(c, 25, 36, Tile.StandingTorch);
  put(c, 31, 36, Tile.StandingTorch);
  track(c, 28, 42, 28, 15, rng);
  track(c, 28, 24, 21, 22, rng);
  track(c, 28, 26, 37, 23, rng);
  track(c, 28, 30, 18, 30, rng);
  track(c, 30, 30, 41, 32, rng);
  scatter(c, 27, 24, 22, 14, [Tile.SkullPile, Tile.BonePile, Tile.CaveRubble], rng);
  // The warren round: stakes, the fire (a squat), the cages, the
  // sorting yard, the pen — the yard walked the way it is worked.
  route(c, [
    { dx: 28, dy: 38 },
    { dx: 28, dy: 30, dwell: 60 },
    { dx: 21, dy: 24, dwell: 100, sit: true },
    { dx: 17, dy: 28, dwell: 80 },
    { dx: 24, dy: 33 },
    { dx: 34, dy: 33 },
    { dx: 40, dy: 29, dwell: 60 },
    { dx: 38, dy: 20 },
    { dx: 29, dy: 16, dwell: 80 },
    { dx: 28, dy: 24 },
    { dx: 28, dy: 31 },
  ]);
  return finish(c, 'poi_goblin_warren', 'The warren door');
}

// --------------------------------------------------------------------
// THE DRUM MOOT (goblin) — the country's feast ground: nobody lives
// here, everybody comes here. Drums round a bonfire, trestles that
// have seen a thousand suppers, and the chief's tent watching it all.
function buildGoblinMoot(): PrefabDef {
  const c = canvas(62, 48);
  const rng = seedOf('poi_goblin_mootfield');
  blob(c, 31, 24, 28, Tile.Grass, rng, 0);
  // The heart: the drum ring and the great fire.
  drumRing(c, 31, 21, 5, rng);
  put(c, 31, 21, Tile.Bonfire);
  put(c, 28, 17, Tile.SkullTotem);
  put(c, 34, 17, Tile.SkullTotem);
  // The feast: trestles drawn up south of the ring, pouring from
  // the moot's own tub — a thousand suppers deep.
  feastTrestles(c, 31, 31, 8, rng, { grog: true });
  // The meat row — a moot is fed, and the midden behind the rack
  // proves it (a feast ground is judged by what it throws away).
  put(c, 20, 28, Tile.MeatSpit);
  put(c, 18, 30, Tile.MeatRack);
  put(c, 20, 32, Tile.MeatSpit);
  blob(c, 19, 30, 3, Tile.Dirt, rng, 0.2);
  put(c, 17, 33, Tile.BoneMidden);
  // The brew corner: a stolen keg and the barrels it earned.
  blob(c, 44, 30, 3, Tile.Dirt, rng, 0.15);
  put(c, 44, 29, Tile.BrewKeg);
  put(c, 42, 31, Tile.Barrel);
  put(c, 46, 31, Tile.Barrel);
  put(c, 45, 33, Tile.Barrel);
  // The chief presides from the east rise; his take sits beside him.
  tentCluster(c, 46, 18, 3, rng, { war: true });
  put(c, 44, 16, Tile.ChestIron);
  // Visiting camps on the fringes — the moot draws the bands in.
  tentCluster(c, 14, 14, 3, rng);
  fireCircle(c, 12, 18, rng, {});
  tentCluster(c, 16, 38, 3, rng);
  fireCircle(c, 20, 40, rng, { spit: true });
  // The processional: totems walking the south approach to the ring.
  totemRow(c, 31, 44, 31, 30, 5, rng);
  track(c, 31, 46, 31, 24, rng);
  track(c, 31, 28, 20, 29, rng);
  track(c, 31, 28, 43, 30, rng);
  track(c, 31, 24, 45, 19, rng);
  track(c, 28, 24, 14, 16, rng);
  track(c, 28, 30, 18, 39, rng);
  scatter(c, 31, 24, 26, 18, [Tile.SkullPile, Tile.WarBanner, Tile.BonePile], rng);
  // The moot round: up the processional, a long squat at the fire, a
  // seat at the trestles, a horn at the keg, the chief's door, home.
  route(c, [
    { dx: 30, dy: 43 },
    { dx: 31, dy: 36 },
    { dx: 33, dy: 26, dwell: 120, sit: true },
    { dx: 31, dy: 33, dwell: 100, sit: true },
    { dx: 22, dy: 30, dwell: 60 },
    { dx: 14, dy: 18, dwell: 80, sit: true },
    { dx: 24, dy: 20 },
    { dx: 36, dy: 20 },
    { dx: 44, dy: 27, dwell: 100 },
    { dx: 45, dy: 20, dwell: 60 },
    { dx: 38, dy: 28 },
    { dx: 31, dy: 38 },
  ]);
  return finish(c, 'poi_goblin_mootfield', 'The drum moot');
}

// --------------------------------------------------------------------
// THE GRUB FARM (goblin) — goblins aping the field-life they raid:
// crooked rows of stolen crops, a scarecrow in a looted helm, penned
// boars, and a granary tent guarded like a war-chest.
function buildGoblinGrubfarm(): PrefabDef {
  const c = canvas(56, 44);
  const rng = seedOf('poi_goblin_grubfarm');
  blob(c, 28, 22, 25, Tile.Grass, rng, 0);
  // The crooked rows: nothing here grows straight.
  for (const [rx, ry, len] of [
    [13, 12, 12],
    [14, 15, 11],
    [12, 18, 13],
  ] as const) {
    let wob = 0;
    for (let i = 0; i < len; i++) {
      wob += rng.int(-1, 1);
      const y = ry + Math.max(-1, Math.min(1, wob));
      put(c, rx + i, y, Tile.Tilled);
      if (rng.chance(0.55)) {
        put(c, rx + i, y, rng.chance(0.6) ? Tile.CabbageMid : Tile.PumpkinMid);
      }
    }
  }
  put(c, 19, 9, Tile.Scarecrow);
  // Shade logs by the west hedge — even goblins learn the dark bed.
  put(c, 11, 24, Tile.MushroomLog);
  put(c, 14, 26, Tile.MushroomLog);
  put(c, 12, 28, Tile.MushroomLog);
  // The boar pen: stolen stock, kept fatter than the keepers.
  beastPen(c, 34, 12, 44, 20, 0, rng);
  put(c, 39, 16, Tile.FeedTrough);
  c.spawns.push(
    { dx: 37, dy: 15, npc: 'boar', radius: 2, count: 1, level: 3 },
    { dx: 41, dy: 17, npc: 'boar', radius: 2, count: 1, level: 3 },
  );
  // The granary: the war tent repurposed, the take of the harvest.
  tentCluster(c, 42, 28, 2, rng, { war: true });
  put(c, 40, 26, Tile.ChestIron);
  put(c, 44, 30, Tile.CrateGoods);
  put(c, 40, 31, Tile.HayBale);
  put(c, 46, 27, Tile.HayBale);
  // The farmhands' corner and their fire — and the dice they throw
  // when the rows are done (husbandry pays, goblin-fashion).
  tentCluster(c, 16, 34, 3, rng);
  fireCircle(c, 24, 32, rng, { pot: true });
  put(c, 27, 34, Tile.KnucklePit);
  track(c, 28, 42, 28, 24, rng);
  track(c, 28, 30, 25, 32, rng);
  track(c, 28, 28, 40, 28, rng);
  track(c, 28, 24, 39, 18, rng);
  track(c, 26, 24, 18, 16, rng);
  track(c, 26, 30, 17, 35, rng);
  scatter(c, 28, 22, 23, 10, [Tile.BonePile, Tile.Crate, Tile.SkullPile], rng);
  // The farmer's round: the rows inspected, the pen slopped, the
  // granary counted, a seat at the pot — husbandry, goblin-fashion.
  route(c, [
    { dx: 28, dy: 38 },
    { dx: 27, dy: 28 },
    { dx: 20, dy: 21, dwell: 80 },
    { dx: 15, dy: 13, dwell: 100 },
    { dx: 25, dy: 12 },
    { dx: 35, dy: 13 },
    { dx: 39, dy: 21, dwell: 100 },
    { dx: 41, dy: 25, dwell: 80 },
    { dx: 34, dy: 31 },
    { dx: 25, dy: 33, dwell: 120, sit: true },
    { dx: 27, dy: 37 },
  ]);
  return finish(c, 'poi_goblin_grubfarm', 'The grub farm');
}

// --------------------------------------------------------------------
// THE RAID MUSTER (goblin) — the staging ground: banner avenue, drill
// yard, worg pickets, a plunder depot, and the signal pyre that will
// someday light. The mean one — this camp is going somewhere.
function buildGoblinWarstage(): PrefabDef {
  const c = canvas(64, 46);
  const rng = seedOf('poi_goblin_warstage');
  blob(c, 32, 23, 28, Tile.Grass, rng, 0);
  // Palisade stubs: they never finish anything, but they started.
  for (let x = 18; x <= 34; x++) if (rng.chance(0.7)) put(c, x, 10, Tile.Palisade);
  for (let y = 12; y <= 22; y++) if (rng.chance(0.6)) put(c, 12, y, Tile.Palisade);
  // The banner avenue: the way in, dressed to be feared.
  standardRow(c, 29, 42, 29, 30, 4, rng);
  standardRow(c, 35, 42, 35, 30, 4, rng);
  track(c, 32, 44, 32, 24, rng);
  put(c, 27, 38, Tile.SpikeBarrier);
  put(c, 37, 38, Tile.SpikeBarrier);
  // The drill yard — the muster keeps its edge, under the brag of
  // the last muster's takings nailed at the yard's corner.
  drillYard(c, 24, 20, rng);
  put(c, 20, 18, Tile.TargetDummy);
  put(c, 27, 21, Tile.TrophyStake);
  // The signal pyre on its mound, waiting for its night.
  blob(c, 47, 14, 4, Tile.Dirt, rng, 0);
  put(c, 47, 13, Tile.Bonfire);
  put(c, 49, 15, Tile.WarBanner);
  // Worg pickets west; the depot east; the chief's tent southeast.
  beastPen(c, 13, 26, 21, 32, 2, rng);
  spoilYard(c, 43, 27, rng);
  put(c, 45, 25, Tile.PlunderSacks);
  tentCluster(c, 50, 35, 3, rng, { war: true });
  put(c, 52, 33, Tile.ChestIron);
  tentCluster(c, 15, 13, 3, rng);
  // The muster's fire — even a war camp eats, and it eats under the
  // boss's straw-stuffed image: the effigy stands where the avenue
  // meets the fire, so every goblin marches past the chief twice a
  // day. This camp is going somewhere, and HE is why.
  fireCircle(c, 32, 27, rng, { spit: true, rack: true });
  put(c, 34, 29, Tile.BossEffigy);
  track(c, 32, 28, 25, 21, rng);
  track(c, 32, 28, 44, 28, rng);
  track(c, 32, 24, 46, 15, rng);
  track(c, 30, 26, 17, 29, rng);
  track(c, 34, 30, 49, 36, rng);
  scatter(c, 32, 23, 26, 16, [Tile.SkullPile, Tile.WarBanner, Tile.BonePile, Tile.SpikeBarrier], rng);
  // The war-round: avenue, drill (a real spell of it), the pyre, the
  // depot, the pickets, one squat at the fire — then round again.
  route(c, [
    { dx: 32, dy: 40 },
    { dx: 32, dy: 30, dwell: 60 },
    { dx: 25, dy: 23, dwell: 120 },
    { dx: 30, dy: 17 },
    { dx: 40, dy: 16 },
    { dx: 47, dy: 17, dwell: 100 },
    { dx: 44, dy: 25, dwell: 60 },
    { dx: 48, dy: 33, dwell: 60 },
    { dx: 38, dy: 30 },
    { dx: 33, dy: 29, dwell: 100, sit: true },
    { dx: 22, dy: 29, dwell: 80 },
    { dx: 26, dy: 35 },
    { dx: 30, dy: 40 },
  ]);
  return finish(c, 'poi_goblin_warstage', 'The raid muster');
}

// --------------------------------------------------------------------
// THE SUNKEN CHAPEL (dead) — a sanctum half under the turf. The pews
// still face the lectern; the congregation never took the hint.
function buildDeadChapel(): PrefabDef {
  const c = canvas(56, 46);
  const rng = seedOf('poi_dead_chapel');
  blob(c, 28, 23, 25, Tile.Grass, rng, 0);
  // The nave: walls that mostly held, a floor the turf is losing.
  ruinRect(c, 18, 12, 38, 30, Tile.WallStone, Tile.CaveRubble, rng, 0.22);
  for (let y = 13; y <= 29; y++) for (let x = 19; x <= 37; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 28, 30, Tile.DoorwayStone);
  // The office: lectern and the watch-lights.
  put(c, 28, 15, Tile.Lectern);
  put(c, 24, 15, Tile.Brazier);
  put(c, 32, 15, Tile.Brazier);
  // The pews: rows still drawn up — the seated dead keep the office.
  for (const py of [19, 22, 25] as const) {
    for (let x = 22; x <= 34; x += 2) {
      if (rng.chance(0.75)) put(c, x, py, Tile.Bench);
    }
  }
  // The aisles remember their relics: bone stacked along the walls —
  // and the reliquary LAST, so no bone pass buries the prize.
  ossuaryRun(c, 19, 13, 37, 13, rng);
  ossuaryRun(c, 19, 28, 25, 28, rng);
  put(c, 28, 13, Tile.ChestIron);
  // The garth: kerbed graves east, the bell mound west.
  kerbMound(c, 46, 16, rng, rng.chance(0.4));
  kerbMound(c, 45, 26, rng, rng.chance(0.4));
  kerbMound(c, 46, 36, rng, true);
  cairn(c, 11, 16, 3, rng);
  // The processional: brazier pairs walking the door south.
  brazierWalk(c, 28, 44, 28, 31, 5, rng);
  scatter(c, 28, 23, 24, 14, [Tile.BonePile, Tile.CaveRubble, Tile.Rock], rng);
  scatter(c, 28, 36, 12, 6, [Tile.GrassTall], rng);
  // The verger's round: the processional, the nave, the graves, the
  // bell — the offices kept to the hour, forever.
  route(c, [
    { dx: 28, dy: 43 },
    { dx: 28, dy: 33, dwell: 60 },
    { dx: 28, dy: 27 },
    { dx: 28, dy: 17, dwell: 100 },
    { dx: 34, dy: 21 },
    { dx: 36, dy: 31 },
    { dx: 45, dy: 30, dwell: 80 },
    { dx: 46, dy: 21, dwell: 80 },
    { dx: 40, dy: 12 },
    { dx: 29, dy: 10 },
    { dx: 17, dy: 10 },
    { dx: 11, dy: 12, dwell: 80 },
    { dx: 13, dy: 22 },
    { dx: 18, dy: 32 },
    { dx: 24, dy: 38 },
  ]);
  return finish(c, 'poi_dead_chapel', 'The sunken chapel');
}

// --------------------------------------------------------------------
// THE OLD MUSTER (dead) — a battlefield where the ranks re-form every
// night: trench scars, fallen standards, a drill line still drilling,
// and the command knoll that never stood down.
function buildDeadMuster(): PrefabDef {
  const c = canvas(66, 48);
  const rng = seedOf('poi_dead_muster');
  blob(c, 33, 24, 30, Tile.Grass, rng, 0);
  // The scars: where the lines held, and where they broke.
  trenchScar(c, 10, 18, 30, 14, rng);
  trenchScar(c, 36, 12, 56, 18, rng);
  trenchScar(c, 14, 34, 34, 38, rng);
  // Palisade teeth along the north — the works that failed.
  for (let x = 20; x <= 46; x++) if (rng.chance(0.25)) put(c, x, 10, Tile.Palisade);
  // The standards that fell, in the order they fell.
  standardRow(c, 16, 24, 48, 26, 6, rng);
  // The drill line: the dead keep their edge too.
  drillYard(c, 40, 32, rng);
  put(c, 34, 30, Tile.SpearRack);
  put(c, 46, 30, Tile.WeaponRack);
  // The command knoll — the war is still being run from here.
  watchKnoll(c, 54, 22, rng);
  put(c, 54, 20, Tile.ChestIron);
  put(c, 52, 24, Tile.WarBanner);
  // The field keeps its count.
  scatter(c, 33, 24, 28, 24, [Tile.BonePile, Tile.SkullPile, Tile.CaveRubble, Tile.Rock], rng);
  scatter(c, 24, 24, 12, 6, [Tile.GrassTall], rng);
  track(c, 33, 46, 33, 30, rng);
  track(c, 33, 34, 40, 33, rng);
  track(c, 33, 30, 22, 26, rng);
  track(c, 36, 30, 53, 23, rng);
  // The muster round: the whole line walked end to end, held longest
  // at the drill and the knoll — the army that never disbanded.
  route(c, [
    { dx: 33, dy: 44 },
    { dx: 33, dy: 34 },
    { dx: 24, dy: 36, dwell: 60 },
    { dx: 16, dy: 32 },
    { dx: 12, dy: 22 },
    { dx: 20, dy: 16, dwell: 80 },
    { dx: 30, dy: 14 },
    { dx: 40, dy: 13 },
    { dx: 50, dy: 16, dwell: 80 },
    { dx: 55, dy: 24, dwell: 100 },
    { dx: 48, dy: 30 },
    { dx: 41, dy: 34, dwell: 120 },
    { dx: 36, dy: 40 },
  ]);
  return finish(c, 'poi_dead_muster', 'The old muster');
}

// --------------------------------------------------------------------
// THE COLD CLOISTER (dead) — a monastery the mountain forgot: the
// garth's colonnade, the refectory where the brothers still sit at
// table, and the bell mound that keeps the hours nobody hears.
function buildDeadCloister(): PrefabDef {
  const c = canvas(58, 46);
  const rng = seedOf('poi_dead_cloister');
  blob(c, 29, 23, 26, Tile.Grass, rng, 0);
  // The garth: a colonnade square round kept turf, the trough at its
  // heart — the one green the dead still tend.
  for (let x = 20; x <= 36; x += 4) {
    put(c, x, 14, Tile.PillarStone);
    put(c, x, 30, Tile.PillarStone);
  }
  for (let y = 18; y <= 26; y += 4) {
    put(c, 20, y, Tile.PillarStone);
    put(c, 36, y, Tile.PillarStone);
  }
  for (let y = 16; y <= 28; y++) {
    for (let x = 22; x <= 34; x++) {
      if (at(c, x, y) === Tile.Grass && rng.chance(0.25)) put(c, x, y, Tile.GrassTall);
    }
  }
  put(c, 28, 22, Tile.Basin);
  // The refectory: the long table, the brothers seated, grace unsaid.
  ruinRect(c, 40, 16, 54, 26, Tile.WallStone, Tile.CaveRubble, rng, 0.18);
  for (let y = 17; y <= 25; y++) for (let x = 41; x <= 53; x++) put(c, x, y, Tile.StoneFloor);
  put(c, 40, 21, Tile.DoorwayStone);
  for (let x = 44; x <= 50; x++) put(c, x, 21, Tile.Table);
  for (let x = 44; x <= 50; x += 2) {
    put(c, x, 20, Tile.Bench);
    put(c, x, 22, Tile.Bench);
  }
  put(c, 52, 18, Tile.ChestIron);
  put(c, 42, 18, Tile.Brazier);
  // The chapel stub: mostly down, the office kept anyway.
  ruinRect(c, 14, 32, 28, 40, Tile.WallStone, Tile.CaveRubble, rng, 0.35);
  for (let y = 33; y <= 39; y++) for (let x = 15; x <= 27; x++) {
    if (rng.chance(0.7)) put(c, x, y, Tile.StoneFloor);
  }
  put(c, 21, 35, Tile.Lectern);
  put(c, 18, 35, Tile.Brazier);
  // The bell mound, and the graves of the quieter brothers.
  cairn(c, 44, 34, 3, rng);
  kerbMound(c, 11, 16, rng, false);
  kerbMound(c, 11, 24, rng, true);
  brazierWalk(c, 29, 44, 29, 31, 5, rng);
  track(c, 29, 32, 29, 22, rng);
  track(c, 32, 26, 40, 22, rng);
  track(c, 26, 28, 20, 34, rng);
  track(c, 34, 28, 44, 33, rng);
  scatter(c, 29, 23, 24, 12, [Tile.BonePile, Tile.CaveRubble, Tile.Rock], rng);
  // The office round: chapel, garth corners, refectory (a long sit
  // at table), the bell — the day's hours, kept cold.
  route(c, [
    { dx: 29, dy: 43 },
    { dx: 27, dy: 36, dwell: 100 },
    { dx: 18, dy: 37, dwell: 80 },
    { dx: 14, dy: 28 },
    { dx: 12, dy: 20, dwell: 60 },
    { dx: 18, dy: 13 },
    { dx: 28, dy: 12 },
    { dx: 38, dy: 14 },
    { dx: 45, dy: 20, dwell: 120, sit: true },
    { dx: 46, dy: 28 },
    { dx: 45, dy: 31, dwell: 80 },
    { dx: 36, dy: 34 },
    { dx: 30, dy: 38 },
  ]);
  return finish(c, 'poi_dead_cloister', 'The cold cloister');
}

// --------------------------------------------------------------------
// THE KINGS' ROW (dead) — five great cairns of an older crown laid in
// a line, offering-lights before each, and an honor guard that still
// changes at every door. The high band's landmark.
function buildDeadKingsrow(): PrefabDef {
  const c = canvas(60, 46);
  const rng = seedOf('poi_dead_kingsrow');
  blob(c, 30, 23, 27, Tile.Grass, rng, 0);
  // The row: four lords and, center, the king's greater ring.
  cairn(c, 14, 18, 3, rng);
  cairn(c, 22, 18, 3, rng);
  cairn(c, 30, 17, 4, rng);
  cairn(c, 38, 18, 3, rng);
  cairn(c, 46, 18, 3, rng);
  // The offering-lights: a brazier before every door.
  for (const bx of [14, 22, 38, 46] as const) put(c, bx, 23, Tile.Brazier);
  // The king takes his tribute at the arch; the take is warded.
  put(c, 30, 26, Tile.ArchStone);
  put(c, 30, 23, Tile.ChestIron);
  put(c, 28, 24, Tile.Brazier);
  put(c, 32, 24, Tile.Brazier);
  // The processional walks in from the south hem.
  brazierWalk(c, 30, 44, 30, 28, 6, rng);
  // Toppled pillars: the colonnade the centuries took.
  for (const [px, py] of [
    [18, 30], [24, 33], [37, 32], [43, 30], [12, 26], [48, 27],
  ] as const) {
    if (rng.chance(0.6)) put(c, px, py, Tile.PillarStone);
    else {
      put(c, px, py, Tile.CaveRubble);
      put(c, px + 1, py, Tile.CaveRubble);
    }
  }
  // The lesser rows: the household, buried at their lords' feet.
  kerbMound(c, 16, 38, rng, rng.chance(0.5));
  kerbMound(c, 30, 39, rng, rng.chance(0.5));
  kerbMound(c, 44, 38, rng, true);
  // The high turf keeps old bone.
  scatter(c, 30, 23, 26, 16, [Tile.BonePile, Tile.Rock, Tile.CaveRubble], rng);
  scatter(c, 30, 12, 20, 8, [Tile.GrassTall], rng);
  track(c, 30, 30, 16, 22, rng);
  track(c, 30, 30, 44, 22, rng);
  // The changing of the guard: the row walked door to door, a stand
  // at every king, the arch held longest — the watch that outlived
  // the kingdom it kept.
  route(c, [
    { dx: 30, dy: 42 },
    { dx: 30, dy: 32 },
    { dx: 30, dy: 28, dwell: 120 },
    { dx: 22, dy: 24, dwell: 80 },
    { dx: 14, dy: 24, dwell: 80 },
    { dx: 10, dy: 15 },
    { dx: 22, dy: 13 },
    { dx: 30, dy: 11, dwell: 60 },
    { dx: 38, dy: 13 },
    { dx: 47, dy: 14 },
    { dx: 46, dy: 24, dwell: 80 },
    { dx: 38, dy: 24, dwell: 80 },
    { dx: 34, dy: 30 },
    { dx: 31, dy: 38, dwell: 60 },
  ]);
  return finish(c, 'poi_dead_kingsrow', "The kings' row");
}

// --------------------------------------------------------------------
// THE DROWNED VILLAGES (skral — docs/skral-decor-plan.md): the banks'
// landmark grounds. A skral village CARRIES ITS OWN WATER (the '~'
// law: the dug vein is the village's whole reason), so the builders
// paint the channel first, hem it in sand, and only then let the
// meadow in. FOUND, NEVER FELLED throughout — the one cache is iron
// only because somebody LOST it to the water long ago.

/** Water walked along a polyline — the dug vein the village lives on. */
function wetLine(
  c: ReturnType<typeof canvas>,
  pts: ReadonlyArray<readonly [number, number]>,
  r: number,
  rng: ReturnType<typeof seedOf>,
): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps);
      const y = Math.round(ay + ((by - ay) * s) / steps);
      blob(c, x, y, r, Tile.WaterShallow, rng, 0);
    }
  }
}

/** Every unpainted cell touching the water takes the wet sand hem —
 *  the ground line every skral prop is authored to sit on. */
function sandHem(c: ReturnType<typeof canvas>): void {
  const hem: Array<[number, number]> = [];
  for (let y = 1; y < c.h - 1; y++) {
    for (let x = 1; x < c.w - 1; x++) {
      if (at(c, x, y) !== TILE_SKIP) continue;
      let wet = false;
      for (let dy = -1; dy <= 1 && !wet; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (at(c, x + dx, y + dy) === Tile.WaterShallow) {
            wet = true;
            break;
          }
        }
      }
      if (wet) hem.push([x, y]);
    }
  }
  for (const [x, y] of hem) put(c, x, y, Tile.Sand);
}

// --------------------------------------------------------------------
// THE LONG BANKS (skral) — the whole race in one ground: a dug tidal
// vein walking the width of the village, weir gates at both narrows,
// the dwelling bank north, the working bank south, and the deepking's
// pool at the heart ringed in ancestor bone. Everything the craftsman
// shelf owns is HERE, laid out the way it is worked.
function buildSkralLongbanks(): PrefabDef {
  const c = canvas(60, 46);
  const rng = seedOf('poi_skral_village_longbanks');
  // The vein: west mouth to east mouth, swelling to the heart pool.
  wetLine(
    c,
    [
      [3, 26],
      [10, 25],
      [16, 24],
      [23, 24],
      [29, 23],
      [34, 21],
    ],
    2,
    rng,
  );
  wetLine(
    c,
    [
      [34, 21],
      [42, 20],
      [48, 20],
      [56, 21],
    ],
    2,
    rng,
  );
  blob(c, 34, 22, 6, Tile.WaterShallow, rng, 0);
  sandHem(c);
  // Worked ground claims its pads BEFORE the meadow fills in.
  blob(c, 14, 10, 6, Tile.Dirt, rng, 0.1); // the dwelling bank
  blob(c, 25, 8, 4, Tile.Dirt, rng, 0.12);
  // THE SHRINE HOLDS ITS POOL (pass-two verdict): the bone head's
  // pad walks all the way down to the water — a grass wedge between
  // the ribs and the pool read as furniture beside a river, not a
  // pool ringed in bone.
  blob(c, 34, 14, 5, Tile.Dirt, rng, 0.08); // the shrine head
  blob(c, 34, 17, 3, Tile.Dirt, rng, 0);
  blob(c, 30, 17, 2, Tile.Dirt, rng, 0);
  blob(c, 38, 17, 2, Tile.Dirt, rng, 0);
  blob(c, 16, 32, 5, Tile.Dirt, rng, 0.12); // the working bank
  blob(c, 26, 34, 5, Tile.Dirt, rng, 0.12);
  blob(c, 34, 32, 4, Tile.Dirt, rng, 0.12);
  blob(c, 44, 34, 5, Tile.Dirt, rng, 0.12);
  blob(c, 52, 31, 4, Tile.Dirt, rng, 0.15);
  blob(c, 46, 26, 4, Tile.Dirt, rng, 0.15); // the keep row
  blob(c, 52, 18, 4, Tile.Dirt, rng, 0.15); // the roe bank
  blob(c, 9, 21, 3, Tile.Dirt, rng, 0.1); // the west watch
  blob(c, 30, 23, 31, Tile.Grass, rng, 0);
  for (let i = 0; i < 80; i++) {
    const x = rng.int(3, 56);
    const y = rng.int(3, 42);
    if (at(c, x, y) === Tile.Grass && rng.chance(0.8)) put(c, x, y, Tile.GrassTall);
  }
  // The dwelling bank: two reed hamlets sharing the north light.
  reedHamlet(c, 14, 10, 4, rng);
  reedHamlet(c, 25, 8, 3, rng);
  // The heart: the ancestors' crescents flanking the tide's table,
  // the lost cache warded between them, the lures lighting the rim.
  put(c, 30, 14, Tile.WhaleRibs);
  put(c, 38, 14, Tile.WhaleRibs);
  put(c, 34, 15, Tile.TideAltar);
  put(c, 34, 13, Tile.ChestIron);
  put(c, 28, 18, Tile.TideTotem);
  put(c, 40, 18, Tile.TideTotem);
  put(c, 29, 27, Tile.TideTotem);
  put(c, 39, 27, Tile.TideTotem);
  put(c, 31, 16, Tile.LurePole);
  put(c, 37, 16, Tile.LurePole);
  // The weir gates: hurdles at both narrows, traps in the funnels.
  put(c, 16, 22, Tile.WeirPanels);
  put(c, 16, 26, Tile.WeirPanels);
  put(c, 15, 24, Tile.FishTrap);
  put(c, 48, 18, Tile.WeirPanels);
  put(c, 48, 22, Tile.WeirPanels);
  put(c, 49, 20, Tile.FishTrap);
  // The working bank, west to east: the catch dried, the nets mended,
  // the shells carved, the salt won, the kelp hung.
  dryingGround(c, 16, 32, rng);
  mendingRow(c, 26, 34, rng);
  put(c, 33, 32, Tile.ShellBench);
  put(c, 35, 34, Tile.ShellMidden);
  put(c, 32, 30, Tile.TideChimes);
  saltGarth(c, 44, 34, 3, rng);
  kelpGarth(c, 53, 31, 3, rng);
  // The live larder and the spawning bank keep the quiet east.
  keepRow(c, 43, 26, 3, rng);
  put(c, 51, 17, Tile.RoeNest);
  put(c, 54, 19, Tile.RoeNest);
  put(c, 49, 16, Tile.FishTrap);
  // The west watch: harpoons by the mouth, a lure over the water.
  put(c, 9, 21, Tile.HarpoonRack);
  put(c, 8, 24, Tile.LurePole);
  // Hulls drawn up past the tide line.
  put(c, 12, 27, Tile.Dugout);
  put(c, 20, 28, Tile.Dugout);
  put(c, 39, 28, Tile.Dugout);
  // The south approach, lure-lit the Charter's way.
  lureWay(c, 31, 43, 31, 36, 8, rng);
  // Worn tracks: the working bank's spine, the dwelling bank's walk.
  track(c, 10, 29, 16, 31, rng);
  track(c, 16, 31, 26, 33, rng);
  track(c, 26, 33, 34, 31, rng);
  track(c, 34, 31, 44, 32, rng);
  track(c, 44, 32, 52, 30, rng);
  track(c, 9, 19, 13, 13, rng);
  track(c, 14, 12, 24, 9, rng);
  track(c, 25, 9, 33, 14, rng);
  track(c, 38, 16, 44, 25, rng);
  track(c, 46, 25, 51, 18, rng);
  scatter(c, 30, 23, 24, 10, [Tile.ShellMidden, Tile.BonePile], rng);
  // The works round: down the lure way, the full working bank, the
  // larder, and a long watch at the pool's south lip.
  route(c, [
    { dx: 31, dy: 42 },
    { dx: 31, dy: 36 },
    { dx: 27, dy: 36, dwell: 80 },
    { dx: 22, dy: 34 },
    { dx: 17, dy: 34, dwell: 100 },
    { dx: 12, dy: 30, dwell: 60 },
    { dx: 20, dy: 31 },
    { dx: 29, dy: 32, dwell: 80 },
    { dx: 36, dy: 31 },
    { dx: 43, dy: 32, dwell: 80 },
    { dx: 48, dy: 34 },
    { dx: 52, dy: 29, dwell: 60 },
    { dx: 49, dy: 27, dwell: 80 },
    { dx: 44, dy: 28 },
    { dx: 36, dy: 28, dwell: 100 },
    { dx: 32, dy: 36 },
  ]);
  // The dwelling watch: the fire, the shelters, the shrine head, and
  // both weir gates — the bank walked the way it is kept.
  route(c, [
    { dx: 15, dy: 12, dwell: 100, sit: true },
    { dx: 21, dy: 10 },
    { dx: 26, dy: 10, dwell: 60 },
    { dx: 31, dy: 12 },
    { dx: 33, dy: 16, dwell: 100 },
    { dx: 28, dy: 16 },
    { dx: 22, dy: 20 },
    { dx: 17, dy: 21, dwell: 80 },
    { dx: 10, dy: 20, dwell: 60 },
    { dx: 12, dy: 16 },
  ]);
  return finish(c, 'poi_skral_village_longbanks', 'The long banks');
}

// --------------------------------------------------------------------
// THE SALT GARTH (skral) — the works-village: the bank's money. A
// broad bay at the south hem, the pan yard at the heart, the smoker
// terrace east, the kelp garth west, and the dwelling knots on the
// north rise under the shrine's one crescent. A different grammar
// from the Long Banks on purpose — no two skral grounds share a read.
function buildSkralSaltgarth(): PrefabDef {
  const c = canvas(54, 44);
  const rng = seedOf('poi_skral_village_saltgarth');
  // The bay: the water the works drink.
  blob(c, 27, 37, 5, Tile.WaterShallow, rng, 0);
  blob(c, 18, 36, 4, Tile.WaterShallow, rng, 0);
  blob(c, 36, 36, 4, Tile.WaterShallow, rng, 0);
  blob(c, 27, 32, 2, Tile.WaterShallow, rng, 0);
  sandHem(c);
  // Worked pads before the meadow.
  blob(c, 24, 22, 7, Tile.Dirt, rng, 0.1); // the pan yard
  blob(c, 43, 21, 4, Tile.Dirt, rng, 0.12); // the smoker terrace
  blob(c, 9, 22, 4, Tile.Dirt, rng, 0.15); // the kelp garth
  blob(c, 17, 9, 6, Tile.Dirt, rng, 0.1); // the dwelling rise
  blob(c, 31, 8, 4, Tile.Dirt, rng, 0.12);
  blob(c, 44, 10, 4, Tile.Dirt, rng, 0.08); // the shrine knoll
  blob(c, 25, 30, 3, Tile.Dirt, rng, 0.15); // the bay work line
  blob(c, 27, 21, 27, Tile.Grass, rng, 0);
  for (let i = 0; i < 70; i++) {
    const x = rng.int(3, 50);
    const y = rng.int(3, 40);
    if (at(c, x, y) === Tile.Grass && rng.chance(0.8)) put(c, x, y, Tile.GrassTall);
  }
  // The pan yard: two worked ranks, the lure watching the money.
  saltGarth(c, 22, 20, 4, rng);
  saltGarth(c, 24, 25, 3, rng);
  put(c, 32, 23, Tile.LurePole);
  // The smoker terrace: the catch cured where the wind leaves east.
  dryingGround(c, 43, 21, rng);
  put(c, 41, 18, Tile.SmokeTripod);
  // The kelp garth holds the west.
  kelpGarth(c, 9, 21, 4, rng);
  // The keep row drinks from the bay; the hulls rest on the sand.
  // A village mends its nets wherever it works — the bench keeps the
  // bay line even here (the pan yard is the money, not the meal).
  keepRow(c, 22, 30, 3, rng);
  put(c, 24, 28, Tile.MendingBench);
  put(c, 14, 33, Tile.Dugout);
  put(c, 33, 32, Tile.Dugout);
  put(c, 40, 34, Tile.Dugout);
  put(c, 35, 30, Tile.HarpoonRack);
  put(c, 37, 31, Tile.LurePole);
  // The bay works: hurdles standing in the shallows, traps in the run,
  // the spawning nests in the quiet west corner.
  put(c, 20, 34, Tile.WeirPanels);
  put(c, 33, 35, Tile.WeirPanels);
  put(c, 26, 35, Tile.FishTrap);
  put(c, 31, 36, Tile.FishTrap);
  put(c, 12, 31, Tile.RoeNest);
  put(c, 10, 33, Tile.RoeNest);
  // The dwelling rise: two knots of reed under the shrine's crescent.
  reedHamlet(c, 17, 9, 4, rng);
  reedHamlet(c, 31, 8, 3, rng);
  ribShrine(c, 44, 10, rng);
  put(c, 46, 12, Tile.ChestIron);
  // The shell-carver works beside the shrine — the fans are for the
  // ancestors before they are for anyone's neck.
  put(c, 42, 12, Tile.ShellBench);
  // The west approach, totem-marked and lure-lit.
  lureWay(c, 4, 27, 13, 25, 9, rng);
  put(c, 5, 25, Tile.TideTotem);
  put(c, 9, 28, Tile.TideTotem);
  // Worn tracks: garth to yard to terrace, rise to yard, bay line.
  track(c, 6, 26, 16, 24, rng);
  track(c, 16, 24, 22, 22, rng);
  track(c, 22, 22, 28, 24, rng);
  track(c, 28, 24, 34, 22, rng);
  track(c, 34, 22, 40, 21, rng);
  track(c, 17, 12, 20, 18, rng);
  track(c, 31, 10, 30, 17, rng);
  track(c, 30, 17, 42, 12, rng);
  track(c, 22, 28, 27, 30, rng);
  track(c, 27, 30, 34, 30, rng);
  scatter(c, 27, 21, 20, 9, [Tile.ShellMidden, Tile.BonePile], rng);
  // The panmaster's round: garth, both pan ranks, the keep row, the
  // bay watch, the terrace, and the long sit at the shrine.
  route(c, [
    { dx: 5, dy: 27 },
    { dx: 12, dy: 25, dwell: 60 },
    { dx: 18, dy: 22, dwell: 100 },
    { dx: 23, dy: 23 },
    { dx: 26, dy: 27, dwell: 100 },
    { dx: 23, dy: 29, dwell: 80 },
    { dx: 30, dy: 28 },
    { dx: 34, dy: 30, dwell: 60 },
    { dx: 41, dy: 23, dwell: 100 },
    { dx: 44, dy: 17 },
    { dx: 44, dy: 13, dwell: 120, sit: true },
    { dx: 36, dy: 14 },
    { dx: 28, dy: 16 },
    { dx: 20, dy: 18 },
    { dx: 12, dy: 22 },
  ]);
  // The bay watch: the fires, the rise, the harpoons, the roe bank.
  route(c, [
    { dx: 17, dy: 11, dwell: 80, sit: true },
    { dx: 24, dy: 12 },
    { dx: 31, dy: 10, dwell: 60 },
    { dx: 31, dy: 16 },
    { dx: 30, dy: 22 },
    { dx: 30, dy: 27 },
    { dx: 34, dy: 29, dwell: 100 },
    { dx: 27, dy: 29 },
    { dx: 20, dy: 30, dwell: 60 },
    { dx: 15, dy: 31 },
    { dx: 12, dy: 29, dwell: 80 },
    { dx: 10, dy: 25 },
    { dx: 13, dy: 18 },
    { dx: 15, dy: 13 },
  ]);
  return finish(c, 'poi_skral_village_saltgarth', 'The salt garth');
}

/**
 * The landmark shelf — built once at module load, pinned forever.
 * EVERY prefab on this shelf declares influence-EXEMPT at its
 * registration: a landmark is BORN EXPANSIVE (3-5x the camp shelf),
 * its whole ground authored — generated litter would bury curated art,
 * and the drowned villages carry their own dug water, so influence
 * must never redraw a bank the builder dug. A new landmark added here
 * is exempt by construction, never by remembering a far-file list.
 */
export const LANDMARK_PREFABS: readonly PrefabDef[] = [
  buildBarrowfield(),
  buildGreatkeep(),
  buildGoblinSprawl(),
  buildKillfield(),
  buildWaystead(),
  buildGoblinWarren(),
  buildGoblinMoot(),
  buildGoblinGrubfarm(),
  buildGoblinWarstage(),
  buildDeadChapel(),
  buildDeadMuster(),
  buildDeadCloister(),
  buildDeadKingsrow(),
  // THE DROWNED VILLAGES (skral): the banks' landmark grounds.
  buildSkralLongbanks(),
  buildSkralSaltgarth(),
].map((p) => declareInfluence(p, { exempt: true }));

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_DEFS, TILE_SKIP, Tile, bannerStandTile } from '@arx/shared';
import { buildFenside } from './fenside.js';
import { buildFensideWithRegistry } from './fenside/index.js';
import {
  bedUntouched,
  boxOverlaps,
  emberBedsOffAsh,
  gapOpen,
  occlusionViolations,
  padClear,
  shoulderListed,
  signPairViolations,
  skipRing,
  unreachableFloor,
} from './fenside/lint.js';
import { PINS } from './fenside/pins.js';
import { footprintViolations } from './lint/footprint.js';
import { zonePlacementErrors } from './validateZone.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { AUTHORED_WILD_SITES, ROAD_HALF, roadDistanceAt } from '../geography.js';
import { LOOT_TABLES } from '../loot/tables.js';
import { POI_DEFS } from '../pois/defs.js';
import { POI_PREFABS } from '../pois/prefabs.js';
import { WORLD_SEED } from '../worldgen.js';

/**
 * THE FEN WAIST (contested lands, band 7; rulings R2, R3, R4): the
 * thin authored band around the First Road's one crossing. The
 * tier-2 cairn, the bar scene on the west approach, the mark-post in
 * the water, the dike line and the rag line, and the causeway head
 * on the bank the measurement gave it (layout W, the west bank north
 * of the road; brief 0.2 K and §2.5).
 */
const count = (z: ReturnType<typeof buildFenside>, t: Tile): number => {
  let n = 0;
  for (const g of z.ground) if (g === t) n++;
  return n;
};
const at = (z: ReturnType<typeof buildFenside>, x: number, y: number): number =>
  z.ground[(y - z.origin.y) * z.width + (x - z.origin.x)]!;

test('fenside: THE MEASURED RECT and the empty rosters', () => {
  const z = buildFenside();
  assert.equal(z.id, 'fenside');
  assert.equal(z.name, 'The Fen Waist');
  // origin (118,76), 24x25: x 118..141, y 76..100. The east edge is
  // the crofts' 24x16 footprint (x 148..171 at (160,94)) less the
  // pad law's six, which is short of x 150, so the head stands on
  // the west bank (layout W); the south edge is one row above the
  // bar's footprint (y 102..115 at (126,109)) under THE AUTHORED HUG
  // (fix pass 1), so the felled shoulder meets the crew's clearing;
  // the west edge moved to x 118 so the cairn stands alone.
  assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, { x: 118, y: 76, w: 24, h: 25 });
  assert.equal(z.origin.x + z.width - 1, 141, 'the east edge, measured');
  assert.equal(z.growth, 'wild');
  assert.equal(z.spawn, undefined);
  assert.deepEqual(z.spawns ?? [], [], 'no spawn rows: the shore rows are worldgen\'s (R8)');
  assert.deepEqual(z.signs ?? [], [], 'no board here: the neighbours\' boards stand 68 west and 30 east');
});

test('fenside: THE BAR SCENE (R2) — posts, teeth, the one-tile gap, the counter, the cage, the mark-post', () => {
  const z = buildFenside();
  assert.equal(count(z, Tile.FieldCairn), 1, 'the tier-2 cairn');
  assert.equal(at(z, PINS.CAIRN[0], PINS.CAIRN[1]), Tile.FieldCairn);
  assert.deepEqual([...PINS.CAIRN], [119, 89], 'alone at the rect\'s west edge, seven tiles before the cage (fix pass 1)');
  assert.equal(count(z, Tile.TimberPost), 3, 'the two posts of the bar and the mark-post in the water');
  assert.equal(count(z, Tile.SpikeBarrier), 3, 'the teeth');
  assert.equal(count(z, Tile.WarTable), 1, 'the counter that was a table');
  assert.equal(count(z, Tile.NoticeBoard), 1, 'the board of receipts, mute');
  assert.equal(count(z, Tile.PrisonCage), 1, 'the cage');
  assert.equal(count(z, Tile.RedRagStake), 3, 'the rag line, clipped to the rect');
  for (const [x, y] of PINS.TIMBER_POSTS) assert.equal(at(z, x, y), Tile.TimberPost);
  for (const [x, y] of PINS.TEETH) assert.equal(at(z, x, y), Tile.SpikeBarrier);
  assert.equal(at(z, PINS.GAP[0], PINS.GAP[1]), TILE_SKIP, 'the warden\'s gap is the road\'s own bed');
  assert.equal(at(z, PINS.MARK_POST[0], PINS.MARK_POST[1]), Tile.TimberPost, 'the mark-post');
  // No rope posture exists; the bar is the posts, the barriers and
  // the bodies. The camp's own furniture never stands in the zone.
  assert.equal(count(z, Tile.WarBanner), 0);
  assert.equal(count(z, Tile.Campfire), 0);
});

test('fenside: THE DIKE LINE and THE HEAD, layout W', () => {
  const z = buildFenside();
  assert.equal(count(z, Tile.CharterPost), 3, 'the stakes, the middle one standing in the channel');
  assert.equal(count(z, Tile.Fence), 4, 'the rails between them');
  for (const [x, y] of PINS.STAKES) assert.equal(at(z, x, y), Tile.CharterPost);
  for (const [x, y] of PINS.FENCES) assert.equal(at(z, x, y), Tile.Fence);
  // The two claims touching at the ford's north lip: the Charter's
  // rail one tile from the Company's last rag in the shallows, with
  // Brede's mark-post beside them, in one eyeful from the deck. The
  // line reaches both banks.
  assert.equal(at(z, 135, 81), Tile.Fence);
  assert.equal(at(z, 135, 82), Tile.RedRagStake);
  // The mark-post one column east of the middle stake, never stacked
  // under it in the tilted frame (fix pass 1).
  assert.equal(at(z, 137, 83), Tile.TimberPost);
  assert.equal(at(z, 136, 83), TILE_SKIP);
  assert.equal(at(z, 136, 81), Tile.CharterPost);
  assert.equal(at(z, 133, 81), Tile.CharterPost, 'the west bank');
  assert.equal(at(z, 139, 81), Tile.CharterPost, 'the far bank');
  // Ingram's stands are the field's own ground, never authored.
  assert.equal(at(z, PINS.LINE_END_STAND[0], PINS.LINE_END_STAND[1]), TILE_SKIP);
  assert.equal(at(z, PINS.LINE_MIDDLE_STAND[0], PINS.LINE_MIDDLE_STAND[1]), TILE_SKIP);
  // The head: counter, canvas, pallets, lanterns, the weld pennant,
  // the corn, the oil, the coin box, the spoil.
  assert.equal(at(z, PINS.HEAD_COUNTER[0], PINS.HEAD_COUNTER[1]), Tile.Counter);
  assert.equal(at(z, PINS.HEAD_LEANTO[0], PINS.HEAD_LEANTO[1]), Tile.LeanTo);
  assert.equal(count(z, Tile.WoodFloor), 4, 'the pallets on dirt, one row back from the rim');
  assert.equal(count(z, Tile.StreetLantern), 2, 'the lantern pair');
  assert.equal(at(z, PINS.HEAD_BANNER[0], PINS.HEAD_BANNER[1]), bannerStandTile(PINS.DYE_FORDGATE), 'weld, never madder (J10)');
  assert.equal(PINS.DYE_FORDGATE, 3, 'the Charter\'s dye');
  assert.equal(count(z, Tile.CrateGoods), 1);
  assert.equal(count(z, Tile.BarrelStack), 1);
  assert.equal(count(z, Tile.ChestIron), 1, 'the levy\'s coin box');
  assert.equal(count(z, Tile.SpoilHeap), 2, 'the spoil bank marching east');
  // The pallets stand on dry ground; nothing at the head stands in water.
  for (const [x, y] of PINS.HEAD_FLOOR) assert.equal(at(z, x, y), Tile.WoodFloor);
  assert.equal(at(z, PINS.HEAD_STAND[0], PINS.HEAD_STAND[1]), Tile.Dirt, 'the clerk\'s stand is open');
  assert.equal(at(z, PINS.HEAD_CUSTOMER[0], PINS.HEAD_CUSTOMER[1]), Tile.Dirt, 'the road\'s cell before the counter is open');
});

test('fenside: THE ZONE\'S WARDED CHEST (0.2 G) binds the head\'s box to the bar\'s ward and the camp\'s table', () => {
  const z = buildFenside();
  assert.deepEqual(z.chests, [{ x: PINS.HEAD_CHEST[0], y: PINS.HEAD_CHEST[1], table: 'chest_pit_takings', wardedBy: 'first_road_toll' }]);
  assert.equal(at(z, PINS.HEAD_CHEST[0], PINS.HEAD_CHEST[1]), Tile.ChestIron, 'a closed chest tile under the binding');
  assert.ok(LOOT_TABLES.has('chest_pit_takings'), 'the table is the toll\'s');
  assert.ok(AUTHORED_WILD_SITES.some((s) => s.id === 'first_road_toll'), 'the ward is the pinned bar');
});

test('fenside: THE ONE BODY — Ansel the drover, roped beside the cage, facing the road', () => {
  const z = buildFenside();
  assert.deepEqual(z.actorSpawns, [
    { actor: 'charter_drover', x: 126.5, y: 85.5, dir: Math.PI / 2, routine: 'drover_held' },
  ]);
  assert.equal(at(z, 126, 85), Tile.Dirt, 'a wayside sit on trodden ground, not in the cage');
  assert.equal(at(z, 126, 84), Tile.PrisonCage, 'the cage beside him');
});

test('fenside: THE FLOODS run clean and the gap is open from both ends', () => {
  const { zone: z, registry } = buildFensideWithRegistry();
  assert.deepEqual(unreachableFloor(z, PINS.FLOOD_FROM), [], 'sealed pockets');
  assert.deepEqual(occlusionViolations(z, registry), [], 'the occlusion law');
  assert.deepEqual(signPairViolations(z), [], 'one Signpost per eyeful');
  assert.deepEqual(boxOverlaps(registry), [], 'scene boxes overlap');
  assert.deepEqual(emberBedsOffAsh(z), [], 'K1 (no bed here)');
  assert.deepEqual(skipRing(z), [], 'the border ring is the field\'s; no edge profile');
  assert.deepEqual(bedUntouched(z, PINS.BED_EXEMPT), [], 'the bed stays TILE_SKIP but the two BAR_GAP cells');
  assert.deepEqual(shoulderListed(z, PINS.SHOULDER_LISTED, PINS.BED_EXEMPT), [], 'every shoulder cell is listed');
  assert.deepEqual(gapOpen(z, PINS.GAP, PINS.TEETH, [126, 88], [132, 88]), [], 'the warden\'s gap');
  assert.deepEqual(padClear(z), [], 'G-12 under THE AUTHORED HUG: no pinned footprint overlaps the rect');
  // THE CREW'S STANDS (fix pass 1): the bar def posts its archer and
  // picket on the zone's worn shoulders either side of the gap; both
  // cells are the zone's own passable ground, never a tooth or a post.
  const barDef = POI_DEFS.get('first_road_bar')!;
  const pin = AUTHORED_WILD_SITES.find((s) => s.id === 'first_road_toll')!;
  const camp = POI_PREFABS.get(pin.prefabId!)!;
  const px0 = pin.x! - Math.floor(camp.width / 2);
  const py0 = pin.y! - Math.floor(camp.height / 2);
  const stands = barDef.garrison.filter((g) => g.at !== undefined).map((g) => [px0 + g.at!.dx, py0 + g.at!.dy] as const);
  assert.deepEqual(stands, [[128, 91], [128, 86]], 'the archer south of the gap, the picket north of it');
  for (const [x, y] of stands) {
    const t = at(z, x, y);
    assert.ok(t !== TILE_SKIP && !TILE_DEFS[t as Tile]!.solid, `the crew stands on the zone's own open ground at (${x},${y}), tile ${t}`);
    assert.ok(roadDistanceAt(WORLD_SEED, x, y) > ROAD_HALF, `(${x},${y}) is beside the bed, never on it`);
  }
  assert.deepEqual(footprintViolations(z), [], 'E5: the canvas\'s second foot');
  assert.deepEqual(zonePlacementErrors(z), [], 'the placement vet');
  // Only the two BAR_GAP cells are authored within ROAD_HALF.
  const gap = new Set(PINS.BAR_GAP.map(([x, y]) => `${x},${y}`));
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      const t = z.ground[ly * z.width + lx]!;
      if (roadDistanceAt(WORLD_SEED, x, y) <= ROAD_HALF && t !== TILE_SKIP) {
        assert.ok(gap.has(`${x},${y}`), `(${x},${y}) ${TILE_DEFS[t as Tile].name} stands on the bed`);
      }
    }
  }
});

test('fenside: byte-identical across two builds and through JSON', () => {
  const a = buildFenside();
  const b = buildFenside();
  assert.deepEqual(a, b);
  const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(a))));
  assert.deepEqual(round.ground, a.ground);
  assert.deepEqual(round.chests, a.chests, 'the chest binding round-trips');
  assert.deepEqual(round.actorSpawns, a.actorSpawns);
});

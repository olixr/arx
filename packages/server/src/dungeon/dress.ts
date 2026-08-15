import { Tile, rarityIndex, type DungeonTheme } from '@arx/shared';
import { dist, reachMask, reached, type DungeonBuild, type Room } from './types.js';

/**
 * DRESS — the halls learn their furniture, per theme.
 *
 * THE MANY FACES LAW: a theme is not a name on a key card — it is what
 * the walls hang and the floor stacks. The war-camp prop shelf goes
 * underground here: strongholds rack spears under banners, warrens
 * nest and gnaw, crypts pile their dead under brazier light, mines
 * stack the claim's stores by the veins, caverns keep their teeth and
 * their shroomlight.
 *
 * Placement truth is unchanged and non-negotiable: everything placed
 * over floor joins `removables`, local guards filter the obvious
 * pinches, and the two-sweep BFS repair is the guarantee that no prop
 * ever walls a prize off the road.
 */

/** Mining level each ore wants — gates the ladder by dungeon power. */
const ORE_LADDER: Array<{ tile: Tile; req: number }> = [
  { tile: Tile.RockCopper, req: 1 },
  { tile: Tile.RockTin, req: 1 },
  { tile: Tile.RockIron, req: 10 },
  { tile: Tile.RockCoal, req: 20 },
  { tile: Tile.RockSilver, req: 30 },
  { tile: Tile.RockGold, req: 40 },
  { tile: Tile.RockMithril, req: 50 },
  { tile: Tile.RockAdamant, req: 65 },
  { tile: Tile.RockObsidian, req: 78 },
  { tile: Tile.RockStarfall, req: 90 },
];

const CHEST_TILE_SET: ReadonlySet<Tile> = new Set([
  Tile.ChestWood,
  Tile.ChestMossy,
  Tile.ChestIron,
  Tile.ChestGilded,
  Tile.ChestBoss,
]);

/** Path-chest ladders per tier (boss/vault/hidden chests come extra). */
const PATH_CHESTS: Record<string, Tile[]> = {
  common: [Tile.ChestWood, Tile.ChestWood, Tile.ChestMossy],
  uncommon: [Tile.ChestWood, Tile.ChestMossy, Tile.ChestMossy, Tile.ChestMossy],
  rare: [Tile.ChestMossy, Tile.ChestMossy, Tile.ChestMossy, Tile.ChestIron],
  epic: [Tile.ChestMossy, Tile.ChestIron, Tile.ChestIron, Tile.ChestIron, Tile.ChestGilded],
  legendary: [Tile.ChestIron, Tile.ChestIron, Tile.ChestGilded, Tile.ChestGilded],
};

/**
 * THE DECOR KITS — what each theme scatters through its ordinary
 * rooms, beyond the light every dungeon owes (brazier shoulders in
 * halls, shroomlight in caves). `per` is floor-area per piece;
 * `wall` pins the piece to wall-adjacent cells; `styles` limits the
 * piece to one carving dialect.
 */
interface DecorEntry {
  tile: Tile;
  per: number;
  wall?: boolean;
  /**
   * THE LONG DARK FURNISHED: wall-hung pieces (sconce, chains, the
   * chained prisoner) paint their iron onto the wall face NORTH of
   * their cell — the only face the camera sees — so they demand rock
   * directly north, and refuse a cracked wall on any side (a fixture
   * over the crack's whisper would cork the discovery).
   */
  north?: boolean;
  styles?: ReadonlyArray<'cave' | 'hall'>;
}

const DECOR_KITS: Record<DungeonTheme, DecorEntry[]> = {
  cavern: [
    { tile: Tile.Stalagmite, per: 42, styles: ['cave'] },
    { tile: Tile.GlowShroom, per: 36, wall: true },
    // The swallowed kingdom: a snapped column and a worn king the
    // cave took back — nobody carved these HERE, the dark moved in.
    { tile: Tile.BrokenPillar, per: 130 },
    { tile: Tile.AncientStatue, per: 200 },
    { tile: Tile.MossBarrel, per: 160 },
    // THE LONG DARK PEOPLED: what was here before the kingdom (the
    // ribs in the rock, the patient webs, the mountain's slow clock)
    // and the delvers who came asking.
    { tile: Tile.WallFossil, per: 150, north: true },
    { tile: Tile.WallWeb, per: 130, north: true },
    { tile: Tile.DripPool, per: 90, styles: ['cave'] },
    { tile: Tile.ColdCamp, per: 180 },
  ],
  crypt: [
    { tile: Tile.BonePile, per: 48 },
    { tile: Tile.SkullPile, per: 110, wall: true },
    { tile: Tile.GlowShroom, per: 60, wall: true, styles: ['cave'] },
    // THE LONG DARK FURNISHED — the crypt is the kit's showcase: the
    // honored dead in stone and clay, the dishonored dead in irons.
    { tile: Tile.Sarcophagus, per: 70, styles: ['hall'] },
    { tile: Tile.BurialUrns, per: 72 },
    { tile: Tile.ChainedSkeleton, per: 130, north: true },
    { tile: Tile.BrokenPillar, per: 120 },
    { tile: Tile.AncientStatue, per: 150, styles: ['hall'] },
    { tile: Tile.GrandPillar, per: 170, styles: ['hall'] },
    // THE LONG DARK PEOPLED: the crypt is TENDED (someone still
    // lights the candles), ROBBED (someone got to the goods first),
    // and older than its own dead (the webs, the grates over what
    // lies deeper, the dishonored swinging in iron).
    { tile: Tile.CandleShrine, per: 90 },
    { tile: Tile.LootedChest, per: 140 },
    { tile: Tile.WallWeb, per: 140, north: true },
    { tile: Tile.GibbetCage, per: 180, styles: ['hall'] },
    { tile: Tile.IronGrate, per: 160, styles: ['hall'] },
  ],
  mine: [
    { tile: Tile.Crate, per: 80 },
    { tile: Tile.Barrel, per: 90 },
    { tile: Tile.Stalagmite, per: 60, styles: ['cave'] },
    { tile: Tile.GlowShroom, per: 46, wall: true, styles: ['cave'] },
    // The shift that never clocked out: a cart still half loaded,
    // stores gone green, chains where the haulage ran.
    { tile: Tile.MineCart, per: 90 },
    { tile: Tile.MossBarrel, per: 85 },
    { tile: Tile.WallChains, per: 150, north: true },
    // THE LONG DARK PEOPLED: the miners' own timber holding the
    // drift, the water they cursed, the camps of the shift that
    // never clocked out — and their pay-chest, long since visited.
    { tile: Tile.TimberBrace, per: 100, north: true },
    { tile: Tile.DripPool, per: 110, styles: ['cave'] },
    { tile: Tile.ColdCamp, per: 160 },
    { tile: Tile.LootedChest, per: 190 },
  ],
  stronghold: [
    { tile: Tile.WarBanner, per: 90, wall: true, styles: ['hall'] },
    { tile: Tile.SpearRack, per: 130, wall: true, styles: ['hall'] },
    { tile: Tile.PlunderSacks, per: 120 },
    { tile: Tile.BonePile, per: 100 },
    { tile: Tile.Crate, per: 100 },
    { tile: Tile.GlowShroom, per: 50, wall: true, styles: ['cave'] },
    // The garrison's dark side: prisoners in irons, stores gone
    // green, and the odd column of whoever held these halls first.
    { tile: Tile.WallChains, per: 120, north: true },
    { tile: Tile.ChainedSkeleton, per: 140, north: true },
    { tile: Tile.MossBarrel, per: 110 },
    { tile: Tile.GrandPillar, per: 170, styles: ['hall'] },
    // THE LONG DARK PEOPLED: the garrison's justice in full — the
    // gibbet by the gate, the stocks in the yard, the grates over
    // the oubliette, and the paymaster's chest already pried.
    { tile: Tile.GibbetCage, per: 130 },
    { tile: Tile.Stocks, per: 150, styles: ['hall'] },
    { tile: Tile.IronGrate, per: 140, styles: ['hall'] },
    { tile: Tile.LootedChest, per: 160 },
  ],
  warren: [
    { tile: Tile.BonePile, per: 55 },
    { tile: Tile.SkullPile, per: 90, wall: true },
    { tile: Tile.HideFrame, per: 120, wall: true },
    { tile: Tile.BeastNest, per: 140 },
    { tile: Tile.SkullTotem, per: 170, wall: true },
    { tile: Tile.GlowShroom, per: 44, wall: true, styles: ['cave'] },
    // Dragged home and never opened; the pack's larder tells on it.
    { tile: Tile.MossBarrel, per: 130 },
    { tile: Tile.ChainedSkeleton, per: 190, north: true },
    // THE LONG DARK PEOPLED: the warren keeps its corners webbed,
    // its victims' camps cold, and their goods already gone through.
    { tile: Tile.WallWeb, per: 100, north: true },
    { tile: Tile.ColdCamp, per: 150 },
    { tile: Tile.LootedChest, per: 170 },
  ],
  // THE ROOT-HALLS: runestones grown askew, crystal the roots fed,
  // shroomlight where the moon never reached, the odd fallen light
  // still burning silver with nobody left to thank — and bones,
  // because the quiet holds down what bones do.
  heartwood: [
    { tile: Tile.Runestone, per: 70, wall: true },
    { tile: Tile.CrystalCluster, per: 95 },
    { tile: Tile.GlowShroom, per: 40, wall: true, styles: ['cave'] },
    { tile: Tile.BonePile, per: 110 },
    { tile: Tile.ArcaneBeacon, per: 170, styles: ['hall'] },
    // What the roots grew through: the old kingdom's columns and its
    // quiet keepers, half reclaimed.
    { tile: Tile.BrokenPillar, per: 140 },
    { tile: Tile.AncientStatue, per: 190, styles: ['hall'] },
    // THE LONG DARK PEOPLED: the roots grew through older bones than
    // the kingdom's, the water still keeps time, and the webs mend
    // themselves in the quiet.
    { tile: Tile.WallFossil, per: 150, north: true },
    { tile: Tile.DripPool, per: 100 },
    { tile: Tile.WallWeb, per: 160, north: true },
  ],
};

/**
 * Every tile the dress pass keeps its distance from (crowding guard) —
 * its own placeables plus the pillars the carve pass raised: a prop
 * beside a pillar builds exactly the two-solid pinch the mortar pass
 * exists to prevent.
 */
const PLACED_PROP_TILES: ReadonlySet<Tile> = new Set([
  Tile.PillarStone,
  Tile.Stalagmite,
  Tile.Brazier,
  Tile.GlowShroom,
  Tile.BonePile,
  Tile.Barrel,
  Tile.Crate,
  Tile.SkullPile,
  Tile.SkullTotem,
  Tile.WarBanner,
  Tile.SpearRack,
  Tile.PlunderSacks,
  Tile.HideFrame,
  Tile.BeastNest,
  Tile.StandingTorch,
  // THE LONG DARK FURNISHED
  Tile.MossBarrel,
  Tile.MineCart,
  Tile.ChainedSkeleton,
  Tile.WallSconce,
  Tile.WallChains,
  Tile.Sarcophagus,
  Tile.BrokenPillar,
  Tile.GrandPillar,
  Tile.BurialUrns,
  Tile.AncientStatue,
  // THE LONG DARK PEOPLED
  Tile.GibbetCage,
  Tile.Stocks,
  Tile.TimberBrace,
  Tile.WallFossil,
  Tile.WallWeb,
  Tile.DripPool,
  Tile.ColdCamp,
  Tile.LootedChest,
  Tile.CandleShrine,
  Tile.IronGrate,
]);

const FLOORISH: ReadonlySet<Tile> = new Set([Tile.CaveFloor, Tile.DungeonFloor, Tile.CaveRubble]);

export function dressAll(b: DungeonBuild): void {
  const { c, rDress } = b;
  const S = b.spec.size;
  const entry = b.rooms[0]!;

  // Placement truth: everything dressing adds must stand on ground the
  // player can actually reach — the open mask for the main dungeon,
  // the secret mask (cracks counted open) for hidden rooms.
  b.openMask = reachMask(c, entry.x, entry.y, false);
  b.secretMask = reachMask(c, entry.x, entry.y, true);
  const openMask = b.openMask;
  const secretMask = b.secretMask;

  // Masonry ring: rock that faces flagstones is worked stone; rock
  // that faces raw cave stays raw. The dialect boundary draws itself.
  {
    const flag = new Uint8Array(S * S);
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        if (c.get(x, y) !== Tile.CaveWall) continue;
        let masonry = false;
        let raw = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const t = c.get(x + dx, y + dy);
            if (t === Tile.DungeonFloor) masonry = true;
            else if (t === Tile.CaveFloor || t === Tile.CaveRubble || t === Tile.WaterShallow) raw = true;
          }
        }
        if (masonry && !raw) flag[y * S + x] = 1;
      }
    }
    for (let i = 0; i < flag.length; i++) {
      if (flag[i]) c.ground[i] = Tile.WallStone;
    }
  }

  // Water pools in cave chambers (never the entry, never the boss).
  if (rDress.chance(b.theme.water)) {
    const wet = b.rooms.filter((a) => a.kind === 'room' && a.style === 'cave');
    for (let i = 0; i < Math.min(2, wet.length); i++) {
      const a = wet[rDress.int(0, wet.length - 1)]!;
      const pr = Math.max(2, a.r - 3);
      for (let dy = -pr; dy <= pr; dy++) {
        for (let dx = -pr; dx <= pr; dx++) {
          const d = Math.hypot(dx, dy) / pr;
          if (d <= 1 && rDress.chance(1.15 - d) && c.get(a.x + dx, a.y + dy) === Tile.CaveFloor) {
            c.set(a.x + dx, a.y + dy, Tile.WaterShallow);
          }
        }
      }
    }
  }

  // ---- the ore ladder ------------------------------------------------
  const maxDepth = Math.max(1, ...b.rooms.map((a) => a.depth));
  const allowedOres = ORE_LADDER.filter((o) => o.req <= b.spec.power + 18);
  b.oreSpots = [];
  b.removables = [];
  const oreSpots = b.oreSpots;
  const removables = b.removables;
  /**
   * A vein needs a wall at its back, three open orthogonal neighbors
   * (so it can never plug a tunnel), and clean orthogonals — no ore
   * pair pinches, no ore squatting on a chest's face.
   */
  const canOre = (x: number, y: number, mask: Uint8Array = openMask): boolean => {
    if (!mask[y * S + x]) return false;
    if (!FLOORISH.has(c.get(x, y))) return false;
    let wallAdj = false;
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nt = c.get(x + dx, y + dy);
      if (c.isRock(x + dx, y + dy)) wallAdj = true;
      if (c.passable(x + dx, y + dy)) open++;
      if (ORE_LADDER.some((o) => o.tile === nt) || CHEST_TILE_SET.has(nt)) return false;
    }
    return wallAdj && open >= 3;
  };
  // THE TURNED SEED: a veined key runs the rock twice as rich.
  const veinMult = b.mods.has('veined') ? 2 : 1;
  for (const a of b.rooms) {
    if (a.kind === 'entry') continue;
    const veins = (rDress.int(1, 3) + (a.depth >= maxDepth - 1 ? 1 : 0)) * veinMult;
    for (let v = 0; v < veins; v++) {
      for (let attempt = 0; attempt < 14; attempt++) {
        const x = a.x + rDress.int(-a.r - 2, a.r + 2);
        const y = a.y + rDress.int(-a.r - 2, a.r + 2);
        if (!canOre(x, y)) continue;
        // Depth bias: the deepest chambers draw from the top of the
        // allowed ladder, shallow ones from the bottom.
        const frac = a.depth / maxDepth;
        const hi = Math.max(1, Math.round(allowedOres.length * (0.4 + frac * 0.6)));
        const pick = allowedOres[rDress.int(Math.max(0, hi - 3), hi - 1)]!;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, pick.tile);
        oreSpots.push({ x, y });
        break;
      }
    }
  }
  // Ore quota: a dungeon short on veins after the room pass sweeps
  // the whole map for wall-hugging spots — mining is a promise the
  // key card makes, so every dungeon keeps it.
  if (oreSpots.length < 4 && allowedOres.length > 0) {
    outer: for (let y = 3; y < S - 3; y++) {
      for (let x = 3; x < S - 3; x++) {
        if (!canOre(x, y) || !rDress.chance(0.3)) continue;
        const pick = allowedOres[rDress.int(0, allowedOres.length - 1)]!;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, pick.tile);
        oreSpots.push({ x, y });
        if (oreSpots.length >= 5) break outer;
      }
    }
  }

  // Hidden rooms carry a rich double vein.
  for (const h of b.hiddenRooms) {
    for (let v = 0; v < 2 && allowedOres.length > 0; v++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = h.x + rDress.int(-3, 3);
        const y = h.y + rDress.int(-3, 3);
        if (!canOre(x, y, secretMask)) continue;
        removables.push({ x, y, was: c.get(x, y) });
        c.set(x, y, allowedOres[allowedOres.length - 1 - Math.min(v, allowedOres.length - 1)]!.tile);
        break;
      }
    }
  }

  // ---- the path-chest ladder, deepest rooms first --------------------
  const chestRooms = b.rooms
    .filter((a) => a.kind === 'room')
    .sort((p, q) => q.depth - p.depth);
  // THE TURNED SEED: a hoarding key stretches the ladder by two rungs;
  // a blooded garrison hoards one more of its best (pressure pays).
  let pathChests = PATH_CHESTS[b.spec.tier] ?? PATH_CHESTS.common!;
  if (b.mods.has('hoarding')) {
    pathChests = [pathChests[0]!, pathChests[1] ?? pathChests[0]!, ...pathChests];
  }
  if (b.mods.has('blooded')) {
    pathChests = [...pathChests, pathChests[pathChests.length - 1]!];
  }
  b.placedChests = [];
  const placedChests = b.placedChests;
  /**
   * Cells along a room's north wall — floor with rock straight above,
   * so the chest (or brazier) stands against the wall and shows its
   * face to the camera. Scanned, not sampled: a room either has such
   * cells or it doesn't, and if it does we always find one.
   */
  const northWallCells = (a: Room): Array<{ x: number; y: number }> => {
    const out: Array<{ x: number; y: number }> = [];
    const reach = a.r + 3;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = a.x + dx;
        const y = a.y + dy;
        if (!openMask[y * S + x]) continue;
        if (!FLOORISH.has(c.get(x, y))) continue;
        if (!c.isRock(x, y - 1)) continue;
        if (!c.passable(x, y + 1)) continue; // openable from the south
        // NEVER BLOCKADE A SECRET: a chest is solid and no sweep may
        // pull a prize — a cell kissing a cracked wall is the secret's
        // own doorway, and nothing may stand in a doorway.
        let nearCrack = false;
        for (const [dx2, dy2] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (c.get(x + dx2, y + dy2) === Tile.CrackedCaveWall) nearCrack = true;
        }
        if (nearCrack) continue;
        out.push({ x, y });
      }
    }
    return out;
  };
  for (let i = 0; i < pathChests.length && i < chestRooms.length; i++) {
    const room = chestRooms[i]!;
    const cells = northWallCells(room);
    if (cells.length === 0) continue;
    const spot = cells[rDress.int(0, cells.length - 1)]!;
    c.set(spot.x, spot.y, pathChests[pathChests.length - 1 - i]!);
    placedChests.push(spot);
  }

  // THE DEAD END PAYS: a tangent that goes nowhere must hold something.
  // Walking a branch to its end and finding bare rock is the one sin a
  // dungeon crawler never forgives — any degree-1 side room the ladders
  // skipped gets the tier's humble chest, or failing wall space, a vein.
  for (const room of b.rooms) {
    if (room.onSpine || room.kind !== 'room' || room.degree !== 1) continue;
    const rr = room.r + 3;
    const paid =
      placedChests.some((p) => dist(p.x, p.y, room.x, room.y) <= rr) ||
      oreSpots.some((p) => dist(p.x, p.y, room.x, room.y) <= rr);
    if (paid) continue;
    const cells = northWallCells(room);
    if (cells.length > 0) {
      const spot = cells[rDress.int(0, cells.length - 1)]!;
      c.set(spot.x, spot.y, pathChests[0]!);
      placedChests.push(spot);
      continue;
    }
    for (let attempt = 0; attempt < 14; attempt++) {
      const x = room.x + rDress.int(-room.r - 2, room.r + 2);
      const y = room.y + rDress.int(-room.r - 2, room.r + 2);
      if (!canOre(x, y)) continue;
      removables.push({ x, y, was: c.get(x, y) });
      c.set(x, y, allowedOres[rDress.int(0, allowedOres.length - 1)]!.tile);
      oreSpots.push({ x, y });
      break;
    }
  }

  // ---- props: the room learns its furniture --------------------------
  // Solid props keep three open orthogonal neighbors and never crowd
  // each other — and the repair pass below guarantees they never wall
  // off a prize.
  const canProp = (x: number, y: number, mask: Uint8Array = openMask): boolean => {
    if (!mask[y * S + x]) return false;
    if (!FLOORISH.has(c.get(x, y))) return false;
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (c.passable(x + dx, y + dy)) open++;
    }
    if (open < 3) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (PLACED_PROP_TILES.has(c.get(x + dx, y + dy))) return false;
      }
    }
    return true;
  };
  const putProp = (x: number, y: number, t: Tile, mask?: Uint8Array): boolean => {
    if (!canProp(x, y, mask)) return false;
    removables.push({ x, y, was: c.get(x, y) });
    c.set(x, y, t);
    return true;
  };

  const kit = DECOR_KITS[b.spec.theme];
  for (const a of b.rooms) {
    if (a.kind === 'entry') continue; // the landing stays clear
    // THE COURT IS DRESSED BY ITS AUTHOR: the grand arena carries its
    // own regalia — scattered clutter would cheapen the read and can
    // wall the dais lane the prefab authored open.
    if (a.kind === 'boss') continue;
    const area = Math.PI * a.r * a.r;
    // The light every dungeon owes: brazier shoulders in worked rooms…
    if (a.style === 'hall') {
      const spots = northWallCells(a).filter((p) => c.get(p.x, p.y) === Tile.DungeonFloor);
      for (let placedB = 0; placedB < 2 && spots.length > 0; placedB++) {
        const spot = spots.splice(rDress.int(0, spots.length - 1), 1)[0]!;
        putProp(spot.x, spot.y, Tile.Brazier);
      }
    }
    // …then the theme's own kit.
    for (const entryDef of kit) {
      if (entryDef.styles && !entryDef.styles.includes(a.style)) continue;
      const pieces = Math.round(area / entryDef.per);
      if (entryDef.north) {
        // THE FIXTURE FINDS ITS WALL: random darts almost never land
        // on the one-cell band under a room's north wall (the first
        // census hung one skeleton per five dungeons) — so the wall
        // pieces deal from the scanned band itself. northWallCells
        // already speaks the whole law: rock due north, open to the
        // south, never kissing a crack.
        const cells = northWallCells(a);
        for (let i = 0; i < pieces && cells.length > 0; i++) {
          const spot = cells.splice(rDress.int(0, cells.length - 1), 1)[0]!;
          putProp(spot.x, spot.y, entryDef.tile);
        }
        continue;
      }
      for (let i = 0; i < pieces; i++) {
        const x = a.x + rDress.int(-a.r, a.r);
        const y = a.y + rDress.int(-a.r, a.r);
        if (entryDef.wall) {
          let wallAdj = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (c.isRock(x + dx, y + dy)) wallAdj = true;
          }
          if (!wallAdj) continue;
        }
        putProp(x, y, entryDef.tile);
      }
    }
    // Rubble breaks up any big floor.
    for (let i = Math.round(area / 30); i > 0; i--) {
      const x = a.x + rDress.int(-a.r, a.r);
      const y = a.y + rDress.int(-a.r, a.r);
      if (c.get(x, y) === Tile.CaveFloor) c.set(x, y, Tile.CaveRubble);
    }
  }
  // Glowshrooms light hidden pockets too.
  for (const h of b.hiddenRooms) {
    for (let i = 0; i < 2; i++) {
      putProp(h.x + b.rSecret.int(-2, 2), h.y + b.rSecret.int(-2, 2), Tile.GlowShroom, secretMask);
    }
  }

  // CORRIDOR LIGHTS: seeing the fight matters most in the halls
  // between rooms — every ~7-11 path tiles, one light goes up against
  // the corridor wall: a brazier where the floor is worked flagstone
  // (a standing torch in the war-themes' halls), glowshrooms where the
  // rock is raw. putProp's guards keep them out of the walkway.
  const warTheme = b.spec.theme === 'stronghold' || b.spec.theme === 'warren';
  for (const path of b.corridorPaths) {
    let next = 5 + rDress.int(0, 3);
    for (let i = 0; i < path.length; i++) {
      if (i < next) continue;
      const pc = path[i]!;
      let placed = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [0, 0]] as const) {
        const x = pc.x + dx;
        const y = pc.y + dy;
        let wallAdj = false;
        for (const [wx, wy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (c.isRock(x + wx, y + wy)) wallAdj = true;
        }
        if (!wallAdj) continue;
        const worked = c.get(x, y) === Tile.DungeonFloor;
        // Worked corridors in the old-kingdom themes light from the
        // wall itself — a caged sconce leaves the walkway clear —
        // wherever the cell has honest (uncracked) rock to the north;
        // war themes plant their torches, and raw rock grows its own.
        const sconce =
          (b.spec.theme === 'crypt' || b.spec.theme === 'mine') &&
          c.isRock(x, y - 1) &&
          c.get(x, y - 1) !== Tile.CrackedCaveWall;
        const t = worked
          ? warTheme ? Tile.StandingTorch : sconce ? Tile.WallSconce : Tile.Brazier
          : Tile.GlowShroom;
        if (putProp(x, y, t)) {
          placed = true;
          break;
        }
      }
      next = i + (placed ? 7 + rDress.int(0, 4) : 2);
    }
  }

  // ---- prop repair: nothing placed may cut a prize off the entry -----
  // Two sweeps: the open dungeon (cracks shut) must reach every room,
  // chest, and vein; and with cracks counted open, the hidden prizes
  // must be reachable too.
  // EVERY chest is a target, wherever it came from — the dress ladder,
  // a prefab dais, a sealed vault. Hidden prizes sit behind cracks by
  // design, so they only join the cracks-open sweep.
  const hiddenSet = new Set(b.hiddenRooms.map((h) => `${h.x},${h.y}`));
  const allChests: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < c.ground.length; i++) {
    if (CHEST_TILE_SET.has(c.ground[i] as Tile)) {
      allChests.push({ x: i % S, y: Math.floor(i / S) });
    }
  }
  for (const cracksOpen of [false, true]) {
    const targets: Array<{ x: number; y: number }> = [
      ...b.rooms.map((a) => ({ x: a.x, y: a.y })),
      ...allChests.filter((ch) => cracksOpen || !hiddenSet.has(`${ch.x},${ch.y}`)),
      ...oreSpots,
      ...(cracksOpen ? b.hiddenRooms : []),
    ];
    for (let attempt = 0; attempt < removables.length + 1; attempt++) {
      const seen = reachMask(c, entry.x, entry.y, cracksOpen);
      const missing = targets.find((t) => !reached(seen, S, t.x, t.y));
      if (!missing) break;
      // Pull the placed piece nearest the stranded target.
      let worst = -1;
      let wd = Infinity;
      for (let i = 0; i < removables.length; i++) {
        const p = removables[i]!;
        if (p.was === (Tile.Void as Tile)) continue; // already pulled
        const d = dist(p.x, p.y, missing.x, missing.y);
        if (d < wd) {
          wd = d;
          worst = i;
        }
      }
      if (worst < 0) break;
      const p = removables[worst]!;
      c.set(p.x, p.y, p.was);
      p.was = Tile.Void as Tile;
    }
  }

  // Masks moved under the props: refresh them for the garrison pass,
  // and find the champion's chest the arena stamp raised.
  b.openMask = reachMask(c, entry.x, entry.y, false);
  b.secretMask = reachMask(c, entry.x, entry.y, true);
  b.bossChest = null;
  {
    const court = b.rooms[b.bossIdx]!;
    const reach = 13;
    let bd = Infinity;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = court.x + dx;
        const y = court.y + dy;
        if (c.get(x, y) !== Tile.ChestBoss) continue;
        const d = dist(x, y, court.x, court.y);
        if (d < bd) {
          bd = d;
          b.bossChest = { x, y };
        }
      }
    }
  }
}

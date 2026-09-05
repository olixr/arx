import { Tile, isSolidTile, rarityIndex, type DungeonTheme } from '@arx/shared';
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
 * THE CURATED HAND — the ambient coat.
 *
 * What each theme breathes through EVERY ordinary room: texture, not
 * story. Thin by design — the vignettes below carry the narrative,
 * and they only read against quiet ground. `per` is floor-area per
 * piece; `wall` pins to wall-adjacent cells; `north` deals from the
 * scanned north-wall band (rock due north, open south, never kissing
 * a crack); `styles` limits to one carving dialect.
 */
interface DecorEntry {
  tile: Tile;
  per: number;
  wall?: boolean;
  north?: boolean;
  styles?: ReadonlyArray<'cave' | 'hall'>;
}

const AMBIENT_KITS: Record<DungeonTheme, DecorEntry[]> = {
  cavern: [
    { tile: Tile.Stalagmite, per: 42, styles: ['cave'] },
    { tile: Tile.GlowShroom, per: 36, wall: true },
    { tile: Tile.MossBarrel, per: 210 },
    { tile: Tile.WallFossil, per: 230, north: true },
  ],
  crypt: [
    { tile: Tile.BonePile, per: 60 },
    { tile: Tile.SkullPile, per: 130, wall: true },
    { tile: Tile.GlowShroom, per: 60, wall: true, styles: ['cave'] },
    { tile: Tile.BurialUrns, per: 150 },
    { tile: Tile.ChainedSkeleton, per: 240, north: true },
  ],
  mine: [
    { tile: Tile.Crate, per: 95 },
    { tile: Tile.Barrel, per: 115 },
    { tile: Tile.Stalagmite, per: 60, styles: ['cave'] },
    { tile: Tile.GlowShroom, per: 46, wall: true, styles: ['cave'] },
    { tile: Tile.MossBarrel, per: 160 },
    { tile: Tile.WallChains, per: 220, north: true },
  ],
  stronghold: [
    { tile: Tile.WarBanner, per: 100, wall: true, styles: ['hall'] },
    { tile: Tile.BonePile, per: 110 },
    { tile: Tile.Crate, per: 115 },
    { tile: Tile.GlowShroom, per: 50, wall: true, styles: ['cave'] },
    { tile: Tile.MossBarrel, per: 190 },
  ],
  warren: [
    { tile: Tile.BonePile, per: 60 },
    { tile: Tile.SkullPile, per: 105, wall: true },
    { tile: Tile.HideFrame, per: 150, wall: true },
    { tile: Tile.GlowShroom, per: 44, wall: true, styles: ['cave'] },
  ],
  heartwood: [
    { tile: Tile.Runestone, per: 90, wall: true },
    { tile: Tile.CrystalCluster, per: 110 },
    { tile: Tile.GlowShroom, per: 40, wall: true, styles: ['cave'] },
    { tile: Tile.BonePile, per: 130 },
  ],
};

/**
 * THE ROOM DRAWS A STORY — the vignette tables.
 *
 * A vignette is a SCENE: an anchor piece and its satellites, placed
 * as a cluster the way a hand would set them. Roles: `north` mates
 * deal from the room's north-wall band near the anchor; `beside`
 * takes an orthogonal of the anchor; `near` lands within a step or
 * three. Optional pieces fail silently — scenes degrade, never
 * scatter. Adjacent rooms refuse the same story, and the marquee
 * pieces carry per-dungeon caps, so rarity is law, not luck.
 */
interface VigPiece {
  tile: Tile;
  role: 'north' | 'beside' | 'near';
  opt?: boolean;
}

interface Vignette {
  id: string;
  weight: number;
  /** The anchor: first on the ground, the scene grows around it. */
  anchor: Tile;
  /** Anchor deals from the north-wall band instead of open floor. */
  northAnchor?: boolean;
  pieces: VigPiece[];
  styles?: ReadonlyArray<'cave' | 'hall'>;
  /**
   * Which half of the road the scene belongs to: the garrison's
   * justice meets you at the ENTRY half; the delvers' cold camps
   * fall on the COURT half — they died close to the prize.
   */
  half?: 'entry' | 'court';
  /** The scene prefers rooms where the traffic died (degree 1). */
  degree1?: boolean;
}

const STORY_TABLES: Record<DungeonTheme, Vignette[]> = {
  cavern: [
    {
      id: 'swallowed_kingdom', weight: 3, anchor: Tile.BrokenPillar,
      pieces: [
        { tile: Tile.AncientStatue, role: 'near', opt: true },
        { tile: Tile.MossBarrel, role: 'near', opt: true },
      ],
    },
    {
      id: 'bone_bed', weight: 3, anchor: Tile.WallFossil, northAnchor: true,
      pieces: [
        { tile: Tile.WallFossil, role: 'north', opt: true },
        { tile: Tile.DripPool, role: 'near', opt: true },
      ],
    },
    {
      id: 'web_hollow', weight: 2.5, anchor: Tile.WallWeb, northAnchor: true, degree1: true,
      pieces: [
        { tile: Tile.WallWeb, role: 'north' },
        { tile: Tile.WallWeb, role: 'north', opt: true },
      ],
    },
    {
      id: 'delvers_end', weight: 2, anchor: Tile.ColdCamp, half: 'court',
      pieces: [
        { tile: Tile.LootedChest, role: 'near' },
        { tile: Tile.MossBarrel, role: 'near', opt: true },
      ],
    },
    {
      id: 'spring_seep', weight: 2, anchor: Tile.DripPool, styles: ['cave'],
      pieces: [
        { tile: Tile.DripPool, role: 'near' },
        { tile: Tile.GlowShroom, role: 'near', opt: true },
      ],
    },
  ],
  crypt: [
    {
      // The candle only ever burns beside the dead it tends.
      id: 'tended_reliquary', weight: 3, anchor: Tile.Sarcophagus, styles: ['hall'],
      pieces: [
        { tile: Tile.CandleShrine, role: 'beside' },
        { tile: Tile.BurialUrns, role: 'near' },
        { tile: Tile.BurialUrns, role: 'near', opt: true },
      ],
    },
    {
      id: 'robbed_grave', weight: 2.5, anchor: Tile.LootedChest,
      pieces: [
        { tile: Tile.Sarcophagus, role: 'near', opt: true },
        { tile: Tile.BurialUrns, role: 'near', opt: true },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'gibbet_row', weight: 1.5, anchor: Tile.GibbetCage, northAnchor: true, styles: ['hall'],
      pieces: [
        { tile: Tile.GibbetCage, role: 'north', opt: true },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'oubliette', weight: 1.5, anchor: Tile.IronGrate, styles: ['hall'],
      pieces: [
        { tile: Tile.IronGrate, role: 'near', opt: true },
        { tile: Tile.ChainedSkeleton, role: 'north', opt: true },
      ],
    },
    {
      id: 'old_colonnade', weight: 2, anchor: Tile.GrandPillar, styles: ['hall'],
      pieces: [
        { tile: Tile.GrandPillar, role: 'near' },
        { tile: Tile.BrokenPillar, role: 'near', opt: true },
      ],
    },
    {
      id: 'quiet_dead', weight: 2, anchor: Tile.BurialUrns,
      pieces: [
        { tile: Tile.BurialUrns, role: 'beside', opt: true },
        { tile: Tile.CandleShrine, role: 'near', opt: true },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'kings_watch', weight: 1.5, anchor: Tile.AncientStatue, styles: ['hall'],
      pieces: [
        { tile: Tile.CandleShrine, role: 'beside', opt: true },
        { tile: Tile.BrokenPillar, role: 'near', opt: true },
      ],
    },
    {
      id: 'webbed_vault', weight: 1.5, anchor: Tile.WallWeb, northAnchor: true, degree1: true,
      pieces: [
        { tile: Tile.WallWeb, role: 'north', opt: true },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
  ],
  mine: [
    {
      id: 'working_face', weight: 3, anchor: Tile.TimberBrace, northAnchor: true,
      pieces: [
        { tile: Tile.TimberBrace, role: 'north', opt: true },
        { tile: Tile.MineCart, role: 'near', opt: true },
        { tile: Tile.Crate, role: 'near', opt: true },
      ],
    },
    {
      id: 'haul_run', weight: 2.5, anchor: Tile.MineCart,
      pieces: [
        { tile: Tile.Crate, role: 'near' },
        { tile: Tile.Barrel, role: 'near', opt: true },
        { tile: Tile.MossBarrel, role: 'near', opt: true },
      ],
    },
    {
      id: 'flooded_drift', weight: 2, anchor: Tile.DripPool, styles: ['cave'],
      pieces: [
        { tile: Tile.DripPool, role: 'near' },
        { tile: Tile.DripPool, role: 'near', opt: true },
        { tile: Tile.GlowShroom, role: 'near', opt: true },
      ],
    },
    {
      id: 'dead_shift', weight: 2, anchor: Tile.ColdCamp, half: 'court',
      pieces: [
        { tile: Tile.LootedChest, role: 'near' },
        { tile: Tile.Barrel, role: 'near', opt: true },
      ],
    },
    {
      id: 'chained_haulage', weight: 1.5, anchor: Tile.WallChains, northAnchor: true,
      pieces: [
        { tile: Tile.WallChains, role: 'north', opt: true },
        { tile: Tile.MossBarrel, role: 'near', opt: true },
      ],
    },
  ],
  stronghold: [
    {
      // The gibbet and the stocks stand TOGETHER, at the gate.
      id: 'gatehouse_justice', weight: 2.5, anchor: Tile.GibbetCage, half: 'entry', styles: ['hall'],
      pieces: [
        { tile: Tile.Stocks, role: 'near' },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'oubliette', weight: 2, anchor: Tile.IronGrate, styles: ['hall'],
      pieces: [
        { tile: Tile.IronGrate, role: 'near', opt: true },
        { tile: Tile.ChainedSkeleton, role: 'north', opt: true },
      ],
    },
    {
      id: 'armory', weight: 2.5, anchor: Tile.SpearRack, northAnchor: true, styles: ['hall'],
      pieces: [
        { tile: Tile.WarBanner, role: 'north', opt: true },
        { tile: Tile.SpearRack, role: 'north', opt: true },
        { tile: Tile.Crate, role: 'near', opt: true },
      ],
    },
    {
      id: 'plunder_heap', weight: 2.5, anchor: Tile.PlunderSacks,
      pieces: [
        { tile: Tile.PlunderSacks, role: 'near', opt: true },
        { tile: Tile.LootedChest, role: 'near', opt: true },
        { tile: Tile.Crate, role: 'near', opt: true },
      ],
    },
    {
      id: 'prisoners_wall', weight: 2, anchor: Tile.ChainedSkeleton, northAnchor: true,
      pieces: [
        { tile: Tile.WallChains, role: 'north' },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'old_kingdom', weight: 1.5, anchor: Tile.GrandPillar, styles: ['hall'],
      pieces: [{ tile: Tile.GrandPillar, role: 'near', opt: true }],
    },
    {
      // THE SCARRED LAND (K1): the hall that burned with its people
      // in it — the roof came down, the fire it fed is banked to
      // embers, and what was in the strongbox went out the door
      // before the smoke cleared. Ash pans the floor around the bed.
      id: 'burnt_steading', weight: 2, anchor: Tile.CollapsedRoof, styles: ['hall'],
      pieces: [
        { tile: Tile.EmberBed, role: 'near' },
        { tile: Tile.LootedChest, role: 'near' },
        { tile: Tile.AshHeap, role: 'near', opt: true },
        { tile: Tile.CharredBeam, role: 'near', opt: true },
      ],
    },
    {
      // THE SCARRED LAND (K3, THE FIELD AFTER): the hall where the
      // garrison met whoever came up the stair — the standard down
      // where the line broke (the anchor: without it there is no
      // story), the litter of the fight on both sides of it, the post
      // that took the archers' misses, and the one cairn they had time
      // to raise before they had to leave — a hall's fight, never the
      // cart or the horse (nothing rolls down a stair). Lands on the
      // ENTRY half: the sally is fought at the door, not at the prize.
      id: 'field_after', weight: 2, anchor: Tile.FallenBanner, half: 'entry', styles: ['hall'],
      pieces: [
        { tile: Tile.FieldLitter, role: 'near' },
        { tile: Tile.FieldLitter, role: 'beside', opt: true },
        { tile: Tile.ArrowPost, role: 'near', opt: true },
        { tile: Tile.FieldCairn, role: 'near', opt: true },
      ],
    },
  ],
  warren: [
    {
      id: 'trophy_wall', weight: 2.5, anchor: Tile.SkullTotem, northAnchor: true,
      pieces: [
        { tile: Tile.HideFrame, role: 'north', opt: true },
        { tile: Tile.SkullPile, role: 'near' },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'victims_camp', weight: 2.5, anchor: Tile.ColdCamp, half: 'court',
      pieces: [
        { tile: Tile.LootedChest, role: 'near' },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'web_corner', weight: 2.5, anchor: Tile.WallWeb, northAnchor: true, degree1: true,
      pieces: [
        { tile: Tile.WallWeb, role: 'north' },
        { tile: Tile.WallWeb, role: 'north', opt: true },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
    {
      id: 'nest_cluster', weight: 3, anchor: Tile.BeastNest,
      pieces: [
        { tile: Tile.BeastNest, role: 'near', opt: true },
        { tile: Tile.BonePile, role: 'near' },
        { tile: Tile.SkullPile, role: 'near', opt: true },
      ],
    },
    {
      id: 'chained_larder', weight: 1.5, anchor: Tile.ChainedSkeleton, northAnchor: true,
      pieces: [
        { tile: Tile.MossBarrel, role: 'near' },
        { tile: Tile.BonePile, role: 'near', opt: true },
      ],
    },
  ],
  heartwood: [
    {
      id: 'root_shrine', weight: 3, anchor: Tile.Runestone, northAnchor: true,
      pieces: [
        { tile: Tile.CrystalCluster, role: 'near' },
        { tile: Tile.CrystalCluster, role: 'near', opt: true },
      ],
    },
    {
      id: 'fossil_bed', weight: 2.5, anchor: Tile.WallFossil, northAnchor: true,
      pieces: [
        { tile: Tile.WallFossil, role: 'north', opt: true },
        { tile: Tile.DripPool, role: 'near', opt: true },
      ],
    },
    {
      id: 'still_water', weight: 2, anchor: Tile.DripPool,
      pieces: [
        { tile: Tile.DripPool, role: 'near' },
        { tile: Tile.GlowShroom, role: 'near', opt: true },
      ],
    },
    {
      id: 'swallowed_hall', weight: 2, anchor: Tile.BrokenPillar, styles: ['hall'],
      pieces: [
        { tile: Tile.AncientStatue, role: 'near', opt: true },
        { tile: Tile.ArcaneBeacon, role: 'near', opt: true },
      ],
    },
    {
      id: 'patient_webs', weight: 2, anchor: Tile.WallWeb, northAnchor: true, degree1: true,
      pieces: [{ tile: Tile.WallWeb, role: 'north', opt: true }],
    },
  ],
};

/**
 * RARITY IS LAW: per-dungeon caps on the marquee pieces. A gibbet you
 * see once is a gallows; a gibbet you see nine times is wallpaper.
 * Enforced at the placement choke point for every pass.
 */
const PROP_CAPS: ReadonlyMap<Tile, number> = new Map([
  [Tile.GibbetCage, 3],
  [Tile.Stocks, 2],
  [Tile.CandleShrine, 5],
  [Tile.LootedChest, 4],
  [Tile.ColdCamp, 4],
  [Tile.MineCart, 4],
  [Tile.AncientStatue, 3],
  [Tile.GrandPillar, 4],
  [Tile.Sarcophagus, 7],
  [Tile.IronGrate, 4],
  [Tile.ChainedSkeleton, 5],
  [Tile.BrokenPillar, 5],
  // THE SCARRED LAND: one burning per dungeon reads as a story; three
  // read as a theme the halls never earned. One fallen standard is
  // the fight; a hall floored with them is a flag shop.
  [Tile.CollapsedRoof, 2],
  [Tile.EmberBed, 2],
  [Tile.FallenBanner, 2],
  [Tile.FieldCairn, 2],
]);

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
  // THE SCARRED LAND (K1 THE COLD HEARTH)
  Tile.CollapsedRoof,
  Tile.EmberBed,
  Tile.AshHeap,
  Tile.CharredBeam,
  // THE SCARRED LAND (K3 THE FIELD AFTER)
  Tile.FallenBanner,
  Tile.FieldLitter,
  Tile.ArrowPost,
  Tile.FieldCairn,
]);

const FLOORISH: ReadonlySet<Tile> = new Set([Tile.CaveFloor, Tile.DungeonFloor, Tile.CaveRubble]);

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/**
 * DRY FEET: a bedroll, a wax shrine, or a chest of dry goods never
 * stands at the water's lip — the pool carve leaves shoal cells
 * inside its own spread, and a camp on a shoal reads as a mistake,
 * not a story.
 */
const DRY_FEET: ReadonlySet<Tile> = new Set([
  Tile.ColdCamp,
  Tile.CandleShrine,
  Tile.LootedChest,
  // THE SCARRED LAND: a fire that still keeps embers, and the ash it
  // left, never stand at the water's lip — wet ash is mud.
  Tile.EmberBed,
  Tile.AshHeap,
]);

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
  const canProp = (x: number, y: number, mask: Uint8Array = openMask, t?: Tile): boolean => {
    if (!mask[y * S + x]) return false;
    if (!FLOORISH.has(c.get(x, y))) return false;
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (t !== undefined && DRY_FEET.has(t) && c.get(x + dx, y + dy) === Tile.WaterShallow) {
        return false;
      }
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
    if (!canProp(x, y, mask, t)) return false;
    removables.push({ x, y, was: c.get(x, y) });
    c.set(x, y, t);
    return true;
  };

  // ---- THE CURATED HAND: caps, the vignette placer, the stories ------
  const capCount = new Map<Tile, number>();
  const capped = (t: Tile): boolean => {
    const cap = PROP_CAPS.get(t);
    return cap !== undefined && (capCount.get(t) ?? 0) >= cap;
  };
  /** putProp with the rarity ledger — the choke point for capped tiles. */
  const putCapped = (x: number, y: number, t: Tile, mask?: Uint8Array): boolean => {
    if (capped(t)) return false;
    if (!putProp(x, y, t, mask)) return false;
    if (PROP_CAPS.has(t)) capCount.set(t, (capCount.get(t) ?? 0) + 1);
    return true;
  };
  /**
   * The vignette's own placement law: a satellite may stand beside
   * its OWN scene (the 3×3 crowding guard yields to this vignette's
   * members) but must never squeeze a walkway — a solid piece is
   * refused if any neighboring floor cell would end up closed
   * solid-to-solid on an axis (the mortar pass's own pinch
   * definition), and a solid never kisses a cracked wall (NEVER
   * BLOCKADE A SECRET). The repair sweep stays the last guarantee.
   */
  const placePiece = (x: number, y: number, t: Tile, own: Set<number>): boolean => {
    if (x < 3 || y < 3 || x >= S - 3 || y >= S - 3) return false;
    if (!openMask[y * S + x]) return false;
    if (!FLOORISH.has(c.get(x, y))) return false;
    if (capped(t)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (own.has((y + dy) * S + (x + dx))) continue;
        if (PLACED_PROP_TILES.has(c.get(x + dx, y + dy))) return false;
      }
    }
    if (DRY_FEET.has(t)) {
      for (const [dx, dy] of ORTHO) {
        if (c.get(x + dx, y + dy) === Tile.WaterShallow) return false;
      }
    }
    if (isSolidTile(t)) {
      let open = 0;
      for (const [dx, dy] of ORTHO) {
        if (c.get(x + dx, y + dy) === Tile.CrackedCaveWall) return false;
        if (c.passable(x + dx, y + dy)) open++;
      }
      if (open < 2) return false;
      const solidAt = (px: number, py: number): boolean =>
        (px === x && py === y) || !c.passable(px, py);
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx;
        const ny = y + dy;
        if (!c.passable(nx, ny)) continue;
        if (solidAt(nx - 1, ny) && solidAt(nx + 1, ny)) return false;
        if (solidAt(nx, ny - 1) && solidAt(nx, ny + 1)) return false;
      }
    }
    removables.push({ x, y, was: c.get(x, y) });
    c.set(x, y, t);
    if (PROP_CAPS.has(t)) capCount.set(t, (capCount.get(t) ?? 0) + 1);
    own.add(y * S + x);
    return true;
  };
  /** Stamp one vignette into a room; true if the anchor stood. */
  const placeVignette = (a: Room, vig: Vignette): boolean => {
    const own = new Set<number>();
    let ax = -1;
    let ay = -1;
    if (vig.northAnchor) {
      const band = northWallCells(a);
      while (band.length > 0 && ax < 0) {
        const spot = band.splice(rDress.int(0, band.length - 1), 1)[0]!;
        if (placePiece(spot.x, spot.y, vig.anchor, own)) {
          ax = spot.x;
          ay = spot.y;
        }
      }
    } else {
      for (let attempt = 0; attempt < 14 && ax < 0; attempt++) {
        const x = a.x + rDress.int(-a.r, a.r);
        const y = a.y + rDress.int(-a.r, a.r);
        if (placePiece(x, y, vig.anchor, own)) {
          ax = x;
          ay = y;
        }
      }
    }
    if (ax < 0) return false;
    const band = vig.pieces.some((p) => p.role === 'north') ? northWallCells(a) : [];
    for (const piece of vig.pieces) {
      let done = false;
      if (piece.role === 'beside') {
        const start = rDress.int(0, 3);
        for (let k = 0; k < 4 && !done; k++) {
          const [dx, dy] = ORTHO[(start + k) % 4]!;
          done = placePiece(ax + dx, ay + dy, piece.tile, own);
        }
      } else if (piece.role === 'north') {
        // Band-mates hang a step or three along the same wall.
        const near = band.filter((p) => {
          const d = Math.max(Math.abs(p.x - ax), Math.abs(p.y - ay));
          return d >= 1 && d <= 4;
        });
        while (near.length > 0 && !done) {
          const spot = near.splice(rDress.int(0, near.length - 1), 1)[0]!;
          done = placePiece(spot.x, spot.y, piece.tile, own);
        }
      } else {
        for (let attempt = 0; attempt < 12 && !done; attempt++) {
          const x = ax + rDress.int(-3, 3);
          const y = ay + rDress.int(-3, 3);
          if (Math.max(Math.abs(x - ax), Math.abs(y - ay)) < 1) continue;
          done = placePiece(x, y, piece.tile, own);
        }
      }
      // Optional pieces fail silently — a scene degrades, never scatters.
    }
    return true;
  };

  // A story never repeats next door: the adjacency, built once.
  const roomAdj: Array<Set<number>> = b.rooms.map(() => new Set());
  for (const e of b.edges) {
    roomAdj[e.a]!.add(e.b);
    roomAdj[e.b]!.add(e.a);
  }
  const roomStory = new Map<number, string[]>();
  const table = STORY_TABLES[b.spec.theme];
  const ambient = AMBIENT_KITS[b.spec.theme];
  for (const [ri, a] of b.rooms.entries()) {
    if (a.kind === 'entry') continue; // the landing stays clear
    // THE COURT IS DRESSED BY ITS AUTHOR — and so is every prefab
    // set-piece now (vault, forge, camp, spring, ossuary, den): their
    // stamps carry their own furniture; scatter stays out.
    const area = Math.PI * a.r * a.r;
    if (a.kind === 'room') {
      // The light every dungeon owes: brazier shoulders in worked rooms…
      if (a.style === 'hall') {
        const spots = northWallCells(a).filter((p) => c.get(p.x, p.y) === Tile.DungeonFloor);
        for (let placedB = 0; placedB < 2 && spots.length > 0; placedB++) {
          const spot = spots.splice(rDress.int(0, spots.length - 1), 1)[0]!;
          putProp(spot.x, spot.y, Tile.Brazier);
        }
      }
      // …then THE ROOM DRAWS A STORY: one scene (two in the biggest
      // rooms), weighted by where the room stands on the road and how
      // the traffic runs through it, told as a placed cluster.
      const taken = new Set<string>();
      for (const n of roomAdj[ri]!) {
        for (const sid of roomStory.get(n) ?? []) taken.add(sid);
      }
      const mine: string[] = [];
      const failed = new Set<string>();
      const storyCount = 1 + (a.r >= 10 && rDress.chance(0.55) ? 1 : 0);
      for (let sc = 0; sc < storyCount; sc++) {
        for (let tries = 0; tries < 3; tries++) {
          const cands = table.filter(
            (v) =>
              !taken.has(v.id) &&
              !mine.includes(v.id) &&
              !failed.has(v.id) &&
              (!v.styles || v.styles.includes(a.style)) &&
              !capped(v.anchor),
          );
          if (cands.length === 0) break;
          let total = 0;
          const weights = cands.map((v) => {
            let w = v.weight;
            if (v.half) {
              const frac = a.depth / maxDepth;
              const inHalf = v.half === 'entry' ? frac <= 0.45 : frac >= 0.55;
              const opposed = v.half === 'entry' ? frac >= 0.55 : frac <= 0.45;
              w *= inHalf ? 3 : opposed ? 0.4 : 1;
            }
            if (v.degree1 && a.degree === 1) w *= 2.5;
            total += w;
            return w;
          });
          let roll = rDress.range(0, total);
          let pick = cands[cands.length - 1]!;
          for (let ci = 0; ci < cands.length; ci++) {
            roll -= weights[ci]!;
            if (roll <= 0) {
              pick = cands[ci]!;
              break;
            }
          }
          if (placeVignette(a, pick)) {
            mine.push(pick.id);
            break;
          }
          failed.add(pick.id);
        }
      }
      if (mine.length > 0) roomStory.set(ri, mine);
      // …then the theme's thin ambient coat — texture under the story.
      for (const entryDef of ambient) {
        if (entryDef.styles && !entryDef.styles.includes(a.style)) continue;
        const pieces = Math.round(area / entryDef.per);
        if (entryDef.north) {
          // THE FIXTURE FINDS ITS WALL: wall pieces deal from the
          // scanned band itself — random darts almost never land on
          // the one-cell lane under the north wall.
          const cells = northWallCells(a);
          for (let i = 0; i < pieces && cells.length > 0; i++) {
            const spot = cells.splice(rDress.int(0, cells.length - 1), 1)[0]!;
            putCapped(spot.x, spot.y, entryDef.tile);
          }
          continue;
        }
        for (let i = 0; i < pieces; i++) {
          const x = a.x + rDress.int(-a.r, a.r);
          const y = a.y + rDress.int(-a.r, a.r);
          if (entryDef.wall) {
            let wallAdj = false;
            for (const [dx, dy] of ORTHO) {
              if (c.isRock(x + dx, y + dy)) wallAdj = true;
            }
            if (!wallAdj) continue;
          }
          putCapped(x, y, entryDef.tile);
        }
      }
    }
    // Rubble breaks up any big floor.
    for (let i = Math.round(area / 30); i > 0; i--) {
      const x = a.x + rDress.int(-a.r, a.r);
      const y = a.y + rDress.int(-a.r, a.r);
      if (c.get(x, y) === Tile.CaveFloor) c.set(x, y, Tile.CaveRubble);
    }
  }

  // ---- AFFINITY IS LAW: props follow the map's own facts -------------
  const wallCellFits = (x: number, y: number): boolean =>
    FLOORISH.has(c.get(x, y)) &&
    !!openMask[y * S + x] &&
    c.isRock(x, y - 1) &&
    c.get(x, y - 1) !== Tile.CrackedCaveWall &&
    c.passable(x, y + 1);
  if (b.spec.theme === 'mine') {
    // The working face: timber stands where the miners actually cut —
    // beside the veins they were chasing…
    let faceBraces = 0;
    for (const v of oreSpots) {
      if (faceBraces >= 6 || !rDress.chance(0.45)) continue;
      for (let attempt = 0; attempt < 8; attempt++) {
        const x = v.x + rDress.int(-2, 2);
        const y = v.y + rDress.int(-2, 2);
        if (!wallCellFits(x, y)) continue;
        if (putProp(x, y, Tile.TimberBrace)) {
          faceBraces++;
          break;
        }
      }
    }
    // …and down the drifts they dug, every ~16–24 corridor tiles.
    let driftBraces = 0;
    for (const path of b.corridorPaths) {
      let next = 10 + rDress.int(0, 8);
      for (let i = 0; i < path.length && driftBraces < 8; i++) {
        if (i < next) continue;
        const pc = path[i]!;
        let placed = false;
        for (const [dx, dy] of ORTHO) {
          if (!wallCellFits(pc.x + dx, pc.y + dy)) continue;
          if (putProp(pc.x + dx, pc.y + dy, Tile.TimberBrace)) {
            placed = true;
            driftBraces++;
            break;
          }
        }
        next = i + (placed ? 16 + rDress.int(0, 8) : 4);
      }
    }
    // The haul run: on the longest ways, a cart still stands mid-drift.
    let carts = 0;
    for (const path of b.corridorPaths) {
      if (carts >= 2 || path.length < 26 || !rDress.chance(0.4)) continue;
      const pc = path[Math.floor(path.length / 2) + rDress.int(-4, 4)];
      if (!pc) continue;
      for (const [dx, dy] of ORTHO) {
        if (putCapped(pc.x + dx, pc.y + dy, Tile.MineCart)) {
          carts++;
          break;
        }
      }
    }
  }
  if (b.spec.theme === 'crypt') {
    // Someone still walks these halls: the odd corridor shrine, lit.
    let shrines = 0;
    for (const path of b.corridorPaths) {
      if (shrines >= 2 || path.length < 20 || !rDress.chance(0.3)) continue;
      const pc = path[rDress.int(6, path.length - 7)]!;
      for (const [dx, dy] of ORTHO) {
        const x = pc.x + dx;
        const y = pc.y + dy;
        let wallAdj = false;
        for (const [wx, wy] of ORTHO) {
          if (c.isRock(x + wx, y + wy)) wallAdj = true;
        }
        if (!wallAdj) continue;
        if (putCapped(x, y, Tile.CandleShrine)) {
          shrines++;
          break;
        }
      }
    }
  }
  if (b.spec.theme === 'cavern' || b.spec.theme === 'warren' || b.spec.theme === 'heartwood') {
    // The webs mend where nobody brushes them off: the corridor walls.
    let webs = 0;
    for (const path of b.corridorPaths) {
      let next = 14 + rDress.int(0, 8);
      for (let i = 0; i < path.length && webs < 6; i++) {
        if (i < next) continue;
        const pc = path[i]!;
        let placed = false;
        if (rDress.chance(0.5)) {
          for (const [dx, dy] of ORTHO) {
            if (!wallCellFits(pc.x + dx, pc.y + dy)) continue;
            if (putProp(pc.x + dx, pc.y + dy, Tile.WallWeb)) {
              placed = true;
              webs++;
              break;
            }
          }
        }
        next = i + (placed ? 20 + rDress.int(0, 10) : 6);
      }
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

import { Tile, rarityIndex, type DungeonTheme } from '@arx/shared';
import type { ZoneSpawn } from '@arx/content';
import type { DungeonBuild } from './types.js';

/**
 * GARRISON — who holds the halls, and how they live in them.
 *
 * THE MANY FACES: rosters are POWER-BANDED — pack entries may carry
 * `minPower`/`maxPower`, so a high reissue of a crypt fields kingsmen
 * where a low one fields plain bones. THE LIVED-IN DARK: war-theme
 * camps seat POSTED bodies at their own furniture (the cook at the
 * spit, the keeper by the cage — unwindowed, the underground keeps no
 * hours), and corridor sentries PATROL their recorded ways instead of
 * standing in them. The champion's court seats a true crown wherever
 * one exists, honor guard flanking the dais.
 */

interface PackEntry {
  npc: string;
  w: number;
  minPower?: number;
  maxPower?: number;
}

interface ThemeRoster {
  packs: PackEntry[];
  elite: string;
  /** The court's seat — seed-picked when a theme holds more than one. */
  bosses: Array<{ npc: string; name: string }>;
  /** Hidden-room guardian display name. */
  warden: string;
}

const ROSTERS: Record<DungeonTheme, ThemeRoster> = {
  cavern: {
    packs: [
      { npc: 'cave_bat', w: 3 },
      { npc: 'giant_spider', w: 2 },
      { npc: 'slime', w: 2 },
      { npc: 'adder', w: 2 },
      { npc: 'mudcrab', w: 1, maxPower: 25 },
      // THE HILL COMES DOWN: deep caverns are giant country — an ogre
      // moved in where the ceiling finally fit it.
      { npc: 'ogre', w: 1, minPower: 35 },
    ],
    elite: 'giant_spider',
    bosses: [{ npc: 'giant_spider', name: 'The Broodmother' }],
    warden: 'Deep Lurker',
  },
  crypt: {
    packs: [
      { npc: 'skeleton', w: 3 },
      { npc: 'skeleton_archer', w: 2 },
      { npc: 'skeleton_guard', w: 2, minPower: 12 },
      // The crypt's voice: the raising wakes at 30 (minLevel on
      // raise_the_fallen) — the chanter joins once it can sing.
      { npc: 'skeleton_chanter', w: 1, minPower: 24 },
      { npc: 'cave_bat', w: 1, maxPower: 20 },
      // The king's own, where the reissue runs deep enough to matter.
      { npc: 'skeleton_kingsman', w: 2, minPower: 45 },
      { npc: 'skeleton_crownsguard', w: 1, minPower: 45 },
    ],
    elite: 'skeleton_guard',
    // THE DREAD CROWN: two true crowns share the crypt's deep seat —
    // the seed picks which king wakes. (spawn.name = the named-boss
    // purse predicate, authored here as ever.)
    bosses: [
      { npc: 'skeleton_fallen_king', name: 'The Fallen King' },
      { npc: 'skeleton_barrow_lord', name: 'The Barrow Lord' },
    ],
    warden: 'Reliquary Warden',
  },
  mine: {
    packs: [
      { npc: 'goblin', w: 3 },
      { npc: 'goblin_thrower', w: 2 },
      { npc: 'giant_beetle', w: 2 },
      { npc: 'kobold', w: 2, maxPower: 30 },
      { npc: 'goblin_firecaller', w: 1, minPower: 14 },
      { npc: 'rat', w: 1, maxPower: 15 },
      { npc: 'cave_bat', w: 1 },
      { npc: 'rock_golem', w: 1, minPower: 30 },
    ],
    elite: 'giant_beetle',
    // THE DREAD CROWN: the mine's own keeper, phased iron.
    bosses: [{ npc: 'anvil_golem', name: 'The Anvilheart' }],
    warden: 'Claim Keeper',
  },
  stronghold: {
    packs: [
      { npc: 'goblin', w: 3 },
      { npc: 'goblin_thrower', w: 2 },
      { npc: 'wolf', w: 2, maxPower: 25 },
      { npc: 'goblin_gloomcaller', w: 1, minPower: 14 },
      { npc: 'troll', w: 1, minPower: 14 },
      { npc: 'goblin_champion', w: 1, minPower: 35 },
    ],
    elite: 'troll',
    // THE DREAD CROWN: the hold's deep seat wears the tyrant's fire —
    // cinder_ring rallies the court, exactly the war-camp's law.
    bosses: [{ npc: 'goblin_flame_tyrant', name: 'The Flame Tyrant' }],
    warden: 'Vault Sentinel',
  },
  warren: {
    packs: [
      { npc: 'gnoll', w: 3 },
      { npc: 'worg', w: 2 },
      { npc: 'cave_bat', w: 1, maxPower: 20 },
      { npc: 'dire_wolf', w: 1, minPower: 28 },
      { npc: 'gnoll_champion', w: 1, minPower: 35 },
    ],
    elite: 'gnoll_champion',
    // THE DREAD CROWN: the den's heart.
    bosses: [{ npc: 'gnoll_matriarch', name: 'The Den Matriarch' }],
    warden: 'Den Mother',
  },
};

/** Furniture that seats a post, and the work it holds. */
const POST_SIGNS: Array<{ tiles: Tile[]; kind: 'cook' | 'keeper' | 'drill' }> = [
  { tiles: [Tile.CookPot, Tile.MeatSpit, Tile.Bonfire, Tile.Campfire], kind: 'cook' },
  { tiles: [Tile.PrisonCage, Tile.BeastNest], kind: 'keeper' },
  { tiles: [Tile.TargetDummy, Tile.SpearRack], kind: 'drill' },
];

export function garrisonAll(b: DungeonBuild): void {
  const { c, rMobs, origin } = b;
  const roster = ROSTERS[b.spec.theme];
  const spawns: ZoneSpawn[] = [];
  b.spawns = spawns;
  const lvl = (bump = 0) => Math.max(1, Math.min(99, b.spec.power + bump));

  const banded = roster.packs.filter(
    (p) =>
      (p.minPower === undefined || b.spec.power >= p.minPower) &&
      (p.maxPower === undefined || b.spec.power <= p.maxPower),
  );
  const pool = banded.length > 0 ? banded : roster.packs;
  const pickPack = (): string => {
    let total = 0;
    for (const p of pool) total += p.w;
    let draw = rMobs.next() * total;
    for (const p of pool) {
      draw -= p.w;
      if (draw < 0) return p.npc;
    }
    return pool[0]!.npc;
  };

  // ---- room packs ----------------------------------------------------
  for (const a of b.rooms) {
    // The entry is safe ground, the court has its own garrison, and
    // the sealed vault/forge stay quiet — the reward IS the calm.
    if (a.kind === 'entry' || a.kind === 'boss' || a.kind === 'vault' || a.kind === 'forge') {
      continue;
    }
    const area = Math.PI * a.r * a.r;
    const packs = Math.max(1, Math.min(5, Math.round(area / 90)));
    for (let p = 0; p < packs; p++) {
      spawns.push({
        npc: pickPack(),
        x: origin.x + a.x + rMobs.int(-2, 2),
        y: origin.y + a.y + rMobs.int(-2, 2),
        radius: Math.max(2, a.r - 2),
        count: rMobs.int(1, 2) + (rarityIndex(b.spec.tier) >= 3 ? 1 : 0),
        level: lvl(rMobs.int(-2, 2)),
      });
    }
  }

  // ---- camp life: posted bodies at their own furniture ---------------
  // War-theme camps and dens only — a skeleton stirring a cook pot is
  // nobody's fiction. Unwindowed: the underground keeps no hours.
  if (b.spec.theme === 'stronghold' || b.spec.theme === 'warren') {
    for (const a of b.rooms) {
      if (a.kind !== 'camp' && a.kind !== 'den') continue;
      let seated = 0;
      const reach = 7;
      for (const sign of POST_SIGNS) {
        if (seated >= 2) break;
        for (let dy = -reach; dy <= reach && seated < 2; dy++) {
          for (let dx = -reach; dx <= reach && seated < 2; dx++) {
            const fx = a.x + dx;
            const fy = a.y + dy;
            if (!sign.tiles.includes(c.get(fx, fy))) continue;
            // Stand the keeper beside the work, facing it — south
            // side first so the body reads in front of its furniture.
            for (const [sx, sy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
              const px = fx + sx;
              const py = fy + sy;
              if (!c.passable(px, py) || !b.openMask[py * b.spec.size + px]) continue;
              spawns.push({
                npc: pickPack(),
                x: origin.x + px,
                y: origin.y + py,
                radius: 1.2,
                count: 1,
                level: lvl(0),
                post: {
                  kind: sign.kind,
                  x: origin.x + px,
                  y: origin.y + py,
                  dir: Math.atan2(fy - py, fx - px),
                },
              });
              seated++;
              break;
            }
          }
        }
      }
    }
  }

  // ---- corridor sentries: the halls are walked, not stood ------------
  for (const [ei, e] of b.edges.entries()) {
    if (!rMobs.chance(0.4)) continue;
    const a = b.rooms[e.a]!;
    const d = b.rooms[e.b]!;
    const path = b.corridorPaths[ei];
    const mx = (a.x + d.x) >> 1;
    const my = (a.y + d.y) >> 1;
    // A recorded way long enough to walk becomes a patrol round:
    // every 4th center, a handful of stops about the waist.
    let patrol: Array<{ x: number; y: number }> | undefined;
    if (path && path.length >= 16) {
      const stops: Array<{ x: number; y: number }> = [];
      const mid = path.length >> 1;
      for (let k = -3; k <= 3; k++) {
        const p = path[mid + k * 4];
        if (!p) continue;
        // THE HOP LAW: a stop that leaps from the last (a discontinuous
        // recorded path) ends the round there — better a short honest
        // walk than a teleporting sentry.
        const prev = stops[stops.length - 1];
        if (prev && Math.hypot(prev.x - (origin.x + p.x + 0.5), prev.y - (origin.y + p.y + 0.5)) > 10) {
          break;
        }
        stops.push({ x: origin.x + p.x + 0.5, y: origin.y + p.y + 0.5 });
      }
      if (stops.length >= 3) patrol = stops;
    }
    spawns.push({
      npc: pickPack(),
      x: origin.x + mx,
      y: origin.y + my,
      radius: 3,
      count: 1,
      level: lvl(rMobs.int(-2, 0)),
      patrol,
    });
  }

  // ---- the champion's court ------------------------------------------
  const court = b.rooms[b.bossIdx]!;
  const seat = roster.bosses[rMobs.int(0, roster.bosses.length - 1)]!;
  b.bossSpawnIndex = spawns.length;
  spawns.push({
    npc: seat.npc,
    name: seat.name,
    x: origin.x + court.x,
    y: origin.y + court.y,
    radius: 1,
    count: 1,
    level: lvl(5),
  });
  // The honor guard flanks the dais; a watchful pair holds the mouth.
  spawns.push({
    npc: roster.elite,
    x: origin.x + court.x,
    y: origin.y + court.y + 2,
    radius: 3,
    count: 2,
    level: lvl(1),
  });
  spawns.push({
    npc: pickPack(),
    x: origin.x + court.x,
    y: origin.y + court.y + 5,
    radius: 2,
    count: 2,
    level: lvl(0),
  });

  // ---- hidden wardens guard the cracked-wall prizes ------------------
  for (const h of b.hiddenRooms) {
    spawns.push({
      npc: roster.elite,
      name: roster.warden,
      x: origin.x + h.x,
      y: origin.y + h.y + 1,
      radius: 2,
      count: 1,
      level: lvl(3),
    });
  }
}

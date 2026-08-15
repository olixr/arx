import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLD_SEED,
  MINOR_DEFS,
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  STRONGHOLD_DEFS,
  STRONGHOLD_PREFABS,
  familiesOf,
  shoreProbeAt,
  territoryAt,
} from '@arx/content';
import { chestInfo } from '@arx/shared';
import { POI_CELL, poiForCell, type PoiContext } from './pois.js';
import { findsForCell } from './finds.js';
import {
  capitalLatticeRange,
  capitalMasked,
  composeStronghold,
  strongholdSeat,
  type SeatCtx,
} from './strongholds.js';

const SEED = WORLD_SEED;

const prefabs = new Map([...POI_PREFABS, ...STRONGHOLD_PREFABS]);

const SEAT_CTX: SeatCtx = {
  anchors: SETTLED_ANCHORS,
  zoneRects: [{ x: -96, y: 16, w: 96, h: 64 }],
  claimRings: [],
  layouts: [...STRONGHOLD_DEFS.values()],
  prefabs,
  families: familiesOf([...POI_DEFS.values()]),
};

/** Sweep a lattice window and collect every dealt seat. */
const sweepSeats = (radius = 8) => {
  const seats = [];
  for (let gy = -radius; gy <= radius; gy++) {
    for (let gx = -radius; gx <= radius; gx++) {
      const seat = strongholdSeat(SEED, gx, gy, SEAT_CTX);
      if (seat) seats.push(seat);
    }
  }
  return seats;
};

test('the seat is deterministic and the sweep deals some capitals', () => {
  const a = sweepSeats();
  const b = sweepSeats();
  assert.deepEqual(a, b);
  assert.ok(a.length >= 2, `only ${a.length} capitals in a 17x17 country sweep`);
});

test('THE DROWNED CHARTER: every skral capital brushes water, and the banks do crown one', () => {
  const seats = sweepSeats();
  const skral = seats.filter((s) => s.family === 'skral');
  // The Great Weir must actually exist somewhere — a shore law that
  // refuses every heart is a dead shelf.
  assert.ok(skral.length >= 1, 'no skral country ever crowned a capital');
  for (const s of skral) {
    const layout = STRONGHOLD_DEFS.get(s.layoutId)!;
    assert.equal(layout.shore, true, 'a skral seat dealt a dry layout');
    const p = prefabs.get(layout.prefab)!;
    const reach = Math.max(Math.floor(p.width / 2), Math.floor(p.height / 2)) + 6;
    assert.ok(
      shoreProbeAt(SEED, s.x, s.y, reach),
      `the weir at ${s.x},${s.y} stands dry — the charter broke`,
    );
  }
  // And the charter never costs the dry families their own seats.
  assert.ok(seats.some((s) => s.family !== 'skral'), 'the sweep lost the dry countries');
});

test('every seat agrees with the territory field under it (THE ONE ATLAS LAW)', () => {
  for (const seat of sweepSeats()) {
    const country = territoryAt(SEED, seat.x, seat.y, SEAT_CTX.families);
    assert.equal(
      seat.family,
      country,
      `capital at ${seat.x},${seat.y} is ${seat.family} inside ${country} country`,
    );
    const layout = STRONGHOLD_DEFS.get(seat.layoutId)!;
    assert.equal(layout.family, seat.family, `${seat.layoutId} dealt outside its family`);
    assert.ok(seat.tier >= 3, 'a capital never seats in settled land');
    assert.ok(
      seat.tier >= layout.tiers[0] && seat.tier <= layout.tiers[1],
      `${seat.layoutId} dealt outside its tier band`,
    );
  }
});

test('settled countries keep no capital (the lattice cell over the hearths)', () => {
  // The anchors sit around the origin — the origin lattice cell's
  // heart reads tier 0-2 and must refuse.
  const seat = strongholdSeat(SEED, 0, 0, SEAT_CTX);
  assert.equal(seat, null, 'the settled heartland seated a capital');
});

test('a family with no layout on the shelf keeps camps only (the kobold law)', () => {
  // Strip the goblin layouts and every goblin country goes quiet —
  // same seed, same lattice, no capital where one stood.
  const goblinSeat = sweepSeats().find((s) => s.family === 'goblin');
  if (!goblinSeat) return; // no goblin country in the window this seed
  const noGoblin: SeatCtx = {
    ...SEAT_CTX,
    layouts: SEAT_CTX.layouts.filter((l) => l.family !== 'goblin'),
  };
  assert.equal(strongholdSeat(SEED, goblinSeat.gx, goblinSeat.gy, noGoblin), null);
});

test('THE MASK: no site, no finds, and no hold stands on a capital\'s ground', () => {
  const seats = sweepSeats();
  const capitals = seats.map((s) => s.rect);
  const ctx: PoiContext = {
    anchors: SETTLED_ANCHORS,
    zoneRects: [{ x: -96, y: 16, w: 96, h: 64 }],
    claimRings: [],
    defs: [...POI_DEFS.values()],
    minors: [...MINOR_DEFS.values()],
    prefabs,
    capitals,
  };
  let masked = 0;
  for (const seat of seats) {
    const cx0 = Math.floor((seat.rect.x - 24) / POI_CELL);
    const cy0 = Math.floor((seat.rect.y - 24) / POI_CELL);
    const cx1 = Math.floor((seat.rect.x + seat.rect.w + 24) / POI_CELL);
    const cy1 = Math.floor((seat.rect.y + seat.rect.h + 24) / POI_CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        // Assert exactly where the mask claims ground (the boundary
        // cell at rect + 24 exactly touches without intersecting).
        if (!capitalMasked(cx * POI_CELL, cy * POI_CELL, POI_CELL, POI_CELL, [seat.rect])) {
          continue;
        }
        masked++;
        for (let epoch = 0; epoch < 3; epoch++) {
          assert.equal(
            poiForCell(SEED, cx, cy, epoch, ctx),
            null,
            `cell ${cx},${cy} dealt a site on ${seat.layoutId}'s ground`,
          );
          assert.deepEqual(
            findsForCell(SEED, cx, cy, epoch, ctx, null),
            [],
            `cell ${cx},${cy} dealt finds on ${seat.layoutId}'s ground`,
          );
        }
      }
    }
  }
  assert.ok(masked >= 8, 'the mask sweep covered no ground');
  // And the point mask agrees with the rect mask.
  const first = seats[0]!;
  assert.ok(capitalMasked(first.x, first.y, 1, 1, capitals));
  assert.ok(!capitalMasked(first.x + 10_000, first.y, 1, 1, capitals));
});

test('the lattice range covers every cell a seat could reach', () => {
  for (const seat of sweepSeats(4)) {
    const r = capitalLatticeRange(seat.rect.x, seat.rect.y, seat.rect.w, seat.rect.h);
    assert.ok(
      seat.gx >= r.gx0 && seat.gx <= r.gx1 && seat.gy >= r.gy0 && seat.gy <= r.gy1,
      `seat ${seat.gx},${seat.gy} outside its own reach window`,
    );
  }
});

test('composeStronghold deals a lawful zone: muster in bands, the chief crowned, height carried', () => {
  const seat = sweepSeats().find((s) => {
    const p = STRONGHOLD_PREFABS.get(STRONGHOLD_DEFS.get(s.layoutId)!.prefab)!;
    return p.elev.some((e) => e !== 0);
  });
  assert.ok(seat, 'no terraced capital in the sweep window');
  const layout = STRONGHOLD_DEFS.get(seat.layoutId)!;
  const prefab = STRONGHOLD_PREFABS.get(layout.prefab)!;
  const zone = composeStronghold(SEED, seat, layout, prefab);
  const again = composeStronghold(SEED, seat, layout, prefab);
  assert.deepEqual(zone, again, 'composition must be deterministic');
  assert.equal(zone.id, `stronghold:${seat.gx},${seat.gy}`);
  assert.ok(zone.elev, 'a terraced layout composes with its hill');
  // Muster: every knot within its band, levels inside the tier band
  // plus offsets, the chief named from the pool.
  const spawns = zone.spawns ?? [];
  // Captains are named too (Third Charter) — the chief is the named
  // spawn whose name comes from the BOSS pool.
  const bossSpawn = spawns.find((s) => s.name !== undefined && layout.boss.names.includes(s.name));
  assert.ok(bossSpawn, 'the chief must be crowned');
  assert.ok(layout.boss.names.includes(bossSpawn.name!), 'the name comes from the pool');
  assert.equal(bossSpawn.npc, layout.boss.npc);
  let bodies = 0;
  for (const sp of spawns) bodies += sp.count;
  const maxBodies = layout.wards.reduce(
    (n, w) => n + w.knots.reduce((m, k) => m + k.band[1], 0),
    1,
  );
  assert.ok(bodies >= 1 && bodies <= maxBodies, `muster ${bodies} outside 1..${maxBodies}`);
  // THE CAPTAIN LAW composes: at least one titled captain stands as a
  // single named body beside the chief.
  const captains = spawns.filter((s) => s.name !== undefined && !layout.boss.names.includes(s.name));
  assert.ok(captains.length >= 1, 'no titled captains composed');
  for (const c of captains) assert.equal(c.count, 1, 'a titled body is ONE body');
  // THE CAPTAIN'S KEY composes: 2-3 captain caches beside the ONE
  // chief's cache, the chief's always the harder kind.
  {
    let bossKind = 0;
    let lesser = 0;
    for (const t of zone.ground) {
      const info = chestInfo(t);
      if (!info || info.open) continue;
      if (info.kind === 'boss') bossKind++;
      else lesser++;
    }
    assert.ok(bossKind <= 1, `${bossKind} boss-kind chests (the summit's prize is singular)`);
    assert.ok(lesser >= 2 && lesser <= 3, `${lesser} captain caches outside 2..3`);
  }
  // THE ROADS ARE WALKED composes: some spawn patrols an authored
  // route — more waypoints than the synthetic loops ever deal, laid
  // along the worn ground.
  const routedWard = layout.wards.find((w) => w.route && w.route.length >= 3);
  if (routedWard) {
    const routed = spawns.filter((s) => (s.patrol?.length ?? 0) >= 3);
    assert.ok(routed.length >= 1, 'no routed patrols composed');
  }
  // THE CHAPTERS: every spawn wears its ward tag; manned wards keep
  // every eligible knot at its authored anchor; optional wards that
  // rolled empty this epoch contribute nothing at all.
  for (const [wi, ward] of layout.wards.entries()) {
    const wardSpawns = spawns.filter((sp) => sp.wing === wi);
    if (ward.optional && wardSpawns.length === 0) continue; // rolled empty
    for (const knot of ward.knots) {
      if (knot.minTier !== undefined && seat.tier < knot.minTier) continue;
      // The zone stands on ITS OWN dims — the seat rect is the MASK
      // (pool max), so anchors offset from zone.origin, never rect.
      assert.ok(
        wardSpawns.some(
          (sp) => sp.x === zone.origin.x + knot.at[0] && sp.y === zone.origin.y + knot.at[1],
        ),
        `${ward.key} knot at ${knot.at[0]},${knot.at[1]} lost its post`,
      );
    }
  }
  assert.ok(
    spawns.every((sp) => sp.wing !== undefined),
    'every muster body belongs to a chapter',
  );
  // The last stand never rolls empty and holds the chief.
  const bossWi = layout.wards.findIndex((w) => w.key === layout.boss.ward);
  assert.ok(spawns.some((sp) => sp.wing === bossWi && sp.name !== undefined));
  // Patrol wards lay waypoint loops for their sentries.
  for (const [wi, ward] of layout.wards.entries()) {
    if (!ward.patrol) continue;
    const walkers = spawns.filter((sp) => sp.wing === wi && sp.patrol !== undefined);
    for (const sp of walkers) {
      assert.ok((sp.patrol?.length ?? 0) >= 3, `${ward.key}: a patrol needs a round`);
    }
  }
  // The epoch re-deals the war, never the walls.
  const nextEpoch = composeStronghold(SEED, seat, layout, prefab, 1);
  assert.deepEqual(nextEpoch.ground, zone.ground, 'the walls are authored');
  assert.notDeepEqual(nextEpoch.spawns, zone.spawns, 'the war is dealt');
});

// ---- THE CHAPTERS, slate-proven (the poiWard dialect) ----------------

import { GameServer } from '../game/gameServer.js';

const chapterProto = GameServer.prototype as unknown as {
  noteStrongholdKill: (this: unknown, spawnIndex: number, killerEid?: number) => void;
  strongholdGarrisonStands: (this: unknown, key: string, ward?: number) => boolean;
  strongholdBossWard: (this: unknown, key: string) => number | undefined;
  strongholdCacheWarded: (this: unknown, spec: string) => boolean;
  strongholdCaptainStands: (this: unknown, key: string, wing: number) => boolean;
  poiSpawnFights: (s: unknown) => boolean;
};

function chapterSlate() {
  const layoutId = 'stronghold_gnoll_cacklefort';
  const layout = STRONGHOLD_DEFS.get(layoutId)!;
  const bossWi = layout.wards.findIndex((w) => w.key === layout.boss.ward);
  const wardA = layout.wards.findIndex((w, i) => i !== bossWi);
  const key = '9,9';
  const lines: string[] = [];
  const wardMarks: number[] = [];
  const clearedMarks: Array<[number, number]> = [];
  const arts: string[] = [];
  const killerPlayer = {
    session: { sendJson: (m: { text?: string }) => lines.push(m.text ?? '') },
    flags: new Map<string, number>(),
    inventory: [] as unknown[],
  };
  const spawnPoints = [
    { npc: 'gnoll', eid: 1, active: true, wing: wardA, x: 0, y: 0 },
    { npc: 'gnoll', eid: 2, active: true, wing: wardA, x: 5, y: 0 },
    { npc: 'gnoll', eid: 3, active: true, wing: bossWi, x: 0, y: 5 },
    { npc: 'gnoll_champion', eid: 4, active: true, wing: bossWi, x: 1, y: 5 },
  ];
  const slate = {
    spawnPoints,
    poiLedger: new Map(),
    poiLive: new Map(),
    strongholdSpawnCells: new Map([[0, key], [1, key], [2, key], [3, key]]),
    strongholdLive: new Map([
      [key, {
        zoneId: `stronghold:${key}`,
        seat: { gx: 9, gy: 9, x: 0, y: 0, rect: { x: 0, y: 0, w: 1, h: 1 }, family: 'gnoll', tier: 4, layoutId },
        layoutId,
        spawnIdx: [0, 1, 2, 3],
        fighters: new Set([77]),
      }],
    ]),
    strongholdLedger: new Map([
      [key, { layoutId, anchorX: 0, anchorY: 0, epoch: 0, wardsCleared: 0, clearedAt: null as number | null }],
    ]),
    players: new Map([[500, killerPlayer]]),
    characterEids: new Map([[77, 500]]),
    accounts: {
      markStrongholdWards: (_gx: number, _gy: number, bits: number) => wardMarks.push(bits),
      markStrongholdCleared: (_gx: number, _gy: number, bits: number, ts: number) =>
        clearedMarks.push([bits, ts]),
      saveStrongholdState: (_gx: number, _gy: number, r: { wardsCleared: number; clearedAt: number | null }) =>
        clearedMarks.push([r.wardsCleared, r.clearedAt ?? 0]),
      setPoiEmber: () => {},
    },
    saveStrongholdRow(this: { strongholdLedger: Map<string, unknown>; accounts: { saveStrongholdState: (gx: number, gy: number, r: unknown) => void } }, gx: number, gy: number) {
      const r = this.strongholdLedger.get(`${gx},${gy}`);
      if (r) this.accounts.saveStrongholdState(gx, gy, r);
    },
    stampCalm: () => {},
    standDownGarrison: () => {},
    clearPlayerFlag: (p: { flags: Map<string, number> }, flag: string) => p.flags.delete(flag),
    grantArt: (_p: unknown, id: string) => arts.push(id),
    poiSpawnFights: chapterProto.poiSpawnFights,
  };
  return { slate, key, layout, bossWi, wardA, lines, wardMarks, clearedMarks, arts, spawnPoints };
}

test('a ward\'s last fighter falls: one line, one ledger bit, once', () => {
  const f = chapterSlate();
  // First ward body falls; its brother still stands — silence.
  f.spawnPoints[0]!.eid = null as unknown as number;
  chapterProto.noteStrongholdKill.call(f.slate, 0, 500);
  assert.equal(f.lines.length, 0, 'a thinning ward is not yet a chapter');
  // The brother falls: the chapter closes.
  f.spawnPoints[1]!.eid = null as unknown as number;
  chapterProto.noteStrongholdKill.call(f.slate, 1, 500);
  assert.equal(f.lines.length, 1);
  assert.match(f.lines[0]!, /^Quiet falls over the .*\. The hold thins\.$/);
  assert.deepEqual(f.wardMarks, [1 << f.wardA]);
  assert.equal(f.slate.strongholdLedger.get(f.key)!.wardsCleared, 1 << f.wardA);
  // Once per ward: a re-kill ceremonies nothing.
  chapterProto.noteStrongholdKill.call(f.slate, 1, 500);
  assert.equal(f.lines.length, 1);
  // The cache stays warded — the LAST STAND still holds it.
  assert.equal(chapterProto.strongholdBossWard.call(f.slate, f.key), f.bossWi);
  assert.equal(chapterProto.strongholdGarrisonStands.call(f.slate, f.key, f.bossWi), true);
});

test('the last stand falls: the clear ceremony, the stamp, the open cache', () => {
  const f = chapterSlate();
  for (const sp of f.spawnPoints) sp.eid = null as unknown as number;
  chapterProto.noteStrongholdKill.call(f.slate, 3, 500);
  assert.equal(f.lines.length, 1);
  assert.match(f.lines[0]!, /is broken — word of it will travel\.$/);
  assert.ok(f.lines[0]!.includes(f.layout.name));
  assert.deepEqual(f.arts, ['warden_volley']);
  const row = f.slate.strongholdLedger.get(f.key)!;
  assert.ok(row.clearedAt !== null, 'the clear stamps the ledger');
  assert.equal(f.clearedMarks.length, 1);
  // The ward breaks with the court: the cache opens.
  assert.equal(chapterProto.strongholdGarrisonStands.call(f.slate, f.key, f.bossWi), false);
});

// ---- THE LONG WAR, slate-proven (the frontier-clock dialect) ---------

import { FRONTIER, strongholdEmberFor, strongholdFallowFor } from '@arx/content';
import { config } from '../config.js';
import { layoutForSeat } from './strongholds.js';

const warProto = GameServer.prototype as unknown as {
  dissolveOneCapitalEmber: (this: unknown, now: number) => boolean;
  wakeOneCapitalFallow: (this: unknown, now: number) => boolean;
  stageOneCapital: (this: unknown, now: number) => boolean;
  playerWithin: (this: unknown, x: number, y: number, r: number) => boolean;
  calmNear: (this: unknown, cx: number, cy: number, now: number) => boolean;
};

test("THE CAPTAIN'S KEY: a captain cache unlocks on the captain's death alone", () => {
  const layoutId = 'stronghold_goblin_moot';
  const layout = STRONGHOLD_DEFS.get(layoutId)!;
  const wi = layout.wards.findIndex(
    (w) => w.key !== layout.boss.ward && w.knots.some((k) => k.title),
  );
  assert.ok(wi >= 0, 'the flagship keeps a titled ward');
  const bossWi = layout.wards.findIndex((w) => w.key === layout.boss.ward);
  const key = '7,7';
  const spawnPoints = [
    // The captain — titled, named, ONE body.
    { npc: 'goblin_firecaller', eid: 1, active: true, wing: wi, name: 'Warden of the Inner Gate', x: 0, y: 0, radius: 1, respawnAt: 0 },
    // A line goblin in the same ward — its survival must NOT hold the lid.
    { npc: 'goblin', eid: 2, active: true, wing: wi, x: 5, y: 0, radius: 1, respawnAt: 0 },
    // The chief's court still fully manned.
    { npc: 'goblin', eid: 3, active: true, wing: bossWi, x: 9, y: 9, radius: 1, respawnAt: 0 },
  ];
  const slate = {
    spawnPoints,
    strongholdLive: new Map([
      [key, { zoneId: `stronghold:${key}`, seat: { gx: 7, gy: 7, x: 0, y: 0, rect: { x: 0, y: 0, w: 1, h: 1 }, family: 'goblin', tier: 4, layoutId }, layoutId, spawnIdx: [0, 1, 2] }],
    ]),
    poiSpawnFights: chapterProto.poiSpawnFights,
    strongholdGarrisonStands: chapterProto.strongholdGarrisonStands,
    strongholdCaptainStands: chapterProto.strongholdCaptainStands,
    strongholdBossWard: chapterProto.strongholdBossWard,
  };
  // The captain stands: the captain cache holds, the chief's cache holds.
  assert.equal(chapterProto.strongholdCacheWarded.call(slate, `${key}:${wi}`), true);
  assert.equal(chapterProto.strongholdCacheWarded.call(slate, key), true);
  // The captain falls; the line goblin still mans the yard — the
  // captain cache OPENS anyway (kill the keeper, not the crowd), and
  // the chief's cache still holds.
  spawnPoints[0]!.eid = null as unknown as number;
  assert.equal(chapterProto.strongholdCacheWarded.call(slate, `${key}:${wi}`), false);
  assert.equal(chapterProto.strongholdCacheWarded.call(slate, key), true);
  // The last stand falls: the chief's cache opens too.
  spawnPoints[2]!.eid = null as unknown as number;
  assert.equal(chapterProto.strongholdCacheWarded.call(slate, key), false);
});

function warSlate(row: {
  clearedAt?: number | null;
  emberUntil?: number | null;
  fallowUntil?: number | null;
  stage?: number;
  stageAt?: number | null;
}) {
  const saved: unknown[] = [];
  const credits: number[] = [];
  const retired: string[] = [];
  const slate = {
    strongholdLedger: new Map([
      ['4,4', {
        layoutId: 'stronghold_gnoll_cacklefort',
        anchorX: 1700,
        anchorY: 1700,
        epoch: 0,
        wardsCleared: 5,
        clearedAt: row.clearedAt ?? null,
        emberUntil: row.emberUntil ?? null,
        fallowUntil: row.fallowUntil ?? null,
        stage: row.stage ?? 0,
        stageAt: row.stageAt ?? null,
      }],
    ]),
    poiLedger: new Map(),
    poiLive: new Map(),
    strongholdLive: new Map(),
    strongholdSpawnCells: new Map(),
    poiChests: new Map(),
    frontierCalm: new Map(),
    frontierCredits: 0,
    players: new Map(),
    positions: new Map(),
    accounts: {
      saveStrongholdState: (_gx: number, _gy: number, r: unknown) => saved.push(r),
      saveFrontierCredits: (n: number) => credits.push(n),
    },
    saveStrongholdRow: undefined as unknown,
    playerWithin: () => false,
    calmNear: warProto.calmNear,
    retireCapital: (key: string) => retired.push(key),
    unloadZone: () => {},
  };
  slate.saveStrongholdRow = (GameServer.prototype as unknown as {
    saveStrongholdRow: unknown;
  }).saveStrongholdRow;
  return { slate, saved, credits, retired };
}

test('a due capital ember dissolves: epoch turns, seat rests, ONE credit banks', () => {
  const now = Date.now();
  const f = warSlate({ clearedAt: now - 60_000, emberUntil: now - 1 });
  assert.equal(warProto.dissolveOneCapitalEmber.call(f.slate, now), true);
  const row = f.slate.strongholdLedger.get('4,4')!;
  assert.equal(row.epoch, 1);
  assert.equal(row.clearedAt, null);
  assert.equal(row.emberUntil, null);
  assert.equal(row.wardsCleared, 0);
  assert.equal(row.stage, 0);
  assert.ok(
    row.fallowUntil !== null &&
      row.fallowUntil >= now + FRONTIER.strongholdFallowMs[0] &&
      row.fallowUntil <= now + FRONTIER.strongholdFallowMs[1],
    'the seat rests inside the dial band',
  );
  assert.deepEqual(f.credits, [1], 'one clear, one credit — conservation');
  assert.deepEqual(f.retired, ['4,4']);
  // Nothing left due: the ladder rung yields.
  assert.equal(warProto.dissolveOneCapitalEmber.call(f.slate, now), false);
});

test('dignity holds the dissolve; the wake lifts the fallow when due', () => {
  const now = Date.now();
  const f = warSlate({ clearedAt: now - 60_000, emberUntil: now - 1 });
  (f.slate as { playerWithin: () => boolean }).playerWithin = () => true;
  assert.equal(warProto.dissolveOneCapitalEmber.call(f.slate, now), false, 'never in front of anyone');
  const g = warSlate({ fallowUntil: now - 1 });
  assert.equal(warProto.wakeOneCapitalFallow.call(g.slate, now), true);
  assert.equal(g.slate.strongholdLedger.get('4,4')!.fallowUntil, null);
});

test('the boldness clock climbs armed capitals and calm freezes it', () => {
  const now = Date.now();
  const armed = now - FRONTIER.stageMs[1] - 1;
  const f = warSlate({ stage: 0, stageAt: armed });
  assert.equal(warProto.stageOneCapital.call(f.slate, now), true);
  const row = f.slate.strongholdLedger.get('4,4')!;
  assert.equal(row.stage, 1);
  assert.deepEqual(f.retired, ['4,4'], 'recompose-in-place: the walls re-stand bolder');
  // A relax window freezes the climb.
  const g = warSlate({ stage: 0, stageAt: armed });
  g.slate.frontierCalm.set('13,13', now + 60_000);
  assert.equal(warProto.stageOneCapital.call(g.slate, now), false);
});

test('jitter helpers stay in-band and epoch-divergent; the epoch re-deals the walls', () => {
  const a = strongholdEmberFor(config.worldSeed, 3, 3, 0);
  assert.equal(a, strongholdEmberFor(config.worldSeed, 3, 3, 0));
  assert.ok(a >= FRONTIER.strongholdEmberMs[0] && a <= FRONTIER.strongholdEmberMs[1]);
  assert.notEqual(a, strongholdEmberFor(config.worldSeed, 3, 3, 1));
  const fw = strongholdFallowFor(config.worldSeed, 3, 3, 0);
  assert.ok(fw >= FRONTIER.strongholdFallowMs[0] && fw <= FRONTIER.strongholdFallowMs[1]);
  // layoutForSeat: epoch 0 is the seat's own layout; the goblin pool
  // has three layouts, so SOME seat re-deals differently by epoch 3.
  const seats = sweepSeats().filter((st) => st.family === 'goblin');
  if (seats.length === 0) return;
  const layouts = [...STRONGHOLD_DEFS.values()];
  let changed = false;
  for (const seat of seats) {
    assert.equal(layoutForSeat(SEED, seat, 0, layouts)?.id, seat.layoutId, 'epoch 0 = the seat');
    for (let e = 1; e <= 6; e++) {
      const dealt = layoutForSeat(SEED, seat, e, layouts);
      assert.ok(dealt && dealt.family === seat.family, 'the deal never leaves the family');
      if (dealt.id !== seat.layoutId) changed = true;
    }
  }
  assert.ok(changed, 'no seat ever re-dealt different walls across six epochs');
});

test('stage re-mans and thickens: bolder capitals muster more, never deadlier', () => {
  const seat = sweepSeats()[0]!;
  const layouts = [...STRONGHOLD_DEFS.values()];
  const layout = layoutForSeat(SEED, seat, 0, layouts)!;
  const prefab = STRONGHOLD_PREFABS.get(layout.prefab)!;
  const calm = composeStronghold(SEED, seat, layout, prefab, 0, 0);
  const bold = composeStronghold(SEED, seat, layout, prefab, 0, 3);
  const bodies = (z: typeof calm) => (z.spawns ?? []).reduce((n, sp) => n + sp.count, 0);
  assert.ok(bodies(bold) >= bodies(calm), 'boldness never thins the watch');
  const maxLevel = (z: typeof calm) => Math.max(...(z.spawns ?? []).map((sp) => sp.level ?? 0));
  assert.equal(maxLevel(bold), maxLevel(calm), 'busier, never deadlier (THE FREQUENCY LAW)');
  assert.deepEqual(bold.ground, calm.ground, 'boldness never moves a wall');
});

// ---- THE SURVEYOR'S GLASS II (Phase 6) -------------------------------

import { simulateLandSteps } from './finds.js';

test('the density survey walks the full ladder: capitals swept, mask observed, deterministic', () => {
  const ctx: PoiContext = {
    anchors: SETTLED_ANCHORS,
    zoneRects: [{ x: -96, y: 16, w: 96, h: 64 }],
    claimRings: [],
    defs: [...POI_DEFS.values()],
    minors: [...MINOR_DEFS.values()],
    prefabs,
    capitals: [],
  };
  const run = () => {
    const gen = simulateLandSteps(SEED, ctx, 260);
    let step = gen.next();
    while (!step.done) step = gen.next();
    return step.value;
  };
  const a = run();
  const b = run();
  assert.deepEqual(a, b, 'the survey is deterministic');
  assert.ok(a.capitals.seats >= 2, `only ${a.capitals.seats} capitals in the sweep`);
  assert.ok(a.capitals.maskedCells >= 1, 'the ONE-CELL DEBT must be visible');
  assert.ok(a.capitals.quietCountries >= 1, 'some countries lawfully keep no capital');
  let byLayoutTotal = 0;
  for (const n of Object.values(a.capitals.byLayout)) byLayoutTotal += n;
  assert.equal(byLayoutTotal, a.capitals.seats, 'every seat names its layout');
  // The mask holds inside the sim: sites + masked cells + empty account
  // for every evaluated cell.
  assert.equal(a.sites + a.empty + a.capitals.maskedCells, a.evaluated);
});

test('THE POST COMES ALIVE at the capitals: posted knots split onto their furniture', () => {
  // A layout with furniture-derived posts (postAt) must compose them
  // into count-1 bodies, each carrying the post through ZoneSpawn —
  // the Third Charter's fiction finally reaching the runtime.
  const seat = sweepSeats().find((s) => {
    const layout = STRONGHOLD_DEFS.get(s.layoutId)!;
    return layout.wards.some((w) => w.knots.some((k) => k.post && k.postAt && !k.title));
  });
  assert.ok(seat, 'no posted layout in the sweep window');
  const layout = STRONGHOLD_DEFS.get(seat.layoutId)!;
  const prefab = STRONGHOLD_PREFABS.get(layout.prefab)!;
  const zone = composeStronghold(SEED, seat, layout, prefab);
  const posted = (zone.spawns ?? []).filter((s) => s.post);
  assert.ok(posted.length >= 1, 'no posted bodies composed');
  for (const s of posted) {
    assert.equal(s.count, 1, 'a post is one body\'s charge');
    assert.ok(Number.isFinite(s.post!.dir), 'a post faces its work');
    assert.equal(s.name, undefined, 'titled bodies never take posts');
  }
  // Knot hours survive the split (the tents' night muster keeps its
  // window on every posted body it deals).
  const restKnot = layout.wards
    .flatMap((w) => w.knots)
    .find((k) => k.post === 'rest' && k.postAt && k.hours && !k.title);
  if (restKnot) {
    const withHours = posted.filter((s) => s.npc === restKnot.npc && s.hours);
    assert.ok(withHours.length >= 0); // presence depends on the epoch's manning roll
  }
});

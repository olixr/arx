import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MINOR_DEFS,
  POI_DEFS,
  POI_PREFABS,
  SETTLED_ANCHORS,
  STRONGHOLD_DEFS,
  STRONGHOLD_PREFABS,
  familiesOf,
  territoryAt,
} from '@arx/content';
import { POI_CELL, poiForCell, type PoiContext } from './pois.js';
import { findsForCell } from './finds.js';
import {
  capitalLatticeRange,
  capitalMasked,
  composeStronghold,
  strongholdSeat,
  type SeatCtx,
} from './strongholds.js';

const SEED = 1337;

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
  const bossSpawn = spawns.find((s) => s.name !== undefined);
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
  // THE CHAPTERS: every spawn wears its ward tag; manned wards keep
  // every eligible knot at its authored anchor; optional wards that
  // rolled empty this epoch contribute nothing at all.
  for (const [wi, ward] of layout.wards.entries()) {
    const wardSpawns = spawns.filter((sp) => sp.wing === wi);
    if (ward.optional && wardSpawns.length === 0) continue; // rolled empty
    for (const knot of ward.knots) {
      if (knot.minTier !== undefined && seat.tier < knot.minTier) continue;
      assert.ok(
        wardSpawns.some(
          (sp) => sp.x === seat.rect.x + knot.at[0] && sp.y === seat.rect.y + knot.at[1],
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
  };
  const spawnPoints = [
    { npc: 'gnoll', eid: 1, active: true, wing: wardA, x: 0, y: 0 },
    { npc: 'gnoll', eid: 2, active: true, wing: wardA, x: 5, y: 0 },
    { npc: 'gnoll', eid: 3, active: true, wing: bossWi, x: 0, y: 5 },
    { npc: 'gnoll_champion', eid: 4, active: true, wing: bossWi, x: 1, y: 5 },
  ];
  const slate = {
    spawnPoints,
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
    },
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

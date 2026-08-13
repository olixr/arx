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
  const minBodies = layout.wards.reduce(
    (n, w) =>
      n +
      w.knots.reduce(
        (m, k) => m + (k.minTier !== undefined && seat.tier < k.minTier ? 0 : k.band[0]),
        0,
      ),
    1,
  );
  assert.ok(
    bodies >= minBodies && bodies <= maxBodies,
    `muster ${bodies} outside ${minBodies}..${maxBodies}`,
  );
  // Every knot spawn sits at its authored anchor, world-shifted.
  for (const ward of layout.wards) {
    for (const knot of ward.knots) {
      if (knot.minTier !== undefined && seat.tier < knot.minTier) continue;
      assert.ok(
        spawns.some(
          (sp) => sp.x === seat.rect.x + knot.at[0] && sp.y === seat.rect.y + knot.at[1],
        ),
        `${ward.key} knot at ${knot.at[0]},${knot.at[1]} lost its post`,
      );
    }
  }
});

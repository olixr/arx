import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_SKIP, chestInfo } from '@arx/shared';
import { WORLD_SEED, MINOR_DEFS, POI_PREFABS, SETTLED_ANCHORS, dangerLaw, shoreProbeAt } from '@arx/content';
import { poiContext, poiForCell, poiScanOrder, POI_CELL } from './pois.js';
import { FIND_SPACING, composeFinds, findsForCell, findsZoneId } from './finds.js';

const SEED = WORLD_SEED;
const CTX = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);

/** Hostile-tier scan cells with their (possibly null) site anchors. */
function scanCells(
  max: number,
): Array<{ cx: number; cy: number; site: { x: number; y: number } | null }> {
  const out: Array<{ cx: number; cy: number; site: { x: number; y: number } | null }> = [];
  for (const { cx, cy } of poiScanOrder(12)) {
    if (out.length >= max) break;
    const site = poiForCell(SEED, cx, cy, 0, CTX);
    out.push({ cx, cy, site: site ? { x: site.anchorX, y: site.anchorY } : null });
  }
  return out;
}

test('the lattice is deterministic and honors the spacing law', () => {
  let total = 0;
  let cellsWithFinds = 0;
  for (const { cx, cy, site } of scanCells(80)) {
    const a = findsForCell(SEED, cx, cy, 0, CTX, site);
    const b = findsForCell(SEED, cx, cy, 0, CTX, site);
    assert.deepEqual(a, b, `cell ${cx},${cy} re-rolled differently`);
    total += a.length;
    if (a.length > 0) cellsWithFinds++;
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        const d = Math.hypot(a[i]!.anchorX - a[j]!.anchorX, a[i]!.anchorY - a[j]!.anchorY);
        assert.ok(d >= FIND_SPACING, `cell ${cx},${cy}: finds ${i}/${j} only ${d.toFixed(1)} apart`);
      }
      if (site) {
        const d = Math.hypot(a[i]!.anchorX - site.x, a[i]!.anchorY - site.y);
        assert.ok(d >= FIND_SPACING, `cell ${cx},${cy}: find ${i} crowds the site (${d.toFixed(1)})`);
      }
      assert.ok(a[i]!.tier >= 1 && a[i]!.tier <= 5, 'slot tier in band');
      const def = MINOR_DEFS.get(a[i]!.defId)!;
      assert.ok(def, `unknown def ${a[i]!.defId}`);
      assert.ok(a[i]!.tier >= def.tiers[0] && a[i]!.tier <= def.tiers[1], 'def eligible at tier');
      assert.equal(a[i]!.habitat, def.habitat, 'habitat mirrors the def');
    }
  }
  // Density: the walk between sites actually pays now. The scan mixes
  // settled and deep cells, so the band is wide — but a texture layer
  // that deals almost nothing (or floods) is a regression either way.
  assert.ok(total >= 40, `only ${total} finds over 80 cells — the land went bare`);
  assert.ok(total <= 80 * 6, `${total} finds over 80 cells — the land is cluttered`);
  assert.ok(cellsWithFinds >= 25, `only ${cellsWithFinds}/80 cells dealt any texture`);
});

test('THE SHORE FIND: a shore-flagged find always stands on the bank, and the banks do deal them', () => {
  const shoreDefs = new Set(
    [...MINOR_DEFS.values()].filter((d) => d.shore).map((d) => d.id),
  );
  assert.ok(shoreDefs.size >= 4, 'the skral shore finds exist');
  let dealt = 0;
  for (const { cx, cy, site } of scanCells(220)) {
    for (const f of findsForCell(SEED, cx, cy, 0, CTX, site)) {
      if (!shoreDefs.has(f.defId)) continue;
      dealt++;
      assert.ok(
        shoreProbeAt(SEED, f.anchorX, f.anchorY, 6),
        `${f.defId} at ${f.anchorX},${f.anchorY} stands dry — the wreck and the waterline disagree`,
      );
    }
  }
  // The gate must not starve the family out of existence: over a wide
  // scan the banks deal SOME of their own texture, or the pool gate
  // is quietly refusing everything.
  assert.ok(dealt >= 3, `only ${dealt} shore finds over 220 cells — the banks went bare`);
});

test('settled ground deals no finds', () => {
  // Dawnmead's own cell (anchor -64,48 → cell -1,0) is inside safeR.
  const finds = findsForCell(SEED, -1, 0, 0, CTX, null);
  for (const f of finds) {
    // Slots of a hearth cell may still poke past safeR at the rim —
    // but no find may stand at tier 0 (the law is per slot).
    assert.ok(f.tier >= 1, `a find dealt at tier 0`);
  }
});

test('the epoch turn re-deals the texture', () => {
  let diverged = 0;
  let compared = 0;
  for (const { cx, cy, site } of scanCells(40)) {
    const a = findsForCell(SEED, cx, cy, 0, CTX, site);
    const b = findsForCell(SEED, cx, cy, 1, CTX, site);
    if (a.length === 0 && b.length === 0) continue;
    compared++;
    if (JSON.stringify(a) !== JSON.stringify(b)) diverged++;
  }
  assert.ok(compared >= 10, 'scan too settled to compare');
  assert.ok(diverged >= compared * 0.5, `only ${diverged}/${compared} cells re-dealt on the turn`);
});

test('composeFinds: one zone, transparent between, spawns slot-tagged, caches humble', () => {
  let composedCells = 0;
  let sawSpawn = false;
  let sawChest = false;
  for (const { cx, cy, site } of scanCells(140)) {
    const finds = findsForCell(SEED, cx, cy, 0, CTX, site);
    if (finds.length === 0) continue;
    const composed = composeFinds(SEED, cx, cy, 0, finds, CTX);
    assert.ok(composed, `cell ${cx},${cy}: finds refused to compose`);
    const { zone, spawnSlots } = composed!;
    composedCells++;
    assert.equal(zone.id, findsZoneId(cx, cy));
    assert.equal((zone.spawns ?? []).length, spawnSlots.length, 'spawnSlots mirrors spawns');
    // Every footprint lands inside the zone; the ground between is
    // transparent (spot check: the zone is mostly TILE_SKIP).
    let skip = 0;
    for (let i = 0; i < zone.ground.length; i++) {
      if (zone.ground[i] === TILE_SKIP) skip++;
      const info = chestInfo(zone.ground[i]!);
      if (info && !info.open) {
        sawChest = true;
        // THE HUMBLE CACHE: a surviving chest is one tier under the
        // slot's law. The slot isn't recoverable from the tile alone,
        // so pin the global bound: never above tier-4's humble kind.
        const kinds = [1, 2, 3, 4, 5].map((t) => dangerLaw(Math.max(1, t - 1)).chest);
        assert.ok(kinds.includes(info.kind), `cache kind '${info.kind}' outside the humble law`);
      }
    }
    // The between-space is transparent: with 2+ finds the spacing law
    // guarantees a bbox far larger than the footprints, so the zone
    // must be mostly TILE_SKIP; a lone find still keeps its prefab's
    // own transparent fringe.
    if (finds.length >= 2) {
      assert.ok(skip > zone.ground.length * 0.5, 'the between-space must stay transparent');
    }
    for (const [j, s] of (zone.spawns ?? []).entries()) {
      sawSpawn = true;
      const slot = spawnSlots[j]!;
      const f = finds.find((x) => x.slot === slot)!;
      assert.ok(f, 'spawn tagged to a dealt slot');
      const law = dangerLaw(f.tier);
      const def = MINOR_DEFS.get(f.defId)!;
      const maxOffset = Math.max(0, ...(def.garrison ?? []).map((g) => g.levelOffset ?? 0));
      assert.ok(
        (s.level ?? 0) >= law.npcLevel[0] && (s.level ?? 0) <= law.npcLevel[1] + maxOffset,
        `find garrison level ${s.level} outside band [${law.npcLevel[0]}, ${law.npcLevel[1]}]`,
      );
      assert.ok(Math.hypot(s.x - (f.anchorX + 0.5), s.y - (f.anchorY + 0.5)) < 1, 'whisper at the anchor');
    }
  }
  assert.ok(composedCells >= 20, `only ${composedCells} cells composed`);
  assert.ok(sawSpawn, 'no find garrison in the whole scan');
  assert.ok(sawChest, 'no cache survived in the whole scan — chance math suspect');
});

// ------------------------------------------------- the kill path
// (the poiWard slate dialect: private methods over a hand-built slate)

import { GameServer } from '../game/gameServer.js';

type KillFn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  noteMinorKill: KillFn;
  poiSpawnFights: KillFn;
};

interface FakeSpawn {
  npc: string;
  eid: number | null;
  respawnAt: number;
  active: boolean;
}

function killSlate(
  spawns: FakeSpawn[],
  spawnSlots: number[],
  opts: { epoch?: number; prior?: { epoch: number; cleared: number } } = {},
) {
  const upserts: Array<[number, number, number, number]> = [];
  const finds = [...new Set(spawnSlots)].map((slot) => ({
    slot,
    defId: 'find_den_mouth',
    prefabId: 'find_den_mouth',
    anchorX: 100 + slot,
    anchorY: 200,
    tier: 2,
    habitat: 'den',
  }));
  return {
    spawnPoints: spawns,
    minorSpawnSlots: new Map(spawns.map((_, i) => [i, { key: '3,4', slot: spawnSlots[i]! }])),
    findsLive: new Map([
      ['3,4', { zoneId: 'poi:3,4:f', spawnIdx: spawns.map((_, i) => i), spawnSlots, finds }],
    ]),
    minorLedger: new Map(opts.prior ? [['3,4', opts.prior]] : []),
    poiLedger: new Map([['3,4', { epoch: opts.epoch ?? 0 }]]),
    habitatFinds: new Map(finds.map((f) => [`3,4#${f.slot}`, { habitat: 'den', x: f.anchorX, y: f.anchorY }])),
    accounts: {
      upsertMinorCell: (cx: number, cy: number, epoch: number, cleared: number) =>
        upserts.push([cx, cy, epoch, cleared]),
    },
    poiSpawnFights: proto.poiSpawnFights,
    upserts,
  };
}

const wolf = (over: Partial<FakeSpawn> = {}): FakeSpawn => ({
  npc: 'wolf',
  eid: null,
  respawnAt: 0,
  active: true,
  ...over,
});

test('no slot wipe while a fighter of that slot still stands', () => {
  // Two wolves in slot 5; one dies (eid null), one stands (eid 9).
  const s = killSlate([wolf(), wolf({ eid: 9 })], [5, 5]);
  proto.noteMinorKill.call(s, 0);
  assert.equal(s.upserts.length, 0, 'nothing stamps while the den answers');
  assert.ok(s.habitatFinds.has('3,4#5'), 'the habitat pull stays live');
});

test('the slot wipe stamps its bit, quiets the habitat, stands the whisper down', () => {
  const s = killSlate([wolf(), wolf()], [5, 5]);
  proto.noteMinorKill.call(s, 1);
  assert.deepEqual(s.upserts, [[3, 4, 0, 1 << 5]]);
  assert.equal(s.minorLedger.get('3,4')!.cleared, 1 << 5);
  assert.ok(!s.habitatFinds.has('3,4#5'), 'the den goes quiet');
  assert.ok(s.spawnPoints.every((sp) => !sp.active), 'the whisper never restaffs');
});

test('slots clear independently and bits accumulate', () => {
  // Slot 2 already cleared this epoch; slot 7 wipes now; slot 5 stands.
  const s = killSlate(
    [wolf({ eid: 3 }), wolf(), wolf()],
    [5, 7, 2],
    { prior: { epoch: 0, cleared: 1 << 2 } },
  );
  proto.noteMinorKill.call(s, 1);
  assert.deepEqual(s.upserts, [[3, 4, 0, (1 << 2) | (1 << 7)]]);
  assert.ok(s.habitatFinds.has('3,4#5'), 'the standing slot keeps its pull');
});

test("an epoch turn drops stale bits — last deal's clears never carry", () => {
  const s = killSlate([wolf()], [5], { epoch: 3, prior: { epoch: 2, cleared: 0xffff } });
  proto.noteMinorKill.call(s, 0);
  assert.deepEqual(s.upserts, [[3, 4, 3, 1 << 5]]);
});

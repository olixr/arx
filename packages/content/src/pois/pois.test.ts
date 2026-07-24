import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_SKIP, Tile, chestInfo } from '@devcraft/shared';
import { DANGER_LAWS } from '../danger.js';
import { NPCS } from '../npcs.js';
import { POI_DEFS } from './defs.js';
import { POI_PREFABS } from './prefabs.js';

test('every archetype references known prefabs and bestiary ids', () => {
  for (const def of POI_DEFS) {
    assert.ok(def.prefabs.length > 0, `${def.id} has an empty prefab pool`);
    for (const id of def.prefabs) {
      assert.ok(POI_PREFABS.has(id), `${def.id} references unknown prefab '${id}'`);
    }
    for (const g of def.garrison) {
      assert.ok(NPCS.has(g.npc), `${def.id} garrison references unknown npc '${g.npc}'`);
      assert.ok(g.count[0] <= g.count[1], `${def.id}/${g.npc} count range inverted`);
      if (g.minTier !== undefined) {
        assert.ok(
          g.minTier >= def.tiers[0] && g.minTier <= def.tiers[1],
          `${def.id}/${g.npc} minTier outside the archetype's tiers`,
        );
      }
    }
    assert.ok(
      def.tiers[0] >= 1 && def.tiers[1] < DANGER_LAWS.length && def.tiers[0] <= def.tiers[1],
      `${def.id} tier range invalid`,
    );
  }
});

test('prefab spawns reference known bestiary ids', () => {
  for (const p of POI_PREFABS.values()) {
    for (const s of p.spawns) {
      assert.ok(NPCS.has(s.npc), `${p.id} spawn references unknown npc '${s.npc}'`);
    }
  }
});

test('warcamp and ruin prefabs carry exactly one closed strongbox', () => {
  for (const def of POI_DEFS) {
    if (def.chestTierBonus === undefined) continue;
    for (const id of def.prefabs) {
      const p = POI_PREFABS.get(id)!;
      let chests = 0;
      for (const g of p.ground) {
        const info = chestInfo(g);
        if (info && !info.open) chests++;
      }
      assert.equal(chests, 1, `${id} should hold exactly one strongbox`);
    }
  }
});

test('prefabs keep a transparent fringe so stamps sit in the terrain', () => {
  for (const p of POI_PREFABS.values()) {
    let skips = 0;
    for (const g of p.ground) if (g === TILE_SKIP) skips++;
    assert.ok(skips > 0, `${p.id} has no TILE_SKIP cells — it would stamp a hard rectangle`);
    // Corners specifically stay transparent: the classic seam tell.
    const { width: w, height: h } = p;
    for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) {
      assert.equal(p.ground[y * w + x], TILE_SKIP, `${p.id} corner ${x},${y} not transparent`);
    }
  }
});

test('markers stand on open ground, never inside walls or props', () => {
  for (const p of POI_PREFABS.values()) {
    for (const s of p.spawns) {
      const t = p.ground[s.dy * p.width + s.dx]!;
      assert.ok(
        t === Tile.Grass || t === Tile.Dirt || t === Tile.StoneFloor,
        `${p.id} spawn '${s.npc}' stands on tile ${t}`,
      );
    }
  }
});

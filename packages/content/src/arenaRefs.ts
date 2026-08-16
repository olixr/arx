import { NPCS } from './npcs.js';
import { LOOT_TABLES } from './loot/tables.js';
import { NPC_ACTORS } from './actors/registry.js';
import { PLANNED_ZONE_RECTS } from './geography.js';
import { crownPoolFor } from './crownForge.js';
import type { ArenaValidateRefs } from './arena.js';

/**
 * THE SAND AND THE ROAR — the full cross-reference set for
 * validateArenas, read from the LIVE registries at call time (a
 * Studio PUT validates against the bestiary as it stands right now,
 * the geography live doc included). Lives apart from arena.ts so the
 * doc module itself stays registry-free.
 */
export function arenaValidateRefsNow(): ArenaValidateRefs {
  const crownable = new Set<string>();
  for (const [id, def] of NPCS) {
    if (def.kit !== undefined && (def.boss !== undefined || crownPoolFor(id) !== null)) {
      crownable.add(id);
    }
  }
  return {
    npcIds: new Set(NPCS.keys()),
    crownable,
    lootTables: new Set(LOOT_TABLES.keys()),
    actorSlugs: new Set(NPC_ACTORS.keys()),
    zoneRects: new Map(
      PLANNED_ZONE_RECTS.map((p) => [p.id, { x: p.x, y: p.y, w: p.w, h: p.h }]),
    ),
  };
}

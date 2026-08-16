import {
  SURFACE_PLANE_ID,
  type PlaneDef,
  type PlaneId,
  type PlanePos,
  type ZoneDef,
} from '@arx/content';
import { WorldSource } from './worldSource.js';

/**
 * THE WORLDS APART — the registry of every plane the server is
 * currently holding (docs/planes-plan.md §2.2). The static planes
 * (surface, underworld) stand for the server's whole life; rift
 * planes are minted when a key turns and DROPPED WHOLE when the run
 * ends — chunks, zones, portals, signs, memory, gone in one delete.
 */
export class Planes {
  private readonly worlds = new Map<PlaneId, WorldSource>();

  constructor(private readonly seed: number) {}

  /** Stand a plane up with its initial zones (boot, or a rift cut). */
  add(def: PlaneDef, zones: ZoneDef[] = []): WorldSource {
    if (this.worlds.has(def.id)) {
      throw new Error(`plane '${def.id}' already stands`);
    }
    const world = new WorldSource(this.seed, def, zones);
    this.worlds.set(def.id, world);
    return world;
  }

  /** Tear a plane down wholesale — the instance unload. */
  drop(id: PlaneId): void {
    if (id === SURFACE_PLANE_ID) throw new Error('the surface never unloads');
    this.worlds.delete(id);
  }

  get(id: PlaneId): WorldSource | undefined {
    return this.worlds.get(id);
  }

  /**
   * The plane an entity's law says must exist. A missing plane here is
   * a lifecycle bug (a body left standing on a dropped rift), and
   * failing loud beats simulating against a world that isn't there.
   */
  require(id: PlaneId): WorldSource {
    const world = this.worlds.get(id);
    if (!world) throw new Error(`plane '${id}' does not stand`);
    return world;
  }

  get surface(): WorldSource {
    return this.require(SURFACE_PLANE_ID);
  }

  defOf(id: PlaneId): PlaneDef | undefined {
    return this.worlds.get(id)?.plane;
  }

  /** Every standing plane, for sweeps that must touch them all. */
  all(): IterableIterator<WorldSource> {
    return this.worlds.values();
  }

  /** Lifetime chunk generations across every plane (tick-debt ledger). */
  get generatedCount(): number {
    let n = 0;
    for (const w of this.worlds.values()) n += w.generatedCount;
    return n;
  }

  /** The world spawn — where a soul with nowhere else to be wakes. */
  get worldSpawn(): PlanePos {
    const spawn = this.surface.spawn;
    return { plane: SURFACE_PLANE_ID, x: spawn.x, y: spawn.y };
  }

  /**
   * Where death sends you. Scratch planes always rescue home (a
   * personal dungeon may be torn down under the corpse); persistent
   * planes answer with their own nearest hearth — the Undercroft's
   * Landing catches the underworld's dead, and a surface death can
   * never wake in the dark just because the dark was closer as the
   * crow digs. A plane with no hearth falls to the world spawn.
   */
  respawnAt(plane: PlaneId, x: number, y: number): PlanePos {
    const world = this.worlds.get(plane);
    if (!world || !world.plane.persistent) return this.worldSpawn;
    const near = world.nearestSpawnTo(x, y);
    if (!near) return this.worldSpawn;
    return { plane, x: near.x, y: near.y };
  }

  /** The spawn a specific zone declares, with its plane, if any. */
  spawnOf(zoneId: string): PlanePos | null {
    for (const world of this.worlds.values()) {
      const spawn = world.spawnOf(zoneId);
      if (spawn) return { plane: world.plane.id, x: spawn.x, y: spawn.y };
    }
    return null;
  }

  /** Find the plane holding a zone id (editor round-trips). */
  planeOfZone(zoneId: string): WorldSource | null {
    for (const world of this.worlds.values()) {
      if (world.zoneById(zoneId)) return world;
    }
    return null;
  }
}

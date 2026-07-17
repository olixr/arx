import type { EntityId } from '../entities.js';

/**
 * ECS-lite: entities are ids, components are plain-data records in named
 * stores, systems are functions over stores. Destroying an entity clears
 * it from every store registered on the world.
 */
export class ComponentStore<T> {
  private readonly data = new Map<EntityId, T>();

  get(eid: EntityId): T | undefined {
    return this.data.get(eid);
  }

  /** Get or throw — for components a system knows must exist. */
  must(eid: EntityId): T {
    const v = this.data.get(eid);
    if (v === undefined) throw new Error(`missing component for entity ${eid}`);
    return v;
  }

  set(eid: EntityId, value: T): void {
    this.data.set(eid, value);
  }

  has(eid: EntityId): boolean {
    return this.data.has(eid);
  }

  delete(eid: EntityId): void {
    this.data.delete(eid);
  }

  get size(): number {
    return this.data.size;
  }

  entries(): IterableIterator<[EntityId, T]> {
    return this.data.entries();
  }

  keys(): IterableIterator<EntityId> {
    return this.data.keys();
  }

  values(): IterableIterator<T> {
    return this.data.values();
  }

  [Symbol.iterator](): IterableIterator<[EntityId, T]> {
    return this.data.entries();
  }
}

export class EcsWorld {
  private nextId: EntityId = 1;
  private readonly stores: ComponentStore<unknown>[] = [];
  private readonly alive = new Set<EntityId>();

  /** Create a registered store; cleared automatically on entity destroy. */
  register<T>(): ComponentStore<T> {
    const store = new ComponentStore<T>();
    this.stores.push(store as ComponentStore<unknown>);
    return store;
  }

  create(): EntityId {
    const eid = this.nextId++;
    this.alive.add(eid);
    return eid;
  }

  destroy(eid: EntityId): void {
    this.alive.delete(eid);
    for (const store of this.stores) store.delete(eid);
  }

  isAlive(eid: EntityId): boolean {
    return this.alive.has(eid);
  }

  entities(): IterableIterator<EntityId> {
    return this.alive.values();
  }

  get count(): number {
    return this.alive.size;
  }
}

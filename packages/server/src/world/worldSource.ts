import {
  CHUNK_SIZE,
  ChunkStore,
  TILE_SKIP,
  chunkKey,
  tileIndex,
  type ChunkData,
  type Vec2,
} from '@arx/shared';
import type { GrowthRow, PlaneDef, PortalDef, ZoneDef, ZoneSign } from '@arx/content';
import {
  EDGE_BASIN_DAMP_RANGE,
  SURFACE_PLANE_ID,
  generateCaveChunk,
  generateChunk,
  projectGrowth,
  replaceZoneEdgeProfiles,
  zoneEdgeProfileOf,
} from '@arx/content';

/**
 * ONE PLANE of the world (THE WORLDS APART, docs/planes-plan.md):
 * base terrain by the plane's law — procedural fields on 'worldgen'
 * planes, solid rock on 'cave' planes — with authored zones stamped on
 * top, generated lazily and cached. Implements CollisionSource (via
 * ChunkStore) — movement and AI query it directly. Zones can be added
 * and removed at runtime (delve instances). Coordinates are
 * plane-local; nothing outside this object may compare positions
 * across planes.
 */
export class WorldSource extends ChunkStore {
  private readonly zones: ZoneDef[];
  private readonly portals = new Map<string, PortalDef>();
  /** Authored sign copy, addressed by the tile it stands on. */
  private readonly signs = new Map<string, ZoneSign>();

  constructor(
    private readonly seed: number,
    readonly plane: PlaneDef,
    initialZones: ZoneDef[],
  ) {
    super();
    this.zones = [];
    for (const zone of initialZones) this.addZone(zone);
  }

  /** The base chunk this plane deals before any zone stamps it. */
  private generateBase(cx: number, cy: number): ChunkData {
    return this.plane.base === 'cave'
      ? generateCaveChunk(cx, cy)
      : generateChunk(this.seed, cx, cy);
  }

  addZone(zone: ZoneDef): void {
    // A zone stamps exactly the plane it is tagged for — a mismatch is
    // an authoring error, never a silent cross-plane stamp.
    const zonePlane = zone.plane ?? SURFACE_PLANE_ID;
    if (zonePlane !== this.plane.id) {
      throw new Error(
        `zone '${zone.id}' is tagged for plane '${zonePlane}', not '${this.plane.id}'`,
      );
    }
    this.zones.push(zone);
    for (const portal of zone.portals ?? []) {
      this.portals.set(`${portal.x},${portal.y}`, portal);
    }
    for (const sign of zone.signs ?? []) this.signs.set(`${sign.x},${sign.y}`, sign);
    this.refreshEdgeProfiles();
    this.dropZoneChunks(zone);
  }

  removeZone(zoneId: string): void {
    const idx = this.zones.findIndex((z) => z.id === zoneId);
    if (idx === -1) return;
    const [zone] = this.zones.splice(idx, 1);
    for (const portal of zone!.portals ?? []) {
      this.portals.delete(`${portal.x},${portal.y}`);
    }
    for (const sign of zone!.signs ?? []) this.signs.delete(`${sign.x},${sign.y}`);
    this.refreshEdgeProfiles();
    this.dropZoneChunks(zone!);
  }

  /**
   * Swap a zone in place, keeping its slot in the overlay order — a
   * live map-editor save must not change which zone wins overlaps or
   * which spawn the world reports. Unknown ids append like addZone.
   */
  replaceZone(zone: ZoneDef): void {
    const idx = this.zones.findIndex((z) => z.id === zone.id);
    if (idx === -1) {
      this.addZone(zone);
      return;
    }
    const old = this.zones[idx]!;
    for (const portal of old.portals ?? []) {
      this.portals.delete(`${portal.x},${portal.y}`);
    }
    for (const sign of old.signs ?? []) this.signs.delete(`${sign.x},${sign.y}`);
    this.zones[idx] = zone;
    for (const portal of zone.portals ?? []) {
      this.portals.set(`${portal.x},${portal.y}`, portal);
    }
    for (const sign of zone.signs ?? []) this.signs.set(`${sign.x},${sign.y}`, sign);
    this.refreshEdgeProfiles();
    // Old and new rects can differ (resize/move) — drop both.
    this.dropZoneChunks(old);
    this.dropZoneChunks(zone);
  }

  /**
   * THE EDGE-HARMONY LAW: every surface zone publishes its border's
   * terrain intentions to the live registry the worldgen fields blend
   * toward. Cave planes sit in solid rock — they claim nothing from a
   * wilderness they don't touch, so only the surface plane publishes.
   */
  private refreshEdgeProfiles(): void {
    if (this.plane.id !== SURFACE_PLANE_ID) return;
    replaceZoneEdgeProfiles(
      this.zones
        .map((z) => zoneEdgeProfileOf(z))
        .filter((p): p is NonNullable<typeof p> => p !== null),
    );
  }

  zoneById(zoneId: string): ZoneDef | undefined {
    return this.zones.find((z) => z.id === zoneId);
  }

  /** The live authored-zone list, in overlay order. */
  get zoneDefs(): readonly ZoneDef[] {
    return this.zones;
  }

  portalAt(tx: number, ty: number): PortalDef | undefined {
    return this.portals.get(`${tx},${ty}`);
  }

  /** The authored words on the sign tile at these coordinates, if any. */
  signAt(tx: number, ty: number): ZoneSign | undefined {
    return this.signs.get(`${tx},${ty}`);
  }

  /** Every authored sign inside a chunk — the streaming unit. */
  signsInChunk(cx: number, cy: number): ZoneSign[] {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const out: ZoneSign[] = [];
    // Signs are a few hundred world-wide at most: a scan beats keeping
    // a second per-chunk index in sync with every zone swap.
    for (const sign of this.signs.values()) {
      if (
        sign.x >= x0 &&
        sign.x < x0 + CHUNK_SIZE &&
        sign.y >= y0 &&
        sign.y < y0 + CHUNK_SIZE
      ) {
        out.push(sign);
      }
    }
    return out;
  }

  /**
   * Invalidate cached chunks the zone covers so they regenerate — plus
   * the edge-harmony reach around it: the border's terrain intentions
   * (and the basin damp, the farthest arm) shape chunks the rect never
   * touches, and a moved or edited border must re-shape them.
   */
  private dropZoneChunks(zone: ZoneDef): void {
    // The pristine memo holds zone overlays too — a zone change makes
    // every memoized chunk suspect (pre-existing staleness, caught
    // when the memo grew for the growth engine's disc scans).
    this.pristineMemo.length = 0;
    const pad = EDGE_BASIN_DAMP_RANGE + 4;
    const c0x = Math.floor((zone.origin.x - pad) / CHUNK_SIZE);
    const c0y = Math.floor((zone.origin.y - pad) / CHUNK_SIZE);
    const c1x = Math.floor((zone.origin.x + zone.width - 1 + pad) / CHUNK_SIZE);
    const c1y = Math.floor((zone.origin.y + zone.height - 1 + pad) / CHUNK_SIZE);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        this.chunks.delete(chunkKey(cx, cy));
      }
    }
  }

  /** The spawn point of the first zone that declares one. */
  get spawn(): Vec2 {
    for (const zone of this.zones) {
      if (zone.spawn) return zone.spawn;
    }
    return { x: 8, y: 8 };
  }

  /**
   * The spawn point a specific zone declares, if it does — reads the
   * live zone list, so a hot-reloaded zone moves its spawn with it.
   * The awakening flow (config.startZoneId) resolves through this.
   */
  spawnOf(zoneId: string): Vec2 | undefined {
    for (const zone of this.zones) {
      if (zone.id === zoneId && zone.spawn) return zone.spawn;
    }
    return undefined;
  }

  /**
   * The NEAREST settled spawn ON THIS PLANE, or null if no zone here
   * declares one. The full respawn law (scratch planes rescue home,
   * planes with no hearth fall to the world spawn) lives with the
   * plane registry — this plane only answers for its own hearths.
   */
  nearestSpawnTo(x: number, y: number): Vec2 | null {
    let best: Vec2 | null = null;
    let bestD = Infinity;
    for (const zone of this.zones) {
      if (!zone.spawn) continue;
      const d = Math.hypot(zone.spawn.x - x, zone.spawn.y - y);
      if (d < bestD) {
        bestD = d;
        best = zone.spawn;
      }
    }
    return best;
  }

  /** Player-built tiles, reapplied whenever a chunk regenerates. */
  private readonly builtTiles = new Map<string, { tile: number; owner: number; prevTile: number }>();
  /**
   * chunkKey → tile keys ("tx,ty") — one such index per overlay ledger
   * (built, hung, crops, growth), so ensure() reapplies only its own
   * chunk's entries. Without it every chunk generation swept EVERY
   * ledger world-wide, splitting keys that could never land in the
   * chunk — O(world) per chunk. An overwrite at the same key is a
   * no-op here (same key, same chunk); only a true unregister removes.
   */
  private readonly builtByChunk = new Map<string, Set<string>>();

  /** Add a tile key to a per-chunk index. */
  private static chunkIndexAdd(
    index: Map<string, Set<string>>,
    tx: number,
    ty: number,
    key: string,
  ): void {
    const ck = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    let set = index.get(ck);
    if (!set) index.set(ck, (set = new Set()));
    set.add(key);
  }

  /** Remove a tile key from a per-chunk index, dropping empty sets. */
  private static chunkIndexRemove(
    index: Map<string, Set<string>>,
    tx: number,
    ty: number,
    key: string,
  ): void {
    const ck = chunkKey(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    const set = index.get(ck);
    if (set) {
      set.delete(key);
      if (set.size === 0) index.delete(ck);
    }
  }
  /**
   * Owner → built-tile keys ("tx,ty") — THE HEARTH WATCH's index: a
   * claim ring grows to cover its owner's homestead, so the flood of
   * one settler's tiles must be readable without walking the world.
   */
  private readonly builtByOwner = new Map<number, Set<string>>();

  registerBuilt(tx: number, ty: number, tile: number, owner: number, prevTile: number): void {
    // THE LAYER LAW (building v2): prev_tile captures what stood here
    // AT THIS BUILD — a wall raised on your floor remembers the floor.
    // Demolish restores exactly one layer; a restored player floor is
    // re-registered with the pristine ground (naturalGround) beneath
    // it, so the chain stays honest at depth 1.
    const key = `${tx},${ty}`;
    const existing = this.builtTiles.get(key);
    if (existing && existing.owner !== owner) this.builtByOwner.get(existing.owner)?.delete(key);
    this.builtTiles.set(key, { tile, owner, prevTile });
    let mine = this.builtByOwner.get(owner);
    if (!mine) this.builtByOwner.set(owner, (mine = new Set()));
    mine.add(key);
    WorldSource.chunkIndexAdd(this.builtByChunk, tx, ty, key);
    this.setGround(tx, ty, tile);
  }

  unregisterBuilt(tx: number, ty: number): void {
    const key = `${tx},${ty}`;
    const existing = this.builtTiles.get(key);
    if (existing) this.builtByOwner.get(existing.owner)?.delete(key);
    this.builtTiles.delete(key);
    WorldSource.chunkIndexRemove(this.builtByChunk, tx, ty, key);
  }

  builtAt(tx: number, ty: number): { tile: number; owner: number; prevTile: number } | undefined {
    return this.builtTiles.get(`${tx},${ty}`);
  }

  /** One settler's built-tile keys ("tx,ty"), or nothing. */
  builtKeysOf(owner: number): ReadonlySet<string> | undefined {
    return this.builtByOwner.get(owner);
  }

  /**
   * THE SECOND LAYER: player-hung wall decor, the detail-lane mirror
   * of builtTiles — reapplied whenever a chunk regenerates, indexed by
   * owner for the own-work overlay's second lane.
   */
  private readonly builtDetails = new Map<
    string,
    { detail: number; owner: number; prevDetail: number }
  >();
  private readonly builtDetailsByOwner = new Map<number, Set<string>>();
  /** chunkKey → hung-detail keys — the detail lane's ensure() index. */
  private readonly builtDetailsByChunk = new Map<string, Set<string>>();

  registerBuiltDetail(tx: number, ty: number, detail: number, owner: number, prevDetail: number): void {
    const key = `${tx},${ty}`;
    const existing = this.builtDetails.get(key);
    if (existing && existing.owner !== owner) this.builtDetailsByOwner.get(existing.owner)?.delete(key);
    this.builtDetails.set(key, { detail, owner, prevDetail });
    let mine = this.builtDetailsByOwner.get(owner);
    if (!mine) this.builtDetailsByOwner.set(owner, (mine = new Set()));
    mine.add(key);
    WorldSource.chunkIndexAdd(this.builtDetailsByChunk, tx, ty, key);
    this.setDetail(tx, ty, detail);
  }

  unregisterBuiltDetail(tx: number, ty: number): void {
    const key = `${tx},${ty}`;
    const existing = this.builtDetails.get(key);
    if (existing) this.builtDetailsByOwner.get(existing.owner)?.delete(key);
    this.builtDetails.delete(key);
    WorldSource.chunkIndexRemove(this.builtDetailsByChunk, tx, ty, key);
  }

  builtDetailAt(
    tx: number,
    ty: number,
  ): { detail: number; owner: number; prevDetail: number } | undefined {
    return this.builtDetails.get(`${tx},${ty}`);
  }

  /** One settler's hung-detail keys ("tx,ty"), or nothing. */
  builtDetailKeysOf(owner: number): ReadonlySet<string> | undefined {
    return this.builtDetailsByOwner.get(owner);
  }

  /**
   * Planted-crop stage tiles, applied over builtTiles so a crop wins
   * over its plot's stored Tilled ground when a chunk regenerates.
   */
  private readonly cropTiles = new Map<string, number>();
  /** chunkKey → crop tile keys — ensure()'s crop-lane index. */
  private readonly cropsByChunk = new Map<string, Set<string>>();

  registerCropTile(tx: number, ty: number, tile: number): void {
    const key = `${tx},${ty}`;
    this.cropTiles.set(key, tile);
    WorldSource.chunkIndexAdd(this.cropsByChunk, tx, ty, key);
    this.setGround(tx, ty, tile);
  }

  unregisterCropTile(tx: number, ty: number): void {
    this.cropTiles.delete(`${tx},${ty}`);
    WorldSource.chunkIndexRemove(this.cropsByChunk, tx, ty, `${tx},${ty}`);
  }

  /** A crop stands here — the growth beat's claim guard reads this. */
  hasCropTile(tx: number, ty: number): boolean {
    return this.cropTiles.has(`${tx},${ty}`);
  }

  // ---------------------------------------- THE SECOND GROWTH ledger

  /**
   * Wild harvests still healing (docs/second-growth-plan.md Phase 1).
   * DEVIATIONS ONLY: the untouched world never simulates — a row exists
   * only where a hand harvested wild ground, and a healed row is
   * unregistered. Registration is a map write and nothing else: the
   * live felling path patches the tile itself, and boot-time rehydrate
   * runs before any chunk exists — the ensure() overlay serves every
   * later read.
   */
  private readonly growthRows = new Map<string, GrowthRow>();
  /** chunkKey → growth-row keys — ensure()'s regrowth-lane index. */
  private readonly growthByChunk = new Map<string, Set<string>>();

  registerGrowth(row: GrowthRow): void {
    const key = `${row.tx},${row.ty}`;
    this.growthRows.set(key, row);
    WorldSource.chunkIndexAdd(this.growthByChunk, row.tx, row.ty, key);
  }

  unregisterGrowth(tx: number, ty: number): void {
    this.growthRows.delete(`${tx},${ty}`);
    WorldSource.chunkIndexRemove(this.growthByChunk, tx, ty, `${tx},${ty}`);
  }

  growthAt(tx: number, ty: number): GrowthRow | undefined {
    return this.growthRows.get(`${tx},${ty}`);
  }

  /** The live ledger, for the growth beat to walk. */
  get growthLedger(): ReadonlyMap<string, GrowthRow> {
    return this.growthRows;
  }

  /** Whether a chunk is materialized in the cache — the growth beat
   *  writes tiles only where a chunk already stands; everywhere else
   *  the ensure() overlay serves the projected truth on generation. */
  hasChunk(cx: number, cy: number): boolean {
    return this.get(cx, cy) !== undefined;
  }

  /**
   * THE KEPT AND THE WILD: which growth domain a tile belongs to,
   * decided by where its ground comes from — never by the node def.
   * Cave planes are kept whole (delves and the authored underground
   * answer to their own generators); a zone that OWNS the tile
   * (non-skip cell) answers with its mark, default kept; raw worldgen
   * ground is wild. Zones scan in reverse overlay order so the zone
   * that wins the ground also names the domain.
   */
  growthDomainAt(tx: number, ty: number): 'kept' | 'wild' {
    if (this.plane.base === 'cave') return 'kept';
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i]!;
      if (
        tx < zone.origin.x ||
        tx >= zone.origin.x + zone.width ||
        ty < zone.origin.y ||
        ty >= zone.origin.y + zone.height
      ) {
        continue;
      }
      const zi = (ty - zone.origin.y) * zone.width + (tx - zone.origin.x);
      // TILE_SKIP is transparent in the overlay and transparent here:
      // the ground beneath keeps its own domain.
      if (zone.ground[zi] === TILE_SKIP) continue;
      return zone.growth ?? 'kept';
    }
    return 'wild';
  }

  /**
   * Small MRU memo for naturalGround. Demolish bursts sample a few
   * tiles from one chunk; the growth engine's germination scans sweep
   * discs that CROSS chunk borders — a one-entry memo would regenerate
   * a chunk per row of the sweep. Four entries cover any disc that
   * touches a chunk corner. NOTE: growth deviations are deliberately
   * NOT part of pristine ground — this is the world with no hand on it.
   */
  private readonly pristineMemo: Array<{ cx: number; cy: number; chunk: ChunkData }> = [];

  /**
   * The ground as the world would deal it with no player's hand on it:
   * worldgen plus authored zone overlays, WITHOUT built tiles, crops,
   * or growth deviations. THE LAYER LAW's floor: when a demolished
   * wall restores the floor beneath it, the floor's own re-registered
   * prev_tile must be this — the terrain the very first build
   * displaced. Also THE SECOND GROWTH's seed-truth oracle: what the
   * land grows back toward.
   */
  naturalGround(tx: number, ty: number): number {
    return this.pristineChunk(tx, ty).ground[tileIndex(tx, ty)]!;
  }

  /**
   * The terrain LEVEL as the world would deal it — worldgen plus zone
   * overlays, chunk-load-free (the pristine memo). THE CLIFF-FOOT LAW's
   * server oracle: growth drift and germination compare levels through
   * this, never through live elevAt (which reads 0 for unloaded space
   * and would let a vein drift across a cliff line at the world's edge).
   */
  naturalLevel(tx: number, ty: number): number {
    return this.pristineChunk(tx, ty).elev[tileIndex(tx, ty)]!;
  }

  private pristineChunk(tx: number, ty: number): ChunkData {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const hit = this.pristineMemo.findIndex((m) => m.cx === cx && m.cy === cy);
    let entry: { cx: number; cy: number; chunk: ChunkData };
    if (hit >= 0) {
      entry = this.pristineMemo.splice(hit, 1)[0]!;
    } else {
      const chunk = this.generateBase(cx, cy);
      for (const zone of this.zones) this.overlayZone(chunk, zone);
      entry = { cx, cy, chunk };
    }
    this.pristineMemo.unshift(entry);
    if (this.pristineMemo.length > 4) this.pristineMemo.pop();
    return entry.chunk;
  }

  /** Lifetime count of chunks generated — the tick loop diffs this to
   *  attribute a slow tick to a generation burst (THE TICK NAMES ITS
   *  DEBT in gameServer.start). */
  generatedCount = 0;

  ensure(cx: number, cy: number): ChunkData {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error(`WorldSource.ensure: a non-finite chunk (${cx},${cy}) was asked for; the caller's coordinate went NaN`);
    }
    const existing = this.get(cx, cy);
    if (existing) return existing;
    this.generatedCount++;
    const chunk = this.generateBase(cx, cy);
    // Every overlay ledger reads through its per-chunk index — only
    // THIS chunk's entries, never a world-wide sweep (the indexes stay
    // in sync in the register/unregister pairs above).
    const ck = chunkKey(cx, cy);
    // THE SECOND GROWTH overlay: the harvest ledger re-stamps the WILD
    // ground before any zone, built, or crop layer — regrowth is a
    // fact of the natural land, and every human layer wins over it.
    // The stamped tile is the PURE PROJECTION at this moment (THE
    // THREE AGES), which is what makes an unloaded chunk correct the
    // instant it generates, restarts included.
    const grown = this.growthByChunk.get(ck);
    if (grown) {
      const now = Date.now();
      for (const key of grown) {
        const row = this.growthRows.get(key);
        if (row) chunk.ground[tileIndex(row.tx, row.ty)] = projectGrowth(this.seed, row, now).tile;
      }
    }
    for (const zone of this.zones) this.overlayZone(chunk, zone);
    // Player constructions survive regeneration.
    const builtKeys = this.builtByChunk.get(ck);
    if (builtKeys) {
      for (const key of builtKeys) {
        const built = this.builtTiles.get(key);
        if (!built) continue;
        const comma = key.indexOf(',');
        const tx = Number(key.slice(0, comma));
        const ty = Number(key.slice(comma + 1));
        chunk.ground[tileIndex(tx, ty)] = built.tile;
      }
    }
    // THE SECOND LAYER: hung decor survives regeneration too — after
    // overlayZone so a hanging on an authored town wall outlives the
    // zone's own detail stamp.
    const hungKeys = this.builtDetailsByChunk.get(ck);
    if (hungKeys) {
      for (const key of hungKeys) {
        const hung = this.builtDetails.get(key);
        if (!hung) continue;
        const comma = key.indexOf(',');
        const tx = Number(key.slice(0, comma));
        const ty = Number(key.slice(comma + 1));
        chunk.detail[tileIndex(tx, ty)] = hung.detail;
      }
    }
    // Crops overwrite their plot's Tilled ground.
    const cropKeys = this.cropsByChunk.get(ck);
    if (cropKeys) {
      for (const key of cropKeys) {
        const tile = this.cropTiles.get(key);
        if (tile === undefined) continue;
        const comma = key.indexOf(',');
        const tx = Number(key.slice(0, comma));
        const ty = Number(key.slice(comma + 1));
        chunk.ground[tileIndex(tx, ty)] = tile;
      }
    }
    this.set(chunk);
    return chunk;
  }

  // THE FIELD HAS NO NaN TILE (contested lands, band 8 fix pass): the
  // two doors the sim walks through every tick refuse a non-finite
  // coordinate before it reaches ensure(), whose generator would
  // otherwise index the edge law with it and bring the process down
  // (the live audit's boot loss: one NPC's position went NaN under a
  // fight). A nowhere tile is solid and unknown, which stops the
  // body where it stands; ensure() itself names the chunk it refuses.
  override isSolid(tx: number, ty: number): boolean {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return true;
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.isSolid(tx, ty);
  }

  override tileAt(tx: number, ty: number): number | undefined {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return undefined;
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.tileAt(tx, ty);
  }

  private overlayZone(chunk: ChunkData, zone: ZoneDef): void {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseY = chunk.cy * CHUNK_SIZE;
    // Intersection of the chunk rect and the zone rect, in world tiles.
    const x0 = Math.max(baseX, zone.origin.x);
    const y0 = Math.max(baseY, zone.origin.y);
    const x1 = Math.min(baseX + CHUNK_SIZE, zone.origin.x + zone.width);
    const y1 = Math.min(baseY + CHUNK_SIZE, zone.origin.y + zone.height);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const zi = (ty - zone.origin.y) * zone.width + (tx - zone.origin.x);
        // TILE_SKIP cells are transparent: the ground beneath (procgen
        // or an earlier zone) shows through untouched — elev included,
        // or a skipped cell would flatten the terrain it reveals.
        if (zone.ground[zi] === TILE_SKIP) continue;
        const ci = tileIndex(tx, ty);
        chunk.ground[ci] = zone.ground[zi]!;
        chunk.detail[ci] = zone.detail[zi] === TILE_SKIP ? 0 : zone.detail[zi]!;
        // A zone without an elev layer is flat ground: any generated
        // plateau under it is levelled (it carries no cliffs to fence
        // one). Zones WITH a layer stamp it verbatim — ZoneBuilder
        // already validated its fencing at build time.
        chunk.elev[ci] = zone.elev ? zone.elev[zi]! : 0;
      }
    }
  }
}

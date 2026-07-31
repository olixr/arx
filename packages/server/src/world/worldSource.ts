import {
  CHUNK_SIZE,
  ChunkStore,
  TILE_SKIP,
  chunkKey,
  tileIndex,
  type ChunkData,
  type Vec2,
} from '@arx/shared';
import type { GrowthRow, PortalDef, ZoneDef, ZoneSign } from '@arx/content';
import {
  DARK_BAND_Y,
  EDGE_BASIN_DAMP_RANGE,
  generateChunk,
  projectGrowth,
  replaceZoneEdgeProfiles,
  zoneEdgeProfileOf,
} from '@arx/content';

/**
 * The server's world: procedural chunks with authored zones stamped on
 * top, generated lazily and cached. Implements CollisionSource (via
 * ChunkStore) — movement and AI query it directly. Zones can be added
 * and removed at runtime (delve instances).
 */
export class WorldSource extends ChunkStore {
  private readonly zones: ZoneDef[];
  private readonly portals = new Map<string, PortalDef>();
  /** Authored sign copy, addressed by the tile it stands on. */
  private readonly signs = new Map<string, ZoneSign>();

  constructor(
    private readonly seed: number,
    initialZones: ZoneDef[],
  ) {
    super();
    this.zones = [];
    for (const zone of initialZones) this.addZone(zone);
  }

  addZone(zone: ZoneDef): void {
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
   * toward. Dark-band and instance zones sit in solid cave — they
   * claim nothing from a wilderness they don't touch.
   */
  private refreshEdgeProfiles(): void {
    replaceZoneEdgeProfiles(
      this.zones
        .filter((z) => z.origin.y < DARK_BAND_Y)
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
   * Where death sends you: the NEAREST settled spawn. With Dawnmead
   * the world's only hearth that means the Waking Ring; as new
   * settlements declare spawns, the walk back shortens on its own.
   * Underground deaths (the dark band, dungeons, delves) always
   * surface at the world spawn: distance means nothing down there.
   */
  respawnAt(x: number, y: number): Vec2 {
    // The instance band always surfaces — the rescue law: a personal
    // dungeon may be torn down under the corpse, so its dead go home.
    if (y >= 8192) return this.spawn;
    // Everywhere else the nearest hearth answers — but only within
    // the SAME band: the authored underground (the Undercroft's
    // Landing) catches its own dead, and a surface death can never
    // wake in the dark just because the dark was closer as the crow
    // digs. No band-mate found ⇒ the world spawn, as ever.
    const underground = y >= 512;
    let best = this.spawn;
    let bestD = Infinity;
    for (const zone of this.zones) {
      if (!zone.spawn) continue;
      if (zone.spawn.y >= 512 !== underground) continue;
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
    this.setGround(tx, ty, tile);
  }

  unregisterBuilt(tx: number, ty: number): void {
    const key = `${tx},${ty}`;
    const existing = this.builtTiles.get(key);
    if (existing) this.builtByOwner.get(existing.owner)?.delete(key);
    this.builtTiles.delete(key);
  }

  builtAt(tx: number, ty: number): { tile: number; owner: number; prevTile: number } | undefined {
    return this.builtTiles.get(`${tx},${ty}`);
  }

  /** One settler's built-tile keys ("tx,ty"), or nothing. */
  builtKeysOf(owner: number): ReadonlySet<string> | undefined {
    return this.builtByOwner.get(owner);
  }

  /**
   * Planted-crop stage tiles, applied over builtTiles so a crop wins
   * over its plot's stored Tilled ground when a chunk regenerates.
   */
  private readonly cropTiles = new Map<string, number>();

  registerCropTile(tx: number, ty: number, tile: number): void {
    this.cropTiles.set(`${tx},${ty}`, tile);
    this.setGround(tx, ty, tile);
  }

  unregisterCropTile(tx: number, ty: number): void {
    this.cropTiles.delete(`${tx},${ty}`);
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

  registerGrowth(row: GrowthRow): void {
    this.growthRows.set(`${row.tx},${row.ty}`, row);
  }

  unregisterGrowth(tx: number, ty: number): void {
    this.growthRows.delete(`${tx},${ty}`);
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
   * The dark band is kept (delves and the authored underground answer
   * to their own generators); a zone that OWNS the tile (non-skip
   * cell) answers with its mark, default kept; raw worldgen ground is
   * wild. Zones scan in reverse overlay order so the zone that wins
   * the ground also names the domain.
   */
  growthDomainAt(tx: number, ty: number): 'kept' | 'wild' {
    if (ty >= DARK_BAND_Y) return 'kept';
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
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const hit = this.pristineMemo.findIndex((m) => m.cx === cx && m.cy === cy);
    let entry: { cx: number; cy: number; chunk: ChunkData };
    if (hit >= 0) {
      entry = this.pristineMemo.splice(hit, 1)[0]!;
    } else {
      const chunk = generateChunk(this.seed, cx, cy);
      for (const zone of this.zones) this.overlayZone(chunk, zone);
      entry = { cx, cy, chunk };
    }
    this.pristineMemo.unshift(entry);
    if (this.pristineMemo.length > 4) this.pristineMemo.pop();
    return entry.chunk.ground[tileIndex(tx, ty)]!;
  }

  ensure(cx: number, cy: number): ChunkData {
    const existing = this.get(cx, cy);
    if (existing) return existing;
    const chunk = generateChunk(this.seed, cx, cy);
    // THE SECOND GROWTH overlay: the harvest ledger re-stamps the WILD
    // ground before any zone, built, or crop layer — regrowth is a
    // fact of the natural land, and every human layer wins over it.
    // The stamped tile is the PURE PROJECTION at this moment (THE
    // THREE AGES), which is what makes an unloaded chunk correct the
    // instant it generates, restarts included.
    if (this.growthRows.size > 0) {
      const baseX = cx * CHUNK_SIZE;
      const baseY = cy * CHUNK_SIZE;
      const now = Date.now();
      for (const row of this.growthRows.values()) {
        if (
          row.tx >= baseX &&
          row.tx < baseX + CHUNK_SIZE &&
          row.ty >= baseY &&
          row.ty < baseY + CHUNK_SIZE
        ) {
          chunk.ground[tileIndex(row.tx, row.ty)] = projectGrowth(this.seed, row, now).tile;
        }
      }
    }
    for (const zone of this.zones) this.overlayZone(chunk, zone);
    // Player constructions survive regeneration.
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    for (const [key, built] of this.builtTiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx! >= baseX && tx! < baseX + CHUNK_SIZE && ty! >= baseY && ty! < baseY + CHUNK_SIZE) {
        chunk.ground[tileIndex(tx!, ty!)] = built.tile;
      }
    }
    // Crops overwrite their plot's Tilled ground.
    for (const [key, tile] of this.cropTiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx! >= baseX && tx! < baseX + CHUNK_SIZE && ty! >= baseY && ty! < baseY + CHUNK_SIZE) {
        chunk.ground[tileIndex(tx!, ty!)] = tile;
      }
    }
    this.set(chunk);
    return chunk;
  }

  override isSolid(tx: number, ty: number): boolean {
    this.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
    return super.isSolid(tx, ty);
  }

  override tileAt(tx: number, ty: number): number | undefined {
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

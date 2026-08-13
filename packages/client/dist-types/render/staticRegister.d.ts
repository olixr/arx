/**
 * THE STATIC REGISTER — the collectRaisedTiles classification,
 * compiled per chunk (THE STANDING WORLD epic, phase 1).
 *
 * The world pass used to re-decide every visible tile's route (wall?
 * ramp run? garrison gate? crop?) every frame — ~3,000 tile
 * classifications and a dozen probe reads each, 120 times a second,
 * for answers that only change on a chunk rev bump. The register runs
 * the SAME per-tile decision once per (chunk data identity, rev) and
 * stores world-space member descriptors; the renderer replays them in
 * exact scan order each frame and mints the DrawItems fresh (item
 * builders capture camera projections, reveal heights and the frame
 * clock at build time — descriptors never cache any of that).
 *
 * THE REGISTER IS THE SCAN, COMPILED: one classifier serves both the
 * per-frame legacy scan (the always-correct fallback) and the register
 * build, so the two paths cannot drift. Every input that changes a
 * classification must flow through a chunk rev bump (tile patches and
 * detail patches do; touchNeighbors covers cross-border probes, which
 * all reach at most one chunk over).
 */
export declare const enum RaisedKind {
    /** N/S stair flight merged across its E-W run (STAIR-RUN LAW). */
    RampRun = 0,
    /** E/W flight — stays per-tile (each row its own y-sort slice). */
    RampSingle = 1,
    /** Gate in a N-S curtain, merged vertically, north anchor. */
    GarrisonSideGate = 2,
    /** E-W gatehouse run, merged, west anchor. */
    GarrisonGate = 3,
    /** Curtain wall / 45° turn (diag resolved at emission). */
    GarrisonWall = 4,
    /** Doorway edge-on in a N-S wall run (may merge vertically). */
    SideDoorway = 5,
    /** South-facing doorway (wide runs merge E-W, west anchor). */
    Doorway = 6,
    Arch = 7,
    Portal = 8,
    Pillar = 9,
    Rail = 10,
    /** Bridge deck tile that grows parapet rails (multi-item). */
    BridgeRails = 11,
    /** 45° notch fill on a bridge span — diagonal parapet rail. */
    DeckFillRail = 12,
    DiagWall = 13,
    Wall = 14,
    /** Everything through objectItem: props, trees, crops, stumps. */
    Generic = 15
}
export interface RaisedMember {
    kind: RaisedKind;
    /** Ground tile id at the anchor. */
    tile: number;
    /** Anchor tile (run anchor for merged runs; north anchor for
     *  vertical runs, west anchor for horizontal ones). */
    tx: number;
    ty: number;
    /** Run length in tiles (1 for singles). Vertical for
     *  GarrisonSideGate/SideDoorway, horizontal for the rest. */
    len: number;
    /** Easternmost tile the member covers (== tx for verticals). */
    endX: number;
    /** Admitted by the deep-south / side-band pads (trees, garrison,
     *  portals — tall silhouettes that poke into view from far off). */
    treeLike: boolean;
}
/** Everything the classifier needs to ask the world / the renderer.
 *  Injected so the classifier stays pure and testable — the renderer
 *  wires these to its own private probes and shared tile sets. */
export interface RegisterHost {
    groundAt(tx: number, ty: number): number | undefined;
    elevAt(tx: number, ty: number): number;
    isTree(t: number): boolean;
    isGarrison(t: number): boolean;
    /** doorInfo(t) !== null (garrison gate vs curtain mass). */
    hasDoorInfo(t: number): boolean;
    /** The renderer's building-doorway set (fence + garrison excluded). */
    isDoor(t: number): boolean;
    doorIsWide(t: number): boolean;
    isDiagWall(t: number): boolean;
    isWall(t: number): boolean;
    isCliff(t: number): boolean;
    isRamp(t: number): boolean;
    isArch(t: number): boolean;
    isPortal(t: number): boolean;
    isPillar(t: number): boolean;
    isRail(t: number): boolean;
    isBridge(t: number): boolean;
    isWater(t: number): boolean;
    /** def.raised || Stump || crop — the generic-object admission. */
    isRaisedLike(t: number): boolean;
    /** rampDir(tx,ty)[1] — 0 for E/W flights. */
    rampDirY(tx: number, ty: number): number;
    isSideDoorway(tx: number, ty: number): boolean;
    isGarrisonSideGate(tx: number, ty: number): boolean;
    isDockAt(tx: number, ty: number): boolean;
    /** deckFill(tx,ty)?.family === 'bridge'. */
    deckFillIsBridge(tx: number, ty: number): boolean;
}
/**
 * Classify one tile exactly the way collectRaisedTiles decides its
 * routes — same order, same probes. Returns null for tiles that emit
 * nothing (empty ground, cliffs, plain water, flat detail). Run tiles
 * all return the same anchored member; callers dedupe by anchor.
 */
export declare function classifyRaised(host: RegisterHost, tx: number, ty: number): RaisedMember | null;
/** Per-chunk register rows: rows[localTy] lists the members whose
 *  first in-chunk tile sits on that world row, in west-to-east
 *  encounter order (the scan's own order — stable-sort tie order is
 *  load-bearing). Vertical runs appear once per spanned in-chunk row
 *  so any first-visible row can encounter them; the frame-local
 *  runSeen dedupe keeps emission single, exactly like the scan. */
export type RegisterRows = Array<RaisedMember[] | undefined>;
/**
 * Compile one chunk. chunkSize tiles square at (cx*chunkSize,
 * cy*chunkSize). Pure: everything flows through the host.
 */
export declare function buildRegisterRows(host: RegisterHost, cx: number, cy: number, chunkSize: number): RegisterRows;
/**
 * THE STANDING WORLD phase 2 — band stretch planning. A stretch is a
 * maximal run of consecutive BANDABLE members within one register row:
 * it splits at every non-bandable member (a doorway inside a wall run
 * must keep its exact stable-sort tie position between its neighbours)
 * but rides over empty ground (nothing paints there, so merging across
 * gaps costs nothing and keeps bands big). Ramp runs stay SINGLETON
 * stretches: the same run registers in every chunk it touches, and the
 * frame's runSeen dedupe must be able to skip a whole band.
 */
export interface StretchRef {
    /** Member index range [i0, i1] inclusive, into the row's list. */
    i0: number;
    i1: number;
    /** Stable identity across register rebuilds: local row + anchor x. */
    key: number;
}
export declare function planStretches(rows: RegisterRows, bandable: (m: RaisedMember) => boolean): Array<StretchRef[] | undefined>;
/** FNV-1a step for band content signatures. */
export declare function mixSig(h: number, v: number): number;
/** One baked sort-bucket of a stretch: all members whose emitted items
 *  share an exact (sortY, strat, elevated) key, painted in emission
 *  order into one pooled canvas (THE BAND KEEPS THE SHELF). */
export interface BandBucket {
    canvas: HTMLCanvasElement;
    sortY: number;
    strat: number | undefined;
    elevated: boolean;
    /** Canvas-space coords where world (wx0, rowY) landed at bake. */
    padL: number;
    padT: number;
}
/** A stretch's bake: identity (content sig + outline + grid) and the
 *  sort-bucket canvases. gridPx mismatch alone leaves the bake usable
 *  (the blit scale-compensates by the pure grid ratio) while a paced
 *  re-bake replaces it. */
export interface StretchBake {
    sig: number;
    gridPx: number;
    outlined: boolean;
    wx0: number;
    wx1: number;
    rowY: number;
    buckets: BandBucket[];
    /** Any probe item carried a drawShadow at bake time. SHADOWS NEVER
     *  BAKE — and never REPLAY (a938b7c): the blit re-mints member
     *  items fresh inside the shadow passes and runs only their live
     *  closures. This flag just spares castless stretches the mint. */
    casts: boolean;
    used: number;
}
/** The renderer's per-chunk register entry: compiled rows + planned
 *  band stretches + the member→stretch index, all rebuilt together on
 *  a rev bump. Data identity + rev ARE the cache key. */
export interface ChunkRegister<TData> {
    data: TData;
    rev: number;
    rows: RegisterRows;
    stretches: Array<StretchRef[] | undefined>;
    stretchSigs: Array<Int32Array | undefined>;
    memberStretch: Array<Int16Array | undefined>;
}
//# sourceMappingURL=staticRegister.d.ts.map
/**
 * THE BAND BUDGET IS A FUSE, NOT A BROOM — the static layer's memory
 * law, as pure arithmetic.
 *
 * A band canvas is exactly as wide as the wall run it bakes, so its
 * cost is set by the WORLD and not by the renderer. A town facade is a
 * few hundred KB. One row of the Undercroft — a cavern district carved
 * out of a solid rock mass, where every row of the dark is a maximal
 * wall run — asked for 11MB at close zoom on a retina panel, and a
 * single screen of the deep galleries asked for ~380MB against a 64MB
 * budget.
 *
 * This module exists because the metering, written inline, grew a
 * failure mode that read as healthy on every counter the game had.
 * The old shape baked FIRST and swept AFTER: every band on screen was
 * baked, the post-frame sweep found the budget blown, and the
 * coldest-first loop emptied the cache — including the bands that very
 * frame had just baked and blitted. The next frame re-baked all of
 * them. Measured in the galleries: 18 bakes and 193MB of fresh canvas
 * backing store PER FRAME, at a serene 120fps, for as long as the
 * player stood there — ~20GB/s of allocate-and-discard that walks the
 * browser's renderer process into an OOM kill while frame time, entity
 * count and the JS heap all read normal. It presented as a crash with
 * a PLACE: the deep galleries killed the tab in seconds, and one
 * screen west the game was fine. Silverfall's dense city was doing the
 * same thing on the surface at 78MB/frame.
 *
 * The laws pinned here, in order of who wins:
 *
 *  1. A BAND THIS FRAME NEEDED IS NOT COLD. The sweep may never evict
 *     an entry whose `used` is the current frame. Evicting what you
 *     just baked IS the thrash: it pins the hit rate at exactly zero
 *     and turns a cache into an allocator. Every other law here is
 *     defence in depth; this one is the bug.
 *  2. THE BUDGET IS AN ADMISSION GATE. Decide BEFORE painting. A bake
 *     that will not fit alongside the bands already standing is
 *     declined and the stretch draws live — THE STILL-WORLD BARGAIN,
 *     the layer's own designed pressure valve. Because the gate prices
 *     the whole ledger rather than this frame's appetite, the budget
 *     is a true ceiling on band pixels and not a hope.
 *  3. ONE BAND IS NEVER A BUDGET. A band past the per-band ceiling is
 *     refused outright. Blitting an 11MB canvas to spare 34 flat wall
 *     tiles is the worst trade in the renderer, and letting one band
 *     claim a quarter of the budget makes admission itself oscillate
 *     at the boundary. (Upstream, A SHELF NOT A WALL cuts stretches
 *     every BAND_MAX_SPAN tiles so honest bands rarely reach it.)
 *  4. THE SWEEP KEEPS THE HEADROOM. It aims at RELIEF, not at the
 *     ceiling: the gap between the two IS the room the gate needs to
 *     admit the ground you are walking onto. A sweep that only fired
 *     at the ceiling would let a long walk fill the ledger with cold
 *     bands and then latch the gate shut — the layer would quietly
 *     stop working a few streets from where it was switched on.
 *  5. A POOL IS BYTES, NOT SLOTS. A recycled canvas keeps its full
 *     backing store, so a slot count bounds nothing: the 40-slot
 *     sprite pool was measured holding 369MB of idle pixels, because
 *     what it was recycling were cave-row bands. A canvas too big to
 *     be worth parking is dropped to GC instead.
 *
 * The ledger these laws read must itself be exact — see dropBand /
 * dropAllBands in the renderer. A `.clear()` that skipped the release
 * (THE CROSSING did) left phantom bytes that narrowed the budget by
 * ~40MB per plane crossing and never gave them back, which is how a
 * ceiling silently becomes a floor.
 */

/** Hard ceiling on live band pixels (law 2). */
export const BAND_BUDGET_BYTES = 64 * 1048576;
/** What the sweep aims for, leaving the gate its headroom (law 4). */
export const BAND_RELIEF_BYTES = 48 * 1048576;
/** No single band may claim more than this — it draws live (law 3). */
export const BAND_ONE_MAX_BYTES = 6 * 1048576;

/**
 * Canvas pool ceilings (law 5).
 *
 * THE POOL IS SIZED FOR THE LANE THAT USES IT. Law 5 was written
 * against the BAND ledger, where 40 slots were found holding 369MB
 * because each slot was a multi-megabyte cave-row band. The byte cap
 * and the per-slot ceiling fixed that — but the slot count stayed at
 * 40, and the same pool serves the SPRITE lane, whose canvases are
 * ~50KB and whose turnover is two orders of magnitude larger: walking
 * into a new scene retires well over a thousand tree, prop and flora
 * sprites at once. A 40-slot pool can catch about 3% of that, so 97%
 * of it was allocated fresh and thrown away — measured at 697MB over
 * five minutes of travel, the largest remaining source of canvas
 * churn in the client once the ground cache was fixed.
 *
 * So the slot count is now derived rather than guessed: it is exactly
 * what the sprite caches are able to hand back — 640 tree bodies + 640
 * tree shadows + 200 prop/flora sprites — because a pool smaller than
 * the largest eviction it must absorb is a pool that will miss, and
 * one larger than that can never be filled. The two BYTE ceilings,
 * which are what law 5 is actually about, stand unchanged in spirit:
 * no single canvas over 4MB is ever parked (that is what kept the
 * bands out), and the pool as a whole is still bounded by bytes, not
 * by the slot count. At the sprite lane's measured mean of ~54KB the
 * byte cap binds first, around 1,200 canvases — so the ceiling that
 * actually holds is a byte ceiling, exactly as law 5 requires.
 */
export const POOL_MAX_SLOTS = 1480;
export const POOL_MAX_BYTES = 64 * 1048576;
export const POOL_SLOT_MAX_BYTES = 4 * 1048576;


/** Why a bake was let through, or what turned it away. */
export const enum BandVerdict {
  Admit = 0,
  /** Past the per-band ceiling: this band will never be worth baking. */
  TooBig = 1,
  /** The ledger is committed: this VIEW cannot hold another band. */
  Full = 2,
}

/**
 * Law 2 + law 3, in one comparison each. `bytes` is the bake's whole
 * cost — one canvas per sort bucket — which is why the caller must ask
 * AFTER the probe pass has counted the buckets and BEFORE a single
 * canvas is acquired.
 */
export function admitBand(ledgerBytes: number, bytes: number): BandVerdict {
  if (bytes > BAND_ONE_MAX_BYTES) return BandVerdict.TooBig;
  if (ledgerBytes + bytes > BAND_BUDGET_BYTES) return BandVerdict.Full;
  return BandVerdict.Admit;
}

/** One band in the cache, as the sweep needs to see it. */
export interface BandSweepEntry {
  key: string;
  /** Frame number this band was last drawn with. */
  used: number;
  /** Chunk coordinates the band's key names. */
  cx: number;
  cy: number;
}

/** Law 4's trigger: the sweep runs at RELIEF, not at the ceiling. */
export function bandSweepNeeded(count: number, ledgerBytes: number): boolean {
  return count > 240 || ledgerBytes > BAND_RELIEF_BYTES;
}

/** When the caller may stop dropping. */
export function bandSweepRelieved(count: number, ledgerBytes: number): boolean {
  return count <= 200 && ledgerBytes <= BAND_RELIEF_BYTES;
}

/**
 * The drop order: everything the sweep is ALLOWED to take, distant
 * before near and coldest first within each. Bands this frame drew
 * with are absent by law 1 — which means this list can legitimately
 * come back EMPTY while the ledger is over relief. That is not a
 * failure: it says the current view's own working set is the whole
 * budget, the surplus already went live at the gate, and there is
 * nothing to take that would not simply be re-baked next frame.
 */
export function planBandSweep(
  entries: readonly BandSweepEntry[],
  frameNo: number,
  camCx: number,
  camCy: number,
): string[] {
  const far: BandSweepEntry[] = [];
  const near: BandSweepEntry[] = [];
  for (const e of entries) {
    if (e.used === frameNo) continue; // law 1
    if (Math.abs(e.cx - camCx) > 4 || Math.abs(e.cy - camCy) > 4) far.push(e);
    else near.push(e);
  }
  far.sort((a, b) => a.used - b.used);
  near.sort((a, b) => a.used - b.used);
  const out: string[] = [];
  for (const e of far) out.push(e.key);
  for (const e of near) out.push(e.key);
  return out;
}

/** Law 5: may this canvas be parked for reuse, or does it go to GC? */
export function poolAdmits(poolCount: number, poolBytes: number, bytes: number): boolean {
  if (bytes > POOL_SLOT_MAX_BYTES) return false;
  if (poolCount >= POOL_MAX_SLOTS) return false;
  return poolBytes + bytes <= POOL_MAX_BYTES;
}

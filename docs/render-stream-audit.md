# THE STREAM NEVER STUTTERS — render & streaming performance audit

Audited 2026-08-02, four parallel deep-reads (chunk pipeline, menu/UI
path, entity lifecycle, frame-loop hygiene) plus server generation
benchmarks. This doc records the mechanism of the reported stutter, what
shipped in `d09abab`, and the prioritized roadmap of everything else the
audit surfaced. Read alongside the render-performance laws (glow
sprites, lamp patch cache, adaptive resolution f98ae65/335224a, THE
DEVICE GRID 2254e96).

## The mechanism (as-found)

The reported symptoms — "chunk loads pause and redraw the screen",
"menus hitch", "elements phase out and redraw" — were one cascade with
four amplifiers:

1. **Fan-out.** One border crossing streams 5 chunks; each arrival
   bumped all 8 neighbors' revs (`touchNeighbors`) and re-identified its
   own `ChunkData` — most of the visible screen went stale in one tick.
2. **Unbudgeted starts.** Every stale chunk started a re-bake THAT
   frame, and each start paid a synchronous prologue (~17k fillRects of
   meadow base + an elev fillMask + a 1-4MB canvas alloc) before the
   3ms budget loop ever ran. Elevation levels then baked ATOMICALLY
   (10-40ms each) inside the "sliced" job.
3. **Wipes.** Each arrival bumped `worldVersion` (six renderer memos +
   the water clip path rebuilt) and `interiorsVersion` (every interior
   region + union-find wiped → veils slammed shut and re-eased, region
   floods re-ran in one frame). A reconnect blip re-streamed all 25
   chunks — identical bytes — and re-baked the entire screen.
4. **The cascade.** Any of the above spiking one frame moved the frame
   EMA enough to trip the adaptive-resolution downshift: every backing
   store reallocates, every dpr-keyed cache dies, the world re-rasters
   at a new dpr. That is the "everything pauses and redraws" moment —
   also reachable from a heavy menu-open frame.

## Shipped (d09abab)

One law: **NOTHING HEAVY RUNS OUTSIDE A BUDGET.**

- THE SAME CHUNK IS NO NEWS — payload-identical re-streams keep the
  stored object; reconnect blips cost zero re-bakes.
- THE PROLOGUE JOINS THE QUEUE — live jobs paint a coarse placeholder;
  the fine meadow pass is budgeted row bands; replace jobs defer all
  painting behind the old blit.
- THE TERRACE TAKES ITS TURN — `startElevatedBake` slices the elevated
  bake (silhouette / meadow / per-layer / detail bands / rim / erase);
  `bakeElevated`/`bakeChunk` wrappers keep one-shot callers identical.
- THE REPLACEMENT WAITS ITS TURN — re-bake starts capped at 2/frame
  (`CHUNK_REPLACE_STARTS`); zoom-tier flips pace through the same gate.
- THE STORM LAW LEARNS A CEILING — visible-now sprite bakes get
  `VIS_SPRITE_BAKE_MS` (4ms/frame); a forest edge no longer bakes its
  whole population in one frame.
- THE LONE HITCH IS NOT LOAD — an isolated spike clamps to 2x budget in
  the frame EMA; only sustained slowness steps resolution down.
- THE ROOM STANDS THROUGH THE STREAM — `interiorsVersion` bumps only
  when the arrival's 3x3 neighborhood holds wall/door tiles (a room
  reaches at most one chunk past its walls; `chunkWallFlags` maintained
  by tile patches).

Measured (isolated rig, 4x CPU throttle, identical protocol):
`/tp` into the Hoargate mountains p99 116.6→42.6ms, max 484→93ms,
frames>50ms 27→1. Reconnect blip p99 66.8→33.4ms, frames>50ms 21→0.
Unthrottled 25s walk into fresh forest at 120Hz: p99 9.3ms.

## Roadmap — remaining findings, prioritized

### P1 — visible-jitter class (each is a small, shippable fix)

1. **Entity interest has no hysteresis** (`gameServer.updateInterest`):
   chunks got the +1-ring hysteresis in f757d2a, entities did not — a
   player pacing a chunk border leave/enters every entity in the outer
   ring each crossing, wiping their `sentSnapSig` and interp buffers
   (client re-enter = frozen at meta.x/y, then a jump). Give
   `knownEntities` the same +1 ring.
2. **Sneak-hidden is expressed as leave/enter**: a sneaker stepping
   every second repeatedly destroys and respawns their entity for every
   watcher (pop → freeze → jump, in plain view). Ship a hidden bit and
   fade client-side.
3. **Reconnect wipes the reveal system's arm** (`ownEid = null` →
   `occluderFade` returns 1): every faded canopy snaps to full opacity
   for one frame on any blip. Keep the last fade state through
   'reconnecting'.
4. **Ledger seed-then-refit re-deal** (`ui/kit/ledger.ts`): rows paint
   at the seed count, then a ResizeObserver re-deals at the measured
   count one frame later — the "menu contents vanish and redraw" the
   user sees. Workshop makes it deterministic (renders before unhide,
   first refit sees height 0). Render after unhide, or seed from the
   panel's known height.
5. **Reveal fade oscillation** (`reveal.ts` rect test): tangential walks
   flip occlusion across a 1px boundary and the 0.18s ease flickers
   trees between 1.0 and 0.32. Add hysteresis (enter/exit insets differ)
   or a minimum-hold.

### P2 — frame-loop hygiene (GC pressure; the "combat feels rough" tail)

6. **Draw-list churn**: `items[]` rebuilt + fully sorted every frame
   with a fresh comparator and 60+ push sites minting closures; the four
   particle/bird/debris loops allocate a DrawItem + closure per particle
   per frame (~150-300k objects/sec in combat at 120Hz). Pool the list,
   hoist the comparator, write particles into pooled items.
7. **`resize()` reads `clientWidth` every frame** after the HUD's DOM
   writes — a forced synchronous layout per frame. Cache CSS size from a
   ResizeObserver. Same class: the per-frame
   `querySelector('.ui-screen:not(.hidden)…')` in main.ts, and the
   600ms of per-frame `getBoundingClientRect` after pack-open.
8. **Per-body string signatures** (`olSig`: ~13 concats + `toFixed(3)`
   per humanoid per frame; mirrors for beasts). Numeric/versioned sigs.
9. **Glow/light key allocation** (stop-array literals + join-keys per
   light per frame in glowSprite/lighting). Hoist constants, key by
   identity.
10. **Lighting patch cache clears wholesale on zoom glide**
    (`sx/sy` change → `patches.clear()`), re-minting every lamp patch
    canvas next frame — a guaranteed hitch on wheel-zoom in a lamplit
    town. Scale-key the cache or defer the clear to glide-settle.
11. **Periodic scan spikes**: the 441-tile portal scan + `scanFallEar`
    land in the same frame at 2.5Hz; `findNearbyTarget` runs twice per
    frame. Slice/stagger/cache-per-frame.

### P3 — menu-open polish

12. First-open icon raster bursts (workshop rasterizes an icon per
    recipe, arts per technique at up to 4 sizes, each with a synchronous
    `toDataURL`). Pre-warm lazily off-frame or cap per frame.
13. Rooms carry `filter: drop-shadow` while animating opacity and
    hosting infinite mote animations — continuous full-panel re-raster
    over the canvas. Move the shadow to a non-animated wrapper or a
    pre-baked border asset.
14. Map screen runs a second rAF loop at native dpr, ignoring `dprCap`.
15. Quest log / rep screen force `renderedVersion = -1` on every open;
    `body:has()` selectors (8 rules) invalidate document-wide on any
    `.hidden` toggle.

### P4 — scale (server, hundreds of players)

16. **`WorldSource.ensure()` sweeps every built tile, hung detail, and
    crop WORLD-WIDE per generated chunk** (with a string-split per
    entry). O(world) per chunk gen is the one true scaling landmine
    found — index all three ledgers by chunk key. Generation itself
    measured cheap (~1.5ms/surface chunk, ~9ms per 5-chunk leading
    edge, dark band ~0).
17. `isSolid`/`tileAt` can trigger generation mid-tick from any
    movement/AI query — fine today, worth a guard/metric at scale.

### Known ceilings (documented, not defects)

- Full-viewport immediate-mode repaint: FF@60 still wants the
  static-layer epic (terrain/architecture to offscreen layers).
- TCP head-of-line: WebTransport is a future epic.
- Client never drops chunk DATA (only baked canvases) — unbounded but
  ~5KB/chunk; a cap is cheap insurance someday.

## Verification harness (reusable)

Isolated rig: `createdb-17 arx_rig_perf`; server
`PORT=8791 DB_DATABASE=arx_rig_perf DEV_COMMANDS=1 INVITE_CODE=rigcode
npx tsx packages/server/src/index.ts`; client
`npx vite --config vite.config.rig.ts` (:5174). Probe account
`perf_probe_rig` / char ProbeRig (rig DB only). Measure with an
independent rAF loop pushing frame dts (any main-thread stall shows in
every rAF chain); throttle via CDP `Emulation.setCPUThrottlingRate: 4`
to emulate weak machines; A/B by `git stash push -- <the exact files>`
(vite hot-reloads — re-instrument after every reload, and never stash
`-A` beside a live neighbor session). Surgical repros: `/tp -333 -261`
(Hoargate: mass load + elevation + town walls) and
`dcGame.conn.ws.close()` (reconnect re-stream).

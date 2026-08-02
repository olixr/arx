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

## Roadmap — status after round 2 (THE QUIET FRAME KEEPS ITS WORD)

### P1 — visible-jitter class — SHIPPED (round 2) except #2

1. ~~Entity interest hysteresis~~ **SHIPPED**: `knownEntities` keeps
   the same +1 ring `knownChunks` got in f757d2a (exists + not-hidden +
   within radius+1). Border pacing no longer leave/enters the outer
   ring; `sentSnapSig` survives.
2. **Sneak-hidden leave/enter — WON'T FIX, by design**: hidden players
   genuinely absent from the wire is the anti-ESP property (a client
   that isn't told a sneaker's position cannot be made to leak it).
   The visible artifact is instead softened by THE ENTER GLIDE (see
   #1b). Keep the leave/enter.
   1b. **THE ENTER GLIDE (shipped, new finding)**: every non-projectile
   enter seeds the InterpBuffer at the enter position on the render
   timeline — a fresh body renders at once and interpolates onto its
   first real samples, instead of freezing at meta.x/y for the interp
   delay and hopping. Projectiles exempt (v9 ballistic path owns them).
3. ~~Reconnect reveal snap~~ **SHIPPED**: THE VEIL SURVIVES THE BLIP —
   `revealArmed` holds through `connStatus === 'reconnecting'` (new
   `ClientGame.connStatus` mirror of every onStatus emit).
4. ~~Ledger re-deal~~ **SHIPPED**: measured rows-per-leaf remembered
   per host (WeakMap) so re-opens deal the right count immediately;
   station panels unhide before rendering so the first measure is
   honest (craft/bank/shop/build/plant/stable).
5. ~~Reveal fade oscillation~~ **SHIPPED**: FADE HYSTERESIS — a sprite
   already fading keeps a slack margin (6% of width) on the occlusion
   rect; enter needs true overlap, exit needs clear separation.

### P2 — frame-loop hygiene — SHIPPED (round 2) except the long tail

6. ~~Draw-list churn~~ **SHIPPED (the hot half)**: comparator hoisted
   (`DRAW_ORDER`), `items[]` persistent, and the four bulk loops
   (ground/world particles, debris, grounded birds) route through the
   CLOSURE-FREE BULK LANE (`DrawItem.bulk`/`bulkArg` + `drawBulkItem`)
   — no closure per particle per frame. Remaining tail: the ~60
   entity/tile push sites still mint closures (bounded by entity
   count, not particle count) — full pooling is a future pass.
7. ~~`resize()` forced layout~~ **SHIPPED**: THE FRAME NEVER ASKS THE
   DOM — a ResizeObserver feeds `cssW/cssH`; `resize()` is pure math.
   Still open: main.ts per-frame `querySelector` and the 600ms
   pack-open rect read (minor next to the per-frame layout, now gone).
8. ~~olSig `toFixed`~~ **SHIPPED**: `Math.round(v*1000)` at all three
   sig sites. Full numeric-signature refactor remains future work.
9. ~~Glow/light key allocation~~ **SHIPPED**: stop arrays hoisted
   (GLOW_STOPS / POOL_STOPS / WRAP_STOPS), stops→key memoized by
   identity in glowSprite, rgb CSV memoized per palette array.
10. ~~Lighting patch clear on zoom~~ **SHIPPED**: THE LAMP RIDES THE
    GLIDE — patches remember their build scale, the stamp rescales,
    TTL re-crisps after settle, and at most 2 far-off-scale patches
    (>25%) rebuild early per frame. The per-glide-frame full clear is
    gone.
11. ~~Periodic scan spike~~ **SHIPPED**: fall-earshot scan runs
    half-phase offset from the portal scan (never the same frame).
    (`findNearbyTarget` "twice per frame" was a misread — the second
    site is edge-triggered on pad press; left alone.)

### P3 — menu-open polish — partially shipped (round 2)

12. First-open icon raster bursts — OPEN (pre-warm or per-frame cap).
13. `filter: drop-shadow` + animated opacity + infinite motes on rooms
    — OPEN (visual-risk change; needs a design pass).
14. ~~Map ignores dprCap~~ **SHIPPED**: `Renderer.effectiveDpr()`
    threaded into MapView; the map renders at the adaptive cap.
15. ~~Quest log / rep screen forced rebuild~~ **SHIPPED**: open()
    renders only when the version moved (quest log also re-renders
    when a resting-shelf clock could have; skip path refreshes the
    bench so cooldown words and confirm state stay honest).
    `body:has()` selector cost — OPEN.

### P4 — scale — SHIPPED (round 2)

16. ~~`ensure()` world-wide sweeps~~ **SHIPPED**: all four ledgers
    (built tiles, hung details, crops, growth rows) carry per-chunk-key
    indexes maintained by their register/unregister pairs; `ensure()`
    reads only its own chunk's sets. Overlay order and law semantics
    unchanged; 356 server tests pass.
17. `isSolid`/`tileAt` mid-tick generation — OPEN (metric at scale).

### New findings (round 2 measurement)

18. **Reconnect residue is body-sprite churn, not chunks**: with the
    dedupe in, a blip's remaining cost (equal in old and new arms) is
    `entities.clear()` → re-enter → body/outline sprite re-bakes for
    every visible actor. Candidate: let bodySprites survive a
    reconnect (they key on stable identity) or pace re-enters' bakes.
19. **Zoom-tier re-bakes are inherently heavy at 64px/tile** — paced
    now (2 starts/frame), but a hi-res chunk bake remains ~4x a
    normal one; if wheel-zoom polish is ever wanted, pre-bake the
    other tier for the visible center ring.

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

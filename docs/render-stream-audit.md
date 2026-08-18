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

### P3 — menu-open polish — SHIPPED (round 3)

12. ~~First-open icon raster bursts~~ **SHIPPED**: THE BUDGETED LANE
    (icons.ts `queueIconTask` + rAF drain, ~3ms/frame) — burst sites
    (workshop recipe rows, bank vault, shop shelves, arts codex grid)
    queue their rasters; cached icons still apply synchronously so
    reopens never flicker. Single focused icons (bench card, sockets,
    hotbar) stay synchronous by design.
13. ~~Room drop-shadow re-raster~~ **SHIPPED**: THE SHADOW IS
    FURNITURE, NOT A FILTER — `.panel`/`.ui-screen`/`.ui-tray` wear
    the same hard offset as `box-shadow`, so the room is no longer a
    filter root and the ambient motes composite instead of re-
    rastering the panel every frame. Screenshot-verified identical.
    (`.panel-head`/`.panel-icon` keep their small static filters.)
14. ~~Map ignores dprCap~~ **SHIPPED**: `Renderer.effectiveDpr()`
    threaded into MapView; the map renders at the adaptive cap.
15. ~~Quest log / rep screen forced rebuild~~ **SHIPPED** (round 2).
    ~~`body:has()` rules~~ **SHIPPED (round 3)**: the 8 rules read
    `body.bank-open`/`.shop-open`/`.inventory-open`, stamped by
    `syncBodyClass()` at every panel toggle site — document-wide
    :has() invalidation gone. Also: the frame loop's per-frame
    `.ui-screen:not(.hidden)` selector query replaced by a 1Hz element
    snapshot + classList checks (`anyUiOpen`).

### P4 — scale — SHIPPED

16. ~~`ensure()` world-wide sweeps~~ **SHIPPED** (round 2).
17. ~~Generation metric~~ **SHIPPED (round 3)**: THE TICK NAMES ITS
    DEBT — `WorldSource.generatedCount` diffed per tick; ≥20 chunks
    generated in one tick logs the count + tick ms.

### Round-2/3 findings — resolved or standing

18. ~~Reconnect residue~~ **CLOSED (round 3, measured)**: with dedupe
    + hysteresis + enter-glide, a reconnect window is statistically
    identical to standing idle (p50 41.7 vs 41.9ms, 15 vs 16 heavy
    frames, 4x throttle, phase EMAs flat) — no body-sprite churn
    survives. Nothing left to fix.
19. **Zoom-tier re-bakes at 64px/tile** — paced (2 starts/frame) and
    now CENTER-FIRST (stale chunks re-bake nearest-camera first).
    Full other-tier pre-bake judged poor cost/benefit after pacing;
    revisit only if wheel-zoom polish is ever a priority.

### Tooling (round 3)

- **THE FRAME CONFESSES**: `?perf` appends per-phase ms EMAs (grid /
  chunks / ground / collect / sort / world / lighting / post) to the
  debug readout — stutters are now attributable, not guessed
  (renderer.perfMark/perfSummary; zero cost when off). Measured
  steady-state confirms the standing ceiling: the `world` pass (props,
  trees, bodies — immediate-mode) dominates; the static-layer epic
  remains the one big lever left.

### Known ceilings (documented, not defects)

- Full-viewport immediate-mode repaint: FF@60 still wants the
  static-layer epic (terrain/architecture to offscreen layers).
- TCP head-of-line: WebTransport is a future epic.
- Client never drops chunk DATA (only baked canvases) — unbounded but
  ~5KB/chunk; a cap is cheap insurance someday.

## Round 4 — THE MATTER COSTS NO GARBAGE (2026-08-12)

Triggered by "stutter when a discovered POI lights its particle FX +
prop-heavy scenes". Three parallel deep-reads (particles/debris/birds/
matter, discovery ceremony path, main frame loop) + live lane-3 rig
measurements (chromium headless, CDP 4x throttle, independent rAF
sampler — scratchpad perf-driver pattern, same protocol as round 1).

Shipped (062b557, 6884923, 4e2a79e, 45bb803):

- **THE CEREMONY COSTS NO FRAME**: chat.addLine's scrollHeight read
  (a forced whole-document reflow per chat line, inside the WS task)
  → write-only scroll pin; discovery sigil toDataURL memoized per
  kind; chat line lands before the herald insert.
- **THE LIFT LEDGER**: renderLift classifies each tile once per world
  version (constant/apron/ramp/deck-fill-slow) — hot path is one map
  get. It runs per particle/body/glow/debris per frame.
- **liftedWTSScratch**: bulk lanes project through one reused Vec2;
  drawOne contracts updated (copy before second projection).
- **Pooled bulk DrawItems** + indexed pool walks (generators minted an
  iterator + result object per particle per frame) + world-pass
  fillStyle dedupe runs + hoisted overlay comparator + no per-particle
  globalAlpha reads.
- **Emitter backlog clamp**: one frame spawns ≤50ms of a pop's own
  rate; the post-hitch burst can't amplify the hitch.
- **Cost-aware bake gates**: tree/flora/prop budgets admit at
  ~half bakeCostEma instead of "> 0" (a 0.01ms remainder used to start
  a 0.6ms bake); brand-new chunk starts paced at 4/frame (a mass /tp
  started a 5x4 window of prologues in ONE frame).
- **Entity screen cull**: bodies past viewport+6 tiles skip the whole
  rig build (projectiles exempt — v9 tracer handoff).
- **lightThrows pooled** (was ~86k allocs/s at night), queueGlow rgb
  memo, window-probe + erode-kernel literal hoists, lighting gradient
  stops from a 1/255-quantized alpha table, growthOf size gate.

Measured (lane-3 rig arx_rig_perf :8795/:5178, 1600x900, Hoargate
/tp -333 -261 + mid-window re-tp, 24s):

| | before | after |
|---|---|---|
| 4x throttle p50 / p95 / p99 / max | 58.2 / 75.4 / 90.8 / 108.3 | 50.0 / 58.9 / 67.2 / 79.2 |
| 4x world-phase EMA | 48.6ms | 33.7ms |
| unthrottled p50 / >16.7ms frames | — | 8.3ms (vsync tick) / ~3% |

Particle-cap storm A/B (identical scripted scenario, ~2400 live world
grains — 4-6x any real POI FX): p50 91.2 → 67.2ms, world 66.1 → 49.1.

Deliberately NOT done (candidates for round 5):
- Grass under-cache rebakes every frame during a zoom glide
  (`c.scale !== s` exact compare) and wholesale every 66ms — a gate
  needs scale-compensated blitting or slicing to stay visually exact.
- Tree light-throw shadow Path2D rebuilt per tree per light per frame
  at night (the sun path is cached; the throw path is not).
- applyTiltShift's full-canvas self-read every frame (~15 full-screen
  passes/frame total) — skipping under load is a visible change.
- collectStaticLights record pooling; the tile-class Uint8Array table
  to collapse per-tile Set.has chains.
- **The static-layer epic remains the one big lever**: the world pass
  (immediate-mode props/bodies/walls) still dominates every profile.

## Round 5 — THE STANDING WORLD (2026-08-12)

The static-layer epic itself — the "one big lever" every prior round
deferred — shipped in five phases (docs/static-layer-plan.md is the
epic's own plan + as-built ledger + laws; b25ea52, 643e514, 10de0d1,
ec5387d + polish). One paragraph of what changed:

collectRaisedTiles' ~3,080-tile re-classification compiles to THE
STATIC REGISTER (per-chunk descriptors keyed on data identity + rev,
replayed in exact scan order; the per-tile scan remains the always-
correct fallback). Cold architecture (plain walls, diag corners,
garrison, ramps, rails) and the inert prop set (STATIC_RING minus
run-merged furniture) bake per contiguous stretch into pooled
canvases painted by the live item painters under a swapped ctx +
bake camera (THE SAME-BRUSH LAW), blitted as one DrawItem per exact
(strat, sortY) bucket — SHELF LAW interleave by construction.
Anything animating (reveal cuts, shakes, near-body fades) flips its
whole stretch live (THE HOT MEMBER RULE); shadows never bake (bakes
capture the members' live drawShadow closures and replay them under
the camera's origin delta — zero per-frame construction). The cliff
marching-squares scan memoizes per (bounds, rev-sum) with falls
fully live. Sign text re-bakes via per-tile nonces; the farm
handler's missing own-chunk rev bump is fixed; /settile joins the
dev kit as the fixture brush.

Measured (protocol hardened this round: verified teleports, town-ward
fixtures, interleaved A/B cycles, canvas-only pixel diffs):

| dense base (~1,540 props) | layer off | layer on |
|---|---|---|
| Chrome world EMA / p50 | 3.33ms / miss | 1.67ms / 8.3ms vsync tick |
| Chrome 4x world / p50 | 19.1 / 60.5 | 13.5 / 57 |
| Firefox world | 8.97 | 5.96 |

Parity: zero mismatches in the register (1,183 frames, 4 scenes) and
cliff (249 frames) same-frame probes; band on/off canvas deltas
15-20x below one frame of ambient animation; wall/prop regions black
in diff heatmaps. Authored towns are tree/cliff-bound (walls were
never their Chrome cost), so their world EMA moves modestly — the
epic's payoff is exactly the player-built-base scale it was asked
for, plus the collect/scan cuts everywhere (register 36-53%, cliffs
64-67%).

Still open after round 5: tree sprites stay individual by design
(living sway); the world pass in forest scenes is now tree-blit-bound
— a shared-atlas tree cache is the next lever if forests ever miss
frame. Band canvases could pack tighter (per-tile height table).

## Round 6 — THE FRAME SHEDS ITS TREADMILLS (2026-08-17)

Triggered by the owner's post-content-wave audit: lighting v4, the
grass coat, the town dressing waves and the prop recuts all landed
since round 5, and a base-model Mac mini sat at 60fps. Survey driver +
CPU profiles + sampled-stack op attribution on a fresh lane-32 rig
(scratchpad perf6*.mjs pattern; 1500×900 @2, CDP 4x = weaker than a
base M-series mini, so 4x numbers are a hard floor). Two prior notes
stood confirmed: rAF locks to the panel (a 60Hz mini display caps at
60 regardless of headroom), and sequential single-window scene
readings lie (weather/entity drift) — every conviction here came from
interleaved A/B cycles or per-op caller attribution.

What the profiles confessed (4x, p50 / phase EMAs):

- The live-water pass scanned EVERY visible tile per frame (3 sampler
  calls each), and the shoreline march paid a 16-sample nearDeck ring
  per dual cell BEFORE its water-mask gate — ~10% of town frames with
  zero water on screen.
- Soft trees re-baked their full painted sprite every 6 frames to
  animate sway — the adaptive cadence TARGETED 28 repaints/frame by
  design (a 577-tree forest measured ~26 body + ~26 shadow repaints
  per frame), and the sun shadow filled a complex TRUE-FORM Path2D
  per tree per frame (top fill consumer of every forest profile).
- Idle NPCs excluded their grass tiles from the calm canvas forever,
  so a plaza of standing townsfolk rebuilt hundreds of blade tiles
  live every frame.
- `dpr()` (a DOM getter read) burned ~1% inside per-tile loops.

Shipped (58da55ee + 61fdb575):

- **THE WET LEDGER**: drawLiveGround / drawShorelines /
  waterRegionPath accept caller-compiled wet-tile + shore-cell lists,
  built in ONE linear typed-array pass over the frame grid (Uint8
  tile-class table; row-major append preserves the scans' exact visit
  order, so bucket draw order is unchanged by construction). Plain
  scans remain the always-correct fallback (elevated bands, editor,
  bakes). wetLedger.test.ts pins op-stream parity in BOTH hemispheres
  — the eastern pin exists because a signed unpack shift silently
  dropped every wet tile at tx ≥ 0 in the first cut.
- **THE SHEAR CARRIES THE SWAY**: tree sprites record their baked
  wind sample; the blit shears by the live delta about the ground
  line (THE RIGID SWAY generalized — rigid bakes neutral so its delta
  IS the full wind; one blit path for every species). Primary
  cantilever now moves at FULL frame rate at any cadence, so the
  cadence only refreshes per-cluster gusts/flutter: floor 6→18,
  target 28→12, ceiling 24→60, sub-pixel shear gate.
- **THE CAST IS A STAMP**: the sun-shadow Path2D rasterizes once per
  cadence into a half-res silhouette sprite (tone re-bakes on the
  moon flip) and stamps with one drawImage wearing the same live
  shear; shadow re-bakes ride the ms budget (a count-only gate burst
  dozens of canvas fills into one frame). Night light-throws keep the
  live path (few, near lamps only).
- **THE SETTLED BODY JOINS THE CALM**: a body still for ~1s bakes its
  (static) parting into the calm canvas and stops excluding tiles;
  the teleport escape-hatch skips settled bodies (treating them as
  unpredicted arrivals forced a full re-bake EVERY frame — caught by
  interleaved A/B after sequential windows blamed the weather), and
  first motion re-arms the hatch THAT frame.
- dpr() frame-memoized.

Measured (4x throttle; phase EMAs are the honest signal — p50s
quantize on the throttled vsync ticks):

| scene | ground | world | p50 |
|---|---|---|---|
| forest-day | 6.6→3.2 | 4.9→2.6 | 16.7→9.4 |
| town-day | 5.9→3.4 | 6.1→4.3-5.2 | 16.7→9.9-15.3 |
| town-night | 6.3→3.6 | 6.3→4.9 | ~16.6 (tick-pinned) |
| forest-night | 6.3→3.5 | 4.5→3.3 | 16.8→15.4 |
| meadow (577-tree river forest) | 7.6→6.1 | 8.0→7.0 | ~25 |
| projectile storm | 8.2→6-7.6 | 8.7→3-9 | 25→17-25 |

669/669 client tests (3 new parity pins). Visual proofs: canopy
occlusion, step-aside fade, TRUE-FORM plaza casts, shoreline foam all
clean in capture sweeps; sway smoothness needs a live human eyeball
(primary sway is now frame-rate; cluster shimmer refreshes at the
stretched cadence).

Still open after round 6 (the meadow's remaining ~25ms at 4x is
tree-BLIT-bound, not bake-bound):

- Tree sprite margins carry large transparent headroom (wind throw +
  jitter pads) — tight content bounds at bake would cut blit pixels
  ~30-40% in dense forests.
- `restore`/`transform` self-time in dense-forest profiles (~7%/5%)
  — the stamp pairs could batch by layer if it ever matters.
- Night light-throw tree shadows still build paths live per frame
  (near lamps only; invisible in day profiles).
- Hair silhouettes rebuild 4-6 paths per body per frame (towns);
  garrison reveal repaints cut stretches live BY DESIGN (height-gated
  correctly — cost is the animation, not a leak).
- Tall thickets live-build every frame (y-sorted); a cadence+shear
  sprite lane like the trees' is the shape if meadows ever miss.

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

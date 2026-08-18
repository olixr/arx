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

## ROUND 7 — THE WORLD DOES NOT BLINK (2026-08-18)

Owner report, seen on a base Mac mini (weaker than the dev machine):
"things stop rendering… I see through the world… entire walls
disappear, props disappear, for a second… every now and then a flicker
of ALL the props as they phase in or out… sometimes the resolution
changes." The suspicion was the static bakes or the lighting. The
lighting was innocent. The bakes were not — but not in the way the
report guessed.

### The root: four caches whose MISS PATH WAS INVISIBILITY

Every economy this document records is a cache in front of a live
painter, and THE STILL-WORLD BARGAIN has always said what a cache owes:
*a bake is a cache, never a mode — correctness never depends on a bake
existing.* The band layer honours it exactly (a declining stretch emits
its members live). **Two levels down, at the leaf, it was broken.**
`drawPropOutlined`, `drawFlora` and `drawTree` each ended their cache
lookup with `if (!sp) return` — a piece with no minted sprite was not
drawn AT ALL. The comment above it said "off-screen (a pad band) with
no sprite yet", and the code never checked whether it was off screen.

That would still be rare if a visible miss always baked. THE STORM
LAW's original words say it does — *"a missing sprite bakes UNBUDGETED
when its extent is on screen RIGHT NOW; skipping that bake would be
visible pop-in"* — but a later pass capped the visible lane at
`VIS_SPRITE_BAKE_MS = 4`, and the admission test asked for half the
running average bake cost up front. On a machine where one mature
tree's bake costs more than 4ms:

- the visible lane declines — forever, because
- `bakeCostEma` only ever updates INSIDE an admitted bake, so nothing
  can ever correct the estimate that closed the lane, and
- the ordinary 2.5ms lane closes on the same arithmetic.

**The cache stops growing and the world stops drawing.** Measured on
the rig (lane 33, 4x CPU throttle, a 1,122-piece scene): 775 trees
uncached, `frames>0 = every frame`, zero convergence across a
nine-second idle. The weaker the machine, the worse it gets — exactly
backwards, and exactly the owner's report.

Three more of the same shape, found in the same sweep:

- **Ground holes**: brand-new visible chunks were capped at 4 starts a
  frame, and a chunk with no cache entry blits NOTHING — a 32×32-tile
  patch of bare `#141020`. That is "I can see through the world",
  literally. (The cap bought a 6-16ms teleport hitch; it sold a
  multi-frame hole to do it.)
- **Shadow strobe**: `shadowMasks` trimmed the OLDEST-INSERTED 64
  entries at its 320 cap — in any scene over the cap, that is precisely
  the working set that has been drawing every frame since you arrived.
  Evict the hot set, re-mint it at 6/frame, trip the cap again: a
  permanent loop of shadows blinking out and back.
- **The visible resolution step**: ADAPTIVE RESOLUTION capped the
  backing store's dpr and stepped it half a point on sustained slow
  frames, retrying upward a minute later. Every step re-rasters the
  world and visibly changes its sharpness; on a borderline machine it
  wobbles between two resolutions on a minutes scale. That is the
  "resolution changes" verbatim.

### Shipped

- **THE STILL-WORLD BARGAIN REACHES THE LEAF**: a visible piece with no
  sprite paints LIVE this frame (`paintPropLive` — the pre-cache
  engine's own outline pass, kept alive on purpose as the caches'
  floor). Off-screen misses still skip: nothing to see, nothing to pay.
- **THE RING PAYS ITS OWN WAY** (`LIVE_RING_MS = 1.5`): the dilated
  ring is eight full-sprite taps; an arrival wanting hundreds of
  fallbacks spent SECONDS inside them (caught by the rig, not by
  reading). A handful of stragglers — the ordinary case — are rung and
  pixel-identical to the blit they stand in for; a mass arrival paints
  bare art for a frame or two, exactly as a felled tree always has.
- **THE ARRIVAL PAYS ONCE** (`VIS_SPRITE_BAKE_MS` 4 → 60): N uncached
  pieces owe N bakes. Paying converges; deferring does not (each
  deferred frame repaints live at the same order of cost and buys
  nothing). The ceiling is now only a runaway guard.
- **THE CACHE ALWAYS GAINS GROUND** (`render/bakeAdmission.ts`, pure +
  11 tests): one admission door for all three lanes. The "don't start
  on fumes" ask is CLAMPED to half its own lane's allowance, so a lane
  holding a full allowance always admits and the deadlock is
  unrepresentable; plus a guaranteed one-mint-per-frame floor so the
  estimate always gets a fresh sample.
- **NO VISIBLE CHUNK GOES UNPAINTED**: the 4-start cap is gone for
  on-screen ground (the pre-bake ring keeps its pacing — nothing out
  there is on screen to hole).
- **Shadow masks evict COLDEST, not oldest** (LRU by last draw).
- **THE RESOLUTION IS A CONSTANT** (owner law): adaptive resolution is
  RETIRED. The game renders at the display's own pixels, always. Frame
  time is bought with the economies that cost the player nothing to
  look at. `dprOverride` remains as the rig door for fractional-dpr
  DEVICE GRID proofs.
- **THE FRAME CONFESSES WHAT IT COULD NOT CACHE** (`?perf`): a
  `live prop N tree N flora N chunk N mask N` line. A steady non-zero
  prop/tree/flora reading is the one thing that should never be seen —
  it means a cache is not converging.

### Measured (rig lane 33, `/tp 34 110` dense forest + `/tp -333 -261`
Hoargate)

| window | before | after |
|---|---|---|
| idle, settled (either scene) | 775 trees uncached EVERY frame, no convergence | **0 fallbacks, 0 void pixels** |
| Hoargate arrival | multi-frame phase-in | 88 props / 64 trees on ONE frame, 0 for the next 33 |
| dense-forest arrival (1,122 pieces) | never converged | 743 → 172 → 0 across the sample, **0.00% void** |

695/695 client tests (11 new), 615 + 608 + 293 elsewhere. Visual proofs
captured at both sites: every tree, wall, prop, ore and snow-line
present, rings intact, step-aside fade and ghost ember correct.

**Rig lesson, paid for in this round**: the first cut of the live
fallback painted off-screen pad-band misses too, and rang every one of
them — a 790-piece arrival went to 4-SECOND frames. Neither the reading
nor the tests caught it; the throttled rig caught it in one run.
Instrument the fallback, then drive it, before believing a fallback is
cheap. And absolute times in headless Chromium are SwiftShader times
(an idle frame reads ~140ms) — only the COUNTS transfer.

## ROUND 8 — THE TREE FITS ITS FRAME (2026-08-18)

Owner report: "if I walk into a heavily forested area this hits my FPS
by 40 to 80 frames — the trees hit me the most. I want 100-200 trees on
screen." The wind system was the suspect. The wind system is fine; THE
FRAMES AROUND THE TREES were not.

### Measured first (rig lane 33, dense forest at 34,110)

A `drawImage` census of one steady-state frame, attributed by
destination area and draw target:

| | before |
|---|---|
| main-canvas blits | 921 calls, **255.7 Mpx = 44x the screen area** |
| of those, sheared (transformed) | 806 calls, 187.4 Mpx |
| typical blit | 450-600 px square |

Then the question that mattered: how much of that is PAINT? A scan of
the live sprite caches, sampling every cached tree:

| | ink bbox / rect | opaque coverage |
|---|---|---|
| tree body sprites | **40%** | 22% |
| tree shadow sprites | **8.6%** | 5.6% |

Body pads: 24% left, 19% right, 23% top. Shadow pads: 40% top, 44%
bottom. **The forest was blitting, alpha-blending and throwing away
more transparent margin than it was drawing tree** — every frame, per
tree, forever. The bake comments called pad pixels "transparent and
cost only bytes"; for a per-instance sprite that blits every frame,
that sentence is exactly backwards, and it is the sentence the industry
answers with sprite trimming (see TexturePacker/Unity atlas trimming:
trimming exists as much for fill rate as for atlas space; MDN's canvas
guidance says the same — "make sure your temporary canvas fits snugly
around the image, otherwise the performance gain is counterweighted by
the loss of copying one large canvas onto another").

### Shipped

- **THE TREE FITS ITS FRAME** (`trees.ts treeExtent`, pure + memoized
  per model): the body canvas is DERIVED from the ink the painter can
  actually reach — every cluster's blob stamp (facetBlob's 0.82-1.12
  vertex jitter, the shade stamp's 0.98/0.92/+0.11r/+0.13r, the 1.02
  breath), every limb's spine ± its flared half-width, the willow's
  cascade, and every wind term traced back to `windScalarAt`'s own
  ceiling of |wind| <= 1.4. The guessed box (`spread * 1.15 + 0.08h +
  0.45` sideways, `height * 1.18 + 0.45` up) is gone.
- **THE CAST FITS ITS FRAME**: `treeShadowPath` now reports the exact
  bounds of everything it draws, and the shadow bake sizes itself from
  that. The old box was `±half` on BOTH axes — but a ground cast is a
  smear along the light ray whose vertical reach is `ky * height`, a
  small fraction of half. That single wrong axis was the 8.6%.
- **THE GROUND LINE KEEPS ITS OLD FLOOR**: the sides and crown are
  derived and proven; below the trunk base the derivation came up ~0.2
  tiles short in a fat-margin rig bake, so the floor stays at the 0.3
  tiles the old frame used. It costs almost nothing — the bottom pad
  was 8% against 23% at the crown and 43% across the sides.

### Proven, not assumed

`treeExtent.test.ts` re-walks paintTree's geometry INDEPENDENTLY
(longhand, not shared, so a silent edit to one side fails in CI rather
than on a player's screen) and asserts containment for every species,
every variant, at wind extremes — plus a tightness assertion, because a
box that contains the tree by being enormous passes the safety half and
helps nobody. Then a FAT-MARGIN RIG BAKE: rebuild with +12px of slack,
measure each sprite's true ink bbox in device pixels, and confirm it
lands inside where the exact frame would have cut. Worst margins across
the sample — bodies [66, 63, 34, 57] px against the 24 px the probe
added, shadows [8, 7, 6, 6] against 6. Bodies have room to spare; the
shadow box is exact to the pixel.

### Results

| | before | after |
|---|---|---|
| body ink bbox / rect | 40% | **65%** |
| shadow ink bbox / rect | 8.6% | **78%** |
| body top pad | 23% | 3.2% |
| main-canvas blit volume | 255.7 Mpx | **200.7 Mpx** |
| shadow-layer blit volume | ~130 Mpx (est.) | **35.0 Mpx** |
| total frame blit volume | ~386 Mpx | **239 Mpx (−38%)** |

Per tree the cut is larger than the totals suggest: body rects fell to
0.61x and shadow rects to 0.11x their old area, while the untouched
props, flora, bodies and 4-Mpx ground-chunk blits still ride in the
same totals.

**Rig lesson**: the first census counted only `this.canvas === main`
and so never saw the tree casts at all (they draw into the shared
shadow layer) — a census that does not split by TARGET will quietly
omit a whole pass. And `treeSprites` is shared with props and flora,
whose canvases were never in scope; the containment reading only became
truthful once the sample was filtered to sprites with a shadow twin.

### Still open (the levers this round did NOT pull)

- **The dome's empty corners**: even trimmed, opaque coverage is 36% of
  the rect — a dome in a box. Sprite DICING (blit as 2-3 horizontal
  bands, each trimmed to its own width) is the standard answer and
  would take another ~30% off body fill.
- **Inter-tree overdraw**: 35x screen coverage remains, and in a closed
  canopy most of it is trees hidden behind nearer trees. A front-to-
  back coverage pre-pass on a coarse grid (2D occlusion culling) can
  skip a tree whose box is already solidly covered — the only lever
  that cuts CALLS as well as pixels, and canvas2d call overhead is
  ~3-4.3us each (900 calls ~ 4ms/frame in Chrome before a pixel is
  touched).
- **The shear**: 1854 of 2085 blits carry a non-axis-aligned transform,
  which forces a resample path. Worth an A/B before assuming it is free.

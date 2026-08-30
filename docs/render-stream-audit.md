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

## ROUND 9 — THE OFF-SCREEN TREE STANDS DOWN, AND CANOPY OCCLUSION IS REJECTED (2026-08-18)

Round 8 left three named levers. This round took the biggest one —
inter-tree occlusion culling — built it, measured it, and **rejected
it**, keeping the smaller win that fell out of the same machinery.

### What shipped

**THE OFF-SCREEN TREE STANDS DOWN.** The world pass collects from a
PADDED grid so tall content outside the viewport can lean, sway and
cast into it. Most of those trees have nothing on screen at all — and
every one was blitted in full, ~150k device px each, for the canvas to
clip away entirely. A tree whose whole box (plus a 24px margin for the
blit's shear) falls outside the viewport now stands down; its cache
entry stays warm so nothing re-bakes when it scrolls back, and its
ground shadow still casts.

| dense forest | round 8 | round 9 |
|---|---|---|
| main-canvas blits | 952 calls, 200.7 Mpx | **837 calls, 182.6 Mpx** |
| trees skipped | — | **294 / frame** |
| cull pass cost | — | 0.03 ms |

Against round 7's baseline the main canvas is down from 255.7 to 182.6
Mpx — **−29%** — and 115 fewer draw calls a frame matters on its own,
since canvas2d has no batching and a call costs ~3-4.3µs before it
touches a pixel.

### What was rejected, and why it is not a tuning problem

The intended prize was culling trees BURIED behind nearer crowns. Built
in full: `treeCore` computed a SOLID HEART per bake — a rectangle of
guaranteed-opaque canopy from inscribed cluster ellipses at the bake's
own wind — and a coarse screen grid accumulated hearts front-to-back so
a tree whose whole box landed on solid cells could stand down.

It culled **exactly zero trees in every scene tested**, at two heart
resolutions and with two different solidity rules (single-ellipse
containment, then a rasterised UNION with one-cell erosion, which
raised the mean heart from 1.9% to 4.2% of a sprite and changed the
cull count not at all).

The reason is the projection. At `yScale` 0.6 a tree one row nearer is
drawn only **0.6 tiles lower**, so an equal-height crown in front
stands 0.6 tiles SHORT of the crown behind it:

| front | back | front apex vs back apex |
|---|---|---|
| h 4.5 | h 4.5 | **0.60 tiles BELOW** |
| h 4.5 | h 5.5 | 1.60 tiles BELOW |
| h 5.5 | h 4.5 | 0.40 above |

Every receding row peeks above the one ahead. That is not a defect —
**it is why a forest reads as a forest**, and the dense-forest capture
shows it plainly. Only a front tree at least 0.6 tiles taller can bury
one behind it, and in a stand grown from a single species grammar that
is the rare case. A conservative test — the only kind allowed to skip a
draw — never sees it.

**Do not re-propose whole-tree occlusion without changing the
projection.** What could work, at real cost: a coverage buffer marked
from each sprite's actual downsampled ALPHA rather than an inscribed
rectangle, tested against each candidate's ink rather than its box.
That needs a per-bake readback (the thing every round of this document
has avoided) and would still only catch trees whose whole crown sits
under a taller one.

### The verification that mattered

Three harnesses, and the first two were wrong:

1. **Live-frame pixel diff** (cull on vs off, time frozen): useless. A
   NULL CONTROL — two captures with the cull off BOTH times — showed a
   noise floor of 135k differing pixels against a 139k signal. Freezing
   `performance.now` does not freeze a networked client; adding a
   `clockHoursNow` pin made it worse, because the freeze destabilises
   the interpolation it does not reach. **Always run the null control
   before believing an A/B.**
2. **Severity split** (soft vs hard diffs): still swamped.
3. **The one that worked** — audit the CLAIM, not the frame. The design
   rests on exactly one assertion: the heart is opaque. So read it
   straight off the real baked sprites: 121 hearts across two scenes,
   **zero holes, minimum alpha 255**. Sound — and useless, which is how
   we learned the geometry was the problem and not the soundness.

Lesson banked: when an A/B is noisy, find the single load-bearing claim
and test THAT directly. It is usually deterministic even when the frame
is not.

### Still open from round 8

- **Sprite dicing** — even trimmed, opaque coverage is 36% of a tree's
  rect: a dome in a box. 2-3 trimmed horizontal bands would take
  another ~30% off body fill. Untouched, and now the largest remaining
  lever.
- **The shear** — 1676 of 1913 blits carry a non-axis-aligned
  transform, forcing a resample path. Still never A/B'd.
- The honest ceiling remains: canvas2d cannot batch. 200 animated trees
  at full frame rate on weak hardware is a WebGL world pass, which is
  an epic, not a round.

---

## ROUND 10 — THE BAND BUDGET IS A FUSE, NOT A BROOM (2026-08-19)

**The report.** "I was in the Undercroft and something crashed the
browser when I was to the right of the cave bats. It consistently
crashed until I left that area." A crash with a PLACE: the tab died in
the deep galleries and the game was fine one screen west.

Not a prop. Not the new dungeon dressing. The static layer's memory
policy, in a district built out of solid rock.

### The mechanism, in one paragraph

A band canvas is exactly as wide as the wall run it bakes, so its cost
is set by the WORLD, not the renderer. A town facade is a few hundred
KB. The Undercroft is a 128×96 rect of `CaveWall` with corridors carved
out of it, so **every row of the dark is a maximal wall run** — 34
tiles, `4896×591` device px, **11MB of backing store per band** at zoom
1.8 on a retina panel, and ~380MB for one screen of the galleries
against a 64MB budget. The old shape baked FIRST and swept AFTER:
every band on screen baked, the post-frame sweep found the budget
blown, and the coldest-first loop emptied the cache — **including the
bands that very frame had just baked and blitted**. The next frame
re-baked all of them.

### Measured, before (rig lane 34, `:8813`/`:5216`, zoom 1.8, dpr 2)

| where | bakes/frame | canvas alloc/frame | band cache | fps |
| --- | --- | --- | --- | --- |
| Undercroft galleries | 17.5 | **184 MB** | 4 | 120 |
| Undercroft long haulage | 17.4 | **180 MB** | 4 | 120 |
| Undercroft landing | 23.2 | **222 MB** | 4 | 121 |
| Silverfall city (SURFACE) | 23.4 | **78 MB** | 0 | 93 |
| Dawnmead / open wild | 0 | 0 | 3–6 | 120 |

6510 cache `set`s and 6510 `delete`s in 362 frames — an 18-per-frame
bake/evict cycle, forever. **~20GB/s of allocate-and-discard**, which
walks the browser's renderer process into an OOM kill while frame
time, entity count and the JS heap all read perfectly healthy. This is
why nothing in the game confessed it: **the storm is invisible to every
counter that existed.** Zoom 1.0 still cost 63MB/frame; the cost is
quadratic in zoom.

Two accomplices, both measured:

- **Phantom ledger.** `onPlaneSwitch` cleared `bandCache` with a bare
  `.clear()` — canvases dropped, bytes still on the books. **+38.8MB of
  phantom per plane crossing**, never returned. Every Undercroft visit
  is two crossings. The budget silently narrows for the rest of the
  session, pulling the gate shut in places that used to fit.
- **A pool bounded by slots.** `spriteCanvasPool` capped at 40 entries
  with no byte ceiling; what it was recycling were cave-row bands.
  **Measured holding 369MB of idle pixels.**

### The five laws (`render/bandBudget.ts`, tested)

1. **A BAND THIS FRAME NEEDED IS NOT COLD.** The sweep may never evict
   an entry whose `used` is the current frame. Evicting what you just
   baked IS the thrash — it pins the hit rate at exactly zero and turns
   a cache into an allocator. *This one law alone took the galleries
   from 193MB/frame to 0.9MB/frame.*
2. **THE BUDGET IS AN ADMISSION GATE.** Decide before painting, pricing
   the whole ledger. A band that will not fit draws live — THE
   STILL-WORLD BARGAIN, the layer's own designed pressure valve.
3. **ONE BAND IS NEVER A BUDGET.** Past `BAND_ONE_MAX_BYTES` (6MB) a
   band is refused outright. Blitting an 11MB canvas to spare 34 flat
   wall tiles is the worst trade in the renderer.
4. **THE SWEEP KEEPS THE HEADROOM.** It aims at RELIEF (48MB), not at
   the ceiling (64MB); the gap IS the room the gate needs to admit the
   ground you are walking onto. Sweeping only at the ceiling would let
   a long walk fill the ledger with cold bands and latch the gate shut.
5. **A POOL IS BYTES, NOT SLOTS.** Two ceilings plus a per-slot size
   past which a canvas goes to GC instead of being parked.

Plus **THE LEDGER HAS ONE DOOR** (`dropBand` / `dropAllBands` in the
renderer): release then delete, never one without the other, and
`dropAllBands` re-grounds the total at zero so float dust cannot
accrete across a session.

And upstream, in `planStretches`: **A SHELF, NOT A WALL** — a stretch
is now cut every `BAND_MAX_SPAN` (12) tiles of world span. Without it,
law 3 refuses every cave row and the layer silently stops working
exactly where the world is densest. With it, the same 64MB covers ~4×
the ground (galleries: **blit 5 → 22**). The cut falls BETWEEN members,
never inside a merged run, and the joint is precisely the case THE
BANDED JOINT WEARS AN UNDERLAP was written for.

### Measured, after (same rig, same stops, same zoom)

| where | bakes/frame | alloc/frame | cache | ledger | pool | blit | fps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Undercroft landing | 0 | **0 MB** | 18 | 63.9MB | 11MB | 18 | 120 |
| Deep Market | 0 | **0 MB** | 19 | 64.0MB | 12MB | 19 | 120 |
| **Galleries (crash site)** | 0 | **0 MB** | 21 | 63.6MB | 18MB | 21 | 120 |
| Long haulage | 0 | **0 MB** | 21 | 64.0MB | 10MB | 21 | 120 |
| Blackreach | 0 | **0 MB** | 19 | 62.9MB | 13MB | 19 | 120 |

- **Ledger == true bytes to two decimals at every stop**, and still
  exact after six plane crossings (was +38.8MB each).
- **THE WALK** (31 stops east across the galleries, 2610 frames): 511
  bakes total = 0.2/frame, **0.58MB/frame**, blit holds 18–24 at every
  stop. The gate does not latch shut as the ground changes.
- **Pixel proof of no seam**: the banded frame diffed against the live
  path (`staticLayerOn` forced false) is black everywhere except the
  bodies that moved between grabs — player, bat, spider, swaying webs,
  a nameplate. No vertical hairlines, no band-edge grid. The new
  segment cuts are invisible.

### For the next round

`over` (declined bands) is now on the `?perf` confession line beside
`blit`/`live`/`hot`. A steady non-zero `over` is not a defect — it is
the gate saying this view is bigger than the budget — but it is the
one number to read before raising `BAND_BUDGET_BYTES`. Raising it is
now a **single safe knob**: the ledger is exact, the gate prices the
whole ledger, and nothing re-bakes what it just baked. In the deep at
zoom 1.8 a screen still wants ~4× the budget, so there is headroom to
buy coverage with memory if a future round wants it — deliberately,
with numbers, and not by accident at 20GB/s.

---

## Round 11 — THE GROUND LEARNS THE BYTE LAW (2026-08-29)

Owner's report: **"after ~30 minutes of play it locks at 30-31 fps and
never recovers; a page refresh clears it. Worse with trees and other
animated things."** A stable plateau, not a slide — and cleared only by
reloading the document, which points at accumulated *process* state
rather than at anything the frame recomputes.

### What was ruled out, and how

Four hypotheses were audited to exhaustion before anything was touched,
because the expensive mistake here is fixing the wrong thing well:

- **A second rAF loop** (the classic exact-halving). Dead: `main.ts`
  has one `frame`, one bootstrap at `:4418`, one self-schedule at
  `:3512`. Every UI loop self-terminates on a guard read each tick.
- **Listener / timer / DOM / audio-node accumulation.** 199
  `addEventListener` against 5 removals looks alarming and is benign —
  every window/document listener is in a constructor or at module
  scope. Chat caps at 80 lines, speech bubbles reap on death, despawn
  and zone change, observers are constructor-scoped.
- **Per-entity and decal growth.** Particles (2600), debris (220),
  footprints (a preallocated 240-slot ring), corpses (64, adaptive),
  ragdolls (16) are all capped with swap-remove and free lists. The
  entity map deletes on leave.
- **A frame-time latch.** `minDt`/`frameEma` self-heal: `minDt` takes
  `Math.min(dt, ...)` so one fast frame re-learns the panel budget.

Genuine but non-causal leaks were found and are listed at the end.

### The measurement that mattered

Round 10's law — *canvas allocation RATE is the only honest signal;
FPS, heap and entity counts all read healthy through this failure
class* — was applied to a **long-session soak** rather than a single
frame (`scratchpad/soak3.mjs`, lane 34: vite `:5216` → server `:8813`,
DB `arx_rig_soak`, probe `soak_probe`). The driver walks and teleports
a circuit of dissimilar places, so chunks stream and every sprite cache
is asked for a working set it has never held.

**The instrument had to be fixed before it could be believed.** The
first cut registered a fresh `FinalizationRegistry` per canvas and let
it fall out of scope — a collectable registry never fires, so it
reported *every canvas ever made as still live* and would have
"proved" a spectacular leak that does not exist. One registry held for
the life of the page, plus a forced `HeapProfiler.collectGarbage`
before each sample, gives an honest resident figure.

**The verdict: there is no canvas leak.** Resident backing store is
flat at ~480MB across the whole soak; `freed` tracks `made`. What is
wrong is the RATE:

| | 5-min circuit |
| --- | --- |
| total canvas allocated | **2,398 MB** |
| `startChunkBake` | 1,125 MB from 277 canvases |
| `startElevatedBake` | 443 MB from 109 canvases |
| `acquireSpriteCanvas` | 701 MB from 17,891 canvases |

**Chunk bakes are 65% of every canvas byte the client allocates, from
1.5% of its canvas calls** — and not one of them was pooled. Attribute
by BYTES, never by call count: the sprite lane dominates the census and
is the smaller half of the cost.

### THE GROUND CACHE LEARNS THE BYTE LAW

`baked` never learned Round 10's law. It was capped at **80 slots** (28
hi-res) and weighed by nothing — but a chunk canvas is 4.3MB at px=32
and 17MB at px=64, with every `lifted` elevation layer a full-size
canvas of its own. The same "80" is 341MB of flat ground at one zoom
and over a gigabyte of terraced ground at another. And all three exits
dropped their canvases un-pooled: the re-bake swap overwrote
`entry.canvas`, the distance evict was a bare `delete`, the plane
crossing a bare `clear()`.

- `bakeCanvasFor` (terrain.ts) — both bakes take an optional reuse
  canvas. Chunk canvases of a tier are all **exactly one size**, so
  this is the one lane where reuse needs no fit search and wastes
  nothing. A borrowed canvas carries two obligations a fresh one does
  not, and both are load-bearing: **clear it** (it holds the previous
  chunk's pixels) and **reset the transform** (it holds the previous
  bake's gutter translate). Setting `width` does both — by
  reallocating, which is the cost being avoided.
- A dedicated `chunkCanvasPool` (12 slots), *not* the sprite pool: a
  4.3MB canvas exceeds `POOL_SLOT_MAX_BYTES` and would be refused, and
  two or three would consume the entire sprite budget.
- `bakedBytes` + `BAKED_BUDGET_BYTES` (192MB) replace the slot cap.
- **The ledger is symmetric**: bytes are charged at *acquisition* and
  released at *recycle*, and `recycleBakedEntry` releases what an
  **in-flight** bake holds too. Charging at completion instead would
  let a chunk evicted mid-bake decrement bytes it never had — the
  negative-ledger twin of THE CROSSING's phantom.

### THE POOL IS INDEXED BY SHAPE, NOT SEARCHED

`acquireSpriteCanvas` scanned one stack for a canvas big enough but not
wastefully bigger. Sprite canvases are sized per model, per zoom, per
dpr, so a heterogeneous stack rarely holds a fit near the top.

**Enlarging the pool made it measurably worse** — an honest negative
result worth keeping: 384 slots minted 9,867 canvases over the
circuit; **1,480 slots minted 14,766**. A longer stack only dilutes the
window a bounded probe can afford to look at. The pool size was never
the binding constraint; the search was.

So shapes are **quantized to a 32px class on each axis**, collapsing
thousands of one-off sizes into a few dozen buckets and making
acquisition an exact O(1) lookup. Legal because oversized reuse
already was: every bake `clearRect`s the full canvas, and all six
sprite blits use the explicit 9-arg `drawImage` with recorded `sw/sh`
— never `canvas.width`. 64px classes halved the call count but cost
63% more bytes per canvas; 32px is the measured optimum.

### THE GATE MUST BE ABLE TO CLOSE AGAIN — why trees

`growingTrees` and `propShakes` are ease clocks whose **readers own the
only delete**. `growthOf` retires a key when its ease runs out — but it
runs only for pieces that are actually **drawn**, while the writers
fire across the whole interest radius. A sapling sprouting off-screen
sets a key nothing will ever read. The code says so in its own comment:
*"the map is empty except moments after a regrowth."* It is not.

The cost is not the entry, it is the **fast-path gate**. Both maps are
read through `size === 0` / `size > 0` tests standing in the per-tile
terrain scan and in every tree's per-frame growth lookup. One orphan
latches those gates open **forever**: from then on every visible tree
mints a template-string key every frame, and every tile in view pays
`destructibleInfo` — plus a closure per shaking tile, against Round 2's
closure-free bulk lane. Accumulation-triggered, permanent,
tree-correlated, cleared only by reload. `evictEases()` sweeps both on
a 60-frame cadence past each clock's known ceiling (2600ms / 380ms), so
the gate can close again.

### Results (identical 5-minute circuit, lane 34)

| | before | after |
| --- | --- | --- |
| total canvas allocated | 2,398 MB | **936 MB** (−61%) |
| chunk bakes | 1,568 MB / 386 | **345 MB / 85** (−78%) |
| sprite lane | 701 MB / 17,891 | **439 MB / 6,975** (−37% B, −61% calls) |
| resident canvas | 472 MB | 354 MB (−25%) |

732/732 client tests green; typecheck clean. `?perf` grows
`ground <MB>/<chunks> pool <n>` — **a zero pool means every re-bake is
paying full allocation**, and is the first thing to read.

### Still open, ranked

1. The sprite lane is still 439MB/circuit. The next lever is fewer
   *re-bakes*, not cheaper canvases — the caches evict a scene's
   working set on arrival at the next one.
2. Gradients: 1,200–1,400 `createLinearGradient`/sec in some scenes,
   built live in the frame loop.
3. Confirmed-but-harmless leaks, all never iterated per frame, all
   fixable with the `npcArrows` idiom (`renderer.ts:61806`):
   `alertAnim`, `questAnim`, `stationClang`, `lastDemolishFxAt`,
   `npcCasts`, `VoicePlayer.media`, and the nuclear
   `wadeStates`/`dropContacts` `clear()`-at-N backstops.
4. `lighting.ts` patch cache is capped at 128 **slots**, not bytes —
   the same class of defect, small per entry. Ceiling, not a decay.

---

## Round 12 — THE CLIFF JOINS THE STANDING WORLD (2026-08-29)

Owner's report: **"120+ fps on the dev laptop, 30-60 on Mac minis —
worst in places rich with props, decorations, furniture, walls."**
Two standing facts first: rAF locks to the panel (a 60Hz mini display
reads 60 with infinite headroom — that half of the gap is the
monitor), and headless SwiftShader absolute times still lie — every
conviction below is an op-count, byte, or same-rig A/B delta.

### The measurement (rig lane 36, `:5218`→`:8814`, 4x, dpr 2)

Five scenes surveyed: Silverfall avenue `/tp -448 -264`, Silverfall
crown `/tp -448 -320`, the Silent Terrace graveyard `/tp -512 -212`,
Hoargate, dense forest 34,110. The city was the catastrophe — world
phase EMA 269-345 vs the forest's 50, driven by a **path-op storm**:
~13-16k lineTo + ~6k fillRect + ~2.5k fill per frame of live vector
painting. Attribution (sampled function-name stacks — vite line
numbers lie, names do not) named three owners:

1. **`bedPath` is not beds.** It is cliff BEDDING STRATA — the
   terraced city's rim faces (rock gradient + macro drift + three
   dashed seams + block jointing + brow + tufts + scree) painted live
   per dual-cell segment per frame, ~100-200 segments in a capital
   viewport. Also the top gradient-mint site (601 createLinearGradient
   /s — the rock body gradient).
2. **Band starvation.** The ledger sat pinned at 64MB with the
   on-screen working set ALONE ~87MB — the sweep can never evict
   what's in use, so the gate latched shut and 16-27 stretches
   (garrison masonry, merlons, walls, furniture) repainted live
   forever. Confirmed causal by a 256MB experiment: declines 60→5,
   masonry/merlon ops absorbed into bands.
3. **The mirror lies.** THE HERO'S MIRROR auto-opens for a probe
   character whose look was never confirmed, and its turntable rAF
   paints a full figure every frame BEHIND the measurement. Two runs
   were poisoned before the screenshot caught it. **Probe protocol:
   click `#look-confirm` after first login.**

And one treasure from an unthrottled steady-state CPU profile of the
forest: **~30% of ALL self time was tree model construction**
(`treeModel` 7.2%, `treeExtent` 5.7%, `grownSpine` 5.1%, `dome`,
`addStreamer`, `addCluster`, `addLimb`…) plus 9.3% GC — at `live tree
0`, every sprite cached. `modelCache` had the nuclear backstop:
`if (size > 600) clear()`. A dense forest's working set is >600
models, so the cache cleared and refilled EVERY frame, and the extent
memo (a WeakMap on model identity) died with it each time.

### Shipped

- **THE CLIFF JOINS THE STANDING WORLD** (renderer.ts): straight
  south rim faces group into runs inside the already-memoized cliff
  memo (`fruns`, cut every `CLIFF_RUN_MAX_SPAN` = 12 tiles — a shelf,
  not a wall), and each run bakes ONCE into a pooled curtain canvas
  through the shared sprite admission lanes (`cliffSprites`, keyed
  level|row|span|world-rev|gridPx|dpr). THE SAME-BRUSH LAW verbatim:
  the bake constructs the member `cliffFaceItem`s again under the
  swapped camera and they draw themselves — zero art code moved. The
  blit wears blitBand's EXACT LATTICE PATH mapping; diagonals/bevels
  stay per-segment live (few, different sort rows); falls and contact
  shadows stay live; run items reproduce cliffFaceItem's strat/sortY
  formulas exactly (members of a straight run are same-sortY ties, so
  one item sorts where its members did). THE STILL-WORLD BARGAIN
  holds: declined/mid-glide/layer-off runs paint members live, and
  `?perf` confesses `cliff N` live fallbacks.
- **THE LEDGER FITS THE CITY** (bandBudget.ts): `BAND_BUDGET_BYTES`
  64→128MB, relief 48→96MB — sized from the measured demand, not
  hope. Avenue declines 16→2/frame, graveyard 0, ledger settles
  88-98MB.
- **THE TREE REMEMBERS ITS SHAPE** (trees.ts): both model caches
  (adult 600, sapling 300) replace clear-at-N with TWO-GENERATION
  rotation (2048/512 per generation): a hit anywhere survives, only
  entries untouched for a whole generation drop, worst case bounded
  at 2x the cap. THE WORKING SET IS NOT EVICTABLE — the same law as
  rounds 10/11, one level deeper.

### Proven

- **Cliff containment**: edge-ink audit of every baked curtain — zero
  ink on any border row/col (the round-8 fat-margin method, automated).
- **Cliff parity**: cached-vs-live pixel flip (bakeCliffRun stubbed
  null + cache dropped) diffed BELOW the equal-gap animation noise
  floor — 10,445 hard px vs the null control's 12,235 — with no rim-
  row spike in the 32px band profile. Eyeball shots clean at zoom 1
  and 1.8.
- **Ops (final survey vs baseline, same protocol)**: avenue lineTo
  13,243→5,002/frame (−62%), gradients 601→117/s; graveyard
  6,918→3,469 (−50%); crown 16,539→9,771 (−41% — the remainder is
  the settled-cut walls + hair, ranked below); forest steady-state
  profile: treeModel 7.2%→0.5%, extent/spine/dome/streamer gone from
  the top 30, GC 9.7%→0.8%, **32% idle appeared where the frame had
  none**. `cliff 0` fallbacks at steady state in every scene.
- 739/739 client tests, typecheck clean.

### Still open, ranked

1. **THE SETTLED CUT JOINS THE BAND**: `stretchHot` treats any
   cut wall (height ≠ full) as hot even when the ease has SETTLED —
   standing still inside any furnished building keeps ~20 wall
   stretches (crown measured) repainting live vectors every frame.
   Design sketched: extend the stretch sig with a quantized cut-height
   vector, bake only after a stability window (heights depend on
   continuous own-position + cutCtx, so motion = live, as today), let
   the stop/start churn ride the existing bake budget. Touches the
   most player-visible system in the game — wants its own interactive
   harness (walk in / stop / walk out), not a round's tail end.
2. **Hair/beard/hem path churn**: the top steady world consumer now
   (~600 path ops/frame, body-count-bound, rides animated-body
   re-bakes). Path2D cache keyed (style, facing, head size) in
   head-local space is the shape.
3. **Waterfall churn** (`drawFallChurn` ~4k quadraticCurveTo/frame
   near the Silverfall falls) — animated by design; a two-layer
   scroll bake is the classic answer if the falls district ever
   misses frame.
4. Hoargate reads `bands 0/0` in every run — no stretches at all in a
   walled mountain town. Unexplained; same before/after this round.
5. The two `over` stragglers in the avenue at ANY budget (TooBig
   verdicts, tiles 35:0 / 11:14 / 428:15) — single-member stretches
   declining on the per-band ceiling; harmless, unexplained.

**Rig lane 36 (reusable)**: `vite.config.rig36.ts` (:5218 → :8814),
DB `arx_rig_36`, probe `perf12_probe` / `probe-owl-9127` char Prowler
(look CONFIRMED — the mirror stays shut). Drivers in scratchpad
pattern: survey12/attribute12/cliff-proof/profile12.

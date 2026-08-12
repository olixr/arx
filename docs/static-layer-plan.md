# THE STANDING WORLD — the static-layer epic

**ALL FIVE PHASES SHIPPED 2026-08-12 — EPIC COMPLETE** (b25ea52 register, 643e514 architecture bands, 10de0d1 cliff memo, ec5387d prop bands, + phase-5 polish).

The last big lever in the render roadmap: stop repainting static world
content immediate-mode every frame. The world pass (collect → sort →
draw in renderer.ts) pays ~350 drawImage + 1400+ fillRect per frame —
walls, doorways, garrison, cliff faces, ramps, and rails are raw path
paint every single frame, and collectRaisedTiles re-classifies ~3,080
tiles per frame. Players build large custom bases (walls, floors,
furniture at Minecraft scale, up to ~1000 props on screen); the target
is a locked 120fps with zero visual detraction. Once placed, a piece is
static until interacted with: bake-and-blit territory.

Grounding: two parallel deep audits (world-pass anatomy; the complete
invalidation surface), an architecture design pass, and an adversarial
correctness review (2026-08-12). Read alongside
docs/render-stream-audit.md (the perf ledger) and the SHELF LAW /
DEVICE GRID memory topics.

## The architecture

Three pieces, per chunk:

- **THE STATIC REGISTER** — the collectRaisedTiles classification,
  compiled once per (ChunkData identity, rev) instead of re-decided
  every frame. Stores world-space member descriptors (tile, anchor,
  runLen, elev, authored sortY, flags) — NEVER DrawItems or closures:
  item builders capture camera projections, snapped device coords,
  `t = performance.now()/1000`, reveal heights, and frame-grid reads at
  collect time, all of which go stale next frame. Items are minted
  fresh each frame from the descriptors. Missing/stale register → the
  legacy per-chunk scan runs (today's loop, verbatim) until the paced
  rebuild lands.
- **BANDS** — bandable members grouped by EXACT `(strat??0, sortY)`
  sort key (bit-identical floats only; the authored offset table is
  dense — .6/.68/.72/.78/.85/.9/+1/+1.02/±0.001-0.03 seams — and
  entities carry continuous sortY, so ANY quantization recreates the
  razor-cut-tree class of bug). Each band bakes into a pooled canvas
  sized to its occupied x-run and blits as ONE DrawItem at the members'
  true sort key — pixel-exact SHELF LAW interleave by construction.
  collectElevatedGround's per-row blit is the proven in-repo template.
- **LIVE EXCEPTIONS** — anything animating this frame flips its whole
  band back to per-item live draw. The live path remains forever as the
  correctness fallback.

## The laws

1. **THE STILL-WORLD BARGAIN** — a bake is a cache, never a mode. Any
   band may decline any frame (pending, stale, hot, evicted) and its
   members draw live through the unmodified item painters. Correctness
   never depends on a bake existing.
2. **THE SAME-BRUSH LAW** — static-layer pixels are painted by the very
   item painters the live path runs, under a swapped ctx + bake camera
   + swapped snap lattice (camera.snapDpr follows the render target so
   snapPx resolves on the bake grid — integer by construction). A
   second painter for baked content is banned; parity is structural.
3. **THE BAND KEEPS THE SHELF** — a band's sort key is exactly
   (strat, member sortY): raw world row + the authored offset, members
   merged only on exact float equality. sortY never carries lifted or
   screen terms (THE SHELF LAW, unbroken). A plateau-edge row is one
   band per shelf.
4. **THE HOT MEMBER RULE** — anything animating this frame (reveal
   window, door/chest ease, shake, station heat, growth, occluder
   fade) flips its WHOLE band live. Half-bands are banned: excising one
   run member re-opens the SHARED-EDGE seams. All hot gates reuse the
   live path's own thresholds verbatim (cutCtx ≤ 0.001,
   stationHeat < 0.01, finite ease clocks) — never invent a new
   epsilon.
5. **SHADOWS NEVER BAKE** — the sun is continuous and the reveal
   shortens casts; band items carry their members' live drawShadow
   closures into the prepass forever.
6. **THE CRISP GRID LAW** — bands bake at an integer device-px-per-tile
   grid: `gridPx = max(1, round(baseScale × targetZoom × dpr))`. The
   ground bakePx tier is for ground only — dpr-independent 32/64 would
   soften every 1-3px mortar/chink/outline stroke up to ~2x, and the
   mandate is zero visual detraction. Keyed off targetZoom (one flip
   per zoom); zoomGliding gates all bakes; mid-glide blits
   scale-compensate through snapped-corner dest rects.
7. **THE STRAIGHT-WORLD PREREQUISITE** — bands assume PERSP_LEAN = 0
   (verticals rise straight; chunk-scale bakes are affine-exact). A
   canary test pins the constant; the layer refuses to arm otherwise.
8. **THE REGISTER IS THE SCAN, COMPILED** — registers key on
   (ChunkData identity, rev, interiors slice, outlineOn); every input
   that changes classification must flow through a rev bump. The farm
   own-chunk rev fix is this law's first enforcement.
9. **SKY NEVER KEYS A BAKE** — window glass tint (sky.flame) becomes a
   live overlay item at the wall's own sort key; candle-bearing
   furniture variants (hash-known at register build) are excluded from
   bands; fire/glow props, stations, doors/gates (openness flips their
   sortY), portals, chests, trees/saplings/flora/crops, and
   awnings/banner poles stay live-only or on their existing caches.
10. **DISARMED WHERE IT CANNOT BE TRUE** — the static layer is off
    under editor cameraOverride (Map Studio brushes would churn it for
    zero benefit) and wherever the prerequisites fail.

## Key mechanics

- **Blit**: dest rect from camera.snapPx-rounded corner projections
  sharing the chunk's snapped NW anchor with the ground blit —
  band↔ground↔band edges move in lockstep (SHARED-CORNER law extended);
  no pan shimmer; imageSmoothingEnabled on.
- **Two-tier staleness**: content-sig mismatch (member tuples +
  outlineOn + interior skin) → the band DECLINES and members draw live,
  so a placed/demolished piece is correct the same frame, always;
  raster-param mismatch (gridPx/dpr) → keep blitting the old canvas
  scale-compensated while a paced center-first queue re-bakes
  (BAND_REPLACE_STARTS=2/frame + STATIC_BAKE_MS budget + cost-EMA
  admission) — a dpr step or outline toggle never storms.
- **Hot detection**: a per-frame hotTiles set (chest/door eases,
  shakes, hot stations, growth, breaking rocks — typically 0-4
  entries) + reveal boxes (house: only if cutCtx > 0.001, box
  dy ∈ [-2, 12] with +1 row north for the rear-riser dependency,
  |tx+0.5-ownPX| ≤ 13; garrison: always armed inside dy ∈ [-2, 15],
  |dx| ≤ 13 — garrisonHeightAt has no cutCtx gate) + the occluder-fade
  box for tall members (honoring NEVER_FADE_TILES + ownSeatTiles).
  Bands outside every box blit with zero per-member work; bands
  intersecting a box evaluate their members' wallHeightAt — all full →
  still blit; any cut → whole band live. Reveal state NEVER keys a
  bake (walking through a door causes zero band bakes).
- **Wall split**: band bakes force full height (whT = WALL_H /
  GARRISON_H) with hangings suppressed (`wallHangings` has exactly one
  clean call seam — 6517 house, 8262 garrison); the animated hanging
  and the flame-gated glass tint each emit as live items at the wall's
  identical sort key, landing right after the band under the stable
  sort.
- **Cliff faces**: a bounds-keyed geometry memo (viewport bounds +
  revSum over intersecting chunks) — the marching-squares scan runs on
  bounds/rev change (~4-8x/s walking) instead of every frame; DrawItems
  still minted fresh per frame (the ctx-swap law). Face pixels stay
  live until measurement demands promotion.
- **Register extras**: collect-time glow emitters (the mossy-seam
  class) are stored as per-frame frameEffects re-runs; bakingMask =
  true wraps every band bake (glow/sparkle side effects stay out of
  the pixels, the 2949 precedent).
- **Memory**: soft budget ~64 MiB → evict to 48 MiB, distance-then-LRU
  (mirror evictBaked); canvases from spriteCanvasPool; live fallback is
  the overflow pressure valve.

## Phases

1. **THE STATIC REGISTER** — collect cache, zero pixels move. Pure
   classifier in render/staticRegister.ts (accessor-injected, tested);
   legacy scan fallback; farm own-chunk rev fix in clientGame.ts.
   Measure: collect EMA; screenshot diff must be zero.
2. **ARCHITECTURE BANDS** — walls, doorways, diagonals, garrison,
   ramps, rails: the fillRect storm. Bake camera + snap-lattice swap,
   hot boxes, hangings/glass splits, snapped blits, paced queue; pure
   logic in render/staticBands.ts. Measure: world EMA, inside-the-base
   walk p99, door-toggle bake counter = 0, zoom×dpr crispness matrix.
3. **CLIFF CONTOUR MEMO** — the per-frame marching-squares scan goes
   rev/bounds-keyed. Measure at Hoargate.
4. **STATIC PROP/FURNITURE BANDS** — STATIC_RING_TILES + RUN_RING runs
   + pillars + crates + plain rocks, compositing the existing member
   sprites (the sprite IS the brush; rings included); invalidateProp
   dirties the containing band. Measure: the ~1000-prop dense-base
   fixture; the 120fps acceptance run.
5. **MEMORY / EVICTION / POLISH / LEDGER** — byte budget + eviction,
   ?perf band counters, budget rebalance across the CHUNK/SPRITE/STATIC
   lanes, audit-doc round entry, memory topic.

Each phase ships independently: tests green (npm test, tsx --test),
measured on the rig, committed and pushed before the next begins.

### Phase 4 — STATIC PROP BANDS AT SCALE (2026-08-12)

- Membership: `BAND_STATIC_PROPS` = STATIC_RING_TILES minus the
  run-merged furniture (already one bake per component) minus
  PillarStone (own route) — crates, chairs, thrones, bookshelves,
  cabinets, racks, lecterns, signposts, timber posts, stumps,
  stalagmites, bone piles, glow shrooms. Verified flame-free: Table's
  candles, LampPost, Brazier, and Hearth all live outside the set.
- The bake now replicates the LIVE environment exactly (ctx scaled by
  the adaptive dpr, camera at the settled target scale, snapPx on the
  device lattice) — so `drawPropOutlined` composites the ring-baked
  prop sprites natively during bakes (the sprite IS the brush), and
  wall bakes behave byte-for-byte as on screen. A stretch declines
  if any member sprite is missing or off-grid (a budget-skipped
  nested bake would leave an invisible prop); the live path heals the
  sprite first and the band follows.
- THE SHADOW REPLAY: bakes capture the probe items' live drawShadow
  closures (translation-invariant screen-space casts that read the
  sun and this.ctx at call time); per frame the band translates them
  by the camera's origin delta since capture. Zero per-frame item
  construction for banded stretches — SHADOWS NEVER BAKE, and
  neither does collect.
- The step-aside fade never bakes (occluderFade gated off during
  bakes — its box lives in live viewport coords) and its support box
  keeps near-body props live. `invalidateProp` (sign text) bumps a
  per-tile nonce mixed into stretch sigs and drops the register, so
  state-keyed art re-bakes its band.
- `/settile <tile> <w> <h> [gapX gapY]` (server, DEV_COMMANDS) fills
  fixture rectangles through the one setWorldTile door — the standing
  rig brush for dense-base fixtures.
- Receipts (the ~1,540-prop dense-base fixture beside Dawnmead, lane
  rows for walkability, position-verified teleports, interleaved
  off/on cycles): canvas-only pixel parity — on/off delta ~31k px vs
  400-750k px frame-to-frame animation control (the toggle changes
  15-20x LESS than one frame of lawn wind). Chrome unthrottled:
  world 3.33 -> 1.67ms, p50 at the 8.3ms vsync tick in clean
  sessions. Chrome 4x throttle (interleaved medians): world
  19.1 -> 13.5ms, p50 60.5 -> 57. Firefox: world 8.97 -> 5.96ms.
  Steady state ~58 blits + ~6 by-design hot stretches per frame,
  zero rebakes. MEASUREMENT LESSONS (pinned for the rig): verify
  every teleport against renderer.ownPX/ownPY (throttled chat drops
  keystrokes), keep fixtures inside town wards (wilds mobs shake
  crates and kill idle probes), interleave A/B cycles (single-window
  EMAs swing 2x with scene noise), and diff CANVAS pixels, never
  page screenshots (DOM chat shifts pollute).

### Phase 5 — MEMORY, POLISH, LEDGER (2026-08-12) — EPIC COMPLETE

- Byte budget: bandBytes tracked through acquire/release; eviction =
  distance sweep first (the ground cache's rule), then coldest-first
  to 48MiB under a 64MiB soft cap. The live path is the overflow
  pressure valve.
- ?perf gains the band confession: `bands <blit>/<total> hot <n> <MB>`.
- Prop-only stretches bake tighter canvases (northT 2.4 vs walls'
  2.8, garrison 4.6) — less transparent overdraw at composite.
- docs/render-stream-audit.md round 5 records the epic in the perf
  ledger; the memory topic carries the laws.

## Verification protocol

Isolated lane-3 rig (arx_rig_perf; server :8795 DEV_COMMANDS=1
INVITE_CODE=rigcode; client vite.config.rig3.ts :5178; probe
perf_probe_f5 / ProbeFable) + the scratchpad playwright-core driver:
independent rAF dt sampler, CDP 4x CPU throttle, ?perf phase EMAs.
Scenes: Hoargate /tp -333 -261 (town walls + elevation + mass load),
the dense player-base fixture measured outside AND inside (reveal
active — the adversarial case), and a particle storm over the base.
Pixel parity: cameraOverride-pinned screenshot diffs, layer
force-disabled vs enabled, time-of-day pinned. A/B by
`git stash push -- <exact files>`; stage explicit paths in every
commit (never -A beside a live neighbor session).

## As built

### Phase 1 — THE STATIC REGISTER (2026-08-12)

- `render/staticRegister.ts`: pure `classifyRaised` (the scan's route
  decisions, verbatim order) + `buildRegisterRows` (per-chunk per-row
  member lists in west-to-east encounter order; vertical runs land a
  copy on every spanned row so first-visible-row emission + the
  frame-local runSeen dedupe reproduce the scan's first-encounter
  semantics exactly). Host-injected probes keep it testable.
- renderer.ts: `collectRaisedTiles` now walks (row, chunk-segment) in
  scan order; fresh registers replay members through
  `emitRegisterRow` (per-frame pad admission by member.treeLike +
  effective-encounter-column insertion sort — a run reaching in from a
  side pad lands at the same array position the scan gave it); chunks
  without a fresh register run `scanRaisedRange` (classify-and-emit,
  the same classifier + the same `emitRaisedMember`, so the paths
  cannot drift). 4 register compiles/frame; registers keyed (data
  identity, rev); evicted beside the ground cache.
- clientGame.ts: `touchChunk` + farm handler bumps the plot's OWN
  chunk rev (closes the soil-paint staleness gap; THE REGISTER IS THE
  SCAN, COMPILED enforcement #1).
- Receipts: live parity probe (both paths every frame, 4 scenes —
  Hoargate walls / Silverfall castle / mesa cliffs+ramps / Saltmere
  bridges, 1,183 frames, ~220-490 items/frame) = ZERO mismatches in
  count, order, sortY, strat, elevated. Same-frame timing probe:
  collectRaisedTiles 0.45→0.23ms unthrottled Hoargate, 2.06→1.17ms at
  4x throttle (36-53% cut across scenes — the classification cost;
  the remaining cost is live item construction, which later phases
  retire for static content). 416 client tests green.

### Phase 3 — THE CLIFF CONTOUR MEMO (2026-08-12)

- `collectCliffFaces` split into `buildCliffMemo` (the marching-squares
  scan, verbatim, recording world-space ops: south faces + north fall
  crests in cell order, side spans merged to runs) and a per-frame
  replay that mints DrawItems fresh through the untouched builders.
  Memo keyed on (viewport tile bounds, chunk-rev sum over the padded
  scan window) — rebuilds ~4-8x/s walking instead of 120x/s. The side
  runs' water-fall probing (`emitCliffSideRun`, the old emitRun
  closure verbatim) stays fully live: clips and race read the world
  every frame.
- Receipts: same-frame parity probe (fresh build+replay vs cached
  replay), 249 frames across Hoargate/mesa/Silverfall falls — zero
  mismatches. Same-frame timing at 4x throttle: 1.48 → 0.49ms/frame
  at the mesa, 0.74 → 0.26 at Hoargate (64-67% off the scan). Face
  PIXELS stay live (round-5 candidate if the dense-base measurement
  demands promotion).

### Phase 2 — ARCHITECTURE BANDS (2026-08-12)

- Bandable v1 (every painter verified clock- and sky-free): plain
  walls (not windowed, not hanging-bearing — those stay live per SKY
  NEVER KEYS A BAKE), diag walls, garrison curtains + diagonals,
  ramp flights/landings/aprons, rails. Doors/gates/side variants ride
  openness clocks and stay live.
- `planStretches` (staticRegister.ts): maximal bandable runs per
  register row, split at every non-bandable member (a doorway inside a
  wall run keeps its exact tie position), riding over empty gaps; ramp
  runs stay singletons (the same run registers in every chunk it
  touches — first emitter wins via runSeen). Content sig (FNV over
  member tuples + elev) computed at register build; bakes keyed
  (chunkKey|stretchKey) survive register rebuilds when sigs match — a
  door toggle two chunks over re-bakes nothing.
- THE SAME-BRUSH bake (`bakeStretch`): a probe construction discovers
  the exact (sortY, strat, elevated) sort buckets from the items
  themselves (no replicated sortY logic anywhere); then per bucket the
  ctx + camera + snap lattice + viewport swap to a pooled canvas
  (scale = gridPx = round(baseScale × targetZoom × dpr), snapDpr = 1 —
  THE CRISP GRID LAW) and the members' items are constructed again
  under the swap and drawn. `bakeVeilFull` pins wallHeightAt/
  garrisonHeightAt at rest; bakingMask guards side effects.
- Emission (`emitStretch`): cold + content-fresh → one DrawItem per
  bucket blitting via snapped-corner dest rects (the elevated-ground-
  row template — bands, ground, and live neighbours translate in
  lockstep); gridPx-stale bakes keep serving scale-compensated while
  the 1.5ms/frame budget re-bakes; hot (reveal box with the live
  gates verbatim + rear-riser row, shakes) or missing → per-member
  live path, order-exact (stretch members are consecutive in the row
  walk). SHADOWS NEVER BAKE: members' items are minted fresh for
  their live drawShadow closures.
- Receipts: bands activate (81-178 stretches across Hoargate/
  Silverfall castle/mesa; steady state 24-70 blits/frame, 0 rebakes,
  hot counts only where the reveal stands). Pixel parity: on/off
  screenshot diff heatmap at Hoargate — every differing pixel traces
  canopy sway/NPCs/fire; wall and gatehouse regions black. Perf:
  world EMA in authored towns moves only ~1.5ms (Chrome 4x) — these
  scenes are tree/cliff-dominated; the wall-dense payoff is measured
  at Phase 4's player-base fixture, and Hoargate/mesa's remaining
  cost is Phase 3's cliff scan. 420 client tests green.


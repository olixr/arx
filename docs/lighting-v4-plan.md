# Lighting v4 — THE LIGHT LIVES IN THE WORLD

Status: PHASE 1 SHIPPED (2026-08-17) — see §8 As built. Phases 2–5 not started.
Owner mandate: re-approach lighting at the foundational level — lights must read as real
sources in the 3D universe (oriented, occluded, illuminating), shadows must cover the
whole standing world, dynamic sources (spells, placed props) must carry light, darkness
must be able to matter as gameplay, and every dial must be content-configurable. Performance
stays first-class: the system must scale to a lamplit town at 120fps.

---

## 1. The as-is architecture (exploration record, 2026-08-17)

The current system is far from a naive overlay — it is a v3 engine with real ideas in it.
The re-approach must not bulldoze what already works. What stands:

### 1.1 The sky (shared, pure) — KEEP
`packages/shared/src/sim/daylight.ts`. One 20-minute cycle, clock = pure function of the
server tick (`worldMs = (tick+ofs)·TICK_MS`). `daylightAt(hours)` yields the whole sky:
sun/moon altitude, cast-shadow direction (a fan that sweeps SW→S→SE and NEVER points
up-screen), shadow length `0.35 + 1.85(1−alt)^1.6`, shadow alpha (0.34 sun / 0.12 moon,
zero through the twilight gap), keyframed ambient + horizon haze rides, `darkness`,
`flame` (man-made-fire gate). Server and client read the same functions. This layer is
excellent and survives v4 untouched except for additions.

### 1.2 The exposure map — KEEP THE BONES
`render/lighting.ts` (`LightingSystem`): ONE MAP RULES EXPOSURE. A 1/3-res canvas is
filled with the sky ambient; every light punches brightness back in with `screen`; one
down-up blur softens the field; the map multiplies over the finished world painting once.
Pools are drawn in world space through the camera transform (foreshortened ground
ellipses). Occluding lights cast real 2D shadows from greedily-merged wall rectangles
with two penumbra bands + a bounce "wrap" halo, and paint lit wall/prop faces as
continuous corner-sampled runs (`faceK` = an honest N·L). Per-lamp patch caching
(TTL-staggered, canvas-reused, zoom-tolerant) keeps a lamplit town cheap.
`DAYLIGHT IS FREE`: darkness < 0.02 skips the whole pass.

### 1.3 The sun-shadow prepass — KEEP
renderer.ts:4692–4751. One opaque offscreen layer, composited once at the frame's deepest
alpha so overlapping shadows merge instead of stacking. Three throw families: blob,
edge-quad, and TRUE-FORM silhouette masks (the painter replayed into a cached mask,
thrown with one sheared drawImage). Direction/length/alpha/color all ride the daylight
sample. Interiors punch shadows out (`SHELTERED ROOMS RECEIVE NO SKY`). Entities also
take up to 2 throws from the 6 strongest point lights (`lightThrows`).

### 1.4 The body relight — KEEP, GROW
`relightBody` (renderer.ts:57106–57272): corrects each sprite toward the exposure the
map will put at its base (lift/dim), and paints rim-light crescents — the mask shifted
away from the light, `destination-out`, `source-in` fill — "the poor man's normal map."
Budgeted at 48 bodies/frame.

### 1.5 What feeds it — THE WEAK LAYER
- The emitter roster is a ~300-line hardcoded `if/else if` over `Tile` enum values
  (renderer.ts:5008–5354). Flicker/pulse curves are inline `Math.sin` arithmetic per
  branch. `TileDef` carries zero light fields.
- The entire per-light surface is `{x, y, r, rgb, intensity, occlude?}`. No height, no
  direction/cone, no falloff profile, no curve, no per-instance override.
- Dynamic light exists ONLY as a side effect of bloom: `queueGlow` auto-promotes any
  additive glow to a non-occluding light (intensity capped 0.55) after dark, casting
  shadows one frame late, capped at the 6 strongest.
- The carried light is an implicit underground-only breathing pool on the own hero.
  There is no lantern item.
- Editor/CMS surface for light: none (only a time-of-day preview slider).
- Server knows the clock, never illumination. No light-level, no darkness gameplay.

### 1.6 The confessed flaw — THE FLOATING HALO
`drawGlows` (renderer.ts:5361–5381) stamps every emitter's visible halo as a PERFECTLY
ROUND SCREEN-SPACE radial disc, `lighter`, AFTER the multiply — un-foreshortened,
un-rotated, un-occluded, on top of everything. The lightmap's ground pools are honest
world-space ellipses, but the brightest thing the eye sees at a lantern is this floating
circle. **This is the mechanical root of "it feels like a gradient transparent overlay
pulsating on top."** The candle-family props are glow-only (no lightmap entry at all),
so they are 100% floating disc.

### 1.7 The standing contracts (from peer sessions + memory — MUST NOT silently break)
- Footprints/ground decals draw before the multiply and rely on it for night tint
  (footprints would glow at night if re-ordered).
- THE TOWN SHELF IS PAINT-ONLY BY LAW: candles/lanterns/braziers on the town/trade/
  commons decor shelves carry no light entries; LampPost owns the town night. Changing
  that economy is a design decision to put before the owner, not a refactor.
- THE TWO SUNS: the art is painted to a fixed sun (`SUN_X=-0.928, SUN_Y=-0.371` — west,
  a whisper of north) copied in terrain.ts, footprints.ts, and the pile painters; the
  cast-shadow sun transits but stays south by law (daylight.ts:127–136) because baked
  highlights must never be contradicted. Any dynamic-sun ambition must first unify these
  constants under one shared source.
- SHADOWS NEVER BAKE (static-layer law); grass composites its own shade inside drawUnder;
  the landing scene never arms shadows.
- Perf record: the world pass dominates frames, not lighting; glow-gradient rasterization
  and lamp-patch rebuild were the two historic night costs, both already fixed by caching.

---

## 2. The gap ledger — each felt failure, traced to its root

| Felt failure (owner's words) | Mechanical root |
|---|---|
| "Gradient transparent overlay pulsating on top" | Screen-space round bloom discs after the multiply (§1.6); candle family is disc-only |
| "Not rotated/skewed into the 3D universe" | Bloom ignores `yScale`; lights have no z, so a wall sconce and a floor fire light identically; halo never occluded by the post between you and it |
| "Doesn't actually illuminate things" | Multiply can only RESTORE painted color toward 1.0 — nothing ever gets brighter than its daylight paint except 48 budgeted bodies; faces respond only for walls/talls (`faceK`), ground detail and most props take pool tint only |
| "Elements outside the shadow system" | Point-light entity throws capped at 6 lights/2 throws; dynamic lights never occlude; only sun/moon use TRUE-FORM masks — lamp shadows are wall-rectangles only |
| "Dynamic sources — fireballs, placed items" | No authored dynamic light: intensity derived from bloom alpha, capped 0.55, one frame late, never occluding, no color/radius authored per ability |
| "Configurable, content-driven, players will build" | Emitters hardcoded in renderer branches; no TileDef field; no editor surface; no per-instance state (lit/unlit) |
| "Minecraft-like darkness as mechanic" | Server has no illumination model at all; nothing can ask "how dark is this tile" |

---

## 3. The laws of v4 (preserved + new)

Preserved, verbatim: ONE MAP RULES EXPOSURE · LIGHT IS GEOGRAPHY · GEOMETRY, NOT TILES ·
SHADOWS ARE NOT VOIDS · THE MAP IS FILTERED · DAYLIGHT IS FREE · NIGHT IS PLAYABLE ·
THE SUN SWEEPS BEHIND THE CAMERA · SHADOWS NEVER BAKE · SHELTERED ROOMS RECEIVE NO SKY.

New:

1. **THE LIGHT IS CONTENT.** Every emitter is a `LightSpec` in shared data. The renderer
   owns HOW light behaves, never WHICH things emit or at what numbers. A new lit prop is
   a data row, not a renderer branch.
2. **THE SOURCE HAS A BODY.** A light lives at a world (x, y, z). Its visible halo is
   world geometry — foreshortened by the camera like everything else, seated at the
   flame, occluded by what stands in front of it. Nothing about a light source may be
   painted in screen space. (The one exception: the sub-pixel emissive core glint.)
3. **LIGHT LANDS ON WHAT IT MEETS.** Illumination is a surface response, not a tint:
   ground pools take the ground; standing forms take lit faces (the face-run system
   grows to serve every standing thing); bodies take exposure + rim. One source of
   truth (the map) — every response derives from it (the relight partnership law,
   already written, now enforced for all responders).
4. **THE FLAME MAY OVERREACH.** Near its source, light is allowed to push a surface
   PAST its painted daylight value — a bounded additive lift riding the same map — so a
   brazier visibly ignites what it touches instead of merely un-darkening it. Bounded,
   tone-mapped, never blowing out line art or the outline shader.
5. **ONE SUN FOR THE PAINT, ONE FOR THE CLOCK — BOTH NAMED ONCE.** The fixed art sun and
   the transiting cast sun are both exported from shared; every consumer (terrain,
   footprints, pile painters, face runs, rims) imports them. No local copies.
6. **DARKNESS IS A NUMBER THE WORLD CAN READ.** `lightLevelAt(plane, tile, hours)` is a
   pure shared function of the sky + the data-driven emitter registry. The server may
   ask it (spawns, stealth, triggers); the client may ask it (HUD, audio); the renderer
   never depends on it (render light stays continuous and local).
7. **THE BUDGET IS ARCHITECTURE.** Every new cost ships with its cap, its LOD ladder,
   and its `?perf` bucket, measured before/after on the dense-base fixture at night.
   Lighting must stay invisible in the frame profile next to the world pass.

---

## 4. The architecture

### 4.1 L1 — THE LIGHT IS CONTENT (data model)

Shared (`packages/shared/src/world/lightSpec.ts`):

```ts
export interface LightSpec {
  r: number;                    // reach, world tiles
  rgb: [number, number, number];
  intensity: number;            // 0..1 peak
  z?: number;                   // flame height in world tiles (0 = ground)
  occlude?: boolean;            // architecture: casts wall shadows
  curve?: FlickerCurve;         // named, parameterized — replaces inline sin arithmetic
  flameGated?: boolean;         // rides sky.flame (man-made fire) — default true for warm lights
  halo?: HaloSpec;              // the visible source glow (world-space; see L2)
  cone?: { dir: number; spread: number }; // optional directional throw (hooded lanterns, windows)
}
export type FlickerCurve =
  | { kind: 'steady' }
  | { kind: 'flicker'; depth: number; hz: number }   // fire
  | { kind: 'pulse';   depth: number; hz: number }   // embers, portals
  | { kind: 'breathe'; depth: number; hz: number }   // arcane
  | { kind: 'swell';   depth: number; hz: number };  // water-lights
```

- `TileDef.light?: LightSpec` — tiles.ts gains the one field; `collectStaticLights`
  collapses from a 300-line switch to a table walk + curve evaluator (seeded per-instance
  phase from `hashCoords`, exactly as today's arithmetic does). The existing per-tile
  numbers are transcribed 1:1 — **Phase 1 is a pure refactor with a parity gate**.
- FX: `FxStyle.light?: LightSpec` — abilities author their light instead of inheriting
  `min(0.55, bloomAlpha·1.6)`. The queueGlow derivation stays as the floor for unauthored
  glows (the wornLight pattern: the floor, not the ceiling).
- Items: `ItemDef.carryLight?: LightSpec` — the lantern item exists at last; the
  underground implicit lamp becomes the fallback when nothing better is carried.
- Per-instance state: buildables/props may be `lit/unlit` (the candle toggle law already
  exists prop-side); the spec is the LIT voice, `lit=false` zeroes it.

### 4.2 L2 — THE SOURCE HAS A BODY (kill the floating halo)

The bloom pass splits into two honest parts:

- **The halo becomes world geometry.** Each emitter's glow is drawn as a foreshortened
  ellipse (x-radius `r`, y-radius `r·yScale`) seated at the source's projected (x, y, z),
  drawn INSIDE the world pass as a sorted item at the source's sortY — so the market
  stall in front of the lantern clips its halo, and a halo behind a wall dies with its
  line of sight. Composite `lighter`, but BEFORE the multiply, so the exposure map still
  governs the whole frame (footprint contract preserved; glow can no longer ride on top
  of the vignette untouched). A vertical gradient bias sells the flame sitting above its
  pool: hot at the flame's screen point, falling toward the pool's rim.
- **The emissive core stays post.** The 2–6px flame-core glint (the only thing that
  should bloom over everything, like a bright pixel blooming in a lens) keeps a tiny
  post-multiply stamp. Radius capped in DEVICE pixels, not tiles — it can never read as
  a lighting effect, only as brilliance.
- **z enters the map.** Pool center offsets by projected z along −y and the pool widens
  with height (a sconce at z=1.2 throws a wider, softer, wall-hugging pool than a ground
  fire); face runs gain a z term in `faceK` (a hung light strikes faces near its height
  hardest); cone lights clip pool + runs to their wedge (the window-spill lights become
  honest cones instead of bare pools).

### 4.3 L3 — LIGHT LANDS ON WHAT IT MEETS (the illumination response)

- **Face runs graduate to the whole standing world.** `tallH` already answers for walls,
  cliffs, trees, raised tiles. The run system gains per-class response profiles
  (stone/wood/foliage/cloth reflectance scalars — three numbers, not PBR) and serves
  non-occluding lights too (it already does; profiles make the response differ).
- **THE FLAME MAY OVERREACH — the near-field lift.** After the multiply, a second, small
  drawImage of the SAME lightmap region — windowed to values above ambient, composited
  `soft-light` at a bounded alpha (≤0.22), only within each light's inner half-radius
  (stamped per-light from the cached patch, not full-screen). Surfaces near a source get
  visibly hotter than their daylight paint; the map stays the single source of truth;
  the cost is one extra stamp per light. Full daylight skips it with the pass.
- **The relight deepens.** Rim crescents gain the light's COLOR temperature on the lit
  edge and a cool ambient-complement on the dark edge (two stamps, same mask machinery);
  the 48/frame budget stays; nearest-to-camera bodies win the budget (today it's
  iteration order).
- **Ground detail responds.** The pool sprite gains a subtle radial "texture reveal"
  band: within pools, the terrain's own detail pass re-draws its sparse marks at +alpha
  (the ground detail already exists per-tile; the lightmap exposes `exposureAt(tile)`
  so drawTileDetail can cheaply boost marks inside pools at night). Detail becomes
  VISIBLE BY LAMPLIGHT — the Minecraft feeling, earned by revealing, not repainting.

### 4.4 L4 — THE MOVING FLAME (dynamic lights, first-class)

- Authored FX lights (`FxStyle.light`) join the same frame array with `dynamic: true`;
  the one-frame shadow lag stays for remote FX (documented, invisible) but the OWN
  player's projectiles register same-frame (they're computed before the world pass).
- The cap becomes an LOD ladder instead of a cliff: nearest K (≈4) dynamic lights get
  face runs + entity throws; the next tier pool-only; the tail folds into one merged
  ambient boost per screen quadrant. A fireball volley degrades gracefully instead of
  flickering the 7th light out of existence.
- Carried lights: `carryLight` on items, worn on the rig at the hand/hip anchor point
  (the wield system knows the anchor), z from the carry pose, participating exactly as
  prop lights (occlude off — a swinging lantern must never rebuild wall patches per
  frame; the patch cache is keyed for architecture).
- Placed lights: campfire/lamp_post buildables already exist; torches/candle-lantern
  buildables become the player's Minecraft verb — place light to claim the dark. Specs
  ride TileDef like every other emitter.

### 4.5 L5 — THE DARKNESS LEDGER (gameplay)

Shared pure function, coarse by design (tile resolution, 8-bit):

```ts
lightLevelAt(hours, plane, emittersNear(tile)) → 0..1
// sky term (daylightAt ambient luminance, zero underground)
// + max over nearby emitter pools (the same LightSpec data, the same falloff)
```

- Server hooks (each its own design gate, not auto-shipped): dark-spawn tables
  (`ZoneSpawn.minDarkness`), stealth bonus in darkness, trigger facts (`dark`), night
  wildlife already keying on hours migrates to light-level where a lamp SHOULD matter.
- Client hooks: audio zones (crickets die near lamplight), the HUD lantern-oil meter if
  the survival loop ever wants it.
- NIGHT IS PLAYABLE stands: the ledger drives spawns and NPC behavior, never a black
  screen. Blindness is not the mechanic; consequence is.

### 4.6 L6 — THE STUDIO SEES THE LIGHT (configurability)

- Map Studio: placing an emitter tile shows its pool/halo live (the stage already runs
  the real renderer + clock scrubber — this is free once specs are data); a light
  inspector edits the placed instance's overrides (lit/unlit, tint within a palette,
  radius within a band) where the tile allows it.
- CMS: LightSpec editor on TileDef-backed props with live preview at four clock presets
  (the clock scrubber already exists at editor2/clock.ts).
- `?lightlab` dev page (riglab pattern): every emitter spec × 4 times of day × surface/
  underground, beside the body ruler — the mastering bench where specs get tuned once,
  in one place, instead of live-hunting towns.

---

## 5. Performance doctrine

- The map stays 1/3-res, blurred, multiply-once. Patch caching, glow-sprite caching,
  pooled throw records all stand. DAYLIGHT IS FREE stands (all of L2/L3's new work
  gates on `darkness`).
- New costs and their caps: world-space halos = one sorted item + one drawImage per
  visible emitter (bounded by today's glow count — same stamps, moved passes);
  near-field lift = one stamp per light within its patch bbox (≤ lights count, skipped
  under darkness 0.06); response profiles = arithmetic inside existing run painting;
  detail reveal = per-tile alpha boost inside existing detail pass, gated to pools.
- LOD ladder for dynamic lights replaces a hard cap — worst case COST equals today's
  (K face-run lights ≈ today's 6), the tail is one quadrant fill.
- Gates: `?perf` lighting bucket p50 at night on the dense-base fixture must not exceed
  **1.5× today's**, and absolute ≤ 2.0ms on the reference machine; Chrome 4x-throttled
  night full-frame regression ≤ 10%. Measured per phase, recorded in the plan's as-built.

---

## 6. Phases

1. **THE SPEC** — LightSpec in shared; transcribe every hardcoded emitter 1:1; renderer
   table-walks; curve evaluator replaces inline sin. Gate: pixel parity at 4 clock
   presets on a lamplit fixture (canvas diff, panning camera per the probe law), tsc + suites green.
2. **THE BODY** — halo → world-space sorted geometry + emissive core split; z on
   LightSpec + pool/face-run z terms; cone clip for window spills. Gate: live proving,
   Dawnmead + a dungeon lane, noon/dusk/midnight; the sconce/lantern/brazier read as
   seated sources from all 8 camera-relative prop orientations.
3. **THE RESPONSE** — response profiles; near-field overreach lift; colored rims;
   detail-reveal in pools. Gate: side-by-side artifact report; perf gate held.
4. **THE MOVING FLAME** — FxStyle.light + own-projectile same-frame; LOD ladder;
   carried lantern item; placeable torch. Gate: night fight proving (fireball volley,
   6+ lights, graceful degradation), rig-lane fps hold.
5. **THE LEDGER + THE STUDIO** — lightLevelAt + first two server hooks (dark spawns,
   trigger fact); Studio inspector + CMS editor + ?lightlab. Gate: an authored dark-POI
   plays differently lit vs unlit; editor round-trip proven.

Each phase commits separately (standing order), live-proven on an isolated rig lane,
documented in this file's as-built ledger.

---

## 7. Open questions for the owner (decisions, not blockers)

1. **The town paint-only law.** Today candles/most town flames are deliberately paint-only
   (LampPost owns town night — a proven readability economy). v4 makes real light cheap
   enough to reconsider. Repeal (every flame is a light at candle-scale intensities),
   keep (towns stay curated), or tier it (candle-class gets halo+tiny pool, never
   occlusion)? Recommendation: **tier it** — the law's readability intent survives,
   the floating-disc candles get bodies.
2. **Overreach strength.** The near-field lift is the single most visible taste dial
   (0.22 soft-light ceiling proposed). To be tuned live at the ?lightlab bench with you.
3. **Ledger scope.** Phase 5 ships the primitive + two hooks. Whether darkness grows
   into a survival pillar (lantern oil, dark-only spawns everywhere, farming light
   requirements) is a game-design epic to scope separately.
4. **Dynamic sun ambition.** The two-sun doctrine (fixed paint sun, transiting cast sun)
   is load-bearing for ALL baked art. v4 unifies the constants but does NOT propose a
   dynamic paint sun — that would be an art-wide repaint. Confirm this boundary.

---

## 8. As built

### Phase 1 — THE SPEC (2026-08-17)

Owner proceeded on the phased plan (§7 town-law decision still open — nothing in this
phase depended on it). Shipped as a zero-visual-change refactor:

- **`packages/shared/src/world/lights.ts`** (new): `LightCurve` (base + Σ amp·sin(t·hz +
  tx·px + ty·py), optional `times` product for the bonfire's roar-under-flicker),
  `lightCurveAt` evaluator, `EmitterGlow`/`EmitterLight`/`EmitterSpec`, and
  `EMITTER_LIGHTS` — all 30 standing-emitter tiles transcribed 1:1 from the renderer's
  hardcoded chain, each row keeping its design-lore comment. `tileEmitter(id)` is an O(1)
  dense-array lookup (cheaper per visible tile than the old ≤30-branch compare chain).
  Spec grammar captured from the originals: `rRide` (curve scales radius), `gate:'flame'`
  (LampPost's bloom rides the flame clock, not the night boost), `flameGate` (whole
  fixture stands down by day), `porch` (THE PORCH LIGHT deck lift), `air` (projAir bloom
  height), `palette` (RunePillar's hash-dealt green/violet — same salt as the painter).
- **`packages/client/src/render/emitters.ts`** (new): `collectEmitter`, the pure
  spec→frame evaluator. Renderer-free by design so the parity gate tests it directly.
  Operation ORDER preserved from the originals (float · is commutative, not associative —
  the flame-gated alpha multiplies (a·flame)·k while the boost path is (a·k)·boost,
  exactly as the old branches did).
- **renderer.ts**: `collectStaticLights`' 208-line emitter chain collapsed to the spec
  lookup + `collectEmitter` call. Still coded, by design (world-coupled): Riftgates
  (spawnPortalFx + portalsInView + PORTAL_PLANE), Table candles + chest seams
  (hash-phased queueGlow, the ring-bake strobe law), window hearth-spill (interior
  regions + the 24/frame cap), the underground amplification + carried lantern
  (phase 4). The splice was applied by an anchor-verified script (every boundary line
  asserted against expected text), not hand-retyped.
- **Law #5 landed**: `ART_SUN_X/ART_SUN_Y` exported from `shared/sim/daylight.ts` beside
  the TWO SUNS doctrine docblock; the local copies in `terrain.ts` and `footprints.ts`
  (the only two, verified by grep) now import them. `WorldLight.rgb` widened to a
  readonly tuple so shared palette tuples flow uncloned (renderer's dominant-light rim
  fields widened to match).

**The parity gate** (the phase's whole point): `render/emitters.test.ts` carries the
ORIGINAL chain verbatim as `golden` and asserts `collectEmitter` reproduces it
**bit-for-bit** (assert.deepEqual, zero tolerance) across 30 tiles × 5 tx × 4 ty ×
3 clock times × 5 (flame, boost) skies (+ porch deck lift for LampPost) ≈ 9,300
comparisons. The golden itself was then mechanically proven against git HEAD's deleted
code: all 137 substantive deleted lines appear verbatim in the test (whitespace/`this.`
normalization only). So HEAD ≡ golden ≡ new path. `shared/world/lights.test.ts` pins the
laws: the 30-tile census (a dropped row screams), flame-gated ⇒ occlude, THE TOWN LAW
(lit candles glow-only, snuffed candles rowless, LampPost flame-gated + porch-aware +
occluding architecture), palette rows deal altRgb everywhere, sane ranges.

Gates: tsc -b clean across shared/content/server/client; shared 280/280; client
**659/659** (the long-red armAssembly census pin healed by the neighbor's dbac494b ship).
No live proving owed: the refactor is provably invisible (identical arrays into
unchanged draw code).

Phase-2 note: with specs in shared, `z`/`cone`/`halo` fields land next to consumers —
do NOT pre-declare dead fields here.

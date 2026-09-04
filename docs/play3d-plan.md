# PLAY3D — THE SECOND DOOR

The separate 3D client ("Immersive") beside Classic, approved in
`docs/perspective-review-and-3d-client-plan.md` §5–§8. This document is
the as-built record: what stands, what law it stands on, how to run it,
and what is placeholder. It is updated per phase; S1 stood the engine
up standalone, S2 wired it to the live game, S3 answered two
independent reviews of S1+S2.

Branch: `epic/play3d` (cut from main `b4c00f2e`). Nothing under
`src/render/` is EDITED by this program — the 3D client ADDS files
(`src/play3d/`, `src/render/npcRoster.ts`) and calls the shared
painters. The shared-file changes it does make are listed honestly in
§S3 "The shared-file truth".

---

## S1 — THE SECOND DOOR (engine skeleton, standalone) — SHIPPED

**What it is:** `packages/client/play3d.html` + `src/play3d/` — a
Three.js (r185, WebGL2) scene that renders REAL Arx terrain (the
`@arx/content` worldgen at `WORLD_SEED` with the real Dawnmead ZoneDef
stamped over it by the server's own overlay law), the real terrain
baker's art on a real heightfield with real vertical cliff faces, the
real tree/flora painters as instanced billboards, and five walking
humanoids on the production rig (`drawHumanoid` + `LegSolver`, one
with a `CapeSim` cloak). No server. S2 puts `ClientGame` behind the
world seam.

### Modules (each header explains its law)

| file | what | real / placeholder |
| --- | --- | --- |
| `engine.ts` | `createRenderer` factory (WebGL2 now; `webgpu` kind is a named refusal), scene, PerspectiveCamera on the orbit rig, DPR cap (2 / 1.5 past 3.5M CSS px), resize, `webglcontextlost/restored`, fixed-step 30 Hz sim accumulator + render alpha, `renderer.info` reset per frame, `dispose()` | real |
| `orbit.ts` | pure orbit math: yaw free, pitch clamped 0.3–1.2 rad, dolly 5–44, exponential eases, camera-relative WASD | real (tested) |
| `world.ts` | `WorldSource3D` seam; `StandaloneWorld` = `generateChunk(WORLD_SEED)` + `overlayZone` (server's law verbatim) + edge-harmony profile for Dawnmead | real data; only Dawnmead registered |
| `heightfield.ts` | pure: per-tile flat quads at level·`ELEV_H`, ramps sloped toward the high neighbour, vertical faces emitted ONCE by the higher tile with its own texture rect, UVs inset past the bake gutter | real (tested); faces stretch the tile rect (S2: cliff face painter) |
| `ground.ts` | chunk streamer: geometry now, bake soon (`startChunkBake` stepped under a ms budget, ≤2 in flight, nearest first), **THE LEVELS COMPOSITE** (per-level `startElevatedBake` canvases landed back onto the base canvas at `rowOrigin`), one `CanvasTexture` upload per chunk (sRGB, mipmapped, anisotropy 8), load ring 2 / evict ring 3 with full dispose + byte ledger, lamp scan | real |
| `billboardMaterial.ts` | ONE shader pair: yaw-only billboard turned in the vertex shader from a shared `uYaw`, opaque + depth-write + alpha discard, fog chunks, crown sway; the depth variant reads `uSunYaw` = **the shadow proxy folded into the shader** (no second mesh); `BillboardBuffer` = InstancedBufferGeometry over typed arrays | real |
| `sprites.ts` | `SpriteAtlas` (2048² shelf-packed pages, painted once, ringed with the outline law, uploaded once); `buildChunkStatics` (trees, saplings, wild flora → one draw per (chunk, page)); `EntityBillboard` (per-body canvas, repainted only when visible AND moved/settling/idle-breath cadence; facing and feet rotated by camera yaw: `relDir = dir + yaw`) | real; statics = trees/saplings/BerryBush/FibrePlant/WildSagewort only |
| `outline.ts` | the 8-tap integer dilate ring under the art (Renderer.bakeOutlineRing, ported) | real |
| `lights.ts` | sun DirectionalLight + PCF shadow map (2048, ±30-tile ortho, texel-snapped follow), HemisphereLight fill, opposing fill, depth fog, fixed pool of 8 PointLights dealt to the nearest lamp posts / campfires, `setDay(k)` drives sun/fog/tint | real; CSM is S3 |
| `post.ts` | EffectComposer: RenderPass (linear half-float + DepthTexture) → `InkPass` (depth-edge ink ring, tilt-shift, grade, vignette in one pass, reads `readBuffer.depthTexture`) → OutputPass (owns the sRGB encode — the spike's `pow(1/2.2)` gotcha dissolved) | real; `P/I/T` toggles |
| `hud.ts` | the confession overlay: rAF ms EMA/worst, renderer.info, chunk/bake/atlas/byte ledgers, 4 Hz | real |
| `input.ts` | S1: drag orbit, wheel dolly, WASD | REWRITTEN in S2 (PointerRig + LiveInput) |
| `dummies.ts` | `Walker` dummies | REMOVED in S2 (entities are live) |
| `main3d.ts` | composition + `window.__play3d` probe | — |
| `chunkRing.ts`, `atlasPack.ts` | pure: integer chunk keys, nearest-first ring, shelf packer | real (tested) |

### Laws that hold

- **A real projection and a depth buffer, everywhere.** No painter's
  sort. Billboards depth-test and depth-write with an alpha cut.
- **Painters are the shared art; emission is per-client.** `paintTree`,
  `paintPlant`, `drawHumanoid`, `drawCape`, `bakeChunk`/`startElevatedBake`
  are called unchanged. New painters register as a `PaintSpec`, not a
  port.
- **Upload once.** Chunk textures and atlas pages upload once; entity
  canvases upload only on repaint; static instance buffers upload at
  chunk build. No per-frame texture writes for anything static.
- **Yaw 0 is the 2D frame.** Camera south of the target looking north;
  a body's painted facing is `dir + yaw`, its feet offsets rotated by
  yaw. The pitch ceiling (1.2 rad) is the billboard's honesty — above
  it a yaw-only quad flattens to a sliver.
- **The high tile owns the face.** Vertical faces are emitted once,
  with the higher tile's art, so chunk borders never double-emit.
- **The light grounds, it does not re-shade.** Painted art carries its
  own shading; hemisphere fill is generous, the sun moderate;
  billboards are unlit and follow the mood through `uTint`.
- **No per-frame allocations in the hot loops** (ring entries reused,
  feet arrays reused, `Vector3`s owned by the rig, uniforms shared).
- **Dispose is explicit.** Chunk eviction disposes geometry, both
  materials, the texture and the chunk's instance buffers; the HUD's
  byte ledger goes down when it does.

### How to run

```
cd packages/client && node_modules/.bin/vite --config vite.config.play3d.ts --force
# → http://localhost:5243/play3d.html
node dev/play3dShots.mjs          # S1's standalone LOOK gate — REMOVED in S2 (the page is live now; see play3dLive.mjs)
```

`node_modules` note: this worktree's root `node_modules` is a real
directory holding `three`/`@types/three` plus symlinks to the shared
install's entries (npm replaced the symlinked root when `three` was
added). `package.json` + `package-lock.json` carry the pins
(`three@0.185.1`, `@types/three@0.185.4`); a plain `npm install` on any
checkout reproduces it.

Controls: drag orbit · wheel dolly · WASD walk · N night · P post ·
I ink · T tilt · H hud. Probe: `window.__play3d.{setCamera, tp, day,
post, ink, tilt, settle, stats, walkers, dispose}`.

The Playwright harness launches the installed Google Chrome
(`channel: 'chrome'`, headless, ANGLE Metal) because the Playwright
headless shell is not downloaded on this rig.

### Gates (S1 commit)

- `npm run typecheck` green (all packages); `npm run test -w @arx/client`
  1046 pass (10 new pure tests in `play3dPure.test.ts`);
  `check:cycles` at baseline.
- Shots (1440×900, dpr 1, headless Chrome — LOOK only):
  `dev/play3d-shots/s1-{low-across,top-down,close-body,night-across,cliffs,cliffs-low}.png`.
- Headless indications at the Dawnmead spawn ring (25 chunks painted):
  ~50 draw calls, ~50k tris, 9 programs, 349 standing instances in 20
  draws, 1 atlas page (55 sprites), ground textures 80 MB. At the
  worldgen terraces NE of Dawnmead: 1003 cliff faces, 1661 instances in
  33 draws, 2 atlas pages. Headless frame ms sits at the rAF cap; it is
  not an fps claim. The teleport frame's 300 ms worst is the settle
  probe's deliberate 50 ms bake budget plus ~180 new atlas sprites.

### Known placeholder / not yet

- **Structures, props, water, FX, grass.** Walls, fences, docks, the
  Waking Ring's standing stones, stations, drops, particles are NOT
  stood up — only what the flat bake paints (floors, paths, water
  colour) plus trees/saplings/wild flora. This is Workstream 2's
  `PropKind` registry. `grassGpu*` is the model lane and is not wired.
- **Cliff faces** stretch the high tile's top rect; the 2D contour
  rim (marching squares) vs. the square tile geometry shows as dark
  wedge corners. S2: contour-shaped plateau geometry + a cliff face
  painter atlas (`cliffArt` tones).
- **Billboards receive no shadows** (unlit shader; the spike's known
  gap). S3: shadow-map sampling in the billboard fragment.
- **Ground texture density** is 24 px/tile (2.4 MB per chunk); close
  orbits read soft. A distance-tiered bake (32 near / 16 far) is the
  2D client's LOD law and is the obvious next lever.
- **Only Dawnmead** is registered for the edge-harmony profiles; other
  towns' hems would differ from the live server far from Dawnmead.
- **Beasts** (`drawBeast` on `LegRig`) are not yet billboarded — the
  spike proved the glue; S2 brings them with entities.
- **WebGPU backend** is a named refusal in the factory: no
  `navigator.gpu` in the headless rig to prove it on.
- **Input** is the dev page's; S2 adapts `InputManager`/`touch.ts`
  through a raycast pick.

### Next as written at S1 (superseded by S2 below)

1. `LiveWorld` over `ClientGame` chunks (the seam is `WorldSource3D`);
   entities → `EntityBillboard` (humanoid + beast), interpolation from
   the net snapshots; `main.ts` wiring forked with the renderer
   swapped and a `ViewAdapter` for `ui/`.
2. `PropKind` registry: flat billboard / proxy mesh with painted faces /
   ground decal / animated sprite; walls, fences, hedges, decks as
   meshes with painter face atlases.
3. Contour plateau geometry + cliff face atlas; water shader plane.
4. Real-hardware fps probe on the M4 in Dawnmead as the standing gate.

---

## S2 — THE LIVING WORLD (wired to the real game) — SHIPPED

**What it is:** `play3d.html` now signs in through the production
`ClientGame` over `/ws` (the shared rig-36 backend through the vite
proxy), streams the server's chunks into the S1 ground streamer, stands
every Player/Npc entity up as a billboard on the production rigs at the
2D client's own interpolation timeline, predicts the own body exactly
as main.ts does (the same `game.update(now)` call), takes click-to-move
/ click-to-use / click-to-strike through a heightfield pick, mounts the
DOM chrome index.html carries (login, chat, hotbar, the Character case,
the dock, the Display bench, vitals, speech bubbles, waypoint/party
pointers, the net pill, the crossing veil), and survives a plane
crossing by dropping and refilling the world under the body.

### Modules added / changed

| file | what | real / placeholder |
| --- | --- | --- |
| `src/ui/viewAdapter.ts` (**shared**, type-only) | `ViewAdapter`: `screenAnchor`, `pickWorld`, `camera {scale}` (S3 trimmed the unread zoom members and moved the Display-bench lanes out into the separate `ViewDisplayFlags`). `waypointHud`, `partyHud`, `speechBubbles` take it instead of `Renderer`; the 2D `Renderer` satisfies it structurally (main.ts unchanged; a compile-time assertion in `play3dPure.test.ts` proves it) | real |
| `liveWorld.ts` | `WorldSource3D` over `ClientGame.world`; `ready()` false until the wire delivered the chunk; absent-chunk answers = the 2D client's (elev 0, ground undefined = solid) | real |
| `ground.ts` | + `ready` gate (no empty stand-ins), `refresh()` (evicts records whose chunk object or `rev` moved — patches AND neighbour fringe bumps — for re-admit + re-bake), `reset()` (plane crossing) | real; re-bake grain is the whole chunk (the 2D strip re-bake is finer) |
| `entityBillboard.ts` | the body card, generalised: `BodyKind = humanoid \| beast`; `drawHumanoid`+`LegSolver` or `drawBeast`+`LegRig` (`beastSpec`); feet/pole/facing rotated by camera yaw; paint gated on moved/settling/pose-turn/kit-change/idle cadence; `setKind` swaps the kit without a new mesh; nameplate painted on the card in the 2D inks | real; dialect looks, legless painters, owls, mounts, ragdolls not ported |
| `bodies.ts` | `EntityStage`: walks `game.entities`, samples `buffer.sampleSmoothed(game.renderTime())`, derives the kind from meta (appearance → humanoid; humanoid-monster roster → humanoid in def colour; else beast from `npcDef`), disposes bodies the frame they vanish; own body = `predictor.renderPos()` + `game.aim` + `effectiveOwnPose` + `game.equipment` | real; ItemDrop/ResourceNode/Prop/Projectile/BuildSite not stood up; dead bodies hidden |
| `pick.ts` | pure ray-march + bisect against `heightAt` (tested) | real |
| `input.ts` | `PointerRig`: either-button drag orbits, wheel dollies, a left press under 5 px is a click on release, no context menu. `LiveInput extends InputManager`: THE KEYS FOLLOW THE CAMERA (`moveAxes` rotated by orbit yaw — pad stick and touch ride the same turn), focus/attack target is a hidden sink so a click never swings, `attackHeld` adds the Attack bit for the click-strike pulse | real |
| `view.ts` | `Play3DView implements ViewAdapter` over the Three camera (project with terrain height; behind-lens points pushed off-screen for the pointers; `scale` = px/tile at the orbit depth; zoom ⇄ dolly; `pickWorld` = pick.ts) | real |
| `vitals.ts` | HP bar + combat level as DOM (the 2D client paints its vitals on canvas) | real |
| `shell.ts` | the chrome: loginFlow, ChatUI (with local `/3d …` commands), Hotbar, Panels (pack/worn kit/skills; explicit verbs), dock rail (Pack / Skills / Settings only), Display bench, LookCreator, SpeechBubbles, Waypoint/Party HUDs, net pill, crossing veil, `GameEvents` | real; the other screens are named-unmounted. **S2 as shipped:** the bench was mounted WITH the canvas2d lane rows, which governed nothing here yet wrote Classic's `arx.stage/lean/stageres/reflections/waterfx` keys — fixed in S3 (the bench takes `lanes: ViewDisplayFlags \| null`; this door passes null) |
| `main3d.ts` | composition: frame order = pointer → orbit; aim from the cursor pick (re-picked only when the mouse moved); `game.update`; `ground.refresh` when `worldVersion` moved; stream around the predicted body under 6 ms; sky follows body + server clock (`clockHoursNow` → sun elevation → `setDay`); bodies; chrome; post. THE CLICK: foe in reach → aim + Attack pulse; target in reach → interactNpc / pickupWalk / interact; loot → pickupWalk; foe out of reach → walk to it; else `walkTo` (pathfinder) or "No path there." | real |
| `play3d.html` | index.html's `#login` and `#hud` scaffolding copied verbatim (+ `#focus-sink`, `#hud3d`, `#vitals3d` styles) | real |
| `dev/play3dLive.mjs` | the LOOK gate: sign in as the probe, `/museum` plane check, THE VERIFIED TELEPORT (re-send until the predictor lands), settle, click-walk through the page's own click law, crossing proof | real |

### Laws that hold (S2 additions)

- **One timeline, both doors.** Remote bodies render at
  `game.renderTime()` through `sampleSmoothed`; the own body at
  `predictor.renderPos()`. Nothing in `src/play3d` re-derives
  interpolation or prediction.
- **The wire is the ground.** A chunk stands up only after the server
  dealt it; a chunk whose `rev` moved (patch or neighbour fringe) is
  torn down and re-admitted; a plane crossing resets the ring. There
  is no second world model.
- **The keys follow the camera.** W walks where the camera looks; the
  server sees an ordinary move vector.
- **A click never swings by accident.** The InputManager's mouse target
  is a hidden sink; the Attack bit comes from the keymap, the pad, or a
  deliberate click on a foe in reach.
- **The chrome reads a seam.** Every DOM piece that pins to the world
  reads `ViewAdapter`; the 2D Renderer is one implementation, the 3D
  view another. (S2 claimed this seam was the program's ONLY shared-
  file change; that overstated it — see §S3 "The shared-file truth".)

### How to run (S2)

```
cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts --force
# → http://localhost:5243/play3d.html  (proxies /ws,/dev,/voice → :8814)
node dev/play3dLive.mjs               # the LOOK gate: dev/play3d-shots/s2-*.png
```

(`packages/client/node_modules` is a dangling symlink in this worktree;
use the root `node_modules/.bin/vite`.)

Controls: click = walk / use / strike · drag = orbit · wheel = dolly ·
WASD (camera-relative) · Space attack · I / K / O screens · Esc close ·
F2 the confession · chat `/3d night|day|clock|post|ink|tilt|hud`.
Probe: `window.__play3d.{setCamera, day, post, ink, tilt, click,
settle, stats, dispose}`, `window.dcGame`.

### Gates (S2 commit)

- `npm run typecheck` green (all packages — the 2D client compiles
  against the adapter unchanged); `npm run test -w @arx/client` 1050
  pass (4 new: pick, kindKey, elevLevels, + the Renderer-satisfies-
  ViewAdapter assertion); `check:cycles` at baseline.
- Shots (1440×900, dpr 1, headless Chrome — LOOK only), live against
  rig-36 as `perf12_probe`: `s2-interiors` (/tp −430 −290, click-walked
  2.75 tiles), `s2-interiors-low`, `s2-meadow` (/tp 42 20, click-walked
  1.94 tiles), `s2-meadow-close`, `s2-meadow-night`, `s2-museum-plane`
  (the `/museum` crossing: store 25 → ring 25/25 on plane `museum`,
  0 entities, 0 faces).
- Headless indications at the interiors scene: ~105 draws, ~64k tris,
  9 programs, 30/30 chunks painted, 1742 faces, 452 standing instances
  in 41 draws, 73 bodies over 72 entities, ground textures 92 MB.
  Meadow: ~64 draws, 1883 instances in 24 draws, 22 bodies. Frame ms
  sits at the headless rAF cap; not an fps claim.

### Known gaps (S2 ledger — what is NOT there yet)

- **Structures / props.** Walls, doors, fences, hedges, docks, awnings,
  signs, stations, chests, lamps as bodies, the Waking Ring, gravestones
  — only what the flat bake paints (floors, paths, rugs) plus
  trees/saplings/wild flora stand up. The interiors scene reads as
  floors without walls. → W2.
- **Entities not stood up:** ItemDrop (loot bags), ResourceNode bodies
  beyond tile art, Prop, Projectile (tracers), BuildSite. Dead bodies
  hide instead of ragdolling; corpses/loot piles absent.
- **Body dialects not ported:** goblin/skeleton/kobold/gnoll/golem/
  ogre/skral/hobgoblin looks (they paint as plain humanoids in the
  def colour at a rough stature), oozes/bats/adders (legless
  painters), owls, mounts, worn-light auras, status FX, hit flashes
  beyond `hurt`, sheathed carry, draw charge.
- **FX / water / grass:** no particles, no status ambience, no water
  shader (water is the bake's flat colour), no GPU grass (the
  `grassGpu*` lane is unwired), no footprints, no weather.
- **Lighting:** billboards are unlit and receive no shadows; sun/fill
  are the S1 rig; interiors are not darkened; the day curve is a
  cosine of the server clock, not the 2D sky's palette. → W3.
- **Camera:** orbit only; no collision with cliffs/walls, no auto-yaw
  on walk, no zoom-to-interior. → W4.
- **Chrome not mounted:** station/bank/shop/build/stable screens,
  loot panel/ground list, quest journal, map, social, arena, keys,
  companions, beast hall, dialogue cinema, banners/ceremonies, audio,
  pad UI ring (UiNav), touch controls, build mode. Clicking a bench in
  reach says so in chat.
- **Re-bake grain:** a tile patch re-bakes the whole chunk (geometry,
  statics, texture); the 2D client's strip re-bake is finer.
- **Interiors** are not resolved as rooms (no roof fade / region veil).

### Next — the workstreams (from docs/perspective-review-and-3d-client-plan.md)

1. **W2 — structures as geometry.** `PropKind` registry: flat
   billboard / proxy mesh with painted faces (walls, fences, hedges,
   docks as extruded runs textured by the painter face atlas) /
   ground decal / animated sprite; loot bags, projectiles, corpses.
2. **W3 — lighting.** Shadow-receiving billboards (sample the shadow
   map in the billboard fragment), CSM, the 2D sky palette driving
   sun/fog/tint, interior darkening + lamp warmth, water plane.
3. **W4 — camera.** Collision-aware orbit (cliffs/walls push the
   dolly in), soft auto-yaw on long walks, interior framing, the
   pitch ceiling revisited once bodies can foreshorten honestly.
4. **W5 — the door.** The Classic/Immersive switch on the front door
   and in Settings, one login shelf, shared token; a real-hardware
   fps probe on the M4 in Dawnmead as the standing gate.

---

## S3 — THE REVIEW ANSWERED — SHIPPED

Two independent reviewers examined S1+S2 and returned 24 findings.
Every one was re-verified against the sources (three r185's
`WebGLRenderer.js` / `EffectComposer.js`, ClientGame, main.ts, the
server's session handler) before anything moved. The ledger:

### Fixed (verified true)

| # | finding | what stands now |
| --- | --- | --- |
| 1 | **Lamp pool toggled `visible`** → three skips invisible lights before `pushLight`, so `NUM_POINT_LIGHTS` moved and every lit shader recompiled | `lights.ts`: THE POOL NEVER CHANGES SIZE — 8 lights visible from birth, parked at intensity 0 (and y = −1000) when undealt. Programs 9 → 7 in the probe |
| 2 | **Atlas pages re-uploaded whole** (`needsUpdate` = 16 MB texImage2D + full mip regen) each time a variant landed | `sprites.ts` + `Backend.blit`: the page goes resident blank ONCE (`prepareTexture`); each sprite is painted on its own exact-size canvas and landed by `copyTextureToTexture` (texSubImage2D; r185 regenerates mips itself on a level-0 copy, done once per page per flush). Shelf pad 2 → 8 px. Confession: "2 page uploads, 220 blits" for 220 sprites |
| 3 | **Per-entity per-frame allocations** (`kindFor` object + `kindKey` with `JSON.stringify(look)` for every remote body every frame) | `bodies.ts`: the kind is derived once per META — cache keyed on `remote.meta` identity (ClientGame replaces it wholesale) plus the two collar facts (`stock`, `ownerEid`) |
| 4 | **The WebGPU seam was nominal**: the factory returned the concrete `WebGLRenderer`, Engine/post/billboards were typed and written on WebGL | `stageBackend.ts` (type-only seam: `StageRenderer` Pick, `Backend`, `PostStage`, `BillboardFactory`) + `backend/createBackend.ts` (THE ONE FACTORY) + `backend/webgl.ts` / `webglPost.ts` / `webglBillboard.ts`. Nothing outside `backend/` imports `WebGLRenderer`, the jsm composer, or a GLSL string; the engine is typed on `StageRenderer`; context loss reaches it through `watchContext`; the lanes take a `BillboardFactory`. The `webgpu` kind refuses from one place |
| 5 | **`frame` ran before the camera was placed** (frustum, pick, anchors read last frame's matrices) | `engine.ts`: `frame` → placeCamera + `updateMatrixWorld` → `late` (frustum, bodies, pick/aim, chrome) → `draw`; `renderOnce` keeps the order |
| 6 | **Dead 30 Hz accumulator** (empty `sim` hook, unread alpha) | Deleted; header says truthfully that ClientGame steps itself |
| 7 | **Composer targets transiently at dpr²** (target built at drawing-buffer size, then `setPixelRatio` multiplied again) | `webglPost.ts`: the redundant `setPixelRatio` is gone; `resize` is the only sizing path |
| 8 | **Canvas MSAA bought nothing** with post on (scene into a `samples: 0` target) | Composer target `samples: 4`; canvas `antialias: false`. The ink ring reads the resolved depth (close-up shot) |
| 9 | **Shadow snapped on the world grid** (the sun is tilted: not the texel grid) and a fixed ±30 span | `lights.ts`: `snapToLightTexel` projects the follow point onto the light's constant right/up axes, rounds there, projects back (tested); `shadowSpanFor(dist)` 24..56 in 8-tile steps |
| 10 | **HUD record + `groundIn` closure minted every frame** though the overlay flushes at 4 Hz | `Confession.due(now)` gates the record; `groundIn` hoisted |
| 11 | **Idle repaint every 180 ms** for every visible body; cape points array per paint | 400 ms, staggered by seed (+0..140 ms); cape points preallocated. The vertex-stage breath (zero repaints) is named as the crowd round's lever |
| 12 | **Bake canvases retained after upload** (~2.4 MB × ring) | `ground.ts`: THE CANVAS PAYS ONCE — `tex.onUpdate` shrinks the canvas to 1×1; `stats.canvasBytes` confesses what is still held (in flight, or baked-but-culled-so-never-uploaded); context restore → `ground.reset()` re-bakes |
| 13 | **Pass resources leaked** on `PostStack.dispose`; probe interval/keydown never cleared | RenderPass/InkPass/OutputPass disposed; `orbitSaveTimer` + `onHudKey` torn down in `probe.dispose` |
| 14 | **Humanoid roster hand-copied** from renderer.ts npcItem | `src/render/npcRoster.ts` (an ADDED file) + `npcRoster.test.ts`, which parses the inline predicate out of renderer.ts and asserts the two agree — the drift guard until renderer.ts can take the import |
| 15 | **Pick marched up to 880 samples** on a sky ray | `pick.ts`: level/climbing-from-above rays miss at once; adaptive stride (¼ tile near the surface, up to 1½ high above it) — the distant-plane test lands within 0.05 tiles in < 120 samples where the fixed stride took ~470; `view.ts` clamps the range to `camera.far` |
| 16 | **Resize only from the window event** | ResizeObserver on the canvas + re-armed `(resolution: Ndppx)` listener; window listener kept as fallback |
| 17 | **Display bench wrote Classic's keys** from inert 3D flags | `displaySettings.ts` takes `lanes: ViewDisplayFlags \| null` (main.ts's call is unchanged: `Renderer` satisfies it); the 3D shell passes null and the stage/lean/resolution/water rows are not built. `ViewDisplayFlags` is no longer part of `ViewAdapter` |
| 18 | **Talk NPC click opened an invisible server-side dialogue** (the body held in a talk with no cinema) | `shell.ts` mounts `DialogueCinema` (a real `Sfx` over the lazy `AudioEngine`): `onDialogueOpen/Node/Close`, `input.cinemaCapture`, keyboard routed to `cinema.handleKey`, pad `tickPad`, world clicks / aim / screens suppressed while open |
| 19 | **`game.aim` went stale under a still cursor** | The pick stays gated on mouse movement; the picked ground point is cached and `game.aim` is recomputed every frame from `predictor.renderPos()`; held for the click-strike pulse |
| 21 | **`ViewCamera` carried zoom members nothing read** | Trimmed to `{ scale }`; the zoom⇄dolly mapping is gone |
| 22 | **Own-kit cache missed `setCarryStyle`** (mutates in place, no new equipment object) | `carryStyle`/`carryOff` compared in the cache test |
| 23 | **Catch-all `game.interact` for target kinds Classic routes through a panel** | `plot/trough/bin/work/sign` join the named refusal; `crop` routes by `cropVerb` (fertilize/mulch/prune/else interact) as main.ts does |
| 24 | **Plan overstated "the only shared-file change"** and marked the bench "real" | Corrected in §S2 and below |

### Answered without the proposed refactor (with the evidence)

- **#20 — duplicated chrome markup / auth lifecycle / Panels callbacks.**
  True: `play3d.html` carries index.html's `#login` + `#hud` region
  verbatim and `Shell.onStatus` mirrors main.ts's auth handling. The
  proposed fix (a shared `ui/chromeMarkup.ts` both pages render, an
  `ui/authLifecycle.ts`, a `makePanels`) requires EDITING `index.html`
  and `main.ts`, which this program is forbidden to do on this branch
  (a sibling branch is inside those files). What S3 ships instead is
  the missing SIGNAL: `play3dChrome.test.ts` asserts (a) the copied
  region is byte-equal to index.html's (whitespace-normalised, the
  `#hud3d` block excepted) and (b) every id `shell.ts`/`main3d.ts`
  look up exists in `play3d.html`. The dedupe is W5's first item.

### The shared-file truth (what this program changes outside `src/play3d/`)

| file | change | shipped to prod? |
| --- | --- | --- |
| `packages/client/package.json` + root `package-lock.json` | `three@0.185.1`, `@types/three@0.185.4` as devDependencies (additive; nothing on main imports three) | tooling only |
| `packages/client/vite.config.ts` | `play3d.html` added to the PRODUCTION rollup input | **yes — intended by the program's charter** ("add play3d.html as a rollup input"); until W5 there is no link to it from the landing page or Settings, and it shares the origin's `arx.token`, so a player who types the URL signs in as themselves. If a gate is wanted before W5, the `withStudios`-style flag is the shape |
| `src/ui/viewAdapter.ts` (new) | the type-only seam | type-only |
| `src/ui/displaySettings.ts` | signature `(lanes: ViewDisplayFlags \| null, setLootPref)`; lane rows built only when lanes are passed | main.ts unchanged (passes `renderer`) |
| `src/ui/speechBubbles.ts`, `waypointHud.ts`, `partyHud.ts` | one-line retypes `Renderer` → `ViewAdapter` | behaviour-identical |
| `src/render/npcRoster.ts` (+ test) | ADDED, not edited | not imported by the 2D client yet |
| `play3d.html` | the second door's page (copied chrome + its own `#hud3d`) | yes, with the vite entry |

The token IS already shared (same origin, same `arx.token` key) — W5's
"shared token" item is done by construction; what W5 owns is the
door itself (the Classic/Immersive switch and one login shelf).

### Laws that hold (S3 additions)

- **One backend, one file.** `backend/createBackend.ts` is the only
  place a GPU API is named; `stageBackend.ts` is type-only so every
  lane imports it without pulling WebGL.
- **A page uploads once.** Atlas pages go resident blank and take
  sprites by sub-rect; the page canvas stays as the context-restore
  mirror. Chunk bakes release their canvas the moment the upload lands.
- **The light count is a constant of the scene.**
- **Nothing reads a stale camera.** `late` runs after the camera is
  placed.
- **The bench shows only switches that govern something here.**
- **A conversation is readable.** The cinema is mounted before any
  click can open one.

### Gates (S3 commit)

- `npm run typecheck` green; `npm run test -w @arx/client` **1058
  pass** (+8: pick early-out + adaptive stride, shadow span, light-
  space snap, chrome verbatim + id coverage, roster drift + predicate);
  `check:cycles` at baseline (3/0/0/1).
- Shots (1440×900, dpr 1, headless Chrome — LOOK only), live against
  rig-36 as `perf12_probe`: `s3-interiors` (click-walked 2.75 tiles),
  `s3-interiors-low`, `s3-meadow` (click-walked 1.94 tiles),
  `s3-meadow-close` (the ink ring on the MSAA-resolved depth),
  `s3-meadow-night`, `s3-museum-plane`. Console clean.
- Headless indications: interiors 116 draws / 75k tris / **7 programs**
  (S2: 9), 30/30 chunks, 452 instances in 26 draws, atlas 81 sprites =
  1 page upload + 81 blits; meadow 81 draws, 1883 instances in 38
  draws, atlas 220 sprites = 2 page uploads + 220 blits, ground 77 MB
  GPU with 24 MB of bake canvases still held (baked, frustum-culled,
  not yet uploaded — honest, and released on first draw). Frame ms sits
  at the headless rAF cap; not an fps claim.

### Next

Unchanged from S2's workstreams, with three S3 hand-offs: W5 begins
with the chrome dedupe (#20); the crowd round takes the vertex-stage
idle breath (#11); CSM (#9's remainder) stays in W3.

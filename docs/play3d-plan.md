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

---

## W2 — STRUCTURES AS GEOMETRY WITH PAINTED FACES

Walls, doors, windows, diagonals, awnings, the garrison, fences,
palisades, hedges, iron fences, docks/bridges/porches and cliff faces
become REAL MESHES textured by the existing procedural painters, so
the 3D client stops showing floors without walls. The data contract
(the structure grammar + painter map, with file:line anchors) is
`docs/play3d-w2-map.md`. Four lanes: SCAFFOLD (this section, ran
alone), then WALLS / BARRIERS / TERRAIN-FORMS in parallel from the
scaffold commit, then INTEGRATE.

### W2 SCAFFOLD — as built (2026-09-04)

**What stands** (`packages/client/src/play3d/structures/`; every
module header states its laws):

| file | what | real / placeholder |
| --- | --- | --- |
| `structKinds.ts` | PURE per-tile classification over `{groundAt, detailAt, elevAt}`: `family` ('wall'/'garrison'/'fence'/'palisade'/'hedge'/'iron'/'deck'/'cliff'/'none'), wall `material` ('stone'/'wood'/'cave', doorways by door material), `isWindow`, `diag` (diagWallInfo), `barrierDiag` ("/" NE or "\" NW), `door` (doorInfo), `sideDoorway`, `awning`, `wallHung`, `deckKind`, `elev`/`lift`; RUN CONTINUITY `runN/E/S/W` by the 2D rules — `wallish` (WALL_RUN_TILES minus side doorways, renderer.ts:8718 + isSideDoorway ported verbatim), `garrisonish` (GARRISON_TILES minus side gates, renderer.ts:11514), the separate-masonry law for the four barrier families (same-set only), bridge+dock one class / porch its own, cliff rim; `corner*` diagonal-neighbour flags for barrier turns; `scanChunkStructs` (tiles by family, scan order); `snapshotWithBorder` (THE BORDER IS READ ONCE: chunk + 1-tile ring copied out of the world); `gridSampler` for tests/labs; the 2D heights restated with sources (WALL_H 2.05, WALL_STUB 0.62, GARRISON_H 3.4, MERLON_H 0.5, HED_H 0.95, FENCE_POST_H 1.72, PALISADE_H 1.66, ELEV_H 1.35, DOCK_LIFT 0.22) | real (13 tests: 5×5 house with side + south doorway, windowed run, diagonal corner, fence pen with gate + "/" corners, cross-family adjacency fence/wall + garrison/wall + hedge/iron, garrison side gate, decks/cliffs/lift, awnings, chunk scan through the border, sink winding, tones, constants vs their 2D homes) |
| `structSink.ts` | PURE quad sink bucketed by (material kind, atlas page); winding corrected against the declared normal; `face(...)` (vertical face a→b, y0→y1, atlas rect u W→E / v base→crown) and `top(...)` (horizontal quad) helpers; `drain()` → typed arrays per bucket | real (tested) |
| `faceTone.ts` | PURE `litTone(hex, k=0.18)` (LAMBERT EATS A STOP — lift 2D palette tones for lit faces) and `shadedTone` (the REAR RISER's back-face shade) | real (tested) |
| `faceAtlas.ts` | `FaceAtlas` over ShelfPacker: 2048² sRGB CanvasTexture pages, pad 8, `get(key, () => {w, h, paint(ctx,w,h), bleed?})` → `FaceRef {page,u0,v0,u1,v1,w,h}` (v0 = ground base, v1 = crown), resident blank on mint + sub-rect `Backend.blit` per tile on `flush()`; THE PAD WEARS THE EDGE (opaque tiles replicate their border into the pad so mips never blend with transparent black; cards pass `bleed:false`); `FACE_PX = 48` px/tile | real (no tile minted yet) |
| `stubHost.ts` | `makeStubHost(ctx, scale)` → `StubHost {ctx, camera{scale, yScale 0.6, snapPx, worldToScreen(Into)}, w, h, outlineOn:false, frameDt 0, frameNo 0, game:null, breezeAt→still air, beginStructOutline}` — the eight members the amber painters read (verified by grepping each body: paintGarrisonMasonry/merlonBox → ctx; drawFencePost/giantLog/ironBar/hedgeMassPaint/drawPalisadePost/ironCurbEW/drawGravePier/ironRail → ctx + camera.scale/yScale + outlineOn/beginStructOutline; 13 of 14 wallHungArt *OnFace → ctx + breezeAt + beginStructOutline; NONE reach particles/queueGlow/castEdgeQuad); `asPaintHost` is THE ONE CAST; `aimStubHost` retargets; `faceFrame` = the 2D face-local frame (y rising negative from the base) | real |
| `structMaterials.ts` | `StructMaterials(atlas).get(kind, page)` → shared `MeshLambertMaterial` per page: 'opaque' (FrontSide) / 'cutout' (alphaTest 0.5, DoubleSide, + `MeshDepthMaterial` with the same alpha test so the sun cuts through cards); cast + receive shadow | real |
| `structures.ts` | `ChunkStructures`: per chunk `build` = snapshot → scan → the three lane builders over ONE `StructBuildCtx` → sink drains to one BufferGeometry per (kind, page) → meshes in the scene (bounding sphere, frustum culled, shadow flags, custom depth for cutouts); `evict` disposes geometry + debits the ledger; THE BORDER WAKES THE NEIGHBOUR (a built chunk marks its 8 neighbours dirty; `update(t0, budget)` rebuilds them under the ground streamer's frame budget, rebuilds never wake — no ping-pong); `invalidate()` on world moves gates the InteriorMap version; `stats` (chunks/draws/tris/quads/geometryBytes/atlas pages+tiles+bytes/buildMs/builds/rebuilds/dirty/per-lane quads); `builders` overridable for labs | real (0 quads until the lanes land) |
| `walls.ts` / `barriers.ts` / `terrainForms.ts` | lane STUBS: `buildWallStructures(ctx)` / `buildBarrierStructures(ctx)` / `buildTerrainFormStructures(ctx)` return `{quads: 0}`; each header names its owner and contract | placeholder — the lanes' files |
| `ground.ts` (edited minimally) | `structures: ChunkStructures \| null` field; admit → `structures.build`, evict → `structures.evict`, refresh → `structures.invalidate`, update → `structures.update` under the same budget | real |
| `main3d.ts` / `hud.ts` | composition (`FaceAtlas` → `StructMaterials` → `ChunkStructures(scene, world, faces, mats, ground.heightAtFn)`, `ground.structures = …`), `faces.flush()` after the sprite atlas each frame + in `settle` (settle also waits for `dirty === 0`), the `structures` HUD line (`fmtStructStats`), `stats().structures` in the probe, dispose | real |
| `render/terrain.ts` | `paintDeckSideFascia`, `paintDeckPile`, `paintDeckWallSkirt` gain `export` (no behaviour change) for the terrain-forms lane | real |
| `dev/play3dW2.mjs` | the W2 proof harness: login + PLANE CHECK + THE VERIFIED TELEPORT (asserts the predictor moved) + settle; six scenes × (low 0.36, high 0.85 pitch): `interiors` (−430,−290), `wall-market` (−420,−240), `curtain-fence` (−460,−240), `graveyard` (−512,−212), `terraces` (48,−78), `amberford-bridge` (534,62 — maps/amberford.ts:1138 + zone origin 448,−56); `SCENES=` picks a subset, `TAG=` prefixes; logs the structures ledger per shot | real (owned by INTEGRATE; lanes add scenes) |

**The lane APIs (what each lane implements):**

```ts
// structures.ts — every lane receives this and returns { quads, note? }
interface StructBuildCtx {
  world: WorldSource3D;                 // the seam; use isRamp/peek here
  cx, cy, size, x0, y0: number;         // chunk + its world tile origin
  sampler: StructSampler;               // chunk + 1-tile border snapshot (undefined past the ring)
  scan: ChunkStructScan;                // .byFamily.get('wall'|'garrison'|'fence'|'palisade'|'hedge'|'iron'|'deck'|'cliff') → TileStruct[]
  atlas: FaceAtlas;                     // atlas.get(key, () => ({ w, h, paint, bleed? })) → FaceRef
  host: StubHost;                       // aimStubHost(host, tileCtx[, scale]) then asPaintHost(host) for amber painters
  elevH: number;                        // 1.35
  heightAt(wx, wy): number;             // ground height under a world point (the heightfield's own)
  interiors: InteriorMap;
  regionAt(tx, ty): InteriorRegion | null;
  woodSkinFor(region): WoodSkin;        // dealWoodSkin — one skin per building
  sink: StructSink;                     // sink.face(kind, page, ax, az, bx, bz, y0, y1, u0, v0, u1, v1, nx, nz) / sink.top(...) / sink.quad(...) / sink.tri(...)
}
buildWallStructures(ctx)        // walls.ts       — 'wall' + 'garrison' families, awnings, wall-hung
buildBarrierStructures(ctx)     // barriers.ts    — 'fence' | 'palisade' | 'hedge' | 'iron'
buildTerrainFormStructures(ctx) // terrainForms.ts — 'deck' (dock/bridge/porch) + 'cliff'
```

Coordinates are WORLD (x = tile x, y = height in tiles, z = tile y),
like the heightfield and the statics — a lane never subtracts the
chunk origin. Ground base of a structure = `ctx.heightAt(wx, wy)`
(which already includes the elev lift for the tile it stands on;
`tile.lift` is the same number for a flat tile, exposed for reasoning
about neighbours). Face UVs: `u` W→E along the run, `v` 0 at the
ground base → 1 at the crown (`FaceRef.v0` is the base). Material
kind: `'opaque'` for prisms, `'cutout'` for cards. Keep a chunk under
6 draws: opaque×pages + cutout×pages — one atlas page holds ~400 wall
faces at 48×98, so this is one or two pages for the whole town.

**Gates (scaffold commit):** `npm run typecheck` green; `npm run test
-w @arx/client` **1008 pass** (+13); `check:cycles` at baseline
(3/0/0/1); `dev/play3dW2.mjs` runs all six scenes against rig-36 as
`perf12_probe` with a clean console — shots
`dev/play3d-shots/w2-scaffold-{interiors,wall-market,curtain-fence,graveyard,terraces,amberford-bridge}-{low,high}.png`
(nothing visible changes: structures 0 draws / 0 quads; the HUD's
`structures` line and `stats().structures` confess the plumbing —
builds fire per admitted chunk, neighbour-wake rebuilds run: 42 for
the 25-chunk interiors ring, 136 cumulative by the sixth scene).

**Gaps / decisions the lanes inherit:**

- **Neighbour-wake rebuilds are unconditional.** Every admitted chunk
  dirties its 8 built neighbours; with empty lanes a rebuild is ~0.2
  ms, but once art lands, INTEGRATE should skip a rebuild when the
  facing border row/column holds no standing tile (or hash the
  border) — the hook is `ChunkStructures.build(…, wake)`.
- **Interiors can go stale across chunks.** A patch in chunk B that
  closes/opens a room whose walls sit in chunk A does not bump A's rev;
  A keeps its old wood skin until it is evicted. The 2D recomputes
  regions every frame; here `invalidate()` clears the InteriorMap on
  any world move but only rebuilt chunks re-read it. Acceptable for
  W2; INTEGRATE may dirty the 8 neighbours of a patched chunk.
- **`fenceish` reach.** The 2D fence reaches rails toward house walls
  (barrierArt.ts:64). Run continuity here is same-set only (the test
  "fence next to wall = both exposed"); the BARRIERS lane decides
  whether a rail reaches a wall as a rail-length choice.
- **Deck lift is not classified.** `deckKind` names the painter;
  whether a dock/bridge lifts is `terrain.ts isDockTile/isBridgeTile`
  (whole-structure flood, 5 s memo) — TERRAIN-FORMS calls those.
- **Cliffs are listed, not shaped.** `family: 'cliff'` lists the rim
  tiles; the faces themselves are the heightfield's (THE HIGH TILE
  OWNS THE FACE). TERRAIN-FORMS either re-textures those faces or adds
  the contour rim.
- **`tapestryOnFace` is red** (reads `rend.wallish/garrisonish` over a
  ClientGame): the WALLS lane re-emits it or extends StubHost with a
  world-backed `wallish`.
- **No reveal / cutaway.** Walls stand at full WALL_H; the 2D veil law
  is a 2.5D occlusion fix (w2-map §4.3). If a cutaway is wanted it is
  W4's camera concern, with `WALL_STUB` as the cut height.
- **Static-cache / LOD:** none yet — one geometry per (chunk, material)
  rebuilt whole on a rev bump, like the ground.

### W2 TERRAIN-FORMS — as built (2026-09-04)

Decks and cliffs are geometry with painted faces. Modules under
`packages/client/src/play3d/structures/` (headers state the laws):

| file | what | real / placeholder |
| --- | --- | --- |
| `heightfield.ts` (+`collectStepFaces`) | THE SAME FACES, LISTED: per-face metadata for every vertical step the heightfield emits (owner tile, side, a→b run, four corner heights, normal, levels) under the identical law; geometry untouched. A test holds its count equal to `buildHeightfield().faceCount` over pseudo-random fields with ramps | real |
| `cliffFaces.ts` | cliff strips: `mergeStepFaces` (straight runs per edge line, split on levels/brow/strip, sloped skirts alone, `contA/contB` continuity), `browOf` (the owner tile's ground, stepping inward past two Cliff rim tiles: Grass/GrassTall = turf), periodic strip maths (`stripU` wraps negatives), `cliffVariant`; `paintCliffStrip` = cliffArt `cliffFaceItem` :466-880 RE-EMITTED (drawCliffRun/bakeCliffRun are welded to the Renderer's sprite lanes) with a 4-tile PERIODIC lattice: rock gradient, macro drift, three breathing bed seams (variant-independent, dashed), block jointing whose widths divide the period, leaning fractures, jogged cracks, shouldering noses, per-course dark undercut, turf spill + tufts on the top course, foot AO, scree at the lowest; tones lifted (`litTone`) | real |
| `deckFaces.ts` | `planDeckTile` over the portable terrain.ts predicates (isDeckTile whole-structure lift, fillCoversEdge exposure, deckWalkIsVertical, bridgeApronAt, deckArmVertical, isPorchSurface incl. carried tiles, porchArm re-emitted); `apronLift` + `deckLiftAt` = THE FOOT-HEIGHT ANSWER (0 off a deck, DOCK_LIFT on one, sloped across an apron, inside a notch fill, on a porch; world-keyed 5 s axis memo for per-frame callers); board strips (`paintDeckTopStrip` = paintDeckBoards re-emitted flat, 4 tiles, variant by world row), rim (`paintDeckRim` = the bridge south-face rim block: weathered board, lip, foot shadow, support ticks, rim joint; porch adds footing blocks), pile cards through terrain.ts `paintDeckPile` (collar on the water-plane row), flat tone tiles | real |
| `terrainForms.ts` | `buildTerrainFormStructures`: cliffs from the bordered snapshot → runs → one quad each, THE CURTAIN HANGS A HAIR PROUD (crown +0.006, foot +0.03 along the normal; exposed ends extend 0.03 so convex corners close, continuing ends never extend); decks from the LIVE world (the bake's own sampler + memo → slab and boards agree): top quad (apron-sloped corners), rim on exposed edges — a JOIST_H (0.12) joist over water, seated to the ground where the edge meets land at grade / on every porch edge / along an apron's sloping sides — THE JETTY IS HOLLOW; pile prisms on water-facing south spans (pairs at 0.18/0.82, driven PILE_DRIVE 0.3 below the plane) and dock side legs (hash-gated, world-keyed); bridge kerb stringers along the walk's sides and stone thresholds at land ends that do not ramp; the porch tread step; 45° notch fills (top tri + hypotenuse rim, seated on a bank notch). All 'opaque' → one draw per chunk per page | real |
| `ground.ts` (2 lines) | `heightAt` = heightfield + `deckLiftAt` — bodies, props and lamps stand ON the boards (the brief's feet-on-deck law). Slab bases read the sampler's own elev so they never double-lift | real |
| `dev/play3dTerrainForms.mjs` | the lane's driver (harness law verbatim): `terraces` (48,−78), `terraces-south`, `weir-dock` (−3,−15: map 154..159×45..47 + origin −160,−64), `lane-bridge` (0,52: brook bridge 157..163×110..114), `porch` (−67,48: map 90..96,109), `amberford-bridge` (534,80) × low/high pitch | real |

**Gates:** `npm run typecheck` green; `terrainForms.test.ts` 11 tests
(faces == heightfield faceCount over random fields, plateau owner
faces, strip maths, run merging + continuity, brow, jetty lift vs dry
road, bridge aprons + lift interpolation, porch carried tiles/tread/
wall skip, strip variants, pile plane row); full client suite green
for this lane's files (1062/1063 — the one failure is the WALLS lane's
uncommitted `doors.test.ts`); `check:cycles` 3/0/0/1; live proof on
rig-36 as `perf12_probe` with a clean console —
`dev/play3d-shots/w2-terrain-{terraces,terraces-south,weir-dock,lane-bridge,porch,amberford-bridge}-{low,high}.png`
(terraces: 68 quads / 1 page; amberford: 53 deck quads, notch fills
at the dock junction; structures stay 1 opaque draw per chunk for
this lane).

**Judged (two rounds):** round 1 — cliffs wore the art but read as
ashlar (regular beds + block grid), bodies stood 0.22 below deck tops;
round 2 — beds sway more (amplitude 0.24, 3 cells), fewer tinted
blocks/fractures, stronger masses; `heightAt` carries the lift, feet on
the boards at the porch, the dock and the bridge. No z-fighting, no
sliver at the brink from the high pitch, corners closed, piles reach the
water plane, aprons pour onto the banks, kerbs run the bridge sides.

**Gaps / decisions:**

- **The placeholder faces still exist under the curtains** (the ground
  mesh keeps one material). INTEGRATE may pass a `skipFaces` to
  `buildHeightfield` (or a geometry group + second material) once the
  curtains are trusted; then `CLIFF_EPS_*` can go to 0.
- **The bake's up-shifted boards** (DOCK_LIFT/FLAT rows north of each
  deck tile) still sit in the ground texture: hidden under the slab,
  visible only through the hollow jetty's gap at a very low pitch and as
  a thin plank strip on the bank at a dock root. The honest fix is a
  bake flag that paints lifted decks flat for the 3D client
  (terrain.ts, not this lane's file).
- **Bridge rails** are live renderer items in the 2D (not baked) and
  have no lane; kerbs stand in. **Bridge cross-bracing** between pile
  pairs is not emitted.
- **Cliffs are axis-aligned** (the heightfield's law); the 2D bevels
  diagonal dual cells (FACE_SEGS). A contour rim would be new geometry.
- **The lift memo** (terrain.ts 5 s world-keyed) can hold a verdict
  computed while a neighbour chunk was unloaded until it flushes; the
  bake shares the same memo, so slab and boards stay in agreement.
- `paintDeckSideFascia` is the 2D's EDGE-ON rim sliver (px·0.06 wide,
  for the top-down frame) — not a face texture; the rim band re-emits
  the south-face block it stands for.

### W2 BARRIERS — as built (2026-09-04)

Fences, palisades, the iron rest, hedges and the garrison as geometry
with painted faces. Modules under `packages/client/src/play3d/structures/`
(headers state the laws):

| file | what | real / placeholder |
| --- | --- | --- |
| `barrierGeom.ts` | PURE. THE NODE GRAPH: nodes at tile centres, a gate's run arrives at its BOUNDARY, 45° tiles stride corner to corner through their centre; `barrierJoins` (cardinal: at least one plain run tile; diagonal: BOTH ends want it — "/" wants NE/SW, a straight tile wants a corner iff the tile there is the matching diagonal) is symmetric by construction; `barrierNode` = incident mask / degree / through / isolated / anchor + the edges the tile OWNS (E, S, SE, SW, plus any cardinal half-edge into a gate — THE SHARED-EDGE LAW for lines: every edge emitted exactly once, across chunk seams by the lexicographic-min end); `hedgeExposure` (faces where the neighbour is not a straight hedge); `emitBox` (axis box, exposed sides only, u reads W→E from OUTSIDE each face), `emitRunBox` (a box along any bearing with sloping base), `emitCard`, `emitCross` (THE TURNED CROSS — two cards 22.5° off the axes so no post card is coplanar with a rail through it), `swingLeafEnd`/`leafSwing` (open = 96°), `garrisonGateRuns` (E–W merge from the west anchor; side gates single; only the chunk holding the anchor emits), merlon constants | real (14 tests) |
| `barrierFaces.ts` | `BarrierFaces` over the FaceAtlas: cards at CARD_PX 96 (bleed off), prisms at FACE_PX 48 / HEDGE_PX 64 (bleed on), every tile lifted a stop by `liftPainted` (source-atop white = litTone over whatever the painter laid). 2D primitives called under the stub host: `drawFencePost`, `giantLog` + `palisadeRope` (one tile of the E–W course, 4 giants hash-split), `drawPalisadePost` (collar + skull), `ironBar`/`ironRail`/`ironOrnament` (the panel: 8 bars at the 0.125 pitch — the u=1 seam bar is the neighbour's u=0 — three rails, ornament per half tile), `drawGravePier` (one elevation; the pier boxes sample its plinth/shaft/cap bands, the finial rides as a cross), `paintGarrisonMasonry` (WORLD-ANCHORED: key = worldX mod 17 since the 0.68 bond repeats every 17 tiles; faces along z key on world y). Re-emitted with source lines: fence rails (railEW), the five-bar leaf, the lashed palisade leaf, the lintel + spikes, the iron standard, curb faces, the iron leaf + overthrow, the hedge face kit (shade band, roots, clusters, tufts), the hedge crown life (sheen/clump/flecks/one-in-six blooms/partings), the LOBE card, the living arch, the merlon face/cap, the gatehouse elevation (voussoir ring, keystone, imposts, machicolations, quoined piers), soffit, portcullis, the iron-bound leaf. Restated palettes: barrierArt iron/hedge, garrisonArt ashlar (module-private in their homes) | real |
| `barriers.ts` | `buildBarrierStructures`: FENCE = post cross at every node (0.92, gate posts 0.98 on the boundary), a rail card per edge (u scaled by length ≤ 1), leaf swings on the tile's state; PALISADE = two flank cards (PALI_W 0.24 apart) of the carved course + a bark top strip at 1.22 (girth from above, points from the side), a fat junction giant at anchors, THE GREAT GATE (posts 0.06 in from the boundary, lintel box 1.72+0.12 with its spike card, double leaves each folding toward its own post); IRON = curb run-box (0.17 × 0.15) under every edge, panel card over it, standards at every second E–W seam (tx parity) and at through N–S nodes, piers (plinth/shaft/cap boxes + finial cross) at every anchor, the gate = orb piers + overthrow card + two barred leaves; HEDGE = straight mass: crown top per tile, faces + lobe cards on exposed sides (each side its own world-keyed variant), 45° = rotated slab 0.7 wide at HED_H−0.02 (caps only at free ends), gate = two pillars (HED_H+0.22) under the arch card, always open | real |
| `garrison.ts` | `buildGarrisonStructures`: straight tiles = box with faces on exposed sides (`runN/E/S/W` over `garrisonish`), wall-walk top (4 variants), MERLON_H teeth at the 2D's 0.25/0.75 world phase on every exposed crown edge (0.34 × 0.34 boxes); diagonals = hypotenuse face + exposed leg faces + the wall-walk triangle (`sink.tri`) + two teeth on the hypotenuse; GATE RUNS (read from the LIVE world — a 3-wide gatehouse anchored at the chunk edge reaches past the 1-tile snapshot) = two pier boxes (outer end face only where the curtain does not continue), a lintel box from `GAR_SPRING_H + 0.6·rise` to the crown with a dark soffit, teeth on both crown edges + taller pier caps south, the portcullis card under the lintel, two iron-bound leaves (ow/2 wide, 1.75 tall) on the tile's state; side gates = one 0.8 × 1.9 leaf in the notch, thrown east when open | real |
| `dev/play3dBarriers.mjs` | the lane's driver (harness law verbatim + `find`: scan the streamed chunks for tile ids and re-teleport to the nearest big cluster — the live world's own coordinates): `curtain-fence` (−460,−240), `curtain-close` (find 139), `graveyard` (−512,−212), `graveyard-close` (find 496 → −512,−198), `hedge` (find 342 → Dawnmead −460,−167), `fence-close` (find 15), `palisade` (find 292 → Amberford 579,45), `palisade-gate` (295/296 → 582,38), `fence-gate` (134/135 → 582,2), `hedge-gate` (345/346 → 519,18), each × low 0.3–0.36 / high 0.8–0.85 pitch | real |

**Gates:** `npm run typecheck` green (this lane's files); `barriers.test.ts`
14 tests (kinds, the pen: through/anchor/gate boundary half-edges from
both sides, every edge emitted once (owned·2 = joins), the "/" turn
symmetric + owned by the diagonal, "\" beside "/" never joins, isolated
panel/stride, vertical gate endpoints, hedge exposure, iron anchors,
garrison gate runs + anchor-chunk ownership, emitBox/emitRunBox/
emitCard/emitCross geometry, the leaf swing); full client suite
**1063/1063**; `check:cycles` 3/0/0/1; live proof on rig-36 as
`perf12_probe` with a clean console —
`dev/play3d-shots/w2-barriers-{curtain-fence,curtain-close,graveyard,graveyard-close,hedge,fence-close,palisade,palisade-gate,fence-gate,hedge-gate}-{low,high}.png`
(graveyard chunk: 861 barrier quads; Dawnmead hedge chunk: 766;
structures 50–72 draws over 25–33 chunks = 2–3 per chunk; geometry
≤ 2.6 MB; build ≤ 2.7 ms; atlas 1–2 pages shared with the other lanes).

**Judged (two rounds):** round 1 — posts stand at every node and the
rails meet AT them (no coplanar fight: the turned cross), corners and
gates close; the palisade has girth and a crown of points; the curtain
reads castellated with arrow loops and the string course unbroken across
tiles; the gatehouse's piers, lintel, machicolations, portcullis and
swung leaves stand; the iron rest's bars, rails, ornaments, standards,
piers and orb gate under its overthrow read; the hedge is one mass with
lobed crown edges — but its crown's dome sheen printed polka dots.
Round 2 — sheen calmed (α 0.09, larger, with a soft dark seat); the
palisade gate's skull posts / lintel / spikes / open leaves, the fence
gate's boundary posts and open five-bar leaf, and the hedge arch over its
pillars judged from 7–8 tiles. No z-fighting, no floating, no seams at
diagonals seen in any shot.

**Gaps / decisions:**

- **Garrison ownership resolved by the WALLS lane's switch**: walls.ts
  ships `WALLS_OWN_GARRISON = false`; this lane's `garrison.ts` builds the
  curtain (called from `buildBarrierStructures`). INTEGRATE keeps one.
- **`FENCE_POST_H` (structKinds.ts, 1.72) is the PALISADE GATE post**
  (barrierArt.ts:905); the wood fence post is 0.92 (drawFencePost
  s·0.92, rails at 0.45/0.75) and that is what stands here. The constant
  is left as the scaffold wrote it; barrierFaces.ts carries the honest
  heights.
- **Door state is the tile** — a toggle rebuilds the chunk through the
  ground streamer's `refresh`; there is no swing easing (the 2D's
  `doorOpenness` lives on the Renderer). Open = 96° for every family.
- **The 2D `fenceish` reach toward house walls is not taken** — a fence
  beside a wall ends at its own post (the separate-masonry law).
- **Fences on porch decks** do not add DOCK_LIFT (the 2D's carried-deck
  rule, barrierArt.ts:143); they stand on `heightAt`, which the
  TERRAIN-FORMS lane now lifts on decks, so this may already be right.
- **Hedge 45° tiles** are rotated slabs (0.7 wide, a hair lower than the
  mass); the 2D's fused blob loop is not reproduced. Hedge gates are
  always the open arch (no shut wicket).
- **Iron N–S runs** show the full panel card (the 2D condenses them to a
  band edge-on — a 2.5D fix, not needed with a real camera).
- **Diagonal garrison teeth** are axis-aligned boxes centred on the
  hypotenuse; the 2D's sheared teeth would need a rotated box emitter.
- **Gate-run merlons** march both crown edges; the 2D's archK melt
  (teeth over the passage fading with the veil) has no 3D meaning.
- The wide `graveyard` scene at the brief's coordinates faces the
  meadow (the iron rest is at −512,−198 — `graveyard-close`).

### W2 WALLS — as built (2026-09-04)

Buildings as geometry with painted faces: `packages/client/src/play3d/
structures/{walls.ts, wallFaces.ts, doors.ts}` (+ `walls.test.ts`,
`doors.test.ts`), the lane driver `dev/play3dWalls.mjs`, a 4-line
mount in `main3d.ts`. Every module header states its laws.

| file | what | real / placeholder |
| --- | --- | --- |
| `walls.ts` | `buildWallStructures`: per `'wall'` tile a PRISM — crown at ground + WALL_H, faces on EXPOSED sides only (THE SHARED-EDGE LAW over structKinds `runN/E/S/W` = the 2D `wallish`), corner heights from `ctx.heightAt` sampled a hair inside the tile (a lifted building lifts, a sloped one follows). FACE UV = the 2D face frame (u left→right seen from outside, v base→crown) so every 2D measure carries 1:1. South face `'lit'`, N/E/W `'shaded'` (the REAR RISER's shade −14). WINDOWS ARE HOLES: the face splits into sill strip / head strip / two pillars around the opening (head 1.62, band 0.7, u 0.28..0.72; THE WIDE LIGHT butts consecutive window tiles and drops the inner pillars), four reveal faces inside, a mullion CARD (alpha-cut) mid-wall; the hole runs along the axis whose two faces are exposed (a window in a N-S run looks E-W). DOORWAYS ARE TUNNELS: header strip above a fixed 1.56 clear, 0.15 jambs where the frame truly ends (wide doorways merge E-W, side doorways stand edge-on with jambs on E/W and merge N-S — both by the 2D staticRegister rule: wide only), header underside + jamb reveals, crown over. DIAGONALS: triangular prism — leg faces where exposed, always the hypotenuse (a √2-wide face tile so courses keep pitch), `sink.tri` crown. AWNINGS (chunk sweep; host north in AWNING_HOST_TILES): slab top + underside (root 1.76, rail 1.70 at 0.85 out, hem flared 0.16 at free ends) + alpha-cut skirt. WALL-HUNG art: the S face mints a per-detail variant (`wh/…`), pennants/tapestries keyed by (index, length) in their run. Face tiles are SEEDED: `VARIANTS = 6` per (material, skin, tone), the world tile picks by hash — the whole town lives in ~400 atlas tiles | real (24 tests) |
| `wallFaces.ts` | The 2D wall painters re-emitted as atlas-tile painters in the face-local frame: `paintTimberFace` (plinth 0.22 / sill 0.11 / round(span/0.42) chinked logs / plate 0.13, knots-checks-pegs by hash), `paintMasonryFace` (0.39 courses, running bond, stone01 block whisper, the cracked cave wall's SECRET SEAM), `paintWindowDressing` (reveal ring, shutters / stone lintel + sill, knee braces, end furniture only at true ends), `paintMullionCard`, `paintCrownTile` (woodCrownPlate's cap-beam read, stone flag seam), `paintDoorFace` (header: stone haunches + keystone / timber lintel + pegs; jambs with lit inner edge + plinth block), `paintLeafTile` (paintDoorLeaf at rest), awning top/under/skirt per shape, the garrison ashlar via `paintGarrisonMasonry` under the stub host + `lambertWash` (the stop given back as a white wash), merlon face/cap, gate face, `paintHungDetail` (the wallHangings dispatch to 13 `*OnFace` painters; the tapestry's `rend.wallish/garrisonish` + `game.world` answered by a run shim; the royal swallowtail re-emitted at rest), `paintHungSill`. Tones: `toned(hex, 'lit'|'shaded')` = litTone(shade −14 for shaded); `CROWN_LIFT 0.05` (a crown faces the sun square-on) | real |
| `doors.ts` | THE DOOR IS A HINGED LEAF. PURE: `growEase` + `DoorEases` (open 520 / close 380 / shake 460 ms, ported from renderer.ts:14219-14290; `now` passed in), `leafDir`/`leafCorners` (the quarter-turn sweep from the shut direction to the open one; overshoot keeps rotating). `DoorLeafRegistry` (`doorLeaves` module singleton — the lane API hands builders no scene): `setChunk` replaces a chunk's leaves and kicks an ease ONLY for a door whose `open` flipped since its last registration (a rebuild never twitches a door), `prune` against the structures' chunk set. `DoorLeafLayer` (Three): ONE dynamic mesh per atlas page (4 verts/leaf, capacity doubled on overflow, never per frame), rewrites only leaves whose openness moved, DoubleSide Lambert on the face page, casts + receives. Leaves stand in the OUTDOOR face plane (`interiors.regionAt` on both sides decides; no room / two rooms = south / west) hinged on the end jambs and are THROWN OPEN OUTWARD like the 2D side door — an open doorway visibly HAS a door (the first pass swung them into the tunnel and they vanished) | real (7 tests) |
| `main3d.ts` | `doorLayer = new DoorLeafLayer(scene, faces)`; per frame after `faces.flush()`: `doorLayer.update(nowMs, key => structures.has(...))`; `stats().structures.doorLeaves`; dispose | real (4 lines — INTEGRATE may move them) |
| `dev/play3dWalls.mjs` | the W2 harness law with scenes framed on the buildings: `house-street`, `house-door` (the open DoorwayWood at −426,−285 from the alley), `house-side-door` (the two side doors at −429,−273/−272 from the SW), `house-north`, `house-inside` (actually the south facade close, yaw −0.6), `graveyard-wall`, `market-houses`; logs `leaves` | real |

**Gates:** `npm run typecheck` green; `npm run test -w @arx/client`
**1063 pass / 0 fail** (+31: sideFace orientation, THE WIDE LIGHT
spans, diagShape solid triangles, gateMeasures, the absolute course
law, isolated prism = 5 quads, shared-edge law = 8 for a pair, the 5×5
house = 48 quads with every vertex at 0 or 2.05, lit/shaded keys, a
sloped heightfield lifts corners + crown, a window = 16 quads with no
opaque vertex in the hole + 1 card, merged windows drop inner reveals
and carry the seam post, a N-S window looks E-W, doorway = 10 quads +
one west-hinged leaf hung south and thrown open south, room-south puts
the leaf north, a wide pair shares one key at (2−0.3)/2−0.01, a side
doorway hangs on the north jamb, diagonals 4 quads / joined leg
dropped, awning = 3 quads at z + 0.85 / none without a host, hung-art
key, garrison off; the ease clock, sweep, leafDir/leafCorners, registry
posture memory / prune / clear); `check:cycles` 3/0/0/1; my :5245 rig
against rig-36 as `perf12_probe`, console clean on every run. Shots
(`dev/play3d-shots/w2-walls-*.png`, low + high): `interiors` (the
harness scene), `house-street`, `house-door`, `house-side-door`,
`house-north`, `house-inside`, `graveyard-wall`, `market-houses`.
Ledger at the interiors ring: walls 133 quads of 13.2k, atlas 352
tiles / 2 pages (the barriers lane's cards fill page 2), build 1.5 ms,
leaves 42; the market street 374 wall quads.

**Judged (two passes):** corners join without seams, no z-fighting on
any run, the crown plate reads from above, the plinth grounds every
timber face, windows read as holes with the room behind (mullion
cross, shutters, sill + lintel), pennants and the tapestry sit on the
lit faces. Pass 1 faults fixed in pass 2: open leaves hidden in the
tunnel → thrown outward; crowns a stop too bright (they take the sun
square-on) → `CROWN_LIFT 0.05` instead of the face stop.

**Gaps / decisions:**

- **Garrison is OFF here** (`WALLS_OWN_GARRISON = false`): the curtain
  prism / merlons / gates through the shared doorway law are complete
  but the BARRIERS lane's `garrison.ts` builds the live one. INTEGRATE
  keeps one; deleting this lane's garrison code is a 60-line cut.
- **The wall is a tile thick** (the data has no thinner wall): a window
  is a deep embrasure, a doorway a short tunnel. Faithful to the tiles.
- **No glass tint / glint / hearth glow** on the window (the 2D's sheer
  pane needs a translucent pass; the mullion card carries the glint).
- **No door veil / "the door opens onto a room, not the map"** — the
  tunnel shows what is behind; a real camera makes the 2D scrim moot.
- **Door shake** (`'shake'` ease) is ported but nothing fires it (the
  2D's locked-refusal fx); open/close arrive as tile patches → chunk
  rebuild → registry ease. The whole chunk rebuilds (ground bake too)
  on a door toggle — the ground streamer's existing law, not this
  lane's; INTEGRATE may want a structures-only rebuild path.
- **Awnings have no posts, braces or wind**; the skirt's scallops are
  an alpha-cut card (a hair rough at the hem in mips).
- **Hung art is baked still** (no breeze; the atlas has no clock) and
  a tapestry/pennant run wider than the 1-tile snapshot border counts
  its neighbours up to 8 from the sampler (a run crossing a chunk seam
  beyond the ring keys as an end).
- **Side doorways put hidden wall-end faces into the notch** (the 2D
  `wallish` law ends the run at a side doorway): two invisible quads
  per side door inside the jamb/header mass. Harmless; noted.
- **Interior faces are the shaded tone** even where the sun reaches
  them through the open top; the S face of a north wall (seen from
  inside) is `'lit'` as in the 2D.
- **Cave walls** use the stone masonry courses (as the 2D does) — no
  dedicated rock painter.

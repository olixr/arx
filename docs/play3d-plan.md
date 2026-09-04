# PLAY3D — THE SECOND DOOR

The separate 3D client ("Immersive") beside Classic, approved in
`docs/perspective-review-and-3d-client-plan.md` §5–§8. This document is
the as-built record: what stands, what law it stands on, how to run it,
and what is placeholder. It is updated per phase; S1 is the first.

Branch: `epic/play3d` (cut from main `b4c00f2e`). Nothing under
`src/render/` is edited by this program — the 3D client only ADDS files
(`src/play3d/`) and calls the shared painters.

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
| `input.ts` | drag orbit, wheel dolly, WASD, single-press toggles; deltas consumed once per frame | dev-page input (S2: InputManager adapter) |
| `dummies.ts` | `Walker`: fixed-step wander/player movement with the world's axis-separated slide, interpolated for render | placeholder (S2: entities) |
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
node dev/play3dShots.mjs          # the LOOK gate: dev/play3d-shots/*.png
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

### Next (S2 — THE GROUND AND THE STANDING WORLD, live)

1. `LiveWorld` over `ClientGame` chunks (the seam is `WorldSource3D`);
   entities → `EntityBillboard` (humanoid + beast), interpolation from
   the net snapshots; `main.ts` wiring forked with the renderer
   swapped and a `ViewAdapter` for `ui/`.
2. `PropKind` registry: flat billboard / proxy mesh with painted faces /
   ground decal / animated sprite; walls, fences, hedges, decks as
   meshes with painter face atlases.
3. Contour plateau geometry + cliff face atlas; water shader plane.
4. Real-hardware fps probe on the M4 in Dawnmead as the standing gate.

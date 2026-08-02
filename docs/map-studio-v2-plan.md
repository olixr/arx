# MAP STUDIO V2 — THE WORLD ON THE WORKBENCH

*Proposal, 2026-08-02. Status: AWAITING GREEN LIGHT.*

The Map Studio is the only door through which every future map enters Arx. Today it is a
capable but schematic tool: real baked ground under gray placeholder boxes, colored dots
where people should stand, a fixed 322px sidebar, one 2664-line god module, and a design
language that stops at "dark panels with brass buttons." A map author cannot see the town
they are building. They paint, save, alt-tab into the game, walk over, look, alt-tab back.

V2 is a complete rethink on two axes at once:

1. **THE TRUE VIEWPORT** — the editor's canvas becomes the game's own renderer. Walls are
   walls, awnings are awnings, the smith is a smith with her look and her routine path,
   lamplight pools at dusk when you scrub the clock. Editing happens *inside* a live,
   fully-rendered, game-identical scene. No more save-and-go-look.
2. **THE PREMIUM BENCH** — the chrome is rebuilt as a first-class professional web tool.
   Not game-flavored, not parchment: a crisp, modern, high-craft instrument in the class
   of Figma and Linear — real elevation, a spacing scale, a motion language, resizable
   panels, a command palette, inspectors that answer while you type.

Everything below is grounded in the 2026-08-02 recon: full inventory of
`packages/client/src/editor/` (11,144 lines, 18 files), the renderer feasibility brief
(`renderer.ts` §7 gap list), and the complete ZoneDef data-model reference.

---

## §1 · The verdict on what stands

Keep (proven, load-bearing):

- **The server contract.** `/dev/maps` CRUD + hot-reload (`reloadZone` → chunk drop →
  restream) is excellent and battle-proven. Untouched in shape; grows validation (§7).
- **The pure geometry core.** `tools.ts` (footprint/thickLine/rect/ellipse/flood/roadCells)
  and `placements.ts` hit-testing are clean, tested, and framework-free. They carry over.
- **The history model.** Cell-op coalescing via `StrokeRecorder` + zone snapshots is right;
  it gains rect-scoped invalidation and a visible history panel.
- **The validator-is-ZoneBuilder law.** Replaying cells through the real builder stays the
  one gate. It moves earlier (live gutter, not save-time surprise) and gains a server twin.
- **The world mode.** The geography editor shipped recently and is not this epic's target.
  It inherits the new chrome (design system, panels, palette) but keeps its architecture.

Retire (the reasons this epic exists):

- `render.ts`'s schematic pass — `drawBlockTile`, `drawDoorTile`, flat ghost rects. The
  recon confirms ten whole categories render nothing like the game (buildings, props,
  awnings, wall-hangings, NPCs, lighting, animation, water, cliffs, camera).
- `editor.ts` as a god module — pointer machine + keyboard + six dialogs + minimap +
  toolbar builders + boot in one file, module-level mutable singletons, full-teardown
  re-render on every `state.changed()`, global mousemove listeners, `innerHTML` with
  interpolated names.
- The fixed layout — 322px sidebar, 168px minimap, no resizing, no a11y, no touch.
- The hand-hardcoded content lists — `TILE_CATEGORIES`, `DETAILS`, `TREE_LIKE`,
  `BAKED_FULLY`: every new tile is invisible until someone edits an array. V2 derives the
  palette from the tile catalog + derived sets (§6.2) so content and studio can never drift.

---

## §2 · Reference study — what the leading tools teach

- **LDtk** (Sébastien Benard, Dead Cells): UX-first philosophy. Auto-layers — the author
  paints *intent*, rules resolve the tiles. Entity instances carry editable fields inline.
  Crash-safe autosave. Minimal chrome, maximal canvas. → V2 takes: smart terrain brushes
  (§5.2), placement fields edited in place (§5.6), autosave drafts (§7.4).
- **Tiled**: object layers distinct from tile layers; terrain/Wang sets for transitions;
  reusable stamps. → V2 takes: the placement/object plane as a first-class selectable
  layer, stamp library with variants.
- **Hammer / Source 2, Mario Maker**: the viewport IS the game; instant play toggle. The
  single biggest affordance gap between hobby and professional editors. → V2 takes: the
  True Viewport (§4) and Ghost Walk (§5.9).
- **Dungeondraft / Inkarnate**: pretty-rendered painting sells the act of authoring itself;
  brush-blended terrain feels like art, not data entry. → V2 takes: live full-fidelity
  brush previews (the ghost renders exactly what lands — closing the recon's
  "card preview ≠ stamp ghost" mismatch).
- **Figma / Linear / modern professional web tools**: command palette (⌘K) as the universal
  verb drawer; context bar above the selection; right-side inspector that live-answers;
  left-side library; resizable everything; keyboard-completeness; motion that confirms
  rather than decorates. → V2 takes: the entire chrome concept (§3, §6).

---

## §3 · THE PREMIUM BENCH — the design system

A NEW design language for the studios, deliberately divorced from the game's suede-and-
brass HUD (the game kit stays game-side; `studio-core.css` is superseded). One shared
system file powers Map Studio, Content Studio, and every future bench.

**3.1 Foundations — `studio2/tokens.css`**

- **Spacing scale**: 4-base geometric — `--s1 4px` `--s2 8px` `--s3 12px` `--s4 16px`
  `--s5 24px` `--s6 32px`. No literal px gaps anywhere else (the UI-refit law, applied to
  the studio). Panel gutters `--s4`, control clusters `--s2`, dense lists `--s1`.
- **Surface ramp** (dark-first, light-ready): `--bg0` app well, `--bg1` panels, `--bg2`
  raised cards, `--bg3` overlays/popovers — each step pairs with a shadow token so
  elevation is *always* border + shadow + surface in agreement (never a lone border).
- **Elevation tokens**: `--shadow-1` (hairline lift for cards), `--shadow-2` (floating
  panels, popovers), `--shadow-3` (dialogs, command palette) — soft, large-radius,
  low-alpha, layered two-shadow recipes; crisp 1px inner border via `--edge` on every
  raised surface so edges read at any zoom.
- **Ink ramp**: `--ink0` primary, `--ink1` secondary, `--ink2` tertiary/placeholder,
  `--ink-inverse`. Accent: a single confident **studio blue** `--accent` (selection,
  focus, primary actions) + `--accent-soft` washes; semantic `--ok/--warn/--danger`.
  The brass of v1 retires — brass belongs to the game, blue to the instrument.
- **Type**: `Inter var` (self-hosted) with `system-ui` fallback; 13px body, 12px dense,
  11px caps-labels (+0.06em tracking), 15px panel titles; `ui-monospace` for coords,
  ids, and every numeric readout; `font-variant-numeric: tabular-nums` on anything that
  ticks.
- **Radii**: `--r1 6px` controls, `--r2 10px` cards/panels, `--r3 14px` dialogs/palette.
- **Motion**: `--t-fast 120ms` (hover, press), `--t-med 200ms` (panel slide, popover),
  `--t-slow 320ms` (dialog, mode cross-fade); one easing pair (standard + decelerate);
  every animated property is transform/opacity only (the room-motion law, studio-side).
  `prefers-reduced-motion` collapses all to instant.

**3.2 Controls — `studio2/kit.ts` (one component library, no framework)**

Small factory functions returning typed DOM — the widgets.ts pattern, matured. Buttons
(primary/secondary/ghost/danger; 32px default, 26px dense), segmented controls, toggle
chips, sliders with live readouts, steppers, searchable comboboxes with icon options,
color/dye swatch grids, angle dials, hour-range dials, popover + tooltip primitives (one
positioning engine), toast, dialog, resizable panel splitters, virtualized list, tab
strip, key-cap hints. Every control: keyboard path, focus-visible ring, aria roles,
disabled + loading states. **The kit is the only place a control may be born** — the
widget-library law, now for the whole studio.

**3.3 The layout shell**

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  Arx Studio ▾ · zone chip · save state ●    ⌘K  view · help    │
├──────┬──────────────────────────────────────────────────┬─────────────┤
│ TOOL │                                                  │  INSPECTOR  │
│ RAIL │              THE TRUE VIEWPORT                   │  (context-  │
│ 56px │                                                  │   aware,    │
│      │   ┌─ context bar (selection actions) ─┐          │   resizable │
│      │                                                  │   280-420)  │
│      │   ◇ smart guides · snap · measurements           ├─────────────┤
│      │                                                  │  LIBRARY    │
│      │ ┌ minimap ┐              ┌ clock ┐ ┌ zoom ┐      │  (palette / │
│      │ └─────────┘              └───────┘ └──────┘      │   stamps /  │
├──────┴──────────────────────────────────────────────────┤   people)   │
│ STATUS  hint · tile · coords · shelf · zoom · server ●  ├─────────────┤
└─────────────────────────────────────────────────────────┴─────────────┘
```

- **Left rail (56px)**: tool groups with flyout sub-tools (press-hold or arrow, the
  Figma/Photoshop idiom) — far more tools in far less chrome than v1's 46px stack.
- **Right dock**: two resizable, collapsible panels — Inspector (top) and Library
  (bottom); drag the splitter, double-click to collapse; widths persist per user.
- **Floating instruments**: minimap, clock scrubber, zoom cluster — draggable, snap to
  corners, individually dismissible; never occlude the context bar.
- **Context bar**: appears above any active selection with its verbs (swap, mirror,
  layer, elevate, save-as-stamp…) — the verb comes to the hand, studio edition.
- **⌘K command palette**: every command, tool, zone, panel toggle, and lens searchable
  and executable from one field; recents float; hotkeys taught inline on every row.
- The old hand-drawn monoline sigils (`editorIcons.ts`) are redrawn on a unified 20px
  grid at 1.5px stroke to sit correctly in the new rail — same NO-EMOJI law, new metrics.

---

## §4 · THE TRUE VIEWPORT — the game renderer becomes the canvas

The recon's feasibility brief is unambiguous: `Renderer` needs only a canvas to construct;
`ClientGame`'s constructor does no I/O; the renderer reads a narrow, enumerable slice of
game state (`world.groundAt/elevAt/detailAt`, `entities`, `predictor.renderPos`,
`clockHoursNow`, versions). Nothing structural is socket-bound. The gaps are known and
each has a clean cut:

**4.1 The Editor Stage** (`editor2/stage.ts`) — a headless `ClientGame` armed from editor
state, never connected:

- `new ClientGame(stubInput, stubEvents)` with **no `connect()`** and no `InputManager`
  DOM listeners (an `InputManager`-shaped inert stub — the editor owns all input).
- **ZONE→CHUNKS AT TRUE ORIGIN**: populate `game.world` (`ChunkStore.set/setGround/
  setDetail`) from the draft ZoneDef *at its world origin*, procedural worldgen composited
  beneath and around it via the content-side `generateChunk` (the worldgen-lives-in-content
  law makes this free). This kills v1's zone-local hashing lie — every variant die-roll
  now matches the live game tile for tile, and the zone is seen **in its world context**
  (the world-mode debt "zone canvas shows no surrounding worldgen" dies with it).
- Every edit writes through the store (rev bumps are automatic), bumps `worldVersion`,
  and bumps `interiorsVersion` only under the ROOM-STANDS-THROUGH-THE-STREAM predicate
  (3×3 wall/door neighborhood) — the shipped stream discipline, reused verbatim.

**4.2 Renderer seams** (small, surgical, additive — the render() pipeline is not forked):

- **FREE CAMERA**: `renderer.cameraOverride?: {x,y,zoom}` — when set, the follow block
  yields; editor zoom range widens beyond play clamps (0.25×–4×). One seam, ~10 lines.
- **CLOCK OVERRIDE**: the stage stubs `clockHoursNow()` — the whole frame (shadows,
  lamplight, window glow, grade) already keys off that one `daylightAt` sample. The clock
  instrument scrubs 0–24h live; presets Dawn/Noon/Dusk/Night.
- **EDITOR OVERLAY HOOK**: one post-scene callback (after grade, before vignette) where
  the editor draws its plane — grids, selection, ghosts, markers, lenses — in screen
  space with game-space transforms via the camera. The renderer never learns editor
  concepts; the editor never reaches into private passes.
- `ownEid = null` branches are already documented no-player paths; the veil/reveal system
  staying dormant is *correct* for an editor (interiors are instead shown by lens, §5.8).

**4.3 The people are real.** Placements synthesize entities:

- Each `ZoneActorSpawn` → a `RemoteEntity` with the actor's real look/equipment (the
  registry already ships them) standing at its post — drawn by the same `humanoidItem`
  path as play. Each `ZoneSpawn` cluster → representative creature bodies inside the
  ring (count-aware, deterministic scatter), via `npcItem`.
- **ROUTINE PREVIEW**: with the clock scrubbed, actors stand at *where their routine puts
  them at that hour* — the client-side routine interpreter walks post/path/wander tasks
  statically (no server sim; waypoint interpolation + waitSec math). Scrub the clock and
  the town watch changes shift before your eyes — the rota becomes visible truth.
  Spawn-cluster `hours` windows honor the clock too: outside the window the bodies fade
  to 25% ghosts (never invisible — the editor always shows what is *authored*).
- Optional **LIVING MODE** toggle: entities animate in place (LegRig gait on paths,
  tail sims, tree sway via real `tSec`, birds off) for feel checks; OFF = a settled
  still frame for precision work. Default OFF while dragging, ON when idle.

**4.4 Performance shape** (the render-perf laws apply in full):

- The stage inherits the sliced bake pipeline (`startChunkBake` + budgets) instead of
  v1's synchronous 10–40ms `bakeChunk` calls — mid-stroke enjoys the same
  NOTHING-HEAVY-OUTSIDE-A-BUDGET discipline as live streaming.
- Edits invalidate by rect through the existing rev/version contract; undo/redo scopes
  invalidation to the op's rect (killing v1's `markAllDirty` on every undo).
- Adaptive resolution stays armed; the editor pins `effectiveDpr` reads like the map does.
- Fallback lever kept: a **Draft view** toggle (the v1 schematic pass, preserved as a
  mode) for enormous selections or low-end machines — never the default.

---

## §5 · The tool system — every verb a master needs

Tool groups on the rail (flyouts hold variants); every tool keyboard-first; all v1
hotkeys preserved where they exist:

**5.1 SELECT (V)** — the default and the center of gravity, no longer an afterthought:
marquee, **lasso**, **magic wand** (contiguous same-tile), **select-same** (all matching
tiles in zone), per-plane filters (tiles/placements/both). Selections support move,
Alt-drag duplicate, arrow-key nudge, mirror, **rotate placements**, delete, ⌘C/X/V with
cross-zone paste, save-as-stamp, and **Swap** (replace tile A→B inside the selection —
the palette's right-click "swap into selection" verb). Marquee shows live W×H; drags
snap to guides.

**5.2 PAINT (B)** — brush with size/shape/spacing; right-drag erases (kept). New:
- **Smart terrain brushes**: paint "meadow / water / path / cave floor" as *materials*,
  and the brush resolves edge tiles, shore lines, and path shoulders by rule (the LDtk
  auto-layer insight, scoped to Arx's real tile families). Raw single-tile mode always
  one toggle away — masters keep absolute control.
- **Pattern brush**: paint with a saved stamp as the nib (fences, hedgerows, crop rows).
- **Scatter brush**: density-dialed organic placement (flowers, tufts, pebbles,
  mushrooms) with per-stroke jitter — dressing a meadow stops being cell-by-cell.

**5.3 SHAPES (R/O/L)** — rect, ellipse, line, thick line, **polygon**, filled/outline,
shift-constrained (kept), plus **wall mode**: any shape drawn in wall mode auto-selects
run/corner/diagonal wall pieces (`orientDiagWall`) and can carry a door on a chosen face
— a whole building shell in one gesture.

**5.4 FILL (G)** — flood (kept) + global same-tile replace with scope chips
(selection / zone).

**5.5 ROAD (T)** — the L-path law tool (kept), now with live full-render preview and
width presets; also lays `Detail` shoulders optionally.

**5.6 PEOPLE (N/A)** — clusters and actors unified under one tool with a placement-plane
inspector that finally exposes **the whole data model**: for clusters — npc, count,
radius (drag the ring, kept), level/name override, **hours dial** (a 24h ring you drag),
**patrol editor** (click waypoints on the map; the loop draws as a lit path),
**wing id**; for actors — identity (portrait combobox, real busts via the CMS pipeline),
facing dial, **routine picker with the routine's path projected live from the post**
(THE POST IS THE ORIGIN made visible), plus one-click "open in Content Studio". Every
field commits undoably; every change re-poses the synthesized entity instantly.

**5.7 STRUCTURES & STAMPS (H/F)** — template + prefab stamping (kept) with true-render
ghosts (the ghost IS the stamp now — same pipeline, translucent), X-mirror (kept),
collision preflight (red wash where the stamp would overwrite authored non-grass),
armed-repeat (kept), and a proper **Stamp Library**: folders, search, tags, thumbnails
via the stage, "save selection as stamp" capturing all planes (kept, elevated).

**5.8 TERRAIN & ELEVATION (Y)** — the shelf law becomes visible and safe: raise/lower/
flatten brushes bounded −2..+3; live auto-fence preview (the cliff line draws *while you
sculpt*, not at save); stair tool that only arms on legal sites (the validator predicate
runs under the cursor — illegal spots show why in the status bar); ramp-flow arrows;
**level lens** (tint + contour + digits, kept from v1 but on the true render);
**shelf lens** (draw-order strat visualization — answers "what will occlude what");
reachability wash from spawn (validator's flood, live).

**5.9 GHOST WALK (W hold)** — drop a ghost avatar at the cursor and steer it with WASD
through the true viewport: real collision (`Predictor` is pure), real camera follow, real
interior reveals, real lamplight. Not a server session — a feel-check instrument. The
Mario-Maker instant-loop, without leaving the bench.

**5.10 Universal affordances** — hover cards (tile/placement identity at cursor after
300ms), alt-eyedropper from any tool (kept), Esc cascade (kept law), Space-pan/wheel-zoom
(kept), `[`/`]` size (kept), smart guides + snapping (tile, half-structure, alignment
between placements), measurement readout on any drag, **History panel** (every op named
and clickable — "Paint ×214 · Stamp smithy · Move actor mira"), autosave drafts to
localStorage with crash recovery (the LDtk lesson), and **conflict guard** — a soft
warning chip when another session saved this zone since load (compares server mtime).

---

## §6 · Panels — the library and the inspector

**6.1 Inspector (right, top)** — context-aware, live-answering:
- Nothing selected → zone card: id/name/origin/size/growth/spawn, discovery preview
  (name exactly as the discovery card will read), derived edge-profile strip (the seven
  edge classes drawn as a colored perimeter — what the wild will grow toward), validator
  status, placement census.
- Tile selection → census by tile, swap verb, save-as-stamp, elevation stats.
- Placement selection → the §5.6 full-field forms.
- Sign selection → title/lines editor with the 26/34-char law enforced by the input
  itself, live board preview.
- Multi-select → shared-field editing (set hours on six clusters at once).

**6.2 Library (right, bottom)** — three tabs:
- **Tiles**: palette **derived from the catalog** (`TILE_DEFS` + derived sets — never a
  hand list again; the recon's missing tiles — fence gates, diagonal fences, dyed banner
  poles — appear the day this lands). Shelf groups with true-bake thumbs (kept), search
  (kept), favorites row, recents (kept), **dye/motif/species expanders** rendered as
  swatch bands (awnings ×10 dyes, banners, bracket signs ×8 motifs, trellis ×3) instead
  of 40 flat entries.
- **Stamps**: templates + prefab library (§5.7).
- **People**: bestiary + actor roster with real portraits, drag onto the map to place;
  filter by disposition/level band; TOWN_SPAWNS shown read-only with an **Adopt** action
  (§7.3).

**6.3 Lenses (view menu + ⌘K)** — composable overlays on the true render: Grid, Chunks,
Elevation, Shelf, Interiors (derived rooms tinted; hearth-warm rooms marked; the
DOOR-OPENS-ONTO-A-ROOM failure highlighted on offending doors), Reachability, Spawn
hours (clock-aware), Routine paths, Sign coverage, Growth domain, Edge profile, Faction
ground. Lens state persists per user.

---

## §7 · Data completeness & the server's word

- **7.1 Server-side validation**: PUT `/dev/maps/zone/<id>` gains the same ZoneBuilder
  replay the client runs (shared content-side function) — the recon found saves are
  client-trusted today. Client stays the fast path; server becomes the guarantee.
- **7.2 Full-field serialization**: `newZone()`/`adopt()` learn `signs` + `growth` (the
  recon's normalization gaps); every ZoneSpawn field (`hours`, `patrol`, `wing`) and
  every sign round-trips through the editor.
- **7.3 TOWN_SPAWNS adoption**: a one-time migration path — surface the 10 hardcoded
  Dawnmead-ring clusters in the People tab with an Adopt verb that writes them into the
  dawnmead zone file as ordinary `spawns` (server code keeps the constant as fallback
  until the file lands, then the constant retires). The last invisible placements die.
- **7.4 Autosave & drafts**: dirty zones snapshot to localStorage every 30s and on
  visibility loss; reopening offers the draft. Crash-safe, the LDtk standard.

---

## §8 · Phases

Each phase ships, proves, and commits on its own. Laws named in caps become standing.

- **Phase 1 — THE BENCH IS BUILT** (design system + shell): `studio2/tokens.css` +
  `kit.ts`, the new layout shell (rail, resizable dock, context bar, ⌘K palette, status,
  floating instruments), icon redraw, editor.ts split into `editor2/` modules
  (stage-less: v1 viewport temporarily embedded). Content Studio adopts tokens only.
  *Prove: full keyboard path audit; panel resize/persist; ⌘K executes every v1 command.*

  **SHIPPED 2026-08-02 — as built:**
  - `src/studio2/`: `tokens.css` (the one token file; COOL CHROME, WARM WORLD —
    surveyor blue `--accent` for the tool, `--field` warm brass ONLY for world-truth
    chrome: zone chip name, dirty dot, live-server lamp, minimap viewport), `kit.css` +
    `kit.ts` (btn/seg/chip/sliderRow/kbd/toast/confirmDialog — window.confirm is dead).
  - `src/editor2/`: `editor2.ts` (composition root), `commands.ts` (THE COMMAND
    REGISTRY — tools, world tools, layers, file, view, go; rail + keyboard + ⌘K + help
    all read it), `ops.ts` (every document verb as one seam), `pointer.ts`, `keys.ts`,
    `chrome.ts`, `shell.ts` (dock resize 280–460 + split + collapse + corner-snapping
    instruments, all persisted under `dc2-*` keys), `minimap.ts`, `dialogs.ts`,
    `cmdk.ts` (prefix>word-start>substring>subsequence scoring, recents, dynamic
    zone-by-name provider), `editor2.css`. v1 `editor.ts`/`editor.css` RETIRED;
    state/render/tools/panels/palette/placements/history/validate/api/preview/world/*
    carry over intact. `editorIcons.ts` re-metriced (1.6px stroke, v2 ink, 3×
    supersample) + 8 new sigils (docnew/folder/save/importin/exportout/check/help/lens).
    `studio-core.css` = alias shim over studio2 tokens (CMS adopts tokens only).
  - Deviations from the letter of the plan: control heights proved 30/24 in the hand
    (not 32/26); rail flyouts + context bar deferred to Phase 4 (they arrive with the
    first sub-tools and real selection verbs); help sheet is generated FROM the
    registry (the drift-prone hand list is dead).
  - Fixes beyond scope, found in the port: sign remove/move now rebakes its ground
    tile (v1 left a stale board); origin move now carries `signs[]` (v1 dropped them);
    zone-chip/dialog values no longer ride innerHTML.
  - Verified: tsc clean; 379 client tests green; STUDIO=1 build green; headless audit
    (world boot → zone step-in → ⌘K open/filter/run → hotkeys/layers/brush → paint+
    undo → dock resize 332→416 persisted → collapse via ⌘K → tab auto-switch →
    zone-open-by-name → world rail; zero console errors; 20 focusable chrome controls).
- **Phase 2 — THE WORLD SITS FOR ITS PORTRAIT** (the True Viewport, still frame): the
  Editor Stage (headless ClientGame, zone→chunks at true origin with worldgen apron),
  renderer seams (free camera, clock override, overlay hook), sliced bakes, clock
  instrument, Draft-view fallback toggle. Tiles/shapes/fill/road retargeted to the stage.
  *Prove: pixel-diff a stage frame vs a live-game screenshot at the same tile+hour.*

  **SHIPPED 2026-08-02 — as built:**
  - **Renderer seams** (`render/renderer.ts`, additive only): public `cameraOverride`
    {x,y,zoom} — the follow ease, view-shift, cine pull, shake, and player zoom clamp
    all yield when set; public `overlayHook(ctx, {w,h,scale,yScale,toScreen,pickWorld})`
    called over the finished frame (after vignette). Nothing else editor-shaped.
  - **`editor2/stage.ts`** — StageGame extends ClientGame overriding only
    `clockHoursNow()`; construction takes stub input/events (never touched: the stage
    never connects/ticks — THE STAGE IS INERT). Chunks compose exactly as the server:
    `generateChunk(seed,cx,cy)` + the overlayZone semantics mirrored (TILE_SKIP
    transparent incl. elev, detail SKIP→0, elev-less zones level their ground). Seed
    from `/dev/world` via world.ws; edge profiles/geography ride the live content
    registries the world module already adopts. Edits recompose whole chunks (rect+1
    pad) with `worldVersion` bumps; `interiorsVersion` bumps only under the ROOM
    predicate (boundary tiles before/after). `ensureVisible` composes missing chunks
    under the camera at 6/frame — the apron is infinite, pan-friendly. A throwing
    stage frame flips `healthy` and the draft view stands in (never a dead studio).
  - **`editor2/viewport.ts`** — ONE camera (local center + px/tile) over both views;
    stage screen→world goes through `renderer.pickWorld` (the standing law — elevation
    lift solved); zoom clamps [8,160] on stage, [2,160] in draft; fitZone accounts the
    0.6 y-squash. The whole v1 decoration dialect ported to the overlay hook: outside-
    zone dim, field-tone zone frame, tile grid, TRUE world-chunk grid, preview cells,
    flat ghost (true-render ghosts arrive Ph4), marching-ants selection + dims chip,
    and all markers with wander rings drawn as perspective-true ellipses. Draft toggle
    persists (`dc2-true-view`); markers anchor at ground footprint; the elevation lens
    stays draft-side until the Phase 5 lens suite.
  - **`editor2/clock.ts` + `#inst-clock`** — the daylight scrubber instrument (readout,
    0–24h slider, Dawn/Noon/Dusk/Night presets), plus ⌘K clock commands; the pointer
    machine now binds both zone canvases (draft AND stage).
  - Verified: tsc clean; 379 tests green; STUDIO build green; headless drive (stage
    boots healthy, 51 chunks composed, strokes/marquee/undo on the true render, clock
    scrub 12:00→22:00 pools real lamplight, draft round-trip keeps the camera exactly,
    zero console errors). **THE PORTRAIT PROOF: a registered live-game session and the
    stage framed the same world window at the same hour — 98.5% of pixels within
    motion tolerance, mean channel diff 2.06/255** (residual = grass/tree sway phase).
    Headless rAF pinned ~30Hz in the harness; in-browser perf rides the renderer's own
    shipped budgets (profile against a 512×512 zone in Ph3).
- **Phase 3 — THE PEOPLE TAKE THE STAGE**: synthesized entities for every placement,
  routine interpreter + clock-aware posing, hours ghosting, unified People tool with
  the full-field inspector (hours dial, patrol editor, wing), People library tab,
  LIVING MODE.
  *Prove: scrub 0–24h over Amberford; the watch rota's 10 posts change shift correctly.*
- **Phase 4 — THE MASTER'S HANDS** (tool depth): select suite (lasso/wand/same/swap),
  smart terrain + pattern + scatter brushes, wall-mode shapes, polygon, true-render
  ghosts everywhere, snapping + guides + measurements, History panel, autosave drafts.
- **Phase 5 — THE LAW IS VISIBLE** (elevation + lenses): sculpt tools with live
  auto-fence + legal-stair arming, shelf/interiors/reachability/edge/growth/faction
  lenses, sign editor, zone card, multi-select field editing, conflict guard.
- **Phase 6 — THE DOOR NEVER CLOSES** (completeness + polish): server-side validation,
  TOWN_SPAWNS adoption, Ghost Walk, cross-zone paste, stamp folders/tags, Content
  Studio full re-skin on the v2 kit, motion pass, a11y audit, perf pass (budgets
  honored on a 512×512 zone), docs + in-studio help.

Out of scope (named so nobody wonders): world-mode architecture (keeps v1 guts under v2
chrome), multiplayer co-editing, in-editor dialogue/quest authoring (Content Studio's
ground), any game-side rendering change beyond the additive seams in §4.2.

---

## §9 · Standing laws proposed by this epic

- **THE TRUE VIEWPORT LAW**: the zone canvas renders through the game's own renderer
  over a stage ChunkStore at true world origin. Schematic rendering survives only as
  the explicit Draft toggle. No third rendering dialect may ever appear.
- **THE STAGE IS INERT**: the editor's ClientGame never connects, never owns an
  InputManager, never touches a socket. All input belongs to the editor.
- **ADDITIVE SEAMS ONLY**: the renderer grows `cameraOverride`, the overlay hook, and
  nothing else editor-shaped. Scene passes stay private; the editor draws only in its
  hook.
- **THE CATALOG IS THE PALETTE**: the library derives from `TILE_DEFS` + derived sets +
  `BuildableDef`/detail rosters. A hand-listed palette entry is a bug.
- **ONE KIT, ONE TOKEN FILE**: every studio control is born in `studio2/kit.ts`; every
  color/space/shadow/motion value lives in `tokens.css`. Literal px/hex in studio CSS
  outside tokens is a bug (the game UI's token law, extended to the bench).
- **EVERY FIELD HAS A DOOR**: any field added to ZoneDef/ZoneSpawn/ZoneActorSpawn/
  ZoneSign must land in the inspector in the same change, or the change is incomplete.
- **AUTHORED IS ALWAYS VISIBLE**: nothing authored may be invisible in the editor —
  out-of-hours spawns ghost at 25%, never vanish; TOWN_SPAWNS surface until adopted.

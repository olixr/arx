# BUILDING v2 — THE BUILDER'S HAND
### Full review + foundational rework of the player building system
*Drafted 2026-07-29 from a three-lens code audit (server pipeline, client UX, item economy). Status: PROPOSAL — awaiting green-light.*

---

## Part I — The review: what the system is today, and where it fails the builder

The building system shipped in the first release and has not had a dedicated epic since.
Every other pillar (combat, techniques, frontier, fabric, walls-as-art) has been reworked
to premium standard; building still runs on release-day bones. The audit found the bones
are *sound* — the tile-is-the-state law, the binary TilePatch stream, the built_tiles
ownership model, and the buildable catalog are all solid foundations — but everything the
player touches is bare scaffolding.

### The economy fails first (root cause #1: hauling IS the gameplay)
- **Logs do not stack** (`packages/content/src/items.ts:166-169`, `stackable: false` on all
  four log types) and the pack is 28 slots (`server/src/game/inventory.ts:4`). A modest
  house (~20 floors + 30 walls) costs ~80 logs today = **three full pack trips**, each trip
  28 separate chop cycles. The dominant experience of building is walking wood.
- **There is no processed-wood intermediate.** Grep for plank/board/lumber/sawmill across
  all packages: zero items, zero stations, zero recipes. Wood goes raw log → finished wall
  in one step, everywhere. Metal at least has ore→bar; wood has nothing.
- `stackable` is a plain boolean with no stack cap — stackables coalesce infinitely in one
  slot (inventory.ts:15-40). So the moment a wood item is stackable, hauling is solved;
  the design question is only *which* wood item deserves it.

### Demolition fails second (root cause #2: mistakes are punished, not played)
- `demolish()` (`server/src/game/gameServer.ts:3565-3604`) is instant, silent, and returns
  **zero materials**. No fx message is broadcast (contrast `smashProp`, which sends
  `{t:'fx', kind:'smash'}` *before* the patch so the burst reads). No sfx, no dust — the
  tile just pops. A misclick is a pure loss with no ceremony.
- **The prev-tile chain is one layer deep and wrong for layered builds**: build a floor on
  grass, build a wall on that floor — `saveBuiltTile`'s ON CONFLICT deliberately keeps the
  *original* prev_tile (accounts.ts:662-671), so demolishing the wall restores **grass**,
  tearing a hole in your own floor. The one record per tile also means the floor's own
  built-record (and its demolishability) is destroyed by the wall.
- No occupancy check on demolish; no re-check of occupancy in `tickBuild` completion either
  (a wall can complete on top of someone who walked in during the 30 ticks).

### The placement UX fails third (root cause #3: the ghost is a lie and a rectangle)
- The ghost is **one flat 50%-alpha chamfered rect** in the tile's top color with a
  green/red outline (`renderer.ts:26637-26654`). A wall, a bed, and a lamp post all
  preview identically. No silhouette, no height, no icon.
- Ghost validity checks ground + range only (`main.ts:1919-1935`) — **not** materials,
  level, or occupancy. A green ghost can still be refused; the click plays `buildThump`
  *optimistically before the server answers* (main.ts:1589), so the sound lies on refusal.
- **One tile per click, no drag.** A 20-tile wall is 20 aimed clicks, each a full serial
  server action; a second click mid-build silently restarts. No queue, no undo.
- **Rotation does not exist client-side.** Corner pieces auto-orient once, at completion,
  from neighbors (`gameServer.ts:3496-3529`), silently defaulting to NE — build the corner
  before its runs and it guesses wrong, and the only fix is a refundless demolish. The
  "build the runs first" rule lives in a code comment the player can never see.
- Action-cancel reasons (`blocked` / `materials`) are discarded by the client
  (clientGame.ts:859-865) — interrupted builds just stop, unexplained.
- Build animation reuses the *gather* pose aimed at the nearest tree — the builder
  literally faces the wrong way and swings at nothing (`renderer.ts:1584-1607`).

### The HUD/palette fails fourth (root cause #4: the mode has no face)
- In build mode the entire HUD is a three-hint mode strip. **Nothing on screen names the
  selected buildable, shows its icon, or counts your materials** — the palette closes on
  selection and the only record is a one-shot chat line.
- The palette is a flat 3-wide grid of all 46 defs in levelReq order
  (`stationPanels.ts:264-326`): no categories, no sort, no affordability filter, no detail
  pane, no facts (ticks/xp/footing are in the data and never surfaced) — while the
  Workshop panel right next to it has the full ledger/detail anatomy with sort bar and
  ×N-makeable counts. Locked cards aren't even pad-focusable.
- Demolish is a hard-coded `KeyX` check (main.ts:1584) — a ONE KEYMAP law violation
  (rebinding Sit silently desyncs the modifier from the printed hint).
- Touch players cannot build at all (touch.ts has no build branch).

### Verdict
The foundations keep; everything the builder sees, holds, and feels gets rebuilt.
Four root causes, four phases — plus a bug-fix phase zero that the refund system
depends on.

---

## Part II — The design

### Pillar: *the player is a builder, not a mule; a mistake is a beat, not a fine.*

---

## THE MILLED-AND-WHOLE LAW (the board economy)

**New items** (both stackable — the first stackable bulk-material tier in the game):

| id | name | stacks | value | source |
|---|---|---|---|---|
| `board` | Boards | ✔ | 2 | saw 1 `log` → **3 boards** |
| `oak_board` | Oak boards | ✔ | 5 | saw 1 `oak_log` → **3 oak boards** |

Flavor (quiet quartermaster, one sentence, concrete):
- Boards — *"Sawn true and stacked flat; a wall is mostly patience."*
- Oak boards — *"Heavy heartwood planks, sawn slow so they stay honest."*

**New station — the Sawhorse** (`Tile.Sawhorse`, StationType `'sawhorse'`):
- Buildable `sawhorse`: construction 1, **log×2**, 25 ticks — costs *logs* on purpose
  (you can't saw boards before you own a saw stand); cheap enough to raise at the
  treeline and saw where you chop.
- Art: X-frame trestle pair with a half-ripped log across and the saw parked in the
  kerf — body-ruler audit (waist height), foreshortened top plane on the log per the
  2.5D law.
- Recipes `saw_boards` / `saw_oak_boards`: **skill `construction`** (not woodworking —
  woodworking keeps bows and staves; the builder's loop stays self-contained),
  levelReq 1 / 10, xp 6 / 14, 18 ticks, station `sawhorse`, unlock `core`.
  Batching rides the existing craft path free: Make 1 / ×5 / all, self-restarting
  tick loop, STATION_FACE verb **"Saw"**.
- Willow and yew stay unsawn — they are weapon woods; the carving bench keeps them.

**The semantic split — logs stay real:** whole timber keeps costing logs (campfire ×3,
lamp post, banner pole, garrison gate's oak beams, tool hafts, bow staves, the sawhorse
itself, and the signpost's driven post); everything *milled* — floors, walls, openings,
furniture, station casework — converts to boards. Logs remain a first-class material,
not a legacy one.

**The conversion ledger** (1 log = 3 boards; milled costs land at ~⅔ of raw board-parity —
the discount is the reward for processing, and it must stay deterministic: **no pity, no
player-state dials**, per the flood law):

| buildable | old cost | new cost |
|---|---|---|
| wood_floor | log×1 | **board×2** |
| wood_wall | log×2 | **board×4** |
| wood_wall_corner | log×2 | **board×4** |
| wood_window | log×2, twine×1 | **board×4, twine×1** |
| wood_doorway | log×2 | **board×5** |
| wood_doorway_wide | log×3 | **board×7** |
| wood_railing | log×2 | **board×3** |
| fence | log×1 | **board×2** |
| fence_corner | log×1 | **board×2** |
| fence_gate | log×2, twine×1 | **board×3, twine×1** |
| barrel | log×1, twine×1 | **board×2, twine×1** |
| crate | log×2 | **board×4** |
| chair | log×2 | **board×3** |
| table | log×3 | **board×6** |
| bench | log×3 | **board×5** |
| bed | log×2, cloth×2 | **board×4, cloth×2** |
| flower_box | log×2 | **board×3** |
| hanging_sign | log×1, twine×1 | **board×2, twine×1** |
| signpost | log×2 | **log×1, board×2** (a driven post wearing two sawn boards — matches the art) |
| counter | oak×2, log×1 | **oak_board×4, board×2** |
| bookshelf | oak×3, leather×1 | **oak_board×6, leather×1** |
| workbench | oak×2, log×2 | **oak_board×4, board×4** |
| loom | log×2, oak×1, twine×3 | **board×4, oak_board×2, twine×3** |
| carving_bench | oak×2, log×2, iron_bar×1 | **oak_board×4, board×4, iron_bar×1** |
| enchanting_table | oak×2, gold_bar×1, dust×4 | **oak_board×5, gold_bar×1, dust×4** |
| alembic | log×2, bronze_bar×1, cloth×1 | **board×4, bronze_bar×1, cloth×1** |
| tanning_rack | log×3, twine×2, cowhide×1 | **board×5, twine×2, cowhide×1** |
| stone_window / stone_doorway(s) / stone_wall(+corner) | …log×1 | …**board×2** (lintel + formwork timber) |
| hearth | (unchanged wood-free) + | oak beam line stays `oak_log` where present |
| campfire, lamp_post, banner_pole, garrison_gate, sawhorse | logs | **unchanged — whole timber** |

Value sanity: 1 log (4gp) → 3 boards (6gp): mild value-add for labor, no vendor arbitrage
loop worth botting. Content test pins the ledger (every wood cost is either whole-timber
or board-denominated; no def may mix `log` and `board` except the signpost).

---

## THE SALVAGE LAW (demolition becomes gameplay)

1. **Demolish is a short action, not a packet**: 12 ticks base (buildSpeedMult applies),
   hammer swings at the target tile, cancel on move — same grammar as building. One quiet
   beat of "am I sure" built into the time, no confirmation dialog needed.
2. **Deterministic salvage**: on completion, **ceil(qty/2) of every material** returns to
   the pack (overflow → `placeDrop` at the tile). No RNG, no dials. A board×4 wall gives
   2 boards back; XP loops stay materially lossy, so no free construction-XP mill.
   Quiet line: *"Salvaged: 2 boards."*
3. **Ceremony**: server broadcasts `{t:'fx', kind:'demolish', tx, ty, tile}` *before* the
   patch (the smashProp precedent). Client: dust plume + shard burst in the tile's
   material tones, a crack-and-drop sfx (`sfx.demolishCrash` — timber crack for wood,
   rubble slump for stone), tile pops on the patch that follows. Build *completion* gets
   its own beat too: dust puff + thump at the site via a new construction branch in
   `onTileChange` — and `buildThump` moves from click-time (where it currently lies) to
   completion-time; the click keeps a light hammer-tap.
4. **THE LAYER LAW (prev-tile fix)**: on build-over, `prev_tile` updates to *what was
   actually there at build time* (registerBuilt + the DB upsert both change). Demolish
   restores that layer; if the restored tile is a player-floor (WoodFloor/StoneFloor),
   the record **re-registers to the same owner** so the floor stays owned, demolishable,
   and salvageable. Wall off your floor comes back to *floor*, never a grass hole.
5. **Safety re-checks**: `tickBuild` completion re-validates occupancy (today a wall can
   finish inside someone); demolish refuses if the restored tile would be solid under a
   standing body.
6. **Prerequisite bug fix (Phase 0)**: both pickup paths destroy the drop entity even when
   `addItem` only partially fits (gameServer.ts:12059-12065, 12092-12100) — silent item
   loss that salvage drops would amplify. Fix: destroy only what was added; the remainder
   stays on the ground.

---

## THE TRUE GHOST (placement you can trust)

1. **The ghost is the piece.** Walls/doorways/fences preview as the real extruded prism at
   wall height with material tint; furniture and stations preview with their buildable icon
   standing on a footprint ring. 55% alpha, green when placeable.
2. **The ghost never lies.** Client validity mirrors the full server gate: footing
   allowlist, range annulus, occupancy, *level*, *materials*. When red, a one-breath
   reason chip rides the cursor: *"Too far." / "No footing." / "Someone's there." /
   "Needs boards ×4." / "Construction 12."* Same diction as the refusal lines.
3. **Reach made visible**: a soft ring shows the 0.8–3.0 build annulus while in build
   mode — faint, breathing, never shouting.
4. **Rotation is the player's** (`orient` rides the wire): `C2SBuild` gains optional
   `orient: 'NE'|'NW'|'SE'|'SW'`; server validates against the piece's diagonal set and
   uses it verbatim; omitted = today's auto-orient, unchanged. New binding **buildRotate**
   (default `KeyR`, pad RB in-mode) cycles **Auto → NE → NW → SE → SW** on orientable
   pieces; the ghost draws the actual triangle you'll get, including what Auto will
   resolve to *right now*. The "build the runs first" folklore dies.
5. **Drag-to-place** (the single biggest convenience win): hold and drag paints a run;
   the client queues tiles (deduped), sends the next build as each completes, draws queued
   tiles as faint pending ghosts with a count chip ("×7 queued"), and drains the queue
   honestly through the existing serial action system — every placement individually
   validated server-side, nothing new to trust. Esc or right-click clears the queue.
   Materials chip counts down as the run drains.
6. **The builder faces the work**: build/demolish actions aim the pose at the target tile
   (fix the findGatherNode misdirection), with hammer-strike impact ticks at the site and
   a progress ring on the tile itself alongside the overhead bar.
7. **Refusals speak**: action-cancel reasons surface as quiet lines — *"The footing
   changed." / "Out of boards."* — instead of being dropped.

---

## THE BUILDER'S TRAY (the mode gets a face) + PALETTE v2

1. **Palette v2** adopts the Workshop's proven anatomy (ledger left, work right):
   - **Categories**: Foundations · Walls & Openings · Furnishings · Stations · Defenses ·
     Waymarks — each a ledger section, pad-navigable rows including locked ones.
   - **Sort bar**: In reach (default — placeable-now first) / By level / A–Z; ×N
     affordability count per row; short/lvl-gate notes with tone, same as crafting.
   - **Detail pane**: big icon, material rows with have/need, build ticks, xp, footing
     rule in world-words (*"wants open ground — grass, dirt, or sand"* / *"wants a laid
     floor"*), an orientation note for corner pieces, and the Place button.
2. **The Builder's Tray** — a compact persistent strip while in build mode:
   selected piece (icon + name), live material chips counting down as you place,
   rotation state glyph, and a **recents row** (last five pieces) so switching between
   floor/wall/doorway doesn't mean reopening the palette. Tab (kb) / Ⓧ (pad) flips the
   palette open over the tray. Demolish arms via the bound key and the tray shows it as
   an armed state (wrecking-bar glyph) rather than an invisible modifier.
3. **Own-work overlay**: entering build mode, the server sends your built-tile keys once
   (delta-maintained thereafter); your own work glints faintly, and hovering it with
   demolish armed shows a red dashed outline + a salvage preview chip (*"+2 boards"*).
   What isn't yours simply never highlights — the "not yours to tear down" refusal
   becomes something you can *see* before you swing.
4. **ONE KEYMAP compliance**: new actions `buildRotate`, `buildDemolish` in bindings.ts
   with strip hints rendered from the live bindings (the hard-coded `KeyX` dies). Pad
   grammar unchanged: Ⓐ place, Ⓨ demolish, Ⓑ done, RB rotate.

---

## Part III — Phases

| phase | ships | proof |
|---|---|---|
| **0 — The honest pack** | pickup partial-fit fix; buildThump moved to completion; cancel-reason surfacing; tickBuild occupancy re-check | unit tests on addItem/pickup overflow; live check |
| **1 — The board economy** | board/oak_board items + icons; sawhorse tile/station/buildable + art + STATION_FACE; saw recipes; full cost-ledger conversion; content tests pin the ledger | 121fps bake check; body-ruler + top-plane screenshot audit on the sawhorse; tests green |
| **2 — The salvage law** | demolish action + deterministic salvage + fx/sfx ceremony; LAYER LAW prev-tile fix + floor re-register; demolish safety checks | salvage math tests; layered build/demolish live-verified; fx reads at noon + night |
| **3 — The true ghost** | piece-true ghost + full validity mirror + reason chips; reach ring; `orient` on the wire + buildRotate; drag-to-place queue; builder-faces-the-work pose + site progress | orient validation tests; 20-wall drag run live; pad + kb parity |
| **4 — The builder's tray** | palette v2 (categories/sort/detail); persistent tray + recents; own-work overlay + salvage preview; bindings actions + strip hints | pad-nav full traversal; screenshot audit vs Workshop anatomy |
| **5 — The town knows** (content dressing) | authored sawhorses in Dawnmead/Amberford/Timberway; one teaching crumb each for Tinker Fen + Carpenter Stig (voice cards, ≤55 words) | VOICE checklist; dialogue validator |

Out of scope (named so they're chosen, not forgotten): touch building, blueprint/stamp
multi-tile templates, shared/guild build permissions, home storage chests (wants its own
epic — the bank/chest audit found placed crates are pure decor).

---

## Part IV — Laws this plan answers to
- Loot flood-law da3a5b7: salvage is deterministic, no player-state dials. ✔
- ONE KEYMAP f620d1c: all new keys through bindings; hard-coded KeyX removed. ✔
- pickWorld b9b5cff: ghost + drag picking already routes through it; stays. ✔
- VOICE 5ed8743: all new strings above written to the quartermaster register; Fen/Stig
  crumbs against their cards. ✔
- TILE-IS-THE-STATE: sawhorse is a plain station tile; no new state class. ✔
- Body-ruler + top-plane: sawhorse art audited beside the rig. ✔
- Frontier claim rings: build/demolish already invalidate ringCache; salvage and layer
  changes keep those hooks. ✔

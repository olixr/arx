# The Grand Refit — THE HALL FITS THE HAND

*Design review 2026-08-01. Status: **PROPOSED — awaiting green-light.***

Four chrome passes have shipped (f17d8ef linen/gold → 8a474dc flat slate →
c9e74b8 iron/oak/brass case → 614be7c quiet console) and the menus still fight
the player. That is the finding that frames this epic: **every prior pass was a
skin pass, and the wounds are structural.** The space waste on a 4K panel, the
scroll traps, the focus ring hiking across two scroll columns to press one
button, the literal `Q` and `E` shown to a hand holding a gamepad — none of
that is paint. It is layout, navigation grammar, and a token system that never
grew past colors.

This epic is the structural pass: one ruler for every size, one truth for every
material, a pad grammar where the verb comes to the hand, and then — on that
foundation — a bespoke, curated relayout of every room in the game, each one
designed for what it does, sized for a couch, and finished like we mean it.

Arx is gamepad-first. The mouse is a guest. Every decision below is made in
that order.

---

## Part 1 — Audit: what exists today (verified in code, 2026-08-01)

### The anatomy

- Three tiers of surface: `.ui-screen` (major menus, iron case frame, input
  gate), `.ui-tray` (loot/sign quick furniture, lighter frame, also gates), and
  bespoke ids (banners, work card, build tray, dialogue cinema — deliberately
  outside the gate). The gate itself is a live DOM query run every frame
  (`main.ts:2316`).
- `panel.ts` (169 lines) is the entire shared kit: `dressPanel`, `bigButton`,
  `iconTile`, `needChip`, `meter`, `levelBadge`, `sectionHead`, `statPlaque`.
  `bigButton` is the only helper that stamps pad-nav data — nav coverage
  tracks wherever it happened to be used.
- `panels.ts` is 2,396 lines carrying character/pack, skills, and the whole
  techniques codex. `stationPanels.ts` is 1,659 more for five station screens.
  `style.css` is 7,442 lines: ~7.6% shared vocabulary, ~80% per-screen
  one-offs.
- `chrome.ts` paints the 9-slice material kit (iron/brass/leather/parchment)
  at boot — genuinely good bones, and the one part of the visual language
  that already feels bespoke.

### The scale wound (the deepest one)

- **One media query in 7,442 lines** (character creation only). **Zero rem.**
  All 198 `font-size` declarations are hand-tuned px across 33 distinct values
  (8.5px to 48px, with half-pixel strays like 13.5px).
- Every screen is px-capped: `.screen-arts` is `min(1240px, 94vw)`. At
  1920×1080 that is 65% of the display; at 4K/1× it is **32% of the display
  with 13px body text**. Nothing anywhere couples UI size to the viewport.
  Ten-foot readability rests entirely on desk-tuned numbers.
- The one genuinely adaptive layout in the codebase is the pack grid's
  container-query clamp (`--pack-cell`, style.css:1188). It is the proof the
  approach works — and it exists exactly once.

### The token wound

- 24 CSS tokens, all color/shadow/font. **No spacing, radius, size, or type
  tokens.** 120 hex literals outside `:root`, 247 untokenized rgba values.
- At least 10 competing golds beside the 4 gold tokens; four near-identical
  brass-ink browns; a whole violet family (Callings, dialogue cinema) with
  zero token coverage; stale fallbacks from a pre-refit palette still shipping
  (`var(--line-strong, #4a3c58)`).
- `chrome.ts` keeps its own brass/iron swatches that diverge from the CSS
  golds (`#c99a3e` vs `--gold #d9a441`). Two sources of truth for one metal.
- Two contradictory vocabularies coexist: painted case furniture beside plain
  `1.5px solid` rounded rectangles (`.need-chip`, `.lvl-badge`, glyph chips) —
  the exact thing the stylesheet's own header forbids. 12 distinct
  border-radius values. Glyph chips re-specified in 5 places at 5 sizes.

### The pad-grammar wound

- `UiNav` is pure spatial scoring over every visible `[data-nav]` — no
  regions, no wrap, no memory of rows. Scroll reachability hangs on
  `scrollIntoView({block:'nearest'})` alone.
- **The verb never comes to the hand.** The techniques flow measured: focus a
  plate in the left scroller, Ⓐ only *inspects*; then walk the ring across a
  grid gap into a second scroller and descend a variable-height bench to reach
  `Seat on Q` / `Seat on E` buttons appended last (`panels.ts:2377-2391`). An
  already-seated art shows **no seat buttons at all** — moving an art between
  seats has no control anywhere. The action strip on a plate reads only
  `Ⓐ Inspect · Ⓑ Close`.
- The item verb menu exists only for pack cells (`dataset.invslot`); bank,
  shop, techniques, and every other collection improvise inline buttons
  instead.
- `screenArts` has **no pad binding** — Techniques is reachable only by
  bumper-cycling the dock (`bindings.ts:110`).
- Zero `data-nav` in: hotbar, build tray, craft HUD, chat, party HUD, waypoint
  HUD, objective tracker, and — despite being modal — `petNaming`.

### The glyph wound

- `panels.seatKey` (`panels.ts:1893-1901`) reads the **keyboard** binding
  only. Every sentence it feeds shows `Q`/`E` on a gamepad: the school-head
  chips, the plate corner seals (`.r-badge`), the plate sub lines ("On your Q
  key"), the bench state line, both `Seat on …` buttons, the teach line. The
  skills-card tooltip hardcodes a literal `R` (`panels.ts:1400`); the arts
  hint in `main.ts:1239` says "Q and R" — stale twice over.
- The arts panel never re-renders when `.pad-mode` flips, so even a fixed
  helper would not update live.
- The dual-chip mechanism (`.kb-glyph` + `.pad-glyph`, CSS-swapped on
  `body.pad-mode`) already exists and works — hotbar, dock, loadout strip,
  controls menu all do it right. The rot is every string that bypassed it.
- Shoulder chips (LB/RB/LT/RT) carry no per-button color; tutorial and build
  hints bake `bindings.kbBadge(...) || 'letter'` into prose.

### The magic-number ledger (severest entries)

- `.panel-head::after` accent inlay: hardcoded `left:86px; width:190px`.
- `#equip-anatomy` spine: `top:40px; height:267px` hand-derived from cell
  math; `.worn-kit` fixed at 258px.
- `#stable-list max-height:420px` (viewport-independent); `.screen-stable`
  has no CSS rule at all.
- Bottom-lane constants that must stay mutually consistent by hand: hotbar
  `bottom:14px`, action strip `bottom:92px`, build tray `bottom:176px`,
  loot tray `bottom:96px`, sign tray `bottom:120px`.
- Three different fixed side columns: craft `420px`, arts `400px`, journal
  `340px`.
- `#item-menu` has no max-height and no scroll; `#item-card` is fixed 450px.
- Animation is feast-or-famine: 18 keyframes on the level-up ceremony,
  **zero** motion on opening a screen, zero transition on any hover.

---

## Part 2 — The standing laws of the refit

These are the laws every phase obeys and every future menu inherits.

1. **THE ONE RULER.** All UI geometry derives from a single scale unit. The
   interface is designed on a 1920×1080 reference canvas; a boot- and
   resize-computed root scale renders that design proportionally on any
   display. No px size outside the token sheet, ever again.
2. **NOTHING LIVES BELOW THE FOLD.** Every screen's structure — all regions,
   all verbs, all seats — is visible at reference size with nothing cut off.
   Only uniform collections (vault items, quest lists) may extend, and they
   extend by **paging, not hidden scroll**: trigger-stepped leaves with page
   dots. A scrollbar is an admission of defeat reserved for prose.
3. **THE VERB COMES TO THE HAND.** Whatever the ring is on, its verbs are one
   press away, at the focus point. No action requires traveling to another
   region. The context sheet (today's item menu, generalized) is the one
   grammar for secondary verbs on *everything*.
4. **EVERY GLYPH KNOWS ITS DEVICE.** No bare key letters in any string,
   anywhere. Seat chips, hints, and prompts are dual-chip nodes (kb + pad,
   CSS-swapped) or device-reactive renders. `seatKey()` dies. The words
   around a glyph obey the quiet quartermaster voice (docs/VOICE.md).
5. **ONE MATERIAL TRUTH.** One palette/token module in TypeScript feeds both
   the chrome painter and the stylesheet. The flat-rectangle vocabulary is
   retired; every element wears the painted kit or its sanctioned flat-inlay
   variant. One chamfer system, one radius scale, one type ladder.
6. **SHOW, DON'T SPELL.** Where a number or sentence stands today, prefer an
   emblem, a ring, a row of seals, a filled socket. Text is for names and one
   line of meaning; the composition carries the rest. This is a game — the
   menus are part of the toy.
7. **MOTION IS FURNITURE, NOT FIREWORKS.** Every screen opens and closes with
   a short settle; focus, paging, seating, and confirmation each have a
   micro-motion; ceremonies keep their fireworks. All of it compositor-only
   (transform/opacity), honoring `prefers-reduced-motion` and a Settings
   toggle — the render-perf law stands: the UI never taxes the world.
8. **BESPOKE ROOMS OFF ONE HALLWAY.** The kit is shared; the rooms are not
   homogenous. Each screen is composed from the kit *for its own purpose* —
   the codex reads like a codex, the vault like a vault. Reuse lives in the
   pieces, curation lives in the arrangement.
9. **THE HAND NEVER GETS LOST.** Pad navigation runs on declared regions with
   an entry point, ordered traversal, wrap where natural, and trigger paging
   — spatial scoring only inside a region. Focus always lands somewhere
   meaningful when a room opens, and the action strip always tells the truth.

---

## Part 3 — The foundation (Phases 1–2 deliverables)

### 3a. THE ONE RULER — the scale system

- `ui/kit/scale.ts`: computes `--ui-scale` at boot and on resize:
  `scale = clamp(0.75, min(vw/1920, vh/1080), 2.75)` in CSS pixels, snapped
  to 1/8 steps so painted borders stay crisp. Sets
  `html { font-size: calc(16px * var(--ui-scale)) }`; the entire stylesheet
  converts px → rem in one audited sweep (a codemod, then hand-review of the
  ~30 places that must stay px: hairlines, the world canvas).
- **UI Size setting** in Settings — `Snug / Standard / Grand` (0.9× / 1× /
  1.15× multiplier on the auto scale), persisted like `arx.zoom`. Grand is
  the ten-foot couch answer; the default already fits a TV because the auto
  scale tracks the panel.
- `chrome.ts` border constants become rem-derived (`--frame-border:
  calc(24rem/16)`); `K = 5` oversampling already gives the painted slices
  headroom past 2.75×, so nothing blurs.
- HUD lanes become tokens: `--lane-hotbar`, `--lane-strip`, `--lane-tray` —
  the hand-tuned 14/92/96/120/176 bottom constants collapse into one stack
  that cannot drift apart.

### 3b. ONE MATERIAL TRUTH — tokens and palette

- `ui/kit/palette.ts`: the single TS source for every material — leather,
  iron, brass, parchment, the gold ramp (consolidated from 10+ strays to
  gold-deep / gold / gold-bright / gold-hot), ember, verdant, arcane violet
  (finally tokenized), water-blue, and the brass-ink browns unified to one.
  Boot injects them as CSS custom properties; `chrome.ts` imports the same
  object. The stale fallbacks and dead tokens are purged.
- Token ladders beside the colors: **space** (2/4/6/8/12/16/24/32 design-px),
  **radius/chamfer** (chip 4 / plate 7 / case 13 + the 45° cut), **type**
  (a 6-step ladder: whisper 12, label 13.5, body 16, lead 18, title 24,
  display 30 — serif for names and titles, sans for working text; the 33
  ad-hoc sizes map onto these six), **stroke** (hairline 1.5 / rule 2 / rim 3).
- Contrast floor: body text ≥ 4.5:1 on its field, labels ≥ 3:1 — checked once
  in the token sheet, inherited everywhere.

### 3c. THE KIT — component library v2 (`ui/kit/`)

Everything below stamps its own nav data, wears the painted materials, and
ships with its motion built in. `panel.ts`'s helpers migrate in or retire.

- **Room** — the screen shell: case frame, crest, banner title, hint line,
  close chip, open/close settle (a 140ms rise-and-land; the case *opens*).
  Declares its nav regions on construction.
- **Region** — a declared nav zone: entry element, traversal order
  (grid/list/rail), wrap policy, and an optional page model. UiNav v2 walks
  regions; spatial scoring only applies inside one.
- **Ledger** — the paged collection: fixed rows-per-leaf computed from the
  region's height, trigger-stepped leaves, page dots, edge-peek of the next
  leaf, sort chips. Replaces every naked `overflow-y:auto` list.
- **PlateGrid** — the item/technique/skill plate wall; plates are the big
  graphical units (portrait, seals, ring), one plate size scale, focus lift.
- **Socket** — the seat: a painted well that shows its glyph chip (dual-chip),
  its occupant, and a landing flash when something seats.
- **SeatChip** — the device-true glyph: kb + pad children, CSS-swapped,
  re-rendered on `bindings.onChange`. The only legal way to name a button.
- **ContextSheet** — the universal verb menu: any focusable can declare
  verbs; Ⓨ (or right-click) opens the sheet *at the element*; modal to the
  ring; max-height and scroll finally defined. Pack, bank, shop, techniques,
  social rows, stable — one grammar.
- **Inspector** — the fixed-anatomy detail card region (portrait, name line,
  seals, stat runes, one-line story): renders on focus, never causes travel.
- **TabRail / WingTabs** — trigger-paged tabs with pips, one look everywhere.
- **Meter / RingGauge** — the linear gauge stays; RingGauge is new: a radial
  progress ring for emblems (skills, schools, bond) — the "show, don't
  spell" workhorse.
- **Chip family** — need-chip, level-badge, price-tag, faction band —
  re-cut as painted inlays (flat-facet, chamfered) so the second vocabulary
  dies.
- **EmptyState** — every empty region says one warm quartermaster line with
  an emblem, never a blank well.
- **Ambient** — the optional room backdrop: drifting ember motes / dust in
  the case shadow at ≤0.1 opacity, transform-only, paused when the room is
  closed, off under reduced motion. The "draws me in" layer, budgeted.

### 3d. Stylesheet architecture

`style.css` splits into `src/styles/`: `tokens.css` (generated header +
ladders), `kit.css` (the component layer), `hud.css`, one file per room
(`screens/codex.css`, …), imported by Vite. The 7,442-line monolith retires;
per-room files keep bespoke curation reviewable.

---

## Part 4 — Pad grammar v2 (Phase 3)

- **Regions, not raw geometry.** UiNav v2 keeps the gold ring and the
  data-key focus persistence, but navigables group into declared Regions.
  Stick/d-pad walks within a region (with wrap where the region says so);
  region hops happen at edges or via triggers. The scoring bug class — ring
  wandering into another column mid-list — dies by construction.
- **LT/RT page and jump.** Inside any room: LT/RT step the room's primary
  pager (school rail, ledger leaves, wing tabs). LB/RB keep cycling screens
  (the standing shelf affordance). The map keeps its LT/RT zoom claim.
- **Ⓐ acts, Ⓨ opens the sheet, everywhere.** Ⓐ is the plate's *primary* verb
  (seat, equip, buy, track — the thing you came to do), not "inspect".
  Inspection is free: the Inspector renders on focus. Ⓨ opens the
  ContextSheet for secondary verbs on anything that has them. Ⓧ keeps carry.
  The action strip always names the real verbs.
- **THE SEAT ANSWERS ITS OWN BUTTON.** When a seat choice is open (seating a
  technique, assigning a hotkey-adjacent thing), pressing the *actual
  button the seat lives on* chooses it: LB seats the LB seat, LT the LT
  seat. The menu teaches the hand the fight control by using it.
- **The Screen Ring.** Hold Start: a radial ring of the ten screen crests
  fans around the stick; flick, release, the room opens. Every screen one
  gesture away — Techniques finally has a direct pad path — and it is the
  first thing a new player will show a friend. (Tap-Start keeps its binding.)
- **Glyph truth sweep.** `seatKey()` is deleted; every call site becomes a
  SeatChip or a device-reactive render. The arts screen re-renders on mode
  flip (one `pad-mode` observer in Room). The stale "Q and R" hint, the
  skills-card "choose your R", the tutorial prose, the map hint strings —
  all rewritten device-true, in the quartermaster voice, dash-ban clean.
- **Nav coverage closes.** Modal petNaming gets nav. Hotbar, dock, and trays
  get focusable stops in pad mode where verbs exist. The controls menu's
  rebind overlay behavior is unchanged.

---

## Part 5 — The rooms, bespokely (Phases 4–6)

Each room: its purpose, its new composition at reference size, its pad flow.
All of them: zero structural scroll, Inspector on focus, ContextSheet on Ⓨ,
open/close settle, ambient backdrop where it serves.

### The Codex (Techniques) — the flagship

The room where the player *arms themselves* becomes one glance, three regions:

- **The Loadout Altar** (top strip, always visible): four painted Sockets —
  the two technique seats wearing their live SeatChips (LB/LT on pad, Q/E on
  keys), relic, sigil. Occupants shown as art portraits; a dormant secret
  dims with its "the blade is away" mark.
- **The School Rail** (left, one column of school emblems): each school is a
  crest with a RingGauge (level), a pip for unseen arts, and its accent.
  LT/RT (or rail focus) steps schools — **one school's ladder shows at a
  time**; the eight-ladder scroll and the sticky jump strip retire.
- **The Ladder** (center): the chosen school's ten arts as large plates in a
  5×2 PlateGrid plus the secret shelf row — all visible, no scroll. Plates
  carry rank seals, the NEW pip, the seated glyph, the lesson meter.
- **The Inspector** (right, fixed anatomy): renders on focus — portrait,
  name, rank ledger, stat runes, one teach line. Travel to it: never.

Pad flow: focus a plate → Ⓐ opens the seat sheet *at the plate* → press LB
or LT (the seat answers its own button) → the art flies to its socket, the
socket flashes, done. A seated art's Ⓐ offers swap/unseat (the missing
re-seat control, fixed). Callings live on a wing tab (RT from the last
school), same anatomy, violet accent, Focus meter as a RingGauge.

### The Pack & the Worn Kit (Character)

Keeps its identity as the right-hand case with the world visible beside it.
The paper-doll anatomy is rebuilt on kit geometry (the hand-derived spine
dies); worn cells become Sockets with set-glow when enchant sets complete.
The pack keeps its container-clamped grid — promoted to the Ledger pattern
with family tabs as painted filter chips. The item card becomes the
Inspector anatomy (scaled, not fixed-450px). Bank/shop pairing law stands.

### The Skills Hall

24 skills as one wall of emblems — each a crest with RingGauge progress,
level numeral, and wing grouping; no scroll at reference. Focus raises the
hero Inspector: the skill's story line, the next unlock as a picture
(recipe portrait, art plate), and its `techgo`/`callgo` doors as verbs.
The XP table energy stays visual: the ring fills, the numeral is bold, the
prose is one line.

### The Maker's Wing (Workshop, Builder's Table, plant)

The shared make-anatomy is kept but re-cut: recipe Ledger left (paged),
the **Workbench** right — a large staging composition where the product
portrait sits on the bench with its needChips arrayed as physical
ingredients, quantity dial, and one big verb (`Forge`, `Weave`, `Saw` — the
station's own word, as today). Station accent and crest re-dress per anchor
(kept). Unmake keeps its arm-then-confirm. The work card and build tray
join the HUD lane tokens.

### The Vault & the Store

Vault: family tabs, paged 7-wide grid leaves, the armory shelf as its own
region, a capacity RingGauge. Store: shelf cards become plates with painted
price tags; Buy 1 / Buy 5 as the plate's Ⓐ / sheet verbs; faction pricing
shown as the band ribbon on the header. The Stalls finally get a real room
(`.screen-stable` styled, portraits as plates, the 420px cap dies).

### The World's Wing

- **Journal**: quest Ledger left (paged, tracked pin first), the quest as a
  parchment sheet right with objective checkboxes as painted seals and the
  tracked quest's objective echoed to the HUD tracker.
- **Standing**: five faction crests in a row, each wearing its band ribbon
  and a RingGauge to the next band; focus tells the consequences plainly.
- **Social**: the five sections become tabs (party first), rows as plates
  with portrait chips; the search line keeps its typing lock.
- **Settings**: sections become tabs (Sound / Display / Controls / UI Size);
  the controls table keeps its capture plate; every slider a painted dial.
- **Riftgate / dungeon furniture**: dressed by the kit, unchanged in law.
- **The Chart**: canvas stays; its chrome, hints, and reticle join the kit
  and the glyph truth sweep.

### The HUD & the ceremonies

Hotbar sockets, dock keys, buff/passive chips, chat, trays: re-cut on the
lane tokens and the scale ruler (they finally grow on a TV). The dock keeps
its 2×5 keypad but reads from `SCREEN_ORDER` so the two can never disagree.
Banners and the level-up ceremony keep their fireworks, re-based on tokens.
The everyday layer gains its missing micro-motion: hover/focus lift on every
pressable, press-settle already exists, paging slides, seat landings.

---

## Part 6 — The phases

Each phase lands green, committed, and provable before the next begins.

1. **THE ONE RULER** — scale system, px→rem sweep, palette/token module
   feeding CSS and chrome painter, HUD lane tokens, UI Size setting.
   *Receipt: the same screen photographed at 1080p and 4K is the same
   composition; a token-sheet page renders every ladder.*
2. **THE KIT OF ROOMS** — `ui/kit/` components, material reconciliation
   (chip family re-cut), stylesheet split, Room open/close motion, Ambient.
   *Receipt: a kit gallery room (dev-only) shows every component in both
   input modes.*
3. **THE HAND KNOWS THE ROOM** — UiNav v2 regions, LT/RT paging, Ⓐ/Ⓨ verb
   law, ContextSheet everywhere, THE SEAT ANSWERS ITS OWN BUTTON, the
   Screen Ring, the glyph truth sweep (seatKey dies).
   *Receipt: pad-walk script seats a technique in ≤4 presses from a cold
   open; DOM audit finds zero bare seat letters in pad mode.*
4. **THE PERSONAL WING** — Codex flagship, Character/Pack, Skills Hall.
5. **THE MAKER'S WING** — Workshop, Builder's Table, Vault, Store, Stalls,
   work card, build tray.
6. **THE WORLD'S WING & THE LIVING CHROME** — Journal, Standing, Social,
   Settings, Riftgate, Chart dressing, HUD/hotbar/dock/trays, ceremonies
   re-base, final delight pass.

### The proving rig

`npm run ui:gallery -w @arx/tools`: a Playwright pass that logs into the
isolated rig (`ARX_PROVE_URL`, per the beastcraft law), opens every screen
in both input modes at 1920×1080 and 3840×2160, and writes a screenshot
contact sheet per phase. Structural receipts asserted in DOM: no horizontal
overflow, no unintended scrollable region, no `.kb-glyph`-only labels in
pad mode, every `.ui-screen` has ≥1 navigable region. The contact sheet is
reviewed by eye every phase — layout is a looked-at thing.

---

## Part 7 — The defect ledger (audit → payer)

| Defect (file:line) | Paid by |
| --- | --- |
| px-capped screens waste 4K (`min(1240px,94vw)` etc.) | Ph1 |
| 198 px font sizes, 33 values, no ladder | Ph1 |
| 10+ stray golds, violet family untokenized, stale fallbacks | Ph1 |
| chrome.ts palette diverges from CSS | Ph1 |
| bottom-lane constants 14/92/96/120/176 hand-coupled | Ph1 |
| flat-rectangle vocabulary vs painted kit | Ph2 |
| glyph chips re-specified 5×, shoulders colorless | Ph2 |
| no screen open/close or hover motion | Ph2 |
| `#item-menu` no max-height; pack-only | Ph3 |
| seatKey kb-only leak (panels.ts:1893 + 8 call sites) | Ph3 |
| arts panel never re-renders on mode flip | Ph3 |
| `screenArts` unreachable directly on pad | Ph3 (Screen Ring) |
| stale "Q and R" hint (main.ts:1239), "choose your R" (panels.ts:1400) | Ph3 |
| petNaming modal without nav | Ph3 |
| two-column seat trip; equipped arts un-reseatable | Ph4 |
| eight-ladder scroll + jump-strip crutch | Ph4 |
| `#equip-anatomy` hand-math spine; `.worn-kit` 258px | Ph4 |
| `#item-card` fixed 450px | Ph4 |
| `.screen-stable` unstyled; `#stable-list` 420px cap | Ph5 |
| fixed side columns 420/400/340 | Ph4–6 |
| `.panel-head::after` hardcoded inlay geometry | Ph2 |
| dock order duplicated vs `SCREEN_ORDER` | Ph6 |
| chat log 176px cap | Ph6 |

---

*The name is the promise: when this epic closes, the hall fits the hand that
holds the pad, the eye that sits ten feet away, and the game it belongs to.*

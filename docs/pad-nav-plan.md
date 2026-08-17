# THE HAND FLIES — pad navigation conveniences

A working plan for the gamepad menu overhaul. The Grand Refit
(docs/ui-redesign-plan.md) built the rooms for a pad; this is the pass
that makes moving through them cost nothing. Read that plan's standing
laws first — nothing here repeals them.

## 0. The audit (2026-08-12, read from the code)

What a pad player actually pays today, verified in `ui/padUI.ts` and
the screens:

1. **THE VERB DOES NOT COME TO THE HAND.** Every maker room is a
   ledger on the left and the chosen work on the right. Pressing Ⓐ on
   a recipe row only *selects* it; the Make 1 / × 5 / Make all buttons
   sit in the far column, four to nine spatial steps away. The mouse
   pays one click for what the pad pays ten. Same wound in the vault
   (row → Withdraw), the skills wall (emblem → hero pane), the codex
   (plate → bench), the riftgate, the stalls.
2. **REGIONS WERE DECLARED AND NEVER USED.** `moveFocus` implements
   THE REGION HOLDS THE RING against `[data-region]` — and only five
   elements in the entire app declare one (skills ×2, arts ×3). Every
   other room walks a raw spatial field, so ▼ down a recipe ledger can
   step sideways into the detail pane and strand the cursor.
3. **THE RING FALLS HOME ON EVERY RE-RENDER.** Panels rebuild their
   DOM wholesale (a sale, a deposit, a craft tick). When the focused
   navkey vanishes, `update` lands focus on the panel's *first row* —
   so selling the eighth pack slot throws the cursor back to slot one,
   every time.
4. **NO PLACE MEMORY.** LB/RB cycle screens; coming back always starts
   at the first row. Ⓑ is all-or-nothing: it closes every panel, so
   there is no cheap way to step back out of a detail pane.
5. **ONE SPEED.** 300ms to first repeat, then a flat 125ms/step, and
   the stick is a switch at 0.55 deflection — a full pack (28 cells)
   is ~3.5 seconds of held stick with no way to hurry.
6. **THE SHEET IS A LIST.** The one context-verb grammar (Ⓨ) opens a
   vertical list beside the anchor. On a stick, a list is the slowest
   possible shape; the pad already has a proven radial (the Screen
   Ring) and does not use it for verbs.

## 1. The laws

- **THE HAND LANDS ON THE WORK.** Choosing a thing moves the cursor to
  what you would do with it next. Declared, never guessed:
  `data-navnext` on the element names where focus goes after its
  activation. A target that does not exist is not an error — focus
  simply stays.
- **THE ROOM IS MADE OF ROOMS.** Every column, tray, rail and grid
  declares `[data-region]`. The ring leaves a region only when that
  region has nothing further in the pressed direction.
- **THE RING HOLDS ITS GROUND.** A re-render never sends focus home.
  A vanished navkey recovers to the nearest navigable to where the
  cursor physically was, and each screen remembers its last stop.
- **Ⓑ WALKS BACK BEFORE IT SHUTS THE DOOR.** If the cursor was
  advanced (by a `navnext`) or sits in a sheet, Ⓑ retraces one step.
  Only a cursor with nowhere to retreat closes the room — Ⓑ and Esc
  still agree at that last step.
- **THE STICK HAS A THROTTLE.** Repeat rate reads deflection, and a
  held direction accelerates. A pad crosses a full pack in about a
  second when it means to, and still lands one cell when it taps.
- **VERBS FAN OUT.** On a pad, the context sheet is a radial: verbs
  around the anchor, chosen by flicking the stick, confirmed on Ⓐ, and
  any verb wearing a `padButton` still answers that button directly.
  Mouse and keyboard keep the list — same DOM, same clicks.

## 2. Phases

- **Ph1 THE ENGINE LEARNS MANNERS** (`ui/padUI.ts`): `data-navnext`
  advance with a resolve window that survives async re-renders; spatial
  focus recovery + per-screen place memory; Ⓑ retrace; analog throttle.
- **Ph2 THE ROOMS DECLARE THEMSELVES**: `[data-region]` on every
  column in index.html and the code-built bodies; `data-navnext` on
  every list row that feeds a detail pane.
- **Ph3 THE VERBS FAN OUT**: radial context sheet in pad mode
  (`ui/kit/contextSheet.ts` + `styles/padlayer.css`), flick-select in
  the sheet branch of `UiNav.update`.
- **Ph4 THE WORK ANSWERS FROM THE ROW**: sheet providers for maker
  rows — Make 1 / × 5 / Make all straight off the recipe, so the
  detail pane is a *reading*, never a toll booth.

## 3. Proving (as run, 2026-08-12, lane-3 rig 5178/8795)

`scratchpad/prove-pad-nav.mjs`: a fake pad (`navigator.getGamepads`
override) drives the real client headless. All proofs passed live:

- ADVANCE: Ⓐ on `recipe:fletch_arrows` landed the cursor on
  `craft:fletch_arrows:1` inside `#craft-detail` — two presses from
  ledger row to craft, against eleven before.
- RETRACE: Ⓑ walked back to the row; the room stayed open.
- WHEEL: Ⓨ on the row fanned 3 verbs radially (below `RADIAL_MIN` 3
  the sheet stays a list — a one-verb wheel floats orphaned plates).
- STEER: stick east put the focus on the east spoke; Ⓐ took it and
  the craft handed off to the world.

Harness gotchas, hard-won:
- The pad translator memoizes per `id|timestamp` — a fake pad MUST
  advance `timestamp` (a getter on `performance.now()`), or the idle
  memo serves forever and no press is ever seen.
- `window.__arx` now carries `nav` and `input` (the proving levers);
  read `nav.focusKey` for the ring's truth, never `elementsFromPoint`.
- Item id is `log`, not `logs`, for the /give stock.

## 4. THE BUMPER TURNS THE LEAF (2026-08-16)

THE BUMPER SERVES THE ROOM (a946eab) left one family of rooms
orphaned: rail-less rooms whose list is dealt onto ledger leaves —
every maker's bench, the build board, the quest log. There a bumper
still walked the shelf of screens, marching the reader off the smithy
mid-recipe; the only leaf-turn on the pad was cursor-walking down to
the foot arrows. Repaired as one grammar extension:

- **The stepper ladder** (`padUI.bumperStep`): section rail
  (`data-tabs`) → room pager (`data-pager`, the ledger) → only then
  the shelf of screens. `roomPager()` is the ONE pager election
  (shared with LT/RT `dispatchPage`): the first non-rail `[data-pager]`
  in the open room, the rail itself when it is the room's only pager.
  In a rail-less ledgered room the triggers now second the bumpers —
  the same leaf turn under either finger, so no habit is ever wrong.
- **The strip tells the truth** three ways now: `Section` (railed) /
  `Page` (leaved) / `Screens` (neither).
- **THE FOOT TEACHES ITS SHORTCUT** (`kit/ledger.ts`): in pad mode the
  ‹ › turn keys wear the buttons that already turn them — bumper
  glyphs where the ledger owns them, trigger glyphs where a rail has
  first claim (vault, key ring). Glyphs ride `padGlyph` (family-aware,
  THE BUTTON WEARS ITS OWN NAME); `.pad-glyph` visibility rides
  `body.pad-mode`, so mouse hands never meet controller chrome.
  Chips re-dress on every deal and on the leaf's ResizeObserver beat
  (a ledger dealt before parenting cannot yet know its room's rail).
- **THE WHEEL TURNS THE LEAF** (`kit/ledger.ts`): nothing lives below
  the fold, so a mouse wheel over the ledger turns a whole leaf; a
  200ms cooldown makes a trackpad flick one turn, not a riffle.
- **The bench is a counter too** (`main.cycleScreen`): a
  station-anchored workshop (`stationPanels.anchorTile !== null`)
  never yields to the shelf walk even when its list dealt no pager —
  an empty seed pouch must not turn LB into "close the furrow, open
  the skills".

Proving (as run, 2026-08-16, rig13 lane 5230/8830,
`scratchpad/prove-craft-bumpers.mjs`, fresh account + modal look
creator + advancing-timestamp fake pad): Workshop open in pad mode →
strip read `…LB RB Page`, foot chips read `LB`/`RB`; RB turned dot
1→2 with the workshop standing and no other screen opened; LB walked
back; a synthetic wheel turned the leaf; on the pagerless character
screen the strip honestly read `Screens` and RB walked the shelf
(inv → skills) exactly as before. Screenshot kept the judged pass:
chips seated inside the iron turn keys, dots between.

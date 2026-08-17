# THE GILDED HAND — looting made luxurious (looting v2)

The user's brief: looting is the thing we do most and it feels like a chore —
racing other players through unsorted piles, walking loot away to drop the
dregs, a panel that never meets the hand halfway. The ask: a premium, elevated
experience — the best looting on any gamepad. This plan sits on THE DROPPED
WORLD (ground visuals are DONE and stay untouched) and the ground-loot
management epic (merge law, explicit pickup, the first loot panel).

## The laws this epic adds

1. **THE CHOSEN HAND** — walk-over looting is a *preference*, not a fate.
   A per-character, server-persisted toggle (`characters.auto_loot`, default
   on) gates the vacuum at its one seam (`tickDrops`, beside the sneak skip).
   Toggled from the Settings room AND from a chip in the loot panel's head —
   the control lives where the itch is.
2. **ONE SWEEP, ONE ANSWER** — Take All becomes a real protocol verb
   (`C2STakeAll`): one message, one server sweep with the same gates as
   explicit pickup (locks respected, keys to the ring, xp once), ONE coalesced
   pack-full refusal, one inventory push. The old N-message client loop dies.
3. **THE PATIENT PILE** — merge law widened: once BOTH owner locks have
   expired, piles of the same item/roll/provenance fold regardless of who was
   owed them. A battlefield tidies itself after the 30s claim window.
4. **THE RARITY LEDGER** — the ground list reads best-first: rarity band
   descending, sticky first-seen order inside a band (the pad cursor never
   gets reshuffled; newcomers enter their band, animated).
5. **THE HERO ROW** — Take All is the first, biggest row and the pad's
   DEFAULT FOCUS when the panel opens. One press sweeps; nobody hunts.
6. **THE HAND MOVES ON** — taking a row auto-advances focus to the next; a
   picked-clean panel does not slam shut but offers ONWARD — the nearest
   pile-cluster beyond reach (≤ 8 tiles) as a single focused act: press once,
   walk there, the panel re-anchors and refills. The sweep becomes a rhythm.
7. **THE OPEN GROUND** — the inventory screen grows a fourth tray, "On the
   Ground", live while loot is in reach: the same ledger component, drag a
   ground row into the pack to take it, drag a pack slot onto the ground tray
   to lay it down (it lands at your feet and merges). The banking two-pane
   grammar, reimagined for the dirt. This is also the seam future containers
   (chests, cabinets) will speak through.
8. **EVERY EDGE IS A MOTION** — rows are KEYED DOM (eid), never nuked:
   arrivals slide in staggered, takes fly out and collapse, qty changes pulse.
   All motion gates on `body.no-ui-motion` + `prefers-reduced-motion`.
9. **ONE LEDGER, TWO ROOMS** — `ui/groundList.ts` is the single component
   behind both the quick tray and the inventory pane; the sort/focus/advance
   laws are pure exported functions, test-pinned.

## Phases

- **Phase 1 — THE CHOSEN HAND + ONE SWEEP (server/wire)**: migration 41
  `auto_loot`, accounts load/save (carry_style template), `C2SLootPref` +
  `C2STakeAll` (+ parser cases, session routes, misc bucket), vacuum gate,
  `takeAllDrops` sweep, merge-expiry amendment in drops.ts, login echo of the
  pref, protocol 34→35. Tests: drops.test.ts expiry folds, pickup.test.ts
  take-all slate (coalesced refusal, xp once, locks), accounts round-trip,
  messages parser.
- **Phase 2 — THE GILDED TRAY (client)**: groundList.ts component (keyed rows,
  rarity ledger, hero row, auto-advance, ONWARD chip, motion), lootPanel
  becomes its tray shell, head chip for auto-pickup, default-focus wiring
  through UiNav, radial verbs via the existing context sheet where they earn
  their place. Settings toggle row. Pure-law tests.
- **Phase 3 — THE OPEN GROUND (client)**: the inventory's ground tray, drag
  both directions through the existing Panels drag system, pane/tray
  exclusivity (inventory open = pane owns the conversation).
- **Phase 4 — proof**: suites + tsc all packages, live rig walk (lane pattern)
  with pad emulation; screenshots of the tray, the sweep, the two-pane drag.

## Deliberate non-goals

- Corpse-container looting (no corpse entity exists server-side; ground piles
  ARE the model THE DROPPED WORLD invested in — a container UI would bury the
  art). The OPEN GROUND pane is the forward seam if containers ever come.
- Loot filters/wishlists, partial-qty ground takes (deferred with the same
  note as the first epic).

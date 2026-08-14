# THE SECOND GRIP — weapon sets & the swap verb

*Design review 2026-08-14. Plan of record for the "ranged sidearm" door left open by
combat-v2 (docs/combat-v2-plan.md Part 5 §1: "TWO WEAPON SETS with one swap verb…
swap-sets is the recommendation — smallest surface, biggest freedom"). This plan
answers that open question in full: what a set is, what may be carried, how the swap
feels, how it is worn on the body, how it is shown in the HUD and the character room,
and how every device reaches it. AWAITING GREEN-LIGHT; phases ship in order.*

---

## Part 0 — Audit receipts (verified against HEAD, 2026-08-14)

What exists today, with citations:

- **One weapon slot, one offhand.** `EquipSlot` union + `EQUIP_SLOTS`
  (shared/src/entities.ts:182-207). The offhand is a live simultaneous hand
  (dual wield / shield / tome / back-mounted quiver), never an alternate.
  Grep for weaponSet/altWeapon/swapWeapon/loadout: zero hits.
- **Equip law lives in one place.** gameServer.ts:11942-12055 — theft gate, level
  gate, the DUAL WIELD unlock (second one-hander → offhand at onehand ≥
  DUALWIELD_UNLOCK_ONEHAND), THE TWO-HANDS LAW (a two-hander sheds a
  non-backMounted offhand and vice-versa, :12002-12013), swap-into-pack, then
  `onEquipmentChanged` (:15718-15729: recomputeGear → inv → equip →
  followLoanSeat → cooldowns → charges → broadcastMetaUpdate).
- **The combo string already dies on a weapon change.** `ComboTrack.weaponId`
  (shared/src/sim/combat.ts:182-196); `advanceCombo` compares ids (:211) —
  a set swap inherits string-death by construction, no new hook.
- **Stow rendering is complete and waiting.** render/sheath.ts: `stowBack`
  (bow/staff/great across the back), `stowBlade` (belt scabbards, main near hip /
  off far hip), `STOW_HANDOFF = 0.5`; rig.ts `drawBackGear` (:7077-7124) draws the
  back-slung kit on the cape layer. Today it only ever draws the ACTIVE weapon
  while sheathed. Nothing draws a second, waiting weapon — the geometry is done,
  the inputs are single-valued (`rig.weaponItem`).
- **Sheathe is a full verb pipeline to clone.** bindings.ts action (kb H, pad d-◀)
  → `InputButton.Sheathe = 1<<9` (shared/src/sim/input.ts) → server toggle
  (gameServer.ts:25041-25067: zeroes drawTicks, resetCombo, drops pendingStrike,
  cancels cast/channel; THE SAFETY auto-draws on a combat press with
  `drawLockUntilTick`) → `SHEATHED_BIT` in the snapshot → client blend + sfx.
  **Input bits 11+ are free.**
- **Every pad button is taken** (bindings.ts:92-94 — ONE KEYMAP; overloading a
  taken button was the founding bug). A pad swap must be a hold or chord.
  Keyboard has free codes (Backquote, Digit2-9, F-row…).
- **The wire and the disk are ready.** `S2CEquipment.equipment` is a
  `Partial<Record<EquipSlot, EquippedItem>>` (messages.ts:884-892) — new slots
  ride free. Equipment persists as `(character_id, slot)` rows
  (accounts.ts:1455-1477) — new slots need NO migration. `C2SUnequip` validates
  against `EQUIP_SLOTS` (messages.ts:1971-1976) — new slot names propagate to the
  whitelist automatically. Remote players see worn gear via
  `AppearanceData.equip` (entities.ts:147-174).
- **The HUD says nothing about the weapon.** No weapon plate, no set indicator;
  the only weapon-adjacent chip is the oil coat on the hotbar (hotbar.ts:284-288).
- **The character room** builds the armor stand by iterating `EQUIP_SLOTS`
  (`equipCell`, panels.ts:1672-1741, `gridArea = slot`).

## Part 1 — The design in one paragraph

A character carries **two weapon sets**: the pair in the hands (the sacred
`weapon`/`offhand` slots — nothing that reads them changes) and a **stowed pair**
in two new slots, worn visibly on the body — a two-hander, bow, or staff across
the back, a blade at the far hip. **One swap verb** trades the pairs through an
honest ~600ms stow-and-draw beat: the live weapon rides to its rest as the waiting
one comes to hand, attacks locked for the beat, casts die, the combo string dies.
The HUD seats a **swap well** beside the belt showing the waiting set under the
live key glyph; the character room grows **the rack** — the stowed pair on the
armor stand with its own verbs. Keyboard swaps on Backquote; the pad swaps by
**holding sheathe** (tap = sheathe, hold = trade), because all sixteen buttons are
spoken for. Stowed steel is furniture: it grants nothing, teaches nothing, counts
for nothing until it is drawn.

## Part 2 — The laws

**LAW 1 — THE HANDS ARE SACRED.** The active set lives in the existing
`weapon`/`offhand` slots. Every reader — `equippedWeapon`, `movesetFor`, gear
folds, procs, the loan law, the predictor — keeps reading exactly those slots.
The stowed pair lives in two NEW slots, `stowWeapon`/`stowOffhand`, appended to
`EquipSlot`/`EQUIP_SLOTS`. A swap is one atomic exchange of the pairs on the
server followed by the standing `onEquipmentChanged` rail.

**LAW 2 — THE SLEEPING STEEL.** Stowed steel is furniture. It contributes ZERO:
no stats in `aggregateGearStats`, no enchant procs, no set-bonus counts
(`setCounts`/SET_WORDS), no calling `perPiece` counts, no secret-art loans, no
lesson pairing, no oil coats ticking. One exclusion list (`STOWED_SLOTS`) consulted
at every fold site, pinned by test. This is the whole anti-abuse foundation: there
is nothing to gain from what rides your back until you pay the beat to draw it.

**LAW 3 — EACH SET OBEYS ITS OWN LAWS.** Equipping into the stowed pair passes the
same gates as the hands: level/theft gates, THE TWO-HANDS LAW (a stowed two-hander
sheds a stowed non-backMounted offhand), the DUAL WIELD unlock for a stowed second
one-hander. There is deliberately NO cross-set restriction: sword-and-board over a
bow, a greatblade over paired daggers, even three daggers — a spare knife at the
hip is not a crime. The fantasy the user named (two-hander on the back, two
one-handers at the sides) is exactly legal and exactly what the body will show.

**LAW 4 — THE HONEST TRADE.** The swap is a choreographed beat, not a menu edit.
`SWAP_BEAT_TICKS = 12` (~600ms): press → the live weapon rides to its stow spot as
the waiting one rides to hand, pairs exchange at the existing `STOW_HANDOFF` (0.5).
For the whole beat: attacks and casts refuse (the `drawLockUntilTick` pattern),
any live cast/channel cancels at press (sheathe precedent), `pendingStrike` drops,
`resetCombo` speaks explicitly (the weaponId law would catch it anyway — say it
aloud). Movement and dodge stay free — trading weapons on the run is the fantasy.
Re-presses during the beat are swallowed. **The beat IS the cooldown** — no timer
on top; a longer lockout would punish the player for using the feature, and LAW 2
already removed everything worth macroing. Swapping while sheathed draws the
incoming set (you swap to fight).

**LAW 5 — ONE VERB, EVERY DEVICE.** New action `swapSets` in the ONE KEYMAP:
keyboard default Backquote (rebindable like everything); pad = **hold sheathe
(d-◀) 220ms** — tap fires sheathe on release, hold fires the trade (the
hold-Start Screen Ring precedent; sheathe and swap are siblings in meaning, so
they share a button honestly). Wire: `InputButton.Swap = 1 << 11`. The glyph
surfaces (HUD well badge, controls table, tooltips) speak through
padGlyph/kbLabel — never a hardcoded letter.

**LAW 6 — THE BACK TELLS THE TRUTH.** The stowed pair is ALWAYS drawn on the body,
for you and for everyone else: back sling for bow/staff/great, far-hip scabbard
for blades, riding the existing sheath.ts spots. When the active weapon is also
sheathed and both want the back, the two cross at ranked angles (the stowed set
takes the deeper, lower rank) — the crossed-back silhouette is the feature's
badge. `AppearanceData.equip` carries the new slots so remote players and
portraits wear the whole kit. Cap by construction: at most two back-slung pieces
plus the quiver.

**LAW 7 — THE SHOWN PAIR.** The HUD seats one **swap well** on the hotbar beside
the belt: it shows the WAITING set (weapon icon, offhand mini-icon tucked at the
corner), dimmed to the dormant register, wearing the live swap glyph as its key
badge. Press = swap; the well and the hands trade with a quick animation beat.
Tooltip names both sets honestly ("At the ready: Ashwood Bow · Trades with:
Bronze Sword & Kite Shield"). Empty stowed set = empty well, ghost glyph, quiet.
All of it on kit tokens — no px, no hex, CORNER TRUTH, BED LAW.

**LAW 8 — THE RACK.** The character room's armor stand grows the stowed pair as
two sockets in their own labeled band ("AT THE READY"), drawn one register
quieter than the hands. Verbs: a stowed socket offers Draw (= swap), Unequip,
Inspect; a pack weapon's menu gains **Stow** beside Equip (equip into the stowed
pair through the same gates); the bench comparison line keeps comparing against
the ACTIVE hand. A Swap button sits between the two bands wearing the key chip.
Item cards on stowed gear say "· at the ready".

**LAW 9 — EMPTY HANDS REFUSE QUIETLY.** Swap with both stowed slots empty =
spoken refusal ("Nothing waits at your back."), nothing moves, no beat paid.
VOICE laws apply to every player-facing string (no dashes, quartermaster
register).

**LAW 10 — THE WIRE STAYS SMALL.** No new message types. The swap travels as an
input bit; the result travels as the standing `S2CEquipment` partial map; remote
appearance rides the existing meta rail. Protocol version bumps once with a
changelog line for the two new slot strings + input bit.

## Part 3 — The phases

**Phase 1 — THE SECOND ROW (server + wire foundation).**
`stowWeapon`/`stowOffhand` in shared; equip/stow/unequip/swap paths in
gameServer (stow verb = same `use` flow with an explicit destination, C2S
`use` gains an optional `stow?: true` field through parseC2S — WHITELIST LESSON);
LAW 2 exclusion at every fold site; LAW 3 gates on the stowed pair; the swap
handler (atomic exchange + beat lock + cancels + `onEquipmentChanged`); LAW 9
refusal. Protocol bump + changelog. Slate tests: swap atomicity, two-hands law in
the stowed row, dual-wield gate in the stowed row, stat/count/loan exclusion
census, combo+cast death on swap, empty refusal, persistence round-trip.

**Phase 2 — THE QUICK HAND (input + choreography).** `swapSets` action + kb
default; pad hold-sheathe split (tap-on-release ≤220ms = sheathe, hold = swap —
bindings.test padRequired updated deliberately); `InputButton.Swap`; client
predicted beat (press-edge choreography on the sheathT clock, items trade at
STOW_HANDOFF, mispredict reconciles like the predicted blow); stow/draw sfx pair;
THE SAFETY interplay (combat press during the beat buffers, fires when the lock
lifts). Riglab transition rows for the trade.

**Phase 3 — THE VISIBLE BACK (the body wears both).** Rig inputs grow the stowed
pair (`stowedWeaponItem`/`stowedOffItem`); drawBackGear + blade scabbards render
them at permanent rest; ranked crossed-back angles when active-sheathed and
stowed share the back; far-hip rank for a second blade; AppearanceData carries
the slots (remote + portraits + CMS bestiary unaffected). Riglab: THE CARRIED
PAIR rows — every wield-class pairing at all 8 facings, det-stable.

**Phase 4 — THE SHOWN PAIR (HUD + character room).** The swap well (hotbar,
after the belt; LAW 7); THE RACK band + Stow verb + Draw verb + Swap button
(LAW 8); pad verb wheel entries; controls table row; item card state suffix.
Device-swap glyphs throughout via seatChip/kbBadge.

**Phase 5 — THE PROVING.** `prove:weapon-sets` live lane (fresh-world law):
swap under fire receipts (beat lock honest — press→refusal→first legal swing
measured), cast-death receipt, combo-death receipt, empty-refusal line, relog
persistence, second-client remote-visibility receipt (the other session SEES the
crossed back), pad hold-vs-tap receipt on a fake pad with advancing timestamps.

## Part 4 — Do not change

- The `weapon`/`offhand` slot names and every existing reader of them.
- The sheathe verb's tap behavior on keyboard H (only the PAD button gains the
  hold split; H keeps firing on press).
- sheath.ts spot numbers and carriage/wield choreography (user verdicts) — the
  stowed ranks ADD spots, never move existing ones.
- ComboTrack semantics; the CADENCE CONTRACT; TTK brackets (this epic moves zero
  balance numbers — the beat is feel, not damage).
- THE TWO-HANDS LAW and the dual-wield unlock as written.
- Secret-arts loan law (hands teach; the stowed set deliberately does not — the
  FREE HAND amendment stands untouched).

## Part 5 — Open questions for green-light

1. **The beat length.** Recommended `SWAP_BEAT_TICKS = 12` (~600ms) — long enough
   to be a real commitment mid-fight, short enough to never feel like a menu.
   Alternatives: 8 (snappy, weaker commitment) or 16 (deliberate, risks feeling
   sluggish on the ten-thousandth swap).
2. **The pad verb.** Recommended hold-sheathe d-◀ (semantic sibling, zero new
   buttons). Alternative: a chord (e.g. RT + d-◀), heavier to teach.
3. **Should the stowed set lend its secret art?** Recommended NO (LAW 2 keeps one
   clean rule and the loan law's meaning: a hand that holds, teaches). Saying yes
   would be a real buff to the feature but opens "carry a teaching stick" builds.

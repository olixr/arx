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

**LAW 6 — THE QUIET BACK** *(USER-AMENDED 2026-08-14; the original law — THE
BACK TELLS THE TRUTH, always-drawn waiting set, crossed-back badge — shipped
for one commit and was retired on the user's verdict: physically honest, but
the body read as compacted and overstuffed, and sheathing the active set
piled scabbards onto scabbards. The genre's leaders show the active set only,
and so do we.)* Only the ACTIVE set is drawn on the body — in the hands, or
at its own sheathe spots when stowed. The swap simply changes what is shown:
the incoming set materializes at the trade's handoff, under the beat's
choreography. The SLEEPING STEEL exclusion is total: `AppearanceData` does
NOT carry the stowed slots (nothing renders them, so nothing carries them);
the stowed pair's one visible home is the UI (LAW 7's swap well, LAW 8's
rack).

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

**Phase 1 — THE SECOND ROW (server + wire foundation). SHIPPED 2026-08-14.**

*As-built:* slots sit after `offhand` in `EquipSlot`/`EQUIP_SLOTS` (no positional
reader exists — verified before inserting); `STOWED_SLOTS` + `isStowedSlot` in
entities.ts are the one exclusion vocabulary. `InputButton.Swap = 1<<11`;
protocol v30 (strictly additive JSON — bumped anyway on the v26 judgment,
paragraph in constants.ts). `C2SUseItem.stow` validates literal-true only;
`useItem(eid, slot, stow)` rows the whole equip block through
`rowWeapon`/`rowOffhand`/`destSlot` so both rows run the SAME gate code —
theft, level, two-hands shed, dual-wield pairing. Dual-wield discovery was
extracted to `discoverDualWield` (ONE door, both roads): the stowed row pairs
blades under the gate but never speaks the ceremony (packing is planning); the
swap speaks it the moment two blades truly reach the hands. THE SLEEPING STEEL
census, exclusions applied: `aggregateGearStats` (THE ONE FOLD — server combat
and client cards go honest together), `passiveIds`/`hasPassive`, `deepenTarget`
(the sigil answers worn steel), the client hotbar passive tray. KEPT on
purpose: the appearance rail (LAW 6, commented in place), the social inspect
list (truthful), sunder/enchant slot-addressed targets (modification is not
benefit). `swapWeaponSets`: atomic pair exchange; new `swapLockUntilTick`
field swallows re-presses while `drawLockUntilTick` (max-merged) makes every
attack/cast door refuse through the STANDING gate — zero new combat seams;
empty refusal pays no beat; sheathe's whole kill-list runs (string, pending
blow, cast, channel, bow draw). `SWAP_BEAT_TICKS = 12` lives beside
`DRAW_LOCK_TICKS`. Tests: weaponSets.test.ts = 12 slate pins (stow row laws,
trade atomicity + roll fidelity, beat swallow, ghost-key hygiene, ceremony,
passive silence, fresh input bit) + the fold pin in content equipment.test.ts;
1654 workspace tests green, typecheck clean. Deliberate Phase-1 states: no
client surface sends `stow` or `Swap` yet (Phases 2/4 hold those doors);
panels' LOCAL slot list keeps the armor stand blind to the stowed row until
THE RACK; no login sanitize for the stowed row (the lawful equip path is its
only writer — no legacy state can exist).

*Original scope:*
`stowWeapon`/`stowOffhand` in shared; equip/stow/unequip/swap paths in
gameServer (stow verb = same `use` flow with an explicit destination, C2S
`use` gains an optional `stow?: true` field through parseC2S — WHITELIST LESSON);
LAW 2 exclusion at every fold site; LAW 3 gates on the stowed pair; the swap
handler (atomic exchange + beat lock + cancels + `onEquipmentChanged`); LAW 9
refusal. Protocol bump + changelog. Slate tests: swap atomicity, two-hands law in
the stowed row, dual-wield gate in the stowed row, stat/count/loan exclusion
census, combo+cast death on swap, empty refusal, persistence round-trip.

**Phase 2 — THE QUICK HAND (input + choreography). SHIPPED 2026-08-14.**

*As-built:* `swapSets` joined the ONE KEYMAP (kb Backquote; pad DELIBERATELY
unbound — every button answers elsewhere, pinned in bindings.test.ts — with the
direct edge path wired so a rebind Just Works, the mount precedent). THE HOLD
SPLIT lives in inputManager's buttons(): the pad's sheathe button starts a
clock on press; release under `SWAP_HOLD_MS` (220, the Screen Ring's proven
hold) taps the sheathe — which now fires on RELEASE on the pad, the split's
deliberate cost, keyboard H keeps its press edge — and crossing the threshold
held fires the trade once and eats the release. A pad vanishing into a menu
capture mid-hold is NOT a tap (the snap-null guard). The beat's clock twinned:
`SWAP_BEAT_TICKS`/`SWAP_BEAT_MS` moved to shared/sim/combat.ts beside the dual
wield laws, TWIN LAW pinned in weaponSets.test.ts (ticks × TICK_MS === ms —
change both or neither); the server's local constant died. THE PREDICTED TRADE
(clientGame.trackOwnSwap): on a Swap-bit frame with something locally at the
back, `ownSwapAt` stamps the press edge, the string lets down, the cast bar
bails, and the three mirror clocks clamp FORWARD (meleeReadySeq/staffReadySeq
+SWAP_BEAT_TICKS, drawReadyAt +SWAP_BEAT_MS) so the predicted body never
swings into the server's refusal; dodge stays free, matching the server.
Choreography = the PREDICTED BLOW insight applied to the sheathe ease: the
renderer ORs `game.swapStowing(now)` into the own body's sheathed flag for the
beat's first half — the standing ease rides the weapon to the hip, the equip
echo lands while the hand is down there, and the same ease falling home draws
the incoming set; zero new animation plumbing. The voice is the sheathe's own
pair on the predicted edge: weaponStow at the press, weaponDraw at the
handoff (SWAP_BEAT_MS/2); a swap begun SHEATHED stays quiet locally and the
server's sheathed-bit falling plays the one honest draw. LIVE RECEIPTS (lane-7
rig 5183/8800, fresh DB arx_swap_proof): stow verb over the wire; Backquote
trade atomic both directions; choreography edge inside 120ms; in-beat re-press
swallowed (exactly one trade); `unequip stowWeapon` through the standing
whitelist; empty back row speaks "Nothing waits at your back." and trades
nothing. Full suite green except quests.test.ts's `the_count_below` /
sealkeeper_annik failure — verified PRE-EXISTING at clean HEAD in a fresh
worktree (the Kingsdelf ERRANDS lane, owners notified cross-session; my files
green in isolation, the secret-arts concurrent-session precedent). Riglab
trade rows DEFERRED to Phase 3 deliberately: the trade's rig motion is the
standing sheathe ease both ways — there is no NEW geometry to audit until the
visible back exists. THE SAFETY interplay recorded as verified behavior: attack
is a held button, so a press held through the beat fires the tick the lock
lifts; the 8-tick armBuffer stands untouched (combat-v2 law).

*Original scope:* `swapSets` action + kb
default; pad hold-sheathe split (tap-on-release ≤220ms = sheathe, hold = swap —
bindings.test padRequired updated deliberately); `InputButton.Swap`; client
predicted beat (press-edge choreography on the sheathT clock, items trade at
STOW_HANDOFF, mispredict reconciles like the predicted blow); stow/draw sfx pair;
THE SAFETY interplay (combat press during the beat buffers, fires when the lock
lifts). Riglab transition rows for the trade.

**Phase 3 — THE VISIBLE BACK (the body wears both). SHIPPED 2026-08-14 —
RETIRED SAME DAY BY USER VERDICT (see LAW 6, THE QUIET BACK).**

*Superseded:* the phase shipped complete (1c3bed7 + the rig hunks that rode
5cb1e60 in the index race) and was reverted surgically in THE QUIET BACK
commit after the user judged the always-worn waiting set overstuffed — the
double-sheathe pile-up was the deciding read. The rest vocabulary
(restBack/restBlade/restShield), the rest paint bands, the RigPose stow
fields, and pairlab were removed whole; the appearance rail now EXCLUDES the
stowed slots (the SLEEPING STEEL exclusion went total). The as-built below
stands as the historical record of what was built and why it read wrong —
do not rebuild it without a fresh user verdict.

*As-built (retired):* sheath.ts grew the REST VOCABULARY beside the active spots (ADD
only — no active number moved): `restBack` = THE CROSS, authored numbers not a
mere mirror (first cut composed `stowBack(-side)` and the waiting bow vanished
inside a sheathed greatblade's silhouette — the lab caught it; the shipped
spots anchor past the OPPOSITE shoulder, ride lower, lean HARDER, and the bow
keeps THE MIRROR LAW's reflection structure); `restBlade` = THE SECOND ROW
(lower, wider, relaxing toward vertical — a quiet row under the war belt,
hilts never kissing, tip-down law inherited); `restShield` = THE SLUNG WALL
(square on its guige, deepest rank — the ground the rest of the kit reads
against); `REST_BACK_DEPTH` deepens the back offset. Five new law pins in
sheath.test.ts (cross/second-row/tip-down/continuity/wall, 14 green). RigPose
grew `stowWeaponItem`/`stowOffhandItem` (+ ench twins — bonded steel burns at
rest, the flaming-blade law). The paint: rest spots solve beside the active
stow solve (ONE wieldClass detection); closures paintRestBeltMain/Off (with
the full scabbard + frog dressing — waiting blades keep their bespoke
identity) and paintRestBack (wall → waiting quiver → crossed sling) enter
every depth band FIRST — live steel always layers over waiting steel, both
the early band (over legs, under torso) and the late (over torso, under
arms), mirroring slingFront/beltBehind exactly. drawBackGear (the caped path)
gained the same rank with the same first-in-band law and a widened
early-return gate (rest gear earns the call on its own). Tomes/orbs rest
UNDRAWN by design — the same silence the active sheathe keeps for them.
Remote players need nothing new: AppearanceData has carried the slots since
Phase 1. pairlab.html/pairlab.ts = THE CARRIED PAIR sheet (10 rows × 8
facings on the riglab det harness, persistent solvers per THE LAB LESSON,
?det/?rows levers; it plays the renderer's cape-depth part for drawBackGear —
first cut called it flat and the S-facing caped cells overdrew, fixed to the
capeFront ordering). Audited by eye at det frame 239: the flagship
sword-and-board-over-waiting-bow, the reversed bow-over-wall, THE CROSS
(great × bow, both leans), four daggers two rows, caped staff/wall rows,
hurt-flash silhouette swallowing the waiting kit. 1673 workspace tests green
(the Kingsdelf quest failure was fixed in their lane), typecheck clean.
Staged BY HUNK: rig.ts carried two in-flight goblin-head hunks and
renderer.ts six pet-lane hunks from concurrent sessions — excluded exactly.

*Original scope:* Rig inputs grow the stowed
pair (`stowedWeaponItem`/`stowedOffItem`); drawBackGear + blade scabbards render
them at permanent rest; ranked crossed-back angles when active-sheathed and
stowed share the back; far-hip rank for a second blade; AppearanceData carries
the slots (remote + portraits + CMS bestiary unaffected). Riglab: THE CARRIED
PAIR rows — every wield-class pairing at all 8 facings, det-stable.

**Phase 4 — THE SHOWN PAIR (HUD + character room). SHIPPED 2026-08-14.**

*As-built:* with THE QUIET BACK in force this phase became the waiting set's
WHOLE visible life, and shipped to that bar. THE SWAP WELL (ui/swapSlot.ts on
the belt well's exact discipline): rides beside the belt, shows the WAITING
mainhand large with its offhand tucked at the corner (the belt count's perch
mirrored), dormant register that wakes on hover/focus, live `swapSets` key
chip, honest tooltip naming both sets in plain words ("At the ready: Shortbow.
Trades with your bronze sword.") — PROMISE NOTHING law: no figures, THE
SLEEPING STEEL shows no stat it does not grant; empty = ghost well + one
sentence. Through the beat the well wears `.trading` and the icon dips to the
belt line and rises (the body's handoff told in the well; translate channel,
dies with no-ui-motion). THE RACK: the anatomy grid grew a fifth row
(`stowWeapon rackSwap stowOffhand`), rack cells one register quieter
(desaturated steel that wakes on attention), plain names ("ready weapon" /
"ready off hand" — never wire ids; SLOT_NAMES map), filled-cell primary act =
DRAW (the trade is the row's point; Remove lives on the menu, never one
mispress away), Trade act-btn between the pair wearing seatChip('swapSets'),
dimmed `.cant` when nothing waits but still pressable (the server's spoken
refusal is the honest teacher — the codex Answer precedent). Verbs: pack menu
"Stow at the ready" (+ the gate's words when short, the Equip pattern), bench
"Stow" (short word, band above tells the story), rack menu "Draw · trade
sets" + "Remove", grips stay off the rack (a grip belongs to a HAND). Worn
manifest: rack rows italic "at the ready", no damage figure (the manifest
must not lie about the fold). Plumbing: SlotAction 'stow' → main sends
{t:'use',slot,stow:true} with the stow sfx; InputManager.queueSwap() = the
ONE door for UI presses (well, rack cell, Trade button all queue the same
one-frame bit the backquote does); Panels ctor grew onSwapSets (last param);
slotGlyphUrl maps the rack's empty sockets to the hands' purpose glyphs.
LIVE RECEIPTS (lane-7 rig, fresh DB): menu shows Equip/Stow-at-the-ready/
Drop and the verb lands the bow at the ready over the wire; the room shows
the rack row + Trade chip + manifest at-the-ready rows (screenshot-audited);
the well press trades, wears `.trading` through the beat, and its tooltip
flips to the new arrangement; the rack cell reads acta=Draw with tipname
"Bronze sword · at the ready" and its click trades back. 1668 workspace
tests green, typecheck clean.

*Original scope:* The swap well (hotbar,
after the belt; LAW 7); THE RACK band + Stow verb + Draw verb + Swap button
(LAW 8); pad verb wheel entries; controls table row; item card state suffix.
Device-swap glyphs throughout via seatChip/kbBadge.

**Phase 5 — THE PROVING.** `prove:weapon-sets` live lane (fresh-world law):
swap under fire receipts (beat lock honest — press→refusal→first legal swing
measured), cast-death receipt, combo-death receipt, empty-refusal line, relog
persistence, second-client receipt (the other session sees the ACTIVE set
change on the swap, and never sees the stowed slots in appearance — THE QUIET
BACK's wire half), pad hold-vs-tap receipt on a fake pad with advancing
timestamps.

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

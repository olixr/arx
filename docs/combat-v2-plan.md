# COMBAT V2 — THE WEAPON LEARNS TO DANCE

*Plan of record. Drafted 2026-08-12 from a three-lane audit (server pipeline, client
presentation, weapon content). Status: **AWAITING GREEN-LIGHT.***

The mandate: basic attacks are the verb players perform ten thousand times, and today
they are a held button and a hidden metronome. Abilities carry all the interest; the
base attack is monotone. This plan rebuilds the basic attack into a visible, flowing,
weapon-taught combo system — beat-em-up flow, hack-and-slash weapon identity — without
breaking the balance contracts (TTK brackets, cadence/HP coupling, XP economy) or the
one-door laws that every other epic leans on.

---

## Part 0 — The audit (what the fight actually is today)

All findings verified against HEAD with file:line receipts, 2026-08-12.

### 0.1 The player has no swing — only a cooldown

`tryPlayerAttack` (gameServer.ts:14749) is fully instantaneous: cooldown set, cone
resolved, damage applied, all in the press tick. The entire "state machine" is
`attackCooldown` plus three stage counters. **Windup, active window, and recovery do
not exist for players — but they DO for NPCs** (`npc.windupTicks` 6 melee / 8 ranged,
gameServer.ts:21085-21098, re-checking reach at the end so stepping out is a true
dodge). The player's fight has no commitment, no weight, no read.

### 0.2 The combo exists — four times, invisibly

One three-beat law, four private copies, four grace constants, zero UI:

| lane | stages | grace | finisher | site |
|---|---|---|---|---|
| onehand | cleave / return / FINISHER ×2.5 sweep | 14t | recovery ×2.0 | gameServer.ts:14780-14821 |
| twohand | fell / reap ×1.15 / FINISHER ×3.0 | 20t | recovery ×1.6, always sweeps | :14822-14867 |
| staff | bolt / bolt / HEAVY ×3.0 splash | 14t | recovery ×2.25 | :14868-14907 |
| bow | snap / snap / TWIN ARROW | 10t | — | :23606-23624 |

`comboStage` and the grace window are **server-only fields, never sent to the client**
(gameServer.ts:1383). The player's only tell is the alternating animation and a rising
SFX pitch (sfx.ts:502-510). The player literally cannot see the system they're using —
which is why it reads as "hold and hope."

### 0.3 Combo state never resets

Not on weapon swap, sheathe, dodge, cast, or death — only grace expiry. Onehand and
twohand share one `comboStage` field, so swapping sword→greatsword mid-string can land
an instant ×3.0 finisher. `drawTicks` is cleared at nine sites; the combo counters at
zero.

### 0.4 Your own swing is a round-trip late

Melee swings are **not predicted**. The client sends the held bit; the animation starts
when the pose byte comes back in a snapshot (renderer.ts:3267-3272). Staff bolts have a
seq-keyed client mirror (clientGame.ts:828-861) and the bow draw is fully predicted
(clientGame.ts:783-820) — melee, the flagship feel, is the one lane that waits for the
server. At 60-100ms RTT that is 2-3 missing frames of contact between press and motion:
the single largest invisible contributor to "mushy."

### 0.5 249 weapons, four dials, no behavior

`WeaponStats` is nine fields; the mechanical surface is `damage / cooldownTicks / range
/ backstabMult` (items.ts:49-67). No windup, no arc, no string, no behavior hook.
55 staves collapse to 10 tuples — 13 share `{cd:9, r:14, ps:13}` exactly. Daggers and
swords are the same style with different numbers. All identity beyond the dials rides
the secret art and native `effects`. Meanwhile the CLIENT already has four full strike
vocabularies (carriage.ts STRIKE_SPECS, wield.ts GREAT/STAFF specs) — but they're keyed
by wieldClass only, so every sword in the game swings identically.

### 0.6 Wire and FX poverty

- No swing message: one pose u8 per entity (snapshot.ts:13). Attack/Attack2/Attack3 —
  a repeated same-stage pose doesn't even restart the client clock (renderer.ts:3267).
- Impact FX are identical for every class (main.ts:1318-1371) — same sparks, same
  palette for dagger, maul, bolt, and arrow.
- Basic projectiles are deliberately silent (no blast, gameServer.ts:17429).

### 0.7 Standing defects (fix regardless of design)

1. `smashPropsInArc` hardcodes `Math.PI/3`, ignoring `arcHalf` — twohand's ±75° cleave
   doesn't widen prop destruction (gameServer.ts:15104).
2. The staff branch is an `else` fallthrough, not `style === 'arx'` — a future fifth
   style would silently fire projectiles (gameServer.ts:14868).
3. `rollBasic` floors landed basics at 1 (gameServer.ts:1878-1885) — deliberate cadence
   law (09b762b), but damage.ts:16 still preaches whiff-0 as universal and downstream
   `dmg > 0` proc gates guard a case that can't occur for basics. Document the split
   honestly in damage.ts; the floor itself stays.
4. Server pose-hold ticks and client choreography phases are twinned by comment, not by
   constant ("the pose must outlive its choreography", gameServer.ts:14839).

### 0.8 What is genuinely good (protect it)

The hidden skeleton is RIGHT: alternating cuts into a bigger finisher, a heavy staff
orb, a snap-chain twin arrow — the beats exist. Hold-to-flow is comfortable for an MMO
grind session and must survive. Haste-on-hit, coatings, enchant procs, lifesteal, the
participation ledgers, XP — all ride the ONE `damageNpc` door with `basic: true`; any
redesign must keep feeding that same door. Dual wield's offhand echo (delay 4t, no
pose, pure client choreography) solved a real bug — don't regress it. The balance
contract (damage.test.ts TTK brackets) and the cadence/HP coupling (09b762b: attack
density changes retune NPC HP) are the rails this plan runs on.

---

## Part 1 — The laws

**LAW 1 — ONE RHYTHM ENGINE.** One combo brain, `ComboTrack`, in shared/sim/combat.ts:
`{stage, graceUntilTick, lane}` with one `advance()` law. The four private copies die.
Combo state RESETS on weapon swap, sheathe, death, and mount — a string belongs to the
weapon that started it. (Dodge does NOT reset — see LAW 4.)

**LAW 2 — THE HONEST SWING.** Player basics gain the same envelope NPCs already have:
`windup → impact → recovery`, authored per strike in ticks, resolved server-side at the
impact tick (not the press tick). Windups are SHORT (melee openers 2-3t — feel, not
lag) and scale with the weapon's cooldown so fast daggers stay fast. The client
choreography phases and the server envelope come from ONE shared phase table —
the twinned-by-comment constants (0.7.4) become one authored truth.

**LAW 3 — THE PREDICTED BLOW.** The client starts swing choreography on the press edge,
seq-keyed exactly like the staff bolt mirror (clientGame.ts:828 is the proven pattern),
and reconciles on the server pose. Zero-latency contact for your own hands. The staff
mirror generalizes; it does not fork.

**LAW 4 — THE SPOKEN BEAT.** The combo becomes visible and playable:
- Stage + string length ride the wire (additive snapshot field or S2C, no bump needed
  beyond the additive precedent).
- A quiet beat UI at the reticle: stage pips + the grace window as a fading ember.
- Press edges BUFFER during recovery (one queued attack, the beat-em-up standard).
- Dodge CANCELS recovery and keeps the string alive (dodge-weave is the flow verb —
  this is why dodge never resets the track).
- Holding still flows the whole string at natural rhythm (mash-tolerant); pressing ON
  the beat (a small window at recovery end) grants TEMPO — the next windup quickens.
  Rhythm is rewarded with speed, never damage (TTK brackets stay sovereign).

**LAW 5 — THE MOVESET BOOK.** Strikes become content, not code:
`StrikeDef {key, phases, dmgMult, arcHalf, rangeMult, kbMult, sweepAll, step, trail,
sfx}` and `MovesetDef {id, string: StrikeDef[], holds?, finisher}` in
packages/content. `WeaponStats.moveset?: MovesetId` with class-default fallback. The
client keeps ONE choreography vocabulary keyed by `StrikeDef.key` (the existing
carriage/wield specs become the first entries). Curated variance: a moveset per design
FAMILY (the falchion line fights one way, the rapier line another), never a
combinatorial per-weapon explosion. Masterworks may carry one signature strike.

**LAW 6 — EIGHT HANDS, EIGHT GRAMMARS.** Each fighting identity gets its own grammar on
the one engine: onehand 4-beat branching strings; daggers = longer flurry strings with
landed-hit momentum; dual wield = the off blade joins the string as true beats (weave),
not just an echo; twohand = deliberate arcs, hyper-armor through the active window,
charged overhead; staff = bolt-weaving plus a close-range guard sweep (the pole finally
bops at melee range), element-voiced FX; bow = draw core untouched, plus point-blank
kick (space-maker) and overcharge volley (hold past full).

**LAW 7 — THE ONE DOOR STANDS.** Every landed basic still resolves through `damageNpc`
with `basic: true`. Haste-on-hit, coatings, procs, lifesteal, ledgers, XP: untouched
call sites. `rollBasic`'s ≥1 floor stays (cadence law); damage.ts documents the
basic/ability whiff split honestly.

**LAW 8 — THE CADENCE CONTRACT.** Sustained DPS per class stays within ±10% of today's
measured baseline (~2.8 landed melee hits/s) unless deliberately retuned WITH NPC HP in
the same commit (the 09b762b coupling). damage.test.ts TTK brackets are the merge gate.

**LAW 9 — IMPACT WEARS THE WEAPON.** Per-class impact voices: spark palette, ring
shape, hitstop weight, and trail character keyed by wieldClass + StrikeDef, not one
global effect. The finisher of every string must be unmistakable at a glance from
across the screen.

---

## Part 2 — The phases

### Phase 1 — THE ONE RHYTHM (foundations, zero feel change)
One ComboTrack engine replaces the four copies; explicit style dispatch (the `else`
fallthrough dies); reset laws (swap/sheathe/death/mount); `smashPropsInArc` honors
`arcHalf`; shared phase table twinning server holds to client choreography; combo
stage + grace on the wire (additive); whiff-doc honesty in damage.ts.
**Proof:** behavior-identical replay — TTK brackets green, DPS parity harness within
noise, riglab det unchanged. The only visible change is the bug-fix set.

**SHIPPED — as built (2026-08-13).**
- `ComboTrack` + `advanceCombo`/`freshCombo`/`resetCombo` in shared/sim/combat.ts:
  ONE track per body, units are the caller's clock (server ticks / client seq /
  slate anything). `nextSnapStage` retired; `nextComboStage` survives as the inner
  stage law (and the identity proof pins advanceCombo against it for every
  (prevStage, withinGrace) pair).
- THE STRING BELONGS TO THE WEAPON lives INSIDE advanceCombo (weaponId compare) —
  no equipment-change hook to forget. Deliberate consequence: a bow snap interlude
  now also drops a live sword string (one track, one law).
- Reset sites: sheathe toggle, death respawn, mountToggle (mounting; dismount
  deliberately not — attack-dismounts swing the same tick). Dodge does not reset.
- `tryPlayerAttack` guards the three named lanes BEFORE paying cooldown/reveal —
  an unknown style costs nothing and fires nothing (slate-pinned with a bow).
- `tickBowDraw` now takes the equipped {id, weapon} pair (the snap chain needs the
  string's owner).
- STRIKE_CLOCKS (onehand/twohand/arx × swing/finisher) twins server holdTicks to
  client ms; renderer poseMs and all four setPose sites read it; shared test pins
  holdTicks × TICK_MS ≥ ms. Values byte-identical to the old literals.
- S2CCombo `{t:'combo', stage, len, grace}` additive, own-session, one per basic
  (melee stages, bolt rhythm, snap chain); `speakCombo` stamps AFTER recovery+grace
  so `grace` is the honest remaining window. Client stores `ownCombo` w/
  `graceUntilMs` on the local clock — Phase 2's beat UI reads it.
- Client staff mirror converted to the SAME ComboTrack keyed by the WORN item id —
  fixes the latent divergence where a staff swap kept the mirrored stage while the
  server (now) resets. Mirror + ownCombo reset on welcome/reconnect.
- smashPropsInArc takes arcHalf from the swing (the great reap finally clears
  scenery as wide as it cuts, slate-pinned); damage.ts pipeline doc names the
  rollBasic ≥1 basics exception honestly beside the whiff-0 law.
- Proof: combatRhythm.test.ts (6 door-law pins: string clocks/sweep/spoken beat,
  grace restart, swap-never-inherits, explicit-lane guard, wand heavy, one-cone) +
  reworked combat.test.ts (ONE RHYTHM slate incl. legacy-identity proof); full
  workspace suite 1503/1503 green. Pose holds, recovery mults, damage mults,
  stage order all unchanged — the only behavior deltas are the four intended
  fixes (swap/sheathe/death/mount resets, prop cone, lane guard, spoken beat).

### Phase 2 — THE PREDICTED BLOW + THE SPOKEN BEAT
Seq-keyed swing prediction on the staff-mirror pattern; press-edge input with a one-deep
buffer; dodge-cancel of recovery; hold-to-flow walking the full string; TEMPO beat
window (speed, never damage); beat UI (stage pips + grace ember); per-stage SFX already
present grows per-stage hitstop/shake. **Proof:** input-latency capture before/after
(press→first-motion frames), buffer/cancel unit slate, TTK unchanged.

**SHIPPED — as built (2026-08-13).**
- THE PREDICTED BLOW rides one insight: the client's anim clock keys on pose VALUE
  CHANGE (renderer animFor), so the mirror just feeds the predicted pose value early
  and the server's confirming byte — same value — never restarts the clock. No new
  animation plumbing at all. `trackOwnMelee` advances the SAME ComboTrack the staff
  mirror rides (worn item id keys the string), mirrors recovery via
  `finisherRecoveryMult`/`comboGraceTicksFor` helpers (pinned equal to the lane
  constants forever), and stores `ownSwing {pose, expiresAt = choreography + 200ms}`.
  Reconcile: server byte matches → prediction retires; expiry → misprediction, let
  it go (cosmetic only, the staff-tracer philosophy). `effectiveOwnPose(now)` is the
  one read: renderer own body + main.ts SFX block both consume it, so the swing
  SOUND moved to the press edge for free and can never double-fire. Latency: press →
  first motion is now same-frame (was tick + RTT + interp, ~100-200ms typical);
  live capture under injected latency lands with Phase 6's prove lane.
- THE HELD INTENT: `armBuffer(remainingCooldown, now)` in shared — press within
  ATTACK_BUFFER_TICKS (8) of ready buffers ONE swing, fires at ready with the
  LATEST aim, self-expires BUFFER_FIRE_SLACK_TICKS (2) past ready so no break site
  cleans it up. Server arms in ticks (melee + wand lanes; the bow's draw machine
  keeps its own clock), client mirrors in seq — one law, both sides, unit-pinned.
- THE DODGE-WEAVE: a fired dodge clamps attackCooldown to
  DODGE_CANCEL_FLOOR_TICKS (3) — string alive (dodge never resets the track),
  slide-out-cut-back-in IS the flow verb. Client mirrors the clamp on all three
  ready clocks inside the existing seq-gated predictor.onDodge. Cadence honesty:
  baseline hold-flow unchanged; the gain is bounded by the dodge's own 1.2s seq
  cooldown + movement requirement.
- THE RUN: ComboTrack grew `run` — consecutive swings in unbroken rhythm, ACROSS
  string wraps; dies with the string. Spoken in S2CCombo. Pure feedback in Phase 2;
  Phase 3's windup axis gives tempo its mechanical teeth (deliberately deferred —
  quickening a windup is the one speed reward that cannot break the CADENCE
  CONTRACT, and no windup axis exists until Phase 3).
- The beat UI: `drawComboBeat` — stage pips under the own body (cast-bar canvas
  dialect), whole row is the GRACE EMBER (fades across the last 35% of the window),
  run warms lit pips toward white heat; single-beat lanes stay silent. Finisher
  hitstop: a blow landing on the string's payoff stage freezes 0.07 (crit keeps
  0.09 crown).
- Client channel gate mirrors by `action.ability` presence (craft/gather actions
  carry `recipe` and don't gate — the server lets a swing cancel those).
- Proof: 17 shared pins (run law, armBuffer law, helper-agreement law, + Phase 1
  slate) + combatRhythm run-spoken pin; full workspace suite 1506/1506 green; zero
  damage-number changes (TTK brackets untouched by construction).

### Phase 3 — THE MOVESET BOOK
StrikeDef/MovesetDef content schema; the four current strings become the four class-
default movesets, byte-equal in behavior (det-proof on the rig sheet); THEN the strings
grow: onehand 3→4 beats with a branch (hold at beat 3: thrust vs sweep), twohand
charged opener, staff weave, dagger flurry string. Windups arrive here (LAW 2), tuned
so per-class DPS parity holds; any cadence change retunes NPC HP in the same commit.
**Proof:** moveset-equivalence tests, DPS parity table per class, TTK brackets.

**SHIPPED — as built (2026-08-13).**
- content/src/movesets.ts: StrikeDef {key, dmgMult, kbMult, sweepAll, recoveryMult,
  windupTicks, alt?, speedMult?, splash?} + MovesetDef {id, style, poseDialect,
  graceTicks, string}. Four pages: sword_string (GREW 3→4 beats), dagger_flurry
  (NEW, 5 beats), great_string + wand_rhythm (legacy lanes as data, byte-law-pinned
  against the shared constants they derive from). WeaponStats grew `moveset?:
  MovesetId`; resolution = authored field → class default, with daggers split off
  by `isDaggerStats` — the census test's exact three-dial identity (cd ≤ 6, range
  ≤ 1.5, backstab ≥ 2.2), which lands on precisely the 58 census daggers with zero
  leaks. The bow deliberately has NO page: its basic is the draw (charge grammar).
- THE POSE ALTERNATION LAW (strikePose): any string length rides the existing
  three pose bytes — even beats Attack, odd Attack2, payoff Attack3 — and STEEL
  adjacent beats (wrap included) never share a value, because the anim clock keys
  on pose change. A five-beat flurry costs ZERO wire changes. The WAND dialect
  repeats Cast by design (the bolt tracer is the beat's feedback) — the law's
  test caught this pre-existing quirk and pins it deliberately.
- THE HONEST SWING: melee blows are committed at the press (cooldown, pose, the
  spoken beat, every damage number captured — a mid-windup swap changes nothing)
  and LAND at the impact frame via pendingStrike → landStrike (sword 2t/finisher
  3t, dagger 1t/2t, great 4t/5t ≈ each choreography's visual impact). Lag comp
  rewinds by base + flight ticks. Wand bolts stay windup-0 (flight IS the honest
  travel; also keeps the press-edge tracer/entity handoff exact). Cleared at
  sheathe/death/mount; a dodge never recalls a committed blow. One blow in flight
  at a time, pinned: max windup < fastest class cadence.
- THE BRANCH: the sword payoff answers the trigger — hold-flow keeps the
  crowd-clear sweep (×2.5, unchanged for holders); a rhythm TAP (press edge or
  spent buffer) drives THE PIERCING thrust: ONE body, ×3.0. Alts live only on
  payoff beats and share their beat's recovery + windup (content-pinned), so the
  mirror never needs to know the branch.
- TEMPO lands its teeth: run held past one full string shaves 1 windup tick —
  speed, never damage, and the beat UI's pip-warming threshold is the same
  run > len instant the hands quicken.
- CADENCE CONTRACT table (movesets.test.ts, vs the legacy 1.125/tick line):
  sword 4-beat 0.978 (the finisher is EARNED), thrust branch 1.067 single-target
  (≤ 1.10), dagger flurry 1.125 EXACT (plunge authored 2.75 = the parity
  solution), great/wand unchanged. No cycle left the ±10% band → NO NPC HP
  retune, per the contract's own terms.
- Server door fully data-driven (the three hardcoded lanes are DEAD); client
  melee + staff mirrors read the same page (length/recovery/grace/pose); the
  Phase-2 helpers finisherRecoveryMult/comboGraceTicksFor deleted — the book is
  the one source now. Dagger five-beat choreography reads natively (rogue
  rake/backslash alternation + icepick plunge — zero rig changes).
- Proof: movesets.test.ts 6 contracts (byte-law, cadence table, roster/style
  agreement + 58-dagger census match, branch laws, pose alternation, windup
  sanity) + combatRhythm.test.ts reworked to 9 door pins (four-beat clocks +
  windup schedule + extraRewind, branch, TEMPO shave, flurry, restart, swap,
  no-page, wand, one-cone). Full workspace suite 1514/1514 green.

### Phase 4 — EIGHT HANDS (class identity pass)
Dagger momentum; dual-wield weave beats; twohand hyper-armor + overhead; staff guard
sweep + element voices; bow point-blank kick + overcharge volley. Impact identity
(LAW 9) lands here. NPC windup/telegraph feel audit rides along (their machine already
exists; players joining it makes both sides read).
**Proof:** per-class live receipts, riglab strike rows extended per class.

**SHIPPED — as built (2026-08-13).**
- THE WEAVE (dual wield): the offhand echo now BREATHES with the string it mirrors —
  each echo carries its beat's dmgMult normalized by the page's average (soft on the
  chips, ×1.82 on the sword payoff), so Σ over any full string = len and the echo's
  cycle output is EXACTLY the old flat echo (parity by construction, slate-pinned).
  `offhandEchoMult` scheduled at press beside the echo's aim.
- THE OVERHEAD (twohand): the mountain gained the rhythm-tap branch — dmg 3.5,
  kb 2.6, cone narrowed to ±0.6 rad (StrikeDef grew `arcHalf` override), +9.7% cycle
  in a single falling lane, inside the +10% band. **Hyper-armor was DISPROVEN, not
  built**: the audit-check found players are never knocked back or flinched by NPC
  hits — there is no substrate to be immune to. Recorded; the overhead carries the
  class identity instead.
- THE GUARD SWEEP (staff): a wand basic pressed with a living foe inside 1.7 tiles
  becomes a POLE STRIKE — same beat, same damage, same rhythm stage, kb 1.4 shove,
  wide arc, 2t windup — instead of spawning a bolt inside the enemy's chest. The
  pose speaks steel (strikePose 'steel'), so the moulinet/butt-cut choreography the
  staff vocabulary always had finally plays for wands — zero new art. Byte
  alternation holds (Cast↔Attack always flips). Client mirror holds its bolt tracer
  via an injected `foeWithin` (the assistMark scan main.ts already owns).
- THE OVERCHARGE VOLLEY (bow): holding past full draw (+10t — the old drawTicks cap
  IS the threshold, now one constant) splits the release into a three-shaft fan at
  0.5× each (~+2% cycle for the extra half-second of standing brace). Center shaft
  keeps the full-draw riders (Biting Draw); ONE arrow consumed (the overcharge
  splits the release, it doesn't triple the quiver bill). Second draw-click +
  rumble at the crossing; three predicted tracers on release. **The point-blank
  KICK is deferred to Phase 5 by honest scoping**: no kick choreography exists and
  shipping it on sword-swing art fails the bar — it lands with Phase 5's signature
  strike infrastructure.
- THE KNIFE'S HUNGER (dagger): a landed dagger basic quickens the feet — speedMult
  1.1 for 20t, refresh-never-stack via a new 'momentum' buff channel (the
  tonic/food replace-by-channel pattern; no HUD chip by the sendBuffs name filter).
  Momentum reaches the predictor for free through the existing steady-speed ride
  mirror (sendRide signature check) — no new netcode, no rubber-banding. Movement
  identity only; the cadence contract does not blink.
- IMPACT WEARS THE WEAPON (LAW 9): the hit spark voice follows the striking hand —
  thin quick silver for knives, heavy dark-edged iron for great steel,
  ELEMENT_COLORS-tinted fire for the wand (all nine schools), pale fletching for
  the bow; crits keep the gold crown. Keyed to the local player's equipped class
  (the same own-fight assumption the spark cone's aim already makes).
- Proof: 5 new slate pins (overhead narrow/heavy, guard sweep near/far incl. pose
  dialect + stage advance, weave parity Σ=len, echo beat-weight scaling, volley
  fan/riders/ammo) + content overhead cadence pin. Knife's-hunger's damageNpc hook
  rides Phase 6's live lane (the slate can't reach mid-damageNpc honestly). Full
  workspace suite 1519/1519 green.

### Phase 5 — THE WEAPON'S OWN HAND (per-weapon variance)
Curated moveset assignment across the 249 by design family (~12-16 movesets total);
masterwork signature strikes (the fifteen regalia + twenty masterworks each get one
distinguishing beat); bladelab/stafflab audit rows grow a moveset column; codex/item
cards speak the fight style ("Fights as: the Fencer's Line").
**Proof:** roster test (every weapon resolves a moveset), lab sheets, band audit.

**SHIPPED — as built (2026-08-13).**
- The book grew to NINE pages, all named for the card: The Soldier's Line, The
  Knife Weave, The Mountain Line, The Bolt Rhythm (the four defaults) + five new:
  - **The Fencer's Line** (gladius line + six dueling swords, 14): thrust-led,
    narrow lanes (arcHalf 0.8/0.55), NO crowd-clear anywhere — every beat takes
    one body; lunge 2.7 / flèche tap 3.0. +3.6%/+9.1% vs the soldier's line.
  - **The Reaver's Arc** (falchion + scimitar lines, 16): the OLD three-beat chop
    survives as an identity — wider cuts (±1.15/1.2), the legacy crowd finisher,
    EXACT legacy cycle (pinned equal to 1.125).
  - **The Crusher's Drop** (the five mauls): fewer, meatier — 1.1/1.25/QUAKE 3.3
    on 1.1/1.1/1.7 recoveries, kb 1.4→2.5, windups 5/5/6. +1.3% vs the great line.
  - **The Storm Weave** (the four battlestaffs): a longer bolt weave into a
    TEMPEST orb (3.6, splash 1.5, speed 0.75). +6.8% vs the bolt rhythm.
  - **The King's Verdict** (kingsbane, THE FIRST SIGNATURE): the flurry whose
    plunge takes ONE throat at 3.05 — a census dagger fighting its own fight.
- THE PAGE ROSTER: assignment is an authored table IN THE BOOK (movesets.ts), not
  scattered def edits — all fight-style authoring is one file. Precedence:
  weapon.moveset field > roster > class default (so the roster outranks the dagger
  classifier — pinned with kingsbane). movesetFor grew the id param; server passes
  equipped.id, both client mirrors pass worn.id.
- The item card speaks it: "Fights as" row under Reach, the page's name in ember
  gold. bladelab + stafflab rows carry the page name under each weapon id.
- The CADENCE BANDS test generalized: EVERY page (and every branch cycle) must sit
  within ±10% of its class default page — the fencer's flèche was authored 3.1 and
  the band test caught it at +10.9% before it ever shipped; trimmed to 3.0.
  Roster pins: ids real, styles agree, one page per id, counts exact (14/16/5/4/1).
  Name laws: real prose, dash ban, unique.
- Masterwork breadth beyond kingsbane deliberately restrained: signature = a
  bespoke PAGE, and pages are identity-expensive — the remaining masterworks ride
  their family pages until a distinguishing beat EARNS its page (the infra is one
  table row when it does). THE BOW KICK recorded as a FUTURE DOOR: it needs a jab/
  kick choreography that belongs to a dedicated choreography pass (arms/legs
  territory) — no combat-v2 phase creates new painters.
- Proof: 3 new content contracts (roster/style/count/precedence, per-class cadence
  bands incl. branches, name laws) — full workspace suite 1522/1522 green.

### Phase 6 — THE PROVING
Live-receipt lane (prove:combat-v2) on the isolated-rig pattern: string flow, buffer,
dodge-cancel, tempo, prediction reconciliation under injected latency, per-class DPS
parity, TTK brackets, reconnect/death mid-string. Feel checklist signed on the sheet.

**SHIPPED — as built (2026-08-13).**
- `npm run prove:combat-v2 -w @arx/tools` = **25 live receipts over the real wire**
  (packages/tools/src/proving/combatV2.ts), run twice against fresh isolated worlds
  (PORT 8796 + DB_DATABASE per run — THE FRESH WORLD LAW below). Highlights, with
  measured numbers: the four-beat sword string spoken in order with run and honest
  grace; the run flowing through the wrap (1..6); all five page lengths live incl.
  the battlestaff's roster page; swap/sheathe/death resets; THE HELD INTENT firing
  a tail tap at ready unheld (stage 1 = the string continued); THE DODGE-WEAVE
  measured at **300ms vs the uncut 700ms finisher rest**; THE HONEST SWING's
  press→impact at **100/100/100/99/99ms — the 2-tick windup, on the wall**; THE
  GUARD SWEEP's pose bytes reading steel (2/9) not Cast at the doorstep; THE
  KNIFE'S HUNGER's ride mult 1.1 arriving and cooling; THE WEAVE's four impacts
  from two swings; one shaft on a full draw, THREE on the overcharge; and the
  CADENCE CONTRACT live (sword 12 swings/5s vs ~11 expected, great 8 vs ~7).
- Lane craft learned (the rig notes): a player death has NO dedicated message —
  receipt via deathmark + the wake-up jump; the hearth keeps spawned bones polite
  until struck (provoke to die); **THE FRESH WORLD LAW** — proving worlds persist,
  so every run reuses a stale world's aggro packs at the shared hearth: fresh
  DB_DATABASE per run, and the death receipt runs FIRST (before armor) with all
  gear given after; the buffer/dodge fire on PROCESSED frames, so the lane idles
  LOUDLY (the shipped client streams frames continuously — its invariant); with
  onehand 10+, a second one-hander equips to the OFFHAND (route knife equips
  through a two-hander); projectiles fly as defId 'archery', never 'arrow'; a
  hidden mid-lane death spills gear silently — receipts must be self-sufficient
  (give before equip) and armor must be absurd (/xp vitality 2000000).
- Prediction under injected latency: the mirror is by-construction (pose value fed
  early; the confirming byte is the same value) and unit-pinned; a browser-side
  latency-injection capture would prove what the architecture already guarantees
  and is left to a future feel pass with the rest of the browser rig work.
- Unit ledger at close: **1522/1522 across four workspaces**; TTK brackets never
  moved in six phases; the cadence table sits inside the contract with zero NPC HP
  retunes owed.

---

## THE EPIC IS COMPLETE — the goals audit (no drift)

All six phases shipped 2026-08-13, 57f4951 → the proving. The original brief,
answered point by point:

- **"Basically a one, two, three combo... hold in the attack and hope"** → nine
  named fighting styles over 3-to-5-beat strings with branches; the combo is
  VISIBLE (beat pips, grace ember, the run), PLAYABLE (press buffering, the
  dodge-weave, rhythm branches, tempo), and the swing starts the frame you press.
- **"A different style of attack based on the weapon itself... variance within a
  class"** → THE MOVESET BOOK + THE PAGE ROSTER: strikes are content, families
  fight differently inside one class (fencer vs soldier vs reaver; scholar vs
  battlestaff; blade vs maul), the first signature weapon exists, and the item
  card says "Fights as" — collecting weapons IS collecting fight styles.
- **"Beat-em-up flow... organic... empowered"** → same-frame predicted swings,
  honest windups landing on the choreography's impact frame, buffered taps,
  recovery cut by the dodge, per-class impact voices and finisher hitstop, class
  identities (weave, hunger, guard sweep, overhead, volley).
- **"Attack speed... doesn't restrict us to linear attacks"** → every string and
  branch varies inside the CADENCE CONTRACT (±10%, pinned); rhythm is rewarded
  with SPEED (tempo's windup shave), never damage — the balance economy (TTK
  brackets, XP, loot) did not move one number in six phases.
- **"Bows... give some variance to that"** → the overcharge volley atop the
  snap-chain and charged-draw grammar; the point-blank kick stands as a NAMED
  FUTURE DOOR (needs real choreography; no phase of this epic ships placeholder
  art).
- **Deliberately NOT built without a green-light** (plan Part 5, still open): the
  ranged sidearm (swap-sets recommendation stands), directional strike variants,
  and per-weapon moveset breadth beyond the curated nine. These are decisions,
  not omissions.
- **Standing laws honored throughout**: ONE damage door, whiff law (with the
  honestly-documented basics floor), loot flood-law untouched, VOICE + dash ban in
  every player-facing string, no new wire bytes for any string length (THE POSE
  ALTERNATION LAW).

THE EPIC IS COMPLETE. Six phases, one committed day, 1522 unit pins and 25 live
receipts standing between this system and regression.

*(The ranged-sidearm question — bow always on the back with a swap verb — is scoped
OUT of these six phases and green-lights separately; see Part 5. The stow/backMounted
rendering already supports it visually, so it composes cleanly later.)*

---

## Part 3 — Verification standards

- damage.test.ts TTK brackets = the merge gate for every phase (LAW 8).
- DPS parity harness: scripted 10s hold-flow per class, landed damage within ±10% of
  the Phase-0 baseline unless the commit also retunes NPC HP.
- Combo engine slate: advance/reset/grace/buffer/cancel/tempo unit pins in shared.
- Prediction: injected-latency capture, press→motion ≤ 1 frame local, reconciliation
  never double-plays a strike.
- Riglab det: strike rows byte-stable through Phase 1-2; new movesets add rows, never
  mutate existing ones silently.
- Every phase ends with the full workspace suite green, zero waivers.

## Part 4 — Do not change

- carriage.ts blade grips + existing strike choreography numbers (user verdicts; new
  strikes ADD entries, existing specs stay).
- The ONE MOUTH fence + arms-v3 laws (new strike keys enter through the fence like
  every writer).
- `damageNpc`/`damagePlayer` signatures and the on-hit chain order.
- rollBasic's ≥1 floor; ability whiff-0.
- Dual-wield echo's no-pose law (the weave builds ON it, never re-poses mid-swing).
- Bow draw constants (DRAW_FULL_TICKS 14 / MIN 3 / MOVE_FACTOR 0.55) — the draw is the
  one basic that already feels right.
- Loot/flood, XP economy, secret-arts seats, cast/channel engines.

## Part 5 — Open questions for green-light

1. **The ranged sidearm.** Recommended shape: TWO WEAPON SETS with one swap verb (a
   bound key/pad chord swaps mainhand+offhand pairs; the stowed set rides the back —
   rendering already exists). Alternative: a dedicated sling slot (new equipment slot,
   heavier). Or: status quo. Swap-sets is the recommendation — smallest surface,
   biggest freedom, and it serves "bow on the back" without making the bow free.
2. **Directional strike variants** (forward+attack = lunge, etc.): recommended as a
   Phase 4 stretch only if pad/touch ergonomics prove out — the core grammar
   (tap/hold/dodge-cancel/tempo) must carry the game without them.
3. **Tempo as speed-only** (recommended) vs tempo granting damage: speed keeps TTK
   sovereign; damage would reopen every bracket.
4. **Moveset breadth:** ~12-16 curated movesets by design family (recommended) vs
   per-weapon uniqueness (unmaintainable at 249).

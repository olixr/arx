# Secret Arts — THE WEAPON TEACHES

*Design review 2026-07-31. Status: **ALL FIVE PHASES + RANKS FOR THE
SHELF SHIPPED — EPIC FULLY CLOSED** (Ph1 46633f1, Ph2 ca7e7b8, Ph3
06479fb, Ph4 ddf7cba, Ph5 eeef278, RANKS 33d72a4). SECRET_RANK_DEBT
reads zero forever: a new secret art ships WITH its three honed steps
in the commit that authors its seat.*

The weapon art leaves the weapon. Every Art a blade, bow, or staff carries
becomes a **secret art**: a technique the weapon *teaches* rather than a button
the weapon *owns*. Hold the weapon and its art is yours to slot and cast — the
same power the Q slot grants today, but now a choice, not an assignment. Keep
using the weapon with its art at your side and the art becomes **yours
permanently**: a learned technique, castable from any hand for the rest of that
character's life, exactly like every art on the ladder.

And with the Q slot no longer spoken for, it opens: **two free technique
slots**. The loadout stops being "whatever is welded to your weapon plus one
choice" and becomes two choices drawn from one earned pool — ladder arts,
unwritten pages, and now the mastered secrets of every weapon you ever loved
enough to learn.

This is not an additive feature. It is a foundation change to how the combat
loadout works, done once, done deep, and it holds going forward.

---

## Part 1 — Audit: what exists today (verified in code, 2026-07-31)

### The Q slot as-built

- `WeaponStats.art?: string` (`content/src/items.ts:58`) names the ability the
  Q slot resolves. `slotAbility` case `SLOT_ART` reads
  `equippedWeapon(player)?.weapon.art` → `abilityDef(artId)`
  (`gameServer.ts:10285-10288`). **No unlock check, no rank, no honing** — the
  art slot is the only loadout slot with zero validation and zero growth axis.
- **Main hand only.** `equippedWeapon()` reads `equipment.weapon` exclusively
  (`gameServer.ts:9821-9829`). A dual wielder's offhand art does not exist —
  the exact wound this epic heals.
- An art cast scales by and trains the **weapon's style**; a technique cast
  scales by and trains **its own school** (`gameServer.ts:10453-10459`, THE
  FREE HAND). Trinket `powerMult` never touches art or technique casts.

### The roster (measured against live content)

- **216 abilities** in the one flat `ABILITIES` registry — arts, techniques,
  relic/sigil actives, and NPC specials are all the same `AbilityDef` shape.
- **209 weapons carry an art; 114 distinct art ids.** 16 ids are shared metal/
  wood lines (`lunge` ×20, `shadowstep` ×17, `crescent_sweep` ×10, `volley` ×8,
  `colossus_arc` ×5 …); **98 are one-weapon signature arts** (the Ten Crowns /
  Voices / Flights own-arts, the Great School names, the Armory uniques).
- Arts per weapon style: **onehand 37, twohand 20, archery 24, arx 33.** Every
  shared line is style-consistent (audited: zero clashes).
- **Art ids and technique ids overlap nowhere** (verified ∅) — the merge has
  no collisions.
- **No weapon carries a `levelReq`** — weapon gating in Arx is economic
  (craft tier, loot band), not level-checked. Anchor levels must be authored.

### Rails already in place (reuse, don't reinvent)

- `TECHNIQUES` ledger (`TechniqueDef { ability, style, unlockLevel, ranks,
  hidden }`) + `honedAbility`/`techniqueRankFor` shared resolvers — the codex
  bench and the server cast can never disagree.
- The **unwritten-page rail**: `art:<id>` flags (`artFlag`, `abilities.ts:436`),
  `grantArt()` ceremony (`gameServer.ts:9591-9611`), `earnedArts` on the wire
  (`S2CTechniques.earned`). A mastered secret art is *structurally identical*
  to an earned hidden art. We ride this rail unchanged.
- `character_flags` has an **INTEGER `value` column** with per-flag upsert
  (`db.ts:269-275`, `accounts.ts:427`) — mastery progress needs **no new
  table and no migration**.
- `character_techniques` PK is `(character_id, style)` with the free-hand row
  under reserved key `'slot'` — a second slot is a second reserved key,
  **no schema change**.
- Icons (`PLATES`) and FX (`SIGNATURES`, `FX_STYLES`) are both keyed by plain
  ability id and **test-enforced complete over all 216 abilities** — every
  weapon art already has its bespoke plate and signature. The FLOURISH
  CONTRACT is already paid for the whole shelf. Zero registry work.

### What will fight us (deliberately)

- `content.test.ts:75` — "every equippable weapon carries an Art — no dead Q
  slots." Inverts, does not die: every weapon's art must resolve to a secret
  ledger seat.
- `ladder.test.ts:222` THE OPEN LADDER — non-hidden rungs per style must be
  exactly `[5..50]`. Secret arts must sit outside this filter, like hidden.
- `ladder.test.ts:190` THE RELEVANCE LAW — ±20% of style mean. 114 new
  entries would re-baseline every mean; secret arts need their own band.
- `gameServer.ts:12255-12262` / `:12447-12452` — on-hit and on-kill haste are
  welded to slot indices 0 and 1 (art + relic). A decision, not an accident.
- `hotbar.ts`, `bindings.ts:82` ('Weapon Art' label), `panels.ts:1837-1848`
  (loadout strip), `panels.ts:698` (item card "Art (Q)"), `main.ts:791/1153`,
  `index.html:80` — the copy that speaks the old law.

---

## Part 2 — The laws

### LAW 1 — THE SECRET LEDGER (one pool, one registry, one resolver)

**Every weapon art becomes a `TechniqueDef` with a `secret` marker. There is
one technique pool; secret arts are its third citizenship, beside rung arts
and unwritten pages.**

- Data: `TechniqueDef.secret?: { anchorLevel: number }` — sibling of `hidden`,
  mutually exclusive with it and with a ladder rung (`unlockLevel: 0`, same
  convention as hidden). `style` = the teaching weapon's `CombatStyle`
  (onehand / twohand / archery / arx — audited style-consistent).
- **The ledger seat is the art, not the tool.** `lunge` is one seat; twenty
  swords teach it. Mastering it from a bronze blade masters it from all — the
  hand learned the motion, not the metal. Shared-line arts are the early,
  cheap masteries; the 98 signature arts are the chase.
- `anchorLevel` is **authored per art**, seeded by the teaching line's tier
  band (bronze ~1, iron ~10, steel ~20, mithril ~30, adamant ~40, obsidian
  ~50, starsteel ~60; legendaries at their chase band). It does three jobs:
  rank derivation (HONED-ART surplus over anchor, the hidden-art precedent),
  mastery cost scaling (LAW 3), and the balance band's expectations. A sanity
  test asserts anchor rises with the strongest teaching weapon's damage.
- Content contract tests: every `weapon.art` resolves to a secret ledger seat
  (the inverted `content.test.ts:75`); every secret seat is taught by ≥1
  weapon; no id is both rung and secret and hidden; secret seats never enter
  the OPEN LADDER rung filter.
- **Ranks arrive in waves.** 114 arts × 3 authored rank steps is a real
  authoring epic of its own. Launch law: a secret art without `ranks` sits at
  Rank I forever and the ladder test permits the omission *for secret seats
  only*; RANKS FOR THE SHELF (follow-on slices, school by school) then pays
  the honing debt with the same ±cycle-value discipline as the ladder. The
  test carve-out carries a counted ledger so the debt is visible, never quiet.

### LAW 2 — THE LOAN LAW (the weapon lends what it will one day give)

**While a weapon is in either hand, every art it teaches may be slotted and
cast — mastered or not. The loan is the courtship; mastery is the wedding.**

- `equippedArtIds(player)` = the arts of **main hand and offhand both**. The
  dual wielder finally hears both blades — slot the main hand's art on Q and
  the offhand's on R, this epic's flagship payoff.
- Cast-time validation (new, in `tryCastAbility`): a slotted secret art casts
  if `mastered(art)` OR `art ∈ equippedArtIds`. Today's art slot has zero
  checks; this is the one door and it stays the one door.
- **Unequipping never unslots.** The slot goes *dormant* — plate dimmed, cast
  refused quietly, arrangement respected. Sheathe the blade, the art sleeps;
  draw it, the art wakes. (THE SAFETY is untouched: a sheathed press is still
  a draw.)
- Loaned arts cast at **Rank I**. Honing is mastery's second payoff (LAW 3) —
  the borrowed motion is correct but not yet *yours*.
- **THE FREE HAND AMENDMENT.** The free-hand law ("never re-gate the
  technique slot by equipment") stands absolute for every *learned* art —
  rung, page, and mastered secret alike. The loan is the single, deliberate,
  self-dissolving exception: it is not a gate on what you have learned, it is
  early access to what you have not. Once mastered, no blade may take an art
  back. Never regate a mastered art by equipment.

### LAW 3 — THE LESSON LAW (mastery rides the XP door)

**Mastery progress is earned by fighting with the teaching weapon while its
art is at your side. It credits at the one `grantXp` door — no new crediting
surface, whiff-0 inherited, anti-cheese inherited.**

- The meter: while an **unmastered secret art is slotted** and **a weapon that
  teaches it is in hand**, every point of combat-style XP the *art's* school
  earns also feeds that art's lesson meter, 1:1. Two loaned arts slotted
  (twin blades, two teachers) → two meters feed independently.
- **THE ONE MIRROR** *(as-built, phase 3 — supersedes the drafted 2:1
  own-cast clause)*: the mirror is a flat 1:1 at the one `grantXp` door,
  nothing else. The art's own casts already pay through their landed
  damage; a separate 2:1 cast channel would demand ability-id threading
  through every delayed damage carrier (projectiles, fields, DoT ticks) —
  a wide surface for one pacing dial. If THE PROVING wants faster
  own-cast learning, tune `masteryXp`, not the plumbing. The combat
  school's SHARED-LESSON echo never feeds a bank (no secret sits in
  'combat'), and the mirror runs before the echo on purpose.
- Whiff-0 stays sacred: no damage, no XP, no lesson. Utility secret arts
  (self-buffs, wards) learn through the weapon's strikes — the blade teaches
  while the ward holds.
- Cost: `MASTERY_XP(anchor) = 600 × (1 + anchorLevel / 6)`, an authored dial
  in shared constants. Intent: **a committed session or two at the weapon's
  own band** — bronze `lunge` masters in an afternoon of honest fighting; a
  starsteel signature is a real courtship. Phase 5 tunes against play.
- Persistence: `lesson:<artId>` flag with the meter in the existing INTEGER
  `value` column (batched writes on the flag-save cadence). At cost, the
  meter converts: **`grantArt(artId)`** — the same flag, the same ceremony,
  the same `earned` wire as an unwritten page. One rail, three citizenships.
- The ceremony (THE ASCENT pattern, VOICE pass, DASH BAN): the art's plate
  seals gold in the codex, system line in the spirit of *"The art is yours.
  No hand may take Riftfall from you now."* — final copy through
  docs/VOICE.md.
- **No pity, no player-state dials** (flood-law spirit): the meter is a flat
  XP mirror. It never reads luck, never reads drops, never accelerates for
  the impatient.

### LAW 4 — THE SECOND HAND (two slots, one pool, no twins)

**Q and R are both technique slots. Same pool, free respec, and one art may
hold one seat only.**

- `player.techniques: [q: string | null, r: string | null]`. E (relic) and T
  (sigil) unchanged — the four-axis loadout keeps its shape; only Q's axis
  changes owner.
- `setTechnique(slot, ability)` validates per citizenship: rung → school BASE
  level; page → `art:` flag; secret → mastered OR currently taught by an
  equipped weapon. **THE ONE SEAT LAW:** slotting an art already seated in
  the other slot is refused server-side (and disabled client-side) — two
  seats must be two arts. Slotting over swaps; slotting to empty just fills.
- Cooldowns stay **per-slot** (`abilityCd[0]`/`[2]` independent, existing
  law) — the one-seat law is what prevents double-timer abuse of a single
  art.
- **THE QUICKENED HAND:** on-hit and on-kill haste keep feeding slots 0 and 1
  (Q + relic), untouched. This is now a *slot personality*, not an art
  subsidy: Q is the quickened hand that landed blows accelerate, R is the
  measured hand that keeps its own time. Where you seat an art becomes a
  build decision — tempo on Q, patience on R. (The alternative — haste
  follows nothing, or everything — flattens a texture the combat already
  has. Decided: keep 0+1.)
- XP/scaling per THE FREE HAND, both slots: every technique cast scales by
  and trains its own school, wherever it sits.

### LAW 5 — THE HAND REMEMBERS (continuity, wire, and disk)

**No player logs in weaker than they logged out. The migration is felt as a
gift — the same Q you had yesterday, now with a choice attached.**

- **Wire: protocol 23 → 24.** `S2CTechniques.chosen` becomes the two-seat
  pair; `C2STechnique` gains `slot: 0 | 2`. `S2CCooldowns` tuples are
  index-compatible and untouched. Comment ledger in `constants.ts` grows its
  v24 line.
- **Disk: no migration.** The R seat keeps the reserved `'slot'` key; the Q
  seat takes `'slotq'`. `loadTechnique` returns the pair (legacy fallback
  order intact); `saveTechnique` writes per-seat. Schema untouched — the
  sixteenth migration taught us to shape tables so renames don't reseed.
- **First-load seeding:** on character load under v24, if Q is empty and the
  equipped weapon teaches an art, seat it. Yesterday's loadout, verbatim,
  with the new freedom underneath. R keeps the chosen technique. Seeding is
  once-per-load-if-empty, never a standing default — an emptied Q stays
  empty because the player emptied it.
- Copy that changes owner: bindings labels → **'First Art' (Q) / 'Second
  Art' (R)**; hotbar empty hints; loadout strip rows (both wear the gold
  `.the-r` treatment now); item card `'Art (Q)'` → `'Secret Art'` with a
  taught-by line; `main.ts` first-time hints; `index.html` dock title. Every
  string through VOICE, no dashes player-facing.

### LAW 6 — THE QUIET SHELF (the codex learns discretion)

**The codex shows the secrets you have touched, not the catalogue you
haven't. 114 arts must feel like a world of rumors, not a spreadsheet.**

- Each school rail grows a **Secret Arts shelf** below its ten rungs and its
  unwritten page. A secret art's plate appears only when it is: taught by a
  weapon currently in hand (lit, "in your hand"), partially learned (meter
  > 0 — dimmed plate, fill visible), or mastered (gold seal ❖-adjacent, its
  own seal glyph). Everything else simply is not there — QUIET CHART law,
  no veiled rows to min-max against.
- The bench for a secret art: taught-by line ("Taught by the falchion line" /
  "Taught by Riftfall's blade alone"), the **lesson meter as a quiet fill** —
  no numerals, the flood-law's no-grindometer spirit — with state copy in
  three registers: *loaned* ("Hold the blade and the art answers. Keep
  fighting with it and the art will stay."), *learning* ("The blade still has
  things to teach."), *mastered* ("Yours. Any hand, any blade.").
  - **AMENDED by user mandate (2026-07-31, post-epic):** the no-numerals
    clause is retired. The meter carries an explicit **Mastery: N%**
    label on the bench, in the plate seal's tooltip, and on the weapon
    card's learning state — the player must be able to read how close
    the art is to staying. The bar stays; the silence goes.
- Slot buttons: **'Seat on Q' / 'Seat on R'** on every slottable art (rung,
  page, secret alike), with the one-seat law reflected (the taken seat's
  button shows the swap). The single `.r-badge`/`On R` chip generalizes to
  per-seat chips (Q/R). Skill cards and the jump strip read both seats.
- The hotbar needs almost nothing: slots were always generic; Q dims when a
  dormant loaner sits in it (same visual language as cooldown, distinct
  cause), tooltip says why. Pad nav (`artequip:` navkeys) grows the seat
  choice; THE ONE KEYMAP stands — no new keys anywhere.
- Weapon item cards become the discovery surface: the Secret Art row is where
  a player first meets an art they don't have — that, and seeing an
  unfamiliar flourish in someone else's hands (the Unwritten Page's envy
  engine, now 114 arts wide).

---

## Part 3 — Balance: why this doesn't move the TTK needle

- **Power neutrality at the loadout.** Today: art + technique = two actives.
  After: two techniques = two actives. The loaner IS today's art at the same
  Rank-I numbers. Nothing gets a third button; nobody's rotation grows.
- **The pool widens; the band holds.** New test — **THE SECRET BAND**: every
  damage-dealing secret art's cycle value must land inside its school's
  ladder envelope (min 0.8× to max 1.2× of the school's rung range), at
  Rank I now and at Rank IV when its ranks arrive. Arts were authored under
  the same cadence bands as the ladder (~6–10 s); the audit test names the
  outliers and Phase 1 tunes them or waivers them with a counted, expiring
  waiver list. THE RELEVANCE LAW's ±20% mean stays scoped to rung arts.
- **Cross-school seating already happened** (THE FREE HAND shipped it);
  two seats compose what one seat already allowed, under per-school scaling
  that keeps the PAYOFF BRACKET bands honest.
- **Mastery is progression, not power.** A mastered art is numerically
  identical to its loaned self (until its ranks arrive) — mastery buys
  *portability*, the right to carry the art past the weapon. The chase is
  identity, which is why it can be generous.
- Whiff-0, THE THREAT LAW, TTK brackets, NPC scaling: untouched, re-asserted
  by the existing suites.

## Part 4 — Implementation phases

1. **THE SECRET LEDGER** — content + shared only, no wire: `secret` marker on
   `TechniqueDef`; author all 114 seats (style from weapon, anchor from tier
   band); invert `content.test.ts:75`; scope OPEN LADDER + RELEVANCE filters;
   add THE SECRET BAND audit + anchor sanity test; rank-omission carve-out
   with counted debt ledger.
2. **THE SECOND HAND** — protocol v24 + server + minimal client, one commit:
   `player.techniques` pair, `slotAbility`/`setTechnique(slot)`/one-seat law/
   loan validation at the cast door, `equippedArtIds` (both hands),
   `'slotq'` accessors, first-load seeding, haste indices confirmed 0+1,
   client wire compliance (`clientGame` pair state, hotbar Q resolves seat 0,
   loadout strip honest). Playwright: cast from both seats, dual-wield double
   loan, dormant refusal, seed-on-login.
3. **THE LESSON** — the meter at the `grantXp` door (weapon-style mirror 1:1,
   own-cast 2:1), `lesson:` flags batched, `MASTERY_XP` dial, conversion →
   `grantArt` ceremony + VOICE copy; server tests for credit gating (wrong
   weapon in hand = no lesson; art unslotted = no lesson; whiff = nothing).
4. **THE OPEN SHELF** — codex: secret shelf per school under the quiet law,
   bench states + lesson fill, Seat on Q/R + swap UX, per-seat chips, item
   card Secret Art row, dormant-slot visual + tooltip, pad nav, all copy
   through VOICE. NEW-pip/seen-ledger reuse as-is.
5. **THE PROVING** — balance pass over the secret band outliers + mastery
   pacing against live play; full Playwright receipts (loan → lessons →
   ceremony → cross-weapon cast); update memory laws (FREE HAND AMENDMENT).
   *Follow-on wave, separately scheduled:* **RANKS FOR THE SHELF** — author
   rank steps school-by-school until the debt ledger reads zero.

## Part 4b — As-built addenda (2026-07-31)

- **Phase 1 (46633f1)**: the ledger ships as its own `SECRET_ARTS` export
  beside `TECHNIQUES`, not merged in — the ladder queries stay
  rung-and-page shaped, the OPEN LADDER and RELEVANCE tests stand
  untouched, and `setTechnique` cannot resolve a secret until the
  phase-2 wire opens the pool on purpose. The balance model moved to
  `ladderModel.ts` (one law, both contracts). THE SECRET BAND carries
  22 authored outliers on an expiring waiver ledger for phase 5.
- **Phase 2 (ca7e7b8)**: one new law beyond the draft — **THE LOAN
  FOLLOWS THE BLADE**: when the Q seat holds an orphaned unmastered
  loan, the new main hand's art takes the seat on equip change, so an
  untouched player's weapon swap feels exactly like the old Q slot.
  Mastered arts, rungs, pages, and emptied seats are never touched;
  the R seat never follows. Slot constants renamed SLOT_TECH_Q /
  SLOT_TECH_R; `techniquePoolDef` is the pool's one lookup.
- **Phase 3**: THE ONE MIRROR (above); `lesson:<id>` banks flush on the
  savePlayer cadence, never per hit; the meter converts through the
  same `grantArt` door the pages use and deletes its bank; the codex
  bench wears the quiet fill from this phase (the courtship must be
  visible to be a courtship); `S2CTechniques.lessons` rides v24
  additively.
- **Phase 4 (ddf7cba)**: per-school secret shelf under its own plaque,
  one `techPlate()` builder for all three citizenships, lent/asleep
  sub-lines, plate-scale fill slivers, dormant mirrors in codex and
  loadout strip. Two defects found and fixed: the school head's rung
  count had included secrets, and `announceLadderClimbs` walked only
  the ladder (mastered secrets now join the climbable set).
- **Phase 5 (THE PROVING)**: the SECRET BAND waiver ledger paid to
  ZERO — all 22 outliers tuned into their bands, cooldown-led with
  identity kept (two deep offenders took a damage trim; the three cold
  arts were buffed into the floor). THE PAYOFF BRACKET FOR THE SHELF
  joined the contract suite and caught three 6-beat field arts
  (wakewood, overgrowth, wild_root) deleting at-anchor line fighters —
  trimmed to five beats. Seventeen live receipts ride the real wire in
  `packages/tools/src/proving/secretArts.ts`
  (`npm run prove:secret-arts -w @arx/tools` against a dev server):
  loan refusal spoken, seat + ONE SEAT refusal, both seats cast,
  lesson bank on the wire, dormancy spends nothing, the waking blade,
  the mastery ceremony verbatim, the earned wire, follow-the-blade
  sparing a mastered Q, the bow-in-hand cross-weapon cast, the offhand
  loan seating and casting, and THE HAND REMEMBERS across a relog.
  `masteryXp` pacing stands as authored (an afternoon at bronze, a
  courtship at starsteel) — live play tunes it from here.
- **LESSON-BY-COMBAT (post-close verification, 2026-07-31)**: user
  report "killed enemies, meter said not yet begun" — the crediting
  law was proven SOUND over the live wire with real spawned skeletons
  and basic attacks only (`npm run prove:lesson-combat -w @arx/tools`:
  strike XP through the one door, bank on the wire, bank survives the
  relog). The failure was legibility, fixed twice over: (1) the codex
  resend cadence tightened from cost/20 to **whole-percent steps
  (cost/100), plus an unconditional resend on the FIRST banked point**
  — 'not yet begun' now dies with the first landed hit (unit pin in
  techniques.test.ts, THE SPOKEN NUMBER breathes); (2) the bench meter
  now **names the shut door**: an unseated art says 'seat this art to
  begin', a seated art with its teacher stowed says 'waiting on its
  weapon', and a sub-percent bank says 'under 1%' instead of 'not yet
  begun'. The lesson's two doors (seat + teacher in hand) stand as
  designed — they are now spoken, not silent.

## Part 5 — Open questions (recommendation first)

- **Seed Q on first v24 login from the equipped weapon?** Recommend yes
  (LAW 5) — continuity is the whole migration story.
- **Loaned arts at Rank I only?** Recommend yes — honing as mastery's second
  payoff gives the courtship a dowry; also defers nothing (secret ranks ship
  in the follow-on wave anyway).
- **Lesson meter numerals?** Recommend the quiet fill — the bench speaks in
  states, not percentages; a grindometer would cheapen the courtship.
- **Haste on Q+relic (THE QUICKENED HAND) vs. retiring slot haste?**
  Recommend keep — it turns a wiring accident into a build texture, and
  changing it would touch the TTK bands this epic promises not to move.

## Appendix — roster facts (audited 2026-07-31)

- 216 abilities; 209 arted weapons; 114 distinct arts (16 shared-line, 98
  signature); styles onehand 37 / twohand 20 / archery 24 / arx 33; zero
  style clashes; zero art/technique id overlap; icons + FX complete over the
  whole roster by existing tests.
- TECHNIQUES today: 88 (8 schools × 10 rungs + 1 hidden page each). After
  Phase 1: 202 ledger seats, three citizenships, one resolver.

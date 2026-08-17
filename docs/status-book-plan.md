# THE BOOK OF STATES — the composable status & buff core

Proposal, 2026-08-16. Status: **EPIC COMPLETE (code layer) 2026-08-17 —
all six phases shipped in two days (df253575 → 126712ac → b6136e9d →
3a82422d+9058e252 → 050c9177 → Phase 6 ledger close). Live provings
owed, consolidated in THE GOALS AUDIT below.**

## THE GOALS AUDIT (epic close, 2026-08-17) — the brief, answered

- **"A composable core we can tune — stat effect, stacks, max stacks,
  duration, decay, ramp, tiers, emergent threshold effects,
  consume-at-max for impact or release"**: every knob is a field on
  `StatusPage`; four stacking models; stepDown decay; ramps; named
  tier thresholds that announce; detonate-consume live (release
  reserved with a pin). Authoring a state = a page + its art; the
  engine has not needed an edit since Phase 1.
- **"Buff/debuff icons following our icon law"**: twelve one-subject
  glyph painters in the pages' own derived inks, canvas-direct +
  DOM-bakeable. **"Clear exaggerated bespoke visuals — poison
  dripping, burning, a priest's shield around me, layered,
  decipherable"**: tiered auras with twelve distinct places and
  rhythms, deep-tier drips/pools, the standing facet dome with its
  glass death, landing words, the wound row, honest chip rings.
- **"Attack speed bonuses"**: THE SWING CHANNEL, born reserved and
  now authored (Quickstep, quicken, boss frenzies), band-clamped as
  engine law, prediction-mirrored so it can never desync.
  **"Stacking buffs, proc chances, regen, shields"**: the forge's
  declared table + restack; the proc engine reads states
  (`hitState`, vs clauses); mend page + regen lanes; ward pools with
  the breaking word + the NPC ward seat.
- **"Applied by equipment, potions, boss attacks"**: the shelf lane
  (ConsumableBuff), the strike/aggregate gear lanes (reserved kinds
  priced and waiting), and THE EIGHT CROWNS. **"Spider stacks poison
  that worsens"**: the pack lane per THE LEDGER ANSWERED + tiered
  auras; single-body ramp consciously declined (recorded verdict).
- **"Thousands of combinations"**: pages × stacking models × the
  forge's fold table × vs/consume clauses × procs × tempers × words
  × the swing/armor/move/outgoing seams — every pair priced by ONE
  ledger (`statusLedger.test.ts` + the register + the frozen pins).
- **Balance**: two deliberate number moves in six phases (player
  per-source afflictions, green-lit; the eight crowns' kits, priced
  here); everything else byte-identical at each phase gate,
  test-pinned.

**THE OWED PROVINGS (one list, the epic's standing debt)**: the live
rig walk — twelve ambience voices beside the body ruler at three
scales (the ?fx status wing is the instrument), the eight boss walks
(each crown's page photographed in its arena), the rogue loop and
spider-pack scenes, the ward dome under a boss opener, and the
40-marked-bodies 120fps receipt. The equipment lanes' authored wave
(enchants/words/tempers speaking boon pages) is the recorded
follow-on epic, not a debt.

## Phase 6 — THE LEDGER HOLDS: as-built (2026-08-17)

`content/statusLedger.test.ts` = the epic's constitution, 8
cross-system pins reading the live pages, kits, movesets, and shelf
together: THE HOLD BUDGET (a licensed control art locks ≤ a tenth of
its cycle, and its FULL telegraph — windup plus fuse — warns at
least half the lock), THE DULLED CLAMP, THE SWING ASSEMBLY (the
worst authored haste stack folds inside the band BEFORE the clamp —
the ledger refuses what the clamp would hide), THE MEND BOUND (a
knitting crown gives back ≤ a quarter of itself per cast), THE
CONSUME CEILING (≤1.5, wounds only), THE SELF-PAGE LAW (a body lays
only boons on itself), THE COAT BOUND, and the register/book
agreement (a licensed page can never land mute). Content 582 green.

## As built — Phase 1, THE BOOK OPENS (2026-08-16)

- **`shared/sim/statusBook.ts`** = the book: `StatusPage` (lane,
  hostile, powerIs, stacking model/max/atMax, ramp, decay, tick,
  statMods, cc with engine immunity, thresholds, consume, visuals
  contract) + THE FROZEN SIX transcribed against the LIVE constants
  (zero tuning constants moved — the pages cite BURN_TICK_EVERY et al,
  never restate them) + the pure page-parametric machinery:
  `refreshMax` (the one deepening rule), `weakestOf`, `effectivePower`
  (ramp math, identity for the six), `thresholdsCrossed`, `applyCount`
  (THE COUNT DOOR — one entry carries the whole count; atMax refresh
  or consume; verdict carries spent stacks + detonation + crossed
  tiers), `consumeDetonation` (spend-don't-mint math; `release`
  reserved for the boon lane), `decayAtZero` (stepDown sheds one stack
  and re-arms; expire ends whole), `ccTicksFor`. PURITY LAW: the page
  is a parameter — every model law tested with synthetic pages, no
  server, no registry injection.
- **The server doors read the book** (gameServer.ts): applyStatusToNpc
  dispatches on `page.stacking.model` — perSource/highest/count/
  refresh; the spark REACTION grammar keys on `page.lane === 'spark'`;
  shock's stagger generalized to `page.cc` via `ccTicksFor` (STUBBORN
  CROWN dialing unchanged); the count door announces threshold names
  and detonations through the reaction fx channel and rings with the
  pay-once Set law. applyStatusToPlayer keeps THE PLAYER LAW
  (one-entry-refresh-max) and gains the count door (a count page's
  stacking is its authored identity on any body — the spider ramp's
  seat). tickStatuses reads `page.tick` (clock + damage/heal kind —
  THE MEND DOOR is live engine, unauthored), pulses `effectivePower`,
  and leaves through `decayAtZero`; statusBits speaks the book (a
  perSource entry counts 1, a count entry counts its stacks — the
  shipped nibble unchanged). `ServerStatus.stacks?` added; FAIR HANDS
  immunity stamps on expiry and refuses at both doors — **inlined,
  not a method: THE SLATE-TEST LAW** (the hand-built slates in
  statusLanes/procDoors call door fns on bare objects; a door may
  only reach `this.<state>` behind a page-authored gate, and no
  shipped page authors immunity, so the guard touches nothing today).
- **The client ink truth moved onto the pages**: statusFx `STATUS_INK`
  and `STATUS_VIGNETTE_RGB` now DERIVE from `STATUS_BOOK` visuals
  (every read site unchanged; the vignette record keeps its literal
  key type for `noUncheckedIndexedAccess` consumers).
- **Pinned**: `statusBook.test.ts` (20 laws) — roster/lane/clock/cap
  transcription against the live constants, FROZEN-SIX-author-nothing
  (no count/ramp/tiers/consume/stepDown/immunity on shipped pages,
  atMax refresh everywhere), the total visuals contract (ink hex,
  landing, aura tiers, `status_*` icon ids, DoT vignettes, stacking
  stack-notes), and the pure machinery laws (count to cap,
  consume-once-then-fresh, tiers speak once in order jumps included,
  stepDown step-and-re-arm, cc bounds). Pre-book pins untouched and
  green: statusLanes 11, readingEdge 10, procDoors 11.
- **Gates** (on the standalone HEAD+mine twin AND the shared tree):
  shared 247/247 twin (254 live with a neighbor's travel tests),
  content 570, client 618 + statusFx 9, all tsc clean; server tsc
  clean, status suites 32/32 — the server's 16 breath reds are a
  neighbor session's in-flight cast-channel work, ledgered in HEAD's
  own commit message, untouched here. Staged at hunk level per the
  shared-tree law (gameServer 13-of-30 hunks mine; the transport
  epic's WIP left in flight).
- **Phase 1 residue, recorded**: the DoT `via` cast still names the
  three shipped tickers (the wire widening is Phase 3's); STATUS_BIT
  stays hand-authored per id (THE LOW WORD law); the count door's
  server splice is pure-verdict-driven and gets its first live walk
  when wave one authors a count page.

The brief (user, 2026-08-16): buffs and debuffs are a huge gameplay mechanic
and must rest on a foundational, architectural, COMPOSABLE core — not minor
adjustments. Every knob authorable: the stat effect, the effect itself,
whether it stacks, max stacks, duration, decay, ramp-up, tiers, multiple
stacking effects, emergent effects after multiple stacks, and
consume-at-max (the stack that fills and then spends itself for an impact
or a release). A spider's poison should stack on me and worsen as it
stacks. Attack-speed bonuses, proc chances riding applied states, regen
lifts, shields. Icons that follow the icon law. And every state wearing a
clear, exaggerated, bespoke, layered visual — poison dripping, fire
burning, paralysis arcing, a priest's shield standing AROUND the body —
mastered in the 2.5D perspective. Sources everywhere: equipment, potions
and consumables, boss and enemy attacks. Thousands of combinations; a
system built for longevity.

This plan is the deep review of everything that stands, the laws, the page
schema (the heart of the composability), and six phases. Nothing below is
implemented.

---

## Part 0 — The deep review (receipts verified 2026-08-16, three sweeps)

THE THINKING BLADE (buildcraft, epic complete 08-14) built most of the
*connective tissue* this brief assumes. The honest finding of this audit:
the machinery is deep, test-pinned, and **hardcoded per status** — six
states whose behavior lives in engine branches, not in data. Composability
is the missing layer, and three whole channels the brief names do not
exist at all.

### What stands (and is sacred)

- **Six statuses in three lanes** (`shared/sim/abilities.ts:17-99`):
  SPARKS (`burn/chill/shock`) react among themselves (3 surviving pairs);
  AFFLICTIONS (`bleed/venom`) stack **per source** capped 5, fold into the
  weakest at the cap so no landed apply is eaten; `sunder` = the one
  amplifier mark, highest-wins, clamped 20%. All of it test-pinned
  (statusLanes 11 laws).
- **THE ONE SEAM** (`damageNpc`, mirror at `damagePlayer`): `stateBucket`
  is the game's ONLY target-conditional multiplier — highest clause per
  riding state, distinct states multiply, sunder folds in, CONSUME verb
  spends the state. TWO BUCKETS AND NO MORE holds structurally
  (readingEdge 10 laws).
- **The proc engine**: 11 triggers × 10 actions, ONE ID = ONE TIMER = ONE
  METER, whiff-0 sacred, counters bank through rest, chance never rolls
  while resting. 34 enchant workings + 33 tempers + 92 set words author
  it. `hitState` procs and `vs` clauses already read the body.
- **The status wire**: u16, low byte frozen forever, sunder bit 8,
  affliction stack nibble bits 9-12, **bits 13-15 free**. No duration, no
  magnitude on the wire — bits and stacks only, by law.
- **The visible fight**: statusFx.ts landing words (library-voiced,
  rising-edge), STATUS_INK the one color truth, nameplate state blocks +
  xN, the wound row, DoT ticks signed by `via`, tinted vignette, combat
  buff chips (lettered coins, cap 6).
- **The matter library** (FX v5): ten mastered materials, pooled emitters
  (point/ring/rim/path/cone/orbit/disc), real z-height with
  die/settle/bounce/splat landings, the world layer y-sorted among
  bodies, ONE-VOICE law. `venom.drip`, `venom.pool`, `storm.static`
  ("a charged body, a humming ward"), `fire.plume`, `radiance.halo` are
  the exact primitives a status-aura layer composes from.

### The gaps (every one verified absent)

1. **No status registry.** The six states' semantics live in engine
   branches (`applyStatusToNpc` three-lane door, `tickStatuses` DoT
   routing, hardcoded tick clocks). Adding a seventh status means editing
   the engine in five places. There is NO page where a status declares
   its stacking model, ramp, decay, thresholds, or consume behavior —
   none of those concepts exist.
2. **No stack count on an entry.** `ActiveStatus { id, power, ticksLeft }`
   — stacking is *list length per source*, nothing else. No per-stack
   ramp ("poison worse each stack"), no tiers, no threshold effects, no
   decay-stack-by-stack (expiry is whole-entry), no consume-at-max.
3. **The buff layer is a flat struct with ad-hoc physics.**
   `PlayerBuff` (gameServer.ts:2138) has 16 fields and **per-field fold
   rules scattered across read sites**: crit additive, dmgMult
   additive-of-excess, speed multiplicative, regen best-wins, armor
   summed, reflect max, shields drained in list order. No ids beyond
   display, no stacks, no max, no ramp, no lifecycle hooks (no on-apply,
   no on-tick, no on-expire — expiry is one filter loop). A "stacking
   attack-speed buff that releases at 5 stacks" has no home.
4. **No attack-speed channel. Zero sites.** `attackCooldown =
   weapon.cooldownTicks × strike.recoveryMult` and nothing else touches
   it. No gear stat, no buff field, no enchant kind, no SurgeStat.
   (`CHILL_SPEED_FACTOR`'s "movement/attack" comment lies — all five
   read sites are movement.) Cast speed likewise (only the planted-cast
   1.25 breath). Cooldown haste exists; swing haste does not.
5. **Hard CC is one special case.** Shock's `stunLeft` — set only by
   shock, consumed **only by NPCs** (a shocked player is never stunned).
   No root, no snare-as-state, no silence, no player-side CC fairness
   machinery (no diminishing returns, no immunity windows). Bosses have
   `stunMult`; players have nothing.
6. **Shields are flat pools.** `shieldHp` drained after mitigation, in
   list order. No decay, no on-break event, no NPC-side absorb, no
   shield visual on the body (only `ward_shell`'s cast signature — the
   dome exists as choreography, not as a riding state's face).
7. **The continuous body visual predates the library.**
   `statusAmbience` is the last hand-rolled matter in the status system
   — six branches of raw bursts. Good bones (distinct PLACE and RHYTHM
   per state — the anti-mush law) but: no stack/tier escalation (one
   venom bleb rate whether 1 stack or 5), no state for shields, no CC
   visual, and it is the ONLY ongoing signal.
8. **No status icons exist.** Statuses render as colored squares
   everywhere. The icon-IS-the-painter law (every weapon's icon is its
   world painter) has never reached states. Buff chips are lettered
   initials; `BuffInfo` carries no stacks, no magnitude, no icon.
9. **The wire is nearly full.** 3 free bits for new visible states, no
   stack detail beyond the shared nibble, no boon bits at all.
10. **Consumables/boss vocabulary is narrow.** 26 buff items across two
    channels (one food + one tonic, replace-not-stack); 33 NpcDefs carry
    a flat `attackStatus`; 8 bosses have phases (cdMult/speedMult) but
    no debuff mechanics, no stacking dread, no enrage-as-state.

### What this means

The user's sentence "if I'm getting hit by a spider I want poison stacked
on me, worsening per stack, with a clear icon and a body that LOOKS
poisoned" requires, today: a stack count that doesn't exist, a ramp that
doesn't exist, player-side stacking that was deliberately deferred, an
icon system that doesn't exist, and a tiered aura that doesn't exist. The
foundation below gives every one of those a page to live on.

---

## Part 1 — The laws

1. **ONE BOOK.** Every status — debuff or boon — is a page in
   `STATUS_BOOK` (shared, pure data + pure helpers). The engine
   interprets pages; it never special-cases an id outside the book. The
   six shipped states become the first six pages, **byte-identical**
   (test-pinned against the live suite before and after).
2. **THE PAGE IS THE KNOBS.** Stacking model, max stacks, ramp, decay,
   tick, thresholds, consume-at-max, stat mods, CC, visuals contract —
   all declared on the page (Part 2 schema). Authoring a new state is
   writing a page + its visuals, never touching the engine.
3. **THE FROZEN SIX.** Phase 1 moves ZERO tuning constants and ZERO
   protocol bytes. Coexistence, reactions, per-source caps, the seam,
   the consume verb — all identical. (The Buildcraft discipline: the
   keystone phase changes possibility, not damage.)
4. **TWO BUCKETS STILL BINDS.** New stat mods fold into the existing
   buckets at the existing sites. Nothing new multiplies. A page's
   damage-taken mod IS sunder's lane (highest-wins, clamped); a page's
   damage-dealt mod folds beside surgeDmgMult. The anti-D3 constitution
   survives its own generalization.
5. **A STACK IS A THING YOU CAN SEE.** Extends A STATE IS A THING YOU
   CAN SEE: every stacking page has visible stack escalation — the aura
   thickens by tier, the nameplate counts, the own-HUD chip counts, and
   threshold moments announce themselves. No hidden ramps.
6. **THE ICON IS THE PAINTER, FOR STATES TOO.** Every page names an icon
   painter; the painter's palette is the state's matter palette
   (Material.palette — the library anticipated this); the same painter
   serves buff chips, nameplate detail views, and tooltips. No status
   ever renders as a bare colored square again.
7. **FAIR HANDS.** Player-side hard CC exists only as short, telegraphed,
   diminishing states (stagger ≤ 0.7s, root breaks on damage threshold),
   with a per-page immunity window after expiry. Bosses keep `stunMult`;
   players gain the mirror dial. No CC chains by construction — the
   immunity window is engine law, not authoring discipline.
8. **THE LOW WORD IS FROZEN.** When the wire widens (u32, Phase 3), the
   low 16 bits keep their exact v29 meanings. New states take the high
   word; own-body detail (per-page stacks, durations for chips) rides
   additive JSON on existing messages, never invented client-side.
9. **PROCS NEVER BEGET PROCS; WHIFF-0 IS SACRED; HIGHEST WINS, PER
   SOURCE; NO BORROWED POWER; THE AFFIX INDEX IS UNTOUCHABLE** — all
   inherited verbatim from THE THINKING BLADE.
10. **THE BODY BUDGET.** Continuous per-body FX stay inside the
    rate-gated burst idiom (emitter records are scarce: cap 48; bodies
    are unbounded). Sustained followed-emitters are reserved for the
    OWN body and boss bodies only. 120fps is a law; the crowd test
    (40 marked bodies) ships with the phase.

---

## Part 2 — The page (the composable schema)

The heart of the epic. One type, in shared, serving debuffs and boons,
players and NPCs, wave-1 and every future state:

```ts
interface StatusPage {
  id: StatusId
  name: string                      // 'Venom', card + chip + codex
  lane: 'spark' | 'affliction' | 'mark' | 'boon'
  hostile: boolean                  // debuff or boon (cleanse targets hostile only)

  stacking: {
    model: 'refresh'                //   one entry, refresh-max (sparks today)
         | 'perSource'              //   entry per (source, pet-hand), cap + fold-weakest (afflictions today)
         | 'highest'                //   one entry, highest power wins (sunder today)
         | 'count'                  //   NEW: one entry with a stack counter — the composable workhorse
    max: number                     // max stacks (count model) or source cap (perSource)
    atMax: 'refresh'                //   landing at max refreshes duration
         | 'consume'                //   landing at max SPENDS the stack: fire the consume block
  }

  ramp?: {                          // what each stack adds (count model)
    powerPerStack: number           //   tick damage / magnitude grows per stack
    statPerStack?: Partial<StatMods>//   stat mods grow per stack (attack speed +4%/stack…)
  }

  duration: { ticks: number
    decay: 'expire'                 //   whole state ends at 0 (today's shape)
         | 'stepDown'               //   lose ONE stack per interval, re-arming the clock
    stepTicks?: number }

  tick?: { every: number, kind: 'damage' | 'heal', pierceArmor?: boolean }

  statMods?: StatMods               // moveSpeedMult, attackSpeedMult, armorDelta,
                                    // regenPer4s, damageDealtPct, damageTakenPct,
                                    // cooldownMult — read at the existing single sites

  cc?: { kind: 'stagger' | 'root', maxTicks: number,
         immunityTicks: number,     // FAIR HANDS: post-expiry immunity, engine-enforced
         breakOnDamage?: number }   // root breaks after absorbing N damage

  thresholds?: Array<{              // emergent effects at stack counts
    atStacks: number
    name: string                    // the tier speaks: 'Envenomed', 'Ablaze'
    effect: ThresholdEffect         // grant a rider page, open a proc door,
  }>                                // upgrade the aura tier — authored, visible

  consume?: {                       // what atMax:'consume' (or an authored spender) releases
    kind: 'detonate'                //   damage burst scaled by stacks spent
        | 'release'                 //   grant a boon page scaled by stacks spent
    ...per-kind fields
  }

  grants?: ProcEffect[]             // procs that live only while the state rides
                                    // ("while Quickened, your strikes may kindle")

  visuals: {                        // the CONTRACT the client must honor (client owns the art)
    ink: string                     // STATUS_INK entry
    vignette?: string               // own-body hurt tint
    landing: string                 // matter deployment id for the rising edge
    stackNote?: string              // the re-apply note
    auraTiers: 1 | 2 | 3            // how many escalation stages the body wears
    icon: string                    // painter id — THE ICON IS THE PAINTER
  }
}
```

Two engine changes make the whole schema live:

- **`ServerStatus` gains `stacks: number`** (count model; 1 for the
  legacy models — list length keeps meaning what it means for
  perSource). The wire nibble already carries a 0-15 count.
- **The four doors read the book**: `applyStatusToNpc` /
  `applyStatusToPlayer` dispatch on `page.stacking.model` (the existing
  three lanes become three of four models — same code paths, now
  data-selected); `tickStatuses` reads `page.tick` and `page.duration.
  decay`; the stat read sites (`rideSpeedMult`, attack cooldown, armor
  term, regen pass, the two buckets) each read the riding pages'
  `statMods` at their one existing seam.

`PlayerBuff` then becomes the boon lane's *runtime record* rather than a
parallel system: named combat buffs, consumables, wards — each is a page
application with the same stacking/ramp/decay/threshold grammar. The
per-field fold rules stop being scattered lore and become one declared,
test-pinned fold table (crit additive, speed multiplicative, regen
best-wins — same numbers, one home). Consumable channels (one food, one
tonic) survive as page-level exclusivity groups.

**What this buys, concretely** — each a page, none an engine change:
spider venom that stacks to 5 on the PLAYER and worsens per stack;
a `quicken` boon (+attack speed per stack, 5 max, released as a nova at
max by a rogue's finisher); a `stonehide` potion boon that decays
stack-by-stack; a boss's `dread` mark that at 3 stacks staggers; a
`kindling` state that at max CONSUMES into a detonation (the retired
spark-affliction reactions reborn as authored, visible, paged payoffs).

---

## Part 3 — The six phases

### Phase 1 — THE BOOK OPENS (the registry, byte-identical)

`shared/sim/statusBook.ts`: the `StatusPage` type, the six shipped pages
transcribed exactly (their current clocks, caps, and lanes as data), pure
helpers (`pageOf`, `stacksOf`, fold helpers). The four engine doors read
the book. The `count` model + `stacks` field + threshold/consume/decay
machinery land in the core, **exercised only by tests** (no authored
page uses them yet). Suite law: every pre-existing status test green,
untouched; new `statusBook.test.ts` pins page-driven dispatch equals the
old branches, plus the new models' laws (ramp math, stepDown decay,
consume-at-max fires once, immunity windows). ZERO tuning constants
move; wire untouched.

### Phase 2 — THE BUFF FORGE (boon pages + the missing channels)

**SHIPPED 2026-08-16. As-built:**

- **`shared/sim/buffForge.ts` = THE DECLARED TABLE**: every PlayerBuff
  fold rule in ONE home (crit additive, dmgMult additive-of-excess,
  speed multiplicative, armor sum, reflect/lifesteal max, regen/gather
  best-of), each a pure named function the read sites now call — seven
  scattered folds became one constitution, byte-identical (full server
  suite 558 green untouched). STACKS LAW: a buff may carry `stacks`;
  additive rules multiply by the count, multiplicative rules raise to
  it, max/best rules IGNORE it (a deeper stance is a bigger number,
  never a count). `restack` = the landing (climb to the buff's own
  max, clock refreshes upward). No shipped pusher stacks yet.
- **THE SWING CHANNEL is born**: `attackSpeedMult` on PlayerBuff,
  GearStats (`swingSpeed` EnchantEffect kind — additive pct, the
  speed idiom), `AbilitySelf`, and SurgeStat `'swing'` (all RESERVED —
  zero authored users; the ledger prices wave one). `swingMult(gear,
  buffs)` folds and clamps to the band (0.6..1.5, ENGINE law — no
  assembly of sources escapes); `swingCooldown(base, mult, floor)`
  pays it at the two server swing sites. **THE CHOREOGRAPHY FLOOR**:
  haste never starts the next swing before the style's pose hold
  (STRIKE_CLOCKS) ends — the floor binds the haste, never the
  weapon's native cadence. The bow keeps its own draw clock (a
  recorded Phase 5 door). Cooldown haste and swing haste stay
  distinct stats.
- **THE MIRROR LEARNS THE CHANNEL**: the client's melee and staff
  prediction lanes pay recovery through the SAME shared
  `swingCooldown` under `S2CBuffs.swing` (additive wire fact, absent
  = 1, server-clamped) — the two clocks cannot drift by
  construction. The mult re-sends on every buff push, buff expiry
  (swing-carrying buffs flag the push), and equip change
  (onEquipmentChanged now sends buffs — a stale mirror recovery is
  structurally impossible).
- **THE BREAKING WORD**: a shield pool emptied by a blow announces
  itself once (reaction-fx 'Ward Broken', pale ink, no glow debt)
  and refreshes the chips — the on-break moment Phase 4's dome
  shatter will re-voice. **THE WARD SEAT**: `NpcComp.ward` absorb
  pool drained before flesh in damageNpc; a fully swallowed blow
  speaks the `warded` flag (the invulnerable-actor voice), never a
  bare zero. No shipped body carries one.
- Wire: `BuffInfo.stacks` (chips count when a stacking boon ships;
  `icon` deliberately waits for Phase 4's painters — an icon id with
  no painter would be a lie). `describeBuff` speaks the swing clauses.
- **Pinned**: buffForge.test.ts (9 laws — the table, stack law, band
  clamp, choreography floor binds-haste-never-weapon, restack).
  Gates: shared 263, server 558 (fully green — the breath reds left
  with the transport ship), content 570, client 618, tsc clean × 4.
- **Deferred by design, recorded**: full re-founding of PlayerBuff as
  boon PAGES (the stacking/fold/channel machinery is in place; the
  page identity lands with the first authored boons in Phase 3 wave
  one, so content and identity arrive together); generic
  on-apply/on-expire hooks ride that same landing (on-break shipped
  now because shields already exist); chill's page statMods still
  read at the historic sites (the page-statMods fold joins wave one's
  pricing).

- Boon lane live: `PlayerBuff` re-founded on pages (same fields, same
  folds, one declared table + pins). Lifecycle hooks: on-apply,
  on-expire, on-break (shields), threshold crossings — small, engine-
  owned, page-declared.
- **The attack-speed channel is born**: `attackSpeedMult` in StatMods +
  `GearStats` + a SurgeStat entry, read at the ONE cooldown site
  (`attackCooldown` assignment), clamped (0.6..1.5 band — the ledger
  prices it), threaded to the client swing predictor. Cooldown haste
  and swing haste stay distinct stats.
- Shields become pages: absorb pools with optional decay, an on-break
  moment (the dome shatters — a landing), NPC-side absorb now possible.
- Wire: `BuffInfo` gains optional `stacks`/`icon` (additive JSON);
  `S2CBuffs` unchanged otherwise.

### Phase 3 — THE WIDER WOUND (the wire, the roster, fair CC)

**SHIPPED 2026-08-16. As-built:**

- **The wire widened**: snapshot `status` u16 → u32 (protocol v34,
  record reshape +2 bytes/entity, judgment comment in constants.ts).
  THE LOW WORD IS FROZEN — bits 0-15 keep their exact v29 meanings,
  pinned both ways in abilities.test (only the six pre-widening
  states under bit 16; nothing collides with either nibble). Wave-one
  states ride bits 16-21; the COUNT nibble (bits 22-25,
  `countStacksOf`) carries a count page's own depth — the affliction
  nibble returns to pure per-source meaning; bits 26-31 free. The
  roundtrip test walks all three lanes at once.
- **The wave-one roster** (six pages, ENGINE-COMPLETE and
  APPLIER-FREE — `statusWave.test.ts` in content is the tripwire: no
  shipped ability/kit/item/enchant/word/temper lays one until Phase 5
  prices it): `root` (hold lane, ≤2s clamped AT THE DOOR, stone feet,
  breakOnDamage 6, immunity 3×), `stagger` (the true stagger, ≤0.7s,
  immunity 4×, holdsPlayers TRUE — and shock's page now declares
  holdsPlayers FALSE: the historic never-stun-a-player law is the
  page's own word), `weaken` (mark lane, sunder's outgoing mirror,
  WEAKEN_MAX_PCT 15 clamp), `quicken` (the count model's boon debut:
  5 stacks × 1.04 swing each, band-clamped at the fold), `mend` (THE
  MEND DOOR's first page, heal-kind tick), `stonehide` (stepDown's
  debut: three coats shed one per 5s, armorDelta 4 × stacks). Lane
  vocabulary grew `hold`; powerIs grew `tickHeal`/`dealtPct`.
- **THE LEDGER ANSWERED — the phase's ONE deliberate number move
  (green-lit)**: the player affliction door now mirrors the NPC shape
  exactly (per-source entries, page cap, fold-into-weakest; the same
  hand refreshes). A pack's wounds are real; the statusLanes pin is
  REWRITTEN to the new law. Sparks/marks keep one-entry refresh-max
  on players.
- **FAIR HANDS made real**: player stunLeft at the door for
  holdsPlayers pages; the attack and cast doors refuse a held body
  (inline + optional-chained — THE SLATE-TEST LAW claimed its second
  scalp this phase: a `playerHeld` method broke 27 pinned tests
  before the inline recut, now ledgered twice); breakOnDamage
  accumulates on the entry at BOTH damage doors and snaps the hold
  early with the immunity stamp; root's duration clamps to its lock
  at both doors.
- **The page-driven stat seams** (all dormant until appliers): THE
  BOOK'S FEET — `moveFactorOfList` replaced every hardcoded chill
  read (4 server movement sites, byte-identical at 0.55) and
  `moveFactorOfBits` replaced the predictor's `chilled` flag (the
  mirror reads the same pages off the wire; root/stagger stop the
  predicted feet the frame the bit lands); THE DULLED ARM —
  `outgoingAmp` folds the ATTACKER's dealtPct marks at both damage
  doors (DoT pulses skip by construction); `statusSwingFactor` joins
  the swing fold inside the band clamp (quicken's seat; re-mirrored
  on apply AND expiry); `statusArmorDelta` joins the armor term
  (stonehide's seat). THE HONEST CLEANSE: all three cleanse doors
  (proc, pet, self) strip hostile pages only — a mend never dies to
  its bearer's own dispel (`survivesCleanse`).
- **The client learned the roster**: EDGE_BITS/nameplate/wound-row
  orders append (holds first — a lock outranks a number — then
  marks, then boons); six landing voices + two count stack-notes,
  library-composed (root = the earth grabs, stagger = storm impact,
  weaken = shadow bloom, quicken/mend = radiance, stonehide = stone
  settling ON the body); inks derive from the pages as always; both
  nibbles sum into the xN. The count nibble gets its own edge watch
  (AMBIGUOUS COUNTS SPEAK QUICKEN). Phase 4 masters the tiered auras.
- **PlayerComp gained `eid`** (stamped at spawn — the buffs push
  reads riding pages); ladderModel prices the roster (root 1.35×
  chill's weight, stagger 2.2, weaken as sunder's mirror ×0.9, boons
  0 hostile-score by construction).
- **Pinned**: shared 268 (roster/lane/FAIR-HANDS/feet-mirror/dulled-
  arm/boon-seam/cleanse laws + the u32 LOW-WORD-FROZEN pin), content
  571 (the applier-free tripwire), server 560 (THE LEDGER ANSWERED
  rewrite + the count-nibble wire law), client 628 (the twelve-state
  grammar), tsc clean ×4 — every suite FULLY green.

- Snapshot `status` u16 → u32 (protocol bump; LOW WORD FROZEN). High
  word: new visible states + a second stack nibble for the count model.
- Wave-1 pages (proposed, priced in Part 4): `root` (webs and snares
  become honest states — breakOnDamage, immunity window), `stagger`
  (the shock-stun generalized, player-fair per FAIR HANDS — shock's
  NPC behavior unchanged), `weaken` (outgoing-damage-down — the debuff
  mirror of sunder, same clamp discipline), `quicken` (attack-speed
  boon), `mend` (HoT page — the heal-over-time lane regen never
  covered), `stonehide` (armor boon with stepDown decay). Player-side
  affliction stacking (the deferred ledger question) is priced HERE,
  as spider-lane content demands it — capped 5, per-source, exactly
  the NPC shape.
- Cleanse grows up: `hostile`-only, lane-filtered, page-respecting
  (no more blanket component delete).

### Phase 4 — THE VISIBLE AFFLICTION (the master visual pass)

**SHIPPED 2026-08-17 (code layer; live rig proving owed). As-built:**

- **THE ESCALATION LAW in statusAmbience**: the wire's two nibbles
  drive the weather — wound tier raises spawn rates (×1 → ×2.4
  toward the cap), tier 3+ doubles grains (the boiling read), tier
  4+ earns the brief's exact scenes: venom DRIPS off the body with
  real z and bleed pools dark flecks at the feet. Six new voices,
  each with its own PLACE and RHYTHM (anti-mush law held): root
  grips the FEET in tumbling earth, stagger rings the HEAD in pale
  glints (a different height, color, and clock than shock), weaken
  sinks unlit violet off the arms, quicken streaks gold PAST the
  sides (rate grows per stack), mend climbs a tight glinting column
  at the spine, stonehide HANGS blue-grey facets at the skin
  (plates hold; sunder's chips fall — the two greys can never
  blur). All rate-gated bursts (THE BODY BUDGET).
- **THE STANDING SHELL**: `S2CBuffs.ward` (additive — Σ live shield
  pools, present when > 0; every grant/break/expiry path already
  re-sends). The own body wears a quiet facet dome — ward_shell's
  geometry as a PRESENCE: six breathing glass panes to the apex,
  far side dimmed for the 2.5D read, an equator rim with one
  walking glint — and when the total crosses to nothing the shell
  dies as glass: a one-shot expanding rim flash + real falling
  shards (latched, plays exactly once). Partial drains stay quiet
  by design (the chip's desc holds the number).
- **THE ICON IS THE PAINTER, FOR STATES TOO**: `render/
  statusIcons.ts` — twelve glyph painters, ONE SUBJECT each in the
  page's own ink (flame, flake, bolt, drop, beading bleb, cracked
  plate, gripping spikes, rung-bell stars, sinking chevrons,
  driving chevrons, the cross, the hex coat), direct-draw for
  canvas HUDs + `statusIconUrl` through the shared outlined-sprite
  pipeline for DOM surfaces. THE WOUND ROW wears them at 14 px
  (the nameplate keeps its squares — at 3-7 px a square IS the
  right glyph).
- **THE HONEST RING + the stacks badge**: every buff chip sweeps a
  conic rim ring draining against the seconds it was told at
  receipt (no invented timers — a refresh is a new push, a new
  truth), and a stacking boon's chip wears its xN badge. Tokens
  only, stylesheet classes (.chip-stacks, --sweep).
- **THE STATUS WING** joins the ?fx lab: `s` cycles a forced page
  on the own body, `S` the stack tier — ambience, escalation, dome,
  and glyph row photographable without a live applier.
- Gates: shared 268, server 560, client 630, tsc ×4; staged
  hunk-level around the loot session's live renderer work, twin-
  verified (HEAD + mine alone compiles). **Owed**: the live rig
  walk (all twelve voices beside the body ruler at three scales,
  the 40-marked-bodies 120fps receipt) — the ?fx status wing is
  the instrument for it.

The showstopper phase, and the reason the page carries a visuals
contract. All of it composes the matter library (ONE-VOICE):

- **Tiered auras**: `statusAmbience` reborn reading pages — every state
  keeps its PLACE and RHYTHM (anti-mush law) but gains stack
  escalation. Venom tier 1 = the rising blebs; tier 2 = beads dripping
  off the body (venom.drip grammar, real z, splat landings); tier 3
  ("Envenomed") = a low pooling shimmer underfoot + drip rate doubled.
  Burn tier 3 wreathes the silhouette in fire.plume gobbets. Bleed
  stays broken matter (no glow, ever). All rate-gated bursts (THE BODY
  BUDGET); own body + bosses may carry one followed emitter each.
- **The shield stands around the body**: the ward page's riding visual
  lifts `ward_shell`'s facet-dome math (equator at chest, far-side
  panes dimmed — the 2.5D read already solved) as a quiet standing
  presence: rim glints on the equator, a facet flaring where a blow
  lands (the on-break hook detonates the dome into glass shards with
  real z). Priest's shield, visibly AROUND you, at every camera facing.
- **CC speaks**: stagger = storm.static crackle + the arc jitter on the
  body; root = the web/snare tent grammar promoted from ability
  signature to state visual.
- **Status icon painters**: one painter per page (icons.ts
  `paintedIconUrl` door), palette = the state's material palette,
  audited by the plate instrument (coverage/luminance/fragment
  thresholds). Deployed: buff chips (replacing lettered coins for
  paged states), nameplate detail on own target, wound row hover,
  codex.
- **Chips grow stacks and a duration ring**: stack pips under the icon,
  the ring the kit already offers (ringGauge) sweeping the remaining
  duration — server sends secsLeft already; boons get the ring,
  wire-true.
- **Threshold ceremonies**: crossing a tier fires a landing-scale
  announcement (the tier name in the float grammar, status ink) — the
  emergent moment is SEEN, per law 5.
- Proving: the ?fx lab grows a status wing (cycle pages × tiers on a
  standing body); screenshot audits at three scales × day/night; the
  40-marked-bodies crowd receipt at 120fps.

### Phase 5 — THE AUTHORED TIDE (content wave)

**SHIPPED 2026-08-17. As-built:**

- **Engine completions first — the pages mean the same thing on every
  body**: `AbilitySelf.selfStatus` (a caster lays a page on ITSELF
  through its real apply door — the boss boon lane; the bit rides the
  wire so nameplates, auras, and landings all answer); the four NPC
  swing pay sites fold `statusSwingFactor` through the band clamp (a
  quickened boss TRULY swings faster, pets included); damageNpc soaks
  `statusArmorDelta` before flesh (stonehide true on NPC bodies —
  players fold theirs into mitigate, each body through its own door);
  `ConsumableBuff.attackSpeedMult` (the swing channel's consumable
  lane, mapped at the one buff push).
- **THE EIGHT CROWNS** — one page per boss, kit-delivered: the flame
  tyrant and the oldfang stack `quicken` (each recast deepens the
  count — the frenzy visibly ramps), the fallen king's Gravecold Pall
  and the matriarch's Unmanning Howl lay `weaken` (12/10 under the 15
  clamp), the barrow lord KNITS under `mend` (burst the healing or
  fight him twice), the tidelord's Tide Grasp is the `root` debut
  (ground telegraph 18t, page-clamped 2s, snapped by damage), the
  deepmaw plates coat over coat in `stonehide`, and the anvil golem's
  The Anvil Tolls is THE ONE player `stagger` in the game (20t windup
  — the green-light's whole answer). FLOURISH CONTRACT paid in full:
  eight FX faces (PALETTE-IS-IDENTITY with the pages' inks), eight
  spell plates (ONE SUBJECT each), eight curated charge voices.
- **THE CONSUME VERB's roster debut**: the dagger flurry's plunge
  `consumes venom ×1.5` — the knife's loop assembled end to end
  (envenom the blade, stack the wound, SPEND it at the payoff beat),
  priced on the plan's own conditional row and self-taxed (the spend
  forfeits the DoT's remaining ticks).
- **Quickstep Tonic** — the swing channel's first authored user
  anywhere: +10% swing, 75s, the exclusive tonic channel, THE HONEST
  RING draining it in plain sight.
- **The tripwire rewritten as designed**: statusWave.test.ts is now
  THE REGISTER — every licensed applier named with its ONE page,
  strangers refused, the eight crowns pinned to their kits, FAIR
  HANDS pinned at the register (one stagger in the game, root's
  clock ≤ its page), the quiet lanes (gear/bodies/shelf) pinned
  quiet. The next applier is a conscious ledger decision forever.
- **The spider verdict, recorded**: the brief's stacking-poison scene
  is served by THE LEDGER ANSWERED (Ph3) — a spider PACK stacks
  per-source venom on you, tiered by the Ph4 auras; a single spider
  refreshing its own wound is the anti-spam law, not a gap. The
  single-body count-ramp was weighed and declined (it would fork
  venom's model per body type against the affliction constitution).
- Validator catches paid honestly: the ground-telegraph law (tide
  grasp fuse 18t) and the buff-does-something pin learning the new
  channel. Gates: shared 268, content 574, client 630, server status
  suites 34/34 green (one unrelated red = the loot session's
  in-flight drops work, theirs by content); staged hunk-level around
  their live gameServer/drops lanes per the seventh-bomb ceremony.
- **Owed forward to Phase 6**: the live boss walks (each crown's page
  photographed in its arena), the equipment lanes' wave (enchant/
  word/temper boon actions — priced there), spider-family kit
  pressure review.

Sources everywhere, exactly as briefed:
- **Enemies**: spider family venom goes count-model on players (the
  brief's exact scene); wolf packs' bleed per-source pressure reviewed;
  each boss gains ONE paged mechanic (dread marks, kindling
  detonations, arena-wide stonehide phases) — 8 bosses, 8 pages of
  identity.
- **Equipment**: procs and tempers gain boon-page actions (quicken
  surges, mend workings); one new chase set whose 4pc speaks the
  count model (build-and-release).
- **Consumables**: the alchemist's shelf grows boon-page potions
  (quicken draughts, stonehide tonics with honest stepDown decay);
  coatings unchanged (instance law stands).
- **Abilities**: the rogue's buff-then-burst archetype assembled and
  proven (quicken stacks → consume finisher); technique rank IVs may
  upgrade page interactions (the Reading Edge precedent).
- Every authored page ships with its FULL visuals contract (law 5/6) —
  no state lands mute, ever.

### Phase 6 — THE LEDGER HOLDS (balance + proving)

`ledger.test.ts` extends: every page's throughput-equivalent priced
(uptime × magnitude, one currency); attack-speed band enforced
structurally; CC budget (total possible lockdown per 10s window)
pinned; TWO BUCKETS grep-proof re-run; TTK brackets green. Live
proving on the rig: the spider scene, the rogue burst loop, the shield
dome under a boss opener, the crowd receipt. As-builts + memory.

---

## Part 4 — The power ledger (starting numbers, tune at ship)

| Channel | Budget |
|---|---|
| count-model DoT ramp | tick power × stacks, total ≤ 1.6× today's flat affliction at cap |
| attack-speed boon | +8-15% typical, band clamp 0.6..1.5, ledger-priced like dmgMult |
| weaken mark | flat 10-15% outgoing-down, highest-wins, short — sunder's mirror discipline |
| stagger (player-side) | ≤ 0.7s, immunity 4× duration, never chainable by construction |
| root | ≤ 2s, breakOnDamage ~2 ticks of source DPS, immunity 3× |
| consume detonation | ≤ the spent stacks' remaining tick damage × 1.5 (spend, don't mint) |
| released boon | priced as the boon page it grants; stacks spent set duration, not magnitude |
| threshold rider | a minor-temper's weight (2-3%) — tiers are texture, not cliffs |

Boons obey NO BORROWED POWER (no expiring currencies — a boon is earned
in the fight or drunk from the shelf, never seasonal). Consumable
channel exclusivity (one food, one tonic) survives unchanged.

## Part 5 — Open questions (answer at green-light)

1. **Player-side stacking** (the deferred ledger question, now due):
   count-model spider venom on players raises damage taken vs today.
   Recommend: yes, capped 5, with the ramp priced so 5 stacks ≈ 1.4×
   today's flat venom — the visible ramp + cleanse/kite counterplay is
   the point of the system.
2. **Player-side hard CC**: FAIR HANDS makes stagger/root honest, but it
   is a real feel change under boss kits. Recommend: ship root wave-1
   (it has counterplay by construction), hold stagger-on-players to ONE
   boss signature until it proves.
3. **The wire**: u32 snapshot bump (recommended — one honest widening
   with the low word frozen, room for a decade) vs. an own-body-only
   JSON side channel (no bump, but remote bodies can't wear new
   states — breaks law 5). Recommend the bump.
4. **Buff unification depth**: re-found `PlayerBuff` on pages in Phase 2
   (recommended — one grammar before content authors against two), or
   defer to after wave-1 content proves the debuff side.
5. **Wave-1 roster breadth**: the six proposed pages, or trim to four
   (root, quicken, mend, weaken) and let stagger/stonehide follow with
   their content?

---

Related law files this plan defers to: buildcraft-plan.md (the two-lane
constitution, THE ONE SEAM, the visible fight), fx-v5-matter-plan.md
(ONE-VOICE, the library, THE BODY BUDGET's emitter arithmetic),
enchanting-v2-plan.md (proc engine), techniques-v2-plan.md (Callings
fold), combat-v2-plan.md (moveset beats), VOICE.md, content boundaries
(no occult vocabulary — states are venom, steel, storm, and stone).

# THE ANSWERED LIFE — Callings v2, the class system's constitution

Status: **GREEN-LIT 2026-08-17** ("Proceed with Phase 1"). Author:
design review 2026-08-17.

## The green-light record (answers taken 2026-08-17)

1. **Epic green-lit; Phase 1 proceeds.**
2. **Budget curve: quartile milestones** — `2 + 1 per skill at
   25/50/75/99`, max 102 (the recommendation, taken).
3. **COST RISES WITH RANK (user's call, overriding the rank-flat
   recommendation).** Read with the brief's own words ("you being
   able to APPLY those higher ranked callings"), the law becomes
   **RANK IS A CHOICE YOU AFFORD**: rank ENTITLEMENT still derives
   free from BASE surplus by the honed clocks (law 3's spirit
   stands — depth is never bought with anything but levels), but the
   APPLIED rank of an answered calling is chosen, capped by the
   entitlement, and priced: `cost = bandCost + (appliedRank − 1)`
   (starting number; the Phase 4 ledger tunes it). Consequences,
   priced deliberately in Phase 4: applied rank is player state —
   `character_callings` gains a `rank` column (migration 42, DEFAULT
   1) and the calling messages gain ADDITIVE fields (`C2SCalling
   .rank?`, `S2CCallings.ranks?: Record<id, rank>`) — legal at v34
   under the DELIBERATE PAIR additive-JSON precedent, so THE QUIET
   WIRE bends (one migration, zero protocol bump) rather than
   breaks. Ranking up never silently overdrafts: the held cost only
   moves when the PLAYER re-answers deeper. A rank-up ceremony now
   offers a decision, not just a note.
4. **Pure platform, ZERO content this epoch (user's call, overriding
   the proving-set recommendation).** Phase 6 loses its exemplars:
   the proving is the ledger's contract tests plus `/calling`
   dev-lever walks on the live rig. Every new lane still ships
   engine-complete and law-pinned; the content epoch authors the
   first real packages (the master smith and the synergy pair move
   there, as its opening bench).
Scope: the CORE PLATFORM epoch — schema, engines, ladder, economy, codex.
The full content wave (10 seats × 25 skills authored) is the FOLLOW-ON
epoch, taken deliberately after this platform proves.

The brief (user, 2026-08-17): Callings are the attunement — the way a
player becomes a class. Dual- and multi-classing by combination; Focus
is the budget that prices the build. Callings must bend gameplay
DRAMATICALLY: procs, triggers (every Nth strike, health thresholds,
on-status moments), passive packages, regeneration, cross-craft mastery
(the master smith who wields steel better than any soldier because she
MADE it). Ten or more per skill, unlocked progressively up the tree
like the techniques, and rankable. Everything configurable and
composable — a platform to author against for years, never hardcoded.
Synergies must EMERGE from simple layered mechanics (one calling lays a
state, another answers it) with many combination routes, not authored
pair tables. Core first, content later.

---

## As built — Phase 3, THE WHEN CLAUSE (2026-08-17)

Engine-complete, zero authored content. What shipped, where it bound:

- **The conditional lane**: `PlayerComp.callingWhens` (rebuilt in
  recomputeGear, keyed `<callingId>#<entryIndex>` — never by display
  name) + `whenEngaged` hysteresis latches. `tickCallingWhens` runs
  per player per tick immediately BEFORE the buff sweep: a true
  condition holds an id-keyed `calling`-channel PlayerBuff (the forge
  folds it like any other buff — band clamps, ride mirror, swing
  mirror inherited free), re-armed WHEN_REARM_TICKS ahead of the
  sweep; falling edges, set-downs, and vanished defs remove crisply
  at the pass, and anything ever missed self-heals at the ordinary
  sweep inside half a second (the safety net under the crisp edge).
  Edges send the buff push; speed-bearing edges mark the ride mirror.
- **whenHolds** = the one truth read, every predicate mirroring the
  dial it generalizes: still/moving split on Bulwark's own
  STILL_ARMOR_TICKS boundary, shieldRaised is shieldArm's
  equippedShield gate, underground is Deep Lungs' plane law, night is
  the Night Angler's sun, stateRiding reads the body's list, wellFed
  reads the food channel. hpBelow/hpAbove engage AT the authored
  line and release only WHEN_HP_HYST past it — a bouncing bar cannot
  strobe a grant, and re-engaging needs the true line again.
- **THE HELD CHIP**: `PlayerBuff.channel` grew 'calling' (+ whenKey,
  quiet); sendBuffs speaks held grants as `calling:`-id chips with a
  placeholder clock, and the client pins the ring FULL by stylesheet
  law (`--sweep: 1 !important` beats the per-frame inline walk, so
  the countdown machinery stays untouched and array-parallel), hides
  the seconds, and wears the answered-calling violet. `quiet: true`
  grants are live but chipless (the momentum idiom). BuffInfo channel
  doc updated — additive v34 wire fact, no bump.
- **THE RE-EXPRESSION VERDICT (open question 6, answered)**: Bulwark
  and War Footing STAND as perk dials. The mitigate site reads the
  stance at the instant of the blow; the when-pass grants at its
  place in the tick — a same-tick edge can disagree, so byte-identical
  fails on ordering, and a chip flickering with every stop/start
  would be noise besides. The dials live on; the `when` lane is for
  the content epoch's new callings, with `quiet` recommended for any
  twitchy condition.
- Gates: callingWhens.test.ts = 6 slate laws (hold/re-arm/release,
  hysteresis both ways, orphan cleanup + ride-mirror mark, the
  planted-stance split, wellFed/stateRiding reads, quiet chips);
  full suites green ×4.

## As built — Phase 2, THE WAKING HAND (2026-08-17)

Engine-complete, zero authored content (the green-light's PURE
PLATFORM stands). What shipped, where it bound:

- **The proc lane**: `PlayerComp.callingProcs` rebuilt in
  recomputeGear (addProc — the matched-set one-meter law verbatim);
  `bodyMoment` offers both lists through THE ONE DOOR with the
  targeted-moment and READING-EDGE preconditions INLINE (the
  slate-test law — a helper method broke the slates on first cut and
  died for it). hitState is body-lane legal now: a calling's edge is
  the hand itself. sendCharges shows calling meters; setCalling and
  the /calling lever resend the roster.
- **THE DOOR REPAIR paid**: lowHp and stride fold into `offerProc` —
  `ProcMoment` grew 'lowHp' | 'stride' | 'stateApplied', procWakes
  gained the stride bank (`amount` — ground accrues through rest like
  charges) and the dead `armed` field died. The lowHp CROSSING stays
  door-side (it reads healths, like hitState reads the list); rest
  law lives in the one arbitration. Slates consciously rebound
  (offerProc/procState/chargesDirty; runProc split adds
  runProcInner).
- **THE ANSWERED ECHO**: `stateApplied` trigger (status-matched at
  the door, no chance field — icd is the governor) rings from the
  NEW `layStatusOnNpc` door. Routing is the law: the player-hand
  sites (ability/basic statuses, coats, strike edges, buff edges,
  house words, the /status lever) lay through it; pets, NPC
  self-pages, reaction plagues, and proc actions call the apply door
  directly and can never echo. `runProc` wraps its body in a
  procDepth counter — PROCS NEVER BEGET PROCS is structural
  belt-and-braces under the routing. applyStatusToNpc keeps its name
  and slates, now answering an honest landed/refused verdict
  (resist/ward/immunity = refusal; a spark spent into a reaction =
  a landing).
- **THE SELF-BLESSING**: `{do:'boon'}` lays a boon page on the wearer
  through applyStatusToPlayer (count stacks, swing re-mirror, chips
  all inherited). procMismatch laws: boon refuses hostile pages
  ("lay wounds with 'status'"), joins yield/reveal as gather-legal —
  a harvest may bless the harvester. Quality scaling: power scales,
  the clock is choreography.
- **/calling dev lever**: answer/set down ignoring unlock and budget,
  session-only (sanitize reclaims at login); with /status routing
  through the lay door, the rig proves the echo end to end with two
  commands.
- **THE REGISTER, the calling column** (callings.test.ts): every page
  a calling lays or reads must hold a license row — empty on purpose
  this epoch; the content epoch's synergy pair opens the ledger.
- Gates: shared 269 / content 594 / server 573 / client 636, tsc -b
  clean ×4. Grammar laws +7 in procs.test.ts, door pins +4 in
  procDoors.test.ts. Owed forward: the client resolves calling-proc
  meter names by id only for gear rosters today — the codex wing
  (Phase 5) teaches it the calling roster.

## Part 0 — The deep review (receipts verified 2026-08-17, two sweeps)

### What stands (and is sacred)

- **THE CALLING LAW v1 (fe9f4b5)**: 53 callings (25 skills × 2 at
  BASE 20/60, +3 GREEN ARTS at 35/45 — pinned callings.test.ts:24),
  flat `effect: CallingEffect` in six shapes: `gear` (EnchantEffect
  aggregate through the SAME exported `foldEffect` enchants use,
  roll.ts:257), `perPiece`, `perk` (~30 one-site dials, the PERK_DIALS
  comment column = the site map), and four trade dials. Free toggle
  any time; the constraint is THE FOCUS LAW's budget.
- **THE FOCUS LAW v1**: `focusBudget` (shared/skills.ts:260) = 2 + 1
  per skill ≥50 + 1 more at 99 — DERIVED, never stored. Costs pinned:
  seat <40 → 1, ≥40 → 2 (callings.test.ts:54).
- **Wire & rows**: protocol v34; `S2CCallings {answered: string[]}` /
  `C2SCalling {calling, on}` — the wire carries ONLY choices, budget
  and costs derive client-side (the doc comment says so on purpose).
  `character_callings` row-presence (migration v4; highest today v41).
  `setCalling` (gameServer.ts:19805) enforces unlock + budget with
  honest refusal lines; `sanitizeCallings` at login is belt-and-braces.
- **THE PROC GRAMMAR (enchants.ts:44-263)**: trigger × action × icd.
  Triggers: hit, hitState (THE READING EDGE), crit, kill, hurt, block,
  cast, lowHp (the Second Wind crossing law), cadence (every Nth,
  whiff-0 sacred), stacks (build-and-spend, THE METER IS THE
  FIGHTER'S), gather, stride. Actions: status, nova, bolt, chain,
  ward, heal, surge (6 stats incl. the reserved swing), cleanse,
  yield, reveal. `procMismatch` refuses unfirable pairings at load.
  Runtime: ONE door `offerProc` (:23691) + `PlayerComp.procs:
  Map<string, ProcRuntime>` — id-keyed so matched sets share one
  timer and one meter; `sendCharges` already ships stack meters to
  the HUD.
- **THE BOOK OF STATES (ccc8c980, complete)**: StatusPage registry —
  lanes, count stacking, ramps, thresholds, consume-at-max, stepDown,
  FAIR HANDS CC, visuals contract; statusWave.test.ts = THE REGISTER
  (every applier licensed by name, strangers refused).
- **THE BUFF FORGE (126712ac)**: the declared fold table (crit
  additive, dmgMult additive-of-excess, speed multiplicative, armor
  sum, reflect/lifesteal max, regen/gather best-of), THE SWING
  CHANNEL band-clamped at one pay site with the client prediction
  mirror, `restack` for stacking boons, PlayerBuff channels
  (tonic/food exclusive, momentum quiet, combat free).
- **THE HONED-ART LAW (abilities.ts:975-1043)**: rank I–IV derived
  from BASE surplus over the anchor — `RANK_SURPLUS [0,15,30,45]`,
  `rankStride` = THE SHORTENED CLIMB (≤54 anchors stride 15; later
  anchors compress so everything ranks IV by 99), `honedAbility` =
  pure spread-merge of absolute-override RankSteps. Zero persistence,
  zero wire — rank is a fact about your level, recomputed anywhere.
- **Codex wing v1 (e814459)**: two-winged arts panel, focus meter,
  call-chips with seen-ledger pips — built for 2 seats per skill
  (`.calling-chips` is literally `grid-template-columns: 1fr 1fr`,
  codex.css:1213).

### The gaps (every one verified absent)

1. **A calling is ONE effect.** No packages: `effect`, singular. The
   brief's "multiple buffs + a proc + a passive" cannot be authored.
2. **A calling can never PROC.** `CallingEffect` has no proc shape;
   recomputeGear folds zero procs from callings (:19724-19761). The
   entire trigger grammar — the brief's every-fifth-strike, its
   health-threshold moment, its chance-on-hit — is gear-only today.
3. **A calling can never say WHEN.** No condition vocabulary. The two
   conditional callings that exist (Bulwark still / War Footing
   moving) are bespoke perk dials each holding one hook site hostage.
4. **No ranks.** `CallingDef` has no rank field; the honed clocks
   never touch callings; a level-99 master holds the same Prospector
   a level-20 dabbler holds.
5. **Two seats per skill,** pinned by test; three-seat skills exist
   only via the GREEN ARTS exception. No ladder.
6. **THE PERK CLOBBER (real defect at 10 seats)**: recomputeGear's
   perk fold is last-write-wins (:19739-19749) except two bespoke
   min/max cases — two answered callings touching one dial would
   silently eat each other. Survivable at 2 seats, fatal at 10.
7. **The proc doors are ALMOST one door**: lowHp and stride moments
   hand-roll their rest checks outside `offerProc` (:23778, :23795) —
   duplicated icd law, the kind of seam a second proc source (us)
   would widen into a bug.
8. **A calling can never lay or read a PAGE.** The status book's
   whole composable vocabulary (count stacks, thresholds, consume) is
   invisible to the character axis. The register has no calling
   column.
9. **A calling can never grant an ART.** The master-smith brief
   ("unlock capabilities beyond a normal wielder") has no rail.
10. **Focus economy sized for 53.** Max budget 52; a 250-calling
    world priced 1/2 against it would make the budget either
    meaningless or paralyzing — it was never asked to price depth.

### What this means

The four engines are built, test-pinned, and already composable — the
status epic even left `swing`, `armor`, `regen` surges and `release`
consume RESERVED, waiting for an authoring surface. Callings v2 is
that surface. We do not build a fifth engine; we give the character
axis full citizenship in the four that exist, then rebuild the ladder
and the economy around it. That is why this can be dramatic AND safe:
every effect a v2 calling speaks resolves through machinery that is
already balanced, already visible, already mirrored client-side.

---

## Part 1 — The laws

1. **ONE GRAMMAR.** A calling speaks the SAME effect vocabulary as
   the equipment axis — EnchantEffect aggregates, the proc grammar,
   the buff forge's fold table, the status book's pages — plus the
   perk dials for the bespoke rest. No parallel proc engine, no
   second stacking law, no third fold. New vocabulary earned here
   (conditions, the stateApplied trigger, the self-boon action) is
   added TO the shared grammar, where gear and future systems inherit
   it for free.
2. **THE CALLING IS A PACKAGE.** `effects: CallingEffect[]` — one to
   several licensed shapes per calling. The def carries theme (skill),
   seat (unlockLevel), price (focusCost), depth (ranks), and its
   package. Authoring a calling is writing data; the doors never
   learn a name.
3. **RANK IS DEPTH, NEVER A PURCHASE.** Calling rank I–IV derives
   from BASE skill surplus over the seat by the HONED-ART clocks —
   same `RANK_SURPLUS`, same SHORTENED CLIMB, one `callingRank`
   resolver beside `techniqueRank`. A rank step replaces the package
   whole (the absolute-override law) and carries its `note` for the
   ceremony. Zero persistence, zero wire: rank is a fact about your
   level.
4. **THE FROZEN FIFTY-THREE.** The keystone phase re-expresses every
   shipped calling as a one-entry package with no rank steps —
   byte-identical behavior, pinned by the live suites before and
   after. The keystone changes possibility, not power.
5. **THE THEME IS THE ROOT, NOT THE FENCE.** A calling belongs to its
   skill by story, seat, and ceremony — never by jurisdiction. The
   smith's calling may sharpen her sword arm; the herbalist's blood
   may shrug poison; the fisher's patience may steady the bow. The
   trade-dial shapes alone stay self-keyed (a trade's own thrift
   points at its own trade — the existing test law). This is how
   multi-classing gets INTERESTING: the crafting half of a build is
   allowed to pay the combat half.
6. **THE BUDGET IS THE CLASS.** Focus scarcity is the whole identity
   mechanism: what you answer under a budget that cannot hold
   everything IS your class. Budget stays derived-never-stored;
   toggling stays free (respec friction is not a mechanic we sell);
   costs stay on the def and derive client-side. The economy is
   rebuilt once, deliberately, in its own phase — the ONE number move
   of the epic.
7. **A CALLING BENDS A DECISION.** The impact floor: every calling
   must change what a player DOES — a rhythm, a window, a route, a
   verb — or move a dial hard enough to be felt blind (the ledger
   sets felt floors per channel, Part 4). "+2% quietly" is authoring
   malpractice under this law. Dramatic is the spec, and the four
   engines make dramatic safe: procs are moments with icd law, buffs
   fold under the declared table, swing lives in its band, CC lives
   under FAIR HANDS.
8. **EVERY FOLD IS DECLARED.** The perk clobber dies: every PerkId
   declares its fold law (sum / mult / max / min) in a declared table
   beside the dials, and recomputeGear folds through it — the buff
   forge discipline extended to the last scattered fold in the game.
   Pinned before the roster widens, because 10 seats WILL collide.
9. **SYNERGY BY VOCABULARY, NEVER BY LOOKUP.** No combo tables. A
   calling may LAY a page (proc → status, licensed at THE REGISTER),
   READ a page (vsState, hitState, the stateRiding condition), COUNT
   moments (stacks meters), and ANSWER edges (stateApplied, lowHp,
   cadence). Combos emerge because many callings speak about the same
   states from different sides — the venom another skill's calling
   laid is a fact about the world that YOUR calling may answer. Every
   page keeps multiple readers by design; discovery is the content.
10. **THE REGISTER STANDS, AND ALL INHERITED LAW WITH IT.** Every
    status applier a calling authors is licensed by name in
    statusWave.test.ts — a conscious ledger decision, per page,
    forever. Procs never beget procs; whiff-0 is sacred; the icd law
    keeps a proc a MOMENT; no borrowed power; highest-wins per
    source; THE BODY BUDGET binds every new visual; FAIR HANDS binds
    any CC a calling ever dares author.
11. **EVERY ANSWER IS SEEN.** A proc announces itself once, by name.
    A conditional package that is LIVE shows itself (the calling
    channel chip with THE HONEST RING); one that is dormant is
    visibly dormant. Rank ceremonies speak their notes exactly as the
    arts do. The codex shows the ladder, the rank, the price, and the
    package in plain words. No hidden math anywhere a player is asked
    to make a build decision.
12. **THE QUIET WIRE.** The core platform ships with NO protocol bump
    and NO schema migration: ranks derive, costs derive, the answered
    set stays an id list, packages resolve server-side through
    existing wires (buffs, charges, statuses, fx). The first wire or
    schema change, if the content epoch ever needs one, is a
    deliberate decision recorded then — not a tax paid now.

---

## Part 2 — The schema (the composable heart)

`packages/content/src/callings.ts` becomes the book of packages:

```ts
/** WHEN a conditional grant is live. Evaluated by the engine each
 *  tick at one site; edges grant/expire an id-keyed calling-channel
 *  buff so the numbers ride THE BUFF FORGE's declared folds. */
export type CallingCondition =
  | { when: 'hpBelow'; frac: number }      // desperation lane
  | { when: 'hpAbove'; frac: number }      // confidence lane
  | { when: 'still' }                      // the planted stance (stillTicks)
  | { when: 'moving' }                     // the march
  | { when: 'shieldRaised' }               // the wall
  | { when: 'underground' }                // the deep
  | { when: 'night' }                      // dusk to sunrise
  | { when: 'stateRiding'; status: StatusId }  // a page rides YOUR body
  | { when: 'wellFed' };                   // a food-channel buff is live

/** What a live condition grants: the BuffLike face, folded by the
 *  forge's table like every other buff in the game. */
export interface CallingGrant {
  name: string;               // the chip's honest name
  armor?: number; speedMult?: number; attackSpeedMult?: number;
  critPct?: number; dmgMult?: number; regenPer4s?: number;
  reflectFrac?: number; meleeLifesteal?: number; gatherSpeed?: number;
  quiet?: boolean;            // momentum-style: live but chipless
}

export type CallingEffect =
  /** Flat aggregate — the SAME foldEffect law gear uses (v1 shape). */
  | { kind: 'gear'; effect: EnchantEffect }
  /** Worn-class scaling (v1 shape, unchanged). */
  | { kind: 'perPiece'; armorClass: ArmorClass; speedPct?: number; maxHp?: number }
  /** One-site dial (v1 shape) — now folded under THE DECLARED TABLE. */
  | { kind: 'perk'; perk: PerkId; magnitude: number }
  /** Trade dials (v1 shapes, unchanged, self-keyed by law). */
  | { kind: 'doubleGather'; skill: SkillId; chance: number }
  | { kind: 'gatherSpeed'; skill: SkillId; mult: number }
  | { kind: 'materialSave'; skill: SkillId; chance: number }
  | { kind: 'craftSpeed'; skill: SkillId; mult: number }
  /** NEW — the waking hand: the full proc grammar, body-side.
   *  Trigger × action × icd, id-keyed into the fighter's one meter
   *  map. Strike-family triggers (hit/crit/cadence/hitState) are
   *  LEGAL here — a calling's edge is the hand itself, so they
   *  resolve body-side at the strike fall-through, THE METER IS THE
   *  FIGHTER'S by construction. */
  | { kind: 'proc'; proc: ProcEffect }
  /** NEW — the when clause: a conditional grant riding the forge. */
  | { kind: 'when'; cond: CallingCondition; grant: CallingGrant }
  /** RESERVED — the master's art: while answered, license one art
   *  (the codex shows it seated by the calling; the cast door checks
   *  the license). No core-epoch author; the content epoch prices
   *  its first (the master smith's brief lives here). */
  | { kind: 'art'; ability: string };

/** A rank step REPLACES the package whole (the absolute-override
 *  law honedAbility taught) and speaks its note at the ceremony. */
export interface CallingRankStep {
  note: string;                       // ≤90 chars, the ceremony line
  effects: readonly CallingEffect[];  // the whole package at this rank
}

export interface CallingDef {
  id: string;
  skill: SkillId;          // the THEME and the unlock tree
  unlockLevel: number;     // the seat (BASE level)
  focusCost: number;       // the price while answered (rank-flat)
  name: string;
  desc: string;            // what answering it MEANS, ≤90, dash ban
  color: string;
  effects: readonly CallingEffect[];              // rank I package
  ranks?: readonly [CallingRankStep, CallingRankStep, CallingRankStep];
}
```

Resolution (shared, pure, mirrored — beside the honed-art clocks):

```ts
callingRank(unlockLevel, baseLevel)   // = techniqueRank: same surplus
                                      //   table, same SHORTENED CLIMB
honedCalling(def, rank)               // → readonly CallingEffect[]
```

New shared grammar earned by this epic (added to enchants.ts, where
gear inherits it too):

```ts
| { on: 'stateApplied'; status: StatusId }   // trigger: YOU laid this
                                             // page on a foe (the
                                             // synergy hinge — the
                                             // envenom answers)
| { do: 'boon'; status: StatusId; power: number; ticks: number }
    // action: lay a BOON page on YOURSELF through the real self-
    // status door (AbilitySelf.selfStatus's sibling) — quicken
    // stacks, stonehide coats, mend: the book's whole boon shelf
    // opens to the trigger grammar.
```

Both are licensed vocabulary: `procMismatch` learns their legality
rules (stateApplied brings a foe; boon needs none), and every status
they touch answers at THE REGISTER.

**Why conditions ride the buff lane, not the gear fold**: recomputeGear
runs on equip/answer edges; conditions change per tick. Rather than
teach the gear fold time, the engine keeps one small per-tick pass:
for each answered conditional, evaluate; on a rising edge grant an
id-keyed buff on the `calling` channel (forge folds, band clamps,
swing mirror, chip surface all inherited free); falling edge expires
it. hpBelow/hpAbove get the Second Wind hysteresis so a bouncing
health bar cannot strobe a grant. One evaluation site, boolean-cheap,
25 conditions cost nothing at 200 players.

---

## Part 3 — The six phases

### Phase 1 — THE PACKAGE OPENS (schema v2, byte-identical)

- `CallingDef` v2: `effects[]` + `ranks`, the 53 re-expressed as
  one-entry packages, no rank steps authored. `callingRank` /
  `honedCalling` resolvers in shared, law-tested with synthetic defs
  (the statusBook purity discipline).
- **THE DECLARED PERK TABLE**: every PerkId gains a fold law
  (sum/mult/max/min) in a table beside the dials; recomputeGear folds
  through it. The two bespoke cases (offhandDelayTicks min,
  drawMoveFactor max) become table rows; everything else declares the
  law its dial's units imply. Byte-identical today (no two shipped
  callings share a dial) — pinned so tomorrow stays honest.
- recomputeGear iterates packages; `isAggregateCallingEffect` guard
  kept per-entry. callings.test.ts REWRITTEN CONSCIOUSLY: founding-
  pair pin becomes schema law (unique seats per skill, honest names,
  dash ban, self-keyed trades, strike-kind ban, cost bands table).
- Gates: full suites green; zero tuning constants move; zero wire.

### Phase 2 — THE WAKING HAND (the proc lane + the door repair)

- `player.callingProcs: ProcEffect[]` rebuilt in recomputeGear;
  `bodyMoment` offers them beside `gear.procs` through the ONE door.
  hitState's door-side precondition learns the body lane; strike-
  family triggers legal body-side (the fall-through already delivers
  hit/crit; cadence counts landed strikes at the fighter's meter).
- **THE DOOR REPAIR (paid here, before a second source widens it)**:
  lowHp and stride moments fold INTO `offerProc` — one rest law, one
  armed law, zero hand-rolled icd anywhere.
- The new grammar: `stateApplied` trigger (fired at the status apply
  doors, attacker-side, once per landing), `boon` self-action through
  the self-status door. `procMismatch` learns both. THE REGISTER
  gains its calling column (empty this epoch, licensed rows come with
  content).
- `/calling` dev lever beside `/proc` — answer/rank-force/fire for
  the live rig.
- Gates: proc suites + new door laws; the repair proven by the
  existing lowHp/stride roster behaving byte-identically.

### Phase 3 — THE WHEN CLAUSE (conditions ride the forge)

- `CallingCondition` vocabulary + the one evaluation site (tick pass
  over answered conditionals); edge → grant/expire id-keyed `calling`
  channel PlayerBuff (`calling:<id>` — the chip's honest name, THE
  HONEST RING free, `quiet` flag for momentum-style grants).
- hpBelow/hpAbove hysteresis (the Second Wind law); still/moving read
  the stillTicks clock Bulwark already trusts; night reads the sun
  the fisher already trusts; stateRiding reads the body's list.
- Bulwark and War Footing MAY re-express as `when` entries (retiring
  two bespoke perk dials) — only if byte-identical at the armor fold;
  otherwise they stand and the dials live on.
- Gates: condition laws pinned with synthetic defs; chip surface
  proven on the rig.

### Phase 4 — THE WIDER LADDER (the one number move)

- **THE SEAT TABLE**: ten seats per skill at 10, 20, 30, 40, 50, 60,
  70, 80, 90, 99 — the decade ladder, the 99 seat a capstone. The 53
  keep their seats (20/60 grandfathered as-is; the three GREEN ARTS
  seats stand — the law pins uniqueness-per-skill and the bands, not
  the exact decade, so authored exceptions stay legal). Empty seats
  are legal this epoch: the ladder is the FRAME; the content epoch
  fills it.
- **THE FOCUS ECONOMY v2**: costs band by seat — 1 under 40, 2 at
  40–79, 3 at 80+; budget curve `2 + 1 per skill ≥25, ≥50, ≥75, ≥99`
  (max 102). A full ladder costs 18; a maxed-everything account holds
  roughly a fifth of the world — the class stays a choice at every
  hour of play. skills.test + callings.test recalibrated in the same
  commit — the epic's ONE deliberate number move, priced in Part 4.
- Ceremonies: seat crossings speak (existing), rank climbs speak
  their notes (`Your Calling deepens — Prospector is honed to Rank
  III: ...`), focus milestones speak the new curve.
- sanitizeCallings under the new budget (drop order: highest-cost
  first, never greedy-arbitrary).
- Gates: economy contract tests (bands, curve, worked archetypes).

### Phase 5 — THE OPEN HALL (codex wing v2)

- The callings wing rebuilt for 250 seats: per-skill LADDER rail
  (seat dots with rank pips, the techniques codex's visual grammar),
  chips gain the rank badge + the cost/lock/answered triad,
  `.calling-chips` becomes an auto-fill grid, the bench speaks the
  package in plain words (one line per effect, procs named with
  their rhythm, conditions with their when), rank progress with the
  next note previewed, focus meter v2 with the band legend.
- Perf: the wing renders ONE skill's ladder at a time (the rail
  picks), never 250 chips in one scroll — pad nav stays key-true.
- Live chip surface: answered conditionals show live/dormant; proc
  meters ride the existing charges wire.
- Gates: client suites; pad walk on the rig.

### Phase 6 — THE PROVING SET + THE LEDGER

- **A dozen exemplars, not a wave**: one calling per new lane across
  contrasting skills, authored to prove the platform end-to-end —
  among them the brief's own master smith (smithing seat whose
  package sharpens WIELDING — a `when: wellFed`? no: a gear styleDmg
  + a cadence proc, the cross-craft flag carried proudly), one
  synergy PAIR spanning two skills (one lays a page, one answers it
  via stateApplied/hitState), one boon-self proc (quicken through
  the book), one conditional (hpBelow desperation), one ranked
  ladder fully authored I→IV. Each licensed, each priced, each with
  its FLOURISH (chip name, proc announcement, ceremony notes).
- **THE LEDGER**: balance contract tests — felt floors per channel
  (a dial calling moves ≥8% in its class or carries a verb), proc
  budget law (damage moments icd ≥ 8s, surge uptime ≤ half), the
  swing assembly re-proven with calling sources in the stack, focus
  cost-value bands, THE GOALS AUDIT answering this brief line by
  line.
- Owed provings recorded: live rig walk of every exemplar, the
  synergy pair fired as a combo, the codex wing on pad.

---

## Part 4 — The power ledger (starting numbers, tune at ship)

- **Felt floors (law 7 made arithmetic)**: armor grants ≥4 flat;
  style/element damage ≥6%; speed ≥5%; crit ≥3 pts; regen ≥1/4s;
  proc actions sized so one waking ≈ 1.5–3 basics of value at its
  seat's level band; conditions may run ~1.5× the always-on floor
  (they are sometimes off — priced honestly, uptime-estimated).
- **Proc budget**: damage-moment icd ≥ 160 ticks (8s); cadence ≥
  every 4; lowHp once per climb-above by law; stacks meters 4–8; a
  calling package holds AT MOST one proc (the moment stays a moment).
- **Cost bands**: 1 / 2 / 3 by seat band (Phase 4). Worked
  archetypes: fresh hand at combat 25 ≈ budget 3 → two minors + a
  seat to covet; the specialist at one 99 + two 50s ≈ budget 12 → a
  full low ladder OR a spine of majors; the completionist at 102
  holds ~34 minors-equivalent of a ~450-point world.
- **Rank steps**: a step may deepen magnitudes ~25–40% per rank or
  trade shape (rank III adds the second entry; rank IV sharpens the
  proc) — the mature package ≈ 2× its rank-I self, mirroring the
  PAYOFF BRACKET's mature-cycle discipline.

---

## Part 5 — Open questions (answer at green-light)

1. **The budget curve** — rec: quartile milestones (25/50/75/99, max
   102). Alt: keep 50/99 and raise FOCUS_BASE (flatter, less
   ceremony).
2. **Cost bands 1/2/3 by seat** with rank-flat costs — rec: yes
   (rank-priced costs double-charge depth, which skill surplus
   already paid for).
3. **Rank steps replace the package whole** (absolute-override law) —
   rec: yes (merge semantics on arrays are where bugs live).
4. **The proving set ships this epoch** (~12 exemplars) — rec: yes
   (a platform unproven by content is a platform unproven).
5. **Seat exceptions** — rec: pin bands + uniqueness, not exact
   decades (the GREEN ARTS precedent stays legal).
6. **Bulwark/War Footing re-expression through `when`** — rec:
   attempt, keep only if byte-identical at the fold.

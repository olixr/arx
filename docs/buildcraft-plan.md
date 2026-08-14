# BUILDCRAFT — THE THINKING BLADE

Proposal, 2026-08-14. Status: **AWAITING GREEN-LIGHT.**

The brief (user, 2026-08-14): combat reads as hack-and-slash — hold the attack
button, blast abilities. We want strategic buildcraft: enough variance in gear
abilities and stats that combinations feel empowering; **set bonuses (which do
not exist at all today)**; proc effects (chance to poison, burn, stun); and
**stacking buff/debuff synergies** — "you have a chance of poisoning a target,
and then any poisoned target takes 1.5x damage from these sorts of abilities."
Core foundational effects that stack on one another, emergent behavior, unique
play styles, end-game depth and repeatability. Research industry standards
(WoW et al.) and design a fully encompassing layer.

This plan is the audit of what stands, the industry findings, the laws, and
six phases. Nothing here is implemented.

---

## Part 0 — The audit (what stands today, receipts verified 2026-08-14)

The surprise of the audit: **most of the machinery already shipped.** What is
missing is not foundations — it is the connective tissue between them.

### Already built and load-bearing

- **A full proc engine** (enchanting v2, THE DEEPER SIGIL). Trigger x response
  with rest timers: 10 trigger doors (`hit/crit/kill/hurt/block/cast/lowHp/
  cadence/stacks/gather/stride`), 10 actions (`status/nova/bolt/chain/ward/
  heal/surge/cleanse/yield/reveal`), pure arbitration in
  `content/equipment/enchants.ts` (`procWakes`, line ~1752), ONE ID = ONE
  TIMER = ONE METER, whiff-0 sacred, charge meters on the wire (S2CCharges).
  34 procs live — but **only on enchant scrolls**. Zero weapons or armor
  carry a native proc (`grep "kind: 'proc'" defs.ts` = 0).
- **A status system with reactions.** Five statuses (`burn/chill/shock/bleed/
  venom`, shared/sim/abilities.ts:17) and a 10-pair `REACTION_TABLE`
  (line 114): applying a DIFFERENT status detonates the riding one
  (burst/aoe/chain/stun/spread). This is a real emergent layer — but it is
  hardcoded, closed, and **structurally forbids coexistence**: a target
  carries at most one status, so "poisoned targets take 1.5x from your burn
  arts" is impossible today (the burn would detonate the venom).
- **A per-piece counting engine.** `aggregateGearStats` (content/equipment/
  roll.ts:303) already counts `classCounts` across the 5 armor slots and
  `perPiece` Callings scale off it — this IS a set-bonus engine minus the
  set identity.
- **A buff array that coexists freely** (`PlayerBuff[]`, gameServer.ts:1702)
  with per-field fold rules (crit additive, dmgMult additive-of-excess,
  regen best-wins) — but no ids, no stacks, and combat buffs are invisible
  to the client (only food/tonic chips reach the HUD).
- **Chance-on-hit outside enchants exists**: 18 weapon defs carry native
  `onHitStatus`, coatings ride the instance, `PlayerBuff.onHitStatus`
  covers stances.
- **Conditional payoffs exist in exactly one authored form**: `executeBelow`
  (16 abilities) plus a handful of hardcoded perks (`greatExecute`,
  `stillArmor`). `winters_fall`'s chilled-kill deed gate is the ONLY
  "X while target has Y" line in the codebase.

### The gaps (every one verified absent)

1. **No mechanical set notion.** No `set` field anywhere; families exist only
   as id naming (`family_piece[_lot]`), erased at compile. 31 named chase
   sets, 15 themed sets, 60 early-family lots — all pure stat sticks.
2. **No target-state reads.** `isShocked`/`isChilled` are the engine's only
   two target predicates. No proc trigger, ability field, gear effect, or
   moveset beat can ask "is this body poisoned."
3. **One status per body.** `applyStatusToNpc` (gameServer.ts:17799)
   detonate-on-different, refresh-max-on-same. No stacks, no coexistence.
4. **No consume verb.** Nothing can spend a status, a buff, or a combo run.
   Finishers cannot know what rides the body they hit (StrikeDef branches
   on input only).
5. **Player->NPC damage has no modifier stage.** `damageNpc` receives a
   finished number. (The one honest seam: top of damageNpc ~18936, where
   `this.statuses.get(npcEid)` is in scope and every path funnels through —
   basics, arts, projectiles, procs, reaction bursts. Mirror seam at
   damagePlayer:19536 beside `mitigate`.)
6. **Armor carries zero effects.** 0 of ~129 armor defs use `effects` —
   every crit/thorns/speed/element effect in the game comes from weapons,
   enchants, or Callings. Two same-level sets with the same affix pool are
   mechanically identical.
7. **Dead stat channels**: `elementDmg` is dead for 3 of 4 combat styles
   (only staves carry an element); rolled `regen` is overwritten by any
   food (best-wins); `EquipmentDef.passive` is plumbed and never authored;
   no crit-damage, no haste, no vulnerability/amplifier stat exists;
   `armor` + `maxHp` are the entire defensive vocabulary.
8. **The status wire is saturated**: snapshot `status` is a u8 with all 8
   bits spoken for (5 statuses + hidden/detected/sheathed). New states or
   stack counts need a protocol change.

### Industry findings that bind this design (full survey in session record)

- **WoW/ESO threshold economy**: 2pc = boring cumulative stat line, 4pc =
  the named behavioral mechanic, on 5-piece sets — the free 5th slot
  preserves mix-and-match and lets a second set's 2pc ride.
- **The D3 boundary**: set bonuses that exceed the stat budget by orders of
  magnitude made sets mandatory and killed buildcraft. A full set must be
  worth roughly ONE extra item (~5-8% throughput), never more than ~15%.
- **OSRS's law**: behavioral bonuses (Dharok's low-HP ramp, Guthan's
  sustain, Void's tradeoff) create identity; "+X damage" creates
  checklists.
- **GW2's two disasters**: a shared per-target condition cap made a second
  condition player worthless (stacking must be per-source); combo fields
  whose resolution is invisible degenerate into rote memorization
  (synergies must be printed on the tooltip and visible on the body).
- **PoE's math constitution**: additive within a bucket, buckets multiply;
  amplifier states never self-stack (highest wins); debuff-layer count is
  itself a purchasable build stat.
- **Proc feel**: rate-normalized (per swing/cast, never per target hit),
  ICD mandatory on chance-when-hit, bad-luck protection, two loudness
  tiers, and a proc that only exists in a damage log is too small to exist.
- **FFXIV's lesson**: enemy-side "takes more damage" debuffs invite
  ownership ambiguity in parties — keep them rare, flat, and singular;
  prefer payoffs conditional on the attacker's OWN build ("YOUR fire deals
  1.5x to poisoned"), which are self-limiting.
- **Classless identity** (Albion/OSRS): the anti-convergence engine is
  CONTEXT — per-enemy typed weaknesses mean "best build" has no answer
  without "against what." This multiplies viable builds with zero balance
  work.

---

## Part 1 — The laws

1. **TWO BUCKETS AND NO MORE.** All gear/stat damage bonuses fold additively
   into one bucket. All state payoffs (vs-status multipliers, amplifier
   marks) fold into a second bucket, highest-wins per state. The two buckets
   multiply. Nothing else multiplies. This is the whole anti-D3 constitution
   and it fits in a tooltip.
2. **A STATE IS A THING YOU CAN SEE.** Every state has an on-body visual and
   one nameplate icon; every signature proc has bespoke FX and a sound. If
   an effect cannot earn a channel, it is too small to exist. (FLOURISH
   CONTRACT precedent, techniques v2.)
3. **THE SET IS WORTH ONE EXTRA ITEM.** 2pc ~= 2-3% throughput-equivalent,
   4pc ~= 5-7%. A set bonus never outbids the stats of the slots it rides.
   The balance ledger test (Part 3) pins this the way epic.test.ts pins
   enchants.
4. **BEHAVIOR OVER NUMBERS.** Every 4pc bonus and every signature weapon
   proc is a mechanic (a state applied, a window opened, a tradeoff taken),
   never a bare percentage. Bare percentages live in 2pc lines and affixes.
5. **PROCS NEVER BEGET PROCS.** Already true by construction (proc damage
   never sets `opts.basic`); becomes written law. Chance-when-hurt keeps
   its ICD (enemy attack speed is not the player's to normalize). Whiff-0
   stays sacred.
6. **HIGHEST WINS, PER SOURCE.** Same-name amplifiers never stack; DoT
   states stack per-source so a second player is never worthless; the
   number of distinct amplifier layers a target can carry is capped and the
   cap is visible.
7. **THE CRAFT LANE KEEPS ITS EDGE.** Craft-only families (6 leather + 6
   cloth, CRAFT-LANE SYMMETRY law) get real set words too — the crafter's
   edge is control and availability; the loudest proc mechanics stay on
   dropped/heirloom chase sets. Acquisition routes move NOWHERE (loot audit
   2026-08-14 stands).
8. **NO BORROWED POWER.** Every new power lives on items and states the
   player owns and keeps. No seasonal meters, no expiring currencies.
9. **THE AFFIX INDEX IS UNTOUCHABLE.** Set words are a NEW channel beside
   affix pools. Editing pool entries/weights/order re-rolls every live
   instance (documented drift law, roll.ts:26) — this epic never touches a
   pool's composition.
10. **ONE SEAM.** Target-conditional damage resolves at exactly one function
    per direction (top of damageNpc; beside mitigate in damagePlayer). No
    call site ever pre-multiplies for a state.

## Part 2 — The six phases

### Phase 1 — THE TWO LANES (status coexistence rework)

**SHIPPED 2026-08-14. As-built:**

- Shared core (`sim/abilities.ts`): `StatusId` + `'sunder'`; `SPARKS` /
  `AFFLICTIONS` rosters + `isSpark`/`isAffliction`; `STATUS_BIT` u16 —
  **the low byte is the historic u8 layout unchanged forever**
  (test-pinned wire archaeology), sunder = bit 8, affliction stack
  nibble = bits 9-12 (`AFFLICTION_STACKS_SHIFT/MASK`,
  `afflictionStacksOf`); `AFFLICTION_SOURCE_CAP = 5`;
  `SUNDER_MAX_PCT = 20` (the Phase 2 seam's clamp, exported now).
- **THE RETIREMENT recorded in the table doc**: the 7 spark-affliction
  and affliction pairs (Immolate, Frostbite, Arc Surge, Caustic Blaze,
  Congeal, Nerve Jolt, Contagion) left `REACTION_TABLE`; Thermal
  Shock / Combust / Shatter survive. The `chain`/`spread` reaction
  effects and their server branches stay alive ON PURPOSE — the door
  for set words to re-open retired pairs as authored payoffs.
- Wire: snapshot `status` u8 -> u16 (record reshape), buffer estimate
  17 -> 18/entity, **protocol v29** with the judgment comment in
  constants.ts; roundtrip test walks the full u16.
- Server (`applyStatusToNpc`): three-lane door. Afflictions stack per
  source keyed on `(sourceEid, fromPet)` — a pet is its own hand; the
  same hand refreshes its own wound by max, never self-stacks; at the
  cap the new source FOLDS INTO THE WEAKEST entry by the max rules so
  no landed apply is eaten. Sunder = one entry, highest power wins,
  duration by max. Sparks keep the exact pre-lanes reaction path, but
  the detonation search and splice are spark-scoped: wounds and the
  mark ride through the flash. Both sparks are still consumed
  (pre-lanes law, re-pinned). Resist/weak answer every lane at the
  door, unchanged.
- **`applyStatusToPlayer` deliberately keeps the one-entry-per-id
  refresh-max shape**: five wolves are still one bleed. Player-side
  per-source stacking would raise damage TAKEN — priced by the
  ledger, not smuggled in with a refactor.
- `statusBits` packs the affliction count into the high nibble
  (clamped 15) — the Phase 5 nameplate reads stacks with no further
  protocol change.
- `tickStatuses` untouched: multiple same-id entries each tick their
  own DoT by construction of the existing loop; sunder is not a DoT
  and ticks nothing.
- Client: `statusAmbience` gains the sunder voice — dull stone-grey
  chips shaken loose, hard fall, NO glow (broken matter, not energy;
  the dead palette + fast fall keeps it apart from bleed's slow red
  drips). Anti-mush law restated in the fn doc.
- Content: `ladderModel.statusValue` prices sunder (control-weight
  scaled by amp percent over the flat-15 baseline) — found by the
  compiler via the exhaustive switch, exactly why the union grew
  rather than a parallel enum.
- Dev lever: `/status <id> [power] [durTicks]` lays a status on the
  nearest foe (or self) through the REAL apply doors, so resists,
  weaknesses, lanes, and reactions all answer honestly in a live
  session.
- Laws pinned in `server/src/game/statusLanes.test.ts` (11 tests) +
  reworked shared pins (lane partition, spark-only reactions, u16
  layout, nibble collision). Full suite 1585 green. ZERO tuning
  constants moved; solo damage shape identical (multi-source
  affliction credit is the sanctioned possibility change).

The keystone everything else reads. Split the five statuses into two lanes:

- **SPARKS** (`burn`, `chill`, `shock`): keep the reaction grammar among
  THEMSELVES (3 pairs survive: Steamveil, Thunderflash, Glassbreak names
  carry over). Sparks still detonate each other — elemental play keeps its
  shipped feel.
- **AFFLICTIONS** (`bleed`, `venom`): become persistent riders. They coexist
  with anything, never detonate and are never detonated, stack per-source
  in power up to an authored cap, tick as today. These are the states that
  gear reads. The 7 retired spark-affliction reaction pairs are the one
  real feel change (Part 4, question 1).
- **One new state: `sunder`** — the game's single amplifier mark ("takes
  +N% damage from everything", flat, highest-wins, never self-stacks,
  short). Applied only by deliberate sources (heavy finishers, some 4pc
  words, a few NPC arts against players). This is the FFXIV-lesson shape:
  rare, flat, singular.
- **Wire**: snapshot `status` u8 -> u16 (protocol bump), freeing bits for
  `sunder` + stack-count nibble for the own-target nameplate. Ambience mask
  extends; `statusBits` refactors.
- `applyStatusToNpc` rework: lane-aware apply; `applyStatusToPlayer` gains
  afflictions-coexist too (players still get no reactions).

### Phase 2 — THE READING EDGE (target-conditional grammar)

**SHIPPED 2026-08-14. As-built:**

- Shared pure core (`sim/abilities.ts`): `VsClause`, `sunderAmp(list)`
  (the clause-free amplifier, clamped to `SUNDER_MAX_PCT` at the
  read, whatever authored the mark), and `stateBucket(list, clauses)`
  — THE SECOND BUCKET: highest applicable clause per riding state,
  distinct states multiply, sunder multiplies in. Pure and pinned
  without a server.
- **THE ONE SEAM** lives at the top of `damageNpc`: every blow that
  reaches an NPC (basics, arts, projectiles, blasts, fields, procs,
  reaction bursts) pays the bucket there. Gear clauses come from
  `GearStats.vsState`; the striking clause rides `opts.vs`. Folded
  BEFORE `opts.status` lands (a blow never feeds on the state it
  carries), gated on `dmg > 0` (whiff-0 folds nothing, spends
  nothing), floor 1 after rounding. `viaPet` blows skip gear clauses
  (the pet's fang does not wear the keeper's armor). Mirror seam:
  `damagePlayer` folds `sunderAmp` right after `mitigate` (the crack
  is in the armor, so it amplifies what the armor failed to stop);
  `dotNpc` folds it too (the drip pays the mark). Gear vs clauses
  stay OFF DoT pulses until a tick-reading temper is authored.
- **THE CONSUME VERB**: `opts.vs.consume` spends every riding entry
  of the read state on a landed blow — the wound answers once,
  whoever opened it.
- Vocabulary shipped: `EnchantEffect` + `{kind:'vsState', status,
  pct}` (aggregate channel, HIGHEST WINS at `foldEffect` — same-state
  clauses never stack across pieces; quality scales pct; described as
  one sentence; priced 0.7/pct in the epic scorer — conditional under
  unconditional); `AbilityDef.vs {status, mult, consume?}` (rank
  steps inherit it free via `RankStep = Partial`); `EnchantTrigger` +
  `{on:'hitState', status, chance}` (strike channel; **listens on the
  HIT moment inside `procWakes`** — the cadence pattern — so no new
  ProcMoment; the state check is THE DOOR'S: `steelMoment` skips an
  unmarked body before arbitration, no roll spent, no rest banked);
  `StrikeDef.consumes {status, mult}` (captured into `pendingStrike`
  at press — the promise made is the promise kept; the guard sweep
  deliberately spends nothing; each struck body pays and spends its
  own).
- Threading: the six castAbility damage sites, `ProjectileComp.vs` +
  both landing sites, `PendingBlast.vs` + resolution, `ActiveField.vs`
  + pulse (a field's consume spends on the first pulse that reads
  it). NPC-cast abilities carry no `vs` and `damagePlayer` reads no
  clauses — vs is a player-side payoff this phase.
- Tooltip law honored where content will land: ability cards print
  the clause (`×1.5 vs Venom` / `spends Venom`); gear cards flow
  through `describeEffect`'s new sentence.
- ZERO authored content this phase: no ability, enchant, item, or
  moveset page carries a clause yet — the grammar goes live with
  Phase 3 words and Phase 4 tempers, so live damage is byte-identical
  today.
- Laws pinned in `server/src/game/readingEdge.test.ts` (10 seam
  tests) + shared `stateBucket` pins. Suite 1602 green.

The user's exact sentence becomes authorable data:

- **The seam**: `stateMult(targetStatuses, attacker)` folded once at the top
  of `damageNpc` and beside `mitigate` in `damagePlayer` (law 10). DoT
  ticks ride the same seam.
- **Vocabulary additions** (all in the shared/content layer, one interpreter
  serves players, NPCs, relics, sigils, secrets):
  - `EnchantEffect` gains `vsState { status, pct }` — gear that reads the
    body: "Venomed foes take half again from this edge."
  - `AbilityDef` gains `vs?: { status, mult, consume?: boolean }` —
    abilities with a payoff clause; `consume` spends the state for a
    bigger, louder answer (the missing consume verb).
  - `EnchantTrigger` gains `{ on: 'hitState', status, chance }` — procs
    that wake on striking a marked body (`procMismatch` validator extends
    to keep it honest).
  - `StrikeDef` gains `consumes?: { status, mult }` — finisher beats that
    spend an affliction. The finisher branch (gameServer ~15715) has the
    target in hand downstream; movesets finally read the world.
- **Tooltip law**: every vs/consume clause prints as one sentence on the
  card. No hidden math (GW2 lesson).
- Rank steps and secret-art rank IVs may upgrade `vs` clauses — Rank IV
  flourishes gain a synergy axis without new schema.

### Phase 3 — THE HOUSE WORD (set bonuses)

**SHIPPED 2026-08-14. As-built:**

- `EquipmentDef.set` / `GearInfo.set` — explicit field, never
  id-parsed. Stamps: 31 chase base consts carry `set:` inline
  (`chasePiece` copies it), the 15 themed makers wrap in
  `withSet(id, maker())` at the assembly, tidecaller's four waters
  share one set. **Early wardrobes deliberately unstamped** — this
  resolves the plan's craft-vs-early tension: identity starts where
  the chase starts, and the craft lane keeps its edge through the six
  craft-only THEMED families (wayfarer, drakescale, stagheart,
  hedgemage, cindersworn, starweaver). Wave one = 46 word-sets.
- `SET_WORDS` registry (`equipment/setWords.ts`): per family, one 2pc
  flat line + one 4pc behavioral word, cumulative. Effects reuse the
  enchant vocabulary; the fold lives at the end of
  `aggregateGearStats` (setCounts on the same five armor slots
  classCounts reads; `GearStats.setCounts` exposed for the card).
- **The wordOnHit lane**: a word's `onHitStatus` rides a dedicated
  `GearStats.wordOnHit` aggregate (the Envenom-stance pattern: every
  landed basic carries it, whichever blade landed), applied at the
  buff-stance site in damageNpc. Kept OFF `foldEffect` on purpose — a
  weapon's own native onHitStatus rides the strike channel, and
  folding both would double-apply.
- Word laws, all pinned in `setWords.test.ts` (8 tests): EXACT
  two-way coverage (stamped ⇔ spoken, 46 exactly, early wordless);
  one 2pc + one 4pc in order; BEHAVIOR OVER NUMBERS both ways (4pc
  must behave, 2pc must NOT); words never touch the strike channel
  (no lifesteal/backstab kinds, body triggers only — a set is worn,
  not swung; `procMismatch` walked; targeted actions need targeted
  triggers — the validator caught starweaver's bolt-on-cast at
  authoring, exactly as designed); `word_` proc-id prefix, globally
  unique vs the enchant roster (ONE ID ONE TIMER is global); flat
  budget caps; live fold walk on real ids (moonbell thresholds,
  mixed houses speak neither, wolfstalker wordOnHit, barrowking proc).
- Notable words: **barrowking 4pc is sunder's debut source** (block →
  sunder 15% for 3s); voidwhisper 4pc lights up the reserved
  `cleanse` action; moonbell/flamewrought/cindersworn/dreadforge/
  nightveil/wyrmsteel carry the first vsState clauses; adderfang/
  wolfstalker/drakescale/cindershade the first word afflictions.
- Item card: the House block — `House · N of 5 worn` + each word's
  sentence lit (full) or waiting (dimmed), the slotGate reading.
- The recompute path needed NO server change (words fold inside
  `aggregateGearStats`, which `recomputeGear` already calls); the
  only server line is the wordOnHit apply beside the stance loop.
- Deferred within phase: no bespoke FX faces for word procs yet
  (they ride the generic proc grammar; the FLOURISH pass lands with
  Phase 5), and the ledger prices procs behaviorally rather than
  numerically (plan Part 3 budgets stand as the authoring guide).

- `EquipmentDef.set?: string` survives compile into `GearInfo`; colorway
  lots share the family's set id. Explicit field, never name-parsing.
- `SET_WORDS` registry in content: per set id, thresholds
  `{ pieces: 2 | 4, name, desc, effects: EnchantEffect[] }`. Cumulative
  (2pc stays live at 4). Effects reuse the ENTIRE existing vocabulary —
  including procs (ONE ID law already dedupes a matched set) and Phase 2's
  `vsState`. Zero new effect plumbing: `setCounts` lands beside
  `classCounts` in `aggregateGearStats` and folds through `foldEffect` at
  the same recompute site.
- **Structure**: sets are 5 pieces; words at 2 and 4; the free 5th slot is
  design (mix-and-match, a second set's 2pc can ride).
- **Wave 1 coverage**: the 31 named chase sets (behavioral 4pc words — the
  louder procs and vs-clauses), the 15 themed mid sets (modest words), and
  the 12 craft-only families (law 7: strong flat 2pc lines + quieter
  utility 4pc). Early-game lots get NO words (identity starts where the
  chase starts, and 60 word-sets would drown the ledger).
- Item card grows a set block: pieces worn, each word lit/unlit (slotGate
  pattern), the sentence printed.
- Examples of the register (names illustrative): Barrowking 4pc "your
  shield block sunders for 3s"; Adderfang 4pc "your arrows afflict venom,
  and your venom ticks can crit"; Moonbell 4pc "casting a chilled foe's
  reaction refunds half the cooldown"; Dharok-shaped risk set on fellbone
  "below half health, your edge gains up to +30%".

### Phase 4 — THE WEAPON'S TEMPER (native weapon identity)

**SHIPPED 2026-08-14. As-built:**

- `equipment/tempers.ts` = the registry: 33 authored tempers (10
  masterwork swords + 9 daggers + 14 regalia), merged into each
  weapon's native `effects` at compile (`temperFor` in compile.ts) —
  one authored page, no scattered literals. `borrowed_time` and
  `wakestone` keep their pre-buildcraft natives and count as
  tempered (test-pinned). Ten Crowns untouched (already tempered by
  their own epic).
- Every temper is ONE effect and fits the blade's fx word: ambient
  appliers (lamplight burn, reefwrack chill, larkspur venom...),
  rhythm answers (chainbreaker's fifth blow SUNDERS — the second
  sunder source; vesper's eighth toll; hollowchoir's ninth), crit
  payoffs (riven crit-sunders, silverthread pulls a bleed), guard
  answers (silver_line, mirrormere, merelight), kill riders
  (knellwood, lastsheaf), and **five hitState signatures — the first
  authored readers of the Phase 2 trigger**: northlight (frost nova
  vs chilled), lodestone (storm bolt vs shocked), mothlight (drinks
  at the venomed wound), duskcap (spores chain off the poisoned),
  spindrift (chain vs chilled). Two vsState tempers: eclipse (vs
  bleed) and ashgarden (vs burn).
- Loudness law pinned: ambient onHitStatus ≤20% chance / power ≤3;
  hitState signatures rest ≥150 ticks; temper vs clauses ≤25%.
  `temper_` id prefix globally unique against enchants AND words
  (ONE ID ONE TIMER is one law across all three systems).
- **The elementDmg decision recorded**: it stays the caster lane's
  stat. Melee tempers speak through statuses, procs, and clauses —
  wiring elements into blades would add fold sites for no reading
  the statuses don't already give.
- `tempers.test.ts` (5 laws): full-roster tempered, registry tempers
  the honor roll alone, proc validity + global id uniqueness,
  loudness honesty, strike-channel resolution receipts.

- The 35 masterworks/regalia (+ select chase bows) each gain ONE native
  effect through the already-live `effects` channel — mostly `kind:'proc'`
  (zero exist today) or a `vsState` clause that completes a set's combo.
  Two loudness tiers: minor temper (state appliers, synergy triggers,
  short ICD) and signature temper (1-3 wakes per fight, long ICD, bespoke
  FX + sound; the KINGSBANE precedent — one weapon fighting its own fight
  — extended to the whole honor roll).
- Rate law: strike procs already roll per landed swing (never per target);
  chance-when-hurt keeps ICDs; printed expected-rate on the card.
- Dead-channel cleanup rides along: melee/archery masterworks may carry
  `element` so `elementDmg` stops being a 3-of-4-styles dead stat, or the
  stat is retired from non-caster affix pools (decision at implementation);
  `EquipmentDef.passive` either gets its first armor authorings via set
  words or is folded away.

### Phase 5 — THE VISIBLE FIGHT (legibility layer)

**SHIPPED 2026-08-14. As-built:**

- **The invisible-buff era ends.** `sendBuffs` now carries NAMED
  combat buffs under the `'combat'` channel (additive wire fact,
  recorded on BuffInfo — no protocol bump): proc wards and surges
  wear their working's name, stance riders wear their art's name,
  Battle Rush and Second Wind speak theirs. Chip row caps at 6 —
  consumables always, combat fills the rest longest-first. Unnamed
  micro-buffs (sprint, dodge haste) and the momentum channel stay
  OFF the HUD by design (the knife's hunger reads in the feet — the
  combat-v2 decision stands). Send sites: ward/surge pushes in
  runProc, the ability self-rider, the two passives, plus the expiry
  sweep now clears named chips too.
- Combat chips render as lettered coins (initials glyph, gold ring,
  the charge chip's sibling) — no item icon to fake.
- **States on every nameplate**: `drawMiniHp` grew the state blocks —
  one brutalist square per riding state under the gauge,
  build-relevant first (sunder, then wounds, then sparks), capped at
  four, with the affliction stack count (`xN`, the Phase 1 nibble
  finally read) beside them. One implementation serves humanoids,
  beasts, and pets (the snapshot status threads through all five
  call sites).
- Sunder's ambience branch shipped in Phase 1; the anti-mush law
  holds (six states, six places, six rhythms).
- **Recorded debts (deliberate)**: bespoke SIGNATURES faces for word
  and temper procs ride the generic action-shaped proc grammar for
  now (the same read the 33 enchant workings shipped with) — a
  FLOURISH pass is future polish, not a blocker; own-body state
  readout stays ambience + chips (a self nameplate would double the
  HUD's voice).

- **Buff registry**: `PlayerBuff` gains `id`; `sendBuffs` carries combat
  buffs (wards, surges, momentum, set states) with a HUD cap of ~6 chips,
  own-effects first. The invisible-buff era ends.
- **States on the body**: per-state tint/particle grammar extending
  `statusAmbience` (venom drip, bleed bead, sunder cracks); own target's
  nameplate shows state icons + affliction stack count (the u16 nibble);
  cap 4 icons, yours highlighted (ESO lesson).
- Reaction/proc/word FX ride the existing `S2CFx` channels; every 4pc word
  and signature temper lands a SIGNATURES face (FLOURISH CONTRACT).
- VOICE.md governs every word name, desc, and card sentence. Dash ban.
  No occult vocabulary anywhere (content-boundaries law); sunder is
  engineering, afflictions are venom and steel, never curses.

### Phase 6 — THE MARKED WORLD (contextual meta + the ledger)

**SHIPPED 2026-08-14. As-built — THE EPIC IS COMPLETE.**

- `npcLanes.ts` = the temperament registry: `DamageLane`
  (onehand/twohand/archery/arx), categorical game-wide multipliers
  (`LANE_WEAK_MULT` 1.25 / `LANE_RESIST_MULT` 0.8 — a turned lane
  still hurts, a bitten lane never doubles), `laneOf(style)` folding
  dualwield and the knife arts into blade work. Merged onto `NpcDef`
  at the NPCS map build (`lanes?` field, def literals stay about the
  body).
- Wave-one temperaments, bodies that argue for them and no further:
  BONES (5 skeletons — arrows turned, crush bites), STONE (4 golems —
  the edge turned, the working bites), FORMLESS (2 slimes — shafts
  swallowed, the working bites), CARAPACE (beetle + mudcrab — edge
  turned, crush bites). **The flesh stays fair** — wolves, brigands,
  goblins keep no lanes (test-pinned).
- The fold lives at THE ONE SEAM (damageNpc, after the state bucket),
  and **the world teaches it**: 'Turned' / 'Bites deep' floats on the
  lane hit, throttled per body (8s), so the lesson costs no codex
  dive. DoT drips stay unlaned (the wound is already inside —
  mitigation's own law).
- **Element lanes = FUTURE DOOR** (the seam knows only the style;
  threading the hit's school waits for a family that needs it).
- **THE LEDGER** (`ledger.test.ts`, 5 cross-system laws): lane merge
  liveness + no self-contradiction + fairness pins; multiplier
  bounds; the vs-state ceiling across ALL THREE authoring systems
  (words, tempers, enchants — wave one ≤30); every authored sunder
  source under `SUNDER_MAX_PCT`.

---

## THE GOALS AUDIT (epic close, 2026-08-14)

The brief, answered line by line: set bonuses exist (46 families,
2pc/4pc, behavioral by law) — was ZERO; proc variety: 33 weapon
tempers + 92 word lines join the 34 enchant workings, all under ONE
ID ONE TIMER; "poisoned targets take 1.5x from these abilities" is
now authorable data in three systems and live in six word clauses and
two tempers; stacking buffs/debuffs: afflictions stack per source,
buffs chip the HUD, states read on every nameplate; strategic depth:
lane temperaments make best-gear a per-target question. Balance: zero
tuning constants moved in six phases; solo damage identical except
where a build ASSEMBLES a payoff. Deliberate opens, recorded where
they lie: player-side affliction stacking (ledger question), buildup
meters (pilot on sunder someday), chooseable craft 2pc, bespoke
SIGNATURES faces for word/temper procs, element lanes, DoT-reading
tempers, ranged-lane vs for NPC casts.

- `NpcDef.resist`/`weak` (statuses only today) extend to typed DAMAGE
  lanes: per-family style/element weaknesses (`weakTo`/`resists` on
  damage), folded at the same seam, surfaced in bestiary/codex copy so
  players can PLAN a patrol ("the fen prefers fire; bring the cinder
  edge"). This is the anti-convergence engine: best-build becomes
  per-target, which multiplies viable builds with zero balance passes.
- **THE LEDGER**: a balance test in the epic.test.ts mold scores every set
  word, temper, and vs-clause in throughput-equivalent terms (uptime x
  magnitude, one currency), pins law 3's ceilings, asserts no set exceeds
  one-extra-item power, no amplifier stacks, and the two-bucket law holds
  structurally (a grep-proof that no second multiplicative fold exists).

## Part 3 — The power ledger (starting numbers, tune at ship)

| Channel | Budget (throughput-equivalent) |
|---|---|
| 2pc word | 2-3%, flat stat line |
| 4pc word | 5-7%, behavioral |
| Full set (2+4) | ~one extra item; hard ceiling 12% |
| Minor temper | 2-3% |
| Signature temper | 3-5% (uptime x magnitude) |
| vs-state payoff | up to 50% conditional, highest-wins, one per state |
| sunder mark | flat 15-20%, short, never self-stacks |

Conditional payoffs price high on purpose: the player pays in build
assembly (an applier + a reader across different slots) and the two-bucket
law caps compounding. TTK brackets remain the merge gate; Phase 1 alone
must move ZERO numbers (coexistence changes possibility, not damage).

## Part 4 — Open questions (answer at green-light)

1. **The 7 retired spark-affliction reactions.** Clean retire (afflictions
   ride, sparks react — recommended, one sentence of rules), or keep them
   reachable behind explicit `consume` verbs only ("Ignition arts detonate
   bleed")? Retire-then-selectively-restore via set words is the reversible
   path.
2. **Buildup meters vs chance application.** The research strongly favors
   Elden-Ring-style visible buildup (deterministic, earned, telegraphed)
   over per-hit RNG — but it is a large rework of every applier. Proposal:
   ship chance-based (already the house grammar), pilot a buildup bar on
   `sunder` only, revisit.
3. **Chooseable craft words.** Should the crafter PICK the 2pc stat line at
   the bench (the ESO crafted-control edge), or are fixed words enough for
   wave 1? (Fixed recommended for v1; chooseable is a clean follow-on.)
4. **Resource economy.** Combo points/charges ("spend 3 marks") stay OUT of
   scope — cooldowns + states + meters are the whole economy. Confirm.
5. **Wave-1 breadth.** 58 word-sets (31 chase + 15 themed + 12 craft) is a
   big authoring surface. Ship whole, or chase-sets-first?

---

Related law files this plan defers to: enchanting-v2-plan.md (proc engine),
combat-v2-plan.md (moveset book, finisher branch), techniques-v2-plan.md
(Callings/FLOURISH), loot-audit 2026-08-14 (acquisition routes frozen),
VOICE.md, content boundaries.

---

# CAMPAIGN TWO — THE FIGHT SHOWS ITS FACE (the visible buildcraft)

*Drafted 2026-08-14, on the user's directive: the new bonuses, buffs, and
states must be VISIBLE with the highest level of intent — clear indicators
where buffs and debuffs are applied, particle language for poisons and
burns, and set bonuses presented in the inventory as architecture, not a
bolted-on add-on. Loose ends closed at a foundational level.*

## Part 0 — The audit (receipts verified 2026-08-14, three sweeps)

What THE THINKING BLADE built is mechanically complete and nearly MUTE on
screen:

- **No application moment exists anywhere.** Statuses have no landing
  announcement: no edge detection in the client (interpolation carries
  `status` as a plain field, no prev-bits memory), no server fx on apply
  (applyStatusToNpc broadcasts only Resist and detonations;
  applyStatusToPlayer broadcasts nothing). A poison lands and the world
  says nothing; the ambience simply fades in on the next frame.
- **The ambience is good bones** (renderer.ts statusAmbience: every state
  owns a distinct PLACE and RHYTHM — burn rises, chill falls from high,
  shock jitters fast, bleed drips, venom blebs rise, sunder sheds grey
  chips from the shoulders) but it predates the matter library, spawns
  single flat squares, and is the ONLY ongoing signal a DoT is live.
- **DoT ticks are anonymous.** dotNpc/damagePlayer tick damage rides
  plain broadcastHit; a bleed tick and a sword hit print identical white
  numbers. The hurt vignette is red regardless of cause.
- **A full-health body shows nothing.** Every drawMiniHp call site gates
  on hpPct < 255, so a freshly-marked, unhurt enemy carries no state
  blocks at all.
- **The player cannot see their own wounds.** ownStatus reaches only the
  body ambience and three stealth getters. The affliction stack nibble
  the wire carries for exactly this purpose renders on every body EXCEPT
  the player's own HUD. No self-status element exists; own HP is a bare
  canvas bar at h-96.
- **Combat buff chips are outside the material system**: lettered coins
  styled by inline boxShadow/cssText in hotbar.ts (no CSS rule, no
  tokens), tooltip = bare name (the wire carries no description),
  onBuffs fires with zero subscribers, and #buff-tray/#companion-plaque
  bottom offsets are hand-tuned literals that bypass the LANES tokens.
- **The House is three lines of prose in one tooltip branch**
  (panels.ts renderCard, inside `if (rolled)`): a generic stat row + two
  opacity-dimmed text lines. The client recomputes the worn count by
  hand over a hardcoded slot list (drift risk: it ignores the
  armorClass guard the authoritative counter applies); `GearStats.
  setCounts` is already computed by renderGearStrip's aggregate call and
  THROWN AWAY. No set display-name registry exists (ids are
  capitalize()d). The worn manifest, paper-doll anatomy, gear strip,
  pack grid, compare line, and vault are all set-blind. The compare line
  will happily recommend a swap that silently breaks a live 4pc word.
- **Free ground everywhere**: `itemDef(id).gear.set` is in the client
  bundle at zero wire cost for every pack/worn/vault/loot item; the kit
  already offers ringGauge, socket, tabRail, ledger, plate; the harm
  color ramp (--ember-deep/--red) has no HUD consumer yet.

## Part 1 — The laws of this campaign

1. **ONE GRAMMAR, EVERY SCALE.** A state looks the same on a nameplate,
   on the player's own HUD, and in a tooltip: same hex, same priority
   order (sunder, bleed, venom, burn, chill, shock), same xN stack
   voice. The player learns the language once.
2. **THE LANDING SPEAKS, THE RIDE HUMS.** Application moment = one
   short library-voiced burst (the announcement); ambience = the quiet
   ongoing hum. Never two voices at once louder than a strike.
3. **ONE-VOICE HOLDS.** New status matter composes render/matter/
   deployments. The per-body ambience keeps its frameDt-gated bespoke
   voice BY DOCTRINE (bodies are unbounded, emitter records are a
   scarce pooled resource; the GATE-RETIRES law binds signatures, not
   body-worn instruments) — recorded in the file header.
4. **BROKEN MATTER IS NEVER ENERGY.** Bleed and sunder keep zero glow,
   in ambience and in landing. Blood spatters; stone cracks; neither
   shines.
5. **ONE TRUTH FOR THE COUNT.** aggregateGearStats is the ONLY worn-set
   counter. The client caches one GearStats per equipment push and every
   surface reads it. The hand-rolled card counter dies.
6. **THE HOUSE IS A PLACE, NOT A FOOTNOTE.** One court builder renders a
   House everywhere it appears (stand, item card, bench); pieces declare
   membership on their sockets; the pack marks what advances a worn
   house; the compare line refuses to be set-blind.
7. **TOKENS OR DEATH.** Every new chip, ring, and band rides tokens.ts +
   stylesheet classes. The inline-styled combat coin is paid off, not
   extended. New bottom-lane offsets join LANES.
8. **ADDITIVE WIRE ONLY.** Any wire help (tick attribution, buff
   descriptions) is optional fields on existing JSON messages — no
   protocol bump, old clients unharmed.
9. **HONEST COPY, VOICE-TRUE.** No dashes, no mechanics-speak prefixes
   like "(2)"; thresholds are shown as pips and plain words. Set word
   descs already read clean; the frames around them must too.

## Part 2 — The three phases

### Phase V1 — THE LANDING WORD (status VFX mastery)

The world announces every state change, speaking the matter library.

- **Edge detection, client-side** (new render/statusFx.ts): a per-eid
  prev-bits map swept each frame from the same collect pass that feeds
  statusAmbience (remotes + own body). Rising edge per status fires its
  landing; a rising affliction stack nibble fires the smaller re-apply
  note; falling edges stay silent (consume detonations already have the
  reaction voice from the server). Map entries die with their eids.
- **The landing vocabulary** (library deployments, small scale, chest
  height): burn = fire.burst; chill = frost.bloom; shock =
  storm.crackle; bleed = blood.spatter; venom = venom.burst; sunder =
  dust.slam + a beat of hero stone chips (law 4: no glow for bleed or
  sunder). Stack re-apply notes: venom.bead / blood.drip single.
- **Ambience texture pass**: two-size grain populations; bleed and venom
  adopt the v5 drop silhouette (falling drips, rising blebs read as
  liquid); rhythm law and palettes unchanged.
- **DoT ticks sign their work**: broadcastHit gains optional
  `via: StatusId` from dotNpc/tickStatuses paths; the client tints tick
  floats per status (burn #ff8a3c, bleed #c4372a, venom #a0c050) at a
  quieter sizeMul than strikes. Own-body DoT ticks tint the hurt
  vignette toward the status color (a green edge says POISON without a
  word).
- **The full-health body confesses**: drawMiniHp call sites gate on
  `hpPct < 255 || (status & STATUS_AMBIENCE_MASK)`; at full health the
  gauge is skipped and only the state block row draws.
- Tests: statusFx edge logic (pure), via-field pass-through, gate law.

### Phase V2 — THE BODY KNOWS ITS WOUNDS (self-status + buff HUD refit)

- **THE WOUND ROW**: the player's own states drawn on canvas directly
  beneath the own HP bar — the nameplate grammar scaled up (state
  blocks in the one priority order, xN stack text), drawn from
  ownStatus every frame beside drawHpBar. No timers invented: the wire
  carries bits and stacks, and that is what is shown.
- **The combat coin pays its debt**: .buff-chip.combat (+ glyph span)
  moves into the stylesheet on tokens; the lettered-coin idiom stays.
- **Chips learn to speak**: BuffInfo gains optional `desc` composed
  server-side from the buff's real fields ("+15% damage for a breath");
  titles become name + desc; chips gain data-tipname so pad focus gets
  the same words.
- **Lanes take the strays**: #buff-tray and #companion-plaque offsets
  join the LANES tokens.
- Tests: sendBuffs desc composition, chip key stability.

### Phase V3 — THE HOUSE COURT (set bonuses as architecture)

- **ONE TRUTH**: panels caches GearStats per equipment push; the card's
  hand counter dies; every surface below reads the cache.
- **SET_NAMES**: authored display names for all 46 families in
  setWords.ts (compound ids get their spaces back), pinned by a
  coverage test beside the words pin.
- **houseCourt(setId, count)** — ONE builder renders a House: name in
  brass, ring gauge N of 5 around the count, the two words as rows with
  lit state (lit = gold ink + filled pip; unlit = ghost ink + "at two
  pieces" / "at four pieces" in plain words). Deployed:
  - **The stand**: a House band in the character room for every worn
    family (0-2 in practice; empty = silent, no furniture for nothing).
  - **The item card**: the court replaces the bolted prose block,
    whenever the def carries a set (no longer gated on rolled).
  - **The bench**: same DOM re-parented — free by construction.
- **The anatomy speaks**: equipCell stamps data-set; sockets of a
  family with 2+ worn share a corner pip tint (corner-truth compliant).
- **The pack knows the house**: an applyHouseMarks pass (the
  applyReqGate precedent) stamps a small house pip on pack cells whose
  set matches a worn family with pieces still missing.
- **The compare line stops lying**: swapping a piece that breaks a live
  word says "breaks <word>" in ember; completing a threshold says
  "wakes <word>" in gold.
- Tests: SET_NAMES coverage, court threshold logic, compare set-awareness.

### Phase V4 — THE LOOSE ENDS (foundational close)

Vault sockets take the same house marks via the getEquipment thunk;
reduced-motion and pad-nav paths verified on every new surface; ?fx and
dress-char screenshot audits; full suites; as-builts; memory.

## Part 3 — What this campaign does NOT do

No new gameplay numbers move. No protocol bump. No buff-duration wire for
statuses (bits and stacks only — inventing timers the wire does not carry
would lie). Momentum and micro-buffs stay off the HUD by Phase 5's
standing design. The armory/vault set SORT and a full "collection browser"
for unworn houses are recorded as deliberate follow-on doors, not scope.

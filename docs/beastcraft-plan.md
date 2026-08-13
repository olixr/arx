# Beastcraft v2 — THE WILD AT HEEL

*Design review 2026-07-31. Status: PROPOSED, awaiting green light. Phases
land in order; each phase is a commit with its laws proven by tests and
live receipts before the next begins.*

Beastcraft was named for this day. The skill shipped with milk pails and
egg clutches and a doc comment in `interactNpc` that reads *"milk the
cow, one day pet the wolf."* This epic is that day: at beastcraft 10 a
settler can gentle a wild beast, name it, and walk the Dawnlands with it
at heel. The companion fights beside its keeper, levels through its own
deeds, falls without ever being lost, and rests in a stall when another
friend takes its place.

Two players are served, and the plan refuses to shortchange either:

- **The hunter.** Arx archery has no answer to a mob closing the gap.
  A companion that takes the beast's eye while arrows fly is the missing
  half of the ranged kit — the oldest partnership in the genre.
- **The homesteader.** The player who never leaves the farmstead gets a
  yard with a pen in it, animals that know their name, lures worth
  cooking, and a skill ladder that pays for tending rather than killing.

**This document is also a constitutional matter.** `docs/mounts-plan.md`
Part 4 closed with: *"The day a mount needs to exist without its rider
is the day this law is re-argued, in a new design review, not in a
patch."* This is that design review — argued for companions and ONLY
companions. The verdict it reaches: mounts remain appearance, forever;
the companion is the game's first and only player-owned second entity,
and every law below exists to keep that body honest.

---

## Part 1 — Audit: what exists today (verified in code, 2026-07-31)

### Beastcraft is a two-source skill waiting for its third act

- XP sources: milking (`tickMilk`, gameServer.ts:9151-9195, 8xp/180s)
  and egg pickup (`xpOnPickup`, tickNpcs :15795-15805, 4xp). Both grant
  at the one `grantXp` door (:5476).
- The milk flow is a taming ceremony in miniature: range gate, channel
  action (`kind:'milk'`, 60 ticks), the animal planted via
  `holdUntilTick`, `PoseState.Milk = 15`, perks consulted at completion.
- Callings shipped produce-flavored (`gentle_hand` 20,
  `drovers_bond` 60). The skill card still reads "Trophies worked from
  the hunt" (panels.ts:138) — wrong since the Homestead update; this
  epic fixes the line.
- `docs/techniques-v2-plan.md:166` already sketched "livestock follow
  +1 tile" as beastcraft's second beat. The instinct was always heel.

### The bestiary already contains the whole roster

Every beast the fantasy needs is shipped, leveled, and painted: giant
rat (L2), giant beetle (L6), mudcrab (L2), boar (L7), wolf (L12), black
bear (L16, pounce + bleed), great owl (L16, pounce, parliament pack),
giant adder (L9, venom), worg (L14, chill bite). Each has a `BeastSpec`
body with true leg IK (`BEAST_SPECS`, rig.ts:6165-6562), a bespoke look
painter, ragdoll identity, foot-plant dust and audio. `beastSpec()`
falls back gracefully for anything new. **Zero new bodies are needed to
ship this epic.**

### Combat: one rail exists, two are missing

- **THE THREAT LAW is a damage pipeline, not a threat table.** There is
  no aggro accumulator anywhere. Targeting is THE ONE INTEREST: a
  single `targetEid` slot, newest strongest stimulus wins, and
  `npcAggro` (:15297) is the only door into 'chase'.
- **The tanking gift, already shipped:** damage-forced aggro fires only
  when `npcAtPeace` (:13506). A mob already fighting one body does NOT
  switch to whoever shoots it. If a companion holds the slot, the
  hunter's arrows never steal it. The hardest law of pet tanking is
  already on the books.
- **The taunt vocabulary exists:** the decoy force-switches nearby mobs
  on spawn (:12172), `tauntRadius` abilities force-switch on cast
  (:12192). A companion pulling a mob's eye extends a shipped idiom.
- **Missing rail one:** mobs cannot target or strike anything but
  players and decoys (`npcTargetPos` :15737, `npcStrike` :15753,
  `blastPlayers` :12267).
- **Missing rail two:** nothing but a player has ever swung at a mob.
  `damageNpc` already no-ops XP/procs/lifesteal cleanly for non-player
  attackers — the sink is safe, the credit threading is absent.

### The ownership precedents

- `SummonComp` (:814): owner-bound, ephemeral, tick-driven — the shape
  of a body that serves a player, at prop fidelity.
- Mounts: character unlock in DB rows (`character_mounts`, migration
  v21), `chosen` flag, signature-gated mirror (`sendRide` :3766),
  predictor mirror, `prove:mounts` receipts. The persistence and wire
  template for pets, row for row.
- `GrowthRow.owner` and the claim ring: the world already remembers
  which living things belong to whom.
- The actor layer's own header (actors/types.ts:4) says the layer holds
  "the people (and befriended beasts) of the world."

### Capacity checks

- Protocol sits at v26; this epic takes 27. A companion is one ordinary
  17-byte snapshot row + one `EntityMeta` (which already carries
  `name`, `level`, `ownerEid`) inside the interest set. No new lane.
- `SMOOTH_MAX_SPEED = 12` t/s is the netcode ceiling for any moving
  body; every follow speed below is chosen under it, mounts-law style.
- DB migration current: v21. Save law: crash-critical mutations write
  fire-and-forget at their site; trickles ride the savePlayer cadence.
- Stations/storage: the bank-chest pattern (tile gate + Vault panel +
  per-character rows) is the stable's whole template.

---

## Part 2 — The laws

### THE SECOND BODY IS EARNED (the foundation law)

A companion is a **true entity**: its own eid, its own `NpcComp` body on
the shipped AI/nav/snapshot rails, plus a `PetComp` naming its keeper.
It is NOT a stance, NOT an appearance field, NOT a prop. In exchange
for that honesty, the body accepts hard commandments:

- **One at heel, ever.** A character owns up to three companions; at
  most one walks the world. There is no army, and there never will be.
- **It exists only while its keeper does.** The pet spawns when the
  owner enters the world with it at heel, despawns with the owner's
  despawn, and never persists as a world entity. The DB row is the
  animal; the entity is its visit. No orphaned bodies, ever.
- **Mounts are untouched.** The saddle stays appearance. Nothing in
  this epic loosens THE SADDLE IS A STANCE — the two systems share no
  code path and no law.

### THE GENTLING IS EARNED, NEVER ROLLED (taming law)

Taming is deterministic. No dice, no pity meters, no player-state odds
(the flood-law's spirit applied to hearts): if you did the work, the
beast is yours, every time, for everyone.

The work, in order, all server-checked:

1. **Skill**: beastcraft ≥ the species' rung (THE LADDER OF TRUST).
2. **The beast is worn down**: hp ≤ 35% — the exact craven-break
   threshold. The moment a wild thing's nerve breaks is the moment a
   gentle hand can reach it. One constant, shared with the craven law.
3. **The right lure in the pack**: each species names its lure item
   (kitchen goods — the farmer and cook sell to the hunter).
4. **The gentling channel**: an 80-tick kneel (the milk grammar:
   `holdUntilTick` plants the beast, `PoseState.Milk` kneels the
   keeper, range re-checked per tick). Any damage to keeper or beast
   breaks it; the lure is only consumed on completion.
5. **Stalls have room**: fewer than three companions owned.

Refusals speak, in VOICE (no dashes): "It has too much fight left in
it." / "It wants something from your pack first." / "Your stalls are
full. Three is a household."

On completion: the naming moment (2-16 chars, sanitized server-side),
the beast's wild body despawns from its spawn table exactly as a kill
would (respawn clock runs; the wild is not diminished), the
`character_pets` row is born, and a ceremony line lands in chat. Big
beastcraft XP — the tame is the skill's level-up spine.

### THE LADDER OF TRUST (roster law)

First-pass rungs (Part 5 holds the tuning dials):

| BC | species | wild lvl | lure (bind to shipped items) | the kit at heel |
|----|---------------|----|------------------------|--------------------------------------|
| 10 | giant_beetle | 6 | forage sweets (berries) | THE SHELL: high armor, brace taunt — the first tank |
| 10 | giant_rat | 2 | kitchen scraps (egg) | FILTH NIP: venom bite — the first fang |
| 15 | mudcrab | 2 | fish scraps | THE GRIP: pinch that chills the mark in place |
| 15 | boar | 7 | roots (carrot) | GORE: charge with knockback |
| 20 | wolf | 12 | raw cut | WORRY THE WOUND: bleed, fast lope |
| 25 | bear | 16 | raw cut / honey | THE CHARGE: pounce opener, maul bleed, the big wall |
| 30 | great_owl | 16 | fresh fish | THE SWOOP: pounce + hushing wingbeat (chill) |
| 35 | giant_adder | 9 | an egg (nest-raider truth) | DEEP VENOM: the poisoner's pick |
| 45 | worg | 14 | raw cut, and nerve | THE WAR-HOUND TURNED: chill bite, capstone tank-fang |

Kits are the species' shipped teeth re-aimed: bear already pounces and
bleeds, owl already pounces, adder already envenoms. Phase 5 shapes
them; Phase 2 ships plain bites.

**Never tamable, by law:** champions and matriarchs (dire wolf, elder
great owl, every `*_champion`, the digmaster), all humanoids, the risen
dead, slimes (a thing that splits in two is not one friend), livestock
(the cow already has a place in your life), and stag/hind (prey keeps
its feet; the wild keeps its crowns). `TameDef` existing at all is the
whitelist — there is no "tamable" flag on NpcDef to leak.

### ONE PIPELINE, WHIFF-0 SACRED (pet combat law)

Every companion blow runs the shared pipeline in `shared/sim/damage.ts`:
species die → `powerMult(petLevel, NPC_POWER_PER_LEVEL)` → uniform
0..maxHit roll → the target's mitigation. A rolled 0 is a whiff for a
pet exactly as for everyone: no damage, no status, no XP, no harry. The
dying-body guard applies. No new damage math is invented anywhere in
this epic.

### THE QUIET SHADOW (perception law)

Perception stays player-only. Mobs never *notice* a companion — no
sight-cone entries, no alert meter feed, no aggro scans against it. A
pet enters a fight through exactly two doors: it strikes something, or
its harry pulls an eye. Consequences that fall out for free and are
test-pinned: a sneaking keeper's pet blows no cover; a pet at heel
never body-pulls a camp; the perception scan's cost does not grow.

### THE FIRST EYE HOLDS, THE HARRY TAKES IT (tanking law)

- The shipped `npcAtPeace` gate is the keel: a mob fighting the pet
  ignores the keeper's arrows; a mob fighting the keeper ignores the
  pet's bites — until the harry.
- **The harry**: when its keeper holds a mob's eye, the companion's
  next landed blow force-switches that mob onto the pet (the decoy's
  lesson through `npcAggro` force). Per-mob cooldown
  `PET_HARRY_COOLDOWN_TICKS = 200` — a flat dial, never scaled by
  player state. The rhythm: the beast breaks for the archer, the
  companion cuts it off, the arrows keep flying.
- Commands stay whistle-simple, per ONE KEYMAP: one action
  (`companion`, kb bound to a verified-free key at build, pad unbound —
  the mount precedent; pads use the stable row). Press toggles heel ↔
  stay. There is no pet ability bar. The companion defends its keeper
  (anything that wounds the keeper, or that the keeper wounds, is its
  business) and otherwise keeps its feet out of your line.

### A COMPANION'S DEED IS ITS KEEPER'S (credit law)

- Kills the pet lands credit the keeper: loot rolls owner-locked to the
  keeper, quest wounders and kill credit thread the keeper's id,
  faction deeds pay the keeper's ledger.
- XP: the pet's landed blows pay the pet's own ladder, plus a
  beastcraft trickle to the keeper. **Beastcraft never joins
  `COMBAT_SCHOOL_IDS`** — no half-echo into combat from a pet's teeth,
  test-pinned, or the 24th skill trains itself while you fish.
- **The hand's magic stays in the hand:** no owner enchant procs, no
  lifesteal, no on-hit stacks from pet blows (PROCS ROUTE BY TRIGGER,
  and a pet's bite is not the keeper's trigger). `damageNpc` already
  no-ops these for non-player attackers; tests keep it true.

### THE LEASH ON THE LADDER (pet growth law)

- A pet's level starts at its species' wild level and climbs by its own
  deeds on the shipped `XP_TABLE`, capped at
  `min(99, keeper's beastcraft level)` — the skill stays the ceiling,
  the bond stays the point.
- Stats come from ONE site, `petStatBlock(species, petLevel, bcLevel)`:
  the species def through `scaleNpcDef` (respecting its coupled-curve
  comment — the die drifts, the level multiplies), then the keeper's
  hand: +1% hp per beastcraft level, +0.5% damage per level, armor
  +floor(bc/4). First-pass numbers; the Phase 6 ledger owns them.
  Higher beastcraft means the same beast fights meaner beside you —
  the user mandate, composed at one site like every stat in Arx.

### THE FALL IS NEVER THE END (death law)

- At 0 hp a companion is **downed, never destroyed**: the entity stays
  120s, `PoseState.Lie`, untargetable, done fighting.
- **Tend it**: a 4s kneel beside the body raises it at 40% hp. Free,
  always. (A herbalism salve raising it fuller is a Phase 5 recipe —
  the brewer sells to the hunter too.)
- **Leave it**: window lapses, keeper walks, keeper dies, keeper logs —
  the friend limps home. The row flips to 'resting' at the stable;
  collect it there whole. No fee, no timer wall, no corpse run, no
  hardcore lane: the punishment is the fight you finish alone.
- Keeper death: the pack spills, the friend does not. The pet re-heels
  at the respawn, unharmed, part of the "kind hands" that carried you.

### KINDNESS PAYS, NEGLECT NEVER PUNISHES (care law)

The homesteader's lane, with the chore poison removed: feeding a
companion its lure at the pen is a bond moment — small beastcraft XP
and pet XP on a produce-style per-pet cooldown (the milk rhythm). There
is NO hunger meter, NO decay, NO unhappiness debuff, NO daily. An
untouched pet is exactly as strong next month. Care is a faucet, never
a leak — the same shape as watering crops.

### THREE STALLS, ONE HEEL (household law)

- Cap three owned (`character_pets` rows), one active. Swapping is a
  stable/pen act, never a mid-field hotswap — rotation is a household
  decision, loadout-deliberate like the technique bench.
- **The pen is buildable** (`beast_pen`, cat station,
  `BuildableDef.skill: 'beastcraft'` — the garden-plot precedent), so
  the farmstead player manages the household from home.
- Towns get authored stalls: Dawnmead first (the level-10 moment
  happens there), a stall in Osa's yard at Silverfall (the hostler
  keeps horses; she can board a bear and have opinions about it), one
  at Pinewatch. Keeper NPC with a VOICE card, dash ban, breath budget.
- Releasing a companion is a ceremony with a confirm, at a stable only:
  "the wild takes it back." The row is gone; the name is not reused.

### THE COLLAR TELLS THE TALE (identity law)

A tamed body must read tamed at a glance, at zoom, in a crowd:

- A collar band with a small tag, drawn in the species painter's
  vocabulary (worn gear on the body — the saddle-and-girth precedent),
  keyed off the meta's owner mark. Never a palette swap: a tamed wolf
  keeps the wolf's whole look. The wild look is the trophy.
- Nameplate: the given name, keeper-gold ink, "(Lv N)" — the shipped
  beast label with the name the player chose. The alert glyph never
  shows on a pet (it has no perception to alert).
- The pet HUD chip: one chip in the buff-tray idiom (portrait glyph,
  hp sliver, downed state) — ONE ID ONE METER discipline, no new HUD
  surface.

### THE HEEL FORGIVES THE ROAD (movement law)

- Follow is a leash-target state in `tickNpcs` (the craven-break
  pathing shape, re-aimed at the keeper): heel offset ~1.6 tiles,
  catch-up sprint at `min(species speed × 1.5, 9.5)` t/s — under the
  12 t/s lane with the mount's own margin.
- Past 24 tiles behind (a mounted keeper, a riftgate, a cliff line) the
  pet slips to **trailing**: the entity despawns, the state remembers,
  and the body re-emerges at heel when the keeper drops under 6 t/s.
  Never a visible teleport, never a stuck body pathing across the map.
- **The underground welcomes it.** Where the saddle refuses (delves,
  the Undercroft, dungeon bands), the companion follows — that is the
  point of it. Dungeon instances admit the pet at the gate and recall
  it at teardown with the run.

### THE FANG KNOWS ITS FRIENDS (allegiance law)

A companion never targets a player, never targets an actor, never
splashes either: every pet strike and every pet special resolves
against hostile bestiary bodies only, checked at the strike site, not
at the AI layer. No PvP lane exists for pets and none will. Town
enforcement ignores pets entirely: a pet cannot trespass, steal,
witness, or be fined — it is, legally, an animal.

### THE WIRE STAYS LEAN (network law)

- The pet entity rides the shipped rails: one snapshot row, one
  `EntityMeta` using fields that already exist (`name`, `level`,
  `ownerEid`). Watchers get everything from what is already sent.
- The keeper additionally gets `S2CPet` — the S2CRide shape: active pet
  (species, name, level, xp, hp, state) + the household list for the
  stable UI. Signature-gated (`petSigSent`), reset to '' on reconnect
  rebind, exactly the ride-mirror discipline.
- Protocol 26 → 27, changelog paragraph written. The predictor is
  untouched — nothing about a pet changes the keeper's own movement.

---

## Part 3 — The phases

### Phase 1 — THE OPEN HAND (tame, own, follow, persist)

Content: `content/src/tames.ts` — `TameDef {species, level, lure,
tameXp, flavor}`, validators (species must exist, must not be an
excluded class — the whitelist law test), roster starting with beetle
and rat. Server: the gentling flow on `interactNpc`'s bestiary branch
(every refusal aloud), `PetComp` + pet spawn/despawn lifecycle bound to
the keeper's session (login, grace, despawn, trailing skeleton), the
follow state in `tickNpcs`, naming (`C2SPetName`, sanitizer). DB
migration v22 `character_pets` + `loadPets`/`savePet*` in accounts.ts
(mutation-site fires; trickle on savePlayer cadence with a `petDirty`
flag). Wire: `S2CPet` mirror, protocol 27. Dev levers: `/tame
<species>`, `/petstate`. The skill card line finally corrected. Tests:
tame gating table, whitelist, name sanitizer, follow-state math.
Receipts (`prove:pets` is born): level refusal, full-health refusal,
lure refusal, channel interrupt, success + naming, follow across a
measured run, logout → login returns the same name at heel, cap-3
refusal.

### Phase 2 — THE FANG BESIDE YOU (the two missing rails)

`npcTargetPos`/`npcStrike`/`blastPlayers` learn pet bodies; mobs fight
back with everything they have (specials splash pets; the dying-body
guard holds). Pet melee loop on the shipped windup grammar;
`petMaxHit` through the one pipeline; whiff-0 receipts. The harry with
its flat cooldown. Credit threading: owner-locked loot, quest wounders,
faction deeds, kill credit. XP flows: pet ladder + beastcraft trickle;
the never-a-combat-school pin. `petStatBlock` composition site.
Balance: PET BRACKETS join damage.test.ts as contract (a BC-20 wolf
beside a fresh keeper vs the goblin camp; a BC-99 bear vs a deep-tier
champion — move deliberately or not at all). Receipts: pet opens and
holds while the keeper shoots free; keeper opens, harry takes the eye;
whiff writes nothing; a sneaking keeper's pet draws no camp.

### Phase 3 — THE FALL IS NEVER THE END (downed, tend, rest)

Downed state (Lie pose, untargetable, 120s), the tend kneel, the limp
home to 'resting', collect-at-stable, keeper-death re-heel, the bond
moment (care faucet) with its produce-style cooldown. Receipts: every
exit from downed (tended, lapsed, keeper fled, keeper died, keeper
logged) lands the row in exactly one honest state; a force-quit on the
downed screen loses nothing.

### Phase 4 — THE THREE STALLS (the household)

`Tile.BeastPen` + TILE_DEFS + buildable (`skill: 'beastcraft'`, level
10) + STATION_FACE; the stable panel in the Vault shape (three stall
cards: portrait, name, level, state; heel / rest / rename / release
with confirm); authored stalls at Dawnmead, Osa's yard, Pinewatch; the
keeper NPC (actor JSON, VOICE card, dialogue with the dash ban and the
breath budget — a drover who thinks hunters spoil their animals, or the
reverse; one opinion, not an essay). Release ceremony. Pad path through
the stable panel (`[data-nav]` stops).

### Phase 5 — THE SPECIES SPEAK (kits, collar, chip, roster)

The full ladder through the worg. Kits shaped from shipped teeth
(brace, grip, gore, worry, charge, swoop, deep venom) — specials
through the ability rail with the allegiance check at the strike site;
each needs its FX face and, where cast, its plate. The collar render +
name-ink nameplate + no-alert-glyph. The pet HUD chip. The salve recipe
(herbalism sells to hunters). First balance pass on kit magnitudes
against the Phase 2 brackets.

### Phase 6 — THE LONG ROAD TOGETHER (polish + soak)

Mounted trailing verified at courser speeds; dungeon gate entry and
teardown recall; town manners (enforcers, shops, thrones — the pet is
furniture to the law); sneak interplay receipts; render-perf check (one
more body per hunter on a Firefox budget — the patch caches must not
notice); audio moments (the huff, the hush, the happy nip) on the
shipped foot/voice rails; the full `prove:pets` soak Silverfall →
Pinewatch → a delve floor and back; the balance ledger written into
this doc; VOICE pass over every line the system speaks.

---

## Part 4 — What this epic refuses

- **No permadeath, no pet loss, ever.** Downtime is the only cost. The
  hardcore lane was considered and refused: a named friend that can be
  deleted teaches players not to name things.
- **No hunger, durability, mood, or decay.** Care pays; neglect never
  charges. The beast is not a chore (the mounts law, kept).
- **No second companion afield, no pet armies.** Summons (totem, trap,
  decoy) are unchanged and coexist; the BONDED body is singular.
- **No pet-vs-player, anywhere, under any flag.**
- **No riding your companion.** The bear is not a saddle. Mounts are
  mounts; the day those systems touch is another review.
- **No RNG taming, no pity dials, no player-state odds** — the
  flood-law's spirit governs hearts as well as drops.
- **No champion, humanoid, undead, or slime tames.** The whitelist IS
  the law; there is no flag to leak.
- **No pack-mule pets.** A companion carries no inventory — the pack,
  the bank, and the theft laws stay whole.
- **No healer pets.** Kits are teeth and hide. Mending stays with
  herbalism, food, and the keeper's own hands.
- **No breeding.** If the Dawnlands ever want foals and clutches, that
  is its own epic with its own review.

---

## Part 5 — First-pass numbers and open dials

- **The bear-at-15 instinct.** The brief suggested bears and great owls
  near beastcraft 15. First pass places them at 25/30 so the ladder has
  a mid-game; if live play says the wait is wrong, the rungs are one
  constant each. The ladder table is a dial, not a law.
- **The XP economy needs its early rungs fed.** Today beastcraft 10
  costs ~1,150 xp ≈ 144 milkings. Phase 1 must decide the on-ramp: tame
  XP is the spine (first pass `30 + 10 × species level`), bond moments
  the trickle (6xp / 4min / pet), combat assist the hunter's lane
  (first pass `floor(landed damage / 2)`, capped per kill by the
  species' xpReward). Numbers land in the Phase 6 ledger.
- **Harry cadence** (200 ticks) vs champion fights — flat, but the
  constant may move once the brackets exist.
- **Trailing distances** (24 out / re-emerge under 6 t/s) tuned live on
  the courser road in Phase 6.
- **Kit magnitudes** all first-pass until Phase 5's balance pass.
- **Deferred candidates, user-ask gated:** livestock follow (the old
  Drover sketch), pen ambience (a named pet visible AT the pen while
  stabled — a render-only joy, real scope), Callings swap toward
  companion perks, examine lines on the collar tag.

---

## Part 6 — THE LEDGER (as shipped, 2026-08-01)

The epic ran b7ac92f (this plan) through six phase commits: 18b91a6
THE OPEN HAND, a1d1626 THE FANG BESIDE YOU, bcb6be6 THE FALL IS NEVER
THE END, a7f8fc1 THE THREE STALLS, 2ae952c THE SPECIES SPEAK, and the
closing commit carrying this ledger. `prove:pets` walks all of it live
(45+ receipts); the memory topic file carries per-phase as-built law.

### The numbers as they stand

| dial | shipped | note |
|---|---|---|
| Gentling window | hp <= 35% | the craven threshold, shared constant |
| Gentling kneel | 80 ticks | flat; no gather-speed brews |
| Tame xp | 30 + 10 x wild level | beetle 90 ... bear/owl 190 |
| Pet ladder | dmg x2 + kill xpReward x0.5 | offset curve from species level |
| Beastcraft trickle | floor(dmg/2), capped per mark | cap = the mark's xpReward |
| Hand bonuses | +1% hp, +0.5% dmg per BC; armor BC/4 | one site: petStatBlock |
| Downed window | 2400 ticks (120s) | then the limp home |
| Tend rise | 40%; 80% with mending salve | salve is herbalism's shipped jar |
| Rest home | 120s wall-clock | survives logout by design |
| Bond moment | 240s per stall; +6 bc, +20 pet, heal 25% | kindness pays, never charges |
| Harry rest | 200 ticks per mob | flat, never player-scaled |
| Follow | heel 1.6 / catchup 6 / trail-out 24 / sprint cap 9.5 | under the 12 t/s lane |
| Fight leash | 10 tiles from the keeper | a defender, never send-and-forget |
| Stand-ground band | attackRange + 0.85 (pounce +1.6) | the orbit fix; land grace = stop band |

### The ladder as shipped

10 beetle (shell +4 armor) and rat (venom nip) · 15 mudcrab (chill
grip) and boar (gore knockback 1.6) · 20 wolf (wild bleed) · 25 bear
(wild charge and maul) · 30 great owl (hushing chill) · 35 adder
(deep venom p2) · 45 worg (cold bite, +2 armor). Wolf and bear carry
no kit on purpose: their wild teeth already are the kit, and the test
suite pins that as a design statement.

**Amended 2026-08-13 (user ask: the bat and the spider were obvious
candidates that refused the call):** the cave bat (rung 10, berries,
60xp) and the giant spider (rung 20, raw beef, 130xp) join the ladder.
Both are kitless on the wolf-and-bear precedent: the bat's bleeding
nip and the spider's wild venom ride attackStatus as-is, the spider's
pounce is anatomy, and its web snare stays on the wild cast rail (kits
never ride the cast rail, decided above). Same amendment: the ram and
the bull joined sheep on the NEVER_TAMED list — livestock by nature
with no produce row on the NpcDef, so the structural refusal missed
them the same way.

### Deviations from Part 5's first pass, decided in the field

- The bear-at-15 instinct stayed at 25/30 (bear/owl); the rungs are
  still one constant each if live play disagrees.
- Kits ride the bite, the stat site, and the pounce — never the cast
  rail. Every kit in the table was expressible with shipped teeth;
  castAbility allegiance work would have bought nothing.
- The whistle (heel/stay toggle) never shipped: companions are
  always-heel and defend-the-hand, and no play in six phases wanted
  the extra key. Deferred with its pad problem intact.
- The Phase-2 interim fall was fully replaced by Phase 3; its
  constants were deleted, not deprecated.
- Dungeon entry/teardown recall ships BY CONSTRUCTION: the instance
  jump is the same big-displacement trailing the Undercroft receipt
  proves, and teardown's orphan sweep is the tickPet owner check.
  No dungeon-specific pet code exists to break.
- The keeper's kill-moment benefits (on-kill haste, kill procs) fire
  on pet kills: kill credit is whole, decided in Phase 2.

### Deferred, user-ask gated

- Per-species synthesized voices (the foot rail already sounds every
  pet body; three small cues shipped for down/rise/bond).
- Pets aiding against HOSTILE ACTORS (named brigands): THE FANG KNOWS
  ITS FRIENDS refuses all actors today, cost: pets sit out actor-boss
  fights.
- Pen ambience (a stabled friend visible AT the pen), livestock
  follow (the old Drover sketch), Callings swap toward companion
  perks, collar examine lines, resting collect UI polish beyond the
  stalls panel.

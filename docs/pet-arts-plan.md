# THE FANG FINDS ITS VOICE — companions learn their own arts

Date: 2026-08-16. Status: PROPOSED — this document is a design review in
the constitutional sense. `docs/beastcraft-plan.md` Part 6 decided *"kits
ride the bite, the stat site, and the pounce — never the cast rail"* and
promised that the day a companion needed more would be argued in a new
review, not a patch. This is that day and that review. Sibling of
docs/enemy-arts-plan.md (THE WILD DRAWS BREATH gave the bestiary the cast
rail; this epic seats the companion at the same table) and of
docs/beastcraft-arts-plan.md (THE KEEPER'S TONGUE gave the keeper ten
words; this epic gives the friend its own).

## Part 0 — The brief (user mandate, 2026-08-16, verbatim intents)

- Deep premium elevation of the pet system: more depth to carrying a pet,
  greater investment and reward, more variance between companions.
- **Every tamable beast carries a minimum of five to six abilities**,
  active or passive, highly curated and bespoke — never a quick add.
- Families share pools; species keep exclusives; **lesser variants get
  exclusivity too** (a regular pet vs a giant or dire pet should offer
  different abilities and slight customizations, with neither strictly
  better).
- **A focus budget**: pets expose up to three ability slots; each ability
  costs focus; low-level pets hold one or two focus points, invested pets
  hold more; strong abilities cost more, so a heavily invested pet is the
  only pet that runs heavy loadouts.
- **Investment is companionship, not just level.** A beastcraft-50 keeper
  taming a level-10 beast must NOT receive an instant level-50 pet or a
  pre-paid budget. High beastcraft may accelerate the climb (an XP gain
  bonus); the work is still done together. The bond must be felt.
- **The pet menu is overhauled whole**: a curated screen to manage and
  inspect companions — stats, equipped abilities, and metrics of the
  journey (such as the level at which the pet was acquired).
- Balance doctrine: no best-in-slot species, no forced end-game pet;
  early friends and late friends each carry strengths worth keeping.
- Every UX affordance; premium, intuitive, pad-first; the management of
  a companion's craft should feel epic.

## Part 1 — Audit: what stands (verified in code, 2026-08-16)

- **The roster is sixteen.** TAME_DEFS (content/src/tames.ts:53) holds
  giant_beetle, rat, cave_bat, mudcrab, boar, dire_boar, giant_spider,
  wolf, giant_turtle, giant_crab, lynx_young, lynx, bear, great_owl,
  adder, worg — with three shipped variant pairs (boar/dire_boar,
  lynx_young/lynx, wolf/worg) and a shellback family four wide. The
  variant-exclusivity mandate has native ground.
- **TameKit is three fields** ({bite, armor, knockback}, tames.ts:34) —
  the whole per-species identity today. It folds at petStatBlock
  (tames.ts:326, THE ONE STAT SITE) and petStrike (gameServer.ts:14922).
- **The cast rail has two mouths and room for a third.** castAbility is
  ONE interpreter; `fromNpc` picks polarity. NPC kits (NpcKitEntry,
  npcs.ts:15) author pacing on the def, windup telegraphs speak the
  `charge` fx anchored to the eid, and THE TELEGRAPH PREMIUM is a
  contract test. Pets are outside all of it: tickPet
  (gameServer.ts:14691) is the whole brain, and no pet body ever runs
  pickKitEntry.
- **Attribution rails are pet-ready.** damageNpc already threads
  `opts.viaPet {petEid}` with attackerEid = KEEPER: kill credit whole,
  keeper procs refused, fromPet statuses train no school. Any new pet
  blow that walks through damageNpc(viaPet) inherits every credit law
  for free.
- **Persistence has an empty chair waiting.** character_pets carries
  `tamed_at BIGINT` since v22 — written, never read, never sent. The
  journey ledger the user asked for is half-born. Current migration
  version: 37. Protocol: 33. PetInfo carries no ability or bond fields.
- **The keeper's school is full and untouched.** Ten beastcraft arts,
  rungs 5..90, all damage 0. This epic adds NOTHING to the keeper's
  ladder — the companion's arts are the PET'S, held on the pet row,
  chosen in the pet's menu, cast by the pet's own brain.
- **The UI grammar for a premium codex room is shipped and proven.**
  THE PROVING HALL (codex.css, panels.ts:2483-3811): crest rail, path
  ribbon, measures against a school envelope, mark seals, rank spine,
  proving-ground diagram. The character screen's tray anatomy and the
  skills hero pane complete the kit. The stalls panel stays the pen's
  household surface; the new room is a screen of its own.
- **Balance contracts that bind us:** PET BRACKETS in tames.test.ts
  (beetle-vs-goblin swing windows, hand ratios); TTK brackets in
  damage.test.ts; whiff-0 sacred; no keeper benefit from pet blows;
  THE QUIET SHADOW (perception never notices pets); no pet armies.

## Part 2 — The laws

### LAW 1 — THE OLD LAW IS AMENDED ALOUD, NOT ERODED

*"Kits never ride the cast rail"* (beastcraft plan, Part 6) is struck
and replaced: **a companion's SLOTTED arts ride the one cast rail; its
unslotted nature stays on the bite.** The wild teeth every species
already owns (attackStatus, pounce anatomy, base armor) remain free and
unslotted — a wolf that slots nothing is exactly yesterday's wolf. The
amendment is priced: every active art obeys the NPC engine's telegraph
grammar (windup on the pet's own body, charge fx, plant while casting)
so the battlefield stays readable, and every pet-cast point of damage
walks damageNpc(viaPet) so every credit law of Phase 2 holds untouched.

### LAW 2 — THE REPERTOIRE AND THE LOADOUT (content schema)

New registry `content/src/petArts.ts`:

```ts
interface PetArtDef {
  id: string
  name: string               // VOICE.md, no dashes
  kind: 'active' | 'passive'
  focus: 1 | 2 | 3           // the price at the slot
  ability?: string           // actives: an AbilityDef id (PET_SAFE_SHAPES)
  cooldownTicks?: number     // actives: pacing lives HERE (the kit law)
  windupTicks?: number       // actives: the drawn breath; >0 above basic
  minRange?: number; maxRange?: number
  hpBelow?: number           // desperation arts
  passive?: PetPassive       // passives: folded at the one stat site
  tale: string               // one concrete sentence, the bench copy
}

interface PetPassive {       // every field optional, all additive
  armor?: number; maxHpMult?: number; dmgMult?: number
  strideMult?: number; biteStatusPower?: number   // deepens the species bite
  statusLeech?: number       // fraction of DoT ticks returned as pet hp
  regenMult?: number; downedTicksMult?: number
  firstBlowShrug?: boolean   // the opening hit against it whiffs (deterministic)
  bondHealMult?: number      // bond moments mend deeper
  openerRange?: number       // pounce/open from further
}
```

`PET_REPERTOIRE: Record<species, string[]>` names each species' five-
to-six-art shelf: family pool first, exclusives after. The validator
enforces: every art referenced exists; every species holds 5..6; every
species holds at least one active, at least one passive, and EXACTLY
one 3-focus signature; variant pairs share their family pool but never
their exclusives (boar/dire_boar, lynx_young/lynx, wolf/worg pinned by
name); active abilities use PET_SAFE_SHAPES only; any active whose die
exceeds the species basic authors windupTicks >= 10 (the telegraph
premium, pet edition); no art heals the keeper, buffs the keeper, or
carries a summon (the no-armies and teeth-and-hide laws are structural).

### LAW 3 — FOCUS IS EARNED TWICE (the budget law)

```
petFocusMax(petLevel, bondRank) =
  1                                   // the tame's gift
  + [petLevel >= 20] + [petLevel >= 40] + [petLevel >= 60]
  + [bondRank >= 2] + [bondRank >= 3] + [bondRank >= 4]   // max 7
```

Three slots (`PET_ART_SLOTS = 3`), sum of slotted focus <= budget. The
arithmetic is the design: a fresh tame slots one cheap word; a raised
friend runs 3+2+2 or 3+3+1; three signatures (9) exceeds the ceiling
(7) forever — nobody stacks three crowns. Both axes are the pet's own:
neither moves when the keeper's beastcraft moves. Slotting is free and
doable anywhere from the menu (the pet's mind is not a pen fixture),
but ONLY out of the pet's own fight (target null) — never a mid-bite
respec.

### LAW 4 — THE BOND IS WALKED, NEVER BOUGHT (investment law)

New per-pet ledger `bond_xp`, five ranks, names spoken in the menu:
0 Newly Met · 1 Fed From the Hand · 2 Road Worn · 3 Blooded Together ·
4 Heartsworn. Thresholds `PET_BOND_RANK_XP = [0, 200, 600, 1400,
2800]`. Faucets (all existing moments, now paying a second coin):

- The bond moment (the 4-minute lure feeding): +25 bond. The deliberate
  act stays the spine — care outpaces grinding.
- A kill the pet shared (the kill-share door): +2 bond.
- Tending the fallen friend: +15 bond. Hardship braids the rope.
- The tame itself: +0. The rope starts at zero for everyone.

No decay, no neglect penalty (KINDNESS PAYS holds). And the mentor's
answer to the user's fear, exactly as asked: the keeper's skill speeds
the road but never teleports down it —
`petXpMult = 1 + min(0.5, 0.01 * max(0, bcLevel - petLevel))` applied
in grantPetBattleXp only. A master keeper raises a young friend half
again as fast; the deeds are still the pet's own.

### LAW 5 — THE PET'S BREATH (the third mouth)

The fight branch of tickPet gains an art picker in the kit engine's
image: slotted actives tick their own cooldowns (`artCds` on PetComp,
lazily seeded — never open with the signature: initial cd =
min(cd, 60)); an eligible art (cd 0, range band, hp gate) is chosen
over the basic at the windup decision point; `windupTicks > 0` plants
the pet, holds PoseState.Cast, and broadcasts the same eid-anchored
`charge` fx every watcher already reads. Fire calls castAbility with a
new `fromPet {petEid, ownerEid}` polarity: target iteration = hostile
bestiary bodies only, checked at the strike site (THE FANG KNOWS ITS
FRIENDS — never players, never actors, never pets); every damage point
routes through damageNpc(viaPet); statuses ride applyStatusToNpc
fromPet. Shock staggers cancel the windup (pets already stagger);
a cancelled art pays PET_ART_RETRY_TICKS 50. Passives never tick:
stat passives fold at petStatBlock (which learns the slotted list),
behavioral passives read at their single existing sites (petStrike,
petDefend, tickPet regen, the bond moment, petGoesDown).

### LAW 6 — THE PRICED FANG (balance law)

- Active dies run npcMaxHit on the PET'S level with the species die
  scaled exactly as petStrike scales today — no second damage math.
- The PET BRACKETS in tames.test.ts stay green UNSLOTTED: a bare pet is
  yesterday's pet, contract-tested. Slotted actives add spike texture
  behind telegraphs; sustained pressure (the basic and its cadence)
  does not move.
- A new bracket family pins the ceiling: a Heartsworn level-60 wolf
  running 3+2+2 must not out-damage-per-second the shipped bracket's
  intent by more than the signature premium (first pass: +35% sustained,
  spikes telegraphed); asserted over a simulated minute in tests.
- **No species dominates.** The contract test computes, per species,
  a loadout-optimal (hp x ehp-weighted dps) score at level parity and
  asserts max/min <= 1.6 across the roster — the number that keeps
  "your favorite is viable" a law instead of a hope.
- Focus prices are the balance dial of record; the ledger in Part 6
  owns every retune.

### LAW 7 — THE JOURNEY IS SHOWN (ledger law)

character_pets grows (migration v38): `bond_xp BIGINT DEFAULT 0`,
`arts TEXT DEFAULT '[]'` (the slotted ids, validated on load),
`tamed_level SMALLINT` (the pet's level at the tame — backfilled null
for elder friends, shown as "long before the ledgers"), `kills BIGINT
DEFAULT 0`, `downs INT DEFAULT 0`. tamed_at is finally READ and sent.
PetInfo grows additive fields: `bond, bondRank, focus, focusMax, arts,
tamedAt, tamedLevel, kills, downs`. The mirror stays signature-gated;
protocol stays 33 with a changelog note (additive JSON, the stable-op
precedent).

### LAW 8 — THE COMPANION'S HALL (the menu law)

The pet menu is rebuilt as a standing screen (`#companion-panel`, dock
button beside Techniques, pad-first, zero scrollable columns):

- **THE STALL RAIL** — one crest stop per owned companion (the plaque
  medallion portraits), state-tinted, LB/RB paged like every rail.
- **THE STANDING** — the hero band: bbox-refit portrait in a ring gauge
  (vigor), name in serif with the faceted level gem, species + flavor
  line (TameDef.flavor finally has its stage), state word, and THE ROPE
  — the bond meter drawn as a braided cord that thickens at each rank
  knot, rank name lettered under it. Instruments, never cards: hp/dmg/
  armor/stride as measure channels against a ROSTER envelope (the bar
  is a comparison across all sixteen species at level parity — the
  no-best-in-slot law made visible).
- **THE REPERTOIRE** — the species' shelf as a path ribbon: art plates
  with focus pips (1..3 brass studs), family-pool plates carrying the
  family seal, exclusives carrying the species seal, actives showing a
  proving-ground diagram on focus (the artDiagram grammar), passives
  showing their measure deltas live against the pet's own instruments.
- **THE THREE COLLARS** — the loadout: three sockets and a focus ledger
  (spent/budget as brass coins in a channel; the next coin's unlock
  condition lettered under — "at level 40" / "when you are Blooded
  Together"). Seat flight on slot, refusal spoken when focus is short
  ("It cannot hold so much in mind. Not yet."). Slotting emits
  C2SPetArts; the server re-validates budget, ownership, repertoire
  membership, and out-of-fight, every refusal aloud.
- **THE JOURNEY** — the ledger foot: "Tamed at level 9, forty days ago
  · 214 hunts shared · Fallen 6 times, never left." Real numbers from
  the new columns, written in the game's voice, no stat-dump grid.
- The stalls panel at the pen keeps heel/stable/release/rename and
  gains one link plate: "Open the Companion's Hall."

### LAW 9 — THE FLOURISH CONTRACT, PAID IN FULL

Every ACTIVE art ships with an authored FX_STYLES face and a bespoke
SIGNATURES set-piece (fxSigsPetArts.ts, the school-file ritual), a
painted spell-plate, and its telegraph read on the pet's body. Every
PASSIVE ships with a painted plate and a visible worldly tell where one
is honest (the shell-set sheen, the first-blow shrug's glint). No art
ships on fallback grammar. Content boundaries hold everywhere (no
occult vocabulary; the worg's dread is cold, never dark).

## Part 3 — The repertoire (curated roster, v1)

Family pools first, then exclusives. (A)=active, (P)=passive, [n]=focus.
Dies at base; the pet's level curve does the tier work. ~71 arts unique
(~38 actives needing faces — the SECOND BREATH scale, priced knowingly);
every species holds 6 except lynx_young at 5 — the young learn fewer
words, and the validator pins both numbers.

**THE SKITTERKIN** (rat, cave_bat) — pool: `nip_and_dart` (A)[1]
dash-strike that backs out; `gutter_quick` (P)[1] stride;
`twitching_ear` (P)[1] the first status laid on it each fight is
shrugged. Rat exclusives: `plague_gnaw` (A)[2] deep venom bite (windup
10); `small_shadow` (P)[2] the opening blow against it whiffs;
signature `the_rats_hour` (A)[3] a flurry of filthy bites, its venom
power doubled while it runs. Cave_bat exclusives: `blood_drink` (P)[2]
its bleed ticks feed it; `echo_shriek` (A)[2] chill pulse nova (windup
12); signature `the_dark_descent` (A)[3] a stooping dash chain, bleed
on each pass.

**THE SHELLBACKS** (giant_beetle, mudcrab, giant_turtle, giant_crab) —
pool: `set_the_shell` (A)[2] planted guard, big armor 300t;
`chitin_plate` (P)[1] +2 armor; `clatter_challenge` (A)[2] taunt pulse
(the tank's word); `slow_and_certain` (P)[1] knockback never moves it.
Beetle: `horn_toss` (A)[2] knockback arc; signature
`the_burnished_wall` (P)[3] unhurt 100t, its armor climbs and climbs.
Mudcrab: `tide_grip` (A)[2] chill pinch; signature `the_undertow`
(A)[3] a dragging pull-pulse. Turtle: `patience_of_stone` (P)[2] regen
doubled; signature `the_standing_stone` (A)[3] taunt nova + the deepest
guard in the game, fully planted. Crab: `riptide_claw` (A)[2] heavy
chill smash (windup 12); signature `the_kings_pincer` (A)[3]
execute-weighted grip vs chilled marks.

**THE TUSKERS** (boar, dire_boar) — pool: `gore_charge` (A)[2]
dash-strike knockback; `bristleback` (P)[1] +armor below half;
`tusk_sweep` (A)[1] a cheap short arc. Boar: `rooting_snout` (P)[2]
kills shake loose forage scraps (the homesteader's coin); `mud_wallow`
(A)[2] it wallows: cleanse + a small mend; signature
`the_stubborn_heart` (P)[3] once a fight, it refuses its downing blow
at 1 hp. Dire_boar: `iron_hide` (P)[2]; `old_scars` (P)[2] statuses on
it run half; signature `the_long_furrow` (A)[3] a leaping quake with a
knockback ring (windup 14).

**THE CANIDS** (wolf, worg) — pool: `worry_the_wound` (A)[2] a bite
that deepens standing bleed; `pack_step` (P)[1] stride at the keeper's
shoulder; `blooded_run` (P)[1] stride while its mark bleeds. Wolf:
`hamstring` (A)[2] chill bite; `lone_vigil` (P)[2] regen and armor
while the keeper stands within 3; signature `the_first_howl` (A)[3]
self-surge, teeth and stride (windup 10 — the young howl the dire
wolves taught). Worg: `winters_jaw` (A)[2] chill arc; `war_pelt`
(P)[2] +2 armor over the kit's own; signature `the_cowing_snarl`
(A)[3] becalm-pulse on lesser wild beasts (the war-hound remembers
giving orders).

**THE CATS** (lynx_young, lynx) — pool: `soft_paw` (P)[1] its steps
never lift a keeper's sneak; `raking_flurry` (A)[2] bleed flurry;
`sharpened_claws` (P)[1] teeth a shade keener. Lynx_young (5 arts):
`playful_feint` (P)[2] the opening blow against it whiffs; signature
`the_pounce_perfected` (P)[3] opener range +1.2 and the opening bite
bleeds deep. Lynx: `tufted_patience` (P)[2] its first blow from an
unhurt stand lands hard; `keen_tufts` (P)[1] opener range +0.6;
signature `the_winter_stalk` (A)[3] a three-step dash chain, chill at
each landing (windup 12).

**THE BEAR** — `maul` (A)[2] heavy bleed arc (windup 12); `the_charge`
(A)[2] knockback dash; `thick_fat` (P)[1] +maxHp; `honeyed_temper`
(P)[1] bond moments mend double; `winter_sleep` (P)[2] downed clock
runs half; signature `stand_tall` (A)[3] taunt nova + guard — the big
wall says so out loud (windup 14).

**THE GREAT OWL** — `talon_stoop` (A)[2] dash from the high line;
`hushing_wing` (A)[2] chill pulse; `silent_feather` (P)[1] soft_paw's
sister; `night_eyes` (P)[1] stride and opener range at night;
`preen` (A)[2] cleanse self + small mend; signature `the_white_hush`
(A)[3] a wide hushing field, chill p2 (windup 14).

**THE ADDER** — `venom_spit` (A)[2] the roster's one ranged basic art;
`coiled_strike` (A)[2] lunge; `cold_blood` (P)[1] status durations on
it halved; `shed_skin` (A)[2] cleanse + mend; `deepening_dose` (P)[2]
its bite's venom power +1; signature `the_long_fang` (A)[3] a
finishing strike weighted vs envenomed marks (windup 12).

**THE WEAVER** (giant_spider) — `web_snare` (A)[2] the wild art at
heel at last (the amendment's headline); `skitter_high` (P)[1] stride;
`spinner_patience` (P)[2] snared marks take deeper wounds from it;
`pale_silk` (A)[2] self-shroud guard; `venom_sup` (P)[1] its venom
ticks return a sliver of hp; signature `the_venom_lattice` (A)[3] a
woven venom field (windup 14).

## Part 4 — Phases (a commit each)

1. **THE REPERTOIRE** — shared law (focus/bond/mentor constants + math,
   pets.test.ts), content registry + all ~52 arts + the ~20 new
   AbilityDefs actives ride + validator + contract tests (roster
   completeness, exclusivity pins, signature-per-species, telegraph
   premium, no-dominance score).
2. **THE THIRD MOUTH** — server: fromPet polarity in castAbility, the
   art picker in tickPet, passive folding at the one stat site + the
   single behavioral sites, C2SPetArts + refusals, bond ledger faucets,
   migration v38, PetInfo additive fields, dev levers (/petarts).
3. **THE COMPANION'S HALL** — the screen whole (LAW 8), stalls-panel
   link, dock button, pad round trip proven.
4. **THE FLOURISH** — FX faces, spell-plates, fxSigsPetArts signatures
   for every active, telegraph reads on the pet body, live curation
   pass at gameplay zoom.
5. **THE PROVING** — prove:pets grows the arts chapter (slot/refuse/
   budget/cast/telegraph/bond-rank receipts on the isolated rig);
   bracket suite; the ledger written into this doc.

## Part 5 — What this epic refuses

- No keeper buffs from a pet's art, no healer-of-the-keeper pets, no
  summons from pets, no pet PvP — the Phase 2/Part 4 refusals all hold.
- No focus respec fee, no ability "unlearning" cost, no consumable
  training items — the budget is the only economy.
- No bond decay, no jealousy between stalls, no daily chores.
- No keeper-level shortcuts: neither focus axis reads beastcraft.
- No new XP faucets into beastcraft (THE XP CONTRACT holds; bond is a
  pet coin, not a skill coin).

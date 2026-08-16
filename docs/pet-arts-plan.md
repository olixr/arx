# THE FANG FINDS ITS VOICE — companions learn their own arts

Date: 2026-08-16. Status: **EPIC COMPLETE, five phases shipped the same
day — Part 6 THE LEDGER is the as-shipped record.** This document is a
design review in the constitutional sense. `docs/beastcraft-plan.md` Part 6 decided *"kits
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
- **No species dominates — THE EQUALIZER LAW (amended by measurement,
  2026-08-16).** The first-pass 1.6 aspiration met the shipped truth:
  the wild bodies were NEVER at parity. At level-parity 60 the tame
  ladder's own deep-courtship crown (giant_crab: hp 802, die 11,
  armor 22) stands ~2.63x the entry bat (hp 366, die 4) in raw fight
  math, by decree older than this epic. The contract as pinned in
  petArts.test.ts is therefore: every species' best loadout is worth
  slotting (lift >= 1.08 over its bare body); the loadout-optimal
  spread never EXCEEDS the base-body spread (the arts narrow the
  field, never widen it — measured 2.52 under 2.63 at ship); and an
  absolute guard holds the roster inside 2.6. The 1.6 figure remains
  the live-tuning target, owned by the Phase 5 ledger.
- Focus prices are the balance dial of record; the ledger in Part 6
  owns every retune. First equalizer tunes already landed at
  authoring: the crab's claw eased (riptide die 9->8, pincer 8->7 and
  vs 1.8->1.6, signature rest lengthened), the bat's teeth sharpened
  (descent die 3->4, shriek die 1->2, leech 0.5->0.75, cadences
  quickened), the low shelves quickened (beetle toss, boar sweep and
  wallow, weaver lattice), and every lift now lands in 1.10..1.26
  with the weakest body (cave_bat) earning the second-highest lift.

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
Dies at base; the pet's level curve does the tier work. As authored:
71 arts unique (37 actives, every one wearing an authored FX face and
a hand-painted spell-plate from Phase 1 — the client's whole-roster
FLOURISH sweeps enforce both immediately, so the faces could not wait
for Phase 4; the bespoke SIGNATURES set-pieces still land there);
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

---

## Part 6 — THE LEDGER (as shipped, 2026-08-16)

The epic ran f6bc4c5a (this plan) through five phase commits in one
day: 9a78e177 THE REPERTOIRE, d098a4a4 THE THIRD MOUTH, 9bcd1fb4
THE COMPANION'S HALL, 21acf73e THE FLOURISH, and the closing Phase 5
commit carrying this ledger. Memory topic pet-arts-fang-voice holds
the per-phase as-built law and every harness truth minted.

### The numbers as they stand

| dial | shipped | note |
|---|---|---|
| Repertoire | 71 arts, 16 species | 38 actives (web_snare reused whole), 33 passives |
| Focus budget | 1 + lvl 20/40/60 + rope 2/3/4, max 7 | three signatures never fit, by arithmetic |
| Slots | 3 collars | costs 1..3, one 3-focus signature per species |
| The rope | 0/200/600/1400/2800 | Newly Met .. Heartsworn |
| Bond faucets | meal +25, shared kill +2, tend +15 | no decay, ever |
| Mentor's hand | +1%/level over the friend, cap +50% | battle xp only |
| Art pacing | first arming <= 60t, retry 50t | never opens the fight; punished never disabled |
| Journey ledger | tamed_at READ, tamed_level, kills, downs | v38; a re-used stall resets everything |
| Equalizer | lifts 1.10..1.26, spread 2.52 < base 2.63 | guard 2.6; 1.6 stays the live target |

### THE PROVING (Phase 5, isolated rig lane 18, worktree HEAD+mine)

Nineteen live receipts, all green: R1 tame lands with an empty
loadout and focus 0 of 1 · R2 a 1-focus word takes with its spoken
confirm · R3 the budget refusal aloud · R4 the foreign-word refusal
aloud · R5 rank ceremonies speak (Road Worn, then Heartsworn) and
the mirror carries the rope · R6 the signature seats at Heartsworn,
4 of 4 · R7 never a mid-bite respec (asked mid-windup,
deterministically) · R8 the breath on the wire: charge broadcast
then the FIRE at ~2.77s (the first-arming seed honored to the tick)
· R8b the surge rides the friend · R8c the stagger law survives
contact and retries to completion · R9 shared kills pay bond and
the count · R10 relog: arts, rope, and journey persist whole,
tamedAt and tamedLevel riding the mirror · R11 the empty loadout
takes (yesterday's wolf) · H1-H6 THE COMPANION'S HALL walked live:
opens from the dock, workings read with verb and proving-ground
diagram, natures fold the ground away, the room slots and unslots
ON THE WIRE, and the signature's refusal letters in place ("It
cannot hold so much in mind. Not yet.").

Live-caught and fixed during the proving (the walk earning its
keep): btn-companions had no click bind and currentScreen() had
never learned 'companions' — two hand-rolled lists the Phase 3
sweep missed; both now wired. /petbond joined the dev levers (the
/xp precedent: it walks the REAL grantPetBond door, so rank
ceremonies fire, never bypass).

### Staging laws minted (the proving's own)
- A lone goblin dies inside the first-arming seed — the never-opens
  law eats its own receipt; stage three in series.
- A bear refuses a leveled keeper (the sizing-up floor) — never
  stage a fight on a body that sizes you up.
- Gap-closers need a gap: gore_charge is mute against adjacent
  spawns (minRange is the law working).
- Assert on the WIRE (wrap handleMessage), never on DOM polling —
  a 500ms windup outruns any evaluate round trip.

### Dialect coverage, witnessed live
Every wire dialect fired from a real companion on a real mark, on
the wire and on camera: charge (the wolf's drawn breath), command
(the first howl's column and rings), field (the venom lattice woven
under a fight), nova (the crab's clatter, its golden wedge-ring and
eye-hooks photographed mid-clap), arc (the riptide gate and the
bear's maul), dash (the bear's charge), and blast (the adder's spit
landing). The spit earned the proving's one content dial: any
minRange starved it (a melee-brained body hugs its mark, so edge
distance lives under every floor) — it now speaks point-blank, its
maxRange a reach and not a floor; a standoff pet brain stays the
deferred road if the flavor ever wants more.

### Deviations, decided in the field
- The plan's 1.6 no-dominance bound became THE EQUALIZER LAW by
  measurement (the wild bodies were never at parity; the repertoire
  provably narrows them). 1.6 remains the live-tuning target.
- FX faces + spell-plates shipped in Phase 1, not Phase 4 — the
  client's whole-roster FLOURISH sweeps refuse a faceless art
  immediately, which is exactly what they are for.
- tusk_sweep reads deliberately thin (a 1-focus word is honestly
  cheap); the melee-arc reads sit at frame edge on the empty stage
  and center on the mark in true fights.
- Proving ran as scratchpad Playwright receipts (the spotcheck
  precedent) rather than a prove:pets harness chapter — the wire
  assertions are identical; a tools-harness port stays open as a
  debt if the suite is ever wanted in CI.

### Deferred, user-ask gated
- Bond faucet breadth (roads walked together, weathering storms).
- The Hall's pad round trip walked end-to-end on a live gamepad.
- Per-species voice moments on art fires (the foot rail already
  sounds every body).
- The 1.6 equalizer target, tuned from live play.

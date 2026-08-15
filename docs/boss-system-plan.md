# The Dread Crown — the world learns to crown its foes

> STATUS: GREEN-LIT 2026-08-14 (user mandate). Phases ship in order; each phase
> records an As-built section at the end of this document as it lands.

## Part 0 — The brief (user mandate, 2026-08-14)

The game has enemies and champions but no bosses. Dungeons and strongholds hold
seats with nothing worthy sitting on them. The mandate:

- Bosses are **stronger, smarter, and strategic** — phases, attack patterns,
  unlockable late-phase voices, summoned adds to fight off.
- **Every strong hit is telecommunicated** — ground indicators, charged
  wind-ups, readable animations. Players learn patterns and strategize.
- Bosses have **strengths and weaknesses** — some shrug off crowd control and
  knockback, others are susceptible. Melee chargers and caster summoners fight
  differently.
- **Dialogue at phases** — the boss speaks; the fight is immersive.
- **Foundational, composable architecture** — a state machine of simple
  mechanisms whose combination is emergent (the boids principle), so the
  content team composes new bosses from data without touching code, and no
  fight feels stuck on repeat.
- **Navigation that cannot strand the boss** — works in procedural arenas,
  survives player knockback tricks.
- **Rewarding** — bespoke loot, a fight worth looking forward to.

## Part 1 — Audit: what exists (verified in code, 2026-08-14)

The substrate is nearly complete; what is missing is the crown, not the body.

- **THE KIT** (`content/src/npcs.ts:15`, `NpcKitEntry`) already carries
  windups, range bands, **`hpBelow`/`hpAbove` HP-fraction gates** (the phase
  primitive in embryo), weights, `minLevel`, `aim: 'lead'`, `rally`. Validator
  at `npcs.ts:1460`; 1..6 entries, cd floor 50, windup cap 100.
- **THE FOE'S BREATH** cast engine (`gameServer.ts:22370-22577`):
  `pickKitEntry` → `beginNpcCast` (charge fx, pip) → `fireNpcCast` (pay at
  fire, aim law) → `cancelNpcCast` (shock/leash/vanish, retry 50). Everything
  fires through the ONE `castAbility` door with `fromNpc` (LAW: ONE
  INTERPRETER, TWO MOUTHS — enemy-arts-plan).
- **Adds** already work end to end: `npcSummonAdds` (`gameServer.ts:22492`) —
  `capAlive`, `levelDelta`, ephemeral `spawnIndex -1`, auto-aggro, and the
  contract test bans recursive summons.
- **Telegraphs**: `fuseTicks` ground grammar + `charge` fx + overhead cast pip;
  telegraph fx are PURE INSTRUMENT (renderer `fxPureInstrument:35411`) — the
  uniform countdown ring IS the read. THE TELEGRAPH PREMIUM is contract-tested
  (`content.test.ts:141-152`): above-basic dice buy warning (≥24t → 2.5×,
  ≥12t → 1.5×).
- **The seats exist, empty of majesty**: dungeon deepest anchor = `boss`
  (`server/src/dungeon/generate.ts:167,530`, roster `boss: {npc, name}` at
  lvl(5) with honor guard); stronghold boss ward + name pool + boss chest
  (`world/strongholds.ts:397-486`); POI `levelOffset` + `names` crowning.
  **`spawn.name !== undefined` is the de-facto boss predicate today**
  (full loot purse `gameServer.ts:19984`, `riftwalker_step` deed `:20049`).
- **Champions are not bosses**: structurally identical to trash — bigger
  numbers, richer kit, a name. The only champion-keyed code is the
  `_champion` suffix deed grant (`gameServer.ts:20063`).
- **No knockback immunity exists** (`damageNpc:19755` pushes every body);
  shock is the one hard stagger (`tickNpcs:22623` cancels casts). A boss can
  currently be stun-chained and shoved like a goblin.
- **Nothing exists**: no phase state, no encounter controller, no pattern
  memory, no boss health banner, no arena binding, no per-boss CC profile,
  no phase barks.

## Part 2 — The laws

### LAW 1 — THE CROWN RIDES THE KIT (no second brain)
The boss system is a LAYER on `NpcDef` + the kit engine, never a parallel
executor. A boss is an NpcDef with a `boss` block. Every boss ability is a
kit entry; every cast walks THE FOE'S BREATH; every telegraph speaks the
shipped grammar; every death walks `killNpc`. The dumbest possible reading
holds: remove the `boss` block and the def degrades to a lawful champion.

### LAW 2 — THE CROWN (content schema)

```ts
interface NpcBossDef {
  title?: string              // "Warden of the Sunken Court" — nameplate line
  phases: BossPhaseDef[]      // 1..4, hpBelow strictly DESCENDING, one-way ladder
  knockbackMult?: number      // 0 = immovable, 1 = ordinary flesh (default 0.25)
  stunMult?: number           // scales shock stunLeft: 0 immune, 1 ordinary
                              //   (default 0.5); >1 = an authored WEAKNESS
  arenaR?: number             // leash override; break = walk home + full heal
                              //   + crown reset (the honest wipe)
  engageBark?: string         // spoken aloud when the fight truly starts
  defeatBark?: string         // last words at the kill
}

interface BossPhaseDef {
  hpBelow?: number            // (0,1); absent only on phase 0 (the opening stance)
  name?: string               // "The Breaking" — client phase reveal
  bark?: string               // sayAloud on entry — the public voice
  entry?: string              // ability id cast FREE on phase entry (own windup
                              //   still telegraphs it; the phase turn is loud)
  cdMult?: number             // kit cooldown scale this phase (tempo rises,
                              //   floor 0.5) — the fight accelerates honestly
  speedMult?: number          // 0.75..1.5 movement dial per phase
}
```

Kit entries grow two optional gates (validator + KIT contract extended):

```ts
  phase?: number              // wakes at this phase and after (0-based)
  phaseMax?: number           // sleeps after this phase (an early voice retired)
  then?: string               // THE CHAIN: after this fires, the named entry is
                              //   queued next (cooldown waived, its OWN windup
                              //   still telegraphs). Chains cap at 3 links,
                              //   acyclic, validator-enforced.
```

### LAW 3 — THE TURNING (phase state machine)
- `NpcComp` grows an optional bank (`bossPhase?`, `bossChain?`, `bossLastIdx?`)
  — the spawn literal is untouched (the sanctioned idiom).
- Phase = highest ladder rung whose `hpBelow` the live HP fraction has crossed;
  evaluated at the top of the chase branch, before the kit pick. **One-way**:
  healing never demotes (a mended boss keeps its fury).
- On entry: bark (`sayAloud` — bubbles + log, the boss taunt the speech-bubble
  header always anticipated), free `entry` cast through `beginNpcCast`
  (cooldown waived, windup honest), phase fx moment, meta re-send so the
  banner turns.
- Arena break or full leash reset walks home, heals to full (the shipped
  `return` law), and RESETS the crown: phase 0, chains cleared, cooldowns
  re-seeded. No door-cheesing a half-dead boss.

### LAW 4 — THE UNREPEATED HAND (selection, the boids principle)
No scripts, no rotation tables. Small mechanisms compose:
- **Recency**: the last-fired entry's weight is quartered on the next pick —
  variety is structural, not authored.
- **Chains** (`then`) give authored two-and-three-beat combos; the chain queue
  outranks the weighted pick but each link still telegraphs itself.
- **Gates** (range band, hp band, phase band) shape eligibility per moment.
- Emergence: pressure the boss at range and its close voices sleep; burn it
  to a phase turn mid-chain and the new stance re-deals the hand. Each fight
  orders itself differently because the PLAYER's choices shape eligibility.

### LAW 5 — THE STUBBORN CROWN (CC profile)
- `knockbackMult` folds at the one knockback site in `damageNpc`; `stunMult`
  scales `stunLeft` at `applyStatusToNpc`. Statuses still LAND (burn burns,
  chill chills — resist/weak stays the NpcDef channel); only the HARD control
  is dialed. A boss that cannot be shoved can still be frozen slow.
- Defaults (0.25 / 0.5) keep counterplay real but end stun-lock and
  knockback-juggling; an authored 1.0+ is a designed weakness the content
  team can hang a fight on.
- Casting while phased is still shock-interruptible exactly as far as
  `stunMult` allows — the interrupt school keeps its jab at susceptible
  bosses and learns to respect immune ones.

### LAW 6 — THE PRICED CROWN (balance)
THE TELEGRAPH PREMIUM binds boss entries exactly as it binds trash — the
contract test runs over boss kits unchanged, entry casts included. Boss dice
climb only behind warning. Adds pressure rides the shipped summon caps. No
new damage door, no boss-only multiplier: a boss is priced by its kit, its
hp, and its tempo, all authored, all contract-tested.

### LAW 7 — THE DREAD BANNER (presentation)
- `EntityMeta` gains additive `boss?: { title?, phases, phase }` (re-sent on
  phase turn). The binary snapshot record is NOT widened (v29 lesson); hpPct
  already ships.
- Client: a screen-top boss banner while a boss holds you in its fight —
  name, title, chamfered hp gauge, phase pips that gutter as they pass, phase
  name reveal on the turn. Brutalist grammar, tokens only.
- Barks render free through the shipped speech-bubble lane (`sayAloud`
  already anchors words over heads).
- Phase turns get a moment: existing `howl` fx kind + a beat of gathered
  stillness — no new fx kind unless a bespoke voice earns one.

### LAW 8 — THE COMPOSED COURT (content doctrine)
Bosses are authored, never generated. v1 composes kits from the 27 shipped,
fully-faced NPC voices (every one already carries FX face + spell plate +
breath dialect — the both-ways contract stays green for free). New bespoke
voices join the wave only WITH their full art (face, plate, dialect,
signature) per the enemy-arts law. Creature logic holds: the dead speak cold
and bone, goblinkind fire and cunning. Content-boundary rule holds.

## Part 3 — Phases

1. **THE CROWN AND THE TURNING** — schema + validator + contract tests; the
   phase machine, chains, recency, CC dials, arena reset in the server; pure
   selection logic in its own module (`bossMind.ts`) with thin gameServer
   seams (shared-tree discipline: a peer session is live in gameServer.ts).
2. **THE DREAD BANNER** — EntityMeta additive block, boss bar + phase pips +
   reveal, engage/defeat moments, barks live.
3. **THE FIRST CROWNS** — two bosses on the rail, composed from shipped
   voices: a melee charger (dungeon: The Fallen Champion recrowned) and a
   caster-summoner (stronghold seat); loot honored through existing named-
   spawn purse + boss chests.
4. **THE PROVING** — `bossMind.test.ts` engine pins + KIT contract
   extensions + `prove:boss` live receipts (phase turn, chain, immunity,
   arena reset, bark, banner meta).

## As built (2026-08-14, one session — the canonical record)

**ALL FOUR PHASES SHIPPED** (ee1cbcb THE CROWN AND THE TURNING →
cda58cc THE DREAD BANNER + THE FIRST CROWNS → the proving commit).
`npm run prove:boss -w @arx/tools` = **17 live receipts, run twice on
fresh worlds** (PORT 8796 + fresh DB_DATABASE per run — THE FRESH
WORLD LAW; a spent court keeps its leftovers and a reset boss is
eternal by the arena law, so each fight section claims its own court).

Phase 1 as authored, plus deltas learned in the field:
- `tickBossCrown` broadcasts the meta re-send and a `summon`-ring
  moment at the turn (Phase 2 pulled forward into the turn site).
- **THE ARENA HOLDS THE CROWN** (proving finding, live): a standoff
  crown's own backpedal marched it over its arena rim — self-leash,
  full heal, crown reset, mid-fight. `bossAtArenaRim` now plants a
  crowned body at the rim guard band (outward-bound steps only;
  inward retreat is always free; plain flesh never planted). Both
  retreat sites (standoff + thrower backpedal) fold it.
- Meta: `EntityMeta.boss {title?, phases, phase, phaseName?}` —
  additive, still v30, changelog-recorded; re-sent through
  `broadcastMetaUpdate` (the one meta door) on turn and arena reset.
- Client: `ui/bossBanner.ts` + `styles/boss.css` (tokens only; felled
  beat 2.2s; reveal rides `phaseName`; QUIET-WIRE-tolerant hp read).
- Crowns: `skeleton_fallen_king` (crypt seat, sweep→slam chain,
  raise-the-fallen court) + `goblin_flame_tyrant` (goblin capital
  seat, cinder-ring rally, stunMult 1 = the authored weakness). Both
  wear bespoke dialect looks (rig.ts ladders) — the goblin/skeleton
  look contract tests enforce this for every future crown.
- Loot: the flood law learned `npc.boss !== undefined` = boss station.
- Tests: bossMind.test.ts 13 engine pins, npcs.test.ts crown+chain
  validator pins, content.test.ts DREAD CROWN contract (authored
  crowns walk the CMS validator whole).

**Proving lessons banked** (they will bite again): `t:'use'` not
'useItem' (the whitelist drops unknowns silently); THE QUIET WIRE
means staleness is silence, never absence — jiggle to re-read a still
row; a vitality grant raises the CEILING not the blood (eat to full);
defence is the armor half that keeps a prover standing; the engage
bark can race a spawn-side perception tick before any interest set
holds the body — crouch through dev spawns (real placements never
race: bosses spawn with no players near); the 20Hz gap-filling
heartbeat (weapon-sets pattern) is required or seq-domain clocks
stretch.

## THE GRAND SHOW — the refinement pass (2026-08-14, second session)

The user's mandate: walk the crown again at the artisan bar — soundness
review, "tons of visual appeal and effects," then more crowns. Findings
and deltas:

**Presentation raised (all shipped grammar, no new wire kinds):**
- **THE ETCHED GATES**: `EntityMeta.boss.gates` (additive, the shorn
  precedent) carries each later rung's hpBelow; the banner etches a
  hairline notch at every gate so the coming turn is a read, never a
  surprise. Crossed gates dim to spent. Proven on the wire (receipt 1).
- **THE TURN PULSE**: the banner takes the blow when the fight turns —
  ember flash over the gauge, a breath of scale punch, and the standing
  pip IGNITES (lands hot at 1.9×, settles). All motion transform/opacity,
  all stilled under `body.no-ui-motion`.
- **THE DREAD PRESENCE** (`renderer.crownAmbience`): a crowned body
  bends the air — low ground-glow in the def's color plus sparse rising
  motes, both deepening per phase rung. Keyed purely off
  `EntityMeta.boss`; plain flesh pays nothing.
- **THE FELLING** (`main.ts onDeath`): a crowned death is a ceremony —
  46-grain burst, a rising ember column, a late pale echo ring, and the
  camera exclamation (shake 7, hitstop 0.12, zoom, full rumble) reading
  across the whole arena (18 tiles), not just at your feet.
- **The turn's moment**: the summon ring now layers a `nova` (power
  stepping up + its camera punch). **The engage**: a `buff` flourish
  (runes orbiting the body) marks the court opening for the eyes as the
  bark marks it for the ears.

**Three new crowns (LAW 8 held: composed only from shipped faced voices,
each with a bespoke authored look):**
- **`gnoll_matriarch`** — the cacklefort's seat (gnoll stronghold
  `bossNpc`, was a plain packlord). Skirmisher crown: rending_lunge
  `then` ravening_cackle (jaws through you, and the laugh that follows
  RAISES THE WARBAND), gnawed_mending below 0.45 hp (28% back unless the
  breath is broken — the fight's test). Weakness: knockbackMult 1.1 (light
  on her feet), stunMult 0.75. Look: night-dark coat under the ONE cold
  crest in the species (deliberate, wider-than-law value gap); GNOLL_SIZE
  1.55 — she looms over her own packlords.
- **`skeleton_barrow_lord`** — the gravecourt's seat (dead stronghold
  `bossNpc`). THE ANTI-KING: standoff chanter-king, grave_mist `then`
  bone_volley (the ground is the argument), raise_the_fallen at the wake,
  ground_slam only in The Long Toll. Weakness: knockbackMult 1.2 — the
  most movable crown (dry bone is light); stunMult 0.4 (the dead don't
  stagger). Look: barrow-violet bone, marsh-light sockets, grave-silver
  circlet, UNCRACKED (nobody ever sat him down).
- **`anvil_golem`** — the mine dungeon's deep seat (was a renamed troll).
  The only IMMOVABLE crown (knockbackMult 0) and the most interruptible
  (stunMult 1.5 — iron carries the storm to its joints): anvil_fall
  `then` drawn_bolt (the anvil takes the ground, the bolt takes the
  leaving), quarry_ring close, hillstone_throw from phase 1. Iron build,
  deep-mine colorway (silver accent — the crown wears what the miners
  came for); GOLEM_SIZE 1.68, still under the ice (the stature law holds).

**Proving grew to 20 receipts** (S4 THE NEW COURTS: each new crown's
ladder + gates ride the wire whole), run ×2 on fresh worlds
(arx_prove_boss_9, _10). Art-contract lesson: the gnoll test's dark-fill
heuristic counts any `#2x` fill as face-dark — `shade()` is ADDITIVE, so
a crown coat must keep every derived plane (fur −20, skin −46) above
`#30` red. The matriarch's palette is calibrated to the exact band.

**Seats still renamed trash (the next docket, recorded not filled):**
cavern's "Broodmother" (giant_spider — needs spider voices before a
lawful crown), stronghold-theme dungeon's "Hold-Warden" (troll), the
brigand/wolfkin stronghold seats (brigand_reaver / dire_wolf).

## THE BROTHERHOOD — the wolf crown and THE LOPE (2026-08-14, third session)

The user's mandate: a wolf boss with strategy and life to him — attack,
slow the player, make them bleed, then RUN BACK and call his wolf
brotherhood; a great entry-level boss that grows with the levels.

**THE LOPE (new kit-rail verb, engine law).** `NpcKitEntry.lope` marks
a voice spoken FROM DISTANCE: picked in close, the body does not wind —
it breaks away at a dead sprint (LOPE_SPRINT_MULT 1.3, head down the
flight line, never a backpedal) until the entry's `minRange` gap stands,
then plants and winds honestly. `minRange` on a lope entry is the
DESTINATION, not an eligibility gate (pickKitEntry skips the min-band
for lope voices; validator: lope requires minRange > 0). The honesty
clock (LOPE_MAX_TICKS 70) and the arena rim both end the run where it
stands — cornered or out of time, the word is spoken at the wall. The
turn's free entry honors the lope too (the run IS the ceremony for a
hit-and-run crown); a lost quarry, the leash, and the crown reset all
drop a pending run. State: NpcComp.lopeIdx/lopeUntilTick, optional-bank.
Composable by ANY body, boss or not — the hit-and-run species verb.

**Three new wolf voices** (full faces per LAW 8: FX style + spell-plate
+ breath dialect each): `hamstring_bite` (melee_arc, chill 2×80 — THE
SLOW), `call_the_brotherhood` (summon: wolf ×2, capAlive 3, levelDelta
−4 — and the summon lane scales adds to the CASTER'S spawned level, so
the brotherhood grows with the court), `throat_lunge` (dash_strike 4
tiles, bleed 2×80 — the flat silent return).

**`wolf_oldfang` — Old Fang, First of the Brotherhood** (L16, the
entry crown, the lesson boss): kit = hamstring (windup 10 — never
slips the charge emitter's 10-tick cadence), call (lope minRange 5,
rally, `then` throat_lunge), lunge standalone. The whole fight is one
lived sentence: harry → slow → bleed → break away → call → come back
through you. CC lands near-whole on purpose (knockback 0.8 / stun 1)
— this crown teaches the loop, it does not demand a school. Phases:
The Circling → The Call @0.65 (entry call, 'Brothers! To me!') → Red
Snow @0.3 (entry lunge, speed 1.2). Seats: wolfkin stronghold `bossNpc`
(tiers 3–5 — the same crown grows harder up the forts) + the wolfkin
great den POI (name pool led by 'Old Fang'). Look: OLDFANG_LOOK on the
dire-wolf painter (aged iron-grey, HEAVY frost ticking, old-gold eyes,
white-tipped brush), own BEAST_SPECS carriage, CANID-lane TailSim/
EarSim row, ragdoll dies in his own coat.

**THE FIRST BREATH (engine law, proving-found).** A freshly spawned
body's eyes open one second late (noAggroUntilTick = spawn + 20, both
spawn literals). Real placements never notice (bosses spawn with no
players near); the law closes the dev-spawn race where a fresh boss's
first staggered perception tick could open the fight — and spend its
once-per-engagement bark — before any watcher's interest set held the
body (the crouch never fully closes the floored point-blank ring, so
the old sneak-through-spawns lesson was probabilistic, not a fix).
Forced aggro (a landed blow, a summoner's call) bypasses it untouched.

**Proving = 25 receipts ×2 fresh worlds** (S5 THE BROTHERHOOD): the
wire receipt, THE HARRY (hamstring charge), THE LOPE — the call fx
leaves him ≥3.5 tiles from the prover (measured 5.3: he RAN before he
spoke), THE BROTHERHOOD COMES (real wolf bodies), THE RETURN (the
chained lunge winds). Lane lessons re-banked: receipt() demands the
explicit ok argument; S4's three standing crowns mean S5 must claim
fresh ground BEFORE eating; never rerun diagnostics against a dirtied
world — capture the log instead.

## THE WILD CROWN — the generative forge (2026-08-14, fourth session)

The user's mandate: bosses must not all be pre-authored. Core mechanics
stay authored; VARIANTS are forged — a goblin champion crowned in one
war-camp fights differently from the same champion crowned in another,
with different voices, ladders, temperaments, and names. Modular,
architectural, never a dice roll bolted onto a spawn table.

### The laws

- **LAW W1 — THE FORGE COMPOSES, IT NEVER INVENTS.** Every part a
  forged crown is built from is AUTHORED: family voice pools (faced
  voices only), authored chain pairs, ladder archetypes, CC
  temperaments (each an authored weakness story), bark/name/epithet
  pools. The seed chooses and jitters WITHIN authored bounds; it never
  synthesizes a mechanic. Emergence comes from composition — the same
  boids principle that built the crown itself.
- **LAW W2 — GENERATED CONTENT WALKS THE SAME GATE.** `forgeCrown`
  output must pass `validateNpcDef` whole — every boss-block law,
  chain law, and kit law an authored crown obeys. The fuzz contract
  (crownForge.test.ts) drives hundreds of seeds per pool through the
  validator; one failing seed fails the build.
- **LAW W3 — THE SEED IS THE SOUL.** Same base + same seed = the same
  crown, forever (name, kit, ladder, temper — bit-stable via the
  shared mulberry Rng). A camp's crowned champion is a STABLE foe the
  player can learn, not a re-roll per visit; seeds derive from world
  coordinates, so the world itself names its tyrants.
- **LAW W4 — THE BODY IS THE BASE.** A forged crown keeps the base
  def's `id`: every dialect look, stature table, and art contract keys
  off the body that earned them. The forge touches BEHAVIOR and
  identity words only. Zero client changes — the banner, presence,
  felling, and barks all ride the wire the authored crowns built.
- **LAW W5 — AUTHORED OUTRANKS FORGED.** A def already wearing a
  `boss` block is refused by the forge. Named authored crowns (the
  king, the tyrant, Old Fang...) are the fixed stars; forged crowns
  fill the wild between them.

### The parts

- `packages/content/src/crownForge.ts` — CROWN_POOLS (goblin,
  skeleton, gnoll, wolfkin to start), TEMPERS (immovable / stubborn /
  light / lesson — kb+stun bands), LADDERS (rising_court needs a
  summon voice, headlong ramps tempo+stride, skirmisher needs a lope
  voice), and `forgeCrown(base, seed, opts) → NpcDef` (pure).
- Seats: `ZoneSpawn.crown?: number` (the seed) threads through
  registerSpawns → the ONE instantiation seam forges after the level
  reissue (`scaleNpcDef` first, so the crown rides the seat's level;
  spawn-name pools survive as the given name — the forge appends its
  epithet). POI content: `PoiGarrisonEntry.crowned?: true` on named
  holdfast rows → the composer stamps `crown = hashCoords(site...)`.
- Dev verb `/forgecrown <baseId> [seed]` — deterministic proving.

### As built (same session)

Shipped as designed; the fuzz contract runs 400 seeds per pool through
`validateNpcDef` whole, plus determinism (bit-equal re-forge; the soul
holds across level reissues), variance (≥20 names / ≥20 tempers / ≥3
hands per 100 seeds), and LAW W5 refusal pins. First crowned seats:
goblin_warhold (goblin_champion), wolfkin_den (dire_wolf), gnoll_squat
(gnoll_champion) — each site's tyrant is stable and named. A seat-given
name ('Varga Nine Teeth') is kept WHOLE — only pool-drawn first names
get epithet-signed, and the naming choice never moves the seed stream.

**Proving = 30 receipts ×2 fresh worlds** (S6: the desk-predicted soul
on the wire — 'Gorbash Camp-Burner' from seed 4242 twice, 'Ratbane the
Unbowed' from 777 — and a forged crown fighting whole: engage bark +
banner turn at its generated gate). Lane laws learned:
- **THE EDGE OF THE GATE**: `pct(gate)` can round a hair ABOVE the
  fraction itself (166/255 > 0.65) — gate-crossing wounds pass
  `pct(gate) − 2`, never the raw edge.
- **THE UNSTICK**: the prover's chase is straight-line and terrain is
  rolled; 12s without wound progress steps the prover to the quarry —
  the chase is not under test, the fight is.
- **MEASURE AT CAST BEGIN**: a chasing observer closes the whole lope
  gap during the windup itself — the summon-fx position lies about the
  flight three different ways (walled courts, natural-cycle calls,
  windup closure). The charge fx marks where the wind STARTS; that is
  where the gap must stand.

## Open questions (recommendation first; proceeding on recommendations)

- **Enrage timers?** REC: no — tempo (`cdMult`) is the honest pressure; a
  hidden clock is the opposite of the telegraph religion. Future door.
- **Boss-only loot channel?** REC: not in v1 — the named-spawn purse +
  boss-chest ladder already pays; a `boss_trophies` table is a content-team
  door once sigil breadth grows.
- **Multiplayer scaling?** REC: out of scope v1 (no group scaling exists
  anywhere); record as a standing door.

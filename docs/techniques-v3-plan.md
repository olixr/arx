# The Mastered Hand — techniques v3

Status: **PROPOSED 2026-09-05.** Phase 0 (the census) is complete and
recorded below. Phase 1 (the engine) is built by the main session;
Phases 2–4 run as one workflow each, one at a time, under the token
thrift law (docs: memory `token-thrift-thorough-close`).

The brief (owner, 2026-09-05): the techniques feel like button mashing —
"some quick effect, something that just blasts off, nothing that portrays
its meaning". Combat is bursty and instant; nothing rewards setup, timing,
or combination. The ask: audit every technique against the RPG toolkit
(AoE, DoT, casted, channeled, buffs, CC), rebuild the homogeneous ones
from their foundation, add setup→payoff combos, precast openers, channeled
strength, zones that stay and burn, crowd control, heroic weight; make the
fight strategic and earned; then give every rebuilt art its own mastered
voice. Two seats slot today; three or four will later, so arts must
compose across schools.

## Part 0 — THE CENSUS (verified against HEAD, 2026-09-05)

Script: `scratchpad/census.ts` over `ABILITIES`/`TECHNIQUES`/`SECRET_ARTS`
with the ladder model's own `cycleValue`.

**Roster.** 328 player techniques: 195 ladder rungs, 10 unwritten pages,
123 secret arts; 121 further abilities are relics, sigils, NPC arts, green
arts. Nine combat schools at 20 seats (onehand/arx 20, the rest 20 via
THE SECOND BREATH), polearm 20, beastcraft 10, farming 5.

**Delivery.** 227 instant / 48 casted / 53 channeled. Rungs: 101 instant,
46 cast, 48 channel. Secrets: 118 of 123 instant.

**The mould.** Every combat school walks the SAME 21-rung template:

| rung | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 54 | 58 | 62 | 66 | 70 | 74 | 78 | 82 | 86 | 90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| grammar | instant | CAST 18t | dash | CHANNEL 48/16 | instant | CAST 20–22t | self_buff | CHANNEL beam 48/16 | instant | CAST 22–24t | self_buff | CHANNEL 64/16 | instant | CAST 20–24t | execute ×~2 @0.3 | CHANNEL 64/16 | instant | CAST 24–26t | CHANNEL 64/16 | capstone |

Nine schools × one template = palette swaps. Cooldowns 150–260t, damage
3–16, every channel 48 or 64 ticks at 16 per beat, every execute at 30–35%
for ×1.8–2.2, every self buff a stat nudge (shield/armor/speed/lifesteal)
for 100–160t. The rank notes differ; the mechanics do not.

**Statuses.** 156 techniques carry a status; every one is one of the
frozen six (burn/chill/shock/bleed/venom/sunder) at power 1 for 30–90
ticks (1.5–4.5 s). The wider wound (root/stagger/weaken/quicken/mend/
stonehide) is engine-complete and has ZERO player appliers (the register
in `statusWave.test.ts` licenses eight crowns and the basilisks only).

**Combos.** The `vs` clause (buildcraft's reading edge, with `consume`)
exists on exactly 3 of 328 techniques, all beastcraft. Three reactions
exist, all spark pairs (Thermal Shock, Combust, Shatter). No technique
reads another technique. No mark, no detonation, no follow-up, no window,
no finale, no aftermath. A fireball does not leave fire.

**Control.** Knockback (push, and the pull as negative knockback) is the
only control a player wields beyond chill's 0.55 slow and shock's short
hold. No root, no stagger, no weaken by player hand.

**What the toolkit already holds (do not rebuild).** Cast engine (THE
DRAWN BREATH: wind-up, planted ×1.25, pay-at-fire, cancel roster);
channel engine (THE HELD NOTE: stand-still pulses with live aim or staked
point); ground fields (`ActiveField` with status + vs); fused blasts with
telegraphs; the held sigil (hold-to-aim); the status book (12 pages,
fold table, per-source stacking, count nibble); reactions; `vs`/consume;
summons (totem/trap/decoy/bait + npc adds); execute, drain, taunt,
pierce, homing, chains, returns, flurries, pulse novas; honed ranks I–IV;
the ladder pricing model with three balance constitutions (RELEVANCE ±20%,
PAYOFF BRACKET, SECRET BAND) and the status ledger (HOLD BUDGET ≤10% duty,
telegraph ≥ half the lock).

**Verdict.** The engines are there. The CONTENT never learned to use them
together, and the pricing model prices only what one press does to one
body. The rebuild is: a small engine of relationships between presses
(Phase 1), then every school re-authored on its own grammar with roles
and combos (Phases 2–3), then every art's voice rebuilt on the composed
particle library (Phase 4).

## Part 1 — THE LAWS

1. **THE THREE-ACT ART.** Every damage art is one of five ROLES and says
   so in its def (`role`): `opener` (a setup that brands, slows, roots,
   pulls, or plants a zone — its own damage is modest), `payoff` (reads a
   state and spends it — consume, follow, execute), `sustain` (a channel,
   a field, a pulse train that holds ground or a line), `answer` (the
   defensive, mobility, or utility beat), `crown` (the capstone
   spectacle: a three-act art in one press). A school's twenty seats hold
   at least 4 openers, 4 payoffs, 4 sustains, 3 answers, 1 crown; no two
   adjacent rungs share a role; the first four rungs (5–20) hold one of
   each of opener/payoff/sustain/answer so a level-20 player already owns
   a combo.

2. **THE FOLLOW-THROUGH.** An art may declare `tag` (its school word:
   `brand`, `rend`, `chill`, `plant`, `stagger`, ...) and `follow: { after:
   tag | tag[], windowTicks, damageMult?, radiusMult?, status?, refund? }`.
   The server remembers each player's last landed art (`lastArt: { tag,
   tick }`, stamped at FIRE). A follow art cast inside the window speaks
   its follow bonus; the hotbar shows the open window on the well. Windows
   are 2–4 s. Pricing credits the bonus at HALF (the model assumes a
   player lands the combo every other cycle).

3. **THE READING EDGE, AUTHORED.** `vs` + `consume` become the school
   payoff grammar: rend consumes bleed, shatter consumes chill, combust
   consumes burn, the executioner reads sunder, the keeper reads venom.
   Reactions stay arx's cross-element gift. Consume payoffs price the
   spent state's remaining worth at half (it was already paid for).

4. **THE AFTERMATH.** Any blast/nova/leap/arc/beam may declare
   `aftermath: { fieldTicks, everyTicks, damage, radius?, status?, self? }`
   — the press resolves, then the ground keeps burning (a standing
   `ActiveField` at the impact point, radius defaults to the blast's).
   One field per press. The client's composed library already speaks
   standing zones on `every`; ground marks char and frost the floor under
   them. Priced as a field's pulses at the model's 0.45 connect factor.

5. **THE HELD GROUND.** A field may carry `self` — the caster standing
   inside their own zone wears the boon (armor, shield, speed, a status
   page). Shield's line, combat's rally, polearm's formation, the arx ward
   circle. Re-applied each pulse while inside; ends with the field.

6. **THE FINALE.** A channel may declare `finaleMult` — the LAST beat hits
   at that multiple (2–3×). The player who holds the whole note is paid
   for the commitment; the player who breaks it early keeps only the
   quiet beats. The model prices the finale beat once. Rank IV steps that
   "add a beat" now add the finale, not one more quiet pulse.

7. **THE RED LEDGER.** `onKill: { refundTicks }` — a kill landed inside
   40 ticks of firing the art refunds that much cooldown to its seat.
   Executes and openers wear it; the fight chains when the player reads
   HP. Implemented at the one death door via a per-player pending window
   (no ability id threaded through the damage carriers).

8. **THE FAIR HANDS, KEPT.** Player-wielded root/stagger/weaken join the
   register consciously, one licensed applier at a time, every one under
   the HOLD BUDGET (a hold ≤10% of the art's cycle; a full telegraph —
   cast wind-up or fuse — ≥ half the lock). So every player hold is a
   CASTED or FUSED art by law: crowd control is the casted grammar's
   reward, never an instant. Players are never held by shock (page law).

9. **THE ENVELOPE STANDS (v1).** RELEVANCE ±20%, PAYOFF BRACKET, SECRET
   BAND, HOLD BUDGET stay the merge gates; the pricing model learns the
   new fields (Part 3) so nothing escapes the band by being new. No NPC
   HP move in Phases 1–4. THE PACE DIAL (slower, more deliberate fights)
   is Phase 5's single explicit decision — see Part 5.

10. **THE FLOURISH CONTRACT, KEPT.** Ids stay (plates, faces, signatures,
    saved seats all key on them); mechanics under an id may change
    wholesale, and the rank notes and desc are rewritten to speak the new
    art. A NEW id ships with face + plate + signature + plan in the same
    commit, capped at three per school per wave. Retired arts are
    reforged under their id, never deleted (saved loadouts).

11. **ONE INTERPRETER, TWO MOUTHS.** New fields land in `castAbility` and
    the NPC-safe set together; nothing forks the executor.

## Part 2 — THE SCHOOL GRAMMARS (the spine each workflow agent builds on)

Each school gets ONE sentence of identity, its tag vocabulary, and its
signature combo. The agent writes the twenty seats on this spine; the
spine is the test of homogeneity ("would this art make sense in any other
school? then it is not finished").

- **onehand — THE DUELIST'S TEMPO.** Reads the foe's rhythm: openers
  stagger and sunder (fused, casted), payoffs riposte inside the window,
  sustain = the millwork press, answers = the step and the guard. Tags:
  `stagger`, `sunder`, `riposte`. Signature: Cold Iron (casted, roots the
  ring) → Headsman's Stroke (reads root: execute threshold doubles).
- **archery — THE PATIENT EYE.** Marks and distance: openers brand (a
  `brand` status? no — brand = sunder page, archery's word) and plant
  (snare fields), payoffs read the brand from range (Kingshot's full draw
  ×2 on a branded body), sustain = the staked volleys and the harrier's
  loop, answers = the tumble and the smoke. Tags: `brand`, `plant`,
  `loose`. Signature: Hawk's Hour (casted, brands the ring) → Twin Strike
  (consumes brand: both shafts pierce).
- **arx — THE ELEMENTAL LEDGER.** Reactions are the grammar: openers lay
  one spark (burn/chill/shock) wide and CHEAP, payoffs lay the second
  spark on a body already sparked (Thermal Shock/Combust/Shatter fire
  through the existing table) and leave aftermath (fire on the ground,
  frost sheets, static fields), sustain = beams with finales, answers =
  blink, ward, mirror. Tags: `burn`, `chill`, `shock`. Signature:
  Wickfire (cast, burn + aftermath fire field) → Frost Lance (chill on a
  burning body = Thermal Shock AoE) → Arc Bolt (shock on the chilled =
  Shatter stun).
- **sneak — THE OPENED VEIN.** Afflictions stack per source; openers
  envenom and expose from stealth, payoffs consume bleed/venom stacks
  (Rend's tithe), sustain = caltrops and the bloodletting note, answers
  = smoke, feint, the ghost step. Tags: `venom`, `expose`, `vanish`.
  Signature: Nightshade Kiss (cast, venom ×2 sources) → Exposing Strike
  (sunder) → Thousand Cuts (reads venom: every cut ×1.5, consume on the
  last).
- **shield — THE HELD LINE.** Holds ground: openers taunt and stagger
  (fused Iron Toll), sustain = Hold the Line as a HELD GROUND field
  (armor + reflect while standing in it) and the millwall note, payoffs
  = the counter (Turned Blow's reflect window → Rampart Break reads
  stagger), answers = the roof, the rush. Tags: `stagger`, `taunt`,
  `wall`. Signature: Hold the Line (plant the ground) → Iron Toll (cast,
  stagger ring) → Rampart Break (follow: after stagger, ×2 + sunder).
- **twohand — THE FALLING WEIGHT.** Momentum and the earth: openers are
  casted giant blows that stagger and crack (sunder), payoffs read sunder
  (Executioner's Arc, Skysunder ×2 on sundered), sustain = Whirling Ruin
  with a finale, Fault Line with aftermath (a rift field), answers =
  Colossus Stance (stonehide self-page). Tags: `stagger`, `sunder`,
  `quake`. Signature: Fell Timber (cast, stagger) → Gravedigger (pull +
  sunder) → Skysunder (consume sunder: ×2.2).
- **dualwield — THE WEAVE.** Flow and windows: nearly every art follows
  another (short windows, small multipliers, many links), bleed stacks
  per hand, quicken is the self-page (a stacking `quicken` on each
  landed follow), payoffs = The Shears (consume bleed), sustain = The
  Weave with a finale, answers = Mirrored Hand, the swallow's dive. Tags:
  `left`, `right`, `rend`. Signature: Twin Cut (left) → Two Bells (right
  follows left: ×1.5) → Turning Reel (follows right: quicken stack).
- **combat — THE VETERAN'S ROAD.** Shouts and rally: openers weaken
  (War Shout, fused) and break the line (stagger), sustain = Long Watch
  as a HELD GROUND (allies... at v1 the caster) and Drumbeat with a
  finale, payoffs read weaken/stagger (The Opening ×2 on weakened),
  answers = Second Breath (mend page), Hold Fast (stonehide). Tags:
  `weaken`, `stagger`, `rally`. Signature: War Shout → Break the Line →
  The Opening.
- **polearm — THE REACH.** Distance control: openers hook and root
  (Hooking Reap pulls + roots, fused), payoffs skewer the rooted (Perfect
  Thrust ×2 on root), sustain = Wall of Points as HELD GROUND (the
  formation: speed −, armor +), Serpent's Tongue finale, answers =
  Vaulting Step, Banner Advance. Tags: `root`, `hook`, `line`.
  Signature: Hooking Reap → Perfect Thrust → Sundering Lance (follow:
  after root, pierces the line).
- **beastcraft** keeps its shipped grammar (companion words); the
  workflow adds `follow` between the keeper's word and the fang
  (Point the Fang inside 3 s of Come to Heel: the fang bites ×1.5) and
  nothing else. **farming** untouched.

## Part 3 — THE ENGINE (Phase 1, main session)

Shared (`shared/sim/abilities.ts`): `AbilityDef.role?`, `tag?`,
`follow?`, `aftermath?`, `finaleMult?`, `onKill?`; `ActiveField.self?`
mirrored from `AbilityDef.self` on `ground_field` defs and on aftermath
defs (`aftermath.self`). All honable (`HONABLE` grows). `NPC_SAFE_SHAPES`
unchanged (the new fields are inert `fromNpc`: NPC arts never follow, an
NPC aftermath is allowed and pulses `blastPlayers` exactly as a field).

Server (`game/gameServer.ts`):
- `PlayerComp.lastArt?: { tag; tick }` stamped in `fireAbility` after a
  successful cast (and at `beginChannel`); `followOf(player, ab)` resolves
  the live bonus once per cast and threads `damageMult`/`radiusMult`/
  `status` into the shape switch through the existing `maxHit`/`radius`/
  `ab.status` locals (one resolved `eff` def, never a second executor).
- Aftermath: in `tickBlasts` (ground_aoe/leap/arc), the `nova` case, the
  `beam` case, and `melee_arc`, after the strike resolves push an
  `ActiveField` from `ab.aftermath` at the impact point and broadcast the
  `field` fx (kind `field`, id `${ab.id}`, so the plan's standing cue
  re-speaks on `every`).
- Held ground: `tickFields` applies `field.self` to the owner when inside
  the radius (the self_buff door's exact fold, `durationTicks` =
  `everyTicks + 2` so it lapses the beat after leaving).
- Finale: `tickChannel`'s last beat multiplies the pulse damage by
  `finaleMult`; the wire `S2CAction`/fx carry nothing new (the plan's
  final cue is the client's read: `atFar`/`at` on the last beat via the
  existing per-cue schedule).
- Red ledger: `PlayerComp.killRefund?: { slot; ticks; until }` set at
  fire when `ab.onKill`; the NPC death branch in `damageNpc` checks the
  attacker's window and refunds the seat's cooldown.
- Interrupt: stagger joins shock in the NPC cast-cancel list (a staggered
  caster loses its breath).

Content model (`content/ladderModel.ts`): `cycleValue` learns aftermath
(field pulses × 0.45), follow (bonus × 0.5), finale (one beat at
`finaleMult` − 1), onKill (refund × 0.25 of cycle), held ground self
(priced as the self-buff lane prices it — 0 in the damage band; band-
exempt utility if the field deals < 3). `statusValue` unchanged.

Register and ledger: `statusWave.test.ts` LICENSED grows per applier the
school waves author (the workflow agents list theirs; the main session
adds the licenses at gate). `statusLedger.test.ts` HOLD BUDGET pins run
unchanged and must pass — that is the CC price.

Client (Phase 1 keeps it minimal, Phase 4 dresses it): codex bench rows
speak the new grammar (`Follows: after <tag> (Ns)`, `Leaves: <status>
ground Ns`, `Finale ×N`, `On kill: refund Ns`, `Standing in it: ...`);
hotbar well shows the follow window (`.open` class while `lastArt` tag
matches and the window stands — `S2CTechniques`/`S2CAction` carry
`lastArt` additively). Tests: `followEngine.test.ts` (window, stamp,
half-credit pricing), `aftermath.test.ts`, `finale.test.ts`,
`redLedger.test.ts`, ladder model pins.

## Part 4 — THE WAVES (one workflow at a time)

**Phase 2 — THE NINE SCHOOLS** (one workflow, 10 agents: nine combat
schools + polearm; beastcraft's one follow and farming by the main
session). Each agent owns exactly its ladder rows in
`content/src/abilities/ladders.ts` (+ `breaths.ts`/`polearm.ts` where
its arts live) and its rank steps in `techniqueLadder.ts`. Writes:
role per art, tags, follows, aftermaths, finales, consumes, CC under the
budget, rewritten desc + four rank notes in the register (THE PEOPLE
SPEAK), one rationale line per art, a ledger of licensed appliers. Gates
in-agent: `ladder.test.ts`, `statusLedger.test.ts`, `content.test.ts`,
tsc. Proof: `census.ts` diff (no two schools share a rung template; the
role quota; every school has a three-press signature that resolves in
the model). Report ≤ 600 words. The main session gates the merge with
the whole content suite and the register.

**Phase 3 — THE SECRET SHELF** (one workflow, 5 agents by school over
123 secrets + `secretRanks.ts`): same grammar, SECRET BAND kept; secrets
are the cross-school spice — each one must combo with at least one rung
of ANOTHER school (the free hand's point).

**Phase 4 — THE VOICE** (one workflow, 10 agents by school): every
rebuilt art's plan re-curated against its new mechanic on the composed
library — openers brand visibly (a mark that STAYS on the body until
spent: the status ambience wing), payoffs detonate the mark (consume
cues), aftermath zones stand and char the floor, finales crescendo, the
follow window glows on the well and on the body, the crown is a three-act
spectacle. New library effects where the story needs them (brands,
detonations, rifts, formations). The owed eye-judgment pass rides here:
every plan in-world at three delays. Gate: fx tests + the ONE-VOICE
contract + stress receipt.

**Phase 5 — THE PROVING + THE PACE DIAL.** Live receipts on the rig for
every engine door (follow window, aftermath, held ground, finale, refund,
stagger interrupt) and each school's signature combo landing on a real
body; then the one number decision (Part 5).

## Part 5 — OPEN DECISIONS (recommendations stand unless the owner says otherwise)

1. **THE PACE DIAL.** The brief wants fights that last and breathe. The
   rebuild moves the fight from instants to setups and payoffs without
   touching HP. Recommended second stroke (Phase 5, one commit, one
   number): NPC combat HP ×1.3 with technique cooldowns untouched — the
   basic attack's share of a kill drops, the technique's read rises,
   TTK brackets re-pinned in the same commit (combat-v2 CADENCE
   CONTRACT). Not done in Phases 1–4.
2. **Seats.** Two seats today; the plan authors every school so any two
   arts hold a combo and any four hold a whole three-act fight. The
   third/fourth seat (protocol + hotbar + pad chords) is its own short
   epic after Phase 4 — THE FULL HAND.
3. **Charm and fear** need NPC AI pages (flee, turn on kin). Recorded as
   a future door; `becalm` remains the beast-charm.
4. **Allies.** Held-ground boons reach the caster only at v1 (party
   buff plumbing is a separate door); the field's `self` name is honest.

## As built

(Phase ledgers land here as each ships.)

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

### Phase 1 — THE ENGINE OF MASTERY (2026-09-05)

Shared (`sim/abilities.ts`): `AbilityRole`/`ABILITY_ROLES`, `FollowDef`
(`after`, `windowTicks`, `damageMult`, `radiusMult`, `status`,
`refundTicks`), `followMatches`, `FOLLOW_WINDOW_MAX` 80, `AftermathDef`
(`fieldTicks`, `everyTicks` 16, `damage`, `radius`, `status`, `self`,
`knockback`), `KILL_REFUND_WINDOW_TICKS` 40; `AbilityDef` gains `role`,
`tag`, `follow`, `aftermath`, `finaleMult`, `onKill`. Wire:
`S2CCooldowns.open?: { tag, age }` (additive, no protocol bump).

Server (`game/gameServer.ts`): `PlayerComp.lastArt` / `killRefund`;
`ChannelAction.follow`; `PendingBlast.aftermath`; `ActiveField.self/
selfId/selfColor`. Module-level `resolveFollow` / `withFollow` /
`stampArt` (THE SLATE-TEST LAW: the cast and channel doors are slate-
driven; new METHODS on those doors break every pin — module functions
do not). `castAbility(..., follow?)` resolves a follow-adjusted def
copy at the top (same id/shape/fx face) and a single `powerK`; the
aftermath is left at melee_arc (a stride ahead), nova, beam (midpoint),
leap landing, and every fused blast (`tickBlasts`, carried on the
PendingBlast pre-scaled). `tickFields`: THE HELD GROUND (`holdGround`
extends ONE buff by name — the fold table SUMS armor and shield, so a
twin would double count) and a silent zone (no damage/status/vs)
never hunts bodies. `channelPulse`: the last beat (`ticksLeft ≤
every`, the model's own beat count) multiplies `powerMult` by
`finaleMult`. `fireAbility`/`beginChannel`: resolve → refund → cast →
stamp (a follow spends the opening; a tagged art leaves its word;
`onKill` arms the ledger). `killNpc` → `settleKillRefund` (once, and a
stale ledger clears). A staggered NPC caster loses its breath like a
shocked one (`isStaggered` joins the cancel gate). `sendCooldowns`
carries `open`.

Content model (`ladderModel.ts`): `followCredit` (bonus × 0.5 uptime),
`aftermathValue` (pulses × 0.45 + one status), `finaleCredit` (one beat
at mult − 1), `cycleSeconds` (refunds shorten the cycle: kill × 0.25,
follow × 0.5; floor 1 s); HONABLE += follow/aftermath/finaleMult/
onKill. Register (`statusWave.test.ts`): `PLAYER_LICENSED` (player arts
lay wave-one pages on NPCs by license, exact page list); FAIR HANDS'
one-stagger count now walks the arts NPC kits carry (hands laid on
PLAYERS), not the whole book.

Client: `clientGame.artOpen` from the wire; hotbar wells wear `.open`
(gold breath, edge-only class writes) while a seated follow reads the
open word inside its window; tooltip speaks `follows/leaves/burns the
ground/finale/a kill gives back` (`artGrammar`); codex measures gain
Follows / Leaves / Aftermath / Finale / On a kill rows.

Tests: `server/masteredHand.test.ts` (7 pins: window + spend + refund,
outside/stranger, resolved def, finale beats, aftermath field + fx +
scaling, held ground ONE buff + silent zone, red ledger once/late);
`content/masteredHand.test.ts` (4 model pins). Gates: shared 302 /
content 625 / server 632 / client 1108, tsc ×4. Zero content authored
in this phase — every shipped art is byte-identical in the model
(RELEVANCE, PAYOFF, SECRET BAND all pass unchanged).

### Phase 2 — THE NINE SCHOOLS (2026-09-05)

One workflow (`mastered-hand-schools`, nine agents, one pass each,
brief at the session scratchpad `SCHOOL_BRIEF.md`, reports per school).
Every rung art of the nine combat schools was re-authored under its id
on its grammar spine: 46 openers / 47 payoffs / 47 sustains / 31
answers / 9 crowns; 81 arts leave a word, 75 follow one, 30 leave
aftermath ground, 39 channels carry a finale, 45 arm the red ledger,
18 read a page through `vs`, 23 lay a licensed hold or weaken (root /
stagger / weaken by license, every one casted or fused under the
player HOLD BUDGET). Rungs: 88 instant / 59 casted / 48 channeled
(was 101 / 46 / 48). Every school owns a three-press signature that
resolves in the model, and a combo by level 20. The reports (kept in
the session scratchpad) carry the one-line rationale per art.

**Main-session gate and close.** The reading edge is now PRICED
(`vsCredit`: direct × (mult − 1) at the follow uptime; `vs` honable)
and the PAYOFF BRACKET judges a press at its follow-multiplied
heaviest — both were asked by every school. Pricing them surfaced nine
breaches, tuned by hand (perfect_thrust vs ×2→1.5 + cd, kingshot
follow ×2→1.6, giantsfall follow → refund, sweeping_gyre cd, two_answers
follow ×1.2, stormcall follow ×1.2, thousand_cuts cd, skysunder consume
×2.2→1.6, the_opening vs ×2→1.5 + cd, wide_swath cd; four twohand
secrets' rank-IV cooldowns lifted 4% because the rung floor rose). The
register exempts `vs` (a reader is not an applier). Four over-long rank
notes trimmed. Three server slate pins that named literal content
numbers (daybreak's clock, heavy_slam as "an instant") now read the
def. Gates: shared 302 / content 628 / server 632 / client 1108, tsc ×4.

**Honest residue.** (1) The client breath-voice contract lists 17
arts IN_FLIGHT (`breathFx.test.ts`): they gained or lost a breath and
speak the face-derived fallback until Phase 4 authors their dialects
— a debt with a name, emptied by THE VOICE. (2) Shape changes await
Phase 4 voices: snare_shot summon→fused blast, emberhead fan→blast,
wall_of_points arc→field, haft_strike instant→channel, crescent_reap
arc→pulling nova, sundering_lance dash→casted beam, titans_verdict
pulse_nova→nova + rift. (3) The DELIVERY cadence still walks the old
I·W·I·C alternation in four schools (archery, arx, twohand, dualwield
share it exactly); the mechanics, roles and combos differ, the breath
rhythm does not — Phase 3 reseats deliveries per school identity
(archery = more staked volleys, arx = longer casts, twohand = fewer
heavier winds, dualwield = mostly instant links) inside the ≥5/≥5
floors. (4) Not live-proven: Phase 5.

**Engine asks ledger (for Phase 3).** `follow.self` (a self rider
spoken only when the follow lands — dualwield's quicken-per-link);
`follow.knockbackMult` (twohand's shove on a reeling foe); aftermath
on projectile splash, dash roads and pulse novas; HELD GROUND `self` on
channel shapes / aftermath-on-last-beat (combat's long watch, polearm's
brace); a pulling beam; consume on the LAST beat of a flurry/channel
(sneak); a sunder-consume door (`stateBucket` excludes sunder from the
present set); a follow that reads a STATUS on the target (arx
cross-school sparks); a per-field once rule for `self.heal` in held
ground; a small tag credit in the model so openers keep honest
cooldowns; a beastcraft fang that reads the keeper's follow.

### Phase 3 — THE SECRET SHELF + THE SECOND CADENCE (2026-09-05)

**3a THE ENGINE LEDGER (main session, 4cffdbb0).** `follow.self` (a boon
worn only when the link lands) and `follow.knockbackMult` (signed — a
pull deepens, never flips); aftermath on projectile shots (once: the
first body or where the shot dies, `ProjectileComp.aftermath`), on
charge roads (dash arrival), on pulse trains and flurries (the LAST
pulse); THE QUIET BEAT (`quietBeat`: a channel's beats before the last
leave no ground and spend no state — one field per note, the wound
answered once); `stateBucket` now reads sunder so `vs sunder` multiplies
over the amp and `consume` can spend the crack; beams (and, after the
shelf wave, arcs) may pull toward the caster; the shelf bracket reads
follow multipliers and exempts casts like the ladder's; the range-0
ground_field contract = at the caster's feet (held ground you channel
from). Shelf files: `content/abilities/secrets/<school>.ts`
(`X_SECRET_ARTS`, `X_SECRET_RANKS`, `X_SECRET_LICENSES`; polearm's four
stay in polearm.ts with `POLEARM_SECRET_RANKS`); weaponArts/ladders
retired; `secretRanks.ts` aggregates; seats and anchors untouched in
secretArts.ts. THE SHELF CONSTITUTION (`masteredHand.test.ts`): a rebuilt
shelf gives every secret a role and a relationship, and HALF its follows
read another school's word.

**3b THE WAVE (workflow `mastered-hand-shelf`, five agents, one pass).**
All 123 secrets re-authored as cross-school spice: 76 follow (72 of them
across a school line), 70 leave a word, 29 leave ground, 22 arm the red
ledger, 11 read a page; roles 36/46/21/18/2. Deliveries reseated in
archery (9 drawn / 5 held / 6 instant), arx (9 / 6 / 5), twohand (5
heavier winds, payoffs instant), dualwield (links instant, knife-draw
casts 14–20t, the loom's 12-tick beat, quicken moved onto `follow.self`);
every school's delivery template is now distinct (11 of 11). Main-session
close: nine over-long rank notes trimmed; four cast-engine pins now read
daybreak's def (32t); the model credits `follow.knockbackMult`'s extra
shove at the utility weight; the tooltip names a link's boon. Gates:
shared 307 / content 680 / server 646 / client 1258, tsc ×4.

**Residue.** `breathFx.test.ts` IN_FLIGHT now lists 43 arts (rungs and
secrets that gained, lost, or re-lengthened a breath, plus shape changes:
wingbeat fan→dash, starfall_arrows fan→channel, skyrend/windsong
instant→cast, wild_root field→fused blast, eye_of_the_storm
pulse→channel) — Phase 4 authors every dialect and empties the set.
Open engine asks carried forward: a follow that reads a STATUS on the
target (resolved per body at hit time — a different door), held-ground
`self` DURING a channel, `follow.self` in the model (0, as the self lane
is), a tag credit for openers, chill `power` (engine-unused, flavor
only), the beastcraft fang reading the keeper's follow. Not live-proven
(Phase 5); the PACE DIAL still owed.

### Phase 4 — THE VOICE (2026-09-05)

**4a THE SEAMS (135a2acb).** `S2CFx.flourish` (`follow` | `finale`,
additive) set by the cast doors around `castAbility` and carried on
fused blasts; the aftermath ground speaks its own plan (`<art>:aftermath`
with kind `field`; `fxStyleFor` reads the id before the colon so the
face stays the art's); `AbilityPlan.onFollow` / `onFinale` cues added
once at arrival and every cue scaled ×1.15 / ×1.35 (`FLOURISH_SCALE`);
per-school breath dialect files `render/breath/<school>.ts` merged over
the founding table; the probe speaks dialects (kinds `charge`/`note`)
and flourishes (`FLOURISH=`). The rig lane's watcher woke (HMR stays
off) so every probe page load gets live transforms.

**4b THE WAVE (workflow `mastered-hand-voice`, nine agents; cut twice by
limits, resumed unedited with a note about the partial work).** Every
rung, page and secret re-voiced: 490 plans (was 416) and 144 library
effects (was 85 roster + 47 mastered); 88 aftermath-ground plans; 219
plans carrying follow or finale flourish cues; 126 breath dialects
authored (every casted art has a charge, every channeled a note —
`breathFx.test.ts` IN_FLIGHT is EMPTY and the contract binds); 59 new
effects (brands that stay, detonations, reactions made visible —
arx.thermal_shock / shatter / combust — rifts, formations, frost sheets,
blood floors, the loom's crossings, the spear's stakes). Eye-judgment:
307 arts viewed in-world at three moments by the agents (onehand 59,
arx 57, archery 46, twohand 43, sneak 26, combat 23, dualwield 22,
shield 20, polearm 11); the rest lab-sheet judged. Main-session close:
dead duplicate plan keys removed from the shared files (core / melee /
sneak) with the merged table proven identical (490 → 490); stress
receipt at 2600 grains: update p50 0.23 ms, draw p50 2.4 / p90 5.9 ms
(the v6 baseline). Gates: client 1258, tsc clean.

**Residue (honest).** Breath dialects were tuned against a probe that
speaks ONE emission window; the live wire stacks windows over the
wind-up, so charges will read louder in play — a lane look is owed
(Phase 5). Standing-zone `every` beats were judged from the first beat
(the probe casts once). Dust and ground-layer matter can hide under
tall meadow grass (y-sorted blades): a z-aware occlusion or a matter-
over-blades rule is a render ask. Beam aftermaths are circles at the
midpoint (a burning line would say more). Polearm's four armory arts and
four rungs, plus a few shield arrivals at the clip edge, are lab-judged
only. Engine asks carried: per-cue flourish scale, `EffectCue.kinds` for
leap launch/landing, a follow-window-bound `stay` cue, `land:'hold'`
shards, a wet/cold soft mark, a per-body anchor for standing brands, a
foot-anchored haft silhouette, a `vs`-read flourish cue, the probe
re-speaking breath on the wire's cadence and ticking a field's life.

### Phase 5 — THE PROVING + THE PACE DIAL (2026-09-05)

**THE PROVING (8d303a36).** `npm run prove:mastered-hand -w @arx/tools`
against a fresh world (FRESH WORLD LAW: PORT 8815, DB arx_prove_mh) =
10 live receipts over the real wire: THE WORD (the opener leaves
`burn` on `S2CCooldowns.open`), THE AFTERMATH (`wickfire:aftermath`
field, 64t r1.8), THE FOLLOW (frost_lance inside the window wears
`flourish: follow`, spends the opening, leaves `chill`), THE REFUND
(arc_bolt IV on a free seat inside the chill window: 160 of 200), THE
FINALE (held_gate: four beats, only the last flourished), THE QUIET
BEAT (one ground per note, on the last beat), THE RED LEDGER (a rat
killed inside the window hands 84 ticks back), THE HELD GROUND (Hold the
Line's boon worn inside, gone after walking 10 tiles — proven through a
stance cast's buffs push, since expiry pushes none). Lane laws learned:
a reseat keeps the slot's clock (a two-seat player chains
opener → payoff → third only across a free seat; the lane chains
lance R → bolt Q); buff expiry sends no `buffs` frame. Recorded
UNPROVEN, honestly: the chain's follow flourish (no bodies for the
chain to leap to on the empty course) and THE STAGGER INTERRUPT (a
player stagger is a casted art by law — heavy_slam's 14t wind-up is
the goblin firecaller's whole 14t windup, so the live overlap never
landed; the cancel gate is unit-pinned in the server slate).

**THE PACE DIAL (0f0c34ce) — the ONE number move.** `PACE_HP_MULT =
1.3` in shared; content `combatHp(def)` applies it to every hostile body
(`aggroRange > 0` — the wild, the camps, the crowns; townsfolk and
livestock keep their pool); the server's `spawnNpc` stands a body up
with `combatHp`, the craven help-call reads the live pool, and the
PAYOFF BRACKET and SHELF bracket read `combatHp(scaleNpcDef(...))` so
every cap and floor moved with the world (all green at 1.3 without a
retune). The TTK brackets in `damage.test.ts` measure a PLAYER dying to
NPC blows and are untouched by design. Tamed beasts converted from
wild bodies inherit the paced pool (recorded, not a bug).

## THE GOALS AUDIT — the brief, line by line

- *"Do we have AoE, DoT, channeled, casted?"* — yes before; now every
  school USES them together: 88 arts leave ground, 63 rungs cast, 48
  channel, 39 finales. ✔
- *"Button mashing … same effects over and over"* — nine schools on one
  mould → 11 of 11 delivery templates distinct; every art has a role in
  a three-act ladder; combos by level 20. ✔
- *"Combos are huge … fireball with splash that leaves fire and burns"*
  — the follow-through (151 follows, 72 crossing school lines), the
  reading edge priced and consumable, aftermath ground on blasts, arcs,
  beams, shots, roads, pulse trains; wickfire → frost lance → arc bolt
  is Thermal Shock → Shatter, proven live. ✔
- *"Crowd control, slow them down"* — 23 licensed root/stagger/weaken
  arts under the player HOLD BUDGET, every one casted or fused (the
  wind-up is the warning); chill, pull and shove everywhere. ✔
- *"More precasted, channeled, heroic openers, channeled beams with
  strength"* — casted rungs 46 → 63; finales pay the whole note; the
  crown of every school is a three-act art in one press. ✔
- *"No ability is the best; early abilities rank up and stay strong"* —
  RELEVANCE ±20% and the honing ladder kept; 416 → 490 curated voices.
  ✔
- *"Multiple options, not linear; 3–4 seats later"* — every school
  holds ≥4 openers / ≥4 payoffs / ≥4 sustains / ≥3 answers so any pair
  combos and any four is a whole fight; THE FULL HAND (seats 3–4) is
  its own short epic (Part 5). ◐ recorded
- *"Battles take a little longer, strategy, not so instantaneous"* —
  THE PACE DIAL ×1.3 plus the setup→payoff cadence. ✔ (one number; the
  owner may turn it)
- *"Visual polish that meets that level"* — Phase 4: 490 plans, 144
  effects, 126 breath dialects, flourishes and grounds voiced, 307
  arts eye-judged in-world; residue listed in the Phase 4 as-built
  (breath loudness on the wire, grass occlusion of ground matter, beam
  aftermath as a line). ◐ the residue is the next polish pass
- *"Charm / fear"* — future door (needs NPC AI pages); `becalm` stands
  for beasts. ✗ recorded
- *"Allies"* — held ground reaches the caster only at v1. ✗ recorded

### Phase 6 — THE HAND SEES (2026-09-05): the UI speaks the grammar

The wire and the model spoke in field names; the player never has to.
`ui/artWords.ts` = THE WORD BOOK (all 24 words the techniques leave and
read, each a whole sentence in THE PEOPLE SPEAK register: "brands the
foe for the next shot" / "a branded foe"), THE ROLE BOOK (five roles
with glyph, tone and a sentence), `followSentence` / `leavesSentence`,
and the combo finders `setUpBy` / `answeredBy` across every school
(a secret in another hand answers your word — the free hand shown).
Contract test: every word in content has a sentence; partners are
symmetric across schools.

- **Codex bench**: role and word seals under the name (`✦ Payoff ·
  answers Brand`); the measures rows speak ("Answers: a branded foe ·
  3s", "Leaves: Brand") with whole-sentence tips; THE COMBO block last
  on the bench — "Set up by" and "Answered by" as plates (art, word,
  school) you can walk to.
- **Hotbar**: the open word's RIBBON above the tray ("BURN STANDS", a
  drain bar for the longest seated window); the answering well glows
  gold (Phase 1); the well FLASHES when its answer lands (client
  detects a seat going on cooldown while its follow read the open
  word — `game.followLanded`); the singing well breathes hard inside
  the last beat of a finale note (`setFinale`); tooltips carry the
  spoken grammar line.
- **Spell plates**: every technique plate wears its ROLE as a small
  rune in the low corner (opener quarter, payoff burst, sustain bars,
  answer roof, crown) drawn after the fitted plate in the plate's ink;
  the three plates that lied after the reshapes were repainted
  (emberhead = the fall and the burning patch; sundering lance = the
  drawn line and the torn road; wingbeat = the skip back and three
  feathers loosed).
- **Proof**: `scripts/probes/ui-hand-sees.mjs` on the rig lane
  (restarted on the new server code): bench on Twin Strike and
  Wickfire, the tray seated, the word standing, the answer landed —
  viewed. Client 1260 tests, tsc clean. `window.dcPanels` dev handle.


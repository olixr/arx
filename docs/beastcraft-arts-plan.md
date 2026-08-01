# THE WILD ANSWERS THE CALL — beastcraft joins the technique pool

Status: green-lit 2026-08-01. Forks settled by the user the same day:
craven window = ACCELERATOR (never a gate, never dropped); the old
kneel-to-gentle interaction is REMOVED; the school launches with the
tame art alone (the roadmap arts stay in Part 6).

## Part 1 — The mandate (user, 2026-08-01, verbatim intents)

Taming should be a cast ability in the classic MMO hunter mold: a
technique you LEARN, SEAT into your equipment abilities, and CAST at a
beast — a long channel (5 to 10 seconds, typically 10) where surviving
the beast is the test. It must be intuitive and identical on keyboard
and gamepad, ride the game systems we already have (techniques,
seats, the one keymap), and open beastcraft as a technique school so
future beastcraft arts give keepers a real investment ladder.

## Part 2 — Laws

1. **THE FOURTH CITIZENSHIP OF STYLE**: `TechniqueDef.style` widens to
   `TechniqueStyleId = CombatStyleId | 'beastcraft'`. COMBAT_STYLES and
   COMBAT_SCHOOL_IDS **never** gain beastcraft — the "beastcraft is
   never a combat school" law (beastcraft plan, Phase 2) holds: no
   combat half-echo, no strike-school scaling. A technique cast already
   trains and scales by its own school through the FREE HAND rail, and
   `effectiveLevel(player, 'beastcraft')` is already legal. The codex
   shelf arrives free (`artsSchoolIds()` = any skill with techniques);
   the ladder-climb announcer's `COMBAT_STYLES.includes(skill)` gate
   (gameServer ~5716) widens deliberately so beastcraft climbs speak.
2. **THE CALL IS STILL EARNED, NEVER ROLLED**: the refusal ladder moves
   verbatim from tryGentle — guest, rung ("You need beastcraft level
   N..."), stalls full, its-eyes-elsewhere, lure — and is spoken
   BEFORE the cooldown is paid (the dormant-seat discipline: a refusal
   costs nothing). Completion is deterministic. The lure is consumed at
   the finish only; a broken channel spends nothing.
3. **THE SURVIVAL CHANNEL**: the cast does NOT becalm the beast — it
   provokes it (npcAggro, forced, onto the caster): the wild resists
   the working, and standing in its teeth for the full channel IS the
   test. TAME_CHANNEL_TICKS 200 (10s); a beast already worn into the
   craven window (hp <= GENTLE_HP_FRAC 0.35, the shared threshold)
   channels in half: 100 (5s), derived `floor(channel / 2)` — one
   factor, never authored twice. Breaks: the caster MOVES (the
   walking-off law); the beast takes ANY wound (startHp law verbatim —
   hp is the whole test, a whiff writes nothing and breaks nothing);
   the beast dies or despawns; stalls filled mid-channel (finish-line
   recheck). Keeper blood does NOT break the channel — damagePlayer's
   action-cancel list must exclude 'tame' (gentle and tend stay on it).
   The current companion is called off at cast start (its worrying
   would break its own keeper's working) AND held off for the length
   of it: DEFEND THE HAND's urgent door (damagePlayer -> petDefend)
   re-aims the companion at whatever draws keeper blood, which during
   a survival channel is the very beast being courted. petDefend must
   refuse the channel's own target while the tame action runs, or the
   companion breaks every full-health tame its keeper attempts.
4. **ONE RAIL AT THE FINISH**: the completion body is today's
   tickGentle finish, transplanted whole — slot pick, previous heel
   auto-stables aloud, removeTamedNpc (spawn clock + site ledgers, no
   loot, no deed), pet spawns WHERE THE BEAST STOOD, tameXp, ceremony
   line, naming card via sendPet(player, slot). tryGentle/tickGentle
   are REPLACED, never duplicated; the interactNpc bestiary
   fallthrough to tryGentle is deleted, and the client's 'Gentle'
   craven-window prompt (findNearbyTarget gentleReady) goes with it.
5. **THE FLOURISH CONTRACT holds** (techniques v2 law): the art ships
   with a bespoke icon, an FX face — the working must be VISIBLE, to
   the caster and to watchers (broadcastFx pulses riding the channel) —
   VOICE-passed bench copy and rank notes, no dashes anywhere
   player-facing.
6. **THE HONED CALL** (ranks, HONED-ART law): II widens the reach and
   trims the cooldown; III shortens the channel; IV shortens it again
   and lands the signature flourish. Channel lives in a new
   `AbilityDef.channelTicks` field so RankStep can hone it like any
   other number.

## Part 3 — The art

- id `gentle_the_wild`, name **Gentle the Wild**, style `beastcraft`,
  unlockLevel 10 (= TAME_FLOOR_LEVEL — the day you can tame is the day
  the art appears), damage 0 (pure utility), range 5, arc-forgiving
  cone targeting, cooldownTicks 200, channelTicks 200.
- New `AbilityShape` 'tame'. Target resolution is server-side from the
  aim cone (the homingMarks discipline: nearest TAMES-whitelisted body
  within range, cone ~0.65 rad) — no protocol change, no click
  targeting, pad parity by construction.
- No valid mark in the cone = spoken refusal ("Nothing wild in reach
  answers the call."), nothing spent.
- Ranks: II range 6.5 + cooldown 160 · III channelTicks 170 · IV
  channelTicks 140 + flourish. (Craven halves derive: 100/85/70.)

## Part 4 — Surfaces

- **shared/sim/abilities.ts**: AbilityShape += 'tame';
  AbilityDef.channelTicks; TechniqueStyleId union; TechniqueDef.style
  retyped. GENTLE_TICKS retires with the kneel (grep before deleting).
- **content/abilities.ts**: ABILITIES += gentle_the_wild; TECHNIQUES +=
  its rung. Contract tests reshaped deliberately: the OPEN LADDER pins
  iterate COMBAT_STYLES (verify) so a new-style pin is ADDED — the
  beastcraft ladder is exactly [gentle_the_wild @ 10] for now; any
  whole-roster FLOURISH sweeps must pass for the new art.
- **server/gameServer.ts**: tryCastAbility pre-flights shape 'tame'
  (validate + refuse BEFORE cooldown, then pay and begin);
  TameAction {kind:'tame', targetEid, ticksLeft, startHp}; tickTame;
  provoke at start; damagePlayer cancel-list untouched for 'tame';
  tryGentle/tickGentle + the interactNpc fallthrough removed;
  announceLadderClimbs gate widened.
- **client**: findNearbyTarget gentleReady block removed; action meter
  already renders channels; FX face (a calm line of motes drifting
  hand-to-beast, pulsing on the channel) + bespoke icon + sfx moment;
  codex shelf free; keymap untouched (seats already cast on Q/R).
- **dialogue**: Drover Maren (drover_stalls) teaches the cast now —
  edited in place in the def JSON (never `dialogues import`), VOICE
  card honored, dash ban honored.
- **DB: none. Protocol: none** (seats, casts, action wire, pet mirror
  all already carry this).

## Part 5 — The proving (prove:pets reshape)

The gentling receipts (2-8) rewrite to the cast grammar; the rest of
the 49 stand. New truths that must hold on the live wire:
- the rung refuses aloud through the cast door, nothing spent
- the empty pack refuses and names the lure
- the cast PROVOKES: an unhurt beetle turns on the caster at cast
- survive-the-teeth: full-health tame completes in ~10s while the
  beast is chewing on the keeper (keeper blood does not break it)
- the craven accelerator: a worn beetle's channel closes in ~5s
  (timestamps prove the half)
- moving breaks it; a wound to the beast breaks it; a broken channel
  spends no lure
- completion: lure spent, ceremony, naming card, pet at heel where the
  beast stood
- the seat is required: an unseated keeper has no tame verb at all
Harness mechanics: seat the art via C2STechnique, cast via input press
edges (the secretArts.ts precedent), channel timing via wall-clock
between cast edge and ceremony line.

## Part 5a — SHIPPED

All parts landed 2026-08-01; `prove:pets` = **56 receipts, one full
green run** on the isolated rig (below). One server law was added
during proving: **THE ASKING HOLDS ITS EYES** — tickTame re-forces the
mark's aggro onto the caster whenever it slips (state or target), so
a craven heart can neither cry for help and bolt toward its kin
(live-caught: seekhelp broke every craven tame near a wild knot) nor
be kited into idling out of the test. The channel's only honest exits
remain: movement, a wound to the beast, the beast leaving reach, or
completion.

**THE ISOLATED RIG** (a standing tool now): when a concurrent session
is hot-reloading the shared dev server, proving runs die mid-flight to
restarts that read as receipt flakes. Cure: a second server from the
same tree with NO watch — `PORT=8791 DB_DATABASE=arx_prove
HOST=127.0.0.1 npm run start -w @arx/server` (the database
auto-creates) — and aim any harness at it via its env override
(`ARX_PROVE_URL=ws://127.0.0.1:8791/ws` for pets). Immune to the
neighbor's edits by construction.

## Part 5b — As-built proving laws (live-caught during the build)

- **THE ORDERING LAW**: the craven-accelerator receipt must run BEFORE
  any companion exists and on separate ground past the provoked first
  mark's leash. A heel friend joins any wear-down through the quiet
  defend door and then kills or re-wounds the worn mark straight
  through the cooldown wait; and two tamable bodies in one cone make
  the cast a coin flip.
- **THE CERTAIN WOUND**: the keeper-blood-breaks-nothing receipt must
  never gamble on one beast's rolls (ten straight whiff seconds
  happened live). A goblin dropped at arm's length opens on the keeper
  instantly and chews beside the beast — proving third-party teeth
  break nothing either. Tincture discipline: stock six, chug per
  block; the keeper otherwise stands the channel at 35% health.
- The wound-break receipt's channel-time swings structurally exercise
  THE ASKING HOLDS THE FANG (petDefend refusing the channel's mark):
  each landed keeper blow both breaks the working and fires the quiet
  defend door at the very target the guard must refuse.
- Harness-wide medicines this build added: stageFight shifts ground
  between attempts (a course-lottery pocket refused three spawns
  whole); walkTo sidles all four shoulders and survives refused
  ground (a downed body against a rock line blocked the one authored
  shoulder).

## Part 6 — The ledger and the road

Dials as planned: range 5 (II 6.5), cooldown 200 (II 160), channel
200/craven 100 (III 170/85, IV 140/70), unlock 10.
The school's roadmap (NOT shipped, user chose tame-only launch):
`come_to_heel` ~20 (the whistle the beastcraft ledger deferred — call
the trailing friend to your side), `point_the_fang` ~30 (a pointed
harry command). Future arts ride the exact same citizenship — no new
grammar will be needed.

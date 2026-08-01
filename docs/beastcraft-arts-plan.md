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

## Part 6 — Gentle the Wild's ledger

Dials as planned: range 5 (II 6.5), cooldown 200 (II 160), channel
200/craven 100 (III 170/85, IV 140/70), unlock 10.

---

# THE KEEPER'S TONGUE — the ladder fills to ten

Status: green-lit 2026-08-01 (user mandate, same day THE WILD ANSWERS
THE CALL shipped): nine NEW beastcraft techniques beside the tame, so
the school stands at the full ten-rung standard every combat ladder
holds. Every art bespoke — its own intent, its own face, its own
grammar — never a palette swap. Some speak to the wild itself, some
through the companion; all are active casts, pad-parity by
construction, and the school stays what it is: **never a combat
school, damage 0 on every art, no new XP faucets** (beastcraft XP
still flows only from tames, care, and the fang's trickle — THE XP
CONTRACT holds).

## Part 7 — The ten words (roster, rungs 5..50)

The keeper learns the wild's tongue one word at a time. Rungs match
the OPEN LADDER's 5-per-5 cadence; the tame keeps its shipped seat.

| lvl | art | shape | the word |
|---|---|---|---|
| 5 | `soothe_the_wild` Soothe the Wild | becalm | still one beast's blood: fight forgotten, eyes down |
| 10 | `gentle_the_wild` ✓ (shipped) | tame | the asking |
| 15 | `come_to_heel` Come to Heel | pet_command heel | the whistle: the far friend arrives at your side NOW |
| 20 | `point_the_fang` Point the Fang | pet_command fang | the pointed harry: friend breaks for the mark, mark's eyes pulled onto it |
| 25 | `keepers_balm` Keeper's Balm | pet_command mend | a poultice thrown to the fighting friend: heal, later cleanse |
| 30 | `strewn_bait` Strewn Bait | summon 'bait' | a scattered table: idle wild beasts drift to the spot |
| 35 | `the_quiet_walk` The Quiet Walk | self_buff truce | wild beasts do not mark you while the walk lasts |
| 40 | `blood_of_the_pack` Blood of the Pack | pet_command surge | the shared howl: the friend's teeth and stride quicken |
| 45 | `the_keepers_cry` The Keeper's Cry | pet_command rise | the fallen friend hears you and stands, mid-fight |
| 50 | `voice_of_the_wild` Voice of the Wild | wild_howl | the capstone: a great ring of awe; the wild stills, the friend surges |

## Part 8 — Laws

1. **THE WILD'S OWN WORDS** (soothe / bait / truce / howl) act only on
   WILD BEASTS: a new content predicate `isWildBeast(def)` beside the
   tames validator (not humanoid/undead by prefix, no splitInto, no
   produce/lays, never an actor or a pet at the call site). Champions
   and the crowned terrors (`_champion`, dire_wolf, elder_great_owl)
   refuse the becalm words aloud — too proud to be stilled.
2. **A WORD COSTS NOTHING UNTIL IT IS HEARD**: every art pre-flights
   its refusal ladder aloud BEFORE the cooldown is paid (the tame
   door's discipline, now a shared `tryKeeperArt` dispatcher for the
   becalm / pet_command / wild_howl shapes).
3. **THE BECALM IS THE SULK'S BIG SIBLING**: soothe/howl = state
   idle, target cleared, `noAggroUntilTick` stamped. No new NPC state.
4. **THE TRUCE IS HONEST**: The Quiet Walk rides a PlayerBuff flag
   (`beastTruce`) checked inside the ONE perception scan; the caster's
   own landed wound on any wild beast ends it early.
5. **THE BAIT PULLS, NEVER BREAKS**: strewn bait steers only beasts at
   rest (idle/suspicious) through the existing `investigate` grammar —
   a blood-up chase never cares. Board control, not an escape hatch
   (soothe is the fight-breaker; they never overlap).
6. **THE COMPANION'S WORDS NEED THE COMPANION**: heel/fang/mend/surge
   refuse aloud without a standing friend afield; the cry refuses
   without a fallen one in reach. The rise rides the tend's completion
   body — one rail, two doors.
7. **SURGE IS A PET FACT**: PetComp carries the surge/guard windows;
   petStrike and tickPet read them; damagePet folds guard armor at the
   ONE stat site's mitigate line. No keeper benefit rides a pet blow
   (the Ph2 law holds).
8. **THE FLOURISH CONTRACT, PAID IN FULL**: every art ships with a
   bespoke FX_STYLES face (unique ring+debris+motif), a bespoke icon
   plate, an in-world moment of its own (three new additive S2CFx
   kinds: 'becalm', 'command', 'howl' — id-branched painters, the
   'tame' precedent), VOICE-passed copy, and a rank ladder whose IV is
   visible in the world.
9. **DB: none. Protocol: additive only** (fx kind strings). New shared
   fields honable where ranked: becalmTicks, petHealFrac, petSurge,
   petGuard, petCleanse, command; AbilitySummon kind += 'bait';
   AbilitySelf.beastTruce.

## Part 9 — The dials (authored; ranks in content beside each def)

- soothe: range 5, cd 300, becalm 200t. II becalm 300 + cd 240 · III
  range 6.5 · IV radius 2 (the calm spreads to beasts beside the mark).
- come_to_heel: cd 200, self-shaped. II cd 120 · III arrives mended
  (petHealFrac 0.1) · IV arrives blood-up (petSurge 1.15x/1.1x, 100t).
- point_the_fang: range 7 cone, cd 200. II range 9 + cd 160 · III the
  first bite deep (surge 1.5x dmg, 60t) · IV the dare carries (foes
  within 2 of the mark also turn on the friend).
- keepers_balm: range 8, cd 400, petHealFrac 0.3. II 0.45 + cd 320 ·
  III cleanse (petCleanse) · IV 0.6 + petGuard {armor 6, 200t}.
- strewn_bait: range 6, cd 500, summon {kind bait, radius 6, 300t}.
  II radius 8 + 400t · III cd 380 · IV the table calms (beasts nosing
  the bait are becalmed while they eat).
- the_quiet_walk: cd 600, self {beastTruce, 400t}. II 600t · III cd
  460 · IV the wild parts (beasts within 1.5 ease aside as you pass).
- blood_of_the_pack: cd 600, petSurge {1.3x dmg, 1.15x stride, 240t}.
  II 1.4x · III 300t · IV the whole temper (kit status power doubled +
  blows shove, knockback 1.2, while the surge runs).
- the_keepers_cry: range 10, cd 1200, rise at petHealFrac 0.35.
  II 0.5 · III cd 900 · IV it rises angry (petSurge 1.3x/1.15x 160t +
  petGuard {armor 6, 160t}).
- voice_of_the_wild: radius 7 nova of awe, cd 1200, becalm 160t,
  petHealFrac 0.25, petSurge {1.3x/1.15x, 200t}. II radius 9 · III
  becalm 240t + heal 0.35 · IV the wild answers (the awe also sheds
  the knot's aggro on EVERYONE, and the ghost pack runs the rim).

## Part 10a — SHIPPED (2026-08-01)

All nine words landed the same day: `prove:pets` = **70 receipts, one
full unbroken green run** on the isolated rig, all 1,256 workspace
tests green. As-built notes and live-caught laws:

- **THE TABLE WALKS LIKE A HUNT**: the bait steer originally pushed a
  straight vector and the very first hind wedged against a tree line
  forever (live-caught by probe: it steered 1.2 tiles then froze).
  The walk now routes through `npcNavToward` — the hunt legs' own
  navigation, watchdog included.
- Maren's stalls dialogue grew the 'words' node under the gentling
  talk (a node holds at most 4 choices — a fifth silently orphans the
  exit, caught by the reachability validator).
- FX: three additive S2CFx kinds ('becalm'/'command'/'howl', protocol
  unchanged); SigCtx grew the wire's `ticks` so the ghost pack keys on
  the rank IV hold (>= 300) honestly; the surge windows pulse their
  granting art at the friend's shoulders every 25 ticks (THE VISIBLE
  WORKING, the tame channel's cadence).
- Harness laws minted this build: seat swaps wait for the
  `techniques` echo (a 250ms sleep raced once and cast the previous
  seat's art); the blade-proof receipt judges pre/post around its own
  swings (a landing lurker's 1-hp bystander bite read as 243/255 and
  convicted the blade twice); the whiff receipt buys a second table
  before convicting the dice (one 14-hp fight rolled zero 0-rolls);
  the balm judgment accepts the u8 ceiling (240 -> 255 is a full
  mend, not a shortfall); the down-stage restages once on a barren
  60s stand-off, not only on keeper death; `stand()` walks the
  offset ring when ground refuses.
- Runtime note: the full suite is ~14 minutes green; the cost of a
  flake is a whole lap. Future lever (agreed with the user): a fast
  iteration lane (`ARX_PROVE_FROM=tongue`) that synthesizes keeper
  state with dev levers and runs one chapter, plus a rig-side relaxed
  chat bucket to shave the ~2 minutes of dev-command spacing. The
  70-receipt full run stays the record before any commit.

## Part 10 — The proving (prove:pets grows)

New live receipts, isolated-rig discipline: soothe stills a chasing
beetle (state leaves chase, sulk stamped, champion refuses aloud);
heel recall lands the trailing friend at the keeper's side; fang sets
the friend's mark AND turns the mark's eyes; balm mends a wounded
friend on the wire; bait walks an idle beast to the spot
(investigate); the quiet walk crosses a wolf's eye unmarked and a
landed blow ends it; surge quickens the friend (petstate ticks);
the cry stands a downed friend where it lies; the howl stills a knot
and mends the friend; every companion word refuses aloud with the
stalls empty. The seat/rung/cooldown doors are already proven by the
tame's receipts and hold for the school.

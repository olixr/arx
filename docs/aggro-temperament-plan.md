# THE HUNTER'S HEART — aggro temperament & the long pull

*Drafted 2026-08-16. The ask: the aggro/pursuit state machine is the system every
body in the game rides — it must stop feeling homogenous and stop being gameable.
Per-species temperament knobs, per-BODY variance, a 20–30s post-line-of-sight hunt,
and the marquee verb: a real LURE — a player can keep a mob enticed and drag it a
long way (all the way to the town gate, where THE WILD TAKES SIDES already makes
the watch answer). All tunable from content, none of it a patch.*

## Ground truth (code-verified 2026-08-16)

The perception rebuild already shipped a strong machine — this epic BUILDS ON it,
never replaces it:

- `shared/sim/perception.ts`: facing cone (`sightArc` per def, default 140°),
  close ring, peripheral band, one Amanatides-Woo sight ray with trunk cover,
  distance-priced alert meter (ALERT_SUS 35 / ALERT_MAX 100), grace + decay.
- gameServer state ladder: `idle → suspicious → investigate → chase → search →
  return` (+ `seekhelp`), LKP + stride projection ("he went that way"), hunt
  rings, the wary standoff with a nerve break, honest pursuit (blind legs run to
  the LKP, never the true position), stall watchdog + sulk, pack rally bounded,
  doze law, 4 Hz staggered perception, 4-pathfinds/tick budget.

The gaps the ask names:

1. **Every knob is a global constant.** SEARCH_TICKS=400 (20 s flat),
   INVESTIGATE_TICKS=300, STANDOFF_NERVE_TICKS=40, alert rates — one law for a
   fox, a skeleton, and a legion drillmaster. No per-def dials, no per-body
   variance beyond `eid % 20` jitter.
2. **The leash is a hard radius** (`fromOrigin > arenaRadiusFor` → return), so
   the lure-to-town fantasy is structurally impossible: a wolf abandons a hot
   fight the instant it crosses a circle, which is exactly the "run 30 tiles and
   reset" boredom the ask calls out — and it is gameable (leash-edge ping-pong).
3. **Raid-scale debt**: `rallyPack` and `npcSeekHelp` sweep `this.npcs` whole —
   O(world) per aggro event, and every rally re-triggers it.

## The architecture

### 1. TEMPERAMENT — the species' heart (content layer)

`NpcDef.temperament`, all fields optional, absent = today's numbers exactly
(the backfill law):

```ts
temperament?: {
  keen?: number;           // alert-gain mult, 0.25..3 (hawk eyes vs dull bone)
  nerve?: number;          // standoff-nerve mult, 0.25..4 (lower = commits sooner)
  investigateSec?: number; // walk-over-and-look budget, 3..60 (default 15)
  searchSec?: number;      // post-LOS-break hunt, 5..90 (default 20; each hunt
                           // rolls ×1..1.5 → the asked-for 20–30 s window)
  gritSec?: number;        // how long a chase survives BEYOND the leash circle,
                           // 0..600 (0 = classic hard leash; default 45)
  variance?: number;       // per-BODY spread 0..0.5 (default 0.15)
}
```

Resolver `npcTemperament(def)` in content beside the def (one source of truth for
server + CMS); `validateNpcDef` grows bounds + unknown-key refusal (the lanes
precedent). CMS bestiary editor grows the sliders — the tuning bench IS the point.

### 2. THE QUIRK — no two wolves share a heart (server)

`spawnNpc` rolls `quirk ∈ [-1, 1]` once per life — ONE personality axis,
timid↔bold, scaled by the def's `variance`: a bold body commits sooner
(nerve ÷), chases farther (grit ×), and is a shade keener; a timid one the
mirror. One axis so a body is COHERENT (never "fearless but gives up early"),
one roll so the same wolf keeps the same heart for its whole life.

### 3. THE LONG PULL — grit replaces the hard wall (server)

The leash circle stops being a wall and becomes HOME — the two-ring law:

- **Inside the posted circle**: exactly today. Grit refills passively.
- **Beyond it**: the chase lives while the body's GRIT holds. The grit clock
  (gritSec × quirk) counts down only past the ring, and a landed exchange —
  this body wounds or is wounded — REFILLS it: a fight in your face is never
  abandoned for homesickness. Kiting a wolf to town is therefore a real skill
  loop: keep it in sight (the LOS-break law is untouched and always exits to
  search), keep the fight warm, or watch its nerve fail and the walk home begin.
- **Grit empties** → straight to 'return' + the sulk (noAggroUntilTick) — a
  tired hunter goes home, it does not mill about; and the sulk kills leash-edge
  re-pull ping-pong.
- **Crowns keep their courts**: bosses and arena-stamped spawns keep the hard
  arena law verbatim — a lured boss is a raid mechanic nobody authored.
- Safety proofs: a lured wild body never despawns (WILD_DESPAWN_R tests
  player proximity, and the lurer IS near); chase never dozes; 'return' from
  any distance already walks wide, snap-homes only on a genuine 5 s stall; the
  return-complete full heal (the classic reset) stands.

### 4. THE HUNT UNCHAINED — search anchors on the LKP

Today `npcStartSearch` clamps the LKP into the leash circle and the hunt breaks
at `fromOrigin > leashRange` — a sight-break 60 tiles up the road would teleport
the hunt's heart back home. Now: the search anchors WHERE THE QUARRY VANISHED
(stride projection intact), its ring hugs the LKP, and only the CLOCK ends it
(searchSec × the 1..1.5 roll → 20–30 s by default, per the ask). 'investigate'
(the peacetime curiosity verb) keeps its leash — a curious stroll stays near
home; it is the broken CHASE that earns the long hunt. `mintHuntRing` drops its
origin clamp the same way (the ring belongs to the LKP; reachability + solids
checks stand).

### 5. RAID SCALE — the O(world) sweeps die

`rallyPack` and `npcSeekHelp` move onto `forEachNpcNear` (the chunk index) —
both were already range-bounded (7–12 tiles) in MEANING; now they are in COST.
With hundreds of bodies mid-raid, every aggro event stops touching every npc in
the world. Perception stays 1 ray per zone-survivor at staggered 4 Hz; the doze
law keeps the unwatched world free.

### Authored hearts v1 (proving the range)

- wolf/worg/dire_wolf: keen 1.3, grit 90 — the relentless pack, the town pull.
- fox/vixen-line: keen 1.6, nerve 2.5, grit 12 — sees everything, commits late,
  abandons early (the skulk).
- bear: nerve 0.5, grit 60 — short temper, long memory.
- boar: nerve 0.7, grit 25 — charges early, tires fast.
- goblin: variance 0.4, grit 40 — an unruly rabble, no two alike.
- hobgoblin: keen 1.2, nerve 0.6, grit 75, variance 0.05 — a drilled legion,
  uniform on purpose.
- skeleton: keen 0.6, searchSec 35, grit 150, variance 0 — dull sockets, but the
  dead do not tire and do not differ.
- brigand: keen 1.15, variance 0.25 — jumpy outlaws.

## What does NOT change

The wire (no protocol/client-game change; alert icons as shipped) · the stealth
meter & sneak math · the sizing-up law · pack/craven/harry/decoy laws · pets &
livestock (never in this machine) · boss arena law · doze/stagger/pathfind
budgets · THE WILD TAKES SIDES seams (tribe/stance untouched — the town-pull
payoff rides them as-is).

## Tests

Content: resolver defaults + bounds refusals. Server (wildSides fake-slate
pattern): tether holds/refills/expires + sulk, search duration window + LKP
unclamped, quirk bounds + one-axis coherence, npcAggro seeds grit.

## As-built (2026-08-16)

Shipped exactly as planned; deltas and law refinements only:

- Content (`npcs.ts`): `NpcTemperament` + `ResolvedTemperament`,
  `TEMPERAMENT_DEFAULTS` / `TEMPERAMENT_BOUNDS` / `npcTemperament(def)` /
  `quirkTemperament(base, quirk)` — the quirk math clamps every rolled dial
  back inside the validator rails, so no roll escapes the law. Validator:
  bounds + unknown-key refusal (the lanes precedent). Hearts authored on
  wolf/worg/dire_wolf, fox, bear, boar, goblin, brigand, hobgoblin, skeleton.
- Server (`gameServer.ts`): `NpcComp.quirk` (rolled in spawnNpc, [-1, 1]) +
  `gritTicksLeft` + a memoized `temper`/`temperFor` pair (`npcTemper` recuts
  on CMS def swap — the kitCds idiom, two field reads per tick). The trio
  `npcTemper` / `npcRefillGrit` / `npcGritHolds` lives beside the aggro door.
  Grit seeds at `npcAggro`, refills in `damageNpc` (state 'chase') and at the
  top of `npcStrike`. The chase's arena check split: `arenaBound` (boss def or
  spawn-stamped arenaR) keeps the hard wall verbatim; everyone else rides
  `npcGritHolds`, and a grit break sulks (`NO_AGGRO_TICKS`) where an arena
  break never did. `INVESTIGATE_TICKS`/`SEARCH_TICKS` retired to the heart;
  `npcStartSearch` drops the LKP leash clamp and prices the clock
  `searchSec × TICK_RATE × (1 + rand·0.5)`; `mintHuntRing` drops the origin
  clamp; the investigate/search break keeps the leash for 'investigate' only.
  Keen prices the meter's climb in `npcPerceivePlayers`; nerve scales
  `STANDOFF_NERVE_TICKS` (eid jitter kept — a LINE of watchers never breaks
  in unison). `rallyPack` + `npcSeekHelp` moved onto `forEachNpcNear`.
- CMS: a Temperament slider section in the bestiary editor (six dials on the
  TEMPERAMENT_BOUNDS rails, defaults shown from the shared heart).
- Tests: content +6 (resolver/backfill, 20 s law, authored-hearts-in-rails,
  validator refusals, quirk coherence), server +8 (`aggroHeart.test.ts`:
  memo/recut, quirk spread, tether drain/refill/break, gritSec-0 wall, door
  seeding, 24-roll search window, LKP anchor + ring hug, shipped-hearts
  landmarks). The fake-slate law held: `npcRefillGrit`/`npcTemper` joined the
  wildSides + enforce slates as proto binds, and the three damageNpc suites
  (xpEconomy, procDoors, readingEdge) stub the clock quietly.
- MID-CEREMONY: defused a three-path REVERSION BOMB in the shared index
  (pet-arts doc, petArts.ts, gameServer.ts all staged at HEAD~2's blobs — a
  neighbor's temp-index flow; provenance-checked per the shared-tree law,
  `git restore --staged` per-path).

Gates: content 552 · server 525 · client 617 · tsc clean on
content/server/client.

## Second pass — THE COMMITTED PURSUIT (2026-08-16, same day)

The user's deepened ask: a sight-break must NOT flip straight into search mode.
Run the corner first. The audit confirmed the cheat: the first pass (and the
perception epic before it) broke to 'search' on a flat 2.5 s timer — a body
still twenty tiles from your corner would drop its chip, slow to 0.85×, and
start "searching" ground it never reached. Now the blind run is its own
cohesive unit between the eye and the hunt:

- **The eye's grace ends, the legs do not.** `eyeLost` (grace expired) is kept
  EVERY tick, not just scan beats. Its first expired tick mints THE ANTICIPATED
  GOAL once: the LKP projected down the quarry's last stride, capped at the
  heart's `anticipateTiles`, wall-fallback by halves — and the stride is SPENT
  (zeroed) so the one stride is never cashed twice. The chase continues at
  FULL speed, state 'chase', chip lit — the honest-pursuit law already ran
  blind legs to the LKP, so the anticipation rides the existing rails.
- **The verdict (`npcPursuitSpent`)**: concede only on ARRIVAL with nothing
  there (< 0.9 tiles), or when the heart's `pursuitSec` runs out on a corner
  never reached. `npcStartSearch` then hunts exactly where the pursuit
  concluded. A quarry that VANISHED outright (stealth melt, burst decoy,
  plane cross) still searches immediately — the projection fires inside
  npcStartSearch via the same spent-stride helper, no-op after a blind run.
- **THE FORWARD BIAS**: the spent stride's bearing is kept (`huntBiasDir`) and
  the hunt ring's FIRST second look leans down it (±~35°) — a searcher checks
  ahead before it fans out. The rest of the ring stays random (a search reads
  as guessing). Cleared at hunt end and at every fight open.
- **The blind stall is not trap-cheese**: a blind run that stalls against a
  sealed corner now searches where it stands; only a VISIBLE-and-unreachable
  target still earns the sulk-home (the trap law intact).
- **Two new heart dials** (bounds-validated, quirk-scaled, CMS sliders):
  `pursuitSec` [1, 30] default 5 (bold runs longer — quirk ×) and
  `anticipateTiles` [0, 12] default 4 (species CUNNING, quirk leaves it
  alone). Authored: wolves 8–10 s / 6 tiles (they chase where you're GOING),
  fox 2.5 s / 6 (reads the line, quits fast), skeleton 12 s / 1 (runs to
  where it SAW you — literal, tireless), hobgoblin 7 / 5, bear 6 / default.

Tests: content +1 (dials + quirk-leaves-cunning), server +5 (anticipation
leads and spends, lead-0 literal, sealed-ground fallback, the verdict's
never-before-the-corner law, forward-bias lean; `npcAnticipatePursuit` joined
the slate binds). Gates: content 553 · server 530 · client 617 · tsc clean.

## Third pass — THE SEARCH THAT WALKS (2026-08-16, same day)

The user's live read: a searcher "gets stuck and frozen — stands and slowly
turns in circles." The audit confirmed four compounding causes: the ring was
3 looks and the ring's exhaustion CLAMPED the hunt clock down (a 20–30 s
search actually died in ~12, mostly dwell); the dwell was a turntable
(`pos.dir += 0.05`, the frozen-spin read in one line); a ring minted beside
walls came up empty (5 attempts, one fixed radius band) and left the body
standing at the LKP; and a sealed leg fed the HOMEWARD watchdog's full 5 s of
wall-shoving before moving on. Four cohesive units replaced them:

- **THE GYRE**: the clock is the MASTER, never clamped. A ring walked dry
  with legs still in the heart mints a WIDER one (bands 2–4.5 → 4.5–7.5 →
  7–10.5 tiles) — the sweep combs outward like a real searcher. The walking
  is priced by the heart's new `searchLegs` dial [0, 12] default 4 (quirk ×
  bold, rounded — bold bodies comb harder); legs spent → THE LAST WATCH:
  stand where the hunt ended and scan until the clock alone shrugs it home.
  `searchLegs` 0 = the SENTINEL: walks only to the LKP and stands its whole
  watch. Investigate (peacetime) walks half the legs, rounded up, and its
  ring never mints a look past leash − 1 (wandering past would end the
  errand). Empty mints retry wider, bounded at two widenings per beat.
- **THE PEEK**: the first look of the first gyre leans down the escape
  bearing (the forward-bias law, kept); a CUNNING species (anticipateTiles
  ≥ 6 — the corner-cutters) spends its SECOND look farther down the same
  line at the next band's reach: they chase your LINE, not your point. Fan
  looks prefer spots BESIDE cover (4 cheap solid probes at 1.15 tiles): the
  crate, the hedge, the tree bole are where a hider would be.
- **THE GLANCE**: the dwell turntable is dead. A dwelling searcher LOOKS —
  picks a bearing, turns briskly (≤ 0.22 rad/tick, shortest arc), holds it
  0.7–1.3 s, picks another at least a quarter-turn away. The hunt's first
  glance leans down the escape bearing. Saccades read as searching AND
  genuinely swing the perception cone over new ground. New NpcComp fields
  `gazeDir`/`gazeUntilTick` (optional — the literal-site law).
- **THE QUICK FOOT**: hunt legs stall out at `HUNT_STALL_TICKS` 40 (2 s),
  not the homeward 100 — a sealed look is worth two seconds of anyone's
  hunt. `npcNextHuntLeg` prices GROUND CHECKED: a sealed leg spends too.

Authored legs: wolf/worg 6, dire wolf 7, hobgoblin 6 (drilled sweep),
brigand 5, goblin default 4 (variance 0.4 → 2–6 lived), fox 3 (brief,
sharp), bear 3, boar 2 (two heavy looks, forgets you), skeleton 1 — one
look, then the long sentinel stand through its whole 35 s clock. The dumb
stand still; the cunning comb the gyres; nobody spins.

Tests: content +1 (the dial, species shapes, whole-leg quirk law), server +4
(gyre widening + last-watch clock law, the sentinel, the cunning second
peek, the investigate leash clamp; existing mint calls carry the gyre arg).
CMS: 'search legs' slider. Gates: shared 226 · content 570 · server 544 ·
client 618 · tsc clean.

## Fourth pass — THE EYE ABOVE THE HEAD (2026-08-16, same day)

The user's ask: the overhead state icons were two text glyphs ("?"/"!") in
the SAME serif gold dialect as the QUEST marks — confusable by construction —
and the blind pursuit wearing the plain "!" read as a stale indicator. The
telegraph is now ONE bespoke vector EYE on a small dark badge plate (capsule,
hairline state-ink rim), acting the state it announces; never a glyph, so the
two grammars can never rhyme (quest = serif gold, no plate, breathing bob;
perception = plate badge, pops and holds still):

- **WARY** — half-lidded squint, dim amber, pupil peeking UNDER the lid
  (pass-two verdict off the audit sheet: a fully-hidden pupil left a crescent
  that read as a MOUTH; lid 0.4 + dropped pupil is the squint).
- **LOOKING** (new wire value 5) — the open amber eye: investigate finally
  wears its own face instead of borrowing the stare's.
- **ENGAGED** — red slit predator pupil + one expanding flare ring at the
  moment of the lock (the single loudest beat this UI is allowed).
- **PURSUIT** (new wire value 4) — the slashed ember eye: sight broken,
  still coming. The chase never lies about its eye anymore; the blind run
  telegraphs blind (KEEP RUNNING) instead of holding the engaged mark.
- **HUNTING** — deep-amber eye whose pupil SWEEPS side to side (sin t/430):
  the searcher is guessing and the player watches it guess.
- **THE STAND-DOWN** — any rung dropping to calm CLOSES the eye: a grey lid
  slides shut over 380 ms and the badge sinks — disengagement is shown,
  never popped out of existence.

Wire: the snapshot alert byte simply grew values 4/5 (full u8, no encoding
change). Server `npcAlertByte` splits chase on `pursuitSinceTick` and
investigate from suspicious. Proven on the badge audit sheet (exact drawing
math transplanted, 3 scales × day-grass/stone/night, sweep time-strip, quest
marks alongside for the confusion check). Tests: shared +1 (rung uniqueness,
u8 fit), server +1 (the full ladder verdict incl. the blind-run split).
Gates: shared 227 · content 570 · server 545 · client 618 · tsc clean.

## Debts (deliberate)

- The LIVE WALK is owed: the lure-to-town proof (wolf dragged to the Amberford
  watch through THE WILD TAKES SIDES), the corner-chase read (blind run →
  overshoot → fan-out), AND the walking-search read (gyres combing outward,
  glances not spins, the skeleton's sentinel stand) belong on a rig lane with
  the walk harness — unit clocks are proven, the felt experience is not yet.
- No hearing/noise stimulus layer (footfall radius behind full walls) — the
  peripheral band still stands in for it.
- Pet-side temperament (companion grit/keen) untouched — pets ride tickPet.
- The seekhelp errand still hard-breaks at the leash circle (a far-lured
  craven goes home rather than crying for kin 60 tiles from its camp — honest,
  but a heart dial could own it).

# THE WORK LIVES IN THE WORLD — interaction & work-cycle rework

The gather/craft/interact choreography is the oldest surviving animation
system in the game. It predates the strike engine, the stoop lane, the
motion doctrine, and the ONE MOUTH fence — and every one of those
reworks routed AROUND it. This epic gives working bodies the same
architecture the fighting body earned: one world-space engine, honest
projection, per-rig voices, and impact that lands where the eye can
check it.

## Part 0 — the audit (receipts)

**The geometry is pre-strike-engine.** Every work cycle (chop, mine,
forage, milk, anvil, furnace, fire, workbench) is a piecewise
`nowMs % CYCLE_MS` block inside drawHumanoid writing `swingOffset` (a
raw angle added to `rig.dir`) and a radial `reach` — the hands sweep an
UNFORESHORTENED SCREEN CIRCLE (rig.ts 6327-6531). strikes.ts was built
to kill exactly this ("the audit's 'screen circles by design' comment
was the confession") and work never got the treatment: a north-facing
chop swings flat across the card, the axe never passes behind the head
(THE SWEEP EARNS ITS LAYER exists only for strikeRes, rig.ts 7959),
and the tool is rigidly colinear with the arm ray (heldAngle falls
through to `mainAngle` — an axe never pitches through its own arc).

**Orientation is a sign, not a bearing.** `workSide = cos(dir) > 0`
(rig.ts 6324) reflects the authored right-facer arc — and that's the
whole facing model. At N/S it picks a side arbitrarily; station cycles
don't even get the mirror (anvil swings unmirrored clockwise at every
facing, rig.ts 6503). The body DOES square up (renderer.ts 53490-53511
aims dir at build site > gather node > station > milk target) but the
override SNAPS the frame the pose flips, and remote bodies get a 5×5
nearest-tile guess because the wire never names the worked tile.

**One byte, seven meanings.** PoseState.Gather covers chop, mine,
fish, forage, crop-harvest, build, AND demolish (gameServer pose block
28869-28902). Craft covers ten StationTypes that findStation
(renderer.ts 2105) collapses to four guesses — loom, tanning rack,
alembic, carving bench, enchanting table, and sawhorse all animate as
generic "workbench taps". Fishing has NO animation at all (a rod
matches neither chop nor mine → generic sway; no rod pose, no line, no
bobber). Crop harvest — bare-handed work — swings the belt tool.

**The clock is a wall clock.** `gatherPhase: now/1000` and
`nowMs % CYCLE_MS` free-run; the swing never lands on the tick that
yields, and the anvil's own station-heat spark fan (renderer.ts 50950)
beats on `t*1.7` — the seen strike and the swung hammer are not
phase-locked. Impact particles spawn "0.38 tiles back toward the
swinger" (renderer.ts 53794-53909) — not at the tool's tip, because
the renderer cannot know where the tip is.

**The rigs are blanketed.** All eight humanoid dialects (flesh, skel,
kobold, gnoll, goblin, golem, ogre, skral, hob) ride the identical
work choreography; the stoop lane's armY drop is the only concession.
A hunched skral at a bench plays the upright human tap cycle. NPCs are
WORSE off: 56 `work:true` routine stops (smiths, weavers, tanners,
millers, bakers, fletchers, ropers, fishers, clerks) all play one
Craft byte, NPCs carry no tool so chop/mine can never fire, and 'fire'
+ 'workbench' stations conjure NO prop — empty-handed pantomime.

**No audit surface.** wieldlab has two frozen Gather rows (chop/mine);
craftKind, foraging, Milk, and fishing appear in `src/dev/**` zero
times. Every judgment ever made on station work was made live.

## Part 1 — THE LAWS

1. **ONE GEOMETRY.** A work beat is authored in the WORLD: a yaw track
   off the work bearing, a height track, a radius track, and — new,
   because tools are long — a tool PITCH track. Fist, haft, tool tip,
   and impact FX all project through WIELD_GROUND_K, so they agree at
   every heading by construction. (strikes.ts law 1, spoken for work.)
2. **THE WORK HAS A BEARING.** Every cycle aims at the worked TILE,
   not the facing byte: the square-up bearing feeds the engine, and it
   SLEWS (~140ms critically damped ease) instead of snapping. The tool
   tip's impact station lands on the node ring — where the tree
   actually stands — and the particle burst spawns AT THE RESOLVED
   TIP, not at a guessed offset.
3. **THE MIRROR LAW** (strikes law 2): arcs authored side = +1,
   reflected across the bearing axis; height never mirrors. The
   bit-leads flip in drawHeldItem keeps its paired predicate.
4. **THE SWEEP EARNS ITS LAYER** (strikes law 4): the resolved frame
   carries depthSin; when the arc crosses the away side the tool and
   striking pair paint behind the torso. A north-facing overhead chop
   passes BEHIND the head.
5. **THE IMPACT IS ONE TRUTH.** work.ts owns the phase tables —
   cycleMs, impact fraction, tip reach. The rig's swing, the particle
   gate, the sfx call, the haptic buzz, the station-heat flash, and
   the node shake all read the SAME table. Nothing beats on its own
   clock again.
6. **EVERY RIG SPEAKS ITS OWN WORK.** The engine resolves the shared
   arc; a per-dialect WORK VOICE (reach scale, raise cap, stoop
   deepening, tempo, crouch) adapts it to the body. Hunched species
   work LOW — the overhead heave caps under the sunken skull's
   comfort, the bench lean rides the stoop pitch deeper. Voices are
   parameters, never per-branch forks of the choreography.
7. **THE VERB IS VISIBLE.** Distinct work reads distinctly at world
   zoom: chop ≠ mine ≠ fish ≠ forage ≠ harvest ≠ build ≠ ten stations.
   Exaggerated, decipherable, correct orientation always — accuracy
   serves the read, not the reverse.
8. **THE SHEET IS THE PROOF** (doctrine rule 7): worklab renders every
   work kind × every dialect × 8 bands with live persistent sims,
   ?det determinism, and a segment-tint debug mode. No work visual
   ships unjudged again.

## Part 2 — phases

**Phase 1 — THE ONE WORK ENGINE (work.ts).** WorkSpec: named phase
stations (C1 keyframes, eased like the strike channels — holds and
snaps are choreography, not kinks) over channels {yaw, r, dy, pitch,
lean, choke, shiver}. `resolveWork(kind, u, side, bearing) →
{fistDX, fistDY, toolAngle, toolFore, offDX, offDY, lean, depthSin,
tipX, tipY, crouch}`. Ports chop/mine/forage/milk/anvil/furnace/fire/
workbench onto the engine at visual parity-or-better. Rig consumes it
inside the ONE MOUTH fence (writer census updated deliberately).
Impact tables exported; renderer particles/sfx/heat re-read them; tip-
true spawn points; node shake on impact (small, tone-tiered); anvil
heat flash phase-locked to the hammer.

**Phase 2 — THE POSE BYTE LEARNS ITS VERBS.** New PoseState values:
`Fish`, `Build`, `Harvest` (u8 stays u8; server pose block routes
gather-kind fishing → Fish, build/demolish → Build, crop harvest →
Harvest). Crop harvest goes bare-handed (forage school). findStation
returns the TRUE ten-station identity; rig craftKind union widens.
Remote bodies stop lying about their verb.

**Phase 3 — THE MISSING VERBS.** Fishing: cast → line arcs out to the
water tile (quadratic sag, animated), bobber + ripple rings at the
NODE tile, patient two-hand low hold with breathing rod tip, tug beat
on the yield cadence, splash impact. Build/demolish: kneel-and-tap
hammer school aimed at the site. Six new station choreographies:
loom (shuttle pass + batten beat), tanning rack (two-hand scrape
strokes), alembic (vial pour + swirl), carving bench (knife strokes,
off hand steadies the work), enchanting table (rune trace — hand
glow), sawhorse (two-hand push-pull saw stroke). Station props
conjured per kind (shuttle, scraper, vial, knife, saw; the fire gets
its ladle at last) so NPC artisans hold real tools.

**Phase 4 — EVERY RIG SPEAKS.** WORK VOICES: flesh/hob (parade
upright), gnoll/skral (stoop: low ring, capped raise, deeper bench
stoop, wider stance), goblin/kobold (small-body scurry tempo, gut
clearance), ogre/golem (mass: slow tempo, short arcs, heavy settle).
Verified per-dialect on the sheet; the skral smoke-shed worker and the
gnoll camp cook are the acceptance scenarios.

**Phase 5 — THE WORK SHEET (worklab).** All work kinds × dialect rows
× 8 bands, live sims with persistent LegSolver/kneeMemory/depthMemory
per fig (THE LAB LESSON), restT honest (work rows non-restful), ?det
sync-240, ?dbg segment tints + bearing ray + tip trace + impact
marker. The standing audit surface for every future station.

**Phase 6 — PASSES.** Screenshot-audit world-zoom + close-up, all
bands, per dialect; fix; re-shoot. Gates: client/shared/content/
server tests + 4-package tsc; hunk-level staging per the shared-tree
law.

## Part 3 — do not change

- Strike choreography, carriage blade numbers, shields/sheath
  (user-verdict art). The work engine BORROWS their projection, never
  edits it.
- Server timing policy (MIN_GATHER_TICKS, craft ticks) — this epic
  changes pixels and pose routing, zero economy ticks.
- The one-byte snapshot sample (18 bytes). New verbs are enum values,
  not fields. The worked tile stays client-derived — the square-up
  guess is good and Phase 2 makes its FAILURE modes honest, not wider.
- The WORK CARD / progress bars (shipped UX law).

## As-built notes

**Phase 1+4+5 (e3223f05).** work.ts engine as planned; keyframe
stations with in/out/smooth/hold eases (holds interp-freeze on the
previous station's channels). Voices shipped WITH phase 1 — the first
worklab audit convicted the blanket immediately (gnoll axe across the
muzzle, kobold pick over the skull), so raiseK/clearYaw/dropS/reachK/
leanK landed same-day: gnoll .55/.5/.04/1.06/.8, skral .6/.45/.03/1/.8,
goblin .7/.35/.02/.96/.9, kobold .6/.55/.03/1/.9, ogre .85/.15/0/1.1/
.7, golem .9/.1/0/1.05/.6. The engine's crouch channel is authored but
UNCONSUMED (milk keeps its pose-based crouch; wire when a verb needs
it). Bearing slew 70ms on anim.workDir. Impact one-truth: gates read
WORK_BOOK; anvil sparks at tipGX/tipGY; stationClang latches the
painter flash; nodeStruck/nodeShiverAt ring trees (.028s) and rocks
(.012s). Ladle + mallet conjured; bench respec'd tap-tap (impactAt
0.24, ungated — no knock sfx yet). worklab ?dbg adds bearing ray, tip
path, impact ring over the skrallab skeleton overlay.

**Phase 3a (7ff2faa0).** THE PATIENT LINE client-only — the pose byte
never needed splitting for fish (gatherKindAt already classified;
renderer now forwards fishing+fishTo). Hold stations carry toolYaw
0.62 outboard (the lifeline argument — S/N plumb-line collapse caught
on-sheet). Line anchors on the rod art's tip (0.62s,−0.235s) through
rotate+fore; dangle suppressed via drawTool rodCast. Crop harvest =
forage via isCropTile in gatherKindAt (bare hands, tool stows). Fish
impact: droplet burst + sfx.splash(0.5) + rumble .08/.18/55.
**(29c10565)** anglers are EXEMPT from the body-sprite cache (olKey
undefined → direct pass) — the cast line out-spans the bake canvas;
the sheet draws direct so only live carried the clip.

**Phase 3b (4d61d93b, restored whole in b905f368).** findStation
returns all ten true kinds; craftKind union = StationWorkKind. Six
specs: alembic POUR (pitch rolls past level, held on a shiver), THE
SCRAPE (team-mode drawknife whose horns run PAST the mitts — the
invisible-scraper defect, caught on-sheet), loom SHUTTLE PASS +
BATTEN PULL (full yaw sweep, trailing weft), carving knife strokes
pushed AWAY down the grain, RUNE TRACE (prop is LIGHT: radial glow +
3 orbiting motes), THE SAW (push-pull on the reach channel, sawdust
off the tip at impactAt 0.38, visual-only). Skral sawyer row = the
hunched-folk-at-station acceptance, passing.

**Shared-tree lessons (this epic, hard-won).** (1) `git commit` from
the SHARED index swept a neighbor's half-staged stream into 7ff2faa0
(their tests landed without their server half; the tree self-healed
via 132b9dbd + 18c936e4 before my repair landed — always re-check
HEAD before repairing). (2) From then on: scratch-index plumbing
(GIT_INDEX_FILE + read-tree HEAD + update-index --cacheinfo +
write-tree + commit-tree + update-ref CAS) — the shared index is
never touched. (3) A neighbor's commit can ROLL BACK your files if
they staged from an older base (d14d8efc reverted the six-station
work and broke tsc on main) — after any interleaved commit, diff
YOUR files against new HEAD before building on it. (4) **The CAS
alone is not enough** (cacf1f1a clobbered a6b3ae77's shields the
same way and cde1c62c repaired it): HEAD can advance between
read-tree and update-ref, and the CAS parent will happily point at a
commit your tree never saw. After write-tree, `git diff <CAS-parent>
<tree> --stat` and ASSERT only your own files appear — rebuild from
the new head if anything else shows.

**Phase 2 + close-out (cacf1f1a, shields restored in cde1c62c).**
PoseState.Fish (18) + Build (19). Server: gather-fishing → Fish at
start AND per-tick; build/demolish → Build; tend joins milk's byte;
routine `work:'fish'` stops (validator widened — the one non-boolean
work verb; fall_fisher_deep + pine_fisher flipped); cook posts pulse
Craft (ladle stir at their fire); nine transient setPose beats:
workStart/collect/compost/trough → Craft 24 (the 'tend' spec —
findStation maps windmill/churn/press/keg/smoker/drying-rack/compost/
apiary tiles to it), plant/water/fertilize/mulch/prune → Gather 20
(crop tiles classify to the forage kneel). Client: 'build' spec
(kneeling mallet, crouch channel consumed via the pose const — BOTH
copies, drawHumanoid + drawBackGear), findFishWater (spot first, open
water ±4 fallback — the pier case), THE CONJURED ROD + paintFishLine
extracted (rod-less NPC anglers get line/bobber/ripples), unified
fishAt drives slew/cache-exemption/auto-equip/splash-gate,
sfx.benchKnock + sfx.sawRasp through the one impact door.

**Phase 6 — THE LIVE WALK (paid; lane 19, vite.config.rig19.ts).**
Isolated rig: server :8871 on arx_worklane19 (fresh-migrated), BUILT
client via `vite build && vite preview` :5272 — the dev pipeline's
~600 dialogue-def dynamic imports exhaust a headless browser's
connection pool and bounce the session (ERR_INSUFFICIENT_RESOURCES);
the preview lane is the stable wire, and the config carries a
`build.target: 'es2022'` (the deploy target — top-level await in the
entry). Driven via window.dcGame (sendChat/interact/buildSend — the
chat input's FORM submits on programmatic Enter and navigates; never
type commands through the DOM). VERDICTS, all passing: chop at five
bearings (mirror true E/W, square-up, world arc, canopy veil doing
its job, chips at the node edge); mine at two (overhead heave, chips
+ seam sparks); player fishing = pose 18 with rod/line/bobber/ripple
and the water reflection carrying the rod; build = pose 19 on open
ground, KNEELING (crouch channel live), knocks at the mallet face,
campfires standing after; berry forage bare-hand; Ottery the
Dawnmead joiner working his bench (the 'bench' knock arrived
own=false before I ever went looking); Ylva the Pinewatch pier
fisher at pose 18 with the CONJURED ROD and cast line, empty-handed.
THE IMPACT DOOR INSTRUMENTED (wrapped onGatherImpact +
particles.burst): tree/rock/fish/forage/build/bench all fire through
the one door, node- and tip-anchored. Zero renderer errors on the
built lane. Walk gotchas for the next lane: oak wants woodcutting 15
+ iron axe (a bronze-axe refusal reads as 'nothing happens' if you
miss the chat); a depleted node ends the gather (the first
zero-impact probe was a stump, not a bug); the construction skill id
is 'construction', never 'building'; buildSend refuses rocky ground
silently.

## Still owed (next sessions)

- Loom/tanning impact beats (visual-only cycles today; candidates
  for soft one-shots later).
- `work:'fish'` for the six plain-post fisher routines (salt_angler
  family) — eyeball their posts against water first.
- The tend beat at a live windmill/churn (needs a work recipe run;
  choreography sheet-proven, transient pose mechanism live-proven
  via the same setPose rail as Build).

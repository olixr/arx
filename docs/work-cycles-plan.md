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

(appended per phase)

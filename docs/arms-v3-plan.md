# ARMS v3 — THE ARM ANSWERS THE WORLD

The plan of record for the foundational rework of the procedural arm
system. Written against a two-front audit (2026-08-12): a code audit of
rig.ts 3608–5320 (the arm/weapon solve and depth ladder), wield.ts,
carriage.ts, sheath.ts, shields.ts, and the renderer feed; and a visual
audit on the rebuilt riglab ARMS SHEET (8 facings × idle/walk/run ×
every carry class, live-simulated gaits with persistent anim state —
the first lab that actually exercises the stateful laws; see Part 3).

This supersedes nothing: docs/wield-plan.md remains the honest record
of the LAST rework. Part 0 below documents which of its laws shipped
and which were quietly never built — that gap is where the compounding
started.

## Part 0 — what the audit found

### 0.1 The unbuilt laws of the wield plan

The wield rebuild shipped its per-class vocabulary (staffWield,
greatWield, bowWield, the honest pump, the gait ladder) — but three of
its founding laws exist only in the plan document:

- **ONE MOUTH PER CHANNEL — never implemented.** `heldAngle` now has
  SEVEN writers (was six at the last audit): the init at rig.ts:4138,
  five mutually-exclusive strike branches, then unconditional `+=`
  accumulations from the rest lerp (4385), wrist-follow (4489), the
  cast present (4611), and the sheathe (4690). `offX/offY` is still a
  ~10-branch cascade with five later overwriters.
- **ONE CLASS, ONE DETECTION — never implemented.** `wieldClass` does
  not exist. Class is derived four times: held (rig.ts:3620-3630, with
  the check-great-first fragility hand-patched into `isSword`), worn
  (4653-4656), the painter's own style probes, and the trail gate's
  `weapon.weapon.style === 'onehand'|'twohand'` re-derivation (4830).
- **THE GRIP IS WHERE THE FIST IS — half-implemented.** `BOW_GRIP_X`
  was never created; the `0.18s` bow apex constant is duplicated
  across ≥8 sites in weapons.ts and rig.ts.

### 0.2 Structural rot (new since the wield rebuild)

- **Three meanings of `side`.** carriage.ts's module header says
  "screen side the hand hangs on"; its own `bladeCarriage` docblock 40
  lines later says "facing weight, NOT the hanging side";
  `settleElbowPole` uses the outboard-arm sign; sheath.ts calls the
  weight `rake`. staffWield/greatWield take the smoothed SIGN where
  bowWield takes the WEIGHT in the same positional slot — a silent
  caller swap away from a mirrored stance.
- **Three depth laws.** `WIELD_GROUND_K = 0.52` (exported, consumed by
  nobody outside wield.ts), shields.ts's private `GROUND_K = 0.52`
  (duplicated literal), and `projectStrike`'s own K=0.7/floor 0.85 —
  plus bowWield's third softening (`0.5 + 0.5·fore`) stacked on
  projectCarry's already-softened output. No test pins any of them to
  any other.
- **Compensating offsets outside the vocabulary.** rig.ts:4328 adds
  `fx·0.04·s` to the great carry and rig.ts:4352 `fx·0.05·s` to the
  staff carry — bare magic nudges at the assembly site, exactly what
  the frame functions were supposed to own.
- **Stale channels across pose boundaries.** `armSwingK` is written
  only inside the rest branch but consumed outside it (retains its
  last value into combat); `staffGrip` snaps 0.5–0.72 → 0.34 at combat
  entry with no blend (the grip channel is explicitly excluded from
  both neutral-at-ends tests); the off-hand pump gain pops 1 → 0.85
  when an off blade is equipped; the pump itself drops to zero with no
  blend when leaving the restful poses.
- **Five ladder dialects.** Blades ride `gaitK`, staff/great ignore it
  and consume raw `runF`, bow uses `gaitLift`, runnerLift mixes a
  fourth combination. "Every class rides one ladder" is not true.
- **Dead exports.** `GREAT_GUARD_PITCH` (its value re-literalled 3×
  inside greatFinisherPath), `STRIKE_REST_ARM` (duplicated privately
  twice in wield.ts), `WIELD_GROUND_K`, `gaitLift` — exported for a
  wiring that never happened.
- **Undebounced layer flips.** Only `mainBehind`/`offFront` earned
  hysteresis. Seven+ facing thresholds flip paint order raw:
  `fy < −0.35` (weaponBehind + gearBehindLegs), `fy > 0.08` ×2 (staff
  trail, great shoulder), `fy < −0.08` (great front), `fy < −0.16` ×2
  (quiver, sling), `profileK > 0.62` (belt), `runF > 0.35`,
  `restSettle > 0.5` ×6. Running a slow arc across any of these lines
  pops the weapon between layers.
- **Two `profileK` definitions in one file** — `|fx|` for the rig,
  `min(1, |fx|·1.15)` at 8 painter sites.
- **`armY = hipY − 0.26s` ignores the squash** (`shoulderY` rides
  `hScale`; the hand anchor line does not) — the two ends of the arm
  frame disagree about the fake-3D compression.
- **The caller contract is untyped at the edges.** AnimState.armDepth
  is declared `{mainBehind: boolean}` while the rig mutates eight more
  fields onto it; cms/portraits.ts and cms/gameRender.ts cast through
  `as unknown as` (gameRender passes an `equip` key RigPose doesn't
  have — mob loadouts silently never reach the hands in CMS renders);
  lookCreator feeds no memory at all. Until this pass, both dev labs
  allocated a FRESH depthMemory every frame — every stateful law
  (240ms side ease, 120ms dwell, 80ms swing low-pass, elbow memory,
  both layer hysteresis pairs) was dead in every sheet ever judged.

### 0.3 What the lab showed (the perceptual failures)

- **THE DEPTH-AXIS COLLAPSE.** The one projection law is geometrically
  honest and perceptually wrong at the camera lines. Staff run S: the
  leveled carry projects to a vertical stick with the crown orb
  SCRAPING THE GROUND (an inverted crown — our own staff law). Staff
  run N: a vertical stick indistinguishable from the idle plant. Sword
  run S: a stick held straight down mid-sprint. Bow draw S: the archer
  aims the arrow at their own feet; N: at the sky — because the hand
  orbit and the aim anchor (`cos/sin(dir)·reach`, `fx/fy·bd`) are
  UNFORESHORTENED SCREEN CIRCLES. The slash trail already knows better
  (it draws an ellipse, TRAIL_K 0.62 — with its own constant, ≠ 0.52);
  the fists that swing the steel still ride the flat card the trail
  comment complains about.
- **THE VANISHING LOADOUT.** At N/NE/NW the gear disappears entirely:
  the kiteshield is INVISIBLE at NE and NW (a sword-and-board knight
  reads as unarmed from 2 of 8 facings), the bow vanishes at N/NE, the
  sword thins to a sliver between the legs, the tome hides. Honest
  occlusion, dead readability — there is no silhouette-peek law.
- **THE BROKEN MIRROR.** SE↔SW and E↔W are not mirror images. The
  greatblade run carry points tip-UP at SE and tip-DOWN INTO THE
  GROUND at SW (the `hemi = sin(dir) >= 0` hard flip interacting with
  the smoothed side — the exact joint case no test samples). The
  planted staff stands beside the head at E but ACROSS THE FACE at W.
  Rogue idle blade layering differs E vs W. Only bladeCarriage and
  bowWield have mirror tests; staff and great have none.
- **THE STATUE RUN.** On S-facing (camera-line) gaits both fists sit
  symmetric at the hips — the honest pump's motion lives on the depth
  axis and projects to almost nothing. Honest, and dead: nothing else
  picks up the beat, so the run reads stiff exactly where the player
  camera points most of the time.
- (Adjacent, legs) The S-facing run's trailing leg folds flat sideways
  at ground level mid-stride — the same depth-axis degeneracy family,
  logged here for the leg pass that should ride this epic.

## Part 1 — the laws of v3

**THE ONE WORLD FRAME.** A wield is authored in the world (yaw, pitch,
lateral lane, grip) and rendered through ONE projection: a single
`GROUND_K` with a single perceptual-floor law, shared by carries,
strikes, the pump, the AIM, the HAND ORBITS, and the trails. The three
parallel softenings collapse into one function with one set of
constants; shields.ts imports it instead of re-declaring it. The hand's
combat orbit and the archer's aim anchor become ground ELLIPSES —
`(cos·r, sin·r·K)` with the lift channel carrying the vertical — so a
thrust north is short and high, a thrust south short and low, and the
fist finally lives in the same world its slash trail does.

**THE FACING FRAME.** One struct, computed once per body per frame:
`{fx, fy, profileK, sideSign (eased, dwelled), sideW (weighted),
bands}` — and every vocabulary function takes IT, not a loose number
whose meaning drifts per module. The three meanings of `side` die; the
0.2 floor moves inside with its name on it; the two `profileK`
formulas become one.

**ONE MOUTH PER CHANNEL, ENFORCED BY SHAPE.** Every class function
returns a `WieldFrame {mainX?, mainY?, heldAngle?, fore?, offX?,
offY?, offAngle?, grip?, pumpK?, layer?}` and rig.ts owns ONE assembly
site per channel: resolve class → resolve frame → blend frames (rest ↔
strike ↔ sheathe ↔ seat ↔ shield claim) → write once. Wrist-follow,
cast present, flourishes are FRAME MODIFIERS applied inside the
assembly, not scattered `+=`. The `fx·0.04/0.05` nudges move into
staffWield/greatWield where they belong. A lint-shaped test walks the
assembly and fails on any second writer.

**ONE CLASS, ONE DETECTION.** `wieldClass(def): {kind: 'blade' |
'great' | 'staff' | 'bow' | 'tool' | 'none', compact, styles}` —
computed once, cached by item id, consumed by the held solve, the stow
solve, the painter gates, and the trail gate. The check-great-first
ordering lives inside it, once.

**EVERY FLIP EARNS ITS HYSTERESIS.** All layer decisions route through
one banded facing resolver with enter/exit thresholds riding
depthMemory (the mainBehind pattern, generalized): weaponBehind,
gearBehindLegs, staffTrailBehind, greatShoulderBehind/Front, belt,
sling, quiver. A slow arc across any boundary swaps layers exactly
once, at a defensible moment. Where geometry permits, the swap is
placed where it is invisible by construction (the shield's profile
trick, generalized).

**THE MIRROR LAW.** Every carry, every class, is pinned mirror-
symmetric: E↔W and SE↔SW produce reflected geometry (angles negated,
lanes mirrored, layers mirrored). The greatWield hemisphere flip is
rebuilt as a continuous signed pitch (no `sin(dir) >= 0` branch), and
staff/great/bow/blade all get the same automated mirror sweep blades
already have — including the JOINT case (facing near a camera line
while sideS is mid-ease).

**THE LIFELINE (perceptual depth-axis floor).** At camera-line
facings, a long carry keeps a MINIMUM SCREEN-LATERAL COMPONENT: the
authored yaw biases toward the eased side (riding sideS, so it turns
continuously and never snaps) just enough that a staff/great/bow reads
as a diagonal, never a vertical stick. Paired with THE CROWN NEVER
DIGS: a projected carry may not point a staff crown / great tip into
the ground band — the pitch floor clamps before the projection, in the
world, so the guard is honest. The bow aim keeps its true fire
direction for gameplay, but the DRAWN POSE rides the projected
ellipse: a south draw holds low-forward (not at the feet), a north
draw high-forward (not at the zenith) — the elevation read comes from
the arrow's fore + lift, the way the trail already tells depth.

**THE SILHOUETTE PEEK.** Away-band carries may tuck behind the body
but never vanish: each class authors a peek lane (minimum lateral
offset at the away bands) so a shield shows its rim past the shoulder,
a bow shows a limb tip, a blade shows its point beside the hip — at
every one of the 8 headings a loadout is readable. This is a lane
adjustment in the class functions, not a layering hack.

**ONE LADDER, EVERY CHANNEL.** All classes consume the same
`gaitK`/`gaitLift` pair; the grip channel joins the neutral-at-
boundary contract (staffGrip/greatGrip lerp on the same 280ms pose
blend every other channel uses); `armSwingK`, the pump, and the
off-gain ride blended weights that live in the frame, so nothing pops
on pose entry, pose exit, or a weapon swap.

**THE VISIBLE BREATH.** Where the honest pump projects to nothing
(camera-line gaits), the beat re-expresses through channels that
SURVIVE projection — alternating elbow lift, the shoulder-line
counter-sway, the sw² bounce — scaled by (1 − |poleX|) so it fades in
exactly where the fore/aft read fades out. Same energy, different
axis; never a fake side-to-side arm swing.

**THE CONTRACT IS TYPED.** `AnimState.armDepth` becomes
`RigPose['depthMemory']` by construction; the CMS casts die (and
gameRender's dead `equip` key is wired to the real RigPose fields so
CMS mobs hold their weapons); every drawHumanoid caller either owns
persistent memory or is a deliberate, documented stateless portrait.

## Part 2 — the phases

**Phase 1 — THE COMMON TONGUE** (pure refactor, zero pixels change).
**SHIPPED 2026-08-12 (4c96c3b + 0129fe7).** wieldClass + the shared
constants: one GROUND_K (shields imports it), BOW_GRIP_X born and
consumed at the grip wrap, the limb quadratic, and rig's carry
translate, rest-arm dedupe, GREAT_GUARD_PITCH wired into
greatFinisherPath, faceProfileK single-sources the 13 inline face
reads, the rest anatomy named + exported + imported by the tests.
armDepth retyped; CMS casts killed (gameRender's dead equip key wired
— bestiary mobs now hold their weapons — portraits' dropped cape slot
fixed); lookCreator/farmlab own persistent anim memory. Zero pixels
PROVEN: det=1 runs 240 fixed steps synchronously (headless capture
fires ~4 rAF frames in — the stamp is the receipt), and all four
sheet bands byte-matched pre/post refactor at the settled frame-239
state. armY joined the hScale frame as its own flagged commit
(coherent 1–3px arm-frame shift, measured per facing column).
As-built notes: the FacingFrame STRUCT is deferred to Phase 2 — its
threading rebuilds the same signatures the ONE MOUTH assembly owns,
so it lands there (the constants half shipped here); the painter's
style dispatch in drawHeldItem keeps its own chain for the same
reason (it interleaves tools/rods and needs colored styles).

**Phase 2 — THE ONE MOUTH.** **SHIPPED 2026-08-12 (bf0d819 sheet
rows + 9208212 assembly + bb584f2 transitions).** FacingFrame is the
one side vocabulary (SIDE_FLOOR/SIDE_SLOPE named inside;
staffWield/greatWield/bowWield take the whole frame); the 0.04/0.05
nudges are the frames' own `fwd` channel; the five strike-angle
sources resolve through one pure expression; every arm-channel write
lives between THE ONE MOUTH BEGINS/ENDS fences with
armAssembly.test.ts walking the comment-stripped source (zero writes
outside, pinned per-channel census — a new writer is a decision);
the painter dispatch and bow fore-scale read wieldClass (tools pinned
'none' by roster test). Stale channels: the renderer's rest clock
glides on exit (~80ms, entry ramp untouched), the rest + pump stages
gate on restSettle instead of pose (no-ops at settle 0 by
construction), pump contributions scale with the settle, and
staffGrip/armSwingK join the settle blend. Proof: six det bands
(carries + the new strike/cast/sit/sheathe/chop/mine assembly rows,
riglab rows 21–33) byte-identical at settled states through every
change; the transition probes (rows 34–35, ?detn=N) measured the
pose-flip pixel delta nearly halved (6.49%→3.79%) with later steps at
parity. As-built: the offSwingK 0.85↔1 equip-swap pop is left as-is —
an equipment swap is inherently instantaneous; a WieldFrame OBJECT
(vs the fenced pipeline) was judged not worth the churn once the
fence + census gave the same guarantee.

**Phase 3 — THE HONEST DEPTH.** **SHIPPED 2026-08-12 (f3b65e2).**
One ground K everywhere (projectStrike's private 0.7 retired; shared
softFore with named per-context floors 0.8/0.85); projectAim carries
the ellipse (raw px/py for reaches, unit ux/uy for directions) and
feeds thrust/ice fists + marks, cast punch, finisher streaks, the
great smash, and the whole bow-draw rig (anchor, haul, recoil,
tremble, painter angle + BOW_PLANE_SOFT fore); trails ride the same
K. THE LIFELINE (lifelineYaw: eased-side yaw bias, zero at profile,
mirror-true, continuity-pinned) keeps sword/staff carries diagonal at
the camera lines; THE CROWN NEVER DIGS (STAFF_CROWN_GUARD) lifts the
south sprint's crown to the waist. As-built decisions: the
strike-stage ORBITS stay screen circles — the schools' cut planes
are facing-dependent authored art and Part 4 makes the choreography
law; K stays 0.52 (the shield's user-approved ground; the camera's
true yScale is 0.6 — a deliberate stylization gap, documented);
greatWield untouched (its plane law is Phase 4's mirror rebuild);
work cycles untouched (Part 4). Verified by an exact per-row change
map (unchanged rows at literal 0.0%) + all-facings cell judgment +
re-pinned law tests.

**Phase 4 — THE READABLE EIGHT.** **SHIPPED 2026-08-12 (5825409).**
bandFlag = the one hysteresis resolver on depthMemory for every layer
flag (away-deep shared by weaponBehind/gearBehindLegs, shoulder/trail
fy + runF + settle bands, belt, sling, quiver, elbow hold) — bands
straddle the old thresholds with every cardinal facing outside the
dead zone, so settled cells proved 0.0% changed while rotation flips
land once. THE SILHOUETTE PEEK: shields.ts away-diagonal clearance
(mirror of its own mid-band law), PEEK_HANG_K hang-lane widening,
bow outboard peek — footprint proven to be exactly the NE/N/NW
columns, shield rim/back visibly restored at both away diagonals.
As-built correction: greatWield's flagged SE↔SW mirror break DOES NOT
EXIST — proven mirror-true to 1e-9 and continuous through every
hemisphere crossing incl. the joint case, then PINNED (the audit's
capture caught stride-phase, not asymmetry; no rebuild). staffWield
gained its missing mirror pin. E/W layering asymmetry measured
against a bare-handed control: weapon rows 5.3–6.1% vs 4.7% baseline
(lead-side art, not carriage); staff idle E/W verified as clean
mirrors — the W face-overlap resolved through Phases 2–3's
mirror-true geometry.

**Phase 5 — THE LIVING GAIT.** **SHIPPED 2026-08-12 (6bfa329).**
THE VISIBLE BREATH: armPump's vertical remnant gains BREATH_K where
the lateral dies (zero at profile by construction) and free fists
alternate their runner's lift with the smoothed stride (LIFT_ALT_K).
BREATH_K's first cut (0.85) overstretched the stride bottom and the
elbow regression suite caught it — recalibrated to 0.5 with the reach
budget documented. Footprint proven: moving rows only, E/W 0.0%.
As-built: the five gait-ladder "dialects" stand as legitimate
per-class authorship (the staff's planted walk is a user verdict);
the S-facing trailing-LEG fold is handed to a dedicated leg pass —
it lives in the leg solver's depth model, not the arm system.

**Phase 6 — THE PINNED LAW.** **SHIPPED across Phases 2–5, closed
2026-08-12 (6bfa329).** The channel-owner walk (Phase 2), mirror +
joint sweeps for every class (Phase 4), GROUND_K equality by
construction (Phase 1 imports), and the last pins: sideW floor+slope
by name, fractional armedK, and the dwell truth — the feared
"dwell-defeating wobble" flips CORRECTLY (150ms+ holds ARE turning;
the ease absorbs them) while sub-dwell jitter never registers, both
pinned. Choke collinearity is guaranteed by construction (chokes ride
heldAngle × mainFore inside the fenced, census-pinned assembly). The
ARMS SHEET is the standing audit surface (persistent per-fig state,
det/detn proof harness, transition probes).

**THE EPIC IS COMPLETE.** All six phases shipped 2026-08-12,
437275b → 6bfa329.

## Part 3 — verification

The ARMS SHEET (packages/client/riglab.html → src/dev/riglab.ts,
rebuilt this pass): 8 facings × {idle, walk, run} × {bare, sword std,
rogue, dual, sword+board, great, staff, bow, tome}, plus the strafe
row (facing S, traveling 8 headings), stow row, and bow-draw row.
Every figure owns a persistent LegSolver, kneeMemory, and depthMemory
— the stateful laws RUN in the lab now. Screenshot bands via
`?rows=a-b`, walk-speed lever `?gait=walk`. Judge every cell; then
live: equip each class in-game, run all 8 headings + slow arcs across
the N and profile boundaries (the flip-pop hunt), sheathe/draw on the
move, at 120fps.

## Part 4 — what does NOT change

- carriage.ts blade numbers, strike specs, finisher paths, echo law —
  user verdicts, untouched. Strikes keep their choreography; they
  simply write through the one assembly and the one projection.
- shields.ts plane math, sling, straps, dialects (it gains only the
  imported GROUND_K and the peek lane at the away bands).
- sheath.ts stow spots and phases.
- Work cycles (chop/mine/forage/milk/craft), the seat vocabulary.
- All painters' art. The bow keeps its geometry; the staff keeps its
  crown-along-+x law (the LIFELINE defends it).
- Protocol, server, content: a pure client render epic.

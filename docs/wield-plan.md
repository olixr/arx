# THE WIELD REBUILD — every hand holds its weapon the same way

The plan of record for unifying how held items are carried, swung, and
slung across the full free rotation. Written against the audit of
rig.ts 2278–3591 (the arm/weapon solve), weapons.ts, tools.ts,
carriage.ts, sheath.ts, and shields.ts.

## Part 0 — what the audit found

The game has FOUR dialects for "a hand holds a thing":

1. **Blades** speak carriage.ts — a pure, law-tested vocabulary
   (HOLD-MAINTENANCE, ASSASSIN CARRY, facing-weight). The good one.
2. **The bow** speaks two disjoint pipelines: a rest-carry formula
   inline in rig.ts (2906) blended into `heldAngle`, and an aim path
   (3070) that ignores `heldAngle` entirely and passes `rig.dir`
   straight to the painter. Its painter is the only one whose long
   axis is ±Y with the fist on the STRING line, reconciled by a magic
   `0.18s` constant duplicated in two files.
3. **The staff** speaks an inline walking-stick blend (2888) — and has
   NO second hand, ever. A "two-handed" weapon held one-handed at
   every gait, while axes and pickaxes DO get the two-hand choke.
4. **The shield** speaks shields.ts — the plane leads, the arm is
   dragged to it. Also the good one, and the model for the fix.

Structural rot on top: `heldAngle` written from six sites with no
owner; `offX/offY` written by ~11 mutually-exclusive branches then
overwritten by five later ones; class detection triplicated; the
off-blade guard baseline sits ~π from its own carriage and meets it
only through a lerp; five facing thresholds (−0.35, −0.16, −0.16,
0.62, 0.78/0.86) decide depth with only two of them debounced.

And the direction complaint is real and diagnosable: the arm pump is
driven by the SCREEN projection of travel (`poleX/poleY`), so on N/S
runs `poleX ≈ 0` and the arms only bob — then two patches (extra pump
suppression front-on, a lateral sway term) fight the symptom. Sneak
walking has no pump at all.

## Part 1 — the laws

**THE ITEM LEADS THE HAND** (the shield's insight, generalized). A
wield is authored as the ITEM's pose in body space — where the thing
is, at what angle, at what grip — and the fist is dragged to the
item's grip point. The arm is consequence, never cause.

**ONE MOUTH PER CHANNEL.** `heldAngle`, `mainX/mainY`, `offX/offY`
each get ONE assembly site fed by a resolved `WieldFrame`, not a
branch cascade. The frame is computed by pure functions in a new
`render/wield.ts` (carriage.ts grows into it; carriage's blade law
numbers are user-approved verdicts and move over UNCHANGED).

**THE GAIT LADDER: idle → walk → run are three poses, not two.**
Every class authors three anchor stances and the frame blends
`idle --moveK--> walk --runK--> run` continuously (moveK =
min(1, poleStrength), runK = smoothstep of the existing runF). Today
only the staff distinguishes walk from run; now every class does.

**THE HONEST PUMP.** Arms swing along the direction of TRAVEL,
foreshortened by the ground law — pump vector = `(tx, ty·K)` with
K = GROUND_K (0.52, the shield's own ground factor), NOT the raw
screen pole. On an E/W run that is the familiar fore/aft swing; on a
N/S run the hands alternately reach toward and away from the camera —
smaller on screen (foreshortened, honest) but VISIBLE, riding beside
the torso on the hang-width lane, never through it. The two
symptom-patches (front-on pump suppression, bolt-on lateral sway)
fold into this one law. Sneak keeps a low-amplitude pump (a stalking
sway), no longer frozen arms.

**ONE CLASS, ONE DETECTION.** `wieldClass(def): 'blade' | 'staff' |
'bow' | 'tool' | 'none'` — computed once, exclusive by construction
(kills the isStaff/else-if/isBow chain and the triplicated worn/stowed
re-detection).

**THE GRIP IS WHERE THE FIST IS.** Painter contract: every painter's
origin IS the fist on the item's grip. The bow painter keeps its
geometry but the `0.18s` apex constant becomes an exported
`BOW_GRIP_X` consumed by both files — and the carry slide is FULL
(a bow at rest is held by the wood, always; the old
`carry: restSettle` slid the fist onto the string mid-blend).

## Part 2 — per-class wields (idle / walk / run / attack)

**1H blade, standard grip** — carriage.ts anchors unchanged (the
user-tuned verdicts): idle blade down-forward off the leg, run levels
toward-never-past horizontal. NEW: the walk stage sits between them
(a purposeful carry, tip low), and the honest pump gives N/S gaits
the fore/aft arm life they were missing. Wrist breath, flourishes,
wrist-follow all survive.

**1H blade, rogue grip** — the assassin carry unchanged (low, coiled,
LOW-HANDS law). Walk stage: the same low line with the quiet pump.
The reversed blade stays reversed through every gait and every strike
(GRIP TRUTH is already test-pinned).

**Off-blade** — same vocabulary through the off fist (dx mirrored by
the caller, as today). The guard baseline keeps its tip-up combat
read, but the rest blend now targets the same gait ladder.

**Shield** — shields.ts is law and stays. The wield module only
routes around it: the off hand yields to `solveShield`'s grip claim
exactly as today, and the honest pump feeds the same `swing` channel
the shield already reads. No shield art or plane math changes.

**Two-handed staff** — the headline fix. Idle: upright walking-stick
plant beside the body (grip 0.72), off hand FREE. Walk: still the
planted stick, rocking with the stride. Run: the staff levels to the
two-hand trail carry — and the OFF HAND JOINS THE SHAFT, choked
toward the crown (the tool-choke pattern, `offGripT` a fraction of
the shaft so the hand is ON the wood by construction at every
facing). Cast: the staff PRESENTS — levels toward the aim with both
hands on it while the crown flares (the existing castT flare keeps
working). The off hand yields to shield claim if one is somehow
raised, and detaches during sit/sheathe exactly like the main.

**Bow** — held by the wood at every gait (carry = 1 at rest, the
grip-wrap in the fist), the approved rest angle kept ("one motion
from the aim" verdict). Walk/run: the bow rides the pump like any
carried item, string toward the body (BOW MIRROR law untouched).
Aim/draw: ONE pipeline — the aim path now writes the same
`heldAngle` channel (value `rig.dir`, as the painter got before) so
the class has a single angle owner; off hand on the wood, main hand
on the string, exactly the current read.

**Attacks** — THE TWO SCHOOLS (strikeFrame/thrustPath/icepickPath)
are law and stay byte-identical. The wield frame only owns the CARRY;
strikes keep writing their channels through the same single assembly
sites. The icepick mark constants get one shared definition (they're
currently duplicated between the solve and the streak FX).

## Part 3 — verification (the lab, then live)

A throwaway `wieldlab.html` + `src/dev/wieldLab.ts` (shieldlab
pattern, deleted before commit): drawHumanoid across a matrix of
8 facings × {idle, walk, run, attack beats} × {sword std, sword
rogue, dagger, dual, sword+shield, staff, bow}, with query levers.
Screenshot the strips, judge every cell, iterate. Then live: equip
each class in-game, run all 8 headings, attack, sheathe, at 120fps.

Law tests in wield.test.ts: gait continuity (no channel pops across
moveK/runK), facing continuity through a full turn, mirror symmetry,
tip-below-hand at every gait for both grips (inherited), staff
off-hand ON the shaft at run (collinearity within epsilon), bow
wood-grip at rest, pump alignment with travel (N/S pump is vertical
±K, E/W pump horizontal), single-owner assembly (type-level: the
frame is the only writer).

## Part 4 — what does NOT change

- carriage.ts blade numbers, strike specs, finisher paths, echo law.
- shields.ts entirely (plane, sling, depth override, straps).
- sheath.ts entirely (stow spots, scabbards, back slings).
- Work cycles: chop/mine/forage/milk/craft/sit hand choreography.
- All painters' art; only the bow grip constant is EXPORTED, and
  painter origins are documented as the fist.
- Protocol, server, content: this is a pure client render epic.

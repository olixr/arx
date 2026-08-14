# THE HILL COMES DOWN — the ogre family

*Design + build plan, 2026-08-14. The giant-kin arrive: the first true GIANT
bodies in Arx — twice the player's height and more, slow, predictable,
monstrous, and built on THE MOTION DOCTRINE end to end. D&D-true: the
quick-tempered, dim, gluttonous hill bully with a greatclub, a javelin arm,
and a tantrum.*

---

## 1. Why ogres, and why now

Every biped mob to date tops out at the ice golem's 1.70 rig size. The ogre
family breaks the ceiling deliberately: 2.1–2.55 rig sizes, the biggest
walking silhouettes in the game. That scale is the design — an ogre is
readable at any zoom because *nothing else is shaped like a hill*.

D&D source read (5e MM): Large giant, AC 11 (hide armor), 59 hp, speed 40,
STR 19 / INT 5 / WIS 7. Greatclub 2d8+4; javelin 2d6+4 thrown 30/120.
"Ogres are hulking giants notorious for their quick tempers. When its rage
is incited, an ogre lashes out in a frustrated tantrum until it runs out of
objects or creatures to smash." Classic visual canon: nine to ten feet,
sloped forehead over a heavy brow, underbite with proud lower teeth, dull
warty hide (tallow yellow through dun brown to ash grey), lank greasy hair,
a gut that leads the body, filthy pelts cinched with rope, a club that was
recently a tree, and a sack of dented junk it calls treasure.

## 2. THE FOUR READS (owned by no other body)

1. **THE SLOPE.** A proportionally SMALL skull (headR ×0.98 on a 2.15+
   frame) whose forehead falls backward in one straight plane from a heavy
   brow ledge into the shoulder hump. Every other dialect grew the head
   (goblin 1.34 the biggest); the ogre *shrinks* it — the inversion IS the
   giant read. Near-neckless: headY sinks to ≈ −th − headR·0.22.
2. **THE GUT.** The belly is the widest station of the body — wider than
   the shoulders (the ogre triangle points UP; heroes and golems point
   down). And it is a SIMULATION, never a pose: a one-mass vertical
   spring (GutSim) driven by the IK legs' plant events, so every footfall
   lands with visible weight, plus a slow deep breath cycle at idle (the
   sleeping-hill read). Never rig what can be simulated.
3. **THE UNDERBITE.** The jaw is WIDER than the skull at its corners and
   leads it in depth; two lower tusk-teeth stand proud of the lip even at
   rest. The gape (strike/cast beat) drops the jaw into a roar that shows
   the whole lower row. The brow knits down toward the nose — an ogre is
   always slightly angry.
4. **THE KNUCKLE HANG.** Arms hang past where any other biped's knees
   would be — unequal bones (short heavy upper arm, LONG forearm via
   solveLimb2Into), ham hands with knuckle ticks, the greatclub resting
   over the shoulder at idle and dragging through the turn.

Tertiary breath of life: a belt TROPHY (seed-rolled: skull / kettle /
gnawed bone) swinging on a short verlet pendant; seeded warts and hide
patches; one torn ear per the scarred roll.

## 3. THE CARRIAGE IS A PROJECTION (the bar-raiser)

The doctrine's law 3, finally spoken by a walking body: the ogre torso is
authored as 3D body-frame offsets (F fwd, L lat, Z up) projected through
the fixed bird's-eye camera (YK 0.6) inside `paintOgreBody` — gut sphere,
chest slab, shoulder hump, hair mat, wrap, rope, trophy root are all
STATIONS on one carriage, so orientation, foreshortening, and near/far
ordering at all eight bands and every in-between fall out BY CONSTRUCTION.
No per-band blends anywhere in the torso. The head keeps the
KoboldHeadFrame contract (the dialect lane) with an AUTHORED TRUE-PROFILE
swap past profileK 0.9 — bespoke side silhouette UP FRONT (the gnoll law:
sloped crown in one line, jaw juts past the brow plumb, ONE tusk, ear at
the occiput), blends below the branch only ever serve the ¾ bands.

The hump rides BEHIND the head's station: face-on the head overlaps the
hump; from the north the hump and hair mat honestly occlude the jaw. That
z-truth is the "3D model in a 2.5D space" proof, and it costs nothing —
it's the projection's sort order.

## 4. The bodies

| id | name | L | size | role |
|---|---|---|---|---|
| `ogre` | Ogre | 22 | 2.15 | greatclub bruiser, pairs in the hills |
| `ogre_hurler` | Ogre hurler | 24 | 2.10 | javelin + millstone standoff arm |
| `ogre_bellower` | Ogre bellower | 26 | 2.25 | the caster: a voice that moves the ground |
| `ogre_champion` | Bonegrinder ogre | 28 | 2.50 | NAMED champion, rally, the camp's master |

- All pack `ogre`; sightArc 140 (dim-eyed — the sneak window a giant owes);
  speed 2.9–3.1 (a 40-ft walker: quicker than a golem, slower than
  everything its size threatens); attackCooldownTicks 56–60 (the slow
  heavy basic every premium prices off); radius 0.5–0.56; hitHeight
  3.6–4.2. Lanes: resist `stun`-adjacent? NO — keep lanes simple:
  `NPC_LANES` GIANT `{ resist: ['bleed'], weak: ['bow'] }` — thick hide
  shrugs the cut, the big slow body eats the aimed shot.
- xp ratios all in [2.6, 2.9] (MARK'S WORTH): ogre 460/170, hurler
  440/160, bellower 420/150, champion 700/260.
- Hide CLUSTERS roll for `ogre` + `ogre_hurler` only (rank-and-file law):
  tallow `#b3985e` / dun `#8f6f4e` / ash `#7e7f74` / sallow `#9aa060` —
  four WIDE values. Bellower and champion are DESIGNS (bellower: ash hide,
  ochre war-paint ring on the gut-drum; champion: liver-dark hide, bone
  pauldron-strap, double trophy belt).

## 5. The kits (through the one door, premium-priced)

New AbilityDefs (all `cooldownTicks: 0`, pacing on the def):

| ability | shape | who | the read |
|---|---|---|---|
| `skull_toll` | ground_aoe r1.7, fuse 16 | ogre, champion | the overhead greatclub drop — dmg 17 ≤ 7×2.5, windup 16 (warning 32) |
| `ogre_tantrum` | flurry ×3 | ogre, champion | hpBelow 0.35 — the D&D rage, per-hit = basic (no premium owed), windup 12 of fist-shaking |
| `millstone_toss` | projectile, splash 1.4, element 'stone' | hurler | dmg 14 ≤ 6×2.5, windup 24; the wheel keeps rolling (signature) |
| `gravel_rake` | projectile_fan 3 | hurler | dmg 6 = basic, windup 12, the scatter that punishes the strafe |
| `hill_bellow` | nova r3.2, knockback 2 | bellower, champion | dmg 12 ≤ 5×2.5, windup 28 — the shout that lays the grass down |
| `shaken_stones` | ground_aoe r2.2, fuse 18, aim 'lead' | bellower | dmg 10, windup 8 (warning 26) — stones shaken loose land where you are GOING |
| `haunch_gnaw` | self healFrac 0.30 | bellower, champion | hpBelow 0.5, windup 22 — it stops to EAT; the interrupt window is the lesson |

Every winding art ships its BREATH_DIALECTS charge voice, FX_STYLES face,
spell plate, and a fxSigsOgres signature (contract tests enforce all four).
Champion kit: skull_toll + ogre_tantrum + hill_bellow(rally) + haunch_gnaw.

## 6. Loot and the sack

The D&D ogre carries a SACK of dented junk treasure — the loot story:
- `ogre` table: coin-forward + `ogre_tooth` (trophy, .12) + heirlooms.
- `ogre_hurler`: + sling stones story (stone/flint mats).
- `ogre_bellower`: + `haunch_bone` cookery mat tie-in (.2).
- `ogre_champion`: rarityBonus 3, `bonegrinder_girdle` (.9 named trophy) +
  a named-set trickle; joins loot.test.ts NAMED at :304.
No bones-pool leakage into golem tables; signature-loot map rows added.

## 7. Where they stand (the ten doors)

1. npcs.ts defs (above) · 2. npcLanes GIANT row · 3. prefabs.ts
`ogreMarks` + `ogreCamp` + `ogreFeastRing` footprints · 4.
`pois/defs/ogre_camp.json` — family 'ogre', tiers [4,6], garrison ogre ×
[1,2] + hurler sentry, boldness stages ending in a champion stage, cues
(crushed cart, bone midden, drag-furrows) · 5. defs.ts SOURCES · 6.
influence.ts litter row `/^poi_(ogre)/` · 7. wilds.ts: solitary/pair day
entries tier [4,5] hills+grass, night knot tier [5,6] behind a champion
lead, family 'ogre' (legal once the POI declares it) · 8. dungeon
garrison.ts: cavern packs `{npc:'ogre', w:1, minPower:35}` + cavern elite
seat for `ogre_champion` · 9. strongholds: DEFERRED by design (the ogre
warhold is its own epic, as golem territory was) · 10. editor worldView
tint + dot.

Crowned boss: DEFERRED — the Dread Crown just shipped five crowns; the
ogre's named king earns his own session. `ogre_champion` carries the flag
until then.

## 8. Render build (new-file-first)

`render/ogre.ts`: OgreLook / OGRE_LOOKS / ogreLook(defId, seed) + cache ·
OGRE_CLUSTERS · OgreBodyFrame + paintOgreBody (the projected carriage +
GutSim hook + trophy pendant) · paintOgreHead (KoboldHeadFrame; gape=roar;
authored true profile) · drawOgreArm (unequal bones, ham hands) ·
paintOgreFoot (bare flat giant foot, four toes) · GutSim + TrophySim
(cape-contract verlets, THE ONE REST, restless flag, snap-to-rest).

rig.ts (~14 surgical hunks): RigPose.ogre · alias · tw/ww (gut wider than
shoulders lives in paintOgreBody; tw ≈ 1.34 for the arm ring) · leg
color/width/knee/foot ladder rows · drawArm ogr param + early branch + two
call sites · lean +0.22 (the stoop) · headR ×0.98 / headY −0.22 ·
hair-guard · torso branch → paintOgreBody · head branch → paintOgreHead.

renderer.ts: OGRE_SIZE + OGRE_EQUIP (greatclub item on `ogre`/champion) ·
npcItem gate `startsWith('ogre')` + look + size chain + passthrough ·
AnimState.ogreGut/ogreTrophy slots + eviction + fullDyn restless folds ·
olSig ogre discriminator + seed byte · **fix: item.body rect folds
max(1, e.size)** (players unchanged; the giant stops clipping the scratch)
· **fix: alertIconItem call site feeds OGRE_SIZE ?? GOLEM_SIZE** · corpse
gate + ogreLook + size chain · footfall dust voice on plant events (the
ground answers the weight).

ragdoll.ts: HumanoidCorpseLook.ogr + drawOgreRagdoll (a felled hill: face
down, gut settles LAST via one damped beat, club beside the open hand).

cms/gameRender.ts MOB_SIZE/MOB_SKIN/isHumanoidMob + riglab BODIES rows
(kind 'ogre', CH raised for the 2.5 body) + ruler cells.

## 9. Proof

riglab = THE OGRE SHEET: 4 bodies × 8 bands × idle/walk/strike/cast +
hurt row + cluster-spread row + ruler cells (player at the ogre's hip —
the 2-3× claim proven on screen) + gut-sim live (walk rows breathe and
bounce). ogre.test.ts law pins (underbite fills, slope silhouette, gut
wider than shoulders at rest chain, cluster spread, ONE REST equivalence,
premium math). Screenshot audit at world zoom + close-up, quarter bands
first, hurt-flash silhouette, multiple passes. Standalone-tree tsc + suites
before every push; temp-index commits (live neighbor session in rig.ts /
renderer.ts / npcs.ts confirmed).

Commit order (the golem precedent): ① content (defs/abilities/loot/spawns/
tests) · ② render/ogre.ts + wiring · ③ sheet + polish rounds · ④
fxSigsOgres + breath dialects + plates.

## As built (2026-08-14, three commits)

**① 1f303f6 THE HILL COMES DOWN (content)** — 20 files, 1089 lines.
Four defs at the npcs.ts tail (ogre L22 170hp/460xp, hurler L24
standoff 6, bellower L26 standoff 5.5, Bonegrinder L28 260hp/700xp —
all ratios 2.6–2.8); GIANT lane `{resist:['onehand'], weak:['archery']}`;
seven arts (all premium-verified: toll 32t warning, millstone 24t,
bellow 28t, stones 26t; tantrum flurry per-hit = basic; gnaw
healFrac .3 windup 22 = the interrupt lesson); ogre/tooth/girdle items
+ four sack tables + NAMED seat + girdle leak-guard; wilds day pairs
[4,5] + night forage [5,6] behind the champion; ogre_camp POI
(fire-ring / bone-midden / crushed steading prefabs, tiers [4,6],
boldness 3 stages, Bonegrinder name pool); cavern garrison minPower 35;
influence litter row (Bonfire fire); editor tint/dot; FX faces +
plates + breath dialects for all seven (OLD HIDE AND HILL-EARTH:
rock debris everywhere, echo/rain/quake motifs, the one blood-stained
meal).

**② b7e4030 THE GIANT DIALECT (render)** — 12 files, 2241 lines.
`render/ogre.ts` NEW-FILE-FIRST: THE CARRIAGE IS A PROJECTION
(P(fwd,lat,z) through YK 0.6 — hump/hair/chest/gut/wrap/trophy are
depth-sorted stations; the first walking torso on the projection law);
GutSim (anchor-local tile-space spring, 0.085 cap = THE STRENGTH LAW
adipose, one-bounce damping, wall-clock dt, snap-to-rest, restless);
PendantSim (2-seg verlet thong, ±1.15 rad never-climbs cap, ONE REST
twin pendantRest); paintOgreHead (SLOPE skull polygon, brow-ledge
−24, pig eyes, UNDERBITE jaw at shade +6 with root-seamed teeth, roar
= gape drops jaw + knits brow + tips skull 0.28hh; AUTHORED TRUE
PROFILE past 0.9 — jut to 1.34hw past the nose plumb, ONE tall tusk);
drawOgreArm (solveLimb2Into UNEQUAL BONES 0.88/1.26 — the ape crook;
inverted taper, ham fists at −6 so the far fist reads past the gut);
paintOgreFoot slabs. rig.ts 20 hunks (alias→arm→legs→lean→head→torso
branches; sims ticked at the rig's true torso anchor per the ear
law). renderer.ts 21 hunks (OGRE_SIZE 2.1–2.5 breaks the stature
ceiling, OGRE_EQUIP greatclub, anim slots + fullDyn restless folds +
olSig `O<design><seed>`, **the body-rect e.size fold** (the scratch
never knew rig size — players pay nothing), **alert glyph OGRE_SIZE**,
corpse chain, THE GROUND ADMITS THE WEIGHT walk dust). THE TORN LIMB:
weapons.ts maul build 'club' (knotted taper, snapped fork, studs) +
`ogre_greatclub` def dropping from wearer tables (loot-story law) +
census pins 249→250. drawOgreRagdoll = THE FELLED HILL. CMS poster +
riglab = THE OGRE SHEET (live Gut/Pendant sims, roar rows, cluster
row, the stature-ladder rulers). ogre.test.ts 9 law pins.

**③ fxSigsOgres.ts** — seven signatures, grammar = WEIGHT ARRIVING:
the bell under the hill / the ground loses the argument / the wheel
comes to rest (it lands edge-on, ROLLS, falls flat, and stays) / the
road thrown back / the grass lies down (the combed lawn) / the
hillside lets go (true-altitude drops racing their shadows) / the
bone hits the ground.

**Audit rounds:** sheet pass 1 caught the empty face, the crown-lid
band, the floating knuckle ticks (the far fist merging into the gut),
the white-bar arm ring, the drifting pauldron, and det-frame roar
phase (detn=126 pins gape≈1). THE FACE ROUND fixed all six; pass 2
close-ups verified the profile jut, the roar, the hurt silhouette
(one clean white mass), and the ruler cells (player at the brute's
hip). **The commit-② standalone check caught two foreign features
(THE SEATED PLANT, THE FIST IS ONE FLESH) and one (THE FAIR HOUSE
ELF palette) swept into my blobs by live neighbor edits between
census and tree-build — hunk-filtered out; the census must be
re-run at tree-build time, not before.**

**④ THE GIANT RIG (user-directed refinement round, same day)** —
the borrowed human rig's seams at 2.15–2.5×, fixed at the rig level
for every future giant, never per-band:
- **THE GIANT GAIT**: `LegSolver(stature)` — the size-1 solver
  planted a man-width track (±0.1 tiles) and man-length strides
  under a giant body, and the side-on stance narrowing walked the far
  foot across the centerline (the crossed-feet read). The statured
  solver runs WORLD-TRUE giant legs (track/stride/reach/lift ×
  stature, `swingMax` 0.35+0.16·(st−1) — the human swing ceiling
  forced mincing double-time steps) and reports RIG-UNIT dynamics
  (rise/bob/lift ÷ stature — painters multiply by `s` which already
  carries size; world-true twice is a double-lift). Stature 1 is the
  exact legacy solver; renderer keys the anim slot `humanoid@st`.
  legs.ts grew `swingMax` in LegRigConfig.
- **THE GIANT REACH**: the unequal bones out-reached the human rest
  targets by a forearm; the surplus bend threw elbows rearward. The
  giant rest spends it honestly — knuckles +0.12s lower (the ape
  hang) and +0.06s forward under the stooped shoulders, both fists.
- **THE LOG CARRY**: the woodcutter's flat shoulder carry threw the
  tree-length club far behind the stoop and across the face at four
  idle bands. The giant uprights the mass against the shoulder
  (angle blended 0.5 toward −π/2+0.38·side), butt-fist dropped to
  the gut line — one motion from the toll, head clear at all eight.
- **THE BELLOWS DRAW** (the giant cast, whole — the human cast was a
  one-hand jab that read as nothing on a body whose art is a voice):
  one analytic curve, two movements — THE FILL (0..0.55: both fists
  wide-high-back, elbows past the silhouette, synchronized with the
  chest flare and the roar already riding this beat) then THE THROW
  (0.55..1: a double-handed drive down the PROJECTED aim, fists
  split on the aim's screen perpendicular AND staggered along it so
  the push reads as two hands at the camera lines). Self-aimed arts
  (haunch_gnaw) throw to the JAW — the meal, drawn honestly. A
  club-armed caster sweeps the haft back through the fill and levels
  it on the throw. armAssembly writer census: +2 heldAngle, +1
  mainX/mainY/offX/offY/mainFore — a decision, pinned.

**Deferred by design:** the ogre crown (the cavern boss seat "The
Broodmother" is a renamed spider — an honest ogre crown could claim
it, per the Dread Crown session); the war-drum idle bark; live-lane
dilate audit (pendant/club verified connected by geometry — riglab
never runs the dilate); ogre stronghold family.

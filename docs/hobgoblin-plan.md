# THE LEGION — the hobgoblins (as built)

The goblins' master race, sharing not one line of paint with them:
conquerors nurtured in iron and flame, drilled where the greenskin
sprawls, issued where it scavenges, and unbreaking where it bolts.
The EIGHTH head-swap dialect (bone, scale, fur, greenskin, construct,
giant-kin, brine, LEGION) — `render/hobgoblin.ts`, called from the
rig's dialect seams; the rig, carriage, facing bands, and IK all keep
working untouched.

## The four reads (owned by no other body)

- **THE WAR MASK** — a broad flat simian face under ONE heavy brow
  ledge (a goblin's brows are two; a hobgoblin's is one bar of
  disapproval): socket trench, ember eyes, the WIDE FLAT NOSE (the
  anti-hook: lit bridge plane, flared wings, squared underside — at
  profile a blunt step, nothing curls), a stern down-bowed mouth seam
  with the underbite's corner fangs, and the painted OPEN WAR-HELM —
  head furniture, never an equipment item (THE FORGE LAW would seal
  the face): line skullcap with cheek guards and nape guard, the
  officer's crested galea, the juggernaut's horned crown. The head is
  a PROJECTED HULL (the skral law): every feature a station through
  the fixed camera, occiput axis aB > aF, fixtures at unit length
  with protrusions along projected surface normals. The idle face
  holds dead STILL — against the goblin's constant jeer, the
  stillness is the discipline.
- **THE SWEPT BLADES** — lance-point ears raked back-and-OUT at
  temple height on the EarSim contract (fourth species). Angular
  planes, deep inner scoop (a flat blade is a horn — the pass-two
  verdict), officer's trim ring, scar notch. The snarl PINS them
  flat along the skull through the sim (spread and rise both drop
  with pin) — fair warning, by drill.
- **THE RANKED CROWN** — hair is a uniform matter and every rank
  wears its own: soldier's crop under cap or bare crown, the
  warcaster's bound top-knot (a painted STATION on the rear crown —
  it walks the turn like any fixture), the officers' helms as their
  crowns. (Round two: the first build hung one simulated braid on
  every rank — REMOVED WHOLE on the user's verdict: a shared
  appendage homogenizes exactly where variants must argue.)
- **THE IRON HABIT** — the legion wears its wars: banded lapped
  cuirass (alternating values or it slabs), gorget, shoulder caps,
  riveted girdle, studded pteruges skirt (ALWAYS painted — the
  harness law; this body is issued, never bare), wool breeches, and
  THE MARCHING BOOT (iron toe, greave cuff, hobnails — the first
  dialect foot that is FOOTWEAR). **THE BANNER IS ONE**: the crimson
  sash/pennant/crest never varies while the skin clusters roll — the
  deliberate inversion of the skral family banners; a legion sorts by
  RANK. The warlord's back-slung STANDARD rides body-frame stations
  (screen side from L·px, never `lead`), shaft in the behind pass.

## The bodies (L16–24, danger tier 3 — the expedition line)

| id | name | level | notes |
|---|---|---|---|
| hobgoblin | Hobgoblin legionary | 16 | sword+kiteshield, skullcap |
| hobgoblin_archer | Hobgoblin longbowman | 17 | shortbow+quiver, bare crown |
| hobgoblin_warcaster | Hobgoblin warcaster | 19 | mantle+gorget, iron_brand / forge_ring (lead) |
| hobgoblin_champion | Hobgoblin warlord | 22 | NAMED; crest, standard, scar, beard; warlord_horn rally |
| hobgoblin_juggernaut | Hobgoblin juggernaut | 24 | size 1.62 on the GIANT GAIT (LegSolver stature ≥1.5); horns, greatblade, ground_slam |

**THE DISCIPLINE INVERSION** (test-pinned): all five `pack:
'hobgoblin'`, NONE craven — a goblin bolts for help, a legionary
stands where it was posted. **THE PHALANX LANE** rides the
shield-bearers only (resist archery / weak twohand — the bones' pair,
earned by the drilled kiteshield; the bow and staff ranks fight
fair). Warcaster resist burn / weak chill (forge-raised).

## Arts (full contract: def + EMBER/GOLD face + plate + charge voice)

- `iron_brand` — the hurled white-hot bar (die 4 at 12t wind — the
  telegraph premium's 1.5× lane over basic 3), burn 1/40.
- `forge_ring` — the staked smith's circle (fuse 22), burn 1/50.
- `warlord_horn` — the order, not a spell: rally ground_aoe with a
  bespoke FOES signature that INVERTS shoal_call — ONE even note
  (compass-true rings, no wobble), THE RIM ANSWERS ON THE COUNT
  (twelve spear-tips rise together, ground in unison), and the STAMP.

## Placement

- Wilds tiers [3,5]/[4,6] grass+forest: day patrol pairs + covering
  longbowman (tight spread — a legion never straggles), night
  warcaster watch, THE NIGHT MARCH [2,4] behind the warlord.
- `hobgoblin_warcamp` POI (tiers [3,6], family 'hobgoblin' — NOTE:
  a new family reshuffles the territory lattice by construction,
  `hash % families.length`; the strongholds epoch test's horizon
  widened 6→12 for the surviving window seat): three SQUARE prefabs
  (muster-yard, watch-post, forge-camp — true corners, gate to the
  road, tents in file: order at world zoom IS the species read),
  named warlords (Vazruk Ironmarch, Skarn Redbanner, Karguk the
  Drill, Old Hundredscars), juggernaut at minTier 6, patrol sentries,
  three boldness stages, satellites.
- Loot: `legion_ring` + `warlord_crest` trophies, `hobgoblin_arms`
  rack (loot-story law: iron_sword, oak_kiteshield, shortbow,
  steel_sword — now drop-flagged — iron_greatblade, ember_staff);
  champion in the NAMED flood tier.

## Renderer wiring

HOB_SIZE {1.02/1.0/1.04/1.28/1.62} (+ gameRender MOB_SIZE sync),
HOBGOBLIN_EQUIP (weapons/offhands only — NO head slot ever),
startsWith('hobgoblin') gates (npcItem + corpse + gameRender; safe —
nothing matches 'goblin' prefixes), olSig `H<seed&0xff>`, the ears
anim slot with restless→fullDyn, corpse-coat law + iron-torso corpse
+ bespoke profile corpse head (helm stayed on, fang proud).

## The diagonal round (round two, user screenshot)

Three foundational fixes, all in the projection itself:
- **THE THREE-QUARTER KEEPS BOTH EYES**: the far ember's cull gate sat
  at dot 0.1 while the diagonal's far-eye dot is ~0.085 — the face
  went one-eyed exactly at SE/SW. Gate 0.02 + a harder foreshorten
  floor: the far eye slivers out honestly instead of popping.
- **THE MOUTH ANCHORS TO ITS OWN CENTER**: a survivor-corner run of
  the mouth arc painted an orphan grin fragment at the cheek edge on
  the REAR diagonals. No mouth paints unless the arc's center holds
  the camera side; the run threshold eases to -0.12 so the FRONT
  diagonals keep a full stern seam instead of a stub. Nose wings gate
  per-side the same way. Test-pinned both directions (rear diagonals
  ink-free; front diagonals ≥ both pupils).
- **THE SHIELD-WALL STANCE**: hob rest fists hang 0.07s outboard
  (the GIANT REACH pattern, legion numbers) — the diagonal stance no
  longer pinches under the broad shoulders.

## The turned-volume round (round three, user-directed root fix)

The features were honest 3D stations from day one — but the
silhouette they lived on was still an axis-aligned billboard slab, so
the face slid across a rectangle that never rotated and the SE/SW
mouth read as hanging off the cheek no matter how the feature gates
were tuned. Root fix, one algebra:

- **THE HEAD IS A TURNED VOLUME** (`hobHeadHull`, exported): a p=6
  superellipsoid (the soldier's block, honestly 3D) with the longer
  rear axis; the painted silhouette is its EXACT projection via
  support-function sampling through the same basis every station
  uses. The outline tips, travels, and swells with the turn by
  construction, and every on-hull feature provably lives inside it.
- **THE STYLE-COMPRESSED PITCH**: the world camera's honest YK 0.6
  looks down on a skull — truly projected, the crown owned the south
  band and the face shrank to a chin strip. The head projects
  through a softer pitch coupling (YKH 0.4, inside the hull so
  painter/probe/tests compress identically) — the SILHOUETTE
  HIERARCHY law: the turn keeps its tilt, the face keeps its read.
- **THE RIM IS A SECTION**: helm brim and hairline are real
  cross-section rings of the hull (6-norm sections), so they tip and
  wrap with the head; the brim's near arc is the crate-lid top-plane
  read on a skull.
- **THE VETTING PROCEDURE** (the standing answer to "stop finding
  the same problem"): `?head=1` = THE TURN STRIP (sixteen headings of
  one bare body — the head must read as one rotating object across
  ALL sixteen, not just behave at the eight bands); `?probe=1` =
  HOB_HEAD_DEBUG (magenta = the painter's true silhouette sampling,
  green/red station dots). Geometry is judged first, art second;
  every future head change reshoots the strip.

## Audit

`hoblab.html` → `src/dev/hoblab.ts` = THE HOBGOBLIN SHEET (skrallab
driver): 5 bodies × 8 bands × idle/walk/strike/hurt + bare rows +
goblin anti-twin row + skin-spread row (banner constancy on screen) +
player/goblin rulers; live LegSolver (statured for the juggernaut) +
a live EarSim per fig; ?s/?rows/?cols/?only/?ol/?det. Three audit
passes shipped it (pass-two verdicts recorded in module comments)
plus the diagonal round. `hobgoblin.test.ts` = 15 law pins.

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
- **THE WAR QUEUE** — the braid through iron rings off the occiput:
  a SECOND EarSim on its own renderer slot (`hobQueue`; a legion body
  runs ears and queue at once and no lane evicts another's
  appendage). Both chains root near-superposed (azimuth 3.02) = one
  rope at every band by projection; rest direction back-and-DOWN
  (hair hangs); the strike beat kicks reach and rise (the snap); rank
  grows it (warlord 1.3, juggernaut cropped 0.8 — a full braid slabs
  on the heaviest frame). Plait chevrons + rings + loose tuft.
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
nothing matches 'goblin' prefixes), olSig `H<seed&0xff>`, anim slots
ears + hobQueue with restless→fullDyn, corpse-coat law + iron-torso
corpse + bespoke profile corpse head (spilled queue with its rings,
helm stayed on, fang proud).

## Audit

`hoblab.html` → `src/dev/hoblab.ts` = THE HOBGOBLIN SHEET (skrallab
driver): 5 bodies × 8 bands × idle/walk/strike/hurt + bare rows +
goblin anti-twin row + skin-spread row (banner constancy on screen) +
player/goblin rulers; live LegSolver (statured for the juggernaut) +
live EarSim ×2 per fig; ?s/?rows/?cols/?only/?ol/?det. Three audit
passes shipped it (pass-two verdicts recorded in module comments).
`hobgoblin.test.ts` = 14 law pins.

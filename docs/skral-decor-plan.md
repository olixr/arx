# THE BANKS GET THEIR GOODS — the skral shore-camp kit

Twelve pieces of waterside dressing, tile ids 369-380, for the camps
of the brine-folk (docs/skral-plan.md, THE BANKS GET THEIR PEOPLE).
The skral epic gave the banks a people and three camps that dress in
borrowed war-camp litter — meat racks, skull totems, hide tents. This
kit gives the shoals their own goods, and the camps hand the goblin
gear back.

## The kit's voice — FOUND, NEVER FELLED

The war camp's voice is hewn timber and rope: an axe was here. The
skral voice is the opposite law: **everything the skral own came off
the bank or out of the water.** Driftwood silvered by salt — never a
saw-cut end, always a water-worn knob or a snapped point. Lashings are
kelp-cord and gut, green-dark and glistening, never the camp's brown
rope. Bone, shell, woven withy, netting. Iron never (the SLICK lane's
people never learned the forge). And every piece is WET where it meets
the ground: a dark waterline, a puddle glint, a ring of damp sand —
the tide is always just behind them.

Accent palette rides the race's own water clusters (skral.ts): the
tide-green/brine-blue banners fly again on the totem and the racks —
a camp sorts by banner the way a shoal does.

### Materials (SKR_* in renderer.ts)

- Driftwood: `#8d8672` body / `#b5ad94` sun-bleached lit / `#5e5949`
  waterline dark — a full value family off both the camp's brown and
  the elven silverbark warm.
- Kelp-cord: `#3f5c48` / lit `#5a7a5c` — the lashing color IS the
  joinery story.
- Wet fish silver: `#b8c4c6` back `#4a5a5e` / belly `#dde6e2`.
- Withy wicker: `#a08b58` / `#c2ab6e` (drier than driftwood — woven
  goods came from the reed bank, not the surf).
- Old bone: reuse DGN_BONE `#cfc7ae` / dim `#b5ac91` (one bone truth
  game-wide).
- Brine glow: `#7fd8c8` (the glowshroom's teal family, shifted a step
  green — bioluminescence, never flame).
- Coral: `#c98a74` / lit `#e8ab8a` — the altar's one warm note.

## The twelve

| id | Tile | read | hits |
|----|------|------|------|
| 369 | FishRack | the catch drying head-down on lashed rails | 1 |
| 370 | TideTotem | fish-skull idol flying a fin banner | 3 |
| 371 | NetFrame | hung net, floats, one mended tear | 1 |
| 372 | Dugout | beached canoe, lies E-W, hash deals upturned | 3 |
| 373 | HarpoonRack | bone-tipped harpoons on a jaw-bone stand | 2 |
| 374 | ShellMidden | the refuse mound that names the camp | 1 |
| 375 | FishTrap | woven funnel creel showing its dark mouth | 1 |
| 376 | RoeNest | glistening clutch in a kelp ring | 1 |
| 377 | LurePole | caged deep-jelly on a bowed pole — the night light | 2 |
| 378 | TideAltar | wave-worn slab the coral is taking back | NEVER |
| 379 | CatchBasket | creels brimming silver, one spilling | 1 |
| 380 | WhaleRibs | a sea-beast's ribcage the camp moved in under | 4 |

Per-piece design law:

- **FishRack (369)** — two X-lashed driftwood shear-legs, two rails,
  five split fish hung head-down: pale bellies out, dark back stripe,
  forked tails; the hash deals one fish gull-picked to a rib comb.
  The prop that says LARDER at map scale. Static.
- **TideTotem (370)** — a driven driftwood post with a barnacle
  collar at its old waterline, crowned by a great fish skull whose
  eye sockets hold pale shell inlays (the lantern-eye read, in prop
  form), strung with shell strings; a fin-membrane banner in the
  water-cluster accent flies from a cross-spar and SWAYS (<4Hz).
  The camp's `?` skull totem, answered in brine.
- **NetFrame (371)** — a knotted diamond mesh hung between two lashed
  posts, cork floats riding the head-rope, the hem dragging sand; one
  torn hole MENDED in a paler cord (nets are wealth — somebody sat
  and fixed it), one dried starfish caught forever. Static.
- **Dugout (372)** — the hull LIES long-axis E-W (a canoe lies like a
  coffin lies); open hulls show the hollow's dark inner wall, a
  bench-thwart, a leaning paddle, and a foreshortened gunwale top
  plane; the hash turns some turtle — keel up, showing a lashed hide
  patch. Wet drag-furrow and bow puddle tie it to the bank. Static.
- **HarpoonRack (373)** — an A-frame of two rib-bones lashed at the
  crown, three harpoons leaning points-up: dark seat shadow behind,
  one lit facet per bone point (THE DISPLAY MUST READ), one shaft
  fallen at the feet. Static.
- **ShellMidden (374)** — a low mound of cracked fans, spirals, and
  mussel-dark chips over a fishbone comb or two; hash deals three
  sizes (the BonePile law); the crown keeps a wet sheen. Static.
- **FishTrap (375)** — a funnel creel of hooped withies lying on its
  side, mouth toward the camera: the dark round MOUTH is the 3D
  argument (nothing painted flat has an end); a stray silver tail
  pokes out; a second small trap leans on the first. Static.
- **RoeNest (376)** — a scraped hollow ringed in kelp holding a
  clutch of glistening roe-domes, teal-pale with one specular tick
  each; the biggest few carry a dark eye-dot; one hatched husk sits
  empty. Painted wet gleam only — NO light entry (the night
  hierarchy stays: one street light, one shrine). Static.
- **LurePole (377)** — the camp's night anchor: a bowed driftwood
  pole leaning over the path, a woven bone-withe cage swinging on a
  gut line, and inside it a captured deep-jelly — soft teal dome,
  trailing tendrils below the cage floor, drifting slow. Light:
  brine-teal, glowshroom law (slow swell, never flicker, no flame
  gate), street-light reach r3.6. <4Hz clocked.
- **TideAltar (378)** — a wave-worn slab on stacked stones; coral
  fingers have grown OVER one end (the sea is taking it back); the
  top plane carries the offerings — pearls, a laid-out fish, shell
  ring; wet dark ring at the feet. Faint cool shimmer light r2.2.
  **NEVER destructible — the tide keeps its own** (the bonfire law
  reaching the water). <4Hz glint cycle.
- **CatchBasket (379)** — two upright creels brimming, tails over the
  rims; a third tipped, its run of silver spilling toward the viewer
  on a wet trickle. The camp's plunder-sacks, answered. Static.
- **WhaleRibs (380)** — the landmark: five ribs of some ancestor of
  the deepking's hunts arching from the ground in two depth ranks
  (far rank thinner and dimmer), bleached crowns, barnacled roots,
  one rib snapped showing pale end-grain; the skral strung shells
  between two ribs — the camp moved in UNDER it. Tall as the grand
  pillar's class. 4 hits — old bone holds.

## Wiring (the dungeon-kit rails, verbatim)

- shared tiles.ts: enum 369-380, TILE_DEFS minimap voice (every piece
  a full value step off sand, trampled dirt, AND meadow grass — the
  three grounds a shore camp stands on), TILE_COLLIDER_RADIUS
  brush-past radii, 11 DESTRUCTIBLE_INFO rows + TideAltar pinned
  never-smashable in tiles.test.ts.
- renderer.ts: SKR_* palette block; 12 painters before `case
  Tile.Table`; all 12 CACHED_RING_TILES, the 9 clock-free ones
  STATIC_RING_TILES; LurePole + TideAltar in collectStaticLights
  (both breathing teal/cool, ungated by flame — bioluminescence law);
  SMASH_TONES material groups.
- debris.ts: 11 SmashKinds + bespoke kits (the jelly slumps dead and
  dim; the catch ESCAPES as a spray of silver; shells scatter light
  and near; ribs fall torso-weight; the paddle leaves last).
- main.ts: dugout booms (a hull is a drum); greatribs shake heavy.
- terrain.ts: underlay range FishRack..WhaleRibs → nearestFloor.
- palette.ts: Studio shelf 'skral' / "Shore camp".
- influence.ts: the skral litter row hands back the goblin gear —
  litter [ShellMidden, FishRack, FishTrap], pocket [NetFrame,
  FishRack, ShellMidden].
- prefabs.ts: sketch() grows an optional per-sketch legend extension
  (global ASCII is exhausted since Kingsdelf); the three skral camps
  re-voice their OWN existing marks locally — ')' rack, '?' totem,
  '`' net, '^' dugout, '{' trap, 'o' midden, '-' catch, '0' roe,
  '!' lure, '&' altar, '>' harpoons, '"' ribs — and the seeded
  poi_skral_*.json regenerate.

## As-built ledger

**SHIPPED 2026-08-15, 46d42efc, one session, two audit passes on rig
lane 10** (vite.config.rig10.ts, client :5188 → server :8806).
Standalone tree proved whole: 217 shared / 506 content / 579 client /
490 server + clean client tsc, gated on a HEAD+mine twin while two
peer changesets (THE LONG DARK PEOPLED, Amberford) flew beside it.

Audit verdicts that reshaped the kit (pass 1 → pass 2):
- **THE RIBS ARE CRESCENTS, NEVER A TEEPEE**: pass-one ribs were
  straight tapers converging at one apex — the monument read as a
  spike-tent at every zoom. The rebuild: root stands near-vertical,
  belly bows OUTWARD, worn tip hooks back over the hollow, tips never
  meet; two ranks with the far three dimmer AND rooted a half-step
  north; the shell string strung AFTER the near ribs so the camp's
  claim reads in front of the ancestor.
- **FISH READ AS FISH**: five narrow tubes read as hanging gourds —
  now four bigger leaf bodies, real forked tails, hard belly/back
  two-tone split.
- **A PALE BANNER ON A BONE SKULL VANISHES**: the fourth water-accent
  swapped bone-pale → the deepking's crimson; the membrane grew, took
  ink, and kept its rays.
- **SHELL STRINGS HANG, NEVER SPLAY**: pass-one catenaries falling
  wide off the totem spar read as skeleton arms.
- **A MIDDEN IS A MOUND, NOT A PEBBLE**: mass up, satellite spill
  added, shells scaled to read.
- **A DARK PIT IS A HOLE IN THE BANK**: the roe hollow lifted to
  mid-tone; the floating-shade lesson arriving by water.
- Proven live: night pools (lure r3.6 teal occluding + altar r2.2
  cool), smash-to-debris-to-patch with sword in hand (the catch flew
  silver, the staves fell gray — never camp brown).

Placement notes: the world regen between passes wiped /settile stamps
(the chunk-flush law) — pass 2 re-verified and re-stamped before
shooting. Equip lever for smash proofs: `__arx.game.useSlot(slot)`
after `/give` (inventory slots carry `item`, not `id`).

Deliberate debts: no wilds "find" entries (camps + Studio only); no
dress.ts lane (shore camps are prefab-dressed, not procedurally
dressed); shore POI count unchanged (the three prefabs re-voiced in
place); midden reads quiet at far map scale beside the monuments —
acceptable, revisit only if flagged.

# THE BANKS BECOME A COUNTRY — the skral procedural ladder

**SHIPPED 2026-08-15, one session, four audit passes on lane 10
(arx_skralland).** The kit's debts paid and the race seated in every
placement layer the other families own: finds, camps, war-ground,
capital.

## The four rungs

- **THE SHORE FIND** (`MinorDef.shore` + finds.ts): a shore-flagged
  find enters a slot's pool only when the slot brushes water
  (SHORE_SLOT_REACH 16 = find reach 6 + anchor jitter 10) and every
  anchor try passes shoreProbeAt — the PoiDef.shore law at find
  scale, no burnt rolls by construction. Four skral finds:
  `find_beached_wreck` (cache 0.25), `find_old_ribs` (pathless
  landmark; **clearing 2 — pass-three verdict: an unclipped bank
  forest SWALLOWS a monument**), `find_tide_shrine` (keeper garrison,
  tidecaller by night), `find_roe_ground` (habitat 'roe' — THE DEN IS
  THE SOURCE by water: the day shoal musters at the spawning bank;
  reciprocity test-pinned).
- **THE WIDER SHOAL**: two new camp prefabs (`poi_skral_wreck`,
  `poi_skral_drying`) widen skral_shoal's pool to five.
- **THE TIDEHOLD** (`skral_tidehold`): the skral compound war-ground —
  court `poi_skral_court` (the deepking's dug pool ringed in ancestor
  ribs and totems, altar + warded boss cache at the east head, NO
  palisade: the skral fell nothing), wings from the camp pool, named
  crowned deepkings, satellites deal skral_shoal. Laws: the holds
  promotion pool gains the cellSeesWater parity gate (a landlocked
  cell never burns its promotion on a hold the land must refuse);
  **a shore COMPOUND is judged from its whole extent** (shoreReach =
  margin − 14 + SHORE_CAMP_REACH — the court carries its own pool
  while the wings work the waterline); wing prefabs joined WING_CAP
  20 and the court joined influence EXEMPT (unfixed, compoundExtent
  overflowed the cell and every deal refused in 1.8ms — span<=0 is
  the first thing to check when a compound never lands).
- **THE DROWNED CHARTER** (`StrongholdDef.shore` + seat law): the
  skral stronghold shelf — `stronghold_skral_greatweir` "The Great
  Weir" (citadel, seed 2, 163×159, 12 wards) and
  `stronghold_skral_tidefast` (hold, seed 4, 124×117). FamilyStyle
  'skral': CAIRN walls (the swallowed kingdom's wave-worn stone —
  the skral moved in), TideAltar hearth, eight ward_sk_* pieces
  (spawning pools / drying yard / middens / net lines / beached
  hulls / totem way / harpoon watch / the deepking's kingspool),
  skral POST_SIGNS rows (harpoon racks drill by day, totem + lure
  vigils go nocturnal on the cairn clock, roe and hulls are KEPT),
  `FamilyStyle.roadMarker` = LurePole (**pass-four verdict: a skral
  processional lit by the dead's braziers is the wrong voice — the
  shoal lights its roads with its own street light**). Seat law: a
  shore layout requires shoreProbeAt within its own half-span;
  water/sand count as BUILDABLE in the rough scan (the weir-folk
  build into the shallows; the zone stands over them) capped at 35%;
  the FOUND DOOR relaxes to ≥2 dry gates so a water gate is legal.
  Survey: 39 Great Weirs crown the coasts (102 seats total) — pure
  addition; no dry family lost a seat; a dry-hearted skral country
  lawfully keeps none (the kobold precedent, by water).

## Proving (lane 10, arx_skralland, four passes)

- Density survey via /dev/pois/simulate: shoal camps + tidehold
  promotion (1/13 holds) + shore finds all deal; capitals 102 seats.
- Live: the organic tidehold at 1095,-454 — King Gullet (34) crowned
  at his rib-ringed pool, wing camp working beside it. The Great Weir
  at 688,-2197 (lattice 1,-6) — **"Discovered: The Long Pools"** (the
  Place Herald pulls from titles), stepped summit holding the
  kingspool, chord-wall districts, lure-lit lanes at night, Skral
  (93) wading the four-pool spawning ward at THE WORLD'S RIM, the
  garrison killing the naked scout on schedule.
- **THE GHOST SEAT LESSON**: the first weir hunt flew to 903,-891 —
  a seat computed BEFORE the layout seeds were pinned; re-rolling a
  layout's pinned seed MOVES every seat that family holds. Recompute
  targets after any roster edit; `/stronghold` at the site is the
  ground truth.
- Prover craft: fresh-DB login needs the #login-toggle create flow;
  chunk streaming follows the BODY (~50 tiles), not the lens — park
  the scout inside the zone and accept the death; capitals
  materialize on approach (CAPITAL_PAD_TILES of the seat rect), and
  the capitalCache means a server restart recomputes seats against
  CURRENT zones — a capital that never stood can be crowded out by
  its own neighborhood (pre-existing, all families; the ledger
  protects any capital that stood once).

Debts (deliberate): tidefast unproven live (validated + composed in
tests; it shares every law with the weir); no skral dungeon garrison
packs (a drowned delve is still an open invitation); wild shoal knot
walk not re-shot this session (shipped in the skral epic; the roe
habitat pull is content-tested); the weir's yard reads sparse at
0.3 zoom between wards — the breathing law's intent, revisit only if
flagged.

# THE CRAFTSMEN OF THE BANKS — the working shelf (ids 381-390)

**SHIPPED 2026-08-15, one session, three audit passes + one re-shot
on lane 10.** Ten pieces that turn a camp into a VILLAGE — the
dwelling, the works, the stores, and the small culture. Same voice,
same laws as 369-380. Next free tile id: **391**.

## The ten

| id | Tile | read | hits |
|----|------|------|------|
| 381 | ReedShelter | the dwelling: arched reed coat, dark mouth | 3 |
| 382 | SmokeTripod | the smoker: catch curing in a standing haze | 1 |
| 383 | MendingBench | net spread mid-repair, bone needle parked | 2 |
| 384 | WeirPanels | woven hurdles at a funnel gap — the namesake | 2 |
| 385 | KelpLine | the winter larder drying on a sagging cord | 1 |
| 386 | SaltPan | brine to crust — the bank's money | 1 |
| 387 | ShellBench | drilled fans, a string half-strung | 2 |
| 388 | WithyStore | fat BOUND sheaves — every creel starts here | 1 |
| 389 | KeepPool | the live larder: dark water, circling backs | 1 |
| 390 | TideChimes | shell strings under a driftwood arch | 1 |

Clocked <4Hz: smoker (wisps + standing haze + ember breathe), kelp
line (frond sway), keep-pool (orbiting glints + one ripple), chimes
(pendulum sway). The other six are STATIC_RING. **No light entries —
the night hierarchy holds (one street light, one shrine).** The
smoker's ember glow and the sea-glass drop are PAINTED lumen only.

## Audit verdicts (pass 1 → 3, the laws they minted)

- **A HOUSE MUST HOLD ITS TENANT**: the pass-one shelter stood
  waist-high to the ruler — a dwelling must read enterable by the
  body that owns it (grown ~35%, door to 0.84 tiles).
- **THE SMOKE IS THE READ**: wisps alone vanish in a still frame — a
  smoker needs a standing haze column the cache can hold.
- **A NET DRAPES, NEVER BRISTLES**: bare mesh strokes over a slab
  read as teeth; the net is a soft CLOTH fill first, mesh clipped
  INSIDE it (the hung-net painter's own law).
- **A HURDLE IS WOVEN, NOT PLANKED**: straight horizontal rows read
  as crate boards; the weave needs vertical ribs threading sagging
  horizontals, and stakes standing proud of the panel.
- **A STORE IS KEPT, NOT DUMPED**: thin leaning sheaves read as a
  collapsed pile; fat waisted bundles with bold cord BANDS read as
  wealth. The binding is the store.
- **THE PAN IS A WORKS, NOT A SAUCER** and **THE CHIMES MUST READ
  PALE** (grown; shells brightened + dark under-edges so they read
  on sky and grass alike); the keep-pool's curb took a dark
  under-lip so the rim holds its water; the kelp line spread its
  crop (bunched fronds read as a cage — a line must read as a line).

## Wiring

All four tiles.ts blocks + tiles.test rows; 10 painters before `case
Tile.Table` (SKR_REED/_LIT/_DARK + SKR_POOL + SKR_SALT +
SKR_SHELL_PEARL joined the palette); ring registries (10 cached, 6
static); 10 debris kits (thatch SIGHS, the ember bed EXHALES with two
dying sparks, brine sheets dark, the keep's tenants ESCAPE, the
sea-glass bead winks out last) — **'chimes' SmashKind was TAKEN (the
elven wind chimes): TideChimes breaks as 'shellchimes'**; SMASH_TONES
material groups; terrain underlay range widened to Tile.TideChimes;
Studio Shore-camp shelf grew to 22. skralLegend grew ten marks (A h b
# k s e w O x — locals shadow globals per sketch); all five camps,
the tidehold court, and five ward_sk_* pieces re-dressed (the wreck
yard's accidental BeastNest ';' became an intentional shelter 'A');
influence pockets now deal NetFrame/KelpLine/WithyStore. POST SIGNS
both tables: ReedShelter = the tent's law in reed (rest 19-7),
SmokeTripod cooks, Mending/Shell benches + KeepPool + SaltPan are
KEPT. Prefabs + both stronghold layouts reseeded.

Proven live (lane 10, arx_skralland): ten stamped field close-ups
day/night across three passes; smash lane sword-in-hand (shelter's
3-hit thatch sigh, keep-pool escape); the re-dressed tidehold walked
day + night — the court shelter beside King Gullet's pool, the camp
fire and the lure's teal both keeping the night. Suites 217/506/579 +
89 world + clean tsc.

Debts (deliberate): kelp line's clean solo portrait still owed (a
berry bush photobombed all three passes; the piece reads honest in
context); no main.ts boom rows (thatch and wicker keep no drum); the
smoker's hanging fish read small past 1.5 zoom — the haze carries the
read, revisit only if flagged.

# THE DROWNED VILLAGES — the curated grounds (landmark lane)

**SHIPPED 2026-08-15, one session, two audit passes on lane 10
(arx_skralland).** The 22-piece shelf earns its PLACES: whole
fish-folk villages at landmark scale, hand-seated at the plan's own
waters, plus enough pool depth below them that no two skral grounds
ever share a read.

## The ladder after this arc

find → camp (POOL OF 8) → tidehold compound (wings from 7) →
**VILLAGE (landmark, organic + 4 curated seats)** → capital (wards
from 10). Every rung deals differently by hash; the village rung is
new.

## The two villages (landmarks.ts, canvas-built, pinned seeds)

- `poi_skral_village_longbanks` "The long banks" (60×46): a dug
  tidal VEIN walking the full width, weir gates at both narrows,
  dwelling bank north (two reed hamlets), the deepking's pool at the
  heart ringed in ancestor bone (ribs pair + altar + the one iron
  cache + lure pair), working bank south (drying → mending → shell →
  salt → kelp, west to east), keep row + roe bank in the quiet east,
  dugouts beached on the hems, harpoon watch at the west mouth,
  lure-lit south approach. TWO walked rounds (the works round sits
  at the fire; the dwelling watch keeps both gates).
- `poi_skral_village_saltgarth` "The salt garth" (54×44): the
  works-village — a three-lobed BAY at the south hem (hurdles and
  traps standing in the shallows, roe nests in the quiet corner),
  the pan yard in two worked ranks at the heart, smoker terrace
  east, kelp garth west, keep row + mending bench on the bay line,
  dwelling knots on the north rise under the rib shrine (cache
  beside it, shell-carver at its flank), totem-marked lure-lit west
  approach. Two rounds (the panmaster sits at the shrine).
- **THE SKRAL MODULE SHELF** (modules.ts): reedHamlet / dryingGround
  / mendingRow / saltGarth / kelpGarth / keepRow / ribShrine /
  lureWay — post-sign furniture first, so every module peoples
  itself. New landmark helpers in landmarks.ts: `wetLine` (water
  walked along a polyline) and `sandHem` (every unpainted cell
  touching water takes the wet sand hem — the ground line the whole
  kit was authored for).
- Audit verdicts: **THE SHRINE HOLDS ITS POOL** (pass-two: the bone
  head's pad must walk down to the water — a grass wedge between
  ribs and pool reads as furniture beside a river, not a pool ringed
  in bone; pool fattened r5→r6, south totems to the new lip, dugout
  re-beached); route legs must CLOSE within 12 hops (the panmaster's
  round grew a return stop through the kelp garth — prefabFromJson
  refuses long legs at load, which is how it was caught).

## The def + the curated seats

- `skral_village` (tiers 2-6, weight 1, shore, family skral): both
  prefabs, garrison with patrol sentries (the authored rounds deal
  verbatim — server pois.test THE ROUND HAS STATIONS extended to pin
  it), named CROWNED deepkings (Weirmother Sog / King Panbrine /
  Croakfather Hulm / Mudqueen Berl / The Salt Crown), warded iron
  cache (landmark law: exactly one, no boss chest).
- **THE WILD CROWN BUG**: `crowned` was typed in PoiDef and read by
  the server's champion forge but SILENTLY DROPPED by validatePoiDef
  — every wild crowned row shipped since the flag was born lost its
  crown at registry build. Vetted + carried now.
- **A shore LANDMARK is judged like a shore compound** (pois.ts):
  shoreReach = margin − 14 + SHORE_CAMP_REACH for any ≥34-tile
  footprint — anchor-reach-10 on a 60-tile ground would demand the
  heart stand IN the lake; the village carries its own vein and its
  HEM works the real waterline.
- **Four curated seats** (AUTHORED_WILD_SITES, all CELL-FORCED like
  the named dens — a village is deliberately off every road, and the
  pinned-site law requires pins to hug roads): `croakwater_banks`
  cell [-5,-1] (Kingswater south bank — stood at -574,-69, tier 4,
  salt garth), `amberfen_shoal` [1,1] (the fen's south hem —
  196,182, tier 1, long banks: the ACCESSIBLE one), `saltflat_garth`
  [6,3] (the Salt Flats — 828,464, tier 3, salt garth: the pan-folk
  at the one country that is all money), `coldwater_shoal` [-2,-3]
  (east of the tarn — -210,-331, tier 2, long banks). The hash dealt
  the semantically right prefab at every seat unprompted. Glasswater
  was tried and LAWFULLY REFUSED (Pinewatch owns its east shore; the
  lake's heart owns every cell center a landmark scan can use) —
  Ashmere likewise (Kingsdelf clearance) and the Salt Flats' own
  center cell (too rough); cell [-3,-3]/[-3,-4] Coldtarn crag
  refused too. **The refusals are the law working** — probe with a
  forced poiForCell sweep before arguing with it.
- Cell-mode pins skip the road-distance law AND the y≥400 dark-band
  pin check (decideSite still enforces DARK_BAND_Y 512 honestly).

## The variety below (no two grounds alike)

- **Three new camps** widen skral_shoal's pool to EIGHT:
  `poi_skral_saltcamp` (pans round a brine finger),
  `poi_skral_kelpcamp` (lines + keep pools + the mend bench),
  `poi_skral_chimehollow` (the culture camp: chimes, the tide's
  table, the spawning bank). All three joined the tidehold's wing
  pool (now 7) and WING_CAP.
- **Four new ward pieces** take the Drowned Charter's pool to TEN:
  `ward_sk_saltgarth` / `ward_sk_menders` / `ward_sk_shelters`
  (knots: skral sleepers) / `ward_sk_chimeway`. Every new piece
  carries an HOUR-KEEPING sign, and the four charter pieces that had
  none (pools/racks/middens/netyard) each grew a lure or totem —
  **any ward deal now keeps a clock** (the tidefast's seed-4 re-deal
  had gone hourless and the Third Charter test caught it; layout
  seeds were NOT re-pinned — the ghost-seat law holds).
- POI_POST_SIGNS grew the Charter's remaining rows at POI scale:
  HarpoonRack drills 6-20, TideTotem/LurePole keep vigil 18-6 — the
  villages people their watch without a single spawn marker.

## Proving (lane 10, arx_skralland)

Boot log: all four sites stand at their probed anchors. Live: the
coldwater Long Banks walked (King Panbrine crowned, WADING his weir
gate with a harpooner beside him; drying racks heavy; pans crusting;
keep pools circling), the fen village at tier 1 (Weirmother Sog in
her pool), the Salt Flats garth at the flats' hem (pans + bay +
shrine + skral at both fires, harpooner walking the round south).
Pass-two re-shot proved THE SHRINE HOLDS ITS POOL. Prefab data
audited by dump (all 15 craftsman kinds present in each village).
Suites: content 61/61 (geography+pois+strongholds scoped), server
pois 22/22 (mid-flight a neighbor's then-untracked hobgoblin family
re-dealt the territory voronoi and failed the epoch-jitter test —
they landed ff6beef1 with the horizon fix and it cleared).

Debts (deliberate): night portrait of a village not landed — the
headless lane ran at 1-2fps and the static layer's night band never
rebaked (clock + moonlit flag PROVEN flipped via __arx probe; the
LurePole light rows are untouched from 46d42efc and the tidehold's
night was proven last session at 18fps) — reshoot on a healthy lane
if flagged; the Great Weir's re-dealt ten-piece wards are validator-
and-test-proven but not re-walked live (seat unchanged); organic
village rolls (weight 1) not hunted live — the same composer deals
them and the density sweep says they stand.

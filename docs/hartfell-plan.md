# HARTFELL — the town past the treeline

*A world-authoring epic for the Dawnlands. Read `packages/content/src/geography.ts`,
`docs/pinereach-plan.md`, and the `dawnlands-map-master-plan` +
`map-curation-standard` memories before touching anything here.*

---

## 1. The brief

One ask, one country: a sixth town, far north-east beyond Pinewatch, for
players level 20-35. Fully bespoke, every element curated with intent —
streets that grew, buildings that are lived in for a reason, a real economy
with real limits, its own stories, its own conversations, its own trouble.
Not an end-all town: a specialized one, with fortes and boundaries, that a
character learns to grow inside.

---

## 2. The idea

**Hartfell is the town past the treeline, and it exists because of one
accident of the earth: the Kettle — a spring-fed tarn that steams in every
month and has never once frozen.** Everything else follows from the warm
water. The hart herds winter beside it, which is why the herders came. The
herders' fires needed feeding, which is why the hunters stayed. Nothing
else lives easy up there, which is why nobody else came at all.

Where Pinewatch is a town *against* the wild (a watch, a wall, a line no
axe crosses), Hartfell is a town *inside* it. The fell country cannot be
held, so the town never tried. It keeps herds the wolves could take and
pays **the tithe** instead: every slaughter-day, the offal and the old
beasts go out on the sledge to the Quiet Stones at the treeline, and the
packs take the tithe and leave the folds alone. Forty years and the bargain
has never once broken. Pinewatch thinks this is madness. Hartfell thinks a
wall you have to man every night is a debt, and a bargain both sides keep
is a wall that mans itself. Neither town is wrong. That argument — wall
against bargain, watch against tithe — is the whole axis of the north.

**The trade.** Furs, hides, horn, smoked meat, and tallow. Every winter
cloak in Silverfall began as a Hartfell hide; every candle and lamp-fill
south of the Glasswater is rendered at the Kettle's rendery; the Silver
Setting and the Lantern Row carve Hartfell antler. The town buys what it
cannot make: Pinewatch boards, Silverfall iron, Amberford grain. The
Hartway exists because four towns need it to.

**The limits (a town is not an end-all).** No sawmill — boards come up the
road or they do not come. No great forge — Eirik mends and points and
traps, and a master smith's work means a journey. No harbor, no crops, no
chapel, no castle. The bank is a strongroom with two chests and a woman
who counts. What Hartfell has instead, nowhere else has at all: the best
leather in the Dawnlands, the only warm water north of Saltmere's kettles,
and people who know the fells by name.

**The trouble.** The fells above the town are barrow country — the graves
of the old north, turf mounds and standing stones older than any road,
and the town's oldest law is *dig no barrow*. This summer, someone is
digging. Outland spades — Red Company men out of the south — have opened
a mound on the Barrowfell, and what they let out walks: the near fell has
gone silent, the packs have left their runs, the tithe lies untouched at
the Quiet Stones for the first time in forty years, and wolves with
nowhere to be are pressing down toward the folds and the Hartway. The
town reads the signs wrong at first — that is the quest spine: it looks
like the bargain breaking, and it is actually something older than the
bargain being robbed.

---

## 3. The land

### 3.1 New geography (draft — all coordinates verified against the
mapscan rig's real ground before they are pinned; the pinereach law)

| id | kind | heart | r | what it does |
|---|---|---|---|---|
| `cairnfells` | massif | (856, -488) | 150 | the fell wall east and north-east of town — crag country, the barrow ground on its shoulders |
| `cairnfells_north` | massif | (712, -556) | 120 | the north rampart; the town sits in the saddle between the two, open only to the south-west |

The Pinereach's own falloff draws the treeline unaided: the taiga heart at
(620,-190) r190 gives out around y ≈ -360, so the Hartway *climbs out of
the trees* on its last league and the town stands past them — the
transition is a journey, not a rule. No new pineland, no new mere: the
Kettle is authored inside the zone (the heart law — hearts never sit on
an authored canvas, and a tarn this small IS the canvas).

**`HARTFELL_RECT` = (704, -448) 128 × 96, centre (768, -400).** Aproned.
~322 tiles from Pinewatch's muster yard, ~594 from Amberford — deep in the
tier-5 base band, which is exactly the design:

- **Haven anchor** (768,-400) safeR 64 — the fourth haven. Tier 0 inside;
  the relief grades the walk-out to **tier 3 at the walls (levels 15-24),
  tier 4 a stone's throw on (22-34), tier 5 past that (32-48)**. A clean
  25-35 onion with no dial touched, and the far fell stays a place the
  town lives beside, never owns.
- **No dread anchor.** The base band up here is already 5 — a dread would
  add nothing (the field clamps at DANGER_MAX). The Blackpine needed one
  because its country was near two towns; nothing about the Barrowfell is
  near anything.

**`BARROWDEEP_RECT` = ground reserved, not built** (~64×64, up-fell
north-east of town, exact placement from the scan). The Cairn Path has to
end somewhere true (the Rimeward law: a road that ends nowhere is a road
the plan is lying about), the frontier scaffold stays out of it, and the
great barrow's door is a door a future delve epic can open. Not aproned —
the crags keep their teeth right up to it.

### 3.2 The roads

| | `hartway` | `cairn_path` |
|---|---|---|
| kind | road (Path, lamped) | trail (Dirt, unlit) |
| from | the Timber Road at (660,-78) — its last-league waypoint below Pinewatch | Hartfell's north wicket |
| to | Hartfell's south gate | inside BARROWDEEP_RECT |
| story | the drovers' road: herds walk down it alive and come back up as boards and iron. Forks off the Timber Road so every wain north rolls past Pinewatch's gate first — the towns are stapled together on purpose | the sledge track to the Quiet Stones, and past them the old processional way up the Barrowfell that nobody uses. Now somebody uses it |

The Hartway is a **road**, not a trail — built, graded, and lamped,
because the tithe sledge and the fur wains use it weekly and the lamps
burn Hartfell's own tallow. It leaves the Timber Road *below* Pinewatch
deliberately: Pinewatch stays the staging town of the north, the last
saw and the last bank before the climb, and the Wardline gate keeps its
meaning untouched (the old wood is not ours; the Hartway never enters it —
it runs the open country east of the Pinereach's deep heart).

One road in. No shortcut, no second way, no two-roads gimmick reprise —
the north's version of safety is different: the road is long, lamped, and
watched at both ends, and everything off it is honestly tier 5. The map's
lesson this time is *stay on the road*.

### 3.3 Authored wild sites (cells verified against the one-site-per-cell
ledger before pinning; the wardline_cut cell (5,-2) and pinehollow cell
(5,-1) already block the obvious middle-leg spots — the Hartway's rests
sit east of the old claims)

| id | defId | where (draft) | what |
|---|---|---|---|
| `drovers_fire` | `waystation` | ~(772,-180), cell (6,-2) | the Hartway's one roof: a walled fire where the drove beds down, exactly where the band runs deepest |
| `quiet_stones` | `wayshrine` (new prefab `poi_quiet_stones`) | ~(744,-330), cell (5,-3) | the tithe stones at the treeline: a ring of standing stones, the sledge-flat stone, old bones, no people — scenic, load-bearing, and currently wrong (the tithe lies uneaten) |
| `opened_barrow` | **`fell_barrow`** (new archetype) | ~(850,-470), cell (6,-4) | the robbed mound: turf dome, stone door levered off, skeleton dead walking their own grave-field, digger tools dropped where the digging stopped going well |
| `digger_camp` | **`barrow_diggers`** (new archetype, weight 0) | ~(740,-470), cell (5,-4) | the Red Company dig: spoil heaps, crates of grave-goods, brigand spades and their reaver foreman. clearedFlag `poi_diggers_broken` — the quest spine's address |

**`fell_barrow` gets a real weight** (minTier 4): barrows also roll
naturally across the high fell country, so the whole region reads as what
it is — a grave-field the living tiptoe across — and the Lived-In Land
scaffold keeps dealing the texture forever. `barrow_diggers` is weight 0,
authored-only: there is one dig, it is a story, and when it is broken it
stays broken.

---

## 4. The town (the shape — built bespoke, streets first)

128×96, walls of dry stone, snow on every roofline — except the green
ring. **The melt ring around the Kettle is the town's signature image:**
a steaming tarn, bare grass and flowers in a fifty-foot circle, and
snow everywhere past it. The one warm place in the north, visible from
the gate.

- **THE KETTLE** — the hot tarn, stone-rimmed walk, the town's centre,
  clock, and reason. Never freezes. The herds winter against it; so does
  everyone else.
- **THE SPRINGHALL** — the moot-house and bath-house over the Kettle's
  north rim: the Fellmoot's floor (Hartfell answers to no crown — it
  answers to a circle of benches), the warm pool, the Speaker's lectern,
  and the springkeeper's remedies.
- **THE BEACON** — on the north crag shelf: a fire-basket, a horn, and a
  hut. When the beacon burns, Pinewatch bars the Wardline gate — the two
  towns' watches answer each other across the water, and both know it.
- **HORN HALL** — the hunters' lodge: the long table, the racks, the
  huntmaster's trade in bows, spears, and traps. The walls wear forty
  years of antler.
- **THE HIDEHALL** — the fur exchange: hide racks, the grading counter,
  and the strongroom (Vault + bank chests) where the tallywife counts.
  The best leather in the Dawnlands leaves over this counter, and the
  Charter's buyer sits at the inn *not* being allowed to charter it.
- **THE RENDERY & SMOKEHOUSE** — downwind south-east (the pitch-yard
  law): tallow vats, the candle bench, smoke huts hung with the winter's
  meat. The smell is the town's, the way pitch is Pinewatch's.
- **THE FOLDS** — stone-cornered folds along the west side, harts (stag +
  hind) wintering inside the walls, the herdmaster's hut, the herdgate
  west onto the drove meadows.
- **THE WARM ROW** — the cottages, clustered on the melt ring the way
  real houses cluster on real warmth. Alike as siblings, different as
  siblings (the Low Row law: nobody planned the differences, which is
  the plan).
- **THE HORN AND HEARTH** — the inn by the south gate: the drovers'
  beds, the buyer nobody invited, and the pedlar nobody quite trusts.
- **Smithy** (Eirik: points, traps, mending — a working smith, not a
  master), **bone-carver's hut** (Tuli: combs, hafts, buttons, charms),
  **chandler's** (Ulfa: the lamp-fill and the candles).
- **THE TITHE YARD** — inside the north wicket: the sledge, the cold
  store, the tithekeeper's hut. The wicket opens onto the Cairn Path,
  and the sign on it does not waste words.
- **Walls & gates**: dry-stone curtain south/west/east; the crag shelf
  closes the north. South gate (the Hartway), west herdgate, north
  wicket. Every gate burns a tallow lamp all night — this town lights
  its own walls with its own trade.

**Dialect notes for the build:** stone and turf, not board and shingle —
this is NOT Pinewatch with the names changed. Low buildings, thick walls,
small windows, board rain-roofs only where work needs dry hands. Snow
tiles as ground truth everywhere the Kettle doesn't argue. Diagonal
budget: the Springhall's two lakeward shoulders, nothing else. Streets
first; ≥3 open tiles between structures; every shop hangs a shingle one
pace off its wall (the sign law); room intent legible in furniture.

## 5. The people (~17 named + the Fellwatch)

Speaker Ashild (the moot's voice, chosen not crowned) · Maeva the
springkeeper (remedies; knows what the water knows) · Kolgrim the
huntmaster (Horn Hall; shop) · Ranna the furrier (Hidehall; the leather
shop that matters at 25-35) · Inga the tallywife (the strongroom) ·
Ulfa the chandler (lamps; repeatable tallow quest) · Geir the
smokemaster (food) · Tuli the bone-carver (quiet; shop) · Eirik the
smith (mends, points, refuses masterwork honestly) · Brandulf at the
Horn and Hearth · Swein the herdmaster (the empty-fold quest) · Sunn
the fell guide (young, fast, the tracker of the arc) · **Orvar the
tithekeeper** (walks the sledge out alone every slaughter-day; the
north's strangest job and its most respected) · **Elder Gunvor** (was at
the out-camps in the Wolfwinter; the fifteenth name on Pinewatch's
memorial argument is her brother, and she knows how the argument ends) ·
Signe the Waykeeper (the road-lamp post at the south gate) · Hallward
the Charter's buyer (lodged, polite, refused) · Grimm the pedlar (buys
"fell finds", asks no questions, is the reason the diggers knew what to
dig). Pooled: `hartfell_watch` (the Fellwatch) ×3, `hartfell_herder` ×2.

Factions: the town is **nobody's** — the Fellmoot rules itself (the
counter-story to Crown Silverfall and Charter Amberford). Signe is
waykeepers; Hallward is the Charter; the diggers are Red Company; Grimm
smells of them.

## 6. The quests

1. **`the_empty_fold`** (Swein, ~L25) — harts gone from the fold, and the
   kill is wrong: taken, not eaten. Sunn reads the ground: no pack has
   run this fell in a month. Intro to the arc; teaches the tithe.
2. **`the_unanswered_tithe`** (Orvar, ~L28) — walk the tithe out to the
   Quiet Stones with Orvar's sledge and see it: last week's tithe
   untouched, the stones cold, and up-fell, wrong shapes on the old
   processional way. First blood with the barrow dead.
3. **`the_opened_barrow`** (Ashild + Orvar, L30-35, the spine) — break
   the diggers' camp, take back what the foreman lifted (the grave-band),
   and stand with Orvar at the mound's door while it is set right. The
   packs come back to their runs; the tithe is taken again; the town
   exhales. Red Company standing pays for it.
4. **`tallow_for_the_lamps`** (Ulfa, repeatable) — the north's lamps eat
   fat; bring it. The resin_for_the_road pattern, north dialect.
5. **`the_fifteenth_name`** (Gunvor, story) — Pinewatch's Wolfwinter
   stone argues about a fifteenth name. Gunvor knows it: her brother
   Alvar, written off as taken by the ice, walked NORTH across it and
   lived — he built the first fold at the Kettle. Hartfell exists because
   of the Wolfwinter's one survivor nobody counted. Cross-town talk
   chain (Torvi in Pinewatch holds the other half); unlocked the Torvi
   way, by asking the right question. No coin reward worth naming. The
   payoff is the truth.

## 7. Phases

1. **THE LAND PAST THE TREES** — mapscan the real ground; the cairnfell
   massifs, HARTFELL_RECT + haven anchor, BARROWDEEP_RECT, the Hartway +
   Cairn Path, the four authored sites, `fell_barrow` + `barrow_diggers`
   archetypes + prefabs + `poi_quiet_stones`. Tests (geography pins,
   warnings clean, cell ledger clean).
2. **THE TOWN AT THE WARM WATER** — the bespoke zone build, registered
   sixth; reachability walked; content tests.
3. **THE PEOPLE OF THE FELL** — cast, routines (sleepers to real beds),
   dialogue per voice card, shops, faction texture.
4. **THE QUIET BARGAIN** — the quest arc + flags + rep payoffs.
5. **THE WALK** — live tour at close zoom on the isolated rig, curation
   audit per map-curation-standard, fix, re-shoot, done means walked.

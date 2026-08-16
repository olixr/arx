# PINEWATCH REMADE — THE WATCH HOLDS THE NORTH

*Plan authored 2026-08-16. The reimagining of the fifth town: the rect grows
south, the north-east grows a garrison, the cast grows nine names, and the
town finally tells the whole of its story — the surface of it to anyone who
walks in, the marrow of it to anyone who listens.*

Read with: `docs/pinereach-plan.md` (the town's first build), the Vale plan
(`docs/silverfall-vale-plan.md`, the growth method this copies), and the
dressing-law memories (Dawnmead b1b4781f, Amberford e75145cb).

---

## 1. What the survey found (2026-08-16, seed 24601)

The great regen seated Pinewatch on a **natural fortress isthmus** and the
zone has never once acknowledged it:

- **The Glasswater walls the entire west.** Real water laps the west hem from
  y −400 down past the south hem. The authored in-zone lake (local north-west)
  composes with it at the west hem only; at the NORTH border the authored
  water meets procgen *land* — a standing seam.
- **An eastern tarn walls the north-east approach; the tarn maze walls the
  south-east.** Worldgen deals open water inside what a southward growth
  claims at roughly local x106+, y112+.
- **The Hartway leaves at world (1220,−404) — the rect's north-east corner —
  through a mountain notch.** Geography's comment promises "Pinewatch's NORTH
  WICKET." **No such gate exists.** The road to Hartfell starts at a blank
  forest hem. This plan pays that debt.
- **The Sparway no longer reaches the town.** It rejoins the Timber Road at
  (1010,−160), far south-west. The west gate at local (0,48) — still pinned
  by content.test — opens directly into deep water. A door into the lake.
- **The Timber Road's last league** threads a rock spur at world x≈1140,
  y≈−310..−296 and ends at (1160,−309), local (64,95), the current south gate.
- North of the rect, between the lake's north end and the north-west massif,
  runs the **open shore corridor** — the ground the Wolfwinter's packs walked.
  The only land approaches from the north are that corridor and the Hartway
  notch. The town is the cork in the northern bottle.

## 2. The shape (pinned)

- **PINEWATCH_RECT: { x: 1096, y: −404, w: 128, h: 152 }** — grown straight
  SOUTH by 56, origin FIXED, so every pre-growth local coordinate and every
  routine offset survives verbatim (the Vale law). South hem lands at y −252.
- **Anchors that must not move** (routines and quests hang off them): the Old
  Watch tower + knoll + stair, the muster yard + rota + Wolfwinter stone, the
  boom + both piers, the millrace, the Great Saw, the Charterhouse + wain
  bays, the inn, the stores, Sparwrights' Row, the pitch yard, the Low Row
  cottages, the Wardline gate + the old wood east of x108 (y8–94), the
  nursery shed, the fisher steps, and **the Timber Door hatch at local
  (14,43) → (217.5,594.5) underworld** (Red Company coupling — byte-exact).
- **Gates after the rework — four, each with a job:**
  - **The Timber Gate** (south, moved): local (31–33, 140), standing IN
    the rock cut the road already carved through the ridge (§5). The road
    tail trims to (1129,−262); the carve crosses the hem at local x≈32.
  - **The Hartgate** (north, NEW): local (121–123, 5) in the Northguard's
    curtain, in the pass notch whose rock shoulders worldgen already
    stands at the corner; mouth path meets the Hartway at local (124,0) =
    (1220,−404) tile-exact. The "north wicket" the geography always
    claimed. Two rock-cut gates bracket the town — the design rhyme.
  - **The Wardline gate** (east, KEPT): local (106, 59–60). Sacred.
  - **The Strand** (south-west, OPEN): no gate — the lake is the wall. The
    wall dies into the water at both shore ends (the mole law) and the
    Shore Bastion watches the beach where the ice-road forms (§5).
  - **The old west gate DIES.** GateGarrison at (6,48–50) becomes wall; the
    Sparway signpost comes down; the curtain's story there is water.

## 3. The fiction (what the town now says out loud)

Pinewatch was a watchtower before it was a town, and the watch was always a
bargain: *the water holds the north eleven months a year, and the town holds
it the twelfth.* Forty years after the Wolfwinter the bargain has new
parties. The Crown — which buys masts here and thinks about navies — has
paid for a fort at the pass where the drovers' road climbs to Hartfell, and
mans it. The town — which watched for four hundred years by rota, everybody,
no roof excused — has accepted the fort the way you accept a strong guest:
politely, and without handing over the keys. The tower still watches the
water. The fort watches the road. The town watches the fort.

And underneath, for the listener: **the lake is getting cold again.** Four
people in this town have each noticed one true thing, and nobody has said
them in the same room yet.

## 4. Couplings priced (every file this epic touches)

| coupling | file | price |
|---|---|---|
| rect h 96→152 | geography.ts PINEWATCH_RECT | one line + comment |
| Timber Road tail | geography.ts routes: replace pts after (1128,−252) with a bow east-then-north ending ~(1160,−250) at the new gate mouth | route ends inside rect ✓; re-run geography tests |
| haven anchor | danger.ts (1160,−356,safeR 64) → (1160,−330,safeR 80) so the grown south stays tier 0 | validator bounds check |
| crown faction anchor | factions.ts (1160,−356) → (1160,−330) | one line |
| audio zone | client audio/zones.ts (1160,−356,30/48) → (1160,−330,44/64); tracks.test.ts sample point | two lines + test |
| zone pins | content.test.ts two pinewatch tests + signs-law towns list | rewrite pins to the new truth |
| the west gate pin | content.test.ts "Sparway mouth" rows | delete; pin the Strand + Hartgate instead |
| cast count | content.test.ts 22 → 37 | update with named list |
| lowhall door | 'the Pinewatch door' test at (17,41) | UNTOUCHED (hatch keeps world coords) |
| Hartfell dialogue | gunvor_ice, fellwatch_horn, q_the_fifteenth_name | read-only canon — new lines must not contradict |
| VOICE.md | §Pinewatch | +9 cards + northguard pooled |

## 5. The districts

**KEPT WHOLE (healed + dressed, never moved):** the Glasswater front (boom,
tally shed, timber strand, Great Saw + millrace, skidway), the Old Watch +
muster yard, the axe-smith, the Charterhouse + wain bays, the Pine and Bell,
Pinewatch Stores, Sparwrights' Row, the pitch yard, the Low Row, the
cordwood yard, the Wardline + old wood, the fisher steps, the reed bay +
Timber Door.

**THE NORTHGUARD (NE quarter, local ~x98–126, y2–30, NEW):** the Crown fort
astride the pass road. Bastioned curtain from the shore (west end dies
toward the water by the fisher shore) wrapping the corner; the Hartgate in
its north face. Inside: the gatehouse, the drill yard (target dummies, spear
rack — postSigns animates drill posts free), the barracks (six bunks, hot-
bunk law), the armory + quartermaster's store (stone; the higher-end gear
shop this town earned by tapping the northern iron), the kennels (the hound
line bred down from the Wolfwinter's survivors' dogs), and **the Answering
Beacon** on a raised platform — the standing reply to Hartfell's fellwatch:
*when their fire burns, Pinewatch bars the Wardline and lights the answer.*
The Wardline's blazed line now anchors its NORTH end at the fort's corner
stone ("the line's first stone is the fort's cornerstone") and marches south
as before. The nursery keeps its ground west of the fort wall; its east
sapling columns trim to x≤97.

**THE SOUTH GROWTH (y96–151) — revised to the measured ground (fine scan
2026-08-16):** worldgen deals the growth three masters: the lake laps the
west hem the whole way down, a ROCK RIDGE runs local x≈34–52 from y≈100 to
the hem with the Timber Road already carved through its west shoulder, and
the TARN owns everything east and south of an arc from about (54,140) up
through (78,122)–(85,119) to the east hem at y≈117. The districts live on
the western isthmus and the meadow band, and the water does the walling:

- **The Watch Road extends** to y≈114; **the Southway** (y112–113) runs
  west from it; **the Gate Lane** (x31–33) runs south to the new gate;
  **the Strand Walk** (x8–9) links the millrace country to the shore.
- **THE TIMBER GATE IN THE CUT (x31–33, y140):** the road's own historic
  carve climbs through the ridge's west shoulder — the gate stands IN the
  rock cut, flanked by living stone, the strongest threshold this town
  could ask for. South curtain runs x4→30, gate, x34→52, and dies into
  the tarn at ~x53. The Timber Road tail is TRIMMED to end at (1129,−262);
  its carve crosses the hem at local x≈32, tile-exact under the gate.
- **THE HUNTERS' ROW (x12–32 along the Southway):** game lodge + fletcher
  north of the way, the outfitter south of it — leather and northern iron
  for the road north; the higher-end gear story's civilian half.
- **THE RIDGE & THE ORE CUT (x34–52, y100–138):** authored crags where
  worldgen already stands them; the worked north face carries iron-bearing
  rock, the bloomery, and the Ironmaster's hut at its foot. Feeds Vigga
  and the quartermaster. "A bloomery eats charcoal, and charcoal is
  trees" — the argument with the nursery is text, not subtext.
- **THE DROVERS' YARD (x22–30, y126–138):** paddock, rails, trough,
  hitching — every herd bound for Hartfell stages beside the gate. ONE
  WayShrine at the mouth (the Waykeepers hold this road).
- **THE GREEN & THE PHYSIC GARDEN (x70–102, y94–112):** the meadow band
  between the pitch yard and the tarn shore — the town's first commons:
  the herbalist's cottage + physic garden, two cottages, open grass
  sloping to the water. The nursery's hedge ring stays at the NURSERY
  (its original ground, trimmed at the fort's wall) — the one hedge in
  town, because the nursery is the one place in Pinewatch that owns
  shears.
- **THE TARNSIDE (the arc from (54,140) to (106,116)):** the authored
  tarn takes the whole south-east; reeds, one bench, the east curtain
  dying into the water at ~(106,115). Deliberately near-empty (the
  Fairstead law). The east curtain now runs y27→114 only; the fort owns
  the wall north of that.
- **THE WINTER STRAND (x2–10, y96–140):** the lake inside the hem, sand
  band, drawn-up boats, ice-saw racks, and the **Shore Bastion** — a
  raised garrison platform (level 1, braziers) because *when the water
  goes hard, this beach is a gate.*

## 6. The people (22 → 37 placements)

**Kept, every one (deepened where the growth touches them):** Halla, Torvi,
Groa, Yannick, Vigga, Sunniva, Rullo, Ebba, Ospren, Nial, Bram, Kettil, Odd,
Sigrun, Ylva, Haldis, watch ×3, sawyers ×3.

**New named (9):**
- **Captain Stellan** (Northguard): career Crown soldier; drills harder
  every week and won't say why; his respect for the rota arrived slowly and
  embarrasses him. Wants: the pass held without ever proving it needed to be.
- **Quartermaster Berget**: the armory and the gear shop; requisition forms
  made flesh; sells steel to civilians at a markup she calls "the wall tax."
- **Serjeant Ove**: the drill yard's voice; Pinewatch-born, which makes him
  the fort's one bridge to the town; runs the gate rota.
- **Houndmistress Ranka**: the kennel line descends from Bern's dog — the
  one that came back across the ice. Her hounds have stopped sleeping on
  the north side of the run. She has told nobody but the hounds.
- **Fletcher Espen** (hunters' row): bowyer; strings every bow with the
  story of the tree it was; sells arrows, keeps the best dozen back.
- **Master Hunter Kolbrun** (game lodge): keeps the cull count; the wolf
  tally is wrong this year — not more wolves, *fewer*, and she knows what
  it means when the wolves leave first.
- **Herbalist Maren** (physic garden): the salve-maker; born in the
  out-camps the Wolfwinter emptied — carried across the ice at four years
  old, and she remembers by whom.
- **Ironmaster Torger** (ore cut): found the seam; pays the mountain the
  respect Odd pays the wood, which is why their argument never quite
  becomes one.
- **Drover Sylvi** (gate precinct): walks the Hartway both ways; the towns'
  gossip artery; names Gunvor and the tithe like neighbors.

**New pooled:** northguard ×4 (two day, two night — gate pairs per the rota
law, hot bunks in the barracks), hunter ×2 (lodge/track).

## 7. The threads (surface → marrow)

1. **THE COLD SIGNS** (the deep secret; quest `the_cold_signs`): four
   mouths, four true things — Ylva (the ice edges are forming a month
   early), Odd (the newest sapling row crooks the way the pre-Wolfwinter
   row crooked), Ranka (the hounds), Kolbrun (the wolves left). None of
   them volunteers it; each is a gated beat behind earned trust. Carry all
   four to Halla and she closes the door: *"Now you know what the rota is
   for."* Sets `cold_signs_known`; the watch, Stellan, and Sunniva read it.
   Nothing resolves — this is the door the next northern epic knocks on.
2. **THE CROWN'S REAL ERRAND**: Stellan and Ospren arrived the same season.
   Masts are navy timber. Ebba will say exactly one sentence about it, and
   only to somebody the ledger already trusts (`wardline_doubted`).
3. **THE TIMBER DOOR** (standing, now acknowledged): Kettil has seen the
   raked sand at the reed bank; Bram's count loses one raft a month and his
   word is still "missing." Nobody says smuggler. The Red Company keeps the
   answer (open thread, the Grimm law).
4. **THE FIFTEENTH NAME** (kept whole, deepened): Torvi's thread and its
   Hartfell half are canon. Maren's gated line (behind `aslak_written`)
   adds the witness: the fifteenth carried her across the ice, and went
   back. It must contradict NOTHING in torvi_the_fifteenth/gunvor_ice —
   read both before writing a word.
5. **THE ROTA AND THE FORT**: the polite cold war. Halla signs nothing she
   didn't write; Ove translates; the watch's pooled line carries the town's
   verdict: "The tower watches the water. The fort watches the road. We
   watch the fort."

**New quests (2):** `the_cold_signs` (above; giver Ylva, talk-web, flag
reward — every talk beat obeys the credit-before-pick law) and
`the_north_count` (Stellan: walk the pass line, thin the wolves at the
notch, report — kill + talk, pays crown standing, sets `northline_walked`;
the northguard pooled tree reads it). Every quest keeps a `quest_turnin`
tree at prio 21 gated `:ready`, and every reward flag gets a reader.

## 8. The dressing ledger (shelves seated by fiction)

- **Muster yard**: NoticeBoard (the rota made legible beside its lectern),
  TownBell at the tower foot (the sign has always said "the bell is not
  decoration" — now there is a bell), Basin→WaterTrough, StoneBench pair,
  Woodpile at the yard fire.
- **Great Saw**: LumberRack ×3, Grindstone (teeth set here), BarrelStack,
  HandCart at the board yard.  **Axe-smith**: Basin→QuenchTrough,
  SmithBellows, IngotRack, Grindstone.
- **Stores**: ShopShelf ×2, DisplayTable, HangingScale, BasketStack,
  GlazedJars (the salve).  **Charterhouse**: ScribesDesk ×2 (two ledgers,
  one roof), CandleRack; wain bays get HangingScale + GrainSacks + CrateStack.
- **Inn**: TapCask, GameTable + WoodStool ×2, SettleBench at the hearth,
  CloakStand, BreadOven in the kitchen, CandleStand, Woodpile.
- **Waterfront**: MooringPost ×3, BeachedSkiff (Ylva's), FishmongerSlab at
  the steps, BasketStack.  **Pitch yard**: BarrelStack, WaterCask + pails
  ("no open flame" enforced in props), HandCart.
- **Nursery/green**: hedge ring + wicket (the one hedge), Wheelbarrow,
  WaterCask, LeanLadder.  **Physic garden**: HerbPlanter ×2, HerbRack,
  SillHerbs, HerbBundles, GlazedJars.
- **Northguard**: WeaponRack, SpearRack, TargetDummy ×2, IngotRack,
  GrainSacks, Brazier line, watch-charcoal banners, WaterTrough (kennels),
  CrateStack.  **Hunters' row**: FletchersBench, CarvingBench, WeaponRack,
  one practice butt.
- **The cordwood motif**: a Woodpile at every cottage — "a cord a roof,
  before the first frost" made visible.
- **RESTRAINT (as binding as the additions)**: no TownFountain, no
  FounderStatue (nobody founds a watch), no GuardianStatue (the tower is
  the guardian; the Old Hound is Amberford's), hedges nowhere but the
  nursery ring, one HandCart per district, the Tarnside stays bare, and
  every placement passes the wall-shadow law + the pre-validate probe.

## 9. Phases (a commit each)

1. **THE PLAN** — this document.
2. **THE GROUND** — rect growth, geography/anchor/audio couplings, the
   redrawn Timber Road tail, streets, the grown curtain + four-gate truth,
   the tarn + strand shores, districts blocked in, test pins re-cut.
3. **THE NORTHGUARD** — the fort, the Hartgate, the beacon, the kennels,
   the drill yard; garrison actor defs + routines + rota.
4. **THE SOUTH QUARTERS** — hunters' row, ore cut, gate precinct, green +
   physic garden + nursery move, Tarnside, Winter Strand.
5. **THE PEOPLE** — nine named + pooled defs, routines (sleepers walk to
   real beds; hot bunks), dialogue trees + the five threads + two quests +
   VOICE.md cards; the waypoint sweep run before boot (pre-validate law).
6. **THE DRESSING** — §8 seated; the probe + BFS re-run; restraint pass.
7. **THE WALK** — isolated rig lane, full tour at gameplay zoom, day and
   night, routine spot-checks, zero console errors, curation verdicts.

## 10. As-built ledger

*(appended per phase as the work lands)*

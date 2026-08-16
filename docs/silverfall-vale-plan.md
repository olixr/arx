# SILVERFALL: THE CAPITAL COMES DOWN THE MOUNTAIN

*The missing half of the city's history, built where it always belonged.*

The Crown Remaster (docs/silverfall-crown-plan.md) gave Silverfall a
palace worth the name. What the capital never got is a CITY. Walk it
honestly and the tell is everywhere: sixty-four souls and not one of
them goes home at night, because there are no homes. Every terrace is
a workplace; the moment you pass the Silver Gate you are inside an
institution, not a town. The capital reads as a fortress with shops.

A real mountain capital grows DOWNHILL. The oldest stone stands at
the crown; each generation terraces lower; and the newest, loudest,
poorest, most ALIVE quarter spills out past the old wall until the
wall has to walk out and catch it. That is this epic: not more of the
same city — the half that history owed it. The terraced city above
the Silver Gate keeps its bones (three epics pinned them, and they
are GOOD bones) and becomes THE HIGH CITY. Below the wall, on ground
the zone has never owned, the city the castle actually needs: where
the miners sleep, where the bread is baked, where pilgrims rest,
where the dead are buried, where caravans actually camp, and where
the mountain's water finishes its journey in a real lake.

User decree (2026-08-16): reimagine Silverfall foundationally — two
to three times the footprint, proper districts that read lived-in,
richer NPC life and dialogue, the Undercroft given room to breathe
and a story worth walking, semantic curation with the new decor
shelves, negative space respected, stories nested under stories.

## THE GEOMETRY (locked after the coupling survey)

**SILVERFALL_RECT: { x:-536, y:-344, w:176, h:128 } →
{ x:-536, y:-344, w:176, h:256 }.** Origin FIXED; the rect doubles
straight SOUTH. 45,056 tiles — 2.0x, and decisively the largest
zone in the world (Amberford 144x144 is next).

Why south, and only south (the survey's verdict):
- WEST is blocked immediately: the KINGSWATER mere's disc already
  laps the rect's south-west bottom row (heart (-540,-190) r84 —
  4 tiles off the west hem, protected by the Amberfen heart law).
- NORTH hits the Coldtarn at +18 and swallows the Hoargate Road's
  first waypoint, which sits ON the north hem at local (172,0).
- EAST spends the Spinewall East promise ("a clean thirty tiles off
  the city's east wall") and turns the Postern Lane — authored as
  the back lane under the east crags — into an interior street.
- SOUTH is where a mountain city grows ANYWAY, and origin-fixed
  south growth keeps EVERY local coordinate in silverfall.ts and
  EVERY hardcoded world coupling valid unchanged: the Undercroft
  portal pair ((-333.5,552.5) / (-497.5,-323.5)), the Low Hall door
  (-497.5,-299.5), the bank vault lock (-487,-304), the spawn
  (-447.5,-239.5), the Court Gate quest mark, the Postern column,
  the Hoargate road mouth. Zero shift. Zero churn in working code.

What the south growth costs, each priced and paid in Phase 2:
- **high_road tail re-threads** to the new Vale Gate (~world
  (-448,-97)): the last four waypoints re-lie along the new
  approach; geography.test route-endpoint law keeps passing by
  construction; SHORT SPAN law re-checked (the road stays east of
  the mere — no deep-water decks).
- **spineshelf_rest moves** (currently (-398,-202) — inside the new
  claim). It re-seats south beside the re-threaded road with its
  8-tile rect apron and 4.5..26 road margin, in an unclaimed
  macro-cell.
- **SPINEWALL_SOUTH re-seats** (heart (-398,-154) — inside the new
  claim). It slides south (~(-398,-44) band) so the crag shoulder
  again squeezes the road's last league against the water — same
  design, one league lower.
- **The Kingswater overlap becomes the design.** The mere's east
  lobe laps the new south-west corner: the lower town's west edge
  is authored LAKESHORE, the west hem rows where the mere laps are
  authored water, and the EDGE-HARMONY water class continues the
  shore seamlessly into the procedural mere. The heart itself stays
  off the rect; the law holds.
- **croakwater_banks** (skral village, cell-forced [-5,-1]) keeps
  its cell; the new corner claims only a 23x39 sliver of it. Verify
  the seated anchor clears the rect+6 pad at build time; nudge law
  covers the rest. The skral across the water are a story asset,
  not a bug.
- **Anchors re-center and grow**: danger haven (-448,-280) r72 →
  (-448,-220) r~124 (haven law: the city calm, the approach hot);
  crown faction anchor and audio TOWNS seat follow the same center;
  audio full 44/fade 72 → ~72/~104 (Amberford precedent scaled).
  tracks.test seat pin updates with it.
- **Row-indexed test pins re-base** (gate mouth row 127 → 255, BFS
  seeds, hem assertions); the ramp count, gate rows, throne tiles,
  and all other LOCAL pins are untouched by construction.
- **worldgen.test Silverspine ratio** re-verified (the skip-rect
  grows ~10 rows into the sample disc; retune threshold only if it
  actually trips). Flat-canvas law extends to the new rows free via
  the apron.
- **built_tiles in the new claim**: player builds on formerly-wild
  ground re-apply OVER zone streets. Deploy note: prod re-shape runs
  db:refresh --content --world; sweep built_tiles inside the new
  rows if collisions surface. (The world_pois ledger self-heals via
  zonePlanSweep; discovery markers for already-discovered characters
  keep the old center — cosmetic, accepted.)
- **prove:pets Silverfall stop is ALREADY one epoch stale**
  ((-323,-120) — pre-regen coords, outside today's rect). Fixed in
  this epic while the ground is open.

## THE WATER STORY COMPLETES

Mirrormere → the race → the court channel → the working channel →
the ROARING POOL — and today it simply stops. The pool gains its
outflow: a water gate under the old curtain east of the Silver Gate
(walls die into the banks — the mole law), and THE VALE RIVER runs
south through the lower town, under two bridges, past the mill, and
spreads into the KINGSWATER at the city's south-west. The whole
mountain's water finally reaches its lake, and every district of the
new town is built around what the water does for it: the mill grinds
beside it, the wet market sells out of it, the bath house steams off
it, the quays float on it.

## THE DISTRICTS (new canvas: y114-255, full width)

The one grand axis holds the whole city together: THE FORTIFICATION
LADDER gains its fourth and lowest rung. VALE GATE (y~238) → Silver
Gate (y112) → Court Gate (y62) → Castle Gate (y32) — four gates,
one avenue, every gate outranking the last, and now the climb starts
in a town instead of a wilderness.

### THE FALLS VALE — the lower town (center, x44-130)
- **The High Street**: the avenue continued, Silver Gate to Vale
  Gate, stone-paved, brazier-paced at the gates and lamp-paced
  between (the stair burns, the street glows).
- **The Vale River** with TWO crossings (the Mill Bridge and the
  Market Bridge) — the civic-axis law again: each bridge lands on a
  street that goes somewhere.
- **The Millward**: the gristmill ON the river (millrace channel),
  the granary pair beside it (GrainSacks, the weighbridge scale) —
  grinding AMBERFORD grain, because the LIMITS law holds: no fields
  in the mountains; the High Road exists for a reason.
- **Bakers' Row**: BreadOven pair, the night-shift bakery that
  feeds both shifts — the ovens never cool (baker sleeps at dawn;
  the one lit window at midnight).
- **The Wet Market**: the lower town's own market square off the
  Market Bridge — ProduceStand, FishmongerSlab (pool trout above,
  blind cave-fish from the broker below — the Undercroft's surface
  outlet), ButcherBlock, ochre market cloth, WaterCask, baskets.
- **The Last Climb**: the carters' tavern (the Flagon costs a day's
  wage up there). TapCask, GameTable with its permanent dice crowd,
  settle benches, the hearth wall.
- **Garland Row & the cottage lanes**: bespoke row-cottages with
  dooryards — hedge-ringed kitchen gardens (the hedge family's
  town showcase), woodpiles, water casks, wash-day. EVERY home
  belongs to a named resident who works somewhere real.
- **The craft commons** (east lane): the trades too common for the
  High City — the potter (kick wheel + clay-daubed mound kiln),
  the chandler (CandleRack — who do you think dips the shrine's
  candles?), the cobbler. Each a one-room shop with its keeper.

### THE KINGSHORE — the lake quarter (west, x4-42 south band)
- The authored shore where the mere laps the rect: quay planks,
  MooringPost row, BeachedSkiff pair, the fisher cottages, the
  boat-shed, net-mending bench. FishingSpot pair on the deep line.
- **The Lake Gate**: a modest west water-postern where the shore
  road leaves town along the mere — and across the water, the
  skral of Croakwater keep their own fires. The fisher folk and the
  skral wave at a careful distance (dialogue thread, not a war).
- The Vale River's mouth spreads into reed shallows south of the
  quay — the city's one soft edge, on purpose.

### THE SILENT TERRACE — the graveyard (west, raised shelf above
### the Kingshore, x8-40 y~120-146)
- A raise(…,1) shelf with its own stair: terraced barrow rows under
  yews; the OLD BARROWS predate the castle — the Silver Line is
  five kings from a quarry foreman, and these are the foremen who
  came BEFORE the kings (the nested meta the user asked for: the
  city's deepest story is that the dead knew it first).
- The lych gate, the gravekeeper's cottage, CandleShrine niches,
  and ONE GuardianStatue worn faceless — "the Watcher whose name
  wore off." Nobody lights candles there. Somebody keeps finding
  them lit. (The thread pays off against the Undercroft's fresh
  candle — same hand, never named.)
- RESTRAINT LAW: no loot among the dead, no chests, one bench. The
  quiet is the design.

### THE DELVERS' TERRACE — the miners' quarter (west, x4-42
### y~150-200, between the graveyard shelf and the Kingshore)
- The Emberway's workers finally live somewhere: one-room stone
  cots in two honest rows (ore-stained, brazier and cot, hot bunks
  — the shift system runs the whole city), Grettir's and Petra's
  own doors among them.
- **The Delvers' Rest**: the miners' tavern — rougher than the Last
  Climb. Grindstone by the door (edges sharpened after shift), the
  arm-wrestling table, the wall of chalk tallies.
- **The Bath House**: spring-fed (the led-spring WallFountain law),
  basin row, brazier steam — the one luxury the mine pays for.
- **The Masons' Guildhall**: the guild that carved the city and
  sealed the Undercroft finally gets more than a yard — charter
  room, the SEALED BOOK (the count that never matched — Grettir's
  brother's crew), the memorial wall with one name-space left
  uncut. The surface anchor of the Undercroft's deepened story.

### THE PILGRIM'S WAY & THE FAIRSTEAD (east, x120-170 south band)
- **The Pilgrim's Way**: a marked walk from the Vale Gate up the
  east side to the Silver Gate — WayShrine stations pacing it, the
  hostel at its foot (WayfarersRest, CandleStand, cheap beds), the
  road-faith made walkable. Sella's flame at the top; the chandler
  dips its candles at the bottom; the way binds them.
- **The Wagon Yard**: where real caravans actually stop (the upper
  caravanserai keeps the Crown's post-riders): rail bays, troughs,
  HitchingPost row, the wainwright's shed (Sawhorse, the wheel
  rack), the campfire ring where carters lie about the road.
- **The Fairstead**: the festival green inside the Vale Gate —
  empty MOST of the year (negative space is the point): the ring
  of GuardianStatue-flanked gate, the fair-day banner poles, the
  game corner. A green the city breathes through.

### THE VALE GATE & THE OUTER CURTAIN (y~236-240)
- The third-generation wall: plainer, faster work than the Silver
  Gate — the sign of a city that outgrew its plan (the masonry
  itself tells the growth story: castle > Silver Gate > Vale Gate,
  three centuries, three hands). Runs from the east crags to DIE IN
  THE LAKE west (the mole law again).
- Gate bastions echo the five-square drums a third time, smaller;
  GuardianStatue parity pair; the wardpost (the lower watch's
  desk); the SILVERFALL sign moves here — the front door speaks
  first.
- **The approach** (y241-255): the High Road's last league between
  crag and water, brazier-paced, one WayShrine — the postcard the
  city deserves: the whole terraced mountain visible above the
  gate on the climb in.

### THE HIGH CITY — re-dressed, not rebuilt (Phase 4)
Every existing district takes its dressing pass with the new
shelves, each in its own dialect, all under RESTRAINT IS CURATION:
- **Castle**: the household reads — solar CandleStand, hall
  CloakStand, kitchen GlazedJars + BroomAndPail + BasketStack,
  drill-yard TargetDummy pair at the butts, treasury HangingScale.
- **Grand Court**: NoticeBoard (the Crown's postings), TownBell
  (the moot bell the sign already promised), colonnade seat rhythm,
  the clerks' GameTable in the arcade shade.
- **Bank / Guildhall / Assay**: ScribesDesk trio, CandleRack,
  HangingScale at the scales table, DisplayTable for the Setting.
- **Emberway**: QuenchTrough + Grindstone + SmithBellows +
  IngotRack seat the Great Forge mid-shift; charge-line dressing at
  the smelter; the mine yard's tool order.
- **Timberway**: LumberRack pair, FletchersBench at the perch,
  DisplayTable at the carpenters' commission counter, sawdust
  truth.
- **Lantern Row**: StreetLantern rhythm makes the name literal;
  shopfront awning + display dressing; the Flagon's cellar
  BarrelStack + CloakStand + TapCask.
- **Gates & wardhouse**: SpearRack, WaterCask, the watch's kit.
- **Streets**: WayShrine at the stair feet (the road-faith), green
  where the plaza wants it (StreetPlanter, never window boxes on
  open ground).
No retired props anywhere (Maypole/Sundial/PennantLine/PottedTree/
topiary are HOLES); hedges only where a gardener would kneel.

## THE UNDERCROFT REVOICED (Phase 5)

**Rect { x:-344, y:520, w:96, h:64 } → { w:128, h:96 }** — origin
fixed, growth east+south into solid dark-band rock (nothing there
but the default cave; the Low Hall sits 400 tiles east). Every
portal coupling untouched. The west→east story keeps its spine and
every chamber gains ROOM — wider vaults, longer galleries, real
negative dark between lights (compression was the complaint; air is
the answer):
- **The Landing** becomes the gatehouse of the deep: the guild's
  toll desk, the lamp-oil store, the sweeps' closet — the swept
  spine starts HERE and you can see the broom that does it.
- **The Deep Market**: the five stamped stalls become AUTHORED
  counters — the ore-broker's weighing floor (HangingScale +
  IngotRack), the lamp-oil seller, the cave-fish keep-pool, the
  curio stall with its honest lies. The swept-floor mystery stays;
  ONE broom leans where no broom should be (Mab's people; never
  said aloud).
- **THE MASONS' MEMORIAL**: the sealed years made walkable — the
  name-wall cut in stone, the candle row, and one fresh candle
  nobody admits to lighting (the Silent Terrace's twin thread).
- **The galleries stretch**: TimberBrace rhythm at the ore faces,
  the WallChains haulage line with its winch head, longer dark
  between the braziers the guild feeds and the ones it doesn't.
- **The kobold front grows a real war-mouth**: the guild's
  abandoned barricade at the rubble line (SpikeBarrier, the cold
  watch-brazier that is NEVER lit past the line), the warren's
  smell of occupation deepened with the warren shelf.
- **THE FLOODED GALLERY** (new, off the cistern): the working the
  spring took back — plank walks over black water, drip pools, and
  a chest you can SEE under the water a room before you can reach
  it (desire drawn before route — dungeon design's oldest law).
- **THE DEEP CHAPEL** (new): the masons' shrine — CandleShrine ring
  under a GrandPillar pair, the quiet room the guild prayed in
  before shifts. Sella's flame has a sister below; the pilgrim way
  has a bottom step nobody talks about.

## THE PEOPLE (Phase 6)

The survey's verdict stands: the existing 64-soul cast and its
dialogue are HIGH CRAFT (distinct cadences, a live flag web, real
quest chains). Nothing working is rewritten. The People phase adds
the missing half and threads it into the web:

**New named (the Vale):** miller_brant, baker_hedda (night shift —
awake when the city sleeps, the best gossip in town), taverner_ulf
(the Last Climb), keeper_ronnaug (the Delvers' Rest), potter_signe,
chandler_wick (dips the shrine's candles — Sella's supplier, the
pilgrim way's bottom link), cobbler_finn, wainwright_torvald,
hostelkeeper_maeve, gravekeeper_aldous (knows about the candles;
says nothing), fisher_brigga + fisher_holm (the Kingshore pair —
one of them trades words with the skral), bathkeeper_una,
guildmaster_soren (the Masons' Guild — keeper of the sealed book),
monger_petya + monger_lucan (wet market), sergeant_varn (the lower
watch's voice at the Vale Gate), courier_pip (the urchin who runs
the whole city's errands — a town-loop routine that touches every
district, the player's live tour guide).

**Pooled:** vale_watch x6 (Vale Gate pair + rota, lake gate, fair
green, market beat), pilgrims x3 (the hostel-to-shrine walk made
visible), carters x2 (wagon yard), bath/laundry servant.

**The existing cast gets HOMES**: Grettir, Petra, Koll, Balla, and
the trades' evening routines re-thread — down the stair at shift's
end, a drink at the Rest or the Climb, a bed with a door. The city
finally SLEEPS somewhere, and dawn walks it back up the stair. The
watch rotas extend to the Vale Gate (hot bunks at the wardpost).

**New threads woven into the web** (extend, never break):
- THE SEALED BOOK: soren's guildhall holds the unmatched count;
  gates on grettir_word; pays into the brothers-tools chain and
  gives names_for_the_stone its surface echo.
- THE TWO CANDLES: aldous's lit candles on the Silent Terrace +
  the memorial's fresh candle below — one hand, never named; the
  observant player assembles it (environment first, one dialogue
  whisper each, no quest banner).
- THE BOTTOM OF THE WAY: wick's candles → the hostel → the
  WayShrine stations → Sella — embers_of_the_shrine gains a lower
  rung.
- THE SHORE ACCORD: brigga/holm and the croakwater skral — a
  careful-distance thread (the banks get their people; the city
  learns to share a lake).
- BREAD AND SHIFTS: hedda's night ovens ↔ signy's cookhouse ↔
  ansgar's four hundred meals — the feeding of a capital as a
  visible, walkable economy.

**Dialogue bar**: the established one — clear modern English,
character-first information, no purple, hub ≤4 choices, node ≤480
chars, voice: slugs + VOICE.md cards (want/wound/quirk/cadence) for
every named throat. Shops: hedda_loaves, ulf_board, ronnaug_board,
signe_ware, wick_lights, finn_soles, maeve_beds, brigga_catch,
vale market stock. Trainer-shop debts: none owed (all schools
housed); the potter/chandler/cobbler sell goods, not lessons.

## DRESSING DOCTRINE (all phases)

- Every prop EARNED by the fiction; RESTRAINT IS CURATION; ONE of
  any landmark piece per district; seat-spacing law; lone-barrel
  law; forage-grows-where-forage-grows.
- District dyes: Crown crimson (madder), Lantern Row weld/mulberry,
  gate market + wet market ochre, the Vale undyed linen with ONE
  color on fair days; BannerCrown/Moon only where the Crown stands.
- WALL-SHADOW law (south/east/west aprons only), POLE-NEEDS-SKY,
  A LINE PROP NEEDS CLEAR AIR, statues off rail rows.
- PRE-VALIDATE LAW before every placement batch: probe tool + BFS
  door/reach + routine-waypoint sweep (Amberford's law; it catches
  the seals eyes miss).
- Streets ≥2 clear walking tiles beside any prop line; ≥3-tile gaps
  between free-standing structures; sealed-pocket law on every
  through-row; the hem fringe stays wild (the walls are the edge of
  town, not the edge of the world).

## LIMITS (a capital is still not everything)

No field crops (Amberford feeds it); no sawmill trade (Pinewatch's
living); no chapel (the shrine is a flame, not a pew; the Deep
Chapel is a memory, not a parish); the Rookery stays tolerated and
UNTOUCHED (one lamp added anywhere near it is a failed review);
livestock = the rams + the fishers' catch. The Vale is poorer than
the High City ON PURPOSE — mud lanes off the High Street, smaller
windows, no marble. The wealth gradient IS the storytelling.

## PHASES

1. **THE PLAN** — this document. (commit)
2. **THE GROUND GROWS** — geography (rect, road tail, waystation,
   massif shoulder), danger/faction/audio anchors, silverfall.ts
   south canvas: terrain, outer curtain, Vale Gate, river + lake
   shore, street skeleton, bridges, district pads; pin updates; all
   suites green. (commit)
3. **THE VALE RISES** — every lower-town district built bespoke:
   buildings tile-by-tile, streets-first law, room intent, signs;
   the graveyard shelf; the pilgrim way. (commit)
4. **THE HIGH CITY KEEPS ITS DAY** — the dressing pass over the
   existing districts, district dialects, PRE-VALIDATE sweep.
   (commit)
5. **THE UNDERCROFT REVOICED** — rect growth + the re-breathed
   chambers + the two new rooms + authored market. (commit)
6. **THE PEOPLE OF THE VALE** — cast, homes, routines, dialogues,
   shops, VOICE cards, flag threads. (commit)
7. **THE WALK** — live rig at gameplay zoom, every district
   screenshot-audited against the curation standard, fixes, memory.
   (commit)

## AS-BUILT LEDGER

- **Phase 1 THE PLAN** a41e3ae4 — this document.
- **Phase 2 THE GROUND GROWS** — as designed, with these build-truths:
  - SILVERFALL_RECT h 128 → 256; all local coords and world
    couplings survived verbatim (origin fixed, growth pure south).
  - high_road tail re-threaded: after (-336,-202) the DESCENT leg
    (-342,-172) (-346,-140) (-350,-110) rounds the SE corner at
    (-352,-80) and walks the west miles (-380,-76) (-412,-76)
    (-436,-80) to the Vale Gate mouth (-448,-89). All waypoints
    ≥9 tiles off the rect except the endpoint (route law: end
    within rect±1).
  - spineshelf_rest → (-408,-64), cell (-4,-1) (its old cell (-4,-2)
    is entirely inside the city now). SPINEWALL_SOUTH → (-330,-40).
  - veil_den cell [-3,-1] → [-2,-1]: the re-seated Spinewall
    blanketed its old cell; the den wanted deep wood anyway.
  - croakwater_banks cell [-5,-1] → [-6,-2], PROBED (a scratch
    poiForCell sweep): the rect's basin damp took the south bank's
    water and the mere's heart drowns the west cell's own center —
    [-6,-2] is the first honest bank beyond the far shore.
    [-6,-1] also composes if it ever needs to move again.
  - Anchors: danger (-448,-220) safeR 124 haven; crown faction
    follows; audio seat (-448,-220) full 72 fade 104.
  - THE VALE RIVER starts at y108 — one row shy of the pool rim, so
    the quay's pinned FishingSpot at (99,107) keeps its cast.
  - THE MINERS' POSTERN (x32-33, y112, GateGarrison pair): the old
    scree rows y111/y113 needed explicit clearing (path y108-111,
    stone threshold y113) or the scree seals the new door — the
    scree loops run before the curtain fills.
  - Vale Gate sign stands at (82,240): (94,234) was inside the east
    bastion fill and sign() lawfully refused it.
  - Pins: Ramp 39→45 (the Silent Terrace's two flights),
    GateGarrison 22→29 (+5 Vale Gate, +2 miners' postern), road
    mouth rows 126/127→254/255, BFS adds seven Vale reach pins +
    keeps the Silver Gate mouth at 127.
  - prove:pets Silverfall road-soak stop re-based (-323,-120) →
    (-483,-240) — it was one epoch stale and outside the zone.
  - Gates: content 514/514, client 614/614, server 492/493 (the one
    red is fromProc XP — pre-existing neighbor churn, fails without
    these changes), five-package tsc clean.
- **Phase 3 THE VALE RISES** — every lower-town district built
  bespoke, as designed, with these build-truths:
  - 23 structures: the Last Climb (bar, dice table, settle nook),
    the wet market (2 stalls + slab/stands/block/scale under ochre),
    the Bakehouse (oven pair, the baker's dawn cot), Garland Row
    (4 cottages + hedge fronts x46-78 y177 with the baker's wicket),
    the Delvers' Terrace (2 stone cots, keeper's cottage, the
    Delvers' Rest, the Bath House with its led-spring WallFountain,
    the Masons' Guildhall with the SEALED BOOK lectern + memorial
    CandleShrine pair), the Silent Terrace (10 standing stones, 4
    yews, 3 kept flames, the faceless Watcher, ONE bench, lych
    gate), the Kingshore (quay planks, 2 fisher houses, boat shed
    lined on the young wall, skiffs/moorings/2 casts), the Fairstead
    (statue parity pair at -458/-453, meeting oak, EMPTY on
    purpose), the Vale Ward (hot bunks), the King's Mill + granary
    pair + weigh yard, the craft commons (Crockery/Chandlery/
    Cobbler's, stepped rooflines, the potter's mound between), the
    Pilgrim's Rest (4 beds + WayfarersRest outside), the wagon yard
    (rails/troughs/carts/campfire + wainwright's shed).
  - The Pilgrim's Way moved x138-140 → x146-148 under the crags
    (its first draft ran THROUGH the cobbler's parcel — caught on
    paper); its three WayShrine stations stand at x150.
  - Wall-shadow law enforced at authoring time: the Rest's
    grindstone/toolrack moved off y175 (the guildhall's north face
    would swallow them), the Bakehouse sign lives on the WEST flank
    (its door faces north into the market — the one direction a
    sign cannot).
  - The lane keeps two clear: the herb planter came off the garland
    lane's row.
  - New pins: THE VALE KEEPS SHOP block (BreadOven/Grindstone/
    wheel/kiln/CandleRack/CobblersBench/TapCask/GameTable/
    WayShrine 3/GuardianStatue 3/CandleShrine 5/skiffs/docks/
    scales/troughs/WallFountain/Hedge ≥20/wicket).
  - content 514/514 first run after the build — the builder's own
    reachability, doorway, sign, and stall laws all passed on the
    paper-checked coordinates; content tsc clean.
- **Phase 4 THE HIGH CITY KEEPS ITS DAY** — ~40 placements across
  every existing district, UPGRADE BEFORE ADD wherever the old
  build used a placeholder:
  - Castle: solar CandleStand + chamber/hall CloakStands, drill-butt
    TargetDummy pair, the kitchens' one broom by the service door
    (the interior was full — two attempted adds sealed pockets and
    DIED to the builder's own law; restraint won).
  - Court: TownBell (the sign's 'first bell' promise kept),
    NoticeBoard beside the crier's lectern, the clerks' lunch
    GameTable.
  - Bank/Guildhall/Charts: four Table→ScribesDesk upgrades + the
    bridgehead charter NoticeBoard; assay scales Table→HangingScale.
  - Emberway: forge Basin→QuenchTrough x2 + SmithBellows +
    IngotRack + Grindstone; smelter ingot crate→IngotRack; mine
    barrel→WaterCask; masons' Wheelbarrow.
  - Timberway: seasoned-timber crates→LumberRack x2, commission
    crate→DisplayTable, FletchersBench beside the carving bench
    (CarvingBench pin kept at 3), cookhouse jars+baskets, dispensary
    HerbRack, mess barrel→TapCask.
  - Lantern Row: the four lamps→StreetLantern (the name literal),
    Flagon cellar barrel→TapCask + BarrelStack + door CloakStand,
    Cloth Hall wool crate→ClothBolts + TailorsDummy, Charts
    ScribesDesk + late-hours CandleStand.
  - Gatefront: caravanserai Basin→WaterTrough x3 + HitchingPost,
    wardhouse SpearRack + WaterCask, gate market FishmongerSlab +
    BasketStack ('fish, ore, arrivals' — the fish delivered).
  - The Rookery UNTOUCHED; the Silver Shrine ring stays BARE (the
    Quiet Stones lesson) — zero adds at either.
  - PRE-VALIDATE ran as a real sweep: a routine-waypoint probe over
    all 68 placements' schedules against the built grid — 44 hits,
    ALL pre-existing sit/work station addressing, ZERO on this
    pass's tiles; the two sealed pockets the builder caught were
    both this pass's and both fixed by deletion, not relocation.
  - content 514/514.
- **Phase 5 THE UNDERCROFT REVOICED** — rect 96x64 → 128x96 (origin
  fixed, both portals untouched, most of the new claim deliberately
  SOLID — negative dark is a material). Build-truths:
  - THE LONG HAULAGE: the deep walk continues east past the starfall
    (drift x91-107, webs + fossil, no braziers — unswept=dark) to
    THE WINCH HEAD (chains, the cart that never went up, the looted
    winch pay) and THE EAST DOOR — the guild's second seal, never
    reopened, left for a future epic on purpose.
  - THE DROWNED WORKING: south of the cistern — the flood rim, the
    black heart, and the islet chest VISIBLE from the north rim with
    the dry approach the long way round (planks trimmed to the
    chamber floor after a paper check; its sign moved one row south
    off solid rock — the one builder catch of the phase, which
    cascaded into all four red tests from a single throw).
  - THE DEEP CHAPEL + THE MEMORIAL: GrandPillar pair, four chapel
    flames + three memorial flames over the sign 'THE COUNT'
    (thirty-one down, thirty out) — zero spawns; the quiet is
    load-bearing. The chapel-to-drowned west link loops the deep.
  - THE BLACKREACH: the warren's unswept back door — shrooms,
    beetles, the chest the warren hides from the warren.
  - The market keeps its five stalls (the pin held; the keepers'
    posts stay honest) and the TRADES arrive around them: Varga's
    IngotRack + scale, the KeepPool in the spring's cold, the
    curio DisplayTable — and ONE BroomAndPail leaning where no
    broom should be. The Landing gains the guild's toll counter.
  - The war-mouth: one SpikeBarrier at the rubble line — the war
    the guild walked away from.
  - Kobold count stays EXACTLY 8, spider stays 1 (restraint); bats
    +3 (drowned ceiling), beetles +3 (Blackreach).
  - New pins: WallChains ≥3, GrandPillar =2, CandleShrine =9,
    SpikeBarrier =1, Dock ≥6, KeepPool =1, MineCart ≥1,
    LootedChest ≥2, chest tiers up one each; width/height re-pinned.
  - content 514/514.
- **Phase 6 THE PEOPLE OF THE VALE** — 29 placements (64 → 93):
  18 named + vale_watch x6 (gate rota pair hot-bunking the ward's
  second bunk, market beat, shore, yard, threshold) + 3 pilgrims
  (two resting, one walking the way — its route caps at the Silver
  Gate: the routine offset law's ±128 said the last league belongs
  to the flame) + 2 carters. Build-truths:
  - 18 dialogue trees at the house bar; five threads seated: THE
    SEALED BOOK (soren_charter's count node gates on grettir_word,
    sets soren_word), THE TWO CANDLES (aldous_terrace's below node
    gates on dlg:coppin_reeve, sets aldous_word — write the
    stumble), THE BOTTOM OF THE WAY (wick_taper's blessed node
    gates on sella_blessed, one-shot wick_law), THE SHORE ACCORD
    (brigga's kelp-string payment, sets brigga_wave), BREAD AND
    SHIFTS (hedda's treaty ledger of who eats when).
  - Grettir's evenings re-thread to the Delvers' Rest corner chair
    THROUGH the miners' postern; Petra gets cot two's bed. The rest
    of the standing cast is untouched.
  - 8 Vale shops, every price undercutting the terraces (the wealth
    gradient is the storytelling); Signe/Wick/Finn trade in scenery
    and story, not stock (no crockery/candle/boot items exist — the
    Tove precedent, kept honest).
  - Schema lessons paid in the open: set/requires live on CHOICES;
    examine caps at 200 chars (four trimmed); combat is
    disposition:neutral + protection:invulnerable + full stats;
    routine offsets cap at ±128. One period-truth catch: the
    sergeant's 'coffee' became 'the kettle'.
  - New-cast waypoint sweep CLEAN after six fixes (both gate
    sentries stood inside bastion masonry; the market beat stood on
    the fish slab; the taverner's morning barrel; the wainwright's
    own table; the deep-fisher posted in open water).
  - VOICE.md gains the Falls Vale section: 18 cards + the pooled
    card, want/wound/quirk/cadence.
  - Pins: fallActors 64→93 (both sites), 18 slugs added, vale_watch
    =6. content 514/514.
- **Phase 7 THE WALK** — lane 16 (:8860/:5260, DB arx_vale16, fresh
  planes-era migration 1→36, vite.config.rig16.ts checked in), 19
  screenshots at gameplay zoom (scratchpad shots/v*.jpeg),
  120-121fps at every stop, zero console errors. Verdicts:
  - The Vale Gate reads DEFENDED: bastions, both sentries + Varn
    posted, the ward interior legible, the SILVERFALL discovery
    toast firing on the grown rect.
  - The Vale Bridge is a set piece (parapet braziers all four
    banks); the river reads wide and real; the Mill Bridge shows
    upstream from it.
  - The wet market was ALIVE unprompted: Petya at her slab, Lucan
    mid-square, Signe on her lunch wander, the watch beat standing,
    Hedda at her ovens — the routine layer executing as authored.
  - The Silent Terrace's emptiness works; the Kingshore's young
    wall dies into the lake on camera (the mole law reads); the
    Millward shows Brant between his stones with Pip crossing the
    lane mid-loop; night on the High Street pools lamplight the
    length of the spine.
  - Curation findings: NONE blocking. The paper pre-validation
    (clearance sweeps, wall-shadow checks, waypoint probes) caught
    everything before the rig did — the first dressing pass in the
    project's history to walk clean on the first tour.
  - The Undercroft crossing itself was proven live by the planes
    epic (its commit walked this exact stair); the revoice's wings
    are BFS-pinned and portal-pinned by content tests.

THE EPIC IS COMPLETE. Seven phases, seven commits:
a41e3ae4 plan / 4e12c3ca ground / ebcb9932 Vale / 13f53cd6 High
City / fab1a0ee Undercroft / 3358b26d People / (this) Walk.

## DEBTS (tracked, deliberate)
- VO for the Vale's eighteen throats (clip ledger slugs are wired).
- Fair-day content for the Fairstead (the empty green begs one
  festival event; the poles stand bare on purpose until then).
- The Rookery↔memorial fresh-candle payoff as a real quest (the
  aldous_word / soren_word flags stand ready).
- Croakwater-facing content on the far shore (brigga_wave is the
  hook); the reed mouth could someday hold a skral trading stone.
- The Kingshore's procedural far-shore blend deserves one look on
  the production world after deploy (edge-harmony vs basin damp).
- Deploy note: prod re-shape needs db:refresh --content --world;
  sweep built_tiles inside the new rows if collisions surface;
  already-discovered characters keep the old map-marker center.

# EVENFALL — the city of the old folk in the Everwood

*A world-authoring epic for the Dawnlands: the EIGHTH town, far west, for
players level 35-50 — the first non-human town in the game, and the payoff
of THE OLD BLOOD canon the Kingsdelf epic planted. Read
`packages/content/src/geography.ts`, `docs/kingsdelf-plan.md`,
`docs/hartfell-plan.md`, `docs/elven-decor-plan.md`, and the
`dawnlands-map-master-plan` + `map-curation-standard` + `content-boundaries`
memories before touching anything here. Every coordinate below is DRAFT
until the mapscan/routecheck rigs have profiled the real ground (the
Pinereach law: author against the ground that exists, not against
arithmetic).*

**THE STANDING GATE: Phases 4+ are BLOCKED until THE FAIR HOUSE FURNISHED
(docs/elven-decor-plan.md, props 317-336) lands in a commit — enum, client
painters, lights, debris, the whole registration spine. A concurrent
session owns that kit. Phases 1-3 touch no prop and may ship first. Nothing
in this epic's commits may depend on the kit's uncommitted hunks (the
shared-tree law).**

---

## 1. The brief

An elven city, deep in a great western wood, for characters in the level
35-50 bracket — the exact gap the town ladder leaves open (Hartfell tops
out at 35, Kingsdelf starts at 50, and tier-5 country serves 32-48
natively; the danger table hosts this town without a single new dial).
Luxurious, premium, artisan to the bone: the finest craftsmen in the
Dawnlands, mithril fittings and moonglass light, everything swept and
sprung and grown rather than nailed. Nestled away and genuinely hard to
reach — the far west has no road, no site, and no landform today; the
journey IS the introduction. Rich with exploration, deep with story, built
around natural water and living trees. The most premium city beyond the
capital: the place you want to go if you're an elf.

---

## 2. The idea

**Evenfall is where the old folk went when they went quiet — because it is
where they were before they ever spoke up.**

The canon already says it (Veyle, the Focus House, verbatim): *"I am of
the old folk, the people who raised the realm before the roads... Most of
us thinned into your bloodlines ages ago... A few of us stayed whole. I am
a few of a few."* And: *"The old folk learned quiet the year the mountain
woke, and we are excellent students."* And: *"My people built the old
realm's lights. I am only finishing the shift."*

This epic gives those sentences an address. Before the roads, before the
Old Crown, before any human count began, the old folk kept one city in the
great wood of the far west — the wood humans call **the Everwood**,
because it does not thin and does not burn and no one who walked into it
ever brought back a map. The adventurous few went east in the deep past
and RAISED the old realm: taught it stonework, lit its lamps, gave it the
sealing-craft the Masons' Guild still uses without knowing whose hands
first shaped it. Those emissaries thinned into human bloodlines over the
long centuries — Annik's moonpale, Denna's ears, the Silverfall Line's
color — until the Brandfall, a hundred and fifty years ago, when the
mountain woke and the old folk who were still whole did the old folk
thing: they learned quiet, and they walked home. West.

**Evenfall never fell, never burned, never emptied.** It has stood in the
Everwood for longer than the old tongue has words it will share, and it
has been CLOSED for a hundred and fifty years — not walled (the wood is
the wall), just quiet. The Waykeepers' lamps stop at the Hoargate fork.
The waystones pick it up from there, and the waystones do not answer to
the road-faith. What changed, and why the gate opens NOW, is the epic's
quest spine: Solvei's letters, Veyle's question, and a king who has
decided that the thinned blood coming up the trail is not a stranger
knocking. It is family coming home.

**The one image: the Evenhall between the twin falls.** The river rises
from a spring on the high terrace, splits around the king's hall, and goes
down the terraces in two white curtains — the locals call the whole
descent **the Moonstair**, because on a clear night the moon walks down it
step by step. The hall stands between the falls with the Everflame burning
silver-white through its arch, cold light on falling water, and the first
sight of it from the gate court below is the postcard the whole city is
composed around. (The waterfall render system is SHIPPED — spillAt
curtains, churn, falls audio. This image is buildable today; the
FOOT-WATER LAW test file comes with it.)

**The trade: the finest, never the most.** Evenfall does not export bulk
anything. It makes the best bows in the world (and the game's bow economy
is literally unstaffed — see §6), moonpale silk, moonglass lenses and
vessels, mithril fittings and leaf-blades, and inscriptions the Arcanum
cannot match. It buys nothing it cannot gather, because the wood provides
— no tilled field inside the hem, no penned beast, no sawpit. The elves
do not fell living wood; silverbark is taken from what the wood gives and
every plank of it is accounted like coin.

**The trouble, braided:**

- **The question that was answered with an exile.** Veyle asked the
  Arcanum what their first focus was made from, and they sent her away.
  The answer lives in Evenfall, in the Inscriber's house, and it is shown,
  not told: *the first focus was cut from a branch of the Heartwood —
  given, not taken — and the Arcanum has forgotten it was a gift.* What
  the Heartwood is, and why a gift from it mattered that much, is the
  door the NEXT epic knocks on (§4, the reserved rect).
- **The gate that opens slowly.** The Even Court did not vote to open;
  the king decided, and not everyone in the city thinks the Evenking is
  right. The sentinels obey and disagree. The city a player walks is
  courteous, breathtaking, and quietly arguing about them.
- **The light and the lamp.** Every road lamp in the Dawnlands descends
  from craft Veyle's people taught — the road-faith's mother-flame is a
  human hearth lit in an old folk pattern, and nobody alive on the roads
  knows it. The Everflame is older than the shrine, older than the roads,
  and it does not burn. Sella and Edda's faith meeting the thing their
  faith forgot is a crumb delivered across a dozen mouths, some of them
  disagreeing (the lore-is-crumbs law).

---

## 3. Ground truth (audited 2026-08-14 — three sweeps, working tree)

**Canon this epic pays off (verbatim, shipped):**
- Veyle `veyle_focus.json`: the old folk raised the realm before the
  roads; thinned into bloodlines; "the coast kept some. The crown of
  Silverfall keeps more than it admits"; "My people lit the old realm's
  lamps"; watched the Processional built.
- Annik `annik_names.json`: "The old blood, thinned... Veyle at the Focus
  House has it whole, ears and years and all."
- Denna `denna_quay.json`: "The coast kept the ears and lost the rest...
  Veyle says I am a word the old language left behind." Plus the
  stormpearl instruction in `q_what_the_net_held_veyle.json`: "My people
  used them to listen to deep water."
- King Aeriex bark: "The moonpale runs in the Line. My grandmother said
  the mountain keeps our color so we can never deny the kinship."
- look.ts: Elf heritage preset SHIPPED (skins [12,0,1,2], ears 2,
  "Upswept ears and grove-quiet steps"); EAR_STYLES [Round, Pointed,
  Upswept]; skin 12 = Moonpale. Upswept ears today = Veyle + Solvei only.
  Heritage is cosmetic BY LAW (look.ts header) — no stats, no flags.
- One contradiction to reconcile, never break: Ferrun says the old realm
  "never found" the mithril seam (Kingsdelf's), while elven canon says
  the old folk "opened the door to mithril." Resolution this epic canonizes:
  the old folk knew mithril from their OWN small vein in the west long
  before the delf; Kingsdelf's great seam is a different, deeper thing.
  Evenfall works mithril as jewelers work gold — fittings, ferrules,
  leaf-blades — never as ore-by-the-cart.

**Mechanics this epic stands on:**
- Danger: far west = base 5 saturated (everything west of x≈-350; sampled
  block around (-700,-200): 68% tier 5 / 32% tier 4, npcLevel 32-48).
  The town anchors as the SIXTH HAVEN — a settled anchor out west would
  re-origin the whole map's band march (the haven law). No new dread in
  this epic; tier 6 west belongs to the Heartwood's future.
- The ladder gap 35→50 is real; tier 5 serves it natively. Gazetteer
  `country: 5`.
- Routes: nothing west of x=-436. Fork the new trail off the Hoargate
  Road at an EXACT existing waypoint near (-306,-258) (the Sparway
  precedent). Route endpoints must land in planned rects (geography.test);
  short-span water law applies; every waypoint y<400.
- Builder laws: 2-tile border-flat apron; auto-fence rims only overwrite
  FENCEABLE tiles (NO tree, water, or prop on a terrace rim — plan a bare
  gutter); stairs south-facing with level flanks; validateReachable
  floods from spawn crossing elevation only at ramps; signs validate
  everywhere. Waterfalls: curtain/churn/audio shipped; copy
  silverfall.test.ts foot-water idiom.
- Tiles available today: full water family + fishing ladder (salmon 45,
  glimmer shoal 60 fit the band), Tree/Oak/Willow/Yew/Pine + saplings,
  ArchStone, PillarStone, lamps/braziers (WRONG VOICE for elves — cool
  light only, the kit's law), banners/pennants/trellises (dye bands),
  Loom, CarvingBench, EnchantingTable, Well, Basin, awnings. NO moss
  tile, NO giant tree, NO generic fountain/statue — the ONLY
  fountain/statue/waystone/chimes/harp in the game are the elven kit's.
- THE FAIR HOUSE FURNISHED (tiles 317-336) is shared-enum only in the
  working tree; ALL client art is unbuilt and owned by the concurrent
  session. THE STANDING GATE above governs.
- Trainers legally stop at recipe level 39 (compile.ts band law). Elven
  masters therefore teach the 11-39 band like anyone else and SELL the
  high shelf as recipe scrolls (the Last Lamp / legacy-scroll precedent)
  — the first source of the woodworking 40-47 shelf that isn't a drop.
- Registration spine (all eight stations): geography rect+planned(apron) +
  veil landform + route + haven anchor row + server builtinZones + client
  zoneArt + content barrel + audio TOWNS 8th row (or the streets play
  danger music) + gazetteer + trainer directory + faction + content.test
  suites A/B (+foot-water file). tracks.test pins "all seven towns" —
  widen to eight.

---

## 4. The land (Phase 2 — prop-independent)

All coordinates DRAFT until routecheck/mapscan profiling.

- **EVERWOOD veil**: `{ x: -696, y: -176, r: 190 }` in
  `AUTHORED_PLAN.veils` — the first landform west of the Silverspine.
  Moisture lift makes worldgen deal the great wood honestly (oak, willow,
  yew at veil density); the Everwood should read OLDER and TALLER than
  the Thornveil the moment you cross into it. Yew presence matters: yew
  is the bow-wood, and the wild Everwood is where the game's yew story
  lives.
- **EVENFALL_RECT**: `{ x: -760, y: -232, w: 160, h: 112 }`, center
  (-680,-176) — between capital (176×128) and county town (128×96) in
  size, as befits "the most premium city beyond the capital." Aproned
  (plateau-suppressed flat canvas; the city authors its own terraces
  inside). ~655 tiles from Dawnmead's hearth; past the Silverspine's
  west skirt (massif reach ends ≈ x -530), clear of the Kingswater.
- **HEARTWOOD_RECT**: `{ x: -880, y: -352, w: 96, h: 64 }` — ground
  RESERVED, not built (the Rimeward law). The deep grove the city keeps,
  the source of the branch the first focus was cut from, the door the
  future delve epic gets to knock on. Deliberately NOT aproned: the wood
  keeps its own counsel until somebody is invited.
- **Route — the EVENWAY** (`evenway`, kind: 'trail'): forks off the
  Hoargate Road at an exact waypoint near (-306,-258), winds west along
  the Silverspine's southern skirt, north of the Kingswater, and lands at
  Evenfall's east gate (≈ world (-600,-176)). ~350 wandered tiles of
  tier-5 country with NO lamps — the one approach in the game where the
  road-faith's light gives out and something older takes over. It is a
  trail by KIND (Dirt, narrow: "the wood does not pave") but tended by
  STORY — the waystone dressing along it is Phase 4 work (kit-gated),
  placed as authored props near the carve, never on it.
- **Trail — the HEARTWOOD WALK** (`heartwood_walk`, kind: 'trail'):
  city north wicket → HEARTWOOD_RECT (the cairn_path precedent, short,
  ends at the reserved door).
- **Haven anchor**: `{ x: -680, y: -176, safeR: 64, haven: true }` —
  sixth haven. Relief grades the walk-out exactly like Hartfell: tier 3
  at the hem, 4 a stone's throw on, 5 past that. Tier 0 inside.
- **Gazetteer**: id `evenfall`, country 5. Epithet draft: "The city the
  old folk kept." Line draft: "The wood does not thin, the light does
  not burn, and the gate has been closed for a hundred and fifty years.
  It is open now. Nobody outside knows why." (Wordsmith at build time;
  dash ban applies.)
- **Audio**: 8th TOWNS row `{ x: -680, y: -176, full: 44, fade: 72 }`;
  widen tracks.test's seven-towns pin to eight.
- **Authored wild sites** (Phase 3): see §8.

---

## 5. The city (Phase 4 — GATED on the kit)

**Design stance.** No curtain wall — the first town in the game without
one, and the loudest single statement the layout makes: the wood is the
wall. The city is a series of GROVES with buildings in them, not
buildings with trees between them. Streets are Path that curves (the
L-shaped `path()` primitive laid in short offset segments reads as a
curve at gameplay zoom); every district holds the GROVE APRON (trees ≥2
off every wall/street/fence) and the curation standard's ≥3-4 tile
breathing gaps. The 45° diagonal budget is spent on exactly four
statements: the Evenhall's prow, the Moonwell Court's crescent, the
Evengate arch shoulders, and the Songhouse apse. Everything else is
honest and generous.

**Terrain skeleton** (nested raises, Silverfall pattern; all local):
west half climbs L1→L2→L3; east half stays L0. The spring rises on L3,
splits at the Evenhall, and the twin races fall terrace by terrace —
every lip obeying the auto-fence and foot-water laws (feed row open above
each lip, plunge basin below, water never ON a rim tile) — joining into
one stream on L1 that widens into **the Evenmere** on L0 and sinks into
reed marsh well inside the south hem (the Amberford reed-sink law: no
water at the zone border, no procgen seam). Stairs: wide south-facing
flights on one axis so the whole climb reads as one processional ascent —
the human towns have the Silver Stair; Evenfall's flights RENDER as the
same arched masonry and the story calls them **the Moonstair's dry twin**.

**Districts** (draft locals; every building bespoke, tile-by-tile, one
job per room, furniture proving it):

- **L0 — THE EVENGATE.** The trail lands mid-east-edge; twin ArchStone
  gates with waystone pairs (kit) and NO gatehouse — sentinel arbors
  instead (open-sided, swept roofs). **The Outward House**: the
  travelers' inn, the one building raised in a hundred and fifty years,
  where outsiders historically stopped — bar, guest wing, and a wall of
  small courtesies (this is where the town's ONE wit lives, §7). Gate
  court with the first postcard sightline up the terraces to the
  Evenhall between the falls (compose the raises so this line is open —
  the ONE IMAGE is a camera fact, not a lore fact). **The Evenmere**:
  shore walk, ElvenFountain court, salmon run + glimmer shoal, no docks
  (elves do not launch boats for fish they can ask the shallows for —
  fishing spots sit on a stone shore step). The reed marsh south.
- **L1 — THE FAIR COURT.** The artisan terrace, the economic heart:
  **the Bowyer's House** (bow lane, §6 — yew racks, CarvingBench line,
  ElvenArmsRack gallery), **the Silk Hall** (ElvenLoom pair + dye and
  silver-thread benches; moonpale silk lane), **the Moonglass Hall**
  (Furnace reads wrong — moonglass is WORKED COLD in the story; benches,
  Basin quench, finished-lens gallery), **the Mithril Forge**
  (MithrilAnvil on its carved root, the ONE warm-lit interior in the
  city and remarked upon as such), and **the Gallery** — the market: two
  facing colonnade walks with elven planters and low counters, NOT
  human MarketStalls (the kit + existing counters; stall stamps are the
  one template the curation law tolerates and here even they are
  retired).
- **L2 — THE MOONWELL COURT.** The civic heart, the crescent: the
  **Moonwell** and the **Everflame** paired at the crescent's foci —
  water that glows and flame that doesn't burn, the two oldest things a
  player can stand between. **The Keeping** (the bank: 2 Vault + 1
  BankChest + the Keeper — elves keep, they do not count; smallest,
  most beautiful bank in the game), **the Songhouse** (Loresinger, harp
  + chimes, the apse diagonal), **the Stillroom** (herbalist; the
  healers' house), **the Inscriber's House** (EnchantingTable — the
  THIRD in the Dawnlands and the oldest by every count that matters;
  tier 3-4 enchant stock, and the first-focus answer on its rear wall,
  shown to those the quest flags).
- **L3 — THE EVENHALL.** The king's hall between the twin falls: prow
  toward the terraces, the Everflame's twin (or the SAME flame — the
  crumbs disagree, on purpose) behind the arch, feast floor, the quiet
  solar where Aldaren receives (thrones are not the elven register: two
  chairs, one table, a very long view). **The King's Grove**: the yew
  ring behind the hall. **The Warden's Roost**: Sylwen's sentinel hall,
  arms gallery, the muster floor. The high spring pool. The north
  wicket → Heartwood Walk.
- **Homes** thread every terrace — the elves live where they work's
  beauty can be seen, not in rows. Each named resident's house carries
  its owner's story in furniture (the room-intent law).

**Dressing**: the full kit (317-336) is the city's voice — lanterns on
the walks (cool light ONLY inside the hem; the Mithril Forge's warmth is
the composed exception), banners at the gates and hall, benches at every
view the composition wants a player to stop at, planters stitching
architecture to grove, statues as sentence-enders on axial sightlines,
chimes where the falls' wind would run. Plus the existing catalog where
voice-true (trellises, pennants, flower boxes, rugs — CarpetMoon exists
and was waiting for this town).

**Spawn**: the gate court, ≈ local (146,56) → the respawn hearth of the
west.

**Tests**: content.test suites A (census: exact Ramp count, Vault/
BankChest/EnchantingTable/fishing counts, kit-prop census, gate-mouth
tile-exactness, spawn, roster, round-trip WITH elev) + B (the walk: BFS
from spawn to every doorway + a ~30-landmark named table) + an
`evenfall.test.ts` carrying the FOOT-WATER LAW for both races, in the
silverfall.test.ts idiom. Desk rigs (zonerender/routecheck/routinecheck)
must be REBUILT in the session scratchpad — the old ones were never
committed (rebuild note: they pay for themselves within the first
district).

---

## 6. The economy (Phase 4-5)

**What Evenfall alone has:**

- **THE BOW LANE (the headline).** Bows above woodworking 45 are
  drop-only today; 24 of 29 archery weapons have NO recipe; Fletcher
  Haki in Silverfall has no shop. The Bowyer's House staffs the whole
  lane: trainer stock to the legal 39, recipe SCROLLS for the 40+ shelf
  (the legacy-scroll precedent), a handful of NEW bespoke elven bows
  extending woodworking 45→55 (recipes gated on elven materials so the
  lane is lived here, not exported wholesale), and bowstrings/arrows
  wares. Haki gets a dialogue crumb pointing west (his ears were never
  explained; now the town that would explain them exists — leave HIS
  choice unexplained, the let-them-be-people law).
- **THE SILK LANE.** Tailoring dead-ends at 30 — the lowest craft
  ceiling in the game beside leatherworking. The Silk Hall extends it
  30→50 with the moonpale weave (material chain from gathered fibre +
  moonbell, kept simple: one new intermediate, `moonpale_silk`).
- **THE INSCRIBER.** Enchanting's roster runs to 95 with only tiers 1-2
  sold anywhere. The Inscriber's House sells tier 3-4 workings and
  materials — the third table, the oldest art.
- **MITHRIL, THE ELVEN WAY.** Fittings, ferrules, leaf-blades: a small
  bespoke set of mithril-fitted pieces (weapon/jewelry-adjacent, NOT an
  armor line — none exists and none starts here), plus ONE modest
  RockMithril face in the high city (the Silverfall precedent) so the
  vein of the reconciliation canon (§3) literally exists.
- **THE TABLE OF THE WOOD.** Forage-and-fish provisioning (no crops):
  gathered-goods shop, the Stillroom's remedies, the Outward House's
  board.

**The limits (a town is not an end-all):** no farming, no livestock, no
stable, no sawmill and no lumber trade, no starsteel or bulk smithing,
no chapel, no beast trainer. The bank is small. Human coin spends fine;
the elves are courteous about it in a way that makes it clear coin is a
human enthusiasm.

**Trainer directory**: woodworking second-shelf row (Amberford keeps
first — the directory find() law), tailoring second shelf, enchanting
third shelf. The location-aware-directory debt (Kingsdelf ledger) gets
one town heavier; note it, don't fix it here.

---

## 7. The people (Phase 5 — ~22 souls)

**THE EVEN COURT (faction, id `evencourt`)**: the sixth roster entry.
Members: the named cast + pooled sentinels; enforcers: the Evenguard;
anchor: Evenfall. Oppose pairs: `evencourt|reavers` (poachers and
fellers; the Company has been probing the wood's hem for timber and
found its camps politely dismantled). With the Crown: NOT opposed —
something colder and stranger: kinship neither side will say first (the
Aeriex bark vs Veyle's "though I did not say so"). The Waykeepers stop
at the fork by AGREEMENT nobody wrote down.

**Named cast (draft — phonology of the shipped old blood: Veyle, Solvei,
Aeriex; soft, vowel-forward):**

- **Aldaren, the Evenking** — the first of the few, the oldest living
  thing a player has met. Decided to open the gate; carries the cost of
  every year of the quiet. The ONLY "..." throat in town (the
  Veyle-drift precedent: he loses decades mid-sentence and returns).
  Never frightened, never hurried, remembers the first Aeriex as "the
  foreman" the way you remember a promising apprentice.
- **Sylwen, Warden of the Wood** — heir, commands the Evenguard,
  disagrees with the opening and says so in exactly one place. Cadence:
  sentinel's report-speak grown over centuries; counts what moves in
  the wood the way Bryn counts drills.
- **Keeper Ilvane** (the Everflame) — tends the light that does not
  burn. The road-faith crumbs live here and in Sella/Edda's future
  lines: Ilvane calls the mother-flame "the youngest daughter."
- **Loresinger Maelis** (the Songhouse) — keeps the memory the way
  humans keep ledgers. Song fragments are lore crumbs; will not sing
  the Heartwood verse.
- **Aewyn** (the Bowyer's House) — the bow lane. Treats every stave as
  a decades-long acquaintance; sells to those the bow "would suit."
- **Myrren** (the Silk Hall) — the silk lane. Speaks in textures.
- **Selorne** (the Moonglass Hall) — glass worked cold; the patience
  register.
- **Faelar** (the Mithril Forge) — the one warm room; the closest thing
  the city has to a loud voice, which is not very.
- **Inscriber Vessa** (the Inscriber's House) — enchanting t3-4; keeper
  of the first-focus answer; Solvei's unmet correspondent-once-removed.
- **Elarin** (the Outward House) — the innkeep, the town's ONE
  spice-carrier: the elf who LIKES travelers, collects human idioms and
  uses them slightly wrong, wit dry as good vellum. Every player's
  first conversation and the town's whole welcome, on purpose.
- **Corwen** (provisioner) — thinned-blood human who walked west years
  ago and was let in; the bridge throat who answers what elves won't.
  Wound: what he gave up to stay. The gathered-goods shop.
- **Sentinel Serel** (the Evengate) — the gate captain; polite as a
  drawn bow.
- **Pooled**: Evenguard ×4 (invulnerable, mithril leaf-mail, longbows),
  Fair Court artisans ×3, grove wardens ×2.

All elves: skin 12, ears 2 (upswept = whole, the shipped marker), builds
and looks individually authored — no two silhouettes alike (rig-lab
audit before the walk). Corwen: pointed ears, human skin.

**Voice card block** (VOICE.md gains "### Evenfall — the city the old
folk kept"): shared register = the present tense of centuries. Elves do
not explain the wood, do not name-bomb (they ground every name with a
touch of amusement, as if introducing children), never hurry, and answer
the question UNDER the question at least once each. Spice: Elarin only.
"...": Aldaren only. Dash ban absolute; the old tongue appears ONLY as
things deliberately untranslated (the Veyle precedent: "There is a word
for that, in the old tongue, and I will not translate it").

**Flag web (extend, never break):** solvei letters → Vessa;
`the_count_stands` (Kingsdelf) acknowledged by Aldaren if set; Denna's
stormpearl thread gets its west-shore answer in Maelis's song; the
Aeriex kinship stays UNSAID by both crowns (each has a line that walks
to the edge of it and stops — players assemble it, the assembly is the
game).

---

## 8. The wood (Phase 3 — prop-independent except where noted)

- **Territory family `elf`**: new POI family joins the territory lattice
  automatically (territory.ts law) — the Everwood leans elven the moment
  defs declare it.
- **New archetypes** (tiers [4,5], weights tuned at build):
  - `waystone_glade` — the wayshrine's elven answer: a waystone in a
    tended clearing, scenic haven-point, empty by design. (Waystone
    tile = KIT-GATED; the def ships in Ph3 with a stone-ring prefab and
    the waystone joins at Ph4.)
  - `sentinel_arbor` — a manned Evenguard watch: the wood's
    wardens_outpost, friendly, first elven faces on the trail.
  - `fallen_light` — an old folk lantern-site gone dark and overgrown,
    skeleton household risen under it: what the wood's quiet actually
    holds down (classic dungeon fantasy, boundary-clean).
  - `fellers_camp` — a Red Company timber camp, half-built and
    half-dismantled: the oppose pair made ground truth.
- **Authored sites**: `first_waystone` (pinned near the Evenway fork —
  the moment the lamps hand off), `serel_watch` sentinel_arbor cell-forced
  mid-trail, `heartwood_door` (weight-0, at the HEARTWOOD_RECT hem —
  exists exactly once, the delve epic knows the address).
- **Wild mobs**: the existing tier-4/5 procedural roster serves (wolfkin,
  lynxkin, owls, brigands read perfectly in a deep wood). NO new mob
  family in this epic — a true elven combat rig is its own epic (the
  OLD BLOOD canon note), and the elves are not enemies. The Evenguard
  ride the player rig like all humanoids.

---

## 9. The errands (Phase 6 — 5 quests, offer+accept law, collect-final law)

1. **the_letters_west** (the spine): Solvei's letter to an address she
   has never seen → carry it up the Evenway → Serel at the gate → Elarin
   → the king. Flag `evenfall_welcome`; the city's inner dialogue shelves
   key on it. The JOURNEY is the quest; the reward is the town.
2. **the_first_focus**: Vessa shows the rear wall; pays Veyle's exile
   thread end to end (Veyle gets a closing branch: the letter she never
   sent). Sets `the_gift_remembered` — the Heartwood epic's opening flag.
3. **a_bow_of_the_wood**: Aewyn's lane-opener; gather yew + string +
   patience; the bow the player finishes is the tutorial for the whole
   craft shelf.
4. **the_quiet_road** (repeatable): tend the waystones along the Evenway
   (the light_the_old_road mirror — the road-faith's repeatable pays
   lamps, the wood's pays stones; the two faiths' maintenance loops
   quietly rhyme). Even Court rep faucet.
5. **what_the_song_holds**: Maelis, Denna's thread: bring the stormpearl
   word west; the song answers what the net held. Cross-map bookend;
   fordgate/coast crumb pays out.

---

## 10. The phases

| # | Phase | Gate | Ships |
|---|-------|------|-------|
| 1 | THE PLAN | — | this document, committed |
| 2 | THE LAND | prop-free | veil, rects, evenway + heartwood_walk, haven, gazetteer, audio row, tests (geography + tracks eight-towns widening), routecheck rig rebuilt |
| 3 | THE WOOD | prop-free* | territory family, 4 archetypes + prefabs (*waystone tile joins in Ph4), authored sites, POI tests |
| 4 | THE CITY | **THE FAIR HOUSE FURNISHED landed** | the zone: terraces, the Moonstair, five districts, full kit dressing, registration spine, suites A/B + foot-water file, zonerender rig rebuilt |
| 5 | THE PEOPLE | Ph4 | ~22 souls, routines (routinecheck rig), shops + scroll shelves, dialogues, faction, VOICE.md block, trainer directory rows |
| 6 | THE ERRANDS + THE WALK | Ph5 | 5 quests + trees + items; live close-zoom curation tour on an isolated rig lane (check lsof before claiming a lane; lane 3 = 8795/5178 precedent) |

Commit per phase (the standing order), hunk-staged, `git diff <parent>
<commit>` proof before every push, index-refresh closing step after any
plumbing flow (the shared-tree law, all of it).

---

## 11. New-art debts this plan declares (not this epic's scope)

- The mother tree / Heartwood set-piece (no giant-tree art exists) — the
  delve epic's headline.
- A true elven combat/NPC rig beyond ears-and-skin — its own epic.
- Moss/undergrowth ground details (optional polish; the city reads
  without them).
- Waterfall set-piece flourish at the Moonstair lips (the standing
  Silverfall debt, now with a second — grander — customer).

---

## 12. As-built ledger

(filled per phase at ship time)

# THE CONTESTED LANDS — A BAD YEAR ALL ROUND

The world around Dawnmead stops being a happy green with dungeons in it and
becomes a country at war with itself: encampments built into the land by the
peoples who hold it, roads billed and lamped and refused, woods felled and
charred and dying from the roots, crofts drowning, a barrow broken, refugees
under sacking at the village gate, and two clerks on the green arguing about
whose fault the road is. No party is the villain. Every party is guilty of
something real and right about something real. The player does not choose the
good side; the player chooses **whose account of the bad luck to sign their
name under**, and pays for it with the party they did not believe.

Status: **PROPOSED 2026-09-04, awaiting green-light.** Synthesized from a
thirteen-agent design workflow (five ground-truth readers, three competing
world designs, a prop-kit design, a Dawnmead redesign, two judges, one
adversarial critic). The judges split between "A Bad Year All Round" (best
engine discipline) and "The Cold Comes Up the Roads" (best economy and prop
voice); this plan takes the first as the governing frame and grafts the
second's economy, the third's set pieces, and the critic's corrections.
Every claim about the engine below was verified against the code on the day.

Companion documents this plan builds on and does not restate:
`docs/factions-plan.md` (the standing ledger), `docs/living-frontier-plan.md`
(ember/boldness/watch/hearth/fuse), `docs/war-camp-decor-plan.md` (the camp
kit and its laws), `docs/graveyard-kit-plan.md`, `docs/dawnmead-open-plan.md`
and `docs/dawnmead-remade-plan.md` (the village as built), and the character
bible under `docs/dialogue-bible/` on the `worktree-dialogue-great-pass`
branch (the spine, the canon rulings, the name ledger).

---

## 0. The verdict in one paragraph

Something in the deep places is moving outward and the country around
Dawnmead reads it as a run of local bad luck. The brook rises a finger
oftener than it should. The Amberfen swells and drowns the crofts on the
First Road. The Thornveil's wolves come down out of the veil onto Sorrel's
sheep because gnolls have squatted the Waykeepers' fallen tower behind them
and the wood is dying from the roots. A goblin warren coughs its unlucky up
through a kerbed barrow on the west wold, where the Charter is chaining a tin
seam over the open grave. Kobolds break ground under the unlit Old Road,
tamping something down that nobody names. Nobody sees the whole shape.
Every party has drawn its own map with a neighbour's name on the blame line,
and the alliances are two or three against one and shift by zone: the Charter
and the Waykeepers agree about the First Road and disagree about the Old
Road; the Returners pay the Red Company to walk the dark miles the Waykeepers
refuse; the wolves and the gnolls and the struck line at the husk fight each
other at dusk with no player anywhere near; the old folk string a thread
across a dying stand and say nothing anyone can understand. Dawnmead stays
the tutorial's cradle and stops being a happy village.

---

## 1. The laws of this epic

These bind every zone, prop, throat and fork below. Several came from the
critic and reverse things the first drafts assumed.

1. **THE WORLD IS SHARED, THE BELIEF IS YOURS.** This is an MMO. A fork never
   flips a camp's tribe, embers a site, shuts a gate, kills a tree or floods a
   field for one player. Every fork's cost lands on the **character**:
   standing bands, bare character flags, throat access (the closed throat),
   shop lines, loot routes, bark pools. Every **ground** change rides the
   Living Frontier's shared dice: player clears, `bounty_open`, satellites,
   creep, renewal credits.
2. **AUTHORED CELLS ARE EXEMPT.** `authoredCells()` exempts every pinned site
   from ember, stage-up, satellites and tolls. Therefore: pinned sites are the
   **stage** (havens, husks, hamlets, the toll bar) and **rolled cores** carry
   the frontier beats (the Drum warcamp, the den, the digs, the barrow). Any
   beat that says "the pinned site stages up" is wrong by construction.
3. **THE SPINE IS NEVER SPOKEN.** No throat gestures at something bigger, joins
   two corners, or draws the cairn line. Brede's "like a bill nobody sent" is
   the closest anyone comes and it is bookkeeping. Contradictions are canon and
   are never reconciled: who burned the croft, who broke the sluice, why the
   wolves came down.
4. **NO PURE GOOD, NO PURE EVIL.** Every party in §2 carries a fault and a
   virtue that both survive scrutiny, including the refugees, including the
   dead, including the old folk. The critic's slips (refugees as pure victims,
   the Company handed the truest reading everywhere, the non-human peoples
   always right) are corrected in the roster.
5. **FREQUENCY, NOT AMPLITUDE.** Dawnmead's ring is tier 1 to ~192 tiles and
   tier 2 to ~320 (±1 jitter). Heavy families (hobgoblin Legion L16-24,
   gnoll_squat [3,6], fell_barrow [4,7]) never get pinned inside tier 2 as
   themselves. Either a weight-0 same-family **variant** with tiers [2,4] and
   an honest smaller garrison, or the core stands at tier 3 (320+ tiles) and
   only its **reach** (a satellite, a patrol loop, a straggler) comes closer.
   The Legion stands at tier 3 by canon and its march toward Dawnmead is made
   of pressed goblins.
6. **THE CLOSED ROSTERS.** `world:` flags are a closed roster
   (threat_near, threat_bold, calm, relief, toll_near, bounty_open,
   peddler_near); this epic adds exactly one, `war_near`, via the Phase-3
   predicate pattern. `quest:` flags are synthetic and read-only; fork
   exclusivity uses **bare character flags** plus offer-tree `forbids` on the
   opposed quest's `quest:<id>:done`. Stances are a global body-vs-body doc
   with no character input; there is no per-character tribe stance and none
   is designed here. Reputation is for speaking parties only.
7. **THE TUTORIAL IS SACRED.** Spawn, the seven stones, safeR 64, lane rows
   47-49, the three route heads, all sixteen cast slugs and their posts, every
   counted singleton, and the sixteen-quest ladder do not move. Every fork is
   gated on `quest:the_first_road:done`. No new throat is a teacher. The
   corridor law holds: predators, skirmishes and camps stay outside the rect;
   inside it the war is dressing and mouths.
8. **TILE IS THE STATE.** Every prop is a Tile id; every posture is a new id;
   nothing rides metadata. Lights are `lights.ts` rows; smoke is a dt-gated
   emitter in the `collectStaticLights` scan; painters never draw smoke or
   `queueGlow`. Ground marks that must last are baked Details or the prop's
   own ground pool, never the decal pool.
9. **THE CONTENT BOUNDARY** holds on every id, name, plaque, bark and comment.
   The palette is fire, stone, ash, bone, the cold, the deep, gloom, grudges,
   things that were here first.

---

## 2. The parties

Twelve parties within 320 tiles of the anchor. Two are new to the faction
roster (Returners, Fenside); one is a new **tribe** on an existing family
(the Doorless); the rest are existing peoples given ground and a quarrel.
"Mark" is the claim-prop from the kit in §6 that says at a glance whose ground
you are on.

| Party | id / kind | Wants | Fault | Virtue | Mark |
|---|---|---|---|---|---|
| **The Amberford Charter** | `fordgate` (faction, existing) | The First Road dry and billed by a causeway; the north stand cut on licence; the west tin seam chained; the Old Road lit for wains. "Never caught poor again." | Bills the drowned for the dike that drowns them; cuts the skral's weir to lay one straight road; chains a seam across a broken barrow and does not stop; counts the Doorless in the same column as stumps. | They build and their wains come. Margit's tally is the only honest number in the valley: she alone knows the Copse cannot heat Dawnmead and the Third Stone both. | CharterPost (ochre survey stake, brass plate) |
| **The Waykeepers** | `waykeepers` (faction, existing; roadFaction) | The First Road lamped and walked to the ford; the husk taken back and BURNT; the Old Road left dark because they cannot walk it; the Returners' lamps put out as lies in glass. | Doctrine over people. They will not light the south and will not let anyone else; Torsten would burn the order's own first tower; they refuse Charter oil because it comes with a ledger. | A Waykeeper lamp has never once lied. Hale's First Lamp is the one unambiguous safety on the road, and Torsten's count of gnolls and wolves is the most accurate map anyone holds. Torsten is **right about a specific death** (the Company crew that walked past his picket lamp at dusk). | LampCairn (cairn with a lit lamp in its crown) |
| **The Red Company** | `reavers` (faction, existing) | The First Road slow enough to be worth a toll and the towns rich enough to be worth robbing; to be PAID to keep the dark road (cheaper than robbing it). "We do not forget", both ways. | Tolls the drowned at the one dry crossing; Aske's crew quietly tolls the Returners it is hired to protect; a croft that would not pay burned and the crew says nothing. | The nursery rule holds (no Dawnmead door, nobody under a first sword tolled). They pay their hires. Brede keeps a scratched water mark on his toll post and is wrong about what it means. | RedRagStake |
| **The Returners** (the Third Stone) | `returners` (faction, NEW) | The Old Road lit stone by stone to Kingsdelf by anyone's oil; the digs under it collapsed; the Waykeepers to admit the south exists. | They light lamps they cannot keep lit (the order's charge is true: no Third Stone lamp has held a whole night). They pay the Company out of a subscription taken from Dawnmead's poorest. They want the digs collapsed with the kobolds in them and call it road repair. | They walk the road nobody else will. Eskil has carried more lost new feet back to Halla's lodge than the order has. The subscription is public and Hilde reads it aloud on the green so no name is shamed. | PitLamp / PitLampDark (a lamp on a driven stake, never a LampPost) |
| **The Fenside Crofters** | `fenside` (faction, NEW) | The mere let down by the old sluice, not the causeway; the toll off the crossing; the skral off the sluice post; their corn carried by anyone at all. | They blame the skral for a sluice the water broke, and Halvor's son put an axe through a skral keep-pool over it (the one thing the wave-treaty says ends everything). They will not pay the levy and will not stop asking for the dike. Their sheep are on Brammel's common without asking. | They are right that the causeway drains the mere into their own furrows and that the crossing should be free. Halvor alone has noticed the kelp-string on the broken post: the skral **paid**. | SluiceGate (with the kelp-string variant) |
| **The Crown's chain** | `crown` (faction, existing; one party of three) | The west way and the Old Road entered in the Crown's book as Crown roads before the causeway makes them Charter roads. To file, not to fight. | Measures a road it will not lamp, garrison or pay for and calls the measuring ownership. Rurik notes the grub farm as "hostile encampment, 41 paces" and walks on. **Wants something someone has:** the Charter's concession chart, which he will lift from Steinar's table if he must. | His chain is honest. His miles are the only measurement of the west way that agrees with the ground, and when Steinar's stakes cross the kerb it is Rurik's stake that proves it. | ochre pennant on a pole (BannerStand, crown dye) |
| **The Even Court** (the ward line) | `evencourt` (faction, existing) | The dying stand left standing until it has finished dying; no living wood felled; the fork's waystone kept. They will not say whether they know why the wood is dying. | They string a thread across a wood that heats a village and say nothing a villager can understand; they let a Charter feller walk into the veil pack rather than warn him in a tongue he speaks; Sylwen's court dismantled a Company crew "politely" and the crew's boy is in a GraveMound on the trail. | They do not fell living wood and never have. Their waystone is the only light on the Thornveil fork that draws nothing at night. They were here first and it is not a boast. | WardThread |
| **The Drum** (goblins of the Felling) | family `goblin`, tribe `goblin` (existing) | Charcoal by the clamp, worg-meat off the herds, the muster fed and fired before the cold. They fell the dying stand because dying wood chars best. | They burn the wood past grey-root, take the croft's sheep and then the croft, hunt the Doorless as deserters, and the drum they answer is crimson and not theirs. | They are the only party keeping the cold off their own backs by fire, and their pickets shout before they loose, which is more than the Legion does. Their harvest is honest about what the wood is. | SkullTotem / TrophyStake (existing) |
| **The Doorless** (goblins who left the door) | family `goblin`, tribe `goblin_doorless` (NEW tribe on a weight-0 grubfarm variant) | To be left the ash and the wold's edge to farm grubs in, warm before the cold that drove them up arrives topside. Fire for the beds, not the war. | They came up through a kerbed barrow and broke it. They raid the coop and the drover's yard (a sheep, a bird, never the granary). They think every lamp is a hunt coming for them and **douse Hale's picket lamp**, and a wain went into the ditch dark for it. They will not fight the Drum even when the Drum comes for Dawnmead. | They cut only snags. Their grub-beds are the one thing that grows on gloom-touched ground. They PAY: a knucklebone left on the fence for what they take, the skral's arithmetic in goblin hands (author-facing rhyme only; no throat says "skral"). | a knucklebone on a fence rail (Detail, no tile) |
| **The Legion** (hobgoblins) | family `hobgoblin`, tribe `legion` (existing people; core at tier 3) | Every goblin on the wold under the crimson banner by the next moon; the wold's timber for palisade; Dawnmead as a drill exercise, later. | Press-gangs a people who were farming; burns what it cannot carry; its gate faces the road because the road is next. | Drilled, square, honest about what it is. They do not toll, do not dig cairns, tend their wounded, dig their latrine. The one straight line between the Spinewall's deeper things and the west way that has held all year. Harguk Fiveblows has a face and a name. | LegionStandard (one crimson square, never varies) |
| **The veil pack** (wolfkin) | tribe `predators` (existing) | Out of the veil, which they cannot say why; the sheep; the trail. | Took two sheep and a drover's dog; hunt the trail at dusk exactly when new feet walk it. | Wolves leaving a wood is a true thing (the spine's beast) and killing the pack clears the trail for what is behind it. They do not toll, dig or lie. | BoneTree |
| **The husk warband** (gnolls) + **the struck line** (the dead) | tribe `gnoll` (NEW declared) / tribe `dead` (NEW declared) | Gnolls: the tower by day, the deer, the den once the wolves are gone. The dead: to keep the watch they were struck from; to light a lamp that is gone. | Gnolls eat the Company crew, the deer, the sheep, and moved in on a grave. The dead cut down anything on the trail after dark, gnoll or player or drover's dog. | The gnolls did not fell the tower and did not dig the graves: the order struck it from the rolls and left it. The dead keep the north better than the living; while they stand the gnolls do not. | BoneMidden / KnucklePit (existing) ; GraveMound (existing) |
| **The digmasters** (kobolds under the Old Road) | tribe `kobold` (NEW declared) | Up and out, thoroughly. To tamp the seam behind them. Not to be talked to. | Undermine the Old Road's milestones so a wain wheel drops; bury a Returner lamp stake in spoil; bite. | Not wicked, thorough: every cairn they undermine they re-stack (one stone wrong), every hole they open they tamp, and the Gloamwood's bats are thinner where their spoil lies. What they are digging away from is never said. | TallyStone |
| **The upstream shoal** (skral) | tribe `skral` (NEW declared) | A weir on water that does not drown it; the crofters' keep-pool put back; the wave returned. | Their weir broke the sluice when they moved it; they took the crofters' fish; when Halvor's son axed their keep-pool they took his Dugout and left the axe on the bank, which is a sentence. | They pay. They wave. They moved because the fen rose under them, which is the truest reading of the water on the First Road, and they cannot say it. | TideTotem (existing) ; kelp-string (Detail) |

Alliances by zone (two or three against one, never a bloc):
- **East:** Charter + Waykeepers on the First Road against the Company; Charter against Fenside on the levy; Fenside against skral on the sluice; the Company waves at the skral and the crofters hold it against Brede.
- **North:** the dead and the Waykeepers, without meaning to, against the Returners' idea of a lit road; gnolls against everyone; the veil pack routes around the Legion's reach; the Drum against the Doorless.
- **North-west:** the Even Court against every axe (Charter licence, Drum clamp, Alder's thinning); the wolves pass the ward line and nothing else does.
- **South:** Returners hire the Company against the dark; the Waykeepers refuse both; the kobolds are at odds with the road itself; the Gloamwood's wild is nobody's.
- **West:** Charter chain against the Doorless and the barrow's dead; Crown chain against the Charter on paper only; the Legion's pressed satellite against the Doorless; Brammel and Sorrel want their corn and their ram back from a people that is farming.

Misaligned-but-not-opposed pairs, authored as `neutral` stance rows with range
so two peoples visibly coexist: `goblin_doorless|kobold` (came up the same
dark, pass each other), `skral|reavers` neutral at the crossing (they wave),
`predators|evencourt` (the pack walks the ward line unbothered),
`crown|goblin` (Rurik walks through the grub farm measuring; pickets watch).

---

## 3. The map: six zones and three belts

> **Superseded in part by §13 (BREATHING ROOM).** The zones, parties,
> contentions and forks below stand; their COORDINATES and cell
> assignments are replaced by the re-celled table in §13.2, which is the
> table Band 0 pins from.

World coordinates; anchor (-64,48); rect (-160,-64) to (32,160). Placement
notes flag where the site scan may refuse (the Amberfen mosaic heart is
(90,60) r68; the existing pins at (122,112) and (148,98) sit on its rim for
that reason). **Every authored site is probed with the FLAG= bisect and a
fresh-page screenshot before pinning.**

### 3.1 THE FEN LAMP AND THE BAR — east, the First Road

Places, in walking order from the gate at (32,48):
- **The Ashlamp** at the lake's south tip where the First Road turns east
  (authored zone `ashlamp`, rect (48..70, 92..110), the shell at
  (54..60, 93..97), 60..75 tiles from the gate): a burnt Waykeeper
  waystation. RuinWallStone shell with three breaches, a LampPostDark with a
  cold socket, CharredBeam heap, one EmberBed that still smokes, AshHeap,
  Detail.Ash ring, a stalled Charter wain (BelongingsCart + CrateGoods under
  tarp) with Margit's tally board beside it. **Not a POI: an authored zone
  patch on worldgen** (`maps/ashlamp/`, the Dawnmead module pattern copied;
  the `ashlamp` def, the `poi_ashlamp` sketch and the parked pin retired; the
  first authored burn stroke of the spectrum stands under it).
  Attributed two ways and a sign: Hale says the Company put a torch to it;
  Brede says the order pulled its crew and let it burn, and keeps a lamp-glass
  on a TrophyStake to prove they left it; the sign says only
  "THE ASHLAMP. Struck." Berrit's winter is **not** this fire (timeline: the
  winter was before most of the current village; the Ashlamp burned in the
  spring).
- **The Causeway Head** at THE FORD (136..140, 84..86), the First Road's one
  crossing, in the authored zone `fenside` (rect (118..141, 76..100)); the
  head stands on the west bank north of the road (layout W, measured); the
  dike line crosses the channel's upstream lip; the pennant is weld (J10),
  the plan's word "ochre" was the Crown's dye: the Charter's dike-stake line
  (CharterPost run + Fence standing in WaterShallow) and spoil bank marching
  east, WoodFloor pallets over mud, a Counter under canvas with the levy
  book, StreetLantern pair, CrateGoods/BarrelStack, warded ChestIron.
  Dike-master **Ingram**'s post is the crofts' hearth (the bed under the
  gate's canvas); his morning loop walks the line at the ford (routine
  `ingram_dike`, back by eleven).
- **The First Lamp** at the drowned crofts' gate (the `fenside_lamp` prefab's
  north row, the lamp at world (152,87)), safeR 16; the plan's (162,38) and
  the `first_lamp` name retire. LampPost + StoneBench + milestone Rock +
  canvas lean-to + BarrelStack of tithed oil + a chalk-tallied post.
  **waykeeper_hale** on watch, pooled wayward_watch on the ring.
  **Leif is Dawnmead's one body (E4)**; his walk is the road's, not a
  routine's, and Hale's bark carries it ("The boy walks the tithe in each
  morning and chalks it on their post. He is theirs by day."). Hale is
  **removed from the wardens_outpost actor pool** (replaced by a name-free
  pooled sergeant) so no rolled outpost mints a second Hale; the two quests
  that name him (`the_lamps_of_the_line`, `the_long_way_round`) now find him
  where their text always said he was.
- **The upstream weir** at the crofts' south water edge inside the
  `fenside_lamp` prefab (R8): a dressing scene, no garrison; two skral stand
  there as NEUTRAL actor rows (`skral_weirward`, wordless) and read
  `weir_cut`, on WeirPanels + KeepPool with an axe-cut in it + TideTotem +
  ReedShelter; the old sluice (SluiceGate) on two posts, one post with the
  kelp-string variant.
- **Brede's bar** = the pinned `first_road_toll` on the weight-0 def
  `first_road_bar` (an honest smaller toll, pinned (126,109) south-west of
  the ford, one row south of the fenside rect under THE AUTHORED HUG, which
  its site row alone declares): **Brede is the crowned reaver of the bar,
  who speaks through the row (THE MOUTH ON THE ROW); he is forged under the
  Company's crown (a brigand crown pool); his third offer waits on THE
  CHALLENGE**; the BAR SCENE is the fenside zone's dressing on the road: two
  TimberPosts flanking the bed, SpikeBarrier teeth narrowing it to the
  warden's gap (129,88), no rope (none exists; the posts, the barriers and
  the bodies are the bar), RedRagStake line to the crofts, PrisonCage with
  the drover **Ansel** (a Charter drover who could not pay, a zone actor),
  WarTable as a counter, NoticeBoard of receipts, chest_pit_takings warded.
  Brede's mark-post scratched with six water lines a finger apart, a
  TimberPost standing in the water at (137,83).
- **The drowned crofts** = the pinned `fenside_crofts` roadside_hamlet
  (160,94), the 24x16 core at nudge 0, footprint x 148..171, y 86..101,
  re-dressed: Tilled rows authored as WaterShallow with Scarecrow,
  IrrigationChannel and Fence standing in it (no flood system; the "rising" is
  carried by Weir's stake, Brede's post and Margit's ledger in three units),
  drowned corn cut green on stilted PorchDeck pallets, Dugouts, RailWood pens
  on stilts. Headman **Halvor** (fenside actor) and the pooled crofter
  bodies; the east cabin holds two beds apart (one sleeper owns the
  mattress); Halvor wades to the sluice's near post each dawn from the
  shallows east of it.

**The contention.** The water rose and nobody saw it rise. Ingram says the
Company broke the sluice to keep the road slow ("a wet road is a paying
road"). Halvor says the skral broke it moving their weir, and his son answered
with an axe. Brede says nobody broke anything, the water came up "like a bill
nobody sent." Hale says the road past his lamp is the Charter's problem and
the fen past the road is nobody's (he is a sergeant, not a doctrinaire; the
lie-in-glass doctrine is spoken locally only by Torsten, quoting Liv). The
kelp-string on the post says the skral paid, and only Halvor has noticed. All
four accounts are locally true.

**The fork — THE CAUSEWAY OR THE SLUICE.** Both quests require
`quest:the_first_road:done`; each offer tree `forbids` the other's
`quest:<id>:done` and `active`; both set the bare flag `fen_side_taken`.
- (A) *Stakes in the Waist* (Ingram): carry eight stakes, plant the dike
  line, hold the crossing: the shoal answers on the channel's WEST bank
  north of the ford, twenty tiles up, past the lamp's relief (the haven law
  drops the ford's own banks to tier 1, where no skral rolls; the journal
  names the bank), post the levy on Dawnmead's green. Rewards: +fordgate,
  Charter paper (`charter_pass`): the crew holds fire on Charter paper and
  on anyone who has not walked the first road (THE PASS with the nursery
  clause), Margit's ledger opens a repeatable corn-carry.
  Costs: −fenside past outlaw (the crofter pool's closed throat; Halvor, the
  fineActor, stays cold and sells the name back at six coins a point),
  Weir's shelf line "you dried a water I fish" (a shop line, not
  a refusal), flag `weir_cut` read by Weir, by Halvor and by the two skral
  at the weir.
- (B) *The Old Gate* (Halvor): repair the sluice with boards from Ottery's
  shed, carry the kelp-string back to the weir and hand it to the shoal
  there, who take it without a word (a `talk` on the neutral skral), then
  carry the crofters' green corn past Brede's bar without paying (steel, or
  the south shoulder in the dark; Brede's third offer waits on THE
  CHALLENGE). Rewards: +fenside, the kelp-string as a held token (a Dugout
  is a tile and the world is shared; the empty berth stays empty for
  everyone). Costs: −fordgate (Ingram bills "obstruction" and Margit's
  ledger closes to the character), Hale posts the character's name on the
  lamp as a toll walked (a bark and the rota bill on the green); Ingram's
  obstruction bill is a door back (refusable forever); Margit's ledger
  closes; Hale and Leif chalk the name once each. A B walked by steel ends
  fordgate −5, not −20: breaking the bar credits fordgate +15 (the clear's
  own reward).
Neither side ends the bar. A blade ends it for the character who swings it
(the clear stamps `poi_first_bar_broken` per character and the crew musters
anew in ~180 s); the bar stands for everyone else, until Epic 2. Aldis's
`word_on_the_road` reads `fen_side_taken` as "a side was taken", never
which.

### 3.1a As built 2026-09-05

Band 7's rulings, binding on this section and folded in above:

- R1. THE ASHLAMP is a small authored zone, `maps/ashlamp/`, built on the Dawnmead module pattern and sited at the lake's south tip where the First Road turns east.
- R2. THE CAUSEWAY HEAD stands at the ford inside a second authored zone, `maps/fenside/`, which also authors the bar scene on the road's west approach.
- R3. Ingram's post is the crofts' hearth, and his day loop walks the dike line at the ford.
- R4. Brede's bodies are a weight-0 `first_road_bar` def, pinned beside the road south-west of the ford, and it replaces `first_road_toll`.
- R5. The world flag `toll_near` now also counts pinned defs that declare `toll: true`, giving the Leif and Margit bicker and Aldis's toll lines their trigger.
- R6. Dawnmead keeps one Leif; the second def row and `leif_walk` retire, and Hale's bark carries the boy's walk.
- R7. THE FIRST LAMP rides the re-dressed `fenside_lamp` prefab at the crofts, and the plan's (162,38) and the `first_lamp` name retire.
- R8. THE UPSTREAM WEIR is a dressing scene inside the crofts prefab, with two skral standing as neutral actor rows, not a garrison.
- R9. THE FORK composes on the four objective kinds only, and the sortie composes as a kill objective on shore skral wild rows, with no new stage.
- R10. The tiers stand as dangerAt rolled them, and Brede's row is minTier 1, so he stands whatever the jitter says.
- R11. The crofter pool's six lines are rewritten place-neutral, so the same pool stands true at the gate and at the crofts.
- R12. No new Detail postures are added this band, and the knucklebone is dropped from the plan.
- R13. The world flag `war_near` is not required at the crofts, since no garrison stands there.

Owed and gated, carried out of this band for the owner to accept or reverse:

- THE HUNG LANTERN (`shared/world/lights.ts`): every shipped StreetLantern now carries a light row, lighting lanterns the brief asked to gate only by day. Owed: accept, or revert by deleting the row and its census line.
- THE COLD TORCH BY DAY (`client/render/props/warCamp.ts`): every camp torch now rides the flame gate, cold by day and lit from dusk. Owed: accept, or revert by striking the gate block.
- THE CHEST WINDOW (owed L5): the head's chest and the camp's stay warded while the crew stands, and open for the breaker only inside the grace window before the crew musters anew. Owed: accept as written, or read `poi_first_bar_broken` on the ward instead.
- THE AUTHORED HUG is opt-in per site, said by the bar's site row alone. Owed: accept the per-site word.
- THE COMPANY'S CROWN: a brigand crown pool forges Brede and would forge any future crowned reaver row. Owed: accept, or drop `crowned` from the row, which R4 forbids.

#### 3.1a As built (band 8 addendum; the owner gates)

The five owed-and-gated items above are struck as ACCEPTED (G4): THE HUNG LANTERN, THE COLD TORCH BY DAY (load-bearing for the Felling's noon shot and the husk's brazier), THE CHEST WINDOW, THE AUTHORED HUG per site, THE COMPANY'S CROWN.

Band 8's gates, answered: G1 FieldLitter YES (landed, dignity 12 since the fix pass; proven at the Felling, unreachable at the husk by its floor); G2 the `goblin_warcamp` rivalDef/rivalNear word YES (the def edit landed with the frontier test); G3 SmolderHeap MINTED 548; G5 the cadence (one jumped day, two un-jumped stretches, one fix pass); G6 the refusals stand (no Doorless body north-west, no Legion loop, no timed light row, no fallen-lamp id, no hug on any north pin, no second core in [-2,-2], THE CHALLENGE stays Epic 2).

New this band, for the owner to accept or reverse: THE COUNTED PACK (`ZoneSpawn.passive`: a placed body that never opens on a player; the ward line's wolves fly it); THE TRAMPLED RING (`cues.trampled`; the veil den flies it); THE UNWATCHED SQUAT STEPS OFF (keepSpawnHours drops the idle-only rule for unwatched off-window bodies); the litter's dignity 12; the fork rest's `cues.clearing` 4 (the north fringe gains a ring row of the clearing law's stumps so the mouth's oak falls: refused otherwise, the sketch cannot grow a row without sliding the golden anchor); the NaN guards (a non-finite heading moves nobody, the field has no NaN tile, the edge law refuses a non-finite point, the body that lost its bearing is named and stood on its origin).

### 3.2 THE HUSK — north, the hunters' trail

- **Torsten's picket**: trail DRESSING at (-120,-124) on the trail's east
  shoulder where the wood opens to grass, forty tiles past the dire wolf
  (authored zone `picket`, rect (-131..-108, -140..-115), no core, no haven,
  no body; the lints `wolfClear` 30 / centre 40, `thresholdStake`,
  `benchUnused`): two LampPost, a TownBell, a slate with an authored tally
  (Signpost words: gnolls eleven, wolves seven, "ours" three with a line
  through the three), a StoneBench nobody sits on. Sergeant **Torsten** is
  posted at the fork rest's mouth and walks DOWN to the slate each morning
  (routine `torsten_fork`: 05:30 down the scuff, at the slate's west cell by
  about 06:15 chalking the count for one game hour and a little, home by
  half past eight); the picket places nobody. Four GraveMounds in a row
  hugging the scuff north of the post, and the RedRagStake beside the second
  mound ON the tier-2 ring (192.0 from the settled anchor, where a walker
  coming up reads it before the mounds; §13.1 law 5): Aske's brother's crew,
  who walked past this lamp at dusk against Torsten's word.
- **The Felling** at (80,-42), cell [0,-1], tier 2, on its OWN burnt stand
  east of the gate on the First Road side (weight-0 `felling_drum` on the
  NEW sketch `poi_felling_drum`, 32x29, the stockade verbatim inside it; the
  `felling_burn` stroke circle r 18 amp 0.8 under it; `boldness` STRUCK:
  authored cells never stage). The Drum: punctuation palisade, worg pickets
  (rows wear tribe `goblin` so the den's wolves fight the camp's own worgs),
  a firecaller, four SmolderHeap (548, MINTED in band 8) charcoal clamps in
  a downwind line (cap four per prefab), twelve CharredStump in two rows of
  six (six more on the cone by `cues.scatter`), the drag furrows running
  NORTH-WEST from the rows toward each clamp on the detail plane and
  stopping a cell short of the dome (the fix pass: straight furrows read as
  domes on stalks at zoom 1.3), six DeadTree snags on the sketch's rim on
  the sentry ring's bearings (a ring worldgen never deals). The licensed cut
  is NOT here: it is Bodil's, at the dying stand's west skirt north of the
  High Road at the fork (§3.3). Two Doorless bodies (tribe `goblin_doorless`,
  hours 20-06, one row of one each) stand at named `at` posts beside the two
  EAST snags, (87,-49) and (90,-40), inside the pickets' round; the
  knucklebone on Bodil's rope is SPOKEN (R12), never drawn. PROVEN live in
  the fix pass: the pair musters on its posts at 20:00 and the Drum's sentry
  worg and firecaller open on them within the hour (both Doorless dead by
  20:44 on the running clock, the worg at 36 of 109); two FieldLitter bodies
  lay inside the ring after it (beat 11).
- **The husk** at (-64,-240), cell [-1,-2], tier 2, off every way on the
  mere's far ground (a peninsula: the mere y -190..-185 from x -120 to -57
  and the eastern water x -66..-44 from y -250 to -192), found by the cairn
  that fell at the High Road's turn (-73,-172) and the water where it
  narrows (the wade at x -85 through rows -189..-185, or the marsh strip's
  dry sand at x -55..-43; both WALKED); weight-0 `husk_of_the_line` on the
  NEW sketch `poi_husk_of_the_line` (16x15; the shipped `poi_watchtower_husk`
  is every rolled husk's and stands untouched; `cues.scatter []`: every mark
  is in the sketch), family `dead`, tiers [2,4], with a gnoll garrison row
  hours 05:30-20:30 (tribe gnoll, packlord crowned from the pool: Old
  Cackle) and the existing skeleton rows 20:30-05:30 (tribe dead, crowned
  "the Struck Sergeant", levelOffset 3 since the fix pass (Old Cackle's own
  offset; the dead take the crown first now and the line wins by 21:00)).
  **The changeover at half past eight is a fight when a character stands
  within 20 to see it** (keepSpawnHours never steps a body off in front of
  anyone; an off-window body nobody watches steps off between glances
  WHATEVER it was doing, the fix pass's rule, so a walk twenty tiles off and
  back finds the line alone; the dead do not walk a lit apron for two and a
  half hours). WallStone breaches re-crested with RuinWallStone, StoneFloor,
  CaveRubble, the order's own LampPostDark standing dark at the door's west
  jamb (snuffed, not felled) and the gnolls' CookPot on the order's hearth
  stone inside, BoneMidden and KnucklePit on the swept-gravel apron,
  TrophyStake with a Waykeeper's grey wool, a Brazier on the flame clock
  like every man-made fire (cold at noon, lit from dusk); the burnt board
  (SignpostBurnt) at the door's east side, which reads "Char. Whatever it
  said went up with it."; ONE living board STRUCK FROM THE ROLLS at the
  apron's south edge. The kill-field's edge (BeastBones x3, Detail.Bones) is
  the husk's own south rows: the den is 190 tiles west. The chest stays free
  (no `chestWarded`): loot fast or fight fair.
- **The veil pack** in the pinned cell [-2,-1] at (-186,-99) (epoch 0), on
  the NEW weight-0 def `veil_den` (wolfkin, tiers [1,4], wolf 2-3 holdfast,
  wolf 1-2 sentry, `dire_wolf` x1 crowned 'Hollowhowl' minTier 1 levelOffset
  2; `clearedFlag: poi_veil_den_broken`, never the generic den flag) on the
  NEW sketch `poi_veil_den` (den_bones re-dressed; `cues.trampled: true`,
  THE TRAMPLED RING of the fix pass: a pack cuts nothing, so the felled ring
  is grass and never a stump), BoneTree at the den mouth, BeastNest, gnawed
  BonePile.

**The contention.** Sorrel wants the pack culled. Alder says the wolves are
running from something and killing them clears the trail for what is behind
them. Torsten wants the gnolls out and then the tower burnt so the struck
line has nothing to stand in. Hale wants it left standing ("a line that keeps
its post is not the order's shame"). Aske wants the gnolls dead for his
brother and will pay. Everyone's local read is "a bad year for wolves" and
nobody asks why a pack that denned in the veil for forty years came down.

**The fork — THE PACK OR THE SQUAT.**
- (A) *Wool Count* (Sorrel): get the count from Torsten's mouth, then break
  the pack at the pinned den (THE FLAG OBJECTIVE reads `poi_veil_den_broken`,
  retro-credited; the den re-musters in 180 s for everyone), then three
  pelts off the pack (`questDrops` on wolf 0.6 and dire_wolf 1, rolled only
  while `the_fleece` is active). Rewards: +fordgate, a drover's fleece
  cloak, Sorrel's pen at KNOWN (fordgate +25 net: three percent off at every
  Charter counter, said in her turn-in). Costs: Alder's yard is SHUT to the
  character for good (`alder_trades_closed`, priority 14, outranks the grey
  root offer since the fix pass: an A north character hears the closure
  first, and the closed hub carries the grey root's door for any hand the
  thread side has not taken; the `copse_yard` shelf B's bow wood opens stays
  shut to them; the axe questions still answer), Torsten's slate LINE reads
  'wolves nought' (`nought`) and his relief tree (`torsten_watch_relief`)
  forbids `wool_count_taken`. No waykeepers delta on A.
- (B) *The Tower's Debt* (Torsten, with Aske's coin stacked if
  `fen_side_taken` is set): break the gnoll squat by day (killable garrison
  rows), then hold the apron with Torsten's LAMP (the shipped `lantern`,
  given at the sworn node, taken back at the turn-in: THE TURN-IN CONSUMES)
  from dusk through half past eight, and walk off when the line stands
  (trigger `husk_breach_held`, exit, minInsideSec 75, timeBetween 20.5→5.5).
  Inside the quest, one choice: say the word and Torsten's own oil burns the
  room (`first_line_burnt`, Hale's shame line once) or leave it
  (`first_line_kept`; `torsten_kept` shrinks his hub for good). Rewards:
  +waykeepers either way, the order's grey wool, Aske's coin at the Third
  Stone (60, or 90 at the road's rate with `fen_side_taken`; +reavers 10;
  Hale hears, −5). Costs: fordgate −25 net across B1 and B2 (SUSPECT:
  Sorrel's pen at 1.12); Sorrel's count line once (`sorrel_left_wolves`,
  once since the fix pass, so her hub and her yard come back).
The husk itself never changes hands for good (F2: NPC kills never ember a
site, and the site is authored). Both roads teach the same lesson: the trail
is not safer after either. The trail is not safer after either, and both
journals say so; the picket's slate says seven and eleven before either
offer, and the mounds say what the count cost.

### 3.3 THE WARD LINE — north-west, the Thornveil fork

The mysterious party the first drafts forgot. Where the hunters' trail ends
at the Thornveil fork (-140,-176) and the stand is dying from the roots:
- **The waystone glade**: the waystone stands at the fork rest's road
  corner (the `poi_fork_waystation` re-sketch: the mouth turned EAST to the
  trail's last leg, the cairn pair flanking it, ONE board THE FORK REST, the
  ElvenWaystone at the yard's north-east corner; the thread and the grey
  stone LEFT the yard); the two sentinels stand at named `at` posts flanking
  the stone, hearth rows (never watch: a sentinel must never draw on a
  wolf), speaking the old tongue that is never translated and one line of
  the common tongue each per visit. Their light draws nothing at night (no
  flame gate, cool row).
- **The ward line**: WardThread strung as an L round the dying stand NORTH
  of the High Road at the fork (x -156..-132, y -184..-200, one ground): the
  south leg along y -184 from the head stone by the junction west to the
  corner, the west leg up x -150 to where the wood gives out; 28 tiles in
  the authored zone `wardthread` (rect (-164..-128, -203..-179)), painted as
  ONE line with wands at the ends and the turn, three grey points in dead
  rings (three DeadTree each): the head stone by the road (-135,-184), the
  corner stone (-151,-184), the end stone where the wood gives out
  (-150,-198), the bruise (Detail.BlightVeins) on each and the
  `wardthread_blight` stroke (capsule, amp 0.7) under the stand (the only
  gloom-touched ground in the north), a single CreepRoot two tiles past the
  end stone in open glade (-150,-200) that nobody explains. Stepping over
  the thread is free; cutting it is THE DELIBERATE CUT: a tile interact on
  the thread ("Cut the thread", never the cell under the boots since the
  fix pass), the deed `wardCut` −8 to the Court (the `evencourt|reavers`
  cross pays the Company +4), the flag `ward_thread_cut`, the regrow in ten
  minutes for everyone; a swing or a shot passes through it.
- **The contention.** The stand heats a village and a camp and a waystation.
  The old folk will not fell living wood and will not say whether they know
  why it is dying. Alder wants it thinned before frost and blames the wrong
  people. Bodil cuts on licence up to the thread at the stand's WEST SKIRT
  (the Charter's lot forty one, x -160..-151, y -194..-185, on damp glade
  the crew found open: the lot post, the rope, four face stumps one tile
  from the thread, two cut past it and dragged back across it, the
  sawhorse, the trunks, the rack, the lean-to with Bodil's bed under it and
  a bed frame for each of the two fellers, the fire, the banked clamp) and
  has cut two past it. The Drum chars its own stand east of the gate; Bodil
  says dying wood chars best and the Drum knows it. Torsten wants it left
  standing because grey-root posts rot. Two wolves walk the thread's south
  leg from seven at night to six (a zone row, tribe predators, PASSIVE since
  the fix pass: THE COUNTED PACK never opens on a player, a blow still
  answers), which nobody but the sentinels has noticed; with the trail's
  five they are Torsten's seven.

**The fork — THE THREAD OR THE AXE.**
- (A) *Keep the Thread* (a sentinel; one common-tongue line): carry four
  lengths the Court gathered past the three grey stones (three enter
  triggers, once each, `notFlag ward_thread_cut`) and hand them to the stone
  (the turn-in strings them; the tile never changes); then stand at the HEAD
  STONE by the road one dusk from half past seven for a hundred seconds
  (trigger `stone_dusk_stood`, exit, timeBetween 19.5→23) and watch what
  walks it: the pack's two, and nothing else (PROVEN live in the fix pass:
  a stander at the head stone for 115 s from 19:30 took no damage, the pair
  passed within three tiles fifteen times and never opened). Rewards:
  +evencourt, a moonglass chip (held token), Alder's bark changes to the one
  true reading ("the pack went north; that is the one true thing this
  year"). Costs: fordgate −25 net (Margit bills the stop once,
  `margit_licence_billed`; Bodil's stopped licence is a line, she has no
  shop). A cut hand hears `sentinel_cut` once and the dusk offer never (both
  the dusk offer and its re-offer forbid `ward_thread_cut` since the fix
  pass: closure by law, not by shadow).
- (B) *The Grey Root* (Alder, with Bodil's licence): speak to Bodil for the
  licence (her `signed` choice pays evencourt −10; "Not yet" pays nothing),
  fell twelve of cord and two of yew INSIDE the thread where the stand still
  stands (stepping over is free; the thread stays whole), and deliver them
  to Alder at the Copse; then six more to Margit's tally stall. Rewards:
  +fordgate, the Copse's bow-wood shelf, the village's winter tally posted
  full on the green. Costs: evencourt −30 with the signature (OUTLAW: the
  sentinels' closed throat; the fineActor is sentinel_serel at Evenfall) or
  −20 without (SUSPECT), both said, Rill's stave shelf reads short (no
  north yew).
Both defensible: the axe is the war; the axe is the winter.

### 3.3a As built 2026-09-06 (Band 8)

The judge's conflicts decided (blockout.md §0.2), one line each:

- A. The booted anchors are the pins: fork_rest, husk_of_the_line, felling_drum, hobgoblin_legion and the veil den stand where they booted; the plan's stale coordinates go to the owner as the amendments folded above.
- B. The dying stand is the forest block north of the High Road at the fork, and nothing hugs it: the fork rest's anchor never carries `hug` and never moves on a fresh boot.
- C. The fork rest faces the trail; the thread and the grey stone left the yard: the waystone stands at the yard's road corner, the mouth turns east, and the lamps stop here for good until Silverfall's country.
- D. The picket is on the east shoulder and marks the threshold: zone `picket`, no core, no haven, no body, the rag on the tier-2 ring.
- E. Torsten does not walk to the husk; his lamp does: the mere makes the ground a peninsula, so the hold is stood with the shipped `lantern`, given and taken back at the turn-in.
- F. The seam is kept: gnolls by day, the dead by night, the changeover a fight only under an eye within 20; an unwatched squat steps off between glances.
- G. The chest stays free: no `chestWarded` on the husk, so it is loot fast or fight fair every day.
- H. The husk's marks live in its own sketch: the new `poi_husk_of_the_line` prefab, the order's own lamp standing dark (not torn down), the burnt board and one living board struck from the rolls.
- I. The veil den is an honest smaller variant: a new weight-0 def with its own `clearedFlag`, minTier 1 so Hollowhowl stands whatever the jitter says.
- J. The Felling ships its own ground, and the clamp is a tile: the new `poi_felling_drum` prefab, SmolderHeap 548 minted as the primary prop, the licensed cut removed from its description.
- K. The crew is placed, protected and bedded honestly: Bodil and two pooled fellers, all invulnerable, one Bed and two Bedrolls at the cut.
- L. The north-west is quiet: no Doorless body there, the knucklebone is spoken and never drawn, the thread's wolves are one passive zone row on the south leg only.
- M. Torsten and the sentinels are hearth rows with named posts, never watch rows: a sentinel must never draw on a wolf.
- N. The Legion is untouched this band: no standard, no loop, no edited sketch; the standard is band 10's Spoil Wold.
- O. The pack or the squat, as ladders: Sorrel's Wool Count and Torsten's Tower's Debt compose on the shipped quest rails with no waykeepers delta on A and a net fordgate/waykeepers trade on both sides.
- P. The thread or the axe, as ladders: the sentinels' Keep the Thread and Alder's Grey Root compose the same way, `ward_line_taken` stamping on both closing links.
- Q. The door back: every fork offer tree forbids its own `<id>_declined` and the giver's hub carries one re-offer choice, except the sentinels, who have no hub and so nag every visit while declined (recorded, not fixed).
- R. The mouths' shapes: Torsten keeps one hub that shrinks for good on `first_line_kept`; the sentinels carry no hub and no old-tongue string is ever rendered.
- S. The cut is deliberate, and a deed: a tile interact only, never a swing or a shot, crediting `wardCut` and regrowing the thread in ten minutes for everyone.
- T. The cairn that fell: zone `turnoff`, two tiles, no light, no board, no body, marking the way to the husk and naming B1's journal landmark.
- U. The owner gates, asked: FieldLitter, `rivalNear`, SmolderHeap minted, and the five §3.1a gates all went to the owner as G1-G6 below.
- V. Names and ids: the module is `content/src/maps/wardthread/`, the zone ids `wardthread` / `picket` / `turnoff`, and one body per named slug (Torsten, Bodil, Hollowhowl) throughout.

The owner's rulings (band8/rulings.md), as built:

- G1. FieldLitter: YES, landed and reachable; dignity 12; proven live at the Felling; unreachable at the husk by the ground itself, so the wound count stands as the husk's honest picture.
- G2. The `goblin_warcamp` rivalDef/rivalNear word: YES, the def edit stands with the frontier test; not claimable live in one day (the boldness clock).
- G3. SmolderHeap: MINTED 548, standing at the Felling; the clamps' furrows now run north-west and stop a cell short (the fix pass, since straight furrows read as domes on stalks at zoom 1.3).
- G4. The five §3.1a gates: recorded ACCEPTED (see the 3.1a band 8 addendum above).
- G5. The proof cadence: kept, one in-game day jumped to each stop, two un-jumped stretches (the hold through 20:30, the dusk stand), one fix pass after the audit and the review together.
- G6. The refusals: kept, plus two more recorded in the fix pass (the client never offers the cut for the cell under the boots; a same-tile blind pair was checked against sightLine and refuted, nothing changed there).

Owed, out of this band for the owner to accept or reverse (see the 3.1a band 8 addendum above for the full text): THE COUNTED PACK, THE TRAMPLED RING, THE UNWATCHED SQUAT STEPS OFF, the litter's dignity 12, the fork rest's `cues.clearing` 4, and the NaN guards. Also owed and refused, with the reason recorded in rulings.md: the stump field north of the yard (the sketch cannot grow a row without sliding the golden anchor); `wolfClear` 30 for authored cells (accepted with the note that the south pocket fells to y -116).

### 3.4 THE THIRD STONE — south, the Old Road

- **The Gloamwood** just past the hem (existing spawns: spider, bat, bear,
  troll) with **PitLamp / PitLampDark** on driven TimberPosts every forty
  tiles, half dark, one buried to the glass in black spoil.
- **The digs** at ~(-108,204) (~165 tiles, tier 2): the **rolled**
  kobold_digs core the frontier deals at [2,4] BOLD+SAT, cell-pinned so it
  stands; SpoilHeap rows in starfall-black across the road, TimberBrace,
  MineCart, DripPool at the warren mouth ("the air below breathes up"), the
  road cracked and dropped a wheel's depth (elev step + CaveRubble), three
  cairns re-stacked with one stone wrong, TallyStone at the mouth. Its
  townward **satellite** is what creeps up the Old Road toward the hem.
- **Aske's toll stone** at ~(-140,182): a milestone Rock with a red chalk
  figure, four tents, a PlunderCart, a Counter with scales, the crew's
  WarBanner flying UNDER a Returner lamp (paid for). **Aske**'s crew are
  garrison rows tribe `reavers` with hours 18:00-06:00 on a road patrol loop
  and holdfast posts at the Third Stone's hearth by day: the Company
  literally keeps the dark miles, and dies for the Returners' lamp when a
  Gloamwood knot wanders in.
- **The Third Stone** = the pinned `third_stone` (-164,192), re-defined as a
  weight-0 variant `third_stone_rest` whose actor pool is Returners (keeper
  **Eskil** + pooled returners) instead of wayward_watch, so the geography
  comment "kept by returners, not Waykeepers" becomes true on the ground.
  WallStone waystation with a PitLamp on a stake in front (never a LampPost),
  MineCart in the yard, LeanLadder, a slate with the stone count
  ("Kingsdelf, forty-one stones, nine lit"), ChestWood of oil jars, four
  claimable beds, a WayShrine the order did not bless.
- **The barrow-side cairn line** runs from the husk through the belts to the
  digs (§3.7); no throat draws it.

**The contention.** Eskil wants the digs collapsed: they dropped one wain
and buried one lamp and "a road that is not there cannot be lit." Aske's crew
will not go near the digs ("we are paid for the road, not for under it").
Torsten says the Third Stone's lamps are lies in glass and he is right: none
has held a night. The kobolds re-stack every cairn they undermine. A Returner
who came back from Kingsdelf says the diggers are thorough and leaves it at
that (the "digging away from something" line is struck: it gestures at the
spine). Varn calls the road "Kingsdelf country" and the digs "not our seam."

**The fork — THE LAMP OR THE LAW.**
- (A) *Nine Lit* (Eskil): carry oil down the Old Road and light five dark
  PitLamps (PitLampDark→PitLamp tile swap, the candle grammar; each stays lit
  until the frontier's next beat snuffs it by a dice authored as the wind,
  so the Returners' shame is mechanical and honest), then break the digs'
  warren mouth (a player clear; the rolled core embers by the ember law and
  the cell rests fallow; the SpoilHeaps stay and the cairns are never
  re-stacked again). Rewards: +returners, a PitLamp as a held light, Eskil's
  bed, Hilde's Kingsdelf shelf opens. Costs: −waykeepers (Torsten's closed
  throat; Hale: "you lit a lamp you will not walk"), flag `seam_broken` read
  by Varn and Ottery, and the shared consequence the frontier already owns:
  the fallow cell backfills at the next wake with whatever the danger row
  rolls, which here is the Gloamwood's own, read in Dawnmead as "more bats
  this month."
- (B) *The Rope and the Bell* (Torsten via Hale): carry the Third Stone's oil
  to the First Lamp instead, post the order's rope-and-bell at the south hem
  (a TimberPost bell the ward rota rings), and walk Aske's crew off the road
  by refusing their toll under the order's paper (fight or pay). Rewards:
  +waykeepers, the grey wool, Hale's post sells lamp glass, the ward pool
  gains a bark. Costs: −returners (Eskil bars the character from the Third
  Stone's beds; Hilde reads their name off the oil list aloud), −reavers or
  + by whether you paid, the character's own Kingsdelf walk later is done
  unlit.
Both set `south_road_taken`, which Wren's send-off reads in one line.

### 3.5 THE SPOIL WOLD — west, the emptiest quadrant

- **The broken barrow** at ~(-256,64) (~193 tiles, tier 2): a kerbed
  GraveMound ring cut open from below where the Doorless warren door coughed
  them up; weight-0 variant `broken_barrow`, family `dead`, tiers [2,4],
  night rows only (20:30-05:30). The kerb is Rock + GraveMound + BonePile;
  FieldCairn where the Doorless re-set the stones they moved (badly).
- **The grub farm** on the barrow's east lip: weight-0 `goblin_grubfarm`
  variant with garrison rows tribe `goblin_doorless`, chief **Grubb
  Turnsoil** crowned via names[]: crooked Tilled furrows, a grub trench,
  GnawTrough, CritterCage of grubs, SkullTotem facing WEST (toward the
  Legion, not the village), tents, a small Campfire (never a Bonfire), the
  warren mouth ringed in SpoilHeap, Brammel's seed-corn sacks with his mark,
  Sorrel's second ram tethered to a BeastStake, crooked hurdles of salvaged
  Fence, no palisade, no banner. The door itself: ArchStone + TimberPost pair
  set flat (no DoorLintel tile; one people, one scene fails the four-scene
  bar).
- **Steinar's chain** at ~(-215,28): the Charter survey camp, CharterPost
  stakes in a ruled line straight across the barrow kerb and the farm's
  furrows to the tin seam, ochre canvas, Lectern chart-table, tally
  NoticeBoard, a Fence begun and abandoned where the ground went soft.
  Surveyor **Steinar** and two chainmen (fordgate actors; the fight in this
  zone is between garrison rows, never actors).
- **Rurik's stakes** every twenty tiles across all of it (BannerStand crown
  dye at three pinned points; Chainman **Rurik** walks a routine between
  them).
- **The pressed satellite**: when the Drum's rolled satellite reaches stage 2
  in the north, the FRONTIER dial `boldness.rivalDef` deals the **Legion's**
  def (a goblin_warcamp of pressed goblins under one LegionStandard, rows
  tribe `legion`) townward into the wold's adjacent cell, so the Legion's
  march toward Dawnmead is made of goblins. The Legion core itself
  (`hobgoblin_warcamp`, Harguk Fiveblows crowned) stands at tier 3 at
  ~(-232,-232), 330 tiles out, never nearer.

**The contention.** Tin for the cold and a grave in the way. Ottery needs
tin (the Scrap Crag's two RockTin are the tutorial's and cannot be more).
Steinar wants the seam chained and the cart road cut. The Doorless were under
it first and are farming. The barrow's dead want it undug. Rurik measures all
three and files "hostile encampment, 41 paces; workings, 60 paces; concession
overrun, 38 paces" and walks on, and his stake is the only proof Steinar's
chain crossed the kerb. Brammel wants his corn; Sorrel wants his ram.

**The fork — THE FARM OR THE STAKE.**
- (A) *Stake the Seam* (Steinar, with Margit's licence): drive the Doorless
  off the mouths (a player clear of the grubfarm variant's garrison; the
  authored site does not ember, its garrison respawns on the site's own
  clock, and the character's flag `grubfarm_burnt` turns every Doorless bark
  and the token on Alder's fence to nothing). Rewards: +fordgate, tin for
  Ottery's shelf (a rare item route, never a tutorial prerequisite),
  Brammel's sacks and Sorrel's ram come home (barks). Costs: Alder's bark
  ("you burnt a field"), the Doorless knucklebone on Alder's fence is gone
  for the character, Rurik files the character as "concession, 1 body."
- (B) *A Crooked Line* (Rurik, with Alder): carry Rurik's stake to Steinar's
  board and pin the past-the-kerb chain on it; return Brammel's sacks from
  the farm by trade (Grubb trades the sacks for the ram, which Sorrel will
  not forgive) or by stealth; hold the kerb one night against the barrow's
  dead so the Doorless can re-set the stones. Rewards: +crown (Rurik files
  the character as "a witness"), the Doorless token (flag `grubfarm_spared`:
  their pickets' warning shout extends to the character, a bark gate), the
  Copse's west shelf. Costs: −fordgate (Steinar's shelf closes; Margit bills
  "a concession stopped"), Sorrel's bark sours.

### 3.6 The belts — the land between the camps

No owner; no fork; this is where the player sees the war without being told
it. Patrol loops are authored to cross here rather than inside camp rings.
- **THE ASHEN HEM** (north-east wedge between the trail and the First Road,
  ~(-40..40, -150..-70)): a stand of oaks burnt to DeadTree and CharredStump
  in a ragged oval, two SmolderHeaps still breathing at dawn, two charcoal
  clamps nobody claims (Bodil says goblins, Grubb's pickets say fellers,
  Torsten's slate says "fire, 3rd night, ours?"), a FieldCairn line older
  than any of them running straight from the husk toward the fen, FieldLitter
  and FallenBanner where a Company crew and a gnoll band met, deer bones where
  the pack drove them into the burn. Torsten's sworn, Aske's crew by night,
  gnoll sentries and the veil pack all loop through it. **The Bone Meadow
  scoreboard**: a flat Waykeeper milestone and a Returner PitLamp beside it;
  setting the milestone upright is a Waykeeper deed, lighting the lamp a
  Returner deed, and a frontier beat (rattleSquatDoors-style, one unit per
  beat) knocks the other flat again keyed on `world:war_near`.
- **THE DROWNED MEADOW** (south-east wedge between the fen and the Old Road,
  ~(-10..70, 130..200)): the brook leaves the south hem and fails to reach
  the fen: GrassTall going to reed, WaterShallow spreading over Grass with a
  stranded skral weir post in it, a drowned PitLampDark, a crofter's Dugout
  beached far from any water it could have floated on, Sorrel's lost fleece
  on a Fence rail, and half a tile under the sheet the top of a re-stacked
  cairn with one stone wrong. FoulPool at the low point; Detail.Mudcrack
  where it drained.
- **THE SPOIL REACH** (south-west wedge between the Old Road and the wold,
  ~(-160..-220, 120..180)): the shortcut the Doorless and the kobolds' spoil
  both cross; deep-grey SpoilHeap dumped along it, Detail.BlightVeins
  following the dumps, a Gloamwood bear's den at the hem with a Charter
  surveyor's kit outside it, a skirmish scar (dropped spade, a snapped
  CharterPost, FieldLitter). Alder counts grey rings here the way Halla
  counts fires and reports it to nobody.

### 3.7 The cairn line

One authored line of FieldCairn / CairnFallen / re-stacked-one-stone-wrong
from the husk through the Ashen Hem to the fen, under the Drowned Meadow, to
the digs. Varn's repeatable errand **The Cairn Line** (count them, report
which stand, which fell, which drowned) pays nothing but Varn's opinion and
sets a per-character tally flag the frontier reads for nothing. His four
theories contradict across four turn-ins and are never corrected. It is the
player's own map of the thing nobody names.

---

## 4. The forks, as a table

| Zone | Pair | Giver A / Giver B | Pays A | Pays B | Shared flag |
|---|---|---|---|---|---|
| East | THE CAUSEWAY OR THE SLUICE | Ingram / Halvor | +fordgate, causeway-pass, corn-carry | +fenside, Dugout, kelp-string token | `fen_side_taken` |
| North | THE PACK OR THE SQUAT | Sorrel / Torsten | +fordgate, fleece cloak, cheaper beasts | +waykeepers, grey wool, Aske's coin | `wool_count_taken` / `tower_debt_paid`, and B's inner `first_line_burnt` or `first_line_kept` |
| North-west | THE THREAD OR THE AXE | a sentinel / Alder+Bodil | +evencourt, moonglass chip | +fordgate, bow-wood shelf | `ward_line_taken` stamps on BOTH closing links (`keep_thread_done` / `grey_root_done` say which) |
| South | THE LAMP OR THE LAW | Eskil / Torsten via Hale | +returners, PitLamp, Kingsdelf shelf | +waykeepers, lamp glass, the bell | `south_road_taken` |
| West | THE FARM OR THE STAKE | Steinar / Rurik+Alder | +fordgate, tin route | +crown, Doorless token | `grubfarm_burnt` or `grubfarm_spared` |

Rails: every offer tree requires `quest:the_first_road:done`; each pair's two
offer trees carry `forbids` on the other's `quest:<id>:active` and
`quest:<id>:done`; opposition costs are AUTHORED in `rewards.standing` and
stated in the offer text (never auto-cross); all standing deltas sit inside
the LADDER CONTRACT caps. New faction ids `returners` and `fenside` are
roster entries (members = real actor slugs; fineActor = Eskil / Halvor) before
any delta compiles. No delta targets goblin, kobold, dead, gnoll, skral,
wolfkin (reputation is for speaking parties only); their side of every fork
is a character flag, a token, a bark gate.

Gates on the tutorial: none of the ten givers is a teacher; Alder's and
Weir's tutorial objectives are untouched (only shop lines change, and only
after the capstone).

THE DOOR BACK: every fork offer tree forbids its own `<id>_declined`, and the
giver's plain hub carries one re-offer choice (Sorrel, Torsten, Alder); the
sentinels have no hub, so their two re-offers are trees that nag every visit
while declined (the house pattern, on the Court alone; recorded, not fixed).

---

## 5. Living-world beats

**Ship in v1 (all compose on existing grammar plus the dials named):**
1. **The ranks re-form at dusk.** Gnoll rows 05:30-20:30 and dead rows
   20:30-05:30 on one husk def, the changeover at half past eight under an
   eye within 20; matrix row `dead|gnoll hostile@10 initiator dead`; three
   stance rows and one server rule (THE UNWATCHED SQUAT STEPS OFF: an
   off-window body nobody watches steps off whatever its state). PROVEN:
   20:37 five gnolls and eight dead in the brazier's light, the crown down
   first, the last two gnolls dead by 20:54, the dead alone on the apron at
   21:00 and after the walk-off.
2. **Worg against wolf on the trail.** The Felling's worg rows wear tribe
   `goblin`; row `predators|goblin hostile@8`. The den's wolves and the
   camp's worgs meet at dusk where the loops cross in the Ashen Hem. No
   authored ground until band 10's Ashen Hem; `goblin|predators` lands
   world-wide (range 8); the far-camp count in the proof's day: no rolled
   goblin camp beside a den in cells cx -4..3, cy -5..2, and the Felling's
   tier-2 grass roster deals no predators, so 0 engagements (empty, honest).
3. **The Drum hunts its deserters.** Row `goblin|goblin_doorless hostile@10
   initiator goblin`; the Doorless night row at the Felling's snag ring meets
   the Drum's pickets. PROVEN live (the fix pass): the Doorless pair on `at`
   posts beside the east snags; the worg and the firecaller open on them
   within the hour.
4. **The dead against the door.** Row `dead|goblin_doorless hostile@8
   initiator dead` at the broken barrow; the Doorless night hoes fight at
   the kerb.
5. **The watch charges what the bar charges.** Existing watchVsMenace: Hale's
   ring and Brede's crew both charge any goblin satellite that seeds between
   them; enemies fighting the same goblins sixty tiles apart (no body on the
   east: satellites never seed in authored cells and both east cells are
   authored; the east's NPC versus NPC is the watch and a crab).
6. **The hired dark.** Aske's rows tribe `reavers`, hours 18-06 on a road
   loop; the haven watch charges any Gloamwood menace; the crew dies for the
   lamp.
7. **Misaligned pairs coexist.** `neutral` rows with range for
   `goblin_doorless|kobold`, `skral|reavers`, `predators|evencourt`,
   `crown|goblin`.
8. **The pressed satellite.** `boldness.rivalDef: legion_pressed` +
   `rivalNear { defId: hobgoblin_legion, tiles: 320 }` on the ROLLED
   `goblin_warcamp` def (G2 YES): the pressed satellite is dealt only within
   320 of the authored Legion's anchor; unit-proven (frontier.test), not
   claimable live in one day.
9. **Smoke that does not bake.** EmberBed / SmolderHeap lights rows
   (COALS-class, flame-gated where man-made) plus a dt-gated `smoke.plume`
   grain in the `collectStaticLights` scan (spawnPortalFx precedent). From
   the gate the player sees smokes when they get there; nothing on the sky
   band (no weather system exists and none is proposed). (The Ashlamp's one
   ember: the exhale is the smoke material's own plume, a 0.06/s die on the
   flame clock; PROVEN at the emit door, five breaths in 90 s at 20:00 and
   none at noon; a screenshot burst cannot prove a one-second roll.)
10. **Bickering on the green.** Two-actor bark exchanges on the closed world
    flags Halla already reads, plus the one new rostered flag `war_near`
    (predicate: two mutually hostile cores inside watchTiles 96). Leif walks
    in daily to chalk the tithe on the green's LampPost and bickers with
    Margit daily at noon (ungated: watchTiles 96 from the speaker cannot
    reach the bar from the green); `toll_near` fires for Hale alone at the
    crofts (R5's survey flag reads pinned defs declaring `toll: true`).
11. **Bodies where the fight was.** GraveComp-pattern spawner: an NPC-vs-NPC
    kill inside a POI zone raises FieldLitter on the nearest free tile for
    the spill's quarter hour, capped six per zone, dignity 12 (one screen off
    at zoom 1.3; the fight it fell in is only a fight under an eye within
    20, so a dignity of 48 could never meet it), never inside a planned
    rect, never on a route, a station or a routine waypoint, two per loop
    and six per cell, no persistence. No loot, no XP, no ember (F2 holds).
    PROVEN live at the Felling (two bodies inside the ring after the
    Doorless fight, read from twenty tiles off). At the HUSK it does not
    land: the changeover's kills fall on the tower's stone floor within two
    of no open tile, and within 12 of any watcher on the apron; the wound
    count on the rows is the husk's honest picture.
12. **The wolves leave, as a reading.** On `ward_line_taken` (A) Alder's bark
    changes; `quest:the_stone_at_dusk:done` (`alder_pack_north`, once); the
    den is never embered by a quest.

**Deferred to THE OVERRUN (Epic 2), owner-gated:** a new ledger verb
(`overrun`, originCell dialect `war:<pairKey>`) so a garrison beaten below a
def floor by NPC kills alone within a beat window embers with the winner's
scatter, scoped to three authored pairs and switchable by a dial. Without it
every camp-vs-camp fight is eternal theatre, which is acceptable and honest
for v1 and is said so here.

**Refused (the critic and both judges agree):** a flood dial patching terrain
rows on a clock; Tilled-under-WaterShallow as a BlobLayer; per-character
tribe stances; a sky-band smoke column; ledger-read tile variants stamped at
composePoi (SlateTally, occupied cages); flag-driven mutation of tutorial-rect
ground (an unlit Campfire, a shut Common gate, DeadTree replacing Copse oaks,
a cold spot surfacing in the granary); a per-family creep dialect; a hooded
LampPost dye band; raids against hamlets (raid dice target player claims
only); a DoorLintel tile.

---

## 6. THE SCARRED LAND — the prop kit

The vocabulary gap is real and clean: today there is no tile for tumbled
masonry, a burnt frame, a charred stump, a standing dead tree, a dead fire
that still glows, battle litter, a cairn, a spoil heap, a claim mark for any
people but goblins and towns, or any ash / bone / blight floor Detail. The
kit's voice is the fifth shelf voice, **LEFT BURNING** (dungeon = LEFT, town =
KEPT, camp = STOLEN, skral = FOUND). Every piece is craftable by a smith,
mason, carpenter or a fire, and seats in four or more scenes; the one-scene
specialists (DoorLintel, MusterPikes, SlateTally, a burnt Bed) were sent back
to the shop.

### 6.1 The id ledger (505+, contiguous, family order; never renumber)

Next free Tile id is **505** (MournerStatue 504); next free Detail is **176**
(DrapeFall band 160-175). `TileDef.variants` is colour jitter only, so every
posture is its own id.

| id | Tile | family | solid | destructible | light / motion | notes |
|---|---|---|---|---|---|---|
| 505 | RuinWallStone | A cold hearth | yes (cover) | no (load-bearing law) | none | run-merges own kind only; separate-masonry law; roofer must exclude it |
| 506 | RuinWallWood | A | yes | charbeam ×3 | none | charred studs + fallen plate; run-merges own kind |
| 507 | CharredBeam | A | yes r.4 | charbeam ×2 | none | diagonal fallen timber, ember checks painted cold |
| 508 | CollapsedRoof | A | yes | roofheap ×3 → CaveRubble | none | rafters through a burnt thatch dome |
| 509 | AshHeap | A | no | no | none | walkable cold ash; PRINT_INK 'ash' |
| 510 | EmberBed | A | yes | no (bonfire law) | COALS row, flame-gated; smoke grain | the night tell of a fresh burning; own scorch pool |
| 511 | ChimneyStack | A | yes, light-blocking | no | none | tallest piece; FADE_TALL; north of a shell |
| 512 | BrokenCart | B field after | yes | cart ×3 | none | overturned, one wheel gone |
| 513 | FieldLitter | B | no | no; server may spawn it | none | shield half / snapped spear / helm / arrows, 4 hashed layouts |
| 514 | ArrowPost | B | yes r.2 | post ×2 | none | fletch colour hashed |
| 515 | FallenBanner | B | yes | banner ×2 | corner samples breezeAt ≤0.05s | field dye hashed from the four-colour set, never a dye band |
| 516 | FieldCairn | B | yes r.34 | no (graves law) | none | knee-high stones, flat marker; the country's plainest grave |
| 517 | CairnFallen | B | no | no | none | the two-state tell with 516; the kobolds' one-stone-wrong is a hash posture of 516 |
| 518 | BeastBones | B | yes r.4 | bones ×2 | none | ribcage on its side; the wreck that stands in for the dead horse |
| 519 | CharredStump | C stripped | no | no | none | worldgen SCORCH emits it at s>0.35 instead of Stump |
| 520 | DeadTree | C | yes | timber law (choppable, deadwood logs, respawns as itself) | limbs at 0.35 wind | trees.ts foliage:0 through the engine switch; FADE_TALL; also worldgen's old-wood snag (3af57ada) |
| 521 | SpoilHeap | C | yes r.4 | rubble ×2 | none | two hashed washes: quarry-brown, starfall-black |
| 522 | GloomStone | D gloom | yes | no | GlowShroom-class cool swell, no gate | Riftgate apron palette |
| 523 | CreepRoot | D | yes r.3 | root ×3, respawn 3600 | none | it comes back; says the spine without a word |
| 524 | FoulPool | D | no | no | cool swell row; scum ring phase drift | sick water; pairs with Mudcrack |
| 525 | CropBlighted | D | no | harvest refused → Tilled | crop wind 0.4 | crop painter path, blight palette |
| 526 | CharterPost | E marks | yes r.2 | post ×2 | none | fordgate mark; run-family for dike lines |
| 527 | LampCairn | E | yes | no (road-faith law) | LampPost-tier warm row, non-occluding, no gate | waykeepers mark; within trailReach of a road only |
| 528 | LegionStandard | E | yes | banner ×3 | cloth breezeAt ≤0.06s | one crimson square with one bar; never a dye band |
| 529 | BoneTree | E | yes r.25 | bones ×2 | hangings ≤0.04s | wolfkin mark |
| 530 | TallyStone | E | yes r.3 | stone ×3 | none | kobold mark; counts small, never 214/215 |
| 531 | WardThread | E | no | thread ×1 (evencourt deed hook) | thread ≤0.03s | evencourt mark; zero light entries |
| 532 | RedRagStake | E | yes r.15 | stakes ×1 | rag ≤0.04s | reavers mark; road_toll / bandit_camp litter |
| 533 | PitLamp | E | yes | no | COALS-class warm row, no gate | the Returners' word against LampPost |
| 534 | PitLampDark | E | yes | no | none | the shame in a tile; candle-grammar swap with 533 |
| 535 | LeanTo | F displaced | yes | tent ×2 | hem ≤0.05s | freestanding prop, not an awning; open face south |
| 536 | Bedroll | F | no | no | none | lie:true candidate if the seating audit admits it |
| 537 | BelongingsCart | F | yes | cart ×3 | none | a household on two wheels |
| 538 | FieldCot | F | yes | cot ×2 | none | lie:true candidate |
| 539 | FenceBroken | G states | no | no | none | Fence-kin in the run mask; passability is the state |
| 540 | SignpostBurnt | G | yes | post ×2 | none | sign read returns a scorched notice |
| 541 | WellFouled | G | yes | no | none | draw-water refused; rag colour hashed (who fouled it stays open) |
| 542 | HedgeDead | G | yes | as Hedge → Dirt | none (the living hedge beside it sways) | joins the hedge coalesce class |
| 543 | LampPostDark | G | yes | as LampPost | none, on purpose | FADE_TALL; frontier creep may swap LampPost↔Dark later |
| 544 | SluiceGate | G | yes | post ×2 | none | board gate on two posts |
| 545 | SluiceGateStrung | G | yes | post ×2 | kelp-string ≤0.03s | the paid variant |
| 548 | SmolderHeap | A | yes | no (bonfire law, cap four per prefab) | COALS-class flame-gated row, plume grain | the turfed dome with a smoking crown, cold by day; museum row; validator's cap of four per prefab (G3 MINTED, band 8) |
| 549 | CourseWall | run family (the eighth run-merging family) | yes (cover) | stone ×3 | none | Dolmen kit; run-merges own kind only; the head column tooths course to course, a full value step off the face on every course |
| 550 | CourseStile | run kin (COURSE_TILES) | no, passable by state | no | none | Dolmen kit; `doorInfo === null`; the two-state tell, not destructible |
| 551 | CorbelCell | discrete | yes, light-blocking | no | none | Dolmen kit; the beehive hut; tallest piece; FADE_TALL; not destructible |
| 552 | PlumbStone | discrete | yes, `tileColliderRadius 0.3` | stone ×3 | bob ≤0.03s (ONE BREEZE) | Dolmen kit; the claim-mark, the `course` influence row's MARK, never litter |
| 176 | Detail.Ash | floor | — | — | — | baked beside Sawdust/Straw |
| 177 | Detail.Bones | floor | — | — | — | den edges, squats, old fields |
| 178 | Detail.DragFurrow | floor | — | — | — | felled rows, cart tracks, spoil paths |
| 179 | Detail.BlightVeins | floor | — | — | — | around GloomStone/CreepRoot |
| 180 | Detail.DarkSpill | floor | — | — | — | blood-dark by value, never red |
| 181 | Detail.Mudcrack | floor | — | — | — | the drained pond |
| 184 | Detail.Chalkline | floor | — | — | — | Dolmen kit; baked beside Ash/DragFurrow; the ash law grain, one axis per tile, never a lattice; 182 and 183 stand reserved by the forest law |

**AshGround (546)** and **GrassBlighted (547)** stay reserved as true tiles
under THE LIVING GROUND (§12.5; owner ruling 5) and land in LG-6; SmolderHeap
548 is a true prop in this ledger, minted band 8 (G3), and does not touch
546/547. The Dolmen's four tiles (549-552) and Detail 184, as built in
band 9b, are rowed above and follow in §11.3. **QuarryFace** and **BoardedAdit**
are deferred (no v1 scene needs them). The Doorless knucklebone and the skral kelp-string on a
fence rail are hashed Detail postures, not tiles.

### 6.2 Art laws the kit obeys

BODY-RULER (the 1.15-tile rig beside every prop; every pass ends with a
day+night character-beside-prop screenshot), TOP-PLANE (every standing piece
shows its lit top at ~syT·0.32), FLAT FORGE / BLOCK LAW (squared filled
quads, one lit facet, minimum feature 0.03s, depth as value steps never
stroked lines), THE ONE RING (cached eight-tap ring for discrete props;
live-stroked exposed silhouette only for the two run-merging ruin walls, the
broken fence under Fence and the dead hedge under Hedge; truly still pieces in
STATIC_RING_TILES), TWO SUNS (highlights face the fixed west art sun), ONE
BREEZE (every rag, thread, hanging and hem samples `rend.breezeAt` with
amplitude clamped so the sample survives ring-cache cadence, under 4Hz),
collect-time light (rows in `lights.ts`, census pin bumped; never queueGlow),
SHADOWS NEVER BAKE, draw-time `const ctx = rend.ctx`, hash deals by `h >>> k`,
WALL-SHADOW LAW (dress south/east/west aprons; the chimney goes north of a
shell so the apron stays dressable), the MournerStatue precedent (pale stone
reads as stone; dark teardrops read as ghosts; cairns and markers stay pale).
Shared inks added to `props/palette.ts`: SCAR_CHAR, SCAR_ASH, SCAR_EMBER,
SCAR_GLOOM, SCAR_RAG_RED, LEGION_CRIMSON, CHARTER_BRASS.

### 6.3 Registration (the thirteen sites, all located)

tilesEnum (family divider "THE SCARRED LAND"); tilesDefs rows (raised +
topColor for standing props); tiles.ts collider radii, DESTRUCTIBLE_INFO and
the DestructibleKind union, LIGHT_BLOCKING_TILES (ChimneyStack only),
nearestFloorTile, the Fence run mask (FenceBroken) and hedge class
(HedgeDead), the load-bearing not-smashable test list with each refusal
argued; lights.ts rows + lights.test census + emitters.test parity;
`props/scarred.ts` PropEntries folded into PROP_PAINTERS with the registry
pin recounted (DeadTree/CharredStump go in the engine tree switch and the
registry's engine-switch pin list); renderer CACHED_RING_TILES /
STATIC_RING_TILES / run-family switch cases / the roofer's WallStone test
anchored on living ids / the collectStaticLights smoke grain / FADE_TALL;
terrain.ts underlay branch anchored on `Tile.RuinWallStone..Tile.SluiceGateStrung`
(living endpoints) and the six Detail bake branches; footprints PRINT_INK
'ash'; trees.ts snag species by hash; the crop painter's blight palette;
debris.ts SmashKind (charbeam, roofheap, root, thread, cot) + main.ts boom
classes; museum.ts wing "The Scarred Land" (coverage pin, strays gallery
quiet); editor palette category 'scarred'; prefabs.ts local legends
(punctuation shadowing globals) for `poi_burnt_steading`, `poi_field_after`,
`poi_muster_ground` and a re-dressed `poi_watchtower_husk` (FILE-WINS: delete
its seeded JSON on every deployed data dir); pois cues.scatter rows by Tile
name on forest_ruin / watchtower_ruin / greatkeep_ruin / dead_muster /
hobgoblin_warcamp / wolfkin_den / kobold_digs / road_toll / bandit_camp /
fellers_camp / timber_poachers; `cues.trampled` (THE TRAMPLED RING: a
beast's felled ring is grass and never a stump; only beside a `clearing`)
joins the composer's cue vocabulary, band 8; dungeon dress.ts stories 'burnt_steading' and
'the_tally'; influence.ts litter vocab 'ruin', 'blight', and claim-marks per
family (plunder→RedRagStake, den→BoneTree, digs→TallyStone/SpoilHeap,
neutral→CharterPost/LampCairn by road proximity); server interact hooks
(SignpostBurnt scorched notice, WellFouled refusal, CropBlighted harvest
refusal, FenceBroken passable by solid:false).

### 6.4 Kit phases

- **K0 THE SHEET** (half day): ids, TILE_DEFS, inks, museum wing stubs, palette
  category, test pins. Every id exists and the strays gallery is quiet before
  any brush.
  *As built (2026-09-04):* ids 505–545 and Details 176–181 landed exactly as
  the ledger; every registration site in §6.3 that K0 owns is paid (defs,
  colliders, 20 DESTRUCTIBLE rows + ten SmashKinds with minimal kits, the
  chimney as the kit's one light blocker, FenceBroken in FENCE_TILES,
  HedgeDead in HEDGE_TILES, RUIN_WALL_TILES + isScarredTile on living
  endpoints, five lights rows with census + parity goldens, FADE_TALL_PROPS,
  the terrain underlay branch with per-family fronting, six first-pass
  Detail bakes, the museum wing, the editor category, the `scarredLand`
  local legend). Painters are squared-block stubs in the family inks
  (props/scarred/stub.ts) that already obey the block, top-plane, ring and
  draw-time-ctx laws; the DeadTree grows a real snag through trees.ts
  (species by hash, foliage 0, dead bark); CropBlighted rides the crop
  painter path with a blight palette; the state ids wrap the living
  Signpost/Well/Fence/Hedge/LampPost painters. Registry pin 282 → 317.
  Deferred to their phases: smoke grain, PRINT_INK 'ash', influence litter
  vocab, cues, dungeon stories, server interact hooks, the sketches.
- **K1 THE COLD HEARTH**: family A + Detail.Ash/Bones + EmberBed row + smoke
  grain + the 'smolder' proximity voice (granular crackle one-shots on the
  falling-water pattern; never a noise bed). `poi_burnt_steading`; the
  re-crested husk. Gate: a shell beside a character at noon and midnight,
  embers visible only at night.
- **K2 THE MARKS AND STATES**: families E and G. The cheapest faction
  visibility in the world: five peoples finally have a glyph. Cues and litter
  vocab per family.
- **K3 THE FIELD AFTER AND THE DISPLACED**: families B and F +
  Detail.DarkSpill/DragFurrow; `poi_field_after`, `poi_muster_ground`; the
  FieldLitter spawner (owner-gated server verb).
- **K4 THE STRIPPED LAND AND THE GLOOM**: families C and D +
  Detail.BlightVeins/Mudcrack; worldgen SCORCH honesty (CharredStump);
  DeadTree through the timber law. Owner sign-off on the worldgen touch
  (it changes every burn country's look); parity + render-perf check before
  deploy.
Each phase closes with the pins bumped, a museum wing walk, the day+night
screenshot audit, parity 7/7 at q=0, and a commit.

---

## 7. THE DAWN UNDER SIEGE — the village redesign

> **OWNER RULING 2026-09-04 (supersedes the re-dress framing below):
> Dawnmead is REBUILT from the ground up, not re-dressed.** The shipped
> `maps/dawnmead.ts` was littered during prop development with placeholder
> props sprayed without semantics, scene or care; the owner's verdict is
> "mushed, scattered, haphazard." Band 2 therefore writes a NEW zone file
> on a blank rect. Only the sacred pins of §7.1 carry over (the rect and
> anchor, the spawn, the seven stones and the Ring pad, the three route
> heads and lane rows, the sixteen cast slugs and their posts, the
> singleton stations, the tutorial ladder's open ground, the corridor
> law). Everything else in §7.3 is a DESIGN BRIEF for the new file, not a
> diff against the old one. The old file is kept in git history only.
>
> **THE CURATION LAW for the rebuild** (binding on every district):
> 1. **Every prop has a sentence.** Before a tile is placed the author can
>    say who put it there, when, and why it is exactly here and not one
>    tile over. A prop without a sentence is not placed.
> 2. **Scenes, not scatter.** The unit of authoring is a scene (a working
>    yard, a hearth, a gate, a grave row, a kitchen garden), composed with
>    a primary mass, secondary support and tertiary life, on its own
>    worn ground. No prop stands alone on lawn; no two scenes touch.
> 3. **The ground is authored first.** Desire lines, aprons, yards, worn
>    thresholds and the fold field (§12) are laid before a single prop, so
>    props sit on ground that already explains them.
> 4. **Breathing room inside the rect** as outside it: open meadow between
>    districts is composed, not left over; the eye rests between scenes;
>    ≥3-4 open tiles between free-standing structures; one sign per
>    eyeful; the middle of every yard has a reason.
> 5. **Nothing is a placeholder.** No tile ships that the museum has not
>    judged; no decorative kit is used outside its voice (KEPT for the
>    village, LEFT BURNING only at the scars, never STOLEN inside the hem).
> 6. **Three passes minimum**: block-out (ground + masses, walked and
>    screenshot at gameplay zoom), dressing (secondary + tertiary, judged
>    scene by scene day and night), and the live audit (routines, sight
>    lines, occlusion law, pockets, sign law), with the sealed-pocket and
>    reachability floods and the full quest ladder walked on a fresh
>    character before the band closes.
> 7. **The mandate of §7 stands as the brief**: a hearth-country with a
>    burnt roof on its skyline, a grave row on the road out, families under
>    sacking at the gate, a muster that musters, and three outside voices
>    arguing on the green. Explorable, flush with detail, semantically
>    whole, nothing sprayed.


Dawnmead stays the village that raises wakers, but the year has been bad and
the village is the first place a waker learns that. Not sacked, not a
warzone: a hearth-country with a burnt roof on its skyline, a row of graves
on the road out, three families under sacking at the gate, a muster court
with bodies actually standing on its line, and three outside voices arguing
on the green about whose fault the road is. Every scar has two or three
village explanations and none agrees. Nobody says "the deep." Weir says the
brook is up a finger again, Brammel says the rats came back a season early,
Halla says one fire too many, and the player walks out of the gate carrying
all of it.

### 7.1 What stays (the keep list)

The rect, the anchor, safeR 64, the spawn, the seven PillarStones and the two
fallen Rocks and the Ring pad (no new prop within eight tiles of the stones;
nobody explains the Ring), the three route heads and the lane rows, all
sixteen actor slugs and their posts (new throats are added, none replaced, no
routine waypoint moves), the seven singleton stations and the two-each ore
rocks, the sixteen-quest ladder and every objective's open ground (rats in the
open, crab bank, berry banks, the crag, the pier stopping mid-channel, the
three schools), no fountain and no founder statue ever, the corridor law, the
awning host pairs, the KEEP_OUT rects (new ones added, none shrunk).

### 7.2 What goes (the leftover census)

- Cottage Row as three identical empty stamps with lit hearths and no lives.
- The green's two vendorless MarketStalls: a shop nobody keeps.
- Eight festival banner poles (four on the green, two at the gate, two at the
  bridge): a fete waiting for a fete. Cut to the green's north pair and the
  bridge pair; the gate pair become faction stands in two different dyes.
- Four StreetPlanters and six FlowerBoxes: municipal hanging baskets beside
  a burnt roof. Keep Wren's two.
- The global flower scatter over 43,000 grass tiles (0.05 → 0.015 outside the
  Ring, the orchard and Wren's garden, which stay kept on purpose).
- The East Wold: a district the plan names and the file leaves empty.
- The old-road spur: a hundred rows of ruled two-wide Dirt with one sign.
- The inn pennant (festive). Both NoticeBoards mute. Quiet-quarter vignettes
  that read as scatter.
- "Halla musters at seven" on a sign above an empty muster line.

### 7.3 District by district

| District | After |
|---|---|
| **The Ring and the west meadow** | Identical inside eight tiles (the box (64,100)-(93,124) is stamped from a golden literal; J17). Beyond: THE BURNT COTTAGE stands on the west meadow's edge, three columns off the box (J1): shell (54,100)-(61,107) of RuinWallWood with RuinWallStone at the four corners, open face south, ChimneyStack (59,100) standing in the north run, EmberBed (59,101) on a Dirt-under-Ash floor (J14), CollapsedRoof (56,102) (58,105), AshHeap, CaveRubble and CharredBeam as walkable debris, GrassTall through the ash, a BelongingsCart (63,108) of salvage. One board, HOBB'S COUSIN'S ROOF at (53,109): "Went up in the spring." / "Nobody agrees how." The desire line is two lines, not one: the Ring's trace from the pad's west bite to the open face (G8), and the cousin's way curving from the lane south-west to the shell's east corner (G9), because feet went to look. THE SURVEY LINE at y128: two CharterPosts ruled eight apart (40,128) (48,128) and the fallen third as the Rock it was footed in (56,128) with brass chips (Pebbles) beside it; a chain leaves no path. One DeadTree at the west hem (11,108). The first eyeful after waking: seven pillars, the shell's stack top-left, and a lane of lamps going the other way; the thin smoke is a dusk sight (see §13.4). |
| **Keeper's Way** | Untouched as a home. TiedParcels on the porch step (letters going out with whoever walks east). Wren's hub gains one `threat_near` line: "Halla is counting again. I knit; it comes to the same." Wren offers **no** theory about the cottage (her refusal is her position). |
| **The Green** | Still grass, but argued on. The well court's stone ellipse, Well, TownBell and NoticeBoard are kept pins (ruling 11); the NoticeBoard is a mute tile. Wear is Dirt in wobbling lines: the inn's south desire line (120,110) to (120,106), Hilde's way from the ginnel to the bell bench, the twins' worn patch; the well-to-bell line lies on the court's own stone and is carried by pebbles. THE TALLY STALL is a new placement on the green's east verge on its own Dirt ellipse: MarketStall (129,106) (the one MarketStall), Table (127,106) (128,106), Lectern (128,108), BannerStand weld (130,107), CrateStack (126,108), CrateGoods (130,109); Margit (129.5,107.5) by day 7.5-18.5. A Bench (110,108) by the bell where Hilde sits 11.25-13.5, staged from the court's stone (110,109) (she is seated by twelve). Leif's midday stops: the stall front (128.5,109.5) 10.5-12 and 12.5-14, the bell side (112.5,109.5) 12-12.5. The tally rides the DAWNMEAD post's lines 2-4 (ruling Kit 5): "Carts turned, fen waist: four." / "Lamps out past the gate: two." / "Signed for the Charter." Two banner poles (the north pair, shipped dyes), one StreetPlanter (132,114), the great oak, both benches; the south poles, three planters, both flower boxes and the StoneBench (112,110) are cut (J8). |
| **The Five Stones inn** | Fuller than it was: crates and baskets in the wing aisle (aisle stays one wide), two crofter children's things on the common-room floor, the pennant down. Gilly: "Four beds, and I am making up floors. Do not tell Berrit I am winning." New throats get their own beds: Margit BOARDS WITH HILDE in the second Bed run of Hilde's cottage (J2, ruling 5: Gilly refused the Charter chit, Hilde took it), the crofters on the crowded roof; the four claimable guest beds stay the waker's. Steinar's inn bed is owed to the barrow band (J20). |
| **Cottage Row** | Two roofs, not three (J1, J3). WEST: THE RETURNER'S HOUSE (Hilde), (79,83)-(86,90), hedge unclipped, a PitLampDark (84,91) one tile east of her door line (ruling Kit 9); two Bed runs inside, (80,84)/(80,85) Hilde and (83,84)/(83,85) Margit. EAST: THE CROWDED ROOF, (94,85)-(101,92), east of the orchard walk's bend: two crofter families in one house, three Bed runs (95,86)/(95,87) (97,86)/(97,87) (99,86)/(99,87), crates, BelongingsCart in the yard, WaterTrough, two sheep in a RailWood pen (103-107,85-90) whose gate is the ONE-tile gap (105,90) (ruling Kit 14), DryingRack. Between the roofs the walk's bend and the cart; the empty west end where the cousin never built. THE BURNT COTTAGE is the west meadow's (above), not the Row's. |
| **The farmstead** | Robbed by weather and rats, not raiders: two crop rows to bare Tilled, pumpkins short two, a second CritterCage outside the coop's west rail at (99,59) (one open tile from the orchard's skep), a CharterPost at the barn's wain door. Sign BRAMMEL'S FIELD (117,30): "Six beds, three crops," / "one man who wants rain." THE COOP board is cut (its lines are Brammel's bark). (No tutorial quest collects carrots, onions or bittercress; verified.) |
| **The Common** | Contested grass, x96-134 (J4): the crofters' three ewes east, Brammel's two cows west, the hay at the north-west rail (the far rail from the ewes), two CharterPosts (98,72) (98,76) inside the west gate, FenceBroken at the south-east corner (133,82) (the crofters' way in). Brammel vs the crofter at the west gate at midday: Brammel's added slot runs 11.0-12.75 (he is inside the gate at (97.5,74.5) by about 11:50 and leaves at 12:45; a 63-tile walk from the field), the crofter paces outside it 12-13. "His common is grass. Ours is ash." Sign THE COMMON at (95,79). The gates are FenceGate tiles drawn shut by the tile art under "the gate stays open": a dressing-pass flag, shipped tiles (J19). |
| **The orchard and the trail head** | Kept. At the hedge arch, not on the trail: two DeadTrees (64,23) (73,23) where bark was stripped, Rill's marks as ArrowPost (66,28) (70,28) in her own fletch colour with a BonePile (66,29) at the foot of one (J13: RedRagStake is the reavers' rag and has no plain-rag posture), the trail's first ten rows worn three wide. Sign THE ORCHARD at (90,28) by the trail; HUNTERS' TRAIL (62,28). Rill's one new line stops at "The wolves came down to the arch in the spring. They do not come to be fed." |
| **Weir's fishery** | Weir's record made visible as placement, not notches (ruling 12, J18): four TimberPosts marching up the near bank away from the water, (158,58) oldest at the shallow's edge, (156,57), (154,56), (152,55) newest, each one row higher and two columns further from the water. A second WeirPanels (156,42). The lane's east lamp stands at (156,109) on the bank at the bridge's west foot (the shipped (157,109) was the brook's shallow and never stood). Otherwise the one calm district. |
| **Sorrel's yard** | A BrokenCart she is fixing unasked, FieldLitter by the gate where a load spilled, a third HitchingPost for the carts off the road. |
| **Ottery's works** | Making swords now, not stools: a SpearRack beside the WeaponRack, a charcoal BarrelStack, Alder's log supply short. "I would like to make one stool this year. One." / "Make it a sharp stool." |
| **The cookhouse** | Feeding more than the table seats: a second bench pair (124,134) (125,134), a CrateStack (133,133) of the crofters' bowls, the kitchen garden picked to the stalks, the Woodpile doubled (127,124). The supper court's Campfire (129,144) is the only Campfire in Dawnmead. THE LONG TABLE board is cut (Berrit's bark). Berrit never discusses the winter. |
| **The muster court and the count-knoll** | A muster that musters: a fourth Vale Ward on `dawn_ward_muster` standing the line at (98.5,120.5) 7-19.25 and walking the spur to THE FIFTH BUNK (104,184)/(104,185) in the lodge; the day ward keeps THE HOT BUNK (106,181), so the fifth bunk is the one that is warm at nineteen when the day ward is up (ruling Pins 3). THE MUSTER LINE sign at (95,124) inside the court's dirt: "Bridge by day, green by night." / "The line, seven to seven." / "Fires this spring: one." / "That is one too many." HALLA'S CHART at the line's east end: WallWood stub (103-105,121), board awning (103-105,122) charcoal, Table (103,123), Lectern (105,123). The box's NW rim (NoticeBoard (93,119), WeaponRack, ArmorStandFull, benches) is kept as shipped (J7). South of it THE COUNT-KNOLL: a level-1 raise (100,138) 7x4 with three Ramps on its south face (102..104,141), StoneBench (102,139) and Brazier (104,139) inside the rim, a sightline down the spur to the notch. Halla's dusk stop is an ADDED slot 19.5-21: she climbs the ramp and SITS on the bench facing south (ruling 4); her post does not move. The Brazier burns as a flame emitter with a ground glow and is not a night light in the renderer's lights row (J15 fallback shape); "she lights it herself at dusk" is a bark. `hasElev` flips; content.test pins exactly one raise and the round trip. |
| **The pell yard and the lodge** | ArmorStand to ArmorStandFull, FieldLitter at the scarred wall's foot; the yard is x86-105 y151-172 with four open tiles to the butts' fence; the lodge is twelve wide (96-107,176-187) and the spur bends round its gable (J5); five bunks, the fifth for the muster ward. The lodge's shipped LampPost (110,173) is not placed (the S3 corridor). |
| **The butts and Rill's shed** | Untouched except a second stave rack and shavings spreading to three tiles; the east downrange gate is gone and the walk-in is a north FenceGate (47-48,153) at the shooting line (J5). The shooting ground and the three marks are worn Dirt with ragged rims, not squares (fix pass 2). She whittles when worried. |
| **The spark circle** | Varn has been testing the cottage ash: an AshHeap on the pad's east verge with CrateGoods marked 'samples'. "Ordinary ash lies down. This sat up. I have written it down. Nobody will read it, which is the usual." (He does not know why.) |
| **The Copse, the log yard, the crag** | Two oaks felled out of turn (Stump + FelledLog at (24,138)/(25,138) and (27,128)/(28,128)), one DeadTree (18,200) at the stand's south end that Alder will not fell. The shipped stand (31,158) is struck: it stood on the log yard's Dirt and came up inside the yard once the yard's rim ragged. The crag gains a SpoilHeap (21,209), the MineCart (24,214) and a CharterPost (26,214) at the tin's foot; ore rocks unchanged. |
| **The old granary** | Already the right voice. Rats back a season early: one knot on the breach apron (142.5,172.5) so the fight reads from the road, a SpoilHeap (152,159) replacing one CaveRubble, a second BurialUrns (140,166). The track off the spur bends at (137,167), runs ruled down the shell's west wall (a wall is its edge), turns two rows under the wall and joins the apron at (141,172) (fix pass 2; the shipped track dead-ended against the wall). Sign THE OLD GRANARY at (137,152): "Rats took the roof" / "year before last." / "Back early this year." Nothing surfaces on a flag. |
| **The brook, bridge, ford** | Dirt shoulders where wheels leave the Path (the bridge feet, the gate, the works' apron); the two bridge poles at the bridge's WEST foot only, (155,108) (155,116) (ruling 9; the east pair cut); a FieldCairn (167,148) on the east bank where the crofters crossed. Berry banks untouched. |
| **The crab bank** | Untouched. The first mark for a beginner stays the calm one. |
| **THE SACKING ROW** (the East Wold) | The wold hedge gains a south leg the crofters put up themselves (J11, ruling 7): Hedge (172-177,100) + (171,100-104) + (165-170,104), gap (163-164,104) open to the bank (the water way); two oaks (165,101) (169,102) north of the leg. The row stands on the leg's south face, x163-171 y105-108, on a trodden Dirt ellipse (167,106.5, 4.5, 2): LeanTo (164,105), LeanTo (168,105), FieldCot (170,105) (no TentHide: war-camp voice), Bedroll (165,106) (a day camp; not a lie stop), CrateGoods (166,105), WaterTrough (163,106), DryingRack (169,107), EmberBed (167,107) over a six-tile ash pan (never a Campfire), BelongingsCart (170,107), FieldLitter (169,108), BrokenCart (171,108) at the lane's verge. ONE BrokenCart serves the row's sentence and the gate's. The gate lamps stay at 172/184. No sign. The crofters lie on the crowded roof; crofter A's dusk walk home runs the whole lane at 19. |
| **The First Road gate** | Still the send-off, now with a cost: BannerStand woad (179,115) by the WayShrine (waykeepers), BannerStand weld (180,108) across the road (fordgate), never madder (J10); a CharterPost (187,110) at the milestone; the row's BrokenCart at the verge; Dirt shoulders. Sign THE FIRST ROAD (182,116): "Amberford, a day east." / "Lamps to the fen waist." / "Then ask Hale." Leif's in-rect body stands the tally stake at (186.5,109.5) by day; at night he walks to the stand between the threshold stones (190.5,112.5) and waits facing east (J12's fallback, taken in fix pass 2: the out-of-rect target was a thicket in the edge-wood). Hale himself and the First Lamp body are outside the rect and are band 7's. |
| **The old-road spur and THE ROAD ROW** | Worn hard for the rows feet use (the knoll, the graves, the lodge), bending round the lodge's gable on x108-109, then breaking to single tiles with GrassTall between. THE ROAD ROW stands SOUTH of the kitchen garden at (109,150)-(118,162) with the rail's gap at (110,156) (J6): three cut Gravestones and one GravestoneTall under an oak, ONE GraveMound with no stone yet (a crofter's dead from the drowned crofts), StoneBench, a FieldCairn where the path meets the spur, Tuft not flowers. THE OLD ROAD board at (112,171) on the shoulder: "Kingsdelf, forty stones and one." / "Dark past the third." / "Ask at the Stone." Three mouths: Halla "Two of mine, years back. I counted them once, out loud." Gilly "The new one came up the old road in a cart." Alder "Those stones are older than this year. They cut them fresh." Past the row a ColdCamp on a worn ellipse (111,197), two DeadTrees framing the notch, the edge woods thinned so the road out reads as a road into something. |
| **The quiet quarters** | The breathing room, kept empty on purpose. A DeadTree (14,40) and rocks at the north-west hem; the high meadow's stags gone. The survey posts are the west meadow's (above). |

### 7.4 New throats (all names verified collision-free against content, docs and the bible on 2026-09-04)

| Slug | Who | Faction | Post | Bed |
|---|---|---|---|---|
| `charter_margit` | Margit, tally-clerk | fordgate member | the tally stall (129.5,107.5) 7.5-18.5 | Hilde's cottage, the second Bed run (83,84)/(83,85), stand (83,86) (J2) |
| `returner_hilde` | Hilde, Returner widow with the oil-subscription slate | returners member (never a fineActor) | her own step (83.5,91.5); the bell bench (110,108) 11.25-13.5 | her own cottage, (80,84)/(80,85), stand (80,86) |
| `fenside_crofter` ×3 (pooled, titled, no names) | the drowned-out | none | A the sacking row's coals (166.5,107.5); B the crowded roof's pen gap (105.5,91.5); C outside the Common's west gate (94.5,74.5) | the crowded roof: (97,86)/(97,87), (99,86)/(99,87), (95,86)/(95,87) |
| `waykeeper_leif` | Leif, Hale's lamp-boy | waykeepers | the tally stake by the milestone (186.5,109.5); the stall front 10.5-12 and 12.5-14; the bell side 12-12.5 | none inside the rect: he waits the night between the threshold stones (190.5,112.5) facing east; the First Lamp body is band 7's (J12) |
| `dawnmead_ward` (fourth) | the muster ward | fordgate enforcer (as the other three) | the muster line (98.5,120.5) 7-19.25 | THE FIFTH BUNK in the lodge (104,184)/(104,185); the hot bunk (106,181) stays the day ward's (ruling Pins 3) |

Delete "the worn cottage" and "the green cottage" from the table: Cottage Row has two roofs (Hilde's, the crowded roof) and the burnt cottage stands on the west meadow.

Names retired from the drafts and why: Marit (one letter from three Marens
and used for three different people), Ketil (Pinewatch's Kettil), Oddny
(beside Sergeant Odessa on the same quest chain), Tobin/Brenna/Larch
(near-collisions), Cassen (Ferrick's dead father; a toll wearing the victim's
name says aloud the thing Ferrick carries unsaid), Corwen and Sigrun (taken).
The `tools/voice/names.mjs --collide` gate lives only on the dialogue
worktree branch; run it there, or grep the three sources by hand from main.

### 7.5 Who bickers (canon-checked)

Existing pairs from the bible keep their edge and gain the year: Wren vs
Alder (why Rowan left; now "a man who has finished choosing does not leave
when the fires start"), Wren vs Varn (she will not hear his cottage-ash theory
either), Tansy vs Wick (the sixth stone burned it / the thatch was rotten),
Gilly vs Berrit (who feeds the crofters; the score lives in Gilly's head),
Berrit vs Varn (two scorch smells now), Halla vs Brammel (the Charter man's
drought in the middle of the weather trade), Halla vs Sorrel (the yard gate
she also fixed, also unthanked), Alder vs Ottery (green wood: "It IS a bad
year. Ask the stand."), Weir vs Brammel (the water is up / water goes up).

New pairs: **Halla vs Hale** is an old comrade's quarrel, not a rival
order's: Halla was Wayward Watch, which is the Waykeepers' own roadwardens
under Hale's rota; "Your lamps stop at the fen waist." / "Our lamps stop
where the road stops being walked." Both right, neither says so. **Margit vs
Leif** on the green (who pays for lamps and who walks them; four carts vs
three carts and a barrow, contradiction canon). **Hilde vs Leif** (the lamps
are a decision, not a weather). **Margit vs Gilly** (a Charter chit for a bed
she wants coin for). **Brammel vs the crofters** (his common, their ash).
**Rill vs nobody**: three families have walked in off roads and still nobody
asks the one person who did it as a child what that is like.

### 7.6 Build notes (the laws the live audit wrote, applied)

`sign()` after every fill that could cover it (the desire lines, the gate
shoulders, the chart's verge, the knoll raise and the spur re-wear all touch
tiles under boards). Awning host law for Halla's chart (wall run first,
canopy directly south). Sealed-pocket flood for the crowded roof's beds, the
wing aisle and the pen: write the throwaway flood that reports unreachable
FLOOR tiles. Green is grass: wear is Dirt in wobbling one-wide lines and
ellipses, never a rectangle; graves stand on grass. An OPEN worked yard (a
farm yard, a smoke yard, a harvest corner, a shooting ground) goes down
through `wear.rect`, whose rim rags on the hash; only a FENCED yard or a
floor keeps `fillRect`, because a rail or a wall is its edge. A one-wide leg
that runs along a wall may be ruled for the same reason. Ruins grow weeds.
One Signpost per eyeful. The eyeful is 48x45 tiles at the shipped camera
(yScale 0.6, zoom 1), so two Signposts share a frame when |dx| <= 24 AND
|dy| <= 22; shingles (a HangingSign on its own frontage) are nameplates and
exempt. lint.ts measures every pair; the ledger stands at 18 Signposts and 5
shingles with no pair inside a frame: THE COOP, THE STALLS and THE LONG
TABLE are cut (their lines are barks), THE ORCHARD stands at (90,28), THE
MUSTER LINE at (95,124), THE OLD ROAD at (112,171), THE OLD GRANARY at
(137,152). Singleton pins: the refugee fire is an
EmberBed. Elevation law for the knoll (rim auto-fences to Cliff; keep props
inside x101-105, y139-140; the spur's Dirt at x107-108 is clear of the rim).
KEEP_OUT: add the sacking row, the Road Row, widen the south notch. Scatter
order: authored Tuft after the scatter. Occlusion law: nothing tall one or two
rows south of doors, stations, signs, posts. Ruling Kit 11 ("do NOT change the
renderer") scoped daytime smoke. Fix pass 1 changed one renderer law,
`mintAlpha` reads 1 inside a bake (bakeVeilFull or bakingMask), so a static
prop whose sprite first mints on a bake frame is never frozen at 1/9 alpha
for the life of the bake (the burnt cottage's stack, roofs, beam and heaps
read at 57/255 in every band canvas before it); parity 7/7 on the golden
set. Routine laws: post-is-the-origin,
night paths end `lie:true` on the foot tile of a two-tile head-north bed,
every lie/sit stop stages on a walkable cardinal neighbour. A once-path's
arrival time is its walk length over its speed (1.3 t/s is 46 game minutes
for 50 tiles at 50 real seconds per hour); a stop that must be seen "at
noon" starts its slot early enough to be there: Brammel 11.0, Hilde 11.25.
An out-of-rect night leg is accepted by the runtime but stands in worldgen;
use it only where the tile is proven ground. Dialogue rails:
world flags closed, node ids frozen, node text ≤480, choices ≤90, whole
sentences, no dashes, Berrit never discusses the winter, Wren never explains
the Ring, Wick is never corrected. GEOGRAPHY-DOC PURITY at rollout (the zone
has never been rolled to prod; the two new pinned sites need the Studio
append if the prod doc is tool-edited).

### 7.7 As built 2026-09-05 (Band 6)

The rulings below are binding on every lane that touched Dawnmead this band; where a later fix pass overtook a ruling's letter, the proof stands here in its place.

- J1. THE BURNT COTTAGE stands on the west meadow's edge, not on Cottage Row; the Ring box is sacred and the first eyeful's own sentence outranks the table's old cell.
- J2. Margit boards with Hilde: two Bed runs share Hilde's cottage; the Margit and Gilly quarrel is barks, since Gilly refused the Charter chit and Hilde took it.
- J3. Cottage Row slides west and the crowded roof steps east of the walk, with the orchard walk bending between the two roofs.
- J4. THE COMMON shrinks to x96-134 so Sorrel's rails stand four clear, with FenceBroken, the hay and two CharterPosts placed as the plan now says.
- J5. Sorrel's south rail moves to y86; the pell yard is x86-105 y151-172; the butts' downrange gate is gone for a north FenceGate walk-in; the lodge is twelve wide with the spur bending round its gable.
- J6. THE ROAD ROW stands south of the kitchen garden with a one-tile rail gap; THE OLD ROAD board sits six rows south of its rail.
- J7 (as built). HALLA'S CHART stands at (103-105,121-123); THE MUSTER LINE board moved to (95,124); the court's north-west rim is kept as shipped.
- J8. THE GREEN keeps its shipped well court, Well, TownBell, NoticeBoard, the great oak, the north poles and all four lamps; the south poles, the extra planters, both flower boxes and one StoneBench are cut; THE TALLY STALL is a new placement on its own Dirt ellipse.
- J9. THE HOMESTEAD TRACK runs east of the inn from the Common's south gate to the lane near the stall; the inn's south desire line is wobble Dirt.
- J10. Dyes are fixed for good: fordgate and Charter wear weld, waykeepers wear woad, the Crown wears ochre; no faction stand ever wears madder.
- J11. THE SACKING ROW stands on a new south leg of the wold hedge as a day camp with no TentHide; the crofters lie on the crowded roof at night.
- J12 (as built). Leif's out-of-rect night target proved to be worldgen grass, not the First Lamp; the fallback stands him between the threshold stones, facing east.
- J13. Rill's marks are ArrowPost with a BonePile, since RedRagStake has no plain-rag posture and reads as the reavers' rag.
- J14. Inside the rect, ash is Detail.Ash plus AshHeap, CaveRubble, CharredBeam and GrassTall; the burnt shell's floor is Dirt under Ash.
- J15 (as built). The knoll's Brazier stands and burns as a flame emitter with a ground glow, not in the renderer's lights row; the line about her lighting it herself is a bark.
- J16 (as built). The eyeful measures 48 by 45 tiles with the pair rule dx within 24 and dy within 22; THE COOP, THE STALLS and THE LONG TABLE are cut as barks, several boards moved, and the ledger stands at 18 Signposts and 5 shingles with no pair sharing an eyeful.
- J17. The Ring box is stamped from a golden literal after the scatter step, so it stays byte-identical by construction.
- J18. Weir's record is four TimberPosts marching up the near bank, the oldest at the shallow's edge and the newest highest and furthest from the water.
- J19 (as built). The shipped lamp post at the brook's west shallow never stood and moves to the bank; the log yard's shipped oak is struck; the lodge's shipped lamp post by the gable is not placed; the pell hay bale and the gate's drying rack land where the pocket flood cleared room for them.
- J20. Steinar is not placed this band; his inn bed is owed to the barrow band, and the four claimable guest beds stay the waker's.

Owed to the dressing pass (section 6, not defects): the list below reduces
to nothing this band. The Common's west and south fence gate tiles (D5) are
recorded closed. The ward body's def name (E9, the ward wears its post:
"Dawnmead Ward" / "The Vale Ward") is recorded landed. The crofters' way in
beside the homestead track (E8, the crofters use the track) is recorded
landed. The count-mound, revetted (owed D2) is recorded closed as owed.md
rules.

---

## 8. Canon work this epic owes (Band 0)

- **The Dawnmead bible header** ("Dawnmead is the calm one. Nothing here is
  cosmic.") is rewritten in the same register: the trouble is still the
  plainest trouble there is, and this year it walked in the gate. The Road
  Row, the burnt cottage, the sacking row and the Old Road become bible
  entries; every new throat gets a full Life/Wants/Carries/Knows/Room/Threads
  entry **before** a line is written.
- **README T-rows**: Dawnmead↔Third Stone↔Kingsdelf (Liv, Soren, Yeva: the
  Returners' far end), Dawnmead↔Fenside↔Amberford (Aldis's fourth duration),
  Dawnmead↔the First Lamp↔the roads file (Hale's post made ground; Halla's
  Wayward Watch years under his rota).
- **factions.ts roster**: `returners` (members eskil + hilde + the
  third_stone_rest pool; fineActor eskil; oppose waykeepers .25 as a standing
  feud, never blade) and `fenside` (members njal + the crofter pool;
  fineActor njal; oppose fordgate .25). Roster cap 12 (6 used) has room.
- **stances.ts**: declare tribes `gnoll`, `dead`, `kobold`, `skral`,
  `legion`, `goblin_doorless`; land the hostile rows **one per zone behind
  the FRONTIER doc** and watch regionBoldMax and calm before the next; the
  neutral rows ship together (they cannot cascade).
- **wardens_outpost.json**: Hale out of the pool, a name-free pooled sergeant
  in; `first_lamp` def with Hale pinned; `third_stone_rest` def with the
  Returner pool; `husk_of_the_line`, `broken_barrow`, `goblin_doorless`
  grubfarm variant, `legion_pressed` rival def, all weight 0, tiers [2,4],
  existing families only (ONE ATLAS LAW: no new `family` value, ever).
- **geography.ts**: append the First Lamp, the waystone glade, the Felling
  cell pin, the husk, the broken barrow / grub farm, Steinar's chain, the
  Ashlamp dressing patch. Two-hash law at rollout.
- **worldFlags.ts**: `war_near` + its poiLedger predicate at the Talk site.
- **frontier.ts**: `boldness.rivalDef` dial.

---

## 9. Bands (the order of work)

| Band | Name | Ships | Proof |
|---|---|---|---|
| 0 | THE LEDGER OPENS | canon (§8): bible header + entries, T-rows, roster entries, tribes declared, defs authored, geography appended, `war_near`, `rivalDef` | content/server suites green; roster validator; names grep; a boot log showing every new site standing |
| 1 | THE SHEET AND THE COLD HEARTH | kit K0 + K1 | museum wing walk; noon/midnight screenshots; parity 7/7; registry/lights/museum pins |
| 2 | THE DAWN UNDER SIEGE | §7 in `maps/dawnmead.ts` + the five new throats + bark pairs | content.test singletons; worldgen interiors flood; sealed-pocket flood; a 30-screenshot tour day/dusk/night; the sixteen-quest ladder walked end to end on a fresh character |
| 3 | THE MARKS | kit K2 + litter vocab + cues | every people has a glyph in the museum; a screenshot of each mark beside its camp |
| 4 | THE FEN LAMP AND THE BAR | §3.1: First Lamp, Ashlamp, causeway head, weir, crofts re-dressed, Brede crowned, the east fork pair | live probe: both forks walked on two fresh characters; Aldis reads the flag; the tutorial send-off unchanged |
| 5 | THE HUSK AND THE WARD LINE | §3.2 + §3.3 + beats 1-3, 7 (north rows), 12 | the 18:00-20:30 changeover watched from the picket; worg vs wolf on the trail; both fork pairs |
| 6 | THE THIRD STONE | §3.4 + beat 6 | Nine Lit swaps five tiles and the wind snuffs one; the crew dies for the lamp on camera |
| 7 | THE SPOIL WOLD | §3.5 + beats 4, 8 | the pressed satellite deals on a forced stage-2; the kerb fight at dusk |
| 8 | THE LAND BETWEEN | §3.6 + §3.7 + kit K3 + beats 10-11 | FieldLitter raised where a loop crossed; the scoreboard flips on a beat; Varn's four theories |
| 9 | THE GLOOM CREEPS | kit K4 (owner-gated worldgen touch) | parity + render-perf; the burn country before/after |
| 10 | THE OVERRUN (Epic 2) | the ledger verb, dial-gated, three pairs | separate plan |

Perf budget: keep garrisons small (gnoll 6-8 by day, dead 6 by night, Doorless
10-12 mostly holdfast, Aske's crew 4, the pressed camp 8), one patrol loop per
camp, SmolderHeap ≤4 per prefab, every ember light flame-gated where man-made,
the smoke grain rate ≤0.5/s per tile inside ~20 tiles of the camera and
skipped past 70% of PARTICLE_CAP. The starter zone must not pay a war camp's
frame cost.

---

## 10. Owner rulings (2026-09-04) — GREEN-LIT

The owner green-lit the epic as banded with these rulings, which override
the decisions list below where they differ:

1. **Green-lit.** Kit before village; the recommended order stands.
2. **THE OVERRUN stays Epic 2.** Eternal theatre for v1.
3. **Hale lives at the First Lamp** outside the rect; Leif walks in.
4. **The waystone glade stands AND a fourth non-human people is added.**
   The world will have many races and races within races (the D&D
   precedent: sub-peoples inside a people). The new people must not read
   as elves. Designed in §11.
5. **AshGround is a true ground material**, and more: the ground becomes a
   **spectrum**, not a slider. Separate tiles, texturing and blend layers
   that fold a living land into autumn, winter, scourge or blight by
   weight, so a lifelike wood can be taken by the blight without a hard
   edge. Industry-proven layered-terrain techniques. Designed in §12 as
   its own workstream, THE LIVING GROUND, which K4 now depends on.
6. **Breathing room.** Space the zones out; this is a world to explore,
   not a ring of camps. The map in §3 is re-spaced under a BREATHING ROOM
   law (§13) before any site is pinned.
7. **This is the demo.** The contested lands are the show-stopping
   experience new players and the press see first. Every band ships at
   award standard: multiple passes, screenshot-judged, no cheats visible.

## 10a. Decisions the owner held (resolved above)

1. **Green-light** the epic as banded above, or reorder (the kit's K1+K2
   before Dawnmead is the recommended order so the village dresses in its
   own vocabulary instead of granary fallback).
2. **THE OVERRUN verb**: accept eternal theatre for v1 (recommended) or pull
   Epic 2 forward.
3. **Hale's home**: the First Lamp outside the rect with Leif walking in
   (recommended; keeps Dawnmead pre-political and Hale's shipped lines about
   a pen and a palisade true) versus Hale posted at the gate inside the rect.
4. **The First Lamp's placement** if the fen's east rim refuses the scan:
   the north-rim fallback puts Hale forty tiles off the road line.
5. **AshGround as a true ground material** (K4) touches every burn country's
   look; ship it or hold at Details.
6. **The waystone glade as the arcane party** (recommended) versus reserving
   the Even Court for Evenfall and inventing a fourth non-human party, which
   the critic warned reads as a second elf faction by accident.

---

## 11. THE FOURTH PEOPLE — THE DOLMEN, THE STANDING COURSE

Chosen from three competing designs (a horned herding people from over the
Spinewall; the living kerb-folk of the barrows; a dry-stone people the deep
pushed up). The horned people were refused for the demo: horns read as the
one thing the content boundary forbids, however the curl is drawn. The
kerb-folk build nothing above the knee and so cannot show an encampment
built into the land. The Dolmen show it in stone.

**One line.** A dry-stone people the deep pushed up before the kobolds:
they do not dig and they do not tamp, they SET, and what they set holds,
which is the whole of their virtue and the whole of their fault.

**Origin (author-facing; no throat says it).** Eleven winters back the
floor of the Sett, a quarry bowl south-east of the fen that nobody's road
names, grew a dry-set plug of stone that was not the bowl's own stone, over
three nights, and the Dolmen came up through it by stratum. They plugged the
hole behind them with a corbelled dome, built over it, and have never stood
on it since. Asked why they came up they say "We set here." and nothing
else, forever. What they give if pressed by count is arithmetic: the weight
on their old courses "changed"; stones that had held longer than any count
"moved." Ammat keeps a count of stones moved topside each year (nine, then
fourteen, then thirty-three) and files it under wet and wains and bad
setting, never a pattern. The deepest stratum, the Gabbro, did not come up.

### 11.1 The sub-peoples (races within the race)

| Stratum | Look | Temper | Where |
|---|---|---|---|
| **The Marl** (shallow chalk-clay) | Warm bone-white hide with grey mottle (limestone, never moonpale), the lowest rounded yoke, pale tick eyes, the smallest hands, a chalk-white plumb bob. Stature 1.02. | The dealers and the bridge throats; patient, literal, crofter-cadenced; they learned the tongue first. They finish what they promise whatever stands in the way. They disown Vorl's stile out loud and let it stand. | The rim-set on the Sett's north lip, the Course, the dry end at the Drowned Meadow. Bodies `dolmen` (L6). Throats Ammat (coursemother, fineActor) and Sarsen (the first one a player meets). |
| **The Sinter** (dripstone) | Blue-white hide drip-scarred and stooped, a milky calcite crust on the yoke with short dripstone ticks along its rim (ticks, never plates), wet dark eyes, the tallest hooded yoke, a milky calcite bob. Stature 1.10, the slowest walk in the game. | Speak only as "we", a few sentences each, and grind in the idle (stone on stone, a proximity voice, never a bed, never a note). Their water refusal is a count, stated flat: "the last dry course is the ninth; we stop at the ninth." | The Sett's wet floor, a corbel cell half in shallow water. Body `dolmen_sinter` (L8). Throat Drusa. |
| **The Culm** (the coal seam) | Ash-dark grey to near-black hide, a squared yoke with a soot-cut notch, the only warm eyes of the four (ember), a red-dust line along the mouth seam, black bob. Stature 1.04, the quickest. | Hot and quick, the fighters and the fire-keepers: the only people in the valley burning stone, not wood. Their one oath is "cold on you." They would sell black stone to Ottery's forge if anyone had asked. | The hearth-cells on the Sett's east shelf, the set's only lights (EmberBed-class rows, flame-gated). Body `dolmen_culm` (L9, the hurled hot stone `black_seam`). Throat Durrow. |
| **The Gossan** (the iron hat) | Rust-ochre hide streaked like weathered iron, the deepest keel and a ridged yoke with three dull iron beads (never gold), the biggest hands. Stature 1.16; the champion 1.30. | The weight-keepers. They keep THE WEIGHT: the count of every stone taken from the Course (forty to the Charter's causeway, one cart, twelve stakes), kept without wanting, because a people that never asks cannot demand. They re-set anything they judge set wrong, graves included, and they unpick Charter posts and Returner lamp-stakes by night and lay them in a row in the weight-yard. Vorl's stile law (set one stone to pass) is theirs. They would fight. | The weight-yard on the Sett's west shelf. Bodies `dolmen_gossan` (L11), `dolmen_champion` Vorl Fullweight (L14, crowned via names[]). |
| **The Gabbro** (the deep-set stone, deepest) | NOT BUILT. A ring of empty set-niches inside the Plug and a run of names in the Gossan's weight. | The Gossan count them "not yet up"; the Marl count them "set where they are"; the two counts disagree and stay standing. | Nowhere topside. Reserved: if a Gabbro ever comes up it comes up as bad luck to the people who find it, never as an answer. |

As built (Band 9c, §11.10): the five statures above landed exactly as
sketched, 1.02 (Marl), 1.04 (Culm), 1.10 (Sinter), 1.16 (Gossan), 1.30
(the champion), and the Gabbro never came up; it is still nowhere in the
build, by ruling rather than by oversight. Every stratum is the same
rig plus one fixture, keyed on a single per-look dial table (heavy,
hand, keel, stoop, yoke height and shape, rim fixture, corpse-and-strike
mark, girdle count) rather than on separate bodies; see §11.10 for the
table and the numbers.

### 11.2 The silhouette (why they read as Dolmen at gameplay zoom)

Four reads owned by no other body, delivered through widths, head and
carriage only (the dialect law: no limb-length change).
1. **The yoke.** A bony shoulder-mantle of hide over bone rising behind and
   beside the head; the head sits inside it. From behind the back plate
   hides the head to the crown: the body reads headless from the north
   band, which no rig body does today; the keel line continues 0.05s above
   the rim so it reads as a hood, never a decapitation (test-pinned).
2. **The keel and the shelf.** The head is SMALL (headR 0.90, the only
   dialect smaller than the human head), a wedge skull with one median keel
   from brow to nape over one bar of brow-shelf, two small deep-set pale
   tick eyes with no whites, no ears, no hair, no nose bridge (two slits), a
   straight lipless mouth seam that never opens: THE STONE FACE, the gape
   clock refused; the combat tell moves to the hands.
3. **The setting hands.** Hands 1.5× wide, four thick fingers, pale palms;
   the rest pose hangs them forward of the thighs, palms back, fingers
   spread; the strike is a two-handed overhead SET. No equipment weapons
   ever (dialect-owned stone in hand, the ogre-club precedent).
4. **The plumb.** A cord and stone bob hung from the yoke's near rim on its
   own PendantSim slot: swings with the walk, whips on the strike, hangs
   dead-true at rest, lies slack on the corpse. Each stratum's bob is its
   stone.

Carriage: shoulders 1.30× (the widest in the game) over hips 0.85, a
forward hunch of 0.10 thrust under the yoke, feet wide flat and bare
planted wider than the hips, and THE LEVEL GAIT (the yoke stays dead level
while the legs roll under it: a per-dialect walk-bob dial, one new rig seam,
defaulting to today's bob for every other body and pinned byte-identical).
NOT elf (no ears, no hair, no grace, bone not moonpale). NOT goblin (still
face, small head, tall). NOT human (no neck, headless from behind). NOT
kobold (no snout, tail, dish ears). NOT golem (flesh hide, a swinging
plumb, speech). NOT dwarf, in props (no beard, no axe, no gold, no ale, no helm, no
boots) AND in culture (no ledger of wrongs, no smith, no hall, no
ale-hall, no clan, no oath but the Culm's; THE WEIGHT is a count kept
without wanting); screenshot-judged beside the Stoneborn heritage bust
before any content lands.

As built (Band 9c, §11.10): all four constants above (the yoke at 1.30
over hips 0.85, headR 0.90, the keel-and-shelf hull, THE STONE FACE, the
setting hands, the plumb on its own PendantSim slot, THE LEVEL GAIT, no
equipment) held as one rig across all five strata and never moved per
look; only the per-look dial table on top of that rig changed the read.
That table, its numbers, and the deviations the sheet forced on it are
recorded in §11.10.

### 11.3 Culture, architecture, marks

Dry stone only; no mortar, no timber but drift; bone hafts and bone plumb
cords. Tools: the plumb, the level (a stone with one groove), the maul (a
stone lashed to a bone haft). Light: none. They see in gloom and keep no
lamps, so the whole Waykeeper/Returner war over lamps means nothing to
them ("a lamp is a stone that goes out"): the cleanest misalignment in the
country. Clothing: a hide bib apron and nothing else; the Gossan an
iron-bead girdle; no cloth, no dye, no banner (a people with no flag among
seven flags). Trade: stone for stone; they will set a wall for anyone who
brings stone, and the Charter, which is carting their kerb away for the
causeway, has never once asked. Dead: laid in a course and dry-stoned over;
a Course is also a grave-row.

Architecture is CORBELLED, because that is how you hold a roof with no
timber. THE PLUG: a corbelled dome over the sealed hole at the Sett's
floor with an inner ring of empty set-niches. Four sets by stratum: the
Marl on the north lip, the Culm on the east shelf (the only lights), the
Gossan on the west shelf (the weight-yard: a Charter BrokenCart built INTO
a wall, a row of taken CharterPost stubs and PitLampDark stakes laid like
the dead), the Sinter at the wet floor. THE COURSE: a dry-stone run leaving
the north lip along the stream's east bank and bending west along the
brook about a hundred and thirty tiles to the Drowned Meadow's south-east
corner, a stile every twelve and a PlumbStone every forty (the lateral
silhouette law of §13.1), the last courses standing dry in the meadow's
sheet with crofter sheep on them.

Kit additions, as built in band 9b (SmolderHeap already held 548, so the
four shift one id up from the earlier draft; ruling R-C, §11.8): **549
CourseWall** (run tile, own kind only, cover, stone ×3 so the fork can
breach it), **550 CourseStile** (passable posture, the two-state tell),
**551 CorbelCell** (the beehive hut, tallest, FADE_TALL, light-blocking),
**552 PlumbStone** (the claim-mark: a knee-high set stone with a slotted
top, a bone cord and a hanging bob riding ONE BREEZE), **Detail 184
Chalkline** (one snapped chalk line where a course will go; sparse, never
a lattice, baked on bare ground beside Ash / DragFurrow). Museum wing THE
STANDING COURSE, after THE SCARRED LAND wing. Inks minted: TH_MARL /
TH_MARL_LIT / TH_MARL_DARK / TH_MARL_MOTTLE / TH_CHALK; TH_SINTER /
TH_CULM / TH_GOSSAN wait for the first painter that reads them (band 9c
and past it).

### 11.4 Wants, fault, virtue, and who they stand against

**Wants.** The Course finished to the stream's bend "so what is set is not
moved again"; the forty kerb stones the Charter carted put back, or forty
like them; no stone driven through a course; to be paid in stone, never
coin; to be left the Sett, which was nobody's; and, from the Gabbro's empty
niches, a thing they do not name and would not know how to ask for.

**Fault.** They finish what they set. The Course crosses the brook's fall
to the fen, and "the Dolmen walled the meadow" is the THIRD reading of why
the Drowned Meadow drowned (Ingram blames the Company's sluice, Halvor the
skral, the Marl say the ground went soft under the wall, which nobody can
check). They unpick any set stone they judge wrong and re-set it where the
ground "wants" it, never where a road wants it: two Returner stakes pulled
from the Course (Eskil enters them as "buried by kobolds"), a Charter post
line unpicked, a re-set kerb across the stone-track that broke a wain's
axle. They took the whole stone-cart and built it into a wall. Vorl's stile
charges a stone for a step, which is a price wearing a mason's apron, and
Brede calls it a stile-price and laughs (the word "toll" never stands
within a Dolmen line). They will not fight the kobolds tamping toward them, will
not stand on the Plug, and count the barrow's dead and the Road Row's
graves as "unset" and would re-set them properly if let. And they are
wrong about the wet: Ammat's thirty-three moved stones are the truest
measurement in the valley that the ground is moving, and she has filed it
under bad setting.

**Virtue.** What they set holds. The Course is the only dry ground in the
Drowned Meadow and the crofters' sheep stand on it; a Marl corbel cell kept
three crofter children dry the night the Third Stone's roof leaked. They
pay in stone: a set stone in the road where a kobold hole dropped a wheel;
a re-set cairn set RIGHT where the kobolds re-stack one stone wrong
(Varn's fourth theory). They keep no lamps and have never lied by one. They
toll no coin, dig no cairns, burn no wood, take no sheep. Vorl's weight
lists what was taken to the stone and offers to set a wall for the Charter
in exchange for the forty: the one honest bid on the table in the whole
south-east.

**At odds with:** the Charter (Ingram's causeway is built from the Course's
own kerb, carted up the stream by a stone-track with a carter-boss,
**Garrow**, a fordgate actor; Margit's tally carries the Dolmen in the same
column as stumps), the Returners (stakes through a course), the Fenside
crofters at the Drowned Meadow (the wall drowned us, and our sheep stand on
it: a quarrel that is also a dependence; the crofter pool knows them openly
as "the wall folk" and says so in a bark; Halvor's one private thing is that
the Dolmen counted his sheep onto the Course and let them stand), the Gloamwood's wild at the Sett's south
rim. **Misaligned, never allied** (neutral rows with range): `dolmen|kobold`
(two thorough peoples; the digs' spoil track runs north along the brook to
the meadow, and under the sheet the spoil crew and the wall crew work the
same cairn and neither stops), `dolmen|reavers` (two tollers; Brede laughs at a
toll paid in rocks and honours it), `dolmen|skral` (never meet; the Sinter
and the shoal both moved for water that came up under them). Rurik's
level-driven stakes are the only stakes the Gossan never unpick. The Even
Court keeps living wood, the Dolmen keep dead stone; the sentinels' waystone
is the one thing outside the Sett Ammat calls "set right, by someone."

### 11.5 Speech (a VOICE.md card)

The first non-human people on a non-human rig who talk. Common tongue
learned over eleven summers from Fenside drovers, so their words are
crofter words. THE SET SENTENCE: short level declaratives laid one on the
last. HOLDS / DOES NOT HOLD is their entire judgement vocabulary (true,
safe, honest and a good person all "bear"; a debt is "weight"). COUNT
BEFORE OPINION and they NEVER ASK A QUESTION. No names for topsiders
(the stake man, the chain man, the sheep man, the lamp boys, the red-rag
men). THE WET CAME UP is rain, flood and the water-table in one phrase.
"We set here." is the whole answer to why they came up. Spice: Ammat only,
once; the spine never gestured at (she may say a stone moved; never that
something is moving).

Ammat: "You are standing on the Course. It held when the wet came up and
it will hold when you have gone. Sit on it if you like. It does not mind
weight, it minds wrong weight." / "The stake man took forty stones from
the north end and carried them to his wet road. We counted them going. We
will have forty back, or forty like them. That is not a threat. It is a
count." Sarsen, at the drowned cairn: "The small diggers stack this every
night with one stone wrong. I set it right every morning. Neither of us has
said anything about it. It is a good arrangement." Drusa: "Four courses wet from
the bottom row. The top row last. Tell the sheep man that, since he asks
us nothing." Durrow: "Cold on you, then. Go and be cold." Vorl: "One
cart. Twelve wheels of stone. A rope. A row of sticks with glass on them.
That is the weight and I keep it."

### 11.6 Where, and how they enter the war

THE SETT: the worldgen quarry bowl at x 156..188, y 276..324 (probed at
seed 24601: a −1 ring of ~1,100 tiles with a −2 core of ~325 around
x 161..187, y 286..302; the bowl reaches y≈330 and x≈194), cell [1,2].
Its cell centre is 373 tiles from the anchor (tier 3 by the cell-centre
law); the Course crosses the tier-3 line on the walk south, which is the
threshold the spacing audit asks for (marked with a PlumbStone). The site
scan refuses a pit and `findAuthoredAnchor` refuses a pin inside an
authored zone, so the Sett is an AUTHORED ZONE whose sketch covers the
whole bowl (≈x 154..194, y 270..330, so the rim cliffs match at its
edge) with its own −1 and −2 levels (the shipped precedents: `hasElev`
on authored maps in maps/builder.ts and the terraced-prefab elev layer
pinned in pois.test), and **the garrison is the zone's own spawn rows and
actor pool** (the Dawnmead pattern), 10-12 bodies mostly holdfast, one
loop, guard temperament (never initiates; the set answers). The Plug and
the Sinter's wet floor sit on the −2 core. An honest `dolmen` POI family
(the roster test passes as long as no find or wild entry leans on an
absent family) with litter vocab `course` (CaveRubble, Rock, PlumbStone);
`golem` was refused because a family drives the territory lean, not the
litter, and a golem lean is the strongest possible "reads as golem"
failure. The cell-forced `amberfen_shoal` stands in [1,1] directly north:
the two settlements are acknowledged neighbours who do not meet (the
Sinter stop at the ninth course; the shoal keeps to the fen), on a
`neutral` row. One dressing patch, no core, at the Drowned Meadow's
south-east corner: Sarsen, a PlumbStone, the re-set cairn, sheep on the
last dry course. Walk from the crofts to the north lip: 48-52 seconds.

**No sixth fork.** The Dolmen are the THIRD CORNER of THE CAUSEWAY OR THE
SLUICE (§3.1): Ingram's stakes are the Course's own stone, and on (A) the
character who plants them enters Ammat's count ("forty and twelve; the
twelve are yours"), Garrow's stone-yard opens, Durrow's shelf closes; on
(B) the kelp-string carried back past the Course earns Sarsen's one extra
line and the plumb_bob token. THE ERRAND, *Forty Stones* (Ammat,
repeatable, requires the capstone, forbids `course_broken`): carry a load
of the Charter's carted stone from Garrow's yard back to the Course's north
gap (stealth, fight with the yard's enforcer rows, or Garrow's third offer
to sell it back for coin the Dolmen will not pay) and set it (CourseStile to
CourseWall, the candle grammar). The full fork THE WEIGHT OR THE ROAD is
the v2 seed. Roster: faction `dolmen` (members ammat, kesk, durrow, oskel +
pooled `dolmen_setter`; fineActor ammat; oppose fordgate .25 as a standing
feud, never blade); reputation is for speaking parties and this one speaks.

### 11.7 Engine cost and risks

The NINTH head-swap dialect, THE COURSE DIALECT, `render/dolmen.ts` on the
skral/hobgoblin template: DolmenLook by stratum (THE CLUSTER IS THE
STRATUM), DESIGNS keyed by defId for the five named so a creature-bodied
actor never re-rolls its face, paintDolmenHead on a DolmenHeadFrame on the shared frame shape (the
skral and hob frames are field-for-field copies of the kobold one; gape
accepted and ignored, test-pinned) through an exported `dolmenHeadHull`
(keel wedge over shelf), the
yoke in the torso behind pass, setting-hand and flat-foot branches, the
plumb PendantSim (the corpse plumb is PAINTED static: the ragdoll path
carries no pendant), the walk-bob dial at BOTH hip sites (hipYStand and
hipY; pinned byte-identical for every other body at both), THE STONE FACE,
~50-70 rig seams, ~30 renderer touches (DOLMEN_SIZE synced to MOB_SIZE,
the three prefix gates that decide a body is a humanoid mob at all
(gameRender isHumanoidMob and the two renderer startsWith gates), no head
slot ever, olSig `T<stratum><seed>`), ragdoll corpse look, a dolmenab sheet and dolmen.test.ts
law pins. **The first creature-bodied speaking actors in the game** (four
actor defs with model.kind 'creature', a live but unexercised render path):
budget a proof band before any tree is written. Arts: `black_seam`,
`set_the_line`, `the_weight`. Cost tier (b), the skral/hob recipe plus the
actor proof. Playable ancestry is NOT free (the yoke fights the FORGE LAW
and the no-head-slot law) and is deliberately deferred; it must be decided
before the collar is painted if the owner ever wants it.

Risks, with the mitigation each carries: reads as dwarf (structural
negations above, judged on the sheet); reads as golem (crust as rim ticks,
beads as three studs, a golem on the ruler row); headless-from-behind reads
as a bug (the keel overhang pin); the stone face loses the strike tell
(the overhead set must read at 32px); the stile reads as the Company again
(survives only because the Marl disown it aloud and Brede names it); spine
leakage ("the wet came up under", the Gabbro's niches: counts never patterns,
Ammat never says anything is moving); the Fenside thread (Halvor knows the
wall folk) is a new bible T-row. Every name (Dolmen, Marl, Sinter, Culm,
Gossan, Gabbro, Ammat, Drusa, Durrow, Vorl Fullweight, Sarsen, Garrow, the
Sett, the Standing Course, the Plug) was grep-verified clean on 2026-09-04
AFTER the critique retired the first draft's names (Tholl = a homophone of
"toll" in an epic about tolls; Hesket = the bible's Hesk in Northguard;
the Whin = a homophone of the live actor Wyn; Kesk one letter from Hesk;
Oskel beside Eskil; and the gate's one-edit pass then retired Fenna (Denna,
Senna) and Njal (Nial) → Margit and Halvor). THE NAMES GATE is amended: land `names.mjs` on main in
Band 0, extend it to read the whole dialogue bible and to run a one-edit
and homophone pass over the actor roster, and run it as part of the
Dolmen band's gate.

### 11.8 As built 2026-09-06 (Band 9a, THE MARL stands)

Band 9a shipped the creature-actor proof and nothing past it: one body,
THE MARL, art id `dolmen`, standing, walking, turning, idling and speaking
as an actor in the world, plus its sheet, its rig-lab proof, two in-world
shots and one jumped day. Section 11.6's zone, roster and errand, and
11.7's ragdoll corpse look and arts, remain unbuilt and are handed to bands
9b and 9c below.

**Rulings, binding on the build (owner delegate).** R-A: the brief's own
R1 through R9 stand as written, THE MARL as id `dolmen`, stature 1.02, a
DESIGN and not a cluster roll, the nameless actor `dolmen_setter`, examine
plus three lines on the bark path, no dialogue tree and no voice cast, the
sheet rows as listed, THE LEVEL GAIT helper at both hip sites. R-B: THE
GROUND DOOR is A, the dev command `/spawnnpc <slug> [routine]` is this
run's only engine addition, and it is dev-only and tested; the body's
permanent home is the Sett zone in band 9c, not a crofts row and not a
tiny zone of its own, and the in-world proof shots stand the body at the
east lip (201, 292) facing west through that command. R-C: the four prop
ids for band 9b shift to 549 through 552, because SmolderHeap already
took 548, and the Chalkline detail takes id 184, the next free Detail id
after the forest law's 182 and 183, not 182 as an earlier note in this
section implied. R-D: the eid-keyed look seam, where a rolled cluster look
under a named actor would re-roll its face on every boot, is recorded for
band 9c and not fixed in this band. R-E: refused this run were any second
sub-people body, any strike or seed row, a voice clip, a dialogue tree,
any change to the humanoid rig ladder beyond the `dolmen` rung, and any
zone or site row.

**Deviations from the written plan, each one recorded and each one
pinned.** The NpcDef ships with `aggroRange` 0, not 4: the engine's own
test demands a sightArc on any body with a nonzero aggro range, and the
brief forbids the Marl one, so 0 is the honest reconciliation and the body
is untargetable in this band. The plumb, on its own PendantSim slot, is
ticked by the rig at the yoke's near rim station with its anchor riding
hipY, so the whole body moves as one; the layer switch that decides
whether the cord hangs before the bib or behind the torso is latched with
the cape contract's own hysteresis band on the root station's depth (on
at plus 0.1, off at minus 0.1), holding at every cardinal facing outside
that band so the eased gaze can never pop the cord in a single frame. That
plumb layer latch is written as a reusable helper, `dolmenPlumbFront(mem,
rootDepth)`, and later sub-peoples riding the same rim, the Sinter's beads
and the Culm's ticks among them, can take the same band on their own keys.

**A WATCH, not a defect, left for the owner.** At the south and southeast
bands near 110 degrees the yoke over the face can read as an open-faced
helm or a cowl rather than the intended hood; at 220 degrees it reads as a
hood as written. This is not a build defect and nothing was changed for
it. Only if the owner calls it a helm outright: move `dolmenYoke`'s hBack
from 0.315 to 0.285 and the nape peak from 0.035 to 0.025, and keep the
north hood pin green, meaning the rim must still sit at or above the crown
plus 0.05s.

**The handoff to bands 9b and 9c.** Prop ids for 9b are set: 549
CourseWall, 550 CourseStile, 551 CorbelCell, 552 PlumbStone, and Chalkline
takes Detail id 184 (ruling R-C); no id was spent in 9a itself. The
eid-keyed look seam (ruling R-D) is `dolmenLook(defId, eid)`, and every
spawned actor mints a fresh eid on restart, respawn or `/spawnnpc`, while
the actor slug travels on the wire but is threaded into no look call; 9b
must decide, before the Marl cluster rolls, whether the five named throats
(Ammat, Sarsen, Drusa, Durrow, Vorl) get their own def ids or a
slug-keyed design seam in the renderer's look call, while pooled
`dolmen_setter` bodies may keep rolling. The post needs an authored
direction: a wander slot's walk-in facing becomes the rest anchor after
every slot, so a post never faces the bowl on its own, and 9c's zone row
must either pass an explicit facing on the post task or accept whatever
facing the walk-in leaves behind. Talk reach and the turn ring are engine
constants worth recording here and changing nothing about: the body turns
to the nearest player inside a 3-tile ring and answers within 2.2 tiles,
so a player sees the turn before the prompt ever appears. The walk speed
carries two honest numbers from two different sources: the sheet's walk
row runs at 1.8 (the NpcDef speed, ROUTINE_WALK_SPEED), while the
`dolmen_set` routine wanders at 1.2; band 9c chooses the setter's actual
in-world pace on its own zone row.

### 11.9 As built 2026-09-06 (Band 9b, the four stones)

Band 9b shipped the four Standing Course props and the chalk line Detail,
proven under the run shape in the museum and against a throwaway world
rig, and nothing past them.

**Rulings, binding on the build (owner delegate, rulings.md).** R-1: the
five ids stand as ruled, 549 CourseWall, 550 CourseStile, 551 CorbelCell,
552 PlumbStone, Detail 184 Chalkline; 553 is refused, and 546 and 547
never answer `isScarredTile`; no rows were added to lights.ts; CourseWall
and PlumbStone smash as `stone/600/3` on the existing debris kit;
CorbelCell and CourseStile are not destructible; PlumbStone stands as the
`course` influence row's MARK and is never counted as litter, an
amendment to the litter list in §11.6, since a glyph is not litter; the
`dolmen` POI family and its vocabulary regex wait for band 9d; the whole
kit paints from one file, `props/scarred/course.ts`; the museum wing THE
STANDING COURSE follows THE SCARRED LAND wing; and the only inks minted
this band are TH_MARL, TH_MARL_LIT, TH_MARL_DARK, TH_MARL_MOTTLE and
TH_CHALK, with TH_SINTER, TH_CULM and TH_GOSSAN left for the first
painter that reads them. R-2: the chalk line bake follows the ash law, a
grain that crosses tile edges, ragged on the hash, one axis per tile from
the neighbour read, and never a ruled stripe or a lattice; the museum
hosts it on Dirt; no dev command places a floor Detail in the world, so
it stands proven in the museum only, and the road into the world is
recorded for band 9d's sketch layer. R-3: proof stands under the run
shape, museum shots at zoom 1.3 for noon and midnight per piece, the
breeze pair on the plumb stone, the wall-against-ruin pair, and one Sett
east lip composition placed with `/spawnnpc` and `/settile` on a
throwaway pair; parity read 7/7 on an idle machine across two runs. R-4:
nothing from the band 9c or 9d lists was built this band. No bodies,
strike or seed rows, or arts; no zone, legend character, cue, family,
stile server verb, hut interior or door, per-prefab cap, second foot,
grass code or play3d dialect.

**Deviations from the brief, each one recorded and each one pinned.** The
CorbelCell profile reads as a corbelled stone hut rather than the
brief's stepped cone: the lower two fifths of its height hold near plumb
and the walls close above the lintel on a quarter circle to a flattened
capstone, itself 0.30 of the rig's scale wide against the brief's 0.24,
so the crown reads flat rather than pointed; the shape stays taller than
it is wide by the pinned proportions and cannot read as squat within the
current radius. The CourseStile's step stone is built 0.10 of the rig's
scale thick against the brief's 0.06, carrying the through-stone's own
lit-top and dark-underside grammar instead of the brief's ink bracket,
with no ring of its own, since it reads as a feature against the wall
face under the broken-fence shared-edge rule. The CourseWall's built
heads alternate a long header and a short one course to course so the
inner joint tooths, and the whole head column stands a full value step
off the wall face on every course, a stronger read than the brief's
plumb column asked for and needed to be visible at all at gameplay zoom.
The PlumbStone's hanging bob is built at 0.09 by 0.12 of the rig's
scale, the brief's own documented fallback size, larger than the brief's
first-choice 0.07 by 0.10, and still rides within the wind bound and the
one-ring law. The chalk line's two paint values sit at 0.70 and 0.45
rather than the brief's 0.55 and 0.32, with the dust value and the line
width unchanged, and still reads as a subtle dashed bar rather than a
stripe at museum zoom. The museum's stile exhibit stands its plinth one
tile east of the run's centre so the post never covers the stile's south
face. And the accelerated display's raw-tile roster was found to be
missing the two new run tiles, so CourseWall and CourseStile were added
to it; without that fix the wall painted itself under the grass and the
standing bodies on that display path, and the fix was proven on a world
rig with the wall correctly over the grass and a standing body's legs
correctly behind the low band.

**WATCH items, not defects, left for the owner.** The CorbelCell's
proportions read as a corbelled hut rather than a squat one: reaching a
squat read would mean widening the cell's base radius, from 0.60 of the
rig's scale toward 0.75, or adding a second footprint tile, and both
options are recorded rather than built. The chalk line's paint stays
subtle at museum zoom even at the raised values above; the owner may
want it bolder once it is seen laid along an actual course in the world
rather than alone on the museum's Dirt tile. The PlumbStone's bob was
already raised once, to the brief's own fallback size, and may still
read small next to the stone; a further increase is the owner's call
before band 9d builds courses that repeat it across a whole route.

**The handoff to bands 9c and 9d.** Band 9c, building the Dolmen bodies,
inherits TH_MARL and TH_CHALK as the base every stratum's look is built
as one fixture on top of, the Gossan's dull iron beads as an ink that
belongs to a body and never to a prop, and the reminder that the corpse
look, the strike and the eid-keyed look seam need to be settled before
the wider Marl cluster rolls its faces; the `dolmen` NPC prefix is only
correct once a fightable body exists to answer it. Band 9d, building the
zone, inherits the Sett sketch and local legend characters for ids 549
through 552 with a builder helper that lays a course along a path, a
stile every twelve tiles and a PlumbStone every forty; the `dolmen` POI
family and its vocabulary regex, held back this band by R-1; the chalk
line as a Detail layer in the sketch, the only road that reaches the
world; the errand's CourseStile-to-CourseWall state swap as a server
verb built on the existing candle grammar, and its reverse; the Culm's
EmberBed rows; a CorbelCell cap where a scene calls for one; the second
foot for the corbelled cell if the owner rules for it; a grass code for
the chalk line if the meadow's own courses want one; the missing
WET_STANDERS row, since a course written into shallow water bakes a
green square until it is added; the rule that a course builder must
never lay a stile at a junction, where a wall tees in from another
course; the sheep standing on the last dry course; and the Drowned
Meadow's own patch, carrying a Sarsen stone, a PlumbStone and the
re-set cairn.

### 11.10 As built 2026-09-06 (Band 9c, the strata)

Band 9c shipped the five Dolmen bodies, the corpse plumb, and the
eid-keyed look seam, proven on the shipped rig and against a throwaway
world database, and nothing past them.

**Rulings, binding on the build (owner delegate, rulings.md, R-A through
R-G).** R-A: the proposed rulings stand as blockout applied them, with
four corrections (a mob spawn is the bestiary spawn; a crown pool lives
in content's crown forge; the Marl gets no hand dial and stays
byte-identical; a ruler pairing a rock golem with the Gossan is added).
R-B: the Gabbro is not built; the five cards are the Marl (kept), the
Sinter at 1.10, the Culm at 1.04, the Gossan at 1.16, and Vorl Fullweight
at 1.30 as the Gossan's own design made darker and larger with no new
fixture. R-C: the eid-keyed look seam is fixed so that a stratum's face
follows its actor's slug rather than its database row, with pinned seeds
per named throat and the Marl's bytes held still. R-D: the corpse plumb
ships, carrying its stratum through the death path and the ragdoll
branches, and the corpse's own signature now carries the stratum's
letter so two strata never wear the same fallen sprite. R-E: four
NpcDef rows land at the ratio the earlier bands set, with aggro range
zero, no loot table, hide as the body colour, and the same prefix
exemption the Course props use; three nameless pooled actor rows join
them for examine only, with no voice cast; no crown pool lands this
band, since Vorl's crown is a ruling left to the zone band. R-F: proof
stands as a sheet at one zoom in row bands, one strip round per look
beside the Marl as the constant, an in-world line-up of the five at
noon via a mob spawn and the player ruler, the corpse shot, and parity
on an idle machine. R-G: refused this run were the Gabbro, any prop,
any zone or site or quest or tree or voice, the tribe-prefix flip on
hostility, the strike and the arts, the five named actor rows, and a
crown pool; all five wait for the zone band.

**One rig, five looks, and the dials that separate them.** Every
stratum is the shipped rig plus one fixture; the §11.2 constants never
move per look, and each stratum's read comes from one per-look dial
table:

| Stratum | Stature | Heavy | Hand | Keel | Stoop | Yoke height | Yoke shape | Rim fixture | Corpse-and-strike mark | Girdle |
|---|---|---|---|---|---|---|---|---|---|---|
| The Marl | 1.02 | 1.0 | absent | absent | absent | absent | round | plain | mottle | 0 |
| The Sinter | 1.10 | 1.0 | 1.04 | 0.85 | 0.16 | 0.35 | hooded | ticks | drip | 0 |
| The Culm | 1.04 | 0.95 | 1.02 | 1.0 | 0.10 | 0.315 | squared | notch | soot | 0 |
| The Gossan | 1.16 | 1.12 | 1.18 | 1.35 | 0.10 | 0.315 | ridged | three beads | streak | 5 |
| Vorl Fullweight (the champion) | 1.30 | 1.25 | 1.28 | 1.5 | 0.10 | 0.315 | ridged | three beads | streak | 7 |

Where a dial is left absent (the Marl's hand, keel and stoop, and its
default stoop and yoke height), the body reads at the rig's own default
and the Marl stays byte-identical to its Band 9a bytes at every seed
under 256. All five bodies share the same attack range, cooldown, aggro
range of zero, leash, respawn timer, empty loot table, and hide as the
body colour, with the same prefix exemption from hostility rolls that
the Course props already carry.

**The cluster is the stratum.** No stratum ever rolls another stratum's
palette. A world seed varies only layout, station and phase, never
which stratum a body belongs to. The four pooled bodies (the Marl, the
Sinter, the Culm, the Gossan) take a small shade jitter on hide and
yoke when a world's seed is not the authored seed; the champion and
every named throat never jitter, and the authored seed is the reference
card the sheet judges every jittered card against.

**Deviations from the blockout, each recorded on a sheet read.** The
squared yoke's plateau ramp landed on a different curve than first
drafted, chosen because the first draft's rise read as cheek guards
rather than a plateau at the strip's own zoom. The pooled shade jitter
landed as a true even band rather than the wider band a stray bitmask
would have allowed, since the wider band broke the brief's own pin on
how far a body may drift from its stratum's card. The tick length and
the rim-lip's paint width both moved by a few dial steps after the
first pass read as either too faint to read at distance or too thick to
read as a drip rather than a stroke; both now read as intended at the
sheet's working zoom and remain honest rather than showy at the
farthest zoom the game ever holds a body at. A lab-only row, reachable
only through a debug flag, stands five settled corpses through the
game's own corpse painter for review; it ships beyond the blockout's
own list because the corpse plumb needed a place to be judged before it
went live, and it never appears to a player.

**The corpse plumb, as built.** A fallen body now carries its stratum
through the death path into the ragdoll's paint: the limb colours, a
trunk marking (a mantle slab, a bib, a shoulder mark), and a head
marking (the collar fallen behind the nape, the hood keel, the rim lip,
the ridge line, the stratum's own rim fixture, the keel wedge in
profile with the eyes shut, and the Culm's own red line at the mouth
seam) all read from the same per-look dial table above. The plumb
itself lies slack and painted rather than simulated once a body falls,
since a corpse no longer needs a live physics cord.

**Sheet and rulers.** The full sheet stands twenty-one rows at the
game's own working zoom: five looks across an idle, a walk and a hurt
pose, four spread rows for read-at-a-glance comparison, the stature
ladder from the Marl through the champion, and seven rulers pairing
each stratum against a body already shipped (the player, the rock
golem, the hobgoblin) plus one ruler standing the Marl beside Vorl
Fullweight. Every look reads as its own stratum beside the Marl and as
none of its card's own negations; the girdle read at the working zoom
on the Culm was checked and stands as a hem on cloth rather than a
belt, which is not a defect.

**The fix pass, after the first review.** The corpse's fallen rim had
capped to a point and stacked every fixture into one at first pass; it
now spreads its fixtures across the rim's own usable width, keeps them
a minimum distance apart, and follows the rim's rounded corner so
nothing floats off its edge. The Sinter's rim ticks were re-stationed to
read from the north rather than crowd one side, with a lip stroke that
no longer eats the drop's own top. The lab's sheet ground was painted a
mid-value swatch under every cell so a dark stratum reads correctly
against a meadow rather than a blank page. All three fixes are proven
and read correctly; a fourth item, below, stays open for the owner.

**The WATCH.** Two items stand open rather than fixed. The Sinter's
hooded yoke still reads closer to a helm than the brief intended when
seen from the south, even after its throat lip was quieted; the
brief's own fallback number for that rim is recorded and is a single
dial away, left to the owner rather than applied without asking. The
Culm's inner face, read against dark ground rather than the lab's own
meadow swatch, has not yet been checked; it is recorded as a watch item
for whoever next places the Culm against a genuinely dark floor.

**The handoff to Band 9d (the Sett) and Band 9e.** The bodies are done;
the zone stands on them. Four pooled bodies carry the zone's
population, and three of the five named throats (Ammat, Sarsen, Drusa,
Durrow, Vorl) need their actor rows written before their faces are
stable from one server boot to the next. Every zone row that places a
Dolmen body must author its own facing toward the bowl it stands in,
since an actor's rest pose is wherever its last walk left it facing,
and a scattered spawn command is not a substitute for an authored row.
The Sinter's "slowest walk in the game" needs a routine task slower
than a plain walk, not a slower base speed, since an actor walks at its
task's own pace rather than its stated speed once it is on a routine;
its stone-on-stone grind also needs a proximity sound bound to an
actor, which does not exist yet and is owed. Vorl's crown is an engine
ruling left to Band 9d: either the zone's own spawn format grows a way
to carry a name, a crown and a mouth for one authored champion, or he
stands as an ordinary named throat on the champion's body with his
line from §11.5, which needs no engine work at all; a crown that
actually forges into being needs a real kit and a pool in the crafting
system, and both are still arts work. The hostility flip that lets a
Dolmen answer a blow is written and waiting; it lands only once the
zone gives a live body to test it against, since a body with no fight
placed against it today never opens its guard. The two-handed overhead
strike and the family's whole art kit remain unbuilt after three bands;
the hurt pose is still the only combat frame any Dolmen owns.

Two architectures were designed against each other (per-tile weights with
a corner array; strokes and fields evaluated at bake) and they converge on
every load-bearing point. This is the merged design; the engine claims were
verified against terrain.ts, chunk.ts, grass.ts, trees.ts, glStage.ts and
the frontier on the day.

### 12.1 Thesis

Every ground pixel in Arx is already a pure function of (tile id, world
coords, salts): that is why fringe strips, zoom tiers, lifted layers and
both backends agree by construction. THE LIVING GROUND adds exactly one
more pure input to that function: a small vector of smooth world-space
scalar FIELDS (season, blight, burn, wear) evaluated from authored STROKES
(circles, capsules, rects with a soft hem and a ragged grain) plus live
frontier CORES (strokes whose radius is a server-clocked ramp), sampled
once per chunk bake at the dual-grid corners. Materials stop being one
colour and become CURVES over that vector: the meadow substrate, every
BlobLayer, the grass blades, the fringe tufts, the footprint inks, the tree
leaves and the crop greens each carry hand-picked flat palette keys along
each axis and fold toward them by band. The blend never has a hard edge and
never has a gradient: the continuous field is quantised into three isobands
(touched, taken, held) and each band is painted as a flat organic patch
through the engine's own marching-squares contour machinery (the
paintAltPatches lane law, with the crossing placed by interpolating the two
corner weights against the threshold, so the contour lands where a bilinear
vertex interpolation would cross it: the "hardware interpolation" the
owner asked for, done once, in both backends). THE FLOOR IS NOT A NET,
spoken in weights. A wood taken by the blight reads as large soft tonal
shapes with a two-tone wash inside them and marks whose density follows the
weight: THE MARKS CARRY THE GRADIENT, THE WASHES CARRY THE SHAPE.

Byte-identity is structural: with no stroke in reach the corner halo is
null, every curve returns today's constant and every isoband is empty, so
the op stream is unchanged and parity 7/7 holds. The GL stage blits the
very same canvas (the GPU is a stagehand, not a painter). Nothing new
rides ChunkData, the wire or the DB in v1. AshGround is a true tile because
ash is a material the fire made, not a state of grass.

### 12.2 The data model

- **Storage: nothing per tile, nothing per vertex.** ChunkData and
  encodeChunk are untouched. The per-tile u8 channel (+20% wire, every
  decoder, zone overlays, editor) and the free upper byte of the u16 detail
  id (masking every detailAt consumer) were both refused. TILE IS THE STATE
  stays whole: the field is geography, not tile state. A per-tile
  `foldMap` for the fine hand is the one deliberate exception, held for an
  owner ruling as v2.
- **The field vector**, four channels: `season` signed (0 today's high
  summer, +0.5 autumn, +1 winter, −0.5 spring; zero is the shipped look),
  `blight` 0..1 (the thing from the deep, never named), `burn` 0..1 (soot
  reach around fire country), `wear` 0..1 (reserved; fed later by patrol
  loops and camp aprons).
- **The stroke**, the only serialised thing:
  `{ id, axis, shape: circle|capsule|rect(pad), amp (signed on season),
  soft (fraction of r that is falloff), grain (hem raggedness), mode:
  'max'|'add', bones?: boolean, grow?: {r0,r1,t0,t1} }`, 80-120 bytes of
  JSON. Authored strokes live in `GeographyDef.spectrum` (the closed-shape
  validator, which REFUSES unknown keys, admits the key; optional, so
  every existing doc validates); they ride the welcome `geo` push.
  **Live transport is new work:** the reload door restreams chunks but
  never re-sends `geo`, and the client applies it only at welcome, so
  LG-0 adds an additive S2C `spectrum` record pushed on reload and on a
  new skin-only server door that swaps the stroke registry without
  dropAll or a sweep; the client applies it, the sigs change, the
  affected chunks re-bake. `bones: true` means worldgen reads it (canopy death, stumps,
  the AshGround floor) and a save regenerates; the default is skin only.
- **The field function** (pure, `packages/content/src/spectrum.ts` beside
  scorchAt/fenAt): plateau then a smoothstep hem; one grain noise field per
  axis rags the effective radius at ~22-tile wavelength (the ONE warp field
  law); per axis, max over 'max' strokes plus clamped sum over 'add'
  strokes; `band(v) = 0 untouched | 1 touched | 2 taken | 3 held` on
  integer thresholds (u8 51/128/218) so "which band" is exact on every
  machine and in any future GPU bake. `spectrumHalo` fills the same 36×36
  corner halo computeLayerIdx already builds (5 KB, pooled, transient);
  `spectrumSig(cx,cy)` hashes every stroke whose reach box touches the
  chunk's halo; sig 0 is the fast path and means "no stroke in reach".
- **Live cores** are not a new table: `PoiDef.boldness.spectrum { axis,
  r0, rStage, soft, growMs }` on the PoiDef (vetted by the PoiDef
  validator's closed shape; the clock dials live in the frontier doc), and tickFrontier derives
  the core list from poiLedger rows it already keeps (stage, stageAt,
  clearedAt, emberUntil, fallowUntil): r1 = r0 + rStage·stage; a cleared
  row plays recovery (amp ramps to 0 across ember→fallow and a −season
  "spring" stroke of half the radius rises for the renewal window: the land
  answers the deed, world-shared, never per character). The server pushes
  `groundcores` at welcome and on any quantised change (CORE_STEP 2 tiles;
  the client quantises on a 5-second ticker against its server-clock
  offset). Authored cells are exempt as ever: a pinned dying stand is an
  authored stroke; a rolled blight core is the one that creeps.
- **Zone gain.** A planned rect compiles to a rect stroke at amp 0 on every
  axis with 'max' precedence: the Dawnmead rect is pinned gain 0 in a test
  (THE TUTORIAL IS SACRED); towns default to a low gain so a village never
  turns fully.
- **Cache keys.** BakedChunk gains `spectrumSig`, compared beside rev, px
  and lean; a mismatch is a full bake, never a fringe strip. The sig is
  FIELD-AWARE per chunk (it hashes the quantised halo samples, so a core
  step that cannot move any sample in a chunk's halo does not re-bake it).
  The grass tile cache key packs the bands (after LG-3 rebuilds it); the
  tree archetype key ORs them ABOVE bit 16 (the tile occupies bits 6-15;
  the treeModel memo key already reaches bit 25 and must not carry them),
  so an autumn oak and a summer oak are two archetype bakes; trees fold by
  ONE precedence axis at two bands (≤3× the sheet at the worst hem), and
  thinning drops clusters in the archetype bake, never the `foliage`
  alpha, which exists for the felling handoff and reads as ghosting.

### 12.3 Both render paths

**Canvas (the one painter).** Inside startChunkBake and startElevatedBake,
every branch guarded by `halo === null` → today's code. 0 THE HALO built
beside computeLayerIdx; underground-plane chunks never build one (gated on
the plane, not on the stale `baseY >= 512` dark-band constant, which is
filed as a latent planes bug). 1 THE SUBSTRATE:
meadowTone keeps its noise and its four-way tone index; with a halo the
four-tone table is chosen from the band of the bilinearly interpolated
field at each paint cell's centre (so the step lands on the isoline, never
on the dual grid), from SUBSTRATE_FOLD[axis][band] (the noise picks which
of the four, the fold picks the four); the coarse
placeholder folds too. 2 THE WASH: only the precedence-winning axis is painted per chunk, at two
bands plus marks (the ONION kill applied up front): one sliced step per
band present, membership at a corner = band ≥ b, contoured by a NEW
`bndCurveWeighted` (the existing crossings are hash-wobbled fixed points;
the interpolated crossing is new seam-sensitive machinery) on the
paintAltPatches lane law, run WHOLE (never strip-narrowed) and gated on the
fringe-seam probe's structural rail, filled with the band's base key
and hairline-stroked, then one alt sub-patch per band (the two-tone wash);
bands paint lowest first; burn over blight over season. 3 THE SKINS: the
BlobLayer region fill reads its folded key per dual cell (the
`color(t,tx,ty)` door already exists and is ignored by every layer today),
run strokes take the run's midpoint key so a stroke never changes colour
mid-run, and the same isoband pass runs clipped inside the region with the
material's own keys. 4 THE FRINGE and path weeds take the folded tone pair;
blade count thins by axis. 5 THE MARKS: stubble count and tone dither
against the weight (hash-vs-weight, THE HAND NEVER REPEATS ITSELF), leaf
litter under autumn, frost pools under winter, soot smuts under burn,
grey rings under blight, dealt off the field as their own coverage. 6
Elevated layers run the same closures. 7 Fringe re-bake is untouched: the
field is pure and every new read is within FRINGE reach.

**GL.** There is no GL blend. stageEmitChunk keeps pushing the baked
canvas; the 24-byte vertex and `texture * vCol` shader are untouched; under
a lean the folded texture rides the perspective trapezoid for free.
Per-vertex material weights, splat texture arrays and per-vertex tints are
all REFUSED: the canvas oracle cannot reproduce them bit-exact, and two of
them are texture tiling on the floor plane. The GPU meadow inherits the
fold through the per-blade tone index it already carries (the palette
texture grows; PAL_TONES must derive from BLADE_FILLS.length, test-pinned).
The species sheet inherits it through the archetype key. The one future
GL-side path that stays honest is a WebGPU compute BAKE running this same
isoband algorithm as the painter for both backends (GPU foundation
workstream C).

### 12.4 The spectrum

| Axis | Substrate bands | Blades | Trees | Ground layers | Promotion at full |
|---|---|---|---|---|---|
| **Autumn** (+season) | olive → straw → ochre | gold-green / straw / dry straw rows; seed-heads up, flowers thin | birch gold, oak russet, willow yellow-green; pine and yew hold | Path/Dirt darken a step; leaf-litter chips | none (a look, not a state) |
| **Winter** (season past autumn) | frost-sage → pale → the cold | shorter, frost rows, nap halved, no flowers | leaves held but drunk of colour; clusters thinned by hash-vs-weight | Dirt frozen ruts, StoneFloor rime, Sand grey, banks icy pale; INK_FROST prints | Grass/GrassTall/Dirt → Snow (the laden edge does the rest) |
| **Spring** (−season) | a half-step lighter and greener | flowers thick, nap up | blossom keys on berry/fibre flora | crops sprout-tone | none; this is what a cleared core's recovery plays |
| **Blight** (gloom) | grey-green → bruise-grey → grey-violet, never black | grey-green / grey / grey-violet rows, thinned, no flowers or seed-heads | leaves bruise-violet, clusters thinned by hash-vs-weight (a stand dying from the roots) | Dirt/Tilled dark spill lobes, StoneFloor cool violet, shallows scum at taken+ | Grass → GrassBlighted, Tree → DeadTree, crops → CropBlighted |
| **Burn** | scorched straw → dust → ash-grey | sparse, soot rows | no fold (a burnt tree is a tile) | Dirt/Path char keys; INK_ASH on any ground at taken+ | Grass/GrassTall/Dirt → AshGround, Tree → CharredStump |
| **Wear** (v2) | a half-step toward Dirt | thinned, no flowers | none | DragFurrow-class marks along roads and camp aprons | none |

Precedence at paint: burn > blight > season (ash covers sickness covers the
calendar). Burn = max(scorchAt, strokes), so the Ashmarch folds on day one
without a stroke. A country (the ward line's dying stand) is one blight
capsule along the stand's long axis plus a 'max' circle at its heart:
held at the heart, taken through the stand, touched into the meadow,
nothing beyond ~70 tiles. Two sources disagreeing at a hem is a real hem.

### 12.5 The true tiles

**546 AshGround**: a BlobLayer inserted after Dirt and before Tilled (ash
underlaps worked earth, is covered by snow and water) **only after a prep
step gives every BlobLayer an explicit stable `seed`** (set to today's
array index for all fourteen layers and test-pinned op-stream-identical),
because `layerIndexOf` returns the array position and that index seeds
every contour hash (crossings, swell, alt patches): inserting a layer
without it re-rolls every shipped road and shore (the critique's blocker).
AshGround then takes a fresh seed, and LG-6's proof includes "parity 7/7
with AshGround registered but absent from the map", wobble .22, a dark
band, no lip (ash catches no sun), grey tufts on the fringe, sparse pale
drifts as its interior; the floor set and effectiveGround admit it;
`INK_ASH` prints; the grass lane refuses blades (AshHeap is the prop,
AshGround the floor); worldgen SCORCH emits it at burn ≥ 0.6 on grass.
**547 GrassBlighted**: a BlobLayer with `fringe: true` on the Swamp pattern
reading the gloom keys (not a GRASS_LIKE alias: effectiveGround maps every
GRASS_LIKE tile to Grass and the meadow reads no tile); blades allowed but
gloom rows only; clears to Dirt (blight does not give grass back).
Promotion happens at a BAND EDGE through the shared `band()` (taken or
held), and worldgen reads the same function, so the bones and the skin
agree on every machine. Both join the museum wing and the 'scarred' palette. K4's
worldgen promotion is the ONE worldgen touch and ships only with the owner's
sign-off, parity and render-perf, with a before/after of every burn country.

### 12.6 Authoring: the Studio holds the brush

The World view draws routes, sites, zone art and anchors today and nothing
for massifs, veils, fens or scorches (they are JSON only). The Spectrum tool is
therefore the first landform brush and is built as the general one: an
axis picker with a signed amp slider for season; circle, capsule and rect
nibs; an inspector (amp, soft, grain, mode, bones, id); the three isoband
rings drawn as translucent contours in the axis's ink over the living map
with the TRUE render below (the ghost renders exactly what lands, because
the real bake reads the same registry); a stroke list with visibility
toggles and a fold-preview scrub; "paint a weight" as repeated small 'add'
circles coalesced into one op per drag; a per-planned-rect season dial;
a world season dial in the Weather bench with derived readouts ("the turn
covers 38% of the meadow between the anchors"). A skin-only save skips
regeneration: live players see a country fold within seconds. A `foldlab`
dev sheet renders every base material × every axis as a 0→1 ramp strip
plus one live disc, day and night, with the body ruler beside it: the
screenshot-judged acceptance rig for every palette edit.

### 12.7 Perf, memory, migration

Zero-field cost is zero: one bbox test per chunk against a few dozen
strokes, cached per registry epoch; sig 0 builds nothing. A folded chunk:
the halo ~0.1-0.3 ms, one contour pass per (axis, band) present (the alt2
pass's class, ~0.3-1 ms each, its own sliced step under the 3 ms slice),
+~10% in the detail loop. Gate: MEASURE the alt2-class pass on the 20× throttle before writing a
number; then a one-axis folded chunk bakes ≤ 1.25× an unfolded one at px64,
a hem chunk ≤ 2× as a separate rail, and the 20× CPU-throttle probe in a
folded forest holds parity fps. Memory: +0 B PER CHUNK (ChunkData, encodeChunk, the chunk canvas and the
GL ground texture are untouched); the geography doc grows ~80-120 B per
stroke and `groundcores` ~60 B per core; BLADE_FILLS grows 56 → ~140 strings; tree sheets gain
archetypes only for bands on screen. Churn: a core step re-bakes the chunks whose halo samples actually move
(≈ perimeter/32 plus corners: ~8 chunks at r 40, ~14 at r 70), paced by
the replace queue as a rail, never claimed as a count; the static band register reads tiles, not ground colour,
so wall bands never re-bake on a fold.

Migration: default is today (parity v8 7/7 at zero strokes is gate 1); the
doc key is optional and the validator ships with the server in the same
band (the closed-shape validator REFUSES unknown keys, so an old server
rejects a spectrum-bearing save loudly; the client hides the Spectrum
tool when the server's welcome geo lacks the key);
BakedChunk.spectrumSig is a parallel key; LIVING_GROUND_OFF is the bisect
flag; strokes ship to prod through the existing geography import; AshGround
and the bones ship as their own regen deploy; frontier cores last,
dial-gated.

### 12.8 Phases

| Band | Ships | Proof |
|---|---|---|
| **LG-0 THE FIELD** | spectrum.ts (types, field, halo, sig, registry), GeographyDef.spectrum + validator + snapshot/replace | zero strokes → zero field everywhere; shared-corner determinism; reach ≤ sig bbox; no client change |
| **LG-1 THE SUBSTRATE FOLDS** | halo step, folded meadow + placeholder, the wash (isobands + alt), folded fringe and weeds, folded stubble + four field marks, spectrumSig keys, the flag | parity 7/7 at zero strokes; terrainlab "one meadow, four axes, three bands" with the body ruler at noon and midnight; fringe-seam probe with a stroke across a chunk border; ≤ 1.25× per folded chunk; THE ONION AUDIT (bands must not read as contour rings; kill to two bands + marks if they do) |
| **LG-2 THE MATERIALS FOLD** | BlobLayer.fold keys for every layer, folded run strokes, in-region isobands; museum wing "The Living Ground" | parity 7/7 INSIDE a folded scene (gate 2); the phantom-boundary test; 20× probe in a folded forest |
| **LG-3 THE BLADES FOLD** | grass tone-row blocks, generateGrassTile(fold), the tile cache key REBUILT with explicit multipliers and a collision test (today's key gives the detail id a 3-bit slot and already collides), GPU palette sized from BLADE_FILLS, `printInkFor(tile, tx, ty)` with INK_ASH/INK_FROST | grass floor-law test per band; grasslab column per band; GPU vs CPU meadow screenshot in a folded reach |
| **LG-4 THE CANOPY FOLDS** | trees foldLeaves per species, foliage steps, archetype key bits, saplings follow; crops/flora keys at draw | species-sheet telemetry bounded; a forest hem day/night; felling and occlusion unchanged |
| **LG-5 THE STUDIO HOLDS THE BRUSH** | the Spectrum tool, rect season dial, import/export, the skin-only save path | the Studio smoke tour: draw a blight capsule → true render folds → save → a live client folds without regen; undo of a stroke drag |
| **LG-6 THE TRUE TILES AND THE BONES** (K4, owner-gated) | AshGround 546, GrassBlighted 547, worldgen promotion, burn = max(scorchAt, strokes) | owner sign-off, parity + render-perf, before/after of every burn country, regen deploy |
| **LG-7 THE CORE GROWS** | boldness.spectrum dial, tickFrontier core derivation, groundcores push, client ticker, recovery + spring stroke, Studio Claims lens, /frontier levers | two clients bake the same ring on the same tick; ≤ 6 chunks per step; the demo beat "the wood is dying from the roots" filmed across a stage-up |

Risks carried: the onion (kill criterion above); band steps printing at the
tile grid (tone table chosen per dual cell); palette-law breaks (luminance
tests per band); archetype explosion at mixed hems (pines hold on season;
fold trees at two bands if it bites); live-core determinism (server t0/t1,
quantised radius, never a local clock in the painter; the wash and halo steps and spectrum.ts lint-tested against
Date/performance; the determinism law reads "no clock reaches a painted
value", since terrain.ts already keeps a performance.now memo flush); re-bake storms (CORE_STEP ≥ 2, a regional core
cap, the Studio scrub applies at drag end); vocabulary on the palette only;
scope creep into props (v1 folds ground, blades, canopy, crops and inks;
props go through the museum lane later).

---

## 13. BREATHING ROOM — the re-celled map

The spacing audit measured the §3 map twice, from the gate along each way
at player speed (5 tiles/s; a walker sees ~30 tiles ahead east-west and
only ~17-20 north-south) and by the macro-cell whose CENTRE decides a
pinned site's tier. Its verdict: §3 as drawn claimed all six tier-1 cells
and seven of fourteen tier-2 cells, stacked two to four sites in five
cells (a validator error: ONE SITE PER CELL), and ran 2.2-3.8 authored
things per 100 tiles of way (one every 4-15 seconds): Velen density inside
a Skyrim-sized ring. Industry pacing converts to one thing per ~150 tiles
(the 30-second rule), landmarks every 225-300 tiles, micro finds every
~100 metres. The house already says it: "the space BETWEEN safeties is the
game."

### 13.1 THE BREATHING ROOM LAW

1. **One authored core per macro-cell** (a core is any authored site with
   a POI def, haven or hostile; dressing, wilds rows and a zone's own actors
   are not cores), and no more than three of the six tier-1 cells and nine
   of the fourteen tier-2 cells around Dawnmead carry one (three of the
   nine are shipped sites that predate the epic). The rest carry the finds layer, the belts, and the fold.
2. **Cores on the same way stand ≥128 tiles apart along the way** (≥26
   seconds), and two cores never share one screen (≥70 tiles) unless they
   are staged as one scene.
3. **The first authored core past any gate stands ≥100 tiles out** (20
   seconds). Scars and dressing may stand nearer; camps may not.
4. **A tall silhouette every ~150 tiles along each way** (ChimneyStack,
   DeadTree, a smoke row, a PillarStone, a cairn), placed to the SIDE of a
   north-south way within 30 tiles so it enters the screen laterally, not
   the vertical crawl; the cairn line is the model.
5. **Thresholds cost nothing.** The tier-2 edge at 192 from the anchor is
   marked on each way with ground material, a cairn or a PitLamp.
6. **Every pin is measured twice** in the plan table: walk seconds from the
   gate along the way, and cell-centre tier (what the site will actually
   roll). Every candidate is probed with the FLAG= bisect and a fresh-page
   screenshot before its id is written.
7. **Empty on purpose** is a listed asset, not a gap: the named empty cells
   below are protected from authoring in the plan and in the validator's
   comments.

### 13.2 The re-celled map

A "core" is any authored site with a POI def (haven or hostile); dressing
patches, wilds rows and a zone's own actors are not cores. Every shipped
site inside the ring is counted. Walks are measured from the gate along
the route points; cell tiers by cell centre.

| Site | Re-celled | Cell | Tier | Walk | Note |
|---|---|---|---|---|---|
| The Ashlamp (scar, dressing, no core) | authored zone `ashlamp`, rect (48..70, 92..110), cell [0,0], tier 1, 12..15 s east; no core | [0,0] | 1 | 13 s east | the threshold scar, not a camp; Band 0 authored its def and prefab but PARKED the pin: one ledger row per cell and no zone-less stamp path exist; band 7 lands it as a small authored zone patch |
| Brede's bar **+ the drowned crofts + the First Lamp: ONE STAGED SCENE** | the pins (126,109) `first_road_bar` on `poi_first_road_bar` and (160,94) `fenside_lamp` on the re-sketched `poi_fenside_lamp`, 37 tiles apart across the ford, the fenside zone (118..141, 76..100) between them, declared one scene: the toll stands at the crofts' gate and Hale's lamp stands at the hamlet | [0,0] + [1,0] | 2 + 3 (R10: dangerAt's rolls, [0,0] centre 2, [1,0] centre 3) | 27..38 s | `fenside_crofts` becomes the weight-0 def `fenside_lamp` (Hale on watch, Leif, Halvor, Ingram, a new `fenside_crofter` pool); one name reads one ledger |
| The skral | wilds shore rows on the channel's west bank north of the ford (the ford's own banks read tier 1 under the crofts' haven relief and roll no skral) + the sluice and weir as dressing at the crofts' reach | rows | — | — | no core; the first hostile thing on the road stays the bar |
| Torsten's picket | trail DRESSING (slate, bell, the four grave mounds) at (-120,-124), 40 tiles from the dire wolf | [-1,-1] | — | 12 s up the trail; Torsten's morning walk down to it | no core; Torsten himself is posted at the fork rest; the rag on the 192 ring beside the second mound |
| The fork rest **+ the waystone + Torsten** | fork_rest's defId changes to a weight-0 `fork_waystation` (a prefab with an ElvenWaystone and extra posts; two new pooled unnamed sentinel actors under evencourt; Sergeant Torsten under waykeepers) | [-2,-2] | 2 | 24 s to the fork | canon: the lamps stop at the fork; waystones take over; the sketch is the shelf (22x8 at cap 22, the mouth's last cell authored); `cues.clearing` 4 so the ring fells the oak whose crown stood over the mouth; the north fringe's stumps are the clearing law's own |
| The Husk | moved OFF the High Road to (-64,-240): 109 from the fork, 128 from longmeadow_rest | [-1,-2] | 2 | 28 s + 24 off | `husk_of_the_line`, family dead, tiers [2,4]; found by the fallen cairn at (-73,-172) (zone `turnoff`) and the water where it narrows; the crossing walked both ways |
| The Ward Line (scar, dressing, no core) | authored zone `wardthread`, rect (-164..-128, -203..-179); no core; the thread, three stones, the root, Bodil's cut, two passive wolves, three civilians | [-2,-2] | 2 | off the fork rest, north of the road | Bodil's licensed cut stands here too, at the stand's west skirt |
| The Picket (scar, dressing, no core) | authored zone `picket`, rect (-131..-108, -140..-115); no core | [-1,-1] | — | 12 s up the trail | see Torsten's picket row above |
| The Turn (scar, dressing, no core) | authored zone `turnoff`, rect (-80..-67, -182..-167); no core; two tiles | [-1,-2] | 2 | on the High Road east of the fork | the fallen cairn and the DeadTree that mark the way to the husk |
| The Felling (the Drum) | weight-0 `felling_drum` (a goblin_warcamp variant, tiers [1,3], garrison 8) PINNED at (80,-42) (the cell pin found no ground on the ridge; this stands with no nudge), beside its burnt stand; the rolled dice run in the neighbour cells; its `rivalDef` is NOT on this authored def (authored cells never stage): the pressed-goblin satellite will ride the ROLLED goblin_warcamp def gated to the marches of an authored `hobgoblin_legion`, band 8 | [0,-1] | 1 | 20 s | a rolled Drum stood in the ring with ~11% probability, which is not a demo |
| The Legion core | pinned `hobgoblin_legion` (weight-0, tiers [3,6]) at (-64,-320); its reach is an AUTHORED patrol loop and straggler rows down the trail, never a satellite (authored cells cannot deal one); the pressed-goblin satellite is dealt by the ROLLED neighbour Drum's `rivalDef` | [-1,-3] | 3 | off every way | ≥128 tiles from fork_rest, longmeadow_rest and coldwater_shoal; reach and standard: band 10 (the standard would never land: cue scatter lands only on a road-bearing cone and the Legion is off every way) |
| The veil den | re-pinned in place under `veil_den` / `poi_veil_den` (the `repinned` boot line is the proof; the epoch-0 anchor (-186,-99) holds) | [-2,-1] | 1 | — | existing pin |
| The digs (kobolds) | (40,290), off every way, south of the Drowned Meadow across the Gloamwood; its spoil track runs north along the brook to the meadow | [0,2] | 2 | 26 s south of the hem | the Old Road never enters [-1,2]; the road-creep beat is dropped |
| The Third Stone + Aske's crew | re-defined `third_stone_rest` and MOVED to (-178,148): Band 0 found the shipped pin had never stood (a wolfkin bonering capital's clearance covers it); it now stands up a track 39 tiles off the Old Road, tier 3 by centre (moot for a haven); the spur trail is owed to band 10; Aske's crew are `company_blade` actor rows on watch (a haven cannot carry a hostile garrison) and their six-to-six road walk is owed | [-2,1] | 3 | 25 s + track | — |
| The broken barrow + the grub farm + Steinar's chain | ONE site: `broken_barrow` (weight-0, family dead, tiers [2,4], rows tribe dead + goblin_doorless, one merged prefab that carries the Charter survey line across the kerb) at (-208,48) (ruled (-236,72) had no ground; Band 0 verify moved it east to the first standing ground in the cell): [-3,0]'s centre reads tier 4 under the Spinewall's word, which would over-level a farming clan; tier 1 here is honest | [-2,0] | 1 | 15 s west of the hem | [-3,0] becomes empty on purpose |
| Steinar | **a Dawnmead throat** (the Charter's survey lead, billeted at the inn, quest giver there); his chain is part of the barrow site above | — | — | — | — |
| The Sett (the Dolmen) | authored zone with its own actors and spawn rows at (172,300) | [1,2] | 3 | 48-52 s south of the crofts | `amberfen_shoal` [1,1] is its acknowledged neighbour |
| longmeadow_rest / amberfen_shoal / returners_camp | unchanged (shipped) | [0,-2] / [1,1] / [-3,1] | 2 | — | counted honestly |
| The Drowned Meadow / the Ashen Hem / the Spoil Reach | belts: [0,1] / [0,-1] (the Felling's stand) / [-2,2] | — | — | — | no cores except the Felling in [0,-1] |

Census after re-celling: tier-1 cells with a core = 3 of 6 (the veil den,
the Felling, the barrow and farm; the west has no gate and
the barrow is its one core, so the cap is restated as 3 of 6; tier-1 cells
with a core lose Brede's bar, which stands at tier 2). Tier-2 cells with a core = 10 of 14: seven of this
epic (the fork waystation, the husk, the crofts and lamp, Brede's bar, the
Third Stone, the digs, the barrow and farm) plus three shipped havens and
shoals that predate it (longmeadow_rest, amberfen_shoal, returners_camp).
Tell the truth about the roll, not the plan. No new core
is allowed in a tier-2 cell for the life of the epic. **Empty on
purpose:** [-3,-1], [1,-1], [-1,2], [-2,2] beyond the belt, the far
north beyond the Legion, the whole First Road past the crofts for ~290
tiles to the tollhouse, and the Old Road's run from the Third Stone to
returners_camp, plus (band 8): the climb (35 tiles), the dark third (40),
the glade country west and north of the stand, the unlamped High Road west
of x -164, the road east to the crossing and the whole mere, the peninsula
between the crossing and the husk's apron, the far north to the Legion,
[-1,-1] beyond the picket's rect, [-3,-1], [-3,-2].

Census line (band 8): tier-1 cells with a core = 2 of 6 by centre
(geography.test's own line: veil_den [-2,-1], felling_drum [0,-1]); both
stand at tier 2 at the tile (the boot log says so, and Hollowhowl's
minTier 1 is why the crown stands whatever the jitter says): tell the
truth about the roll.

Density, with each way's denominator from the route points: First Road
gate to the crofts, 163 tiles, three things in two scenes (the Ashlamp at
9 s, the bar-and-crofts scene at 28-34 s) = 1.2 scenes per 100 tiles;
Hunters' Trail, 119 tiles, the wolves and the fork waystation = 1.7 per
100 (the husk stands 24 tiles off the road's end, out of the trail's
eyeline); Old Road hem to returners_camp, 243 tiles, the Third Stone alone
= 0.4 per 100, with the Gloamwood's own teeth between.

Validator work for Band 0: a pairwise ≥70-tile pin-spacing check in
validateGeographyDef, and a boot-log warning in the seeder when a forced
def's tiers exclude the cell-centre tier. The laws above are otherwise
convention, and the plan says so.

### 13.3 The cadence between things

Small finds, dealt through the minor-finds grammar and the litter vocab so
walking is rewarding without crowding, one every 40-60 tiles and never two
in one screen: a knocked-flat milestone; a single PitLampDark buried to the
glass; a cairn re-stacked one stone wrong; a knucklebone on a fence rail; a
kelp-string on a sluice post; a BrokenCart with its load spilled; a
FieldCairn with a cup on it; a DeadTree alone on a skyline; an EmberBed cold
in a ring of stones where somebody waited a night and did not go; a
CharterPost snapped; a set stone in the road where a wheel dropped; a
ward thread across a path you can step over and feel you should not.

### 13.4 The ten-minute demo walk

Minute 0-1: From the Ring at dusk (the walk starts at 19:00, brief §8): the
seven stones, the burnt cottage's stack top-left with its coal glow and one
thin exhale from the ember (the column is flame-gated and breathes from
dusk; by day the cottage reads by its ChimneyStack, CollapsedRoof and ash;
ruling Kit 11), and the lane of lamps going the other way. Minute 1-3: The
green at noon (the village variant of the walk): the tally stall, Hilde on
the bench (seated by twelve), Leif chalking at the stall front, the first
contradiction heard aloud (four carts / three carts and a barrow), one
board. Minute
3-4 the gate: two banners in two dyes, the sacking row under the oaks, the
threshold stones. Minute 4-5 the Ashlamp: the first scar, two stories and a
sign. Minute 5-6 the fen waist: the tier-2 cairn alone on the north
shoulder at (119,89), then the posts and the teeth narrowing the road to
one pair of boots, the roped drover, the counter and the board, the rags
running east to the water. Minute 6-7 Brede's bar: paper or not: Charter
paper walks the gap, everyone else fights or walks the south shoulder in
the dark. Minute 7-8 the drowned crofts: fields under water, the
scarecrow to its waist, Hale's lamp lit at the hamlet gate, the kelp-string
on the sluice post. Minute 8-9 the stream south: the last dry stones of the
Course with sheep on them, a PlumbStone, Sarsen setting a cairn right.
Minute 9-10 the view south from the Course: the Sett's dome on the skyline,
smoke from the Culm's hearths, and past it the tier-3 line and nothing
authored for a hundred tiles. Every minute has a pause in it.

THE NORTH VARIANT (one zoom, 1.3; the clock jumped between stops): the
picket at noon and at half past six (the one man the lamps were lit for,
chalking); the fork rest at noon and at nine (the lamps stop here: warm
behind you, three cold blue points across the road, no light on the
thread); the ward line at noon (the thread seen from the junction before
anyone explains it) and at eight (the passive pair walking it, the crew on
their three beds); the turn at noon; the husk at noon and through the
changeover with the clock running (be there at half past eight or it did
not happen); the den at noon; the Felling at noon and at eight (the clamps
breathing, the Doorless on their posts and the pickets meeting them, the
bodies where the fight was); the Legion at noon. Every stop has a pause.

---

## 14. Bands, amended for the rulings

The §9 bands stand, re-ordered so no band depends on a later one (the
Dawnmead rebuild needs every kit family's ART, not stubs; the Dolmen's
third corner ships with the Dolmen). K4's tile art is split from its
owner-gated worldgen touch.

| Band | Name | Ships |
|---|---|---|
| 0 | THE LEDGER OPENS | canon (§8) **plus** every new def id of §13.2 (`fenside_lamp`, `fork_waystation`, `third_stone_rest`, `husk_of_the_line`, `felling_drum`, `hobgoblin_legion`, `broken_barrow`, the Sett zone), their prefabs, the re-celled geography, the two validator additions, the Dolmen roster entry and bible entries, T-rows (next free T44), `names.mjs` on main reading the bible |
| 1 | THE SHEET AND THE COLD HEARTH | K0 as built (bc02b481) + K1 |
| 2 | THE FIELD | LG-0 (content + the S2C spectrum record and the skin-only door) |
| 3 | THE MARKS AND STATES | K2 |
| 4 | THE FIELD AFTER, THE DISPLACED, THE STRIPPED LAND AND THE GLOOM (art only) | K3 + K4's tile art (CharredStump, DeadTree, SpoilHeap, GloomStone, CreepRoot, FoulPool, CropBlighted); the worldgen touch stays in band 13 |
| 5 | THE SUBSTRATE AND THE MATERIALS FOLD | the BlobLayer seed prep + LG-1 + LG-2 |
| 6 | THE DAWN UNDER SIEGE | the ground-up rebuild (§7) on the full kit and the fold |
| 7 | THE FEN LAMP AND THE BAR | §3.1 with the one-scene design; the Dolmen's third corner is deferred to band 9 |
| 8 | THE HUSK AND THE WARD LINE | §3.2 + §3.3 at the fork waystation; the Felling at [0,-1] |
| 9 | THE STANDING COURSE | the Dolmen, run as four half-runs: 9a the creature-actor proof (THE MARL stands, shipped, see §11.8) → 9b the four props (CourseWall, CourseStile, CorbelCell, PlumbStone) plus Chalkline → 9c the remaining bodies and the sheet → 9d the Sett zone, the Course, Ammat's errand and the east fork's third corner |
| 10 | THE THIRD STONE, THE SPOIL WOLD, THE LAND BETWEEN | §3.4, §3.5, §3.6, §3.7 and the small finds of §13.3 |
| 11 | THE BLADES AND THE CANOPY FOLD | LG-3 + LG-4 |
| 12 | THE STUDIO HOLDS THE BRUSH | LG-5 |
| 13 | THE TRUE TILES AND THE BONES | LG-6 + K4's worldgen touch (one owner-gated regen deploy) |
| 14 | THE CORE GROWS | LG-7 |
| 15 | THE OVERRUN | Epic 2 |

Every band closes with the gates its section names and a commit; the demo
walk of §13.4 is re-shot at the close of bands 6, 7, 9 and 13.

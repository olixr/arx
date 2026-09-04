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
| **The Amberford Charter** | `fordgate` (faction, existing) | The First Road dry and billed by a causeway; the north stand cut on licence; the west tin seam chained; the Old Road lit for wains. "Never caught poor again." | Bills the drowned for the dike that drowns them; cuts the skral's weir to lay one straight road; chains a seam across a broken barrow and does not stop; counts the Doorless in the same column as stumps. | They build and their wains come. Fenna's tally is the only honest number in the valley: she alone knows the Copse cannot heat Dawnmead and the Third Stone both. | CharterPost (ochre survey stake, brass plate) |
| **The Waykeepers** | `waykeepers` (faction, existing; roadFaction) | The First Road lamped and walked to the ford; the husk taken back and BURNT; the Old Road left dark because they cannot walk it; the Returners' lamps put out as lies in glass. | Doctrine over people. They will not light the south and will not let anyone else; Torsten would burn the order's own first tower; they refuse Charter oil because it comes with a ledger. | A Waykeeper lamp has never once lied. Hale's First Lamp is the one unambiguous safety on the road, and Torsten's count of gnolls and wolves is the most accurate map anyone holds. Torsten is **right about a specific death** (the Company crew that walked past his picket lamp at dusk). | LampCairn (cairn with a lit lamp in its crown) |
| **The Red Company** | `reavers` (faction, existing) | The First Road slow enough to be worth a toll and the towns rich enough to be worth robbing; to be PAID to keep the dark road (cheaper than robbing it). "We do not forget", both ways. | Tolls the drowned at the one dry crossing; Aske's crew quietly tolls the Returners it is hired to protect; a croft that would not pay burned and the crew says nothing. | The nursery rule holds (no Dawnmead door, nobody under a first sword tolled). They pay their hires. Brede keeps a scratched water mark on his toll post and is wrong about what it means. | RedRagStake |
| **The Returners** (the Third Stone) | `returners` (faction, NEW) | The Old Road lit stone by stone to Kingsdelf by anyone's oil; the digs under it collapsed; the Waykeepers to admit the south exists. | They light lamps they cannot keep lit (the order's charge is true: no Third Stone lamp has held a whole night). They pay the Company out of a subscription taken from Dawnmead's poorest. They want the digs collapsed with the kobolds in them and call it road repair. | They walk the road nobody else will. Eskil has carried more lost new feet back to Halla's lodge than the order has. The subscription is public and Hilde reads it aloud on the green so no name is shamed. | PitLamp / PitLampDark (a lamp on a driven stake, never a LampPost) |
| **The Fenside Crofters** | `fenside` (faction, NEW) | The mere let down by the old sluice, not the causeway; the toll off the crossing; the skral off the sluice post; their corn carried by anyone at all. | They blame the skral for a sluice the water broke, and Njal's son put an axe through a skral keep-pool over it (the one thing the wave-treaty says ends everything). They will not pay the levy and will not stop asking for the dike. Their sheep are on Brammel's common without asking. | They are right that the causeway drains the mere into their own furrows and that the crossing should be free. Njal alone has noticed the kelp-string on the broken post: the skral **paid**. | SluiceGate (with the kelp-string variant) |
| **The Crown's chain** | `crown` (faction, existing; one party of three) | The west way and the Old Road entered in the Crown's book as Crown roads before the causeway makes them Charter roads. To file, not to fight. | Measures a road it will not lamp, garrison or pay for and calls the measuring ownership. Rurik notes the grub farm as "hostile encampment, 41 paces" and walks on. **Wants something someone has:** the Charter's concession chart, which he will lift from Steinar's table if he must. | His chain is honest. His miles are the only measurement of the west way that agrees with the ground, and when Steinar's stakes cross the kerb it is Rurik's stake that proves it. | ochre pennant on a pole (BannerStand, crown dye) |
| **The Even Court** (the ward line) | `evencourt` (faction, existing) | The dying stand left standing until it has finished dying; no living wood felled; the fork's waystone kept. They will not say whether they know why the wood is dying. | They string a thread across a wood that heats a village and say nothing a villager can understand; they let a Charter feller walk into the veil pack rather than warn him in a tongue he speaks; Sylwen's court dismantled a Company crew "politely" and the crew's boy is in a GraveMound on the trail. | They do not fell living wood and never have. Their waystone is the only light on the Thornveil fork that draws nothing at night. They were here first and it is not a boast. | WardThread |
| **The Drum** (goblins of the Felling) | family `goblin`, tribe `goblin` (existing) | Charcoal by the clamp, worg-meat off the herds, the muster fed and fired before the cold. They fell the dying stand because dying wood chars best. | They burn the wood past grey-root, take the croft's sheep and then the croft, hunt the Doorless as deserters, and the drum they answer is crimson and not theirs. | They are the only party keeping the cold off their own backs by fire, and their pickets shout before they loose, which is more than the Legion does. Their harvest is honest about what the wood is. | SkullTotem / TrophyStake (existing) |
| **The Doorless** (goblins who left the door) | family `goblin`, tribe `goblin_doorless` (NEW tribe on a weight-0 grubfarm variant) | To be left the ash and the wold's edge to farm grubs in, warm before the cold that drove them up arrives topside. Fire for the beds, not the war. | They came up through a kerbed barrow and broke it. They raid the coop and the drover's yard (a sheep, a bird, never the granary). They think every lamp is a hunt coming for them and **douse Hale's picket lamp**, and a wain went into the ditch dark for it. They will not fight the Drum even when the Drum comes for Dawnmead. | They cut only snags. Their grub-beds are the one thing that grows on gloom-touched ground. They PAY: a knucklebone left on the fence for what they take, the skral's arithmetic in goblin hands (author-facing rhyme only; no throat says "skral"). | a knucklebone on a fence rail (Detail, no tile) |
| **The Legion** (hobgoblins) | family `hobgoblin`, tribe `legion` (existing people; core at tier 3) | Every goblin on the wold under the crimson banner by the next moon; the wold's timber for palisade; Dawnmead as a drill exercise, later. | Press-gangs a people who were farming; burns what it cannot carry; its gate faces the road because the road is next. | Drilled, square, honest about what it is. They do not toll, do not dig cairns, tend their wounded, dig their latrine. The one straight line between the Spinewall's deeper things and the west way that has held all year. Harguk Fiveblows has a face and a name. | LegionStandard (one crimson square, never varies) |
| **The veil pack** (wolfkin) | tribe `predators` (existing) | Out of the veil, which they cannot say why; the sheep; the trail. | Took two sheep and a drover's dog; hunt the trail at dusk exactly when new feet walk it. | Wolves leaving a wood is a true thing (the spine's beast) and killing the pack clears the trail for what is behind it. They do not toll, dig or lie. | BoneTree |
| **The husk warband** (gnolls) + **the struck line** (the dead) | tribe `gnoll` (NEW declared) / tribe `dead` (NEW declared) | Gnolls: the tower by day, the deer, the den once the wolves are gone. The dead: to keep the watch they were struck from; to light a lamp that is gone. | Gnolls eat the Company crew, the deer, the sheep, and moved in on a grave. The dead cut down anything on the trail after dark, gnoll or player or drover's dog. | The gnolls did not fell the tower and did not dig the graves: the order struck it from the rolls and left it. The dead keep the north better than the living; while they stand the gnolls do not. | BoneMidden / KnucklePit (existing) ; GraveMound (existing) |
| **The digmasters** (kobolds under the Old Road) | tribe `kobold` (NEW declared) | Up and out, thoroughly. To tamp the seam behind them. Not to be talked to. | Undermine the Old Road's milestones so a wain wheel drops; bury a Returner lamp stake in spoil; bite. | Not wicked, thorough: every cairn they undermine they re-stack (one stone wrong), every hole they open they tamp, and the Gloamwood's bats are thinner where their spoil lies. What they are digging away from is never said. | TallyStone |
| **The upstream shoal** (skral) | tribe `skral` (NEW declared) | A weir on water that does not drown it; the crofters' keep-pool put back; the wave returned. | Their weir broke the sluice when they moved it; they took the crofters' fish; when Njal's son axed their keep-pool they took his Dugout and left the axe on the bank, which is a sentence. | They pay. They wave. They moved because the fen rose under them, which is the truest reading of the water on the First Road, and they cannot say it. | TideTotem (existing) ; kelp-string (Detail) |

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

World coordinates; anchor (-64,48); rect (-160,-64) to (32,160). Placement
notes flag where the site scan may refuse (the Amberfen mosaic heart is
(90,60) r68; the existing pins at (122,112) and (148,98) sit on its rim for
that reason). **Every authored site is probed with the FLAG= bisect and a
fresh-page screenshot before pinning.**

### 3.1 THE FEN LAMP AND THE BAR — east, the First Road

Places, in walking order from the gate at (32,48):
- **The Ashlamp** at the causeway head (~(72,64), on a willow islet at the
  fen's west rim, ~140 tiles): a burnt Waykeeper waystation. RuinWallStone
  shell with three breaches, a LampPostDark with a cold socket, CharredBeam
  heap, one EmberBed that still smokes, AshHeap, Detail.Ash ring, a stalled
  Charter wain (BelongingsCart + CrateGoods under tarp) with Fenna's tally
  board beside it. **Not a POI: an authored dressing patch** (site scan will
  refuse the marsh; the patch is a prefab stamped by an authored zone-less
  sketch at the causeway head, weight 0, no garrison, tier ignored).
  Attributed two ways and a sign: Hale says the Company put a torch to it;
  Brede says the order pulled its crew and let it burn, and keeps a lamp-glass
  on a TrophyStake to prove they left it; the sign says only
  "THE ASHLAMP. Struck." Berrit's winter is **not** this fire (timeline: the
  winter was before most of the current village; the Ashlamp burned in the
  spring).
- **The Causeway Head** beside it: the Charter's dike-stake line (CharterPost
  run + Fence standing in WaterShallow) and spoil bank marching east,
  WoodFloor pallets over mud, a Counter under canvas with the levy book,
  StreetLantern pair, CrateGoods/BarrelStack, an ochre pennant, warded
  ChestIron. Dike-master **Ingram** (fordgate actor, post hearth).
- **The First Lamp** at ~(162,38) where the road climbs out of the marsh on
  the fen's east rim (~226 tiles, tier 2; fallback (36,-4) at the north rim):
  a weight-0 authored `first_lamp` haven in the last_lamp mould, safeR 12.
  LampPost + WayShrine + StoneBench + milestone Rock + canvas lean-to +
  BarrelStack of tithed oil + a chalk-tallied post. **waykeeper_hale** on
  watch, pooled wayward_watch on the ring, and **Leif** the lamp-boy whose
  routine walks to Dawnmead's green and back daily. Hale is **removed from the
  wardens_outpost actor pool** (replaced by a name-free pooled sergeant) so no
  rolled outpost mints a second Hale; the two quests that name him
  (`the_lamps_of_the_line`, `the_long_way_round`) now find him where their
  text always said he was.
- **The upstream weir** on the sluice reach (~(44,92)): skral_shoal variant
  garrison (tribe skral) on WeirPanels + KeepPool with an axe-cut in it +
  TideTotem + ReedShelter; the old sluice (SluiceGate) on two posts, one post
  with the kelp-string variant.
- **Brede's bar** = the pinned `first_road_toll` bandit_camp (122,112): the
  toll-warden crowned via `names[]` as **Brede**; SpikeBarrier + a TollBar
  (TimberPost pair with a rope; no new tile), RedRagStake line to the crofts,
  PrisonCage with a Charter drover who could not pay, WarTable as a counter,
  NoticeBoard of receipts, chest_pit_takings warded. Brede's mark-post
  scratched with six water lines a finger apart.
- **The drowned crofts** = the pinned `fenside_crofts` roadside_hamlet
  (148,98), re-dressed: Tilled rows authored as WaterShallow with Scarecrow,
  IrrigationChannel and Fence standing in it (no flood system; the "rising" is
  carried by Weir's stake, Brede's post and Fenna's ledger in three units),
  drowned corn cut green on stilted PorchDeck pallets, Dugouts, RailWood pens
  on stilts. Headman **Njal** (fenside actor) and the pooled crofter bodies.

**The contention.** The water rose and nobody saw it rise. Ingram says the
Company broke the sluice to keep the road slow ("a wet road is a paying
road"). Njal says the skral broke it moving their weir, and his son answered
with an axe. Brede says nobody broke anything, the water came up "like a bill
nobody sent." Hale says the road past his lamp is the Charter's problem and
the fen past the road is nobody's (he is a sergeant, not a doctrinaire; the
lie-in-glass doctrine is spoken locally only by Torsten, quoting Liv). The
kelp-string on the post says the skral paid, and only Njal has noticed. All
four accounts are locally true.

**The fork — THE CAUSEWAY OR THE SLUICE.** Both quests require
`quest:the_first_road:done`; each offer tree `forbids` the other's
`quest:<id>:done` and `active`; both set the bare flag `fen_side_taken`.
- (A) *Stakes in the Waist* (Ingram): carry eight stakes, plant the dike
  line, hold the head against the shoal's sortie when the stakes cut its
  reach, post the levy on Dawnmead's green. Rewards: +fordgate, a Charter
  causeway-pass (Brede's crew honours Charter paper: the toll refuses to
  charge the character), Fenna's ledger opens a repeatable corn-carry.
  Costs: −fenside (Njal's closed throat at outlaw band; the crofter pool's
  barks turn), Weir's shelf line "you dried a water I fish" (a shop line, not
  a refusal), flag `weir_cut` read by Weir and by the skral zone's sign.
- (B) *The Old Gate* (Njal): repair the sluice with boards from Ottery's
  shed, carry the kelp-string back to the weir and set it on the TideTotem
  (wordless), then carry the crofters' green corn past Brede's bar without
  paying (stealth, fight, or Brede's third offer: he carries it for a cut).
  Rewards: +fenside, a crofter's Dugout, the kelp-string as a held token.
  Costs: −fordgate (Ingram bills "obstruction" and Fenna's ledger closes to
  the character), Hale posts the character's name on the lamp as a toll
  walked (a bark and the rota bill on the green).
Neither side ends the toll; only the frontier's shared dice can
(`bounty_open` on the bandit_camp cell). Aldis's `word_on_the_road` reads
`fen_side_taken` and files it under the Toll War's fourth duration.

### 3.2 THE HUSK — north, the hunters' trail

- **Torsten's picket** at ~(-104,-86), just past the TOWN_SPAWNS wolf pairs:
  two LampPost, a bell on a TimberPost, a slate with an authored tally
  (Signpost words: gnolls eleven, wolves seven, "ours" three with a line
  through the three), a StoneBench nobody sits on. Sergeant **Torsten** and
  two sworn (waykeeper actors, invulnerable haven watch safeR 8). Four
  GraveMounds beside the trail with a red rag on a stick: Aske's brother's
  crew, who walked past this lamp at dusk against Torsten's word.
- **The Felling** at ~(-140,-140), cell [-2,-2] (~210 tiles, tier 2): the
  **rolled** goblin_warcamp core the frontier already deals here at tier 1-3
  weight 3, but authored as a `cell` pin so it stands on the first visit
  (cell pins are still authored cells; the frontier beats below ride the
  **satellite** the Felling's stage-2 rung deals, which is a rolled cell).
  The Drum: punctuation palisade, worg pickets (rows wear tribe `goblin` so
  the den's wolves fight the camp's own worgs), a firecaller, four
  SmolderHeap charcoal clamps in a downwind line (cap four per prefab), forty
  tiles of CharredStump in rows with Detail.DragFurrow to the camp, a ring of
  DeadTree snags where the roots went grey. On the trail side, the Charter's
  **licensed cut**: feller-boss **Bodil**'s crew (fordgate actors on watch,
  Sawhorse, FelledLog, LumberRack, a CharterPost with the lot number, ochre
  canvas). A Doorless night row (tribe `goblin_doorless`, hours 20-06) cuts
  snags at the edge and leaves knucklebones on Bodil's rope.
- **The husk** at ~(-96,-168), cell [-1,-2] (~236 tiles, tier 2): weight-0
  variant `husk_of_the_line` on the `poi_watchtower_husk` prefab, family
  `dead`, tiers [2,4], with a gnoll garrison row hours 05:30-20:30 (tribe
  gnoll, packlord crowned from the pool: Old Cackle) and the existing
  skeleton rows 20:30-05:30 (tribe dead, crowned "the Struck Sergeant" in the
  Pale Reeve mould). **Overlap 18:00-20:30 where both stand on the ground**
  and the changeover is a fight the player can time from the picket. WallStone
  breaches re-crested with RuinWallStone, StoneFloor, CaveRubble, a
  LampPostDark torn down across the door (the order's own lamp, snuffed, used
  as a cook-pot by day), BoneMidden and KnucklePit on the swept-gravel apron,
  TrophyStake with a Waykeeper's grey wool, a Brazier with a lights row timed
  20:30-05:30 (it lights itself), a lamp bracket with no lamp. Between husk
  and den: a deer kill-field, Detail.Bones, wolf tracks, a snare line cut.
- **The veil pack** in the pinned `veil_den` cell [-2,-1]: dire-crowned
  (Hollowhowl), BoneTree at the den mouth, BeastNest, gnawed BonePile.

**The contention.** Sorrel wants the pack culled. Alder says the wolves are
running from something and killing them clears the trail for what is behind
them. Torsten wants the gnolls out and then the tower burnt so the struck
line has nothing to stand in. Hale wants it left standing ("a line that keeps
its post is not the order's shame"). Aske wants the gnolls dead for his
brother and will pay. Everyone's local read is "a bad year for wolves" and
nobody asks why a pack that denned in the veil for forty years came down.

**The fork — THE PACK OR THE SQUAT.**
- (A) *Wool Count* (Sorrel): cull the veil pack (a player clear of a rolled
  satellite knot; the den cell itself is pinned and stands). Rewards:
  +fordgate, a drover's fleece cloak, Sorrel's pen sells cheaper. Costs:
  Alder closes his copse **trades** to the character (shop refusal line; his
  quest and talk objectives are untouched, the tutorial is done by now),
  Torsten's slate bark reads "wolves 0" and his uneasy tree stops paying
  relief.
- (B) *The Tower's Debt* (Torsten, with Aske's coin stacked if
  `fen_side_taken` is set): break the gnoll squat by day (killable garrison
  rows), then hold the breach with Torsten until 20:30 and watch the line
  stand. Inside the quest, one choice: hand Torsten the oil (he burns the
  bracket room; flag `first_line_burnt`, which Hale reads as shame) or refuse
  it (flag `first_line_kept`, which Torsten never forgives). Rewards:
  +waykeepers either way, the order's grey wool, Aske's coin (+reavers if
  taken, and Hale hears). Costs: −fordgate via Sorrel ("you left my wolves").
The husk itself never changes hands for good (F2: NPC kills never ember a
site, and the site is authored). Both roads teach the same lesson: the trail
is not safer after either.

### 3.3 THE WARD LINE — north-west, the Thornveil fork

The mysterious party the first drafts forgot. Where the hunters' trail ends
at the Thornveil fork (-140,-176) and the stand is dying from the roots:
- **The waystone glade** at ~(-176,-190) (~250 tiles): the existing
  `waystone_glade` haven def pinned, ElvenWaystone at its heart, two Even
  Court **sentinels** from the sentinel_arbor pool (unnamed; elves never
  name-bomb), speaking the old tongue that is never translated and one line of
  the common tongue each per visit. Their light draws nothing at night (no
  flame gate, cool row).
- **The ward line**: WardThread strung tile to tile across the dying stand
  from the glade toward the Felling's snag ring, GloomStone at three points
  along it where the roots went grey (the only gloom-touched ground in the
  north), a single CreepRoot at the line's end that nobody explains.
  Stepping over the thread is free; cutting it is the evencourt deed hook.
- **The contention.** The stand heats a village and a camp and a waystation.
  The old folk will not fell living wood and will not say whether they know
  why it is dying. Alder wants it thinned before frost and blames the wrong
  people. Bodil cuts on licence up to the thread and has started cutting past
  it. The Drum chars it. Torsten wants it left standing because grey-root
  posts rot. The wolves walk the thread unbothered, which nobody but the
  sentinels has noticed.

**The fork — THE THREAD OR THE AXE.**
- (A) *Keep the Thread* (a sentinel; one common-tongue line): carry the cut
  threads back to the waystone and re-string the line; stand at the glade one
  dusk while the Drum's pickets test it. Rewards: +evencourt, a moonglass
  chip (held token), Alder's bark changes to the one true reading ("the pack
  went north; that is the one true thing this year"). Costs: −fordgate (Fenna
  bills the stopped licence), Bodil's shelf closes.
- (B) *The Grey Root* (Alder, with Bodil's licence): fell the dying stand
  yourselves before frost, past the thread, and deliver the cordwood to the
  Copse yard. Rewards: +fordgate, the Copse's bow-wood shelf, the village's
  winter tally posted full on the green. Costs: −evencourt (the sentinels'
  closed throat; the waystone's light goes cool to the character's eye is a
  bark, not a light change), Rill's stave shelf reads short (no north yew).
Both defensible: the axe is the war; the axe is the winter.

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
- (A) *Stake the Seam* (Steinar, with Fenna's licence): drive the Doorless
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
  Copse's west shelf. Costs: −fordgate (Steinar's shelf closes; Fenna bills
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
| East | THE CAUSEWAY OR THE SLUICE | Ingram / Njal | +fordgate, causeway-pass, corn-carry | +fenside, Dugout, kelp-string token | `fen_side_taken` |
| North | THE PACK OR THE SQUAT | Sorrel / Torsten | +fordgate, fleece cloak, cheaper beasts | +waykeepers, grey wool, Aske's coin | `first_line_burnt` or `first_line_kept` |
| North-west | THE THREAD OR THE AXE | a sentinel / Alder+Bodil | +evencourt, moonglass chip | +fordgate, bow-wood shelf | `ward_line_taken` |
| South | THE LAMP OR THE LAW | Eskil / Torsten via Hale | +returners, PitLamp, Kingsdelf shelf | +waykeepers, lamp glass, the bell | `south_road_taken` |
| West | THE FARM OR THE STAKE | Steinar / Rurik+Alder | +fordgate, tin route | +crown, Doorless token | `grubfarm_burnt` or `grubfarm_spared` |

Rails: every offer tree requires `quest:the_first_road:done`; each pair's two
offer trees carry `forbids` on the other's `quest:<id>:active` and
`quest:<id>:done`; opposition costs are AUTHORED in `rewards.standing` and
stated in the offer text (never auto-cross); all standing deltas sit inside
the LADDER CONTRACT caps. New faction ids `returners` and `fenside` are
roster entries (members = real actor slugs; fineActor = Eskil / Njal) before
any delta compiles. No delta targets goblin, kobold, dead, gnoll, skral,
wolfkin (reputation is for speaking parties only); their side of every fork
is a character flag, a token, a bark gate.

Gates on the tutorial: none of the ten givers is a teacher; Alder's and
Weir's tutorial objectives are untouched (only shop lines change, and only
after the capstone).

---

## 5. Living-world beats

**Ship in v1 (all compose on existing grammar plus the dials named):**
1. **The ranks re-form at dusk.** Gnoll rows 05:30-20:30 and dead rows
   20:30-05:30 on one husk def, overlap 18:00-20:30, matrix row
   `dead|gnoll hostile@10 initiator dead`. Zero server code.
2. **Worg against wolf on the trail.** The Felling's worg rows wear tribe
   `goblin`; row `predators|goblin hostile@8`. The den's wolves and the
   camp's worgs meet at dusk where the loops cross in the Ashen Hem.
3. **The Drum hunts its deserters.** Row `goblin|goblin_doorless hostile@10
   initiator goblin`; the Doorless night row at the Felling's snag ring meets
   the Drum's pickets.
4. **The dead against the door.** Row `dead|goblin_doorless hostile@8
   initiator dead` at the broken barrow; the Doorless night hoes fight at
   the kerb.
5. **The watch charges what the bar charges.** Existing watchVsMenace: Hale's
   ring and Brede's crew both charge any goblin satellite that seeds between
   them; enemies fighting the same goblins sixty tiles apart.
6. **The hired dark.** Aske's rows tribe `reavers`, hours 18-06 on a road
   loop; the haven watch charges any Gloamwood menace; the crew dies for the
   lamp.
7. **Misaligned pairs coexist.** `neutral` rows with range for
   `goblin_doorless|kobold`, `skral|reavers`, `predators|evencourt`,
   `crown|goblin`.
8. **The pressed satellite.** FRONTIER dial `boldness.rivalDef` on the
   Felling's def: stage 2 deals the Legion's pressed-goblin def townward
   (seedOneSatellite already takes any def id via `poiForCell(force)`).
9. **Smoke that does not bake.** EmberBed / SmolderHeap lights rows
   (COALS-class, flame-gated where man-made) plus a dt-gated `smoke.plume`
   grain in the `collectStaticLights` scan (spawnPortalFx precedent). From
   the gate the player sees smokes when they get there; nothing on the sky
   band (no weather system exists and none is proposed).
10. **Bickering on the green.** Two-actor bark exchanges on the closed world
    flags Halla already reads, plus the one new rostered flag `war_near`
    (predicate: two mutually hostile cores inside watchTiles 96). Leif walks
    in daily to chalk the tithe on the green's LampPost and bickers with
    Fenna on `toll_near`.
11. **Bodies where the fight was.** GraveComp-pattern spawner: an NPC-vs-NPC
    kill inside a POI zone raises FieldLitter on the nearest free tile for
    the spill's quarter hour, capped six per zone, dignity 48, never inside a
    town rect. No loot, no XP, no ember (F2 holds).
12. **The wolves leave, as a reading.** On `ward_line_taken` (A) Alder's bark
    changes; the den is never embered by a quest.

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
| 520 | DeadTree | C | yes | timber law (choppable, deadwood logs, respawns as itself) | limbs at 0.35 wind | trees.ts foliage:0 through the engine switch; FADE_TALL |
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
| 176 | Detail.Ash | floor | — | — | — | baked beside Sawdust/Straw |
| 177 | Detail.Bones | floor | — | — | — | den edges, squats, old fields |
| 178 | Detail.DragFurrow | floor | — | — | — | felled rows, cart tracks, spoil paths |
| 179 | Detail.BlightVeins | floor | — | — | — | around GloomStone/CreepRoot |
| 180 | Detail.DarkSpill | floor | — | — | — | blood-dark by value, never red |
| 181 | Detail.Mudcrack | floor | — | — | — | the drained pond |

Deferred to their own round, owner-gated: **AshGround** as a true BlobLayer
(ground bake, footprint ink, worldgen burn-country redraw),
**GrassBlighted** (grass engine), **QuarryFace** and **BoardedAdit** (no
v1 scene needs them). The Doorless knucklebone and the skral kelp-string on a
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
fellers_camp / timber_poachers; dungeon dress.ts stories 'burnt_steading' and
'the_tally'; influence.ts litter vocab 'ruin', 'blight', and claim-marks per
family (plunder→RedRagStake, den→BoneTree, digs→TallyStone/SpoilHeap,
neutral→CharterPost/LampCairn by road proximity); server interact hooks
(SignpostBurnt scorched notice, WellFouled refusal, CropBlighted harvest
refusal, FenceBroken passable by solid:false).

### 6.4 Kit phases

- **K0 THE SHEET** (half day): ids, TILE_DEFS, inks, museum wing stubs, palette
  category, test pins. Every id exists and the strays gallery is quiet before
  any brush.
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
| **The Ring and the west meadow** | Identical inside eight tiles. Beyond: a worn Dirt desire line curving north-east toward the burnt cottage (feet went to look), three CharterPosts in a ruled line at the west meadow (one fallen: CairnFallen posture is wrong for a post; use a Rock + Pebbles), one DeadTree at the hem. The first eyeful after waking: seven pillars, one thin smoke, and a lane of lamps going the other way. |
| **Keeper's Way** | Untouched as a home. TiedParcels on the porch step (letters going out with whoever walks east). Wren's hub gains one `threat_near` line: "Halla is counting again. I knit; it comes to the same." Wren offers **no** theory about the cottage (her refusal is her position). |
| **The Green** | Still grass, but argued on. Dirt desire lines lane→inn and well→bell. THE TALLY STALL: one MarketStall kept, its twin replaced by Table + Lectern, a fordgate bannerStand, road-tally crates; **Fenna** (Charter tally-clerk, fordgate member) by day. A Bench by the bell where **Hilde** (Returner widow) sits at noon. **Leif** the lamp-boy's midday stop in front of the stall. The NoticeBoard gets authored words if the tile is a sign, else the DAWNMEAD post's second line: "Carts turned at the fen waist: four. Lamps out past the gate: two. Signed for the Charter." Two banner poles, one planter. |
| **The Five Stones inn** | Fuller than it was: crates and baskets in the wing aisle (aisle stays one wide), two crofter children's things on the common-room floor, the pennant down. Gilly: "Four beds, and I am making up floors. Do not tell Berrit I am winning." **New throats get their own beds** (Fenna in the worn cottage, Hilde in the green cottage, the crofters on the crowded roof); the four claimable guest beds stay the waker's. |
| **Cottage Row** | WEST: THE BURNT COTTAGE. RuinWallWood outline with the south wall gone, RuinWallStone at two corners, CollapsedRoof where the roof came down, ChimneyStack standing alone at the north wall, EmberBed at the hearth breathing a thin smoke by day and a coal-glow at night (the column the Ring sees), AshHeap, Detail.Ash, GrassTall through the ash, CaveRubble as walkable debris, a BelongingsCart of salvage in the lane. One board: "HOBB'S COUSIN'S ROOF. Went up in the spring. Nobody agrees how." Three mouths and none corrected: Halla (a dusk fire jumped the hedge, hers to own), Brammel (thatch rotten a year, he said so), Wick (the sixth stone). MIDDLE: THE RETURNER'S HOUSE (Hilde): kept, hedge unclipped, a PitLampDark by the door she has not lit. EAST: THE CROWDED ROOF: two crofter families in one house, extra Bed pair, crates, BelongingsCart in the yard, WaterTrough, two sheep in a RailWood pen with the gate open, DryingRack. |
| **The farmstead** | Robbed by weather and rats, not raiders: two crop rows to bare Tilled, pumpkins short two, a second CritterCage at the coop, a CharterPost at the barn's wain door. Sign: "Six beds, three crops, one man who wants rain." (No tutorial quest collects carrots, onions or bittercress; verified.) |
| **The Common** | Contested grass: the crofters' sheep on it, Brammel's hay moved to the far rail, two CharterPosts inside the west gate, one rail down at the south-east corner as FenceBroken (the crofters' way in). Brammel vs the crofter at the west gate at midday: "His common is grass. Ours is ash." |
| **The orchard and the trail head** | Kept (gardens survive bad years). At the hedge arch, **not** on the trail: two DeadTrees where bark was stripped, Rill's rag-stakes (RedRagStake hashed to a plain rag) with a BonePile at the foot of one (she hung the skull so the sign is read by people who cannot read; she does not walk the trail, per the bible), the trail's first ten rows worn three wide. Rill's one new line stops at "The wolves came down to the arch in the spring. They do not come to be fed." |
| **Weir's fishery** | Weir's record made visible: four notched TimberPosts on the near bank, the newest highest (his "up a finger" as a line of stakes you can see from the bridge). A second WeirPanels. Otherwise the one calm district. |
| **Sorrel's yard** | A BrokenCart she is fixing unasked, FieldLitter by the gate where a load spilled, a third HitchingPost for the carts off the road. |
| **Ottery's works** | Making swords now, not stools: a SpearRack beside the WeaponRack, a charcoal BarrelStack, Alder's log supply short. "I would like to make one stool this year. One." / "Make it a sharp stool." |
| **The cookhouse** | Feeding more than the table seats: a second bench pair, a CrateStack of the crofters' bowls, the kitchen garden picked to the stalks, the Woodpile doubled. Berrit never discusses the winter. |
| **The muster court and the count-knoll** | A muster that musters: a fourth Vale Ward on a new `dawn_ward_muster` routine standing the line by day and taking the lodge's hot bunk at night; THE MUSTER LINE sign with the fire count and the rota; HALLA'S CHART (WallWood stub + board awning + Table + Lectern, where her watch trees are physically read). South of it THE COUNT-KNOLL: a level-1 raise 7×4 with stairs on its south face, a Brazier and a StoneBench inside the rim, a sightline straight down the spur to the south hem's notch. Halla's dusk stop moves here (a new stop; her post does not). The first elevation in the zone flips `hasElev` (serialize round-trip pin). |
| **The pell yard and the lodge** | ArmorStand → ArmorStandFull (kit issued, nobody's), FieldLitter at the scarred wall's foot, the hot bunk finally has a body. |
| **The butts and Rill's shed** | Untouched except a second stave rack and shavings spreading to three tiles: she whittles when worried. |
| **The spark circle** | Varn has been testing the cottage ash: an AshHeap on the pad's east verge with CrateGoods marked 'samples'. "Ordinary ash lies down. This sat up. I have written it down. Nobody will read it, which is the usual." (He does not know why.) |
| **The Copse, the log yard, the crag** | Two oaks felled out of turn (Stump + FelledLog), one DeadTree at the stand's south end that Alder will not fell. The crag gains a SpoilHeap where a seam face came down and a CharterPost counting the copper; ore rocks unchanged. |
| **The old granary** | Already the right voice. Rats back a season early: one knot moved to the open dirt at the south breach so the fight reads from the road (re-run the walkability flood after the move), a SpoilHeap replacing one CaveRubble for silhouette, a second BurialUrns stack. Sign: "Rats took the roof year before last. Back early this year." Nothing surfaces on a flag. |
| **The brook, bridge, ford** | Dirt shoulders where wheels leave the Path; a FieldCairn on the east bank where the crofters crossed. Berry banks untouched. |
| **The crab bank** | Untouched. The first mark for a beginner stays the calm one. |
| **THE SACKING ROW** (the East Wold) | Three families under sacking along the hedge's south face between the gate lamps and the water: TentHide ×2 + LeanTo against the hedge (a freestanding prop, not an awning), an EmberBed cooking fire (never a Campfire), WaterTrough, BelongingsCart and a BrokenCart, CrateGoods, DryingRack, FieldLitter where a load spilled, a trodden Dirt ellipse. No sign (the FIRST ROAD board is the eyeful's board). A day camp unless the seating audit admits Bedroll as a lie stop; the crofters sleep on the crowded roof. From the gate lamps the row is the first thing a departing waker sees before the threshold stones. |
| **The First Road gate** | Still the send-off, now with a cost: a waykeeper-dyed bannerStand by the WayShrine, a fordgate-dyed one across the road, a CharterPost at the milestone where carts are counted, a BrokenCart at the verge, Dirt shoulders. Sign: "Amberford, a day east. Lamps to the fen waist. Then ask Hale." Hale himself stands at the First Lamp outside the rect; Leif walks in. |
| **The old-road spur and THE ROAD ROW** | Worn hard for thirty rows (feet go to the knoll and the graves), then breaking to alternate-tile Dirt with GrassTall between. At its shoulder THE ROAD ROW: three cut Gravestones and one GravestoneTall under an oak (older stones, freshly cut), and ONE GraveMound with no stone yet: a **crofter's** dead from the drowned crofts, not Halla's (the bible says she lost wakers not recently). A RailWood run with the gap open, StoneBench, FieldCairn where the path meets the spur, Tuft not flowers. Three mouths: Halla "Two of mine, years back. I counted them once, out loud." Gilly "The new one came up the old road in a cart." Alder "Those stones are older than this year. They cut them fresh." Past the row a ColdCamp where somebody waited a night and did not go, two DeadTrees framing the hem's notch, the edge woods thinned so the road out reads as a road into something. |
| **The quiet quarters** | The breathing room, kept empty on purpose. A DeadTree at the north-west hem; the west meadow's three survey posts; the high meadow's stags gone (an empty meadow is the point). |

### 7.4 New throats (all names verified collision-free against content, docs and the bible on 2026-09-04)

| Slug | Who | Faction | Post | Bed |
|---|---|---|---|---|
| `charter_fenna` | Fenna, tally-clerk | fordgate member | the tally stall by day | the worn cottage |
| `returner_hilde` | Hilde, Returner widow with the oil-subscription slate | returners member (never a fineActor) | the bell bench at noon | the green cottage |
| `fenside_crofter` ×3 (pooled, titled, no names) | the drowned-out | none | the sacking row, the crowded roof's pen, the Common's west gate | the crowded roof |
| `waykeeper_leif` | Leif, Hale's lamp-boy | waykeepers | the green at midday; walks in from the First Lamp | the First Lamp (outside the rect) |
| `dawnmead_ward` (fourth) | the muster ward | fordgate enforcer (as the other three) | the muster line 07-19 | the lodge hot bunk |

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
where the road stops being walked." Both right, neither says so. **Fenna vs
Leif** on the green (who pays for lamps and who walks them; four carts vs
three carts and a barrow, contradiction canon). **Hilde vs Leif** (the lamps
are a decision, not a weather). **Fenna vs Gilly** (a Charter chit for a bed
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
ellipses, never a rectangle; graves stand on grass. Ruins grow weeds. One sign
per eyeful (screenshot THE MUSTER LINE against THE OLD ROAD; move the latter
six rows south if they share a screen). Singleton pins: the refugee fire is an
EmberBed. Elevation law for the knoll (rim auto-fences to Cliff; keep props
inside x101-105, y139-140; the spur's Dirt at x107-108 is clear of the rim).
KEEP_OUT: add the sacking row, the Road Row, widen the south notch. Scatter
order: authored Tuft after the scatter. Occlusion law: nothing tall one or two
rows south of doors, stations, signs, posts. Routine laws: post-is-the-origin,
night paths end `lie:true` on the foot tile of a two-tile head-north bed,
every lie/sit stop stages on a walkable cardinal neighbour. Dialogue rails:
world flags closed, node ids frozen, node text ≤480, choices ≤90, whole
sentences, no dashes, Berrit never discusses the winter, Wren never explains
the Ring, Wick is never corrected. GEOGRAPHY-DOC PURITY at rollout (the zone
has never been rolled to prod; the two new pinned sites need the Studio
append if the prod doc is tool-edited).

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

## 10. Decisions the owner holds

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

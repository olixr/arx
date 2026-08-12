# THE TENDED EARTH — farming and husbandry become a life worth living

A player who never draws a blade should be able to log in, work their land, feed
their animals, work their stations, fill a market order, and log out feeling as
rewarded as the player who cleared a dungeon. Today the farm is a sound skeleton
with almost no meat: six crops capped at level 30, two animals with two verbs,
no soil, no quality, no feeding, no processing, herbalism dead above 40, and
produce worth 3 to 10 coins in a world where selling anything anywhere pays half
value. This epic is the deep, curated pass the farm has been owed since the
Homestead update: Stardew and Harvest Moon depth spoken in Arx's own vocabulary,
under Arx's own laws.

## 1. The mandate (user brief, 2026-08-11)

- Farming and animal keeping are a headline pillar, not a side system. Stay-home
  players must be rewarded in their own right, at parity with adventurers.
- Go deeper and more polished: soil enrichment, a more beneficial watering
  mechanic, processing stations and automation-flavored refinement.
- Rarity and lasting value: some harvests should be of higher value and quality
  than others; high-level farming must exist and be worth reaching.
- Techniques and abilities that make the farming path feel powerful (healing,
  buffs), not just productive.
- The garden must serve builds: herbs for potions and buffs, fungus and venom
  for poison craft, food for curated food buffs, so cook, brewer, and poisoner
  all root in the same earth.
- Everything integrated and cohesive; nothing bolted on. Playstyles intermix:
  the farmer trades with the fighter and both live in one economy.
- It must stay FUN: no repetitious chores, no dull loops.

## 2. Ground truth (audited against code, 2026-08-11)

- **Crops** (`content/crops.ts`): 6 crops, carrot L1/8m to moonbell L30/40m.
  `xp = growMinutes x 10` is contract-pinned (THE PLOT PAYS FOR ITS TIME).
  Plant pays xp/4, water xp/10 per stage, harvest full. Stage is a pure function
  of wall clock (offline growth free); `crops` table persists plantedAt/boostMs/
  watered bitmask/owner. `garden_plot` buildable = the only tilling, zero
  materials, farming L1. Watering: `watering_can` in pack, once per stage,
  credits 35% of remaining stage time. The watered bit is server-only — no
  visual exists. Harvest is owner-only; `plantWild` (Second Growth orchards)
  deliberately lets anyone harvest.
- **Farming skill**: no techniques (trade skills have no ladders; beastcraft is
  the one non-combat technique school precedent). Two callings: green_thumb L20
  (seedRefund 10%), bounty L60 (doubleHarvest 10%). Balance review R5 stands
  unanswered: ~75-103 xp/hour/plot, L99 effectively unreachable, "pay farming
  for the time it asks; more paid tending verbs."
- **Soil / fertilizer / quality: do not exist anywhere.** No fertilizer, no soil
  state, no produce grades. The one quality precedent in the game: `ItemRoll.q`
  (inscription quality 85..115, wire/DB-guarded, priced through sell via derived
  value) — rolled per craft, rides a stackable non-gear item (scrolls).
- **Animals**: chicken `lays` egg 180-300s (ground clutch, chunk-loaded only,
  <4 nearby cap), cow `produce` milk 180s via a 60-tick milking action. That is
  the whole roster; both train beastcraft. No feeding, no care, no shelter, no
  player-owned livestock (`beast_pen` is for tamed companions, a different
  thing). Callings: gentle_hand L20 (doubleProduce 10%), drovers_bond L60
  (produceRest x0.85).
- **Stations** (`StationType`): fire, furnace, anvil, workbench, alembic,
  tanning_rack, loom, carving_bench, enchanting_table, sawhorse. No mill, press,
  churn, keg, smoker, or apiary. `mill_flour` is a lone workbench recipe.
- **Cooking**: 14 recipes, only 3 carry buffs and all 3 are farm-fed (stew,
  cake, fishers_pot); no crop recipe above L15; ladder past 22 is all fish.
- **Herbalism**: 11 recipes ending at L40; exactly TWO herbs (sagewort,
  moonbell), both grown and wild-foraged; poison branch = weapon oils at the
  same alembic, "the dark branch is never taught, poison lore is FOUND";
  venom_gland is loot-only.
- **Buffs**: `ConsumableBuff` = {speedMult, shieldHp, gatherSpeed, regenPer4s},
  channels tonic|food, one live per channel. PlayerBuff has richer dials
  (armor, dmgMult, critPct, lifesteal) currently unreachable from any
  consumable. `mkBuff()` is the one conversion door.
- **Economy**: sell-anything-anywhere at half value, no demand, no produce
  sink. Existing farmer-to-fighter loops: tame lures, mending salve, weapon
  oils, the three buff foods. Waystation/larder NPC shelves already price
  finished goods at markup (the pricing precedent).
- **Skills**: farming, herbalism, cooking, beastcraft all exist. No new SkillId
  is needed. Focus/callings = the perk currency.

## 3. The design in one breath

The plot learns to remember how it was treated: enriched soil, visible water,
and paid tending verbs produce GRADED harvests — plain, fine, or prime — earned
deterministically by care, never rolled. The field grows from six crops to a
full roster spanning L1..90 across four families (staples, herbs, fungus, and
orchard/recurring crops), so the herbalist, poisoner, and cook each have a
garden of their own. Farm animals become the player's OWN: bought young from
drovers, kept in a paddock, fed at a trough, brushed and named, paying graded
produce on the pet-bond pattern of positive-only care. A working yard of new
stations (mill, churn, press, keg, smoker, apiary, drying rack) turns raw
produce into finished goods on wall-clock jobs that run while you wander — the
Arx answer to automation. Those goods fill the dead upper ladders of cooking
and herbalism with buff food and brews that adventurers genuinely want, sold
into a rotating town LARDER BOARD of world-state market orders that finally
pays the farmer a fighter's wage. And the green path gets its own voice: a
farming arts school of damage-0 techniques (mending, quickening, warding) plus
a callings wave, so investing in the land empowers the character who works it.

## 4. The laws

1. **CARE IS ALWAYS A GIFT.** Tending only ever adds: no rot, no withering, no
   pest damage, no starving animals, no punishment for logging off or going
   adventuring. An untended plot behaves exactly as today; a tended plot does
   better. (The pet-care law, extended to the whole farm. This is how the loop
   stays fun instead of becoming a chore treadmill.)
2. **QUALITY IS EARNED, NEVER ROLLED.** Produce grade = a pure function of care
   facts recorded on the row (soil tier, waterings, feed/bond) — deterministic,
   inspectable, zero RNG, zero player-state drop dials (flood law). Same care in,
   same grade out, every time.
3. **THE PLOT PAYS FOR ITS TIME** stays sacred: every new crop keeps
   `xp = growMinutes x 10` exactly; new tending verbs pay xp the way watering
   does (this epic IS balance review R5).
4. **ONE LEDGER FOR THE LAND'S CARE.** Soil/water/feed state lives on the
   existing `crops` row (new columns) and the new `livestock` row — never a
   parallel system, never client-guessed. Every care fact ships to the client so
   the world can SHOW it (wet soil glistens, fed animals look content).
5. **THE STATION WORKS WHILE YOU WANDER.** Processing = wall-clock jobs on the
   crop-stage pattern (pure function of elapsed time, offline progress free,
   collect when ready). Automation in Arx means "the work continues without
   you", never conveyor-belt idle-game machinery.
6. **EVERY PRODUCT FEEDS SOMEONE** (prepared-material law extended): every new
   crop, produce, and processed good must have at least one consumer — a
   recipe, a station, an order sink, or a beast that eats it. No shelf litter.
7. **THE GROWING AND THE MAKING STAY SPLIT** (skill split law): growing trains
   farming, livestock trains beastcraft, brewing trains herbalism, cooking
   trains cooking. Grades flow ACROSS the split (fine herbs make longer brews)
   so the trades need each other.
8. **GRADES QUANTIZE SO STACKS SURVIVE.** Three grades only (plain/fine/prime),
   quantized so identical grades stack and merge (canMergeDrop's sameRoll law
   holds). Never a continuous per-item quality float on stackables.
9. **DEMAND IS WORLD-STATE.** The larder board's orders derive from the world
   clock and town identity, never from who is selling (flood-law echo). First
   come, first paid.
10. **THE WILD KEEPS ITS OWN LAW.** Nothing here touches the Second Growth
    ledger, wild forage, or fishing. Orchard/recurring crops on kept land are
    crop rows, not growth rows. Content boundaries hold (no occult framing for
    the fungus/venom garden: it is herb-lore's dark branch, grown not conjured).

## 5. The phases

### Phase 1 — THE LIVING SOIL (soil, water, and the grade)

The foundation every later phase prices against.

- **Compost bin** buildable (farming L5, boards + twine): accepts produce,
  food, and burnt_food; a wall-clock job turns N inputs into compost (the
  farmer's first "machine" and the kitchen's failure sink).
- **Fertilize verb**: apply compost to a Tilled or sprout-stage plot; stored as
  `soil` tier on the crop row (0/1/2: plain, enriched, rich — rich needs the
  Ph4 apiary's help or prime compost). Pays farming xp like watering (R5).
- **Mulch verb** (plant_fibre): a second paid tending act, small boost + care
  fact.
- **Watering grows up**: the watered bit ships to the client — wet soil darkens
  and glistens, plots visibly thirsty vs slaked (today a watered plot is
  indistinguishable). **Well** buildable (construction, stone): refills nothing
  (cans stay infinite — no chore), but standing near a well makes hand-watering
  sweep a 3x3 of plots in one act. **Irrigation channel** buildable: plots
  adjacent to a channel fed by a well count as watered each stage automatically;
  auto-water pays NO xp (automation trades xp for convenience, the player
  chooses).
- **The grade**: at harvest, care facts fold into a grade — plain / fine /
  prime — quantized onto the yielded stack (ItemRoll.q precedent, quantized per
  law 8). Grade multiplies sell value (~x1 / x1.35 / x1.8) and later phases
  read it (kitchen, alembic, larder board). Ripe prime crops wear a subtle
  extra twinkle (the beacon law: the payload is the protagonist).
- Client/art: wet-soil + enriched-soil tints in the Tilled dialect, compost bin
  and well and channel in the station-art bar, grade pips on item cards.
- Schema: crops table gains soil/mulched columns (migration); C2S fertilize/
  mulch join parseC2S (THE WHITELIST LESSON); grade rides the existing roll
  lane on yielded stacks.

### Phase 2 — THE FULL FIELD (the crop roster, L1..90)

From six crops to roughly twenty, in four families, every one with a consumer
(law 6) and contract-true xp (law 3).

- **Staples** (the cook's garden): potato L3, onion L8, cabbage L14, pumpkin
  L25 (the showpiece: big multi-tile-feel art, heavy yield), barley L35 (the
  keg's grain), redroot L48, kingsquash L65.
- **Herbs** (the brewer's garden, filling herbalism 40..99's inputs): bittercress
  L40, silverleaf L55, duskthorn L70, dawnveil L85. Herb seeds stay never-sold
  (foraging finds, drops, and the orchard-keeper trainer), keeping the
  forager-farmer kinship law.
- **The dark bed** (the poisoner's garden): adderstongue L45 and palegill fungus
  L60 yield venom_sac / spore_dust — herbalism's found-not-taught oils finally
  get a grown supply line beside loot glands. Fungus grows on the **mushroom
  log** buildable (shade culture: no watering, slower, its own art dialect).
- **Orchard and recurring crops**: CropDef grows a `recurring` shape (plant
  once, fruit ripens again on a cooldown, prune verb pays xp): appletree L10,
  bramblevine L20 (grown berries), plumtree L30, mirefig L55. Kept-land crop
  rows, not growth-ledger rows (law 10).
- **Glasshouse** buildable (construction 30 + farming 40, glass = new smithing
  sand recipe): a roofed 2x3 growing frame; plots under glass grow ~15% faster
  and are always watered — the endgame farmer's pride build and the natural
  home of the L65+ exotics.
- Seed economy: staple seeds join the shop bands; everything above L40 is
  found, traded, or seed-returned only.

### Phase 3 — THE ANIMALS OF THE YARD (owned livestock)

The first player-owned farm animals, deliberately NOT pets: no combat, no
following, no taming cast. A parallel lane beside the TAMES whitelist, which
stays companion-only and untouched.

- **Paddock** buildable (beastcraft L5, fence-family): stakes a small ground
  claim; a paddock and a filled trough are what make animals YOURS. **Coop**
  and **byre** furnishings dress it (shelter = care fact, not survival need).
- **The drover sells young**: buy a chick/calf/lamb/kid/piglet from drover NPCs
  (Maren's yard grows a livestock ledger; a drover joins Hartfell's Kettle and
  Dawnmead). New `livestock` table: species, name (player-named, pet-naming
  card reused), owner, paddock anchor, fed_at, bond, grade facts. Animals graze
  inside their fence on calm wander, persist offline, cannot be attacked
  (actor-law protection) and never die (law 1).
- **Roster**: chicken (eggs, now to YOUR coop nest box, no more ground-clutch
  scavenging at home), cow (milk), **sheep L10** (shear verb, wool → tailoring
  gains a farm-grown fibre beside cotton), **goat L20** (rich milk, the cheese
  line's star), **pig L35** (truffle-snuffle: walk your pig, it noses up
  truffles on kept ground — the one animal verb that leaves the farm).
- **Feed and bond**: trough buildable + feed (barley/hay/vegetable scraps);
  a fed animal's produce cooldown shortens and its produce grade rises; a
  brush care moment (pet-bond pattern: cooldown-gated, positive-only, small
  beastcraft xp) raises bond, the second grade fact. Unfed animals simply
  produce plain at today's pace — never suffer.
- All livestock verbs train beastcraft (skill split law) and finally give the
  skill a homestead spine beside taming.

### Phase 4 — THE WORKING YARD (processing and the quiet automation)

Raw becomes fine on the crop-stage pattern: load a station, the job walks a
pure wall-clock function, collect when ready (law 5). One `station_jobs` table,
one job per station tile, visible in-world (the mill turns, the smoker smokes).

- **Windmill** (the marquee build, tall multi-tile art): wheat/barley → flour/
  meal in batches (mill_flour migrates here; the workbench recipe retires via
  the legacy-scroll pattern, never deleted).
- **Churn**: milk → butter; goat milk → soft cheese; aged jobs → hard cheese.
- **Press**: sunflower → cooking oil, apples → cider must, grapes deferred.
- **Keg**: barley + honey lines → farmhouse ale, honeybrew, vinegar (long jobs,
  the classic "set it before the dungeon, tap it after").
- **Smoker**: meats/fish + wood chips → smoked goods (smoked_trout's family
  grows; the fire keeps quick cooking, the smoker owns preservation flavor).
- **Apiary**: slow honey + wax on a pure clock; flowers/flower_box density
  nearby nudges output grade (world-state, never player-state); wax feeds
  candles (decor) and coating bases (herbalism).
- **Drying rack**: herbs → dried concentrates (2:1) that high herbalism recipes
  call for — the herb sink that makes big gardens worth planting.
- Input grades carry through: fine milk makes fine butter (grade math is one
  shared fold, written once).

### Phase 5 — THE LADEN TABLE (recipes, buffs, and the market)

The demand side: everything the farm makes, somebody wants.

- **Cooking wave (L15..90)**: the crop kitchen returns above L15 — ploughman's
  board, pumpkin pie, onion soup, honeyed carrots, truffle roast, harvest
  feast. Buff vocabulary grows through `mkBuff` with a deliberate hand: food
  gains small `armor`, `maxHp`, and (top-end feasts only) modest `dmgMult`/
  `critPct` dials so the farmer feeds the raid; tonics keep speed/gather/regen
  identity. One food + one tonic law unchanged.
- **Herbalism 41..99**: greater tinctures, ironhide draught, hunters-eye brew,
  the grown-venom oils (adderstongue/palegill lines), and prime-herb master
  brews. Herb grade scales potion MAGNITUDE, never duration (the enchanting
  law's spirit: quality scales magnitude, never timing).
- **THE LARDER BOARD**: each town's larder posts rotating market orders on the
  world clock ("Saltmere wants 20 smoked eel", "Hartfell wants 12 prime milk") 
  at a real premium over half-value. Orders are world-state, town-flavored
  (Hartfell wants warmth, Saltmere wants the sea), first-come, and the ONLY
  place premium pricing lives — the universal half-value law stays untouched
  everywhere else. This is the stay-home player's bounty board.
- Raw produce base values get one honest rebalance pass through the xp/value
  contract tests (in the open, never excusing one entry).

### Phase 6 — THE GREEN ARTS AND THE DRESSED FARM (power, polish, proving)

- **Farming becomes the second non-combat technique school** (beastcraft
  precedent, TechniqueStyleId grows 'farming'): a short ladder of damage-0
  arts, rungs 5..50 — a quickening touch (nudge a stage, long cooldown), a
  gardener's mend (out-of-combat self-heal channel: the healing the mandate
  asked for), an earthen brace (brief shield, the land holds you up), a
  harvest stride, a beckoning of birds (cosmetic flourish). All damage 0
  forever; farming never joins combat schools.
- **Callings wave**: new L20/L60 perk pairs reading the new dials (composter,
  vintner's patience, shepherd's eye, prime-hand).
- **The dressed farm**: scarecrow, hay bale, silo, dovecote, market cart,
  milk-churn stand, harvest wreath, flower beds — the decor lane a farm-builder
  actually wants, riding the exterior-decor rails.
- **CMS**: Crops and Livestock join the Resources-bench pattern; the Land's
  Clock gains the farm dials.
- **prove:farm** live-receipt suite (isolated rig) + the closing balance
  ledger written into this doc.

## 6. Economy and feel notes

- Parity target: a focused farm hour (tend + process + fill an order) should
  land in the same earnings band as a focused combat hour, with LESS xp/hour
  than dedicated grinding (farming is calm, diversified income; combat stays
  the fastest single-skill road). The xpEconomy contract tests grow farm bands
  so this is pinned, not vibes.
- The farmer-to-fighter trade loops after this epic: lures (tames), salves and
  tinctures, weapon oils, buff feasts, ale, and enchanting reagents (sunflower
  radiant essence already exists) — every adventurer build touches farmer goods
  weekly.
- Repetition audit (the fun law): no verb in this epic is required daily; every
  loop is opt-in additive; automation (irrigation, stations, apiary) exists
  precisely so scale never means clicking more, and hand-care always pays more
  xp than automation so the choice stays interesting.

## 7. Open questions (decided at green-light, defaults proposed)

1. **Grade count**: three (plain/fine/prime) is the default; five felt like
   stack sprawl. Confirm.
2. **Livestock ownership**: owned-paddock animals (default) vs world animals
   with care facts. Owned is the Stardew heart of it and the default.
3. **Glasshouse**: in (default) or deferred to a later wave?
4. **Ale/cider naming**: farmhouse ale / honeybrew / cider assumed fine
   (RuneScape precedent); confirm no content-boundary concern.
5. **Farming technique school**: full school (default) vs folding the arts
   into callings only.
6. **Pig truffle walk**: kept-ground only (default) so it never touches the
   wild growth ledger.

## 8. The epic ledger (filled as phases ship)

### Phase 4 — THE WORKING YARD (shipped 2026-08-11, prove:farm = 35 receipts)

As-built laws and dials:

- **ONE JOB PER STATION TILE** (db v28 station_jobs): a work batch is
  loaded whole (inputs leave at the door), walks a PURE wall clock
  (`workDone` — no tick owns a batch, restart-safe by the crop law),
  and collects INCREMENTALLY: you tap the keg for what matured and
  the rest keeps working. Owner-only collect; a station mid-batch
  refuses demolition; batch cap 10.
- **THE BATCH IS AS GOOD AS ITS WEAKEST MEASURE**: the loader counts
  by FAMILY (any grade satisfies its base), consumes highest grades
  first, and the job records the minimum consumed grade — decided at
  load, worn by every output at collect. Smoked goods deliberately
  stay plain (meat and fish never grade; the fold is honest about
  zero). PROCESSED_GRADED lives in farming.ts (the one graded list).
- **THE JOB PAYS IN TIME AND VALUE, NEVER A FASTER LADDER**: xp per
  measure is contract-capped at minutes x 12 and paid AT COLLECT —
  active crafting always wins the xp race; the yard wins the errand.
- **The seven stations**: windmill (construction 28, the marquee —
  turning cloth sails while a batch runs; the workbench hand-quern
  STAYS forever so bread never gates on construction, and the mill's
  argument is DOUBLE flour), churn 12 (butter → soft cheese → aged
  hard cheese), press 18 (oil, cider), keg 24 (ale, honeybrew,
  vinegar, pickles — the set-it-before-the-dungeon station), smoker
  15 (cured meats), drying rack (herbalism 15 — concentrates 2:1,
  the big-garden herb sink), apiary (farming 30).
- **THE HIVE KEEPS ITS OWN CLOCK** (farm_apiaries): no recipe, no
  inputs — honey + beeswax per 25 min (store cap 3), graded by the
  REAL FLOWERS within 5 at collect (flower boxes and blooming crops:
  sunflower, moonbell, dawnveil — world-state, never player-state;
  plant a garden and the honey remembers it). First touch settles
  the bees and starts the clock.
- **The table it lands on**: buttered potatoes 16, panfried trout
  24, ploughman's board 38 (buff food), truffle roast's kin; the
  rack's concentrates open traveler's draught 48, moonlit salve 58
  (beeswax consumer), ironroot draught 62. Every station output
  eats, buffs, or feeds another recipe (pinned).
- **THE GOAT STAYS DEFERRED** (second deliberate pass): the churn
  opened on cow milk honestly (butter and both cheeses are real cow
  work); the goat's bespoke body remains a rig-lab commission, not a
  phase rider.
- **Wire**: S2CFarm grew jobs + apiaries (additive); C2SWorkStart in
  parseC2S with pins. Prompt verbs: Mill/Churn/Press/Tap/Smoke/Dry,
  'Collect' the moment measures wait. prove:work chapter (~110s);
  the full book = 35 receipts ~3:45.
- **Deferred**: job cancel/refund (demolish-refusal is the guard;
  collect-through is the road); barley meal line; goat + goat
  cheese; smoker wood-chip flavoring; keg vintages.

### Phase 3 — THE ANIMALS OF THE YARD (shipped 2026-08-11, prove:farm = 30 receipts)

As-built laws and dials:

- **THE YARD IS NOT THE HEEL.** Livestock = a parallel lane beside the
  TAMES whitelist (untouched): `LivestockComp {row}` on its own store,
  the ROW the truth (db v27 `livestock`, slot-addressed per character,
  anchored to a TROUGH TILE, next_produce_at persisted so a logout
  never resets an udder). Entities spawn at boot and on release, live
  whether the keeper is online or not, scatter on the trough's south
  apron dealt by slot. Roster rides EXISTING bodies only (the rig-lab
  law): chicken 1 / cow 1 / **ram 10** (wool — the fleece-loaf body
  shears honestly) / **boar 35** (truffle — the yard boar, as every
  medieval sty kept). **The goat defers to Phase 4's churn**, where a
  bespoke body can be done right (ledger deviation).
- **THE YARD REGISTRY IS THE ONLY PAYER** (content/livestock.ts):
  produce verbs read LIVESTOCK, never NpcDef.produce — a wild boar
  offers no Snuffle, a town cow keeps its old milking law. Collection
  rides the PROVEN MILK RAIL whole (one action, one rhythm); the
  registry only swaps the produce source and adds the yard's arm.
- **THE DROVER'S PEACE**, three doors: perception skip (a kept boar
  grazes where a wild one charges), npcAggro refusal beside the pet
  guard, damageNpc quiet backstop. `meta.stock` (additive) is the
  durable marker — the drover's tan halter renders off it, and
  ownerEid rides only while the keeper is online (aiming their own
  prompts). Kept hens never ground-lay (`nextLayAt = 0` at spawn).
- **THE YARD'S CARE FOLD** = the field's own fold at the byre:
  fed (one manger measure spent per collect) = 2 points, bond tier
  (3 warms / 7 shines) beside it — fed reaches fine, fed-and-loved
  reaches prime. Fed also runs the NEXT wait at 0.75. The brush
  moment: 240s cadence, +1 bond (cap 10), +4 beastcraft, positive
  only. Unfed animals produce plain at the wild pace and suffer
  nothing (CARE IS ALWAYS A GIFT).
- **The trough** (feed_trough, beastcraft 1): anchor + manger. Feed
  door: barley 2 (+grade), produce 1 (+grade), all else refused;
  cap 12; anyone may feed (the watering generosity), each collect
  eats one measure. Trough refuses demolition while a herd anchors
  or feed remains. Mirror rides S2CFarm.troughs (additive).
- **The buy and the farewell**: crated young at Maren's drover_yard
  (shop on the EXISTING actor: chick 60 / calf 350 / lamb 280 /
  boarlet 700), released via useItem at your OWN trough (caps: 4 per
  trough, 8 per keeper; every refusal spoken, crate kept); the
  naming ceremony reuses the pet card whole (C2SStockName under the
  same sanitize law). **THE LEAD WAITS ITS TURN** (harness-caught
  design fix): the drover's lead fires only when produce and brush
  both sleep — a farewell must never outrank the living work; half
  the crate's worth returns.
- **Consumers (law 6)**: wool → weave_wool_cloth (tailoring 10, the
  ram is a standing cotton field); truffle → cook_truffle_roast 55;
  egg/milk already fed the kitchen. Graded egg/milk/wool/truffle
  generate beside the crops (LIVESTOCK_GRADED pinned against the
  registry by test).
- **THE PROVING GROUND lever** (`/clearfarm <r>`, dev-only): levels a
  radius to bare grass — crops, bins, troughs, built rows cleared.
  Minted after 10-minute suite timeouts: the terrain lottery was the
  whole cost. With it + chapter flags (`prove:yard` 48s,
  `prove:field`, full book ~3min) + `stockAct` retry-sidles for
  wandering bodies, the 30-receipt book runs deterministically.
  HARNESS LAWS: a persistent rig keeps every previous run's yard
  alive — finders must demand `ownerEid === own eid` (yesterday's
  Henrietta answered a receipt once); slate law reached the yard
  (livestock: new Map() in enforce/procDoors/xpEconomy slates).
- **Deferred**: goat + cheese line (Ph4); coop/byre dressing
  furnishings (Ph6 decor wave); pig walk-to-truffle roaming (the
  snuffle pays in the yard — a wandering-pig brain is pets
  territory); livestock re-anchor to another trough (lead away and
  re-release is the road).

### Phase 2 — THE FULL FIELD (shipped 2026-08-11, prove:farm = 20 receipts)

As-built laws and dials:

- **The roster**: 6 crops became 23. Staples potato 3 / onion 8 /
  cabbage 14 / pumpkin 25 / barley 35 / redroot 48 / kingsquash 65;
  high herbs bittercress 40 / silverleaf 55 / duskthorn 70 / dawnveil
  85; dark bed adderstongue 45 (venom_sac) + palegill 60 (spore_dust,
  log bed); orchard appletree 10 / bramblevine 20 (yields the wild
  `berries` id — one berry, one economy) / plumtree 30 / mirefig 55.
  Every xp = growMinutes x 10 (the contract held without exception).
- **THE ORCHARD SHAPE** (`CropDef.recurring {cooldownMinutes}`): the
  plant STANDS after harvest — re-aim is stateless math (plantedAt =
  now, boostMs = growMs - cooldownMs), so the pure-projection law
  survives. First pick pays def.xp, later picks pay cooldown x 10
  (`harvestXp`); cooldown <= 0.75 x grow is contract-pinned (the
  re-aim must land in the mid stage). Water/prune bits reset each
  cycle; soil and mulch feed the STANDING plant and persist. Picks
  roll seedReturn as cuttings (0..1 — the pruned wood strikes).
  Orchard tiles are SOLID (the walkable-crops test learned the
  may-stand exception); the owner may demolish-uproot a standing
  recurring crop (tree gone, plot kept, spoken); annuals stay
  harvest-only.
- **THE PRUNE** (C2SPrune, `PRUNED_BIT` = bit 2 of the watered mask):
  recurring crops only, once per cycle, costs nothing, pays the
  cycle's tending tenth, +1 care point — the orchard's road to prime
  (one waterable stage means water alone can't carry it).
- **THE BED LAW** (`CropDef.bed`): 'log' crops plant ONLY on a
  mushroom_log buildable (whole timber, joined the WHOLE_TIMBER
  allowlist); no water, no soil, no mulch, no grade — all refused
  aloud; sprout tile = MushroomLogSeeded. GRADED_PRODUCE excludes
  log yields (no care facts, no finery).
- **THE GROWING FRAME** (deviation: the plan's walk-in glasshouse
  became a single-plot oiled-cloth frame — no glass supply chain
  exists and inventing one mid-phase was refused; ledger judgment):
  buildable ON a garden plot only (`ground: [Tile.Tilled]`), farming
  50, board 4 + cloth 2. A framed row runs its wall clock x1.15
  (`cropElapsed`, the one clock helper — every elapsed site now
  routes through it) and auto-waters each stage beside the channel
  check (no xp). Trees refuse the frame ('open sky'). `framed` rides
  the crop row (db v26 + FarmPlotInfo.f additive) and the client
  draws hoops + cloth live over the cached plant sprite.
- **The consumers (law 6 held)**: 8 cooking recipes (baked potato 3
  → kingsquash bake 65 — the crop kitchen's dead road above L15 is
  open); herbalism's bridge past 40: greater tincture 42, silverleaf
  salve 55 (trainer) + render_venom_sacs 45 (1 sac → 2 glands, the
  grown line into EVERY venom oil), palegill_oil 60 (venom p4/130t/
  600s — the potency ladder demanded a strict climb past wyrmtongue),
  duskthorn draught 70, dawnveil elixir 85 (dark = drop, found never
  taught). All buff dials are EXISTING vocabulary — the new dials
  wait for THE LADEN TABLE as planned.
- **The seed economy**: staples + apple/bramble/plum joined the
  general store bands; **Jorel Furrowfield keeps the seed stall**
  (shop `seed_stall` on the existing actor — no new placement) with
  the far roots, high herbs, dark bed, and mirefig at steep prices;
  sagewort/moonbell stay off every counter (the kinship law). NOTE
  the deviation: the plan said high-herb seeds "never sold" — the
  stall sells them because no foraging lane exists for the new herbs
  yet; Ph5/6 may add found sources and re-price.
- **Tiles 243..279** (crossed 255 — tiles are Uint16 everywhere, but
  the crop-art model cache packed tiles into 8 bits and was widened;
  the renderer's hardcoded 41..53 crop range became content-driven
  `isCropTile`). Art: 8 new painter families in the crop dialect
  (root rows, cabbage head, gourd vines, bearded barley, herb beds
  with per-herb accents incl. dawnveil's glow, orchard trees with
  hung fruit, bramble arches, the shelf-capped log); plant panel
  filters seeds by BED; icons for ~45 new items via family glyphs +
  5 new payload glyphs.
- **Proving**: prove:farm = 20 receipts (Ph1's 13 + orchard pick /
  prune once-only / second season / dark-bed refusals / log reagents
  / frame auto-water). HARNESS LAWS minted: **the ground lottery is
  per-tile — every stage gets candidate spots and a tight tp beside
  the spot** (`stagePlanting`), a trench is never dug under the
  builder's own boots, and **a stale rig on the port answers with
  yesterday's content** — `kill %1` in a fresh shell kills nothing;
  lsof the port before believing a "listening" line.
- **Deferred**: buff-food wave and herbalism's full 41-99 ladder
  (Ph5); mushroom-log art on the editor palette is the world painter
  (no bespoke ghost); orchard fruit has no per-species tree bark
  dialect yet (one cultivated-tree voice, three crowns).

### Phase 1 — THE LIVING SOIL (shipped 2026-08-11, prove:farm = 13 receipts)

As-built laws and dials:

- **THE GRADE RIDES THE ID, NEVER THE ROLL.** Graded produce = generated
  item defs (`<base>_fine` / `<base>_prime`, the scroll pattern), because
  `addItem` deliberately drops rolls when merging stackables — a grade on
  `ItemRoll` was structurally unsafe. `GRADED_PRODUCE` derives from crop
  yields; value x1.35/x1.8 rounded, heals ceil-scaled, generated in
  items.ts beside the scrolls. `gradeOf` refuses foreign `_fine` suffixes.
- **THE CARE FOLD** (content/farming.ts, shared by server truth and the
  client's ripe-sparkle prediction): score = waterings(0..2) + soil(0..2)
  + mulch(0..1); fine >= 2, prime >= 4, several roads to each.
- **Fertilize needs a PLANTED crop** (deviation from §5's "Tilled or
  sprout" phrasing: the one-ledger law won — bare Tilled has no row, and
  a second soil store was refused). Plain compost lifts plain ground to
  enriched; prime compost makes any unripe ground rich. Mulch =
  2 plant_fibre, once per planting. Each pays ceil(def.xp/10), the
  watering rate — a fully attended cycle now pays up to 1.65 x def.xp
  (balance review R5 answered).
- **THE COMPOST BATCH**: worth 8 closes the lid, 30 wall-clock minutes,
  prime output at graded-worth >= 4. Worth: produce 1+grade, seeds /
  raw_* larder goods / burnt_food / berries / plant_fibre 1; bottles
  (the `_tincture|_tonic|_brew|_salve|_oil` naming contract IS the
  door), gear, buffs, coatings, quest goods, and stolen slots refused.
  Collect = interact, owner-only via the built tile's owner, +15
  farming; a bin holding anything refuses demolition. `/grow` also
  hurries working bins (dev worlds cannot wait on a heap).
- **THE WELL'S REACH**: well within 6 (chebyshev) of the aimed plot
  turns one hand-watering into the 3x3 bed sweep; every swept plot pays
  its own xp — the well saves time, never changes the lesson's worth.
- **THE FED CHANNEL**: channel live when a well stands within 6;
  waters adjacent (chebyshev 1) crops at each stage on the crop beat,
  full 35% credit, NO xp (the automation law). The watered-bit gate
  runs before the channel scan so slaked stages never pay for it.
- **Wire**: S2CFarm care mirror (plots {w,soil,m} + bins
  {fill,graded,readyAt} + remove), whole-at-login for nonzero rows,
  deltas on change — additive, protocol version unmoved (the C2SStable
  judgment). C2S fertilize / mulch / compostadd (slot-addressed) all
  in parseC2S with hostile-shape pins in messages.test.ts.
- **Tiles 240..242** (CompostBin solid, Well solid, IrrigationChannel
  walkable) — clear of the dye bands; tiles are Uint16 everywhere.
  DB v25: crops +soil +mulched, farm_bins (owner lives on built_tiles).
- **Client**: game/farmCare.ts = the mirror store (module-level, the
  GrassSystem precedent) + wellTiles set (chunks remap stations to
  floors, so wells register at stream time); wet/enriched/mulch soil
  painting in the Tilled detail pass; channel trench with fed-water /
  dry-cracked states; live-painted bin (heap fills, lid + steam while
  working, gold turn-out twinkle) and well (top-plane ring, windlass,
  bucket); predicted-grade sparkle over ripe crops (gold prime, quiet
  silver fine); THE TENDING HAND verb cascade (Water > Fertilize >
  Mulch > Tend) on the one prompt; compost deposit panel on the vault
  discipline; graded icons = base glyph + star badge, generated.
- **Proving**: `npm run prove:farm -w @arx/tools` against the isolated
  rig — 13 receipts (mirror truth, spoken refusals, the fold paying
  fine, batch lifecycle, sweep, self-watering channel). Harness
  lessons: build/tend reach is 2.2 and /tp lands loose — stage builds
  beside the FEET and probe with a scrap; the proving yard is real
  ground, so the trench digs around the bin like a player would.
- **Deferred, deliberately**: prime compost's live receipt (the fold
  is unit-pinned; the batch in the receipt run closed on plain
  scraps); rich soil reachable ONLY via prime compost until Ph4's
  apiary nudge; no client visual for another farmer's bin readiness
  beyond the shared mirror.

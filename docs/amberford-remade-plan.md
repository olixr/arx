# THE FORD COMES HOME — Amberford, rebuilt on its river

**Status: APPROVED DIRECTION (user decree 2026-08-15). This document is the
implementation spec and, at ship, the as-built record.** Supersedes the
1d2fc1a town plan and the c063ab9 people-pass staging for the GROUND only;
the cast, the quest web, and the lore spine are kept and grown, not replaced.

The user's brief, condensed: Amberford is the second hearth — the town where
a waker spends their first real days: first bank, first stable, smithing,
tailoring, leatherworking, the professions in earnest. It has been around a
long while and it shows: buildings woven too tight, details hidden behind
walls, decor from before the decor existed, a layout that reads plopped, not
grown. Rework it: much bigger and more open, organic and natural, walking
room everywhere, every modern decor family incorporated, the town alive with
schedules and story, laid out with semantic intent at both the cluster scale
and the whole-town scale. A place worth coming back to for days.

The survey's verdict, which shapes everything below:

- **The ground is dated.** Pre-exterior-decor construction (one awning in
  the whole town), no stable (the only major town without one), the orchard
  is plain oaks (real `AppleTree`/`PlumTree` tiles exist now), the hedge and
  topiary family (342-348) is unspent in the entire WORLD, `Tile.Well` has
  never been placed anywhere, the farming-v2 yard kit is absent, the wall
  ring hugs the buildings it should give air to. Full rebuild.
- **The words are load-bearing.** The cast anchors a 14-quest web (the
  Redmask arc, Hask's Fang-and-Fur chain, the stolen ledger, the two-roads
  fork), the world's only leatherworking teacher, the fordgate faction, and
  a cross-zone flag web (merra_edwin → ansel_registry; dlg:dunna_rest →
  osa_yard in Silverfall). The cast is KEPT and grown by three; every tree
  is audited and re-grounded against the new town, weak lines rewritten,
  nothing strong vandalized.
- **The river is real now.** Since the Great World Regen (24601), the great
  river runs ~30 tiles south of the walls and the Salt Road crosses it at a
  true ford. The town named Amberford does not own its ford. The rebuild's
  crown move: grow the zone south to the water, and give the town the river
  quarter its name has always promised.

---

## 1. What stays (the load-bearing bones)

- **Zone id `amberford`**, display name **Amberford**, gazetteer epithet
  "The crossroads market town", country word 2. The name is the point.
- **The cast, whole**: all 15 named + `amberford_watch` + `round_trader`.
  Identities, shops, trainer lanes (with ONE deliberate hand-off, §4),
  faction roster, examine lines, and every quest they give or take.
- **The quest web, whole**: the_first_road turn-in (Aldis), word_on_the_road
  → the_reavers_mark → names_in_the_registry, a_smiths_errand, the wolf
  chain (pelts/worgsong/matriarch), the_long_way_round, the_bad_column,
  the_herd_stands / the_lean_winter fork, the_stolen_ledger, the_queens_ford.
  Nothing re-gated; the new slate slots BESIDE it.
- **The flag web**: merra_edwin, ansel_registry, aldis_heeded/shrugged,
  dlg:dunna_rest → osa_yard, tamsin_egg, perl_sweet. Untouched semantics.
- **Danger anchor** `{x:520, y:-4, country:2}` — coords and word kept;
  safeR 72 → **80** so the new ford quarter sits inside the calm.
- **The Ford Door** (Red Company, Lowhall alcove): survives, RELOCATED to
  the new slack water (§3); lowhall.ts DOOR_UP re-pointed in the same
  commit. The fiction improves: reeds nobody visits, downstream of the
  tannery smell.
- **The lore spine**: the Toll War, the sealed mountain, Osa/Dunna,
  Bretta/Balla, Edwin's page. Extended by Rowan's arrival (below), never
  contradicted.

## 2. The fiction — THE TOWN THE ROADS BUILT, FINALLY ON ITS RIVER

Amberford has always told one story: the ford called the road, the road
called the Redmasks, and after the Toll War the town answered with stone —
the wall, the bank, the gate. The rebuild finishes the sentence: **the town
walks back down to the water it was named for.** The masons who raised the
curtain have opened a water gate; the mill has moved off its pond onto the
true current; the ferry landing, the fish market, and the tannery stand on
the north bank; and the Salt Road crosses the great river inside the town's
own lamplight — a stone-decked bridge beside the old shallows, kept the way
a family keeps its first tool. Upstream of the bridge, the water is work.
Downstream, it is memory.

And one more homecoming: **Rowan of Dawnmead** — the elder who kept the
Waking Ring for forty years — reached the end of his own advice two winters
back and now keeps the gate registry at the North Gate beside his old friend
Captain Aldis. Every waker Wren sends up the First Road walks into the town
where their first teacher's teacher writes their name in the book.

## 3. The ground — zone envelope and world wiring

- **Rect: 144×144 at origin (448, -56)** — world x [448,592), y [-56,88).
  2.3× the old area; between Dawnmead (128×96) and Silverfall (176×128) in
  span, the largest canvas outside the capital. Flat zone (no elev). Local =
  world − (448, −56).
- **The river inside**: the worldgen channel (bed-floored level-set river)
  crosses the new south quarter, world y ≈ 58-78. The zone AUTHORS the Amber
  Water across its full width, matched to the worldgen crossings at both
  hems (west entry rows, southeast exit arm) so the edge-harmony law carries
  the water onward as real channel outside. Sandbar ford + stone bridge at
  the Salt Road crossing (world x ≈ 534-538). Authored at build time against
  a hem-line scan of WORLD_SEED (the riverscan tool, §9).
- **geography.ts**: `AMBERFORD_RECT` → `{ x: 448, y: -56, w: 144, h: 144 }`.
  Route re-threads (desk-profile against WORLD_SEED before landing; span-law
  bridge decks + geographyWarnings must stay ZERO):
  - `first_road` terminal: (464,8) → **(448,8)** (west hem, the Fordgate).
  - `high_road` pts[0]: (518,-43) → **(518,-56)** (north hem, North Gate).
  - `timber_road` pts[0]: (576,16) → **(592,16)** (east hem, East Gate).
  - `salt_road` head: (516,34),(520,44),(528,56),(534,72) → starts
    **(536,88)** (south hem, the far-bank gate; the crossing itself is now
    authored ground inside the zone).
- **danger.ts**: safeR 72 → 80 (comment updated; word unchanged).
- **audio/zones.ts**: Amberford (520,-4) full 30/fade 48 → **center (520,16),
  full 56 / fade 80** (covers the grown rect the way Dawnmead's 44/64 covers
  128×96).
- **npcs.ts TOWN_SPAWNS**: sweep any den the grown rect or its calm swallows
  (audit at build; push off-rect per the corridor law).
- **The Ford Door**: portal moves from world (557,10) to the reeds on the
  river's slack southeast bank, world **(578,70)** = local (130,126);
  lowhall.ts `DOOR_UP.amberford` → (578.5, 70.5). Same hatch dressing: no
  lamp, no sign, no name.
- **locks.ts**: the bank vault lock re-pointed to the new vault room tiles.
- **Test re-pins**: content.test amberford anchors + BFS (gates, doorways,
  bank floor, stall approaches, ford quarter, both bridge ends), geography
  .test rect + route heads, worldgen.test overlay probes, audio zones.test
  crossfade walk, pois.test zoneRects, factions anchor untouched, db suites
  fixture ids, quests/dialogues law tests.

## 4. The cast — 15 kept, 3 born

Kept (identities, shops, quests, flags — words re-grounded, see §7):
Bretta, Tilo, Elowen, Cormund, Dunna, Garton, Peld, Merra, Hask, Aldis,
Jorel, Tamsin, Ansel, Perl, Nib, the watch ×10, the traders ×2.

**One deliberate hand-off**: Tilo currently teaches leatherworking,
tailoring, AND woodworking — three schools in one throat. The user names
tailoring and leatherworking as distinct Amberford professions, so the
tannery gets its own master and `trainer_artisan` drops leatherworking:

| slug | name | post | teaches | card sketch |
|---|---|---|---|---|
| `registrar_rowan` | Rowan, Keeper of the Gate Book | North Gate registry desk | (arrival, the town itself) | Kept Dawnmead's Ring forty years; walked east when the road "finally asked him personally." Wants every name in his book to come back through the gate at least once. Writes to Wren weekly; reads the road like she reads wakings. Cadence: warm, unhurried, the same measured plainness as Wren — the voice a Dawnmead graduate already trusts, grown older on a bigger road. Knows YOU if you carry Wren's mark (`dawn_road_taken`). |
| `hostler_bray` | Bray | the stable yard, North Gate | beasts of the road, the first saddle | Caravan drover for twenty years; got off his horse at Amberford one spring and the horse declined to leave, so neither did he. Wants every beast fed before every rider. Talks to animals mid-sentence, argues with them, loses. Cadence: easy, unhurried, saddle-leather practical; prices in oats first, coin second. Keeps shop `bray_stable`. |
| `tanner_swale` | Swale | the tannery, north bank | leatherworking | Hask's old quartermaster on the Last Lamp run; took the wet end of the trade when her knees took the rest. Wants leather that outlives its buyer. Blunt about smells, hers included; downstream is a courtesy she extends and expects. Cadence: dry, brisk, workshop-exact; measures everything in seasons cured. Keeps `trainer_tanner` (the leatherworking folios) — the hand-off Tilo calls "giving the hides back to somebody who likes them." |

Shops: new `bray_stable` (bay_courser, drovers_lead, feed) and
`trainer_tanner` (leatherworking trainerStock + leather sundries);
`trainer_artisan` re-scoped to tailoring + woodworking; TRAINER_DIRECTORY
updated (leatherworking → Swale, Amberford). VOICE.md §Amberford gains the
three cards; Tilo's and Hask's cards note the new neighbors.

Routines: every placement re-authored against new posts, keeping the loved
beats — Bretta's dawn walk to the Delf, Aldis's dusk stand at the memorial,
Ansel feeding the braziers, Garton watching the water (a real river now),
Nib's full-town loop, the watch hot-bunk rota (wardroom + tower). New beats:
Bray's dawn feed round, Swale's frame-turning, Rowan's evening walk to the
memorial (he reads the pillar names Ansel reads to the braziers), the
traders' market mornings.

## 5. The map — a walled heart with living country around it

The old town walled EVERYTHING — fields, orchard, mine, pasture — into one
tight bailey. The rebuild walls the TOWN and lets the country breathe around
it, which is what a market town is: a stone heart in working land.

Laws in force: streets first; every building fronts a street, the Round, or
the green; ≥3 open tiles between structures; interiors sized for contents
plus walking room; every shopfront wears the modern kit (awning in its own
dye, bracket sign, pennants or wall banners); diagonal budget = the watch
tower octagon, the chapel apse, the bank's plaza shoulders, Aldis's house
(unchanged roster); hedges/topiary debut on the chapel garden, the Commons
green, and the bank plaza; `Tile.Well` debuts at the Round; the farming-v2
kit dresses every growing thing; occlusion law (nothing tall 1-2 rows south
of doors/stations/signs); sealed-pocket law audited by BFS test.

Local sketch (144×144; W = wall ring x16/x124, y8/y104):

```
     x0      x16        x48        x72        x96       x124       x143
y0    High Road ─┐ DELF trail            ║gate║          ┌ AMBER DELF
y8   ┌───────════╪═ NORTH WALL ══════════╬════╬══════════╪═══┐ (cutting,
y10  │ FURROW-  ║ SMITHY      TILO'S    TOWER+ STABLE   ║   │ copper/tin/
y26  │ FIELD    ║ +yard       HALL      REGISTRY YARD   ║   │ iron, x126+)
y30  │ (west    ║   craft lane y26-28            ELOWEN ║   ├ HOLLOWAY
y34  │ fields,  ║ BANK+plaza                     +garden║   │ PASTURE
y44  │ Free     ║ memorial   THE ROUND    INN+yard      ║   │ (x126+,
y60  │ Furrows) ║            well+stalls  (coach yard)  ║   │ cows)
y64  ═╪═════════╣W GATE═west spine═╗                    ╠═══╪═ EAST GATE
y70  │ meadows  ║ WAYKEEPERS'      ║ south lane         ║   │ → orchard
y84  │          ║ HALL+garden   COMMONS GREEN: homes,   ║   │ (apple+plum,
y96  │          ║ FARMHOUSE     hedges, gardens, WARDROOM║  │ Perl's
y104 └──────────╩═ SOUTH WALL ════╬water gate╬══════════╝   │ cottage)
y108   willows ─ MILL ─ QUAY+docks ─ FISH MKT ─ TANNERY ─ reeds
y114  ~~~~~~~~~ THE AMBER WATER ~~ (ford+BRIDGE x86-90) ~~~~ FORD DOOR
y134  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ║  south bank  ║ ~~~~ (reeds, x130)
y143   ─────────────────────────── Salt Road gate (x88) ────
```

District briefs (commitments; exact tiles authored in code):

- **The North Gate** — the gatehouse grown into a real command: Aldis's
  octagon tower (kept grammar), the curtain arch over the High Road, and
  **Rowan's registry desk** in a snug gate-room off the tower: the book, the
  lamp, the letter rack (Wren's letters), a bench for the newly arrived.
  Hask's outfitting west of the gate with a proper porch (`PorchDeck` +
  `TimberPost`), pack displays, and his own awning.
- **The stable yard** (Bray) — east of the North Gate inside the wall: rail
  paddock with `BeastPen`, `FeedTrough` pair, `HayBale`s, straw, the tack
  barn (racks, saddles-on-rails), Bray's cottage, mounting step by the road,
  water trough at the gate so every caravan beast drinks on arrival.
- **Craft Row** (craft lane y26-28) — Bretta's smithy rebuilt with a real
  working yard (slack trough, outdoor rack, coal store, delivery crates) and
  the commission shop under its own awning; Tilo's hall re-scoped: shop
  floor (patterns, bolts, the Silverfall weave) + the work line (loom,
  carving bench, workbench, sawhorse) with the tanning pad GONE (moved to
  the tannery where it belongs) and a cutting garden out back.
- **Elowen's dispensary** — east end of the row: shop, alembic lab, her
  room, and the herb garden re-fenced in a **clipped hedge** with a hedge
  arch, trellised over the door, growing-frames and a drying rack among the
  rows — herbalism visibly practiced.
- **The Round** — the stone heart, half again wider: **the town well
  (`Tile.Well`)** with its trough and bucket barrel, five stalls in two
  facing rows plus the fish cart, dyed banner poles, the notice board, the
  market oak with the bench ring, lamps at every mouth. The traders' pitch
  and Merra's morning stall both live here. Merra's Provisions gets a true
  shopfront on the Round's west rim, awning and all, her cottage behind it.
- **The Bank** — same program, more air: faceted plaza shoulders, forecourt
  with the **Toll War memorial** (pillar, braziers, plaque, and now a low
  hedge ring — the town gardens its grief), lobby with the crimson charter
  runner, teller line, ledger wall, manager's office, windowless vault
  (locks.ts re-pointed), the two BankChests flanking the aisle.
- **The Wanderer's Rest** (Dunna) — grown to a true coaching inn: hearth
  hall, the long bar with Dunna's cellar nook, walled kitchen, FOUR guest
  rooms plus **Nib's box room** (her routine finally sleeps where her story
  says), and the coach yard: the yard fire (a town cookfire), benches,
  trough, cargo crates, the mug on its bracket, awnings over the south
  windows.
- **The Waykeepers' Hall** (Ansel) — fronting the west spine: nave, faceted
  apse, the Pilgrims' Mile runner, pilgrim alcove cots, the registry desk,
  and a new **memorial garden** along the south wall — clipped hedges,
  topiary pair at the apse, flower borders — where the hall's quiet gets a
  green room.
- **The Commons** — the southeast quarter inside the wall, around a real
  green: Cormund's study house, Tilo's house (the chair still half
  finished), Aldis's stone house, the rebuilt **wardroom** by the water
  gate, the farmhouse (Jorel & Tamsin) inside the Fordgate corner with coop
  and dovecote and garden. The green itself: hedge lines, a topiary pair,
  garden plots, the bench oak, lamps — the first place in the world the
  garden family is spent in anger.
- **The west fields** (extramural) — Furrowfield across the First Road:
  wheat, carrot, cotton in real rotation rows with scarecrow, hay bales,
  silo, compost, irrigation channel off the river meadow; the **Free
  Furrows** kept as the common teaching ground, gate on the road, sign
  renewed. Water meadows and willows run south to the riverbank.
- **The east country** (extramural) — the **Amber Delf** cutting moved out
  where a mine belongs (northeast, off the East Road: copper ×2, tin ×2,
  the iron face, spoil, lamp, work corner); **Holloway pasture** on the
  east road (cows ×3, trough, milking corner — Perl's war continues);
  **Perl's orchard** re-planted in true `AppleTree` rows with plum
  interplants, berry hedges, her cottage among them, the fruit press and
  apiary by her dooryard.
- **THE FORD QUARTER** (extramural, the crown) — through the water gate,
  the town steps down to the river on a worked north bank: **Garton's mill**
  moved onto the true current (millrace inlet, wheel-wall on the water,
  flour shop fronting the quay walk); the **quay** (Dock planking) with
  moorings, the **fish market** (stall, the Catch Fire, net racks, barrels);
  **Peld's ferry landing** (his shack, lamp, bell, the punt planks — and a
  real river to pole someday, downriver to Saltmere as his tree always
  promised); the **tannery** (Swale) at the downstream end — frames, racks,
  lime barrels, the smell honestly downwind; the retting bank beyond it.
  **The Salt Road bridge**: stone-decked, rail-edged, crossing beside the
  authored sandbar ford — THE OLD FORD sign kept on the bank it named. The
  south bank: a brazier-flanked gatepost, the road walking off to Saltmere,
  reed shallows both sides, the Ford Door hidden in the eastern reeds.
- **The wall** — same garrison grammar (curtain, corner cuts, open gates),
  now ringing ONLY the town: x16/x124, y8/y104, four gates (Fordgate west,
  North Gate, East Gate, water gate south) and the wardroom watching the
  water gate. The country outside belongs to the fields and the river.

Fauna: cow ×3 (pasture), chicken ×4 (farmhouse coop), sheep ×3 (water
meadows). River fishing: FishingSpot ×3 on quay/banks + one `EelRun` under
the bridge shadow (the river's first ladder rung). No hostile spawns inside
the calm, per the corridor law.

## 6. The quest slate — the first working days, beside the war stories

Existing web untouched. NEW: eleven quests that make the professions the
town teaches into REAL first-day work, each completable in town, plus the
gathering capstone. Collect objectives ride live pack counts; offers at
priority 5/6, turn-ins at 21; requires.quests ≤ 4 always (chain through the
two warden quests).

**Arrival (Rowan):**
1. `the_gate_book` — talk Ansel, talk Cormund, talk Dunna. Rowan signs you
   in and sends you to the three doors every newcomer needs: the hall, the
   bank, the inn. His offer tree knows Wren's mark (`dawn_road_taken`) and
   greets a Dawnmead graduate by their walk.

**The forge lane (Bretta):**
2. `the_delf_ladder` — collect copper_ore ×4 + tin_ore ×4 from the Amber
   Delf. Her mining lesson made a journal fact. (Feeds the existing
   `a_smiths_errand` at mining 5 — the iron face's told-you-so.)

**The row (Tilo, Swale, Elowen):**
3. `cloth_for_the_counting` (Tilo) — collect cloth ×2 off the town loom.
4. `leather_on_the_frame` (Swale) — collect leather ×2 cured at the
   tannery; her tree points the hides at Hask's wolf chain after.
5. `a_dose_of_sense` (Elowen) — collect healing_tincture ×2 from her
   alembic; sagewort grows in her garden rows.
6. `the_makers_mark` (Tilo; requires 3,4,5) — talk Bretta, talk Swale,
   talk Elowen: the row's masters learn your name. The makers' warden.

**The table (Garton, Peld, Tamsin, Bray):**
7. `flour_and_water` (Garton) — collect flour ×3 milled on the new wheel.
8. `the_amber_water` (Peld) — collect raw_trout ×5 from the river.
9. `the_free_furrows` (Tamsin) — collect carrot ×6; the common ground
   teaching, seeds off Jorel's stall.
10. `a_stall_swept_clean` (Bray) — collect wheat ×5 for the feed bins;
    his tree teaches the stable door and the drover's lead.
11. `the_table_laid` (Dunna; requires 7,8,9,10) — collect bread ×2 +
    cooked trout ×2 for the common table. The hearth warden.

**The capstone:**
12. `the_ford_holds` (Aldis; requires the_gate_book, the_delf_ladder,
    the_makers_mark, the_table_laid — transitively all eleven) — stand the
    dusk watch: talk Rowan at the gate, talk Ansel at the memorial, then
    the turn-in at Aldis. Reward: coins, vitality, a rolled traveler's
    piece, flag `ford_freeman`. Her closing words hand the finished
    townsman the road work she already offers (`word_on_the_road`) without
    re-gating anything.

**Repeatable:** 13. `the_wheel_turns` (Garton, 12h, flour ×6) joins the
existing pelts_for_the_road (20h) and the_bad_column (20h).

## 7. The words — audit, re-ground, extend

The existing trees are largely at VOICE.md standard (the survey confirmed
it: Ansel's Edwin scene, Perl's orchard, Dunna's Osa are keepers). The pass
is therefore surgical, not wholesale:

- **Re-ground every geographic reference** — the millpond is gone, the
  river is here, the Delf moved outside the east wall, the tannery exists,
  the stable exists, Rowan is at the gate. Garton's herons, Peld's bell and
  pond, Bretta's Delf directions, Dunna's gossip, Nib's chart node, Tilo's
  "hide, cloth, or timber", Hask's kit talk: every line that names the
  ground gets re-walked against the new map.
- **Breath budget + dash ban audit** on all 30 existing trees; rewrite any
  line that fails, leave what sings.
- **New trees**: rowan_gate (hub: the book, Wren, the road east),
  rowan_wren (once, requires `dawn_road_taken` — the payoff every Dawnmead
  graduate walks into), bray_yard (hub + shop), swale_frames (hub + shop),
  Tilo gains a once-node handing leather to Swale, ~24 offer/turn-in trees
  for the new slate.
- **Flag wiring debts paid**: `ansel_edwin` (set, never read) gets its
  read — Rowan's memorial talk in `the_ford_holds` acknowledges the page
  if you carried Edwin's story; `ragna_flagon`'s Dunna choice gates on
  `dlg:dunna_rest` like osa_yard already does.

## 8. Delivery phases

1. **Ground** — riverscan hem profile; geography/danger/audio/npcs wiring;
   the full 144×144 zone build with validators green; route re-threads
   desk-proved; lowhall door re-pointed; locks re-pointed; test re-pins.
2. **Cast** — three new actor defs + routines; all existing routines
   re-authored to new posts; shops (bray_stable, trainer_tanner, artisan
   re-scope); factions roster + VOICE.md cards.
3. **Words** — new trees, quest defs, offer/turn-ins; the full audit and
   re-grounding pass over every existing amber tree.
4. **Proof** — all suites green; isolated live rig: close-zoom tour of
   every district and interior per map-curation-standard (screenshot
   audit), day/dusk/night routine audit, fresh-character walk of the whole
   new slate end-to-end plus spot-proof of the kept web (first_road
   turn-in, word_on_the_road offer).
5. **Ship** — shared-tree hunk-staged commit (skral lane live in npcs.ts —
   census at tree-build time), provenance check, diff proof, closing
   restore-staged step; memory + MEMORY.md; deploy notes (GEOGRAPHY-DOC
   PURITY for the rect + four route heads; enterWorld rescue covers actors
   standing in moved walls; prod chunk re-stamp per the Dawnmead precedent).

## 9. Build-time tools

`riverscan.ts` (session scratchpad): ASCII water/road atlas around the seat
— rerun with the hem lines of the NEW rect before authoring the river, and
again after geography lands to verify the harmony seam. Live tour rig:
lane-4 recipe (isolated Postgres, PORT=8797, vite :5180, headless shell;
chat commands ≥1.6s spacing; /give before collect turn-ins).

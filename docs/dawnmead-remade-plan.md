# THE DAWN REMADE — the starter zone, rebuilt from the ground up

**Status: APPROVED DIRECTION (user decree 2026-08-14). This document is the
implementation spec.** Supersedes the ce2bc00 curation layout and the 339616a
awakening cast entirely. The Waking Ring lore, the zone id `dawnmead`, the
world spawn, and the danger anchor survive; everything else is rebuilt.

The user's brief, condensed: Dawnmead is the game's introduction and it is the
weakest zone we ship. Small, condensed, things hidden behind walls, a rat shed
you can't see into, dialogue that doesn't land, three quests (one of them
uncompletable in the village), no gating, no arc. Rebuild it completely: bigger
and open, master-curated, all-new cast each teaching a profession, all-new
clear dialogue, a real tutorial quest slate with follow-ups, and one final
quest that ushers the finished waker up the First Road to Amberford.

---

## 1. What stays (the load-bearing bones)

- **Zone id `dawnmead`**, display name **Dawnmead**. The name is canon (the
  Dawnlands are named for it; gazetteer, danger word, discovery ids). The
  town is remade, not renamed.
- **The Waking Ring + world spawn (-81.5, 48.5)** — same five stones, same
  world position. Existing characters, respawn law, rescue law, worldgen.test
  spawn pins all hold. Nobody explains the Ring. Ever.
- **Danger anchor `{x:-64, y:48, safeR:64, country:1}`** — Dawnmead stays the
  safest word in the march. Untouched.
- **Roads**: `first_road` still starts at world (0,48) off the east hem.
  `old_road` and `hunters_trail` keep their identity; their first points move
  to the new hems (§3).
- **The lore spine** (VOICE.md §3): extended, never broken. Rowan, Bryn, Iona,
  Hobb, Fen, Pip, and Drover Maren pass into lore (§4).

## 2. The new fiction — THE VILLAGE THAT RAISES WAKERS

The Ring has been waking more folk than anyone alive remembers. A village of
six could not carry that, so Dawnmead grew into what it always half was: the
place that raises the world's wakers. Nearly every adult here **came out of
the Ring themselves**, years ago, and stayed to hold a blanket for the next
one. Each keeps one trade and teaches it to every waker who asks; the
village's whole quiet faith is *learn your hands, then take the road*. Elder
Rowan finally took his own advice two winters back and walked east; Wren
keeps the Ring now, as he asked her to.

This conceit is load-bearing: every teacher's backstory is what they did with
their own waking, every lesson is paid forward, and the send-off ceremony is
the village doing the only thing it was ever for.

## 3. The ground — zone envelope and world wiring

- **Rect: 128×96 at origin (-128, 0)** — world x [-128,0), y [0,96), centered
  exactly on the danger anchor (-64,48). 2× the old area; between Amberford
  (112×80) and Silverfall (176×128). Flat zone (no elev) — legibility is the
  starter zone's art. Local = world + (128, 0).
- **geography.ts**: `DAWNMEAD_RECT` → new rect. Route re-threads (desk-profile
  against WORLD_SEED with the road-span workflow before landing):
  - `old_road` pts[0]: (-64,80) → **(-64,96)** (south hem).
  - `hunters_trail` pts[0]: (-64,15) → **(-64,-1)** (north hem).
  - `first_road` pts[0]: (0,48) unchanged.
- **worldgen.ts**: the legacy radial suppression stays keyed to (-64,48);
  verify the 2-tile border apron of the grown rect sits flat under it (corner
  distance 80 &lt; the 200-radius basin suppression; expect no change needed).
- **npcs.ts TOWN_SPAWNS sweep** (the grown rect swallows two old dens):
  wolf pair at (-40,2) → (-52,-14); dire_wolf (-32,-1) → (-36,-12); ram pair
  at (-112,28) → (-152,20). Corridor law extended: the rect interior and the
  east lane band stay predator-free.
- **audio/zones.ts**: Dawnmead full 22/fade 36 → **full 44 / fade 64**.
- **Test re-pins** (the full list the rebuild must update): content.test
  dawnmead anchors + BFS, geography.test rect match, worldgen.test overlay
  probes (well moves; spawn probes unchanged), pois.test `CTX.zoneRects`
  hard-coded rect, finds.test cell comment, tracks.test seat (unchanged
  coords), actors/routines/dialogues/quests law tests (fixture slugs).

## 4. The cast — 13 named + 3 pooled, every throat a teacher

All-new defs, dialogue trees, and routines. Old cast retired (defs, trees,
routines deleted; DB pure-seed prune on boot). Old names enter dialogue as
lore: Wren quotes Rowan; the granary was "Hobb's, before the family moved to
Amberford market"; nobody name-bombs (VOICE.md law: ground every name).
VOICE.md §4 Dawnmead block is rewritten with these cards (want / wound /
quirk / cadence — binding at authoring time).

| slug | name | post | teaches | card sketch |
|---|---|---|---|---|
| `keeper_wren` | Elder Wren, Keeper of the Waking Ring | Ring court | orientation, the send-off | Woke from the Ring 50 years ago, grown, nameless for a week. Wants every waker to leave ready; keeps unsent letters to the ones who never wrote. Knits while she talks; measures time in wakings. Cadence: warm, unhurried, plain; calls you "waker"; the one throat allowed gentle practical wisdom. |
| `yardmaster_halla` | Halla, the Yardmaster | drill yard | sword, dash | Wayward Watch sergeant sent home with a knee that predicts rain. Wants Dawnmead's wakers to outlive their first mistake. Counts everything aloud. Cadence: imperatives, short, drill-clip. "Again." "Better." |
| `fletcher_rill` | Rill | archery range | bow, the held draw | Poacher's kid from the fells who walked in off the hunters' trail at nine and never left. Wants the bow respected, not feared. Whittles constantly; speaks softly and rarely first. Cadence: few words, all of them aimed. |
| `sparkwright_varn` | Old Varn, Sparkwright | spark circle | staff, aim | Woke from the Ring mid-sentence and swears he was saying something important. Wants one waker to finish the thought. Scorched sleeves, delighted by everything. Cadence: rambling, wonder-struck, interrupts himself; the drift and "..." belong to him. |
| `forester_alder` | Alder | the copse | woodcutting | Born here; the copse was his mother's. Wants trees taken so the stand outlives him. Names his favorite oaks. Cadence: slow, seasonal, patient; talks in years. |
| `cook_berrit` | Berrit, the Hearthmother | cookhouse | forage, cooking | Fed a whole bad winter out of one pot and won't discuss it. Wants nobody leaving hungry. Bullies by feeding. Cadence: brisk, warm, food-first, no epigrams; "love" like Iona before her, but faster. |
| `wright_ottery` | Ottery | the bench yard | crafting, the forge corner | Woke from the Ring with clever hands and no patience; broke three benches learning. Wants you to make your first thing, whatever it is. Keeps every waker's first mangled craft on a shelf. Cadence: quick, practical, self-mocking. |
| `innkeep_gilly` | Gilly | the Five Stones inn | rest, the claimed bed | Walked the road as far as Saltmere, came back, says the road was the point. Wants every waker to know the way back. Cadence: publican's warmth, road stories in miniature; wit granted, spent rarely. |
| `angler_weir` | Weir | the crab bank pier | fishing | Sat down at the brook forty years ago; more or less still there. Wants the water listened to. Speaks at fishing pace. Cadence: slow, short, long pauses that aren't trailing off, just waiting. |
| `farmer_brammel` | Brammel | the tilled field | crops | Third-generation; the only man alive bored by the Waking Ring. Wants rain on Thursday. Cadence: flat immediate statements; Hobb's glorious ordinariness, inherited honestly. |
| `drover_sorrel` | Sorrel | the stalls | beasts, taming | Woke from the Ring and the first thing she did was calm a spooked cow; took that as instruction. Wants beasts treated as company. Half her words go to the animal. Cadence: handler's murmur, short instructions. Keeps the drover shop. |
| `twin_tansy` | Tansy | the green | (texture) | Brammel's daughter, elder twin by a shout. Runs everywhere. Cadence: fast, literal, keeps score. |
| `twin_wick` | Wick | the green | (texture) | Younger twin. Collects "Ring facts", all wrong, all confident. Cadence: solemn nonsense, questions back. |
| `dawnmead_ward` ×3 | Vale Ward (pooled) | rota posts | (watch) | Villagers with a season of Halla's drill; proud, slightly stiff in the leather. Report small things seriously. No trees; lines only. |

Shops: `general_store` moves to **Ottery** (keeper of tools). `drover_yard`
re-titled "Sorrel's Drover Yard" under **Sorrel**. New `gilly_board` (inn:
bread, cooked meals, a bedroll). The stale "Jorel's Seed Stall lives in the
Dawnmead fields" comment in shop.ts is corrected (Jorel is Amberford's).

Routines: all 16 placements carry routines (sleepers on 2-tile bed runs with
cardinal-stand staging; work:true only at real stations; the twins share a
green-scamp pattern offset so they orbit each other). The wards keep a
three-post rota (bridge day, green night, granary dusk) per town-watch-rota
law.

## 5. The map — districts on an open plan

Streets first; every building fronts a street or the green; ≥3 open tiles
between structures; no template stamps; 45° chamfers budgeted to the inn and
the lodge only. All interiors sized for contents + walking room. Every shop
hangs a sign; ~24 authored sign boards total (sign law: no blank boards).

Local coordinate sketch (128×96; lane rows y47-49 = the old world lane,
preserved):

```
   x0        x20       x44        x64       x92      x127
y0   ─ hunters' trail head (x62-66) ─┐  brook │ north wood hem
y8  ┌ ORCHARD ┐   ┌── FARMSTEAD: farmhouse, coop, ──┐
y24 │ (fenced) │   │ pasture, tilled field, silo,    │ crab
y30 └──────────┘   │ stalls + drover yard            │ bank,
y32   Wren's cottage ┌ FIVE STONES INN ┐ (farm lane) │ pier,
y40   RING MEADOW    │  (on the green) │ COOKHOUSE   │ Weir's
y44  ~ THE WAKING ~  └───── GREEN ─────┘ (open-side) │ hut
y47  ~ RING (46,48) ═══ THE LANE ══ well ═ bridge ═══════ → First Road
y52   (spawn)        ┌ LODGE + DRILL ┐  BENCH YARD:  │
y58                  │ YARD: dummies,│  workbench,   │ OLD
y64  ┌ THE COPSE ┐   │ range, spark  │  sawhorse,    │ GRANARY
y74  │ (Alder's   │  │ circle        │  forge corner │ (ruin) +
y84  │ woodlot)   │  └───────────────┘               │ rat
y88  └────────────┘      south meadow    ford (y~72) │ warren
y95   ──────────── old_road gate (x62-66) ────────── south hem
```

District briefs (exact tiles authored in code; these are the commitments):

- **The Waking Ring** — the five stones on a widened StoneFloor ring at world
  (-82,48), flower verge, lamp pair, Wren's cottage porch facing it. West of
  the Ring to the hem: open wildflower meadow, deliberately empty — the first
  thing a waker sees is soft distance.
- **The Green** — the town's living room at the zone center: real `Tile.Well`
  (new since the last build), notice-board signpost, benches, flower boxes,
  banner poles, the twins' orbit. The danger anchor (-64,48) sits here.
- **The Five Stones** (inn, north of green) — common room, bar counter,
  hearth, four guest alcoves with claimable beds (the rest/recall tutorial),
  Gilly's room. The only two-step chamfer in the village.
- **The Lane** — Path rows 47-49, Ring court to the east hem, lamp-lined,
  crossing the brook on a proper 5-wide bridge.
- **The Yard** (Halla, Rill, Varn) — dirt drill ground, 3 target dummies,
  weapon/tool racks, a fenced archery lane with straw butts, Varn's small
  stone spark circle with braziers, the stone lodge (wards' bunks + Halla).
- **The Bench Yard** (Ottery) — open timber-frame workshop: workbench,
  sawhorse, carving bench, and the **forge corner** (one furnace, one anvil
  under a lean-to) so every core trade is sampleable before Amberford. First
  ore in the zone: a small copper+tin outcrop ("the Scrap Crag") on the
  copse's rocky hem.
- **The Cookhouse** (Berrit) — open-sided: hearth, cook pot, meat spit,
  smoker, and the long supper table where routines gather the cast at dusk
  (the atmosphere set-piece).
- **The Farmstead** (Brammel, Sorrel) — farmhouse, fenced coop with roaming
  hens, big pasture (cows, sheep), tilled plots with living crops +
  scarecrow + hay bales + silo, the stalls (beast pen, feed trough) and
  drover yard.
- **The Copse** (Alder) — a managed woodlot: oak/willow stands, honest
  stumps, Alder's hut, "take the marked ones" sign. The harvesting ground.
- **The Brook & Crab Bank** — the sin-meander brook re-authored at the same
  world x (~-36), touching both hems (edge-harmony law). East bank widens
  into sand shoals with reed tufts, shallow pockets, **mudcrabs ×5 in the
  open**, two fishing spots, Weir's hut and short dock pier.
- **The Old Granary** (replaces the rat shed) — a roofless stone ruin in the
  southeast meadow, walls broken open on two sides, straw and spilled-grain
  dressing, the ONE wooden chest inside, and **rats ×7 in the open** around
  it in tall grass: visible from the lane, fightable in daylight, readable
  at range. Warning sign on the lane.
- **Gates**: east lane mouth (First Road), south old-road gate with a
  "not for new feet" sign, north hunters'-trail waymarker. Lamps line the
  lane; the trail and old road stay unlit (that IS the teaching).

Fauna (authored spawns): chicken ×5, cow ×2, sheep ×3, rat ×7 (granary
meadow), mudcrab ×5 (bank). Levels stay 1-2; the corridor law keeps
predators out.

## 6. The quest slate — 15 quests, four soft paths, one road

Every lesson is a REAL journal quest (search rings, return cards, rewards),
every path has a follow-up, everything completes inside the village. Craft
lessons ride collect-objectives (pack counts credit crafted goods live — no
engine change needed). Offer trees at priority 5/6 (tie law), turn-ins at 21.

**Opening (Wren):**
1. `first_light` — talk halla, talk rill, talk varn. Meets the three arms
   schools; each once-tree teaches its weapon. Reward: 20c.

**Arms path:**
2. `the_meadow_count` (Halla, req 1) — kill rat ×6 at the granary meadow.
3. `shells_on_the_bank` (Rill, req 1) — kill mudcrab ×4 (bow-friendly:
   slow, passive, and they don't bleed — the lesson is in the fight).
4. `the_last_nest` (Halla, req 2+3, follow-up) — kill rat ×8; reward: an
   iron blade with a roll (gear-roll reward law).

**Hearth path:**
5. `berries_for_the_pot` (Berrit) — collect berries ×8 from the brook banks.
6. `a_bird_done_proper` (Berrit, req 5) — collect cooked_chicken ×2; she
   hands raw birds at accept, the player cooks at her hearth.
7. `a_line_in_the_water` (Weir) — collect raw_trout ×4.

**Makers path:**
8. `the_axe_remembers` (Alder) — collect log ×4 from the marked trees.
9. `boards_and_twine` (Ottery, req 8) — collect board ×3 + twine ×2 (the
   sawhorse and workbench lesson, plus fibre from the bank).
10. `a_bar_of_bronze` (Ottery, req 9, follow-up) — collect bronze_bar ×1
    (Scrap Crag ore → forge corner smelt).

**Homestead path:**
11. `eggs_for_the_morning` (Brammel) — collect egg ×6 (hens roam the coop
    and the long grass).
12. `the_gentle_hand` (Sorrel, req 11) — collect milk ×2; her tree carries
    the taming teaching forward.

**Explorer thread:**
13. `walking_the_bounds` (Gilly) — talk alder + weir + sorrel (the far
    corners; teaches the chart, search rings, and the shape of home).

**The capstone:**
14. `the_first_road` (Wren; requires 2,3,6,7,9,11,12,13) — the send-off.
    Stage 1: discover zone:amberford; turnIn `captain_aldis` (her turn-in
    tree rewritten for the new fiction: Wren's mark now, not Rowan's).
    Reward: 60c, a traveling cloak with a roll, vitality xp. The journal
    entry IS the road briefing: lamps, waystations, the ford town.

**Repeatables:** 15. `still_waters` (Weir, 12h, raw_trout ×6) and
`the_meadow_keeps_count` (Halla, 16h, rat ×8) — reasons to come home.

**Retired:** `hobbs_hens`, `thin_the_meadow` (goblins never spawned near the
village — the broken quest), `the_lay_of_the_land`, `the_pot_never_rests`.
`word_on_the_road` (Aldis) re-gates on `the_first_road`. Migration note:
players holding retired quest rows fall back per the abandon/prune path;
verify on the dev DB at implementation.

## 7. Dialogue — the writing pass

Every tree authored fresh under VOICE.md: one voice per throat (cards in §4),
breath budget (hubs 1-2 sentences, answers &lt;55 words), ground every name, no
dashes, no UI words in mouths, lore as crumbs. Structure per teacher: a
`once` intro (priority 10) that teaches the trade diegetically, a default
hub with 3-4 topical choices, offer/turn-in trees per quest, and a flag web:
teachers reference each other by trade ("Berrit feeds the yard at dusk. Sit
where she points."), one-time gifts behind forbids/set flags, and
world-remembers branches keyed on `qst:` flags (Wren's hub grows warmer as
the slate completes; Halla's "you'll do" only after both culls). The twins
carry the Ring's mystery as wrong guesses (the law: nobody explains it).

## 8. Delivery phases

1. **Map** — geography/worldgen/danger/audio wiring + the full zone build,
   validators green, test re-pins.
2. **Cast** — actor defs, routines, shops, VOICE.md cards.
3. **Words** — dialogue trees + quest defs + offer/turn-in trees; retired
   content deleted; Aldis re-pointed.
4. **Proof** — full suites; headless live tour at close zoom, every district
   and interior screenshotted and audited (map-curation-standard); fresh-
   character walkthrough of the whole slate start → Amberford send-off.
5. **Ship** — hunk-staged commit per shared-tree law; memory + VOICE.md
   updated; VO debt logged for the casting office.

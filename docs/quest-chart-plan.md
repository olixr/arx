# THE FINGER ON THE CHART — the quest pane and the searching grounds

*As-built, 2026-08-16. Grows THE ERRAND LEARNS THE WAY (d129eed): the
one gold search ring becomes a full errand layer on the chart —
multiple grounds per ask, told apart by quest ink, honest about what
is witnessed and what is rumor.*

## The fiction

Someone in these lands who KNOWS points a finger at the map: a firm
small circle (a person's post, a standing camp, a mapped place).
Someone who has only heard tells you loosely: "wolf country, out
past the ford, they say" — a hand-sketched blob, looser and fainter.
The chart never tracks anything live and never plants a pin; the
GUIDANCE LAW (neighborhood, never a spot) stands unamended.

## The wire (protocol 33, additive)

- `QuestHintWire` gains `sure?: boolean` (false = rumor) and
  `word?: string` (the cartographer's word for that one ground:
  "berry meadow", "a camp, they say").
- `QuestObjectiveWire` gains `hints?: QuestHintWire[]` — every ground
  the world can honestly offer, best first, at most four;
  `hints[0] === hint`, and the single `hint` keeps feeding the
  tracker compass unchanged. Mirrored in shared/protocol/messages.ts
  AND server/game/quests.ts (the duplicate-mirror law).

## THE WORLD ANSWERS "WHERE", grown (gameServer.questLocateRefs)

Sure grounds lead, rumors trail, dedupe drops any rumor shadowed by a
sure ground's skirt; cap 4; all centers 8-grid fuzzed; persistent
planes only; memoized 60 s per ask (the collect watcher re-pushes at
2 Hz).

- **kill**: up to 2 witnessed spawn grounds nearest the giver's door
  (distinct neighborhoods — clustered posts share a ring), plus
  rumor lanes:
  - **camps** (`poiDefsFielding`): decided-but-unproven POI ledger
    sites whose archetype garrisons the creature (base + wings +
    boldness rungs), within ~1200 tiles — worded "a camp, they say",
    never named, so the discovery ceremony keeps its moment;
  - **THE ROSTER READ BACKWARD** (`wildEntriesFor`, content/wilds.ts):
    ring-samples the pure fields around the giver (danger tier in the
    entry's band, biome/shore probes, off the calmed roads — the same
    laws vetWildAnchor spawns by; hours ignored so grounds never
    flicker with the clock), then greedy-density-clusters passing
    samples into 2–3 generous blobs.
- **collect**: questDrops → the kill path for the dropper; otherwise
  **THE PROSPECTOR** (content/prospect.ts): `GATHER_PROSPECTS` maps
  worldgen-grown yields (logs, herbs, berries, fibre, copper/tin,
  obsidian, the fish) to ground families, `prospectScoreAt` reads the
  same pure fields generateChunk sows from (moisture, cold, the knoll
  fbm, scorch, the tide line) — coarse by design, chunk-free, with an
  ADJACENCY LAW comment tying its cuts to worldgen's. Deep ores
  (iron+) are deliberately absent — camps and caves hold them, and
  the chart must not gesture at empty meadow. Items with no lane
  (eggs) stay honestly silent; the journal prose carries alone.
- **talk / discover**: unchanged single sure hint (actor post r=10,
  zone extent).

## The client

- **THE ERRAND RAIL** (mapScreen): a 19rem pane left of the canvas —
  rows wear their quest ink as a swatch (the pane IS the legend),
  name + part, per-ask progress with live distance feet ("187 E",
  "hereabouts", "another realm", 500 ms beat), Ready → gold
  "Return to X". Row click = focus + frame; per-row Hide/Show; Hide
  all/Show all; hidden set persisted per character
  (`arx.chartHidden.<name>`); pad-nav region with `chartq:` navkeys
  (`quest:`/`errand:` are claimed). Structure repaints on
  questVersion only.
- **THE QUEST INKS** (markers): six inks apart from waypoint sky /
  death ember / player gold; stable hash slot per quest id, probed
  apart across the active ledger.
- **drawQuestGround**: seeded organic blob (value noise sampled on a
  circle — deterministic frame over frame), ink wash, walking dashed
  rim over a quiet dark seat; rumors are looser (wobble 0.24),
  fainter, stippled, double-sketched. **drawKnownSpot**: the one TRUE
  circle a sure hand draws — solid rim, seated heart-dot.
- **mapView quest layer**: display list rebuilt on
  questVersion/shown/focus stamp; draws fresh-per-frame ABOVE the
  STILL SHEET composite (no layerStamp coupling); plane-filtered;
  labels only for focus/hover/scale≥5 (rumors without a server word
  earn ", they say"); focused errand breathes and gets an ink edge
  pointer when off-sheet; hover pick (grounds picked LAST, never
  stealing a pin, cursor stays crosshair so the planting hand keeps
  its verb); the traveler's glass draws only the FOLLOWED errand,
  quietly.
- `showAreaOnChart` (main) now routes journal/tracker chart buttons
  through `mapScreen.focusQuest(quest, ground?)`; the single
  searchRing and drawSearchRing are retired.

## Proof (lane 18, gate tree, arx_quest18 — since dropped)

Wire: berries → 3 "berry meadow" rumor blobs; trout → 3 "open water"
banks; worg → 1 witnessed spawn + 2 camp rumors (one is the authored
veil_den wolfkin den) + 1 wild ground; rat → 2 sure + 2 rumors; boar
→ 3 rumors near the giver's own Kingsdelf door; raw beef → honest
silence. Pane, focus framing, hide toggles, far-sheet legibility all
screenshotted; zero console errors. Gates on a standalone HEAD+mine
tree (gameServer.ts as a patch twin beside a neighbor's seat work):
shared 220, content 526, server 498, client 616, four-package tsc
clean.

## Deferred, named

- Livestock/lay items (eggs) and shop-bought collects have no ground
  lane — silence today; an authored `questDrops`-style source pin or
  a lays index could carry them later.
- Camp rumors read the poiLedger (decided cells) only — cells never
  yet decided stay dark until `poiForCell` speculation is wired in
  (previewPoi exists).
- Ground labels can overlap when two camps sit close; a label
  layouter is a someday nicety.

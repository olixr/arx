# THE PINEREACH — the north wall, the high pass, and the town that watches

*A world-authoring epic for the Dawnlands. Read `packages/content/src/geography.ts`
and the `dawnlands-map-master-plan` memory before touching anything here.*

---

## 1. The brief

Three asks, one landmass:

1. **Silverfall must read as nestled.** The capital sits deep in the Silverspine
   because that is where capitals go: hard to reach, hard to take. Today the
   massif lifts the country around it but the flanks are soft and the approach
   is open. It needs walls of stone and sheets of water so that arriving at the
   gate feels like arriving at the *only* way in.
2. **A pass north of Silverfall.** One thread through the mountains, heavily
   guarded, honestly signed as treacherous, ending at a gate that looks out on
   country the maps do not yet cover. The seam for a future northern zone.
3. **A giant pine forest north-east of Amberford**, running south down the east
   country toward the coast where a future port will stand — and inside it, a
   new bespoke town: **Pinewatch**, level 20-30 country, reached by two roads
   (one long and lamped, one short and awful).

---

## 2. The land

### 2.1 Two new terrain primitives

`geography.ts` grows two landform arrays beside `massifs` / `veils` / `fens`:

| kind | field it bends | what it makes |
|---|---|---|
| `meres` | elevation, pulled *under* the water line and deepening toward the heart | true open lakes with organic shores — where a `fen` deals a marsh mosaic, a mere deals water |
| `pinelands` | `coldAt` **and** moisture | taiga: cold enough for pine to take the stand, damp enough for a canopy to close over it |

And a third primitive, in the danger field rather than the terrain:
**`DangerAnchor.dread`** — the haven run backwards. A haven pushes the
dark back; a dread pulls it in, adding tiers inside its radius and one
fewer on the graded rim, never reaching inside a hearth and never
joining the band march. It exists because of §3.4: the short way to
Pinewatch stays *nearer* both towns the whole way, so distance alone
made the shortcut the safe road. Named country now answers for itself.

Both obey the **heart law** the Amberfen wrote: a heart never sits on an
authored canvas. It sits off the rect and lets the zone author its own
shoreline; the edge-harmony water class carries the two together.

### 2.2 The Silverspine closes its hand

| id | kind | heart | r | what it does |
|---|---|---|---|---|
| `spinewall_east` | massif | (-152, -176) | 116 | the eastern rampart — crag country standing 30 tiles off the city's east wall |
| `spinewall_south` | massif | (-238, -34) | 82 | the southern shoulder; the High Road's last league becomes a cut between crag and water |
| `kingswater` | mere | (-380, -70) | 84 | the long water off the city's south-west — the flank nobody marches |
| `coldtarn` | mere | (-166, -250) | 44 | the high tarn under the pass shoulder |

The approach now threads **between the Kingswater and the spinewall** for its
last league. That is the whole design: one road, one gate, water on the left,
stone on the right.

### 2.3 The Hoargate

North of the city the massif already leaves a vale — open floor between
plateau shoulders at roughly x -338..-306, y -276. That vale is the pass.

- **`hoargate_road`** leaves the city's north hem at (-204,-224), runs the
  aproned shelf north-west, climbs the vale, and ends at (-338,-372) inside
  **`RIMEWARD_RECT`** — ground *reserved, not built*. A road that ends nowhere
  is a road the plan is lying about; the reserve is the plan telling the truth,
  and the POI scaffold already keeps the frontier out of it.
- **The Hoargate** itself stands at (-334,-262): a new POI archetype
  (`hoargate_watch`) — a garrison across the narrows, heavily manned, lamped,
  and signed. It is the only structure in the pass and it is not subtle.
- **`spineshelf_rest`** (waystation) breaks the shelf walk at (-232,-240).
- Beyond the gate: **the Rimeward**, unmapped. The signage says so plainly.

**The stair law forbids a north gate on the terraces** (flights are
south-facing only, so nothing can descend toward the north border). Silverfall
therefore gets **the Postern Lane** instead: a walled level-0 lane up the
city's east perimeter, gated at both ends, with the Hoargate Watch's muster
yard at its head. That is how real mountain holds do it, and it touches not one
terrace tile.

### 2.4 The Pinereach

| id | kind | heart | r |
|---|---|---|---|
| `pinereach` | pineland | (620, -190) | 190 |
| `pinereach_south` | pineland | (700, -30) | 150 |
| `glasswater` | mere | (596, -224) | 96 |

The two hearts overlap into one continuous forest that is near-pure taiga in
the north and gives out into mixed oak and pine as it runs south toward the
eastern coast — so the future port already has a hinterland.

---

## 3. Pinewatch

**`PINEWATCH_RECT` = (520, -184) 128 × 96, centre (584, -136).** Third HAVEN
anchor, safeR 64.

Danger reads exactly right without a dial being touched: **tier 4** across the
town's own country (levels 22-34), **tier 5** the moment you cross the
Glasswater or step east past the Wardline.

### 3.1 Why the town is there

Silverfall is stone. The Timberway — Stig's carpenters' hall, Dagny's
cooperage, Haki's fletcher's perch — eats pine it cannot grow. Amberford
builds with it. Seff at Saltmere lays keels of it. Every great stick of timber
in the Dawnlands comes off one lake shore, and this is the shore.

But the town is older than the trade, and its name is older than both.

**Pinewatch was a watchtower first.** It was raised to watch the deep wood, and
what it watched for came once: **the Wolfwinter**, forty years ago, when the
Glasswater froze end to end and the packs walked across it and took the
outlying camps one by one. The tower held. The town grew up around the people
who did not leave.

So the watch is still kept. Nightly. By rota. By everyone — the sawyer takes
her turn on the tower stair the same as the reeve.

### 3.2 The Wardline

A ring of blazed pines and boundary stones around the town's licensed cut:
inside it you may fell, outside you may not. **No axe
past the Wardline.** The near stands are cut and replanted; the old wood is
left standing, because the old wood is what the wolves live in and a cut road
into it is a road *out* of it.

The great spars — masts, ridgepoles, the timber a castle actually wants — only
grow past the line. Somebody is cutting there. That is the town's spine of
quests, and it has a real answer with real costs.

### 3.3 The shape of the town (draft)

- **The Old Watch** — the original stone tower on the town's knoll: the bell,
  the rota board, the muster yard. The town's centre and its clock.
- **The Boom** — log pond and sorting gap on the lake, booms chained across
  the mouth, the raft dock, the pike-poles.
- **The Great Saw** — water-driven sawmill on the outfall, the loudest building
  in the Dawnlands.
- **The Pitch Yard** — resin kilns; firepitch out, the smell in everything.
- **Sparwrights' Row** — where masts are shaped, and the only place in the
  world that can shape one.
- **The Charterhouse** — the Amberford Charter's factor and the Crown's buyer
  under one roof, hating each other politely.
- Essentials: inn, stores, bank counter, a Waykeepers' post on the road gate.
- **The Wardline Gate** — east, barred, watched.

### 3.4 The two roads

| | `timber_road` | `sparway` |
|---|---|---|
| kind | road (Path, bridged, lamped) | trail (Dirt, unlit) |
| from | Amberford's **East Gate** (408,44) | Amberford's **North Gate** (350,-15), a fork on the High Road |
| to | Pinewatch **South Gate** (584,-89) | Pinewatch **West Gate** (520,-140) |
| length | 389 tiles | 209 tiles |
| mean tier walked | **1.74** | **2.48** |
| safety | two havens (`hollow_watch`, `pinehollow_rest`) sit exactly where the band runs deepest and relieve it | nothing. No lamp, no roof, no help, and the Blackpine's two tiers on top |

The safety is *mechanical*, not cosmetic, and it is measured: a test walks both
routes through the live danger field and fails if the Sparway ever stops being
the shorter, worse road. The lamp is the safety. That has been the road-faith's
entire claim since Dawnmead, and here it is finally load-bearing.

**The Sparway gets no authored landmark on purpose.** Every macro-cell an
authored site claims is a cell the living frontier can never grow anything in
(the one-site-per-cell law), and the trail is meant to be dangerous because it
is *unwatched* — whatever the scaffold rolls there this season is the shortcut's
reputation, and it changes.

---

## 4. Phases

1. **THE LAND REMEMBERS THE NORTH** — meres + pinelands primitives, the
   Silverspine walls, the Glasswater, the Pinereach, all three routes, the
   authored sites, the Pinewatch rect + anchor. Tests.
2. **THE HOARGATE** — the Postern Lane in Silverfall, the `hoargate_watch`
   archetype, pass signage, the cold roster.
3. **PINEWATCH STANDS** — the bespoke zone build.
4. **THE PEOPLE OF THE PINEREACH** — cast, dialogue, routines, shops.
5. **THE WARDLINE** — the quest arc and the town's events.
6. **THE WALK** — live tour at close zoom, curation pass, polish.

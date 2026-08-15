# THE GREAT WORLD REGEN — the Dawnlands on seed 24601 (as-built, 2026-08-14)

The project lived its whole life on seed 1337. This epic regenerated
the world onto a hand-picked seed, taught worldgen large-scale
composition on the way, and re-seated the entire authored plan —
every town, landform, road, and wild site — against the new terrain,
with materially more distance between the hearths.

## 1. THE LAND LEARNS COMPOSITION (worldgen.ts)

The old elevation field was mid-frequency fbm only: statistically
identical speckle on every seed — no provinces, no ranges, no rivers.
A seed hunt was meaningless until the land could express one. Four
macro fields fixed that:

- **Provinces** — a continent-scale field (freq 0.0032) blended 38%
  into elevation: lake districts, dry grassland provinces, coastal
  reaches now happen as REGIONS, while the detail noise argues every
  local shoreline.
- **Ranges** — a ±0.17 continent-scale term on the plateau field:
  crags cluster into highland belts with open lowland leagues between.
- **Rivers — the level-set law.** The 0.5 contour of a slow field
  (freq 0.0045) is a family of long connected winding curves; a ridge
  function of it carves elevation toward a bed that FLOORS AT 0.305 —
  above the 0.3 deep-water line — so THE SHORT SPAN LAW still lets
  roads bridge every river. Sandbars still crest through the mid band
  (natural fords), meander wobble breathes the banks, town aprons dry
  the carve, massif hearts fade it. Where a river runs through
  plateau country the flanking cliff fences read as a gorge for free.
- **The riparian ribbon** — banks borrow the river ridge for
  moisture, so willow-green follows the water; a moisture belt field
  (±0.15) deals forests as belts and broad woods, never confetti.

## 2. THE SHIPPED SEED — 24601

`WORLD_SEED = 24601` in `packages/content/src/worldgen.ts` is the one
source: server config defaults to it, the editor offline fallback
reads it, every terrain-pinning test imports it. Chosen from a
13-seed survey (offline atlas renderer sampling the real fields;
hillshade + class stats): the grassiest heartland of the batch (47%),
the richest connected river net, forest belts NW/NE, lake districts
at the corners, mountain clusters with real leagues between.

## 3. THE CONSTELLATION — wider by ~40-50%

Dawnmead holds (-96,16) — the continental lift, the hardcoded builder
origin, and TOWN_SPAWNS all anchor there. Everything else moved
outward (old → new center):

| Town | New rect | New center | Note |
|---|---|---|---|
| Amberford | (464,-44) 112×80 | (520,-4) | ON the great river: the ford that names it is real; the Salt Road crosses it out of the South Gate |
| Saltmere | (704,290) 112×80 | (760,330) | lake district west, flats south |
| Pinewatch | (1096,-404) 128×96 | (1160,-356) | EAST bank of the Glasswater chain; west hem in the water = the boom/quay (zone-polish debt: west gate reads as a water door) |
| Hartfell | (1240,-664) 128×96 | (1304,-616) | grass province east of the river gorge |
| Barrowdeep | (1232,-752) 80×56 | — | reserve, follows Hartfell |
| Silverfall | (-536,-344) 176×128 | (-448,-280) | on the seed's own highland belt; river east of the walls |
| Rimeward | (-560,-568) 128×96 | — | reserve |
| Kingsdelf | (-544,280) 128×96 | (-480,328) | Brand/Ashmarch/Ashmere moved with it |
| Oldcrown | (-744,136) 96×64 | — | reserve |
| Evenfall | (-1112,-414) 160×112 | (-1032,-358) | far-west lake wilderness; Everwood hearts re-seated |
| Heartwood | (-1232,-534) 96×64 | — | reserve |

All landform hearts moved by their towns' deltas; GLASSWATER re-seated
onto the natural lake at (1044,-336) r90; the Amberfen hearts were
re-sited by MEASURED marsh-noise wetness ((90,60) + (200,110) — the
First Road threads the waist between them); PINEREACH (1000,-520) now
stands across the water from Pinewatch.

## 4. THE ROADS — all 13 re-threaded, span-law clean

Desk-profiled with `routeBridgeDecks` + `geographyWarnings` against
seed 24601 (zone edge profiles loaded) until ZERO warnings: every
deck ≤ 12 (roads) / 8 (trails), no deep water bridged. Notable:

- **High Road** ~1010 tiles (was ~516): crosses the great river at a
  10-tile neck in sight of Amberford's walls, takes the northwest
  channel at its 6-tile narrows, then the long west miles to the gap
  between Spinewall and Kingswater.
- **First Road** ~500 tiles: fen-waist diagonal, river-gate arrival.
- **Salt Road**: crosses the FORD on its first league (the town's
  name, made literal), then the east-bank heath shelf, 3-tile channel
  neck at (714,228).
- **Timber Road** ~750 tiles: south bow around the Blackpine dread
  (886,-108 r72), then the isthmus neck between the Glasswater and
  the eastern tarn.
- **Sparway**: forks off the Timber Road and REJOINS it below the
  lakes (both endpoints on timber waypoints — the endpoint test knows
  the rejoin case now); crosses the river where it runs three tiles
  thin.
- **Hartway**: leaves Pinewatch's NORTH WICKET (the braid country
  seals every eastern approach — measured, not guessed), crosses the
  braid channel at its 3-tile neck, climbs the one dry corridor
  north, crosses the fell river below Hartfell.
- Evenway/Heartwood Walk/Old Road/Processional/Hunter's Trail/
  Hoargate Road/Cairn Path: same stories, new ground.

Authored wild sites all re-pinned beside their roads (distinct
macro-cells; every pinned site verified against the REAL compose scan
— `findAuthoredAnchor` — not just ground class: the Last Lamp sits at
(-264,-202), the tower at (368,-136), spine_digs went cell-mode
[-5,-4]).

## 5. TESTS + TOOLS

- Every seed-pinning test now imports `WORLD_SEED` (content geography
  + all 8 server world suites). geography.test: 20/20; content.test:
  64/64; worldgen.test: 21/21 (fen wetness re-proved on the new
  hearts); pois/finds/trails/holds/edgeHarmony green at time of
  writing (a neighbor session's danger-ladder + POI-defs re-banding
  was mid-flight in the shared tree — strongholds capital-sweep and
  the defs registry belong to that line).
- `previewPoi` now rings EVERY settled hearth (one hearth's ring can
  miss every cell center of a thin band — this seed proved it).
- Scratch tooling (session scratchpad, not shipped): `worldshot.ts`
  seed-atlas renderer (BMP, hillshade, grid, rect/route overlays),
  `geocheck.ts` desk-profiler, `seatcheck.ts` water auditor with
  ASCII maps — rebuild-worthy if a worldlab ever ships.

## 6. PROD ROLLOUT

DEPLOY.md §"THE GREAT WORLD REGEN": deploy, STOP, drop any stale
WORLD_SEED env line, `db:refresh --all --yes`, start. The seed and
the geography are ONE UNIT forever now.

## 7. DEBTS

- Pinewatch zone build: west gate opens onto authored lakefront
  (quay/boom rework), sparway/timber arrivals meet the south gate.
- Live walking tour of the new roads at close zoom (blocked at ship
  time by the neighbor session's defs WIP; desk validation was
  complete).
- Roadside decoration pass (the user's stated follow-up): the new
  long legs are ready for mechanics + interest along the way.
- Strongholds capital-sweep count under the worded march + wide
  constellation — joint look with the danger-ladder session.

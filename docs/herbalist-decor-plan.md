# THE HERBALIST'S SHELF — sill pots, the physic tub, and the harvest on the beam

The rustic give-back after THE FAIR LEAVES TOWN retired the manor
garden: three pieces that read WORKING, not ornamental, every one of
them growing or drying the game's OWN botany — sagewort (the healer's
silver-green leaf) and moonbell (the pale bells that glow after dusk)
are herbs the player picks wild, farms in rows, and now SEES the
herbalist living from. That closed loop is the immersion play: the
shop runs on the same plants the player's satchel carries.

## The three pieces

1. **SillHerbs — Detail 96 (band 96–111), 3 mixes.** The herbalist's
   sill: three little glazed pots standing ON the window's sill
   course, OUTSIDE the pane — painted by the window branch of the
   wall painter AFTER the glass and mullions, so the pots stand proud
   of the pane and the warm hearth-lit glass backlights them at
   night for free. Sinks and sheds with the wall (whole pass lives in
   the wall frame under the same `window` gate). GLAZED WARE NEVER
   BARE CLAY: pots deal from a three-glaze roster. Mixes:
   0 kitchen row (green mounds + chive spikes), 1 healer's row
   (sagewort + one moonbell), 2 seedling row (sprouts + a leggy sprig
   + a paper tag). Tallest sprig nods on breezeAt at a window-scale
   amplitude. Hosts: WINDOW WALLS ONLY (`SILL_HOST_TILES`) — the
   first detail family to live where the hangings law refused to go,
   through its own gate, never by loosening the old one.

2. **HerbPlanter — Tile 461.** The physic tub: a sawn half-cask
   (cooper's truth — staves, two smith hoops, damp tide-mark) planted
   in three WORKING rows with carved wooden row markers; one row
   harvested to stubble THIS MORNING, its tied bundle lying on the
   rim beside the iron snips (TENDED, NEVER LEFT). Differentiates
   from StreetPlanter at a glance: rows + markers + stubble vs
   ornamental blooms; herb greens + moonbell dusk-blue, never the
   GARDEN_DYES bloom triads. Clocked breeze nod (<4Hz, CACHED ring).
   Destructible 'herbplanter' (2 hits/300s): staves clap out, the wet
   soil goes DOWN, a green shower, the snips ping bright, and the
   tied bundle flies WHOLE.

3. **HerbBundles — Detail 112 (band 112–127), 3 mixes.** The harvest
   on the beam: a pegged batten across the wall face, three
   heads-down drying bundles + one seed-pod string, swaying on the
   banner's two-beat breeze law. Complementary to the freestanding
   HerbRack (the workshop STATION): this is the overflow harvest on
   the house wall. Mixes: 0 green harvest, 1 healer's mix
   (sagewort + moonbell), 2 seed strings. Hosts: the classic
   hangable full walls.

## Structure

- `wallHungInfo` stays the ONE reader: new kinds 'sill' + 'bundles'
  carry `mix`; WALL_HUNG_DETAILS derives the bake-skip for free.
- `hangHostTiles(detail)` is the new ONE host resolver: 'sill' →
  SILL_HOST_TILES, everything else → HANGABLE_WALL_TILES. Server
  hangFaceOk, both client previews, and the build lane all resolve
  through it — no second copy of the law.
- Buildables (the fair's give-back is player-ownable): herb_planter
  (farming L8 — you GROW it), sill_herbs + herb_bundles (decor lane,
  mix chosen at placement like the trellis species). Salvage rides
  DETAIL_DEF_ID. Rosters SILL_MIXES/BUNDLE_MIXES beside
  TRELLIS_SPECIES.
- Zero light entries, zero particles: night belongs to the LampPost;
  the life is in the breeze clocks and the fiction.

## Seats (restraint is curation — herbs are the HERBALIST'S voice)

- Amberford: Maera's lab (HerbRack at 83,34) — sill pots on her
  window, bundles on her wall, the tub at her door.
- Dawnmead: the forage house (rack at 73,57) — bundles + tub.
- Silverfall: herbalist_wyn's shop (144.5,85.3) — per its walls.
- Nowhere else in v1: a street of sill pots stops being a shop sign.

## As-built

- Ids as planned: HerbPlanter 461 (next free 462), SillHerbs 96–111,
  HerbBundles 112–127 (next detail band 128). hangHostTiles() is the
  one host resolver; hangFaceOk grew a detail param; both client
  previews read through the same gate.
- TWO PAINT PASSES (the fish law, again): pass one shipped pots at
  0.1s and bundle heads at 0.15s — live audit read them as sill noise
  and leaf ticks. Pass two: pots 0.16s+, bundle heads 0.22–0.28s with
  0.078s cheeks, tub r 0.32→0.38 with rim 0.5, rosette blades 1.6x,
  moonbell bells 0.022 with lit '#a6b4e8' crown bell, lit furrow
  crests, markers/snips/rim-bundle ~1.35x. VERDICT: a sill pot under
  this camera owns ~0.16s or it does not exist.
- Rig lane 15 (:8850/:5250, DB arx_herb15, vite.config.rig15.ts —
  checked in). Audit driver + probe in the session scratchpad
  (herb-audit.mjs pattern: register → mirror "Begin" → keyboard-only
  chat, 1200ms spacing → /time 10 pinned BEFORE day shots — the
  lane's game-day drifts). window.dcGame/dcRenderer are the page
  handles; smashProp proved the kit deterministically.
- Proven live: Amberford shopfront sills day+night, interior bundles
  over the jars and the lab, the garden tub beside the sagewort rows;
  Dawnmead cookhouse window + apron tub + over-bed bundles;
  Silverfall dispensary interior (window pots against the pane,
  bundles + seed string over the counter wall) + Greenstair terrace
  tub. Zero console errors on every pass.
- The worktree's server was mid-refactor by a neighbor (planes) both
  sessions; every gate and the live lane ran from a standalone
  HEAD+mine tree (archive + node_modules stitch, @arx symlinks
  pointed INTO the tree, *.tsbuildinfo deleted).

# THE FAIR HOUSE FURNISHED — elven decor kit (props 317-336)

The elves are the game's artisans: the folk who opened the door to
mithril, whose joinery is grown rather than nailed, whose towns must
read as centuries of patient craft the moment a player walks in. This
kit gives the world 20 bespoke elven props — furniture, lights, cloth,
stations, garden pieces — so an elven town can be dressed wall to wall
without borrowing a single goblin lashing or human plank.

Precedent rails: THE CAMP BARES ITS TEETH (props 297-316) — same
registration spine (tiles → destructibles → painters → debris →
legend/palette), opposite voice. Where the camp is crooked, sagging,
rope-bound and amber-lit, the fair house is swept, sprung, forked-grown
and moonlit. Every prop is judged against the war camp's version of
itself: if the two could be confused at night, the elven piece fails.

## The elven art language (the kit's own laws)

- **THE SWEPT LINE**: every silhouette carries at least one long clean
  bow (quadratic taper) — legs splay in arcs, posts rise in crescents,
  backs curl like unfurling fronds. Goblin work kinks and sags; elven
  work bows ONCE and holds. No straight structural member unless it is
  deliberately a counterpoint to a sweep.
- **GROWN, NEVER LASHED**: zero rope in the kit. Members meet in forked
  splits, silver ferrule collars, or vanish into each other like
  branches — the joinery story is "the wood agreed," told in fill-value
  facets per the BLOCK law (squared facets, one lit side, no rounded
  strokes).
- **THE MATERIAL TRINITY**: silverbark wood (pale warm-grey timber,
  `ELF_WOOD`), mithril (cool blue-silver, `ELF_MITHRIL`, always with a
  hard lit arris — metal is the one place a bright edge is earned), and
  moonglass (seafoam-to-ice translucency that carries the kit's light).
  Silks in moonpale blue-white and deep leaf green with woven silver
  thread. One warm accent only — `ELF_GOLD` thread/inlay — used small,
  so the kit stays cool against the camp's amber.
- **COOL LIGHT LAW**: every elven glow is silver-blue moonlight. The
  war camp owns orange fire; an elven window at night reads cold-bright.
  The Everflame itself burns silver-white.
- **DEVICE ROSTER**: crescent, seven-point star, willow leaf, vine
  scroll. These four motifs only, so banners, inlays and rune-marks
  read as one heraldry. (Content boundary: no occult vocabulary — these
  are moon-and-leaf, the shipped moonpale/wisplight voice.)
- **THE PRICE OF FINERY**: destructibles break FAST (silk tears, glass
  rings, turned legs snap — 1-2 hits for delicate pieces) but stone and
  mithril stand long (3-4 hits). Debris must sell the material: pale
  splinters + silk scraps + glass glitter, never the camp's brown
  wreckage.

## The roster (ids 317-336)

| # | Tile | What it is | Hits | Light | Motion |
|---|------|-----------|------|-------|--------|
| 317 | ElvenLantern | Crook-stemmed standing lamp, moonglass globe in a mithril cage | 1 | r5 cool | globe breath-pulse |
| 318 | ElvenBanner | Tall standard: crescent-and-leaf device on moonpale silk, swallowtail drop | 2 | — | silk on breezeAt |
| 319 | ElvenBench | Crescent garden bench, swept legs, vine-scroll armrests | 2 | — | — |
| 320 | ElvenTable | Low oval feast table, leaf-vein mithril inlay across the top plane | 2 | — | inlay glint walk |
| 321 | ElvenChair | High-back frond chair, back curls like an unfurling fern | 2 | — | — |
| 322 | ElvenDaybed | Canopied daybed: silk drape from a bowed cane, longer than the body (BODY-RULER) | 2 | — | drape on breezeAt |
| 323 | ElvenBookcase | Tall arched case, scroll pigeonholes + tomes, foreshortened top plane | 3 | — | — |
| 324 | ElvenLectern | Swept reading stand, open tome, one drifting page | 1 | — | page lift |
| 325 | ElvenHarp | Standing pedal harp, mithril strings | 2 | — | string glint walk |
| 326 | ElvenLoom | Weaving frame with moonpale cloth half-woven, weighted warp threads | 2 | — | hanging weights sway |
| 327 | ElvenFountain | Singing bowl fountain: three tiers, animated fall threads + rings | 4 | — | water (t-driven) |
| 328 | ElvenStatue | Marble warden holding a leaf-blade point-down, moss at the plinth | 4 | — | — |
| 329 | Moonwell | Low stone basin of lit water, mist wisps off the surface | 3 | r4 soft | surface shimmer + wisps |
| 330 | Everflame | The hall's silver-white flame in a mithril basin — NEVER destructible (a flame this old is not put out by a stick; Bonfire law) | — | r6 anchor | flame cadence |
| 331 | MithrilAnvil | Elven smithing station: swept-horn mithril anvil on a carved stone root | 4 | — | cooling-spark pop |
| 332 | ElvenArmsRack | Display rack: two curved blades + a longbow on silver pegs — a gallery, not a pile | 2 | — | — |
| 333 | ElvenPlanter | Carved urn planter, silverleaf blooms + one trailing vine | 1 | — | vine tip flutter |
| 334 | ElvenMirror | Standing oval mirror in a vine-scroll frame | 1 | — | glint sweep |
| 335 | ElvenWaystone | Runed mithril-veined waystone, script band glows faint | 4 | r3 faint | rune pulse |
| 336 | ElvenChimes | Chime tree: curved stand, five mithril tubes + a moonglass drop | 1 | — | tubes on breezeAt, per-tube phase |

Category coverage: seating ×2, tables ×1, bed ×1, casework ×2, craft
stations ×3 (loom, anvil, lectern-as-study), instruments ×2 (harp,
chimes), lights ×3, cloth ×2 (banner, daybed drape), garden/street ×5
(fountain, statue, moonwell, planter, waystone), display ×2 (arms rack,
mirror). Small/medium/large scales all represented; the fountain,
statue, banner and bookcase are the landmark-weight pieces.

## Registration spine (the war-camp checklist, re-walked)

1. shared tiles.ts: enum 317-336 + doc comments, TILE_DEFS (raised,
   topColor = minimap voice), sub-collider sizes, DESTRUCTIBLE_INFO
   rows (Everflame absent — the fire law), light-blocking: none (all
   slim or low).
2. renderer.ts: `ELF_*` palette constants beside PALI_*; 20 objectItem
   cases; all 20 in CACHED_RING_TILES, still pieces also in
   STATIC_RING_TILES; collectStaticLights for lantern/everflame/
   moonwell/waystone (cool colors); terrain underlay id-range widened
   to 317-336 (nearestFloor).
3. debris.ts: SmashKinds + kits — pale silverbark splinters, silk
   scraps, moonglass glitter, marble chunks, mithril rings.
4. main.ts: smash feel — chimes/harp ring bright when broken (the one
   time destruction is musical), glass pieces tink.
5. content prefabs legend chars + Studio palette category 'elven'.
6. Live audit: character-beside-prop (BODY-RULER), tops visible
   (2.5D TOP-PLANE), night frame vs signpost/lamp (ONE RING cohesion),
   war-camp-confusion check.

## As-built ledger (2026-08-14, shipped in one pass + one polish round)

- **Shared** (tiles.ts): enum 317-336 with doc comments; TILE_DEFS
  minimap voice (silver-green vs the camp's mud-brown); collider radii
  for the fine-limbed 15 (bulk furniture full-block like its human
  cousins; radius ≥0.25 ⇒ sight cover, chosen deliberately);
  DestructibleKind +19; DESTRUCTIBLE_INFO rows (Everflame absent —
  the bonfire law, pinned in the not-smashable test); tiles.test.ts
  expect-table extended. 215 shared tests green.
- **Renderer**: ELF_* palette constants beside PALI_* (ELF_VEIN =
  mithril's canonical #7fa8d9); 20 bespoke objectItem cases under the
  THE FAIR HOUSE FURNISHED section banner; all 20 in
  CACHED_RING_TILES (every animated term <4Hz — moonlight breathes,
  never flickers), the 5 clock-free statics also in STATIC_RING_TILES
  (bench/chair/bookcase/statue/armsrack); collectStaticLights: lantern
  r5 / Everflame r6 night-anchor / Moonwell r4 non-occluding /
  waystone r2.2 faint — ALL cool blue-green, ungated by the flame
  clock; SMASH_TONES: silverbark/marble/mithril-glass dust groups so
  elven cracks never cough amber.
- **terrain.ts**: underlay id-range branch 317-336 (nearestFloor).
- **debris.ts**: SmashKind +19, CHIP_TONE rows, 19 bespoke kits
  (pages fly furthest; marble drops dead-weight; mirror glass is the
  fastest debris in the kit; chime tubes ring away).
- **main.ts**: harp + chimes join the hollow-boom family (breaking
  one is the loudest note it ever plays); statue/fountain/waystone/
  anvil join the heavy street-shake.
- **palette.ts**: Studio category 'elven' (lights + cloth first).
  Prefab legend chars deliberately deferred — ASCII is exhausted and
  no elven POI sketches exist yet; zone builders use Tile.* directly.
- **Live audit** (rig lane 8, vite.config.rig8.ts, isolated server
  :8802 / client :5185, DB arx_elfprove — torn down after): all 20
  stamped beside the body, day + night, vs signpost/lamp/spear-rack.
  Verdicts and fixes from the polish round:
  - THE SILVERBARK VALUE KEY: bench v1 read camp-dark at map scale —
    the whole piece must sit PALE (legs -8/+8, seat +32). If a piece
    could be mistaken for camp joinery at distance, it fails.
  - THE SILHOUETTE PAIR RULE (chair): "wide triangle" read as a tent;
    the fix was a SLENDER splat + real crozier coil with a punched
    spiral eye — at map scale the eye gets two shapes only, so pick
    the two that say the right thing.
  - THE DISPLAY MUST READ (arms rack): v1 weapons were hairlines and
    the rack read as an empty ladder; display pieces need MASS (dark
    seat shadow under the blade, painted lit facet, bow pulled clear
    of the frame).
  - Waystone veins widened to 0.024s — road-legible.
  - Night frame: three cool pools (lantern/moonwell/Everflame) beside
    the amber lamp post — the COOL LIGHT LAW is visible in one frame.
- **Rig lessons**: the Hero's Mirror no longer auto-accepts — click
  "Begin your story"; gate on `#login` overlay actually hiding (the
  __arx handle exists pre-login and lies); /settile stamps can DROP
  under chat-rate pressure — verify every slot with groundAt before
  shooting (one dropped banner cost a diagnostic round);
  camera.targetZoom needs the set-verify-retry loop.

Deferred (deliberate): prefab legend chars (no elven sketches yet);
dungeon dress/PLACED_PROP_TILES (no elven dungeon theme yet); POI
POST_SIGNS rows (no elven town yet — the first elven zone should seat
NPCs at the harp, loom, anvil, and lectern).

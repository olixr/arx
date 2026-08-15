# THE TOWN KEEPS ITS DAY — the town-life decor kit (2026-08-15)

## Why

The prop census over every authored town reads monotone: Crate ×127,
Brazier ×121, Barrel ×112, Bench ×110, LampPost ×108 carry whole
streets between them. Meanwhile the HUMAN towns — the places that
raise, feed, and bank every player — own **no fountain, no statue, no
notice board, no cart, no laundry, no hitching post**. The elves got
a singing fountain (327), the swallowed kingdom got its mossy king
(358); the living towns got neither.

## The kit's voice: TENDED, NEVER LEFT

The deliberate inversion of the dungeon shelf. Down there, everything
was LEFT — cold ash, sprung staves, a cart mid-shift. Up here,
everything is KEPT: the fountain runs because someone dredges it, the
notices are fresh because someone pins them, the woodpile is ranked
because winter is real, the statue wears a wreath because somebody
still remembers. Work mid-shift, goods in motion, civic pride
polished. If a piece could read as abandoned, it fails the kit.

## Roster — fourteen pieces, ids 391–404 (next free: 405)

| id | Tile | read | anim | hits | kind |
|----|------|------|------|------|------|
| 391 | TownFountain | two-tier plaza fountain, four falls, wish-coins | water <4Hz | 4 | townfountain |
| 392 | FounderStatue | bronze founder on stone plinth, verdigris, laid wreath | static | 4 | founder |
| 393 | NoticeBoard | posted board under a shingle cap, pinned bills | one bill lifts | 2 | notices |
| 394 | TownBell | timber bell-frame, bronze bell, pull rope | rope sway | 3 | townbell |
| 395 | HandCart | two-wheel barrow at rest on its legs, loaded | static | 2 | handcart |
| 396 | GrainSacks | plump tied sacks, one open with the scoop in it | static | 1 | grainsacks |
| 397 | BarrelStack | two casks chocked on their sides, one standing on top | static | 2 | barrelstack |
| 398 | CrateStack | two-high crates, top lid ajar, straw + stencil | static | 2 | cratestack |
| 399 | PennantLine | dyed pennants + swallowtail banner on a swagged line | breeze <4Hz | 1 | pennantline |
| 400 | HitchingPost | worn rail, iron rings, tied lead, hay wisps | static | 2 | hitchpost |
| 401 | Woodpile | ranked cordwood between stakes + chopping block, axe standing | static | 1 | woodpile |
| 402 | StreetPlanter | half-barrel planter spilling blooms + trailing ivy | static | 1 | streetplanter |
| 403 | StoneBench | carved civic bench on scroll feet | static | 3 | stonebench |
| 404 | ProduceStand | tiered grocer's display, baskets tilted at the camera | static | 2 | produce |

Design intent per piece:

- **TownFountain** — the plaza's heart and the kit's anchor. Warm
  town limestone (NEVER elven marble, NEVER dungeon gray): a wide
  ground basin the camera sees INTO (the basket law), a carved stem,
  a small upper bowl, four thin falls, drift rings on the pool, and
  two coin glints on the basin floor — people wish here. Wet stains
  darken the rim under each fall.
- **FounderStatue** — a NEW material story: bronze gone green.
  Sword-point-down warden on a squared plinth (the elven marble
  warden's civic cousin, the ancient king's living opposite), streaks
  of verdigris running from the shoulders, a laid flower wreath at
  the plinth foot proving the town still tends its past.
- **NoticeBoard** — the RPG town's voice. Two oak posts, a shingled
  rain cap with a foreshortened top plane, a board layered in pinned
  bills (torn corners, one seal, one sketch) — the newest bill lifts
  at its corner on the breeze clock.
- **TownBell** — the tall civic timber: an A-braced frame two men
  high, the bronze bell hung under its own little roof, pull rope
  swaying. Breaking it is the loudest note it ever plays (boom).
- **HandCart** — commerce in motion, parked: big spoked wheel proud
  of the bed (the mine cart's TRACK-READS-AS-TRACK lesson: wheels
  must read), shafts down to the ground, load of sacks + one crate.
- **GrainSacks** — the town's clean answer to PlunderSacks: plump,
  TIED, upright on a low skid pallet (grain never sits on wet
  ground) — kept stores, not loot. The proudest sack wears the
  mill's stenciled wheat-sheaf mark; one open sack shows grain with
  the wooden scoop lying mouth-open in the heap.
- **BarrelStack / CrateStack** — variations for the two most
  over-dealt props in the game. The stack law: side casks show round
  END GRAIN hoops (the 3D argument), chocks stop the roll; crates
  stagger, top lid ajar with straw and a stencil mark.
- **PennantLine** (REWORKED from WashLine, 2026-08-15 — hanging
  laundry is not this universe's voice; festival colors are) — two
  turned poles with bronze ball finials leaning a hair out under the
  line's pull, one true catenary, SIX pennants + the center
  swallowtail banner all hash-dealt from the awning dye roster
  (stride-3: neighbors never share a hue family), ribbon streamers
  off both finials, the spare line COILED at the west pole's foot.
  Cloth snaps on the shared breeze cadence — livelier than laundry
  ever hung: a pennant exists to move.
- **HitchingPost** — the mounts epic's street furniture: a chewed
  rail on two posts, two iron rings, one tied lead rope, hay wisps
  and hoof-churn at the base.
- **Woodpile** — ranked splits between stakes showing round end
  grain, the chopping block beside with the axe LEFT STANDING in it
  (mid-chore, not abandoned — the woodpile is ranked).
- **StreetPlanter** — the half-barrel repurposed: town color at door
  scale, blooms + one trailing vine, damp soil line.
- **StoneBench** — the civic cousin of the 110 wooden benches:
  carved seat slab on scroll feet, knee-high per the body ruler,
  worn hollows where people actually sit.
- **ProduceStand** — the market stall's little cousin for street
  grocers: two tiered planks tilted toward the camera (top-plane
  law), baskets of apples, cabbages, pumpkins from the farm palette,
  a hanging balance scale.

## Laws this kit answers

- **BODY RULER + TOP PLANE** on every piece (character-beside-prop
  audit, tops foreshortened ~syT*0.32).
- **KIT VALUE LAW**: every piece a full value step off StoneFloor
  street, Path, and Grass — towns stand on all three.
- **NIGHT HIERARCHY HOLDS**: zero light entries. The LampPost owns
  the town night; nothing here glows (craftsmen-shelf precedent).
- **ONE UNIVERSE**: town timber breaks in the joinery amber the
  Barrel/Crate already cough; the NEW smash voices are limestone
  (fountain/bench), bronze (founder/bell — the bell BOOMS), cloth
  (washline), grain (sacks), produce.
- **CACHED RING**: all fourteen ride the ring cache; ten clock-free
  statics idle in STATIC_RING_TILES; the four animated pieces keep
  every term <4Hz (fountain water, bill flutter, rope sway, breeze).
- **RESONANT BREAK LAW**: townbell + barrelstack join the hollow-boom
  list; townfountain + founder join the heavy-shake list.
- Deferred on purpose: examine lines, quest-board interactivity, and
  town-zone dressing passes (the towns get this shelf via Studio +
  future authored passes, the elven-kit precedent).

## As-built ledger (SHIPPED 2026-08-15, cb5229f4)

Everything in the spec shipped as written; ids 391-404, next free 405.
Wired end to end: enum + TILE_DEFS + brush-past colliders +
DESTRUCTIBLE_INFO (all fourteen pinned in tiles.test.ts), TWN_*
palette + fourteen painters before `case Tile.Table`, ring-cache
membership (four clocked <4Hz, ten in STATIC_RING_TILES), SMASH_TONES
(limestone / bronze / grain / laundry / paper / produce voices),
fourteen debris kits, resonant booms (townbell, barrelstack) + civic
3.2 shakes (townfountain, founder, stonebench), terrain underlay
range, Studio 'Town life' shelf.

### Audit verdicts (two paint passes, rig lane 9 at Dawnmead's hem)

- **THE FOUNTAIN MUST ANCHOR** — pass 1 read as a birdbath beside
  the ruler. Basin/stem/bowl grew a third; the crown clears head
  height. A civic anchor outweighs the body.
- **THE BELL IS THE READ** — pass 1's frame read as a bare ladder at
  map scale. The bell doubled, the roof widened and thickened; the
  frame exists to hold the bell.
- **A LEAD COILS, NEVER LOOPS** — the hanging rope loop under the
  hitch rail read as a GALLOWS NOOSE. Killed: the lead now wraps the
  rail in three snug turns with a short frayed tail.
- **A CASK LIES ON ITS BELLY** — head-on end circles alone read as
  three standing lumps; the side casks now show their long bulged
  lying bodies with horizontal staves and upright hoops.
- **BRONZE IS NOT SANDSTONE** — the founder read tan against his own
  plinth; metal darkened two steps, verdigris doubled.
- Passed clean on pass 1: NoticeBoard, Woodpile (the end-grain rank
  is the instant 3D read), CrateStack, StoneBench, StreetPlanter,
  GrainSacks, WashLine, ProduceStand.
- **Night hierarchy proven**: the wide night shot shows the whole
  square dark while the village lamps and windows glow — not one kit
  piece emits light.
- **Smash theatre proven**: the grain-sack burst caught mid-pour
  (burlap folds, flipping scoop, gold kernels); bell smashed in
  exactly 3 hits, tile patched, respawn lane armed.

### Rig lessons banked

- The prover logs out ANYWHERE — an absolute-coordinate stage anchor
  with tp-verify retries beats spawn-relative offsets (the first run
  staged inside the Undercroft; the second died to a L16 black bear
  at the forest hem and got hearth-carried mid-run, scattering
  stamps).
- Frame close-ups from the SE diagonal: a body standing due south
  eclipses a tall prop's whole stem.
- Dawnmead's "open" north meadow holds the farmstead cabin — its
  roof overdraws anything staged at y≈80-84 west of x≈-55.
- Debris shots must fire INSIDE the burst window (no settle sleep);
  three swing cycles plus a settle wait outlives the theatre.

### Rework pass (2026-08-15, user round two — crops, quality, and the laundry verdict)

Three pieces went back to the bench after the user's live read:

- **THE BOUNDS ARE THE CANVAS** (the crop bug both broken props
  shared): `stationBody(hw, up, down)` is not just the outline
  rect — it sizes the bake scratch region, and art painted past it
  is hard-clipped at the cell edge. Woodpile declared hw 0.62 while
  its block + standing axe reached ~0.75 (axe sheared off mid-haft);
  GrainSacks declared 0.55 and painted sacks to ~0.67 (flat clip
  down the west sack). Every wide painter must derive its body from
  its true painted extent, with margin.
- **Woodpile rebuilt**: four hex-packed courses (every course offset
  half a pitch — the pile reads STACKED, not floated), bark ring +
  pale face + off-center growth ring + radial check cracks per
  round, split half-moons with chord grain, the odd pale birch round
  with lenticel ticks, outward-raked chamfered stakes, one split
  pulled and leaning (mid-chore), the block grown a rank (bark
  checks, scarred bright top, one dark wedge bite where every swing
  lands), the axe re-forged (poll + bearded bit, crisp edge light),
  a fresh split fallen at the block's foot, bark-chip litter.
- **GrainSacks rebuilt**: sacks became plump gourds (belly, shoulder,
  rope-whipped neck, soft ears) with stitched center seams, lit and
  shaded flanks, base creases; the proud front sack wears the mill's
  stenciled wheat-sheaf mark; all of it stands on a LOW SKID PALLET
  with ground showing between the feet and straw drifted against
  them (a board floating on a shadow reads SHELF — feet on dirt read
  pallet). **A SCOOP IS A VESSEL, NOT A BLADE**: the first iron pan
  + raked handle read as a hatchet buried in the sack at map scale
  (the ButcherBlock's cleaver two doors down already owns that
  silhouette) — now a pale carved wooden scoop lying half-sunk,
  open mouth toward the street (dark hollow + bright lip is the
  read), iron only at the ferrule.
- **WashLine → PennantLine (id 399 kept, world saves unbroken)**:
  the user retired hanging laundry from the universe's voice —
  festival colors replace chores-on-a-line. Full rename across enum,
  defs, destructible kind, debris kit (pennants FLY, rope tail falls
  last), smash tones, palette shelf, and the three Dawnmead seats.
- **A LINE PROP NEEDS CLEAR AIR** (placement law, minted at Wren's
  garden): a horizontal two-pole line is ~1.3 tiles wide — stamped
  in a one-tile strip beside a wall column, the wall's tall paint
  swallows an end pole. Both cramped seats moved (cottage line to
  the porch front facing the stones; inn line one tile off the west
  wall); the farmstead gable seat already breathed.
- Proven live on an isolated :8813/:5202 frozen-lane rig, fresh DB:
  noon close-ups of all three pieces at all Dawnmead seats, night
  wide (zero glow — the lamps keep the dark), page-error trap clean
  (no unsigned-hash regressions), body-ruler checks beside the
  prover.

### Deferred on purpose

Examine lines, a quest-board interaction lane for the NoticeBoard,
town-zone dressing passes (the towns get this shelf via Studio and a
future authored pass — the elven-kit precedent), and POI prefab
legend chars.

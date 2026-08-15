# THE BANKS GET THEIR GOODS — the skral shore-camp kit

Twelve pieces of waterside dressing, tile ids 369-380, for the camps
of the brine-folk (docs/skral-plan.md, THE BANKS GET THEIR PEOPLE).
The skral epic gave the banks a people and three camps that dress in
borrowed war-camp litter — meat racks, skull totems, hide tents. This
kit gives the shoals their own goods, and the camps hand the goblin
gear back.

## The kit's voice — FOUND, NEVER FELLED

The war camp's voice is hewn timber and rope: an axe was here. The
skral voice is the opposite law: **everything the skral own came off
the bank or out of the water.** Driftwood silvered by salt — never a
saw-cut end, always a water-worn knob or a snapped point. Lashings are
kelp-cord and gut, green-dark and glistening, never the camp's brown
rope. Bone, shell, woven withy, netting. Iron never (the SLICK lane's
people never learned the forge). And every piece is WET where it meets
the ground: a dark waterline, a puddle glint, a ring of damp sand —
the tide is always just behind them.

Accent palette rides the race's own water clusters (skral.ts): the
tide-green/brine-blue banners fly again on the totem and the racks —
a camp sorts by banner the way a shoal does.

### Materials (SKR_* in renderer.ts)

- Driftwood: `#8d8672` body / `#b5ad94` sun-bleached lit / `#5e5949`
  waterline dark — a full value family off both the camp's brown and
  the elven silverbark warm.
- Kelp-cord: `#3f5c48` / lit `#5a7a5c` — the lashing color IS the
  joinery story.
- Wet fish silver: `#b8c4c6` back `#4a5a5e` / belly `#dde6e2`.
- Withy wicker: `#a08b58` / `#c2ab6e` (drier than driftwood — woven
  goods came from the reed bank, not the surf).
- Old bone: reuse DGN_BONE `#cfc7ae` / dim `#b5ac91` (one bone truth
  game-wide).
- Brine glow: `#7fd8c8` (the glowshroom's teal family, shifted a step
  green — bioluminescence, never flame).
- Coral: `#c98a74` / lit `#e8ab8a` — the altar's one warm note.

## The twelve

| id | Tile | read | hits |
|----|------|------|------|
| 369 | FishRack | the catch drying head-down on lashed rails | 1 |
| 370 | TideTotem | fish-skull idol flying a fin banner | 3 |
| 371 | NetFrame | hung net, floats, one mended tear | 1 |
| 372 | Dugout | beached canoe, lies E-W, hash deals upturned | 3 |
| 373 | HarpoonRack | bone-tipped harpoons on a jaw-bone stand | 2 |
| 374 | ShellMidden | the refuse mound that names the camp | 1 |
| 375 | FishTrap | woven funnel creel showing its dark mouth | 1 |
| 376 | RoeNest | glistening clutch in a kelp ring | 1 |
| 377 | LurePole | caged deep-jelly on a bowed pole — the night light | 2 |
| 378 | TideAltar | wave-worn slab the coral is taking back | NEVER |
| 379 | CatchBasket | creels brimming silver, one spilling | 1 |
| 380 | WhaleRibs | a sea-beast's ribcage the camp moved in under | 4 |

Per-piece design law:

- **FishRack (369)** — two X-lashed driftwood shear-legs, two rails,
  five split fish hung head-down: pale bellies out, dark back stripe,
  forked tails; the hash deals one fish gull-picked to a rib comb.
  The prop that says LARDER at map scale. Static.
- **TideTotem (370)** — a driven driftwood post with a barnacle
  collar at its old waterline, crowned by a great fish skull whose
  eye sockets hold pale shell inlays (the lantern-eye read, in prop
  form), strung with shell strings; a fin-membrane banner in the
  water-cluster accent flies from a cross-spar and SWAYS (<4Hz).
  The camp's `?` skull totem, answered in brine.
- **NetFrame (371)** — a knotted diamond mesh hung between two lashed
  posts, cork floats riding the head-rope, the hem dragging sand; one
  torn hole MENDED in a paler cord (nets are wealth — somebody sat
  and fixed it), one dried starfish caught forever. Static.
- **Dugout (372)** — the hull LIES long-axis E-W (a canoe lies like a
  coffin lies); open hulls show the hollow's dark inner wall, a
  bench-thwart, a leaning paddle, and a foreshortened gunwale top
  plane; the hash turns some turtle — keel up, showing a lashed hide
  patch. Wet drag-furrow and bow puddle tie it to the bank. Static.
- **HarpoonRack (373)** — an A-frame of two rib-bones lashed at the
  crown, three harpoons leaning points-up: dark seat shadow behind,
  one lit facet per bone point (THE DISPLAY MUST READ), one shaft
  fallen at the feet. Static.
- **ShellMidden (374)** — a low mound of cracked fans, spirals, and
  mussel-dark chips over a fishbone comb or two; hash deals three
  sizes (the BonePile law); the crown keeps a wet sheen. Static.
- **FishTrap (375)** — a funnel creel of hooped withies lying on its
  side, mouth toward the camera: the dark round MOUTH is the 3D
  argument (nothing painted flat has an end); a stray silver tail
  pokes out; a second small trap leans on the first. Static.
- **RoeNest (376)** — a scraped hollow ringed in kelp holding a
  clutch of glistening roe-domes, teal-pale with one specular tick
  each; the biggest few carry a dark eye-dot; one hatched husk sits
  empty. Painted wet gleam only — NO light entry (the night
  hierarchy stays: one street light, one shrine). Static.
- **LurePole (377)** — the camp's night anchor: a bowed driftwood
  pole leaning over the path, a woven bone-withe cage swinging on a
  gut line, and inside it a captured deep-jelly — soft teal dome,
  trailing tendrils below the cage floor, drifting slow. Light:
  brine-teal, glowshroom law (slow swell, never flicker, no flame
  gate), street-light reach r3.6. <4Hz clocked.
- **TideAltar (378)** — a wave-worn slab on stacked stones; coral
  fingers have grown OVER one end (the sea is taking it back); the
  top plane carries the offerings — pearls, a laid-out fish, shell
  ring; wet dark ring at the feet. Faint cool shimmer light r2.2.
  **NEVER destructible — the tide keeps its own** (the bonfire law
  reaching the water). <4Hz glint cycle.
- **CatchBasket (379)** — two upright creels brimming, tails over the
  rims; a third tipped, its run of silver spilling toward the viewer
  on a wet trickle. The camp's plunder-sacks, answered. Static.
- **WhaleRibs (380)** — the landmark: five ribs of some ancestor of
  the deepking's hunts arching from the ground in two depth ranks
  (far rank thinner and dimmer), bleached crowns, barnacled roots,
  one rib snapped showing pale end-grain; the skral strung shells
  between two ribs — the camp moved in UNDER it. Tall as the grand
  pillar's class. 4 hits — old bone holds.

## Wiring (the dungeon-kit rails, verbatim)

- shared tiles.ts: enum 369-380, TILE_DEFS minimap voice (every piece
  a full value step off sand, trampled dirt, AND meadow grass — the
  three grounds a shore camp stands on), TILE_COLLIDER_RADIUS
  brush-past radii, 11 DESTRUCTIBLE_INFO rows + TideAltar pinned
  never-smashable in tiles.test.ts.
- renderer.ts: SKR_* palette block; 12 painters before `case
  Tile.Table`; all 12 CACHED_RING_TILES, the 9 clock-free ones
  STATIC_RING_TILES; LurePole + TideAltar in collectStaticLights
  (both breathing teal/cool, ungated by flame — bioluminescence law);
  SMASH_TONES material groups.
- debris.ts: 11 SmashKinds + bespoke kits (the jelly slumps dead and
  dim; the catch ESCAPES as a spray of silver; shells scatter light
  and near; ribs fall torso-weight; the paddle leaves last).
- main.ts: dugout booms (a hull is a drum); greatribs shake heavy.
- terrain.ts: underlay range FishRack..WhaleRibs → nearestFloor.
- palette.ts: Studio shelf 'skral' / "Shore camp".
- influence.ts: the skral litter row hands back the goblin gear —
  litter [ShellMidden, FishRack, FishTrap], pocket [NetFrame,
  FishRack, ShellMidden].
- prefabs.ts: sketch() grows an optional per-sketch legend extension
  (global ASCII is exhausted since Kingsdelf); the three skral camps
  re-voice their OWN existing marks locally — ')' rack, '?' totem,
  '`' net, '^' dugout, '{' trap, 'o' midden, '-' catch, '0' roe,
  '!' lure, '&' altar, '>' harpoons, '"' ribs — and the seeded
  poi_skral_*.json regenerate.

## As-built ledger

**SHIPPED 2026-08-15, 46d42efc, one session, two audit passes on rig
lane 10** (vite.config.rig10.ts, client :5188 → server :8806).
Standalone tree proved whole: 217 shared / 506 content / 579 client /
490 server + clean client tsc, gated on a HEAD+mine twin while two
peer changesets (THE LONG DARK PEOPLED, Amberford) flew beside it.

Audit verdicts that reshaped the kit (pass 1 → pass 2):
- **THE RIBS ARE CRESCENTS, NEVER A TEEPEE**: pass-one ribs were
  straight tapers converging at one apex — the monument read as a
  spike-tent at every zoom. The rebuild: root stands near-vertical,
  belly bows OUTWARD, worn tip hooks back over the hollow, tips never
  meet; two ranks with the far three dimmer AND rooted a half-step
  north; the shell string strung AFTER the near ribs so the camp's
  claim reads in front of the ancestor.
- **FISH READ AS FISH**: five narrow tubes read as hanging gourds —
  now four bigger leaf bodies, real forked tails, hard belly/back
  two-tone split.
- **A PALE BANNER ON A BONE SKULL VANISHES**: the fourth water-accent
  swapped bone-pale → the deepking's crimson; the membrane grew, took
  ink, and kept its rays.
- **SHELL STRINGS HANG, NEVER SPLAY**: pass-one catenaries falling
  wide off the totem spar read as skeleton arms.
- **A MIDDEN IS A MOUND, NOT A PEBBLE**: mass up, satellite spill
  added, shells scaled to read.
- **A DARK PIT IS A HOLE IN THE BANK**: the roe hollow lifted to
  mid-tone; the floating-shade lesson arriving by water.
- Proven live: night pools (lure r3.6 teal occluding + altar r2.2
  cool), smash-to-debris-to-patch with sword in hand (the catch flew
  silver, the staves fell gray — never camp brown).

Placement notes: the world regen between passes wiped /settile stamps
(the chunk-flush law) — pass 2 re-verified and re-stamped before
shooting. Equip lever for smash proofs: `__arx.game.useSlot(slot)`
after `/give` (inventory slots carry `item`, not `id`).

Deliberate debts: no wilds "find" entries (camps + Studio only); no
dress.ts lane (shore camps are prefab-dressed, not procedurally
dressed); shore POI count unchanged (the three prefabs re-voiced in
place); midden reads quiet at far map scale beside the monuments —
acceptable, revisit only if flagged.

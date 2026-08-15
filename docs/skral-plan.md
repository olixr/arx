# THE SKRAL — the brine-folk arrive (fish-folk race + THE BRINE DIALECT)

The watersides get their people. The skral are croaking fish-headed
waders — kuo-toa/murloc energy under an original name — who net the
banks by day and march as a shoal by night. They give the shorelines a
society the way goblins gave the meadows one: a rank-and-file you meet
at 8, a caster band in the teens, a named king at the camp's heart, and
a camp POI that can only ever stand where the water really is.

## 1. The race

**skral** (n., pl. skral) — brine-folk. Fish-headed, wall-eyed, webbed.
They speak in croaks and keep their courage in the shoal (pack + craven:
poke one and it bolts for its fellows, dragging the bank down on you —
the murloc experience, done with systems the game already owns).

Society: **shoals**. They build weir-camps on the bank: reed lean-tos,
drying racks heavy with the catch, shell middens. They do build (unlike
gnolls) but only in bank-stuff — nothing quarried, everything lashed.

Not tameable (sapient-folk law, per goblin/gnoll).

## 2. The four reads (owned by no other body)

1. **THE CREST** — a spined sail from brow to nape, SIMULATED (EarSim
   pair at tight spread, bespoke ray-and-membrane painter). It breathes
   with the walk, FLARES on the strike, and lies flopped on the corpse.
   No other body owns a fin.
2. **THE LANTERN EYES** — huge pale lateral eyes high on the skull.
   Eyes are effectively always visible (the crab eye doctrine): the
   near eye reads at every band; both bulge at the bow.
3. **THE GAPE** — an underslung needle grin WIDER than the skull.
   MOUTH IS A CUT (the turtle law): lip band + long dark seam + tooth
   ticks riding the cut; the gape opens on the strike clock. Barbels at
   the jaw corners; three gill seams under the jaw.
4. **THE WEB-FOOTED HUNCH** — the deepest crouch in the game: no neck,
   skull sunk into the shoulders, long low arms with webbed three-digit
   hands, and splayed webbed fan feet (the murloc footprint).

## 3. Roster + ladder seat

Between the goblin band (5-7/14-15) and the crab (18); gnoll 13 stays
the inland teen. Shore tiers 2-6 so the skral own the mid banks the
crabs bracket ([1,3] mudcrab below, [3,7] giant crab beside).

| id | name | L | hp | dmg | notes |
|---|---|---|---|---|---|
| skral | Skral | 8 | 24 | 3 | pack 'skral', craven, aggro 5, sightArc 260 (wall-eyed), speed 3.4 |
| skral_harpooner | Skral harpooner | 10 | 22 | 3 | ranged bone-dart {range 6, speed 10} |
| skral_tidecaller | Skral tidecaller | 12 | 30 | 3 | standoff 5.5, kit tide_lash + riptide_ring, ranged brine spit |
| skral_champion | Skral deepking | 17 | 88 | 5 | attackStatus chill 1/50 (the cold grip), kit shoal_call, sightArc 300, painted coral-barb trident (dialect-owned, ogre-club precedent — no equip item) |

Statuses race-wide: **resist chill / weak shock** (cold-water natives;
the storm finds the wet). Lane: **SLICK = {resist archery, weak arx}**
— slick hide sheds shafts, the working bites the wet (new constant in
npcLanes.ts, own row per id).

XP at the ~3.5-4.0×hp band the ladder already speaks.

## 4. Arts (full contract each: def + FX face + icon + breath dialect)

- **tide_lash** — tidecaller primary: a whip-crack of thrown brine.
  projectile_fan 1, dmg 4, speed 11, range 8, element frost, chill 1/40.
- **riptide_ring** — tidecaller stake, aim 'lead': the undertow marked
  on the ground. ground_aoe r2.2, dmg 5, fuse 22, chill 2/50.
- **shoal_call** — THE CROAK, the deepking's special: the gurgling
  war-chorus that calls the shoal. ground_aoe self r3.2, dmg 4, fuse 18,
  **rally** (the fight is the camp, aquatic verse). Bespoke FOES_SIG:
  croak rings stuttering in gurgle pairs (the cackle precedent), brine
  droplets, fin-flare answer on the rim.

Telegraph premium honored: nothing outdamages the basic die without
buying windup on the kit entry.

## 5. Loot

- Items: **skral_frill** (fin-membrane trophy), **deepking_pearl**
  (champion trophy, the pale eye of the deep made jewelry).
- Tables: `skral` (pocket change + **raw_trout** — they carry their
  catch, the loot-story writing itself + skral_frill 0.1),
  `skral_champion` (rarityBonus 3, deepking_pearl, frill). Casters ride
  `heirlooms` like the goblin casters. Champion joins the NAMED flood
  tier in loot.test.ts.

## 6. Wilds (the shore roster grows a people)

- `skral` w2 [2,5] shore band [2,4] spread 2 — bank shoals, all hours
- `skral_harpooner` w1 [2,5] shore band [1,2]
- `skral_tidecaller` w0.7 [3,6] shore band [1,1], night
- `skral` night warband w1.2 [3,6] shore band [3,5], **lead
  skral_champion** — THE NIGHT SHOAL (gnoll warband precedent)
- `family: 'skral'` once the POI declares it (territory chain law).

## 7. THE SHORE CAMP (the system this epic opens)

PoiDef grows **`shore?: boolean`** — the POI cousin of the wilds' shore
refinement, honoring the same `shoreProbeAt` truth:
- decideSite candidate anchors additionally require
  `shoreProbeAt(seed, tx, ty, 10)` — the camp stands within a stone's
  throw of real water, never "a fishing camp in a dry meadow."
- kind-pool gate: a shore def only enters a cell's pool if a coarse
  5-point cell probe (center + quarters, reach 12) sees water — inland
  cells never burn their roll on a camp the land must refuse.

POI **skral_shoal** "Skral shoal" [2,5] w2, family 'skral', 2-3 prefabs
(weir-camp / totem ring / midden), garrison skral + harpooners +
tidecaller (minTier 3) + crowned deepking (minTier 3, names Brackjaw /
Wetmaw / Gullcroak / Old Brine), influence litter row.

## 8. THE BRINE DIALECT (seventh head-swap dialect)

bone, scale, fur, greenskin, construct, giant-kin — now **brine**.
New module `render/skral.ts` (golem/ogre precedent): SkralLook /
SKRAL_LOOKS / skralLook(defId, eid) + cache, SKRAL_CLUSTERS (4 WIDE
colorways, hash-first, rank+harpooner only — the deepking and the
tidecaller are DESIGNS), paintSkralHead (KoboldHeadFrame contract),
paintSkralBody (belly plate + net-sash wrap), drawSkralCrest, webbed
hand branch in drawArm, webbed fan foot branch, ~20 rig.ts seams on the
goblin ladder, renderer SIZE/gate/look/passthrough/anim slots/olSig
seed byte/corpse, cms/gameRender mirror (hand-synced), ragdoll corpse
look (flopped crest, slack gape).

Clusters: tide-green / brine-blue / silt-olive / bone-pale, each with
its own fin accent — WIDE (the goblin lesson). Shade floor law: authored
darks stay above #30 after the deepest shade(); face ink #2x only.

Proportions (widths/head/carriage only — the dialect law): headR 1.42
(the head is half the animal), shoulders 0.88, deep hunch lean ~0.2,
skull sunk, spindle shanks under frog haunches, long knuckle-dragging
arms. Sizes: skral 0.86 / harpooner 0.84 / tidecaller 0.90 /
deepking 1.25.

Motion doctrine: crest = sim (never rigged); gular throat-pulse on the
idle clock; gape + crest flare ride the ONE strike curve; seeded
determinism throughout; ONE REST twin for sheets/corpses.

## 9. Sheet + tests

**skrallab.html / src/dev/skrallab.ts** — humanoid sheet on the crablab
template: 4 bodies × 8 bands × idle/walk/strike/hurt, cluster-spread
row, rulers (player/goblin/gnoll), close-ups, ?s/?rows/?cols/?det and
the turtlelab **?ol=1** dilate (fins must survive the world's ink).
Multi-pass screenshot audit; quarter bands are where seams hide.

**skral.test.ts** on the goblin harness: per-id looks, champion is a
DESIGN, cluster determinism + named immunity, 8-band NaN sweep
(live sim + ONE REST + dead), no-face-from-behind, gape clock, crest
rest equivalence, loot-story. Content suites cover the rest by
existing coverage tests (faceless-art, icon, orphan-sig, roster guard).

## 10. Debts (deliberate)

No swimming/water-entry (no water biome); no dungeon garrison packs and
no stronghold layouts this pass (the shoal is a bank people — a
"drowned hold" is an open invitation); no gurgle audio (no per-mob
voice subsystem exists); strongholds/garrison doors noted open.

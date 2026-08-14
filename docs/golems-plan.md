# THE EARTH STANDS UP — the golem bestiary

Four constructs join the wilds: the rock golem, the iron golem, the fire golem,
and the ice golem. Each is a CHARACTER, not a variant — its own silhouette, its
own motion beat, its own joint voice, its own kit, its own aftermath. They are
the biggest walking bodies in the game: slow, honest, avoidable, and heavy.
The fight they teach is spacing — read the wind, leave the mark, punish the
recovery.

Laws this plan binds itself to (all standing):
- ONE INTERPRETER TWO MOUTHS: every ability fires through castAbility with
  fromNpc; shapes stay inside NPC_SAFE_SHAPES.
- NPC pacing lives on the NpcDef; kit abilities author cooldownTicks 0.
- THE TELEGRAPH PREMIUM: windup+fuse >= 24t buys 2.5x the basic die, >= 12t
  buys 1.5x; ground_aoe fuse floor 15t. Telegraph fx = PURE INSTRUMENT.
- Every enemy ability ships an FX_STYLES face + spell plate + (if winding) a
  BREATH_DIALECTS charge voice, contract-tested, same commit.
- THE MARK'S WORTH: xpReward/maxHp stays in [1.8, 6].
- FLAT FORGE LAW: depth = flat value planes, never stroked lines.
- BODY-RULER + TOP-PLANE laws: audit beside the player rig; tall masses show
  foreshortened top planes.
- Outline shader: deliberate silhouette gaps must out-wide the dilate ring
  (0.04·s radius) or the ring bridges them.
- The three-strata FX bar: primary painted statement, true-altitude matter,
  lasting formation marks.

## 1. The family truths

- Constructs, not creatures. No fur, no breathing chest. At rest a golem is a
  STANDING STONE — near-still, with material-true micro-motion only (settling
  dust, licking flame, creeping frost, spark hiss). The stillness IS the read.
- Two-beat ponderous stomp; no run gait ever. A golem never hurries. Pressure
  comes from reach, area, and patience, not chase speed.
- Every wound art is telegraphed at the 24t+ premium band where the die is
  big. You can always walk out of a golem's wind if you respect it.
- Speeds 2.2–2.7 (troll is 3.2), radius 0.46–0.5, hitHeight 3.0–3.3,
  size 1.55–1.7 on the humanoid rig — the tallest bipeds in the bestiary.
- family: 'golem' in the wild roster — the territory atlas learns the name.

## 2. The four characters

### Rock golem — "the hill that walks" (L18, tiers 3–4)
A dry-stacked cairn come to life. Boulder shoulders wider than the hips,
mismatched stones, moss saddles in the seams, long knuckle-heavy arms. The
asymmetry is the design: no two stones alike, seed-rolled from four stone
clusters (grey tor, gritstone, mossgrown, red scree). Moves like a rockslide —
parts settle on slightly different beats; pebbles sift from the joints as it
walks. Kit: HILLSTONE THROW (a torn-out boulder flown as a true stone-element
projectile, slow and heavy, splash on landing) and THE QUARRY RING (a slam that
brings the ground up in a standing ring around your feet).

### Iron golem — "the forge's debt" (L26, tier 4, mine country)
Forged, never grown: riveted plates, hammered seams, pauldron slabs, a
furnace-slit visor burning low. Armor with nobody inside. It is the one golem
with NO ranged art — the walker; its menace is that it keeps coming. Piston
motion: straight lines, hard stops, spark hiss at the joints. Kit: ANVIL FALL
(the longest wind in the bestiary — both fists up, then the floor rings like a
struck anvil) and THE DRAWN BOLT (a shoulder-first dash lane that breaks
orbiting feet). Colors keyed to the iron-ore ladder with brass as the one warm
accent — it reads native beside the ore it guards.

### Fire golem — "the banked furnace" (L31, tiers 4–5, night)
Black basalt crust over a molten core — the light comes from INSIDE. A crack
network glows through the shell and brightens as it angers; embers rise off
the shoulders; slag drips from the fists and scorches where it lands. The
menace ramp is the design: at rest it is banked coals, in the wind-up the
seams gape white. Kit: SLAG GOBBET (a lobbed ember-flight gout that splashes),
THE VENT RING (staked ground that erupts on a fuse), and below the half,
CRUST BURST — the shell blows outward once, a nova priced on a long wind.

### Ice golem — "the winter that remembers" (L36, tier 5)
Glacial slabs, faceted and translucent — trapped bubbles, pressure lines, and
a dark old heart frozen visible inside the chest. Hoarfrost collars at every
joint; it creaks as it leans. Sharp planes against the rock golem's rounded
lumps — the two must never share a silhouette. Frost creeps out of each
footfall and lingers. Kit: THE CALVING VOLLEY (three frost-flight shards
sheared off its own shoulder) and WINTER'S FLOOR (a led ground pane that
freezes over on a long fuse and leaves the ground rimed).

Distinctness matrix — no row shares a cell:

|      | silhouette              | motion beat      | joint voice           | ranged          | ground art        |
|------|-------------------------|------------------|-----------------------|-----------------|-------------------|
| rock | round asymmetric stack  | grinding settle  | pebble sift + dust    | hillstone throw | quarry ring       |
| iron | forged symmetric plates | piston snap      | spark hiss            | none (walker)   | anvil fall + dash |
| fire | cracked crust, lit core | menace ramp      | ember rise, slag drip | slag gobbet     | vent ring + burst |
| ice  | faceted clear slabs     | creaking lean    | frost creep, shard    | calving volley  | winter's floor    |

## 3. NpcDefs (packages/content/src/npcs.ts)

All four: aggroRange 5–6, sightArc 130–170 (a construct watches its front —
the slow turn is the sneak window), leashRange 30, respawnSec 120, no pack
(a golem stands alone; family ties come from territory, not rally).

| id         | lvl | maxHp | dmg | atkCd | range | speed | xp  | ratio | radius | hitH |
|------------|-----|-------|-----|-------|-------|-------|-----|-------|--------|------|
| rock_golem | 18  | 120   | 5   | 54    | 1.4   | 2.6   | 320 | 2.67  | 0.46   | 3.0  |
| iron_golem | 26  | 190   | 7   | 58    | 1.4   | 2.3   | 520 | 2.74  | 0.48   | 3.1  |
| fire_golem | 31  | 220   | 8   | 52    | 1.4   | 2.6   | 600 | 2.73  | 0.48   | 3.1  |
| ice_golem  | 36  | 260   | 8   | 56    | 1.5   | 2.4   | 700 | 2.69  | 0.50   | 3.3  |

Statuses: rock/iron resist bleed (stone and steel do not bleed); fire resists
burn, weak to nothing it fears but the volley of frost is our story only in
art (no frost StatusId — verify at build); ice resists slow-family, weak to
burn. Exact resist/weak lists checked against the live StatusId union at
build time — nothing invented.

Basic melee: all four keep an honest slow basic (attackCooldownTicks 52–58,
the slowest basics in the bestiary) so the premium math prices their arts off
a real, felt baseline.

## 4. Kits and abilities (packages/content/src/abilities.ts, THE VOICES block)

Premium math shown per entry (basic die × cap).

**rock_golem** (basic 5):
- `hillstone_throw` — projectile_fan, 1 projectile, projectileSpeed 6 (the
  slowest flight in the game — you watch it come), element 'stone',
  splashRadius 1.2, damage 10. Kit: cd 170, windup 24 (≥24 → cap 12.5 ✓),
  min 2.5, max 8, aim 'target' (slow flight IS the dodge; lead would punish
  standing still, wrong lesson).
- `quarry_ring` — ground_aoe radius 2.4, fuse 20, knockback 1.5, damage 9.
  Kit: cd 210, windup 12 (12+20=32 ≥24 → cap 12.5 ✓), maxRange 4.5.

**iron_golem** (basic 7):
- `anvil_fall` — ground_aoe radius 2.0, fuse 18, knockback 2.5, damage 16.
  Kit: cd 220, windup 22 (22+18=40 → cap 17.5 ✓), maxRange 3.5. The biggest
  telegraphed die below the boss tier — and the most warning.
- `drawn_bolt` — dash_strike, dashTiles 5, damage 10. Kit: cd 180, windup 14
  (≥12 → cap 10.5 ✓), min 2.5, max 6. The orbit-breaker.

**fire_golem** (basic 8):
- `slag_gobbet` — projectile_fan, 1 projectile, speed 7, element 'ember',
  splashRadius 1.0, damage 11, burn status. Kit: cd 150, windup 16 (→ cap 12
  ✓), min 2, max 8.
- `vent_ring` — ground_aoe radius 2.0, fuse 22, damage 12, burn. Kit: cd 240,
  windup 14 (14+22=36 → cap 20 ✓), maxRange 7, aim 'lead'.
- `crust_burst` — nova radius 2.6, damage 15. Kit: cd 500, windup 26 (→ cap
  20 ✓), hpBelow 0.5. Once a fight, the shell blows.

**ice_golem** (basic 8):
- `calving_volley` — projectile_fan, 3 projectiles, spreadArc 0.5, speed 8,
  element 'frost', damage 9 per shard. Kit: cd 170, windup 16 (→ cap 12 ✓),
  min 2, max 8.
- `winters_floor` — ground_aoe radius 2.2, fuse 24, damage 14, slow-family
  status if the union carries one. Kit: cd 260, windup 14 (14+24=38 → cap 20
  ✓), maxRange 7, aim 'lead'.

Engine change (the one and only): `splashRadius?: number` joins AbilityDef and
threads through castAbility's projectile_fan case onto the projectile comp —
the impact-side splash machinery already exists (wand heavy bolt). Contract:
NPC splash hits players only, same as the direct hit.

## 5. The paint (rig.ts CONSTRUCT dialect + renderer wiring)

Golems are the fourth humanoid dialect beside bone, scale, and fur: the same
IK rig, carriage, and facing bands keep working untouched while head, torso,
limbs, and feet swap wholesale per BUILD.

- `GolemLook { build: 'rock'|'iron'|'fire'|'ice', shell, deep, lit, under,
  accent, glow?, moss?, heavy, seed }` + `GOLEM_LOOKS` (four authored
  designs) + `GOLEM_CLUSTERS` — rock rolls four stone clusters (hash-spread
  seed law); iron/fire/ice are DESIGNS with seed-driven plate/crack/facet
  layout variation instead of palette rolls.
- `paintGolemHead` — four head grammars: rock = a capstone boulder with a
  deep-set ember-less socket pair; iron = the riveted helm-block with the
  furnace-slit visor (the ONE glowing line); fire = a crucible crown, glow
  breathing through crown cracks; ice = a sheared prism with the dark heart
  hinted below the neck. NO faces from behind (occiput law per build).
- `paintGolemBody` — the mass statement: rock = stacked mismatched boulders
  with moss saddles and a foreshortened top plane on the shoulder stones;
  iron = chest plate with hammered seams, rivet tick-marks, brass strapping;
  fire = crust plates over a glowing seam network (glow via renderer light,
  not stroked lines); ice = faceted slabs with one specular plane per facing
  and the frozen heart deep in the chest (drawn as flat value planes).
- Limb pass: per-build arm/leg widths (heavy 1.5–1.7), stone knuckle fists
  (golems never hold weapons — GOLEM_EQUIP is bare), slab feet with
  per-build tread (rock: rounded stones; iron: riveted sabatons; fire:
  cracked pads that glow at the seam; ice: faceted wedges).
- Micro-motion: settle offsets per part keyed to the walk beat (rock parts
  lag a frame behind each other), piston overshoot-and-stop for iron,
  glow-breath amplitude ramp for fire (idle low, Cast wind high), creak lean
  for ice. All analytic, no per-frame randomness.
- Renderer: 'golem' joins both six-way humanoid predicates, GOLEM_SIZE
  ladder (1.55/1.6/1.6/1.7), seed byte + build in olSig, biped body-box
  growth term + headroom for the shoulder mass, alert-glyph lift for tall
  bodies, ragdoll dialect (`gol` on HumanoidCorpseLook — a golem corpse is a
  COLLAPSED CAIRN: the parts come apart, per build).
- The joint voice: low-rate frameDt-gated ambient matter in the golem branch
  — rock sifts dust grains on footfalls, iron sparks on the piston stop,
  fire bleeds rising embers + rare slag drips that lie briefly, ice sheds
  frost motes and lays a fading rime print at each footfall. Budgeted far
  below the emitter cap; scales off gait so a standing golem is near-silent.

## 6. FX (faces, plates, dialects, signatures)

- FX_STYLES faces: four distinct tuples on the STEEL/EMBER/FROST families +
  a stone voice via STEEL's rock debris. Motifs: quake (quarry_ring,
  anvil_fall), pillar (vent_ring), spikes (winters_floor), wave (crust_burst)
  — no tuple collision (contract-tested).
- Spell plates: one bespoke plate each in abilityIcons.ts (boulder in flight,
  the fallen anvil, the staked vent, the calving shard fan, etc).
- BREATH_DIALECTS: every winding entry gets a charge voice — rock: dust
  billow + rising grit; iron: storm-static-free spark ring (dust + fire
  spark, no storm grammar); fire: fire plume drawing INTO the seams (the
  in-breath); ice: frost fog pooling at the feet.
- fxSigsGolems.ts (new file, spread into SIGNATURES): three-strata
  signatures per ability, blast-wire-guarded, telegraph untouched:
  - hillstone_throw: the landed boulder IS the centerpiece — a real stone
    prop with a lit top plane that thuds, bounces once, and LIES ~9s;
    dust.slam + skirt; a cracked-earth star under it laid in formation.
  - quarry_ring: the ground answers upward — a ring of standing stones
    heaves up in sequence, dust curtains off each; stones sink back but a
    rubble ring lies.
  - anvil_fall: ONE hard rectangular strike statement is banned (shield owns
    the square, draw_iron owns the hexagon) — the anvil speaks as a struck
    RADIAL bell: a bright rim flash, two traveling swells, and a glowing
    dent that cools in hard steps (steel_wave's cooling law), sod tabs
    flipped at the rim.
  - drawn_bolt: piston furrow — twin skid grooves with a spark seam, hard
    stop stamp at the terminus.
  - slag_gobbet: fire.burst + gobbets at the wound; ONE glass-glazed scorch
    disc with winking embers lies ~8s.
  - vent_ring: staked vents hiss then erupt as short fire pillars in
    sequence round the rim; charred vent mouths lie.
  - crust_burst: the shell blows OUTWARD — crust plates fly on true z, land
    bounce-settle in a ring, each plate's inner face glowing then cooling;
    the golem's own glow dims for a beat after (painted in the sig's air).
  - calving_volley: shard impacts leave hoar stars; the flight is frost's
    lance voice.
  - winters_floor: the pane grows from the RIM INWARD (frost_nova's crack
    propagates outward — ours closes in, the opposite read), meets in the
    middle with a pressure-ridge seam, and the rime lies in a ring of
    footstep-catching hoar tufts.
- Grammar check against existing centerpieces (grep before naming) — no
  reuse of the lake-under-your-feet, the anvil overhead, or any owned
  geometry (squares = shield, hexagons = draw_iron, wobble rim = war_shout).

## 7. Loot, items, spawns

- Items: `golem_core` (the shared construct heart, materials band maxStack
  10) + per-build signatures: `hillstone_heart`, `forgeplate_scrap`,
  `molten_slag`, `everfrost_shard` (materials band). Iron golem also pays
  from the ore ladder (iron_ore).
- Loot tables: one per golem id — bones never (constructs); coins, the core,
  the build signature, essence alignments (ember_essence on fire etc), small
  rare-set trickles at troll-tier chances. Regular 3.2-stack ceiling — no
  champions this pass (the sovereign tier is a follow-up epic).
- Wilds (family 'golem'): rock tiers [3,4] grass+forest day, solo; iron
  tiers [4,4] forest, solo (mine country leans via territory); fire tiers
  [4,5] night (the glow owns the dark), solo; ice tiers [5,5], solo. All
  weight ~0.4 — a golem sighting is an event, not a lawn.
- Iron golem joins the mine dungeon roster if the roster format takes a
  one-line add; otherwise deferred with a note.

## 8. Proving

- riglab.ts rewritten as THE GOLEM SHEET: 8 facings × idle/walk/strike/cast/
  hurt per build, cluster-spread row (rock), body-ruler cells (player, troll,
  gnoll packlord beside each golem), ?s zoom kept.
- Screenshot audits per the rig-lab workflow (chrome-headless-shell watchdog
  when the MCP browser is held); multiple polish passes — silhouette read,
  facing honesty, hurt-flash cleanliness, outline-gap check at ring width.
- fx-shoot rig for all nine signatures (pin-the-clock for arc windows).
- Live proving: /spawnmob each golem far from hearth with a geared body;
  verify kit cadence, telegraph honesty, pip, splash, ambient voices, loot.
- Full suites: content, client, server green before each commit. Shared-file
  staging is SURGICAL (stage only own hunks; check git status first).

## As built

(appended at ship)

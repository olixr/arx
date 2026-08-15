# THE LAWS HOLD + THE TICK EARNS ITS BUDGET — the six-lens core audit (2026-08-15)

A full-depth technical audit of the recently-refactored core, run as six
parallel lenses over committed HEAD, every finding verified against the
live code before a line moved. The trigger: the `crowned` validator drop
(THE DROWNED VILLAGES session) proved the seams could eat typed,
consumed fields silently — so the audit hunted the whole class, plus
lifecycle, determinism, duplication, and scaling defects across the
boss lane, POI lifecycle, worldgen field, loot machinery, and the tick.

## The lenses

1. **Validator/type drift** — every hand-rolled validator diffed
   field-by-field against its TS type and its runtime consumers.
2. **Boss/champion lane** — bossMind purity, crown lifecycle, forge
   seam, arena law, the three seat wirings.
3. **POI lifecycle** — materialize/clear/respawn, CMS doors, hash
   determinism, law consistency, the influence patchwork.
4. **Worldgen/geography/danger** — field seams, pinned-vs-cell modes,
   seeding idempotency, duplicated constants.
5. **Loot machinery** — the roll mechanism (not the content), chest
   lifecycle, acquisition-law enforcement.
6. **Server hot paths** — algorithmic scaling, allocation churn,
   unbounded growth, wire fan-out.

## Shipped — cbe04c9c THE LAWS HOLD (correctness arc)

- **THE UNREACHABLE QUEST** (CRITICAL): dialogue node-level `set` was
  typed nowhere and silently eaten by validateNode; four shipped trees
  authored it, and `torvi_name` — the only stamp of
  `a_name_for_the_stone`'s gate — evaporated, shipping the quest
  unreachable. Trees converted to the lawful `hooks` form; node/choice/
  dialogue validators refuse unknown keys (the `set` error names the
  alternative); new pin walks every quest gate flag against every stamp
  source.
- **THE AUTHORED GROUND NEVER EMBERS** (CRITICAL): notePoiKill stamped
  `clearedAt` unconditionally; no sweep heals authored cells; the
  materializer reads any stamp as garrison-down → one clear + one
  reboot made any authored landmark a permanent carcass. Authored
  clears now stamp nothing (grace window only), authored cells never
  scatter, and seedAuthoredSites heals legacy stamps in live worlds
  (`healPoiCleared`). **Prod note: the live DB likely carries stamped
  authored cells — the heal runs at next deploy's boot, watch for the
  `healed a legacy cleared stamp` lines.**
- **THE ENGAGEMENT ENDS AS ONE ACT / THE COURT FALLS WITH ITS CROWN**:
  `resetBossEngagement` owns cast+chain+lope teardown at search start,
  retarget, and leash break (the queued combo no longer survives into
  the next fight); summons enter `wildBodies` at birth (truly
  ephemeral now — the orphan-court unbounded leak is dead) and disband
  with the death burst on raiser death and arena reset.
- **THE ARENA HOLDS THE CROWN, SHOVE INCLUDED**: knockback clamps at
  the rim (`arenaRadiusFor` is the ONE radius chain), and the
  stronghold chief carries a ward-derived `arenaR` (the delve seat's
  lesson). The unforgeable-crown seam warns once per def id.
- **THE SEEDER RE-READS THE PLAN**: moved pins re-seed, dead prefabs
  re-seed, the nudge clamps inside the pin's macro cell, and
  `findAuthoredAnchor` finally checks claim rings + the capital mask.
- **THE BITS BELONG TO THEIR WALLS**: `wardsCleared` drops (loudly) when
  the dealt stronghold layout differs from the ledger's.
- **THE WARD RE-ARMS WITH ITS KEEPER**: warded-chest recloses defer
  while the site lies cleared/embered; carcass materialization opens
  chest lids (POI and capital both) — the restart multi-dip is closed.
- **THE HAND-OFF LAW** (danger field): heat's FIRST step lands where
  relief runs out (48); later steps keep the classic ladder — the
  Kingsdelf spike ring is dead, the Hartway middle league and the
  Brand's burn re-proven by their own pins. Dread rims grade through
  every rung (dread-3's outer hem steps 2→1→0, never a two-tier cliff).
- **THE COMBAT FIELDS ARE COMBAT LAW**: attackStatus/resist/weak/lanes/
  lays.xp/hitHeight validated whole; splitInto self-reference refused;
  validatePoiDef refuses unknown keys; crowned rows pinned to one named
  body.
- **THE LOOT CONFESSES**: stampRoll refusal withholds the husk and
  warns; validateLootTables enforces the acquisition law at the door
  plus value checks (nothingW/rarityBonus/power/picks); heirloomFor
  honors acquisition (drop|craft only); nested refs pay ONE damp per
  leaf (rollInto + analyze.ts agree); rolls pure given ctx.rand.

## Shipped — c4dd7b56 THE TICK EARNS ITS BUDGET (performance arc)

- **forEachNpcNear** (chunk-indexed, separateHeading's pattern) adopted
  at 18 combat scan sites that walked the whole world NPC map — with a
  pay-once Set on every multi-hit loop (knockback re-chunks a body
  mid-walk; chunk order could pay it twice).
- **forEachDropNear**: merge scan, pile census, and the walk-over
  vacuum (inverted to per-player scans) off the whole-map walks.
- **THE UNWATCHED WORLD DOZES**: idle NPCs in chunks no session streams
  skip wander/collision/perception (timers still run; combat states and
  damage-wake unaffected).
- **THE ONE RETIREMENT DOOR**: `freeSpawnSlot` + free lists — spawn and
  actor slots are reused, side ledgers cleared; dungeon teardown routes
  through it. The spawnPoints forever-growth leak is dead.
- **THE FAN PAYS ONCE**: broadcastFx/Meta/Hit stringify once per fan
  (`session.sendJsonRaw`).
- **THE TICK KEEPS ITS OWN LEDGER**: avg/max tick ms logged per minute;
  catch-up clamped to 2 ticks of debt after a stall.
- Probe hoists: `cellSeesWater` once per cell decision; `groundProbeAt`
  reuses its center elevation.

## RECORDED DEBTS — confirmed findings deliberately deferred (the next arc)

Ordered roughly by value; every one was verified real by the audit.

1. **POST_SIGNS exists three times and the copies disagree** (server
   pois.ts, content strongholds/generate.ts, dungeon garrison.ts):
   POI cook has Bonfire, stronghold vigil has WarDrum/no hours,
   stronghold has FishRack/RoeNest rows the POI table lacks (a skral
   fish rack seats a cook in a capital, nobody at a camp). One shared
   content table with per-lane recodes.
2. **Capital determinism family**: `capitalRects()` derives from ONLINE
   PLAYER positions — boot sweeps and far cells decide maskless/march-
   less (derive from the lattice around the queried cell instead);
   `strongholdSeat` re-derives from live claim rings so a hearth claim
   can move/null a LEDGERED capital's seat (pin by ledger row);
   `reloadGeography` never clears `capitalCache`; the orphan/paved
   re-judgement runs on live reload but not at boot (fold into
   zonePlanSweep).
3. **POI boot/CMS ref divergence**: boot validates POI defs with NO
   refs (authored actor/routine registries), the CMS PUT with the live
   roster — a def naming a Studio-born actor saves, then silently
   reverts to authored at next boot. Pass game refs at boot.
4. **Zone door**: boot loads data/maps/*.json via zoneFromJson with NO
   validateZone (header claims otherwise); ZoneDef.portals/spawns/
   actorSpawns unvalidated on every path; registerSpawns takes
   unvalidated spawn.count. Also the ZoneJson serializer trio is a
   hand-maintained shadow of ZoneDef (round-trip contract test wanted).
5. **composePoi purity**: wings probe live zoneRects/claimRings at
   compose time and the shared `levelRoll(n++)` counter threads
   everything — a claim ring appearing deletes a wing AND reshuffles
   every later level (violates its own prefix-stability law). Pin wings
   at decide time; per-block salted streams.
6. **Finds ghost-seat**: cleared bits bind by slot index while the deal
   re-derives from live ctx (CMS minor-def add re-aims the bits).
   Fingerprint the roster into the finds epoch or store dealt defId.
7. **Influence lists → def properties**: EXEMPT/WING_CAP/QUIET_CAP/
   MEASURED_CAP + prefab-id regex vocab are cross-file patchwork; a
   missed entry silently buries curated art. `influence` block on the
   def/prefab. Also expandInfluence drops detail/elev layers (latent —
   first detail-bearing POI prefab will flatten).
8. **Siting/muster consolidation**: five near-copies of the siting scan
   (decideSite/wings/findAuthoredAnchor/findsForCell/strongholdSeat)
   with drifting pads (6/8/24), strides, tolerances, and the `>= 34`
   landmark threshold written three times; four copy-pasted muster
   loops. One `siteScan(policy)` + one `musterEntry` helper.
9. **The 128 grain is three unlinked constants** (DANGER_BAND/POI_CELL/
   GEO_POI_CELL) — export one from shared. The capital 24-pad is inlined
   twice beside a named CAPITAL_CLEARANCE.
10. **Loot seams**: bounty lanes are roll-blind (gear added would lose
    its roll; the capital purse copy also skips the inv sync — extract
    one purse helper); node-bonus lane destroys the drop on a full pack
    (quest lane got the placeDrop fallback); expectedYield ceilings are
    test-only (run in lootTableErrors at CMS accept; fuzz forged-crown
    unions); keyForge same-seed copy via trade (design note).
11. **Validator ports remaining**: unknown-key guards for
    validateNpcDef/validateRoutine/validateGeographyDef (geography saves
    ERASE unknown fields — worst of the class); voice doc needs the
    frontier-style backfill law (first new dial reverts all Studio
    tuning); replaceFrontier's copy list omits strongholdEmberMs/
    strongholdFallowMs (aliasing latent); quests/dialogues refs
    (npcIds/itemIds/questIds) never passed on live paths;
    questRewardsWire previews neither standing nor flags; db/npcActors
    SQL columns are the crowned mechanism relocated into schema
    (round-trip test wanted); loot recovery is all-or-nothing at boot
    vs per-doc everywhere else.
12. **Perf, next tier**: numeric packed chunk keys for the server-side
    index (~360k transient strings/sec at scale); ChunkStore LRU
    eviction (well-walked world holds every chunk forever — regen is
    deterministic, eviction is safe); sendRide/sendPet per-tick sig
    strings → dirty flags; interest/snapshot scratch reuse; POI zones
    never retire on distance (poiLive grows with exploration);
    authoredCells() rebuilt per frontier beat (version-stamped cache);
    status-reaction spread loops still whole-map (need the pay-once
    guard treatment); geographyWarnings runs synchronously on the tick
    in /dev/world (cache by content hash).
13. **Worldgen/geography small**: the y∈[400,512) governed-by-nobody
    band (derive GEOGRAPHY_SURFACE_MAX_Y from DARK_BAND_Y; refuse
    cell-forced rows past it); the Short Span Law is advisory-only
    end-to-end (a Studio save lays a deep-water causeway before the
    warning arrives — promote deck.deep>0 to an error or confirm gate);
    authored-site tier is seeding-order-dependent (compute against
    SETTLED_ANCHORS); road severance is statistical under the rough
    tolerance (make road proximity a hard reject); point-to-segment
    distance ×4 in geography.ts; dangerTierAt is a dead trap (delete or
    rename); dangerAt origin fallback reads (0,0) as settled.
14. **Client (peer territory, flagged not fixed)**: bossBanner assumes
    phase is monotone — an arena reset legitimately decreases it and
    pips go stale within SHOW_RANGE; wander preview speed default 1.2
    vs server 1.8.

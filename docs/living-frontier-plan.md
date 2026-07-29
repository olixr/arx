# The Living Frontier — The World Learns to Move On

The sequel law to `procedural-world-plan.md` (Phases 1–4 shipped). That epic taught
the world to *grow* camps; this one teaches it to **let them go, move them on, and
push back**. The player's verdict driving it all:

> A cleared goblin encampment should not respawn and become a farm spot. You solved
> that problem, you earned the reward — the camp lingers a few minutes, then fades,
> and the trouble sets up somewhere new. Ignore a camp and it emboldens and spreads.
> Clear the land near your home and you've made it yours — until raiders decide your
> quiet valley looks appealing. Towns should feel the pressure and ask for help.
> The map never empties and never repeats.

## Ground truth this builds on (verified 2026-07-28)

- **The whole substrate exists.** `dangerAt` tier field + `DANGER_LAWS`, POI cells
  (`POI_CELL=128`) decided by pure `poiForCell` on named streams with **epoch folded
  into every stream** — one epoch bump re-rolls a cell's entire identity. The
  `world_pois` ledger stores deviations only. 14 archetypes incl. friendly havens.
- **Clear detection exists**: `notePoiKill` stamps `cleared_at` when the last
  *fighting* body falls (livestock law), sets `clearedFlag`, and today re-aligns the
  dead garrison to a single 180 s grace respawn (`POI_RESPAWN_MIN_SEC`).
- **The rumor wire exists**: `fadePoiDiscoveries(cellKey)` ages every character's
  marker to a dashed rumor ring (one cross-character UPDATE + live push);
  rediscovery of a live site re-fires the DISCOVERED ceremony. 7 call sites, kept in
  sync.
- **The missing clock**: `fallowSweep` (7-day epoch turn) runs at **boot only** and
  by `/poi fallow`. A long-lived server never churns on its own. No event scheduler
  exists anywhere; the only cadences are `tickCount % N` slices.
- **Claims are one bed coordinate** (`player.home`), plus `built_tiles` rows with
  owners. **Nothing spatial respects them** — POI siting, wild spawns, and aggro are
  blind to player builds.
- **Dialogue can react to the world only through per-character flags** — but
  `pickDialogue(offers, has)` takes an arbitrary predicate, so the server call site
  can answer *synthetic* world flags with zero type changes.
- **No NPC-vs-NPC combat, no factions, no spawner entities.** Guards only ever
  retaliate against their own attacker.

## Industry laws we adopt (research digest, full notes in the epic session)

1. **Source-and-kill-switch** (State of Decay 2 post-U33): every spread traces to a
   destroyable core. Satellites die with the heart. Players must always be able to
   answer "why is this here" and "how do I stop it."
2. **Global pacing dice, not per-POI timers** (Valheim: every 46 min, 20% → ~1 raid
   / 4 h): roll one clock, then pick a target. Pressure must never scale with the
   number of standing camps.
3. **Cooldown floors and relax windows** (RimWorld ≥2 days between majors; L4D's
   30–45 s zero-spawn relax): after any major beat — clear, raid, town rescue — a
   guaranteed quiet window. Never chain catastrophes.
4. **Observation never escalates** (SoD2's scouting backlash): walking past, looking
   at, or charting a camp is free. Only *time* escalates, and only after discovery.
5. **Frequency, not amplitude** (L4D): an emboldened camp gains bodies, patrols,
   and satellites — never silently outgrows its danger-tier level band.
6. **The fuse must be visible** (Minecraft Bad Omen's redemption arc): any
   threat-follows-you or raid mechanic shows a persistent telegraph + countdown.
7. **Raids target attended homes only** (Valheim's 40 m/3-structures rule): no
   offline sieges, no destruction of builds, showing up is always worth it.
8. **Failure forks, success fades** (GW2 dynamic events): an ignored threat becomes
   a *new playable state* (a toll on the road, a rescue), never a locked loss.
9. **Rewards never depend on world-state manipulation** (GW2's anti-farm law):
   bounties scale on participation; nothing pays for *keeping* a camp alive.
10. **Dissolve and materialize offscreen, with fiction** (RDR2, L4D active-area
    rule): nothing appears or vanishes in view; the replacement band is a *new*
    band, not the same one reborn.
11. **Never scale threat on what players hoard** (RimWorld's poverty meta): pressure
    reads progression tier and geography, never claim value or stored loot.
12. **Ship the dial** (SoD2's no-toggle backlash): escalation and raid cadence are
    Studio-tunable constants from day one, and claims can opt down.

## The laws of this epic

- **THE EMBER LAW** — a cleared hostile site never restaffs. It stands as a broken
  carcass long enough to loot and savor (minutes), then dissolves with dignity and
  the cell rests fallow (hours) before it may host again. Clearing is *solving*.
- **THE CONSERVATION LAW** — the frontier owes the world a living density. What
  dissolves here stands again elsewhere, outside every player's view, as a new band
  with a new name. Players can win *ground*, never *emptiness*.
- **THE BOLDNESS LAW** — a discovered hostile site that nobody breaks grows bolder
  on a slow real-time clock: more bodies, more patrols, then a satellite camp
  seeded townward. Bounded in stage, bounded in count, broken forever by one clear
  of the core.
- **THE WATCH LAW** — settled anchors feel standing threat within their marches.
  Guards' voices change, a bounty stands, the chart hints. Resolution pays and
  buys the town a guaranteed calm window.
- **THE HEARTH LAW** — the land around a player's claimed hearth is theirs: no site
  materializes on it and wild spawns respect it. But a hearth on the frontier is a
  *lamp someone covets* — on a slow, merciful, opt-out clock, trouble may pitch
  camp at its edge. Never inside, never offline, never destructive.
- **THE FUSE LAW** — every escalation and every raid telegraphs before it lands,
  in chat, in the world (smoke, horns, tracks), and on the chart.

---

## Phase 1 — The Ember Turn (clear → linger → dissolve → fallow)

**SHIPPED 2026-07-28.** Verified live end to end on the running world: a
tier-2 goblin warcamp at cell −2,1 was wiped in one 40 s sweep ("The last
of them falls…"), entered EMBER with an ~11 m countdown, and **never
restaffed** (zero goblins four minutes past the old 180 s floor); a due
ember refused to dissolve while the player stood in the camp ("nothing
due") and dissolved the moment they left; the chart marker faded to rumor
live; the cell recorded fallow (~4.8 h, in-band); the banked renewal
credit was spent by the 15 s cadence organically — a **wolfkin den** rose
at cell −4,0, 110 tiles from the player (inside the [64,160] ring, past
dignity), epoch-bumped, debt persisted to 0. Migration v6 applied to the
live DB in place. 647 workspace tests green (poiWard rewritten for the
ember/authored split + 8 new frontier pins). Along the way: unloadZone
now purges pending respawnQueue tiles inside the unloaded rect (latent
chest-reclose-onto-meadow bug, live since /poi reroll shipped).

Goal: cleared camps stop being farms; the frontier gets its own heartbeat.

### 1.1 `tickFrontier` — the clock the world is missing

- New slow pass in `GameServer.tick()` (`tickCount % FRONTIER_TICKS`, ~every 15 s of
  ticks — the `tickPois` cadence family). It owns *all* time-driven frontier work:
  ember dissolves, fallow expiry, boldness stage-ups (Phase 2), renewal credits.
  `fallowSweep` stops being boot-only: boot still runs the reconcile, but the sweep
  cadence moves here. One cell's worth of work per pass (sliced-job law).
- All constants live in one `FRONTIER` table (content, Studio-editable later):
  `EMBER_LINGER_MS` 8–12 min (hash-jittered per site), `FALLOW_HOURS` 3–6
  (hash-jittered), `RENEWAL_RING` [40, 96] tiles, `STAGE_DAYS`, `SATELLITE_MAX`,
  `RAID_*` (later phases). **The dial law: these are data, not literals.**

### 1.2 Ember state (ledger + behavior)

- `world_pois` grows `state` (`'standing' | 'ember' | NULL`) — or derive it:
  `cleared_at !== null` *is* ember; only a new column `ember_until` is needed.
  Migration keeps it additive.
- On full wipe (`notePoiKill`): **delete the respawn re-alignment** — instead
  deactivate every fighting spawn record of the cell (`active = false`, the
  deactivate-in-place law). The 180 s grace becomes irrelevant for hostiles: the
  camp is broken, period. Livestock and staff actors stand (freed cows wander the
  wreck — flavor for free). Warded chests already unlock on the wipe.
- Stamp `ember_until = now + EMBER_LINGER_MS`. The site visibly *is* the player's
  victory: tents stand, fire smokes, chest sits opened.
- `tickFrontier` dissolve check: `ember_until` passed **and dignity holds** — no
  player within `DIGNITY_TILES` (~48, past the far interest edge) of the footprint.
  In view = wait; the fade never happens in front of someone (the `keepSpawnHours`
  dignity precedent, promoted to zones). Dissolve = `fadePoiDiscoveries` (call site
  #8 — update the rumor-law sync note) → `retirePoiCell` → `epoch + 1` →
  **fallow decision**: record the cell as decided-empty with `fallow_until = now +
  FALLOW_HOURS`. `poiForCell` is not consulted again until fallow expires — the
  meadow heals before anything new moves in, and it will be a *different* roll
  (fresh epoch streams) when it does.
- Authored cells (`authoredCells()`) are exempt end-to-end, exactly as today: the
  nine landmark sites never churn. Friendly/haven sites have no garrison to wipe —
  ember never applies; they persist as before.

### 1.3 The renewal credit (conservation)

- Each dissolve-after-clear banks one **renewal credit** (in-memory counter + a
  `frontier_ledger` scratch row so restarts keep the debt honest).
- `tickFrontier` spends credits: pick an online player at random (weighted toward
  whoever banked it if online), scan cells in the `RENEWAL_RING` annulus around
  them — outside interest + pad so nothing pops in view — that are undecided or
  decided-empty past fallow, tier ≥ 1, not authored, not claim-locked (Phase 4).
  Force-stand a fresh `poiForCell` roll there (the `/poi here` path, epoch-true).
  No candidates = credit waits; the debt never rushes a bad site.
- Result: net live-POI density around active players holds steady. The world
  never empties (user law: "never run out of things to do") and never refills the
  same dot (the RDR2 "new band" fiction — new cell, new archetype roll, new name).

### 1.4 Levers + tests

- `/frontier info` (ember/fallow/credits readout for the cell + region),
  `/frontier tick` (force one sweep pass), `/poi fallow` kept for the old lever.
- Tests: ember never restaffs (spawn records stay inactive), dissolve respects
  dignity radius, fallow blocks re-decision until expiry, renewal lands outside
  the interest pad and only on lawful cells, authored cells untouched, credits
  survive a restart. The pois.test determinism suite must stay green — epoch
  streams unchanged.

**Commit boundary**: tickFrontier + ember state → dissolve/fallow → renewal
credits → levers/tests. Each green.

---

## Phase 2 — The Boldness Ladder (ignored camps grow)

Goal: neglect has texture. The land develops; players read it and answer it.

### 2.1 Stage on the ledger

- `world_pois` grows `stage` (0–3, default 0) + `stage_at`. **The stage clock only
  runs for discovered sites** (any `character_discoveries` row for the cell exists,
  cheap via the existing `idx_character_discoveries_id`): an unseen camp in the
  deep frontier costs nothing and threatens nobody — and observation itself never
  escalates (the clock is pure elapsed real time since `first_seen_at` /
  `stage_at`, ~`STAGE_DAYS = 2` real days per rung, checked by `tickFrontier`).
- Stage-up recomposes the standing site deterministically: `composePoi` takes the
  stage and reads a new `PoiDef.boldness` grammar block —
  `boldness: { garrison?: PoiGarrisonEntry[] per stage, cues?: extra scatter }`.
  **Frequency, not amplitude**: extra bodies, an extra patrol ring, wider trampled
  clearing, a second banner — levels stay inside the tier band. Validator enforces
  it (a boldness entry may not raise `levelOffset` past the def's own max).
- Stage-up is a *recompose in place* (the `reloadPoiDef` retire/re-stand path) and
  obeys dignity: deferred while a player is inside the footprint radius. It
  telegraphs: a system-chat rumor to players who hold the discovery ("The warcamp
  at <name> grows bolder — more fires burn there than before."), and the chart
  marker gains a stage pip (marker sigil, not emoji — the markers.ts dialect).

### 2.2 Satellites (the spread, with a heart)

- At stage 2+, `tickFrontier` may seed **one satellite** (max `SATELLITE_MAX = 2`
  per core): a small camp variant of the same archetype in an adjacent cell,
  biased one cell *townward* (toward the nearest settled anchor — the pressure
  visibly creeps). Satellite cells are ordinary ledger rows with a new
  `origin_cell` column pointing at the core.
- **Source-and-kill-switch**: clearing the *core* breaks the family — every
  satellite of that core flips straight to ember at the same moment ("Word
  spreads — the outlying camps scatter."). Clearing only a satellite banks its
  reward but the core re-seeds it later (satellite slot reopens after a cooldown).
- Hard bounds: satellites never violate `ZONE_CLEARANCE`, never enter tier-0 or
  haven relief, never enter a claim ring (Phase 4), never target the same cell
  twice in a row. Regional cap: at most `REGION_BOLD_MAX` (start: 2) stage-2+
  families per 5×5-cell neighborhood — the spiral has a ceiling by construction.

### 2.3 Relax windows

- Any clear (core or satellite) stamps a per-region `calm_until` (~12 h real):
  no stage-ups, no satellite seeding, no renewal credits landing in that
  neighborhood while it holds. The player's victory *reads* — the valley is
  genuinely quieter (the RimWorld/L4D floor).

**Commit boundary**: stage column + clock → boldness grammar + validator + bench
rows → satellite seeding + family break → relax windows + tests.

---

## Phase 3 — The Town Feels It (guards, bounties, the champion of balance)

Goal: settled land reacts; players are recruited, thanked, and paid.

### 3.1 Synthetic world flags (zero protocol, zero schema)

- At the Talk call site, wrap the predicate handed to `pickDialogue`: flags in a
  reserved `world:` namespace are answered live from the `poiLedger` + the
  *speaker's zone* — e.g. `world:threat_near` (any hostile site standing within
  `WATCH_TILES` ≈ 96 of this anchor), `world:threat_bold` (stage ≥ 2 within
  reach), `world:calm` (neither). Per-character flags stay the truth for
  everything else; `world:` never touches the DB. The dialogue validator learns
  the namespace so the Studio's rehearsal bench can toggle them like any flag.
- Author the trees (VOICE.md law — one voice per throat): wardens/watch actors at
  Dawnmead, Amberford, and the waystations get threat-gated bindings layered over
  their standing trees by `priority`. Uneasy lines when `world:threat_near`,
  urgent asks at `world:threat_bold`, and warm relief lines during the relax
  window after a player breaks the family ("The road breathes easier — that was
  your doing, by all accounts.").

### 3.2 The bounty (the ask made concrete)

- A threat-gated choice ("Where are they camped?") fires a new
  `DialogueHook { kind: 'bounty' }`: the server picks the offending cell, plants
  the player's **waypoint** at its anchor (machinery exists), stamps a
  per-character `bounty:<cellKey>` flag, and answers in-voice with a bearing.
- On that player participating in the clear (`notePoiKill` already knows the
  killer; extend the wipe credit to everyone who damaged the garrison — the
  participation ledger is a small per-cell `Set<characterId>` on the live entry),
  pay coins scaled by tier + stage through the loot pipeline (a `bounty_<tier>`
  table — the flood law's analyzer sees it) and clear the flag. **Never a reward
  for the site standing** — only for breaking it (the GW2 anti-farm law).
- No new protocol: the ask, the waypoint echo, and the payout line all ride
  existing wires (`dlgopen`, waypoint, chat, drops).

### 3.3 The creep answered (failure forks)

- If a stage-3 family stands within a town's marches past `CREEP_DAYS`, it does
  not sack the town (towns are law: tier 0 is sacred). It **forks the road**: a
  `road_toll` micro-site (bandit toll precedent — `first_road_toll` exists as an
  authored archetype already) stands on the townward road at the family's edge,
  and the town's threat dialogue escalates to name it. Breaking either the toll
  or the family resolves both. The failure state is *more game*, never less.

**Commit boundary**: world-flag predicate + rehearsal support → threat trees
(VOICE pass) → bounty hook + participation credit → creep fork + tests.

---

## Phase 4 — The Hearth Watch (claims shape the land, and the land answers)

Goal: your cleared, built-upon valley is *yours* — and holding it is play.

### 4.1 The claim ring (derived, never authored)

- New derived registry `claimRings: {x, y, r, characterId}[]` — one ring per
  claimed hearth (`player.home`), radius = `CLAIM_R` (start: 24, one zone
  clearance) grown to cover the flood of that owner's `built_tiles` within
  `CLAIM_REACH` (48) of the bed, + pad. Rebuilt lazily: on boot, on bed claim /
  `clearHome`, and debounced on builds near a known ring. Cheap, in-memory, no
  schema.
- **Exclusion law**: `poiForCell` site scan, satellite seeding, renewal credits,
  and `tickWildSpawns` all reject points inside any claim ring (the
  `intersectsZones` pattern — rings join the context object). Mobs never
  materialize inside your walls or your yard. *Danger tier is untouched* — a
  hearth is not a haven; the frontier around it stays the frontier (the lamp-not-
  hearth lesson, inverted: the player's lamp keeps spawns out but doesn't calm
  the land — that's what clearing camps is for).

### 4.2 Trouble at the edge (the covetous camp)

- **Global dice, attended only** (Valheim law): every `RAID_ROLL_MIN` (46) minutes,
  one roll at `RAID_CHANCE` (0.2) *per shard*; on success pick ONE online player
  who qualifies: near their own claim ring, ring in tier ≥ 1 land, no
  `raid_calm` cooldown (a stamp on `characters`, `RAID_COOLDOWN_H` ≈ 48 h), and
  not opted down.
- The event is **a POI, not a script**: a `raider_squat` archetype (small, craven,
  banners, tiers 1–3) force-stands in the nearest lawful cell edge-adjacent to
  the claim ring — outside view, outside the ring. It telegraphs on the fuse law:
  a horn sfx + chat line ("Torchlight gathers past your fence-line…"), a chart
  pip, and worn-track cues pointed at the claim. It *harasses*: its patrol ring
  faces the claim; wandering members may rattle (never breach) doors.
- **Merciful by construction**: never destroys built tiles, never spawns while
  the owner is offline (no owner near = the dice never picked them), ember rules
  apply the moment it's cleared, and clearing it pays a defender's bounty +
  stamps the cooldown. Dying to it also stamps a (shorter) cooldown — losses
  earn mercy, not a chain-raid (RimWorld adaptation, simplified).
- **The dial ships day one**: a hearth-side interaction toggle ("Ward the
  hearth: raiders will not covet this place") — flag on `characters`, honored by
  the dice. The default is on for tier ≥ 1 claims; players consent by building
  in the wild, but can always turn it down. No SoD2 backlash.

**Commit boundary**: claim rings + exclusion → raider_squat archetype + dice +
fuse → mercy/cooldown/dial + tests (rings exclude all four spawn paths; dice
never picks offline/cooldown/opted-out; squat never lands in view or in ring).

---

## Phase 5 — The Road's Fortune (transient friendly lights)

Goal: not every stranger is a blade. The road deals fortune both ways.

- **The peddler's rest**: a friendly transient archetype — one trader actor
  (foundry-authored pool: tinker, herb-wife, relic-monger), a handcart prefab, a
  campfire — that stands for `PEDDLER_HOURS` (2–4 real hours, hash-jittered),
  then dissolves by the ember machinery (no clear needed; `ember_until` on
  arrival). Placement rides the renewal-credit path at low weight, biased to
  road-adjacent cells (`roadDistanceAt` scoring — fortune walks the roads).
- **The stock is the story**: peddler shops carry 1–2 items town never sells —
  road-only recipe scrolls (the recipe-unlock trove precedent), odd reagents, a
  discounted key. Shop opens through the dialogue shop hook (ends-well law).
- **Rumor reaches town**: while a peddler stands within a town's marches, a
  `world:peddler_near` synthetic flag lets innkeeps/gate guards drop a hint in
  their idle trees ("A tinker's cart rattled past the gate at dawn — catch her
  before the road does."). Chart: discovered as a normal POI; when it moves on,
  the marker fades to rumor by the standard wire — the map remembers the story.
- Cap: at most one standing peddler per region; never during that region's
  active raid; never inside claim rings (she respects your fence).

**Commit boundary**: archetype + prefab + actor pool → placement/lifetime →
shop stock + rumor flag + VOICE lines → tests.

---

## Phase 6 — The Studio Owns the Weather

Goal: every dial in this epic is content, and the bench can *see* the living map.

- **FRONTIER constants → content doc** (`content_docs` kind `'frontier'`, one
  validator, two-hash law): linger, fallow, stage days, satellite caps, calm
  windows, raid dice, peddler hours. The CMS grows a "Frontier" section — sliders
  with the DANGER_LAWS-style readouts ("stage 2 in ~2 days; ~1 raid roll / 4 h").
- **PoiDef grows the new grammar in the bench**: boldness rows per stage (reuse
  the garrison row widgets), satellite variant picker, transient/peddler
  lifetime, raid-target eligibility chip. The Stage preview renders stage 0–3
  side by side (four `composePoi` calls — it's pure).
- **World Studio cell inspector** shows the living state: stage pips, ember/
  fallow timers, satellite family lines drawn core→satellite on the world view,
  claim rings as a toggleable layer, renewal-credit count. `poiCellAction` grows
  `'stage'` and `'ember'` actions so designers can play the whole lifecycle from
  the bench.
- **`/frontier` chat lever family** mirrors it all in-world for Playwright
  verification (the /poi precedent).

---

## What deliberately does NOT change

- **Epoch stream math** — every existing determinism test stays green; ember,
  stage, and fallow are *ledger* truths layered on the same pure rolls.
- **The danger field** — no new anchor kinds. Claims don't calm the land;
  clearing does (and only through the ember/renewal loop, which moves trouble
  rather than deleting it).
- **Loot economy** — no pity, no player-state dials, ever. Bounties are new
  tables through the same flood-law analyzer; camp loot odds untouched.
- **Towns are sacred** — tier 0 never hosts hostiles; the creep forks to the
  road, it never sacks the square.
- **Protocol** — Phases 1–5 ride existing wires (chat, discovery/fade, waypoint,
  havens-style broadcasts). If a bespoke ceremony (raid horn banner, town-saved
  splash) earns a message later, it follows the 5-step house pattern with a v14
  changelog line.

## Sequencing note

Each phase is independently shippable and player-visible: Phase 1 alone delivers
the user's core ask (cleared camps fade, new ones rise elsewhere). 2 and 3 make
neglect and heroism legible. 4 and 5 make the *player's* land part of the story.
6 hands the weather to the designers. Build them in order; every phase ends with
the full workspace suite green and a live Playwright verification recipe in the
session notes.

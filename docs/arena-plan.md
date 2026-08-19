# THE SAND AND THE ROAR — the arena epic

Status: **EPIC COMPLETE 2026-08-16** — Phases 1-5 shipped (eb68922c
plan · d3d2300e content · d00ce609 server · f6168ad3 client ·
6daf67b1 venues), Phase 6 THE PROVING walked the same day: a
three-lens adversarial audit (21 confirmed defects, ALL fixed) and
the rig-lane live walk (lane 20, :8872/:5273, arx_arena20 fresh,
built client + preview per the BUILT-CLIENT lesson) collecting ALL
23 receipts — see §8 for the as-walked ledger.

The Dawnlands get their sport. A player walks up to the ringmaster's counter,
pays the stake, and the gates grind shut behind their party. Three rounds of
authored foes come through the far gate — trash packs, a named champion in a
collar of its own, sometimes a crowned boss — while the town watches from the
stands and the ringmaster calls the card. Survive the last round and the
purse-chest rises on the sand. Fall, and the crowd saw that too.

This is a CORE SYSTEM, not a set piece: matches, venues, the rank ladder, and
every dial live in ONE content doc the content team edits in the Studio without
touching code. Two venues ship with it (the Grand Ring at Silverfall, the Ford
Ring at Amberford); a third is one venue entry + one zone dressing pass.

---

## 1. The laws

- **THE RING IS REAL GROUND.** No instancing. A venue is authored town ground
  on the surface plane; a match is a CLAIM on it. Spectators watch because the
  world is simply there — the stands are level design, not a feature. (Planes
  stay in reserve for future event arenas; nothing here precludes them.)
- **THE CLAIM IS THE PARTY'S.** The soul who pays the stake claims the venue
  for their party. At gate-shut, party members standing on the sand are
  enrolled; everyone else on the sand is walked out through the gate with a
  courtesy line (the teardown-loop manners, `gameServer.ts:12686`). A per-beat
  guard keeps evicting creepers for the whole match.
- **THE CHEST IS THE PURSE.** Arena foes pay NO ground loot, stamp NO world
  lifecycle (POI/find/boss ledgers untouched), and credit NO quests. The
  boss-kind chest at match end is the only purse, warded to the enrolled until
  opened. Combat XP flows normally — the sport is honest training — and the
  mark-cap law already bounds it.
- **DEATH KEEPS ITS PRICE.** A fall on the sand is a real death: the pack
  spills per THE PACK SPILLS — but at the venue's GATE spot, never inside the
  shut pit (the rift carve-out law, applied to the ring: a spill behind locked
  gates is a locked room). The fallen ride home to a hearth as always. Their
  fellows fight on; if the party completes the card, the fallen still draw a
  half share of arena XP (`deathXpFrac`).
- **THE WIPE RESETS THE SAND.** All enrolled dead (or gone) = the match is
  lost: waves are swept silently (no loot, no burst spam), gates open, fee
  stays spent, venue rests a short cooldown. A wall-clock backstop (15 min)
  guarantees no claim outlives a hung match.
- **THE LADDER IS ITS OWN LADDER.** Arena rank 1..50 is meta-progression like
  faction standing, NOT a SkillId and NOT an XP multiplier (flood law).
  Gameplay reads TITLE BANDS, never the raw number (the factions band law).
  Rank gates the harder cards; titles are the bragging surface.
- **THE ANNOUNCER IS A THROAT.** Every called line comes out of the
  ringmaster's own mouth via `sayAloud` (speech bubbles, the spoken air) — a
  named actor with a VOICE.md card, obeying the dash ban and the breath
  budget. No disembodied narrator, ever.
- **AUTHORED OUTRANKS ROLLED.** Variety comes from seeded pool picks and
  crown-forge seeds (`forgeCrown` — THE SEED IS THE SOUL), but every part in
  every pool is authored and walks the validators whole. The forge composes;
  it never invents.
- **`arenaR` IS THE WALL WE ALREADY BUILT.** Wave seats carry `arenaR` sized
  to the pit, so every body fights inside the ring by the existing court law
  (`arenaRadiusFor` / `bossAtArenaRim`) — no new containment mechanism.
  (Naming note: `boss.arenaR` predates this epic and keeps its name; in prose
  it is the COURT radius, and this epic's noun is the MATCH/VENUE.)

---

## 2. Content layer — kind `arena`, one live doc (the factions shape)

`packages/content/src/arena.ts` — singleton live doc `(kind:'arena', id:'world')`
on the stances/factions FRONTIER pattern: live module state, frozen
`AUTHORED_ARENAS`, `replaceArenas`, `validateArenas` (unknown-key refusal,
authored-seed backfill for dials, explicit caps, dangling refs = warnings),
module-load self-test, `content_docs` persistence (zero schema work),
`GET/PUT/DELETE /dev/content/arena` in `mapsApi.ts`, boot seed in
`server/src/index.ts`, CMS bench section.

```ts
interface ArenaWaveEntry {         // the PoiGarrisonEntry grammar, on purpose
  npc: string;                     // NpcDef id (validated)
  count?: [number, number];        // default [1,1]; seeded roll
  levelOffset?: number;            // relative to the card's level
  name?: string;                   // a named keeper; shows on the call
  crown?: boolean;                 // forge a champion from the run seed (needs kit + pool)
}
interface ArenaRoundDef {
  title?: string;                  // 'The Warm-Up', 'The Champion's Turn'
  bark?: string;                   // ringmaster's line as the gate opens
  entries?: ArenaWaveEntry[];      // always fielded
  pool?: { pick: number; from: ArenaWaveEntry[] };  // seeded variety per run
  props?: number;                  // 0..8 destructible cover pieces scattered on the sand
}
interface ArenaMatchDef {
  id: string; name: string; blurb?: string;
  level: number;                   // the card's stated level; entries scale from it
  fee: number;                     // coins, taken at the counter
  rankReq?: number;                // arena rank gate
  rounds: ArenaRoundDef[];         // 1..5 (3 is the house standard)
  chest?: ChestKind;               // default 'boss'
  lootTable?: string;              // default arena_purse_t<band>
  xp?: number;                     // arena xp override; default levels the formula
  venues?: string[];               // restrict; absent = any venue whose band admits level
}
interface ArenaVenueDef {
  id: string; name: string;
  zone: string; plane?: PlaneId;             // surface unless said otherwise
  pit: { x: number; y: number; rx: number; ry: number };   // world coords, the sand
  gates: Array<{ x: number; y: number }>;    // gate tiles the match flips
  exit: { x: number; y: number };            // eviction / spill / walk-of-shame spot
  chest: { x: number; y: number };           // the purse tile, on the sand
  master: string;                            // actor slug — the announcer's throat
  levelBand: [number, number];               // which cards this counter lists
}
interface ArenasDef {
  venues: ArenaVenueDef[];         // cap 16
  matches: ArenaMatchDef[];        // cap 128
  ladder: {
    maxRank: number;               // 50
    xpBase: number; xpGrowth: number;   // xpForRank(r) = round(base * growth^(r-1))
    titles: Array<{ rank: number; title: string }>;   // band law
  };
  dials: {
    musterSec: number;             // claim → gate-shut (default 20)
    countdownSec: number;          // between rounds (default 15)
    chestGraceSec: number;         // purse stands after victory (default 120)
    cooldownSec: number;           // venue rest after any match (default 30)
    matchCapSec: number;           // the backstop (default 900)
    deathXpFrac: number;           // the fallen's share (default 0.5)
    aliveCap: number;              // max wave bodies alive at once (default 12)
  };
  barks: {                         // the ringmaster's stock lines, seeded picks
    muster: string[]; gates: string[]; round: string[];
    final: string[]; victory: string[]; wipe: string[]; chest: string[];
  };
}
```

Validator laws: rounds 1..5; entries+pool ≤ 8 per round; total possible bodies
per round ≤ `aliveCap`; `crown` requires the def to carry a kit and a
`crownPoolFor` family OR an authored `boss` block; fee 0..10000; level 1..60;
gate/exit/chest/pit coords must sit inside the named zone's rect; `master`
must be a real actor slug; every bark walks the dash ban (`—`, `–`, `--`
refused) — the validator enforces VOICE where it can.

**Purse tables**: `arena_purse_t1..t4` in `loot/tables.ts`, banded to venue
levels, walked by `lootTableErrors` so the flood law holds. Arena-exclusive
items (title-band vanity first, gear later) live ONLY in these tables — the
"only from the arena" hook with zero new systems.

---

## 3. Server — `arenaMind.ts` pure + GameServer seams

**Pure mind** (`server/src/game/arenaMind.ts`, the bossMind precedent, fully
slate-testable):
- `rollMatchPlan(def, seed)` → resolved rounds: pool picks, counts, per-entry
  crown seeds (`hashCoords(seed, round, idx)`), scatter offsets, prop spots.
  THE SEED IS THE SOUL: same seed, same card, bit-equal plan.
- `arenaXpFor(def)` (default formula), `xpForRank`, `rankForXp`, `titleFor`.
- Phase transition table: `idle → claimed → gates → round(n) ↔ breather →
  victory → idle` and `* → wipe → idle`.

**Match state** (beside `dungeons:2533`):
```ts
interface ArenaMatch {
  venueId: string; def: ArenaMatchDef; plan: MatchPlan; seed: number;
  phase: 'muster'|'gates'|'round'|'breather'|'victory'|'done';
  round: number; deadlineTick: number;
  members: Map<number /*characterId*/, { alive: boolean; enrolled: boolean }>;
  waveIdx: number[];              // registered spawn slots (freed per round)
  masterEid: EntityId | null;     // the announcer's anchor
  startedAt: number;              // the backstop clock
}
private readonly arenas = new Map<string /*venueId*/, ArenaMatch>();
```

**Seams** (every one already exists — line refs from the survey):
- Signup: dialogue hook `{kind:'arena', venue}` in `runDialogueHook:16701`,
  armed like `shop`/`keyforge` (fires on a good ending) → `{t:'arenaboard'}`
  with the venue's cards + the player's rank/xp → C2S `arenaqueue {match}` →
  validate (claim free, rank gate, fee via the `:12397` coin idiom, standing
  on the grounds) → claim.
- Gates: `setWorldTile` + `shutDoorTile`, ALWAYS behind `bodyOnTile:4821`
  (nudge-then-shut; the arena is exactly where a body stands in the doorway).
  Open is the `noteDungeonCleared:12822` ritual in reverse.
- Waves: `registerSpawns` seats with `level`, `name`, `crown`, and `arenaR`
  sized to the pit; ephemeral by construction — every seat freed via
  `freeSpawnSlot` at round end/reset (no respawn ever fires: seats are
  registered with the wave and freed with it). Engage through the ONE door:
  `npcAggro(..., { force: true })` spread across enrolled targets;
  THE FIRST BREATH (spawn+20 blind ticks) stays honored — force waits it out.
- Purse law: `NpcComp.arenaMatch?: string` tag; `killNpc` branches: no
  `dropLoot`, no `note*` stamps, no quest credit — XP untouched.
- Death: the death branch asks `arenaOfPlayer(cid)`; enrolled deaths spill at
  `venue.exit` (the rift carve-out shape) and mark `alive:false`. Wipe check
  after every member death/severance; logout/leave = severed.
- Ticking: `tickArenas()` on its own stagger offset in `tick():28859` —
  countdowns in ticks, round-clear checks (wave eids all dead), the creeper
  guard (non-members inside the pit ellipse → `teleport` to exit), the
  backstop.
- Victory: arena XP to every enrolled (dead at `deathXpFrac`), rank climbs
  persisted + announced (`announceLadderClimbs:8696` mold + herald), purse:
  `setWorldTile(closedChestTile(def.chest))` + `poiChests.set` with
  `{cell: 'arena:'+venueId, table}` + a ward case in `interactChest:4627`
  (enrolled only, until first open); reset after `chestGraceSec` reverts the
  tile and purges the entry.
- Persistence: **migration v39** `character_arena (character_id PK, xp, rank,
  wins, losses, updated_at)` — first-class, leaderboard-ready; `accounts.ts`
  load/save on the `character_pets` mold; loaded into `PlayerComp.arena` at
  enterWorld.
- Wire (additive JSON, still v33, recorded in the constants changelog):
  - S2C `arenaboard {venue, name, matches:[{id,name,blurb,level,fee,rankReq,
    rounds,locked?}], rank, xp, xpNext, title}`
  - S2C `arena {phase, venue, name, round, rounds, remainMs, foesLeft?}` —
    sent to enrolled members on every transition + a slow heartbeat.
  - C2S `arenaqueue {match}`, C2S `arenaleave`.
- Dev verbs: `/arena list | start <match> | round | win | lose | reset |
  rank <n>` in the chat ladder.

Announcer choreography per phase (all through the master's throat + fx):
muster bark → horn (`fx horn` = `sfx.warHorn`) → gates shut (`rattle` +
`arena:gates` sig) → per-round bark + `telegraph` floor clock on the sand for
the countdown (the fuse ring IS "next battle in 15") → round call →
victory bark + `nova` burst + purse `summon` moment → or the wipe line, said
once, plainly.

---

## 4. Client — the grand show

- **`ui/arenaBoard.ts`** + `styles/arena.css` (tokens only): the stakes board,
  opened by `arenaboard` (the shopopen pattern, no dock button). Match cards
  as plates: name, blurb, level seal, fee in coin, round pips, rank gate
  (locked cards show their price in rank, not hidden). Your ladder at the
  foot: title, rank, xp bar to next.
- **`ui/arenaHud.ts`**: the match card while enrolled — top-center under the
  boss banner's band (z 56 family), round pips (past/now/ignite, the
  boss-pip grammar), the between-rounds countdown bar (craftHud's
  one-write transition law), foes-left count. Change-key DOM law throughout.
- **Ceremony**: `raiseHerald` for the match card at gate-shut (kicker "THE
  GRAND RING", name of the card, fee/round facts) and for rank-ups; victory
  borrows the shared `lvl-*` chrome + `startLevelCeremony`-staged world fx.
- **`render/fxSigsArena.ts`** (`ARENA_SIGS`, spread beside `FOES_SIGS`):
  `arena:gates` (iron grind, dust curtain along the gate line),
  `arena:round` (the sand stirs — ring-run banner ripple), `arena:victory`
  (laurel burst + petal fall, hard-edged, ≤60 ops), `arena:purse` (the chest
  rises through the sand with a spoil-glint corona). Kinds ride existing
  wires (`charge`/`nova`/`summon`/`blast`) — no protocol change.
- **Sound**: `sfx.warHorn` for the rounds; a new `'arena'` TrackMood wired
  from the enrolled flag is the Phase 6 polish (the 2.5 s hysteresis, deck,
  and fade come free); until then the danger shelf carries the fight.
- Barks arrive as ordinary local chat with `eid` → speech bubbles for free;
  refusals ("The sand is claimed.", "Three more rounds.") ride `speak`
  (the risen word).

---

## 5. The two rings (venues + throats)

**The Grand Ring — Silverfall, the Fairstead.** The green that was "empty on
purpose, fair-days fill it" gets its fair, permanently: the sunken elliptical
pit (≈19×13 of sand-toned floor, `sink` + `fillEllipse`), a garrison-masonry
ring one course proud, TWO GateGarrison mouths (the fighters' gate south, the
beasts' gate north), raised spectator terraces east and west (`raise` level 1,
south-facing stairs per the stair law, benches one row in from the rims),
braziers, war banners, pennant lines, the ringmaster's counter by the south
gate, and the meeting oak KEPT — the green still breathes around the ring,
and the Fairstead keeps its name. Band [15,40].

**The Ford Ring — Amberford.** A modest palisade ring on the commons' south
edge echoing the Market Round's stone-oval idiom: pit ≈11×8, palisade +
PalisadeGate, two stands of settle-benches, the counter under an awning.
Band [3,16] — the get-your-feet-wet stage. Dawnmead stays arena-free (the
most constrained town in the game, and the starter valley needs no stakes).

**Throats** (VOICE.md cards to be added, both wit-granted showman-class,
scarcity law respected — they spend it on the call, not the counter):
- **Ringmaster Cato** (Silverfall, the Grand Ring): an old pit fighter who
  outlived his own card and bought the book. Wants the crowd fed and nobody
  buried. Quirk: names every fighter's style before their name. Cadence:
  hall voice on the call, counter-quiet off it; one flourish per card.
- **Old Serle** (Amberford, the Ford Ring): retired Toll War watchman who
  runs the small ring like a drill yard. Wants first-timers to lose SMALL.
  Cadence: count-and-command, kind verdicts, no theatre; "again" is praise.

Each: actor def + dialogue tree (the counter talk: what the ring is, the
rules said plainly, the `arena` hook on the good ending) + routine (counter
post, evening walk) + placements in the zone builders.

**The first card slate** (~12 matches across both bands; every foe an
existing faced voice): goblin warm-ups, boar pens, skeleton courts, wolf
packs with a crowned Old-Fang-family champion, a gnoll warband card, one
authored-boss headline card per venue tier, pool-varied so no two runs of
the same card field the same sand.

---

## 6. Phases

1. **THE LAW** — this document. ✅
2. **THE CARD AND THE LADDER** — content kind `arena` end to end: types,
   validator + self-test, authored seed doc (venues stubbed until Phase 5
   coords land), live-doc wiring, endpoints, purse tables, tests.
3. **THE RING KEEPS ITS OWN LAW** — server: arenaMind + match lifecycle,
   dialogue hook, fees, gates, waves, purse law, death/wipe, chest, XP/rank,
   migration v39, wire messages, dev verbs, slate tests.
4. **THE GRAND SHOW** — client: stakes board, match HUD, herald ceremonies,
   fx signatures, sfx wiring, rank on the board.
5. **THE TWO RINGS** — venues built in the zone code, throats cast (VOICE
   cards, actors, dialogues, routines), the card slate authored, venue
   coords sealed into the arena doc.
6. **THE PROVING** — rig-lane live walk (a full card start to purse, a wipe,
   a creeper eviction, a mid-match death spill at the gate, rank-up
   ceremony), polish (arena TrackMood, spectator touches), the as-built
   ledger written back into this doc.

## 6b. As built (deltas from the plan above)

- The gates fx rides kind `field`, not `charge` — charge is a pure
  instrument client-side (no signature crown) and THE BAR COMES DOWN
  would never have drawn. Caught in Phase 4, fixed server-side.
- The chest-law overlay (`poiChests`) grew an optional `level` — the
  purse rolls at the CARD's level, never the boss-chest floor 20 (a
  Ford Ring warm-up must not pay capital steel).
- Venue coords are sealed from the builder's own fillEllipse cell
  math (grand pit (-476,-126) rx8/ry5.5 with six gate tiles; ford pit
  (583,46) rx4.5/ry3.5 with two). The Grand Ring's stands are benches
  on the pit-side column ONLY — the first alternating pattern plugged
  the two-wide aisle diagonally and the reachability sweep caught it.
- The Ford Ring moved one band south of its first placement (the
  orchard's y96 tree row ran under the sand; the tree census caught
  it). The town ledgers were re-pinned honestly: Amberford 31
  residents, Silverfall 94 souls / 49 ramps / 35 garrison gate tiles.
- Wave seats are ephemeral `spawnNpc(-1)` bodies (not registerSpawns
  slots): full lifecycle control, swept by the one arenaReset; the
  physical walls + shut gates are the containment, `arenaR` rides
  only on crowned champions (forge default 14-20).
- Board meter shows lifetime xp over the next threshold (the wire
  carries no per-rung floor yet — polish debt below).

## 7. Open questions / deferred by design

- PvP wild arenas (the roaming chest that opens a free-for-all) — the venue/
  claim/round machinery is built to host it; the PvP damage law is the real
  gate, deferred whole.
- Event arenas on scratch planes (the machinery is plane-clean by law).
- An arena purveyor (rank-banded exclusive shop) — v1 exclusives live in the
  purse tables; the shop wants rank-gated stock, a small later cut.
- Leaderboard surface (v39 table is query-ready; UI later).
- Spectator HUD (send `arena` state to non-members near the pit) — polish.

## 8. Phase 6 THE PROVING — as walked (2026-08-16, rig lane 20)

**THE AUDIT** — three adversarial reviewers (server engine, content
+ mind, client), 21 confirmed defects, all fixed the same session:
- THE HOUSE IS NOT A MARK: opening your own purse charged THEFT
  under town law (both rings stand on town ground under witnesses) —
  the `arena:` cell is exempt at the one theft choke.
- THE BACKSTOP SPARES THE WON CARD (it was banking a loss on top of
  a banked win); THE SAND'S BODIES ARE NOT FOR COURTING (a tamed
  wave body wedged the round open forever); a crowned wave body's
  raised court now rides THE PURSE LAW (summons inherit arenaMatch);
  arenaLeave lost its cross-map ferry (walk-of-shame only from the
  sand; a muster decline is a roster step-off); fellows already on a
  live card are never double-enrolled.
- THE VENUE IS SNAPSHOTTED AT CLAIM (the audit's worst leak: a live
  Studio venue edit mid-match stranded shut gates and an immortal
  unwarded purse — all teardown geometry now reads the snapshot).
- The offline payout no longer races a relog (the live bank wins);
  the strike-kills-last-member path no longer leaks a pose entry on
  the destroyed striker; the guard sweep also clears gate-tile
  squatters (who otherwise held the bar open AND robbed the death
  spill of its gate).
- Client: `welcome` lowers a stale match card (the severed-member
  relog); plain state fans reach the LIVING only (a corpse no longer
  rides home wearing a live card); THE WIPE KEEPS ITS BEAT (no `off`
  chases the wipe — the client holds the lost frame 2.6 s and lowers
  itself); the gates sig is frame-stable (draws hoisted above the
  wake gate); the match card steps below the boss banner via
  `body.boss-up`; locked plates carry aria-disabled and no false
  focus-gold.
- Content: venue `plane` must name a standing plane; the pit RIM
  must stand inside the zone; a card pinned to an undeclared venue
  is an ERROR and an off-band pin warns; the dead-counter lamp runs
  on the resolved lists; malformed exit/chest no longer double-error;
  Serle's midday walk moved off his own palisade.

**THE WALK** — all 23 receipts collected on the wire (wrapped
handleMessage, never DOM polling): the Studio PUT retuning dials
live; both counters raising their boards through the good ending
(the grand board showing the tyrant LOCKED at rank 10); the fee
taken to the coin; gates falling with the iron set-piece on the
field wire (tile 295→296 and back); three rounds with breather
clocks; victory; the purse rising (chest tile 119→120), WARDED
against a second account's hand ("The purse answers the card that
won it"), paying the winner +49 coins with NO theft charged; the
spectator fan reaching the stands; the muster walk-away refunding
the stake; the creeper walked out to the exit at gate-shut; the
ladder climbing to rank 1 with its ceremony on the third card; the
wipe landing with its held beat and the pack spilling at the GATE
(583.5, 54.5 exactly); and the champion round fielding a forged
crown live — "Snagtooth the Wood's Dread, Matriarch of the Far
Dens", two phases, dread banner up, match card stepped below it.

**Walk-harness truths** (for the next rig session): the Hero's
Mirror swallows every key until its button is clicked (chat verbs
pass through it — the deceptive half); character names are globally
unique across runs (stamp them); the typewriter law means a LONG hub
line needs one advance press before the choice plates stand; a
respawn moves the prover across the map (re-tp before re-queueing);
the wipe spills the prover's own walk-kit coins (restock); vite
configs in the repo tree get housekept by neighbors — keep the lane
config in the session scratchpad with `root` pointed at the client.

**Polish landed with the proving**: `xpPrev` on the board wire (the
meter climbs from the rank's own floor), the spectator state fan
(spec-tagged, self-clearing), the enrolled fight riding the danger
music shelf (a bespoke arena deck is future audio content), the
Laurel of the Sands in the t4 purse (the exclusive law,
test-pinned to exactly one table), and the muster walk-away chip on
the match card (the ONE pointer-enabled control).

## 9. THE SAND ANSWERS THE PAD (2026-08-18) — the room was mouse-only

The epic shipped both of its surfaces pad-blind. Found by a controller
player who opened the stakes board and could not move.

**The stakes board.** The plates were plain `<button>`s with no
`[data-nav]`, so the ONE navigable thing in the room was `dressPanel`'s
✕ chip — the ring landed there and had nowhere to walk. Fixed in
`ui/arenaBoard.ts` + `main.ts`:

- **THE PLATE IS A STOP** — every card carries `data-nav` /
  `data-navkey="arena:<id>"` / `data-acta`, inside the cards'
  `[data-region]`, so the ring walks the list and the action strip
  speaks the plate's verb (Take the sand / Locked).
- **THE HERO LANDING** — the board names its seat on open through a
  `requestFocus` hook (the loot tray's wire): the first plate you could
  actually buy, never the ✕. Only in pad mode.
- **A GATED PLATE IS STILL A STOP** — locked cards stay navigable (the
  rank chip is part of the intrigue, §1) and refuse in place with an
  ember flash. A hole in the walk would be worse than a no.
- **THE BOARD IS A COUNTER TOO** — `cycleScreen` returns early while
  the board stands, so LB/RB can't walk the screen shelf out from under
  a room the ringmaster opened (the anchored-counter law).

**The muster chip.** `arena-hud-leave` is a HUD chip, and the pad only
captures while a room is open — during the muster nothing is. The
window now borrows one button the way build mode does: **Ⓨ Walk away**,
taught by `nav.showModeStrip`, pad mode only. Both the chip's
visibility and the button read ONE truth, `canWalkAway(game)` in
`ui/arenaHud.ts` (enrolled · phase 'muster' · not a spectator);
build mode, the cinema, and any open room all outrank the press.

**Two art wounds in the same room.** `--iron-edge` was never a token,
so the whole `border` shorthand on `.arena-card` died at
computed-value time and every plate had been shipping FRAMELESS — it is
the seal's own `--line-strong` now. The round pips were filled with
`--brass-ink`, which is the ink for text stamped ON brass (#241503):
on the plate's dark leather the count read as nothing. Brass proper, a
hair larger. The board widened 30rem → 36rem so "The Grand Ring" clears
its own banner instead of ellipsing. Audit the whole file's tokens
against `ui/kit/tokens.ts` when you touch it — an undefined var doesn't
warn, it silently deletes the property.

**Proving.** Two fake-pad harnesses (scratchpad `prove-arena-pad.mjs`,
`prove-muster-pad.mjs`) on the shared 5173 lane. The board is raised by
calling `game.events.onArenaBoard(...)` and the match by
`game.handleMessage({t:'arena',…})` — the real code paths, without the
walk to Cato. Harness truths: a fake pad MUST advance
`Gamepad.timestamp` (a getter on `performance.now()`); the look creator
is modal and swallows the pad until `#look-confirm` is pressed; and
`hideStrip()` only adds `.hidden` without emptying the strip, so read
the class, never the leftover text.

**Known and deliberate:** walking DOWN off the last plate leaves the
board for the dock rail (and LEFT comes back). That is the house
grammar, not an arena wound — Standing and the Key Ring spill the same
way at the bottom of their lists.

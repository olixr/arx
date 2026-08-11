# The Drawn Breath — casted & channeled arts

Status: **PROPOSAL — awaiting green-light** (design review 2026-08-11).
Companion to docs/techniques-v2-plan.md (the ladder + THE PAYOFF BRACKET),
docs/secret-arts-plan.md (the secret shelf), THE HELD SIGIL (ground aim),
and THE THREAT LAW (`shared/sim/damage.ts`). Read those before touching
anything here.

The brief: every player ability today executes on the press edge. The whole
combat loop is *press, instant payoff, wait for the radial* — and with four
slots and no resource system, the only texture between presses is the basic
attack. The user wants two new delivery grammars, built foundationally rather
than bolted on:

- **CASTED** — the art winds up for a beat before it fires. You may run while
  casting at full stride; **standing still quickens the wind-up ~1.25×**, so
  planting your feet is a read your enemies (and allies) can see and you are
  rewarded for. Casted arts carry heavier payloads than instants: projectiles,
  big detonations, grand summons.
- **CHANNELED** — the art pours out continuously over several seconds and
  **requires holding still; moving breaks it**. Beams, links, heals, and
  sustained storms: the whirlwind you spin at the center of, the icicle fall
  you hold over a courtyard. Channels buy the largest payloads because they
  pay the largest price — seconds of rooted commitment.

The point is gameplay variety and build identity: instants stay the reliable
hands, casts become the committed reads, channels become the held notes. Two
players of the same school should *sound* different in a dungeon.

---

## Part 1 — Audit: what exists today (verified in code, 2026-08-11)

### Execution is instant, but the seams are already cut

- One interpreter door: `castAbility` (`gameServer.ts:13949`) runs
  synchronously inside `processPlayerInputs` on the press edge, shared by
  player casts, NPC specials, and trinkets. `tryCastAbility:13777` validates
  (cooldown, freeze, dormant seat, ground-aim clamp via THE ONE RULER) then
  pays everything up front (`:13830-13836`): cooldown, `castFreezeUntilTick`,
  reveal, action cancel, `PoseState.Art`.
- **`castFreezeTicks` already exists on virtually every ability**
  (`shared/sim/abilities.ts:372`, 3–6 ticks) — a *post-fire* root, mirrored
  in the client predictor **keyed on input seq** (`prediction.ts:98-108`,
  `clientGame.ts:705-712`). This is the proven no-rubber-band pattern: both
  sides derive the same window from the same content def; no wire message.
- By contrast, **chill is server-only and visibly mispredicts** every frame
  (`Predictor.frameSpeed` has no chill term) — the standing lesson that any
  new movement rule must be client-derivable from the player's own input
  plus content, never a server surprise.
- Delayed machinery already on the tick loop: `PendingBlast` (fuses,
  `followCaster`, `tickBlasts:15005`), `ActiveField` (pulses,
  `tickFields:15062`), per-entity `statuses`/`summons`. `pulse_nova` and
  `flurry` are already "press once, deliver over beats while you keep
  moving" — instant-commit multi-beat grammars, NOT channels.

### The one stand-still law, and the one shipped channel

- `player.action` (`PlayerAction` union, `gameServer.ts:600`) is the game's
  single occupied-state machine — gather/craft/build/harvest/milk/tame/tend/
  demolish — and **the single movement-cancel line in the codebase**
  (`gameServer.ts:20735`: move *intent* > 0.01 on any drained frame cancels
  with reason `'moved'`). It already owns the own-player progress bar
  (`S2CAction {state, ticks}` → `game.action` → `drawActionProgress`,
  `renderer.ts:33058`) and is cancelled by casts (`'cast'`).
- **`tame` is the proof the rail carries a combat channel**: shape-intercepted
  before `castAbility` (`:13798`), pays its cooldown, rides
  `TameAction.ticksLeft` with `channelTicks` (`abilities.ts:441` — currently
  documented tame-only), holds `PoseState.Art` for the whole channel + 4, and
  keeps watchers honest by **re-emitting an overlapping fx pulse every 20
  ticks** at the live position (`tickTame:10132`). Movement breaks it through
  the generic `'moved'` cancel; the keeper's own wounds deliberately don't.
- `player.stillTicks` (`gameServer.ts:1270`, reset on **resolved** motion at
  `:20867`) is the existing standing-still counter (Bulwark reads it).
  Note the asymmetry: action-cancel fires on *intent*, stillTicks on
  *resolved motion* — pushing a wall cancels a gather but counts as still.
- Archery's bow draw is the proto-cast that already shipped: hold Attack,
  move at `DRAW_MOVE_FACTOR 0.55`, full draw pays more. The new grammar
  generalizes that feel to the technique slots without touching it.

### Price, poses, wire

- **There is no resource system** — no mana, no stamina. An ability's whole
  price is cooldown + castFreeze + stealth reveal. Commitment time is
  therefore the one honest new price axis, and the balance model is ready
  for it: THE LADDER MODEL (`content/src/ladderModel.ts`) prices payload per
  cooldown-cycle, and THE PAYOFF BRACKET (`ladder.test.ts:183`) already
  distinguishes one-press instants (≤0.75× a line fighter) from multi-beat
  payloads (≤1.1×). `HONABLE` already lists `castFreezeTicks` and
  `channelTicks` — rank steps can dial the new axes from day one, and
  `RankStep` is `Partial<AbilityDef>`, so **any new timing field is honable
  automatically**.
- Watcher surface: the snapshot pose byte (`PoseState`, next free value 18;
  a new value historically = protocol bump, v25 precedent) — but the tame
  law shows a long-held `Art` pose + a per-beat fx train reads clearly with
  **zero new snapshot fields**. `S2CFx` kinds are additive; fx carry world
  coords, no caster eid (followCaster resolves server-side).
- Client FX can carry sustained visuals today: FX v5 emitters live up to 12s,
  return live handles that can be steered to follow a body, and support
  converging (`outward < 0`) charge-up deployments. Nothing holds a handle
  across frames yet — that's a seam, not a wall.
- Codex `.bench-stats` (`panels.ts:2792-2818`) surfaces damage/cooldown/
  range/etc but **not** `castFreezeTicks`/`fieldTicks`/`channelTicks` — new
  timing must be given player-facing words (the `speedWord` precedent).
- Input drain (THE STEADY HAND): a tick may drain **0, 1, or 2 frames** —
  every per-tick cast/channel rule must be stated against that.

---

## Part 2 — The laws

### LAW 1 — THE DRAWN BREATH (casted delivery)

**`castTicks?: number` on `AbilityDef` turns any shape into a casted art:
the press starts a wind-up; the shape executes through the one door when the
wind-up completes. You run at full stride while casting. Standing still
quickens the breath.**

- **Delivery is an axis, not a shape.** All 17 executor shapes gain the
  casted variant for the cost of one authored field — a casted
  `projectile_fan`, a casted `ground_aoe`, a casted `summon`. The shape
  stays WHAT happens; `castTicks` is WHEN.
- **THE PLANTED FOOT**: progress accrues per tick as
  `progress += still ? CAST_STILL_FACTOR : 1`, complete at `castTicks`.
  `CAST_STILL_FACTOR = 1.25`, ONE shared constant (`shared/sim/combat.ts`,
  THE ONE RULER pattern) read by server accrual, client predictor, and the
  bench copy — never authored twice. "Still" = the tick's **resolved**
  `moved` flag is false (stillTicks semantics: dodge counts as moved,
  wall-pushing counts as still; a 0-frame lag tick counts as still — a
  laggy hand is never punished twice).
- **Pay at fire, not at press.** Cooldown, reveal, `castFreezeTicks` (kept,
  most casted arts author it 0 — the release is the payoff), pose moment,
  and the strike itself all land when the breath completes. A cancelled
  cast costs nothing but the time you spent winding.
- **Cancel grammar** (mirror of THE SWALLOW LAW, both sides):
  dodge press cancels (the canonical bail-out — and client-side the held
  button is swallowed until it lifts); re-pressing the same slot cancels;
  sheathe, mount, death, and teleport cancel. **Damage does NOT push back
  or cancel at v1** — no pushback dial exists and none ships until the
  grammar has lived. Other slots' presses are refused quietly while a
  breath is drawn (predictable > clever); basic attacks are blocked
  (the existing `stillCasting` gate extends).
- **Server state**: `player.casting?: { slot, ab, aim, aimPt?, progress,
  total }` on `PlayerComp` — deliberately NOT the action rail (the rail's
  law is move-cancels, and casted arts move). Ticked in
  `processPlayerInputs` beside the freeze/draw handling. Starting a cast
  still cancels any running action (`'cast'`), exactly as today.
- **THE HELD SIGIL composes**: for ground-aimed casted arts, hold-to-aim
  arms and steers, release *begins the breath*, and the stamped `tx/ty`
  is held in the pending cast — the ghost ring hardens into the telegraph.
- **Prediction & wire**: the client mirrors the whole wind-up from its own
  input + content (press edge starts the local bar; its own predicted
  stillness applies the same factor), seq-keyed like castFreeze — the own
  cast bar never waits on the server. A small additive `S2CCast
  { state: 'start' | 'fire' | 'break', slot, ticks }` keeps the HUD honest
  on refusals and lets watchers hear the start (see LAW 4). No protocol
  bump: additive message, no new snapshot fields.

### LAW 2 — THE HELD NOTE (channeled delivery)

**`channelTicks` generalizes beyond tame: any shape + `channelTicks` becomes
a channeled art riding THE ACTION RAIL. The shape's strike executes as a
pulse every `pulseEveryTicks` for the channel's life. Moving breaks it.**

- **One stand-still law forever.** Channels are a `PlayerAction` variant
  (`{ kind: 'channel', slot, ab, aim, tx?, ty?, ticksLeft, total }`) —
  they inherit the single movement-cancel line, the S2CAction progress
  wire, mutual exclusion with gather/craft/build (you cannot channel at a
  furnace), cast-cancels-action, and the tame precedent whole. We never
  grow a second "hold still" mechanism.
- **The pulse IS the shape.** Each beat re-executes the shape's strike at
  the live caster position: a channeled `melee_arc` with `arc: 2π` is the
  whirlwind spin; a channeled `ground_aoe` staked at `tx/ty` is the icicle
  fall; a channeled `beam` re-strikes its corridor; a channeled `self_buff`
  heal pulse is the mend held open. **Aim is live** — beams and arcs
  re-read the caster's aim each pulse (the stick steers the beam; the feet
  stay planted), ground-staked channels hold their point.
- **Pay at the first note.** Cooldown lands when the channel starts;
  breaking early forfeits the remaining pulses — that forfeit IS the price
  that buys the payload, and it makes restart-spam self-punishing without
  any new rule.
- **Break grammar**: movement intent (the rail's own law), dodge, sheathe,
  mount, another ability press, death, teleport, disconnect. **Damage does
  NOT break a channel** (the whirlwind must survive being hit — tame's
  clause, kept). Per-shape validity ends it early (a link's target dies).
- **Whiff-0 is sacred per pulse.** Every damaging beat rolls
  `rollDamage` 0..max independently; a 0 writes nothing — no floor, no
  chip, no XP, no proc credit. XP flows per landed pulse through the one
  grantXp door automatically (channels train their school by what lands,
  like everything else).
- `tame` keeps its bespoke handler (shape-intercepted, as-built) — it
  becomes the first citizen of the generalized field rather than a special
  case: its `channelTicks` doc comment loses the "tame only" clause.

### LAW 3 — THE PRICED BREATH (balance)

**Commitment time is a priced dimension of THE LADDER MODEL, tuned by the
tests, never by ear.**

- Cast time joins the cycle denominator at its best case:
  `cycleSecs = cooldownSecs + castTicks / TICK / CAST_STILL_FACTOR`
  (price the planted cast — the moving cast is strictly worse and needs no
  extra tax).
- Channels price their rooted seconds as an explicit **ROOTED PREMIUM**:
  the allowed payload band widens per second of required stillness
  (constant proposed at +6%/s, capped; tuned in Phase 3 with the bracket
  suite judging). A channel's payload is delivered across its window, so
  THE PAYOFF BRACKET's existing multi-beat cap (≤1.1× the line fighter)
  binds it exactly as it binds fields and flurries today — channels get
  *wider* not *unbounded*.
- The SECRET BAND and SHELF PAYOFF BRACKET inherit all of this for free
  (both read the ladder model — the reason it lives in one file).
- Whiff-0, the TTK brackets, and NPC-side scaling stay untouched.

### LAW 4 — THE VISIBLE WORKING (presentation)

**A cast or channel must be readable at a glance — by the caster, by
allies, and by enemies — using the rails that exist.**

- **Own HUD**: the world-space action bar generalizes — channels ride it
  natively (they are actions); casts get a sibling bar in the same dialect
  drawn from local state, tinted to the art's `color`, that **visibly
  quickens when planted** (the 1.25× is a felt reward, not a hidden stat).
  The hotbar well wears a new `.winding` / `.channeling` class beside the
  shipped `.aiming` breathing gold — the wipe element already knows how
  to paint a timed fill.
- **Watchers**: hold `PoseState.Art` for the duration (tame's law — no new
  pose value, no protocol bump at v1) + the pulse train: a channel's
  strikes broadcast their own per-beat fx already; a cast's start
  broadcasts one converging charge-up fx (`outward < 0` emitters — the
  matter library's charge dialect) sized to `castTicks`. The overlapping
  re-emit law (tame `:10132`) covers long quiet channels.
- **Codex words** (VOICE.md, DASH BAN apply): `Cast: 1.5s (1.2s planted)`
  and `Channel: 6s` rows join `.bench-stats`; the desc line carries the
  identity ("hold the note and the storm holds with you").
- **Audio**: cast start gets a rising drawn-breath one-shot; the fire pays
  it off; channels get a per-pulse tick through the existing spatial fx
  routing. A looping channel voice (a real sustained synth with a stop
  handle) is a named FUTURE DOOR — sfx.ts has no loop machinery today and
  v1 does not build it.
- **FLOURISH CONTRACT stands whole**: no new art ships without its bespoke
  FX face, icon, rank-IV visible signature, and VOICE bench copy.

### LAW 5 — THE CURATED VOICES (content doctrine)

**The grammars ship through a small, intentional roster — every art must
justify WHY it breathes or holds. No blanket conversions, no bolt-ons.**

- **Conversion candidates** (existing seats whose authored fantasy already
  begs — each is a per-art decision at green-light, retuned in band):
  - `maelstrom` (arx 45, pull + chill storm) → channeled: the vortex you
    hold open.
  - `storm_of_shafts` (archery 45, the stand-in barrage) → channeled: feet
    planted, sky darkened.
  - `starfall` / `daybreak` (arx 50 grand payloads) → casted: the big read.
  - `arrow_tempest`, `thousand_cuts` (flurries) explicitly STAY instant —
    the moving multi-beat is their identity; the contrast is the point.
- **New voices, first wave** (~8, spanning both grammars and ≥5 shapes,
  seated as secret arts — RANK_DEBT = 0 law: each ships WITH its three
  rank steps — plus 1–2 unwritten pages for the deed axis). Concepts, to
  be named under VOICE:
  - the whirlwind held: twohand channeled `melee_arc` full-circle spin
    (the user's flagship).
  - the icicle fall: arx frost channeled `ground_aoe` staked at range
    (the user's second flagship).
  - the drawn lance: arx casted `beam`, planted cast into a corridor ray.
  - the leech link: sneak or arx channeled single-target beam with
    `drainFrac` — the sustained life-drink tether (tame's line fx dialect).
  - the held mend: shield channeled `self_buff` heal pulses — the vigil.
  - the great shot: archery casted heavy single projectile (distinct from
    bow draw: it is the technique slot's committed read, not the basic).
  - the summoned bulwark: casted `summon` with presence worth the breath.
  - the ground sanctified: shield or combat channeled field that holds
    while you hold.
- Rank steps hone the new axes exactly like any number: a rank-IV channel
  holds longer or pulses faster; a rank-IV cast draws quicker — `HONABLE`
  already permits it; the ladder model prices it.

---

## Part 3 — Why this fits the machine we already built

- **Zero new persistence, zero protocol bump.** No DB change of any kind.
  Wire = one additive S2C message + additive fx kinds; the snapshot is
  untouched; old clients degrade to "Art pose + fx", which is the v1
  presentation anyway.
- **One stand-still law, one bar, one door.** Channels reuse the action
  rail's cancel line, wire, and bar; casts fire through `castAbility`
  unchanged — every shape executor, whiff-0 site, XP door, and FX
  broadcast is inherited rather than reimplemented.
- **Prediction stays honest by construction.** Both grammars derive
  entirely from the player's own input + content defs (the castFreeze
  seq-keyed pattern), so nothing new rubber-bands. The one asymmetry we
  accept (server judges stillness by its own resolved tick) is bounded to
  ±1 tick of bar time, cosmetic only.
- **The balance rails were built waiting for this.** Cycle model, payoff
  bracket, secret band, honed ranks, and the bracket tests all extend by
  formula — the epic adds a dimension, not a second law.
- **The four-slot loadout gains texture without new keys.** THE ONE KEYMAP
  stands; instants/casts/channels mix across Q/E/relic/sigil seats, and
  the loadout choice ("how much of my kit dares to hold still?") is the
  new build identity — exactly the variety asked for.

## Part 4 — Implementation phases

1. **THE DRAWN BREATH** — shared `castTicks` + `CAST_STILL_FACTOR`;
   `player.casting` state + accrual + pay-at-fire in the server input
   path; cancel grammar; client predictor mirror + SWALLOW LAW extension +
   cast bar + `.winding` well; `S2CCast`; convert ONE pilot art behind a
   review (proposed: `starfall` casted). Slate tests: accrual truth table
   (still/moving/0-frame/2-frame ticks), pay-at-fire, every cancel edge.
2. **THE HELD NOTE** — `channel` action variant + pulse interpreter over
   the shape executors (live aim, staked points, per-pulse whiff-0);
   break grammar; bar/pose/fx train; pilot: the whirlwind held. Tests:
   pulse cadence, break roster, damage-does-not-break, forfeit-on-break.
3. **THE PRICED BREATH** — ladder model gains the commitment denominator +
   ROOTED PREMIUM; payoff-bracket clauses; convert the agreed candidates
   in band; the ledger appendix updates.
4. **THE NEW VOICES** — the first-wave roster: defs + rank steps + FLOURISH
   CONTRACT (bespoke faces incl. the charge-up and held-note dialects,
   icons, VOICE copy) + codex `Cast:`/`Channel:` rows + secret-shelf
   seating (ANCHOR RULER, SECRET BAND).
5. **THE PROVING** — live receipts over the real wire (`prove:` lane):
   planted vs moving cast timing, channel break-on-move, dodge bail-out,
   reconnect-mid-channel (clean break, RECONNECT MIRROR law), 2-frame
   catch-up ticks, spectator fx train; netcode feel pass on the rig.

## Open questions (recommendation first)

- **Convert shipped rung arts, or new arts only?** Recommend the small
  curated conversion set (maelstrom, storm_of_shafts, starfall) — the
  grammars need at least one voice on the free ladder, not only behind
  secret/deed walls; each conversion is individually approved.
- **Damage pushback on casts?** Recommend none at v1; name it a future
  door. The counterplay is visible commitment, not interruption — and no
  player-stun mechanic exists to build on.
- **Channel cooldown at start or at end?** Recommend start (forfeit is the
  early-break price; end-paid cooldowns double-punish breaks and feel
  terrible with lag).
- **Slow the caster while winding?** Recommend no — full stride while
  casting IS the grammar's identity; the planted bonus is the carrot. If
  balance later wants a heavier cast, `castTicks` is the dial, never a
  move slow.

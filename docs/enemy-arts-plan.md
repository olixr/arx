# The Wild Draws Breath — the bestiary learns to cast

Date: 2026-08-11. Status: **ALL FOUR PHASES SHIPPED, same session** —
see §As built at the end of this document for the canonical record.
Sibling of docs/cast-channel-plan.md (THE DRAWN BREATH gave players wind-up
and channel delivery; this epic gives the OTHER side of every fight the same
vocabulary). Read that plan's audit first — the two systems deliberately share
one interpreter, one telegraph grammar, and one balance philosophy.

## Part 0 — The brief (user mandate, 2026-08-11)

Enemies are all basic melee or basic ranged. No enemy in the game casts a
technique. Combat is therefore repetitious and gameable: any enemy, up to the
highest bands, can be defeated by pulling and circling because nothing they do
punishes movement, area, or time. The mandate:

- A thorough, curated, content-driven system giving NPCs their own abilities
  and techniques on their own cooldowns, with real casting intelligence.
- Abilities must MAKE SENSE per creature (a bat's bite that bleeds, a goblin
  caster's fireball, a poison ring from a goblin shaman).
- Configuration lives in content: which abilities, what cooldowns, what ranks
  and strategies. Higher bands get more and stronger voices; low bands get
  sprinkles so new players learn the read.
- Champions, elites, and bosses are the headline customers.
- Visually stunning: full FX polish, integrated with the shipped FX v5 library.
- Fun and challenging, never unfair: every strong hit is telegraphed and has
  honest counterplay. This is a foundational rail we build on forever.

## Part 1 — Audit: what exists (verified in code, 2026-08-11)

The complete survey lives in the session record; the load-bearing facts:

- **`castAbility` (gameServer.ts:14248) is already generic.** One interpreter
  for player arts, trinkets, AND NPC specials; `fromNpc: boolean` picks the
  target polarity and the `NPC_POWER_PER_LEVEL 0.10` damage curve per THE
  THREAT LAW. Eight shapes already carry a working NPC branch end to end:
  `nova, ground_aoe, ground_field, beam, leap_slam, pulse_nova, flurry,
  projectile_fan`. Three are player-target-only regardless of the flag
  (`melee_arc`, `dash_strike`, `chain_zap` iterate `this.npcs`), and
  `self_buff`/`summon` are player-shaped (`applySelf` early-returns without a
  PlayerComp; summon builds decoy props).
- **`NpcDef.special { ability, everyTicks }` is the whole enemy-ability system
  today** (npcs.ts:5). One ability, one timer, a hardcoded `dist < 4.5` gate,
  instant fire with a 10-tick Art pose. Five defs use it: skeleton_champion +
  troll (ground_slam), dire_wolf (rallying_howl), gnoll_champion
  (ravening_cackle), elder_great_owl (hushing_screech). The four NPC abilities
  sit in abilities.ts under `// ---- npc specials` with `cooldownTicks: 0` and
  the standing comment: **"NPC pacing lives on the NpcDef, not the ability."**
- **No NPC cast time exists.** `castTicks`/`channelTicks` are player-engine
  fields; the NPC path fires on the tick. `windupTicks` (6–8 ticks) is the
  basic-attack telegraph and the proven whiff/dodge window: step out of reach
  during the windup and the blow misses honestly.
- **The brain has clean seams.** `tickNpcs` runs one state machine
  (idle/suspicious/investigate/chase/return/seekhelp/search); `npcAggro` is
  the one door into chase; shock already zeroes `windupTicks` (the interrupt
  precedent); "no swinging at ghosts" gates strikes on the target being seen
  within the perception period; `alertVelX/Y` records the quarry's stride
  ("he went that way") — an existing motion predictor nothing offensive uses
  yet. `specialCooldown` seeds to 60 at spawn ("never open with the special").
- **The wire is ready.** `S2CFx` is the one effect message, additive by kind,
  and carries `id` (ability id) + `color` — the entire client FX pipeline
  (`FX_STYLES`, `SIGNATURES`, matter library) keys off that id and degrades
  gracefully for unknown ids. `telegraph` fx already paints the stained-floor
  countdown ring for every watcher. `S2CCast` is own-player-only; watchers of
  a PLAYER cast read pose + telegraph — the same reads an enemy cast needs.
  Snapshot has no room (17-byte stride) and needs none: pose byte +
  eid-carrying fx cover the whole presentation.
- **Balance contracts that bind us:** damage.test.ts TTK brackets (fresh vs
  bear16 = 1.5–4 swings etc.) move deliberately or not at all; whiff-0 is
  sacred on direct strikes; new/retuned mobs keep xpReward/maxHp in [1.8, 6]
  (xpEconomy contract); loot flood-law forbids player-state drop dials.
- **`scaleNpcDef` never touches ability fields** — a level-68 reissue of a
  caster def casts the same kit, harder, purely through the `level` param on
  the NPC power curve. Dungeon garrisons and POI champions inherit kits with
  zero extra plumbing.

## Part 2 — The laws

### LAW 1 — ONE INTERPRETER, TWO MOUTHS
Enemy casting grows INSIDE the existing machine. Every enemy ability executes
through `castAbility` with `fromNpc: true`; every telegraph speaks the shipped
telegraph fx; every status flows through `applyStatusToPlayer`; every point of
damage walks THE THREAT LAW pipeline (`npcMaxHit` die, whiff-0 roll,
`mitigate`). No parallel executor, no second damage door, no NPC-only fx
system. The three player-target-only shapes (`melee_arc`, `dash_strike`,
`chain_zap`) gain their missing `fromNpc` branches; `self_buff` gains a
curated NPC subset (heal, speedMult); `summon` gains an NPC lane that raises
real bestiary bodies. `blastPlayers` learns `sourceEid` so AoE deaths and
retaliation attribute correctly.

### LAW 2 — THE KIT (content schema)
`NpcDef.special` is RETIRED and replaced by `kit?: NpcKitEntry[]` (the five
shipped specials migrate in the same commit; the validator refuses `special`).

```ts
interface NpcKitEntry {
  ability: string        // AbilityDef id, npc-safe shape (validator whitelist)
  cooldownTicks: number  // pacing lives HERE, never on the ability (standing law)
  windupTicks?: number   // the drawn breath, 0 = instant (old special behavior)
  minRange?: number      // eligibility band vs current target distance
  maxRange?: number      //   (absent = any)
  hpBelow?: number       // 0..1 fraction gates (enrages, desperation casts)
  hpAbove?: number
  weight?: number        // selection weight among eligible entries (default 1)
  initialCooldownTicks?: number // seed at spawn; default = min(cooldownTicks, 60)
                                // ("never open with the special" generalized)
  aim?: 'target' | 'self' | 'lead'  // default 'target'; 'lead' projects the
                                    // quarry's alertVel stride ~0.8s (the
                                    // anti-orbit answer, capped 3 tiles,
                                    // walkability-checked)
  minLevel?: number      // entry wakes only at def level >= this — a scaled
                         // reissue LEARNS new voices at depth
  rally?: boolean        // bonus bounded rallyPack on fire (old special behavior,
                         // now authored instead of implied by pack)
}
```

- `NpcComp` grows `kitCds: number[]` (parallel to the kit) and one casting
  record (LAW 3). Cooldowns tick down exactly like `specialCooldown` did.
- The validator enforces: ability exists; shape ∈ NPC_SAFE_SHAPES; damage-
  carrying entries author `cooldownTicks >= 50`; any entry whose ability
  out-hits the def's basic (`ab.damage > def.damage`) must author
  `windupTicks >= 10` OR ride a shape with `fuseTicks >= 18` — **every
  above-basic hit is telegraphed, structurally**; ground shapes keep
  `fuseTicks >= 15` (the reaction window is honest at every band).
- `NpcActorCombatStats` still cannot override `kit` (identity stays identity);
  actors inherit their base def's kit, as they inherited `special`.

### LAW 3 — THE FOE'S BREATH (the NPC cast engine)
A kit entry with `windupTicks > 0` casts the way players cast, with the roles
mirrored:

- **State**: `npc.casting?: { idx, ticksLeft, total, pt?: {x,y}, aim }` —
  set in the chase branch when an entry is picked. While casting the body is
  **planted** (speed 0 — the rooted caster is the counterplay window),
  faces the quarry (live re-face each tick, like the standoff stare), holds
  `PoseState.Cast`, and never basic-attacks.
- **Aim resolves at FIRE, not at press.** Direct shapes (projectile, beam,
  nova...) fire along the caster's live facing; ground shapes stake the
  target's position at fire ('target') or the stride-projected point ('lead'),
  then the shape's own `fuseTicks` telegraph gives the dodge window. Windup =
  interrupt-or-reposition window; fuse = dodge window. Two honest clocks, in
  series, both visible.
- **Interrupts**: shock cancels (extends the existing `windupTicks = 0`
  stagger — arc-line players become the interrupt school); death, leash
  break, and target-vanished (stealth, teleport, logoff) cancel. Ordinary
  damage does NOT interrupt (mirror of the player v1 law; a champion whose
  every cast is stopped by chip damage never casts). A cancelled cast
  refunds the windup but sets that entry's cd to `NPC_CAST_RETRY_TICKS 50`
  (punished, not disabled); a fired cast pays the full `cooldownTicks`.
- **Fire re-verifies** the target is still a legal quarry (alive, in leash
  world); staked ground casts fire regardless — the ground burns whether or
  not you stayed on it.
- `windupTicks: 0` entries keep the old instant-special behavior (pose pop +
  shape fuse only) — correct for howls and self-buffs, whose payload is mild.

### LAW 4 — THE VISIBLE WORKING (presentation)
Every enemy cast must be readable at a glance, in the shipped grammar:

- **New fx kind `conjure`**, broadcast at cast start: `{eid, ticks: windup,
  id, color, x, y}`. `S2CFx` gains the additive optional `eid` — the first
  fx that FOLLOWS a body. Client renders, for the windup duration, anchored
  to the interpolated entity: converging charge-up motes in the ability color
  (FX v5 inward deployment — the matter gathers), a ground glow swelling
  under the caster, and an **overhead cast pip-bar** above the nameplate
  (thin, ability-tinted, filling left to right — the universal "act now"
  read). Interrupted casts gutter: the bar snaps dark, motes scatter
  (`conjure` fx re-broadcast with `ticks: 0` = the fizzle signal, mirroring
  the broken-breath mark-gutter law).
- Fire lands the ability's own voice through the untouched id-keyed pipeline:
  authored `FX_STYLES` palette + a bespoke `SIGNATURES` entry for every hero
  ability in the wave (LAW 6). No enemy ability ships on fallback grammar
  alone — the fallback is a safety net, not a costume.
- `PoseState.Cast` rides the existing pose byte — zero snapshot changes, no
  protocol bump (additive JSON fields on S2CFx only).

### LAW 5 — THE PRICED THREAT (balance)
- Damage die = `ab.damage` through `npcMaxHit(die, level)` — enemy abilities
  climb the same steep level curve as their basics; content authors the die
  once and every tier reissue prices itself.
- **THE TELEGRAPH PREMIUM** (the THREAT LAW's payoff bracket, mirrored):
  an ability die may exceed the def's basic die only as far as its warning —
  up to 2.5× behind a total warning (windup + fuse) >= 24 ticks (1.2s, the
  shipped ground_slam reaction window), up to 1.5× behind >= 12 ticks, never
  above 1× with less. Enforced by a content contract test, not convention.
- The TTK brackets in damage.test.ts stay green untouched: kits add SPIKE
  texture on a telegraph, they do not raise sustained pressure — basics and
  their cadence are unchanged on every retuned def.
- Whiff-0 stays sacred on every direct strike; ground shapes' counterplay is
  positional (step out) and their roll stays `[0, maxHit]` as shipped.
- Casters get no resource bar (none exists); their price is the same as the
  player's: commitment time, visible, interruptible.

### LAW 6 — THE CURATED VOICES (content doctrine)
No procedural sprinkling. Every kit is authored, per creature, to say who the
creature IS — and density climbs the level bands so the read is learned before
it is tested:

- **L1–10, the lesson**: one or two sprinkles near the roads. The goblin
  firecaller's fireball is the first wound-up projectile a new player sees;
  the adder already teaches venom on the basic. Sprinkles, not walls.
- **L10–25, the language**: camp casters appear (poison rings, web snares,
  bone volleys); packs gain one voice each; kiting a camp now means eating a
  staked cast on the run.
- **L25+, the argument**: champions and elites carry 2–3 entry kits with hp
  gates and lead-aimed area denial; soloing them is a dance, not a jog.
- **Bosses and the deep**: full kits (3–4 entries), `minLevel`-gated voices
  on scaled reissues, summon lanes for the dead, enrages below the half.
- Creature logic is law: beasts get bodily voices (leaps, howls, venom
  sprays), the dead get cold and bone, goblinkind gets fire and cunning,
  trolls get stone and appetite. No creature casts what its body could not
  speak. Content-boundary rule holds (no occult vocabulary anywhere).

### LAW 7 — THE STANDOFF CASTER (AI doctrine)
A caster archetype fights at range by preference: new `NpcDef.standoff?:
number` — in chase, outside a cast, the body steers to hold that distance
(backpedal inside it, approach outside max kit range), reusing the thrower
kiting mechanics. Casters always carry either a ranged basic or a short-cd
kit entry so cooldown gaps never leave an inert body. Melee-caster hybrids
(champions) simply omit `standoff`. Kit selection runs at the attack decision
point: eligible entries (cd 0, range band, hp gates, target seen this
perception period) → weighted pick → cast; otherwise the basic rail runs
untouched. One brain, one new limb.

## Part 3 — The content wave (curated roster, v1)

New abilities (all `cooldownTicks: 0` on the def per the standing law; dies
shown at base level — the level curve does the tier work). Names follow
VOICE.md; no dashes.

**New archetypes** (xpReward/maxHp held in [1.8, 6]):
- `goblin_firecaller` (L7, camps beside goblins): staff-bearing goblin.
  Basic = ember spit (weak ranged). Kit: `goblin_firebolt` (projectile,
  burn, windup 14, cd 110) + `cinder_ring` (staked ground_aoe burn, windup
  12, fuse 20, cd 200, aim 'lead') — the first true caster players meet.
- `goblin_gloomcaller` (L14, warcamps): venom twin. Kit: `gloom_spittle`
  (projectile_fan 3, venom) + `miasma_ring` (ground_field venom pool, the
  user's poison ring, windup 16, fuse 18, cd 260).
- `bone_chanter` (L22, crypts/barrows): robed skeleton. Kit: `bone_volley`
  (projectile_fan), `grave_mist` (ground_field chill), `raise_the_fallen`
  (summon: 2 skeletons, capAlive 2, minLevel 30, cd 400).

**Kits onto standing defs** (basics untouched everywhere):
- `cave_bat`: attackStatus bleed p1/60t (the bite that bleeds — the basic IS
  the ability at this band) + `shrilling_dart` swoop (dash_strike, windup 8,
  cd 180).
- `giant_spider`: `web_snare` (staked ground_field, chill p2 = the slow,
  windup 10, fuse 15, cd 240, aim 'lead') — the classic orbit-breaker.
- `kobold_digmaster`: `cave_in` (staked ground_aoe, windup 16, fuse 22,
  cd 220, rubble knockback).
- `brigand_reaver`: `reaping_sweep` (melee_arc, windup 12, cd 160) — the
  first player-shape branch customer.
- `skeleton_archer`: `rattling_volley` (projectile_fan 5, windup 14, cd 200).
- `troll`: keeps ground_slam (windup 10 now in front of its fuse 24) +
  `gnawed_mending` (self_buff heal 25% hpBelow 0.4, windup 20, cd 600 —
  interrupt it or fight it twice).
- `skeleton_champion`: ground_slam + `marrow_chill` (nova, chill) +
  `bone_volley` (minRange 2.5) — the first true multi-voice champion.
- `gnoll_champion`: ravening_cackle (rally: true) + `rending_lunge`
  (dash_strike, bleed, windup 10, cd 180).
- `dire_wolf` / `elder_great_owl`: existing howls migrate as windup-0 entries
  (rally: true), unchanged in feel.
- Dungeon theme bosses inherit champion kits at +5 power automatically; the
  crypt boss additionally wakes `raise_the_fallen` via minLevel.

Every ability above ships with an authored `FX_STYLES` palette AND a bespoke
signature (fire gobbets on the firebolt, silk sheen + radial strands on the
web, marrow dust on the volley, rising loam on the cave-in) speaking the FX v5
matter library per ONE-VOICE; grammar-refusal cases documented per DOC-PROMISE.

## Part 4 — Phases

1. **THE KIT** (server + content schema): NpcKitEntry + validator + migration
   of the five specials; NpcComp kit state; the cast engine (LAW 3) in
   tickNpcs; fromNpc branches for melee_arc/dash_strike/chain_zap; NPC
   self_buff subset; summonNpc lane; blastPlayers sourceEid; engine unit
   tests + validator tests. The game plays identically after this phase
   (migrated specials keep windup 0).
2. **THE VISIBLE WORKING**: conjure fx + S2CFx.eid; client charge-up render +
   overhead cast pip; fizzle read; Cast pose on the NPC rig; standoff
   steering. Verified live on a staged firecaller.
3. **THE VOICES**: the full content wave — abilities, archetypes, kits, art,
   FX signatures, spawn placement in zones/camps; CMS bestiary kit chips.
4. **THE PROVING**: telegraph-premium + kit contract tests green beside the
   untouched TTK brackets; xpEconomy band checks on new defs; live Playwright
   receipts (windup read, interrupt by shock, dodge-the-ring, lead-aim
   punishing a straight runner, champion multi-voice fight, boss inherit);
   balance retunes from the receipts.

## Open questions (recommendation first, proceeding on recommendations)

- **Should ordinary damage push back NPC casts?** No at v1 (mirror of the
  player law). Shock is the interrupt school; revisit with live data.
- **Channel shapes for NPCs?** Deferred. The windup + fuse grammar covers the
  wave; NPC channels (a sustained beam that tracks) are a sequel voice that
  should wait for the charge-up FX dialect from the FX v5 follow-up.
- **Player-visible enemy cooldowns?** No. The read is the conjure, not a UI.

## As built (2026-08-11, same session — the canonical record)

Shipped in three commits + this closing one: **THE KIT** (2690dd2),
**THE VISIBLE WORKING** (e470198), **THE VOICES** (a2e3cc2).

What stands, exactly as the laws above describe unless noted:

- `NpcDef.kit: NpcKitEntry[]` replaced `special` (validator refuses the
  old field; six shipped specials migrated at `maxRange: 4.5`, windup 0,
  behavior identical — the digmaster additionally gained `windupTicks: 8`).
- The engine: `pickKitEntry` / `beginNpcCast` / `fireNpcCast` /
  `cancelNpcCast` on GameServer, kit cooldowns lazily seeded at the tick
  top (CMS-swap safe), the casting record on NpcComp via the
  optional-bank idiom. Cancels wired at shock, leash break, target
  vanish (`npcStartSearch`), the craven run (`npcSeekHelp`), and
  retarget (`npcAggro`). `NPC_CAST_RETRY_TICKS 50`, `NPC_LEAD_TICKS 16`,
  `NPC_LEAD_CAP 3`.
- ONE VOICE holds: NPC wind-ups speak the player engine's own `charge`
  fx (contracting reach, 10-tick re-emit). `S2CFx` gained additive
  `eid` — a charge carrying it feeds `game.npcCasts`, the renderer's
  overhead cast pip (`castPipItem`, drawn beside the alert glyph;
  `ticks: 0` = the fizzle, the pip gutters). A re-emit refreshes only a
  matching `id`; a different voice opens a fresh read.
- Shape coverage: `melee_arc`/`dash_strike`/`chain_zap` gained their
  fromNpc branches; `applySelf` gained the NPC mend lane (new
  `AbilitySelf.healFrac` — fraction of maxHp, honest at every tier);
  `summon` gained `npcSummonAdds` via new `AbilityDef.summonNpc`
  (ephemeral adds, capped alive, slime-split recipe, recursion banned by
  contract test); `blastPlayers` learned `sourceEid` + arc crescents
  (the NPC-flurry full-circle debt is paid). `NPC_SAFE_SHAPES` lives in
  shared/sim/abilities.ts.
- THE TELEGRAPH PREMIUM shipped at **24t/2.5x, 12t/1.5x** (not the
  plan's first 30/15 draft — 24 is the shipped ground_slam reaction
  window and the content proves under it), enforced in content.test.ts
  beside the cooldown floor (50), ground fuse floor (15), and
  pacing-on-the-def pin.
- THE VOICES content: 14 abilities (goblin_firebolt, cinder_ring,
  gloom_spittle, miasma_ring, bone_volley, grave_mist, raise_the_fallen,
  web_snare, reaping_sweep, rattling_volley, gnawed_mending,
  marrow_chill, rending_lunge, shrilling_dart), each with an authored
  FX_STYLES face AND a bespoke spell-plate (both contract-tested).
  Three caster archetypes: goblin_firecaller L7, goblin_gloomcaller
  L14, and **skeleton_chanter** L22 (renamed from the plan's
  bone_chanter — the skeleton painter family dispatches on the
  `skeleton` prefix; authored violet-washed look + stature 1.08).
  Kits on cave_bat (+bleed bite), giant_spider (lead-aimed web),
  brigand_reaver, skeleton_archer, troll (+mend below 0.4),
  skeleton_champion (3 voices, weighted), gnoll_champion (+lunge).
  Placement: goblin_warcamp (minTier 2) / warhold / fell_barrow
  (minTier 5) garrisons + mine/stronghold/crypt dungeon rosters —
  scaled reissues carry kits for free, and the chanter's raising wakes
  only at minLevel 30 (dungeon depth).
- CMS bestiary editor: kit chips + per-voice sub-forms (ability,
  cooldown, windup, max range, add/remove).
- Tests: kitEngine.test.ts (8 pins: gates, hp fractions, minLevel,
  pay-at-fire, plant+charge, aim laws incl. capped lead, authored
  rally, retry-only cancel) + validator pins in npcs.test.ts + the
  content contracts. Suites at close: shared 192 / content 410 /
  server 382 / client 383, all green. TTK brackets untouched.

**Live receipts** (isolated rig lane #3, 8795/5178, DB arx_rig3, fresh
account; screenshots enemy-arts-*.png untracked at repo root +
.playwright-mcp/): the firecaller held standoff range with the engaged
glyph and killed a fresh L1 before the first screenshot landed; a WILD
giant_spider cast web_snare organically (charge → field in the fx
stream); the cinder ring staked, telegraphed (dashed rim), detonated on
the player for a floaty **3** (die 4 → maxHit 7 → THREAT LAW mitigation
at def 55 — the math on screen); the tester went down five times.
Combat is no longer outrunnable by orbiting.

**Open follow-ups** (small, honest): the overhead pip's pixel frame was
never eyeballed — the sub-second windups (12-14t) outran the screenshot
round trip; the ledger datapath is fully verified live and the draw
code is plain label-pass canvas, but the next session in the world
should glance at a champion wind (marrow_chill, 10t) or bump a staging
windup to confirm the pixels. The wild sizing-up floor means low-band
casters rarely engage leveled players (pre-existing law, correct).
Deferred by design: NPC channels, damage pushback, player-visible
enemy cooldowns.

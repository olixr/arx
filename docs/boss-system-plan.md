# The Dread Crown — the world learns to crown its foes

> STATUS: GREEN-LIT 2026-08-14 (user mandate). Phases ship in order; each phase
> records an As-built section at the end of this document as it lands.

## Part 0 — The brief (user mandate, 2026-08-14)

The game has enemies and champions but no bosses. Dungeons and strongholds hold
seats with nothing worthy sitting on them. The mandate:

- Bosses are **stronger, smarter, and strategic** — phases, attack patterns,
  unlockable late-phase voices, summoned adds to fight off.
- **Every strong hit is telecommunicated** — ground indicators, charged
  wind-ups, readable animations. Players learn patterns and strategize.
- Bosses have **strengths and weaknesses** — some shrug off crowd control and
  knockback, others are susceptible. Melee chargers and caster summoners fight
  differently.
- **Dialogue at phases** — the boss speaks; the fight is immersive.
- **Foundational, composable architecture** — a state machine of simple
  mechanisms whose combination is emergent (the boids principle), so the
  content team composes new bosses from data without touching code, and no
  fight feels stuck on repeat.
- **Navigation that cannot strand the boss** — works in procedural arenas,
  survives player knockback tricks.
- **Rewarding** — bespoke loot, a fight worth looking forward to.

## Part 1 — Audit: what exists (verified in code, 2026-08-14)

The substrate is nearly complete; what is missing is the crown, not the body.

- **THE KIT** (`content/src/npcs.ts:15`, `NpcKitEntry`) already carries
  windups, range bands, **`hpBelow`/`hpAbove` HP-fraction gates** (the phase
  primitive in embryo), weights, `minLevel`, `aim: 'lead'`, `rally`. Validator
  at `npcs.ts:1460`; 1..6 entries, cd floor 50, windup cap 100.
- **THE FOE'S BREATH** cast engine (`gameServer.ts:22370-22577`):
  `pickKitEntry` → `beginNpcCast` (charge fx, pip) → `fireNpcCast` (pay at
  fire, aim law) → `cancelNpcCast` (shock/leash/vanish, retry 50). Everything
  fires through the ONE `castAbility` door with `fromNpc` (LAW: ONE
  INTERPRETER, TWO MOUTHS — enemy-arts-plan).
- **Adds** already work end to end: `npcSummonAdds` (`gameServer.ts:22492`) —
  `capAlive`, `levelDelta`, ephemeral `spawnIndex -1`, auto-aggro, and the
  contract test bans recursive summons.
- **Telegraphs**: `fuseTicks` ground grammar + `charge` fx + overhead cast pip;
  telegraph fx are PURE INSTRUMENT (renderer `fxPureInstrument:35411`) — the
  uniform countdown ring IS the read. THE TELEGRAPH PREMIUM is contract-tested
  (`content.test.ts:141-152`): above-basic dice buy warning (≥24t → 2.5×,
  ≥12t → 1.5×).
- **The seats exist, empty of majesty**: dungeon deepest anchor = `boss`
  (`server/src/dungeon/generate.ts:167,530`, roster `boss: {npc, name}` at
  lvl(5) with honor guard); stronghold boss ward + name pool + boss chest
  (`world/strongholds.ts:397-486`); POI `levelOffset` + `names` crowning.
  **`spawn.name !== undefined` is the de-facto boss predicate today**
  (full loot purse `gameServer.ts:19984`, `riftwalker_step` deed `:20049`).
- **Champions are not bosses**: structurally identical to trash — bigger
  numbers, richer kit, a name. The only champion-keyed code is the
  `_champion` suffix deed grant (`gameServer.ts:20063`).
- **No knockback immunity exists** (`damageNpc:19755` pushes every body);
  shock is the one hard stagger (`tickNpcs:22623` cancels casts). A boss can
  currently be stun-chained and shoved like a goblin.
- **Nothing exists**: no phase state, no encounter controller, no pattern
  memory, no boss health banner, no arena binding, no per-boss CC profile,
  no phase barks.

## Part 2 — The laws

### LAW 1 — THE CROWN RIDES THE KIT (no second brain)
The boss system is a LAYER on `NpcDef` + the kit engine, never a parallel
executor. A boss is an NpcDef with a `boss` block. Every boss ability is a
kit entry; every cast walks THE FOE'S BREATH; every telegraph speaks the
shipped grammar; every death walks `killNpc`. The dumbest possible reading
holds: remove the `boss` block and the def degrades to a lawful champion.

### LAW 2 — THE CROWN (content schema)

```ts
interface NpcBossDef {
  title?: string              // "Warden of the Sunken Court" — nameplate line
  phases: BossPhaseDef[]      // 1..4, hpBelow strictly DESCENDING, one-way ladder
  knockbackMult?: number      // 0 = immovable, 1 = ordinary flesh (default 0.25)
  stunMult?: number           // scales shock stunLeft: 0 immune, 1 ordinary
                              //   (default 0.5); >1 = an authored WEAKNESS
  arenaR?: number             // leash override; break = walk home + full heal
                              //   + crown reset (the honest wipe)
  engageBark?: string         // spoken aloud when the fight truly starts
  defeatBark?: string         // last words at the kill
}

interface BossPhaseDef {
  hpBelow?: number            // (0,1); absent only on phase 0 (the opening stance)
  name?: string               // "The Breaking" — client phase reveal
  bark?: string               // sayAloud on entry — the public voice
  entry?: string              // ability id cast FREE on phase entry (own windup
                              //   still telegraphs it; the phase turn is loud)
  cdMult?: number             // kit cooldown scale this phase (tempo rises,
                              //   floor 0.5) — the fight accelerates honestly
  speedMult?: number          // 0.75..1.5 movement dial per phase
}
```

Kit entries grow two optional gates (validator + KIT contract extended):

```ts
  phase?: number              // wakes at this phase and after (0-based)
  phaseMax?: number           // sleeps after this phase (an early voice retired)
  then?: string               // THE CHAIN: after this fires, the named entry is
                              //   queued next (cooldown waived, its OWN windup
                              //   still telegraphs). Chains cap at 3 links,
                              //   acyclic, validator-enforced.
```

### LAW 3 — THE TURNING (phase state machine)
- `NpcComp` grows an optional bank (`bossPhase?`, `bossChain?`, `bossLastIdx?`)
  — the spawn literal is untouched (the sanctioned idiom).
- Phase = highest ladder rung whose `hpBelow` the live HP fraction has crossed;
  evaluated at the top of the chase branch, before the kit pick. **One-way**:
  healing never demotes (a mended boss keeps its fury).
- On entry: bark (`sayAloud` — bubbles + log, the boss taunt the speech-bubble
  header always anticipated), free `entry` cast through `beginNpcCast`
  (cooldown waived, windup honest), phase fx moment, meta re-send so the
  banner turns.
- Arena break or full leash reset walks home, heals to full (the shipped
  `return` law), and RESETS the crown: phase 0, chains cleared, cooldowns
  re-seeded. No door-cheesing a half-dead boss.

### LAW 4 — THE UNREPEATED HAND (selection, the boids principle)
No scripts, no rotation tables. Small mechanisms compose:
- **Recency**: the last-fired entry's weight is quartered on the next pick —
  variety is structural, not authored.
- **Chains** (`then`) give authored two-and-three-beat combos; the chain queue
  outranks the weighted pick but each link still telegraphs itself.
- **Gates** (range band, hp band, phase band) shape eligibility per moment.
- Emergence: pressure the boss at range and its close voices sleep; burn it
  to a phase turn mid-chain and the new stance re-deals the hand. Each fight
  orders itself differently because the PLAYER's choices shape eligibility.

### LAW 5 — THE STUBBORN CROWN (CC profile)
- `knockbackMult` folds at the one knockback site in `damageNpc`; `stunMult`
  scales `stunLeft` at `applyStatusToNpc`. Statuses still LAND (burn burns,
  chill chills — resist/weak stays the NpcDef channel); only the HARD control
  is dialed. A boss that cannot be shoved can still be frozen slow.
- Defaults (0.25 / 0.5) keep counterplay real but end stun-lock and
  knockback-juggling; an authored 1.0+ is a designed weakness the content
  team can hang a fight on.
- Casting while phased is still shock-interruptible exactly as far as
  `stunMult` allows — the interrupt school keeps its jab at susceptible
  bosses and learns to respect immune ones.

### LAW 6 — THE PRICED CROWN (balance)
THE TELEGRAPH PREMIUM binds boss entries exactly as it binds trash — the
contract test runs over boss kits unchanged, entry casts included. Boss dice
climb only behind warning. Adds pressure rides the shipped summon caps. No
new damage door, no boss-only multiplier: a boss is priced by its kit, its
hp, and its tempo, all authored, all contract-tested.

### LAW 7 — THE DREAD BANNER (presentation)
- `EntityMeta` gains additive `boss?: { title?, phases, phase }` (re-sent on
  phase turn). The binary snapshot record is NOT widened (v29 lesson); hpPct
  already ships.
- Client: a screen-top boss banner while a boss holds you in its fight —
  name, title, chamfered hp gauge, phase pips that gutter as they pass, phase
  name reveal on the turn. Brutalist grammar, tokens only.
- Barks render free through the shipped speech-bubble lane (`sayAloud`
  already anchors words over heads).
- Phase turns get a moment: existing `howl` fx kind + a beat of gathered
  stillness — no new fx kind unless a bespoke voice earns one.

### LAW 8 — THE COMPOSED COURT (content doctrine)
Bosses are authored, never generated. v1 composes kits from the 27 shipped,
fully-faced NPC voices (every one already carries FX face + spell plate +
breath dialect — the both-ways contract stays green for free). New bespoke
voices join the wave only WITH their full art (face, plate, dialect,
signature) per the enemy-arts law. Creature logic holds: the dead speak cold
and bone, goblinkind fire and cunning. Content-boundary rule holds.

## Part 3 — Phases

1. **THE CROWN AND THE TURNING** — schema + validator + contract tests; the
   phase machine, chains, recency, CC dials, arena reset in the server; pure
   selection logic in its own module (`bossMind.ts`) with thin gameServer
   seams (shared-tree discipline: a peer session is live in gameServer.ts).
2. **THE DREAD BANNER** — EntityMeta additive block, boss bar + phase pips +
   reveal, engage/defeat moments, barks live.
3. **THE FIRST CROWNS** — two bosses on the rail, composed from shipped
   voices: a melee charger (dungeon: The Fallen Champion recrowned) and a
   caster-summoner (stronghold seat); loot honored through existing named-
   spawn purse + boss chests.
4. **THE PROVING** — `bossMind.test.ts` engine pins + KIT contract
   extensions + `prove:boss` live receipts (phase turn, chain, immunity,
   arena reset, bark, banner meta).

## Open questions (recommendation first; proceeding on recommendations)

- **Enrage timers?** REC: no — tempo (`cdMult`) is the honest pressure; a
  hidden clock is the opposite of the telegraph religion. Future door.
- **Boss-only loot channel?** REC: not in v1 — the named-spawn purse +
  boss-chest ladder already pays; a `boss_trophies` table is a content-team
  door once sigil breadth grows.
- **Multiplayer scaling?** REC: out of scope v1 (no group scaling exists
  anywhere); record as a standing door.

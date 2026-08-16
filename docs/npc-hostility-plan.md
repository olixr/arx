# THE WILD TAKES SIDES — NPC-vs-NPC hostility

*Drafted 2026-08-16. The ask: NPCs must be able to fight NPCs — guards help when a
monster is dragged to the gate, predators hunt prey, rival bands can feud — as a CORE
system the content layer configures, never a patch.*

## Ground truth (code-verified 2026-08-16)

Combat today is a strict bipartite graph: players (+pets/summons) on one side,
`NpcComp` bodies on the other. The whole seam list:

- `npcPerception` (gameServer.ts ~24874) iterates `this.players` ONLY.
- `npcAggro` (~24624) is the ONE door into 'chase'; its faction-peace gate is a
  no-op for non-player targets.
- `npcTargetPos` (~25133) whitelists player / decoy / pet — an NPC target breaks
  the chase on the next beat.
- `npcStrike` (~25162) dispatches player → `damagePlayer`, pet → `damagePet`,
  else `damageSummon`. No NPC branch.
- `damageNpc` (~22028) tolerates a non-player attacker mostly gracefully (every
  XP/quest/participation write sits inside `if (attacker)`); retaliation
  (`npcAtPeace` → forced `npcAggro` on the attacker) is attacker-agnostic.
- `killNpc` (~22496) rewards inside `if (killer)`; loot `ownerEid: killerEid`
  is the one raw player assumption.
- NPC-fired projectiles (~21442) hit-test players/decoys/pets only.
- `FACTIONS.oppose` is a player-standing cross-pay matrix — never read by AI.
- Faction identity is derived at CALL TIME (actor slug / bestiary id prefix);
  nothing faction-shaped lives on NpcComp (the dial law).

## The architecture: TRIBE + STANCE

Two content-driven layers, both resolved at call time (Studio edits redraw the
ecosystem on the next scan, the FACTIONS precedent):

### 1. TRIBE — who a body is

`tribeOfBody(eid)` resolution order:

1. **Per-spawn override** — `ZoneSpawn.tribe` / `PoiGarrisonEntry.tribe` rides
   onto `NpcComp.tribe`. Placement data, not doc data, so it may live on the
   comp. THIS is the sub-faction door: two goblin camps become
   `goblin_redfang` and `goblin_mosstooth` by placement alone, and one matrix
   row makes them feud.
2. **Actors**: declared `actors` slug claim → its tribe; else
   `factionOfActor(slug)` → **the faction id IS the tribe** (crown watch =
   tribe `crown`, toll guards = tribe `reavers`); else implicit `folk`.
3. **Bestiary**: declared tribe prefix claim (longest prefix wins) →
   `factionOfNpc(defId)` (brigands = tribe `reavers`) → implicit **`menace`**
   (def.aggroRange > 0) or **`wildfolk`** (passive).

The implicit tribes are the coverage law: every combat body in the game has a
tribe with ZERO enumeration debt — a new mob def is a `menace` the day it
ships, and the watch answers it with no content edit.

### 2. STANCE — how tribe A regards tribe B

One live content doc, kind `stances` (`packages/content/src/stances.ts`,
FRONTIER/FACTIONS pattern: `STANCES` live object, `AUTHORED_STANCES` shipped
seed, `validateStances` with backfill + unknown-key refusal, `replaceStances`,
boot seed in index.ts, GET/PUT/DELETE at `/dev/content/stances`).

`stanceBetween(a, b)` → `{ stance: 'ally'|'neutral'|'hostile', range, initiates }`:

1. `a === b` → **ally** (kin peace; also refused unforced at the aggro door).
2. Explicit `matrix['a|b']` (sorted pair key) → its entry, symmetric.
3. Both faction tribes and `FACTIONS.oppose` holds the pair (`opposeHostile`
   dial) → hostile at `defaultRange`. THE POLITICAL MAP FINALLY MARCHES: the
   opposition matrix the reputation epic authored now moves bodies — crown
   watch cuts down brigands because crown|reavers was ALREADY law.
4. One side a faction tribe, other side menace (`tribe === 'menace'` or a
   declared tribe with `menace: true`) and `watchVsMenace` dial → hostile at
   `watchRange`, **initiates only for the faction side** (one-way: the watch
   charges the worg; the worg does not besiege the gate — but a blow always
   answers back through forced retaliation).
5. Else neutral. `folk` and `wildfolk` fall through to neutral everywhere.

Shipped doc v1:
- tribes: `predators` (wolf/worg/dire_wolf/fey_wolf/lynx/fox/bear prefixes,
  `menace: true`), `grazers` (stag/hind/boar/dire_boar/ram/sheep — deliberately
  `menace: false`, so gate guards do NOT clear the starter boar quests).
- matrix: `grazers|predators: hostile @ 6` — the wolf hunts the WILD sheep;
  the yard sheep is livestock and structurally untouchable (drover's peace
  stands at both doors).
- dials: `watchVsMenace: true`, `watchRange: 9`, `opposeHostile: true`,
  `defaultRange: 8`.
- Goblin/hobgoblin feuds, camp rivalries: NOT shipped hot — the rails exist,
  one Studio matrix row (or one `tribe:` field on a placement) turns them on.

## Server plumbing (the four seams + the door)

- **`npcTargetPos`**: NPC branch after pets — alive (`hp > 0`), on-plane.
- **`npcStrike`**: NPC branch before the summon fallback →
  `damageNpc(targetEid, raw, npcEid, 'onehand'|'archery', { status })`.
- **`npcAggro`**: unforced NPC-target guards — never a pet, never livestock,
  never kin (same tribe). Forced paths (retaliation, rally-of-blows, harry)
  bypass, as ever.
- **`damageNpc`**: already safe (verified: `questWounders`, `creditMark`,
  haste/coat/lifesteal all sit behind `if (attacker)` / `opts.basic`;
  `chargeAssault` self-guards). Retaliation makes every fight mutual for free.
- **`killNpc`**: loot only if a PLAYER touched the body — killer, else the
  first player wounder owns the drops; a pure ecosystem kill drops NOTHING
  (the wolf eats what it kills — and AFK loot farming of staged fights is dead
  on arrival). Quest credit already flows to wounders: dragging a quest target
  to the watch and letting them finish it PAYS. Split children inherit aggro
  onto NPC killers too. No XP to anyone (all shipped guards hold).
- **Projectiles**: NPC shafts carry `npcTargetEid` when loosed at an NPC and
  hit-test that one body (banded, radius-padded) — no O(world) sweep, no
  friendly fire. NPC ability blasts/splash stay player-only in v1 (debt).
- **Perception**: `npcPerception` splits into the player sweep (unchanged,
  returns whether a fight opened) + `npcPerceiveNpcs`: only when the player
  sweep found nothing, only for bodies whose tribe can initiate on something
  (`stanceScanRange > 0`), `forEachNpcNear` at that range, cheap gates
  (self/pet/livestock/dead/kin/stance/range) then ONE sight ray, nearest
  hostile wins, straight through the one door. No alert meter for NPC
  targets — the meter and the whole stealth surface stay a PLAYER
  instrument; bodies don't sneak up on bodies, the old circle law is honest
  here and cheap.
- **Dispatch gate** (~25698) widens: `aggroRange > 0 || enforcer ||`
  stance-scanning tribe; the stagger check moves FIRST so the new resolution
  costs nothing 4 ticks out of 5.
- **Chase retention** (~25728): an NPC-target chase keeps the stance range in
  its lose-range the same way the enforcer circle rides watchBase.
- **Doze law**: unwatched chunks never perceive — the ecosystem lives where
  players are, by construction. No hidden world-sim cost.

## What does NOT change

Livestock (drover's peace, both doors) · pets as unforced targets (QUIET
SHADOW) · friendly actors (no NpcComp — a wolf cannot eat the grocer, no
civilian murder by construction) · the player-facing enforcer/peace-band scan ·
the stealth meter · shared EntityMeta (no wire change at all) · XP economy
(NPC blows train nobody) · loot flood law.

## Debts (deliberate)

- NPC ability casts (kit blasts, splash) wound players only — a guard fighting
  a firecaller eats no fireball. The basic-attack war is honest v1.
- No CMS bench for the stances doc yet (dev endpoints + validator ship now;
  the bench is a Studio session).
- No flee-for-prey: a hunted grazer fights back (boars honestly do); a true
  panic-flight verb for hind/stag is a motion-doctrine session.
- Wild-entry tribe overrides (per-knot sub-banding) — placement door ships for
  zones/garrisons only.

## As-built (2026-08-16)

Shipped exactly as planned above; deltas and law refinements only:

- `packages/content/src/stances.ts` — the whole content half in one module:
  types, `STANCES` live doc + `AUTHORED_STANCES` seed, `replaceStances`
  (deep-copy + claim-index rebuild, longest-prefix-wins sort), `validateStances`
  (reserved/faction-collision refusals, sorted-pair keys, range clamp [1,24],
  unknown-key refusal, BACKFILL LAW), `tribeOfNpcId` / `tribeOfActorId`,
  `stanceBetween`, `stanceScanRange`, `stancePairKey`. 15 tests.
- The NPC engage circle is the STANCE's range alone (`ans.range`) — the posted
  aggroRange neither shrinks nor widens a feud (it is the player circle; the
  sizing-up law rides player level and has no meaning between bodies).
- `npcPerception` is now a dispatcher: `npcPerceivePlayers` (the whole old
  body, returns whether a fight opened) then `npcPerceiveNpcs`. The dispatch
  gate in tickNpcs moved the stagger check BEFORE eligibility so the new
  tribe/stance resolution costs nothing 4 ticks of 5.
- The one aggro door's new unforced guards for NPC-shaped targets: pet,
  livestock, kin (same tribe). Rallies pass (a packmate answering a cry at a
  neutral-stance attacker is the point); enforce.test's slate grew `npcs`.
- killNpc: `lootOwnerEid` = killer if player, else first player wounder, else
  NO loot rolls at all. Split children + kit-raised adds inherit `npc.tribe`
  (the banner survives death) and split children now aggro NPC killers too.
- Projectiles: `ProjectileComp.npcTargetEid` stamped at the ranged windup
  fire; one banded hit-test in the fromNpc branch after the pet sweep.
- Chase retention: `npcStanceRangeVs` joins watchBase beside the enforcer
  circle.
- Per-spawn banner: `ZoneSpawn.tribe` + `PoiGarrisonEntry.tribe` → all eleven
  composePoi emission sites → `SpawnState.tribe` → `spawnNpc(..., tribe)` →
  `NpcComp.tribe` (placement data — the one sanctioned tribe field on a comp).
- Wire: NONE. No protocol change, no client change — hit/death/hp events were
  already entity-keyed.
- Doc plumbing: seed in server index.ts boot, GET/PUT/DELETE at
  `/dev/content/stances` (mapsApi.ts), the factions trio verbatim.

Gates: shared 225 · content 543 (+15 stances) · server 514 (+11 wildSides) ·
client 617 · tsc clean on shared/content/server/tools (client blocked by a
NEIGHBOR stream's in-flight work.ts 'fish' WorkKind — not this change; zero
client files touched).

Debts (beyond the deliberate ones above): a rig-lane LIVE walk — drag a worg
to a gate guard, watch a wolf take a wild sheep, flip a goblin-camp feud in
Studio — has NOT been run; the seams are unit-proven but the emergent picture
ships unseen. First live session should also watch the perf ledger around
large camps (the second eye is stagger+chunk-bounded and doze-gated, but the
proof is a profile, not an argument).

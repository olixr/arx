# Foundations — THE MONOLITHS COME DOWN

*Charter written 2026-09-01, on `epic/foundations` cut from main at 62044c7a. Line anchors
below are as of that commit and will drift as phases land — trust the names, re-grep the lines.*

The render-performance and painted-stage campaigns reworked nearly every part of the
pipeline, and in doing so mapped every seam in the codebase. This epic spends that
knowledge on structure: the monoliths come down into modules that follow the codebase's
own proven patterns, so the next campaign starts from rooms instead of one great hall.

## §1 The audit (five territories, surveyed 2026-09-01)

**The monoliths.** `render/renderer.ts` 70,042 lines (426 methods, ~200 fields — and
`objectItem()` alone is 29,416 lines, a 326-case switch, 42% of the file).
`server/game/gameServer.ts` 34,235 lines (one class, ~603 members — 49.7% of the server).
`render/armor.ts` 28,284 (two painter functions own 18,300 of them: `drawHelmet` 12,020,
`drawTorsoGarment` 6,290). `render/rig.ts` 26,142 (half engine, half a ~25-species painter
catalog; 96 importers). `ui/panels.ts` + `ui/stationPanels.ts` 7,716 lines, two god-classes,
zero tests. `main.ts` 4,492 (75 imports; a 659-line event-callback literal; a 912-line frame fn).
`game/clientGame.ts` 4,125 (72-case message switch + a 41-callback event surface — the same
list twice; 34 importers, zero tests).

**The good bones (found, not hoped for).** No god-globals anywhere — wiring is constructor
injection from `main.ts`. Package layering is strict and clean: `shared ← content ← {server,
client}`, zero deep-path imports, zero package cycles, project references wired, no committed
dist. Server tests (36 files) drive private methods through hand-built state slates — each
slate is a ready-made interface spec for extraction. 2,321 tests green at baseline
(client 788 / server 616 / shared 298 / content 619).

**The debts.** 46 file-level import cycles in two families (`fxSignatures ↔ fxSigs*` ×30,
`rig ↔ armor/species/…` ×11, plus 5 in cms). ~30 modules import 26k-line `rig.ts` only for
`shade()`. Duplicated truths: `QuestWire` family re-declared in `server/game/quests.ts`;
`CHEST_TILES` hand-listed in gameServer; `EQUIP_SLOTS` re-ordered twice in the client;
`powerMult` means two different things in the two package barrels. A recording-canvas test
Proxy re-implemented in 24 test files with no shared helper. Registries of 200–440
hand-written JSON imports (`actors/registry.ts`, `dialogues/registry.ts`). `parseC2S` is a
480-line hand switch whose 69 cases correspond to the 68-member union only by eye. Dead:
`paintPropLive` (orphaned by the count-floor fix), `tools/validate` script pointing at a
directory that doesn't exist, stale "arriving in A5" stage comments.

## §2 The laws of this epic

1. **THE HOUSE PATTERN IS THE PATTERN.** Every split follows a shape the codebase already
   proved: the `Record<string, Painter>` registry (`icons.ts` PAINTERS, `shields.ts`
   SIGNATURES), the per-roster file spread into a hub (`fxSigs*` → `SIGNATURES`), the
   per-species sibling module (`golems.ts`/`ogre.ts`/`skral.ts`/`hobgoblin.ts`), the
   host-callback system object (`SocialSystem`/`PartySystem`), the content directory quintet
   (`types/validate/defs/registry/serialize`), the barrel-over-leaves (`render/matter/`),
   the provider registry (`ui/kit/contextSheet.ts`). No new frameworks are invented here.
2. **A MOVE IS NOT A REWRITE.** Phases are behavior-preserving moves. Refinement of what a
   function *does* is a separate commit from moving it, and rare in this epic. The diff of a
   move should be judgeable as a move.
3. **THE GATE IS THE SAME FOUR EVERY TIME.** `npm run typecheck` green, all package suites
   green, the client production build green, and — for any renderer-touching phase — the
   refactor-parity rig (§7) green across the seven standard scenes.
4. **TESTS MOVE WITH THEIR LAW, DELEGATORS BUY TIME.** When a server method leaves
   `GameServer`, a one-line prototype delegator stays behind so the 36 slate-driven test
   files keep compiling; tests migrate in the same phase where cheap, a follow-up where not.
   Uncovered regions (chat, pets, dialogue, auth, panels, clientGame) get characterization
   tests BEFORE they move, not after.
5. **PUBLIC SURFACES ONLY SHRINK.** Extractions may not widen a module's export list beyond
   what its consumers already used. Where a consumer reached through a field
   (`renderer.camera.worldToScreen` ×5 copy-paste), the extraction adds the one method that
   ends the reaching (`renderer.screenAnchor`).
6. **ONE PHASE, ONE COMMIT** on `epic/foundations`; merge to main `--no-ff` per the shared-tree
   git law when a phase band is proven.

## §3 Phase slate

### F0 — THE SMALL DEBTS PAID (hygiene wave, one commit)
Cheap, high-leverage, unblocks later phases:
- `shade()` (+ nothing else) → new `render/tint.ts`; `rig.ts` re-exports for compat;
  `armor.ts` and the ~30 `fxSigs*`/leaf importers switch to `tint.js`. Kills the
  `rig ↔ armor` cycle and ~30 edges into the 26k-line file.
- `WORD_LIFE_MS` → own tiny module; removes the runtime `render → game/clientGame` edge
  (renderer keeps only the `ClientGame` *type* import).
- `PLAYER_COLORS` → `render/playerColors.ts`; `ui/map/markers.ts` stops importing 70k lines
  for a color table.
- Delete `paintPropLive` + fix the three stale doc comments that describe the removed
  live-paint lane; fix stale "phase A5" comments now that the toggle shipped.
- Cross-package truths: server `quests.ts` imports the `QuestWire` family from `@arx/shared`
  (delete the ~90-line duplicate); gameServer's hand-listed `CHEST_TILES` replaced by the
  shared set; content's `powerMult` renamed (`gearPowerMult`) so the two barrels stop
  exporting different functions under one name; `EQUIP_SLOTS` display orders get their own
  named export/comment trail; drop the dead `tools validate` script + stale index.ts claim.
- `render/testkit.ts`: the shared recording-ctx Proxy (checkNums + shape counting) that 24
  test files each re-implement. New tests use it now; old tests migrate opportunistically.

### F1 — THE PROP HALL (objectItem comes down, ~29.4k lines)
The flagship. `objectItem`'s 326 cases split by their existing family boundaries into
`render/props/` — `warCamp.ts`, `elven.ts`, `dungeon.ts`, `graveyard.ts`, `skral.ts`,
`town.ts`, `street.ts`, `house.ts`, `farm.ts`, `stations.ts` — each exporting painters into
a `Map<Tile, PropPainter>` registry (`render/props/index.ts`), with the family palette
blocks (~215 lines of file-top constants) travelling to their families. `objectItem` becomes
a lookup + the delegating cases (trees/rocks/fences → family painters). The `PropPaint`
context (ctx, camera, p/s/h/t, station-body helper, cast/outline hooks) is defined once in
`props/types.ts`. Renderer drops to ~40k lines in one phase.

### F2 — THE PAINTER WINGS (renderer families, ~10–12k lines)
In seam order (coupling surface verified by audit): `wallHung.ts` (16 painters, cleanest
cut), `barriers.ts` (fence/palisade/iron/hedge — four families, one identical 10-symbol
host), `waterfalls.ts` (owns its four memos as a class), `rockArt.ts`, `chestArt.ts`,
`hudOverlay.ts` (post-world screen pass), `wornLight` subsystem, garrison masonry,
`cliffs.ts` (as a class taking a bake-budget handle). Each hands the renderer a narrow host
interface instead of `this`. Runner-up left for later: unifying the hand-mirrored
`cast*`/`stageCast*` brush twins behind one sink interface.

### F3 — THE WARDROBE AND THE MENAGERIE (armor.ts + rig.ts)
- `armorClocks.ts` — the 20 pure FX-clock helpers (cheapest cut in the file).
- `drawHelmet` → `Record<string, HelmPainter>` registries split at the FORGE LAW line:
  `armorHelmsCloth.ts` (42 kinds) / `armorHelmsMetal.ts` (17 kinds).
- `drawTorsoGarment` → ordered `TorsoLayer[]` (flag + paint) in grouped layer files;
  order-significance is the contract, so the array IS the order.
- `drawPauldron` → `armorPauldron.ts`; styles/rosters/colorways → `armorStyles.ts`.
- `rig.ts` species catalog → per-species files on the `golems.ts` template (`rigCanid`,
  `rigFeline`, `rigFox`, `rigHerd`, `rigMount`, `rigArthropod`, `rigTurtle`, `rigBasilisk`,
  `rigOoze`, `rigOwl`, `rigCritter`, `rigUrsine`, plus skeleton/kobold/gnoll/goblin), each
  with the established 5-name export shape; `drawBeast`'s `paintBody` dispatch becomes the
  registry. The species labs and species tests already anticipate exactly this split.
  rig.ts lands at ~9k lines of genuine engine.

### F4 — THE SERVER QUARTERS (gameServer.ts, audited seam order)
1. `game/commands/` — the 1,979-line `chat` if-chain becomes a verb registry; the ~43
   dev-gated commands go to `devCommands.ts`, the 3 player verbs stay wired. Zero test risk.
2. `game/standing.ts` (lowest-risk sizable seam; three suites already isolate it).
3. `game/statuses.ts` — with the four stacking models extracted first as a pure `stack.ts`.
4. `game/procs.ts` — `ProcEngine.offer(moment, ctx)` → effect list; `procDepth` guard moves.
5. `game/melee.ts` (+ smashable props), on the slate `combatRhythm.test.ts` already proves.
6. `net/interest.ts` + `net/snapshot.ts` — spatial hash + serialization, pure mechanics.
7. `game/keyring.ts` / `game/dungeonRuns.ts` (clean split at the useKey/enterDungeon line).
8. `game/arena.ts` as `ArenaSystem` (host-callback object; characterization tests first).
9. `game/farming.ts` (crops/bins/troughs/livestock ledgers; wild-growth half →
   `world/growth.ts` beside its test).
10. `game/dialogue.ts` (tree walker + voice resolution; `runDialogueHook` stays server-side
    as the effect applier; characterization tests first).
Deferred by design: `tickNpcs`, `castAbility`, `damageNpc`/`damagePlayer` (the hub shrinks
as its callers leave), `enterWorld` (boot path, untested — characterize first), and the tick
ordering contract, which never changes in this epic. `PlayerComp` (104 fields) narrows into
per-domain sub-records only as each domain extraction demands it.

### F5 — THE CLIENT SHELL (main.ts, clientGame.ts, panels)
- `main.ts` sheds: `ui/settings/displaySettings.ts` (+ one `prefs.ts` for the 25 scattered
  localStorage reads), `game/buildMode.ts`, `ui/screenRouter.ts` (the "one screen law"),
  `ui/loginFlow.ts`, the 41-callback literal split into domain adapters, the 30 frame-loop
  module-lets into a `FrameClocks` object, the dock table to `ui/dock.ts`.
- `clientGame.ts`: typed message table collapses the 72-case switch and the 41-callback
  surface into one map; panels take narrow per-panel interfaces (`QuestSource`,…) instead
  of the whole 117-method class. Characterization tests first (it has none).
- `ui/panel.ts` grows the missing `Panel` base (root element, open/close/refresh, dress,
  sheet-provider registration); the Arts/Callings wing (~2,200 lines) and each of the nine
  station screens move to their own files on it.
- `renderer.screenAnchor(x,y)` ends the 5× copy-pasted camera/lift triple.

### F6 — THE CATALOG SHELVES (content + shared)
- `abilities.ts` → `abilities/` directory: per-school def files (the ~40 banner comments are
  the split lines) + `techniques.ts` + registry, mirroring `equipment/`.
- `npcs.ts` → `npcs/` quintet (`types/temperament/defs/validate`).
- `equipment/defs.ts` → material files + `sets/` on the existing early-cloth/leather/plate axis.
- `world/tiles.ts` → `tiles/` (`enum` / `defs` / `packed` / `sets`).
- `protocol`: `parseC2S` becomes a per-message validator registry keyed by an exhaustive
  `Record<C2SMessage['t'], …>` so a new union member fails to compile until parsed;
  repeated field-check idioms become tiny combinators. No wire format change.
- The 200–440-line hand-written JSON import registries get a codegen script (checked-in
  output, verified by a test that the directory and the registry agree).
- Document (and fence with an assertion helper) the `replace*()` boot-time mutation
  contract in `content/src/index.ts` — the package's biggest latent hazard.

### F7 — THE CYCLES CUT (import hygiene endgame)
- `fxSignatures ↔ fxSigs*` ×30: `SigCtx`/`AbilitySig` + shared helpers move to
  `render/fx/sigTypes.ts`; the hub keeps only the spread. Matter-style barrel.
- `rig ↔ {armor,species,…}` ×11: after F0's tint cut and F3's species split, the remaining
  back-edges resolve into `rigTypes.ts`.
- `cms/cms.ts ↔ editors` ×5: same treatment.
- A `scripts/check-cycles.mjs` (madge or hand-rolled DFS) joins the typecheck script so the
  count only goes down.

## §4 What this buys beyond tidiness
- **Build/dev speed:** Vite transform and tsc units shrink; the 70k-line hot file stops
  invalidating on every prop tweak; labs import leaf modules instead of the world.
- **Optimization headroom:** per-family prop modules make per-family bake/skip policies
  (the next weak-GPU rounds) local edits instead of switch surgery; the stage sink's
  brush-twin unification (F2 runner-up) removes a whole class of hand-sync bugs.
- **Testability:** slate-driven server modules become constructor-injected systems; panels
  and clientGame become testable for the first time; the shared testkit ends 24 private
  Proxy forks.
- **Refactor safety forever after:** exhaustive protocol table, cycle gate, codegen'd
  registries — drift that today is caught by eye becomes drift that fails to compile.

## §5 Sequencing and risk
F0 first (everything else gets cheaper). F1 next while the renderer knowledge is freshest —
it is the largest single de-risking of the file every future optimization touches. F2/F3
can proceed in parallel bands after F1. F4 is independent of the client phases and can
interleave. F5 wants F0's testkit; F6/F7 close.

Biggest risks and their answers: **silent paint drift in F1/F2/F3** → the refactor-parity
rig (§7) plus the painter test suites; **server test breakage in F4** → prototype
delegators + slate reuse; **uncovered regions** → characterization tests are part of the
phase, not optional; **long-lived branch drift** → phases merge to main in small bands, no
mega-merge at the end.

## §6 Standard gates (every phase)
1. `npm run typecheck` — green.
2. `npm test` all four suites — green, count never below baseline 2,321.
3. `npm run build` (client production) — green.
4. Renderer-touching phases: refactor-parity rig across the seven standard scenes — PASS.
5. Server-touching phases: the relevant proving script(s) against a live dev server where
   one exists for the moved region.

## §7 The refactor-parity rig
Adapted from stage-parity4: same seven scenes (dawnmead, avenue, graveyard, hoargate,
forest, crown-noon, crown-evening), but instead of toggling the stage it compares BUILDS —
capture cadence-paired frames on the pre-phase commit and the post-phase commit under
identical seed/time/zoom, gate cross-build median diff against same-build animation noise.
A pure move must sit inside the noise band. Script lives in the session scratchpad as
`refactor-parity.mjs`; scenes and login are the standing perf-probe account.

## §8 As-built log

**F0 — THE SMALL DEBTS PAID (2fa2e98f, 2026-09-01).** As chartered, plus a finding: the
server's hand-listed chest set differed from shared's (boss caches missing) — the reveal
working's exclusion is now explicit and derived. `paintVocab.ts` also opened here (the seven
ex-static tables/fns: STRUCT_OUTLINE, STALL_BANNERS, AWNING_CLOTHS, ROCK_TILES, WALL_TILES,
twinkle, treeKey). All gates green.

**F1 — THE PROP HALL (dc405bd4, 2026-09-01).** objectItem 29,416 → ~305 lines;
renderer.ts 70,042 → 40,519. 282 tiles across ten family files in `render/props/`,
generated by a scripted verbatim move (case-group parser tolerant of comment-interleaved
label runs; identifier census drove per-file imports; palettes routed local → family,
cross-family → props/palette.ts, engine-shared → paintVocab.ts). Contracts: `PropHost =
Pick<Renderer, …33 members>` + `PropFrame` (mint-time locals) in props/types.ts; the ctx
law (mint-time capture vs draw-time re-capture) preserved verbatim. The switch keeps 13
wilds/barrier groups (44 labels) whose growth/occlusion machinery stays engine-side.
Registry throws on double booking; registry.test.ts pins size 282 and the engine/hall
boundary. **The refactor-parity rig (§7) ran as designed and PASSED all seven scenes**
(sig inside noise band everywhere; rig at scratchpad/refactor-parity.mjs, baseline
worktree + second vite on :5232). Full gates green; band F0+F1 merged to main
(b59020f0) and verified live on arx.gg (release 76690279).

**F2 wave A — THE PAINTER WINGS (4f4e15fd, 2026-09-01).** wallHungArt (16 painters),
barrierArt (fence/palisade/iron/hedge + their inks and *ish predicates), chestArt
(+chestPose), rockArt (+ORE_STYLES/BARREN_*) — 55 methods moved verbatim; ONE shared
`PaintHost = Pick<Renderer, 16 members>` (paintHost.ts) keeps cross-family calls
assignable; engine call sites go module-direct (`this: Renderer` satisfies any Pick);
a nine-door delegator shelf keeps PropHost narrow. `PANEL_DOOR_TILES` (the doorway
painter's own door set) and engine-shared barrier inks join paintVocab. renderer.ts
40,519 → 33,870. Refactor-parity PASS ×7 (baseline advanced to F1). Mover script
generalized at scratchpad/wavea.py; hard-won scanner laws: body brace = LAST 0→1
depth transition; never strip strings when censusing identifiers (template-literal
apostrophes); spread (`...NAME`) needs its own census pattern.

**F4.1 — THE COMMAND LEDGER (96ae50c5, 2026-09-01).** chat's 46-command if-chain →
game/commands/ (playerCommands ×2, devCommands ×44, typed ChatCommand claims/run,
ledger walked in order, first claim wins). All 46 blocks verified terminal before the
move. 138 GameServer members drop `private` (the visibility the 36 slate-driven test
files always treated as real). ledger.test.ts pins shape + claim order (/flagreset
before /flag, /triggers before /trigger). LIVE-PROVEN on a scratch server (fresh
auto-created DB, guest join): /proc, /lock, /tp, plain speech — CHAT LEDGER LIVE
PASS. gameServer.ts 34,235 → 32,258. Band two (waves A + F4.1) merged to main
(bf9d0063) with full gates in the isolated worktree.

**F4.2 — THE STANDING LEDGER (ddb3adb4, 2026-09-01).** creditStanding/creditDeed/runFine/
chargeAssault/theftWitnesses/chargeTheft/pickpocket → game/standing.ts via the
reusable server-mover (scratchpad/server-mover.py): module functions take
`srv: GameServer`, the class keeps one-line delegators so every caller and test
slate reads unchanged. PlayerComp/ActorComp exported as types; class statics reach
the module through a deliberate deferred value-import of the parent class.

**F4.3 statuses (50a0e794 + a98d0a9f) / F4.4 procs (bd21f7c3) / F4.5 melee (fd67c926),
2026-09-01.** game/statuses.ts (lay/apply×2/bits/tick/dot), game/procs.ts (procState,
offerProc, the four moment doors, the guarded runner), game/melee.ts (equippedWeapon
through smashProp, 11 methods) — all by the mover, all behind delegators. THE STUB WINS
THE DOOR: procDoors' ANSWERED ECHO caught the one behavior change a module-direct
intra-family call smuggled in (test slates stub siblings; the stub must win), so
intra-family calls dispatch through `srv.*` — pinned in the mover and noted in each
module head. Mover hardening along the way: body brace = last 0→1 depth transition,
param-list comment stripping, import-alias preservation, parent-type auto-import.
gameServer.ts 32,258 → 30,674. Band three (F4.2–F4.5) merged to main.

**F3 — THE WARDROBE AND THE MENAGERIE (653744d9, fce0a93a, 487a15c4, bee73244,
2026-09-01).** armor.ts 28,284 → 2,758 in three cuts: **F3.1** clocks (20 pure phase
helpers → armorClocks.ts), styles (contracts + rosters + colorways + resolvers →
armorStyles.ts, armor.ts re-exports), drawPauldron whole (+pauldron-only coldLick).
**F3.2** drawHelmet's 59 kinds → CLOTH_HELMS (42, terminal painters — the branch
returns proved every soft crown skips the forge tail) and METAL_HELMS (17 painters /
18 kinds; greathelm+bascinet share an arm) dispatched through a scratch HelmCtx
(WIND_TMP idiom, zero new allocations; the shared closures ride the ctx). **F3.3**
drawTorsoGarment's !hurt region (89 flag blocks + 2 front-plane markers, zero early
returns) → armorTorsoLayers.ts as a 91-entry ordered array — THE ORDER IS THE DRESS
CODE. New proof style: ROLL CALLS — every authored style (386 helm, 73 body) driven
through the registries in multiple poses on the recording ctx, whose finite-geometry
assert catches exactly a lost local (testkit learned gradient stubs). **F3.4** rig.ts
26,142 → 15,774: sixteen species files on the golems.ts template (163 defs bucketed by
name pattern, spans moved whole, cross-bucket imports resolved, shared grammar via the
existing deferred golems-style cycle), rig.ts re-exporting every door — 96 importers,
16 labs, 13 species suites unchanged. Refactor-parity PASS ×7 at every sub-phase
(baseline advanced each time). Band four merged to main.

**F2 wave B — THE PAINTER WINGS CLOSE (2b91cfab, 2026-09-01).** waterfalls (17 methods
— the art merged INTO the pre-existing THE SPILL LAW module after the generator's one
collision was caught and merged, not clobbered), garrisonArt (6), hudOverlay (10),
wornAura (4), cliffArt (9) + 15 family statics routed (13 family-local, GAR_LEAF +
stone01 → vocab). PaintHost grew to carry the bake-budget/stage-sink surfaces the cliff
lane mutates (visSpriteMsLeft, visArrivalCount, cliffMemo/cliffSprites, stage* sinks).
renderer.ts 33,869 → 28,456. Falls coverage verified in-frame before trusting parity
(crown scenes: 1,559 fallMemo entries). Parity PASS ×7; band five merged to main.
F2's runner-up (unifying the cast/stageCast brush twins) remains charted, not done.

**F5.1 — THE SHELL FINDS ITS ROOMS (bcc7d2da) / F5.2 — THE WIRE'S TABLE (570c9861),
2026-09-01.** New proof rigs FIRST: THE SHELL SMOKE (scratchpad/ui-smoke.mjs — all 13
dock screens open/Escape-close, world alive, zero page errors) and THE LOGIN VIEWS probe
(scratchpad/login-views.mjs — signin↔register↔roster/quick, card written and dealt).
F5.1: ui/dock.ts (roster + badges; click wiring now DERIVED from the roster),
ui/displaySettings.ts (returns the walk-over box; game reached via a deferred callback —
TDZ law: shell singletons construct in script order, so extracted init calls either stay
put with lazy closures or move below their deps), ui/screenRouter.ts (THE ONE SCREEN LAW
whole, benchReturn behind accessors, router constructed AFTER all panels stand),
ui/loginFlow.ts (owns view/roster/chosen; shell keeps tokens + in-flight attempt).
main.ts 4,492 → 4,072. F5.2: handleMessage's 72 arms → `S2C_HANDLERS`, a static table
TOTAL over `S2CMessage['t']` — new S2C types fail to compile unhandled (the client half
of F6's protocol goal, landed early). Characterization pins (messageLaws.test.ts, written
against the switch) pass identically against the table; `break` semantics audited
(switch-breaks → returns, loop breaks kept). Band six merged to main.
**F5.3 — THE GREAT ROOMS DIVIDE (c8bc227f, 2026-09-01).** New rig FIRST: THE PANEL WALK
(scratchpad/panel-walk.mjs — clicks every tab-chip/sort-chip + the arts rail inside all
13 screens; 44 clicks, zero errors, baselined before the cut). ui/panelsArts.ts takes
the 47-method arts/callings wing (panels.ts 4,921 → 2,757); ui/stationScreens.ts takes
the nine station render passes + shared ledgerRow/vaultCell (stationPanels.ts 2,802 →
1,092) — panels-mover (scratchpad/panels-mover.py) generalizes the server-mover to UI
classes (host-first functions, publics stay, host-param collision scan is MANDATORY —
a local `const p` bit once; `host` chosen after scanning). Honest residual: station-only
rooms (bank/stable/shop/plant) exercised by tsc+tests, not yet the walk — a
station-visit probe is charted with the Panel base. Band seven merged to main.

REMAINING in F5 (charted): the Panel base convention + per-screen station files +
station-visit probe; GameEvents domain adapters; FrameClocks; renderer.screenAnchor.

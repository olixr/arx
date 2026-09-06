# ARX CORE AUDIT 2026-09-06 — shared brief for every lane

Repo: /Users/aeriek/code/devcraft (npm workspaces: packages/shared, content, server, client, tools). Arx is a live 2D web MMO (arx.gg). Between 2026-09-01 and today the FOUNDATIONS epic ("THE MONOLITHS COME DOWN", docs/foundations-plan.md — READ §2 laws + §8 as-built log FIRST) decomposed the monoliths:
- renderer.ts 70k→31k: objectItem → render/props/registry (10 family files, PropHost Pick), painter wings (wallHungArt, barrierArt, chestArt, rockArt, waterfalls, garrisonArt, hudOverlay, wornAura, cliffArt; PaintHost Pick), rigKit, paintVocab.
- gameServer.ts 34k→28.6k: game/commands ledger, standing, statuses, procs, melee, interest, keyring, dungeonRuns, arena, farming, dialogue, formulas, tuning — module functions take `srv: GameServer`, the class keeps one-line delegators; intra-family calls MUST go through `srv.*` (THE STUB WINS THE DOOR).
- armor.ts 28k→2.8k (armorClocks/armorStyles/armorPauldron/armorHelmsCloth/metal, armorTorsoLayers ordered array); rig.ts 26k→15.8k (16 species files + rigKit).
- main.ts split: ui/dock, displaySettings, screenRouter, loginFlow; clientGame S2C_HANDLERS total table; panels → panelsArts, stationPanels → stationScreens, panelFaces.
- shared/protocol parseC2S total validator table; content abilities/ shelves hub, npcs/defs+validate+limits, tiles hub (tilesEnum/tilesDefs); scripts/gen-registries.mjs; scripts/check-cycles.mjs gate (baselines client 3 / server 0 / shared 0 / content 1).
Also today: render wall-lane fixes (see the 4 laws in the memory excerpt below) and many content bands (Contested Lands) merged on top.

## Your job (READ-ONLY — do NOT edit, create, or run anything that writes into the repo; other sessions are editing this tree live)
Audit your territory for: (1) REGRESSIONS or breakage introduced by the splits (dead/diverged delegators, calls that bypass the srv.* door, lost behavior, wrong ordering, TDZ hazards, re-export hubs hiding missing symbols, double-booked registries, handlers missing from total tables); (2) UNFINISHED WIRING (stubs, charted-but-not-done seams, half-migrated twins, features dark because a wire was never connected); (3) BRITTLE/FRAGILE construction that will not hold at scale (unbounded Maps/arrays never pruned, per-frame/per-tick allocations, hand-maintained shadow tables that must agree, magic numbers copied in several places, silent catch/ignore, missing cleanup on disconnect/close/context-loss, string-keyed hot paths); (4) DELEGATION OF RESPONSIBILITY faults (a module reaching into another's internals, god-object residue, layering breaches: client←server, content←client, etc.); (5) TEST COVERAGE gaps in the newly split modules and tests that pin brittle internals.
Read whole files where it matters; don't sample. Prefer `grep -n`, `sed -n`, `wc -l`, node one-liners. Verify each claim against the code (quote the line). Do not report style nits.

## Output — MANDATORY
Write findings INCREMENTALLY (append as you go, so nothing is lost if you are cut off) to the file named in your lane prompt, as a markdown list. Each finding:
`- [P0|P1|P2] <one-line title> — <file>:<line> — what/why (2-4 sentences, quote the evidence) — FIX: <concrete proposal, est. size S/M/L> — TEST: <how to prove>`
P0 = live bug/regression/data-loss/crash risk; P1 = brittle at scale or unfinished wiring that will bite; P2 = debt/improvement worth folding into the big update.
End the file with a `## Summary` (≤12 lines): counts by severity, the top 5 by value, and any territory you could not cover.
Your final reply to the orchestrator: ≤250 words — counts, top 5, and the file path. Nothing else.

## Memory excerpt — the wall-lane laws (render lane especially)
- A painter may be stamped stageSafe ONLY if it is assembly-aware (emits quads / stagePushPaintRaw / sets stageNeedsSplit under stageAssembling). A raw brush marked safe fails SILENTLY.
- The wall lane's keyed scratch is a CACHE that outlives the frame: per-frame alphas, sprite liveness, run extent, run identity must be neutralized inside it or carried in key/rev/warm set.
- Any cache retaining pixels across frames must never capture a per-frame law (mint ramp, step-aside fade, declined-miss skip).

## Scope ruling (owner, 2026-09-06)
packages/client/src/play3d/* is an in-progress 3D prototype — OUT OF SCOPE for this audit and the update. Skip it.

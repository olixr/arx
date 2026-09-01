# THE STANDING PROBES (foundations epic)

Live proof rigs the foundations epic built and every future refactor
should reuse. All target the dev lane: a vite on :5231 (see
packages/client/vite.config.stage.ts — restart it with `--force` after
EVERY edit; its watcher is deliberately blinded) proxying the rig
server on :8814 (`PORT=8814 DB_DATABASE=arx_rig_36 npx tsx
packages/server/src/index.ts`, killed by PID file only — never pkill by
pattern). The playwright import path points at the npx cache; run
`npx playwright install chrome` once if it moves.

- refactor-parity.mjs — BUILD-vs-BUILD frame compare across seven
  scenes (baseline worktree serves :5232). A pure renderer move must
  sit inside the animation-noise band. Gate: sig <= noise2T + 60.
- ui-smoke.mjs — all 13 dock screens open, Escape closes, world alive,
  zero page errors.
- panel-walk.mjs — clicks every tab/sort chip + the arts rail inside
  each screen (44 interactions).
- login-views.mjs — signin <-> register <-> roster/quick views; a
  remembered card dealt as a face on the next visit.
- station-visit.mjs — teleports beside a live station (the Silverfall
  vault) and opens the room with the interact key.
- chat-probe.mjs — guest joins a scratch server and speaks through the
  command ledger (dev + player verbs + plain speech).

scripts/refactor/ holds the reusable movers (server-mover.py moves
GameServer methods behind delegators; panels-mover.py the UI-class
variant). Their hard-won laws live in docs/foundations-plan.md §8 —
read it before reusing them.

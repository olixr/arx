#!/usr/bin/env bash
# THE REEL LANE — a dedicated, disposable stack for capturing reels.
#
#   scripts/reel-lane.sh          (re)start server :8830 + client :5230
#   scripts/reel-lane.sh stop     put it away
#
# Why its own lane at all: a capture must never restart, stage-wipe or
# steal focus from a neighbour session's :5173/:8790 stack, and it needs
# DEV_COMMANDS=1, which nobody wants on a shared dev server.
#
# Why RESTART, every batch, always: shots spawn tanky mobs by the
# dozen. Ephemeral spawns never respawn, but the ones that survive a
# take LINGER — and after a morning of shooting, the meadow holds forty
# ogres, the frame rate halves, and every take comes back TROUBLED for
# reasons that have nothing to do with the shot. A fresh world is part
# of the take, like a swept floor is part of a stage.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${ARX_REEL_PORT:-8830}"
LOGS="${TMPDIR:-/tmp}/arx-reel"
mkdir -p "$LOGS"

stop() {
  lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  pkill -f 'vite.config.cinema' 2>/dev/null || true
  sleep 1
}

stop
[ "${1:-start}" = "stop" ] && { echo "reel lane down"; exit 0; }

PORT="$PORT" DEV_COMMANDS=1 REQUIRE_INVITE=0 npm run start -w @arx/server \
  > "$LOGS/server.log" 2>&1 &
( cd packages/client && npx vite --config vite.config.cinema.ts > "$LOGS/vite.log" 2>&1 & )

for _ in $(seq 1 40); do
  sleep 1
  grep -q 'listening on' "$LOGS/server.log" && break
done
echo "reel lane up — server :$PORT, client :5230 (logs in $LOGS)"
